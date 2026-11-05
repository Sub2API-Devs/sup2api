/**
 * @opentelemetry/sdk-metrics/build/src/state/MultiWritableMetricStorage.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/sdk-metrics@2.7.1
 * pieces: chunk-q87n5wsq.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-q87n5wsq.js:45990-46276 cjs-fingerprint
var require_MultiWritableMetricStorage = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.MultiMetricStorage = undefined;
  class MultiMetricStorage {
    _backingStorages;
    constructor(backingStorages) {
      this._backingStorages = backingStorages;
    }
    record(value, attributes, context, recordTime) {
      let storages = this._backingStorages;
      for (let i = 0; i < storages.length; i++) storages[i].record(value, attributes, context, recordTime);
    }
  }
  cjsExports.MultiMetricStorage = MultiMetricStorage;
});
export { require_MultiWritableMetricStorage };
