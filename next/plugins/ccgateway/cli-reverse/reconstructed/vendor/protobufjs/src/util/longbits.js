/**
 * protobufjs/src/util/longbits.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-vxhm2nqe.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_minimal } from "./minimal.js";

//@ chunk-vxhm2nqe.js:25873-27725 cjs-fingerprint
var require_longbits = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = LongBits;
  var util = require_minimal();
  function LongBits(lo, hi) {
    this.lo = lo >>> 0;
    this.hi = hi >>> 0;
  }
  var zero = (LongBits.zero = new LongBits(0, 0));
  zero.toNumber = function () {
    return 0;
  };
  zero.zzEncode = zero.zzDecode = function () {
    return this;
  };
  zero.length = function () {
    return 1;
  };
  var zeroHash = (LongBits.zeroHash = "\x00\x00\x00\x00\x00\x00\x00\x00");
  LongBits.fromNumber = function (value) {
    if (value === 0) return zero;
    var sign = value < 0;
    if (sign) value = -value;
    var lo = value >>> 0;
    var hi = ((value - lo) / 4294967296) >>> 0;
    if (sign) {
      hi = ~hi >>> 0;
      lo = ~lo >>> 0;
      if (++lo > 4294967295) {
        lo = 0;
        if (++hi > 4294967295) hi = 0;
      }
    }
    return new LongBits(lo, hi);
  };
  LongBits.from = function (value) {
    if (typeof value === "number") return LongBits.fromNumber(value);
    if (util.isString(value))
      if (util.Long) value = util.Long.fromString(value);
      else return LongBits.fromNumber(parseInt(value, 10));
    return value.low || value.high ? new LongBits(value.low >>> 0, value.high >>> 0) : zero;
  };
  LongBits.prototype.toNumber = function (unsigned) {
    if (!unsigned && this.hi >>> 31) {
      var lo = (~this.lo + 1) >>> 0;
      var hi = ~this.hi >>> 0;
      if (!lo) hi = (hi + 1) >>> 0;
      return -(lo + hi * 4294967296);
    }
    return this.lo + this.hi * 4294967296;
  };
  LongBits.prototype.toLong = function (unsigned) {
    return util.Long
      ? new util.Long(this.lo | 0, this.hi | 0, Boolean(unsigned))
      : {
          low: this.lo | 0,
          high: this.hi | 0,
          unsigned: Boolean(unsigned),
        };
  };
  var charCodeAt = String.prototype.charCodeAt;
  LongBits.fromHash = function (hash) {
    if (hash === zeroHash) return zero;
    return new LongBits(
      (charCodeAt.call(hash, 0) |
        (charCodeAt.call(hash, 1) << 8) |
        (charCodeAt.call(hash, 2) << 16) |
        (charCodeAt.call(hash, 3) << 24)) >>>
        0,
      (charCodeAt.call(hash, 4) |
        (charCodeAt.call(hash, 5) << 8) |
        (charCodeAt.call(hash, 6) << 16) |
        (charCodeAt.call(hash, 7) << 24)) >>>
        0,
    );
  };
  LongBits.prototype.toHash = function () {
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
  LongBits.prototype.zzEncode = function () {
    var mask = this.hi >> 31;
    this.hi = (((this.hi << 1) | (this.lo >>> 31)) ^ mask) >>> 0;
    this.lo = ((this.lo << 1) ^ mask) >>> 0;
    return this;
  };
  LongBits.prototype.zzDecode = function () {
    var mask = -(this.lo & 1);
    this.lo = (((this.lo >>> 1) | (this.hi << 31)) ^ mask) >>> 0;
    this.hi = ((this.hi >>> 1) ^ mask) >>> 0;
    return this;
  };
  LongBits.prototype.length = function () {
    var part0 = this.lo;
    var part1 = ((this.lo >>> 28) | (this.hi << 4)) >>> 0;
    var part2 = this.hi >>> 24;
    return part2 === 0
      ? part1 === 0
        ? part0 < 16384
          ? part0 < 128
            ? 1
            : 2
          : part0 < 2097152
            ? 3
            : 4
        : part1 < 16384
          ? part1 < 128
            ? 5
            : 6
          : part1 < 2097152
            ? 7
            : 8
      : part2 < 128
        ? 9
        : 10;
  };
});
export { require_longbits };
