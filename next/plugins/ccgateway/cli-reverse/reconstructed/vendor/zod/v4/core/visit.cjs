/**
 * zod/v4/core/visit.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_schemas } from "./schemas.cjs";
import { require_util } from "./util.cjs";

//@ chunk-1ny7cxrt.js:644420-647824 cjs-fingerprint
var require_visit = __commonJS(function (cjsExports) {
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
  cjsExports.visit = visit;
  var schemas = __importStar(require_schemas());
  var util_js_1 = require_util();
  var RESOLVING = Symbol("z.visit/resolving");
  function visit(schema, fnOrHandlers) {
    let fn =
      typeof fnOrHandlers === "function"
        ? fnOrHandlers
        : (node, rewritten) => {
            let h = fnOrHandlers[node._zod.def.type];
            return h ? h(node, rewritten) : node;
          };
    let cache = new Map();
    function run(s_2) {
      let cached = cache.get(s_2);
      if (cached === RESOLVING)
        return new schemas.$ZodLazy({
          type: "lazy",
          getter: () => cache.get(s_2),
        });
      if (cached !== undefined) return cached;
      cache.set(s_2, RESOLVING);
      let inner = mapInner(s_2);
      let mapped = fn(inner, inner !== s_2);
      cache.set(s_2, mapped);
      return mapped;
    }
    function mapInner(s) {
      let def = s._zod.def;
      let kind = def.type;
      switch (kind) {
        case "object": {
          let oldShape = def.shape;
          let keys = Object.keys(oldShape);
          let changed = false;
          let newShape = {};
          for (let k of keys) {
            let mapped = run(oldShape[k]);
            if (mapped !== oldShape[k]) changed = true;
            newShape[k] = mapped;
          }
          let newCatchall = def.catchall;
          if (def.catchall) {
            newCatchall = run(def.catchall);
            if (newCatchall !== def.catchall) changed = true;
          }
          return changed
            ? util_js_1.clone(s, {
                ...def,
                shape: newShape,
                catchall: newCatchall,
              })
            : s;
        }
        case "array": {
          let mapped = run(def.element);
          return mapped === def.element
            ? s
            : util_js_1.clone(s, {
                ...def,
                element: mapped,
              });
        }
        case "tuple": {
          let oldItems = def.items;
          let changed = false;
          let newItems = [];
          for (let item of oldItems) {
            let mapped = run(item);
            if (mapped !== item) changed = true;
            newItems.push(mapped);
          }
          let newRest = def.rest;
          if (def.rest) {
            newRest = run(def.rest);
            if (newRest !== def.rest) changed = true;
          }
          return changed
            ? util_js_1.clone(s, {
                ...def,
                items: newItems,
                rest: newRest,
              })
            : s;
        }
        case "record":
        case "map": {
          let newKey = run(def.keyType);
          let newVal = run(def.valueType);
          return newKey === def.keyType && newVal === def.valueType
            ? s
            : util_js_1.clone(s, {
                ...def,
                keyType: newKey,
                valueType: newVal,
              });
        }
        case "set": {
          let newVal = run(def.valueType);
          return newVal === def.valueType
            ? s
            : util_js_1.clone(s, {
                ...def,
                valueType: newVal,
              });
        }
        case "union": {
          let oldOptions = def.options;
          let changed = false;
          let newOptions = [];
          for (let opt of oldOptions) {
            let mapped = run(opt);
            if (mapped !== opt) changed = true;
            newOptions.push(mapped);
          }
          return changed
            ? util_js_1.clone(s, {
                ...def,
                options: newOptions,
              })
            : s;
        }
        case "intersection": {
          let newLeft = run(def.left);
          let newRight = run(def.right);
          return newLeft === def.left && newRight === def.right
            ? s
            : util_js_1.clone(s, {
                ...def,
                left: newLeft,
                right: newRight,
              });
        }
        case "optional":
        case "nullable":
        case "default":
        case "prefault":
        case "catch":
        case "readonly":
        case "nonoptional":
        case "promise":
        case "success": {
          let newInner = run(def.innerType);
          return newInner === def.innerType
            ? s
            : util_js_1.clone(s, {
                ...def,
                innerType: newInner,
              });
        }
        case "pipe": {
          let newIn = run(def.in);
          let newOut = run(def.out);
          return newIn === def.in && newOut === def.out
            ? s
            : util_js_1.clone(s, {
                ...def,
                in: newIn,
                out: newOut,
              });
        }
        case "function": {
          let newInput = run(def.input);
          let newOutput = run(def.output);
          return newInput === def.input && newOutput === def.output
            ? s
            : util_js_1.clone(s, {
                ...def,
                input: newInput,
                output: newOutput,
              });
        }
        case "lazy": {
          let original = def.getter;
          let { _cachedInner, ...rest } = def;
          return util_js_1.clone(s, {
            ...rest,
            getter: () => run(original()),
          });
        }
        case "properties": {
          let oldShape = def.shape;
          let changed = false;
          let newShape = {};
          for (let k of Reflect.ownKeys(oldShape)) {
            let mapped = run(oldShape[k]);
            if (mapped !== oldShape[k]) changed = true;
            newShape[k] = mapped;
          }
          return changed
            ? util_js_1.clone(s, {
                ...def,
                shape: newShape,
              })
            : s;
        }
        case "template_literal":
        case "string":
        case "number":
        case "int":
        case "boolean":
        case "bigint":
        case "symbol":
        case "undefined":
        case "null":
        case "void":
        case "never":
        case "any":
        case "unknown":
        case "date":
        case "nan":
        case "enum":
        case "literal":
        case "file":
        case "transform":
        case "custom":
          return s;
        default:
          return s;
      }
    }
    return run(schema);
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
export { require_visit };
