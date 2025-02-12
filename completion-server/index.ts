import { Router } from "express";
import { WebsocketRequestHandler } from "express-ws";
import log from "../lib/logger";
import { AgentRuntime } from "./agent-runtime";
import { OpenAIConsciousLoop } from "./conscious-loop/openai";
import { SessionManager } from "./session-manager";
import {
  ConversationRelayAdapter,
  HandoffData,
} from "./twilio/conversation-relay-adapter";
import { makeConversationRelayTwiML } from "./twilio/twiml";
import { endCall, type TwilioCallWebhookPayload } from "./twilio/voice";

const router = Router();

/****************************************************
 Phone Number Webhooks
****************************************************/
router.post("/incoming-call", async (req, res) => {
  const { CallSid: callSid } = req.body as TwilioCallWebhookPayload;

  try {
    const twiml = makeConversationRelayTwiML({ callSid, context: {} });
    res.status(200).type("text/xml").end(twiml);
  } catch (error) {
    log.error("/incoming-call", "unknown error", error);
    res.status(500).json({ status: "error", error });
  }
});

router.post("/call-status", async (req, res) => {
  const callSid = req.body.CallSid;
  const callStatus = req.body.CallStatus;

  log.info(
    "/call-status",
    `call status updated to ${callStatus}, CallSid ${callSid}`
  );

  res.status(200).send();
});

/****************************************************
 Outbound Calling Routes
****************************************************/
router.post("/place-call/:to", async (req, res) => {
  log.debug("/place-call", "Not Implemented");
  const to = req.params.to;
});

router.post("/place-call/on-answer", async (req, res) => {
  log.debug("/place-call", "Not Implemented");
});

/****************************************************
 Conversation Relay Websocket
****************************************************/
export const CONVERSATION_RELAY_WS_ROUTE = "/convo-relay/:callSid";
export const conversationRelayWebsocketHandler: WebsocketRequestHandler = (
  ws,
  req
) => {
  const { callSid } = req.params;
  log.info("/convo-relay", `websocket initializing, CallSid ${callSid}`);

  const relay = new ConversationRelayAdapter(ws);
  const session = new SessionManager(callSid);

  const agent = new AgentRuntime(
    session,
    { model: "gpt-4" },
    {
      instructionTemplate: "You are a friendly robot who likes to tell jokes",
      tools: [
        {
          type: "function",
          function: { name: "getUser" },
        },
      ],
    }
  );

  const consciousLoop = new OpenAIConsciousLoop(session, agent, relay);

  relay.onSetup((ev) => {
    // handle setup
    const params = ev.customParameters ?? {};
    const context = "context" in params ? JSON.parse(params.context) : {};
  });

  relay.onPrompt((ev) => {
    if (!ev.last) return; // do nothing on partial speech
    log.info(`relay.prompt`, `"${ev.voicePrompt}"`);

    session.turns.addHumanText({ content: ev.voicePrompt });
    consciousLoop.run();
  });

  relay.onInterrupt((ev) => {
    log.info(`relay.interrupt`, `human interrupted bot`);

    consciousLoop.abort();
  });

  relay.onDTMF((ev) => {
    log.info(`relay.dtmf`, `dtmf (human): ${ev.digit}`);
  });

  // relay.onError only emits errors received from the ConversationRelay websocket, not local errors.
  relay.onError((ev) => {
    log.error(`relay.error`, `ConversationRelay error: ${ev.description}`);
  });

  consciousLoop.on("text-chunk", (text, last, fullText) => {
    relay.sendTextToken(text, last); // send each token as it is received

    if (last && fullText) log.info("llm.transcript", `"${fullText}"`);
  });

  consciousLoop.on("dtmf", (digits) => {
    relay.sendDTMF(digits);
    log.info("llm", `dtmf (bot): ${digits}`);
  });

  ws.on("close", () => {
    log.info(
      "relay",
      "conversation relay ws closed.",
      "session turns:\n",
      JSON.stringify(session.turns.list()),
      "session context:\n",
      JSON.stringify(session.context)
    );
  });
};

/****************************************************
 Executed After Conversation Relay Session Ends
 https://www.twilio.com/docs/voice/twiml/connect/conversationrelay#end-session-message
 Used for transfering calls to a human agent.
****************************************************/
router.post("/call-wrapup", async (req, res) => {
  const isHandoff = "HandoffData" in req.body;
  const callSid = req.body.CallSid;

  if (!isHandoff) {
    log.warn(`/call-wrapup`, "call completed w/out handoff data");
    res.status(200).send("complete");
    return;
  }

  let handoffData: HandoffData;
  try {
    handoffData = JSON.parse(req.body.HandoffData) as HandoffData;
  } catch (error) {
    log.error(
      `/call-wrapup`,
      "Unable to parse handoffData in wrapup webhook. ",
      "Request Body: ",
      JSON.stringify(req.body)
    );
    res.status(500).send({ status: "failed", error });
    return;
  }

  if (handoffData.reason === "error") {
    log.info(
      "/call-wrapup",
      `wrapping up call that failed due to error, callSid: ${callSid}, message: ${handoffData.message}`
    );

    await endCall(callSid);

    res.status(200).send("complete");
    return;
  }

  if (isHandoff) {
    log.info(
      "/call-wrapup",
      `Live agent handoff starting. CallSid: ${callSid}`
    );
  }
});

export const completionServerRoutes = router;
