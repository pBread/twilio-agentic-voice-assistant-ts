import type { NextApiHandler, NextApiRequest } from "next";
import twilio from "twilio";

const { TWILIO_ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET } = process.env;
if (!TWILIO_ACCOUNT_SID) throw Error("Missing env var TWILIO_ACCOUNT_SID");
if (!TWILIO_API_KEY) throw Error("Missing env var TWILIO_API_KEY");
if (!TWILIO_API_SECRET) throw Error("Missing env var TWILIO_API_SECRET");

const handler: NextApiHandler = (req: NextApiRequest, res) => {
  const identity = req.query.identity as string;

  const AccessToken = twilio.jwt.AccessToken;
  const SyncGrant = AccessToken.SyncGrant;

  const token = new AccessToken(
    TWILIO_ACCOUNT_SID,
    TWILIO_API_KEY,
    TWILIO_API_SECRET,
    { identity },
  );

  token.addGrant(
    new SyncGrant({ serviceSid: process.env.TWILIO_SYNC_SVC_SID }),
  );

  res.json({ identity, token: token.toJwt() });
};

export default handler;
