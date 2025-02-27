import type { ToolSpec } from "../../agent/types.js";
import { IS_TRANSFER_TO_FLEX_ENABLED } from "../../shared/env.js";

// only include in manifest if transfer to flex is enabled

export default IS_TRANSFER_TO_FLEX_ENABLED
  ? [
      {
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
      },
    ]
  : [];

export const toolManifest: ToolSpec[] = IS_TRANSFER_TO_FLEX_ENABLED
  ? [
      {
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
      },
    ]
  : [];
