/**
 * @smithy/eventstream-codec/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/eventstream-codec@4.2.13..4.2.14
 * pieces: chunk-3cddmtk7.js (12)
 * attribution: esm-layout 5, esm-fingerprint 7
 */
import { __toESM } from "../../../../runtime/bun-runtime.js";
import { require_util_hex_encoding } from "../../util-hex-encoding/dist-cjs/index.js";

//@ chunk-3cddmtk7.js:4598-4614 esm-layout
var utilHexEncoding = __toESM(require_util_hex_encoding());
//@ chunk-3cddmtk7.js:4614-4631 esm-layout
var import_util_hex_encoding = __toESM(require_util_hex_encoding());
//@ chunk-3cddmtk7.js:4631-5163 esm-fingerprint
class Int64 {
  bytes;
  constructor(bytes) {
    this.bytes = bytes;
    if (bytes.byteLength !== 8) throw Error("Int64 buffers must be exactly 8 bytes");
  }
  static fromNumber(number) {
    if (number > 9223372036854776000 || number < -9223372036854776000)
      throw Error(`${number} is too large (or, if negative, too small) to represent as an Int64`);
    let bytes = new Uint8Array(8);
    for (let i = 7, remaining = Math.abs(Math.round(number)); i > -1 && remaining > 0; i--, remaining /= 256)
      bytes[i] = remaining;
    if (number < 0) negate(bytes);
    return new Int64(bytes);
  }
  valueOf() {
    let bytes = this.bytes.slice(0);
    let negative = bytes[0] & 128;
    if (negative) negate(bytes);
    return parseInt(import_util_hex_encoding.toHex(bytes), 16) * (negative ? -1 : 1);
  }
  toString() {
    return String(this.valueOf());
  }
}
//@ chunk-3cddmtk7.js:5163-5254 esm-layout
function negate(bytes) {
  for (let i = 0; i < 8; i++) bytes[i] ^= 255;
  for (let i = 7; i > -1; i--) {
    bytes[i]++;
    if (bytes[i] !== 0) break;
  }
}
//@ chunk-3cddmtk7.js:5254-7788 esm-fingerprint
class HeaderMarshaller {
  toUtf8;
  fromUtf8;
  constructor(toUtf8, fromUtf8) {
    this.toUtf8 = toUtf8;
    this.fromUtf8 = fromUtf8;
  }
  format(headers) {
    let chunks = [];
    for (let headerName of Object.keys(headers)) {
      let bytes = this.fromUtf8(headerName);
      chunks.push(Uint8Array.from([bytes.byteLength]), bytes, this.formatHeaderValue(headers[headerName]));
    }
    let out = new Uint8Array(chunks.reduce((carry, bytes) => carry + bytes.byteLength, 0));
    let position = 0;
    for (let chunk of chunks) {
      out.set(chunk, position);
      position += chunk.byteLength;
    }
    return out;
  }
  formatHeaderValue(header) {
    switch (header.type) {
      case "boolean":
        return Uint8Array.from([header.value ? 0 : 1]);
      case "byte":
        return Uint8Array.from([2, header.value]);
      case "short":
        let shortView = new DataView(new ArrayBuffer(3));
        shortView.setUint8(0, 3);
        shortView.setInt16(1, header.value, false);
        return new Uint8Array(shortView.buffer);
      case "integer":
        let intView = new DataView(new ArrayBuffer(5));
        intView.setUint8(0, 4);
        intView.setInt32(1, header.value, false);
        return new Uint8Array(intView.buffer);
      case "long":
        let longBytes = new Uint8Array(9);
        longBytes[0] = 5;
        longBytes.set(header.value.bytes, 1);
        return longBytes;
      case "binary":
        let binView = new DataView(new ArrayBuffer(3 + header.value.byteLength));
        binView.setUint8(0, 6);
        binView.setUint16(1, header.value.byteLength, false);
        let binBytes = new Uint8Array(binView.buffer);
        binBytes.set(header.value, 3);
        return binBytes;
      case "string":
        let utf8Bytes = this.fromUtf8(header.value);
        let strView = new DataView(new ArrayBuffer(3 + utf8Bytes.byteLength));
        strView.setUint8(0, 7);
        strView.setUint16(1, utf8Bytes.byteLength, false);
        let strBytes = new Uint8Array(strView.buffer);
        strBytes.set(utf8Bytes, 3);
        return strBytes;
      case "timestamp":
        let tsBytes = new Uint8Array(9);
        tsBytes[0] = 8;
        tsBytes.set(Int64.fromNumber(header.value.valueOf()).bytes, 1);
        return tsBytes;
      case "uuid":
        if (!UUID_PATTERN.test(header.value)) throw Error(`Invalid UUID received: ${header.value}`);
        let uuidBytes = new Uint8Array(17);
        uuidBytes[0] = 9;
        uuidBytes.set(utilHexEncoding.fromHex(header.value.replace(/\-/g, "")), 1);
        return uuidBytes;
    }
  }
  parse(headers) {
    let out = {};
    let position = 0;
    while (position < headers.byteLength) {
      let nameLength = headers.getUint8(position++);
      let name = this.toUtf8(new Uint8Array(headers.buffer, headers.byteOffset + position, nameLength));
      switch (((position += nameLength), headers.getUint8(position++))) {
        case 0:
          out[name] = {
            type: BOOLEAN_TAG,
            value: true,
          };
          break;
        case 1:
          out[name] = {
            type: BOOLEAN_TAG,
            value: false,
          };
          break;
        case 2:
          out[name] = {
            type: BYTE_TAG,
            value: headers.getInt8(position++),
          };
          break;
        case 3:
          out[name] = {
            type: SHORT_TAG,
            value: headers.getInt16(position, false),
          };
          position += 2;
          break;
        case 4:
          out[name] = {
            type: INT_TAG,
            value: headers.getInt32(position, false),
          };
          position += 4;
          break;
        case 5:
          out[name] = {
            type: LONG_TAG,
            value: new Int64(new Uint8Array(headers.buffer, headers.byteOffset + position, 8)),
          };
          position += 8;
          break;
        case 6:
          let binaryLength = headers.getUint16(position, false);
          position += 2;
          out[name] = {
            type: BINARY_TAG,
            value: new Uint8Array(headers.buffer, headers.byteOffset + position, binaryLength),
          };
          position += binaryLength;
          break;
        case 7:
          let stringLength = headers.getUint16(position, false);
          position += 2;
          out[name] = {
            type: STRING_TAG,
            value: this.toUtf8(new Uint8Array(headers.buffer, headers.byteOffset + position, stringLength)),
          };
          position += stringLength;
          break;
        case 8:
          out[name] = {
            type: TIMESTAMP_TAG,
            value: new Date(
              new Int64(new Uint8Array(headers.buffer, headers.byteOffset + position, 8)).valueOf(),
            ),
          };
          position += 8;
          break;
        case 9:
          let uuidBytes = new Uint8Array(headers.buffer, headers.byteOffset + position, 16);
          position += 16;
          out[name] = {
            type: UUID_TAG,
            value: `${utilHexEncoding.toHex(uuidBytes.subarray(0, 4))}-${utilHexEncoding.toHex(uuidBytes.subarray(4, 6))}-${utilHexEncoding.toHex(uuidBytes.subarray(6, 8))}-${utilHexEncoding.toHex(uuidBytes.subarray(8, 10))}-${utilHexEncoding.toHex(uuidBytes.subarray(10))}`,
          };
          break;
        default:
          throw Error("Unrecognized header type tag");
      }
    }
    return out;
  }
}
//@ chunk-3cddmtk7.js:7788-7795 esm-layout
var HEADER_VALUE_TYPE;
//@ chunk-3cddmtk7.js:7795-8063 esm-fingerprint
(function (HEADER_VALUE_TYPE) {
  HEADER_VALUE_TYPE[(HEADER_VALUE_TYPE.boolTrue = 0)] = "boolTrue";
  HEADER_VALUE_TYPE[(HEADER_VALUE_TYPE.boolFalse = 1)] = "boolFalse";
  HEADER_VALUE_TYPE[(HEADER_VALUE_TYPE.byte = 2)] = "byte";
  HEADER_VALUE_TYPE[(HEADER_VALUE_TYPE.short = 3)] = "short";
  HEADER_VALUE_TYPE[(HEADER_VALUE_TYPE.integer = 4)] = "integer";
  HEADER_VALUE_TYPE[(HEADER_VALUE_TYPE.long = 5)] = "long";
  HEADER_VALUE_TYPE[(HEADER_VALUE_TYPE.byteArray = 6)] = "byteArray";
  HEADER_VALUE_TYPE[(HEADER_VALUE_TYPE.string = 7)] = "string";
  HEADER_VALUE_TYPE[(HEADER_VALUE_TYPE.timestamp = 8)] = "timestamp";
  HEADER_VALUE_TYPE[(HEADER_VALUE_TYPE.uuid = 9)] = "uuid";
})(HEADER_VALUE_TYPE || (HEADER_VALUE_TYPE = {}));
//@ chunk-3cddmtk7.js:8063-8241 esm-layout
var BOOLEAN_TAG = "boolean";
var BYTE_TAG = "byte";
var SHORT_TAG = "short";
var INT_TAG = "integer";
var LONG_TAG = "long";
var BINARY_TAG = "binary";
var STRING_TAG = "string";
var TIMESTAMP_TAG = "timestamp";
var UUID_TAG = "uuid";
var UUID_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
//@ chunk-3cddmtk7.js:10073-10276 esm-fingerprint
class MessageDecoderStream {
  options;
  constructor(options) {
    this.options = options;
  }
  [Symbol.asyncIterator]() {
    return this.asyncIterator();
  }
  async *asyncIterator() {
    for await (let bytes of this.options.inputStream) yield this.options.decoder.decode(bytes);
  }
}
//@ chunk-3cddmtk7.js:10276-10537 esm-fingerprint
class MessageEncoderStream {
  options;
  constructor(options) {
    this.options = options;
  }
  [Symbol.asyncIterator]() {
    return this.asyncIterator();
  }
  async *asyncIterator() {
    for await (let msg of this.options.messageStream) yield this.options.encoder.encode(msg);
    if (this.options.includeEndFrame) yield new Uint8Array(0);
  }
}
//@ chunk-3cddmtk7.js:10537-10779 esm-fingerprint
class SmithyMessageDecoderStream {
  options;
  constructor(options) {
    this.options = options;
  }
  [Symbol.asyncIterator]() {
    return this.asyncIterator();
  }
  async *asyncIterator() {
    for await (let message of this.options.messageStream) {
      let deserialized = await this.options.deserializer(message);
      if (deserialized === undefined) continue;
      yield deserialized;
    }
  }
}
//@ chunk-3cddmtk7.js:10779-10978 esm-fingerprint
class SmithyMessageEncoderStream {
  options;
  constructor(options) {
    this.options = options;
  }
  [Symbol.asyncIterator]() {
    return this.asyncIterator();
  }
  async *asyncIterator() {
    for await (let chunk of this.options.inputStream) yield this.options.serializer(chunk);
  }
}
export {
  HeaderMarshaller,
  SmithyMessageDecoderStream,
  MessageDecoderStream,
  MessageEncoderStream,
  SmithyMessageEncoderStream,
};
