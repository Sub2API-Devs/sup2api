/**
 * lodash-es/pickBy.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-3a1caa6f.js (1)
 * attribution: placement 1
 */
import { s9e } from "./toString.js";
import { mDn, ldo } from "../../src/utils/git/gitSafeEnv.js";
import { nz } from "../@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";

//@ chunk-3a1caa6f.js:1667-1800 placement
function pickBy(e, r) {
  if (e == null) return {};
  var n = s9e(mDn(e), function (o) {
    return [o];
  });
  return (
    (r = nz(r)),
    ldo(e, n, function (o, i) {
      return r(o, i[0]);
    })
  );
}

export { pickBy };
