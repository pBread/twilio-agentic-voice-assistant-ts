import Twilio from "twilio";
import { fileURLToPath } from "url";
import { closeRL, EnvManager, sLog } from "./helpers.js";

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  (async () => {
    const env = new EnvManager(".env");
    await phoneSetupScripts(env);
    closeRL();
  })();
}

export async function phoneSetupScripts(env: EnvManager) {
  sLog.title("Phone Setup Script");
  env.assertAccountSid();
  env.assertApiKeys();
  env.assertHostName();

  await checkBuyPhoneNumber(env);
  await setupTwilioPhoneNumber(env);
}

async function checkBuyPhoneNumber(env: EnvManager) {
  sLog.info("checking default twilio phone");

  if (env.vars.DEFAULT_TWILIO_NUMBER) {
    sLog.info(`DEFAULT_TWILIO_NUMBER is defined`);
    return;
  }

  sLog.info("no default twilio phone number. buying a new phone number");

  try {
    const twlo = Twilio(env.vars.TWILIO_API_KEY, env.vars.TWILIO_API_SECRET, {
      accountSid: env.vars.TWILIO_ACCOUNT_SID,
    });
    const available = await twlo
      .availablePhoneNumbers("US")
      .local.list({ limit: 1 });

    if (!available || !available[0]) throw Error("No phone numbers found");
    const [pn] = available;
    const incomingPn = await twlo.incomingPhoneNumbers.create({
      phoneNumber: pn.phoneNumber,
    });

    env.vars.DEFAULT_TWILIO_NUMBER = incomingPn.phoneNumber;
    sLog.success(
      `purchased a new twilio phone number: ${incomingPn.phoneNumber}`,
    );

    await env.save();
  } catch (error) {
    sLog.error("failed to purchase twilio phone number. error: ", error);
    throw error;
  }
}

async function setupTwilioPhoneNumber(env: EnvManager) {
  try {
    sLog.info(
      `checking configuration of DEFAULT_TWILIO_NUMBER (${env.vars.DEFAULT_TWILIO_NUMBER})`,
    );

    const twlo = Twilio(env.vars.TWILIO_API_KEY, env.vars.TWILIO_API_SECRET, {
      accountSid: env.vars.TWILIO_ACCOUNT_SID,
    });
    const [pn] = await twlo.incomingPhoneNumbers.list({
      phoneNumber: env.vars.DEFAULT_TWILIO_NUMBER,
    });

    if (!pn)
      throw Error(
        `Could not find a record for ${env.vars.DEFAULT_TWILIO_NUMBER}`,
      );

    const statusCallback = `https://${env.vars.HOSTNAME}/call-status`;
    const statusCallbackMethod = "POST";
    const voiceMethod = "POST";
    const voiceUrl = `https://${env.vars.HOSTNAME}/incoming-call`;

    const isAlreadySetup =
      pn.statusCallback === statusCallback &&
      pn.statusCallbackMethod === statusCallbackMethod &&
      pn.voiceMethod === voiceMethod &&
      pn.voiceUrl === voiceUrl;

    if (!isAlreadySetup) {
      sLog.info(
        `default twilio phone number (${pn.phoneNumber}) is not configured to receive incoming calls. updating the configuration`,
      );
      await twlo.incomingPhoneNumbers(pn.sid).update({
        statusCallback,
        statusCallbackMethod,
        voiceMethod,
        voiceUrl,
      });

      sLog.success(`updated twilio phone (${pn.phoneNumber}) webhooks`);
    }

    sLog.info(
      `DEFAULT_TWILIO_NUMBER (${env.vars.DEFAULT_TWILIO_NUMBER}) is configured to receive incoming calls.`,
    );
  } catch (error) {
    sLog.error("error configuring twilio phone number. error: ", error);
    throw error;
  }
}
