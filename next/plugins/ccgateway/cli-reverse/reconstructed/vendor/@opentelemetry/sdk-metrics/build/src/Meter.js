/**
 * @opentelemetry/sdk-metrics/build/src/Meter.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/sdk-metrics@2.7.1
 * pieces: chunk-q87n5wsq.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_InstrumentDescriptor } from "./InstrumentDescriptor.js";
import { require_Instruments } from "./Instruments.js";
import { require_MetricData } from "./export/MetricData.js";

//@ chunk-q87n5wsq.js:34666-36515 cjs-fingerprint
var require_Meter = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.Meter = undefined;
  var InstrumentDescriptor = require_InstrumentDescriptor();
  var Instruments_1 = require_Instruments();
  var MetricData = require_MetricData();
  class Meter {
    _meterSharedState;
    constructor(_meterSharedState) {
      this._meterSharedState = _meterSharedState;
    }
    createGauge(name, options) {
      let descriptor = InstrumentDescriptor.createInstrumentDescriptor(
        name,
        MetricData.InstrumentType.GAUGE,
        options,
      );
      let storage = this._meterSharedState.registerMetricStorage(descriptor);
      return new Instruments_1.GaugeInstrument(storage, descriptor);
    }
    createHistogram(name, options) {
      let descriptor = InstrumentDescriptor.createInstrumentDescriptor(
        name,
        MetricData.InstrumentType.HISTOGRAM,
        options,
      );
      let storage = this._meterSharedState.registerMetricStorage(descriptor);
      return new Instruments_1.HistogramInstrument(storage, descriptor);
    }
    createCounter(name, options) {
      let descriptor = InstrumentDescriptor.createInstrumentDescriptor(
        name,
        MetricData.InstrumentType.COUNTER,
        options,
      );
      let storage = this._meterSharedState.registerMetricStorage(descriptor);
      return new Instruments_1.CounterInstrument(storage, descriptor);
    }
    createUpDownCounter(name, options) {
      let descriptor = InstrumentDescriptor.createInstrumentDescriptor(
        name,
        MetricData.InstrumentType.UP_DOWN_COUNTER,
        options,
      );
      let storage = this._meterSharedState.registerMetricStorage(descriptor);
      return new Instruments_1.UpDownCounterInstrument(storage, descriptor);
    }
    createObservableGauge(name, options) {
      let descriptor = InstrumentDescriptor.createInstrumentDescriptor(
        name,
        MetricData.InstrumentType.OBSERVABLE_GAUGE,
        options,
      );
      let storages = this._meterSharedState.registerAsyncMetricStorage(descriptor);
      return new Instruments_1.ObservableGaugeInstrument(
        descriptor,
        storages,
        this._meterSharedState.observableRegistry,
      );
    }
    createObservableCounter(name, options) {
      let descriptor = InstrumentDescriptor.createInstrumentDescriptor(
        name,
        MetricData.InstrumentType.OBSERVABLE_COUNTER,
        options,
      );
      let storages = this._meterSharedState.registerAsyncMetricStorage(descriptor);
      return new Instruments_1.ObservableCounterInstrument(
        descriptor,
        storages,
        this._meterSharedState.observableRegistry,
      );
    }
    createObservableUpDownCounter(name, options) {
      let descriptor = InstrumentDescriptor.createInstrumentDescriptor(
        name,
        MetricData.InstrumentType.OBSERVABLE_UP_DOWN_COUNTER,
        options,
      );
      let storages = this._meterSharedState.registerAsyncMetricStorage(descriptor);
      return new Instruments_1.ObservableUpDownCounterInstrument(
        descriptor,
        storages,
        this._meterSharedState.observableRegistry,
      );
    }
    addBatchObservableCallback(callback, observables) {
      this._meterSharedState.observableRegistry.addBatchCallback(callback, observables);
    }
    removeBatchObservableCallback(callback, observables) {
      this._meterSharedState.observableRegistry.removeBatchCallback(callback, observables);
    }
  }
  cjsExports.Meter = Meter;
});
export { require_Meter };
