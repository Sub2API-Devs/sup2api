/**
 * zod/v4/classic/iso.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Wr } from "../core/index.cjs";
import { ra } from "./schemas.cjs";

//@ chunk-1ny7cxrt.js:628725-630542 cjs-fingerprint
var zh = x(function (bn) {
  var eQ =
      (bn && bn.__createBinding) ||
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
    tQ =
      (bn && bn.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    nQ =
      (bn && bn.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) eQ(t, e, key);
        }
        return (tQ(t, e), t);
      };
  Object.defineProperty(bn, "__esModule", { value: !0 });
  bn.ZodISOTime = bn.ZodISODuration = bn.ZodISODateTime = bn.ZodISODate = void 0;
  bn.datetime = rQ;
  bn.date = iQ;
  bn.time = oQ;
  bn.duration = sQ;
  var Nh = nQ(Wr()),
    ia = ra(),
    Uh = ra();
  Object.defineProperty(bn, "ZodISODate", {
    enumerable: !0,
    get: function () {
      return Uh.ZodISODate;
    },
  });
  Object.defineProperty(bn, "ZodISODateTime", {
    enumerable: !0,
    get: function () {
      return Uh.ZodISODateTime;
    },
  });
  Object.defineProperty(bn, "ZodISODuration", {
    enumerable: !0,
    get: function () {
      return Uh.ZodISODuration;
    },
  });
  Object.defineProperty(bn, "ZodISOTime", {
    enumerable: !0,
    get: function () {
      return Uh.ZodISOTime;
    },
  });
  function rQ(e) {
    return Nh._isoDateTime(ia.ZodISODateTime, e);
  }
  function iQ(e) {
    return Nh._isoDate(ia.ZodISODate, e);
  }
  function oQ(e) {
    return Nh._isoTime(ia.ZodISOTime, e);
  }
  function sQ(e) {
    return Nh._isoDuration(ia.ZodISODuration, e);
  }
  (function () {
    var ownPropertyNames = Object.getOwnPropertyNames(bn);
    for (var t = 0; t < ownPropertyNames.length; t++) {
      var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(bn, ownPropertyNames[t]);
      if (!ownPropertyDescriptor || !ownPropertyDescriptor.get || !ownPropertyDescriptor.configurable)
        continue;
      var o;
      try {
        o = ownPropertyDescriptor.get();
      } catch (error) {
        continue;
      }
      if (o === void 0) continue;
      Object.defineProperty(bn, ownPropertyNames[t], {
        value: o,
        writable: !1,
        enumerable: ownPropertyDescriptor.enumerable,
        configurable: !1,
      });
    }
    Object.freeze(bn);
  })();
});

export { zh };
