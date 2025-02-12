import { ChatCompletionTool } from "openai/resources";
import { OpenAIConfig } from "../conscious-loop/openai";
import { ContextStore, TurnStore } from "../session-manager";
import type { AgentRuntimeParams, IAgentRuntime } from "./interfaces";

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
