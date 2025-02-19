import Twilio from "twilio";
import {
  TWILIO_ACCOUNT_SID,
  TWILIO_API_KEY,
  TWILIO_API_SECRET,
  TWILIO_SYNC_SVC_SID,
} from "../env.js";

export function createSyncToken(identity: string) {
  const AccessToken = Twilio.jwt.AccessToken;

  const token = new AccessToken(
    TWILIO_ACCOUNT_SID,
    TWILIO_API_KEY,
    TWILIO_API_SECRET,
    { identity },
  );

  token.addGrant(
    new AccessToken.SyncGrant({ serviceSid: TWILIO_SYNC_SVC_SID }),
  );

  return token.toJwt();
}
