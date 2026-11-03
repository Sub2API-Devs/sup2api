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

//@ chunk-c18v4hz4.js:10863-10961 placement = hasOpusAccess (1)
function hasOpusAccess(e) {
  switch (e) {
    case "max":
    case "pro":
    case "team":
    case "enterprise":
      return e;
    default:
      return;
  }
}
//@ chunk-c18v4hz4.js:10961-11919 placement
function orgConfigTelemetryFields(e) {
  let n = { hasAdmittedCache: e.hasCache, admittedCacheAgeMs: e.hasCache ? e.cacheAgeMs : void 0 };
  if (!e.eligible) return { ...n, reason: "not_attempted" };
  let r = !e.loadFromEarlierGeneration;
  if (e.liveVerdict || (r && e.loadState === "succeeded")) return { ...n, reason: "ok" };
  let latestLoad = e.latestLoad;
  if (latestLoad !== void 0)
    return latestLoad.succeeded
      ? { ...n, reason: "ok" }
      : {
          ...n,
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
  if (!r) return { ...n, reason: "unavailable_pending" };
  if (e.loadState === "not_started" || e.loadState === "in_flight") {
    let loadLastAttempt = e.loadLastAttempt;
    return loadLastAttempt === void 0
      ? { ...n, reason: "unavailable_pending" }
      : {
          ...n,
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
    ...n,
    reason: policyRefusalReason(
      e.loadErrorCode,
      e.loadCredentialState,
      e.loadHttpStatus,
      e.loadServerErrorType,
      e.loadServerErrorCode,
      e.loadServerAuthDenial,
    ),
    httpStatus: e.loadHttpStatus,
  };
}
//@ chunk-c18v4hz4.js:11919-11950 placement
function pe() {
  return orgConfigTelemetryFields(getPolicyLimitsGateSnapshot());
}
//@ chunk-c18v4hz4.js:11950-12000 placement
function currentSettingsOutcome() {
  return settingsOutcome(
    void 0,
    getLastLoadStatus(),
    getIneligibleReason(),
    storedSettingsState(),
    isOAuthEffective(),
  );
}
//@ chunk-c18v4hz4.js:12000-12048 placement
function currentGateOutcomes() {
  return { policy: pe(), settings: currentSettingsOutcome() };
}
//@ chunk-c18v4hz4.js:12048-12201 placement
function orgConfigContext(e, n) {
  let r = n === void 0 ? void 0 : e[n].httpStatus,
    o = getOauthAccountInfo()?.organizationName;
  return { organizationName: o === void 0 || o === null ? void 0 : stripControlChars(o), httpStatus: r };
}
//@ chunk-c18v4hz4.js:12201-12304 placement
var POLICY_ENDPOINTS_LABEL =
  "api.anthropic.com/api/claude_code/policy_limits and api.anthropic.com/api/claude_code/settings";
//@ chunk-c18v4hz4.js:12304-12421 placement
function organizationDisplayName(e) {
  let n = e.organizationName !== void 0 ? stripControlChars(e.organizationName).trim() : "";
  return n !== "" ? n : "Your organization";
}
//@ chunk-c18v4hz4.js:12421-12501 placement
function h(e) {
  return e.requestId !== void 0 ? ` Request id: ${stripControlChars(e.requestId)}.` : "";
}
/**
 * 把组织配置门控的阻止/拒绝结果转成给用户的说明文字（含组织名、HTTP 状态、恢复命令）。
 */
//@ chunk-c18v4hz4.js:12501-16305 placement
function orgConfigGateMessage(e, n = {}) {
  if (e.verdict === "pass" || e.verdict === "pass_cached" || e.verdict === "pass_exempt") return;
  switch (e.reason) {
    case "refused_credential":
      return "Your Claude session has expired. Sign in again to continue (claude auth login).";
    case "refused_not_entitled":
      return `${organizationDisplayName(n)} doesn't allow Claude Code for this account. Ask an admin of your organization, or sign in with a different account (claude auth login).${h(n)}`;
    case "refused_other":
      return `${organizationDisplayName(n)} refused this session's organization settings${n.httpStatus !== void 0 ? ` (HTTP ${n.httpStatus})` : ""}. Sign in again, or ask an admin of your organization.${h(n)}`;
    case "blocked_by_intermediary":
      return `Claude Code couldn't load your organization's settings: the reply came from a network proxy, not Anthropic${n.httpStatus !== void 0 ? ` (HTTP ${n.httpStatus}, no request id)` : ""}. ${organizationDisplayName(n)} requires these settings before a session can start. Ask IT to allow HTTPS to ${POLICY_ENDPOINTS_LABEL}, then retry.`;
    case "unavailable_timeout":
      return `Claude Code couldn't load your organization's settings (timed out). ${organizationDisplayName(n)} requires them before a session can start. ${retryHint(e)} check https://status.anthropic.com if this persists.${h(n)}`;
    case "unavailable_connect":
      return `Claude Code couldn't reach Anthropic to load your organization's settings (could not connect). ${organizationDisplayName(n)} requires them before a session can start. Check your network connection and retry; if you are on a corporate network, ask IT to allow HTTPS to ${POLICY_ENDPOINTS_LABEL}.`;
    case "unavailable_server":
      return `Claude Code couldn't load your organization's settings: Anthropic returned an error${n.httpStatus !== void 0 ? ` (HTTP ${n.httpStatus})` : ""}. ${organizationDisplayName(n)} requires them before a session can start. ${retryHint(e)} check https://status.anthropic.com if this persists.${h(n)}`;
    case "unavailable_rate_limited":
      return `Claude Code couldn't load your organization's settings: Anthropic asked it to retry shortly${n.httpStatus !== void 0 ? ` (HTTP ${n.httpStatus})` : ""}. ${organizationDisplayName(n)} requires them before a session can start. ${retryHint(e)} check https://status.anthropic.com if this persists.${h(n)}`;
    case "unavailable_credential_refresh":
      return e.surface === "noninteractive"
        ? `Claude Code couldn't verify your sign-in with Anthropic yet (its sign-in token was still being refreshed, often by another Claude Code process), so it couldn't load your organization's settings. ${organizationDisplayName(n)} requires them before a session can start. Run the command again; if this persists, sign in again (claude auth login).${h(n)}`
        : `Claude Code couldn't verify your sign-in with Anthropic yet, so it couldn't load your organization's settings. ${organizationDisplayName(n)} requires them before a session can start. ${retryHint(e)} if this persists, sign in again (claude auth login).${h(n)}`;
    case "unavailable_pending":
      return `Claude Code is still loading your organization's settings. ${organizationDisplayName(n)} requires them before a session can start; this usually takes a few seconds.`;
    case "unavailable_settings_unusable":
      return `Claude Code couldn't apply your organization's managed settings: none of the settings the server returned could be applied as written. ${organizationDisplayName(n)} requires them before a session can start. Ask your administrator to fix the published settings, then retry.${h(n)}`;
    case "client_no_credentials":
    case "client_error":
      return `Claude Code couldn't load your organization's settings because of an internal error. ${organizationDisplayName(n)} requires them before a session can start. Retry, and if this persists report it with /bug.${h(n)}`;
    case "not_attempted":
      return `Claude Code does not load your organization's settings in the mode this session was launched in, and ${organizationDisplayName(n)} requires them before a session can start. If CLAUDE_CODE_ENTRYPOINT or a remote-session variable is set in your environment, unset it and start Claude Code again; otherwise sign in again (claude auth login).`;
    case "ok":
    case "none_configured":
    case "not_required":
    case void 0:
      return;
  }
}
//@ chunk-c18v4hz4.js:16305-16457 placement
function retryHint(e) {
  switch (e.surface) {
    case "startup":
      return "Retrying;";
    case "noninteractive":
      return "Run the command again;";
    case "login":
      return "Retry shortly;";
  }
}

export { hasOpusAccess, currentGateOutcomes, orgConfigContext, orgConfigGateMessage, currentSettingsOutcome };
