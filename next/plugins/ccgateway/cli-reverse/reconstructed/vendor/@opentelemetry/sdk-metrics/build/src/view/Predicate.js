/**
 * @opentelemetry/sdk-metrics/build/src/view/Predicate.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/sdk-metrics@2.7.1
 * pieces: chunk-q87n5wsq.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-q87n5wsq.js:54699-55395 cjs-fingerprint
var require_Predicate = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.ExactPredicate = cjsExports.PatternPredicate = undefined;
  var ESCAPE = /[\^$\\.+?()[\]{}|]/g;
  class PatternPredicate {
    _matchAll;
    _regexp;
    constructor(pattern) {
      if (pattern === "*") {
        this._matchAll = true;
        this._regexp = /.*/;
      } else {
        this._matchAll = false;
        this._regexp = new RegExp(PatternPredicate.escapePattern(pattern));
      }
    }
    match(str) {
      if (this._matchAll) return true;
      return this._regexp.test(str);
    }
    static escapePattern(pattern) {
      return `^${pattern.replace(ESCAPE, "\\$&").replace("*", ".*")}$`;
    }
    static hasWildcard(pattern) {
      return pattern.includes("*");
    }
  }
  cjsExports.PatternPredicate = PatternPredicate;
  class ExactPredicate {
    _matchAll;
    _pattern;
    constructor(pattern) {
      this._matchAll = pattern === undefined;
      this._pattern = pattern;
    }
    match(str) {
      if (this._matchAll) return true;
      if (str === this._pattern) return true;
      return false;
    }
  }
  cjsExports.ExactPredicate = ExactPredicate;
});
export { require_Predicate };
