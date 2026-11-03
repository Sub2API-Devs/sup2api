/**
 * ajv/dist/vocabularies/applicator/dependentSchemas.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-1r4fv9mg.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { require_dependencies } from "./dependencies.js";

//@ chunk-1r4fv9mg.js:2797-2999 cjs-fingerprint
var require_dependentSchemas = x(function (cjsExports) {
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
