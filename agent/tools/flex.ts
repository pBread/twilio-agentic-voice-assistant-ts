import { IS_TRANSFER_TO_FLEX_ENABLED } from "../../shared/env/server.js";
import type { ToolDefinition, ToolParameters } from "../types.js";

/****************************************************
 Transfer to Flex Agent
****************************************************/
const TransferToFlexAgentParams: ToolParameters = {
  type: "object",
  properties: {
    conversationSummary: {
      type: "string",
      description: "A summarization of the conversation",
    },
  },
  required: ["conversationSummary"],
};

interface TransferToFlexAgent {
  conversationSummary: string;
  phone?: string;
}

export let transferToFlexAgent: ToolDefinition<TransferToFlexAgent> | undefined;
if (IS_TRANSFER_TO_FLEX_ENABLED) {
  transferToFlexAgent = {
    name: "transferToAgent",
    description: "Transfers the call to a Flex agent",
    parameters: TransferToFlexAgentParams,
    type: "function",
    async fn(args: TransferToFlexAgent, deps) {
      await new Promise((resolve) =>
        setTimeout(() => resolve(null), 10 * 1000),
      );
      return { name: "Richard", email: "richard@gmail.com" };
    },
  };
}
