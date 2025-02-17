import { intergrationServerBaseUrl } from "../../shared/endpoints.js";

export const toolManifest = [
  {
    type: "request",
    name: "getUserProfile",
    endpoint: {
      url: `${intergrationServerBaseUrl}/get-user`,
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
