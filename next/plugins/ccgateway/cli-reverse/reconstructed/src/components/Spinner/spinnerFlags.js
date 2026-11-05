/**
 * components/Spinner/spinnerFlags.ts
 *
 * 2.1.316 新增：Spinner 相关功能开关
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-6ax44zw6.js (3)
 * attribution: placement 3
 */
import { isXtermJs } from "../../ink/terminal.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { useAppStateSlice } from "../../state/AppState.js";

//@ chunk-6ax44zw6.js:298-366 placement
function isReducedMotion(prefersReducedMotion) {
  if (prefersReducedMotion) return true;
  return isXtermJs() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_cedar_marsh", false);
}
//@ chunk-6ax44zw6.js:366-379 placement
/**
 * 导出值：SPINNER_FLAG_PRIORITY（-100）。
 */
var SPINNER_FLAG_PRIORITY = -100;
//@ chunk-6ax44zw6.js:379-445 placement
function usePrefersReducedMotion() {
  return isReducedMotion(useAppStateSlice((state) => state.settings.prefersReducedMotion));
}
export { isReducedMotion, usePrefersReducedMotion, SPINNER_FLAG_PRIORITY };
