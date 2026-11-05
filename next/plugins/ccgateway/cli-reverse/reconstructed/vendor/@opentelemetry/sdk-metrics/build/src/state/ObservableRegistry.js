/**
 * @opentelemetry/sdk-metrics/build/src/state/ObservableRegistry.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/sdk-metrics@2.7.1
 * pieces: chunk-q87n5wsq.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_api } from "../../../../api/build/src/index.js";
import { require_Instruments } from "../Instruments.js";
import { require_ObservableResult } from "../ObservableResult.js";
import { require_utils } from "../utils.js";

//@ chunk-q87n5wsq.js:47538-49359 cjs-fingerprint
var require_ObservableRegistry = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.ObservableRegistry = undefined;
  var api_1 = require_api();
  var Instruments_1 = require_Instruments();
  var ObservableResult_1 = require_ObservableResult();
  var utils_1 = require_utils();
  class ObservableRegistry {
    _callbacks = [];
    _batchCallbacks = [];
    addCallback(callback, instrument) {
      if (this._findCallback(callback, instrument) >= 0) return;
      this._callbacks.push({
        callback,
        instrument,
      });
    }
    removeCallback(callback, instrument) {
      let idx = this._findCallback(callback, instrument);
      if (idx < 0) return;
      this._callbacks.splice(idx, 1);
    }
    addBatchCallback(callback, instruments) {
      let observableInstruments = new Set(instruments.filter(Instruments_1.isObservableInstrument));
      if (observableInstruments.size === 0) {
        api_1.diag.error("BatchObservableCallback is not associated with valid instruments", instruments);
        return;
      }
      if (this._findBatchCallback(callback, observableInstruments) >= 0) return;
      this._batchCallbacks.push({
        callback,
        instruments: observableInstruments,
      });
    }
    removeBatchCallback(callback, instruments) {
      let observableInstruments = new Set(instruments.filter(Instruments_1.isObservableInstrument));
      let idx = this._findBatchCallback(callback, observableInstruments);
      if (idx < 0) return;
      this._batchCallbacks.splice(idx, 1);
    }
    async observe(collectionTime, timeoutMillis) {
      let callbackFutures = this._observeCallbacks(collectionTime, timeoutMillis);
      let observedCallbacks = this._observeBatchCallbacks(collectionTime, timeoutMillis);
      return (await Promise.allSettled([...callbackFutures, ...observedCallbacks]))
        .filter((result) => result.status === "rejected")
        .map((result) => result.reason);
    }
    _observeCallbacks(observationTime, timeoutMillis) {
      return this._callbacks.map(async ({ callback, instrument }) => {
        let observableResult = new ObservableResult_1.ObservableResultImpl(
          instrument._descriptor.name,
          instrument._descriptor.valueType,
        );
        let callPromise = Promise.resolve(callback(observableResult));
        if (timeoutMillis != null) callPromise = utils_1.callWithTimeout(callPromise, timeoutMillis);
        await callPromise;
        instrument._metricStorages.forEach((metricStorage) => {
          metricStorage.record(observableResult._buffer, observationTime);
        });
      });
    }
    _observeBatchCallbacks(observationTime, timeoutMillis) {
      return this._batchCallbacks.map(async ({ callback, instruments }) => {
        let observableResult = new ObservableResult_1.BatchObservableResultImpl();
        let callPromise = Promise.resolve(callback(observableResult));
        if (timeoutMillis != null) callPromise = utils_1.callWithTimeout(callPromise, timeoutMillis);
        await callPromise;
        instruments.forEach((instrument) => {
          let buffer = observableResult._buffer.get(instrument);
          if (buffer == null) return;
          instrument._metricStorages.forEach((metricStorage) => {
            metricStorage.record(buffer, observationTime);
          });
        });
      });
    }
    _findCallback(callback, instrument) {
      return this._callbacks.findIndex(
        (record) => record.callback === callback && record.instrument === instrument,
      );
    }
    _findBatchCallback(callback, instruments) {
      return this._batchCallbacks.findIndex(
        (record) => record.callback === callback && utils_1.setEquals(record.instruments, instruments),
      );
    }
  }
  cjsExports.ObservableRegistry = ObservableRegistry;
});
export { require_ObservableRegistry };
