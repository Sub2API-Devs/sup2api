/**
 * semver/ranges/outside.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_semver } from "../classes/semver.js";
import { require_comparator } from "../classes/comparator.js";
import { require_range } from "../classes/range.js";
import { require_satisfies } from "../functions/satisfies.js";
import { require_eq, require_eq_2, require_eq_6, require_eq_5 } from "../functions/eq.js";

//@ chunk-7kayq7nc.js:23166-23876 cjs-fingerprint
var require_outside = __commonJS(function (cjsExports, cjsModule) {
  var SemVer = require_semver();
  var Comparator = require_comparator();
  var { ANY } = Comparator;
  var Range = require_range();
  var satisfies = require_satisfies();
  var gt = require_eq();
  var lt = require_eq_2();
  var lte = require_eq_6();
  var gte = require_eq_5();
  var outside = (version, range, hilo, options) => {
    version = new SemVer(version, options);
    range = new Range(range, options);
    let gtfn;
    let ltefn;
    let ltfn;
    let comp;
    let ecomp;
    switch (hilo) {
      case ">":
        gtfn = gt;
        ltefn = lte;
        ltfn = lt;
        comp = ">";
        ecomp = ">=";
        break;
      case "<":
        gtfn = lt;
        ltefn = gte;
        ltfn = gt;
        comp = "<";
        ecomp = "<=";
        break;
      default:
        throw TypeError('Must provide a hilo val of "<" or ">"');
    }
    if (satisfies(version, range, options)) return false;
    for (let i = 0; i < range.set.length; ++i) {
      let comparators = range.set[i];
      let high = null;
      let low = null;
      comparators.forEach((comparator) => {
        if (comparator.semver === ANY) comparator = new Comparator(">=0.0.0");
        high = high || comparator;
        low = low || comparator;
        if (gtfn(comparator.semver, high.semver, options)) high = comparator;
        else if (ltfn(comparator.semver, low.semver, options)) low = comparator;
      });
      if (high.operator === comp || high.operator === ecomp) return false;
      if ((!low.operator || low.operator === comp) && ltefn(version, low.semver)) return false;
      else if (low.operator === ecomp && ltfn(version, low.semver)) return false;
    }
    return true;
  };
  cjsModule.exports = outside;
});
export { require_outside };
