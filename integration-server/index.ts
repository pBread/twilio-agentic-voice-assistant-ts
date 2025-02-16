import { Router } from "express";
import log from "../lib/logger.js";

const router = Router();

// receives events from sync, including the
router.post("/integration-server/sync-webhook", async (req, res) => {
  const payload = req.body;
  // log.info("int/sync-webhook", payload.EventType);

  res.status(200).send({ status: "success" });
});

export const intergrationServerRoutes = router;
