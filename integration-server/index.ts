import { Router } from "express";
import { getMakeLogger } from "../lib/logger.js";

const router = Router();

// receives events from sync
router.post(`/voice-intelligence`, async (req, res) => {
  const payload = req.body;
  const log = getMakeLogger(payload.CallSid);

  log.debug("int/voice-intelligence", JSON.stringify(payload, null, 2));

  res.status(200).send({ status: "success" });
});

export const intergrationServerRoutes = router;
