import { dirname, join } from "path";
import { fileURLToPath } from "url";
import * as context from "./context/index.js";
import { toolManifest } from "./tools/index.js";
import { mergeInstructions } from "./util.js";

// the instructions templates are injected with context at runtime by the agent resolver
const __dirname = dirname(fileURLToPath(import.meta.url)); // this directory
const instructionsTemplate = mergeInstructions(join(__dirname, "instructions"));

// todo: allow agents to be stored in a database
export const getAgentConfig = async () => {
  return { context, instructionsTemplate, toolManifest };
};
