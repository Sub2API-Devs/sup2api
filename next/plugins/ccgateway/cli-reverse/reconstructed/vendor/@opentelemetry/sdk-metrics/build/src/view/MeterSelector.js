/**
 * @opentelemetry/sdk-metrics/build/src/view/MeterSelector.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/sdk-metrics@2.7.1
 * pieces: chunk-q87n5wsq.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_Predicate } from "./Predicate.js";

//@ chunk-q87n5wsq.js:55820-56311 cjs-fingerprint
var require_MeterSelector = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.MeterSelector = undefined;
  var Predicate_1 = require_Predicate();
  class MeterSelector {
    _nameFilter;
    _versionFilter;
    _schemaUrlFilter;
    constructor(criteria) {
      this._nameFilter = new Predicate_1.ExactPredicate(criteria?.name);
      this._versionFilter = new Predicate_1.ExactPredicate(criteria?.version);
      this._schemaUrlFilter = new Predicate_1.ExactPredicate(criteria?.schemaUrl);
    }
    getNameFilter() {
      return this._nameFilter;
    }
    getVersionFilter() {
      return this._versionFilter;
    }
    getSchemaUrlFilter() {
      return this._schemaUrlFilter;
    }
  }
  cjsExports.MeterSelector = MeterSelector;
});
export { require_MeterSelector };
