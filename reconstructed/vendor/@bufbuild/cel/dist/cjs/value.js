/**
 * @bufbuild/cel/dist/cjs/value.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { Bi } from "./uint.js";
import { Aa } from "./map.js";
import { $o } from "./list.js";
import { ba } from "../../../protobuf/dist/commonjs/reflect/index.js";
import { li } from "../../../protobuf/dist/commonjs/index.js";
import { ld } from "./eval.js";
import { Os } from "../../../../@anthropic-ai/bedrock-sdk/core/error.js";
import { Ei } from "./type.js";

//@ chunk-fq0cr76a.js:473203-475393 cjs-fingerprint
var wa = x(function (DL) {
  Object.defineProperty(DL, "__esModule", { value: !0 });
  DL.toCel = OQ;
  DL.unwrapAny = PQ;
  DL.reflectMsgToCel = RL;
  var ud = Bi(),
    Pl = Aa(),
    dd = $o(),
    Fi = ba(),
    Ll = li(),
    fd = ld(),
    ys = Os(),
    CL = Ei();
  function OQ(e) {
    switch (typeof e) {
      case "bigint":
      case "boolean":
      case "number":
      case "string":
        return e;
      case "object":
        break;
      default:
        throw Error(`unsupported input ${typeof e}`);
    }
    switch (!0) {
      case e === null:
      case e instanceof Uint8Array:
      case dd.isCelList(e):
      case Pl.isCelMap(e):
      case ud.isCelUint(e):
      case CL.isCelType(e):
        return e;
    }
    if (BQ(e) || Fi.isReflectList(e)) return dd.celList(e);
    if (UQ(e) || Fi.isReflectMap(e)) return Pl.celMap(e);
    if (Ll.isMessage(e)) {
      let n = R_(e);
      if (n !== void 0) return n;
      return Fi.reflect(fd.getMsgDesc(e.$typeName), e);
    }
    if (Fi.isReflectMessage(e)) return RL(e);
    if (e.constructor.name === "Object") return Pl.celMap(new Map(Object.entries(e)));
    throw Error(`Unsupported input ${e}`);
  }
  function PQ(e) {
    if (!LQ(e)) return e;
    let anyUnpack = ys.anyUnpack(e.message, fd.getEvalContext().registry);
    if (anyUnpack === void 0) throw Error(`invalid Any or ${e.message.typeUrl} not found in registry`);
    let r = R_(anyUnpack);
    if (r !== void 0) return r;
    return Fi.reflect(fd.getMsgDesc(anyUnpack.$typeName), anyUnpack);
  }
  function RL(e) {
    let n = R_(e.message);
    if (n !== void 0) return n;
    return e;
  }
  function LQ(e) {
    return Fi.isReflectMessage(e, ys.AnySchema);
  }
  function BQ(e) {
    return Array.isArray(e);
  }
  function UQ(e) {
    return e instanceof Map;
  }
  function R_(e) {
    if (ys.isWrapper(e)) return FQ(e);
    return MQ(e);
  }
  function FQ(e) {
    switch (e.$typeName) {
      case ys.Int32ValueSchema.typeName:
        return BigInt(e.value);
      case ys.UInt32ValueSchema.typeName:
        return ud.celUint(BigInt(e.value));
      case ys.UInt64ValueSchema.typeName:
        return ud.celUint(e.value);
    }
    return e.value;
  }
  function MQ(e) {
    switch (!0) {
      case Ll.isMessage(e, ys.StructSchema):
        return IL(e);
      case Ll.isMessage(e, ys.ValueSchema):
        return NL(e);
      case Ll.isMessage(e, ys.ListValueSchema):
        return kL(e);
    }
    return;
  }
  function IL(e) {
    let n = new Map();
    for (let [r, s] of Object.entries(e.fields)) n.set(r, NL(s));
    return Pl.celMap(n);
  }
  function NL(e) {
    switch (e.kind.case) {
      case "boolValue":
      case "numberValue":
      case "stringValue":
        return e.kind.value;
      case "nullValue":
      case void 0:
        return null;
      case "structValue":
        return IL(e.kind.value);
      case "listValue":
        return kL(e.kind.value);
    }
  }
  function kL(e) {
    return dd.celList(e.values);
  }
});

export { wa };
