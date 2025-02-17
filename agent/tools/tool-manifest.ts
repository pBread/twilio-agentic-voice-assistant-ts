import { intergrationServerBaseUrl } from "../../shared/endpoints.js";
import type { ToolSpec } from "../types.js";

export const toolManifest: ToolSpec[] = [
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
