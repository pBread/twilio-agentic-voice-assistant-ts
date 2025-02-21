import Twilio from "twilio";
import { v4 as uuidV4 } from "uuid";
import type {
  ToolDefinition,
  ToolDependencies,
  ToolParameters,
} from "../../agent/types.js";
import {
  FLEX_QUEUE_SID,
  FLEX_WORKER_SID,
  FLEX_WORKFLOW_SID,
  FLEX_WORKSPACE_SID,
  IS_TRANSFER_TO_FLEX_ENABLED,
  TWILIO_ACCOUNT_SID,
  TWILIO_API_KEY,
  TWILIO_API_SECRET,
  TWILIO_CONVERSATIONS_SVC_SID,
  TWILIO_SYNC_SVC_SID,
} from "../../shared/env.js";

import { Client as ConversationsClient } from "@twilio/conversations";
import log from "../../lib/logger.js";
import { makeContextMapName } from "../../shared/sync/ids.js";
import { AIQuestion, AIQuestionState } from "./types.js";

const twilio = Twilio(TWILIO_API_KEY, TWILIO_API_SECRET, {
  accountSid: TWILIO_ACCOUNT_SID,
});

/****************************************************
 Transfer to Flex Agent
****************************************************/
const AskAgentParams: ToolParameters = {
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
};

interface AskAgent {
  question: string;
  explanation: string;
  recommendation: string;
}

export let askAgent: ToolDefinition<AskAgent> | undefined; // do not export tool if transfer to flex is not enabled
if (IS_TRANSFER_TO_FLEX_ENABLED) {
  askAgent = {
    name: "askAgent",
    description: "Sends a question to an agent",
    parameters: AskAgentParams,
    type: "function",
    fillers: ["Give me a second. I'll reach out to a human agent now."], // let the bot naturally create their own filler
    // function executor
    async fn(args: AskAgent, deps) {
      deps.log.info("bot.fn", "bot is asking an agent");

      const question: AIQuestion = {
        createdAt: new Date().toLocaleString(),
        answer: "",
        callSid: deps.store.callSid,
        id: uuidV4(),
        question: args.question,
        status: "new",
        explanation: args.explanation,
        recommendation: args.recommendation ?? "No recommendation",
      };

      const questions = {
        ...(deps.store.context.questions ?? {}),
        [question.id]: question,
      };

      deps.store.setContext({ questions });

      createFlexTask(question, deps);

      return "waiting-for-human-response";
    },
  };
}

async function createFlexTask(question: AIQuestion, deps: ToolDependencies) {
  const from = deps.store.context.call?.from as string;
  const to = deps.store.context.call?.to as string;

  const phone = deps.store.context.call?.participantPhone as string;

  const identity = `ai-agent-${uuidV4()}`;

  const result = await twilio.flexApi.v1.interaction.create({
    channel: {
      type: "chat",
      initiated_by: "agent",
      participants: [{ identity }],
    },
    routing: {
      properties: {
        workspace_sid: FLEX_WORKSPACE_SID,
        workflow_sid: FLEX_WORKFLOW_SID,
        queue_sid: FLEX_QUEUE_SID,
        worker_sid: FLEX_WORKER_SID,
        task_channel_unique_name: "chat",
        from,

        attributes: {
          customer: { from },
          customerAddress: identity,
          from,
          phone,
          to,
        },
      },
    },
  });

  const attr = JSON.parse(result.routing.properties.attributes);

  const body = `${question.question} \n${question.explanation}\n\nHere is my recommendation: ${question.recommendation}`;

  await twilio.conversations.v1
    .conversations(attr.conversationSid)
    .messages.create({ author: identity, body });

  const convserationsClient = new ConversationsClient(
    createConversationsToken(identity),
  );

  convserationsClient.on("connectionStateChanged", (ev) => {
    log.info("ask-agent", "conversations client connectionStateChanged", ev);
  });

  convserationsClient.on("tokenAboutToExpire", () =>
    convserationsClient.updateToken(createConversationsToken(identity)),
  );
  convserationsClient.on("tokenExpired", () =>
    convserationsClient.updateToken(createConversationsToken(identity)),
  );

  convserationsClient.on("messageAdded", (ev) => {
    log.debug("ask-agent", "messageAdded", ev);

    const answer = ev.body;
    if (!answer)
      return log.warn("ask-agent", "error onMessageAdded. answer is undefined");

    const isApproved = /\b(approve)\b/i.test(answer);
    const isRejected = /\b(reject)\b/i.test(answer);

    let status = "unknown";
    if (isApproved) status = "approved";
    if (isRejected) status = "rejected";
    if (isApproved && isRejected) status = "ambiguous";

    let systemContent =
      "IMPORTANT UPDATE: A human agent has responded to your previous question. It is critical that your next response informs the customer.\n";

    systemContent += `Your approval status is ${status}. \n`;

    systemContent += `Here is the message from the human agent: ${answer}. \n\n`;
    systemContent += `As a reminder, here is the question you asked: ${question.question}`;

    deps.store.addParkingLotItem({
      human: {
        content: "What did the agent say?",
        origin: "hack",
      },
      system: { content: systemContent, origin: "human" },
    });
  });

  // await twilio.conversations.v1
  //   .conversations(attr.conversationSid)
  //   .webhooks.create({
  //     "configuration.filters": ["onMessageAdded"],
  //     "configuration.method": "POST",
  //     "configuration.url": `https://${HOSTNAME}/api/ai-question/${question.id}`,
  //     target: "webhook",
  //   });
}

function createConversationsToken(identity: string) {
  const AccessToken = Twilio.jwt.AccessToken;

  const token = new AccessToken(
    TWILIO_ACCOUNT_SID,
    TWILIO_API_KEY,
    TWILIO_API_SECRET,
    { identity },
  );

  token.addGrant(
    new AccessToken.ChatGrant({ serviceSid: TWILIO_CONVERSATIONS_SVC_SID }),
  );

  return token.toJwt();
}

// async function handleConversationWebhook(question: AIQuestion, answer: string) {
//   const uniqueName = makeContextMapName(question.callSid);

//   let curData: AIQuestionState | undefined;

//   try {
//     curData = await twilio.sync.v1
//       .services(TWILIO_SYNC_SVC_SID)
//       .syncMaps(uniqueName)
//       .syncMapItems("questions")
//       .fetch()
//       .then((res) => res.data);
//   } catch (error) {
//     log.debug("ai-question", "failed to get previous ai question state", error);
//   }

//   const result = await twilio.sync.v1
//     .services(TWILIO_SYNC_SVC_SID)
//     .syncMaps(uniqueName)
//     .syncMapItems("questions")
//     .update({
//       data: { ...(curData ?? {}), [question.id]: { ...question, answer } },
//     });

//   log.info("ai-question", "handled agent response");
// }
