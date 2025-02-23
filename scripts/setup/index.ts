import { EnvManager } from "../helpers.js";
import { checkSetupTwilioApiKey } from "./api-key.js";
import { checkSetupSyncService } from "./sync.js";

(async () => {
  const env = new EnvManager(".env");

  env.assertAccountSid();
  await checkSetupTwilioApiKey(env);
  env.assertApiKeys();

  await checkSetupSyncService(env);
})();
