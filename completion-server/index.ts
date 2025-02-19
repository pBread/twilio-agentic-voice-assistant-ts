import { Router, type RequestHandler } from "express";
import type { WebsocketRequestHandler } from "express-ws";
import { getAgentConfig } from "../agent/index.js";
import { deleteLogger, getMakeLogger } from "../lib/logger.js";
import { prettyXML } from "../lib/xml.js";
import {
  makeTransferToFlexHandoff,
  type TransferToFlexHandoff,
} from "../modules/flex-transfer-to-agent/index.js";
import { DEFAULT_TWILIO_NUMBER, HOSTNAME } from "../shared/env/server.js";
import type { CallDetails } from "../shared/session/context.js";
import { AgentResolver } from "./agent-resolver/index.js";
import type { AgentResolverConfig } from "./agent-resolver/types.js";
import { OpenAIConsciousLoop } from "./conscious-loop/openai.js";
import { makeCallDetail } from "./helpers.js";
import { SessionStore } from "./session-store/index.js";
import { updateCallStatus, warmUpSyncSession } from "./session-store/sync.js";
import {
  ConversationRelayAdapter,
  makeConversationRelayTwiML,
  type HandoffData,
  type WrapupCallWebhookPayload,
} from "./twilio/conversation-relay.js";
import {
  endCall,
  placeCall,
  type TwilioCallWebhookPayload,
} from "./twilio/voice.js";

const router = Router();

/****************************************************
 Phone Number Webhooks
****************************************************/
router.post("/incoming-call", async (req, res) => {
  const body = req.body as TwilioCallWebhookPayload;
  const call: CallDetails = makeCallDetail(body);

  const log = getMakeLogger(call.callSid);

  try {
    const agent = await getAgentConfig();
    await warmUpSyncSession(call.callSid); // ensure the sync session is setup before connecting to Conversation Relay

    const welcomeGreeting = "Hello there. I am a voice bot";
    const twiml = makeConversationRelayTwiML({
      callSid: call.callSid,
      context: { ...agent.context, call },
      welcomeGreeting,
      parameters: { agent, welcomeGreeting },
    });
    log.info("/incoming-call", "twiml\n", prettyXML(twiml));
    res.status(200).type("text/xml").end(twiml);
  } catch (error) {
    log.error("/incoming-call", "unknown error", error);
    res.status(500).json({ status: "error", error });
  }
});

router.post("/call-status", async (req, res) => {
  const callSid = req.body.CallSid as TwilioCallWebhookPayload["CallSid"];
  const callStatus = req.body
    .CallStatus as TwilioCallWebhookPayload["CallStatus"];

  const log = getMakeLogger(callSid);

  log.info(
    "/call-status",
    `call status updated to ${callStatus}, CallSid ${callSid}`,
  );

  try {
    await updateCallStatus(callSid, callStatus);
  } catch (error) {
    log.warn(
      "/call-status",
      `unable to update call status in Sync, CallSid ${callSid}`,
    );
  }

  deleteLogger(callSid);
  res.status(200).send();
});

/****************************************************
 Outbound Calling Routes
****************************************************/
const outboundCallHandler: RequestHandler = async (req, res) => {
  const to = req.query?.to ?? req.body?.to;
  const from = req.query?.from ?? req.body?.from ?? DEFAULT_TWILIO_NUMBER;

  const log = getMakeLogger();

  if (!to || !from) {
    const error = `Cannot place outbound call. Missing to (${to}) or from (${from})`;
    log.error("outbound", error);
    res.status(400).send({ status: "failed", error });
    return;
  }

  try {
    const url = `https://${HOSTNAME}/outbound/answer`; // The URL is executed when the callee answers and that endpoint (below) returns TwiML. It's possible to simply include TwiML in the call creation request but the websocket route includes the callSid as a param. This could be simplified a bit, but this is fine.
    const call = await placeCall({ from, to, url });

    res.status(200).json(call);
  } catch (error) {
    log.error(`/outbound, Error: `, error);
    res.status(500).json({ status: "failed", error });
  }
};

router.get("/outbound", outboundCallHandler);
router.post("/outbound", outboundCallHandler);

// This endpoint responds with TwiML to initiate the Conversation Relay connection.
// Note: This is not technically necessary; the TwiML could be included with the call creation request. This was done so the /:callSid could be included in the websocket URL, which makes that part a bit cleaner to read.
router.post("/outbound/answer", async (req, res) => {
  const body = req.body as TwilioCallWebhookPayload;
  const call: CallDetails = makeCallDetail(body);

  const log = getMakeLogger(call.callSid);

  log.info(`/outbound/answer`, `CallSid ${call.callSid}`);

  try {
    const agent = await getAgentConfig();
    await warmUpSyncSession(call.callSid); // ensure the sync session is setup before connecting to Conversation Relay

    const twiml = makeConversationRelayTwiML({
      callSid: call.callSid,
      context: { agent, call },
    });
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
  req,
) => {
  const { callSid } = req.params;

  const log = getMakeLogger(callSid);
  log.info("/convo-relay", `websocket initializing, CallSid ${callSid}`);

  const relay = new ConversationRelayAdapter<TransferToFlexHandoff>(ws);
  const store = new SessionStore(callSid);

  const agent = new AgentResolver(relay, store);

  const consciousLoop = new OpenAIConsciousLoop(store, agent, relay);

  // handle setup
  relay.onSetup((ev) => {
    const params = ev.customParameters ?? {};

    // context is fetched in the API routes that generate the the ConversationRelay TwiML and then included as a <Parameter/>. This ensures that any data fetching, such as the user's profile, is completed before the websocket is initialized and the AI agent is engaged.
    // https://www.twilio.com/docs/voice/twiml/connect/conversationrelay#parameter-element
    const context = "context" in params ? JSON.parse(params.context) : {};
    store.setContext({
      ...context,
      call: { ...context.call, conversationRelaySessionId: ev.sessionId },
      consultations: {},
    });

    // set the agent configuration
    const config = JSON.parse(params.agent) as Partial<AgentResolverConfig>;
    agent.configure(config);

    const greeting = JSON.parse(params.welcomeGreeting);
    if (greeting) {
      store.turns.addBotText({
        content: greeting,
        origin: "greeting",
        status: "complete",
      });
      log.info("llm.transcript", `"${greeting}"`);
    }
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
    store.turns.redactInterruption(ev.utteranceUntilInterrupt);
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
      JSON.stringify(store.context, null, 2),
    );
  });
};

/****************************************************
 Executed After Conversation Relay Session Ends
 https://www.twilio.com/docs/voice/twiml/connect/conversationrelay#end-session-message
****************************************************/
type AppHandoffData = HandoffData<TransferToFlexHandoff>;
router.post("/wrapup-call", async (req, res) => {
  const payload = req.body as WrapupCallWebhookPayload;

  const callSid = req.body.CallSid;
  const log = getMakeLogger(callSid);

  if (!payload.HandoffData) {
    log.info(`/wrapup-call`, "call completed w/out handoff data");
    res.status(200).send("complete");
    return;
  }

  let handoffData: AppHandoffData;
  try {
    handoffData = JSON.parse(payload.HandoffData) as AppHandoffData;
  } catch (error) {
    log.error(
      `/wrapup-call`,
      "Unable to parse handoffData in wrapup webhook. ",
      "Request Body: ",
      JSON.stringify(req.body),
    );
    res.status(500).send({ status: "failed", error });
    return;
  }

  try {
    switch (handoffData.reasonCode) {
      case "transfer-to-flex":
        const twiml = makeTransferToFlexHandoff(payload, handoffData);
        res.type("xml").send(twiml);
        break;

      case "error":
        log.info(
          "/wrapup-call",
          `wrapping up call that failed due to error, callSid: ${callSid}, message: ${handoffData.message}`,
        );

        await endCall(callSid);
        res.status(200).send("complete");
        break;

      default:
        log.warn(
          "/wrapup-call",
          `unknown handoff reasonCode, callSid: ${callSid}`,
          JSON.stringify(handoffData),
        );
        await endCall(callSid);
        res.status(200).send("complete");
    }
  } catch (error) {
    log.error("/wrapup-call", "error while wrapping up a call. ", error);
    res.status(500).send(error);
  }
});

export const completionServerRoutes = router;
