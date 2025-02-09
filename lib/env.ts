import "dotenv-flow/config"; // supports multiple environments, e.g. .env, .env.local
import log from "./logger";

export const PORT = process.env.PORT as string;

/****************************************************
 Required
****************************************************/
export const HOSTNAME = process.env.HOSTNAME as string;
export const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID as string;

export const TWILIO_API_KEY = process.env.TWILIO_API_KEY as string;
export const TWILIO_API_SECRET = process.env.TWILIO_API_SECRET as string;

if (!TWILIO_ACCOUNT_SID) log.red("Missing env var TWILIO_ACCOUNT_SID");
if (!TWILIO_API_KEY) log.red("Missing env var TWILIO_API_KEY");
if (!TWILIO_API_SECRET) log.red("Missing env var TWILIO_API_SECRET");

// validate the hostname is included then
if (!HOSTNAME) log.red(`Missing env var HOSTNAME`);
else if (
  // RFC-1123
  !/^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/.test(
    HOSTNAME
  )
)
  log.warn(
    `Invalid HOSTNAME. Only include the the hostname, e.g. domain.com or sub.domain.com, not the other URL elements, e.g. http://`
  );
