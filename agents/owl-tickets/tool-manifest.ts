import { intergrationServerBaseUrl } from "../../shared/endpoints.js";
import { ToolDefinition } from "../tools.js";

export const toolManifest: ToolDefinition[] = [
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
    type: "request",
    name: "getUserOrders",
    endpoint: {
      url: `${intergrationServerBaseUrl}/get-user`,
      method: "POST",
      contentType: "json",
    },
  },
];
