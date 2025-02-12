import "dotenv-flow/config";
import log from "./logger";

// Validate and export environment variables

const required = {
  HOSTNAME: process.env.HOSTNAME,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_API_KEY: process.env.TWILIO_API_KEY,
  TWILIO_API_SECRET: process.env.TWILIO_API_SECRET,
} as const;

const validatedEnv = validateEnvVariables();

export const {
  HOSTNAME,
  OPENAI_API_KEY,
  TWILIO_ACCOUNT_SID,
  TWILIO_API_KEY,
  TWILIO_API_SECRET,
} = validatedEnv;

// Optional, but include warnings
export const DEFAULT_TWILIO_NUMBER = process.env.DEFAULT_TWILIO_NUMBER;
if (!DEFAULT_TWILIO_NUMBER)
  log.yellow(`(warning) Missing environment variable DEFAULT_TWILIO_NUMBER`);

// Optional
export const PORT = process.env.PORT ?? "3333";

function validateEnvVariables() {
  const errors: string[] = [];

  // Check for missing required variables
  Object.entries(required).forEach(([key, value]) => {
    if (!value) {
      const errorMsg = `Missing environment variable ${key}`;
      log.red(errorMsg);
      errors.push(errorMsg);
    }
  });

  // Special validation for HOSTNAME
  if (required.HOSTNAME && !isValidHostname(required.HOSTNAME)) {
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
  return required;
}

// Helper function to validate hostname using RFC-1123
function isValidHostname(hostname: string): boolean {
  return /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-zA-z0-9\-]*[A-Za-z0-9])$/.test(
    hostname
  );
}
