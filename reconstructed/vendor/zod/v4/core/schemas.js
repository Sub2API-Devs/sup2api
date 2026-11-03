/**
 * zod/v4/core/schemas.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-7vp249v4.js (58)
 * attribution: esm-fingerprint 55, esm-layout 3
 */
import { Fr, $ZodAsyncError, config, globalConfig, $ZodEncodeError } from "./core.js";
import { version } from "./versions.js";
import {
  aborted,
  explicitlyAborted,
  attachSchema,
  shs,
  own,
  finalizeIssue,
  prefixIssues,
  optionalKeys,
  cached,
  defineLazyInternal,
  assignProp,
  isObject,
  cloneDef,
  allowsEval,
  cleanRegex,
  rawShape,
  isPlainObject,
  iSr,
  CIi,
  escapeRegex,
  defineLazy,
  issue,
} from "./util.js";
import {
  anyString,
  guid,
  uuid,
  email,
  httpProtocol,
  vr,
  nanoid,
  hr,
  ar,
  cuid2,
  ulid,
  xid,
  ksuid,
  datetime,
  Or,
  Ar,
  duration,
  ipv4,
  ipv6,
  cidrv4,
  cidrv6,
  e164,
  number,
  boolean,
  _undefined,
  _null,
} from "./regexes.js";
import { $ZodCheckStringFormat, $ZodCheckNumberFormat, $ZodCheck } from "./checks.js";
import { Doc } from "./doc.js";

//@ chunk-7vp249v4.js:14398-15969 esm-fingerprint
var $ZodType = Fr(
  "$ZodType",
  (inst, def) => {
    var _a;
    inst ?? (inst = {});
    inst._zod.def = def;
    inst._zod.bag = inst._zod.bag || {};
    inst._zod.version = version;
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
        let isAborted = aborted(payload);
        let asyncResult;
        for (let ch of checks) {
          if (ch._zod.def.when) {
            if (explicitlyAborted(payload)) continue;
            if (!ch._zod.def.when(payload)) continue;
          } else if (isAborted) continue;
          let currLen = payload.issues.length;
          let _ = ch._zod.check(payload);
          if (_ instanceof Promise && ctx?.async === false) throw new $ZodAsyncError();
          if (asyncResult || _ instanceof Promise)
            asyncResult = (asyncResult ?? Promise.resolve()).then(async () => {
              await _;
              if (payload.issues.length === currLen) return;
              attachSchema(payload.issues, currLen, inst);
              if (!isAborted) isAborted = aborted(payload, currLen);
            });
          else {
            if (payload.issues.length === currLen) continue;
            attachSchema(payload.issues, currLen, inst);
            if (!isAborted) isAborted = aborted(payload, currLen);
          }
        }
        if (asyncResult) return asyncResult.then(() => payload);
        return payload;
      };
      let handleCanaryResult = (canary, payload, ctx) => {
        if (aborted(canary)) {
          canary.aborted = true;
          return canary;
        }
        let checkResult = runChecks(payload, checks, ctx);
        if (checkResult instanceof Promise) {
          if (ctx.async === false) throw new $ZodAsyncError();
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
          if (ctx.async === false) throw new $ZodAsyncError();
          return result.then((result) => runChecks(result, checks, ctx));
        }
        return runChecks(result, checks, ctx);
      };
    }
  },
  {
    get "~standard"() {
      return shs(this, "~standard", standardProps(this));
    },
    set "~standard"(value) {
      own(this, "~standard", value);
    },
  },
);
var toStandardResult = (r, ctx) =>
  r.issues.length
    ? {
        issues: r.issues.map((iss) => finalizeIssue(iss, ctx, config())),
      }
    : {
        value: r.value,
      };
//@ chunk-7vp249v4.js:15969-16062 esm-fingerprint
async function validateAsync_2(inst, value) {
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
//@ chunk-7vp249v4.js:16062-16252 esm-fingerprint
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
      return validateAsync_2(inst, value);
    },
    vendor: "zod",
    version: 1,
  };
}
//@ chunk-7vp249v4.js:16252-16962 esm-fingerprint
var $ZodString = Fr("$ZodString", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = def.pattern ?? anyString;
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
var $ZodStringFormat = Fr("$ZodStringFormat", (inst, def) => {
  $ZodCheckStringFormat.init(inst, def);
  $ZodString.init(inst, def);
});
var $ZodGUID = Fr("$ZodGUID", (inst, def) => {
  def.pattern ?? (def.pattern = guid);
  $ZodStringFormat.init(inst, def);
});
var $ZodUUID = Fr("$ZodUUID", (inst, def) => {
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
    def.pattern ?? (def.pattern = uuid(v));
  } else def.pattern ?? (def.pattern = uuid());
  $ZodStringFormat.init(inst, def);
});
var $ZodEmail = Fr("$ZodEmail", (inst, def) => {
  def.pattern ?? (def.pattern = email);
  $ZodStringFormat.init(inst, def);
});
var URL_BAD_FORMAT = 1;
var URL_UNPARSEABLE = 2;
//@ chunk-7vp249v4.js:16962-17102 esm-fingerprint
function parseURLObject(trimmed, def) {
  if (!def.normalize && def.protocol?.source === httpProtocol.source && !/^https?:\/\//i.test(trimmed))
    return URL_BAD_FORMAT;
  try {
    return new URL(trimmed);
  } catch {
    return URL_UNPARSEABLE;
  }
}
//@ chunk-7vp249v4.js:17102-17121 esm-fingerprint
var asciiTabOrNewline = /[\t\n\r]/g;
//@ chunk-7vp249v4.js:17121-17160 esm-layout
function stripTabAndNewline(value) {
  return value.replace(asciiTabOrNewline, "");
}
//@ chunk-7vp249v4.js:17160-17217 esm-fingerprint
function urlHostnameOk(url, hostname) {
  hostname.lastIndex = 0;
  return hostname.test(url.hostname);
}
//@ chunk-7vp249v4.js:17217-17322 esm-fingerprint
function urlProtocolOk(url, protocol) {
  protocol.lastIndex = 0;
  return protocol.test(url.protocol.endsWith(":") ? url.protocol.slice(0, -1) : url.protocol);
}
//@ chunk-7vp249v4.js:17322-19131 esm-fingerprint
var $ZodURL = Fr("$ZodURL", (inst, def) => {
  $ZodStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    try {
      let trimmed = payload.value.trim();
      let url = parseURLObject(trimmed, def);
      if (url === URL_BAD_FORMAT) {
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
      if (url === URL_UNPARSEABLE) {
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
var $ZodEmoji = Fr("$ZodEmoji", (inst, def) => {
  def.pattern ?? (def.pattern = vr());
  $ZodStringFormat.init(inst, def);
});
var $ZodNanoID = Fr("$ZodNanoID", (inst, def) => {
  if (def.length !== undefined && (!Number.isInteger(def.length) || def.length < 1))
    throw Error(`Invalid nanoid length: ${def.length}`);
  def.pattern ?? (def.pattern = def.length === undefined ? nanoid : hr(def.length));
  $ZodStringFormat.init(inst, def);
});
var $ZodCUID = Fr("$ZodCUID", (inst, def) => {
  def.pattern ?? (def.pattern = ar);
  $ZodStringFormat.init(inst, def);
});
var $ZodCUID2 = Fr("$ZodCUID2", (inst, def) => {
  def.pattern ?? (def.pattern = cuid2);
  $ZodStringFormat.init(inst, def);
});
var $ZodULID = Fr("$ZodULID", (inst, def) => {
  def.pattern ?? (def.pattern = ulid);
  $ZodStringFormat.init(inst, def);
});
var $ZodXID = Fr("$ZodXID", (inst, def) => {
  def.pattern ?? (def.pattern = xid);
  $ZodStringFormat.init(inst, def);
});
var $ZodKSUID = Fr("$ZodKSUID", (inst, def) => {
  def.pattern ?? (def.pattern = ksuid);
  $ZodStringFormat.init(inst, def);
});
var $ZodISODateTime = Fr("$ZodISODateTime", (inst, def) => {
  def.pattern ?? (def.pattern = datetime(def));
  $ZodStringFormat.init(inst, def);
});
var $ZodISODate = Fr("$ZodISODate", (inst, def) => {
  def.pattern ?? (def.pattern = Or);
  $ZodStringFormat.init(inst, def);
});
var $ZodISOTime = Fr("$ZodISOTime", (inst, def) => {
  def.pattern ?? (def.pattern = Ar(def));
  $ZodStringFormat.init(inst, def);
});
var $ZodISODuration = Fr("$ZodISODuration", (inst, def) => {
  def.pattern ?? (def.pattern = duration);
  $ZodStringFormat.init(inst, def);
});
var $ZodIPv4 = Fr("$ZodIPv4", (inst, def) => {
  def.pattern ?? (def.pattern = ipv4);
  $ZodStringFormat.init(inst, def);
});
var ipv6Alphabet = /^[0-9a-fA-F:.]+$/;
//@ chunk-7vp249v4.js:19131-19225 esm-fingerprint
function isValidIPv6(value) {
  if (!ipv6Alphabet.test(value)) return false;
  try {
    new URL(`http://[${value}]`);
    return true;
  } catch {
    return false;
  }
}
//@ chunk-7vp249v4.js:19225-19422 esm-fingerprint
var $ZodIPv6 = Fr("$ZodIPv6", (inst, def) => {
  def.pattern ?? (def.pattern = ipv6);
  $ZodStringFormat.init(inst, def);
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
//@ chunk-7vp249v4.js:19422-19493 esm-fingerprint
var Co = Fr("$ZodCIDRv4", (inst, def) => {
  def.pattern ?? (def.pattern = cidrv4);
  $ZodStringFormat.init(inst, def);
});
//@ chunk-7vp249v4.js:19493-19653 esm-layout
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
//@ chunk-7vp249v4.js:19653-19854 esm-fingerprint
var $ZodCIDRv6 = Fr("$ZodCIDRv6", (inst, def) => {
  def.pattern ?? (def.pattern = cidrv6);
  $ZodStringFormat.init(inst, def);
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
//@ chunk-7vp249v4.js:19854-19978 esm-fingerprint
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
//@ chunk-7vp249v4.js:19978-20235 esm-fingerprint
var base64Charset = /^[0-9a-zA-Z+/]*={0,2}$/;
var $ZodBase64 = Fr("$ZodBase64", (inst, def) => {
  def.pattern ?? (def.pattern = base64Charset);
  $ZodStringFormat.init(inst, def);
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
var base64urlCharset = /^[A-Za-z0-9_-]*$/;
//@ chunk-7vp249v4.js:20235-20373 esm-fingerprint
function isValidBase64URL(data) {
  if (!base64urlCharset.test(data)) return false;
  let base64 = data.replace(/[-_]/g, (c) => (c === "-" ? "+" : "/"));
  let padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return isValidBase64(padded);
}
//@ chunk-7vp249v4.js:20373-20651 esm-fingerprint
var $ZodBase64URL = Fr("$ZodBase64URL", (inst, def) => {
  def.pattern ?? (def.pattern = base64urlCharset);
  $ZodStringFormat.init(inst, def);
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
var $ZodE164 = Fr("$ZodE164", (inst, def) => {
  def.pattern ?? (def.pattern = e164);
  $ZodStringFormat.init(inst, def);
});
//@ chunk-7vp249v4.js:20651-20894 esm-fingerprint
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
//@ chunk-7vp249v4.js:20894-21075 esm-fingerprint
var $ZodJWT = Fr("$ZodJWT", (inst, def) => {
  $ZodStringFormat.init(inst, def);
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
//@ chunk-7vp249v4.js:21075-21808 esm-fingerprint
var $ZodNumber = Fr("$ZodNumber", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = number;
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
var $ZodNumberFormat = Fr("$ZodNumberFormat", (inst, def) => {
  $ZodCheckNumberFormat.init(inst, def);
  $ZodNumber.init(inst, def);
});
var $ZodBoolean = Fr("$ZodBoolean", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = boolean;
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
//@ chunk-7vp249v4.js:21808-22534 esm-fingerprint
var Bo = Fr("$ZodUndefined", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = _undefined;
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
var $ZodNull = Fr("$ZodNull", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = _null;
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
var $ZodAny = Fr("$ZodAny", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload) => payload;
});
var $ZodUnknown = Fr("$ZodUnknown", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload) => payload;
});
var $ZodNever = Fr("$ZodNever", (inst, def) => {
  $ZodType.init(inst, def);
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
//@ chunk-7vp249v4.js:22534-22625 esm-fingerprint
function handleArrayResult(result, final, index) {
  if (result.issues.length) final.issues.push(...prefixIssues(index, result.issues));
  final.value[index] = result.value;
}
//@ chunk-7vp249v4.js:22625-23167 esm-fingerprint
var $ZodArray = Fr("$ZodArray", (inst, def) => {
  $ZodType.init(inst, def);
  let memo = globalConfig.memoizer;
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
        if (abortEarly && result.issues.length !== 0 && aborted(result)) break;
      }
    }
    if (proms.length) return Promise.all(proms).then(() => payload);
    return payload;
  };
});
//@ chunk-7vp249v4.js:23167-23553 esm-fingerprint
function handlePropertyResult(result, final, key, input, optin, optout) {
  let isPresent = key in input;
  let isOptionalOut = optout === "optional";
  if (!isPresent && isOptionalOut && optin === "optional") return;
  if (result.issues.length) {
    if (optin !== undefined && isOptionalOut && !isPresent) return;
    final.issues.push(...prefixIssues(key, result.issues));
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
//@ chunk-7vp249v4.js:23553-23563 esm-layout
var NO_SYMBOL_KEYS = [];
//@ chunk-7vp249v4.js:23563-23939 esm-fingerprint
function normalizeDef(def) {
  let keys = Object.keys(def.shape);
  let ownSymbols = Object.getOwnPropertySymbols(def.shape);
  let symbolKeys = ownSymbols.length ? ownSymbols : NO_SYMBOL_KEYS;
  let allKeys = symbolKeys.length ? [...keys, ...symbolKeys] : keys;
  for (let k of allKeys)
    if (!def.shape?.[k]?._zod?.traits?.has("$ZodType"))
      throw Error(`Invalid element at key "${String(k)}": expected a Zod schema`);
  let okeys = optionalKeys(def.shape);
  return {
    ...def,
    allKeys,
    symbolKeys,
    keySet: new Set(keys),
    numKeys: keys.length,
    optionalKeys: new Set(okeys),
  };
}
//@ chunk-7vp249v4.js:23939-24495 esm-fingerprint
function Xo(e, t, payload, ctx, i, inst, c) {
  let a = [];
  let keySet = i.keySet;
  let _zod = i.catchall._zod;
  let f = _zod.def.type;
  let { optin, optout } = _zod;
  let m = 0;
  for (let key in t) {
    if (c && payload.issues.length !== m) {
      if (aborted(payload, m)) break;
      m = payload.issues.length;
    }
    if (keySet.has(key)) continue;
    if (key === "__proto__") {
      if (f === "never") a.push(key);
      continue;
    }
    if (f === "never") {
      a.push(key);
      continue;
    }
    let g = _zod.run(
      {
        value: t[key],
        issues: [],
      },
      ctx,
    );
    if (g instanceof Promise) e.push(g.then((x) => handlePropertyResult(x, payload, key, t, optin, optout)));
    else handlePropertyResult(g, payload, key, t, optin, optout);
  }
  if (a.length)
    payload.issues.push({
      code: "unrecognized_keys",
      keys: a,
      input: t,
      inst,
      continue: true,
    });
  if (!e.length) return payload;
  return Promise.all(e).then(() => payload);
}
//@ chunk-7vp249v4.js:24495-28381 esm-fingerprint
var $ZodObject = Fr("$ZodObject", (inst, def) => {
  $ZodType.init(inst, def);
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
  let _normalized = cached(() => normalizeDef(def));
  defineLazyInternal(inst, "propValues", (zod) => {
    let shape = zod.def.shape;
    let propValues = {};
    for (let key in shape) {
      let field = shape[key]._zod;
      if (field.values) {
        if (!Object.prototype.hasOwnProperty.call(propValues, key)) assignProp(propValues, key, new Set());
        for (let v of field.values) propValues[key].add(v);
        if (field.optin !== undefined) propValues[key].add(undefined);
      }
    }
    return propValues;
  });
  let isObject_2 = isObject;
  let catchall = def.catchall;
  let value;
  let memo = globalConfig.memoizer;
  memo?.attach(inst);
  inst._zod.parse = (payload, ctx) => {
    value ?? (value = _normalized.value);
    let input = payload.value;
    if (!isObject_2(input)) {
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
        if (aborted(payload, seen)) break;
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
    return Xo(proms, input, payload, ctx, _normalized.value, inst, abortEarly === true);
  };
});
var $ZodObjectJIT = Fr("$ZodObjectJIT", (inst, def) => {
  $ZodObject.init(inst, def);
  let superParse = inst._zod.parse;
  let _normalized = cached(() => normalizeDef(def));
  let memo = globalConfig.memoizer;
  let generateFastpass = (shape) => {
    let normalized = _normalized.value;
    let syms = normalized.symbolKeys;
    let doc = new Doc(["payload", "ctx"], {
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
      let k = typeof key === "symbol" ? `syms[${syms.indexOf(key)}]` : cloneDef(key);
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
  let isObject_2 = isObject;
  let jit = !globalConfig.jitless;
  let fastEnabled = jit && allowsEval.value;
  let catchall = def.catchall;
  let value;
  inst._zod.parse = (payload, ctx) => {
    value ?? (value = _normalized.value);
    let input = payload.value;
    if (!isObject_2(input)) {
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
      return Xo([], input, payload, ctx, value, inst, ctx?.abortEarly === true);
    }
    return superParse(payload, ctx);
  };
});
//@ chunk-7vp249v4.js:28381-28662 esm-fingerprint
function to(results, payload, inst, ctx) {
  for (let s of results)
    if (s.issues.length === 0) {
      payload.value = s.value;
      return payload;
    }
  let filtered = results.filter((r) => !aborted(r));
  if (filtered.length === 1) {
    payload.value = filtered[0].value;
    return filtered[0];
  }
  payload.issues.push({
    code: "invalid_union",
    input: payload.value,
    inst,
    errors: results.map((result) => result.issues.map((iss) => finalizeIssue(iss, ctx, config()))),
  });
  return payload;
}
//@ chunk-7vp249v4.js:28662-29607 esm-fingerprint
var $ZodUnion = Fr("$ZodUnion", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazyInternal(inst, "optin", (zod) =>
    zod.def.options.some((o) => o._zod.optin === "defaulted")
      ? "defaulted"
      : zod.def.options.some((o) => o._zod.optin !== undefined)
        ? "optional"
        : undefined,
  );
  defineLazyInternal(inst, "optout", (zod) =>
    zod.def.options.some((o) => o._zod.optout === "optional") ? "optional" : undefined,
  );
  defineLazyInternal(inst, "values", (zod) => {
    if (zod.def.options.every((o) => o._zod.values))
      return new Set(zod.def.options.flatMap((option) => Array.from(option._zod.values)));
    return;
  });
  defineLazyInternal(inst, "pattern", (zod) => {
    if (zod.def.options.every((o) => o._zod.pattern)) {
      let patterns = zod.def.options.map((o) => o._zod.pattern);
      return new RegExp(`^(${patterns.map((p) => cleanRegex(p.source)).join("|")})$`);
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
    if (!async) return to(results, payload, inst, ctx);
    return Promise.all(results).then((results) => to(results, payload, inst, ctx));
  };
});
//@ chunk-7vp249v4.js:29607-29947 esm-fingerprint
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
//@ chunk-7vp249v4.js:29947-31503 esm-fingerprint
var $ZodDiscriminatedUnion = Fr("$ZodDiscriminatedUnion", (inst, def) => {
  def.inclusive = false;
  $ZodUnion.init(inst, def);
  let _super = inst._zod.parse;
  defineLazyInternal(inst, "propValues", (zod) => {
    let propValues = {};
    let undefinedCount = 0;
    for (let option of zod.def.options) {
      let pv = option._zod.propValues;
      if (!pv || Object.keys(pv).length === 0)
        throw Error(`Invalid discriminated union option at index "${zod.def.options.indexOf(option)}"`);
      if (pv[zod.def.discriminator]?.has(undefined)) undefinedCount++;
      for (let [k, v] of Object.entries(pv)) {
        if (!Object.prototype.hasOwnProperty.call(propValues, k)) assignProp(propValues, k, new Set());
        for (let val of v) propValues[k].add(val);
      }
    }
    if (!zod.def.unionFallback && undefinedCount > 1) propValues[zod.def.discriminator]?.delete(undefined);
    return propValues;
  });
  def.options.forEach((option, i) => {
    let propShape = rawShape(option._zod.def);
    if (propShape && !Object.prototype.hasOwnProperty.call(propShape, def.discriminator))
      throw Error(`Invalid discriminated union option at index "${i}"`);
  });
  let disc = cached(() => discriminatorMap(def));
  inst._zod.parse = (payload, ctx) => {
    let input = payload.value;
    if (!isObject(input)) {
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
var $ZodIntersection = Fr("$ZodIntersection", (inst, def) => {
  $ZodType.init(inst, def);
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
//@ chunk-7vp249v4.js:31503-32274 esm-fingerprint
function mergeValues(a, b) {
  if (a === b)
    return {
      valid: true,
      data: a,
    };
  if (a instanceof Date && b instanceof Date && +a === +b)
    return {
      valid: true,
      data: a,
    };
  if (isPlainObject(a) && isPlainObject(b)) {
    let bKeys = Object.keys(b);
    let sharedKeys = Object.keys(a).filter((key) => bKeys.indexOf(key) !== -1);
    let newObj = {
      ...a,
      ...b,
    };
    if (Object.prototype.hasOwnProperty.call(newObj, "__proto__")) delete newObj.__proto__;
    for (let key of sharedKeys) {
      if (key === "__proto__") continue;
      let sharedValue = mergeValues(a[key], b[key]);
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
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length)
      return {
        valid: false,
        mergeErrorPath: [],
      };
    let newArray = [];
    for (let index = 0; index < a.length; index++) {
      let itemA = a[index];
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
//@ chunk-7vp249v4.js:32274-33101 esm-fingerprint
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
    if (aborted(result)) return result;
    throw Error(`Unmergable intersection. Error path: ${JSON.stringify(merged.mergeErrorPath)}`);
  }
  result.value = merged.data;
  return result;
}
//@ chunk-7vp249v4.js:33101-34211 esm-fingerprint
var $ZodTuple = Fr("$ZodTuple", (inst, def) => {
  $ZodType.init(inst, def);
  let items = def.items;
  let memo = globalConfig.memoizer;
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
        if (abortEarly && !itemAborted && r.issues.length) itemAborted = aborted(r);
      }
    }
    if (def.rest && !itemAborted) {
      let i = items.length - 1;
      let rest = input.slice(items.length);
      let seen = payload.issues.length;
      for (let el of rest) {
        if (abortEarly && payload.issues.length !== seen) {
          if (aborted(payload, seen)) break;
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
//@ chunk-7vp249v4.js:34211-34351 esm-fingerprint
function getTupleOptStart(items, key) {
  for (let i = items.length - 1; i >= 0; i--)
    if (!(key === "optin" ? items[i]._zod.optin !== undefined : items[i]._zod.optout === "optional"))
      return i + 1;
  return 0;
}
//@ chunk-7vp249v4.js:34351-34442 esm-fingerprint
function handleTupleResult(result, final, index) {
  if (result.issues.length) final.issues.push(...prefixIssues(index, result.issues));
  final.value[index] = result.value;
}
//@ chunk-7vp249v4.js:34442-34826 esm-fingerprint
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
      final.issues.push(...prefixIssues(i, r.issues));
    }
    final.value[i] = r.value;
  }
  for (let i = final.value.length - 1; i >= input.length; i--)
    if (items[i]._zod.optout === "optional" && final.value[i] === undefined) final.value.length = i;
    else break;
  return final;
}
//@ chunk-7vp249v4.js:34826-37256 esm-fingerprint
var $ZodRecord = Fr("$ZodRecord", (inst, def) => {
  $ZodType.init(inst, def);
  let memo = globalConfig.memoizer;
  memo?.attach(inst);
  inst._zod.parse = (payload, ctx) => {
    let input = payload.value;
    if (!isPlainObject(input)) {
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
              issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config())),
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
                if (result.issues.length) payload.issues.push(...prefixIssues(key, result.issues));
                payload.value[outKey] = result.value;
              }),
            );
          else {
            if (result.issues.length) payload.issues.push(...prefixIssues(key, result.issues));
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
        if (keyResult instanceof Promise) throw Error("Async schemas not supported in object keys currently");
        if (typeof key === "string" && number.test(key) && keyResult.issues.length) {
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
              issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config())),
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
              if (result.issues.length) payload.issues.push(...prefixIssues(key, result.issues));
              payload.value[outKey] = result.value;
            }),
          );
        else {
          if (result.issues.length) payload.issues.push(...prefixIssues(key, result.issues));
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
//@ chunk-7vp249v4.js:37256-38038 esm-fingerprint
var on = Fr("$ZodEnum", (inst, def) => {
  $ZodType.init(inst, def);
  let values = iSr(def.entries);
  let valuesSet = new Set(values);
  inst._zod.values = valuesSet;
  defineLazyInternal(inst, "pattern", (zod) => {
    let patternValues = iSr(zod.def.entries).filter((k) => CIi.has(typeof k));
    return new RegExp(
      patternValues.length
        ? `^(${patternValues.map((o) => escapeRegex(o.toString())).join("|")})$`
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
var $ZodLiteral = Fr("$ZodLiteral", (inst, def) => {
  $ZodType.init(inst, def);
  let values = new Set(def.values);
  inst._zod.values = values;
  defineLazyInternal(inst, "pattern", (zod) => {
    let vals = zod.def.values;
    return new RegExp(
      vals.length
        ? `^(${vals.map((o) => (typeof o === "string" ? escapeRegex(o) : o ? escapeRegex(o.toString()) : String(o))).join("|")})$`
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
//@ chunk-7vp249v4.js:38038-38390 esm-fingerprint
var sn = Fr("$ZodTransform", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  globalConfig.memoizer?.guard(inst);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") throw new $ZodEncodeError(inst.constructor.name);
    let _out = def.transform(payload.value, payload);
    if (ctx.async)
      return (_out instanceof Promise ? _out : Promise.resolve(_out)).then((output) => {
        payload.value = output;
        return payload;
      });
    if (_out instanceof Promise) throw new $ZodAsyncError();
    payload.value = _out;
    return payload;
  };
});
//@ chunk-7vp249v4.js:38390-38455 esm-fingerprint
function handleOptionalResult(payload, result) {
  payload.value = result.issues.length ? undefined : result.value;
  return payload;
}
//@ chunk-7vp249v4.js:38455-40043 esm-fingerprint
var $ZodOptional = Fr("$ZodOptional", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazyInternal(inst, "optin", (zod) =>
    zod.def.innerType._zod.optin === "defaulted" ? "defaulted" : "optional",
  );
  inst._zod.optout = "optional";
  defineLazyInternal(inst, "values", (zod) => {
    let values = zod.def.innerType._zod.values;
    return values ? new Set([...values, undefined]) : undefined;
  });
  defineLazyInternal(inst, "pattern", (zod) => {
    let pattern = zod.def.innerType._zod.pattern;
    return pattern ? new RegExp(`^(${cleanRegex(pattern.source)})?$`) : undefined;
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
var $ZodExactOptional = Fr("$ZodExactOptional", (inst, def) => {
  $ZodOptional.init(inst, def);
  defineLazyInternal(inst, "values", (zod) => zod.def.innerType._zod.values);
  defineLazyInternal(inst, "pattern", (zod) => zod.def.innerType._zod.pattern);
  inst._zod.parse = (payload, ctx) => def.innerType._zod.run(payload, ctx);
});
var $ZodNullable = Fr("$ZodNullable", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazyInternal(inst, "optin", (zod) => zod.def.innerType._zod.optin);
  defineLazyInternal(inst, "optout", (zod) => zod.def.innerType._zod.optout);
  defineLazyInternal(inst, "pattern", (zod) => {
    let pattern = zod.def.innerType._zod.pattern;
    return pattern ? new RegExp(`^(${cleanRegex(pattern.source)}|null)$`) : undefined;
  });
  defineLazyInternal(inst, "values", (zod) =>
    zod.def.innerType._zod.values ? new Set([...zod.def.innerType._zod.values, null]) : undefined,
  );
  inst._zod.parse = (payload, ctx) => {
    if (payload.value === null) return payload;
    return def.innerType._zod.run(payload, ctx);
  };
});
var $ZodDefault = Fr("$ZodDefault", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "defaulted";
  defineLazyInternal(inst, "values", (zod) => zod.def.innerType._zod.values);
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
//@ chunk-7vp249v4.js:40043-40112 esm-fingerprint
function handleDefaultResult(payload, def) {
  if (payload.value === undefined) payload.value = def.defaultValue;
  return payload;
}
//@ chunk-7vp249v4.js:40112-40672 esm-fingerprint
var $ZodPrefault = Fr("$ZodPrefault", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "defaulted";
  defineLazyInternal(inst, "values", (zod) => zod.def.innerType._zod.values);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
    if (payload.value === undefined) payload.value = def.defaultValue;
    return def.innerType._zod.run(payload, ctx);
  };
});
var $ZodNonOptional = Fr("$ZodNonOptional", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazyInternal(inst, "values", (zod) => {
    let v = zod.def.innerType._zod.values;
    return v ? new Set([...v].filter((x) => x !== undefined)) : undefined;
  });
  inst._zod.parse = (payload, ctx) => {
    let result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) return result.then((result) => handleNonOptionalResult(result, inst));
    return handleNonOptionalResult(result, inst);
  };
});
//@ chunk-7vp249v4.js:40672-40817 esm-fingerprint
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
//@ chunk-7vp249v4.js:40817-41019 esm-fingerprint
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
      issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config())),
    },
    input: payload.value,
  });
  return payload;
}
//@ chunk-7vp249v4.js:41019-41457 esm-fingerprint
var $ZodCatch = Fr("$ZodCatch", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazyInternal(inst, "optin", (zod) =>
    zod.def.innerType._zod.optin === "defaulted" ? "defaulted" : "optional",
  );
  defineLazyInternal(inst, "optout", (zod) => zod.def.innerType._zod.optout);
  defineLazyInternal(inst, "values", (zod) => zod.def.innerType._zod.values);
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
//@ chunk-7vp249v4.js:41457-41930 esm-fingerprint
var $ZodPipe = Fr("$ZodPipe", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazyInternal(inst, "values", (zod) => zod.def.in._zod.values);
  defineLazyInternal(inst, "optin", (zod) => zod.def.in._zod.optin);
  defineLazyInternal(inst, "optout", (zod) => zod.def.out._zod.optout);
  defineLazyInternal(inst, "propValues", (zod) => zod.def.in._zod.propValues);
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
//@ chunk-7vp249v4.js:41930-42076 esm-fingerprint
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
//@ chunk-7vp249v4.js:42076-42542 esm-fingerprint
var dn = Fr("$ZodPreprocess", (inst, def) => {
  $ZodPipe.init(inst, def);
});
var $ZodReadonly = Fr("$ZodReadonly", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazyInternal(inst, "propValues", (zod) => zod.def.innerType._zod.propValues);
  defineLazyInternal(inst, "values", (zod) => zod.def.innerType._zod.values);
  defineLazyInternal(inst, "optin", (zod) => zod.def.innerType?._zod?.optin);
  defineLazyInternal(inst, "optout", (zod) => zod.def.innerType?._zod?.optout);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
    let result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) return result.then(freezeZodValue);
    return freezeZodValue(result);
  };
});
//@ chunk-7vp249v4.js:42542-42608 esm-fingerprint
function freezeZodValue(payload) {
  if (!payload.memo) payload.value = Object.freeze(payload.value);
  return payload;
}
//@ chunk-7vp249v4.js:42608-43213 esm-fingerprint
var nlo = Fr("$ZodLazy", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "innerType", () => {
    let d = def;
    if (!d._cachedInner) d._cachedInner = def.getter();
    return d._cachedInner;
  });
  defineLazyInternal(inst, "pattern", (r) => r.innerType?._zod?.pattern);
  defineLazyInternal(inst, "propValues", (r) => r.innerType?._zod?.propValues);
  defineLazyInternal(inst, "optin", (r) => r.innerType?._zod?.optin ?? undefined);
  defineLazyInternal(inst, "optout", (r) => r.innerType?._zod?.optout ?? undefined);
  inst._zod.parse = (payload, ctx) => inst._zod.innerType._zod.run(payload, ctx);
});
var hn = Fr("$ZodCustom", (inst, def) => {
  $ZodCheck.init(inst, def);
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, _) => payload;
  inst._zod.check = (payload) => {
    let input = payload.value;
    let r = def.fn(input);
    if (r instanceof Promise) return r.then((r) => handleRefineResult(r, payload, input, inst));
    handleRefineResult(r, payload, input, inst);
    return;
  };
});
//@ chunk-7vp249v4.js:43213-43406 esm-fingerprint
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
    payload.issues.push(issue(_iss));
  }
}
//@ chunk-7vp249v4.js:43406-43478 esm-fingerprint
function handlePropertiesResult(result, payload, key) {
  if (result.issues.length) payload.issues.push(...prefixIssues(key, result.issues));
}
//@ chunk-7vp249v4.js:43478-44335 esm-fingerprint
var $ZodProperties = Fr(
  "$ZodProperties",
  (inst, def) => {
    $ZodType.init(inst, def);
    $ZodCheck.init(inst, def);
    let memo = globalConfig.memoizer;
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
export {
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
  base64Charset,
  base64urlCharset,
};
