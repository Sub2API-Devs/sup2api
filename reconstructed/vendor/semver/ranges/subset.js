/**
 * semver/ranges/subset.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { ee } from "../classes/range.js";
import { yt } from "../classes/comparator.js";
import { Rt } from "../functions/satisfies.js";
import { Z } from "../functions/compare.js";

//@ chunk-bwbq4xvm.js:24544-26792 cjs-fingerprint
var Xl = x(function (M2, $l) {
  var Kl = ee(),
    qn = yt(),
    { ANY: ANY } = qn,
    vt = Rt(),
    Vn = Z(),
    oz = (e, s, n = {}) => {
      if (e === s) return !0;
      ((e = new Kl(e, n)), (s = new Kl(s, n)));
      let r = !1;
      e: for (let a of e.set) {
        for (let l of s.set) {
          let c = iz(a, l, n);
          if (((r = r || c !== null), c)) continue e;
        }
        if (r) return !1;
      }
      return !0;
    },
    az = [new qn(">=0.0.0-0")],
    Fl = [new qn(">=0.0.0")],
    iz = (e, s, n) => {
      if (e === s) return !0;
      if (e.length === 1 && e[0].semver === ANY)
        if (s.length === 1 && s[0].semver === ANY) return !0;
        else if (n.includePrerelease) e = az;
        else e = Fl;
      if (s.length === 1 && s[0].semver === ANY)
        if (n.includePrerelease) return !0;
        else s = Fl;
      let r = new Set(),
        a,
        l;
      for (let R of e)
        if (R.operator === ">" || R.operator === ">=") a = Wl(a, R, n);
        else if (R.operator === "<" || R.operator === "<=") l = Yl(l, R, n);
        else r.add(R.semver);
      if (r.size > 1) return null;
      let c;
      if (a && l) {
        if (((c = Vn(a.semver, l.semver, n)), c > 0)) return null;
        else if (c === 0 && (a.operator !== ">=" || l.operator !== "<=")) return null;
      }
      for (let R of r) {
        if (a && !vt(R, String(a), n)) return null;
        if (l && !vt(R, String(l), n)) return null;
        for (let xR of s) if (!vt(R, String(xR), n)) return !1;
        return !0;
      }
      let h,
        m,
        f,
        w,
        z = l && !n.includePrerelease && l.semver.prerelease.length ? l.semver : !1,
        I = a && !n.includePrerelease && a.semver.prerelease.length ? a.semver : !1;
      if (z && z.prerelease.length === 1 && l.operator === "<" && z.prerelease[0] === 0) z = !1;
      for (let R of s) {
        if (
          ((w = w || R.operator === ">" || R.operator === ">="),
          (f = f || R.operator === "<" || R.operator === "<="),
          a)
        ) {
          if (I) {
            if (
              R.semver.prerelease &&
              R.semver.prerelease.length &&
              R.semver.major === I.major &&
              R.semver.minor === I.minor &&
              R.semver.patch === I.patch
            )
              I = !1;
          }
          if (R.operator === ">" || R.operator === ">=") {
            if (((h = Wl(a, R, n)), h === R && h !== a)) return !1;
          } else if (a.operator === ">=" && !vt(a.semver, String(R), n)) return !1;
        }
        if (l) {
          if (z) {
            if (
              R.semver.prerelease &&
              R.semver.prerelease.length &&
              R.semver.major === z.major &&
              R.semver.minor === z.minor &&
              R.semver.patch === z.patch
            )
              z = !1;
          }
          if (R.operator === "<" || R.operator === "<=") {
            if (((m = Yl(l, R, n)), m === R && m !== l)) return !1;
          } else if (l.operator === "<=" && !vt(l.semver, String(R), n)) return !1;
        }
        if (!R.operator && (l || a) && c !== 0) return !1;
      }
      if (a && f && !l && c !== 0) return !1;
      if (l && w && !a && c !== 0) return !1;
      if (I || z) return !1;
      return !0;
    },
    Wl = (e, s, n) => {
      if (!e) return s;
      let r = Vn(e.semver, s.semver, n);
      return r > 0 ? e : r < 0 ? s : s.operator === ">" && e.operator === ">=" ? s : e;
    },
    Yl = (e, s, n) => {
      if (!e) return s;
      let r = Vn(e.semver, s.semver, n);
      return r < 0 ? e : r > 0 ? s : s.operator === "<" && e.operator === "<=" ? s : e;
    };
  $l.exports = oz;
});

export { Xl };
