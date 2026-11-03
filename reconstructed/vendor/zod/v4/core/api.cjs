/**
 * zod/v4/core/api.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { ep } from "./checks.cjs";
import { Ju } from "./registries.cjs";
import { Bl } from "./schemas.cjs";
import { Ee } from "./util.cjs";

//@ chunk-1ny7cxrt.js:541070-556551 cjs-fingerprint
var NC = x(function (W) {
  var dJ =
      (W && W.__createBinding) ||
      (Object.create
        ? function (e, t, n, o) {
            if (o === void 0) o = n;
            var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(t, n);
            if (
              !ownPropertyDescriptor ||
              ("get" in ownPropertyDescriptor
                ? !t.__esModule
                : ownPropertyDescriptor.writable || ownPropertyDescriptor.configurable)
            )
              ownPropertyDescriptor = {
                enumerable: !0,
                get: function () {
                  return t[n];
                },
              };
            Object.defineProperty(e, o, ownPropertyDescriptor);
          }
        : function (e, t, n, o) {
            if (o === void 0) o = n;
            e[o] = t[n];
          }),
    fJ =
      (W && W.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    Oh =
      (W && W.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) dJ(t, e, key);
        }
        return (fJ(t, e), t);
      };
  Object.defineProperty(W, "__esModule", { value: !0 });
  W.TimePrecision = void 0;
  W._string = pJ;
  W._coercedString = hJ;
  W._email = mJ;
  W._guid = gJ;
  W._uuid = yJ;
  W._uuidv4 = _J;
  W._uuidv6 = bJ;
  W._uuidv7 = vJ;
  W._url = wJ;
  W._emoji = OJ;
  W._nanoid = SJ;
  W._cuid = kJ;
  W._cuid2 = EJ;
  W._ulid = PJ;
  W._xid = AJ;
  W._ksuid = IJ;
  W._ipv4 = CJ;
  W._ipv6 = TJ;
  W._mac = $J;
  W._cidrv4 = RJ;
  W._cidrv6 = DJ;
  W._base64 = MJ;
  W._base64url = jJ;
  W._e164 = xJ;
  W._creditCard = LJ;
  W._iban = NJ;
  W._jwt = UJ;
  W._isoDateTime = zJ;
  W._isoDate = FJ;
  W._isoTime = BJ;
  W._isoDuration = HJ;
  W._number = KJ;
  W._coercedNumber = ZJ;
  W._int = VJ;
  W._float32 = qJ;
  W._float64 = GJ;
  W._int32 = WJ;
  W._uint32 = YJ;
  W._boolean = JJ;
  W._coercedBoolean = XJ;
  W._bigint = QJ;
  W._coercedBigint = e9;
  W._int64 = t9;
  W._uint64 = n9;
  W._symbol = r9;
  W._undefined = i9;
  W._null = o9;
  W._any = s9;
  W._unknown = a9;
  W._never = l9;
  W._void = c9;
  W._date = u9;
  W._coercedDate = d9;
  W._nan = f9;
  W._lt = jC;
  W._lte = Xu;
  W._max = Xu;
  W._lte = Xu;
  W._max = Xu;
  W._gt = xC;
  W._gte = Qu;
  W._min = Qu;
  W._gte = Qu;
  W._min = Qu;
  W._positive = p9;
  W._negative = h9;
  W._nonpositive = m9;
  W._nonnegative = g9;
  W._multipleOf = y9;
  W._maxSize = _9;
  W._minSize = b9;
  W._size = v9;
  W._maxLength = w9;
  W._minLength = O9;
  W._length = S9;
  W._regex = k9;
  W._lowercase = E9;
  W._uppercase = P9;
  W._includes = A9;
  W._startsWith = I9;
  W._endsWith = C9;
  W._property = T9;
  W._properties = $9;
  W._mime = R9;
  W._overwrite = Jl;
  W._normalize = D9;
  W._trim = M9;
  W._toLowerCase = j9;
  W._toUpperCase = x9;
  W._slugify = L9;
  W._array = N9;
  W._union = U9;
  W._xor = z9;
  W._discriminatedUnion = F9;
  W._intersection = B9;
  W._tuple = H9;
  W._record = K9;
  W._map = Z9;
  W._set = V9;
  W._enum = q9;
  W._nativeEnum = G9;
  W._literal = W9;
  W._file = Y9;
  W._transform = J9;
  W._optional = X9;
  W._nullable = Q9;
  W._default = e8;
  W._nonoptional = t8;
  W._success = n8;
  W._catch = r8;
  W._pipe = i8;
  W._readonly = o8;
  W._templateLiteral = s8;
  W._lazy = a8;
  W._promise = l8;
  W._custom = c8;
  W._refine = u8;
  W._superRefine = d8;
  W._check = LC;
  W.describe = f8;
  W.meta = p8;
  W._stringbool = h8;
  W._stringFormat = m8;
  var En = Oh(ep()),
    wh = Oh(Ju()),
    vh = Oh(Bl()),
    ue = Oh(Ee());
  function pJ(e, t) {
    return new e({ type: "string", ...ue.normalizeParams(t) });
  }
  function hJ(e, t) {
    return new e({ type: "string", coerce: !0, ...ue.normalizeParams(t) });
  }
  function mJ(e, t) {
    return new e({
      type: "string",
      format: "email",
      check: "string_format",
      abort: !1,
      ...ue.normalizeParams(t),
    });
  }
  function gJ(e, t) {
    return new e({
      type: "string",
      format: "guid",
      check: "string_format",
      abort: !1,
      ...ue.normalizeParams(t),
    });
  }
  function yJ(e, t) {
    return new e({
      type: "string",
      format: "uuid",
      check: "string_format",
      abort: !1,
      ...ue.normalizeParams(t),
    });
  }
  function _J(e, t) {
    return new e({
      type: "string",
      format: "uuid",
      check: "string_format",
      abort: !1,
      version: "v4",
      ...ue.normalizeParams(t),
    });
  }
  function bJ(e, t) {
    return new e({
      type: "string",
      format: "uuid",
      check: "string_format",
      abort: !1,
      version: "v6",
      ...ue.normalizeParams(t),
    });
  }
  function vJ(e, t) {
    return new e({
      type: "string",
      format: "uuid",
      check: "string_format",
      abort: !1,
      version: "v7",
      ...ue.normalizeParams(t),
    });
  }
  function wJ(e, t) {
    return new e({
      type: "string",
      format: "url",
      check: "string_format",
      abort: !1,
      ...ue.normalizeParams(t),
    });
  }
  function OJ(e, t) {
    return new e({
      type: "string",
      format: "emoji",
      check: "string_format",
      abort: !1,
      ...ue.normalizeParams(t),
    });
  }
  function SJ(e, t) {
    return new e({
      type: "string",
      format: "nanoid",
      check: "string_format",
      abort: !1,
      ...ue.normalizeParams(t),
    });
  }
  function kJ(e, t) {
    return new e({
      type: "string",
      format: "cuid",
      check: "string_format",
      abort: !1,
      ...ue.normalizeParams(t),
    });
  }
  function EJ(e, t) {
    return new e({
      type: "string",
      format: "cuid2",
      check: "string_format",
      abort: !1,
      ...ue.normalizeParams(t),
    });
  }
  function PJ(e, t) {
    return new e({
      type: "string",
      format: "ulid",
      check: "string_format",
      abort: !1,
      ...ue.normalizeParams(t),
    });
  }
  function AJ(e, t) {
    return new e({
      type: "string",
      format: "xid",
      check: "string_format",
      abort: !1,
      ...ue.normalizeParams(t),
    });
  }
  function IJ(e, t) {
    return new e({
      type: "string",
      format: "ksuid",
      check: "string_format",
      abort: !1,
      ...ue.normalizeParams(t),
    });
  }
  function CJ(e, t) {
    return new e({
      type: "string",
      format: "ipv4",
      check: "string_format",
      abort: !1,
      ...ue.normalizeParams(t),
    });
  }
  function TJ(e, t) {
    return new e({
      type: "string",
      format: "ipv6",
      check: "string_format",
      abort: !1,
      ...ue.normalizeParams(t),
    });
  }
  function $J(e, t) {
    return new e({
      type: "string",
      format: "mac",
      check: "string_format",
      abort: !1,
      ...ue.normalizeParams(t),
    });
  }
  function RJ(e, t) {
    return new e({
      type: "string",
      format: "cidrv4",
      check: "string_format",
      abort: !1,
      ...ue.normalizeParams(t),
    });
  }
  function DJ(e, t) {
    return new e({
      type: "string",
      format: "cidrv6",
      check: "string_format",
      abort: !1,
      ...ue.normalizeParams(t),
    });
  }
  function MJ(e, t) {
    return new e({
      type: "string",
      format: "base64",
      check: "string_format",
      abort: !1,
      ...ue.normalizeParams(t),
    });
  }
  function jJ(e, t) {
    return new e({
      type: "string",
      format: "base64url",
      check: "string_format",
      abort: !1,
      ...ue.normalizeParams(t),
    });
  }
  function xJ(e, t) {
    return new e({
      type: "string",
      format: "e164",
      check: "string_format",
      abort: !1,
      ...ue.normalizeParams(t),
    });
  }
  function LJ(e, t) {
    return new e({
      type: "string",
      format: "credit_card",
      check: "string_format",
      abort: !1,
      ...ue.normalizeParams(t),
    });
  }
  function NJ(e, t) {
    return new e({
      type: "string",
      format: "iban",
      check: "string_format",
      abort: !1,
      ...ue.normalizeParams(t),
    });
  }
  function UJ(e, t) {
    return new e({
      type: "string",
      format: "jwt",
      check: "string_format",
      abort: !1,
      ...ue.normalizeParams(t),
    });
  }
  W.TimePrecision = { Any: null, Minute: -1, Second: 0, Millisecond: 3, Microsecond: 6 };
  function zJ(e, t) {
    return new e({
      type: "string",
      format: "datetime",
      check: "string_format",
      offset: !1,
      local: !1,
      precision: null,
      ...ue.normalizeParams(t),
    });
  }
  function FJ(e, t) {
    return new e({ type: "string", format: "date", check: "string_format", ...ue.normalizeParams(t) });
  }
  function BJ(e, t) {
    return new e({
      type: "string",
      format: "time",
      check: "string_format",
      precision: null,
      ...ue.normalizeParams(t),
    });
  }
  function HJ(e, t) {
    return new e({ type: "string", format: "duration", check: "string_format", ...ue.normalizeParams(t) });
  }
  function KJ(e, t) {
    return new e({ type: "number", checks: [], ...ue.normalizeParams(t) });
  }
  function ZJ(e, t) {
    return new e({ type: "number", coerce: !0, checks: [], ...ue.normalizeParams(t) });
  }
  function VJ(e, t) {
    return new e({
      type: "number",
      check: "number_format",
      abort: !1,
      format: "safeint",
      ...ue.normalizeParams(t),
    });
  }
  function qJ(e, t) {
    return new e({
      type: "number",
      check: "number_format",
      abort: !1,
      format: "float32",
      ...ue.normalizeParams(t),
    });
  }
  function GJ(e, t) {
    return new e({
      type: "number",
      check: "number_format",
      abort: !1,
      format: "float64",
      ...ue.normalizeParams(t),
    });
  }
  function WJ(e, t) {
    return new e({
      type: "number",
      check: "number_format",
      abort: !1,
      format: "int32",
      ...ue.normalizeParams(t),
    });
  }
  function YJ(e, t) {
    return new e({
      type: "number",
      check: "number_format",
      abort: !1,
      format: "uint32",
      ...ue.normalizeParams(t),
    });
  }
  function JJ(e, t) {
    return new e({ type: "boolean", ...ue.normalizeParams(t) });
  }
  function XJ(e, t) {
    return new e({ type: "boolean", coerce: !0, ...ue.normalizeParams(t) });
  }
  function QJ(e, t) {
    return new e({ type: "bigint", ...ue.normalizeParams(t) });
  }
  function e9(e, t) {
    return new e({ type: "bigint", coerce: !0, ...ue.normalizeParams(t) });
  }
  function t9(e, t) {
    return new e({
      type: "bigint",
      check: "bigint_format",
      abort: !1,
      format: "int64",
      ...ue.normalizeParams(t),
    });
  }
  function n9(e, t) {
    return new e({
      type: "bigint",
      check: "bigint_format",
      abort: !1,
      format: "uint64",
      ...ue.normalizeParams(t),
    });
  }
  function r9(e, t) {
    return new e({ type: "symbol", ...ue.normalizeParams(t) });
  }
  function i9(e, t) {
    return new e({ type: "undefined", ...ue.normalizeParams(t) });
  }
  function o9(e, t) {
    return new e({ type: "null", ...ue.normalizeParams(t) });
  }
  function s9(e) {
    return new e({ type: "any" });
  }
  function a9(e) {
    return new e({ type: "unknown" });
  }
  function l9(e, t) {
    return new e({ type: "never", ...ue.normalizeParams(t) });
  }
  function c9(e, t) {
    return new e({ type: "void", ...ue.normalizeParams(t) });
  }
  function u9(e, t) {
    return new e({ type: "date", ...ue.normalizeParams(t) });
  }
  function d9(e, t) {
    return new e({ type: "date", coerce: !0, ...ue.normalizeParams(t) });
  }
  function f9(e, t) {
    return new e({ type: "nan", ...ue.normalizeParams(t) });
  }
  function jC(e, t) {
    return new En.$ZodCheckLessThan({
      check: "less_than",
      ...ue.normalizeParams(t),
      value: e,
      inclusive: !1,
    });
  }
  function Xu(e, t) {
    return new En.$ZodCheckLessThan({
      check: "less_than",
      ...ue.normalizeParams(t),
      value: e,
      inclusive: !0,
    });
  }
  function xC(e, t) {
    return new En.$ZodCheckGreaterThan({
      check: "greater_than",
      ...ue.normalizeParams(t),
      value: e,
      inclusive: !1,
    });
  }
  function Qu(e, t) {
    return new En.$ZodCheckGreaterThan({
      check: "greater_than",
      ...ue.normalizeParams(t),
      value: e,
      inclusive: !0,
    });
  }
  function p9(e) {
    return xC(0, e);
  }
  function h9(e) {
    return jC(0, e);
  }
  function m9(e) {
    return Xu(0, e);
  }
  function g9(e) {
    return Qu(0, e);
  }
  function y9(e, t) {
    return new En.$ZodCheckMultipleOf({ check: "multiple_of", ...ue.normalizeParams(t), value: e });
  }
  function _9(e, t) {
    return new En.$ZodCheckMaxSize({ check: "max_size", ...ue.normalizeParams(t), maximum: e });
  }
  function b9(e, t) {
    return new En.$ZodCheckMinSize({ check: "min_size", ...ue.normalizeParams(t), minimum: e });
  }
  function v9(e, t) {
    return new En.$ZodCheckSizeEquals({ check: "size_equals", ...ue.normalizeParams(t), size: e });
  }
  function w9(e, t) {
    return new En.$ZodCheckMaxLength({ check: "max_length", ...ue.normalizeParams(t), maximum: e });
  }
  function O9(e, t) {
    return new En.$ZodCheckMinLength({ check: "min_length", ...ue.normalizeParams(t), minimum: e });
  }
  function S9(e, t) {
    return new En.$ZodCheckLengthEquals({ check: "length_equals", ...ue.normalizeParams(t), length: e });
  }
  function k9(e, t) {
    return new En.$ZodCheckRegex({
      check: "string_format",
      format: "regex",
      ...ue.normalizeParams(t),
      pattern: e,
    });
  }
  function E9(e) {
    return new En.$ZodCheckLowerCase({
      check: "string_format",
      format: "lowercase",
      ...ue.normalizeParams(e),
    });
  }
  function P9(e) {
    return new En.$ZodCheckUpperCase({
      check: "string_format",
      format: "uppercase",
      ...ue.normalizeParams(e),
    });
  }
  function A9(e, t) {
    return new En.$ZodCheckIncludes({
      check: "string_format",
      format: "includes",
      ...ue.normalizeParams(t),
      includes: e,
    });
  }
  function I9(e, t) {
    return new En.$ZodCheckStartsWith({
      check: "string_format",
      format: "starts_with",
      ...ue.normalizeParams(t),
      prefix: e,
    });
  }
  function C9(e, t) {
    return new En.$ZodCheckEndsWith({
      check: "string_format",
      format: "ends_with",
      ...ue.normalizeParams(t),
      suffix: e,
    });
  }
  function T9(e, t, n) {
    return new En.$ZodCheckProperty({ check: "property", property: e, schema: t, ...ue.normalizeParams(n) });
  }
  function $9(e, t, n) {
    return new e({ type: "properties", check: "properties", shape: t, ...ue.normalizeParams(n) });
  }
  function R9(e, t) {
    return new En.$ZodCheckMimeType({ check: "mime_type", mime: e, ...ue.normalizeParams(t) });
  }
  function Jl(e) {
    return new En.$ZodCheckOverwrite({ check: "overwrite", tx: e });
  }
  function D9(e) {
    return Jl((t) => t.normalize(e));
  }
  function M9() {
    return Jl((e) => e.trim());
  }
  function j9() {
    return Jl((e) => e.toLowerCase());
  }
  function x9() {
    return Jl((e) => e.toUpperCase());
  }
  function L9() {
    return Jl((e) => ue.slugify(e));
  }
  function N9(e, t, n) {
    return new e({ type: "array", element: t, ...ue.normalizeParams(n) });
  }
  function U9(e, t, n) {
    return new e({ type: "union", options: t, ...ue.normalizeParams(n) });
  }
  function z9(e, t, n) {
    return new e({ type: "union", options: t, inclusive: !1, ...ue.normalizeParams(n) });
  }
  function F9(e, t, n, o) {
    return new e({ type: "union", options: n, discriminator: t, ...ue.normalizeParams(o) });
  }
  function B9(e, t, n) {
    return new e({ type: "intersection", left: t, right: n });
  }
  function H9(e, t, n, o) {
    let r = n instanceof vh.$ZodType,
      s = r ? o : n;
    return new e({ type: "tuple", items: t, rest: r ? n : null, ...ue.normalizeParams(s) });
  }
  function K9(e, t, n, o) {
    return new e({ type: "record", keyType: t, valueType: n, ...ue.normalizeParams(o) });
  }
  function Z9(e, t, n, o) {
    return new e({ type: "map", keyType: t, valueType: n, ...ue.normalizeParams(o) });
  }
  function V9(e, t, n) {
    return new e({ type: "set", valueType: t, ...ue.normalizeParams(n) });
  }
  function q9(e, t, n) {
    let o = Array.isArray(t) ? Object.fromEntries(t.map((r) => [r, r])) : t;
    return new e({ type: "enum", entries: o, ...ue.normalizeParams(n) });
  }
  function G9(e, t, n) {
    return new e({ type: "enum", entries: t, ...ue.normalizeParams(n) });
  }
  function W9(e, t, n) {
    return new e({ type: "literal", values: Array.isArray(t) ? t : [t], ...ue.normalizeParams(n) });
  }
  function Y9(e, t) {
    return new e({ type: "file", ...ue.normalizeParams(t) });
  }
  function J9(e, t) {
    return new e({ type: "transform", transform: t });
  }
  function X9(e, t) {
    return new e({ type: "optional", innerType: t });
  }
  function Q9(e, t) {
    return new e({ type: "nullable", innerType: t });
  }
  function e8(e, t, n) {
    return new e({
      type: "default",
      innerType: t,
      get defaultValue() {
        return typeof n === "function" ? n() : ue.shallowClone(n);
      },
    });
  }
  function t8(e, t, n) {
    return new e({ type: "nonoptional", innerType: t, ...ue.normalizeParams(n) });
  }
  function n8(e, t) {
    return new e({ type: "success", innerType: t });
  }
  function r8(e, t, n) {
    return new e({
      type: "catch",
      innerType: t,
      catchValue: typeof n === "function" ? n : ue.constantCatch(n),
    });
  }
  function i8(e, t, n) {
    return new e({ type: "pipe", in: t, out: n });
  }
  function o8(e, t) {
    return new e({ type: "readonly", innerType: t });
  }
  function s8(e, t, n) {
    return new e({ type: "template_literal", parts: t, ...ue.normalizeParams(n) });
  }
  function a8(e, t) {
    return new e({ type: "lazy", getter: t });
  }
  function l8(e, t) {
    return new e({ type: "promise", innerType: t });
  }
  function c8(e, t, n) {
    let normalizeParams = ue.normalizeParams(n);
    return (
      normalizeParams.abort ?? (normalizeParams.abort = !0),
      new e({ type: "custom", check: "custom", fn: t, ...normalizeParams })
    );
  }
  function u8(e, t, n) {
    return new e({ type: "custom", check: "custom", fn: t, ...ue.normalizeParams(n) });
  }
  function d8(e, t) {
    let n = LC(
      (o) => (
        (o.addIssue = (r) => {
          if (typeof r === "string") o.issues.push(ue.issue(r, o.value, n._zod.def));
          else {
            let s = r;
            if (s.fatal) s.continue = !1;
            if ((s.code ?? (s.code = "custom"), !("input" in s))) s.input = o.value;
            (s.inst ?? (s.inst = n),
              s.continue ?? (s.continue = !n._zod.def.abort),
              o.issues.push(ue.issue(s)));
          }
        }),
        e(o.value, o)
      ),
      t,
    );
    return n;
  }
  function LC(e, t) {
    let n = new En.$ZodCheck({ check: "custom", ...ue.normalizeParams(t) });
    return ((n._zod.check = e), n);
  }
  function f8(e) {
    let t = new En.$ZodCheck({ check: "describe" });
    return (
      (t._zod.onattach = [
        (n) => {
          let o = wh.globalRegistry.get(n) ?? {};
          wh.globalRegistry.add(n, { ...o, description: e });
        },
      ]),
      (t._zod.check = () => {}),
      t
    );
  }
  function p8(e) {
    let t = new En.$ZodCheck({ check: "meta" });
    return (
      (t._zod.onattach = [
        (n) => {
          let o = wh.globalRegistry.get(n) ?? {};
          wh.globalRegistry.add(n, { ...o, ...e });
        },
      ]),
      (t._zod.check = () => {}),
      t
    );
  }
  function h8(e, t) {
    let normalizeParams = ue.normalizeParams(t),
      o = normalizeParams.truthy ?? ["true", "1", "yes", "on", "y", "enabled"],
      r = normalizeParams.falsy ?? ["false", "0", "no", "off", "n", "disabled"];
    if (normalizeParams.case !== "sensitive")
      ((o = o.map((y) => (typeof y === "string" ? y.toLowerCase() : y))),
        (r = r.map((y) => (typeof y === "string" ? y.toLowerCase() : y))));
    let s = new Set(o),
      a = new Set(r),
      l = e.Codec ?? vh.$ZodCodec,
      c = e.Boolean ?? vh.$ZodBoolean,
      f = new (e.String ?? vh.$ZodString)({ type: "string", error: normalizeParams.error }),
      h = new c({ type: "boolean", error: normalizeParams.error }),
      m = new l({
        type: "pipe",
        in: f,
        out: h,
        transform: (y, b) => {
          let w = y;
          if (normalizeParams.case !== "sensitive") w = w.toLowerCase();
          if (s.has(w)) return !0;
          else if (a.has(w)) return !1;
          else
            return (
              b.issues.push({
                code: "invalid_value",
                expected: "stringbool",
                values: [...s, ...a],
                input: b.value,
                inst: m,
                continue: !1,
              }),
              {}
            );
        },
        reverseTransform: (y, b) => {
          if (y === !0) return o[0] || "true";
          else return r[0] || "false";
        },
        error: normalizeParams.error,
      });
    return (
      (m._zod.bag.truthy = o),
      (m._zod.bag.falsy = r),
      (m._zod.bag.case = normalizeParams.case ?? "insensitive"),
      m
    );
  }
  function m8(e, t, n, o = {}) {
    let normalizeParams = ue.normalizeParams(o),
      s = {
        check: "string_format",
        type: "string",
        format: t,
        fn: typeof n === "function" ? n : (l) => n.test(l),
        ...normalizeParams,
      };
    if (n instanceof RegExp) s.pattern = n;
    return new e(s);
  }
  (function () {
    var ownPropertyNames = Object.getOwnPropertyNames(W);
    for (var t = 0; t < ownPropertyNames.length; t++) {
      var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(W, ownPropertyNames[t]);
      if (!ownPropertyDescriptor || !ownPropertyDescriptor.get || !ownPropertyDescriptor.configurable)
        continue;
      var o;
      try {
        o = ownPropertyDescriptor.get();
      } catch (error) {
        continue;
      }
      if (o === void 0) continue;
      Object.defineProperty(W, ownPropertyNames[t], {
        value: o,
        writable: !1,
        enumerable: ownPropertyDescriptor.enumerable,
        configurable: !1,
      });
    }
    Object.freeze(W);
  })();
});

export { NC };
