import { Router } from "express";
import log, { getMakeLogger } from "../lib/logger.js";
import { integServerRoute } from "../shared/endpoints.js";

const router = Router();

router.post(`/debug`, async (req, res) => {
  const payload = req.body;
  log.debug("/debug", JSON.stringify(req.body, null, 2));

  // log.info("int/sync-webhook", payload.EventType);

  res.status(200).send({ status: "success" });
});

// receives events from sync
router.post(`${integServerRoute}/sync-webhook`, async (req, res) => {
  const payload = req.body;
  const log = getMakeLogger(payload.CallSid);

  // log.info("int/sync-webhook", payload.EventType);

  res.status(200).send({ status: "success" });
});

router.post(`${integServerRoute}/get-user`, async (req, res) => {
  const payload = req.body;
  const log = getMakeLogger(payload.callSid);

  log.debug("int/get-user", payload);

  res.status(200).send({ status: "success" });
});

export const intergrationServerRoutes = router;
