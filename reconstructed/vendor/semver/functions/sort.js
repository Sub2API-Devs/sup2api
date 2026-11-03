/**
 * semver/functions/sort.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-bwbq4xvm.js (2)
 * attribution: cjs-require-graph 2
 */
import { x } from "../../../runtime/bun-runtime.js";
import { hs } from "./compare-build.js";

//@ chunk-bwbq4xvm.js:11963-12051 cjs-require-graph
var Fi = x(function (c2, Ki) {
  var Uv = hs(),
    qv = (e, s) => e.sort((n, r) => Uv(n, r, s));
  Ki.exports = qv;
});
//@ chunk-bwbq4xvm.js:12051-12139 cjs-require-graph
var Yi = x(function (h2, Wi) {
  var Vv = hs(),
    jv = (e, s) => e.sort((n, r) => Vv(r, n, s));
  Wi.exports = jv;
});

export { Fi, Yi };
