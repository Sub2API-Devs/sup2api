/**
 * semver/ranges/min-version.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { G } from "../classes/semver.js";
import { ee } from "../classes/range.js";
import { Tt } from "../functions/eq.js";

//@ chunk-bwbq4xvm.js:22380-22962 cjs-fingerprint
var kl = x(function (k2, vl) {
  var Ln = G(),
    jk = ee(),
    Rl = Tt(),
    Bk = (e, s) => {
      e = new jk(e, s);
      let n = new Ln("0.0.0");
      if (e.test(n)) return n;
      if (((n = new Ln("0.0.0-0")), e.test(n))) return n;
      n = null;
      for (let r = 0; r < e.set.length; ++r) {
        let a = e.set[r],
          l = null;
        if (
          (a.forEach((c) => {
            let h = new Ln(c.semver.version);
            switch (c.operator) {
              case ">":
                if (h.prerelease.length === 0) h.patch++;
                else h.prerelease.push(0);
                h.raw = h.format();
              case "":
              case ">=":
                if (!l || Rl(h, l)) l = h;
                break;
              case "<":
              case "<=":
                break;
              default:
                throw Error(`Unexpected operation: ${c.operator}`);
            }
          }),
          l && (!n || Rl(n, l)))
        )
          n = l;
      }
      if (n && e.test(n)) return n;
      return null;
    };
  vl.exports = Bk;
});

export { kl };
