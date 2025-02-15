import type { SyncClient, SyncMap } from "twilio-sync";
import { TypedEventEmitter } from "../../lib/events.js";
import type { SessionContext } from "../../shared/session/context.js";
import type { TurnEvents } from "../../shared/session/turns.js";
import { getSyncClient } from "./sync.js";
import { TurnStore } from "./turn-store.js";
import { makeContextMapName, makeTurnMapName } from "../../shared/sync/ids.js";
import deepDiff from "deep-diff";

export type * from "./turn-store.js";

export class SessionStore {
  public context: SessionContext;
  public turns: TurnStore;
  private sync: SyncClient;

  private ctxMapPromise: Promise<SyncMap>;
  private turnMapPromise: Promise<SyncMap>;

  constructor(public callSid: string) {
    this.context = { today: new Date(), version: 0 };
    this.turns = new TurnStore(callSid);

    this.sync = getSyncClient(callSid);
    this.ctxMapPromise = this.sync.map(makeContextMapName(callSid));
    this.turnMapPromise = this.sync.map(makeTurnMapName(callSid));

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
  }

  /****************************************************
   Session Context
  ****************************************************/
  setContext = (update: Partial<SessionContext>) => {
    const prev = this.context;
    const context = { ...this.context, ...update };

    const diff = deepDiff(prev, context);
    if (!diff) return;

    this.context = Object.assign(context, {
      version: prev.version + 1,
    });

    const updates = diff.map(({ path }) => path![0]) as SessionContextKey[];
    this.eventEmitter.emit("contextUpdated", { context, prev, updates });
  };

  /****************************************************
   Sync
  ****************************************************/
  setSyncContextItem = async <K extends SessionContextKey>(
    key: K,
    value: SessionContext[K]
  ) => {};

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
