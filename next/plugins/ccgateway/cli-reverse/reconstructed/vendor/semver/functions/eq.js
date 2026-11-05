/**
 * semver/functions/eq.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-7kayq7nc.js (6)
 * attribution: cjs-require-graph 6
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_compare } from "./compare.js";

//@ chunk-7kayq7nc.js:12216-12293 cjs-require-graph
var require_eq = __commonJS(function (cjsExports, cjsModule) {
  var compare = require_compare();
  var eq = (a, b, loose) => compare(a, b, loose) > 0;
  cjsModule.exports = eq;
});
//@ chunk-7kayq7nc.js:12293-12370 cjs-require-graph
var require_eq_2 = __commonJS(function (cjsExports, cjsModule) {
  var compare = require_compare();
  var eq = (a, b, loose) => compare(a, b, loose) < 0;
  cjsModule.exports = eq;
});
//@ chunk-7kayq7nc.js:12370-12449 cjs-require-graph
var require_eq_3 = __commonJS(function (cjsExports, cjsModule) {
  var compare = require_compare();
  var eq = (a, b, loose) => compare(a, b, loose) === 0;
  cjsModule.exports = eq;
});
//@ chunk-7kayq7nc.js:12449-12528 cjs-require-graph
var require_eq_4 = __commonJS(function (cjsExports, cjsModule) {
  var compare = require_compare();
  var eq = (a, b, loose) => compare(a, b, loose) !== 0;
  cjsModule.exports = eq;
});
//@ chunk-7kayq7nc.js:12528-12606 cjs-require-graph
var require_eq_5 = __commonJS(function (cjsExports, cjsModule) {
  var compare = require_compare();
  var eq = (a, b, loose) => compare(a, b, loose) >= 0;
  cjsModule.exports = eq;
});
//@ chunk-7kayq7nc.js:12606-12684 cjs-require-graph
var require_eq_6 = __commonJS(function (cjsExports, cjsModule) {
  var compare = require_compare();
  var eq = (a, b, loose) => compare(a, b, loose) <= 0;
  cjsModule.exports = eq;
});
export { require_eq_3, require_eq_4, require_eq, require_eq_5, require_eq_2, require_eq_6 };
