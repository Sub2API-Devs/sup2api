/**
 * zod/v3/types.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-j2t139r9.js (91)
 * attribution: esm-fingerprint 87, esm-layout 4
 */
import {
  isValid,
  ParseStatus,
  isPromise,
  addIssueToContext,
  INVALID,
  errorUtil,
  OK,
  isAborted,
  isDirty,
  makeIssue,
  getErrorMap,
  errorMap_2,
  DIRTY,
} from "../lib/index.mjs";
import { ZodError, ZodIssueCode } from "./ZodError.js";
import { getParsedType, ZodParsedType, util } from "./helpers/util.js";
import { deferInit, beginDeferredInits } from "../../../runtime/deferred-init.js";

// This module is the first evaluated of an import cycle of 2 modules closed by ../lib/index.mjs;
// the load-time work of the cycle's statements marked "deferred" waits until the cycle is complete (runtime/deferred-init.js).
beginDeferredInits("vendor/zod/lib/index.mjs");
// This module is the first evaluated of an import cycle of 2 modules closed by ../lib/index.mjs (in the hooks worker thread);
// the load-time work of the cycle's statements marked "deferred" waits until the cycle is complete (runtime/deferred-init.js).
beginDeferredInits("worker:vendor/zod/lib/index.mjs");
//@ chunk-j2t139r9.js:8640-8934 esm-fingerprint
class ParseInputLazyPath {
  constructor(parent, value, path, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length)
      if (Array.isArray(this._key)) this._cachedPath.push(...this._path, ...this._key);
      else this._cachedPath.push(...this._path, this._key);
    return this._cachedPath;
  }
}
//@ chunk-j2t139r9.js:8934-9208 esm-fingerprint
/**
 * zod 内部：safeParse 结果封装（第三方）。
 */
var handleParseResult = (ctx, result) => {
  if (isValid(result))
    return {
      success: true,
      data: result.value,
    };
  else {
    if (!ctx.common.issues.length) throw Error("Validation failed but no issues detected.");
    return {
      success: false,
      get error() {
        if (this._error) return this._error;
        let error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      },
    };
  }
};
//@ chunk-j2t139r9.js:9208-9739 esm-fingerprint
function processCreateParams(params) {
  if (!params) return {};
  let { errorMap, invalid_type_error, required_error, description } = params;
  if (errorMap && (invalid_type_error || required_error))
    throw Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  if (errorMap)
    return {
      errorMap,
      description,
    };
  return {
    errorMap: (iss, ctx) => {
      let { message } = params;
      if (iss.code === "invalid_enum_value")
        return {
          message: message ?? ctx.defaultError,
        };
      if (typeof ctx.data === "undefined")
        return {
          message: message ?? required_error ?? ctx.defaultError,
        };
      if (iss.code !== "invalid_type")
        return {
          message: ctx.defaultError,
        };
      return {
        message: message ?? invalid_type_error ?? ctx.defaultError,
      };
    },
    description,
  };
}
//@ chunk-j2t139r9.js:9739-14153 esm-fingerprint
class ZodType {
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return (
      ctx || {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent,
      }
    );
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus(),
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent,
      },
    };
  }
  _parseSync(input) {
    let result = this._parse(input);
    if (isPromise(result)) throw Error("Synchronous parse encountered promise.");
    return result;
  }
  _parseAsync(input) {
    let result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    let result = this.safeParse(data, params);
    if (result.success) return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    let ctx = {
      common: {
        issues: [],
        async: params?.async ?? false,
        contextualErrorMap: params?.errorMap,
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data),
    };
    let result = this._parseSync({
      data,
      path: ctx.path,
      parent: ctx,
    });
    return handleParseResult(ctx, result);
  }
  "~validate"(data) {
    let ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async,
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data),
    };
    if (!this["~standard"].async)
      try {
        let result = this._parseSync({
          data,
          path: [],
          parent: ctx,
        });
        return isValid(result)
          ? {
              value: result.value,
            }
          : {
              issues: ctx.common.issues,
            };
      } catch (err) {
        if (err?.message?.toLowerCase()?.includes("encountered")) this["~standard"].async = true;
        ctx.common = {
          issues: [],
          async: true,
        };
      }
    return this._parseAsync({
      data,
      path: [],
      parent: ctx,
    }).then((result) =>
      isValid(result)
        ? {
            value: result.value,
          }
        : {
            issues: ctx.common.issues,
          },
    );
  }
  async parseAsync(data, params) {
    let result = await this.safeParseAsync(data, params);
    if (result.success) return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    let ctx = {
      common: {
        issues: [],
        contextualErrorMap: params?.errorMap,
        async: true,
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data),
    };
    let maybeAsyncResult = this._parse({
      data,
      path: ctx.path,
      parent: ctx,
    });
    let result = await (isPromise(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleParseResult(ctx, result);
  }
  refine(check, message) {
    let getIssueProperties = (val) => {
      if (typeof message === "string" || typeof message === "undefined")
        return {
          message,
        };
      else if (typeof message === "function") return message(val);
      else return message;
    };
    return this._refinement((val, ctx) => {
      let result = check(val);
      let setError = () =>
        ctx.addIssue({
          code: ZodIssueCode.custom,
          ...getIssueProperties(val),
        });
      if (typeof Promise !== "undefined" && result instanceof Promise)
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else return true;
        });
      if (!result) {
        setError();
        return false;
      } else return true;
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else return true;
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: compatTypeKindPlaceholder.ZodEffects,
      effect: {
        type: "refinement",
        refinement,
      },
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (data) => this["~validate"](data),
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: compatTypeKindPlaceholder.ZodEffects,
      effect: {
        type: "transform",
        transform,
      },
    });
  }
  default(def) {
    let defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: compatTypeKindPlaceholder.ZodDefault,
    });
  }
  brand() {
    return new ZodBranded({
      typeName: compatTypeKindPlaceholder.ZodBranded,
      type: this,
      ...processCreateParams(this._def),
    });
  }
  catch(def) {
    let catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: compatTypeKindPlaceholder.ZodCatch,
    });
  }
  describe(description) {
    return new this.constructor({
      ...this._def,
      description,
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(undefined).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
}
//@ chunk-j2t139r9.js:14153-16845 esm-fingerprint
var cuidRegex = /^c[^\s-]{8,}$/i;
var cuid2Regex = /^[0-9a-z]+$/;
var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex = /^[a-z0-9_-]{21}$/i;
var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
var durationRegex =
  /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex = "^[\\p{Extended_Pictographic}\\p{Emoji_Component}]+$";
var emojiRegex;
var ipv4Regex =
  /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv4CidrRegex =
  /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
var ipv6Regex =
  /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
var ipv6CidrRegex =
  /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
var dateRegexSource =
  "((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))";
var dateRegex = new RegExp(`^${dateRegexSource}$`);
//@ chunk-j2t139r9.js:16845-17039 esm-fingerprint
function timeRegexSource(args) {
  let secondsRegexSource = "[0-5]\\d";
  if (args.precision) secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
  else if (args.precision == null) secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
  let secondsQuantifier = args.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
//@ chunk-j2t139r9.js:17039-17086 esm-layout
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
//@ chunk-j2t139r9.js:17086-17250 esm-fingerprint
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  let opts = [];
  opts.push(args.local ? "Z?" : "Z");
  if (args.offset) opts.push("([+-]\\d{2}:?\\d{2})");
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
//@ chunk-j2t139r9.js:17250-17354 esm-layout
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) return true;
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) return true;
  return false;
}
//@ chunk-j2t139r9.js:17354-17687 esm-fingerprint
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt)) return false;
  try {
    let [header] = jwt.split(".");
    if (!header) return false;
    let base64 = header
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(header.length + ((4 - (header.length % 4)) % 4), "=");
    let decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null) return false;
    if ("typ" in decoded && decoded?.typ !== "JWT") return false;
    if (!decoded.alg) return false;
    if (alg && decoded.alg !== alg) return false;
    return true;
  } catch {
    return false;
  }
}
//@ chunk-j2t139r9.js:17687-17791 esm-layout
function isValidCidr(ip, version) {
  if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) return true;
  if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) return true;
  return false;
}
//@ chunk-j2t139r9.js:17791-26110 esm-fingerprint
let ZodString; // deferred: uses ZodType of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:17791", () => {
  ZodString = class ZodString extends ZodType {
    _parse(input) {
      if (this._def.coerce) input.data = String(input.data);
      if (this._getType(input) !== ZodParsedType.string) {
        let ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.string,
          received: ctx.parsedType,
        });
        return INVALID;
      }
      let status = new ParseStatus();
      let ctx = undefined;
      for (let check of this._def.checks)
        if (check.kind === "min") {
          if (input.data.length < check.value) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: false,
              message: check.message,
            });
            status.dirty();
          }
        } else if (check.kind === "max") {
          if (input.data.length > check.value) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: false,
              message: check.message,
            });
            status.dirty();
          }
        } else if (check.kind === "length") {
          let tooBig = input.data.length > check.value;
          let tooSmall = input.data.length < check.value;
          if (tooBig || tooSmall) {
            ctx = this._getOrReturnCtx(input, ctx);
            if (tooBig)
              addIssueToContext(ctx, {
                code: ZodIssueCode.too_big,
                maximum: check.value,
                type: "string",
                inclusive: true,
                exact: true,
                message: check.message,
              });
            else if (tooSmall)
              addIssueToContext(ctx, {
                code: ZodIssueCode.too_small,
                minimum: check.value,
                type: "string",
                inclusive: true,
                exact: true,
                message: check.message,
              });
            status.dirty();
          }
        } else if (check.kind === "email") {
          if (!emailRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "email",
              code: ZodIssueCode.invalid_string,
              message: check.message,
            });
            status.dirty();
          }
        } else if (check.kind === "emoji") {
          if (!emojiRegex) emojiRegex = new RegExp(_emojiRegex, "u");
          if (!emojiRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "emoji",
              code: ZodIssueCode.invalid_string,
              message: check.message,
            });
            status.dirty();
          }
        } else if (check.kind === "uuid") {
          if (!uuidRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "uuid",
              code: ZodIssueCode.invalid_string,
              message: check.message,
            });
            status.dirty();
          }
        } else if (check.kind === "nanoid") {
          if (!nanoidRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "nanoid",
              code: ZodIssueCode.invalid_string,
              message: check.message,
            });
            status.dirty();
          }
        } else if (check.kind === "cuid") {
          if (!cuidRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "cuid",
              code: ZodIssueCode.invalid_string,
              message: check.message,
            });
            status.dirty();
          }
        } else if (check.kind === "cuid2") {
          if (!cuid2Regex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "cuid2",
              code: ZodIssueCode.invalid_string,
              message: check.message,
            });
            status.dirty();
          }
        } else if (check.kind === "ulid") {
          if (!ulidRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "ulid",
              code: ZodIssueCode.invalid_string,
              message: check.message,
            });
            status.dirty();
          }
        } else if (check.kind === "url")
          try {
            new URL(input.data);
          } catch {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "url",
              code: ZodIssueCode.invalid_string,
              message: check.message,
            });
            status.dirty();
          }
        else if (check.kind === "regex") {
          check.regex.lastIndex = 0;
          if (!check.regex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "regex",
              code: ZodIssueCode.invalid_string,
              message: check.message,
            });
            status.dirty();
          }
        } else if (check.kind === "trim") input.data = input.data.trim();
        else if (check.kind === "includes") {
          if (!input.data.includes(check.value, check.position)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: {
                includes: check.value,
                position: check.position,
              },
              message: check.message,
            });
            status.dirty();
          }
        } else if (check.kind === "toLowerCase") input.data = input.data.toLowerCase();
        else if (check.kind === "toUpperCase") input.data = input.data.toUpperCase();
        else if (check.kind === "startsWith") {
          if (!input.data.startsWith(check.value)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: {
                startsWith: check.value,
              },
              message: check.message,
            });
            status.dirty();
          }
        } else if (check.kind === "endsWith") {
          if (!input.data.endsWith(check.value)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: {
                endsWith: check.value,
              },
              message: check.message,
            });
            status.dirty();
          }
        } else if (check.kind === "datetime") {
          if (!datetimeRegex(check).test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: "datetime",
              message: check.message,
            });
            status.dirty();
          }
        } else if (check.kind === "date") {
          if (!dateRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: "date",
              message: check.message,
            });
            status.dirty();
          }
        } else if (check.kind === "time") {
          if (!timeRegex(check).test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: "time",
              message: check.message,
            });
            status.dirty();
          }
        } else if (check.kind === "duration") {
          if (!durationRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "duration",
              code: ZodIssueCode.invalid_string,
              message: check.message,
            });
            status.dirty();
          }
        } else if (check.kind === "ip") {
          if (!isValidIP(input.data, check.version)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "ip",
              code: ZodIssueCode.invalid_string,
              message: check.message,
            });
            status.dirty();
          }
        } else if (check.kind === "jwt") {
          if (!isValidJWT(input.data, check.alg)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "jwt",
              code: ZodIssueCode.invalid_string,
              message: check.message,
            });
            status.dirty();
          }
        } else if (check.kind === "cidr") {
          if (!isValidCidr(input.data, check.version)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "cidr",
              code: ZodIssueCode.invalid_string,
              message: check.message,
            });
            status.dirty();
          }
        } else if (check.kind === "base64") {
          if (!base64Regex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "base64",
              code: ZodIssueCode.invalid_string,
              message: check.message,
            });
            status.dirty();
          }
        } else if (check.kind === "base64url") {
          if (!base64urlRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "base64url",
              code: ZodIssueCode.invalid_string,
              message: check.message,
            });
            status.dirty();
          }
        } else util.assertNever(check);
      return {
        status: status.value,
        value: input.data,
      };
    }
    _regex(regex, validation, message) {
      return this.refinement((data) => regex.test(data), {
        validation,
        code: ZodIssueCode.invalid_string,
        ...errorUtil.errToObj(message),
      });
    }
    _addCheck(check) {
      return new ZodString({
        ...this._def,
        checks: [...this._def.checks, check],
      });
    }
    email(message) {
      return this._addCheck({
        kind: "email",
        ...errorUtil.errToObj(message),
      });
    }
    url(message) {
      return this._addCheck({
        kind: "url",
        ...errorUtil.errToObj(message),
      });
    }
    emoji(message) {
      return this._addCheck({
        kind: "emoji",
        ...errorUtil.errToObj(message),
      });
    }
    uuid(message) {
      return this._addCheck({
        kind: "uuid",
        ...errorUtil.errToObj(message),
      });
    }
    nanoid(message) {
      return this._addCheck({
        kind: "nanoid",
        ...errorUtil.errToObj(message),
      });
    }
    cuid(message) {
      return this._addCheck({
        kind: "cuid",
        ...errorUtil.errToObj(message),
      });
    }
    cuid2(message) {
      return this._addCheck({
        kind: "cuid2",
        ...errorUtil.errToObj(message),
      });
    }
    ulid(message) {
      return this._addCheck({
        kind: "ulid",
        ...errorUtil.errToObj(message),
      });
    }
    base64(message) {
      return this._addCheck({
        kind: "base64",
        ...errorUtil.errToObj(message),
      });
    }
    base64url(message) {
      return this._addCheck({
        kind: "base64url",
        ...errorUtil.errToObj(message),
      });
    }
    jwt(options) {
      return this._addCheck({
        kind: "jwt",
        ...errorUtil.errToObj(options),
      });
    }
    ip(options) {
      return this._addCheck({
        kind: "ip",
        ...errorUtil.errToObj(options),
      });
    }
    cidr(options) {
      return this._addCheck({
        kind: "cidr",
        ...errorUtil.errToObj(options),
      });
    }
    datetime(options) {
      if (typeof options === "string")
        return this._addCheck({
          kind: "datetime",
          precision: null,
          offset: false,
          local: false,
          message: options,
        });
      return this._addCheck({
        kind: "datetime",
        precision: typeof options?.precision === "undefined" ? null : options?.precision,
        offset: options?.offset ?? false,
        local: options?.local ?? false,
        ...errorUtil.errToObj(options?.message),
      });
    }
    date(message) {
      return this._addCheck({
        kind: "date",
        message,
      });
    }
    time(options) {
      if (typeof options === "string")
        return this._addCheck({
          kind: "time",
          precision: null,
          message: options,
        });
      return this._addCheck({
        kind: "time",
        precision: typeof options?.precision === "undefined" ? null : options?.precision,
        ...errorUtil.errToObj(options?.message),
      });
    }
    duration(message) {
      return this._addCheck({
        kind: "duration",
        ...errorUtil.errToObj(message),
      });
    }
    regex(regex, message) {
      return this._addCheck({
        kind: "regex",
        regex,
        ...errorUtil.errToObj(message),
      });
    }
    includes(value, options) {
      return this._addCheck({
        kind: "includes",
        value,
        position: options?.position,
        ...errorUtil.errToObj(options?.message),
      });
    }
    startsWith(value, message) {
      return this._addCheck({
        kind: "startsWith",
        value,
        ...errorUtil.errToObj(message),
      });
    }
    endsWith(value, message) {
      return this._addCheck({
        kind: "endsWith",
        value,
        ...errorUtil.errToObj(message),
      });
    }
    min(minLength, message) {
      return this._addCheck({
        kind: "min",
        value: minLength,
        ...errorUtil.errToObj(message),
      });
    }
    max(maxLength, message) {
      return this._addCheck({
        kind: "max",
        value: maxLength,
        ...errorUtil.errToObj(message),
      });
    }
    length(len, message) {
      return this._addCheck({
        kind: "length",
        value: len,
        ...errorUtil.errToObj(message),
      });
    }
    nonempty(message) {
      return this.min(1, errorUtil.errToObj(message));
    }
    trim() {
      return new ZodString({
        ...this._def,
        checks: [
          ...this._def.checks,
          {
            kind: "trim",
          },
        ],
      });
    }
    toLowerCase() {
      return new ZodString({
        ...this._def,
        checks: [
          ...this._def.checks,
          {
            kind: "toLowerCase",
          },
        ],
      });
    }
    toUpperCase() {
      return new ZodString({
        ...this._def,
        checks: [
          ...this._def.checks,
          {
            kind: "toUpperCase",
          },
        ],
      });
    }
    get isDatetime() {
      return !!this._def.checks.find((ch) => ch.kind === "datetime");
    }
    get isDate() {
      return !!this._def.checks.find((ch) => ch.kind === "date");
    }
    get isTime() {
      return !!this._def.checks.find((ch) => ch.kind === "time");
    }
    get isDuration() {
      return !!this._def.checks.find((ch) => ch.kind === "duration");
    }
    get isEmail() {
      return !!this._def.checks.find((ch) => ch.kind === "email");
    }
    get isURL() {
      return !!this._def.checks.find((ch) => ch.kind === "url");
    }
    get isEmoji() {
      return !!this._def.checks.find((ch) => ch.kind === "emoji");
    }
    get isUUID() {
      return !!this._def.checks.find((ch) => ch.kind === "uuid");
    }
    get isNANOID() {
      return !!this._def.checks.find((ch) => ch.kind === "nanoid");
    }
    get isCUID() {
      return !!this._def.checks.find((ch) => ch.kind === "cuid");
    }
    get isCUID2() {
      return !!this._def.checks.find((ch) => ch.kind === "cuid2");
    }
    get isULID() {
      return !!this._def.checks.find((ch) => ch.kind === "ulid");
    }
    get isIP() {
      return !!this._def.checks.find((ch) => ch.kind === "ip");
    }
    get isCIDR() {
      return !!this._def.checks.find((ch) => ch.kind === "cidr");
    }
    get isBase64() {
      return !!this._def.checks.find((ch) => ch.kind === "base64");
    }
    get isBase64url() {
      return !!this._def.checks.find((ch) => ch.kind === "base64url");
    }
    get minLength() {
      let min = null;
      for (let ch of this._def.checks)
        if (ch.kind === "min") {
          if (min === null || ch.value > min) min = ch.value;
        }
      return min;
    }
    get maxLength() {
      let max = null;
      for (let ch of this._def.checks)
        if (ch.kind === "max") {
          if (max === null || ch.value < max) max = ch.value;
        }
      return max;
    }
  };
});
//@ chunk-j2t139r9.js:26110-26193 esm-fingerprint
// deferred: uses ZodString of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:26110", () => {
  ZodString.create = (params) =>
    new ZodString({
      checks: [],
      typeName: compatTypeKindPlaceholder.ZodString,
      coerce: params?.coerce ?? false,
      ...processCreateParams(params),
    });
});
//@ chunk-j2t139r9.js:26193-26421 esm-fingerprint
/**
 * 浮点安全取模（zod multipleOf 用）。第三方 zod 内部。
 */
function floatSafeRemainder(val, step) {
  let valDecCount = (val.toString().split(".")[1] || "").length;
  let stepDecCount = (step.toString().split(".")[1] || "").length;
  let decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  let valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  let stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return (valInt % stepInt) / 10 ** decCount;
}
//@ chunk-j2t139r9.js:26421-29570 esm-fingerprint
let ZodNumber; // deferred: uses ZodType of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:26421", () => {
  ZodNumber = class ZodNumber extends ZodType {
    constructor() {
      super(...arguments);
      this.min = this.gte;
      this.max = this.lte;
      this.step = this.multipleOf;
    }
    _parse(input) {
      if (this._def.coerce) input.data = Number(input.data);
      if (this._getType(input) !== ZodParsedType.number) {
        let ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.number,
          received: ctx.parsedType,
        });
        return INVALID;
      }
      let ctx = undefined;
      let status = new ParseStatus();
      for (let check of this._def.checks)
        if (check.kind === "int") {
          if (!util.isInteger(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_type,
              expected: "integer",
              received: "float",
              message: check.message,
            });
            status.dirty();
          }
        } else if (check.kind === "min") {
          if (check.inclusive ? input.data < check.value : input.data <= check.value) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "number",
              inclusive: check.inclusive,
              exact: false,
              message: check.message,
            });
            status.dirty();
          }
        } else if (check.kind === "max") {
          if (check.inclusive ? input.data > check.value : input.data >= check.value) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "number",
              inclusive: check.inclusive,
              exact: false,
              message: check.message,
            });
            status.dirty();
          }
        } else if (check.kind === "multipleOf") {
          if (floatSafeRemainder(input.data, check.value) !== 0) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.not_multiple_of,
              multipleOf: check.value,
              message: check.message,
            });
            status.dirty();
          }
        } else if (check.kind === "finite") {
          if (!Number.isFinite(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.not_finite,
              message: check.message,
            });
            status.dirty();
          }
        } else util.assertNever(check);
      return {
        status: status.value,
        value: input.data,
      };
    }
    gte(value, message) {
      return this.setLimit("min", value, true, errorUtil.toString(message));
    }
    gt(value, message) {
      return this.setLimit("min", value, false, errorUtil.toString(message));
    }
    lte(value, message) {
      return this.setLimit("max", value, true, errorUtil.toString(message));
    }
    lt(value, message) {
      return this.setLimit("max", value, false, errorUtil.toString(message));
    }
    setLimit(kind, value, inclusive, message) {
      return new ZodNumber({
        ...this._def,
        checks: [
          ...this._def.checks,
          {
            kind,
            value,
            inclusive,
            message: errorUtil.toString(message),
          },
        ],
      });
    }
    _addCheck(check) {
      return new ZodNumber({
        ...this._def,
        checks: [...this._def.checks, check],
      });
    }
    int(message) {
      return this._addCheck({
        kind: "int",
        message: errorUtil.toString(message),
      });
    }
    positive(message) {
      return this._addCheck({
        kind: "min",
        value: 0,
        inclusive: false,
        message: errorUtil.toString(message),
      });
    }
    negative(message) {
      return this._addCheck({
        kind: "max",
        value: 0,
        inclusive: false,
        message: errorUtil.toString(message),
      });
    }
    nonpositive(message) {
      return this._addCheck({
        kind: "max",
        value: 0,
        inclusive: true,
        message: errorUtil.toString(message),
      });
    }
    nonnegative(message) {
      return this._addCheck({
        kind: "min",
        value: 0,
        inclusive: true,
        message: errorUtil.toString(message),
      });
    }
    multipleOf(value, message) {
      return this._addCheck({
        kind: "multipleOf",
        value,
        message: errorUtil.toString(message),
      });
    }
    finite(message) {
      return this._addCheck({
        kind: "finite",
        message: errorUtil.toString(message),
      });
    }
    safe(message) {
      return this._addCheck({
        kind: "min",
        inclusive: true,
        value: Number.MIN_SAFE_INTEGER,
        message: errorUtil.toString(message),
      })._addCheck({
        kind: "max",
        inclusive: true,
        value: Number.MAX_SAFE_INTEGER,
        message: errorUtil.toString(message),
      });
    }
    get minValue() {
      let min = null;
      for (let ch of this._def.checks)
        if (ch.kind === "min") {
          if (min === null || ch.value > min) min = ch.value;
        }
      return min;
    }
    get maxValue() {
      let max = null;
      for (let ch of this._def.checks)
        if (ch.kind === "max") {
          if (max === null || ch.value < max) max = ch.value;
        }
      return max;
    }
    get isInt() {
      return !!this._def.checks.find(
        (ch) => ch.kind === "int" || (ch.kind === "multipleOf" && util.isInteger(ch.value)),
      );
    }
    get isFinite() {
      let max = null;
      let min = null;
      for (let ch of this._def.checks)
        if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") return true;
        else if (ch.kind === "min") {
          if (min === null || ch.value > min) min = ch.value;
        } else if (ch.kind === "max") {
          if (max === null || ch.value < max) max = ch.value;
        }
      return Number.isFinite(min) && Number.isFinite(max);
    }
  };
});
//@ chunk-j2t139r9.js:29570-29653 esm-fingerprint
// deferred: uses ZodNumber of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:29570", () => {
  ZodNumber.create = (params) =>
    new ZodNumber({
      checks: [],
      typeName: compatTypeKindPlaceholder.ZodNumber,
      coerce: params?.coerce || false,
      ...processCreateParams(params),
    });
});
//@ chunk-j2t139r9.js:29653-31848 esm-fingerprint
let ZodBigInt; // deferred: uses ZodType of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:29653", () => {
  ZodBigInt = class ZodBigInt extends ZodType {
    constructor() {
      super(...arguments);
      this.min = this.gte;
      this.max = this.lte;
    }
    _parse(input) {
      if (this._def.coerce)
        try {
          input.data = BigInt(input.data);
        } catch {
          return this._getInvalidInput(input);
        }
      if (this._getType(input) !== ZodParsedType.bigint) return this._getInvalidInput(input);
      let ctx = undefined;
      let status = new ParseStatus();
      for (let check of this._def.checks)
        if (check.kind === "min") {
          if (check.inclusive ? input.data < check.value : input.data <= check.value) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              type: "bigint",
              minimum: check.value,
              inclusive: check.inclusive,
              message: check.message,
            });
            status.dirty();
          }
        } else if (check.kind === "max") {
          if (check.inclusive ? input.data > check.value : input.data >= check.value) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              type: "bigint",
              maximum: check.value,
              inclusive: check.inclusive,
              message: check.message,
            });
            status.dirty();
          }
        } else if (check.kind === "multipleOf") {
          if (input.data % check.value !== BigInt(0)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.not_multiple_of,
              multipleOf: check.value,
              message: check.message,
            });
            status.dirty();
          }
        } else util.assertNever(check);
      return {
        status: status.value,
        value: input.data,
      };
    }
    _getInvalidInput(input) {
      let ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.bigint,
        received: ctx.parsedType,
      });
      return INVALID;
    }
    gte(value, message) {
      return this.setLimit("min", value, true, errorUtil.toString(message));
    }
    gt(value, message) {
      return this.setLimit("min", value, false, errorUtil.toString(message));
    }
    lte(value, message) {
      return this.setLimit("max", value, true, errorUtil.toString(message));
    }
    lt(value, message) {
      return this.setLimit("max", value, false, errorUtil.toString(message));
    }
    setLimit(kind, value, inclusive, message) {
      return new ZodBigInt({
        ...this._def,
        checks: [
          ...this._def.checks,
          {
            kind,
            value,
            inclusive,
            message: errorUtil.toString(message),
          },
        ],
      });
    }
    _addCheck(check) {
      return new ZodBigInt({
        ...this._def,
        checks: [...this._def.checks, check],
      });
    }
    positive(message) {
      return this._addCheck({
        kind: "min",
        value: BigInt(0),
        inclusive: false,
        message: errorUtil.toString(message),
      });
    }
    negative(message) {
      return this._addCheck({
        kind: "max",
        value: BigInt(0),
        inclusive: false,
        message: errorUtil.toString(message),
      });
    }
    nonpositive(message) {
      return this._addCheck({
        kind: "max",
        value: BigInt(0),
        inclusive: true,
        message: errorUtil.toString(message),
      });
    }
    nonnegative(message) {
      return this._addCheck({
        kind: "min",
        value: BigInt(0),
        inclusive: true,
        message: errorUtil.toString(message),
      });
    }
    multipleOf(value, message) {
      return this._addCheck({
        kind: "multipleOf",
        value,
        message: errorUtil.toString(message),
      });
    }
    get minValue() {
      let min = null;
      for (let ch of this._def.checks)
        if (ch.kind === "min") {
          if (min === null || ch.value > min) min = ch.value;
        }
      return min;
    }
    get maxValue() {
      let max = null;
      for (let ch of this._def.checks)
        if (ch.kind === "max") {
          if (max === null || ch.value < max) max = ch.value;
        }
      return max;
    }
  };
});
//@ chunk-j2t139r9.js:31848-31931 esm-fingerprint
// deferred: uses ZodBigInt of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:31848", () => {
  ZodBigInt.create = (params) =>
    new ZodBigInt({
      checks: [],
      typeName: compatTypeKindPlaceholder.ZodBigInt,
      coerce: params?.coerce ?? false,
      ...processCreateParams(params),
    });
});
//@ chunk-j2t139r9.js:31931-32161 esm-fingerprint
let ZodBoolean; // deferred: uses ZodType of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:31931", () => {
  ZodBoolean = class ZodBoolean extends ZodType {
    _parse(input) {
      if (this._def.coerce) input.data = Boolean(input.data);
      if (this._getType(input) !== ZodParsedType.boolean) {
        let ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.boolean,
          received: ctx.parsedType,
        });
        return INVALID;
      }
      return OK(input.data);
    }
  };
});
//@ chunk-j2t139r9.js:32161-32235 esm-fingerprint
// deferred: uses ZodBoolean of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:32161", () => {
  ZodBoolean.create = (params) =>
    new ZodBoolean({
      typeName: compatTypeKindPlaceholder.ZodBoolean,
      coerce: params?.coerce || false,
      ...processCreateParams(params),
    });
});
//@ chunk-j2t139r9.js:32235-33554 esm-fingerprint
let ZodDate; // deferred: uses ZodType of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:32235", () => {
  ZodDate = class ZodDate extends ZodType {
    _parse(input) {
      if (this._def.coerce) input.data = new Date(input.data);
      if (this._getType(input) !== ZodParsedType.date) {
        let ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.date,
          received: ctx.parsedType,
        });
        return INVALID;
      }
      if (Number.isNaN(input.data.getTime())) {
        let ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_date,
        });
        return INVALID;
      }
      let status = new ParseStatus();
      let ctx = undefined;
      for (let check of this._def.checks)
        if (check.kind === "min") {
          if (input.data.getTime() < check.value) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              message: check.message,
              inclusive: true,
              exact: false,
              minimum: check.value,
              type: "date",
            });
            status.dirty();
          }
        } else if (check.kind === "max") {
          if (input.data.getTime() > check.value) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              message: check.message,
              inclusive: true,
              exact: false,
              maximum: check.value,
              type: "date",
            });
            status.dirty();
          }
        } else util.assertNever(check);
      return {
        status: status.value,
        value: new Date(input.data.getTime()),
      };
    }
    _addCheck(check) {
      return new ZodDate({
        ...this._def,
        checks: [...this._def.checks, check],
      });
    }
    min(minDate, message) {
      return this._addCheck({
        kind: "min",
        value: minDate.getTime(),
        message: errorUtil.toString(message),
      });
    }
    max(maxDate, message) {
      return this._addCheck({
        kind: "max",
        value: maxDate.getTime(),
        message: errorUtil.toString(message),
      });
    }
    get minDate() {
      let min = null;
      for (let ch of this._def.checks)
        if (ch.kind === "min") {
          if (min === null || ch.value > min) min = ch.value;
        }
      return min != null ? new Date(min) : null;
    }
    get maxDate() {
      let max = null;
      for (let ch of this._def.checks)
        if (ch.kind === "max") {
          if (max === null || ch.value < max) max = ch.value;
        }
      return max != null ? new Date(max) : null;
    }
  };
});
//@ chunk-j2t139r9.js:33554-33635 esm-fingerprint
// deferred: uses ZodDate of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:33554", () => {
  ZodDate.create = (params) =>
    new ZodDate({
      checks: [],
      coerce: params?.coerce || false,
      typeName: compatTypeKindPlaceholder.ZodDate,
      ...processCreateParams(params),
    });
});
//@ chunk-j2t139r9.js:33635-33821 esm-fingerprint
let ZodSymbol; // deferred: uses ZodType of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:33635", () => {
  ZodSymbol = class ZodSymbol extends ZodType {
    _parse(input) {
      if (this._getType(input) !== ZodParsedType.symbol) {
        let ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.symbol,
          received: ctx.parsedType,
        });
        return INVALID;
      }
      return OK(input.data);
    }
  };
});
//@ chunk-j2t139r9.js:33821-33875 esm-fingerprint
// deferred: uses ZodSymbol of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:33821", () => {
  ZodSymbol.create = (params) =>
    new ZodSymbol({
      typeName: compatTypeKindPlaceholder.ZodSymbol,
      ...processCreateParams(params),
    });
});
//@ chunk-j2t139r9.js:33875-34066 esm-fingerprint
let ZodUndefined; // deferred: uses ZodType of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:33875", () => {
  ZodUndefined = class ZodUndefined extends ZodType {
    _parse(input) {
      if (this._getType(input) !== ZodParsedType.undefined) {
        let ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.undefined,
          received: ctx.parsedType,
        });
        return INVALID;
      }
      return OK(input.data);
    }
  };
});
//@ chunk-j2t139r9.js:34066-34121 esm-fingerprint
// deferred: uses ZodUndefined of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:34066", () => {
  ZodUndefined.create = (params) =>
    new ZodUndefined({
      typeName: compatTypeKindPlaceholder.ZodUndefined,
      ...processCreateParams(params),
    });
});
//@ chunk-j2t139r9.js:34121-34302 esm-fingerprint
let ZodNull; // deferred: uses ZodType of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:34121", () => {
  ZodNull = class ZodNull extends ZodType {
    _parse(input) {
      if (this._getType(input) !== ZodParsedType.null) {
        let ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.null,
          received: ctx.parsedType,
        });
        return INVALID;
      }
      return OK(input.data);
    }
  };
});
//@ chunk-j2t139r9.js:34302-34352 esm-fingerprint
// deferred: uses ZodNull of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:34302", () => {
  ZodNull.create = (params) =>
    new ZodNull({
      typeName: compatTypeKindPlaceholder.ZodNull,
      ...processCreateParams(params),
    });
});
//@ chunk-j2t139r9.js:34352-34445 esm-fingerprint
let ZodAny; // deferred: uses ZodType of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:34352", () => {
  ZodAny = class ZodAny extends ZodType {
    constructor() {
      super(...arguments);
      this._any = true;
    }
    _parse(input) {
      return OK(input.data);
    }
  };
});
//@ chunk-j2t139r9.js:34445-34494 esm-fingerprint
// deferred: uses ZodAny of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:34445", () => {
  ZodAny.create = (params) =>
    new ZodAny({
      typeName: compatTypeKindPlaceholder.ZodAny,
      ...processCreateParams(params),
    });
});
//@ chunk-j2t139r9.js:34494-34591 esm-fingerprint
let ZodUnknown; // deferred: uses ZodType of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:34494", () => {
  ZodUnknown = class ZodUnknown extends ZodType {
    constructor() {
      super(...arguments);
      this._unknown = true;
    }
    _parse(input) {
      return OK(input.data);
    }
  };
});
//@ chunk-j2t139r9.js:34591-34644 esm-fingerprint
// deferred: uses ZodUnknown of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:34591", () => {
  ZodUnknown.create = (params) =>
    new ZodUnknown({
      typeName: compatTypeKindPlaceholder.ZodUnknown,
      ...processCreateParams(params),
    });
});
//@ chunk-j2t139r9.js:34644-34779 esm-fingerprint
let ZodNever; // deferred: uses ZodType of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:34644", () => {
  ZodNever = class ZodNever extends ZodType {
    _parse(input) {
      let ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.never,
        received: ctx.parsedType,
      });
      return INVALID;
    }
  };
});
//@ chunk-j2t139r9.js:34779-34830 esm-fingerprint
// deferred: uses ZodNever of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:34779", () => {
  ZodNever.create = (params) =>
    new ZodNever({
      typeName: compatTypeKindPlaceholder.ZodNever,
      ...processCreateParams(params),
    });
});
//@ chunk-j2t139r9.js:34830-35017 esm-fingerprint
let ZodVoid; // deferred: uses ZodType of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:34830", () => {
  ZodVoid = class ZodVoid extends ZodType {
    _parse(input) {
      if (this._getType(input) !== ZodParsedType.undefined) {
        let ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.void,
          received: ctx.parsedType,
        });
        return INVALID;
      }
      return OK(input.data);
    }
  };
});
//@ chunk-j2t139r9.js:35017-35069 esm-fingerprint
// deferred: uses ZodVoid of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:35017", () => {
  ZodVoid.create = (params) =>
    new ZodVoid({
      typeName: compatTypeKindPlaceholder.ZodVoid,
      ...processCreateParams(params),
    });
});
//@ chunk-j2t139r9.js:35069-36457 esm-fingerprint
let ZodArray; // deferred: uses ZodType of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:35069", () => {
  ZodArray = class ZodArray extends ZodType {
    _parse(input) {
      let { ctx, status } = this._processInputParams(input);
      let def = this._def;
      if (ctx.parsedType !== ZodParsedType.array) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.array,
          received: ctx.parsedType,
        });
        return INVALID;
      }
      if (def.exactLength !== null) {
        let tooBig = ctx.data.length > def.exactLength.value;
        let tooSmall = ctx.data.length < def.exactLength.value;
        if (tooBig || tooSmall) {
          addIssueToContext(ctx, {
            code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
            minimum: tooSmall ? def.exactLength.value : undefined,
            maximum: tooBig ? def.exactLength.value : undefined,
            type: "array",
            inclusive: true,
            exact: true,
            message: def.exactLength.message,
          });
          status.dirty();
        }
      }
      if (def.minLength !== null) {
        if (ctx.data.length < def.minLength.value) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: def.minLength.value,
            type: "array",
            inclusive: true,
            exact: false,
            message: def.minLength.message,
          });
          status.dirty();
        }
      }
      if (def.maxLength !== null) {
        if (ctx.data.length > def.maxLength.value) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: def.maxLength.value,
            type: "array",
            inclusive: true,
            exact: false,
            message: def.maxLength.message,
          });
          status.dirty();
        }
      }
      if (ctx.common.async)
        return Promise.all(
          [...ctx.data].map((item, i) =>
            def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i)),
          ),
        ).then((result) => ParseStatus.mergeArray(status, result));
      let result = [...ctx.data].map((item, i) =>
        def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i)),
      );
      return ParseStatus.mergeArray(status, result);
    }
    get element() {
      return this._def.type;
    }
    min(minLength, message) {
      return new ZodArray({
        ...this._def,
        minLength: {
          value: minLength,
          message: errorUtil.toString(message),
        },
      });
    }
    max(maxLength, message) {
      return new ZodArray({
        ...this._def,
        maxLength: {
          value: maxLength,
          message: errorUtil.toString(message),
        },
      });
    }
    length(len, message) {
      return new ZodArray({
        ...this._def,
        exactLength: {
          value: len,
          message: errorUtil.toString(message),
        },
      });
    }
    nonempty(message) {
      return this.min(1, message);
    }
  };
});
//@ chunk-j2t139r9.js:36457-36564 esm-fingerprint
// deferred: uses ZodArray of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:36457", () => {
  ZodArray.create = (schema, params) =>
    new ZodArray({
      type: schema,
      minLength: null,
      maxLength: null,
      exactLength: null,
      typeName: compatTypeKindPlaceholder.ZodArray,
      ...processCreateParams(params),
    });
});
//@ chunk-j2t139r9.js:36564-36955 esm-fingerprint
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    let newShape = {};
    for (let key in schema.shape) {
      let fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: () => newShape,
    });
  } else if (schema instanceof ZodArray)
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element),
    });
  else if (schema instanceof ZodOptional) return ZodOptional.create(deepPartialify(schema.unwrap()));
  else if (schema instanceof ZodNullable) return ZodNullable.create(deepPartialify(schema.unwrap()));
  else if (schema instanceof ZodTuple)
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  else return schema;
}
//@ chunk-j2t139r9.js:36955-39932 esm-fingerprint
let ZodObject; // deferred: uses ZodType of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:36955", () => {
  ZodObject = class ZodObject extends ZodType {
    constructor() {
      super(...arguments);
      this._cached = null;
      this.nonstrict = this.passthrough;
      this.augment = this.extend;
    }
    _getCached() {
      if (this._cached !== null) return this._cached;
      let shape = this._def.shape();
      let keys = util.objectKeys(shape);
      this._cached = {
        shape,
        keys,
      };
      return this._cached;
    }
    _parse(input) {
      if (this._getType(input) !== ZodParsedType.object) {
        let ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.object,
          received: ctx.parsedType,
        });
        return INVALID;
      }
      let { status, ctx } = this._processInputParams(input);
      let { shape, keys: shapeKeys } = this._getCached();
      let extraKeys = [];
      if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
        for (let key in ctx.data) if (!shapeKeys.includes(key)) extraKeys.push(key);
      }
      let pairs = [];
      for (let key of shapeKeys) {
        let keyValidator = shape[key];
        let value = ctx.data[key];
        pairs.push({
          key: {
            status: "valid",
            value: key,
          },
          value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
          alwaysSet: key in ctx.data,
        });
      }
      if (this._def.catchall instanceof ZodNever) {
        let unknownKeys = this._def.unknownKeys;
        if (unknownKeys === "passthrough")
          for (let key of extraKeys)
            pairs.push({
              key: {
                status: "valid",
                value: key,
              },
              value: {
                status: "valid",
                value: ctx.data[key],
              },
            });
        else if (unknownKeys === "strict") {
          if (extraKeys.length > 0) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.unrecognized_keys,
              keys: extraKeys,
            });
            status.dirty();
          }
        } else if (unknownKeys === "strip");
        else throw Error("Internal ZodObject error: invalid unknownKeys value.");
      } else {
        let catchall = this._def.catchall;
        for (let key of extraKeys) {
          let value = ctx.data[key];
          pairs.push({
            key: {
              status: "valid",
              value: key,
            },
            value: catchall._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
            alwaysSet: key in ctx.data,
          });
        }
      }
      if (ctx.common.async)
        return Promise.resolve()
          .then(async () => {
            let syncPairs = [];
            for (let pair of pairs) {
              let key = await pair.key;
              let value = await pair.value;
              syncPairs.push({
                key,
                value,
                alwaysSet: pair.alwaysSet,
              });
            }
            return syncPairs;
          })
          .then((syncPairs) => ParseStatus.mergeObjectSync(status, syncPairs));
      else return ParseStatus.mergeObjectSync(status, pairs);
    }
    get shape() {
      return this._def.shape();
    }
    strict(message) {
      errorUtil.errToObj;
      return new ZodObject({
        ...this._def,
        unknownKeys: "strict",
        ...(message !== undefined
          ? {
              errorMap: (issue, ctx) => {
                let defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
                if (issue.code === "unrecognized_keys")
                  return {
                    message: errorUtil.errToObj(message).message ?? defaultError,
                  };
                return {
                  message: defaultError,
                };
              },
            }
          : {}),
      });
    }
    strip() {
      return new ZodObject({
        ...this._def,
        unknownKeys: "strip",
      });
    }
    passthrough() {
      return new ZodObject({
        ...this._def,
        unknownKeys: "passthrough",
      });
    }
    extend(augmentation) {
      return new ZodObject({
        ...this._def,
        shape: () => ({
          ...this._def.shape(),
          ...augmentation,
        }),
      });
    }
    merge(merging) {
      return new ZodObject({
        unknownKeys: merging._def.unknownKeys,
        catchall: merging._def.catchall,
        shape: () => ({
          ...this._def.shape(),
          ...merging._def.shape(),
        }),
        typeName: compatTypeKindPlaceholder.ZodObject,
      });
    }
    setKey(key, schema) {
      return this.augment({
        [key]: schema,
      });
    }
    catchall(index) {
      return new ZodObject({
        ...this._def,
        catchall: index,
      });
    }
    pick(mask) {
      let shape = {};
      for (let key of util.objectKeys(mask)) if (mask[key] && this.shape[key]) shape[key] = this.shape[key];
      return new ZodObject({
        ...this._def,
        shape: () => shape,
      });
    }
    omit(mask) {
      let shape = {};
      for (let key of util.objectKeys(this.shape)) if (!mask[key]) shape[key] = this.shape[key];
      return new ZodObject({
        ...this._def,
        shape: () => shape,
      });
    }
    deepPartial() {
      return deepPartialify(this);
    }
    partial(mask) {
      let newShape = {};
      for (let key of util.objectKeys(this.shape)) {
        let fieldSchema = this.shape[key];
        if (mask && !mask[key]) newShape[key] = fieldSchema;
        else newShape[key] = fieldSchema.optional();
      }
      return new ZodObject({
        ...this._def,
        shape: () => newShape,
      });
    }
    required(mask) {
      let newShape = {};
      for (let key of util.objectKeys(this.shape))
        if (mask && !mask[key]) newShape[key] = this.shape[key];
        else {
          let newField = this.shape[key];
          while (newField instanceof ZodOptional) newField = newField._def.innerType;
          newShape[key] = newField;
        }
      return new ZodObject({
        ...this._def,
        shape: () => newShape,
      });
    }
    keyof() {
      return createZodEnum(util.objectKeys(this.shape));
    }
  };
});
//@ chunk-j2t139r9.js:39932-40038 esm-fingerprint
// deferred: uses ZodObject of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:39932", () => {
  ZodObject.create = (shape, params) =>
    new ZodObject({
      shape: () => shape,
      unknownKeys: "strip",
      catchall: ZodNever.create(),
      typeName: compatTypeKindPlaceholder.ZodObject,
      ...processCreateParams(params),
    });
});
//@ chunk-j2t139r9.js:40038-40151 esm-fingerprint
// deferred: uses ZodObject of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:40038", () => {
  ZodObject.strictCreate = (shape, params) =>
    new ZodObject({
      shape: () => shape,
      unknownKeys: "strict",
      catchall: ZodNever.create(),
      typeName: compatTypeKindPlaceholder.ZodObject,
      ...processCreateParams(params),
    });
});
//@ chunk-j2t139r9.js:40151-40257 esm-fingerprint
// deferred: uses ZodObject of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:40151", () => {
  ZodObject.lazycreate = (shape, params) =>
    new ZodObject({
      shape,
      unknownKeys: "strip",
      catchall: ZodNever.create(),
      typeName: compatTypeKindPlaceholder.ZodObject,
      ...processCreateParams(params),
    });
});
//@ chunk-j2t139r9.js:40257-41281 esm-fingerprint
let ZodUnion; // deferred: uses ZodType of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:40257", () => {
  ZodUnion = class ZodUnion extends ZodType {
    _parse(input) {
      let { ctx } = this._processInputParams(input);
      let options = this._def.options;
      function handleResults(results) {
        for (let result of results) if (result.result.status === "valid") return result.result;
        for (let result of results)
          if (result.result.status === "dirty") {
            ctx.common.issues.push(...result.ctx.common.issues);
            return result.result;
          }
        let unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_union,
          unionErrors,
        });
        return INVALID;
      }
      if (ctx.common.async)
        return Promise.all(
          options.map(async (option) => {
            let childCtx = {
              ...ctx,
              common: {
                ...ctx.common,
                issues: [],
              },
              parent: null,
            };
            return {
              result: await option._parseAsync({
                data: ctx.data,
                path: ctx.path,
                parent: childCtx,
              }),
              ctx: childCtx,
            };
          }),
        ).then(handleResults);
      else {
        let dirty = undefined;
        let issues = [];
        for (let option of options) {
          let childCtx = {
            ...ctx,
            common: {
              ...ctx.common,
              issues: [],
            },
            parent: null,
          };
          let result = option._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx,
          });
          if (result.status === "valid") return result;
          else if (result.status === "dirty" && !dirty)
            dirty = {
              result,
              ctx: childCtx,
            };
          if (childCtx.common.issues.length) issues.push(childCtx.common.issues);
        }
        if (dirty) {
          ctx.common.issues.push(...dirty.ctx.common.issues);
          return dirty.result;
        }
        let unionErrors = issues.map((issues) => new ZodError(issues));
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_union,
          unionErrors,
        });
        return INVALID;
      }
    }
    get options() {
      return this._def.options;
    }
  };
});
//@ chunk-j2t139r9.js:41281-41344 esm-fingerprint
// deferred: uses ZodUnion of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:41281", () => {
  ZodUnion.create = (types, params) =>
    new ZodUnion({
      options: types,
      typeName: compatTypeKindPlaceholder.ZodUnion,
      ...processCreateParams(params),
    });
});
//@ chunk-j2t139r9.js:41344-41964 esm-fingerprint
var getDiscriminator = (type) => {
  if (type instanceof ZodLazy) return getDiscriminator(type.schema);
  else if (type instanceof ZodEffects) return getDiscriminator(type.innerType());
  else if (type instanceof ZodLiteral) return [type.value];
  else if (type instanceof ZodEnum) return type.options;
  else if (type instanceof ZodNativeEnum) return util.objectValues(type.enum);
  else if (type instanceof ZodDefault) return getDiscriminator(type._def.innerType);
  else if (type instanceof ZodUndefined) return [undefined];
  else if (type instanceof ZodNull) return [null];
  else if (type instanceof ZodOptional) return [undefined, ...getDiscriminator(type.unwrap())];
  else if (type instanceof ZodNullable) return [null, ...getDiscriminator(type.unwrap())];
  else if (type instanceof ZodBranded) return getDiscriminator(type.unwrap());
  else if (type instanceof ZodReadonly) return getDiscriminator(type.unwrap());
  else if (type instanceof ZodCatch) return getDiscriminator(type._def.innerType);
  else return [];
};
//@ chunk-j2t139r9.js:41964-42986 esm-fingerprint
let ZodDiscriminatedUnion; // deferred: uses ZodType of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:41964", () => {
  ZodDiscriminatedUnion = class ZodDiscriminatedUnion extends ZodType {
    _parse(input) {
      let { ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.object) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.object,
          received: ctx.parsedType,
        });
        return INVALID;
      }
      let discriminator = this.discriminator;
      let discriminatorValue = ctx.data[discriminator];
      let option = this.optionsMap.get(discriminatorValue);
      if (!option) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_union_discriminator,
          options: Array.from(this.optionsMap.keys()),
          path: [discriminator],
        });
        return INVALID;
      }
      if (ctx.common.async)
        return option._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx,
        });
      else
        return option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx,
        });
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
    static create(discriminator, options, params) {
      let optionsMap = new Map();
      for (let type of options) {
        let discriminatorValues = getDiscriminator(type.shape[discriminator]);
        if (!discriminatorValues.length)
          throw Error(
            `A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`,
          );
        for (let value of discriminatorValues) {
          if (optionsMap.has(value))
            throw Error(
              `Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`,
            );
          optionsMap.set(value, type);
        }
      }
      return new ZodDiscriminatedUnion({
        typeName: compatTypeKindPlaceholder.ZodDiscriminatedUnion,
        discriminator,
        options,
        optionsMap,
        ...processCreateParams(params),
      });
    }
  };
});
//@ chunk-j2t139r9.js:42986-43671 esm-fingerprint
function mergeValues(a_2, b) {
  let aType = getParsedType(a_2);
  let bType = getParsedType(b);
  if (a_2 === b)
    return {
      valid: true,
      data: a_2,
    };
  else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    let bKeys = util.objectKeys(b);
    let sharedKeys = util.objectKeys(a_2).filter((key) => bKeys.indexOf(key) !== -1);
    let newObj = {
      ...a_2,
      ...b,
    };
    if (Object.prototype.hasOwnProperty.call(newObj, "__proto__")) delete newObj.__proto__;
    for (let key of sharedKeys) {
      if (key === "__proto__") continue;
      let sharedValue = mergeValues(a_2[key], b[key]);
      if (!sharedValue.valid)
        return {
          valid: false,
        };
      newObj[key] = sharedValue.data;
    }
    return {
      valid: true,
      data: newObj,
    };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a_2.length !== b.length)
      return {
        valid: false,
      };
    let newArray = [];
    for (let index = 0; index < a_2.length; index++) {
      let itemA = a_2[index];
      let itemB = b[index];
      let sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid)
        return {
          valid: false,
        };
      newArray.push(sharedValue.data);
    }
    return {
      valid: true,
      data: newArray,
    };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a_2 === +b)
    return {
      valid: true,
      data: a_2,
    };
  else
    return {
      valid: false,
    };
}
//@ chunk-j2t139r9.js:43671-44264 esm-fingerprint
let ZodIntersection; // deferred: uses ZodType of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:43671", () => {
  ZodIntersection = class ZodIntersection extends ZodType {
    _parse(input) {
      let { status, ctx } = this._processInputParams(input);
      let handleParsed = (parsedLeft, parsedRight) => {
        if (isAborted(parsedLeft) || isAborted(parsedRight)) return INVALID;
        let merged = mergeValues(parsedLeft.value, parsedRight.value);
        if (!merged.valid) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_intersection_types,
          });
          return INVALID;
        }
        if (isDirty(parsedLeft) || isDirty(parsedRight)) status.dirty();
        return {
          status: status.value,
          value: merged.data,
        };
      };
      if (ctx.common.async)
        return Promise.all([
          this._def.left._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx,
          }),
          this._def.right._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx,
          }),
        ]).then(([left, right]) => handleParsed(left, right));
      else
        return handleParsed(
          this._def.left._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx,
          }),
          this._def.right._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx,
          }),
        );
    }
  };
});
//@ chunk-j2t139r9.js:44264-44341 esm-fingerprint
// deferred: uses ZodIntersection of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:44264", () => {
  ZodIntersection.create = (left, right, params) =>
    new ZodIntersection({
      left,
      right,
      typeName: compatTypeKindPlaceholder.ZodIntersection,
      ...processCreateParams(params),
    });
});
//@ chunk-j2t139r9.js:44341-45139 esm-fingerprint
let ZodTuple; // deferred: uses ZodType of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:44341", () => {
  ZodTuple = class ZodTuple extends ZodType {
    _parse(input) {
      let { status, ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.array) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.array,
          received: ctx.parsedType,
        });
        return INVALID;
      }
      if (ctx.data.length < this._def.items.length) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: this._def.items.length,
          inclusive: true,
          exact: false,
          type: "array",
        });
        return INVALID;
      }
      if (!this._def.rest && ctx.data.length > this._def.items.length) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: this._def.items.length,
          inclusive: true,
          exact: false,
          type: "array",
        });
        status.dirty();
      }
      let items = [...ctx.data]
        .map((item, itemIndex) => {
          let schema = this._def.items[itemIndex] || this._def.rest;
          if (!schema) return null;
          return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
        })
        .filter((x) => !!x);
      if (ctx.common.async)
        return Promise.all(items).then((results) => ParseStatus.mergeArray(status, results));
      else return ParseStatus.mergeArray(status, items);
    }
    get items() {
      return this._def.items;
    }
    rest(rest) {
      return new ZodTuple({
        ...this._def,
        rest,
      });
    }
  };
});
//@ chunk-j2t139r9.js:45139-45309 esm-fingerprint
// deferred: uses ZodTuple of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:45139", () => {
  ZodTuple.create = (schemas, params) => {
    if (!Array.isArray(schemas)) throw Error("You must pass an array of schemas to z.tuple([ ... ])");
    return new ZodTuple({
      items: schemas,
      typeName: compatTypeKindPlaceholder.ZodTuple,
      rest: null,
      ...processCreateParams(params),
    });
  };
});
//@ chunk-j2t139r9.js:45309-46067 esm-fingerprint
let ZodRecord; // deferred: uses ZodType of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:45309", () => {
  ZodRecord = class ZodRecord extends ZodType {
    get keySchema() {
      return this._def.keyType;
    }
    get valueSchema() {
      return this._def.valueType;
    }
    _parse(input) {
      let { status, ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.object) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.object,
          received: ctx.parsedType,
        });
        return INVALID;
      }
      let pairs = [];
      let keyType = this._def.keyType;
      let valueType = this._def.valueType;
      for (let key in ctx.data)
        pairs.push({
          key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
          value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
          alwaysSet: key in ctx.data,
        });
      if (ctx.common.async) return ParseStatus.mergeObjectAsync(status, pairs);
      else return ParseStatus.mergeObjectSync(status, pairs);
    }
    get element() {
      return this._def.valueType;
    }
    static create(first, second, third) {
      if (second instanceof ZodType)
        return new ZodRecord({
          keyType: first,
          valueType: second,
          typeName: compatTypeKindPlaceholder.ZodRecord,
          ...processCreateParams(third),
        });
      return new ZodRecord({
        keyType: ZodString.create(),
        valueType: first,
        typeName: compatTypeKindPlaceholder.ZodRecord,
        ...processCreateParams(second),
      });
    }
  };
});
//@ chunk-j2t139r9.js:46067-47011 esm-fingerprint
let ZodMap; // deferred: uses ZodType of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:46067", () => {
  ZodMap = class ZodMap extends ZodType {
    get keySchema() {
      return this._def.keyType;
    }
    get valueSchema() {
      return this._def.valueType;
    }
    _parse(input) {
      let { status, ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.map) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.map,
          received: ctx.parsedType,
        });
        return INVALID;
      }
      let keyType = this._def.keyType;
      let valueType = this._def.valueType;
      let pairs = [...ctx.data.entries()].map(([key, value], index) => ({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"])),
      }));
      if (ctx.common.async) {
        let finalMap = new Map();
        return Promise.resolve().then(async () => {
          for (let pair of pairs) {
            let key = await pair.key;
            let value = await pair.value;
            if (key.status === "aborted" || value.status === "aborted") return INVALID;
            if (key.status === "dirty" || value.status === "dirty") status.dirty();
            finalMap.set(key.value, value.value);
          }
          return {
            status: status.value,
            value: finalMap,
          };
        });
      } else {
        let finalMap = new Map();
        for (let pair of pairs) {
          let { key, value } = pair;
          if (key.status === "aborted" || value.status === "aborted") return INVALID;
          if (key.status === "dirty" || value.status === "dirty") status.dirty();
          finalMap.set(key.value, value.value);
        }
        return {
          status: status.value,
          value: finalMap,
        };
      }
    }
  };
});
//@ chunk-j2t139r9.js:47011-47088 esm-fingerprint
// deferred: uses ZodMap of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:47011", () => {
  ZodMap.create = (keyType, valueType, params) =>
    new ZodMap({
      valueType,
      keyType,
      typeName: compatTypeKindPlaceholder.ZodMap,
      ...processCreateParams(params),
    });
});
//@ chunk-j2t139r9.js:47088-48169 esm-fingerprint
let ZodSet; // deferred: uses ZodType of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:47088", () => {
  ZodSet = class ZodSet extends ZodType {
    _parse(input) {
      let { status, ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.set) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.set,
          received: ctx.parsedType,
        });
        return INVALID;
      }
      let def = this._def;
      if (def.minSize !== null) {
        if (ctx.data.size < def.minSize.value) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: def.minSize.value,
            type: "set",
            inclusive: true,
            exact: false,
            message: def.minSize.message,
          });
          status.dirty();
        }
      }
      if (def.maxSize !== null) {
        if (ctx.data.size > def.maxSize.value) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: def.maxSize.value,
            type: "set",
            inclusive: true,
            exact: false,
            message: def.maxSize.message,
          });
          status.dirty();
        }
      }
      let valueType = this._def.valueType;
      function finalizeSet(elements) {
        let parsedSet = new Set();
        for (let element of elements) {
          if (element.status === "aborted") return INVALID;
          if (element.status === "dirty") status.dirty();
          parsedSet.add(element.value);
        }
        return {
          status: status.value,
          value: parsedSet,
        };
      }
      let elements = [...ctx.data.values()].map((item, i) =>
        valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)),
      );
      if (ctx.common.async) return Promise.all(elements).then((elements) => finalizeSet(elements));
      else return finalizeSet(elements);
    }
    min(minSize, message) {
      return new ZodSet({
        ...this._def,
        minSize: {
          value: minSize,
          message: errorUtil.toString(message),
        },
      });
    }
    max(maxSize, message) {
      return new ZodSet({
        ...this._def,
        maxSize: {
          value: maxSize,
          message: errorUtil.toString(message),
        },
      });
    }
    size(size, message) {
      return this.min(size, message).max(size, message);
    }
    nonempty(message) {
      return this.min(1, message);
    }
  };
});
//@ chunk-j2t139r9.js:48169-48258 esm-fingerprint
// deferred: uses ZodSet of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:48169", () => {
  ZodSet.create = (valueType, params) =>
    new ZodSet({
      valueType,
      minSize: null,
      maxSize: null,
      typeName: compatTypeKindPlaceholder.ZodSet,
      ...processCreateParams(params),
    });
});
//@ chunk-j2t139r9.js:48258-49863 esm-fingerprint
let ZodFunction; // deferred: uses ZodType of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:48258", () => {
  ZodFunction = class ZodFunction extends ZodType {
    constructor() {
      super(...arguments);
      this.validate = this.implement;
    }
    _parse(input) {
      let { ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.function) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.function,
          received: ctx.parsedType,
        });
        return INVALID;
      }
      function makeArgsIssue(args, error) {
        return makeIssue({
          data: args,
          path: ctx.path,
          errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), errorMap_2].filter(
            (x) => !!x,
          ),
          issueData: {
            code: ZodIssueCode.invalid_arguments,
            argumentsError: error,
          },
        });
      }
      function makeReturnsIssue(returns, error) {
        return makeIssue({
          data: returns,
          path: ctx.path,
          errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), errorMap_2].filter(
            (x) => !!x,
          ),
          issueData: {
            code: ZodIssueCode.invalid_return_type,
            returnTypeError: error,
          },
        });
      }
      let params = {
        errorMap: ctx.common.contextualErrorMap,
      };
      let fn = ctx.data;
      if (this._def.returns instanceof ZodPromise) {
        let me = this;
        return OK(async function (...args) {
          let error = new ZodError([]);
          let parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
            error.addIssue(makeArgsIssue(args, e));
            throw error;
          });
          let result = await Reflect.apply(fn, this, parsedArgs);
          return await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
            error.addIssue(makeReturnsIssue(result, e));
            throw error;
          });
        });
      } else {
        let me = this;
        return OK(function (...args) {
          let parsedArgs = me._def.args.safeParse(args, params);
          if (!parsedArgs.success) throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
          let result = Reflect.apply(fn, this, parsedArgs.data);
          let parsedReturns = me._def.returns.safeParse(result, params);
          if (!parsedReturns.success) throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
          return parsedReturns.data;
        });
      }
    }
    parameters() {
      return this._def.args;
    }
    returnType() {
      return this._def.returns;
    }
    args(...items) {
      return new ZodFunction({
        ...this._def,
        args: ZodTuple.create(items).rest(ZodUnknown.create()),
      });
    }
    returns(returnType) {
      return new ZodFunction({
        ...this._def,
        returns: returnType,
      });
    }
    implement(input) {
      return this.parse(input);
    }
    strictImplement(input) {
      return this.parse(input);
    }
    static create(args, returns, params) {
      return new ZodFunction({
        args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
        returns: returns || ZodUnknown.create(),
        typeName: compatTypeKindPlaceholder.ZodFunction,
        ...processCreateParams(params),
      });
    }
  };
});
//@ chunk-j2t139r9.js:49863-50040 esm-fingerprint
let ZodLazy; // deferred: uses ZodType of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:49863", () => {
  ZodLazy = class ZodLazy extends ZodType {
    get schema() {
      return this._def.getter();
    }
    _parse(input) {
      let { ctx } = this._processInputParams(input);
      return this._def.getter()._parse({
        data: ctx.data,
        path: ctx.path,
        parent: ctx,
      });
    }
  };
});
//@ chunk-j2t139r9.js:50040-50103 esm-fingerprint
// deferred: uses ZodLazy of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:50040", () => {
  ZodLazy.create = (getter, params) =>
    new ZodLazy({
      getter,
      typeName: compatTypeKindPlaceholder.ZodLazy,
      ...processCreateParams(params),
    });
});
//@ chunk-j2t139r9.js:50103-50344 esm-fingerprint
let ZodLiteral; // deferred: uses ZodType of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:50103", () => {
  ZodLiteral = class ZodLiteral extends ZodType {
    _parse(input) {
      if (input.data !== this._def.value) {
        let ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          received: ctx.data,
          code: ZodIssueCode.invalid_literal,
          expected: this._def.value,
        });
        return INVALID;
      }
      return {
        status: "valid",
        value: input.data,
      };
    }
    get value() {
      return this._def.value;
    }
  };
});
//@ chunk-j2t139r9.js:50344-50409 esm-fingerprint
// deferred: uses ZodLiteral of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:50344", () => {
  ZodLiteral.create = (value, params) =>
    new ZodLiteral({
      value,
      typeName: compatTypeKindPlaceholder.ZodLiteral,
      ...processCreateParams(params),
    });
});
//@ chunk-j2t139r9.js:50409-50478 esm-fingerprint
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: compatTypeKindPlaceholder.ZodEnum,
    ...processCreateParams(params),
  });
}
//@ chunk-j2t139r9.js:50478-51288 esm-fingerprint
let ZodEnum; // deferred: uses ZodType of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:50478", () => {
  ZodEnum = class ZodEnum extends ZodType {
    _parse(input) {
      if (typeof input.data !== "string") {
        let ctx = this._getOrReturnCtx(input);
        let expectedValues = this._def.values;
        addIssueToContext(ctx, {
          expected: util.joinValues(expectedValues),
          received: ctx.parsedType,
          code: ZodIssueCode.invalid_type,
        });
        return INVALID;
      }
      if (!this._cache) this._cache = new Set(this._def.values);
      if (!this._cache.has(input.data)) {
        let ctx = this._getOrReturnCtx(input);
        let expectedValues = this._def.values;
        addIssueToContext(ctx, {
          received: ctx.data,
          code: ZodIssueCode.invalid_enum_value,
          options: expectedValues,
        });
        return INVALID;
      }
      return OK(input.data);
    }
    get options() {
      return this._def.values;
    }
    get enum() {
      let enumValues = {};
      for (let val of this._def.values) enumValues[val] = val;
      return enumValues;
    }
    get Values() {
      let enumValues = {};
      for (let val of this._def.values) enumValues[val] = val;
      return enumValues;
    }
    get Enum() {
      let enumValues = {};
      for (let val of this._def.values) enumValues[val] = val;
      return enumValues;
    }
    extract(values, newDef = this._def) {
      return ZodEnum.create(values, {
        ...this._def,
        ...newDef,
      });
    }
    exclude(values, newDef = this._def) {
      return ZodEnum.create(
        this.options.filter((opt) => !values.includes(opt)),
        {
          ...this._def,
          ...newDef,
        },
      );
    }
  };
});
//@ chunk-j2t139r9.js:51288-51300 esm-layout
// deferred: uses ZodEnum of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:51288", () => {
  ZodEnum.create = createZodEnum;
});
//@ chunk-j2t139r9.js:51300-51812 esm-fingerprint
let ZodNativeEnum; // deferred: uses ZodType of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:51300", () => {
  ZodNativeEnum = class ZodNativeEnum extends ZodType {
    _parse(input) {
      let nativeEnumValues = util.getValidEnumValues(this._def.values);
      let ctx = this._getOrReturnCtx(input);
      if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
        let expectedValues = util.objectValues(nativeEnumValues);
        addIssueToContext(ctx, {
          expected: util.joinValues(expectedValues),
          received: ctx.parsedType,
          code: ZodIssueCode.invalid_type,
        });
        return INVALID;
      }
      if (!this._cache) this._cache = new Set(util.getValidEnumValues(this._def.values));
      if (!this._cache.has(input.data)) {
        let expectedValues = util.objectValues(nativeEnumValues);
        addIssueToContext(ctx, {
          received: ctx.data,
          code: ZodIssueCode.invalid_enum_value,
          options: expectedValues,
        });
        return INVALID;
      }
      return OK(input.data);
    }
    get enum() {
      return this._def.values;
    }
  };
});
//@ chunk-j2t139r9.js:51812-51881 esm-fingerprint
// deferred: uses ZodNativeEnum of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:51812", () => {
  ZodNativeEnum.create = (values, params) =>
    new ZodNativeEnum({
      values,
      typeName: compatTypeKindPlaceholder.ZodNativeEnum,
      ...processCreateParams(params),
    });
});
//@ chunk-j2t139r9.js:51881-52272 esm-fingerprint
let ZodPromise; // deferred: uses ZodType of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:51881", () => {
  ZodPromise = class ZodPromise extends ZodType {
    unwrap() {
      return this._def.type;
    }
    _parse(input) {
      let { ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.promise,
          received: ctx.parsedType,
        });
        return INVALID;
      }
      let promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
      return OK(
        promisified.then((data) =>
          this._def.type.parseAsync(data, {
            path: ctx.path,
            errorMap: ctx.common.contextualErrorMap,
          }),
        ),
      );
    }
  };
});
//@ chunk-j2t139r9.js:52272-52334 esm-fingerprint
// deferred: uses ZodPromise of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:52272", () => {
  ZodPromise.create = (schema, params) =>
    new ZodPromise({
      type: schema,
      typeName: compatTypeKindPlaceholder.ZodPromise,
      ...processCreateParams(params),
    });
});
//@ chunk-j2t139r9.js:52334-54479 esm-fingerprint
let ZodEffects; // deferred: uses ZodType of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:52334", () => {
  ZodEffects = class ZodEffects extends ZodType {
    innerType() {
      return this._def.schema;
    }
    sourceType() {
      return this._def.schema._def.typeName === compatTypeKindPlaceholder.ZodEffects
        ? this._def.schema.sourceType()
        : this._def.schema;
    }
    _parse(input) {
      let { status, ctx } = this._processInputParams(input);
      let effect = this._def.effect || null;
      let checkCtx = {
        addIssue: (arg) => {
          addIssueToContext(ctx, arg);
          if (arg.fatal) status.abort();
          else status.dirty();
        },
        get path() {
          return ctx.path;
        },
      };
      checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
      if (effect.type === "preprocess") {
        let processed = effect.transform(ctx.data, checkCtx);
        if (ctx.common.async)
          return Promise.resolve(processed).then(async (processed) => {
            if (status.value === "aborted") return INVALID;
            let result = await this._def.schema._parseAsync({
              data: processed,
              path: ctx.path,
              parent: ctx,
            });
            if (result.status === "aborted") return INVALID;
            if (result.status === "dirty") return DIRTY(result.value);
            if (status.value === "dirty") return DIRTY(result.value);
            return result;
          });
        else {
          if (status.value === "aborted") return INVALID;
          let result = this._def.schema._parseSync({
            data: processed,
            path: ctx.path,
            parent: ctx,
          });
          if (result.status === "aborted") return INVALID;
          if (result.status === "dirty") return DIRTY(result.value);
          if (status.value === "dirty") return DIRTY(result.value);
          return result;
        }
      }
      if (effect.type === "refinement") {
        let executeRefinement = (acc) => {
          let result = effect.refinement(acc, checkCtx);
          if (ctx.common.async) return Promise.resolve(result);
          if (result instanceof Promise)
            throw Error(
              "Async refinement encountered during synchronous parse operation. Use .parseAsync instead.",
            );
          return acc;
        };
        if (ctx.common.async === false) {
          let inner = this._def.schema._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx,
          });
          if (inner.status === "aborted") return INVALID;
          if (inner.status === "dirty") status.dirty();
          executeRefinement(inner.value);
          return {
            status: status.value,
            value: inner.value,
          };
        } else
          return this._def.schema
            ._parseAsync({
              data: ctx.data,
              path: ctx.path,
              parent: ctx,
            })
            .then((inner) => {
              if (inner.status === "aborted") return INVALID;
              if (inner.status === "dirty") status.dirty();
              return executeRefinement(inner.value).then(() => ({
                status: status.value,
                value: inner.value,
              }));
            });
      }
      if (effect.type === "transform")
        if (ctx.common.async === false) {
          let base = this._def.schema._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx,
          });
          if (!isValid(base)) return INVALID;
          let result = effect.transform(base.value, checkCtx);
          if (result instanceof Promise)
            throw Error(
              "Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.",
            );
          return {
            status: status.value,
            value: result,
          };
        } else
          return this._def.schema
            ._parseAsync({
              data: ctx.data,
              path: ctx.path,
              parent: ctx,
            })
            .then((base) => {
              if (!isValid(base)) return INVALID;
              return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
                status: status.value,
                value: result,
              }));
            });
      util.assertNever(effect);
    }
  };
});
//@ chunk-j2t139r9.js:54479-54554 esm-fingerprint
// deferred: uses ZodEffects of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:54479", () => {
  ZodEffects.create = (schema, effect, params) =>
    new ZodEffects({
      schema,
      typeName: compatTypeKindPlaceholder.ZodEffects,
      effect,
      ...processCreateParams(params),
    });
});
//@ chunk-j2t139r9.js:54554-54673 esm-fingerprint
// deferred: uses ZodEffects of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:54554", () => {
  ZodEffects.createWithPreprocess = (preprocess, schema, params) =>
    new ZodEffects({
      schema,
      effect: {
        type: "preprocess",
        transform: preprocess,
      },
      typeName: compatTypeKindPlaceholder.ZodEffects,
      ...processCreateParams(params),
    });
});
//@ chunk-j2t139r9.js:54673-54826 esm-fingerprint
let ZodOptional; // deferred: uses ZodType of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:54673", () => {
  ZodOptional = class ZodOptional extends ZodType {
    _parse(input) {
      if (this._getType(input) === ZodParsedType.undefined) return OK(undefined);
      return this._def.innerType._parse(input);
    }
    unwrap() {
      return this._def.innerType;
    }
  };
});
//@ chunk-j2t139r9.js:54826-54894 esm-fingerprint
// deferred: uses ZodOptional of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:54826", () => {
  ZodOptional.create = (type, params) =>
    new ZodOptional({
      innerType: type,
      typeName: compatTypeKindPlaceholder.ZodOptional,
      ...processCreateParams(params),
    });
});
//@ chunk-j2t139r9.js:54894-55040 esm-fingerprint
let ZodNullable; // deferred: uses ZodType of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:54894", () => {
  ZodNullable = class ZodNullable extends ZodType {
    _parse(input) {
      if (this._getType(input) === ZodParsedType.null) return OK(null);
      return this._def.innerType._parse(input);
    }
    unwrap() {
      return this._def.innerType;
    }
  };
});
//@ chunk-j2t139r9.js:55040-55108 esm-fingerprint
// deferred: uses ZodNullable of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:55040", () => {
  ZodNullable.create = (type, params) =>
    new ZodNullable({
      innerType: type,
      typeName: compatTypeKindPlaceholder.ZodNullable,
      ...processCreateParams(params),
    });
});
//@ chunk-j2t139r9.js:55108-55351 esm-fingerprint
let ZodDefault; // deferred: uses ZodType of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:55108", () => {
  ZodDefault = class ZodDefault extends ZodType {
    _parse(input) {
      let { ctx } = this._processInputParams(input);
      let data = ctx.data;
      if (ctx.parsedType === ZodParsedType.undefined) data = this._def.defaultValue();
      return this._def.innerType._parse({
        data,
        path: ctx.path,
        parent: ctx,
      });
    }
    removeDefault() {
      return this._def.innerType;
    }
  };
});
//@ chunk-j2t139r9.js:55351-55487 esm-fingerprint
// deferred: uses ZodDefault of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:55351", () => {
  ZodDefault.create = (type, params) =>
    new ZodDefault({
      innerType: type,
      typeName: compatTypeKindPlaceholder.ZodDefault,
      defaultValue: typeof params.default === "function" ? params.default : () => params.default,
      ...processCreateParams(params),
    });
});
//@ chunk-j2t139r9.js:55487-56008 esm-fingerprint
let ZodCatch; // deferred: uses ZodType of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:55487", () => {
  ZodCatch = class ZodCatch extends ZodType {
    _parse(input) {
      let { ctx } = this._processInputParams(input);
      let newCtx = {
        ...ctx,
        common: {
          ...ctx.common,
          issues: [],
        },
      };
      let result = this._def.innerType._parse({
        data: newCtx.data,
        path: newCtx.path,
        parent: {
          ...newCtx,
        },
      });
      if (isPromise(result))
        return result.then((result) => ({
          status: "valid",
          value:
            result.status === "valid"
              ? result.value
              : this._def.catchValue({
                  get error() {
                    return new ZodError(newCtx.common.issues);
                  },
                  input: newCtx.data,
                }),
        }));
      else
        return {
          status: "valid",
          value:
            result.status === "valid"
              ? result.value
              : this._def.catchValue({
                  get error() {
                    return new ZodError(newCtx.common.issues);
                  },
                  input: newCtx.data,
                }),
        };
    }
    removeCatch() {
      return this._def.innerType;
    }
  };
});
//@ chunk-j2t139r9.js:56008-56134 esm-fingerprint
// deferred: uses ZodCatch of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:56008", () => {
  ZodCatch.create = (type, params) =>
    new ZodCatch({
      innerType: type,
      typeName: compatTypeKindPlaceholder.ZodCatch,
      catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
      ...processCreateParams(params),
    });
});
//@ chunk-j2t139r9.js:56134-56333 esm-fingerprint
let ZodNaN; // deferred: uses ZodType of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:56134", () => {
  ZodNaN = class ZodNaN extends ZodType {
    _parse(input) {
      if (this._getType(input) !== ZodParsedType.nan) {
        let ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.nan,
          received: ctx.parsedType,
        });
        return INVALID;
      }
      return {
        status: "valid",
        value: input.data,
      };
    }
  };
});
//@ chunk-j2t139r9.js:56333-56384 esm-fingerprint
// deferred: uses ZodNaN of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:56333", () => {
  ZodNaN.create = (params) =>
    new ZodNaN({
      typeName: compatTypeKindPlaceholder.ZodNaN,
      ...processCreateParams(params),
    });
});
//@ chunk-j2t139r9.js:56384-56411 esm-fingerprint
var BRAND; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-j2t139r9.js:56384", () => {
  BRAND = Symbol("zod_brand");
});
//@ chunk-j2t139r9.js:56411-56580 esm-fingerprint
let ZodBranded; // deferred: uses ZodType of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:56411", () => {
  ZodBranded = class ZodBranded extends ZodType {
    _parse(input) {
      let { ctx } = this._processInputParams(input);
      let data = ctx.data;
      return this._def.type._parse({
        data,
        path: ctx.path,
        parent: ctx,
      });
    }
    unwrap() {
      return this._def.type;
    }
  };
});
//@ chunk-j2t139r9.js:56580-57247 esm-fingerprint
let ZodPipeline; // deferred: uses ZodType of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:56580", () => {
  ZodPipeline = class ZodPipeline extends ZodType {
    _parse(input) {
      let { status, ctx } = this._processInputParams(input);
      if (ctx.common.async)
        return (async () => {
          let inResult = await this._def.in._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx,
          });
          if (inResult.status === "aborted") return INVALID;
          if (inResult.status === "dirty") {
            status.dirty();
            return DIRTY(inResult.value);
          } else
            return this._def.out._parseAsync({
              data: inResult.value,
              path: ctx.path,
              parent: ctx,
            });
        })();
      else {
        let inResult = this._def.in._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx,
        });
        if (inResult.status === "aborted") return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return {
            status: "dirty",
            value: inResult.value,
          };
        } else
          return this._def.out._parseSync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx,
          });
      }
    }
    static create(a, b) {
      return new ZodPipeline({
        in: a,
        out: b,
        typeName: compatTypeKindPlaceholder.ZodPipeline,
      });
    }
  };
});
//@ chunk-j2t139r9.js:57247-57441 esm-fingerprint
let ZodReadonly; // deferred: uses ZodType of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:57247", () => {
  ZodReadonly = class ZodReadonly extends ZodType {
    _parse(input) {
      let result = this._def.innerType._parse(input);
      let freeze = (data) => {
        if (isValid(data)) data.value = Object.freeze(data.value);
        return data;
      };
      return isPromise(result) ? result.then((data) => freeze(data)) : freeze(result);
    }
    unwrap() {
      return this._def.innerType;
    }
  };
});
//@ chunk-j2t139r9.js:57441-57511 esm-fingerprint
// deferred: uses ZodReadonly of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:57441", () => {
  ZodReadonly.create = (type, params) =>
    new ZodReadonly({
      innerType: type,
      typeName: compatTypeKindPlaceholder.ZodReadonly,
      ...processCreateParams(params),
    });
});
//@ chunk-j2t139r9.js:57511-57636 esm-fingerprint
function cleanParams(params, data) {
  let p =
    typeof params === "function"
      ? params(data)
      : typeof params === "string"
        ? {
            message: params,
          }
        : params;
  return typeof p === "string"
    ? {
        message: p,
      }
    : p;
}
//@ chunk-j2t139r9.js:57636-57945 esm-fingerprint
/**
 * zod 的 custom() 校验构造（第三方库代码，误归到 EnterWorktree）。
 */
function custom(check, _params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      let r = check(data);
      if (r instanceof Promise)
        return r.then((r) => {
          if (!r) {
            let params = cleanParams(_params, data);
            let _fatal = params.fatal ?? fatal ?? true;
            ctx.addIssue({
              code: "custom",
              ...params,
              fatal: _fatal,
            });
          }
        });
      if (!r) {
        let params = cleanParams(_params, data);
        let _fatal = params.fatal ?? fatal ?? true;
        ctx.addIssue({
          code: "custom",
          ...params,
          fatal: _fatal,
        });
      }
      return;
    });
  return ZodAny.create();
}
//@ chunk-j2t139r9.js:57945-57976 esm-fingerprint
/**
 * 官方行为，保留：compat.js 的 var e;(function(o){})(e||(e={})) 是空的兼容占位（cjs 版同样为空），ZodFirstPartyTypeKind 只是借位，本构建没有可用的枚举值。
 */
var lazyCreateTable; // deferred: uses ZodObject of its import cycle while loading; runs once the cycle is complete
var compatTypeKindPlaceholder;
deferInit("chunk-j2t139r9.js:57945", () => {
  lazyCreateTable = {
    object: ZodObject.lazycreate,
  };
});
//@ chunk-j2t139r9.js:57976-58896 esm-fingerprint
// deferred: uses lazyCreateTable of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j2t139r9.js:57976", () => {
  (function (typeKindEnum) {
    typeKindEnum.ZodString = "ZodString";
    typeKindEnum.ZodNumber = "ZodNumber";
    typeKindEnum.ZodNaN = "ZodNaN";
    typeKindEnum.ZodBigInt = "ZodBigInt";
    typeKindEnum.ZodBoolean = "ZodBoolean";
    typeKindEnum.ZodDate = "ZodDate";
    typeKindEnum.ZodSymbol = "ZodSymbol";
    typeKindEnum.ZodUndefined = "ZodUndefined";
    typeKindEnum.ZodNull = "ZodNull";
    typeKindEnum.ZodAny = "ZodAny";
    typeKindEnum.ZodUnknown = "ZodUnknown";
    typeKindEnum.ZodNever = "ZodNever";
    typeKindEnum.ZodVoid = "ZodVoid";
    typeKindEnum.ZodArray = "ZodArray";
    typeKindEnum.ZodObject = "ZodObject";
    typeKindEnum.ZodUnion = "ZodUnion";
    typeKindEnum.ZodDiscriminatedUnion = "ZodDiscriminatedUnion";
    typeKindEnum.ZodIntersection = "ZodIntersection";
    typeKindEnum.ZodTuple = "ZodTuple";
    typeKindEnum.ZodRecord = "ZodRecord";
    typeKindEnum.ZodMap = "ZodMap";
    typeKindEnum.ZodSet = "ZodSet";
    typeKindEnum.ZodFunction = "ZodFunction";
    typeKindEnum.ZodLazy = "ZodLazy";
    typeKindEnum.ZodLiteral = "ZodLiteral";
    typeKindEnum.ZodEnum = "ZodEnum";
    typeKindEnum.ZodEffects = "ZodEffects";
    typeKindEnum.ZodNativeEnum = "ZodNativeEnum";
    typeKindEnum.ZodOptional = "ZodOptional";
    typeKindEnum.ZodNullable = "ZodNullable";
    typeKindEnum.ZodDefault = "ZodDefault";
    typeKindEnum.ZodCatch = "ZodCatch";
    typeKindEnum.ZodPromise = "ZodPromise";
    typeKindEnum.ZodBranded = "ZodBranded";
    typeKindEnum.ZodPipeline = "ZodPipeline";
    typeKindEnum.ZodReadonly = "ZodReadonly";
  })(compatTypeKindPlaceholder || (compatTypeKindPlaceholder = {}));
});
export {
  custom,
  ZodString,
  ZodNumber,
  ZodNaN,
  ZodBigInt,
  ZodBoolean,
  ZodDate,
  ZodSymbol,
  ZodUndefined,
  ZodNull,
  ZodAny,
  ZodUnknown,
  ZodNever,
  ZodVoid,
  ZodArray,
  ZodObject,
  ZodUnion,
  ZodDiscriminatedUnion,
  ZodIntersection,
  ZodTuple,
  ZodRecord,
  ZodMap,
  ZodSet,
  ZodFunction,
  ZodLazy,
  ZodLiteral,
  ZodEnum,
  ZodNativeEnum,
  ZodPromise,
  ZodEffects,
  ZodOptional,
  ZodNullable,
  ZodPipeline,
};
