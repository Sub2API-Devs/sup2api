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
  isBigQueryMetricsEnabled_2,
  computeRemoteSettingsEligibilityUncached,
} from "../remoteManagedSettings/storedLoginSurface.js";
import { isGatewayServerProcess, isGatewayRequiredByHostPolicy } from "../../bootstrap/state.js";
import { machineAdminMayPinSignInOrg } from "../../utils/settings/settings.js";

//@ chunk-mdb2vxrz.js:996-1074 placement
/**
 * 是否为封闭（hermetic）远程会话。
 */
function isHermeticRemoteSession() {
  return env.CLAUDE_CODE_REMOTE && env.CLAUDE_CODE_REMOTE_HERMETIC_MODE;
}
//@ chunk-mdb2vxrz.js:1074-1092 placement
/**
 * 最近一次加载状态读取的缓存函数（由 r_i 注入）。
 */
var lastEligibilityCompute = null;
var lastLoadStatusGetter = null;
//@ chunk-mdb2vxrz.js:1092-1118 placement
/**
 * 注入远程设置资格计算与加载状态读取的实现。
 */
function setRemoteSettingsProbes(e, n) {
  lastEligibilityCompute = e;
  lastLoadStatusGetter = n;
}
//@ chunk-mdb2vxrz.js:1118-1152 placement
function _(e) {
  return lastEligibilityCompute?.(e) ?? null;
}
//@ chunk-mdb2vxrz.js:1152-1186 placement
/**
 * 读取缓存的远程设置加载状态（未注入时返回 null）。
 */
function getCachedLastLoadStatus(e) {
  return lastLoadStatusGetter?.(e) ?? null;
}
//@ chunk-mdb2vxrz.js:1186-1299 placement
/**
 * 远程托管设置的加载状态。
 */
function getRemoteSettingsLoadState() {
  let lastLoadStatus = getLastLoadStatus();
  if (lastLoadStatus) return lastLoadStatus;
  if (getEligibilityMemo() === false) {
    let ineligibleReason = getIneligibleReason();
    if (ineligibleReason)
      return {
        state: "ineligible",
        reason: ineligibleReason,
      };
  }
  return;
}
//@ chunk-mdb2vxrz.js:1299-1346 placement
/**
 * 是否应提示远程设置状态：资格已算出但还没加载过。
 */
function shouldWarnRemoteSettings() {
  return getEligibilityMemo() === true && getLastLoadStatus() === undefined;
}
//@ chunk-mdb2vxrz.js:1346-1488 placement
function isRemoteSettingsFetchFailed() {
  if (getEligibilityMemo() !== true) return false;
  let lastLoadStatus = getLastLoadStatus();
  if (lastLoadStatus !== undefined) return lastLoadStatus.state === "failed";
  let remoteManagedSettingsSyncFromCache = getRemoteManagedSettingsSyncFromCache();
  return (
    remoteManagedSettingsSyncFromCache === null ||
    Object.keys(remoteManagedSettingsSyncFromCache).length === 0
  );
}
//@ chunk-mdb2vxrz.js:1488-2672 placement
/**
 * 远程托管设置不适用的原因说明。
 */
function describeIneligibleReason(reason) {
  switch (reason) {
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
//@ chunk-mdb2vxrz.js:2672-3835 placement
/**
 * 远程设置拉取失败原因说明。
 */
function describeFetchFailure(errorKind, httpStatus) {
  switch (errorKind) {
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
      if (httpStatus === 204 || httpStatus === 404)
        return `answered by a network intermediary, not Anthropic (${httpStatus}); check this network's proxy`;
      return `client error${httpStatus ? ` (${httpStatus})` : ""}`;
    case "http_5xx":
      return `server error${httpStatus ? ` (${httpStatus})` : ""}`;
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
//@ chunk-mdb2vxrz.js:3835-4170 placement
/**
 * 是否需要提示远程设置状态。
 */
function shouldWarnRemoteSettings_2(remoteSettingsLoadState) {
  switch (remoteSettingsLoadState.state) {
    case "failed":
    case "stale_cache":
      return true;
    case "ok":
      return false;
    case "ineligible":
      return (
        remoteSettingsLoadState.reason === "third_party_provider" ||
        remoteSettingsLoadState.reason === "custom_base_url" ||
        remoteSettingsLoadState.reason === "hybrid_yields_to_device_policy" ||
        remoteSettingsLoadState.reason === "profile_base_url_mismatch" ||
        remoteSettingsLoadState.reason === "unpinned_gateway" ||
        remoteSettingsLoadState.reason === "host_gateway_not_accepted"
      );
  }
}
//@ chunk-mdb2vxrz.js:4170-4857 placement
/**
 * 远程设置状态的说明文字。
 */
function describeRemoteSettingsStatus(remoteSettingsLoadState) {
  switch (remoteSettingsLoadState.state) {
    case "ok":
      return remoteSettingsLoadState.hasSettings ? "loaded" : "none configured for this organization";
    case "stale_cache":
      return `fetch failed \u2014 using stale cache (${describeFetchFailure(remoteSettingsLoadState.failure.errorKind, remoteSettingsLoadState.failure.httpStatus)})${remoteSettingsLoadState.transportEnvWithheld ? "; proxy/CA/provider env withheld until a fetch succeeds" : ""}`;
    case "failed": {
      let n = `fetch failed \u2014 ${remoteSettingsLoadState.restrictionsOnly ? "the stale cache's restrictions still apply" : "no policy applied"} (${describeFetchFailure(remoteSettingsLoadState.failure.errorKind, remoteSettingsLoadState.failure.httpStatus)})`;
      return remoteSettingsLoadState.restrictionsOnly && !n.includes("`claude auth")
        ? `${n}; to clear them, run \`claude auth logout\` (signs out of all accounts)`
        : n;
    }
    case "ineligible":
      return `not fetched \u2014 ${describeIneligibleReason(remoteSettingsLoadState.reason)}`;
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
//@ chunk-mdb2vxrz.js:4912-5026 placement = getBridgeBaseUrl (1)
/**
 * 判断 API 基址是否为官方（未设置或与 OAuth BASE_API_URL 同 host）。
 */
function getBridgeBaseUrl(baseURL = env.ANTHROPIC_BASE_URL || getWIFProfileBaseUrl()) {
  if (!baseURL) return true;
  let urlHost = getUrlHost(getOauthConfig().BASE_API_URL);
  return urlHost !== undefined && getUrlHost(baseURL) === urlHost;
}
//@ chunk-mdb2vxrz.js:5026-5046 placement
/**
 * 重置远程设置同步缓存。
 */
function resetRemoteSettingsSyncCache() {
  resetSyncCache();
}
//@ chunk-mdb2vxrz.js:5046-5074 placement
/**
 * 根据资格计算结果把组织 pin 写进已存凭据。
 */
function persistOrgPinFromEligibility() {
  setStoredCopyOrgPin(readOrgPinState(computeRemoteSettingsEligibility()));
}
//@ chunk-mdb2vxrz.js:5074-5199 placement
function readOrgPinState(e) {
  if (!isSettingsGateSettled() && !isStoredLoginRemoteSettingsCredential(e))
    return {
      kind: "unreadable",
    };
  try {
    return {
      kind: "read",
      orgs: describeMdmSettingsState(),
    };
  } catch {
    return {
      kind: "unreadable",
    };
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
    let storedOAuthSubscriptionType = getStoredOAuthSubscriptionType();
    return storedOAuthSubscriptionType === "enterprise" || storedOAuthSubscriptionType === "team"
      ? getStoredOauthAccountInfo()?.organizationUuid || undefined
      : undefined;
  }
  return;
}
//@ chunk-mdb2vxrz.js:5372-5649 placement
function isStoredLoginRemoteSettingsCredential(remoteSettingsEligibility, n = false) {
  try {
    if (getRemoteSettingsOrgUuid(remoteSettingsEligibility) === undefined) return false;
    let { kind } = classifyRemoteSettingsCredential();
    return (
      kind !== "api_key" &&
      kind !== "host_bearer" &&
      (n || kind !== "profile") &&
      getClaudeAIOAuthTokenOrigin() === "store"
    );
  } catch (error) {
    if (getErrnoCode(error) !== undefined) {
      logForDebugging(`Remote settings: could not read the profile store: ${errorMessage(error)}`, {
        level: "error",
      });
      return true;
    }
    logError(error);
    return true;
  }
}
//@ chunk-mdb2vxrz.js:5649-5908 placement
function classifyRemoteSettingsCredential() {
  if (isClaudeAISubscriber() && isBigQueryMetricsEnabled_2() && hasUsableClaudeAILogin())
    return {
      kind: "org_login",
    };
  try {
    let { key } = getAnthropicApiKeyWithSource({
      skipRetrievingKeyFromApiKeyHelper: true,
    });
    if (key)
      return {
        kind: "api_key",
        key,
      };
  } catch {}
  let e = hostOrgSignInBearer();
  if (e !== undefined)
    return {
      kind: "host_bearer",
      bearer: e,
    };
  return {
    kind: isProfileRemoteSettingsCredential() ? "profile" : "login",
  };
}
//@ chunk-mdb2vxrz.js:5908-6448 placement
/**
 * 计算远程托管设置资格（混合登录、组织等）。
 */
function computeRemoteSettingsEligibility() {
  let eligibilityMemo = getEligibilityMemo();
  if (eligibilityMemo !== undefined) return eligibilityMemo;
  let {
    eligible,
    ineligibleReason,
    hybridOrganizationUuid,
    hybridSignInEnded,
    hybridBlockFilter,
    hybridProviderFromOrganization,
    hybridOnlyForConnection,
  } = computeRemoteSettingsEligibilityUncached();
  setSessionUsesGatewayVariable(env.CLAUDE_CODE_USE_GATEWAY === true);
  setSessionHybridOrganizationUuid(
    hybridOrganizationUuid ?? null,
    hybridSignInEnded === true,
    hybridBlockFilter ?? null,
    hybridProviderFromOrganization === true,
    hybridOnlyForConnection === true,
  );
  if (eligible && hybridOrganizationUuid === undefined)
    setStoredCopyGateInputs({
      readAccount: getStoredOauthAccountInfo,
      covers:
        getAPIProvider() !== "gateway" ||
        (isGatewayAuthRestoredFromStore() && !isGatewayServerProcess() && !isGatewayRequiredByHostPolicy()),
      orgPin: readOrgPinState(eligible),
      mayHideDialog: () => isStoredLoginRemoteSettingsCredential(computeRemoteSettingsEligibility()),
      writesForHiddenDialog: () =>
        isStoredLoginRemoteSettingsCredential(computeRemoteSettingsEligibility(), true),
    });
  let H = env.CLAUDE_CODE_EVAL_CONFINED === true;
  let evalPolicySnapshotOnly = !eligible && H;
  setEvalPolicySnapshotOnly(evalPolicySnapshotOnly);
  let y = eligible || evalPolicySnapshotOnly;
  return rememberEligibility(y, y ? undefined : ineligibleReason);
}
//@ chunk-mdb2vxrz.js:6448-6503 placement
/**
 * 当前凭据是否可参与远程托管设置（BigQuery 开启，或已有 OAuth 令牌且订阅类型未知/可 pin）。
 */
function isRemoteSettingsEligibleForCredential() {
  return (
    isBigQueryMetricsEnabled_2() ||
    (hasStoredOAuthToken() && (getStoredOAuthSubscriptionType() === null || machineAdminMayPinSignInOrg()))
  );
}
export {
  getRemoteSettingsLoadState,
  shouldWarnRemoteSettings_2,
  describeRemoteSettingsStatus,
  resetRemoteSettingsSyncCache,
  describeFetchFailure,
  isHermeticRemoteSession,
  computeRemoteSettingsEligibility,
  shouldWarnRemoteSettings,
  classifyRemoteSettingsCredential,
  getBridgeBaseUrl,
  persistOrgPinFromEligibility,
  isRemoteSettingsFetchFailed,
  _,
  getCachedLastLoadStatus,
  isRemoteSettingsEligibleForCredential,
  setRemoteSettingsProbes,
  getRemoteSettingsOrgUuid,
};
