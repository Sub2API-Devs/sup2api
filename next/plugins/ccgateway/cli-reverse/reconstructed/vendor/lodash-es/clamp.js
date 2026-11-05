/**
 * lodash-es/clamp.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-exfmq47h.js (1)
 * attribution: placement 1
 */
import { toNumberExport } from "./toNumber.js";
import { clampNumberAlias } from "../../src/utils/model/telemetryModelName.js";

//@ chunk-exfmq47h.js:352929-353067 placement
function clampNumber_2(number, lower, upper) {
  if (upper === undefined) {
    upper = lower;
    lower = undefined;
  }
  if (upper !== undefined) {
    upper = toNumberExport(upper);
    upper = upper === upper ? upper : 0;
  }
  if (lower !== undefined) {
    lower = toNumberExport(lower);
    lower = lower === lower ? lower : 0;
  }
  return clampNumberAlias(toNumberExport(number), lower, upper);
}
export { clampNumber_2 };
