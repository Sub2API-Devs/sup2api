/**
 * semver/functions/compare.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { G } from "../classes/semver.js";

//@ chunk-bwbq4xvm.js:11583-11679 cjs-fingerprint
var Z = x(function (a2, Ui) {
  var Li = G(),
    Nv = (e, s, n) => new Li(e, n).compare(new Li(s, n));
  Ui.exports = Nv;
});

export { Z };
