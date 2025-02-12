/**
 * @function createVersionedObject
 * @description Creates a versioned object that tracks changes to itself and all nested objects.
 * When any property of the object or its nested objects is modified, the version
 * number is incremented and an update event is emitted.
 *
 * This pattern is used to avoid excessive garbage collection that could occur given the numerous
 * updates that occur during completion streaming.
 *
 * IMPORTANT: Versioning is tracked via a JavaScript's Proxy class, which DOES NOT allow tracking
 * changes to the original reference. An unsuspecting developer may accidently bypass the
 * versioning and the data synchronization features of this app, if they do the following:
 *
 * ** BAD EXAMPLE **
 * const toolCall = { function: { name: "fnName", arguments: "" }, id: "tool-id-0",index: 0, type: "function" };
 * session.turns.addBotTool({ tool_calls: [toolCall] });
 * toolCall.function.arguments += "{ 'hello': 'world' } " // this will not be reflected in the turn store
 * *****************
 *
 * However, in my opinion, no one should expect that pattern to work anyway when creating records in a store.
 * If you made this mistake, now you know to never assume an original object can be mutated after passing it
 * to some class – even if you wrote it yourself.
 *
 * These examples will all work, however.
 *
 * ** GOOD EXAMPLE **
 * const toolCall = { function: { name: "fnName", arguments: "" }, id: "tool-id-0",index: 0, type: "function" };
 * const turn = session.turns.addBotTool({ tool_calls: [toolCall] });
 * turn.tool_calls[0].function.arguments += "{ 'hello': 'world' } "; // this will be reflected
 * ******************
 *
 * ** GOOD EXAMPLE **
 * const turn = session.turns.addBotTool({ tool_calls: [{ function: { name: "fnName", arguments: "" }, id: "tool-id-0",index: 0, type: "function" }] });
 * const toolCall = turn.tool_calls[0]
 * toolCall.function.arguments += "{ 'hello': 'world' } "; // this will be reflected
 * ******************
 *
 * @template T - The type of object to be versioned (must include a version number property)
 * @param baseObject - The object to be versioned
 * @param emitUpdate - Callback function to be called when the object is modified
 * @returns A proxied version of the object that tracks all changes
 */

export function createVersionedObject<T extends VersionedObject>(
  baseObject: T,
  emitUpdate: () => void
): T {
  const clonedObject = JSON.parse(JSON.stringify(baseObject));
  return new Proxy(
    clonedObject,
    createVersionedHandler<T>(clonedObject, emitUpdate)
  );
}

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
      } else target[prop] = value;

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

// emits update events when an array is mutated
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

type VersionedObject = { version: number };
