import log from "../lib/logger";
import { AgentRuntime } from "./agent-runtime";
import { ContextStore } from "./context-store";
import { TurnStore } from "./turn-store";

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
  }
}

const session = new SessionManager("CA00000....");
session.turns.list();

session.turns.on("updatedTurn", (id) => {
  const turn = session.turns.get(id);
  log.debug("session", id, turn?.version, JSON.stringify(turn, null, 2));
});

const turn = session.turns.addBotText({ content: "Hello" });
turn.content = "Hello world.";

turn.content += " Next sentence.";

turn.interrupted = true;
