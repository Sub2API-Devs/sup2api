/**
 * services/cloudSessions/eligibility.ts
 *
 * 2.1.316 新增：远程托管设置不适用的原因说明；远程设置拉取失败原因说明等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-mdb2vxrz.js (22)
 * attribution: placement 22
 */
import { env } from "../../utils/env.js";
import {
  getLastLoadStatus,
  getEligibilityMemo,
  getIneligibleReason,
  resetSyncCache,
  setStoredCopyOrgPin,
  getSessionUsesGatewayVariable,
  getSessionHybridOrganizationUuid,
  setSessionUsesGatewayVariable,
  setSessionHybridOrganizationUuid,
  setStoredCopyGateInputs,
  setEvalPolicySnapshotOnly,
  rememberEligibility,
} from "../remoteManagedSettings/remoteSettingsState.js";
import { getRemoteManagedSettingsSyncFromCache } from "../remoteManagedSettings/remoteSettingsCache.js";
import { getWIFProfileBaseUrl } from "../../utils/wifProfile.js";
import { getOauthConfig, fileSuffixForOauthConfig } from "../../constants/oauth.js";
import { isSettingsGateSettled } from "../../utils/settings/settingsSourceTrust.js";
import { describeMdmSettingsState } from "../../utils/settings/mdm/settings.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import {
  getStoredOAuthSubscriptionType,
  getStoredOauthAccountInfo,
  getClaudeAIOAuthTokenOrigin,
  isClaudeAISubscriber,
  hasUsableClaudeAILogin,
  getAnthropicApiKeyWithSource,
  hostOrgSignInBearer,
  isProfileRemoteSettingsCredential,
  isGatewayAuthRestoredFromStore,
  hasStoredOAuthToken,
} from "../../utils/auth.js";
import { getErrnoCode, errorMessage } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";
import {
  isBigQueryMetricsEnabled,
  computeRemoteSettingsEligibilityUncached,
} from "../remoteManagedSettings/storedLoginSurface.js";
import { isGatewayServerProcess, isGatewayRequiredByHostPolicy } from "../../bootstrap/state.js";
import { machineAdminMayPinSignInOrg } from "../../utils/settings/settings.js";

/**
 * 是否为封闭（hermetic）远程会话。
 */
//@ chunk-mdb2vxrz.js:996-1074 placement
function isHermeticRemoteSession() {
  return env.CLAUDE_CODE_REMOTE && env.CLAUDE_CODE_REMOTE_HERMETIC_MODE;
}
//@ chunk-mdb2vxrz.js:1074-1092 placement
var m = null,
  b = null;
//@ chunk-mdb2vxrz.js:1092-1118 placement
function r_i(e, n) {
  ((m = e), (b = n));
}
//@ chunk-mdb2vxrz.js:1118-1152 placement
function _(e) {
  return m?.(e) ?? null;
}
//@ chunk-mdb2vxrz.js:1152-1186 placement
function S(e) {
  return b?.(e) ?? null;
}
/**
 * 远程托管设置的加载状态。
 */
//@ chunk-mdb2vxrz.js:1186-1299 placement
function getRemoteSettingsLoadState() {
  let e = getLastLoadStatus();
  if (e) return e;
  if (getEligibilityMemo() === !1) {
    let n = getIneligibleReason();
    if (n) return { state: "ineligible", reason: n };
  }
  return;
}
//@ chunk-mdb2vxrz.js:1299-1346 placement
function o_i() {
  return getEligibilityMemo() === !0 && getLastLoadStatus() === void 0;
}
//@ chunk-mdb2vxrz.js:1346-1488 placement
function isRemoteSettingsFetchFailed() {
  if (getEligibilityMemo() !== !0) return !1;
  let e = getLastLoadStatus();
  if (e !== void 0) return e.state === "failed";
  let n = getRemoteManagedSettingsSyncFromCache();
  return n === null || Object.keys(n).length === 0;
}
/**
 * 远程托管设置不适用的原因说明。
 */
//@ chunk-mdb2vxrz.js:1488-2672 placement
function describeIneligibleReason(e) {
  switch (e) {
    case "third_party_provider":
      return "not available on Bedrock/Vertex/third-party providers";
    case "custom_base_url":
      return "not available with a custom ANTHROPIC_BASE_URL";
    case "hybrid_yields_to_device_policy":
      return "";
    case "profile_base_url_mismatch":
      return "not available: the active profile's base_url is not the Anthropic API host";
    case "sandboxed_entrypoint":
      return "not available in sandboxed sessions";
    case "claude_tag":
      return "Claude in Slack and Claude in Teams sessions don't apply server-managed settings; organization policy limits are decided separately";
    case "hermetic_remote_session":
      return "not available in hermetic remote sessions";
    case "unpinned_gateway":
      return "gateway auth is unpinned; run `claude auth login` to pin";
    case "host_gateway_not_accepted":
      return "Claude Desktop's gateway is not an accepted source of managed settings on this machine (not the gateway its managed settings name in forceLoginGatewayUrl, not on your organization's network, or not reached over https); contact your administrator";
    case "unsupported_subscription":
      return "requires an Enterprise or Team subscription";
    case "no_auth":
      return "no usable credentials for the settings fetch";
  }
}
/**
 * 远程设置拉取失败原因说明。
 */
//@ chunk-mdb2vxrz.js:2672-3835 placement
function describeFetchFailure(e, n) {
  switch (e) {
    case "no_auth_available":
      return "no credentials available";
    case "profile_credential_error":
      return "the profile credential could not authenticate the fetch (details in the debug log)";
    case "api_key_not_sent":
    case "http_401":
      return "authentication rejected (401)";
    case "http_403":
      return "access denied (403)";
    case "http_4xx":
      if (n === 204 || n === 404)
        return `answered by a network intermediary, not Anthropic (${n}); check this network's proxy`;
      return `client error${n ? ` (${n})` : ""}`;
    case "http_5xx":
      return `server error${n ? ` (${n})` : ""}`;
    case "timeout":
      return "request timed out";
    case "network_error":
      return "network error";
    case "gateway_cert_mismatch":
      return "gateway certificate mismatch";
    case "gateway_pin_refused":
      return "gateway TLS pin is in a symlinked credentials file";
    case "gateway_pin_unreadable":
      return "gateway TLS pin could not be read from the credentials file";
    case "gateway_public_address":
      return "gateway host resolved to a public address at fetch time";
    case "parse_error":
      return "server response could not be parsed";
    case "ruled_empty":
      return "no setting in the server response could be applied as written";
    case "unknown_error":
      return "unexpected error";
  }
}
/**
 * 是否需要提示远程设置状态。
 */
//@ chunk-mdb2vxrz.js:3835-4170 placement
function shouldWarnRemoteSettings(e) {
  switch (e.state) {
    case "failed":
    case "stale_cache":
      return !0;
    case "ok":
      return !1;
    case "ineligible":
      return (
        e.reason === "third_party_provider" ||
        e.reason === "custom_base_url" ||
        e.reason === "hybrid_yields_to_device_policy" ||
        e.reason === "profile_base_url_mismatch" ||
        e.reason === "unpinned_gateway" ||
        e.reason === "host_gateway_not_accepted"
      );
  }
}
/**
 * 远程设置状态的说明文字。
 */
//@ chunk-mdb2vxrz.js:4170-4857 placement
function describeRemoteSettingsStatus(e) {
  switch (e.state) {
    case "ok":
      return e.hasSettings ? "loaded" : "none configured for this organization";
    case "stale_cache":
      return `fetch failed \u2014 using stale cache (${describeFetchFailure(e.failure.errorKind, e.failure.httpStatus)})${e.transportEnvWithheld ? "; proxy/CA/provider env withheld until a fetch succeeds" : ""}`;
    case "failed": {
      let n = `fetch failed \u2014 ${e.restrictionsOnly ? "the stale cache's restrictions still apply" : "no policy applied"} (${describeFetchFailure(e.failure.errorKind, e.failure.httpStatus)})`;
      return e.restrictionsOnly && !n.includes("`claude auth")
        ? `${n}; to clear them, run \`claude auth logout\` (signs out of all accounts)`
        : n;
    }
    case "ineligible":
      return `not fetched \u2014 ${describeIneligibleReason(e.reason)}`;
  }
}
//@ chunk-mdb2vxrz.js:4857-4912 placement
function getUrlHost(e) {
  try {
    return new URL(e).host;
  } catch {
    return;
  }
}
/**
 * 判断 API 基址是否为官方（未设置或与 OAuth BASE_API_URL 同 host）。
 */
//@ chunk-mdb2vxrz.js:4912-5026 placement = getBridgeBaseUrl (1)
function getBridgeBaseUrl(e = env.ANTHROPIC_BASE_URL || getWIFProfileBaseUrl()) {
  if (!e) return !0;
  let n = getUrlHost(getOauthConfig().BASE_API_URL);
  return n !== void 0 && getUrlHost(e) === n;
}
/**
 * 重置远程设置同步缓存。
 */
//@ chunk-mdb2vxrz.js:5026-5046 placement
function resetRemoteSettingsSyncCache() {
  resetSyncCache();
}
//@ chunk-mdb2vxrz.js:5046-5074 placement
function i_i() {
  setStoredCopyOrgPin(readOrgPinState(computeRemoteSettingsEligibility()));
}
//@ chunk-mdb2vxrz.js:5074-5199 placement
function readOrgPinState(e) {
  if (!isSettingsGateSettled() && !isStoredLoginRemoteSettingsCredential(e)) return { kind: "unreadable" };
  try {
    return { kind: "read", orgs: describeMdmSettingsState() };
  } catch {
    return { kind: "unreadable" };
  }
}
//@ chunk-mdb2vxrz.js:5199-5372 placement
function getRemoteSettingsOrgUuid(e) {
  {
    if (
      !e ||
      getAPIProvider() === "gateway" ||
      getSessionUsesGatewayVariable() ||
      getSessionHybridOrganizationUuid() !== null ||
      fileSuffixForOauthConfig() !== ""
    )
      return;
    let n = getStoredOAuthSubscriptionType();
    return n === "enterprise" || n === "team"
      ? getStoredOauthAccountInfo()?.organizationUuid || void 0
      : void 0;
  }
  return;
}
//@ chunk-mdb2vxrz.js:5372-5649 placement
function isStoredLoginRemoteSettingsCredential(e, n = !1) {
  try {
    if (getRemoteSettingsOrgUuid(e) === void 0) return !1;
    let { kind: kind } = classifyRemoteSettingsCredential();
    return (
      kind !== "api_key" &&
      kind !== "host_bearer" &&
      (n || kind !== "profile") &&
      getClaudeAIOAuthTokenOrigin() === "store"
    );
  } catch (error) {
    if (getErrnoCode(error) !== void 0)
      return (
        logForDebugging(`Remote settings: could not read the profile store: ${errorMessage(error)}`, {
          level: "error",
        }),
        !0
      );
    return (logError(error), !0);
  }
}
//@ chunk-mdb2vxrz.js:5649-5908 placement
function classifyRemoteSettingsCredential() {
  if (isClaudeAISubscriber() && isBigQueryMetricsEnabled() && hasUsableClaudeAILogin())
    return { kind: "org_login" };
  try {
    let { key: key } = getAnthropicApiKeyWithSource({ skipRetrievingKeyFromApiKeyHelper: !0 });
    if (key) return { kind: "api_key", key: key };
  } catch {}
  let e = hostOrgSignInBearer();
  if (e !== void 0) return { kind: "host_bearer", bearer: e };
  return { kind: isProfileRemoteSettingsCredential() ? "profile" : "login" };
}
/**
 * 计算远程托管设置资格（混合登录、组织等）。
 */
//@ chunk-mdb2vxrz.js:5908-6448 placement
function computeRemoteSettingsEligibility() {
  let e = getEligibilityMemo();
  if (e !== void 0) return e;
  let {
    eligible: eligible,
    ineligibleReason: ineligibleReason,
    hybridOrganizationUuid: hybridOrganizationUuid,
    hybridSignInEnded: hybridSignInEnded,
    hybridBlockFilter: hybridBlockFilter,
    hybridProviderFromOrganization: hybridProviderFromOrganization,
    hybridOnlyForConnection: hybridOnlyForConnection,
  } = computeRemoteSettingsEligibilityUncached();
  if (
    (setSessionUsesGatewayVariable(env.CLAUDE_CODE_USE_GATEWAY === !0),
    setSessionHybridOrganizationUuid(
      hybridOrganizationUuid ?? null,
      hybridSignInEnded === !0,
      hybridBlockFilter ?? null,
      hybridProviderFromOrganization === !0,
      hybridOnlyForConnection === !0,
    ),
    eligible && hybridOrganizationUuid === void 0)
  )
    setStoredCopyGateInputs({
      readAccount: getStoredOauthAccountInfo,
      covers:
        getAPIProvider() !== "gateway" ||
        (isGatewayAuthRestoredFromStore() && !isGatewayServerProcess() && !isGatewayRequiredByHostPolicy()),
      orgPin: readOrgPinState(eligible),
      mayHideDialog: () => isStoredLoginRemoteSettingsCredential(computeRemoteSettingsEligibility()),
      writesForHiddenDialog: () =>
        isStoredLoginRemoteSettingsCredential(computeRemoteSettingsEligibility(), !0),
    });
  let H = env.CLAUDE_CODE_EVAL_CONFINED === !0,
    p = !eligible && H;
  setEvalPolicySnapshotOnly(p);
  let y = eligible || p;
  return rememberEligibility(y, y ? void 0 : ineligibleReason);
}
//@ chunk-mdb2vxrz.js:6448-6503 placement
function T() {
  return (
    isBigQueryMetricsEnabled() ||
    (hasStoredOAuthToken() && (getStoredOAuthSubscriptionType() === null || machineAdminMayPinSignInOrg()))
  );
}

export {
  getRemoteSettingsLoadState,
  shouldWarnRemoteSettings,
  describeRemoteSettingsStatus,
  resetRemoteSettingsSyncCache,
  describeFetchFailure,
  isHermeticRemoteSession,
  computeRemoteSettingsEligibility,
  o_i,
  classifyRemoteSettingsCredential,
  getBridgeBaseUrl,
  i_i,
  isRemoteSettingsFetchFailed,
  _,
  S,
  T,
  r_i,
  getRemoteSettingsOrgUuid,
};
