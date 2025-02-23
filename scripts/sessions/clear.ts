import "dotenv-flow/config";
import twilio from "twilio";
import log from "../../lib/logger.js";

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_API_KEY,
  TWILIO_API_SECRET,
  TWILIO_SYNC_SVC_SID,
} = process.env;

if (!TWILIO_ACCOUNT_SID) throw Error("Missing env var TWILIO_ACCOUNT_SID");
if (!TWILIO_API_KEY) throw Error("Missing env var TWILIO_API_KEY");
if (!TWILIO_API_SECRET) throw Error("Missing env var TWILIO_API_SECRET");
if (!TWILIO_SYNC_SVC_SID) throw Error("Missing env var TWILIO_SYNC_SVC_SID");

const main = async () => {
  console.log("=== CLEAR SESSIONS SCRIPT: STARTING ===");

  const client = twilio(TWILIO_API_KEY, TWILIO_API_SECRET, {
    accountSid: TWILIO_ACCOUNT_SID,
  });

  const syncSvc = await client.sync.v1.services(TWILIO_SYNC_SVC_SID).fetch();

  console.log(`targeting sync service: ${syncSvc.friendlyName}`);

  const syncMapApi = client.sync.v1.services(TWILIO_SYNC_SVC_SID).syncMaps;
  const maps = await syncMapApi.list();

  const mapsToDelete = maps;

  // const mapsToDelete = maps.filter(
  //   (map) => isContextMapName(map.uniqueName) || isTurnMapName(map.uniqueName),
  // );

  console.log(
    `found ${maps.length} total sync maps, identified ${mapsToDelete.length} for deletion`,
  );

  let deleted = 0;
  let failed = 0;
  for (const map of mapsToDelete) {
    try {
      console.log(`\n${map.uniqueName}\t attempting to delete`);
      await map.remove();
      deleted++;
      log.green(`${map.uniqueName}\t successfully deleted`);
    } catch (error) {
      failed++;
      log.error(`${map.uniqueName}\t failed to delete`);
    }
  }

  console.log(`\ntotal deleted: ${deleted}; total failed: ${failed}`);

  console.log("=== CLEAR SESSIONS SCRIPT: FINISHED ===\n");
};

main();
