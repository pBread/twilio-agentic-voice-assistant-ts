import type { ContextStore, TurnStore } from "../services/session-manager";

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

/**
 * Abstract base class for implementing Agent Runtimes
 * @template TTools - The type of tools the agent can use
 * @template TConfig - The configuration type for the LLM
 * @template TParams - Additional parameters type (optional)
 */
export abstract class AgentRuntimeAbstract<
  TTools extends {},
  TConfig extends {} = {},
  TParams extends {} = {}
> implements AgentRuntime<TTools, TConfig>
{
  abstract getInstructions(): string;
  abstract getLLMConfig(): TConfig;
  abstract getToolManifest(): TTools;

  constructor(store: Stores, config: TConfig, params?: TParams) {}
}

interface Stores {
  context: ContextStore;
  turns: TurnStore;
}
