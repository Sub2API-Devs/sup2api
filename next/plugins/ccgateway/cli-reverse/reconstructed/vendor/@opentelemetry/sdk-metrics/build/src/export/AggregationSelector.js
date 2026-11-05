/**
 * @opentelemetry/sdk-metrics/build/src/export/AggregationSelector.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/sdk-metrics@2.7.1
 * pieces: chunk-q87n5wsq.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_AggregationTemporality } from "./AggregationTemporality.js";
import { require_AggregationOption } from "../view/AggregationOption.js";

//@ chunk-q87n5wsq.js:24464-24814 cjs-fingerprint
var require_AggregationSelector = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.DEFAULT_AGGREGATION_TEMPORALITY_SELECTOR = cjsExports.DEFAULT_AGGREGATION_SELECTOR = undefined;
  var AggregationTemporality_1 = require_AggregationTemporality();
  var AggregationOption_1 = require_AggregationOption();
  var DEFAULT_AGGREGATION_SELECTOR = (_instrumentType) => ({
    type: AggregationOption_1.AggregationType.DEFAULT,
  });
  cjsExports.DEFAULT_AGGREGATION_SELECTOR = DEFAULT_AGGREGATION_SELECTOR;
  var DEFAULT_AGGREGATION_TEMPORALITY_SELECTOR = (_instrumentType) =>
    AggregationTemporality_1.AggregationTemporality.CUMULATIVE;
  cjsExports.DEFAULT_AGGREGATION_TEMPORALITY_SELECTOR = DEFAULT_AGGREGATION_TEMPORALITY_SELECTOR;
});
export { require_AggregationSelector };
