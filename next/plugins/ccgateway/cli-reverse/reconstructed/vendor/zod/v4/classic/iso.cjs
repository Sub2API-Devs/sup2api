/**
 * zod/v4/classic/iso.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_core_2 } from "../core/index.cjs";
import { require_schemas_2 } from "./schemas.cjs";

//@ chunk-1ny7cxrt.js:628725-630542 cjs-fingerprint
var require_iso = __commonJS(function (cjsExports) {
  var __createBinding =
    (cjsExports && cjsExports.__createBinding) ||
    (Object.create
      ? function (o_2, m, k, k2) {
          if (k2 === undefined) k2 = k;
          var desc = Object.getOwnPropertyDescriptor(m, k);
          if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable))
            desc = {
              enumerable: true,
              get: function () {
                return m[k];
              },
            };
          Object.defineProperty(o_2, k2, desc);
        }
      : function (o_2, m, k, k2) {
          if (k2 === undefined) k2 = k;
          o_2[k2] = m[k];
        });
  var __setModuleDefault =
    (cjsExports && cjsExports.__setModuleDefault) ||
    (Object.create
      ? function (o, v) {
          Object.defineProperty(o, "default", {
            enumerable: true,
            value: v,
          });
        }
      : function (o, v) {
          o.default = v;
        });
  var __importStar =
    (cjsExports && cjsExports.__importStar) ||
    function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null) {
        for (var k in mod)
          if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
            __createBinding(result, mod, k);
      }
      __setModuleDefault(result, mod);
      return result;
    };
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.ZodISOTime =
    cjsExports.ZodISODuration =
    cjsExports.ZodISODateTime =
    cjsExports.ZodISODate =
      undefined;
  cjsExports.datetime = datetime;
  cjsExports.date = date;
  cjsExports.time = time;
  cjsExports.duration = duration;
  var core = __importStar(require_core_2());
  var schemas_js_1 = require_schemas_2();
  var schemas_js_2 = require_schemas_2();
  Object.defineProperty(cjsExports, "ZodISODate", {
    enumerable: true,
    get: function () {
      return schemas_js_2.ZodISODate;
    },
  });
  Object.defineProperty(cjsExports, "ZodISODateTime", {
    enumerable: true,
    get: function () {
      return schemas_js_2.ZodISODateTime;
    },
  });
  Object.defineProperty(cjsExports, "ZodISODuration", {
    enumerable: true,
    get: function () {
      return schemas_js_2.ZodISODuration;
    },
  });
  Object.defineProperty(cjsExports, "ZodISOTime", {
    enumerable: true,
    get: function () {
      return schemas_js_2.ZodISOTime;
    },
  });
  function datetime(params) {
    return core._isoDateTime(schemas_js_1.ZodISODateTime, params);
  }
  function date(params) {
    return core._isoDate(schemas_js_1.ZodISODate, params);
  }
  function time(params) {
    return core._isoTime(schemas_js_1.ZodISOTime, params);
  }
  function duration(params) {
    return core._isoDuration(schemas_js_1.ZodISODuration, params);
  }
  (function () {
    var keys = Object.getOwnPropertyNames(cjsExports);
    for (var i = 0; i < keys.length; i++) {
      var desc = Object.getOwnPropertyDescriptor(cjsExports, keys[i]);
      if (!desc || !desc.get || !desc.configurable) continue;
      var value;
      try {
        value = desc.get();
      } catch (e) {
        continue;
      }
      if (value === undefined) continue;
      Object.defineProperty(cjsExports, keys[i], {
        value,
        writable: false,
        enumerable: desc.enumerable,
        configurable: false,
      });
    }
    Object.freeze(cjsExports);
  })();
});
export { require_iso };
