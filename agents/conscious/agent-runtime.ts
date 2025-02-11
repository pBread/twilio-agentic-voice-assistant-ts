import type { ChatCompletionTool } from "openai/resources";
import type { ContextStore, TurnStore } from "../../services/session-manager";
import { AgentRuntimeAbstract } from "../agent-runtime";

export class ConsciousAgentRuntime extends AgentRuntimeAbstract<
  ChatCompletionTool[],
  ConsciousLLMConfig,
  ConsciousLLMParams
> {
  constructor(
    protected readonly store: { context: ContextStore; turns: TurnStore },
    protected readonly config: ConsciousLLMConfig,
    public params: ConsciousLLMParams
  ) {
    super(store, config, params);
  }

  getInstructions = (): string => {
    return "Yoko";
  };

  getLLMConfig = (): ConsciousLLMConfig => {
    return {};
  };

  getToolManifest = (): ChatCompletionTool[] => {
    return [];
  };
}

export interface ConsciousLLMConfig {}

export interface ConsciousLLMParams {}
