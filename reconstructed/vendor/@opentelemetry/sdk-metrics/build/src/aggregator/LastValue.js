/**
 * @opentelemetry/sdk-metrics/build/src/aggregator/LastValue.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/sdk-metrics@2.7.1
 * pieces: chunk-wrv5s6k4.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_types } from "./types.js";
import { require_core } from "../../../../core/build/src/index.js";
import { require_MetricData } from "../export/MetricData.js";

//@ chunk-wrv5s6k4.js:17137-18190 cjs-fingerprint
var require_LastValue = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.LastValueAggregator = cjsExports.LastValueAccumulation = undefined;
  var types_1 = require_types();
  var core_1 = require_core();
  var MetricData_1 = require_MetricData();
  class LastValueAccumulation {
    startTime;
    _current;
    sampleTime;
    constructor(startTime, current = 0, sampleTime = [0, 0]) {
      this.startTime = startTime;
      this._current = current;
      this.sampleTime = sampleTime;
    }
    record(value) {
      this._current = value;
      this.sampleTime = core_1.millisToHrTime(Date.now());
    }
    setStartTime(startTime) {
      this.startTime = startTime;
    }
    toPointValue() {
      return this._current;
    }
  }
  cjsExports.LastValueAccumulation = LastValueAccumulation;
  class LastValueAggregator {
    kind = types_1.AggregatorKind.LAST_VALUE;
    createAccumulation(startTime) {
      return new LastValueAccumulation(startTime);
    }
    merge(previous, delta) {
      let latestAccumulation =
        core_1.hrTimeToMicroseconds(delta.sampleTime) >= core_1.hrTimeToMicroseconds(previous.sampleTime)
          ? delta
          : previous;
      return new LastValueAccumulation(
        previous.startTime,
        latestAccumulation.toPointValue(),
        latestAccumulation.sampleTime,
      );
    }
    diff(previous, current) {
      let latestAccumulation =
        core_1.hrTimeToMicroseconds(current.sampleTime) >= core_1.hrTimeToMicroseconds(previous.sampleTime)
          ? current
          : previous;
      return new LastValueAccumulation(
        current.startTime,
        latestAccumulation.toPointValue(),
        latestAccumulation.sampleTime,
      );
    }
    toMetricData(descriptor, aggregationTemporality, accumulationByAttributes, endTime) {
      return {
        descriptor,
        aggregationTemporality,
        dataPointType: MetricData_1.DataPointType.GAUGE,
        dataPoints: accumulationByAttributes.map(([attributes, accumulation]) => ({
          attributes,
          startTime: accumulation.startTime,
          endTime,
          value: accumulation.toPointValue(),
        })),
      };
    }
  }
  cjsExports.LastValueAggregator = LastValueAggregator;
});
export { require_LastValue };
