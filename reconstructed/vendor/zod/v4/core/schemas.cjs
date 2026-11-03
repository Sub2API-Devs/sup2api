/**
 * zod/v4/core/schemas.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { ep } from "./checks.cjs";
import { Xs } from "./core.cjs";
import { tp } from "./doc.cjs";
import { A_ } from "./parse.cjs";
import { Ul } from "./regexes.cjs";
import { Ee } from "./util.cjs";
import { M_ } from "./versions.cjs";

//@ chunk-1ny7cxrt.js:134598-181402 cjs-fingerprint
var Bl = x(function (T) {
  var zZ =
      (T && T.__createBinding) ||
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
    FZ =
      (T && T.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    ap =
      (T && T.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) zZ(t, e, key);
        }
        return (FZ(t, e), t);
      };
  Object.defineProperty(T, "__esModule", { value: !0 });
  T.$ZodObject =
    T.$ZodArray =
    T.$ZodDate =
    T.$ZodVoid =
    T.$ZodNever =
    T.$ZodUnknown =
    T.$ZodAny =
    T.$ZodNull =
    T.$ZodUndefined =
    T.$ZodSymbol =
    T.$ZodBigIntFormat =
    T.$ZodBigInt =
    T.$ZodBoolean =
    T.$ZodNumberFormat =
    T.$ZodNumber =
    T.$ZodCustomStringFormat =
    T.$ZodJWT =
    T.$ZodIBAN =
    T.$ZodCreditCard =
    T.$ZodE164 =
    T.$ZodBase64URL =
    T.base64urlCharset =
    T.$ZodBase64 =
    T.base64Charset =
    T.$ZodCIDRv6 =
    T.$ZodCIDRv4 =
    T.$ZodMAC =
    T.$ZodIPv6 =
    T.$ZodIPv4 =
    T.$ZodISODuration =
    T.$ZodISOTime =
    T.$ZodISODate =
    T.$ZodISODateTime =
    T.$ZodKSUID =
    T.$ZodXID =
    T.$ZodULID =
    T.$ZodCUID2 =
    T.$ZodCUID =
    T.$ZodNanoID =
    T.$ZodEmoji =
    T.$ZodURL =
    T.URL_UNPARSEABLE =
    T.URL_BAD_FORMAT =
    T.$ZodEmail =
    T.$ZodUUID =
    T.$ZodGUID =
    T.$ZodStringFormat =
    T.$ZodString =
    T.clone =
    T.$ZodType =
      void 0;
  T.$ZodProperties =
    T.$ZodCustom =
    T.$ZodLazy =
    T.$ZodPromise =
    T.$ZodFunction =
    T.$ZodTemplateLiteral =
    T.$ZodReadonly =
    T.$ZodPreprocess =
    T.$ZodCodec =
    T.$ZodPipe =
    T.$ZodNaN =
    T.$ZodCatch =
    T.$ZodSuccess =
    T.$ZodNonOptional =
    T.$ZodPrefault =
    T.$ZodDefault =
    T.$ZodNullable =
    T.$ZodExactOptional =
    T.$ZodOptional =
    T.$ZodTransform =
    T.$ZodFile =
    T.$ZodLiteral =
    T.$ZodEnum =
    T.$ZodSet =
    T.$ZodMap =
    T.$ZodRecord =
    T.$ZodTuple =
    T.$ZodIntersection =
    T.$ZodDiscriminatedUnion =
    T.$ZodXor =
    T.$ZodUnion =
    T.$ZodObjectJIT =
      void 0;
  T.standardProps = jP;
  T.parseURLObject = xP;
  T.stripTabAndNewline = LP;
  T.urlHostnameOk = NP;
  T.urlProtocolOk = UP;
  T.isValidIPv6 = x_;
  T.isValidCIDRv6 = zP;
  T.isValidBase64 = L_;
  T.isValidBase64URL = FP;
  T.isValidCreditCard = BP;
  T.isValidIBAN = HP;
  T.isValidJWT = KP;
  T.getDiscriminatedOption = YZ;
  T.mergeValues = sp;
  var qu = ap(ep()),
    se = ap(Xs()),
    RP = tp(),
    Qs = A_(),
    It = ap(Ul()),
    ee = ap(Ee()),
    DP = M_();
  T.$ZodType = se.$constructor(
    "$ZodType",
    (e, t) => {
      var n;
      (e ?? (e = {}), (e._zod.def = t), (e._zod.bag = e._zod.bag || {}), (e._zod.version = DP.version));
      let checks = e._zod.def.checks,
        r = e._zod.traits.has("$ZodCheck") ? [e, ...(checks ?? [])] : checks?.length ? [...checks] : [];
      for (let s of r) for (let a of s._zod.onattach) a(e);
      if (r.length === 0)
        ((n = e._zod).deferred ?? (n.deferred = []),
          e._zod.deferred?.push(() => {
            e._zod.run = e._zod.parse;
          }));
      else {
        let s = (l, c, u) => {
            if (l.memo) return l;
            let aborted = ee.aborted(l),
              h;
            for (let m of c) {
              if (m._zod.def.when) {
                if (ee.explicitlyAborted(l)) continue;
                if (!m._zod.def.when(l)) continue;
              } else if (aborted) continue;
              let y = l.issues.length,
                check = m._zod.check(l);
              if (check instanceof Promise && u?.async === !1) throw new se.$ZodAsyncError();
              if (h || check instanceof Promise)
                h = (h ?? Promise.resolve()).then(async () => {
                  if ((await check, l.issues.length === y)) return;
                  if ((ee.attachSchema(l.issues, y, e), !aborted)) aborted = ee.aborted(l, y);
                });
              else {
                if (l.issues.length === y) continue;
                if ((ee.attachSchema(l.issues, y, e), !aborted)) aborted = ee.aborted(l, y);
              }
            }
            if (h) return h.then(() => l);
            return l;
          },
          a = (l, c, u) => {
            if (ee.aborted(l)) return ((l.aborted = !0), l);
            let f = s(c, r, u);
            if (f instanceof Promise) {
              if (u.async === !1) throw new se.$ZodAsyncError();
              return f.then((h) => e._zod.parse(h, u));
            }
            return e._zod.parse(f, u);
          };
        e._zod.run = (l, c) => {
          if (c.skipChecks) return e._zod.parse(l, c);
          if (c.direction === "backward") {
            let parse = e._zod.parse({ value: l.value, issues: [] }, { ...c, skipChecks: !0 });
            if (parse instanceof Promise) return parse.then((h) => a(h, l, c));
            return a(parse, l, c);
          }
          let parse = e._zod.parse(l, c);
          if (parse instanceof Promise) {
            if (c.async === !1) throw new se.$ZodAsyncError();
            return parse.then((f) => s(f, r, c));
          }
          return s(parse, r, c);
        };
      }
    },
    {
      get "~standard"() {
        return ee.hide(this, "~standard", jP(this));
      },
      set "~standard"(e) {
        ee.own(this, "~standard", e);
      },
    },
  );
  var MP = (e, t) =>
    e.issues.length
      ? { issues: e.issues.map((issue) => ee.finalizeIssue(issue, t, se.config())) }
      : { value: e.value };
  async function BZ(e, t) {
    let n = { async: !0 };
    return MP(await e._zod.run({ value: t, issues: [] }, n), n);
  }
  function jP(e) {
    return {
      validate: (t) => {
        let n = { async: !1 };
        try {
          let run = e._zod.run({ value: t, issues: [] }, n);
          if (!(run instanceof Promise)) return MP(run, n);
        } catch (error) {}
        return BZ(e, t);
      },
      vendor: "zod",
      version: 1,
    };
  }
  var HZ = Ee();
  Object.defineProperty(T, "clone", {
    enumerable: !0,
    get: function () {
      return HZ.clone;
    },
  });
  T.$ZodString = se.$constructor("$ZodString", (e, t) => {
    (T.$ZodType.init(e, t),
      (e._zod.pattern = t.pattern ?? It.anyString),
      (e._zod.parse = (n, o) => {
        if (t.coerce)
          try {
            n.value = String(n.value);
          } catch (error) {}
        if (typeof n.value === "string") return n;
        return (n.issues.push({ expected: "string", code: "invalid_type", input: n.value, inst: e }), n);
      }));
  });
  T.$ZodStringFormat = se.$constructor("$ZodStringFormat", (e, t) => {
    (qu.$ZodCheckStringFormat.init(e, t), T.$ZodString.init(e, t));
  });
  T.$ZodGUID = se.$constructor("$ZodGUID", (e, t) => {
    (t.pattern ?? (t.pattern = It.guid), T.$ZodStringFormat.init(e, t));
  });
  T.$ZodUUID = se.$constructor("$ZodUUID", (e, t) => {
    if (t.version) {
      let o = { v1: 1, v2: 2, v3: 3, v4: 4, v5: 5, v6: 6, v7: 7, v8: 8 }[t.version];
      if (o === void 0) throw Error(`Invalid UUID version: "${t.version}"`);
      t.pattern ?? (t.pattern = It.uuid(o));
    } else t.pattern ?? (t.pattern = It.uuid());
    T.$ZodStringFormat.init(e, t);
  });
  T.$ZodEmail = se.$constructor("$ZodEmail", (e, t) => {
    (t.pattern ?? (t.pattern = It.email), T.$ZodStringFormat.init(e, t));
  });
  T.URL_BAD_FORMAT = 1;
  T.URL_UNPARSEABLE = 2;
  function xP(e, t) {
    if (!t.normalize && t.protocol?.source === It.httpProtocol.source && !/^https?:\/\//i.test(e))
      return T.URL_BAD_FORMAT;
    try {
      return new URL(e);
    } catch {
      return T.URL_UNPARSEABLE;
    }
  }
  var KZ = /[\t\n\r]/g;
  function LP(e) {
    return e.replace(KZ, "");
  }
  function NP(e, t) {
    return ((t.lastIndex = 0), t.test(e.hostname));
  }
  function UP(e, t) {
    return ((t.lastIndex = 0), t.test(e.protocol.endsWith(":") ? e.protocol.slice(0, -1) : e.protocol));
  }
  T.$ZodURL = se.$constructor("$ZodURL", (e, t) => {
    (T.$ZodStringFormat.init(e, t),
      (e._zod.check = (n) => {
        try {
          let trimmed = n.value.trim(),
            r = xP(trimmed, t);
          if (r === T.URL_BAD_FORMAT) {
            n.issues.push({
              code: "invalid_format",
              format: "url",
              note: "Invalid URL format",
              input: n.value,
              inst: e,
              continue: !t.abort,
            });
            return;
          }
          if (r === T.URL_UNPARSEABLE) {
            n.issues.push({
              code: "invalid_format",
              format: "url",
              input: n.value,
              inst: e,
              continue: !t.abort,
            });
            return;
          }
          if (t.hostname && !NP(r, t.hostname))
            n.issues.push({
              code: "invalid_format",
              format: "url",
              note: "Invalid hostname",
              pattern: t.hostname.source,
              input: n.value,
              inst: e,
              continue: !t.abort,
            });
          if (t.protocol && !UP(r, t.protocol))
            n.issues.push({
              code: "invalid_format",
              format: "url",
              note: "Invalid protocol",
              pattern: t.protocol.source,
              input: n.value,
              inst: e,
              continue: !t.abort,
            });
          n.value = t.normalize ? r.href : LP(trimmed);
          return;
        } catch (error) {
          n.issues.push({
            code: "invalid_format",
            format: "url",
            input: n.value,
            inst: e,
            continue: !t.abort,
          });
        }
      }));
  });
  T.$ZodEmoji = se.$constructor("$ZodEmoji", (e, t) => {
    (t.pattern ?? (t.pattern = It.emoji()), T.$ZodStringFormat.init(e, t));
  });
  T.$ZodNanoID = se.$constructor("$ZodNanoID", (e, t) => {
    if (t.length !== void 0 && (!Number.isInteger(t.length) || t.length < 1))
      throw Error(`Invalid nanoid length: ${t.length}`);
    (t.pattern ?? (t.pattern = t.length === void 0 ? It.nanoid : It.nanoidOfLength(t.length)),
      T.$ZodStringFormat.init(e, t));
  });
  T.$ZodCUID = se.$constructor("$ZodCUID", (e, t) => {
    (t.pattern ?? (t.pattern = It.cuid), T.$ZodStringFormat.init(e, t));
  });
  T.$ZodCUID2 = se.$constructor("$ZodCUID2", (e, t) => {
    (t.pattern ?? (t.pattern = It.cuid2), T.$ZodStringFormat.init(e, t));
  });
  T.$ZodULID = se.$constructor("$ZodULID", (e, t) => {
    (t.pattern ?? (t.pattern = It.ulid), T.$ZodStringFormat.init(e, t));
  });
  T.$ZodXID = se.$constructor("$ZodXID", (e, t) => {
    (t.pattern ?? (t.pattern = It.xid), T.$ZodStringFormat.init(e, t));
  });
  T.$ZodKSUID = se.$constructor("$ZodKSUID", (e, t) => {
    (t.pattern ?? (t.pattern = It.ksuid), T.$ZodStringFormat.init(e, t));
  });
  T.$ZodISODateTime = se.$constructor("$ZodISODateTime", (e, t) => {
    (t.pattern ?? (t.pattern = It.datetime(t)), T.$ZodStringFormat.init(e, t));
  });
  T.$ZodISODate = se.$constructor("$ZodISODate", (e, t) => {
    (t.pattern ?? (t.pattern = It.date), T.$ZodStringFormat.init(e, t));
  });
  T.$ZodISOTime = se.$constructor("$ZodISOTime", (e, t) => {
    (t.pattern ?? (t.pattern = It.time(t)), T.$ZodStringFormat.init(e, t));
  });
  T.$ZodISODuration = se.$constructor("$ZodISODuration", (e, t) => {
    (t.pattern ?? (t.pattern = It.duration), T.$ZodStringFormat.init(e, t));
  });
  T.$ZodIPv4 = se.$constructor("$ZodIPv4", (e, t) => {
    (t.pattern ?? (t.pattern = It.ipv4), T.$ZodStringFormat.init(e, t));
  });
  var ZZ = /^[0-9a-fA-F:.]+$/;
  function x_(e) {
    if (!ZZ.test(e)) return !1;
    try {
      return (new URL(`http://[${e}]`), !0);
    } catch {
      return !1;
    }
  }
  T.$ZodIPv6 = se.$constructor("$ZodIPv6", (e, t) => {
    (t.pattern ?? (t.pattern = It.ipv6),
      T.$ZodStringFormat.init(e, t),
      (e._zod.check = (n) => {
        if (!x_(n.value))
          n.issues.push({
            code: "invalid_format",
            format: "ipv6",
            input: n.value,
            inst: e,
            continue: !t.abort,
          });
      }));
  });
  T.$ZodMAC = se.$constructor("$ZodMAC", (e, t) => {
    (t.pattern ?? (t.pattern = It.mac(t.delimiter)), T.$ZodStringFormat.init(e, t));
  });
  T.$ZodCIDRv4 = se.$constructor("$ZodCIDRv4", (e, t) => {
    (t.pattern ?? (t.pattern = It.cidrv4), T.$ZodStringFormat.init(e, t));
  });
  function zP(e) {
    let parts = e.split("/");
    if (parts.length !== 2) return !1;
    let [n, o] = parts;
    if (!o) return !1;
    let r = Number(o);
    if (`${r}` !== o) return !1;
    if (r < 0 || r > 128) return !1;
    return x_(n);
  }
  T.$ZodCIDRv6 = se.$constructor("$ZodCIDRv6", (e, t) => {
    (t.pattern ?? (t.pattern = It.cidrv6),
      T.$ZodStringFormat.init(e, t),
      (e._zod.check = (n) => {
        if (!zP(n.value))
          n.issues.push({
            code: "invalid_format",
            format: "cidrv6",
            input: n.value,
            inst: e,
            continue: !t.abort,
          });
      }));
  });
  function L_(e) {
    if (e === "") return !0;
    if (/\s/.test(e)) return !1;
    if (e.length % 4 !== 0) return !1;
    try {
      return (atob(e), !0);
    } catch {
      return !1;
    }
  }
  T.base64Charset = /^[0-9a-zA-Z+/]*={0,2}$/;
  T.$ZodBase64 = se.$constructor("$ZodBase64", (e, t) => {
    (t.pattern ?? (t.pattern = T.base64Charset),
      T.$ZodStringFormat.init(e, t),
      (e._zod.check = (n) => {
        if (L_(n.value)) return;
        n.issues.push({
          code: "invalid_format",
          format: "base64",
          input: n.value,
          inst: e,
          continue: !t.abort,
        });
      }));
  });
  T.base64urlCharset = /^[A-Za-z0-9_-]*$/;
  function FP(e) {
    if (!T.base64urlCharset.test(e)) return !1;
    let replaced = e.replace(/[-_]/g, (o) => (o === "-" ? "+" : "/")),
      padded = replaced.padEnd(Math.ceil(replaced.length / 4) * 4, "=");
    return L_(padded);
  }
  T.$ZodBase64URL = se.$constructor("$ZodBase64URL", (e, t) => {
    (t.pattern ?? (t.pattern = T.base64urlCharset),
      T.$ZodStringFormat.init(e, t),
      (e._zod.check = (n) => {
        if (FP(n.value)) return;
        n.issues.push({
          code: "invalid_format",
          format: "base64url",
          input: n.value,
          inst: e,
          continue: !t.abort,
        });
      }));
  });
  T.$ZodE164 = se.$constructor("$ZodE164", (e, t) => {
    (t.pattern ?? (t.pattern = It.e164), T.$ZodStringFormat.init(e, t));
  });
  var VZ = /[- ]/g;
  function qZ(e) {
    let t = e.length,
      n = 1,
      o = 0;
    while (t) {
      let r = e.charCodeAt(--t) - 48;
      ((n ^= 1), (o += n ? [0, 2, 4, 6, 8, 1, 3, 5, 7, 9][r] : r));
    }
    return o % 10 === 0;
  }
  function BP(e) {
    if (!It.creditCard.test(e)) return !1;
    return qZ(e.replace(VZ, ""));
  }
  T.$ZodCreditCard = se.$constructor("$ZodCreditCard", (e, t) => {
    (t.pattern ?? (t.pattern = It.creditCard),
      T.$ZodStringFormat.init(e, t),
      (e._zod.check = (n) => {
        if (BP(n.value)) return;
        n.issues.push({
          code: "invalid_format",
          format: "credit_card",
          input: n.value,
          inst: e,
          continue: !t.abort,
        });
      }));
  });
  function GZ(e) {
    let t = 0,
      n = e.length;
    for (let o = 4; o < n; o++) {
      let code = e.charCodeAt(o);
      t = (code >= 65 ? t * 100 + (code - 55) : t * 10 + (code - 48)) % 97;
    }
    for (let o = 0; o < 4; o++) {
      let code = e.charCodeAt(o);
      t = (code >= 65 ? t * 100 + (code - 55) : t * 10 + (code - 48)) % 97;
    }
    return t === 1;
  }
  function HP(e) {
    if (!It.iban.test(e)) return !1;
    return GZ(e);
  }
  T.$ZodIBAN = se.$constructor("$ZodIBAN", (e, t) => {
    (t.pattern ?? (t.pattern = It.iban),
      T.$ZodStringFormat.init(e, t),
      (e._zod.check = (n) => {
        if (HP(n.value)) return;
        n.issues.push({
          code: "invalid_format",
          format: "iban",
          input: n.value,
          inst: e,
          continue: !t.abort,
        });
      }));
  });
  function KP(e, t = null) {
    try {
      let parts = e.split(".");
      if (parts.length !== 3) return !1;
      let [o] = parts;
      if (!o) return !1;
      let parsed = JSON.parse(atob(o));
      if ("typ" in parsed && parsed?.typ !== "JWT") return !1;
      if (!parsed.alg) return !1;
      if (t && (!("alg" in parsed) || parsed.alg !== t)) return !1;
      return !0;
    } catch {
      return !1;
    }
  }
  T.$ZodJWT = se.$constructor("$ZodJWT", (e, t) => {
    (T.$ZodStringFormat.init(e, t),
      (e._zod.check = (n) => {
        if (KP(n.value, t.alg)) return;
        n.issues.push({ code: "invalid_format", format: "jwt", input: n.value, inst: e, continue: !t.abort });
      }));
  });
  T.$ZodCustomStringFormat = se.$constructor("$ZodCustomStringFormat", (e, t) => {
    (T.$ZodStringFormat.init(e, t),
      (e._zod.check = (n) => {
        if (t.fn(n.value)) return;
        n.issues.push({
          code: "invalid_format",
          format: t.format,
          input: n.value,
          inst: e,
          continue: !t.abort,
        });
      }));
  });
  T.$ZodNumber = se.$constructor("$ZodNumber", (e, t) => {
    (T.$ZodType.init(e, t),
      (e._zod.pattern = It.number),
      (e._zod.parse = (n, o) => {
        if (t.coerce)
          try {
            n.value = Number(n.value);
          } catch (error) {}
        let r = n.value;
        if (typeof r === "number" && !Number.isNaN(r) && Number.isFinite(r)) return n;
        let s =
          typeof r === "number"
            ? Number.isNaN(r)
              ? "NaN"
              : !Number.isFinite(r)
                ? String(r)
                : void 0
            : void 0;
        return (
          n.issues.push({
            expected: "number",
            code: "invalid_type",
            input: r,
            inst: e,
            ...(s ? { received: s } : {}),
          }),
          n
        );
      }));
  });
  T.$ZodNumberFormat = se.$constructor("$ZodNumberFormat", (e, t) => {
    (qu.$ZodCheckNumberFormat.init(e, t), T.$ZodNumber.init(e, t));
  });
  T.$ZodBoolean = se.$constructor("$ZodBoolean", (e, t) => {
    (T.$ZodType.init(e, t),
      (e._zod.pattern = It.boolean),
      (e._zod.parse = (n, o) => {
        if (t.coerce)
          try {
            n.value = Boolean(n.value);
          } catch (error) {}
        let r = n.value;
        if (typeof r === "boolean") return n;
        return (n.issues.push({ expected: "boolean", code: "invalid_type", input: r, inst: e }), n);
      }));
  });
  T.$ZodBigInt = se.$constructor("$ZodBigInt", (e, t) => {
    (T.$ZodType.init(e, t),
      (e._zod.pattern = It.bigint),
      (e._zod.parse = (n, o) => {
        if (t.coerce)
          try {
            n.value = BigInt(n.value);
          } catch (error) {}
        if (typeof n.value === "bigint") return n;
        return (n.issues.push({ expected: "bigint", code: "invalid_type", input: n.value, inst: e }), n);
      }));
  });
  T.$ZodBigIntFormat = se.$constructor("$ZodBigIntFormat", (e, t) => {
    (qu.$ZodCheckBigIntFormat.init(e, t), T.$ZodBigInt.init(e, t));
  });
  T.$ZodSymbol = se.$constructor("$ZodSymbol", (e, t) => {
    (T.$ZodType.init(e, t),
      (e._zod.parse = (n, o) => {
        let r = n.value;
        if (typeof r === "symbol") return n;
        return (n.issues.push({ expected: "symbol", code: "invalid_type", input: r, inst: e }), n);
      }));
  });
  T.$ZodUndefined = se.$constructor("$ZodUndefined", (e, t) => {
    (T.$ZodType.init(e, t),
      (e._zod.pattern = It.undefined),
      (e._zod.values = new Set([void 0])),
      (e._zod.parse = (n, o) => {
        let r = n.value;
        if (typeof r > "u") return n;
        return (n.issues.push({ expected: "undefined", code: "invalid_type", input: r, inst: e }), n);
      }));
  });
  T.$ZodNull = se.$constructor("$ZodNull", (e, t) => {
    (T.$ZodType.init(e, t),
      (e._zod.pattern = It.null),
      (e._zod.values = new Set([null])),
      (e._zod.parse = (n, o) => {
        let r = n.value;
        if (r === null) return n;
        return (n.issues.push({ expected: "null", code: "invalid_type", input: r, inst: e }), n);
      }));
  });
  T.$ZodAny = se.$constructor("$ZodAny", (e, t) => {
    (T.$ZodType.init(e, t), (e._zod.parse = (n) => n));
  });
  T.$ZodUnknown = se.$constructor("$ZodUnknown", (e, t) => {
    (T.$ZodType.init(e, t), (e._zod.parse = (n) => n));
  });
  T.$ZodNever = se.$constructor("$ZodNever", (e, t) => {
    (T.$ZodType.init(e, t),
      (e._zod.parse = (n, o) => (
        n.issues.push({ expected: "never", code: "invalid_type", input: n.value, inst: e }),
        n
      )));
  });
  T.$ZodVoid = se.$constructor("$ZodVoid", (e, t) => {
    (T.$ZodType.init(e, t),
      (e._zod.parse = (n, o) => {
        let r = n.value;
        if (typeof r > "u") return n;
        return (n.issues.push({ expected: "void", code: "invalid_type", input: r, inst: e }), n);
      }));
  });
  T.$ZodDate = se.$constructor("$ZodDate", (e, t) => {
    (T.$ZodType.init(e, t),
      (e._zod.parse = (n, o) => {
        if (t.coerce)
          try {
            n.value = new Date(n.value);
          } catch (error) {}
        let r = n.value,
          s = r instanceof Date;
        if (s && !Number.isNaN(r.getTime())) return n;
        return (
          n.issues.push({
            expected: "date",
            code: "invalid_type",
            input: r,
            ...(s ? { received: "Invalid Date" } : {}),
            inst: e,
          }),
          n
        );
      }));
  });
  function gP(e, t, n) {
    if (e.issues.length) t.issues.push(...ee.prefixIssues(n, e.issues));
    t.value[n] = e.value;
  }
  T.$ZodArray = se.$constructor("$ZodArray", (e, t) => {
    T.$ZodType.init(e, t);
    let memoizer = se.globalConfig.memoizer;
    (memoizer?.attach(e),
      (e._zod.parse = (o, r) => {
        let s = o.value;
        if (!Array.isArray(s))
          return (o.issues.push({ expected: "array", code: "invalid_type", input: s, inst: e }), o);
        o.value = memoizer ? memoizer.alloc(e, o, Array(s.length), r) : Array(s.length);
        let a = [],
          l = r?.abortEarly;
        for (let c = 0; c < s.length; c++) {
          let u = s[c],
            run = t.element._zod.run({ value: u, issues: [] }, r);
          if (run instanceof Promise) a.push(run.then((h) => gP(h, o, c)));
          else if ((gP(run, o, c), l && run.issues.length !== 0 && ee.aborted(run))) break;
        }
        if (a.length) return Promise.all(a).then(() => o);
        return o;
      }));
  });
  function op(e, t, n, o, r, s) {
    let a = n in o,
      l = s === "optional";
    if (!a && l && r === "optional") return;
    if (e.issues.length) {
      if (r !== void 0 && l && !a) return;
      t.issues.push(...ee.prefixIssues(n, e.issues));
    }
    if (!a && r === void 0) {
      if (!e.issues.length)
        t.issues.push({ code: "invalid_type", expected: "nonoptional", input: void 0, path: [n] });
      return;
    }
    if (e.value === void 0) {
      if (a || (r === "defaulted" && !l)) t.value[n] = void 0;
    } else t.value[n] = e.value;
  }
  var WZ = [];
  function ZP(e) {
    let keys = Object.keys(e.shape),
      ownPropertySymbols = Object.getOwnPropertySymbols(e.shape),
      o = ownPropertySymbols.length ? ownPropertySymbols : WZ,
      r = o.length ? [...keys, ...o] : keys;
    for (let a of r)
      if (!e.shape?.[a]?._zod?.traits?.has("$ZodType"))
        throw Error(`Invalid element at key "${String(a)}": expected a Zod schema`);
    let optionalKeys = ee.optionalKeys(e.shape);
    return {
      ...e,
      allKeys: r,
      symbolKeys: o,
      keySet: new Set(keys),
      numKeys: keys.length,
      optionalKeys: new Set(optionalKeys),
    };
  }
  function VP(e, t, n, o, r, s, a) {
    let l = [],
      keySet = r.keySet,
      _zod = r.catchall._zod,
      f = _zod.def.type,
      { optin: optin, optout: optout } = _zod,
      y = 0;
    for (let key in t) {
      if (a && n.issues.length !== y) {
        if (ee.aborted(n, y)) break;
        y = n.issues.length;
      }
      if (keySet.has(key)) continue;
      if (key === "__proto__") {
        if (f === "never") l.push(key);
        continue;
      }
      if (f === "never") {
        l.push(key);
        continue;
      }
      let run = _zod.run({ value: t[key], issues: [] }, o);
      if (run instanceof Promise) e.push(run.then((S) => op(S, n, key, t, optin, optout)));
      else op(run, n, key, t, optin, optout);
    }
    if (l.length) n.issues.push({ code: "unrecognized_keys", keys: l, input: t, inst: s, continue: !0 });
    if (!e.length) return n;
    return Promise.all(e).then(() => n);
  }
  T.$ZodObject = se.$constructor("$ZodObject", (e, t) => {
    T.$ZodType.init(e, t);
    let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(t, "shape"),
      o = ownPropertyDescriptor?.get ? ownPropertyDescriptor.get.raw : (t.shape ?? {});
    if (o) {
      let u = () => {
        let f = { ...o };
        return (Object.defineProperty(t, "shape", { value: f }), (u.raw = f), f);
      };
      ((u.raw = o), Object.defineProperty(t, "shape", { get: u }));
    }
    let cached = ee.cached(() => ZP(t));
    ee.defineLazyInternal(e, "propValues", (u) => {
      let shape = u.def.shape,
        h = {};
      for (let key in shape) {
        let _zod = shape[key]._zod;
        if (_zod.values) {
          if (!Object.prototype.hasOwnProperty.call(h, key)) ee.assignProp(h, key, new Set());
          for (let b of _zod.values) h[key].add(b);
          if (_zod.optin !== void 0) h[key].add(void 0);
        }
      }
      return h;
    });
    let isObject = ee.isObject,
      catchall = t.catchall,
      l,
      memoizer = se.globalConfig.memoizer;
    (memoizer?.attach(e),
      (e._zod.parse = (u, f) => {
        l ?? (l = cached.value);
        let h = u.value;
        if (!isObject(h))
          return (u.issues.push({ expected: "object", code: "invalid_type", input: h, inst: e }), u);
        u.value = memoizer ? memoizer.alloc(e, u, {}, f) : {};
        let m = [],
          shape = l.shape,
          b = f?.abortEarly,
          w = u.issues.length;
        for (let allKey of l.allKeys) {
          if (b && u.issues.length !== w) {
            if (ee.aborted(u, w)) break;
            w = u.issues.length;
          }
          if (allKey === "__proto__") continue;
          let j = shape[allKey],
            optin = j._zod.optin,
            optout = j._zod.optout,
            run = j._zod.run({ value: h[allKey], issues: [] }, f);
          if (run instanceof Promise) m.push(run.then((F) => op(F, u, allKey, h, optin, optout)));
          else op(run, u, allKey, h, optin, optout);
        }
        if (!catchall) return m.length ? Promise.all(m).then(() => u) : u;
        return VP(m, h, u, f, cached.value, e, b === !0);
      }));
  });
  T.$ZodObjectJIT = se.$constructor("$ZodObjectJIT", (e, t) => {
    T.$ZodObject.init(e, t);
    let parse = e._zod.parse,
      cached = ee.cached(() => ZP(t)),
      memoizer = se.globalConfig.memoizer,
      s = (y) => {
        let b = cached.value,
          symbolKeys = b.symbolKeys,
          S = new RP.Doc(["payload", "ctx"], { shape: y, inst: e, memo: memoizer, syms: symbolKeys }),
          j = (F) => `shape[${F}]._zod.run({ value: input[${F}], issues: [] }, ctx)`,
          M = (F, X) => `
          let ${F}_ab = false;
          for (let i = 0; i < ${F}.issues.length; i++) {
            const iss = ${F}.issues[i];
            iss.path = iss.path ? [${X}, ...iss.path] : [${X}];
            payload.issues.push(iss);
            if (iss.continue !== true) ${F}_ab = true;
          }
          if (${F}_ab && ctx && ctx.abortEarly) {
            payload.value = newResult;
            return payload;
          }`;
        S.write("const input = payload.value;");
        let create = Object.create(null),
          Z = 0;
        for (let allKey of b.allKeys) create[allKey] = `key_${Z++}`;
        S.write(memoizer ? "const newResult = memo.alloc(inst, payload, {}, ctx);" : "const newResult = {};");
        for (let allKey of b.allKeys) {
          if (allKey === "__proto__") continue;
          let X = create[allKey],
            he = typeof allKey === "symbol" ? `syms[${symbolKeys.indexOf(allKey)}]` : ee.esc(allKey),
            Me = `${he} in input`,
            ce = y[allKey],
            Ne = ce?._zod?.optin,
            be = Ne !== void 0,
            ve = ce?._zod?.optout === "optional";
          if ((S.write(`const ${X} = ${j(he)};`), be && ve)) {
            let Ue = Ne === "optional" ? `${X}_present` : `${X}.value !== undefined || ${X}_present`;
            S.write(`
        const ${X}_present = ${Me};
        if (!${X}.issues.length || ${X}_present) {
          if (${X}.issues.length) {${M(X, he)}
          }

          if (${Ue}) {
            newResult[${he}] = ${X}.value;
          }
        }

      `);
          } else if (!be)
            S.write(`
        const ${X}_present = ${Me};
        if (${X}.issues.length) {${M(X, he)}
        }
        if (!${X}_present && !${X}.issues.length) {
          payload.issues.push({
            code: "invalid_type",
            expected: "nonoptional",
            input: undefined,
            path: [${he}]
          });
          if (ctx && ctx.abortEarly) {
            payload.value = newResult;
            return payload;
          }
        }

        if (${X}_present) {
          newResult[${he}] = ${X}.value;
        }

      `);
          else if (
            (S.write(`
        if (${X}.issues.length) {${M(X, he)}
        }
      `),
            Ne === "defaulted")
          )
            S.write(`newResult[${he}] = ${X}.value;`);
          else
            S.write(`
        if (${X}.value !== undefined || ${Me}) {
          newResult[${he}] = ${X}.value;
        }
      `);
        }
        return (S.write("payload.value = newResult;"), S.write("return payload;"), S.compile());
      },
      a,
      isObject = ee.isObject,
      c = !se.globalConfig.jitless,
      allowsEval = ee.allowsEval,
      f = c && allowsEval.value,
      catchall = t.catchall,
      m;
    e._zod.parse = (y, b) => {
      m ?? (m = cached.value);
      let w = y.value;
      if (!isObject(w))
        return (y.issues.push({ expected: "object", code: "invalid_type", input: w, inst: e }), y);
      if (c && f && b?.async === !1 && b.jitless !== !0) {
        if (!a) a = s(t.shape);
        if (((y = a(y, b)), !catchall)) return y;
        return VP([], w, y, b, m, e, b?.abortEarly === !0);
      }
      return parse(y, b);
    };
  });
  function yP(e, t, n, o) {
    for (let s of e) if (s.issues.length === 0) return ((t.value = s.value), t);
    let filtered = e.filter((s) => !ee.aborted(s));
    if (filtered.length === 1) return ((t.value = filtered[0].value), filtered[0]);
    return (
      t.issues.push({
        code: "invalid_union",
        input: t.value,
        inst: n,
        errors: e.map((s) => s.issues.map((issue) => ee.finalizeIssue(issue, o, se.config()))),
      }),
      t
    );
  }
  T.$ZodUnion = se.$constructor("$ZodUnion", (e, t) => {
    (T.$ZodType.init(e, t),
      ee.defineLazyInternal(e, "optin", (o) =>
        o.def.options.some((option) => option._zod.optin === "defaulted")
          ? "defaulted"
          : o.def.options.some((option) => option._zod.optin !== void 0)
            ? "optional"
            : void 0,
      ),
      ee.defineLazyInternal(e, "optout", (o) =>
        o.def.options.some((option) => option._zod.optout === "optional") ? "optional" : void 0,
      ),
      ee.defineLazyInternal(e, "values", (o) => {
        if (o.def.options.every((option) => option._zod.values))
          return new Set(o.def.options.flatMap((option) => Array.from(option._zod.values)));
        return;
      }),
      ee.defineLazyInternal(e, "pattern", (o) => {
        if (o.def.options.every((option) => option._zod.pattern)) {
          let mapped = o.def.options.map((option) => option._zod.pattern);
          return new RegExp(`^(${mapped.map((s) => ee.cleanRegex(s.source)).join("|")})$`);
        }
        return;
      }));
    let n = t.options.length === 1 ? t.options[0]._zod.run : null;
    e._zod.parse = (o, r) => {
      if (n) return n(o, r);
      let s = !1,
        a = [];
      for (let option of t.options) {
        let run = option._zod.run({ value: o.value, issues: [] }, r);
        if (run instanceof Promise) (a.push(run), (s = !0));
        else {
          if (run.issues.length === 0) return run;
          a.push(run);
        }
      }
      if (!s) return yP(a, o, e, r);
      return Promise.all(a).then((l) => yP(l, o, e, r));
    };
  });
  function _P(e, t, n, o) {
    let r = [];
    for (let s = 0; s < e.length; s++) if (e[s].issues.length === 0) r.push(s);
    if (r.length === 1) return ((t.value = e[r[0]].value), t);
    if (r.length === 0)
      t.issues.push({
        code: "invalid_union",
        input: t.value,
        inst: n,
        errors: e.map((s) => s.issues.map((issue) => ee.finalizeIssue(issue, o, se.config()))),
      });
    else
      t.issues.push({
        code: "invalid_union",
        input: t.value,
        inst: n,
        errors: [],
        inclusive: !1,
        matches: r,
      });
    return t;
  }
  T.$ZodXor = se.$constructor("$ZodXor", (e, t) => {
    (T.$ZodUnion.init(e, t), (t.inclusive = !1));
    let n = t.options.length === 1 ? t.options[0]._zod.run : null;
    e._zod.parse = (o, r) => {
      if (n) return n(o, r);
      let s = !1,
        a = [];
      for (let option of t.options) {
        let run = option._zod.run({ value: o.value, issues: [] }, r);
        if (run instanceof Promise) (a.push(run), (s = !0));
        else a.push(run);
      }
      if (!s) return _P(a, o, e, r);
      return Promise.all(a).then((l) => _P(l, o, e, r));
    };
  });
  function YZ(e, t) {
    let _zod = e._zod,
      optionsMap = _zod.bag.optionsMap;
    if (!optionsMap) ((optionsMap = qP(_zod.def)), (_zod.bag.optionsMap = optionsMap));
    let r = optionsMap.get(t);
    if (r === null) throw Error(`Ambiguous discriminator value "${String(t)}"`);
    return r;
  }
  function qP(e) {
    let t = new Map();
    for (let option of e.options) {
      let o = option._zod.propValues?.[e.discriminator];
      if (!o || o.size === 0)
        throw Error(`Invalid discriminated union option at index "${e.options.indexOf(option)}"`);
      for (let r of o)
        if (t.has(r)) {
          if (r !== void 0) throw Error(`Duplicate discriminator value "${String(r)}"`);
          t.set(r, null);
        } else t.set(r, option);
    }
    return t;
  }
  T.$ZodDiscriminatedUnion = se.$constructor("$ZodDiscriminatedUnion", (e, t) => {
    ((t.inclusive = !1), T.$ZodUnion.init(e, t));
    let parse = e._zod.parse;
    (ee.defineLazyInternal(e, "propValues", (r) => {
      let s = {},
        a = 0;
      for (let option of r.def.options) {
        let propValues = option._zod.propValues;
        if (!propValues || Object.keys(propValues).length === 0)
          throw Error(`Invalid discriminated union option at index "${r.def.options.indexOf(option)}"`);
        if (propValues[r.def.discriminator]?.has(void 0)) a++;
        for (let [u, f] of Object.entries(propValues)) {
          if (!Object.prototype.hasOwnProperty.call(s, u)) ee.assignProp(s, u, new Set());
          for (let h of f) s[u].add(h);
        }
      }
      if (!r.def.unionFallback && a > 1) s[r.def.discriminator]?.delete(void 0);
      return s;
    }),
      t.options.forEach((option, s) => {
        let rawShape = ee.rawShape(option._zod.def);
        if (rawShape && !Object.prototype.hasOwnProperty.call(rawShape, t.discriminator))
          throw Error(`Invalid discriminated union option at index "${s}"`);
      }));
    let cached = ee.cached(() => qP(t));
    e._zod.parse = (r, s) => {
      let a = r.value;
      if (!ee.isObject(a))
        return (r.issues.push({ code: "invalid_type", expected: "object", input: a, inst: e }), r);
      let l = a?.[t.discriminator],
        c = cached.value.get(l);
      if (c && (l !== void 0 || s.direction !== "backward")) return c._zod.run(r, s);
      if (t.unionFallback || s.direction === "backward") return parse(r, s);
      return (
        r.issues.push({
          code: "invalid_union",
          errors: [],
          note: "No matching discriminator",
          discriminator: t.discriminator,
          options: Array.from(cached.value.keys()).filter((u) => cached.value.get(u) !== null),
          input: a,
          path: [t.discriminator],
          inst: e,
        }),
        r
      );
    };
  });
  T.$ZodIntersection = se.$constructor("$ZodIntersection", (e, t) => {
    (T.$ZodType.init(e, t),
      (e._zod.parse = (n, o) => {
        let r = n.value,
          run = t.left._zod.run({ value: r, issues: [] }, o),
          run_2 = t.right._zod.run({ value: r, issues: [] }, o);
        if (run instanceof Promise || run_2 instanceof Promise)
          return Promise.all([run, run_2]).then(([c, u]) => bP(n, c, u));
        return bP(n, run, run_2);
      }));
  });
  function sp(e, t) {
    if (e === t) return { valid: !0, data: e };
    if (e instanceof Date && t instanceof Date && +e === +t) return { valid: !0, data: e };
    if (ee.isPlainObject(e) && ee.isPlainObject(t)) {
      let keys = Object.keys(t),
        filtered = Object.keys(e).filter((s) => keys.indexOf(s) !== -1),
        r = { ...e, ...t };
      if (Object.prototype.hasOwnProperty.call(r, "__proto__")) delete r.__proto__;
      for (let s of filtered) {
        if (s === "__proto__") continue;
        let a = sp(e[s], t[s]);
        if (!a.valid) return { valid: !1, mergeErrorPath: [s, ...a.mergeErrorPath] };
        r[s] = a.data;
      }
      return { valid: !0, data: r };
    }
    if (Array.isArray(e) && Array.isArray(t)) {
      if (e.length !== t.length) return { valid: !1, mergeErrorPath: [] };
      let n = [];
      for (let o = 0; o < e.length; o++) {
        let r = e[o],
          s = t[o],
          a = sp(r, s);
        if (!a.valid) return { valid: !1, mergeErrorPath: [o, ...a.mergeErrorPath] };
        n.push(a.data);
      }
      return { valid: !0, data: n };
    }
    return { valid: !1, mergeErrorPath: [] };
  }
  function bP(e, t, n) {
    let o = new Map(),
      r,
      s = new Map(),
      a = (u, f) => {
        let h;
        if (u.code === "unrecognized_keys" && !u.path?.length) (r ?? (r = u), (h = u.keys));
        else if (u.code === "invalid_key" && u.origin === "record" && u.path?.length === 1) {
          let m = String(u.path[0]);
          if (!s.has(m)) s.set(m, u);
          h = [m];
        } else return !1;
        for (let m of h) {
          if (!o.has(m)) o.set(m, {});
          o.get(m)[f] = !0;
        }
        return !0;
      };
    for (let issue of t.issues) if (!a(issue, "l")) e.issues.push(issue);
    for (let issue of n.issues) if (!a(issue, "r")) e.issues.push(issue);
    let mapped = [...o].filter(([, u]) => u.l && u.r).map(([u]) => u);
    if (mapped.length) {
      let u = r ? mapped.filter((f) => r.keys.includes(f)) : [];
      if (u.length) e.issues.push({ ...r, keys: u });
      for (let f of mapped) if (!u.includes(f) && s.has(f)) e.issues.push(s.get(f));
    }
    let c = sp(t.value, n.value);
    if (!c.valid) {
      if (ee.aborted(e)) return e;
      throw Error(`Unmergable intersection. Error path: ${JSON.stringify(c.mergeErrorPath)}`);
    }
    return ((e.value = c.data), e);
  }
  T.$ZodTuple = se.$constructor("$ZodTuple", (e, t) => {
    T.$ZodType.init(e, t);
    let items = t.items,
      memoizer = se.globalConfig.memoizer;
    (memoizer?.attach(e),
      (e._zod.parse = (r, s) => {
        let a = r.value;
        if (!Array.isArray(a))
          return (r.issues.push({ input: a, inst: e, expected: "tuple", code: "invalid_type" }), r);
        r.value = memoizer ? memoizer.alloc(e, r, [], s) : [];
        let l = [],
          c = vP(items, "optin"),
          u = vP(items, "optout");
        if (!t.rest) {
          if (a.length < c)
            return (
              r.issues.push({
                code: "too_small",
                minimum: c,
                inclusive: !0,
                input: a,
                inst: e,
                origin: "array",
              }),
              r
            );
          if (a.length > items.length)
            r.issues.push({
              code: "too_big",
              maximum: items.length,
              inclusive: !0,
              input: a,
              inst: e,
              origin: "array",
            });
        }
        let f = Array(items.length),
          h = t.rest ? s?.abortEarly : void 0,
          m = !1;
        for (let y = 0; y < items.length; y++) {
          let run = items[y]._zod.run({ value: a[y], issues: [] }, s);
          if (run instanceof Promise)
            l.push(
              run.then((w) => {
                f[y] = w;
              }),
            );
          else if (((f[y] = run), h && !m && run.issues.length)) m = ee.aborted(run);
        }
        if (t.rest && !m) {
          let y = items.length - 1,
            sliced = a.slice(items.length),
            w = r.issues.length;
          for (let S of sliced) {
            if (h && r.issues.length !== w) {
              if (ee.aborted(r, w)) break;
              w = r.issues.length;
            }
            y++;
            let run = t.rest._zod.run({ value: S, issues: [] }, s);
            if (run instanceof Promise) l.push(run.then((M) => wP(M, r, y)));
            else wP(run, r, y);
          }
        }
        if (l.length) return Promise.all(l).then(() => OP(f, r, items, a, u));
        return OP(f, r, items, a, u);
      }));
  });
  function vP(e, t) {
    for (let n = e.length - 1; n >= 0; n--)
      if (!(t === "optin" ? e[n]._zod.optin !== void 0 : e[n]._zod.optout === "optional")) return n + 1;
    return 0;
  }
  function wP(e, t, n) {
    if (e.issues.length) t.issues.push(...ee.prefixIssues(n, e.issues));
    t.value[n] = e.value;
  }
  function OP(e, t, n, o, r) {
    for (let s = 0; s < n.length; s++) {
      let a = e[s],
        l = s < o.length;
      if (!l && s >= r && n[s]._zod.optin === "optional") {
        t.value.length = s;
        break;
      }
      if (a.issues.length) {
        if (!l && s >= r) {
          t.value.length = s;
          break;
        }
        t.issues.push(...ee.prefixIssues(s, a.issues));
      }
      t.value[s] = a.value;
    }
    for (let s = t.value.length - 1; s >= o.length; s--)
      if (n[s]._zod.optout === "optional" && t.value[s] === void 0) t.value.length = s;
      else break;
    return t;
  }
  T.$ZodRecord = se.$constructor("$ZodRecord", (e, t) => {
    T.$ZodType.init(e, t);
    let memoizer = se.globalConfig.memoizer;
    (memoizer?.attach(e),
      (e._zod.parse = (o, r) => {
        let s = o.value;
        if (!ee.isPlainObject(s))
          return (o.issues.push({ expected: "record", code: "invalid_type", input: s, inst: e }), o);
        let a = [],
          values = t.keyType._zod.values;
        if (values && !t.partial) {
          o.value = memoizer ? memoizer.alloc(e, o, {}, r) : {};
          let c = new Set();
          for (let f of values)
            if (typeof f === "string" || typeof f === "number" || typeof f === "symbol") {
              if ((c.add(typeof f === "number" ? f.toString() : f), f === "__proto__")) continue;
              let run = t.keyType._zod.run({ value: f, issues: [] }, r);
              if (run instanceof Promise) throw Error("Async schemas not supported in object keys currently");
              if (run.issues.length) {
                o.issues.push({
                  code: "invalid_key",
                  origin: "record",
                  issues: run.issues.map((issue) => ee.finalizeIssue(issue, r, se.config())),
                  input: f,
                  path: [f],
                  inst: e,
                });
                continue;
              }
              let m = run.value;
              if (m === "__proto__") continue;
              let run_2 = t.valueType._zod.run({ value: s[f], issues: [] }, r);
              if (run_2 instanceof Promise)
                a.push(
                  run_2.then((b) => {
                    if (b.issues.length) o.issues.push(...ee.prefixIssues(f, b.issues));
                    o.value[m] = b.value;
                  }),
                );
              else {
                if (run_2.issues.length) o.issues.push(...ee.prefixIssues(f, run_2.issues));
                o.value[m] = run_2.value;
              }
            }
          let u;
          for (let key in s)
            if (!c.has(key))
              if (t.mode === "loose") {
                if (key === "__proto__") continue;
                o.value[key] = s[key];
              } else ((u = u ?? []), u.push(key));
          if (u && u.length > 0)
            o.issues.push({ code: "unrecognized_keys", input: s, inst: e, keys: u, continue: !0 });
        } else {
          o.value = memoizer ? memoizer.alloc(e, o, {}, r) : {};
          let c;
          for (let u of Reflect.ownKeys(s)) {
            if (u === "__proto__") continue;
            if (!Object.prototype.propertyIsEnumerable.call(s, u)) continue;
            let run = t.keyType._zod.run({ value: u, issues: [] }, r);
            if (run instanceof Promise) throw Error("Async schemas not supported in object keys currently");
            if (typeof u === "string" && It.number.test(u) && run.issues.length) {
              let run_2 = t.keyType._zod.run({ value: Number(u), issues: [] }, r);
              if (run_2 instanceof Promise)
                throw Error("Async schemas not supported in object keys currently");
              if (run_2.issues.length === 0) run = run_2;
            }
            if (run.issues.length) {
              if (t.mode === "loose") o.value[u] = s[u];
              else if (values) ((c = c ?? []), c.push(u));
              else
                o.issues.push({
                  code: "invalid_key",
                  origin: "record",
                  issues: run.issues.map((issue) => ee.finalizeIssue(issue, r, se.config())),
                  input: u,
                  path: [u],
                  inst: e,
                });
              continue;
            }
            let m = run.value;
            if (m === "__proto__") continue;
            let run_2 = t.valueType._zod.run({ value: s[u], issues: [] }, r);
            if (run_2 instanceof Promise)
              a.push(
                run_2.then((b) => {
                  if (b.issues.length) o.issues.push(...ee.prefixIssues(u, b.issues));
                  o.value[m] = b.value;
                }),
              );
            else {
              if (run_2.issues.length) o.issues.push(...ee.prefixIssues(u, run_2.issues));
              o.value[m] = run_2.value;
            }
          }
          if (c && c.length > 0)
            o.issues.push({ code: "unrecognized_keys", input: s, inst: e, keys: c, continue: !0 });
        }
        if (a.length) return Promise.all(a).then(() => o);
        return o;
      }));
  });
  T.$ZodMap = se.$constructor("$ZodMap", (e, t) => {
    T.$ZodType.init(e, t);
    let memoizer = se.globalConfig.memoizer;
    (memoizer?.attach(e),
      (e._zod.parse = (o, r) => {
        let s = o.value;
        if (!(s instanceof Map))
          return (o.issues.push({ expected: "map", code: "invalid_type", input: s, inst: e }), o);
        let a = [];
        o.value = memoizer ? memoizer.alloc(e, o, new Map(), r) : new Map();
        let l = r?.abortEarly,
          c = o.issues.length;
        for (let [u, f] of s) {
          if (l && o.issues.length !== c) {
            if (ee.aborted(o, c)) break;
            c = o.issues.length;
          }
          let run = t.keyType._zod.run({ value: u, issues: [] }, r),
            run_2 = t.valueType._zod.run({ value: f, issues: [] }, r);
          if (run instanceof Promise || run_2 instanceof Promise)
            a.push(
              Promise.all([run, run_2]).then(([y, b]) => {
                SP(y, b, o, u, s, e, r);
              }),
            );
          else SP(run, run_2, o, u, s, e, r);
        }
        if (a.length) return Promise.all(a).then(() => o);
        return o;
      }));
  });
  function SP(e, t, n, o, r, s, a) {
    if (e.issues.length)
      if (ee.propertyKeyTypes.has(typeof o)) n.issues.push(...ee.prefixIssues(o, e.issues));
      else
        n.issues.push({
          code: "invalid_key",
          origin: "map",
          input: r,
          inst: s,
          issues: e.issues.map((issue) => ee.finalizeIssue(issue, a, se.config())),
        });
    if (t.issues.length)
      if (ee.propertyKeyTypes.has(typeof o)) n.issues.push(...ee.prefixIssues(o, t.issues));
      else
        n.issues.push({
          origin: "map",
          code: "invalid_element",
          input: r,
          inst: s,
          key: o,
          issues: t.issues.map((issue) => ee.finalizeIssue(issue, a, se.config())),
        });
    n.value.set(e.value, t.value);
  }
  T.$ZodSet = se.$constructor("$ZodSet", (e, t) => {
    T.$ZodType.init(e, t);
    let memoizer = se.globalConfig.memoizer;
    (memoizer?.attach(e),
      (e._zod.parse = (o, r) => {
        let s = o.value;
        if (!(s instanceof Set))
          return (o.issues.push({ input: s, inst: e, expected: "set", code: "invalid_type" }), o);
        let a = [];
        o.value = memoizer ? memoizer.alloc(e, o, new Set(), r) : new Set();
        let l = r?.abortEarly,
          c = o.issues.length;
        for (let u of s) {
          if (l && o.issues.length !== c) {
            if (ee.aborted(o, c)) break;
            c = o.issues.length;
          }
          let run = t.valueType._zod.run({ value: u, issues: [] }, r);
          if (run instanceof Promise) a.push(run.then((h) => kP(h, o)));
          else kP(run, o);
        }
        if (a.length) return Promise.all(a).then(() => o);
        return o;
      }));
  });
  function kP(e, t) {
    if (e.issues.length) t.issues.push(...e.issues);
    t.value.add(e.value);
  }
  T.$ZodEnum = se.$constructor("$ZodEnum", (e, t) => {
    T.$ZodType.init(e, t);
    let enumValues = ee.getEnumValues(t.entries),
      o = new Set(enumValues);
    ((e._zod.values = o),
      ee.defineLazyInternal(e, "pattern", (r) => {
        let filtered = ee.getEnumValues(r.def.entries).filter((a) => ee.propertyKeyTypes.has(typeof a));
        return new RegExp(
          filtered.length
            ? `^(${filtered.map((a) => ee.escapeRegex(a.toString())).join("|")})$`
            : "^[^\\s\\S]$",
        );
      }),
      (e._zod.parse = (r, s) => {
        let a = r.value;
        if (o.has(a)) return r;
        return (r.issues.push({ code: "invalid_value", values: enumValues, input: a, inst: e }), r);
      }));
  });
  T.$ZodLiteral = se.$constructor("$ZodLiteral", (e, t) => {
    T.$ZodType.init(e, t);
    let n = new Set(t.values);
    ((e._zod.values = n),
      ee.defineLazyInternal(e, "pattern", (o) => {
        let values = o.def.values;
        return new RegExp(
          values.length
            ? `^(${values.map((s) => (typeof s === "string" ? ee.escapeRegex(s) : s ? ee.escapeRegex(s.toString()) : String(s))).join("|")})$`
            : "^[^\\s\\S]$",
        );
      }),
      (e._zod.parse = (o, r) => {
        let s = o.value;
        if (n.has(s)) return o;
        return (o.issues.push({ code: "invalid_value", values: t.values, input: s, inst: e }), o);
      }));
  });
  T.$ZodFile = se.$constructor("$ZodFile", (e, t) => {
    (T.$ZodType.init(e, t),
      (e._zod.parse = (n, o) => {
        let r = n.value;
        if (r instanceof File) return n;
        return (n.issues.push({ expected: "file", code: "invalid_type", input: r, inst: e }), n);
      }));
  });
  T.$ZodTransform = se.$constructor("$ZodTransform", (e, t) => {
    (T.$ZodType.init(e, t),
      (e._zod.optin = "optional"),
      se.globalConfig.memoizer?.guard(e),
      (e._zod.parse = (n, o) => {
        if (o.direction === "backward") throw new se.$ZodEncodeError(e.constructor.name);
        let transform = t.transform(n.value, n);
        if (o.async)
          return (transform instanceof Promise ? transform : Promise.resolve(transform)).then(
            (a) => ((n.value = a), n),
          );
        if (transform instanceof Promise) throw new se.$ZodAsyncError();
        return ((n.value = transform), n);
      }));
  });
  function EP(e, t) {
    return ((e.value = t.issues.length ? void 0 : t.value), e);
  }
  T.$ZodOptional = se.$constructor("$ZodOptional", (e, t) => {
    (T.$ZodType.init(e, t),
      ee.defineLazyInternal(e, "optin", (n) =>
        n.def.innerType._zod.optin === "defaulted" ? "defaulted" : "optional",
      ),
      (e._zod.optout = "optional"),
      ee.defineLazyInternal(e, "values", (n) => {
        let values = n.def.innerType._zod.values;
        return values ? new Set([...values, void 0]) : void 0;
      }),
      ee.defineLazyInternal(e, "pattern", (n) => {
        let pattern = n.def.innerType._zod.pattern;
        return pattern ? new RegExp(`^(${ee.cleanRegex(pattern.source)})?$`) : void 0;
      }),
      (e._zod.parse = (n, o) => {
        if (n.value === void 0) {
          if (t.innerType._zod.optin !== "defaulted") return n;
          let run = t.innerType._zod.run({ value: n.value, issues: [] }, o);
          if (run instanceof Promise) return run.then((s) => EP(n, s));
          return EP(n, run);
        }
        return t.innerType._zod.run(n, o);
      }));
  });
  T.$ZodExactOptional = se.$constructor("$ZodExactOptional", (e, t) => {
    (T.$ZodOptional.init(e, t),
      ee.defineLazyInternal(e, "values", (n) => n.def.innerType._zod.values),
      ee.defineLazyInternal(e, "pattern", (n) => n.def.innerType._zod.pattern),
      (e._zod.parse = (n, o) => t.innerType._zod.run(n, o)));
  });
  T.$ZodNullable = se.$constructor("$ZodNullable", (e, t) => {
    (T.$ZodType.init(e, t),
      ee.defineLazyInternal(e, "optin", (n) => n.def.innerType._zod.optin),
      ee.defineLazyInternal(e, "optout", (n) => n.def.innerType._zod.optout),
      ee.defineLazyInternal(e, "pattern", (n) => {
        let pattern = n.def.innerType._zod.pattern;
        return pattern ? new RegExp(`^(${ee.cleanRegex(pattern.source)}|null)$`) : void 0;
      }),
      ee.defineLazyInternal(e, "values", (n) =>
        n.def.innerType._zod.values ? new Set([...n.def.innerType._zod.values, null]) : void 0,
      ),
      (e._zod.parse = (n, o) => {
        if (n.value === null) return n;
        return t.innerType._zod.run(n, o);
      }));
  });
  T.$ZodDefault = se.$constructor("$ZodDefault", (e, t) => {
    (T.$ZodType.init(e, t),
      (e._zod.optin = "defaulted"),
      ee.defineLazyInternal(e, "values", (n) => n.def.innerType._zod.values),
      (e._zod.parse = (n, o) => {
        if (o.direction === "backward") return t.innerType._zod.run(n, o);
        if (n.value === void 0) return ((n.value = t.defaultValue), n);
        let run = t.innerType._zod.run(n, o);
        if (run instanceof Promise) return run.then((s) => PP(s, t));
        return PP(run, t);
      }));
  });
  function PP(e, t) {
    if (e.value === void 0) e.value = t.defaultValue;
    return e;
  }
  T.$ZodPrefault = se.$constructor("$ZodPrefault", (e, t) => {
    (T.$ZodType.init(e, t),
      (e._zod.optin = "defaulted"),
      ee.defineLazyInternal(e, "values", (n) => n.def.innerType._zod.values),
      (e._zod.parse = (n, o) => {
        if (o.direction === "backward") return t.innerType._zod.run(n, o);
        if (n.value === void 0) n.value = t.defaultValue;
        return t.innerType._zod.run(n, o);
      }));
  });
  T.$ZodNonOptional = se.$constructor("$ZodNonOptional", (e, t) => {
    (T.$ZodType.init(e, t),
      ee.defineLazyInternal(e, "values", (n) => {
        let values = n.def.innerType._zod.values;
        return values ? new Set([...values].filter((r) => r !== void 0)) : void 0;
      }),
      (e._zod.parse = (n, o) => {
        let run = t.innerType._zod.run(n, o);
        if (run instanceof Promise) return run.then((s) => AP(s, e));
        return AP(run, e);
      }));
  });
  function AP(e, t) {
    if (!e.issues.length && e.value === void 0)
      e.issues.push({ code: "invalid_type", expected: "nonoptional", input: e.value, inst: t });
    return e;
  }
  T.$ZodSuccess = se.$constructor("$ZodSuccess", (e, t) => {
    (T.$ZodType.init(e, t),
      (e._zod.parse = (n, o) => {
        if (o.direction === "backward") throw new se.$ZodEncodeError("ZodSuccess");
        let run = t.innerType._zod.run(n, o);
        if (run instanceof Promise) return run.then((s) => ((n.value = s.issues.length === 0), n));
        return ((n.value = run.issues.length === 0), n);
      }));
  });
  function IP(e, t, n, o) {
    if (!t.issues.length) {
      if (((e.value = t.value), t.memo)) e.memo = !0;
      return e;
    }
    return (
      (e.value = n.catchValue({
        ...t,
        value: e.value,
        error: { issues: t.issues.map((issue) => ee.finalizeIssue(issue, o, se.config())) },
        input: e.value,
      })),
      e
    );
  }
  T.$ZodCatch = se.$constructor("$ZodCatch", (e, t) => {
    (T.$ZodType.init(e, t),
      ee.defineLazyInternal(e, "optin", (n) =>
        n.def.innerType._zod.optin === "defaulted" ? "defaulted" : "optional",
      ),
      ee.defineLazyInternal(e, "optout", (n) => n.def.innerType._zod.optout),
      ee.defineLazyInternal(e, "values", (n) => n.def.innerType._zod.values),
      (e._zod.parse = (n, o) => {
        if (o.direction === "backward") return t.innerType._zod.run(n, o);
        let run = t.innerType._zod.run({ value: n.value, issues: [] }, o);
        if (run instanceof Promise) return run.then((s) => IP(n, s, t, o));
        return IP(n, run, t, o);
      }));
  });
  T.$ZodNaN = se.$constructor("$ZodNaN", (e, t) => {
    (T.$ZodType.init(e, t),
      (e._zod.parse = (n, o) => {
        if (typeof n.value !== "number" || !Number.isNaN(n.value))
          return (n.issues.push({ input: n.value, inst: e, expected: "nan", code: "invalid_type" }), n);
        return n;
      }));
  });
  T.$ZodPipe = se.$constructor("$ZodPipe", (e, t) => {
    (T.$ZodType.init(e, t),
      ee.defineLazyInternal(e, "values", (n) => n.def.in._zod.values),
      ee.defineLazyInternal(e, "optin", (n) => n.def.in._zod.optin),
      ee.defineLazyInternal(e, "optout", (n) => n.def.out._zod.optout),
      ee.defineLazyInternal(e, "propValues", (n) => n.def.in._zod.propValues),
      (e._zod.parse = (n, o) => {
        if (o.direction === "backward") {
          let run = t.out._zod.run(n, o);
          if (run instanceof Promise) return run.then((a) => np(a, t.in, o));
          return np(run, t.in, o);
        }
        let run = t.in._zod.run(n, o);
        if (run instanceof Promise) return run.then((s) => np(s, t.out, o));
        return np(run, t.out, o);
      }));
  });
  function np(e, t, n) {
    if (e.issues.some((issue) => issue.code !== "unrecognized_keys")) return ((e.aborted = !0), e);
    return t._zod.run({ value: e.value, issues: e.issues }, n);
  }
  T.$ZodCodec = se.$constructor("$ZodCodec", (e, t) => {
    (T.$ZodType.init(e, t),
      ee.defineLazyInternal(e, "values", (n) => n.def.in._zod.values),
      ee.defineLazyInternal(e, "optin", (n) => n.def.in._zod.optin),
      ee.defineLazyInternal(e, "optout", (n) => n.def.out._zod.optout),
      ee.defineLazyInternal(e, "propValues", (n) => n.def.in._zod.propValues),
      (e._zod.parse = (n, o) => {
        if ((o.direction || "forward") === "forward") {
          let run = t.in._zod.run(n, o);
          if (run instanceof Promise) return run.then((a) => rp(a, t, o));
          return rp(run, t, o);
        } else {
          let run = t.out._zod.run(n, o);
          if (run instanceof Promise) return run.then((a) => rp(a, t, o));
          return rp(run, t, o);
        }
      }));
  });
  function rp(e, t, n) {
    if (e.issues.length) return ((e.aborted = !0), e);
    if ((n.direction || "forward") === "forward") {
      let transform = t.transform(e.value, e);
      if (transform instanceof Promise) return transform.then((s) => ip(e, s, t.out, n));
      return ip(e, transform, t.out, n);
    } else {
      let reverseTransform = t.reverseTransform(e.value, e);
      if (reverseTransform instanceof Promise) return reverseTransform.then((s) => ip(e, s, t.in, n));
      return ip(e, reverseTransform, t.in, n);
    }
  }
  function ip(e, t, n, o) {
    if (e.issues.length) return ((e.aborted = !0), e);
    return n._zod.run({ value: t, issues: e.issues }, o);
  }
  T.$ZodPreprocess = se.$constructor("$ZodPreprocess", (e, t) => {
    T.$ZodPipe.init(e, t);
  });
  T.$ZodReadonly = se.$constructor("$ZodReadonly", (e, t) => {
    (T.$ZodType.init(e, t),
      ee.defineLazyInternal(e, "propValues", (n) => n.def.innerType._zod.propValues),
      ee.defineLazyInternal(e, "values", (n) => n.def.innerType._zod.values),
      ee.defineLazyInternal(e, "optin", (n) => n.def.innerType?._zod?.optin),
      ee.defineLazyInternal(e, "optout", (n) => n.def.innerType?._zod?.optout),
      (e._zod.parse = (n, o) => {
        if (o.direction === "backward") return t.innerType._zod.run(n, o);
        let run = t.innerType._zod.run(n, o);
        if (run instanceof Promise) return run.then(CP);
        return CP(run);
      }));
  });
  function CP(e) {
    if (!e.memo) e.value = Object.freeze(e.value);
    return e;
  }
  function JZ(e) {
    let def = e._zod.def,
      pattern = def.pattern,
      o = !!def.format?.includes("int"),
      r,
      s;
    for (let l of def.checks ?? []) {
      let def = l._zod.def;
      if (def.pattern) pattern = def.pattern;
      o || (o = !!def.format?.includes("int"));
      let u = def.minimum ?? def.length,
        f = def.maximum ?? def.length;
      if (u !== void 0 && (r === void 0 || u > r)) r = u;
      if (f !== void 0 && (s === void 0 || f < s)) s = f;
    }
    if (pattern) return pattern.source;
    if (r !== void 0 && s !== void 0 && r > s) return "(?!)";
    if (r !== void 0 || s !== void 0) return It.string({ minimum: r, maximum: s }).source;
    let pattern_2 = e._zod.pattern;
    return (o && pattern_2 === It.number ? It.integer : pattern_2)?.source;
  }
  function j_(e) {
    let def = e._zod.def,
      n = e._zod.pattern?.source,
      o = def.innerType ?? e._zod.innerType;
    if (o) {
      let r = o._zod.pattern?.source,
        s = j_(o);
      if (n && r && s && s !== r) return n.replace(ee.cleanRegex(r), () => ee.cleanRegex(s));
      return n;
    }
    if (def.options) {
      let mapped = def.options.map(j_);
      if (mapped.every(Boolean)) return `^(${mapped.map((s) => ee.cleanRegex(s)).join("|")})$`;
    }
    return JZ(e);
  }
  T.$ZodTemplateLiteral = se.$constructor("$ZodTemplateLiteral", (e, t) => {
    T.$ZodType.init(e, t);
    let n = [];
    for (let part of t.parts)
      if (typeof part === "object" && part !== null) {
        let r = j_(part);
        if (!r)
          throw Error(`Invalid template literal part, no pattern found: ${[...part._zod.traits].shift()}`);
        n.push(ee.cleanRegex(r));
      } else if (part === null || ee.primitiveTypes.has(typeof part)) n.push(ee.escapeRegex(`${part}`));
      else throw Error(`Invalid template literal part: ${part}`);
    ((e._zod.pattern = new RegExp(`^${n.join("")}$`)),
      (e._zod.parse = (o, r) => {
        if (typeof o.value !== "string")
          return (o.issues.push({ input: o.value, inst: e, expected: "string", code: "invalid_type" }), o);
        if (((e._zod.pattern.lastIndex = 0), !e._zod.pattern.test(o.value)))
          return (
            o.issues.push({
              input: o.value,
              inst: e,
              code: "invalid_format",
              format: t.format ?? "template_literal",
              pattern: e._zod.pattern.source,
            }),
            o
          );
        return o;
      }));
  });
  T.$ZodFunction = se.$constructor(
    "$ZodFunction",
    (e, t) => (
      T.$ZodType.init(e, t),
      Object.defineProperty(e, "_def", { value: t }),
      (e._zod.def = t),
      (e.implement = (n) => {
        if (typeof n !== "function") throw Error("implement() must be called with a function");
        return Object.defineProperty(
          function (...o) {
            let r = e._def.input ? Qs.parse(e._def.input, o) : o,
              s = Reflect.apply(n, this, r);
            if (e._def.output) return Qs.parse(e._def.output, s);
            return s;
          },
          "_zod",
          { value: e._zod, enumerable: !1 },
        );
      }),
      (e.implementAsync = (n) => {
        if (typeof n !== "function") throw Error("implementAsync() must be called with a function");
        return Object.defineProperty(
          async function (...o) {
            let r = e._def.input ? await Qs.parseAsync(e._def.input, o) : o,
              s = await Reflect.apply(n, this, r);
            if (e._def.output) return await Qs.parseAsync(e._def.output, s);
            return s;
          },
          "_zod",
          { value: e._zod, enumerable: !1 },
        );
      }),
      (e._zod.parse = (n, o) => {
        if (typeof n.value !== "function")
          return (n.issues.push({ code: "invalid_type", expected: "function", input: n.value, inst: e }), n);
        if (e._def.output && e._def.output._zod.def.type === "promise") n.value = e.implementAsync(n.value);
        else n.value = e.implement(n.value);
        return n;
      }),
      (e.input = (...n) => {
        let o = e.constructor;
        if (Array.isArray(n[0]))
          return new o({
            type: "function",
            input: new T.$ZodTuple({ type: "tuple", items: n[0], rest: n[1] }),
            output: e._def.output,
          });
        return new o({ type: "function", input: n[0], output: e._def.output });
      }),
      (e.output = (n) => new e.constructor({ type: "function", input: e._def.input, output: n })),
      e
    ),
  );
  T.$ZodPromise = se.$constructor("$ZodPromise", (e, t) => {
    (T.$ZodType.init(e, t),
      (e._zod.parse = (n, o) =>
        Promise.resolve(n.value).then((r) => t.innerType._zod.run({ value: r, issues: [] }, o))));
  });
  T.$ZodLazy = se.$constructor("$ZodLazy", (e, t) => {
    (T.$ZodType.init(e, t),
      ee.defineLazy(e._zod, "innerType", () => {
        let n = t;
        if (!n._cachedInner) n._cachedInner = t.getter();
        return n._cachedInner;
      }),
      ee.defineLazyInternal(e, "pattern", (n) => n.innerType?._zod?.pattern),
      ee.defineLazyInternal(e, "propValues", (n) => n.innerType?._zod?.propValues),
      ee.defineLazyInternal(e, "optin", (n) => n.innerType?._zod?.optin ?? void 0),
      ee.defineLazyInternal(e, "optout", (n) => n.innerType?._zod?.optout ?? void 0),
      (e._zod.parse = (n, o) => e._zod.innerType._zod.run(n, o)));
  });
  T.$ZodCustom = se.$constructor("$ZodCustom", (e, t) => {
    (qu.$ZodCheck.init(e, t),
      T.$ZodType.init(e, t),
      (e._zod.parse = (n, o) => n),
      (e._zod.check = (n) => {
        let o = n.value,
          fn = t.fn(o);
        if (fn instanceof Promise) return fn.then((s) => TP(s, n, o, e));
        TP(fn, n, o, e);
        return;
      }));
  });
  function TP(e, t, n, o) {
    if (!e) {
      let r = {
        code: "custom",
        input: n,
        inst: o,
        path: [...(o._zod.def.path ?? [])],
        continue: !o._zod.def.abort,
      };
      if (o._zod.def.params) r.params = o._zod.def.params;
      t.issues.push(ee.issue(r));
    }
  }
  function $P(e, t, n) {
    if (e.issues.length) t.issues.push(...ee.prefixIssues(n, e.issues));
  }
  T.$ZodProperties = se.$constructor(
    "$ZodProperties",
    (e, t) => {
      (T.$ZodType.init(e, t), qu.$ZodCheck.init(e, t));
      let memoizer = se.globalConfig.memoizer;
      memoizer?.attach(e);
      let o,
        r = (s, a) => {
          o ?? (o = Reflect.ownKeys(t.shape).map((u) => [u, t.shape[u]]));
          let l = s.value,
            c;
          for (let [u, f] of o) {
            let run = f._zod.run({ value: l[u], issues: [] }, a);
            if (run instanceof Promise) (c ?? (c = []), c.push(run.then((m) => $P(m, s, u))));
            else $P(run, s, u);
          }
          if (c)
            return Promise.all(c).then(() => {
              return;
            });
          return;
        };
      ((e._zod.parse = (s, a) => {
        let l = s.value;
        if (l === null || (typeof l !== "object" && typeof l !== "function"))
          return (s.issues.push({ expected: "object", code: "invalid_type", input: l, inst: e }), s);
        if (a.direction === "backward") a = { ...a, direction: "forward" };
        if (memoizer) memoizer.alloc(e, s, l, a);
        let c = r(s, a);
        return c instanceof Promise ? c.then(() => s) : s;
      }),
        (e._zod.check = (s) => {
          if (s.value == null) {
            s.issues.push({ expected: "object", code: "invalid_type", input: s.value, inst: e });
            return;
          }
          return r(s, {});
        }));
    },
    {
      *[Symbol.iterator]() {
        yield this;
      },
    },
  );
  (function () {
    var ownPropertyNames = Object.getOwnPropertyNames(T);
    for (var t = 0; t < ownPropertyNames.length; t++) {
      var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(T, ownPropertyNames[t]);
      if (!ownPropertyDescriptor || !ownPropertyDescriptor.get || !ownPropertyDescriptor.configurable)
        continue;
      var o;
      try {
        o = ownPropertyDescriptor.get();
      } catch (error) {
        continue;
      }
      if (o === void 0) continue;
      Object.defineProperty(T, ownPropertyNames[t], {
        value: o,
        writable: !1,
        enumerable: ownPropertyDescriptor.enumerable,
        configurable: !1,
      });
    }
    Object.freeze(T);
  })();
});

export { Bl };
