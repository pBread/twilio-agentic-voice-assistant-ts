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

export interface WrapupCallWebhookPayload {
  AccountSid: string;
  CallSid: string;
  From: string;
  To: string;
  SessionId: string;
  SessionDuration: string;
  HandoffData?: string; // json string
}

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

  return twiml;
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
