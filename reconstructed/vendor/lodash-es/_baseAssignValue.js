/**
 * lodash-es/_baseAssignValue.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-3a1caa6f.js (1)
 * attribution: placement 1
 */
import { fDn } from "../../src/utils/git/gitSafeEnv.js";

//@ chunk-3a1caa6f.js:499-613 placement
function baseAssignValue(e, r, n) {
  if (r == "__proto__" && fDn) fDn(e, r, { configurable: !0, enumerable: !0, value: n, writable: !0 });
  else e[r] = n;
}

export { baseAssignValue };
