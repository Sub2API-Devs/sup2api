/**
 * semver/functions/eq.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-bwbq4xvm.js (6)
 * attribution: cjs-require-graph 6
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_compare } from "./compare.js";

//@ chunk-bwbq4xvm.js:12139-12215 cjs-require-graph
var require_eq = __commonJS(function (cjsExports, cjsModule) {
  var compare = require_compare();
  var eq = (a, b, loose) => compare(a, b, loose) > 0;
  cjsModule.exports = eq;
});
//@ chunk-bwbq4xvm.js:12215-12291 cjs-require-graph
var require_eq_2 = __commonJS(function (cjsExports, cjsModule) {
  var compare = require_compare();
  var eq = (a, b, loose) => compare(a, b, loose) < 0;
  cjsModule.exports = eq;
});
//@ chunk-bwbq4xvm.js:12291-12369 cjs-require-graph
var require_eq_3 = __commonJS(function (cjsExports, cjsModule) {
  var compare = require_compare();
  var eq = (a, b, loose) => compare(a, b, loose) === 0;
  cjsModule.exports = eq;
});
//@ chunk-bwbq4xvm.js:12369-12447 cjs-require-graph
var require_eq_4 = __commonJS(function (cjsExports, cjsModule) {
  var compare = require_compare();
  var eq = (a, b, loose) => compare(a, b, loose) !== 0;
  cjsModule.exports = eq;
});
//@ chunk-bwbq4xvm.js:12447-12524 cjs-require-graph
var require_eq_5 = __commonJS(function (cjsExports, cjsModule) {
  var compare = require_compare();
  var eq = (a, b, loose) => compare(a, b, loose) >= 0;
  cjsModule.exports = eq;
});
//@ chunk-bwbq4xvm.js:12524-12601 cjs-require-graph
var require_eq_6 = __commonJS(function (cjsExports, cjsModule) {
  var compare = require_compare();
  var eq = (a, b, loose) => compare(a, b, loose) <= 0;
  cjsModule.exports = eq;
});
export { require_eq_3, require_eq_4, require_eq, require_eq_5, require_eq_2, require_eq_6 };
