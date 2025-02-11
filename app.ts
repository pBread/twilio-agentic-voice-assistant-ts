import * as env from "./lib/env";

import express from "express";
import ExpressWs from "express-ws";
import log from "./lib/logger";

const { HOSTNAME, PORT } = env;

const { app } = ExpressWs(express());
app.use(express.urlencoded({ extended: true })).use(express.json());

/****************************************************
 Incoming Call Webhook
****************************************************/

/****************************************************
 Conversation Relay Websocket
****************************************************/
app.ws("/convo-relay/:callSid", async (ws, req) => {
  const { callSid } = req.params;

  const session = new SessionManager(callSid);

  const relay = new ConversationRelayAdapter(ws);

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
  log.green(`server running on http://localhost:${PORT}`);
  log.green(`public base URL https://${HOSTNAME}`);
});
