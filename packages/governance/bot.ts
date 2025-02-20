import { readFileSync } from "fs";
import OpenAI from "openai";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import type { AgentResolver } from "../../completion-server/agent-resolver/index.js";
import type { SessionStore } from "../../completion-server/session-store/index.js";
import { getMakeLogger } from "../../lib/logger.js";
import { OPENAI_API_KEY } from "../../shared/env.js";

const __dirname = dirname(fileURLToPath(import.meta.url)); // this directory

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

interface GovernanceServiceConfig {
  frequency: number;
}

export class GovernanceService {
  log: ReturnType<typeof getMakeLogger>;
  constructor(
    private store: SessionStore,
    private agent: AgentResolver,
    private config: GovernanceServiceConfig,
  ) {
    this.log = getMakeLogger(store.callSid);
    this.instructions = this.readInstructions();
  }

  instructions: string;

  private timeout: NodeJS.Timeout | undefined;
  start = () => {
    if (this.timeout) throw Error("The Governance loop is already started.");
    this.timeout = setInterval(this.executeGovernance, this.config.frequency);
  };

  stop = () => clearInterval(this.timeout);

  executeGovernance = async () => {};

  readInstructions = (): string => {
    try {
      return readFileSync(join(__dirname, "instructions.md"), "utf-8");
    } catch (error) {
      this.log.error("governance", "Unable to read instructions", error);
      throw error;
    }
  };
}
