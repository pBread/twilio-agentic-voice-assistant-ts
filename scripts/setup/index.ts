import { checkSetupTwilioApiKey } from "./api-key.js";
import { gatherDeveloperDetails } from "./developer-info.js";
import { closeRL, EnvManager, sLog } from "./helpers.js";
import { checkBuyPhoneNumber, setupTwilioPhoneNumber } from "./phone.js";
import { checkSetupSyncService } from "./sync.js";
import Twilio from "twilio";

(async () => {
  const env = new EnvManager(".env");

  env.assertAccountSid();
  await checkSetupTwilioApiKey(env);
  env.assertApiKeys();

  await checkSetupSyncService(env);

  env.assertHostName();

  await gatherDeveloperDetails(env);

  await checkBuyPhoneNumber(env);
  await setupTwilioPhoneNumber(env);

  closeRL();
})();
