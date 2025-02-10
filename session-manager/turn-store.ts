import { makeId } from "../lib/ids";
import log from "../lib/logger";
import { createVersionedObject } from "../lib/versioning";
import { TypedEventEmitter } from "../lib/events";
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
  private turnMap: Map<string, Turn>; // map order enforces turn ordering, not the order property on the turns

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
  addBotText = (params: BotTextTurnParams): BotTextTurn => {
    const id = params.id ?? makeId("bot");

    const turn: BotTextTurn = createVersionedObject(
      {
        content: params.content,
        createdAt: new Date().toISOString(),
        id,
        role: "bot",
        type: "text",
        interrupted: params.interrupted ?? false,

        callSid: this.callSid,
        order: this.nextOrder(),
        version: 0,
      } as BotTextTurn,
      () => this.eventEmitter.emit("updatedTurn", id)
    );

    this.turnMap.set(turn.id, turn);
    return turn;
  };

  addBotTool = (params: BotToolTurnParams): BotToolTurn => {
    const id = params.id ?? makeId("bot");

    const turn: BotToolTurn = createVersionedObject(
      {
        createdAt: new Date().toISOString(),
        id,
        role: "bot",
        type: "tool",
        tool_calls: params.tool_calls,

        callSid: this.callSid,
        order: this.nextOrder(),
        version: 0,
      } as BotToolTurn,
      () => this.eventEmitter.emit("updatedTurn", id)
    );

    this.turnMap.set(turn.id, turn);
    return turn;
  };

  /****************************************************
   Turn Setter Methods
  ****************************************************/

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

/****************************************************
 Turn Events
****************************************************/
interface TurnEvents {
  addedTurn: (turn: Turn) => void;
  updatedTurn: (id: string) => void;
}
