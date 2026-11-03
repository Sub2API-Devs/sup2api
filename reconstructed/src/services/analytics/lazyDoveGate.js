/**
 * services/analytics/lazyDoveGate.ts
 *
 * 2.1.316 新增。tengu_lazy_dove 开关（缓存值）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s7c33dbx.js (1)
 * attribution: placement 1
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "./growthbook.js";

/**
 * tengu_lazy_dove 开关（缓存值）。
 */
//@ chunk-s7c33dbx.js:226-297 placement
function isStillHereOnCached() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_lazy_dove", !1) === !0;
  } catch {
    return !1;
  }
}

export { isStillHereOnCached };
