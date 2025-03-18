import { Router } from "express";
import { getMakeLogger } from "../lib/logger.ts";
import { db } from "./mock-database.ts";

const router = Router();

router.post(`/getOrderByConfirmationNumber`, async (req, res) => {
  const { call, ...args } = req.body;
  const log = getMakeLogger(call?.callSid);

  if (!args.orderId) {
    res.status(400).json({ error: "invalid arguments" });
    return;
  }

  const orderId = args.orderId.replace(/\-/g, "").toLowerCase();
  const order = db.orders.find(
    (order) => order.id.replace(/\-/g, "").toLowerCase() === orderId,
  );

  res.status(200).json(order);
});

router.post(`/getUserOrders`, async (req, res) => {
  const { call, ...args } = req.body;
  const log = getMakeLogger(call?.callSid);

  if (!args.userId) {
    res.status(400).json({ error: "invalid arguments" });
    return;
  }

  const userId = args.userId.replace(/\-/g, "").toLowerCase();
  const orders = db.orders.filter(
    (order) => order.user_id.replace(/\-/g, "").toLowerCase() === userId,
  );

  res.status(200).json(orders);
});

export const intergrationServerRoutes = router;
