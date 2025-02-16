import { HOSTNAME } from "../../shared/env/server.js";

const tools = [
  {
    type: "request",
    name: "getUserProfile",
    endpoint: {
      url: `https://${HOSTNAME}/get-user`,
      method: "POST",
      contentType: "json",
    },
  },
  {
    type: "function",
    name: "updateUserProfile",
    parameters: {
      type: "object",
      properties: { userEmail: { type: "string" } },
    },
  },
];
