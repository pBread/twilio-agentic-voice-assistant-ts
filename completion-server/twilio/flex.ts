import twilio, { twiml as TwiML } from "twilio";
import log from "../../lib/logger.js";
import {
  TWILIO_ACCOUNT_SID as accountSid,
  FLEX_WORKFLOW_SID,
  TWILIO_API_KEY,
  TWILIO_API_SECRET,
} from "../../shared/env/server.js";

const client = twilio(TWILIO_API_KEY, TWILIO_API_SECRET, { accountSid });
const VoiceResponse = TwiML.VoiceResponse;

export interface WrapupCallWebhookPayload {
  AccountSid: string;
  CallSid: string;
  From: string;
  To: string;
  SessionId: string;
  SessionDuration: string;
  HandoffData?: string; // json string
}

export function createTransferToFlexHandoff(
  payload: WrapupCallWebhookPayload & { HandoffData: string },
) {
  let handoffData: TransferToFlexHandoff;
  try {
    handoffData = JSON.parse(payload.HandoffData);
  } catch (error) {
    log.error("flex", "Unable to parse transfer to flex handoff data");
    return;
  }

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
  customerData: object;
  from: string;
  sessionId: string;
  to: string;
}
