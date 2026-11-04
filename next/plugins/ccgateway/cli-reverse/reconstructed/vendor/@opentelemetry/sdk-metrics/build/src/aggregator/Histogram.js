/**
 * @opentelemetry/sdk-metrics/build/src/aggregator/Histogram.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/sdk-metrics@2.7.1
 * pieces: chunk-wrv5s6k4.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_types } from "./types.js";
import { require_MetricData } from "../export/MetricData.js";
import { require_utils } from "../utils.js";

//@ chunk-wrv5s6k4.js:2813-5286 cjs-fingerprint
var require_Histogram = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.HistogramAggregator = cjsExports.HistogramAccumulation = undefined;
  var types_1 = require_types();
  var MetricData_1 = require_MetricData();
  var utils_1 = require_utils();
  function createNewEmptyCheckpoint(boundaries) {
    let counts = boundaries.map(() => 0);
    counts.push(0);
    return {
      buckets: {
        boundaries,
        counts,
      },
      sum: 0,
      count: 0,
      hasMinMax: false,
      min: 1 / 0,
      max: -1 / 0,
    };
  }
  class HistogramAccumulation {
    startTime;
    _boundaries;
    _recordMinMax;
    _current;
    constructor(startTime, boundaries, recordMinMax = true, current = createNewEmptyCheckpoint(boundaries)) {
      this.startTime = startTime;
      this._boundaries = boundaries;
      this._recordMinMax = recordMinMax;
      this._current = current;
    }
    record(value) {
      if (Number.isNaN(value)) return;
      this._current.count += 1;
      this._current.sum += value;
      if (this._recordMinMax) {
        this._current.min = Math.min(value, this._current.min);
        this._current.max = Math.max(value, this._current.max);
        this._current.hasMinMax = true;
      }
      let idx = utils_1.binarySearchUB(this._boundaries, value);
      this._current.buckets.counts[idx] += 1;
    }
    setStartTime(startTime) {
      this.startTime = startTime;
    }
    toPointValue() {
      return this._current;
    }
  }
  cjsExports.HistogramAccumulation = HistogramAccumulation;
  class HistogramAggregator {
    kind = types_1.AggregatorKind.HISTOGRAM;
    _boundaries;
    _recordMinMax;
    constructor(boundaries, recordMinMax) {
      this._boundaries = boundaries;
      this._recordMinMax = recordMinMax;
    }
    createAccumulation(startTime) {
      return new HistogramAccumulation(startTime, this._boundaries, this._recordMinMax);
    }
    merge(previous, delta) {
      let previousValue = previous.toPointValue();
      let deltaValue = delta.toPointValue();
      let previousCounts = previousValue.buckets.counts;
      let deltaCounts = deltaValue.buckets.counts;
      let mergedCounts = Array(previousCounts.length);
      for (let idx = 0; idx < previousCounts.length; idx++)
        mergedCounts[idx] = previousCounts[idx] + deltaCounts[idx];
      let min = 1 / 0;
      let max = -1 / 0;
      if (this._recordMinMax) {
        if (previousValue.hasMinMax && deltaValue.hasMinMax) {
          min = Math.min(previousValue.min, deltaValue.min);
          max = Math.max(previousValue.max, deltaValue.max);
        } else if (previousValue.hasMinMax) {
          min = previousValue.min;
          max = previousValue.max;
        } else if (deltaValue.hasMinMax) {
          min = deltaValue.min;
          max = deltaValue.max;
        }
      }
      return new HistogramAccumulation(
        previous.startTime,
        previousValue.buckets.boundaries,
        this._recordMinMax,
        {
          buckets: {
            boundaries: previousValue.buckets.boundaries,
            counts: mergedCounts,
          },
          count: previousValue.count + deltaValue.count,
          sum: previousValue.sum + deltaValue.sum,
          hasMinMax: this._recordMinMax && (previousValue.hasMinMax || deltaValue.hasMinMax),
          min,
          max,
        },
      );
    }
    diff(previous, current) {
      let previousValue = previous.toPointValue();
      let currentValue = current.toPointValue();
      let previousCounts = previousValue.buckets.counts;
      let currentCounts = currentValue.buckets.counts;
      let diffedCounts = Array(previousCounts.length);
      for (let idx = 0; idx < previousCounts.length; idx++)
        diffedCounts[idx] = currentCounts[idx] - previousCounts[idx];
      return new HistogramAccumulation(
        current.startTime,
        previousValue.buckets.boundaries,
        this._recordMinMax,
        {
          buckets: {
            boundaries: previousValue.buckets.boundaries,
            counts: diffedCounts,
          },
          count: currentValue.count - previousValue.count,
          sum: currentValue.sum - previousValue.sum,
          hasMinMax: false,
          min: 1 / 0,
          max: -1 / 0,
        },
      );
    }
    toMetricData(descriptor, aggregationTemporality, accumulationByAttributes, endTime) {
      return {
        descriptor,
        aggregationTemporality,
        dataPointType: MetricData_1.DataPointType.HISTOGRAM,
        dataPoints: accumulationByAttributes.map(([attributes, accumulation]) => {
          let pointValue = accumulation.toPointValue();
          let allowsNegativeValues =
            descriptor.type === MetricData_1.InstrumentType.GAUGE ||
            descriptor.type === MetricData_1.InstrumentType.UP_DOWN_COUNTER ||
            descriptor.type === MetricData_1.InstrumentType.OBSERVABLE_GAUGE ||
            descriptor.type === MetricData_1.InstrumentType.OBSERVABLE_UP_DOWN_COUNTER;
          return {
            attributes,
            startTime: accumulation.startTime,
            endTime,
            value: {
              min: pointValue.hasMinMax ? pointValue.min : undefined,
              max: pointValue.hasMinMax ? pointValue.max : undefined,
              sum: !allowsNegativeValues ? pointValue.sum : undefined,
              buckets: pointValue.buckets,
              count: pointValue.count,
            },
          };
        }),
      };
    }
  }
  cjsExports.HistogramAggregator = HistogramAggregator;
});
export { require_Histogram };
