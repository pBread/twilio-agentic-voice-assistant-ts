import type { ToolExecutor } from "../types.js";

export const requestToolExecutor: ToolExecutor = async (args, deps) => {
  const log = deps.log;
  const tool = deps.tool;

  if (tool.type !== "request") {
    const msg = "requestToolExecutor received invalid tool type";
    log.error("tools.request", msg, tool);
    throw Error(msg);
  }

  try {
    const body = JSON.stringify({
      call: deps.store.context.call,
      ...args,
    });

    const result = await fetch(tool.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body,
    }).then((res) => res.json());

    return result;
  } catch (error) {
    log.warn("tools.request", "error executing tool", error);
    throw error;
  }
};
