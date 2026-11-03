/**
 * zod/lib/index.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-j2t139r9.js (13)
 * attribution: esm-layout 5, esm-fingerprint 8
 */
import { ZodError, arrayToEnum_2 } from "../v3/ZodError.js";
import { arrayToEnum, g } from "../v3/helpers/util.js";
import {
  T,
  D,
  le,
  z,
  G,
  W,
  ce,
  Q,
  X,
  B,
  V,
  j,
  oe,
  C,
  y,
  K,
  ve,
  Z,
  I,
  ue,
  de,
  U,
  H,
  ee,
  te,
  P,
  re,
  q,
  A,
  S,
  E,
  fe,
} from "../v3/types.js";

//@ chunk-j2t139r9.js:3800-3823 esm-layout
ZodError.create = (e) => new ZodError(e);
//@ chunk-j2t139r9.js:3823-6990 esm-fingerprint
var Oe = (e, t) => {
    let r;
    switch (e.code) {
      case arrayToEnum_2.invalid_type:
        if (e.received === arrayToEnum.undefined) r = "Required";
        else r = `Expected ${e.expected}, received ${e.received}`;
        break;
      case arrayToEnum_2.invalid_literal:
        r = `Invalid literal value, expected ${JSON.stringify(e.expected, g.jsonStringifyReplacer)}`;
        break;
      case arrayToEnum_2.unrecognized_keys:
        r = `Unrecognized key(s) in object: ${g.joinValues(e.keys, ", ")}`;
        break;
      case arrayToEnum_2.invalid_union:
        r = "Invalid input";
        break;
      case arrayToEnum_2.invalid_union_discriminator:
        r = `Invalid discriminator value. Expected ${g.joinValues(e.options)}`;
        break;
      case arrayToEnum_2.invalid_enum_value:
        r = `Invalid enum value. Expected ${g.joinValues(e.options)}, received '${e.received}'`;
        break;
      case arrayToEnum_2.invalid_arguments:
        r = "Invalid function arguments";
        break;
      case arrayToEnum_2.invalid_return_type:
        r = "Invalid function return type";
        break;
      case arrayToEnum_2.invalid_date:
        r = "Invalid date";
        break;
      case arrayToEnum_2.invalid_string:
        if (typeof e.validation === "object")
          if ("includes" in e.validation) {
            if (
              ((r = `Invalid input: must include "${e.validation.includes}"`),
              typeof e.validation.position === "number")
            )
              r = `${r} at one or more positions greater than or equal to ${e.validation.position}`;
          } else if ("startsWith" in e.validation)
            r = `Invalid input: must start with "${e.validation.startsWith}"`;
          else if ("endsWith" in e.validation) r = `Invalid input: must end with "${e.validation.endsWith}"`;
          else g.assertNever(e.validation);
        else if (e.validation !== "regex") r = `Invalid ${e.validation}`;
        else r = "Invalid";
        break;
      case arrayToEnum_2.too_small:
        if (e.type === "array")
          r = `Array must contain ${e.exact ? "exactly" : e.inclusive ? "at least" : "more than"} ${e.minimum} element(s)`;
        else if (e.type === "string")
          r = `String must contain ${e.exact ? "exactly" : e.inclusive ? "at least" : "over"} ${e.minimum} character(s)`;
        else if (e.type === "number")
          r = `Number must be ${e.exact ? "exactly equal to " : e.inclusive ? "greater than or equal to " : "greater than "}${e.minimum}`;
        else if (e.type === "bigint")
          r = `Number must be ${e.exact ? "exactly equal to " : e.inclusive ? "greater than or equal to " : "greater than "}${e.minimum}`;
        else if (e.type === "date")
          r = `Date must be ${e.exact ? "exactly equal to " : e.inclusive ? "greater than or equal to " : "greater than "}${new Date(Number(e.minimum))}`;
        else r = "Invalid input";
        break;
      case arrayToEnum_2.too_big:
        if (e.type === "array")
          r = `Array must contain ${e.exact ? "exactly" : e.inclusive ? "at most" : "less than"} ${e.maximum} element(s)`;
        else if (e.type === "string")
          r = `String must contain ${e.exact ? "exactly" : e.inclusive ? "at most" : "under"} ${e.maximum} character(s)`;
        else if (e.type === "number")
          r = `Number must be ${e.exact ? "exactly" : e.inclusive ? "less than or equal to" : "less than"} ${e.maximum}`;
        else if (e.type === "bigint")
          r = `BigInt must be ${e.exact ? "exactly" : e.inclusive ? "less than or equal to" : "less than"} ${e.maximum}`;
        else if (e.type === "date")
          r = `Date must be ${e.exact ? "exactly" : e.inclusive ? "smaller than or equal to" : "smaller than"} ${new Date(Number(e.maximum))}`;
        else r = "Invalid input";
        break;
      case arrayToEnum_2.custom:
        r = "Invalid input";
        break;
      case arrayToEnum_2.invalid_intersection_types:
        r = "Intersection results could not be merged";
        break;
      case arrayToEnum_2.not_multiple_of:
        r = `Number must be a multiple of ${e.multipleOf}`;
        break;
      case arrayToEnum_2.not_finite:
        r = "Number must be finite";
        break;
      default:
        ((r = t.defaultError), g.assertNever(e));
    }
    return { message: r };
  },
  N = Oe;
//@ chunk-j2t139r9.js:6990-6999 esm-layout
var Re = N;
//@ chunk-j2t139r9.js:6999-7022 esm-layout
function J() {
  return Re;
}
//@ chunk-j2t139r9.js:7022-7312 esm-fingerprint
var ie = (e) => {
  let { data: t, path: path, errorMaps: errorMaps, issueData: issueData } = e,
    i = [...path, ...(issueData.path || [])],
    n = { ...issueData, path: i };
  if (issueData.message !== void 0) return { ...issueData, path: i, message: issueData.message };
  let c = "",
    reverse = errorMaps
      .filter((p) => !!p)
      .slice()
      .reverse();
  for (let p of reverse) c = p(n, { data: t, defaultError: c }).message;
  return { ...issueData, path: i, message: c };
};
//@ chunk-j2t139r9.js:7312-7497 esm-fingerprint
function u(e, t) {
  let r = J(),
    a = ie({
      issueData: t,
      data: e.data,
      path: e.path,
      errorMaps: [e.common.contextualErrorMap, e.schemaErrorMap, r, r === N ? void 0 : N].filter((s) => !!s),
    });
  e.common.issues.push(a);
}
//@ chunk-j2t139r9.js:7497-8267 esm-fingerprint
class v {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid") this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted") this.value = "aborted";
  }
  static mergeArray(e, t) {
    let r = [];
    for (let a of t) {
      if (a.status === "aborted") return freeze;
      if (a.status === "dirty") e.dirty();
      r.push(a.value);
    }
    return { status: e.value, value: r };
  }
  static async mergeObjectAsync(e, t) {
    let r = [];
    for (let a of t) {
      let key = await a.key,
        i = await a.value;
      r.push({ key: key, value: i });
    }
    return v.mergeObjectSync(e, r);
  }
  static mergeObjectSync(e, t) {
    let r = {};
    for (let a of t) {
      let { key: key, value: i } = a;
      if (key.status === "aborted") return freeze;
      if (i.status === "aborted") return freeze;
      if (key.status === "dirty") e.dirty();
      if (i.status === "dirty") e.dirty();
      if (key.value !== "__proto__" && (typeof i.value < "u" || a.alwaysSet)) r[key.value] = i.value;
    }
    return { status: e.value, value: r };
  }
}
//@ chunk-j2t139r9.js:8267-8505 esm-fingerprint
var freeze = Object.freeze({ status: "aborted" }),
  L = (e) => ({ status: "dirty", value: e }),
  x = (e) => ({ status: "valid", value: e }),
  pe = (e) => e.status === "aborted",
  _e = (e) => e.status === "dirty",
  M = (e) => e.status === "valid",
  Y = (e) => typeof Promise < "u" && e instanceof Promise;
//@ chunk-j2t139r9.js:8505-8511 esm-layout
var l;
//@ chunk-j2t139r9.js:8511-8640 esm-fingerprint
(function (e) {
  ((e.errToObj = (t) => (typeof t === "string" ? { message: t } : t || {})),
    (e.toString = (t) => (typeof t === "string" ? t : t?.message)));
})(l || (l = {}));
//@ chunk-j2t139r9.js:58896-59342 esm-fingerprint
var create_2 = T.create,
  create_3 = D.create,
  create_4 = le.create,
  create_5 = z.create,
  create_6 = G.create,
  create_7 = W.create,
  create_8 = ce.create,
  create_9 = Q.create,
  create_10 = X.create,
  create_11 = B.create,
  create_12 = V.create,
  create_13 = j.create,
  create_14 = oe.create,
  create_15 = C.create,
  { create: create, strictCreate: strictCreate } = y,
  create_16 = K.create,
  create_17 = ve.create,
  create_18 = Z.create,
  create_19 = I.create,
  create_20 = ue.create,
  create_21 = de.create,
  create_22 = U.create,
  create_23 = H.create,
  create_24 = ee.create,
  create_25 = te.create,
  create_26 = P.create,
  create_27 = re.create,
  create_28 = q.create,
  create_29 = A.create,
  create_30 = S.create,
  create_31 = E.create,
  createWithPreprocess = A.createWithPreprocess,
  create_32 = fe.create;
/**
 * zod 的 coerce 构造器表（string/number/boolean/bigint/date）。属于第三方 zod，不是 SDK schema。
 */
//@ chunk-j2t139r9.js:59342-59545 esm-fingerprint
var zodCoerce = {
  string: (e) => T.create({ ...e, coerce: !0 }),
  number: (e) => D.create({ ...e, coerce: !0 }),
  boolean: (e) => G.create({ ...e, coerce: !0 }),
  bigint: (e) => z.create({ ...e, coerce: !0 }),
  date: (e) => W.create({ ...e, coerce: !0 }),
};
//@ chunk-j2t139r9.js:59545-59555 esm-layout
var r1i = freeze;

export {
  create,
  create_2,
  create_15,
  create_12,
  create_26,
  create_6,
  create_3,
  create_20,
  create_25,
  create_9,
  r1i,
  create_17,
  strictCreate,
  create_16,
  zodCoerce,
  create_19,
  M,
  v,
  Y,
  u,
  freeze,
  l,
  x,
  pe,
  _e,
  ie,
  J,
  N,
  L,
  create_10,
};
