/**
 * qrcode/lib/core/bit-matrix.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-spjgqa4y.js:2022-2536 cjs-fingerprint
var Ut = x(function (wl, qt) {
  function de(t) {
    if (!t || t < 1) throw Error("BitMatrix size must be defined and greater than 0");
    ((this.size = t), (this.data = new Uint8Array(t * t)), (this.reservedBit = new Uint8Array(t * t)));
  }
  de.prototype.set = function (t, e, r, n) {
    let i = t * this.size + e;
    if (((this.data[i] = r), n)) this.reservedBit[i] = !0;
  };
  de.prototype.get = function (t, e) {
    return this.data[t * this.size + e];
  };
  de.prototype.xor = function (t, e, r) {
    this.data[t * this.size + e] ^= r;
  };
  de.prototype.isReserved = function (t, e) {
    return this.reservedBit[t * this.size + e];
  };
  qt.exports = de;
});

export { Ut };
