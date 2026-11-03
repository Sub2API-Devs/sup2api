/**
 * semver/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";
import { Ye } from "./internal/re.js";
import { Et } from "./internal/constants.js";
import { G } from "./classes/semver.js";
import { Cn } from "./internal/identifiers.js";
import { ze, Vi, Bi, Dl, ql } from "./functions/parse.js";
import { Si } from "./functions/valid.js";
import { wi } from "./functions/clean.js";
import { Ri } from "./functions/inc.js";
import { zi } from "./functions/diff.js";
import { Oi } from "./functions/major.js";
import { Ni } from "./functions/minor.js";
import { Mi } from "./functions/patch.js";
import { Di } from "./functions/prerelease.js";
import { Z } from "./functions/compare.js";
import { hs } from "./functions/compare-build.js";
import { Fi, Yi } from "./functions/sort.js";
import { Tt, us, Nn, Pn, ps, ms } from "./functions/eq.js";
import { Mn } from "./functions/cmp.js";
import { rl } from "./functions/coerce.js";
import { yt } from "./classes/comparator.js";
import { ee } from "./classes/range.js";
import { Rt } from "./functions/satisfies.js";
import { Sl } from "./ranges/to-comparators.js";
import { wl, Al } from "./ranges/max-satisfying.js";
import { kl } from "./ranges/min-version.js";
import { Cl } from "./ranges/valid.js";
import { Es } from "./ranges/outside.js";
import { Bl } from "./ranges/intersects.js";
import { Hl } from "./ranges/simplify.js";
import { Xl } from "./ranges/subset.js";

//@ chunk-bwbq4xvm.js:26792-27754 cjs-fingerprint
var Vy = x(function (x2, Ql) {
  var $e = Ye(),
    Ts = Et(),
    lz = G(),
    ws = Cn(),
    dz = ze(),
    cz = Si(),
    hz = wi(),
    uz = Ri(),
    pz = zi(),
    mz = Oi(),
    _z = Ni(),
    gz = Mi(),
    fz = Di(),
    bz = Z(),
    Ez = Vi(),
    Sz = Bi(),
    Tz = hs(),
    wz = Fi(),
    yz = Yi(),
    Az = Tt(),
    Rz = us(),
    vz = Nn(),
    kz = Pn(),
    zz = ps(),
    Cz = ms(),
    Oz = Mn(),
    Iz = rl(),
    Nz = yt(),
    Pz = ee(),
    Mz = Rt(),
    xz = Sl(),
    Dz = wl(),
    Lz = Al(),
    Uz = kl(),
    qz = Cl(),
    Vz = Es(),
    jz = Dl(),
    Bz = ql(),
    Gz = Bl(),
    Hz = Hl(),
    Kz = Xl();
  Ql.exports = {
    parse: dz,
    valid: cz,
    clean: hz,
    inc: uz,
    diff: pz,
    major: mz,
    minor: _z,
    patch: gz,
    prerelease: fz,
    compare: bz,
    rcompare: Ez,
    compareLoose: Sz,
    compareBuild: Tz,
    sort: wz,
    rsort: yz,
    gt: Az,
    lt: Rz,
    eq: vz,
    neq: kz,
    gte: zz,
    lte: Cz,
    cmp: Oz,
    coerce: Iz,
    Comparator: Nz,
    Range: Pz,
    satisfies: Mz,
    toComparators: xz,
    maxSatisfying: Dz,
    minSatisfying: Lz,
    minVersion: Uz,
    validRange: qz,
    outside: Vz,
    gtr: jz,
    ltr: Bz,
    intersects: Gz,
    simplifyRange: Hz,
    subset: Kz,
    SemVer: lz,
    re: $e.re,
    src: $e.src,
    tokens: $e.t,
    SEMVER_SPEC_VERSION: Ts.SEMVER_SPEC_VERSION,
    RELEASE_TYPES: Ts.RELEASE_TYPES,
    compareIdentifiers: ws.compareIdentifiers,
    rcompareIdentifiers: ws.rcompareIdentifiers,
  };
});

export { Vy };
