import type {
  LLMConfig,
  ToolDefinition,
  ToolResponse,
} from "../../agent/types.js";

/**
 * Interface defining the core functionality of an Agent Runtime
 */
export interface IAgentResolver {
  getInstructions(): string;
  getLLMConfig(): LLMConfig;
  getTools(): ToolDefinition[];

  setTool(name: string, tool: ToolDefinition): void;

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
  toolManifest: ToolDefinition[];
}
