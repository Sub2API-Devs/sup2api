/**
 * @opentelemetry/sdk-metrics/build/src/view/Aggregation.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/sdk-metrics@2.7.1
 * pieces: chunk-q87n5wsq.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_api } from "../../../../api/build/src/index.js";
import { require_aggregator } from "../aggregator/index.js";
import { require_MetricData } from "../export/MetricData.js";

//@ chunk-q87n5wsq.js:20669-23482 cjs-fingerprint
var require_Aggregation = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.DEFAULT_AGGREGATION =
    cjsExports.EXPONENTIAL_HISTOGRAM_AGGREGATION =
    cjsExports.HISTOGRAM_AGGREGATION =
    cjsExports.LAST_VALUE_AGGREGATION =
    cjsExports.SUM_AGGREGATION =
    cjsExports.DROP_AGGREGATION =
    cjsExports.DefaultAggregation =
    cjsExports.ExponentialHistogramAggregation =
    cjsExports.ExplicitBucketHistogramAggregation =
    cjsExports.HistogramAggregation =
    cjsExports.LastValueAggregation =
    cjsExports.SumAggregation =
    cjsExports.DropAggregation =
      undefined;
  var api = require_api();
  var aggregator_1 = require_aggregator();
  var MetricData_1 = require_MetricData();
  class DropAggregation {
    static DEFAULT_INSTANCE = new aggregator_1.DropAggregator();
    createAggregator(_instrument) {
      return DropAggregation.DEFAULT_INSTANCE;
    }
  }
  cjsExports.DropAggregation = DropAggregation;
  class SumAggregation {
    static MONOTONIC_INSTANCE = new aggregator_1.SumAggregator(true);
    static NON_MONOTONIC_INSTANCE = new aggregator_1.SumAggregator(false);
    createAggregator(instrument) {
      switch (instrument.type) {
        case MetricData_1.InstrumentType.COUNTER:
        case MetricData_1.InstrumentType.OBSERVABLE_COUNTER:
        case MetricData_1.InstrumentType.HISTOGRAM:
          return SumAggregation.MONOTONIC_INSTANCE;
        default:
          return SumAggregation.NON_MONOTONIC_INSTANCE;
      }
    }
  }
  cjsExports.SumAggregation = SumAggregation;
  class LastValueAggregation {
    static DEFAULT_INSTANCE = new aggregator_1.LastValueAggregator();
    createAggregator(_instrument) {
      return LastValueAggregation.DEFAULT_INSTANCE;
    }
  }
  cjsExports.LastValueAggregation = LastValueAggregation;
  class HistogramAggregation {
    static DEFAULT_INSTANCE = new aggregator_1.HistogramAggregator(
      [0, 5, 10, 25, 50, 75, 100, 250, 500, 750, 1000, 2500, 5000, 7500, 1e4],
      true,
    );
    createAggregator(_instrument) {
      return HistogramAggregation.DEFAULT_INSTANCE;
    }
  }
  cjsExports.HistogramAggregation = HistogramAggregation;
  class ExplicitBucketHistogramAggregation {
    _boundaries;
    _recordMinMax;
    constructor(boundaries, recordMinMax = true) {
      if (boundaries == null)
        throw Error(
          "ExplicitBucketHistogramAggregation should be created with explicit boundaries, if a single bucket histogram is required, please pass an empty array",
        );
      boundaries = boundaries.concat();
      boundaries = boundaries.sort((a, b) => a - b);
      let minusInfinityIndex = boundaries.lastIndexOf(-1 / 0);
      let infinityIndex = boundaries.indexOf(1 / 0);
      if (infinityIndex === -1) infinityIndex = undefined;
      this._boundaries = boundaries.slice(minusInfinityIndex + 1, infinityIndex);
      this._recordMinMax = recordMinMax;
    }
    createAggregator(_instrument) {
      return new aggregator_1.HistogramAggregator(this._boundaries, this._recordMinMax);
    }
  }
  cjsExports.ExplicitBucketHistogramAggregation = ExplicitBucketHistogramAggregation;
  class ExponentialHistogramAggregation {
    _maxSize;
    _recordMinMax;
    constructor(maxSize = 160, recordMinMax = true) {
      this._maxSize = maxSize;
      this._recordMinMax = recordMinMax;
    }
    createAggregator(_instrument) {
      return new aggregator_1.ExponentialHistogramAggregator(this._maxSize, this._recordMinMax);
    }
  }
  cjsExports.ExponentialHistogramAggregation = ExponentialHistogramAggregation;
  class DefaultAggregation {
    _resolve(instrument) {
      switch (instrument.type) {
        case MetricData_1.InstrumentType.COUNTER:
        case MetricData_1.InstrumentType.UP_DOWN_COUNTER:
        case MetricData_1.InstrumentType.OBSERVABLE_COUNTER:
        case MetricData_1.InstrumentType.OBSERVABLE_UP_DOWN_COUNTER:
          return cjsExports.SUM_AGGREGATION;
        case MetricData_1.InstrumentType.GAUGE:
        case MetricData_1.InstrumentType.OBSERVABLE_GAUGE:
          return cjsExports.LAST_VALUE_AGGREGATION;
        case MetricData_1.InstrumentType.HISTOGRAM: {
          if (instrument.advice.explicitBucketBoundaries)
            return new ExplicitBucketHistogramAggregation(instrument.advice.explicitBucketBoundaries);
          return cjsExports.HISTOGRAM_AGGREGATION;
        }
      }
      api.diag.warn(`Unable to recognize instrument type: ${instrument.type}`);
      return cjsExports.DROP_AGGREGATION;
    }
    createAggregator(instrument) {
      return this._resolve(instrument).createAggregator(instrument);
    }
  }
  cjsExports.DefaultAggregation = DefaultAggregation;
  cjsExports.DROP_AGGREGATION = new DropAggregation();
  cjsExports.SUM_AGGREGATION = new SumAggregation();
  cjsExports.LAST_VALUE_AGGREGATION = new LastValueAggregation();
  cjsExports.HISTOGRAM_AGGREGATION = new HistogramAggregation();
  cjsExports.EXPONENTIAL_HISTOGRAM_AGGREGATION = new ExponentialHistogramAggregation();
  cjsExports.DEFAULT_AGGREGATION = new DefaultAggregation();
});
export { require_Aggregation };
