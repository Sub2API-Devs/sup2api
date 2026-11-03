/**
 * zod/v4/classic/compat.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Wr } from "../core/index.cjs";

//@ chunk-1ny7cxrt.js:626893-628725 cjs-fingerprint
var jT = x(function (Tn) {
  var W7 =
      (Tn && Tn.__createBinding) ||
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
    Y7 =
      (Tn && Tn.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    J7 =
      (Tn && Tn.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) W7(t, e, key);
        }
        return (Y7(t, e), t);
      };
  Object.defineProperty(Tn, "__esModule", { value: !0 });
  Tn.ZodFirstPartyTypeKind = Tn.config = Tn.$brand = Tn.ZodIssueCode = void 0;
  Tn.setErrorMap = X7;
  Tn.getErrorMap = Q7;
  var DT = J7(Wr());
  Tn.ZodIssueCode = {
    invalid_type: "invalid_type",
    too_big: "too_big",
    too_small: "too_small",
    invalid_format: "invalid_format",
    not_multiple_of: "not_multiple_of",
    unrecognized_keys: "unrecognized_keys",
    invalid_union: "invalid_union",
    invalid_key: "invalid_key",
    invalid_element: "invalid_element",
    invalid_value: "invalid_value",
    custom: "custom",
  };
  var MT = Wr();
  Object.defineProperty(Tn, "$brand", {
    enumerable: !0,
    get: function () {
      return MT.$brand;
    },
  });
  Object.defineProperty(Tn, "config", {
    enumerable: !0,
    get: function () {
      return MT.config;
    },
  });
  function X7(e) {
    DT.config({ customError: e });
  }
  function Q7() {
    return DT.config().customError;
  }
  var RT;
  (function (e) {})(RT || (Tn.ZodFirstPartyTypeKind = RT = {}));
  (function () {
    var ownPropertyNames = Object.getOwnPropertyNames(Tn);
    for (var t = 0; t < ownPropertyNames.length; t++) {
      var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(Tn, ownPropertyNames[t]);
      if (!ownPropertyDescriptor || !ownPropertyDescriptor.get || !ownPropertyDescriptor.configurable)
        continue;
      var o;
      try {
        o = ownPropertyDescriptor.get();
      } catch (error) {
        continue;
      }
      if (o === void 0) continue;
      Object.defineProperty(Tn, ownPropertyNames[t], {
        value: o,
        writable: !1,
        enumerable: ownPropertyDescriptor.enumerable,
        configurable: !1,
      });
    }
    Object.freeze(Tn);
  })();
});

export { jT };
