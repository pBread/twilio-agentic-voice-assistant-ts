import { SessionContextStore } from "./session-context-store/session-context-store";
import { SessionTurnStore } from "./session-turn-store/session-turn-store";

class SessionManager {
  constructor() {
    this.ctx = new SessionContextStore();
    this.turns = new SessionTurnStore();
  }

  ctx: SessionContextStore;
  turns: SessionTurnStore;
}

const session = new SessionManager();
