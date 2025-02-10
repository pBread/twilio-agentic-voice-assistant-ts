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

/****************************************************
 Bot Turns
****************************************************/
export type BotTurn = BotDTMFTurn | BotTextTurn | BotToolTurn;

// represents DTMF tones from the bot
export interface BotDTMFTurn extends StoreTurn {
  content: string;
  interrupted: boolean;
  role: "bot";
  type: "dtmf";
}

export type BotDTMFTurnParams = Omit<
  BotDTMFTurn,
  "callSid" | "createdAt" | "interrupted" | "id" | "order" | "role" | "type"
>;

// represents a text from LLM that will be spoken
export interface BotTextTurn extends StoreTurn {
  content: string;
  interrupted: boolean;
  role: "bot";
  type: "text";
}

export type BotTextTurnParams = Omit<
  BotTextTurn,
  "callSid" | "createdAt" | "interrupted" | "id" | "order" | "role" | "type"
>;

// represents the LLM requesting a FN tool be executed
// note: the results are stored on the toolcall and not a separate item like some LLM APIs, such as OpenAI
export interface BotToolTurn extends StoreTurn {
  role: "bot";
  tool_calls: ToolCall[];
  type: "tool";
}

export type BotToolTurnParams = Omit<
  BotToolTurn,
  "callSid" | "createdAt" | "role" | "type"
> & {
  id?: string;
};

export interface ToolCall {
  function: { name: string; arguments: any };
  id: string;
  index: number;
  result?: object;
  type: "function";
}

/****************************************************
 Human Turns
****************************************************/
export type HumanTurn = HumanDTMFTurn | HumanTextTurn;

// represents DTMF tones from the bot
export interface HumanDTMFTurn extends StoreTurn {
  content: string;
  role: "human";
  type: "dtmf";
}

export type HumanDTMFTurnParams = Omit<
  HumanDTMFTurn,
  "callSid" | "createdAt" | "id" | "order" | "role" | "type"
> & {
  id?: string;
};

export interface HumanTextTurn extends StoreTurn {
  content: string;
  role: "human";
  type: "text";
}

export type HumanTextTurnParams = Omit<
  HumanTextTurn,
  "callSid" | "createdAt" | "id" | "order" | "role" | "type"
> & {
  id?: string;
};

/****************************************************
 System Turn
****************************************************/
export interface SystemTurn extends StoreTurn {
  content: string;
  role: "system";
}

export type SystemTurnParams = Omit<
  SystemTurn,
  "callSid" | "createdAt" | "id" | "order" | "role"
> & { id?: string };
