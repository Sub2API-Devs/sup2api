/**
 * commander/lib/suggestSimilar.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: commander@12.0.0
 * pieces: chunk-b7dyevzy.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";

//@ chunk-b7dyevzy.js:8871-9832 cjs-fingerprint
var U = x(function (At) {
  function Ot(t, e) {
    if (Math.abs(t.length - e.length) > 3) return Math.max(t.length, e.length);
    let i = [];
    for (let n = 0; n <= t.length; n++) i[n] = [n];
    for (let n = 0; n <= e.length; n++) i[0][n] = n;
    for (let n = 1; n <= e.length; n++)
      for (let s = 1; s <= t.length; s++) {
        let r = 1;
        if (t[s - 1] === e[n - 1]) r = 0;
        else r = 1;
        if (
          ((i[s][n] = Math.min(i[s - 1][n] + 1, i[s][n - 1] + 1, i[s - 1][n - 1] + r)),
          s > 1 && n > 1 && t[s - 1] === e[n - 2] && t[s - 2] === e[n - 1])
        )
          i[s][n] = Math.min(i[s][n], i[s - 2][n - 2] + 1);
      }
    return i[t.length][e.length];
  }
  function Ct(t, e) {
    if (!e || e.length === 0) return "";
    e = Array.from(new Set(e));
    let startsWith = t.startsWith("--");
    if (startsWith) ((t = t.slice(2)), (e = e.map((a) => a.slice(2))));
    let n = [],
      s = 3,
      r = 0.4;
    if (
      (e.forEach((a) => {
        if (a.length <= 1) return;
        let o = Ot(t, a),
          max = Math.max(t.length, a.length);
        if ((max - o) / max > r) {
          if (o < s) ((s = o), (n = [a]));
          else if (o === s) n.push(a);
        }
      }),
      n.sort((a, o) => a.localeCompare(o)),
      startsWith)
    )
      n = n.map((a) => `--${a}`);
    if (n.length > 1)
      return `
(Did you mean one of ${n.join(", ")}?)`;
    if (n.length === 1)
      return `
(Did you mean ${n[0]}?)`;
    return "";
  }
  At.suggestSimilar = Ct;
});

export { U };
