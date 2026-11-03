/**
 * ajv/dist/vocabularies/dynamic/recursiveAnchor.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-1r4fv9mg.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { require_dynamicAnchor } from "./dynamicAnchor.js";
import { require_util_2 as require_util } from "../../compile/util.js";

//@ chunk-1r4fv9mg.js:1958-2225 cjs-fingerprint
var require_recursiveAnchor = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var dynamicAnchor_1 = require_dynamicAnchor();
  var util_1 = require_util();
  var def = {
    keyword: "$recursiveAnchor",
    schemaType: "boolean",
    code(cxt) {
      if (cxt.schema) dynamicAnchor_1.dynamicAnchor(cxt, "");
      else util_1.checkStrictMode(cxt.it, "$recursiveAnchor: false is ignored");
    },
  };
  cjsExports.default = def;
});
export { require_recursiveAnchor };
