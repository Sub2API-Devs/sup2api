/**
 * semver/functions/coerce.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { G } from "../classes/semver.js";
import { ze } from "./parse.js";
import { Ye } from "../internal/re.js";

//@ chunk-bwbq4xvm.js:13126-13833 cjs-fingerprint
var rl = x(function (E2, nl) {
  var ik = G(),
    lk = ze(),
    { safeRe: safeRe, t: gs } = Ye(),
    dk = (e, s) => {
      if (e instanceof ik) return e;
      if (typeof e === "number") e = String(e);
      if (typeof e !== "string") return null;
      s = s || {};
      let n = null;
      if (!s.rtl) n = e.match(s.includePrerelease ? safeRe[gs.COERCEFULL] : safeRe[gs.COERCE]);
      else {
        let m = s.includePrerelease ? safeRe[gs.COERCERTLFULL] : safeRe[gs.COERCERTL],
          f;
        while ((f = m.exec(e)) && (!n || n.index + n[0].length !== e.length)) {
          if (!n || f.index + f[0].length !== n.index + n[0].length) n = f;
          m.lastIndex = f.index + f[1].length + f[2].length;
        }
        m.lastIndex = -1;
      }
      if (n === null) return null;
      let r = n[2],
        a = n[3] || "0",
        l = n[4] || "0",
        c = s.includePrerelease && n[5] ? `-${n[5]}` : "",
        h = s.includePrerelease && n[6] ? `+${n[6]}` : "";
      return lk(`${r}.${a}.${l}${c}${h}`, s);
    };
  nl.exports = dk;
});

export { rl };
