import type { TwilioCallWebhookPayload } from "./twilio/voice.js";
import type { CallDetails } from "../shared/session/context.js";

export function makeCallDetail(payload: TwilioCallWebhookPayload): CallDetails {
  const dt = new Date();
  return {
    callSid: payload.CallSid,
    direction: "inbound",
    from: payload.From,
    to: payload.To,
    participantPhone: payload.From,
    startedAt: dt.toISOString(),
    localStartDate: dt.toLocaleDateString(),
    localStartTime: dt.toLocaleTimeString(),
    status: payload.CallStatus,
  };
}
