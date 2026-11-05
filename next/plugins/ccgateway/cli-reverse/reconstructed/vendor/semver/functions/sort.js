/**
 * semver/functions/sort.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-7kayq7nc.js (2)
 * attribution: cjs-require-graph 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_compare_build } from "./compare-build.js";

//@ chunk-7kayq7nc.js:12040-12128 cjs-require-graph
var require_sort = __commonJS(function (cjsExports, cjsModule) {
  var compareBuild = require_compare_build();
  var sort = (list, loose) => list.sort((a, b) => compareBuild(a, b, loose));
  cjsModule.exports = sort;
});
//@ chunk-7kayq7nc.js:12128-12216 cjs-require-graph
var require_sort_2 = __commonJS(function (cjsExports, cjsModule) {
  var compareBuild = require_compare_build();
  var sort = (list, loose) => list.sort((left, right) => compareBuild(right, left, loose));
  cjsModule.exports = sort;
});
export { require_sort, require_sort_2 };
