/**
 * @bufbuild/cel/dist/cjs/object.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { li } from "../../../protobuf/dist/commonjs/index.js";
import { Bi } from "./uint.js";
import { wa } from "./value.js";
import { ld } from "./eval.js";
import { ba } from "../../../protobuf/dist/commonjs/reflect/index.js";
import { $o } from "./list.js";
import { Aa } from "./map.js";
import { Os, hy } from "../../../../@anthropic-ai/bedrock-sdk/core/error.js";
import { Ei } from "./type.js";

//@ chunk-fq0cr76a.js:611599-617423 cjs-fingerprint
var fF = x(function (dF) {
  Object.defineProperty(dF, "__esModule", { value: !0 });
  dF.celObject = sae;
  var tn = li(),
    Id = Bi(),
    oF = wa(),
    aF = ld(),
    $r = ba(),
    Vl = $o(),
    Wl = Aa(),
    pt = Os(),
    lF = hy(),
    cF = Ei(),
    Rd = hy();
  function sae(e, n) {
    let msgDesc = aF.getMsgDesc(e),
      reflect = $r.reflect(msgDesc);
    for (let [h, y] of n.entries()) {
      let found = msgDesc.fields.find((field) => field.name === h);
      if (found === void 0) throw Error(`Unknown field ${h} for ${e}`);
      iae(reflect, found, y);
    }
    return oF.reflectMsgToCel(reflect);
  }
  function iae(e, n, r) {
    switch (n.fieldKind) {
      case "list":
        if (!Vl.isCelList(r)) throw pi(n, "list", r);
        let reflectList = $r.reflectList(n, void 0, !1);
        (oae(reflectList, r), e.set(n, reflectList));
        return;
      case "map":
        if (!Wl.isCelMap(r)) throw pi(n, "map", r);
        let reflectMap = $r.reflectMap(n, void 0, !1);
        (aae(reflectMap, r), e.set(n, reflectMap));
        return;
      case "enum":
        e.set(n, cv(n, r));
        return;
      case "message":
        let y = uv(n, r);
        if (y !== null) e.set(n, y);
        return;
    }
    e.set(n, Cp(n, n.scalar, r));
  }
  function oae(e, n) {
    let field = e.field();
    for (let s of n)
      switch (field.listKind) {
        case "enum":
          e.add(cv(field, s));
          break;
        case "message":
          e.add(uv(field, s));
          break;
        case "scalar":
          e.add(Cp(field, field.scalar, s));
          break;
      }
  }
  function aae(e, n) {
    let field = e.field();
    for (let [s, h] of n.entries()) {
      let y = Cp(field, field.mapKey, s);
      switch (field.mapKind) {
        case "enum":
          e.set(y, cv(field, h));
          break;
        case "scalar":
          e.set(y, Cp(field, field.scalar, h));
          break;
        case "message":
          e.set(y, uv(field, h));
          break;
      }
    }
  }
  function cv(e, n) {
    if (typeof n !== "bigint") throw pi(e, "int", n);
    return uF(n);
  }
  function uv(e, n) {
    switch (e.message.typeName) {
      case pt.AnySchema.typeName:
        if ($r.isReflectMessage(n, pt.AnySchema)) return n;
        return $r.reflect(pt.AnySchema, lae(n));
      case pt.ValueSchema.typeName:
        return $r.reflect(pt.ValueSchema, dv(n));
      case pt.StructSchema.typeName:
        if (!Wl.isCelMap(n)) throw pi(e, "map", n);
        return $r.reflect(pt.StructSchema, pv(n));
      case pt.ListValueSchema.typeName:
        if (!Vl.isCelList(n)) throw pi(e, "list", n);
        return $r.reflect(pt.ListValueSchema, fv(n));
    }
    if (n === null) return null;
    if (pt.isWrapperDesc(e.message)) {
      let reflect = $r.reflect(e.message, void 0, !1);
      return (
        reflect.set(e.message.fields[0], Cp(e.message.fields[0], e.message.fields[0].scalar, n)),
        reflect
      );
    }
    if (!$r.isReflectMessage(n, e.message)) throw pi(e, e.message.typeName, n);
    return n;
  }
  function lae(e) {
    switch (typeof e) {
      case "string":
        return pt.anyPack(pt.StringValueSchema, tn.create(pt.StringValueSchema, { value: e }));
      case "boolean":
        return pt.anyPack(pt.BoolValueSchema, tn.create(pt.BoolValueSchema, { value: e }));
      case "bigint":
        return pt.anyPack(pt.Int64ValueSchema, tn.create(pt.Int64ValueSchema, { value: e }));
      case "number":
        return pt.anyPack(pt.DoubleValueSchema, tn.create(pt.DoubleValueSchema, { value: e }));
      default:
        switch (!0) {
          case e instanceof Uint8Array:
            return pt.anyPack(pt.BytesValueSchema, tn.create(pt.BytesValueSchema, { value: e }));
          case e == null:
            return pt.anyPack(
              pt.ValueSchema,
              tn.create(pt.ValueSchema, { kind: { case: "nullValue", value: pt.NullValue.NULL_VALUE } }),
            );
          case Vl.isCelList(e):
            return pt.anyPack(pt.ListValueSchema, fv(e));
          case Wl.isCelMap(e):
            return pt.anyPack(pt.StructSchema, pv(e));
          case Id.isCelUint(e):
            return pt.anyPack(pt.UInt64ValueSchema, tn.create(pt.UInt64ValueSchema, { value: e.value }));
          case $r.isReflectMessage(e):
            return pt.anyPack(e.desc, e.message);
          default:
            throw Error(`type cannot be converted ${pt.AnySchema}`);
        }
    }
  }
  function dv(e) {
    let create = tn.create(pt.ValueSchema);
    switch (typeof e) {
      case "string":
        create.kind = { case: "stringValue", value: e };
        break;
      case "boolean":
        create.kind = { case: "boolValue", value: e };
        break;
      case "bigint":
        if (e > BigInt(Number.MAX_SAFE_INTEGER) || e < BigInt(Number.MIN_SAFE_INTEGER))
          create.kind = { case: "stringValue", value: e.toString() };
        else create.kind = { case: "numberValue", value: Number(e) };
        break;
      case "number":
        if (Number.isNaN(e)) create.kind = { case: "stringValue", value: "NaN" };
        else if (e === Number.POSITIVE_INFINITY) create.kind = { case: "stringValue", value: "Infinity" };
        else if (e === Number.NEGATIVE_INFINITY) create.kind = { case: "stringValue", value: "-Infinity" };
        else create.kind = { case: "numberValue", value: Number(e) };
        break;
      default:
        switch (!0) {
          case e instanceof Uint8Array:
            create.kind = { case: "stringValue", value: lF.base64Encode(e) };
            break;
          case e == null:
            create.kind = { case: "nullValue", value: pt.NullValue.NULL_VALUE };
            break;
          case Vl.isCelList(e):
            create.kind = { case: "listValue", value: fv(e) };
            break;
          case Wl.isCelMap(e):
            create.kind = { case: "structValue", value: pv(e) };
            break;
          case Id.isCelUint(e):
            if (e.value > BigInt(Number.MAX_SAFE_INTEGER))
              create.kind = { case: "stringValue", value: e.value.toString() };
            else create.kind = { case: "numberValue", value: Number(e.value) };
            break;
          case $r.isReflectMessage(e):
            return tn.fromJson(pt.ValueSchema, tn.toJson(e.desc, e.message));
          default:
            throw Error(`type cannot be converted ${pt.ValueSchema}`);
        }
    }
    return create;
  }
  function fv(e) {
    let create = tn.create(pt.ListValueSchema);
    for (let r of e) create.values.push(dv(r));
    return create;
  }
  function pv(e) {
    let create = tn.create(pt.StructSchema);
    for (let [r, s] of e.entries()) {
      if (typeof r !== "string")
        throw Error(`Invalid key type: ${typeof r} for google.protobuf.Struct, expected string`);
      create.fields[r] = dv(s);
    }
    return create;
  }
  function Cp(e, n, r) {
    if (Id.isCelUint(r)) r = r.value;
    switch (n) {
      case tn.ScalarType.UINT32:
      case tn.ScalarType.FIXED32:
        if (typeof r !== "bigint") throw pi(e, "int", r);
        return cae(r);
      case tn.ScalarType.INT32:
      case tn.ScalarType.SINT32:
      case tn.ScalarType.SFIXED32:
        if (typeof r !== "bigint") throw pi(e, "int", r);
        return uF(r);
      case tn.ScalarType.UINT64:
      case tn.ScalarType.FIXED64:
      case tn.ScalarType.INT64:
      case tn.ScalarType.SINT64:
      case tn.ScalarType.SFIXED64:
        if (typeof r !== "bigint") throw pi(e, "int", r);
        return r;
      case tn.ScalarType.FLOAT:
        if (typeof r !== "number") throw pi(e, "double", r);
        return Math.fround(r);
      case tn.ScalarType.DOUBLE:
        if (typeof r !== "number") throw pi(e, "double", r);
        return r;
      case tn.ScalarType.STRING:
        if (typeof r !== "string") throw pi(e, "string", r);
        return r;
      case tn.ScalarType.BOOL:
        if (typeof r !== "boolean") throw pi(e, "bool", r);
        return r;
      case tn.ScalarType.BYTES:
        if (!(r instanceof Uint8Array)) throw pi(e, "bytes", r);
        return r;
    }
  }
  function pi(e, n, r) {
    return Error(`Expected ${n} but got ${cF.celType(r)} for ${e.parent}.${e.name}`);
  }
  function uF(e) {
    if (e < Rd.INT32_MIN || e > Rd.INT32_MAX) throw Error("int32 out of range");
    return Number(e);
  }
  function cae(e) {
    if (e < 0 || e > Rd.UINT32_MAX) throw Error("uint32 out of range");
    return Number(e);
  }
});

export { fF };
