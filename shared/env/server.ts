import "dotenv-flow/config";
import log from "../../lib/logger.js";

const errors: string[] = [];
const addError = (msg: string) => {
  log.red(msg);
  errors.push(msg);
};
const missingRequired = (env: string) =>
  addError(`Missing environment variable ${env}`);

const warn = (msg: string) => log.yellow(msg);
const warnMissing = (env: string) =>
  warn(`(warning) Missing environment variable ${env}`);

/****************************************************
 Required Env Variables
****************************************************/
export const HOSTNAME = process.env.HOSTNAME as string;
if (!HOSTNAME) missingRequired("HOSTNAME");
else if (!isValidHostname(HOSTNAME)) {
  warn(
    "Invalid HOSTNAME. Only include the hostname, e.g. domain.com or sub.domain.com, not the other URL elements, e.g. http://",
  );
}

export const OPENAI_API_KEY = process.env.OPENAI_API_KEY as string;
if (!OPENAI_API_KEY) missingRequired("OPENAI_API_KEY");

export const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID as string;
export const TWILIO_API_KEY = process.env.TWILIO_API_KEY as string;
export const TWILIO_API_SECRET = process.env.TWILIO_API_SECRET as string;
if (!TWILIO_ACCOUNT_SID) missingRequired("TWILIO_ACCOUNT_SID");
if (!TWILIO_API_KEY) missingRequired("TWILIO_API_KEY");
if (!TWILIO_API_SECRET) missingRequired("TWILIO_API_SECRET");

export const TWILIO_SYNC_SVC_SID = process.env.TWILIO_SYNC_SVC_SID as string;
if (!TWILIO_SYNC_SVC_SID) missingRequired("TWILIO_SYNC_SVC_SID");

/****************************************************
 Optional Env Variables
****************************************************/
export const DEFAULT_TWILIO_NUMBER = process.env.DEFAULT_TWILIO_NUMBER;
if (!DEFAULT_TWILIO_NUMBER) warnMissing("DEFAULT_TWILIO_NUMBER");

export const DEVELOPERS_PHONE_NUMBER = process.env.DEVELOPERS_PHONE_NUMBER;

/****************************************************
 Environment Configuration
****************************************************/
export const PORT = process.env.PORT ?? "3333";

/****************************************************
 Validation Helpers
****************************************************/
// Helper function to validate hostname using RFC-1123
function isValidHostname(hostname: string): boolean {
  return /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/.test(
    hostname,
  );
}

// throw if any required variables are missing
if (errors.length) {
  throw Error(
    `Environment validation failed with the following errors:\n${errors
      .map((err, idx) => `\t(${idx + 1}) ${err}`)
      .join("\n")}`,
  );
}
