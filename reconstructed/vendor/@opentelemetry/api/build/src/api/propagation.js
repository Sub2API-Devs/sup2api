/**
 * @opentelemetry/api/build/src/api/propagation.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/api@1.9.0
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_global_utils } from "../internal/global-utils.js";
import { require_NoopTextMapPropagator } from "../propagation/NoopTextMapPropagator.js";
import { require_TextMapPropagator } from "../propagation/TextMapPropagator.js";
import { require_context_helpers } from "../baggage/context-helpers.js";
import { require_utils_5 } from "../baggage/utils.js";
import { require_diag } from "./diag.js";

//@ chunk-bwbq4xvm.js:47752-48667 cjs-fingerprint
var require_propagation = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.PropagationAPI = undefined;
  var global_utils_1 = require_global_utils();
  var NoopTextMapPropagator_1 = require_NoopTextMapPropagator();
  var TextMapPropagator_1 = require_TextMapPropagator();
  var context_helpers_1 = require_context_helpers();
  var utils_1 = require_utils_5();
  var diag_1 = require_diag();
  var API_NAME = "propagation";
  var NOOP_TEXT_MAP_PROPAGATOR = new NoopTextMapPropagator_1.NoopTextMapPropagator();
  class PropagationAPI {
    constructor() {
      this.createBaggage = utils_1.createBaggage;
      this.getBaggage = context_helpers_1.getBaggage;
      this.getActiveBaggage = context_helpers_1.getActiveBaggage;
      this.setBaggage = context_helpers_1.setBaggage;
      this.deleteBaggage = context_helpers_1.deleteBaggage;
    }
    static getInstance() {
      if (!this._instance) this._instance = new PropagationAPI();
      return this._instance;
    }
    setGlobalPropagator(propagator) {
      return global_utils_1.registerGlobal(API_NAME, propagator, diag_1.DiagAPI.instance());
    }
    inject(context, carrier, setter = TextMapPropagator_1.defaultTextMapSetter) {
      return this._getGlobalPropagator().inject(context, carrier, setter);
    }
    extract(context, carrier, getter = TextMapPropagator_1.defaultTextMapGetter) {
      return this._getGlobalPropagator().extract(context, carrier, getter);
    }
    fields() {
      return this._getGlobalPropagator().fields();
    }
    disable() {
      global_utils_1.unregisterGlobal(API_NAME, diag_1.DiagAPI.instance());
    }
    _getGlobalPropagator() {
      return global_utils_1.getGlobal(API_NAME) || NOOP_TEXT_MAP_PROPAGATOR;
    }
  }
  cjsExports.PropagationAPI = PropagationAPI;
});
export { require_propagation };
