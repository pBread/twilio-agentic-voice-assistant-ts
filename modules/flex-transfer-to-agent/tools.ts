import type { ToolDefinition, ToolExecutor } from "../../agent/types.js";
import { ConversationRelayAdapter } from "../../completion-server/twilio/conversation-relay.js";
import { TWILIO_ACCOUNT_SID } from "../../shared/env.js";
import type { TransferToFlexHandoff } from "./types.js";

export const transferToFlexAgentSpec: ToolDefinition = {
  name: "transferToAgent",
  description: "Transfers the call to a Flex agent",
  type: "function",
  parameters: {
    type: "object",
    properties: {
      conversationSummary: {
        type: "string",
        description:
          "A summarization of the conversation. This should be a few paragraphs long.",
      },
      department: {
        type: "string",
        enum: ["finance", "general", "support"],
      },
      reason: {
        type: "string",
        description: "The reason the call is being transferred.",
      },
    },
    required: ["conversationSummary", "department", "reason"],
  },
};

interface TransferToFlexAgent {
  conversationSummary: string;
  department: string;
  reason: string;
}

// only define the function if transfer to flex is enabled
export const transferToFlexAgent: ToolExecutor<TransferToFlexAgent> = async (
  args,
  deps,
) => {
  const relay = deps.relay as ConversationRelayAdapter<TransferToFlexHandoff>;

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
};
