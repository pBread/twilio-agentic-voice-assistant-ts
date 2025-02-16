import type { UserRecord } from "../db-entities.js";
import type { Procedure } from "../../agents/procedures.js";

export interface SessionContext {
  call?: CallDetails;
  procedures?: Record<string, Procedure>;
  user?: UserRecord;
}

export type CallDetails = {
  callSid: string;
  conversationRelaySessionId?: string; // the Conversation Relay session

  from: string; // e164
  to: string; // e164

  direction: "inbound" | "outbound";
  participantPhone: string; // the phone number of the person being called or calling

  startedAt: string; // ISO 8601 timestamp
  localStartDate: string; // Date().toLocaleDateString()
  localStartTime: string; // Date().toLocaleTimeString()

  status:
    | "queued"
    | "ringing"
    | "in-progress"
    | "completed"
    | "busy"
    | "failed"
    | "no-answer";
};
