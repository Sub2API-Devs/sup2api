/**
 * protobufjs/src/reader.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-vxhm2nqe.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_minimal } from "./util/minimal.js";

//@ chunk-vxhm2nqe.js:34984-39108 cjs-fingerprint
var require_reader = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = Reader;
  var util = require_minimal();
  var BufferReader;
  var { LongBits, utf8 } = util;
  function indexOutOfRange(reader, writeLength) {
    return RangeError("index out of range: " + reader.pos + " + " + (writeLength || 1) + " > " + reader.len);
  }
  function Reader(buffer) {
    this.buf = buffer;
    this.pos = 0;
    this.len = buffer.length;
  }
  var create_array =
    typeof Uint8Array !== "undefined"
      ? function (buffer) {
          if (buffer instanceof Uint8Array || Array.isArray(buffer)) return new Reader(buffer);
          throw Error("illegal buffer");
        }
      : function (buffer) {
          if (Array.isArray(buffer)) return new Reader(buffer);
          throw Error("illegal buffer");
        };
  var create = function () {
    return util.Buffer
      ? function (buffer) {
          return (Reader.create = function (buffer) {
            return util.Buffer.isBuffer(buffer) ? new BufferReader(buffer) : create_array(buffer);
          })(buffer);
        }
      : create_array;
  };
  Reader.create = create();
  Reader.prototype._slice = util.Array.prototype.subarray || util.Array.prototype.slice;
  Reader.prototype.uint32 = (function () {
    var value = 4294967295;
    return function () {
      value = (this.buf[this.pos] & 127) >>> 0;
      if (this.buf[this.pos++] < 128) return value;
      value = (value | ((this.buf[this.pos] & 127) << 7)) >>> 0;
      if (this.buf[this.pos++] < 128) return value;
      value = (value | ((this.buf[this.pos] & 127) << 14)) >>> 0;
      if (this.buf[this.pos++] < 128) return value;
      value = (value | ((this.buf[this.pos] & 127) << 21)) >>> 0;
      if (this.buf[this.pos++] < 128) return value;
      value = (value | ((this.buf[this.pos] & 15) << 28)) >>> 0;
      if (this.buf[this.pos++] < 128) return value;
      if ((this.pos += 5) > this.len) {
        this.pos = this.len;
        throw indexOutOfRange(this, 10);
      }
      return value;
    };
  })();
  Reader.prototype.int32 = function () {
    return this.uint32() | 0;
  };
  Reader.prototype.sint32 = function () {
    var value = this.uint32();
    return ((value >>> 1) ^ -(value & 1)) | 0;
  };
  function readLongVarint() {
    var bits = new LongBits(0, 0);
    var i = 0;
    if (this.len - this.pos > 4) {
      for (; i < 4; ++i) {
        bits.lo = (bits.lo | ((this.buf[this.pos] & 127) << (i * 7))) >>> 0;
        if (this.buf[this.pos++] < 128) return bits;
      }
      bits.lo = (bits.lo | ((this.buf[this.pos] & 127) << 28)) >>> 0;
      bits.hi = (bits.hi | ((this.buf[this.pos] & 127) >> 4)) >>> 0;
      if (this.buf[this.pos++] < 128) return bits;
      i = 0;
    } else {
      for (; i < 3; ++i) {
        if (this.pos >= this.len) throw indexOutOfRange(this);
        bits.lo = (bits.lo | ((this.buf[this.pos] & 127) << (i * 7))) >>> 0;
        if (this.buf[this.pos++] < 128) return bits;
      }
      bits.lo = (bits.lo | ((this.buf[this.pos++] & 127) << (i * 7))) >>> 0;
      return bits;
    }
    if (this.len - this.pos > 4) {
      for (; i < 5; ++i) {
        bits.hi = (bits.hi | ((this.buf[this.pos] & 127) << (i * 7 + 3))) >>> 0;
        if (this.buf[this.pos++] < 128) return bits;
      }
    } else
      for (; i < 5; ++i) {
        if (this.pos >= this.len) throw indexOutOfRange(this);
        bits.hi = (bits.hi | ((this.buf[this.pos] & 127) << (i * 7 + 3))) >>> 0;
        if (this.buf[this.pos++] < 128) return bits;
      }
    throw Error("invalid varint encoding");
  }
  Reader.prototype.bool = function () {
    return this.uint32() !== 0;
  };
  function readFixed32_end(buf, end) {
    return (buf[end - 4] | (buf[end - 3] << 8) | (buf[end - 2] << 16) | (buf[end - 1] << 24)) >>> 0;
  }
  Reader.prototype.fixed32 = function () {
    if (this.pos + 4 > this.len) throw indexOutOfRange(this, 4);
    return readFixed32_end(this.buf, (this.pos += 4));
  };
  Reader.prototype.sfixed32 = function () {
    if (this.pos + 4 > this.len) throw indexOutOfRange(this, 4);
    return readFixed32_end(this.buf, (this.pos += 4)) | 0;
  };
  function readFixed64() {
    if (this.pos + 8 > this.len) throw indexOutOfRange(this, 8);
    return new LongBits(
      readFixed32_end(this.buf, (this.pos += 4)),
      readFixed32_end(this.buf, (this.pos += 4)),
    );
  }
  Reader.prototype.float = function () {
    if (this.pos + 4 > this.len) throw indexOutOfRange(this, 4);
    var value = util.float.readFloatLE(this.buf, this.pos);
    this.pos += 4;
    return value;
  };
  Reader.prototype.double = function () {
    if (this.pos + 8 > this.len) throw indexOutOfRange(this, 4);
    var value = util.float.readDoubleLE(this.buf, this.pos);
    this.pos += 8;
    return value;
  };
  Reader.prototype.bytes = function () {
    var length = this.uint32();
    var start = this.pos;
    var end = this.pos + length;
    if (end > this.len) throw indexOutOfRange(this, length);
    this.pos += length;
    if (Array.isArray(this.buf)) return this.buf.slice(start, end);
    if (start === end) {
      var nativeBuffer = util.Buffer;
      return nativeBuffer ? nativeBuffer.alloc(0) : new this.buf.constructor(0);
    }
    return this._slice.call(this.buf, start, end);
  };
  Reader.prototype.string = function () {
    var bytes = this.bytes();
    return utf8.read(bytes, 0, bytes.length);
  };
  Reader.prototype.skip = function (length) {
    if (typeof length === "number") {
      if (this.pos + length > this.len) throw indexOutOfRange(this, length);
      this.pos += length;
    } else
      do if (this.pos >= this.len) throw indexOutOfRange(this);
      while (this.buf[this.pos++] & 128);
    return this;
  };
  Reader.recursionLimit = util.recursionLimit;
  Reader.prototype.skipType = function (wireType, depth) {
    if (depth === undefined) depth = 0;
    if (depth > Reader.recursionLimit) throw Error("maximum nesting depth exceeded");
    switch (wireType) {
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
        while ((wireType = this.uint32() & 7) !== 4) this.skipType(wireType, depth + 1);
        break;
      case 5:
        this.skip(4);
        break;
      default:
        throw Error("invalid wire type " + wireType + " at offset " + this.pos);
    }
    return this;
  };
  Reader._configure = function (BufferReader_) {
    BufferReader = BufferReader_;
    Reader.create = create();
    BufferReader._configure();
    var fn = util.Long ? "toLong" : "toNumber";
    util.merge(Reader.prototype, {
      int64: function () {
        return readLongVarint.call(this)[fn](false);
      },
      uint64: function () {
        return readLongVarint.call(this)[fn](true);
      },
      sint64: function () {
        return readLongVarint.call(this).zzDecode()[fn](false);
      },
      fixed64: function () {
        return readFixed64.call(this)[fn](true);
      },
      sfixed64: function () {
        return readFixed64.call(this)[fn](false);
      },
    });
  };
});
export { require_reader };
