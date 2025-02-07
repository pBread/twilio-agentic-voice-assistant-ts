import "dotenv-flow/config"; // supports multiple environments, e.g. .env, .env.local
import log from "./logger";

export const HOSTNAME = process.env.HOSTNAME as string;
export const PORT = process.env.PORT as string;

/****************************************************
 Validation Checks
****************************************************/
if (!HOSTNAME) log.red(`Missing env var HOSTNAME`);
const hostnameRFC1123 =
  /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/;
if (!hostnameRFC1123.test(HOSTNAME))
  log.red(
    `Invalid HOSTNAME. Only include the the hostname, e.g. domain.com or sub.domain.com, not the other URL elements, e.g. http://`
  );
