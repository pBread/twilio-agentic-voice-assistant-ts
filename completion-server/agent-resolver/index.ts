import result from "lodash.result";
import { getToolExecutor } from "../../agent/tools/index.js";
import type {
  LLMConfig,
  RequestToolSpec,
  ToolResponse,
  ToolSpec,
} from "../../agent/types.js";
import log, { getMakeLogger, type StopwatchLogger } from "../../lib/logger.js";
import type { SessionContext } from "../../shared/session/context.js";
import type { SessionStore } from "../session-store/index.js";
import type { ConversationRelayAdapter } from "../twilio/conversation-relay-adapter.js";
import type { AgentResolverConfig, IAgentResolver } from "./types.js";

export class AgentResolver implements IAgentResolver {
  private log: StopwatchLogger;

  public llmConfig?: LLMConfig; // must be set before the first method is called
  public instructionsTemplate?: string; // must be set before the first method is called
  private toolMap: Map<string, ToolSpec>; // tool manifest is stored in a map to avoid accidental conflicts

  constructor(
    private relay: ConversationRelayAdapter,
    private store: SessionStore,
    config?: Partial<AgentResolverConfig>,
  ) {
    this.log = getMakeLogger(store.callSid);
    this.toolMap = new Map();

    this.instructionsTemplate = config?.instructionsTemplate;
    this.llmConfig = config?.llmConfig;

    if (config?.toolManifest)
      config?.toolManifest.forEach((tool) => this.setTool(tool));
  }

  // note: configure() only adds tools to the manifest. To remove tools you must call removeTool
  configure = (config: Partial<AgentResolverConfig>) => {
    const configKeys = [
      "instructionsTemplate",
      "llmConfig",
      "toolManifest",
    ] as (keyof AgentResolverConfig)[];
    const keys = Object.keys(config)
      .filter((key) => configKeys.includes(key as keyof AgentResolverConfig))
      .join(", ");

    this.log.info("resolver", `configurating agent resolver: ${keys}`);

    const { instructionsTemplate, llmConfig, toolManifest } = config;
    this.instructionsTemplate =
      instructionsTemplate ?? this.instructionsTemplate;
    this.llmConfig = llmConfig ?? this.llmConfig;
    if (toolManifest) for (const tool of toolManifest) this.setTool(tool);
  };

  // instructions
  getInstructions = (): string => {
    this.assertReady();
    const instructions = injectContext(
      this.instructionsTemplate,
      this.store.context,
    );

    return instructions;
  };

  // config
  getLLMConfig = (): LLMConfig => {
    this.assertReady();
    return this.llmConfig;
  };

  // tools
  getToolManifest = (): ToolSpec<any>[] => {
    this.assertReady();
    return [...this.toolMap.values()];
  };

  removeTool = (toolName: string) => {
    this.log.info("resolver", `removing tool ${toolName}`);
    return this.toolMap.delete(toolName);
  };

  setTool = (tool: ToolSpec) => {
    if (this.toolMap.has(tool.name))
      this.log.info("resolver", `overriding tool ${tool.name}`);

    this.toolMap.set(tool.name, tool);
  };

  executeTool = async (
    toolName: string,
    args: string,
  ): Promise<ToolResponse> => {
    const tool = this.toolMap.get(toolName);
    if (!tool) {
      const error = `Attempted to execute a tool (${toolName}) that does not exist.`;
      this.log.warn("agent", error);
      return { status: "error", error };
    }

    log.debug(
      "resolver",
      "executeTool ",
      toolName,
      JSON.stringify({ tool, args }, null, 2),
    );

    // Tools can be removed from the bot's manifest. The bot may believe the tool exists if it previously executed it or if the system instructions reference a tool not in the tool-manifest.
    const isToolAvailable = this.getToolManifest().some(
      (tool) => toolName === tool.name,
    );
    if (!isToolAvailable) {
      const error = `Attempted to execute a tool (${toolName}) that is not authorized.`;
      this.log.warn("agent", error);
      return { status: "error", error };
    }

    if (tool.type === "request")
      return await executeRequestToolSpec(tool, args);

    if (tool.type === "function") {
      const executor = getToolExecutor(tool.name);
      if (!executor) {
        const error = `No executor found for ${tool.name}`;
        log.error("resolver", error);
        return { status: "error", error };
      }

      return await executor(args, {
        agent: this,
        relay: this.relay,
        store: this.store,
      });
    }

    return { status: "error", error: "unknown" };
  };

  /****************************************************
   Misc Utilities
  ****************************************************/
  private assertReady: () => asserts this is this & {
    instructionsTemplate: string;
    llmConfig: LLMConfig;
  } = () => {
    if (!this.instructionsTemplate || !this.llmConfig) {
      const msg = `Agent params or config are not defined. Check your initialization of the AgentResolver to ensure the parameters & model config are set before any class methods are executed.`;
      this.log.error("resolver", msg, {
        instructionsTemplate: this.instructionsTemplate,
        llmConfig: this.llmConfig,
        toolManifest: this.toolMap.values(),
      });
      throw new Error(msg);
    }
  };
}

// This is a generic tool that allows the bot to execute a
// todo: make this interchangable
async function executeRequestToolSpec(
  tool: RequestToolSpec,
  args?: string,
): Promise<ToolResponse> {
  return fetch(tool.endpoint.url, {
    method: tool.endpoint.method,
    body: args,
  })
    .then(
      async (res) =>
        ({
          status: "complete",
          data: await res.json(),
        }) as ToolResponse,
    )
    .catch((error) => ({ status: "error", error }));
}

export function injectContext(
  template: string,
  context: SessionContext,
): string {
  const templateRegex = /\{\{([^}]+)\}\}/g; // regex to match {{path.to.value}} patterns

  return template.replace(templateRegex, (match, path: string) => {
    const value = result(context, path);

    if (value === null || value === undefined) return "N/A";

    // Stringify objects to avoid [object Object]
    if (typeof value === "object") {
      try {
        return JSON.stringify(value, null, 2);
      } catch (e) {
        const msg = "Error injecting context into template";
        log.error("resolver", msg, "value: ", value);
        throw Error(msg);
      }
    }

    return String(value);
  });
}
