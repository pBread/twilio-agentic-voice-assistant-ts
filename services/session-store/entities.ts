export type Turn =
  | BotDTMFTurn
  | BotTextTurn
  | BotToolTurn
  | HumanDTMFTurn
  | HumanTextTurn
  | SystemTurn;

interface StoreTurn {
  callSid: string;
  createdAt: string;
  id: string;
  order: number; // order is a non-sequential incrementor. Each turn is only gauranteed to have an order value greater than the previous. It's not always +1 greater than the previous.
}

// bot turn entities
export type BotTurn = BotDTMFTurn | BotTextTurn | BotToolTurn;

export interface BotDTMFTurn extends StoreTurn {
  content: string;
  interrupted: boolean;
  role: "bot";
  type: "dtmf";
}

export interface BotTextTurn extends StoreTurn {
  content: string;
  interrupted: boolean;
  role: "bot";
  type: "text";
}

export interface BotToolTurn extends StoreTurn {
  role: "bot";
  tool_calls: ToolCall[];
  type: "tool";
}

export interface ToolCall {
  function: { name: string; arguments: any };
  id: string;
  index: number;
  result?: object;
  type: "function";
}

// human turns
export type HumanTurn = HumanDTMFTurn | HumanTextTurn;

export interface HumanDTMFTurn extends StoreTurn {
  content: string;
  role: "human";
  type: "dtmf";
}

export interface HumanTextTurn extends StoreTurn {
  content: string;
  role: "human";
  type: "text";
}

// system message
export interface SystemTurn extends StoreTurn {
  content: string;
  role: "system";
}
