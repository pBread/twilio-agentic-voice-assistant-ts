import log from "../../lib/logger.js";
import type { ToolExecutor } from "../types.js";
import * as tools from "./functions.js";

export const fnRegistry = new Map<string, ToolExecutor>();

const mismatchedExports: string[][] = [];

export const toolManifest = Object.entries(tools).map(([exportName, tool]) => {
  if (exportName !== tool.name) mismatchedExports.push([exportName, tool.name]);

  return tool;
});

if (mismatchedExports.length) {
  const mismatches = mismatchedExports
    .map(
      ([exportName, toolName]) =>
        `\tExport name: "${exportName}", Tool name: "${toolName}"`,
    )
    .join("\n");

  const correction = mismatchedExports
    .map(
      ([_, toolName]) =>
        `export const ${toolName} = makeToolFn({ name: "${toolName}", ... });`,
    )
    .join("\n");

  log.warn(
    `agent/tools`,
    `\
Tool name mismatches detected:
${mismatches}

This could lead to unexpected behavior when the tools are invoked.
To fix this, ensure the exported function names match their tool's 'name' property:

${correction}`,
  );
}
