/**
 * @opentelemetry/sdk-metrics/build/src/export/ConsoleMetricExporter.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/sdk-metrics@2.7.1
 * pieces: chunk-q87n5wsq.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_core } from "../../../../core/build/src/index.js";
import { require_AggregationSelector } from "./AggregationSelector.js";

//@ chunk-q87n5wsq.js:30260-31050 cjs-fingerprint
var require_ConsoleMetricExporter = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.ConsoleMetricExporter = undefined;
  var core_1 = require_core();
  var AggregationSelector_1 = require_AggregationSelector();
  class ConsoleMetricExporter {
    _shutdown = false;
    _temporalitySelector;
    constructor(options) {
      this._temporalitySelector =
        options?.temporalitySelector ?? AggregationSelector_1.DEFAULT_AGGREGATION_TEMPORALITY_SELECTOR;
    }
    export(metrics, resultCallback) {
      if (this._shutdown) {
        resultCallback({
          code: core_1.ExportResultCode.FAILED,
        });
        return;
      }
      return ConsoleMetricExporter._sendMetrics(metrics, resultCallback);
    }
    forceFlush() {
      return Promise.resolve();
    }
    selectAggregationTemporality(_instrumentType) {
      return this._temporalitySelector(_instrumentType);
    }
    shutdown() {
      this._shutdown = true;
      return Promise.resolve();
    }
    static _sendMetrics(metrics, done) {
      for (let scopeMetrics of metrics.scopeMetrics)
        for (let metric of scopeMetrics.metrics)
          console.dir(
            {
              descriptor: metric.descriptor,
              dataPointType: metric.dataPointType,
              dataPoints: metric.dataPoints,
            },
            {
              depth: null,
            },
          );
      done({
        code: core_1.ExportResultCode.SUCCESS,
      });
    }
  }
  cjsExports.ConsoleMetricExporter = ConsoleMetricExporter;
});
export { require_ConsoleMetricExporter };
