/**
 * services/policyLimits/orgConfigEligibility.ts
 *
 * 2.1.316 新增：组织配置门控的候选资格与结论计算
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-c18v4hz4.js (16)
 * attribution: placement 16
 */
import { keepIfFreshOrgConfig } from "../../utils/messageProvenance.js";
import { isOrgConfigPlan, classifyManagedConfigOutcome } from "./orgConfigRequired.js";
import { inOrgConfigGateRollout, orgConfigGateBucket } from "./orgConfigGateFlag.js";
import {
  getAuthTokenSource,
  isAnthropicAuthEnabled,
  credentialIsOwnStoredLogin,
  hasStoredOAuthToken,
  getStoredOAuthSubscriptionType,
  effectiveAuthTokenEnv,
  getConfiguredApiKeyHelper,
  getStoredOAuthTierVerifiedAt,
} from "../../utils/auth.js";
import { env } from "../../utils/env.js";
import { getAPIProvider, isActualFirstPartyAnthropicBaseUrl } from "../../utils/model/providers.js";
import { getOrCreateUserID } from "../../utils/config.js";
import { policyRefusalReason } from "./orgConfigGate.js";
import { POLICY_AUTH_DENIAL_CODES, POLICY_TOKEN_DENIAL_CODES } from "./complianceTaints.js";

//@ chunk-c18v4hz4.js:1116-1385 placement
function tierEligibility(flag, inputs) {
  let freshTier = keepIfFreshOrgConfig(
    inputs.tier,
    inputs.tierVerifiedAtMs,
    flag.graceTtlHours,
    inputs.nowMs ?? Date.now(),
  );
  if (freshTier !== null || inputs.tier === null)
    return {
      tier: freshTier,
      credentialShape: inputs.credentialShape,
    };
  return {
    tier: null,
    credentialShape: inputs.credentialShape === "stored_login" ? "untiered_login" : inputs.credentialShape,
  };
}
//@ chunk-c18v4hz4.js:1385-2286 placement
/**
 * 判断当前会话是否需要组织配置门控（提供方、第一方地址、凭证形态、套餐等），返回是否候选与排除原因。
 */
function orgConfigCandidacy(flag, inputs) {
  if (inputs.provider !== "firstParty")
    return {
      candidate: false,
      exclusion: "provider",
    };
  if (!inputs.firstPartyBaseUrl)
    return {
      candidate: false,
      exclusion: "base_url",
    };
  if (inputs.authRecoveryCommand)
    return {
      candidate: false,
      exclusion: "auth_command",
    };
  let eligibility = tierEligibility(flag, inputs);
  switch (eligibility.credentialShape) {
    case "stored_login":
    case "untiered_login":
      break;
    case "api_key":
    case "env_token_only":
    case "key_helper_only":
    case "none":
      return {
        candidate: false,
        exclusion: "credential_shape",
      };
  }
  let tier =
    isOrgConfigPlan(eligibility.tier) ||
    eligibility.credentialShape !== "untiered_login" ||
    inputs.storedLoginOrigin !== true
      ? eligibility.tier
      : (flag.plans[0] ?? "team");
  if (!isOrgConfigPlan(tier))
    return {
      candidate: false,
      exclusion: "tier_unknown",
    };
  if (!flag.enabled)
    return {
      candidate: false,
      exclusion: "flag_off",
    };
  if (!flag.plans.includes(tier))
    return {
      candidate: false,
      exclusion: "tier_not_in_plans",
    };
  if (inputs.hostToken === true && !flag.hostTokens)
    return {
      candidate: false,
      exclusion: "host_token",
    };
  if (!inOrgConfigGateRollout(flag, inputs.bucket))
    return {
      candidate: false,
      exclusion: "rollout_percent",
    };
  return {
    candidate: true,
    tier,
  };
}
//@ chunk-c18v4hz4.js:2286-2300 placement
var ORG_CONFIG_CACHE_FRESH_MS = 3600000;
//@ chunk-c18v4hz4.js:2300-2414 placement
function isExemptReason(flag, reason) {
  if (flag.exemptReasons.includes(reason)) return true;
  return reason === "refused_not_entitled" && !flag.refuseNotEntitled;
}
//@ chunk-c18v4hz4.js:2414-2624 placement
function admittedCacheState(outcome, graceTtlHours) {
  if (classifyManagedConfigOutcome(outcome.reason) === "fetched") return "fetched";
  if (!outcome.hasAdmittedCache) return "no";
  if (outcome.admittedCacheAgeMs === undefined || outcome.admittedCacheAgeMs < 0) return "no";
  return outcome.admittedCacheAgeMs <= graceTtlHours * ORG_CONFIG_CACHE_FRESH_MS ? "cached" : "no";
}
//@ chunk-c18v4hz4.js:2624-3400 placement
/**
 * 综合开关、候选资格与策略/设置结果，算出组织配置门控的结论（通过/缓存通过/阻止/拒绝）。
 */
function orgConfigGateDecision(input) {
  let { flag, candidacy, surface } = input;
  let blockedMs = input.blockedMs ?? 0;
  if (!flag.enabled || !candidacy.candidate)
    return {
      verdict: "pass",
      blockedMs,
      surface,
    };
  let resources = [
    ["policy", input.policy],
    ["settings", input.settings],
  ];
  let exemptSeen = false;
  for (let [resourceName, outcome] of resources) {
    if (classifyManagedConfigOutcome(outcome.reason) !== "refused") continue;
    if (isExemptReason(flag, outcome.reason)) {
      exemptSeen = true;
      continue;
    }
    return {
      verdict: "refused",
      reason: outcome.reason,
      resource: resourceName,
      blockedMs,
      surface,
    };
  }
  let sawCached = false;
  let worst;
  for (let [resourceName, outcome] of resources) {
    let cacheState = admittedCacheState(outcome, flag.graceTtlHours);
    if (cacheState === "fetched") continue;
    if (cacheState === "cached") {
      sawCached = true;
      continue;
    }
    if (isExemptReason(flag, outcome.reason)) {
      exemptSeen = true;
      continue;
    }
    if (
      worst === undefined ||
      (worst[1].reason === "unavailable_pending" && outcome.reason !== "unavailable_pending")
    )
      worst = [resourceName, outcome];
  }
  if (worst !== undefined)
    return {
      verdict: "blocked",
      reason: worst[1].reason,
      resource: worst[0],
      blockedMs,
      surface,
    };
  return {
    verdict: exemptSeen ? "pass_exempt" : sawCached ? "pass_cached" : "pass",
    blockedMs,
    surface,
  };
}
//@ chunk-c18v4hz4.js:3400-3636 placement
function credentialShape(inputs) {
  if (inputs.hasOAuthToken && inputs.oauthEffective)
    return inputs.subscriptionType === null ? "untiered_login" : "stored_login";
  if (inputs.apiKeyEnv) return "api_key";
  if (inputs.envToken) return "env_token_only";
  if (inputs.keyHelper) return "key_helper_only";
  return "none";
}
//@ chunk-c18v4hz4.js:3636-3826 placement
function isOAuthEffective() {
  try {
    switch (getAuthTokenSource().source) {
      case "claude.ai":
        return isAnthropicAuthEnabled();
      case "CCR_OAUTH_TOKEN_FILE":
      case "CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR":
        return isAnthropicAuthEnabled() && credentialIsOwnStoredLogin();
      default:
        return false;
    }
  } catch {
    return true;
  }
}
//@ chunk-c18v4hz4.js:3826-3872 placement
/**
 * isAnthropicAuthEnabled 的安全包装（异常视为 false）。
 */
function isAnthropicAuthEnabledSafe() {
  try {
    return isAnthropicAuthEnabled();
  } catch {
    return false;
  }
}
//@ chunk-c18v4hz4.js:3872-4049 placement
function credentialShapeInputs() {
  let hasToken = hasStoredOAuthToken();
  return credentialShape({
    hasOAuthToken: hasToken,
    oauthEffective: hasToken && isAnthropicAuthEnabledSafe(),
    subscriptionType: getStoredOAuthSubscriptionType(),
    apiKeyEnv: !!env.ANTHROPIC_API_KEY,
    envToken: effectiveAuthTokenEnv() !== undefined,
    keyHelper: getConfiguredApiKeyHelper() !== undefined,
  });
}
//@ chunk-c18v4hz4.js:4049-4307 placement
function orgConfigInputs(options) {
  let shape = credentialShapeInputs();
  let oauthEffective = isOAuthEffective();
  return {
    provider: getAPIProvider(),
    firstPartyBaseUrl: isActualFirstPartyAnthropicBaseUrl(),
    authRecoveryCommand: options.authRecoveryCommand,
    tier: getStoredOAuthSubscriptionType(),
    credentialShape: shape,
    storedLoginOrigin: oauthEffective,
    hostToken: shape === "stored_login" && !oauthEffective,
    tierVerifiedAtMs: getStoredOAuthTierVerifiedAt(),
    nowMs: Date.now(),
    bucket: orgConfigGateBucket(getOrCreateUserID()),
  };
}
//@ chunk-c18v4hz4.js:4307-4372 placement
/**
 * 取对象上的字符串字段，非字符串返回 undefined。
 */
function stringFieldOf(object, field) {
  let value = object?.[field];
  return typeof value === "string" ? value : undefined;
}
//@ chunk-c18v4hz4.js:4372-4437 placement
/**
 * 取对象上的数字字段，非数字返回 undefined。
 */
function numberFieldOf(object, field) {
  let value = object?.[field];
  return typeof value === "number" ? value : undefined;
}
//@ chunk-c18v4hz4.js:4437-5244 placement
function policyOutcomeSummary(policy, policyGateFields) {
  let cacheAgeMs = numberFieldOf(policyGateFields, "policy_cache_age_ms");
  let hadCache = policy?.hadCache === true || policy?.source === "cache";
  let cacheFacts = {
    hasAdmittedCache: hadCache,
    admittedCacheAgeMs: hadCache ? cacheAgeMs : undefined,
  };
  if (
    stringFieldOf(policyGateFields, "policy_ineligible_reason") !== undefined ||
    policy?.source === "ineligible"
  )
    return {
      ...cacheFacts,
      reason: "not_attempted",
    };
  let loadState = stringFieldOf(policyGateFields, "policy_load_state");
  if (
    loadState === "succeeded" ||
    policyGateFields?.policy_live_verdict === true ||
    policy?.source === "fetch"
  )
    return {
      ...cacheFacts,
      reason: "ok",
    };
  if (policy?.source === "none")
    return {
      ...cacheFacts,
      reason: "none_configured",
    };
  if (
    loadState === "in_flight" ||
    loadState === "not_started" ||
    (loadState === undefined && policy === undefined)
  )
    return {
      ...cacheFacts,
      reason: "unavailable_pending",
    };
  let serverErrorCode = stringFieldOf(policyGateFields, "policy_server_error_code");
  let serverAuthDenial = stringFieldOf(policyGateFields, "policy_server_auth_denial");
  let httpStatus = numberFieldOf(policyGateFields, "policy_http_status");
  return {
    ...cacheFacts,
    reason: policyRefusalReason(
      stringFieldOf(policyGateFields, "policy_error_code"),
      stringFieldOf(policyGateFields, "policy_credential_state"),
      httpStatus,
      stringFieldOf(policyGateFields, "policy_server_error_type"),
      POLICY_AUTH_DENIAL_CODES.find((denialCode) => denialCode === serverErrorCode),
      POLICY_TOKEN_DENIAL_CODES.find((denialCode) => denialCode === serverAuthDenial),
    ),
    httpStatus,
  };
}
//@ chunk-c18v4hz4.js:5244-5302 placement
function isRetryableHttpStatus(status) {
  return status === 429 || status === 408 || status === 409 || status === 425;
}
//@ chunk-c18v4hz4.js:5302-5344 placement
function knownOrUndefined(errorType) {
  return errorType === "other" ? undefined : errorType;
}
export {
  knownOrUndefined,
  isRetryableHttpStatus,
  orgConfigCandidacy,
  policyOutcomeSummary,
  orgConfigGateDecision,
  orgConfigInputs,
  isOAuthEffective,
  credentialShapeInputs,
  isExemptReason,
};
