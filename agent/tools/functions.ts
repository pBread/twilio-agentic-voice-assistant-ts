import { z } from "zod";
import { makeToolFn } from "./helpers.js";
import log from "../../lib/logger.js";

/****************************************************
 Get User Profile
****************************************************/
const zGetProfile = z.object({
  email: z.string().email().describe("The user's email address").optional(),
  phone: z
    .string()
    .describe("The user's phone number formatted in E164, i.e. +18885550001")
    .optional(),
});

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
