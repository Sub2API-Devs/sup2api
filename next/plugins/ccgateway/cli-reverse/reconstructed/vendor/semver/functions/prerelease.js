/**
 * semver/functions/prerelease.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_parse } from "./parse.js";

//@ chunk-bwbq4xvm.js:11456-11583 cjs-fingerprint
var require_prerelease = __commonJS(function (cjsExports, cjsModule) {
  var parse = require_parse();
  var prerelease = (version, options) => {
    let parsed = parse(version, options);
    return parsed && parsed.prerelease.length ? parsed.prerelease : null;
  };
  cjsModule.exports = prerelease;
});
export { require_prerelease };
