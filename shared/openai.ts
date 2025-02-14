import type { ChatCompletionCreateParamsStreaming } from "openai/resources/index";

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
