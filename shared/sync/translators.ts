import type { SyncMapInstance } from "twilio/lib/rest/sync/v1/service/syncMap.js";
import type { CallRecord } from "../session/call.js";
import { parseCallSid } from "./ids.js";

// this is currently duplicated in the UI
export function syncMapToCallRecord(map: SyncMapInstance): CallRecord {
  const callSid = parseCallSid(map.uniqueName) as string;

  return {
    accountSid: map.accountSid,
    callSid,
    createdBy: map.createdBy,
    dateCreated: map.dateCreated.toISOString(),
    dateUpdated: map.dateUpdated.toISOString(),
    id: callSid,
    serviceSid: map.serviceSid,
  };
}
