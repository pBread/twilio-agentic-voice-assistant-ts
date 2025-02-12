import type { ChatCompletionTool } from "openai/resources";
import { ConsciousLLMConfig } from "../../completion-server/llm-service";
import type {
  ContextStore,
  TurnStore,
} from "../../completion-server/session-manager";
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
    return this.params.instructionTemplate;
  };

  getLLMConfig = (): ConsciousLLMConfig => {
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
