export async function startRecording(callSid: string) {}

export interface TwilioCallWebhookPayload {
  CallSid: string;
  AccountSid: string;
  From: string;
  To: string;
  ApiVersion: string;
  Direction: "inbound" | "outbound-api";
  CallStatus:
    | "queued"
    | "ringing"
    | "in-progress"
    | "completed"
    | "busy"
    | "failed"
    | "no-answer";

  CallCost?: string;
  CallerId?: string;
  CallerName?: string;
  Duration?: string;
  ForwardedFrom?: string;
  FromCity?: string;
  FromCountry?: string;
  FromState?: string;
  FromZip?: string;
  RecordingSid?: string;
  RecordingUrl?: string;
  StartTime?: string;
  ToCity?: string;
  ToCountry?: string;
  ToState?: string;
  ToZip?: string;
}
