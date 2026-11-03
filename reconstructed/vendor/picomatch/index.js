/**
 * picomatch/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: picomatch@4.0.4..4.0.7
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";
import { uN } from "./lib/picomatch.js";
import { np } from "./lib/utils.js";

//@ chunk-fq0cr76a.js:320219-320419 cjs-fingerprint
var hqt = x(function (qge, hN) {
  var dN = uN(),
    fN = np();
  function pN(e, n, r = !1) {
    if (n && (n.windows === null || n.windows === void 0)) n = { ...n, windows: fN.isWindows() };
    return dN(e, n, r);
  }
  Object.assign(pN, dN);
  hN.exports = pN;
});

export { hqt };
