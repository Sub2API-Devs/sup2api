/**
 * zod/v4/core/schemas.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-7vp249v4.js (58)
 * attribution: esm-fingerprint 55, esm-layout 3
 */
import { Fr, x8e, Xne, __zod_globalConfig, ZodEncodeError } from "./core.js";
import { Qr } from "./versions.js";
import {
  cMe,
  PIi,
  ohs,
  shs,
  rut,
  R8e,
  j1e,
  RIi,
  lSr,
  PE,
  She,
  fMn,
  kIi,
  AIi,
  cMn,
  dSr,
  qJt,
  iSr,
  CIi,
  _Mt,
  uMn,
  YJt,
} from "./util.js";
import {
  Tr,
  gr,
  Ee,
  xr,
  wr,
  vr,
  mr,
  hr,
  ar,
  lr,
  pr,
  fr,
  dr,
  Er,
  Or,
  Ar,
  _r,
  yr,
  $r,
  zr,
  br,
  Pr,
  V,
  Nr,
  Rr,
  Cr,
} from "./regexes.js";
import { W, Mr, JK } from "./checks.js";
import { je } from "./doc.js";

//@ chunk-7vp249v4.js:14398-15969 esm-fingerprint
var Qk = Fr(
    "$ZodType",
    (e, t) => {
      var r;
      (e ?? (e = {}), (e._zod.def = t), (e._zod.bag = e._zod.bag || {}), (e._zod.version = Qr));
      let checks = e._zod.def.checks,
        i = e._zod.traits.has("$ZodCheck") ? [e, ...(checks ?? [])] : checks?.length ? [...checks] : [];
      for (let s of i) for (let c of s._zod.onattach) c(e);
      if (i.length === 0)
        ((r = e._zod).deferred ?? (r.deferred = []),
          e._zod.deferred?.push(() => {
            e._zod.run = e._zod.parse;
          }));
      else {
        let s = (a, l, p) => {
            if (a.memo) return a;
            let f = cMe(a),
              d;
            for (let _ of l) {
              if (_._zod.def.when) {
                if (PIi(a)) continue;
                if (!_._zod.def.when(a)) continue;
              } else if (f) continue;
              let m = a.issues.length,
                check = _._zod.check(a);
              if (check instanceof Promise && p?.async === !1) throw new x8e();
              if (d || check instanceof Promise)
                d = (d ?? Promise.resolve()).then(async () => {
                  if ((await check, a.issues.length === m)) return;
                  if ((ohs(a.issues, m, e), !f)) f = cMe(a, m);
                });
              else {
                if (a.issues.length === m) continue;
                if ((ohs(a.issues, m, e), !f)) f = cMe(a, m);
              }
            }
            if (d) return d.then(() => a);
            return a;
          },
          c = (a, l, p) => {
            if (cMe(a)) return ((a.aborted = !0), a);
            let f = s(l, i, p);
            if (f instanceof Promise) {
              if (p.async === !1) throw new x8e();
              return f.then((d) => e._zod.parse(d, p));
            }
            return e._zod.parse(f, p);
          };
        e._zod.run = (a, l) => {
          if (l.skipChecks) return e._zod.parse(a, l);
          if (l.direction === "backward") {
            let parse = e._zod.parse({ value: a.value, issues: [] }, { ...l, skipChecks: !0 });
            if (parse instanceof Promise) return parse.then((d) => c(d, a, l));
            return c(parse, a, l);
          }
          let parse = e._zod.parse(a, l);
          if (parse instanceof Promise) {
            if (l.async === !1) throw new x8e();
            return parse.then((f) => s(f, i, l));
          }
          return s(parse, i, l);
        };
      }
    },
    {
      get "~standard"() {
        return shs(this, "~standard", Fe(this));
      },
      set "~standard"(e) {
        rut(this, "~standard", e);
      },
    },
  ),
  mo = (e, t) =>
    e.issues.length ? { issues: e.issues.map((issue) => R8e(issue, t, Xne())) } : { value: e.value };
//@ chunk-7vp249v4.js:15969-16062 esm-fingerprint
async function _s(e, t) {
  let r = { async: !0 };
  return mo(await e._zod.run({ value: t, issues: [] }, r), r);
}
//@ chunk-7vp249v4.js:16062-16252 esm-fingerprint
function Fe(e) {
  return {
    validate: (t) => {
      let r = { async: !1 };
      try {
        let run = e._zod.run({ value: t, issues: [] }, r);
        if (!(run instanceof Promise)) return mo(run, r);
      } catch (error) {}
      return _s(e, t);
    },
    vendor: "zod",
    version: 1,
  };
}
//@ chunk-7vp249v4.js:16252-16962 esm-fingerprint
var me = Fr("$ZodString", (e, t) => {
    (Qk.init(e, t),
      (e._zod.pattern = t.pattern ?? Tr),
      (e._zod.parse = (r, n) => {
        if (t.coerce)
          try {
            r.value = String(r.value);
          } catch (error) {}
        if (typeof r.value === "string") return r;
        return (r.issues.push({ expected: "string", code: "invalid_type", input: r.value, inst: e }), r);
      }));
  }),
  z = Fr("$ZodStringFormat", (e, t) => {
    (W.init(e, t), me.init(e, t));
  }),
  ho = Fr("$ZodGUID", (e, t) => {
    (t.pattern ?? (t.pattern = gr), z.init(e, t));
  }),
  _o = Fr("$ZodUUID", (e, t) => {
    if (t.version) {
      let n = { v1: 1, v2: 2, v3: 3, v4: 4, v5: 5, v6: 6, v7: 7, v8: 8 }[t.version];
      if (n === void 0) throw Error(`Invalid UUID version: "${t.version}"`);
      t.pattern ?? (t.pattern = Ee(n));
    } else t.pattern ?? (t.pattern = Ee());
    z.init(e, t);
  }),
  go = Fr("$ZodEmail", (e, t) => {
    (t.pattern ?? (t.pattern = xr), z.init(e, t));
  }),
  xo = 1,
  vo = 2;
//@ chunk-7vp249v4.js:16962-17102 esm-fingerprint
function gs(e, t) {
  if (!t.normalize && t.protocol?.source === wr.source && !/^https?:\/\//i.test(e)) return xo;
  try {
    return new URL(e);
  } catch {
    return vo;
  }
}
//@ chunk-7vp249v4.js:17102-17121 esm-fingerprint
var xs = /[\t\n\r]/g;
//@ chunk-7vp249v4.js:17121-17160 esm-layout
function vs(e) {
  return e.replace(xs, "");
}
//@ chunk-7vp249v4.js:17160-17217 esm-fingerprint
function ys(e, t) {
  return ((t.lastIndex = 0), t.test(e.hostname));
}
//@ chunk-7vp249v4.js:17217-17322 esm-fingerprint
function $s(e, t) {
  return ((t.lastIndex = 0), t.test(e.protocol.endsWith(":") ? e.protocol.slice(0, -1) : e.protocol));
}
//@ chunk-7vp249v4.js:17322-19131 esm-fingerprint
var yo = Fr("$ZodURL", (e, t) => {
    (z.init(e, t),
      (e._zod.check = (r) => {
        try {
          let trimmed = r.value.trim(),
            i = gs(trimmed, t);
          if (i === xo) {
            r.issues.push({
              code: "invalid_format",
              format: "url",
              note: "Invalid URL format",
              input: r.value,
              inst: e,
              continue: !t.abort,
            });
            return;
          }
          if (i === vo) {
            r.issues.push({
              code: "invalid_format",
              format: "url",
              input: r.value,
              inst: e,
              continue: !t.abort,
            });
            return;
          }
          if (t.hostname && !ys(i, t.hostname))
            r.issues.push({
              code: "invalid_format",
              format: "url",
              note: "Invalid hostname",
              pattern: t.hostname.source,
              input: r.value,
              inst: e,
              continue: !t.abort,
            });
          if (t.protocol && !$s(i, t.protocol))
            r.issues.push({
              code: "invalid_format",
              format: "url",
              note: "Invalid protocol",
              pattern: t.protocol.source,
              input: r.value,
              inst: e,
              continue: !t.abort,
            });
          r.value = t.normalize ? i.href : vs(trimmed);
          return;
        } catch (error) {
          r.issues.push({
            code: "invalid_format",
            format: "url",
            input: r.value,
            inst: e,
            continue: !t.abort,
          });
        }
      }));
  }),
  $o = Fr("$ZodEmoji", (e, t) => {
    (t.pattern ?? (t.pattern = vr()), z.init(e, t));
  }),
  zo = Fr("$ZodNanoID", (e, t) => {
    if (t.length !== void 0 && (!Number.isInteger(t.length) || t.length < 1))
      throw Error(`Invalid nanoid length: ${t.length}`);
    (t.pattern ?? (t.pattern = t.length === void 0 ? mr : hr(t.length)), z.init(e, t));
  }),
  bo = Fr("$ZodCUID", (e, t) => {
    (t.pattern ?? (t.pattern = ar), z.init(e, t));
  }),
  ko = Fr("$ZodCUID2", (e, t) => {
    (t.pattern ?? (t.pattern = lr), z.init(e, t));
  }),
  Zo = Fr("$ZodULID", (e, t) => {
    (t.pattern ?? (t.pattern = pr), z.init(e, t));
  }),
  wo = Fr("$ZodXID", (e, t) => {
    (t.pattern ?? (t.pattern = fr), z.init(e, t));
  }),
  Po = Fr("$ZodKSUID", (e, t) => {
    (t.pattern ?? (t.pattern = dr), z.init(e, t));
  }),
  So = Fr("$ZodISODateTime", (e, t) => {
    (t.pattern ?? (t.pattern = Er(t)), z.init(e, t));
  }),
  Io = Fr("$ZodISODate", (e, t) => {
    (t.pattern ?? (t.pattern = Or), z.init(e, t));
  }),
  Oo = Fr("$ZodISOTime", (e, t) => {
    (t.pattern ?? (t.pattern = Ar(t)), z.init(e, t));
  }),
  Ao = Fr("$ZodISODuration", (e, t) => {
    (t.pattern ?? (t.pattern = _r), z.init(e, t));
  }),
  Eo = Fr("$ZodIPv4", (e, t) => {
    (t.pattern ?? (t.pattern = yr), z.init(e, t));
  }),
  zs = /^[0-9a-fA-F:.]+$/;
//@ chunk-7vp249v4.js:19131-19225 esm-fingerprint
function To(e) {
  if (!zs.test(e)) return !1;
  try {
    return (new URL(`http://[${e}]`), !0);
  } catch {
    return !1;
  }
}
//@ chunk-7vp249v4.js:19225-19422 esm-fingerprint
var No = Fr("$ZodIPv6", (e, t) => {
  (t.pattern ?? (t.pattern = $r),
    z.init(e, t),
    (e._zod.check = (r) => {
      if (!To(r.value))
        r.issues.push({
          code: "invalid_format",
          format: "ipv6",
          input: r.value,
          inst: e,
          continue: !t.abort,
        });
    }));
});
//@ chunk-7vp249v4.js:19422-19493 esm-fingerprint
var Co = Fr("$ZodCIDRv4", (e, t) => {
  (t.pattern ?? (t.pattern = zr), z.init(e, t));
});
//@ chunk-7vp249v4.js:19493-19653 esm-layout
function bs(e) {
  let parts = e.split("/");
  if (parts.length !== 2) return !1;
  let [r, n] = parts;
  if (!n) return !1;
  let i = Number(n);
  if (`${i}` !== n) return !1;
  if (i < 0 || i > 128) return !1;
  return To(r);
}
//@ chunk-7vp249v4.js:19653-19854 esm-fingerprint
var Ro = Fr("$ZodCIDRv6", (e, t) => {
  (t.pattern ?? (t.pattern = br),
    z.init(e, t),
    (e._zod.check = (r) => {
      if (!bs(r.value))
        r.issues.push({
          code: "invalid_format",
          format: "cidrv6",
          input: r.value,
          inst: e,
          continue: !t.abort,
        });
    }));
});
//@ chunk-7vp249v4.js:19854-19978 esm-fingerprint
function Do(e) {
  if (e === "") return !0;
  if (/\s/.test(e)) return !1;
  if (e.length % 4 !== 0) return !1;
  try {
    return (atob(e), !0);
  } catch {
    return !1;
  }
}
//@ chunk-7vp249v4.js:19978-20235 esm-fingerprint
var Me = /^[0-9a-zA-Z+/]*={0,2}$/,
  jo = Fr("$ZodBase64", (e, t) => {
    (t.pattern ?? (t.pattern = Me),
      z.init(e, t),
      (e._zod.check = (r) => {
        if (Do(r.value)) return;
        r.issues.push({
          code: "invalid_format",
          format: "base64",
          input: r.value,
          inst: e,
          continue: !t.abort,
        });
      }));
  }),
  he = /^[A-Za-z0-9_-]*$/;
//@ chunk-7vp249v4.js:20235-20373 esm-fingerprint
function ks(e) {
  if (!he.test(e)) return !1;
  let replaced = e.replace(/[-_]/g, (n) => (n === "-" ? "+" : "/")),
    padded = replaced.padEnd(Math.ceil(replaced.length / 4) * 4, "=");
  return Do(padded);
}
//@ chunk-7vp249v4.js:20373-20651 esm-fingerprint
var Lo = Fr("$ZodBase64URL", (e, t) => {
    (t.pattern ?? (t.pattern = he),
      z.init(e, t),
      (e._zod.check = (r) => {
        if (ks(r.value)) return;
        r.issues.push({
          code: "invalid_format",
          format: "base64url",
          input: r.value,
          inst: e,
          continue: !t.abort,
        });
      }));
  }),
  Fo = Fr("$ZodE164", (e, t) => {
    (t.pattern ?? (t.pattern = Pr), z.init(e, t));
  });
//@ chunk-7vp249v4.js:20651-20894 esm-fingerprint
function Zs(e, t = null) {
  try {
    let parts = e.split(".");
    if (parts.length !== 3) return !1;
    let [n] = parts;
    if (!n) return !1;
    let parsed = JSON.parse(atob(n));
    if ("typ" in parsed && parsed?.typ !== "JWT") return !1;
    if (!parsed.alg) return !1;
    if (t && (!("alg" in parsed) || parsed.alg !== t)) return !1;
    return !0;
  } catch {
    return !1;
  }
}
//@ chunk-7vp249v4.js:20894-21075 esm-fingerprint
var Mo = Fr("$ZodJWT", (e, t) => {
  (z.init(e, t),
    (e._zod.check = (r) => {
      if (Zs(r.value, t.alg)) return;
      r.issues.push({ code: "invalid_format", format: "jwt", input: r.value, inst: e, continue: !t.abort });
    }));
});
//@ chunk-7vp249v4.js:21075-21808 esm-fingerprint
var Je = Fr("$ZodNumber", (e, t) => {
    (Qk.init(e, t),
      (e._zod.pattern = V),
      (e._zod.parse = (r, n) => {
        if (t.coerce)
          try {
            r.value = Number(r.value);
          } catch (error) {}
        let i = r.value;
        if (typeof i === "number" && !Number.isNaN(i) && Number.isFinite(i)) return r;
        let s =
          typeof i === "number"
            ? Number.isNaN(i)
              ? "NaN"
              : !Number.isFinite(i)
                ? String(i)
                : void 0
            : void 0;
        return (
          r.issues.push({
            expected: "number",
            code: "invalid_type",
            input: i,
            inst: e,
            ...(s ? { received: s } : {}),
          }),
          r
        );
      }));
  }),
  Uo = Fr("$ZodNumberFormat", (e, t) => {
    (Mr.init(e, t), Je.init(e, t));
  }),
  Jo = Fr("$ZodBoolean", (e, t) => {
    (Qk.init(e, t),
      (e._zod.pattern = Nr),
      (e._zod.parse = (r, n) => {
        if (t.coerce)
          try {
            r.value = Boolean(r.value);
          } catch (error) {}
        let i = r.value;
        if (typeof i === "boolean") return r;
        return (r.issues.push({ expected: "boolean", code: "invalid_type", input: i, inst: e }), r);
      }));
  });
//@ chunk-7vp249v4.js:21808-22534 esm-fingerprint
var Bo = Fr("$ZodUndefined", (e, t) => {
    (Qk.init(e, t),
      (e._zod.pattern = Rr),
      (e._zod.values = new Set([void 0])),
      (e._zod.parse = (r, n) => {
        let i = r.value;
        if (typeof i > "u") return r;
        return (r.issues.push({ expected: "undefined", code: "invalid_type", input: i, inst: e }), r);
      }));
  }),
  Vo = Fr("$ZodNull", (e, t) => {
    (Qk.init(e, t),
      (e._zod.pattern = Cr),
      (e._zod.values = new Set([null])),
      (e._zod.parse = (r, n) => {
        let i = r.value;
        if (i === null) return r;
        return (r.issues.push({ expected: "null", code: "invalid_type", input: i, inst: e }), r);
      }));
  }),
  Ko = Fr("$ZodAny", (e, t) => {
    (Qk.init(e, t), (e._zod.parse = (r) => r));
  }),
  Wo = Fr("$ZodUnknown", (e, t) => {
    (Qk.init(e, t), (e._zod.parse = (r) => r));
  }),
  Go = Fr("$ZodNever", (e, t) => {
    (Qk.init(e, t),
      (e._zod.parse = (r, n) => (
        r.issues.push({ expected: "never", code: "invalid_type", input: r.value, inst: e }),
        r
      )));
  });
//@ chunk-7vp249v4.js:22534-22625 esm-fingerprint
function eo(e, t, r) {
  if (e.issues.length) t.issues.push(...j1e(r, e.issues));
  t.value[r] = e.value;
}
//@ chunk-7vp249v4.js:22625-23167 esm-fingerprint
var qo = Fr("$ZodArray", (e, t) => {
  Qk.init(e, t);
  let memoizer = __zod_globalConfig.memoizer;
  (memoizer?.attach(e),
    (e._zod.parse = (n, i) => {
      let s = n.value;
      if (!Array.isArray(s))
        return (n.issues.push({ expected: "array", code: "invalid_type", input: s, inst: e }), n);
      n.value = memoizer ? memoizer.alloc(e, n, Array(s.length), i) : Array(s.length);
      let c = [],
        a = i?.abortEarly;
      for (let l = 0; l < s.length; l++) {
        let p = s[l],
          run = t.element._zod.run({ value: p, issues: [] }, i);
        if (run instanceof Promise) c.push(run.then((d) => eo(d, n, l)));
        else if ((eo(run, n, l), a && run.issues.length !== 0 && cMe(run))) break;
      }
      if (c.length) return Promise.all(c).then(() => n);
      return n;
    }));
});
//@ chunk-7vp249v4.js:23167-23553 esm-fingerprint
function de(e, t, r, n, i, s) {
  let c = r in n,
    a = s === "optional";
  if (!c && a && i === "optional") return;
  if (e.issues.length) {
    if (i !== void 0 && a && !c) return;
    t.issues.push(...j1e(r, e.issues));
  }
  if (!c && i === void 0) {
    if (!e.issues.length)
      t.issues.push({ code: "invalid_type", expected: "nonoptional", input: void 0, path: [r] });
    return;
  }
  if (e.value === void 0) {
    if (c || (i === "defaulted" && !a)) t.value[r] = void 0;
  } else t.value[r] = e.value;
}
//@ chunk-7vp249v4.js:23553-23563 esm-layout
var ws = [];
//@ chunk-7vp249v4.js:23563-23939 esm-fingerprint
function Yo(e) {
  let keys = Object.keys(e.shape),
    ownPropertySymbols = Object.getOwnPropertySymbols(e.shape),
    n = ownPropertySymbols.length ? ownPropertySymbols : ws,
    i = n.length ? [...keys, ...n] : keys;
  for (let c of i)
    if (!e.shape?.[c]?._zod?.traits?.has("$ZodType"))
      throw Error(`Invalid element at key "${String(c)}": expected a Zod schema`);
  let s = RIi(e.shape);
  return {
    ...e,
    allKeys: i,
    symbolKeys: n,
    keySet: new Set(keys),
    numKeys: keys.length,
    optionalKeys: new Set(s),
  };
}
//@ chunk-7vp249v4.js:23939-24495 esm-fingerprint
function Xo(e, t, r, n, i, s, c) {
  let a = [],
    keySet = i.keySet,
    _zod = i.catchall._zod,
    f = _zod.def.type,
    { optin: optin, optout: optout } = _zod,
    m = 0;
  for (let key in t) {
    if (c && r.issues.length !== m) {
      if (cMe(r, m)) break;
      m = r.issues.length;
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
    let run = _zod.run({ value: t[key], issues: [] }, n);
    if (run instanceof Promise) e.push(run.then((x) => de(x, r, key, t, optin, optout)));
    else de(run, r, key, t, optin, optout);
  }
  if (a.length) r.issues.push({ code: "unrecognized_keys", keys: a, input: t, inst: s, continue: !0 });
  if (!e.length) return r;
  return Promise.all(e).then(() => r);
}
//@ chunk-7vp249v4.js:24495-28381 esm-fingerprint
var Ps = Fr("$ZodObject", (e, t) => {
    Qk.init(e, t);
    let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(t, "shape"),
      n = ownPropertyDescriptor?.get ? ownPropertyDescriptor.get.raw : (t.shape ?? {});
    if (n) {
      let p = () => {
        let f = { ...n };
        return (Object.defineProperty(t, "shape", { value: f }), (p.raw = f), f);
      };
      ((p.raw = n), Object.defineProperty(t, "shape", { get: p }));
    }
    let i = lSr(() => Yo(t));
    PE(e, "propValues", (p) => {
      let shape = p.def.shape,
        d = {};
      for (let key in shape) {
        let _zod = shape[key]._zod;
        if (_zod.values) {
          if (!Object.prototype.hasOwnProperty.call(d, key)) She(d, key, new Set());
          for (let h of _zod.values) d[key].add(h);
          if (_zod.optin !== void 0) d[key].add(void 0);
        }
      }
      return d;
    });
    let s = fMn,
      catchall = t.catchall,
      a,
      memoizer = __zod_globalConfig.memoizer;
    (memoizer?.attach(e),
      (e._zod.parse = (p, f) => {
        a ?? (a = i.value);
        let d = p.value;
        if (!s(d)) return (p.issues.push({ expected: "object", code: "invalid_type", input: d, inst: e }), p);
        p.value = memoizer ? memoizer.alloc(e, p, {}, f) : {};
        let _ = [],
          shape = a.shape,
          h = f?.abortEarly,
          g = p.issues.length;
        for (let allKey of a.allKeys) {
          if (h && p.issues.length !== g) {
            if (cMe(p, g)) break;
            g = p.issues.length;
          }
          if (allKey === "__proto__") continue;
          let v = shape[allKey],
            optin = v._zod.optin,
            optout = v._zod.optout,
            run = v._zod.run({ value: d[allKey], issues: [] }, f);
          if (run instanceof Promise) _.push(run.then((Z) => de(Z, p, allKey, d, optin, optout)));
          else de(run, p, allKey, d, optin, optout);
        }
        if (!catchall) return _.length ? Promise.all(_).then(() => p) : p;
        return Xo(_, d, p, f, i.value, e, h === !0);
      }));
  }),
  Ho = Fr("$ZodObjectJIT", (e, t) => {
    Ps.init(e, t);
    let parse = e._zod.parse,
      n = lSr(() => Yo(t)),
      memoizer = __zod_globalConfig.memoizer,
      s = (m) => {
        let h = n.value,
          symbolKeys = h.symbolKeys,
          x = new je(["payload", "ctx"], { shape: m, inst: e, memo: memoizer, syms: symbolKeys }),
          v = (Z) => `shape[${Z}]._zod.run({ value: input[${Z}], issues: [] }, ctx)`,
          I = (Z, y) => `
          let ${Z}_ab = false;
          for (let i = 0; i < ${Z}.issues.length; i++) {
            const iss = ${Z}.issues[i];
            iss.path = iss.path ? [${y}, ...iss.path] : [${y}];
            payload.issues.push(iss);
            if (iss.continue !== true) ${Z}_ab = true;
          }
          if (${Z}_ab && ctx && ctx.abortEarly) {
            payload.value = newResult;
            return payload;
          }`;
        x.write("const input = payload.value;");
        let create = Object.create(null),
          J = 0;
        for (let allKey of h.allKeys) create[allKey] = `key_${J++}`;
        x.write(memoizer ? "const newResult = memo.alloc(inst, payload, {}, ctx);" : "const newResult = {};");
        for (let allKey of h.allKeys) {
          if (allKey === "__proto__") continue;
          let y = create[allKey],
            O = typeof allKey === "symbol" ? `syms[${symbolKeys.indexOf(allKey)}]` : kIi(allKey),
            we = `${O} in input`,
            Vt = m[allKey],
            Pe = Vt?._zod?.optin,
            Kt = Pe !== void 0,
            os = Vt?._zod?.optout === "optional";
          if ((x.write(`const ${y} = ${v(O)};`), Kt && os)) {
            let ns = Pe === "optional" ? `${y}_present` : `${y}.value !== undefined || ${y}_present`;
            x.write(`
        const ${y}_present = ${we};
        if (!${y}.issues.length || ${y}_present) {
          if (${y}.issues.length) {${I(y, O)}
          }

          if (${ns}) {
            newResult[${O}] = ${y}.value;
          }
        }

      `);
          } else if (!Kt)
            x.write(`
        const ${y}_present = ${we};
        if (${y}.issues.length) {${I(y, O)}
        }
        if (!${y}_present && !${y}.issues.length) {
          payload.issues.push({
            code: "invalid_type",
            expected: "nonoptional",
            input: undefined,
            path: [${O}]
          });
          if (ctx && ctx.abortEarly) {
            payload.value = newResult;
            return payload;
          }
        }

        if (${y}_present) {
          newResult[${O}] = ${y}.value;
        }

      `);
          else if (
            (x.write(`
        if (${y}.issues.length) {${I(y, O)}
        }
      `),
            Pe === "defaulted")
          )
            x.write(`newResult[${O}] = ${y}.value;`);
          else
            x.write(`
        if (${y}.value !== undefined || ${we}) {
          newResult[${O}] = ${y}.value;
        }
      `);
        }
        return (x.write("payload.value = newResult;"), x.write("return payload;"), x.compile());
      },
      c,
      a = fMn,
      l = !__zod_globalConfig.jitless,
      f = l && AIi.value,
      catchall = t.catchall,
      _;
    e._zod.parse = (m, h) => {
      _ ?? (_ = n.value);
      let g = m.value;
      if (!a(g)) return (m.issues.push({ expected: "object", code: "invalid_type", input: g, inst: e }), m);
      if (l && f && h?.async === !1 && h.jitless !== !0) {
        if (!c) c = s(t.shape);
        if (((m = c(m, h)), !catchall)) return m;
        return Xo([], g, m, h, _, e, h?.abortEarly === !0);
      }
      return parse(m, h);
    };
  });
//@ chunk-7vp249v4.js:28381-28662 esm-fingerprint
function to(e, t, r, n) {
  for (let s of e) if (s.issues.length === 0) return ((t.value = s.value), t);
  let filtered = e.filter((s) => !cMe(s));
  if (filtered.length === 1) return ((t.value = filtered[0].value), filtered[0]);
  return (
    t.issues.push({
      code: "invalid_union",
      input: t.value,
      inst: r,
      errors: e.map((s) => s.issues.map((issue) => R8e(issue, n, Xne()))),
    }),
    t
  );
}
//@ chunk-7vp249v4.js:28662-29607 esm-fingerprint
var Be = Fr("$ZodUnion", (e, t) => {
  (Qk.init(e, t),
    PE(e, "optin", (n) =>
      n.def.options.some((option) => option._zod.optin === "defaulted")
        ? "defaulted"
        : n.def.options.some((option) => option._zod.optin !== void 0)
          ? "optional"
          : void 0,
    ),
    PE(e, "optout", (n) =>
      n.def.options.some((option) => option._zod.optout === "optional") ? "optional" : void 0,
    ),
    PE(e, "values", (n) => {
      if (n.def.options.every((option) => option._zod.values))
        return new Set(n.def.options.flatMap((option) => Array.from(option._zod.values)));
      return;
    }),
    PE(e, "pattern", (n) => {
      if (n.def.options.every((option) => option._zod.pattern)) {
        let mapped = n.def.options.map((option) => option._zod.pattern);
        return new RegExp(`^(${mapped.map((s) => cMn(s.source)).join("|")})$`);
      }
      return;
    }));
  let r = t.options.length === 1 ? t.options[0]._zod.run : null;
  e._zod.parse = (n, i) => {
    if (r) return r(n, i);
    let s = !1,
      c = [];
    for (let option of t.options) {
      let run = option._zod.run({ value: n.value, issues: [] }, i);
      if (run instanceof Promise) (c.push(run), (s = !0));
      else {
        if (run.issues.length === 0) return run;
        c.push(run);
      }
    }
    if (!s) return to(c, n, e, i);
    return Promise.all(c).then((a) => to(a, n, e, i));
  };
});
//@ chunk-7vp249v4.js:29607-29947 esm-fingerprint
function Ss(e) {
  let t = new Map();
  for (let option of e.options) {
    let n = option._zod.propValues?.[e.discriminator];
    if (!n || n.size === 0)
      throw Error(`Invalid discriminated union option at index "${e.options.indexOf(option)}"`);
    for (let i of n)
      if (t.has(i)) {
        if (i !== void 0) throw Error(`Duplicate discriminator value "${String(i)}"`);
        t.set(i, null);
      } else t.set(i, option);
  }
  return t;
}
//@ chunk-7vp249v4.js:29947-31503 esm-fingerprint
var Qo = Fr("$ZodDiscriminatedUnion", (e, t) => {
    ((t.inclusive = !1), Be.init(e, t));
    let parse = e._zod.parse;
    (PE(e, "propValues", (i) => {
      let s = {},
        c = 0;
      for (let option of i.def.options) {
        let propValues = option._zod.propValues;
        if (!propValues || Object.keys(propValues).length === 0)
          throw Error(`Invalid discriminated union option at index "${i.def.options.indexOf(option)}"`);
        if (propValues[i.def.discriminator]?.has(void 0)) c++;
        for (let [p, f] of Object.entries(propValues)) {
          if (!Object.prototype.hasOwnProperty.call(s, p)) She(s, p, new Set());
          for (let d of f) s[p].add(d);
        }
      }
      if (!i.def.unionFallback && c > 1) s[i.def.discriminator]?.delete(void 0);
      return s;
    }),
      t.options.forEach((option, s) => {
        let c = dSr(option._zod.def);
        if (c && !Object.prototype.hasOwnProperty.call(c, t.discriminator))
          throw Error(`Invalid discriminated union option at index "${s}"`);
      }));
    let n = lSr(() => Ss(t));
    e._zod.parse = (i, s) => {
      let c = i.value;
      if (!fMn(c)) return (i.issues.push({ code: "invalid_type", expected: "object", input: c, inst: e }), i);
      let a = c?.[t.discriminator],
        l = n.value.get(a);
      if (l && (a !== void 0 || s.direction !== "backward")) return l._zod.run(i, s);
      if (t.unionFallback || s.direction === "backward") return parse(i, s);
      return (
        i.issues.push({
          code: "invalid_union",
          errors: [],
          note: "No matching discriminator",
          discriminator: t.discriminator,
          options: Array.from(n.value.keys()).filter((p) => n.value.get(p) !== null),
          input: c,
          path: [t.discriminator],
          inst: e,
        }),
        i
      );
    };
  }),
  en = Fr("$ZodIntersection", (e, t) => {
    (Qk.init(e, t),
      (e._zod.parse = (r, n) => {
        let i = r.value,
          run = t.left._zod.run({ value: i, issues: [] }, n),
          run_2 = t.right._zod.run({ value: i, issues: [] }, n);
        if (run instanceof Promise || run_2 instanceof Promise)
          return Promise.all([run, run_2]).then(([l, p]) => ro(r, l, p));
        return ro(r, run, run_2);
      }));
  });
//@ chunk-7vp249v4.js:31503-32274 esm-fingerprint
function Le(e, t) {
  if (e === t) return { valid: !0, data: e };
  if (e instanceof Date && t instanceof Date && +e === +t) return { valid: !0, data: e };
  if (qJt(e) && qJt(t)) {
    let keys = Object.keys(t),
      filtered = Object.keys(e).filter((s) => keys.indexOf(s) !== -1),
      i = { ...e, ...t };
    if (Object.prototype.hasOwnProperty.call(i, "__proto__")) delete i.__proto__;
    for (let s of filtered) {
      if (s === "__proto__") continue;
      let c = Le(e[s], t[s]);
      if (!c.valid) return { valid: !1, mergeErrorPath: [s, ...c.mergeErrorPath] };
      i[s] = c.data;
    }
    return { valid: !0, data: i };
  }
  if (Array.isArray(e) && Array.isArray(t)) {
    if (e.length !== t.length) return { valid: !1, mergeErrorPath: [] };
    let r = [];
    for (let n = 0; n < e.length; n++) {
      let i = e[n],
        s = t[n],
        c = Le(i, s);
      if (!c.valid) return { valid: !1, mergeErrorPath: [n, ...c.mergeErrorPath] };
      r.push(c.data);
    }
    return { valid: !0, data: r };
  }
  return { valid: !1, mergeErrorPath: [] };
}
//@ chunk-7vp249v4.js:32274-33101 esm-fingerprint
function ro(e, t, r) {
  let n = new Map(),
    i,
    s = new Map(),
    c = (p, f) => {
      let d;
      if (p.code === "unrecognized_keys" && !p.path?.length) (i ?? (i = p), (d = p.keys));
      else if (p.code === "invalid_key" && p.origin === "record" && p.path?.length === 1) {
        let _ = String(p.path[0]);
        if (!s.has(_)) s.set(_, p);
        d = [_];
      } else return !1;
      for (let _ of d) {
        if (!n.has(_)) n.set(_, {});
        n.get(_)[f] = !0;
      }
      return !0;
    };
  for (let issue of t.issues) if (!c(issue, "l")) e.issues.push(issue);
  for (let issue of r.issues) if (!c(issue, "r")) e.issues.push(issue);
  let mapped = [...n].filter(([, p]) => p.l && p.r).map(([p]) => p);
  if (mapped.length) {
    let p = i ? mapped.filter((f) => i.keys.includes(f)) : [];
    if (p.length) e.issues.push({ ...i, keys: p });
    for (let f of mapped) if (!p.includes(f) && s.has(f)) e.issues.push(s.get(f));
  }
  let l = Le(t.value, r.value);
  if (!l.valid) {
    if (cMe(e)) return e;
    throw Error(`Unmergable intersection. Error path: ${JSON.stringify(l.mergeErrorPath)}`);
  }
  return ((e.value = l.data), e);
}
//@ chunk-7vp249v4.js:33101-34211 esm-fingerprint
var tn = Fr("$ZodTuple", (e, t) => {
  Qk.init(e, t);
  let items = t.items,
    memoizer = __zod_globalConfig.memoizer;
  (memoizer?.attach(e),
    (e._zod.parse = (i, s) => {
      let c = i.value;
      if (!Array.isArray(c))
        return (i.issues.push({ input: c, inst: e, expected: "tuple", code: "invalid_type" }), i);
      i.value = memoizer ? memoizer.alloc(e, i, [], s) : [];
      let a = [],
        l = oo(items, "optin"),
        p = oo(items, "optout");
      if (!t.rest) {
        if (c.length < l)
          return (
            i.issues.push({
              code: "too_small",
              minimum: l,
              inclusive: !0,
              input: c,
              inst: e,
              origin: "array",
            }),
            i
          );
        if (c.length > items.length)
          i.issues.push({
            code: "too_big",
            maximum: items.length,
            inclusive: !0,
            input: c,
            inst: e,
            origin: "array",
          });
      }
      let f = Array(items.length),
        d = t.rest ? s?.abortEarly : void 0,
        _ = !1;
      for (let m = 0; m < items.length; m++) {
        let run = items[m]._zod.run({ value: c[m], issues: [] }, s);
        if (run instanceof Promise)
          a.push(
            run.then((g) => {
              f[m] = g;
            }),
          );
        else if (((f[m] = run), d && !_ && run.issues.length)) _ = cMe(run);
      }
      if (t.rest && !_) {
        let m = items.length - 1,
          sliced = c.slice(items.length),
          g = i.issues.length;
        for (let x of sliced) {
          if (d && i.issues.length !== g) {
            if (cMe(i, g)) break;
            g = i.issues.length;
          }
          m++;
          let run = t.rest._zod.run({ value: x, issues: [] }, s);
          if (run instanceof Promise) a.push(run.then((I) => no(I, i, m)));
          else no(run, i, m);
        }
      }
      if (a.length) return Promise.all(a).then(() => io(f, i, items, c, p));
      return io(f, i, items, c, p);
    }));
});
//@ chunk-7vp249v4.js:34211-34351 esm-fingerprint
function oo(e, t) {
  for (let r = e.length - 1; r >= 0; r--)
    if (!(t === "optin" ? e[r]._zod.optin !== void 0 : e[r]._zod.optout === "optional")) return r + 1;
  return 0;
}
//@ chunk-7vp249v4.js:34351-34442 esm-fingerprint
function no(e, t, r) {
  if (e.issues.length) t.issues.push(...j1e(r, e.issues));
  t.value[r] = e.value;
}
//@ chunk-7vp249v4.js:34442-34826 esm-fingerprint
function io(e, t, r, n, i) {
  for (let s = 0; s < r.length; s++) {
    let c = e[s],
      a = s < n.length;
    if (!a && s >= i && r[s]._zod.optin === "optional") {
      t.value.length = s;
      break;
    }
    if (c.issues.length) {
      if (!a && s >= i) {
        t.value.length = s;
        break;
      }
      t.issues.push(...j1e(s, c.issues));
    }
    t.value[s] = c.value;
  }
  for (let s = t.value.length - 1; s >= n.length; s--)
    if (r[s]._zod.optout === "optional" && t.value[s] === void 0) t.value.length = s;
    else break;
  return t;
}
//@ chunk-7vp249v4.js:34826-37256 esm-fingerprint
var rn = Fr("$ZodRecord", (e, t) => {
  Qk.init(e, t);
  let memoizer = __zod_globalConfig.memoizer;
  (memoizer?.attach(e),
    (e._zod.parse = (n, i) => {
      let s = n.value;
      if (!qJt(s)) return (n.issues.push({ expected: "record", code: "invalid_type", input: s, inst: e }), n);
      let c = [],
        values = t.keyType._zod.values;
      if (values && !t.partial) {
        n.value = memoizer ? memoizer.alloc(e, n, {}, i) : {};
        let l = new Set();
        for (let f of values)
          if (typeof f === "string" || typeof f === "number" || typeof f === "symbol") {
            if ((l.add(typeof f === "number" ? f.toString() : f), f === "__proto__")) continue;
            let run = t.keyType._zod.run({ value: f, issues: [] }, i);
            if (run instanceof Promise) throw Error("Async schemas not supported in object keys currently");
            if (run.issues.length) {
              n.issues.push({
                code: "invalid_key",
                origin: "record",
                issues: run.issues.map((issue) => R8e(issue, i, Xne())),
                input: f,
                path: [f],
                inst: e,
              });
              continue;
            }
            let _ = run.value;
            if (_ === "__proto__") continue;
            let run_2 = t.valueType._zod.run({ value: s[f], issues: [] }, i);
            if (run_2 instanceof Promise)
              c.push(
                run_2.then((h) => {
                  if (h.issues.length) n.issues.push(...j1e(f, h.issues));
                  n.value[_] = h.value;
                }),
              );
            else {
              if (run_2.issues.length) n.issues.push(...j1e(f, run_2.issues));
              n.value[_] = run_2.value;
            }
          }
        let p;
        for (let key in s)
          if (!l.has(key))
            if (t.mode === "loose") {
              if (key === "__proto__") continue;
              n.value[key] = s[key];
            } else ((p = p ?? []), p.push(key));
        if (p && p.length > 0)
          n.issues.push({ code: "unrecognized_keys", input: s, inst: e, keys: p, continue: !0 });
      } else {
        n.value = memoizer ? memoizer.alloc(e, n, {}, i) : {};
        let l;
        for (let p of Reflect.ownKeys(s)) {
          if (p === "__proto__") continue;
          if (!Object.prototype.propertyIsEnumerable.call(s, p)) continue;
          let run = t.keyType._zod.run({ value: p, issues: [] }, i);
          if (run instanceof Promise) throw Error("Async schemas not supported in object keys currently");
          if (typeof p === "string" && V.test(p) && run.issues.length) {
            let run_2 = t.keyType._zod.run({ value: Number(p), issues: [] }, i);
            if (run_2 instanceof Promise) throw Error("Async schemas not supported in object keys currently");
            if (run_2.issues.length === 0) run = run_2;
          }
          if (run.issues.length) {
            if (t.mode === "loose") n.value[p] = s[p];
            else if (values) ((l = l ?? []), l.push(p));
            else
              n.issues.push({
                code: "invalid_key",
                origin: "record",
                issues: run.issues.map((issue) => R8e(issue, i, Xne())),
                input: p,
                path: [p],
                inst: e,
              });
            continue;
          }
          let _ = run.value;
          if (_ === "__proto__") continue;
          let run_2 = t.valueType._zod.run({ value: s[p], issues: [] }, i);
          if (run_2 instanceof Promise)
            c.push(
              run_2.then((h) => {
                if (h.issues.length) n.issues.push(...j1e(p, h.issues));
                n.value[_] = h.value;
              }),
            );
          else {
            if (run_2.issues.length) n.issues.push(...j1e(p, run_2.issues));
            n.value[_] = run_2.value;
          }
        }
        if (l && l.length > 0)
          n.issues.push({ code: "unrecognized_keys", input: s, inst: e, keys: l, continue: !0 });
      }
      if (c.length) return Promise.all(c).then(() => n);
      return n;
    }));
});
//@ chunk-7vp249v4.js:37256-38038 esm-fingerprint
var on = Fr("$ZodEnum", (e, t) => {
    Qk.init(e, t);
    let r = iSr(t.entries),
      n = new Set(r);
    ((e._zod.values = n),
      PE(e, "pattern", (i) => {
        let filtered = iSr(i.def.entries).filter((c) => CIi.has(typeof c));
        return new RegExp(
          filtered.length ? `^(${filtered.map((c) => _Mt(c.toString())).join("|")})$` : "^[^\\s\\S]$",
        );
      }),
      (e._zod.parse = (i, s) => {
        let c = i.value;
        if (n.has(c)) return i;
        return (i.issues.push({ code: "invalid_value", values: r, input: c, inst: e }), i);
      }));
  }),
  nn = Fr("$ZodLiteral", (e, t) => {
    Qk.init(e, t);
    let r = new Set(t.values);
    ((e._zod.values = r),
      PE(e, "pattern", (n) => {
        let values = n.def.values;
        return new RegExp(
          values.length
            ? `^(${values.map((s) => (typeof s === "string" ? _Mt(s) : s ? _Mt(s.toString()) : String(s))).join("|")})$`
            : "^[^\\s\\S]$",
        );
      }),
      (e._zod.parse = (n, i) => {
        let s = n.value;
        if (r.has(s)) return n;
        return (n.issues.push({ code: "invalid_value", values: t.values, input: s, inst: e }), n);
      }));
  });
//@ chunk-7vp249v4.js:38038-38390 esm-fingerprint
var sn = Fr("$ZodTransform", (e, t) => {
  (Qk.init(e, t),
    (e._zod.optin = "optional"),
    __zod_globalConfig.memoizer?.guard(e),
    (e._zod.parse = (r, n) => {
      if (n.direction === "backward") throw new ZodEncodeError(e.constructor.name);
      let transform = t.transform(r.value, r);
      if (n.async)
        return (transform instanceof Promise ? transform : Promise.resolve(transform)).then(
          (c) => ((r.value = c), r),
        );
      if (transform instanceof Promise) throw new x8e();
      return ((r.value = transform), r);
    }));
});
//@ chunk-7vp249v4.js:38390-38455 esm-fingerprint
function so(e, t) {
  return ((e.value = t.issues.length ? void 0 : t.value), e);
}
//@ chunk-7vp249v4.js:38455-40043 esm-fingerprint
var Ve = Fr("$ZodOptional", (e, t) => {
    (Qk.init(e, t),
      PE(e, "optin", (r) => (r.def.innerType._zod.optin === "defaulted" ? "defaulted" : "optional")),
      (e._zod.optout = "optional"),
      PE(e, "values", (r) => {
        let values = r.def.innerType._zod.values;
        return values ? new Set([...values, void 0]) : void 0;
      }),
      PE(e, "pattern", (r) => {
        let pattern = r.def.innerType._zod.pattern;
        return pattern ? new RegExp(`^(${cMn(pattern.source)})?$`) : void 0;
      }),
      (e._zod.parse = (r, n) => {
        if (r.value === void 0) {
          if (t.innerType._zod.optin !== "defaulted") return r;
          let run = t.innerType._zod.run({ value: r.value, issues: [] }, n);
          if (run instanceof Promise) return run.then((s) => so(r, s));
          return so(r, run);
        }
        return t.innerType._zod.run(r, n);
      }));
  }),
  cn = Fr("$ZodExactOptional", (e, t) => {
    (Ve.init(e, t),
      PE(e, "values", (r) => r.def.innerType._zod.values),
      PE(e, "pattern", (r) => r.def.innerType._zod.pattern),
      (e._zod.parse = (r, n) => t.innerType._zod.run(r, n)));
  }),
  un = Fr("$ZodNullable", (e, t) => {
    (Qk.init(e, t),
      PE(e, "optin", (r) => r.def.innerType._zod.optin),
      PE(e, "optout", (r) => r.def.innerType._zod.optout),
      PE(e, "pattern", (r) => {
        let pattern = r.def.innerType._zod.pattern;
        return pattern ? new RegExp(`^(${cMn(pattern.source)}|null)$`) : void 0;
      }),
      PE(e, "values", (r) =>
        r.def.innerType._zod.values ? new Set([...r.def.innerType._zod.values, null]) : void 0,
      ),
      (e._zod.parse = (r, n) => {
        if (r.value === null) return r;
        return t.innerType._zod.run(r, n);
      }));
  }),
  an = Fr("$ZodDefault", (e, t) => {
    (Qk.init(e, t),
      (e._zod.optin = "defaulted"),
      PE(e, "values", (r) => r.def.innerType._zod.values),
      (e._zod.parse = (r, n) => {
        if (n.direction === "backward") return t.innerType._zod.run(r, n);
        if (r.value === void 0) return ((r.value = t.defaultValue), r);
        let run = t.innerType._zod.run(r, n);
        if (run instanceof Promise) return run.then((s) => co(s, t));
        return co(run, t);
      }));
  });
//@ chunk-7vp249v4.js:40043-40112 esm-fingerprint
function co(e, t) {
  if (e.value === void 0) e.value = t.defaultValue;
  return e;
}
//@ chunk-7vp249v4.js:40112-40672 esm-fingerprint
var ln = Fr("$ZodPrefault", (e, t) => {
    (Qk.init(e, t),
      (e._zod.optin = "defaulted"),
      PE(e, "values", (r) => r.def.innerType._zod.values),
      (e._zod.parse = (r, n) => {
        if (n.direction === "backward") return t.innerType._zod.run(r, n);
        if (r.value === void 0) r.value = t.defaultValue;
        return t.innerType._zod.run(r, n);
      }));
  }),
  pn = Fr("$ZodNonOptional", (e, t) => {
    (Qk.init(e, t),
      PE(e, "values", (r) => {
        let values = r.def.innerType._zod.values;
        return values ? new Set([...values].filter((i) => i !== void 0)) : void 0;
      }),
      (e._zod.parse = (r, n) => {
        let run = t.innerType._zod.run(r, n);
        if (run instanceof Promise) return run.then((s) => uo(s, e));
        return uo(run, e);
      }));
  });
//@ chunk-7vp249v4.js:40672-40817 esm-fingerprint
function uo(e, t) {
  if (!e.issues.length && e.value === void 0)
    e.issues.push({ code: "invalid_type", expected: "nonoptional", input: e.value, inst: t });
  return e;
}
//@ chunk-7vp249v4.js:40817-41019 esm-fingerprint
function ao(e, t, r, n) {
  if (!t.issues.length) {
    if (((e.value = t.value), t.memo)) e.memo = !0;
    return e;
  }
  return (
    (e.value = r.catchValue({
      ...t,
      value: e.value,
      error: { issues: t.issues.map((issue) => R8e(issue, n, Xne())) },
      input: e.value,
    })),
    e
  );
}
//@ chunk-7vp249v4.js:41019-41457 esm-fingerprint
var fn = Fr("$ZodCatch", (e, t) => {
  (Qk.init(e, t),
    PE(e, "optin", (r) => (r.def.innerType._zod.optin === "defaulted" ? "defaulted" : "optional")),
    PE(e, "optout", (r) => r.def.innerType._zod.optout),
    PE(e, "values", (r) => r.def.innerType._zod.values),
    (e._zod.parse = (r, n) => {
      if (n.direction === "backward") return t.innerType._zod.run(r, n);
      let run = t.innerType._zod.run({ value: r.value, issues: [] }, n);
      if (run instanceof Promise) return run.then((s) => ao(r, s, t, n));
      return ao(r, run, t, n);
    }));
});
//@ chunk-7vp249v4.js:41457-41930 esm-fingerprint
var Ke = Fr("$ZodPipe", (e, t) => {
  (Qk.init(e, t),
    PE(e, "values", (r) => r.def.in._zod.values),
    PE(e, "optin", (r) => r.def.in._zod.optin),
    PE(e, "optout", (r) => r.def.out._zod.optout),
    PE(e, "propValues", (r) => r.def.in._zod.propValues),
    (e._zod.parse = (r, n) => {
      if (n.direction === "backward") {
        let run = t.out._zod.run(r, n);
        if (run instanceof Promise) return run.then((c) => fe(c, t.in, n));
        return fe(run, t.in, n);
      }
      let run = t.in._zod.run(r, n);
      if (run instanceof Promise) return run.then((s) => fe(s, t.out, n));
      return fe(run, t.out, n);
    }));
});
//@ chunk-7vp249v4.js:41930-42076 esm-fingerprint
function fe(e, t, r) {
  if (e.issues.some((issue) => issue.code !== "unrecognized_keys")) return ((e.aborted = !0), e);
  return t._zod.run({ value: e.value, issues: e.issues }, r);
}
//@ chunk-7vp249v4.js:42076-42542 esm-fingerprint
var dn = Fr("$ZodPreprocess", (e, t) => {
    Ke.init(e, t);
  }),
  mn = Fr("$ZodReadonly", (e, t) => {
    (Qk.init(e, t),
      PE(e, "propValues", (r) => r.def.innerType._zod.propValues),
      PE(e, "values", (r) => r.def.innerType._zod.values),
      PE(e, "optin", (r) => r.def.innerType?._zod?.optin),
      PE(e, "optout", (r) => r.def.innerType?._zod?.optout),
      (e._zod.parse = (r, n) => {
        if (n.direction === "backward") return t.innerType._zod.run(r, n);
        let run = t.innerType._zod.run(r, n);
        if (run instanceof Promise) return run.then(freezeZodValue);
        return freezeZodValue(run);
      }));
  });
//@ chunk-7vp249v4.js:42542-42608 esm-fingerprint
function freezeZodValue(e) {
  if (!e.memo) e.value = Object.freeze(e.value);
  return e;
}
//@ chunk-7vp249v4.js:42608-43213 esm-fingerprint
var nlo = Fr("$ZodLazy", (e, t) => {
    (Qk.init(e, t),
      uMn(e._zod, "innerType", () => {
        let r = t;
        if (!r._cachedInner) r._cachedInner = t.getter();
        return r._cachedInner;
      }),
      PE(e, "pattern", (r) => r.innerType?._zod?.pattern),
      PE(e, "propValues", (r) => r.innerType?._zod?.propValues),
      PE(e, "optin", (r) => r.innerType?._zod?.optin ?? void 0),
      PE(e, "optout", (r) => r.innerType?._zod?.optout ?? void 0),
      (e._zod.parse = (r, n) => e._zod.innerType._zod.run(r, n)));
  }),
  hn = Fr("$ZodCustom", (e, t) => {
    (JK.init(e, t),
      Qk.init(e, t),
      (e._zod.parse = (r, n) => r),
      (e._zod.check = (r) => {
        let n = r.value,
          fn = t.fn(n);
        if (fn instanceof Promise) return fn.then((s) => po(s, r, n, e));
        po(fn, r, n, e);
        return;
      }));
  });
//@ chunk-7vp249v4.js:43213-43406 esm-fingerprint
function po(e, t, r, n) {
  if (!e) {
    let i = {
      code: "custom",
      input: r,
      inst: n,
      path: [...(n._zod.def.path ?? [])],
      continue: !n._zod.def.abort,
    };
    if (n._zod.def.params) i.params = n._zod.def.params;
    t.issues.push(YJt(i));
  }
}
//@ chunk-7vp249v4.js:43406-43478 esm-fingerprint
function fo(e, t, r) {
  if (e.issues.length) t.issues.push(...j1e(r, e.issues));
}
//@ chunk-7vp249v4.js:43478-44335 esm-fingerprint
var Is = Fr(
  "$ZodProperties",
  (e, t) => {
    (Qk.init(e, t), JK.init(e, t));
    let memoizer = __zod_globalConfig.memoizer;
    memoizer?.attach(e);
    let n,
      i = (s, c) => {
        n ?? (n = Reflect.ownKeys(t.shape).map((p) => [p, t.shape[p]]));
        let a = s.value,
          l;
        for (let [p, f] of n) {
          let run = f._zod.run({ value: a[p], issues: [] }, c);
          if (run instanceof Promise) (l ?? (l = []), l.push(run.then((_) => fo(_, s, p))));
          else fo(run, s, p);
        }
        if (l)
          return Promise.all(l).then(() => {
            return;
          });
        return;
      };
    ((e._zod.parse = (s, c) => {
      let a = s.value;
      if (a === null || (typeof a !== "object" && typeof a !== "function"))
        return (s.issues.push({ expected: "object", code: "invalid_type", input: a, inst: e }), s);
      if (c.direction === "backward") c = { ...c, direction: "forward" };
      if (memoizer) memoizer.alloc(e, s, a, c);
      let l = i(s, c);
      return l instanceof Promise ? l.then(() => s) : s;
    }),
      (e._zod.check = (s) => {
        if (s.value == null) {
          s.issues.push({ expected: "object", code: "invalid_type", input: s.value, inst: e });
          return;
        }
        return i(s, {});
      }));
  },
  {
    *[Symbol.iterator]() {
      yield this;
    },
  },
);

export {
  Qk,
  Fe,
  me,
  z,
  So,
  Io,
  Oo,
  Ao,
  go,
  ho,
  _o,
  yo,
  $o,
  zo,
  bo,
  ko,
  Zo,
  wo,
  Po,
  Eo,
  No,
  Co,
  Ro,
  jo,
  Lo,
  Fo,
  Mo,
  Je,
  Uo,
  Jo,
  Bo,
  Vo,
  Ko,
  Wo,
  Go,
  qo,
  Ho,
  Be,
  Qo,
  en,
  tn,
  rn,
  on,
  nn,
  sn,
  Ve,
  cn,
  un,
  an,
  ln,
  pn,
  fn,
  Ke,
  dn,
  mn,
  nlo,
  hn,
  Me,
  he,
};
