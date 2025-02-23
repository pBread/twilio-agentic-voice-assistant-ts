import { EnvManager } from "../helpers.js";
import { checkSetupTwilioApiKey } from "./api-key.js";

(async () => {
  const env = new EnvManager(".env");

  await checkSetupTwilioApiKey(env);
})();
