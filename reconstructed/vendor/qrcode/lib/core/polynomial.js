/**
 * qrcode/lib/core/polynomial.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Wt } from "./galois-field.js";

//@ chunk-spjgqa4y.js:6966-7479 cjs-fingerprint
var Jt = x(function (Li) {
  var K = Wt();
  Li.mul = function (e, r) {
    let uint8Array = new Uint8Array(e.length + r.length - 1);
    for (let i = 0; i < e.length; i++)
      for (let o = 0; o < r.length; o++) uint8Array[i + o] ^= K.mul(e[i], r[o]);
    return uint8Array;
  };
  Li.mod = function (e, r) {
    let uint8Array = new Uint8Array(e);
    while (uint8Array.length - r.length >= 0) {
      let i = uint8Array[0];
      for (let s = 0; s < r.length; s++) uint8Array[s] ^= K.mul(r[s], i);
      let o = 0;
      while (o < uint8Array.length && uint8Array[o] === 0) o++;
      uint8Array = uint8Array.slice(o);
    }
    return uint8Array;
  };
  Li.generateECPolynomial = function (e) {
    let uint8Array = new Uint8Array([1]);
    for (let n = 0; n < e; n++) uint8Array = Li.mul(uint8Array, new Uint8Array([1, K.exp(n)]));
    return uint8Array;
  };
});

export { Jt };
