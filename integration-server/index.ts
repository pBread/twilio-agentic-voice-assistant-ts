import { Router } from "express";
import log from "../lib/logger.js";

const router = Router();

router.post("/store-webhook", async (req, res) => {
  const payload = req.body;
  log.info("/store-webhook", payload);

  res.status(200).send({ status: "success" });
});

export const intergrationServerRoutes = router;
