import type { ToolDefinition } from "../../shared/tools";
import type { ContextStore, TurnStore } from "../session-store";
import type { AgentRuntimeParams, IAgentRuntime, LLMConfig } from "./types";

export class AgentRuntime implements IAgentRuntime {
  constructor(
    protected readonly store: { context: ContextStore; turns: TurnStore },
    protected readonly config: LLMConfig,
    public params: AgentRuntimeParams
  ) {}

  getInstructions = (): string => {
    return this.params.instructionTemplate;
  };

  getLLMConfig = (): LLMConfig => {
    return this.config;
  };

  getToolManifest(): ToolDefinition<any>[] {
    return this.params.tools;
  }
}
