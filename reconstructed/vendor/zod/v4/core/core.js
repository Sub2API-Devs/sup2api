/**
 * zod/v4/core/core.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-t7zrjgp6.js (9)
 * attribution: esm-layout 3, esm-fingerprint 6
 */
import { U, C } from "./util.js";

//@ chunk-t7zrjgp6.js:9655-9700 esm-layout
function MIi(e) {
  let t = () => e;
  return ((t[U] = !0), t);
}
//@ chunk-t7zrjgp6.js:9700-9815 esm-layout
var N,
  freeze = Object.freeze({ status: "aborted" }),
  E = { value: void 0, enumerable: !1 },
  R = "captureStackTrace" in Error ? Error : null;
//@ chunk-t7zrjgp6.js:9815-10001 esm-fingerprint
function L(e) {
  let t = R;
  if (t) {
    let stackTraceLimit = t.stackTraceLimit;
    if (typeof stackTraceLimit === "number") {
      try {
        t.stackTraceLimit = 0;
      } catch {
        return ((R = null), new e());
      }
      try {
        return new e();
      } finally {
        t.stackTraceLimit = stackTraceLimit;
      }
    }
  }
  return new e();
}
//@ chunk-t7zrjgp6.js:10001-11065 esm-fingerprint
function Fr(e, t, r, n) {
  let o = {};
  function i(s) {
    ((this.def = s), (this.constr = g), (this.traits = new Set()));
  }
  i.prototype = o;
  let u = r,
    c = u && new WeakSet();
  function f(s, l) {
    if (!s._zod) {
      E.value = new i(l);
      try {
        Object.defineProperty(s, "_zod", E);
      } finally {
        E.value = void 0;
      }
    }
    if (s._zod.traits.has(e)) return;
    if ((s._zod.traits.add(e), t(s, l), c)) {
      let prototypeOf = Object.getPrototypeOf(s),
        O = s._zod.constr.prototype,
        x = prototypeOf;
      while (x && x !== O) x = Object.getPrototypeOf(x);
      let j = x ?? prototypeOf;
      if (!c.has(j)) (c.add(j), C(j, u));
    }
    let b = g.prototype;
    for (let key in b) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) continue;
      if (!(key in s)) s[key] = b[key].bind(s);
    }
  }
  let _ = n?.Parent ?? Object;
  class y extends _ {}
  Object.defineProperty(y, "name", { value: e });
  function g(s) {
    let l = n?.Parent ? L(y) : this;
    f(l, s);
    let deferred = l._zod.deferred;
    if (deferred) {
      for (let O of deferred) O();
      l._zod.deferred = void 0;
    }
    let a = globalThis.__zod_globalConfig?.postProcessor;
    if (a) a(l);
    return l;
  }
  return (
    Object.defineProperty(g, "init", { value: f }),
    Object.defineProperty(g, Symbol.hasInstance, {
      value: (s) => {
        if (n?.Parent && s instanceof n.Parent) return !0;
        return s?._zod?.traits?.has(e);
      },
    }),
    Object.defineProperty(g, "name", { value: e }),
    g
  );
}
//@ chunk-t7zrjgp6.js:11065-11186 esm-fingerprint
class x8e extends Error {
  constructor() {
    super("Encountered Promise during synchronous parse. Use .parseAsync() instead.");
  }
}
//@ chunk-t7zrjgp6.js:11186-11319 esm-fingerprint
class ZodEncodeError extends Error {
  constructor(e) {
    super(`Encountered unidirectional transform during encode: ${e}`);
    this.name = "ZodEncodeError";
  }
}
//@ chunk-t7zrjgp6.js:11319-11380 esm-fingerprint
(N = globalThis).__zod_globalConfig ?? (N.__zod_globalConfig = {});
//@ chunk-t7zrjgp6.js:11380-11418 esm-fingerprint
var __zod_globalConfig = globalThis.__zod_globalConfig;
//@ chunk-t7zrjgp6.js:11418-11471 esm-layout
function Xne(e) {
  if (e) Object.assign(__zod_globalConfig, e);
  return __zod_globalConfig;
}

export { freeze, __zod_globalConfig, Xne, Fr, x8e, ZodEncodeError, MIi };
