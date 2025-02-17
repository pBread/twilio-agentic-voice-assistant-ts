import type { ToolSpec } from "../../agents/tools.js";

/**
 * Interface defining the core functionality of an Agent Runtime
 * @template TTools - The type of tools the agent can use
 * @template TConfig - The configuration type for the LLM
 */
export interface IAgentResolver {
  getInstructions(): string;
  getLLMConfig(): LLMConfig;
  getToolManifest(): ToolSpec<any>[];

  executeTool(toolName: string, args: any): Promise<ToolResponse>;
}

export type ToolResponse =
  | { status: "success"; result?: object }
  | { status: "error"; error: string };

export interface AgentResolverConfig {
  llmConfig: LLMConfig;
  instructionsTemplate: string;
  toolManifest: ToolSpec<any>[];
}

export interface LLMConfig {
  model: string;
}
