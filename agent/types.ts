import type { IAgentResolver } from "../completion-server/agent-resolver/types.js";
import type { SessionStore } from "../completion-server/session-store/index.js";
import type { ConversationRelayAdapter } from "../completion-server/twilio/conversation-relay.js";
import { getMakeLogger } from "../lib/logger.js";

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

export type ToolDefinition = FunctionToolDefinition; // this is what is ingested by the completion server
export type ToolParameters = ObjectPropertySchema;

interface BaseTool {
  description?: string;
  name: string;
  parameters?: ToolParameters;
  fillers?: string[] | null;
}

export interface FunctionToolDefinition extends BaseTool {
  type: "function";
}

export type ToolExecutor<T extends object = object> = (
  args: T,
  deps: ToolDependencies,
) => Promise<any> | any;

export interface ToolDependencies {
  agent: IAgentResolver;
  log: ReturnType<typeof getMakeLogger>;
  relay: ConversationRelayAdapter;
  store: SessionStore;
  tool: ToolDefinition;
}

export type ToolResponse =
  | { status: "complete"; result?: object }
  | { status: "error"; error: string };

/****************************************************
 JSON Schema
 https://json-schema.org/
****************************************************/
type JSONSchemaProperty =
  | StringPropertySchema
  | NumberPropertySchema
  | ArrayPropertySchema
  | ObjectPropertySchema;

type JSONSchemaType = "string" | "number" | "boolean" | "object" | "array";

interface JSONSchemaPropertyBase {
  type: JSONSchemaType;
  description?: string;
  enum?: any[];
  default?: any;
}

interface StringPropertySchema extends JSONSchemaPropertyBase {
  type: "string";
  minLength?: number;
  maxLength?: number;
}

interface NumberPropertySchema extends JSONSchemaPropertyBase {
  type: "number";
}

interface ArrayPropertySchema extends JSONSchemaPropertyBase {
  type: "array";
  items: JSONSchemaProperty;
}

interface ObjectPropertySchema extends JSONSchemaPropertyBase {
  type: "object";
  properties: Record<string, JSONSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean | JSONSchemaProperty;
}
