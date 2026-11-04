/**
 * ajv/dist/vocabularies/applicator/prefixItems.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_items } from "./items.js";

//@ chunk-s82q9s4x.js:94228-94448 cjs-fingerprint
var require_prefixItems = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var items_1 = require_items();
  var def = {
    keyword: "prefixItems",
    type: "array",
    schemaType: ["array"],
    before: "uniqueItems",
    code: (cxt) => items_1.validateTuple(cxt, "items"),
  };
  cjsExports.default = def;
});
export { require_prefixItems };
