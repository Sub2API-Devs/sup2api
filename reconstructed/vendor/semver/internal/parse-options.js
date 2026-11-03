/**
 * semver/internal/parse-options.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";

//@ chunk-bwbq4xvm.js:5373-5536 cjs-fingerprint
var as = x(function (Y$, hi) {
  var freeze = Object.freeze({ loose: !0 }),
    freeze_2 = Object.freeze({}),
    pv = (e) => {
      if (!e) return freeze_2;
      if (typeof e !== "object") return freeze;
      return e;
    };
  hi.exports = pv;
});

export { as };
