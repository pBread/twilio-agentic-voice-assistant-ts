import type { ToolSpec } from "../../types.js";

export const commonToolManifest: ToolSpec[] = [
  {
    name: "getUserByEmailOrPhone",
    description: "Find a user by their email address or their phone number.",
    type: "function",
    parameters: {
      type: "object",
      properties: {
        email: { type: "string", description: "The user's email address" },
        phone: {
          type: "string",
          description: "The user's phone in e164 format, i.e. +12223330001",
        },
      },
      required: [],
    },
  },
  {
    name: "getOrderByConfirmationNumber",
    description: "Find an order by its confirmation number.",
    type: "function",
    parameters: {
      type: "object",
      properties: {
        orderId: { type: "string", description: "The ID of the order" },
      },
      required: ["orderId"],
    },
  },
  {
    name: "getUserOrders",
    description: "Get all orders for a specific user.",
    type: "function",
    parameters: {
      type: "object",
      properties: {
        userId: {
          type: "string",
          description: "The user id from the user record",
        },
      },
      required: ["userId"],
    },
  },
  {
    name: "executeRefund",
    description: "Execute a refund for a given order",
    type: "function",
    parameters: {
      type: "object",
      properties: {
        authority: {
          type: "string",
          description:
            "Explain why you have the authority to process this refund. The permission requirements are listed in the procedures section of the system instructions.",
        },
        orderId: {
          type: "string",
          description: "The id of the order being refunded.",
        },
        orderLineIds: {
          type: "array",
          items: { type: "string" },
          description:
            "The ids of the line items that are needed to be refunded.",
        },
        reason: {
          type: "string",
          description: "The reason the order is being refunded.",
        },
      },
      required: ["authority", "orderId", "orderLineIds", "reason"],
    },
  },
  {
    name: "sendSmsRefundNotification",
    description:
      "Send an SMS message to the user with details about the refund in question.",
    type: "function",
    parameters: {
      type: "object",
      properties: {
        orderId: {
          type: "string",
          description: "The id of the order being refunded.",
        },
        orderLineIds: {
          type: "array",
          items: { type: "string" },
          description:
            "The ids of the line items that are needed to be refunded.",
        },
      },
      required: ["orderId", "orderLineIds"],
    },
  },
];
