import type { ChatCompletionTool } from "openai/resources";
import { OpenAIStreamingConfig } from "../../services/llm-service";
import type { ContextStore, TurnStore } from "../../services/session-manager";
import { AgentRuntimeAbstract } from "../agent-runtime";

export class ConsciousAgentRuntime extends AgentRuntimeAbstract<
  ChatCompletionTool[],
  OpenAIStreamingConfig,
  ConsciousLLMParams
> {
  constructor(
    protected readonly store: { context: ContextStore; turns: TurnStore },
    protected readonly config: OpenAIStreamingConfig,
    public params: ConsciousLLMParams
  ) {
    super(store, config, params);
  }

  getInstructions = (): string => {
    return this.params.instructionTemplate;
  };

  getLLMConfig = (): OpenAIStreamingConfig => {
    return this.config;
  };

  getToolManifest = (): ChatCompletionTool[] => {
    return this.params.tools;
  };
}

export interface ConsciousLLMParams {
  instructionTemplate: string;
  tools: ChatCompletionTool[];
}
