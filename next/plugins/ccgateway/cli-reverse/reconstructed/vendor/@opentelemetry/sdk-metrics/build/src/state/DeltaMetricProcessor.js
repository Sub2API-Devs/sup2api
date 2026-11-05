/**
 * @opentelemetry/sdk-metrics/build/src/state/DeltaMetricProcessor.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/sdk-metrics@2.7.1
 * pieces: chunk-q87n5wsq.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_utils } from "../utils.js";
import { require_HashMap } from "./HashMap.js";

//@ chunk-q87n5wsq.js:38037-39651 cjs-fingerprint
var require_DeltaMetricProcessor = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.DeltaMetricProcessor = undefined;
  var utils_1 = require_utils();
  var HashMap_1 = require_HashMap();
  class DeltaMetricProcessor {
    _activeCollectionStorage = new HashMap_1.AttributeHashMap();
    _cumulativeMemoStorage = new HashMap_1.AttributeHashMap();
    _cardinalityLimit;
    _overflowAttributes = {
      "otel.metric.overflow": true,
    };
    _overflowHashCode;
    _aggregator;
    constructor(aggregator, aggregationCardinalityLimit) {
      this._aggregator = aggregator;
      this._cardinalityLimit = (aggregationCardinalityLimit ?? 2000) - 1;
      this._overflowHashCode = utils_1.hashAttributes(this._overflowAttributes);
    }
    record(value, attributes, _context, collectionTime) {
      let accumulation = this._activeCollectionStorage.get(attributes);
      if (!accumulation) {
        if (this._activeCollectionStorage.size >= this._cardinalityLimit) {
          this._activeCollectionStorage
            .getOrDefault(this._overflowAttributes, () => this._aggregator.createAccumulation(collectionTime))
            ?.record(value);
          return;
        }
        accumulation = this._aggregator.createAccumulation(collectionTime);
        this._activeCollectionStorage.set(attributes, accumulation);
      }
      accumulation?.record(value);
    }
    batchCumulate(measurements, collectionTime) {
      for (let [originalAttributes, value, originalHashCode] of measurements.entries()) {
        let attributes = originalAttributes;
        let hashCode = originalHashCode;
        let accumulation = this._aggregator.createAccumulation(collectionTime);
        accumulation?.record(value);
        let delta = accumulation;
        if (this._cumulativeMemoStorage.has(attributes, hashCode)) {
          let previous = this._cumulativeMemoStorage.get(attributes, hashCode);
          delta = this._aggregator.diff(previous, accumulation);
        } else if (this._cumulativeMemoStorage.size >= this._cardinalityLimit) {
          attributes = this._overflowAttributes;
          hashCode = this._overflowHashCode;
          if (this._cumulativeMemoStorage.has(attributes, hashCode)) {
            let previous = this._cumulativeMemoStorage.get(attributes, hashCode);
            delta = this._aggregator.diff(previous, accumulation);
          }
        }
        if (this._activeCollectionStorage.has(attributes, hashCode)) {
          let active = this._activeCollectionStorage.get(attributes, hashCode);
          delta = this._aggregator.merge(active, delta);
        }
        this._cumulativeMemoStorage.set(attributes, accumulation, hashCode);
        this._activeCollectionStorage.set(attributes, delta, hashCode);
      }
    }
    collect() {
      let unreportedDelta = this._activeCollectionStorage;
      this._activeCollectionStorage = new HashMap_1.AttributeHashMap();
      return unreportedDelta;
    }
  }
  cjsExports.DeltaMetricProcessor = DeltaMetricProcessor;
});
export { require_DeltaMetricProcessor };
