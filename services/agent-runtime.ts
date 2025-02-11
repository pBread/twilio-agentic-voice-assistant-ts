import { ContextStore } from "./session-manager/context-store";
import { TurnStore } from "./session-manager/turn-store";

export class AgentRuntime {
  private config: LLMConfig;
  private instructions: string;
  private tools: ToolManifestItem[];

  private resolvers: AgentResolver[];

  constructor(
    opts: AgentConfiguration,
    private store: { context: ContextStore; turns: TurnStore }
  ) {
    this.config = opts.config;
    this.instructions = opts.instructions;
    this.tools = opts.tools;
    this.resolvers = opts.resolvers;
  }

  private applyResolvers(): AgentResolverParams {
    const initialParams: AgentResolverParams = {
      instructions: this.instructions,
      tools: this.tools,
      config: this.config,
    };

    return this.resolvers.reduce((params, resolver) => {
      const updates = resolver(this.store, params);
      return { ...params, ...updates };
    }, initialParams);
  }

  getConfig(): LLMConfig {
    const { config } = this.applyResolvers();
    return config;
  }

  getSystemInstructions(): string {
    const { instructions } = this.applyResolvers();
    return instructions;
  }

  getTools(): ToolManifestItem[] {
    const { tools } = this.applyResolvers();
    return tools;
  }
}

export interface AgentConfiguration {
  config: LLMConfig;
  instructions: string;
  tools: ToolManifestItem[];

  resolvers: AgentResolver[];
}

export type AgentResolver = (
  store: { context: ContextStore; turns: TurnStore },
  params: AgentResolverParams
) => Partial<AgentResolverParams>;

interface AgentResolverParams {
  config: LLMConfig;
  instructions: string;
  tools: ToolManifestItem[];
}

interface LLMConfig {}

interface ToolManifestItem {}
