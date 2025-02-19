export type HandoffData = HandoffDueToError;

export interface TransferToFlex {
  reason: "transfer-to-flex";
  accountSid: string;
  customerData: object;
  from: string;
  sessionId: string;
  to: string;
}

export interface HandoffDueToError {
  reason: "error";
  message: string;
}
