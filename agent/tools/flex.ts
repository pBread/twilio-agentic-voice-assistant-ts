import { ConversationRelayAdapter } from "../../completion-server/twilio/conversation-relay-adapter.js";
import { TransferToFlexHandoff } from "../../completion-server/twilio/flex.js";
import {
  IS_TRANSFER_TO_FLEX_ENABLED,
  TWILIO_ACCOUNT_SID,
} from "../../shared/env/server.js";
import type { ToolDefinition, ToolParameters } from "../types.js";

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
    fillers: [
      "I will transfer you to an agent. Just one second.",
      "I am transferring you to a live agent. Have a nice day, {{user.first_name}}.",
      "Please hold while I transfer you to an agent.",
    ],
    async fn(args: TransferToFlexAgent, deps) {
      const relay =
        deps.relay as ConversationRelayAdapter<TransferToFlexHandoff>;

      relay.end({
        reasonCode: "transfer-to-flex",
        accountSid: TWILIO_ACCOUNT_SID,
        from: deps.store.context.call?.from ?? "",
        to: deps.store.context.call?.to ?? "",
        sessionId: deps.store.context.call?.conversationRelaySessionId ?? "",

        conversationSummary: args.conversationSummary ?? "N/A",
        customerData: deps.store.context.user ?? {},
        reason: args.reason ?? "N/A",
      });
      return "Call transfered";
    },
  };
}
