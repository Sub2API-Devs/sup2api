/**
 * @opentelemetry/api/build/src/platform/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/api@1.9.0
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-require-graph 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_platform } from "./node/index.js";

//@ chunk-bwbq4xvm.js:28325-28738 cjs-require-graph
var require_platform_2 = __commonJS(function (cjsExports) {
  var __createBinding =
    (cjsExports && cjsExports.__createBinding) ||
    (Object.create
      ? function (o, m, k, k2) {
          if (k2 === undefined) k2 = k;
          Object.defineProperty(o, k2, {
            enumerable: true,
            get: function () {
              return m[k];
            },
          });
        }
      : function (o, m, k, k2) {
          if (k2 === undefined) k2 = k;
          o[k2] = m[k];
        });
  var __exportStar =
    (cjsExports && cjsExports.__exportStar) ||
    function (m, target) {
      for (var p in m)
        if (p !== "default" && !Object.prototype.hasOwnProperty.call(target, p))
          __createBinding(target, m, p);
    };
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  __exportStar(require_platform(), cjsExports);
});
export { require_platform_2 };
