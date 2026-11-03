/**
 * semver/ranges/max-satisfying.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-bwbq4xvm.js (2)
 * attribution: cjs-fingerprint 2
 */
import { x } from "../../../runtime/bun-runtime.js";
import { G } from "../classes/semver.js";
import { ee } from "../classes/range.js";

//@ chunk-bwbq4xvm.js:21935-22158 cjs-fingerprint
var wl = x(function (R2, Tl) {
  var xk = G(),
    Dk = ee(),
    Lk = (e, s, n) => {
      let r = null,
        a = null,
        l = null;
      try {
        l = new Dk(s, n);
      } catch (error) {
        return null;
      }
      return (
        e.forEach((c) => {
          if (l.test(c)) {
            if (!r || a.compare(c) === -1) ((r = c), (a = new xk(r, n)));
          }
        }),
        r
      );
    };
  Tl.exports = Lk;
});
//@ chunk-bwbq4xvm.js:22158-22380 cjs-fingerprint
var Al = x(function (v2, yl) {
  var Uk = G(),
    qk = ee(),
    Vk = (e, s, n) => {
      let r = null,
        a = null,
        l = null;
      try {
        l = new qk(s, n);
      } catch (error) {
        return null;
      }
      return (
        e.forEach((c) => {
          if (l.test(c)) {
            if (!r || a.compare(c) === 1) ((r = c), (a = new Uk(r, n)));
          }
        }),
        r
      );
    };
  yl.exports = Vk;
});

export { wl, Al };
