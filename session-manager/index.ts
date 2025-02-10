import { AgentRuntime } from "./agent-runtime";
import { ContextStore } from "./context-store";
import { TurnStore } from "./turn-store";

export class SessionManager {
  agent: AgentRuntime;
  context: ContextStore;
  turns: TurnStore;

  constructor() {
    this.context = new ContextStore();
    this.turns = new TurnStore();

    this.agent = new AgentRuntime(
      {
        config: {},
        instructions: "Hello world",
        resolvers: [],
        tools: [],
      },
      { context: this.context, turns: this.turns }
    );
  }
}

const session = new SessionManager();
session.turns.list();
