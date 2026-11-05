/**
 * ajv/dist/vocabularies/applicator/dependentSchemas.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-1jdkttw7.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_dependencies } from "./dependencies.js";

//@ chunk-1jdkttw7.js:2798-3000 cjs-fingerprint
var require_dependentSchemas = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var dependencies_1 = require_dependencies();
  var def = {
    keyword: "dependentSchemas",
    type: "object",
    schemaType: "object",
    code: (cxt) => dependencies_1.validateSchemaDeps(cxt),
  };
  cjsExports.default = def;
});
export { require_dependentSchemas };
