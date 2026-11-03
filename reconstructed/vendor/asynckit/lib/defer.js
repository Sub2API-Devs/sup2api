/**
 * asynckit/lib/defer.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: asynckit@0.4.0..0.5.0
 * pieces: chunk-h6b7mazd.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";

//@ chunk-h6b7mazd.js:5269-5492 cjs-fingerprint
var On = x(function (Tl, An) {
  An.exports = va;
  function va(e) {
    var t =
      typeof setImmediate == "function"
        ? setImmediate
        : typeof process == "object" && typeof process.nextTick == "function"
          ? process.nextTick
          : null;
    if (t) t(e);
    else setTimeout(e, 0);
  }
});

export { On };
