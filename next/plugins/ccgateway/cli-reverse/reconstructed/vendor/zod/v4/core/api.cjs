/**
 * zod/v4/core/api.cjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1hnjmk23.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_checks } from "./checks.cjs";
import { require_registries } from "./registries.cjs";
import { require_schemas } from "./schemas.cjs";
import { require_util } from "./util.cjs";

//@ chunk-1hnjmk23.js:541439-556920 cjs-fingerprint
var require_api = __commonJS(function (cjsExports) {
  var __createBinding =
    (cjsExports && cjsExports.__createBinding) ||
    (Object.create
      ? function (o_2, m, k, k2) {
          if (k2 === undefined) k2 = k;
          var desc = Object.getOwnPropertyDescriptor(m, k);
          if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable))
            desc = {
              enumerable: true,
              get: function () {
                return m[k];
              },
            };
          Object.defineProperty(o_2, k2, desc);
        }
      : function (o_2, m, k, k2) {
          if (k2 === undefined) k2 = k;
          o_2[k2] = m[k];
        });
  var __setModuleDefault =
    (cjsExports && cjsExports.__setModuleDefault) ||
    (Object.create
      ? function (o, v) {
          Object.defineProperty(o, "default", {
            enumerable: true,
            value: v,
          });
        }
      : function (o, v) {
          o.default = v;
        });
  var __importStar =
    (cjsExports && cjsExports.__importStar) ||
    function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null) {
        for (var k in mod)
          if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
            __createBinding(result, mod, k);
      }
      __setModuleDefault(result, mod);
      return result;
    };
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.TimePrecision = undefined;
  cjsExports._string = _string;
  cjsExports._coercedString = _coercedString;
  cjsExports._email = _email;
  cjsExports._guid = _guid;
  cjsExports._uuid = _uuid;
  cjsExports._uuidv4 = _uuidv4;
  cjsExports._uuidv6 = _uuidv6;
  cjsExports._uuidv7 = _uuidv7;
  cjsExports._url = _url;
  cjsExports._emoji = _emoji;
  cjsExports._nanoid = _nanoid;
  cjsExports._cuid = _cuid;
  cjsExports._cuid2 = _cuid2;
  cjsExports._ulid = _ulid;
  cjsExports._xid = _xid;
  cjsExports._ksuid = _ksuid;
  cjsExports._ipv4 = _ipv4;
  cjsExports._ipv6 = _ipv6;
  cjsExports._mac = _mac;
  cjsExports._cidrv4 = _cidrv4;
  cjsExports._cidrv6 = _cidrv6;
  cjsExports._base64 = _base64;
  cjsExports._base64url = _base64url;
  cjsExports._e164 = _e164;
  cjsExports._creditCard = _creditCard;
  cjsExports._iban = _iban;
  cjsExports._jwt = _jwt;
  cjsExports._isoDateTime = _isoDateTime;
  cjsExports._isoDate = _isoDate;
  cjsExports._isoTime = _isoTime;
  cjsExports._isoDuration = _isoDuration;
  cjsExports._number = _number;
  cjsExports._coercedNumber = _coercedNumber;
  cjsExports._int = _int;
  cjsExports._float32 = _float32;
  cjsExports._float64 = _float64;
  cjsExports._int32 = _int32;
  cjsExports._uint32 = _uint32;
  cjsExports._boolean = _boolean;
  cjsExports._coercedBoolean = _coercedBoolean;
  cjsExports._bigint = _bigint;
  cjsExports._coercedBigint = _coercedBigint;
  cjsExports._int64 = _int64;
  cjsExports._uint64 = _uint64;
  cjsExports._symbol = _symbol;
  cjsExports._undefined = _undefined;
  cjsExports._null = _null;
  cjsExports._any = _any;
  cjsExports._unknown = _unknown;
  cjsExports._never = _never;
  cjsExports._void = _void;
  cjsExports._date = _date;
  cjsExports._coercedDate = _coercedDate;
  cjsExports._nan = _nan;
  cjsExports._lt = _lt;
  cjsExports._lte = _lte;
  cjsExports._max = _lte;
  cjsExports._lte = _lte;
  cjsExports._max = _lte;
  cjsExports._gt = _gt;
  cjsExports._gte = _gte;
  cjsExports._min = _gte;
  cjsExports._gte = _gte;
  cjsExports._min = _gte;
  cjsExports._positive = _positive;
  cjsExports._negative = _negative;
  cjsExports._nonpositive = _nonpositive;
  cjsExports._nonnegative = _nonnegative;
  cjsExports._multipleOf = _multipleOf;
  cjsExports._maxSize = _maxSize;
  cjsExports._minSize = _minSize;
  cjsExports._size = _size;
  cjsExports._maxLength = _maxLength;
  cjsExports._minLength = _minLength;
  cjsExports._length = _length;
  cjsExports._regex = _regex;
  cjsExports._lowercase = _lowercase;
  cjsExports._uppercase = _uppercase;
  cjsExports._includes = _includes;
  cjsExports._startsWith = _startsWith;
  cjsExports._endsWith = _endsWith;
  cjsExports._property = _property;
  cjsExports._properties = _properties;
  cjsExports._mime = _mime;
  cjsExports._overwrite = _overwrite;
  cjsExports._normalize = _normalize;
  cjsExports._trim = _trim;
  cjsExports._toLowerCase = _toLowerCase;
  cjsExports._toUpperCase = _toUpperCase;
  cjsExports._slugify = _slugify;
  cjsExports._array = _array;
  cjsExports._union = _union;
  cjsExports._xor = _xor;
  cjsExports._discriminatedUnion = _discriminatedUnion;
  cjsExports._intersection = _intersection;
  cjsExports._tuple = _tuple;
  cjsExports._record = _record;
  cjsExports._map = _map;
  cjsExports._set = _set;
  cjsExports._enum = _enum;
  cjsExports._nativeEnum = _nativeEnum;
  cjsExports._literal = _literal;
  cjsExports._file = _file;
  cjsExports._transform = _transform;
  cjsExports._optional = _optional;
  cjsExports._nullable = _nullable;
  cjsExports._default = _default;
  cjsExports._nonoptional = _nonoptional;
  cjsExports._success = _success;
  cjsExports._catch = _catch;
  cjsExports._pipe = _pipe;
  cjsExports._readonly = _readonly;
  cjsExports._templateLiteral = _templateLiteral;
  cjsExports._lazy = _lazy;
  cjsExports._promise = _promise;
  cjsExports._custom = _custom;
  cjsExports._refine = _refine;
  cjsExports._superRefine = _superRefine;
  cjsExports._check = _check;
  cjsExports.describe = describe;
  cjsExports.meta = meta;
  cjsExports._stringbool = _stringbool;
  cjsExports._stringFormat = _stringFormat;
  var checks = __importStar(require_checks());
  var registries = __importStar(require_registries());
  var schemas = __importStar(require_schemas());
  var util = __importStar(require_util());
  function _string(Class, params) {
    return new Class({
      type: "string",
      ...util.normalizeParams(params),
    });
  }
  function _coercedString(Class, params) {
    return new Class({
      type: "string",
      coerce: true,
      ...util.normalizeParams(params),
    });
  }
  function _email(Class, params) {
    return new Class({
      type: "string",
      format: "email",
      check: "string_format",
      abort: false,
      ...util.normalizeParams(params),
    });
  }
  function _guid(Class, params) {
    return new Class({
      type: "string",
      format: "guid",
      check: "string_format",
      abort: false,
      ...util.normalizeParams(params),
    });
  }
  function _uuid(Class, params) {
    return new Class({
      type: "string",
      format: "uuid",
      check: "string_format",
      abort: false,
      ...util.normalizeParams(params),
    });
  }
  function _uuidv4(Class, params) {
    return new Class({
      type: "string",
      format: "uuid",
      check: "string_format",
      abort: false,
      version: "v4",
      ...util.normalizeParams(params),
    });
  }
  function _uuidv6(Class, params) {
    return new Class({
      type: "string",
      format: "uuid",
      check: "string_format",
      abort: false,
      version: "v6",
      ...util.normalizeParams(params),
    });
  }
  function _uuidv7(Class, params) {
    return new Class({
      type: "string",
      format: "uuid",
      check: "string_format",
      abort: false,
      version: "v7",
      ...util.normalizeParams(params),
    });
  }
  function _url(Class, params) {
    return new Class({
      type: "string",
      format: "url",
      check: "string_format",
      abort: false,
      ...util.normalizeParams(params),
    });
  }
  function _emoji(Class, params) {
    return new Class({
      type: "string",
      format: "emoji",
      check: "string_format",
      abort: false,
      ...util.normalizeParams(params),
    });
  }
  function _nanoid(Class, params) {
    return new Class({
      type: "string",
      format: "nanoid",
      check: "string_format",
      abort: false,
      ...util.normalizeParams(params),
    });
  }
  function _cuid(Class, params) {
    return new Class({
      type: "string",
      format: "cuid",
      check: "string_format",
      abort: false,
      ...util.normalizeParams(params),
    });
  }
  function _cuid2(Class, params) {
    return new Class({
      type: "string",
      format: "cuid2",
      check: "string_format",
      abort: false,
      ...util.normalizeParams(params),
    });
  }
  function _ulid(Class, params) {
    return new Class({
      type: "string",
      format: "ulid",
      check: "string_format",
      abort: false,
      ...util.normalizeParams(params),
    });
  }
  function _xid(Class, params) {
    return new Class({
      type: "string",
      format: "xid",
      check: "string_format",
      abort: false,
      ...util.normalizeParams(params),
    });
  }
  function _ksuid(Class, params) {
    return new Class({
      type: "string",
      format: "ksuid",
      check: "string_format",
      abort: false,
      ...util.normalizeParams(params),
    });
  }
  function _ipv4(Class, params) {
    return new Class({
      type: "string",
      format: "ipv4",
      check: "string_format",
      abort: false,
      ...util.normalizeParams(params),
    });
  }
  function _ipv6(Class, params) {
    return new Class({
      type: "string",
      format: "ipv6",
      check: "string_format",
      abort: false,
      ...util.normalizeParams(params),
    });
  }
  function _mac(Class, params) {
    return new Class({
      type: "string",
      format: "mac",
      check: "string_format",
      abort: false,
      ...util.normalizeParams(params),
    });
  }
  function _cidrv4(Class, params) {
    return new Class({
      type: "string",
      format: "cidrv4",
      check: "string_format",
      abort: false,
      ...util.normalizeParams(params),
    });
  }
  function _cidrv6(Class, params) {
    return new Class({
      type: "string",
      format: "cidrv6",
      check: "string_format",
      abort: false,
      ...util.normalizeParams(params),
    });
  }
  function _base64(Class, params) {
    return new Class({
      type: "string",
      format: "base64",
      check: "string_format",
      abort: false,
      ...util.normalizeParams(params),
    });
  }
  function _base64url(Class, params) {
    return new Class({
      type: "string",
      format: "base64url",
      check: "string_format",
      abort: false,
      ...util.normalizeParams(params),
    });
  }
  function _e164(Class, params) {
    return new Class({
      type: "string",
      format: "e164",
      check: "string_format",
      abort: false,
      ...util.normalizeParams(params),
    });
  }
  function _creditCard(Class, params) {
    return new Class({
      type: "string",
      format: "credit_card",
      check: "string_format",
      abort: false,
      ...util.normalizeParams(params),
    });
  }
  function _iban(Class, params) {
    return new Class({
      type: "string",
      format: "iban",
      check: "string_format",
      abort: false,
      ...util.normalizeParams(params),
    });
  }
  function _jwt(Class, params) {
    return new Class({
      type: "string",
      format: "jwt",
      check: "string_format",
      abort: false,
      ...util.normalizeParams(params),
    });
  }
  cjsExports.TimePrecision = {
    Any: null,
    Minute: -1,
    Second: 0,
    Millisecond: 3,
    Microsecond: 6,
  };
  function _isoDateTime(Class, params) {
    return new Class({
      type: "string",
      format: "datetime",
      check: "string_format",
      offset: false,
      local: false,
      precision: null,
      ...util.normalizeParams(params),
    });
  }
  function _isoDate(Class, params) {
    return new Class({
      type: "string",
      format: "date",
      check: "string_format",
      ...util.normalizeParams(params),
    });
  }
  function _isoTime(Class, params) {
    return new Class({
      type: "string",
      format: "time",
      check: "string_format",
      precision: null,
      ...util.normalizeParams(params),
    });
  }
  function _isoDuration(Class, params) {
    return new Class({
      type: "string",
      format: "duration",
      check: "string_format",
      ...util.normalizeParams(params),
    });
  }
  function _number(Class, params) {
    return new Class({
      type: "number",
      checks: [],
      ...util.normalizeParams(params),
    });
  }
  function _coercedNumber(Class, params) {
    return new Class({
      type: "number",
      coerce: true,
      checks: [],
      ...util.normalizeParams(params),
    });
  }
  function _int(Class, params) {
    return new Class({
      type: "number",
      check: "number_format",
      abort: false,
      format: "safeint",
      ...util.normalizeParams(params),
    });
  }
  function _float32(Class, params) {
    return new Class({
      type: "number",
      check: "number_format",
      abort: false,
      format: "float32",
      ...util.normalizeParams(params),
    });
  }
  function _float64(Class, params) {
    return new Class({
      type: "number",
      check: "number_format",
      abort: false,
      format: "float64",
      ...util.normalizeParams(params),
    });
  }
  function _int32(Class, params) {
    return new Class({
      type: "number",
      check: "number_format",
      abort: false,
      format: "int32",
      ...util.normalizeParams(params),
    });
  }
  function _uint32(Class, params) {
    return new Class({
      type: "number",
      check: "number_format",
      abort: false,
      format: "uint32",
      ...util.normalizeParams(params),
    });
  }
  function _boolean(Class, params) {
    return new Class({
      type: "boolean",
      ...util.normalizeParams(params),
    });
  }
  function _coercedBoolean(Class, params) {
    return new Class({
      type: "boolean",
      coerce: true,
      ...util.normalizeParams(params),
    });
  }
  function _bigint(Class, params) {
    return new Class({
      type: "bigint",
      ...util.normalizeParams(params),
    });
  }
  function _coercedBigint(Class, params) {
    return new Class({
      type: "bigint",
      coerce: true,
      ...util.normalizeParams(params),
    });
  }
  function _int64(Class, params) {
    return new Class({
      type: "bigint",
      check: "bigint_format",
      abort: false,
      format: "int64",
      ...util.normalizeParams(params),
    });
  }
  function _uint64(Class, params) {
    return new Class({
      type: "bigint",
      check: "bigint_format",
      abort: false,
      format: "uint64",
      ...util.normalizeParams(params),
    });
  }
  function _symbol(Class, params) {
    return new Class({
      type: "symbol",
      ...util.normalizeParams(params),
    });
  }
  function _undefined(Class, params) {
    return new Class({
      type: "undefined",
      ...util.normalizeParams(params),
    });
  }
  function _null(Class, params) {
    return new Class({
      type: "null",
      ...util.normalizeParams(params),
    });
  }
  function _any(Class) {
    return new Class({
      type: "any",
    });
  }
  function _unknown(Class) {
    return new Class({
      type: "unknown",
    });
  }
  function _never(Class, params) {
    return new Class({
      type: "never",
      ...util.normalizeParams(params),
    });
  }
  function _void(Class, params) {
    return new Class({
      type: "void",
      ...util.normalizeParams(params),
    });
  }
  function _date(Class, params) {
    return new Class({
      type: "date",
      ...util.normalizeParams(params),
    });
  }
  function _coercedDate(Class, params) {
    return new Class({
      type: "date",
      coerce: true,
      ...util.normalizeParams(params),
    });
  }
  function _nan(Class, params) {
    return new Class({
      type: "nan",
      ...util.normalizeParams(params),
    });
  }
  function _lt(value, params) {
    return new checks.$ZodCheckLessThan({
      check: "less_than",
      ...util.normalizeParams(params),
      value,
      inclusive: false,
    });
  }
  function _lte(value, params) {
    return new checks.$ZodCheckLessThan({
      check: "less_than",
      ...util.normalizeParams(params),
      value,
      inclusive: true,
    });
  }
  function _gt(value, params) {
    return new checks.$ZodCheckGreaterThan({
      check: "greater_than",
      ...util.normalizeParams(params),
      value,
      inclusive: false,
    });
  }
  function _gte(value, params) {
    return new checks.$ZodCheckGreaterThan({
      check: "greater_than",
      ...util.normalizeParams(params),
      value,
      inclusive: true,
    });
  }
  function _positive(params) {
    return _gt(0, params);
  }
  function _negative(params) {
    return _lt(0, params);
  }
  function _nonpositive(params) {
    return _lte(0, params);
  }
  function _nonnegative(params) {
    return _gte(0, params);
  }
  function _multipleOf(value, params) {
    return new checks.$ZodCheckMultipleOf({
      check: "multiple_of",
      ...util.normalizeParams(params),
      value,
    });
  }
  function _maxSize(maximum, params) {
    return new checks.$ZodCheckMaxSize({
      check: "max_size",
      ...util.normalizeParams(params),
      maximum,
    });
  }
  function _minSize(minimum, params) {
    return new checks.$ZodCheckMinSize({
      check: "min_size",
      ...util.normalizeParams(params),
      minimum,
    });
  }
  function _size(size, params) {
    return new checks.$ZodCheckSizeEquals({
      check: "size_equals",
      ...util.normalizeParams(params),
      size,
    });
  }
  function _maxLength(maximum, params) {
    return new checks.$ZodCheckMaxLength({
      check: "max_length",
      ...util.normalizeParams(params),
      maximum,
    });
  }
  function _minLength(minimum, params) {
    return new checks.$ZodCheckMinLength({
      check: "min_length",
      ...util.normalizeParams(params),
      minimum,
    });
  }
  function _length(length, params) {
    return new checks.$ZodCheckLengthEquals({
      check: "length_equals",
      ...util.normalizeParams(params),
      length,
    });
  }
  function _regex(pattern, params) {
    return new checks.$ZodCheckRegex({
      check: "string_format",
      format: "regex",
      ...util.normalizeParams(params),
      pattern,
    });
  }
  function _lowercase(params) {
    return new checks.$ZodCheckLowerCase({
      check: "string_format",
      format: "lowercase",
      ...util.normalizeParams(params),
    });
  }
  function _uppercase(params) {
    return new checks.$ZodCheckUpperCase({
      check: "string_format",
      format: "uppercase",
      ...util.normalizeParams(params),
    });
  }
  function _includes(includes, params) {
    return new checks.$ZodCheckIncludes({
      check: "string_format",
      format: "includes",
      ...util.normalizeParams(params),
      includes,
    });
  }
  function _startsWith(prefix, params) {
    return new checks.$ZodCheckStartsWith({
      check: "string_format",
      format: "starts_with",
      ...util.normalizeParams(params),
      prefix,
    });
  }
  function _endsWith(suffix, params) {
    return new checks.$ZodCheckEndsWith({
      check: "string_format",
      format: "ends_with",
      ...util.normalizeParams(params),
      suffix,
    });
  }
  function _property(property, schema, params) {
    return new checks.$ZodCheckProperty({
      check: "property",
      property,
      schema,
      ...util.normalizeParams(params),
    });
  }
  function _properties(Class, shape, params) {
    return new Class({
      type: "properties",
      check: "properties",
      shape,
      ...util.normalizeParams(params),
    });
  }
  function _mime(types, params) {
    return new checks.$ZodCheckMimeType({
      check: "mime_type",
      mime: types,
      ...util.normalizeParams(params),
    });
  }
  function _overwrite(tx) {
    return new checks.$ZodCheckOverwrite({
      check: "overwrite",
      tx,
    });
  }
  function _normalize(form) {
    return _overwrite((input) => input.normalize(form));
  }
  function _trim() {
    return _overwrite((input) => input.trim());
  }
  function _toLowerCase() {
    return _overwrite((input) => input.toLowerCase());
  }
  function _toUpperCase() {
    return _overwrite((input) => input.toUpperCase());
  }
  function _slugify() {
    return _overwrite((input) => util.slugify(input));
  }
  function _array(Class, element, params) {
    return new Class({
      type: "array",
      element,
      ...util.normalizeParams(params),
    });
  }
  function _union(Class, options, params) {
    return new Class({
      type: "union",
      options,
      ...util.normalizeParams(params),
    });
  }
  function _xor(Class, options, params) {
    return new Class({
      type: "union",
      options,
      inclusive: false,
      ...util.normalizeParams(params),
    });
  }
  function _discriminatedUnion(Class, discriminator, options, params) {
    return new Class({
      type: "union",
      options,
      discriminator,
      ...util.normalizeParams(params),
    });
  }
  function _intersection(Class, left, right) {
    return new Class({
      type: "intersection",
      left,
      right,
    });
  }
  function _tuple(Class, items, _paramsOrRest, _params) {
    let hasRest = _paramsOrRest instanceof schemas.$ZodType;
    let params = hasRest ? _params : _paramsOrRest;
    return new Class({
      type: "tuple",
      items,
      rest: hasRest ? _paramsOrRest : null,
      ...util.normalizeParams(params),
    });
  }
  function _record(Class, keyType, valueType, params) {
    return new Class({
      type: "record",
      keyType,
      valueType,
      ...util.normalizeParams(params),
    });
  }
  function _map(Class, keyType, valueType, params) {
    return new Class({
      type: "map",
      keyType,
      valueType,
      ...util.normalizeParams(params),
    });
  }
  function _set(Class, valueType, params) {
    return new Class({
      type: "set",
      valueType,
      ...util.normalizeParams(params),
    });
  }
  function _enum(Class, values, params) {
    let entries = Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values;
    return new Class({
      type: "enum",
      entries,
      ...util.normalizeParams(params),
    });
  }
  function _nativeEnum(Class, entries, params) {
    return new Class({
      type: "enum",
      entries,
      ...util.normalizeParams(params),
    });
  }
  function _literal(Class, value, params) {
    return new Class({
      type: "literal",
      values: Array.isArray(value) ? value : [value],
      ...util.normalizeParams(params),
    });
  }
  function _file(Class, params) {
    return new Class({
      type: "file",
      ...util.normalizeParams(params),
    });
  }
  function _transform(Class, fn) {
    return new Class({
      type: "transform",
      transform: fn,
    });
  }
  function _optional(Class, innerType) {
    return new Class({
      type: "optional",
      innerType,
    });
  }
  function _nullable(Class, innerType) {
    return new Class({
      type: "nullable",
      innerType,
    });
  }
  function _default(Class, innerType, defaultValue) {
    return new Class({
      type: "default",
      innerType,
      get defaultValue() {
        return typeof defaultValue === "function" ? defaultValue() : util.shallowClone(defaultValue);
      },
    });
  }
  function _nonoptional(Class, innerType, params) {
    return new Class({
      type: "nonoptional",
      innerType,
      ...util.normalizeParams(params),
    });
  }
  function _success(Class, innerType) {
    return new Class({
      type: "success",
      innerType,
    });
  }
  function _catch(Class, innerType, catchValue) {
    return new Class({
      type: "catch",
      innerType,
      catchValue: typeof catchValue === "function" ? catchValue : util.constantCatch(catchValue),
    });
  }
  function _pipe(Class, in_, out) {
    return new Class({
      type: "pipe",
      in: in_,
      out,
    });
  }
  function _readonly(Class, innerType) {
    return new Class({
      type: "readonly",
      innerType,
    });
  }
  function _templateLiteral(Class, parts, params) {
    return new Class({
      type: "template_literal",
      parts,
      ...util.normalizeParams(params),
    });
  }
  function _lazy(Class, getter) {
    return new Class({
      type: "lazy",
      getter,
    });
  }
  function _promise(Class, innerType) {
    return new Class({
      type: "promise",
      innerType,
    });
  }
  function _custom(Class, fn, _params) {
    let norm = util.normalizeParams(_params);
    norm.abort ?? (norm.abort = true);
    return new Class({
      type: "custom",
      check: "custom",
      fn,
      ...norm,
    });
  }
  function _refine(Class, fn, params) {
    return new Class({
      type: "custom",
      check: "custom",
      fn,
      ...util.normalizeParams(params),
    });
  }
  function _superRefine(fn, params) {
    let ch = _check((payload) => {
      payload.addIssue = (issue) => {
        if (typeof issue === "string") payload.issues.push(util.issue(issue, payload.value, ch._zod.def));
        else {
          let _issue = issue;
          if (_issue.fatal) _issue.continue = false;
          _issue.code ?? (_issue.code = "custom");
          if (!("input" in _issue)) _issue.input = payload.value;
          _issue.inst ?? (_issue.inst = ch);
          _issue.continue ?? (_issue.continue = !ch._zod.def.abort);
          payload.issues.push(util.issue(_issue));
        }
      };
      return fn(payload.value, payload);
    }, params);
    return ch;
  }
  function _check(fn, params) {
    let ch = new checks.$ZodCheck({
      check: "custom",
      ...util.normalizeParams(params),
    });
    ch._zod.check = fn;
    return ch;
  }
  function describe(description) {
    let ch = new checks.$ZodCheck({
      check: "describe",
    });
    ch._zod.onattach = [
      (inst) => {
        let existing = registries.globalRegistry.get(inst) ?? {};
        registries.globalRegistry.add(inst, {
          ...existing,
          description,
        });
      },
    ];
    ch._zod.check = () => {};
    return ch;
  }
  function meta(metadata) {
    let ch = new checks.$ZodCheck({
      check: "meta",
    });
    ch._zod.onattach = [
      (inst) => {
        let existing = registries.globalRegistry.get(inst) ?? {};
        registries.globalRegistry.add(inst, {
          ...existing,
          ...metadata,
        });
      },
    ];
    ch._zod.check = () => {};
    return ch;
  }
  function _stringbool(Classes, _params) {
    let params = util.normalizeParams(_params);
    let truthyArray = params.truthy ?? ["true", "1", "yes", "on", "y", "enabled"];
    let falsyArray = params.falsy ?? ["false", "0", "no", "off", "n", "disabled"];
    if (params.case !== "sensitive") {
      truthyArray = truthyArray.map((v) => (typeof v === "string" ? v.toLowerCase() : v));
      falsyArray = falsyArray.map((v) => (typeof v === "string" ? v.toLowerCase() : v));
    }
    let truthySet = new Set(truthyArray);
    let falsySet = new Set(falsyArray);
    let _Codec = Classes.Codec ?? schemas.$ZodCodec;
    let _Boolean = Classes.Boolean ?? schemas.$ZodBoolean;
    let stringSchema = new (Classes.String ?? schemas.$ZodString)({
      type: "string",
      error: params.error,
    });
    let booleanSchema = new _Boolean({
      type: "boolean",
      error: params.error,
    });
    let codec = new _Codec({
      type: "pipe",
      in: stringSchema,
      out: booleanSchema,
      transform: (input, payload) => {
        let data = input;
        if (params.case !== "sensitive") data = data.toLowerCase();
        if (truthySet.has(data)) return true;
        else if (falsySet.has(data)) return false;
        else {
          payload.issues.push({
            code: "invalid_value",
            expected: "stringbool",
            values: [...truthySet, ...falsySet],
            input: payload.value,
            inst: codec,
            continue: false,
          });
          return {};
        }
      },
      reverseTransform: (input, _payload) => {
        if (input === true) return truthyArray[0] || "true";
        else return falsyArray[0] || "false";
      },
      error: params.error,
    });
    codec._zod.bag.truthy = truthyArray;
    codec._zod.bag.falsy = falsyArray;
    codec._zod.bag.case = params.case ?? "insensitive";
    return codec;
  }
  function _stringFormat(Class, format, fnOrRegex, _params = {}) {
    let params = util.normalizeParams(_params);
    let def = {
      check: "string_format",
      type: "string",
      format,
      fn: typeof fnOrRegex === "function" ? fnOrRegex : (val) => fnOrRegex.test(val),
      ...params,
    };
    if (fnOrRegex instanceof RegExp) def.pattern = fnOrRegex;
    return new Class(def);
  }
  (function () {
    var keys = Object.getOwnPropertyNames(cjsExports);
    for (var i = 0; i < keys.length; i++) {
      var desc = Object.getOwnPropertyDescriptor(cjsExports, keys[i]);
      if (!desc || !desc.get || !desc.configurable) continue;
      var value;
      try {
        value = desc.get();
      } catch (e) {
        continue;
      }
      if (value === undefined) continue;
      Object.defineProperty(cjsExports, keys[i], {
        value,
        writable: false,
        enumerable: desc.enumerable,
        configurable: false,
      });
    }
    Object.freeze(cjsExports);
  })();
});
export { require_api };
