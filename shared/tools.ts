import type { z } from "zod";
import type { SessionStore } from "../completion-server/session-store";
import type { IAgentRuntime } from "../completion-server/agent-runtime/types";
import { ConversationRelayAdapter } from "../completion-server/twilio/conversation-relay-adapter";

export type ToolDefinition<T extends z.ZodObject<any> = any> =
  | FunctionTool<T>
  | RequestTool<T>;

interface BaseTool {
  name: string;
  description?: string;
  parameters?: z.ZodObject<any>;
}

// a tool that will execute a specific function when called
export interface FunctionTool<TParams extends z.ZodObject<any> = any>
  extends BaseTool {
  type: "function";
  parameters?: TParams;
  execute: (args: z.infer<TParams>, deps: ToolDependencies) => Promise<any>;
}

// a tool that will make an API request
// todo: extend with different methods & content-types
// todo: allow parameter mapping, i.e. path, body, query, header
export interface RequestTool<TParams extends z.ZodObject<any> = any>
  extends BaseTool {
  type: "request";
  endpoint: { url: string; method: "POST"; contentType: "json" };
  parameters?: TParams;
}

export interface ToolDependencies {
  agent: IAgentRuntime;
  relay: ConversationRelayAdapter;
  store: SessionStore;
}
