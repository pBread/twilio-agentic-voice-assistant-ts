import { Router } from "express";
import log from "../lib/logger.js";

const router = Router();

router.post("/integration-server/data-intake", async (req, res) => {
  const payload = req.body;
  log.info("data-intake", payload);

  res.status(200).send({ status: "success" });
});

export const intergrationServerRoutes = router;
