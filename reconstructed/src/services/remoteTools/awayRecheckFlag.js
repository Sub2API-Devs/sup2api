/**
 * services/remoteTools/awayRecheckFlag.ts
 *
 * 2.1.316 新增：离开重检开关缓存。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qmsrnapp.js (1)
 * attribution: placement 1
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";

//@ chunk-qmsrnapp.js:40892-40968 placement
function isAwayRecheckOnCached() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_winding", false) === true;
  } catch {
    return false;
  }
}
export { isAwayRecheckOnCached };
