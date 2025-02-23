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
      webhookUrl: `https://${env.vars.HOSTNAME}/sync-webhook`,
    });

    sLog.success(`successfully created new Twilio Sync Service: ${result.sid}`);

    return { TWILIO_SYNC_SVC_SID: result.sid };
  } catch (error) {
    sLog.error("error creating Twilio Sync Service", error);
    throw error;
  }
}

export async function setupSyncService(env: EnvManager) {
  try {
    const twlo = Twilio(env.vars.TWILIO_API_KEY, env.vars.TWILIO_API_SECRET, {
      accountSid: env.vars.TWILIO_ACCOUNT_SID,
    });

    if (!env.vars.TWILIO_SYNC_SVC_SID)
      throw Error(`Missing required env: TWILIO_SYNC_SVC_SID`);

    const syncSvc = await twlo.sync.v1
      .services(env.vars.TWILIO_SYNC_SVC_SID)
      .fetch();

    const webhookUrl = `https://${env.vars.HOSTNAME}/sync-webhook`;

    if (syncSvc.webhookUrl !== webhookUrl) {
      sLog.info(`configuring sync service webhook to ${webhookUrl}`);
      await twlo.sync.v1
        .services(env.vars.TWILIO_SYNC_SVC_SID)
        .update({ webhookUrl });

      sLog.success(`sync service webhook has been updated to ${webhookUrl}`);
    }

    sLog.info(
      `sync webhook is configured. sync events will be published to ${webhookUrl}`,
    );
  } catch (error) {
    sLog.error(`error setting up sync service. error: `, error);
    throw error;
  }
}
