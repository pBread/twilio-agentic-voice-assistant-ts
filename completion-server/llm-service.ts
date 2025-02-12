import OpenAI from "openai";
import type {
  ChatCompletionChunk,
  ChatCompletionCreateParamsStreaming,
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources";
import type { Stream } from "openai/streaming";
import { AgentRuntime } from "../agents/agent-runtime";
import { OPENAI_API_KEY, LLM_MAX_RETRY_ATTEMPTS } from "../lib/env";
import { TypedEventEmitter } from "../lib/events";
import log from "../lib/logger";
import { SessionManager } from "./session-manager";
import {
  BotDTMFTurnParams,
  BotTextTurn,
  BotToolTurn,
  ToolCall,
  TurnRecord,
} from "./session-manager/turn-store.entities";

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

export class LLMService {
  constructor(
    private session: SessionManager,
    private agent: AgentRuntime<ChatCompletionTool[], OpenAIStreamingConfig>
  ) {
    this.eventEmitter = new TypedEventEmitter<LLMEvents>();
  }

  private eventEmitter: TypedEventEmitter<LLMEvents>;
  public on: TypedEventEmitter<LLMEvents>["on"] = (...args) =>
    this.eventEmitter.on(...args);
  private emit: TypedEventEmitter<LLMEvents>["emit"] = (event, ...args) =>
    this.eventEmitter.emit(event, ...args);

  /****************************************************
   Completion Loop
  ****************************************************/
  stream?: Stream<ChatCompletionChunk>;
  doCompletion = async (attempt = 0): Promise<undefined | Promise<any>> => {
    if (attempt > LLM_MAX_RETRY_ATTEMPTS) return;
    if (attempt > 0) log.info(`llm`, `Completion retry attempt: ${attempt}`);

    const messages = this.getMessageParams();

    // There should only be one completion stream open at a time.
    if (this.stream) {
      log.warn(
        "llm",
        "Starting a completion while one is already underway. Previous completion will be aborted."
      );
      this.abort();
    }

    try {
      this.stream = await openai.chat.completions.create({
        ...this.agent.getLLMConfig(),
        messages,
        stream: true,
        tools: this.getToolManifest(),
      });
    } catch (error) {
      log.error("llm", "Error attempting completion", error);

      this.abort();
      return setTimeout(() => {
        if (!this.stream) this.doCompletion(attempt + 1); // reattempt only if another completion is not already underway
      }, 1000);
    }

    let textTurn: BotTextTurn | undefined;
    let toolTurn: BotToolTurn | undefined;

    for await (const chunk of this.stream) {
      const choice = chunk.choices[0];
      const delta = choice.delta;
    }
  };

  /****************************************************
   Translate Store Turns to OpenAI Message Parameter
  ****************************************************/
  getMessageParams = () =>
    [
      this.makeSystemParam(),
      ...this.session.turns
        .list()
        .flatMap(this.translateStoreTurnToLLMParam)
        .filter((msg) => !!msg && msg.content !== null),
    ] as ChatCompletionMessageParam[];

  /**
   * Converts the store's turn schema to the OpenAI parameter schema required by their completion API
   */
  translateStoreTurnToLLMParam = (
    turn: TurnRecord
  ): ChatCompletionMessageParam | ChatCompletionMessageParam[] | null => {
    if (turn.role === "bot" && turn.type === "dtmf")
      return { role: "assistant", content: turn.content };
    if (turn.role === "bot" && turn.type === "text")
      return { role: "assistant", content: turn.content };

    if (turn.role === "human") return { role: "user", content: turn.content };
    if (turn.role === "system")
      return { role: "system", content: turn.content };

    if (turn.role === "bot" && turn.type === "tool") {
      // OpenAI expects tools to be provided as such:
      // (1) the message requesting the tool(s) to be executed
      // (2) one message for each tool result following immediately after the previous message.

      // Tool turns are blown out into an array, which will be flatMapped once returned.
      let msgs: ChatCompletionMessageParam[] = [
        {
          role: "assistant",
          tool_calls: turn.tool_calls.map(({ result, ...tool }) => tool),
        },
      ];

      for (const tool of turn.tool_calls) {
        if (tool.result === null) {
          log.warn(
            "llm",
            "A Tool Call has null result, which should never happen. This turn will be filtered",
            JSON.stringify({ turn, tool, allTurns: this.session.turns.list() })
          );
          return null;
        }

        let content: string;
        try {
          content = JSON.stringify(tool.result);
        } catch (err) {
          log.warn(
            "llm",
            "Error parsing tool result",
            JSON.stringify({ turn, tool, allTurns: this.session.turns.list() })
          );
          content = `{"status": "error", "error": "unknown" }`;
        }

        msgs.push({ role: "tool", content, tool_call_id: tool.id });
      }
    }

    log.warn(
      "llm",
      "StoreTurn not recognized by LLM translator.",
      JSON.stringify({ turn, allTurns: this.session.turns.list() })
    );

    return null;
  };

  makeSystemParam = () => ({
    content: this.agent.getInstructions(),
    role: "system",
  });

  // replace this with a translator if other LLM API tools require a different parameter
  getToolManifest = () => this.agent.getToolManifest();

  /**
   * Abort the current completion.
   */
  abort = () => {
    this.stream?.controller.abort();
    this.stream = undefined;
  };
}

interface LLMEvents {
  "completion.started": (turn: BotDTMFTurnParams) => void;
  "completion.finished": (turn?: TurnRecord, reason?: Finish_Reason) => void;

  dtmf: (digits: string) => void; // dtmf digits the bot wants to send
  "text-chunk": (text: string, last: boolean, fullText?: string) => void; // chunk of text the LLM wants to say

  "tool.starting": (turn: BotToolTurn, params: ToolCall) => void;
  "tool.finished": (turn: BotToolTurn, params: ToolCall, result: any) => void;
  "tool.error": (turn: BotToolTurn, param: ToolCall, error: any) => boolean;
}

type Finish_Reason =
  | "content_filter"
  | "function_call"
  | "length"
  | "stop"
  | "tool_calls";

export interface OpenAIStreamingConfig
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
