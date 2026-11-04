/**
 * utils/settings/settingsJsonSchema.ts
 *
 * 2.1.316 新增：设置 JSON schema
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-y162pn60.js (1)
 * attribution: placement 1
 */
import { toJSONSchema } from "../../../vendor/zod/v4/core/json-schema-processors.js";
import { identity } from "../../services/daemon/sessionCron.js";

//@ chunk-y162pn60.js:11062-11350 placement (2.1.88 match: generateSettingsJSONSchema, 0.88)
function generateSettingsJSONSchema(schema) {
  let propertyNames = new Set();
  let collectProperties = (jsonSchema) => {
    if (Array.isArray(jsonSchema)) jsonSchema.forEach(collectProperties);
    else if (typeof jsonSchema === "object" && jsonSchema !== null) {
      let { properties } = jsonSchema;
      if (typeof properties === "object" && properties !== null)
        for (let key of Object.keys(properties)) propertyNames.add(key);
      Object.values(jsonSchema).forEach(collectProperties);
    }
  };
  try {
    collectProperties(
      toJSONSchema(schema, {
        unrepresentable: "any",
      }),
    );
  } catch {}
  return identity(propertyNames);
}
export { generateSettingsJSONSchema };
