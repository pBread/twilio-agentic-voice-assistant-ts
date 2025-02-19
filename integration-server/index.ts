import { Router } from "express";
import { getMakeLogger } from "../lib/logger.js";
import { integServerRoute } from "../shared/endpoints.js";

const router = Router();

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
