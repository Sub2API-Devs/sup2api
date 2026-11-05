/**
 * @opentelemetry/sdk-metrics/build/src/view/AggregationOption.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/sdk-metrics@2.7.1
 * pieces: chunk-q87n5wsq.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_Aggregation } from "./Aggregation.js";

//@ chunk-q87n5wsq.js:23482-24464 cjs-fingerprint
var require_AggregationOption = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.toAggregation = cjsExports.AggregationType = undefined;
  var Aggregation_1 = require_Aggregation();
  var AggregationType;
  (function (AggregationType) {
    AggregationType[(AggregationType.DEFAULT = 0)] = "DEFAULT";
    AggregationType[(AggregationType.DROP = 1)] = "DROP";
    AggregationType[(AggregationType.SUM = 2)] = "SUM";
    AggregationType[(AggregationType.LAST_VALUE = 3)] = "LAST_VALUE";
    AggregationType[(AggregationType.EXPLICIT_BUCKET_HISTOGRAM = 4)] = "EXPLICIT_BUCKET_HISTOGRAM";
    AggregationType[(AggregationType.EXPONENTIAL_HISTOGRAM = 5)] = "EXPONENTIAL_HISTOGRAM";
  })((AggregationType = cjsExports.AggregationType || (cjsExports.AggregationType = {})));
  function toAggregation(option) {
    switch (option.type) {
      case AggregationType.DEFAULT:
        return Aggregation_1.DEFAULT_AGGREGATION;
      case AggregationType.DROP:
        return Aggregation_1.DROP_AGGREGATION;
      case AggregationType.SUM:
        return Aggregation_1.SUM_AGGREGATION;
      case AggregationType.LAST_VALUE:
        return Aggregation_1.LAST_VALUE_AGGREGATION;
      case AggregationType.EXPONENTIAL_HISTOGRAM: {
        let expOption = option;
        return new Aggregation_1.ExponentialHistogramAggregation(
          expOption.options?.maxSize,
          expOption.options?.recordMinMax,
        );
      }
      case AggregationType.EXPLICIT_BUCKET_HISTOGRAM: {
        let expOption = option;
        if (expOption.options == null) return Aggregation_1.HISTOGRAM_AGGREGATION;
        else
          return new Aggregation_1.ExplicitBucketHistogramAggregation(
            expOption.options?.boundaries,
            expOption.options?.recordMinMax,
          );
      }
      default:
        throw Error("Unsupported Aggregation");
    }
  }
  cjsExports.toAggregation = toAggregation;
});
export { require_AggregationOption };
