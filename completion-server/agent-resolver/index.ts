import type { RequestTool, ToolDefinition } from "../../agents/tools.js";
import { getMakeLogger, type StopwatchLogger } from "../../lib/logger.js";
import type { SessionStore } from "../session-store/index.js";
import type { ConversationRelayAdapter } from "../twilio/conversation-relay-adapter.js";
import type {
  AgentResolverConfig,
  IAgentResolver,
  LLMConfig,
  ToolResponse,
} from "./types.js";

export class AgentResolver implements IAgentResolver {
  private log: StopwatchLogger;

  // allows the app to check if the resolver configurations have been set properly
  private agentReadyResolver!: (value: true) => void;
  public agentReadyPromise: Promise<true>;
  public agentReady = false;

  constructor(
    protected readonly relay: ConversationRelayAdapter,
    protected readonly store: SessionStore,
    config?: Partial<AgentResolverConfig>,
  ) {
    this.agentReadyPromise = new Promise<true>((resolve) => {
      this.agentReadyResolver = resolve;
    });

    this.log = getMakeLogger(store.callSid);
    this.toolMap = new Map();

    this.instructionTemplate = config?.instructionTemplate;
    this.llmConfig = config?.llmConfig;

    if (config?.toolManifest)
      config?.toolManifest.forEach((tool) => this.toolMap.set(tool.name, tool));
  }

  public llmConfig?: LLMConfig; // must be set before the first method is called
  public instructionTemplate?: string; // must be set before the first method is called

  configure = (config: Partial<AgentResolverConfig>) => {
    this.log.info(
      "resolver",
      `configurating agent resolver: ${Object.keys(config).join(", ")}`,
    );

    if (config.instructionTemplate)
      this.instructionTemplate = config.instructionTemplate;
    if (config.llmConfig) this.llmConfig = config.llmConfig;
    if (config.toolManifest) {
      for (const tool of config.toolManifest) this.toolMap.set(tool.name, tool);
    }
  };

  // instructions
  getInstructions = (): string => {
    this.assertReady();

    return this.instructionTemplate;
  };

  // config
  getLLMConfig = (): LLMConfig => {
    this.assertReady();
    return this.llmConfig;
  };

  // tools
  toolMap: Map<string, ToolDefinition>;
  getToolManifest = (): ToolDefinition<any>[] => {
    this.assertReady();
    return [...this.toolMap.values()];
  };

  executeTool = async (
    toolName: string,
    args: string,
  ): Promise<ToolResponse> => {
    const tool = this.toolMap.get(toolName);
    if (!tool) {
      this.log.warn(
        "agent",
        `LLM attempted to execute a tool (${toolName}) that does not exist.`,
      );
      return { status: "error", error: `Tool ${toolName} does not exist.` };
    }

    // sometimes the bot will try to execute a tool it previously had executed even if the tool is no longer in the tool manifest.
    const isToolAvailable = this.getToolManifest().some(
      (tool) => toolName === tool.name,
    );
    if (!isToolAvailable) {
      this.log.warn(
        "agent",
        `LLM attempted to execute a tool (${toolName}) that it is not authorized to use.`,
      );
      return {
        status: "error",
        error: `Tool ${toolName} exists, but it has not been authorized to be executed.`,
      };
    }

    if (tool.type === "request") {
      const result = await executeRequestTool(tool, args);
      return result;
    }

    return { status: "error", error: "unknown" };
  };

  /****************************************************
   Misc Utilities
  ****************************************************/
  private assertReady: () => asserts this is this & {
    instructionTemplate: string;
    llmConfig: LLMConfig;
  } = () => {
    if (
      !this.instructionTemplate ||
      !this.llmConfig ||
      this.toolMap.size === 0
    ) {
      const msg = `Agent params or config are not defined. Check your initialization of the AgentResolver to ensure the parameters & model config are set before any class methods are executed.`;
      this.log.error("resolver", msg, {
        instructionTemplate: this.instructionTemplate,
        llmConfig: this.llmConfig,
        toolManifest: this.toolMap.values(),
      });
      throw new Error(msg);
    }

    if (!this.agentReady) return;

    this.agentReady = true;
    this.agentReadyResolver(true);
  };
}

async function executeRequestTool(
  tool: RequestTool,
  args?: string,
): Promise<ToolResponse> {
  return fetch(tool.endpoint.url, {
    method: tool.endpoint.method,
    body: args,
  })
    .then(
      async (res) =>
        ({
          status: "success",
          data: await res.json(),
        }) as ToolResponse,
    )
    .catch((error) => ({ status: "error", error }));
}
