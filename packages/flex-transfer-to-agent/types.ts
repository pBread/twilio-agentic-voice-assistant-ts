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
