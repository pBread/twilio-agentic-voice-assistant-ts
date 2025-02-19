import type { BotToolTurn, StoreToolCall } from "../../shared/session/turns.js";
import type { IAgentResolver } from "../agent-resolver/types.js";
import type { SessionStore } from "../session-store/index.js";
import type { ConversationRelayAdapter } from "../twilio/conversation-relay.js";

export interface IConsciousLoop<TConfig, TToolManifest, TTurns> {
  run(): Promise<undefined | Promise<any>>;
  abort(): void;

  on<K extends keyof ConsciousLoopEvents>(
    event: K,
    listener: ConsciousLoopEvents[K],
  ): void;

  store: SessionStore;
  agent: IAgentResolver;
  relay: ConversationRelayAdapter;
}

export interface ConsciousLoopEvents {
  "run.started": () => void;
  "run.finished": () => void;

  dtmf: (digits: string) => void; // dtmf digits the bot wants to send
  "text-chunk": (text: string, last: boolean, fullText?: string) => void; // chunk of text the LLM wants to say

  "tool.starting": (turn: BotToolTurn, params: StoreToolCall) => void;
  "tool.complete": (
    turn: BotToolTurn,
    params: StoreToolCall,
    result: any,
  ) => void;
  "tool.error": (
    turn: BotToolTurn,
    param: StoreToolCall,
    error: any,
  ) => boolean;
}
