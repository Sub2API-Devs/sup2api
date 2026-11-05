/**
 * semver/internal/constants.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";

//@ chunk-7kayq7nc.js:1484-1822 cjs-fingerprint
var require_constants = __commonJS(function (cjsExports, cjsModule) {
  var MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || 9007199254740991;
  var RELEASE_TYPES = ["major", "premajor", "minor", "preminor", "patch", "prepatch", "prerelease"];
  cjsModule.exports = {
    MAX_LENGTH: 256,
    MAX_SAFE_COMPONENT_LENGTH: 16,
    MAX_SAFE_BUILD_LENGTH: 250,
    MAX_SAFE_INTEGER,
    RELEASE_TYPES,
    SEMVER_SPEC_VERSION: "2.0.0",
    FLAG_INCLUDE_PRERELEASE: 1,
    FLAG_LOOSE: 2,
  };
});
export { require_constants };
