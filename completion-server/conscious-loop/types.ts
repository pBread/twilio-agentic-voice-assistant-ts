import type { BotToolTurn, StoreToolCall } from "../../shared/session";
import { IAgentRuntime } from "../agent-runtime/types";
import { SessionStore } from "../session-store";
import { ConversationRelayAdapter } from "../twilio/conversation-relay-adapter";

export interface IConsciousLoop<TConfig, TToolManifest, TTurns> {
  run(): Promise<undefined | Promise<any>>;
  abort(): void;

  getConfig(): TConfig;
  getToolManifest(): TToolManifest;
  getTurns(): TTurns;

  on<K extends keyof ConsciousLoopEvents>(
    event: K,
    listener: ConsciousLoopEvents[K]
  ): void;

  store: SessionStore;
  agent: IAgentRuntime;
  relay: ConversationRelayAdapter;
}

export interface ConsciousLoopEvents {
  "run.started": () => void;
  "run.finished": () => void;

  dtmf: (digits: string) => void; // dtmf digits the bot wants to send
  "text-chunk": (text: string, last: boolean, fullText?: string) => void; // chunk of text the LLM wants to say

  "tool.starting": (turn: BotToolTurn, params: StoreToolCall) => void;
  "tool.success": (
    turn: BotToolTurn,
    params: StoreToolCall,
    result: any
  ) => void;
  "tool.error": (
    turn: BotToolTurn,
    param: StoreToolCall,
    error: any
  ) => boolean;
}
