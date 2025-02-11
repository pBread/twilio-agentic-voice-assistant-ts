import * as env from "./lib/env";

import express from "express";
import ExpressWs from "express-ws";
import {
  CONVERSATION_RELAY_WS_ROUTE,
  completionServerRoutes,
  conversationRelayWebsocketHandler,
} from "./completion-server/routes";
import log from "./lib/logger";

const { HOSTNAME, PORT } = env;

const { app } = ExpressWs(express());
app.use(express.urlencoded({ extended: true })).use(express.json());

// completion server
app.use(completionServerRoutes);
app.ws(CONVERSATION_RELAY_WS_ROUTE, conversationRelayWebsocketHandler);

/****************************************************
 Start Server
****************************************************/
app.listen(PORT, () => {
  log.green(`server running on http://localhost:${PORT}`);
  log.green(`public base URL https://${HOSTNAME}`);
});
