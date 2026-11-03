/**
 * commands/powerup/discoveryCopy.ts
 *
 * 2.1.316 新增。/powerup 发现提示文案与实验分支（tengu_birch_lantern）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-a1p5y6g9.js (2)
 * attribution: placement 2
 */
import { env } from "../../utils/env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";

/**
 * /powerup 发现提示文案与实验分支（tengu_birch_lantern）。
 */
//@ chunk-a1p5y6g9.js:261-568 placement
var POWERUP_DISCOVERY_COPY = {
  heading: "Learn the moves",
  body:
    "Quick lessons on the things power users do \u2014 plan mode, undo, " +
    "subagents, memory. About 5 minutes. Come back any time with /powerup.",
  banner:
    "New here? Type /powerup for a 5-minute tour \u2014 modes, undo, " +
    "@-mentions, and how to teach Claude your rules.",
};
//@ chunk-a1p5y6g9.js:568-697 placement
function resolvePowerupDiscoveryArm() {
  let CLAUDE_CODE_POWERUP_ONBOARDING = env.CLAUDE_CODE_POWERUP_ONBOARDING;
  if (CLAUDE_CODE_POWERUP_ONBOARDING === "banner" || CLAUDE_CODE_POWERUP_ONBOARDING === "step")
    return CLAUDE_CODE_POWERUP_ONBOARDING;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_birch_lantern", "off");
}

export { resolvePowerupDiscoveryArm, POWERUP_DISCOVERY_COPY };
