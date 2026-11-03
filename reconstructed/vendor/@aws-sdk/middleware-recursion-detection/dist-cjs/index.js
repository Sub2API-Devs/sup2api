/**
 * @aws-sdk/middleware-recursion-detection/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/middleware-recursion-detection@3.936.0
 * pieces: chunk-edce4vxq.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { require_recursionDetectionMiddleware } from "./recursionDetectionMiddleware.js";

//@ chunk-edce4vxq.js:4991-5421 cjs-fingerprint
var require_middleware_recursion_detection = x(function (cjsExports) {
  var recursionDetectionMiddleware = require_recursionDetectionMiddleware();
  var recursionDetectionMiddlewareOptions = {
    step: "build",
    tags: ["RECURSION_DETECTION"],
    name: "recursionDetectionMiddleware",
    override: true,
    priority: "low",
  };
  var getRecursionDetectionPlugin = (options) => ({
    applyToStack: (clientStack) => {
      clientStack.add(
        recursionDetectionMiddleware.recursionDetectionMiddleware(),
        recursionDetectionMiddlewareOptions,
      );
    },
  });
  cjsExports.getRecursionDetectionPlugin = getRecursionDetectionPlugin;
  Object.keys(recursionDetectionMiddleware).forEach(function (k) {
    if (k !== "default" && !Object.prototype.hasOwnProperty.call(cjsExports, k))
      Object.defineProperty(cjsExports, k, {
        enumerable: true,
        get: function () {
          return recursionDetectionMiddleware[k];
        },
      });
  });
});
export { require_middleware_recursion_detection };
