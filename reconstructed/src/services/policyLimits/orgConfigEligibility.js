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
import { GPt, classifyManagedConfigOutcome } from "./orgConfigRequired.js";
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
import { vur, nbi } from "./complianceTaints.js";

//@ chunk-c18v4hz4.js:1116-1385 placement
function tierEligibility(e, n) {
  let r = keepIfFreshOrgConfig(n.tier, n.tierVerifiedAtMs, e.graceTtlHours, n.nowMs ?? Date.now());
  if (r !== null || n.tier === null) return { tier: r, credentialShape: n.credentialShape };
  return {
    tier: null,
    credentialShape: n.credentialShape === "stored_login" ? "untiered_login" : n.credentialShape,
  };
}
/**
 * 判断当前会话是否需要组织配置门控（提供方、第一方地址、凭证形态、套餐等），返回是否候选与排除原因。
 */
//@ chunk-c18v4hz4.js:1385-2286 placement
function orgConfigCandidacy(e, n) {
  if (n.provider !== "firstParty") return { candidate: !1, exclusion: "provider" };
  if (!n.firstPartyBaseUrl) return { candidate: !1, exclusion: "base_url" };
  if (n.authRecoveryCommand) return { candidate: !1, exclusion: "auth_command" };
  let r = tierEligibility(e, n);
  switch (r.credentialShape) {
    case "stored_login":
    case "untiered_login":
      break;
    case "api_key":
    case "env_token_only":
    case "key_helper_only":
    case "none":
      return { candidate: !1, exclusion: "credential_shape" };
  }
  let o =
    GPt(r.tier) || r.credentialShape !== "untiered_login" || n.storedLoginOrigin !== !0
      ? r.tier
      : (e.plans[0] ?? "team");
  if (!GPt(o)) return { candidate: !1, exclusion: "tier_unknown" };
  if (!e.enabled) return { candidate: !1, exclusion: "flag_off" };
  if (!e.plans.includes(o)) return { candidate: !1, exclusion: "tier_not_in_plans" };
  if (n.hostToken === !0 && !e.hostTokens) return { candidate: !1, exclusion: "host_token" };
  if (!inOrgConfigGateRollout(e, n.bucket)) return { candidate: !1, exclusion: "rollout_percent" };
  return { candidate: !0, tier: o };
}
//@ chunk-c18v4hz4.js:2286-2300 placement
var Q = 3600000;
//@ chunk-c18v4hz4.js:2300-2414 placement
function isExemptReason(e, n) {
  if (e.exemptReasons.includes(n)) return !0;
  return n === "refused_not_entitled" && !e.refuseNotEntitled;
}
//@ chunk-c18v4hz4.js:2414-2624 placement
function admittedCacheState(e, n) {
  if (classifyManagedConfigOutcome(e.reason) === "fetched") return "fetched";
  if (!e.hasAdmittedCache) return "no";
  if (e.admittedCacheAgeMs === void 0 || e.admittedCacheAgeMs < 0) return "no";
  return e.admittedCacheAgeMs <= n * Q ? "cached" : "no";
}
/**
 * 综合开关、候选资格与策略/设置结果，算出组织配置门控的结论（通过/缓存通过/阻止/拒绝）。
 */
//@ chunk-c18v4hz4.js:2624-3400 placement
function orgConfigGateDecision(e) {
  let { flag: flag, candidacy: candidacy, surface: surface } = e,
    a = e.blockedMs ?? 0;
  if (!flag.enabled || !candidacy.candidate) return { verdict: "pass", blockedMs: a, surface: surface };
  let d = [
      ["policy", e.policy],
      ["settings", e.settings],
    ],
    u = !1;
  for (let [f, m] of d) {
    if (classifyManagedConfigOutcome(m.reason) !== "refused") continue;
    if (isExemptReason(flag, m.reason)) {
      u = !0;
      continue;
    }
    return { verdict: "refused", reason: m.reason, resource: f, blockedMs: a, surface: surface };
  }
  let s = !1,
    g;
  for (let [f, m] of d) {
    let _ = admittedCacheState(m, flag.graceTtlHours);
    if (_ === "fetched") continue;
    if (_ === "cached") {
      s = !0;
      continue;
    }
    if (isExemptReason(flag, m.reason)) {
      u = !0;
      continue;
    }
    if (g === void 0 || (g[1].reason === "unavailable_pending" && m.reason !== "unavailable_pending"))
      g = [f, m];
  }
  if (g !== void 0)
    return { verdict: "blocked", reason: g[1].reason, resource: g[0], blockedMs: a, surface: surface };
  return { verdict: u ? "pass_exempt" : s ? "pass_cached" : "pass", blockedMs: a, surface: surface };
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
        return !1;
    }
  } catch {
    return !0;
  }
}
//@ chunk-c18v4hz4.js:3826-3872 placement
function ee() {
  try {
    return isAnthropicAuthEnabled();
  } catch {
    return !1;
  }
}
//@ chunk-c18v4hz4.js:3872-4049 placement
function credentialShapeInputs() {
  let e = hasStoredOAuthToken();
  return credentialShape({
    hasOAuthToken: e,
    oauthEffective: e && ee(),
    subscriptionType: getStoredOAuthSubscriptionType(),
    apiKeyEnv: !!env.ANTHROPIC_API_KEY,
    envToken: effectiveAuthTokenEnv() !== void 0,
    keyHelper: getConfiguredApiKeyHelper() !== void 0,
  });
}
//@ chunk-c18v4hz4.js:4049-4307 placement
function orgConfigInputs(e) {
  let n = credentialShapeInputs(),
    r = isOAuthEffective();
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
function y(e, n) {
  let r = e?.[n];
  return typeof r === "string" ? r : void 0;
}
//@ chunk-c18v4hz4.js:4372-4437 placement
function M(e, n) {
  let r = e?.[n];
  return typeof r === "number" ? r : void 0;
}
//@ chunk-c18v4hz4.js:4437-5244 placement
function policyOutcomeSummary(e, n) {
  let r = M(n, "policy_cache_age_ms"),
    o = e?.hadCache === !0 || e?.source === "cache",
    a = { hasAdmittedCache: o, admittedCacheAgeMs: o ? r : void 0 };
  if (y(n, "policy_ineligible_reason") !== void 0 || e?.source === "ineligible")
    return { ...a, reason: "not_attempted" };
  let d = y(n, "policy_load_state");
  if (d === "succeeded" || n?.policy_live_verdict === !0 || e?.source === "fetch")
    return { ...a, reason: "ok" };
  if (e?.source === "none") return { ...a, reason: "none_configured" };
  if (d === "in_flight" || d === "not_started" || (d === void 0 && e === void 0))
    return { ...a, reason: "unavailable_pending" };
  let u = y(n, "policy_server_error_code"),
    s = y(n, "policy_server_auth_denial"),
    g = M(n, "policy_http_status");
  return {
    ...a,
    reason: policyRefusalReason(
      y(n, "policy_error_code"),
      y(n, "policy_credential_state"),
      g,
      y(n, "policy_server_error_type"),
      vur.find((f) => f === u),
      nbi.find((f) => f === s),
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
  return e === "other" ? void 0 : e;
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
