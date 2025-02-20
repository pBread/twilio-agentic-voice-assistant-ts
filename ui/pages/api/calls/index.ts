import type { NextApiHandler, NextApiRequest } from "next";
import twilio from "twilio";
import {
  TWILIO_API_KEY,
  TWILIO_API_SECRET,
  TWILIO_ACCOUNT_SID,
  TWILIO_SYNC_SVC_SID,
} from "@/util/env.server";
import { syncMapToCallRecord } from "@/state/calls";
import { parseCallSid } from "@/util/sync-ids";

const client = twilio(TWILIO_API_KEY, TWILIO_API_SECRET, {
  accountSid: TWILIO_ACCOUNT_SID,
});

const handler: NextApiHandler = async (req: NextApiRequest, res) => {
  let pageNumber = (req.query.page as string | undefined) ?? 1;
  if (typeof pageNumber === "string") pageNumber = parseInt(pageNumber);

  // todo: fix paging
  const result =
    pageNumber === 1
      ? await client.sync.v1
          .services(TWILIO_SYNC_SVC_SID)
          .syncMaps.page({ pageSize: 20 })
          .then((data) => data.instances)
      : pageNumber === 2
        ? await client.sync.v1.services(TWILIO_SYNC_SVC_SID).syncMaps.list()
        : [];

  const records = Object.values(
    result
      .filter((map) => {
        try {
          return !!parseCallSid(map.uniqueName);
        } catch (error) {
          return false;
        }
      })
      .map((map) => syncMapToCallRecord(map))
      .reduce((acc, cur) => Object.assign(acc, { [cur.callSid]: cur }), {}),
  );

  res.json(records);
};

export default handler;
