import twilio from "twilio";
import log from "../../lib/logger.js";
import {
  TWILIO_ACCOUNT_SID as accountSid,
  FLEX_WORKFLOW_SID,
  TWILIO_API_KEY,
  TWILIO_API_SECRET,
} from "../../shared/env/server.js";

const client = twilio(TWILIO_API_KEY, TWILIO_API_SECRET, { accountSid });
const VoiceResponse = twilio.twiml.VoiceResponse;

export function makeTransferToFlexHandoff(
  payload: WrapupCallWebhookPayload,
  handoffData: TransferToFlexHandoff,
) {
  const taskAttributes = {
    ...handoffData,
    accountSid: payload.AccountSid,
    callSid: payload.CallSid,
    from: payload.From,
    to: payload.To,
    sessionId: payload.SessionId,
    sessionDuration: payload.SessionDuration,
  };
  log.info("flex", `Enqueing call ${payload.CallSid}`);
  const twiml = new VoiceResponse();
  twiml
    .enqueue({ workflowSid: FLEX_WORKFLOW_SID })
    .task({ priority: 1000 }, JSON.stringify(taskAttributes));

  return twiml.toString();
}

// todo: the accountSid, from, to, etc. are all included in the webhook payload so they may not be necessary for handoff data
export interface TransferToFlexHandoff {
  reasonCode: "transfer-to-flex";
  reason: string;
  accountSid: string;
  from: string;
  sessionId: string;
  to: string;
  conversationSummary: string;
  customerData: object;
}

export interface WrapupCallWebhookPayload {
  HandoffData?: string; // json string
  AccountSid: string;
  ApiVersion: string;
  Called: string;
  CalledCity: string;
  CalledCountry: string;
  CalledState: string;
  CalledZip: string;
  Caller: string;
  CallerCity: string;
  CallerCountry: string;
  CallerState: string;
  CallerZip: string;
  CallSid: string;
  CallStatus: string;
  Direction: string;
  From: string;
  FromCity: string;
  FromCountry: string;
  FromState: string;
  FromZip: string;
  SessionDuration: string;
  SessionId: string;
  SessionStatus: string;
  To: string;
  ToCity: string;
  ToCountry: string;
  ToState: string;
  ToZip: string;
}
