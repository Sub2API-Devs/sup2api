/**
 * @opentelemetry/sdk-metrics/build/src/state/SyncMetricStorage.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/sdk-metrics@2.7.1
 * pieces: chunk-q87n5wsq.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_MetricStorage } from "./MetricStorage.js";
import { require_DeltaMetricProcessor } from "./DeltaMetricProcessor.js";
import { require_TemporalMetricProcessor } from "./TemporalMetricProcessor.js";

//@ chunk-q87n5wsq.js:49359-50125 cjs-fingerprint
var require_SyncMetricStorage = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.SyncMetricStorage = undefined;
  var MetricStorage_1 = require_MetricStorage();
  var DeltaMetricProcessor_1 = require_DeltaMetricProcessor();
  var TemporalMetricProcessor_1 = require_TemporalMetricProcessor();
  class SyncMetricStorage extends MetricStorage_1.MetricStorage {
    _aggregationCardinalityLimit;
    _deltaMetricStorage;
    _temporalMetricStorage;
    _attributesProcessor;
    constructor(
      instrumentDescriptor,
      aggregator,
      attributesProcessor,
      collectorHandles,
      aggregationCardinalityLimit,
    ) {
      super(instrumentDescriptor);
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
    record(value, attributes, context, recordTime) {
      attributes = this._attributesProcessor.process(attributes, context);
      this._deltaMetricStorage.record(value, attributes, context, recordTime);
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
  cjsExports.SyncMetricStorage = SyncMetricStorage;
});
export { require_SyncMetricStorage };
