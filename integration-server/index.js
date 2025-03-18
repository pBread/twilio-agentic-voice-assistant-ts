import { Router } from "express";
import { getMakeLogger } from "../lib/logger.ts";

const router = Router();

// receives voice intelligence webhook
// todo: close the loop w/transcripts
router.get(`/debug`, async (req, res) => {
  const payload = req.body;
  const log = getMakeLogger(payload.CallSid);

  res.status(200).send({ status: "success" });
});

export const intergrationServerRoutes = router;
