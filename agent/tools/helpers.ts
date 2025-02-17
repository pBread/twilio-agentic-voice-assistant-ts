import { z } from "zod";
import log from "../../lib/logger.js";
import type {
  FunctionToolSpec,
  ToolDependencies,
  ToolExecutor,
} from "../types.js";

export function checkErrors<T>(params: any, schema: z.ZodObject<any>) {
  try {
    const data = schema.parse(params);
    return data as T;
  } catch (error) {
    if (error instanceof z.ZodError) return error.errors;
    return error;
  }
}

export function makeToolFn<T extends z.ZodObject<any>>({
  name,
  description,
  parameters,
  fn,
}: {
  name: string;
  description: string;
  parameters: T;
  fn: (args: T, deps: ToolDependencies) => any;
}): FunctionToolSpec<T> & { fn: ToolExecutor<T> } {
  const _fn = async (args: T, deps: ToolDependencies) => {
    const errors = checkErrors(args, parameters);
    if (errors) return { status: "error", errors };

    try {
      const data = await fn(args, deps);
      return { status: "complete", data };
    } catch (error) {
      log.warn("agent", `tool function (${name}) threw error `, {
        error,
        args,
      });

      return { status: "error", errors: [error] };
    }
  };

  return { name, type: "function", description, parameters, fn: _fn };
}
