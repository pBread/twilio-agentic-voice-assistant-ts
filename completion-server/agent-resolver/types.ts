import type { LLMConfig, ToolResponse, ToolSpec } from "../../agent/types.js";

/**
 * Interface defining the core functionality of an Agent Runtime
 * @template TTools - The type of tools the agent can use
 * @template TConfig - The configuration type for the LLM
 */
export interface IAgentResolver {
  getInstructions(): string;
  getLLMConfig(): LLMConfig;
  getTools(): ToolSpec[];

  setTool(name: string, tool: ToolSpec): void;

  executeTool(
    turnId: string,
    toolName: string,
    args: any,
  ): Promise<ToolResponse>;

  queueFillerPhrase(turnId: string, toolName: string, args?: object): void;
}

export interface AgentResolverConfig {
  fillerPhrases: { primary: string[]; seconary: string[] };
  instructions: string;
  llmConfig: LLMConfig;
  toolManifest: ToolSpec[];
}
