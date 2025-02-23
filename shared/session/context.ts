import type { Procedure } from "../../agent/types.js";
import type { AIQuestionState } from "../../modules/flex-human-consultation/types.js";
import type { GovernanceState } from "../../modules/governance/types.js";
import type { CallSummary } from "../../modules/summarization/types.js";
import type { UserRecord } from "../db-entities.js";

export interface SessionContext {
  auxiliaryMessages: Record<string, AuxiliaryMessage>; // messages sent to the user outside of the conversation
  call: CallDetails;
  company: CompanyDetails;
  contactCenter: ContactCenter;
  governance: GovernanceState;
  procedures: Record<string, Procedure>;
  questions: AIQuestionState;
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

export interface AuxiliaryMessage {
  createdAt: string;
  id: string;
  channel: "sms" | "email";
  body: string;
  from: string;
  to: string;
}

export interface ContactCenter {
  waitTime: number; // minutes
}

export interface CompanyDetails {
  name: string;
  description: string;
  email: string;
}
