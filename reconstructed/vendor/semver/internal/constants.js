/**
 * semver/internal/constants.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";

//@ chunk-bwbq4xvm.js:1410-1748 cjs-fingerprint
var Et = x(function (F$, li) {
  var ZR = Number.MAX_SAFE_INTEGER || 9007199254740991,
    ev = ["major", "premajor", "minor", "preminor", "patch", "prepatch", "prerelease"];
  li.exports = {
    MAX_LENGTH: 256,
    MAX_SAFE_COMPONENT_LENGTH: 16,
    MAX_SAFE_BUILD_LENGTH: 250,
    MAX_SAFE_INTEGER: ZR,
    RELEASE_TYPES: ev,
    SEMVER_SPEC_VERSION: "2.0.0",
    FLAG_INCLUDE_PRERELEASE: 1,
    FLAG_LOOSE: 2,
  };
});

export { Et };
