import type { LLMConfig, ToolResponse, ToolSpec } from "../../agent/types.js";

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

export interface AgentResolverConfig {
  llmConfig: LLMConfig;
  instructionsTemplate: string;
  toolManifest: ToolSpec<any>[];
}
