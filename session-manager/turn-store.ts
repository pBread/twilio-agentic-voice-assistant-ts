import { makeId } from "../lib/ids";
import log from "../lib/logger";
import { TypedEventEmitter } from "../lib/types";
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

function _createVersionedObject<T extends { version: number }>(
  baseObject: T,
  emitUpdate: () => void
): T {
  // Store the actual property values in a separate object
  const propertyValues: Partial<T> = {};

  // Initialize property values from the base object
  for (const key of Object.keys(baseObject) as Array<keyof T>)
    if (key !== "version") propertyValues[key] = baseObject[key];

  // Create property descriptors for all properties
  const descriptors: PropertyDescriptorMap = {};

  for (const key of Object.keys(baseObject) as Array<keyof T>) {
    if (key === "version") {
      // special handling for version property
      descriptors[key as string] = {
        get() {
          return baseObject.version;
        },
        set(value: number) {
          baseObject.version = value;
          emitUpdate();
        },
        enumerable: true,
        configurable: true,
      };
    } else {
      // All other properties get versioned getters/setters
      descriptors[key as string] = {
        get() {
          return propertyValues[key];
        },
        set(value: any) {
          propertyValues[key] = value;
          baseObject.version++;
          emitUpdate();
        },
        enumerable: true,
        configurable: true,
      };
    }
  }

  // Create and return the versioned object
  return Object.defineProperties({} as T, descriptors);
}

type VersionedObject = { version: number };

// Add the extends object constraint to T
function createVersionedHandler<T extends object>(
  parentObject: VersionedObject,
  emitUpdate: () => void
): ProxyHandler<T> {
  return {
    get(target: any, prop: string | symbol) {
      const value = target[prop];

      // Handle array methods that modify the array
      if (Array.isArray(target)) {
        const arrayMethodHandler = createArrayMethodHandler(
          target,
          prop,
          parentObject,
          emitUpdate
        );
        if (arrayMethodHandler) return arrayMethodHandler;
      }

      // Recursively wrap objects and arrays
      if (typeof value === "object" && value !== null) {
        return new Proxy(
          value,
          createVersionedHandler(parentObject, emitUpdate)
        );
      }

      return value;
    },

    set(target: any, prop: string | symbol, value: any) {
      // Don't wrap the version property itself
      if (target === parentObject && prop === "version") {
        target[prop] = value;
        emitUpdate();
        return true;
      }

      // Handle nested objects and arrays
      if (typeof value === "object" && value !== null) {
        target[prop] = Array.isArray(value)
          ? [...value] // Create a new array to proxy
          : { ...value }; // Create a new object to proxy

        target[prop] = new Proxy(
          target[prop],
          createVersionedHandler(parentObject, emitUpdate)
        );
      } else {
        target[prop] = value;
      }

      // Increment version and emit update
      parentObject.version++;
      emitUpdate();
      return true;
    },

    deleteProperty(target: any, prop: string | symbol) {
      delete target[prop];
      parentObject.version++;
      emitUpdate();
      return true;
    },
  };
}

function createArrayMethodHandler(
  array: any[],
  prop: string | symbol,
  parentObject: VersionedObject,
  emitUpdate: () => void
) {
  const modifyingMethods = {
    push: (...items: any[]) => {
      const result = Array.prototype.push.apply(array, items);
      parentObject.version++;
      emitUpdate();
      return result;
    },
    pop: () => {
      const result = Array.prototype.pop.apply(array);
      parentObject.version++;
      emitUpdate();
      return result;
    },
    shift: () => {
      const result = Array.prototype.shift.apply(array);
      parentObject.version++;
      emitUpdate();
      return result;
    },
    unshift: (...items: any[]) => {
      const result = Array.prototype.unshift.apply(array, items);
      parentObject.version++;
      emitUpdate();
      return result;
    },
    splice: (
      ...args: [start: number, deleteCount: number, ...items: any[]]
    ) => {
      const result = Array.prototype.splice.apply(array, args);
      parentObject.version++;
      emitUpdate();
      return result;
    },
    sort: (compareFn?: (a: any, b: any) => number) => {
      const result = Array.prototype.sort.apply(array, [compareFn]);
      parentObject.version++;
      emitUpdate();
      return result;
    },
    reverse: () => {
      const result = Array.prototype.reverse.apply(array);
      parentObject.version++;
      emitUpdate();
      return result;
    },
  };

  return modifyingMethods[prop as keyof typeof modifyingMethods];
}

/**
 * Creates a versioned object that tracks all changes including nested properties
 */
function createVersionedObject<T extends VersionedObject>(
  baseObject: T,
  emitUpdate: () => void
): T {
  // Create a deep clone of the object to avoid modifying the original

  // Return a proxied version of the object
  return new Proxy(
    baseObject,
    createVersionedHandler<T>(baseObject, emitUpdate)
  );
}
