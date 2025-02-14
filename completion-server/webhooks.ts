import PQueue from "p-queue";
import log from "../lib/logger.js";
import type {
  SessionEventTypes,
  TurnAddedHandler,
  TurnDeletedHandler,
  TurnRecord,
  TurnUpdatedHandler,
} from "../shared/session.js";
import type { SessionStore } from "./session-store/index.js";

// todo: add webhook retry
// todo: add service-level queue to ensure one call doesn't affect others
// todo: add global queue to ensure the webhook executions don't affect the other services

export interface WebhookDefinition {
  url: string;
  events: SessionEventTypes[];
}

export class WebhookService {
  private pendingUpdates: Map<string, number> = new Map(); // Prevents updates from stacking. Updates occur much more quickly than the webhooks resolve. We skip all update queue items except for the last one to ensure only no redundant updates fire.
  private queues: Map<string, PQueue> = new Map();
  private store: SessionStore;
  private subscribers: WebhookDefinition[];

  constructor(store: SessionStore, subscribers: WebhookDefinition[] = []) {
    this.store = store;
    this.subscribers = subscribers;

    this.store.on("turnAdded", this.handleTurnAdded);
    this.store.on("turnDeleted", this.handleTurnDeleted);
    this.store.on("turnUpdated", this.handleTurnUpdated);
  }

  private handleTurnAdded: TurnAddedHandler = async (turn) => {
    const relevantSubscribers = this.subscribers.filter((sub) =>
      sub.events.includes("turnAdded")
    );

    await Promise.all(
      relevantSubscribers.map((subscriber) =>
        this.queueWebhook(subscriber.url, "turnAdded", {
          event: "turnAdded",
          turnId: turn.id,
          data: turn,
          timestamp: new Date().toISOString(),
        })
      )
    );
  };

  private handleTurnDeleted: TurnDeletedHandler = async (turnId, turn) => {
    const relevantSubscribers = this.subscribers.filter((sub) =>
      sub.events.includes("turnDeleted")
    );

    await Promise.all(
      relevantSubscribers.map((subscriber) =>
        this.queueWebhook(subscriber.url, "turnDeleted", {
          event: "turnDeleted",
          turnId,
          data: turn, // might be undefined, which is expected
          timestamp: new Date().toISOString(),
        })
      )
    );
  };

  private handleTurnUpdated: TurnUpdatedHandler = async (turnId) => {
    const relevantSubscribers = this.subscribers.filter((sub) =>
      sub.events.includes("turnUpdated")
    );

    await Promise.all(
      relevantSubscribers.map((subscriber) => {
        const queueKey = `${subscriber.url}:${turnId}`;

        this.pendingUpdates.set(
          queueKey,
          (this.pendingUpdates.get(queueKey) || 0) + 1
        );
        return this.queueWebhook(subscriber.url, "turnUpdated", {
          event: "turnUpdated",
          turnId,
          // data will be fetched right before sending
          timestamp: new Date().toISOString(),
        });
      })
    );
  };

  private async queueWebhook(
    url: string,
    event: SessionEventTypes,
    payload: {
      event: SessionEventTypes;
      turnId: string;
      data?: TurnRecord;
      timestamp: string;
    }
  ): Promise<void> {
    const queueKey = `${url}:${payload.turnId}`;
    const queue = this.getQueue(queueKey);

    try {
      await queue.add(
        async () => {
          if (event === "turnUpdated") {
            //  skip every update except for the latest
            const pendingCount = this.pendingUpdates.get(queueKey) || 0;
            if (pendingCount > 1)
              return this.pendingUpdates.set(queueKey, pendingCount - 1);

            this.pendingUpdates.delete(queueKey); // clear the counter on the last update
            const latestTurn = this.store.turns.get(payload.turnId); // get the latest version right before sending
            payload.data = latestTurn;
          }

          await this.executeWebhook(url, payload);
        },
        { priority: event === "turnAdded" ? 1 : 0 }
      );
    } catch (error) {
      log.error("webhook", `Failed to queue webhook for ${queueKey}:`, error);
    }

    // Clean up queue if empty
    if (queue.size === 0 && queue.pending === 0) {
      queue.removeAllListeners();
      this.queues.delete(queueKey);
    }
  }

  private getQueue = (queueKey: string): PQueue => {
    let queue = this.queues.get(queueKey);
    if (!queue) {
      queue = new PQueue({
        concurrency: 1, // Ensure sequential processing per subscriber, i.e. turnId
        intervalCap: 100, // Maximum number of requests per interval
        interval: 1000, // Interval in ms
        carryoverConcurrencyCount: true, // Carries over pending promises to the next interval
        timeout: 10000, // 10s timeout for each webhook call
      });

      queue.on("error", (error) => {
        log.error("webhook", `Queue ${queueKey} error:`, error);
      });

      this.queues.set(queueKey, queue);
    }

    return queue;
  };

  private async executeWebhook(
    url: string,
    payload: {
      event: SessionEventTypes;
      turnId: string;
      data?: TurnRecord;
      timestamp: string;
    }
  ): Promise<void> {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error(`HTTP error, status ${response.status}`);
  }
}
