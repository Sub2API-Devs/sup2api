/**
 * @opentelemetry/api/build/src/trace-api.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/api@1.9.0
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_trace } from "./api/trace.js";

//@ chunk-bwbq4xvm.js:49822-49959 cjs-fingerprint
var require_trace_api = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.trace = undefined;
  var trace_1 = require_trace();
  cjsExports.trace = trace_1.TraceAPI.getInstance();
});
export { require_trace_api };
