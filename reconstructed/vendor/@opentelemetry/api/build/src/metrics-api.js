/**
 * @opentelemetry/api/build/src/metrics-api.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/api@1.9.0
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_metrics } from "./api/metrics.js";

//@ chunk-bwbq4xvm.js:46929-47072 cjs-fingerprint
var require_metrics_api = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.metrics = undefined;
  var metrics_1 = require_metrics();
  cjsExports.metrics = metrics_1.MetricsAPI.getInstance();
});
export { require_metrics_api };
