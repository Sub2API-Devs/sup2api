/**
 * pngjs/lib/paeth-predictor.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: pngjs@5.0.0
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-require-graph 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";

//@ chunk-spjgqa4y.js:23814-23978 cjs-require-graph
var require_paeth_predictor = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = function (left, above, upLeft) {
    let paeth = left + above - upLeft;
    let pLeft = Math.abs(paeth - left);
    let pAbove = Math.abs(paeth - above);
    let pUpLeft = Math.abs(paeth - upLeft);
    if (pLeft <= pAbove && pLeft <= pUpLeft) return left;
    if (pAbove <= pUpLeft) return above;
    return upLeft;
  };
});
export { require_paeth_predictor };
