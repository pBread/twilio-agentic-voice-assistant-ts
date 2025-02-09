export async function startRecording(callSid: string) {}

export interface TwilioCallWebhookPayload {
  CallSid: string; // The unique ID of the call
  AccountSid: string; // The Account SID that initiated the call
  From: string; // The phone number or Client identifier of the party calling
  To: string; // The phone number or Client identifier of the called party
  ApiVersion: string; // API version used to make the call
  Direction: "inbound" | "outbound-api"; // The direction of the call (inbound or outbound-api)
  CallStatus:
    | "queued"
    | "ringing"
    | "in-progress"
    | "completed"
    | "busy"
    | "failed"
    | "no-answer"; // The status of the call

  CallCost?: string; // The price charged for the call
  CallerId?: string; // A custom string that was passed when initiating the call
  CallerName?: string; // The caller name if the call was initiated with CNAM lookup enabled
  Duration?: string; // The length of the call in seconds
  ForwardedFrom?: string; // The forwarded phone number if the call was forwarded
  FromCity?: string; // The city of the caller
  FromCountry?: string; // The country of the caller
  FromState?: string; // The state or province of the caller
  FromZip?: string; // The zip code of the caller
  RecordingSid?: string; // The unique ID of the recording
  RecordingUrl?: string; // The URL of the recording
  StartTime?: string; // The time the call started
  ToCity?: string; // The city of the called party
  ToCountry?: string; // The country of the called party
  ToState?: string; // The state or province of the called party
  ToZip?: string; // The zip code of the called party
}
