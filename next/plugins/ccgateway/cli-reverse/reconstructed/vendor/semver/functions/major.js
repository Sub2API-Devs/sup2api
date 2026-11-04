/**
 * semver/functions/major.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_semver } from "../classes/semver.js";

//@ chunk-bwbq4xvm.js:11216-11296 cjs-fingerprint
var require_major = __commonJS(function (cjsExports, cjsModule) {
  var SemVer = require_semver();
  var major = (a, loose) => new SemVer(a, loose).major;
  cjsModule.exports = major;
});
export { require_major };
