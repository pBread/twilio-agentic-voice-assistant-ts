import type { Procedure } from "../../agent/types.js";
import type { GovernanceState } from "../../packages/governance/types.js";
import type { CallSummary } from "../../packages/summarization/types.js";
import type { UserRecord } from "../db-entities.js";

export interface SessionContext {
  call: CallDetails;
  company: CompanyDetails;
  contactCenter: ContactCenter;
  governance: GovernanceState;
  procedures: Record<string, Procedure>;
  summary: CallSummary;
  toolConfig: Record<string, ToolConfiguration>;
  user: UserRecord;
}

// this is also defined in the UI store
export interface SessionMetaData {
  id: string; // callSid
  callSid: string;
  dateCreated: string;
}

export interface ToolConfiguration {
  restricted?: boolean;
}

export interface CallDetails {
  callSid: string;
  conversationRelaySessionId?: string; // the Conversation Relay session

  from: string; // e164
  to: string; // e164

  direction: "inbound" | "outbound";
  participantPhone: string; // the phone number of the person being called or calling

  startedAt: string; // ISO 8601 timestamp
  localStartDate: string; // Date().toLocaleDateString()
  localStartTime: string; // Date().toLocaleTimeString()

  recordingUrl?: string;

  status:
    | "queued"
    | "ringing"
    | "in-progress"
    | "completed"
    | "busy"
    | "failed"
    | "no-answer";
}

export interface ContactCenter {
  waitTime: number; // minutes
}

export interface CompanyDetails {
  name: string;
  description: string;
}
