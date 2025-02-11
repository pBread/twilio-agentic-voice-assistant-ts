import { Router } from "express";
import { WebsocketRequestHandler } from "express-ws";
import twilio from "twilio";
import { ConversationRelayAttributes } from "twilio/lib/twiml/VoiceResponse";
import { HOSTNAME } from "../lib/env";
import log from "../lib/logger";
import { TwilioCallWebhookPayload } from "./twilio/voice";

const router = Router();

interface MakeConversationRelayTwiML
  extends Omit<ConversationRelayAttributes, "url"> {
  callSid: string;
  context: {};
  parameters?: { [key: string]: string }; // values are stringified json objects
}

function makeConversationRelayTwiML({
  callSid,
  context,
  parameters = {},
  ...params
}: MakeConversationRelayTwiML) {
  const response = new twilio.twiml.VoiceResponse();

  const connect = response.connect({
    // action endpoint will be executed when an 'end' action is dispatched to the ConversationRelay websocket
    // https://www.twilio.com/docs/voice/twiml/connect/conversationrelay#end-session-message
    //
    // In this implementation, we use the action for transfering conversations to a human agent
    action: `https://${HOSTNAME}/call-wrapup`,
  });

  const conversationRelay = connect.conversationRelay({
    ...params,
    url: `wss://${HOSTNAME}/convo-relay/${callSid}`, // the websocket route defined below
  });

  conversationRelay.parameter({
    name: "context",
    value: JSON.stringify(context),
  });

  Object.entries(parameters).forEach(([name, value]) =>
    conversationRelay.parameter({ name, value })
  );

  return response.toString();
}

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

/****************************************************
 Phone Number Webhooks
****************************************************/
router.post("/incoming-call", async (req, res) => {
  const { CallSid } = req.body as TwilioCallWebhookPayload;

  const twiml = `\


  `;
});

router.post("/call-status", async (req, res) => {});

/****************************************************
 Outbound Calling Routes
****************************************************/
router.post("/place-call/:to", async (req, res) => {
  const to = req.params.to;

  const twiml = `\


  `;
});

export const completionServerRoutes = router;

/****************************************************
 Conversation Relay Websocket
****************************************************/
export const CONVERSATION_RELAY_WS_ROUTE = "/convo-relay/:callSid";
export const conversationRelayWebsocketHandler: WebsocketRequestHandler = (
  ws,
  req
) => {
  const { callSid } = req.params;
};
