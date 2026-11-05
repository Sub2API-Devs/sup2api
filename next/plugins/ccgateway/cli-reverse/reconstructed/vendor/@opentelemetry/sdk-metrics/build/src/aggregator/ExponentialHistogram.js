/**
 * @opentelemetry/sdk-metrics/build/src/aggregator/ExponentialHistogram.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/sdk-metrics@2.7.1
 * pieces: chunk-q87n5wsq.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_types } from "./types.js";
import { require_MetricData } from "../export/MetricData.js";
import { require_api } from "../../../../api/build/src/index.js";
import { require_Buckets } from "./exponential-histogram/Buckets.js";
import { require_getMapping } from "./exponential-histogram/mapping/getMapping.js";
import { require_util } from "./exponential-histogram/util.js";

//@ chunk-q87n5wsq.js:11405-17137 cjs-fingerprint
var require_ExponentialHistogram = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.ExponentialHistogramAggregator = cjsExports.ExponentialHistogramAccumulation = undefined;
  var types_1 = require_types();
  var MetricData_1 = require_MetricData();
  var api_1 = require_api();
  var Buckets_1 = require_Buckets();
  var getMapping_1 = require_getMapping();
  var util_1 = require_util();
  class HighLow {
    static combine(h1, h2) {
      return new HighLow(Math.min(h1.low, h2.low), Math.max(h1.high, h2.high));
    }
    low;
    high;
    constructor(low, high) {
      this.low = low;
      this.high = high;
    }
  }
  var MAX_SCALE = 20;
  var DEFAULT_MAX_SIZE = 160;
  var MIN_MAX_SIZE = 2;
  class ExponentialHistogramAccumulation {
    startTime;
    _maxSize;
    _recordMinMax;
    _sum;
    _count;
    _zeroCount;
    _min;
    _max;
    _positive;
    _negative;
    _mapping;
    constructor(
      startTime,
      maxSize = DEFAULT_MAX_SIZE,
      recordMinMax = true,
      sum = 0,
      count = 0,
      zeroCount = 0,
      min = Number.POSITIVE_INFINITY,
      max = Number.NEGATIVE_INFINITY,
      positive = new Buckets_1.Buckets(),
      negative = new Buckets_1.Buckets(),
      mapping = getMapping_1.getMapping(MAX_SCALE),
    ) {
      this.startTime = startTime;
      this._maxSize = maxSize;
      this._recordMinMax = recordMinMax;
      this._sum = sum;
      this._count = count;
      this._zeroCount = zeroCount;
      this._min = min;
      this._max = max;
      this._positive = positive;
      this._negative = negative;
      this._mapping = mapping;
      if (this._maxSize < MIN_MAX_SIZE) {
        api_1.diag.warn(
          `Exponential Histogram Max Size set to ${this._maxSize},                 changing to the minimum size of: ${MIN_MAX_SIZE}`,
        );
        this._maxSize = MIN_MAX_SIZE;
      }
    }
    record(value) {
      this.updateByIncrement(value, 1);
    }
    setStartTime(startTime) {
      this.startTime = startTime;
    }
    toPointValue() {
      return {
        hasMinMax: this._recordMinMax,
        min: this.min,
        max: this.max,
        sum: this.sum,
        positive: {
          offset: this.positive.offset,
          bucketCounts: this.positive.counts(),
        },
        negative: {
          offset: this.negative.offset,
          bucketCounts: this.negative.counts(),
        },
        count: this.count,
        scale: this.scale,
        zeroCount: this.zeroCount,
      };
    }
    get sum() {
      return this._sum;
    }
    get min() {
      return this._min;
    }
    get max() {
      return this._max;
    }
    get count() {
      return this._count;
    }
    get zeroCount() {
      return this._zeroCount;
    }
    get scale() {
      if (this._count === this._zeroCount) return 0;
      return this._mapping.scale;
    }
    get positive() {
      return this._positive;
    }
    get negative() {
      return this._negative;
    }
    updateByIncrement(value, increment) {
      if (Number.isNaN(value)) return;
      if (value > this._max) this._max = value;
      if (value < this._min) this._min = value;
      this._count += increment;
      if (value === 0) {
        this._zeroCount += increment;
        return;
      }
      this._sum += value * increment;
      if (value > 0) this._updateBuckets(this._positive, value, increment);
      else this._updateBuckets(this._negative, -value, increment);
    }
    merge(previous) {
      if (this._count === 0) {
        this._min = previous.min;
        this._max = previous.max;
      } else if (previous.count !== 0) {
        if (previous.min < this.min) this._min = previous.min;
        if (previous.max > this.max) this._max = previous.max;
      }
      this.startTime = previous.startTime;
      this._sum += previous.sum;
      this._count += previous.count;
      this._zeroCount += previous.zeroCount;
      let minScale = this._minScale(previous);
      this._downscale(this.scale - minScale);
      this._mergeBuckets(this.positive, previous, previous.positive, minScale);
      this._mergeBuckets(this.negative, previous, previous.negative, minScale);
    }
    diff(other) {
      this._min = 1 / 0;
      this._max = -1 / 0;
      this._sum -= other.sum;
      this._count -= other.count;
      this._zeroCount -= other.zeroCount;
      let minScale = this._minScale(other);
      this._downscale(this.scale - minScale);
      this._diffBuckets(this.positive, other, other.positive, minScale);
      this._diffBuckets(this.negative, other, other.negative, minScale);
    }
    clone() {
      return new ExponentialHistogramAccumulation(
        this.startTime,
        this._maxSize,
        this._recordMinMax,
        this._sum,
        this._count,
        this._zeroCount,
        this._min,
        this._max,
        this.positive.clone(),
        this.negative.clone(),
        this._mapping,
      );
    }
    _updateBuckets(buckets, value, increment) {
      let index = this._mapping.mapToIndex(value);
      let rescalingNeeded = false;
      let high = 0;
      let low = 0;
      if (buckets.length === 0) {
        buckets.indexStart = index;
        buckets.indexEnd = buckets.indexStart;
        buckets.indexBase = buckets.indexStart;
      } else if (index < buckets.indexStart && buckets.indexEnd - index >= this._maxSize) {
        rescalingNeeded = true;
        low = index;
        high = buckets.indexEnd;
      } else if (index > buckets.indexEnd && index - buckets.indexStart >= this._maxSize) {
        rescalingNeeded = true;
        low = buckets.indexStart;
        high = index;
      }
      if (rescalingNeeded) {
        let change = this._changeScale(high, low);
        this._downscale(change);
        index = this._mapping.mapToIndex(value);
      }
      this._incrementIndexBy(buckets, index, increment);
    }
    _incrementIndexBy(buckets, index, increment) {
      if (increment === 0) return;
      if (buckets.length === 0) buckets.indexStart = buckets.indexEnd = buckets.indexBase = index;
      if (index < buckets.indexStart) {
        let span = buckets.indexEnd - index;
        if (span >= buckets.backing.length) this._grow(buckets, span + 1);
        buckets.indexStart = index;
      } else if (index > buckets.indexEnd) {
        let span = index - buckets.indexStart;
        if (span >= buckets.backing.length) this._grow(buckets, span + 1);
        buckets.indexEnd = index;
      }
      let bucketIndex = index - buckets.indexBase;
      if (bucketIndex < 0) bucketIndex += buckets.backing.length;
      buckets.incrementBucket(bucketIndex, increment);
    }
    _grow(buckets, needed) {
      let size = buckets.backing.length;
      let bias = buckets.indexBase - buckets.indexStart;
      let oldPositiveLimit = size - bias;
      let newSize = util_1.nextGreaterSquare(needed);
      if (newSize > this._maxSize) newSize = this._maxSize;
      let newPositiveLimit = newSize - bias;
      buckets.backing.growTo(newSize, oldPositiveLimit, newPositiveLimit);
    }
    _changeScale(high, low) {
      let change = 0;
      while (high - low >= this._maxSize) {
        high >>= 1;
        low >>= 1;
        change++;
      }
      return change;
    }
    _downscale(change) {
      if (change === 0) return;
      if (change < 0) throw Error(`impossible change of scale: ${this.scale}`);
      let newScale = this._mapping.scale - change;
      this._positive.downscale(change);
      this._negative.downscale(change);
      this._mapping = getMapping_1.getMapping(newScale);
    }
    _minScale(other) {
      let minScale = Math.min(this.scale, other.scale);
      let highLowPos = HighLow.combine(
        this._highLowAtScale(this.positive, this.scale, minScale),
        this._highLowAtScale(other.positive, other.scale, minScale),
      );
      let highLowNeg = HighLow.combine(
        this._highLowAtScale(this.negative, this.scale, minScale),
        this._highLowAtScale(other.negative, other.scale, minScale),
      );
      return Math.min(
        minScale - this._changeScale(highLowPos.high, highLowPos.low),
        minScale - this._changeScale(highLowNeg.high, highLowNeg.low),
      );
    }
    _highLowAtScale(buckets, currentScale, newScale) {
      if (buckets.length === 0) return new HighLow(0, -1);
      let shift = currentScale - newScale;
      return new HighLow(buckets.indexStart >> shift, buckets.indexEnd >> shift);
    }
    _mergeBuckets(ours, other, theirs, scale) {
      let theirOffset = theirs.offset;
      let theirChange = other.scale - scale;
      for (let i = 0; i < theirs.length; i++)
        this._incrementIndexBy(ours, (theirOffset + i) >> theirChange, theirs.at(i));
    }
    _diffBuckets(ours, other, theirs, scale) {
      let theirOffset = theirs.offset;
      let theirChange = other.scale - scale;
      for (let i = 0; i < theirs.length; i++) {
        let bucketIndex = ((theirOffset + i) >> theirChange) - ours.indexBase;
        if (bucketIndex < 0) bucketIndex += ours.backing.length;
        ours.decrementBucket(bucketIndex, theirs.at(i));
      }
      ours.trim();
    }
  }
  cjsExports.ExponentialHistogramAccumulation = ExponentialHistogramAccumulation;
  class ExponentialHistogramAggregator {
    kind = types_1.AggregatorKind.EXPONENTIAL_HISTOGRAM;
    _maxSize;
    _recordMinMax;
    constructor(maxSize, recordMinMax) {
      this._maxSize = maxSize;
      this._recordMinMax = recordMinMax;
    }
    createAccumulation(startTime) {
      return new ExponentialHistogramAccumulation(startTime, this._maxSize, this._recordMinMax);
    }
    merge(previous, delta) {
      let result = delta.clone();
      result.merge(previous);
      return result;
    }
    diff(previous, current) {
      let result = current.clone();
      result.diff(previous);
      return result;
    }
    toMetricData(descriptor, aggregationTemporality, accumulationByAttributes, endTime) {
      return {
        descriptor,
        aggregationTemporality,
        dataPointType: MetricData_1.DataPointType.EXPONENTIAL_HISTOGRAM,
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
              positive: {
                offset: pointValue.positive.offset,
                bucketCounts: pointValue.positive.bucketCounts,
              },
              negative: {
                offset: pointValue.negative.offset,
                bucketCounts: pointValue.negative.bucketCounts,
              },
              count: pointValue.count,
              scale: pointValue.scale,
              zeroCount: pointValue.zeroCount,
            },
          };
        }),
      };
    }
  }
  cjsExports.ExponentialHistogramAggregator = ExponentialHistogramAggregator;
});
export { require_ExponentialHistogram };
