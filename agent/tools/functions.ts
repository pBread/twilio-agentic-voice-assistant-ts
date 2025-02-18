import type { ToolDefinition, ToolParameters } from "../types.js";

/****************************************************
 Get User Profile
****************************************************/
const GetProfileParams: ToolParameters = {
  type: "object",
  properties: {
    email: { type: "string", description: "The user's email address" },
    phone: { type: "string", description: "The user's phone" },
  },
  required: [],
};

interface GetProfile {
  email?: string;
  phone?: string;
}

export const getUserByEmailOrPhone: ToolDefinition<GetProfile> = {
  name: "getUserByEmailOrPhone",
  parameters: GetProfileParams,
  type: "function",
  async fn(args: GetProfile, deps) {
    await new Promise((resolve) => setTimeout(() => resolve(null), 1000));
    return { name: "Richard", email: "richard@gmail.com" };
  },
};
