/**
 * @opentelemetry/api/build/src/trace/status.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/api@1.9.0
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-bwbq4xvm.js:44041-44265 cjs-fingerprint
var require_status = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.SpanStatusCode = undefined;
  var SpanStatusCode;
  (function (SpanStatusCode) {
    SpanStatusCode[(SpanStatusCode.UNSET = 0)] = "UNSET";
    SpanStatusCode[(SpanStatusCode.OK = 1)] = "OK";
    SpanStatusCode[(SpanStatusCode.ERROR = 2)] = "ERROR";
  })((SpanStatusCode = cjsExports.SpanStatusCode || (cjsExports.SpanStatusCode = {})));
});
export { require_status };
