/**
 * @opentelemetry/sdk-metrics/build/src/view/InstrumentSelector.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/sdk-metrics@2.7.1
 * pieces: chunk-q87n5wsq.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_Predicate } from "./Predicate.js";

//@ chunk-q87n5wsq.js:55395-55820 cjs-fingerprint
var require_InstrumentSelector = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.InstrumentSelector = undefined;
  var Predicate_1 = require_Predicate();
  class InstrumentSelector {
    _nameFilter;
    _type;
    _unitFilter;
    constructor(criteria) {
      this._nameFilter = new Predicate_1.PatternPredicate(criteria?.name ?? "*");
      this._type = criteria?.type;
      this._unitFilter = new Predicate_1.ExactPredicate(criteria?.unit);
    }
    getType() {
      return this._type;
    }
    getNameFilter() {
      return this._nameFilter;
    }
    getUnitFilter() {
      return this._unitFilter;
    }
  }
  cjsExports.InstrumentSelector = InstrumentSelector;
});
export { require_InstrumentSelector };
