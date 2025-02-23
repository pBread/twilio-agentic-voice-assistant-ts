import * as dotenv from "dotenv-flow";

/****************************************************
 Logger
****************************************************/
export const sLog = {
  info: (...args: any[]) =>
    console.log("\x1b[0m" + pad("[INFO]"), ...args, "\x1b[0m"),

  success: (...args: any[]) =>
    console.log("\x1b[32m" + pad("[SUCCESS]"), ...args, "\x1b[0m"),

  error: (...args: any[]) =>
    console.error("\x1b[31m" + pad("[ERROR]"), ...args, "\x1b[0m"),

  warn: (...args: any[]) =>
    console.warn("\x1b[33m" + pad("[WARNING]"), ...args, "\x1b[0m"),
};

function pad(str: string) {
  return str.padEnd(10, " ");
}

/****************************************************
 Env Vars
****************************************************/
export class EnvManager {
  vars: EnvVars;
  constructor(private envPath: string, envVars: Partial<EnvVars> = {}) {
    this.vars = { ...makeEnv(dotenv.parse(envPath)), ...envVars };
    sLog.info(`EnvManager constructor ${envPath}`, this.vars);
  }

  save = () => {};
}

function makeEnv(envVars: dotenv.DotenvFlowParseResult): EnvVars {
  return {
    HOSTNAME: envVars.HOSTNAME,

    TWILIO_ACCOUNT_SID: envVars.TWILIO_ACCOUNT_SID,

    TWILIO_AUTH_TOKEN: envVars.TWILIO_AUTH_TOKEN,

    OPENAI_API_KEY: envVars.OPENAI_API_KEY,

    TWILIO_API_KEY: envVars.TWILIO_API_KEY,
    TWILIO_API_SECRET: envVars.TWILIO_API_SECRET,

    TWILIO_SYNC_SVC_SID: envVars.TWILIO_SYNC_SVC_SID,

    DEFAULT_TWILIO_NUMBER: envVars.DEFAULT_TWILIO_NUMBER,

    FLEX_WORKFLOW_SID: envVars.FLEX_WORKFLOW_SID,
    ENABLE_TRANSFER_TO_FLEX: bool(envVars.ENABLE_TRANSFER_TO_FLEX),

    FLEX_WORKSPACE_SID: envVars.FLEX_WORKSPACE_SID,
    FLEX_QUEUE_SID: envVars.FLEX_QUEUE_SID,
    FLEX_WORKER_SID: envVars.FLEX_WORKER_SID,
    ENABLE_ASK_FLEX_AGENT_QUESTIONS: bool(
      envVars.ENABLE_ASK_FLEX_AGENT_QUESTIONS,
    ),

    TWILIO_CONVERSATIONS_SVC_SID: envVars.TWILIO_CONVERSATIONS_SVC_SID,

    DEVELOPERS_PHONE_NUMBER: envVars.DEVELOPERS_PHONE_NUMBER,
    DEVELOPERS_FIRST_NAME: envVars.DEVELOPERS_FIRST_NAME,
    DEVELOPERS_LAST_NAME: envVars.DEVELOPERS_LAST_NAME,
  };
}

function bool(value: string | undefined) {
  if (!value) return false;
  return /true/i.test(value);
}

interface EnvVars {
  HOSTNAME: string | undefined;

  TWILIO_ACCOUNT_SID: string | undefined;

  TWILIO_AUTH_TOKEN: string | undefined;

  OPENAI_API_KEY: string | undefined;

  TWILIO_API_KEY: string | undefined;
  TWILIO_API_SECRET: string | undefined;

  TWILIO_SYNC_SVC_SID: string | undefined;

  DEFAULT_TWILIO_NUMBER: string | undefined;

  FLEX_WORKFLOW_SID: string | undefined;
  ENABLE_TRANSFER_TO_FLEX: boolean | undefined;

  FLEX_WORKSPACE_SID: string | undefined;
  FLEX_QUEUE_SID: string | undefined;
  FLEX_WORKER_SID: string | undefined;
  ENABLE_ASK_FLEX_AGENT_QUESTIONS: boolean | undefined;

  TWILIO_CONVERSATIONS_SVC_SID: string | undefined;

  DEVELOPERS_PHONE_NUMBER: string | undefined;
  DEVELOPERS_FIRST_NAME: string | undefined;
  DEVELOPERS_LAST_NAME: string | undefined;
}
