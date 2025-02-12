import { TypedEventEmitter } from "../../lib/events";
import type { TurnEvents } from "../../shared/turns";
import { ContextStore } from "./context-store";
import { TurnStore } from "./turn-store";

export type * from "./context-store";
export type * from "./turn-store";

export class SessionStore {
  context: ContextStore;
  turns: TurnStore;

  constructor(public callSid: string) {
    this.context = new ContextStore();
    this.turns = new TurnStore(callSid);

    // bubble up the events from each child
    this.eventEmitter = new TypedEventEmitter<TurnEvents>();

    this.turns.on("turnAdded", (...args) =>
      this.eventEmitter.emit("turnAdded", ...args)
    );
    this.turns.on("turnUpdated", (...args) =>
      this.eventEmitter.emit("turnUpdated", ...args)
    );
  }

  private eventEmitter: TypedEventEmitter<TurnEvents>;
  public on: TypedEventEmitter<TurnEvents>["on"] = (...args) =>
    this.eventEmitter.on(...args);
}
