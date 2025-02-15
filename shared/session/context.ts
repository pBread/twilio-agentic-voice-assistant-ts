import deepDiff from "deep-diff";
import type { UserRecord } from "../db-entities.js";

export interface SessionContext {
  user?: UserRecord;
  call?: CallDetails;
}

interface CallDetails {
  callSid: string;
  from: string; // e164
  to: string; // e164

  date: Date;
  startTime: string; // 24 hour format, 13:00
  userPhone: string; // e164
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
