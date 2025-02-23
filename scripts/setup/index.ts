import { dirname } from "path";
import { fileURLToPath } from "url";
import { EnvManager, sLog } from "../helpers.js";
import path from "path";

// the instructions templates are injected with context at runtime by the agent resolver
const __dirname = dirname(fileURLToPath(import.meta.url)); // this directory
const rootEnv = path.join(__dirname, "../../.env");

const env = new EnvManager(rootEnv);
