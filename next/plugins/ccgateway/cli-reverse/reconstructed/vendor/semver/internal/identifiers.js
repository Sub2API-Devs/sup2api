/**
 * semver/internal/identifiers.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";

//@ chunk-7kayq7nc.js:5610-5900 cjs-fingerprint
var require_identifiers = __commonJS(function (cjsExports, cjsModule) {
  var numeric = /^[0-9]+$/;
  var compareIdentifiers = (a, b) => {
    if (typeof a === "number" && typeof b === "number") return a === b ? 0 : a < b ? -1 : 1;
    let anum = numeric.test(a);
    let bnum = numeric.test(b);
    if (anum && bnum) {
      a = +a;
      b = +b;
    }
    return a === b ? 0 : anum && !bnum ? -1 : bnum && !anum ? 1 : a < b ? -1 : 1;
  };
  var rcompareIdentifiers = (a, b) => compareIdentifiers(b, a);
  cjsModule.exports = {
    compareIdentifiers,
    rcompareIdentifiers,
  };
});
export { require_identifiers };
