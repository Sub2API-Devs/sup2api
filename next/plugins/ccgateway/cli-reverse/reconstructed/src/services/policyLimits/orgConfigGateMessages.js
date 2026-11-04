/**
 * services/policyLimits/orgConfigGateMessages.ts
 *
 * 2.1.316 新增：组织配置门控阻止/拒绝的说明文本
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-c18v4hz4.js (11)
 * attribution: placement 11
 */
import { policyRefusalReason, settingsOutcome, storedSettingsState } from "./orgConfigGate.js";
import { getPolicyLimitsGateSnapshot } from "./PolicyLimitsClient.js";
import { getLastLoadStatus, getIneligibleReason } from "../remoteManagedSettings/remoteSettingsState.js";
import { isOAuthEffective } from "./orgConfigEligibility.js";
import { getOauthAccountInfo } from "../../utils/auth.js";
import { stripControlChars } from "../../utils/settings/writeQueues.js";

//@ chunk-c18v4hz4.js:10863-10961 placement (2.1.88 match: hasOpusAccess, 1)
function hasOpusAccess(tier) {
  switch (tier) {
    case "max":
    case "pro":
    case "team":
    case "enterprise":
      return tier;
    default:
      return;
  }
}
//@ chunk-c18v4hz4.js:10961-11919 placement
function orgConfigTelemetryFields(policyLimitsGateSnapshot) {
  let base = {
    hasAdmittedCache: policyLimitsGateSnapshot.hasCache,
    admittedCacheAgeMs: policyLimitsGateSnapshot.hasCache ? policyLimitsGateSnapshot.cacheAgeMs : undefined,
  };
  if (!policyLimitsGateSnapshot.eligible)
    return {
      ...base,
      reason: "not_attempted",
    };
  let sameGeneration = !policyLimitsGateSnapshot.loadFromEarlierGeneration;
  if (
    policyLimitsGateSnapshot.liveVerdict ||
    (sameGeneration && policyLimitsGateSnapshot.loadState === "succeeded")
  )
    return {
      ...base,
      reason: "ok",
    };
  let latestLoad = policyLimitsGateSnapshot.latestLoad;
  if (latestLoad !== undefined)
    return latestLoad.succeeded
      ? {
          ...base,
          reason: "ok",
        }
      : {
          ...base,
          reason: policyRefusalReason(
            latestLoad.errorCode,
            latestLoad.credentialState,
            latestLoad.httpStatus,
            latestLoad.serverErrorType,
            latestLoad.serverErrorCode,
            latestLoad.serverAuthDenial,
          ),
          httpStatus: latestLoad.httpStatus,
        };
  if (!sameGeneration)
    return {
      ...base,
      reason: "unavailable_pending",
    };
  if (
    policyLimitsGateSnapshot.loadState === "not_started" ||
    policyLimitsGateSnapshot.loadState === "in_flight"
  ) {
    let loadLastAttempt = policyLimitsGateSnapshot.loadLastAttempt;
    return loadLastAttempt === undefined
      ? {
          ...base,
          reason: "unavailable_pending",
        }
      : {
          ...base,
          reason: policyRefusalReason(
            loadLastAttempt.errorCode,
            "unknown",
            loadLastAttempt.httpStatus,
            loadLastAttempt.serverErrorType,
            loadLastAttempt.serverErrorCode,
            loadLastAttempt.serverAuthDenial,
          ),
          httpStatus: loadLastAttempt.httpStatus,
        };
  }
  return {
    ...base,
    reason: policyRefusalReason(
      policyLimitsGateSnapshot.loadErrorCode,
      policyLimitsGateSnapshot.loadCredentialState,
      policyLimitsGateSnapshot.loadHttpStatus,
      policyLimitsGateSnapshot.loadServerErrorType,
      policyLimitsGateSnapshot.loadServerErrorCode,
      policyLimitsGateSnapshot.loadServerAuthDenial,
    ),
    httpStatus: policyLimitsGateSnapshot.loadHttpStatus,
  };
}
//@ chunk-c18v4hz4.js:11919-11950 placement
/**
 * 当前门控快照的遥测字段。
 */
function orgConfigTelemetryFieldsNow() {
  return orgConfigTelemetryFields(getPolicyLimitsGateSnapshot());
}
//@ chunk-c18v4hz4.js:11950-12000 placement
function currentSettingsOutcome() {
  return settingsOutcome(
    undefined,
    getLastLoadStatus(),
    getIneligibleReason(),
    storedSettingsState(),
    isOAuthEffective(),
  );
}
//@ chunk-c18v4hz4.js:12000-12048 placement
function currentGateOutcomes() {
  return {
    policy: orgConfigTelemetryFieldsNow(),
    settings: currentSettingsOutcome(),
  };
}
//@ chunk-c18v4hz4.js:12048-12201 placement
function orgConfigContext(outcomes, resource) {
  let httpStatus = resource === undefined ? undefined : outcomes[resource].httpStatus;
  let organizationName = getOauthAccountInfo()?.organizationName;
  return {
    organizationName:
      organizationName === undefined || organizationName === null
        ? undefined
        : stripControlChars(organizationName),
    httpStatus,
  };
}
//@ chunk-c18v4hz4.js:12201-12304 placement
var POLICY_ENDPOINTS_LABEL =
  "api.anthropic.com/api/claude_code/policy_limits and api.anthropic.com/api/claude_code/settings";
//@ chunk-c18v4hz4.js:12304-12421 placement
function organizationDisplayName(context) {
  let organizationName =
    context.organizationName !== undefined ? stripControlChars(context.organizationName).trim() : "";
  return organizationName !== "" ? organizationName : "Your organization";
}
//@ chunk-c18v4hz4.js:12421-12501 placement
/**
 * 拼出「 Request id: …」后缀（无请求 id 时为空串）。
 */
function requestIdClause(context) {
  return context.requestId !== undefined ? ` Request id: ${stripControlChars(context.requestId)}.` : "";
}
//@ chunk-c18v4hz4.js:12501-16305 placement
/**
 * 把组织配置门控的阻止/拒绝结果转成给用户的说明文字（含组织名、HTTP 状态、恢复命令）。
 */
function orgConfigGateMessage(decision, context = {}) {
  if (decision.verdict === "pass" || decision.verdict === "pass_cached" || decision.verdict === "pass_exempt")
    return;
  switch (decision.reason) {
    case "refused_credential":
      return "Your Claude session has expired. Sign in again to continue (claude auth login).";
    case "refused_not_entitled":
      return `${organizationDisplayName(context)} doesn't allow Claude Code for this account. Ask an admin of your organization, or sign in with a different account (claude auth login).${requestIdClause(context)}`;
    case "refused_other":
      return `${organizationDisplayName(context)} refused this session's organization settings${context.httpStatus !== undefined ? ` (HTTP ${context.httpStatus})` : ""}. Sign in again, or ask an admin of your organization.${requestIdClause(context)}`;
    case "blocked_by_intermediary":
      return `Claude Code couldn't load your organization's settings: the reply came from a network proxy, not Anthropic${context.httpStatus !== undefined ? ` (HTTP ${context.httpStatus}, no request id)` : ""}. ${organizationDisplayName(context)} requires these settings before a session can start. Ask IT to allow HTTPS to ${POLICY_ENDPOINTS_LABEL}, then retry.`;
    case "unavailable_timeout":
      return `Claude Code couldn't load your organization's settings (timed out). ${organizationDisplayName(context)} requires them before a session can start. ${retryHint(decision)} check https://status.anthropic.com if this persists.${requestIdClause(context)}`;
    case "unavailable_connect":
      return `Claude Code couldn't reach Anthropic to load your organization's settings (could not connect). ${organizationDisplayName(context)} requires them before a session can start. Check your network connection and retry; if you are on a corporate network, ask IT to allow HTTPS to ${POLICY_ENDPOINTS_LABEL}.`;
    case "unavailable_server":
      return `Claude Code couldn't load your organization's settings: Anthropic returned an error${context.httpStatus !== undefined ? ` (HTTP ${context.httpStatus})` : ""}. ${organizationDisplayName(context)} requires them before a session can start. ${retryHint(decision)} check https://status.anthropic.com if this persists.${requestIdClause(context)}`;
    case "unavailable_rate_limited":
      return `Claude Code couldn't load your organization's settings: Anthropic asked it to retry shortly${context.httpStatus !== undefined ? ` (HTTP ${context.httpStatus})` : ""}. ${organizationDisplayName(context)} requires them before a session can start. ${retryHint(decision)} check https://status.anthropic.com if this persists.${requestIdClause(context)}`;
    case "unavailable_credential_refresh":
      return decision.surface === "noninteractive"
        ? `Claude Code couldn't verify your sign-in with Anthropic yet (its sign-in token was still being refreshed, often by another Claude Code process), so it couldn't load your organization's settings. ${organizationDisplayName(context)} requires them before a session can start. Run the command again; if this persists, sign in again (claude auth login).${requestIdClause(context)}`
        : `Claude Code couldn't verify your sign-in with Anthropic yet, so it couldn't load your organization's settings. ${organizationDisplayName(context)} requires them before a session can start. ${retryHint(decision)} if this persists, sign in again (claude auth login).${requestIdClause(context)}`;
    case "unavailable_pending":
      return `Claude Code is still loading your organization's settings. ${organizationDisplayName(context)} requires them before a session can start; this usually takes a few seconds.`;
    case "unavailable_settings_unusable":
      return `Claude Code couldn't apply your organization's managed settings: none of the settings the server returned could be applied as written. ${organizationDisplayName(context)} requires them before a session can start. Ask your administrator to fix the published settings, then retry.${requestIdClause(context)}`;
    case "client_no_credentials":
    case "client_error":
      return `Claude Code couldn't load your organization's settings because of an internal error. ${organizationDisplayName(context)} requires them before a session can start. Retry, and if this persists report it with /bug.${requestIdClause(context)}`;
    case "not_attempted":
      return `Claude Code does not load your organization's settings in the mode this session was launched in, and ${organizationDisplayName(context)} requires them before a session can start. If CLAUDE_CODE_ENTRYPOINT or a remote-session variable is set in your environment, unset it and start Claude Code again; otherwise sign in again (claude auth login).`;
    case "ok":
    case "none_configured":
    case "not_required":
    case undefined:
      return;
  }
}
//@ chunk-c18v4hz4.js:16305-16457 placement
function retryHint(decision) {
  switch (decision.surface) {
    case "startup":
      return "Retrying;";
    case "noninteractive":
      return "Run the command again;";
    case "login":
      return "Retry shortly;";
  }
}
export { hasOpusAccess, currentGateOutcomes, orgConfigContext, orgConfigGateMessage, currentSettingsOutcome };
