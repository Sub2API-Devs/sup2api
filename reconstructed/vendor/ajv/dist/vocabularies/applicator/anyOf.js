/**
 * ajv/dist/vocabularies/applicator/anyOf.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_code_2 } from "../code.js";

//@ chunk-s82q9s4x.js:103073-103296 cjs-fingerprint
var require_anyOf = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var code_1 = require_code_2();
  var def = {
    keyword: "anyOf",
    schemaType: "array",
    trackErrors: true,
    code: code_1.validateUnion,
    error: {
      message: "must match a schema in anyOf",
    },
  };
  cjsExports.default = def;
});
export { require_anyOf };
