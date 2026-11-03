/**
 * semver/ranges/max-satisfying.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-bwbq4xvm.js (2)
 * attribution: cjs-fingerprint 2
 */
import { x } from "../../../runtime/bun-runtime.js";
import { require_semver } from "../classes/semver.js";
import { require_range } from "../classes/range.js";

//@ chunk-bwbq4xvm.js:21935-22158 cjs-fingerprint
var require_max_satisfying = x(function (cjsExports, cjsModule) {
  var SemVer = require_semver();
  var Range = require_range();
  var maxSatisfying = (versions, range, options) => {
    let max = null;
    let maxSV = null;
    let rangeObj = null;
    try {
      rangeObj = new Range(range, options);
    } catch (er) {
      return null;
    }
    versions.forEach((v) => {
      if (rangeObj.test(v)) {
        if (!max || maxSV.compare(v) === -1) {
          max = v;
          maxSV = new SemVer(max, options);
        }
      }
    });
    return max;
  };
  cjsModule.exports = maxSatisfying;
});
//@ chunk-bwbq4xvm.js:22158-22380 cjs-fingerprint
var require_max_satisfying_2 = x(function (cjsExports, cjsModule) {
  var SemVer = require_semver();
  var Range = require_range();
  var maxSatisfying = (versions, range, options) => {
    let max = null;
    let maxSV = null;
    let rangeObj = null;
    try {
      rangeObj = new Range(range, options);
    } catch (er) {
      return null;
    }
    versions.forEach((v) => {
      if (rangeObj.test(v)) {
        if (!max || maxSV.compare(v) === 1) {
          max = v;
          maxSV = new SemVer(max, options);
        }
      }
    });
    return max;
  };
  cjsModule.exports = maxSatisfying;
});
export { require_max_satisfying, require_max_satisfying_2 };
