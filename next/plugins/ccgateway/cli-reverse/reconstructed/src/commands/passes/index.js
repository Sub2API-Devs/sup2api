/**
 * commands/passes/index.ts
 *
 * /passes 命令对象（访客周卡分享，资格与缓存决定可见）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/passes/index.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */
import { getCachedReferrerReward, checkCachedPassesEligibility } from "../../services/api/referral.js";

//@ chunk-e6aww6q8.js:2027748-2028028 fingerprint (2.1.88 match: default, 0.786)
/**
 * /passes 命令对象（local-jsx）；描述：{if(drt())return"Share a free week of Claude Code with friends and earn usage credits";return"Share a free week of Claude Code with friends"；isHidden: {let{eligible:e,hasCache:n}=qvt();return!e||!n}；实现 chunk-aa3cndeh.js 的 Da。
 */
var passesCommand = {
  type: "local-jsx",
  name: "passes",
  get description() {
    if (getCachedReferrerReward())
      return "Share a free week of Claude Code with friends and earn usage credits";
    return "Share a free week of Claude Code with friends";
  },
  get isHidden() {
    let { eligible, hasCache } = checkCachedPassesEligibility();
    return !eligible || !hasCache;
  },
  requires: {
    ink: true,
  },
};
export { passesCommand };
