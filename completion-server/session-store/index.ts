import deepdiff from "deep-diff";
import { TypedEventEmitter } from "../../lib/events.js";
import type {
  ContextEvents,
  SessionContext,
} from "../../shared/session-context.js";
import type { TurnEvents } from "../../shared/session-turns.js";
import { TurnStore } from "./turn-store.js";

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

    this.eventEmitter.emit("contextUpdated", this.context, diff);
  };

  /****************************************************
   Event Typing
  ****************************************************/
  private eventEmitter: TypedEventEmitter<TurnEvents & ContextEvents>;
  public on: (typeof this.eventEmitter)["on"] = (...args) =>
    this.eventEmitter.on(...args);
}
