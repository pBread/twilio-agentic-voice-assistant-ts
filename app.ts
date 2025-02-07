import * as env from "./lib/env";

import express from "express";
import ExpressWs from "express-ws";
import { ConversationRelayAdapter } from "./services/twilio-conversation-relay-adapter";

const { HOSTNAME, PORT } = env;

const { app } = ExpressWs(express());
app.use(express.urlencoded({ extended: true })).use(express.json());

/****************************************************
 Incoming Call Webhook
****************************************************/
app.post("/incoming-call", async (req, res) => {});

app.post("/call-status", async (req, res) => {});

/****************************************************
 Conversation Relay Websocket
****************************************************/
app.ws("/convo-relay/:callSid", async (ws, req) => {
  const { callSid } = req.params;

  const relay = new ConversationRelayAdapter(ws, callSid);

  relay.onSetup((ev) => {
    // handle setup
  });

  // handle speech
  relay.onPrompt((ev) => {
    if (!ev.last) return; // do nothing on partial speech
  });
});

/****************************************************
 Start Server
****************************************************/
app.listen(PORT, () => {
  console.log(`server running on http://localhost:${PORT}`);
  console.log(`public base URL https://${HOSTNAME}`);
});
