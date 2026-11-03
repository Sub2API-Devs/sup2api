/**
 * semver/functions/compare-build.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { require_semver } from "../classes/semver.js";

//@ chunk-bwbq4xvm.js:11826-11963 cjs-fingerprint
var require_compare_build = x(function (cjsExports, cjsModule) {
  var SemVer = require_semver();
  var compareBuild = (a_2, b, loose) => {
    let versionA = new SemVer(a_2, loose);
    let versionB = new SemVer(b, loose);
    return versionA.compare(versionB) || versionA.compareBuild(versionB);
  };
  cjsModule.exports = compareBuild;
});
export { require_compare_build };
