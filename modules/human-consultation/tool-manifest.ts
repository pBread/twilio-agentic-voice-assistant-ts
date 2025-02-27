import type { ToolSpec } from "../../agent/types.js";
import { IS_TRANSFER_TO_FLEX_ENABLED } from "../../shared/env.js";

// Only include in manifest if transfer to flex is enabled
export const toolManifest: ToolSpec[] = IS_TRANSFER_TO_FLEX_ENABLED
  ? [
      {
        name: "askAgent",
        description: "Sends a question to an agent",
        type: "function",
        fillers: ["Give me a second. I'll reach out to a human agent now."],
        parameters: {
          type: "object",
          properties: {
            question: {
              type: "string",
              description: "The question you want the agent to answer",
            },
            explanation: {
              type: "string",
              description:
                "A detailed explanation of the situation. Include any and all relevant information the agent may need to make their decision.",
            },
            recommendation: {
              type: "string",
              description: "What you recommend the agent should do.",
            },
          },
          required: ["question", "explanation", "recommendation"],
        },
      },
    ]
  : [];
