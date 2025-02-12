import { TypedEventEmitter } from "../../lib/events";
import { makeId } from "../../lib/ids";
import type {
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
  TurnEvents,
  TurnRecord,
} from "../../shared/turns";
import { createVersionedObject } from "./versioning";

export class TurnStore {
  private callSid: string;
  private turnMap: Map<string, TurnRecord>; // map order enforces turn ordering, not the order property on the turns

  constructor(callSid: string) {
    this.callSid = callSid;
    this.turnMap = new Map();
    this.eventEmitter = new TypedEventEmitter<TurnEvents>();
  }

  /****************************************************
   Events
  ****************************************************/
  private eventEmitter: TypedEventEmitter<TurnEvents>;
  public on: TypedEventEmitter<TurnEvents>["on"] = (...args) =>
    this.eventEmitter.on(...args);

  /****************************************************
   Turn Sequential Ordering
  ****************************************************/
  private _currentOrder: number = 0; // order is a non-sequential incrementor. Each turn is only gauranteed to have an order value greater than the previous. In other words, order is not always exactly +1 greater than the previous.
  // currentOrder cannot be mutated by external methods to protect order sequence
  public get currentOrder() {
    return this._currentOrder;
  }
  private nextOrder = () => this._currentOrder++;

  /****************************************************
   Primitive Methods
  ****************************************************/
  delete = (id: string) => this.turnMap.delete(id);
  get = (id: string) => this.turnMap.get(id);
  list = () => [...this.turnMap.values()];

  /****************************************************
   Turn Record Creators
  ****************************************************/
  addBotDTMF = (params: BotDTMFTurnParams): BotDTMFTurn => {
    const id = params.id ?? makeId("bot");

    const turn: BotDTMFTurn = createVersionedObject(
      {
        callSid: this.callSid,
        content: params.content,
        createdAt: new Date().toISOString(),
        id,
        interrupted: params.interrupted ?? false,
        order: this.nextOrder(),
        role: "bot",
        type: "dtmf",
        version: 0,
      } as BotDTMFTurn,
      () => this.eventEmitter.emit("turnUpdated", id)
    );

    this.turnMap.set(turn.id, turn);
    return turn;
  };

  addBotText = (params: BotTextTurnParams): BotTextTurn => {
    const id = params.id ?? makeId("bot");

    const turn: BotTextTurn = createVersionedObject(
      {
        callSid: this.callSid,
        content: params.content,
        createdAt: new Date().toISOString(),
        id,
        interrupted: params.interrupted ?? false,
        order: this.nextOrder(),
        role: "bot",
        type: "text",
        version: 0,
      } as BotTextTurn,
      () => this.eventEmitter.emit("turnUpdated", id)
    );

    this.turnMap.set(turn.id, turn);
    return turn;
  };

  addBotTool = (params: BotToolTurnParams): BotToolTurn => {
    const id = params.id ?? makeId("bot");

    const turn: BotToolTurn = createVersionedObject(
      {
        callSid: this.callSid,
        createdAt: new Date().toISOString(),
        id,
        order: this.nextOrder(),
        role: "bot",
        tool_calls: params.tool_calls,
        type: "tool",
        version: 0,
      } as BotToolTurn,
      () => this.eventEmitter.emit("turnUpdated", id)
    );

    this.turnMap.set(turn.id, turn);
    return turn;
  };

  addHumanDTMF = (params: HumanDTMFTurnParams): HumanDTMFTurn => {
    const id = params.id ?? makeId("hum");

    const turn: HumanDTMFTurn = createVersionedObject(
      {
        callSid: this.callSid,
        content: params.content,
        createdAt: new Date().toISOString(),
        id,
        order: this.nextOrder(),
        role: "human",
        type: "dtmf",
        version: 0,
      } as HumanDTMFTurn,
      () => this.eventEmitter.emit("turnUpdated", id)
    );

    this.turnMap.set(turn.id, turn);
    return turn;
  };

  addHumanText = (params: HumanTextTurnParams): HumanTextTurn => {
    const id = params.id ?? makeId("hum");

    const turn: HumanTextTurn = createVersionedObject(
      {
        callSid: this.callSid,
        content: params.content,
        createdAt: new Date().toISOString(),
        id,
        order: this.nextOrder(),
        role: "human",
        type: "text",
        version: 0,
      } as HumanTextTurn,
      () => this.eventEmitter.emit("turnUpdated", id)
    );

    this.turnMap.set(turn.id, turn);
    return turn;
  };

  addSystem = (params: SystemTurnParams): SystemTurn => {
    const id = params.id ?? makeId("sys");

    const turn: SystemTurn = createVersionedObject(
      {
        callSid: this.callSid,
        content: params.content,
        createdAt: new Date().toISOString(),
        id,
        order: this.nextOrder(),
        role: "system",
        version: 0,
      } as SystemTurn,
      () => this.eventEmitter.emit("turnUpdated", id)
    );

    this.turnMap.set(turn.id, turn);
    return turn;
  };

  /****************************************************
   Turn Setter Methods
  ****************************************************/
  setToolResult = (toolId: string, result: object) => {
    const toolTurn = this.list().find(
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
