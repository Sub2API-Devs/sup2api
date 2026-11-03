/**
 * components/Spinner/spinnerFlags.ts
 *
 * 2.1.316 新增：Spinner 相关功能开关
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-9rmf152v.js (3)
 * attribution: placement 3
 */
import { isXtermJs } from "../../ink/terminal.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { rs } from "../../state/AppState.js";

//@ chunk-9rmf152v.js:298-366 placement
function isReducedMotion(e) {
  if (e) return !0;
  return isXtermJs() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_cedar_marsh", !1);
}
//@ chunk-9rmf152v.js:366-379 placement
var VDe = -100;
//@ chunk-9rmf152v.js:379-445 placement
function usePrefersReducedMotion() {
  return isReducedMotion(rs((e) => e.settings.prefersReducedMotion));
}

export { isReducedMotion, usePrefersReducedMotion, VDe };
