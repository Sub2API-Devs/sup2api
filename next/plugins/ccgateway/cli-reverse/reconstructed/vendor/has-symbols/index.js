/**
 * has-symbols/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: has-symbols@1.1.0
 * pieces: chunk-ww9agm6g.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../runtime/bun-runtime.js";
import { require_shams } from "./shams.js";

//@ chunk-ww9agm6g.js:9455-9716 cjs-fingerprint
var require_has_symbols = __commonJS(function (cjsExports, cjsModule) {
  var origSymbol = typeof Symbol !== "undefined" && Symbol;
  var hasSymbolSham = require_shams();
  cjsModule.exports = function () {
    if (typeof origSymbol !== "function") return false;
    if (typeof Symbol !== "function") return false;
    if (typeof origSymbol("foo") !== "symbol") return false;
    if (typeof Symbol("bar") !== "symbol") return false;
    return hasSymbolSham();
  };
});
export { require_has_symbols };
