import { RequestToolSpec } from "../types.js";

export async function executeRequestTool(
  tool: RequestToolSpec,
  args?: object,
): Promise<object> {
  return fetch(tool.endpoint.url, {
    method: tool.endpoint.method,
    body: JSON.stringify(args),
  }).then((res) => res.json() as object);
}
