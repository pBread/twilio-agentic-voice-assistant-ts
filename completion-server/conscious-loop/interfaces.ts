import type {
  BotDTMFTurnParams,
  BotToolTurn,
  ToolCall,
  TurnRecord,
} from "../session-manager";

export interface CompletionEvents {
  "completion.started": (turn: BotDTMFTurnParams) => void;
  "completion.finished": (turn?: TurnRecord) => void;

  dtmf: (digits: string) => void; // dtmf digits the bot wants to send
  "text-chunk": (text: string, last: boolean, fullText?: string) => void; // chunk of text the LLM wants to say

  "tool.starting": (turn: BotToolTurn, params: ToolCall) => void;
  "tool.finished": (turn: BotToolTurn, params: ToolCall, result: any) => void;
  "tool.error": (turn: BotToolTurn, param: ToolCall, error: any) => boolean;
}
