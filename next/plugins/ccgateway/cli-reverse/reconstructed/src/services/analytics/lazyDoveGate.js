/**
 * services/analytics/lazyDoveGate.ts
 *
 * 2.1.316 新增。tengu_lazy_dove 开关（缓存值）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ehxssa6d.js (1)
 * attribution: placement 1
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "./growthbook.js";

//@ chunk-ehxssa6d.js:226-297 placement
/**
 * tengu_lazy_dove 开关（缓存值）。
 */
function isStillHereOnCached() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_lazy_dove", false) === true;
  } catch {
    return false;
  }
}
export { isStillHereOnCached };
