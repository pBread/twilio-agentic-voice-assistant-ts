import { getToolExecutor } from "../../agent/tools/index.js";
import { executeRequestTool } from "../../agent/tools/request.js";
import type { LLMConfig, ToolResponse, ToolSpec } from "../../agent/types.js";
import { getMakeLogger, StopwatchLogger } from "../../lib/logger.js";
import { chunkIntoSentences } from "../../lib/strings.js";
import { interpolateTemplate } from "../../lib/template.js";
import { BotToolTurn } from "../../shared/session/turns.js";
import type { SessionStore } from "../session-store/index.js";
import type { ConversationRelayAdapter } from "../twilio/conversation-relay-adapter.js";
import type { AgentResolverConfig, IAgentResolver } from "./types.js";

export class AgentResolver implements IAgentResolver {
  private log: StopwatchLogger;
  protected instructions?: string;
  protected llm?: LLMConfig;
  protected toolMap = new Map<string, ToolSpec>();
  protected fillerPhrases: { primary: string[]; secondary: string[] } = {
    primary: [],
    secondary: [],
  };

  constructor(
    private relay: ConversationRelayAdapter,
    private store: SessionStore,
    config?: Partial<AgentResolverConfig>,
  ) {
    this.log = getMakeLogger(store.callSid);
    if (config) this.configure(config);
  }

  configure = (config: Partial<AgentResolverConfig>) => {
    const { instructions, fillerPhrases, llmConfig, toolManifest } = config;
    this.instructions = instructions ?? this.instructions;
    this.llm = llmConfig ?? this.llm;
    if (toolManifest)
      for (const tool of toolManifest) this.setTool(tool.name, tool);
    this.fillerPhrases = { ...this.fillerPhrases, ...fillerPhrases };
  };

  /****************************************************
   Intstructions
  ****************************************************/
  getInstructions = (): string => {
    this.assertReady();
    return interpolateTemplate(this.instructions, this.store.context);
  };

  /****************************************************
   LLM Configuration
  ****************************************************/
  getLLMConfig = (): LLMConfig => {
    this.assertReady();
    return this.llm;
  };

  /****************************************************
   Tools
  ****************************************************/
  getTools = (): ToolSpec[] => {
    this.assertReady();
    return [...this.toolMap.values()];
  };

  setTool = (name: string, tool: ToolSpec) => {
    if (this.toolMap.has(tool.name))
      this.log.warn("resolver", `overriding tool ${tool.name}`);
    this.toolMap.set(name, tool);
  };

  executeTool = async (
    turnId: string,
    toolName: string,
    args?: object,
  ): Promise<ToolResponse> => {
    const tool = this.toolMap.get(toolName);
    if (!tool) {
      const error = `Attempted to execute a tool (${toolName}) that does not exist.`;
      this.log.warn("agent", error);
      return { status: "error", error };
    }

    // Tools can be restricted from the bot's manifest. The bot may believe the tool exists if it previously executed it or if the system instructions reference a tool not in the tool-manifest.
    const isToolAvailable = this.getTools().some(
      (tool) => toolName === tool.name,
    );

    if (!isToolAvailable) {
      const error = `Attempted to execute a tool (${toolName}) that is not authorized.`;
      this.log.warn("agent", error);
      return { status: "error", error };
    }

    const cancelFillerPhrase = this.makeFillerPhraseTimer(turnId, tool, args);

    const resultPromise = await this.executeToolHandler(tool, args);

    cancelFillerPhrase();
    return resultPromise;
  };

  private executeToolHandler = async (
    tool: ToolSpec,
    args: any,
  ): Promise<ToolResponse> => {
    if (tool.type === "request") {
      try {
        return {
          status: "complete",
          result: await executeRequestTool(tool, args),
        };
      } catch (error) {
        return { status: "error", error: `${error}` };
      }
    }

    if (tool.type === "function") {
      const exec = getToolExecutor(tool.name);
      if (!exec) {
        const error = `No executor found for ${tool.name}`;
        this.log.error("resolver", error);
        return { status: "error", error };
      }

      try {
        return {
          status: "complete",
          result: await exec(args, {
            agent: this,
            relay: this.relay,
            store: this.store,
          }),
        };
      } catch (error) {
        return { status: "error", error: `${error}` };
      }
    }

    return { status: "error", error: "Unknown tool type" };
  };

  private makeFillerPhraseTimer = (
    turnId: string,
    tool: ToolSpec,
    args: object = {},
  ) => {
    const primary = setTimeout(() => {
      const turn = this.store.turns.get(turnId) as BotToolTurn | undefined;
      if (turn?.status === "interrupted") return;

      const phrases = tool?.fillers?.length // use the tools filler phrases if they are defined
        ? tool.fillers
        : this.fillerPhrases?.primary?.length
          ? this.fillerPhrases.primary
          : [];

      const bestPhrase = this.pickLeastUsedPhrase(phrases);
      this.sayPhrase(bestPhrase, args);
    }, 500);

    const secondary = setTimeout(() => {
      const turn = this.store.turns.get(turnId) as BotToolTurn | undefined;
      if (turn?.status === "interrupted") return;

      const phrases = this.fillerPhrases?.secondary ?? [];
      const bestPhrase = this.pickLeastUsedPhrase(phrases);
      this.sayPhrase(bestPhrase, args);
    }, 4000);

    return () => {
      clearTimeout(primary);
      clearTimeout(secondary);
    };
  };

  private phraseCounters: { [key: string]: number } = {};
  private pickLeastUsedPhrase = (phrases: string[]) => {
    if (!phrases.length) return;

    const minUsage = Math.min(
      ...phrases.map((phrase) => this.phraseCounters[phrase] ?? 0),
    );

    const leastUsedPhrases = phrases.filter(
      (phrase) => (this.phraseCounters[phrase] ?? 0) === minUsage,
    );
    const selected =
      leastUsedPhrases[Math.floor(Math.random() * leastUsedPhrases.length)];
    this.phraseCounters[selected] = (this.phraseCounters[selected] ?? 0) + 1;

    return selected;
  };

  private sayPhrase = (template?: string, args: object = {}) => {
    if (!template?.length) return;
    const phrase = interpolateTemplate(template, {
      ...this.store.context,
      args, // inject the args so the filler phrase can reference them
    });

    const sentences = chunkIntoSentences(phrase); // send in chunks to make interruptions more accurate
    sentences.forEach((sentence, idx) =>
      this.relay.sendTextToken(sentence, idx + 1 === sentences.length),
    );
    this.store.turns.addBotText({
      content: phrase,
      origin: "filler",
      status: "complete",
    });
    this.log.info("agent.filler", `"${phrase.trim()}"`);
  };

  /****************************************************
   Misc Utilities
  ****************************************************/
  private assertReady: () => asserts this is this & {
    instructions: string;
    llm: LLMConfig;
  } = () => {
    if (!this.instructions || !this.llm) {
      const msg = `Agent params or config are not defined. Check your initialization of the AgentResolver to ensure the parameters & model config are set before any class methods are executed.`;
      this.log.error("resolver", msg, {
        instructions: this.instructions,
        llm: this.llm,
        toolManifest: this.toolMap.values(),
      });
      throw new Error(msg);
    }
  };
}
