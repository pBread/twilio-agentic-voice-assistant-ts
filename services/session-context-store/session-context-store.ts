import EventEmitter from "events";
import type { SessionContext } from "./entities";

export class SessionContextStore extends EventEmitter {
  constructor(params: {}) {
    super();
  }
}
