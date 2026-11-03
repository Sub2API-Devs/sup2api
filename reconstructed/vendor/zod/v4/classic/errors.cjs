/**
 * zod/v4/classic/errors.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { require_core_2 } from "../core/index.cjs";
import { require_util } from "../core/util.cjs";

//@ chunk-1ny7cxrt.js:591116-593194 cjs-fingerprint
var require_errors_3 = x(function (cjsExports) {
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
  cjsExports.ZodRealError = cjsExports.ZodError = undefined;
  var core = __importStar(require_core_2());
  var index_js_1 = require_core_2();
  var util = __importStar(require_util());
  var _installedErrorProtos = new WeakSet([Object.prototype, Error.prototype]);
  function _lazyMethod(proto, key, make) {
    Object.defineProperty(proto, key, {
      configurable: true,
      enumerable: false,
      get() {
        let value = make(this);
        Object.defineProperty(this, key, {
          value,
          configurable: true,
          writable: true,
        });
        return value;
      },
      set(value) {
        Object.defineProperty(this, key, {
          value,
          configurable: true,
          writable: true,
        });
      },
    });
  }
  var initializer = (inst, issues) => {
    index_js_1.$ZodError.init(inst, issues);
    inst.name = "ZodError";
    let proto = Object.getPrototypeOf(inst);
    if (_installedErrorProtos.has(proto)) return;
    _installedErrorProtos.add(proto);
    _lazyMethod(proto, "format", (o) => (mapper) => core.formatError(o, mapper));
    _lazyMethod(proto, "flatten", (o) => (mapper) => core.flattenError(o, mapper));
    _lazyMethod(proto, "addIssue", (o) => (issue) => {
      o.issues.push(issue);
      o.message = JSON.stringify(o.issues, util.jsonStringifyReplacer, 2);
    });
    _lazyMethod(proto, "addIssues", (o) => (issues) => {
      o.issues.push(...issues);
      o.message = JSON.stringify(o.issues, util.jsonStringifyReplacer, 2);
    });
    Object.defineProperty(proto, "isEmpty", {
      configurable: true,
      enumerable: false,
      get() {
        return this.issues.length === 0;
      },
    });
  };
  cjsExports.ZodError = core.$constructor("ZodError", initializer);
  cjsExports.ZodRealError = core.$constructor("ZodError", initializer, undefined, {
    Parent: Error,
  });
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
export { require_errors_3 };
