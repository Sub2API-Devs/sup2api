/**
 * pngjs/lib/paeth-predictor.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: pngjs@5.0.0
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../runtime/bun-runtime.js";

//@ chunk-spjgqa4y.js:23814-23978 cjs-require-graph
var ut = x(function (Hl, kr) {
  kr.exports = function (e, r, n) {
    let i = e + r - n,
      abs = Math.abs(i - e),
      abs_2 = Math.abs(i - r),
      abs_3 = Math.abs(i - n);
    if (abs <= abs_2 && abs <= abs_3) return e;
    if (abs_2 <= abs_3) return r;
    return n;
  };
});

export { ut };
