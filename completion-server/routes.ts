import { Router } from "express";
import { WebsocketRequestHandler } from "express-ws";
import log from "../lib/logger";
import { SessionManager } from "./session-manager";
import { ConversationRelayAdapter } from "./twilio/conversation-relay-adapter";
import { makeConversationRelayTwiML } from "./twilio/twiml";
import { TwilioCallWebhookPayload } from "./twilio/voice";

const router = Router();

/****************************************************
 Phone Number Webhooks
****************************************************/
router.post("/incoming-call", async (req, res) => {
  const { CallSid: callSid } = req.body as TwilioCallWebhookPayload;

  const twiml = makeConversationRelayTwiML({ callSid, context: {} });
});

router.post("/call-status", async (req, res) => {});

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

  const relay = new ConversationRelayAdapter(ws);
  const session = new SessionManager(callSid);

  relay.onSetup((ev) => {
    // handle setup
  });

  const turns = session.turns.list();
};

/****************************************************
 Executed After Conversation Relay Session Ends
 https://www.twilio.com/docs/voice/twiml/connect/conversationrelay#end-session-message
 Used for transfering calls to a human agent.
****************************************************/
router.post("/call-wrapup", async (req, res) => {
  const isHandoff = "HandoffData" in req.body;
  const callSid = req.body.CallSid;

  if (isHandoff) {
    log.info(
      "/call-wrapup",
      `Live agent handoff starting. CallSid: ${callSid}`
    );

    let handoffData: object;
    try {
      handoffData = JSON.parse(req.body.HandoffData);
    } catch (error) {
      log.error(
        `/call-wrapup`,
        "Unable to parse handoffData in wrapup webhook. ",
        "Request Body: ",
        JSON.stringify(req.body)
      );
      res.status(500).send({ status: "failed", error });
    }
  }
});

export const completionServerRoutes = router;
