/**
 * ajv/dist/vocabularies/applicator/not.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { ew } from "../../compile/util.js";

//@ chunk-s82q9s4x.js:102646-103073 cjs-fingerprint
var Ci = x(function (Ti) {
  Object.defineProperty(Ti, "__esModule", { value: !0 });
  var Ii = ew(),
    kp = {
      keyword: "not",
      schemaType: ["object", "boolean"],
      trackErrors: !0,
      code(e) {
        let { gen: gen, schema: schema, it: it } = e;
        if (Ii.alwaysValidSchema(it, schema)) {
          e.fail();
          return;
        }
        let n = gen.name("valid");
        (e.subschema({ keyword: "not", compositeRule: !0, createErrors: !1, allErrors: !1 }, n),
          e.failResult(
            n,
            () => e.reset(),
            () => e.error(),
          ));
      },
      error: { message: "must NOT be valid" },
    };
  Ti.default = kp;
});

export { Ci };
