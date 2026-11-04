/**
 * semver/functions/sort.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-bwbq4xvm.js (2)
 * attribution: cjs-require-graph 2
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_compare_build } from "./compare-build.js";

//@ chunk-bwbq4xvm.js:11963-12051 cjs-require-graph
var require_sort = __commonJS(function (cjsExports, cjsModule) {
  var compareBuild = require_compare_build();
  var sort = (list, loose) => list.sort((a, b) => compareBuild(a, b, loose));
  cjsModule.exports = sort;
});
//@ chunk-bwbq4xvm.js:12051-12139 cjs-require-graph
var require_sort_2 = __commonJS(function (cjsExports, cjsModule) {
  var compareBuild = require_compare_build();
  var sort = (list, loose) => list.sort((left, right) => compareBuild(right, left, loose));
  cjsModule.exports = sort;
});
export { require_sort, require_sort_2 };
