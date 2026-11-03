/**
 * services/api/_new/getModelPricingString.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (1)
 * attribution: sole-consumer-new 1
 */
import { getCanonicalName } from "../../../utils/model/canonicalModelName.js";
import { MODEL_COSTS, formatModelPricing } from "../../../utils/modelCost.js";

/**
 * 内置价格表中该模型的价格展示串，没有则 undefined。
 */
//@ chunk-aepeg2w5.js:375442-375506 sole-consumer-new
function getModelPricingString(e) {
  let n = getCanonicalName(e),
    r = MODEL_COSTS[n];
  if (!r) return;
  return formatModelPricing(r);
}

export { getModelPricingString };
