/**
 * zod/v4/classic/external.cjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1hnjmk23.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_core_2 } from "../core/index.cjs";
import { require_schemas_2 } from "./schemas.cjs";
import { require_checks_2 } from "./checks.cjs";
import { require_errors_3 } from "./errors.cjs";
import { require_parse_2 } from "./parse.cjs";
import { require_compat } from "./compat.cjs";
import { require_json_schema_processors } from "../core/json-schema-processors.cjs";
import { require_from_json_schema } from "./from-json-schema.cjs";
import { require_deep_partial } from "./deep-partial.cjs";
import { require_in_out } from "./in-out.cjs";
import { require_locales } from "../locales/index.cjs";
import { require_iso } from "./iso.cjs";
import { require_coerce } from "./coerce.cjs";

//@ chunk-1hnjmk23.js:652490-657350 cjs-fingerprint
var require_external = __commonJS(function (cjsExports) {
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
  var __exportStar =
    (cjsExports && cjsExports.__exportStar) ||
    function (m, exportTarget) {
      for (var p in m)
        if (p !== "default" && !Object.prototype.hasOwnProperty.call(exportTarget, p))
          __createBinding(exportTarget, m, p);
    };
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.coerce =
    cjsExports.iso =
    cjsExports.ZodISODuration =
    cjsExports.ZodISOTime =
    cjsExports.ZodISODate =
    cjsExports.ZodISODateTime =
    cjsExports.locales =
    cjsExports.output =
    cjsExports.input =
    cjsExports.deepPartial =
    cjsExports.fromJSONSchema =
    cjsExports.toJSONSchema =
    cjsExports.getDiscriminatedOption =
    cjsExports.ZodCompileUnsupportedError =
    cjsExports.ZodCompileAsyncError =
    cjsExports.withParser =
    cjsExports.compile =
    cjsExports.toZod =
    cjsExports.INVALID =
    cjsExports.NEVER =
    cjsExports.util =
    cjsExports.TimePrecision =
    cjsExports.flattenError =
    cjsExports.formatError =
    cjsExports.prettifyError =
    cjsExports.treeifyError =
    cjsExports.regexes =
    cjsExports.clone =
    cjsExports.$brand =
    cjsExports.$input =
    cjsExports.$output =
    cjsExports.memoizer =
    cjsExports.config =
    cjsExports.registry =
    cjsExports.globalRegistry =
    cjsExports.core =
      undefined;
  cjsExports.core = __importStar(require_core_2());
  __exportStar(require_schemas_2(), cjsExports);
  __exportStar(require_checks_2(), cjsExports);
  __exportStar(require_errors_3(), cjsExports);
  __exportStar(require_parse_2(), cjsExports);
  __exportStar(require_compat(), cjsExports);
  var index_js_1 = require_core_2();
  Object.defineProperty(cjsExports, "globalRegistry", {
    enumerable: true,
    get: function () {
      return index_js_1.globalRegistry;
    },
  });
  Object.defineProperty(cjsExports, "registry", {
    enumerable: true,
    get: function () {
      return index_js_1.registry;
    },
  });
  Object.defineProperty(cjsExports, "config", {
    enumerable: true,
    get: function () {
      return index_js_1.config;
    },
  });
  Object.defineProperty(cjsExports, "memoizer", {
    enumerable: true,
    get: function () {
      return index_js_1.memoizer;
    },
  });
  Object.defineProperty(cjsExports, "$output", {
    enumerable: true,
    get: function () {
      return index_js_1.$output;
    },
  });
  Object.defineProperty(cjsExports, "$input", {
    enumerable: true,
    get: function () {
      return index_js_1.$input;
    },
  });
  Object.defineProperty(cjsExports, "$brand", {
    enumerable: true,
    get: function () {
      return index_js_1.$brand;
    },
  });
  Object.defineProperty(cjsExports, "clone", {
    enumerable: true,
    get: function () {
      return index_js_1.clone;
    },
  });
  Object.defineProperty(cjsExports, "regexes", {
    enumerable: true,
    get: function () {
      return index_js_1.regexes;
    },
  });
  Object.defineProperty(cjsExports, "treeifyError", {
    enumerable: true,
    get: function () {
      return index_js_1.treeifyError;
    },
  });
  Object.defineProperty(cjsExports, "prettifyError", {
    enumerable: true,
    get: function () {
      return index_js_1.prettifyError;
    },
  });
  Object.defineProperty(cjsExports, "formatError", {
    enumerable: true,
    get: function () {
      return index_js_1.formatError;
    },
  });
  Object.defineProperty(cjsExports, "flattenError", {
    enumerable: true,
    get: function () {
      return index_js_1.flattenError;
    },
  });
  Object.defineProperty(cjsExports, "TimePrecision", {
    enumerable: true,
    get: function () {
      return index_js_1.TimePrecision;
    },
  });
  Object.defineProperty(cjsExports, "util", {
    enumerable: true,
    get: function () {
      return index_js_1.util;
    },
  });
  Object.defineProperty(cjsExports, "NEVER", {
    enumerable: true,
    get: function () {
      return index_js_1.NEVER;
    },
  });
  Object.defineProperty(cjsExports, "INVALID", {
    enumerable: true,
    get: function () {
      return index_js_1.INVALID;
    },
  });
  Object.defineProperty(cjsExports, "toZod", {
    enumerable: true,
    get: function () {
      return index_js_1.toZod;
    },
  });
  Object.defineProperty(cjsExports, "compile", {
    enumerable: true,
    get: function () {
      return index_js_1.compile;
    },
  });
  Object.defineProperty(cjsExports, "withParser", {
    enumerable: true,
    get: function () {
      return index_js_1.withParser;
    },
  });
  Object.defineProperty(cjsExports, "ZodCompileAsyncError", {
    enumerable: true,
    get: function () {
      return index_js_1.ZodCompileAsyncError;
    },
  });
  Object.defineProperty(cjsExports, "ZodCompileUnsupportedError", {
    enumerable: true,
    get: function () {
      return index_js_1.ZodCompileUnsupportedError;
    },
  });
  Object.defineProperty(cjsExports, "getDiscriminatedOption", {
    enumerable: true,
    get: function () {
      return index_js_1.getDiscriminatedOption;
    },
  });
  var json_schema_processors_js_1 = require_json_schema_processors();
  Object.defineProperty(cjsExports, "toJSONSchema", {
    enumerable: true,
    get: function () {
      return json_schema_processors_js_1.toJSONSchema;
    },
  });
  var from_json_schema_js_1 = require_from_json_schema();
  Object.defineProperty(cjsExports, "fromJSONSchema", {
    enumerable: true,
    get: function () {
      return from_json_schema_js_1.fromJSONSchema;
    },
  });
  var deep_partial_js_1 = require_deep_partial();
  Object.defineProperty(cjsExports, "deepPartial", {
    enumerable: true,
    get: function () {
      return deep_partial_js_1.deepPartial;
    },
  });
  var in_out_js_1 = require_in_out();
  Object.defineProperty(cjsExports, "input", {
    enumerable: true,
    get: function () {
      return in_out_js_1.input;
    },
  });
  Object.defineProperty(cjsExports, "output", {
    enumerable: true,
    get: function () {
      return in_out_js_1.output;
    },
  });
  cjsExports.locales = __importStar(require_locales());
  var iso_js_1 = require_iso();
  Object.defineProperty(cjsExports, "ZodISODateTime", {
    enumerable: true,
    get: function () {
      return iso_js_1.ZodISODateTime;
    },
  });
  Object.defineProperty(cjsExports, "ZodISODate", {
    enumerable: true,
    get: function () {
      return iso_js_1.ZodISODate;
    },
  });
  Object.defineProperty(cjsExports, "ZodISOTime", {
    enumerable: true,
    get: function () {
      return iso_js_1.ZodISOTime;
    },
  });
  Object.defineProperty(cjsExports, "ZodISODuration", {
    enumerable: true,
    get: function () {
      return iso_js_1.ZodISODuration;
    },
  });
  cjsExports.iso = __importStar(require_iso());
  cjsExports.coerce = __importStar(require_coerce());
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
export { require_external };
