/**
 * zod/v4/classic/deep-partial.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { hb } from "../core/visit.cjs";
import { ra } from "./schemas.cjs";

//@ chunk-1ny7cxrt.js:647824-649068 cjs-fingerprint
var KT = x(function (di) {
  var AQ =
      (di && di.__createBinding) ||
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
    IQ =
      (di && di.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    CQ =
      (di && di.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) AQ(t, e, key);
        }
        return (IQ(t, e), t);
      };
  Object.defineProperty(di, "__esModule", { value: !0 });
  di.deepPartial = RQ;
  var HT = hb(),
    TQ = CQ(ra());
  function RQ(e) {
    return HT.visit(e, {
      object: (t) => t.partial(),
      union: (t) => {
        let def = t._zod.def;
        return def.discriminator === void 0 ? t : TQ.union(def.options);
      },
    });
  }
  (function () {
    var ownPropertyNames = Object.getOwnPropertyNames(di);
    for (var t = 0; t < ownPropertyNames.length; t++) {
      var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(di, ownPropertyNames[t]);
      if (!ownPropertyDescriptor || !ownPropertyDescriptor.get || !ownPropertyDescriptor.configurable)
        continue;
      var o;
      try {
        o = ownPropertyDescriptor.get();
      } catch (error) {
        continue;
      }
      if (o === void 0) continue;
      Object.defineProperty(di, ownPropertyNames[t], {
        value: o,
        writable: !1,
        enumerable: ownPropertyDescriptor.enumerable,
        configurable: !1,
      });
    }
    Object.freeze(di);
  })();
});

export { KT };
