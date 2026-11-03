/**
 * zod/v4/core/util.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-t7zrjgp6.js (62)
 * attribution: esm-fingerprint 54, esm-layout 8
 */
import { __zod_globalConfig } from "./core.js";

//@ chunk-t7zrjgp6.js:191-340 esm-fingerprint
function iSr(e) {
  let filtered = Object.values(e).filter((n) => typeof n === "number");
  return Object.entries(e)
    .filter(([n, o]) => filtered.indexOf(+n) === -1)
    .map(([n, o]) => o);
}
//@ chunk-t7zrjgp6.js:340-396 esm-fingerprint
function Zgs(e, t = "|") {
  return e.map((r) => nhs(r)).join(t);
}
//@ chunk-t7zrjgp6.js:396-466 esm-fingerprint
function aSr(e, t) {
  if (typeof t === "bigint") return t.toString();
  return t;
}
//@ chunk-t7zrjgp6.js:466-624 esm-fingerprint
class A {
  constructor(e) {
    ((this._getter = e), (this._value = void 0));
  }
  get value() {
    let _getter = this._getter;
    if (_getter !== void 0) ((this._value = _getter()), (this._getter = void 0));
    return this._value;
  }
}
//@ chunk-t7zrjgp6.js:624-656 esm-layout
function lSr(e) {
  return new A(e);
}
//@ chunk-t7zrjgp6.js:656-700 esm-layout
function EIi(e) {
  return e === null || e === void 0;
}
//@ chunk-t7zrjgp6.js:700-802 esm-fingerprint
function cMn(e) {
  let t = e.startsWith("^") ? 1 : 0,
    r = e.endsWith("$") ? e.length - 1 : e.length;
  return e.slice(t, r);
}
//@ chunk-t7zrjgp6.js:802-928 esm-fingerprint
function vIi(e, t) {
  let r = e / t,
    rounded = Math.round(r),
    o = 4 * Number.EPSILON * Math.max(Math.abs(r), 1);
  if (Math.abs(r - rounded) < o) return 0;
  return r - rounded;
}
//@ chunk-t7zrjgp6.js:928-955 esm-fingerprint
var z = Symbol("evaluating");
//@ chunk-t7zrjgp6.js:955-1134 esm-fingerprint
function uMn(e, t, r) {
  let n = void 0;
  Object.defineProperty(e, t, {
    get() {
      if (n === z) return;
      if (n === void 0) ((n = z), (n = r()));
      return n;
    },
    set(o) {
      Object.defineProperty(e, t, { value: o });
    },
    configurable: !0,
  });
}
//@ chunk-t7zrjgp6.js:1134-1233 esm-fingerprint
function She(e, t, r) {
  Object.defineProperty(e, t, { value: r, writable: !0, enumerable: !0, configurable: !0 });
}
//@ chunk-t7zrjgp6.js:1233-1331 esm-fingerprint
function dSr(e) {
  let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(e, "shape");
  return ownPropertyDescriptor?.get ? ownPropertyDescriptor.get.raw : ownPropertyDescriptor?.value;
}
//@ chunk-t7zrjgp6.js:1331-1386 esm-fingerprint
function p(e) {
  return dSr(e._zod.def) ?? e._zod.def.shape;
}
//@ chunk-t7zrjgp6.js:1386-1503 esm-fingerprint
function v(e, t, r) {
  Object.defineProperty(e, t, {
    get() {
      let n = r();
      return (She(this, t, n), n);
    },
    enumerable: !0,
    configurable: !0,
  });
}
//@ chunk-t7zrjgp6.js:1503-1554 esm-layout
function k(e, t, r) {
  if (t in e) She(e, t, r);
  else e[t] = r;
}
//@ chunk-t7zrjgp6.js:1554-1772 esm-fingerprint
function h(e, t, r, n) {
  let o = p(t);
  for (let i of r) {
    let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(o, i);
    if (!ownPropertyDescriptor.enumerable) continue;
    if (ownPropertyDescriptor.get)
      v(e, i, () => {
        let c = t._zod.def.shape[i];
        return n ? n(c, i) : c;
      });
    else k(e, i, n ? n(ownPropertyDescriptor.value, i) : ownPropertyDescriptor.value);
  }
}
//@ chunk-t7zrjgp6.js:1772-1936 esm-fingerprint
function I(e, t) {
  for (let r of Reflect.ownKeys(t)) {
    let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(t, r);
    if (!ownPropertyDescriptor.enumerable) continue;
    if (ownPropertyDescriptor.get) v(e, r, () => t[r]);
    else k(e, r, ownPropertyDescriptor.value);
  }
}
//@ chunk-t7zrjgp6.js:1936-2078 esm-fingerprint
function Nve(...e) {
  let t = {};
  for (let r of e) {
    let ownPropertyDescriptors = Object.getOwnPropertyDescriptors(r);
    Object.assign(t, ownPropertyDescriptors);
  }
  return Object.defineProperties({}, t);
}
//@ chunk-t7zrjgp6.js:2078-2119 esm-layout
function kIi(e) {
  return JSON.stringify(e);
}
//@ chunk-t7zrjgp6.js:2119-2236 esm-fingerprint
function TIi(e) {
  return e
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
//@ chunk-t7zrjgp6.js:2236-2307 esm-fingerprint
var ehs = "captureStackTrace" in Error ? Error.captureStackTrace : (...e) => {};
//@ chunk-t7zrjgp6.js:2307-2379 esm-fingerprint
function fMn(e) {
  return typeof e === "object" && e !== null && !Array.isArray(e);
}
//@ chunk-t7zrjgp6.js:2379-2551 esm-fingerprint
var AIi = lSr(() => {
  if (__zod_globalConfig.jitless) return !1;
  if (typeof navigator < "u" && navigator?.userAgent?.includes("Cloudflare")) return !1;
  try {
    return (new Function(""), !0);
  } catch (error) {
    return !1;
  }
});
//@ chunk-t7zrjgp6.js:2551-2792 esm-fingerprint
function qJt(e) {
  if (fMn(e) === !1) return !1;
  let t = e.constructor;
  if (t === void 0) return !0;
  if (typeof t !== "function") return !0;
  let r = t.prototype;
  if (fMn(r) === !1) return !1;
  if (Object.prototype.hasOwnProperty.call(r, "isPrototypeOf") === !1) return !1;
  return !0;
}
//@ chunk-t7zrjgp6.js:2792-2949 esm-layout
function ths(e) {
  if (qJt(e)) return { ...e };
  if (Array.isArray(e)) return [...e];
  if (e instanceof Map) return new Map(e);
  if (e instanceof Set) return new Set(e);
  return e;
}
//@ chunk-t7zrjgp6.js:2949-2995 esm-fingerprint
var CIi = new Set(["string", "number", "symbol"]);
//@ chunk-t7zrjgp6.js:2995-3058 esm-fingerprint
function _Mt(e) {
  return e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
//@ chunk-t7zrjgp6.js:3058-3159 esm-fingerprint
function C8e(e, t, r) {
  let n = new e._zod.constr(t ?? e._zod.def);
  if (!t || r?.parent) n._zod.parent = e;
  return n;
}
//@ chunk-t7zrjgp6.js:3159-3453 esm-fingerprint
function Ld(e) {
  let t = e;
  if (!t) return {};
  if (typeof t === "string") return { error: () => t };
  if (t?.message !== void 0) {
    if (t?.error !== void 0) throw Error("Cannot specify both `message` and `error` params");
    t.error = t.message;
  }
  if ((delete t.message, typeof t.error === "string")) return { ...t, error: () => t.error };
  return t;
}
//@ chunk-t7zrjgp6.js:3453-3567 esm-fingerprint
function nhs(e) {
  if (typeof e === "bigint") return e.toString() + "n";
  if (typeof e === "string") return `"${e}"`;
  return `${e}`;
}
//@ chunk-t7zrjgp6.js:3567-3674 esm-fingerprint
function RIi(e) {
  return Object.keys(e).filter((t) => e[t]._zod.optin !== void 0 && e[t]._zod.optout === "optional");
}
//@ chunk-t7zrjgp6.js:3674-4066 esm-fingerprint
var alo = (() => ({
    safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
    int32: [-2147483648, 2147483647],
    uint32: [0, 4294967295],
    float32: [-340282346638528860000000000000000000000, 340282346638528860000000000000000000000],
    float64: [-Number.MAX_VALUE, Number.MAX_VALUE],
  }))(),
  rhs = {
    int64: [BigInt("-9223372036854775808"), BigInt("9223372036854775807")],
    uint64: [BigInt(0), BigInt("18446744073709551615")],
  };
//@ chunk-t7zrjgp6.js:4066-4272 esm-fingerprint
function k1i(e, t) {
  let def = e._zod.def,
    checks = def.checks;
  if (checks && checks.length > 0)
    throw Error(".pick() cannot be used on object schemas containing refinements");
  let i = {};
  return (h(i, e, m(e, t)), C8e(e, Nve(def, { shape: i, checks: [] })));
}
//@ chunk-t7zrjgp6.js:4272-4465 esm-fingerprint
function m(e, t) {
  let r = p(e),
    n = [];
  for (let o of Reflect.ownKeys(t)) {
    if (!Object.getOwnPropertyDescriptor(r, o)?.enumerable) throw Error(`Unrecognized key: "${String(o)}"`);
    if (t[o]) n.push(o);
  }
  return n;
}
//@ chunk-t7zrjgp6.js:4465-4727 esm-fingerprint
function T1i(e, t) {
  let def = e._zod.def,
    checks = def.checks;
  if (checks && checks.length > 0)
    throw Error(".omit() cannot be used on object schemas containing refinements");
  let i = new Set(m(e, t)),
    u = {};
  return (
    h(
      u,
      e,
      Reflect.ownKeys(p(e)).filter((c) => !i.has(c)),
    ),
    C8e(e, Nve(def, { shape: u, checks: [] }))
  );
}
//@ chunk-t7zrjgp6.js:4727-5107 esm-fingerprint
function A1i(e, t) {
  if (!qJt(t)) throw Error("Invalid input to extend: expected a plain object");
  let checks = e._zod.def.checks;
  if (checks && checks.length > 0) {
    let o = p(e);
    for (let i of Reflect.ownKeys(t))
      if (Object.getOwnPropertyDescriptor(o, i) !== void 0)
        throw Error(
          "Cannot overwrite keys on object schemas containing refinements. Use `.safeExtend()` instead.",
        );
  }
  return C8e(e, Nve(e._zod.def, { shape: T(e, t) }));
}
//@ chunk-t7zrjgp6.js:5107-5177 esm-fingerprint
function T(e, t) {
  let r = {};
  return (h(r, e, Reflect.ownKeys(p(e))), I(r, t), r);
}
//@ chunk-t7zrjgp6.js:5177-5319 esm-fingerprint
function C1i(e, t) {
  if (!qJt(t)) throw Error("Invalid input to safeExtend: expected a plain object");
  return C8e(e, Nve(e._zod.def, { shape: T(e, t) }));
}
//@ chunk-t7zrjgp6.js:5319-5785 esm-fingerprint
function R1i(e, t) {
  if (!t?._zod?.def)
    throw Error(
      "Invalid input to merge: expected an object schema. To merge a plain shape, use `.extend()`.",
    );
  if (e._zod.def.checks?.length)
    throw Error(
      ".merge() cannot be used on object schemas containing refinements. Use .safeExtend() instead.",
    );
  let r = {};
  (h(r, e, Reflect.ownKeys(p(e))), h(r, t, Reflect.ownKeys(p(t))));
  let n = Nve(e._zod.def, {
    shape: r,
    get catchall() {
      return t._zod.def.catchall;
    },
    checks: t._zod.def.checks ?? [],
  });
  return C8e(e, n);
}
//@ chunk-t7zrjgp6.js:5785-6116 esm-fingerprint
function xIi(e, t, r, n = "partial") {
  let checks = t._zod.def.checks;
  if (checks && checks.length > 0)
    throw Error(`.${n}() cannot be used on object schemas containing refinements`);
  let c = r ? new Set(m(t, r)) : void 0,
    f = {};
  return (
    h(
      f,
      t,
      Reflect.ownKeys(p(t)),
      e && ((_, y) => (c && !c.has(y) ? _ : new e({ type: "optional", innerType: _ }))),
    ),
    C8e(t, Nve(t._zod.def, { shape: f, checks: [] }))
  );
}
//@ chunk-t7zrjgp6.js:6116-6303 esm-fingerprint
function x1i(e, t, r) {
  let n = r ? new Set(m(t, r)) : void 0,
    o = {};
  return (
    h(o, t, Reflect.ownKeys(p(t)), (i, u) =>
      n && !n.has(u) ? i : new e({ type: "nonoptional", innerType: i }),
    ),
    C8e(t, Nve(t._zod.def, { shape: o }))
  );
}
//@ chunk-t7zrjgp6.js:6303-6432 esm-fingerprint
function cMe(e, t = 0) {
  if (e.aborted === !0) return !0;
  for (let r = t; r < e.issues.length; r++) if (e.issues[r]?.continue !== !0) return !0;
  return !1;
}
//@ chunk-t7zrjgp6.js:6432-6561 esm-fingerprint
function PIi(e, t = 0) {
  if (e.aborted === !0) return !0;
  for (let r = t; r < e.issues.length; r++) if (e.issues[r]?.continue === !1) return !0;
  return !1;
}
//@ chunk-t7zrjgp6.js:6561-6656 esm-fingerprint
function j1e(e, t) {
  return t.map((r) => {
    var n;
    return ((n = r).path ?? (n.path = []), r.path.unshift(e), r);
  });
}
//@ chunk-t7zrjgp6.js:6656-6710 esm-fingerprint
function w(e) {
  return typeof e === "string" ? e : e?.message;
}
//@ chunk-t7zrjgp6.js:6710-6793 esm-fingerprint
function ohs(e, t, r) {
  var n;
  for (let o = t; o < e.length; o++) (n = e[o]).schema ?? (n.schema = r);
}
//@ chunk-t7zrjgp6.js:6793-7348 esm-fingerprint
function R8e(e, t, r) {
  var n;
  let o = e.inst?._zod?.traits;
  if (o?.has("$ZodType"))
    if (o.has("$ZodCheck")) (n = e).schema ?? (n.schema = e.inst);
    else e.schema = e.inst;
  let i = e.schema !== e.inst ? e.schema?._zod.def?.error : void 0,
    u = e.message
      ? e.message
      : (w(e.inst?._zod.def?.error?.(e)) ??
        w(i?.(e)) ??
        w(t?.error?.(e)) ??
        w(r.customError?.(e)) ??
        w(r.localeError?.(e)) ??
        "Invalid input"),
    c = {};
  for (let f of Object.keys(e)) {
    if (f === "inst" || f === "schema" || f === "continue" || f === "input" || f === "__proto__") continue;
    c[f] = e[f];
  }
  if ((c.path ?? (c.path = []), (c.message = u), t?.reportInput)) c.input = e.input;
  return c;
}
//@ chunk-t7zrjgp6.js:7348-7372 esm-fingerprint
var M = /[\uD800-\uDBFF]/;
//@ chunk-t7zrjgp6.js:7372-7543 esm-fingerprint
function llo(e) {
  let t = e.length;
  if (!M.test(e)) return t;
  let r = t;
  for (let n = 0; n < t - 1; n++)
    if ((e.charCodeAt(n) & 64512) === 55296 && (e.charCodeAt(n + 1) & 64512) === 56320) (r--, n++);
  return r;
}
//@ chunk-t7zrjgp6.js:7543-7647 esm-fingerprint
function dlo(e) {
  if (Array.isArray(e)) return "array";
  if (typeof e === "string") return "string";
  return "unknown";
}
//@ chunk-t7zrjgp6.js:7647-7940 esm-fingerprint
function IIi(e) {
  let t = typeof e;
  switch (t) {
    case "number":
      return Number.isNaN(e) ? "nan" : "number";
    case "object": {
      if (e === null) return "null";
      if (Array.isArray(e)) return "array";
      let r = e;
      if (r && Object.getPrototypeOf(r) !== Object.prototype && "constructor" in r && r.constructor)
        return r.constructor.name;
    }
  }
  return t;
}
//@ chunk-t7zrjgp6.js:7940-8055 esm-fingerprint
function YJt(...e) {
  let [t, r, n] = e;
  if (typeof t === "string") return { message: t, code: "custom", input: r, inst: n };
  return { ...t };
}
//@ chunk-t7zrjgp6.js:8055-8264 esm-fingerprint
function C(e, t) {
  for (let key in t) {
    let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(t, key);
    if (ownPropertyDescriptor.get)
      Object.defineProperty(e, key, { ...ownPropertyDescriptor, enumerable: !1 });
    else defineLazyProperty(e, key, ownPropertyDescriptor.value);
  }
  for (let r of Object.getOwnPropertySymbols(t)) defineLazyProperty(e, r, t[r]);
}
//@ chunk-t7zrjgp6.js:8264-8376 esm-fingerprint
function rut(e, t, r, n = !0) {
  return (Object.defineProperty(e, t, { configurable: !0, writable: !0, enumerable: n, value: r }), r);
}
//@ chunk-t7zrjgp6.js:8376-8417 esm-layout
function shs(e, t, r) {
  return rut(e, t, r, !1);
}
//@ chunk-t7zrjgp6.js:8417-8586 esm-fingerprint
function OIi(e, t) {
  for (let key in e) {
    let n = e[key];
    Object.defineProperty(t, key, {
      configurable: !0,
      enumerable: !0,
      get() {
        return rut(this, key, n(this));
      },
      set(o) {
        rut(this, key, o);
      },
    });
  }
  return t;
}
//@ chunk-t7zrjgp6.js:8586-8723 esm-fingerprint
function defineLazyProperty(e, t, r) {
  Object.defineProperty(e, t, {
    configurable: !0,
    get() {
      return this == null ? r : rut(this, t, r.bind(this));
    },
    set(n) {
      rut(this, t, n);
    },
  });
}
//@ chunk-t7zrjgp6.js:8723-8793 esm-layout
function D(e, t) {
  let prototypeOf = Object.getPrototypeOf(e);
  return t in prototypeOf ? void 0 : prototypeOf;
}
//@ chunk-t7zrjgp6.js:8793-8843 esm-layout
var P,
  d = !1,
  K = {
    configurable: !0,
    get() {
      d = !0;
      return;
    },
  };
//@ chunk-t7zrjgp6.js:8843-9286 esm-fingerprint
function PE(e, t, r) {
  let prototypeOf = Object.getPrototypeOf(e._zod);
  if (t in prototypeOf && P !== e._zod) {
    P = void 0;
    return;
  }
  ((P = e._zod),
    Object.defineProperty(prototypeOf, t, {
      configurable: !0,
      get() {
        Object.defineProperty(this, t, K);
        let o = d;
        d = !1;
        try {
          let i = r(this);
          if (d) delete this[t];
          else Object.defineProperty(this, t, { configurable: !0, writable: !0, value: i });
          return ((d = d || o), i);
        } catch (error) {
          throw (delete this[t], (d = d || o), error);
        }
      },
      set(o) {
        Object.defineProperty(this, t, { configurable: !0, writable: !0, value: o });
      },
    }));
}
//@ chunk-t7zrjgp6.js:9286-9632 esm-fingerprint
function P1i(e, t, r, n) {
  let o = D(e, t);
  if (!o) return;
  Object.defineProperty(o, t, {
    configurable: !0,
    get() {
      let i = { configurable: !0, writable: !0, enumerable: n, value: void 0 };
      return (
        Object.defineProperty(this, t, i),
        (i.value = r(this)),
        Object.defineProperty(this, t, i),
        i.value
      );
    },
    set(i) {
      Object.defineProperty(this, t, { configurable: !0, writable: !0, enumerable: n, value: i });
    },
  });
}
//@ chunk-t7zrjgp6.js:9632-9655 esm-fingerprint
var U = "~constantCatch";

export {
  aSr,
  R8e,
  ehs,
  EIi,
  vIi,
  alo,
  llo,
  dlo,
  _Mt,
  cMe,
  PIi,
  ohs,
  shs,
  rut,
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
  uMn,
  YJt,
  IIi,
  nhs,
  Zgs,
  Ld,
  TIi,
  Nve,
  C8e,
  OIi,
  P1i,
  A1i,
  C1i,
  R1i,
  k1i,
  T1i,
  xIi,
  x1i,
  ths,
  rhs,
  U,
  C,
};
