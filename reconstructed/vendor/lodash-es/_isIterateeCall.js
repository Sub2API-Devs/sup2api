/**
 * lodash-es/_isIterateeCall.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-dcmhvw5a.js (1)
 * attribution: placement 1
 */
import {
  RR,
  Phe,
  Put,
  TMe,
} from "../@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";

//@ chunk-dcmhvw5a.js:143558-143700 placement
function isIterateeCall(e, n, r) {
  if (!RR(r)) return !1;
  var s = typeof n;
  if (s == "number" ? Phe(r) && Put(n, r.length) : s == "string" && n in r) return TMe(r[n], e);
  return !1;
}

export { isIterateeCall };
