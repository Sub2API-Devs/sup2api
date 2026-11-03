/**
 * has-tostringtag/shams.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: has-tostringtag@1.0.2
 * pieces: chunk-h6b7mazd.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../runtime/bun-runtime.js";
import { require_shams } from "../has-symbols/shams.js";

//@ chunk-h6b7mazd.js:20428-20524 cjs-require-graph
var require_shams_2 = x(function (cjsExports, cjsModule) {
  var hasSymbols = require_shams();
  cjsModule.exports = function () {
    return hasSymbols() && !!Symbol.toStringTag;
  };
});
export { require_shams_2 };
