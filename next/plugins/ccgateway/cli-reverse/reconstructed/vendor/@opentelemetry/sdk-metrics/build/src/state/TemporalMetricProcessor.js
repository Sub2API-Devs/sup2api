/**
 * @opentelemetry/sdk-metrics/build/src/state/TemporalMetricProcessor.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/sdk-metrics@2.7.1
 * pieces: chunk-wrv5s6k4.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_AggregationTemporality } from "../export/AggregationTemporality.js";
import { require_HashMap } from "./HashMap.js";

//@ chunk-wrv5s6k4.js:39651-41293 cjs-fingerprint
var require_TemporalMetricProcessor = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.TemporalMetricProcessor = undefined;
  var AggregationTemporality_1 = require_AggregationTemporality();
  var HashMap_1 = require_HashMap();
  class TemporalMetricProcessor {
    _aggregator;
    _unreportedAccumulations = new Map();
    _reportHistory = new Map();
    constructor(aggregator, collectorHandles) {
      this._aggregator = aggregator;
      collectorHandles.forEach((handle) => {
        this._unreportedAccumulations.set(handle, []);
      });
    }
    buildMetrics(collector, instrumentDescriptor, currentAccumulations, collectionTime) {
      this._stashAccumulations(currentAccumulations);
      let unreportedAccumulations = this._getMergedUnreportedAccumulations(collector);
      let result = unreportedAccumulations;
      let aggregationTemporality;
      if (this._reportHistory.has(collector)) {
        let last = this._reportHistory.get(collector);
        let lastCollectionTime = last.collectionTime;
        aggregationTemporality = last.aggregationTemporality;
        if (aggregationTemporality === AggregationTemporality_1.AggregationTemporality.CUMULATIVE)
          result = TemporalMetricProcessor.merge(
            last.accumulations,
            unreportedAccumulations,
            this._aggregator,
          );
        else
          result = TemporalMetricProcessor.calibrateStartTime(
            last.accumulations,
            unreportedAccumulations,
            lastCollectionTime,
          );
      } else aggregationTemporality = collector.selectAggregationTemporality(instrumentDescriptor.type);
      this._reportHistory.set(collector, {
        accumulations: result,
        collectionTime,
        aggregationTemporality,
      });
      let accumulationRecords = AttributesMapToAccumulationRecords(result);
      if (accumulationRecords.length === 0) return;
      return this._aggregator.toMetricData(
        instrumentDescriptor,
        aggregationTemporality,
        accumulationRecords,
        collectionTime,
      );
    }
    _stashAccumulations(currentAccumulation) {
      let registeredCollectors = this._unreportedAccumulations.keys();
      for (let collector of registeredCollectors) {
        let stash = this._unreportedAccumulations.get(collector);
        if (stash === undefined) {
          stash = [];
          this._unreportedAccumulations.set(collector, stash);
        }
        stash.push(currentAccumulation);
      }
    }
    _getMergedUnreportedAccumulations(collector) {
      let result = new HashMap_1.AttributeHashMap();
      let unreportedList = this._unreportedAccumulations.get(collector);
      this._unreportedAccumulations.set(collector, []);
      if (unreportedList === undefined) return result;
      for (let it of unreportedList) result = TemporalMetricProcessor.merge(result, it, this._aggregator);
      return result;
    }
    static merge(last, current, aggregator) {
      let result = last;
      let iterator = current.entries();
      let next = iterator.next();
      while (next.done !== true) {
        let [key, record, hash] = next.value;
        if (last.has(key, hash)) {
          let lastAccumulation = last.get(key, hash);
          let accumulation = aggregator.merge(lastAccumulation, record);
          result.set(key, accumulation, hash);
        } else result.set(key, record, hash);
        next = iterator.next();
      }
      return result;
    }
    static calibrateStartTime(last, current, lastCollectionTime) {
      for (let [key, accumulation] of last.keys())
        current.get(key, accumulation)?.setStartTime(lastCollectionTime);
      return current;
    }
  }
  cjsExports.TemporalMetricProcessor = TemporalMetricProcessor;
  function AttributesMapToAccumulationRecords(map) {
    return Array.from(map.entries());
  }
});
export { require_TemporalMetricProcessor };
