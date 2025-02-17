import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import log from "../lib/logger.js";

export function mergeInstructions(directory: string): string {
  try {
    const files = readdirSync(directory).sort();

    return files
      .map((file) => {
        try {
          return readFileSync(join(directory, file), "utf-8");
        } catch (error) {
          log.red(`agent`, `error reading instructions file ${file}: `, error);
          return;
        }
      })
      .filter(Boolean)
      .join("\n");
  } catch (error) {
    const msg = `error reading instructions directory ${directory}: `;
    log.red(`agent`, msg, error);
    throw Error(msg + error);
  }
}
