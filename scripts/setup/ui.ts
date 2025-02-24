import { fileURLToPath } from "url";
import { closeRL, EnvManager, sLog } from "./helpers.js";

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  (async () => {
    const env = new EnvManager(".env");
    env.assertAccountSid();
    env.assertApiKeys();

    await setupUI();
    closeRL();
  })();
}

export async function setupUI() {
  sLog.title("UI Setup Script");
  const rootEnv = new EnvManager(".env");
  const uiEnv = new EnvManager("./ui/.env", {
    TWILIO_ACCOUNT_SID: rootEnv.vars.TWILIO_ACCOUNT_SID,
    TWILIO_API_KEY: rootEnv.vars.TWILIO_API_KEY,
    TWILIO_API_SECRET: rootEnv.vars.TWILIO_API_SECRET,
    TWILIO_SYNC_SVC_SID: rootEnv.vars.TWILIO_SYNC_SVC_SID,
  });

  if (uiEnv.isChanged()) sLog.info("UI env variables already set");

  await uiEnv.save();
}
