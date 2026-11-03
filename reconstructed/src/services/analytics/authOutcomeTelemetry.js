/**
 * services/analytics/authOutcomeTelemetry.ts
 *
 * 2.1.316 新增：计算托管设置拉取结果；把认证错误信息（错误码、HTTP 状态、服务端拒绝、刷新结果）归类为遥测结果等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (15)
 * attribution: placement 15
 */
import { Ehe } from "../../utils/remoteEnvironment.js";
import { isReplBridgeActive, getIsInteractive, getMcpClientsFromAccessor } from "../../bootstrap/state.js";
import { hasRelaySource } from "../projectsRelay/relayConfig.js";

//@ chunk-aepeg2w5.js:690062-690104 placement
var TR = ["daemon_child", "sdk_host", "repl"];
//@ chunk-aepeg2w5.js:690104-690195 placement
function aro() {
  if (Ehe()) return "daemon_child";
  if (!isReplBridgeActive()) return;
  return getIsInteractive() ? "repl" : "sdk_host";
}
/**
 * 当前认证界面。
 */
//@ chunk-aepeg2w5.js:690195-690227 placement
function getCurrentAuthSurface() {
  return hasRelaySource(getMcpClientsFromAccessor());
}
/**
 * 认证结果遥测的来源、组织拒绝原因与 allow_* 码格式。
 */
//@ chunk-aepeg2w5.js:690227-690398 placement
var AUTH_SURFACES = ["slash_command", "cli_flag", "startup", "tool", "dispatch", "cloud_session"],
  ORG_DENIAL_REASONS = ["org_denied", "latched", "cache_miss", "route_missing"],
  ALLOW_CODE_RE = /^allow_[a-z][a-z0-9_]{0,58}$/;
/**
 * 组织级拒绝错误码集合。
 */
//@ chunk-aepeg2w5.js:690398-690967 placement
var ORG_DENIAL_CODES = new Set([
    "oauth_not_allowed_for_organization",
    "organization_disabled",
    "organization_on_hold",
    "claude_code_key_creator_not_member",
    "ip_not_in_allowed_range",
  ]),
  NR = new Set(["oauth_application_deactivated"]),
  FR = new Set(["org_access_revoked", "workspace_revoked"]),
  ag = new Set(["account_not_member", "token_no_organization", "token_no_account"]),
  ug = new Set(["oauth_account_not_member", "oauth_token_no_organization", "oauth_token_no_account"]),
  oz = new Set([...FR, "application_deactivated"]),
  iz = new Set(["token_expired", "token_revoked", "token_invalid", "credential_invalid"]);
/**
 * 按错误码/服务端错误类型归类为组织拒绝（organization）或凭证失效（credential）。
 */
//@ chunk-aepeg2w5.js:690967-691162 placement
function classifyAuthDenial(e, n) {
  if ((e !== void 0 && (ORG_DENIAL_CODES.has(e) || ug.has(e))) || (n !== void 0 && (FR.has(n) || ag.has(n))))
    return "organization";
  if ((e !== void 0 && NR.has(e)) || n === "application_deactivated") return "credential";
  return;
}
/**
 * 凭据失败、刷新锁失败等错误码集合。
 */
//@ chunk-aepeg2w5.js:691162-691478 placement
var CREDENTIAL_FAILURE_CODES = new Set(["restricted_regime_endpoint", "oauth_scope_insufficient"]),
  az = new Set(["known_dead_refresh_token", "no_refresh_token", "account_on_hold", "not_refreshable"]),
  PR = new Set([
    "lock_timeout",
    "lock_busy",
    "lock_compromised",
    "lock_error",
    "lock_disk_full",
    "refresh_failed",
  ]),
  uz = new Set(["refreshed", "not_needed"]);
/**
 * 把认证错误信息（错误码、HTTP 状态、服务端拒绝、刷新结果）归类为遥测结果。
 */
//@ chunk-aepeg2w5.js:691478-692739 placement
function classifyAuthOutcome(e) {
  let {
      errorCode: errorCode,
      httpStatus: httpStatus,
      serverErrorType: serverErrorType,
      serverErrorCode: serverErrorCode,
      serverAuthDenial: serverAuthDenial,
      authUnavailableReason: authUnavailableReason,
      authType: authType,
      credentialOrigin: credentialOrigin,
    } = e,
    x = authType === void 0 || authType === "oauth",
    P = x ? e.tokenRefreshOutcome : void 0,
    F = x ? (e.forcedRefreshOutcome ?? e.tokenRefreshOutcome) : void 0;
  if (errorCode === void 0) return "unknown";
  if (
    (serverErrorCode !== void 0 && (ORG_DENIAL_CODES.has(serverErrorCode) || NR.has(serverErrorCode))) ||
    (serverAuthDenial !== void 0 && oz.has(serverAuthDenial))
  )
    return "dead";
  if (serverErrorCode !== void 0 && CREDENTIAL_FAILURE_CODES.has(serverErrorCode)) return "live";
  if (
    errorCode === "network_error" ||
    errorCode === "timeout" ||
    errorCode === "parse_failed" ||
    errorCode === "spurious_304" ||
    errorCode === "stale_tunnel_credential" ||
    (errorCode === "request_failed" && httpStatus === void 0 && e.noResponse === !0)
  )
    return "live";
  if (httpStatus === void 0) {
    if (authUnavailableReason === "no_oauth_token") return P !== void 0 && PR.has(P) ? "unknown" : "dead";
    return "unknown";
  }
  if (httpStatus >= 500 || httpStatus === 429 || serverErrorType === "rate_limit_error") return "live";
  if (httpStatus === 404 || httpStatus === 304) return "live";
  if (httpStatus === 401) {
    if (credentialOrigin === "proxy") return "unknown";
    if (authType === "api_key") return credentialOrigin === "helper_key" ? "unknown" : "dead";
    let L =
      serverErrorType === "authentication_error" || (serverAuthDenial !== void 0 && iz.has(serverAuthDenial));
    if (credentialOrigin === "injected_token" && L)
      switch (e.injectedTokenRecovery) {
        case "none":
          return "dead";
        case "sdk_host_refresh":
        case "runner_rotation":
          return "live";
        case void 0:
          break;
      }
    if (F === void 0) return "unknown";
    if (az.has(F)) return "dead";
    if (credentialOrigin === "injected_token") return "unknown";
    if (PR.has(F) || uz.has(F)) return "live";
    return "unknown";
  }
  return "unknown";
}
/**
 * 托管设置拉取结果枚举。
 */
//@ chunk-aepeg2w5.js:692739-693838 placement
var SETTINGS_FETCH_OUTCOMES = [
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
  ],
  LR = new Set(["token_revoked", "org_access_revoked", "workspace_revoked", "application_deactivated"]),
  lz = new Set([
    "oauth_not_allowed_for_organization",
    "claude_code_key_creator_not_member",
    "restricted_regime_endpoint",
  ]),
  dz = new Set(["organization_on_hold", "organization_disabled"]),
  cz = new Set(["credential_invalid", "token_invalid"]),
  fz = new Set([
    "ENOTFOUND",
    "EAI_AGAIN",
    "ECONNREFUSED",
    "ECONNRESET",
    "EHOSTUNREACH",
    "ENETUNREACH",
    "EPIPE",
  ]);
/**
 * 是否有服务端错误类型、错误码或认证拒绝信息。
 */
//@ chunk-aepeg2w5.js:693838-693973 placement
function hasServerAuthDetail(e) {
  return (
    (e.serverErrorType !== void 0 && e.serverErrorType !== "other") ||
    e.serverErrorCode !== void 0 ||
    e.serverAuthDenial !== void 0
  );
}
/**
 * 计算托管设置拉取结果。
 */
//@ chunk-aepeg2w5.js:693973-695910 placement
function settingsFetchOutcome(e) {
  if (e.succeeded)
    return e.responseKind === "not_modified"
      ? "not_modified"
      : e.responseKind === "none_configured"
        ? "none_configured"
        : "ok";
  if (e.failure === "no_credentials") return "client_no_credentials";
  if (e.failure === "credential_exchange")
    return e.exchangeFinal ? "refused_credential_revoked" : "unavailable_credential_exchange";
  let { httpStatus: httpStatus, serverErrorCode: serverErrorCode, serverAuthDenial: serverAuthDenial } = e;
  if (httpStatus !== void 0 && (httpStatus >= 500 || httpStatus === 429)) return "unavailable_server";
  if (
    httpStatus !== void 0 &&
    !hasServerAuthDetail(e) &&
    (httpStatus === 407 || e.responseContentType === "html" || e.requestIdPresent === !1)
  )
    return "blocked_by_intermediary";
  if (e.failure === "parse" && e.responseContentType === "html") return "blocked_by_intermediary";
  let h = e.forcedRefreshOutcome ?? e.tokenRefreshOutcome;
  if (serverErrorCode === "oauth_scope_insufficient") return "client_scope_insufficient";
  if (serverErrorCode === "ip_not_in_allowed_range") return "refused_ip_allowlist";
  if ((serverErrorCode !== void 0 && dz.has(serverErrorCode)) || h === "account_on_hold")
    return "refused_account_on_hold";
  if (
    httpStatus !== void 0 &&
    httpStatus < 500 &&
    httpStatus !== 429 &&
    !lg(e.serverErrorType) &&
    !lg(serverErrorCode) &&
    !lg(serverAuthDenial) &&
    (httpStatus === 407 || e.responseContentType === "html" || e.requestIdPresent === !1)
  )
    return "blocked_by_intermediary";
  if (httpStatus === 401 || serverErrorCode === "token_expired") {
    if (h === "known_dead_refresh_token" || (serverAuthDenial !== void 0 && LR.has(serverAuthDenial)))
      return "refused_credential_revoked";
    if (serverErrorCode === "token_expired" || serverAuthDenial === "token_expired")
      return "refused_credential_expired";
    return e.credentialState === "live" ? "client_error" : "refused_credential";
  }
  if (
    (serverAuthDenial !== void 0 && LR.has(serverAuthDenial)) ||
    serverErrorCode === "oauth_application_deactivated"
  )
    return "refused_credential_revoked";
  if (serverAuthDenial !== void 0 && cz.has(serverAuthDenial)) return "refused_credential";
  if (
    (serverErrorCode !== void 0 && (lz.has(serverErrorCode) || ug.has(serverErrorCode))) ||
    (serverAuthDenial !== void 0 && ag.has(serverAuthDenial))
  )
    return "refused_not_entitled";
  if (httpStatus === 403) return "refused_not_entitled";
  if (e.errno === "CERT_ERROR" || e.failure === "tls") return "unavailable_tls";
  if (e.failure === "timeout" || e.errno === "ETIMEDOUT") return "unavailable_timeout";
  if (e.errno === "ABORTED") return "client_error";
  if (e.failure === "network" || (e.errno !== void 0 && fz.has(e.errno))) return "unavailable_connect";
  return "client_error";
}
/**
 * 未尝试拉取托管设置的原因。
 */
//@ chunk-aepeg2w5.js:695910-696706 placement
function notAttemptedReason(e) {
  switch (e.ineligibleReason) {
    case "third_party_provider":
      return e.isGateway ? "not_attempted_gateway" : "not_attempted_third_party";
    case "unpinned_gateway":
    case "host_gateway_not_accepted":
      return "not_attempted_gateway";
    case "custom_base_url":
    case "profile_base_url_mismatch":
      return "not_attempted_custom_base_url";
    case "prosumer_oauth":
    case "unsupported_subscription":
      return e.injectedOAuthToken() ? "not_attempted_host_declared_consumer" : "not_attempted_consumer_plan";
    case "no_auth":
    case "oauth_no_inference_scope":
      return e.hasEnvAuthToken
        ? "not_attempted_env_token_only"
        : e.hasApiKeyHelper
          ? "not_attempted_key_helper_only"
          : "not_attempted_no_auth";
    case "sandboxed_entrypoint":
    case "claude_tag":
    case "hermetic_remote_session":
    case "hybrid_yields_to_device_policy":
    case void 0:
      return "not_attempted_other";
  }
}
//@ chunk-aepeg2w5.js:696706-696752 placement
function lg(e) {
  return e !== void 0 && e !== "other";
}
/**
 * 签名文档种类与验证失败原因枚举。
 */
//@ chunk-aepeg2w5.js:696752-697166 placement
var SIGNED_DOCUMENT_KINDS = ["managed-settings", "policy-limits"],
  HR = [
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
  ],
  BR = [...HR, "valid"],
  mz = [...HR, "no_lifetime", "org_pin_mismatch", "org_pin_unknown", "error"],
  KR = ["none", "not_read", "pending", "trusted", ...mz];
//@ chunk-aepeg2w5.js:697166-697195 placement
var GR = ["enforced", "shadow"];

export {
  aro,
  getCurrentAuthSurface,
  classifyAuthOutcome,
  settingsFetchOutcome,
  notAttemptedReason,
  KR,
  GR,
  ALLOW_CODE_RE,
  ORG_DENIAL_REASONS,
  AUTH_SURFACES,
  SETTINGS_FETCH_OUTCOMES,
  SIGNED_DOCUMENT_KINDS,
  BR,
  TR,
  classifyAuthDenial,
};
