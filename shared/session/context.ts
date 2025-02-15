import deepDiff from "deep-diff";
import type { UserRecord } from "../db-entities.js";

export interface SessionContext {
  user?: UserRecord;
  call?: CallDetails;
}

export interface CallDetails {
  callSid: string;
  from: string; // e164
  to: string; // e164

  direction: "inbound" | "outbound";
  participantPhone: string; // the phone number of the person being called or calling

  startedAt: string; // ISO 8601 timestamp
  localStartDate: string; // Date().toLocaleDateString()
  localStartTime: string; // Date().toLocaleTimeString()
}

export interface ContextEvents {
  contextUpdated: (
    context: SessionContext,
    diff: ReturnType<typeof deepDiff<SessionContext, SessionContext>>
  ) => void;
}
export type ContextEventTypes = keyof ContextEvents;

type EventHandler<T, K extends keyof T> = T[K];
export type ContextUpdatedHandler = EventHandler<
  ContextEvents,
  "contextUpdated"
>;

export type ContextDiff = ReturnType<
  typeof deepDiff<SessionContext, SessionContext>
>;
