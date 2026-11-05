/**
 * semver/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../runtime/bun-runtime.js";
import { require_re } from "./internal/re.js";
import { require_constants } from "./internal/constants.js";
import { require_semver } from "./classes/semver.js";
import { require_identifiers } from "./internal/identifiers.js";
import {
  require_parse,
  require_parse_2,
  require_parse_3,
  require_parse_4,
  require_parse_5,
} from "./functions/parse.js";
import { require_valid_2 } from "./functions/valid.js";
import { require_clean } from "./functions/clean.js";
import { require_inc } from "./functions/inc.js";
import { require_diff } from "./functions/diff.js";
import { require_major } from "./functions/major.js";
import { require_minor } from "./functions/minor.js";
import { require_patch } from "./functions/patch.js";
import { require_prerelease } from "./functions/prerelease.js";
import { require_compare } from "./functions/compare.js";
import { require_compare_build } from "./functions/compare-build.js";
import { require_sort, require_sort_2 } from "./functions/sort.js";
import {
  require_eq,
  require_eq_2,
  require_eq_3,
  require_eq_4,
  require_eq_5,
  require_eq_6,
} from "./functions/eq.js";
import { require_cmp } from "./functions/cmp.js";
import { require_coerce } from "./functions/coerce.js";
import { require_comparator } from "./classes/comparator.js";
import { require_range } from "./classes/range.js";
import { require_satisfies } from "./functions/satisfies.js";
import { require_to_comparators } from "./ranges/to-comparators.js";
import { require_max_satisfying, require_max_satisfying_2 } from "./ranges/max-satisfying.js";
import { require_min_version } from "./ranges/min-version.js";
import { require_valid } from "./ranges/valid.js";
import { require_outside } from "./ranges/outside.js";
import { require_intersects } from "./ranges/intersects.js";
import { require_simplify } from "./ranges/simplify.js";
import { require_subset } from "./ranges/subset.js";

//@ chunk-7kayq7nc.js:26877-27840 cjs-fingerprint
var require_semver_3 = __commonJS(function (cjsExports, cjsModule) {
  var internalRe = require_re();
  var constants = require_constants();
  var SemVer = require_semver();
  var identifiers = require_identifiers();
  var parse = require_parse();
  var valid = require_valid_2();
  var clean = require_clean();
  var inc = require_inc();
  var diff = require_diff();
  var major = require_major();
  var minor = require_minor();
  var patch = require_patch();
  var prerelease = require_prerelease();
  var compare = require_compare();
  var rcompare = require_parse_2();
  var compareLoose = require_parse_3();
  var compareBuild = require_compare_build();
  var sort = require_sort();
  var rsort = require_sort_2();
  var gt = require_eq();
  var lt = require_eq_2();
  var eq = require_eq_3();
  var neq = require_eq_4();
  var gte = require_eq_5();
  var lte = require_eq_6();
  var cmp = require_cmp();
  var coerce = require_coerce();
  var Comparator = require_comparator();
  var Range = require_range();
  var satisfies = require_satisfies();
  var toComparators = require_to_comparators();
  var maxSatisfying = require_max_satisfying();
  var minSatisfying = require_max_satisfying_2();
  var minVersion = require_min_version();
  var validRange = require_valid();
  var outside = require_outside();
  var gtr = require_parse_4();
  var ltr = require_parse_5();
  var intersects = require_intersects();
  var simplifyRange = require_simplify();
  var subset = require_subset();
  cjsModule.exports = {
    parse,
    valid,
    clean,
    inc,
    diff,
    major,
    minor,
    patch,
    prerelease,
    compare,
    rcompare,
    compareLoose,
    compareBuild,
    sort,
    rsort,
    gt,
    lt,
    eq,
    neq,
    gte,
    lte,
    cmp,
    coerce,
    Comparator,
    Range,
    satisfies,
    toComparators,
    maxSatisfying,
    minSatisfying,
    minVersion,
    validRange,
    outside,
    gtr,
    ltr,
    intersects,
    simplifyRange,
    subset,
    SemVer,
    re: internalRe.re,
    src: internalRe.src,
    tokens: internalRe.t,
    SEMVER_SPEC_VERSION: constants.SEMVER_SPEC_VERSION,
    RELEASE_TYPES: constants.RELEASE_TYPES,
    compareIdentifiers: identifiers.compareIdentifiers,
    rcompareIdentifiers: identifiers.rcompareIdentifiers,
  };
});
export { require_semver_3 };
