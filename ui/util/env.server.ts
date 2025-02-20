export const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID as string;
export const TWILIO_API_KEY = process.env.TWILIO_API_KEY as string;
export const TWILIO_API_SECRET = process.env.TWILIO_API_SECRET as string;
export const TWILIO_SYNC_SVC_SID = process.env.TWILIO_SYNC_SVC_SID as string;

if (!TWILIO_ACCOUNT_SID) throw Error("Missing env var TWILIO_ACCOUNT_SID");
if (!TWILIO_API_KEY) throw Error("Missing env var TWILIO_API_KEY");
if (!TWILIO_API_SECRET) throw Error("Missing env var TWILIO_API_SECRET");
if (!TWILIO_SYNC_SVC_SID) throw Error("Missing env var TWILIO_SYNC_SVC_SID");
