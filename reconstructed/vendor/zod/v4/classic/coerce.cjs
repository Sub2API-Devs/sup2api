/**
 * zod/v4/classic/coerce.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Wr } from "../core/index.cjs";
import { ra } from "./schemas.cjs";

//@ chunk-1ny7cxrt.js:650685-652113 cjs-fingerprint
var GT = x(function (mr) {
  var FQ =
      (mr && mr.__createBinding) ||
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
    HQ =
      (mr && mr.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    qT =
      (mr && mr.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) FQ(t, e, key);
        }
        return (HQ(t, e), t);
      };
  Object.defineProperty(mr, "__esModule", { value: !0 });
  mr.string = KQ;
  mr.number = ZQ;
  mr.boolean = VQ;
  mr.bigint = qQ;
  mr.date = GQ;
  var id = qT(Wr()),
    od = qT(ra());
  function KQ(e) {
    return id._coercedString(od.ZodString, e);
  }
  function ZQ(e) {
    return id._coercedNumber(od.ZodNumber, e);
  }
  function VQ(e) {
    return id._coercedBoolean(od.ZodBoolean, e);
  }
  function qQ(e) {
    return id._coercedBigint(od.ZodBigInt, e);
  }
  function GQ(e) {
    return id._coercedDate(od.ZodDate, e);
  }
  (function () {
    var ownPropertyNames = Object.getOwnPropertyNames(mr);
    for (var t = 0; t < ownPropertyNames.length; t++) {
      var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(mr, ownPropertyNames[t]);
      if (!ownPropertyDescriptor || !ownPropertyDescriptor.get || !ownPropertyDescriptor.configurable)
        continue;
      var o;
      try {
        o = ownPropertyDescriptor.get();
      } catch (error) {
        continue;
      }
      if (o === void 0) continue;
      Object.defineProperty(mr, ownPropertyNames[t], {
        value: o,
        writable: !1,
        enumerable: ownPropertyDescriptor.enumerable,
        configurable: !1,
      });
    }
    Object.freeze(mr);
  })();
});

export { GT };
