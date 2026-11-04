/**
 * @opentelemetry/api/build/src/trace/internal/utils.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/api@1.9.0
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../../runtime/bun-runtime.js";
import { require_tracestate_impl } from "./tracestate-impl.js";

//@ chunk-bwbq4xvm.js:45707-45890 cjs-fingerprint
var require_utils_6 = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.createTraceState = undefined;
  var tracestate_impl_1 = require_tracestate_impl();
  function createTraceState(rawTraceState) {
    return new tracestate_impl_1.TraceStateImpl(rawTraceState);
  }
  cjsExports.createTraceState = createTraceState;
});
export { require_utils_6 };
