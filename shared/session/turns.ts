/****************************************************
 Turn Records
****************************************************/
export type TurnRecord =
  | BotDTMFTurn
  | BotTextTurn
  | BotToolTurn
  | HumanDTMFTurn
  | HumanTextTurn
  | SystemTurn;

// properties inherited by all turn entities
interface TurnRecordBase {
  callSid: string;
  createdAt: string;
  id: string;
  order: number; // order is a non-sequential incrementor. Each turn is only gauranteed to have an order value greater than the previous. In other words, order is not always exactly +1 greater than the previous.
  version: number;
}

/****************************************************
 Bot Turns
****************************************************/
export type BotTurn = BotDTMFTurn | BotTextTurn | BotToolTurn;
export type BotTurnParams =
  | BotDTMFTurnParams
  | BotTextTurnParams
  | BotToolTurnParams;

type BotOrigins = "llm" | "greeting" | "filler";
type BotTurnStatus = "streaming" | "complete" | "interrupted";

// represents DTMF tones from the bot
export interface BotDTMFTurn extends TurnRecordBase {
  content: string;
  origin: BotOrigins;
  role: "bot";
  status: BotTurnStatus;
  type: "dtmf";
}

export type BotDTMFTurnParams = Omit<
  BotDTMFTurn,
  | "callSid"
  | "createdAt"
  | "interrupted"
  | "id"
  | "order"
  | "role"
  | "type"
  | "version"
> & { complete?: boolean; id?: string; interrupted?: boolean };

// represents a text from LLM that will be spoken
export interface BotTextTurn extends TurnRecordBase {
  content: string;
  origin: BotOrigins;
  role: "bot";
  status: BotTurnStatus;
  type: "text";
}

export type BotTextTurnParams = Omit<
  BotTextTurn,
  | "callSid"
  | "createdAt"
  | "complete"
  | "interrupted"
  | "id"
  | "order"
  | "role"
  | "type"
  | "version"
> & {
  complete?: boolean;
  id?: string;
  interrupted?: boolean;
};

// represents the LLM requesting a FN tool be executed
// note: the results are stored on the toolcall and not a separate item like some LLM APIs, such as OpenAI
export interface BotToolTurn extends TurnRecordBase {
  origin: BotOrigins;
  role: "bot";
  tool_calls: StoreToolCall[];
  status: BotTurnStatus;
  type: "tool";
}

export type BotToolTurnParams = Omit<
  BotToolTurn,
  | "callSid"
  | "complete"
  | "createdAt"
  | "id"
  | "order"
  | "role"
  | "type"
  | "version"
> & { complete?: boolean; id?: string };

export interface StoreToolCall {
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
export type HumanTurnParams = HumanDTMFTurnParams | HumanTextTurnParams;

export type HumanOrigins = "stt" | "hack";

// represents DTMF tones from the bot
export interface HumanDTMFTurn extends TurnRecordBase {
  content: string;
  origin: HumanOrigins;
  role: "human";
  type: "dtmf";
}

export type HumanDTMFTurnParams = Omit<
  HumanDTMFTurn,
  "callSid" | "createdAt" | "id" | "order" | "role" | "type" | "version"
> & {
  id?: string;
};

export interface HumanTextTurn extends TurnRecordBase {
  content: string;
  origin: HumanOrigins;
  role: "human";
  type: "text";
}

export type HumanTextTurnParams = Omit<
  HumanTextTurn,
  "callSid" | "createdAt" | "id" | "order" | "role" | "type" | "version"
> & {
  id?: string;
};

/****************************************************
 System Turn
****************************************************/
export interface SystemTurn extends TurnRecordBase {
  content: string;
  origin: SystemOrigins;
  role: "system";
}

type SystemOrigins = "human";

export type SystemTurnParams = Omit<
  SystemTurn,
  "callSid" | "createdAt" | "id" | "order" | "role" | "version"
> & { id?: string };
