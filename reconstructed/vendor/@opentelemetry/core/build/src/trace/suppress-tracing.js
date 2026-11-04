/**
 * @opentelemetry/core/build/src/trace/suppress-tracing.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/core@2.7.1
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_api } from "../../../../api/build/src/index.js";

//@ chunk-bwbq4xvm.js:53512-53935 cjs-fingerprint
var require_suppress_tracing = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.isTracingSuppressed = cjsExports.unsuppressTracing = cjsExports.suppressTracing = undefined;
  var api_1 = require_api();
  var SUPPRESS_TRACING_KEY = api_1.createContextKey("OpenTelemetry SDK Context Key SUPPRESS_TRACING");
  function suppressTracing(context) {
    return context.setValue(SUPPRESS_TRACING_KEY, true);
  }
  cjsExports.suppressTracing = suppressTracing;
  function unsuppressTracing(context) {
    return context.deleteValue(SUPPRESS_TRACING_KEY);
  }
  cjsExports.unsuppressTracing = unsuppressTracing;
  function isTracingSuppressed(context) {
    return context.getValue(SUPPRESS_TRACING_KEY) === true;
  }
  cjsExports.isTracingSuppressed = isTracingSuppressed;
});
export { require_suppress_tracing };
