/**
 * semver/ranges/simplify.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { Rt } from "../functions/satisfies.js";
import { Z } from "../functions/compare.js";

//@ chunk-bwbq4xvm.js:24064-24544 cjs-fingerprint
var Hl = x(function (P2, Gl) {
  var nz = Rt(),
    rz = Z();
  Gl.exports = (e, s, n) => {
    let r = [],
      a = null,
      l = null,
      sorted = e.sort((w, z) => rz(w, z, n));
    for (let w of sorted)
      if (nz(w, s, n)) {
        if (((l = w), !a)) a = w;
      } else {
        if (l) r.push([a, l]);
        ((l = null), (a = null));
      }
    if (a) r.push([a, null]);
    let h = [];
    for (let [w, z] of r)
      if (w === z) h.push(w);
      else if (!z && w === sorted[0]) h.push("*");
      else if (!z) h.push(`>=${w}`);
      else if (w === sorted[0]) h.push(`<=${z}`);
      else h.push(`${w} - ${z}`);
    let joined = h.join(" || "),
      f = typeof s.raw === "string" ? s.raw : String(s);
    return joined.length < f.length ? joined : s;
  };
});

export { Hl };
