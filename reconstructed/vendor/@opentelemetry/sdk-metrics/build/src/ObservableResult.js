/**
 * @opentelemetry/sdk-metrics/build/src/ObservableResult.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/sdk-metrics@2.7.1
 * pieces: chunk-wrv5s6k4.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_api } from "../../../api/build/src/index.js";
import { require_HashMap } from "./state/HashMap.js";
import { require_Instruments } from "./Instruments.js";

//@ chunk-wrv5s6k4.js:46276-47538 cjs-fingerprint
var require_ObservableResult = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.BatchObservableResultImpl = cjsExports.ObservableResultImpl = undefined;
  var api_1 = require_api();
  var HashMap_1 = require_HashMap();
  var Instruments_1 = require_Instruments();
  class ObservableResultImpl {
    _buffer = new HashMap_1.AttributeHashMap();
    _instrumentName;
    _valueType;
    constructor(instrumentName, valueType) {
      this._instrumentName = instrumentName;
      this._valueType = valueType;
    }
    observe(value, attributes = {}) {
      if (typeof value !== "number") {
        api_1.diag.warn(`non-number value provided to metric ${this._instrumentName}: ${value}`);
        return;
      }
      if (this._valueType === api_1.ValueType.INT && !Number.isInteger(value)) {
        api_1.diag.warn(
          `INT value type cannot accept a floating-point value for ${this._instrumentName}, ignoring the fractional digits.`,
        );
        value = Math.trunc(value);
        if (!Number.isInteger(value)) return;
      }
      this._buffer.set(attributes, value);
    }
  }
  cjsExports.ObservableResultImpl = ObservableResultImpl;
  class BatchObservableResultImpl {
    _buffer = new Map();
    observe(metric, value, attributes = {}) {
      if (!Instruments_1.isObservableInstrument(metric)) return;
      let map = this._buffer.get(metric);
      if (map == null) {
        map = new HashMap_1.AttributeHashMap();
        this._buffer.set(metric, map);
      }
      if (typeof value !== "number") {
        api_1.diag.warn(`non-number value provided to metric ${metric._descriptor.name}: ${value}`);
        return;
      }
      if (metric._descriptor.valueType === api_1.ValueType.INT && !Number.isInteger(value)) {
        api_1.diag.warn(
          `INT value type cannot accept a floating-point value for ${metric._descriptor.name}, ignoring the fractional digits.`,
        );
        value = Math.trunc(value);
        if (!Number.isInteger(value)) return;
      }
      map.set(attributes, value);
    }
  }
  cjsExports.BatchObservableResultImpl = BatchObservableResultImpl;
});
export { require_ObservableResult };
