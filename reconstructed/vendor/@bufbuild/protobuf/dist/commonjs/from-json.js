/**
 * @bufbuild/protobuf/dist/commonjs/from-json.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { Ns } from "../cjs/descriptors.js";
import { ko } from "./proto-int64.js";
import { wl } from "../cjs/create.js";
import { Po } from "../cjs/reflect/reflect.js";
import { op } from "../cjs/reflect/error.js";
import { Dg } from "../cjs/reflect/reflect-check.js";
import { Ec } from "../cjs/reflect/names.js";
import { dp } from "../cjs/wire/base64-encoding.js";
import { Os } from "../../../../@anthropic-ai/bedrock-sdk/core/error.js";
import { gp } from "./extensions.js";

//@ chunk-fq0cr76a.js:456071-465470 cjs-require-graph
var JP = x(function (XP) {
  Object.defineProperty(XP, "__esModule", { value: !0 });
  XP.fromJsonString = LJ;
  XP.mergeFromJsonString = BJ;
  XP.fromJson = GP;
  XP.mergeFromJson = HP;
  XP.enumFromJson = UJ;
  XP.isEnumJson = FJ;
  var hr = Ns(),
    xy = ko(),
    Ol = wl(),
    Mo = Po(),
    gs = op(),
    vr = Dg(),
    $P = Ec(),
    VP = dp(),
    Ps = Os(),
    Sy = gp(),
    FP = { ignoreUnknownFields: !1 };
  function WP(e) {
    return e ? Object.assign(Object.assign({}, FP), e) : FP;
  }
  function LJ(e, n, r) {
    return GP(e, jP(n, e.typeName), r);
  }
  function BJ(e, n, r, s) {
    return HP(e, n, jP(r, e.typeName), s);
  }
  function GP(e, n, r) {
    let reflect = Mo.reflect(e);
    try {
      sd(reflect, n, WP(r));
    } catch (error) {
      if (gs.isFieldError(error))
        throw Error(`cannot decode ${error.field()} from JSON: ${error.message}`, { cause: error });
      throw error;
    }
    return reflect.message;
  }
  function HP(e, n, r, s) {
    try {
      sd(Mo.reflect(e, n), r, WP(s));
    } catch (error) {
      if (gs.isFieldError(error))
        throw Error(`cannot decode ${error.field()} from JSON: ${error.message}`, { cause: error });
      throw error;
    }
    return n;
  }
  function UJ(e, n) {
    return w_(e, n, !1);
  }
  function FJ(e, n) {
    return e.values.find((r) => r.name === n) !== void 0;
  }
  var weakMap = new WeakMap();
  function MJ(e, n) {
    var r;
    if (!weakMap.has(e)) {
      let s = new Map();
      for (let field of e.fields) s.set(field.name, field).set(field.jsonName, field);
      weakMap.set(e, s);
    }
    return (r = weakMap.get(e)) === null || r === void 0 ? void 0 : r.get(n);
  }
  function sd(e, n, r) {
    var s;
    if (qJ(e, n, r)) return;
    if (n == null || Array.isArray(n) || typeof n != "object")
      throw Error(`cannot decode ${e.desc} from JSON: ${vr.formatVal(n)}`);
    let h = new Map();
    for (let [y, b] of Object.entries(n)) {
      let S = MJ(e.desc, y);
      if (S) {
        if (S.oneof) {
          if (b === null && S.fieldKind == "scalar") continue;
          let w = h.get(S.oneof);
          if (w !== void 0)
            throw new gs.FieldError(S.oneof, `oneof set multiple times by ${w.name} and ${S.name}`);
          h.set(S.oneof, S);
        }
        MP(e, S, b, r);
      } else {
        let w = void 0;
        if (
          y.startsWith("[") &&
          y.endsWith("]") &&
          (w =
            (s = r.registry) === null || s === void 0
              ? void 0
              : s.getExtension(y.substring(1, y.length - 1))) &&
          w.extendee.typeName === e.desc.typeName
        ) {
          let [R, D, O] = Sy.createExtensionContainer(w);
          (MP(R, D, b, r), Sy.setExtension(e.message, w, O()));
        }
        if (!w && !r.ignoreUnknownFields)
          throw Error(`cannot decode ${e.desc} from JSON: key "${y}" is unknown`);
      }
    }
  }
  function MP(e, n, r, s) {
    switch (n.fieldKind) {
      case "scalar":
        HJ(e, n, r);
        break;
      case "enum":
        GJ(e, n, r, s);
        break;
      case "message":
        WJ(e, n, r, s);
        break;
      case "list":
        VJ(e.get(n), r, s);
        break;
      case "map":
        $J(e.get(n), r, s);
        break;
    }
  }
  function KP(e, n, r) {
    if (e.scalar && n !== null) return T_(e, n);
    if (e.message && !Ey(e, n)) {
      let reflect = Mo.reflect(e.message);
      return (sd(reflect, n, r), reflect);
    }
    if (e.enum && !Ey(e, n)) return w_(e.enum, n, r.ignoreUnknownFields);
    throw new gs.FieldError(e, `${e.fieldKind === "list" ? "list item" : "map value"} must not be null`);
  }
  function $J(e, n, r) {
    if (n === null) return;
    let field = e.field();
    if (typeof n != "object" || Array.isArray(n))
      throw new gs.FieldError(field, "expected object, got " + vr.formatVal(n));
    for (let [h, y] of Object.entries(n)) {
      let b = KJ(field.mapKey, h),
        S = KP(field, y, r);
      if (S !== _y) e.set(b, S);
    }
  }
  function VJ(e, n, r) {
    if (n === null) return;
    let field = e.field();
    if (!Array.isArray(n)) throw new gs.FieldError(field, "expected Array, got " + vr.formatVal(n));
    for (let h of n) {
      let y = KP(field, h, r);
      if (y !== _y) e.add(y);
    }
  }
  function WJ(e, n, r, s) {
    if (Ey(n, r)) {
      e.clear(n);
      return;
    }
    let h = e.isSet(n) ? e.get(n) : Mo.reflect(n.message);
    (sd(h, r, s), e.set(n, h));
  }
  function GJ(e, n, r, s) {
    if (Ey(n, r)) {
      e.clear(n);
      return;
    }
    let h = w_(n.enum, r, s.ignoreUnknownFields);
    if (h !== _y) e.set(n, h);
  }
  function HJ(e, n, r) {
    if (r === null) e.clear(n);
    else e.set(n, T_(n, r));
  }
  function Ey(e, n) {
    var r, s;
    return (
      n === null &&
      ((r = e.message) === null || r === void 0 ? void 0 : r.typeName) != "google.protobuf.Value" &&
      ((s = e.enum) === null || s === void 0 ? void 0 : s.typeName) != "google.protobuf.NullValue"
    );
  }
  var _y = Symbol();
  function w_(e, n, r) {
    if (n === null) return e.values[0].number;
    switch (typeof n) {
      case "number":
        if (Number.isInteger(n)) return n;
        break;
      case "string":
        let found = e.values.find((h) => h.name === n);
        if (found !== void 0) return found.number;
        if (r) return _y;
        break;
    }
    throw Error(`cannot decode ${e} from JSON: ${vr.formatVal(n)}`);
  }
  function T_(e, n) {
    switch (e.scalar) {
      case hr.ScalarType.DOUBLE:
      case hr.ScalarType.FLOAT:
        if (n === "NaN") return NaN;
        if (n === "Infinity") return Number.POSITIVE_INFINITY;
        if (n === "-Infinity") return Number.NEGATIVE_INFINITY;
        if (typeof n == "number") {
          if (Number.isNaN(n)) throw new gs.FieldError(e, "unexpected NaN number");
          if (!Number.isFinite(n)) throw new gs.FieldError(e, "unexpected infinite number");
          break;
        }
        if (typeof n == "string") {
          if (n === "") break;
          if (n.trim().length !== n.length) break;
          let r = Number(n);
          if (!Number.isFinite(r)) break;
          return r;
        }
        break;
      case hr.ScalarType.INT32:
      case hr.ScalarType.FIXED32:
      case hr.ScalarType.SFIXED32:
      case hr.ScalarType.SINT32:
      case hr.ScalarType.UINT32:
        return qP(n);
      case hr.ScalarType.BYTES:
        if (typeof n == "string") {
          if (n === "") return new Uint8Array(0);
          try {
            return VP.base64Decode(n);
          } catch (error) {
            let s = error instanceof Error ? error.message : String(error);
            throw new gs.FieldError(e, s);
          }
        }
        break;
    }
    return n;
  }
  function KJ(e, n) {
    switch (e) {
      case hr.ScalarType.BOOL:
        switch (n) {
          case "true":
            return !0;
          case "false":
            return !1;
        }
        return n;
      case hr.ScalarType.INT32:
      case hr.ScalarType.FIXED32:
      case hr.ScalarType.UINT32:
      case hr.ScalarType.SFIXED32:
      case hr.ScalarType.SINT32:
        return qP(n);
      default:
        return n;
    }
  }
  function qP(e) {
    if (typeof e == "string") {
      if (e === "") return e;
      if (e.trim().length !== e.length) return e;
      let n = Number(e);
      if (Number.isNaN(n)) return e;
      return n;
    }
    return e;
  }
  function jP(e, n) {
    try {
      return JSON.parse(e);
    } catch (error) {
      let s = error instanceof Error ? error.message : String(error);
      throw Error(`cannot decode message ${n} from JSON: ${s}`, { cause: error });
    }
  }
  function qJ(e, n, r) {
    if (!e.desc.typeName.startsWith("google.protobuf.")) return !1;
    switch (e.desc.typeName) {
      case "google.protobuf.Any":
        return (jJ(e.message, n, r), !0);
      case "google.protobuf.Timestamp":
        return (YJ(e.message, n), !0);
      case "google.protobuf.Duration":
        return (ZJ(e.message, n), !0);
      case "google.protobuf.FieldMask":
        return (zJ(e.message, n), !0);
      case "google.protobuf.Struct":
        return (YP(e.message, n), !0);
      case "google.protobuf.Value":
        return (A_(e.message, n), !0);
      case "google.protobuf.ListValue":
        return (ZP(e.message, n), !0);
      default:
        if (Ps.isWrapperDesc(e.desc)) {
          let s = e.desc.fields[0];
          if (n === null) e.clear(s);
          else e.set(s, T_(s, n));
          return !0;
        }
        return !1;
    }
  }
  function jJ(e, n, r) {
    var s;
    if (n === null || Array.isArray(n) || typeof n != "object")
      throw Error(
        `cannot decode message ${e.$typeName} from JSON: expected object but got ${vr.formatVal(n)}`,
      );
    if (Object.keys(n).length == 0) return;
    let h = n["@type"];
    if (typeof h != "string" || h == "")
      throw Error(`cannot decode message ${e.$typeName} from JSON: "@type" is empty`);
    let y = h.includes("/") ? h.substring(h.lastIndexOf("/") + 1) : h;
    if (!y.length) throw Error(`cannot decode message ${e.$typeName} from JSON: "@type" is invalid`);
    let b = (s = r.registry) === null || s === void 0 ? void 0 : s.getMessage(y);
    if (!b) throw Error(`cannot decode message ${e.$typeName} from JSON: ${h} is not in the type registry`);
    let reflect = Mo.reflect(b);
    if (Ps.hasCustomJsonRepresentation(b) && Object.prototype.hasOwnProperty.call(n, "value")) {
      let w = n.value;
      sd(reflect, w, r);
    } else {
      let merged = Object.assign({}, n);
      (delete merged["@type"], sd(reflect, merged, r));
    }
    Ps.anyPack(reflect.desc, reflect.message, e);
  }
  function YJ(e, n) {
    if (typeof n !== "string")
      throw Error(`cannot decode message ${e.$typeName} from JSON: ${vr.formatVal(n)}`);
    let match = n.match(
      /^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})(?:\.([0-9]{1,9}))?(?:Z|([+-][0-9][0-9]:[0-9][0-9]))$/,
    );
    if (!match) throw Error(`cannot decode message ${e.$typeName} from JSON: invalid RFC 3339 string`);
    let parse = Date.parse(
      match[1] +
        "-" +
        match[2] +
        "-" +
        match[3] +
        "T" +
        match[4] +
        ":" +
        match[5] +
        ":" +
        match[6] +
        (match[8] ? match[8] : "Z"),
    );
    if (Number.isNaN(parse))
      throw Error(`cannot decode message ${e.$typeName} from JSON: invalid RFC 3339 string`);
    if (parse < Date.parse("0001-01-01T00:00:00Z") || parse > Date.parse("9999-12-31T23:59:59Z"))
      throw Error(
        `cannot decode message ${e.$typeName} from JSON: must be from 0001-01-01T00:00:00Z to 9999-12-31T23:59:59Z inclusive`,
      );
    if (((e.seconds = xy.protoInt64.parse(parse / 1000)), (e.nanos = 0), match[7]))
      e.nanos = parseInt("1" + match[7] + "0".repeat(9 - match[7].length)) - 1e9;
  }
  function ZJ(e, n) {
    if (typeof n !== "string")
      throw Error(`cannot decode message ${e.$typeName} from JSON: ${vr.formatVal(n)}`);
    let match = n.match(/^(-?[0-9]+)(?:\.([0-9]+))?s/);
    if (match === null) throw Error(`cannot decode message ${e.$typeName} from JSON: ${vr.formatVal(n)}`);
    let s = Number(match[1]);
    if (s > 315576000000 || s < -315576000000)
      throw Error(`cannot decode message ${e.$typeName} from JSON: ${vr.formatVal(n)}`);
    if (((e.seconds = xy.protoInt64.parse(s)), typeof match[2] !== "string")) return;
    let h = match[2] + "0".repeat(9 - match[2].length);
    if (((e.nanos = parseInt(h)), s < 0 || Object.is(s, -0))) e.nanos = -e.nanos;
  }
  function zJ(e, n) {
    if (typeof n !== "string")
      throw Error(`cannot decode message ${e.$typeName} from JSON: ${vr.formatVal(n)}`);
    if (n === "") return;
    e.paths = n.split(",").map((r) => {
      if (r.includes("_"))
        throw Error(`cannot decode message ${e.$typeName} from JSON: path names must be lowerCamelCase`);
      return $P.protoSnakeCase(r);
    });
  }
  function YP(e, n) {
    if (typeof n != "object" || n == null || Array.isArray(n))
      throw Error(`cannot decode message ${e.$typeName} from JSON ${vr.formatVal(n)}`);
    for (let [r, s] of Object.entries(n)) {
      let create = Ol.create(Ps.ValueSchema);
      (A_(create, s), (e.fields[r] = create));
    }
  }
  function A_(e, n) {
    switch (typeof n) {
      case "number":
        e.kind = { case: "numberValue", value: n };
        break;
      case "string":
        e.kind = { case: "stringValue", value: n };
        break;
      case "boolean":
        e.kind = { case: "boolValue", value: n };
        break;
      case "object":
        if (n === null) e.kind = { case: "nullValue", value: Ps.NullValue.NULL_VALUE };
        else if (Array.isArray(n)) {
          let create = Ol.create(Ps.ListValueSchema);
          (ZP(create, n), (e.kind = { case: "listValue", value: create }));
        } else {
          let create = Ol.create(Ps.StructSchema);
          (YP(create, n), (e.kind = { case: "structValue", value: create }));
        }
        break;
      default:
        throw Error(`cannot decode message ${e.$typeName} from JSON ${vr.formatVal(n)}`);
    }
    return e;
  }
  function ZP(e, n) {
    if (!Array.isArray(n)) throw Error(`cannot decode message ${e.$typeName} from JSON ${vr.formatVal(n)}`);
    for (let r of n) {
      let create = Ol.create(Ps.ValueSchema);
      (A_(create, r), e.values.push(create));
    }
  }
});

export { JP };
