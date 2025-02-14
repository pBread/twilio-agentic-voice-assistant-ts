import PQueue from "p-queue";
import log from "../lib/logger";
import type {
  SessionEventTypes,
  TurnAddedHandler,
  TurnDeletedHandler,
  TurnRecord,
  TurnUpdatedHandler,
} from "../shared/session";
import type { SessionStore } from "./session-store";

interface WebhookDefinition {
  url: string;
  events: SessionEventTypes[];
}

export class WebhookService {
  private queues: Map<string, PQueue>;
  private store: SessionStore;
  private subscribers: WebhookDefinition[];

  constructor(store: SessionStore, subscribers: WebhookDefinition[] = []) {
    this.queues = new Map();
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
      relevantSubscribers.map((subscriber) =>
        this.queueWebhook(subscriber.url, "turnUpdated", {
          event: "turnUpdated",
          turnId,
          // data will be fetched right before sending
          timestamp: new Date().toISOString(),
        })
      )
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
          // For turnUpdated, get the latest version right before sending
          if (event === "turnUpdated") {
            const latestTurn = this.store.turns.get(payload.turnId);
            if (!latestTurn) {
              log.debug(
                "webhook",
                "turnUpdated turn not found",
                payload.turnId
              );
              return;
            }
            payload.data = latestTurn;
          }

          await this.executeWebhook(url, payload);
        },
        { priority: event === "turnAdded" ? 1 : 0 }
      );
    } catch (error) {
      log.error(`Failed to queue webhook for ${queueKey}:`, error);
      throw error;
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

      // Add monitoring
      queue.on("active", () => {
        log.debug(
          `Queue ${queueKey} size: ${queue?.size} pending: ${queue?.pending}`
        );
      });

      queue.on("error", (error) => {
        log.error(`Queue ${queueKey} error:`, error);
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

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  }
}
