import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { mergeInstructions } from "../shared/merge-instructions.js";
import type { ToolDefinition } from "../tools.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const instructionsTemplate = mergeInstructions(
  join(__dirname, "instructions"),
);

export const toolManifest: ToolDefinition[] = [];
