/**
 * @opentelemetry/exporter-metrics-otlp-proto/build/src/platform/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/exporter-metrics-otlp-proto@0.208.0
 * pieces: chunk-hvqbmbtb.js (1)
 * attribution: cjs-require-graph 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_OTLPMetricExporter } from "../../../../exporter-metrics-otlp-http/build/src/platform/node/OTLPMetricExporter.js";

//@ chunk-hvqbmbtb.js:3324-3539 cjs-require-graph
var require_platform = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.OTLPMetricExporter = undefined;
  var node_1 = require_OTLPMetricExporter();
  Object.defineProperty(cjsExports, "OTLPMetricExporter", {
    enumerable: true,
    get: function () {
      return node_1.OTLPMetricExporter;
    },
  });
});
export { require_platform };
