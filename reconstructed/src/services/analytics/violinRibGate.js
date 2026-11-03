/**
 * services/analytics/violinRibGate.ts
 *
 * 2.1.316 新增：开关 tengu_violin_rib。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-cpq5ppb2.js (1)
 * attribution: placement 1
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "./growthbook.js";

/**
 * 开关 tengu_violin_rib。
 */
//@ chunk-cpq5ppb2.js:226-298 placement
function isViolinRibEnabled() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_rib", !1) === !0;
  } catch {
    return !1;
  }
}

export { isViolinRibEnabled };
