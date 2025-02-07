import "dotenv-flow/config"; // supports multiple environments, e.g. .env, .env.local

export const HOSTNAME = process.env.HOSTNAME as string;
export const PORT = process.env.PORT as string;

/****************************************************
 Validation Checks
****************************************************/
if (!HOSTNAME) console.error(`Missing env var HOSTNAME`);
const hostReg =
  /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;
if (!hostReg.test(HOSTNAME))
  console.error(
    `Invalid HOSTNAME. Only include the the hostname, e.g. domain.com or sub.domain.com, not the other URL elements, e.g. http://`
  );
