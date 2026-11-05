/**
 * zod/v4/classic/parse.cjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1hnjmk23.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_core_2 } from "../core/index.cjs";
import { require_errors_3 } from "./errors.cjs";

//@ chunk-1hnjmk23.js:593563-595605 cjs-fingerprint
var require_parse_2 = __commonJS(function (cjsExports) {
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
  cjsExports.safeDecodeAsync =
    cjsExports.safeEncodeAsync =
    cjsExports.safeDecode =
    cjsExports.safeEncode =
    cjsExports.decodeAsync =
    cjsExports.encodeAsync =
    cjsExports.decode =
    cjsExports.encode =
    cjsExports.validateAsync =
    cjsExports.validate =
    cjsExports.safeParseAsync =
    cjsExports.safeParse =
    cjsExports.parseAsync =
    cjsExports.parse =
      undefined;
  var core = __importStar(require_core_2());
  var errors_js_1 = require_errors_3();
  cjsExports.parse = core._parse(errors_js_1.ZodRealError);
  cjsExports.parseAsync = core._parseAsync(errors_js_1.ZodRealError);
  cjsExports.safeParse = core._safeParse(errors_js_1.ZodRealError);
  cjsExports.safeParseAsync = core._safeParseAsync(errors_js_1.ZodRealError);
  var index_js_1 = require_core_2();
  Object.defineProperty(cjsExports, "validate", {
    enumerable: true,
    get: function () {
      return index_js_1.validate;
    },
  });
  Object.defineProperty(cjsExports, "validateAsync", {
    enumerable: true,
    get: function () {
      return index_js_1.validateAsync;
    },
  });
  cjsExports.encode = core._encode(errors_js_1.ZodRealError);
  cjsExports.decode = core._decode(errors_js_1.ZodRealError);
  cjsExports.encodeAsync = core._encodeAsync(errors_js_1.ZodRealError);
  cjsExports.decodeAsync = core._decodeAsync(errors_js_1.ZodRealError);
  cjsExports.safeEncode = core._safeEncode(errors_js_1.ZodRealError);
  cjsExports.safeDecode = core._safeDecode(errors_js_1.ZodRealError);
  cjsExports.safeEncodeAsync = core._safeEncodeAsync(errors_js_1.ZodRealError);
  cjsExports.safeDecodeAsync = core._safeDecodeAsync(errors_js_1.ZodRealError);
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
export { require_parse_2 };
