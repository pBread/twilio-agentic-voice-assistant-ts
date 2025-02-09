import { AgentRuntime } from "./agent-runtime";
import { ContextStore } from "./context-store";
import { TurnStore } from "./turn-store";

export class SessionManager {
  agent: AgentRuntime;
  context: ContextStore;
  turns: TurnStore;

  constructor() {
    this.agent = new AgentRuntime();
    this.context = new ContextStore();
    this.turns = new TurnStore();
  }
}

const session = new SessionManager();
session.turns.list();
