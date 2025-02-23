import { askQuestion, closeRL, EnvManager, sLog } from "./helpers.js";
import { checkSetupTwilioApiKey } from "./api-key.js";
import { checkSetupSyncService } from "./sync.js";

(async () => {
  const env = new EnvManager(".env");

  env.assertAccountSid();
  await checkSetupTwilioApiKey(env);
  env.assertApiKeys();

  await checkSetupSyncService(env);

  env.assertHostName();

  await gatherDetails(env);

  closeRL();
})();

async function gatherDetails(env: EnvManager) {
  let firstName: string | undefined;
  const result = await await askQuestion(
    "(optional) What is your first name? This is used to personalize the demo.",
  );

  sLog.info("result", result, typeof result);

  if (!env.vars.DEVELOPERS_FIRST_NAME) {
    const firstName = await askQuestion(
      "(optional) What is your first name? This is used to personalize the demo.",
    );

    // env.vars.DEVELOPERS_FIRST_NAME = firstName;
  }
}
