import "dotenv-flow/config";
import log from "./logger";

// Validate and export environment variables
const validatedEnv = validateEnvVariables();

export const {
  HOSTNAME,
  OPENAI_API_KEY,
  TWILIO_ACCOUNT_SID,
  TWILIO_API_KEY,
  TWILIO_API_SECRET,
} = validatedEnv;

// Optional variables
export const PORT = process.env.PORT as string;

function validateEnvVariables() {
  const errors: string[] = [];

  // Define required variables and their validation
  const requiredVars = {
    HOSTNAME: process.env.HOSTNAME,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_API_KEY: process.env.TWILIO_API_KEY,
    TWILIO_API_SECRET: process.env.TWILIO_API_SECRET,
  } as const;

  // Check for missing required variables
  Object.entries(requiredVars).forEach(([key, value]) => {
    if (!value) {
      const errorMsg = `Missing environment variable ${key}`;
      log.red(errorMsg);
      errors.push(errorMsg);
    }
  });

  // Special validation for HOSTNAME
  if (requiredVars.HOSTNAME && !isValidHostname(requiredVars.HOSTNAME)) {
    const errorMsg = `Invalid HOSTNAME. Only include the hostname, e.g. domain.com or sub.domain.com, not the other URL elements, e.g. http://`;
    log.warn(errorMsg);
  }

  // Throw combined error if any validation failed
  if (errors.length > 0)
    throw new Error(
      `Environment validation failed with the following errors:\n${errors
        .map((err, idx) => `\t(${idx + 1}) ${err}`)
        .join("\n")}`
    );

  // Export validated variables
  return requiredVars;
}

// Helper function to validate hostname using RFC-1123
function isValidHostname(hostname: string): boolean {
  return /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-zA-z0-9\-]*[A-Za-z0-9])$/.test(
    hostname
  );
}
