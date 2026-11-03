/**
 * qrcode/lib/core/format-info.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { N } from "./utils.js";

//@ chunk-spjgqa4y.js:11234-11429 cjs-fingerprint
var sr = x(function (oo) {
  var J = N(),
    bCHDigit = J.getBCHDigit(1335);
  oo.getEncodedBits = function (e, r) {
    let n = (e.bit << 3) | r,
      i = n << 10;
    while (J.getBCHDigit(i) - bCHDigit >= 0) i ^= 1335 << (J.getBCHDigit(i) - bCHDigit);
    return ((n << 10) | i) ^ 21522;
  };
});

export { sr };
