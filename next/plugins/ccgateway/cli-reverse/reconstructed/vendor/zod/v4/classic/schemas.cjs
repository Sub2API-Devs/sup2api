/**
 * zod/v4/classic/schemas.cjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1hnjmk23.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_core_2 } from "../core/index.cjs";
import { require_json_schema_processors } from "../core/json-schema-processors.cjs";
import { require_to_json_schema } from "../core/to-json-schema.cjs";
import { require_en } from "../locales/en.cjs";
import { require_checks_2 } from "./checks.cjs";
import { require_parse_2 } from "./parse.cjs";

//@ chunk-1hnjmk23.js:595605-627262 cjs-fingerprint
var require_schemas_2 = __commonJS(function (cjsExports) {
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
  var __importDefault =
    (cjsExports && cjsExports.__importDefault) ||
    function (mod) {
      return mod && mod.__esModule
        ? mod
        : {
            default: mod,
          };
    };
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.ZodIntersection =
    cjsExports.ZodDiscriminatedUnion =
    cjsExports.ZodXor =
    cjsExports.ZodUnion =
    cjsExports.ZodObject =
    cjsExports.ZodArray =
    cjsExports.ZodDate =
    cjsExports.ZodVoid =
    cjsExports.ZodNever =
    cjsExports.ZodUnknown =
    cjsExports.ZodAny =
    cjsExports.ZodNull =
    cjsExports.ZodUndefined =
    cjsExports.ZodSymbol =
    cjsExports.ZodBigIntFormat =
    cjsExports.ZodBigInt =
    cjsExports.ZodBoolean =
    cjsExports.ZodNumberFormat =
    cjsExports.ZodNumber =
    cjsExports.ZodCustomStringFormat =
    cjsExports.ZodJWT =
    cjsExports.ZodIBAN =
    cjsExports.ZodCreditCard =
    cjsExports.ZodE164 =
    cjsExports.ZodBase64URL =
    cjsExports.ZodBase64 =
    cjsExports.ZodCIDRv6 =
    cjsExports.ZodCIDRv4 =
    cjsExports.ZodIPv6 =
    cjsExports.ZodMAC =
    cjsExports.ZodIPv4 =
    cjsExports.ZodKSUID =
    cjsExports.ZodXID =
    cjsExports.ZodULID =
    cjsExports.ZodCUID2 =
    cjsExports.ZodCUID =
    cjsExports.ZodNanoID =
    cjsExports.ZodEmoji =
    cjsExports.ZodURL =
    cjsExports.ZodUUID =
    cjsExports.ZodGUID =
    cjsExports.ZodEmail =
    cjsExports.ZodISODuration =
    cjsExports.ZodISOTime =
    cjsExports.ZodISODate =
    cjsExports.ZodISODateTime =
    cjsExports.ZodStringFormat =
    cjsExports.ZodString =
    cjsExports._ZodString =
    cjsExports.ZodType =
      undefined;
  cjsExports.stringbool =
    cjsExports.ZodInstanceOf =
    cjsExports.meta =
    cjsExports.describe =
    cjsExports.ZodProperties =
    cjsExports.ZodCustom =
    cjsExports.ZodFunction =
    cjsExports.ZodPromise =
    cjsExports.ZodLazy =
    cjsExports.ZodTemplateLiteral =
    cjsExports.ZodReadonly =
    cjsExports.ZodPreprocess =
    cjsExports.ZodCodec =
    cjsExports.ZodPipe =
    cjsExports.ZodNaN =
    cjsExports.ZodCatch =
    cjsExports.ZodSuccess =
    cjsExports.ZodNonOptional =
    cjsExports.ZodPrefault =
    cjsExports.ZodDefault =
    cjsExports.ZodNullable =
    cjsExports.ZodExactOptional =
    cjsExports.ZodOptional =
    cjsExports.ZodTransform =
    cjsExports.ZodFile =
    cjsExports.ZodLiteral =
    cjsExports.ZodEnum =
    cjsExports.ZodSet =
    cjsExports.ZodMap =
    cjsExports.ZodRecord =
    cjsExports.ZodTuple =
      undefined;
  cjsExports.string = string;
  cjsExports.email = email;
  cjsExports.guid = guid;
  cjsExports.uuid = uuid;
  cjsExports.uuidv4 = uuidv4;
  cjsExports.uuidv6 = uuidv6;
  cjsExports.uuidv7 = uuidv7;
  cjsExports.url = url;
  cjsExports.httpUrl = httpUrl;
  cjsExports.emoji = emoji;
  cjsExports.nanoid = nanoid;
  cjsExports.cuid = cuid;
  cjsExports.cuid2 = cuid2;
  cjsExports.ulid = ulid;
  cjsExports.xid = xid;
  cjsExports.ksuid = ksuid;
  cjsExports.ipv4 = ipv4;
  cjsExports.mac = mac;
  cjsExports.ipv6 = ipv6;
  cjsExports.cidrv4 = cidrv4;
  cjsExports.cidrv6 = cidrv6;
  cjsExports.base64 = base64;
  cjsExports.base64url = base64url;
  cjsExports.e164 = e164;
  cjsExports.creditCard = creditCard;
  cjsExports.iban = iban;
  cjsExports.jwt = jwt;
  cjsExports.stringFormat = stringFormat;
  cjsExports.hostname = hostname;
  cjsExports.hex = hex;
  cjsExports.hash = hash;
  cjsExports.number = number;
  cjsExports.int = int;
  cjsExports.float32 = float32;
  cjsExports.float64 = float64;
  cjsExports.int32 = int32;
  cjsExports.uint32 = uint32;
  cjsExports.boolean = boolean;
  cjsExports.bigint = bigint;
  cjsExports.int64 = int64;
  cjsExports.uint64 = uint64;
  cjsExports.symbol = symbol;
  cjsExports.undefined = _undefined;
  cjsExports.null = _null;
  cjsExports.any = any;
  cjsExports.unknown = unknown;
  cjsExports.never = never;
  cjsExports.void = _void;
  cjsExports.date = date;
  cjsExports.array = array;
  cjsExports.keyof = keyof;
  cjsExports.object = object;
  cjsExports.strictObject = strictObject;
  cjsExports.looseObject = looseObject;
  cjsExports.union = union;
  cjsExports.xor = xor;
  cjsExports.discriminatedUnion = discriminatedUnion;
  cjsExports.intersection = intersection;
  cjsExports.tuple = tuple;
  cjsExports.record = record;
  cjsExports.partialRecord = partialRecord;
  cjsExports.looseRecord = looseRecord;
  cjsExports.map = map;
  cjsExports.set = set;
  cjsExports.enum = _enum;
  cjsExports.nativeEnum = nativeEnum;
  cjsExports.literal = literal;
  cjsExports.file = file;
  cjsExports.transform = transform;
  cjsExports.optional = optional;
  cjsExports.exactOptional = exactOptional;
  cjsExports.nullable = nullable;
  cjsExports.nullish = nullish;
  cjsExports._default = _default;
  cjsExports.prefault = prefault;
  cjsExports.nonoptional = nonoptional;
  cjsExports.success = success;
  cjsExports.catch = _catch;
  cjsExports.nan = nan;
  cjsExports.pipe = pipe;
  cjsExports.codec = codec;
  cjsExports.invertCodec = invertCodec;
  cjsExports.readonly = readonly;
  cjsExports.templateLiteral = templateLiteral;
  cjsExports.lazy = lazy;
  cjsExports.promise = promise;
  cjsExports._function = _function;
  cjsExports.function = _function;
  cjsExports._function = _function;
  cjsExports.function = _function;
  cjsExports.properties = properties;
  cjsExports.check = check;
  cjsExports.custom = custom;
  cjsExports.refine = refine;
  cjsExports.superRefine = superRefine;
  cjsExports.instanceof = _instanceof;
  cjsExports.json = json;
  cjsExports.preprocess = preprocess;
  var core = __importStar(require_core_2());
  var index_js_1 = require_core_2();
  var processors = __importStar(require_json_schema_processors());
  var to_json_schema_js_1 = require_to_json_schema();
  var en_js_1 = __importDefault(require_en());
  var checks = __importStar(require_checks_2());
  var parse = __importStar(require_parse_2());
  function _ensureDefaultLocale() {
    if (!core.globalConfig.localeError) core.config((0, en_js_1.default)());
  }
  function _ensureDefaultMemoizer() {
    if (!core.globalConfig.memoizer)
      core.config({
        memoizer: core.memoizer(),
      });
  }
  cjsExports.ZodType = core.$constructor(
    "ZodType",
    (inst, def) => {
      _ensureDefaultLocale();
      core.$ZodType.init(inst, def);
      inst.def = def;
      inst.type = def.type;
      return inst;
    },
    {
      check(...chks) {
        let def = this.def;
        return this.clone(
          index_js_1.util.mergeDefs(def, {
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
        return core.clone(this, def, params);
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
        return this.check(checks.overwrite(fn));
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
        return _default(this, d);
      },
      prefault(d) {
        return prefault(this, d);
      },
      catch(params) {
        return _catch(this, params);
      },
      pipe(target) {
        return pipe(this, target);
      },
      readonly() {
        return readonly(this);
      },
      describe(description) {
        let cl = this.clone();
        core.globalRegistry.add(cl, {
          description,
        });
        return cl;
      },
      meta(...args) {
        if (args.length === 0) return core.globalRegistry.get(this);
        let cl = this.clone();
        core.globalRegistry.add(cl, args[0]);
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
        return index_js_1.util.hide(this, "~standard", {
          ...core.standardProps(this),
          jsonSchema: {
            input: to_json_schema_js_1.createStandardJSONSchemaMethod(this, "input"),
            output: to_json_schema_js_1.createStandardJSONSchemaMethod(this, "output"),
          },
        });
      },
      set "~standard"(value) {
        index_js_1.util.own(this, "~standard", value);
      },
      parse: function _parse(data, params) {
        return parse.parse(this, data, params, {
          callee: _parse,
        });
      },
      parseAsync: async function _parseAsync(data, params) {
        return await parse.parseAsync(this, data, params, {
          callee: _parseAsync,
        });
      },
      safeParse(data, params) {
        return parse.safeParse(this, data, params);
      },
      async safeParseAsync(data, params) {
        return parse.safeParseAsync(this, data, params);
      },
      get spa() {
        return this?.safeParseAsync;
      },
      set spa(value) {
        index_js_1.util.own(this, "spa", value);
      },
      validate(data, params) {
        return parse.validate(this, data, params);
      },
      validateAsync(data, params) {
        return parse.validateAsync(this, data, params);
      },
      encode: function _encode(data, params) {
        return parse.encode(this, data, params, {
          callee: _encode,
        });
      },
      decode: function _decode(data, params) {
        return parse.decode(this, data, params, {
          callee: _decode,
        });
      },
      encodeAsync: async function _encodeAsync(data, params) {
        return await parse.encodeAsync(this, data, params, {
          callee: _encodeAsync,
        });
      },
      decodeAsync: async function _decodeAsync(data, params) {
        return await parse.decodeAsync(this, data, params, {
          callee: _decodeAsync,
        });
      },
      safeEncode(data, params) {
        return parse.safeEncode(this, data, params);
      },
      safeDecode(data, params) {
        return parse.safeDecode(this, data, params);
      },
      async safeEncodeAsync(data, params) {
        return parse.safeEncodeAsync(this, data, params);
      },
      async safeDecodeAsync(data, params) {
        return parse.safeDecodeAsync(this, data, params);
      },
      toJSONSchema(params) {
        return to_json_schema_js_1.createToJSONSchemaMethod(this, {})(params);
      },
      get description() {
        return core.globalRegistry.get(this)?.description;
      },
      get _def() {
        return this._zod.def;
      },
    },
  );
  cjsExports._ZodString = core.$constructor(
    "_ZodString",
    (inst, def) => {
      core.$ZodString.init(inst, def);
      cjsExports.ZodType.init(inst, def);
      inst._zod.processJSONSchema = (ctx, json, params) =>
        processors.stringProcessor(inst, ctx, json, params);
    },
    index_js_1.util.derived(
      {
        format: (inst) => processors.aggregateChecks(inst).format ?? null,
        minLength: (inst) => processors.aggregateChecks(inst).minimum ?? null,
        maxLength: (inst) => processors.aggregateChecks(inst).maximum ?? null,
      },
      {
        regex(...args) {
          return this.check(checks.regex(...args));
        },
        includes(...args) {
          return this.check(checks.includes(...args));
        },
        startsWith(...args) {
          return this.check(checks.startsWith(...args));
        },
        endsWith(...args) {
          return this.check(checks.endsWith(...args));
        },
        min(...args) {
          return this.check(checks.minLength(...args));
        },
        max(...args) {
          return this.check(checks.maxLength(...args));
        },
        length(...args) {
          return this.check(checks.length(...args));
        },
        nonempty(...args) {
          return this.check(checks.minLength(1, ...args));
        },
        lowercase(params) {
          return this.check(checks.lowercase(params));
        },
        uppercase(params) {
          return this.check(checks.uppercase(params));
        },
        trim() {
          return this.check(checks.trim());
        },
        normalize(...args) {
          return this.check(checks.normalize(...args));
        },
        toLowerCase() {
          return this.check(checks.toLowerCase());
        },
        toUpperCase() {
          return this.check(checks.toUpperCase());
        },
        slugify() {
          return this.check(checks.slugify());
        },
      },
    ),
  );
  cjsExports.ZodString = core.$constructor(
    "ZodString",
    (inst, def) => {
      core.$ZodString.init(inst, def);
      cjsExports._ZodString.init(inst, def);
    },
    {
      email(params) {
        return this.check(core._email(cjsExports.ZodEmail, params));
      },
      url(params) {
        return this.check(core._url(cjsExports.ZodURL, params));
      },
      jwt(params) {
        return this.check(core._jwt(cjsExports.ZodJWT, params));
      },
      emoji(params) {
        return this.check(core._emoji(cjsExports.ZodEmoji, params));
      },
      guid(params) {
        return this.check(core._guid(cjsExports.ZodGUID, params));
      },
      uuid(params) {
        return this.check(core._uuid(cjsExports.ZodUUID, params));
      },
      uuidv4(params) {
        return this.check(core._uuidv4(cjsExports.ZodUUID, params));
      },
      uuidv6(params) {
        return this.check(core._uuidv6(cjsExports.ZodUUID, params));
      },
      uuidv7(params) {
        return this.check(core._uuidv7(cjsExports.ZodUUID, params));
      },
      nanoid(params) {
        return this.check(core._nanoid(cjsExports.ZodNanoID, params));
      },
      cuid(params) {
        return this.check(core._cuid(cjsExports.ZodCUID, params));
      },
      cuid2(params) {
        return this.check(core._cuid2(cjsExports.ZodCUID2, params));
      },
      ulid(params) {
        return this.check(core._ulid(cjsExports.ZodULID, params));
      },
      base64(params) {
        return this.check(core._base64(cjsExports.ZodBase64, params));
      },
      base64url(params) {
        return this.check(core._base64url(cjsExports.ZodBase64URL, params));
      },
      xid(params) {
        return this.check(core._xid(cjsExports.ZodXID, params));
      },
      ksuid(params) {
        return this.check(core._ksuid(cjsExports.ZodKSUID, params));
      },
      ipv4(params) {
        return this.check(core._ipv4(cjsExports.ZodIPv4, params));
      },
      ipv6(params) {
        return this.check(core._ipv6(cjsExports.ZodIPv6, params));
      },
      cidrv4(params) {
        return this.check(core._cidrv4(cjsExports.ZodCIDRv4, params));
      },
      cidrv6(params) {
        return this.check(core._cidrv6(cjsExports.ZodCIDRv6, params));
      },
      e164(params) {
        return this.check(core._e164(cjsExports.ZodE164, params));
      },
      datetime(params) {
        return this.check(core._isoDateTime(cjsExports.ZodISODateTime, params));
      },
      date(params) {
        return this.check(core._isoDate(cjsExports.ZodISODate, params));
      },
      time(params) {
        return this.check(core._isoTime(cjsExports.ZodISOTime, params));
      },
      duration(params) {
        return this.check(core._isoDuration(cjsExports.ZodISODuration, params));
      },
    },
  );
  function string(params) {
    return core._string(cjsExports.ZodString, params);
  }
  cjsExports.ZodStringFormat = core.$constructor("ZodStringFormat", (inst, def) => {
    core.$ZodStringFormat.init(inst, def);
    cjsExports._ZodString.init(inst, def);
  });
  cjsExports.ZodISODateTime = core.$constructor("ZodISODateTime", (inst, def) => {
    core.$ZodISODateTime.init(inst, def);
    cjsExports.ZodStringFormat.init(inst, def);
  });
  cjsExports.ZodISODate = core.$constructor("ZodISODate", (inst, def) => {
    core.$ZodISODate.init(inst, def);
    cjsExports.ZodStringFormat.init(inst, def);
  });
  cjsExports.ZodISOTime = core.$constructor("ZodISOTime", (inst, def) => {
    core.$ZodISOTime.init(inst, def);
    cjsExports.ZodStringFormat.init(inst, def);
  });
  cjsExports.ZodISODuration = core.$constructor("ZodISODuration", (inst, def) => {
    core.$ZodISODuration.init(inst, def);
    cjsExports.ZodStringFormat.init(inst, def);
  });
  cjsExports.ZodEmail = core.$constructor("ZodEmail", (inst, def) => {
    core.$ZodEmail.init(inst, def);
    cjsExports.ZodStringFormat.init(inst, def);
  });
  function email(params) {
    return core._email(cjsExports.ZodEmail, params);
  }
  cjsExports.ZodGUID = core.$constructor("ZodGUID", (inst, def) => {
    core.$ZodGUID.init(inst, def);
    cjsExports.ZodStringFormat.init(inst, def);
  });
  function guid(params) {
    return core._guid(cjsExports.ZodGUID, params);
  }
  cjsExports.ZodUUID = core.$constructor("ZodUUID", (inst, def) => {
    core.$ZodUUID.init(inst, def);
    cjsExports.ZodStringFormat.init(inst, def);
  });
  function uuid(params) {
    return core._uuid(cjsExports.ZodUUID, params);
  }
  function uuidv4(params) {
    return core._uuidv4(cjsExports.ZodUUID, params);
  }
  function uuidv6(params) {
    return core._uuidv6(cjsExports.ZodUUID, params);
  }
  function uuidv7(params) {
    return core._uuidv7(cjsExports.ZodUUID, params);
  }
  cjsExports.ZodURL = core.$constructor("ZodURL", (inst, def) => {
    core.$ZodURL.init(inst, def);
    cjsExports.ZodStringFormat.init(inst, def);
  });
  function url(params) {
    return core._url(cjsExports.ZodURL, params);
  }
  function httpUrl(params) {
    return core._url(cjsExports.ZodURL, {
      protocol: core.regexes.httpProtocol,
      hostname: core.regexes.domain,
      ...index_js_1.util.normalizeParams(params),
    });
  }
  cjsExports.ZodEmoji = core.$constructor("ZodEmoji", (inst, def) => {
    core.$ZodEmoji.init(inst, def);
    cjsExports.ZodStringFormat.init(inst, def);
  });
  function emoji(params) {
    return core._emoji(cjsExports.ZodEmoji, params);
  }
  cjsExports.ZodNanoID = core.$constructor("ZodNanoID", (inst, def) => {
    core.$ZodNanoID.init(inst, def);
    cjsExports.ZodStringFormat.init(inst, def);
  });
  function nanoid(params) {
    return core._nanoid(cjsExports.ZodNanoID, params);
  }
  cjsExports.ZodCUID = core.$constructor("ZodCUID", (inst, def) => {
    core.$ZodCUID.init(inst, def);
    cjsExports.ZodStringFormat.init(inst, def);
  });
  function cuid(params) {
    return core._cuid(cjsExports.ZodCUID, params);
  }
  cjsExports.ZodCUID2 = core.$constructor("ZodCUID2", (inst, def) => {
    core.$ZodCUID2.init(inst, def);
    cjsExports.ZodStringFormat.init(inst, def);
  });
  function cuid2(params) {
    return core._cuid2(cjsExports.ZodCUID2, params);
  }
  cjsExports.ZodULID = core.$constructor("ZodULID", (inst, def) => {
    core.$ZodULID.init(inst, def);
    cjsExports.ZodStringFormat.init(inst, def);
  });
  function ulid(params) {
    return core._ulid(cjsExports.ZodULID, params);
  }
  cjsExports.ZodXID = core.$constructor("ZodXID", (inst, def) => {
    core.$ZodXID.init(inst, def);
    cjsExports.ZodStringFormat.init(inst, def);
  });
  function xid(params) {
    return core._xid(cjsExports.ZodXID, params);
  }
  cjsExports.ZodKSUID = core.$constructor("ZodKSUID", (inst, def) => {
    core.$ZodKSUID.init(inst, def);
    cjsExports.ZodStringFormat.init(inst, def);
  });
  function ksuid(params) {
    return core._ksuid(cjsExports.ZodKSUID, params);
  }
  cjsExports.ZodIPv4 = core.$constructor("ZodIPv4", (inst, def) => {
    core.$ZodIPv4.init(inst, def);
    cjsExports.ZodStringFormat.init(inst, def);
  });
  function ipv4(params) {
    return core._ipv4(cjsExports.ZodIPv4, params);
  }
  cjsExports.ZodMAC = core.$constructor("ZodMAC", (inst, def) => {
    core.$ZodMAC.init(inst, def);
    cjsExports.ZodStringFormat.init(inst, def);
  });
  function mac(params) {
    return core._mac(cjsExports.ZodMAC, params);
  }
  cjsExports.ZodIPv6 = core.$constructor("ZodIPv6", (inst, def) => {
    core.$ZodIPv6.init(inst, def);
    cjsExports.ZodStringFormat.init(inst, def);
  });
  function ipv6(params) {
    return core._ipv6(cjsExports.ZodIPv6, params);
  }
  cjsExports.ZodCIDRv4 = core.$constructor("ZodCIDRv4", (inst, def) => {
    core.$ZodCIDRv4.init(inst, def);
    cjsExports.ZodStringFormat.init(inst, def);
  });
  function cidrv4(params) {
    return core._cidrv4(cjsExports.ZodCIDRv4, params);
  }
  cjsExports.ZodCIDRv6 = core.$constructor("ZodCIDRv6", (inst, def) => {
    core.$ZodCIDRv6.init(inst, def);
    cjsExports.ZodStringFormat.init(inst, def);
  });
  function cidrv6(params) {
    return core._cidrv6(cjsExports.ZodCIDRv6, params);
  }
  cjsExports.ZodBase64 = core.$constructor("ZodBase64", (inst, def) => {
    core.$ZodBase64.init(inst, def);
    cjsExports.ZodStringFormat.init(inst, def);
  });
  function base64(params) {
    return core._base64(cjsExports.ZodBase64, params);
  }
  cjsExports.ZodBase64URL = core.$constructor("ZodBase64URL", (inst, def) => {
    core.$ZodBase64URL.init(inst, def);
    cjsExports.ZodStringFormat.init(inst, def);
  });
  function base64url(params) {
    return core._base64url(cjsExports.ZodBase64URL, params);
  }
  cjsExports.ZodE164 = core.$constructor("ZodE164", (inst, def) => {
    core.$ZodE164.init(inst, def);
    cjsExports.ZodStringFormat.init(inst, def);
  });
  function e164(params) {
    return core._e164(cjsExports.ZodE164, params);
  }
  cjsExports.ZodCreditCard = core.$constructor("ZodCreditCard", (inst, def) => {
    core.$ZodCreditCard.init(inst, def);
    cjsExports.ZodStringFormat.init(inst, def);
  });
  function creditCard(params) {
    return core._creditCard(cjsExports.ZodCreditCard, params);
  }
  cjsExports.ZodIBAN = core.$constructor("ZodIBAN", (inst, def) => {
    core.$ZodIBAN.init(inst, def);
    cjsExports.ZodStringFormat.init(inst, def);
  });
  function iban(params) {
    return core._iban(cjsExports.ZodIBAN, params);
  }
  cjsExports.ZodJWT = core.$constructor("ZodJWT", (inst, def) => {
    core.$ZodJWT.init(inst, def);
    cjsExports.ZodStringFormat.init(inst, def);
  });
  function jwt(params) {
    return core._jwt(cjsExports.ZodJWT, params);
  }
  cjsExports.ZodCustomStringFormat = core.$constructor("ZodCustomStringFormat", (inst, def) => {
    core.$ZodCustomStringFormat.init(inst, def);
    cjsExports.ZodStringFormat.init(inst, def);
  });
  function stringFormat(format, fnOrRegex, _params = {}) {
    return core._stringFormat(cjsExports.ZodCustomStringFormat, format, fnOrRegex, _params);
  }
  function hostname(_params) {
    return core._stringFormat(cjsExports.ZodCustomStringFormat, "hostname", core.regexes.hostname, _params);
  }
  function hex(_params) {
    return core._stringFormat(cjsExports.ZodCustomStringFormat, "hex", core.regexes.hex, _params);
  }
  function hash(alg, params) {
    let enc = params?.enc ?? "hex";
    let format = `${alg}_${enc}`;
    let regex = core.regexes[format];
    if (!regex) throw Error(`Unrecognized hash format: ${format}`);
    return core._stringFormat(cjsExports.ZodCustomStringFormat, format, regex, params);
  }
  cjsExports.ZodNumber = core.$constructor(
    "ZodNumber",
    (inst, def) => {
      core.$ZodNumber.init(inst, def);
      cjsExports.ZodType.init(inst, def);
      inst._zod.processJSONSchema = (ctx, json, params) =>
        processors.numberProcessor(inst, ctx, json, params);
      inst.isFinite = true;
    },
    index_js_1.util.derived(
      {
        minValue: (inst) => {
          let { minimum, exclusiveMinimum } = processors.aggregateChecks(inst);
          return Math.max(minimum ?? Number.NEGATIVE_INFINITY, exclusiveMinimum ?? Number.NEGATIVE_INFINITY);
        },
        maxValue: (inst) => {
          let { maximum, exclusiveMaximum } = processors.aggregateChecks(inst);
          return Math.min(maximum ?? Number.POSITIVE_INFINITY, exclusiveMaximum ?? Number.POSITIVE_INFINITY);
        },
        isInt: (inst) => {
          let { isInt, multipleOf } = processors.aggregateChecks(inst);
          return !!isInt || !!multipleOf?.some(Number.isSafeInteger);
        },
        format: (inst) => processors.aggregateChecks(inst).format ?? null,
      },
      {
        gt(value, params) {
          return this.check(checks.gt(value, params));
        },
        gte(value, params) {
          return this.check(checks.gte(value, params));
        },
        min(value, params) {
          return this.check(checks.gte(value, params));
        },
        lt(value, params) {
          return this.check(checks.lt(value, params));
        },
        lte(value, params) {
          return this.check(checks.lte(value, params));
        },
        max(value, params) {
          return this.check(checks.lte(value, params));
        },
        int(params) {
          return this.check(int(params));
        },
        safe(params) {
          return this.check(int(params));
        },
        positive(params) {
          return this.check(checks.gt(0, params));
        },
        nonnegative(params) {
          return this.check(checks.gte(0, params));
        },
        negative(params) {
          return this.check(checks.lt(0, params));
        },
        nonpositive(params) {
          return this.check(checks.lte(0, params));
        },
        multipleOf(value, params) {
          return this.check(checks.multipleOf(value, params));
        },
        step(value, params) {
          return this.check(checks.multipleOf(value, params));
        },
        finite() {
          return this;
        },
      },
    ),
  );
  function number(params) {
    return core._number(cjsExports.ZodNumber, params);
  }
  cjsExports.ZodNumberFormat = core.$constructor("ZodNumberFormat", (inst, def) => {
    core.$ZodNumberFormat.init(inst, def);
    cjsExports.ZodNumber.init(inst, def);
  });
  function int(params) {
    return core._int(cjsExports.ZodNumberFormat, params);
  }
  function float32(params) {
    return core._float32(cjsExports.ZodNumberFormat, params);
  }
  function float64(params) {
    return core._float64(cjsExports.ZodNumberFormat, params);
  }
  function int32(params) {
    return core._int32(cjsExports.ZodNumberFormat, params);
  }
  function uint32(params) {
    return core._uint32(cjsExports.ZodNumberFormat, params);
  }
  cjsExports.ZodBoolean = core.$constructor("ZodBoolean", (inst, def) => {
    core.$ZodBoolean.init(inst, def);
    cjsExports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.booleanProcessor(inst, ctx, json, params);
  });
  function boolean(params) {
    return core._boolean(cjsExports.ZodBoolean, params);
  }
  cjsExports.ZodBigInt = core.$constructor(
    "ZodBigInt",
    (inst, def) => {
      core.$ZodBigInt.init(inst, def);
      cjsExports.ZodType.init(inst, def);
      inst._zod.processJSONSchema = (ctx, json, params) =>
        processors.bigintProcessor(inst, ctx, json, params);
    },
    index_js_1.util.derived(
      {
        minValue: (inst) => processors.aggregateChecks(inst).minimum ?? null,
        maxValue: (inst) => processors.aggregateChecks(inst).maximum ?? null,
        format: (inst) => processors.aggregateChecks(inst).format ?? null,
      },
      {
        gte(value, params) {
          return this.check(checks.gte(value, params));
        },
        min(value, params) {
          return this.check(checks.gte(value, params));
        },
        gt(value, params) {
          return this.check(checks.gt(value, params));
        },
        lt(value, params) {
          return this.check(checks.lt(value, params));
        },
        lte(value, params) {
          return this.check(checks.lte(value, params));
        },
        max(value, params) {
          return this.check(checks.lte(value, params));
        },
        positive(params) {
          return this.check(checks.gt(BigInt(0), params));
        },
        negative(params) {
          return this.check(checks.lt(BigInt(0), params));
        },
        nonpositive(params) {
          return this.check(checks.lte(BigInt(0), params));
        },
        nonnegative(params) {
          return this.check(checks.gte(BigInt(0), params));
        },
        multipleOf(value, params) {
          return this.check(checks.multipleOf(value, params));
        },
      },
    ),
  );
  function bigint(params) {
    return core._bigint(cjsExports.ZodBigInt, params);
  }
  cjsExports.ZodBigIntFormat = core.$constructor("ZodBigIntFormat", (inst, def) => {
    core.$ZodBigIntFormat.init(inst, def);
    cjsExports.ZodBigInt.init(inst, def);
  });
  function int64(params) {
    return core._int64(cjsExports.ZodBigIntFormat, params);
  }
  function uint64(params) {
    return core._uint64(cjsExports.ZodBigIntFormat, params);
  }
  cjsExports.ZodSymbol = core.$constructor("ZodSymbol", (inst, def) => {
    core.$ZodSymbol.init(inst, def);
    cjsExports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.symbolProcessor(inst, ctx, json, params);
  });
  function symbol(params) {
    return core._symbol(cjsExports.ZodSymbol, params);
  }
  cjsExports.ZodUndefined = core.$constructor("ZodUndefined", (inst, def) => {
    core.$ZodUndefined.init(inst, def);
    cjsExports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) =>
      processors.undefinedProcessor(inst, ctx, json, params);
  });
  function _undefined(params) {
    return core._undefined(cjsExports.ZodUndefined, params);
  }
  cjsExports.ZodNull = core.$constructor("ZodNull", (inst, def) => {
    core.$ZodNull.init(inst, def);
    cjsExports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.nullProcessor(inst, ctx, json, params);
  });
  function _null(params) {
    return core._null(cjsExports.ZodNull, params);
  }
  cjsExports.ZodAny = core.$constructor("ZodAny", (inst, def) => {
    core.$ZodAny.init(inst, def);
    cjsExports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.anyProcessor(inst, ctx, json, params);
  });
  function any() {
    return core._any(cjsExports.ZodAny);
  }
  cjsExports.ZodUnknown = core.$constructor("ZodUnknown", (inst, def) => {
    core.$ZodUnknown.init(inst, def);
    cjsExports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.unknownProcessor(inst, ctx, json, params);
  });
  function unknown() {
    return core._unknown(cjsExports.ZodUnknown);
  }
  cjsExports.ZodNever = core.$constructor("ZodNever", (inst, def) => {
    core.$ZodNever.init(inst, def);
    cjsExports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.neverProcessor(inst, ctx, json, params);
  });
  function never(params) {
    return core._never(cjsExports.ZodNever, params);
  }
  cjsExports.ZodVoid = core.$constructor("ZodVoid", (inst, def) => {
    core.$ZodVoid.init(inst, def);
    cjsExports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.voidProcessor(inst, ctx, json, params);
  });
  function _void(params) {
    return core._void(cjsExports.ZodVoid, params);
  }
  cjsExports.ZodDate = core.$constructor(
    "ZodDate",
    (inst, def) => {
      core.$ZodDate.init(inst, def);
      cjsExports.ZodType.init(inst, def);
      inst._zod.processJSONSchema = (ctx, json, params) => processors.dateProcessor(inst, ctx, json, params);
      inst.min = (value, params) => inst.check(checks.gte(value, params));
      inst.max = (value, params) => inst.check(checks.lte(value, params));
    },
    index_js_1.util.derived(
      {
        minDate: (inst) => {
          let { minimum } = processors.aggregateChecks(inst);
          return minimum ? new Date(minimum) : null;
        },
        maxDate: (inst) => {
          let { maximum } = processors.aggregateChecks(inst);
          return maximum ? new Date(maximum) : null;
        },
      },
      {},
    ),
  );
  function date(params) {
    return core._date(cjsExports.ZodDate, params);
  }
  cjsExports.ZodArray = core.$constructor(
    "ZodArray",
    (inst, def) => {
      _ensureDefaultMemoizer();
      core.$ZodArray.init(inst, def);
      cjsExports.ZodType.init(inst, def);
      inst._zod.processJSONSchema = (ctx, json, params) => processors.arrayProcessor(inst, ctx, json, params);
      inst.element = def.element;
    },
    {
      min(n, params) {
        return this.check(checks.minLength(n, params));
      },
      nonempty(params) {
        return this.check(checks.minLength(1, params));
      },
      max(n, params) {
        return this.check(checks.maxLength(n, params));
      },
      length(n, params) {
        return this.check(checks.length(n, params));
      },
      unwrap() {
        return this.element;
      },
    },
  );
  function array(element, params) {
    return core._array(cjsExports.ZodArray, element, params);
  }
  function keyof(schema) {
    let shape = schema._zod.def.shape;
    return _enum(Object.keys(shape));
  }
  cjsExports.ZodObject = core.$constructor(
    "ZodObject",
    (inst, def) => {
      _ensureDefaultMemoizer();
      core.$ZodObjectJIT.init(inst, def);
      cjsExports.ZodType.init(inst, def);
      inst._zod.processJSONSchema = (ctx, json, params) =>
        processors.objectProcessor(inst, ctx, json, params);
      index_js_1.util.installLazyProp(
        inst,
        "shape",
        (objectInstance) => objectInstance._zod.def.shape,
        false,
      );
    },
    {
      keyof() {
        return _enum(Object.keys(this._zod.def.shape));
      },
      catchall(catchall) {
        return this.clone(
          index_js_1.util.mergeDefs(this._zod.def, {
            catchall,
          }),
        );
      },
      passthrough() {
        return this.clone(
          index_js_1.util.mergeDefs(this._zod.def, {
            catchall: unknown(),
          }),
        );
      },
      loose() {
        return this.clone(
          index_js_1.util.mergeDefs(this._zod.def, {
            catchall: unknown(),
          }),
        );
      },
      strict() {
        return this.clone(
          index_js_1.util.mergeDefs(this._zod.def, {
            catchall: never(),
          }),
        );
      },
      strip() {
        return this.clone(
          index_js_1.util.mergeDefs(this._zod.def, {
            catchall: undefined,
          }),
        );
      },
      extend(incoming) {
        return index_js_1.util.extend(this, incoming);
      },
      safeExtend(incoming) {
        return index_js_1.util.safeExtend(this, incoming);
      },
      merge(other) {
        return index_js_1.util.merge(this, other);
      },
      pick(mask) {
        return index_js_1.util.pick(this, mask);
      },
      omit(mask) {
        return index_js_1.util.omit(this, mask);
      },
      partial(...args) {
        return index_js_1.util.partial(cjsExports.ZodOptional, this, args[0]);
      },
      exactPartial(...args) {
        return index_js_1.util.partial(cjsExports.ZodExactOptional, this, args[0], "exactPartial");
      },
      required(...args) {
        return index_js_1.util.required(cjsExports.ZodNonOptional, this, args[0]);
      },
    },
  );
  function object(shape, params) {
    let def = {
      type: "object",
      shape: shape ?? {},
      ...index_js_1.util.normalizeParams(params),
    };
    return new cjsExports.ZodObject(def);
  }
  function strictObject(shape, params) {
    return new cjsExports.ZodObject({
      type: "object",
      shape,
      catchall: never(),
      ...index_js_1.util.normalizeParams(params),
    });
  }
  function looseObject(shape, params) {
    return new cjsExports.ZodObject({
      type: "object",
      shape,
      catchall: unknown(),
      ...index_js_1.util.normalizeParams(params),
    });
  }
  cjsExports.ZodUnion = core.$constructor("ZodUnion", (inst, def) => {
    core.$ZodUnion.init(inst, def);
    cjsExports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.unionProcessor(inst, ctx, json, params);
    inst.options = def.options;
  });
  function union(options, params) {
    return new cjsExports.ZodUnion({
      type: "union",
      options,
      ...index_js_1.util.normalizeParams(params),
    });
  }
  cjsExports.ZodXor = core.$constructor("ZodXor", (inst, def) => {
    cjsExports.ZodUnion.init(inst, def);
    core.$ZodXor.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.unionProcessor(inst, ctx, json, params);
    inst.options = def.options;
  });
  function xor(options, params) {
    return new cjsExports.ZodXor({
      type: "union",
      options,
      inclusive: false,
      ...index_js_1.util.normalizeParams(params),
    });
  }
  cjsExports.ZodDiscriminatedUnion = core.$constructor("ZodDiscriminatedUnion", (inst, def) => {
    cjsExports.ZodUnion.init(inst, def);
    core.$ZodDiscriminatedUnion.init(inst, def);
  });
  function discriminatedUnion(discriminator, options, params) {
    return new cjsExports.ZodDiscriminatedUnion({
      type: "union",
      options,
      discriminator,
      ...index_js_1.util.normalizeParams(params),
    });
  }
  cjsExports.ZodIntersection = core.$constructor("ZodIntersection", (inst, def) => {
    core.$ZodIntersection.init(inst, def);
    cjsExports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) =>
      processors.intersectionProcessor(inst, ctx, json, params);
  });
  function intersection(left, right) {
    return new cjsExports.ZodIntersection({
      type: "intersection",
      left,
      right,
    });
  }
  cjsExports.ZodTuple = core.$constructor(
    "ZodTuple",
    (inst, def) => {
      _ensureDefaultMemoizer();
      core.$ZodTuple.init(inst, def);
      cjsExports.ZodType.init(inst, def);
      inst._zod.processJSONSchema = (ctx, json, params) => processors.tupleProcessor(inst, ctx, json, params);
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
              new cjsExports.ZodOptional({
                type: "optional",
                innerType: item,
              }),
          ),
        });
      },
    },
  );
  function tuple(items, _paramsOrRest, _params) {
    let hasRest = _paramsOrRest instanceof core.$ZodType;
    let params = hasRest ? _params : _paramsOrRest;
    let rest = hasRest ? _paramsOrRest : null;
    return new cjsExports.ZodTuple({
      type: "tuple",
      items,
      rest,
      ...index_js_1.util.normalizeParams(params),
    });
  }
  cjsExports.ZodRecord = core.$constructor("ZodRecord", (inst, def) => {
    _ensureDefaultMemoizer();
    core.$ZodRecord.init(inst, def);
    cjsExports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.recordProcessor(inst, ctx, json, params);
    inst.keyType = def.keyType;
    inst.valueType = def.valueType;
  });
  function record(keyType, valueType, params) {
    if (!valueType || !valueType._zod)
      return new cjsExports.ZodRecord({
        type: "record",
        keyType: string(),
        valueType: keyType,
        ...index_js_1.util.normalizeParams(valueType),
      });
    return new cjsExports.ZodRecord({
      type: "record",
      keyType,
      valueType,
      ...index_js_1.util.normalizeParams(params),
    });
  }
  function partialRecord(keyType, valueType, params) {
    return new cjsExports.ZodRecord({
      type: "record",
      keyType,
      valueType,
      ...index_js_1.util.normalizeParams(params),
      partial: true,
    });
  }
  function looseRecord(keyType, valueType, params) {
    return new cjsExports.ZodRecord({
      type: "record",
      keyType,
      valueType,
      mode: "loose",
      ...index_js_1.util.normalizeParams(params),
    });
  }
  cjsExports.ZodMap = core.$constructor("ZodMap", (inst, def) => {
    _ensureDefaultMemoizer();
    core.$ZodMap.init(inst, def);
    cjsExports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.mapProcessor(inst, ctx, json, params);
    inst.keyType = def.keyType;
    inst.valueType = def.valueType;
    inst.min = (...args) => inst.check(core._minSize(...args));
    inst.nonempty = (params) => inst.check(core._minSize(1, params));
    inst.max = (...args) => inst.check(core._maxSize(...args));
    inst.size = (...args) => inst.check(core._size(...args));
  });
  function map(keyType, valueType, params) {
    return new cjsExports.ZodMap({
      type: "map",
      keyType,
      valueType,
      ...index_js_1.util.normalizeParams(params),
    });
  }
  cjsExports.ZodSet = core.$constructor("ZodSet", (inst, def) => {
    _ensureDefaultMemoizer();
    core.$ZodSet.init(inst, def);
    cjsExports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.setProcessor(inst, ctx, json, params);
    inst.min = (...args) => inst.check(core._minSize(...args));
    inst.nonempty = (params) => inst.check(core._minSize(1, params));
    inst.max = (...args) => inst.check(core._maxSize(...args));
    inst.size = (...args) => inst.check(core._size(...args));
  });
  function set(valueType, params) {
    return new cjsExports.ZodSet({
      type: "set",
      valueType,
      ...index_js_1.util.normalizeParams(params),
    });
  }
  cjsExports.ZodEnum = core.$constructor("ZodEnum", (inst, def) => {
    core.$ZodEnum.init(inst, def);
    cjsExports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.enumProcessor(inst, ctx, json, params);
    inst.enum = def.entries;
    inst.options = [...inst._zod.values];
    let keys = new Set(Object.keys(def.entries));
    inst.extract = (values, params) => {
      let newEntries = {};
      for (let value of values)
        if (keys.has(value)) newEntries[value] = def.entries[value];
        else throw Error(`Key ${value} not found in enum`);
      return new cjsExports.ZodEnum({
        ...def,
        checks: [],
        ...index_js_1.util.normalizeParams(params),
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
      return new cjsExports.ZodEnum({
        ...def,
        checks: [],
        ...index_js_1.util.normalizeParams(params),
        entries: newEntries,
      });
    };
  });
  function _enum(values, params) {
    let entries = Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values;
    return new cjsExports.ZodEnum({
      type: "enum",
      entries,
      ...index_js_1.util.normalizeParams(params),
    });
  }
  function nativeEnum(entries, params) {
    return new cjsExports.ZodEnum({
      type: "enum",
      entries,
      ...index_js_1.util.normalizeParams(params),
    });
  }
  cjsExports.ZodLiteral = core.$constructor("ZodLiteral", (inst, def) => {
    core.$ZodLiteral.init(inst, def);
    cjsExports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.literalProcessor(inst, ctx, json, params);
    inst.values = new Set(def.values);
    Object.defineProperty(inst, "value", {
      get() {
        if (def.values.length > 1)
          throw Error("This schema contains multiple valid literal values. Use `.values` instead.");
        return def.values[0];
      },
    });
  });
  function literal(value, params) {
    return new cjsExports.ZodLiteral({
      type: "literal",
      values: Array.isArray(value) ? value : [value],
      ...index_js_1.util.normalizeParams(params),
    });
  }
  cjsExports.ZodFile = core.$constructor("ZodFile", (inst, def) => {
    core.$ZodFile.init(inst, def);
    cjsExports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.fileProcessor(inst, ctx, json, params);
    inst.min = (size, params) => inst.check(core._minSize(size, params));
    inst.max = (size, params) => inst.check(core._maxSize(size, params));
    inst.mime = (types, params) => inst.check(core._mime(Array.isArray(types) ? types : [types], params));
  });
  function file(params) {
    return core._file(cjsExports.ZodFile, params);
  }
  cjsExports.ZodTransform = core.$constructor("ZodTransform", (inst, def) => {
    _ensureDefaultMemoizer();
    core.$ZodTransform.init(inst, def);
    cjsExports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) =>
      processors.transformProcessor(inst, ctx, json, params);
    inst._zod.parse = (payload, _ctx) => {
      if (_ctx.direction === "backward") throw new core.$ZodEncodeError(inst.constructor.name);
      payload.addIssue = (issue) => {
        if (typeof issue === "string") payload.issues.push(index_js_1.util.issue(issue, payload.value, def));
        else {
          let _issue = issue;
          if (_issue.fatal) _issue.continue = false;
          _issue.code ?? (_issue.code = "custom");
          if (!("input" in _issue)) _issue.input = payload.value;
          _issue.inst ?? (_issue.inst = inst);
          payload.issues.push(index_js_1.util.issue(_issue));
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
  function transform(fn) {
    return new cjsExports.ZodTransform({
      type: "transform",
      transform: fn,
    });
  }
  cjsExports.ZodOptional = core.$constructor("ZodOptional", (inst, def) => {
    core.$ZodOptional.init(inst, def);
    cjsExports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) =>
      processors.optionalProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  function optional(innerType) {
    return new cjsExports.ZodOptional({
      type: "optional",
      innerType,
    });
  }
  cjsExports.ZodExactOptional = core.$constructor("ZodExactOptional", (inst, def) => {
    core.$ZodExactOptional.init(inst, def);
    cjsExports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) =>
      processors.optionalProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  function exactOptional(innerType) {
    return new cjsExports.ZodExactOptional({
      type: "optional",
      innerType,
    });
  }
  cjsExports.ZodNullable = core.$constructor("ZodNullable", (inst, def) => {
    core.$ZodNullable.init(inst, def);
    cjsExports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) =>
      processors.nullableProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  function nullable(innerType) {
    return new cjsExports.ZodNullable({
      type: "nullable",
      innerType,
    });
  }
  function nullish(innerType) {
    return optional(nullable(innerType));
  }
  cjsExports.ZodDefault = core.$constructor("ZodDefault", (inst, def) => {
    core.$ZodDefault.init(inst, def);
    cjsExports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.defaultProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
    inst.removeDefault = inst.unwrap;
  });
  function _default(innerType, defaultValue) {
    return new cjsExports.ZodDefault({
      type: "default",
      innerType,
      get defaultValue() {
        return typeof defaultValue === "function"
          ? defaultValue()
          : index_js_1.util.shallowClone(defaultValue);
      },
    });
  }
  cjsExports.ZodPrefault = core.$constructor("ZodPrefault", (inst, def) => {
    core.$ZodPrefault.init(inst, def);
    cjsExports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) =>
      processors.prefaultProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  function prefault(innerType, defaultValue) {
    return new cjsExports.ZodPrefault({
      type: "prefault",
      innerType,
      get defaultValue() {
        return typeof defaultValue === "function"
          ? defaultValue()
          : index_js_1.util.shallowClone(defaultValue);
      },
    });
  }
  cjsExports.ZodNonOptional = core.$constructor("ZodNonOptional", (inst, def) => {
    core.$ZodNonOptional.init(inst, def);
    cjsExports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) =>
      processors.nonoptionalProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  function nonoptional(innerType, params) {
    return new cjsExports.ZodNonOptional({
      type: "nonoptional",
      innerType,
      ...index_js_1.util.normalizeParams(params),
    });
  }
  cjsExports.ZodSuccess = core.$constructor("ZodSuccess", (inst, def) => {
    core.$ZodSuccess.init(inst, def);
    cjsExports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.successProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  function success(innerType) {
    return new cjsExports.ZodSuccess({
      type: "success",
      innerType,
    });
  }
  cjsExports.ZodCatch = core.$constructor("ZodCatch", (inst, def) => {
    core.$ZodCatch.init(inst, def);
    cjsExports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.catchProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
    inst.removeCatch = inst.unwrap;
  });
  function _catch(innerType, catchValue) {
    return new cjsExports.ZodCatch({
      type: "catch",
      innerType,
      catchValue: typeof catchValue === "function" ? catchValue : core.util.constantCatch(catchValue),
    });
  }
  cjsExports.ZodNaN = core.$constructor("ZodNaN", (inst, def) => {
    core.$ZodNaN.init(inst, def);
    cjsExports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.nanProcessor(inst, ctx, json, params);
  });
  function nan(params) {
    return core._nan(cjsExports.ZodNaN, params);
  }
  cjsExports.ZodPipe = core.$constructor("ZodPipe", (inst, def) => {
    core.$ZodPipe.init(inst, def);
    cjsExports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.pipeProcessor(inst, ctx, json, params);
    inst.in = def.in;
    inst.out = def.out;
  });
  function pipe(in_, out) {
    return new cjsExports.ZodPipe({
      type: "pipe",
      in: in_,
      out,
    });
  }
  cjsExports.ZodCodec = core.$constructor("ZodCodec", (inst, def) => {
    cjsExports.ZodPipe.init(inst, def);
    core.$ZodCodec.init(inst, def);
  });
  function codec(in_, out, params) {
    return new cjsExports.ZodCodec({
      type: "pipe",
      in: in_,
      out,
      transform: params.decode,
      reverseTransform: params.encode,
    });
  }
  function invertCodec(codec) {
    let def = codec._zod.def;
    return new cjsExports.ZodCodec({
      type: "pipe",
      in: def.out,
      out: def.in,
      transform: def.reverseTransform,
      reverseTransform: def.transform,
    });
  }
  cjsExports.ZodPreprocess = core.$constructor("ZodPreprocess", (inst, def) => {
    cjsExports.ZodPipe.init(inst, def);
    core.$ZodPreprocess.init(inst, def);
  });
  cjsExports.ZodReadonly = core.$constructor("ZodReadonly", (inst, def) => {
    core.$ZodReadonly.init(inst, def);
    cjsExports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) =>
      processors.readonlyProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  function readonly(innerType) {
    return new cjsExports.ZodReadonly({
      type: "readonly",
      innerType,
    });
  }
  cjsExports.ZodTemplateLiteral = core.$constructor("ZodTemplateLiteral", (inst, def) => {
    core.$ZodTemplateLiteral.init(inst, def);
    cjsExports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) =>
      processors.templateLiteralProcessor(inst, ctx, json, params);
  });
  function templateLiteral(parts, params) {
    return new cjsExports.ZodTemplateLiteral({
      type: "template_literal",
      parts,
      ...index_js_1.util.normalizeParams(params),
    });
  }
  cjsExports.ZodLazy = core.$constructor("ZodLazy", (inst, def) => {
    core.$ZodLazy.init(inst, def);
    cjsExports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.lazyProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.getter();
  });
  function lazy(getter) {
    return new cjsExports.ZodLazy({
      type: "lazy",
      getter,
    });
  }
  cjsExports.ZodPromise = core.$constructor("ZodPromise", (inst, def) => {
    core.$ZodPromise.init(inst, def);
    cjsExports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.promiseProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  function promise(innerType) {
    return new cjsExports.ZodPromise({
      type: "promise",
      innerType,
    });
  }
  cjsExports.ZodFunction = core.$constructor("ZodFunction", (inst, def) => {
    core.$ZodFunction.init(inst, def);
    cjsExports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) =>
      processors.functionProcessor(inst, ctx, json, params);
  });
  function _function(params) {
    return new cjsExports.ZodFunction({
      type: "function",
      input: Array.isArray(params?.input) ? tuple(params?.input) : (params?.input ?? array(unknown())),
      output: params?.output ?? unknown(),
    });
  }
  cjsExports.ZodCustom = core.$constructor("ZodCustom", (inst, def) => {
    core.$ZodCustom.init(inst, def);
    cjsExports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.customProcessor(inst, ctx, json, params);
  });
  cjsExports.ZodProperties = core.$constructor("ZodProperties", (inst, def) => {
    _ensureDefaultMemoizer();
    core.$ZodProperties.init(inst, def);
    cjsExports.ZodType.init(inst, def);
  });
  function properties(shape, params) {
    return core._properties(cjsExports.ZodProperties, shape, params);
  }
  function check(fn) {
    let ch = new core.$ZodCheck({
      check: "custom",
    });
    ch._zod.check = fn;
    return ch;
  }
  function custom(fn, _params) {
    return core._custom(cjsExports.ZodCustom, fn ?? (() => true), _params);
  }
  function refine(fn, _params = {}) {
    return core._refine(cjsExports.ZodCustom, fn, _params);
  }
  function superRefine(fn, params) {
    return core._superRefine(fn, params);
  }
  cjsExports.describe = core.describe;
  cjsExports.meta = core.meta;
  cjsExports.ZodInstanceOf = core.$constructor(
    "ZodInstanceOf",
    (inst, def) => {
      cjsExports.ZodCustom.init(inst, def);
    },
    {
      properties(shape, params) {
        return this.check(properties(shape, params));
      },
    },
  );
  function _instanceof(cls, params = {}) {
    let inst = new cjsExports.ZodInstanceOf({
      type: "custom",
      check: "custom",
      fn: (data) => data instanceof cls,
      abort: true,
      ...index_js_1.util.normalizeParams(params),
    });
    inst._zod.bag.Class = cls;
    inst._zod.check = (payload) => {
      if (!(payload.value instanceof cls))
        payload.issues.push({
          code: "invalid_type",
          expected: cls.name,
          input: payload.value,
          inst,
          path: [...(inst._zod.def.path ?? [])],
        });
    };
    return inst;
  }
  var stringbool = (...args) =>
    core._stringbool(
      {
        Codec: cjsExports.ZodCodec,
        Boolean: cjsExports.ZodBoolean,
        String: cjsExports.ZodString,
      },
      ...args,
    );
  cjsExports.stringbool = stringbool;
  function json(params) {
    let jsonSchema = lazy(() =>
      union([string(params), number(), boolean(), _null(), array(jsonSchema), record(string(), jsonSchema)]),
    );
    return jsonSchema;
  }
  function preprocess(fn, schema) {
    return new cjsExports.ZodPreprocess({
      type: "pipe",
      in: transform(fn),
      out: schema,
    });
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
export { require_schemas_2 };
