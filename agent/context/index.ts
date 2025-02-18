// everything exported from this file will be set as the initial context of the AI agent

import { ToolConfiguration } from "../../shared/session/context.js";

export { procedures } from "./procedures.js";
export const toolConfig: Record<string, ToolConfiguration> = {};
