/**
 * @smithy/core/dist-cjs/submodules/cbor/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/core@3.30.0
 * pieces: chunk-edce4vxq.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";
import { require_serde } from "../serde/index.js";
import { require_util_utf8 } from "../../../../util-utf8/dist-cjs/index.js";
import { require_protocols as require_protocols_2 } from "../protocols/index.js";
import { require_protocol_http } from "../../../../protocol-http/dist-cjs/index.js";
import { ss } from "../../../../../unresolved-cjs/index.js";
import { require_schema } from "../schema/index.js";
import { require_util_middleware } from "../../../../util-middleware/dist-cjs/index.js";
import { base64Module } from "../../../../../@aws-sdk/credential-provider-web-identity/dist-cjs/index.js";

//@ chunk-edce4vxq.js:12632-26640 cjs-fingerprint
var require_cbor = x(function (cjsExports) {
  var Ze = require_serde();
  var as = require_util_utf8();
  var $e = require_protocols_2();
  var HttpRequest = require_protocol_http();
  var qo = ss();
  var NormalizedSchema = require_schema();
  var getSmithyContext = require_util_middleware();
  var fromBase64 = base64Module();
  var majorUint64 = 0;
  var majorNegativeInt64 = 1;
  var Ne = 2;
  var fe = 3;
  var ze = 4;
  var Ke = 5;
  var majorTag = 6;
  var majorSpecial = 7;
  var specialFalse = 20;
  var specialTrue = 21;
  var specialNull = 22;
  var specialUndefined = 23;
  var Dt = 24;
  var Te = 25;
  var extendedFloat32 = 26;
  var extendedFloat64 = 27;
  var Pt = 31;
  function Re(e) {
    return typeof Buffer !== "undefined" ? Buffer.alloc(e) : new Uint8Array(e);
  }
  var kt = Symbol("@smithy/core/cbor::tagSymbol");
  function tag(e) {
    e[kt] = true;
    return e;
  }
  var Xo = typeof TextDecoder !== "undefined";
  var Wo = typeof Buffer !== "undefined";
  var payload = Re(0);
  var dataView$1 = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
  var ns = Xo ? new TextDecoder() : null;
  var _offset = 0;
  function Ko(bytes) {
    payload = bytes;
    dataView$1 = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
  }
  function le(e, t) {
    if (e >= t) throw Error("unexpected end of (decode) payload.");
    let major = (payload[e] & 224) >> 5;
    let s = payload[e] & 31;
    switch (major) {
      case majorUint64:
      case majorNegativeInt64:
      case majorTag:
        let unsignedInt;
        let a;
        if (s < 24) {
          unsignedInt = s;
          a = 1;
        } else
          switch (s) {
            case Dt:
            case Te:
            case extendedFloat32:
            case extendedFloat64:
              let c = fs[s];
              let d = c + 1;
              a = d;
              if (t - e < d) throw Error(`countLength ${c} greater than remaining buf len.`);
              let f = e + 1;
              if (c === 1) unsignedInt = payload[f];
              else if (c === 2) unsignedInt = dataView$1.getUint16(f);
              else if (c === 4) unsignedInt = dataView$1.getUint32(f);
              else unsignedInt = dataView$1.getBigUint64(f);
              break;
            default:
              throw Error(`unexpected minor value ${s}.`);
          }
        if (major === majorUint64) {
          _offset = a;
          return Rt(unsignedInt);
        } else if (major === majorNegativeInt64) {
          let negativeInt;
          if (typeof unsignedInt === "bigint") negativeInt = BigInt(-1) - unsignedInt;
          else negativeInt = -1 - unsignedInt;
          _offset = a;
          return Rt(negativeInt);
        } else if (s === 2 || s === 3) {
          let length = Le(e + a, t);
          let b = BigInt(0);
          let start = e + a + _offset;
          for (let i = start; i < start + length; ++i) b = (b << BigInt(8)) | BigInt(payload[i]);
          _offset = a + _offset + length;
          return s === 3 ? -b - BigInt(1) : b;
        } else if (s === 4) {
          let decimalFraction = le(e + a, t);
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
          _offset = a + _offset;
          return Ze.nv(numericString);
        } else {
          let value = le(e + a, t);
          _offset = a + _offset;
          return tag({
            tag: Rt(unsignedInt),
            value,
          });
        }
      case fe:
      case Ke:
      case ze:
      case Ne:
        if (s === Pt)
          switch (major) {
            case fe:
              return Zo(e, t);
            case Ke:
              return na(e, t);
            case ze:
              return ra(e, t);
            case Ne:
              return ea(e, t);
          }
        else
          switch (major) {
            case fe:
              return Jo(e, t);
            case Ke:
              return sa(e, t);
            case ze:
              return ta(e, t);
            case Ne:
              return zt(e, t);
          }
      default:
        return decodeSpecial(e, t);
    }
  }
  function hs(e, t, r) {
    if (Wo && e.constructor?.name === "Buffer") return e.toString("utf-8", t, r);
    if (ns) return ns.decode(e.subarray(t, r));
    return as.toUtf8(e.subarray(t, r));
  }
  function demote(bigInteger) {
    let num = Number(bigInteger);
    if (num < Number.MIN_SAFE_INTEGER || Number.MAX_SAFE_INTEGER < num)
      console.warn(
        Error(`@smithy/core/cbor - truncating BigInt(${bigInteger}) to ${num} with loss of precision.`),
      );
    return num;
  }
  var fs = {
    [Dt]: 1,
    [Te]: 2,
    [extendedFloat32]: 4,
    [extendedFloat64]: 8,
  };
  function bytesToFloat16(a_2, t) {
    let r = a_2 >> 7;
    let exponent = (a_2 & 124) >> 2;
    let fraction = ((a_2 & 3) << 8) | t;
    let a = r === 0 ? 1 : -1;
    let c;
    let d;
    if (exponent === 0) {
      if (fraction === 0) return 0;
      else {
        c = Math.pow(2, -14);
        d = 0;
      }
    } else if (exponent === 31) {
      if (fraction === 0) return a * (1 / 0);
      else return NaN;
    } else {
      c = Math.pow(2, exponent - 15);
      d = 1;
    }
    d += fraction / 1024;
    return a * (c * d);
  }
  function Le(e, t) {
    let r = payload[e] & 31;
    if (r < 24) {
      _offset = 1;
      return r;
    }
    if (r === Dt || r === Te || r === extendedFloat32 || r === extendedFloat64) {
      let s = fs[r];
      _offset = s + 1;
      if (t - e < _offset) throw Error(`countLength ${s} greater than remaining buf len.`);
      let o = e + 1;
      if (s === 1) return payload[o];
      else if (s === 2) return dataView$1.getUint16(o);
      else if (s === 4) return dataView$1.getUint32(o);
      return demote(dataView$1.getBigUint64(o));
    }
    throw Error(`unexpected minor value ${r}.`);
  }
  function Jo(e, t) {
    let r = Le(e, t);
    let s = _offset;
    e += s;
    if (t - e < r) throw Error(`string len ${r} greater than remaining buf len.`);
    let o = hs(payload, e, e + r);
    _offset = s + r;
    return o;
  }
  function Zo(e, t) {
    e += 1;
    let r = [];
    for (let s = e; e < t;) {
      if (payload[e] === 255) {
        let f = Re(r.length);
        f.set(r, 0);
        _offset = e - s + 2;
        return hs(f, 0, f.length);
      }
      let o = (payload[e] & 224) >> 5;
      let a = payload[e] & 31;
      if (o !== fe) throw Error(`unexpected major type ${o} in indefinite string.`);
      if (a === Pt) throw Error("nested indefinite string.");
      let c = zt(e, t);
      e += _offset;
      for (let i = 0; i < c.length; ++i) r.push(c[i]);
    }
    throw Error("expected break marker.");
  }
  function zt(e, t) {
    let r = Le(e, t);
    let s = _offset;
    e += s;
    if (t - e < r) throw Error(`unstructured byte string len ${r} greater than remaining buf len.`);
    let chunk = payload.subarray(e, e + r);
    _offset = s + r;
    return chunk;
  }
  function ea(e, t) {
    e += 1;
    let r = [];
    for (let s = e; e < t;) {
      if (payload[e] === 255) {
        let data = Re(r.length);
        data.set(r, 0);
        _offset = e - s + 2;
        return data;
      }
      let o = (payload[e] & 224) >> 5;
      let a = payload[e] & 31;
      if (o !== Ne) throw Error(`unexpected major type ${o} in indefinite string.`);
      if (a === Pt) throw Error("nested indefinite string.");
      let c = zt(e, t);
      e += _offset;
      for (let i = 0; i < c.length; ++i) r.push(c[i]);
    }
    throw Error("expected break marker.");
  }
  function ta(e, t) {
    let listDataLength = Le(e, t);
    let s = _offset;
    e += s;
    let o = e;
    let a = Array(listDataLength);
    for (let i = 0; i < listDataLength; ++i) {
      let d = le(e, t);
      let f = _offset;
      a[i] = d;
      e += f;
    }
    _offset = s + (e - o);
    return a;
  }
  function ra(e, t) {
    e += 1;
    let r = [];
    for (let s = e; e < t;) {
      if (payload[e] === 255) {
        _offset = e - s + 2;
        return r;
      }
      let o = le(e, t);
      e += _offset;
      r.push(o);
    }
    throw Error("expected break marker.");
  }
  function sa(e, t) {
    let r = Le(e, t);
    let s = _offset;
    e += s;
    let o = e;
    let a = {};
    for (let i = 0; i < r; ++i) {
      if (e >= t) throw Error("unexpected end of map payload.");
      let major = (payload[e] & 224) >> 5;
      if (major !== fe) throw Error(`unexpected major type ${major} for map key at index ${e}.`);
      let f = le(e, t);
      e += _offset;
      let m = le(e, t);
      e += _offset;
      a[f] = m;
    }
    _offset = s + (e - o);
    return a;
  }
  function na(e, t) {
    e += 1;
    let r = e;
    let s = {};
    for (; e < t;) {
      if (e >= t) throw Error("unexpected end of map payload.");
      if (payload[e] === 255) {
        _offset = e - r + 2;
        return s;
      }
      let o = (payload[e] & 224) >> 5;
      if (o !== fe) throw Error(`unexpected major type ${o} for map key.`);
      let a = le(e, t);
      e += _offset;
      let c = le(e, t);
      e += _offset;
      s[a] = c;
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
      case Te:
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
  function Rt(bigInt) {
    if (typeof bigInt === "number") return bigInt;
    let num = Number(bigInt);
    if (Number.MIN_SAFE_INTEGER <= num && num <= Number.MAX_SAFE_INTEGER) return num;
    return bigInt;
  }
  var is = typeof Buffer !== "undefined";
  var oa = 2048;
  var data = Re(oa);
  var dataView = new DataView(data.buffer, data.byteOffset, data.byteLength);
  var cursor = 0;
  function It(e) {
    if (data.byteLength - cursor < e)
      if (cursor < 16000000) resize(Math.max(data.byteLength * 4, data.byteLength + e));
      else resize(data.byteLength + e + 16000000);
  }
  function toUint8Array() {
    let e = Re(cursor);
    e.set(data.subarray(0, cursor), 0);
    cursor = 0;
    return e;
  }
  function resize(e) {
    let t = data;
    data = Re(e);
    if (t)
      if (t.copy) t.copy(data, 0, 0, t.byteLength);
      else data.set(t, 0);
    dataView = new DataView(data.buffer, data.byteOffset, data.byteLength);
  }
  function encodeHeader(e, value) {
    if (value < 24) data[cursor++] = (e << 5) | value;
    else if (value < 256) {
      data[cursor++] = (e << 5) | 24;
      data[cursor++] = value;
    } else if (value < 65536) {
      data[cursor++] = (e << 5) | Te;
      dataView.setUint16(cursor, value);
      cursor += 2;
    } else if (value < 4294967296) {
      data[cursor++] = (e << 5) | extendedFloat32;
      dataView.setUint32(cursor, value);
      cursor += 4;
    } else {
      data[cursor++] = (e << 5) | extendedFloat64;
      dataView.setBigUint64(cursor, typeof value === "bigint" ? value : BigInt(value));
      cursor += 8;
    }
  }
  function encode(_input) {
    let encodeStack = [_input];
    while (encodeStack.length) {
      let input = encodeStack.pop();
      It(typeof input === "string" ? input.length * 4 : 64);
      if (typeof input === "string") {
        if (is) {
          encodeHeader(fe, Buffer.byteLength(input));
          cursor += data.write(input, cursor);
        } else {
          let s = as.fromUtf8(input);
          encodeHeader(fe, s.byteLength);
          data.set(s, cursor);
          cursor += s.byteLength;
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
            data[cursor++] = (major << 5) | Te;
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
        let o = nonNegative ? majorUint64 : majorNegativeInt64;
        let value = nonNegative ? input : -input - BigInt(1);
        let c = Number(value);
        if (c < 24) data[cursor++] = (o << 5) | c;
        else if (c < 256) {
          data[cursor++] = (o << 5) | 24;
          data[cursor++] = c;
        } else if (c < 65536) {
          data[cursor++] = (o << 5) | Te;
          data[cursor++] = c >> 8;
          data[cursor++] = c & 255;
        } else if (c < 4294967296) {
          data[cursor++] = (o << 5) | extendedFloat32;
          dataView.setUint32(cursor, c);
          cursor += 4;
        } else if (value < BigInt("18446744073709551616")) {
          data[cursor++] = (o << 5) | extendedFloat64;
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
          It(bigIntBytes.byteLength * 2);
          data[cursor++] = nonNegative ? 194 : 195;
          if (is) encodeHeader(Ne, Buffer.byteLength(bigIntBytes));
          else encodeHeader(Ne, bigIntBytes.byteLength);
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
        encodeHeader(ze, input.length);
        continue;
      } else if (typeof input.byteLength === "number") {
        It(input.length * 2);
        encodeHeader(Ne, input.length);
        data.set(input, cursor);
        cursor += input.byteLength;
        continue;
      } else if (typeof input === "object") {
        if (input instanceof Ze.NumericValue) {
          let decimalIndex = input.string.indexOf(".");
          let a = decimalIndex === -1 ? 0 : decimalIndex - input.string.length + 1;
          let c = BigInt(input.string.replace(".", ""));
          data[cursor++] = 196;
          encodeStack.push(c);
          encodeStack.push(a);
          encodeHeader(ze, 2);
          continue;
        }
        if (input[kt])
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
          let a = keys[i];
          encodeStack.push(input[a]);
          encodeStack.push(a);
        }
        encodeHeader(Ke, keys.length);
        continue;
      }
      throw Error(`data type ${input?.constructor?.name ?? typeof input} not compatible for encoding.`);
    }
  }
  var cbor = {
    deserialize(bytes) {
      Ko(bytes);
      return le(0, bytes.length);
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
    $e.collectBody(streamBody, context).then(async (bytes) => {
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
        contents.headers["content-length"] = String(qo.calculateBodyLength(body));
      } catch (ignored) {}
    }
    return new HttpRequest.HttpRequest(contents);
  };
  class CborCodec extends $e.SerdeContext {
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
  class CborShapeSerializer extends $e.SerdeContext {
    value;
    write(schema, value) {
      this.value = this.serialize(schema, value);
    }
    serialize(schema, source) {
      let ns = NormalizedSchema.NormalizedSchema.of(schema);
      if (source == null) {
        if (ns.isIdempotencyToken()) return Ze.generateIdempotencyToken();
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
          let d = 0;
          for (let item of sourceObject) {
            let value = this.serialize(ns.getValueSchema(), item);
            if (value != null || sparse) newArray[d++] = value;
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
  class CborShapeDeserializer extends $e.SerdeContext {
    read(schema, bytes) {
      let data = cbor.deserialize(bytes);
      return this.readValue(schema, data);
    }
    readValue(_schema, value) {
      let ns = NormalizedSchema.NormalizedSchema.of(_schema);
      if (ns.isTimestampSchema() && typeof value === "number") return Ze._parseEpochTimestamp(value);
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
          let c = !!ns.getMergedTraits().sparse;
          for (let item of value) {
            let f = this.readValue(memberSchema, item);
            if (f != null || c) newArray.push(f);
          }
          return newArray;
        }
        let s = {};
        if (ns.isMapSchema()) {
          let o = !!ns.getMergedTraits().sparse;
          let valueSchema = ns.getValueSchema();
          for (let key of Object.keys(value)) {
            let d = this.readValue(valueSchema, value[key]);
            if (d != null || o) s[key] = d;
          }
        } else if (ns.isStructSchema())
          for (let [key, memberSchema] of ns.structIterator()) {
            let isUnion = this.readValue(memberSchema, value[key]);
            if (isUnion != null) s[key] = isUnion;
          }
        return s;
      } else return value;
    }
  }
  class SmithyRpcV2CborProtocol extends $e.RpcProtocol {
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
      let f = NormalizedSchema.TypeRegistry.for(defaultNamespace);
      let errorSchema;
      try {
        errorSchema = f.getSchema(errorName);
      } catch (ignored) {
        if (dataObject.Message) dataObject.message = dataObject.Message;
        let F = NormalizedSchema.TypeRegistry.for("smithy.ts.sdk.synthetic." + defaultNamespace);
        let baseExceptionSchema = F.getBaseException();
        if (baseExceptionSchema) {
          let ErrorCtor = F.getErrorCtor(baseExceptionSchema);
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
      let ErrorCtor = f.getErrorCtor(errorSchema);
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
  cjsExports.tagSymbol = kt;
});
export { require_cbor };
