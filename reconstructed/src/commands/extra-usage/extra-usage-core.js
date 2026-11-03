/**
 * commands/extra-usage/extra-usage-core.ts
 *
 * 用量额度（usage credits）核心逻辑：团队/企业查询 extra_usage 状态，个人打开购买或请求管理员
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/extra-usage/extra-usage-core.ts
 * pieces: chunk-vbks4x4e.js (2)
 * attribution: placement 1, fingerprint 1
 */
import { isBgSession } from "../../utils/concurrentSessions.js";
import { getSubscriptionType, isExtraUsageAllowed } from "../../utils/auth.js";
import { getLspManager } from "../../services/lsp/manager.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { isConsumerPlan } from "../../utils/planTiers.js";
import { fetchUtilization } from "../../services/api/usage.js";
import { logForDebugging } from "../../utils/debug.js";
import { getAdminRequestEligibility, listMyAdminRequests } from "../../services/api/adminRequests.js";
import { HTTPS_CLAUDE_AI_ADMIN_SETTINGS_USAGE, USAGE_SETTINGS_URL } from "../../services/claudeAiLimits.js";
import { fi } from "../../utils/browser.js";

/**
 * （误归 computerUse/gates）是否可购买额外用量：GrowthBook tengu_ember_latch 或已有覆盖，并且允许额外用量且是 pro/max 订阅。
 */
//@ chunk-vbks4x4e.js:4758-4901 placement = hasRequiredSubscription (0.53)
function canPurchaseExtraUsage() {
  if (isBgSession()) return !1;
  let tier = getSubscriptionType(),
    hasOverride = getLspManager() !== null,
    n = getFeatureValue_CACHED_MAY_BE_STALE("tengu_ember_latch", !1) || hasOverride,
    o =
      isExtraUsageAllowed() &&
      (hasOverride || ((tier === "pro" || tier === "max") && !isEssentialTrafficOnly()));
  return n && o;
}
//@ chunk-vbks4x4e.js:4901-6713 fingerprint = runExtraUsage (0.345)
async function runExtraUsage(r, i) {
  let subscriptionType = getSubscriptionType(),
    isTeamOrEnterprise = subscriptionType === "team" || subscriptionType === "enterprise";
  if (!isConsumerPlan() && isTeamOrEnterprise) {
    let extraUsage,
      p = !0;
    try {
      ((extraUsage = (await fetchUtilization(i))?.extra_usage), (p &&= extraUsage !== void 0));
    } catch (error) {
      ((p = !1),
        logForDebugging(`extra-usage: fetchUtilization failed, falling through to ask user: ${error}`, {
          level: "error",
        }));
    }
    switch (extraUsage?.disabled_reason) {
      case "out_of_credits":
        return {
          type: "message",
          value: "Your organization is out of usage credits. Contact your admin to add more.",
          reason: "out_of_credits",
        };
      case "org_level_disabled_until":
      case "org_spend_cap_reached":
        if (
          extraUsage.disabled_reason === "org_level_disabled_until" &&
          extraUsage.spend_limit_reached === !1
        )
          break;
        return {
          type: "message",
          value:
            "Your organization's usage credit cap is reached for this period. Contact your admin to raise it.",
          reason: "org_cap_reached",
        };
      default:
    }
    if (extraUsage?.is_enabled && extraUsage.monthly_limit === null)
      return {
        type: "message",
        value: "Your organization already has unlimited usage credits. No request needed.",
        reason: "unlimited",
      };
    try {
      let pendingOrDismissedRequests = await getAdminRequestEligibility("limit_increase", i);
      if (pendingOrDismissedRequests?.is_allowed === !1)
        return {
          type: "message",
          value: "Usage credit requests are turned off for your organization.",
          reason: "requests_off",
        };
      p &&= pendingOrDismissedRequests?.is_allowed === !0;
    } catch (error) {
      ((p = !1), logForDebugging(`Extra usage eligibility check failed: ${error}`, { level: "error" }));
    }
    try {
      let m = await listMyAdminRequests("limit_increase", ["pending"], i);
      if (m && m.length > 0)
        return {
          type: "message",
          value: "You've already sent a usage credit request to your admin.",
          reason: "pending",
        };
      p &&= m !== null;
    } catch (error) {
      ((p = !1), logForDebugging(`Failed to fetch pending admin requests: ${error}`, { level: "error" }));
    }
    return { type: "confirm-admin-request", extraUsage: extraUsage, checked: p };
  }
  let url = isTeamOrEnterprise ? HTTPS_CLAUDE_AI_ADMIN_SETTINGS_USAGE : USAGE_SETTINGS_URL;
  if (!r.openInBrowser || isBgSession()) return { type: "browser-opened", url: url, opened: !1 };
  try {
    let opened = await fi(url);
    return { type: "browser-opened", url: url, opened: opened };
  } catch (error) {
    return (
      logForDebugging(`Failed to open browser for ${url}: ${error}`, { level: "error" }),
      { type: "message", value: `Couldn't open your browser. Visit ${url} to manage usage credits.` }
    );
  }
}

export { runExtraUsage, canPurchaseExtraUsage };
