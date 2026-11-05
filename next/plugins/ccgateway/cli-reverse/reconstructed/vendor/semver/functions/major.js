/**
 * semver/functions/major.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_semver } from "../classes/semver.js";

//@ chunk-7kayq7nc.js:11290-11370 cjs-fingerprint
var require_major = __commonJS(function (cjsExports, cjsModule) {
  var SemVer = require_semver();
  var major = (a, loose) => new SemVer(a, loose).major;
  cjsModule.exports = major;
});
export { require_major };
