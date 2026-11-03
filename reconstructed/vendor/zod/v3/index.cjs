/**
 * zod/v3/index.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { mb } from "../v4/classic/external.cjs";

//@ chunk-1ny7cxrt.js:656965-658225 cjs-fingerprint
var hn = x(function (Vn) {
  var JT =
      (Vn && Vn.__createBinding) ||
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
    QQ =
      (Vn && Vn.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    eee =
      (Vn && Vn.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) JT(t, e, key);
        }
        return (QQ(t, e), t);
      },
    tee =
      (Vn && Vn.__exportStar) ||
      function (e, t) {
        for (var key in e)
          if (key !== "default" && !Object.prototype.hasOwnProperty.call(t, key)) JT(t, e, key);
      };
  Object.defineProperty(Vn, "__esModule", { value: !0 });
  Vn.default = Vn.z = void 0;
  var XT = eee(mb());
  Vn.z = XT;
  Vn.default = XT;
  tee(mb(), Vn);
  (function () {
    var ownPropertyNames = Object.getOwnPropertyNames(Vn);
    for (var t = 0; t < ownPropertyNames.length; t++) {
      var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(Vn, ownPropertyNames[t]);
      if (!ownPropertyDescriptor || !ownPropertyDescriptor.get || !ownPropertyDescriptor.configurable)
        continue;
      var o;
      try {
        o = ownPropertyDescriptor.get();
      } catch (error) {
        continue;
      }
      if (o === void 0) continue;
      Object.defineProperty(Vn, ownPropertyNames[t], {
        value: o,
        writable: !1,
        enumerable: ownPropertyDescriptor.enumerable,
        configurable: !1,
      });
    }
    Object.freeze(Vn);
  })();
});

export { hn };
