import { ToolDefinition } from "../../shared/tools";

/**
 * Interface defining the core functionality of an Agent Runtime
 * @template TTools - The type of tools the agent can use
 * @template TConfig - The configuration type for the LLM
 */
export interface IAgentRuntime {
  getInstructions(): string;
  getLLMConfig(): LLMConfig;
  getToolManifest(): ToolDefinition<any>[];

  executeTool(toolName: string, args: any): Promise<ToolResponse>;
}

export type ToolResponse =
  | { status: "success"; result?: object }
  | { status: "error"; error: string };

export interface AgentRuntimeParams {
  instructionTemplate: string;
  tools: ToolDefinition<any>[];
}

export interface LLMConfig {
  model: string;
}
