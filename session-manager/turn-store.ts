import { makeId } from "../lib/ids";
import {
  BotDTMFTurn,
  BotDTMFTurnParams,
  BotTextTurn,
  BotTextTurnParams,
  BotToolTurn,
  BotToolTurnParams,
  HumanDTMFTurn,
  HumanDTMFTurnParams,
  HumanTextTurn,
  HumanTextTurnParams,
  SystemTurn,
  SystemTurnParams,
  Turn,
} from "./turn-store.entities";

export class TurnStore {
  private callSid: string;
  private turnMap: Map<string, Turn>;

  constructor(callSid: string) {
    this.turnMap = new Map();
    this.callSid = callSid;
  }

  private _currentOrder: number = 0; // order is a non-sequential incrementor. Each turn is only gauranteed to have an order value greater than the previous. In other words, order is not always exactly +1 greater than the previous.
  // current order can only be referenced, not set publically
  public get currentOrder() {
    return this._currentOrder;
  }
  private nextOrder = () => this._currentOrder++;

  delete = (id: string) => this.turnMap.delete(id);
  get = (id: string) => this.turnMap.get(id);
  list = () => [...this.turnMap.values()];

  addBotDTMF = (turn: Omit<BotDTMFTurn, "order" | "callSid">): BotDTMFTurn => {
    const fullTurn = {
      ...turn,
      callSid: this.callSid,
      order: this.nextOrder(),
    };
    this.turnMap.set(fullTurn.id, fullTurn);
    return fullTurn;
  };

  addBotText = (turn: Omit<BotTextTurn, "order" | "callSid">): BotTextTurn => {
    const fullTurn = {
      ...turn,
      callSid: this.callSid,
      order: this.nextOrder(),
    };
    this.turnMap.set(fullTurn.id, fullTurn);
    return fullTurn;
  };

  addBotTool = (turn: Omit<BotToolTurn, "order" | "callSid">): BotToolTurn => {
    const fullTurn = {
      ...turn,
      callSid: this.callSid,
      order: this.nextOrder(),
    };
    this.turnMap.set(fullTurn.id, fullTurn);
    return fullTurn;
  };

  addHumanDTMF = (
    turn: Omit<HumanDTMFTurn, "order" | "callSid">
  ): HumanDTMFTurn => {
    const fullTurn = {
      ...turn,
      callSid: this.callSid,
      order: this.nextOrder(),
    };
    this.turnMap.set(fullTurn.id, fullTurn);
    return fullTurn;
  };

  addHumanText = (
    turn: Omit<HumanTextTurn, "order" | "callSid">
  ): HumanTextTurn => {
    const fullTurn = {
      ...turn,
      callSid: this.callSid,
      order: this.nextOrder(),
    };
    this.turnMap.set(fullTurn.id, fullTurn);
    return fullTurn;
  };

  addSystem = (turn: Omit<SystemTurn, "order" | "callSid">): SystemTurn => {
    const fullTurn = {
      ...turn,
      callSid: this.callSid,
      order: this.nextOrder(),
    };
    this.turnMap.set(fullTurn.id, fullTurn);
    return fullTurn;
  };

  setToolResult = (toolId: string, result: object) => {
    const toolTurn = [...this.turnMap.values()].find(
      (turn) =>
        turn.role === "bot" &&
        turn.type === "tool" &&
        (turn as BotToolTurn).tool_calls.some((tool) => tool.id === toolId)
    ) as BotToolTurn | undefined;

    if (!toolTurn) return;

    const tool = toolTurn.tool_calls.find((tool) => tool.id === toolId);
    if (!tool) return;

    tool.result = result;
    this.turnMap.set(toolTurn.id, toolTurn);
    return toolTurn;
  };
}

export function makeBotDTMF(
  params: BotDTMFTurnParams
): Omit<BotDTMFTurn, "order" | "callSid"> {
  return {
    ...params,
    id: params.id ?? makeId("bot"),
    createdAt: new Date().toISOString(),
    role: "bot",
    type: "dtmf",
    interrupted: false,
  };
}

export function makeBotText(
  params: BotTextTurnParams
): Omit<BotTextTurn, "order" | "callSid"> {
  return {
    ...params,
    id: params.id ?? makeId("bot"),
    createdAt: new Date().toISOString(),
    role: "bot",
    type: "text",
    interrupted: false,
  };
}

export function makeBotTool(
  params: BotToolTurnParams
): Omit<BotToolTurn, "order" | "callSid"> {
  return {
    ...params,
    id: params.id ?? makeId("bot"),
    createdAt: new Date().toISOString(),
    role: "bot",
    type: "tool",
  };
}

export function makeHumanDTMF(
  params: HumanDTMFTurnParams
): Omit<HumanDTMFTurn, "order" | "callSid"> {
  return {
    ...params,
    id: params.id ?? makeId("hum"),
    createdAt: new Date().toISOString(),
    role: "human",
    type: "dtmf",
  };
}

export function makeHumanText(
  params: HumanTextTurnParams
): Omit<HumanTextTurn, "order" | "callSid"> {
  return {
    ...params,
    id: params.id ?? makeId("hum"),
    createdAt: new Date().toISOString(),
    role: "human",
    type: "text",
  };
}

export function makeSystemTurn(
  params: SystemTurnParams
): Omit<SystemTurn, "order" | "callSid"> {
  return {
    ...params,
    id: params.id ?? makeId("sys"),
    createdAt: new Date().toISOString(),
    role: "system",
  };
}
