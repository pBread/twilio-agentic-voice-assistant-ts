import { readFileSync } from "fs";
import OpenAI from "openai";
import type { ChatCompletion } from "openai/resources/index.mjs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import type { AgentResolver } from "../../completion-server/agent-resolver/index.js";
import type { SessionStore } from "../../completion-server/session-store/index.js";
import { getMakeLogger } from "../../lib/logger.js";
import { interpolateTemplate } from "../../lib/template.js";
import { OPENAI_API_KEY } from "../../shared/env.js";
import type { CallSummary } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url)); // this directory

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const instructionsTemplate = readFileSync(
  join(__dirname, "instructions.md"),
  "utf-8",
);

interface SummarizationServiceConfig {
  frequency: number;
}

export class SummarizationService {
  log: ReturnType<typeof getMakeLogger>;
  constructor(
    private store: SessionStore,
    private agent: AgentResolver,
    private config: SummarizationServiceConfig,
  ) {
    this.log = getMakeLogger(store.callSid);
  }

  private timeout: NodeJS.Timeout | undefined;
  start = () => {
    if (this.timeout) throw Error("The Summary loop is already started.");
    this.timeout = setInterval(this.execute, this.config.frequency);
  };

  stop = () => clearInterval(this.timeout);

  execute = async () => {
    const transcript = this.getTranscript();
    const instructions = interpolateTemplate(instructionsTemplate, {
      ...this.store.context,
      transcript,
    });

    let completion: ChatCompletion;
    try {
      completion = await openai.chat.completions.create({
        model: this.agent.getLLMConfig().model,
        messages: [{ role: "user", content: instructions }],
        response_format: { type: "json_object" },
        stream: false,
      });
    } catch (error) {
      this.log.error(
        "summary-bot",
        "Summary Bot competion request failed",
        error,
      );
      return;
    }

    const choice = completion.choices[0];
    const content = choice.message.content;
    if (!content) {
      const msg = "Summary Bot returned no content from completion";
      this.log.error(msg);
      return;
    }

    if (choice.finish_reason === "tool_calls" && choice.message.tool_calls) {
      const msg =
        "Summary Bot has no tools but LLM is attempting to execute fns";
      this.log.error(msg);
      return;
    }

    if (choice.finish_reason === "stop") {
      let result: CallSummary;
      try {
        result = JSON.parse(content) as CallSummary;
        if (typeof result !== "object") throw "";
      } catch (error) {
        this.log.error(
          "summary-bot",
          "execute LLM responded with a non-JSON format",
          content,
        );
        return;
      }

      const prev = this.store.context?.summary ?? ({} as CallSummary);

      const summary: CallSummary = {
        ...prev,
        topics: [...new Set([...(prev?.topics ?? []), ...result.topics])],
      };

      this.store.setContext({ summary });
    }
  };

  private getTranscript = () =>
    this.store.turns
      .list()
      .map((turn) => {
        if (turn.role === "bot") {
          if (turn.origin === "filler") return;
          if (turn.type === "tool") return;

          return `[${turn.role.toUpperCase()}]: ${turn.content}`;
        }

        if (turn.role === "human") {
          return `[${turn.role.toUpperCase()}]: ${turn.content}`;
        }

        if (turn.role === "system") {
          return false;
        }
      })
      .filter((line) => !!line)
      .join("\n\n");
}
