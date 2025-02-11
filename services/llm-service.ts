import OpenAI from "openai";
import type {
  ChatCompletionChunk,
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources";
import type { Stream } from "openai/streaming";
import { OPENAI_API_KEY } from "../lib/env";
import { TypedEventEmitter } from "../lib/events";
import log from "../lib/logger";
import { SessionManager } from "../session-manager";
import { Turn } from "../session-manager/turn-store.entities";

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

export class LLMService {
  constructor(private session: SessionManager) {
    this.eventEmitter = new TypedEventEmitter<LLMEvents>();
  }

  private eventEmitter: TypedEventEmitter<LLMEvents>;
  public on: TypedEventEmitter<LLMEvents>["on"] = (...args) =>
    this.eventEmitter.on(...args);

  /****************************************************
   Completion Loop
  ****************************************************/
  stream?: Stream<ChatCompletionChunk>;
  doCompletion = async (): Promise<undefined | Promise<any>> => {
    const messages = this.getMessageParams();

    if (this.stream) {
      log.warn(
        "llm",
        "Starting a completion while one is already underway. Previous completion will be aborted."
      );
      this.abort();
    }

    this.stream = await openai.chat.completions.create({
      model: "gpt-4",
      messages,
      stream: true,
      tools: this.getToolManifest(),
    });
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
    turn: Turn
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
    content: this.session.agent.getSystemInstructions(),
    role: "system",
  });

  // replace this with a translator if other LLM API tools require a different parameter
  getToolManifest = () => this.session.agent.getTools() as ChatCompletionTool[];

  /**
   * Abort the current completion.
   */
  abort = () => {
    this.stream?.controller.abort();
    this.stream = undefined;
  };
}

interface LLMEvents {}
