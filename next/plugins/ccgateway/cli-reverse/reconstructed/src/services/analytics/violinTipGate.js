/**
 * services/analytics/violinTipGate.ts
 *
 * 2.1.316 新增。tengu_violin_tip 开关（缓存值）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0cm0xwwe.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "./growthbook.js";

//@ chunk-0cm0xwwe.js:226-298 placement
/**
 * tengu_violin_tip 开关（缓存值）。
 */
function isSleepNoticeOnCached() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_tip", false) === true;
  } catch {
    return false;
  }
}
export { isSleepNoticeOnCached };
