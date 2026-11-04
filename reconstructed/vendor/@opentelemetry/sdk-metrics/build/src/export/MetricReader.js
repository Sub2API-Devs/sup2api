/**
 * @opentelemetry/sdk-metrics/build/src/export/MetricReader.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/sdk-metrics@2.7.1
 * pieces: chunk-wrv5s6k4.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_api } from "../../../../api/build/src/index.js";
import { require_utils } from "../utils.js";
import { require_AggregationSelector } from "./AggregationSelector.js";

//@ chunk-wrv5s6k4.js:24814-26839 cjs-fingerprint
var require_MetricReader = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.MetricReader = undefined;
  var api = require_api();
  var utils_1 = require_utils();
  var AggregationSelector_1 = require_AggregationSelector();
  class MetricReader {
    _shutdown = false;
    _metricProducers;
    _sdkMetricProducer;
    _aggregationTemporalitySelector;
    _aggregationSelector;
    _cardinalitySelector;
    constructor(options) {
      this._aggregationSelector =
        options?.aggregationSelector ?? AggregationSelector_1.DEFAULT_AGGREGATION_SELECTOR;
      this._aggregationTemporalitySelector =
        options?.aggregationTemporalitySelector ??
        AggregationSelector_1.DEFAULT_AGGREGATION_TEMPORALITY_SELECTOR;
      this._metricProducers = options?.metricProducers ?? [];
      this._cardinalitySelector = options?.cardinalitySelector;
    }
    setMetricProducer(metricProducer) {
      if (this._sdkMetricProducer) throw Error("MetricReader can not be bound to a MeterProvider again.");
      this._sdkMetricProducer = metricProducer;
      this.onInitialized();
    }
    selectAggregation(instrumentType) {
      return this._aggregationSelector(instrumentType);
    }
    selectAggregationTemporality(instrumentType) {
      return this._aggregationTemporalitySelector(instrumentType);
    }
    selectCardinalityLimit(instrumentType) {
      return this._cardinalitySelector ? this._cardinalitySelector(instrumentType) : 2000;
    }
    onInitialized() {}
    async collect(options) {
      if (this._sdkMetricProducer === undefined) throw Error("MetricReader is not bound to a MetricProducer");
      if (this._shutdown) throw Error("MetricReader is shutdown");
      let [sdkCollectionResults, ...additionalCollectionResults] = await Promise.all([
        this._sdkMetricProducer.collect({
          timeoutMillis: options?.timeoutMillis,
        }),
        ...this._metricProducers.map((producer) =>
          producer.collect({
            timeoutMillis: options?.timeoutMillis,
          }),
        ),
      ]);
      let errors = sdkCollectionResults.errors.concat(
        additionalCollectionResults.flatMap((result) => result.errors),
      );
      let resource = sdkCollectionResults.resourceMetrics.resource;
      let scopeMetrics = sdkCollectionResults.resourceMetrics.scopeMetrics.concat(
        additionalCollectionResults.flatMap((result) => result.resourceMetrics.scopeMetrics),
      );
      return {
        resourceMetrics: {
          resource,
          scopeMetrics,
        },
        errors,
      };
    }
    async shutdown(options) {
      if (this._shutdown) {
        api.diag.error("Cannot call shutdown twice.");
        return;
      }
      if (options?.timeoutMillis == null) await this.onShutdown();
      else await utils_1.callWithTimeout(this.onShutdown(), options.timeoutMillis);
      this._shutdown = true;
    }
    async forceFlush(options) {
      if (this._shutdown) {
        api.diag.warn("Cannot forceFlush on already shutdown MetricReader.");
        return;
      }
      if (options?.timeoutMillis == null) {
        await this.onForceFlush();
        return;
      }
      await utils_1.callWithTimeout(this.onForceFlush(), options.timeoutMillis);
    }
  }
  cjsExports.MetricReader = MetricReader;
});
export { require_MetricReader };
