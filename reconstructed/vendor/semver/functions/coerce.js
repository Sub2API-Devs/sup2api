/**
 * semver/functions/coerce.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { require_semver } from "../classes/semver.js";
import { require_parse } from "./parse.js";
import { require_re } from "../internal/re.js";

//@ chunk-bwbq4xvm.js:13126-13833 cjs-fingerprint
var require_coerce = x(function (cjsExports, cjsModule) {
  var SemVer = require_semver();
  var parse = require_parse();
  var { safeRe: re, t } = require_re();
  var coerce = (version, options) => {
    if (version instanceof SemVer) return version;
    if (typeof version === "number") version = String(version);
    if (typeof version !== "string") return null;
    options = options || {};
    let match = null;
    if (!options.rtl) match = version.match(options.includePrerelease ? re[t.COERCEFULL] : re[t.COERCE]);
    else {
      let coerceRtlRegex = options.includePrerelease ? re[t.COERCERTLFULL] : re[t.COERCERTL];
      let next;
      while (
        (next = coerceRtlRegex.exec(version)) &&
        (!match || match.index + match[0].length !== version.length)
      ) {
        if (!match || next.index + next[0].length !== match.index + match[0].length) match = next;
        coerceRtlRegex.lastIndex = next.index + next[1].length + next[2].length;
      }
      coerceRtlRegex.lastIndex = -1;
    }
    if (match === null) return null;
    let major = match[2];
    let minor = match[3] || "0";
    let patch = match[4] || "0";
    let prerelease = options.includePrerelease && match[5] ? `-${match[5]}` : "";
    let build = options.includePrerelease && match[6] ? `+${match[6]}` : "";
    return parse(`${major}.${minor}.${patch}${prerelease}${build}`, options);
  };
  cjsModule.exports = coerce;
});
export { require_coerce };
