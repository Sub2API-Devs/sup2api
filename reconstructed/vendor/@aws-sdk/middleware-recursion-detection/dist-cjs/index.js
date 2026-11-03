/**
 * @aws-sdk/middleware-recursion-detection/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/middleware-recursion-detection@3.936.0
 * pieces: chunk-edce4vxq.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Gr } from "./recursionDetectionMiddleware.js";

//@ chunk-edce4vxq.js:4991-5421 cjs-fingerprint
var Dme = x(function (Ct) {
  var _t = Gr(),
    bo = {
      step: "build",
      tags: ["RECURSION_DETECTION"],
      name: "recursionDetectionMiddleware",
      override: !0,
      priority: "low",
    },
    No = (e) => ({
      applyToStack: (t) => {
        t.add(_t.recursionDetectionMiddleware(), bo);
      },
    });
  Ct.getRecursionDetectionPlugin = No;
  Object.keys(_t).forEach(function (e) {
    if (e !== "default" && !Object.prototype.hasOwnProperty.call(Ct, e))
      Object.defineProperty(Ct, e, {
        enumerable: !0,
        get: function () {
          return _t[e];
        },
      });
  });
});

export { Dme };
