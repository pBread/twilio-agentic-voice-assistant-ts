import result from "lodash.result";

export function interpolateTemplate(template: string, obj: object): string {
  const templateRegex = /\{\{([^}]+)\}\}/g; // regex to match {{path.to.value}} patterns

  return template.replace(templateRegex, (match, path: string) => {
    const value = result(obj, path);

    if (value === null || value === undefined) return "";

    // Stringify objects to avoid [object Object]
    if (typeof value === "object") {
      try {
        return JSON.stringify(value, null, 2);
      } catch (e) {
        const msg = "Error injecting context into template";
        throw Error(msg);
      }
    }

    return String(value);
  });
}
