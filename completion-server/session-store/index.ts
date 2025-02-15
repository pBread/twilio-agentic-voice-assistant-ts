import { TypedEventEmitter } from "../../lib/events.js";
import log from "../../lib/logger.js";
import type { SessionContext, ContextEvents } from "../../shared/context.js";
import type {
  BotTextTurn,
  TurnEvents,
  TurnRecord,
} from "../../shared/turns.js";
import { TurnStore } from "./turn-store.js";
import { createVersionedObject } from "./versioning.js";
import deepdiff from "deep-diff";

export type * from "./context-store.js";
export type * from "./turn-store.js";

export class SessionStore {
  public context: SessionContext;
  turns: TurnStore;

  constructor(public callSid: string) {
    this.context = { today: new Date(), version: 0 };
    this.turns = new TurnStore(callSid);

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
  setContext = (ctx: Partial<SessionContext>) => {
    const prev = this.context;
    const nextContext = { ...this.context, ...ctx };
    const diff = deepdiff(nextContext, this.context);
    if (!diff) return;

    this.context = Object.assign(nextContext, {
      version: nextContext.version + 1,
    });

    this.eventEmitter.emit("contextUpdated", this.context, prev, diff);
  };

  /****************************************************
   Event Typing
  ****************************************************/
  private eventEmitter: TypedEventEmitter<TurnEvents & ContextEvents>;
  public on: TypedEventEmitter<TurnEvents>["on"] = (...args) =>
    this.eventEmitter.on(...args);
}
