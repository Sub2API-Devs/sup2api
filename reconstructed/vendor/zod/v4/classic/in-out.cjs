/**
 * zod/v4/classic/in-out.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Ee } from "../core/util.cjs";
import { hb } from "../core/visit.cjs";
import { ra } from "./schemas.cjs";

//@ chunk-1ny7cxrt.js:649068-650685 cjs-fingerprint
var VT = x(function (Jr) {
  var DQ =
      (Jr && Jr.__createBinding) ||
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
    MQ =
      (Jr && Jr.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    jQ =
      (Jr && Jr.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) DQ(t, e, key);
        }
        return (MQ(t, e), t);
      };
  Object.defineProperty(Jr, "__esModule", { value: !0 });
  Jr.input = UQ;
  Jr.output = zQ;
  var Fh = Ee(),
    Bh = hb(),
    xQ = jQ(ra());
  function LQ(e, t) {
    if (!t?.length) return e;
    let def = e._zod.def;
    return Fh.clone(e, Fh.mergeDefs(def, { checks: [...(def.checks ?? []), ...t] }), { parent: !0 });
  }
  function ZT(e) {
    return LQ(e.out, e.checks);
  }
  function NQ(e) {
    return e.in._zod.traits.has("$ZodTransform") ? ZT(e) : e.in;
  }
  function UQ(e) {
    return Bh.visit(e, {
      pipe: (t) => NQ(t._zod.def),
      default: (t, n) => (n ? xQ.optional(t._zod.def.innerType) : t),
      catch: (t, n) => (n ? t._zod.def.innerType : t),
    });
  }
  function zQ(e) {
    return Bh.visit(e, { pipe: (t) => ZT(t._zod.def), prefault: (t, n) => (n ? t._zod.def.innerType : t) });
  }
  (function () {
    var ownPropertyNames = Object.getOwnPropertyNames(Jr);
    for (var t = 0; t < ownPropertyNames.length; t++) {
      var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(Jr, ownPropertyNames[t]);
      if (!ownPropertyDescriptor || !ownPropertyDescriptor.get || !ownPropertyDescriptor.configurable)
        continue;
      var o;
      try {
        o = ownPropertyDescriptor.get();
      } catch (error) {
        continue;
      }
      if (o === void 0) continue;
      Object.defineProperty(Jr, ownPropertyNames[t], {
        value: o,
        writable: !1,
        enumerable: ownPropertyDescriptor.enumerable,
        configurable: !1,
      });
    }
    Object.freeze(Jr);
  })();
});

export { VT };
