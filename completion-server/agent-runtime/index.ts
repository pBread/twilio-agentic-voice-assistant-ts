import log from "../../lib/logger";
import type { RequestTool, ToolDefinition } from "../../shared/tools";
import type { ContextStore, TurnStore } from "../session-store";
import type {
  AgentRuntimeParams,
  IAgentRuntime,
  LLMConfig,
  ToolResponse,
} from "./types";

export class AgentRuntime implements IAgentRuntime {
  constructor(
    protected readonly store: { context: ContextStore; turns: TurnStore },
    protected readonly config: LLMConfig,
    public params: AgentRuntimeParams
  ) {
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
    return [...this.toolMap.values()].filter(
      (tool) => tool.name !== "getUserProfile"
    );
  };

  executeTool = async (
    toolName: string,
    args: string
  ): Promise<ToolResponse> => {
    const tool = this.toolMap.get(toolName);
    const isToolAvailable = this.getToolManifest().some(
      (tool) => toolName === tool.name
    );

    if (!tool) {
      log.warn(
        "agent",
        `LLM attempted to execute a tool (${toolName}) that does not exist.`
      );
      return { status: "error", error: `Tool ${toolName} does not exist.` };
    }

    if (!isToolAvailable) {
      log.warn(
        "agent",
        `LLM attempted to execute a tool (${toolName}) that it is not authorized to use.`
      );
      return {
        status: "error",
        error: `Tool ${toolName} exists, but it has not been authorized to be executed.`,
      };
    }

    return { status: "error", error: "unknown" };
  };
}

async function executeRequestTool(tool: RequestTool, args?: string) {
  return fetch(tool.endpoint.url, {
    method: tool.endpoint.method,
    body: args,
  })
    .then((res) => ({ status: "success", data: res.json() }))
    .catch((error) => ({ status: "error", error }));
}
