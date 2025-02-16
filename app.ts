import * as env from "./shared/env/server.js";

import express from "express";
import ExpressWs from "express-ws";
import {
  CONVERSATION_RELAY_WS_ROUTE,
  completionServerRoutes,
  conversationRelayWebsocketHandler,
} from "./completion-server/index.js";
import { intergrationServerRoutes } from "./integration-server/index.js";
import { parseE164 } from "./lib/e164.js";
import log from "./lib/logger.js";

const { DEFAULT_TWILIO_NUMBER, HOSTNAME, PORT } = env;

const { app } = ExpressWs(express());
app.use(express.urlencoded({ extended: true })).use(express.json());

// completion server
app.use(completionServerRoutes);
app.ws(CONVERSATION_RELAY_WS_ROUTE, conversationRelayWebsocketHandler);

// integration server
app.use(intergrationServerRoutes);

/****************************************************
 Start Server
****************************************************/
app.listen(PORT, () => {
  let phone = null;
  if (DEFAULT_TWILIO_NUMBER)
    phone =
      parseE164(DEFAULT_TWILIO_NUMBER)?.formatted.international ??
      DEFAULT_TWILIO_NUMBER;

  log.green(`\
Local Server Running      http://localhost:${PORT}

Public URL                https://${HOSTNAME}
Incoming Phone Webhook    https://${HOSTNAME}/incoming-call
Call Status Webhook       https://${HOSTNAME}/call-status

Default Phone Number      ${phone}
`);
});
