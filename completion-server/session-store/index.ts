import deepDiff from "deep-diff";
import type { SyncClient } from "twilio-sync";
import { TypedEventEmitter } from "../../lib/events.js";
import { getMakeLogger } from "../../lib/logger.js";
import type { SessionContext } from "../../shared/session/context.js";
import type {
  HumanTextTurn,
  HumanTextTurnParams,
  SystemTurnParams,
  TurnRecord,
} from "../../shared/session/turns.js";
import type {
  MapItemAddedEvent,
  MapItemRemovedEvent,
  MapItemUpdatedEvent,
} from "../../shared/sync/types.js";
import { getSyncClient } from "./sync-client.js";
import { SyncQueueService } from "./sync-queue.js";
import { TurnStore } from "./turn-store.js";

export type * from "./turn-store.js";

/**
 * @class SessionStore
 * @description Manages the state for a voice agent session, including conversation history and
 * context. The SessionStore is the central component for maintaining conversation state and synchronizing
 * with external services via Twilio Sync.
 *
 * The store consists of two main parts:
 * 1. Context - Structured state used to dynamically configure the LLM (system instructions, tools, etc.)
 * 2. Turns - Ordered history of conversation interactions between the bot and human
 *
 * Context is synchronized bidirectionally with Twilio Sync, allowing external processes to affect
 * the conscious LLM by updating the Sync object for the context.
 *
 * Turns are only synchronized unidirectionally, i.e. the external systems can subscribe to the turns
 * but cannot affect them in memory.
 *
 * @note Turn objects are proxied, so modifications to turn properties will automatically emit update events.
 * @note Context objects are NOT proxied. The context must be updated using the setContext method to trigger events.
 *
 */

export class SessionStore {
  private _context: Readonly<Partial<SessionContext>>; // discrete variables used to dynamically configure the LLM
  public get context() {
    return this._context;
  }

  public turns: TurnStore; // conversation history

  private syncClient: SyncClient;
  private syncQueue: SyncQueueService; // publishes updates to context and turns to sync
  private log: ReturnType<typeof getMakeLogger>;

  constructor(public callSid: string, context?: Partial<SessionContext>) {
    this.log = getMakeLogger(callSid);
    this.eventEmitter = new TypedEventEmitter<TurnEvents>();

    this._context = Object.freeze(context ?? {});

    this.turns = new TurnStore(callSid, this.eventEmitter); // turn events are emitted in the turn store

    this.syncClient = getSyncClient(callSid);
    this.syncQueue = new SyncQueueService(
      callSid,
      this.syncClient,
      () => this.context,
      (turnId: string) => this.turns.get(turnId),
    );

    // send data to sync when local updates are made
    this.on("turnAdded", this.syncQueue.addTurn);
    this.on("turnDeleted", this.syncQueue.deleteTurn);
    this.on("turnUpdated", this.syncQueue.updateTurn);
    // note: contextUpdates are sent to sync w/in the setContext method

    // send initial context to sync
    for (const key in this.context)
      this.syncQueue.updateContext(key as keyof SessionContext);

    // subscribe to context changes from sync and update local state accordingly
    // this is how subconscious processes communicate with the application
    // note: turns are not bidirectional. turn data is only sent to sync
    this.syncQueue.ctxMapPromise.then((ctxMap) => {
      ctxMap.on("itemAdded", (ev: MapItemAddedEvent) => {
        if (ev.isLocal) return;
        this.log.info("sync", `context added ${ev.item.key}`);
        this.setContext({ [ev.item.key]: ev.item.data }, false);
      });
      ctxMap.on("itemRemoved", (ev: MapItemRemovedEvent) => {
        if (ev.isLocal) return;
        this.log.info("sync", `context removed ${ev.key}`);
        this.setContext({ [ev.key]: undefined }, false);
      });
      ctxMap.on("itemUpdated", (ev: MapItemUpdatedEvent) => {
        if (ev.isLocal) return;
        this.log.info("sync", `context updated ${ev.item.key}`);
        this.setContext({ [ev.item.key]: ev.item.data }, false);
      });
    });
  }

  // the parkingLot holds turns that will be added before the next completion. this is used for async situations, such as handling a human agent's response
  // the parkingLot is needed because if turns are added to the store while a human is speaking or a bot is in the middle of a completion run, the bot may think that the issue was already addressed. this ensures these async messages are top of mind for the LLM on the next completion
  private parkingLot: Map<string, HumanTextTurnParams | SystemTurnParams> =
    new Map();
  // todo: this is a hacky solution that only supports the demo use-case. need to make it generic
  public addParkingLotItem = (params: {
    human?: HumanTextTurnParams;
    system?: SystemTurnParams;
  }) => {
    if (params.system) this.parkingLot.set("addSystemMessage", params.system); // add system first
    if (params.human) this.parkingLot.set("addHumanMessage", params.human);

    this.eventEmitter.emit("tryCompletion");
  };

  // adds the parking lot messages to turn history, generally before a completion
  public insertParkingLot = () => {
    const systemTurnParams = this.parkingLot.get("addSystemMessage") as
      | SystemTurnParams
      | undefined;
    this.parkingLot.delete("addSystemMessage");
    const humanTurnParams = this.parkingLot.get("addHumanMessage") as
      | HumanTextTurn
      | undefined;
    this.parkingLot.delete("addHumanMessage");

    if (systemTurnParams) this.turns.addSystem(systemTurnParams);
    if (humanTurnParams) this.turns.addHumanText(humanTurnParams);
  };

  /**
   * @method setContext
   * @description Updates the session context with new values and synchronizes to Twilio Sync.
   * Only changed values are emitted as events and synchronized.
   *
   * @important This is the ONLY way to update context values. Direct mutations to the context object
   * will NOT emit events or synchronize changes.
   *
   * @param {Partial<SessionContext>} update - Partial context object with values to update
   * @param {boolean} [sendToSync=true] - Whether to send the updates to Twilio Sync
   * @fires SessionStore#contextUpdated
   *
   * @example
   * // Correct way to update context
   * sessionStore.setContext({ agentName: "SupportBot" });
   *
   * // Incorrect way (won't trigger events or sync)
   * sessionStore.context.agentName = "SupportBot"; // Don't do this!
   */

  setContext = (update: Partial<SessionContext>, sendToSync = true) => {
    const prev = this._context;

    const context = Object.freeze({ ...prev, ...update }); // new context

    const diff = deepDiff(prev, context);
    if (!diff) return;

    this._context = context;

    const keys = diff.map(({ path }) => path![0]) as (keyof SessionContext)[];
    this.eventEmitter.emit("contextUpdated", { context, prev, keys });
    if (sendToSync) keys.forEach(this.syncQueue.updateContext);
  };

  /****************************************************
   Event Typing
  ****************************************************/
  private eventEmitter: StoreEventEmitter;
  public on: (typeof this.eventEmitter)["on"] = (...args) =>
    this.eventEmitter.on(...args);
}

export type StoreEventEmitter = TypedEventEmitter<
  TurnEvents & ContextEvents & HumanInLoop
>;

// todo: make this generic
export interface HumanInLoop {
  // tryCompletion will trigger the consciousLLM to attempt a completion. this is a bit hacky but it is done to avoid mixing the concerns of the LLM service with the store
  tryCompletion: () => void;
}

export interface ContextEvents {
  contextUpdated: (payload: {
    context: Partial<SessionContext>;
    prev: Partial<SessionContext>;
    keys: (keyof SessionContext)[];
  }) => void;
}

export interface TurnEvents {
  turnAdded: (turn: TurnRecord) => void;
  turnDeleted: (turnId: string, turn?: TurnRecord) => void;
  turnUpdated: (turnId: string) => void;
}
