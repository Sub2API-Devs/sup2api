/**
 * zod/v4/core/util.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Xs } from "./core.cjs";

//@ chunk-1ny7cxrt.js:89659-104048 cjs-fingerprint
var Ee = x(function (jl) {
  Object.defineProperty(jl, "__esModule", { value: !0 });
  jl.CONSTANT_CATCH =
    jl.Class =
    jl.BIGINT_FORMAT_RANGES =
    jl.NUMBER_FORMAT_RANGES =
    jl.primitiveTypes =
    jl.propertyKeyTypes =
    jl.getParsedType =
    jl.allowsEval =
    jl.captureStackTrace =
      void 0;
  jl.assertEqual = pK;
  jl.assertNotEqual = hK;
  jl.toZod = mK;
  jl.assertIs = gK;
  jl.assertNever = yK;
  jl.assert = _K;
  jl.getEnumValues = bK;
  jl.joinValues = vK;
  jl.jsonStringifyReplacer = wK;
  jl.cached = VE;
  jl.nullish = OK;
  jl.cleanRegex = SK;
  jl.floatSafeRemainder = kK;
  jl.defineLazy = EK;
  jl.objectClone = PK;
  jl.assignProp = w_;
  jl.rawShape = qE;
  jl.mergeDefs = Ls;
  jl.cloneDef = IK;
  jl.getElementAtPath = CK;
  jl.promiseAllObject = TK;
  jl.randomString = $K;
  jl.esc = RK;
  jl.slugify = DK;
  jl.isObject = v_;
  jl.isPlainObject = qf;
  jl.shallowClone = MK;
  jl.numKeys = jK;
  jl.escapeRegex = LK;
  jl.clone = Js;
  jl.normalizeParams = NK;
  jl.createTransparentProxy = UK;
  jl.stringifyPrimitive = YE;
  jl.optionalKeys = zK;
  jl.pick = FK;
  jl.omit = BK;
  jl.extend = HK;
  jl.safeExtend = KK;
  jl.merge = ZK;
  jl.partial = VK;
  jl.required = qK;
  jl.aborted = GK;
  jl.explicitlyAborted = WK;
  jl.prefixIssues = YK;
  jl.unwrapMessage = Ml;
  jl.attachSchema = JK;
  jl.finalizeIssue = XK;
  jl.getSizableOrigin = QK;
  jl.codePointLength = t4;
  jl.getLengthableOrigin = n4;
  jl.parsedType = r4;
  jl.issue = i4;
  jl.cleanEnum = o4;
  jl.base64ToUint8Array = XE;
  jl.uint8ArrayToBase64 = QE;
  jl.base64urlToUint8Array = s4;
  jl.uint8ArrayToBase64url = a4;
  jl.hexToUint8Array = l4;
  jl.uint8ArrayToHex = c4;
  jl.members = u4;
  jl.own = xl;
  jl.hide = d4;
  jl.derived = f4;
  jl.defineLazyInternal = m4;
  jl.installLazyProp = g4;
  jl.constantCatch = y4;
  var KE = Xs();
  function pK(e) {
    return e;
  }
  function hK(e) {
    return e;
  }
  function mK() {
    return (e) => e;
  }
  function gK(e) {}
  function yK(e) {
    throw Error("Unexpected value in exhaustive check");
  }
  function _K(e) {}
  function bK(e) {
    let filtered = Object.values(e).filter((o) => typeof o === "number");
    return Object.entries(e)
      .filter(([o, r]) => filtered.indexOf(+o) === -1)
      .map(([o, r]) => r);
  }
  function vK(e, t = "|") {
    return e.map((n) => YE(n)).join(t);
  }
  function wK(e, t) {
    if (typeof t === "bigint") return t.toString();
    return t;
  }
  class ZE {
    constructor(e) {
      ((this._getter = e), (this._value = void 0));
    }
    get value() {
      let _getter = this._getter;
      if (_getter !== void 0) ((this._value = _getter()), (this._getter = void 0));
      return this._value;
    }
  }
  function VE(e) {
    return new ZE(e);
  }
  function OK(e) {
    return e === null || e === void 0;
  }
  function SK(e) {
    let t = e.startsWith("^") ? 1 : 0,
      n = e.endsWith("$") ? e.length - 1 : e.length;
    return e.slice(t, n);
  }
  function kK(e, t) {
    let n = e / t,
      rounded = Math.round(n),
      r = 4 * Number.EPSILON * Math.max(Math.abs(n), 1);
    if (Math.abs(n - rounded) < r) return 0;
    return n - rounded;
  }
  var BE = Symbol("evaluating");
  function EK(e, t, n) {
    let o = void 0;
    Object.defineProperty(e, t, {
      get() {
        if (o === BE) return;
        if (o === void 0) ((o = BE), (o = n()));
        return o;
      },
      set(r) {
        Object.defineProperty(e, t, { value: r });
      },
      configurable: !0,
    });
  }
  function PK(e) {
    return Object.create(Object.getPrototypeOf(e), Object.getOwnPropertyDescriptors(e));
  }
  function w_(e, t, n) {
    Object.defineProperty(e, t, { value: n, writable: !0, enumerable: !0, configurable: !0 });
  }
  function qE(e) {
    let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(e, "shape");
    return ownPropertyDescriptor?.get ? ownPropertyDescriptor.get.raw : ownPropertyDescriptor?.value;
  }
  function xs(e) {
    return qE(e._zod.def) ?? e._zod.def.shape;
  }
  function GE(e, t, n) {
    Object.defineProperty(e, t, {
      get() {
        let o = n();
        return (w_(this, t, o), o);
      },
      enumerable: !0,
      configurable: !0,
    });
  }
  function WE(e, t, n) {
    if (t in e) w_(e, t, n);
    else e[t] = n;
  }
  function Xa(e, t, n, o) {
    let r = xs(t);
    for (let s of n) {
      let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(r, s);
      if (!ownPropertyDescriptor.enumerable) continue;
      if (ownPropertyDescriptor.get)
        GE(e, s, () => {
          let l = t._zod.def.shape[s];
          return o ? o(l, s) : l;
        });
      else WE(e, s, o ? o(ownPropertyDescriptor.value, s) : ownPropertyDescriptor.value);
    }
  }
  function AK(e, t) {
    for (let n of Reflect.ownKeys(t)) {
      let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(t, n);
      if (!ownPropertyDescriptor.enumerable) continue;
      if (ownPropertyDescriptor.get) GE(e, n, () => t[n]);
      else WE(e, n, ownPropertyDescriptor.value);
    }
  }
  function Ls(...e) {
    let t = {};
    for (let n of e) {
      let ownPropertyDescriptors = Object.getOwnPropertyDescriptors(n);
      Object.assign(t, ownPropertyDescriptors);
    }
    return Object.defineProperties({}, t);
  }
  function IK(e) {
    return Ls(e._zod.def);
  }
  function CK(e, t) {
    if (!t) return e;
    return t.reduce((n, o) => n?.[o], e);
  }
  function TK(e) {
    let keys = Object.keys(e),
      mapped = keys.map((o) => e[o]);
    return Promise.all(mapped).then((o) => {
      let r = {};
      for (let s = 0; s < keys.length; s++) r[keys[s]] = o[s];
      return r;
    });
  }
  function $K(e = 10) {
    let n = "";
    for (let o = 0; o < e; o++) n += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)];
    return n;
  }
  function RK(e) {
    return JSON.stringify(e);
  }
  function DK(e) {
    return e
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  jl.captureStackTrace = "captureStackTrace" in Error ? Error.captureStackTrace : (...e) => {};
  function v_(e) {
    return typeof e === "object" && e !== null && !Array.isArray(e);
  }
  jl.allowsEval = VE(() => {
    if (KE.globalConfig.jitless) return !1;
    if (typeof navigator < "u" && navigator?.userAgent?.includes("Cloudflare")) return !1;
    try {
      return (new Function(""), !0);
    } catch (error) {
      return !1;
    }
  });
  function qf(e) {
    if (v_(e) === !1) return !1;
    let t = e.constructor;
    if (t === void 0) return !0;
    if (typeof t !== "function") return !0;
    let n = t.prototype;
    if (v_(n) === !1) return !1;
    if (Object.prototype.hasOwnProperty.call(n, "isPrototypeOf") === !1) return !1;
    return !0;
  }
  function MK(e) {
    if (qf(e)) return { ...e };
    if (Array.isArray(e)) return [...e];
    if (e instanceof Map) return new Map(e);
    if (e instanceof Set) return new Set(e);
    return e;
  }
  function jK(e) {
    let t = 0;
    for (let key in e) if (Object.prototype.hasOwnProperty.call(e, key)) t++;
    return t;
  }
  var xK = (e) => {
    let t = typeof e;
    switch (t) {
      case "undefined":
        return "undefined";
      case "string":
        return "string";
      case "number":
        return Number.isNaN(e) ? "nan" : "number";
      case "boolean":
        return "boolean";
      case "function":
        return "function";
      case "bigint":
        return "bigint";
      case "symbol":
        return "symbol";
      case "object":
        if (Array.isArray(e)) return "array";
        if (e === null) return "null";
        if (e.then && typeof e.then === "function" && e.catch && typeof e.catch === "function")
          return "promise";
        if (typeof Map < "u" && e instanceof Map) return "map";
        if (typeof Set < "u" && e instanceof Set) return "set";
        if (typeof Date < "u" && e instanceof Date) return "date";
        if (typeof File < "u" && e instanceof File) return "file";
        return "object";
      default:
        throw Error(`Unknown data type: ${t}`);
    }
  };
  jl.getParsedType = xK;
  jl.propertyKeyTypes = new Set(["string", "number", "symbol"]);
  jl.primitiveTypes = new Set(["string", "number", "bigint", "boolean", "symbol", "undefined"]);
  function LK(e) {
    return e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  function Js(e, t, n) {
    let o = new e._zod.constr(t ?? e._zod.def);
    if (!t || n?.parent) o._zod.parent = e;
    return o;
  }
  function NK(e) {
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
  function UK(e) {
    let t;
    return new Proxy(
      {},
      {
        get(n, o, r) {
          return (t ?? (t = e()), Reflect.get(t, o, r));
        },
        set(n, o, r, s) {
          return (t ?? (t = e()), Reflect.set(t, o, r, s));
        },
        has(n, o) {
          return (t ?? (t = e()), Reflect.has(t, o));
        },
        deleteProperty(n, o) {
          return (t ?? (t = e()), Reflect.deleteProperty(t, o));
        },
        ownKeys(n) {
          return (t ?? (t = e()), Reflect.ownKeys(t));
        },
        getOwnPropertyDescriptor(n, o) {
          return (t ?? (t = e()), Reflect.getOwnPropertyDescriptor(t, o));
        },
        defineProperty(n, o, r) {
          return (t ?? (t = e()), Reflect.defineProperty(t, o, r));
        },
      },
    );
  }
  function YE(e) {
    if (typeof e === "bigint") return e.toString() + "n";
    if (typeof e === "string") return `"${e}"`;
    return `${e}`;
  }
  function zK(e) {
    return Object.keys(e).filter((t) => e[t]._zod.optin !== void 0 && e[t]._zod.optout === "optional");
  }
  jl.NUMBER_FORMAT_RANGES = (() => ({
    safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
    int32: [-2147483648, 2147483647],
    uint32: [0, 4294967295],
    float32: [-340282346638528860000000000000000000000, 340282346638528860000000000000000000000],
    float64: [-Number.MAX_VALUE, Number.MAX_VALUE],
  }))();
  jl.BIGINT_FORMAT_RANGES = {
    int64: [BigInt("-9223372036854775808"), BigInt("9223372036854775807")],
    uint64: [BigInt(0), BigInt("18446744073709551615")],
  };
  function FK(e, t) {
    let def = e._zod.def,
      checks = def.checks;
    if (checks && checks.length > 0)
      throw Error(".pick() cannot be used on object schemas containing refinements");
    let s = {};
    return (Xa(s, e, Gf(e, t)), Js(e, Ls(def, { shape: s, checks: [] })));
  }
  function Gf(e, t) {
    let n = xs(e),
      o = [];
    for (let r of Reflect.ownKeys(t)) {
      if (!Object.getOwnPropertyDescriptor(n, r)?.enumerable) throw Error(`Unrecognized key: "${String(r)}"`);
      if (t[r]) o.push(r);
    }
    return o;
  }
  function BK(e, t) {
    let def = e._zod.def,
      checks = def.checks;
    if (checks && checks.length > 0)
      throw Error(".omit() cannot be used on object schemas containing refinements");
    let s = new Set(Gf(e, t)),
      a = {};
    return (
      Xa(
        a,
        e,
        Reflect.ownKeys(xs(e)).filter((l) => !s.has(l)),
      ),
      Js(e, Ls(def, { shape: a, checks: [] }))
    );
  }
  function HK(e, t) {
    if (!qf(t)) throw Error("Invalid input to extend: expected a plain object");
    let checks = e._zod.def.checks;
    if (checks && checks.length > 0) {
      let r = xs(e);
      for (let s of Reflect.ownKeys(t))
        if (Object.getOwnPropertyDescriptor(r, s) !== void 0)
          throw Error(
            "Cannot overwrite keys on object schemas containing refinements. Use `.safeExtend()` instead.",
          );
    }
    return Js(e, Ls(e._zod.def, { shape: JE(e, t) }));
  }
  function JE(e, t) {
    let n = {};
    return (Xa(n, e, Reflect.ownKeys(xs(e))), AK(n, t), n);
  }
  function KK(e, t) {
    if (!qf(t)) throw Error("Invalid input to safeExtend: expected a plain object");
    return Js(e, Ls(e._zod.def, { shape: JE(e, t) }));
  }
  function ZK(e, t) {
    if (!t?._zod?.def)
      throw Error(
        "Invalid input to merge: expected an object schema. To merge a plain shape, use `.extend()`.",
      );
    if (e._zod.def.checks?.length)
      throw Error(
        ".merge() cannot be used on object schemas containing refinements. Use .safeExtend() instead.",
      );
    let n = {};
    (Xa(n, e, Reflect.ownKeys(xs(e))), Xa(n, t, Reflect.ownKeys(xs(t))));
    let o = Ls(e._zod.def, {
      shape: n,
      get catchall() {
        return t._zod.def.catchall;
      },
      checks: t._zod.def.checks ?? [],
    });
    return Js(e, o);
  }
  function VK(e, t, n, o = "partial") {
    let checks = t._zod.def.checks;
    if (checks && checks.length > 0)
      throw Error(`.${o}() cannot be used on object schemas containing refinements`);
    let l = n ? new Set(Gf(t, n)) : void 0,
      c = {};
    return (
      Xa(
        c,
        t,
        Reflect.ownKeys(xs(t)),
        e && ((u, f) => (l && !l.has(f) ? u : new e({ type: "optional", innerType: u }))),
      ),
      Js(t, Ls(t._zod.def, { shape: c, checks: [] }))
    );
  }
  function qK(e, t, n) {
    let o = n ? new Set(Gf(t, n)) : void 0,
      r = {};
    return (
      Xa(r, t, Reflect.ownKeys(xs(t)), (s, a) =>
        o && !o.has(a) ? s : new e({ type: "nonoptional", innerType: s }),
      ),
      Js(t, Ls(t._zod.def, { shape: r }))
    );
  }
  function GK(e, t = 0) {
    if (e.aborted === !0) return !0;
    for (let n = t; n < e.issues.length; n++) if (e.issues[n]?.continue !== !0) return !0;
    return !1;
  }
  function WK(e, t = 0) {
    if (e.aborted === !0) return !0;
    for (let n = t; n < e.issues.length; n++) if (e.issues[n]?.continue === !1) return !0;
    return !1;
  }
  function YK(e, t) {
    return t.map((n) => {
      var o;
      return ((o = n).path ?? (o.path = []), n.path.unshift(e), n);
    });
  }
  function Ml(e) {
    return typeof e === "string" ? e : e?.message;
  }
  function JK(e, t, n) {
    var o;
    for (let r = t; r < e.length; r++) (o = e[r]).schema ?? (o.schema = n);
  }
  function XK(e, t, n) {
    var o;
    let r = e.inst?._zod?.traits;
    if (r?.has("$ZodType"))
      if (r.has("$ZodCheck")) (o = e).schema ?? (o.schema = e.inst);
      else e.schema = e.inst;
    let s = e.schema !== e.inst ? e.schema?._zod.def?.error : void 0,
      a = e.message
        ? e.message
        : (Ml(e.inst?._zod.def?.error?.(e)) ??
          Ml(s?.(e)) ??
          Ml(t?.error?.(e)) ??
          Ml(n.customError?.(e)) ??
          Ml(n.localeError?.(e)) ??
          "Invalid input"),
      l = {};
    for (let c of Object.keys(e)) {
      if (c === "inst" || c === "schema" || c === "continue" || c === "input" || c === "__proto__") continue;
      l[c] = e[c];
    }
    if ((l.path ?? (l.path = []), (l.message = a), t?.reportInput)) l.input = e.input;
    return l;
  }
  function QK(e) {
    if (e instanceof Set) return "set";
    if (e instanceof Map) return "map";
    if (e instanceof File) return "file";
    return "unknown";
  }
  var e4 = /[\uD800-\uDBFF]/;
  function t4(e) {
    let t = e.length;
    if (!e4.test(e)) return t;
    let n = t;
    for (let o = 0; o < t - 1; o++)
      if ((e.charCodeAt(o) & 64512) === 55296 && (e.charCodeAt(o + 1) & 64512) === 56320) (n--, o++);
    return n;
  }
  function n4(e) {
    if (Array.isArray(e)) return "array";
    if (typeof e === "string") return "string";
    return "unknown";
  }
  function r4(e) {
    let t = typeof e;
    switch (t) {
      case "number":
        return Number.isNaN(e) ? "nan" : "number";
      case "object": {
        if (e === null) return "null";
        if (Array.isArray(e)) return "array";
        let n = e;
        if (n && Object.getPrototypeOf(n) !== Object.prototype && "constructor" in n && n.constructor)
          return n.constructor.name;
      }
    }
    return t;
  }
  function i4(...e) {
    let [t, n, o] = e;
    if (typeof t === "string") return { message: t, code: "custom", input: n, inst: o };
    return { ...t };
  }
  function o4(e) {
    return Object.entries(e)
      .filter(([t, n]) => Number.isNaN(Number.parseInt(t, 10)))
      .map((t) => t[1]);
  }
  function XE(e) {
    let t = atob(e),
      uint8Array = new Uint8Array(t.length);
    for (let o = 0; o < t.length; o++) uint8Array[o] = t.charCodeAt(o);
    return uint8Array;
  }
  function QE(e) {
    let t = "";
    for (let n = 0; n < e.length; n++) t += String.fromCharCode(e[n]);
    return btoa(t);
  }
  function s4(e) {
    let replaced = e.replace(/-/g, "+").replace(/_/g, "/"),
      repeat = "=".repeat((4 - (replaced.length % 4)) % 4);
    return XE(replaced + repeat);
  }
  function a4(e) {
    return QE(e).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }
  function l4(e) {
    let replaced = e.replace(/^0x/, "");
    if (replaced.length % 2 !== 0) throw Error("Invalid hex string length");
    let uint8Array = new Uint8Array(replaced.length / 2);
    for (let o = 0; o < replaced.length; o += 2)
      uint8Array[o / 2] = Number.parseInt(replaced.slice(o, o + 2), 16);
    return uint8Array;
  }
  function c4(e) {
    return Array.from(e)
      .map((t) => t.toString(16).padStart(2, "0"))
      .join("");
  }
  class eP {
    constructor(...e) {}
  }
  jl.Class = eP;
  function u4(e, t) {
    for (let key in t) {
      let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(t, key);
      if (ownPropertyDescriptor.get)
        Object.defineProperty(e, key, { ...ownPropertyDescriptor, enumerable: !1 });
      else HE(e, key, ownPropertyDescriptor.value);
    }
    for (let n of Object.getOwnPropertySymbols(t)) HE(e, n, t[n]);
  }
  function xl(e, t, n, o = !0) {
    return (Object.defineProperty(e, t, { configurable: !0, writable: !0, enumerable: o, value: n }), n);
  }
  function d4(e, t, n) {
    return xl(e, t, n, !1);
  }
  function f4(e, t) {
    for (let key in e) {
      let o = e[key];
      Object.defineProperty(t, key, {
        configurable: !0,
        enumerable: !0,
        get() {
          return xl(this, key, o(this));
        },
        set(r) {
          xl(this, key, r);
        },
      });
    }
    return t;
  }
  function HE(e, t, n) {
    Object.defineProperty(e, t, {
      configurable: !0,
      get() {
        return this == null ? n : xl(this, t, n.bind(this));
      },
      set(o) {
        xl(this, t, o);
      },
    });
  }
  function p4(e, t) {
    let prototypeOf = Object.getPrototypeOf(e);
    return t in prototypeOf ? void 0 : prototypeOf;
  }
  var b_,
    Ys = !1,
    h4 = {
      configurable: !0,
      get() {
        Ys = !0;
        return;
      },
    };
  function m4(e, t, n) {
    let prototypeOf = Object.getPrototypeOf(e._zod);
    if (t in prototypeOf && b_ !== e._zod) {
      b_ = void 0;
      return;
    }
    ((b_ = e._zod),
      Object.defineProperty(prototypeOf, t, {
        configurable: !0,
        get() {
          Object.defineProperty(this, t, h4);
          let r = Ys;
          Ys = !1;
          try {
            let s = n(this);
            if (Ys) delete this[t];
            else Object.defineProperty(this, t, { configurable: !0, writable: !0, value: s });
            return ((Ys = Ys || r), s);
          } catch (error) {
            throw (delete this[t], (Ys = Ys || r), error);
          }
        },
        set(r) {
          Object.defineProperty(this, t, { configurable: !0, writable: !0, value: r });
        },
      }));
  }
  function g4(e, t, n, o) {
    let r = p4(e, t);
    if (!r) return;
    Object.defineProperty(r, t, {
      configurable: !0,
      get() {
        let s = { configurable: !0, writable: !0, enumerable: o, value: void 0 };
        return (
          Object.defineProperty(this, t, s),
          (s.value = n(this)),
          Object.defineProperty(this, t, s),
          s.value
        );
      },
      set(s) {
        Object.defineProperty(this, t, { configurable: !0, writable: !0, enumerable: o, value: s });
      },
    });
  }
  jl.CONSTANT_CATCH = "~constantCatch";
  function y4(e) {
    let t = () => e;
    return ((t[jl.CONSTANT_CATCH] = !0), t);
  }
  (function () {
    var ownPropertyNames = Object.getOwnPropertyNames(jl);
    for (var t = 0; t < ownPropertyNames.length; t++) {
      var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(jl, ownPropertyNames[t]);
      if (!ownPropertyDescriptor || !ownPropertyDescriptor.get || !ownPropertyDescriptor.configurable)
        continue;
      var o;
      try {
        o = ownPropertyDescriptor.get();
      } catch (error) {
        continue;
      }
      if (o === void 0) continue;
      Object.defineProperty(jl, ownPropertyNames[t], {
        value: o,
        writable: !1,
        enumerable: ownPropertyDescriptor.enumerable,
        configurable: !1,
      });
    }
    Object.freeze(jl);
  })();
});

export { Ee };
