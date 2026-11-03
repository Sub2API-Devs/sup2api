/**
 * qrcode/lib/core/byte-data.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { q } from "./mode.js";

//@ chunk-spjgqa4y.js:12654-13100 cjs-fingerprint
var gr = x(function (Ol, pr) {
  var dr = q();
  function X(t) {
    if (((this.mode = dr.BYTE), typeof t === "string")) this.data = new TextEncoder().encode(t);
    else this.data = new Uint8Array(t);
  }
  X.getBitsLength = function (e) {
    return e * 8;
  };
  X.prototype.getLength = function () {
    return this.data.length;
  };
  X.prototype.getBitsLength = function () {
    return X.getBitsLength(this.data.length);
  };
  X.prototype.write = function (t) {
    for (let e = 0, r = this.data.length; e < r; e++) t.put(this.data[e], 8);
  };
  pr.exports = X;
});

export { gr };
