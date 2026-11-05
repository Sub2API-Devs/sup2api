/**
 * @opentelemetry/sdk-metrics/build/src/state/MetricCollector.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/sdk-metrics@2.7.1
 * pieces: chunk-q87n5wsq.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_core } from "../../../../core/build/src/index.js";

//@ chunk-q87n5wsq.js:53746-54699 cjs-fingerprint
var require_MetricCollector = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.MetricCollector = undefined;
  var core_1 = require_core();
  class MetricCollector {
    _sharedState;
    _metricReader;
    constructor(sharedState, metricReader) {
      this._sharedState = sharedState;
      this._metricReader = metricReader;
    }
    async collect(options) {
      let collectionTime = core_1.millisToHrTime(Date.now());
      let scopeMetrics = [];
      let errors = [];
      let meterCollectionPromises = Array.from(this._sharedState.meterSharedStates.values()).map(
        async (meterSharedState) => {
          let current = await meterSharedState.collect(this, collectionTime, options);
          if (current?.scopeMetrics != null) scopeMetrics.push(current.scopeMetrics);
          if (current?.errors != null) errors.push(...current.errors);
        },
      );
      await Promise.all(meterCollectionPromises);
      return {
        resourceMetrics: {
          resource: this._sharedState.resource,
          scopeMetrics,
        },
        errors,
      };
    }
    async forceFlush(options) {
      await this._metricReader.forceFlush(options);
    }
    async shutdown(options) {
      await this._metricReader.shutdown(options);
    }
    selectAggregationTemporality(instrumentType) {
      return this._metricReader.selectAggregationTemporality(instrumentType);
    }
    selectAggregation(instrumentType) {
      return this._metricReader.selectAggregation(instrumentType);
    }
    selectCardinalityLimit(instrumentType) {
      return this._metricReader.selectCardinalityLimit?.(instrumentType) ?? 2000;
    }
  }
  cjsExports.MetricCollector = MetricCollector;
});
export { require_MetricCollector };
