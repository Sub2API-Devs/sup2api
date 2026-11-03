/**
 * services/analytics/violinTipGate.ts
 *
 * 2.1.316 新增。tengu_violin_tip 开关（缓存值）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-xdxvr4je.js (1)
 * attribution: placement 1
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "./growthbook.js";

/**
 * tengu_violin_tip 开关（缓存值）。
 */
//@ chunk-xdxvr4je.js:226-298 placement
function isSleepNoticeOnCached() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_tip", !1) === !0;
  } catch {
    return !1;
  }
}

export { isSleepNoticeOnCached };
