import result from "lodash.result";

/**
 * Interpolates values from an object into a template string.
 *
 * The function replaces placeholders in the format {{path.to.value}} with the corresponding
 * values from the provided object. The path can be a simple property name or a nested path
 * using dot notation (handled by lodash.result).
 *
 * @param {string} template - The template string containing placeholders in the format {{path.to.value}}
 * @param {Object} obj - The object containing values to interpolate into the template
 *
 * @returns {string} The interpolated string with all placeholders replaced with actual values
 *
 * @example
 * // Simple property
 * interpolateTemplate("Hello {{name}}!", { name: "World" }); // "Hello World!"
 *
 * // Nested property
 * interpolateTemplate("{{user.profile.firstName}}", { user: { profile: { firstName: "John" } } }); // "John"
 *
 * // Object values are JSON stringified
 * interpolateTemplate("Data: {{data}}", { data: { key: "value" } }); // "Data: {\n  "key": "value"\n}"
 *
 * // Missing values are replaced with empty strings
 * interpolateTemplate("Value: {{missing}}", {}); // "Value: "
 *
 * @throws {Error} Throws an error if there's a problem stringifying an object value
 */
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
