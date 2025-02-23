import { checkSetupTwilioApiKey } from "./api-key.js";
import { gatherDeveloperDetails } from "./developer-info.js";
import { closeRL, EnvManager } from "./helpers.js";
import { checkSetupSyncService } from "./sync.js";

(async () => {
  const env = new EnvManager(".env");

  env.assertAccountSid();
  await checkSetupTwilioApiKey(env);
  env.assertApiKeys();

  await checkSetupSyncService(env);

  env.assertHostName();

  await gatherDeveloperDetails(env);

  closeRL();
})();
