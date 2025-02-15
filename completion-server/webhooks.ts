import PQueue from "p-queue";
import log from "../lib/logger.js";
import {
  ContextDiff,
  ContextEventTypes,
  ContextUpdatedHandler,
  SessionContext,
} from "../shared/context.js";
import type {
  TurnAddedHandler,
  TurnDeletedHandler,
  TurnEventTypes,
  TurnRecord,
  TurnUpdatedHandler,
} from "../shared/turns.js";
import type { SessionStore } from "./session-store/index.js";

// todo: add webhook retry
// todo: add service-level queue to ensure one call doesn't affect others
// todo: add global queue to ensure the webhook executions don't affect the other services

export interface WebhookDefinition {
  url: string;
  events: WebhookEvents[];
}

type WebhookEvents = TurnEventTypes | ContextEventTypes;

export class WebhookService {
  private pendingUpdates: Map<string, number> = new Map(); // Prevents updates from stacking. Updates occur much more quickly than the webhooks resolve. We skip all update queue items except for the last one to ensure only no redundant updates fire.
  private queues: Map<string, PQueue> = new Map();
  private store: SessionStore;
  private webhooks: WebhookDefinition[];

  constructor(store: SessionStore, webhooks: WebhookDefinition[] = []) {
    this.store = store;
    this.webhooks = webhooks;

    this.store.on("contextUpdated", this.handleContextUpdated);
    this.store.on("turnAdded", this.handleTurnAdded);
    this.store.on("turnDeleted", this.handleTurnDeleted);
    this.store.on("turnUpdated", this.handleTurnUpdated);
  }

  private handleContextUpdated: ContextUpdatedHandler = async (
    context,
    diff
  ) => {
    const releventWebhooks = this.webhooks.filter((sub) =>
      sub.events.includes("contextUpdated")
    );

    await Promise.all(
      releventWebhooks.map((subscriber) =>
        this.queueWebhook(subscriber.url, "contextUpdated", { context, diff })
      )
    );
  };

  private handleTurnAdded: TurnAddedHandler = async (turn) => {
    const releventWebhooks = this.webhooks.filter((sub) =>
      sub.events.includes("turnAdded")
    );

    const turnId = turn.id;

    await Promise.all(
      releventWebhooks.map((subscriber) =>
        this.queueWebhook(subscriber.url, "turnAdded", { turnId, turn })
      )
    );
  };

  private handleTurnDeleted: TurnDeletedHandler = async (turnId, turn?) => {
    const releventWebhooks = this.webhooks.filter((sub) =>
      sub.events.includes("turnDeleted")
    );

    await Promise.all(
      releventWebhooks.map((subscriber) =>
        this.queueWebhook(subscriber.url, "turnDeleted", { turnId, turn })
      )
    );
  };

  private handleTurnUpdated: TurnUpdatedHandler = async (turnId) => {
    const releventWebhooks = this.webhooks.filter((sub) =>
      sub.events.includes("turnUpdated")
    );

    await Promise.all(
      releventWebhooks.map((subscriber) => {
        const queueKey = `${subscriber.url}:${turnId}`;

        this.pendingUpdates.set(
          queueKey,
          (this.pendingUpdates.get(queueKey) || 0) + 1
        );
        return this.queueWebhook(subscriber.url, "turnUpdated", {
          turnId,
          turn: undefined, // Will be fetched right before sending
        });
      })
    );
  };

  private async queueWebhook(
    url: string,
    event: WebhookEvents,
    payload: InternalPayload
  ): Promise<void> {
    const queueKey = `${url}:${
      "turnId" in payload ? payload.turnId : "context"
    }`;
    const queue = this.getQueue(queueKey);

    try {
      await queue.add(
        async () => {
          if (event === "turnUpdated" && "turnId" in payload) {
            const pendingCount = this.pendingUpdates.get(queueKey) || 0;
            if (pendingCount > 1) {
              return this.pendingUpdates.set(queueKey, pendingCount - 1);
            }

            this.pendingUpdates.delete(queueKey);
            const latestTurn = this.store.turns.get(payload.turnId);
            payload.turn = latestTurn;
          }

          await this.executeWebhook(url, event, payload);
        },
        { priority: event === "turnAdded" ? 1 : 0 }
      );
    } catch (error) {
      log.error("webhook", `Failed to queue webhook for ${queueKey}:`, error);
    }

    if (queue.size === 0 && queue.pending === 0) {
      queue.removeAllListeners();
      this.queues.delete(queueKey);
    }
  }

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
        log.error("webhook", `Queue ${queueKey} error:`, error);
      });

      this.queues.set(queueKey, queue);
    }

    return queue;
  };

  private async executeWebhook(
    url: string,
    event: WebhookEvents,
    payload: InternalPayload
  ): Promise<void> {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, event, callSid: this.store.callSid }),
    });

    if (!response.ok) throw new Error(`HTTP error, status ${response.status}`);
  }
}

export interface ContextUpdatedEvent {
  callSid: string;
  context: SessionContext;
  diff: ContextDiff;
  event: "contextUpdated";
}

export interface TurnAddedEvent {
  callSid: string;
  turnId: string;
  turn: TurnRecord;
  event: "turnAdded";
}

export interface TurnDeletedEvent {
  callSid: string;
  turnId: string;
  turn?: TurnRecord;
  event: "turnDeleted";
}

export interface TurnUpdatedEvent {
  callSid: string;
  turnId: string;
  turn: TurnRecord;
  event: "turnUpdated";
}

type InternalPayload =
  | Omit<ContextUpdatedEvent, "callSid" | "event">
  | Omit<TurnAddedEvent, "callSid" | "event">
  | Omit<TurnDeletedEvent, "callSid" | "event">
  | Omit<TurnUpdatedEvent, "callSid" | "event">;
