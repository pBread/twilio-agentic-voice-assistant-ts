import type { NextApiHandler, NextApiRequest } from "next";
import twilio from "twilio";
import {
  TWILIO_API_KEY,
  TWILIO_API_SECRET,
  TWILIO_ACCOUNT_SID,
  TWILIO_SYNC_SVC_SID,
} from "@/util/env.server";
import { syncMapToCallRecord } from "@/state/calls";

const client = twilio(TWILIO_API_KEY, TWILIO_API_SECRET, {
  accountSid: TWILIO_ACCOUNT_SID,
});

const handler: NextApiHandler = async (req: NextApiRequest, res) => {
  const pageNumber = req.query.page ?? 1;

  const result = await client.sync.v1
    .services(TWILIO_SYNC_SVC_SID)
    // @ts-ignore
    .syncMaps.page({ pageNumber, pageSize: 20 });

  res.json(result.instances.map((map) => syncMapToCallRecord(map)));
};

export default handler;
