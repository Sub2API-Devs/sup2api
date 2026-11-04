/**
 * services/remoteManagedSettings/orgConfigGate.ts
 *
 * 2.1.316 新增：组织配置开关。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-2wc2xwxh.js (1)
 * attribution: placement 1
 */
import { TENGU_ORG_CONFIG_REQUIRED } from "../policyLimits/orgConfigRequired.js";

//@ chunk-2wc2xwxh.js:228-478 placement
function orgConfigGateFlagOnHand(state, requiredFlagNames) {
  let cachedGrowthBookFeatures = state.cachedGrowthBookFeatures;
  if (
    typeof cachedGrowthBookFeatures !== "object" ||
    cachedGrowthBookFeatures === null ||
    Array.isArray(cachedGrowthBookFeatures) ||
    Object.keys(cachedGrowthBookFeatures).length === 0
  )
    return true;
  let growthBookOverrides = state.growthBookOverrides;
  return (
    TENGU_ORG_CONFIG_REQUIRED in cachedGrowthBookFeatures ||
    (typeof growthBookOverrides === "object" &&
      growthBookOverrides !== null &&
      TENGU_ORG_CONFIG_REQUIRED in growthBookOverrides) ||
    (requiredFlagNames !== undefined && requiredFlagNames.includes(TENGU_ORG_CONFIG_REQUIRED))
  );
}
export { orgConfigGateFlagOnHand };
