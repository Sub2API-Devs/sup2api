/**
 * @bufbuild/protobuf/dist/commonjs/wire/binary-encoding.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-require-graph 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_varint } from "../../cjs/wire/varint.js";
import { require_proto_int64 } from "../proto-int64.js";
import { require_text_encoding } from "../../cjs/wire/text-encoding.js";

//@ chunk-qg41pqt6.js:333340-338777 cjs-require-graph
var require_binary_encoding = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.BinaryReader =
    cjsExports.BinaryWriter =
    cjsExports.INT32_MIN =
    cjsExports.INT32_MAX =
    cjsExports.UINT32_MAX =
    cjsExports.FLOAT32_MIN =
    cjsExports.FLOAT32_MAX =
    cjsExports.WireType =
      undefined;
  var varint_js_1 = require_varint();
  var proto_int64_js_1 = require_proto_int64();
  var text_encoding_js_1 = require_text_encoding();
  var WireType;
  (function (WireType) {
    WireType[(WireType.Varint = 0)] = "Varint";
    WireType[(WireType.Bit64 = 1)] = "Bit64";
    WireType[(WireType.LengthDelimited = 2)] = "LengthDelimited";
    WireType[(WireType.StartGroup = 3)] = "StartGroup";
    WireType[(WireType.EndGroup = 4)] = "EndGroup";
    WireType[(WireType.Bit32 = 5)] = "Bit32";
  })(WireType || (cjsExports.WireType = WireType = {}));
  cjsExports.FLOAT32_MAX = 340282346638528860000000000000000000000;
  cjsExports.FLOAT32_MIN = -340282346638528860000000000000000000000;
  cjsExports.UINT32_MAX = 4294967295;
  cjsExports.INT32_MAX = 2147483647;
  cjsExports.INT32_MIN = -2147483648;
  class BinaryWriter {
    constructor(encodeUtf8 = text_encoding_js_1.getTextEncoding().encodeUtf8) {
      this.encodeUtf8 = encodeUtf8;
      this.stack = [];
      this.chunks = [];
      this.buf = [];
    }
    finish() {
      if (this.buf.length) {
        this.chunks.push(new Uint8Array(this.buf));
        this.buf = [];
      }
      let len = 0;
      for (let i = 0; i < this.chunks.length; i++) len += this.chunks[i].length;
      let bytes = new Uint8Array(len);
      let offset = 0;
      for (let i = 0; i < this.chunks.length; i++) {
        bytes.set(this.chunks[i], offset);
        offset += this.chunks[i].length;
      }
      this.chunks = [];
      return bytes;
    }
    fork() {
      this.stack.push({
        chunks: this.chunks,
        buf: this.buf,
      });
      this.chunks = [];
      this.buf = [];
      return this;
    }
    join() {
      let chunk = this.finish();
      let prev = this.stack.pop();
      if (!prev) throw Error("invalid state, fork stack empty");
      this.chunks = prev.chunks;
      this.buf = prev.buf;
      this.uint32(chunk.byteLength);
      return this.raw(chunk);
    }
    tag(fieldNo, type) {
      return this.uint32(((fieldNo << 3) | type) >>> 0);
    }
    raw(chunk) {
      if (this.buf.length) {
        this.chunks.push(new Uint8Array(this.buf));
        this.buf = [];
      }
      this.chunks.push(chunk);
      return this;
    }
    uint32(value) {
      assertUInt32(value);
      while (value > 127) {
        this.buf.push((value & 127) | 128);
        value = value >>> 7;
      }
      this.buf.push(value);
      return this;
    }
    int32(value) {
      assertInt32(value);
      varint_js_1.varint32write(value, this.buf);
      return this;
    }
    bool(value) {
      this.buf.push(value ? 1 : 0);
      return this;
    }
    bytes(value) {
      this.uint32(value.byteLength);
      return this.raw(value);
    }
    string(value) {
      let chunk = this.encodeUtf8(value);
      this.uint32(chunk.byteLength);
      return this.raw(chunk);
    }
    float(value) {
      assertFloat32(value);
      let chunk = new Uint8Array(4);
      new DataView(chunk.buffer).setFloat32(0, value, true);
      return this.raw(chunk);
    }
    double(value) {
      let chunk = new Uint8Array(8);
      new DataView(chunk.buffer).setFloat64(0, value, true);
      return this.raw(chunk);
    }
    fixed32(value) {
      assertUInt32(value);
      let chunk = new Uint8Array(4);
      new DataView(chunk.buffer).setUint32(0, value, true);
      return this.raw(chunk);
    }
    sfixed32(value) {
      assertInt32(value);
      let chunk = new Uint8Array(4);
      new DataView(chunk.buffer).setInt32(0, value, true);
      return this.raw(chunk);
    }
    sint32(value) {
      assertInt32(value);
      value = ((value << 1) ^ (value >> 31)) >>> 0;
      varint_js_1.varint32write(value, this.buf);
      return this;
    }
    sfixed64(value) {
      let chunk = new Uint8Array(8);
      let view = new DataView(chunk.buffer);
      let tc = proto_int64_js_1.protoInt64.enc(value);
      view.setInt32(0, tc.lo, true);
      view.setInt32(4, tc.hi, true);
      return this.raw(chunk);
    }
    fixed64(value) {
      let chunk = new Uint8Array(8);
      let view = new DataView(chunk.buffer);
      let tc = proto_int64_js_1.protoInt64.uEnc(value);
      view.setInt32(0, tc.lo, true);
      view.setInt32(4, tc.hi, true);
      return this.raw(chunk);
    }
    int64(value) {
      let tc = proto_int64_js_1.protoInt64.enc(value);
      varint_js_1.varint64write(tc.lo, tc.hi, this.buf);
      return this;
    }
    sint64(value) {
      let tc = proto_int64_js_1.protoInt64.enc(value);
      let sign = tc.hi >> 31;
      let lo = (tc.lo << 1) ^ sign;
      let hi = ((tc.hi << 1) | (tc.lo >>> 31)) ^ sign;
      varint_js_1.varint64write(lo, hi, this.buf);
      return this;
    }
    uint64(value) {
      let tc = proto_int64_js_1.protoInt64.uEnc(value);
      varint_js_1.varint64write(tc.lo, tc.hi, this.buf);
      return this;
    }
  }
  cjsExports.BinaryWriter = BinaryWriter;
  class BinaryReader {
    constructor(buf, decodeUtf8 = text_encoding_js_1.getTextEncoding().decodeUtf8) {
      this.decodeUtf8 = decodeUtf8;
      this.varint64 = varint_js_1.varint64read;
      this.uint32 = varint_js_1.varint32read;
      this.buf = buf;
      this.len = buf.length;
      this.pos = 0;
      this.view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    }
    tag() {
      let start = this.pos;
      let tag = this.uint32();
      let bytesRead = this.pos - start;
      if (bytesRead > 5 || (bytesRead == 5 && this.buf[this.pos - 1] > 15))
        throw Error("illegal tag: varint overflows uint32");
      let fieldNo = tag >>> 3;
      let wireType = tag & 7;
      if (fieldNo <= 0 || wireType > 5)
        throw Error("illegal tag: field no " + fieldNo + " wire type " + wireType);
      return [fieldNo, wireType];
    }
    skip(wireType, fieldNo) {
      let start = this.pos;
      switch (wireType) {
        case WireType.Varint:
          while (this.buf[this.pos++] & 128);
          break;
        case WireType.Bit64:
          this.pos += 4;
        case WireType.Bit32:
          this.pos += 4;
          break;
        case WireType.LengthDelimited:
          let len = this.uint32();
          this.pos += len;
          break;
        case WireType.StartGroup:
          for (;;) {
            let [fn, wt] = this.tag();
            if (wt === WireType.EndGroup) {
              if (fieldNo !== undefined && fn !== fieldNo) throw Error("invalid end group tag");
              break;
            }
            this.skip(wt, fn);
          }
          break;
        default:
          throw Error("cant skip wire type " + wireType);
      }
      this.assertBounds();
      return this.buf.subarray(start, this.pos);
    }
    assertBounds() {
      if (this.pos > this.len) throw RangeError("premature EOF");
    }
    int32() {
      return this.uint32() | 0;
    }
    sint32() {
      let zze = this.uint32();
      return (zze >>> 1) ^ -(zze & 1);
    }
    int64() {
      return proto_int64_js_1.protoInt64.dec(...this.varint64());
    }
    uint64() {
      return proto_int64_js_1.protoInt64.uDec(...this.varint64());
    }
    sint64() {
      let [lo, hi] = this.varint64();
      let s = -(lo & 1);
      lo = ((lo >>> 1) | ((hi & 1) << 31)) ^ s;
      hi = (hi >>> 1) ^ s;
      return proto_int64_js_1.protoInt64.dec(lo, hi);
    }
    bool() {
      let [lo, hi] = this.varint64();
      return lo !== 0 || hi !== 0;
    }
    fixed32() {
      return this.view.getUint32((this.pos += 4) - 4, true);
    }
    sfixed32() {
      return this.view.getInt32((this.pos += 4) - 4, true);
    }
    fixed64() {
      return proto_int64_js_1.protoInt64.uDec(this.sfixed32(), this.sfixed32());
    }
    sfixed64() {
      return proto_int64_js_1.protoInt64.dec(this.sfixed32(), this.sfixed32());
    }
    float() {
      return this.view.getFloat32((this.pos += 4) - 4, true);
    }
    double() {
      return this.view.getFloat64((this.pos += 8) - 8, true);
    }
    bytes() {
      let len = this.uint32();
      let start = this.pos;
      this.pos += len;
      this.assertBounds();
      return this.buf.subarray(start, start + len);
    }
    string(strict) {
      return this.decodeUtf8(this.bytes(), strict);
    }
  }
  cjsExports.BinaryReader = BinaryReader;
  function assertInt32(arg) {
    if (typeof arg == "string") arg = Number(arg);
    else if (typeof arg != "number") throw Error("invalid int32: " + typeof arg);
    if (!Number.isInteger(arg) || arg > cjsExports.INT32_MAX || arg < cjsExports.INT32_MIN)
      throw Error("invalid int32: " + arg);
  }
  function assertUInt32(arg) {
    if (typeof arg == "string") arg = Number(arg);
    else if (typeof arg != "number") throw Error("invalid uint32: " + typeof arg);
    if (!Number.isInteger(arg) || arg > cjsExports.UINT32_MAX || arg < 0)
      throw Error("invalid uint32: " + arg);
  }
  function assertFloat32(arg) {
    if (typeof arg == "string") {
      let o = arg;
      arg = Number(arg);
      if (Number.isNaN(arg) && o !== "NaN") throw Error("invalid float32: " + o);
    } else if (typeof arg != "number") throw Error("invalid float32: " + typeof arg);
    if (Number.isFinite(arg) && (arg > cjsExports.FLOAT32_MAX || arg < cjsExports.FLOAT32_MIN))
      throw Error("invalid float32: " + arg);
  }
});
export { require_binary_encoding };
