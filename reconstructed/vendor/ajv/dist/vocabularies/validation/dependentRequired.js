/**
 * ajv/dist/vocabularies/validation/dependentRequired.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-1r4fv9mg.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { bXr } from "../applicator/dependencies.js";

//@ chunk-1r4fv9mg.js:2580-2797 cjs-fingerprint
var ce = x(function (ie) {
  Object.defineProperty(ie, "__esModule", { value: !0 });
  var I = bXr(),
    et = {
      keyword: "dependentRequired",
      type: "object",
      schemaType: "object",
      error: I.error,
      code: (e) => I.validatePropertyDeps(e),
    };
  ie.default = et;
});

export { ce };
