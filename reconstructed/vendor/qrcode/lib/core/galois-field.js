/**
 * qrcode/lib/core/galois-field.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-spjgqa4y.js:6599-6966 cjs-fingerprint
var require_galois_field = x(function (cjsExports) {
  var EXP_TABLE = new Uint8Array(512);
  var LOG_TABLE = new Uint8Array(256);
  (function () {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      EXP_TABLE[i] = x;
      LOG_TABLE[x] = i;
      x <<= 1;
      if (x & 256) x ^= 285;
    }
    for (let i = 255; i < 512; i++) EXP_TABLE[i] = EXP_TABLE[i - 255];
  })();
  cjsExports.log = function (n) {
    if (n < 1) throw Error("log(" + n + ")");
    return LOG_TABLE[n];
  };
  cjsExports.exp = function (n) {
    return EXP_TABLE[n];
  };
  cjsExports.mul = function (x, y) {
    if (x === 0 || y === 0) return 0;
    return EXP_TABLE[LOG_TABLE[x] + LOG_TABLE[y]];
  };
});
export { require_galois_field };
