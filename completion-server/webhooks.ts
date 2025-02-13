import PQueue from "p-queue";
import type { TurnEventTypes, SessionEventTypes } from "../shared/session";
import type { SessionStore } from "./session-store";
import log from "../lib/logger";

interface WebhookDefinition {
  url: string;
  events: TurnEventTypes[];
}

export class WebhookService {
  private queues: Map<string, PQueue>;
  private store: SessionStore;
  private subscribers: WebhookDefinition[];

  constructor(store: SessionStore) {
    this.queues = new Map();
    this.store = store;
    this.subscribers = [];
  }

  private initializeListeners = () => {
    const events: SessionEventTypes[] = [
      "turnAdded",
      "turnDeleted",
      "turnUpdated",
    ];
  };

  private getQueue = (key: string): PQueue => {
    let queue = this.queues.get(key);
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
          `Queue ${key} size: ${queue?.size} pending: ${queue?.pending}`
        );
      });

      queue.on("error", (error) => {
        log.error(`Queue ${key} error:`, error);
      });

      this.queues.set(key, queue);
    }

    return queue;
  };
}
