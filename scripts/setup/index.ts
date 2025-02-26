import { apiKeySetupScripts } from "./api-key.js";
import { flexSetupScript } from "./flex.js";
import { closeRL, EnvManager } from "./helpers.js";
import { infoSetupScript } from "./info.js";
import { phoneSetupScripts } from "./phone.js";
import { syncSetupScripts } from "./sync.js";
import { setupUI } from "./ui.js";

(async () => {
  const env = new EnvManager(".env");

  env.assertAccountSid();
  await apiKeySetupScripts(env);
  env.assertApiKeys();
  env.assertHostName();

  await syncSetupScripts(env);
  await infoSetupScript(env);
  await phoneSetupScripts(env);
  // await voiceIntelligenceSetupScripts(env);
  await setupUI();
  await flexSetupScript(env);

  closeRL();
})();
