import PQueue from "p-queue";
import twilio from "twilio";
import { SyncClient, type SyncMap } from "twilio-sync";
import log, { getMakeLogger } from "../../lib/logger.js";
import {
  TWILIO_ACCOUNT_SID as accountSid,
  TWILIO_API_KEY,
  TWILIO_API_SECRET,
  TWILIO_SYNC_SVC_SID,
} from "../../shared/env.js";
import type {
  CallDetails,
  SessionContext,
  SessionMetaData,
} from "../../shared/session/context.js";
import type { TurnRecord } from "../../shared/session/turns.js";
import {
  CALL_STREAM,
  makeContextMapName,
  makeTurnMapName,
} from "../../shared/sync/ids.js";
import debounce from "lodash.debounce";

/**
 * @fileoverview
 * This module provides services for managing synchronization with Twilio Sync.
 * It implements a multi-level queuing system to manage data updates:
 * 1. Per-key sequential queues - Ensures updates to the same key happen in order
 * 2. Rate-limited queues - Enforces Twilio Sync service rate limits
 * 3. Debounced updates - Combines rapid-fire updates (like streaming LLM completions)
 */

// https://www.twilio.com/docs/sync/limits#sync-activity-limits
const SYNC_WRITE_RATE_LIMIT = 17; // maximum: 20 writes per second per object and 2 writes per second if object is >10kb (this could be an issue w/context)
const SYNC_BURST_WINDOW = 2 * 1000; // 10 second burst window max
const TURN_UPDATE_DEBOUNCE_MIN = 50; // wait to execute any turn update
const TURN_UPDATE_DEBOUNCE_MAX = 150; // maximum wait before executing

/**
 * @class SyncQueueService
 * Manages synchronization of session data with Twilio Sync.
 * Implements three levels of queuing:
 * 1. Per-key sequential queues - Each context property or turn has its own queue to ensure sequential consistency
 * 2. Rate-limited queues - Separate queues for context and turns that respect Twilio Sync rate limits
 * 3. Debounced updates - For turns, combines rapid updates into single sync operations
 */
export class SyncQueueService {
  private queueCounts: Map<string, number> = new Map(); // map to track pending update counts to prevent stacking
  private queues: Map<string, PQueue> = new Map(); // map of queues that ensure sequential consistency

  public ctxMapPromise: Promise<SyncMap>; // Sync Map instance that stores SessionContext. It is promisfied to ensure the SyncMap is created before the NewCallStreamMsg is sent out
  public turnMapPromise: Promise<SyncMap>; // Sync Map instance that stores SessionContext. It is promisfied to ensure the SyncMap is created before the NewCallStreamMsg is sent out

  private log: ReturnType<typeof getMakeLogger>;

  private contextQueue: PQueue; // rate limiting queue for context updates
  private turnQueue: PQueue; // rate limiting queue for turn updates

  /**
   * @constructor
   * @param {string} callSid - the Twilio call SID
   * @param {SyncClient} sync - Twilio Sync client instance
   * @param {Function} getContext - function that returns the current session context
   * @param {Function} getTurn - function that returns a specific turn record
   */
  constructor(
    private callSid: string,
    private sync: SyncClient,
    private getContext: () => Partial<SessionContext>,
    private getTurn: (turnId: string) => TurnRecord | undefined,
  ) {
    this.log = getMakeLogger(callSid);

    this.ctxMapPromise = this.sync.map(makeContextMapName(this.callSid));
    this.turnMapPromise = this.sync.map(makeTurnMapName(this.callSid));

    // configure rate-limited queue for context updates
    this.contextQueue = new PQueue({
      concurrency: 50, // concurrency doesn't matter
      intervalCap: SYNC_WRITE_RATE_LIMIT * (SYNC_BURST_WINDOW / 1000), // total operations allowed per burst window
      interval: SYNC_BURST_WINDOW, // length of the burst window in milliseconds
      carryoverConcurrencyCount: true,
      timeout: 15 * 1000,
    });

    // configure rate-limited queue for turn updates
    this.turnQueue = new PQueue({
      concurrency: 50, // concurrency doesn't matter
      intervalCap: SYNC_WRITE_RATE_LIMIT * (SYNC_BURST_WINDOW / 1000), // total operations allowed per burst window
      interval: SYNC_BURST_WINDOW, // length of the burst window in milliseconds
      carryoverConcurrencyCount: true,
      timeout: 15 * 1000,
    });

    this.setupErrorHandling(this.contextQueue, "contextQueue");
    this.setupErrorHandling(this.turnQueue, "turnQueue");

    this.initialize();
  }

  private initialize = async () => {
    await this.ctxMapPromise; // SyncMap is created when this resolves
    await this.turnMapPromise; // SyncMap is created when this resolves
    await this.sendNewCallStreamMsg(); // emit an event that a new call is initialized. used by the ui to detect new calls
  };

  /**
   * Send a Sync Stream event to notify external systems that a new call has started.
   */
  sendNewCallStreamMsg = async () => {
    const client = twilio(TWILIO_API_KEY, TWILIO_API_SECRET, { accountSid });

    const syncSvcApi = client.sync.v1.services(TWILIO_SYNC_SVC_SID);
    const map = await syncSvcApi
      .syncMaps(makeContextMapName(this.callSid))
      .fetch();

    await syncSvcApi.syncStreams
      .create({ uniqueName: CALL_STREAM })
      .catch((error) => {
        if (
          typeof error === "object" &&
          "code" in error &&
          error.code === 54301
        ) {
          return; // ignore unique name already exists errors because this is always called https://www.twilio.com/docs/api/errors/54301
        }

        log.error("sync.queue", "error creating stream", error);
      });

    // note: this must match the SessionMetaData in the UI's store
    const session: SessionMetaData = {
      id: this.callSid,
      callSid: this.callSid,
      dateCreated: map.dateCreated.toISOString(),
    };

    await syncSvcApi
      .syncStreams(CALL_STREAM)
      .streamMessages.create({ data: session });
  };

  /**
   * Updates a specific property of the session context in Twilio Sync.
   * Uses two levels of queuing:
   * 1. Per-key queue ensures sequential updates to the same property
   * 2. Rate-limited contextQueue ensures Sync rate limits are respected
   *
   * @param {K} key - The key of the context property to update
   */

  updateContext = async <K extends keyof SessionContext>(
    key: K,
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
          this.log.warn(
            "sync.queue",
            `context item ${key} is not an object and could not be sent to sync. value: `,
            value,
          );
        }

        // rate limit context updates
        await this.contextQueue.add(async () => {
          const ctxMap = await this.ctxMapPromise;
          if (value === null || value === undefined)
            await ctxMap.remove(key); // removed undefined properties
          else
            await ctxMap.set(key, value as unknown as Record<string, unknown>);
        });
      });
    } catch (error) {
      if (isSyncMapItemNotFound(error)) {
        this.log.warn(
          "sync.queue",
          `Failed to remove the SyncMapItem holding context property ${key}.`,
        );
        return;
      }
      this.log.error(
        "sync.queue",
        `Failed to queue context update for ${queueKey}:`,
        error,
      );
    }

    this.cleanupQueue(queue, queueKey);
  };

  private updateDebounceMap = new Map<string, ReturnType<typeof debounce>>(); // map storing debounced update functions for each turn
  /**
   * Updates a turn record in Twilio Sync.
   * Implements all three levels of queuing:
   * 1. Per-turn queue ensures sequential updates to the same turn
   * 2. Debounced updates combine rapid LLM streaming updates (dozens per second)
   * 3. Rate-limited turnQueue ensures Sync rate limits are respected
   *
   * @param {string} turnId - ID of the turn to update
   */
  updateTurn = async (turnId: string): Promise<void> => {
    const queueKey = `${this.callSid}:turn:${turnId}`;
    const queue = this.getQueue(queueKey);

    // turns are streamed from the LLM provider. there can be dozens of updates within a second or two. the update requests are debounced to ensure the
    let debouncedFn = this.updateDebounceMap.get(queueKey);

    if (!debouncedFn) {
      const fn = async () => {
        try {
          await queue.add(async () => {
            // After function executes, remove it from the map
            this.updateDebounceMap.delete(queueKey);

            const turn = this.getTurn(turnId);
            if (!turn) return;

            await this.turnQueue.add(async () => {
              const turnMap = await this.turnMapPromise;
              await turnMap.set(
                turnId,
                turn as unknown as Record<string, unknown>,
              );
            });
          });
        } catch (error) {
          this.log.error(
            "sync.queue",
            `Failed to execute turn update for ${queueKey}:`,
            error,
          );
          this.updateDebounceMap.delete(queueKey); // cleanup on error
        }
      };

      // wait at least 50ms before executing updates, wait a maximum of 100ms
      debouncedFn = debounce(fn, TURN_UPDATE_DEBOUNCE_MIN, {
        leading: false, // don't execute immediately
        trailing: true, // execute after
        maxWait: TURN_UPDATE_DEBOUNCE_MAX,
      });

      this.updateDebounceMap.set(queueKey, debouncedFn);
    }

    debouncedFn();

    this.cleanupQueue(queue, queueKey);
  };

  /**
   * Creates a new Sync Map Item for a Turn.
   *
   * Uses two levels of priority:
   * 1. Per-turn queue with higher priority than updates. addTurn & updateTurn share a queueKey and addTurn is given higher priority to ensure updates are sent only after the SyncMapItem is created.
   * 2. Rate-limited turnQueue ensures Sync rate limits are respected
   *
   * @param {TurnRecord} turn - Turn record to add to Sync
   */
  addTurn = async (turn: TurnRecord): Promise<void> => {
    const queueKey = `${this.callSid}:turn:${turn.id}`;
    const queue = this.getQueue(queueKey);

    try {
      await queue.add(
        async () => {
          // rate-limited turn queue with higher priority
          await this.turnQueue.add(
            async () => {
              const turnMap = await this.turnMapPromise;
              await turnMap.set(
                turn.id,
                turn as unknown as Record<string, unknown>,
              );
            },
            { priority: 1 },
          ); // higher priority within the rate-limited queue
        },
        { priority: 1 }, // higher priority for new turns in the local queue
      );
    } catch (error) {
      this.log.error(
        "sync.queue",
        `Failed to queue turn addition for ${queueKey}:`,
        error,
      );
    }

    this.cleanupQueue(queue, queueKey);
  };

  /**
   * Deletes a Turn's Sync Map Item.
   * Uses two levels of queuing:
   * 1. Per-turn queue ensures sequential operations
   * 2. Rate-limited turnQueue ensures Sync rate limits are respected
   *
   * @param {string} turnId - ID of the turn to delete
   */

  deleteTurn = async (turnId: string): Promise<void> => {
    const queueKey = `${this.callSid}:turn:${turnId}`;
    const queue = this.getQueue(queueKey);

    try {
      await queue.add(async () => {
        await this.turnQueue.add(async () => {
          const turnMap = await this.turnMapPromise;
          await turnMap.remove(turnId);
        });
      });
    } catch (error) {
      if (isSyncMapItemNotFound(error)) {
        this.log.warn(
          "sync.queue",
          `Attempted to delete turn but it did not exist. It may have already been deleted. turnId: ${turnId}`,
        );
      } else
        this.log.error(
          "sync.queue",
          `Failed to queue turn deletion for ${queueKey}`,
        );
    }

    this.cleanupQueue(queue, queueKey);
  };

  /**
   * Gets or creates a per-key queue for sequential operations
   * @param {string} queueKey - The unique key identifying the queue
   * @returns {PQueue} The queue instance for this key
   */
  private getQueue = (queueKey: string): PQueue => {
    let queue = this.queues.get(queueKey);
    if (!queue) {
      queue = new PQueue({
        concurrency: 1,
        intervalCap: 100,
        interval: 1000,
        carryoverConcurrencyCount: true,
        timeout: 10 * 1000,
      });

      queue.on("error", (error) => {
        if (isSyncMapItemNotFound(error)) {
          log.warn(
            "sync.queue",
            `sync error: unable to find item. ${queueKey}`,
          );
          return;
        }
        if (isSyncRateLimitError(error)) {
          this.log.error(
            "sync.queue",
            `sync rate limiting error: ${error.code}`,
          );
          return;
        }

        this.log.error("sync.queue", `Queue ${queueKey} error:`, error);
      });

      this.queues.set(queueKey, queue);
    }

    return queue;
  };

  /**
   * Removes empty queues to prevent memory leaks
   */
  private cleanupQueue = (queue: PQueue, queueKey: string): void => {
    if (queue.size !== 0 || queue.pending !== 0) return; // do nothing if queue has items pending

    queue.removeAllListeners();
    this.queues.delete(queueKey);
  };

  private setupErrorHandling(queue: PQueue, queueName: string): void {
    queue.on("error", (error) => {
      if (isSyncMapItemNotFound(error)) {
        this.log.warn(
          "sync.queue",
          `sync error: unable to find item in ${queueName}.`,
        );
        return;
      }
      if (isSyncRateLimitError(error)) {
        this.log.error(
          "sync.queue",
          `sync rate limiting error in ${queueName}: ${error.code}`,
        );
        return;
      }

      this.log.error("sync.queue", `${queueName} error:`, error);
    });
  }
}

function isSyncMapItemNotFound(error: any) {
  return (
    typeof error === "object" &&
    "status" in error &&
    "code" in error &&
    error.status === 404 &&
    error.code === 54201
  );
}

function isSyncRateLimitError(error: any) {
  return (
    typeof error === "object" &&
    "status" in error &&
    "code" in error &&
    error.status === 429 &&
    error.code === 54009
  );
}

/****************************************************
  REST API Methods
****************************************************/
/**
 * Updates the status of a Twilio Sync Map Item that holds the "call" details.
 *
 * This function fetches the current call details from a Twilio Sync Map, preserves all existing call data, and updates only the status field.
 * Each call has its own dedicated Sync Map identified by the callSid
 *
 * @param {string} callSid - The unique identifier of the Twilio call to update
 * @param {string} status - The new status for the call
 */
export async function updateCallStatus(
  callSid: string,
  status:
    | "queued"
    | "ringing"
    | "in-progress"
    | "completed"
    | "busy"
    | "failed"
    | "no-answer",
) {
  const client = twilio(TWILIO_API_KEY, TWILIO_API_SECRET, { accountSid });

  const syncMapItemApi = client.sync.v1
    .services(TWILIO_SYNC_SVC_SID)
    .syncMaps(makeContextMapName(callSid))
    .syncMapItems("call");

  const oldData = await syncMapItemApi
    .fetch()
    .then((res) => res.data as CallDetails);

  const data = { ...oldData, status };

  return await syncMapItemApi.update({ data });
}
