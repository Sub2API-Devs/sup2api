/**
 * tools/ProposeGoalTool/constants.ts
 *
 * 2.1.316 新增：ProposeGoal 工具开关
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n021zj7c.js (1)
 * attribution: placement 1
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";

//@ chunk-n021zj7c.js:226-275 placement
function isProposeGoalEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_propose_goal", false);
}
export { isProposeGoalEnabled };
