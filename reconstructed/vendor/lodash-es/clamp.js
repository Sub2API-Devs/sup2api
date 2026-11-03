/**
 * lodash-es/clamp.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-aepeg2w5.js (1)
 * attribution: placement 1
 */
import { toNumberExport } from "./toNumber.js";
import { yE } from "../../src/utils/model/telemetryModelName.js";

//@ chunk-aepeg2w5.js:342442-342580 placement
function clampNumber(e, n, r) {
  if (r === void 0) ((r = n), (n = void 0));
  if (r !== void 0) ((r = toNumberExport(r)), (r = r === r ? r : 0));
  if (n !== void 0) ((n = toNumberExport(n)), (n = n === n ? n : 0));
  return yE(toNumberExport(e), n, r);
}

export { clampNumber };
