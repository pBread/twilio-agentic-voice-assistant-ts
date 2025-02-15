import { SyncClient, SyncMap } from "twilio-sync";
import log from "../../lib/logger.js";
import type { TurnRecord } from "../../shared/session/turns.js";
import { createSyncToken } from "../../shared/sync/create-token.js";
import { makeContextMapName, makeTurnMapName } from "../../shared/sync/ids.js";

// Cache holds sync clients between call initiation, which occurs in a webhook or rest API request, and the websocket initiliazation.
// note: To prevent memory leaks, the sync client is removed from the cache after it is retrieved the first time.
const tempSyncClientCache = new Map<
  string,
  { sync: SyncClient; timeout: NodeJS.Timeout }
>();
export function getSyncClient(callSid: string) {
  const entry = tempSyncClientCache.get(callSid);
  if (!entry) {
    const error = `No sync client found for ${callSid}.`;
    log.error("sync", error);
    throw new Error(error);
  }

  clearTimeout(entry.timeout);
  tempSyncClientCache.delete(callSid);

  return entry.sync;
}

export async function initSyncClient(callSid: string) {
  const sync = await createSyncClient(callSid);

  const timeout = setTimeout(() => {
    // delete unaccessed sync clients after 5 minutes to avoid memory leaks
    const entry = tempSyncClientCache.get(callSid);
    const sync = entry?.sync;
    if (!sync) return;

    sync.removeAllListeners();
    sync.shutdown();

    tempSyncClientCache.delete(callSid);
    log.warn("sync", `cleaned up unused sync client for ${callSid}`);
  }, 5 * 60 * 1000);

  tempSyncClientCache.set(callSid, { sync, timeout });

  return sync;
}

async function createSyncClient(callSid: string): Promise<SyncClient> {
  const getSyncToken = () => createSyncToken(`completion-server-${callSid}`);

  return new Promise((resolve, reject) => {
    let isResolved = false;
    const sync = new SyncClient(getSyncToken());

    // Error handling
    sync.on("connectionError", (error) => {
      log.error("sync", `sync client connection error ${callSid}`, error);
      if (!isResolved) {
        reject(error); // Reject with the error instead of the sync client
      }
    });

    // Token management
    sync.on("tokenAboutToExpire", () => sync.updateToken(getSyncToken()));
    sync.on("tokenExpired", () => {
      log.warn("sync", `sync token expired ${callSid}`);
      sync.updateToken(getSyncToken());
    });

    sync.on("connectionStateChanged", (connectionState) => {
      switch (connectionState) {
        case "connecting":
          return;
        case "connected":
          log.info("sync", `sync client initialized for ${callSid}`);
          isResolved = true;
          resolve(sync);
          return;

        case "denied":
        case "disconnected":
        case "disconnecting":
        case "error":
        case "unknown":
          const error = new Error(`Sync client connection ${connectionState}`);
          log.error(
            "sync",
            `sync client connection ${connectionState}, ${callSid}`
          );
          if (!isResolved) {
            reject(error); // Reject with an error instead of the sync client
          }
      }
    });
  });
}

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
