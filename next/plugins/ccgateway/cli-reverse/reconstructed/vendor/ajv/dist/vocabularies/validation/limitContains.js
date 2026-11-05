/**
 * ajv/dist/vocabularies/validation/limitContains.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-1jdkttw7.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_util_2 as require_util } from "../../compile/util.js";

//@ chunk-1jdkttw7.js:3000-3299 cjs-fingerprint
var require_limitContains = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var util_1 = require_util();
  var def = {
    keyword: ["maxContains", "minContains"],
    type: "array",
    schemaType: "number",
    code({ keyword, parentSchema, it }) {
      if (parentSchema.contains === undefined)
        util_1.checkStrictMode(it, `"${keyword}" without "contains" is ignored`);
    },
  };
  cjsExports.default = def;
});
export { require_limitContains };
