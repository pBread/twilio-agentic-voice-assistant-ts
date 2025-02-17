import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { mergeInstructions } from "../shared/merge-instructions.js";

const __dirname = dirname(fileURLToPath(import.meta.url)); // this directory
export const instructionsTemplate = mergeInstructions(
  join(__dirname, "instructions"),
);

export { toolManifest } from "./tool-manifest.js";
export * as context from "./context/index.js";
