/**
 * semver/functions/eq.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-bwbq4xvm.js (6)
 * attribution: cjs-require-graph 6
 */
import { x } from "../../../runtime/bun-runtime.js";
import { Z } from "./compare.js";

//@ chunk-bwbq4xvm.js:12139-12215 cjs-require-graph
var Tt = x(function (u2, $i) {
  var Bv = Z(),
    Gv = (e, s, n) => Bv(e, s, n) > 0;
  $i.exports = Gv;
});
//@ chunk-bwbq4xvm.js:12215-12291 cjs-require-graph
var us = x(function (p2, Qi) {
  var Hv = Z(),
    Kv = (e, s, n) => Hv(e, s, n) < 0;
  Qi.exports = Kv;
});
//@ chunk-bwbq4xvm.js:12291-12369 cjs-require-graph
var Nn = x(function (m2, Ji) {
  var Fv = Z(),
    Wv = (e, s, n) => Fv(e, s, n) === 0;
  Ji.exports = Wv;
});
//@ chunk-bwbq4xvm.js:12369-12447 cjs-require-graph
var Pn = x(function (_2, Zi) {
  var Yv = Z(),
    $v = (e, s, n) => Yv(e, s, n) !== 0;
  Zi.exports = $v;
});
//@ chunk-bwbq4xvm.js:12447-12524 cjs-require-graph
var ps = x(function (g2, el) {
  var Xv = Z(),
    Qv = (e, s, n) => Xv(e, s, n) >= 0;
  el.exports = Qv;
});
//@ chunk-bwbq4xvm.js:12524-12601 cjs-require-graph
var ms = x(function (f2, tl) {
  var Jv = Z(),
    Zv = (e, s, n) => Jv(e, s, n) <= 0;
  tl.exports = Zv;
});

export { Nn, Pn, Tt, ps, us, ms };
