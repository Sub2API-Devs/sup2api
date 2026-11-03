/**
 * semver/functions/cmp.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { Nn, Pn, Tt, ps, us, ms } from "./eq.js";

//@ chunk-bwbq4xvm.js:12601-13126 cjs-fingerprint
var Mn = x(function (b2, sl) {
  var ek = Nn(),
    tk = Pn(),
    sk = Tt(),
    nk = ps(),
    rk = us(),
    ok = ms(),
    ak = (e, s, n, r) => {
      switch (s) {
        case "===":
          if (typeof e === "object") e = e.version;
          if (typeof n === "object") n = n.version;
          return e === n;
        case "!==":
          if (typeof e === "object") e = e.version;
          if (typeof n === "object") n = n.version;
          return e !== n;
        case "":
        case "=":
        case "==":
          return ek(e, n, r);
        case "!=":
          return tk(e, n, r);
        case ">":
          return sk(e, n, r);
        case ">=":
          return nk(e, n, r);
        case "<":
          return rk(e, n, r);
        case "<=":
          return ok(e, n, r);
        default:
          throw TypeError(`Invalid operator: ${s}`);
      }
    };
  sl.exports = ak;
});

export { Mn };
