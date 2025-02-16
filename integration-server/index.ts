import { Router } from "express";
import { getMakeLogger } from "../lib/logger.js";
import { integrationServerRoute } from "../shared/endpoints.js";

const router = Router();

// receives events from sync
router.post(`${integrationServerRoute}/sync-webhook`, async (req, res) => {
  const payload = req.body;
  const log = getMakeLogger(payload.CallSid);

  // log.info("int/sync-webhook", payload.EventType);

  res.status(200).send({ status: "success" });
});

router.post(`${integrationServerRoute}/get-user`, async (req, res) => {
  const payload = req.body;
  const log = getMakeLogger(payload.callSid);

  log.debug("int/get-user", payload);

  res.status(200).send({ status: "success" });
});

export const intergrationServerRoutes = router;
