/**
 * ajv/dist/vocabularies/applicator/allOf.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-xcs4sv9h.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_util_2 } from "../../compile/util.js";

//@ chunk-xcs4sv9h.js:104197-104592 cjs-fingerprint
var require_allOf = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var util_1 = require_util_2();
  var def = {
    keyword: "allOf",
    schemaType: "array",
    code(cxt) {
      let { gen, schema, it } = cxt;
      if (!Array.isArray(schema)) throw Error("ajv implementation error");
      let valid = gen.name("valid");
      schema.forEach((sch, schemaProp) => {
        if (util_1.alwaysValidSchema(it, sch)) return;
        let schCxt = cxt.subschema(
          {
            keyword: "allOf",
            schemaProp,
          },
          valid,
        );
        cxt.ok(valid);
        cxt.mergeEvaluated(schCxt);
      });
    },
  };
  cjsExports.default = def;
});
export { require_allOf };
