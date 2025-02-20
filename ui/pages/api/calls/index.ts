import type { SessionMetaData } from "@/state/sessions";
import {
  TWILIO_ACCOUNT_SID,
  TWILIO_API_KEY,
  TWILIO_API_SECRET,
  TWILIO_SYNC_SVC_SID,
} from "@/util/env.server";
import { parseCallSid } from "@/util/sync-ids";
import type { NextApiHandler, NextApiRequest } from "next";
import twilio from "twilio";
import { SyncMapInstance } from "twilio/lib/rest/sync/v1/service/syncMap";

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
        ? await client.sync.v1.services(TWILIO_SYNC_SVC_SID).syncMaps.list() // hack: just fetching them all bc I couldn't figure out paging
        : [];

  const records = Object.values(
    result
      .map(toSessionMetaData)
      .reduce((acc, cur) => Object.assign(acc, { [cur.callSid]: cur }), {}), // deduplicate
  );

  res.json(records);
};

function toSessionMetaData(map: SyncMapInstance): SessionMetaData {
  const callSid = parseCallSid(map.uniqueName);
  return { id: callSid, callSid, dateCreated: map.dateCreated.toISOString() };
}

export default handler;
