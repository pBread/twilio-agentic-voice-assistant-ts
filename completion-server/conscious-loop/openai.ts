import OpenAI from "openai";
import {
  ChatCompletionCreateParamsStreaming,
  ChatCompletionTool,
} from "openai/resources";
import { OPENAI_API_KEY } from "../../lib/env";
import { TypedEventEmitter } from "../../lib/events";
import { IAgentRuntime } from "../agent-runtime/interfaces";
import { SessionManager } from "../session-manager";
import { ConversationRelayAdapter } from "../twilio/conversation-relay-adapter";
import { CompletionEvents } from "./interfaces";

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

export class OpenAIConsciousLoop {
  constructor(
    private session: SessionManager,
    private agent: IAgentRuntime<ChatCompletionTool[], OpenAIConfig>,
    private relay: ConversationRelayAdapter
  ) {
    this.eventEmitter = new TypedEventEmitter<CompletionEvents>();
  }

  /****************************************************
   Event Type Casting
  ****************************************************/
  private eventEmitter: TypedEventEmitter<CompletionEvents>;
  public on: TypedEventEmitter<CompletionEvents>["on"] = (...args) =>
    this.eventEmitter.on(...args);
  private emit: TypedEventEmitter<CompletionEvents>["emit"] = (
    event,
    ...args
  ) => this.eventEmitter.emit(event, ...args);
}

export interface OpenAIConfig
  extends Omit<
    ChatCompletionCreateParamsStreaming,
    // important to remove as to avoid overriding completion parameters declared elsewhere
    | "messages" // turn formatting is done in LLMService
    | "stream" // controlled by LLMService
    | "tools" // tool filtering is performeds by the getToolManifest method on agent

    // irrelevant params
    | "audio"
    | "function_call"
    | "functions"
    | "response_format"
    | "stop"
    | "store"
    | "n"
    | "seed"
    | "tool_choice"
  > {}
