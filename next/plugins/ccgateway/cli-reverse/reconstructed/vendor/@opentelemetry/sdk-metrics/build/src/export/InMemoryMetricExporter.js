/**
 * @opentelemetry/sdk-metrics/build/src/export/InMemoryMetricExporter.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/sdk-metrics@2.7.1
 * pieces: chunk-q87n5wsq.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_core } from "../../../../core/build/src/index.js";

//@ chunk-q87n5wsq.js:29617-30260 cjs-fingerprint
var require_InMemoryMetricExporter = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.InMemoryMetricExporter = undefined;
  var core_1 = require_core();
  class InMemoryMetricExporter {
    _shutdown = false;
    _aggregationTemporality;
    _metrics = [];
    constructor(aggregationTemporality) {
      this._aggregationTemporality = aggregationTemporality;
    }
    export(metrics, resultCallback) {
      if (this._shutdown) {
        setTimeout(
          () =>
            resultCallback({
              code: core_1.ExportResultCode.FAILED,
            }),
          0,
        );
        return;
      }
      this._metrics.push(metrics);
      setTimeout(
        () =>
          resultCallback({
            code: core_1.ExportResultCode.SUCCESS,
          }),
        0,
      );
    }
    getMetrics() {
      return this._metrics;
    }
    forceFlush() {
      return Promise.resolve();
    }
    reset() {
      this._metrics = [];
    }
    selectAggregationTemporality(_instrumentType) {
      return this._aggregationTemporality;
    }
    shutdown() {
      this._shutdown = true;
      return Promise.resolve();
    }
  }
  cjsExports.InMemoryMetricExporter = InMemoryMetricExporter;
});
export { require_InMemoryMetricExporter };
