/**
 * @bufbuild/protobuf/dist/commonjs/wire/binary-encoding.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";
import { Tg } from "../../cjs/wire/varint.js";
import { ko } from "../proto-int64.js";
import { Rg } from "../../cjs/wire/text-encoding.js";

//@ chunk-fq0cr76a.js:332773-338210 cjs-require-graph
var xc = x(function (YN) {
  Object.defineProperty(YN, "__esModule", { value: !0 });
  YN.BinaryReader =
    YN.BinaryWriter =
    YN.INT32_MIN =
    YN.INT32_MAX =
    YN.UINT32_MAX =
    YN.FLOAT32_MIN =
    YN.FLOAT32_MAX =
    YN.WireType =
      void 0;
  var ii = Tg(),
    rs = ko(),
    Ig = Rg(),
    _l;
  (function (e) {
    ((e[(e.Varint = 0)] = "Varint"),
      (e[(e.Bit64 = 1)] = "Bit64"),
      (e[(e.LengthDelimited = 2)] = "LengthDelimited"),
      (e[(e.StartGroup = 3)] = "StartGroup"),
      (e[(e.EndGroup = 4)] = "EndGroup"),
      (e[(e.Bit32 = 5)] = "Bit32"));
  })(_l || (YN.WireType = _l = {}));
  YN.FLOAT32_MAX = 340282346638528860000000000000000000000;
  YN.FLOAT32_MIN = -340282346638528860000000000000000000000;
  YN.UINT32_MAX = 4294967295;
  YN.INT32_MAX = 2147483647;
  YN.INT32_MIN = -2147483648;
  class qN {
    constructor(e = Ig.getTextEncoding().encodeUtf8) {
      ((this.encodeUtf8 = e), (this.stack = []), (this.chunks = []), (this.buf = []));
    }
    finish() {
      if (this.buf.length) (this.chunks.push(new Uint8Array(this.buf)), (this.buf = []));
      let e = 0;
      for (let s = 0; s < this.chunks.length; s++) e += this.chunks[s].length;
      let uint8Array = new Uint8Array(e),
        r = 0;
      for (let s = 0; s < this.chunks.length; s++)
        (uint8Array.set(this.chunks[s], r), (r += this.chunks[s].length));
      return ((this.chunks = []), uint8Array);
    }
    fork() {
      return (
        this.stack.push({ chunks: this.chunks, buf: this.buf }),
        (this.chunks = []),
        (this.buf = []),
        this
      );
    }
    join() {
      let finish = this.finish(),
        n = this.stack.pop();
      if (!n) throw Error("invalid state, fork stack empty");
      return ((this.chunks = n.chunks), (this.buf = n.buf), this.uint32(finish.byteLength), this.raw(finish));
    }
    tag(e, n) {
      return this.uint32(((e << 3) | n) >>> 0);
    }
    raw(e) {
      if (this.buf.length) (this.chunks.push(new Uint8Array(this.buf)), (this.buf = []));
      return (this.chunks.push(e), this);
    }
    uint32(e) {
      KN(e);
      while (e > 127) (this.buf.push((e & 127) | 128), (e = e >>> 7));
      return (this.buf.push(e), this);
    }
    int32(e) {
      return (Mx(e), ii.varint32write(e, this.buf), this);
    }
    bool(e) {
      return (this.buf.push(e ? 1 : 0), this);
    }
    bytes(e) {
      return (this.uint32(e.byteLength), this.raw(e));
    }
    string(e) {
      let encodeUtf8 = this.encodeUtf8(e);
      return (this.uint32(encodeUtf8.byteLength), this.raw(encodeUtf8));
    }
    float(e) {
      eY(e);
      let uint8Array = new Uint8Array(4);
      return (new DataView(uint8Array.buffer).setFloat32(0, e, !0), this.raw(uint8Array));
    }
    double(e) {
      let uint8Array = new Uint8Array(8);
      return (new DataView(uint8Array.buffer).setFloat64(0, e, !0), this.raw(uint8Array));
    }
    fixed32(e) {
      KN(e);
      let uint8Array = new Uint8Array(4);
      return (new DataView(uint8Array.buffer).setUint32(0, e, !0), this.raw(uint8Array));
    }
    sfixed32(e) {
      Mx(e);
      let uint8Array = new Uint8Array(4);
      return (new DataView(uint8Array.buffer).setInt32(0, e, !0), this.raw(uint8Array));
    }
    sint32(e) {
      return (Mx(e), (e = ((e << 1) ^ (e >> 31)) >>> 0), ii.varint32write(e, this.buf), this);
    }
    sfixed64(e) {
      let uint8Array = new Uint8Array(8),
        dataView = new DataView(uint8Array.buffer),
        enc = rs.protoInt64.enc(e);
      return (dataView.setInt32(0, enc.lo, !0), dataView.setInt32(4, enc.hi, !0), this.raw(uint8Array));
    }
    fixed64(e) {
      let uint8Array = new Uint8Array(8),
        dataView = new DataView(uint8Array.buffer),
        uEnc = rs.protoInt64.uEnc(e);
      return (dataView.setInt32(0, uEnc.lo, !0), dataView.setInt32(4, uEnc.hi, !0), this.raw(uint8Array));
    }
    int64(e) {
      let enc = rs.protoInt64.enc(e);
      return (ii.varint64write(enc.lo, enc.hi, this.buf), this);
    }
    sint64(e) {
      let enc = rs.protoInt64.enc(e),
        r = enc.hi >> 31,
        s = (enc.lo << 1) ^ r,
        h = ((enc.hi << 1) | (enc.lo >>> 31)) ^ r;
      return (ii.varint64write(s, h, this.buf), this);
    }
    uint64(e) {
      let uEnc = rs.protoInt64.uEnc(e);
      return (ii.varint64write(uEnc.lo, uEnc.hi, this.buf), this);
    }
  }
  YN.BinaryWriter = qN;
  class jN {
    constructor(e, n = Ig.getTextEncoding().decodeUtf8) {
      ((this.decodeUtf8 = n),
        (this.varint64 = ii.varint64read),
        (this.uint32 = ii.varint32read),
        (this.buf = e),
        (this.len = e.length),
        (this.pos = 0),
        (this.view = new DataView(e.buffer, e.byteOffset, e.byteLength)));
    }
    tag() {
      let pos = this.pos,
        uint32 = this.uint32(),
        r = this.pos - pos;
      if (r > 5 || (r == 5 && this.buf[this.pos - 1] > 15))
        throw Error("illegal tag: varint overflows uint32");
      let s = uint32 >>> 3,
        h = uint32 & 7;
      if (s <= 0 || h > 5) throw Error("illegal tag: field no " + s + " wire type " + h);
      return [s, h];
    }
    skip(e, n) {
      let pos = this.pos;
      switch (e) {
        case _l.Varint:
          while (this.buf[this.pos++] & 128);
          break;
        case _l.Bit64:
          this.pos += 4;
        case _l.Bit32:
          this.pos += 4;
          break;
        case _l.LengthDelimited:
          let uint32 = this.uint32();
          this.pos += uint32;
          break;
        case _l.StartGroup:
          for (;;) {
            let [h, y] = this.tag();
            if (y === _l.EndGroup) {
              if (n !== void 0 && h !== n) throw Error("invalid end group tag");
              break;
            }
            this.skip(y, h);
          }
          break;
        default:
          throw Error("cant skip wire type " + e);
      }
      return (this.assertBounds(), this.buf.subarray(pos, this.pos));
    }
    assertBounds() {
      if (this.pos > this.len) throw RangeError("premature EOF");
    }
    int32() {
      return this.uint32() | 0;
    }
    sint32() {
      let uint32 = this.uint32();
      return (uint32 >>> 1) ^ -(uint32 & 1);
    }
    int64() {
      return rs.protoInt64.dec(...this.varint64());
    }
    uint64() {
      return rs.protoInt64.uDec(...this.varint64());
    }
    sint64() {
      let [e, n] = this.varint64(),
        r = -(e & 1);
      return ((e = ((e >>> 1) | ((n & 1) << 31)) ^ r), (n = (n >>> 1) ^ r), rs.protoInt64.dec(e, n));
    }
    bool() {
      let [e, n] = this.varint64();
      return e !== 0 || n !== 0;
    }
    fixed32() {
      return this.view.getUint32((this.pos += 4) - 4, !0);
    }
    sfixed32() {
      return this.view.getInt32((this.pos += 4) - 4, !0);
    }
    fixed64() {
      return rs.protoInt64.uDec(this.sfixed32(), this.sfixed32());
    }
    sfixed64() {
      return rs.protoInt64.dec(this.sfixed32(), this.sfixed32());
    }
    float() {
      return this.view.getFloat32((this.pos += 4) - 4, !0);
    }
    double() {
      return this.view.getFloat64((this.pos += 8) - 8, !0);
    }
    bytes() {
      let uint32 = this.uint32(),
        pos = this.pos;
      return ((this.pos += uint32), this.assertBounds(), this.buf.subarray(pos, pos + uint32));
    }
    string(e) {
      return this.decodeUtf8(this.bytes(), e);
    }
  }
  YN.BinaryReader = jN;
  function Mx(e) {
    if (typeof e == "string") e = Number(e);
    else if (typeof e != "number") throw Error("invalid int32: " + typeof e);
    if (!Number.isInteger(e) || e > YN.INT32_MAX || e < YN.INT32_MIN) throw Error("invalid int32: " + e);
  }
  function KN(e) {
    if (typeof e == "string") e = Number(e);
    else if (typeof e != "number") throw Error("invalid uint32: " + typeof e);
    if (!Number.isInteger(e) || e > YN.UINT32_MAX || e < 0) throw Error("invalid uint32: " + e);
  }
  function eY(e) {
    if (typeof e == "string") {
      let n = e;
      if (((e = Number(e)), Number.isNaN(e) && n !== "NaN")) throw Error("invalid float32: " + n);
    } else if (typeof e != "number") throw Error("invalid float32: " + typeof e);
    if (Number.isFinite(e) && (e > YN.FLOAT32_MAX || e < YN.FLOAT32_MIN))
      throw Error("invalid float32: " + e);
  }
});

export { xc };
