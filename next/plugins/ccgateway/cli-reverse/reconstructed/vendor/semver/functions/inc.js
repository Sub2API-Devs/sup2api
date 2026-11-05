/**
 * semver/functions/inc.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_semver } from "../classes/semver.js";

//@ chunk-7kayq7nc.js:10612-10812 cjs-fingerprint
var require_inc = __commonJS(function (cjsExports, cjsModule) {
  var SemVer = require_semver();
  var inc = (version, release, options, identifier, identifierBase) => {
    if (typeof options === "string") {
      identifierBase = identifier;
      identifier = options;
      options = undefined;
    }
    try {
      return new SemVer(version instanceof SemVer ? version.version : version, options).inc(
        release,
        identifier,
        identifierBase,
      ).version;
    } catch (er) {
      return null;
    }
  };
  cjsModule.exports = inc;
});
export { require_inc };
