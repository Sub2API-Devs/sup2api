/**
 * qrcode/lib/core/bit-buffer.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-spjgqa4y.js:1578-2022 cjs-fingerprint
var Nt = x(function (yl, Ot) {
  function Mt() {
    ((this.buffer = []), (this.length = 0));
  }
  Mt.prototype = {
    get: function (t) {
      let floored = Math.floor(t / 8);
      return ((this.buffer[floored] >>> (7 - (t % 8))) & 1) === 1;
    },
    put: function (t, e) {
      for (let r = 0; r < e; r++) this.putBit(((t >>> (e - r - 1)) & 1) === 1);
    },
    getLengthInBits: function () {
      return this.length;
    },
    putBit: function (t) {
      let floored = Math.floor(this.length / 8);
      if (this.buffer.length <= floored) this.buffer.push(0);
      if (t) this.buffer[floored] |= 128 >>> (this.length % 8);
      this.length++;
    },
  };
  Ot.exports = Mt;
});

export { Nt };
