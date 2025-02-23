import Twilio from "twilio";
import { EnvManager, makeFriendlyName, sLog } from "./helpers.js";

export async function checkSetupSyncService(env: EnvManager) {
  sLog.info("checking twilio sync service");

  if (env.vars.TWILIO_SYNC_SVC_SID) {
    sLog.info("twilio sync service already defined");
    return true;
  }

  const { TWILIO_SYNC_SVC_SID } = await createSyncService(env);
  env.vars.TWILIO_SYNC_SVC_SID = TWILIO_SYNC_SVC_SID;

  await env.save();
}

async function createSyncService(env: EnvManager) {
  sLog.info("creating new Twilio Sync Service");
  try {
    const twlo = Twilio(env.vars.TWILIO_API_KEY, env.vars.TWILIO_API_SECRET, {
      accountSid: env.vars.TWILIO_ACCOUNT_SID,
    });
    const result = await twlo.sync.v1.services.create({
      friendlyName: makeFriendlyName(env),
    });

    sLog.success(`successfully created new Twilio Sync Service: ${result.sid}`);

    return { TWILIO_SYNC_SVC_SID: result.sid };
  } catch (error) {
    sLog.error("error creating Twilio Sync Service", error);
    throw error;
  }
}
