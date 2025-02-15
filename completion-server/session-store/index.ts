import deepDiff from "deep-diff";
import type { SyncClient } from "twilio-sync";
import { TypedEventEmitter } from "../../lib/events.js";
import log from "../../lib/logger.js";
import type { SessionContext } from "../../shared/session/context.js";
import type { TurnEvents } from "../../shared/session/turns.js";
import {
  MapItemAddedEvent,
  MapItemRemovedEvent,
  MapItemUpdatedEvent,
} from "../../shared/sync/types.js";
import { getSyncClient, SyncQueueService } from "./sync.js";
import { TurnStore } from "./turn-store.js";

export type * from "./turn-store.js";

export class SessionStore {
  public context: SessionContext;
  public turns: TurnStore;

  private syncClient: SyncClient;
  private syncQueue: SyncQueueService;

  constructor(public callSid: string, context?: SessionContext) {
    this.context = context ?? {};
    this.turns = new TurnStore(callSid);

    this.syncClient = getSyncClient(callSid);
    this.syncQueue = new SyncQueueService(
      callSid,
      this.syncClient,
      () => this.context,
      (turnId: string) => this.turns.get(turnId)
    );

    this.eventEmitter = new TypedEventEmitter<TurnEvents>();
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

    // send data to sync when local updates are made
    this.on("turnAdded", this.syncQueue.addTurn);
    this.on("turnDeleted", this.syncQueue.deleteTurn);
    this.on("turnUpdated", this.syncQueue.updateTurn);
    // note: contextUpdates are sent to sync w/in the setContext method

    // send initial context to sync
    for (const key in this.context)
      this.syncQueue.updateContext(key as SessionContextKey);

    this.syncQueue.ctxMapPromise.then((ctxMap) => {
      ctxMap.on("itemAdded", (ev: MapItemAddedEvent) => {
        if (ev.isLocal) return;
        log.info("sync", `context added ${ev.item.key}`);
        this.setContext({ [ev.item.key]: ev.item.data }, false);
      });
      ctxMap.on("itemRemoved", (ev: MapItemRemovedEvent) => {
        if (ev.isLocal) return;
        log.info("sync", `context removed ${ev.key}`);
        this.setContext({ [ev.key]: undefined }, false);
      });
      ctxMap.on("itemUpdated", (ev: MapItemUpdatedEvent) => {
        if (ev.isLocal) return;
        log.info("sync", `context updated ${ev.item.key}`);
        this.setContext({ [ev.item.key]: ev.item.data }, false);
      });
    });
  }

  /****************************************************
   Session Context
  ****************************************************/
  setContext = (update: Partial<SessionContext>, sendToSync = true) => {
    const prev = this.context;

    const context = { ...this.context, ...update };

    const diff = deepDiff(prev, context);
    if (!diff) return;

    this.context = context;

    const keys = diff.map(({ path }) => path![0]) as SessionContextKey[];
    this.eventEmitter.emit("contextUpdated", { context, prev, keys });
    if (sendToSync) keys.forEach(this.syncQueue.updateContext);
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
    keys: SessionContextKey[];
  }) => void;
}
