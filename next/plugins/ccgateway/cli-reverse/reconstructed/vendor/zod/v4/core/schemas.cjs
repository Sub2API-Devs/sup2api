/**
 * zod/v4/core/schemas.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_checks } from "./checks.cjs";
import { require_core } from "./core.cjs";
import { require_doc } from "./doc.cjs";
import { require_parse } from "./parse.cjs";
import { require_regexes } from "./regexes.cjs";
import { require_util } from "./util.cjs";
import { require_versions } from "./versions.cjs";

//@ chunk-1ny7cxrt.js:134598-181402 cjs-fingerprint
var require_schemas = __commonJS(function (cjsExports) {
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
  cjsExports.$ZodObject =
    cjsExports.$ZodArray =
    cjsExports.$ZodDate =
    cjsExports.$ZodVoid =
    cjsExports.$ZodNever =
    cjsExports.$ZodUnknown =
    cjsExports.$ZodAny =
    cjsExports.$ZodNull =
    cjsExports.$ZodUndefined =
    cjsExports.$ZodSymbol =
    cjsExports.$ZodBigIntFormat =
    cjsExports.$ZodBigInt =
    cjsExports.$ZodBoolean =
    cjsExports.$ZodNumberFormat =
    cjsExports.$ZodNumber =
    cjsExports.$ZodCustomStringFormat =
    cjsExports.$ZodJWT =
    cjsExports.$ZodIBAN =
    cjsExports.$ZodCreditCard =
    cjsExports.$ZodE164 =
    cjsExports.$ZodBase64URL =
    cjsExports.base64urlCharset =
    cjsExports.$ZodBase64 =
    cjsExports.base64Charset =
    cjsExports.$ZodCIDRv6 =
    cjsExports.$ZodCIDRv4 =
    cjsExports.$ZodMAC =
    cjsExports.$ZodIPv6 =
    cjsExports.$ZodIPv4 =
    cjsExports.$ZodISODuration =
    cjsExports.$ZodISOTime =
    cjsExports.$ZodISODate =
    cjsExports.$ZodISODateTime =
    cjsExports.$ZodKSUID =
    cjsExports.$ZodXID =
    cjsExports.$ZodULID =
    cjsExports.$ZodCUID2 =
    cjsExports.$ZodCUID =
    cjsExports.$ZodNanoID =
    cjsExports.$ZodEmoji =
    cjsExports.$ZodURL =
    cjsExports.URL_UNPARSEABLE =
    cjsExports.URL_BAD_FORMAT =
    cjsExports.$ZodEmail =
    cjsExports.$ZodUUID =
    cjsExports.$ZodGUID =
    cjsExports.$ZodStringFormat =
    cjsExports.$ZodString =
    cjsExports.clone =
    cjsExports.$ZodType =
      undefined;
  cjsExports.$ZodProperties =
    cjsExports.$ZodCustom =
    cjsExports.$ZodLazy =
    cjsExports.$ZodPromise =
    cjsExports.$ZodFunction =
    cjsExports.$ZodTemplateLiteral =
    cjsExports.$ZodReadonly =
    cjsExports.$ZodPreprocess =
    cjsExports.$ZodCodec =
    cjsExports.$ZodPipe =
    cjsExports.$ZodNaN =
    cjsExports.$ZodCatch =
    cjsExports.$ZodSuccess =
    cjsExports.$ZodNonOptional =
    cjsExports.$ZodPrefault =
    cjsExports.$ZodDefault =
    cjsExports.$ZodNullable =
    cjsExports.$ZodExactOptional =
    cjsExports.$ZodOptional =
    cjsExports.$ZodTransform =
    cjsExports.$ZodFile =
    cjsExports.$ZodLiteral =
    cjsExports.$ZodEnum =
    cjsExports.$ZodSet =
    cjsExports.$ZodMap =
    cjsExports.$ZodRecord =
    cjsExports.$ZodTuple =
    cjsExports.$ZodIntersection =
    cjsExports.$ZodDiscriminatedUnion =
    cjsExports.$ZodXor =
    cjsExports.$ZodUnion =
    cjsExports.$ZodObjectJIT =
      undefined;
  cjsExports.standardProps = standardProps;
  cjsExports.parseURLObject = parseURLObject;
  cjsExports.stripTabAndNewline = stripTabAndNewline;
  cjsExports.urlHostnameOk = urlHostnameOk;
  cjsExports.urlProtocolOk = urlProtocolOk;
  cjsExports.isValidIPv6 = isValidIPv6;
  cjsExports.isValidCIDRv6 = isValidCIDRv6;
  cjsExports.isValidBase64 = isValidBase64;
  cjsExports.isValidBase64URL = isValidBase64URL;
  cjsExports.isValidCreditCard = isValidCreditCard;
  cjsExports.isValidIBAN = isValidIBAN;
  cjsExports.isValidJWT = isValidJWT;
  cjsExports.getDiscriminatedOption = getDiscriminatedOption;
  cjsExports.mergeValues = mergeValues;
  var checks = __importStar(require_checks());
  var core = __importStar(require_core());
  var doc_js_1 = require_doc();
  var parse_js_1 = require_parse();
  var regexes = __importStar(require_regexes());
  var util = __importStar(require_util());
  var versions_js_1 = require_versions();
  cjsExports.$ZodType = core.$constructor(
    "$ZodType",
    (inst, def) => {
      var _a;
      inst ?? (inst = {});
      inst._zod.def = def;
      inst._zod.bag = inst._zod.bag || {};
      inst._zod.version = versions_js_1.version;
      let defChecks = inst._zod.def.checks;
      let checks = inst._zod.traits.has("$ZodCheck")
        ? [inst, ...(defChecks ?? [])]
        : defChecks?.length
          ? [...defChecks]
          : [];
      for (let ch of checks) for (let fn of ch._zod.onattach) fn(inst);
      if (checks.length === 0) {
        (_a = inst._zod).deferred ?? (_a.deferred = []);
        inst._zod.deferred?.push(() => {
          inst._zod.run = inst._zod.parse;
        });
      } else {
        let runChecks = (payload, checks, ctx) => {
          if (payload.memo) return payload;
          let isAborted = util.aborted(payload);
          let asyncResult;
          for (let ch of checks) {
            if (ch._zod.def.when) {
              if (util.explicitlyAborted(payload)) continue;
              if (!ch._zod.def.when(payload)) continue;
            } else if (isAborted) continue;
            let currLen = payload.issues.length;
            let _ = ch._zod.check(payload);
            if (_ instanceof Promise && ctx?.async === false) throw new core.$ZodAsyncError();
            if (asyncResult || _ instanceof Promise)
              asyncResult = (asyncResult ?? Promise.resolve()).then(async () => {
                await _;
                if (payload.issues.length === currLen) return;
                util.attachSchema(payload.issues, currLen, inst);
                if (!isAborted) isAborted = util.aborted(payload, currLen);
              });
            else {
              if (payload.issues.length === currLen) continue;
              util.attachSchema(payload.issues, currLen, inst);
              if (!isAborted) isAborted = util.aborted(payload, currLen);
            }
          }
          if (asyncResult) return asyncResult.then(() => payload);
          return payload;
        };
        let handleCanaryResult = (canary, payload, ctx) => {
          if (util.aborted(canary)) {
            canary.aborted = true;
            return canary;
          }
          let checkResult = runChecks(payload, checks, ctx);
          if (checkResult instanceof Promise) {
            if (ctx.async === false) throw new core.$ZodAsyncError();
            return checkResult.then((checkResult) => inst._zod.parse(checkResult, ctx));
          }
          return inst._zod.parse(checkResult, ctx);
        };
        inst._zod.run = (payload, ctx) => {
          if (ctx.skipChecks) return inst._zod.parse(payload, ctx);
          if (ctx.direction === "backward") {
            let canary = inst._zod.parse(
              {
                value: payload.value,
                issues: [],
              },
              {
                ...ctx,
                skipChecks: true,
              },
            );
            if (canary instanceof Promise)
              return canary.then((canary) => handleCanaryResult(canary, payload, ctx));
            return handleCanaryResult(canary, payload, ctx);
          }
          let result = inst._zod.parse(payload, ctx);
          if (result instanceof Promise) {
            if (ctx.async === false) throw new core.$ZodAsyncError();
            return result.then((result) => runChecks(result, checks, ctx));
          }
          return runChecks(result, checks, ctx);
        };
      }
    },
    {
      get "~standard"() {
        return util.hide(this, "~standard", standardProps(this));
      },
      set "~standard"(value) {
        util.own(this, "~standard", value);
      },
    },
  );
  var toStandardResult = (r, ctx) =>
    r.issues.length
      ? {
          issues: r.issues.map((iss) => util.finalizeIssue(iss, ctx, core.config())),
        }
      : {
          value: r.value,
        };
  async function validateAsync(inst, value) {
    let ctx = {
      async: true,
    };
    return toStandardResult(
      await inst._zod.run(
        {
          value,
          issues: [],
        },
        ctx,
      ),
      ctx,
    );
  }
  function standardProps(inst) {
    return {
      validate: (value) => {
        let ctx = {
          async: false,
        };
        try {
          let r = inst._zod.run(
            {
              value,
              issues: [],
            },
            ctx,
          );
          if (!(r instanceof Promise)) return toStandardResult(r, ctx);
        } catch (_) {}
        return validateAsync(inst, value);
      },
      vendor: "zod",
      version: 1,
    };
  }
  var util_js_1 = require_util();
  Object.defineProperty(cjsExports, "clone", {
    enumerable: true,
    get: function () {
      return util_js_1.clone;
    },
  });
  cjsExports.$ZodString = core.$constructor("$ZodString", (inst, def) => {
    cjsExports.$ZodType.init(inst, def);
    inst._zod.pattern = def.pattern ?? regexes.anyString;
    inst._zod.parse = (payload, _) => {
      if (def.coerce)
        try {
          payload.value = String(payload.value);
        } catch (_) {}
      if (typeof payload.value === "string") return payload;
      payload.issues.push({
        expected: "string",
        code: "invalid_type",
        input: payload.value,
        inst,
      });
      return payload;
    };
  });
  cjsExports.$ZodStringFormat = core.$constructor("$ZodStringFormat", (inst, def) => {
    checks.$ZodCheckStringFormat.init(inst, def);
    cjsExports.$ZodString.init(inst, def);
  });
  cjsExports.$ZodGUID = core.$constructor("$ZodGUID", (inst, def) => {
    def.pattern ?? (def.pattern = regexes.guid);
    cjsExports.$ZodStringFormat.init(inst, def);
  });
  cjsExports.$ZodUUID = core.$constructor("$ZodUUID", (inst, def) => {
    if (def.version) {
      let v = {
        v1: 1,
        v2: 2,
        v3: 3,
        v4: 4,
        v5: 5,
        v6: 6,
        v7: 7,
        v8: 8,
      }[def.version];
      if (v === undefined) throw Error(`Invalid UUID version: "${def.version}"`);
      def.pattern ?? (def.pattern = regexes.uuid(v));
    } else def.pattern ?? (def.pattern = regexes.uuid());
    cjsExports.$ZodStringFormat.init(inst, def);
  });
  cjsExports.$ZodEmail = core.$constructor("$ZodEmail", (inst, def) => {
    def.pattern ?? (def.pattern = regexes.email);
    cjsExports.$ZodStringFormat.init(inst, def);
  });
  cjsExports.URL_BAD_FORMAT = 1;
  cjsExports.URL_UNPARSEABLE = 2;
  function parseURLObject(trimmed, def) {
    if (
      !def.normalize &&
      def.protocol?.source === regexes.httpProtocol.source &&
      !/^https?:\/\//i.test(trimmed)
    )
      return cjsExports.URL_BAD_FORMAT;
    try {
      return new URL(trimmed);
    } catch {
      return cjsExports.URL_UNPARSEABLE;
    }
  }
  var asciiTabOrNewline = /[\t\n\r]/g;
  function stripTabAndNewline(value) {
    return value.replace(asciiTabOrNewline, "");
  }
  function urlHostnameOk(url, hostname) {
    hostname.lastIndex = 0;
    return hostname.test(url.hostname);
  }
  function urlProtocolOk(url, protocol) {
    protocol.lastIndex = 0;
    return protocol.test(url.protocol.endsWith(":") ? url.protocol.slice(0, -1) : url.protocol);
  }
  cjsExports.$ZodURL = core.$constructor("$ZodURL", (inst, def) => {
    cjsExports.$ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      try {
        let trimmed = payload.value.trim();
        let url = parseURLObject(trimmed, def);
        if (url === cjsExports.URL_BAD_FORMAT) {
          payload.issues.push({
            code: "invalid_format",
            format: "url",
            note: "Invalid URL format",
            input: payload.value,
            inst,
            continue: !def.abort,
          });
          return;
        }
        if (url === cjsExports.URL_UNPARSEABLE) {
          payload.issues.push({
            code: "invalid_format",
            format: "url",
            input: payload.value,
            inst,
            continue: !def.abort,
          });
          return;
        }
        if (def.hostname && !urlHostnameOk(url, def.hostname))
          payload.issues.push({
            code: "invalid_format",
            format: "url",
            note: "Invalid hostname",
            pattern: def.hostname.source,
            input: payload.value,
            inst,
            continue: !def.abort,
          });
        if (def.protocol && !urlProtocolOk(url, def.protocol))
          payload.issues.push({
            code: "invalid_format",
            format: "url",
            note: "Invalid protocol",
            pattern: def.protocol.source,
            input: payload.value,
            inst,
            continue: !def.abort,
          });
        payload.value = def.normalize ? url.href : stripTabAndNewline(trimmed);
        return;
      } catch (_) {
        payload.issues.push({
          code: "invalid_format",
          format: "url",
          input: payload.value,
          inst,
          continue: !def.abort,
        });
      }
    };
  });
  cjsExports.$ZodEmoji = core.$constructor("$ZodEmoji", (inst, def) => {
    def.pattern ?? (def.pattern = regexes.emoji());
    cjsExports.$ZodStringFormat.init(inst, def);
  });
  cjsExports.$ZodNanoID = core.$constructor("$ZodNanoID", (inst, def) => {
    if (def.length !== undefined && (!Number.isInteger(def.length) || def.length < 1))
      throw Error(`Invalid nanoid length: ${def.length}`);
    def.pattern ??
      (def.pattern = def.length === undefined ? regexes.nanoid : regexes.nanoidOfLength(def.length));
    cjsExports.$ZodStringFormat.init(inst, def);
  });
  cjsExports.$ZodCUID = core.$constructor("$ZodCUID", (inst, def) => {
    def.pattern ?? (def.pattern = regexes.cuid);
    cjsExports.$ZodStringFormat.init(inst, def);
  });
  cjsExports.$ZodCUID2 = core.$constructor("$ZodCUID2", (inst, def) => {
    def.pattern ?? (def.pattern = regexes.cuid2);
    cjsExports.$ZodStringFormat.init(inst, def);
  });
  cjsExports.$ZodULID = core.$constructor("$ZodULID", (inst, def) => {
    def.pattern ?? (def.pattern = regexes.ulid);
    cjsExports.$ZodStringFormat.init(inst, def);
  });
  cjsExports.$ZodXID = core.$constructor("$ZodXID", (inst, def) => {
    def.pattern ?? (def.pattern = regexes.xid);
    cjsExports.$ZodStringFormat.init(inst, def);
  });
  cjsExports.$ZodKSUID = core.$constructor("$ZodKSUID", (inst, def) => {
    def.pattern ?? (def.pattern = regexes.ksuid);
    cjsExports.$ZodStringFormat.init(inst, def);
  });
  cjsExports.$ZodISODateTime = core.$constructor("$ZodISODateTime", (inst, def) => {
    def.pattern ?? (def.pattern = regexes.datetime(def));
    cjsExports.$ZodStringFormat.init(inst, def);
  });
  cjsExports.$ZodISODate = core.$constructor("$ZodISODate", (inst, def) => {
    def.pattern ?? (def.pattern = regexes.date);
    cjsExports.$ZodStringFormat.init(inst, def);
  });
  cjsExports.$ZodISOTime = core.$constructor("$ZodISOTime", (inst, def) => {
    def.pattern ?? (def.pattern = regexes.time(def));
    cjsExports.$ZodStringFormat.init(inst, def);
  });
  cjsExports.$ZodISODuration = core.$constructor("$ZodISODuration", (inst, def) => {
    def.pattern ?? (def.pattern = regexes.duration);
    cjsExports.$ZodStringFormat.init(inst, def);
  });
  cjsExports.$ZodIPv4 = core.$constructor("$ZodIPv4", (inst, def) => {
    def.pattern ?? (def.pattern = regexes.ipv4);
    cjsExports.$ZodStringFormat.init(inst, def);
  });
  var ipv6Alphabet = /^[0-9a-fA-F:.]+$/;
  function isValidIPv6(value) {
    if (!ipv6Alphabet.test(value)) return false;
    try {
      new URL(`http://[${value}]`);
      return true;
    } catch {
      return false;
    }
  }
  cjsExports.$ZodIPv6 = core.$constructor("$ZodIPv6", (inst, def) => {
    def.pattern ?? (def.pattern = regexes.ipv6);
    cjsExports.$ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      if (!isValidIPv6(payload.value))
        payload.issues.push({
          code: "invalid_format",
          format: "ipv6",
          input: payload.value,
          inst,
          continue: !def.abort,
        });
    };
  });
  cjsExports.$ZodMAC = core.$constructor("$ZodMAC", (inst, def) => {
    def.pattern ?? (def.pattern = regexes.mac(def.delimiter));
    cjsExports.$ZodStringFormat.init(inst, def);
  });
  cjsExports.$ZodCIDRv4 = core.$constructor("$ZodCIDRv4", (inst, def) => {
    def.pattern ?? (def.pattern = regexes.cidrv4);
    cjsExports.$ZodStringFormat.init(inst, def);
  });
  function isValidCIDRv6(value) {
    let parts = value.split("/");
    if (parts.length !== 2) return false;
    let [address, prefix] = parts;
    if (!prefix) return false;
    let prefixNum = Number(prefix);
    if (`${prefixNum}` !== prefix) return false;
    if (prefixNum < 0 || prefixNum > 128) return false;
    return isValidIPv6(address);
  }
  cjsExports.$ZodCIDRv6 = core.$constructor("$ZodCIDRv6", (inst, def) => {
    def.pattern ?? (def.pattern = regexes.cidrv6);
    cjsExports.$ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      if (!isValidCIDRv6(payload.value))
        payload.issues.push({
          code: "invalid_format",
          format: "cidrv6",
          input: payload.value,
          inst,
          continue: !def.abort,
        });
    };
  });
  function isValidBase64(data) {
    if (data === "") return true;
    if (/\s/.test(data)) return false;
    if (data.length % 4 !== 0) return false;
    try {
      atob(data);
      return true;
    } catch {
      return false;
    }
  }
  cjsExports.base64Charset = /^[0-9a-zA-Z+/]*={0,2}$/;
  cjsExports.$ZodBase64 = core.$constructor("$ZodBase64", (inst, def) => {
    def.pattern ?? (def.pattern = cjsExports.base64Charset);
    cjsExports.$ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      if (isValidBase64(payload.value)) return;
      payload.issues.push({
        code: "invalid_format",
        format: "base64",
        input: payload.value,
        inst,
        continue: !def.abort,
      });
    };
  });
  cjsExports.base64urlCharset = /^[A-Za-z0-9_-]*$/;
  function isValidBase64URL(data) {
    if (!cjsExports.base64urlCharset.test(data)) return false;
    let base64 = data.replace(/[-_]/g, (c) => (c === "-" ? "+" : "/"));
    let padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    return isValidBase64(padded);
  }
  cjsExports.$ZodBase64URL = core.$constructor("$ZodBase64URL", (inst, def) => {
    def.pattern ?? (def.pattern = cjsExports.base64urlCharset);
    cjsExports.$ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      if (isValidBase64URL(payload.value)) return;
      payload.issues.push({
        code: "invalid_format",
        format: "base64url",
        input: payload.value,
        inst,
        continue: !def.abort,
      });
    };
  });
  cjsExports.$ZodE164 = core.$constructor("$ZodE164", (inst, def) => {
    def.pattern ?? (def.pattern = regexes.e164);
    cjsExports.$ZodStringFormat.init(inst, def);
  });
  var CC_SANITIZE = /[- ]/g;
  function isLuhnAlgo(digits) {
    let length = digits.length;
    let bit = 1;
    let sum = 0;
    while (length) {
      let value = digits.charCodeAt(--length) - 48;
      bit ^= 1;
      sum += bit ? [0, 2, 4, 6, 8, 1, 3, 5, 7, 9][value] : value;
    }
    return sum % 10 === 0;
  }
  function isValidCreditCard(input) {
    if (!regexes.creditCard.test(input)) return false;
    return isLuhnAlgo(input.replace(CC_SANITIZE, ""));
  }
  cjsExports.$ZodCreditCard = core.$constructor("$ZodCreditCard", (inst, def) => {
    def.pattern ?? (def.pattern = regexes.creditCard);
    cjsExports.$ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      if (isValidCreditCard(payload.value)) return;
      payload.issues.push({
        code: "invalid_format",
        format: "credit_card",
        input: payload.value,
        inst,
        continue: !def.abort,
      });
    };
  });
  function isIso7064Mod97(iban) {
    let remainder = 0;
    let len = iban.length;
    for (let i = 4; i < len; i++) {
      let code = iban.charCodeAt(i);
      remainder = (code >= 65 ? remainder * 100 + (code - 55) : remainder * 10 + (code - 48)) % 97;
    }
    for (let i = 0; i < 4; i++) {
      let code = iban.charCodeAt(i);
      remainder = (code >= 65 ? remainder * 100 + (code - 55) : remainder * 10 + (code - 48)) % 97;
    }
    return remainder === 1;
  }
  function isValidIBAN(input) {
    if (!regexes.iban.test(input)) return false;
    return isIso7064Mod97(input);
  }
  cjsExports.$ZodIBAN = core.$constructor("$ZodIBAN", (inst, def) => {
    def.pattern ?? (def.pattern = regexes.iban);
    cjsExports.$ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      if (isValidIBAN(payload.value)) return;
      payload.issues.push({
        code: "invalid_format",
        format: "iban",
        input: payload.value,
        inst,
        continue: !def.abort,
      });
    };
  });
  function isValidJWT(token, algorithm = null) {
    try {
      let tokensParts = token.split(".");
      if (tokensParts.length !== 3) return false;
      let [header] = tokensParts;
      if (!header) return false;
      let parsedHeader = JSON.parse(atob(header));
      if ("typ" in parsedHeader && parsedHeader?.typ !== "JWT") return false;
      if (!parsedHeader.alg) return false;
      if (algorithm && (!("alg" in parsedHeader) || parsedHeader.alg !== algorithm)) return false;
      return true;
    } catch {
      return false;
    }
  }
  cjsExports.$ZodJWT = core.$constructor("$ZodJWT", (inst, def) => {
    cjsExports.$ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      if (isValidJWT(payload.value, def.alg)) return;
      payload.issues.push({
        code: "invalid_format",
        format: "jwt",
        input: payload.value,
        inst,
        continue: !def.abort,
      });
    };
  });
  cjsExports.$ZodCustomStringFormat = core.$constructor("$ZodCustomStringFormat", (inst, def) => {
    cjsExports.$ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      if (def.fn(payload.value)) return;
      payload.issues.push({
        code: "invalid_format",
        format: def.format,
        input: payload.value,
        inst,
        continue: !def.abort,
      });
    };
  });
  cjsExports.$ZodNumber = core.$constructor("$ZodNumber", (inst, def) => {
    cjsExports.$ZodType.init(inst, def);
    inst._zod.pattern = regexes.number;
    inst._zod.parse = (payload, _ctx) => {
      if (def.coerce)
        try {
          payload.value = Number(payload.value);
        } catch (_) {}
      let input = payload.value;
      if (typeof input === "number" && !Number.isNaN(input) && Number.isFinite(input)) return payload;
      let received =
        typeof input === "number"
          ? Number.isNaN(input)
            ? "NaN"
            : !Number.isFinite(input)
              ? String(input)
              : undefined
          : undefined;
      payload.issues.push({
        expected: "number",
        code: "invalid_type",
        input,
        inst,
        ...(received
          ? {
              received,
            }
          : {}),
      });
      return payload;
    };
  });
  cjsExports.$ZodNumberFormat = core.$constructor("$ZodNumberFormat", (inst, def) => {
    checks.$ZodCheckNumberFormat.init(inst, def);
    cjsExports.$ZodNumber.init(inst, def);
  });
  cjsExports.$ZodBoolean = core.$constructor("$ZodBoolean", (inst, def) => {
    cjsExports.$ZodType.init(inst, def);
    inst._zod.pattern = regexes.boolean;
    inst._zod.parse = (payload, _ctx) => {
      if (def.coerce)
        try {
          payload.value = Boolean(payload.value);
        } catch (_) {}
      let input = payload.value;
      if (typeof input === "boolean") return payload;
      payload.issues.push({
        expected: "boolean",
        code: "invalid_type",
        input,
        inst,
      });
      return payload;
    };
  });
  cjsExports.$ZodBigInt = core.$constructor("$ZodBigInt", (inst, def) => {
    cjsExports.$ZodType.init(inst, def);
    inst._zod.pattern = regexes.bigint;
    inst._zod.parse = (payload, _ctx) => {
      if (def.coerce)
        try {
          payload.value = BigInt(payload.value);
        } catch (_) {}
      if (typeof payload.value === "bigint") return payload;
      payload.issues.push({
        expected: "bigint",
        code: "invalid_type",
        input: payload.value,
        inst,
      });
      return payload;
    };
  });
  cjsExports.$ZodBigIntFormat = core.$constructor("$ZodBigIntFormat", (inst, def) => {
    checks.$ZodCheckBigIntFormat.init(inst, def);
    cjsExports.$ZodBigInt.init(inst, def);
  });
  cjsExports.$ZodSymbol = core.$constructor("$ZodSymbol", (inst, def) => {
    cjsExports.$ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
      let input = payload.value;
      if (typeof input === "symbol") return payload;
      payload.issues.push({
        expected: "symbol",
        code: "invalid_type",
        input,
        inst,
      });
      return payload;
    };
  });
  cjsExports.$ZodUndefined = core.$constructor("$ZodUndefined", (inst, def) => {
    cjsExports.$ZodType.init(inst, def);
    inst._zod.pattern = regexes.undefined;
    inst._zod.values = new Set([undefined]);
    inst._zod.parse = (payload, _ctx) => {
      let input = payload.value;
      if (typeof input === "undefined") return payload;
      payload.issues.push({
        expected: "undefined",
        code: "invalid_type",
        input,
        inst,
      });
      return payload;
    };
  });
  cjsExports.$ZodNull = core.$constructor("$ZodNull", (inst, def) => {
    cjsExports.$ZodType.init(inst, def);
    inst._zod.pattern = regexes.null;
    inst._zod.values = new Set([null]);
    inst._zod.parse = (payload, _ctx) => {
      let input = payload.value;
      if (input === null) return payload;
      payload.issues.push({
        expected: "null",
        code: "invalid_type",
        input,
        inst,
      });
      return payload;
    };
  });
  cjsExports.$ZodAny = core.$constructor("$ZodAny", (inst, def) => {
    cjsExports.$ZodType.init(inst, def);
    inst._zod.parse = (payload) => payload;
  });
  cjsExports.$ZodUnknown = core.$constructor("$ZodUnknown", (inst, def) => {
    cjsExports.$ZodType.init(inst, def);
    inst._zod.parse = (payload) => payload;
  });
  cjsExports.$ZodNever = core.$constructor("$ZodNever", (inst, def) => {
    cjsExports.$ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
      payload.issues.push({
        expected: "never",
        code: "invalid_type",
        input: payload.value,
        inst,
      });
      return payload;
    };
  });
  cjsExports.$ZodVoid = core.$constructor("$ZodVoid", (inst, def) => {
    cjsExports.$ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
      let input = payload.value;
      if (typeof input === "undefined") return payload;
      payload.issues.push({
        expected: "void",
        code: "invalid_type",
        input,
        inst,
      });
      return payload;
    };
  });
  cjsExports.$ZodDate = core.$constructor("$ZodDate", (inst, def) => {
    cjsExports.$ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
      if (def.coerce)
        try {
          payload.value = new Date(payload.value);
        } catch (_err) {}
      let input = payload.value;
      let isDate = input instanceof Date;
      if (isDate && !Number.isNaN(input.getTime())) return payload;
      payload.issues.push({
        expected: "date",
        code: "invalid_type",
        input,
        ...(isDate
          ? {
              received: "Invalid Date",
            }
          : {}),
        inst,
      });
      return payload;
    };
  });
  function handleArrayResult(result, final, index) {
    if (result.issues.length) final.issues.push(...util.prefixIssues(index, result.issues));
    final.value[index] = result.value;
  }
  cjsExports.$ZodArray = core.$constructor("$ZodArray", (inst, def) => {
    cjsExports.$ZodType.init(inst, def);
    let memo = core.globalConfig.memoizer;
    memo?.attach(inst);
    inst._zod.parse = (payload, ctx) => {
      let input = payload.value;
      if (!Array.isArray(input)) {
        payload.issues.push({
          expected: "array",
          code: "invalid_type",
          input,
          inst,
        });
        return payload;
      }
      payload.value = memo ? memo.alloc(inst, payload, Array(input.length), ctx) : Array(input.length);
      let proms = [];
      let abortEarly = ctx?.abortEarly;
      for (let i = 0; i < input.length; i++) {
        let item = input[i];
        let result = def.element._zod.run(
          {
            value: item,
            issues: [],
          },
          ctx,
        );
        if (result instanceof Promise)
          proms.push(result.then((result) => handleArrayResult(result, payload, i)));
        else {
          handleArrayResult(result, payload, i);
          if (abortEarly && result.issues.length !== 0 && util.aborted(result)) break;
        }
      }
      if (proms.length) return Promise.all(proms).then(() => payload);
      return payload;
    };
  });
  function handlePropertyResult(result, final, key, input, optin, optout) {
    let isPresent = key in input;
    let isOptionalOut = optout === "optional";
    if (!isPresent && isOptionalOut && optin === "optional") return;
    if (result.issues.length) {
      if (optin !== undefined && isOptionalOut && !isPresent) return;
      final.issues.push(...util.prefixIssues(key, result.issues));
    }
    if (!isPresent && optin === undefined) {
      if (!result.issues.length)
        final.issues.push({
          code: "invalid_type",
          expected: "nonoptional",
          input: undefined,
          path: [key],
        });
      return;
    }
    if (result.value === undefined) {
      if (isPresent || (optin === "defaulted" && !isOptionalOut)) final.value[key] = undefined;
    } else final.value[key] = result.value;
  }
  var NO_SYMBOL_KEYS = [];
  function normalizeDef(def) {
    let keys = Object.keys(def.shape);
    let ownSymbols = Object.getOwnPropertySymbols(def.shape);
    let symbolKeys = ownSymbols.length ? ownSymbols : NO_SYMBOL_KEYS;
    let allKeys = symbolKeys.length ? [...keys, ...symbolKeys] : keys;
    for (let k of allKeys)
      if (!def.shape?.[k]?._zod?.traits?.has("$ZodType"))
        throw Error(`Invalid element at key "${String(k)}": expected a Zod schema`);
    let okeys = util.optionalKeys(def.shape);
    return {
      ...def,
      allKeys,
      symbolKeys,
      keySet: new Set(keys),
      numKeys: keys.length,
      optionalKeys: new Set(okeys),
    };
  }
  function handleCatchall(proms, input, payload, ctx, def, inst, abortEarly) {
    let unrecognized = [];
    let keySet = def.keySet;
    let _catchall = def.catchall._zod;
    let t = _catchall.def.type;
    let { optin, optout } = _catchall;
    let seen = 0;
    for (let key in input) {
      if (abortEarly && payload.issues.length !== seen) {
        if (util.aborted(payload, seen)) break;
        seen = payload.issues.length;
      }
      if (keySet.has(key)) continue;
      if (key === "__proto__") {
        if (t === "never") unrecognized.push(key);
        continue;
      }
      if (t === "never") {
        unrecognized.push(key);
        continue;
      }
      let r = _catchall.run(
        {
          value: input[key],
          issues: [],
        },
        ctx,
      );
      if (r instanceof Promise)
        proms.push(r.then((r) => handlePropertyResult(r, payload, key, input, optin, optout)));
      else handlePropertyResult(r, payload, key, input, optin, optout);
    }
    if (unrecognized.length)
      payload.issues.push({
        code: "unrecognized_keys",
        keys: unrecognized,
        input,
        inst,
        continue: true,
      });
    if (!proms.length) return payload;
    return Promise.all(proms).then(() => payload);
  }
  cjsExports.$ZodObject = core.$constructor("$ZodObject", (inst, def) => {
    cjsExports.$ZodType.init(inst, def);
    let desc = Object.getOwnPropertyDescriptor(def, "shape");
    let sh = desc?.get ? desc.get.raw : (def.shape ?? {});
    if (sh) {
      let get = () => {
        let newSh = {
          ...sh,
        };
        Object.defineProperty(def, "shape", {
          value: newSh,
        });
        get.raw = newSh;
        return newSh;
      };
      get.raw = sh;
      Object.defineProperty(def, "shape", {
        get,
      });
    }
    let _normalized = util.cached(() => normalizeDef(def));
    util.defineLazyInternal(inst, "propValues", (zod) => {
      let shape = zod.def.shape;
      let propValues = {};
      for (let key in shape) {
        let field = shape[key]._zod;
        if (field.values) {
          if (!Object.prototype.hasOwnProperty.call(propValues, key))
            util.assignProp(propValues, key, new Set());
          for (let v of field.values) propValues[key].add(v);
          if (field.optin !== undefined) propValues[key].add(undefined);
        }
      }
      return propValues;
    });
    let isObject = util.isObject;
    let catchall = def.catchall;
    let value;
    let memo = core.globalConfig.memoizer;
    memo?.attach(inst);
    inst._zod.parse = (payload, ctx) => {
      value ?? (value = _normalized.value);
      let input = payload.value;
      if (!isObject(input)) {
        payload.issues.push({
          expected: "object",
          code: "invalid_type",
          input,
          inst,
        });
        return payload;
      }
      payload.value = memo ? memo.alloc(inst, payload, {}, ctx) : {};
      let proms = [];
      let shape = value.shape;
      let abortEarly = ctx?.abortEarly;
      let seen = payload.issues.length;
      for (let key of value.allKeys) {
        if (abortEarly && payload.issues.length !== seen) {
          if (util.aborted(payload, seen)) break;
          seen = payload.issues.length;
        }
        if (key === "__proto__") continue;
        let el = shape[key];
        let optin = el._zod.optin;
        let optout = el._zod.optout;
        let r = el._zod.run(
          {
            value: input[key],
            issues: [],
          },
          ctx,
        );
        if (r instanceof Promise)
          proms.push(r.then((r) => handlePropertyResult(r, payload, key, input, optin, optout)));
        else handlePropertyResult(r, payload, key, input, optin, optout);
      }
      if (!catchall) return proms.length ? Promise.all(proms).then(() => payload) : payload;
      return handleCatchall(proms, input, payload, ctx, _normalized.value, inst, abortEarly === true);
    };
  });
  cjsExports.$ZodObjectJIT = core.$constructor("$ZodObjectJIT", (inst, def) => {
    cjsExports.$ZodObject.init(inst, def);
    let superParse = inst._zod.parse;
    let _normalized = util.cached(() => normalizeDef(def));
    let memo = core.globalConfig.memoizer;
    let generateFastpass = (shape) => {
      let normalized = _normalized.value;
      let syms = normalized.symbolKeys;
      let doc = new doc_js_1.Doc(["payload", "ctx"], {
        shape,
        inst,
        memo,
        syms,
      });
      let parseStr = (k) => `shape[${k}]._zod.run({ value: input[${k}], issues: [] }, ctx)`;
      let prefixStr = (id, k) => `
          let ${id}_ab = false;
          for (let i = 0; i < ${id}.issues.length; i++) {
            const iss = ${id}.issues[i];
            iss.path = iss.path ? [${k}, ...iss.path] : [${k}];
            payload.issues.push(iss);
            if (iss.continue !== true) ${id}_ab = true;
          }
          if (${id}_ab && ctx && ctx.abortEarly) {
            payload.value = newResult;
            return payload;
          }`;
      doc.write("const input = payload.value;");
      let ids = Object.create(null);
      let counter = 0;
      for (let key of normalized.allKeys) ids[key] = `key_${counter++}`;
      doc.write(memo ? "const newResult = memo.alloc(inst, payload, {}, ctx);" : "const newResult = {};");
      for (let key of normalized.allKeys) {
        if (key === "__proto__") continue;
        let id = ids[key];
        let k = typeof key === "symbol" ? `syms[${syms.indexOf(key)}]` : util.esc(key);
        let isPresent = `${k} in input`;
        let schema = shape[key];
        let optin = schema?._zod?.optin;
        let isOptionalIn = optin !== undefined;
        let isOptionalOut = schema?._zod?.optout === "optional";
        doc.write(`const ${id} = ${parseStr(k)};`);
        if (isOptionalIn && isOptionalOut) {
          let assign = optin === "optional" ? `${id}_present` : `${id}.value !== undefined || ${id}_present`;
          doc.write(`
        const ${id}_present = ${isPresent};
        if (!${id}.issues.length || ${id}_present) {
          if (${id}.issues.length) {${prefixStr(id, k)}
          }

          if (${assign}) {
            newResult[${k}] = ${id}.value;
          }
        }

      `);
        } else if (!isOptionalIn)
          doc.write(`
        const ${id}_present = ${isPresent};
        if (${id}.issues.length) {${prefixStr(id, k)}
        }
        if (!${id}_present && !${id}.issues.length) {
          payload.issues.push({
            code: "invalid_type",
            expected: "nonoptional",
            input: undefined,
            path: [${k}]
          });
          if (ctx && ctx.abortEarly) {
            payload.value = newResult;
            return payload;
          }
        }

        if (${id}_present) {
          newResult[${k}] = ${id}.value;
        }

      `);
        else {
          doc.write(`
        if (${id}.issues.length) {${prefixStr(id, k)}
        }
      `);
          if (optin === "defaulted") doc.write(`newResult[${k}] = ${id}.value;`);
          else
            doc.write(`
        if (${id}.value !== undefined || ${isPresent}) {
          newResult[${k}] = ${id}.value;
        }
      `);
        }
      }
      doc.write("payload.value = newResult;");
      doc.write("return payload;");
      return doc.compile();
    };
    let fastpass;
    let isObject = util.isObject;
    let jit = !core.globalConfig.jitless;
    let allowsEval = util.allowsEval;
    let fastEnabled = jit && allowsEval.value;
    let catchall = def.catchall;
    let value;
    inst._zod.parse = (payload, ctx) => {
      value ?? (value = _normalized.value);
      let input = payload.value;
      if (!isObject(input)) {
        payload.issues.push({
          expected: "object",
          code: "invalid_type",
          input,
          inst,
        });
        return payload;
      }
      if (jit && fastEnabled && ctx?.async === false && ctx.jitless !== true) {
        if (!fastpass) fastpass = generateFastpass(def.shape);
        payload = fastpass(payload, ctx);
        if (!catchall) return payload;
        return handleCatchall([], input, payload, ctx, value, inst, ctx?.abortEarly === true);
      }
      return superParse(payload, ctx);
    };
  });
  function handleUnionResults(results, final, inst, ctx) {
    for (let result of results)
      if (result.issues.length === 0) {
        final.value = result.value;
        return final;
      }
    let nonaborted = results.filter((r) => !util.aborted(r));
    if (nonaborted.length === 1) {
      final.value = nonaborted[0].value;
      return nonaborted[0];
    }
    final.issues.push({
      code: "invalid_union",
      input: final.value,
      inst,
      errors: results.map((result) =>
        result.issues.map((iss) => util.finalizeIssue(iss, ctx, core.config())),
      ),
    });
    return final;
  }
  cjsExports.$ZodUnion = core.$constructor("$ZodUnion", (inst, def) => {
    cjsExports.$ZodType.init(inst, def);
    util.defineLazyInternal(inst, "optin", (zod) =>
      zod.def.options.some((o) => o._zod.optin === "defaulted")
        ? "defaulted"
        : zod.def.options.some((o) => o._zod.optin !== undefined)
          ? "optional"
          : undefined,
    );
    util.defineLazyInternal(inst, "optout", (zod) =>
      zod.def.options.some((o) => o._zod.optout === "optional") ? "optional" : undefined,
    );
    util.defineLazyInternal(inst, "values", (zod) => {
      if (zod.def.options.every((o) => o._zod.values))
        return new Set(zod.def.options.flatMap((option) => Array.from(option._zod.values)));
      return;
    });
    util.defineLazyInternal(inst, "pattern", (zod) => {
      if (zod.def.options.every((o) => o._zod.pattern)) {
        let patterns = zod.def.options.map((o) => o._zod.pattern);
        return new RegExp(`^(${patterns.map((p) => util.cleanRegex(p.source)).join("|")})$`);
      }
      return;
    });
    let first = def.options.length === 1 ? def.options[0]._zod.run : null;
    inst._zod.parse = (payload, ctx) => {
      if (first) return first(payload, ctx);
      let async = false;
      let results = [];
      for (let option of def.options) {
        let result = option._zod.run(
          {
            value: payload.value,
            issues: [],
          },
          ctx,
        );
        if (result instanceof Promise) {
          results.push(result);
          async = true;
        } else {
          if (result.issues.length === 0) return result;
          results.push(result);
        }
      }
      if (!async) return handleUnionResults(results, payload, inst, ctx);
      return Promise.all(results).then((results) => handleUnionResults(results, payload, inst, ctx));
    };
  });
  function handleExclusiveUnionResults(results, final, inst, ctx) {
    let matches = [];
    for (let i = 0; i < results.length; i++) if (results[i].issues.length === 0) matches.push(i);
    if (matches.length === 1) {
      final.value = results[matches[0]].value;
      return final;
    }
    if (matches.length === 0)
      final.issues.push({
        code: "invalid_union",
        input: final.value,
        inst,
        errors: results.map((result) =>
          result.issues.map((iss) => util.finalizeIssue(iss, ctx, core.config())),
        ),
      });
    else
      final.issues.push({
        code: "invalid_union",
        input: final.value,
        inst,
        errors: [],
        inclusive: false,
        matches,
      });
    return final;
  }
  cjsExports.$ZodXor = core.$constructor("$ZodXor", (inst, def) => {
    cjsExports.$ZodUnion.init(inst, def);
    def.inclusive = false;
    let first = def.options.length === 1 ? def.options[0]._zod.run : null;
    inst._zod.parse = (payload, ctx) => {
      if (first) return first(payload, ctx);
      let async = false;
      let results = [];
      for (let option of def.options) {
        let result = option._zod.run(
          {
            value: payload.value,
            issues: [],
          },
          ctx,
        );
        if (result instanceof Promise) {
          results.push(result);
          async = true;
        } else results.push(result);
      }
      if (!async) return handleExclusiveUnionResults(results, payload, inst, ctx);
      return Promise.all(results).then((results) => handleExclusiveUnionResults(results, payload, inst, ctx));
    };
  });
  function getDiscriminatedOption(union, value) {
    let internals = union._zod;
    let map = internals.bag.optionsMap;
    if (!map) {
      map = discriminatorMap(internals.def);
      internals.bag.optionsMap = map;
    }
    let option = map.get(value);
    if (option === null) throw Error(`Ambiguous discriminator value "${String(value)}"`);
    return option;
  }
  function discriminatorMap(def) {
    let map = new Map();
    for (let option of def.options) {
      let values = option._zod.propValues?.[def.discriminator];
      if (!values || values.size === 0)
        throw Error(`Invalid discriminated union option at index "${def.options.indexOf(option)}"`);
      for (let value of values)
        if (map.has(value)) {
          if (value !== undefined) throw Error(`Duplicate discriminator value "${String(value)}"`);
          map.set(value, null);
        } else map.set(value, option);
    }
    return map;
  }
  cjsExports.$ZodDiscriminatedUnion = core.$constructor("$ZodDiscriminatedUnion", (inst, def) => {
    def.inclusive = false;
    cjsExports.$ZodUnion.init(inst, def);
    let _super = inst._zod.parse;
    util.defineLazyInternal(inst, "propValues", (zod) => {
      let propValues = {};
      let undefinedCount = 0;
      for (let option of zod.def.options) {
        let pv = option._zod.propValues;
        if (!pv || Object.keys(pv).length === 0)
          throw Error(`Invalid discriminated union option at index "${zod.def.options.indexOf(option)}"`);
        if (pv[zod.def.discriminator]?.has(undefined)) undefinedCount++;
        for (let [k, v] of Object.entries(pv)) {
          if (!Object.prototype.hasOwnProperty.call(propValues, k)) util.assignProp(propValues, k, new Set());
          for (let val of v) propValues[k].add(val);
        }
      }
      if (!zod.def.unionFallback && undefinedCount > 1) propValues[zod.def.discriminator]?.delete(undefined);
      return propValues;
    });
    def.options.forEach((option, i) => {
      let propShape = util.rawShape(option._zod.def);
      if (propShape && !Object.prototype.hasOwnProperty.call(propShape, def.discriminator))
        throw Error(`Invalid discriminated union option at index "${i}"`);
    });
    let disc = util.cached(() => discriminatorMap(def));
    inst._zod.parse = (payload, ctx) => {
      let input = payload.value;
      if (!util.isObject(input)) {
        payload.issues.push({
          code: "invalid_type",
          expected: "object",
          input,
          inst,
        });
        return payload;
      }
      let value = input?.[def.discriminator];
      let opt = disc.value.get(value);
      if (opt && (value !== undefined || ctx.direction !== "backward")) return opt._zod.run(payload, ctx);
      if (def.unionFallback || ctx.direction === "backward") return _super(payload, ctx);
      payload.issues.push({
        code: "invalid_union",
        errors: [],
        note: "No matching discriminator",
        discriminator: def.discriminator,
        options: Array.from(disc.value.keys()).filter((value) => disc.value.get(value) !== null),
        input,
        path: [def.discriminator],
        inst,
      });
      return payload;
    };
  });
  cjsExports.$ZodIntersection = core.$constructor("$ZodIntersection", (inst, def) => {
    cjsExports.$ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
      let input = payload.value;
      let left = def.left._zod.run(
        {
          value: input,
          issues: [],
        },
        ctx,
      );
      let right = def.right._zod.run(
        {
          value: input,
          issues: [],
        },
        ctx,
      );
      if (left instanceof Promise || right instanceof Promise)
        return Promise.all([left, right]).then(([left, right]) =>
          handleIntersectionResults(payload, left, right),
        );
      return handleIntersectionResults(payload, left, right);
    };
  });
  function mergeValues(a_2, b) {
    if (a_2 === b)
      return {
        valid: true,
        data: a_2,
      };
    if (a_2 instanceof Date && b instanceof Date && +a_2 === +b)
      return {
        valid: true,
        data: a_2,
      };
    if (util.isPlainObject(a_2) && util.isPlainObject(b)) {
      let bKeys = Object.keys(b);
      let sharedKeys = Object.keys(a_2).filter((key) => bKeys.indexOf(key) !== -1);
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
            mergeErrorPath: [key, ...sharedValue.mergeErrorPath],
          };
        newObj[key] = sharedValue.data;
      }
      return {
        valid: true,
        data: newObj,
      };
    }
    if (Array.isArray(a_2) && Array.isArray(b)) {
      if (a_2.length !== b.length)
        return {
          valid: false,
          mergeErrorPath: [],
        };
      let newArray = [];
      for (let index = 0; index < a_2.length; index++) {
        let itemA = a_2[index];
        let itemB = b[index];
        let sharedValue = mergeValues(itemA, itemB);
        if (!sharedValue.valid)
          return {
            valid: false,
            mergeErrorPath: [index, ...sharedValue.mergeErrorPath],
          };
        newArray.push(sharedValue.data);
      }
      return {
        valid: true,
        data: newArray,
      };
    }
    return {
      valid: false,
      mergeErrorPath: [],
    };
  }
  function handleIntersectionResults(result, left, right) {
    let unrecKeys = new Map();
    let unrecIssue;
    let keyIssues = new Map();
    let collect = (iss, side) => {
      let keys;
      if (iss.code === "unrecognized_keys" && !iss.path?.length) {
        unrecIssue ?? (unrecIssue = iss);
        keys = iss.keys;
      } else if (iss.code === "invalid_key" && iss.origin === "record" && iss.path?.length === 1) {
        let k = String(iss.path[0]);
        if (!keyIssues.has(k)) keyIssues.set(k, iss);
        keys = [k];
      } else return false;
      for (let k of keys) {
        if (!unrecKeys.has(k)) unrecKeys.set(k, {});
        unrecKeys.get(k)[side] = true;
      }
      return true;
    };
    for (let iss of left.issues) if (!collect(iss, "l")) result.issues.push(iss);
    for (let iss of right.issues) if (!collect(iss, "r")) result.issues.push(iss);
    let bothKeys = [...unrecKeys].filter(([, f]) => f.l && f.r).map(([k]) => k);
    if (bothKeys.length) {
      let aggregated = unrecIssue ? bothKeys.filter((k) => unrecIssue.keys.includes(k)) : [];
      if (aggregated.length)
        result.issues.push({
          ...unrecIssue,
          keys: aggregated,
        });
      for (let k of bothKeys)
        if (!aggregated.includes(k) && keyIssues.has(k)) result.issues.push(keyIssues.get(k));
    }
    let merged = mergeValues(left.value, right.value);
    if (!merged.valid) {
      if (util.aborted(result)) return result;
      throw Error(`Unmergable intersection. Error path: ${JSON.stringify(merged.mergeErrorPath)}`);
    }
    result.value = merged.data;
    return result;
  }
  cjsExports.$ZodTuple = core.$constructor("$ZodTuple", (inst, def) => {
    cjsExports.$ZodType.init(inst, def);
    let items = def.items;
    let memo = core.globalConfig.memoizer;
    memo?.attach(inst);
    inst._zod.parse = (payload, ctx) => {
      let input = payload.value;
      if (!Array.isArray(input)) {
        payload.issues.push({
          input,
          inst,
          expected: "tuple",
          code: "invalid_type",
        });
        return payload;
      }
      payload.value = memo ? memo.alloc(inst, payload, [], ctx) : [];
      let proms = [];
      let optinStart = getTupleOptStart(items, "optin");
      let optoutStart = getTupleOptStart(items, "optout");
      if (!def.rest) {
        if (input.length < optinStart) {
          payload.issues.push({
            code: "too_small",
            minimum: optinStart,
            inclusive: true,
            input,
            inst,
            origin: "array",
          });
          return payload;
        }
        if (input.length > items.length)
          payload.issues.push({
            code: "too_big",
            maximum: items.length,
            inclusive: true,
            input,
            inst,
            origin: "array",
          });
      }
      let itemResults = Array(items.length);
      let abortEarly = def.rest ? ctx?.abortEarly : undefined;
      let itemAborted = false;
      for (let i = 0; i < items.length; i++) {
        let r = items[i]._zod.run(
          {
            value: input[i],
            issues: [],
          },
          ctx,
        );
        if (r instanceof Promise)
          proms.push(
            r.then((rr) => {
              itemResults[i] = rr;
            }),
          );
        else {
          itemResults[i] = r;
          if (abortEarly && !itemAborted && r.issues.length) itemAborted = util.aborted(r);
        }
      }
      if (def.rest && !itemAborted) {
        let i = items.length - 1;
        let rest = input.slice(items.length);
        let seen = payload.issues.length;
        for (let el of rest) {
          if (abortEarly && payload.issues.length !== seen) {
            if (util.aborted(payload, seen)) break;
            seen = payload.issues.length;
          }
          i++;
          let result = def.rest._zod.run(
            {
              value: el,
              issues: [],
            },
            ctx,
          );
          if (result instanceof Promise) proms.push(result.then((r) => handleTupleResult(r, payload, i)));
          else handleTupleResult(result, payload, i);
        }
      }
      if (proms.length)
        return Promise.all(proms).then(() =>
          handleTupleResults(itemResults, payload, items, input, optoutStart),
        );
      return handleTupleResults(itemResults, payload, items, input, optoutStart);
    };
  });
  function getTupleOptStart(items, key) {
    for (let i = items.length - 1; i >= 0; i--)
      if (!(key === "optin" ? items[i]._zod.optin !== undefined : items[i]._zod.optout === "optional"))
        return i + 1;
    return 0;
  }
  function handleTupleResult(result, final, index) {
    if (result.issues.length) final.issues.push(...util.prefixIssues(index, result.issues));
    final.value[index] = result.value;
  }
  function handleTupleResults(itemResults, final, items, input, optoutStart) {
    for (let i = 0; i < items.length; i++) {
      let r = itemResults[i];
      let isPresent = i < input.length;
      if (!isPresent && i >= optoutStart && items[i]._zod.optin === "optional") {
        final.value.length = i;
        break;
      }
      if (r.issues.length) {
        if (!isPresent && i >= optoutStart) {
          final.value.length = i;
          break;
        }
        final.issues.push(...util.prefixIssues(i, r.issues));
      }
      final.value[i] = r.value;
    }
    for (let i = final.value.length - 1; i >= input.length; i--)
      if (items[i]._zod.optout === "optional" && final.value[i] === undefined) final.value.length = i;
      else break;
    return final;
  }
  cjsExports.$ZodRecord = core.$constructor("$ZodRecord", (inst, def) => {
    cjsExports.$ZodType.init(inst, def);
    let memo = core.globalConfig.memoizer;
    memo?.attach(inst);
    inst._zod.parse = (payload, ctx) => {
      let input = payload.value;
      if (!util.isPlainObject(input)) {
        payload.issues.push({
          expected: "record",
          code: "invalid_type",
          input,
          inst,
        });
        return payload;
      }
      let proms = [];
      let values = def.keyType._zod.values;
      if (values && !def.partial) {
        payload.value = memo ? memo.alloc(inst, payload, {}, ctx) : {};
        let recordKeys = new Set();
        for (let key of values)
          if (typeof key === "string" || typeof key === "number" || typeof key === "symbol") {
            recordKeys.add(typeof key === "number" ? key.toString() : key);
            if (key === "__proto__") continue;
            let keyResult = def.keyType._zod.run(
              {
                value: key,
                issues: [],
              },
              ctx,
            );
            if (keyResult instanceof Promise)
              throw Error("Async schemas not supported in object keys currently");
            if (keyResult.issues.length) {
              payload.issues.push({
                code: "invalid_key",
                origin: "record",
                issues: keyResult.issues.map((iss) => util.finalizeIssue(iss, ctx, core.config())),
                input: key,
                path: [key],
                inst,
              });
              continue;
            }
            let outKey = keyResult.value;
            if (outKey === "__proto__") continue;
            let result = def.valueType._zod.run(
              {
                value: input[key],
                issues: [],
              },
              ctx,
            );
            if (result instanceof Promise)
              proms.push(
                result.then((result) => {
                  if (result.issues.length) payload.issues.push(...util.prefixIssues(key, result.issues));
                  payload.value[outKey] = result.value;
                }),
              );
            else {
              if (result.issues.length) payload.issues.push(...util.prefixIssues(key, result.issues));
              payload.value[outKey] = result.value;
            }
          }
        let unrecognized;
        for (let key in input)
          if (!recordKeys.has(key))
            if (def.mode === "loose") {
              if (key === "__proto__") continue;
              payload.value[key] = input[key];
            } else {
              unrecognized = unrecognized ?? [];
              unrecognized.push(key);
            }
        if (unrecognized && unrecognized.length > 0)
          payload.issues.push({
            code: "unrecognized_keys",
            input,
            inst,
            keys: unrecognized,
            continue: true,
          });
      } else {
        payload.value = memo ? memo.alloc(inst, payload, {}, ctx) : {};
        let unrecognized;
        for (let key of Reflect.ownKeys(input)) {
          if (key === "__proto__") continue;
          if (!Object.prototype.propertyIsEnumerable.call(input, key)) continue;
          let keyResult = def.keyType._zod.run(
            {
              value: key,
              issues: [],
            },
            ctx,
          );
          if (keyResult instanceof Promise)
            throw Error("Async schemas not supported in object keys currently");
          if (typeof key === "string" && regexes.number.test(key) && keyResult.issues.length) {
            let retryResult = def.keyType._zod.run(
              {
                value: Number(key),
                issues: [],
              },
              ctx,
            );
            if (retryResult instanceof Promise)
              throw Error("Async schemas not supported in object keys currently");
            if (retryResult.issues.length === 0) keyResult = retryResult;
          }
          if (keyResult.issues.length) {
            if (def.mode === "loose") payload.value[key] = input[key];
            else if (values) {
              unrecognized = unrecognized ?? [];
              unrecognized.push(key);
            } else
              payload.issues.push({
                code: "invalid_key",
                origin: "record",
                issues: keyResult.issues.map((iss) => util.finalizeIssue(iss, ctx, core.config())),
                input: key,
                path: [key],
                inst,
              });
            continue;
          }
          let outKey = keyResult.value;
          if (outKey === "__proto__") continue;
          let result = def.valueType._zod.run(
            {
              value: input[key],
              issues: [],
            },
            ctx,
          );
          if (result instanceof Promise)
            proms.push(
              result.then((result) => {
                if (result.issues.length) payload.issues.push(...util.prefixIssues(key, result.issues));
                payload.value[outKey] = result.value;
              }),
            );
          else {
            if (result.issues.length) payload.issues.push(...util.prefixIssues(key, result.issues));
            payload.value[outKey] = result.value;
          }
        }
        if (unrecognized && unrecognized.length > 0)
          payload.issues.push({
            code: "unrecognized_keys",
            input,
            inst,
            keys: unrecognized,
            continue: true,
          });
      }
      if (proms.length) return Promise.all(proms).then(() => payload);
      return payload;
    };
  });
  cjsExports.$ZodMap = core.$constructor("$ZodMap", (inst, def) => {
    cjsExports.$ZodType.init(inst, def);
    let memo = core.globalConfig.memoizer;
    memo?.attach(inst);
    inst._zod.parse = (payload, ctx) => {
      let input = payload.value;
      if (!(input instanceof Map)) {
        payload.issues.push({
          expected: "map",
          code: "invalid_type",
          input,
          inst,
        });
        return payload;
      }
      let proms = [];
      payload.value = memo ? memo.alloc(inst, payload, new Map(), ctx) : new Map();
      let abortEarly = ctx?.abortEarly;
      let seen = payload.issues.length;
      for (let [key, value] of input) {
        if (abortEarly && payload.issues.length !== seen) {
          if (util.aborted(payload, seen)) break;
          seen = payload.issues.length;
        }
        let keyResult = def.keyType._zod.run(
          {
            value: key,
            issues: [],
          },
          ctx,
        );
        let valueResult = def.valueType._zod.run(
          {
            value,
            issues: [],
          },
          ctx,
        );
        if (keyResult instanceof Promise || valueResult instanceof Promise)
          proms.push(
            Promise.all([keyResult, valueResult]).then(([keyResult, valueResult]) => {
              handleMapResult(keyResult, valueResult, payload, key, input, inst, ctx);
            }),
          );
        else handleMapResult(keyResult, valueResult, payload, key, input, inst, ctx);
      }
      if (proms.length) return Promise.all(proms).then(() => payload);
      return payload;
    };
  });
  function handleMapResult(keyResult, valueResult, final, key, input, inst, ctx) {
    if (keyResult.issues.length)
      if (util.propertyKeyTypes.has(typeof key))
        final.issues.push(...util.prefixIssues(key, keyResult.issues));
      else
        final.issues.push({
          code: "invalid_key",
          origin: "map",
          input,
          inst,
          issues: keyResult.issues.map((iss) => util.finalizeIssue(iss, ctx, core.config())),
        });
    if (valueResult.issues.length)
      if (util.propertyKeyTypes.has(typeof key))
        final.issues.push(...util.prefixIssues(key, valueResult.issues));
      else
        final.issues.push({
          origin: "map",
          code: "invalid_element",
          input,
          inst,
          key,
          issues: valueResult.issues.map((iss) => util.finalizeIssue(iss, ctx, core.config())),
        });
    final.value.set(keyResult.value, valueResult.value);
  }
  cjsExports.$ZodSet = core.$constructor("$ZodSet", (inst, def) => {
    cjsExports.$ZodType.init(inst, def);
    let memo = core.globalConfig.memoizer;
    memo?.attach(inst);
    inst._zod.parse = (payload, ctx) => {
      let input = payload.value;
      if (!(input instanceof Set)) {
        payload.issues.push({
          input,
          inst,
          expected: "set",
          code: "invalid_type",
        });
        return payload;
      }
      let proms = [];
      payload.value = memo ? memo.alloc(inst, payload, new Set(), ctx) : new Set();
      let abortEarly = ctx?.abortEarly;
      let seen = payload.issues.length;
      for (let item of input) {
        if (abortEarly && payload.issues.length !== seen) {
          if (util.aborted(payload, seen)) break;
          seen = payload.issues.length;
        }
        let result = def.valueType._zod.run(
          {
            value: item,
            issues: [],
          },
          ctx,
        );
        if (result instanceof Promise) proms.push(result.then((result) => handleSetResult(result, payload)));
        else handleSetResult(result, payload);
      }
      if (proms.length) return Promise.all(proms).then(() => payload);
      return payload;
    };
  });
  function handleSetResult(result, final) {
    if (result.issues.length) final.issues.push(...result.issues);
    final.value.add(result.value);
  }
  cjsExports.$ZodEnum = core.$constructor("$ZodEnum", (inst, def) => {
    cjsExports.$ZodType.init(inst, def);
    let values = util.getEnumValues(def.entries);
    let valuesSet = new Set(values);
    inst._zod.values = valuesSet;
    util.defineLazyInternal(inst, "pattern", (zod) => {
      let patternValues = util
        .getEnumValues(zod.def.entries)
        .filter((k) => util.propertyKeyTypes.has(typeof k));
      return new RegExp(
        patternValues.length
          ? `^(${patternValues.map((o) => util.escapeRegex(o.toString())).join("|")})$`
          : "^[^\\s\\S]$",
      );
    });
    inst._zod.parse = (payload, _ctx) => {
      let input = payload.value;
      if (valuesSet.has(input)) return payload;
      payload.issues.push({
        code: "invalid_value",
        values,
        input,
        inst,
      });
      return payload;
    };
  });
  cjsExports.$ZodLiteral = core.$constructor("$ZodLiteral", (inst, def) => {
    cjsExports.$ZodType.init(inst, def);
    let values = new Set(def.values);
    inst._zod.values = values;
    util.defineLazyInternal(inst, "pattern", (zod) => {
      let vals = zod.def.values;
      return new RegExp(
        vals.length
          ? `^(${vals.map((o) => (typeof o === "string" ? util.escapeRegex(o) : o ? util.escapeRegex(o.toString()) : String(o))).join("|")})$`
          : "^[^\\s\\S]$",
      );
    });
    inst._zod.parse = (payload, _ctx) => {
      let input = payload.value;
      if (values.has(input)) return payload;
      payload.issues.push({
        code: "invalid_value",
        values: def.values,
        input,
        inst,
      });
      return payload;
    };
  });
  cjsExports.$ZodFile = core.$constructor("$ZodFile", (inst, def) => {
    cjsExports.$ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
      let input = payload.value;
      if (input instanceof File) return payload;
      payload.issues.push({
        expected: "file",
        code: "invalid_type",
        input,
        inst,
      });
      return payload;
    };
  });
  cjsExports.$ZodTransform = core.$constructor("$ZodTransform", (inst, def) => {
    cjsExports.$ZodType.init(inst, def);
    inst._zod.optin = "optional";
    core.globalConfig.memoizer?.guard(inst);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") throw new core.$ZodEncodeError(inst.constructor.name);
      let _out = def.transform(payload.value, payload);
      if (ctx.async)
        return (_out instanceof Promise ? _out : Promise.resolve(_out)).then((output) => {
          payload.value = output;
          return payload;
        });
      if (_out instanceof Promise) throw new core.$ZodAsyncError();
      payload.value = _out;
      return payload;
    };
  });
  function handleOptionalResult(payload, result) {
    payload.value = result.issues.length ? undefined : result.value;
    return payload;
  }
  cjsExports.$ZodOptional = core.$constructor("$ZodOptional", (inst, def) => {
    cjsExports.$ZodType.init(inst, def);
    util.defineLazyInternal(inst, "optin", (zod) =>
      zod.def.innerType._zod.optin === "defaulted" ? "defaulted" : "optional",
    );
    inst._zod.optout = "optional";
    util.defineLazyInternal(inst, "values", (zod) => {
      let values = zod.def.innerType._zod.values;
      return values ? new Set([...values, undefined]) : undefined;
    });
    util.defineLazyInternal(inst, "pattern", (zod) => {
      let pattern = zod.def.innerType._zod.pattern;
      return pattern ? new RegExp(`^(${util.cleanRegex(pattern.source)})?$`) : undefined;
    });
    inst._zod.parse = (payload, ctx) => {
      if (payload.value === undefined) {
        if (def.innerType._zod.optin !== "defaulted") return payload;
        let result = def.innerType._zod.run(
          {
            value: payload.value,
            issues: [],
          },
          ctx,
        );
        if (result instanceof Promise) return result.then((result) => handleOptionalResult(payload, result));
        return handleOptionalResult(payload, result);
      }
      return def.innerType._zod.run(payload, ctx);
    };
  });
  cjsExports.$ZodExactOptional = core.$constructor("$ZodExactOptional", (inst, def) => {
    cjsExports.$ZodOptional.init(inst, def);
    util.defineLazyInternal(inst, "values", (zod) => zod.def.innerType._zod.values);
    util.defineLazyInternal(inst, "pattern", (zod) => zod.def.innerType._zod.pattern);
    inst._zod.parse = (payload, ctx) => def.innerType._zod.run(payload, ctx);
  });
  cjsExports.$ZodNullable = core.$constructor("$ZodNullable", (inst, def) => {
    cjsExports.$ZodType.init(inst, def);
    util.defineLazyInternal(inst, "optin", (zod) => zod.def.innerType._zod.optin);
    util.defineLazyInternal(inst, "optout", (zod) => zod.def.innerType._zod.optout);
    util.defineLazyInternal(inst, "pattern", (zod) => {
      let pattern = zod.def.innerType._zod.pattern;
      return pattern ? new RegExp(`^(${util.cleanRegex(pattern.source)}|null)$`) : undefined;
    });
    util.defineLazyInternal(inst, "values", (zod) =>
      zod.def.innerType._zod.values ? new Set([...zod.def.innerType._zod.values, null]) : undefined,
    );
    inst._zod.parse = (payload, ctx) => {
      if (payload.value === null) return payload;
      return def.innerType._zod.run(payload, ctx);
    };
  });
  cjsExports.$ZodDefault = core.$constructor("$ZodDefault", (inst, def) => {
    cjsExports.$ZodType.init(inst, def);
    inst._zod.optin = "defaulted";
    util.defineLazyInternal(inst, "values", (zod) => zod.def.innerType._zod.values);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
      if (payload.value === undefined) {
        payload.value = def.defaultValue;
        return payload;
      }
      let result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise) return result.then((result) => handleDefaultResult(result, def));
      return handleDefaultResult(result, def);
    };
  });
  function handleDefaultResult(payload, def) {
    if (payload.value === undefined) payload.value = def.defaultValue;
    return payload;
  }
  cjsExports.$ZodPrefault = core.$constructor("$ZodPrefault", (inst, def) => {
    cjsExports.$ZodType.init(inst, def);
    inst._zod.optin = "defaulted";
    util.defineLazyInternal(inst, "values", (zod) => zod.def.innerType._zod.values);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
      if (payload.value === undefined) payload.value = def.defaultValue;
      return def.innerType._zod.run(payload, ctx);
    };
  });
  cjsExports.$ZodNonOptional = core.$constructor("$ZodNonOptional", (inst, def) => {
    cjsExports.$ZodType.init(inst, def);
    util.defineLazyInternal(inst, "values", (zod) => {
      let v = zod.def.innerType._zod.values;
      return v ? new Set([...v].filter((x) => x !== undefined)) : undefined;
    });
    inst._zod.parse = (payload, ctx) => {
      let result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise) return result.then((result) => handleNonOptionalResult(result, inst));
      return handleNonOptionalResult(result, inst);
    };
  });
  function handleNonOptionalResult(payload, inst) {
    if (!payload.issues.length && payload.value === undefined)
      payload.issues.push({
        code: "invalid_type",
        expected: "nonoptional",
        input: payload.value,
        inst,
      });
    return payload;
  }
  cjsExports.$ZodSuccess = core.$constructor("$ZodSuccess", (inst, def) => {
    cjsExports.$ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") throw new core.$ZodEncodeError("ZodSuccess");
      let result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise)
        return result.then((result) => {
          payload.value = result.issues.length === 0;
          return payload;
        });
      payload.value = result.issues.length === 0;
      return payload;
    };
  });
  function handleCatchResult(payload, result, def, ctx) {
    if (!result.issues.length) {
      payload.value = result.value;
      if (result.memo) payload.memo = true;
      return payload;
    }
    payload.value = def.catchValue({
      ...result,
      value: payload.value,
      error: {
        issues: result.issues.map((iss) => util.finalizeIssue(iss, ctx, core.config())),
      },
      input: payload.value,
    });
    return payload;
  }
  cjsExports.$ZodCatch = core.$constructor("$ZodCatch", (inst, def) => {
    cjsExports.$ZodType.init(inst, def);
    util.defineLazyInternal(inst, "optin", (zod) =>
      zod.def.innerType._zod.optin === "defaulted" ? "defaulted" : "optional",
    );
    util.defineLazyInternal(inst, "optout", (zod) => zod.def.innerType._zod.optout);
    util.defineLazyInternal(inst, "values", (zod) => zod.def.innerType._zod.values);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
      let result = def.innerType._zod.run(
        {
          value: payload.value,
          issues: [],
        },
        ctx,
      );
      if (result instanceof Promise)
        return result.then((result) => handleCatchResult(payload, result, def, ctx));
      return handleCatchResult(payload, result, def, ctx);
    };
  });
  cjsExports.$ZodNaN = core.$constructor("$ZodNaN", (inst, def) => {
    cjsExports.$ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
      if (typeof payload.value !== "number" || !Number.isNaN(payload.value)) {
        payload.issues.push({
          input: payload.value,
          inst,
          expected: "nan",
          code: "invalid_type",
        });
        return payload;
      }
      return payload;
    };
  });
  cjsExports.$ZodPipe = core.$constructor("$ZodPipe", (inst, def) => {
    cjsExports.$ZodType.init(inst, def);
    util.defineLazyInternal(inst, "values", (zod) => zod.def.in._zod.values);
    util.defineLazyInternal(inst, "optin", (zod) => zod.def.in._zod.optin);
    util.defineLazyInternal(inst, "optout", (zod) => zod.def.out._zod.optout);
    util.defineLazyInternal(inst, "propValues", (zod) => zod.def.in._zod.propValues);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        let right = def.out._zod.run(payload, ctx);
        if (right instanceof Promise) return right.then((right) => handlePipeResult(right, def.in, ctx));
        return handlePipeResult(right, def.in, ctx);
      }
      let left = def.in._zod.run(payload, ctx);
      if (left instanceof Promise) return left.then((left) => handlePipeResult(left, def.out, ctx));
      return handlePipeResult(left, def.out, ctx);
    };
  });
  function handlePipeResult(left, next, ctx) {
    if (left.issues.some((iss) => iss.code !== "unrecognized_keys")) {
      left.aborted = true;
      return left;
    }
    return next._zod.run(
      {
        value: left.value,
        issues: left.issues,
      },
      ctx,
    );
  }
  cjsExports.$ZodCodec = core.$constructor("$ZodCodec", (inst, def) => {
    cjsExports.$ZodType.init(inst, def);
    util.defineLazyInternal(inst, "values", (zod) => zod.def.in._zod.values);
    util.defineLazyInternal(inst, "optin", (zod) => zod.def.in._zod.optin);
    util.defineLazyInternal(inst, "optout", (zod) => zod.def.out._zod.optout);
    util.defineLazyInternal(inst, "propValues", (zod) => zod.def.in._zod.propValues);
    inst._zod.parse = (payload, ctx) => {
      if ((ctx.direction || "forward") === "forward") {
        let left = def.in._zod.run(payload, ctx);
        if (left instanceof Promise) return left.then((left) => handleCodecAResult(left, def, ctx));
        return handleCodecAResult(left, def, ctx);
      } else {
        let right = def.out._zod.run(payload, ctx);
        if (right instanceof Promise) return right.then((right) => handleCodecAResult(right, def, ctx));
        return handleCodecAResult(right, def, ctx);
      }
    };
  });
  function handleCodecAResult(result, def, ctx) {
    if (result.issues.length) {
      result.aborted = true;
      return result;
    }
    if ((ctx.direction || "forward") === "forward") {
      let transformed = def.transform(result.value, result);
      if (transformed instanceof Promise)
        return transformed.then((value) => handleCodecTxResult(result, value, def.out, ctx));
      return handleCodecTxResult(result, transformed, def.out, ctx);
    } else {
      let transformed = def.reverseTransform(result.value, result);
      if (transformed instanceof Promise)
        return transformed.then((value) => handleCodecTxResult(result, value, def.in, ctx));
      return handleCodecTxResult(result, transformed, def.in, ctx);
    }
  }
  function handleCodecTxResult(left, value, nextSchema, ctx) {
    if (left.issues.length) {
      left.aborted = true;
      return left;
    }
    return nextSchema._zod.run(
      {
        value,
        issues: left.issues,
      },
      ctx,
    );
  }
  cjsExports.$ZodPreprocess = core.$constructor("$ZodPreprocess", (inst, def) => {
    cjsExports.$ZodPipe.init(inst, def);
  });
  cjsExports.$ZodReadonly = core.$constructor("$ZodReadonly", (inst, def) => {
    cjsExports.$ZodType.init(inst, def);
    util.defineLazyInternal(inst, "propValues", (zod) => zod.def.innerType._zod.propValues);
    util.defineLazyInternal(inst, "values", (zod) => zod.def.innerType._zod.values);
    util.defineLazyInternal(inst, "optin", (zod) => zod.def.innerType?._zod?.optin);
    util.defineLazyInternal(inst, "optout", (zod) => zod.def.innerType?._zod?.optout);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
      let result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise) return result.then(handleReadonlyResult);
      return handleReadonlyResult(result);
    };
  });
  function handleReadonlyResult(payload) {
    if (!payload.memo) payload.value = Object.freeze(payload.value);
    return payload;
  }
  function leafPattern(schema) {
    let def = schema._zod.def;
    let pattern = def.pattern;
    let isInt = !!def.format?.includes("int");
    let minimum;
    let maximum;
    for (let ch of def.checks ?? []) {
      let d = ch._zod.def;
      if (d.pattern) pattern = d.pattern;
      if (!isInt) isInt = !!d.format?.includes("int");
      let lo = d.minimum ?? d.length;
      let hi = d.maximum ?? d.length;
      if (lo !== undefined && (minimum === undefined || lo > minimum)) minimum = lo;
      if (hi !== undefined && (maximum === undefined || hi < maximum)) maximum = hi;
    }
    if (pattern) return pattern.source;
    if (minimum !== undefined && maximum !== undefined && minimum > maximum) return "(?!)";
    if (minimum !== undefined || maximum !== undefined)
      return regexes.string({
        minimum,
        maximum,
      }).source;
    let own = schema._zod.pattern;
    return (isInt && own === regexes.number ? regexes.integer : own)?.source;
  }
  function partPattern(schema) {
    let def = schema._zod.def;
    let own = schema._zod.pattern?.source;
    let inner = def.innerType ?? schema._zod.innerType;
    if (inner) {
      let before = inner._zod.pattern?.source;
      let after = partPattern(inner);
      if (own && before && after && after !== before)
        return own.replace(util.cleanRegex(before), () => util.cleanRegex(after));
      return own;
    }
    if (def.options) {
      let sources = def.options.map(partPattern);
      if (sources.every(Boolean)) return `^(${sources.map((source) => util.cleanRegex(source)).join("|")})$`;
    }
    return leafPattern(schema);
  }
  cjsExports.$ZodTemplateLiteral = core.$constructor("$ZodTemplateLiteral", (inst, def) => {
    cjsExports.$ZodType.init(inst, def);
    let regexParts = [];
    for (let part of def.parts)
      if (typeof part === "object" && part !== null) {
        let source = partPattern(part);
        if (!source)
          throw Error(`Invalid template literal part, no pattern found: ${[...part._zod.traits].shift()}`);
        regexParts.push(util.cleanRegex(source));
      } else if (part === null || util.primitiveTypes.has(typeof part))
        regexParts.push(util.escapeRegex(`${part}`));
      else throw Error(`Invalid template literal part: ${part}`);
    inst._zod.pattern = new RegExp(`^${regexParts.join("")}$`);
    inst._zod.parse = (payload, _ctx) => {
      if (typeof payload.value !== "string") {
        payload.issues.push({
          input: payload.value,
          inst,
          expected: "string",
          code: "invalid_type",
        });
        return payload;
      }
      inst._zod.pattern.lastIndex = 0;
      if (!inst._zod.pattern.test(payload.value)) {
        payload.issues.push({
          input: payload.value,
          inst,
          code: "invalid_format",
          format: def.format ?? "template_literal",
          pattern: inst._zod.pattern.source,
        });
        return payload;
      }
      return payload;
    };
  });
  cjsExports.$ZodFunction = core.$constructor("$ZodFunction", (inst, def) => {
    cjsExports.$ZodType.init(inst, def);
    Object.defineProperty(inst, "_def", {
      value: def,
    });
    inst._zod.def = def;
    inst.implement = (func) => {
      if (typeof func !== "function") throw Error("implement() must be called with a function");
      return Object.defineProperty(
        function (...args) {
          let parsedArgs = inst._def.input ? parse_js_1.parse(inst._def.input, args) : args;
          let result = Reflect.apply(func, this, parsedArgs);
          if (inst._def.output) return parse_js_1.parse(inst._def.output, result);
          return result;
        },
        "_zod",
        {
          value: inst._zod,
          enumerable: false,
        },
      );
    };
    inst.implementAsync = (func) => {
      if (typeof func !== "function") throw Error("implementAsync() must be called with a function");
      return Object.defineProperty(
        async function (...args) {
          let parsedArgs = inst._def.input ? await parse_js_1.parseAsync(inst._def.input, args) : args;
          let result = await Reflect.apply(func, this, parsedArgs);
          if (inst._def.output) return await parse_js_1.parseAsync(inst._def.output, result);
          return result;
        },
        "_zod",
        {
          value: inst._zod,
          enumerable: false,
        },
      );
    };
    inst._zod.parse = (payload, _ctx) => {
      if (typeof payload.value !== "function") {
        payload.issues.push({
          code: "invalid_type",
          expected: "function",
          input: payload.value,
          inst,
        });
        return payload;
      }
      if (inst._def.output && inst._def.output._zod.def.type === "promise")
        payload.value = inst.implementAsync(payload.value);
      else payload.value = inst.implement(payload.value);
      return payload;
    };
    inst.input = (...args) => {
      let F = inst.constructor;
      if (Array.isArray(args[0]))
        return new F({
          type: "function",
          input: new cjsExports.$ZodTuple({
            type: "tuple",
            items: args[0],
            rest: args[1],
          }),
          output: inst._def.output,
        });
      return new F({
        type: "function",
        input: args[0],
        output: inst._def.output,
      });
    };
    inst.output = (output) =>
      new inst.constructor({
        type: "function",
        input: inst._def.input,
        output,
      });
    return inst;
  });
  cjsExports.$ZodPromise = core.$constructor("$ZodPromise", (inst, def) => {
    cjsExports.$ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) =>
      Promise.resolve(payload.value).then((inner) =>
        def.innerType._zod.run(
          {
            value: inner,
            issues: [],
          },
          ctx,
        ),
      );
  });
  cjsExports.$ZodLazy = core.$constructor("$ZodLazy", (inst, def) => {
    cjsExports.$ZodType.init(inst, def);
    util.defineLazy(inst._zod, "innerType", () => {
      let d = def;
      if (!d._cachedInner) d._cachedInner = def.getter();
      return d._cachedInner;
    });
    util.defineLazyInternal(inst, "pattern", (zod) => zod.innerType?._zod?.pattern);
    util.defineLazyInternal(inst, "propValues", (zod) => zod.innerType?._zod?.propValues);
    util.defineLazyInternal(inst, "optin", (zod) => zod.innerType?._zod?.optin ?? undefined);
    util.defineLazyInternal(inst, "optout", (zod) => zod.innerType?._zod?.optout ?? undefined);
    inst._zod.parse = (payload, ctx) => inst._zod.innerType._zod.run(payload, ctx);
  });
  cjsExports.$ZodCustom = core.$constructor("$ZodCustom", (inst, def) => {
    checks.$ZodCheck.init(inst, def);
    cjsExports.$ZodType.init(inst, def);
    inst._zod.parse = (payload, _) => payload;
    inst._zod.check = (payload) => {
      let input = payload.value;
      let result = def.fn(input);
      if (result instanceof Promise) return result.then((r) => handleRefineResult(r, payload, input, inst));
      handleRefineResult(result, payload, input, inst);
      return;
    };
  });
  function handleRefineResult(result, payload, input, inst) {
    if (!result) {
      let _iss = {
        code: "custom",
        input,
        inst,
        path: [...(inst._zod.def.path ?? [])],
        continue: !inst._zod.def.abort,
      };
      if (inst._zod.def.params) _iss.params = inst._zod.def.params;
      payload.issues.push(util.issue(_iss));
    }
  }
  function handlePropertiesResult(result, payload, key) {
    if (result.issues.length) payload.issues.push(...util.prefixIssues(key, result.issues));
  }
  cjsExports.$ZodProperties = core.$constructor(
    "$ZodProperties",
    (inst, def) => {
      cjsExports.$ZodType.init(inst, def);
      checks.$ZodCheck.init(inst, def);
      let memo = core.globalConfig.memoizer;
      memo?.attach(inst);
      let entries;
      let runShape = (payload, ctx) => {
        entries ?? (entries = Reflect.ownKeys(def.shape).map((key) => [key, def.shape[key]]));
        let input = payload.value;
        let proms;
        for (let [key, schema] of entries) {
          let result = schema._zod.run(
            {
              value: input[key],
              issues: [],
            },
            ctx,
          );
          if (result instanceof Promise) {
            proms ?? (proms = []);
            proms.push(result.then((result) => handlePropertiesResult(result, payload, key)));
          } else handlePropertiesResult(result, payload, key);
        }
        if (proms)
          return Promise.all(proms).then(() => {
            return;
          });
        return;
      };
      inst._zod.parse = (payload, ctx) => {
        let input = payload.value;
        if (input === null || (typeof input !== "object" && typeof input !== "function")) {
          payload.issues.push({
            expected: "object",
            code: "invalid_type",
            input,
            inst,
          });
          return payload;
        }
        if (ctx.direction === "backward")
          ctx = {
            ...ctx,
            direction: "forward",
          };
        if (memo) memo.alloc(inst, payload, input, ctx);
        let result = runShape(payload, ctx);
        return result instanceof Promise ? result.then(() => payload) : payload;
      };
      inst._zod.check = (payload) => {
        if (payload.value == null) {
          payload.issues.push({
            expected: "object",
            code: "invalid_type",
            input: payload.value,
            inst,
          });
          return;
        }
        return runShape(payload, {});
      };
    },
    {
      *[Symbol.iterator]() {
        yield this;
      },
    },
  );
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
export { require_schemas };
