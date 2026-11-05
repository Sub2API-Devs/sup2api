/**
 * utils/teleport/repositoryTrustGate.ts
 *
 * 2.1.316 新增：仓库信任门控
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7hyy4kzw.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { isDeviceIdentityEnabledCached } from "../../services/analytics/violinGates.js";

//@ chunk-7hyy4kzw.js:262-293 placement
var TENGU_VIOLIN_BRIDGEPIN = "tengu_violin_bridgepin";
//@ chunk-7hyy4kzw.js:293-341 placement
function isBridgePinGateEnabled() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_VIOLIN_BRIDGEPIN, false);
  } catch {
    return false;
  }
}
//@ chunk-7hyy4kzw.js:341-373 placement
/**
 * 是否启用仓库信任门控（设备身份 + 开关）。
 */
function isRepositoryTrustGateEnabled() {
  return isDeviceIdentityEnabledCached() && isBridgePinGateEnabled();
}
export { isRepositoryTrustGateEnabled };
