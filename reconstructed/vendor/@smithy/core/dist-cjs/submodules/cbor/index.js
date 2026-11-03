/**
 * @smithy/core/dist-cjs/submodules/cbor/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/core@3.30.0
 * pieces: chunk-edce4vxq.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";
import { z6t } from "../serde/index.js";
import { IR } from "../../../../util-utf8/dist-cjs/index.js";
import { jRt } from "../protocols/index.js";
import { Kg } from "../../../../protocol-http/dist-cjs/index.js";
import { ss } from "../../../../../unresolved-cjs/index.js";
import { _D } from "../schema/index.js";
import { bD } from "../../../../util-middleware/dist-cjs/index.js";
import { base64Module } from "../../../../../@aws-sdk/credential-provider-web-identity/dist-cjs/index.js";

//@ chunk-edce4vxq.js:12632-26640 cjs-fingerprint
var Ut = x(function (da) {
  var Ze = z6t(),
    as = IR(),
    $e = jRt(),
    jo = Kg(),
    qo = ss(),
    Ae = _D(),
    Ho = bD(),
    cs = base64Module(),
    Ye = 0,
    Je = 1,
    Ne = 2,
    fe = 3,
    ze = 4,
    Ke = 5,
    us = 6,
    At = 7,
    ls = 20,
    Ot = 21,
    ds = 22,
    Go = 23,
    Dt = 24,
    Te = 25,
    _e = 26,
    pe = 27,
    Pt = 31;
  function Re(e) {
    return typeof Buffer < "u" ? Buffer.alloc(e) : new Uint8Array(e);
  }
  var kt = Symbol("@smithy/core/cbor::tagSymbol");
  function vt(e) {
    return ((e[kt] = !0), e);
  }
  var Xo = typeof TextDecoder < "u",
    Wo = typeof Buffer < "u",
    V = Re(0),
    dataView = new DataView(V.buffer, V.byteOffset, V.byteLength),
    ns = Xo ? new TextDecoder() : null,
    P = 0;
  function Ko(e) {
    ((V = e), (dataView = new DataView(V.buffer, V.byteOffset, V.byteLength)));
  }
  function le(e, t) {
    if (e >= t) throw Error("unexpected end of (decode) payload.");
    let r = (V[e] & 224) >> 5,
      s = V[e] & 31;
    switch (r) {
      case Ye:
      case Je:
      case us:
        let o, a;
        if (s < 24) ((o = s), (a = 1));
        else
          switch (s) {
            case Dt:
            case Te:
            case _e:
            case pe:
              let c = fs[s],
                d = c + 1;
              if (((a = d), t - e < d)) throw Error(`countLength ${c} greater than remaining buf len.`);
              let f = e + 1;
              if (c === 1) o = V[f];
              else if (c === 2) o = dataView.getUint16(f);
              else if (c === 4) o = dataView.getUint32(f);
              else o = dataView.getBigUint64(f);
              break;
            default:
              throw Error(`unexpected minor value ${s}.`);
          }
        if (r === Ye) return ((P = a), Rt(o));
        else if (r === Je) {
          let c;
          if (typeof o === "bigint") c = BigInt(-1) - o;
          else c = -1 - o;
          return ((P = a), Rt(c));
        } else if (s === 2 || s === 3) {
          let c = Le(e + a, t),
            d = BigInt(0),
            f = e + a + P;
          for (let m = f; m < f + c; ++m) d = (d << BigInt(8)) | BigInt(V[m]);
          return ((P = a + P + c), s === 3 ? -d - BigInt(1) : d);
        } else if (s === 4) {
          let c = le(e + a, t),
            [d, f] = c,
            m = f < 0 ? -1 : 1,
            y = "0".repeat(Math.abs(d) + 1) + String(BigInt(m) * BigInt(f)),
            N,
            b = f < 0 ? "-" : "";
          if (
            ((N = d === 0 ? y : y.slice(0, y.length + d) + "." + y.slice(d)),
            (N = N.replace(/^0+/g, "")),
            N === "")
          )
            N = "0";
          if (N[0] === ".") N = "0" + N;
          return ((N = b + N), (P = a + P), Ze.nv(N));
        } else {
          let c = le(e + a, t);
          return ((P = a + P), vt({ tag: Rt(o), value: c }));
        }
      case fe:
      case Ke:
      case ze:
      case Ne:
        if (s === Pt)
          switch (r) {
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
          switch (r) {
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
        return ia(e, t);
    }
  }
  function hs(e, t, r) {
    if (Wo && e.constructor?.name === "Buffer") return e.toString("utf-8", t, r);
    if (ns) return ns.decode(e.subarray(t, r));
    return as.toUtf8(e.subarray(t, r));
  }
  function Qo(e) {
    let t = Number(e);
    if (t < Number.MIN_SAFE_INTEGER || Number.MAX_SAFE_INTEGER < t)
      console.warn(Error(`@smithy/core/cbor - truncating BigInt(${e}) to ${t} with loss of precision.`));
    return t;
  }
  var fs = { [Dt]: 1, [Te]: 2, [_e]: 4, [pe]: 8 };
  function Yo(e, t) {
    let r = e >> 7,
      s = (e & 124) >> 2,
      o = ((e & 3) << 8) | t,
      a = r === 0 ? 1 : -1,
      c,
      d;
    if (s === 0)
      if (o === 0) return 0;
      else ((c = Math.pow(2, -14)), (d = 0));
    else if (s === 31)
      if (o === 0) return a * (1 / 0);
      else return NaN;
    else ((c = Math.pow(2, s - 15)), (d = 1));
    return ((d += o / 1024), a * (c * d));
  }
  function Le(e, t) {
    let r = V[e] & 31;
    if (r < 24) return ((P = 1), r);
    if (r === Dt || r === Te || r === _e || r === pe) {
      let s = fs[r];
      if (((P = s + 1), t - e < P)) throw Error(`countLength ${s} greater than remaining buf len.`);
      let o = e + 1;
      if (s === 1) return V[o];
      else if (s === 2) return dataView.getUint16(o);
      else if (s === 4) return dataView.getUint32(o);
      return Qo(dataView.getBigUint64(o));
    }
    throw Error(`unexpected minor value ${r}.`);
  }
  function Jo(e, t) {
    let r = Le(e, t),
      s = P;
    if (((e += s), t - e < r)) throw Error(`string len ${r} greater than remaining buf len.`);
    let o = hs(V, e, e + r);
    return ((P = s + r), o);
  }
  function Zo(e, t) {
    e += 1;
    let r = [];
    for (let s = e; e < t;) {
      if (V[e] === 255) {
        let f = Re(r.length);
        return (f.set(r, 0), (P = e - s + 2), hs(f, 0, f.length));
      }
      let o = (V[e] & 224) >> 5,
        a = V[e] & 31;
      if (o !== fe) throw Error(`unexpected major type ${o} in indefinite string.`);
      if (a === Pt) throw Error("nested indefinite string.");
      let c = zt(e, t);
      e += P;
      for (let f = 0; f < c.length; ++f) r.push(c[f]);
    }
    throw Error("expected break marker.");
  }
  function zt(e, t) {
    let r = Le(e, t),
      s = P;
    if (((e += s), t - e < r))
      throw Error(`unstructured byte string len ${r} greater than remaining buf len.`);
    let chunk = V.subarray(e, e + r);
    return ((P = s + r), chunk);
  }
  function ea(e, t) {
    e += 1;
    let r = [];
    for (let s = e; e < t;) {
      if (V[e] === 255) {
        let f = Re(r.length);
        return (f.set(r, 0), (P = e - s + 2), f);
      }
      let o = (V[e] & 224) >> 5,
        a = V[e] & 31;
      if (o !== Ne) throw Error(`unexpected major type ${o} in indefinite string.`);
      if (a === Pt) throw Error("nested indefinite string.");
      let c = zt(e, t);
      e += P;
      for (let f = 0; f < c.length; ++f) r.push(c[f]);
    }
    throw Error("expected break marker.");
  }
  function ta(e, t) {
    let r = Le(e, t),
      s = P;
    e += s;
    let o = e,
      a = Array(r);
    for (let c = 0; c < r; ++c) {
      let d = le(e, t),
        f = P;
      ((a[c] = d), (e += f));
    }
    return ((P = s + (e - o)), a);
  }
  function ra(e, t) {
    e += 1;
    let r = [];
    for (let s = e; e < t;) {
      if (V[e] === 255) return ((P = e - s + 2), r);
      let o = le(e, t);
      ((e += P), r.push(o));
    }
    throw Error("expected break marker.");
  }
  function sa(e, t) {
    let r = Le(e, t),
      s = P;
    e += s;
    let o = e,
      a = {};
    for (let c = 0; c < r; ++c) {
      if (e >= t) throw Error("unexpected end of map payload.");
      let d = (V[e] & 224) >> 5;
      if (d !== fe) throw Error(`unexpected major type ${d} for map key at index ${e}.`);
      let f = le(e, t);
      e += P;
      let m = le(e, t);
      ((e += P), (a[f] = m));
    }
    return ((P = s + (e - o)), a);
  }
  function na(e, t) {
    e += 1;
    let r = e,
      s = {};
    for (; e < t;) {
      if (e >= t) throw Error("unexpected end of map payload.");
      if (V[e] === 255) return ((P = e - r + 2), s);
      let o = (V[e] & 224) >> 5;
      if (o !== fe) throw Error(`unexpected major type ${o} for map key.`);
      let a = le(e, t);
      e += P;
      let c = le(e, t);
      ((e += P), (s[a] = c));
    }
    throw Error("expected break marker.");
  }
  function ia(e, t) {
    let r = V[e] & 31;
    switch (r) {
      case Ot:
      case ls:
        return ((P = 1), r === Ot);
      case ds:
        return ((P = 1), null);
      case Go:
        return ((P = 1), null);
      case Te:
        if (t - e < 3) throw Error("incomplete float16 at end of buf.");
        return ((P = 3), Yo(V[e + 1], V[e + 2]));
      case _e:
        if (t - e < 5) throw Error("incomplete float32 at end of buf.");
        return ((P = 5), dataView.getFloat32(e + 1));
      case pe:
        if (t - e < 9) throw Error("incomplete float64 at end of buf.");
        return ((P = 9), dataView.getFloat64(e + 1));
      default:
        throw Error(`unexpected minor value ${r}.`);
    }
  }
  function Rt(e) {
    if (typeof e === "number") return e;
    let t = Number(e);
    if (Number.MIN_SAFE_INTEGER <= t && t <= Number.MAX_SAFE_INTEGER) return t;
    return e;
  }
  var is = typeof Buffer < "u",
    oa = 2048,
    O = Re(oa),
    dataView_2 = new DataView(O.buffer, O.byteOffset, O.byteLength),
    R = 0;
  function It(e) {
    if (O.byteLength - R < e)
      if (R < 16000000) Mt(Math.max(O.byteLength * 4, O.byteLength + e));
      else Mt(O.byteLength + e + 16000000);
  }
  function os() {
    let e = Re(R);
    return (e.set(O.subarray(0, R), 0), (R = 0), e);
  }
  function Mt(e) {
    let t = O;
    if (((O = Re(e)), t))
      if (t.copy) t.copy(O, 0, 0, t.byteLength);
      else O.set(t, 0);
    dataView_2 = new DataView(O.buffer, O.byteOffset, O.byteLength);
  }
  function ae(e, t) {
    if (t < 24) O[R++] = (e << 5) | t;
    else if (t < 256) ((O[R++] = (e << 5) | 24), (O[R++] = t));
    else if (t < 65536) ((O[R++] = (e << 5) | Te), dataView_2.setUint16(R, t), (R += 2));
    else if (t < 4294967296) ((O[R++] = (e << 5) | _e), dataView_2.setUint32(R, t), (R += 4));
    else
      ((O[R++] = (e << 5) | pe), dataView_2.setBigUint64(R, typeof t === "bigint" ? t : BigInt(t)), (R += 8));
  }
  function aa(e) {
    let t = [e];
    while (t.length) {
      let r = t.pop();
      if ((It(typeof r === "string" ? r.length * 4 : 64), typeof r === "string")) {
        if (is) (ae(fe, Buffer.byteLength(r)), (R += O.write(r, R)));
        else {
          let fromUtf8 = as.fromUtf8(r);
          (ae(fe, fromUtf8.byteLength), O.set(fromUtf8, R), (R += fromUtf8.byteLength));
        }
        continue;
      } else if (typeof r === "number") {
        if (Number.isInteger(r)) {
          let s = r >= 0,
            o = s ? Ye : Je,
            a = s ? r : -r - 1;
          if (a < 24) O[R++] = (o << 5) | a;
          else if (a < 256) ((O[R++] = (o << 5) | 24), (O[R++] = a));
          else if (a < 65536) ((O[R++] = (o << 5) | Te), (O[R++] = a >> 8), (O[R++] = a));
          else if (a < 4294967296) ((O[R++] = (o << 5) | _e), dataView_2.setUint32(R, a), (R += 4));
          else ((O[R++] = (o << 5) | pe), dataView_2.setBigUint64(R, BigInt(a)), (R += 8));
          continue;
        }
        ((O[R++] = (At << 5) | pe), dataView_2.setFloat64(R, r), (R += 8));
        continue;
      } else if (typeof r === "bigint") {
        let s = r >= 0,
          o = s ? Ye : Je,
          a = s ? r : -r - BigInt(1),
          c = Number(a);
        if (c < 24) O[R++] = (o << 5) | c;
        else if (c < 256) ((O[R++] = (o << 5) | 24), (O[R++] = c));
        else if (c < 65536) ((O[R++] = (o << 5) | Te), (O[R++] = c >> 8), (O[R++] = c & 255));
        else if (c < 4294967296) ((O[R++] = (o << 5) | _e), dataView_2.setUint32(R, c), (R += 4));
        else if (a < BigInt("18446744073709551616"))
          ((O[R++] = (o << 5) | pe), dataView_2.setBigUint64(R, a), (R += 8));
        else {
          let str = a.toString(2),
            uint8Array = new Uint8Array(Math.ceil(str.length / 8)),
            m = a,
            y = 0;
          while (uint8Array.byteLength - ++y >= 0)
            ((uint8Array[uint8Array.byteLength - y] = Number(m & BigInt(255))), (m >>= BigInt(8)));
          if ((It(uint8Array.byteLength * 2), (O[R++] = s ? 194 : 195), is))
            ae(Ne, Buffer.byteLength(uint8Array));
          else ae(Ne, uint8Array.byteLength);
          (O.set(uint8Array, R), (R += uint8Array.byteLength));
        }
        continue;
      } else if (r === null) {
        O[R++] = (At << 5) | ds;
        continue;
      } else if (typeof r === "boolean") {
        O[R++] = (At << 5) | (r ? Ot : ls);
        continue;
      } else if (typeof r > "u") throw Error("@smithy/core/cbor: client may not serialize undefined value.");
      else if (Array.isArray(r)) {
        for (let s = r.length - 1; s >= 0; --s) t.push(r[s]);
        ae(ze, r.length);
        continue;
      } else if (typeof r.byteLength === "number") {
        (It(r.length * 2), ae(Ne, r.length), O.set(r, R), (R += r.byteLength));
        continue;
      } else if (typeof r === "object") {
        if (r instanceof Ze.NumericValue) {
          let index = r.string.indexOf("."),
            a = index === -1 ? 0 : index - r.string.length + 1,
            c = BigInt(r.string.replace(".", ""));
          ((O[R++] = 196), t.push(c), t.push(a), ae(ze, 2));
          continue;
        }
        if (r[kt])
          if ("tag" in r && "value" in r) {
            (t.push(r.value), ae(us, r.tag));
            continue;
          } else
            throw Error(
              "tag encountered with missing fields, need 'tag' and 'value', found: " + JSON.stringify(r),
            );
        let keys = Object.keys(r);
        for (let o = keys.length - 1; o >= 0; --o) {
          let a = keys[o];
          (t.push(r[a]), t.push(a));
        }
        ae(Ke, keys.length);
        continue;
      }
      throw Error(`data type ${r?.constructor?.name ?? typeof r} not compatible for encoding.`);
    }
  }
  var et = {
      deserialize(e) {
        return (Ko(e), le(0, e.length));
      },
      serialize(e) {
        try {
          return (aa(e), os());
        } catch (error) {
          throw (os(), error);
        }
      },
      resizeEncodingBuffer(e) {
        Mt(e);
      },
    },
    ps = (e, t) =>
      $e.collectBody(e, t).then(async (r) => {
        if (r.length)
          try {
            return et.deserialize(r);
          } catch (error) {
            throw (Object.defineProperty(error, "$responseBodyText", { value: t.utf8Encoder(r) }), error);
          }
        return {};
      }),
    Qe = (e) => vt({ tag: 1, value: e.getTime() / 1000 }),
    ca = async (e, t) => {
      let r = await ps(e, t);
      return ((r.message = r.message ?? r.Message), r);
    },
    ms = (e, t) => {
      let r = (o) => {
        let a = o;
        if (typeof a === "number") a = a.toString();
        if (a.indexOf(",") >= 0) a = a.split(",")[0];
        if (a.indexOf(":") >= 0) a = a.split(":")[0];
        if (a.indexOf("#") >= 0) a = a.split("#")[1];
        return a;
      };
      if (t.__type !== void 0) return r(t.__type);
      let found = Object.keys(t).find((o) => o.toLowerCase() === "code");
      if (found && t[found] !== void 0) return r(t[found]);
    },
    ua = (e) => {
      if (String(e.headers["smithy-protocol"]).toLowerCase() !== "rpc-v2-cbor")
        throw Error("Malformed RPCv2 CBOR response, status: " + e.statusCode);
    },
    la = async (e, t, r, s, o) => {
      let { hostname: hostname, protocol: protocol = "https", port: port, path: path } = await e.endpoint(),
        m = {
          protocol: protocol,
          hostname: hostname,
          port: port,
          method: "POST",
          path: path.endsWith("/") ? path.slice(0, -1) + r : path + r,
          headers: { ...t },
        };
      if (s !== void 0) m.hostname = s;
      if (o !== void 0) {
        m.body = o;
        try {
          m.headers["content-length"] = String(qo.calculateBodyLength(o));
        } catch (error) {}
      }
      return new jo.HttpRequest(m);
    };
  class $t extends $e.SerdeContext {
    createSerializer() {
      let e = new Bt();
      return (e.setSerdeContext(this.serdeContext), e);
    }
    createDeserializer() {
      let e = new Lt();
      return (e.setSerdeContext(this.serdeContext), e);
    }
  }
  class Bt extends $e.SerdeContext {
    value;
    write(e, t) {
      this.value = this.serialize(e, t);
    }
    serialize(e, t) {
      let of = Ae.NormalizedSchema.of(e);
      if (t == null) {
        if (of.isIdempotencyToken()) return Ze.generateIdempotencyToken();
        return t;
      }
      if (of.isBlobSchema()) {
        if (typeof t === "string") return (this.serdeContext?.base64Decoder ?? cs.fromBase64)(t);
        return t;
      }
      if (of.isTimestampSchema()) {
        if (typeof t === "number" || typeof t === "bigint") return Qe(new Date((Number(t) / 1000) | 0));
        return Qe(t);
      }
      if (typeof t === "function" || typeof t === "object") {
        let s = t;
        if (of.isListSchema() && Array.isArray(s)) {
          let a = !!of.getMergedTraits().sparse,
            c = [],
            d = 0;
          for (let f of s) {
            let serialize = this.serialize(of.getValueSchema(), f);
            if (serialize != null || a) c[d++] = serialize;
          }
          return c;
        }
        if (s instanceof Date) return Qe(s);
        let o = {};
        if (of.isMapSchema()) {
          let a = !!of.getMergedTraits().sparse;
          for (let c of Object.keys(s)) {
            let serialize = this.serialize(of.getValueSchema(), s[c]);
            if (serialize != null || a) o[c] = serialize;
          }
        } else if (of.isStructSchema())
          for (let [a, c] of of.structIterator()) {
            let serialize = this.serialize(c, s[a]);
            if (serialize != null) o[a] = serialize;
          }
        else if (of.isDocumentSchema())
          for (let a of Object.keys(s)) o[a] = this.serialize(of.getValueSchema(), s[a]);
        return o;
      }
      return t;
    }
    flush() {
      let serialize = et.serialize(this.value);
      return ((this.value = void 0), serialize);
    }
  }
  class Lt extends $e.SerdeContext {
    read(e, t) {
      let deserialize = et.deserialize(t);
      return this.readValue(e, deserialize);
    }
    readValue(e, t) {
      let of = Ae.NormalizedSchema.of(e);
      if (of.isTimestampSchema() && typeof t === "number") return Ze._parseEpochTimestamp(t);
      if (of.isBlobSchema()) {
        if (typeof t === "string") return (this.serdeContext?.base64Decoder ?? cs.fromBase64)(t);
        return t;
      }
      if (
        typeof t > "u" ||
        typeof t === "boolean" ||
        typeof t === "number" ||
        typeof t === "string" ||
        typeof t === "bigint" ||
        typeof t === "symbol"
      )
        return t;
      else if (typeof t === "function" || typeof t === "object") {
        if (t === null) return null;
        if ("byteLength" in t) return t;
        if (t instanceof Date) return t;
        if (of.isDocumentSchema()) return t;
        if (of.isListSchema()) {
          let o = [],
            valueSchema = of.getValueSchema(),
            c = !!of.getMergedTraits().sparse;
          for (let d of t) {
            let f = this.readValue(valueSchema, d);
            if (f != null || c) o.push(f);
          }
          return o;
        }
        let s = {};
        if (of.isMapSchema()) {
          let o = !!of.getMergedTraits().sparse,
            valueSchema = of.getValueSchema();
          for (let c of Object.keys(t)) {
            let d = this.readValue(valueSchema, t[c]);
            if (d != null || o) s[c] = d;
          }
        } else if (of.isStructSchema())
          for (let [o, a] of of.structIterator()) {
            let c = this.readValue(a, t[o]);
            if (c != null) s[o] = c;
          }
        return s;
      } else return t;
    }
  }
  class gs extends $e.RpcProtocol {
    codec = new $t();
    serializer = this.codec.createSerializer();
    deserializer = this.codec.createDeserializer();
    constructor({ defaultNamespace: e }) {
      super({ defaultNamespace: e });
    }
    getShapeId() {
      return "smithy.protocols#rpcv2Cbor";
    }
    getPayloadCodec() {
      return this.codec;
    }
    async serializeRequest(e, t, r) {
      let serializeRequest = await super.serializeRequest(e, t, r);
      if (
        (Object.assign(serializeRequest.headers, {
          "content-type": this.getDefaultContentType(),
          "smithy-protocol": "rpc-v2-cbor",
          accept: this.getDefaultContentType(),
        }),
        Ae.deref(e.input) === "unit")
      )
        (delete serializeRequest.body, delete serializeRequest.headers["content-type"]);
      else {
        if (!serializeRequest.body)
          (this.serializer.write(15, {}), (serializeRequest.body = this.serializer.flush()));
        try {
          serializeRequest.headers["content-length"] = String(serializeRequest.body.byteLength);
        } catch (error) {}
      }
      let { service: service, operation: operation } = Ho.getSmithyContext(r),
        c = `/service/${service}/operation/${operation}`;
      if (serializeRequest.path.endsWith("/")) serializeRequest.path += c.slice(1);
      else serializeRequest.path += c;
      return serializeRequest;
    }
    async deserializeResponse(e, t, r) {
      return super.deserializeResponse(e, t, r);
    }
    async handleError(e, t, r, s, o) {
      let a = ms(r, s) ?? "Unknown",
        defaultNamespace = this.options.defaultNamespace;
      if (a.includes("#")) [defaultNamespace] = a.split("#");
      let d = { $metadata: o, $fault: r.statusCode <= 500 ? "client" : "server" },
        f = Ae.TypeRegistry.for(defaultNamespace),
        m;
      try {
        m = f.getSchema(a);
      } catch (error) {
        if (s.Message) s.message = s.Message;
        let F = Ae.TypeRegistry.for("smithy.ts.sdk.synthetic." + defaultNamespace),
          baseException = F.getBaseException();
        if (baseException) {
          let errorCtor = F.getErrorCtor(baseException);
          throw Object.assign(new errorCtor({ name: a }), d, s);
        }
        throw Object.assign(Error(a), d, s);
      }
      let of = Ae.NormalizedSchema.of(m),
        errorCtor = f.getErrorCtor(m),
        b = s.message ?? s.Message ?? "Unknown",
        T = new errorCtor(b),
        _ = {};
      for (let [I, F] of of.structIterator()) _[I] = this.deserializer.readValue(F, s[I]);
      throw Object.assign(T, d, { $fault: of.getMergedTraits().error, message: b }, _);
    }
    getDefaultContentType() {
      return "application/cbor";
    }
  }
  da.CborCodec = $t;
  da.CborShapeDeserializer = Lt;
  da.CborShapeSerializer = Bt;
  da.SmithyRpcV2CborProtocol = gs;
  da.buildHttpRpcRequest = la;
  da.cbor = et;
  da.checkCborResponse = ua;
  da.dateToTag = Qe;
  da.loadSmithyRpcV2CborErrorCode = ms;
  da.parseCborBody = ps;
  da.parseCborErrorBody = ca;
  da.tag = vt;
  da.tagSymbol = kt;
});

export { Ut };
