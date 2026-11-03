/**
 * semver/ranges/outside.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { G } from "../classes/semver.js";
import { yt } from "../classes/comparator.js";
import { ee } from "../classes/range.js";
import { Rt } from "../functions/satisfies.js";
import { Tt, us, ms, ps } from "../functions/eq.js";

//@ chunk-bwbq4xvm.js:23083-23793 cjs-fingerprint
var Es = x(function (C2, Ml) {
  var Kk = G(),
    Pl = yt(),
    { ANY: ANY } = Pl,
    Wk = ee(),
    Yk = Rt(),
    Il = Tt(),
    Nl = us(),
    $k = ms(),
    Xk = ps(),
    Qk = (e, s, n, r) => {
      ((e = new Kk(e, r)), (s = new Wk(s, r)));
      let a, l, c, h, m;
      switch (n) {
        case ">":
          ((a = Il), (l = $k), (c = Nl), (h = ">"), (m = ">="));
          break;
        case "<":
          ((a = Nl), (l = Xk), (c = Il), (h = "<"), (m = "<="));
          break;
        default:
          throw TypeError('Must provide a hilo val of "<" or ">"');
      }
      if (Yk(e, s, r)) return !1;
      for (let f = 0; f < s.set.length; ++f) {
        let w = s.set[f],
          z = null,
          I = null;
        if (
          (w.forEach((R) => {
            if (R.semver === ANY) R = new Pl(">=0.0.0");
            if (((z = z || R), (I = I || R), a(R.semver, z.semver, r))) z = R;
            else if (c(R.semver, I.semver, r)) I = R;
          }),
          z.operator === h || z.operator === m)
        )
          return !1;
        if ((!I.operator || I.operator === h) && l(e, I.semver)) return !1;
        else if (I.operator === m && c(e, I.semver)) return !1;
      }
      return !0;
    };
  Ml.exports = Qk;
});

export { Es };
