/**
 * semver/functions/compare-build.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_semver } from "../classes/semver.js";

//@ chunk-7kayq7nc.js:11903-12040 cjs-fingerprint
var require_compare_build = __commonJS(function (cjsExports, cjsModule) {
  var SemVer = require_semver();
  var compareBuild = (a, b, loose) => {
    let versionA = new SemVer(a, loose);
    let versionB = new SemVer(b, loose);
    return versionA.compare(versionB) || versionA.compareBuild(versionB);
  };
  cjsModule.exports = compareBuild;
});
export { require_compare_build };
