import type { ToolDefinition, ToolParameters } from "../../agent/types.js";
import { ConversationRelayAdapter } from "../../completion-server/twilio/conversation-relay.js";
import {
  IS_TRANSFER_TO_FLEX_ENABLED,
  TWILIO_ACCOUNT_SID,
} from "../../shared/env.js";
import type { TransferToFlexHandoff } from "./types.js";

/****************************************************
 Transfer to Flex Agent
****************************************************/
const TransferToFlexAgentParams: ToolParameters = {
  type: "object",
  properties: {
    conversationSummary: {
      type: "string",
      description:
        "A summarization of the conversation. This should be a few paragraphs long.",
    },

    reason: {
      type: "string",
      description: "The reason the call is being transferred.",
    },
  },
  required: ["conversationSummary", "reason"],
};

interface TransferToFlexAgent {
  conversationSummary: string;
  reason: string;
}

export let transferToFlexAgent: ToolDefinition<TransferToFlexAgent> | undefined; // do not export tool if transfer to flex is not enabled
if (IS_TRANSFER_TO_FLEX_ENABLED) {
  transferToFlexAgent = {
    name: "transferToAgent",
    description: "Transfers the call to a Flex agent",
    parameters: TransferToFlexAgentParams,
    type: "function",
    fillers: null, // let the bot naturally create their own filler
    // function executor
    async fn(args: TransferToFlexAgent, deps) {
      const relay =
        deps.relay as ConversationRelayAdapter<TransferToFlexHandoff>;

      setTimeout(() => {
        relay.end({
          reasonCode: "transfer-to-flex",
          accountSid: TWILIO_ACCOUNT_SID, // todo: make this injected from dependencies
          from: deps.store.context.call?.from ?? "",
          to: deps.store.context.call?.to ?? "",
          sessionId: deps.store.context.call?.conversationRelaySessionId ?? "",

          conversationSummary: args.conversationSummary ?? "N/A",
          customerData: deps.store.context.user ?? {},
          reason: args.reason ?? "N/A",
        });
      }, 3000);

      return "call-transfer-in-progress";
    },
  };
}

async function sleep(ms: number) {
  return new Promise((resolve) =>
    setTimeout(() => {
      resolve(true);
    }, ms),
  );
}
