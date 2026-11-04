/**
 * @opentelemetry/otlp-transformer/build/src/metrics/internal-types.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/otlp-transformer@0.208.0..0.209.0
 * pieces: chunk-798ashq9.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-798ashq9.js:246588-247011 cjs-fingerprint
var require_internal_types = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.EAggregationTemporality = undefined;
  var EAggregationTemporality;
  (function (EAggregationTemporality) {
    EAggregationTemporality[(EAggregationTemporality.AGGREGATION_TEMPORALITY_UNSPECIFIED = 0)] =
      "AGGREGATION_TEMPORALITY_UNSPECIFIED";
    EAggregationTemporality[(EAggregationTemporality.AGGREGATION_TEMPORALITY_DELTA = 1)] =
      "AGGREGATION_TEMPORALITY_DELTA";
    EAggregationTemporality[(EAggregationTemporality.AGGREGATION_TEMPORALITY_CUMULATIVE = 2)] =
      "AGGREGATION_TEMPORALITY_CUMULATIVE";
  })(
    (EAggregationTemporality =
      cjsExports.EAggregationTemporality || (cjsExports.EAggregationTemporality = {})),
  );
});
export { require_internal_types };
