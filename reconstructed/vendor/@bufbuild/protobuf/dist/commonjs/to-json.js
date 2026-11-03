/**
 * @bufbuild/protobuf/dist/commonjs/to-json.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { Ns } from "../cjs/descriptors.js";
import { Ec } from "../cjs/reflect/names.js";
import { Po } from "../cjs/reflect/reflect.js";
import { Os, hy } from "../../../../@anthropic-ai/bedrock-sdk/core/error.js";
import { Fu } from "../cjs/wkt/wrappers.js";
import { gp } from "./extensions.js";
import { Dg } from "../cjs/reflect/reflect-check.js";

//@ chunk-fq0cr76a.js:449273-456071 cjs-fingerprint
var UP = x(function (LP) {
  Object.defineProperty(LP, "__esModule", { value: !0 });
  LP.toJson = kP;
  LP.toJsonString = vJ;
  LP.enumToJson = wJ;
  var or = Ns(),
    rd = Ec(),
    gy = Po(),
    IP = Os(),
    yy = Fu(),
    NP = hy(),
    my = gp(),
    ai = Dg(),
    EJ = 3,
    xJ = 2,
    CP = { alwaysEmitImplicit: !1, enumAsInteger: !1, useProtoFieldName: !1 };
  function _J(e) {
    return e ? Object.assign(Object.assign({}, CP), e) : CP;
  }
  function kP(e, n, r) {
    return bp(gy.reflect(e, n), _J(r));
  }
  function vJ(e, n, r) {
    var s;
    let h = kP(e, n, r);
    return JSON.stringify(
      h,
      null,
      (s = r === null || r === void 0 ? void 0 : r.prettySpaces) !== null && s !== void 0 ? s : 0,
    );
  }
  function wJ(e, n) {
    var r;
    if (e.typeName == "google.protobuf.NullValue") return null;
    let s = (r = e.value[n]) === null || r === void 0 ? void 0 : r.name;
    if (s === void 0) throw Error(`${n} is not a value in ${e}`);
    return s;
  }
  function bp(e, n) {
    var r;
    let s = DP(e, n);
    if (s !== void 0) return s;
    let h = {};
    for (let sortedField of e.sortedFields) {
      if (!e.isSet(sortedField)) {
        if (sortedField.presence == EJ)
          throw Error(`cannot encode ${sortedField} to JSON: required field not set`);
        if (!n.alwaysEmitImplicit || sortedField.presence !== xJ) continue;
      }
      let b = RP(sortedField, e.get(sortedField), n);
      if (b !== void 0) h[CJ(sortedField, n)] = b;
    }
    if (n.registry) {
      let y = new Set();
      for (let { no: no } of (r = e.getUnknown()) !== null && r !== void 0 ? r : [])
        if (!y.has(no)) {
          y.add(no);
          let extensionFor = n.registry.getExtensionFor(e.desc, no);
          if (!extensionFor) continue;
          let extension = my.getExtension(e.message, extensionFor),
            [R, D] = my.createExtensionContainer(extensionFor, extension),
            O = RP(D, R.get(D), n);
          if (O !== void 0) h[extensionFor.jsonName] = O;
        }
    }
    return h;
  }
  function RP(e, n, r) {
    switch (e.fieldKind) {
      case "scalar":
        return by(e, n);
      case "message":
        return bp(n, r);
      case "enum":
        return x_(e.enum, n, r.enumAsInteger);
      case "list":
        return AJ(n, r);
      case "map":
        return TJ(n, r);
    }
  }
  function TJ(e, n) {
    let field = e.field(),
      s = {};
    switch (field.mapKind) {
      case "scalar":
        for (let [h, y] of e) s[h] = by(field, y);
        break;
      case "message":
        for (let [h, y] of e) s[h] = bp(y, n);
        break;
      case "enum":
        for (let [h, y] of e) s[h] = x_(field.enum, y, n.enumAsInteger);
        break;
    }
    return n.alwaysEmitImplicit || e.size > 0 ? s : void 0;
  }
  function AJ(e, n) {
    let field = e.field(),
      s = [];
    switch (field.listKind) {
      case "scalar":
        for (let h of e) s.push(by(field, h));
        break;
      case "enum":
        for (let h of e) s.push(x_(field.enum, h, n.enumAsInteger));
        break;
      case "message":
        for (let h of e) s.push(bp(h, n));
        break;
    }
    return n.alwaysEmitImplicit || s.length > 0 ? s : void 0;
  }
  function x_(e, n, r) {
    var s;
    if (typeof n != "number")
      throw Error(`cannot encode ${e} to JSON: expected number, got ${ai.formatVal(n)}`);
    if (e.typeName == "google.protobuf.NullValue") return null;
    if (r) return n;
    let h = e.value[n];
    return (s = h === null || h === void 0 ? void 0 : h.name) !== null && s !== void 0 ? s : n;
  }
  function by(e, n) {
    var r, s, h, y, b, S;
    switch (e.scalar) {
      case or.ScalarType.INT32:
      case or.ScalarType.SFIXED32:
      case or.ScalarType.SINT32:
      case or.ScalarType.FIXED32:
      case or.ScalarType.UINT32:
        if (typeof n != "number")
          throw Error(
            `cannot encode ${e} to JSON: ${(r = ai.checkField(e, n)) === null || r === void 0 ? void 0 : r.message}`,
          );
        return n;
      case or.ScalarType.FLOAT:
      case or.ScalarType.DOUBLE:
        if (typeof n != "number")
          throw Error(
            `cannot encode ${e} to JSON: ${(s = ai.checkField(e, n)) === null || s === void 0 ? void 0 : s.message}`,
          );
        if (Number.isNaN(n)) return "NaN";
        if (n === Number.POSITIVE_INFINITY) return "Infinity";
        if (n === Number.NEGATIVE_INFINITY) return "-Infinity";
        return n;
      case or.ScalarType.STRING:
        if (typeof n != "string")
          throw Error(
            `cannot encode ${e} to JSON: ${(h = ai.checkField(e, n)) === null || h === void 0 ? void 0 : h.message}`,
          );
        return n;
      case or.ScalarType.BOOL:
        if (typeof n != "boolean")
          throw Error(
            `cannot encode ${e} to JSON: ${(y = ai.checkField(e, n)) === null || y === void 0 ? void 0 : y.message}`,
          );
        return n;
      case or.ScalarType.UINT64:
      case or.ScalarType.FIXED64:
      case or.ScalarType.INT64:
      case or.ScalarType.SFIXED64:
      case or.ScalarType.SINT64:
        if (typeof n == "bigint" || typeof n == "string" || (typeof n == "number" && Number.isInteger(n)))
          return n.toString();
        throw Error(
          `cannot encode ${e} to JSON: ${(b = ai.checkField(e, n)) === null || b === void 0 ? void 0 : b.message}`,
        );
      case or.ScalarType.BYTES:
        if (n instanceof Uint8Array) return NP.base64Encode(n);
        throw Error(
          `cannot encode ${e} to JSON: ${(S = ai.checkField(e, n)) === null || S === void 0 ? void 0 : S.message}`,
        );
    }
  }
  function CJ(e, n) {
    return n.useProtoFieldName ? e.name : e.jsonName;
  }
  function DP(e, n) {
    if (!e.desc.typeName.startsWith("google.protobuf.")) return;
    switch (e.desc.typeName) {
      case "google.protobuf.Any":
        return RJ(e.message, n);
      case "google.protobuf.Timestamp":
        return kJ(e.message);
      case "google.protobuf.Duration":
        return IJ(e.message);
      case "google.protobuf.FieldMask":
        return NJ(e.message);
      case "google.protobuf.Struct":
        return OP(e.message);
      case "google.protobuf.Value":
        return __(e.message);
      case "google.protobuf.ListValue":
        return PP(e.message);
      default:
        if (yy.isWrapperDesc(e.desc)) {
          let r = e.desc.fields[0];
          return by(r, e.get(r));
        }
        return;
    }
  }
  function RJ(e, n) {
    if (e.typeUrl === "") return {};
    let { registry: registry } = n,
      s,
      h;
    if (registry) {
      if (((s = IP.anyUnpack(e, registry)), s)) h = registry.getMessage(s.$typeName);
    }
    if (!h || !s)
      throw Error(`cannot encode message ${e.$typeName} to JSON: "${e.typeUrl}" is not in the type registry`);
    let reflect = gy.reflect(h, s),
      b = yy.hasCustomJsonRepresentation(h) ? { value: DP(reflect, n) } : bp(reflect, n);
    return ((b["@type"] = e.typeUrl), b);
  }
  function IJ(e) {
    let n = Number(e.seconds),
      nanos = e.nanos;
    if (n > 315576000000 || n < -315576000000)
      throw Error(`cannot encode message ${e.$typeName} to JSON: value out of range`);
    if ((n > 0 && nanos < 0) || (n < 0 && nanos > 0))
      throw Error(`cannot encode message ${e.$typeName} to JSON: nanos sign must match seconds sign`);
    let str = e.seconds.toString();
    if (nanos !== 0) {
      let str_2 = Math.abs(nanos).toString();
      if (((str_2 = "0".repeat(9 - str_2.length) + str_2), str_2.substring(3) === "000000"))
        str_2 = str_2.substring(0, 3);
      else if (str_2.substring(6) === "000") str_2 = str_2.substring(0, 6);
      if (((str += "." + str_2), nanos < 0 && n == 0)) str = "-" + str;
    }
    return str + "s";
  }
  function NJ(e) {
    return e.paths
      .map((path) => {
        if (rd.protoSnakeCase(rd.protoCamelCase(path)) !== path)
          throw Error(
            `cannot encode message ${e.$typeName} to JSON: lowerCamelCase of path name "${path}" is irreversible`,
          );
        return rd.protoCamelCase(path);
      })
      .join(",");
  }
  function OP(e) {
    let n = {};
    for (let [r, s] of Object.entries(e.fields)) n[r] = __(s);
    return n;
  }
  function __(e) {
    switch (e.kind.case) {
      case "nullValue":
        return null;
      case "numberValue":
        if (!Number.isFinite(e.kind.value)) throw Error(`${e.$typeName} cannot be NaN or Infinity`);
        return e.kind.value;
      case "boolValue":
        return e.kind.value;
      case "stringValue":
        return e.kind.value;
      case "structValue":
        return OP(e.kind.value);
      case "listValue":
        return PP(e.kind.value);
      default:
        throw Error(`${e.$typeName} must have a value`);
    }
  }
  function PP(e) {
    return e.values.map(__);
  }
  function kJ(e) {
    let n = Number(e.seconds) * 1000;
    if (n < Date.parse("0001-01-01T00:00:00Z") || n > Date.parse("9999-12-31T23:59:59Z"))
      throw Error(
        `cannot encode message ${e.$typeName} to JSON: must be from 0001-01-01T00:00:00Z to 9999-12-31T23:59:59Z inclusive`,
      );
    if (e.nanos < 0) throw Error(`cannot encode message ${e.$typeName} to JSON: nanos must not be negative`);
    if (e.nanos > 999999999)
      throw Error(`cannot encode message ${e.$typeName} to JSON: nanos must not be greater than 99999999`);
    let r = "Z";
    if (e.nanos > 0) {
      let substring = (e.nanos + 1e9).toString().substring(1);
      if (substring.substring(3) === "000000") r = "." + substring.substring(0, 3) + "Z";
      else if (substring.substring(6) === "000") r = "." + substring.substring(0, 6) + "Z";
      else r = "." + substring + "Z";
    }
    return new Date(n).toISOString().replace(".000Z", r);
  }
});

export { UP };
