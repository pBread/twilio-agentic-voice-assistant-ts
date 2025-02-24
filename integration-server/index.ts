import { Router } from "express";
import { getMakeLogger } from "../lib/logger.js";

const router = Router();

// receives events from sync
router.post(`/voice-intelligence`, async (req, res) => {
  const payload = req.body;
  const log = getMakeLogger(payload.CallSid);

  res.status(200).send({ status: "success" });
});

export const intergrationServerRoutes = router;
