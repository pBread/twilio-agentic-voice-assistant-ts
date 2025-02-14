import { UserRecord } from "./db-entities.js";

export interface Context {
  user?: UserRecord;
}
