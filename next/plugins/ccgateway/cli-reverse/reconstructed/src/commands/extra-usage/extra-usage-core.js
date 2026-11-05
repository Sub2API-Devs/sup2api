/**
 * commands/extra-usage/extra-usage-core.ts
 *
 * 用量额度（usage credits）核心逻辑：团队/企业查询 extra_usage 状态，个人打开购买或请求管理员
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/extra-usage/extra-usage-core.ts
 * pieces: chunk-ph8hmbrf.js (2)
 * attribution: placement 1, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { openValidatedUrlSucceeded } from "../../utils/browser.js";

//@ chunk-ph8hmbrf.js:4758-4901 placement (2.1.88 match: hasRequiredSubscription, 0.529)
/**
 * （误归 computerUse/gates）是否可购买额外用量：GrowthBook tengu_ember_latch 或已有覆盖，并且允许额外用量且是 pro/max 订阅。
 */
function canPurchaseExtraUsage() {
  if (isBgSession()) return false;
  let tier = getSubscriptionType();
  let hasOverride = getLspManager() !== null;
  let gateOn = getFeatureValue_CACHED_MAY_BE_STALE("tengu_ember_latch", false) || hasOverride;
  let allowed =
    isExtraUsageAllowed() &&
    (hasOverride || ((tier === "pro" || tier === "max") && !isEssentialTrafficOnly()));
  return gateOn && allowed;
}
//@ chunk-ph8hmbrf.js:4901-6713 fingerprint (2.1.88 match: runExtraUsage, 0.344)
async function runExtraUsage(context, credentials) {
  let subscriptionType = getSubscriptionType();
  let isTeamOrEnterprise = subscriptionType === "team" || subscriptionType === "enterprise";
  if (!isConsumerPlan() && isTeamOrEnterprise) {
    let extraUsage;
    let hasExtraUsage = true;
    try {
      extraUsage = (await fetchUtilization(credentials))?.extra_usage;
      hasExtraUsage &&= extraUsage !== undefined;
    } catch (error) {
      hasExtraUsage = false;
      logForDebugging(`extra-usage: fetchUtilization failed, falling through to ask user: ${error}`, {
        level: "error",
      });
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
          extraUsage.spend_limit_reached === false
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
      let eligibility = await getAdminRequestEligibility("limit_increase", credentials);
      if (eligibility?.is_allowed === false)
        return {
          type: "message",
          value: "Usage credit requests are turned off for your organization.",
          reason: "requests_off",
        };
      hasExtraUsage &&= eligibility?.is_allowed === true;
    } catch (error) {
      hasExtraUsage = false;
      logForDebugging(`Extra usage eligibility check failed: ${error}`, {
        level: "error",
      });
    }
    try {
      let pendingOrDismissedRequests = await listMyAdminRequests("limit_increase", ["pending"], credentials);
      if (pendingOrDismissedRequests && pendingOrDismissedRequests.length > 0)
        return {
          type: "message",
          value: "You've already sent a usage credit request to your admin.",
          reason: "pending",
        };
      hasExtraUsage &&= pendingOrDismissedRequests !== null;
    } catch (error) {
      hasExtraUsage = false;
      logForDebugging(`Failed to fetch pending admin requests: ${error}`, {
        level: "error",
      });
    }
    return {
      type: "confirm-admin-request",
      extraUsage,
      checked: hasExtraUsage,
    };
  }
  let url = isTeamOrEnterprise ? HTTPS_CLAUDE_AI_ADMIN_SETTINGS_USAGE : USAGE_SETTINGS_URL;
  if (!context.openInBrowser || isBgSession())
    return {
      type: "browser-opened",
      url,
      opened: false,
    };
  try {
    let opened = await openValidatedUrlSucceeded(url);
    return {
      type: "browser-opened",
      url,
      opened,
    };
  } catch (error) {
    logForDebugging(`Failed to open browser for ${url}: ${error}`, {
      level: "error",
    });
    return {
      type: "message",
      value: `Couldn't open your browser. Visit ${url} to manage usage credits.`,
    };
  }
}
export { runExtraUsage, canPurchaseExtraUsage };
