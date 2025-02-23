import Twilio from "twilio";
import { fileURLToPath } from "url";
import { closeRL, EnvManager, makeFriendlyName, sLog } from "./helpers.js";

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

(async () => {
  if (!isMainModule) return;

  const env = new EnvManager(".env");
  env.assertAccountSid();
  await checkSetupTwilioApiKey(env);
  env.assertApiKeys();

  closeRL();
})();

export async function checkSetupTwilioApiKey(env: EnvManager) {
  sLog.info("checking twilio api key and secret");

  if (env.vars.TWILIO_API_KEY && !env.vars.TWILIO_API_SECRET)
    throw Error("Missing TWILIO_API_SECRET but TWILIO_API_KEY is defined");
  if (!env.vars.TWILIO_API_KEY && env.vars.TWILIO_API_SECRET)
    throw Error("Missing TWILIO_API_KEY but TWILIO_API_SECRET is defined");

  if (env.vars.TWILIO_API_KEY && env.vars.TWILIO_API_SECRET) {
    sLog.info("twilio api key and secret are already defined");
    return true;
  }

  const { TWILIO_API_KEY, TWILIO_API_SECRET } = await createTwilioAPIKey(env);
  env.vars.TWILIO_API_KEY = TWILIO_API_KEY;
  env.vars.TWILIO_API_SECRET = TWILIO_API_SECRET;
  await env.save();
}

async function createTwilioAPIKey(env: EnvManager) {
  sLog.info("creating new Twilio API Key and Secret");
  try {
    const twlo = Twilio(
      env.vars.TWILIO_ACCOUNT_SID,
      env.vars.TWILIO_AUTH_TOKEN,
    );
    const result = await twlo.iam.v1.newApiKey.create({
      accountSid: env.vars.TWILIO_ACCOUNT_SID!,
      friendlyName: makeFriendlyName(env),
    });

    sLog.success(`successfully created new Twilio API Key: ${result.sid}`);

    return { TWILIO_API_KEY: result.sid, TWILIO_API_SECRET: result.secret };
  } catch (error) {
    sLog.error("error creating Twilio API Key and Secret", error);
    throw error;
  }
}
