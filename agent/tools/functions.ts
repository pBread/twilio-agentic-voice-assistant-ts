import type { JSONSchema } from "json-schema-to-ts";
import log from "../../lib/logger.js";
import { makeToolFn } from "./helpers.js";

/****************************************************
 Get User Profile
****************************************************/

const zGetProfile = {
  type: "object",
  properties: {
    email: { type: "string", description: "The user's email address" },
    phone: { type: "string", description: "The user's phone number" },
  },
} as const satisfies JSONSchema;

log.debug("agent/tools", "zGetProfile", JSON.stringify(zGetProfile, null, 2));

type GetProfile = typeof zGetProfile;
export const getUserByEmailOrPhone = makeToolFn<GetProfile>({
  name: "getUserByEmailOrPhone",
  description: "Fetch the user's record by email or phone",
  parameters: zGetProfile,
  async fn(args, deps) {
    if (Math.random() > 0.5) throw Error("Error Test");
    return { name: "Richard", email: "richard@gmail.com" };
  },
});
