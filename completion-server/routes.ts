import { Router } from "express";
import { WebsocketRequestHandler } from "express-ws";
import { HOSTNAME } from "../lib/env";
import { TwilioCallWebhookPayload } from "./twilio-voice";

const router = Router();

interface MakeConversationRelayTwiML {
  callSid: string;
  // TTS
  ttsProvider: string;
  voice: string;

  // STT
  transcriptionProvider: string;

  // greeting
  welcomeGreeting: string;
  welcomeGreetingInterruptible: boolean;

  dtmfDetection: boolean;
  interruptByDtmf: boolean;

  context: {};
  parameters?: { [key: string]: string }; // values are stringified json objects
}

function makeConversationRelayTwiML({
  callSid,

  ttsProvider,
  voice,

  transcriptionProvider,

  welcomeGreeting,
  welcomeGreetingInterruptible,

  dtmfDetection,
  interruptByDtmf,

  context,
}: MakeConversationRelayTwiML) {
  let parameters: string[] = [];
  parameters.push(
    `<Parameter name="context" value="${JSON.stringify(context)}" />`
  );
  parameters.push(`<Parameter name="greeting" value="${welcomeGreeting}" />`);
  parameters.push(
    `<Parameter name="welcomeGreetingInterruptible" value="${welcomeGreetingInterruptible}" />`
  );

  let welcomeParams = welcomeGreetingInterruptible // If welcome is interruptable, the greeting will be chunked by sentence then emitted to the user in the websocket. This give us more granularity on tracking interruptions.
    ? ""
    : `\
welcomeGreeting="${welcomeGreeting}"
welcomeGreetingInterruptible="${welcomeGreetingInterruptible}"
`;

  return `\
<Response>
  <Connect action="https://${HOSTNAME}/live-agent-handoff">
    <ConversationRelay url="wss://${HOSTNAME}/convo-relay/${callSid}"
      ttsProvider="${ttsProvider}"
      voice="${voice}"

      transcriptionProvider="${transcriptionProvider}"

      dtmfDetection="${dtmfDetection}"
      interruptByDtmf="${interruptByDtmf}"


      ${welcomeParams}

      >

  </Connect>
</Response>

  `;
}

router.post("/live-agent-handoff", async (req, res) => {});

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
