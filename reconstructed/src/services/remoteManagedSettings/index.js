/**
 * services/remoteManagedSettings/index.ts
 *
 * 远程托管设置：端点 /api/claude_code/settings（网关模式 /managed/settings），ETag/checksum 缓存到 remote-settings.json，启动时等待与后台刷新，校验后作为 policySettings 的 remote 层。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/remoteManagedSettings/index.ts
 * pieces: chunk-4pc1m5n9.js (34)
 * attribution: placement 13, fingerprint 5, layout 5, file-local 1, sole-consumer 7, callgraph-fingerprint 1, affinity 1, callgraph-witnessed 1
 */
import { readFile } from "fs/promises";
import { createHash } from "crypto";
import { env } from "../../utils/env.js";
import {
  getAPIProvider,
  isActualFirstPartyAnthropicBaseUrl,
  hasCustomBaseUrlForAnalytics,
} from "../../utils/model/providers.js";
import { getPolicyLimitsTunnelSocket } from "../policyLimits/policyState.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { managedSettingsUrl } from "../../components/ManagedSettingsNotice.js";
import { hasUnsafeJsonValue } from "../../utils/settings/settingsSourceTrust.js";
import {
  classifyRemoteSettingsCredential,
  getBridgeBaseUrl,
  computeRemoteSettingsEligibility,
  persistOrgPinFromEligibility,
} from "../cloudSessions/eligibility.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage, classifyAxiosError, isNonRetryableClientError } from "../../utils/errors.js";
import { stdinOverrideCache } from "../../utils/renderOptions.js";
import { logError } from "../../utils/log.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";
import { describeMdmSettingsState } from "../../utils/settings/mdm/settings.js";
import {
  verifyCacheSignature,
  verifySignedCache,
  signatureHeaderValue,
  saveSignedCacheJws,
  readStoredCertificate,
  cacheTrustAnswer,
  trustedPrincipal,
  maybePersistSignature,
  clearSignatureIfStale,
} from "../../utils/settings/policyCertificates.js";
import { computeChecksum, isPolicyGraceEnabled } from "../policyLimits/index.js";
import {
  servedBodyOf,
  stripReservedKeys,
  getSyncCacheResetEpoch,
  isManagedSettingsCopyKeptVerifiable,
  helperConsentDigest,
  getRemoteSettingsPathOverride,
  HELPER_CONSENT_STATE_ID,
  getHelperConsentPath,
  isEvalPolicySnapshotOnly,
  isRemoteManagedSettingsVerified,
  getStoredCopyTrust,
  getStoredCopyTrustedPrincipal,
  isManagedSettingsCopyTrustEnforced,
  setSessionCache,
  getRemoteManagedSettingsConsentedBaseline,
  markRemoteManagedSettingsConsented,
  markPolicySettingsNotified,
} from "./remoteSettingsState.js";
import { isSecDefaultPluginEnabled } from "../../utils/plugins/securityDefaultPlugin.js";
import {
  getStoredOauthAccountInfo,
  getClaudeAIOAuthTokens,
  hostOrgSignInBearer,
  isClaudeAISubscriber,
  getAnthropicApiKeyFingerprint,
  isProfileRemoteSettingsCredential,
  hasAnthropicApiKeyAuth_2,
  getClaudeAIOAuthTokenOriginAsync,
  injectedOAuthTokenRecovery,
  checkAndRefreshOAuthTokenIfNeededWithOutcome,
  handleOAuth401Error,
  isAuthFailureWorthRetrying,
  clearOAuthTokenMemos,
  storeRecheckNeeded,
  checkOAuthCredentialsChangedOnDisk,
  getAuthTokenSource,
  getApiKeyPrefixBucket,
} from "../../utils/auth.js";
import { getGatewayAuth, isGatewayAuthPinned, isDiskless, getRootSession } from "../../bootstrap/state.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { isBigQueryMetricsEnabled_2 } from "./storedLoginSurface.js";
import {
  getWIFAccountInfo,
  isWIFSettingsBearerRejected,
  setWIFSettingsBearerRejected,
} from "../../utils/wifProfile.js";
import {
  getUserAgent,
  oauthRefreshLatchStamp,
  claudeCodeUserAgent,
  restoreOAuthRefreshLatch,
  countOAuth401Recovery,
} from "../../utils/http.js";
import {
  isHostManagedProviderSession,
  DESKTOP_3P_ENTRYPOINT,
  isProviderManagedByHost,
} from "../../utils/entrypointKinds.js";
import {
  hasManagedSettings,
  hasManagedOrCoworkSurface,
  extractRestrictionSettings,
} from "../../utils/settings/managedRestrictionKeys.js";
import { getOauthConfig, OAUTH_BETA_HEADER } from "../../constants/oauth.js";
import {
  parsePolicyObjectTolerant,
  RETENTION_POLICY_KEYS,
} from "../../utils/settings/managedFileSettings.js";
import {
  getMockRemoteSettingsValue,
  getMockRemoteSettingsFixturePath,
  hostSessionSkipsSharedCache,
  remoteSettingsFileWritten,
  getSettingsPath,
  getRemoteManagedSettingsSyncFromCache,
  getRemoteManagedSettingsRawCache,
} from "./remoteSettingsCache.js";
import { claimedCredential, envDriftDetected } from "../../entrypoints/warmSpare/claimCredentials.js";
import { apiKeyForHost } from "../analytics/telemetryCredentialGuard.js";
import { getEmail } from "../../utils/user.js";
import { HTTP_LOOPBACK, hostOf } from "../gateway/internalNetworks.js";
import { gatewayJwtSubject } from "../../utils/telemetry/gatewayIdentityAttributes.js";
import {
  readGatewayTrust,
  pinnedAgentFor,
  createPinnedAgent,
  PIN_STORE_SYMLINK_MESSAGE,
  PIN_STORE_UNREADABLE_MESSAGE,
  PIN_MISMATCH_MESSAGE,
  pinMismatchFromError,
  PUBLIC_ADDRESS_MODEL_MESSAGE,
} from "../gateway/vouching.js";
import {
  writeConsentRecords,
  stampRemoteSettingsSync,
  readSyncAge,
  settingsAgeMs,
  noteBodyReceivedAt,
  removeSyncStamp,
  readDangerousSettingsHash,
} from "./consentRecords.js";
import { MAX_BACKGROUND_FETCH_RETRIES, PROBE_TIMEOUT_MS, currentRemoteSettingsState } from "./loader.js";
import { abortableAttempt, hedgedRequest } from "../policyLimits/startupGate.js";
import { getRetryDelay } from "../api/withRetry.js";
import { sleep } from "../../utils/sleep.js";
import { classifyAuthOutcome, settingsFetchOutcome } from "../analytics/authOutcomeTelemetry.js";
import { refreshGatewayToken } from "../gateway/gatewayAuth.js";
import { axios_default } from "../../../vendor/axios/dist/esm/axios.js";
import { noteGatewaySeen } from "../gateway/hostCheck.js";
import {
  responseHeaderFacts,
  hasSessionsTokenRequestId,
  responseHeaderFactsOf,
  extractServerErrorFields,
  stampedServerErrorType,
} from "../api/errorUtils.js";
import {
  noteServedSettings,
  settingsPresenceSignal,
  clearEmptySettingsPresence,
  markSettingsPresenceEmpty,
} from "./seating.js";
import { RemoteManagedSettingsResponseSchema } from "./types.js";
import { logEvent } from "../analytics/index.js";
import { fetchErrorCode } from "../policyLimits/prefetchToggle.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { formatStorageError } from "../../utils/storage/storageErrors.js";
import { warnDisklessSettingsWrite } from "../../utils/settings/settingsStorage.js";
import { verifyStoredCacheAsync, logPrincipalChange } from "../policyLimits/signedCache.js";
import { keepIfFresh } from "../analytics/growthbookGates.js";
import { fromEnumOpt, fromEnum, lit } from "../analytics/safeMetadata.js";
import { settingsAuthSource } from "./fetchSupport.js";
import {
  checkManagedSettingsSecurity,
  handleSecurityCheckResult,
  hasDeclaredNoConsentSurface,
} from "./securityCheck.js";
import { settingsChangeDetector } from "../../utils/settings/changeDetector.js";

//@ chunk-4pc1m5n9.js:2393-2436 placement
var TENGU_MANAGED_CONFIG_PREFETCH_OFF = "tengu_managed_config_prefetch_off";
//@ chunk-4pc1m5n9.js:2436-2588 placement
/**
 * 是否预取托管配置（环境变量、第一方、开关）。
 */
function isManagedConfigPrefetchEnabled() {
  let CLAUDE_CODE_MANAGED_CONFIG_PREFETCH = env.CLAUDE_CODE_MANAGED_CONFIG_PREFETCH;
  if (CLAUDE_CODE_MANAGED_CONFIG_PREFETCH !== undefined) return CLAUDE_CODE_MANAGED_CONFIG_PREFETCH;
  if (
    getAPIProvider() !== "firstParty" ||
    (!isActualFirstPartyAnthropicBaseUrl() && getPolicyLimitsTunnelSocket() === undefined)
  )
    return false;
  return !getFeatureValue_CACHED_MAY_BE_STALE(TENGU_MANAGED_CONFIG_PREFETCH_OFF, false);
}
//@ chunk-4pc1m5n9.js:2588-3702 placement
function fetchRemoteManagedSettingsSigned({ jws, settings, bodySent, authType, fetchedAs, cachePath }) {
  let organizationUuid = fetchedAs?.organizationUuid;
  if (
    authType !== "oauth" ||
    organizationUuid === undefined ||
    managedSettingsUrl() !== organizationUuid ||
    (!bodySent && hasUnsafeJsonValue(settings))
  )
    return;
  try {
    if (classifyRemoteSettingsCredential().kind === "profile") return;
  } catch (error) {
    logForDebugging(`Remote settings: could not read the profile store: ${errorMessage(error)}`, {
      level: "error",
    });
    return;
  }
  return () => {
    try {
      if (managedSettingsUrl() !== organizationUuid) return false;
      if (stdinOverrideCache.get().kind === "unavailable") return false;
    } catch (error) {
      logError(error);
      logFeatureSad("remote_managed_settings_trusted_source", "error");
      return false;
    }
    let R;
    try {
      R = describeMdmSettingsState();
    } catch (error) {
      logForDebugging(`Remote settings: the organization pin could not be read: ${errorMessage(error)}`, {
        level: "error",
      });
      logFeatureSad("remote_managed_settings_trusted_source", "org_pin_unknown");
      return false;
    }
    if (R !== undefined && !R.includes(organizationUuid)) {
      logFeatureSad("remote_managed_settings_trusted_source", "org_pin_mismatch");
      return false;
    }
    if (R !== undefined)
      try {
        if (
          verifyCacheSignature({
            jws,
            kind: "managed-settings",
            orgUuid: organizationUuid,
            unanchoredClaims: "accept",
            bodySha: computeChecksum(servedBodyOf(settings)),
            nowMs: Date.now(),
            roots: isSecDefaultPluginEnabled(),
          }).result === "aud_mismatch"
        ) {
          logFeatureSad("remote_managed_settings_trusted_source", "org_pin_aud_mismatch");
          return false;
        }
      } catch (error) {
        logError(error);
        logFeatureSad("remote_managed_settings_trusted_source", "error");
        return false;
      }
    logTrustedSource({
      jws,
      settings,
      cachePath,
      pinnedOrgs: R,
    });
    return true;
  };
}
//@ chunk-4pc1m5n9.js:3702-4092 placement
/**
 * 校验远程设置签名缓存并上报可信来源。
 */
function logTrustedSource({ jws, settings, cachePath, pinnedOrgs }) {
  try {
    let y = servedBodyOf(settings);
    let S = verifySignedCache({
      kind: "managed-settings",
      cachePath,
      live: {
        jws,
      },
      body: y,
      bodySha: computeChecksum(y),
      account: getStoredOauthAccountInfo(),
      pinnedOrgs,
      nowMs: Date.now(),
      roots: isSecDefaultPluginEnabled(),
    });
    if (S.trusted) logFeatureOk("remote_managed_settings_trusted_source");
    else logFeatureSad("remote_managed_settings_trusted_source", S.reason);
  } catch (error) {
    logError(error);
    logFeatureSad("remote_managed_settings_trusted_source", "error");
  }
}
//@ chunk-4pc1m5n9.js:6198-6493 placement
function remoteSettingsCredentialKey() {
  if (getGatewayAuth()) return "gateway";
  let claudeAIOAuthTokens = getClaudeAIOAuthTokens();
  let storedOauthAccountInfo = getStoredOauthAccountInfo();
  let s = hostOrgSignInBearer();
  return computeContentHash(
    jsonStringify([
      isClaudeAISubscriber() && isBigQueryMetricsEnabled_2(),
      claudeAIOAuthTokens?.accessToken === undefined
        ? null
        : claudeAIOAuthTokens.refreshToken
          ? [
              storedOauthAccountInfo?.organizationUuid ?? "",
              storedOauthAccountInfo?.accountUuid ?? "",
              computeContentHash(claudeAIOAuthTokens.accessToken),
            ]
          : computeContentHash(claudeAIOAuthTokens.accessToken),
      getAnthropicApiKeyFingerprint().fingerprint,
      isProfileRemoteSettingsCredential() ? (getWIFAccountInfo()?.organizationUuid ?? "") : null,
      s === undefined ? null : computeContentHash(s),
    ]),
  );
}
//@ chunk-4pc1m5n9.js:6493-6684 placement = getClientSurface (0.785)
function getClientSurface() {
  let userAgent = getUserAgent({
    ownEntrypoint: true,
  });
  if (!isHostManagedProviderSession()) return userAgent;
  let n = `, ${env.CLAUDE_CODE_ENTRYPOINT ?? "cli"}`;
  let index = userAgent.indexOf(n);
  return index === -1
    ? userAgent
    : userAgent.slice(0, index + n.length) + `, ${DESKTOP_3P_ENTRYPOINT}` + userAgent.slice(index + n.length);
}
//@ chunk-4pc1m5n9.js:6684-6812 fingerprint = getRemoteManagedSettingsEndpoint (0.739)
/**
 * 远程托管设置端点：网关模式为 <gateway>/managed/settings，否则 <BASE_API_URL>/api/claude_code/settings。
 */
function getRemoteManagedSettingsEndpoint() {
  let e = hasManagedSettings() ? null : getGatewayAuth();
  if (e) return `${e.url}/managed/settings`;
  return `${getOauthConfig().BASE_API_URL}/api/claude_code/settings`;
}
//@ chunk-4pc1m5n9.js:6812-6895 layout
function sanitizeRemoteSettings(e) {
  if (!e) return e;
  return parsePolicyObjectTolerant(e, "remote managed settings").settings ?? {};
}
//@ chunk-4pc1m5n9.js:6895-7486 layout
function ruleRemoteSettingsPayload(e, n) {
  let s = stripReservedKeys(e);
  let policyObjectTolerant = parsePolicyObjectTolerant(s, n);
  let y = s;
  let keys = Object.keys(y);
  if (
    !policyObjectTolerant.settings &&
    keys.length > 0 &&
    !keys.every((k) => policyObjectTolerant.removed.includes(k)) &&
    !sortKeysDeep(y)
  ) {
    logForDebugging(
      `Remote settings: ruled_empty - no key in the payload could be applied as written (${policyObjectTolerant.errors.length} rulings); nothing of it applies`,
    );
    return {
      ruledEmpty: {
        success: false,
        error: "No setting in the payload could be applied as written",
        errorKind: "ruled_empty",
        rulings: policyObjectTolerant.errors,
        skipRetry: true,
      },
    };
  }
  if (policyObjectTolerant.errors.length > 0)
    logForDebugging(
      `Remote settings: Payload contains ${policyObjectTolerant.errors.length} invalid entries; applying the salvaged subset`,
    );
  return {
    settings: s,
    salvagedSettings: restoreSalvagedRemoteSettings(y, policyObjectTolerant),
  };
}
//@ chunk-4pc1m5n9.js:7486-7576 file-local
function sortKeysDeep(obj) {
  let keys = Object.keys(obj);
  return keys.length > 0 && keys.every((s) => RETENTION_POLICY_KEYS.some((r) => r === s));
}
//@ chunk-4pc1m5n9.js:7576-7828 sole-consumer
function restoreSubstitutedRemoteKeys(e, n, s) {
  let filtered = [
    ...RETENTION_POLICY_KEYS.filter((y) => y in n && !(y in e)),
    ...(s.onlySubstitutes
      ? s.errors.filter((error) => error.onlySubstitutes).map((error) => error.path)
      : []),
  ].filter((y) => y in n);
  if (filtered.length === 0) return e;
  return {
    ...e,
    ...Object.fromEntries(filtered.map((y) => [y, n[y]])),
  };
}
//@ chunk-4pc1m5n9.js:7828-7912 sole-consumer
function sanitizeRemoteSettingsKeepingSubstitutes(e) {
  let policyObjectTolerant = parsePolicyObjectTolerant(e, "remote managed settings");
  return restoreSubstitutedRemoteKeys(policyObjectTolerant.settings ?? {}, e, policyObjectTolerant);
}
//@ chunk-4pc1m5n9.js:7912-8010 sole-consumer
function restoreSalvagedRemoteSettings(e, policyObjectTolerant) {
  let s = policyObjectTolerant.errors.length > 0 ? (policyObjectTolerant.settings ?? {}) : undefined;
  return s === undefined ? undefined : restoreSubstitutedRemoteKeys(s, e, policyObjectTolerant);
}
//@ chunk-4pc1m5n9.js:8010-8688 sole-consumer
async function fetchRemoteSettingsMockOrNull(credentials) {
  let mockRemoteSettingsValue = getMockRemoteSettingsValue();
  if (mockRemoteSettingsValue === undefined) return null;
  if (mockRemoteSettingsValue === "fail")
    return {
      success: false,
      error: "mocked fetch failure",
      errorKind: "unknown_error",
      skipRetry: true,
    };
  if (mockRemoteSettingsValue === "empty")
    return {
      success: true,
      settings: {},
      checksum: undefined,
      consentIdentity: await hasAnthropicApiKeyAuth_2(credentials),
    };
  try {
    let mockRemoteSettingsFixturePath = getMockRemoteSettingsFixturePath();
    let r =
      mockRemoteSettingsFixturePath !== undefined
        ? await readFile(mockRemoteSettingsFixturePath, "utf-8")
        : mockRemoteSettingsValue;
    let y = jsonParse(r);
    if (!y || typeof y !== "object" || Array.isArray(y))
      return {
        success: false,
        error: "mock JSON parse failed",
        errorKind: "parse_error",
        skipRetry: true,
      };
    let S = ruleRemoteSettingsPayload(y, "mock remote settings");
    if ("ruledEmpty" in S) return S.ruledEmpty;
    return {
      success: true,
      ...S,
      checksum: "mock",
      consentIdentity: await hasAnthropicApiKeyAuth_2(credentials),
    };
  } catch {
    return {
      success: false,
      error: "mock JSON parse failed",
      errorKind: "parse_error",
      skipRetry: true,
    };
  }
}
//@ chunk-4pc1m5n9.js:9352-12031 callgraph-fingerprint = getRemoteSettingsAuthHeaders (0.275)
async function getRemoteSettingsAuthHeaders(e, n) {
  if (hasManagedSettings()) {
    let S = claimedCredential();
    if (S === null || envDriftDetected())
      return {
        headers: {},
        error:
          S === null
            ? "No credential from the host that launched this session"
            : "The settings endpoint was moved after this session was launched",
        authType: "none",
      };
    let url = getRemoteManagedSettingsEndpoint();
    return S.kind === "bearer"
      ? {
          headers: {
            Authorization: `Bearer ${S.token}`,
            "anthropic-beta": OAUTH_BETA_HEADER,
          },
          authType: "oauth",
          credentialOrigin: "injected_token",
          url,
        }
      : {
          headers: {
            "x-api-key": S.key,
          },
          authType: "api_key",
          url,
        };
  }
  let gatewayAuth = getGatewayAuth();
  if (gatewayAuth) {
    let S = isGatewayAuthPinned(gatewayAuth) ? await gatewayTrustFor(gatewayAuth, e) : undefined;
    return {
      headers: {
        Authorization: `Bearer ${gatewayAuth.jwt}`,
      },
      authType: "gateway_jwt",
      consentIdentity: computeChecksumFromSettings(gatewayAuth, S),
      pinnedFingerprint: S,
    };
  }
  let r = classifyRemoteSettingsCredential();
  if (r.kind === "org_login") {
    let claudeAIOAuthTokens = getClaudeAIOAuthTokens();
    if (claudeAIOAuthTokens?.accessToken)
      return {
        headers: {
          Authorization: `Bearer ${claudeAIOAuthTokens.accessToken}`,
          "anthropic-beta": OAUTH_BETA_HEADER,
        },
        authType: "oauth",
        accessToken: claudeAIOAuthTokens.accessToken,
        ...(await consentIdentityOf(e)),
      };
  }
  if (r.kind === "api_key") {
    if (apiKeyForHost(r.key) === null) {
      logForDebugging("Remote settings: API key not sent: ANTHROPIC_BASE_URL is not an Anthropic host");
      return {
        headers: {},
        error: "Remote settings: API key not sent: ANTHROPIC_BASE_URL is not an Anthropic host",
        authType: "api_key",
      };
    }
    return {
      headers: {
        "x-api-key": r.key,
      },
      authType: "api_key",
    };
  }
  if (r.kind === "host_bearer")
    return {
      headers: {
        Authorization: `Bearer ${r.bearer}`,
      },
      authType: "oauth",
      credentialOrigin: "injected_token",
    };
  if (r.kind === "profile") {
    if (isWIFSettingsBearerRejected()) {
      logForDebugging(
        "Remote settings: the settings endpoint rejected the profile credential after a forced refresh; not fetching with it again until the next sign-in or restart",
      );
      return {
        headers: {},
        error:
          "Remote settings: the settings endpoint rejected the profile credential after a forced refresh; not fetching with it again until the next sign-in or restart",
        authType: "profile",
        profileError: true,
      };
    }
    try {
      let { getWIFCredentials, getWIFTokenCache } = await import("./chunk-7k61ne1e.js");
      let [wifTokenCache, wifCredentials] = await Promise.all([getWIFTokenCache(), getWIFCredentials()]);
      if (wifTokenCache !== null) {
        if (!getBridgeBaseUrl(wifCredentials?.baseURL)) {
          let O = `Remote settings: profile base URL ${wifCredentials?.baseURL ?? "(unknown)"} is not the settings endpoint's host; not fetching with the profile credential`;
          logForDebugging(O);
          return {
            headers: {},
            error: O,
            authType: "profile",
            profileError: true,
          };
        }
        let token = await wifTokenCache.getToken();
        return {
          headers: {
            ...wifCredentials?.extraHeaders,
            Authorization: `Bearer ${token}`,
          },
          authType: "profile",
          accessToken: token,
          profileBearer: true,
          consentIdentity: getEmail(),
        };
      }
    } catch (error) {
      let k = `Remote settings: profile credential unavailable: ${errorMessage(error)}`;
      logForDebugging(k, {
        level: "error",
      });
      let { isWIFTransientExchangeError } = await import("./chunk-7k61ne1e.js");
      return {
        headers: {},
        error: k,
        authType: "profile",
        profileError: true,
        retryable: isWIFTransientExchangeError(error),
      };
    }
  }
  let oauthTokens = getClaudeAIOAuthTokens();
  if (oauthTokens?.accessToken)
    return {
      headers: {
        Authorization: `Bearer ${oauthTokens.accessToken}`,
        "anthropic-beta": OAUTH_BETA_HEADER,
      },
      authType: "oauth",
      accessToken: oauthTokens.accessToken,
      ...(await consentIdentityOf(e)),
    };
  return {
    headers: {},
    error: "No authentication available",
    authType: "none",
  };
}
//@ chunk-4pc1m5n9.js:12031-12088 placement
/**
 * 把 consentIdentityOf 的结果简化为同意身份对象。
 */
async function consentIdentityAsync(e) {
  return (await consentIdentityOf(e)).consentIdentity;
}
//@ chunk-4pc1m5n9.js:12088-12383 placement
async function consentIdentityOf(e) {
  let storedOauthAccountInfo = getStoredOauthAccountInfo();
  let claudeAIOAuthTokenOrigin = await getClaudeAIOAuthTokenOriginAsync(e);
  let credentialOrigin =
    claudeAIOAuthTokenOrigin === "store"
      ? "stored_login"
      : claudeAIOAuthTokenOrigin === "env" || claudeAIOAuthTokenOrigin === "fd"
        ? "injected_token"
        : undefined;
  if (claudeAIOAuthTokenOrigin !== "store")
    return {
      credentialOrigin,
    };
  return {
    credentialOrigin,
    consentIdentity: storedOauthAccountInfo?.organizationUuid
      ? {
          organizationUuid: storedOauthAccountInfo.organizationUuid,
          accountUuid: storedOauthAccountInfo.accountUuid,
        }
      : undefined,
  };
}
//@ chunk-4pc1m5n9.js:12619-12650 placement
var GATEWAY = "gateway:";
var HYBRID = "hybrid:";
//@ chunk-4pc1m5n9.js:12650-12678 placement
async function hybridConsentIdentity(e) {
  return;
}
//@ chunk-4pc1m5n9.js:12678-12689 placement
var MAX_GATEWAY_ACCOUNT_ID_CHARS = 256;
//@ chunk-4pc1m5n9.js:12689-12991 placement
function computeChecksumFromSettings(gatewayAuth, n) {
  if (!isGatewayAuthPinned(gatewayAuth) || !n || n === HTTP_LOOPBACK) return;
  let s;
  try {
    s = new URL(gatewayAuth.url);
  } catch {
    return;
  }
  if (s.protocol !== "https:") return;
  let r = `${s.origin}${s.pathname === "/" ? "" : s.pathname}`;
  let y = gatewayJwtSubject(gatewayAuth) ?? "";
  return {
    organizationUuid: `${GATEWAY}${r}#${n}`,
    accountUuid:
      y.length > MAX_GATEWAY_ACCOUNT_ID_CHARS ? `sha256:${createHash("sha256").update(y).digest("hex")}` : y,
  };
}
//@ chunk-4pc1m5n9.js:12991-13047 placement
/**
 * 读取某网关地址对应主机的信任状态。
 */
async function gatewayTrustFor(gatewayAuth, n) {
  return readGatewayTrust(hostOf(new URL(gatewayAuth.url)), n);
}
//@ chunk-4pc1m5n9.js:13220-13566 sole-consumer
/**
 * 同意身份与拉取身份一致时写同意记录。
 */
async function recordConsentIfSameIdentity(consentIdentity, n, storageV5, credentials) {
  if (!consentIdentity) return;
  let y = consentIdentity.organizationUuid.startsWith(GATEWAY)
    ? await hasAnthropicApiKeyAuth_2(credentials)
    : consentIdentity.organizationUuid.startsWith(HYBRID)
      ? await hybridConsentIdentity(credentials)
      : getStoredOauthAccountInfo();
  if (
    y?.organizationUuid !== consentIdentity.organizationUuid ||
    y.accountUuid !== consentIdentity.accountUuid
  ) {
    logForDebugging(
      "Remote settings: consent identity no longer matches the fetch identity; not recording org consent",
    );
    return;
  }
  await writeConsentRecords(consentIdentity, n, storageV5);
}
//@ chunk-4pc1m5n9.js:13566-13760 sole-consumer
function wasResetDuringFetch(syncCacheResetEpoch) {
  if (getSyncCacheResetEpoch() === syncCacheResetEpoch) return false;
  logForDebugging("Remote settings: Cache was reset (login/logout) during this fetch; discarding its result");
  logFeatureSad("remote_managed_settings_pull", "reset_during_fetch");
  return true;
}
//@ chunk-4pc1m5n9.js:13760-13849 affinity
function formatRemoteSettingsErrorKind(e) {
  return e.httpStatus !== undefined ? `${e.errorKind}/${e.httpStatus}` : e.errorKind;
}
//@ chunk-4pc1m5n9.js:13849-14681 fingerprint = fetchWithRetry (0.314)
async function fetchWithRetry(e, n) {
  let remoteSettingsMockOrNull = await fetchRemoteSettingsMockOrNull(n.credentials);
  if (remoteSettingsMockOrNull) return remoteSettingsMockOrNull;
  let lastResult = null;
  let y =
    (getGatewayAuth() && !n.background) || n.singleAttempt
      ? 0
      : (n.maxRetries ?? MAX_BACKGROUND_FETCH_RETRIES);
  let S = isManagedConfigPrefetchEnabled();
  let k = S && n.startupAwaited === true && !n.background && !getGatewayAuth();
  let oauthRefreshLatch = S ? n.oauthRefreshLatch : undefined;
  let C = (E) =>
    fetchRemoteManagedSettings(e, false, n.credentials, E, oauthRefreshLatch, n.hybridOrganizationUuid);
  let prefetched = n.prefetched;
  let O = false;
  for (let attempt = 1; attempt <= y + 1; attempt++) {
    let A = prefetched ?? abortableAttempt(C);
    prefetched = undefined;
    if (k && attempt === 1) {
      let M = await hedgedRequest({
        first: A,
        send: C,
        isAnswer: (w, G) => w.success || (w.skipRetry === true && !(G && w.errorKind === "http_401")),
        stillWanted: isManagedConfigPrefetchEnabled,
        retryFollows: y > 0,
      });
      lastResult = M.result;
      O ||= M.hedged;
    } else lastResult = await A.attempt;
    lastResult.attempts = attempt;
    if (O) lastResult.hedged = true;
    if (lastResult.success) return lastResult;
    if (lastResult.skipRetry) return lastResult;
    if (attempt > y) return lastResult;
    let delayMs = getRetryDelay(attempt);
    logForDebugging(
      `Remote settings: Retry ${attempt}/${y} after ${delayMs}ms (${formatRemoteSettingsErrorKind({
        errorKind: lastResult.errorKind ?? "unknown_error",
        ...(lastResult.httpStatus !== undefined && {
          httpStatus: lastResult.httpStatus,
        }),
      })})`,
    );
    await sleep(delayMs);
  }
  return lastResult;
}
//@ chunk-4pc1m5n9.js:14681-14699 layout
var now = Date.now();
//@ chunk-4pc1m5n9.js:14699-15794 layout
function classifyRemoteSettingsFailure(e) {
  let errorCode = (() => {
    switch (e.errorKind) {
      case "http_401":
      case "http_403":
        return "auth_failed";
      case "timeout":
        return "timeout";
      case "network_error":
        return "network_error";
      case "parse_error":
      case "ruled_empty":
        return "parse_failed";
      case "http_4xx":
      case "http_5xx":
      case "unknown_error":
      case "gateway_cert_mismatch":
      case "gateway_public_address":
      case "gateway_pin_refused":
      case "gateway_pin_unreadable":
        return "request_failed";
      case "no_auth_available":
      case "profile_credential_error":
      case "api_key_not_sent":
      case undefined:
        return;
    }
  })();
  let httpStatus = e.errorKind === "http_401" ? 401 : e.errorKind === "http_403" ? 403 : e.httpStatus;
  let authType =
    e.authType === "oauth"
      ? "oauth"
      : e.authType === "api_key"
        ? "api_key"
        : e.authType === "profile"
          ? "wif"
          : undefined;
  return classifyAuthOutcome({
    errorCode,
    httpStatus,
    serverErrorType: e.serverErrorType,
    serverErrorCode: e.serverErrorCode,
    serverAuthDenial: e.serverAuthDenial,
    tokenRefreshOutcome: e.tokenRefreshOutcome,
    forcedRefreshOutcome: e.forcedRefreshOutcome,
    authType,
    credentialOrigin: e.authType === "api_key" ? "static_key" : e.credentialOrigin,
    injectedTokenRecovery: e.credentialOrigin === "injected_token" ? injectedOAuthTokenRecovery() : undefined,
    noResponse: e.noResponse,
  });
}
//@ chunk-4pc1m5n9.js:15794-21412 fingerprint = fetchRemoteManagedSettings (0.355)
/**
 * 单次请求远程设置端点（OAuth Bearer 或 API key），区分 200/204/304/404 与失败类型，带重试。
 */
async function fetchRemoteManagedSettings(
  e,
  n = false,
  s,
  r,
  oauthRefreshLatch,
  hybridOrganizationUuid = null,
) {
  let k = oauthRefreshLatch && oauthRefreshLatchStamp(oauthRefreshLatch.recoveries);
  let R;
  let C = false;
  let T = false;
  let O;
  let consentIdentity;
  let A = false;
  let P = {};
  let M = (w) => {
    logForDebugging(
      `Remote settings: Fetch attempt failed (${formatRemoteSettingsErrorKind({
        errorKind: w.errorKind ?? "unknown_error",
        ...(w.httpStatus !== undefined && {
          httpStatus: w.httpStatus,
        }),
      })})`,
    );
    return {
      ...P,
      ...w,
    };
  };
  try {
    O =
      hybridOrganizationUuid !== null
        ? "not_needed"
        : await checkAndRefreshOAuthTokenIfNeededWithOutcome({
            credentials: s,
          });
    if (hybridOrganizationUuid === null) await refreshGatewayToken(s);
    let remoteSettingsAuthHeaders = await getRemoteSettingsAuthHeaders(s, hybridOrganizationUuid);
    R = remoteSettingsAuthHeaders.accessToken;
    C = remoteSettingsAuthHeaders.profileBearer === true;
    T =
      remoteSettingsAuthHeaders.accessToken !== undefined &&
      remoteSettingsAuthHeaders.credentialOrigin === "stored_login";
    consentIdentity = remoteSettingsAuthHeaders.consentIdentity;
    P = {
      authType: remoteSettingsAuthHeaders.authType,
      credentialOrigin: remoteSettingsAuthHeaders.credentialOrigin,
      tokenRefreshOutcome: remoteSettingsAuthHeaders.authType === "oauth" ? O : undefined,
    };
    if (remoteSettingsAuthHeaders.error)
      return M({
        success: false,
        error: remoteSettingsAuthHeaders.profileError
          ? remoteSettingsAuthHeaders.error
          : "Authentication required for remote settings",
        errorKind: remoteSettingsAuthHeaders.profileError
          ? "profile_credential_error"
          : remoteSettingsAuthHeaders.authType === "api_key"
            ? "api_key_not_sent"
            : remoteSettingsAuthHeaders.retryable
              ? "network_error"
              : "no_auth_available",
        skipRetry: !remoteSettingsAuthHeaders.retryable,
      });
    let G = remoteSettingsAuthHeaders.url ?? getRemoteManagedSettingsEndpoint();
    A = remoteSettingsAuthHeaders.url !== undefined;
    let h = {
      ...remoteSettingsAuthHeaders.headers,
      "User-Agent": isProviderManagedByHost() ? getClientSurface() : claudeCodeUserAgent(),
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    };
    let F = hasManagedOrCoworkSurface() || hybridOrganizationUuid !== null ? undefined : e;
    if (F) h["If-None-Match"] = `"${F}"`;
    let hostVerdict = getGatewayAuth()?.hostVerdict;
    let Q =
      pinnedAgentFor(remoteSettingsAuthHeaders.pinnedFingerprint, G) ??
      (hostVerdict && "verified" in hostVerdict && hostVerdict.verified && !("vouched" in hostVerdict)
        ? createPinnedAgent(G, hostVerdict.network)
        : undefined);
    let H = {
      headers: h,
      timeout: PROBE_TIMEOUT_MS,
      ...(hasManagedSettings() && {
        proxy: false,
      }),
      ...(A && {
        maxRedirects: 0,
        adapter: "http",
      }),
      validateStatus: (N) => N === 200 || N === 204 || N === 304 || N === 404,
      signal: r,
    };
    let response = await axios_default.get(G, {
      ...H,
      ...(Q && {
        httpsAgent: Q,
      }),
    });
    noteGatewaySeen(response.headers?.["x-cc-gateway-version"]);
    if (response.status === 304) {
      if (!F) {
        logForDebugging("Remote settings: 304 to an unconditional request");
        return {
          success: false,
          error: "Unexpected 304 Not Modified",
          errorKind: "unknown_error",
          httpStatus: 304,
          skipRetry: true,
          ...P,
          ...responseHeaderFacts(response.headers),
        };
      }
      logForDebugging("Remote settings: Using cached settings (304)");
      return {
        success: true,
        settings: null,
        checksum: e,
        signature: signatureHeaderValue(response.headers),
        consentIdentity,
        ...P,
        responseKind: "not_modified",
        ...responseHeaderFacts(response.headers),
      };
    }
    if (response.status === 204 || response.status === 404) {
      if (
        isPolicyGraceEnabled() &&
        P.authType !== "gateway_jwt" &&
        !hasSessionsTokenRequestId(response.headers)
      ) {
        logForDebugging(
          `Remote settings: ${response.status} without Anthropic's request id \u2014 an intermediary's answer, keeping cached settings`,
        );
        return {
          success: false,
          error: `${response.status} from an intermediary (no Anthropic request id)`,
          errorKind: "http_4xx",
          httpStatus: response.status,
          skipRetry: true,
          ...P,
          ...responseHeaderFacts(response.headers),
        };
      }
      logForDebugging(`Remote settings: No settings found (${response.status})`);
      return {
        success: true,
        settings: {},
        checksum: undefined,
        signature: signatureHeaderValue(response.headers),
        consentIdentity,
        ...P,
        responseKind: "none_configured",
        ...responseHeaderFacts(response.headers),
      };
    }
    noteServedSettings(response.data);
    let parsed = RemoteManagedSettingsResponseSchema().safeParse(response.data);
    if (!parsed.success) {
      logForDebugging(`Remote settings: Invalid response format - ${parsed.error.message}`);
      return {
        success: false,
        error: "Invalid remote settings format",
        errorKind: "parse_error",
        skipRetry: true,
        ...P,
        ...responseHeaderFacts(response.headers),
      };
    }
    let Z = ruleRemoteSettingsPayload(
      hasManagedOrCoworkSurface() ? extractRestrictionSettings(parsed.data.settings) : parsed.data.settings,
      "remote managed settings",
    );
    if ("ruledEmpty" in Z)
      return {
        ...Z.ruledEmpty,
        ...P,
      };
    if (oauthRefreshLatch && parsed.data.checksum) restoreOAuthRefreshLatch(oauthRefreshLatch, k);
    logForDebugging("Remote settings: Fetched successfully");
    return {
      success: true,
      ...Z,
      checksum: parsed.data.checksum,
      isAnsweredEmpty: Object.keys(parsed.data.settings).length === 0,
      signature: hasManagedOrCoworkSurface() ? undefined : signatureHeaderValue(response.headers),
      consentIdentity,
      ...P,
    };
  } catch (error) {
    let G = errorMessage(error?.cause);
    if (errorMessage(error).includes(PIN_STORE_SYMLINK_MESSAGE))
      return M({
        success: false,
        error: "Cloud gateway TLS pin is in a symlinked credentials file",
        errorKind: "gateway_pin_refused",
        skipRetry: true,
      });
    if (errorMessage(error).includes(PIN_STORE_UNREADABLE_MESSAGE))
      return M({
        success: false,
        error: "Cloud gateway TLS pin could not be read from the credentials file",
        errorKind: "gateway_pin_unreadable",
      });
    if (errorMessage(error).includes(PIN_MISMATCH_MESSAGE) || G.includes(PIN_MISMATCH_MESSAGE)) {
      let H = pinMismatchFromError(error);
      return M({
        success: false,
        error: "Cloud gateway TLS certificate does not match stored pin",
        errorKind: "gateway_cert_mismatch",
        ...(H && {
          gatewayPinMismatch: H,
        }),
        skipRetry: true,
      });
    }
    if (
      errorMessage(error).includes(PUBLIC_ADDRESS_MODEL_MESSAGE) ||
      G.includes(PUBLIC_ADDRESS_MODEL_MESSAGE)
    )
      return M({
        success: false,
        error: "Cloud gateway connection outside the network it was checked on",
        errorKind: "gateway_public_address",
        skipRetry: true,
      });
    let { kind, status, message } = classifyAxiosError(error);
    if (status === 404 && hybridOrganizationUuid === null) {
      if (
        isPolicyGraceEnabled() &&
        P.authType !== "gateway_jwt" &&
        !hasSessionsTokenRequestId(axios_default.isAxiosError(error) ? error.response?.headers : undefined)
      )
        return M({
          success: false,
          error: "404 from an intermediary (no Anthropic request id)",
          errorKind: "http_4xx",
          httpStatus: 404,
          skipRetry: true,
          ...responseHeaderFactsOf(error),
        });
      return {
        success: true,
        settings: {},
        checksum: "",
        consentIdentity,
        ...P,
        responseKind: "none_configured",
        ...responseHeaderFactsOf(error),
      };
    }
    let Q = {
      ...extractServerErrorFields(error),
      ...responseHeaderFactsOf(error),
    };
    switch (kind) {
      case "auth": {
        let H = {
          success: false,
          error: "Not authorized for remote settings",
          errorKind: status === 401 ? "http_401" : "http_403",
          skipRetry: true,
          ...Q,
        };
        if (r?.aborted) return M(H);
        let I;
        if (status === 401 && R && !n && !oauthRefreshLatch?.attempted) {
          let U = R;
          let N = await countOAuth401Recovery(oauthRefreshLatch, async () => {
            if (C) {
              if (oauthRefreshLatch) oauthRefreshLatch.attempted = true;
              let { getWIFTokenCache, invalidateWIFToken } = await import("./chunk-7k61ne1e.js");
              await invalidateWIFToken(U);
              return getWIFTokenCache()
                .then((wifTokenCache) => wifTokenCache?.getToken())
                .catch(() => {
                  return;
                });
            }
            I = {
              outcome: undefined,
            };
            await handleOAuth401Error(U, s, undefined, {
              onForcedRefreshOutcome: (K) => {
                I = {
                  outcome: K,
                };
                H.forcedRefreshOutcome = K;
                if (oauthRefreshLatch) {
                  oauthRefreshLatch.attempted = true;
                  oauthRefreshLatch.lastOutcome = K;
                }
              },
            });
            return getClaudeAIOAuthTokens()?.accessToken;
          });
          if (N && N !== R) {
            M(H);
            logEvent("tengu_remote_settings_401_force_refresh_retry", {});
            let remoteManagedSettings = await fetchRemoteManagedSettings(e, true, s, r, oauthRefreshLatch);
            return {
              ...remoteManagedSettings,
              retriedAfter401: true,
              forcedRefreshOutcome: remoteManagedSettings.forcedRefreshOutcome ?? H.forcedRefreshOutcome,
            };
          }
        }
        if (status === 401 && T && isAuthFailureWorthRetrying(O, I)) H.skipRetry = false;
        if (status === 401 && C && n) setWIFSettingsBearerRejected(true);
        if (status === 401 && H.forcedRefreshOutcome === undefined && oauthRefreshLatch?.attempted)
          H.forcedRefreshOutcome = oauthRefreshLatch.lastOutcome;
        return M(H);
      }
      case "timeout":
        return M({
          success: false,
          error: "Remote settings request timeout",
          errorKind: "timeout",
          errno: fetchErrorCode(error),
        });
      case "network":
        return M({
          success: false,
          error: "Cannot connect to server",
          errorKind: "network_error",
          errno: fetchErrorCode(error),
        });
      default:
        return M({
          success: false,
          error: message,
          errorKind:
            status !== undefined && status >= 500
              ? "http_5xx"
              : status !== undefined && status >= 400
                ? "http_4xx"
                : "unknown_error",
          ...(status !== undefined &&
            status >= 300 && {
              httpStatus: status,
            }),
          ...(kind === "http" &&
            status === undefined && {
              noResponse: true,
              errno: fetchErrorCode(error),
            }),
          ...Q,
          ...((isNonRetryableClientError(status) ||
            (A && status !== undefined && status >= 300 && status < 400)) && {
            skipRetry: true,
          }),
        });
    }
  }
}
//@ chunk-4pc1m5n9.js:21412-21497 layout
/**
 * 哨兵值：保存远程设置时保留已存的签名/语句，不被这次结果覆盖。
 */
var KEEP_STORED_STATEMENT = Symbol("keep the stored statement");
var BODY_JUST_RECEIVED = Symbol("the server sent the body now");
//@ chunk-4pc1m5n9.js:21497-22630 fingerprint = saveSettings (0.338)
/**
 * 把远程设置写入缓存（storage 后端或 <配置目录>/remote-settings.json）。
 */
async function saveSettings(e, storageV5, s, r, y) {
  if (hostSessionSkipsSharedCache()) return;
  let S = jsonStringify(isManagedSettingsCopyKeptVerifiable() ? servedBodyOf(e) : e, null, 2);
  let k = helperConsentDigest(e);
  if (isDiskless() && isStorageV5Enabled() && storageV5 !== undefined && !getRemoteSettingsPathOverride()) {
    let R = await storageV5.write(STORAGE_SPACES.state("remote-settings"), S, {
      publishDiscipline: "inPlace",
      mode: 384,
      flush: true,
    });
    if (!R.ok) {
      logForDebugging(`Remote settings: Failed to save - ${formatStorageError(R.error)}`);
      return;
    }
    logForDebugging("Remote settings: Saved via storage backend");
    remoteSettingsFileWritten("cache", S);
    if (s !== KEEP_STORED_STATEMENT) await saveSignedCacheJws(getSettingsPath(), s);
    await stampRemoteSettingsSync(y === BODY_JUST_RECEIVED ? undefined : y);
    if (k !== undefined) {
      let C = await storageV5.write(STORAGE_SPACES.state(HELPER_CONSENT_STATE_ID), k, {
        publishDiscipline: "inPlace",
        mode: 384,
      });
      logForDebugging(
        C.ok
          ? "Remote settings: Saved helper consent via storage backend"
          : `Remote settings: Failed to save helper consent - ${formatStorageError(C.error)}`,
      );
      if (C.ok) remoteSettingsFileWritten("helperConsent", k);
    }
    return;
  }
  if (isDiskless()) {
    warnDisklessSettingsWrite("remote_settings", "remote-settings.json");
    return;
  }
  try {
    let path = getSettingsPath();
    await readStoredCertificate(path, S);
    logForDebugging(`Remote settings: Saved to ${path}`);
  } catch (error) {
    logForDebugging(
      `Remote settings: Failed to save - ${error instanceof Error ? error.message : "unknown error"}`,
    );
    return;
  }
  if (isStorageV5Enabled() && !getRemoteSettingsPathOverride()) remoteSettingsFileWritten("cache", S);
  if (s !== KEEP_STORED_STATEMENT) await saveSignedCacheJws(getSettingsPath(), s);
  await stampRemoteSettingsSync(y === BODY_JUST_RECEIVED ? undefined : y);
  if (k === undefined) return;
  try {
    await readStoredCertificate(getHelperConsentPath(), k);
    if (isStorageV5Enabled() && !getRemoteSettingsPathOverride())
      remoteSettingsFileWritten("helperConsent", k);
  } catch (error) {
    logForDebugging(`Remote settings: Failed to save helper consent - ${errorMessage(error)}`);
  }
}
//@ chunk-4pc1m5n9.js:23311-33728 callgraph-witnessed = fetchAndLoadRemoteManagedSettings (0.072)
/**
 * 获取远程托管设置：不符合条件返回 ineligible；CLAUDE_CODE_REMOTE_SETTINGS_PATH 覆盖文件或受限子进程直接用本地快照；否则带缓存 checksum 请求端点（304 沿用缓存），校验签名/组织后写入 remote-settings.json 缓存并作为 policy 的 remote 层。
 */
async function fetchAndLoadRemoteManagedSettings(e) {
  if (!computeRemoteSettingsEligibility()) {
    currentRemoteSettingsState().prefetch.clear();
    return {
      settings: null,
      fetchSucceeded: true,
      resolution: "ineligible",
    };
  }
  let n = null;
  let cachedSettings = getRemoteSettingsPathOverride();
  if (cachedSettings || isEvalPolicySnapshotOnly()) {
    currentRemoteSettingsState().prefetch.clear();
    logForDebugging(
      cachedSettings
        ? `Remote settings: Using override file ${cachedSettings} (CLAUDE_CODE_REMOTE_SETTINGS_PATH), skipping API fetch`
        : "Remote settings: confined evaluation child \u2014 serving the harness-written policy snapshot, no fetch",
    );
    return {
      settings: getRemoteManagedSettingsSyncFromCache(),
      fetchSucceeded: true,
      resolution: "local",
    };
  }
  if (n === null) persistOrgPinFromEligibility();
  let remoteManagedSettingsRawCache = getRemoteManagedSettingsRawCache();
  let y = isRemoteManagedSettingsVerified();
  let S = settingsPresenceSignal.get();
  let gateAnswer = getStoredCopyTrust();
  let storedCopyTrustedPrincipal = getStoredCopyTrustedPrincipal();
  let C = remoteManagedSettingsRawCache ? computeChecksum(remoteManagedSettingsRawCache) : undefined;
  let syncCacheResetEpoch = getSyncCacheResetEpoch();
  let O = currentRemoteSettingsState();
  if (!O.signedCacheShadowChecked) {
    O.signedCacheShadowChecked = true;
    O.storedCopyAtStart =
      hostSessionSkipsSharedCache() || hasManagedSettings() || n !== null
        ? "not_read"
        : {
            enforced: isManagedSettingsCopyTrustEnforced(),
            gateAnswer,
            hadCopy: remoteManagedSettingsRawCache !== null,
          };
    if (remoteManagedSettingsRawCache && !hasManagedSettings() && n === null)
      verifyStoredCacheAsync({
        kind: "managed-settings",
        cachePath: getSettingsPath(),
        bodySha: isManagedSettingsCopyKeptVerifiable()
          ? computeChecksum(servedBodyOf(remoteManagedSettingsRawCache))
          : computeChecksum(remoteManagedSettingsRawCache),
        readStoredAccount: getStoredOauthAccountInfo,
        readOrgPin: describeMdmSettingsState,
        onJudged: (storedCopyShadow) => {
          O.storedCopyShadow = storedCopyShadow;
        },
      });
  }
  if (!e.background && O.prefetch.pending) {
    let result = await getClaudeAIOAuthTokenOriginAsync(e.credentials);
    if (result !== "store" || env.CLAUDE_CODE_OAUTH_TOKEN) clearOAuthTokenMemos();
    if (storeRecheckNeeded(result))
      await checkOAuthCredentialsChangedOnDisk(getRootSession().host, e.credentials);
  }
  let E = e.background
    ? undefined
    : O.prefetch.take(
        (A) =>
          A.checksum === C &&
          A.epoch === syncCacheResetEpoch &&
          A.endpoint === getRemoteManagedSettingsEndpoint() &&
          A.principal === remoteSettingsCredentialKey(),
      );
  try {
    let now_2 = Date.now();
    let P = n === null ? await readSyncAge(now_2) : undefined;
    let M =
      isPolicyGraceEnabled() && n === null
        ? await settingsAgeMs(remoteManagedSettingsRawCache !== null, P, now_2)
        : undefined;
    let w = isPolicyGraceEnabled() ? keepIfFresh(C, M) : C;
    let now_3 = Date.now();
    let h = await fetchWithRetry(w, {
      ...e,
      prefetched: E,
      oauthRefreshLatch: e.background ? undefined : O.oauthRefreshLatch,
      hybridOrganizationUuid: n,
    });
    let F = Date.now() - now_3;
    if (e.cycleFacts) {
      e.cycleFacts.hadCache = remoteManagedSettingsRawCache !== null;
      e.cycleFacts.fetchMs = F;
    }
    let bodyReceivedAtMs = now_3 + F;
    if (h.success && h.responseKind !== "not_modified") noteBodyReceivedAt(bodyReceivedAtMs);
    let Q = h.authType === "oauth";
    let H = h.success ? undefined : classifyRemoteSettingsFailure(h);
    let I = settingsFetchOutcome(
      h.success
        ? {
            succeeded: true,
            responseKind: h.responseKind ?? "body",
          }
        : {
            succeeded: false,
            failure:
              h.errorKind === "no_auth_available" || h.errorKind === "api_key_not_sent"
                ? "no_credentials"
                : h.errorKind === "profile_credential_error"
                  ? "credential_exchange"
                  : h.errorKind === "timeout"
                    ? "timeout"
                    : h.errorKind === "network_error" ||
                        h.errorKind === "gateway_public_address" ||
                        h.noResponse
                      ? "network"
                      : h.errorKind === "gateway_cert_mismatch" ||
                          h.errorKind === "gateway_pin_refused" ||
                          h.errorKind === "gateway_pin_unreadable"
                        ? "tls"
                        : h.errorKind === "parse_error" || h.errorKind === "ruled_empty"
                          ? "parse"
                          : h.httpStatus !== undefined ||
                              h.errorKind === "http_401" ||
                              h.errorKind === "http_403"
                            ? "http"
                            : "other",
            httpStatus:
              h.httpStatus ??
              (h.errorKind === "http_401" ? 401 : h.errorKind === "http_403" ? 403 : undefined),
            serverErrorType: h.serverErrorType,
            serverErrorCode: h.serverErrorCode,
            serverAuthDenial: h.serverAuthDenial,
            credentialState: H,
            tokenRefreshOutcome: h.tokenRefreshOutcome,
            forcedRefreshOutcome: h.forcedRefreshOutcome,
            errno: h.errno,
            responseContentType: h.responseContentType,
            requestIdPresent: h.requestIdPresent,
            exchangeFinal: h.errorKind === "profile_credential_error" ? h.skipRetry === true : undefined,
          },
    );
    if (e.cycleFacts) e.cycleFacts.outcomeReason = I;
    let path = isManagedSettingsCopyTrustEnforced();
    let Z = hostSessionSkipsSharedCache()
      ? "not_read"
      : cacheTrustAnswer(
          {
            enforced: path,
            gateAnswer,
            hadCopy: remoteManagedSettingsRawCache !== null,
          },
          O.storedCopyShadow,
        );
    let settings = h.success ? h.settings : undefined;
    O.liveAnswer = h.success
      ? {
          jws: h.signature,
          bodySha: () => {
            if (settings !== null && settings !== undefined) return computeChecksum(servedBodyOf(settings));
            return remoteManagedSettingsRawCache !== null && isManagedSettingsCopyKeptVerifiable()
              ? computeChecksum(servedBodyOf(remoteManagedSettingsRawCache))
              : (h.checksum ?? "");
          },
        }
      : undefined;
    let K = !O.storedCopyReported && n === null;
    O.storedCopyReported = true;
    let ee = path ? storedCopyTrustedPrincipal : trustedPrincipal(O.storedCopyShadow);
    if (h.success && h.signature !== undefined && ee !== undefined && !O.livePrincipalChecked) {
      O.livePrincipalChecked = true;
      logPrincipalChange({
        kind: "managed-settings",
        jws: h.signature,
        trustedPrincipal: ee,
        gate: path ? "enforced" : "shadow",
      });
    }
    logEvent("tengu_remote_settings_fetch", {
      duration_ms: F,
      ms_since_startup: bodyReceivedAtMs - now,
      success: h.success,
      error_kind: fromEnumOpt(h.errorKind),
      http_status: h.httpStatus,
      attempts: h.attempts,
      had_cache: remoteManagedSettingsRawCache !== null,
      cache_age_ms: remoteManagedSettingsRawCache !== null ? P : undefined,
      stored_copy: K ? fromEnum(Z) : undefined,
      stored_copy_gate: K ? fromEnum(path ? "enforced" : "shadow") : undefined,
      is_load: !e.background,
      awaited: e.startupAwaited === true,
      auth_type: fromEnumOpt(h.authType),
      token_source: fromEnum(getAuthTokenSource().source),
      credential_road: fromEnum(settingsAuthSource()),
      credential_origin: fromEnumOpt(h.credentialOrigin),
      api_key_prefix: h.authType === "api_key" ? fromEnum(getApiKeyPrefixBucket()) : undefined,
      has_custom_base_url: hasCustomBaseUrlForAnalytics(),
      token_refresh_outcome: Q ? fromEnumOpt(h.tokenRefreshOutcome) : undefined,
      forced_refresh_outcome: Q ? fromEnumOpt(h.forcedRefreshOutcome) : undefined,
      retried_after_401: h.retriedAfter401 ?? false,
      server_error_type: fromEnumOpt(h.serverErrorType),
      server_error_code: fromEnumOpt(h.serverErrorCode),
      server_auth_denial: fromEnumOpt(h.serverAuthDenial),
      injected_token_recovery: fromEnumOpt(
        !h.success && h.credentialOrigin === "injected_token" ? injectedOAuthTokenRecovery() : undefined,
      ),
      credential_state: fromEnumOpt(H),
      error_errno: fromEnumOpt(h.errno),
      outcome_reason: fromEnum(I),
      response_kind: fromEnumOpt(h.success ? (h.responseKind ?? "body") : undefined),
      request_id_present: h.requestIdPresent,
      response_content_type: fromEnumOpt(h.responseContentType),
      prefetched: E !== undefined,
      hedged: h.hedged === true,
    });
    if (h.success && h.responseKind === "none_configured") clearEmptySettingsPresence();
    if (wasResetDuringFetch(syncCacheResetEpoch))
      return {
        settings: null,
        fetchSucceeded: false,
        resolution: "reset",
      };
    if (!h.success && h.errorKind === "ruled_empty") {
      if (remoteManagedSettingsRawCache) setSessionCache(remoteManagedSettingsRawCache);
      if (remoteManagedSettingsRawCache !== null && Object.keys(remoteManagedSettingsRawCache).length > 0) {
        logFeatureSad("remote_managed_settings_pull", "ruled_empty_kept_previous");
        logForDebugging(
          "Remote settings: ruled_empty_kept_previous - the previously accepted settings stay in force",
        );
      } else {
        logFeatureBad("remote_managed_settings_pull", "ruled_empty_nothing_kept");
        logForDebugging(
          "Remote settings: ruled_empty_nothing_kept - no previously accepted settings to keep; nothing applied",
        );
      }
      return {
        settings: remoteManagedSettingsRawCache,
        fetchSucceeded: false,
        failure: {
          errorKind: "ruled_empty",
          message: h.error ?? "ruled empty",
          rulings: h.rulings ?? [],
        },
        resolution: "ruled_empty",
      };
    }
    if (!h.success) {
      logFeatureBad("remote_managed_settings_pull", h.errorKind ?? "remote_managed_settings_fetch_failed");
      let q = {
        errorKind: h.errorKind ?? "unknown_error",
        message: h.error ?? "Unknown error",
        ...(h.httpStatus !== undefined && {
          httpStatus: h.httpStatus,
        }),
        ...(h.noResponse === true && {
          noResponse: true,
        }),
        ...(stampedServerErrorType(h) !== undefined && {
          serverErrorType: stampedServerErrorType(h),
          ...(h.serverErrorCode !== undefined && {
            serverErrorCode: h.serverErrorCode,
          }),
          ...(h.serverAuthDenial !== undefined && {
            serverAuthDenial: h.serverAuthDenial,
          }),
        }),
        ...((h.errorKind === "http_401" || h.errorKind === "http_403") && {
          credentialState: classifyRemoteSettingsFailure(
            h.serverErrorStamped === true || !isPolicyGraceEnabled()
              ? h
              : {
                  ...h,
                  serverErrorType: undefined,
                  serverErrorCode: undefined,
                  serverAuthDenial: h.errorKind === "http_401" ? h.serverAuthDenial : undefined,
                },
          ),
        }),
        ...(h.gatewayPinMismatch && {
          gatewayPinMismatch: h.gatewayPinMismatch,
        }),
      };
      if (remoteManagedSettingsRawCache) {
        logForDebugging(
          `Remote settings: Using stale cache after fetch failure (${formatRemoteSettingsErrorKind(q)})`,
        );
        setSessionCache(remoteManagedSettingsRawCache);
        return {
          settings: remoteManagedSettingsRawCache,
          fetchSucceeded: false,
          failure: q,
          resolution: "failed",
        };
      }
      logForDebugging(
        `Remote settings: Fetch failed (${formatRemoteSettingsErrorKind(q)}) and no cached settings`,
      );
      return {
        settings: null,
        fetchSucceeded: false,
        failure: q,
        resolution: "failed",
      };
    }
    if (
      h.settings === null &&
      remoteManagedSettingsRawCache &&
      remoteManagedSettingsRawCache === getRemoteManagedSettingsConsentedBaseline()
    ) {
      logForDebugging("Remote settings: Cache still valid (304 Not Modified)");
      setSessionCache(remoteManagedSettingsRawCache, {
        verified: true,
      });
      if (!hostSessionSkipsSharedCache()) {
        await maybePersistSignature(getSettingsPath(), h.signature, {
          keptVerifiable: isManagedSettingsCopyKeptVerifiable(),
        });
        let q = wasResetDuringFetch(syncCacheResetEpoch);
        if (await clearSignatureIfStale(getSettingsPath(), q)) await removeSyncStamp();
        else if (!isPolicyGraceEnabled()) await stampRemoteSettingsSync();
        if (q)
          return {
            settings: null,
            fetchSucceeded: false,
            resolution: "reset",
          };
      }
      if (!y) {
        await reapplyEnvAfterSettings();
        if (wasResetDuringFetch(syncCacheResetEpoch))
          return {
            settings: null,
            fetchSucceeded: false,
            resolution: "reset",
          };
        if (remoteManagedSettingsRawCache === getRemoteManagedSettingsConsentedBaseline()) {
          await recordConsentIfSameIdentity(
            h.consentIdentity,
            sanitizeRemoteSettings(remoteManagedSettingsRawCache),
            e.storageV5,
            e.credentials,
          );
          if (wasResetDuringFetch(syncCacheResetEpoch))
            return {
              settings: null,
              fetchSucceeded: false,
              resolution: "reset",
            };
        }
      }
      logFeatureOk("remote_managed_settings_pull", {
        status: lit("not_modified"),
      });
      return {
        settings: remoteManagedSettingsRawCache,
        fetchSucceeded: true,
        resolution: "applied",
      };
    }
    let L = h.settings ?? remoteManagedSettingsRawCache ?? {};
    if (Object.keys(L).length > 0) {
      let q = h.consentIdentity ? await readDangerousSettingsHash(h.consentIdentity, e.storageV5) : null;
      let Oe = sanitizeRemoteSettings(getRemoteManagedSettingsConsentedBaseline());
      let Ze =
        q !== null
          ? {
              source: "org_record",
              dangerousSettingsHash: q,
              consentedPayload: Oe,
            }
          : {
              source: "consented_payload",
              settings: Oe,
            };
      let code = sanitizeRemoteSettings(L);
      let result = await checkManagedSettingsSecurity(
        Ze,
        code,
        e.showSecurityDialog,
        fetchRemoteManagedSettingsSigned({
          jws: h.signature,
          settings: L,
          bodySent: h.settings !== null,
          authType: h.authType,
          fetchedAs: h.consentIdentity,
          cachePath: getSettingsPath(),
        }),
      );
      if (wasResetDuringFetch(syncCacheResetEpoch))
        return {
          settings: null,
          fetchSucceeded: false,
          resolution: "reset",
        };
      if (!handleSecurityCheckResult(result)) {
        if (result === "superseded") {
          logForDebugging(
            "Remote settings: A newer fetch took over the pending consent review; leaving the decision to it",
          );
          return {
            settings: remoteManagedSettingsRawCache,
            fetchSucceeded: true,
            resolution: "consent_superseded",
          };
        }
        if (result === "deferred_no_consent_surface") {
          let re = hasDeclaredNoConsentSurface();
          if (re) {
            logForDebugging(
              "Remote settings: Consent prompt deferred to the next interactive session (this command cannot host it); keeping the consented baseline",
            );
            logFeatureSad("remote_managed_settings_pull", "consent_deferred_no_surface");
          } else {
            logForDebugging(
              "Remote settings: No consent surface in this interactive session; keeping the consented baseline",
            );
            logFeatureBad("remote_managed_settings_pull", "remote_managed_settings_no_consent_surface");
          }
          return {
            settings: remoteManagedSettingsRawCache,
            fetchSucceeded: false,
            resolution: re ? "deferred" : "no_consent_surface",
          };
        }
        logForDebugging("Remote settings: User rejected new settings, using cached settings");
        return {
          settings: remoteManagedSettingsRawCache,
          fetchSucceeded: true,
          resolution: "rejected",
        };
      }
      setSessionCache(L, {
        verified: true,
        consentDeferred: result === "deferred_non_interactive",
      });
      if (!y) {
        await reapplyEnvAfterSettings();
        if (wasResetDuringFetch(syncCacheResetEpoch))
          return {
            settings: null,
            fetchSucceeded: false,
            resolution: "reset",
          };
      }
      switch (result) {
        case "approved":
        case "first_party_silent":
        case "no_check_needed":
          markRemoteManagedSettingsConsented(L);
          await recordConsentIfSameIdentity(h.consentIdentity, code, e.storageV5, e.credentials);
          if (wasResetDuringFetch(syncCacheResetEpoch))
            return {
              settings: null,
              fetchSucceeded: false,
              resolution: "reset",
            };
          let re = isManagedSettingsCopyKeptVerifiable() && h.settings !== null && h.signature !== undefined;
          let Ee = isManagedSettingsCopyKeptVerifiable() && h.settings === null;
          await saveSettings(
            re || Ee
              ? L
              : (h.salvagedSettings ??
                  (h.settings === null ? sanitizeRemoteSettingsKeepingSubstitutes(L) : L)),
            e.storageV5,
            re || (h.salvagedSettings === undefined && h.settings !== null)
              ? h.signature
              : Ee
                ? (h.signature ?? KEEP_STORED_STATEMENT)
                : undefined,
            n,
            h.settings !== null || !isPolicyGraceEnabled()
              ? BODY_JUST_RECEIVED
              : M === undefined
                ? 0
                : now_2 - M,
          );
          logForDebugging("Remote settings: Applied new settings successfully");
          logFeatureOk("remote_managed_settings_pull", {
            status: lit("updated"),
          });
          break;
        case "deferred_non_interactive":
          logForDebugging(
            "Remote settings: Applied for this non-interactive run; consent deferred \u2014 not persisting the disk cache as consented",
          );
          logFeatureOk("remote_managed_settings_pull", {
            status: lit("applied_consent_deferred"),
          });
          break;
        case "rejected":
        case "deferred_no_consent_surface":
        case "superseded":
          break;
      }
      return {
        settings: L,
        fetchSucceeded: true,
        resolution: "applied",
      };
    }
    if (h.isAnsweredEmpty === true && !wasResetDuringFetch(syncCacheResetEpoch)) markSettingsPresenceEmpty();
    let ve =
      h.responseKind === "none_configured" &&
      hasManagedSettings() &&
      getRemoteManagedSettingsRawCache() === null &&
      settingsPresenceSignal.get() === S;
    setSessionCache(L, {
      verified: true,
    });
    if (!y && !ve) {
      await reapplyEnvAfterSettings();
      if (wasResetDuringFetch(syncCacheResetEpoch))
        return {
          settings: null,
          fetchSucceeded: false,
          resolution: "reset",
        };
    }
    markRemoteManagedSettingsConsented(L);
    await recordConsentIfSameIdentity(h.consentIdentity, L, e.storageV5, e.credentials);
    if (wasResetDuringFetch(syncCacheResetEpoch))
      return {
        settings: null,
        fetchSucceeded: false,
        resolution: "reset",
      };
    await saveSettings(h.settings ?? {}, e.storageV5, h.signature, n, BODY_JUST_RECEIVED);
    logForDebugging("Remote settings: Saved empty sentinel (404 response)");
    logFeatureOk("remote_managed_settings_pull", {
      status: lit("no_content"),
    });
    return {
      settings: L,
      fetchSucceeded: true,
      resolution: "none",
      changesNothing: ve,
    };
  } catch {
    if (wasResetDuringFetch(syncCacheResetEpoch))
      return {
        settings: null,
        fetchSucceeded: false,
        resolution: "reset",
      };
    logFeatureBad("remote_managed_settings_pull", "remote_managed_settings_unexpected");
    let failure = {
      errorKind: "unknown_error",
      message: "Unexpected error while applying remote settings",
    };
    if (remoteManagedSettingsRawCache) {
      logForDebugging("Remote settings: Using stale cache after error");
      setSessionCache(remoteManagedSettingsRawCache);
      return {
        settings: remoteManagedSettingsRawCache,
        fetchSucceeded: false,
        failure,
        resolution: "failed",
      };
    }
    return {
      settings: null,
      fetchSucceeded: false,
      failure,
      resolution: "failed",
    };
  }
}
//@ chunk-4pc1m5n9.js:37968-38041 fingerprint = loadRemoteManagedSettings (1)
function loadRemoteManagedSettings_2() {
  try {
    markPolicySettingsNotified();
    settingsChangeDetector.notifyChange("policySettings");
  } catch (error) {
    logError(error);
  }
}
//@ chunk-4pc1m5n9.js:38041-38764 sole-consumer
/**
 * 远程设置变化后重新应用环境、代理、证书与 mTLS。
 */
async function reapplyEnvAfterSettings() {
  if (isDiskless()) return;
  try {
    let [
      { applyConfigEnvironmentVariables: e, applySafeConfigEnvironmentVariables: n },
      { checkHasTrustDialogAccepted: s },
      { captureAdmin3PSteeringSnapshot: r },
      { providerBoundRoute: y, resetProviderBoundCachesIfMoved: S },
    ] = await Promise.all([
      import("./chunk-q6kb333n.js"),
      import("./chunk-eesswvbz.js"),
      import("./chunk-kva132ev.js"),
      import("./chunk-zxkkfxjk.js"),
    ]);
    let k = false;
    let R = null;
    if (s()) e();
    else {
      n();
      let [
        { clearProxyCache: C, configureGlobalAgents: T },
        { clearCACertsCache: O, loadExtraCACerts: E },
        { clearMTLSCache: A, loadMTLSClientMaterial: P },
      ] = await Promise.all([
        import("./chunk-amdegp7s.js"),
        import("./chunk-1aa5zmz2.js"),
        import("./chunk-afejk3jk.js"),
      ]);
      C();
      O();
      A();
      await Promise.all([E(), P()]);
      T();
    }
    r();
  } catch (error) {
    logError(error);
  }
}
export {
  computeChecksumFromSettings,
  gatewayTrustFor,
  consentIdentityAsync,
  getRemoteManagedSettingsEndpoint,
  remoteSettingsCredentialKey,
  fetchRemoteManagedSettings,
  fetchAndLoadRemoteManagedSettings,
  loadRemoteManagedSettings_2,
  isManagedConfigPrefetchEnabled,
};
