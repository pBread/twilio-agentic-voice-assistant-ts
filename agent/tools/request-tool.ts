import type { ToolExecutor } from "../types.js";

export const requestToolExecutor: ToolExecutor = async (args, deps) => {
  const log = deps.log;

  log.debug("requestToolExecutor", "args", args);

  return { id: "abc-123" };
};
