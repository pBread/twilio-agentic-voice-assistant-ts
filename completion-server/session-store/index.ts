import type { SyncClient } from "twilio-sync";
import { TypedEventEmitter } from "../../lib/events.js";
import type { SessionContext } from "../../shared/session/context.js";
import type { TurnEvents } from "../../shared/session/turns.js";
import { getSyncClient } from "./sync.js";
import { TurnStore } from "./turn-store.js";

export type * from "./turn-store.js";

export class SessionStore {
  public context: SessionContext;
  public turns: TurnStore;
  private sync: SyncClient;

  constructor(public callSid: string) {
    this.context = { today: new Date(), version: 0 };
    this.turns = new TurnStore(callSid);

    this.sync = getSyncClient(callSid);

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
    const prevCtx = this.context;
    const nextCtx = { ...this.context, ...update };

    this.context = Object.assign(nextCtx, {
      version: prevCtx.version + 1,
    });

    const updatedKeys = Object.keys(update) as SessionContextKey[]; // assert type
    for (const key of updatedKeys) {
      const prev = prevCtx[key];
      const value = nextCtx[key];

      if (prev === value) continue;

      this.eventEmitter.emit("contextItemUpdated", { key, value, prev });
    }

    this.eventEmitter.emit("contextUpdated", {
      context: nextCtx,
      prev: prevCtx,
    });
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
  }) => void;

  contextItemUpdated: <K extends keyof SessionContext>(payload: {
    key: K;
    value: SessionContext[K];
    prev: SessionContext[K];
  }) => void;
}
