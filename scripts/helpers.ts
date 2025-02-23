import * as dotenv from "dotenv-flow";
import * as fsp from "fs/promises";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url)); // this directory

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
  filePath: string;
  id: string;
  constructor(private relPath: string, envVars: Partial<EnvVars> = {}) {
    this.id = Math.floor(Math.random() * 10 ** 8)
      .toString()
      .padStart(8, "0");

    this.filePath = path.join(__dirname, `../${relPath}`);
    this.vars = { ...makeEnv(dotenv.parse(this.filePath)), ...envVars };
    sLog.info(`EnvManager constructor ${relPath}`, this.vars);
  }

  getDiff = () => {
    const original = makeEnv(dotenv.parse(this.filePath));
    let changes: Record<
      string,
      { key: string; old: string | undefined | boolean; new: string }
    > = {};
    Object.entries(this.vars).forEach(([key, value]) => {
      const old = original[key as keyof EnvVars];
      if (old !== value) changes[key] = { old, new: value, key };
    });

    return changes;
  };

  save = async (): Promise<void> => {
    try {
      // Read existing content
      let content = await fsp.readFile(this.filePath, "utf-8");

      const updatedKeys = Object.keys(this.getDiff());
      if (!updatedKeys.length)
        return sLog.info(`no changes to ${this.relPath}`);

      sLog.info(
        `saving ${this.relPath}\t ${
          updatedKeys.length
        } var changed: ${updatedKeys.join(", ")}`,
      );

      // Ensure content ends with newline
      if (content && !content.endsWith("\n")) content += "\n";

      // Update each variable in the file
      for (const [key, value] of Object.entries(this.vars)) {
        if (value === undefined) continue;

        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`^${escapedKey}=.*$`, "m");

        // Format the value properly
        const stringValue =
          typeof value === "boolean" ? value.toString() : value;
        const formattedValue = stringValue.includes(" ")
          ? `"${stringValue}"`
          : stringValue;

        if (regex.test(content)) {
          // Replace existing entry
          content = content.replace(regex, `${key}=${formattedValue}`);
        } else {
          // Add new entry
          content =
            content.trimEnd() + "\n" + `${key}=${formattedValue}` + "\n";
        }
      }

      // Write back to file
      await fsp.writeFile(this.filePath, content);
      sLog.success(
        `saved ${this.relPath}\t ${
          updatedKeys.length
        } var changed: ${updatedKeys.join(", ")}`,
      );
    } catch (error) {
      sLog.error(`Failed to save environment file: ${this.relPath}`, error);
      throw error;
    }
  };
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

/****************************************************
 Helpers
****************************************************/
export function makeFriendlyName(env: EnvManager) {
  let name = env.vars.DEVELOPERS_FIRST_NAME ?? "demo";
  if (env.vars.DEVELOPERS_LAST_NAME) name += env.vars.DEVELOPERS_LAST_NAME[0];
  return `${name}-voice-bot-${env.id}`.toLowerCase();
}
