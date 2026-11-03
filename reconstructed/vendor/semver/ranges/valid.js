/**
 * semver/ranges/valid.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { ee } from "../classes/range.js";

//@ chunk-bwbq4xvm.js:22962-23083 cjs-require-graph
var Cl = x(function (z2, zl) {
  var Gk = ee(),
    Hk = (e, s) => {
      try {
        return new Gk(e, s).range || "*";
      } catch (error) {
        return null;
      }
    };
  zl.exports = Hk;
});

export { Cl };
