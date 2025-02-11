import { TypedEventEmitter } from "../lib/events";
import { AgentRuntime } from "./agent-runtime";
import { ContextStore } from "./context-store";
import { TurnStore } from "./turn-store";
import type { TurnEvents } from "./turn-store.entities";

export class SessionManager {
  agent: AgentRuntime;
  context: ContextStore;
  turns: TurnStore;

  constructor(public callSid: string) {
    this.context = new ContextStore();
    this.turns = new TurnStore(callSid);

    this.agent = new AgentRuntime(
      {
        config: {},
        instructions: "Hello world",
        resolvers: [],
        tools: [],
      },
      { context: this.context, turns: this.turns }
    );

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
