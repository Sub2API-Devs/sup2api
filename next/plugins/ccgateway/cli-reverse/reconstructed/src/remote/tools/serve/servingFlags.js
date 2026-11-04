/**
 * remote/tools/serve/servingFlags.ts
 *
 * 2.1.316 新增：远程工具服务的功能开关
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-h21vd5jd.js (1)
 * attribution: placement 1
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../../services/analytics/growthbook.js";

//@ chunk-h21vd5jd.js:226-301 placement
function isServedCornerEnabled() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_corner", false) === true;
  } catch {
    return false;
  }
}
export { isServedCornerEnabled };
