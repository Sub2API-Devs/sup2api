/**
 * services/remoteTools/awayRecheckFlag.ts
 *
 * 2.1.316 新增：离开重检开关缓存。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-9tzb09wm.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";

//@ chunk-9tzb09wm.js:22230-22306 placement
function isAwayRecheckOnCached() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_winding", false) === true;
  } catch {
    return false;
  }
}
export { isAwayRecheckOnCached };
