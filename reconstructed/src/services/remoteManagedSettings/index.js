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
import { eZ } from "../../components/ManagedSettingsNotice.js";
import { hasUnsafeJsonValue } from "../../utils/settings/settingsSourceTrust.js";
import {
  classifyRemoteSettingsCredential,
  getBridgeBaseUrl,
  computeRemoteSettingsEligibility,
  i_i,
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
  BXt,
  saveSignedCacheJws,
  readStoredCertificate,
  cacheTrustAnswer,
  trustedPrincipal,
  y_r,
  __r,
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
import { isBigQueryMetricsEnabled } from "./storedLoginSurface.js";
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
  u1e,
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
import { iAn, ORt } from "../../entrypoints/warmSpare/claimCredentials.js";
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
  Npr,
  pinMismatchFromError,
  Lpr,
} from "../gateway/vouching.js";
import {
  writeConsentRecords,
  stampRemoteSettingsSync,
  readSyncAge,
  settingsAgeMs,
  vui,
  removeSyncStamp,
  readDangerousSettingsHash,
} from "./consentRecords.js";
import { at, He, D } from "./loader.js";
import { nAn, hedgedRequest } from "../policyLimits/startupGate.js";
import { getRetryDelay } from "../api/withRetry.js";
import { sleep } from "../../utils/sleep.js";
import { classifyAuthOutcome, settingsFetchOutcome } from "../analytics/authOutcomeTelemetry.js";
import { refreshGatewayToken } from "../gateway/gatewayAuth.js";
import { Dt } from "../../../vendor/axios/dist/esm/axios.js";
import { noteGatewaySeen } from "../gateway/hostCheck.js";
import {
  responseHeaderFacts,
  k5e,
  eAn,
  extractServerErrorFields,
  stampedServerErrorType,
} from "../api/errorUtils.js";
import { noteServedSettings, xJ, mJr, gJr } from "./seating.js";
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
/**
 * 是否预取托管配置（环境变量、第一方、开关）。
 */
//@ chunk-4pc1m5n9.js:2436-2588 placement
function isManagedConfigPrefetchEnabled() {
  let CLAUDE_CODE_MANAGED_CONFIG_PREFETCH = env.CLAUDE_CODE_MANAGED_CONFIG_PREFETCH;
  if (CLAUDE_CODE_MANAGED_CONFIG_PREFETCH !== void 0) return CLAUDE_CODE_MANAGED_CONFIG_PREFETCH;
  if (
    getAPIProvider() !== "firstParty" ||
    (!isActualFirstPartyAnthropicBaseUrl() && getPolicyLimitsTunnelSocket() === void 0)
  )
    return !1;
  return !getFeatureValue_CACHED_MAY_BE_STALE(TENGU_MANAGED_CONFIG_PREFETCH_OFF, !1);
}
//@ chunk-4pc1m5n9.js:2588-3702 placement
function fetchRemoteManagedSettingsSigned({
  jws: jws,
  settings: settings,
  bodySent: bodySent,
  authType: authType,
  fetchedAs: fetchedAs,
  cachePath: cachePath,
}) {
  let k = fetchedAs?.organizationUuid;
  if (authType !== "oauth" || k === void 0 || eZ() !== k || (!bodySent && hasUnsafeJsonValue(settings)))
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
      if (eZ() !== k) return !1;
      if (stdinOverrideCache.get().kind === "unavailable") return !1;
    } catch (error) {
      return (logError(error), logFeatureSad("remote_managed_settings_trusted_source", "error"), !1);
    }
    let R;
    try {
      R = describeMdmSettingsState();
    } catch (error) {
      return (
        logForDebugging(`Remote settings: the organization pin could not be read: ${errorMessage(error)}`, {
          level: "error",
        }),
        logFeatureSad("remote_managed_settings_trusted_source", "org_pin_unknown"),
        !1
      );
    }
    if (R !== void 0 && !R.includes(k))
      return (logFeatureSad("remote_managed_settings_trusted_source", "org_pin_mismatch"), !1);
    if (R !== void 0)
      try {
        if (
          verifyCacheSignature({
            jws: jws,
            kind: "managed-settings",
            orgUuid: k,
            unanchoredClaims: "accept",
            bodySha: computeChecksum(servedBodyOf(settings)),
            nowMs: Date.now(),
            roots: isSecDefaultPluginEnabled(),
          }).result === "aud_mismatch"
        )
          return (logFeatureSad("remote_managed_settings_trusted_source", "org_pin_aud_mismatch"), !1);
      } catch (error) {
        return (logError(error), logFeatureSad("remote_managed_settings_trusted_source", "error"), !1);
      }
    return (logTrustedSource({ jws: jws, settings: settings, cachePath: cachePath, pinnedOrgs: R }), !0);
  };
}
/**
 * 校验远程设置签名缓存并上报可信来源。
 */
//@ chunk-4pc1m5n9.js:3702-4092 placement
function logTrustedSource({ jws: jws, settings: settings, cachePath: cachePath, pinnedOrgs: pinnedOrgs }) {
  try {
    let y = servedBodyOf(settings),
      S = verifySignedCache({
        kind: "managed-settings",
        cachePath: cachePath,
        live: { jws: jws },
        body: y,
        bodySha: computeChecksum(y),
        account: getStoredOauthAccountInfo(),
        pinnedOrgs: pinnedOrgs,
        nowMs: Date.now(),
        roots: isSecDefaultPluginEnabled(),
      });
    if (S.trusted) logFeatureOk("remote_managed_settings_trusted_source");
    else logFeatureSad("remote_managed_settings_trusted_source", S.reason);
  } catch (error) {
    (logError(error), logFeatureSad("remote_managed_settings_trusted_source", "error"));
  }
}
//@ chunk-4pc1m5n9.js:6198-6493 placement
function remoteSettingsCredentialKey() {
  if (getGatewayAuth()) return "gateway";
  let e = getClaudeAIOAuthTokens(),
    n = getStoredOauthAccountInfo(),
    s = hostOrgSignInBearer();
  return computeContentHash(
    jsonStringify([
      isClaudeAISubscriber() && isBigQueryMetricsEnabled(),
      e?.accessToken === void 0
        ? null
        : e.refreshToken
          ? [n?.organizationUuid ?? "", n?.accountUuid ?? "", computeContentHash(e.accessToken)]
          : computeContentHash(e.accessToken),
      getAnthropicApiKeyFingerprint().fingerprint,
      isProfileRemoteSettingsCredential() ? (getWIFAccountInfo()?.organizationUuid ?? "") : null,
      s === void 0 ? null : computeContentHash(s),
    ]),
  );
}
//@ chunk-4pc1m5n9.js:6493-6684 placement = getClientSurface (0.785)
function getClientSurface() {
  let e = getUserAgent({ ownEntrypoint: !0 });
  if (!isHostManagedProviderSession()) return e;
  let n = `, ${env.CLAUDE_CODE_ENTRYPOINT ?? "cli"}`,
    index = e.indexOf(n);
  return index === -1
    ? e
    : e.slice(0, index + n.length) + `, ${DESKTOP_3P_ENTRYPOINT}` + e.slice(index + n.length);
}
/**
 * 远程托管设置端点：网关模式为 <gateway>/managed/settings，否则 <BASE_API_URL>/api/claude_code/settings。
 */
//@ chunk-4pc1m5n9.js:6684-6812 fingerprint = getRemoteManagedSettingsEndpoint (0.739)
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
  let s = stripReservedKeys(e),
    r = parsePolicyObjectTolerant(s, n),
    y = s,
    keys = Object.keys(y);
  if (!r.settings && keys.length > 0 && !keys.every((k) => r.removed.includes(k)) && !sortKeysDeep(y))
    return (
      logForDebugging(
        `Remote settings: ruled_empty - no key in the payload could be applied as written (${r.errors.length} rulings); nothing of it applies`,
      ),
      {
        ruledEmpty: {
          success: !1,
          error: "No setting in the payload could be applied as written",
          errorKind: "ruled_empty",
          rulings: r.errors,
          skipRetry: !0,
        },
      }
    );
  if (r.errors.length > 0)
    logForDebugging(
      `Remote settings: Payload contains ${r.errors.length} invalid entries; applying the salvaged subset`,
    );
  return { settings: s, salvagedSettings: ht(y, r) };
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
    ...(s.onlySubstitutes ? s.errors.filter((error) => error.onlySubstitutes).map((y) => y.path) : []),
  ].filter((y) => y in n);
  if (filtered.length === 0) return e;
  return { ...e, ...Object.fromEntries(filtered.map((y) => [y, n[y]])) };
}
//@ chunk-4pc1m5n9.js:7828-7912 sole-consumer
function sanitizeRemoteSettingsKeepingSubstitutes(e) {
  let n = parsePolicyObjectTolerant(e, "remote managed settings");
  return restoreSubstitutedRemoteKeys(n.settings ?? {}, e, n);
}
//@ chunk-4pc1m5n9.js:7912-8010 sole-consumer
function ht(e, n) {
  let s = n.errors.length > 0 ? (n.settings ?? {}) : void 0;
  return s === void 0 ? void 0 : restoreSubstitutedRemoteKeys(s, e, n);
}
//@ chunk-4pc1m5n9.js:8010-8688 sole-consumer
async function fetchRemoteSettingsMockOrNull(e) {
  let n = getMockRemoteSettingsValue();
  if (n === void 0) return null;
  if (n === "fail")
    return { success: !1, error: "mocked fetch failure", errorKind: "unknown_error", skipRetry: !0 };
  if (n === "empty")
    return {
      success: !0,
      settings: {},
      checksum: void 0,
      consentIdentity: await hasAnthropicApiKeyAuth_2(e),
    };
  try {
    let s = getMockRemoteSettingsFixturePath(),
      r = s !== void 0 ? await readFile(s, "utf-8") : n,
      y = jsonParse(r);
    if (!y || typeof y !== "object" || Array.isArray(y))
      return { success: !1, error: "mock JSON parse failed", errorKind: "parse_error", skipRetry: !0 };
    let S = ruleRemoteSettingsPayload(y, "mock remote settings");
    if ("ruledEmpty" in S) return S.ruledEmpty;
    return { success: !0, ...S, checksum: "mock", consentIdentity: await hasAnthropicApiKeyAuth_2(e) };
  } catch {
    return { success: !1, error: "mock JSON parse failed", errorKind: "parse_error", skipRetry: !0 };
  }
}
//@ chunk-4pc1m5n9.js:9352-12031 callgraph-fingerprint = getRemoteSettingsAuthHeaders (0.275)
async function getRemoteSettingsAuthHeaders(e, n) {
  if (hasManagedSettings()) {
    let S = iAn();
    if (S === null || ORt())
      return {
        headers: {},
        error:
          S === null
            ? "No credential from the host that launched this session"
            : "The settings endpoint was moved after this session was launched",
        authType: "none",
      };
    let k = getRemoteManagedSettingsEndpoint();
    return S.kind === "bearer"
      ? {
          headers: { Authorization: `Bearer ${S.token}`, "anthropic-beta": OAUTH_BETA_HEADER },
          authType: "oauth",
          credentialOrigin: "injected_token",
          url: k,
        }
      : { headers: { "x-api-key": S.key }, authType: "api_key", url: k };
  }
  let s = getGatewayAuth();
  if (s) {
    let S = isGatewayAuthPinned(s) ? await Ge(s, e) : void 0;
    return {
      headers: { Authorization: `Bearer ${s.jwt}` },
      authType: "gateway_jwt",
      consentIdentity: computeChecksumFromSettings(s, S),
      pinnedFingerprint: S,
    };
  }
  let r = classifyRemoteSettingsCredential();
  if (r.kind === "org_login") {
    let S = getClaudeAIOAuthTokens();
    if (S?.accessToken)
      return {
        headers: { Authorization: `Bearer ${S.accessToken}`, "anthropic-beta": OAUTH_BETA_HEADER },
        authType: "oauth",
        accessToken: S.accessToken,
        ...(await consentIdentityOf(e)),
      };
  }
  if (r.kind === "api_key") {
    if (apiKeyForHost(r.key) === null)
      return (
        logForDebugging("Remote settings: API key not sent: ANTHROPIC_BASE_URL is not an Anthropic host"),
        {
          headers: {},
          error: "Remote settings: API key not sent: ANTHROPIC_BASE_URL is not an Anthropic host",
          authType: "api_key",
        }
      );
    return { headers: { "x-api-key": r.key }, authType: "api_key" };
  }
  if (r.kind === "host_bearer")
    return {
      headers: { Authorization: `Bearer ${r.bearer}` },
      authType: "oauth",
      credentialOrigin: "injected_token",
    };
  if (r.kind === "profile") {
    if (isWIFSettingsBearerRejected())
      return (
        logForDebugging(
          "Remote settings: the settings endpoint rejected the profile credential after a forced refresh; not fetching with it again until the next sign-in or restart",
        ),
        {
          headers: {},
          error:
            "Remote settings: the settings endpoint rejected the profile credential after a forced refresh; not fetching with it again until the next sign-in or restart",
          authType: "profile",
          profileError: !0,
        }
      );
    try {
      let { getWIFCredentials: getWIFCredentials, getWIFTokenCache: getWIFTokenCache } =
          await import("./chunk-7k61ne1e.js"),
        [R, C] = await Promise.all([getWIFTokenCache(), getWIFCredentials()]);
      if (R !== null) {
        if (!getBridgeBaseUrl(C?.baseURL)) {
          let O = `Remote settings: profile base URL ${C?.baseURL ?? "(unknown)"} is not the settings endpoint's host; not fetching with the profile credential`;
          return (logForDebugging(O), { headers: {}, error: O, authType: "profile", profileError: !0 });
        }
        let token = await R.getToken();
        return {
          headers: { ...C?.extraHeaders, Authorization: `Bearer ${token}` },
          authType: "profile",
          accessToken: token,
          profileBearer: !0,
          consentIdentity: getEmail(),
        };
      }
    } catch (error) {
      let k = `Remote settings: profile credential unavailable: ${errorMessage(error)}`;
      logForDebugging(k, { level: "error" });
      let { isWIFTransientExchangeError: isWIFTransientExchangeError } = await import("./chunk-7k61ne1e.js");
      return {
        headers: {},
        error: k,
        authType: "profile",
        profileError: !0,
        retryable: isWIFTransientExchangeError(error),
      };
    }
  }
  let oauthTokens = getClaudeAIOAuthTokens();
  if (oauthTokens?.accessToken)
    return {
      headers: { Authorization: `Bearer ${oauthTokens.accessToken}`, "anthropic-beta": OAUTH_BETA_HEADER },
      authType: "oauth",
      accessToken: oauthTokens.accessToken,
      ...(await consentIdentityOf(e)),
    };
  return { headers: {}, error: "No authentication available", authType: "none" };
}
//@ chunk-4pc1m5n9.js:12031-12088 placement
async function yt(e) {
  return (await consentIdentityOf(e)).consentIdentity;
}
//@ chunk-4pc1m5n9.js:12088-12383 placement
async function consentIdentityOf(e) {
  let n = getStoredOauthAccountInfo(),
    s = await getClaudeAIOAuthTokenOriginAsync(e),
    r = s === "store" ? "stored_login" : s === "env" || s === "fd" ? "injected_token" : void 0;
  if (s !== "store") return { credentialOrigin: r };
  return {
    credentialOrigin: r,
    consentIdentity: n?.organizationUuid
      ? { organizationUuid: n.organizationUuid, accountUuid: n.accountUuid }
      : void 0,
  };
}
//@ chunk-4pc1m5n9.js:12619-12650 placement
var GATEWAY = "gateway:",
  HYBRID = "hybrid:";
//@ chunk-4pc1m5n9.js:12650-12678 placement
async function _t(e) {
  return;
}
//@ chunk-4pc1m5n9.js:12678-12689 placement
var wt = 256;
//@ chunk-4pc1m5n9.js:12689-12991 placement
function computeChecksumFromSettings(e, n) {
  if (!isGatewayAuthPinned(e) || !n || n === HTTP_LOOPBACK) return;
  let s;
  try {
    s = new URL(e.url);
  } catch {
    return;
  }
  if (s.protocol !== "https:") return;
  let r = `${s.origin}${s.pathname === "/" ? "" : s.pathname}`,
    y = gatewayJwtSubject(e) ?? "";
  return {
    organizationUuid: `${GATEWAY}${r}#${n}`,
    accountUuid: y.length > wt ? `sha256:${createHash("sha256").update(y).digest("hex")}` : y,
  };
}
//@ chunk-4pc1m5n9.js:12991-13047 placement
async function Ge(e, n) {
  return readGatewayTrust(hostOf(new URL(e.url)), n);
}
/**
 * 同意身份与拉取身份一致时写同意记录。
 */
//@ chunk-4pc1m5n9.js:13220-13566 sole-consumer
async function recordConsentIfSameIdentity(e, n, s, r) {
  if (!e) return;
  let y = e.organizationUuid.startsWith(GATEWAY)
    ? await hasAnthropicApiKeyAuth_2(r)
    : e.organizationUuid.startsWith(HYBRID)
      ? await _t(r)
      : getStoredOauthAccountInfo();
  if (y?.organizationUuid !== e.organizationUuid || y.accountUuid !== e.accountUuid) {
    logForDebugging(
      "Remote settings: consent identity no longer matches the fetch identity; not recording org consent",
    );
    return;
  }
  await writeConsentRecords(e, n, s);
}
//@ chunk-4pc1m5n9.js:13566-13760 sole-consumer
function wasResetDuringFetch(e) {
  if (getSyncCacheResetEpoch() === e) return !1;
  return (
    logForDebugging(
      "Remote settings: Cache was reset (login/logout) during this fetch; discarding its result",
    ),
    logFeatureSad("remote_managed_settings_pull", "reset_during_fetch"),
    !0
  );
}
//@ chunk-4pc1m5n9.js:13760-13849 affinity
function formatRemoteSettingsErrorKind(e) {
  return e.httpStatus !== void 0 ? `${e.errorKind}/${e.httpStatus}` : e.errorKind;
}
//@ chunk-4pc1m5n9.js:13849-14681 fingerprint = fetchWithRetry (0.314)
async function fetchWithRetry(e, n) {
  let s = await fetchRemoteSettingsMockOrNull(n.credentials);
  if (s) return s;
  let lastResult = null,
    y = (getGatewayAuth() && !n.background) || n.singleAttempt ? 0 : (n.maxRetries ?? at),
    S = isManagedConfigPrefetchEnabled(),
    k = S && n.startupAwaited === !0 && !n.background && !getGatewayAuth(),
    R = S ? n.oauthRefreshLatch : void 0,
    C = (E) => fetchRemoteManagedSettings(e, !1, n.credentials, E, R, n.hybridOrganizationUuid),
    prefetched = n.prefetched,
    O = !1;
  for (let attempt = 1; attempt <= y + 1; attempt++) {
    let A = prefetched ?? nAn(C);
    if (((prefetched = void 0), k && attempt === 1)) {
      let M = await hedgedRequest({
        first: A,
        send: C,
        isAnswer: (w, G) => w.success || (w.skipRetry === !0 && !(G && w.errorKind === "http_401")),
        stillWanted: isManagedConfigPrefetchEnabled,
        retryFollows: y > 0,
      });
      ((lastResult = M.result), (O ||= M.hedged));
    } else lastResult = await A.attempt;
    if (((lastResult.attempts = attempt), O)) lastResult.hedged = !0;
    if (lastResult.success) return lastResult;
    if (lastResult.skipRetry) return lastResult;
    if (attempt > y) return lastResult;
    let delayMs = getRetryDelay(attempt);
    (logForDebugging(
      `Remote settings: Retry ${attempt}/${y} after ${delayMs}ms (${formatRemoteSettingsErrorKind({ errorKind: lastResult.errorKind ?? "unknown_error", ...(lastResult.httpStatus !== void 0 && { httpStatus: lastResult.httpStatus }) })})`,
    ),
      await sleep(delayMs));
  }
  return lastResult;
}
//@ chunk-4pc1m5n9.js:14681-14699 layout
var now = Date.now();
//@ chunk-4pc1m5n9.js:14699-15794 layout
function classifyRemoteSettingsFailure(e) {
  let n = (() => {
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
        case void 0:
          return;
      }
    })(),
    s = e.errorKind === "http_401" ? 401 : e.errorKind === "http_403" ? 403 : e.httpStatus,
    r =
      e.authType === "oauth"
        ? "oauth"
        : e.authType === "api_key"
          ? "api_key"
          : e.authType === "profile"
            ? "wif"
            : void 0;
  return classifyAuthOutcome({
    errorCode: n,
    httpStatus: s,
    serverErrorType: e.serverErrorType,
    serverErrorCode: e.serverErrorCode,
    serverAuthDenial: e.serverAuthDenial,
    tokenRefreshOutcome: e.tokenRefreshOutcome,
    forcedRefreshOutcome: e.forcedRefreshOutcome,
    authType: r,
    credentialOrigin: e.authType === "api_key" ? "static_key" : e.credentialOrigin,
    injectedTokenRecovery: e.credentialOrigin === "injected_token" ? injectedOAuthTokenRecovery() : void 0,
    noResponse: e.noResponse,
  });
}
/**
 * 单次请求远程设置端点（OAuth Bearer 或 API key），区分 200/204/304/404 与失败类型，带重试。
 */
//@ chunk-4pc1m5n9.js:15794-21412 fingerprint = fetchRemoteManagedSettings (0.355)
async function fetchRemoteManagedSettings(e, n = !1, s, r, y, S = null) {
  let k = y && oauthRefreshLatchStamp(y.recoveries),
    R,
    C = !1,
    T = !1,
    O,
    E,
    A = !1,
    P = {},
    M = (w) => (
      logForDebugging(
        `Remote settings: Fetch attempt failed (${formatRemoteSettingsErrorKind({ errorKind: w.errorKind ?? "unknown_error", ...(w.httpStatus !== void 0 && { httpStatus: w.httpStatus }) })})`,
      ),
      { ...P, ...w }
    );
  try {
    if (
      ((O =
        S !== null ? "not_needed" : await checkAndRefreshOAuthTokenIfNeededWithOutcome({ credentials: s })),
      S === null)
    )
      await refreshGatewayToken(s);
    let w = await getRemoteSettingsAuthHeaders(s, S);
    if (
      ((R = w.accessToken),
      (C = w.profileBearer === !0),
      (T = w.accessToken !== void 0 && w.credentialOrigin === "stored_login"),
      (E = w.consentIdentity),
      (P = {
        authType: w.authType,
        credentialOrigin: w.credentialOrigin,
        tokenRefreshOutcome: w.authType === "oauth" ? O : void 0,
      }),
      w.error)
    )
      return M({
        success: !1,
        error: w.profileError ? w.error : "Authentication required for remote settings",
        errorKind: w.profileError
          ? "profile_credential_error"
          : w.authType === "api_key"
            ? "api_key_not_sent"
            : w.retryable
              ? "network_error"
              : "no_auth_available",
        skipRetry: !w.retryable,
      });
    let G = w.url ?? getRemoteManagedSettingsEndpoint();
    A = w.url !== void 0;
    let h = {
        ...w.headers,
        "User-Agent": isProviderManagedByHost() ? getClientSurface() : claudeCodeUserAgent(),
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
      F = u1e() || S !== null ? void 0 : e;
    if (F) h["If-None-Match"] = `"${F}"`;
    let V = getGatewayAuth()?.hostVerdict,
      Q =
        pinnedAgentFor(w.pinnedFingerprint, G) ??
        (V && "verified" in V && V.verified && !("vouched" in V) ? createPinnedAgent(G, V.network) : void 0),
      H = {
        headers: h,
        timeout: He,
        ...(hasManagedSettings() && { proxy: !1 }),
        ...(A && { maxRedirects: 0, adapter: "http" }),
        validateStatus: (N) => N === 200 || N === 204 || N === 304 || N === 404,
        signal: r,
      },
      response = await Dt.get(G, { ...H, ...(Q && { httpsAgent: Q }) });
    if ((noteGatewaySeen(response.headers?.["x-cc-gateway-version"]), response.status === 304)) {
      if (!F)
        return (
          logForDebugging("Remote settings: 304 to an unconditional request"),
          {
            success: !1,
            error: "Unexpected 304 Not Modified",
            errorKind: "unknown_error",
            httpStatus: 304,
            skipRetry: !0,
            ...P,
            ...responseHeaderFacts(response.headers),
          }
        );
      return (
        logForDebugging("Remote settings: Using cached settings (304)"),
        {
          success: !0,
          settings: null,
          checksum: e,
          signature: BXt(response.headers),
          consentIdentity: E,
          ...P,
          responseKind: "not_modified",
          ...responseHeaderFacts(response.headers),
        }
      );
    }
    if (response.status === 204 || response.status === 404) {
      if (isPolicyGraceEnabled() && P.authType !== "gateway_jwt" && !k5e(response.headers))
        return (
          logForDebugging(
            `Remote settings: ${response.status} without Anthropic's request id \u2014 an intermediary's answer, keeping cached settings`,
          ),
          {
            success: !1,
            error: `${response.status} from an intermediary (no Anthropic request id)`,
            errorKind: "http_4xx",
            httpStatus: response.status,
            skipRetry: !0,
            ...P,
            ...responseHeaderFacts(response.headers),
          }
        );
      return (
        logForDebugging(`Remote settings: No settings found (${response.status})`),
        {
          success: !0,
          settings: {},
          checksum: void 0,
          signature: BXt(response.headers),
          consentIdentity: E,
          ...P,
          responseKind: "none_configured",
          ...responseHeaderFacts(response.headers),
        }
      );
    }
    noteServedSettings(response.data);
    let parsed = RemoteManagedSettingsResponseSchema().safeParse(response.data);
    if (!parsed.success)
      return (
        logForDebugging(`Remote settings: Invalid response format - ${parsed.error.message}`),
        {
          success: !1,
          error: "Invalid remote settings format",
          errorKind: "parse_error",
          skipRetry: !0,
          ...P,
          ...responseHeaderFacts(response.headers),
        }
      );
    let Z = ruleRemoteSettingsPayload(
      u1e() ? extractRestrictionSettings(parsed.data.settings) : parsed.data.settings,
      "remote managed settings",
    );
    if ("ruledEmpty" in Z) return { ...Z.ruledEmpty, ...P };
    if (y && parsed.data.checksum) restoreOAuthRefreshLatch(y, k);
    return (
      logForDebugging("Remote settings: Fetched successfully"),
      {
        success: !0,
        ...Z,
        checksum: parsed.data.checksum,
        isAnsweredEmpty: Object.keys(parsed.data.settings).length === 0,
        signature: u1e() ? void 0 : BXt(response.headers),
        consentIdentity: E,
        ...P,
      }
    );
  } catch (error) {
    let G = errorMessage(error?.cause);
    if (errorMessage(error).includes(PIN_STORE_SYMLINK_MESSAGE))
      return M({
        success: !1,
        error: "Cloud gateway TLS pin is in a symlinked credentials file",
        errorKind: "gateway_pin_refused",
        skipRetry: !0,
      });
    if (errorMessage(error).includes(PIN_STORE_UNREADABLE_MESSAGE))
      return M({
        success: !1,
        error: "Cloud gateway TLS pin could not be read from the credentials file",
        errorKind: "gateway_pin_unreadable",
      });
    if (errorMessage(error).includes(Npr) || G.includes(Npr)) {
      let H = pinMismatchFromError(error);
      return M({
        success: !1,
        error: "Cloud gateway TLS certificate does not match stored pin",
        errorKind: "gateway_cert_mismatch",
        ...(H && { gatewayPinMismatch: H }),
        skipRetry: !0,
      });
    }
    if (errorMessage(error).includes(Lpr) || G.includes(Lpr))
      return M({
        success: !1,
        error: "Cloud gateway connection outside the network it was checked on",
        errorKind: "gateway_public_address",
        skipRetry: !0,
      });
    let { kind: kind, status: status, message: message } = classifyAxiosError(error);
    if (status === 404 && S === null) {
      if (
        isPolicyGraceEnabled() &&
        P.authType !== "gateway_jwt" &&
        !k5e(Dt.isAxiosError(error) ? error.response?.headers : void 0)
      )
        return M({
          success: !1,
          error: "404 from an intermediary (no Anthropic request id)",
          errorKind: "http_4xx",
          httpStatus: 404,
          skipRetry: !0,
          ...eAn(error),
        });
      return {
        success: !0,
        settings: {},
        checksum: "",
        consentIdentity: E,
        ...P,
        responseKind: "none_configured",
        ...eAn(error),
      };
    }
    let Q = { ...extractServerErrorFields(error), ...eAn(error) };
    switch (kind) {
      case "auth": {
        let H = {
          success: !1,
          error: "Not authorized for remote settings",
          errorKind: status === 401 ? "http_401" : "http_403",
          skipRetry: !0,
          ...Q,
        };
        if (r?.aborted) return M(H);
        let I;
        if (status === 401 && R && !n && !y?.attempted) {
          let U = R,
            N = await countOAuth401Recovery(y, async () => {
              if (C) {
                if (y) y.attempted = !0;
                let { getWIFTokenCache: getWIFTokenCache, invalidateWIFToken: invalidateWIFToken } =
                  await import("./chunk-7k61ne1e.js");
                return (
                  await invalidateWIFToken(U),
                  getWIFTokenCache()
                    .then((L) => L?.getToken())
                    .catch(() => {
                      return;
                    })
                );
              }
              return (
                (I = { outcome: void 0 }),
                await handleOAuth401Error(U, s, void 0, {
                  onForcedRefreshOutcome: (K) => {
                    if (((I = { outcome: K }), (H.forcedRefreshOutcome = K), y))
                      ((y.attempted = !0), (y.lastOutcome = K));
                  },
                }),
                getClaudeAIOAuthTokens()?.accessToken
              );
            });
          if (N && N !== R) {
            (M(H), logEvent("tengu_remote_settings_401_force_refresh_retry", {}));
            let K = await fetchRemoteManagedSettings(e, !0, s, r, y);
            return {
              ...K,
              retriedAfter401: !0,
              forcedRefreshOutcome: K.forcedRefreshOutcome ?? H.forcedRefreshOutcome,
            };
          }
        }
        if (status === 401 && T && isAuthFailureWorthRetrying(O, I)) H.skipRetry = !1;
        if (status === 401 && C && n) setWIFSettingsBearerRejected(!0);
        if (status === 401 && H.forcedRefreshOutcome === void 0 && y?.attempted)
          H.forcedRefreshOutcome = y.lastOutcome;
        return M(H);
      }
      case "timeout":
        return M({
          success: !1,
          error: "Remote settings request timeout",
          errorKind: "timeout",
          errno: fetchErrorCode(error),
        });
      case "network":
        return M({
          success: !1,
          error: "Cannot connect to server",
          errorKind: "network_error",
          errno: fetchErrorCode(error),
        });
      default:
        return M({
          success: !1,
          error: message,
          errorKind:
            status !== void 0 && status >= 500
              ? "http_5xx"
              : status !== void 0 && status >= 400
                ? "http_4xx"
                : "unknown_error",
          ...(status !== void 0 && status >= 300 && { httpStatus: status }),
          ...(kind === "http" && status === void 0 && { noResponse: !0, errno: fetchErrorCode(error) }),
          ...Q,
          ...((isNonRetryableClientError(status) ||
            (A && status !== void 0 && status >= 300 && status < 400)) && { skipRetry: !0 }),
        });
    }
  }
}
//@ chunk-4pc1m5n9.js:21412-21497 layout
var _e = Symbol("keep the stored statement"),
  ae = Symbol("the server sent the body now");
/**
 * 把远程设置写入缓存（storage 后端或 <配置目录>/remote-settings.json）。
 */
//@ chunk-4pc1m5n9.js:21497-22630 fingerprint = saveSettings (0.338)
async function saveSettings(e, n, s, r, y) {
  if (hostSessionSkipsSharedCache()) return;
  let S = jsonStringify(isManagedSettingsCopyKeptVerifiable() ? servedBodyOf(e) : e, null, 2),
    k = helperConsentDigest(e);
  if (isDiskless() && isStorageV5Enabled() && n !== void 0 && !getRemoteSettingsPathOverride()) {
    let write = await n.write(STORAGE_SPACES.state("remote-settings"), S, {
      publishDiscipline: "inPlace",
      mode: 384,
      flush: !0,
    });
    if (!write.ok) {
      logForDebugging(`Remote settings: Failed to save - ${formatStorageError(write.error)}`);
      return;
    }
    if (
      (logForDebugging("Remote settings: Saved via storage backend"),
      remoteSettingsFileWritten("cache", S),
      s !== _e)
    )
      await saveSignedCacheJws(getSettingsPath(), s);
    if ((await stampRemoteSettingsSync(y === ae ? void 0 : y), k !== void 0)) {
      let write = await n.write(STORAGE_SPACES.state(HELPER_CONSENT_STATE_ID), k, {
        publishDiscipline: "inPlace",
        mode: 384,
      });
      if (
        (logForDebugging(
          write.ok
            ? "Remote settings: Saved helper consent via storage backend"
            : `Remote settings: Failed to save helper consent - ${formatStorageError(write.error)}`,
        ),
        write.ok)
      )
        remoteSettingsFileWritten("helperConsent", k);
    }
    return;
  }
  if (isDiskless()) {
    warnDisklessSettingsWrite("remote_settings", "remote-settings.json");
    return;
  }
  try {
    let path = getSettingsPath();
    (await readStoredCertificate(path, S), logForDebugging(`Remote settings: Saved to ${path}`));
  } catch (error) {
    logForDebugging(
      `Remote settings: Failed to save - ${error instanceof Error ? error.message : "unknown error"}`,
    );
    return;
  }
  if (isStorageV5Enabled() && !getRemoteSettingsPathOverride()) remoteSettingsFileWritten("cache", S);
  if (s !== _e) await saveSignedCacheJws(getSettingsPath(), s);
  if ((await stampRemoteSettingsSync(y === ae ? void 0 : y), k === void 0)) return;
  try {
    if (
      (await readStoredCertificate(getHelperConsentPath(), k),
      isStorageV5Enabled() && !getRemoteSettingsPathOverride())
    )
      remoteSettingsFileWritten("helperConsent", k);
  } catch (error) {
    logForDebugging(`Remote settings: Failed to save helper consent - ${errorMessage(error)}`);
  }
}
/**
 * 获取远程托管设置：不符合条件返回 ineligible；CLAUDE_CODE_REMOTE_SETTINGS_PATH 覆盖文件或受限子进程直接用本地快照；否则带缓存 checksum 请求端点（304 沿用缓存），校验签名/组织后写入 remote-settings.json 缓存并作为 policy 的 remote 层。
 */
//@ chunk-4pc1m5n9.js:23311-33728 callgraph-witnessed = fetchAndLoadRemoteManagedSettings (0.072)
async function fetchAndLoadRemoteManagedSettings(e) {
  if (!computeRemoteSettingsEligibility())
    return (D().prefetch.clear(), { settings: null, fetchSucceeded: !0, resolution: "ineligible" });
  let n = null,
    cachedSettings = getRemoteSettingsPathOverride();
  if (cachedSettings || isEvalPolicySnapshotOnly())
    return (
      D().prefetch.clear(),
      logForDebugging(
        cachedSettings
          ? `Remote settings: Using override file ${cachedSettings} (CLAUDE_CODE_REMOTE_SETTINGS_PATH), skipping API fetch`
          : "Remote settings: confined evaluation child \u2014 serving the harness-written policy snapshot, no fetch",
      ),
      { settings: getRemoteManagedSettingsSyncFromCache(), fetchSucceeded: !0, resolution: "local" }
    );
  if (n === null) i_i();
  let r = getRemoteManagedSettingsRawCache(),
    y = isRemoteManagedSettingsVerified(),
    S = xJ.get(),
    k = getStoredCopyTrust(),
    R = getStoredCopyTrustedPrincipal(),
    C = r ? computeChecksum(r) : void 0,
    T = getSyncCacheResetEpoch(),
    O = D();
  if (!O.signedCacheShadowChecked) {
    if (
      ((O.signedCacheShadowChecked = !0),
      (O.storedCopyAtStart =
        hostSessionSkipsSharedCache() || hasManagedSettings() || n !== null
          ? "not_read"
          : { enforced: isManagedSettingsCopyTrustEnforced(), gateAnswer: k, hadCopy: r !== null }),
      r && !hasManagedSettings() && n === null)
    )
      verifyStoredCacheAsync({
        kind: "managed-settings",
        cachePath: getSettingsPath(),
        bodySha: isManagedSettingsCopyKeptVerifiable()
          ? computeChecksum(servedBodyOf(r))
          : computeChecksum(r),
        readStoredAccount: getStoredOauthAccountInfo,
        readOrgPin: describeMdmSettingsState,
        onJudged: (A) => {
          O.storedCopyShadow = A;
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
    ? void 0
    : O.prefetch.take(
        (A) =>
          A.checksum === C &&
          A.epoch === T &&
          A.endpoint === getRemoteManagedSettingsEndpoint() &&
          A.principal === remoteSettingsCredentialKey(),
      );
  try {
    let now_2 = Date.now(),
      P = n === null ? await readSyncAge(now_2) : void 0,
      M = isPolicyGraceEnabled() && n === null ? await settingsAgeMs(r !== null, P, now_2) : void 0,
      w = isPolicyGraceEnabled() ? keepIfFresh(C, M) : C,
      now_3 = Date.now(),
      h = await fetchWithRetry(w, {
        ...e,
        prefetched: E,
        oauthRefreshLatch: e.background ? void 0 : O.oauthRefreshLatch,
        hybridOrganizationUuid: n,
      }),
      F = Date.now() - now_3;
    if (e.cycleFacts) ((e.cycleFacts.hadCache = r !== null), (e.cycleFacts.fetchMs = F));
    let V = now_3 + F;
    if (h.success && h.responseKind !== "not_modified") vui(V);
    let Q = h.authType === "oauth",
      H = h.success ? void 0 : classifyRemoteSettingsFailure(h),
      I = settingsFetchOutcome(
        h.success
          ? { succeeded: !0, responseKind: h.responseKind ?? "body" }
          : {
              succeeded: !1,
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
                            : h.httpStatus !== void 0 ||
                                h.errorKind === "http_401" ||
                                h.errorKind === "http_403"
                              ? "http"
                              : "other",
              httpStatus:
                h.httpStatus ??
                (h.errorKind === "http_401" ? 401 : h.errorKind === "http_403" ? 403 : void 0),
              serverErrorType: h.serverErrorType,
              serverErrorCode: h.serverErrorCode,
              serverAuthDenial: h.serverAuthDenial,
              credentialState: H,
              tokenRefreshOutcome: h.tokenRefreshOutcome,
              forcedRefreshOutcome: h.forcedRefreshOutcome,
              errno: h.errno,
              responseContentType: h.responseContentType,
              requestIdPresent: h.requestIdPresent,
              exchangeFinal: h.errorKind === "profile_credential_error" ? h.skipRetry === !0 : void 0,
            },
      );
    if (e.cycleFacts) e.cycleFacts.outcomeReason = I;
    let path = isManagedSettingsCopyTrustEnforced(),
      Z = hostSessionSkipsSharedCache()
        ? "not_read"
        : cacheTrustAnswer({ enforced: path, gateAnswer: k, hadCopy: r !== null }, O.storedCopyShadow),
      N = h.success ? h.settings : void 0;
    O.liveAnswer = h.success
      ? {
          jws: h.signature,
          bodySha: () => {
            if (N !== null && N !== void 0) return computeChecksum(servedBodyOf(N));
            return r !== null && isManagedSettingsCopyKeptVerifiable()
              ? computeChecksum(servedBodyOf(r))
              : (h.checksum ?? "");
          },
        }
      : void 0;
    let K = !O.storedCopyReported && n === null;
    O.storedCopyReported = !0;
    let ee = path ? R : trustedPrincipal(O.storedCopyShadow);
    if (h.success && h.signature !== void 0 && ee !== void 0 && !O.livePrincipalChecked)
      ((O.livePrincipalChecked = !0),
        logPrincipalChange({
          kind: "managed-settings",
          jws: h.signature,
          trustedPrincipal: ee,
          gate: path ? "enforced" : "shadow",
        }));
    if (
      (logEvent("tengu_remote_settings_fetch", {
        duration_ms: F,
        ms_since_startup: V - now,
        success: h.success,
        error_kind: fromEnumOpt(h.errorKind),
        http_status: h.httpStatus,
        attempts: h.attempts,
        had_cache: r !== null,
        cache_age_ms: r !== null ? P : void 0,
        stored_copy: K ? fromEnum(Z) : void 0,
        stored_copy_gate: K ? fromEnum(path ? "enforced" : "shadow") : void 0,
        is_load: !e.background,
        awaited: e.startupAwaited === !0,
        auth_type: fromEnumOpt(h.authType),
        token_source: fromEnum(getAuthTokenSource().source),
        credential_road: fromEnum(settingsAuthSource()),
        credential_origin: fromEnumOpt(h.credentialOrigin),
        api_key_prefix: h.authType === "api_key" ? fromEnum(getApiKeyPrefixBucket()) : void 0,
        has_custom_base_url: hasCustomBaseUrlForAnalytics(),
        token_refresh_outcome: Q ? fromEnumOpt(h.tokenRefreshOutcome) : void 0,
        forced_refresh_outcome: Q ? fromEnumOpt(h.forcedRefreshOutcome) : void 0,
        retried_after_401: h.retriedAfter401 ?? !1,
        server_error_type: fromEnumOpt(h.serverErrorType),
        server_error_code: fromEnumOpt(h.serverErrorCode),
        server_auth_denial: fromEnumOpt(h.serverAuthDenial),
        injected_token_recovery: fromEnumOpt(
          !h.success && h.credentialOrigin === "injected_token" ? injectedOAuthTokenRecovery() : void 0,
        ),
        credential_state: fromEnumOpt(H),
        error_errno: fromEnumOpt(h.errno),
        outcome_reason: fromEnum(I),
        response_kind: fromEnumOpt(h.success ? (h.responseKind ?? "body") : void 0),
        request_id_present: h.requestIdPresent,
        response_content_type: fromEnumOpt(h.responseContentType),
        prefetched: E !== void 0,
        hedged: h.hedged === !0,
      }),
      h.success && h.responseKind === "none_configured")
    )
      mJr();
    if (wasResetDuringFetch(T)) return { settings: null, fetchSucceeded: !1, resolution: "reset" };
    if (!h.success && h.errorKind === "ruled_empty") {
      if (r) setSessionCache(r);
      if (r !== null && Object.keys(r).length > 0)
        (logFeatureSad("remote_managed_settings_pull", "ruled_empty_kept_previous"),
          logForDebugging(
            "Remote settings: ruled_empty_kept_previous - the previously accepted settings stay in force",
          ));
      else
        (logFeatureBad("remote_managed_settings_pull", "ruled_empty_nothing_kept"),
          logForDebugging(
            "Remote settings: ruled_empty_nothing_kept - no previously accepted settings to keep; nothing applied",
          ));
      return {
        settings: r,
        fetchSucceeded: !1,
        failure: { errorKind: "ruled_empty", message: h.error ?? "ruled empty", rulings: h.rulings ?? [] },
        resolution: "ruled_empty",
      };
    }
    if (!h.success) {
      logFeatureBad("remote_managed_settings_pull", h.errorKind ?? "remote_managed_settings_fetch_failed");
      let q = {
        errorKind: h.errorKind ?? "unknown_error",
        message: h.error ?? "Unknown error",
        ...(h.httpStatus !== void 0 && { httpStatus: h.httpStatus }),
        ...(h.noResponse === !0 && { noResponse: !0 }),
        ...(stampedServerErrorType(h) !== void 0 && {
          serverErrorType: stampedServerErrorType(h),
          ...(h.serverErrorCode !== void 0 && { serverErrorCode: h.serverErrorCode }),
          ...(h.serverAuthDenial !== void 0 && { serverAuthDenial: h.serverAuthDenial }),
        }),
        ...((h.errorKind === "http_401" || h.errorKind === "http_403") && {
          credentialState: classifyRemoteSettingsFailure(
            h.serverErrorStamped === !0 || !isPolicyGraceEnabled()
              ? h
              : {
                  ...h,
                  serverErrorType: void 0,
                  serverErrorCode: void 0,
                  serverAuthDenial: h.errorKind === "http_401" ? h.serverAuthDenial : void 0,
                },
          ),
        }),
        ...(h.gatewayPinMismatch && { gatewayPinMismatch: h.gatewayPinMismatch }),
      };
      if (r)
        return (
          logForDebugging(
            `Remote settings: Using stale cache after fetch failure (${formatRemoteSettingsErrorKind(q)})`,
          ),
          setSessionCache(r),
          { settings: r, fetchSucceeded: !1, failure: q, resolution: "failed" }
        );
      return (
        logForDebugging(
          `Remote settings: Fetch failed (${formatRemoteSettingsErrorKind(q)}) and no cached settings`,
        ),
        { settings: null, fetchSucceeded: !1, failure: q, resolution: "failed" }
      );
    }
    if (h.settings === null && r && r === getRemoteManagedSettingsConsentedBaseline()) {
      if (
        (logForDebugging("Remote settings: Cache still valid (304 Not Modified)"),
        setSessionCache(r, { verified: !0 }),
        !hostSessionSkipsSharedCache())
      ) {
        await y_r(getSettingsPath(), h.signature, { keptVerifiable: isManagedSettingsCopyKeptVerifiable() });
        let q = wasResetDuringFetch(T);
        if (await __r(getSettingsPath(), q)) await removeSyncStamp();
        else if (!isPolicyGraceEnabled()) await stampRemoteSettingsSync();
        if (q) return { settings: null, fetchSucceeded: !1, resolution: "reset" };
      }
      if (!y) {
        if ((await reapplyEnvAfterSettings(), wasResetDuringFetch(T)))
          return { settings: null, fetchSucceeded: !1, resolution: "reset" };
        if (r === getRemoteManagedSettingsConsentedBaseline()) {
          if (
            (await recordConsentIfSameIdentity(
              h.consentIdentity,
              sanitizeRemoteSettings(r),
              e.storageV5,
              e.credentials,
            ),
            wasResetDuringFetch(T))
          )
            return { settings: null, fetchSucceeded: !1, resolution: "reset" };
        }
      }
      return (
        logFeatureOk("remote_managed_settings_pull", { status: lit("not_modified") }),
        { settings: r, fetchSucceeded: !0, resolution: "applied" }
      );
    }
    let L = h.settings ?? r ?? {};
    if (Object.keys(L).length > 0) {
      let q = h.consentIdentity ? await readDangerousSettingsHash(h.consentIdentity, e.storageV5) : null,
        Oe = sanitizeRemoteSettings(getRemoteManagedSettingsConsentedBaseline()),
        Ze =
          q !== null
            ? { source: "org_record", dangerousSettingsHash: q, consentedPayload: Oe }
            : { source: "consented_payload", settings: Oe },
        code = sanitizeRemoteSettings(L),
        ne = await checkManagedSettingsSecurity(
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
      if (wasResetDuringFetch(T)) return { settings: null, fetchSucceeded: !1, resolution: "reset" };
      if (!handleSecurityCheckResult(ne)) {
        if (ne === "superseded")
          return (
            logForDebugging(
              "Remote settings: A newer fetch took over the pending consent review; leaving the decision to it",
            ),
            { settings: r, fetchSucceeded: !0, resolution: "consent_superseded" }
          );
        if (ne === "deferred_no_consent_surface") {
          let re = hasDeclaredNoConsentSurface();
          if (re)
            (logForDebugging(
              "Remote settings: Consent prompt deferred to the next interactive session (this command cannot host it); keeping the consented baseline",
            ),
              logFeatureSad("remote_managed_settings_pull", "consent_deferred_no_surface"));
          else
            (logForDebugging(
              "Remote settings: No consent surface in this interactive session; keeping the consented baseline",
            ),
              logFeatureBad("remote_managed_settings_pull", "remote_managed_settings_no_consent_surface"));
          return { settings: r, fetchSucceeded: !1, resolution: re ? "deferred" : "no_consent_surface" };
        }
        return (
          logForDebugging("Remote settings: User rejected new settings, using cached settings"),
          { settings: r, fetchSucceeded: !0, resolution: "rejected" }
        );
      }
      if ((setSessionCache(L, { verified: !0, consentDeferred: ne === "deferred_non_interactive" }), !y)) {
        if ((await reapplyEnvAfterSettings(), wasResetDuringFetch(T)))
          return { settings: null, fetchSucceeded: !1, resolution: "reset" };
      }
      switch (ne) {
        case "approved":
        case "first_party_silent":
        case "no_check_needed":
          if (
            (markRemoteManagedSettingsConsented(L),
            await recordConsentIfSameIdentity(h.consentIdentity, code, e.storageV5, e.credentials),
            wasResetDuringFetch(T))
          )
            return { settings: null, fetchSucceeded: !1, resolution: "reset" };
          let re = isManagedSettingsCopyKeptVerifiable() && h.settings !== null && h.signature !== void 0,
            Ee = isManagedSettingsCopyKeptVerifiable() && h.settings === null;
          (await saveSettings(
            re || Ee
              ? L
              : (h.salvagedSettings ??
                  (h.settings === null ? sanitizeRemoteSettingsKeepingSubstitutes(L) : L)),
            e.storageV5,
            re || (h.salvagedSettings === void 0 && h.settings !== null)
              ? h.signature
              : Ee
                ? (h.signature ?? _e)
                : void 0,
            n,
            h.settings !== null || !isPolicyGraceEnabled() ? ae : M === void 0 ? 0 : now_2 - M,
          ),
            logForDebugging("Remote settings: Applied new settings successfully"),
            logFeatureOk("remote_managed_settings_pull", { status: lit("updated") }));
          break;
        case "deferred_non_interactive":
          (logForDebugging(
            "Remote settings: Applied for this non-interactive run; consent deferred \u2014 not persisting the disk cache as consented",
          ),
            logFeatureOk("remote_managed_settings_pull", { status: lit("applied_consent_deferred") }));
          break;
        case "rejected":
        case "deferred_no_consent_surface":
        case "superseded":
          break;
      }
      return { settings: L, fetchSucceeded: !0, resolution: "applied" };
    }
    if (h.isAnsweredEmpty === !0 && !wasResetDuringFetch(T)) gJr();
    let ve =
      h.responseKind === "none_configured" &&
      hasManagedSettings() &&
      getRemoteManagedSettingsRawCache() === null &&
      xJ.get() === S;
    if ((setSessionCache(L, { verified: !0 }), !y && !ve)) {
      if ((await reapplyEnvAfterSettings(), wasResetDuringFetch(T)))
        return { settings: null, fetchSucceeded: !1, resolution: "reset" };
    }
    if (
      (markRemoteManagedSettingsConsented(L),
      await recordConsentIfSameIdentity(h.consentIdentity, L, e.storageV5, e.credentials),
      wasResetDuringFetch(T))
    )
      return { settings: null, fetchSucceeded: !1, resolution: "reset" };
    return (
      await saveSettings(h.settings ?? {}, e.storageV5, h.signature, n, ae),
      logForDebugging("Remote settings: Saved empty sentinel (404 response)"),
      logFeatureOk("remote_managed_settings_pull", { status: lit("no_content") }),
      { settings: L, fetchSucceeded: !0, resolution: "none", changesNothing: ve }
    );
  } catch {
    if (wasResetDuringFetch(T)) return { settings: null, fetchSucceeded: !1, resolution: "reset" };
    logFeatureBad("remote_managed_settings_pull", "remote_managed_settings_unexpected");
    let A = { errorKind: "unknown_error", message: "Unexpected error while applying remote settings" };
    if (r)
      return (
        logForDebugging("Remote settings: Using stale cache after error"),
        setSessionCache(r),
        { settings: r, fetchSucceeded: !1, failure: A, resolution: "failed" }
      );
    return { settings: null, fetchSucceeded: !1, failure: A, resolution: "failed" };
  }
}
//@ chunk-4pc1m5n9.js:37968-38041 fingerprint = loadRemoteManagedSettings (1)
function loadRemoteManagedSettings_2() {
  try {
    (markPolicySettingsNotified(), settingsChangeDetector.notifyChange("policySettings"));
  } catch (error) {
    logError(error);
  }
}
/**
 * 远程设置变化后重新应用环境、代理、证书与 mTLS。
 */
//@ chunk-4pc1m5n9.js:38041-38764 sole-consumer
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
      ]),
      k = !1,
      R = null;
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
      (C(), O(), A(), await Promise.all([E(), P()]), T());
    }
    r();
  } catch (error) {
    logError(error);
  }
}

export {
  computeChecksumFromSettings,
  Ge,
  yt,
  getRemoteManagedSettingsEndpoint,
  remoteSettingsCredentialKey,
  fetchRemoteManagedSettings,
  fetchAndLoadRemoteManagedSettings,
  loadRemoteManagedSettings_2,
  isManagedConfigPrefetchEnabled,
};
