/**
 * @opentelemetry/sdk-metrics/build/src/aggregator/Sum.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/sdk-metrics@2.7.1
 * pieces: chunk-q87n5wsq.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_types } from "./types.js";
import { require_MetricData } from "../export/MetricData.js";

//@ chunk-q87n5wsq.js:18190-19312 cjs-fingerprint
var require_Sum = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.SumAggregator = cjsExports.SumAccumulation = undefined;
  var types_1 = require_types();
  var MetricData_1 = require_MetricData();
  class SumAccumulation {
    startTime;
    monotonic;
    _current;
    reset;
    constructor(startTime, monotonic, current = 0, reset = false) {
      this.startTime = startTime;
      this.monotonic = monotonic;
      this._current = current;
      this.reset = reset;
    }
    record(value) {
      if (this.monotonic && value < 0) return;
      this._current += value;
    }
    setStartTime(startTime) {
      this.startTime = startTime;
    }
    toPointValue() {
      return this._current;
    }
  }
  cjsExports.SumAccumulation = SumAccumulation;
  class SumAggregator {
    kind = types_1.AggregatorKind.SUM;
    monotonic;
    constructor(monotonic) {
      this.monotonic = monotonic;
    }
    createAccumulation(startTime) {
      return new SumAccumulation(startTime, this.monotonic);
    }
    merge(previous, delta) {
      let prevPv = previous.toPointValue();
      let deltaPv = delta.toPointValue();
      if (delta.reset) return new SumAccumulation(delta.startTime, this.monotonic, deltaPv, delta.reset);
      return new SumAccumulation(previous.startTime, this.monotonic, prevPv + deltaPv);
    }
    diff(previous, current) {
      let prevPv = previous.toPointValue();
      let currPv = current.toPointValue();
      if (this.monotonic && prevPv > currPv)
        return new SumAccumulation(current.startTime, this.monotonic, currPv, true);
      return new SumAccumulation(current.startTime, this.monotonic, currPv - prevPv);
    }
    toMetricData(descriptor, aggregationTemporality, accumulationByAttributes, endTime) {
      return {
        descriptor,
        aggregationTemporality,
        dataPointType: MetricData_1.DataPointType.SUM,
        dataPoints: accumulationByAttributes.map(([attributes, accumulation]) => ({
          attributes,
          startTime: accumulation.startTime,
          endTime,
          value: accumulation.toPointValue(),
        })),
        isMonotonic: this.monotonic,
      };
    }
  }
  cjsExports.SumAggregator = SumAggregator;
});
export { require_Sum };
