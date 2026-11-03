/**
 * zod/v3/types.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-j2t139r9.js (91)
 * attribution: esm-fingerprint 87, esm-layout 4
 */
import { M, v, Y, u, freeze, l, x, pe, _e, ie, J, N, L } from "../lib/index.mjs";
import { ZodError, arrayToEnum_2 } from "./ZodError.js";
import { O, arrayToEnum, g } from "./helpers/util.js";

//@ chunk-j2t139r9.js:8640-8934 esm-fingerprint
class w {
  constructor(e, t, r, a) {
    ((this._cachedPath = []), (this.parent = e), (this.data = t), (this._path = r), (this._key = a));
  }
  get path() {
    if (!this._cachedPath.length)
      if (Array.isArray(this._key)) this._cachedPath.push(...this._path, ...this._key);
      else this._cachedPath.push(...this._path, this._key);
    return this._cachedPath;
  }
}
/**
 * zod 内部：safeParse 结果封装（第三方）。
 */
//@ chunk-j2t139r9.js:8934-9208 esm-fingerprint
var handleParseResult = (e, t) => {
  if (M(t)) return { success: !0, data: t.value };
  else {
    if (!e.common.issues.length) throw Error("Validation failed but no issues detected.");
    return {
      success: !1,
      get error() {
        if (this._error) return this._error;
        let r = new ZodError(e.common.issues);
        return ((this._error = r), this._error);
      },
    };
  }
};
//@ chunk-j2t139r9.js:9208-9739 esm-fingerprint
function m(e) {
  if (!e) return {};
  let {
    errorMap: errorMap,
    invalid_type_error: invalid_type_error,
    required_error: required_error,
    description: description,
  } = e;
  if (errorMap && (invalid_type_error || required_error))
    throw Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  if (errorMap) return { errorMap: errorMap, description: description };
  return {
    errorMap: (n, c) => {
      let { message: message } = e;
      if (n.code === "invalid_enum_value") return { message: message ?? c.defaultError };
      if (typeof c.data > "u") return { message: message ?? required_error ?? c.defaultError };
      if (n.code !== "invalid_type") return { message: c.defaultError };
      return { message: message ?? invalid_type_error ?? c.defaultError };
    },
    description: description,
  };
}
//@ chunk-j2t139r9.js:9739-14153 esm-fingerprint
class _ {
  get description() {
    return this._def.description;
  }
  _getType(e) {
    return O(e.data);
  }
  _getOrReturnCtx(e, t) {
    return (
      t || {
        common: e.parent.common,
        data: e.data,
        parsedType: O(e.data),
        schemaErrorMap: this._def.errorMap,
        path: e.path,
        parent: e.parent,
      }
    );
  }
  _processInputParams(e) {
    return {
      status: new v(),
      ctx: {
        common: e.parent.common,
        data: e.data,
        parsedType: O(e.data),
        schemaErrorMap: this._def.errorMap,
        path: e.path,
        parent: e.parent,
      },
    };
  }
  _parseSync(e) {
    let _parse = this._parse(e);
    if (Y(_parse)) throw Error("Synchronous parse encountered promise.");
    return _parse;
  }
  _parseAsync(e) {
    let _parse = this._parse(e);
    return Promise.resolve(_parse);
  }
  parse(e, t) {
    let safeParse = this.safeParse(e, t);
    if (safeParse.success) return safeParse.data;
    throw safeParse.error;
  }
  safeParse(e, t) {
    let r = {
        common: { issues: [], async: t?.async ?? !1, contextualErrorMap: t?.errorMap },
        path: t?.path || [],
        schemaErrorMap: this._def.errorMap,
        parent: null,
        data: e,
        parsedType: O(e),
      },
      _parseSync = this._parseSync({ data: e, path: r.path, parent: r });
    return handleParseResult(r, _parseSync);
  }
  "~validate"(e) {
    let t = {
      common: { issues: [], async: !!this["~standard"].async },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data: e,
      parsedType: O(e),
    };
    if (!this["~standard"].async)
      try {
        let _parseSync = this._parseSync({ data: e, path: [], parent: t });
        return M(_parseSync) ? { value: _parseSync.value } : { issues: t.common.issues };
      } catch (error) {
        if (error?.message?.toLowerCase()?.includes("encountered")) this["~standard"].async = !0;
        t.common = { issues: [], async: !0 };
      }
    return this._parseAsync({ data: e, path: [], parent: t }).then((r) =>
      M(r) ? { value: r.value } : { issues: t.common.issues },
    );
  }
  async parseAsync(e, t) {
    let safeParseAsync = await this.safeParseAsync(e, t);
    if (safeParseAsync.success) return safeParseAsync.data;
    throw safeParseAsync.error;
  }
  async safeParseAsync(e, t) {
    let r = {
        common: { issues: [], contextualErrorMap: t?.errorMap, async: !0 },
        path: t?.path || [],
        schemaErrorMap: this._def.errorMap,
        parent: null,
        data: e,
        parsedType: O(e),
      },
      _parse = this._parse({ data: e, path: r.path, parent: r }),
      s = await (Y(_parse) ? _parse : Promise.resolve(_parse));
    return handleParseResult(r, s);
  }
  refine(e, t) {
    let r = (a) => {
      if (typeof t === "string" || typeof t > "u") return { message: t };
      else if (typeof t === "function") return t(a);
      else return t;
    };
    return this._refinement((a, s) => {
      let i = e(a),
        n = () => s.addIssue({ code: arrayToEnum_2.custom, ...r(a) });
      if (typeof Promise < "u" && i instanceof Promise)
        return i.then((c) => {
          if (!c) return (n(), !1);
          else return !0;
        });
      if (!i) return (n(), !1);
      else return !0;
    });
  }
  refinement(e, t) {
    return this._refinement((r, a) => {
      if (!e(r)) return (a.addIssue(typeof t === "function" ? t(r, a) : t), !1);
      else return !0;
    });
  }
  _refinement(e) {
    return new A({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement: e },
    });
  }
  superRefine(e) {
    return this._refinement(e);
  }
  constructor(e) {
    ((this.spa = this.safeParseAsync),
      (this._def = e),
      (this.parse = this.parse.bind(this)),
      (this.safeParse = this.safeParse.bind(this)),
      (this.parseAsync = this.parseAsync.bind(this)),
      (this.safeParseAsync = this.safeParseAsync.bind(this)),
      (this.spa = this.spa.bind(this)),
      (this.refine = this.refine.bind(this)),
      (this.refinement = this.refinement.bind(this)),
      (this.superRefine = this.superRefine.bind(this)),
      (this.optional = this.optional.bind(this)),
      (this.nullable = this.nullable.bind(this)),
      (this.nullish = this.nullish.bind(this)),
      (this.array = this.array.bind(this)),
      (this.promise = this.promise.bind(this)),
      (this.or = this.or.bind(this)),
      (this.and = this.and.bind(this)),
      (this.transform = this.transform.bind(this)),
      (this.brand = this.brand.bind(this)),
      (this.default = this.default.bind(this)),
      (this.catch = this.catch.bind(this)),
      (this.describe = this.describe.bind(this)),
      (this.pipe = this.pipe.bind(this)),
      (this.readonly = this.readonly.bind(this)),
      (this.isNullable = this.isNullable.bind(this)),
      (this.isOptional = this.isOptional.bind(this)),
      (this["~standard"] = { version: 1, vendor: "zod", validate: (t) => this["~validate"](t) }));
  }
  optional() {
    return S.create(this, this._def);
  }
  nullable() {
    return E.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return C.create(this);
  }
  promise() {
    return q.create(this, this._def);
  }
  or(e) {
    return K.create([this, e], this._def);
  }
  and(e) {
    return Z.create(this, e, this._def);
  }
  transform(e) {
    return new A({
      ...m(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform: e },
    });
  }
  default(e) {
    let t = typeof e === "function" ? e : () => e;
    return new se({
      ...m(this._def),
      innerType: this,
      defaultValue: t,
      typeName: ZodFirstPartyTypeKind.ZodDefault,
    });
  }
  brand() {
    return new xe({ typeName: ZodFirstPartyTypeKind.ZodBranded, type: this, ...m(this._def) });
  }
  catch(e) {
    let t = typeof e === "function" ? e : () => e;
    return new ae({
      ...m(this._def),
      innerType: this,
      catchValue: t,
      typeName: ZodFirstPartyTypeKind.ZodCatch,
    });
  }
  describe(e) {
    return new this.constructor({ ...this._def, description: e });
  }
  pipe(e) {
    return fe.create(this, e);
  }
  readonly() {
    return ne.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
}
//@ chunk-j2t139r9.js:14153-16845 esm-fingerprint
var je = /^c[^\s-]{8,}$/i,
  Ie = /^[0-9a-z]+$/,
  Ne = /^[0-9A-HJKMNP-TV-Z]{26}$/i,
  Ee = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i,
  $e = /^[a-z0-9_-]{21}$/i,
  Me = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/,
  Ve =
    /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/,
  De = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i,
  ze = "^[\\p{Extended_Pictographic}\\p{Emoji_Component}]+$",
  ge,
  Pe =
    /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/,
  Le =
    /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/,
  Fe =
    /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/,
  We =
    /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/,
  Be = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/,
  Ue = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/,
  Ce =
    "((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))",
  regExp = new RegExp(`^${Ce}$`);
//@ chunk-j2t139r9.js:16845-17039 esm-fingerprint
function Se(e) {
  let t = "[0-5]\\d";
  if (e.precision) t = `${t}\\.\\d{${e.precision}}`;
  else if (e.precision == null) t = `${t}(\\.\\d+)?`;
  let r = e.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${t})${r}`;
}
//@ chunk-j2t139r9.js:17039-17086 esm-layout
function Je(e) {
  return new RegExp(`^${Se(e)}$`);
}
//@ chunk-j2t139r9.js:17086-17250 esm-fingerprint
function Ye(e) {
  let t = `${Ce}T${Se(e)}`,
    r = [];
  if ((r.push(e.local ? "Z?" : "Z"), e.offset)) r.push("([+-]\\d{2}:?\\d{2})");
  return ((t = `${t}(${r.join("|")})`), new RegExp(`^${t}$`));
}
//@ chunk-j2t139r9.js:17250-17354 esm-layout
function He(e, t) {
  if ((t === "v4" || !t) && Pe.test(e)) return !0;
  if ((t === "v6" || !t) && Fe.test(e)) return !0;
  return !1;
}
//@ chunk-j2t139r9.js:17354-17687 esm-fingerprint
function Ge(e, t) {
  if (!Me.test(e)) return !1;
  try {
    let [r] = e.split(".");
    if (!r) return !1;
    let padded = r
        .replace(/-/g, "+")
        .replace(/_/g, "/")
        .padEnd(r.length + ((4 - (r.length % 4)) % 4), "="),
      parsed = JSON.parse(atob(padded));
    if (typeof parsed !== "object" || parsed === null) return !1;
    if ("typ" in parsed && parsed?.typ !== "JWT") return !1;
    if (!parsed.alg) return !1;
    if (t && parsed.alg !== t) return !1;
    return !0;
  } catch {
    return !1;
  }
}
//@ chunk-j2t139r9.js:17687-17791 esm-layout
function Qe(e, t) {
  if ((t === "v4" || !t) && Le.test(e)) return !0;
  if ((t === "v6" || !t) && We.test(e)) return !0;
  return !1;
}
//@ chunk-j2t139r9.js:17791-26110 esm-fingerprint
class T extends _ {
  _parse(e) {
    if (this._def.coerce) e.data = String(e.data);
    if (this._getType(e) !== arrayToEnum.string) {
      let _getOrReturnCtx = this._getOrReturnCtx(e);
      return (
        u(_getOrReturnCtx, {
          code: arrayToEnum_2.invalid_type,
          expected: arrayToEnum.string,
          received: _getOrReturnCtx.parsedType,
        }),
        freeze
      );
    }
    let r = new v(),
      a = void 0;
    for (let check of this._def.checks)
      if (check.kind === "min") {
        if (e.data.length < check.value)
          ((a = this._getOrReturnCtx(e, a)),
            u(a, {
              code: arrayToEnum_2.too_small,
              minimum: check.value,
              type: "string",
              inclusive: !0,
              exact: !1,
              message: check.message,
            }),
            r.dirty());
      } else if (check.kind === "max") {
        if (e.data.length > check.value)
          ((a = this._getOrReturnCtx(e, a)),
            u(a, {
              code: arrayToEnum_2.too_big,
              maximum: check.value,
              type: "string",
              inclusive: !0,
              exact: !1,
              message: check.message,
            }),
            r.dirty());
      } else if (check.kind === "length") {
        let i = e.data.length > check.value,
          n = e.data.length < check.value;
        if (i || n) {
          if (((a = this._getOrReturnCtx(e, a)), i))
            u(a, {
              code: arrayToEnum_2.too_big,
              maximum: check.value,
              type: "string",
              inclusive: !0,
              exact: !0,
              message: check.message,
            });
          else if (n)
            u(a, {
              code: arrayToEnum_2.too_small,
              minimum: check.value,
              type: "string",
              inclusive: !0,
              exact: !0,
              message: check.message,
            });
          r.dirty();
        }
      } else if (check.kind === "email") {
        if (!De.test(e.data))
          ((a = this._getOrReturnCtx(e, a)),
            u(a, { validation: "email", code: arrayToEnum_2.invalid_string, message: check.message }),
            r.dirty());
      } else if (check.kind === "emoji") {
        if (!ge) ge = new RegExp(ze, "u");
        if (!ge.test(e.data))
          ((a = this._getOrReturnCtx(e, a)),
            u(a, { validation: "emoji", code: arrayToEnum_2.invalid_string, message: check.message }),
            r.dirty());
      } else if (check.kind === "uuid") {
        if (!Ee.test(e.data))
          ((a = this._getOrReturnCtx(e, a)),
            u(a, { validation: "uuid", code: arrayToEnum_2.invalid_string, message: check.message }),
            r.dirty());
      } else if (check.kind === "nanoid") {
        if (!$e.test(e.data))
          ((a = this._getOrReturnCtx(e, a)),
            u(a, { validation: "nanoid", code: arrayToEnum_2.invalid_string, message: check.message }),
            r.dirty());
      } else if (check.kind === "cuid") {
        if (!je.test(e.data))
          ((a = this._getOrReturnCtx(e, a)),
            u(a, { validation: "cuid", code: arrayToEnum_2.invalid_string, message: check.message }),
            r.dirty());
      } else if (check.kind === "cuid2") {
        if (!Ie.test(e.data))
          ((a = this._getOrReturnCtx(e, a)),
            u(a, { validation: "cuid2", code: arrayToEnum_2.invalid_string, message: check.message }),
            r.dirty());
      } else if (check.kind === "ulid") {
        if (!Ne.test(e.data))
          ((a = this._getOrReturnCtx(e, a)),
            u(a, { validation: "ulid", code: arrayToEnum_2.invalid_string, message: check.message }),
            r.dirty());
      } else if (check.kind === "url")
        try {
          new URL(e.data);
        } catch {
          ((a = this._getOrReturnCtx(e, a)),
            u(a, { validation: "url", code: arrayToEnum_2.invalid_string, message: check.message }),
            r.dirty());
        }
      else if (check.kind === "regex") {
        if (((check.regex.lastIndex = 0), !check.regex.test(e.data)))
          ((a = this._getOrReturnCtx(e, a)),
            u(a, { validation: "regex", code: arrayToEnum_2.invalid_string, message: check.message }),
            r.dirty());
      } else if (check.kind === "trim") e.data = e.data.trim();
      else if (check.kind === "includes") {
        if (!e.data.includes(check.value, check.position))
          ((a = this._getOrReturnCtx(e, a)),
            u(a, {
              code: arrayToEnum_2.invalid_string,
              validation: { includes: check.value, position: check.position },
              message: check.message,
            }),
            r.dirty());
      } else if (check.kind === "toLowerCase") e.data = e.data.toLowerCase();
      else if (check.kind === "toUpperCase") e.data = e.data.toUpperCase();
      else if (check.kind === "startsWith") {
        if (!e.data.startsWith(check.value))
          ((a = this._getOrReturnCtx(e, a)),
            u(a, {
              code: arrayToEnum_2.invalid_string,
              validation: { startsWith: check.value },
              message: check.message,
            }),
            r.dirty());
      } else if (check.kind === "endsWith") {
        if (!e.data.endsWith(check.value))
          ((a = this._getOrReturnCtx(e, a)),
            u(a, {
              code: arrayToEnum_2.invalid_string,
              validation: { endsWith: check.value },
              message: check.message,
            }),
            r.dirty());
      } else if (check.kind === "datetime") {
        if (!Ye(check).test(e.data))
          ((a = this._getOrReturnCtx(e, a)),
            u(a, { code: arrayToEnum_2.invalid_string, validation: "datetime", message: check.message }),
            r.dirty());
      } else if (check.kind === "date") {
        if (!regExp.test(e.data))
          ((a = this._getOrReturnCtx(e, a)),
            u(a, { code: arrayToEnum_2.invalid_string, validation: "date", message: check.message }),
            r.dirty());
      } else if (check.kind === "time") {
        if (!Je(check).test(e.data))
          ((a = this._getOrReturnCtx(e, a)),
            u(a, { code: arrayToEnum_2.invalid_string, validation: "time", message: check.message }),
            r.dirty());
      } else if (check.kind === "duration") {
        if (!Ve.test(e.data))
          ((a = this._getOrReturnCtx(e, a)),
            u(a, { validation: "duration", code: arrayToEnum_2.invalid_string, message: check.message }),
            r.dirty());
      } else if (check.kind === "ip") {
        if (!He(e.data, check.version))
          ((a = this._getOrReturnCtx(e, a)),
            u(a, { validation: "ip", code: arrayToEnum_2.invalid_string, message: check.message }),
            r.dirty());
      } else if (check.kind === "jwt") {
        if (!Ge(e.data, check.alg))
          ((a = this._getOrReturnCtx(e, a)),
            u(a, { validation: "jwt", code: arrayToEnum_2.invalid_string, message: check.message }),
            r.dirty());
      } else if (check.kind === "cidr") {
        if (!Qe(e.data, check.version))
          ((a = this._getOrReturnCtx(e, a)),
            u(a, { validation: "cidr", code: arrayToEnum_2.invalid_string, message: check.message }),
            r.dirty());
      } else if (check.kind === "base64") {
        if (!Be.test(e.data))
          ((a = this._getOrReturnCtx(e, a)),
            u(a, { validation: "base64", code: arrayToEnum_2.invalid_string, message: check.message }),
            r.dirty());
      } else if (check.kind === "base64url") {
        if (!Ue.test(e.data))
          ((a = this._getOrReturnCtx(e, a)),
            u(a, { validation: "base64url", code: arrayToEnum_2.invalid_string, message: check.message }),
            r.dirty());
      } else g.assertNever(check);
    return { status: r.value, value: e.data };
  }
  _regex(e, t, r) {
    return this.refinement((a) => e.test(a), {
      validation: t,
      code: arrayToEnum_2.invalid_string,
      ...l.errToObj(r),
    });
  }
  _addCheck(e) {
    return new T({ ...this._def, checks: [...this._def.checks, e] });
  }
  email(e) {
    return this._addCheck({ kind: "email", ...l.errToObj(e) });
  }
  url(e) {
    return this._addCheck({ kind: "url", ...l.errToObj(e) });
  }
  emoji(e) {
    return this._addCheck({ kind: "emoji", ...l.errToObj(e) });
  }
  uuid(e) {
    return this._addCheck({ kind: "uuid", ...l.errToObj(e) });
  }
  nanoid(e) {
    return this._addCheck({ kind: "nanoid", ...l.errToObj(e) });
  }
  cuid(e) {
    return this._addCheck({ kind: "cuid", ...l.errToObj(e) });
  }
  cuid2(e) {
    return this._addCheck({ kind: "cuid2", ...l.errToObj(e) });
  }
  ulid(e) {
    return this._addCheck({ kind: "ulid", ...l.errToObj(e) });
  }
  base64(e) {
    return this._addCheck({ kind: "base64", ...l.errToObj(e) });
  }
  base64url(e) {
    return this._addCheck({ kind: "base64url", ...l.errToObj(e) });
  }
  jwt(e) {
    return this._addCheck({ kind: "jwt", ...l.errToObj(e) });
  }
  ip(e) {
    return this._addCheck({ kind: "ip", ...l.errToObj(e) });
  }
  cidr(e) {
    return this._addCheck({ kind: "cidr", ...l.errToObj(e) });
  }
  datetime(e) {
    if (typeof e === "string")
      return this._addCheck({ kind: "datetime", precision: null, offset: !1, local: !1, message: e });
    return this._addCheck({
      kind: "datetime",
      precision: typeof e?.precision > "u" ? null : e?.precision,
      offset: e?.offset ?? !1,
      local: e?.local ?? !1,
      ...l.errToObj(e?.message),
    });
  }
  date(e) {
    return this._addCheck({ kind: "date", message: e });
  }
  time(e) {
    if (typeof e === "string") return this._addCheck({ kind: "time", precision: null, message: e });
    return this._addCheck({
      kind: "time",
      precision: typeof e?.precision > "u" ? null : e?.precision,
      ...l.errToObj(e?.message),
    });
  }
  duration(e) {
    return this._addCheck({ kind: "duration", ...l.errToObj(e) });
  }
  regex(e, t) {
    return this._addCheck({ kind: "regex", regex: e, ...l.errToObj(t) });
  }
  includes(e, t) {
    return this._addCheck({ kind: "includes", value: e, position: t?.position, ...l.errToObj(t?.message) });
  }
  startsWith(e, t) {
    return this._addCheck({ kind: "startsWith", value: e, ...l.errToObj(t) });
  }
  endsWith(e, t) {
    return this._addCheck({ kind: "endsWith", value: e, ...l.errToObj(t) });
  }
  min(e, t) {
    return this._addCheck({ kind: "min", value: e, ...l.errToObj(t) });
  }
  max(e, t) {
    return this._addCheck({ kind: "max", value: e, ...l.errToObj(t) });
  }
  length(e, t) {
    return this._addCheck({ kind: "length", value: e, ...l.errToObj(t) });
  }
  nonempty(e) {
    return this.min(1, l.errToObj(e));
  }
  trim() {
    return new T({ ...this._def, checks: [...this._def.checks, { kind: "trim" }] });
  }
  toLowerCase() {
    return new T({ ...this._def, checks: [...this._def.checks, { kind: "toLowerCase" }] });
  }
  toUpperCase() {
    return new T({ ...this._def, checks: [...this._def.checks, { kind: "toUpperCase" }] });
  }
  get isDatetime() {
    return !!this._def.checks.find((check) => check.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((check) => check.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((check) => check.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((check) => check.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((check) => check.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((check) => check.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((check) => check.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((check) => check.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((check) => check.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((check) => check.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((check) => check.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((check) => check.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((check) => check.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((check) => check.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((check) => check.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((check) => check.kind === "base64url");
  }
  get minLength() {
    let e = null;
    for (let check of this._def.checks)
      if (check.kind === "min") {
        if (e === null || check.value > e) e = check.value;
      }
    return e;
  }
  get maxLength() {
    let e = null;
    for (let check of this._def.checks)
      if (check.kind === "max") {
        if (e === null || check.value < e) e = check.value;
      }
    return e;
  }
}
//@ chunk-j2t139r9.js:26110-26193 esm-fingerprint
T.create = (e) =>
  new T({ checks: [], typeName: ZodFirstPartyTypeKind.ZodString, coerce: e?.coerce ?? !1, ...m(e) });
/**
 * 浮点安全取模（zod multipleOf 用）。第三方 zod 内部。
 */
//@ chunk-j2t139r9.js:26193-26421 esm-fingerprint
function floatSafeRemainder(e, t) {
  let r = (e.toString().split(".")[1] || "").length,
    a = (t.toString().split(".")[1] || "").length,
    s = r > a ? r : a,
    int = Number.parseInt(e.toFixed(s).replace(".", "")),
    int_2 = Number.parseInt(t.toFixed(s).replace(".", ""));
  return (int % int_2) / 10 ** s;
}
//@ chunk-j2t139r9.js:26421-29570 esm-fingerprint
class D extends _ {
  constructor() {
    super(...arguments);
    ((this.min = this.gte), (this.max = this.lte), (this.step = this.multipleOf));
  }
  _parse(e) {
    if (this._def.coerce) e.data = Number(e.data);
    if (this._getType(e) !== arrayToEnum.number) {
      let _getOrReturnCtx = this._getOrReturnCtx(e);
      return (
        u(_getOrReturnCtx, {
          code: arrayToEnum_2.invalid_type,
          expected: arrayToEnum.number,
          received: _getOrReturnCtx.parsedType,
        }),
        freeze
      );
    }
    let r = void 0,
      a = new v();
    for (let check of this._def.checks)
      if (check.kind === "int") {
        if (!g.isInteger(e.data))
          ((r = this._getOrReturnCtx(e, r)),
            u(r, {
              code: arrayToEnum_2.invalid_type,
              expected: "integer",
              received: "float",
              message: check.message,
            }),
            a.dirty());
      } else if (check.kind === "min") {
        if (check.inclusive ? e.data < check.value : e.data <= check.value)
          ((r = this._getOrReturnCtx(e, r)),
            u(r, {
              code: arrayToEnum_2.too_small,
              minimum: check.value,
              type: "number",
              inclusive: check.inclusive,
              exact: !1,
              message: check.message,
            }),
            a.dirty());
      } else if (check.kind === "max") {
        if (check.inclusive ? e.data > check.value : e.data >= check.value)
          ((r = this._getOrReturnCtx(e, r)),
            u(r, {
              code: arrayToEnum_2.too_big,
              maximum: check.value,
              type: "number",
              inclusive: check.inclusive,
              exact: !1,
              message: check.message,
            }),
            a.dirty());
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(e.data, check.value) !== 0)
          ((r = this._getOrReturnCtx(e, r)),
            u(r, { code: arrayToEnum_2.not_multiple_of, multipleOf: check.value, message: check.message }),
            a.dirty());
      } else if (check.kind === "finite") {
        if (!Number.isFinite(e.data))
          ((r = this._getOrReturnCtx(e, r)),
            u(r, { code: arrayToEnum_2.not_finite, message: check.message }),
            a.dirty());
      } else g.assertNever(check);
    return { status: a.value, value: e.data };
  }
  gte(e, t) {
    return this.setLimit("min", e, !0, l.toString(t));
  }
  gt(e, t) {
    return this.setLimit("min", e, !1, l.toString(t));
  }
  lte(e, t) {
    return this.setLimit("max", e, !0, l.toString(t));
  }
  lt(e, t) {
    return this.setLimit("max", e, !1, l.toString(t));
  }
  setLimit(e, t, r, a) {
    return new D({
      ...this._def,
      checks: [...this._def.checks, { kind: e, value: t, inclusive: r, message: l.toString(a) }],
    });
  }
  _addCheck(e) {
    return new D({ ...this._def, checks: [...this._def.checks, e] });
  }
  int(e) {
    return this._addCheck({ kind: "int", message: l.toString(e) });
  }
  positive(e) {
    return this._addCheck({ kind: "min", value: 0, inclusive: !1, message: l.toString(e) });
  }
  negative(e) {
    return this._addCheck({ kind: "max", value: 0, inclusive: !1, message: l.toString(e) });
  }
  nonpositive(e) {
    return this._addCheck({ kind: "max", value: 0, inclusive: !0, message: l.toString(e) });
  }
  nonnegative(e) {
    return this._addCheck({ kind: "min", value: 0, inclusive: !0, message: l.toString(e) });
  }
  multipleOf(e, t) {
    return this._addCheck({ kind: "multipleOf", value: e, message: l.toString(t) });
  }
  finite(e) {
    return this._addCheck({ kind: "finite", message: l.toString(e) });
  }
  safe(e) {
    return this._addCheck({
      kind: "min",
      inclusive: !0,
      value: Number.MIN_SAFE_INTEGER,
      message: l.toString(e),
    })._addCheck({ kind: "max", inclusive: !0, value: Number.MAX_SAFE_INTEGER, message: l.toString(e) });
  }
  get minValue() {
    let e = null;
    for (let check of this._def.checks)
      if (check.kind === "min") {
        if (e === null || check.value > e) e = check.value;
      }
    return e;
  }
  get maxValue() {
    let e = null;
    for (let check of this._def.checks)
      if (check.kind === "max") {
        if (e === null || check.value < e) e = check.value;
      }
    return e;
  }
  get isInt() {
    return !!this._def.checks.find(
      (check) => check.kind === "int" || (check.kind === "multipleOf" && g.isInteger(check.value)),
    );
  }
  get isFinite() {
    let e = null,
      t = null;
    for (let check of this._def.checks)
      if (check.kind === "finite" || check.kind === "int" || check.kind === "multipleOf") return !0;
      else if (check.kind === "min") {
        if (t === null || check.value > t) t = check.value;
      } else if (check.kind === "max") {
        if (e === null || check.value < e) e = check.value;
      }
    return Number.isFinite(t) && Number.isFinite(e);
  }
}
//@ chunk-j2t139r9.js:29570-29653 esm-fingerprint
D.create = (e) =>
  new D({ checks: [], typeName: ZodFirstPartyTypeKind.ZodNumber, coerce: e?.coerce || !1, ...m(e) });
//@ chunk-j2t139r9.js:29653-31848 esm-fingerprint
class z extends _ {
  constructor() {
    super(...arguments);
    ((this.min = this.gte), (this.max = this.lte));
  }
  _parse(e) {
    if (this._def.coerce)
      try {
        e.data = BigInt(e.data);
      } catch {
        return this._getInvalidInput(e);
      }
    if (this._getType(e) !== arrayToEnum.bigint) return this._getInvalidInput(e);
    let r = void 0,
      a = new v();
    for (let check of this._def.checks)
      if (check.kind === "min") {
        if (check.inclusive ? e.data < check.value : e.data <= check.value)
          ((r = this._getOrReturnCtx(e, r)),
            u(r, {
              code: arrayToEnum_2.too_small,
              type: "bigint",
              minimum: check.value,
              inclusive: check.inclusive,
              message: check.message,
            }),
            a.dirty());
      } else if (check.kind === "max") {
        if (check.inclusive ? e.data > check.value : e.data >= check.value)
          ((r = this._getOrReturnCtx(e, r)),
            u(r, {
              code: arrayToEnum_2.too_big,
              type: "bigint",
              maximum: check.value,
              inclusive: check.inclusive,
              message: check.message,
            }),
            a.dirty());
      } else if (check.kind === "multipleOf") {
        if (e.data % check.value !== BigInt(0))
          ((r = this._getOrReturnCtx(e, r)),
            u(r, { code: arrayToEnum_2.not_multiple_of, multipleOf: check.value, message: check.message }),
            a.dirty());
      } else g.assertNever(check);
    return { status: a.value, value: e.data };
  }
  _getInvalidInput(e) {
    let _getOrReturnCtx = this._getOrReturnCtx(e);
    return (
      u(_getOrReturnCtx, {
        code: arrayToEnum_2.invalid_type,
        expected: arrayToEnum.bigint,
        received: _getOrReturnCtx.parsedType,
      }),
      freeze
    );
  }
  gte(e, t) {
    return this.setLimit("min", e, !0, l.toString(t));
  }
  gt(e, t) {
    return this.setLimit("min", e, !1, l.toString(t));
  }
  lte(e, t) {
    return this.setLimit("max", e, !0, l.toString(t));
  }
  lt(e, t) {
    return this.setLimit("max", e, !1, l.toString(t));
  }
  setLimit(e, t, r, a) {
    return new z({
      ...this._def,
      checks: [...this._def.checks, { kind: e, value: t, inclusive: r, message: l.toString(a) }],
    });
  }
  _addCheck(e) {
    return new z({ ...this._def, checks: [...this._def.checks, e] });
  }
  positive(e) {
    return this._addCheck({ kind: "min", value: BigInt(0), inclusive: !1, message: l.toString(e) });
  }
  negative(e) {
    return this._addCheck({ kind: "max", value: BigInt(0), inclusive: !1, message: l.toString(e) });
  }
  nonpositive(e) {
    return this._addCheck({ kind: "max", value: BigInt(0), inclusive: !0, message: l.toString(e) });
  }
  nonnegative(e) {
    return this._addCheck({ kind: "min", value: BigInt(0), inclusive: !0, message: l.toString(e) });
  }
  multipleOf(e, t) {
    return this._addCheck({ kind: "multipleOf", value: e, message: l.toString(t) });
  }
  get minValue() {
    let e = null;
    for (let check of this._def.checks)
      if (check.kind === "min") {
        if (e === null || check.value > e) e = check.value;
      }
    return e;
  }
  get maxValue() {
    let e = null;
    for (let check of this._def.checks)
      if (check.kind === "max") {
        if (e === null || check.value < e) e = check.value;
      }
    return e;
  }
}
//@ chunk-j2t139r9.js:31848-31931 esm-fingerprint
z.create = (e) =>
  new z({ checks: [], typeName: ZodFirstPartyTypeKind.ZodBigInt, coerce: e?.coerce ?? !1, ...m(e) });
//@ chunk-j2t139r9.js:31931-32161 esm-fingerprint
class G extends _ {
  _parse(e) {
    if (this._def.coerce) e.data = Boolean(e.data);
    if (this._getType(e) !== arrayToEnum.boolean) {
      let _getOrReturnCtx = this._getOrReturnCtx(e);
      return (
        u(_getOrReturnCtx, {
          code: arrayToEnum_2.invalid_type,
          expected: arrayToEnum.boolean,
          received: _getOrReturnCtx.parsedType,
        }),
        freeze
      );
    }
    return x(e.data);
  }
}
//@ chunk-j2t139r9.js:32161-32235 esm-fingerprint
G.create = (e) => new G({ typeName: ZodFirstPartyTypeKind.ZodBoolean, coerce: e?.coerce || !1, ...m(e) });
//@ chunk-j2t139r9.js:32235-33554 esm-fingerprint
class W extends _ {
  _parse(e) {
    if (this._def.coerce) e.data = new Date(e.data);
    if (this._getType(e) !== arrayToEnum.date) {
      let _getOrReturnCtx = this._getOrReturnCtx(e);
      return (
        u(_getOrReturnCtx, {
          code: arrayToEnum_2.invalid_type,
          expected: arrayToEnum.date,
          received: _getOrReturnCtx.parsedType,
        }),
        freeze
      );
    }
    if (Number.isNaN(e.data.getTime())) {
      let _getOrReturnCtx = this._getOrReturnCtx(e);
      return (u(_getOrReturnCtx, { code: arrayToEnum_2.invalid_date }), freeze);
    }
    let r = new v(),
      a = void 0;
    for (let check of this._def.checks)
      if (check.kind === "min") {
        if (e.data.getTime() < check.value)
          ((a = this._getOrReturnCtx(e, a)),
            u(a, {
              code: arrayToEnum_2.too_small,
              message: check.message,
              inclusive: !0,
              exact: !1,
              minimum: check.value,
              type: "date",
            }),
            r.dirty());
      } else if (check.kind === "max") {
        if (e.data.getTime() > check.value)
          ((a = this._getOrReturnCtx(e, a)),
            u(a, {
              code: arrayToEnum_2.too_big,
              message: check.message,
              inclusive: !0,
              exact: !1,
              maximum: check.value,
              type: "date",
            }),
            r.dirty());
      } else g.assertNever(check);
    return { status: r.value, value: new Date(e.data.getTime()) };
  }
  _addCheck(e) {
    return new W({ ...this._def, checks: [...this._def.checks, e] });
  }
  min(e, t) {
    return this._addCheck({ kind: "min", value: e.getTime(), message: l.toString(t) });
  }
  max(e, t) {
    return this._addCheck({ kind: "max", value: e.getTime(), message: l.toString(t) });
  }
  get minDate() {
    let e = null;
    for (let check of this._def.checks)
      if (check.kind === "min") {
        if (e === null || check.value > e) e = check.value;
      }
    return e != null ? new Date(e) : null;
  }
  get maxDate() {
    let e = null;
    for (let check of this._def.checks)
      if (check.kind === "max") {
        if (e === null || check.value < e) e = check.value;
      }
    return e != null ? new Date(e) : null;
  }
}
//@ chunk-j2t139r9.js:33554-33635 esm-fingerprint
W.create = (e) =>
  new W({ checks: [], coerce: e?.coerce || !1, typeName: ZodFirstPartyTypeKind.ZodDate, ...m(e) });
//@ chunk-j2t139r9.js:33635-33821 esm-fingerprint
class ce extends _ {
  _parse(e) {
    if (this._getType(e) !== arrayToEnum.symbol) {
      let _getOrReturnCtx = this._getOrReturnCtx(e);
      return (
        u(_getOrReturnCtx, {
          code: arrayToEnum_2.invalid_type,
          expected: arrayToEnum.symbol,
          received: _getOrReturnCtx.parsedType,
        }),
        freeze
      );
    }
    return x(e.data);
  }
}
//@ chunk-j2t139r9.js:33821-33875 esm-fingerprint
ce.create = (e) => new ce({ typeName: ZodFirstPartyTypeKind.ZodSymbol, ...m(e) });
//@ chunk-j2t139r9.js:33875-34066 esm-fingerprint
class Q extends _ {
  _parse(e) {
    if (this._getType(e) !== arrayToEnum.undefined) {
      let _getOrReturnCtx = this._getOrReturnCtx(e);
      return (
        u(_getOrReturnCtx, {
          code: arrayToEnum_2.invalid_type,
          expected: arrayToEnum.undefined,
          received: _getOrReturnCtx.parsedType,
        }),
        freeze
      );
    }
    return x(e.data);
  }
}
//@ chunk-j2t139r9.js:34066-34121 esm-fingerprint
Q.create = (e) => new Q({ typeName: ZodFirstPartyTypeKind.ZodUndefined, ...m(e) });
//@ chunk-j2t139r9.js:34121-34302 esm-fingerprint
class X extends _ {
  _parse(e) {
    if (this._getType(e) !== arrayToEnum.null) {
      let _getOrReturnCtx = this._getOrReturnCtx(e);
      return (
        u(_getOrReturnCtx, {
          code: arrayToEnum_2.invalid_type,
          expected: arrayToEnum.null,
          received: _getOrReturnCtx.parsedType,
        }),
        freeze
      );
    }
    return x(e.data);
  }
}
//@ chunk-j2t139r9.js:34302-34352 esm-fingerprint
X.create = (e) => new X({ typeName: ZodFirstPartyTypeKind.ZodNull, ...m(e) });
//@ chunk-j2t139r9.js:34352-34445 esm-fingerprint
class B extends _ {
  constructor() {
    super(...arguments);
    this._any = !0;
  }
  _parse(e) {
    return x(e.data);
  }
}
//@ chunk-j2t139r9.js:34445-34494 esm-fingerprint
B.create = (e) => new B({ typeName: ZodFirstPartyTypeKind.ZodAny, ...m(e) });
//@ chunk-j2t139r9.js:34494-34591 esm-fingerprint
class V extends _ {
  constructor() {
    super(...arguments);
    this._unknown = !0;
  }
  _parse(e) {
    return x(e.data);
  }
}
//@ chunk-j2t139r9.js:34591-34644 esm-fingerprint
V.create = (e) => new V({ typeName: ZodFirstPartyTypeKind.ZodUnknown, ...m(e) });
//@ chunk-j2t139r9.js:34644-34779 esm-fingerprint
class j extends _ {
  _parse(e) {
    let _getOrReturnCtx = this._getOrReturnCtx(e);
    return (
      u(_getOrReturnCtx, {
        code: arrayToEnum_2.invalid_type,
        expected: arrayToEnum.never,
        received: _getOrReturnCtx.parsedType,
      }),
      freeze
    );
  }
}
//@ chunk-j2t139r9.js:34779-34830 esm-fingerprint
j.create = (e) => new j({ typeName: ZodFirstPartyTypeKind.ZodNever, ...m(e) });
//@ chunk-j2t139r9.js:34830-35017 esm-fingerprint
class oe extends _ {
  _parse(e) {
    if (this._getType(e) !== arrayToEnum.undefined) {
      let _getOrReturnCtx = this._getOrReturnCtx(e);
      return (
        u(_getOrReturnCtx, {
          code: arrayToEnum_2.invalid_type,
          expected: arrayToEnum.void,
          received: _getOrReturnCtx.parsedType,
        }),
        freeze
      );
    }
    return x(e.data);
  }
}
//@ chunk-j2t139r9.js:35017-35069 esm-fingerprint
oe.create = (e) => new oe({ typeName: ZodFirstPartyTypeKind.ZodVoid, ...m(e) });
//@ chunk-j2t139r9.js:35069-36457 esm-fingerprint
class C extends _ {
  _parse(e) {
    let { ctx: ctx, status: status } = this._processInputParams(e),
      _def = this._def;
    if (ctx.parsedType !== arrayToEnum.array)
      return (
        u(ctx, { code: arrayToEnum_2.invalid_type, expected: arrayToEnum.array, received: ctx.parsedType }),
        freeze
      );
    if (_def.exactLength !== null) {
      let i = ctx.data.length > _def.exactLength.value,
        n = ctx.data.length < _def.exactLength.value;
      if (i || n)
        (u(ctx, {
          code: i ? arrayToEnum_2.too_big : arrayToEnum_2.too_small,
          minimum: n ? _def.exactLength.value : void 0,
          maximum: i ? _def.exactLength.value : void 0,
          type: "array",
          inclusive: !0,
          exact: !0,
          message: _def.exactLength.message,
        }),
          status.dirty());
    }
    if (_def.minLength !== null) {
      if (ctx.data.length < _def.minLength.value)
        (u(ctx, {
          code: arrayToEnum_2.too_small,
          minimum: _def.minLength.value,
          type: "array",
          inclusive: !0,
          exact: !1,
          message: _def.minLength.message,
        }),
          status.dirty());
    }
    if (_def.maxLength !== null) {
      if (ctx.data.length > _def.maxLength.value)
        (u(ctx, {
          code: arrayToEnum_2.too_big,
          maximum: _def.maxLength.value,
          type: "array",
          inclusive: !0,
          exact: !1,
          message: _def.maxLength.message,
        }),
          status.dirty());
    }
    if (ctx.common.async)
      return Promise.all([...ctx.data].map((i, n) => _def.type._parseAsync(new w(ctx, i, ctx.path, n)))).then(
        (i) => v.mergeArray(status, i),
      );
    let mapped = [...ctx.data].map((i, n) => _def.type._parseSync(new w(ctx, i, ctx.path, n)));
    return v.mergeArray(status, mapped);
  }
  get element() {
    return this._def.type;
  }
  min(e, t) {
    return new C({ ...this._def, minLength: { value: e, message: l.toString(t) } });
  }
  max(e, t) {
    return new C({ ...this._def, maxLength: { value: e, message: l.toString(t) } });
  }
  length(e, t) {
    return new C({ ...this._def, exactLength: { value: e, message: l.toString(t) } });
  }
  nonempty(e) {
    return this.min(1, e);
  }
}
//@ chunk-j2t139r9.js:36457-36564 esm-fingerprint
C.create = (e, t) =>
  new C({
    type: e,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...m(t),
  });
//@ chunk-j2t139r9.js:36564-36955 esm-fingerprint
function F(e) {
  if (e instanceof y) {
    let t = {};
    for (let key in e.shape) {
      let a = e.shape[key];
      t[key] = S.create(F(a));
    }
    return new y({ ...e._def, shape: () => t });
  } else if (e instanceof C) return new C({ ...e._def, type: F(e.element) });
  else if (e instanceof S) return S.create(F(e.unwrap()));
  else if (e instanceof E) return E.create(F(e.unwrap()));
  else if (e instanceof I) return I.create(e.items.map((item) => F(item)));
  else return e;
}
//@ chunk-j2t139r9.js:36955-39932 esm-fingerprint
class y extends _ {
  constructor() {
    super(...arguments);
    ((this._cached = null), (this.nonstrict = this.passthrough), (this.augment = this.extend));
  }
  _getCached() {
    if (this._cached !== null) return this._cached;
    let shape = this._def.shape(),
      objectKeys = g.objectKeys(shape);
    return ((this._cached = { shape: shape, keys: objectKeys }), this._cached);
  }
  _parse(e) {
    if (this._getType(e) !== arrayToEnum.object) {
      let _getOrReturnCtx = this._getOrReturnCtx(e);
      return (
        u(_getOrReturnCtx, {
          code: arrayToEnum_2.invalid_type,
          expected: arrayToEnum.object,
          received: _getOrReturnCtx.parsedType,
        }),
        freeze
      );
    }
    let { status: status, ctx: ctx } = this._processInputParams(e),
      { shape: shape, keys: keys } = this._getCached(),
      n = [];
    if (!(this._def.catchall instanceof j && this._def.unknownKeys === "strip")) {
      for (let key in ctx.data) if (!keys.includes(key)) n.push(key);
    }
    let c = [];
    for (let o of keys) {
      let p = shape[o],
        b = ctx.data[o];
      c.push({
        key: { status: "valid", value: o },
        value: p._parse(new w(ctx, b, ctx.path, o)),
        alwaysSet: o in ctx.data,
      });
    }
    if (this._def.catchall instanceof j) {
      let unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough")
        for (let p of n)
          c.push({ key: { status: "valid", value: p }, value: { status: "valid", value: ctx.data[p] } });
      else if (unknownKeys === "strict") {
        if (n.length > 0) (u(ctx, { code: arrayToEnum_2.unrecognized_keys, keys: n }), status.dirty());
      } else if (unknownKeys === "strip");
      else throw Error("Internal ZodObject error: invalid unknownKeys value.");
    } else {
      let catchall = this._def.catchall;
      for (let p of n) {
        let b = ctx.data[p];
        c.push({
          key: { status: "valid", value: p },
          value: catchall._parse(new w(ctx, b, ctx.path, p)),
          alwaysSet: p in ctx.data,
        });
      }
    }
    if (ctx.common.async)
      return Promise.resolve()
        .then(async () => {
          let o = [];
          for (let p of c) {
            let key = await p.key,
              ke = await p.value;
            o.push({ key: key, value: ke, alwaysSet: p.alwaysSet });
          }
          return o;
        })
        .then((o) => v.mergeObjectSync(status, o));
    else return v.mergeObjectSync(status, c);
  }
  get shape() {
    return this._def.shape();
  }
  strict(e) {
    return (
      l.errToObj,
      new y({
        ...this._def,
        unknownKeys: "strict",
        ...(e !== void 0
          ? {
              errorMap: (t, r) => {
                let a = this._def.errorMap?.(t, r).message ?? r.defaultError;
                if (t.code === "unrecognized_keys") return { message: l.errToObj(e).message ?? a };
                return { message: a };
              },
            }
          : {}),
      })
    );
  }
  strip() {
    return new y({ ...this._def, unknownKeys: "strip" });
  }
  passthrough() {
    return new y({ ...this._def, unknownKeys: "passthrough" });
  }
  extend(e) {
    return new y({ ...this._def, shape: () => ({ ...this._def.shape(), ...e }) });
  }
  merge(e) {
    return new y({
      unknownKeys: e._def.unknownKeys,
      catchall: e._def.catchall,
      shape: () => ({ ...this._def.shape(), ...e._def.shape() }),
      typeName: ZodFirstPartyTypeKind.ZodObject,
    });
  }
  setKey(e, t) {
    return this.augment({ [e]: t });
  }
  catchall(e) {
    return new y({ ...this._def, catchall: e });
  }
  pick(e) {
    let t = {};
    for (let r of g.objectKeys(e)) if (e[r] && this.shape[r]) t[r] = this.shape[r];
    return new y({ ...this._def, shape: () => t });
  }
  omit(e) {
    let t = {};
    for (let r of g.objectKeys(this.shape)) if (!e[r]) t[r] = this.shape[r];
    return new y({ ...this._def, shape: () => t });
  }
  deepPartial() {
    return F(this);
  }
  partial(e) {
    let t = {};
    for (let r of g.objectKeys(this.shape)) {
      let a = this.shape[r];
      if (e && !e[r]) t[r] = a;
      else t[r] = a.optional();
    }
    return new y({ ...this._def, shape: () => t });
  }
  required(e) {
    let t = {};
    for (let r of g.objectKeys(this.shape))
      if (e && !e[r]) t[r] = this.shape[r];
      else {
        let s = this.shape[r];
        while (s instanceof S) s = s._def.innerType;
        t[r] = s;
      }
    return new y({ ...this._def, shape: () => t });
  }
  keyof() {
    return Ae(g.objectKeys(this.shape));
  }
}
//@ chunk-j2t139r9.js:39932-40038 esm-fingerprint
y.create = (e, t) =>
  new y({
    shape: () => e,
    unknownKeys: "strip",
    catchall: j.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...m(t),
  });
//@ chunk-j2t139r9.js:40038-40151 esm-fingerprint
y.strictCreate = (e, t) =>
  new y({
    shape: () => e,
    unknownKeys: "strict",
    catchall: j.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...m(t),
  });
//@ chunk-j2t139r9.js:40151-40257 esm-fingerprint
y.lazycreate = (e, t) =>
  new y({
    shape: e,
    unknownKeys: "strip",
    catchall: j.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...m(t),
  });
//@ chunk-j2t139r9.js:40257-41281 esm-fingerprint
class K extends _ {
  _parse(e) {
    let { ctx: ctx } = this._processInputParams(e),
      options = this._def.options;
    function a(s) {
      for (let n of s) if (n.result.status === "valid") return n.result;
      for (let n of s)
        if (n.result.status === "dirty") return (ctx.common.issues.push(...n.ctx.common.issues), n.result);
      let mapped = s.map((n) => new ZodError(n.ctx.common.issues));
      return (u(ctx, { code: arrayToEnum_2.invalid_union, unionErrors: mapped }), freeze);
    }
    if (ctx.common.async)
      return Promise.all(
        options.map(async (s) => {
          let i = { ...ctx, common: { ...ctx.common, issues: [] }, parent: null };
          return { result: await s._parseAsync({ data: ctx.data, path: ctx.path, parent: i }), ctx: i };
        }),
      ).then(a);
    else {
      let s = void 0,
        i = [];
      for (let c of options) {
        let o = { ...ctx, common: { ...ctx.common, issues: [] }, parent: null },
          _parseSync = c._parseSync({ data: ctx.data, path: ctx.path, parent: o });
        if (_parseSync.status === "valid") return _parseSync;
        else if (_parseSync.status === "dirty" && !s) s = { result: _parseSync, ctx: o };
        if (o.common.issues.length) i.push(o.common.issues);
      }
      if (s) return (ctx.common.issues.push(...s.ctx.common.issues), s.result);
      let mapped = i.map((c) => new ZodError(c));
      return (u(ctx, { code: arrayToEnum_2.invalid_union, unionErrors: mapped }), freeze);
    }
  }
  get options() {
    return this._def.options;
  }
}
//@ chunk-j2t139r9.js:41281-41344 esm-fingerprint
K.create = (e, t) => new K({ options: e, typeName: ZodFirstPartyTypeKind.ZodUnion, ...m(t) });
//@ chunk-j2t139r9.js:41344-41964 esm-fingerprint
var R = (e) => {
  if (e instanceof ee) return R(e.schema);
  else if (e instanceof A) return R(e.innerType());
  else if (e instanceof te) return [e.value];
  else if (e instanceof P) return e.options;
  else if (e instanceof re) return g.objectValues(e.enum);
  else if (e instanceof se) return R(e._def.innerType);
  else if (e instanceof Q) return [void 0];
  else if (e instanceof X) return [null];
  else if (e instanceof S) return [void 0, ...R(e.unwrap())];
  else if (e instanceof E) return [null, ...R(e.unwrap())];
  else if (e instanceof xe) return R(e.unwrap());
  else if (e instanceof ne) return R(e.unwrap());
  else if (e instanceof ae) return R(e._def.innerType);
  else return [];
};
//@ chunk-j2t139r9.js:41964-42986 esm-fingerprint
class ve extends _ {
  _parse(e) {
    let { ctx: ctx } = this._processInputParams(e);
    if (ctx.parsedType !== arrayToEnum.object)
      return (
        u(ctx, { code: arrayToEnum_2.invalid_type, expected: arrayToEnum.object, received: ctx.parsedType }),
        freeze
      );
    let discriminator = this.discriminator,
      a = ctx.data[discriminator],
      s = this.optionsMap.get(a);
    if (!s)
      return (
        u(ctx, {
          code: arrayToEnum_2.invalid_union_discriminator,
          options: Array.from(this.optionsMap.keys()),
          path: [discriminator],
        }),
        freeze
      );
    if (ctx.common.async) return s._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx });
    else return s._parseSync({ data: ctx.data, path: ctx.path, parent: ctx });
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  static create(e, t, r) {
    let a = new Map();
    for (let s of t) {
      let i = R(s.shape[e]);
      if (!i.length)
        throw Error(`A discriminator value for key \`${e}\` could not be extracted from all schema options`);
      for (let n of i) {
        if (a.has(n)) throw Error(`Discriminator property ${String(e)} has duplicate value ${String(n)}`);
        a.set(n, s);
      }
    }
    return new ve({
      typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
      discriminator: e,
      options: t,
      optionsMap: a,
      ...m(r),
    });
  }
}
//@ chunk-j2t139r9.js:42986-43671 esm-fingerprint
function ye(e, t) {
  let r = O(e),
    a = O(t);
  if (e === t) return { valid: !0, data: e };
  else if (r === arrayToEnum.object && a === arrayToEnum.object) {
    let objectKeys = g.objectKeys(t),
      filtered = g.objectKeys(e).filter((c) => objectKeys.indexOf(c) !== -1),
      n = { ...e, ...t };
    if (Object.prototype.hasOwnProperty.call(n, "__proto__")) delete n.__proto__;
    for (let c of filtered) {
      if (c === "__proto__") continue;
      let o = ye(e[c], t[c]);
      if (!o.valid) return { valid: !1 };
      n[c] = o.data;
    }
    return { valid: !0, data: n };
  } else if (r === arrayToEnum.array && a === arrayToEnum.array) {
    if (e.length !== t.length) return { valid: !1 };
    let s = [];
    for (let i = 0; i < e.length; i++) {
      let n = e[i],
        c = t[i],
        o = ye(n, c);
      if (!o.valid) return { valid: !1 };
      s.push(o.data);
    }
    return { valid: !0, data: s };
  } else if (r === arrayToEnum.date && a === arrayToEnum.date && +e === +t) return { valid: !0, data: e };
  else return { valid: !1 };
}
//@ chunk-j2t139r9.js:43671-44264 esm-fingerprint
class Z extends _ {
  _parse(e) {
    let { status: status, ctx: ctx } = this._processInputParams(e),
      a = (s, i) => {
        if (pe(s) || pe(i)) return freeze;
        let n = ye(s.value, i.value);
        if (!n.valid) return (u(ctx, { code: arrayToEnum_2.invalid_intersection_types }), freeze);
        if (_e(s) || _e(i)) status.dirty();
        return { status: status.value, value: n.data };
      };
    if (ctx.common.async)
      return Promise.all([
        this._def.left._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }),
        this._def.right._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }),
      ]).then(([s, i]) => a(s, i));
    else
      return a(
        this._def.left._parseSync({ data: ctx.data, path: ctx.path, parent: ctx }),
        this._def.right._parseSync({ data: ctx.data, path: ctx.path, parent: ctx }),
      );
  }
}
//@ chunk-j2t139r9.js:44264-44341 esm-fingerprint
Z.create = (e, t, r) =>
  new Z({ left: e, right: t, typeName: ZodFirstPartyTypeKind.ZodIntersection, ...m(r) });
//@ chunk-j2t139r9.js:44341-45139 esm-fingerprint
class I extends _ {
  _parse(e) {
    let { status: status, ctx: ctx } = this._processInputParams(e);
    if (ctx.parsedType !== arrayToEnum.array)
      return (
        u(ctx, { code: arrayToEnum_2.invalid_type, expected: arrayToEnum.array, received: ctx.parsedType }),
        freeze
      );
    if (ctx.data.length < this._def.items.length)
      return (
        u(ctx, {
          code: arrayToEnum_2.too_small,
          minimum: this._def.items.length,
          inclusive: !0,
          exact: !1,
          type: "array",
        }),
        freeze
      );
    if (!this._def.rest && ctx.data.length > this._def.items.length)
      (u(ctx, {
        code: arrayToEnum_2.too_big,
        maximum: this._def.items.length,
        inclusive: !0,
        exact: !1,
        type: "array",
      }),
        status.dirty());
    let filtered = [...ctx.data]
      .map((i, n) => {
        let c = this._def.items[n] || this._def.rest;
        if (!c) return null;
        return c._parse(new w(ctx, i, ctx.path, n));
      })
      .filter((i) => !!i);
    if (ctx.common.async) return Promise.all(filtered).then((i) => v.mergeArray(status, i));
    else return v.mergeArray(status, filtered);
  }
  get items() {
    return this._def.items;
  }
  rest(e) {
    return new I({ ...this._def, rest: e });
  }
}
//@ chunk-j2t139r9.js:45139-45309 esm-fingerprint
I.create = (e, t) => {
  if (!Array.isArray(e)) throw Error("You must pass an array of schemas to z.tuple([ ... ])");
  return new I({ items: e, typeName: ZodFirstPartyTypeKind.ZodTuple, rest: null, ...m(t) });
};
//@ chunk-j2t139r9.js:45309-46067 esm-fingerprint
class ue extends _ {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(e) {
    let { status: status, ctx: ctx } = this._processInputParams(e);
    if (ctx.parsedType !== arrayToEnum.object)
      return (
        u(ctx, { code: arrayToEnum_2.invalid_type, expected: arrayToEnum.object, received: ctx.parsedType }),
        freeze
      );
    let a = [],
      keyType = this._def.keyType,
      valueType = this._def.valueType;
    for (let key in ctx.data)
      a.push({
        key: keyType._parse(new w(ctx, key, ctx.path, key)),
        value: valueType._parse(new w(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data,
      });
    if (ctx.common.async) return v.mergeObjectAsync(status, a);
    else return v.mergeObjectSync(status, a);
  }
  get element() {
    return this._def.valueType;
  }
  static create(e, t, r) {
    if (t instanceof _)
      return new ue({ keyType: e, valueType: t, typeName: ZodFirstPartyTypeKind.ZodRecord, ...m(r) });
    return new ue({ keyType: T.create(), valueType: e, typeName: ZodFirstPartyTypeKind.ZodRecord, ...m(t) });
  }
}
//@ chunk-j2t139r9.js:46067-47011 esm-fingerprint
class de extends _ {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(e) {
    let { status: status, ctx: ctx } = this._processInputParams(e);
    if (ctx.parsedType !== arrayToEnum.map)
      return (
        u(ctx, { code: arrayToEnum_2.invalid_type, expected: arrayToEnum.map, received: ctx.parsedType }),
        freeze
      );
    let keyType = this._def.keyType,
      valueType = this._def.valueType,
      mapped = [...ctx.data.entries()].map(([n, c], o) => ({
        key: keyType._parse(new w(ctx, n, ctx.path, [o, "key"])),
        value: valueType._parse(new w(ctx, c, ctx.path, [o, "value"])),
      }));
    if (ctx.common.async) {
      let n = new Map();
      return Promise.resolve().then(async () => {
        for (let c of mapped) {
          let key = await c.key,
            p = await c.value;
          if (key.status === "aborted" || p.status === "aborted") return freeze;
          if (key.status === "dirty" || p.status === "dirty") status.dirty();
          n.set(key.value, p.value);
        }
        return { status: status.value, value: n };
      });
    } else {
      let n = new Map();
      for (let c of mapped) {
        let { key: key, value: p } = c;
        if (key.status === "aborted" || p.status === "aborted") return freeze;
        if (key.status === "dirty" || p.status === "dirty") status.dirty();
        n.set(key.value, p.value);
      }
      return { status: status.value, value: n };
    }
  }
}
//@ chunk-j2t139r9.js:47011-47088 esm-fingerprint
de.create = (e, t, r) =>
  new de({ valueType: t, keyType: e, typeName: ZodFirstPartyTypeKind.ZodMap, ...m(r) });
//@ chunk-j2t139r9.js:47088-48169 esm-fingerprint
class U extends _ {
  _parse(e) {
    let { status: status, ctx: ctx } = this._processInputParams(e);
    if (ctx.parsedType !== arrayToEnum.set)
      return (
        u(ctx, { code: arrayToEnum_2.invalid_type, expected: arrayToEnum.set, received: ctx.parsedType }),
        freeze
      );
    let _def = this._def;
    if (_def.minSize !== null) {
      if (ctx.data.size < _def.minSize.value)
        (u(ctx, {
          code: arrayToEnum_2.too_small,
          minimum: _def.minSize.value,
          type: "set",
          inclusive: !0,
          exact: !1,
          message: _def.minSize.message,
        }),
          status.dirty());
    }
    if (_def.maxSize !== null) {
      if (ctx.data.size > _def.maxSize.value)
        (u(ctx, {
          code: arrayToEnum_2.too_big,
          maximum: _def.maxSize.value,
          type: "set",
          inclusive: !0,
          exact: !1,
          message: _def.maxSize.message,
        }),
          status.dirty());
    }
    let valueType = this._def.valueType;
    function i(c) {
      let o = new Set();
      for (let p of c) {
        if (p.status === "aborted") return freeze;
        if (p.status === "dirty") status.dirty();
        o.add(p.value);
      }
      return { status: status.value, value: o };
    }
    let mapped = [...ctx.data.values()].map((c, o) => valueType._parse(new w(ctx, c, ctx.path, o)));
    if (ctx.common.async) return Promise.all(mapped).then((c) => i(c));
    else return i(mapped);
  }
  min(e, t) {
    return new U({ ...this._def, minSize: { value: e, message: l.toString(t) } });
  }
  max(e, t) {
    return new U({ ...this._def, maxSize: { value: e, message: l.toString(t) } });
  }
  size(e, t) {
    return this.min(e, t).max(e, t);
  }
  nonempty(e) {
    return this.min(1, e);
  }
}
//@ chunk-j2t139r9.js:48169-48258 esm-fingerprint
U.create = (e, t) =>
  new U({ valueType: e, minSize: null, maxSize: null, typeName: ZodFirstPartyTypeKind.ZodSet, ...m(t) });
//@ chunk-j2t139r9.js:48258-49863 esm-fingerprint
class H extends _ {
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(e) {
    let { ctx: ctx } = this._processInputParams(e);
    if (ctx.parsedType !== arrayToEnum.function)
      return (
        u(ctx, {
          code: arrayToEnum_2.invalid_type,
          expected: arrayToEnum.function,
          received: ctx.parsedType,
        }),
        freeze
      );
    function r(n, c) {
      return ie({
        data: n,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, J(), N].filter((o) => !!o),
        issueData: { code: arrayToEnum_2.invalid_arguments, argumentsError: c },
      });
    }
    function a(n, c) {
      return ie({
        data: n,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, J(), N].filter((o) => !!o),
        issueData: { code: arrayToEnum_2.invalid_return_type, returnTypeError: c },
      });
    }
    let s = { errorMap: ctx.common.contextualErrorMap },
      i = ctx.data;
    if (this._def.returns instanceof q) {
      let n = this;
      return x(async function (...c) {
        let o = new ZodError([]),
          p = await n._def.args.parseAsync(c, s).catch((he) => {
            throw (o.addIssue(r(c, he)), o);
          }),
          b = await Reflect.apply(i, this, p);
        return await n._def.returns._def.type.parseAsync(b, s).catch((he) => {
          throw (o.addIssue(a(b, he)), o);
        });
      });
    } else {
      let n = this;
      return x(function (...c) {
        let safeParse = n._def.args.safeParse(c, s);
        if (!safeParse.success) throw new ZodError([r(c, safeParse.error)]);
        let p = Reflect.apply(i, this, safeParse.data),
          safeParse_2 = n._def.returns.safeParse(p, s);
        if (!safeParse_2.success) throw new ZodError([a(p, safeParse_2.error)]);
        return safeParse_2.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...e) {
    return new H({ ...this._def, args: I.create(e).rest(V.create()) });
  }
  returns(e) {
    return new H({ ...this._def, returns: e });
  }
  implement(e) {
    return this.parse(e);
  }
  strictImplement(e) {
    return this.parse(e);
  }
  static create(e, t, r) {
    return new H({
      args: e ? e : I.create([]).rest(V.create()),
      returns: t || V.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...m(r),
    });
  }
}
//@ chunk-j2t139r9.js:49863-50040 esm-fingerprint
class ee extends _ {
  get schema() {
    return this._def.getter();
  }
  _parse(e) {
    let { ctx: ctx } = this._processInputParams(e);
    return this._def.getter()._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
}
//@ chunk-j2t139r9.js:50040-50103 esm-fingerprint
ee.create = (e, t) => new ee({ getter: e, typeName: ZodFirstPartyTypeKind.ZodLazy, ...m(t) });
//@ chunk-j2t139r9.js:50103-50344 esm-fingerprint
class te extends _ {
  _parse(e) {
    if (e.data !== this._def.value) {
      let _getOrReturnCtx = this._getOrReturnCtx(e);
      return (
        u(_getOrReturnCtx, {
          received: _getOrReturnCtx.data,
          code: arrayToEnum_2.invalid_literal,
          expected: this._def.value,
        }),
        freeze
      );
    }
    return { status: "valid", value: e.data };
  }
  get value() {
    return this._def.value;
  }
}
//@ chunk-j2t139r9.js:50344-50409 esm-fingerprint
te.create = (e, t) => new te({ value: e, typeName: ZodFirstPartyTypeKind.ZodLiteral, ...m(t) });
//@ chunk-j2t139r9.js:50409-50478 esm-fingerprint
function Ae(e, t) {
  return new P({ values: e, typeName: ZodFirstPartyTypeKind.ZodEnum, ...m(t) });
}
//@ chunk-j2t139r9.js:50478-51288 esm-fingerprint
class P extends _ {
  _parse(e) {
    if (typeof e.data !== "string") {
      let _getOrReturnCtx = this._getOrReturnCtx(e),
        values = this._def.values;
      return (
        u(_getOrReturnCtx, {
          expected: g.joinValues(values),
          received: _getOrReturnCtx.parsedType,
          code: arrayToEnum_2.invalid_type,
        }),
        freeze
      );
    }
    if (!this._cache) this._cache = new Set(this._def.values);
    if (!this._cache.has(e.data)) {
      let _getOrReturnCtx = this._getOrReturnCtx(e),
        values = this._def.values;
      return (
        u(_getOrReturnCtx, {
          received: _getOrReturnCtx.data,
          code: arrayToEnum_2.invalid_enum_value,
          options: values,
        }),
        freeze
      );
    }
    return x(e.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    let e = {};
    for (let t of this._def.values) e[t] = t;
    return e;
  }
  get Values() {
    let e = {};
    for (let t of this._def.values) e[t] = t;
    return e;
  }
  get Enum() {
    let e = {};
    for (let t of this._def.values) e[t] = t;
    return e;
  }
  extract(e, t = this._def) {
    return P.create(e, { ...this._def, ...t });
  }
  exclude(e, t = this._def) {
    return P.create(
      this.options.filter((option) => !e.includes(option)),
      { ...this._def, ...t },
    );
  }
}
//@ chunk-j2t139r9.js:51288-51300 esm-layout
P.create = Ae;
//@ chunk-j2t139r9.js:51300-51812 esm-fingerprint
class re extends _ {
  _parse(e) {
    let validEnumValues = g.getValidEnumValues(this._def.values),
      _getOrReturnCtx = this._getOrReturnCtx(e);
    if (
      _getOrReturnCtx.parsedType !== arrayToEnum.string &&
      _getOrReturnCtx.parsedType !== arrayToEnum.number
    ) {
      let objectValues = g.objectValues(validEnumValues);
      return (
        u(_getOrReturnCtx, {
          expected: g.joinValues(objectValues),
          received: _getOrReturnCtx.parsedType,
          code: arrayToEnum_2.invalid_type,
        }),
        freeze
      );
    }
    if (!this._cache) this._cache = new Set(g.getValidEnumValues(this._def.values));
    if (!this._cache.has(e.data)) {
      let objectValues = g.objectValues(validEnumValues);
      return (
        u(_getOrReturnCtx, {
          received: _getOrReturnCtx.data,
          code: arrayToEnum_2.invalid_enum_value,
          options: objectValues,
        }),
        freeze
      );
    }
    return x(e.data);
  }
  get enum() {
    return this._def.values;
  }
}
//@ chunk-j2t139r9.js:51812-51881 esm-fingerprint
re.create = (e, t) => new re({ values: e, typeName: ZodFirstPartyTypeKind.ZodNativeEnum, ...m(t) });
//@ chunk-j2t139r9.js:51881-52272 esm-fingerprint
class q extends _ {
  unwrap() {
    return this._def.type;
  }
  _parse(e) {
    let { ctx: ctx } = this._processInputParams(e);
    if (ctx.parsedType !== arrayToEnum.promise && ctx.common.async === !1)
      return (
        u(ctx, { code: arrayToEnum_2.invalid_type, expected: arrayToEnum.promise, received: ctx.parsedType }),
        freeze
      );
    let r = ctx.parsedType === arrayToEnum.promise ? ctx.data : Promise.resolve(ctx.data);
    return x(
      r.then((a) =>
        this._def.type.parseAsync(a, { path: ctx.path, errorMap: ctx.common.contextualErrorMap }),
      ),
    );
  }
}
//@ chunk-j2t139r9.js:52272-52334 esm-fingerprint
q.create = (e, t) => new q({ type: e, typeName: ZodFirstPartyTypeKind.ZodPromise, ...m(t) });
//@ chunk-j2t139r9.js:52334-54479 esm-fingerprint
class A extends _ {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects
      ? this._def.schema.sourceType()
      : this._def.schema;
  }
  _parse(e) {
    let { status: status, ctx: ctx } = this._processInputParams(e),
      a = this._def.effect || null,
      s = {
        addIssue: (i) => {
          if ((u(ctx, i), i.fatal)) status.abort();
          else status.dirty();
        },
        get path() {
          return ctx.path;
        },
      };
    if (((s.addIssue = s.addIssue.bind(s)), a.type === "preprocess")) {
      let transform = a.transform(ctx.data, s);
      if (ctx.common.async)
        return Promise.resolve(transform).then(async (n) => {
          if (status.value === "aborted") return freeze;
          let _parseAsync = await this._def.schema._parseAsync({ data: n, path: ctx.path, parent: ctx });
          if (_parseAsync.status === "aborted") return freeze;
          if (_parseAsync.status === "dirty") return L(_parseAsync.value);
          if (status.value === "dirty") return L(_parseAsync.value);
          return _parseAsync;
        });
      else {
        if (status.value === "aborted") return freeze;
        let _parseSync = this._def.schema._parseSync({ data: transform, path: ctx.path, parent: ctx });
        if (_parseSync.status === "aborted") return freeze;
        if (_parseSync.status === "dirty") return L(_parseSync.value);
        if (status.value === "dirty") return L(_parseSync.value);
        return _parseSync;
      }
    }
    if (a.type === "refinement") {
      let i = (n) => {
        let refinement = a.refinement(n, s);
        if (ctx.common.async) return Promise.resolve(refinement);
        if (refinement instanceof Promise)
          throw Error(
            "Async refinement encountered during synchronous parse operation. Use .parseAsync instead.",
          );
        return n;
      };
      if (ctx.common.async === !1) {
        let _parseSync = this._def.schema._parseSync({ data: ctx.data, path: ctx.path, parent: ctx });
        if (_parseSync.status === "aborted") return freeze;
        if (_parseSync.status === "dirty") status.dirty();
        return (i(_parseSync.value), { status: status.value, value: _parseSync.value });
      } else
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((n) => {
          if (n.status === "aborted") return freeze;
          if (n.status === "dirty") status.dirty();
          return i(n.value).then(() => ({ status: status.value, value: n.value }));
        });
    }
    if (a.type === "transform")
      if (ctx.common.async === !1) {
        let _parseSync = this._def.schema._parseSync({ data: ctx.data, path: ctx.path, parent: ctx });
        if (!M(_parseSync)) return freeze;
        let transform = a.transform(_parseSync.value, s);
        if (transform instanceof Promise)
          throw Error(
            "Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.",
          );
        return { status: status.value, value: transform };
      } else
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((i) => {
          if (!M(i)) return freeze;
          return Promise.resolve(a.transform(i.value, s)).then((n) => ({ status: status.value, value: n }));
        });
    g.assertNever(a);
  }
}
//@ chunk-j2t139r9.js:54479-54554 esm-fingerprint
A.create = (e, t, r) => new A({ schema: e, typeName: ZodFirstPartyTypeKind.ZodEffects, effect: t, ...m(r) });
//@ chunk-j2t139r9.js:54554-54673 esm-fingerprint
A.createWithPreprocess = (e, t, r) =>
  new A({
    schema: t,
    effect: { type: "preprocess", transform: e },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...m(r),
  });
//@ chunk-j2t139r9.js:54673-54826 esm-fingerprint
class S extends _ {
  _parse(e) {
    if (this._getType(e) === arrayToEnum.undefined) return x(void 0);
    return this._def.innerType._parse(e);
  }
  unwrap() {
    return this._def.innerType;
  }
}
//@ chunk-j2t139r9.js:54826-54894 esm-fingerprint
S.create = (e, t) => new S({ innerType: e, typeName: ZodFirstPartyTypeKind.ZodOptional, ...m(t) });
//@ chunk-j2t139r9.js:54894-55040 esm-fingerprint
class E extends _ {
  _parse(e) {
    if (this._getType(e) === arrayToEnum.null) return x(null);
    return this._def.innerType._parse(e);
  }
  unwrap() {
    return this._def.innerType;
  }
}
//@ chunk-j2t139r9.js:55040-55108 esm-fingerprint
E.create = (e, t) => new E({ innerType: e, typeName: ZodFirstPartyTypeKind.ZodNullable, ...m(t) });
//@ chunk-j2t139r9.js:55108-55351 esm-fingerprint
class se extends _ {
  _parse(e) {
    let { ctx: ctx } = this._processInputParams(e),
      r = ctx.data;
    if (ctx.parsedType === arrayToEnum.undefined) r = this._def.defaultValue();
    return this._def.innerType._parse({ data: r, path: ctx.path, parent: ctx });
  }
  removeDefault() {
    return this._def.innerType;
  }
}
//@ chunk-j2t139r9.js:55351-55487 esm-fingerprint
se.create = (e, t) =>
  new se({
    innerType: e,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof t.default === "function" ? t.default : () => t.default,
    ...m(t),
  });
//@ chunk-j2t139r9.js:55487-56008 esm-fingerprint
class ae extends _ {
  _parse(e) {
    let { ctx: ctx } = this._processInputParams(e),
      r = { ...ctx, common: { ...ctx.common, issues: [] } },
      _parse = this._def.innerType._parse({ data: r.data, path: r.path, parent: { ...r } });
    if (Y(_parse))
      return _parse.then((s) => ({
        status: "valid",
        value:
          s.status === "valid"
            ? s.value
            : this._def.catchValue({
                get error() {
                  return new ZodError(r.common.issues);
                },
                input: r.data,
              }),
      }));
    else
      return {
        status: "valid",
        value:
          _parse.status === "valid"
            ? _parse.value
            : this._def.catchValue({
                get error() {
                  return new ZodError(r.common.issues);
                },
                input: r.data,
              }),
      };
  }
  removeCatch() {
    return this._def.innerType;
  }
}
//@ chunk-j2t139r9.js:56008-56134 esm-fingerprint
ae.create = (e, t) =>
  new ae({
    innerType: e,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof t.catch === "function" ? t.catch : () => t.catch,
    ...m(t),
  });
//@ chunk-j2t139r9.js:56134-56333 esm-fingerprint
class le extends _ {
  _parse(e) {
    if (this._getType(e) !== arrayToEnum.nan) {
      let _getOrReturnCtx = this._getOrReturnCtx(e);
      return (
        u(_getOrReturnCtx, {
          code: arrayToEnum_2.invalid_type,
          expected: arrayToEnum.nan,
          received: _getOrReturnCtx.parsedType,
        }),
        freeze
      );
    }
    return { status: "valid", value: e.data };
  }
}
//@ chunk-j2t139r9.js:56333-56384 esm-fingerprint
le.create = (e) => new le({ typeName: ZodFirstPartyTypeKind.ZodNaN, ...m(e) });
//@ chunk-j2t139r9.js:56384-56411 esm-fingerprint
var mt = Symbol("zod_brand");
//@ chunk-j2t139r9.js:56411-56580 esm-fingerprint
class xe extends _ {
  _parse(e) {
    let { ctx: ctx } = this._processInputParams(e),
      r = ctx.data;
    return this._def.type._parse({ data: r, path: ctx.path, parent: ctx });
  }
  unwrap() {
    return this._def.type;
  }
}
//@ chunk-j2t139r9.js:56580-57247 esm-fingerprint
class fe extends _ {
  _parse(e) {
    let { status: status, ctx: ctx } = this._processInputParams(e);
    if (ctx.common.async)
      return (async () => {
        let _parseAsync = await this._def.in._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx });
        if (_parseAsync.status === "aborted") return freeze;
        if (_parseAsync.status === "dirty") return (status.dirty(), L(_parseAsync.value));
        else return this._def.out._parseAsync({ data: _parseAsync.value, path: ctx.path, parent: ctx });
      })();
    else {
      let _parseSync = this._def.in._parseSync({ data: ctx.data, path: ctx.path, parent: ctx });
      if (_parseSync.status === "aborted") return freeze;
      if (_parseSync.status === "dirty")
        return (status.dirty(), { status: "dirty", value: _parseSync.value });
      else return this._def.out._parseSync({ data: _parseSync.value, path: ctx.path, parent: ctx });
    }
  }
  static create(e, t) {
    return new fe({ in: e, out: t, typeName: ZodFirstPartyTypeKind.ZodPipeline });
  }
}
//@ chunk-j2t139r9.js:57247-57441 esm-fingerprint
class ne extends _ {
  _parse(e) {
    let _parse = this._def.innerType._parse(e),
      r = (a) => {
        if (M(a)) a.value = Object.freeze(a.value);
        return a;
      };
    return Y(_parse) ? _parse.then((a) => r(a)) : r(_parse);
  }
  unwrap() {
    return this._def.innerType;
  }
}
//@ chunk-j2t139r9.js:57441-57511 esm-fingerprint
ne.create = (e, t) => new ne({ innerType: e, typeName: ZodFirstPartyTypeKind.ZodReadonly, ...m(t) });
//@ chunk-j2t139r9.js:57511-57636 esm-fingerprint
function Te(e, t) {
  let r = typeof e === "function" ? e(t) : typeof e === "string" ? { message: e } : e;
  return typeof r === "string" ? { message: r } : r;
}
/**
 * zod 的 custom() 校验构造（第三方库代码，误归到 EnterWorktree）。
 */
//@ chunk-j2t139r9.js:57636-57945 esm-fingerprint
function nIn(e, t = {}, r) {
  if (e)
    return B.create().superRefine((a, s) => {
      let i = e(a);
      if (i instanceof Promise)
        return i.then((n) => {
          if (!n) {
            let c = Te(t, a),
              o = c.fatal ?? r ?? !0;
            s.addIssue({ code: "custom", ...c, fatal: o });
          }
        });
      if (!i) {
        let n = Te(t, a),
          c = n.fatal ?? r ?? !0;
        s.addIssue({ code: "custom", ...n, fatal: c });
      }
      return;
    });
  return B.create();
}
//@ chunk-j2t139r9.js:57945-57976 esm-fingerprint
var lazyCreateTable = { object: y.lazycreate },
  ZodFirstPartyTypeKind;
//@ chunk-j2t139r9.js:57976-58896 esm-fingerprint
(function (e) {
  ((e.ZodString = "ZodString"),
    (e.ZodNumber = "ZodNumber"),
    (e.ZodNaN = "ZodNaN"),
    (e.ZodBigInt = "ZodBigInt"),
    (e.ZodBoolean = "ZodBoolean"),
    (e.ZodDate = "ZodDate"),
    (e.ZodSymbol = "ZodSymbol"),
    (e.ZodUndefined = "ZodUndefined"),
    (e.ZodNull = "ZodNull"),
    (e.ZodAny = "ZodAny"),
    (e.ZodUnknown = "ZodUnknown"),
    (e.ZodNever = "ZodNever"),
    (e.ZodVoid = "ZodVoid"),
    (e.ZodArray = "ZodArray"),
    (e.ZodObject = "ZodObject"),
    (e.ZodUnion = "ZodUnion"),
    (e.ZodDiscriminatedUnion = "ZodDiscriminatedUnion"),
    (e.ZodIntersection = "ZodIntersection"),
    (e.ZodTuple = "ZodTuple"),
    (e.ZodRecord = "ZodRecord"),
    (e.ZodMap = "ZodMap"),
    (e.ZodSet = "ZodSet"),
    (e.ZodFunction = "ZodFunction"),
    (e.ZodLazy = "ZodLazy"),
    (e.ZodLiteral = "ZodLiteral"),
    (e.ZodEnum = "ZodEnum"),
    (e.ZodEffects = "ZodEffects"),
    (e.ZodNativeEnum = "ZodNativeEnum"),
    (e.ZodOptional = "ZodOptional"),
    (e.ZodNullable = "ZodNullable"),
    (e.ZodDefault = "ZodDefault"),
    (e.ZodCatch = "ZodCatch"),
    (e.ZodPromise = "ZodPromise"),
    (e.ZodBranded = "ZodBranded"),
    (e.ZodPipeline = "ZodPipeline"),
    (e.ZodReadonly = "ZodReadonly"));
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));

export {
  nIn,
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
};
