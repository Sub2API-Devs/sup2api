/**
 * @smithy/core/dist-cjs/submodules/cbor/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/core@3.30.0
 * pieces: chunk-edce4vxq.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_serde } from "../serde/index.js";
import { require_util_utf8 } from "../../../../util-utf8/dist-cjs/index.js";
import { require_protocols as require_protocols_2 } from "../protocols/index.js";
import { require_protocol_http as require_protocol_http_3 } from "../../../../protocol-http/dist-cjs/index.js";
import { calculateBodyLengthModule } from "../../../../../unresolved-cjs/index.js";
import { require_schema } from "../schema/index.js";
import { require_util_middleware } from "../../../../util-middleware/dist-cjs/index.js";
import { base64Module } from "../../../../../@aws-sdk/credential-provider-web-identity/dist-cjs/index.js";

//@ chunk-edce4vxq.js:12632-26640 cjs-fingerprint
var require_cbor = __commonJS(function (cjsExports) {
  var serde = require_serde();
  var utilUtf8 = require_util_utf8();
  var protocols = require_protocols_2();
  var HttpRequest = require_protocol_http_3();
  var hasOwn = calculateBodyLengthModule();
  var NormalizedSchema = require_schema();
  var getSmithyContext = require_util_middleware();
  var fromBase64 = base64Module();
  var majorUint64 = 0;
  var majorNegativeInt64 = 1;
  var majorUnstructuredByteString = 2;
  var majorUtf8String = 3;
  var majorList = 4;
  var majorMap = 5;
  var majorTag = 6;
  var majorSpecial = 7;
  var specialFalse = 20;
  var specialTrue = 21;
  var specialNull = 22;
  var specialUndefined = 23;
  var extendedOneByte = 24;
  var extendedFloat16 = 25;
  var extendedFloat32 = 26;
  var extendedFloat64 = 27;
  var minorIndefinite = 31;
  function alloc(size) {
    return typeof Buffer !== "undefined" ? Buffer.alloc(size) : new Uint8Array(size);
  }
  var tagSymbol = Symbol("@smithy/core/cbor::tagSymbol");
  function tag(data) {
    data[tagSymbol] = true;
    return data;
  }
  var textDecoder = typeof TextDecoder !== "undefined";
  var USE_BUFFER = typeof Buffer !== "undefined";
  var payload = alloc(0);
  var dataView$1 = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
  var decoder = textDecoder ? new TextDecoder() : null;
  var _offset = 0;
  function setPayload(bytes) {
    payload = bytes;
    dataView$1 = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
  }
  function decode(at, to) {
    if (at >= to) throw Error("unexpected end of (decode) payload.");
    let major = (payload[at] & 224) >> 5;
    let minor = payload[at] & 31;
    switch (major) {
      case majorUint64:
      case majorNegativeInt64:
      case majorTag:
        let unsignedInt;
        let offset;
        if (minor < 24) {
          unsignedInt = minor;
          offset = 1;
        } else
          switch (minor) {
            case extendedOneByte:
            case extendedFloat16:
            case extendedFloat32:
            case extendedFloat64:
              let countLength = byteLengths[minor];
              let totalLength = countLength + 1;
              offset = totalLength;
              if (to - at < totalLength)
                throw Error(`countLength ${countLength} greater than remaining buf len.`);
              let valueIndex = at + 1;
              if (countLength === 1) unsignedInt = payload[valueIndex];
              else if (countLength === 2) unsignedInt = dataView$1.getUint16(valueIndex);
              else if (countLength === 4) unsignedInt = dataView$1.getUint32(valueIndex);
              else unsignedInt = dataView$1.getBigUint64(valueIndex);
              break;
            default:
              throw Error(`unexpected minor value ${minor}.`);
          }
        if (major === majorUint64) {
          _offset = offset;
          return demoteOrKeepBigInt(unsignedInt);
        } else if (major === majorNegativeInt64) {
          let negativeInt;
          if (typeof unsignedInt === "bigint") negativeInt = BigInt(-1) - unsignedInt;
          else negativeInt = -1 - unsignedInt;
          _offset = offset;
          return demoteOrKeepBigInt(negativeInt);
        } else if (minor === 2 || minor === 3) {
          let length = readCountLength(at + offset, to);
          let b = BigInt(0);
          let start = at + offset + _offset;
          for (let i = start; i < start + length; ++i) b = (b << BigInt(8)) | BigInt(payload[i]);
          _offset = offset + _offset + length;
          return minor === 3 ? -b - BigInt(1) : b;
        } else if (minor === 4) {
          let decimalFraction = decode(at + offset, to);
          let [exponent, mantissa] = decimalFraction;
          let normalizer = mantissa < 0 ? -1 : 1;
          let mantissaStr =
            "0".repeat(Math.abs(exponent) + 1) + String(BigInt(normalizer) * BigInt(mantissa));
          let numericString;
          let sign = mantissa < 0 ? "-" : "";
          numericString =
            exponent === 0
              ? mantissaStr
              : mantissaStr.slice(0, mantissaStr.length + exponent) + "." + mantissaStr.slice(exponent);
          numericString = numericString.replace(/^0+/g, "");
          if (numericString === "") numericString = "0";
          if (numericString[0] === ".") numericString = "0" + numericString;
          numericString = sign + numericString;
          _offset = offset + _offset;
          return serde.nv(numericString);
        } else {
          let value = decode(at + offset, to);
          _offset = offset + _offset;
          return tag({
            tag: demoteOrKeepBigInt(unsignedInt),
            value,
          });
        }
      case majorUtf8String:
      case majorMap:
      case majorList:
      case majorUnstructuredByteString:
        if (minor === minorIndefinite)
          switch (major) {
            case majorUtf8String:
              return decodeIndefiniteString(at, to);
            case majorMap:
              return decodeIndefiniteMap(at, to);
            case majorList:
              return decodeIndefiniteList(at, to);
            case majorUnstructuredByteString:
              return decodeIndefiniteBytes(at, to);
          }
        else
          switch (major) {
            case majorUtf8String:
              return decodeString(at, to);
            case majorMap:
              return decodeMap(at, to);
            case majorList:
              return decodeList(at, to);
            case majorUnstructuredByteString:
              return decodeBytes(at, to);
          }
      default:
        return decodeSpecial(at, to);
    }
  }
  function decodeUtf8(bytes, start, end) {
    if (USE_BUFFER && bytes.constructor?.name === "Buffer") return bytes.toString("utf-8", start, end);
    if (decoder) return decoder.decode(bytes.subarray(start, end));
    return utilUtf8.toUtf8(bytes.subarray(start, end));
  }
  function demote(bigInteger) {
    let num = Number(bigInteger);
    if (num < Number.MIN_SAFE_INTEGER || Number.MAX_SAFE_INTEGER < num)
      console.warn(
        Error(`@smithy/core/cbor - truncating BigInt(${bigInteger}) to ${num} with loss of precision.`),
      );
    return num;
  }
  var byteLengths = {
    [extendedOneByte]: 1,
    [extendedFloat16]: 2,
    [extendedFloat32]: 4,
    [extendedFloat64]: 8,
  };
  function bytesToFloat16(a_2, lowByte) {
    let sign = a_2 >> 7;
    let exponent = (a_2 & 124) >> 2;
    let fraction = ((a_2 & 3) << 8) | lowByte;
    let signMultiplier = sign === 0 ? 1 : -1;
    let base;
    let mantissa;
    if (exponent === 0) {
      if (fraction === 0) return 0;
      else {
        base = Math.pow(2, -14);
        mantissa = 0;
      }
    } else if (exponent === 31) {
      if (fraction === 0) return signMultiplier * (1 / 0);
      else return NaN;
    } else {
      base = Math.pow(2, exponent - 15);
      mantissa = 1;
    }
    mantissa += fraction / 1024;
    return signMultiplier * (base * mantissa);
  }
  function readCountLength(at, to) {
    let minor = payload[at] & 31;
    if (minor < 24) {
      _offset = 1;
      return minor;
    }
    if (
      minor === extendedOneByte ||
      minor === extendedFloat16 ||
      minor === extendedFloat32 ||
      minor === extendedFloat64
    ) {
      let byteLength = byteLengths[minor];
      _offset = byteLength + 1;
      if (to - at < _offset) throw Error(`countLength ${byteLength} greater than remaining buf len.`);
      let valueIndex = at + 1;
      if (byteLength === 1) return payload[valueIndex];
      else if (byteLength === 2) return dataView$1.getUint16(valueIndex);
      else if (byteLength === 4) return dataView$1.getUint32(valueIndex);
      return demote(dataView$1.getBigUint64(valueIndex));
    }
    throw Error(`unexpected minor value ${minor}.`);
  }
  function decodeString(at, to) {
    let length = readCountLength(at, to);
    let offsetSnapshot = _offset;
    at += offsetSnapshot;
    if (to - at < length) throw Error(`string len ${length} greater than remaining buf len.`);
    let str = decodeUtf8(payload, at, at + length);
    _offset = offsetSnapshot + length;
    return str;
  }
  function decodeIndefiniteString(at, to) {
    at += 1;
    let chunks = [];
    for (let start = at; at < to;) {
      if (payload[at] === 255) {
        let merged = alloc(chunks.length);
        merged.set(chunks, 0);
        _offset = at - start + 2;
        return decodeUtf8(merged, 0, merged.length);
      }
      let major = (payload[at] & 224) >> 5;
      let minor = payload[at] & 31;
      if (major !== majorUtf8String) throw Error(`unexpected major type ${major} in indefinite string.`);
      if (minor === minorIndefinite) throw Error("nested indefinite string.");
      let chunk = decodeBytes(at, to);
      at += _offset;
      for (let i = 0; i < chunk.length; ++i) chunks.push(chunk[i]);
    }
    throw Error("expected break marker.");
  }
  function decodeBytes(at, to) {
    let length = readCountLength(at, to);
    let offsetSnapshot = _offset;
    at += offsetSnapshot;
    if (to - at < length)
      throw Error(`unstructured byte string len ${length} greater than remaining buf len.`);
    let chunk = payload.subarray(at, at + length);
    _offset = offsetSnapshot + length;
    return chunk;
  }
  function decodeIndefiniteBytes(at, to) {
    at += 1;
    let chunks = [];
    for (let start = at; at < to;) {
      if (payload[at] === 255) {
        let data = alloc(chunks.length);
        data.set(chunks, 0);
        _offset = at - start + 2;
        return data;
      }
      let major = (payload[at] & 224) >> 5;
      let minor = payload[at] & 31;
      if (major !== majorUnstructuredByteString)
        throw Error(`unexpected major type ${major} in indefinite string.`);
      if (minor === minorIndefinite) throw Error("nested indefinite string.");
      let chunk = decodeBytes(at, to);
      at += _offset;
      for (let i = 0; i < chunk.length; ++i) chunks.push(chunk[i]);
    }
    throw Error("expected break marker.");
  }
  function decodeList(at, to) {
    let listDataLength = readCountLength(at, to);
    let offsetSnapshot = _offset;
    at += offsetSnapshot;
    let start = at;
    let list = Array(listDataLength);
    for (let i = 0; i < listDataLength; ++i) {
      let item = decode(at, to);
      let consumed = _offset;
      list[i] = item;
      at += consumed;
    }
    _offset = offsetSnapshot + (at - start);
    return list;
  }
  function decodeIndefiniteList(at, to) {
    at += 1;
    let list = [];
    for (let start = at; at < to;) {
      if (payload[at] === 255) {
        _offset = at - start + 2;
        return list;
      }
      let item = decode(at, to);
      at += _offset;
      list.push(item);
    }
    throw Error("expected break marker.");
  }
  function decodeMap(at, to) {
    let entryCount = readCountLength(at, to);
    let offsetSnapshot = _offset;
    at += offsetSnapshot;
    let start = at;
    let map = {};
    for (let i = 0; i < entryCount; ++i) {
      if (at >= to) throw Error("unexpected end of map payload.");
      let major = (payload[at] & 224) >> 5;
      if (major !== majorUtf8String)
        throw Error(`unexpected major type ${major} for map key at index ${at}.`);
      let key = decode(at, to);
      at += _offset;
      let value = decode(at, to);
      at += _offset;
      map[key] = value;
    }
    _offset = offsetSnapshot + (at - start);
    return map;
  }
  function decodeIndefiniteMap(at, to) {
    at += 1;
    let start = at;
    let map = {};
    for (; at < to;) {
      if (at >= to) throw Error("unexpected end of map payload.");
      if (payload[at] === 255) {
        _offset = at - start + 2;
        return map;
      }
      let major = (payload[at] & 224) >> 5;
      if (major !== majorUtf8String) throw Error(`unexpected major type ${major} for map key.`);
      let key = decode(at, to);
      at += _offset;
      let value = decode(at, to);
      at += _offset;
      map[key] = value;
    }
    throw Error("expected break marker.");
  }
  function decodeSpecial(at, to) {
    let minor = payload[at] & 31;
    switch (minor) {
      case specialTrue:
      case specialFalse:
        _offset = 1;
        return minor === specialTrue;
      case specialNull:
        _offset = 1;
        return null;
      case specialUndefined:
        _offset = 1;
        return null;
      case extendedFloat16:
        if (to - at < 3) throw Error("incomplete float16 at end of buf.");
        _offset = 3;
        return bytesToFloat16(payload[at + 1], payload[at + 2]);
      case extendedFloat32:
        if (to - at < 5) throw Error("incomplete float32 at end of buf.");
        _offset = 5;
        return dataView$1.getFloat32(at + 1);
      case extendedFloat64:
        if (to - at < 9) throw Error("incomplete float64 at end of buf.");
        _offset = 9;
        return dataView$1.getFloat64(at + 1);
      default:
        throw Error(`unexpected minor value ${minor}.`);
    }
  }
  function demoteOrKeepBigInt(bigInt) {
    if (typeof bigInt === "number") return bigInt;
    let num = Number(bigInt);
    if (Number.MIN_SAFE_INTEGER <= num && num <= Number.MAX_SAFE_INTEGER) return num;
    return bigInt;
  }
  var isBuffer = typeof Buffer !== "undefined";
  var INITIAL_BUFFER_SIZE = 2048;
  var data = alloc(INITIAL_BUFFER_SIZE);
  var dataView = new DataView(data.buffer, data.byteOffset, data.byteLength);
  var cursor = 0;
  function ensureCapacity(needed) {
    if (data.byteLength - cursor < needed)
      if (cursor < 16000000) resize(Math.max(data.byteLength * 4, data.byteLength + needed));
      else resize(data.byteLength + needed + 16000000);
  }
  function toUint8Array() {
    let output = alloc(cursor);
    output.set(data.subarray(0, cursor), 0);
    cursor = 0;
    return output;
  }
  function resize(size) {
    let previous = data;
    data = alloc(size);
    if (previous)
      if (previous.copy) previous.copy(data, 0, 0, previous.byteLength);
      else data.set(previous, 0);
    dataView = new DataView(data.buffer, data.byteOffset, data.byteLength);
  }
  function encodeHeader(major, value) {
    if (value < 24) data[cursor++] = (major << 5) | value;
    else if (value < 256) {
      data[cursor++] = (major << 5) | 24;
      data[cursor++] = value;
    } else if (value < 65536) {
      data[cursor++] = (major << 5) | extendedFloat16;
      dataView.setUint16(cursor, value);
      cursor += 2;
    } else if (value < 4294967296) {
      data[cursor++] = (major << 5) | extendedFloat32;
      dataView.setUint32(cursor, value);
      cursor += 4;
    } else {
      data[cursor++] = (major << 5) | extendedFloat64;
      dataView.setBigUint64(cursor, typeof value === "bigint" ? value : BigInt(value));
      cursor += 8;
    }
  }
  function encode(_input) {
    let encodeStack = [_input];
    while (encodeStack.length) {
      let input = encodeStack.pop();
      ensureCapacity(typeof input === "string" ? input.length * 4 : 64);
      if (typeof input === "string") {
        if (isBuffer) {
          encodeHeader(majorUtf8String, Buffer.byteLength(input));
          cursor += data.write(input, cursor);
        } else {
          let utf8Bytes = utilUtf8.fromUtf8(input);
          encodeHeader(majorUtf8String, utf8Bytes.byteLength);
          data.set(utf8Bytes, cursor);
          cursor += utf8Bytes.byteLength;
        }
        continue;
      } else if (typeof input === "number") {
        if (Number.isInteger(input)) {
          let nonNegative = input >= 0;
          let major = nonNegative ? majorUint64 : majorNegativeInt64;
          let value = nonNegative ? input : -input - 1;
          if (value < 24) data[cursor++] = (major << 5) | value;
          else if (value < 256) {
            data[cursor++] = (major << 5) | 24;
            data[cursor++] = value;
          } else if (value < 65536) {
            data[cursor++] = (major << 5) | extendedFloat16;
            data[cursor++] = value >> 8;
            data[cursor++] = value;
          } else if (value < 4294967296) {
            data[cursor++] = (major << 5) | extendedFloat32;
            dataView.setUint32(cursor, value);
            cursor += 4;
          } else {
            data[cursor++] = (major << 5) | extendedFloat64;
            dataView.setBigUint64(cursor, BigInt(value));
            cursor += 8;
          }
          continue;
        }
        data[cursor++] = (majorSpecial << 5) | extendedFloat64;
        dataView.setFloat64(cursor, input);
        cursor += 8;
        continue;
      } else if (typeof input === "bigint") {
        let nonNegative = input >= 0;
        let major = nonNegative ? majorUint64 : majorNegativeInt64;
        let value = nonNegative ? input : -input - BigInt(1);
        let valueNumber = Number(value);
        if (valueNumber < 24) data[cursor++] = (major << 5) | valueNumber;
        else if (valueNumber < 256) {
          data[cursor++] = (major << 5) | 24;
          data[cursor++] = valueNumber;
        } else if (valueNumber < 65536) {
          data[cursor++] = (major << 5) | extendedFloat16;
          data[cursor++] = valueNumber >> 8;
          data[cursor++] = valueNumber & 255;
        } else if (valueNumber < 4294967296) {
          data[cursor++] = (major << 5) | extendedFloat32;
          dataView.setUint32(cursor, valueNumber);
          cursor += 4;
        } else if (value < BigInt("18446744073709551616")) {
          data[cursor++] = (major << 5) | extendedFloat64;
          dataView.setBigUint64(cursor, value);
          cursor += 8;
        } else {
          let binaryBigInt = value.toString(2);
          let bigIntBytes = new Uint8Array(Math.ceil(binaryBigInt.length / 8));
          let b = value;
          let i = 0;
          while (bigIntBytes.byteLength - ++i >= 0) {
            bigIntBytes[bigIntBytes.byteLength - i] = Number(b & BigInt(255));
            b >>= BigInt(8);
          }
          ensureCapacity(bigIntBytes.byteLength * 2);
          data[cursor++] = nonNegative ? 194 : 195;
          if (isBuffer) encodeHeader(majorUnstructuredByteString, Buffer.byteLength(bigIntBytes));
          else encodeHeader(majorUnstructuredByteString, bigIntBytes.byteLength);
          data.set(bigIntBytes, cursor);
          cursor += bigIntBytes.byteLength;
        }
        continue;
      } else if (input === null) {
        data[cursor++] = (majorSpecial << 5) | specialNull;
        continue;
      } else if (typeof input === "boolean") {
        data[cursor++] = (majorSpecial << 5) | (input ? specialTrue : specialFalse);
        continue;
      } else if (typeof input === "undefined")
        throw Error("@smithy/core/cbor: client may not serialize undefined value.");
      else if (Array.isArray(input)) {
        for (let i = input.length - 1; i >= 0; --i) encodeStack.push(input[i]);
        encodeHeader(majorList, input.length);
        continue;
      } else if (typeof input.byteLength === "number") {
        ensureCapacity(input.length * 2);
        encodeHeader(majorUnstructuredByteString, input.length);
        data.set(input, cursor);
        cursor += input.byteLength;
        continue;
      } else if (typeof input === "object") {
        if (input instanceof serde.NumericValue) {
          let decimalIndex = input.string.indexOf(".");
          let exponent = decimalIndex === -1 ? 0 : decimalIndex - input.string.length + 1;
          let mantissa = BigInt(input.string.replace(".", ""));
          data[cursor++] = 196;
          encodeStack.push(mantissa);
          encodeStack.push(exponent);
          encodeHeader(majorList, 2);
          continue;
        }
        if (input[tagSymbol])
          if ("tag" in input && "value" in input) {
            encodeStack.push(input.value);
            encodeHeader(majorTag, input.tag);
            continue;
          } else
            throw Error(
              "tag encountered with missing fields, need 'tag' and 'value', found: " + JSON.stringify(input),
            );
        let keys = Object.keys(input);
        for (let i = keys.length - 1; i >= 0; --i) {
          let key = keys[i];
          encodeStack.push(input[key]);
          encodeStack.push(key);
        }
        encodeHeader(majorMap, keys.length);
        continue;
      }
      throw Error(`data type ${input?.constructor?.name ?? typeof input} not compatible for encoding.`);
    }
  }
  var cbor = {
    deserialize(bytes) {
      setPayload(bytes);
      return decode(0, bytes.length);
    },
    serialize(input) {
      try {
        encode(input);
        return toUint8Array();
      } catch (e) {
        toUint8Array();
        throw e;
      }
    },
    resizeEncodingBuffer(size) {
      resize(size);
    },
  };
  var parseCborBody = (streamBody, context) =>
    protocols.collectBody(streamBody, context).then(async (bytes) => {
      if (bytes.length)
        try {
          return cbor.deserialize(bytes);
        } catch (e) {
          Object.defineProperty(e, "$responseBodyText", {
            value: context.utf8Encoder(bytes),
          });
          throw e;
        }
      return {};
    });
  var dateToTag = (date) =>
    tag({
      tag: 1,
      value: date.getTime() / 1000,
    });
  var parseCborErrorBody = async (errorBody, context) => {
    let value = await parseCborBody(errorBody, context);
    value.message = value.message ?? value.Message;
    return value;
  };
  var loadSmithyRpcV2CborErrorCode = (output, data) => {
    let sanitizeErrorCode = (rawValue) => {
      let cleanValue = rawValue;
      if (typeof cleanValue === "number") cleanValue = cleanValue.toString();
      if (cleanValue.indexOf(",") >= 0) cleanValue = cleanValue.split(",")[0];
      if (cleanValue.indexOf(":") >= 0) cleanValue = cleanValue.split(":")[0];
      if (cleanValue.indexOf("#") >= 0) cleanValue = cleanValue.split("#")[1];
      return cleanValue;
    };
    if (data.__type !== undefined) return sanitizeErrorCode(data.__type);
    let codeKey = Object.keys(data).find((key) => key.toLowerCase() === "code");
    if (codeKey && data[codeKey] !== undefined) return sanitizeErrorCode(data[codeKey]);
  };
  var checkCborResponse = (response) => {
    if (String(response.headers["smithy-protocol"]).toLowerCase() !== "rpc-v2-cbor")
      throw Error("Malformed RPCv2 CBOR response, status: " + response.statusCode);
  };
  var buildHttpRpcRequest = async (context, headers, path, resolvedHostname, body) => {
    let { hostname, protocol = "https", port, path: basePath } = await context.endpoint();
    let contents = {
      protocol,
      hostname,
      port,
      method: "POST",
      path: basePath.endsWith("/") ? basePath.slice(0, -1) + path : basePath + path,
      headers: {
        ...headers,
      },
    };
    if (resolvedHostname !== undefined) contents.hostname = resolvedHostname;
    if (body !== undefined) {
      contents.body = body;
      try {
        contents.headers["content-length"] = String(hasOwn.calculateBodyLength(body));
      } catch (ignored) {}
    }
    return new HttpRequest.HttpRequest(contents);
  };
  class CborCodec extends protocols.SerdeContext {
    createSerializer() {
      let serializer = new CborShapeSerializer();
      serializer.setSerdeContext(this.serdeContext);
      return serializer;
    }
    createDeserializer() {
      let deserializer = new CborShapeDeserializer();
      deserializer.setSerdeContext(this.serdeContext);
      return deserializer;
    }
  }
  class CborShapeSerializer extends protocols.SerdeContext {
    value;
    write(schema, value) {
      this.value = this.serialize(schema, value);
    }
    serialize(schema, source) {
      let ns = NormalizedSchema.NormalizedSchema.of(schema);
      if (source == null) {
        if (ns.isIdempotencyToken()) return serde.generateIdempotencyToken();
        return source;
      }
      if (ns.isBlobSchema()) {
        if (typeof source === "string")
          return (this.serdeContext?.base64Decoder ?? fromBase64.fromBase64)(source);
        return source;
      }
      if (ns.isTimestampSchema()) {
        if (typeof source === "number" || typeof source === "bigint")
          return dateToTag(new Date((Number(source) / 1000) | 0));
        return dateToTag(source);
      }
      if (typeof source === "function" || typeof source === "object") {
        let sourceObject = source;
        if (ns.isListSchema() && Array.isArray(sourceObject)) {
          let sparse = !!ns.getMergedTraits().sparse;
          let newArray = [];
          let index = 0;
          for (let item of sourceObject) {
            let value = this.serialize(ns.getValueSchema(), item);
            if (value != null || sparse) newArray[index++] = value;
          }
          return newArray;
        }
        if (sourceObject instanceof Date) return dateToTag(sourceObject);
        let newObject = {};
        if (ns.isMapSchema()) {
          let sparse = !!ns.getMergedTraits().sparse;
          for (let key of Object.keys(sourceObject)) {
            let value = this.serialize(ns.getValueSchema(), sourceObject[key]);
            if (value != null || sparse) newObject[key] = value;
          }
        } else if (ns.isStructSchema())
          for (let [key, memberSchema] of ns.structIterator()) {
            let value = this.serialize(memberSchema, sourceObject[key]);
            if (value != null) newObject[key] = value;
          }
        else if (ns.isDocumentSchema())
          for (let key of Object.keys(sourceObject))
            newObject[key] = this.serialize(ns.getValueSchema(), sourceObject[key]);
        return newObject;
      }
      return source;
    }
    flush() {
      let buffer = cbor.serialize(this.value);
      this.value = undefined;
      return buffer;
    }
  }
  class CborShapeDeserializer extends protocols.SerdeContext {
    read(schema, bytes) {
      let data = cbor.deserialize(bytes);
      return this.readValue(schema, data);
    }
    readValue(_schema, value) {
      let ns = NormalizedSchema.NormalizedSchema.of(_schema);
      if (ns.isTimestampSchema() && typeof value === "number") return serde._parseEpochTimestamp(value);
      if (ns.isBlobSchema()) {
        if (typeof value === "string")
          return (this.serdeContext?.base64Decoder ?? fromBase64.fromBase64)(value);
        return value;
      }
      if (
        typeof value === "undefined" ||
        typeof value === "boolean" ||
        typeof value === "number" ||
        typeof value === "string" ||
        typeof value === "bigint" ||
        typeof value === "symbol"
      )
        return value;
      else if (typeof value === "function" || typeof value === "object") {
        if (value === null) return null;
        if ("byteLength" in value) return value;
        if (value instanceof Date) return value;
        if (ns.isDocumentSchema()) return value;
        if (ns.isListSchema()) {
          let newArray = [];
          let memberSchema = ns.getValueSchema();
          let sparse = !!ns.getMergedTraits().sparse;
          for (let item of value) {
            let readValue = this.readValue(memberSchema, item);
            if (readValue != null || sparse) newArray.push(readValue);
          }
          return newArray;
        }
        let result = {};
        if (ns.isMapSchema()) {
          let sparse = !!ns.getMergedTraits().sparse;
          let valueSchema = ns.getValueSchema();
          for (let key of Object.keys(value)) {
            let deserialized = this.readValue(valueSchema, value[key]);
            if (deserialized != null || sparse) result[key] = deserialized;
          }
        } else if (ns.isStructSchema())
          for (let [key, memberSchema] of ns.structIterator()) {
            let isUnion = this.readValue(memberSchema, value[key]);
            if (isUnion != null) result[key] = isUnion;
          }
        return result;
      } else return value;
    }
  }
  class SmithyRpcV2CborProtocol extends protocols.RpcProtocol {
    codec = new CborCodec();
    serializer = this.codec.createSerializer();
    deserializer = this.codec.createDeserializer();
    constructor({ defaultNamespace }) {
      super({
        defaultNamespace,
      });
    }
    getShapeId() {
      return "smithy.protocols#rpcv2Cbor";
    }
    getPayloadCodec() {
      return this.codec;
    }
    async serializeRequest(operationSchema, input, context) {
      let request = await super.serializeRequest(operationSchema, input, context);
      Object.assign(request.headers, {
        "content-type": this.getDefaultContentType(),
        "smithy-protocol": "rpc-v2-cbor",
        accept: this.getDefaultContentType(),
      });
      if (NormalizedSchema.deref(operationSchema.input) === "unit") {
        delete request.body;
        delete request.headers["content-type"];
      } else {
        if (!request.body) {
          this.serializer.write(15, {});
          request.body = this.serializer.flush();
        }
        try {
          request.headers["content-length"] = String(request.body.byteLength);
        } catch (ignored) {}
      }
      let { service, operation } = getSmithyContext.getSmithyContext(context);
      let path = `/service/${service}/operation/${operation}`;
      if (request.path.endsWith("/")) request.path += path.slice(1);
      else request.path += path;
      return request;
    }
    async deserializeResponse(operationSchema, context, response) {
      return super.deserializeResponse(operationSchema, context, response);
    }
    async handleError(operationSchema, context, response, dataObject, metadata) {
      let errorName = loadSmithyRpcV2CborErrorCode(response, dataObject) ?? "Unknown";
      let defaultNamespace = this.options.defaultNamespace;
      if (errorName.includes("#")) [defaultNamespace] = errorName.split("#");
      let errorMetadata = {
        $metadata: metadata,
        $fault: response.statusCode <= 500 ? "client" : "server",
      };
      let typeRegistry = NormalizedSchema.TypeRegistry.for(defaultNamespace);
      let errorSchema;
      try {
        errorSchema = typeRegistry.getSchema(errorName);
      } catch (ignored) {
        if (dataObject.Message) dataObject.message = dataObject.Message;
        let syntheticRegistry = NormalizedSchema.TypeRegistry.for(
          "smithy.ts.sdk.synthetic." + defaultNamespace,
        );
        let baseExceptionSchema = syntheticRegistry.getBaseException();
        if (baseExceptionSchema) {
          let ErrorCtor = syntheticRegistry.getErrorCtor(baseExceptionSchema);
          throw Object.assign(
            new ErrorCtor({
              name: errorName,
            }),
            errorMetadata,
            dataObject,
          );
        }
        throw Object.assign(Error(errorName), errorMetadata, dataObject);
      }
      let ns = NormalizedSchema.NormalizedSchema.of(errorSchema);
      let ErrorCtor = typeRegistry.getErrorCtor(errorSchema);
      let message = dataObject.message ?? dataObject.Message ?? "Unknown";
      let exception = new ErrorCtor(message);
      let output = {};
      for (let [name, member] of ns.structIterator())
        output[name] = this.deserializer.readValue(member, dataObject[name]);
      throw Object.assign(
        exception,
        errorMetadata,
        {
          $fault: ns.getMergedTraits().error,
          message,
        },
        output,
      );
    }
    getDefaultContentType() {
      return "application/cbor";
    }
  }
  cjsExports.CborCodec = CborCodec;
  cjsExports.CborShapeDeserializer = CborShapeDeserializer;
  cjsExports.CborShapeSerializer = CborShapeSerializer;
  cjsExports.SmithyRpcV2CborProtocol = SmithyRpcV2CborProtocol;
  cjsExports.buildHttpRpcRequest = buildHttpRpcRequest;
  cjsExports.cbor = cbor;
  cjsExports.checkCborResponse = checkCborResponse;
  cjsExports.dateToTag = dateToTag;
  cjsExports.loadSmithyRpcV2CborErrorCode = loadSmithyRpcV2CborErrorCode;
  cjsExports.parseCborBody = parseCborBody;
  cjsExports.parseCborErrorBody = parseCborErrorBody;
  cjsExports.tag = tag;
  cjsExports.tagSymbol = tagSymbol;
});
export { require_cbor };
