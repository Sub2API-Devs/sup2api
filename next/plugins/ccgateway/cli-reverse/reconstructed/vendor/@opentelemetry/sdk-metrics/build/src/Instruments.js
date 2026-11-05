/**
 * @opentelemetry/sdk-metrics/build/src/Instruments.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/sdk-metrics@2.7.1
 * pieces: chunk-q87n5wsq.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_api } from "../../../api/build/src/index.js";
import { require_core } from "../../../core/build/src/index.js";

//@ chunk-q87n5wsq.js:32677-34666 cjs-fingerprint
var require_Instruments = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.isObservableInstrument =
    cjsExports.ObservableUpDownCounterInstrument =
    cjsExports.ObservableGaugeInstrument =
    cjsExports.ObservableCounterInstrument =
    cjsExports.ObservableInstrument =
    cjsExports.HistogramInstrument =
    cjsExports.GaugeInstrument =
    cjsExports.CounterInstrument =
    cjsExports.UpDownCounterInstrument =
    cjsExports.SyncInstrument =
      undefined;
  var api_1 = require_api();
  var core_1 = require_core();
  class SyncInstrument {
    _writableMetricStorage;
    _descriptor;
    constructor(writableMetricStorage, descriptor) {
      this._writableMetricStorage = writableMetricStorage;
      this._descriptor = descriptor;
    }
    _record(value, attributes = {}, context = api_1.context.active()) {
      if (typeof value !== "number") {
        api_1.diag.warn(`non-number value provided to metric ${this._descriptor.name}: ${value}`);
        return;
      }
      if (this._descriptor.valueType === api_1.ValueType.INT && !Number.isInteger(value)) {
        api_1.diag.warn(
          `INT value type cannot accept a floating-point value for ${this._descriptor.name}, ignoring the fractional digits.`,
        );
        value = Math.trunc(value);
        if (!Number.isInteger(value)) return;
      }
      this._writableMetricStorage.record(value, attributes, context, core_1.millisToHrTime(Date.now()));
    }
  }
  cjsExports.SyncInstrument = SyncInstrument;
  class UpDownCounterInstrument extends SyncInstrument {
    add(value, attributes, ctx) {
      this._record(value, attributes, ctx);
    }
  }
  cjsExports.UpDownCounterInstrument = UpDownCounterInstrument;
  class CounterInstrument extends SyncInstrument {
    add(value, attributes, ctx) {
      if (value < 0) {
        api_1.diag.warn(`negative value provided to counter ${this._descriptor.name}: ${value}`);
        return;
      }
      this._record(value, attributes, ctx);
    }
  }
  cjsExports.CounterInstrument = CounterInstrument;
  class GaugeInstrument extends SyncInstrument {
    record(value, attributes, ctx) {
      this._record(value, attributes, ctx);
    }
  }
  cjsExports.GaugeInstrument = GaugeInstrument;
  class HistogramInstrument extends SyncInstrument {
    record(value, attributes, ctx) {
      if (value < 0) {
        api_1.diag.warn(`negative value provided to histogram ${this._descriptor.name}: ${value}`);
        return;
      }
      this._record(value, attributes, ctx);
    }
  }
  cjsExports.HistogramInstrument = HistogramInstrument;
  class ObservableInstrument {
    _metricStorages;
    _descriptor;
    _observableRegistry;
    constructor(descriptor, metricStorages, observableRegistry) {
      this._descriptor = descriptor;
      this._metricStorages = metricStorages;
      this._observableRegistry = observableRegistry;
    }
    addCallback(callback) {
      this._observableRegistry.addCallback(callback, this);
    }
    removeCallback(callback) {
      this._observableRegistry.removeCallback(callback, this);
    }
  }
  cjsExports.ObservableInstrument = ObservableInstrument;
  class ObservableCounterInstrument extends ObservableInstrument {}
  cjsExports.ObservableCounterInstrument = ObservableCounterInstrument;
  class ObservableGaugeInstrument extends ObservableInstrument {}
  cjsExports.ObservableGaugeInstrument = ObservableGaugeInstrument;
  class ObservableUpDownCounterInstrument extends ObservableInstrument {}
  cjsExports.ObservableUpDownCounterInstrument = ObservableUpDownCounterInstrument;
  function isObservableInstrument(it) {
    return it instanceof ObservableInstrument;
  }
  cjsExports.isObservableInstrument = isObservableInstrument;
});
export { require_Instruments };
