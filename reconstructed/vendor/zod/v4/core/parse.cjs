/**
 * zod/v4/core/parse.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Xs } from "./core.cjs";
import { E_ } from "./errors.cjs";
import { Ee } from "./util.cjs";

//@ chunk-1ny7cxrt.js:110963-116076 cjs-fingerprint
var A_ = x(function (we) {
  var oZ =
      (we && we.__createBinding) ||
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
    sZ =
      (we && we.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    P_ =
      (we && we.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) oZ(t, e, key);
        }
        return (sZ(t, e), t);
      };
  Object.defineProperty(we, "__esModule", { value: !0 });
  we.safeDecodeAsync =
    we._safeDecodeAsync =
    we.safeEncodeAsync =
    we._safeEncodeAsync =
    we.safeDecode =
    we._safeDecode =
    we.safeEncode =
    we._safeEncode =
    we.decodeAsync =
    we._decodeAsync =
    we.encodeAsync =
    we._encodeAsync =
    we.decode =
    we._decode =
    we.encode =
    we._encode =
    we.validateAsync =
    we.validate =
    we.safeParseAsync =
    we._safeParseAsync =
    we.safeParse =
    we._safeParse =
    we.parseAsync =
    we._parseAsync =
    we.parse =
    we._parse =
      void 0;
  var Nl = P_(Xs()),
    yi = P_(E_()),
    Ku = P_(Ee());
  function Xf(e, t) {
    return { callee: t?.callee ?? e, Err: t?.Err };
  }
  var aZ = (e) => {
    let t = (n, o, r, s) => {
      let a = r ? { ...r, async: !1 } : { async: !1 },
        run = n._zod.run({ value: o, issues: [] }, a);
      if (run instanceof Promise) throw new Nl.$ZodAsyncError();
      if (run.issues.length) {
        let c = new (s?.Err ?? e)(run.issues.map((issue) => Ku.finalizeIssue(issue, a, Nl.config())));
        throw (Ku.captureStackTrace(c, s?.callee ?? t), c);
      }
      return run.value;
    };
    return t;
  };
  we._parse = aZ;
  we.parse = (0, we._parse)(yi.$ZodRealError);
  var lZ = (e) => {
    let t = async (n, o, r, s) => {
      let a = r ? { ...r, async: !0 } : { async: !0 },
        run = n._zod.run({ value: o, issues: [] }, a);
      if (run instanceof Promise) run = await run;
      if (run.issues.length) {
        let c = new (s?.Err ?? e)(run.issues.map((issue) => Ku.finalizeIssue(issue, a, Nl.config())));
        throw (Ku.captureStackTrace(c, s?.callee ?? t), c);
      }
      return run.value;
    };
    return t;
  };
  we._parseAsync = lZ;
  we.parseAsync = (0, we._parseAsync)(yi.$ZodRealError);
  var cZ = (e) => (t, n, o) => {
    let r = o ? { ...o, async: !1 } : { async: !1 },
      run = t._zod.run({ value: n, issues: [] }, r);
    if (run instanceof Promise) throw new Nl.$ZodAsyncError();
    return run.issues.length ? cP(e, run.issues, r) : { success: !0, data: run.value };
  };
  we._safeParse = cZ;
  we.safeParse = (0, we._safeParse)(yi.$ZodRealError);
  function cP(e, t, n) {
    let o;
    return {
      success: !1,
      get error() {
        if (!o) ((o = new e(t.map((r) => Ku.finalizeIssue(r, n, Nl.config())))), (t = void 0), (n = void 0));
        return o;
      },
      set error(r) {
        ((o = r), (t = void 0), (n = void 0));
      },
    };
  }
  var uZ = (e) => async (t, n, o) => {
    let r = o ? { ...o, async: !0 } : { async: !0 },
      run = t._zod.run({ value: n, issues: [] }, r);
    if (run instanceof Promise) run = await run;
    return run.issues.length ? cP(e, run.issues, r) : { success: !0, data: run.value };
  };
  we._safeParseAsync = uZ;
  we.safeParseAsync = (0, we._safeParseAsync)(yi.$ZodRealError);
  var dZ = Symbol.for("zod.compile.invalid"),
    fZ = Symbol.for("zod.compile.fallback");
  we.validate = (e, t, n) => {
    let validator = e._zod.bag.validator;
    if (validator !== void 0) {
      if (validator(t) !== dZ) return !0;
      if (validator.definite === !0 && n === void 0) return !1;
    }
    return pZ(e, t, n);
  };
  function pZ(e, t, n) {
    let o = n ? { ...n, async: !1, abortEarly: !0 } : { async: !1, abortEarly: !0 },
      fallbackRun = e._zod.bag.fallbackRun,
      s;
    if (fallbackRun) ((o[fZ] = !0), (s = fallbackRun({ value: t, issues: [] }, o)));
    else s = e._zod.run({ value: t, issues: [] }, o);
    if (s instanceof Promise) throw new Nl.$ZodAsyncError();
    return s.issues.length === 0;
  }
  var hZ = async (e, t, n) => {
    let o = n ? { ...n, async: !0, abortEarly: !0 } : { async: !0, abortEarly: !0 },
      run = e._zod.run({ value: t, issues: [] }, o);
    if (run instanceof Promise) run = await run;
    return run.issues.length === 0;
  };
  we.validateAsync = hZ;
  var mZ = (e) => {
    let t = (0, we._parse)(e),
      n = (o, r, s, a) => {
        let l = s ? { ...s, direction: "backward" } : { direction: "backward" };
        return t(o, r, l, Xf(n, a));
      };
    return n;
  };
  we._encode = mZ;
  we.encode = (0, we._encode)(yi.$ZodRealError);
  var gZ = (e) => {
    let t = (0, we._parse)(e),
      n = (o, r, s, a) => t(o, r, s, Xf(n, a));
    return n;
  };
  we._decode = gZ;
  we.decode = (0, we._decode)(yi.$ZodRealError);
  var yZ = (e) => {
    let t = (0, we._parseAsync)(e),
      n = async (o, r, s, a) => {
        let l = s ? { ...s, direction: "backward" } : { direction: "backward" };
        return await t(o, r, l, Xf(n, a));
      };
    return n;
  };
  we._encodeAsync = yZ;
  we.encodeAsync = (0, we._encodeAsync)(yi.$ZodRealError);
  var _Z = (e) => {
    let t = (0, we._parseAsync)(e),
      n = async (o, r, s, a) => await t(o, r, s, Xf(n, a));
    return n;
  };
  we._decodeAsync = _Z;
  we.decodeAsync = (0, we._decodeAsync)(yi.$ZodRealError);
  var bZ = (e) => (t, n, o) => {
    let r = o ? { ...o, direction: "backward" } : { direction: "backward" };
    return (0, we._safeParse)(e)(t, n, r);
  };
  we._safeEncode = bZ;
  we.safeEncode = (0, we._safeEncode)(yi.$ZodRealError);
  var vZ = (e) => (t, n, o) => (0, we._safeParse)(e)(t, n, o);
  we._safeDecode = vZ;
  we.safeDecode = (0, we._safeDecode)(yi.$ZodRealError);
  var wZ = (e) => async (t, n, o) => {
    let r = o ? { ...o, direction: "backward" } : { direction: "backward" };
    return (0, we._safeParseAsync)(e)(t, n, r);
  };
  we._safeEncodeAsync = wZ;
  we.safeEncodeAsync = (0, we._safeEncodeAsync)(yi.$ZodRealError);
  var OZ = (e) => async (t, n, o) => (0, we._safeParseAsync)(e)(t, n, o);
  we._safeDecodeAsync = OZ;
  we.safeDecodeAsync = (0, we._safeDecodeAsync)(yi.$ZodRealError);
  (function () {
    var ownPropertyNames = Object.getOwnPropertyNames(we);
    for (var t = 0; t < ownPropertyNames.length; t++) {
      var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(we, ownPropertyNames[t]);
      if (!ownPropertyDescriptor || !ownPropertyDescriptor.get || !ownPropertyDescriptor.configurable)
        continue;
      var o;
      try {
        o = ownPropertyDescriptor.get();
      } catch (error) {
        continue;
      }
      if (o === void 0) continue;
      Object.defineProperty(we, ownPropertyNames[t], {
        value: o,
        writable: !1,
        enumerable: ownPropertyDescriptor.enumerable,
        configurable: !1,
      });
    }
    Object.freeze(we);
  })();
});

export { A_ };
