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
function tierEligibility(e, n) {
  let r = keepIfFreshOrgConfig(n.tier, n.tierVerifiedAtMs, e.graceTtlHours, n.nowMs ?? Date.now());
  if (r !== null || n.tier === null)
    return {
      tier: r,
      credentialShape: n.credentialShape,
    };
  return {
    tier: null,
    credentialShape: n.credentialShape === "stored_login" ? "untiered_login" : n.credentialShape,
  };
}
//@ chunk-c18v4hz4.js:1385-2286 placement
/**
 * 判断当前会话是否需要组织配置门控（提供方、第一方地址、凭证形态、套餐等），返回是否候选与排除原因。
 */
function orgConfigCandidacy(flag, n) {
  if (n.provider !== "firstParty")
    return {
      candidate: false,
      exclusion: "provider",
    };
  if (!n.firstPartyBaseUrl)
    return {
      candidate: false,
      exclusion: "base_url",
    };
  if (n.authRecoveryCommand)
    return {
      candidate: false,
      exclusion: "auth_command",
    };
  let r = tierEligibility(flag, n);
  switch (r.credentialShape) {
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
  let o =
    isOrgConfigPlan(r.tier) || r.credentialShape !== "untiered_login" || n.storedLoginOrigin !== true
      ? r.tier
      : (flag.plans[0] ?? "team");
  if (!isOrgConfigPlan(o))
    return {
      candidate: false,
      exclusion: "tier_unknown",
    };
  if (!flag.enabled)
    return {
      candidate: false,
      exclusion: "flag_off",
    };
  if (!flag.plans.includes(o))
    return {
      candidate: false,
      exclusion: "tier_not_in_plans",
    };
  if (n.hostToken === true && !flag.hostTokens)
    return {
      candidate: false,
      exclusion: "host_token",
    };
  if (!inOrgConfigGateRollout(flag, n.bucket))
    return {
      candidate: false,
      exclusion: "rollout_percent",
    };
  return {
    candidate: true,
    tier: o,
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
function admittedCacheState(e, graceTtlHours) {
  if (classifyManagedConfigOutcome(e.reason) === "fetched") return "fetched";
  if (!e.hasAdmittedCache) return "no";
  if (e.admittedCacheAgeMs === undefined || e.admittedCacheAgeMs < 0) return "no";
  return e.admittedCacheAgeMs <= graceTtlHours * ORG_CONFIG_CACHE_FRESH_MS ? "cached" : "no";
}
//@ chunk-c18v4hz4.js:2624-3400 placement
/**
 * 综合开关、候选资格与策略/设置结果，算出组织配置门控的结论（通过/缓存通过/阻止/拒绝）。
 */
function orgConfigGateDecision(e) {
  let { flag, candidacy, surface } = e;
  let blockedMs = e.blockedMs ?? 0;
  if (!flag.enabled || !candidacy.candidate)
    return {
      verdict: "pass",
      blockedMs,
      surface,
    };
  let d = [
    ["policy", e.policy],
    ["settings", e.settings],
  ];
  let u = false;
  for (let [f, m] of d) {
    if (classifyManagedConfigOutcome(m.reason) !== "refused") continue;
    if (isExemptReason(flag, m.reason)) {
      u = true;
      continue;
    }
    return {
      verdict: "refused",
      reason: m.reason,
      resource: f,
      blockedMs,
      surface,
    };
  }
  let s = false;
  let g;
  for (let [f, m] of d) {
    let _ = admittedCacheState(m, flag.graceTtlHours);
    if (_ === "fetched") continue;
    if (_ === "cached") {
      s = true;
      continue;
    }
    if (isExemptReason(flag, m.reason)) {
      u = true;
      continue;
    }
    if (g === undefined || (g[1].reason === "unavailable_pending" && m.reason !== "unavailable_pending"))
      g = [f, m];
  }
  if (g !== undefined)
    return {
      verdict: "blocked",
      reason: g[1].reason,
      resource: g[0],
      blockedMs,
      surface,
    };
  return {
    verdict: u ? "pass_exempt" : s ? "pass_cached" : "pass",
    blockedMs,
    surface,
  };
}
//@ chunk-c18v4hz4.js:3400-3636 placement
function credentialShape(e) {
  if (e.hasOAuthToken && e.oauthEffective)
    return e.subscriptionType === null ? "untiered_login" : "stored_login";
  if (e.apiKeyEnv) return "api_key";
  if (e.envToken) return "env_token_only";
  if (e.keyHelper) return "key_helper_only";
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
  let e = hasStoredOAuthToken();
  return credentialShape({
    hasOAuthToken: e,
    oauthEffective: e && isAnthropicAuthEnabledSafe(),
    subscriptionType: getStoredOAuthSubscriptionType(),
    apiKeyEnv: !!env.ANTHROPIC_API_KEY,
    envToken: effectiveAuthTokenEnv() !== undefined,
    keyHelper: getConfiguredApiKeyHelper() !== undefined,
  });
}
//@ chunk-c18v4hz4.js:4049-4307 placement
function orgConfigInputs(e) {
  let n = credentialShapeInputs();
  let r = isOAuthEffective();
  return {
    provider: getAPIProvider(),
    firstPartyBaseUrl: isActualFirstPartyAnthropicBaseUrl(),
    authRecoveryCommand: e.authRecoveryCommand,
    tier: getStoredOAuthSubscriptionType(),
    credentialShape: n,
    storedLoginOrigin: r,
    hostToken: n === "stored_login" && !r,
    tierVerifiedAtMs: getStoredOAuthTierVerifiedAt(),
    nowMs: Date.now(),
    bucket: orgConfigGateBucket(getOrCreateUserID()),
  };
}
//@ chunk-c18v4hz4.js:4307-4372 placement
/**
 * 取对象上的字符串字段，非字符串返回 undefined。
 */
function stringFieldOf(e, n) {
  let r = e?.[n];
  return typeof r === "string" ? r : undefined;
}
//@ chunk-c18v4hz4.js:4372-4437 placement
/**
 * 取对象上的数字字段，非数字返回 undefined。
 */
function numberFieldOf(e, n) {
  let r = e?.[n];
  return typeof r === "number" ? r : undefined;
}
//@ chunk-c18v4hz4.js:4437-5244 placement
function policyOutcomeSummary(policy, policyGateFields) {
  let r = numberFieldOf(policyGateFields, "policy_cache_age_ms");
  let o = policy?.hadCache === true || policy?.source === "cache";
  let a = {
    hasAdmittedCache: o,
    admittedCacheAgeMs: o ? r : undefined,
  };
  if (
    stringFieldOf(policyGateFields, "policy_ineligible_reason") !== undefined ||
    policy?.source === "ineligible"
  )
    return {
      ...a,
      reason: "not_attempted",
    };
  let d = stringFieldOf(policyGateFields, "policy_load_state");
  if (d === "succeeded" || policyGateFields?.policy_live_verdict === true || policy?.source === "fetch")
    return {
      ...a,
      reason: "ok",
    };
  if (policy?.source === "none")
    return {
      ...a,
      reason: "none_configured",
    };
  if (d === "in_flight" || d === "not_started" || (d === undefined && policy === undefined))
    return {
      ...a,
      reason: "unavailable_pending",
    };
  let u = stringFieldOf(policyGateFields, "policy_server_error_code");
  let s = stringFieldOf(policyGateFields, "policy_server_auth_denial");
  let g = numberFieldOf(policyGateFields, "policy_http_status");
  return {
    ...a,
    reason: policyRefusalReason(
      stringFieldOf(policyGateFields, "policy_error_code"),
      stringFieldOf(policyGateFields, "policy_credential_state"),
      g,
      stringFieldOf(policyGateFields, "policy_server_error_type"),
      POLICY_AUTH_DENIAL_CODES.find((f) => f === u),
      POLICY_TOKEN_DENIAL_CODES.find((f) => f === s),
    ),
    httpStatus: g,
  };
}
//@ chunk-c18v4hz4.js:5244-5302 placement
function isRetryableHttpStatus(e) {
  return e === 429 || e === 408 || e === 409 || e === 425;
}
//@ chunk-c18v4hz4.js:5302-5344 placement
function knownOrUndefined(e) {
  return e === "other" ? undefined : e;
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
