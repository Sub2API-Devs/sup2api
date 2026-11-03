/**
 * semver/internal/identifiers.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";

//@ chunk-bwbq4xvm.js:5536-5826 cjs-fingerprint
var Cn = x(function ($$, mi) {
  var ui = /^[0-9]+$/,
    pi = (e, s) => {
      if (typeof e === "number" && typeof s === "number") return e === s ? 0 : e < s ? -1 : 1;
      let matches = ui.test(e),
        matches_2 = ui.test(s);
      if (matches && matches_2) ((e = +e), (s = +s));
      return e === s ? 0 : matches && !matches_2 ? -1 : matches_2 && !matches ? 1 : e < s ? -1 : 1;
    },
    mv = (e, s) => pi(s, e);
  mi.exports = { compareIdentifiers: pi, rcompareIdentifiers: mv };
});

export { Cn };
