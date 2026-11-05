/**
 * utils/featureFlagReadout.ts
 *
 * 2.1.316 新增：特性开关读数。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-g4bt0b21.js (2)
 * attribution: placement 2
 */
import {
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
  hasFreshGrowthBookFeatures,
  getFeatureValue_CACHED_MAY_BE_STALE,
} from "../services/analytics/growthbook.js";

//@ chunk-g4bt0b21.js:232-470 placement
/**
 * 读 tengu_radiant_heron 开关：下发/覆盖值、禁用为 false，未拉取时为 unknown。
 */
function readRadiantHeron() {
  try {
    let { value: flagValue, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(
      "tengu_radiant_heron",
      false,
    );
    switch (source) {
      case "payload":
      case "override":
        return flagValue === true;
      case "disabled":
        return false;
      case "fallback":
        return hasFreshGrowthBookFeatures() ? false : "unknown";
      case "disk":
        return "unknown";
    }
  } catch {
    return "unknown";
  }
}
//@ chunk-g4bt0b21.js:470-520 placement
/**
 * 读取 tengu_radiant_heron 特性开关（默认关闭）。
 */
function radiantHeronFlag() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_radiant_heron", false);
}
export { readRadiantHeron, radiantHeronFlag };
