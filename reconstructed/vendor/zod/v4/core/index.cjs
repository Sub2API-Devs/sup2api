/**
 * zod/v4/core/index.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_core } from "./core.cjs";
import { require_parse } from "./parse.cjs";
import { require_errors_2 } from "./errors.cjs";
import { require_schemas } from "./schemas.cjs";
import { require_memoizer } from "./memoizer.cjs";
import { require_checks } from "./checks.cjs";
import { require_versions } from "./versions.cjs";
import { require_util } from "./util.cjs";
import { require_regexes } from "./regexes.cjs";
import { require_locales } from "../locales/index.cjs";
import { require_registries } from "./registries.cjs";
import { require_doc } from "./doc.cjs";
import { require_compile } from "./compile.cjs";
import { require_api } from "./api.cjs";
import { require_to_json_schema } from "./to-json-schema.cjs";
import { require_json_schema_processors } from "./json-schema-processors.cjs";
import { require_json_schema_generator } from "./json-schema-generator.cjs";
import { require_json_schema } from "./json-schema.cjs";

//@ chunk-1ny7cxrt.js:585984-587814 cjs-fingerprint
var require_core_2 = __commonJS(function (cjsExports) {
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
  var __exportStar =
    (cjsExports && cjsExports.__exportStar) ||
    function (m, exportTarget) {
      for (var p in m)
        if (p !== "default" && !Object.prototype.hasOwnProperty.call(exportTarget, p))
          __createBinding(exportTarget, m, p);
    };
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
  cjsExports.JSONSchema =
    cjsExports.JSONSchemaGenerator =
    cjsExports.toJSONSchema =
    cjsExports.locales =
    cjsExports.regexes =
    cjsExports.toZod =
    cjsExports.util =
      undefined;
  __exportStar(require_core(), cjsExports);
  __exportStar(require_parse(), cjsExports);
  __exportStar(require_errors_2(), cjsExports);
  __exportStar(require_schemas(), cjsExports);
  __exportStar(require_memoizer(), cjsExports);
  __exportStar(require_checks(), cjsExports);
  __exportStar(require_versions(), cjsExports);
  cjsExports.util = __importStar(require_util());
  var util_js_1 = require_util();
  Object.defineProperty(cjsExports, "toZod", {
    enumerable: true,
    get: function () {
      return util_js_1.toZod;
    },
  });
  cjsExports.regexes = __importStar(require_regexes());
  cjsExports.locales = __importStar(require_locales());
  __exportStar(require_registries(), cjsExports);
  __exportStar(require_doc(), cjsExports);
  __exportStar(require_compile(), cjsExports);
  __exportStar(require_api(), cjsExports);
  __exportStar(require_to_json_schema(), cjsExports);
  var json_schema_processors_js_1 = require_json_schema_processors();
  Object.defineProperty(cjsExports, "toJSONSchema", {
    enumerable: true,
    get: function () {
      return json_schema_processors_js_1.toJSONSchema;
    },
  });
  var json_schema_generator_js_1 = require_json_schema_generator();
  Object.defineProperty(cjsExports, "JSONSchemaGenerator", {
    enumerable: true,
    get: function () {
      return json_schema_generator_js_1.JSONSchemaGenerator;
    },
  });
  cjsExports.JSONSchema = __importStar(require_json_schema());
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
export { require_core_2 };
