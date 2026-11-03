/**
 * protobufjs/src/util/longbits.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-798ashq9.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { QGe } from "./minimal.js";

//@ chunk-798ashq9.js:25873-27725 cjs-fingerprint
var Tr = x(function (vc, Nr) {
  Nr.exports = k;
  var mt = QGe();
  function k(l, u) {
    ((this.lo = l >>> 0), (this.hi = u >>> 0));
  }
  var ct = (k.zero = new k(0, 0));
  ct.toNumber = function () {
    return 0;
  };
  ct.zzEncode = ct.zzDecode = function () {
    return this;
  };
  ct.length = function () {
    return 1;
  };
  var Hi = (k.zeroHash = "\x00\x00\x00\x00\x00\x00\x00\x00");
  k.fromNumber = function (u) {
    if (u === 0) return ct;
    var f = u < 0;
    if (f) u = -u;
    var d = u >>> 0,
      i = ((u - d) / 4294967296) >>> 0;
    if (f) {
      if (((i = ~i >>> 0), (d = ~d >>> 0), ++d > 4294967295)) {
        if (((d = 0), ++i > 4294967295)) i = 0;
      }
    }
    return new k(d, i);
  };
  k.from = function (u) {
    if (typeof u === "number") return k.fromNumber(u);
    if (mt.isString(u))
      if (mt.Long) u = mt.Long.fromString(u);
      else return k.fromNumber(parseInt(u, 10));
    return u.low || u.high ? new k(u.low >>> 0, u.high >>> 0) : ct;
  };
  k.prototype.toNumber = function (u) {
    if (!u && this.hi >>> 31) {
      var f = (~this.lo + 1) >>> 0,
        d = ~this.hi >>> 0;
      if (!f) d = (d + 1) >>> 0;
      return -(f + d * 4294967296);
    }
    return this.lo + this.hi * 4294967296;
  };
  k.prototype.toLong = function (u) {
    return mt.Long
      ? new mt.Long(this.lo | 0, this.hi | 0, Boolean(u))
      : { low: this.lo | 0, high: this.hi | 0, unsigned: Boolean(u) };
  };
  var charCodeAt = String.prototype.charCodeAt;
  k.fromHash = function (u) {
    if (u === Hi) return ct;
    return new k(
      (charCodeAt.call(u, 0) |
        (charCodeAt.call(u, 1) << 8) |
        (charCodeAt.call(u, 2) << 16) |
        (charCodeAt.call(u, 3) << 24)) >>>
        0,
      (charCodeAt.call(u, 4) |
        (charCodeAt.call(u, 5) << 8) |
        (charCodeAt.call(u, 6) << 16) |
        (charCodeAt.call(u, 7) << 24)) >>>
        0,
    );
  };
  k.prototype.toHash = function () {
    return String.fromCharCode(
      this.lo & 255,
      (this.lo >>> 8) & 255,
      (this.lo >>> 16) & 255,
      this.lo >>> 24,
      this.hi & 255,
      (this.hi >>> 8) & 255,
      (this.hi >>> 16) & 255,
      this.hi >>> 24,
    );
  };
  k.prototype.zzEncode = function () {
    var u = this.hi >> 31;
    return (
      (this.hi = (((this.hi << 1) | (this.lo >>> 31)) ^ u) >>> 0),
      (this.lo = ((this.lo << 1) ^ u) >>> 0),
      this
    );
  };
  k.prototype.zzDecode = function () {
    var u = -(this.lo & 1);
    return (
      (this.lo = (((this.lo >>> 1) | (this.hi << 31)) ^ u) >>> 0),
      (this.hi = ((this.hi >>> 1) ^ u) >>> 0),
      this
    );
  };
  k.prototype.length = function () {
    var lo = this.lo,
      f = ((this.lo >>> 28) | (this.hi << 4)) >>> 0,
      d = this.hi >>> 24;
    return d === 0
      ? f === 0
        ? lo < 16384
          ? lo < 128
            ? 1
            : 2
          : lo < 2097152
            ? 3
            : 4
        : f < 16384
          ? f < 128
            ? 5
            : 6
          : f < 2097152
            ? 7
            : 8
      : d < 128
        ? 9
        : 10;
  };
});

export { Tr };
