/**
 * @opentelemetry/sdk-metrics/build/src/MeterProvider.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/sdk-metrics@2.7.1
 * pieces: chunk-q87n5wsq.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_api } from "../../../api/build/src/index.js";
import { require_resources } from "../../../resources/build/src/index.js";
import { require_MeterProviderSharedState } from "./state/MeterProviderSharedState.js";
import { require_MetricCollector } from "./state/MetricCollector.js";
import { require_View } from "./view/View.js";

//@ chunk-q87n5wsq.js:57680-58901 cjs-fingerprint
var require_MeterProvider = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.MeterProvider = undefined;
  var api_1 = require_api();
  var resources_1 = require_resources();
  var MeterProviderSharedState_1 = require_MeterProviderSharedState();
  var MetricCollector_1 = require_MetricCollector();
  var View_1 = require_View();
  class MeterProvider {
    _sharedState;
    _shutdown = false;
    constructor(options) {
      this._sharedState = new MeterProviderSharedState_1.MeterProviderSharedState(
        options?.resource ?? resources_1.defaultResource(),
      );
      if (options?.views != null && options.views.length > 0)
        for (let viewOption of options.views)
          this._sharedState.viewRegistry.addView(new View_1.View(viewOption));
      if (options?.readers != null && options.readers.length > 0)
        for (let metricReader of options.readers) {
          let collector = new MetricCollector_1.MetricCollector(this._sharedState, metricReader);
          metricReader.setMetricProducer(collector);
          this._sharedState.metricCollectors.push(collector);
        }
    }
    getMeter(name, version = "", options = {}) {
      if (this._shutdown) {
        api_1.diag.warn("A shutdown MeterProvider cannot provide a Meter");
        return api_1.createNoopMeter();
      }
      return this._sharedState.getMeterSharedState({
        name,
        version,
        schemaUrl: options.schemaUrl,
      }).meter;
    }
    async shutdown(options) {
      if (this._shutdown) {
        api_1.diag.warn("shutdown may only be called once per MeterProvider");
        return;
      }
      this._shutdown = true;
      await Promise.all(this._sharedState.metricCollectors.map((collector) => collector.shutdown(options)));
    }
    async forceFlush(options) {
      if (this._shutdown) {
        api_1.diag.warn("invalid attempt to force flush after MeterProvider shutdown");
        return;
      }
      await Promise.all(this._sharedState.metricCollectors.map((collector) => collector.forceFlush(options)));
    }
  }
  cjsExports.MeterProvider = MeterProvider;
});
export { require_MeterProvider };
