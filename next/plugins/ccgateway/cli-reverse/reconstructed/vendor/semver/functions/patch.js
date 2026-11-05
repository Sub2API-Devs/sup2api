/**
 * semver/functions/patch.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_semver } from "../classes/semver.js";

//@ chunk-7kayq7nc.js:11450-11530 cjs-fingerprint
var require_patch = __commonJS(function (cjsExports, cjsModule) {
  var SemVer = require_semver();
  var patch = (a, loose) => new SemVer(a, loose).patch;
  cjsModule.exports = patch;
});
export { require_patch };
