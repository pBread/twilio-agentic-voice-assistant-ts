import {
  transferToFlexAgent,
  transferToFlexAgentSpec,
} from "../../modules/flex-transfer-to-agent/tools.js";
import {
  askAgent,
  askAgentSpec,
} from "../../modules/human-in-the-loop/tools.js";
import { ToolDefinition, ToolExecutor } from "../types.js";
import * as commonToolFunctions from "./common/tool-functions.js";
import { commonToolManifest } from "./common/tool-manifest.js";
import { requestToolExecutor } from "./request-tool.ts";

export const toolManifest: ToolDefinition[] = [
  ...commonToolManifest,
  askAgentSpec,
  transferToFlexAgentSpec,
];

const toolFunctionRegistry = new Map<string, ToolExecutor<any>>([
  ...Object.entries({
    ...commonToolFunctions,
    askAgent,
    transferToFlexAgent,
    requestToolExecutor,
  }),
]);

export const getToolExecutor = (key: string): ToolExecutor<any> | undefined => {
  return toolFunctionRegistry.get(key);
};
