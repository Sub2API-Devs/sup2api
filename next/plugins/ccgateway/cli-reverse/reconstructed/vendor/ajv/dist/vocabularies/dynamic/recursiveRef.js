/**
 * ajv/dist/vocabularies/dynamic/recursiveRef.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-1r4fv9mg.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_dynamicRef } from "./dynamicRef.js";

//@ chunk-1r4fv9mg.js:2225-2409 cjs-fingerprint
var require_recursiveRef = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var dynamicRef_1 = require_dynamicRef();
  var def = {
    keyword: "$recursiveRef",
    schemaType: "string",
    code: (cxt) => dynamicRef_1.dynamicRef(cxt, cxt.schema),
  };
  cjsExports.default = def;
});
export { require_recursiveRef };
