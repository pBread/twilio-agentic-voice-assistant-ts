import * as tools from "./functions.js";

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
      ([toolName, exports]) =>
        `\tTool "${toolName}" is defined multiple times with exports: ${exports.join(", ")}`,
    )
    .join("\n");

  throw new Error(
    `Duplicate tool definitions detected!\n\n${duplicateList}\n\nEach tool must have a unique name.`,
  );
}
