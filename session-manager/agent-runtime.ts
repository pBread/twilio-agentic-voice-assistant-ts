import { ContextStore } from "./context-store";
import { TurnStore } from "./turn-store";

export class AgentRuntime {
  private config: LLMConfig;
  private instructions: string;
  private tools: ToolManifestItem[];

  private middleware: AgentMiddleware[];

  constructor(
    opts: AgentConfiguration,
    private store: { context: ContextStore; turns: TurnStore }
  ) {
    this.config = opts.config;
    this.instructions = opts.instructions;
    this.tools = opts.tools;
    this.middleware = opts.middleware;
  }

  private executeMiddleware(): AgentMiddlewareParams {
    const initialParams: AgentMiddlewareParams = {
      instructions: this.instructions,
      tools: this.tools,
      config: this.config,
    };

    return this.middleware.reduce((params, middleware) => {
      const updates = middleware(this.store, params);
      return { ...params, ...updates };
    }, initialParams);
  }

  getConfig(): LLMConfig {
    const { config } = this.executeMiddleware();
    return config;
  }

  getSystemInstructions(): string {
    const { instructions } = this.executeMiddleware();
    return instructions;
  }

  getTools(): ToolManifestItem[] {
    const { tools } = this.executeMiddleware();
    return tools;
  }
}

export interface AgentConfiguration {
  config: LLMConfig;
  instructions: string;
  tools: ToolManifestItem[];

  middleware: AgentMiddleware[];
}

export type AgentMiddleware = (
  store: { context: ContextStore; turns: TurnStore },
  params: AgentMiddlewareParams
) => Partial<AgentMiddlewareParams>;

interface AgentMiddlewareParams {
  config: LLMConfig;
  instructions: string;
  tools: ToolManifestItem[];
}

interface LLMConfig {}

interface ToolManifestItem {}
