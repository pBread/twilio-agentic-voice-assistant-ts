import { RequestHandler, Router } from "express";
import { WebsocketRequestHandler } from "express-ws";
import { DEFAULT_TWILIO_NUMBER, HOSTNAME } from "../lib/env.js";
import log from "../lib/logger.js";
import { AgentRuntime } from "./agent-runtime/index.js";
import { OpenAIConsciousLoop } from "./conscious-loop/openai.js";
import { SessionStore } from "./session-store/index.js";
import {
  ConversationRelayAdapter,
  HandoffData,
} from "./twilio/conversation-relay-adapter.js";
import { makeConversationRelayTwiML } from "./twilio/twiml.js";
import {
  endCall,
  placeCall,
  type TwilioCallWebhookPayload,
} from "./twilio/voice.js";
import { WebhookService } from "./webhooks.js";

const router = Router();

/****************************************************
 Phone Number Webhooks
****************************************************/
router.post("/incoming-call", async (req, res) => {
  const { CallSid: callSid } = req.body as TwilioCallWebhookPayload;
  log.reset();
  log.setCallSid(callSid);

  try {
    const twiml = makeConversationRelayTwiML({
      callSid,
      context: {},
      welcomeGreeting: "Hello there. I am a voice bot",
    });
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
const outboundCallHandler: RequestHandler = async (req, res) => {
  const to = req.query?.to ?? req.body?.to;
  const from = req.query?.from ?? req.body?.from ?? DEFAULT_TWILIO_NUMBER;

  log.info(`/outbound`, `from ${from} to ${to}`);

  if (!to) {
    res.status(400).send({ status: "failed", error: "No to number defined" });
    return;
  }

  if (!from) {
    res.status(400).send({ status: "failed", error: "No from number defined" });
    return;
  }

  try {
    const call = await placeCall({
      from,
      to,
      url: `https://${HOSTNAME}/outbound/answer`, // The URL is executed when the callee answers and that endpoint (below) returns TwiML. It's possible to simply include TwiML in the call creation request but the websocket route includes the callSid as a param. This could be simplified a bit, but this is fine.
    });

    res.status(200).json(call);
  } catch (error) {
    log.error(`/outbound, Error: `, error);
    res.status(500).json({ status: "failed", error });
  }
};

router.get("/outbound", outboundCallHandler);
router.post("/outbound", outboundCallHandler);

router.post("/outbound/answer", async (req, res) => {
  const { CallSid: callSid } = req.body as TwilioCallWebhookPayload;
  log.reset();
  log.setCallSid(callSid);

  log.info(`/outbound/answer`, `CallSid ${callSid}`);

  try {
    const twiml = makeConversationRelayTwiML({ callSid, context: {} });
    res.status(200).type("text/xml").end(twiml);
  } catch (error) {
    log.error("/incoming-call", "unknown error", error);
    res.status(500).json({ status: "failed", error });
  }
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
  const store = new SessionStore(callSid);

  new WebhookService(store, [
    {
      events: ["turnAdded", "turnDeleted", "turnUpdated"],
      url: `http://${HOSTNAME}/store-webhook`,
    },
  ]);

  store.on("turnAdded", (turn) => log.debug("store", "turnAdded", turn));

  store.on("turnUpdated", (turnId) => {
    const turn = store.turns.get(turnId);
    log.debug("store", "turnUpdated", `${turn?.version} ${turnId}`);
  });
  store.on("turnDeleted", (turnId, turn) => {
    log.debug("store", "turnDeleted", turnId, turn);
  });

  const agent = new AgentRuntime(
    relay,
    store,
    { model: "gpt-3.5-turbo" },
    {
      instructionTemplate: "You are a friendly robot who likes to tell jokes",
      tools: [
        {
          type: "request",
          name: "getUserProfile",
          endpoint: {
            url: `https://${HOSTNAME}/get-user`,
            method: "POST",
            contentType: "json",
          },
        },
        {
          type: "function",
          name: "updateUserProfile",
          parameters: {
            type: "object",
            properties: { userEmail: { type: "string" } },
          },
          execute: async (args, deps) => {
            log.debug("args", args);
          },
        },
      ],
    }
  );

  const consciousLoop = new OpenAIConsciousLoop(store, agent, relay);

  relay.onSetup((ev) => {
    // handle setup
    const params = ev.customParameters ?? {};
    const context = "context" in params ? JSON.parse(params.context) : {};

    const turn = store.turns.addHumanText({ content: "hello", id: "myid" });
    turn.content += "world";
    turn.content += "Nope!";
    store.turns.delete(turn.id);
  });

  relay.onPrompt((ev) => {
    if (!ev.last) return; // do nothing on partial speech
    log.info(`relay.prompt`, `"${ev.voicePrompt}"`);

    store.turns.addHumanText({ content: ev.voicePrompt });
    consciousLoop.run();
  });

  relay.onInterrupt((ev) => {
    log.info(`relay.interrupt`, `human interrupted bot`);

    consciousLoop.abort();
    store.redactInterruption(ev.utteranceUntilInterrupt);
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
      "\n/** session turns **/\n",
      JSON.stringify(store.turns.list(), null, 2),
      "\n/** session context **/\n",
      JSON.stringify(store.context, null, 2)
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
    log.info(`/call-wrapup`, "call completed w/out handoff data");
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
