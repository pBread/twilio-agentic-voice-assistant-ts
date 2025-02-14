import twilio from "twilio";
import { ConversationRelayAttributes } from "twilio/lib/twiml/VoiceResponse.js";
import { HOSTNAME } from "../../lib/env.js";

interface MakeConversationRelayTwiML
  extends Omit<ConversationRelayAttributes, "url"> {
  callSid: string;
  context: {};
  parameters?: { [key: string]: string }; // values are stringified json objects
}

export function makeConversationRelayTwiML({
  callSid,
  context,
  parameters = {},
  ...params
}: MakeConversationRelayTwiML): string {
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
