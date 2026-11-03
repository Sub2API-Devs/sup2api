/**
 * services/remoteManagedSettings/storedLoginSurface.ts
 *
 * 2.1.316 新增：计算远程托管设置资格（hermetic、网关、第一方、自定义 base URL 等）；判断当前凭据来源是否跳过存储登录面（文件描述符令牌、自定义头等）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-mdb2vxrz.js (12)
 * attribution: placement 12
 */
import {
  hasStoredOAuthToken,
  getStoredOAuthSubscriptionType,
  isClaudeAIOAuthTokenHostInjected,
  isHostManagedProviderAuth,
  isFirstPartyManagedOAuthContext,
  effectiveAuthTokenEnv,
  isProfileRemoteSettingsCredential,
  getAnthropicApiKeyWithSource,
  hostOrgSignInBearer,
  getStoredOAuthTierVerifiedAt,
} from "../../utils/auth.js";
import { heldMachinePinsSignIn, getRemoteSettingsPathOverride } from "./remoteSettingsState.js";
import { machineAdminPinsSignInOrg } from "../../utils/settings/settings.js";
import { ave } from "../../utils/settings/managedPluginTiers.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { env } from "../../utils/env.js";
import { isHermeticRemoteSession, _, S, getBridgeBaseUrl, T } from "../cloudSessions/eligibility.js";
import { hasManagedSettings } from "../../utils/settings/managedRestrictionKeys.js";
import { spareAuthIneligibility } from "../../entrypoints/warmSpare/claimCredentials.js";
import { Gx } from "../../utils/managedEnvConstants.js";
import { v$, getApiKeyFromFileDescriptor } from "../../utils/authFileDescriptor.js";
import { getCustomHeaders } from "../api/client.js";
import { hasCustomAuthorizationHeader, hasCustomApiKeyHeader } from "../api/customHeaders.js";
import { isChatOrTeams } from "../../utils/entrypointKinds.js";
import { op, mn } from "../../utils/remoteEnvironment.js";
import { checkRemoteAgentEligibility } from "../../tasks/RemoteAgentTask/RemoteAgentTask.js";
import { getAPIProvider, isFirstPartyAnthropicBaseUrl } from "../../utils/model/providers.js";
import { getGatewayAuth, gatewayServesManagedSettings } from "../../bootstrap/state.js";
import { resolveOrgConfigPlan } from "../policyLimits/index.js";
import { ge } from "../../utils/identity.js";

//@ chunk-mdb2vxrz.js:6591-6686 placement = isBigQueryMetricsEnabled (1)
function isBigQueryMetricsEnabled() {
  if (!hasStoredOAuthToken()) return !1;
  let subscriptionType = getStoredOAuthSubscriptionType();
  return (
    subscriptionType === "enterprise" ||
    subscriptionType === "team" ||
    heldMachinePinsSignIn(machineAdminPinsSignInOrg, ave)
  );
}
//@ chunk-mdb2vxrz.js:6686-6904 placement
function hasStoredClaudeAiLogin() {
  try {
    return hasStoredOAuthToken() && !isClaudeAIOAuthTokenHostInjected();
  } catch (error) {
    return (
      logForDebugging(
        `Remote settings: could not read the claude.ai login (${errorMessage(error)}); treating it as the stored login, so this session's surface skip does not apply`,
        { level: "warn" },
      ),
      !0
    );
  }
}
//@ chunk-mdb2vxrz.js:6904-7012 placement
function isLocalAgentEntrypoint() {
  let CLAUDE_CODE_ENTRYPOINT = env.CLAUDE_CODE_ENTRYPOINT;
  return (
    CLAUDE_CODE_ENTRYPOINT === "local-agent" || CLAUDE_CODE_ENTRYPOINT?.startsWith("claude-coworker") === !0
  );
}
//@ chunk-mdb2vxrz.js:7012-7087 placement
function a_i() {
  return (
    isHermeticRemoteSession() ||
    (hasManagedSettings() && spareAuthIneligibility() !== null) ||
    isLocalAgentEntrypoint() ||
    C("for_stored_login")
  );
}
//@ chunk-mdb2vxrz.js:7087-7128 placement
var u = [...Gx, "ANTHROPIC_CUSTOM_HEADERS"];
/**
 * 判断当前凭据来源是否跳过存储登录面（文件描述符令牌、自定义头等）。
 */
//@ chunk-mdb2vxrz.js:7128-7789 placement
function isStoredLoginSurfaceSkipped() {
  try {
    if (isHostManagedProviderAuth()) return !0;
    if (v$("CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR") || v$("CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR")) return !0;
    let e = _(u),
      n = S(u),
      r = e && n ? new Map(u.map((o) => [o, [n(o), e(o)].flatMap((a) => (a?.trim() ? [a] : []))])) : null;
    return (
      (!isFirstPartyManagedOAuthContext() &&
        (getApiKeyFromFileDescriptor() !== null ||
          (r ? Gx.some((o) => !!r.get(o)?.length) : !!env.ANTHROPIC_API_KEY || !!effectiveAuthTokenEnv()))) ||
      (r
        ? !!r
            .get("ANTHROPIC_CUSTOM_HEADERS")
            ?.some((o) =>
              getCustomHeaders(o).some(([a]) => ["authorization", "x-api-key"].includes(a.toLowerCase())),
            ) || !!r.get("CLAUDE_CODE_OAUTH_TOKEN")?.length
        : hasCustomAuthorizationHeader() || hasCustomApiKeyHeader()) ||
      isClaudeAIOAuthTokenHostInjected()
    );
  } catch (error) {
    return (
      logForDebugging(
        `Remote settings: could not read the host's credential (${errorMessage(error)}); keeping the surface's settings skip`,
        { level: "warn" },
      ),
      !0
    );
  }
}
//@ chunk-mdb2vxrz.js:7789-7861 placement
function C(e) {
  return (
    isChatOrTeams() &&
    !op() &&
    (mn() || isStoredLoginSurfaceSkipped() || (e === "for_session" && !hasStoredClaudeAiLogin()))
  );
}
/**
 * 计算远程托管设置资格（hermetic、网关、第一方、自定义 base URL 等）。
 */
//@ chunk-mdb2vxrz.js:7861-8991 placement
function computeRemoteSettingsEligibilityUncached() {
  if (getRemoteSettingsPathOverride()) return { eligible: !0 };
  if (isHermeticRemoteSession()) return { eligible: !1, ineligibleReason: "hermetic_remote_session" };
  if (hasManagedSettings()) return checkRemoteAgentEligibility();
  if (getAPIProvider() === "gateway") {
    let o = getGatewayAuth(),
      a = gatewayServesManagedSettings(o);
    return {
      eligible: a,
      ineligibleReason: a
        ? void 0
        : o?.hostVerdict !== void 0
          ? "host_gateway_not_accepted"
          : "unpinned_gateway",
    };
  }
  let e =
    getAPIProvider() !== "firstParty"
      ? "third_party_provider"
      : !isFirstPartyAnthropicBaseUrl()
        ? "custom_base_url"
        : void 0;
  if (e) return R(!1) ?? { eligible: !1, ineligibleReason: e };
  if (isLocalAgentEntrypoint()) return { eligible: !1, ineligibleReason: "sandboxed_entrypoint" };
  if (C("for_session")) return { eligible: !1, ineligibleReason: "claude_tag" };
  let n = !1;
  try {
    n = isProfileRemoteSettingsCredential();
  } catch (error) {
    logForDebugging(
      `Remote settings: could not read the profile store (${errorMessage(error)}); not treating this session as profile-authenticated`,
      { level: "warn" },
    );
  }
  if (n)
    return getBridgeBaseUrl()
      ? { eligible: !0 }
      : { eligible: !1, ineligibleReason: "profile_base_url_mismatch" };
  if (T()) return { eligible: !0 };
  try {
    let { key: key } = getAnthropicApiKeyWithSource({ skipRetrievingKeyFromApiKeyHelper: !0 });
    if (key) return { eligible: !0 };
  } catch {}
  if (hostOrgSignInBearer() !== void 0) return { eligible: !0 };
  let r = R(!0);
  if (r !== null) return r;
  if (
    hasStoredOAuthToken() &&
    resolveOrgConfigPlan(getStoredOAuthSubscriptionType(), getStoredOAuthTierVerifiedAt()) === null
  )
    return { eligible: !0 };
  return { eligible: !1, ineligibleReason: hasStoredOAuthToken() ? "unsupported_subscription" : "no_auth" };
}
//@ chunk-mdb2vxrz.js:8991-9019 placement
function l_i(e = !0) {
  return !1;
}
//@ chunk-mdb2vxrz.js:9019-9167 placement
var storedLoginNoteState = ge({ isNoted: !1, hybridOrganizationUuid: null, hasReportedRefusal: !1 }, (e) => {
  ((e.isNoted = !1), (e.hybridOrganizationUuid = null), (e.hasReportedRefusal = !1));
});
//@ chunk-mdb2vxrz.js:9167-9189 placement
function d_i() {
  return;
}
//@ chunk-mdb2vxrz.js:9189-9215 placement
function R(e) {
  return null;
}

export { l_i, isBigQueryMetricsEnabled, d_i, computeRemoteSettingsEligibilityUncached, a_i };
