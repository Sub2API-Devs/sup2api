/**
 * @opentelemetry/api/build/src/context-api.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/api@1.9.0
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_context_2 } from "./api/context.js";

//@ chunk-bwbq4xvm.js:45890-46033 cjs-fingerprint
var require_context_api = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.context = undefined;
  var context_1 = require_context_2();
  cjsExports.context = context_1.ContextAPI.getInstance();
});
export { require_context_api };
