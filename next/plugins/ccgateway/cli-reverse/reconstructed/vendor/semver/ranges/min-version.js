/**
 * semver/ranges/min-version.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_semver } from "../classes/semver.js";
import { require_range } from "../classes/range.js";
import { require_eq } from "../functions/eq.js";

//@ chunk-7kayq7nc.js:22463-23045 cjs-fingerprint
var require_min_version = __commonJS(function (cjsExports, cjsModule) {
  var SemVer = require_semver();
  var Range = require_range();
  var gt = require_eq();
  var minVersion = (range, loose) => {
    range = new Range(range, loose);
    let minver = new SemVer("0.0.0");
    if (range.test(minver)) return minver;
    minver = new SemVer("0.0.0-0");
    if (range.test(minver)) return minver;
    minver = null;
    for (let i = 0; i < range.set.length; ++i) {
      let comparators = range.set[i];
      let setMin = null;
      comparators.forEach((comparator) => {
        let compver = new SemVer(comparator.semver.version);
        switch (comparator.operator) {
          case ">":
            if (compver.prerelease.length === 0) compver.patch++;
            else compver.prerelease.push(0);
            compver.raw = compver.format();
          case "":
          case ">=":
            if (!setMin || gt(compver, setMin)) setMin = compver;
            break;
          case "<":
          case "<=":
            break;
          default:
            throw Error(`Unexpected operation: ${comparator.operator}`);
        }
      });
      if (setMin && (!minver || gt(minver, setMin))) minver = setMin;
    }
    if (minver && range.test(minver)) return minver;
    return null;
  };
  cjsModule.exports = minVersion;
});
export { require_min_version };
