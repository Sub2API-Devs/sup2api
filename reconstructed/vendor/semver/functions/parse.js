/**
 * semver/functions/parse.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-bwbq4xvm.js (5)
 * attribution: cjs-require-graph 5
 */
import { x } from "../../../runtime/bun-runtime.js";
import { G } from "../classes/semver.js";
import { Z } from "./compare.js";
import { Es } from "../ranges/outside.js";

//@ chunk-bwbq4xvm.js:10148-10304 cjs-require-graph
var ze = x(function (Q$, bi) {
  var fi = G(),
    gv = (e, s, n = !1) => {
      if (e instanceof fi) return e;
      try {
        return new fi(e, s);
      } catch (error) {
        if (!n) return null;
        throw error;
      }
    };
  bi.exports = gv;
});
//@ chunk-bwbq4xvm.js:11679-11753 cjs-require-graph
var Vi = x(function (i2, qi) {
  var Pv = Z(),
    Mv = (e, s, n) => Pv(s, e, n);
  qi.exports = Mv;
});
//@ chunk-bwbq4xvm.js:11753-11826 cjs-require-graph
var Bi = x(function (l2, ji) {
  var xv = Z(),
    Dv = (e, s) => xv(e, s, !0);
  ji.exports = Dv;
});
//@ chunk-bwbq4xvm.js:23793-23872 cjs-require-graph
var Dl = x(function (O2, xl) {
  var Jk = Es(),
    Zk = (e, s, n) => Jk(e, s, ">", n);
  xl.exports = Zk;
});
//@ chunk-bwbq4xvm.js:23872-23951 cjs-require-graph
var ql = x(function (I2, Ll) {
  var ez = Es(),
    tz = (e, s, n) => ez(e, s, "<", n);
  Ll.exports = tz;
});

export { ze, Vi, Bi, Dl, ql };
