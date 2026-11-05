/**
 * services/remoteManagedSettings/storedLoginSurface.ts
 *
 * 2.1.316 新增：计算远程托管设置资格（hermetic、网关、第一方、自定义 base URL 等）；判断当前凭据来源是否跳过存储登录面（文件描述符令牌、自定义头等）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-pqw3c7pj.js (12)
 * attribution: placement 12
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { hasMdmResult } from "../../utils/settings/mdm/mdmLoader.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { env } from "../../utils/env.js";
import {
  isHermeticRemoteSession,
  _,
  getCachedLastLoadStatus,
  getBridgeBaseUrl,
  isRemoteSettingsEligibleForCredential,
} from "../cloudSessions/eligibility.js";
import { hasManagedSettings } from "../../utils/settings/managedRestrictionKeys.js";
import { spareAuthIneligibility } from "../../entrypoints/warmSpare/claimCredentials.js";
import { PROVIDER_CREDENTIAL_ENV_VARS } from "../../utils/managedEnvConstants.js";
import {
  hasPossibleCredentialFromDescriptor,
  getApiKeyFromFileDescriptor,
} from "../../utils/authFileDescriptor.js";
import { getCustomHeaders } from "../api/client.js";
import { hasCustomAuthorizationHeader, hasCustomApiKeyHeader } from "../api/customHeaders.js";
import { isChatOrTeams } from "../../utils/entrypointKinds.js";
import { isByocEnvironment, isRemoteManagedEnvironment } from "../../utils/remoteEnvironment.js";
import { checkRemoteAgentEligibility } from "../../tasks/RemoteAgentTask/RemoteAgentTask.js";
import { getAPIProvider, isFirstPartyAnthropicBaseUrl } from "../../utils/model/providers.js";
import { getGatewayAuth, gatewayServesManagedSettings } from "../../bootstrap/state.js";
import { resolveOrgConfigPlan } from "../policyLimits/index.js";
import { identity } from "../../utils/identity.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-pqw3c7pj.js:6551-6646 placement (2.1.88 match: isBigQueryMetricsEnabled, 1)
function isBigQueryMetricsEnabled_2() {
  if (!hasStoredOAuthToken()) return false;
  let subscriptionType = getStoredOAuthSubscriptionType();
  return (
    subscriptionType === "enterprise" ||
    subscriptionType === "team" ||
    heldMachinePinsSignIn(machineAdminPinsSignInOrg, hasMdmResult)
  );
}
//@ chunk-pqw3c7pj.js:6646-6864 placement
function hasStoredClaudeAiLogin() {
  try {
    return hasStoredOAuthToken() && !isClaudeAIOAuthTokenHostInjected();
  } catch (error) {
    logForDebugging(
      `Remote settings: could not read the claude.ai login (${errorMessage(error)}); treating it as the stored login, so this session's surface skip does not apply`,
      {
        level: "warn",
      },
    );
    return true;
  }
}
//@ chunk-pqw3c7pj.js:6864-6972 placement
function isLocalAgentEntrypoint() {
  let CLAUDE_CODE_ENTRYPOINT = env.CLAUDE_CODE_ENTRYPOINT;
  return (
    CLAUDE_CODE_ENTRYPOINT === "local-agent" || CLAUDE_CODE_ENTRYPOINT?.startsWith("claude-coworker") === true
  );
}
//@ chunk-pqw3c7pj.js:6972-7047 placement
/**
 * 判断是否应跳过存储登录面：hermetic 远程会话、托管设置下备用鉴权不合格、本地代理入口，或 chat/teams 的存储登录被取代。
 */
function isStoredLoginSurfaceShortcut() {
  return (
    isHermeticRemoteSession() ||
    (hasManagedSettings() && spareAuthIneligibility() !== null) ||
    isLocalAgentEntrypoint() ||
    isStoredLoginSurfaceSuperseded("for_stored_login")
  );
}
//@ chunk-pqw3c7pj.js:7047-7088 placement
/**
 * 判断存储登录面是否被跳过时要检查的环境变量清单（含自定义头）。
 */
var STORED_LOGIN_SURFACE_ENV_VARS; // deferred: uses ARTIFACT_PROVIDER_ENV_VARS (../../utils/managedEnvConstants.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-pqw3c7pj.js:7047", () => {
  STORED_LOGIN_SURFACE_ENV_VARS = [...PROVIDER_CREDENTIAL_ENV_VARS, "ANTHROPIC_CUSTOM_HEADERS"];
});
//@ chunk-pqw3c7pj.js:7088-7749 placement
/**
 * 判断当前凭据来源是否跳过存储登录面（文件描述符令牌、自定义头等）。
 */
function isStoredLoginSurfaceSkipped() {
  try {
    if (isHostManagedProviderAuth()) return true;
    if (
      hasPossibleCredentialFromDescriptor("CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR") ||
      hasPossibleCredentialFromDescriptor("CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR")
    )
      return true;
    let readEnv = _(STORED_LOGIN_SURFACE_ENV_VARS);
    let cachedLastLoadStatus = getCachedLastLoadStatus(STORED_LOGIN_SURFACE_ENV_VARS);
    let valuesByVar =
      readEnv && cachedLastLoadStatus
        ? new Map(
            STORED_LOGIN_SURFACE_ENV_VARS.map((name) => [
              name,
              [cachedLastLoadStatus(name), readEnv(name)].flatMap((value) => (value?.trim() ? [value] : [])),
            ]),
          )
        : null;
    return (
      (!isFirstPartyManagedOAuthContext() &&
        (getApiKeyFromFileDescriptor() !== null ||
          (valuesByVar
            ? PROVIDER_CREDENTIAL_ENV_VARS.some((name) => !!valuesByVar.get(name)?.length)
            : !!env.ANTHROPIC_API_KEY || !!effectiveAuthTokenEnv()))) ||
      (valuesByVar
        ? !!valuesByVar
            .get("ANTHROPIC_CUSTOM_HEADERS")
            ?.some((headerText) =>
              getCustomHeaders(headerText).some(([headerName]) =>
                ["authorization", "x-api-key"].includes(headerName.toLowerCase()),
              ),
            ) || !!valuesByVar.get("CLAUDE_CODE_OAUTH_TOKEN")?.length
        : hasCustomAuthorizationHeader() || hasCustomApiKeyHeader()) ||
      isClaudeAIOAuthTokenHostInjected()
    );
  } catch (error) {
    logForDebugging(
      `Remote settings: could not read the host's credential (${errorMessage(error)}); keeping the surface's settings skip`,
      {
        level: "warn",
      },
    );
    return true;
  }
}
//@ chunk-pqw3c7pj.js:7749-7821 placement
/**
 * 判断 chat/teams 会话里存储登录面是否已不适用（远程 OAuth、已跳过登录面，或会话内没有存储登录）。
 */
function isStoredLoginSurfaceSuperseded(way) {
  return (
    isChatOrTeams() &&
    !isByocEnvironment() &&
    (isRemoteManagedEnvironment() ||
      isStoredLoginSurfaceSkipped() ||
      (way === "for_session" && !hasStoredClaudeAiLogin()))
  );
}
//@ chunk-pqw3c7pj.js:7821-8951 placement
/**
 * 计算远程托管设置资格（hermetic、网关、第一方、自定义 base URL 等）。
 */
function computeRemoteSettingsEligibilityUncached() {
  if (getRemoteSettingsPathOverride())
    return {
      eligible: true,
    };
  if (isHermeticRemoteSession())
    return {
      eligible: false,
      ineligibleReason: "hermetic_remote_session",
    };
  if (hasManagedSettings()) return checkRemoteAgentEligibility();
  if (getAPIProvider() === "gateway") {
    let gatewayAuth = getGatewayAuth();
    let gatewayServesSettings = gatewayServesManagedSettings(gatewayAuth);
    return {
      eligible: gatewayServesSettings,
      ineligibleReason: gatewayServesSettings
        ? undefined
        : gatewayAuth?.hostVerdict !== undefined
          ? "host_gateway_not_accepted"
          : "unpinned_gateway",
    };
  }
  let eligibilityReason =
    getAPIProvider() !== "firstParty"
      ? "third_party_provider"
      : !isFirstPartyAnthropicBaseUrl()
        ? "custom_base_url"
        : undefined;
  if (eligibilityReason)
    return (
      eligibilityOverride(false) ?? {
        eligible: false,
        ineligibleReason: eligibilityReason,
      }
    );
  if (isLocalAgentEntrypoint())
    return {
      eligible: false,
      ineligibleReason: "sandboxed_entrypoint",
    };
  if (isStoredLoginSurfaceSuperseded("for_session"))
    return {
      eligible: false,
      ineligibleReason: "claude_tag",
    };
  let isProfileCredential = false;
  try {
    isProfileCredential = isProfileRemoteSettingsCredential();
  } catch (error) {
    logForDebugging(
      `Remote settings: could not read the profile store (${errorMessage(error)}); not treating this session as profile-authenticated`,
      {
        level: "warn",
      },
    );
  }
  if (isProfileCredential)
    return getBridgeBaseUrl()
      ? {
          eligible: true,
        }
      : {
          eligible: false,
          ineligibleReason: "profile_base_url_mismatch",
        };
  if (isRemoteSettingsEligibleForCredential())
    return {
      eligible: true,
    };
  try {
    let { key } = getAnthropicApiKeyWithSource({
      skipRetrievingKeyFromApiKeyHelper: true,
    });
    if (key)
      return {
        eligible: true,
      };
  } catch {}
  if (hostOrgSignInBearer() !== undefined)
    return {
      eligible: true,
    };
  let forced = eligibilityOverride(true);
  if (forced !== null) return forced;
  if (
    hasStoredOAuthToken() &&
    resolveOrgConfigPlan(getStoredOAuthSubscriptionType(), getStoredOAuthTierVerifiedAt()) === null
  )
    return {
      eligible: true,
    };
  return {
    eligible: false,
    ineligibleReason: hasStoredOAuthToken() ? "unsupported_subscription" : "no_auth",
  };
}
//@ chunk-pqw3c7pj.js:8951-8979 placement
/**
 * 恒返回 false 的开关：BigQuery 指标是否启用（预留）。
 */
function isBigQueryMetricsEnabled(defaultValue = true) {
  return false;
}
//@ chunk-pqw3c7pj.js:8979-9127 placement
var storedLoginNoteState; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-pqw3c7pj.js:8979", () => {
  storedLoginNoteState = identity(
    {
      isNoted: false,
      hybridOrganizationUuid: null,
      hasReportedRefusal: false,
    },
    (state) => {
      state.isNoted = false;
      state.hybridOrganizationUuid = null;
      state.hasReportedRefusal = false;
    },
  );
});
//@ chunk-pqw3c7pj.js:9127-9149 placement
/**
 * 记录登录界面的存储位置（供后续提示）。
 */
function noteStoredLoginSurface() {
  return;
}
//@ chunk-pqw3c7pj.js:9149-9175 placement
function eligibilityOverride(wantEligible) {
  return null;
}
export {
  isBigQueryMetricsEnabled,
  isBigQueryMetricsEnabled_2,
  noteStoredLoginSurface,
  computeRemoteSettingsEligibilityUncached,
  isStoredLoginSurfaceShortcut,
};
