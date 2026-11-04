/**
 * asynckit/lib/defer.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: asynckit@0.4.0..0.5.0
 * pieces: chunk-h6b7mazd.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";

//@ chunk-h6b7mazd.js:5269-5492 cjs-fingerprint
var require_defer = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = defer;
  function defer(fn) {
    var nextTick =
      typeof setImmediate == "function"
        ? setImmediate
        : typeof process == "object" && typeof process.nextTick == "function"
          ? process.nextTick
          : null;
    if (nextTick) nextTick(fn);
    else setTimeout(fn, 0);
  }
});
export { require_defer };
