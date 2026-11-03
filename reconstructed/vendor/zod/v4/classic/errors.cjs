/**
 * zod/v4/classic/errors.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Wr } from "../core/index.cjs";
import { Ee } from "../core/util.cjs";

//@ chunk-1ny7cxrt.js:591116-593194 cjs-fingerprint
var ib = x(function (Pr) {
  var EX =
      (Pr && Pr.__createBinding) ||
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
    PX =
      (Pr && Pr.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    dT =
      (Pr && Pr.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) EX(t, e, key);
        }
        return (PX(t, e), t);
      };
  Object.defineProperty(Pr, "__esModule", { value: !0 });
  Pr.ZodRealError = Pr.ZodError = void 0;
  var Ch = dT(Wr()),
    pT = Wr(),
    cT = dT(Ee()),
    weakSet = new WeakSet([Object.prototype, Error.prototype]);
  function Ih(e, t, n) {
    Object.defineProperty(e, t, {
      configurable: !0,
      enumerable: !1,
      get() {
        let o = n(this);
        return (Object.defineProperty(this, t, { value: o, configurable: !0, writable: !0 }), o);
      },
      set(o) {
        Object.defineProperty(this, t, { value: o, configurable: !0, writable: !0 });
      },
    });
  }
  var hT = (e, t) => {
    (pT.$ZodError.init(e, t), (e.name = "ZodError"));
    let prototypeOf = Object.getPrototypeOf(e);
    if (weakSet.has(prototypeOf)) return;
    (weakSet.add(prototypeOf),
      Ih(prototypeOf, "format", (o) => (r) => Ch.formatError(o, r)),
      Ih(prototypeOf, "flatten", (o) => (r) => Ch.flattenError(o, r)),
      Ih(prototypeOf, "addIssue", (o) => (r) => {
        (o.issues.push(r), (o.message = JSON.stringify(o.issues, cT.jsonStringifyReplacer, 2)));
      }),
      Ih(prototypeOf, "addIssues", (o) => (r) => {
        (o.issues.push(...r), (o.message = JSON.stringify(o.issues, cT.jsonStringifyReplacer, 2)));
      }),
      Object.defineProperty(prototypeOf, "isEmpty", {
        configurable: !0,
        enumerable: !1,
        get() {
          return this.issues.length === 0;
        },
      }));
  };
  Pr.ZodError = Ch.$constructor("ZodError", hT);
  Pr.ZodRealError = Ch.$constructor("ZodError", hT, void 0, { Parent: Error });
  (function () {
    var ownPropertyNames = Object.getOwnPropertyNames(Pr);
    for (var t = 0; t < ownPropertyNames.length; t++) {
      var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(Pr, ownPropertyNames[t]);
      if (!ownPropertyDescriptor || !ownPropertyDescriptor.get || !ownPropertyDescriptor.configurable)
        continue;
      var o;
      try {
        o = ownPropertyDescriptor.get();
      } catch (error) {
        continue;
      }
      if (o === void 0) continue;
      Object.defineProperty(Pr, ownPropertyNames[t], {
        value: o,
        writable: !1,
        enumerable: ownPropertyDescriptor.enumerable,
        configurable: !1,
      });
    }
    Object.freeze(Pr);
  })();
});

export { ib };
