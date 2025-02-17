import type { JSONSchema } from "json-schema-to-ts";
import type { FunctionToolSpec, ToolExecutor } from "../types.js";

export function makeToolFn<TParams extends JSONSchema>({
  name,
  description,
  parameters,
  fn,
}: {
  name: string;

  description: string;
  parameters: TParams;
  fn: ToolExecutor<TParams>;
}): FunctionToolSpec & { fn: ToolExecutor<TParams> } {
  return { name, type: "function", description, parameters, fn };
}
