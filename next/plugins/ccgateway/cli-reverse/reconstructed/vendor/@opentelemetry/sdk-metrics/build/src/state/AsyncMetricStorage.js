/**
 * @opentelemetry/sdk-metrics/build/src/state/AsyncMetricStorage.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/sdk-metrics@2.7.1
 * pieces: chunk-q87n5wsq.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_MetricStorage } from "./MetricStorage.js";
import { require_DeltaMetricProcessor } from "./DeltaMetricProcessor.js";
import { require_TemporalMetricProcessor } from "./TemporalMetricProcessor.js";
import { require_HashMap } from "./HashMap.js";

//@ chunk-q87n5wsq.js:41293-42129 cjs-fingerprint
var require_AsyncMetricStorage = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.AsyncMetricStorage = undefined;
  var MetricStorage_1 = require_MetricStorage();
  var DeltaMetricProcessor_1 = require_DeltaMetricProcessor();
  var TemporalMetricProcessor_1 = require_TemporalMetricProcessor();
  var HashMap_1 = require_HashMap();
  class AsyncMetricStorage extends MetricStorage_1.MetricStorage {
    _aggregationCardinalityLimit;
    _deltaMetricStorage;
    _temporalMetricStorage;
    _attributesProcessor;
    constructor(
      _instrumentDescriptor,
      aggregator,
      attributesProcessor,
      collectorHandles,
      aggregationCardinalityLimit,
    ) {
      super(_instrumentDescriptor);
      this._aggregationCardinalityLimit = aggregationCardinalityLimit;
      this._deltaMetricStorage = new DeltaMetricProcessor_1.DeltaMetricProcessor(
        aggregator,
        this._aggregationCardinalityLimit,
      );
      this._temporalMetricStorage = new TemporalMetricProcessor_1.TemporalMetricProcessor(
        aggregator,
        collectorHandles,
      );
      this._attributesProcessor = attributesProcessor;
    }
    record(measurements, observationTime) {
      let processed = new HashMap_1.AttributeHashMap();
      for (let [attributes, value] of measurements.entries())
        processed.set(this._attributesProcessor.process(attributes), value);
      this._deltaMetricStorage.batchCumulate(processed, observationTime);
    }
    collect(collector, collectionTime) {
      let accumulations = this._deltaMetricStorage.collect();
      return this._temporalMetricStorage.buildMetrics(
        collector,
        this._instrumentDescriptor,
        accumulations,
        collectionTime,
      );
    }
  }
  cjsExports.AsyncMetricStorage = AsyncMetricStorage;
});
export { require_AsyncMetricStorage };
