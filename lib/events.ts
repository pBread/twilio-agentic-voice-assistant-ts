import { EventEmitter } from "node:events";

export class TypedEventEmitter<Events = {}> extends EventEmitter {
  emit = <K extends keyof Events & (string | symbol)>(
    event: K,
    ...args: Parameters<
      Events[K] extends (...args: any[]) => any ? Events[K] : never
    >
  ): boolean => super.emit(event, ...args);

  on = <K extends keyof Events & (string | symbol)>(
    event: K,
    listener: Events[K] extends (...args: any[]) => any ? Events[K] : never,
  ): this => super.on(event, listener);
}
