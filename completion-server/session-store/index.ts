import { TypedEventEmitter } from "../../lib/events";
import log from "../../lib/logger";
import type { BotTextTurn, TurnEvents, TurnRecord } from "../../shared/session";
import { ContextStore } from "./context-store";
import { TurnStore } from "./turn-store";

export type * from "./context-store";
export type * from "./turn-store";

export class SessionStore {
  context: ContextStore;
  turns: TurnStore;

  constructor(public callSid: string) {
    this.context = new ContextStore();
    this.turns = new TurnStore(callSid);

    // bubble up the events from each child
    this.eventEmitter = new TypedEventEmitter<TurnEvents>();

    this.turns.on("turnAdded", (...args) =>
      this.eventEmitter.emit("turnAdded", ...args)
    );
    this.turns.on("turnDeleted", (...args) =>
      this.eventEmitter.emit("turnDeleted", ...args)
    );
    this.turns.on("turnUpdated", (...args) =>
      this.eventEmitter.emit("turnUpdated", ...args)
    );
  }

  redactInterruption = (interruptedClause: string) => {
    // LLMs generate text responses much faster than the words are spoken to the user. When an interruption occurs, there are messages stored in local state that were not and never will be communicated. These records need to be cleaned up or else the bot will think it said things it did not and the conversation will discombobulate.

    // Step 1: Find the local message record that was interrupted. Convo Relay tells you what chunk of text, typically a sentence or clause, was interrupted. That clause is used to find the interrupted message.
    const turnsDecending = this.turns.list().reverse();
    const interruptedTurn = turnsDecending.find(
      (turn) =>
        turn.role === "bot" &&
        turn.type === "text" &&
        turn.content.includes(interruptedClause)
    ) as BotTextTurn | undefined;

    if (!interruptedTurn) return;

    let deletedTurns: TurnRecord[] = [];

    turnsDecending
      .filter(
        (turn) =>
          turn.order > interruptedTurn.order && // only delete messages after the interrupted messages
          turn.role === "bot" // delete bot messages, both text & tools. note: system messages will not be deleted
      )
      .forEach((turn) => {
        this.turns.delete(turn.id);
        deletedTurns.push(turn);
      });

    // Step 3: Update the interrupted message to reflect what was actually spoken. Note, sometimes the interruptedClause is very long. The bot may have spoken some or most of it. So, the question is, should the interrupted clause be included or excluded. Here, it is being included but it's a judgement call.
    const curContent = interruptedTurn.content as string;
    const [newContent] = curContent.split(interruptedClause);
    interruptedTurn.content = `${newContent} ${interruptedClause}`.trim();
    interruptedTurn.interrupted = true;

    log.info(
      "store",
      `local state updated to reflect interruption: `,
      interruptedTurn.content
    );
  };

  /****************************************************
   Event Typing
  ****************************************************/
  private eventEmitter: TypedEventEmitter<TurnEvents>;
  public on: TypedEventEmitter<TurnEvents>["on"] = (...args) =>
    this.eventEmitter.on(...args);
}
