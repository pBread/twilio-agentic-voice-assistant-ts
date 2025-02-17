import type { z } from "zod";
import type { IAgentResolver } from "../completion-server/agent-resolver/types.js";
import type { SessionStore } from "../completion-server/session-store/index.js";
import type { ConversationRelayAdapter } from "../completion-server/twilio/conversation-relay-adapter.js";

export type ToolSpec<T extends z.ZodObject<any> = any> =
  | FunctionToolSpec<T>
  | RequestToolSpec<T>;

interface BaseTool {
  name: string;
  description?: string;
  parameters?: z.ZodObject<any>;
}

// a tool that will execute a specific function when called
export interface FunctionToolSpec<TParams extends z.ZodObject<any> = any>
  extends BaseTool {
  type: "function";
  parameters?: TParams;
}

// a tool that will make an API request
// todo: extend with different methods & content-types
// todo: allow parameter mapping, i.e. path, body, query, header
export interface RequestToolSpec<TParams extends z.ZodObject<any> = any>
  extends BaseTool {
  type: "request";
  endpoint: { url: string; method: "POST"; contentType: "json" };
  parameters?: TParams;
}

export interface ToolDependencies {
  agent: IAgentResolver;
  relay: ConversationRelayAdapter;
  store: SessionStore;
}
