/**
 * lodash-es/_baseSet.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-3a1caa6f.js (1)
 * attribution: placement 1
 */
import {
  RR,
  Qve,
  Ihe,
  Put,
} from "../@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { Dut } from "../../src/utils/git/gitSafeEnv.js";

//@ chunk-3a1caa6f.js:1241-1536 placement
function baseSet(e, r, n, o) {
  if (!RR(e)) return e;
  r = Qve(r, e);
  var i = -1,
    s = r.length,
    a = s - 1,
    t = e;
  while (t != null && ++i < s) {
    var _ = Ihe(r[i]),
      O = n;
    if (_ === "__proto__" || _ === "constructor" || _ === "prototype") return e;
    if (i != a) {
      var f = t[_];
      if (((O = o ? o(f, _, t) : void 0), O === void 0)) O = RR(f) ? f : Put(r[i + 1]) ? [] : {};
    }
    (Dut(t, _, O), (t = t[_]));
  }
  return e;
}

export { baseSet };
