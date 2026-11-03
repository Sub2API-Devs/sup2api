/**
 * zod/v4/classic/schemas.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-7vp249v4.js (92)
 * attribution: esm-fingerprint 73, esm-layout 19
 */
import { $ZodCheck } from "../core/checks.js";
import {
  normalizeParams,
  mergeDefs,
  clone,
  shs,
  own,
  derived,
  installLazyProp,
  extend,
  safeExtend,
  merge,
  pick,
  omit,
  partial,
  required,
  issue,
  shallowClone,
} from "../core/util.js";
import { Fr, $ZodEncodeError, MIi } from "../core/core.js";
import { Ys, Ti, Ni, slo, Ci, Ri, Di, ji, Li, Fi, Mi, Ui, Ji } from "../locales/fr.js";
import {
  $ZodType,
  standardProps,
  $ZodString,
  $ZodStringFormat,
  $ZodISODateTime,
  $ZodISODate,
  $ZodISOTime,
  $ZodISODuration,
  $ZodEmail,
  $ZodGUID,
  $ZodUUID,
  $ZodURL,
  $ZodEmoji,
  $ZodNanoID,
  $ZodCUID,
  $ZodCUID2,
  $ZodULID,
  $ZodXID,
  $ZodKSUID,
  $ZodIPv4,
  $ZodIPv6,
  Co,
  $ZodCIDRv6,
  $ZodBase64,
  $ZodBase64URL,
  $ZodE164,
  $ZodJWT,
  $ZodNumber,
  $ZodNumberFormat,
  $ZodBoolean,
  Bo,
  $ZodNull,
  $ZodAny,
  $ZodUnknown,
  $ZodNever,
  $ZodArray,
  $ZodObjectJIT,
  $ZodUnion,
  $ZodDiscriminatedUnion,
  $ZodIntersection,
  $ZodTuple,
  $ZodRecord,
  on,
  $ZodLiteral,
  sn,
  $ZodOptional,
  $ZodExactOptional,
  $ZodNullable,
  $ZodDefault,
  $ZodPrefault,
  $ZodNonOptional,
  $ZodCatch,
  $ZodPipe,
  dn,
  $ZodReadonly,
  nlo,
  hn,
} from "../core/schemas.js";
import {
  _overwrite,
  _regex,
  _includes,
  _startsWith,
  _endsWith,
  _minLength,
  _maxSize,
  _length,
  _lowercase,
  _uppercase,
  ut,
  _normalize,
  _toLowerCase,
  _toUpperCase,
  pt,
  _email,
  _url,
  _creditCard,
  _emoji_2,
  _guid,
  _uuid,
  _uuidv4,
  _uuidv6,
  _uuidv7,
  _nanoid,
  _cuid,
  _cuid2,
  _ulid,
  _base64,
  _base64url,
  _xid,
  _ksuid,
  _ipv4,
  _ipv6,
  _mac,
  _cidrv6,
  _e164,
  _isoDateTime,
  _isoDate,
  _isoTime,
  _isoDuration,
  _string,
  _gt,
  _gte,
  ye,
  _lte,
  ze,
  _number,
  _int,
  _float32,
  _uint32,
  _bigint,
  _null_2,
  qn,
  _unknown,
  _never,
  _array,
  Qn,
  _refine,
  _superRefine,
} from "../core/api.js";
import { globalRegistry } from "../core/registries.js";
import { createStandardJSONSchemaMethod, createToJSONSchemaMethod } from "../core/to-json-schema.js";
import { validate, validateAsync } from "../core/parse.js";
import {
  stringProcessor,
  aggregateChecks,
  numberProcessor,
  booleanProcessor,
  undefinedProcessor,
  nullProcessor,
  anyProcessor,
  unknownProcessor,
  neverProcessor,
  arrayProcessor,
  objectProcessor,
  unionProcessor,
  intersectionProcessor,
  tupleProcessor,
  recordProcessor,
  enumProcessor,
  literalProcessor,
  transformProcessor,
  optionalProcessor,
  nullableProcessor,
  defaultProcessor,
  prefaultProcessor,
  nonoptionalProcessor,
  catchProcessor,
  pipeProcessor,
  readonlyProcessor,
  lazyProcessor,
  customProcessor,
} from "../core/json-schema-processors.js";
import { ie } from "../core/memoizer.cjs";

//@ chunk-7vp249v4.js:56803-56884 esm-fingerprint
function Rs(check, t) {
  let r = new $ZodCheck({
    check: "custom",
    ...normalizeParams(t),
  });
  r._zod.check = check;
  return r;
}
//@ chunk-7vp249v4.js:79949-84124 esm-fingerprint
var ZodType = Fr(
  "ZodType",
  (inst, def) => {
    Ys();
    $ZodType.init(inst, def);
    inst.def = def;
    inst.type = def.type;
    return inst;
  },
  {
    check(...chks) {
      let def = this.def;
      return this.clone(
        mergeDefs(def, {
          checks: [
            ...(def.checks ?? []),
            ...chks.map((ch) =>
              typeof ch === "function"
                ? {
                    _zod: {
                      check: ch,
                      def: {
                        check: "custom",
                      },
                      onattach: [],
                    },
                  }
                : ch,
            ),
          ],
        }),
        {
          parent: true,
        },
      );
    },
    with(...chks) {
      return this.check(...chks);
    },
    clone(def, params) {
      return clone(this, def, params);
    },
    brand() {
      return this;
    },
    register(reg, meta) {
      reg.add(this, meta);
      return this;
    },
    refine(check, params) {
      return this.check(refine(check, params));
    },
    superRefine(refinement, params) {
      return this.check(superRefine(refinement, params));
    },
    overwrite(fn) {
      return this.check(_overwrite(fn));
    },
    optional() {
      return optional(this);
    },
    exactOptional() {
      return exactOptional(this);
    },
    nullable() {
      return nullable(this);
    },
    nullish() {
      return optional(nullable(this));
    },
    nonoptional(params) {
      return nonoptional(this, params);
    },
    array() {
      return array(this);
    },
    or(arg) {
      return union([this, arg]);
    },
    and(arg) {
      return intersection(this, arg);
    },
    transform(tx) {
      return pipe(this, transform(tx));
    },
    default(d) {
      return wc(this, d);
    },
    prefault(d) {
      return Sc(this, d);
    },
    catch(params) {
      return Oc(this, params);
    },
    pipe(target) {
      return pipe(this, target);
    },
    readonly() {
      return readonly(this);
    },
    describe(description) {
      let cl = this.clone();
      globalRegistry.add(cl, {
        description,
      });
      return cl;
    },
    meta(...args) {
      if (args.length === 0) return globalRegistry.get(this);
      let cl = this.clone();
      globalRegistry.add(cl, args[0]);
      return cl;
    },
    isOptional() {
      return this.safeParse(undefined).success;
    },
    isNullable() {
      return this.safeParse(null).success;
    },
    apply(fn, ...args) {
      return args.length === 0 ? fn(this) : fn(this, ...args);
    },
    get "~standard"() {
      return shs(this, "~standard", {
        ...standardProps(this),
        jsonSchema: {
          input: createStandardJSONSchemaMethod(this, "input"),
          output: createStandardJSONSchemaMethod(this, "output"),
        },
      });
    },
    set "~standard"(value) {
      own(this, "~standard", value);
    },
    parse: function _parse(data, params) {
      return Ti(this, data, params, {
        callee: _parse,
      });
    },
    parseAsync: async function _parseAsync(data, params) {
      return await Ni(this, data, params, {
        callee: _parseAsync,
      });
    },
    safeParse(data, params) {
      return slo(this, data, params);
    },
    async safeParseAsync(data, params) {
      return Ci(this, data, params);
    },
    get spa() {
      return this?.safeParseAsync;
    },
    set spa(value) {
      own(this, "spa", value);
    },
    validate(data, params) {
      return validate(this, data, params);
    },
    validateAsync(data, params) {
      return validateAsync(this, data, params);
    },
    encode: function _encode(data, params) {
      return Ri(this, data, params, {
        callee: _encode,
      });
    },
    decode: function _decode(data, params) {
      return Di(this, data, params, {
        callee: _decode,
      });
    },
    encodeAsync: async function _encodeAsync(data, params) {
      return await ji(this, data, params, {
        callee: _encodeAsync,
      });
    },
    decodeAsync: async function _decodeAsync(data, params) {
      return await Li(this, data, params, {
        callee: _decodeAsync,
      });
    },
    safeEncode(data, params) {
      return Fi(this, data, params);
    },
    safeDecode(data, params) {
      return Mi(this, data, params);
    },
    async safeEncodeAsync(data, params) {
      return Ui(this, data, params);
    },
    async safeDecodeAsync(data, params) {
      return Ji(this, data, params);
    },
    toJSONSchema(params) {
      return createToJSONSchemaMethod(this, {})(params);
    },
    get description() {
      return globalRegistry.get(this)?.description;
    },
    get _def() {
      return this._zod.def;
    },
  },
);
var Ki = Fr(
  "_ZodString",
  (schema, def) => {
    $ZodString.init(schema, def);
    ZodType.init(schema, def);
    schema._zod.processJSONSchema = (ctx, n, i) => stringProcessor(schema, ctx, n, i);
  },
  derived(
    {
      format: (e) => aggregateChecks(e).format ?? null,
      minLength: (e) => aggregateChecks(e).minimum ?? null,
      maxLength: (e) => aggregateChecks(e).maximum ?? null,
    },
    {
      regex(...args) {
        return this.check(_regex(...args));
      },
      includes(...args) {
        return this.check(_includes(...args));
      },
      startsWith(...args) {
        return this.check(_startsWith(...args));
      },
      endsWith(...args) {
        return this.check(_endsWith(...args));
      },
      min(...args) {
        return this.check(_minLength(...args));
      },
      max(...args) {
        return this.check(_maxSize(...args));
      },
      length(...args) {
        return this.check(_length(...args));
      },
      nonempty(...args) {
        return this.check(_minLength(1, ...args));
      },
      lowercase(params) {
        return this.check(_lowercase(params));
      },
      uppercase(params) {
        return this.check(_uppercase(params));
      },
      trim() {
        return this.check(ut());
      },
      normalize(...args) {
        return this.check(_normalize(...args));
      },
      toLowerCase() {
        return this.check(_toLowerCase());
      },
      toUpperCase() {
        return this.check(_toUpperCase());
      },
      slugify() {
        return this.check(pt());
      },
    },
  ),
);
var lMn = Fr(
  "ZodString",
  (e, t) => {
    $ZodString.init(e, t);
    Ki.init(e, t);
  },
  {
    email(params) {
      return this.check(_email(ZodEmail, params));
    },
    url(params) {
      return this.check(_url(ZodURL, params));
    },
    jwt(params) {
      return this.check(_creditCard(dc, params));
    },
    emoji(params) {
      return this.check(_emoji_2(Qs, params));
    },
    guid(params) {
      return this.check(_guid(ZodGUID, params));
    },
    uuid(args) {
      return this.check(_uuid(ZodUUID, args));
    },
    uuidv4(args) {
      return this.check(_uuidv4(ZodUUID, args));
    },
    uuidv6(args) {
      return this.check(_uuidv6(ZodUUID, args));
    },
    uuidv7(params) {
      return this.check(_uuidv7(ZodUUID, params));
    },
    nanoid(params) {
      return this.check(_nanoid(ZodNanoID, params));
    },
    cuid(params) {
      return this.check(_cuid(ZodCUID, params));
    },
    cuid2(params) {
      return this.check(_cuid2(ZodCUID2, params));
    },
    ulid(params) {
      return this.check(_ulid(ZodULID, params));
    },
    base64(params) {
      return this.check(_base64(ZodBase64, params));
    },
    base64url(params) {
      return this.check(_base64url(ZodBase64URL, params));
    },
    xid(params) {
      return this.check(_xid(ZodXID, params));
    },
    ksuid(params) {
      return this.check(_ksuid(ZodKSUID, params));
    },
    ipv4(params) {
      return this.check(_ipv4(ZodIPv4, params));
    },
    ipv6(params) {
      return this.check(_ipv6(uc, params));
    },
    cidrv4(params) {
      return this.check(_mac(ZodCIDRv4, params));
    },
    cidrv6(params) {
      return this.check(_cidrv6(ZodCIDRv6, params));
    },
    e164(params) {
      return this.check(_e164(ZodE164, params));
    },
    datetime(params) {
      return this.check(_isoDateTime(ZodISODateTime, params));
    },
    date(params) {
      return this.check(_isoDate(ZodISODate, params));
    },
    time(params) {
      return this.check(_isoTime(ZodISOTime, params));
    },
    duration(params) {
      return this.check(_isoDuration(ZodISODuration, params));
    },
  },
);
//@ chunk-7vp249v4.js:84124-84155 esm-layout
function string(params) {
  return _string(lMn, params);
}
//@ chunk-7vp249v4.js:84155-84495 esm-fingerprint
var ZodStringFormat = Fr("ZodStringFormat", (inst, def) => {
  $ZodStringFormat.init(inst, def);
  Ki.init(inst, def);
});
var ZodISODateTime = Fr("ZodISODateTime", (inst, def) => {
  $ZodISODateTime.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodISODate = Fr("ZodISODate", (inst, def) => {
  $ZodISODate.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodISOTime = Fr("ZodISOTime", (inst, def) => {
  $ZodISOTime.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodISODuration = Fr("ZodISODuration", (inst, def) => {
  $ZodISODuration.init(inst, def);
  ZodStringFormat.init(inst, def);
});
var ZodEmail = Fr("ZodEmail", (inst, def) => {
  $ZodEmail.init(inst, def);
  ZodStringFormat.init(inst, def);
});
//@ chunk-7vp249v4.js:84495-84527 esm-layout
function _Ii(params) {
  return _email(ZodEmail, params);
}
//@ chunk-7vp249v4.js:84527-84582 esm-fingerprint
var ZodGUID = Fr("ZodGUID", (inst, def) => {
  $ZodGUID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
//@ chunk-7vp249v4.js:84582-84614 esm-layout
function bIi(params) {
  return _guid(ZodGUID, params);
}
//@ chunk-7vp249v4.js:84614-84669 esm-fingerprint
var ZodUUID = Fr("ZodUUID", (inst, def) => {
  $ZodUUID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
//@ chunk-7vp249v4.js:84669-84701 esm-layout
function zJt(params) {
  return _uuid(ZodUUID, params);
}
//@ chunk-7vp249v4.js:84701-84755 esm-fingerprint
var ZodURL = Fr("ZodURL", (inst, def) => {
  $ZodURL.init(inst, def);
  ZodStringFormat.init(inst, def);
});
//@ chunk-7vp249v4.js:84755-84787 esm-layout
function A8e(params) {
  return _url(ZodURL, params);
}
//@ chunk-7vp249v4.js:84787-84843 esm-fingerprint
var Qs = Fr("ZodEmoji", (inst, def) => {
  $ZodEmoji.init(inst, def);
  ZodStringFormat.init(inst, def);
});
//@ chunk-7vp249v4.js:84843-84900 esm-fingerprint
var ZodNanoID = Fr("ZodNanoID", (inst, def) => {
  $ZodNanoID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
//@ chunk-7vp249v4.js:84900-84955 esm-fingerprint
var ZodCUID = Fr("ZodCUID", (inst, def) => {
  $ZodCUID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
//@ chunk-7vp249v4.js:84955-85011 esm-fingerprint
var ZodCUID2 = Fr("ZodCUID2", (inst, def) => {
  $ZodCUID2.init(inst, def);
  ZodStringFormat.init(inst, def);
});
//@ chunk-7vp249v4.js:85011-85066 esm-fingerprint
var ZodULID = Fr("ZodULID", (inst, def) => {
  $ZodULID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
//@ chunk-7vp249v4.js:85066-85120 esm-fingerprint
var ZodXID = Fr("ZodXID", (inst, def) => {
  $ZodXID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
//@ chunk-7vp249v4.js:85120-85176 esm-fingerprint
var ZodKSUID = Fr("ZodKSUID", (inst, def) => {
  $ZodKSUID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
//@ chunk-7vp249v4.js:85176-85231 esm-fingerprint
var ZodIPv4 = Fr("ZodIPv4", (inst, def) => {
  $ZodIPv4.init(inst, def);
  ZodStringFormat.init(inst, def);
});
//@ chunk-7vp249v4.js:85231-85286 esm-fingerprint
var uc = Fr("ZodIPv6", (inst, def) => {
  $ZodIPv6.init(inst, def);
  ZodStringFormat.init(inst, def);
});
//@ chunk-7vp249v4.js:85286-85343 esm-fingerprint
var ZodCIDRv4 = Fr("ZodCIDRv4", (inst, def) => {
  Co.init(inst, def);
  ZodStringFormat.init(inst, def);
});
//@ chunk-7vp249v4.js:85343-85400 esm-fingerprint
var ZodCIDRv6 = Fr("ZodCIDRv6", (inst, def) => {
  $ZodCIDRv6.init(inst, def);
  ZodStringFormat.init(inst, def);
});
//@ chunk-7vp249v4.js:85400-85457 esm-fingerprint
var ZodBase64 = Fr("ZodBase64", (inst, def) => {
  $ZodBase64.init(inst, def);
  ZodStringFormat.init(inst, def);
});
//@ chunk-7vp249v4.js:85457-85489 esm-layout
function SIi(params) {
  return _base64(ZodBase64, params);
}
//@ chunk-7vp249v4.js:85489-85549 esm-fingerprint
var ZodBase64URL = Fr("ZodBase64URL", (inst, def) => {
  $ZodBase64URL.init(inst, def);
  ZodStringFormat.init(inst, def);
});
//@ chunk-7vp249v4.js:85549-85604 esm-fingerprint
var ZodE164 = Fr("ZodE164", (inst, def) => {
  $ZodE164.init(inst, def);
  ZodStringFormat.init(inst, def);
});
//@ chunk-7vp249v4.js:85604-85658 esm-fingerprint
var dc = Fr("ZodJWT", (inst, def) => {
  $ZodJWT.init(inst, def);
  ZodStringFormat.init(inst, def);
});
//@ chunk-7vp249v4.js:85658-86710 esm-fingerprint
var ZodNumber = Fr(
  "ZodNumber",
  (inst, def) => {
    $ZodNumber.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => numberProcessor(inst, ctx, json, params);
    inst.isFinite = true;
  },
  derived(
    {
      minValue: (inst) => {
        let { minimum, exclusiveMinimum } = aggregateChecks(inst);
        return Math.max(minimum ?? Number.NEGATIVE_INFINITY, exclusiveMinimum ?? Number.NEGATIVE_INFINITY);
      },
      maxValue: (inst) => {
        let { maximum, exclusiveMaximum } = aggregateChecks(inst);
        return Math.min(maximum ?? Number.POSITIVE_INFINITY, exclusiveMaximum ?? Number.POSITIVE_INFINITY);
      },
      isInt: (inst) => {
        let { isInt, multipleOf } = aggregateChecks(inst);
        return !!isInt || !!multipleOf?.some(Number.isSafeInteger);
      },
      format: (inst) => aggregateChecks(inst).format ?? null,
    },
    {
      gt(value, params) {
        return this.check(_gt(value, params));
      },
      gte(value, params) {
        return this.check(_gte(value, params));
      },
      min(value, params) {
        return this.check(_gte(value, params));
      },
      lt(value, params) {
        return this.check(ye(value, params));
      },
      lte(value, params) {
        return this.check(_lte(value, params));
      },
      max(value, params) {
        return this.check(_lte(value, params));
      },
      int(params) {
        return this.check(int(params));
      },
      safe(params) {
        return this.check(int(params));
      },
      positive(params) {
        return this.check(_gt(0, params));
      },
      nonnegative(params) {
        return this.check(_gte(0, params));
      },
      negative(params) {
        return this.check(ye(0, params));
      },
      nonpositive(params) {
        return this.check(_lte(0, params));
      },
      multipleOf(value, params) {
        return this.check(ze(value, params));
      },
      step(value, params) {
        return this.check(ze(value, params));
      },
      finite() {
        return this;
      },
    },
  ),
);
//@ chunk-7vp249v4.js:86710-86741 esm-layout
function E(params) {
  return _number(ZodNumber, params);
}
//@ chunk-7vp249v4.js:86741-86806 esm-fingerprint
var ZodNumberFormat = Fr("ZodNumberFormat", (inst, def) => {
  $ZodNumberFormat.init(inst, def);
  ZodNumber.init(inst, def);
});
//@ chunk-7vp249v4.js:86806-86837 esm-layout
function int(params) {
  return _int(ZodNumberFormat, params);
}
//@ chunk-7vp249v4.js:86837-86869 esm-layout
function wIi(params) {
  return _float32(ZodNumberFormat, params);
}
//@ chunk-7vp249v4.js:86869-86975 esm-fingerprint
var ZodBoolean = Fr("ZodBoolean", (inst, def) => {
  $ZodBoolean.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => booleanProcessor(inst, ctx, json, params);
});
//@ chunk-7vp249v4.js:86975-87006 esm-layout
function M(params) {
  return _uint32(ZodBoolean, params);
}
//@ chunk-7vp249v4.js:87006-87113 esm-fingerprint
var ZodUndefined = Fr("ZodUndefined", (inst, def) => {
  Bo.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => undefinedProcessor(inst, ctx, json, params);
});
//@ chunk-7vp249v4.js:87113-87144 esm-layout
function QD(params) {
  return _bigint(ZodUndefined, params);
}
//@ chunk-7vp249v4.js:87144-87246 esm-fingerprint
var ZodNull = Fr("ZodNull", (inst, def) => {
  $ZodNull.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => nullProcessor(inst, ctx, json, params);
});
//@ chunk-7vp249v4.js:87246-87277 esm-layout
function zg(params) {
  return _null_2(ZodNull, params);
}
//@ chunk-7vp249v4.js:87277-87378 esm-fingerprint
var ZodAny = Fr("ZodAny", (inst, def) => {
  $ZodAny.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => anyProcessor(inst, ctx, json, params);
});
//@ chunk-7vp249v4.js:87378-87407 esm-layout
function qne() {
  return qn(ZodAny);
}
//@ chunk-7vp249v4.js:87407-87512 esm-fingerprint
var ZodUnknown = Fr("ZodUnknown", (inst, def) => {
  $ZodUnknown.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => unknownProcessor(inst, ctx, json, params);
});
//@ chunk-7vp249v4.js:87512-87540 esm-layout
function unknown() {
  return _unknown(ZodUnknown);
}
//@ chunk-7vp249v4.js:87540-87643 esm-fingerprint
var ZodNever = Fr("ZodNever", (inst, def) => {
  $ZodNever.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => neverProcessor(inst, ctx, json, params);
});
//@ chunk-7vp249v4.js:87643-87675 esm-layout
function never(params) {
  return _never(ZodNever, params);
}
//@ chunk-7vp249v4.js:87675-87989 esm-fingerprint
var ZodArray = Fr(
  "ZodArray",
  (inst, def) => {
    ie();
    $ZodArray.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => arrayProcessor(inst, ctx, json, params);
    inst.element = def.element;
  },
  {
    min(n, params) {
      return this.check(_minLength(n, params));
    },
    nonempty(params) {
      return this.check(_minLength(1, params));
    },
    max(n, params) {
      return this.check(_maxSize(n, params));
    },
    length(n, params) {
      return this.check(_length(n, params));
    },
    unwrap() {
      return this.element;
    },
  },
);
//@ chunk-7vp249v4.js:87989-88024 esm-layout
function array(element, params) {
  return _array(ZodArray, element, params);
}
//@ chunk-7vp249v4.js:88024-88845 esm-fingerprint
var B1e = Fr(
  "ZodObject",
  (inst, def) => {
    ie();
    $ZodObjectJIT.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => objectProcessor(inst, ctx, json, params);
    installLazyProp(inst, "shape", (r) => r._zod.def.shape, false);
  },
  {
    keyof() {
      return _enum(Object.keys(this._zod.def.shape));
    },
    catchall(catchall) {
      return this.clone(
        mergeDefs(this._zod.def, {
          catchall,
        }),
      );
    },
    passthrough() {
      return this.clone(
        mergeDefs(this._zod.def, {
          catchall: unknown(),
        }),
      );
    },
    loose() {
      return this.clone(
        mergeDefs(this._zod.def, {
          catchall: unknown(),
        }),
      );
    },
    strict() {
      return this.clone(
        mergeDefs(this._zod.def, {
          catchall: never(),
        }),
      );
    },
    strip() {
      return this.clone(
        mergeDefs(this._zod.def, {
          catchall: undefined,
        }),
      );
    },
    extend(incoming) {
      return extend(this, incoming);
    },
    safeExtend(incoming) {
      return safeExtend(this, incoming);
    },
    merge(other) {
      return merge(this, other);
    },
    pick(mask) {
      return pick(this, mask);
    },
    omit(mask) {
      return omit(this, mask);
    },
    partial(...args) {
      return partial(ZodOptional, this, args[0]);
    },
    exactPartial(...args) {
      return partial(ZodExactOptional, this, args[0], "exactPartial");
    },
    required(...args) {
      return required(ZodNonOptional, this, args[0]);
    },
  },
);
//@ chunk-7vp249v4.js:88845-88922 esm-fingerprint
function u(e, t) {
  let r = {
    type: "object",
    shape: e ?? {},
    ...normalizeParams(t),
  };
  return new B1e(r);
}
//@ chunk-7vp249v4.js:88922-89003 esm-fingerprint
/**
 * zod v4 内部：构造 strict 对象 schema（catchall 为 never）。属第三方 zod，见 lead 建议。
 */
function zodStrictObject(shape, params) {
  return new B1e({
    type: "object",
    shape,
    catchall: never(),
    ...normalizeParams(params),
  });
}
//@ chunk-7vp249v4.js:89003-89083 esm-fingerprint
function looseObject(shape, params) {
  return new B1e({
    type: "object",
    shape,
    catchall: unknown(),
    ...normalizeParams(params),
  });
}
//@ chunk-7vp249v4.js:89083-89206 esm-fingerprint
var ZodUnion = Fr("ZodUnion", (inst, def) => {
  $ZodUnion.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => unionProcessor(inst, ctx, json, params);
  inst.options = def.options;
});
//@ chunk-7vp249v4.js:89206-89272 esm-fingerprint
function union(options, params) {
  return new ZodUnion({
    type: "union",
    options,
    ...normalizeParams(params),
  });
}
//@ chunk-7vp249v4.js:89272-89342 esm-fingerprint
var ZodDiscriminatedUnion = Fr("ZodDiscriminatedUnion", (inst, def) => {
  ZodUnion.init(inst, def);
  $ZodDiscriminatedUnion.init(inst, def);
});
//@ chunk-7vp249v4.js:89342-89426 esm-fingerprint
function discriminatedUnion(discriminator, options, params) {
  return new ZodDiscriminatedUnion({
    type: "union",
    options,
    discriminator,
    ...normalizeParams(params),
  });
}
//@ chunk-7vp249v4.js:89426-89536 esm-fingerprint
var ZodIntersection = Fr("ZodIntersection", (inst, def) => {
  $ZodIntersection.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => intersectionProcessor(inst, ctx, json, params);
});
//@ chunk-7vp249v4.js:89536-89606 esm-fingerprint
function intersection(left, right) {
  return new ZodIntersection({
    type: "intersection",
    left,
    right,
  });
}
//@ chunk-7vp249v4.js:89606-89991 esm-fingerprint
var ZodTuple = Fr(
  "ZodTuple",
  (inst, def) => {
    ie();
    $ZodTuple.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => tupleProcessor(inst, ctx, json, params);
  },
  {
    rest(rest) {
      return this.clone({
        ...this._zod.def,
        rest,
      });
    },
    partial() {
      let def = this._zod.def;
      if (def.checks?.length)
        throw Error(".partial() cannot be used on tuple schemas containing refinements");
      return this.clone({
        ...def,
        items: def.items.map(
          (item) =>
            new ZodOptional({
              type: "optional",
              innerType: item,
            }),
        ),
      });
    },
  },
);
//@ chunk-7vp249v4.js:89991-90101 esm-fingerprint
function tuple(items, _paramsOrRest, _params) {
  let hasRest = _paramsOrRest instanceof $ZodType;
  let params = hasRest ? _params : _paramsOrRest;
  return new ZodTuple({
    type: "tuple",
    items,
    rest: hasRest ? _paramsOrRest : null,
    ...normalizeParams(params),
  });
}
//@ chunk-7vp249v4.js:90101-90254 esm-fingerprint
var ZodRecord = Fr("ZodRecord", (inst, def) => {
  ie();
  $ZodRecord.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => recordProcessor(inst, ctx, json, params);
  inst.keyType = def.keyType;
  inst.valueType = def.valueType;
});
//@ chunk-7vp249v4.js:90254-90414 esm-fingerprint
function record(keyType, valueType, params) {
  if (!valueType || !valueType._zod)
    return new ZodRecord({
      type: "record",
      keyType: string(),
      valueType: keyType,
      ...normalizeParams(valueType),
    });
  return new ZodRecord({
    type: "record",
    keyType,
    valueType,
    ...normalizeParams(params),
  });
}
//@ chunk-7vp249v4.js:90414-90507 esm-fingerprint
function partialRecord(keyType, valueType, params) {
  return new ZodRecord({
    type: "record",
    keyType,
    valueType,
    ...normalizeParams(params),
    partial: true,
  });
}
//@ chunk-7vp249v4.js:90507-91044 esm-fingerprint
var ZodEnum = Fr("ZodEnum", (inst, def) => {
  on.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => enumProcessor(inst, ctx, json, params);
  inst.enum = def.entries;
  inst.options = [...inst._zod.values];
  let keys = new Set(Object.keys(def.entries));
  inst.extract = (values, params) => {
    let newEntries = {};
    for (let value of values)
      if (keys.has(value)) newEntries[value] = def.entries[value];
      else throw Error(`Key ${value} not found in enum`);
    return new ZodEnum({
      ...def,
      checks: [],
      ...normalizeParams(params),
      entries: newEntries,
    });
  };
  inst.exclude = (values, params) => {
    let newEntries = {
      ...def.entries,
    };
    for (let value of values)
      if (keys.has(value)) delete newEntries[value];
      else throw Error(`Key ${value} not found in enum`);
    return new ZodEnum({
      ...def,
      checks: [],
      ...normalizeParams(params),
      entries: newEntries,
    });
  };
});
//@ chunk-7vp249v4.js:91044-91172 esm-fingerprint
function _enum(values, params) {
  let entries = Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values;
  return new ZodEnum({
    type: "enum",
    entries,
    ...normalizeParams(params),
  });
}
//@ chunk-7vp249v4.js:91172-91477 esm-fingerprint
var ZodLiteral = Fr("ZodLiteral", (inst, def) => {
  $ZodLiteral.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => literalProcessor(inst, ctx, json, params);
  inst.values = new Set(def.values);
  Object.defineProperty(inst, "value", {
    get() {
      if (def.values.length > 1)
        throw Error("This schema contains multiple valid literal values. Use `.values` instead.");
      return def.values[0];
    },
  });
});
//@ chunk-7vp249v4.js:91477-91565 esm-fingerprint
function literal(value, params) {
  return new ZodLiteral({
    type: "literal",
    values: Array.isArray(value) ? value : [value],
    ...normalizeParams(params),
  });
}
//@ chunk-7vp249v4.js:91565-92080 esm-fingerprint
var ZodTransform = Fr("ZodTransform", (inst, def) => {
  ie();
  sn.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => transformProcessor(inst, ctx, json, params);
  inst._zod.parse = (payload, _ctx) => {
    if (_ctx.direction === "backward") throw new $ZodEncodeError(inst.constructor.name);
    payload.addIssue = (issue_2) => {
      if (typeof issue_2 === "string") payload.issues.push(issue(issue_2, payload.value, def));
      else {
        let _issue = issue_2;
        if (_issue.fatal) _issue.continue = false;
        _issue.code ?? (_issue.code = "custom");
        if (!("input" in _issue)) _issue.input = payload.value;
        _issue.inst ?? (_issue.inst = inst);
        payload.issues.push(issue(_issue));
      }
    };
    let output = def.transform(payload.value, payload);
    if (output instanceof Promise)
      return output.then((output) => {
        payload.value = output;
        return payload;
      });
    payload.value = output;
    return payload;
  };
});
//@ chunk-7vp249v4.js:92080-92141 esm-fingerprint
function transform(fn) {
  return new ZodTransform({
    type: "transform",
    transform: fn,
  });
}
//@ chunk-7vp249v4.js:92141-92282 esm-fingerprint
var ZodOptional = Fr("ZodOptional", (inst, def) => {
  $ZodOptional.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
//@ chunk-7vp249v4.js:92282-92343 esm-fingerprint
function optional(innerType) {
  return new ZodOptional({
    type: "optional",
    innerType,
  });
}
//@ chunk-7vp249v4.js:92343-92488 esm-fingerprint
var ZodExactOptional = Fr("ZodExactOptional", (inst, def) => {
  $ZodExactOptional.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
//@ chunk-7vp249v4.js:92488-92548 esm-fingerprint
function exactOptional(innerType) {
  return new ZodExactOptional({
    type: "optional",
    innerType,
  });
}
//@ chunk-7vp249v4.js:92548-92688 esm-fingerprint
var ZodNullable = Fr("ZodNullable", (inst, def) => {
  $ZodNullable.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => nullableProcessor(inst, ctx, json, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
//@ chunk-7vp249v4.js:92688-92748 esm-fingerprint
function nullable(innerType) {
  return new ZodNullable({
    type: "nullable",
    innerType,
  });
}
//@ chunk-7vp249v4.js:92748-92912 esm-fingerprint
var Zc = Fr("ZodDefault", (inst, def) => {
  $ZodDefault.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => defaultProcessor(inst, ctx, json, params);
  inst.unwrap = () => inst._zod.def.innerType;
  inst.removeDefault = inst.unwrap;
});
//@ chunk-7vp249v4.js:92912-93033 esm-fingerprint
function wc(innerType, t) {
  return new Zc({
    type: "default",
    innerType,
    get defaultValue() {
      return typeof t === "function" ? t() : shallowClone(t);
    },
  });
}
//@ chunk-7vp249v4.js:93033-93173 esm-fingerprint
var Pc = Fr("ZodPrefault", (inst, def) => {
  $ZodPrefault.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => prefaultProcessor(inst, ctx, json, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
//@ chunk-7vp249v4.js:93173-93295 esm-fingerprint
function Sc(innerType, t) {
  return new Pc({
    type: "prefault",
    innerType,
    get defaultValue() {
      return typeof t === "function" ? t() : shallowClone(t);
    },
  });
}
//@ chunk-7vp249v4.js:93295-93438 esm-fingerprint
var ZodNonOptional = Fr("ZodNonOptional", (inst, def) => {
  $ZodNonOptional.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => nonoptionalProcessor(inst, ctx, json, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
//@ chunk-7vp249v4.js:93438-93512 esm-fingerprint
function nonoptional(innerType, params) {
  return new ZodNonOptional({
    type: "nonoptional",
    innerType,
    ...normalizeParams(params),
  });
}
//@ chunk-7vp249v4.js:93512-93673 esm-fingerprint
var ilo = Fr("ZodCatch", (inst, def) => {
  $ZodCatch.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => catchProcessor(inst, ctx, json, params);
  inst.unwrap = () => inst._zod.def.innerType;
  inst.removeCatch = inst.unwrap;
});
//@ chunk-7vp249v4.js:93673-93775 esm-fingerprint
function Oc(innerType, params) {
  return new ilo({
    type: "catch",
    innerType,
    catchValue: typeof params === "function" ? params : MIi(params),
  });
}
//@ chunk-7vp249v4.js:93775-93900 esm-fingerprint
var ZodPipe = Fr("ZodPipe", (inst, def) => {
  $ZodPipe.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => pipeProcessor(inst, ctx, json, params);
  inst.in = def.in;
  inst.out = def.out;
});
//@ chunk-7vp249v4.js:93900-93958 esm-fingerprint
function pipe(in_, out) {
  return new ZodPipe({
    type: "pipe",
    in: in_,
    out,
  });
}
//@ chunk-7vp249v4.js:93958-94157 esm-fingerprint
var ZodPreprocess = Fr("ZodPreprocess", (inst, def) => {
  ZodPipe.init(inst, def);
  dn.init(inst, def);
});
var ZodReadonly = Fr("ZodReadonly", (inst, def) => {
  $ZodReadonly.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => readonlyProcessor(inst, ctx, json, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
//@ chunk-7vp249v4.js:94157-94217 esm-fingerprint
function readonly(innerType) {
  return new ZodReadonly({
    type: "readonly",
    innerType,
  });
}
//@ chunk-7vp249v4.js:94217-94353 esm-fingerprint
var ZodLazy = Fr("ZodLazy", (inst, def) => {
  nlo.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => lazyProcessor(inst, ctx, json, params);
  inst.unwrap = () => inst._zod.def.getter();
});
//@ chunk-7vp249v4.js:94353-94406 esm-fingerprint
function lazy(getter) {
  return new ZodLazy({
    type: "lazy",
    getter,
  });
}
//@ chunk-7vp249v4.js:94406-94510 esm-fingerprint
var ZodCustom = Fr("ZodCustom", (inst, def) => {
  hn.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => customProcessor(inst, ctx, json, params);
});
//@ chunk-7vp249v4.js:94510-94555 esm-layout
function hu(e, params) {
  return Qn(ZodCustom, e ?? (() => true), params);
}
//@ chunk-7vp249v4.js:94555-94593 esm-layout
function refine(fn, _params = {}) {
  return _refine(ZodCustom, fn, _params);
}
//@ chunk-7vp249v4.js:94593-94625 esm-layout
function superRefine(fn, params) {
  return _superRefine(fn, params);
}
//@ chunk-7vp249v4.js:94625-94686 esm-fingerprint
function preprocess(fn, schema) {
  return new ZodPreprocess({
    type: "pipe",
    in: transform(fn),
    out: schema,
  });
}
export {
  u,
  string,
  M,
  array,
  discriminatedUnion,
  literal,
  E,
  record,
  looseObject,
  _enum,
  unknown,
  union,
  zodStrictObject,
  lazy,
  hu,
  qne,
  preprocess,
  zg,
  zJt,
  never,
  intersection,
  optional,
  A8e,
  int,
  tuple,
  partialRecord,
  QD,
  ilo,
  ZodOptional,
  ZodPipe,
  B1e,
  ZodType,
  lMn,
  ZodNumber,
  ZodBoolean,
  Rs,
  ZodArray,
  ZodEnum,
  ZodLiteral,
  SIi,
  wIi,
  bIi,
  _Ii,
  ZodISODateTime,
  ZodISODate,
};
