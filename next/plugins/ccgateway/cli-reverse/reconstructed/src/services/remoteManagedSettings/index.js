/**
 * services/remoteManagedSettings/index.ts
 *
 * 远程托管设置：端点 /api/claude_code/settings（网关模式 /managed/settings），ETag/checksum 缓存到 remote-settings.json，启动时等待与后台刷新，校验后作为 policySettings 的 remote 层。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/remoteManagedSettings/index.ts
 * pieces: chunk-a28agxjs.js (35)
 * attribution: placement 13, fingerprint 5, layout 9, file-local 1, sole-consumer 5, callgraph-fingerprint 1, callgraph-witnessed 1
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
  getClaudeAIOAuthTokenOriginAsync,
  getAnthropicApiKeyWithSourceSafe,
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
import { getEmailAsync } from "../../utils/user.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-a28agxjs.js:2400-2443 placement
var TENGU_MANAGED_CONFIG_PREFETCH_OFF = "tengu_managed_config_prefetch_off";
//@ chunk-a28agxjs.js:2443-2595 placement
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
//@ chunk-a28agxjs.js:2595-3711 placement
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
    let pinnedOrgs;
    try {
      pinnedOrgs = describeMdmSettingsState();
    } catch (error) {
      logForDebugging(`Remote settings: the organization pin could not be read: ${errorMessage(error)}`, {
        level: "error",
      });
      logFeatureSad("remote_managed_settings_trusted_source", "org_pin_unknown");
      return false;
    }
    if (pinnedOrgs !== undefined && !pinnedOrgs.includes(organizationUuid)) {
      logFeatureSad("remote_managed_settings_trusted_source", "org_pin_mismatch");
      return false;
    }
    if (pinnedOrgs !== undefined)
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
      pinnedOrgs,
    });
    return true;
  };
}
//@ chunk-a28agxjs.js:3711-4101 placement
/**
 * 校验远程设置签名缓存并上报可信来源。
 */
function logTrustedSource({ jws, settings, cachePath, pinnedOrgs }) {
  try {
    let body = servedBodyOf(settings);
    let verdict = verifySignedCache({
      kind: "managed-settings",
      cachePath,
      live: {
        jws,
      },
      body,
      bodySha: computeChecksum(body),
      account: getStoredOauthAccountInfo(),
      pinnedOrgs,
      nowMs: Date.now(),
      roots: isSecDefaultPluginEnabled(),
    });
    if (verdict.trusted) logFeatureOk("remote_managed_settings_trusted_source");
    else logFeatureSad("remote_managed_settings_trusted_source", verdict.reason);
  } catch (error) {
    logError(error);
    logFeatureSad("remote_managed_settings_trusted_source", "error");
  }
}
//@ chunk-a28agxjs.js:6207-6502 placement
function remoteSettingsCredentialKey() {
  if (getGatewayAuth()) return "gateway";
  let claudeAIOAuthTokens = getClaudeAIOAuthTokens();
  let storedOauthAccountInfo = getStoredOauthAccountInfo();
  let hostBearer = hostOrgSignInBearer();
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
      hostBearer === undefined ? null : computeContentHash(hostBearer),
    ]),
  );
}
//@ chunk-a28agxjs.js:6502-6693 placement (2.1.88 match: getClientSurface, 0.785)
function getClientSurface() {
  let userAgent = getUserAgent({
    ownEntrypoint: true,
  });
  if (!isHostManagedProviderSession()) return userAgent;
  let entrypointSuffix = `, ${env.CLAUDE_CODE_ENTRYPOINT ?? "cli"}`;
  let index = userAgent.indexOf(entrypointSuffix);
  return index === -1
    ? userAgent
    : userAgent.slice(0, index + entrypointSuffix.length) +
        `, ${DESKTOP_3P_ENTRYPOINT}` +
        userAgent.slice(index + entrypointSuffix.length);
}
//@ chunk-a28agxjs.js:6693-6821 fingerprint (2.1.88 match: getRemoteManagedSettingsEndpoint, 0.74)
/**
 * 远程托管设置端点：网关模式为 <gateway>/managed/settings，否则 <BASE_API_URL>/api/claude_code/settings。
 */
function getRemoteManagedSettingsEndpoint() {
  let gatewayAuth = hasManagedSettings() ? null : getGatewayAuth();
  if (gatewayAuth) return `${gatewayAuth.url}/managed/settings`;
  return `${getOauthConfig().BASE_API_URL}/api/claude_code/settings`;
}
//@ chunk-a28agxjs.js:6821-6904 layout
function sanitizeRemoteSettings(settings) {
  if (!settings) return settings;
  return parsePolicyObjectTolerant(settings, "remote managed settings").settings ?? {};
}
//@ chunk-a28agxjs.js:6904-7495 layout
function ruleRemoteSettingsPayload(payload, source) {
  let stripped = stripReservedKeys(payload);
  let policyObjectTolerant = parsePolicyObjectTolerant(stripped, source);
  let restored = stripped;
  let keys = Object.keys(restored);
  if (
    !policyObjectTolerant.settings &&
    keys.length > 0 &&
    !keys.every((key) => policyObjectTolerant.removed.includes(key)) &&
    !sortKeysDeep(restored)
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
    settings: stripped,
    salvagedSettings: restoreSalvagedRemoteSettings(restored, policyObjectTolerant),
  };
}
//@ chunk-a28agxjs.js:7495-7585 file-local
function sortKeysDeep(obj) {
  let keys = Object.keys(obj);
  return (
    keys.length > 0 && keys.every((key) => RETENTION_POLICY_KEYS.some((allowedKey) => allowedKey === key))
  );
}
//@ chunk-a28agxjs.js:7585-7837 sole-consumer
function restoreSubstitutedRemoteKeys(settings, original, ruling) {
  let filtered = [
    ...RETENTION_POLICY_KEYS.filter((key) => key in original && !(key in settings)),
    ...(ruling.onlySubstitutes
      ? ruling.errors.filter((error) => error.onlySubstitutes).map((error) => error.path)
      : []),
  ].filter((key) => key in original);
  if (filtered.length === 0) return settings;
  return {
    ...settings,
    ...Object.fromEntries(filtered.map((key) => [key, original[key]])),
  };
}
//@ chunk-a28agxjs.js:7837-7921 sole-consumer
function sanitizeRemoteSettingsKeepingSubstitutes(payload) {
  let ruling = parsePolicyObjectTolerant(payload, "remote managed settings");
  return restoreSubstitutedRemoteKeys(ruling.settings ?? {}, payload, ruling);
}
//@ chunk-a28agxjs.js:7921-8019 sole-consumer
function restoreSalvagedRemoteSettings(original, ruling) {
  let salvaged = ruling.errors.length > 0 ? (ruling.settings ?? {}) : undefined;
  return salvaged === undefined ? undefined : restoreSubstitutedRemoteKeys(salvaged, original, ruling);
}
//@ chunk-a28agxjs.js:8019-8697 sole-consumer
async function fetchRemoteSettingsMockOrNull(options) {
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
      consentIdentity: await hasAnthropicApiKeyAuth(options),
    };
  try {
    let mockRemoteSettingsFixturePath = getMockRemoteSettingsFixturePath();
    let raw =
      mockRemoteSettingsFixturePath !== undefined
        ? await readFile(mockRemoteSettingsFixturePath, "utf-8")
        : mockRemoteSettingsValue;
    let parsed = jsonParse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return {
        success: false,
        error: "mock JSON parse failed",
        errorKind: "parse_error",
        skipRetry: true,
      };
    let ruled = ruleRemoteSettingsPayload(parsed, "mock remote settings");
    if ("ruledEmpty" in ruled) return ruled.ruledEmpty;
    return {
      success: true,
      ...ruled,
      checksum: "mock",
      consentIdentity: await hasAnthropicApiKeyAuth(options),
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
//@ chunk-a28agxjs.js:9361-12040 callgraph-fingerprint (2.1.88 match: getRemoteSettingsAuthHeaders, 0.275)
async function getRemoteSettingsAuthHeaders(credentials, options) {
  if (hasManagedSettings()) {
    let credential = claimedCredential();
    if (credential === null || envDriftDetected())
      return {
        headers: {},
        error:
          credential === null
            ? "No credential from the host that launched this session"
            : "The settings endpoint was moved after this session was launched",
        authType: "none",
      };
    let url = getRemoteManagedSettingsEndpoint();
    return credential.kind === "bearer"
      ? {
          headers: {
            Authorization: `Bearer ${credential.token}`,
            "anthropic-beta": OAUTH_BETA_HEADER,
          },
          authType: "oauth",
          credentialOrigin: "injected_token",
          url,
        }
      : {
          headers: {
            "x-api-key": credential.key,
          },
          authType: "api_key",
          url,
        };
  }
  let gatewayAuth = getGatewayAuth();
  if (gatewayAuth) {
    let pinnedFingerprint = isGatewayAuthPinned(gatewayAuth)
      ? await gatewayTrustFor(gatewayAuth, credentials)
      : undefined;
    return {
      headers: {
        Authorization: `Bearer ${gatewayAuth.jwt}`,
      },
      authType: "gateway_jwt",
      consentIdentity: computeChecksumFromSettings(gatewayAuth, pinnedFingerprint),
      pinnedFingerprint,
    };
  }
  let credentialKind = classifyRemoteSettingsCredential();
  if (credentialKind.kind === "org_login") {
    let claudeAIOAuthTokens = getClaudeAIOAuthTokens();
    if (claudeAIOAuthTokens?.accessToken)
      return {
        headers: {
          Authorization: `Bearer ${claudeAIOAuthTokens.accessToken}`,
          "anthropic-beta": OAUTH_BETA_HEADER,
        },
        authType: "oauth",
        accessToken: claudeAIOAuthTokens.accessToken,
        ...(await consentIdentityOf(credentials)),
      };
  }
  if (credentialKind.kind === "api_key") {
    if (apiKeyForHost(credentialKind.key) === null) {
      logForDebugging("Remote settings: API key not sent: ANTHROPIC_BASE_URL is not an Anthropic host");
      return {
        headers: {},
        error: "Remote settings: API key not sent: ANTHROPIC_BASE_URL is not an Anthropic host",
        authType: "api_key",
      };
    }
    return {
      headers: {
        "x-api-key": credentialKind.key,
      },
      authType: "api_key",
    };
  }
  if (credentialKind.kind === "host_bearer")
    return {
      headers: {
        Authorization: `Bearer ${credentialKind.bearer}`,
      },
      authType: "oauth",
      credentialOrigin: "injected_token",
    };
  if (credentialKind.kind === "profile") {
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
      let { getWIFCredentials, getWIFTokenCache } =
        await import("../../../vendor/@anthropic-ai/sdk/lib/credentials/TokenCache.lazy.js");
      let [wifTokenCache, wifCredentials] = await Promise.all([getWIFTokenCache(), getWIFCredentials()]);
      if (wifTokenCache !== null) {
        if (!getBridgeBaseUrl(wifCredentials?.baseURL)) {
          let message = `Remote settings: profile base URL ${wifCredentials?.baseURL ?? "(unknown)"} is not the settings endpoint's host; not fetching with the profile credential`;
          logForDebugging(message);
          return {
            headers: {},
            error: message,
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
          consentIdentity: getEmailAsync(),
        };
      }
    } catch (error) {
      let message = `Remote settings: profile credential unavailable: ${errorMessage(error)}`;
      logForDebugging(message, {
        level: "error",
      });
      let { isWIFTransientExchangeError } =
        await import("../../../vendor/@anthropic-ai/sdk/lib/credentials/TokenCache.lazy.js");
      return {
        headers: {},
        error: message,
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
      ...(await consentIdentityOf(credentials)),
    };
  return {
    headers: {},
    error: "No authentication available",
    authType: "none",
  };
}
//@ chunk-a28agxjs.js:12040-12097 placement
/**
 * 把 consentIdentityOf 的结果简化为同意身份对象。
 */
async function consentIdentityAsync(credentials) {
  return (await consentIdentityOf(credentials)).consentIdentity;
}
//@ chunk-a28agxjs.js:12097-12392 placement
async function consentIdentityOf(credentials) {
  let storedOauthAccountInfo = getStoredOauthAccountInfo();
  let claudeAIOAuthTokenOrigin = await getClaudeAIOAuthTokenOriginAsync(credentials);
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
//@ chunk-a28agxjs.js:12628-12659 placement
var GATEWAY = "gateway:";
var HYBRID = "hybrid:";
//@ chunk-a28agxjs.js:12659-12687 placement
async function hybridConsentIdentity(credentials) {
  return;
}
//@ chunk-a28agxjs.js:12687-12698 placement
var MAX_GATEWAY_ACCOUNT_ID_CHARS = 256;
//@ chunk-a28agxjs.js:12698-13000 placement
function computeChecksumFromSettings(auth, fingerprint) {
  if (!isGatewayAuthPinned(auth) || !fingerprint || fingerprint === HTTP_LOOPBACK) return;
  let parsedUrl;
  try {
    parsedUrl = new URL(auth.url);
  } catch {
    return;
  }
  if (parsedUrl.protocol !== "https:") return;
  let baseUrl = `${parsedUrl.origin}${parsedUrl.pathname === "/" ? "" : parsedUrl.pathname}`;
  let subject = gatewayJwtSubject(auth) ?? "";
  return {
    organizationUuid: `${GATEWAY}${baseUrl}#${fingerprint}`,
    accountUuid:
      subject.length > MAX_GATEWAY_ACCOUNT_ID_CHARS
        ? `sha256:${createHash("sha256").update(subject).digest("hex")}`
        : subject,
  };
}
//@ chunk-a28agxjs.js:13000-13056 placement
/**
 * 读取某网关地址对应主机的信任状态。
 */
async function gatewayTrustFor(gatewayAuth, credentials) {
  return readGatewayTrust(hostOf(new URL(gatewayAuth.url)), credentials);
}
//@ chunk-a28agxjs.js:13056-13229 layout (2.1.88 match: hasAnthropicApiKeyAuth, 1)
async function hasAnthropicApiKeyAuth(options) {
  let gatewayAuth = getGatewayAuth();
  if (gatewayAuth)
    return computeChecksumFromSettings(
      gatewayAuth,
      await gatewayTrustFor(gatewayAuth, options).catch(() => {
        return;
      }),
    );
  if (
    getAnthropicApiKeyWithSourceSafe({
      skipRetrievingKeyFromApiKeyHelper: true,
    }).key === null &&
    isProfileRemoteSettingsCredential()
  )
    return getEmailAsync();
  return consentIdentityAsync(options);
}
//@ chunk-a28agxjs.js:13229-13575 layout
/**
 * 同意身份与拉取身份一致时写同意记录。
 */
async function recordConsentIfSameIdentity(consentIdentity, settings, storageV5, credentials) {
  if (!consentIdentity) return;
  let currentIdentity = consentIdentity.organizationUuid.startsWith(GATEWAY)
    ? await hasAnthropicApiKeyAuth(credentials)
    : consentIdentity.organizationUuid.startsWith(HYBRID)
      ? await hybridConsentIdentity(credentials)
      : getStoredOauthAccountInfo();
  if (
    currentIdentity?.organizationUuid !== consentIdentity.organizationUuid ||
    currentIdentity.accountUuid !== consentIdentity.accountUuid
  ) {
    logForDebugging(
      "Remote settings: consent identity no longer matches the fetch identity; not recording org consent",
    );
    return;
  }
  await writeConsentRecords(consentIdentity, settings, storageV5);
}
//@ chunk-a28agxjs.js:13575-13769 layout
function wasResetDuringFetch(syncCacheResetEpoch) {
  if (getSyncCacheResetEpoch() === syncCacheResetEpoch) return false;
  logForDebugging("Remote settings: Cache was reset (login/logout) during this fetch; discarding its result");
  logFeatureSad("remote_managed_settings_pull", "reset_during_fetch");
  return true;
}
//@ chunk-a28agxjs.js:13769-13858 layout
function formatRemoteSettingsErrorKind(failure) {
  return failure.httpStatus !== undefined ? `${failure.errorKind}/${failure.httpStatus}` : failure.errorKind;
}
//@ chunk-a28agxjs.js:13858-14690 fingerprint (2.1.88 match: fetchWithRetry, 0.314)
async function fetchWithRetry(etag, options) {
  let remoteSettingsMockOrNull = await fetchRemoteSettingsMockOrNull(options.credentials);
  if (remoteSettingsMockOrNull) return remoteSettingsMockOrNull;
  let lastResult = null;
  let maxRetries =
    (getGatewayAuth() && !options.background) || options.singleAttempt
      ? 0
      : (options.maxRetries ?? MAX_BACKGROUND_FETCH_RETRIES);
  let isPrefetch = isManagedConfigPrefetchEnabled();
  let useHedge = isPrefetch && options.startupAwaited === true && !options.background && !getGatewayAuth();
  let oauthRefreshLatch = isPrefetch ? options.oauthRefreshLatch : undefined;
  let attemptFetch = (signal) =>
    fetchRemoteManagedSettings(
      etag,
      false,
      options.credentials,
      signal,
      oauthRefreshLatch,
      options.hybridOrganizationUuid,
    );
  let prefetched = options.prefetched;
  let hedged = false;
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    let current = prefetched ?? abortableAttempt(attemptFetch);
    prefetched = undefined;
    if (useHedge && attempt === 1) {
      let hedgedResult = await hedgedRequest({
        first: current,
        send: attemptFetch,
        isAnswer: (result, morePending) =>
          result.success || (result.skipRetry === true && !(morePending && result.errorKind === "http_401")),
        stillWanted: isManagedConfigPrefetchEnabled,
        retryFollows: maxRetries > 0,
      });
      lastResult = hedgedResult.result;
      hedged ||= hedgedResult.hedged;
    } else lastResult = await current.attempt;
    lastResult.attempts = attempt;
    if (hedged) lastResult.hedged = true;
    if (lastResult.success) return lastResult;
    if (lastResult.skipRetry) return lastResult;
    if (attempt > maxRetries) return lastResult;
    let delayMs = getRetryDelay(attempt);
    logForDebugging(
      `Remote settings: Retry ${attempt}/${maxRetries} after ${delayMs}ms (${formatRemoteSettingsErrorKind({
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
//@ chunk-a28agxjs.js:14690-14708 layout
var now; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-a28agxjs.js:14690", () => {
  now = Date.now();
});
//@ chunk-a28agxjs.js:14708-15803 layout
function classifyRemoteSettingsFailure(failure) {
  let errorCode = (() => {
    switch (failure.errorKind) {
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
  let httpStatus =
    failure.errorKind === "http_401" ? 401 : failure.errorKind === "http_403" ? 403 : failure.httpStatus;
  let authType =
    failure.authType === "oauth"
      ? "oauth"
      : failure.authType === "api_key"
        ? "api_key"
        : failure.authType === "profile"
          ? "wif"
          : undefined;
  return classifyAuthOutcome({
    errorCode,
    httpStatus,
    serverErrorType: failure.serverErrorType,
    serverErrorCode: failure.serverErrorCode,
    serverAuthDenial: failure.serverAuthDenial,
    tokenRefreshOutcome: failure.tokenRefreshOutcome,
    forcedRefreshOutcome: failure.forcedRefreshOutcome,
    authType,
    credentialOrigin: failure.authType === "api_key" ? "static_key" : failure.credentialOrigin,
    injectedTokenRecovery:
      failure.credentialOrigin === "injected_token" ? injectedOAuthTokenRecovery() : undefined,
    noResponse: failure.noResponse,
  });
}
//@ chunk-a28agxjs.js:15803-21421 fingerprint (2.1.88 match: fetchRemoteManagedSettings, 0.355)
/**
 * 单次请求远程设置端点（OAuth Bearer 或 API key），区分 200/204/304/404 与失败类型，带重试。
 */
async function fetchRemoteManagedSettings(etag, isRetry = false, credentials, signal, latch, options = null) {
  let latchStamp = latch && oauthRefreshLatchStamp(latch.recoveries);
  let accessToken;
  let isProfileBearer = false;
  let isStoredLogin = false;
  let refreshOutcome;
  let consentIdentity;
  let usedAuthUrl = false;
  let authFacts = {};
  let fail = (failure) => {
    logForDebugging(
      `Remote settings: Fetch attempt failed (${formatRemoteSettingsErrorKind({
        errorKind: failure.errorKind ?? "unknown_error",
        ...(failure.httpStatus !== undefined && {
          httpStatus: failure.httpStatus,
        }),
      })})`,
    );
    return {
      ...authFacts,
      ...failure,
    };
  };
  try {
    refreshOutcome =
      options !== null
        ? "not_needed"
        : await checkAndRefreshOAuthTokenIfNeededWithOutcome({
            credentials,
          });
    if (options === null) await refreshGatewayToken(credentials);
    let remoteSettingsAuthHeaders = await getRemoteSettingsAuthHeaders(credentials, options);
    accessToken = remoteSettingsAuthHeaders.accessToken;
    isProfileBearer = remoteSettingsAuthHeaders.profileBearer === true;
    isStoredLogin =
      remoteSettingsAuthHeaders.accessToken !== undefined &&
      remoteSettingsAuthHeaders.credentialOrigin === "stored_login";
    consentIdentity = remoteSettingsAuthHeaders.consentIdentity;
    authFacts = {
      authType: remoteSettingsAuthHeaders.authType,
      credentialOrigin: remoteSettingsAuthHeaders.credentialOrigin,
      tokenRefreshOutcome: remoteSettingsAuthHeaders.authType === "oauth" ? refreshOutcome : undefined,
    };
    if (remoteSettingsAuthHeaders.error)
      return fail({
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
    let url = remoteSettingsAuthHeaders.url ?? getRemoteManagedSettingsEndpoint();
    usedAuthUrl = remoteSettingsAuthHeaders.url !== undefined;
    let headers = {
      ...remoteSettingsAuthHeaders.headers,
      "User-Agent": isProviderManagedByHost() ? getClientSurface() : claudeCodeUserAgent(),
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    };
    let etagToSend = hasManagedOrCoworkSurface() || options !== null ? undefined : etag;
    if (etagToSend) headers["If-None-Match"] = `"${etagToSend}"`;
    let hostVerdict = getGatewayAuth()?.hostVerdict;
    let agent =
      pinnedAgentFor(remoteSettingsAuthHeaders.pinnedFingerprint, url) ??
      (hostVerdict && "verified" in hostVerdict && hostVerdict.verified && !("vouched" in hostVerdict)
        ? createPinnedAgent(url, hostVerdict.network)
        : undefined);
    let requestConfig = {
      headers,
      timeout: PROBE_TIMEOUT_MS,
      ...(hasManagedSettings() && {
        proxy: false,
      }),
      ...(usedAuthUrl && {
        maxRedirects: 0,
        adapter: "http",
      }),
      validateStatus: (status) => status === 200 || status === 204 || status === 304 || status === 404,
      signal,
    };
    let response = await axios_default.get(url, {
      ...requestConfig,
      ...(agent && {
        httpsAgent: agent,
      }),
    });
    noteGatewaySeen(response.headers?.["x-cc-gateway-version"]);
    if (response.status === 304) {
      if (!etagToSend) {
        logForDebugging("Remote settings: 304 to an unconditional request");
        return {
          success: false,
          error: "Unexpected 304 Not Modified",
          errorKind: "unknown_error",
          httpStatus: 304,
          skipRetry: true,
          ...authFacts,
          ...responseHeaderFacts(response.headers),
        };
      }
      logForDebugging("Remote settings: Using cached settings (304)");
      return {
        success: true,
        settings: null,
        checksum: etag,
        signature: signatureHeaderValue(response.headers),
        consentIdentity,
        ...authFacts,
        responseKind: "not_modified",
        ...responseHeaderFacts(response.headers),
      };
    }
    if (response.status === 204 || response.status === 404) {
      if (
        isPolicyGraceEnabled() &&
        authFacts.authType !== "gateway_jwt" &&
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
          ...authFacts,
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
        ...authFacts,
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
        ...authFacts,
        ...responseHeaderFacts(response.headers),
      };
    }
    let ruled = ruleRemoteSettingsPayload(
      hasManagedOrCoworkSurface() ? extractRestrictionSettings(parsed.data.settings) : parsed.data.settings,
      "remote managed settings",
    );
    if ("ruledEmpty" in ruled)
      return {
        ...ruled.ruledEmpty,
        ...authFacts,
      };
    if (latch && parsed.data.checksum) restoreOAuthRefreshLatch(latch, latchStamp);
    logForDebugging("Remote settings: Fetched successfully");
    return {
      success: true,
      ...ruled,
      checksum: parsed.data.checksum,
      isAnsweredEmpty: Object.keys(parsed.data.settings).length === 0,
      signature: hasManagedOrCoworkSurface() ? undefined : signatureHeaderValue(response.headers),
      consentIdentity,
      ...authFacts,
    };
  } catch (error) {
    let causeMessage = errorMessage(error?.cause);
    if (errorMessage(error).includes(PIN_STORE_SYMLINK_MESSAGE))
      return fail({
        success: false,
        error: "Cloud gateway TLS pin is in a symlinked credentials file",
        errorKind: "gateway_pin_refused",
        skipRetry: true,
      });
    if (errorMessage(error).includes(PIN_STORE_UNREADABLE_MESSAGE))
      return fail({
        success: false,
        error: "Cloud gateway TLS pin could not be read from the credentials file",
        errorKind: "gateway_pin_unreadable",
      });
    if (errorMessage(error).includes(PIN_MISMATCH_MESSAGE) || causeMessage.includes(PIN_MISMATCH_MESSAGE)) {
      let mismatch = pinMismatchFromError(error);
      return fail({
        success: false,
        error: "Cloud gateway TLS certificate does not match stored pin",
        errorKind: "gateway_cert_mismatch",
        ...(mismatch && {
          gatewayPinMismatch: mismatch,
        }),
        skipRetry: true,
      });
    }
    if (
      errorMessage(error).includes(PUBLIC_ADDRESS_MODEL_MESSAGE) ||
      causeMessage.includes(PUBLIC_ADDRESS_MODEL_MESSAGE)
    )
      return fail({
        success: false,
        error: "Cloud gateway connection outside the network it was checked on",
        errorKind: "gateway_public_address",
        skipRetry: true,
      });
    let { kind, status, message } = classifyAxiosError(error);
    if (status === 404 && options === null) {
      if (
        isPolicyGraceEnabled() &&
        authFacts.authType !== "gateway_jwt" &&
        !hasSessionsTokenRequestId(axios_default.isAxiosError(error) ? error.response?.headers : undefined)
      )
        return fail({
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
        ...authFacts,
        responseKind: "none_configured",
        ...responseHeaderFactsOf(error),
      };
    }
    let serverFacts = {
      ...extractServerErrorFields(error),
      ...responseHeaderFactsOf(error),
    };
    switch (kind) {
      case "auth": {
        let authFailure = {
          success: false,
          error: "Not authorized for remote settings",
          errorKind: status === 401 ? "http_401" : "http_403",
          skipRetry: true,
          ...serverFacts,
        };
        if (signal?.aborted) return fail(authFailure);
        let refreshOutcome_2;
        if (status === 401 && accessToken && !isRetry && !latch?.attempted) {
          let tokenToRefresh = accessToken;
          let recoveredToken = await countOAuth401Recovery(latch, async () => {
            if (isProfileBearer) {
              if (latch) latch.attempted = true;
              let { getWIFTokenCache, invalidateWIFToken } =
                await import("../../../vendor/@anthropic-ai/sdk/lib/credentials/TokenCache.lazy.js");
              await invalidateWIFToken(tokenToRefresh);
              return getWIFTokenCache()
                .then((wifTokenCache) => wifTokenCache?.getToken())
                .catch(() => {
                  return;
                });
            }
            refreshOutcome_2 = {
              outcome: undefined,
            };
            await handleOAuth401Error(tokenToRefresh, credentials, undefined, {
              onForcedRefreshOutcome: (forcedOutcome) => {
                refreshOutcome_2 = {
                  outcome: forcedOutcome,
                };
                authFailure.forcedRefreshOutcome = forcedOutcome;
                if (latch) {
                  latch.attempted = true;
                  latch.lastOutcome = forcedOutcome;
                }
              },
            });
            return getClaudeAIOAuthTokens()?.accessToken;
          });
          if (recoveredToken && recoveredToken !== accessToken) {
            fail(authFailure);
            logEvent("tengu_remote_settings_401_force_refresh_retry", {});
            let remoteManagedSettings = await fetchRemoteManagedSettings(
              etag,
              true,
              credentials,
              signal,
              latch,
            );
            return {
              ...remoteManagedSettings,
              retriedAfter401: true,
              forcedRefreshOutcome:
                remoteManagedSettings.forcedRefreshOutcome ?? authFailure.forcedRefreshOutcome,
            };
          }
        }
        if (status === 401 && isStoredLogin && isAuthFailureWorthRetrying(refreshOutcome, refreshOutcome_2))
          authFailure.skipRetry = false;
        if (status === 401 && isProfileBearer && isRetry) setWIFSettingsBearerRejected(true);
        if (status === 401 && authFailure.forcedRefreshOutcome === undefined && latch?.attempted)
          authFailure.forcedRefreshOutcome = latch.lastOutcome;
        return fail(authFailure);
      }
      case "timeout":
        return fail({
          success: false,
          error: "Remote settings request timeout",
          errorKind: "timeout",
          errno: fetchErrorCode(error),
        });
      case "network":
        return fail({
          success: false,
          error: "Cannot connect to server",
          errorKind: "network_error",
          errno: fetchErrorCode(error),
        });
      default:
        return fail({
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
          ...serverFacts,
          ...((isNonRetryableClientError(status) ||
            (usedAuthUrl && status !== undefined && status >= 300 && status < 400)) && {
            skipRetry: true,
          }),
        });
    }
  }
}
//@ chunk-a28agxjs.js:21421-21506 layout
/**
 * 哨兵值：保存远程设置时保留已存的签名/语句，不被这次结果覆盖。
 */
var KEEP_STORED_STATEMENT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var BODY_JUST_RECEIVED;
deferInit("chunk-a28agxjs.js:21421", () => {
  KEEP_STORED_STATEMENT = Symbol("keep the stored statement");
  BODY_JUST_RECEIVED = Symbol("the server sent the body now");
});
//@ chunk-a28agxjs.js:21506-22640 fingerprint (2.1.88 match: saveSettings, 0.338)
/**
 * 把远程设置写入缓存（storage 后端或 <配置目录>/remote-settings.json）。
 */
async function saveSettings(settings, storageV5, signature, hybridOrgUuid, bodyReceivedAt) {
  if (hostSessionSkipsSharedCache()) return;
  let text = jsonStringify(
    isManagedSettingsCopyKeptVerifiable() ? servedBodyOf(settings) : settings,
    null,
    2,
  );
  let helperDigest = helperConsentDigest(settings);
  if (isDiskless() && isStorageV5Enabled() && storageV5 !== undefined && !getRemoteSettingsPathOverride()) {
    let writeResult = await storageV5.write(STORAGE_SPACES.state("remote-settings"), text, {
      publishDiscipline: "inPlace",
      mode: 384,
      flush: true,
    });
    if (!writeResult.ok) {
      logForDebugging(`Remote settings: Failed to save - ${formatStorageError(writeResult.error)}`);
      return;
    }
    logForDebugging("Remote settings: Saved via storage backend");
    remoteSettingsFileWritten("cache", text);
    if (signature !== KEEP_STORED_STATEMENT) await saveSignedCacheJws(getSettingsPath(), signature);
    await stampRemoteSettingsSync(bodyReceivedAt === BODY_JUST_RECEIVED ? undefined : bodyReceivedAt);
    if (helperDigest !== undefined) {
      let helperWrite = await storageV5.write(STORAGE_SPACES.state(HELPER_CONSENT_STATE_ID), helperDigest, {
        publishDiscipline: "inPlace",
        mode: 384,
      });
      logForDebugging(
        helperWrite.ok
          ? "Remote settings: Saved helper consent via storage backend"
          : `Remote settings: Failed to save helper consent - ${formatStorageError(helperWrite.error)}`,
      );
      if (helperWrite.ok) remoteSettingsFileWritten("helperConsent", helperDigest);
    }
    return;
  }
  if (isDiskless()) {
    warnDisklessSettingsWrite("remote_settings", "remote-settings.json");
    return;
  }
  try {
    let path = getSettingsPath();
    await readStoredCertificate(path, text);
    logForDebugging(`Remote settings: Saved to ${path}`);
  } catch (error) {
    logForDebugging(
      `Remote settings: Failed to save - ${error instanceof Error ? error.message : "unknown error"}`,
    );
    return;
  }
  if (isStorageV5Enabled() && !getRemoteSettingsPathOverride()) remoteSettingsFileWritten("cache", text);
  if (signature !== KEEP_STORED_STATEMENT) await saveSignedCacheJws(getSettingsPath(), signature);
  await stampRemoteSettingsSync(bodyReceivedAt === BODY_JUST_RECEIVED ? undefined : bodyReceivedAt);
  if (helperDigest === undefined) return;
  try {
    await readStoredCertificate(getHelperConsentPath(), helperDigest);
    if (isStorageV5Enabled() && !getRemoteSettingsPathOverride())
      remoteSettingsFileWritten("helperConsent", helperDigest);
  } catch (error) {
    logForDebugging(`Remote settings: Failed to save helper consent - ${errorMessage(error)}`);
  }
}
//@ chunk-a28agxjs.js:23321-33778 callgraph-witnessed (2.1.88 match: fetchAndLoadRemoteManagedSettings, 0.072)
/**
 * 获取远程托管设置：不符合条件返回 ineligible；CLAUDE_CODE_REMOTE_SETTINGS_PATH 覆盖文件或受限子进程直接用本地快照；否则带缓存 checksum 请求端点（304 沿用缓存），校验签名/组织后写入 remote-settings.json 缓存并作为 policy 的 remote 层。
 */
async function fetchAndLoadRemoteManagedSettings(options) {
  if (!computeRemoteSettingsEligibility()) {
    currentRemoteSettingsState().prefetch.clear();
    return {
      settings: null,
      fetchSucceeded: true,
      resolution: "ineligible",
    };
  }
  let hybridOrgUuid = null;
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
  if (hybridOrgUuid === null) persistOrgPinFromEligibility();
  let settings = getRemoteManagedSettingsRawCache();
  let alreadyVerified = isRemoteManagedSettingsVerified();
  let presenceAtStart = settingsPresenceSignal.get();
  let gateAnswer = getStoredCopyTrust();
  let storedCopyTrustedPrincipal = getStoredCopyTrustedPrincipal();
  let cacheChecksum = settings ? computeChecksum(settings) : undefined;
  let syncCacheResetEpoch = getSyncCacheResetEpoch();
  let state = currentRemoteSettingsState();
  if (!state.signedCacheShadowChecked) {
    state.signedCacheShadowChecked = true;
    state.storedCopyAtStart =
      hostSessionSkipsSharedCache() || hasManagedSettings() || hybridOrgUuid !== null
        ? "not_read"
        : {
            enforced: isManagedSettingsCopyTrustEnforced(),
            gateAnswer,
            hadCopy: settings !== null,
          };
    if (settings && !hasManagedSettings() && hybridOrgUuid === null)
      verifyStoredCacheAsync({
        kind: "managed-settings",
        cachePath: getSettingsPath(),
        bodySha: isManagedSettingsCopyKeptVerifiable()
          ? computeChecksum(servedBodyOf(settings))
          : computeChecksum(settings),
        readStoredAccount: getStoredOauthAccountInfo,
        readOrgPin: describeMdmSettingsState,
        onJudged: (storedCopyShadow) => {
          state.storedCopyShadow = storedCopyShadow;
        },
      });
  }
  if (!options.background && state.prefetch.pending) {
    let result = await getClaudeAIOAuthTokenOriginAsync(options.credentials);
    if (result !== "store" || env.CLAUDE_CODE_OAUTH_TOKEN) clearOAuthTokenMemos();
    if (storeRecheckNeeded(result))
      await checkOAuthCredentialsChangedOnDisk(getRootSession().host, options.credentials);
  }
  let prefetchedFetch = options.background
    ? undefined
    : state.prefetch.take(
        (prefetchEntry) =>
          prefetchEntry.checksum === cacheChecksum &&
          prefetchEntry.epoch === syncCacheResetEpoch &&
          prefetchEntry.endpoint === getRemoteManagedSettingsEndpoint() &&
          prefetchEntry.principal === remoteSettingsCredentialKey(),
      );
  try {
    let now_2 = Date.now();
    let syncAgeMs = hybridOrgUuid === null ? await readSyncAge(now_2) : undefined;
    let cacheAgeMs =
      isPolicyGraceEnabled() && hybridOrgUuid === null
        ? await settingsAgeMs(settings !== null, syncAgeMs, now_2)
        : undefined;
    let etagToSend = isPolicyGraceEnabled() ? keepIfFresh(cacheChecksum, cacheAgeMs) : cacheChecksum;
    let now_3 = Date.now();
    let fetched = await fetchWithRetry(etagToSend, {
      ...options,
      prefetched: prefetchedFetch,
      oauthRefreshLatch: options.background ? undefined : state.oauthRefreshLatch,
      hybridOrganizationUuid: hybridOrgUuid,
    });
    let fetchMs = Date.now() - now_3;
    if (options.cycleFacts) {
      options.cycleFacts.hadCache = settings !== null;
      options.cycleFacts.fetchMs = fetchMs;
    }
    let bodyReceivedAtMs = now_3 + fetchMs;
    if (fetched.success && fetched.responseKind !== "not_modified") noteBodyReceivedAt(bodyReceivedAtMs);
    let usedOauth = fetched.authType === "oauth";
    let credentialState = fetched.success ? undefined : classifyRemoteSettingsFailure(fetched);
    let outcomeReason = settingsFetchOutcome(
      fetched.success
        ? {
            succeeded: true,
            responseKind: fetched.responseKind ?? "body",
          }
        : {
            succeeded: false,
            failure:
              fetched.errorKind === "no_auth_available" || fetched.errorKind === "api_key_not_sent"
                ? "no_credentials"
                : fetched.errorKind === "profile_credential_error"
                  ? "credential_exchange"
                  : fetched.errorKind === "timeout"
                    ? "timeout"
                    : fetched.errorKind === "network_error" ||
                        fetched.errorKind === "gateway_public_address" ||
                        fetched.noResponse
                      ? "network"
                      : fetched.errorKind === "gateway_cert_mismatch" ||
                          fetched.errorKind === "gateway_pin_refused" ||
                          fetched.errorKind === "gateway_pin_unreadable"
                        ? "tls"
                        : fetched.errorKind === "parse_error" || fetched.errorKind === "ruled_empty"
                          ? "parse"
                          : fetched.httpStatus !== undefined ||
                              fetched.errorKind === "http_401" ||
                              fetched.errorKind === "http_403"
                            ? "http"
                            : "other",
            httpStatus:
              fetched.httpStatus ??
              (fetched.errorKind === "http_401" ? 401 : fetched.errorKind === "http_403" ? 403 : undefined),
            serverErrorType: fetched.serverErrorType,
            serverErrorCode: fetched.serverErrorCode,
            serverAuthDenial: fetched.serverAuthDenial,
            credentialState,
            tokenRefreshOutcome: fetched.tokenRefreshOutcome,
            forcedRefreshOutcome: fetched.forcedRefreshOutcome,
            errno: fetched.errno,
            responseContentType: fetched.responseContentType,
            requestIdPresent: fetched.requestIdPresent,
            exchangeFinal:
              fetched.errorKind === "profile_credential_error" ? fetched.skipRetry === true : undefined,
          },
    );
    if (options.cycleFacts) options.cycleFacts.outcomeReason = outcomeReason;
    let path = isManagedSettingsCopyTrustEnforced();
    let storedCopyLabel = hostSessionSkipsSharedCache()
      ? "not_read"
      : cacheTrustAnswer(
          {
            enforced: path,
            gateAnswer,
            hadCopy: settings !== null,
          },
          state.storedCopyShadow,
        );
    let settings_2 = fetched.success ? fetched.settings : undefined;
    state.liveAnswer = fetched.success
      ? {
          jws: fetched.signature,
          bodySha: () => {
            if (settings_2 !== null && settings_2 !== undefined)
              return computeChecksum(servedBodyOf(settings_2));
            return settings !== null && isManagedSettingsCopyKeptVerifiable()
              ? computeChecksum(servedBodyOf(settings))
              : (fetched.checksum ?? "");
          },
        }
      : undefined;
    let reportStoredCopy = !state.storedCopyReported && hybridOrgUuid === null;
    state.storedCopyReported = true;
    let storedPrincipal = path ? storedCopyTrustedPrincipal : trustedPrincipal(state.storedCopyShadow);
    if (
      fetched.success &&
      fetched.signature !== undefined &&
      storedPrincipal !== undefined &&
      !state.livePrincipalChecked
    ) {
      state.livePrincipalChecked = true;
      logPrincipalChange({
        kind: "managed-settings",
        jws: fetched.signature,
        trustedPrincipal: storedPrincipal,
        gate: path ? "enforced" : "shadow",
      });
    }
    logEvent("tengu_remote_settings_fetch", {
      duration_ms: fetchMs,
      ms_since_startup: bodyReceivedAtMs - now,
      success: fetched.success,
      error_kind: fromEnumOpt(fetched.errorKind),
      http_status: fetched.httpStatus,
      attempts: fetched.attempts,
      had_cache: settings !== null,
      cache_age_ms: settings !== null ? syncAgeMs : undefined,
      stored_copy: reportStoredCopy ? fromEnum(storedCopyLabel) : undefined,
      stored_copy_gate: reportStoredCopy ? fromEnum(path ? "enforced" : "shadow") : undefined,
      is_load: !options.background,
      awaited: options.startupAwaited === true,
      auth_type: fromEnumOpt(fetched.authType),
      token_source: fromEnum(getAuthTokenSource().source),
      credential_road: fromEnum(settingsAuthSource()),
      credential_origin: fromEnumOpt(fetched.credentialOrigin),
      api_key_prefix: fetched.authType === "api_key" ? fromEnum(getApiKeyPrefixBucket()) : undefined,
      has_custom_base_url: hasCustomBaseUrlForAnalytics(),
      token_refresh_outcome: usedOauth ? fromEnumOpt(fetched.tokenRefreshOutcome) : undefined,
      forced_refresh_outcome: usedOauth ? fromEnumOpt(fetched.forcedRefreshOutcome) : undefined,
      retried_after_401: fetched.retriedAfter401 ?? false,
      server_error_type: fromEnumOpt(fetched.serverErrorType),
      server_error_code: fromEnumOpt(fetched.serverErrorCode),
      server_auth_denial: fromEnumOpt(fetched.serverAuthDenial),
      injected_token_recovery: fromEnumOpt(
        !fetched.success && fetched.credentialOrigin === "injected_token"
          ? injectedOAuthTokenRecovery()
          : undefined,
      ),
      credential_state: fromEnumOpt(credentialState),
      error_errno: fromEnumOpt(fetched.errno),
      outcome_reason: fromEnum(outcomeReason),
      response_kind: fromEnumOpt(fetched.success ? (fetched.responseKind ?? "body") : undefined),
      request_id_present: fetched.requestIdPresent,
      response_content_type: fromEnumOpt(fetched.responseContentType),
      prefetched: prefetchedFetch !== undefined,
      hedged: fetched.hedged === true,
    });
    if (fetched.success && fetched.responseKind === "none_configured") clearEmptySettingsPresence();
    if (wasResetDuringFetch(syncCacheResetEpoch))
      return {
        settings: null,
        fetchSucceeded: false,
        resolution: "reset",
      };
    if (!fetched.success && fetched.errorKind === "ruled_empty") {
      if (settings) setSessionCache(settings);
      if (settings !== null && Object.keys(settings).length > 0) {
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
        settings,
        fetchSucceeded: false,
        failure: {
          errorKind: "ruled_empty",
          message: fetched.error ?? "ruled empty",
          rulings: fetched.rulings ?? [],
        },
        resolution: "ruled_empty",
      };
    }
    if (!fetched.success) {
      logFeatureBad(
        "remote_managed_settings_pull",
        fetched.errorKind ?? "remote_managed_settings_fetch_failed",
      );
      let failure = {
        errorKind: fetched.errorKind ?? "unknown_error",
        message: fetched.error ?? "Unknown error",
        ...(fetched.httpStatus !== undefined && {
          httpStatus: fetched.httpStatus,
        }),
        ...(fetched.noResponse === true && {
          noResponse: true,
        }),
        ...(fetched.errno !== undefined && {
          errno: fetched.errno,
        }),
        ...(stampedServerErrorType(fetched) !== undefined && {
          serverErrorType: stampedServerErrorType(fetched),
          ...(fetched.serverErrorCode !== undefined && {
            serverErrorCode: fetched.serverErrorCode,
          }),
          ...(fetched.serverAuthDenial !== undefined && {
            serverAuthDenial: fetched.serverAuthDenial,
          }),
        }),
        ...((fetched.errorKind === "http_401" || fetched.errorKind === "http_403") && {
          credentialState: classifyRemoteSettingsFailure(
            fetched.serverErrorStamped === true || !isPolicyGraceEnabled()
              ? fetched
              : {
                  ...fetched,
                  serverErrorType: undefined,
                  serverErrorCode: undefined,
                  serverAuthDenial: fetched.errorKind === "http_401" ? fetched.serverAuthDenial : undefined,
                },
          ),
        }),
        ...(fetched.gatewayPinMismatch && {
          gatewayPinMismatch: fetched.gatewayPinMismatch,
        }),
      };
      if (settings) {
        logForDebugging(
          `Remote settings: Using stale cache after fetch failure (${formatRemoteSettingsErrorKind(failure)})`,
        );
        setSessionCache(settings);
        return {
          settings,
          fetchSucceeded: false,
          failure,
          resolution: "failed",
        };
      }
      logForDebugging(
        `Remote settings: Fetch failed (${formatRemoteSettingsErrorKind(failure)}) and no cached settings`,
      );
      return {
        settings: null,
        fetchSucceeded: false,
        failure,
        resolution: "failed",
      };
    }
    if (fetched.settings === null && settings && settings === getRemoteManagedSettingsConsentedBaseline()) {
      logForDebugging("Remote settings: Cache still valid (304 Not Modified)");
      setSessionCache(settings, {
        verified: true,
      });
      if (!hostSessionSkipsSharedCache()) {
        await maybePersistSignature(getSettingsPath(), fetched.signature, {
          keptVerifiable: isManagedSettingsCopyKeptVerifiable(),
        });
        let wasReset = wasResetDuringFetch(syncCacheResetEpoch);
        if (await clearSignatureIfStale(getSettingsPath(), wasReset)) await removeSyncStamp();
        else if (!isPolicyGraceEnabled()) await stampRemoteSettingsSync();
        if (wasReset)
          return {
            settings: null,
            fetchSucceeded: false,
            resolution: "reset",
          };
      }
      if (!alreadyVerified) {
        await reapplyEnvAfterSettings();
        if (wasResetDuringFetch(syncCacheResetEpoch))
          return {
            settings: null,
            fetchSucceeded: false,
            resolution: "reset",
          };
        if (settings === getRemoteManagedSettingsConsentedBaseline()) {
          await recordConsentIfSameIdentity(
            fetched.consentIdentity,
            sanitizeRemoteSettings(settings),
            options.storageV5,
            options.credentials,
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
        settings,
        fetchSucceeded: true,
        resolution: "applied",
      };
    }
    let nextSettings = fetched.settings ?? settings ?? {};
    if (Object.keys(nextSettings).length > 0) {
      let recordedHash = fetched.consentIdentity
        ? await readDangerousSettingsHash(fetched.consentIdentity, options.storageV5)
        : null;
      let consentedBaseline = sanitizeRemoteSettings(getRemoteManagedSettingsConsentedBaseline());
      let consentBaseline =
        recordedHash !== null
          ? {
              source: "org_record",
              dangerousSettingsHash: recordedHash,
              consentedPayload: consentedBaseline,
            }
          : {
              source: "consented_payload",
              settings: consentedBaseline,
            };
      let code = sanitizeRemoteSettings(nextSettings);
      let securityOutcome = await checkManagedSettingsSecurity(
        consentBaseline,
        code,
        options.showSecurityDialog,
        fetchRemoteManagedSettingsSigned({
          jws: fetched.signature,
          settings: nextSettings,
          bodySent: fetched.settings !== null,
          authType: fetched.authType,
          fetchedAs: fetched.consentIdentity,
          cachePath: getSettingsPath(),
        }),
      );
      if (wasResetDuringFetch(syncCacheResetEpoch))
        return {
          settings: null,
          fetchSucceeded: false,
          resolution: "reset",
        };
      if (!handleSecurityCheckResult(securityOutcome)) {
        if (securityOutcome === "superseded") {
          logForDebugging(
            "Remote settings: A newer fetch took over the pending consent review; leaving the decision to it",
          );
          return {
            settings,
            fetchSucceeded: true,
            resolution: "consent_superseded",
          };
        }
        if (securityOutcome === "deferred_no_consent_surface") {
          let isDeferred = hasDeclaredNoConsentSurface();
          if (isDeferred) {
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
            settings,
            fetchSucceeded: false,
            resolution: isDeferred ? "deferred" : "no_consent_surface",
          };
        }
        logForDebugging("Remote settings: User rejected new settings, using cached settings");
        return {
          settings,
          fetchSucceeded: true,
          resolution: "rejected",
        };
      }
      setSessionCache(nextSettings, {
        verified: true,
        consentDeferred: securityOutcome === "deferred_non_interactive",
      });
      if (!alreadyVerified) {
        await reapplyEnvAfterSettings();
        if (wasResetDuringFetch(syncCacheResetEpoch))
          return {
            settings: null,
            fetchSucceeded: false,
            resolution: "reset",
          };
      }
      switch (securityOutcome) {
        case "approved":
        case "first_party_silent":
        case "no_check_needed":
          markRemoteManagedSettingsConsented(nextSettings);
          await recordConsentIfSameIdentity(
            fetched.consentIdentity,
            code,
            options.storageV5,
            options.credentials,
          );
          if (wasResetDuringFetch(syncCacheResetEpoch))
            return {
              settings: null,
              fetchSucceeded: false,
              resolution: "reset",
            };
          let keepSigned =
            isManagedSettingsCopyKeptVerifiable() &&
            fetched.settings !== null &&
            fetched.signature !== undefined;
          let keptSignatureOnly = isManagedSettingsCopyKeptVerifiable() && fetched.settings === null;
          await saveSettings(
            keepSigned || keptSignatureOnly
              ? nextSettings
              : (fetched.salvagedSettings ??
                  (fetched.settings === null
                    ? sanitizeRemoteSettingsKeepingSubstitutes(nextSettings)
                    : nextSettings)),
            options.storageV5,
            keepSigned || (fetched.salvagedSettings === undefined && fetched.settings !== null)
              ? fetched.signature
              : keptSignatureOnly
                ? (fetched.signature ?? KEEP_STORED_STATEMENT)
                : undefined,
            hybridOrgUuid,
            fetched.settings !== null || !isPolicyGraceEnabled()
              ? BODY_JUST_RECEIVED
              : cacheAgeMs === undefined
                ? 0
                : now_2 - cacheAgeMs,
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
        settings: nextSettings,
        fetchSucceeded: true,
        resolution: "applied",
      };
    }
    if (fetched.isAnsweredEmpty === true && !wasResetDuringFetch(syncCacheResetEpoch))
      markSettingsPresenceEmpty();
    let nothingChanged =
      fetched.responseKind === "none_configured" &&
      hasManagedSettings() &&
      getRemoteManagedSettingsRawCache() === null &&
      settingsPresenceSignal.get() === presenceAtStart;
    setSessionCache(nextSettings, {
      verified: true,
    });
    if (!alreadyVerified && !nothingChanged) {
      await reapplyEnvAfterSettings();
      if (wasResetDuringFetch(syncCacheResetEpoch))
        return {
          settings: null,
          fetchSucceeded: false,
          resolution: "reset",
        };
    }
    markRemoteManagedSettingsConsented(nextSettings);
    await recordConsentIfSameIdentity(
      fetched.consentIdentity,
      nextSettings,
      options.storageV5,
      options.credentials,
    );
    if (wasResetDuringFetch(syncCacheResetEpoch))
      return {
        settings: null,
        fetchSucceeded: false,
        resolution: "reset",
      };
    await saveSettings(
      fetched.settings ?? {},
      options.storageV5,
      fetched.signature,
      hybridOrgUuid,
      BODY_JUST_RECEIVED,
    );
    logForDebugging("Remote settings: Saved empty sentinel (404 response)");
    logFeatureOk("remote_managed_settings_pull", {
      status: lit("no_content"),
    });
    return {
      settings: nextSettings,
      fetchSucceeded: true,
      resolution: "none",
      changesNothing: nothingChanged,
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
    if (settings) {
      logForDebugging("Remote settings: Using stale cache after error");
      setSessionCache(settings);
      return {
        settings,
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
//@ chunk-a28agxjs.js:38028-38101 fingerprint (2.1.88 match: loadRemoteManagedSettings, 1)
function loadRemoteManagedSettings_2() {
  try {
    markPolicySettingsNotified();
    settingsChangeDetector.notifyChange("policySettings");
  } catch (error) {
    logError(error);
  }
}
//@ chunk-a28agxjs.js:38101-38824 sole-consumer
/**
 * 远程设置变化后重新应用环境、代理、证书与 mTLS。
 */
async function reapplyEnvAfterSettings() {
  if (isDiskless()) return;
  try {
    let [
      {
        applyConfigEnvironmentVariables: applyConfigEnv,
        applySafeConfigEnvironmentVariables: applySafeConfigEnv,
      },
      { checkHasTrustDialogAccepted: hasTrustDialog },
      { captureAdmin3PSteeringSnapshot: capture3PSteering },
      { providerBoundRoute: boundRoute, resetProviderBoundCachesIfMoved: resetBoundCachesIfMoved },
    ] = await Promise.all([
      import("../../utils/managedEnvApply.js"),
      import("../../utils/config.js"),
      import("../../utils/model/thirdPartyDefaultFallbacks.js"),
      import("../../utils/model/resetProviderCaches.js"),
    ]);
    let unusedFlag = false;
    let unusedValue = null;
    if (hasTrustDialog()) applyConfigEnv();
    else {
      applySafeConfigEnv();
      let [
        { clearProxyCache, configureGlobalAgents },
        { clearCACertsCache, loadExtraCACerts },
        { clearMTLSCache, loadMTLSClientMaterial: loadMTLSMaterial },
      ] = await Promise.all([
        import("../../utils/proxy.js"),
        import("../../utils/caCerts.js"),
        import("../../utils/mtls.js"),
      ]);
      clearProxyCache();
      clearCACertsCache();
      clearMTLSCache();
      await Promise.all([loadExtraCACerts(), loadMTLSMaterial()]);
      configureGlobalAgents();
    }
    capture3PSteering();
  } catch (error) {
    logError(error);
  }
}
export {
  getRemoteManagedSettingsEndpoint,
  remoteSettingsCredentialKey,
  fetchRemoteManagedSettings,
  fetchAndLoadRemoteManagedSettings,
  loadRemoteManagedSettings_2,
  isManagedConfigPrefetchEnabled,
};
