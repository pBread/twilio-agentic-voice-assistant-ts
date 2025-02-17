import type { z } from "zod";
import type { IAgentResolver } from "../completion-server/agent-resolver/types.js";
import type { SessionStore } from "../completion-server/session-store/index.js";
import type { ConversationRelayAdapter } from "../completion-server/twilio/conversation-relay-adapter.js";

/****************************************************
 LLM Config
****************************************************/
export interface LLMConfig {
  model: string;
}

/****************************************************
 Procedures
****************************************************/
export interface Procedure {
  id: string;
  description: string;
  steps?: Step[];
}

export interface Step {
  id: string;
  description: string; // a description of the purpose of this step
  strictness: StrictLevel; // the degree to which this step is required for
  completionCriteria: string; // criteria to determine whether this step has been completed
  conditions?: string; // conditions on when this step should or should not be taken
  instructions?: string; // notes on how to conduct this step
}

type StrictLevel =
  | "conditional" // refer to the 'conditions' property to determine if the step is relevant
  | "recommended" // should be attempted but prioritize a smooth customer experience
  | "required" // only skip this step if it is absolutely neccessary
  | "critical"; // never ever ever skip steps marked critical

/****************************************************
 Tool Definitions
****************************************************/
export type ToolSpec<T extends z.ZodObject<any> = any> =
  | FunctionToolSpec<T>
  | RequestToolSpec<T>;

export interface FunctionToolSpec<TParams extends z.ZodObject<any> = any> {
  type: "function";
  name: string;
  description?: string;
  parameters: TParams;
}

export type ToolExecutor<TParams extends z.ZodObject<any> = any> = (
  args: TParams,
  deps: ToolDependencies,
) => Promise<any> | any;

// a tool that will make an API request
// todo: extend with different methods & content-types
// todo: allow parameter mapping, i.e. path, body, query, header

export interface RequestToolSpec<TParams extends z.ZodObject<any> = any> {
  type: "request";
  name: string;
  description?: string;

  endpoint: { url: string; method: "POST"; contentType: "json" };
  parameters: TParams;
}

export interface ToolDependencies {
  agent: IAgentResolver;
  relay: ConversationRelayAdapter;
  store: SessionStore;
}

export type ToolResponse =
  | { status: "complete"; result?: object }
  | { status: "error"; error: string };
