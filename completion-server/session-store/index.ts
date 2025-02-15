import deepDiff from "deep-diff";
import type { SyncClient, SyncMap } from "twilio-sync";
import { TypedEventEmitter } from "../../lib/events.js";
import type { SessionContext } from "../../shared/session/context.js";
import type { TurnEvents, TurnRecord } from "../../shared/session/turns.js";
import { makeContextMapName, makeTurnMapName } from "../../shared/sync/ids.js";
import { getSyncClient, SyncQueueService } from "./sync.js";
import { TurnStore } from "./turn-store.js";

export type * from "./turn-store.js";

export class SessionStore {
  public context: SessionContext;
  public turns: TurnStore;

  private syncClient: SyncClient;
  private syncQueue: SyncQueueService;

  constructor(public callSid: string) {
    this.context = {};
    this.turns = new TurnStore(callSid);

    this.syncClient = getSyncClient(callSid);
    this.syncQueue = new SyncQueueService(
      callSid,
      this.syncClient,
      () => this.context,
      (turnId: string) => this.turns.get(turnId)
    );

    this.eventEmitter = new TypedEventEmitter<TurnEvents>();
    this.registerEvents();
  }

  registerEvents = () => {
    // bubble up the events from turn store
    this.turns.on("turnAdded", (...args) =>
      this.eventEmitter.emit("turnAdded", ...args)
    );
    this.turns.on("turnDeleted", (...args) =>
      this.eventEmitter.emit("turnDeleted", ...args)
    );
    this.turns.on("turnUpdated", (...args) =>
      this.eventEmitter.emit("turnUpdated", ...args)
    );
  };

  /****************************************************
   Session Context
  ****************************************************/
  setContext = (update: Partial<SessionContext>) => {
    const prev = this.context;
    const _update = Object.fromEntries(
      Object.entries(update).filter(
        ([key, value]) => value !== null && value !== undefined
      )
    );

    const context = { ...this.context, ..._update };

    const diff = deepDiff(prev, context);
    if (!diff) return;

    this.context = context;

    const updates = diff.map(({ path }) => path![0]) as SessionContextKey[];
    this.eventEmitter.emit("contextUpdated", { context, prev, updates });
  };

  /****************************************************
   Event Typing
  ****************************************************/
  private eventEmitter: TypedEventEmitter<TurnEvents & ContextEvents>;
  public on: (typeof this.eventEmitter)["on"] = (...args) =>
    this.eventEmitter.on(...args);
}

type SessionContextKey = keyof SessionContext;

export interface ContextEvents {
  contextUpdated: (payload: {
    context: SessionContext;
    prev: SessionContext;
    updates: SessionContextKey[];
  }) => void;
}
