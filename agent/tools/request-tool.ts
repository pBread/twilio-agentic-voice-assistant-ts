import type { ToolExecutor } from "../types.js";

export const requestToolExecutor: ToolExecutor = async (args, deps) => {
  const log = deps.log;
  const tool = deps.tool;

  if (tool.type !== "request") {
    const msg = "requestToolExecutor received invalid tool type";
    log.error("tools.request", msg, tool);
    throw Error(msg);
  }

  log.debug("tools.request", "args", args, "deps.tool", deps.tool);

  try {
    const result = await fetch(tool.url, {
      method: "POST",
      body: JSON.stringify({
        ...args,
        call: deps.store.context.call,
      }),
    }).then((res) => res.json());
    log.debug("tools.request", "result", result);

    return result;
  } catch (error) {
    log.warn("tools.request", "error executing tool", error);
    throw error;
  }
};
