import { NextApiHandler, NextApiRequest } from "next";
import Twilio from "twilio";

const handler: NextApiHandler = (req: NextApiRequest, res) => {
  const identity = req.query.identity as string;

  res.json(createSyncToken(identity));
};

export default handler;

export function createSyncToken(identity: string) {
  const AccessToken = Twilio.jwt.AccessToken;
  const SyncGrant = AccessToken.SyncGrant;

  const token = new AccessToken(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_API_KEY,
    process.env.TWILIO_API_SECRET,
    { identity },
  );

  token.addGrant(
    new SyncGrant({ serviceSid: process.env.TWILIO_SYNC_SVC_SID }),
  );

  return { identity, token: token.toJwt() };
}
