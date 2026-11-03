/**
 * qrcode/lib/core/galois-field.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-spjgqa4y.js:6599-6966 cjs-fingerprint
var Wt = x(function (xi) {
  var uint8Array = new Uint8Array(512),
    uint8Array_2 = new Uint8Array(256);
  (function () {
    let e = 1;
    for (let r = 0; r < 255; r++)
      if (((uint8Array[r] = e), (uint8Array_2[e] = r), (e <<= 1), e & 256)) e ^= 285;
    for (let r = 255; r < 512; r++) uint8Array[r] = uint8Array[r - 255];
  })();
  xi.log = function (e) {
    if (e < 1) throw Error("log(" + e + ")");
    return uint8Array_2[e];
  };
  xi.exp = function (e) {
    return uint8Array[e];
  };
  xi.mul = function (e, r) {
    if (e === 0 || r === 0) return 0;
    return uint8Array[uint8Array_2[e] + uint8Array_2[r]];
  };
});

export { Wt };
