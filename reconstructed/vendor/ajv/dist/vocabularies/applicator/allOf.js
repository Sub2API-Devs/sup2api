/**
 * ajv/dist/vocabularies/applicator/allOf.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { ew } from "../../compile/util.js";

//@ chunk-s82q9s4x.js:104197-104592 cjs-fingerprint
var Li = x(function (Fi) {
  Object.defineProperty(Fi, "__esModule", { value: !0 });
  var Ki = ew(),
    Tp = {
      keyword: "allOf",
      schemaType: "array",
      code(e) {
        let { gen: gen, schema: schema, it: it } = e;
        if (!Array.isArray(schema)) throw Error("ajv implementation error");
        let n = gen.name("valid");
        schema.forEach((o, i) => {
          if (Ki.alwaysValidSchema(it, o)) return;
          let subschema = e.subschema({ keyword: "allOf", schemaProp: i }, n);
          (e.ok(n), e.mergeEvaluated(subschema));
        });
      },
    };
  Fi.default = Tp;
});

export { Li };
