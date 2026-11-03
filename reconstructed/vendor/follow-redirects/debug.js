/**
 * follow-redirects/debug.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: follow-redirects@1.16.0
 * pieces: chunk-h6b7mazd.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";
import { require_debug_2 } from "../debug/src/index.js";

//@ chunk-h6b7mazd.js:37343-37518 cjs-fingerprint
var require_debug = x(function (cjsExports, cjsModule) {
  var debug;
  cjsModule.exports = function () {
    if (!debug) {
      try {
        debug = require_debug_2()("follow-redirects");
      } catch (error) {}
      if (typeof debug !== "function") debug = function () {};
    }
    debug.apply(null, arguments);
  };
});
export { require_debug };
