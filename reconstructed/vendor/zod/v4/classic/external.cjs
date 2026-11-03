/**
 * zod/v4/classic/external.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Wr } from "../core/index.cjs";
import { ra } from "./schemas.cjs";
import { Ah } from "./checks.cjs";
import { ib } from "./errors.cjs";
import { ob } from "./parse.cjs";
import { jT } from "./compat.cjs";
import { nd } from "../core/json-schema-processors.cjs";
import { FT } from "./from-json-schema.cjs";
import { KT } from "./deep-partial.cjs";
import { VT } from "./in-out.cjs";
import { Z_ } from "../locales/index.cjs";
import { zh } from "./iso.cjs";
import { GT } from "./coerce.cjs";

//@ chunk-1ny7cxrt.js:652113-656965 cjs-fingerprint
var mb = x(function (ye) {
  var WT =
      (ye && ye.__createBinding) ||
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
    WQ =
      (ye && ye.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    Hh =
      (ye && ye.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) WT(t, e, key);
        }
        return (WQ(t, e), t);
      },
    sd =
      (ye && ye.__exportStar) ||
      function (e, t) {
        for (var key in e)
          if (key !== "default" && !Object.prototype.hasOwnProperty.call(t, key)) WT(t, e, key);
      };
  Object.defineProperty(ye, "__esModule", { value: !0 });
  ye.coerce =
    ye.iso =
    ye.ZodISODuration =
    ye.ZodISOTime =
    ye.ZodISODate =
    ye.ZodISODateTime =
    ye.locales =
    ye.output =
    ye.input =
    ye.deepPartial =
    ye.fromJSONSchema =
    ye.toJSONSchema =
    ye.getDiscriminatedOption =
    ye.ZodCompileUnsupportedError =
    ye.ZodCompileAsyncError =
    ye.withParser =
    ye.compile =
    ye.toZod =
    ye.INVALID =
    ye.NEVER =
    ye.util =
    ye.TimePrecision =
    ye.flattenError =
    ye.formatError =
    ye.prettifyError =
    ye.treeifyError =
    ye.regexes =
    ye.clone =
    ye.$brand =
    ye.$input =
    ye.$output =
    ye.memoizer =
    ye.config =
    ye.registry =
    ye.globalRegistry =
    ye.core =
      void 0;
  ye.core = Hh(Wr());
  sd(ra(), ye);
  sd(Ah(), ye);
  sd(ib(), ye);
  sd(ob(), ye);
  sd(jT(), ye);
  var Pn = Wr();
  Object.defineProperty(ye, "globalRegistry", {
    enumerable: !0,
    get: function () {
      return Pn.globalRegistry;
    },
  });
  Object.defineProperty(ye, "registry", {
    enumerable: !0,
    get: function () {
      return Pn.registry;
    },
  });
  Object.defineProperty(ye, "config", {
    enumerable: !0,
    get: function () {
      return Pn.config;
    },
  });
  Object.defineProperty(ye, "memoizer", {
    enumerable: !0,
    get: function () {
      return Pn.memoizer;
    },
  });
  Object.defineProperty(ye, "$output", {
    enumerable: !0,
    get: function () {
      return Pn.$output;
    },
  });
  Object.defineProperty(ye, "$input", {
    enumerable: !0,
    get: function () {
      return Pn.$input;
    },
  });
  Object.defineProperty(ye, "$brand", {
    enumerable: !0,
    get: function () {
      return Pn.$brand;
    },
  });
  Object.defineProperty(ye, "clone", {
    enumerable: !0,
    get: function () {
      return Pn.clone;
    },
  });
  Object.defineProperty(ye, "regexes", {
    enumerable: !0,
    get: function () {
      return Pn.regexes;
    },
  });
  Object.defineProperty(ye, "treeifyError", {
    enumerable: !0,
    get: function () {
      return Pn.treeifyError;
    },
  });
  Object.defineProperty(ye, "prettifyError", {
    enumerable: !0,
    get: function () {
      return Pn.prettifyError;
    },
  });
  Object.defineProperty(ye, "formatError", {
    enumerable: !0,
    get: function () {
      return Pn.formatError;
    },
  });
  Object.defineProperty(ye, "flattenError", {
    enumerable: !0,
    get: function () {
      return Pn.flattenError;
    },
  });
  Object.defineProperty(ye, "TimePrecision", {
    enumerable: !0,
    get: function () {
      return Pn.TimePrecision;
    },
  });
  Object.defineProperty(ye, "util", {
    enumerable: !0,
    get: function () {
      return Pn.util;
    },
  });
  Object.defineProperty(ye, "NEVER", {
    enumerable: !0,
    get: function () {
      return Pn.NEVER;
    },
  });
  Object.defineProperty(ye, "INVALID", {
    enumerable: !0,
    get: function () {
      return Pn.INVALID;
    },
  });
  Object.defineProperty(ye, "toZod", {
    enumerable: !0,
    get: function () {
      return Pn.toZod;
    },
  });
  Object.defineProperty(ye, "compile", {
    enumerable: !0,
    get: function () {
      return Pn.compile;
    },
  });
  Object.defineProperty(ye, "withParser", {
    enumerable: !0,
    get: function () {
      return Pn.withParser;
    },
  });
  Object.defineProperty(ye, "ZodCompileAsyncError", {
    enumerable: !0,
    get: function () {
      return Pn.ZodCompileAsyncError;
    },
  });
  Object.defineProperty(ye, "ZodCompileUnsupportedError", {
    enumerable: !0,
    get: function () {
      return Pn.ZodCompileUnsupportedError;
    },
  });
  Object.defineProperty(ye, "getDiscriminatedOption", {
    enumerable: !0,
    get: function () {
      return Pn.getDiscriminatedOption;
    },
  });
  var YQ = nd();
  Object.defineProperty(ye, "toJSONSchema", {
    enumerable: !0,
    get: function () {
      return YQ.toJSONSchema;
    },
  });
  var JQ = FT();
  Object.defineProperty(ye, "fromJSONSchema", {
    enumerable: !0,
    get: function () {
      return JQ.fromJSONSchema;
    },
  });
  var XQ = KT();
  Object.defineProperty(ye, "deepPartial", {
    enumerable: !0,
    get: function () {
      return XQ.deepPartial;
    },
  });
  var YT = VT();
  Object.defineProperty(ye, "input", {
    enumerable: !0,
    get: function () {
      return YT.input;
    },
  });
  Object.defineProperty(ye, "output", {
    enumerable: !0,
    get: function () {
      return YT.output;
    },
  });
  ye.locales = Hh(Z_());
  var Kh = zh();
  Object.defineProperty(ye, "ZodISODateTime", {
    enumerable: !0,
    get: function () {
      return Kh.ZodISODateTime;
    },
  });
  Object.defineProperty(ye, "ZodISODate", {
    enumerable: !0,
    get: function () {
      return Kh.ZodISODate;
    },
  });
  Object.defineProperty(ye, "ZodISOTime", {
    enumerable: !0,
    get: function () {
      return Kh.ZodISOTime;
    },
  });
  Object.defineProperty(ye, "ZodISODuration", {
    enumerable: !0,
    get: function () {
      return Kh.ZodISODuration;
    },
  });
  ye.iso = Hh(zh());
  ye.coerce = Hh(GT());
  (function () {
    var ownPropertyNames = Object.getOwnPropertyNames(ye);
    for (var t = 0; t < ownPropertyNames.length; t++) {
      var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(ye, ownPropertyNames[t]);
      if (!ownPropertyDescriptor || !ownPropertyDescriptor.get || !ownPropertyDescriptor.configurable)
        continue;
      var o;
      try {
        o = ownPropertyDescriptor.get();
      } catch (error) {
        continue;
      }
      if (o === void 0) continue;
      Object.defineProperty(ye, ownPropertyNames[t], {
        value: o,
        writable: !1,
        enumerable: ownPropertyDescriptor.enumerable,
        configurable: !1,
      });
    }
    Object.freeze(ye);
  })();
});

export { mb };
