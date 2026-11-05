/**
 * hooks/notifs/useCanSwitchToExistingSubscription.tsx
 *
 * 检测到已有 Claude 订阅时提示可切换（tengu_switch_to_subscription_notice_shown）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/notifs/useCanSwitchToExistingSubscription.tsx
 * pieces: chunk-hnxhr3bs.js (3)
 * attribution: fingerprint 2, file-last-pair 1
 */
import { isClaudeAISubscriber } from "../../utils/auth.js";
import { getOauthProfileFromApiKey } from "../../services/oauth/getOauthProfile.js";
import { idleAmberFinchOn, quietSlateWrenOn } from "../../utils/planTiers.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { SUBSCRIPTION_SWITCH, CC_CE_MIGRATE_MAX_IMPRESSIONS } from "../../utils/subscriptionNoticeIds.js";
import { logEvent } from "../../services/analytics/index.js";

//@ chunk-hnxhr3bs.js:86783-86968 fingerprint (2.1.88 match: getExistingClaudeSubscription, 1)
async function getExistingClaudeSubscription() {
  if (isClaudeAISubscriber()) return null;
  let profile = await getOauthProfileFromApiKey();
  if (!profile) return null;
  if (profile.account.has_claude_max && !idleAmberFinchOn()) return "Max";
  if (profile.account.has_claude_pro && !quietSlateWrenOn()) return "Pro";
  return null;
}
//@ chunk-hnxhr3bs.js:86968-87028 file-last-pair
function useCanSwitchToExistingSubscription() {
  return (getGlobalConfig().seenNotifications?.[SUBSCRIPTION_SWITCH] ?? 0) < CC_CE_MIGRATE_MAX_IMPRESSIONS;
}
//@ chunk-hnxhr3bs.js:87028-87194 fingerprint (2.1.88 match: _temp2, 0.411)
function recordSubscriptionNoticeShown(storageV5) {
  saveGlobalConfig((config) => {
    let seenNotifications = config.seenNotifications ?? {};
    return {
      ...config,
      seenNotifications: {
        ...seenNotifications,
        [SUBSCRIPTION_SWITCH]: (seenNotifications[SUBSCRIPTION_SWITCH] ?? 0) + 1,
      },
    };
  }, storageV5);
  logEvent("tengu_switch_to_subscription_notice_shown", {});
}
export { useCanSwitchToExistingSubscription, getExistingClaudeSubscription, recordSubscriptionNoticeShown };
