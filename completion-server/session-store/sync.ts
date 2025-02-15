import PQueue from "p-queue";
import { SyncClient, SyncMap } from "twilio-sync";
import log from "../../lib/logger.js";
import type { SessionContext } from "../../shared/session/context.js";
import type { TurnRecord } from "../../shared/session/turns.js";
import { createSyncToken } from "../../shared/sync/create-token.js";
import { makeContextMapName, makeTurnMapName } from "../../shared/sync/ids.js";

/****************************************************
 Sync Client
****************************************************/
// Cache holds sync clients between call initiation, which occurs in a webhook or rest API request, and the websocket initiliazation.
// note: To prevent memory leaks, the sync client is removed from the cache after it is retrieved the first time.
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
export async function setupSyncSession(callSid: string) {
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
  const getSyncToken = () => createSyncToken(`completion-server-${callSid}`);

  return new Promise((resolve, reject) => {
    let isResolved = false;
    const sync = new SyncClient(getSyncToken());

    // Error handling
    sync.on("connectionError", (error) => {
      log.error(
        "sync-client",
        `sync client connection error ${callSid}`,
        error
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
            `sync client connection ${connectionState}, ${callSid}`
          );
          if (!isResolved) {
            reject(error); // Reject with an error instead of the sync client
          }
      }
    });
  });
}

/****************************************************
 Sync Queue Service
****************************************************/
// todo: add service-level queue to ensure one call doesn't affect others
// todo: add global queue to ensure the webhook executions don't affect the other services

export class SyncQueueService {
  private queueCounts: Map<string, number> = new Map(); // Prevents updates from stacking. Updates occur much more quickly than the update requests resolve. We skip all update queue items except for the last one to ensure only no redundant updates fire.
  private queues: Map<string, PQueue> = new Map();

  public ctxMapPromise: Promise<SyncMap>;
  public turnMapPromise: Promise<SyncMap>;

  constructor(
    private callSid: string,
    private sync: SyncClient,
    private getContext: () => SessionContext,
    private getTurn: (turnId: string) => TurnRecord | undefined
  ) {
    this.ctxMapPromise = this.sync.map(makeContextMapName(callSid));
    this.turnMapPromise = this.sync.map(makeTurnMapName(callSid));
  }

  updateContext = async <K extends keyof SessionContext>(
    key: K
  ): Promise<void> => {
    const queueKey = `${this.callSid}:context:${key}`;
    const queue = this.getQueue(queueKey);

    try {
      await queue.add(async () => {
        const count = this.queueCounts.get(queueKey) || 0;
        if (count > 1) return this.queueCounts.set(queueKey, count - 1);

        const value = this.getContext()[key]; // get latest version of the context value
        this.queueCounts.delete(queueKey);

        if (typeof value !== "object") {
          log.warn(
            "sync-queue",
            `context item ${key} is not an object and could not be sent to sync. value: `,
            value
          );
        }

        const ctxMap = await this.ctxMapPromise;
        if (value === null || value === undefined)
          await ctxMap.remove(key); // removed undefined properties
        else await ctxMap.set(key, value as unknown as Record<string, unknown>);
      });
    } catch (error) {
      log.error(
        "sync-queue",
        `Failed to queue context update for ${queueKey}:`,
        error
      );
    }

    this.cleanupQueue(queue, queueKey);
  };

  updateTurn = async (turnId: string): Promise<void> => {
    const queueKey = `${this.callSid}:turn:${turnId}`;
    const queue = this.getQueue(queueKey);

    try {
      await queue.add(async () => {
        const count = this.queueCounts.get(queueKey) || 0;
        if (count > 1) return this.queueCounts.set(queueKey, count - 1);

        const turn = this.getTurn(turnId); // get latest version of the turn
        this.queueCounts.delete(queueKey);
        if (!turn) return; // the turn may have been deleted by the time this update was triggered

        const turnMap = await this.turnMapPromise;
        await turnMap.set(turnId, turn as unknown as Record<string, unknown>);
      });
    } catch (error) {
      log.error(
        "sync-queue",
        `Failed to queue turn update for ${queueKey}:`,
        error
      );
    }

    this.cleanupQueue(queue, queueKey);
  };

  addTurn = async (turn: TurnRecord): Promise<void> => {
    const queueKey = `${this.callSid}:turn:${turn.id}`;
    const queue = this.getQueue(queueKey);

    try {
      await queue.add(
        async () => {
          const turnMap = await this.turnMapPromise;
          await turnMap.set(
            turn.id,
            turn as unknown as Record<string, unknown>
          );
        },
        { priority: 1 } // Higher priority for new turns
      );
    } catch (error) {
      log.error(
        "sync-queue",
        `Failed to queue turn addition for ${queueKey}:`,
        error
      );
    }

    this.cleanupQueue(queue, queueKey);
  };

  deleteTurn = async (turnId: string): Promise<void> => {
    const queueKey = `${this.callSid}:turn:${turnId}`;
    const queue = this.getQueue(queueKey);

    try {
      await queue.add(async () => {
        const turnMap = await this.turnMapPromise;
        await turnMap.remove(turnId);
      });
    } catch (error) {
      log.error(
        "sync-queue",
        `Failed to queue turn deletion for ${queueKey}:`,
        error
      );
    }

    this.cleanupQueue(queue, queueKey);
  };

  private getQueue = (queueKey: string): PQueue => {
    let queue = this.queues.get(queueKey);
    if (!queue) {
      queue = new PQueue({
        concurrency: 1,
        intervalCap: 100,
        interval: 1000,
        carryoverConcurrencyCount: true,
        timeout: 10000,
      });

      queue.on("error", (error) => {
        log.error("sync-queue", `Queue ${queueKey} error:`, error);
      });

      this.queues.set(queueKey, queue);
    }

    return queue;
  };

  private cleanupQueue = (queue: PQueue, queueKey: string): void => {
    if (queue.size !== 0 || queue.pending !== 0) return; // do nothing if queue has items pending

    queue.removeAllListeners();
    this.queues.delete(queueKey);
  };
}
