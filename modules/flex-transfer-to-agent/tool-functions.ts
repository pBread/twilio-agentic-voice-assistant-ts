import type { ToolExecutor } from "../../agent/types.js";
import { ConversationRelayAdapter } from "../../completion-server/twilio/conversation-relay.js";
import {
  IS_TRANSFER_TO_FLEX_ENABLED,
  TWILIO_ACCOUNT_SID,
} from "../../shared/env.js";
import type { TransferToFlexHandoff } from "./types.js";

interface TransferToFlexAgent {
  conversationSummary: string;
  department: string;
  reason: string;
}

// Only define the function if transfer to flex is enabled
export const transferToFlexAgent:
  | ToolExecutor<TransferToFlexAgent>
  | undefined = IS_TRANSFER_TO_FLEX_ENABLED
  ? async (args, deps) => {
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
    }
  : undefined;
