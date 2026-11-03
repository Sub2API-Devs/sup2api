/**
 * semver/functions/satisfies.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { ee } from "../classes/range.js";

//@ chunk-bwbq4xvm.js:21678-21798 cjs-require-graph
var Rt = x(function (y2, bl) {
  var Ik = ee(),
    Nk = (e, s, n) => {
      try {
        s = new Ik(s, n);
      } catch (error) {
        return !1;
      }
      return s.test(e);
    };
  bl.exports = Nk;
});

export { Rt };
