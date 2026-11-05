/**
 * @opentelemetry/sdk-metrics/build/src/state/MeterProviderSharedState.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/sdk-metrics@2.7.1
 * pieces: chunk-q87n5wsq.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_utils } from "../utils.js";
import { require_ViewRegistry } from "../view/ViewRegistry.js";
import { require_MeterSharedState } from "./MeterSharedState.js";
import { require_AggregationOption } from "../view/AggregationOption.js";

//@ chunk-q87n5wsq.js:53139-53746 cjs-fingerprint
var require_MeterProviderSharedState = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.MeterProviderSharedState = undefined;
  var utils_1 = require_utils();
  var ViewRegistry_1 = require_ViewRegistry();
  var MeterSharedState_1 = require_MeterSharedState();
  var AggregationOption_1 = require_AggregationOption();
  class MeterProviderSharedState {
    viewRegistry = new ViewRegistry_1.ViewRegistry();
    metricCollectors = [];
    meterSharedStates = new Map();
    resource;
    constructor(resource) {
      this.resource = resource;
    }
    getMeterSharedState(instrumentationScope) {
      let id = utils_1.instrumentationScopeId(instrumentationScope);
      let meterSharedState = this.meterSharedStates.get(id);
      if (meterSharedState == null) {
        meterSharedState = new MeterSharedState_1.MeterSharedState(this, instrumentationScope);
        this.meterSharedStates.set(id, meterSharedState);
      }
      return meterSharedState;
    }
    selectAggregations(instrumentType) {
      let result = [];
      for (let collector of this.metricCollectors)
        result.push([
          collector,
          AggregationOption_1.toAggregation(collector.selectAggregation(instrumentType)),
        ]);
      return result;
    }
  }
  cjsExports.MeterProviderSharedState = MeterProviderSharedState;
});
export { require_MeterProviderSharedState };
