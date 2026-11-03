/**
 * @bufbuild/cel/dist/cjs/type.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { $o } from "./list.js";
import { Aa } from "./map.js";
import { Bi } from "./uint.js";
import { ba } from "../../../protobuf/dist/commonjs/reflect/index.js";
import { Os } from "../../../../@anthropic-ai/bedrock-sdk/core/error.js";

//@ chunk-fq0cr76a.js:470154-473203 cjs-fingerprint
var Ei = x(function (vL) {
  Object.defineProperty(vL, "__esModule", { value: !0 });
  vL.DURATION = vL.TIMESTAMP = vL.CelScalar = void 0;
  vL.mapType = Ty;
  vL.listType = Ay;
  vL.objectType = xp;
  vL.celType = EQ;
  vL.isCelType = xQ;
  vL.isObjectCelType = C_;
  var SL = $o(),
    EL = Aa(),
    xL = Bi(),
    _L = ba(),
    Wn = Os(),
    _p = Symbol.for("@bufbuild/cel/type");
  vL.CelScalar = {
    INT: Ta("int"),
    UINT: Ta("uint"),
    BOOL: Ta("bool"),
    STRING: Ta("string"),
    BYTES: Ta("bytes"),
    DOUBLE: Ta("double"),
    NULL: Ta("null_type"),
    DYN: Ta("dyn"),
    TYPE: Ta("type"),
  };
  vL.TIMESTAMP = xp(Wn.TimestampSchema);
  vL.DURATION = xp(Wn.DurationSchema);
  function Ty(e, n) {
    return {
      [_p]: {},
      kind: "map",
      key: e,
      value: n,
      name: "map",
      toString() {
        return `map(${e}, ${n})`;
      },
    };
  }
  function Ay(e) {
    return {
      [_p]: {},
      kind: "list",
      element: e,
      name: "list",
      toString() {
        return `list(${e})`;
      },
    };
  }
  function xp(e) {
    let n, r;
    if (typeof e === "string") ((n = e), (r = void 0));
    else ((n = e.typeName), (r = e));
    return {
      [_p]: {},
      kind: "object",
      desc: r,
      name: n,
      toString() {
        return n;
      },
    };
  }
  function Ta(e) {
    return {
      [_p]: {},
      kind: "scalar",
      scalar: e,
      name: e,
      toString() {
        return e;
      },
    };
  }
  function EQ(e) {
    switch (typeof e) {
      case "bigint":
        return vL.CelScalar.INT;
      case "boolean":
        return vL.CelScalar.BOOL;
      case "number":
        return vL.CelScalar.DOUBLE;
      case "string":
        return vL.CelScalar.STRING;
      case "object":
        switch (!0) {
          case e === null:
            return vL.CelScalar.NULL;
          case e instanceof Uint8Array:
            return vL.CelScalar.BYTES;
          case _L.isReflectMessage(e):
            return _Q(e);
          case SL.isCelList(e):
            return Ay(vL.CelScalar.DYN);
          case EL.isCelMap(e):
            return Ty(vL.CelScalar.DYN, vL.CelScalar.DYN);
          case xL.isCelUint(e):
            return vL.CelScalar.UINT;
          default:
            if (C_(e)) return vL.CelScalar.TYPE;
        }
    }
    throw Error(`Not a CEL value: ${e}`);
  }
  function xQ(e) {
    return typeof e === "object" && e !== null && C_(e);
  }
  function C_(e) {
    return _p in e;
  }
  function _Q(e) {
    let typeName = e.desc.typeName;
    if (wQ(e)) {
      if (((typeName = TQ(e.message.typeUrl)), typeName === Wn.ValueSchema.typeName)) {
        let anyUnpack = Wn.anyUnpack(e.message, Wn.ValueSchema);
        return anyUnpack ? bL(anyUnpack) : vL.CelScalar.NULL;
      }
    }
    switch (typeName) {
      case Wn.FloatValueSchema.typeName:
      case Wn.DoubleValueSchema.typeName:
        return vL.CelScalar.DOUBLE;
      case Wn.UInt64ValueSchema.typeName:
      case Wn.UInt32ValueSchema.typeName:
        return vL.CelScalar.UINT;
      case Wn.Int32ValueSchema.typeName:
      case Wn.Int64ValueSchema.typeName:
        return vL.CelScalar.INT;
      case Wn.StringValueSchema.typeName:
        return vL.CelScalar.STRING;
      case Wn.BytesValueSchema.typeName:
        return vL.CelScalar.BYTES;
      case Wn.BoolValueSchema.typeName:
        return vL.CelScalar.BOOL;
      case Wn.StructSchema.typeName:
        return Ty(vL.CelScalar.STRING, vL.CelScalar.DYN);
      case Wn.ListValueSchema.typeName:
        return Ay(vL.CelScalar.DYN);
      case Wn.ValueSchema.typeName:
        return bL(e.message);
    }
    return typeName === e.desc.typeName ? xp(e.desc) : xp(typeName);
  }
  function bL(e) {
    switch (e.kind.case) {
      case "boolValue":
        return vL.CelScalar.BOOL;
      case "listValue":
        return Ay(vL.CelScalar.DYN);
      case "nullValue":
      case void 0:
        return vL.CelScalar.NULL;
      case "numberValue":
        return vL.CelScalar.DOUBLE;
      case "stringValue":
        return vL.CelScalar.STRING;
      case "structValue":
        return Ty(vL.CelScalar.STRING, vL.CelScalar.DYN);
    }
  }
  function wQ(e) {
    return e.desc.typeName === Wn.AnySchema.typeName;
  }
  function TQ(e) {
    let index = e.lastIndexOf("/"),
      r = index >= 0 ? e.substring(index + 1) : e;
    if (!r.length) throw Error(`invalid type url: ${e}`);
    return r;
  }
});

export { Ei };
