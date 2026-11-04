/**
 * semver/ranges/simplify.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_satisfies } from "../functions/satisfies.js";
import { require_compare } from "../functions/compare.js";

//@ chunk-bwbq4xvm.js:24064-24544 cjs-fingerprint
var require_simplify = __commonJS(function (cjsExports, cjsModule) {
  var satisfies = require_satisfies();
  var compare = require_compare();
  cjsModule.exports = (versions, range, options) => {
    let set = [];
    let first = null;
    let prev = null;
    let v = versions.sort((a, b) => compare(a, b, options));
    for (let version of v)
      if (satisfies(version, range, options)) {
        prev = version;
        if (!first) first = version;
      } else {
        if (prev) set.push([first, prev]);
        prev = null;
        first = null;
      }
    if (first) set.push([first, null]);
    let ranges = [];
    for (let [min, max] of set)
      if (min === max) ranges.push(min);
      else if (!max && min === v[0]) ranges.push("*");
      else if (!max) ranges.push(`>=${min}`);
      else if (min === v[0]) ranges.push(`<=${max}`);
      else ranges.push(`${min} - ${max}`);
    let simplified = ranges.join(" || ");
    let original = typeof range.raw === "string" ? range.raw : String(range);
    return simplified.length < original.length ? simplified : range;
  };
});
export { require_simplify };
