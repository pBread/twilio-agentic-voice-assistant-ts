import * as env from "./shared/env.js";

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

const { DEFAULT_TWILIO_NUMBER, DEVELOPERS_PHONE_NUMBER, HOSTNAME, PORT } = env;

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
  let defaultPhone = null;
  if (DEFAULT_TWILIO_NUMBER)
    defaultPhone =
      parseE164(DEFAULT_TWILIO_NUMBER)?.formatted.international ??
      DEFAULT_TWILIO_NUMBER;

  const examplePhone = DEVELOPERS_PHONE_NUMBER ?? "+18885550001";

  log.green(`\
Local URL                 http://localhost:${PORT}
Public URL                https://${HOSTNAME}

Incoming Phone Webhook    https://${HOSTNAME}/incoming-call
Call Status Webhook       https://${HOSTNAME}/call-status

Outbound Call Route       https://${HOSTNAME}/outbound
                          https://${HOSTNAME}/outbound?to=${examplePhone}

Demo Phone Number         ${defaultPhone}
`);
});
