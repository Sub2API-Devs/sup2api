/**
 * qrcode/lib/core/version-check.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-spjgqa4y.js:7990-8067 cjs-fingerprint
var ze = x(function (Pi) {
  Pi.isValid = function (e) {
    return !isNaN(e) && e >= 1 && e <= 40;
  };
});

export { ze };
