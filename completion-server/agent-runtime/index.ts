import type { ChatCompletionTool } from "openai/resources";
import type { OpenAIConfig } from "../conscious-loop/openai";
import type { ContextStore, TurnStore } from "../session-store";
import type { AgentRuntimeParams, IAgentRuntime } from "./types";

export class AgentRuntime
  implements IAgentRuntime<ChatCompletionTool[], OpenAIConfig>
{
  constructor(
    protected readonly store: { context: ContextStore; turns: TurnStore },
    protected readonly config: OpenAIConfig,
    public params: AgentRuntimeParams
  ) {}

  getInstructions = (): string => {
    return this.params.instructionTemplate;
  };

  getLLMConfig = (): OpenAIConfig => {
    return this.config;
  };

  getToolManifest = (): ChatCompletionTool[] => {
    return this.params.tools;
  };
}
