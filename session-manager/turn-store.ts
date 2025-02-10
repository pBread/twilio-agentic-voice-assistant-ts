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

  private _currentOrder: number = 0;
  public get currentOrder() {
    return this._currentOrder;
  }
  private nextOrder = () => this._currentOrder++;

  delete = (id: string) => this.turnMap.delete(id);
  get = (id: string) => this.turnMap.get(id);
  list = () => [...this.turnMap.values()];

  addBotDTMF = (params: BotDTMFTurnParams): BotDTMFTurn => {
    const turn = makeBotDTMFTurn(params);
    const fullTurn = {
      ...turn,
      callSid: this.callSid,
      order: this.nextOrder(),
    };
    this.turnMap.set(fullTurn.id, fullTurn);
    return fullTurn;
  };

  addBotText = (params: BotTextTurnParams): BotTextTurn => {
    const turn = makeBotTextTurn(params);
    const fullTurn = {
      ...turn,
      callSid: this.callSid,
      order: this.nextOrder(),
    };
    this.turnMap.set(fullTurn.id, fullTurn);
    return fullTurn;
  };

  addBotTool = (params: BotToolTurnParams): BotToolTurn => {
    const turn = makeBotToolTurn(params);
    const fullTurn = {
      ...turn,
      callSid: this.callSid,
      order: this.nextOrder(),
    };
    this.turnMap.set(fullTurn.id, fullTurn);
    return fullTurn;
  };

  addHumanDTMF = (params: HumanDTMFTurnParams): HumanDTMFTurn => {
    const turn = makeHumanDTMFTurn(params);
    const fullTurn = {
      ...turn,
      callSid: this.callSid,
      order: this.nextOrder(),
    };
    this.turnMap.set(fullTurn.id, fullTurn);
    return fullTurn;
  };

  addHumanText = (params: HumanTextTurnParams): HumanTextTurn => {
    const turn = makeHumanTextTurn(params);
    const fullTurn = {
      ...turn,
      callSid: this.callSid,
      order: this.nextOrder(),
    };
    this.turnMap.set(fullTurn.id, fullTurn);
    return fullTurn;
  };

  addSystem = (params: SystemTurnParams): SystemTurn => {
    const turn = makeSystemTurn(params);
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

export function makeBotDTMFTurn(
  params: BotDTMFTurnParams
): Omit<BotDTMFTurn, "order" | "callSid"> {
  return {
    ...params,
    createdAt: new Date().toISOString(),
    id: params.id ?? makeId("bot"),
    interrupted: params.interrupted ?? false,
    role: "bot",
    type: "dtmf",
  };
}

export function makeBotTextTurn(
  params: BotTextTurnParams
): Omit<BotTextTurn, "order" | "callSid"> {
  return {
    ...params,
    createdAt: new Date().toISOString(),
    id: params.id ?? makeId("bot"),
    interrupted: params.interrupted ?? false,
    role: "bot",
    type: "text",
  };
}

export function makeBotToolTurn(
  params: BotToolTurnParams
): Omit<BotToolTurn, "order" | "callSid"> {
  return {
    ...params,
    createdAt: new Date().toISOString(),
    id: params.id ?? makeId("bot"),
    role: "bot",
    type: "tool",
  };
}

export function makeHumanDTMFTurn(
  params: HumanDTMFTurnParams
): Omit<HumanDTMFTurn, "order" | "callSid"> {
  return {
    ...params,
    createdAt: new Date().toISOString(),
    id: params.id ?? makeId("hum"),
    role: "human",
    type: "dtmf",
  };
}

export function makeHumanTextTurn(
  params: HumanTextTurnParams
): Omit<HumanTextTurn, "order" | "callSid"> {
  return {
    ...params,
    createdAt: new Date().toISOString(),
    id: params.id ?? makeId("hum"),
    role: "human",
    type: "text",
  };
}

export function makeSystemTurn(
  params: SystemTurnParams
): Omit<SystemTurn, "order" | "callSid"> {
  return {
    ...params,
    createdAt: new Date().toISOString(),
    id: params.id ?? makeId("sys"),
    role: "system",
  };
}
