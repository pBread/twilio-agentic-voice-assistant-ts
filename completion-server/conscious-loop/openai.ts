import OpenAI from "openai";
import { zodFunction } from "openai/helpers/zod";
import type {
  ChatCompletionChunk,
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources";
import type { Stream } from "openai/streaming";
import { LLM_MAX_RETRY_ATTEMPTS, OPENAI_API_KEY } from "../../lib/env";
import { TypedEventEmitter } from "../../lib/events";
import log from "../../lib/logger";
import type { OpenAIConfig } from "../../shared/openai";
import type { BotTextTurn, BotToolTurn, TurnRecord } from "../../shared/turns";
import type { IAgentRuntime } from "../agent-runtime/types";
import type { SessionStore } from "../session-store";
import type { ConversationRelayAdapter } from "../twilio/conversation-relay-adapter";
import type { ConsciousLoopEvents, IConsciousLoop } from "./types";
import { z } from "zod";

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

export class OpenAIConsciousLoop
  implements
    IConsciousLoop<
      OpenAIConfig,
      ChatCompletionTool[] | undefined,
      ChatCompletionMessageParam[]
    >
{
  constructor(
    public store: SessionStore,
    public agent: IAgentRuntime,
    public relay: ConversationRelayAdapter
  ) {
    this.eventEmitter = new TypedEventEmitter<ConsciousLoopEvents>();
  }

  stream?: Stream<ChatCompletionChunk>;
  run = async (): Promise<undefined | Promise<any>> => {
    // There should only be one completion stream open at a time.
    if (this.stream) {
      log.warn(
        "llm",
        "Starting a completion while one is already underway. Previous completion will be aborted."
      );
      this.abort(); // judgement call: should previous completion be aborted or should the new one be cancelled?
    }

    this.emit("run.started");
    await this.doCompletion();
    this.emit("run.finished");
  };

  doCompletion = async (attempt = 0): Promise<undefined | Promise<any>> => {
    const messages = this.getTurns();

    try {
      this.stream = await openai.chat.completions.create({
        ...this.getConfig(),
        messages,
        stream: true,
        tools: this.getToolManifest(),
      });
    } catch (error) {
      log.error("llm", "Error attempting completion", error);
      return this.handleRetry(attempt + 1);
    }

    let textTurn: BotTextTurn | undefined;
    let toolTurn: BotToolTurn | undefined;

    for await (const chunk of this.stream) {
      const choice = chunk.choices[0];
      const delta = choice.delta;

      log.debug("llm", "chunk", JSON.stringify(delta, null, 2));
    }
  };

  handleRetry = async (attempt: number) =>
    new Promise((resolve) => {
      this.abort(); // set stream to undefined

      setTimeout(() => {
        if (this.stream) return resolve(null);
        if (attempt > LLM_MAX_RETRY_ATTEMPTS) {
          const message = `LLM completion failed more than max retry attempt`;
          log.error(`llm`, message);
          this.relay.end({ reason: "error", message });
          return resolve(null);
        }

        if (attempt > 0)
          log.info(`llm`, `Completion retry attempt: ${attempt}`);

        resolve(this.doCompletion(attempt));
      }, 1000);
    });

  abort = () => {
    this.stream?.controller.abort();
    this.stream = undefined;
  };

  // translate this app's config schema into OpenAI format
  getConfig = (): OpenAIConfig => {
    const { model } = this.agent.getLLMConfig();
    return { model };
  };

  // translate this app's tool schema into OpenAI format
  getToolManifest = (): ChatCompletionTool[] | undefined => {
    const tools = this.agent.getToolManifest();

    return tools.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        ...(tool.parameters instanceof z.ZodObject
          ? zodFunction({ name: tool.name, parameters: tool.parameters })
          : { parameters: tool.parameters }),
      },
    }));
  };

  // translate this app's turn schema into OpenAI format
  getTurns = () =>
    [
      this.makeSystemParam(),
      ...this.store.turns
        .list()
        .flatMap(this.translateStoreTurnToLLMParam)
        .filter((msg) => !!msg && msg.content !== null),
    ] as ChatCompletionMessageParam[];

  makeSystemParam = () => ({
    content: this.agent.getInstructions(),
    role: "system",
  });

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
            JSON.stringify({ turn, tool, allTurns: this.store.turns.list() })
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
            JSON.stringify({ turn, tool, allTurns: this.store.turns.list() })
          );
          content = `{"status": "error", "error": "unknown" }`;
        }

        msgs.push({ role: "tool", content, tool_call_id: tool.id });
      }
    }

    log.warn(
      "llm",
      "StoreTurn not recognized by LLM translator.",
      JSON.stringify({ turn, allTurns: this.store.turns.list() })
    );

    return null;
  };

  /****************************************************
   Event Type Casting
  ****************************************************/
  private eventEmitter: TypedEventEmitter<ConsciousLoopEvents>;
  public on: TypedEventEmitter<ConsciousLoopEvents>["on"] = (...args) =>
    this.eventEmitter.on(...args);
  private emit: TypedEventEmitter<ConsciousLoopEvents>["emit"] = (
    event,
    ...args
  ) => this.eventEmitter.emit(event, ...args);
}

type Finish_Reason =
  | "content_filter"
  | "function_call"
  | "length"
  | "stop"
  | "tool_calls";
