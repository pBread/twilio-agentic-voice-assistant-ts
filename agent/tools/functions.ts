import Twilio from "twilio";
import { v4 as uuidV4 } from "uuid";
import { db } from "../../integration-server/mock-database.js";
import {
  DEFAULT_TWILIO_NUMBER,
  TWILIO_ACCOUNT_SID,
  TWILIO_API_KEY,
  TWILIO_API_SECRET,
} from "../../shared/env.js";
import type { ToolDefinition, ToolParameters } from "../types.js";
import { AuxiliaryMessage } from "../../shared/session/context.js";

const twilio = Twilio(TWILIO_API_KEY, TWILIO_API_SECRET, {
  accountSid: TWILIO_ACCOUNT_SID,
});

/****************************************************
 Get User Profile
****************************************************/
const GetProfileParams: ToolParameters = {
  type: "object",
  properties: {
    email: { type: "string", description: "The user's email address" },
    phone: {
      type: "string",
      description: "The user's phone in e164 format, i.e. +12223330001",
    },
  },
  required: [],
};

interface GetProfile {
  email?: string;
  phone?: string;
}

export const getUserByEmailOrPhone: ToolDefinition<GetProfile> = {
  name: "getUserByEmailOrPhone",
  description: "Find a user by their email address or their phone number.",
  parameters: GetProfileParams,
  type: "function",
  async fn(args: GetProfile, deps) {
    await new Promise((resolve) => setTimeout(() => resolve(null), 600));
    if (!args.email && !args.phone) return;

    const _email = args.email?.toLowerCase().trim();
    const _phone = args.phone?.replace(/\D/g, "");
    const user = db.users.find((user) => {
      if (_email && user.email?.toLowerCase() === _email) return true;
      if (_phone && _phone === user.mobile_phone?.replace(/\D/g, ""))
        return true;

      return false;
    });

    if (user) deps.store.setContext({ user }); // set the user in the session context after successfully fetching
    return user;
  },
};

/****************************************************
 Get Order By Id
****************************************************/
const GetOrberByConfirmationNumberParams: ToolParameters = {
  type: "object",
  properties: {
    orderId: { type: "string", description: "The ID of the order" },
  },
  required: ["orderId"],
};

interface GetOrberByConfirmationNumber {
  orderId: string;
}

export const getOrderByConfirmationNumber: ToolDefinition<GetOrberByConfirmationNumber> =
  {
    name: "getOrderByConfirmationNumber",
    description: "Find a user by their email address or their phone number.",
    parameters: GetOrberByConfirmationNumberParams,
    type: "function",
    async fn(args: GetOrberByConfirmationNumber, deps) {
      await sleep(500);

      const orderId = args.orderId.replace(/\-/g, "").toLowerCase();

      return db.orders.find(
        (order) => order.id.replace(/\-/g, "").toLowerCase() === orderId,
      );
    },
  };

/****************************************************
 Get User Orders
****************************************************/
const GetUserOrdersParams: ToolParameters = {
  type: "object",
  properties: {
    userId: { type: "string", description: "The user id from the user record" },
  },
  required: ["userId"],
};

interface GetUserOrders {
  userId: string;
}

export const getUserOrders: ToolDefinition<GetUserOrders> = {
  name: "getUserOrders",
  description: "Find a user by their email address or their phone number.",
  parameters: GetUserOrdersParams,
  type: "function",
  async fn(args: GetUserOrders, deps) {
    await new Promise((resolve) => setTimeout(() => resolve(null), 500));

    const userId = args.userId.replace(/\-/g, "").toLowerCase();

    return db.orders.filter(
      (order) => order.user_id.replace(/\-/g, "").toLowerCase() === userId,
    );
  },
};

/****************************************************
 Get User Orders
****************************************************/
const ExecuteRefundParams: ToolParameters = {
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
      description: "The ids of the line items that are needed to be refunded.",
    },
    reason: {
      type: "string",
      description: "The reason the order is being refunded.",
    },
  },
  required: ["authority", "orderId", "orderLineIds", "reason"],
};

interface ExecuteRefund {
  orderId: string;
  orderLineIds: string;
  reason: string;
  userId: string;
}

export const executeRefund: ToolDefinition<ExecuteRefund> = {
  name: "executeRefund",
  description: "Execute a refund for a given order",
  parameters: ExecuteRefundParams,
  type: "function",
  async fn(args: ExecuteRefund, deps) {
    const msg: AuxiliaryMessage = {
      body: `Your refund for order ${args.orderId} has been successfully processed.`,
      channel: "email",
      createdAt: new Date().toISOString(),
      from: deps.store.context.company?.email as string,
      to: deps.store.context.user?.email ?? "demo@example.com",
      id: uuidV4(),
    };

    deps.store.context.auxiliaryMessages = {
      ...(deps.store.context.auxiliaryMessages ?? {}),
      [msg.id]: msg,
    };

    return "refund-processed";
  },
};

/****************************************************
 Send SMS Refund Confirmation
****************************************************/

const SendSmsRefundNotificationParams: ToolParameters = {
  type: "object",
  properties: {
    orderId: {
      type: "string",
      description: "The id of the order being refunded.",
    },
    orderLineIds: {
      type: "array",
      items: { type: "string" },
      description: "The ids of the line items that are needed to be refunded.",
    },
  },
  required: ["orderId", "orderLineIds"],
};

interface SendSmsRefundNotification {
  orderId: string;
  orderLineIds: string[];
}

export const sendSmsRefundNotification: ToolDefinition<SendSmsRefundNotification> =
  {
    name: "sendSmsRefundNotification",
    description:
      "Send an SMS message to the user with details about the refund in question.",
    parameters: SendSmsRefundNotificationParams,
    type: "function",
    fillers: ["One second while I tell my system to send you an SMS"],
    async fn(args: SendSmsRefundNotification, deps) {
      const to =
        deps.store.context.user?.mobile_phone ??
        (deps.store.context.call?.participantPhone as string);

      const firstName = deps.store.context.user?.first_name;

      let body = "";
      if (firstName) body += `Hello ${firstName},\n`;
      else body += "Hello,\n";

      const companyName = deps.store.context.company?.name;
      body += `This is a message from the AI agent at ${companyName}. Here are the details of your refund:\n`;

      const order = db.orders.find((order) => order.id === args.orderId);
      if (!order) throw Error(`Invalid order id: ${args.orderId}`);

      const lines = order.lines.filter((line) =>
        args.orderLineIds.includes(line.id),
      );
      if (!lines.length)
        throw Error(`Invalid order line ids: ${args.orderLineIds.join(", ")}`);

      for (const line of lines) {
        const amount = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(line.net_total);

        body += `${amount} - ${line.product_name}\n`;
      }

      if (DEFAULT_TWILIO_NUMBER)
        await twilio.messages.create({ from: DEFAULT_TWILIO_NUMBER, to, body });
      else
        deps.log.warn(
          "tools",
          "sendSmsRefundNotification did not send a real SMS because no phone number was defined.",
        );

      const msg: AuxiliaryMessage = {
        body,
        channel: "sms",
        createdAt: new Date().toISOString(),
        from: DEFAULT_TWILIO_NUMBER ?? "+18885550001",
        to,
        id: uuidV4(),
      };

      deps.store.context.auxiliaryMessages = {
        ...(deps.store.context.auxiliaryMessages ?? {}),
        [msg.id]: msg,
      };

      return "SMS sent successfully";
    },
  };

/****************************************************
 Helpers
****************************************************/
async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(() => resolve(true), ms));
}
