/**
 * @opentelemetry/sdk-metrics/build/src/state/MeterSharedState.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/sdk-metrics@2.7.1
 * pieces: chunk-q87n5wsq.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_InstrumentDescriptor } from "../InstrumentDescriptor.js";
import { require_Meter } from "../Meter.js";
import { require_AsyncMetricStorage } from "./AsyncMetricStorage.js";
import { require_MetricStorageRegistry } from "./MetricStorageRegistry.js";
import { require_MultiWritableMetricStorage } from "./MultiWritableMetricStorage.js";
import { require_ObservableRegistry } from "./ObservableRegistry.js";
import { require_SyncMetricStorage } from "./SyncMetricStorage.js";
import { require_AttributesProcessor } from "../view/AttributesProcessor.js";

//@ chunk-q87n5wsq.js:51247-53139 cjs-fingerprint
var require_MeterSharedState = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.MeterSharedState = undefined;
  var InstrumentDescriptor_1 = require_InstrumentDescriptor();
  var Meter_1 = require_Meter();
  var AsyncMetricStorage_1 = require_AsyncMetricStorage();
  var MetricStorageRegistry_1 = require_MetricStorageRegistry();
  var MultiWritableMetricStorage_1 = require_MultiWritableMetricStorage();
  var ObservableRegistry_1 = require_ObservableRegistry();
  var SyncMetricStorage_1 = require_SyncMetricStorage();
  var AttributesProcessor_1 = require_AttributesProcessor();
  class MeterSharedState {
    metricStorageRegistry = new MetricStorageRegistry_1.MetricStorageRegistry();
    observableRegistry = new ObservableRegistry_1.ObservableRegistry();
    meter;
    _meterProviderSharedState;
    _instrumentationScope;
    constructor(meterProviderSharedState, instrumentationScope) {
      this.meter = new Meter_1.Meter(this);
      this._meterProviderSharedState = meterProviderSharedState;
      this._instrumentationScope = instrumentationScope;
    }
    registerMetricStorage(descriptor) {
      let storages = this._registerMetricStorage(descriptor, SyncMetricStorage_1.SyncMetricStorage);
      if (storages.length === 1) return storages[0];
      return new MultiWritableMetricStorage_1.MultiMetricStorage(storages);
    }
    registerAsyncMetricStorage(descriptor) {
      return this._registerMetricStorage(descriptor, AsyncMetricStorage_1.AsyncMetricStorage);
    }
    async collect(collector, collectionTime, options) {
      let errors = await this.observableRegistry.observe(collectionTime, options?.timeoutMillis);
      let storages = this.metricStorageRegistry.getStorages(collector);
      if (storages.length === 0) return null;
      let metricDataList = [];
      storages.forEach((metricStorage) => {
        let metricData = metricStorage.collect(collector, collectionTime);
        if (metricData != null) metricDataList.push(metricData);
      });
      if (metricDataList.length === 0)
        return {
          errors,
        };
      return {
        scopeMetrics: {
          scope: this._instrumentationScope,
          metrics: metricDataList,
        },
        errors,
      };
    }
    _registerMetricStorage(descriptor, MetricStorageType) {
      let storages = this._meterProviderSharedState.viewRegistry
        .findViews(descriptor, this._instrumentationScope)
        .map((view) => {
          let viewDescriptor = InstrumentDescriptor_1.createInstrumentDescriptorWithView(view, descriptor);
          let compatibleStorage = this.metricStorageRegistry.findOrUpdateCompatibleStorage(viewDescriptor);
          if (compatibleStorage != null) return compatibleStorage;
          let aggregator = view.aggregation.createAggregator(viewDescriptor);
          let viewStorage = new MetricStorageType(
            viewDescriptor,
            aggregator,
            view.attributesProcessor,
            this._meterProviderSharedState.metricCollectors,
            view.aggregationCardinalityLimit,
          );
          this.metricStorageRegistry.register(viewStorage);
          return viewStorage;
        });
      if (storages.length === 0) {
        let mapped = this._meterProviderSharedState
          .selectAggregations(descriptor.type)
          .map(([collector, aggregation]) => {
            let compatibleStorage = this.metricStorageRegistry.findOrUpdateCompatibleCollectorStorage(
              collector,
              descriptor,
            );
            if (compatibleStorage != null) return compatibleStorage;
            let aggregator = aggregation.createAggregator(descriptor);
            let cardinalityLimit = collector.selectCardinalityLimit(descriptor.type);
            let storage = new MetricStorageType(
              descriptor,
              aggregator,
              AttributesProcessor_1.createNoopAttributesProcessor(),
              [collector],
              cardinalityLimit,
            );
            this.metricStorageRegistry.registerForCollector(collector, storage);
            return storage;
          });
        storages = storages.concat(mapped);
      }
      return storages;
    }
  }
  cjsExports.MeterSharedState = MeterSharedState;
});
export { require_MeterSharedState };
