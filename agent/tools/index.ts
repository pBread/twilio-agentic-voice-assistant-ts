import * as tools from "./functions.js";
import { intergrationServerBaseUrl } from "../../shared/endpoints.js";
import type { ToolExecutor, ToolSpec } from "../types.js";
import log from "../../lib/logger.js";

// check for duplicates
const duplicateTools = new Map<string, string[]>();
Object.entries(tools).forEach(([exportName, tool]) => {
  const existingExports = duplicateTools.get(tool.name) || [];
  duplicateTools.set(tool.name, [...existingExports, exportName]);
});

const duplicates = Array.from(duplicateTools.entries()).filter(
  ([toolName, exports]) => exports.length > 1,
);

if (duplicates.length) {
  const duplicateList = duplicates
    .map(
      ([toolName, exports], idx) =>
        `(${idx + 1}) Tool "${toolName}" is defined multiple times with exports: ${exports.join(", ")}`,
    )
    .join("\n");

  const error = `Duplicate tool definitions detected:\n${duplicateList}\n\nEach tool must have a unique name. `;
  log.error("agent/tools", error);
  throw new Error(error);
}

const fnRegistry = new Map<string, ToolExecutor>();
export const getToolExecutor = (toolName: string) => fnRegistry.get(toolName);

export const toolManifest: ToolSpec[] = Object.values(tools).map(
  ({ fn, ...tool }) => {
    fnRegistry.set(tool.name, fn);
    return tool;
  },
);
