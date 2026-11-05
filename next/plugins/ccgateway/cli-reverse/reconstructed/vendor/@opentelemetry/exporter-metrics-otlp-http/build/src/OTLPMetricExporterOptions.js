/**
 * @opentelemetry/exporter-metrics-otlp-http/build/src/OTLPMetricExporterOptions.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/exporter-metrics-otlp-http@0.208.0..0.220.0
 * pieces: chunk-hvqbmbtb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";

//@ chunk-hvqbmbtb.js:345-639 cjs-fingerprint
var require_OTLPMetricExporterOptions = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.AggregationTemporalityPreference = undefined;
  var AggregationTemporalityPreference;
  (function (AggregationTemporalityPreference) {
    AggregationTemporalityPreference[(AggregationTemporalityPreference.DELTA = 0)] = "DELTA";
    AggregationTemporalityPreference[(AggregationTemporalityPreference.CUMULATIVE = 1)] = "CUMULATIVE";
    AggregationTemporalityPreference[(AggregationTemporalityPreference.LOWMEMORY = 2)] = "LOWMEMORY";
  })(
    (AggregationTemporalityPreference =
      cjsExports.AggregationTemporalityPreference || (cjsExports.AggregationTemporalityPreference = {})),
  );
});
export { require_OTLPMetricExporterOptions };
