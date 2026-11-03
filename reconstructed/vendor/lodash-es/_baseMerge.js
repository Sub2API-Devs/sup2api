/**
 * lodash-es/_baseMerge.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-dcmhvw5a.js (1)
 * attribution: placement 1
 */
import { Pn } from "./_inlinedHelpers.js";
import { q8e, RR } from "../@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { pd, rn, on } from "../../src/utils/settings/settingsSourceTrust.js";
import { J8e } from "../../src/utils/git/gitSafeEnv.js";

//@ chunk-dcmhvw5a.js:143313-143493 placement
function baseMerge(e, n, r, s, a) {
  if (e === n) return;
  Pn(
    n,
    function (c, g) {
      if ((a || (a = new q8e()), RR(c))) pd(e, n, g, r, baseMerge, s, a);
      else {
        var m = s ? s(rn(e, g), c, g + "", e, n, a) : void 0;
        if (m === void 0) m = c;
        on(e, g, m);
      }
    },
    J8e,
  );
}

export { baseMerge };
