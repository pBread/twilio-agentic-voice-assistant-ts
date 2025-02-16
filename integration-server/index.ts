import { Router } from "express";
import { getMakeLogger } from "../lib/logger.js";

const router = Router();

// receives events from sync, including the
router.post("/integration-server/sync-webhook", async (req, res) => {
  const payload = req.body;
  const log = getMakeLogger(payload.CallSid);

  // log.info("int/sync-webhook", payload.EventType);

  res.status(200).send({ status: "success" });
});

export const intergrationServerRoutes = router;
