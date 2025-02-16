import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { mergeInstructions } from "../shared/merge-instructions.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const instructionsTemplate = mergeInstructions(join(__dirname, "instructions"));

export const agent = { instructionsTemplate };
