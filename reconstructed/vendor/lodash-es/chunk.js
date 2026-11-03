/**
 * lodash-es/chunk.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-chabsk0s.js (3)
 * attribution: placement 3
 */
import { hio } from "../../src/utils/settings/settingsSourceTrust.js";
import { toIntegerExport } from "./toInteger.js";
import { SJt } from "../@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";

//@ chunk-chabsk0s.js:269-292 placement
var { ceil: ceil, max: max } = Math;
//@ chunk-chabsk0s.js:292-473 placement
function m(t, e, r) {
  if (r ? hio(t, e, r) : e === void 0) e = 1;
  else e = max(toIntegerExport(e), 0);
  var n = t == null ? 0 : t.length;
  if (!n || e < 1) return [];
  var l = 0,
    f = 0,
    o = Array(ceil(n / e));
  while (l < n) o[f++] = SJt(t, l, (l += e));
  return o;
}
//@ chunk-chabsk0s.js:473-483 placement
var xbt = m;

export { xbt };
