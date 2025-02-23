import { checkSetupTwilioApiKey } from "./api-key.js";
import { gatherDeveloperDetails } from "./developer-info.js";
import { checkGetTaskrouterSids } from "./flex.js";
import { closeRL, EnvManager } from "./helpers.js";
import { checkBuyPhoneNumber, setupTwilioPhoneNumber } from "./phone.js";
import { checkSetupSyncService, setupSyncService } from "./sync.js";
import {
  checkVoiceIntelligence,
  checkVoiceIntelligenceOperators,
} from "./voice-intelligence.js";

(async () => {
  const env = new EnvManager(".env");

  env.assertAccountSid();
  await checkSetupTwilioApiKey(env);
  env.assertApiKeys();

  await checkSetupSyncService(env);
  await setupSyncService(env);

  env.assertHostName();

  await gatherDeveloperDetails(env);

  await checkBuyPhoneNumber(env);
  await setupTwilioPhoneNumber(env);

  await checkVoiceIntelligence(env);
  await checkVoiceIntelligenceOperators(env);

  await checkGetTaskrouterSids(env);

  closeRL();
})();
