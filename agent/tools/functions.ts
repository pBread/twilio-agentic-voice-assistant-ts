import { db } from "../../integration-server/mock-database.js";
import type { ToolDefinition, ToolParameters } from "../types.js";

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
    await new Promise((resolve) => setTimeout(() => resolve(null), 2 * 1000));
    if (!args.email && !args.phone) return;

    const _email = args.email?.toLowerCase().trim();
    const _phone = args.phone?.replace(/\D/g, "");
    const user = db.users.find((user) => {
      if (_email && user.email?.toLowerCase() === _email) return true;
      if (_phone && _phone === user.mobile_phone?.replace(/\D/g, ""))
        return true;

      return false;
    });

    if (user) deps.store.setContext({ user });
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
      await new Promise((resolve) => setTimeout(() => resolve(null), 500));

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
