import type { SyncClient, SyncMap } from "twilio-sync";
import { TurnRecord } from "../session/turns.js";
import { makeContextMapName, makeTurnMapName } from "./ids.js";

export class SyncSession {
  private ctxMapPromise: Promise<SyncMap>;
  private turnMapPromise: Promise<SyncMap>;

  constructor(private sync: SyncClient, private callSid: string) {
    this.ctxMapPromise = this.sync.map(makeContextMapName(callSid)); // creates a sync map
    this.turnMapPromise = this.sync.map(makeTurnMapName(callSid)); // creates a sync map
  }

  setContextItem = async (key: string, value: any) => {
    const ctxMap = await this.ctxMapPromise;
    await ctxMap.set(key, value);
  };

  setTurn = async (turnId: string, turn: TurnRecord) => {
    const turnMap = await this.turnMapPromise;
    await turnMap.set(turnId, turn as Record<string, any>);
  };
}
