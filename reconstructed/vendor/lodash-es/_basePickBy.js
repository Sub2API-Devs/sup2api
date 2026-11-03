/**
 * lodash-es/_basePickBy.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-3a1caa6f.js (1)
 * attribution: placement 1
 */
import { Out, Qve } from "../@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { T } from "../../src/utils/git/gitSafeEnv.js";

//@ chunk-3a1caa6f.js:1544-1657 placement
function basePickBy(e, r, n) {
  var o = -1,
    i = r.length,
    s = {};
  while (++o < i) {
    var a = r[o],
      t = Out(e, a);
    if (n(t, a)) T(s, Qve(a, e), t);
  }
  return s;
}

export { basePickBy };
