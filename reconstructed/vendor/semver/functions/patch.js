/**
 * semver/functions/patch.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { require_semver } from "../classes/semver.js";

//@ chunk-bwbq4xvm.js:11376-11456 cjs-fingerprint
var require_patch = x(function (cjsExports, cjsModule) {
  var SemVer = require_semver();
  var patch = (a, loose) => new SemVer(a, loose).patch;
  cjsModule.exports = patch;
});
export { require_patch };
