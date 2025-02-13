import OpenAI from "openai";
import { zodFunction } from "openai/helpers/zod";
import type {
  ChatCompletionChunk,
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources";
import type { Stream } from "openai/streaming";
import { z } from "zod";
import { LLM_MAX_RETRY_ATTEMPTS, OPENAI_API_KEY } from "../../lib/env";
import { TypedEventEmitter } from "../../lib/events";
import log, { createLogStreamer } from "../../lib/logger";
import type { OpenAIConfig } from "../../shared/openai";
import type {
  BotTextTurn,
  BotTextTurnParams,
  BotToolTurn,
  BotToolTurnParams,
  StoreToolCall,
  TurnRecord,
} from "../../shared/turns";
import type { IAgentRuntime } from "../agent-runtime/types";
import { ToolResponse } from "../agent-runtime/types";
import type { SessionStore } from "../session-store";
import type { ConversationRelayAdapter } from "../twilio/conversation-relay-adapter";
import type { ConsciousLoopEvents, IConsciousLoop } from "./types";

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
    this.logStream = createLogStreamer("chunks");
  }

  logStream: ReturnType<typeof createLogStreamer>;

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

    let idx = -1;

    let botText: BotTextTurn | undefined;
    let botTool: BotToolTurn | undefined;

    let finish_reason: Finish_Reason | null = null;

    for await (const chunk of this.stream) {
      idx++;
      const choice = chunk.choices[0];
      const delta = choice.delta;

      this.logStream.write(chunk);

      const content =
        delta.content || (delta.content === null ? "" : delta.content); // bugfix-text: does delta.content being null cause the first iteration to misfire?

      const isTextDelta = content !== undefined;
      const isToolDelta = "tool_calls" in delta;

      const isFirstTextDelta = isTextDelta && !botText;
      const isFirstToolDelta = isToolDelta && !botTool;
      const isNewTool = isToolDelta && !!delta?.tool_calls?.[0].id; // One completion may have multiple tools, but the position in the tool_call array will always be 0. "id" is only emitted during the first delta of a new tool. There is also an "index" property on the tool_call object, that can also track this.

      if (!finish_reason) finish_reason = choice.finish_reason;

      let params: BotTextTurnParams | BotToolTurnParams | undefined;

      // todo: add dtmf logic

      // handle the first text chunk of a botText completion
      if (isFirstTextDelta) {
        params = { content, id: chunk.id };
        botText = this.store.turns.addBotText(params);
        this.emit("text-chunk", content, false, botText.content);
      }

      // handle subsequent chunks of botText completion
      if (isTextDelta && !isFirstTextDelta) {
        if (botText?.type !== "text") throw Error("Expected text"); // type guard, should be unreachable
        botText.content += delta.content;
        this.emit("text-chunk", content, !!finish_reason, botText.content);
      }

      if (isTextDelta)
        if (isFirstToolDelta) {
          // handles the first chunk of the first tool
          if (!("tool_calls" in delta))
            throw Error("No tool_calls in 1st delta"); // should be unreachable
          params = {
            id: chunk.id,
            tool_calls: delta.tool_calls as StoreToolCall[],
          }; // isFirstToolDelta
          botTool = this.store.turns.addBotTool(params);
        }

      // handles the first chunk of subsequent tools
      if (isToolDelta && !isFirstToolDelta && isNewTool) {
        const deltaTool = delta?.tool_calls?.[0]; // openai quirk: tools will always be in the first position of the chunk array. their actual array position is defined by the "index" property on the tool.
        if (!botTool?.tool_calls) throw Error(`No tool_calls in nth delta`); // should be unreachable
        if (deltaTool?.index === undefined)
          throw Error("No index on deltaTool"); // should be unreachable

        botTool.tool_calls[deltaTool?.index as number] =
          deltaTool as StoreToolCall; // the store StoreToolCall is same as OpenAI ToolCall. translator needed for other llm formats
      }

      // handles subsequent chunks of all tool completions
      if (isToolDelta && !isFirstToolDelta && !isNewTool) {
        const toolDelta = delta?.tool_calls?.[0] as StoreToolCall;
        const tool = botTool?.tool_calls[toolDelta.index];
        if (!tool) throw Error("tool_call not found"); // should be unreachable

        // mutate the tool_call record of the store message
        tool.function.name += toolDelta.function.name ?? "";
        tool.function.arguments += toolDelta.function.arguments ?? "";
      }
    }

    /****************************************************
     Handle Completion Finish
    ****************************************************/
    if (finish_reason === "stop") {
      if (!botText) throw Error("finished for 'stop' but no BotText"); // should be unreachable

      this.emit("text-chunk", "", true, botText.content);
    }

    if (finish_reason === "tool_calls") {
      if (!botTool) throw Error("finished for tool_calls but no BotTool"); // should be unreachable
      await this.handleToolExecution(botTool);
      this.stream = undefined;
      return this.doCompletion();
    }

    // todo: add handlers for these situations
    if (finish_reason === "content_filter")
      log.warn("llm", `Unusual finish reason ${finish_reason}`);
    if (finish_reason === "function_call")
      log.warn("llm", `Unusual finish reason ${finish_reason}`);
    if (finish_reason === "length")
      log.warn("llm", `Unusual finish reason ${finish_reason}`);

    /****************************************************
     Clean Up Completion
    ****************************************************/
    this.logStream.write("\n");
    this.stream = undefined;
  };

  handleToolExecution = async (botTool: BotToolTurn) => {
    const results = await Promise.all(
      botTool.tool_calls.map(async (tool) => {
        try {
          this.emit("tool.starting", botTool, tool);
          const result = {
            tool,
            data: await this.agent.executeTool(
              tool.function.name,
              tool.function.arguments
            ),
          };

          return result;
        } catch (error) {
          log.warn("llm", "Error while executing a tool", error);
          return {
            tool,
            data: {
              status: "error",
              error: "unknown error",
            } as ToolResponse,
          };
        }
      })
    );

    for (const result of results) {
      // todo: add abort logic
      this.store.turns.setToolResult(result.tool.id, result.data);
      if (result.data.status === "success")
        this.emit("tool.success", botTool, result.tool, result.data);

      if (result.data.status === "error")
        this.emit("tool.error", botTool, result.tool, result.data);
    }

    this.logStream.write("\n");
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

      return msgs;
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
