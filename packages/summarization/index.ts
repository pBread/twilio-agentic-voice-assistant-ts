import { readFileSync } from "fs";
import OpenAI from "openai";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import type { AgentResolver } from "../../completion-server/agent-resolver/index.js";
import type { SessionStore } from "../../completion-server/session-store/index.js";
import { getMakeLogger } from "../../lib/logger.js";
import { OPENAI_API_KEY } from "../../shared/env.js";
import { interpolateTemplate } from "../../lib/template.js";
import { ChatCompletion } from "openai/resources/index.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url)); // this directory

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
