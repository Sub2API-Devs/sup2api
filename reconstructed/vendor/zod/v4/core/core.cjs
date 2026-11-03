/**
 * zod/v4/core/core.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Ee } from "./util.cjs";

//@ chunk-1ny7cxrt.js:104048-106489 cjs-fingerprint
var Xs = x(function (Ll) {
  var tP;
  Object.defineProperty(Ll, "__esModule", { value: !0 });
  Ll.globalConfig = Ll.$ZodEncodeError = Ll.$ZodAsyncError = Ll.$brand = Ll.NEVER = void 0;
  Ll.$constructor = U6;
  Ll.config = z6;
  var rP = Ee();
  Ll.NEVER = Object.freeze({ status: "aborted" });
  var S_ = { value: void 0, enumerable: !1 },
    nP = "captureStackTrace" in Error ? Error : null;
  function N6(e) {
    let t = nP;
    if (t) {
      let stackTraceLimit = t.stackTraceLimit;
      if (typeof stackTraceLimit === "number") {
        try {
          t.stackTraceLimit = 0;
        } catch {
          return ((nP = null), new e());
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
  function U6(e, t, n, o) {
    let r = {};
    function s(m) {
      ((this.def = m), (this.constr = h), (this.traits = new Set()));
    }
    s.prototype = r;
    let a = n,
      l = a && new WeakSet();
    function c(m, y) {
      if (!m._zod) {
        S_.value = new s(y);
        try {
          Object.defineProperty(m, "_zod", S_);
        } finally {
          S_.value = void 0;
        }
      }
      if (m._zod.traits.has(e)) return;
      if ((m._zod.traits.add(e), t(m, y), l)) {
        let prototypeOf = Object.getPrototypeOf(m),
          S = m._zod.constr.prototype,
          j = prototypeOf;
        while (j && j !== S) j = Object.getPrototypeOf(j);
        let M = j ?? prototypeOf;
        if (!l.has(M)) (l.add(M), rP.members(M, a));
      }
      let b = h.prototype;
      for (let key in b) {
        if (!Object.prototype.hasOwnProperty.call(b, key)) continue;
        if (!(key in m)) m[key] = b[key].bind(m);
      }
    }
    let u = o?.Parent ?? Object;
    class f extends u {}
    Object.defineProperty(f, "name", { value: e });
    function h(m) {
      let y = o?.Parent ? N6(f) : this;
      c(y, m);
      let deferred = y._zod.deferred;
      if (deferred) {
        for (let S of deferred) S();
        y._zod.deferred = void 0;
      }
      let w = globalThis.__zod_globalConfig?.postProcessor;
      if (w) w(y);
      return y;
    }
    return (
      Object.defineProperty(h, "init", { value: c }),
      Object.defineProperty(h, Symbol.hasInstance, {
        value: (m) => {
          if (o?.Parent && m instanceof o.Parent) return !0;
          return m?._zod?.traits?.has(e);
        },
      }),
      Object.defineProperty(h, "name", { value: e }),
      h
    );
  }
  Ll.$brand = Symbol("zod_brand");
  class iP extends Error {
    constructor() {
      super("Encountered Promise during synchronous parse. Use .parseAsync() instead.");
    }
  }
  Ll.$ZodAsyncError = iP;
  class ZodEncodeError extends Error {
    constructor(e) {
      super(`Encountered unidirectional transform during encode: ${e}`);
      this.name = "ZodEncodeError";
    }
  }
  Ll.$ZodEncodeError = ZodEncodeError;
  (tP = globalThis).__zod_globalConfig ?? (tP.__zod_globalConfig = {});
  Ll.globalConfig = globalThis.__zod_globalConfig;
  function z6(e) {
    if (e) Object.assign(Ll.globalConfig, e);
    return Ll.globalConfig;
  }
  (function () {
    var ownPropertyNames = Object.getOwnPropertyNames(Ll);
    for (var t = 0; t < ownPropertyNames.length; t++) {
      var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(Ll, ownPropertyNames[t]);
      if (!ownPropertyDescriptor || !ownPropertyDescriptor.get || !ownPropertyDescriptor.configurable)
        continue;
      var o;
      try {
        o = ownPropertyDescriptor.get();
      } catch (error) {
        continue;
      }
      if (o === void 0) continue;
      Object.defineProperty(Ll, ownPropertyNames[t], {
        value: o,
        writable: !1,
        enumerable: ownPropertyDescriptor.enumerable,
        configurable: !1,
      });
    }
    Object.freeze(Ll);
  })();
});

export { Xs };
