/**
 * utils/telemetry/seatAttributes.ts
 *
 * 遥测属性：anthropic.provider / custom_base_url / plan / seat_type（席位等级映射）（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-a0xc6evk.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getAPIProvider, usesCustomApiEndpoint } from "../model/providers.js";
import {
  isClaudeAISubscriber,
  getSubscriptionType,
  getAuthenticatedAccountInfo,
  credentialIsOwnStoredLogin,
  getOauthAccountInfo,
} from "../auth.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-a0xc6evk.js:2038-2740 placement
/**
 * 可上报为 anthropic.plan 的 plan 取值集合与席位等级到 seat_type 的映射表。
 */
var TELEMETRY_PLAN_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SEAT_TIER_CATEGORIES;
deferInit("chunk-a0xc6evk.js:2038", () => {
  TELEMETRY_PLAN_NAMES = new Set(["pro", "max", "team", "enterprise"]);
  SEAT_TIER_CATEGORIES = new Map([
    ["team_tier_1", "premium"],
    ["team_bendep_nonprofit_premium", "premium"],
    ["team_labs_premium", "premium"],
    ["enterprise_tier_1", "premium"],
    ["enterprise_bendep_premium", "premium"],
    ["team_standard", "standard"],
    ["team_bendep_nonprofit_standard", "standard"],
    ["team_labs_standard", "standard"],
    ["enterprise_standard", "standard"],
    ["enterprise_nonprofit", "standard"],
    ["enterprise_higher_ed", "standard"],
    ["enterprise_usage_based", "usage_based"],
    ["enterprise_usage_based_chat", "usage_based"],
    ["enterprise_hipaa_chat", "usage_based"],
    ["enterprise_hipaa_chat_and_code", "usage_based"],
    ["enterprise_lite", "other"],
    ["enterprise_bendep_global_access", "other"],
  ]);
});
//@ chunk-a0xc6evk.js:2740-3024 placement
/**
 * 上报的 anthropic.* 遥测属性：provider、custom_base_url、plan、seat_type。
 */
function anthropicSeatAttributes() {
  let attributes = {
    "anthropic.provider": getAPIProvider(),
  };
  let customBaseUrl = usesCustomApiEndpoint();
  if (customBaseUrl !== undefined) attributes["anthropic.custom_base_url"] = customBaseUrl;
  if (!isClaudeAISubscriber()) return attributes;
  let subscriptionType = getSubscriptionType();
  if (subscriptionType && TELEMETRY_PLAN_NAMES.has(subscriptionType))
    attributes["anthropic.plan"] = subscriptionType;
  let accountInfo = getAuthenticatedAccountInfo();
  let seatTier = accountInfo
    ? accountInfo.seatTier
    : credentialIsOwnStoredLogin()
      ? getOauthAccountInfo()?.seatTier
      : undefined;
  let seatType = seatTier ? SEAT_TIER_CATEGORIES.get(seatTier) : undefined;
  if (seatType) attributes["anthropic.seat_type"] = seatType;
  return attributes;
}
export { anthropicSeatAttributes };
