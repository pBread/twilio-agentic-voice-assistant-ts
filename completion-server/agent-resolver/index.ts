import { getMakeLogger, type StopwatchLogger } from "../../lib/logger.js";
import type { RequestTool, ToolDefinition } from "../../shared/agent-tools.js";
import type { SessionStore } from "../session-store/index.js";
import type { ConversationRelayAdapter } from "../twilio/conversation-relay-adapter.js";
import type {
  AgentResolverParams,
  IAgentResolver,
  LLMConfig,
  ToolResponse,
} from "./types.js";

export class AgentResolver implements IAgentResolver {
  private log: StopwatchLogger;
  constructor(
    protected readonly relay: ConversationRelayAdapter,
    protected readonly store: SessionStore,
    protected readonly config: LLMConfig,
    public params: AgentResolverParams,
  ) {
    this.log = getMakeLogger(store.callSid);
    this.toolMap = new Map(params.tools.map((tool) => [tool.name, tool]));
  }

  // instructions
  getInstructions = (): string => {
    return this.params.instructionTemplate;
  };

  // config
  getLLMConfig = (): LLMConfig => {
    return this.config;
  };

  // tools
  toolMap: Map<string, ToolDefinition>;
  getToolManifest = (): ToolDefinition<any>[] => {
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
