/**
 * @smithy/eventstream-codec/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/eventstream-codec@4.2.13..4.2.14
 * pieces: chunk-3cddmtk7.js (12)
 * attribution: esm-layout 5, esm-fingerprint 7
 */
import { Re } from "../../../../runtime/bun-runtime.js";
import { K6t } from "../../util-hex-encoding/dist-cjs/index.js";

//@ chunk-3cddmtk7.js:4598-4614 esm-layout
var m = Re(K6t());
//@ chunk-3cddmtk7.js:4614-4631 esm-layout
var ce = Re(K6t());
//@ chunk-3cddmtk7.js:4631-5163 esm-fingerprint
class h {
  bytes;
  constructor(e) {
    if (((this.bytes = e), e.byteLength !== 8)) throw Error("Int64 buffers must be exactly 8 bytes");
  }
  static fromNumber(e) {
    if (e > 9223372036854776000 || e < -9223372036854776000)
      throw Error(`${e} is too large (or, if negative, too small) to represent as an Int64`);
    let uint8Array = new Uint8Array(8);
    for (let o = 7, abs = Math.abs(Math.round(e)); o > -1 && abs > 0; o--, abs /= 256) uint8Array[o] = abs;
    if (e < 0) ie(uint8Array);
    return new h(uint8Array);
  }
  valueOf() {
    let sliced = this.bytes.slice(0),
      t = sliced[0] & 128;
    if (t) ie(sliced);
    return parseInt(ce.toHex(sliced), 16) * (t ? -1 : 1);
  }
  toString() {
    return String(this.valueOf());
  }
}
//@ chunk-3cddmtk7.js:5163-5254 esm-layout
function ie(e) {
  for (let t = 0; t < 8; t++) e[t] ^= 255;
  for (let t = 7; t > -1; t--) if ((e[t]++, e[t] !== 0)) break;
}
//@ chunk-3cddmtk7.js:5254-7788 esm-fingerprint
class z {
  toUtf8;
  fromUtf8;
  constructor(e, t) {
    ((this.toUtf8 = e), (this.fromUtf8 = t));
  }
  format(e) {
    let t = [];
    for (let n of Object.keys(e)) {
      let fromUtf8 = this.fromUtf8(n);
      t.push(Uint8Array.from([fromUtf8.byteLength]), fromUtf8, this.formatHeaderValue(e[n]));
    }
    let uint8Array = new Uint8Array(t.reduce((n, s) => n + s.byteLength, 0)),
      r = 0;
    for (let n of t) (uint8Array.set(n, r), (r += n.byteLength));
    return uint8Array;
  }
  formatHeaderValue(e) {
    switch (e.type) {
      case "boolean":
        return Uint8Array.from([e.value ? 0 : 1]);
      case "byte":
        return Uint8Array.from([2, e.value]);
      case "short":
        let dataView = new DataView(new ArrayBuffer(3));
        return (dataView.setUint8(0, 3), dataView.setInt16(1, e.value, !1), new Uint8Array(dataView.buffer));
      case "integer":
        let dataView_2 = new DataView(new ArrayBuffer(5));
        return (
          dataView_2.setUint8(0, 4),
          dataView_2.setInt32(1, e.value, !1),
          new Uint8Array(dataView_2.buffer)
        );
      case "long":
        let uint8Array = new Uint8Array(9);
        return ((uint8Array[0] = 5), uint8Array.set(e.value.bytes, 1), uint8Array);
      case "binary":
        let dataView_3 = new DataView(new ArrayBuffer(3 + e.value.byteLength));
        (dataView_3.setUint8(0, 6), dataView_3.setUint16(1, e.value.byteLength, !1));
        let uint8Array_2 = new Uint8Array(dataView_3.buffer);
        return (uint8Array_2.set(e.value, 3), uint8Array_2);
      case "string":
        let fromUtf8 = this.fromUtf8(e.value),
          dataView_4 = new DataView(new ArrayBuffer(3 + fromUtf8.byteLength));
        (dataView_4.setUint8(0, 7), dataView_4.setUint16(1, fromUtf8.byteLength, !1));
        let uint8Array_3 = new Uint8Array(dataView_4.buffer);
        return (uint8Array_3.set(fromUtf8, 3), uint8Array_3);
      case "timestamp":
        let uint8Array_4 = new Uint8Array(9);
        return (
          (uint8Array_4[0] = 8),
          uint8Array_4.set(h.fromNumber(e.value.valueOf()).bytes, 1),
          uint8Array_4
        );
      case "uuid":
        if (!bt.test(e.value)) throw Error(`Invalid UUID received: ${e.value}`);
        let uint8Array_5 = new Uint8Array(17);
        return (
          (uint8Array_5[0] = 9),
          uint8Array_5.set(m.fromHex(e.value.replace(/\-/g, "")), 1),
          uint8Array_5
        );
    }
  }
  parse(e) {
    let t = {},
      o = 0;
    while (o < e.byteLength) {
      let uint8 = e.getUint8(o++),
        toUtf8 = this.toUtf8(new Uint8Array(e.buffer, e.byteOffset + o, uint8));
      switch (((o += uint8), e.getUint8(o++))) {
        case 0:
          t[toUtf8] = { type: BOOLEAN, value: !0 };
          break;
        case 1:
          t[toUtf8] = { type: BOOLEAN, value: !1 };
          break;
        case 2:
          t[toUtf8] = { type: BYTE, value: e.getInt8(o++) };
          break;
        case 3:
          ((t[toUtf8] = { type: SHORT, value: e.getInt16(o, !1) }), (o += 2));
          break;
        case 4:
          ((t[toUtf8] = { type: INTEGER, value: e.getInt32(o, !1) }), (o += 4));
          break;
        case 5:
          ((t[toUtf8] = { type: LONG, value: new h(new Uint8Array(e.buffer, e.byteOffset + o, 8)) }),
            (o += 8));
          break;
        case 6:
          let uint16 = e.getUint16(o, !1);
          ((o += 2),
            (t[toUtf8] = { type: BINARY, value: new Uint8Array(e.buffer, e.byteOffset + o, uint16) }),
            (o += uint16));
          break;
        case 7:
          let uint16_2 = e.getUint16(o, !1);
          ((o += 2),
            (t[toUtf8] = {
              type: STRING,
              value: this.toUtf8(new Uint8Array(e.buffer, e.byteOffset + o, uint16_2)),
            }),
            (o += uint16_2));
          break;
        case 8:
          ((t[toUtf8] = {
            type: TIMESTAMP,
            value: new Date(new h(new Uint8Array(e.buffer, e.byteOffset + o, 8)).valueOf()),
          }),
            (o += 8));
          break;
        case 9:
          let uint8Array = new Uint8Array(e.buffer, e.byteOffset + o, 16);
          ((o += 16),
            (t[toUtf8] = {
              type: UUID,
              value: `${m.toHex(uint8Array.subarray(0, 4))}-${m.toHex(uint8Array.subarray(4, 6))}-${m.toHex(uint8Array.subarray(6, 8))}-${m.toHex(uint8Array.subarray(8, 10))}-${m.toHex(uint8Array.subarray(10))}`,
            }));
          break;
        default:
          throw Error("Unrecognized header type tag");
      }
    }
    return t;
  }
}
//@ chunk-3cddmtk7.js:7788-7795 esm-layout
var _e;
//@ chunk-3cddmtk7.js:7795-8063 esm-fingerprint
(function (e) {
  ((e[(e.boolTrue = 0)] = "boolTrue"),
    (e[(e.boolFalse = 1)] = "boolFalse"),
    (e[(e.byte = 2)] = "byte"),
    (e[(e.short = 3)] = "short"),
    (e[(e.integer = 4)] = "integer"),
    (e[(e.long = 5)] = "long"),
    (e[(e.byteArray = 6)] = "byteArray"),
    (e[(e.string = 7)] = "string"),
    (e[(e.timestamp = 8)] = "timestamp"),
    (e[(e.uuid = 9)] = "uuid"));
})(_e || (_e = {}));
//@ chunk-3cddmtk7.js:8063-8241 esm-layout
var BOOLEAN = "boolean",
  BYTE = "byte",
  SHORT = "short",
  INTEGER = "integer",
  LONG = "long",
  BINARY = "binary",
  STRING = "string",
  TIMESTAMP = "timestamp",
  UUID = "uuid",
  bt = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
//@ chunk-3cddmtk7.js:10073-10276 esm-fingerprint
class Q {
  options;
  constructor(e) {
    this.options = e;
  }
  [Symbol.asyncIterator]() {
    return this.asyncIterator();
  }
  async *asyncIterator() {
    for await (let e of this.options.inputStream) yield this.options.decoder.decode(e);
  }
}
//@ chunk-3cddmtk7.js:10276-10537 esm-fingerprint
class K {
  options;
  constructor(e) {
    this.options = e;
  }
  [Symbol.asyncIterator]() {
    return this.asyncIterator();
  }
  async *asyncIterator() {
    for await (let e of this.options.messageStream) yield this.options.encoder.encode(e);
    if (this.options.includeEndFrame) yield new Uint8Array(0);
  }
}
//@ chunk-3cddmtk7.js:10537-10779 esm-fingerprint
class J {
  options;
  constructor(e) {
    this.options = e;
  }
  [Symbol.asyncIterator]() {
    return this.asyncIterator();
  }
  async *asyncIterator() {
    for await (let e of this.options.messageStream) {
      let deserializer = await this.options.deserializer(e);
      if (deserializer === void 0) continue;
      yield deserializer;
    }
  }
}
//@ chunk-3cddmtk7.js:10779-10978 esm-fingerprint
class Z {
  options;
  constructor(e) {
    this.options = e;
  }
  [Symbol.asyncIterator]() {
    return this.asyncIterator();
  }
  async *asyncIterator() {
    for await (let e of this.options.inputStream) yield this.options.serializer(e);
  }
}

export { z, J, Q, K, Z };
