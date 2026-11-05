/**
 * semver/functions/diff.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_parse } from "./parse.js";

//@ chunk-7kayq7nc.js:10812-11290 cjs-fingerprint
var require_diff = __commonJS(function (cjsExports, cjsModule) {
  var parse = require_parse();
  var diff = (version1, version2) => {
    let v1 = parse(version1, null, true);
    let v2 = parse(version2, null, true);
    let comparison = v1.compare(v2);
    if (comparison === 0) return null;
    let v1Higher = comparison > 0;
    let highVersion = v1Higher ? v1 : v2;
    let lowVersion = v1Higher ? v2 : v1;
    let highHasPre = !!highVersion.prerelease.length;
    if (!!lowVersion.prerelease.length && !highHasPre) {
      if (!lowVersion.patch && !lowVersion.minor) return "major";
      if (lowVersion.compareMain(highVersion) === 0) {
        if (lowVersion.minor && !lowVersion.patch) return "minor";
        return "patch";
      }
    }
    let prefix = highHasPre ? "pre" : "";
    if (v1.major !== v2.major) return prefix + "major";
    if (v1.minor !== v2.minor) return prefix + "minor";
    if (v1.patch !== v2.patch) return prefix + "patch";
    return "prerelease";
  };
  cjsModule.exports = diff;
});
export { require_diff };
