/**
 * Interface defining the core functionality of an Agent Runtime
 * @template TTools - The type of tools the agent can use
 * @template TConfig - The configuration type for the LLM
 */
export interface AgentRuntime<TTools extends {}, TConfig extends {} = {}> {
  getInstructions(): string;
  getLLMConfig(): TConfig;
  getToolManifest(): TTools;
}
