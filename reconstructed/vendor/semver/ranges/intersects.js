/**
 * semver/ranges/intersects.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { ee } from "../classes/range.js";

//@ chunk-bwbq4xvm.js:23951-24064 cjs-fingerprint
var Bl = x(function (N2, jl) {
  var Vl = ee(),
    sz = (e, s, n) => ((e = new Vl(e, n)), (s = new Vl(s, n)), e.intersects(s, n));
  jl.exports = sz;
});

export { Bl };
