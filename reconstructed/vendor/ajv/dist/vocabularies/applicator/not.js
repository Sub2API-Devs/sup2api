/**
 * ajv/dist/vocabularies/applicator/not.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_util_2 } from "../../compile/util.js";

//@ chunk-s82q9s4x.js:102646-103073 cjs-fingerprint
var require_not = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var util_1 = require_util_2();
  var def = {
    keyword: "not",
    schemaType: ["object", "boolean"],
    trackErrors: true,
    code(cxt) {
      let { gen, schema, it } = cxt;
      if (util_1.alwaysValidSchema(it, schema)) {
        cxt.fail();
        return;
      }
      let valid = gen.name("valid");
      cxt.subschema(
        {
          keyword: "not",
          compositeRule: true,
          createErrors: false,
          allErrors: false,
        },
        valid,
      );
      cxt.failResult(
        valid,
        () => cxt.reset(),
        () => cxt.error(),
      );
    },
    error: {
      message: "must NOT be valid",
    },
  };
  cjsExports.default = def;
});
export { require_not };
