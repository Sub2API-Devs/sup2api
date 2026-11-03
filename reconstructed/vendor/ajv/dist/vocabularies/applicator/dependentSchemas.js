/**
 * ajv/dist/vocabularies/applicator/dependentSchemas.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-1r4fv9mg.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { bXr } from "./dependencies.js";

//@ chunk-1r4fv9mg.js:2797-2999 cjs-fingerprint
var me = x(function (de) {
  Object.defineProperty(de, "__esModule", { value: !0 });
  var ue = bXr(),
    rt = {
      keyword: "dependentSchemas",
      type: "object",
      schemaType: "object",
      code: (e) => ue.validateSchemaDeps(e),
    };
  de.default = rt;
});

export { me };
