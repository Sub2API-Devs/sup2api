/**
 * ajv/dist/vocabularies/applicator/prefixItems.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { Ir } from "./items.js";

//@ chunk-s82q9s4x.js:94228-94448 cjs-fingerprint
var ui = x(function (ci) {
  Object.defineProperty(ci, "__esModule", { value: !0 });
  var ai = Ir(),
    np = {
      keyword: "prefixItems",
      type: "array",
      schemaType: ["array"],
      before: "uniqueItems",
      code: (e) => ai.validateTuple(e, "items"),
    };
  ci.default = np;
});

export { ui };
