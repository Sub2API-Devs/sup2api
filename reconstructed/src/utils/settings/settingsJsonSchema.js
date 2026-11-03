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
import { nut } from "../../../vendor/zod/v4/core/json-schema-processors.js";
import { $e } from "../../services/daemon/sessionCron.js";

//@ chunk-y162pn60.js:11062-11350 placement = generateSettingsJSONSchema (0.88)
function generateSettingsJSONSchema(e) {
  let n = new Set(),
    r = (s) => {
      if (Array.isArray(s)) s.forEach(r);
      else if (typeof s === "object" && s !== null) {
        let { properties: properties } = s;
        if (typeof properties === "object" && properties !== null)
          for (let m of Object.keys(properties)) n.add(m);
        Object.values(s).forEach(r);
      }
    };
  try {
    r(nut(e, { unrepresentable: "any" }));
  } catch {}
  return $e(n);
}

export { generateSettingsJSONSchema };
