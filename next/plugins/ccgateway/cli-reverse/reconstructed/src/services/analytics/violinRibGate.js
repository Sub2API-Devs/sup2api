/**
 * services/analytics/violinRibGate.ts
 *
 * 2.1.316 新增：开关 tengu_violin_rib。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-qax8a1nm.js (1)
 * attribution: placement 1
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "./growthbook.js";

//@ chunk-qax8a1nm.js:226-298 placement
/**
 * 开关 tengu_violin_rib。
 */
function isViolinRibEnabled() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_rib", false) === true;
  } catch {
    return false;
  }
}
export { isViolinRibEnabled };
