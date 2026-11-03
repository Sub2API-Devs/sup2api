/**
 * utils/teleport/repositoryTrustGate.ts
 *
 * 2.1.316 新增：仓库信任门控
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-t2adxqya.js (3)
 * attribution: placement 3
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { isDeviceIdentityEnabledCached } from "../../services/analytics/violinGates.js";

//@ chunk-t2adxqya.js:262-293 placement
var TENGU_VIOLIN_BRIDGEPIN = "tengu_violin_bridgepin";
//@ chunk-t2adxqya.js:293-341 placement
function o() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_VIOLIN_BRIDGEPIN, !1);
  } catch {
    return !1;
  }
}
//@ chunk-t2adxqya.js:341-373 placement
function dce() {
  return isDeviceIdentityEnabledCached() && o();
}

export { dce };
