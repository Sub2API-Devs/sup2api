/**
 * semver/functions/compare-build.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { G } from "../classes/semver.js";

//@ chunk-bwbq4xvm.js:11826-11963 cjs-fingerprint
var hs = x(function (d2, Hi) {
  var Gi = G(),
    Lv = (e, s, n) => {
      let r = new Gi(e, n),
        a = new Gi(s, n);
      return r.compare(a) || r.compareBuild(a);
    };
  Hi.exports = Lv;
});

export { hs };
