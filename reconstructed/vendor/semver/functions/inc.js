/**
 * semver/functions/inc.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { G } from "../classes/semver.js";

//@ chunk-bwbq4xvm.js:10538-10738 cjs-fingerprint
var Ri = x(function (e2, Ai) {
  var yi = G(),
    Tv = (e, s, n, r, a) => {
      if (typeof n === "string") ((a = r), (r = n), (n = void 0));
      try {
        return new yi(e instanceof yi ? e.version : e, n).inc(s, r, a).version;
      } catch (error) {
        return null;
      }
    };
  Ai.exports = Tv;
});

export { Ri };
