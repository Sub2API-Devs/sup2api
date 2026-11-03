/**
 * node-forge/lib/cipher.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { Tn } from "./forge.js";
import { Zn } from "./util.js";

//@ chunk-fq0cr76a.js:28471-30483 cjs-fingerprint
var $h = x(function (lfe, hT) {
  var us = Tn();
  Zn();
  hT.exports = us.cipher = us.cipher || {};
  us.cipher.algorithms = us.cipher.algorithms || {};
  us.cipher.createCipher = function (e, n) {
    var r = e;
    if (typeof r === "string") {
      if (((r = us.cipher.getAlgorithm(r)), r)) r = r();
    }
    if (!r) throw Error("Unsupported algorithm: " + e);
    return new us.cipher.BlockCipher({ algorithm: r, key: n, decrypt: !1 });
  };
  us.cipher.createDecipher = function (e, n) {
    var r = e;
    if (typeof r === "string") {
      if (((r = us.cipher.getAlgorithm(r)), r)) r = r();
    }
    if (!r) throw Error("Unsupported algorithm: " + e);
    return new us.cipher.BlockCipher({ algorithm: r, key: n, decrypt: !0 });
  };
  us.cipher.registerAlgorithm = function (e, n) {
    ((e = e.toUpperCase()), (us.cipher.algorithms[e] = n));
  };
  us.cipher.getAlgorithm = function (e) {
    if (((e = e.toUpperCase()), e in us.cipher.algorithms)) return us.cipher.algorithms[e];
    return null;
  };
  var Qb = (us.cipher.BlockCipher = function (e) {
    ((this.algorithm = e.algorithm),
      (this.mode = this.algorithm.mode),
      (this.blockSize = this.mode.blockSize),
      (this._finish = !1),
      (this._input = null),
      (this.output = null),
      (this._op = e.decrypt ? this.mode.decrypt : this.mode.encrypt),
      (this._decrypt = e.decrypt),
      this.algorithm.initialize(e));
  });
  Qb.prototype.start = function (e) {
    e = e || {};
    var n = {};
    for (var key in e) n[key] = e[key];
    ((n.decrypt = this._decrypt),
      (this._finish = !1),
      (this._input = us.util.createBuffer()),
      (this.output = e.output || us.util.createBuffer()),
      this.mode.start(n));
  };
  Qb.prototype.update = function (e) {
    if (e) this._input.putBuffer(e);
    while (!this._op.call(this.mode, this._input, this.output, this._finish) && !this._finish);
    this._input.compact();
  };
  Qb.prototype.finish = function (e) {
    if (e && (this.mode.name === "ECB" || this.mode.name === "CBC"))
      ((this.mode.pad = function (r) {
        return e(this.blockSize, r, !1);
      }),
        (this.mode.unpad = function (r) {
          return e(this.blockSize, r, !0);
        }));
    var n = {};
    if (
      ((n.decrypt = this._decrypt),
      (n.overflow = this._input.length() % this.blockSize),
      !this._decrypt && this.mode.pad)
    ) {
      if (!this.mode.pad(this._input, n)) return !1;
    }
    if (((this._finish = !0), this.update(), this._decrypt && this.mode.unpad)) {
      if (!this.mode.unpad(this.output, n)) return !1;
    }
    if (this.mode.afterFinish) {
      if (!this.mode.afterFinish(this.output, n)) return !1;
    }
    return !0;
  };
});

export { $h };
