/**
 * zod/v4/classic/in-out.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_util } from "../core/util.cjs";
import { require_visit } from "../core/visit.cjs";
import { require_schemas_2 } from "./schemas.cjs";

//@ chunk-1ny7cxrt.js:649068-650685 cjs-fingerprint
var require_in_out = __commonJS(function (cjsExports) {
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
  cjsExports.input = input;
  cjsExports.output = output;
  var util_js_1 = require_util();
  var visit_js_1 = require_visit();
  var schemas = __importStar(require_schemas_2());
  function withChecks(side, checks) {
    if (!checks?.length) return side;
    let def = side._zod.def;
    return util_js_1.clone(
      side,
      util_js_1.mergeDefs(def, {
        checks: [...(def.checks ?? []), ...checks],
      }),
      {
        parent: true,
      },
    );
  }
  function outSide(def) {
    return withChecks(def.out, def.checks);
  }
  function inSide(def) {
    return def.in._zod.traits.has("$ZodTransform") ? outSide(def) : def.in;
  }
  function input(schema) {
    return visit_js_1.visit(schema, {
      pipe: (s) => inSide(s._zod.def),
      default: (s, rewritten) => (rewritten ? schemas.optional(s._zod.def.innerType) : s),
      catch: (s, rewritten) => (rewritten ? s._zod.def.innerType : s),
    });
  }
  function output(schema) {
    return visit_js_1.visit(schema, {
      pipe: (s) => outSide(s._zod.def),
      prefault: (s, rewritten) => (rewritten ? s._zod.def.innerType : s),
    });
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
export { require_in_out };
