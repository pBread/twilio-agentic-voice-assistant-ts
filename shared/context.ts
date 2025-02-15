import type { UserRecord } from "./db-entities.js";

export interface Context {
  today: Date;

  user?: UserRecord;
  call: CallDetails;
}

interface CallDetails {
  callSid: string;
  from: string; // e164
  to: string; // e164

  startTime: string; // 24 hour format, 13:00
  userPhone: string; // e164
}
