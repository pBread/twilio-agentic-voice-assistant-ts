import type { Procedure } from "../../agent/types.js";
import type { UserRecord } from "../db-entities.js";

export interface SessionContext {
  call?: CallDetails;
  procedures?: Record<string, Procedure>;
  toolConfig?: Record<string, ToolConfiguration>;
  user?: UserRecord;
}

export interface ToolConfiguration {
  restricted?: boolean;
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
