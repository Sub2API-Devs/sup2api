/**
 * services/analytics/authOutcomeTelemetry.ts
 *
 * 2.1.316 新增：计算托管设置拉取结果；把认证错误信息（错误码、HTTP 状态、服务端拒绝、刷新结果）归类为遥测结果等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-exfmq47h.js (15)
 * attribution: placement 15
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isTopLevelBridgeSession } from "../../utils/remoteEnvironment.js";
import {
  isReplBridgeActive,
  getIsInteractive,
  getMcpClientsFromAccessorOrTenant,
} from "../../bootstrap/state.js";
import { hasRelaySource } from "../projectsRelay/relayConfig.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-exfmq47h.js:702668-702710 placement
var AUTH_SURFACE_NAMES = ["daemon_child", "sdk_host", "repl"];
//@ chunk-exfmq47h.js:702710-702801 placement
/**
 * 导出函数 `currentAuthSurface`：返回 "daemon_child"; if (!isReplBridgeActive()) return; return getIsInteractive() ? "repl" : "sdk_host"。
 */
function currentAuthSurface() {
  if (isTopLevelBridgeSession()) return "daemon_child";
  if (!isReplBridgeActive()) return;
  return getIsInteractive() ? "repl" : "sdk_host";
}
//@ chunk-exfmq47h.js:702801-702834 placement
/**
 * 当前认证界面。
 */
function getCurrentAuthSurface() {
  return hasRelaySource(getMcpClientsFromAccessorOrTenant());
}
//@ chunk-exfmq47h.js:702834-703005 placement
/**
 * 认证结果遥测的来源、组织拒绝原因与 allow_* 码格式。
 */
var AUTH_SURFACES = ["slash_command", "cli_flag", "startup", "tool", "dispatch", "cloud_session"];
var ORG_DENIAL_REASONS = ["org_denied", "latched", "cache_miss", "route_missing"];
var ALLOW_CODE_RE = /^allow_[a-z][a-z0-9_]{0,58}$/;
//@ chunk-exfmq47h.js:703005-703574 placement
/**
 * 组织级拒绝错误码集合。
 */
var ORG_DENIAL_CODES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var APPLICATION_DEACTIVATED_CODES;
var ORG_REVOKED_SERVER_CODES;
var ACCOUNT_NOT_MEMBER_CODES;
var OAUTH_ACCOUNT_NOT_MEMBER_CODES;
var APPLICATION_DEACTIVATED_SERVER_CODES;
var TOKEN_INVALID_CODES;
deferInit("chunk-exfmq47h.js:703005", () => {
  ORG_DENIAL_CODES = new Set([
    "oauth_not_allowed_for_organization",
    "organization_disabled",
    "organization_on_hold",
    "claude_code_key_creator_not_member",
    "ip_not_in_allowed_range",
  ]);
  APPLICATION_DEACTIVATED_CODES = new Set(["oauth_application_deactivated"]);
  ORG_REVOKED_SERVER_CODES = new Set(["org_access_revoked", "workspace_revoked"]);
  ACCOUNT_NOT_MEMBER_CODES = new Set(["account_not_member", "token_no_organization", "token_no_account"]);
  OAUTH_ACCOUNT_NOT_MEMBER_CODES = new Set([
    "oauth_account_not_member",
    "oauth_token_no_organization",
    "oauth_token_no_account",
  ]);
  APPLICATION_DEACTIVATED_SERVER_CODES = new Set([...ORG_REVOKED_SERVER_CODES, "application_deactivated"]);
  TOKEN_INVALID_CODES = new Set(["token_expired", "token_revoked", "token_invalid", "credential_invalid"]);
});
//@ chunk-exfmq47h.js:703574-703769 placement
/**
 * 按错误码/服务端错误类型归类为组织拒绝（organization）或凭证失效（credential）。
 */
function classifyAuthDenial(orgErrorCode, serverDenial) {
  if (
    (orgErrorCode !== undefined &&
      (ORG_DENIAL_CODES.has(orgErrorCode) || OAUTH_ACCOUNT_NOT_MEMBER_CODES.has(orgErrorCode))) ||
    (serverDenial !== undefined &&
      (ORG_REVOKED_SERVER_CODES.has(serverDenial) || ACCOUNT_NOT_MEMBER_CODES.has(serverDenial)))
  )
    return "organization";
  if (
    (orgErrorCode !== undefined && APPLICATION_DEACTIVATED_CODES.has(orgErrorCode)) ||
    serverDenial === "application_deactivated"
  )
    return "credential";
  return;
}
//@ chunk-exfmq47h.js:703769-704085 placement
/**
 * 凭据失败、刷新锁失败等错误码集合。
 */
var CREDENTIAL_FAILURE_CODES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var DEAD_REFRESH_TOKEN_REASONS;
var REFRESH_TRANSPORT_FAILURES;
var REFRESH_HEALTHY_RESULTS;
deferInit("chunk-exfmq47h.js:703769", () => {
  CREDENTIAL_FAILURE_CODES = new Set(["restricted_regime_endpoint", "oauth_scope_insufficient"]);
  DEAD_REFRESH_TOKEN_REASONS = new Set([
    "known_dead_refresh_token",
    "no_refresh_token",
    "account_on_hold",
    "not_refreshable",
  ]);
  REFRESH_TRANSPORT_FAILURES = new Set([
    "lock_timeout",
    "lock_busy",
    "lock_compromised",
    "lock_error",
    "lock_disk_full",
    "refresh_failed",
  ]);
  REFRESH_HEALTHY_RESULTS = new Set(["refreshed", "not_needed"]);
});
//@ chunk-exfmq47h.js:704085-705346 placement
/**
 * 把认证错误信息（错误码、HTTP 状态、服务端拒绝、刷新结果）归类为遥测结果。
 */
function classifyAuthOutcome(outcome) {
  let {
    errorCode,
    httpStatus,
    serverErrorType,
    serverErrorCode,
    serverAuthDenial,
    authUnavailableReason,
    authType,
    credentialOrigin,
  } = outcome;
  let isOauth = authType === undefined || authType === "oauth";
  let tokenRefreshOutcome = isOauth ? outcome.tokenRefreshOutcome : undefined;
  let refreshOutcome = isOauth ? (outcome.forcedRefreshOutcome ?? outcome.tokenRefreshOutcome) : undefined;
  if (errorCode === undefined) return "unknown";
  if (
    (serverErrorCode !== undefined &&
      (ORG_DENIAL_CODES.has(serverErrorCode) || APPLICATION_DEACTIVATED_CODES.has(serverErrorCode))) ||
    (serverAuthDenial !== undefined && APPLICATION_DEACTIVATED_SERVER_CODES.has(serverAuthDenial))
  )
    return "dead";
  if (serverErrorCode !== undefined && CREDENTIAL_FAILURE_CODES.has(serverErrorCode)) return "live";
  if (
    errorCode === "network_error" ||
    errorCode === "timeout" ||
    errorCode === "parse_failed" ||
    errorCode === "spurious_304" ||
    errorCode === "stale_tunnel_credential" ||
    (errorCode === "request_failed" && httpStatus === undefined && outcome.noResponse === true)
  )
    return "live";
  if (httpStatus === undefined) {
    if (authUnavailableReason === "no_oauth_token")
      return tokenRefreshOutcome !== undefined && REFRESH_TRANSPORT_FAILURES.has(tokenRefreshOutcome)
        ? "unknown"
        : "dead";
    return "unknown";
  }
  if (httpStatus >= 500 || httpStatus === 429 || serverErrorType === "rate_limit_error") return "live";
  if (httpStatus === 404 || httpStatus === 304) return "live";
  if (httpStatus === 401) {
    if (credentialOrigin === "proxy") return "unknown";
    if (authType === "api_key") return credentialOrigin === "helper_key" ? "unknown" : "dead";
    let verdict =
      serverErrorType === "authentication_error" ||
      (serverAuthDenial !== undefined && TOKEN_INVALID_CODES.has(serverAuthDenial));
    if (credentialOrigin === "injected_token" && verdict)
      switch (outcome.injectedTokenRecovery) {
        case "none":
          return "dead";
        case "sdk_host_refresh":
        case "runner_rotation":
          return "live";
        case undefined:
          break;
      }
    if (refreshOutcome === undefined) return "unknown";
    if (DEAD_REFRESH_TOKEN_REASONS.has(refreshOutcome)) return "dead";
    if (credentialOrigin === "injected_token") return "unknown";
    if (REFRESH_TRANSPORT_FAILURES.has(refreshOutcome) || REFRESH_HEALTHY_RESULTS.has(refreshOutcome))
      return "live";
    return "unknown";
  }
  return "unknown";
}
//@ chunk-exfmq47h.js:705346-706445 placement
/**
 * 托管设置拉取结果枚举。
 */
var SETTINGS_FETCH_OUTCOMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var REVOKED_SERVER_DENIALS;
var RESTRICTED_SERVER_CODES;
var ORG_ON_HOLD_CODES;
var CREDENTIAL_INVALID_SERVER_CODES;
var NETWORK_ERROR_CODES;
deferInit("chunk-exfmq47h.js:705346", () => {
  SETTINGS_FETCH_OUTCOMES = [
    "ok",
    "not_modified",
    "none_configured",
    "refused_credential_expired",
    "refused_credential_revoked",
    "refused_credential",
    "refused_not_entitled",
    "refused_account_on_hold",
    "refused_ip_allowlist",
    "blocked_by_intermediary",
    "unavailable_timeout",
    "unavailable_connect",
    "unavailable_tls",
    "unavailable_server",
    "unavailable_credential_exchange",
    "client_no_credentials",
    "client_scope_insufficient",
    "client_error",
    "not_attempted_env_token_only",
    "not_attempted_key_helper_only",
    "not_attempted_host_declared_consumer",
    "not_attempted_consumer_plan",
    "not_attempted_no_auth",
    "not_attempted_custom_base_url",
    "not_attempted_gateway",
    "not_attempted_third_party",
    "not_attempted_other",
  ];
  REVOKED_SERVER_DENIALS = new Set([
    "token_revoked",
    "org_access_revoked",
    "workspace_revoked",
    "application_deactivated",
  ]);
  RESTRICTED_SERVER_CODES = new Set([
    "oauth_not_allowed_for_organization",
    "claude_code_key_creator_not_member",
    "restricted_regime_endpoint",
  ]);
  ORG_ON_HOLD_CODES = new Set(["organization_on_hold", "organization_disabled"]);
  CREDENTIAL_INVALID_SERVER_CODES = new Set(["credential_invalid", "token_invalid"]);
  NETWORK_ERROR_CODES = new Set([
    "ENOTFOUND",
    "EAI_AGAIN",
    "ECONNREFUSED",
    "ECONNRESET",
    "EHOSTUNREACH",
    "ENETUNREACH",
    "EPIPE",
  ]);
});
//@ chunk-exfmq47h.js:706445-706580 placement
/**
 * 是否有服务端错误类型、错误码或认证拒绝信息。
 */
function hasServerAuthDetail(outcome) {
  return (
    (outcome.serverErrorType !== undefined && outcome.serverErrorType !== "other") ||
    outcome.serverErrorCode !== undefined ||
    outcome.serverAuthDenial !== undefined
  );
}
//@ chunk-exfmq47h.js:706580-708517 placement
/**
 * 计算托管设置拉取结果。
 */
function settingsFetchOutcome(outcome) {
  if (outcome.succeeded)
    return outcome.responseKind === "not_modified"
      ? "not_modified"
      : outcome.responseKind === "none_configured"
        ? "none_configured"
        : "ok";
  if (outcome.failure === "no_credentials") return "client_no_credentials";
  if (outcome.failure === "credential_exchange")
    return outcome.exchangeFinal ? "refused_credential_revoked" : "unavailable_credential_exchange";
  let { httpStatus, serverErrorCode, serverAuthDenial } = outcome;
  if (httpStatus !== undefined && (httpStatus >= 500 || httpStatus === 429)) return "unavailable_server";
  if (
    httpStatus !== undefined &&
    !hasServerAuthDetail(outcome) &&
    (httpStatus === 407 || outcome.responseContentType === "html" || outcome.requestIdPresent === false)
  )
    return "blocked_by_intermediary";
  if (outcome.failure === "parse" && outcome.responseContentType === "html") return "blocked_by_intermediary";
  let refreshOutcome = outcome.forcedRefreshOutcome ?? outcome.tokenRefreshOutcome;
  if (serverErrorCode === "oauth_scope_insufficient") return "client_scope_insufficient";
  if (serverErrorCode === "ip_not_in_allowed_range") return "refused_ip_allowlist";
  if (
    (serverErrorCode !== undefined && ORG_ON_HOLD_CODES.has(serverErrorCode)) ||
    refreshOutcome === "account_on_hold"
  )
    return "refused_account_on_hold";
  if (
    httpStatus !== undefined &&
    httpStatus < 500 &&
    httpStatus !== 429 &&
    !isMeaningfulErrorValue(outcome.serverErrorType) &&
    !isMeaningfulErrorValue(serverErrorCode) &&
    !isMeaningfulErrorValue(serverAuthDenial) &&
    (httpStatus === 407 || outcome.responseContentType === "html" || outcome.requestIdPresent === false)
  )
    return "blocked_by_intermediary";
  if (httpStatus === 401 || serverErrorCode === "token_expired") {
    if (
      refreshOutcome === "known_dead_refresh_token" ||
      (serverAuthDenial !== undefined && REVOKED_SERVER_DENIALS.has(serverAuthDenial))
    )
      return "refused_credential_revoked";
    if (serverErrorCode === "token_expired" || serverAuthDenial === "token_expired")
      return "refused_credential_expired";
    return outcome.credentialState === "live" ? "client_error" : "refused_credential";
  }
  if (
    (serverAuthDenial !== undefined && REVOKED_SERVER_DENIALS.has(serverAuthDenial)) ||
    serverErrorCode === "oauth_application_deactivated"
  )
    return "refused_credential_revoked";
  if (serverAuthDenial !== undefined && CREDENTIAL_INVALID_SERVER_CODES.has(serverAuthDenial))
    return "refused_credential";
  if (
    (serverErrorCode !== undefined &&
      (RESTRICTED_SERVER_CODES.has(serverErrorCode) ||
        OAUTH_ACCOUNT_NOT_MEMBER_CODES.has(serverErrorCode))) ||
    (serverAuthDenial !== undefined && ACCOUNT_NOT_MEMBER_CODES.has(serverAuthDenial))
  )
    return "refused_not_entitled";
  if (httpStatus === 403) return "refused_not_entitled";
  if (outcome.errno === "CERT_ERROR" || outcome.failure === "tls") return "unavailable_tls";
  if (outcome.failure === "timeout" || outcome.errno === "ETIMEDOUT") return "unavailable_timeout";
  if (outcome.errno === "ABORTED") return "client_error";
  if (
    outcome.failure === "network" ||
    (outcome.errno !== undefined && NETWORK_ERROR_CODES.has(outcome.errno))
  )
    return "unavailable_connect";
  return "client_error";
}
//@ chunk-exfmq47h.js:708517-709313 placement
/**
 * 未尝试拉取托管设置的原因。
 */
function notAttemptedReason(outcome) {
  switch (outcome.ineligibleReason) {
    case "third_party_provider":
      return outcome.isGateway ? "not_attempted_gateway" : "not_attempted_third_party";
    case "unpinned_gateway":
    case "host_gateway_not_accepted":
      return "not_attempted_gateway";
    case "custom_base_url":
    case "profile_base_url_mismatch":
      return "not_attempted_custom_base_url";
    case "prosumer_oauth":
    case "unsupported_subscription":
      return outcome.injectedOAuthToken()
        ? "not_attempted_host_declared_consumer"
        : "not_attempted_consumer_plan";
    case "no_auth":
    case "oauth_no_inference_scope":
      return outcome.hasEnvAuthToken
        ? "not_attempted_env_token_only"
        : outcome.hasApiKeyHelper
          ? "not_attempted_key_helper_only"
          : "not_attempted_no_auth";
    case "sandboxed_entrypoint":
    case "claude_tag":
    case "hermetic_remote_session":
    case "hybrid_yields_to_device_policy":
    case undefined:
      return "not_attempted_other";
  }
}
//@ chunk-exfmq47h.js:709313-709359 placement
function isMeaningfulErrorValue(value) {
  return value !== undefined && value !== "other";
}
//@ chunk-exfmq47h.js:709359-709773 placement
/**
 * 签名文档种类与验证失败原因枚举。
 */
var SIGNED_DOCUMENT_KINDS = ["managed-settings", "policy-limits"];
var SIGNATURE_VERIFY_FAILURES = [
  "unsigned",
  "malformed",
  "no_embedded_root",
  "bad_chain",
  "cert_expired",
  "no_marker",
  "bad_signature",
  "unsupported_version",
  "wrong_type",
  "aud_mismatch",
  "sub_mismatch",
  "ws_mismatch",
  "sha_mismatch",
  "abs_mismatch",
  "future_iat",
  "stale",
];
var SIGNATURE_VERIFY_RESULTS = [...SIGNATURE_VERIFY_FAILURES, "valid"];
var SIGNATURE_VERIFY_RESULTS_EXTENDED = [
  ...SIGNATURE_VERIFY_FAILURES,
  "no_lifetime",
  "org_pin_mismatch",
  "org_pin_unknown",
  "error",
];
var SIGNATURE_TRUST_STATES = ["none", "not_read", "pending", "trusted", ...SIGNATURE_VERIFY_RESULTS_EXTENDED];
//@ chunk-exfmq47h.js:709773-709802 placement
var ENFORCEMENT_MODES = ["enforced", "shadow"];
export {
  currentAuthSurface,
  getCurrentAuthSurface,
  classifyAuthOutcome,
  settingsFetchOutcome,
  notAttemptedReason,
  classifyAuthDenial,
  SIGNATURE_TRUST_STATES,
  ENFORCEMENT_MODES,
  ALLOW_CODE_RE,
  ORG_DENIAL_REASONS,
  AUTH_SURFACES,
  SETTINGS_FETCH_OUTCOMES,
  SIGNED_DOCUMENT_KINDS,
  SIGNATURE_VERIFY_RESULTS,
  AUTH_SURFACE_NAMES,
};
