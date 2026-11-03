/**
 * protobufjs/src/reader.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-798ashq9.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { QGe } from "./util/minimal.js";

//@ chunk-798ashq9.js:34984-39108 cjs-fingerprint
var _Hr = x(function (Sc, Vr) {
  Vr.exports = U;
  var z = QGe(),
    re,
    { LongBits: LongBits, utf8: utf8 } = z;
  function Y(l, u) {
    return RangeError("index out of range: " + l.pos + " + " + (u || 1) + " > " + l.len);
  }
  function U(l) {
    ((this.buf = l), (this.pos = 0), (this.len = l.length));
  }
  var kr =
      typeof Uint8Array < "u"
        ? function (u) {
            if (u instanceof Uint8Array || Array.isArray(u)) return new U(u);
            throw Error("illegal buffer");
          }
        : function (u) {
            if (Array.isArray(u)) return new U(u);
            throw Error("illegal buffer");
          },
    Cr = function () {
      return z.Buffer
        ? function (f) {
            return (U.create = function (i) {
              return z.Buffer.isBuffer(i) ? new re(i) : kr(i);
            })(f);
          }
        : kr;
    };
  U.create = Cr();
  U.prototype._slice = z.Array.prototype.subarray || z.Array.prototype.slice;
  U.prototype.uint32 = (function () {
    var u = 4294967295;
    return function () {
      if (((u = (this.buf[this.pos] & 127) >>> 0), this.buf[this.pos++] < 128)) return u;
      if (((u = (u | ((this.buf[this.pos] & 127) << 7)) >>> 0), this.buf[this.pos++] < 128)) return u;
      if (((u = (u | ((this.buf[this.pos] & 127) << 14)) >>> 0), this.buf[this.pos++] < 128)) return u;
      if (((u = (u | ((this.buf[this.pos] & 127) << 21)) >>> 0), this.buf[this.pos++] < 128)) return u;
      if (((u = (u | ((this.buf[this.pos] & 15) << 28)) >>> 0), this.buf[this.pos++] < 128)) return u;
      if ((this.pos += 5) > this.len) throw ((this.pos = this.len), Y(this, 10));
      return u;
    };
  })();
  U.prototype.int32 = function () {
    return this.uint32() | 0;
  };
  U.prototype.sint32 = function () {
    var uint32 = this.uint32();
    return ((uint32 >>> 1) ^ -(uint32 & 1)) | 0;
  };
  function ee() {
    var l = new LongBits(0, 0),
      u = 0;
    if (this.len - this.pos > 4) {
      for (; u < 4; ++u)
        if (((l.lo = (l.lo | ((this.buf[this.pos] & 127) << (u * 7))) >>> 0), this.buf[this.pos++] < 128))
          return l;
      if (
        ((l.lo = (l.lo | ((this.buf[this.pos] & 127) << 28)) >>> 0),
        (l.hi = (l.hi | ((this.buf[this.pos] & 127) >> 4)) >>> 0),
        this.buf[this.pos++] < 128)
      )
        return l;
      u = 0;
    } else {
      for (; u < 3; ++u) {
        if (this.pos >= this.len) throw Y(this);
        if (((l.lo = (l.lo | ((this.buf[this.pos] & 127) << (u * 7))) >>> 0), this.buf[this.pos++] < 128))
          return l;
      }
      return ((l.lo = (l.lo | ((this.buf[this.pos++] & 127) << (u * 7))) >>> 0), l);
    }
    if (this.len - this.pos > 4) {
      for (; u < 5; ++u)
        if (((l.hi = (l.hi | ((this.buf[this.pos] & 127) << (u * 7 + 3))) >>> 0), this.buf[this.pos++] < 128))
          return l;
    } else
      for (; u < 5; ++u) {
        if (this.pos >= this.len) throw Y(this);
        if (((l.hi = (l.hi | ((this.buf[this.pos] & 127) << (u * 7 + 3))) >>> 0), this.buf[this.pos++] < 128))
          return l;
      }
    throw Error("invalid varint encoding");
  }
  U.prototype.bool = function () {
    return this.uint32() !== 0;
  };
  function wt(l, u) {
    return (l[u - 4] | (l[u - 3] << 8) | (l[u - 2] << 16) | (l[u - 1] << 24)) >>> 0;
  }
  U.prototype.fixed32 = function () {
    if (this.pos + 4 > this.len) throw Y(this, 4);
    return wt(this.buf, (this.pos += 4));
  };
  U.prototype.sfixed32 = function () {
    if (this.pos + 4 > this.len) throw Y(this, 4);
    return wt(this.buf, (this.pos += 4)) | 0;
  };
  function Dr() {
    if (this.pos + 8 > this.len) throw Y(this, 8);
    return new LongBits(wt(this.buf, (this.pos += 4)), wt(this.buf, (this.pos += 4)));
  }
  U.prototype.float = function () {
    if (this.pos + 4 > this.len) throw Y(this, 4);
    var floatLE = z.float.readFloatLE(this.buf, this.pos);
    return ((this.pos += 4), floatLE);
  };
  U.prototype.double = function () {
    if (this.pos + 8 > this.len) throw Y(this, 4);
    var doubleLE = z.float.readDoubleLE(this.buf, this.pos);
    return ((this.pos += 8), doubleLE);
  };
  U.prototype.bytes = function () {
    var uint32 = this.uint32(),
      pos = this.pos,
      d = this.pos + uint32;
    if (d > this.len) throw Y(this, uint32);
    if (((this.pos += uint32), Array.isArray(this.buf))) return this.buf.slice(pos, d);
    if (pos === d) {
      var i = z.Buffer;
      return i ? i.alloc(0) : new this.buf.constructor(0);
    }
    return this._slice.call(this.buf, pos, d);
  };
  U.prototype.string = function () {
    var bytes = this.bytes();
    return utf8.read(bytes, 0, bytes.length);
  };
  U.prototype.skip = function (u) {
    if (typeof u === "number") {
      if (this.pos + u > this.len) throw Y(this, u);
      this.pos += u;
    } else
      do if (this.pos >= this.len) throw Y(this);
      while (this.buf[this.pos++] & 128);
    return this;
  };
  U.recursionLimit = z.recursionLimit;
  U.prototype.skipType = function (l, u) {
    if (u === void 0) u = 0;
    if (u > U.recursionLimit) throw Error("maximum nesting depth exceeded");
    switch (l) {
      case 0:
        this.skip();
        break;
      case 1:
        this.skip(8);
        break;
      case 2:
        this.skip(this.uint32());
        break;
      case 3:
        while ((l = this.uint32() & 7) !== 4) this.skipType(l, u + 1);
        break;
      case 5:
        this.skip(4);
        break;
      default:
        throw Error("invalid wire type " + l + " at offset " + this.pos);
    }
    return this;
  };
  U._configure = function (l) {
    ((re = l), (U.create = Cr()), re._configure());
    var u = z.Long ? "toLong" : "toNumber";
    z.merge(U.prototype, {
      int64: function () {
        return ee.call(this)[u](!1);
      },
      uint64: function () {
        return ee.call(this)[u](!0);
      },
      sint64: function () {
        return ee.call(this).zzDecode()[u](!1);
      },
      fixed64: function () {
        return Dr.call(this)[u](!0);
      },
      sfixed64: function () {
        return Dr.call(this)[u](!1);
      },
    });
  };
});

export { _Hr };
