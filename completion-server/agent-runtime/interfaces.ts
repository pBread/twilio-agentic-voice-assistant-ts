import { ChatCompletionTool } from "openai/resources";

/**
 * Interface defining the core functionality of an Agent Runtime
 * @template TTools - The type of tools the agent can use
 * @template TConfig - The configuration type for the LLM
 */
export interface IAgentRuntime<TTools extends {}, TConfig extends {} = {}> {
  getInstructions(): string;
  getLLMConfig(): TConfig;
  getToolManifest(): TTools;
}

export interface AgentRuntimeParams {
  instructionTemplate: string;
  tools: ChatCompletionTool[]; // todo: replace this with the Open API (not Open AI) format
}
