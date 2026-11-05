/**
 * @opentelemetry/sdk-metrics/build/src/view/ViewRegistry.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/sdk-metrics@2.7.1
 * pieces: chunk-q87n5wsq.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-q87n5wsq.js:31050-31700 cjs-fingerprint
var require_ViewRegistry = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.ViewRegistry = undefined;
  class ViewRegistry {
    _registeredViews = [];
    addView(view) {
      this._registeredViews.push(view);
    }
    findViews(instrument, meter) {
      return this._registeredViews.filter(
        (registeredView) =>
          this._matchInstrument(registeredView.instrumentSelector, instrument) &&
          this._matchMeter(registeredView.meterSelector, meter),
      );
    }
    _matchInstrument(selector, instrument) {
      return (
        (selector.getType() === undefined || instrument.type === selector.getType()) &&
        selector.getNameFilter().match(instrument.name) &&
        selector.getUnitFilter().match(instrument.unit)
      );
    }
    _matchMeter(selector, meter) {
      return (
        selector.getNameFilter().match(meter.name) &&
        (meter.version === undefined || selector.getVersionFilter().match(meter.version)) &&
        (meter.schemaUrl === undefined || selector.getSchemaUrlFilter().match(meter.schemaUrl))
      );
    }
  }
  cjsExports.ViewRegistry = ViewRegistry;
});
export { require_ViewRegistry };
