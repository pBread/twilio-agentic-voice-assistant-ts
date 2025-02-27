import { SyncClient } from "twilio-sync";
import { getMakeLogger } from "../../lib/logger.js";
import { createSyncToken } from "../../shared/sync/create-token.js";
import { makeContextMapName, makeTurnMapName } from "../../shared/sync/ids.js";

// todo: throw errors if the sync data format is not valid. right now, the call simply fails and there's no indication why

/****************************************************
 Sync Client
****************************************************/
// Cache holds sync clients between call initiation, which occurs in a webhook or rest API request, and the websocket initiliazation.
// note: To prevent memory leaks, the sync client is removed from the cache after it is retrieved the first time and a timeout is set to remove it if it hasn't been accessed w/in a certain time.
const tempSyncClientCache = new Map<
  string,
  { sync: SyncClient; timeout: NodeJS.Timeout }
>();

/**
 * Retrieves and removes a Sync client from the temporary cache.
 * @param callSid - The unique identifier for the call session
 * @returns The cached Sync client
 * @throws {Error} If no Sync client is found for the given callSid
 */
export function getSyncClient(callSid: string) {
  const log = getMakeLogger(callSid);
  const entry = tempSyncClientCache.get(callSid);
  if (!entry) {
    const error = `No sync client found for ${callSid}.`;
    log.error("sync-client", error);
    throw new Error(error);
  }

  clearTimeout(entry.timeout);
  tempSyncClientCache.delete(callSid);

  return entry.sync;
}

/**
 * Sets up a complete Sync session for a call, including the client and data structures.
 * Creates a Sync client and initializes required map containers for the call session.
 * The client is temporarily cached and will be cleaned up if not retrieved within 5 minutes.
 *
 * @param callSid - The unique identifier for the call session
 * @returns A connected Sync client ready for use
 * @throws {Error} If client connection fails or map creation fails
 */
export async function warmUpSyncSession(callSid: string) {
  const log = getMakeLogger(callSid);
  const sync = await createSyncClient(callSid); // initialize client and wait for connection

  await Promise.all([
    sync.map(makeContextMapName(callSid)), // create sync records for call
    sync.map(makeTurnMapName(callSid)),
  ]);

  const timeout = setTimeout(() => {
    // delete unaccessed sync clients after 5 minutes to avoid memory leaks
    const entry = tempSyncClientCache.get(callSid);
    const sync = entry?.sync;
    if (!sync) return;

    sync.removeAllListeners();
    sync.shutdown();

    tempSyncClientCache.delete(callSid);
    log.warn("sync-client", `cleaned up unused sync client for ${callSid}`);
  }, 5 * 60 * 1000);

  tempSyncClientCache.set(callSid, { sync, timeout });

  return sync;
}

/**
 * Creates and initializes a new Sync client with automatic token management.
 * Waits for the client to establish a connection before resolving.
 *
 * @param callSid - The unique identifier for the call session
 * @returns A Promise that resolves to a connected Sync client
 * @throws {Error} If connection is denied or encounters an error
 *
 * @remarks
 * The client includes automatic token refresh handling and will:
 * - Update the token when it's about to expire
 * - Attempt token refresh when expired
 * - Log all connection state changes and errors
 */
async function createSyncClient(callSid: string): Promise<SyncClient> {
  const log = getMakeLogger(callSid);
  const getSyncToken = () => createSyncToken(`completion-server-${callSid}`);

  return new Promise((resolve, reject) => {
    let isResolved = false;
    const sync = new SyncClient(getSyncToken());

    // Error handling
    sync.on("connectionError", (error) => {
      log.error(
        "sync-client",
        `sync client connection error ${callSid}`,
        error,
      );
      if (!isResolved) {
        reject(error); // Reject with the error instead of the sync client
      }
    });

    // Token management
    sync.on("tokenAboutToExpire", () => sync.updateToken(getSyncToken()));
    sync.on("tokenExpired", () => {
      log.warn("sync-client", `sync token expired ${callSid}`);
      sync.updateToken(getSyncToken());
    });

    sync.on("connectionStateChanged", (connectionState) => {
      switch (connectionState) {
        case "connecting":
          return;
        case "connected":
          log.info("sync-client", `sync client initialized for ${callSid}`);
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
            `sync client connection ${connectionState}, ${callSid}`,
          );
          if (!isResolved) {
            reject(error); // Reject with an error instead of the sync client
          }
      }
    });
  });
}
