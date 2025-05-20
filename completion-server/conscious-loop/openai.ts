import OpenAI from "openai";
import type {
  ChatCompletionChunk,
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/index";
import type { ChatCompletionCreateParamsStreaming } from "openai/src/resources/index.js";
import type { Stream } from "openai/streaming";
import { v4 as uuidV4 } from "uuid";
import type { ToolDefinition, ToolResponse } from "../../agent/types.js";
import { TypedEventEmitter } from "../../lib/events.js";
import log, { getMakeLogger } from "../../lib/logger.js";
import { OPENAI_API_KEY } from "../../shared/env.js";
import type { OpenAIConfig } from "../../shared/openai.js";
import type {
  BotTextTurn,
  BotTextTurnParams,
  BotToolTurn,
  BotToolTurnParams,
  StoreToolCall,
  TurnRecord,
} from "../../shared/session/turns.js";
import type { IAgentResolver } from "../agent-resolver/types.js";
import type { SessionStore } from "../session-store/index.js";
import type { ConversationRelayAdapter } from "../twilio/conversation-relay.js";
import type { ConsciousLoopEvents, IConsciousLoop } from "./types.js";

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const LLM_MAX_RETRY_ATTEMPTS = 3;

export class OpenAIConsciousLoop
  implements
    IConsciousLoop<
      OpenAIConfig,
      ChatCompletionTool[] | undefined,
      ChatCompletionMessageParam[]
    >
{
  private log: ReturnType<typeof getMakeLogger>;
  constructor(
    public store: SessionStore,
    public agent: IAgentResolver,
    public relay: ConversationRelayAdapter,
  ) {
    this.log = getMakeLogger(store.callSid);
    this.eventEmitter = new TypedEventEmitter<ConsciousLoopEvents>();

    // the conscious loop can be trigger by certain store events
    this.store.on("tryCompletion", () => {
      if (this.stream) return;
      this.run();
    });
  }

  private stream?: Stream<ChatCompletionChunk>;
  private activeCompletionId: string | undefined; // keeps track of

  run = async (): Promise<undefined | Promise<any>> => {
    this.checkStream();

    this.emit("run.started");
    await this.doCompletion();
    this.emit("run.finished");
  };

  private checkStream = () => {
    // There should only be one completion stream open at a time.
    if (this.stream) {
      this.log.warn(
        "llm",
        "Starting a completion while one is already underway. Previous completion will be aborted.",
      );
      this.abort(); // judgement call: should previous completion be aborted or should the new one be cancelled?
    }
  };

  private doCompletion = async (
    attempt = 0,
  ): Promise<undefined | Promise<any>> => {
    const completionId = uuidV4();
    this.activeCompletionId = completionId;

    this.store.insertParkingLot(); // adds any parking lot items to the store before completion

    const messages = this.getTurns();

    let args: ChatCompletionCreateParamsStreaming | undefined;
    try {
      const tools = this.getTools();
      args = { ...this.getConfig(), messages, stream: true, tools };
      this.stream = await openai.chat.completions.create(args);
    } catch (error) {
      const _args = JSON.stringify({ turns: this.store.turns.list(), ...args });
      this.log.error("llm", "Error attempting completion", error, "\n", _args);
      return this.handleRetry(attempt + 1);
    }

    let botText: BotTextTurn | undefined;
    let botTool: BotToolTurn | undefined;

    let finish_reason: Finish_Reason | null = null;

    for await (const chunk of this.stream) {
      const choice = chunk.choices[0];
      const delta = choice.delta;

      const content =
        delta.content || (delta.content === null ? "" : delta.content);

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
        params = {
          content,
          id: chunk.id,
          origin: "llm",
          status: "streaming",
        };
        botText = this.store.turns.addBotText(params);
        this.emit("text-chunk", content, false, botText.content);
      }

      // handle subsequent chunks of botText completion
      if (isTextDelta && !isFirstTextDelta) {
        if (botText?.type !== "text") throw Error("Expected text"); // type guard, should be unreachable
        botText.content += delta.content;
        this.emit("text-chunk", content, !!finish_reason, botText.content);
      }

      // handles the first chunk of the first tool
      if (isToolDelta && isFirstToolDelta) {
        if (!("tool_calls" in delta)) throw Error("No tool_calls in 1st delta"); // should be unreachable
        params = {
          id: chunk.id,
          origin: "llm",
          status: "streaming",
          tool_calls: delta.tool_calls as StoreToolCall[],
        }; // isFirstToolDelta
        botTool = this.store.turns.addBotTool(params);

        const toolName = delta?.tool_calls?.[0]?.function?.name;
        if (toolName) this.agent.queueFillerPhrase(botTool.id, toolName);
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
      botText.status = "complete";
      this.emit("text-chunk", "", true, botText.content);
    }

    if (finish_reason === "tool_calls") {
      if (!botTool) throw Error("finished for tool_calls but no BotTool"); // should be unreachable

      await this.handleToolExecution(botTool);
      if (botTool.status === "streaming") botTool.status = "complete";

      if (this.activeCompletionId !== completionId) return; // check to make the stream that started this completion is still the same. if it's not, that means there was an interruption or error. a subsequent completion is not warranted
      this.stream = undefined;
      return this.doCompletion(); // start another completion after tools are resolved
    }

    // todo: add handlers for these situations
    if (finish_reason === "content_filter")
      this.log.warn("llm", `Unusual finish reason ${finish_reason}`);
    if (finish_reason === "function_call")
      this.log.warn("llm", `Unusual finish reason ${finish_reason}`);
    if (finish_reason === "length")
      this.log.warn("llm", `Unusual finish reason ${finish_reason}`);

    // clean up completion
    this.stream = undefined;
  };

  handleToolExecution = async (botTool: BotToolTurn) => {
    const executions = await Promise.all(
      botTool.tool_calls.map(async (tool) => {
        try {
          this.emit("tool.starting", botTool, tool);

          let args: object | undefined;
          try {
            args = JSON.parse(tool.function.arguments);
          } catch (error) {
            log.warn(
              "llm",
              `error parsing tool (${tool.function.name}), args: `,
              tool.function.arguments,
            );
          }

          const result = await this.agent.executeTool(
            botTool.id,
            tool.function.name,
            args,
          );

          return { result, tool };
        } catch (error) {
          this.log.warn("llm", "Error while executing a tool", error);
          const result: ToolResponse = { status: "error", error: "unknown" };
          return { tool, result };
        }
      }),
    );

    if (botTool.status !== "interrupted") {
      for (const { result, tool } of executions) {
        // todo: add abort logic
        this.store.turns.setToolResult(tool.id, result);
        if (result.status === "complete")
          this.emit("tool.complete", botTool, tool, result);
        if (result.status === "error")
          this.emit("tool.error", botTool, tool, result);
      }
    }
  };

  private handleRetry = async (attempt: number) =>
    new Promise((resolve) => {
      this.abort(); // set stream to undefined

      setTimeout(() => {
        if (this.stream) return resolve(null);
        if (attempt > LLM_MAX_RETRY_ATTEMPTS) {
          const message = `LLM completion failed more than max retry attempt`;
          this.log.error(`llm`, message);
          this.relay.end({ reason: "error", message });
          return resolve(null);
        }

        if (attempt > 0)
          this.log.info(`llm`, `Completion retry attempt: ${attempt}`);

        resolve(this.doCompletion(attempt));
      }, 1000);
    });

  /**
   * Aborts and cleans up the existing completion loop
   */
  abort = () => {
    if (this.stream && !this.stream?.controller.signal.aborted)
      this.stream?.controller.abort();

    this.activeCompletionId = undefined;
    this.stream = undefined;
  };

  // translate this app's config schema into OpenAI format
  getConfig = (): OpenAIConfig => {
    const { model } = this.agent.getLLMConfig();
    return { model };
  };

  // translate this app's tool schema into OpenAI format
  getTools = (): ChatCompletionTool[] | undefined => {
    const tools = this.agent
      .getTools()
      .map(this.translateToolSpec)
      .filter((tool) => !!tool);

    return tools.length ? tools : undefined;
  };

  private translateToolSpec = (
    tool: ToolDefinition,
  ): ChatCompletionTool | undefined => {
    if (tool.type === "function") {
      return {
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      } as ChatCompletionTool;
    }

    if (tool.type === "request") {
      return {
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      } as ChatCompletionTool;
    }

    log.warn("openai", `unable to translate tool`, JSON.stringify(tool));
  };

  // translate this app's turn schema into OpenAI format
  getTurns = () =>
    [
      this.makeSystemParam(),
      ...this.store.turns
        .list()
        .filter(
          (turn) => (turn.role === "bot" ? turn.origin !== "filler" : true), // filler phrases can confuse the bot because they break from the bot's natural completion flow
        )
        .flatMap(this.translateStoreTurnToLLMParam)
        .filter((msg) => {
          if (!msg) return false;
          if ("content" in msg && msg.content === null) return false;
          if ("content" in msg && msg.content === undefined) return false;

          return true;
        }),
    ] as ChatCompletionMessageParam[];

  private makeSystemParam = () => ({
    content: this.agent.getInstructions(),
    role: "system",
  });

  /**
   * Converts the store's turn schema to the OpenAI parameter schema required by their completion API
   */
  translateStoreTurnToLLMParam = (
    turn: TurnRecord,
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
          this.log.warn(
            "llm",
            "A Tool Call has null result, which should never happen. This turn will be filtered",
            JSON.stringify({ turn, tool, allTurns: this.store.turns.list() }),
          );
          return null;
        }

        let content: string;
        try {
          content = JSON.stringify(
            tool.result ?? { status: "error", error: "unknown" },
          );
        } catch (err) {
          this.log.warn(
            "llm",
            "Error parsing tool result",
            JSON.stringify({ turn, tool, allTurns: this.store.turns.list() }),
          );
          content = `{"status": "error", "error": "unknown" }`;
        }

        msgs.push({ role: "tool", content, tool_call_id: tool.id });
      }

      return msgs;
    }

    this.log.warn(
      "llm",
      "StoreTurn not recognized by LLM translator.",
      JSON.stringify({ turn, allTurns: this.store.turns.list() }),
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
