/**
 * pngjs/lib/crc.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: pngjs@5.0.0
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";

//@ chunk-spjgqa4y.js:26646-27104 cjs-fingerprint
var dt = x(function (Vl, Yr) {
  var ht = [];
  (function () {
    for (let t = 0; t < 256; t++) {
      let e = t;
      for (let r = 0; r < 8; r++)
        if (e & 1) e = 3988292384 ^ (e >>> 1);
        else e = e >>> 1;
      ht[t] = e;
    }
  })();
  var ct = (Yr.exports = function () {
    this._crc = -1;
  });
  ct.prototype.write = function (t) {
    for (let e = 0; e < t.length; e++) this._crc = ht[(this._crc ^ t[e]) & 255] ^ (this._crc >>> 8);
    return !0;
  };
  ct.prototype.crc32 = function () {
    return this._crc ^ -1;
  };
  ct.crc32 = function (t) {
    let e = -1;
    for (let r = 0; r < t.length; r++) e = ht[(e ^ t[r]) & 255] ^ (e >>> 8);
    return e ^ -1;
  };
});

export { dt };
