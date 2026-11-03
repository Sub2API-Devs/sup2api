/**
 * zod/v4/classic/schemas.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Wr } from "../core/index.cjs";
import { nd } from "../core/json-schema-processors.cjs";
import { td } from "../core/to-json-schema.cjs";
import { B_ } from "../locales/en.cjs";
import { Ah } from "./checks.cjs";
import { ob } from "./parse.cjs";

//@ chunk-1ny7cxrt.js:595236-626893 cjs-fingerprint
var ra = x(function (v) {
  var TX =
      (v && v.__createBinding) ||
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
    $X =
      (v && v.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    Mh =
      (v && v.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) TX(t, e, key);
        }
        return ($X(t, e), t);
      },
    RX =
      (v && v.__importDefault) ||
      function (e) {
        return e && e.__esModule ? e : { default: e };
      };
  Object.defineProperty(v, "__esModule", { value: !0 });
  v.ZodIntersection =
    v.ZodDiscriminatedUnion =
    v.ZodXor =
    v.ZodUnion =
    v.ZodObject =
    v.ZodArray =
    v.ZodDate =
    v.ZodVoid =
    v.ZodNever =
    v.ZodUnknown =
    v.ZodAny =
    v.ZodNull =
    v.ZodUndefined =
    v.ZodSymbol =
    v.ZodBigIntFormat =
    v.ZodBigInt =
    v.ZodBoolean =
    v.ZodNumberFormat =
    v.ZodNumber =
    v.ZodCustomStringFormat =
    v.ZodJWT =
    v.ZodIBAN =
    v.ZodCreditCard =
    v.ZodE164 =
    v.ZodBase64URL =
    v.ZodBase64 =
    v.ZodCIDRv6 =
    v.ZodCIDRv4 =
    v.ZodIPv6 =
    v.ZodMAC =
    v.ZodIPv4 =
    v.ZodKSUID =
    v.ZodXID =
    v.ZodULID =
    v.ZodCUID2 =
    v.ZodCUID =
    v.ZodNanoID =
    v.ZodEmoji =
    v.ZodURL =
    v.ZodUUID =
    v.ZodGUID =
    v.ZodEmail =
    v.ZodISODuration =
    v.ZodISOTime =
    v.ZodISODate =
    v.ZodISODateTime =
    v.ZodStringFormat =
    v.ZodString =
    v._ZodString =
    v.ZodType =
      void 0;
  v.stringbool =
    v.ZodInstanceOf =
    v.meta =
    v.describe =
    v.ZodProperties =
    v.ZodCustom =
    v.ZodFunction =
    v.ZodPromise =
    v.ZodLazy =
    v.ZodTemplateLiteral =
    v.ZodReadonly =
    v.ZodPreprocess =
    v.ZodCodec =
    v.ZodPipe =
    v.ZodNaN =
    v.ZodCatch =
    v.ZodSuccess =
    v.ZodNonOptional =
    v.ZodPrefault =
    v.ZodDefault =
    v.ZodNullable =
    v.ZodExactOptional =
    v.ZodOptional =
    v.ZodTransform =
    v.ZodFile =
    v.ZodLiteral =
    v.ZodEnum =
    v.ZodSet =
    v.ZodMap =
    v.ZodRecord =
    v.ZodTuple =
      void 0;
  v.string = Th;
  v.email = jX;
  v.guid = xX;
  v.uuid = LX;
  v.uuidv4 = NX;
  v.uuidv6 = UX;
  v.uuidv7 = zX;
  v.url = FX;
  v.httpUrl = BX;
  v.emoji = HX;
  v.nanoid = KX;
  v.cuid = ZX;
  v.cuid2 = VX;
  v.ulid = qX;
  v.xid = GX;
  v.ksuid = WX;
  v.ipv4 = YX;
  v.mac = JX;
  v.ipv6 = XX;
  v.cidrv4 = QX;
  v.cidrv6 = e7;
  v.base64 = t7;
  v.base64url = n7;
  v.e164 = r7;
  v.creditCard = i7;
  v.iban = o7;
  v.jwt = s7;
  v.stringFormat = a7;
  v.hostname = l7;
  v.hex = c7;
  v.hash = u7;
  v.number = gT;
  v.int = sb;
  v.float32 = d7;
  v.float64 = f7;
  v.int32 = p7;
  v.uint32 = h7;
  v.boolean = yT;
  v.bigint = m7;
  v.int64 = g7;
  v.uint64 = y7;
  v.symbol = _7;
  v.undefined = b7;
  v.null = _T;
  v.any = v7;
  v.unknown = sc;
  v.never = lb;
  v.void = w7;
  v.date = O7;
  v.array = xh;
  v.keyof = S7;
  v.object = k7;
  v.strictObject = E7;
  v.looseObject = P7;
  v.union = cb;
  v.xor = A7;
  v.discriminatedUnion = I7;
  v.intersection = bT;
  v.tuple = vT;
  v.record = wT;
  v.partialRecord = C7;
  v.looseRecord = T7;
  v.map = $7;
  v.set = R7;
  v.enum = ub;
  v.nativeEnum = D7;
  v.literal = M7;
  v.file = j7;
  v.transform = db;
  v.optional = Rh;
  v.exactOptional = OT;
  v.nullable = Dh;
  v.nullish = x7;
  v._default = ST;
  v.prefault = kT;
  v.nonoptional = ET;
  v.success = L7;
  v.catch = PT;
  v.nan = N7;
  v.pipe = ab;
  v.codec = U7;
  v.invertCodec = z7;
  v.readonly = AT;
  v.templateLiteral = F7;
  v.lazy = IT;
  v.promise = B7;
  v._function = Lh;
  v.function = Lh;
  v._function = Lh;
  v.function = Lh;
  v.properties = CT;
  v.check = H7;
  v.custom = K7;
  v.refine = TT;
  v.superRefine = $T;
  v.instanceof = Z7;
  v.json = q7;
  v.preprocess = G7;
  var R = Mh(Wr()),
    de = Wr(),
    Xe = Mh(nd()),
    oc = td(),
    DX = RX(B_()),
    pt = Mh(Ah()),
    Yr = Mh(ob());
  function MX() {
    if (!R.globalConfig.localeError) R.config((0, DX.default)());
  }
  function na() {
    if (!R.globalConfig.memoizer) R.config({ memoizer: R.memoizer() });
  }
  v.ZodType = R.$constructor(
    "ZodType",
    (e, t) => (MX(), R.$ZodType.init(e, t), (e.def = t), (e.type = t.type), e),
    {
      check(...e) {
        let def = this.def;
        return this.clone(
          de.util.mergeDefs(def, {
            checks: [
              ...(def.checks ?? []),
              ...e.map((n) =>
                typeof n === "function" ? { _zod: { check: n, def: { check: "custom" }, onattach: [] } } : n,
              ),
            ],
          }),
          { parent: !0 },
        );
      },
      with(...e) {
        return this.check(...e);
      },
      clone(e, t) {
        return R.clone(this, e, t);
      },
      brand() {
        return this;
      },
      register(e, t) {
        return (e.add(this, t), this);
      },
      refine(e, t) {
        return this.check(TT(e, t));
      },
      superRefine(e, t) {
        return this.check($T(e, t));
      },
      overwrite(e) {
        return this.check(pt.overwrite(e));
      },
      optional() {
        return Rh(this);
      },
      exactOptional() {
        return OT(this);
      },
      nullable() {
        return Dh(this);
      },
      nullish() {
        return Rh(Dh(this));
      },
      nonoptional(e) {
        return ET(this, e);
      },
      array() {
        return xh(this);
      },
      or(e) {
        return cb([this, e]);
      },
      and(e) {
        return bT(this, e);
      },
      transform(e) {
        return ab(this, db(e));
      },
      default(e) {
        return ST(this, e);
      },
      prefault(e) {
        return kT(this, e);
      },
      catch(e) {
        return PT(this, e);
      },
      pipe(e) {
        return ab(this, e);
      },
      readonly() {
        return AT(this);
      },
      describe(e) {
        let clone = this.clone();
        return (R.globalRegistry.add(clone, { description: e }), clone);
      },
      meta(...e) {
        if (e.length === 0) return R.globalRegistry.get(this);
        let clone = this.clone();
        return (R.globalRegistry.add(clone, e[0]), clone);
      },
      isOptional() {
        return this.safeParse(void 0).success;
      },
      isNullable() {
        return this.safeParse(null).success;
      },
      apply(e, ...t) {
        return t.length === 0 ? e(this) : e(this, ...t);
      },
      get "~standard"() {
        return de.util.hide(this, "~standard", {
          ...R.standardProps(this),
          jsonSchema: {
            input: oc.createStandardJSONSchemaMethod(this, "input"),
            output: oc.createStandardJSONSchemaMethod(this, "output"),
          },
        });
      },
      set "~standard"(e) {
        de.util.own(this, "~standard", e);
      },
      parse: function e(t, n) {
        return Yr.parse(this, t, n, { callee: e });
      },
      parseAsync: async function e(t, n) {
        return await Yr.parseAsync(this, t, n, { callee: e });
      },
      safeParse(e, t) {
        return Yr.safeParse(this, e, t);
      },
      async safeParseAsync(e, t) {
        return Yr.safeParseAsync(this, e, t);
      },
      get spa() {
        return this?.safeParseAsync;
      },
      set spa(e) {
        de.util.own(this, "spa", e);
      },
      validate(e, t) {
        return Yr.validate(this, e, t);
      },
      validateAsync(e, t) {
        return Yr.validateAsync(this, e, t);
      },
      encode: function e(t, n) {
        return Yr.encode(this, t, n, { callee: e });
      },
      decode: function e(t, n) {
        return Yr.decode(this, t, n, { callee: e });
      },
      encodeAsync: async function e(t, n) {
        return await Yr.encodeAsync(this, t, n, { callee: e });
      },
      decodeAsync: async function e(t, n) {
        return await Yr.decodeAsync(this, t, n, { callee: e });
      },
      safeEncode(e, t) {
        return Yr.safeEncode(this, e, t);
      },
      safeDecode(e, t) {
        return Yr.safeDecode(this, e, t);
      },
      async safeEncodeAsync(e, t) {
        return Yr.safeEncodeAsync(this, e, t);
      },
      async safeDecodeAsync(e, t) {
        return Yr.safeDecodeAsync(this, e, t);
      },
      toJSONSchema(e) {
        return oc.createToJSONSchemaMethod(this, {})(e);
      },
      get description() {
        return R.globalRegistry.get(this)?.description;
      },
      get _def() {
        return this._zod.def;
      },
    },
  );
  v._ZodString = R.$constructor(
    "_ZodString",
    (e, t) => {
      (R.$ZodString.init(e, t),
        v.ZodType.init(e, t),
        (e._zod.processJSONSchema = (n, o, r) => Xe.stringProcessor(e, n, o, r)));
    },
    de.util.derived(
      {
        format: (e) => Xe.aggregateChecks(e).format ?? null,
        minLength: (e) => Xe.aggregateChecks(e).minimum ?? null,
        maxLength: (e) => Xe.aggregateChecks(e).maximum ?? null,
      },
      {
        regex(...e) {
          return this.check(pt.regex(...e));
        },
        includes(...e) {
          return this.check(pt.includes(...e));
        },
        startsWith(...e) {
          return this.check(pt.startsWith(...e));
        },
        endsWith(...e) {
          return this.check(pt.endsWith(...e));
        },
        min(...e) {
          return this.check(pt.minLength(...e));
        },
        max(...e) {
          return this.check(pt.maxLength(...e));
        },
        length(...e) {
          return this.check(pt.length(...e));
        },
        nonempty(...e) {
          return this.check(pt.minLength(1, ...e));
        },
        lowercase(e) {
          return this.check(pt.lowercase(e));
        },
        uppercase(e) {
          return this.check(pt.uppercase(e));
        },
        trim() {
          return this.check(pt.trim());
        },
        normalize(...e) {
          return this.check(pt.normalize(...e));
        },
        toLowerCase() {
          return this.check(pt.toLowerCase());
        },
        toUpperCase() {
          return this.check(pt.toUpperCase());
        },
        slugify() {
          return this.check(pt.slugify());
        },
      },
    ),
  );
  v.ZodString = R.$constructor(
    "ZodString",
    (e, t) => {
      (R.$ZodString.init(e, t), v._ZodString.init(e, t));
    },
    {
      email(e) {
        return this.check(R._email(v.ZodEmail, e));
      },
      url(e) {
        return this.check(R._url(v.ZodURL, e));
      },
      jwt(e) {
        return this.check(R._jwt(v.ZodJWT, e));
      },
      emoji(e) {
        return this.check(R._emoji(v.ZodEmoji, e));
      },
      guid(e) {
        return this.check(R._guid(v.ZodGUID, e));
      },
      uuid(e) {
        return this.check(R._uuid(v.ZodUUID, e));
      },
      uuidv4(e) {
        return this.check(R._uuidv4(v.ZodUUID, e));
      },
      uuidv6(e) {
        return this.check(R._uuidv6(v.ZodUUID, e));
      },
      uuidv7(e) {
        return this.check(R._uuidv7(v.ZodUUID, e));
      },
      nanoid(e) {
        return this.check(R._nanoid(v.ZodNanoID, e));
      },
      cuid(e) {
        return this.check(R._cuid(v.ZodCUID, e));
      },
      cuid2(e) {
        return this.check(R._cuid2(v.ZodCUID2, e));
      },
      ulid(e) {
        return this.check(R._ulid(v.ZodULID, e));
      },
      base64(e) {
        return this.check(R._base64(v.ZodBase64, e));
      },
      base64url(e) {
        return this.check(R._base64url(v.ZodBase64URL, e));
      },
      xid(e) {
        return this.check(R._xid(v.ZodXID, e));
      },
      ksuid(e) {
        return this.check(R._ksuid(v.ZodKSUID, e));
      },
      ipv4(e) {
        return this.check(R._ipv4(v.ZodIPv4, e));
      },
      ipv6(e) {
        return this.check(R._ipv6(v.ZodIPv6, e));
      },
      cidrv4(e) {
        return this.check(R._cidrv4(v.ZodCIDRv4, e));
      },
      cidrv6(e) {
        return this.check(R._cidrv6(v.ZodCIDRv6, e));
      },
      e164(e) {
        return this.check(R._e164(v.ZodE164, e));
      },
      datetime(e) {
        return this.check(R._isoDateTime(v.ZodISODateTime, e));
      },
      date(e) {
        return this.check(R._isoDate(v.ZodISODate, e));
      },
      time(e) {
        return this.check(R._isoTime(v.ZodISOTime, e));
      },
      duration(e) {
        return this.check(R._isoDuration(v.ZodISODuration, e));
      },
    },
  );
  function Th(e) {
    return R._string(v.ZodString, e);
  }
  v.ZodStringFormat = R.$constructor("ZodStringFormat", (e, t) => {
    (R.$ZodStringFormat.init(e, t), v._ZodString.init(e, t));
  });
  v.ZodISODateTime = R.$constructor("ZodISODateTime", (e, t) => {
    (R.$ZodISODateTime.init(e, t), v.ZodStringFormat.init(e, t));
  });
  v.ZodISODate = R.$constructor("ZodISODate", (e, t) => {
    (R.$ZodISODate.init(e, t), v.ZodStringFormat.init(e, t));
  });
  v.ZodISOTime = R.$constructor("ZodISOTime", (e, t) => {
    (R.$ZodISOTime.init(e, t), v.ZodStringFormat.init(e, t));
  });
  v.ZodISODuration = R.$constructor("ZodISODuration", (e, t) => {
    (R.$ZodISODuration.init(e, t), v.ZodStringFormat.init(e, t));
  });
  v.ZodEmail = R.$constructor("ZodEmail", (e, t) => {
    (R.$ZodEmail.init(e, t), v.ZodStringFormat.init(e, t));
  });
  function jX(e) {
    return R._email(v.ZodEmail, e);
  }
  v.ZodGUID = R.$constructor("ZodGUID", (e, t) => {
    (R.$ZodGUID.init(e, t), v.ZodStringFormat.init(e, t));
  });
  function xX(e) {
    return R._guid(v.ZodGUID, e);
  }
  v.ZodUUID = R.$constructor("ZodUUID", (e, t) => {
    (R.$ZodUUID.init(e, t), v.ZodStringFormat.init(e, t));
  });
  function LX(e) {
    return R._uuid(v.ZodUUID, e);
  }
  function NX(e) {
    return R._uuidv4(v.ZodUUID, e);
  }
  function UX(e) {
    return R._uuidv6(v.ZodUUID, e);
  }
  function zX(e) {
    return R._uuidv7(v.ZodUUID, e);
  }
  v.ZodURL = R.$constructor("ZodURL", (e, t) => {
    (R.$ZodURL.init(e, t), v.ZodStringFormat.init(e, t));
  });
  function FX(e) {
    return R._url(v.ZodURL, e);
  }
  function BX(e) {
    return R._url(v.ZodURL, {
      protocol: R.regexes.httpProtocol,
      hostname: R.regexes.domain,
      ...de.util.normalizeParams(e),
    });
  }
  v.ZodEmoji = R.$constructor("ZodEmoji", (e, t) => {
    (R.$ZodEmoji.init(e, t), v.ZodStringFormat.init(e, t));
  });
  function HX(e) {
    return R._emoji(v.ZodEmoji, e);
  }
  v.ZodNanoID = R.$constructor("ZodNanoID", (e, t) => {
    (R.$ZodNanoID.init(e, t), v.ZodStringFormat.init(e, t));
  });
  function KX(e) {
    return R._nanoid(v.ZodNanoID, e);
  }
  v.ZodCUID = R.$constructor("ZodCUID", (e, t) => {
    (R.$ZodCUID.init(e, t), v.ZodStringFormat.init(e, t));
  });
  function ZX(e) {
    return R._cuid(v.ZodCUID, e);
  }
  v.ZodCUID2 = R.$constructor("ZodCUID2", (e, t) => {
    (R.$ZodCUID2.init(e, t), v.ZodStringFormat.init(e, t));
  });
  function VX(e) {
    return R._cuid2(v.ZodCUID2, e);
  }
  v.ZodULID = R.$constructor("ZodULID", (e, t) => {
    (R.$ZodULID.init(e, t), v.ZodStringFormat.init(e, t));
  });
  function qX(e) {
    return R._ulid(v.ZodULID, e);
  }
  v.ZodXID = R.$constructor("ZodXID", (e, t) => {
    (R.$ZodXID.init(e, t), v.ZodStringFormat.init(e, t));
  });
  function GX(e) {
    return R._xid(v.ZodXID, e);
  }
  v.ZodKSUID = R.$constructor("ZodKSUID", (e, t) => {
    (R.$ZodKSUID.init(e, t), v.ZodStringFormat.init(e, t));
  });
  function WX(e) {
    return R._ksuid(v.ZodKSUID, e);
  }
  v.ZodIPv4 = R.$constructor("ZodIPv4", (e, t) => {
    (R.$ZodIPv4.init(e, t), v.ZodStringFormat.init(e, t));
  });
  function YX(e) {
    return R._ipv4(v.ZodIPv4, e);
  }
  v.ZodMAC = R.$constructor("ZodMAC", (e, t) => {
    (R.$ZodMAC.init(e, t), v.ZodStringFormat.init(e, t));
  });
  function JX(e) {
    return R._mac(v.ZodMAC, e);
  }
  v.ZodIPv6 = R.$constructor("ZodIPv6", (e, t) => {
    (R.$ZodIPv6.init(e, t), v.ZodStringFormat.init(e, t));
  });
  function XX(e) {
    return R._ipv6(v.ZodIPv6, e);
  }
  v.ZodCIDRv4 = R.$constructor("ZodCIDRv4", (e, t) => {
    (R.$ZodCIDRv4.init(e, t), v.ZodStringFormat.init(e, t));
  });
  function QX(e) {
    return R._cidrv4(v.ZodCIDRv4, e);
  }
  v.ZodCIDRv6 = R.$constructor("ZodCIDRv6", (e, t) => {
    (R.$ZodCIDRv6.init(e, t), v.ZodStringFormat.init(e, t));
  });
  function e7(e) {
    return R._cidrv6(v.ZodCIDRv6, e);
  }
  v.ZodBase64 = R.$constructor("ZodBase64", (e, t) => {
    (R.$ZodBase64.init(e, t), v.ZodStringFormat.init(e, t));
  });
  function t7(e) {
    return R._base64(v.ZodBase64, e);
  }
  v.ZodBase64URL = R.$constructor("ZodBase64URL", (e, t) => {
    (R.$ZodBase64URL.init(e, t), v.ZodStringFormat.init(e, t));
  });
  function n7(e) {
    return R._base64url(v.ZodBase64URL, e);
  }
  v.ZodE164 = R.$constructor("ZodE164", (e, t) => {
    (R.$ZodE164.init(e, t), v.ZodStringFormat.init(e, t));
  });
  function r7(e) {
    return R._e164(v.ZodE164, e);
  }
  v.ZodCreditCard = R.$constructor("ZodCreditCard", (e, t) => {
    (R.$ZodCreditCard.init(e, t), v.ZodStringFormat.init(e, t));
  });
  function i7(e) {
    return R._creditCard(v.ZodCreditCard, e);
  }
  v.ZodIBAN = R.$constructor("ZodIBAN", (e, t) => {
    (R.$ZodIBAN.init(e, t), v.ZodStringFormat.init(e, t));
  });
  function o7(e) {
    return R._iban(v.ZodIBAN, e);
  }
  v.ZodJWT = R.$constructor("ZodJWT", (e, t) => {
    (R.$ZodJWT.init(e, t), v.ZodStringFormat.init(e, t));
  });
  function s7(e) {
    return R._jwt(v.ZodJWT, e);
  }
  v.ZodCustomStringFormat = R.$constructor("ZodCustomStringFormat", (e, t) => {
    (R.$ZodCustomStringFormat.init(e, t), v.ZodStringFormat.init(e, t));
  });
  function a7(e, t, n = {}) {
    return R._stringFormat(v.ZodCustomStringFormat, e, t, n);
  }
  function l7(e) {
    return R._stringFormat(v.ZodCustomStringFormat, "hostname", R.regexes.hostname, e);
  }
  function c7(e) {
    return R._stringFormat(v.ZodCustomStringFormat, "hex", R.regexes.hex, e);
  }
  function u7(e, t) {
    let n = t?.enc ?? "hex",
      o = `${e}_${n}`,
      r = R.regexes[o];
    if (!r) throw Error(`Unrecognized hash format: ${o}`);
    return R._stringFormat(v.ZodCustomStringFormat, o, r, t);
  }
  v.ZodNumber = R.$constructor(
    "ZodNumber",
    (e, t) => {
      (R.$ZodNumber.init(e, t),
        v.ZodType.init(e, t),
        (e._zod.processJSONSchema = (n, o, r) => Xe.numberProcessor(e, n, o, r)),
        (e.isFinite = !0));
    },
    de.util.derived(
      {
        minValue: (e) => {
          let { minimum: minimum, exclusiveMinimum: exclusiveMinimum } = Xe.aggregateChecks(e);
          return Math.max(minimum ?? Number.NEGATIVE_INFINITY, exclusiveMinimum ?? Number.NEGATIVE_INFINITY);
        },
        maxValue: (e) => {
          let { maximum: maximum, exclusiveMaximum: exclusiveMaximum } = Xe.aggregateChecks(e);
          return Math.min(maximum ?? Number.POSITIVE_INFINITY, exclusiveMaximum ?? Number.POSITIVE_INFINITY);
        },
        isInt: (e) => {
          let { isInt: isInt, multipleOf: multipleOf } = Xe.aggregateChecks(e);
          return !!isInt || !!multipleOf?.some(Number.isSafeInteger);
        },
        format: (e) => Xe.aggregateChecks(e).format ?? null,
      },
      {
        gt(e, t) {
          return this.check(pt.gt(e, t));
        },
        gte(e, t) {
          return this.check(pt.gte(e, t));
        },
        min(e, t) {
          return this.check(pt.gte(e, t));
        },
        lt(e, t) {
          return this.check(pt.lt(e, t));
        },
        lte(e, t) {
          return this.check(pt.lte(e, t));
        },
        max(e, t) {
          return this.check(pt.lte(e, t));
        },
        int(e) {
          return this.check(sb(e));
        },
        safe(e) {
          return this.check(sb(e));
        },
        positive(e) {
          return this.check(pt.gt(0, e));
        },
        nonnegative(e) {
          return this.check(pt.gte(0, e));
        },
        negative(e) {
          return this.check(pt.lt(0, e));
        },
        nonpositive(e) {
          return this.check(pt.lte(0, e));
        },
        multipleOf(e, t) {
          return this.check(pt.multipleOf(e, t));
        },
        step(e, t) {
          return this.check(pt.multipleOf(e, t));
        },
        finite() {
          return this;
        },
      },
    ),
  );
  function gT(e) {
    return R._number(v.ZodNumber, e);
  }
  v.ZodNumberFormat = R.$constructor("ZodNumberFormat", (e, t) => {
    (R.$ZodNumberFormat.init(e, t), v.ZodNumber.init(e, t));
  });
  function sb(e) {
    return R._int(v.ZodNumberFormat, e);
  }
  function d7(e) {
    return R._float32(v.ZodNumberFormat, e);
  }
  function f7(e) {
    return R._float64(v.ZodNumberFormat, e);
  }
  function p7(e) {
    return R._int32(v.ZodNumberFormat, e);
  }
  function h7(e) {
    return R._uint32(v.ZodNumberFormat, e);
  }
  v.ZodBoolean = R.$constructor("ZodBoolean", (e, t) => {
    (R.$ZodBoolean.init(e, t),
      v.ZodType.init(e, t),
      (e._zod.processJSONSchema = (n, o, r) => Xe.booleanProcessor(e, n, o, r)));
  });
  function yT(e) {
    return R._boolean(v.ZodBoolean, e);
  }
  v.ZodBigInt = R.$constructor(
    "ZodBigInt",
    (e, t) => {
      (R.$ZodBigInt.init(e, t),
        v.ZodType.init(e, t),
        (e._zod.processJSONSchema = (n, o, r) => Xe.bigintProcessor(e, n, o, r)));
    },
    de.util.derived(
      {
        minValue: (e) => Xe.aggregateChecks(e).minimum ?? null,
        maxValue: (e) => Xe.aggregateChecks(e).maximum ?? null,
        format: (e) => Xe.aggregateChecks(e).format ?? null,
      },
      {
        gte(e, t) {
          return this.check(pt.gte(e, t));
        },
        min(e, t) {
          return this.check(pt.gte(e, t));
        },
        gt(e, t) {
          return this.check(pt.gt(e, t));
        },
        lt(e, t) {
          return this.check(pt.lt(e, t));
        },
        lte(e, t) {
          return this.check(pt.lte(e, t));
        },
        max(e, t) {
          return this.check(pt.lte(e, t));
        },
        positive(e) {
          return this.check(pt.gt(BigInt(0), e));
        },
        negative(e) {
          return this.check(pt.lt(BigInt(0), e));
        },
        nonpositive(e) {
          return this.check(pt.lte(BigInt(0), e));
        },
        nonnegative(e) {
          return this.check(pt.gte(BigInt(0), e));
        },
        multipleOf(e, t) {
          return this.check(pt.multipleOf(e, t));
        },
      },
    ),
  );
  function m7(e) {
    return R._bigint(v.ZodBigInt, e);
  }
  v.ZodBigIntFormat = R.$constructor("ZodBigIntFormat", (e, t) => {
    (R.$ZodBigIntFormat.init(e, t), v.ZodBigInt.init(e, t));
  });
  function g7(e) {
    return R._int64(v.ZodBigIntFormat, e);
  }
  function y7(e) {
    return R._uint64(v.ZodBigIntFormat, e);
  }
  v.ZodSymbol = R.$constructor("ZodSymbol", (e, t) => {
    (R.$ZodSymbol.init(e, t),
      v.ZodType.init(e, t),
      (e._zod.processJSONSchema = (n, o, r) => Xe.symbolProcessor(e, n, o, r)));
  });
  function _7(e) {
    return R._symbol(v.ZodSymbol, e);
  }
  v.ZodUndefined = R.$constructor("ZodUndefined", (e, t) => {
    (R.$ZodUndefined.init(e, t),
      v.ZodType.init(e, t),
      (e._zod.processJSONSchema = (n, o, r) => Xe.undefinedProcessor(e, n, o, r)));
  });
  function b7(e) {
    return R._undefined(v.ZodUndefined, e);
  }
  v.ZodNull = R.$constructor("ZodNull", (e, t) => {
    (R.$ZodNull.init(e, t),
      v.ZodType.init(e, t),
      (e._zod.processJSONSchema = (n, o, r) => Xe.nullProcessor(e, n, o, r)));
  });
  function _T(e) {
    return R._null(v.ZodNull, e);
  }
  v.ZodAny = R.$constructor("ZodAny", (e, t) => {
    (R.$ZodAny.init(e, t),
      v.ZodType.init(e, t),
      (e._zod.processJSONSchema = (n, o, r) => Xe.anyProcessor(e, n, o, r)));
  });
  function v7() {
    return R._any(v.ZodAny);
  }
  v.ZodUnknown = R.$constructor("ZodUnknown", (e, t) => {
    (R.$ZodUnknown.init(e, t),
      v.ZodType.init(e, t),
      (e._zod.processJSONSchema = (n, o, r) => Xe.unknownProcessor(e, n, o, r)));
  });
  function sc() {
    return R._unknown(v.ZodUnknown);
  }
  v.ZodNever = R.$constructor("ZodNever", (e, t) => {
    (R.$ZodNever.init(e, t),
      v.ZodType.init(e, t),
      (e._zod.processJSONSchema = (n, o, r) => Xe.neverProcessor(e, n, o, r)));
  });
  function lb(e) {
    return R._never(v.ZodNever, e);
  }
  v.ZodVoid = R.$constructor("ZodVoid", (e, t) => {
    (R.$ZodVoid.init(e, t),
      v.ZodType.init(e, t),
      (e._zod.processJSONSchema = (n, o, r) => Xe.voidProcessor(e, n, o, r)));
  });
  function w7(e) {
    return R._void(v.ZodVoid, e);
  }
  v.ZodDate = R.$constructor(
    "ZodDate",
    (e, t) => {
      (R.$ZodDate.init(e, t),
        v.ZodType.init(e, t),
        (e._zod.processJSONSchema = (n, o, r) => Xe.dateProcessor(e, n, o, r)),
        (e.min = (n, o) => e.check(pt.gte(n, o))),
        (e.max = (n, o) => e.check(pt.lte(n, o))));
    },
    de.util.derived(
      {
        minDate: (e) => {
          let { minimum: minimum } = Xe.aggregateChecks(e);
          return minimum ? new Date(minimum) : null;
        },
        maxDate: (e) => {
          let { maximum: maximum } = Xe.aggregateChecks(e);
          return maximum ? new Date(maximum) : null;
        },
      },
      {},
    ),
  );
  function O7(e) {
    return R._date(v.ZodDate, e);
  }
  v.ZodArray = R.$constructor(
    "ZodArray",
    (e, t) => {
      (na(),
        R.$ZodArray.init(e, t),
        v.ZodType.init(e, t),
        (e._zod.processJSONSchema = (n, o, r) => Xe.arrayProcessor(e, n, o, r)),
        (e.element = t.element));
    },
    {
      min(e, t) {
        return this.check(pt.minLength(e, t));
      },
      nonempty(e) {
        return this.check(pt.minLength(1, e));
      },
      max(e, t) {
        return this.check(pt.maxLength(e, t));
      },
      length(e, t) {
        return this.check(pt.length(e, t));
      },
      unwrap() {
        return this.element;
      },
    },
  );
  function xh(e, t) {
    return R._array(v.ZodArray, e, t);
  }
  function S7(e) {
    let shape = e._zod.def.shape;
    return ub(Object.keys(shape));
  }
  v.ZodObject = R.$constructor(
    "ZodObject",
    (e, t) => {
      (na(),
        R.$ZodObjectJIT.init(e, t),
        v.ZodType.init(e, t),
        (e._zod.processJSONSchema = (n, o, r) => Xe.objectProcessor(e, n, o, r)),
        de.util.installLazyProp(e, "shape", (n) => n._zod.def.shape, !1));
    },
    {
      keyof() {
        return ub(Object.keys(this._zod.def.shape));
      },
      catchall(e) {
        return this.clone(de.util.mergeDefs(this._zod.def, { catchall: e }));
      },
      passthrough() {
        return this.clone(de.util.mergeDefs(this._zod.def, { catchall: sc() }));
      },
      loose() {
        return this.clone(de.util.mergeDefs(this._zod.def, { catchall: sc() }));
      },
      strict() {
        return this.clone(de.util.mergeDefs(this._zod.def, { catchall: lb() }));
      },
      strip() {
        return this.clone(de.util.mergeDefs(this._zod.def, { catchall: void 0 }));
      },
      extend(e) {
        return de.util.extend(this, e);
      },
      safeExtend(e) {
        return de.util.safeExtend(this, e);
      },
      merge(e) {
        return de.util.merge(this, e);
      },
      pick(e) {
        return de.util.pick(this, e);
      },
      omit(e) {
        return de.util.omit(this, e);
      },
      partial(...e) {
        return de.util.partial(v.ZodOptional, this, e[0]);
      },
      exactPartial(...e) {
        return de.util.partial(v.ZodExactOptional, this, e[0], "exactPartial");
      },
      required(...e) {
        return de.util.required(v.ZodNonOptional, this, e[0]);
      },
    },
  );
  function k7(e, t) {
    let n = { type: "object", shape: e ?? {}, ...de.util.normalizeParams(t) };
    return new v.ZodObject(n);
  }
  function E7(e, t) {
    return new v.ZodObject({ type: "object", shape: e, catchall: lb(), ...de.util.normalizeParams(t) });
  }
  function P7(e, t) {
    return new v.ZodObject({ type: "object", shape: e, catchall: sc(), ...de.util.normalizeParams(t) });
  }
  v.ZodUnion = R.$constructor("ZodUnion", (e, t) => {
    (R.$ZodUnion.init(e, t),
      v.ZodType.init(e, t),
      (e._zod.processJSONSchema = (n, o, r) => Xe.unionProcessor(e, n, o, r)),
      (e.options = t.options));
  });
  function cb(e, t) {
    return new v.ZodUnion({ type: "union", options: e, ...de.util.normalizeParams(t) });
  }
  v.ZodXor = R.$constructor("ZodXor", (e, t) => {
    (v.ZodUnion.init(e, t),
      R.$ZodXor.init(e, t),
      (e._zod.processJSONSchema = (n, o, r) => Xe.unionProcessor(e, n, o, r)),
      (e.options = t.options));
  });
  function A7(e, t) {
    return new v.ZodXor({ type: "union", options: e, inclusive: !1, ...de.util.normalizeParams(t) });
  }
  v.ZodDiscriminatedUnion = R.$constructor("ZodDiscriminatedUnion", (e, t) => {
    (v.ZodUnion.init(e, t), R.$ZodDiscriminatedUnion.init(e, t));
  });
  function I7(e, t, n) {
    return new v.ZodDiscriminatedUnion({
      type: "union",
      options: t,
      discriminator: e,
      ...de.util.normalizeParams(n),
    });
  }
  v.ZodIntersection = R.$constructor("ZodIntersection", (e, t) => {
    (R.$ZodIntersection.init(e, t),
      v.ZodType.init(e, t),
      (e._zod.processJSONSchema = (n, o, r) => Xe.intersectionProcessor(e, n, o, r)));
  });
  function bT(e, t) {
    return new v.ZodIntersection({ type: "intersection", left: e, right: t });
  }
  v.ZodTuple = R.$constructor(
    "ZodTuple",
    (e, t) => {
      (na(),
        R.$ZodTuple.init(e, t),
        v.ZodType.init(e, t),
        (e._zod.processJSONSchema = (n, o, r) => Xe.tupleProcessor(e, n, o, r)));
    },
    {
      rest(e) {
        return this.clone({ ...this._zod.def, rest: e });
      },
      partial() {
        let def = this._zod.def;
        if (def.checks?.length)
          throw Error(".partial() cannot be used on tuple schemas containing refinements");
        return this.clone({
          ...def,
          items: def.items.map((item) => new v.ZodOptional({ type: "optional", innerType: item })),
        });
      },
    },
  );
  function vT(e, t, n) {
    let o = t instanceof R.$ZodType,
      r = o ? n : t,
      s = o ? t : null;
    return new v.ZodTuple({ type: "tuple", items: e, rest: s, ...de.util.normalizeParams(r) });
  }
  v.ZodRecord = R.$constructor("ZodRecord", (e, t) => {
    (na(),
      R.$ZodRecord.init(e, t),
      v.ZodType.init(e, t),
      (e._zod.processJSONSchema = (n, o, r) => Xe.recordProcessor(e, n, o, r)),
      (e.keyType = t.keyType),
      (e.valueType = t.valueType));
  });
  function wT(e, t, n) {
    if (!t || !t._zod)
      return new v.ZodRecord({ type: "record", keyType: Th(), valueType: e, ...de.util.normalizeParams(t) });
    return new v.ZodRecord({ type: "record", keyType: e, valueType: t, ...de.util.normalizeParams(n) });
  }
  function C7(e, t, n) {
    return new v.ZodRecord({
      type: "record",
      keyType: e,
      valueType: t,
      ...de.util.normalizeParams(n),
      partial: !0,
    });
  }
  function T7(e, t, n) {
    return new v.ZodRecord({
      type: "record",
      keyType: e,
      valueType: t,
      mode: "loose",
      ...de.util.normalizeParams(n),
    });
  }
  v.ZodMap = R.$constructor("ZodMap", (e, t) => {
    (na(),
      R.$ZodMap.init(e, t),
      v.ZodType.init(e, t),
      (e._zod.processJSONSchema = (n, o, r) => Xe.mapProcessor(e, n, o, r)),
      (e.keyType = t.keyType),
      (e.valueType = t.valueType),
      (e.min = (...n) => e.check(R._minSize(...n))),
      (e.nonempty = (n) => e.check(R._minSize(1, n))),
      (e.max = (...n) => e.check(R._maxSize(...n))),
      (e.size = (...n) => e.check(R._size(...n))));
  });
  function $7(e, t, n) {
    return new v.ZodMap({ type: "map", keyType: e, valueType: t, ...de.util.normalizeParams(n) });
  }
  v.ZodSet = R.$constructor("ZodSet", (e, t) => {
    (na(),
      R.$ZodSet.init(e, t),
      v.ZodType.init(e, t),
      (e._zod.processJSONSchema = (n, o, r) => Xe.setProcessor(e, n, o, r)),
      (e.min = (...n) => e.check(R._minSize(...n))),
      (e.nonempty = (n) => e.check(R._minSize(1, n))),
      (e.max = (...n) => e.check(R._maxSize(...n))),
      (e.size = (...n) => e.check(R._size(...n))));
  });
  function R7(e, t) {
    return new v.ZodSet({ type: "set", valueType: e, ...de.util.normalizeParams(t) });
  }
  v.ZodEnum = R.$constructor("ZodEnum", (e, t) => {
    (R.$ZodEnum.init(e, t),
      v.ZodType.init(e, t),
      (e._zod.processJSONSchema = (o, r, s) => Xe.enumProcessor(e, o, r, s)),
      (e.enum = t.entries),
      (e.options = [...e._zod.values]));
    let n = new Set(Object.keys(t.entries));
    ((e.extract = (o, r) => {
      let s = {};
      for (let a of o)
        if (n.has(a)) s[a] = t.entries[a];
        else throw Error(`Key ${a} not found in enum`);
      return new v.ZodEnum({ ...t, checks: [], ...de.util.normalizeParams(r), entries: s });
    }),
      (e.exclude = (o, r) => {
        let s = { ...t.entries };
        for (let a of o)
          if (n.has(a)) delete s[a];
          else throw Error(`Key ${a} not found in enum`);
        return new v.ZodEnum({ ...t, checks: [], ...de.util.normalizeParams(r), entries: s });
      }));
  });
  function ub(e, t) {
    let n = Array.isArray(e) ? Object.fromEntries(e.map((o) => [o, o])) : e;
    return new v.ZodEnum({ type: "enum", entries: n, ...de.util.normalizeParams(t) });
  }
  function D7(e, t) {
    return new v.ZodEnum({ type: "enum", entries: e, ...de.util.normalizeParams(t) });
  }
  v.ZodLiteral = R.$constructor("ZodLiteral", (e, t) => {
    (R.$ZodLiteral.init(e, t),
      v.ZodType.init(e, t),
      (e._zod.processJSONSchema = (n, o, r) => Xe.literalProcessor(e, n, o, r)),
      (e.values = new Set(t.values)),
      Object.defineProperty(e, "value", {
        get() {
          if (t.values.length > 1)
            throw Error("This schema contains multiple valid literal values. Use `.values` instead.");
          return t.values[0];
        },
      }));
  });
  function M7(e, t) {
    return new v.ZodLiteral({
      type: "literal",
      values: Array.isArray(e) ? e : [e],
      ...de.util.normalizeParams(t),
    });
  }
  v.ZodFile = R.$constructor("ZodFile", (e, t) => {
    (R.$ZodFile.init(e, t),
      v.ZodType.init(e, t),
      (e._zod.processJSONSchema = (n, o, r) => Xe.fileProcessor(e, n, o, r)),
      (e.min = (n, o) => e.check(R._minSize(n, o))),
      (e.max = (n, o) => e.check(R._maxSize(n, o))),
      (e.mime = (n, o) => e.check(R._mime(Array.isArray(n) ? n : [n], o))));
  });
  function j7(e) {
    return R._file(v.ZodFile, e);
  }
  v.ZodTransform = R.$constructor("ZodTransform", (e, t) => {
    (na(),
      R.$ZodTransform.init(e, t),
      v.ZodType.init(e, t),
      (e._zod.processJSONSchema = (n, o, r) => Xe.transformProcessor(e, n, o, r)),
      (e._zod.parse = (n, o) => {
        if (o.direction === "backward") throw new R.$ZodEncodeError(e.constructor.name);
        n.addIssue = (s) => {
          if (typeof s === "string") n.issues.push(de.util.issue(s, n.value, t));
          else {
            let a = s;
            if (a.fatal) a.continue = !1;
            if ((a.code ?? (a.code = "custom"), !("input" in a))) a.input = n.value;
            (a.inst ?? (a.inst = e), n.issues.push(de.util.issue(a)));
          }
        };
        let transform = t.transform(n.value, n);
        if (transform instanceof Promise) return transform.then((s) => ((n.value = s), n));
        return ((n.value = transform), n);
      }));
  });
  function db(e) {
    return new v.ZodTransform({ type: "transform", transform: e });
  }
  v.ZodOptional = R.$constructor("ZodOptional", (e, t) => {
    (R.$ZodOptional.init(e, t),
      v.ZodType.init(e, t),
      (e._zod.processJSONSchema = (n, o, r) => Xe.optionalProcessor(e, n, o, r)),
      (e.unwrap = () => e._zod.def.innerType));
  });
  function Rh(e) {
    return new v.ZodOptional({ type: "optional", innerType: e });
  }
  v.ZodExactOptional = R.$constructor("ZodExactOptional", (e, t) => {
    (R.$ZodExactOptional.init(e, t),
      v.ZodType.init(e, t),
      (e._zod.processJSONSchema = (n, o, r) => Xe.optionalProcessor(e, n, o, r)),
      (e.unwrap = () => e._zod.def.innerType));
  });
  function OT(e) {
    return new v.ZodExactOptional({ type: "optional", innerType: e });
  }
  v.ZodNullable = R.$constructor("ZodNullable", (e, t) => {
    (R.$ZodNullable.init(e, t),
      v.ZodType.init(e, t),
      (e._zod.processJSONSchema = (n, o, r) => Xe.nullableProcessor(e, n, o, r)),
      (e.unwrap = () => e._zod.def.innerType));
  });
  function Dh(e) {
    return new v.ZodNullable({ type: "nullable", innerType: e });
  }
  function x7(e) {
    return Rh(Dh(e));
  }
  v.ZodDefault = R.$constructor("ZodDefault", (e, t) => {
    (R.$ZodDefault.init(e, t),
      v.ZodType.init(e, t),
      (e._zod.processJSONSchema = (n, o, r) => Xe.defaultProcessor(e, n, o, r)),
      (e.unwrap = () => e._zod.def.innerType),
      (e.removeDefault = e.unwrap));
  });
  function ST(e, t) {
    return new v.ZodDefault({
      type: "default",
      innerType: e,
      get defaultValue() {
        return typeof t === "function" ? t() : de.util.shallowClone(t);
      },
    });
  }
  v.ZodPrefault = R.$constructor("ZodPrefault", (e, t) => {
    (R.$ZodPrefault.init(e, t),
      v.ZodType.init(e, t),
      (e._zod.processJSONSchema = (n, o, r) => Xe.prefaultProcessor(e, n, o, r)),
      (e.unwrap = () => e._zod.def.innerType));
  });
  function kT(e, t) {
    return new v.ZodPrefault({
      type: "prefault",
      innerType: e,
      get defaultValue() {
        return typeof t === "function" ? t() : de.util.shallowClone(t);
      },
    });
  }
  v.ZodNonOptional = R.$constructor("ZodNonOptional", (e, t) => {
    (R.$ZodNonOptional.init(e, t),
      v.ZodType.init(e, t),
      (e._zod.processJSONSchema = (n, o, r) => Xe.nonoptionalProcessor(e, n, o, r)),
      (e.unwrap = () => e._zod.def.innerType));
  });
  function ET(e, t) {
    return new v.ZodNonOptional({ type: "nonoptional", innerType: e, ...de.util.normalizeParams(t) });
  }
  v.ZodSuccess = R.$constructor("ZodSuccess", (e, t) => {
    (R.$ZodSuccess.init(e, t),
      v.ZodType.init(e, t),
      (e._zod.processJSONSchema = (n, o, r) => Xe.successProcessor(e, n, o, r)),
      (e.unwrap = () => e._zod.def.innerType));
  });
  function L7(e) {
    return new v.ZodSuccess({ type: "success", innerType: e });
  }
  v.ZodCatch = R.$constructor("ZodCatch", (e, t) => {
    (R.$ZodCatch.init(e, t),
      v.ZodType.init(e, t),
      (e._zod.processJSONSchema = (n, o, r) => Xe.catchProcessor(e, n, o, r)),
      (e.unwrap = () => e._zod.def.innerType),
      (e.removeCatch = e.unwrap));
  });
  function PT(e, t) {
    return new v.ZodCatch({
      type: "catch",
      innerType: e,
      catchValue: typeof t === "function" ? t : R.util.constantCatch(t),
    });
  }
  v.ZodNaN = R.$constructor("ZodNaN", (e, t) => {
    (R.$ZodNaN.init(e, t),
      v.ZodType.init(e, t),
      (e._zod.processJSONSchema = (n, o, r) => Xe.nanProcessor(e, n, o, r)));
  });
  function N7(e) {
    return R._nan(v.ZodNaN, e);
  }
  v.ZodPipe = R.$constructor("ZodPipe", (e, t) => {
    (R.$ZodPipe.init(e, t),
      v.ZodType.init(e, t),
      (e._zod.processJSONSchema = (n, o, r) => Xe.pipeProcessor(e, n, o, r)),
      (e.in = t.in),
      (e.out = t.out));
  });
  function ab(e, t) {
    return new v.ZodPipe({ type: "pipe", in: e, out: t });
  }
  v.ZodCodec = R.$constructor("ZodCodec", (e, t) => {
    (v.ZodPipe.init(e, t), R.$ZodCodec.init(e, t));
  });
  function U7(e, t, n) {
    return new v.ZodCodec({ type: "pipe", in: e, out: t, transform: n.decode, reverseTransform: n.encode });
  }
  function z7(e) {
    let def = e._zod.def;
    return new v.ZodCodec({
      type: "pipe",
      in: def.out,
      out: def.in,
      transform: def.reverseTransform,
      reverseTransform: def.transform,
    });
  }
  v.ZodPreprocess = R.$constructor("ZodPreprocess", (e, t) => {
    (v.ZodPipe.init(e, t), R.$ZodPreprocess.init(e, t));
  });
  v.ZodReadonly = R.$constructor("ZodReadonly", (e, t) => {
    (R.$ZodReadonly.init(e, t),
      v.ZodType.init(e, t),
      (e._zod.processJSONSchema = (n, o, r) => Xe.readonlyProcessor(e, n, o, r)),
      (e.unwrap = () => e._zod.def.innerType));
  });
  function AT(e) {
    return new v.ZodReadonly({ type: "readonly", innerType: e });
  }
  v.ZodTemplateLiteral = R.$constructor("ZodTemplateLiteral", (e, t) => {
    (R.$ZodTemplateLiteral.init(e, t),
      v.ZodType.init(e, t),
      (e._zod.processJSONSchema = (n, o, r) => Xe.templateLiteralProcessor(e, n, o, r)));
  });
  function F7(e, t) {
    return new v.ZodTemplateLiteral({ type: "template_literal", parts: e, ...de.util.normalizeParams(t) });
  }
  v.ZodLazy = R.$constructor("ZodLazy", (e, t) => {
    (R.$ZodLazy.init(e, t),
      v.ZodType.init(e, t),
      (e._zod.processJSONSchema = (n, o, r) => Xe.lazyProcessor(e, n, o, r)),
      (e.unwrap = () => e._zod.def.getter()));
  });
  function IT(e) {
    return new v.ZodLazy({ type: "lazy", getter: e });
  }
  v.ZodPromise = R.$constructor("ZodPromise", (e, t) => {
    (R.$ZodPromise.init(e, t),
      v.ZodType.init(e, t),
      (e._zod.processJSONSchema = (n, o, r) => Xe.promiseProcessor(e, n, o, r)),
      (e.unwrap = () => e._zod.def.innerType));
  });
  function B7(e) {
    return new v.ZodPromise({ type: "promise", innerType: e });
  }
  v.ZodFunction = R.$constructor("ZodFunction", (e, t) => {
    (R.$ZodFunction.init(e, t),
      v.ZodType.init(e, t),
      (e._zod.processJSONSchema = (n, o, r) => Xe.functionProcessor(e, n, o, r)));
  });
  function Lh(e) {
    return new v.ZodFunction({
      type: "function",
      input: Array.isArray(e?.input) ? vT(e?.input) : (e?.input ?? xh(sc())),
      output: e?.output ?? sc(),
    });
  }
  v.ZodCustom = R.$constructor("ZodCustom", (e, t) => {
    (R.$ZodCustom.init(e, t),
      v.ZodType.init(e, t),
      (e._zod.processJSONSchema = (n, o, r) => Xe.customProcessor(e, n, o, r)));
  });
  v.ZodProperties = R.$constructor("ZodProperties", (e, t) => {
    (na(), R.$ZodProperties.init(e, t), v.ZodType.init(e, t));
  });
  function CT(e, t) {
    return R._properties(v.ZodProperties, e, t);
  }
  function H7(e) {
    let t = new R.$ZodCheck({ check: "custom" });
    return ((t._zod.check = e), t);
  }
  function K7(e, t) {
    return R._custom(v.ZodCustom, e ?? (() => !0), t);
  }
  function TT(e, t = {}) {
    return R._refine(v.ZodCustom, e, t);
  }
  function $T(e, t) {
    return R._superRefine(e, t);
  }
  v.describe = R.describe;
  v.meta = R.meta;
  v.ZodInstanceOf = R.$constructor(
    "ZodInstanceOf",
    (e, t) => {
      v.ZodCustom.init(e, t);
    },
    {
      properties(e, t) {
        return this.check(CT(e, t));
      },
    },
  );
  function Z7(e, t = {}) {
    let n = new v.ZodInstanceOf({
      type: "custom",
      check: "custom",
      fn: (o) => o instanceof e,
      abort: !0,
      ...de.util.normalizeParams(t),
    });
    return (
      (n._zod.bag.Class = e),
      (n._zod.check = (o) => {
        if (!(o.value instanceof e))
          o.issues.push({
            code: "invalid_type",
            expected: e.name,
            input: o.value,
            inst: n,
            path: [...(n._zod.def.path ?? [])],
          });
      }),
      n
    );
  }
  var V7 = (...e) => R._stringbool({ Codec: v.ZodCodec, Boolean: v.ZodBoolean, String: v.ZodString }, ...e);
  v.stringbool = V7;
  function q7(e) {
    let t = IT(() => cb([Th(e), gT(), yT(), _T(), xh(t), wT(Th(), t)]));
    return t;
  }
  function G7(e, t) {
    return new v.ZodPreprocess({ type: "pipe", in: db(e), out: t });
  }
  (function () {
    var ownPropertyNames = Object.getOwnPropertyNames(v);
    for (var t = 0; t < ownPropertyNames.length; t++) {
      var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(v, ownPropertyNames[t]);
      if (!ownPropertyDescriptor || !ownPropertyDescriptor.get || !ownPropertyDescriptor.configurable)
        continue;
      var o;
      try {
        o = ownPropertyDescriptor.get();
      } catch (error) {
        continue;
      }
      if (o === void 0) continue;
      Object.defineProperty(v, ownPropertyNames[t], {
        value: o,
        writable: !1,
        enumerable: ownPropertyDescriptor.enumerable,
        configurable: !1,
      });
    }
    Object.freeze(v);
  })();
});

export { ra };
