/**
 * services/policyLimits/PolicyLimitsClient.ts
 *
 * 2.1.316 新增（门面模块 PolicyLimitsClient）。策略限制客户端。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-pcv9zvvv.js (68)
 * attribution: placement 69
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { statSync } from "fs";
import { writeFile, unlink } from "fs/promises";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { isPolicyGraceEnabled, computeChecksum, fetchPolicyLimits, fetchWithRetry } from "./index.js";
import { keepIfFresh } from "../analytics/growthbookGates.js";
import {
  isDiskCacheForeign,
  getCachePath,
  getSessionBodyReceivedAt,
  getSessionCache,
  latchComplianceTaintsBustingBetas,
  getPolicyLimitsTunnelSocket,
  isPolicyLimitsEligible,
  loadCachedResponse,
  isPolicyCacheMemoryOnly,
  readPolicyCacheStampForAdmission,
  admitCachedResponse,
  settleStampRead,
  isDiskAdoptionSuppressed,
  getDiskAdoptionEpoch,
  getPolicyPrincipal,
  setSessionCacheAsPriorEvidence,
  suppressDiskAdoption,
  liftDiskAdoptionSuppression,
  setSessionCache,
  setLastFetchOutcome,
  detachPolicyLimitsBackend,
  installDiskDerivedVerdict,
  getLastFetchOutcome,
  isAnthropicHosted,
  installFailOpenSessionVerdict,
  dropPolicyTaintHints,
  noteSessionVerdictEnvBearer,
  noteSessionBodyReceived,
  getPolicyLimitsIneligibleReason,
  getCredentialIndependentIneligibleReason,
  storedLoginAccountNeedsRead,
  noteStoredLoginAccountAtWire,
  envBearerVerdictOnWire,
  _resetMachinePinsSignInForTesting,
  UNCLASSIFIED_ORIGIN_MEMO_MS,
} from "./policyState.js";
import {
  getPersistedPolicyCacheConfirmedAt,
  serverBodyOf,
  projectPolicyLimitsBody,
  seedSessionCacheFromPrime,
  parseCachedResponse,
  forgetPersistedPolicyCache,
  takeUpHipaaEvidenceLeftOnDisk,
  recordPersistedPolicyCache,
  isUnrestrictiveBody,
  getHeldHipaaEvidence,
  getPersistedPolicyCacheChecksum,
  getPolicyStoredCopyTrustedPrincipal,
  getLastPolicyCacheStampVerdict,
  getLastPolicyCacheStampMatchedIdentity,
  getPolicyStoredCopyTrust,
  markSessionVerdictUnattributed,
  getResponseFromCache,
  noteTunnelEpochHeard,
  _resetRememberedCoreSkillsForTesting,
} from "./policyEvidence.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import {
  isKnownTaint,
  MAX_COMPLIANCE_TAINTS,
  EMPTY_POLICY_RESPONSE,
  countDroppedComplianceTaints,
  hasComplianceTaint,
} from "./complianceTaints.js";
import {
  policyLimitsUrl,
  fetchPolicyLimitsResponse,
  verifyStoredCacheAsync,
  logPrincipalChange,
  verifyLiveAnswerSignature,
} from "./signedCache.js";
import { getOauthConfig, OAUTH_BETA_HEADER } from "../../constants/oauth.js";
import { env } from "../../utils/env.js";
import {
  getAnthropicApiKeyWithSource,
  shouldUseWIFAuth,
  isClaudeAISubscriber,
  getClaudeAIOAuthTokens,
  getAuthTokenSource,
  effectiveAuthTokenEnv,
  getConfiguredApiKeyHelper,
  getApiKeyPrefixBucket,
  getStoredOauthAccountInfo,
  getClaudeAIOAuthTokenOriginAsync,
  clearOAuthTokenMemos,
  storeRecheckNeeded,
  checkOAuthCredentialsChangedOnDisk,
  injectedOAuthTokenRecovery,
  managedConfigNotAttemptedInput,
  onEnvApiKeyApprovalFlipped,
  getClaudeAIOAuthTokensAsync,
  getClaudeAIOAuthTokenOrigin,
  isHostManagedProviderAuth,
  isHostManagedAnthropicApiBearer,
} from "../../utils/auth.js";
import { getUsableProxyUrl, shouldBypassProxy, parseProxyUrl } from "../../utils/proxy.js";
import { isLoopbackHost } from "../../utils/localhost.js";
import {
  getAPIProvider,
  isActualFirstPartyAnthropicBaseUrl,
  hasCustomBaseUrlForAnalytics,
} from "../../utils/model/providers.js";
import { logForDebugging } from "../../utils/debug.js";
import { classifyAxiosError, getErrnoCode, errorMessage, isENOENT } from "../../utils/errors.js";
import { fromEnum, fromEnumOpt } from "../analytics/safeMetadata.js";
import { ABSENTPARENT, formatStorageError } from "../../utils/storage/storageErrors.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { PrefetchSlot, setPolicyGate, recordManagedConfigResult, recordLoadBarrier } from "./startupGate.js";
import { withTimeout, withDeadline } from "../../utils/sleep.js";
import {
  validSignatureHeader,
  saveSignedCacheJws,
  removeSignatureFiles,
  trustedPrincipal,
  cacheTrustAnswer,
  maybePersistSignature,
  clearSignatureIfStale,
} from "../../utils/settings/policyCertificates.js";
import { logError } from "../../utils/log.js";
import {
  isPersistablePrincipal,
  readPolicyStamp,
  isIoUnusableStamp,
  nextHipaaEvidence,
  mergeHipaaEvidence,
  writeCacheStampFile,
  stampToHipaaEvidence,
  writeCacheStampSafe,
  identityDigestOfDescriptor,
  removeCacheStamp,
  buildTokenStamp,
  tokenDigest,
} from "./cacheStamp.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { readSmallFileChecked } from "../../utils/readSmallFile.js";
import { getFsImplementation } from "../../utils/fsOperations.js";
import { logEvent } from "../analytics/index.js";
import {
  isSettingsGateSettled,
  isSettingsGateAnswered,
  isSteadyMarshmallowOn,
  TENGU_STEADY_MARSHMALLOW,
} from "../../utils/settings/settingsSourceTrust.js";
import { describeMdmSettingsState } from "../../utils/settings/mdm/settings.js";
import { getRootSession } from "../../bootstrap/state.js";
import { stampedServerErrorType, setIdleTask } from "../api/errorUtils.js";
import { isManagedConfigPrefetchOn, onPrefetchChanged } from "./prefetchToggle.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../analytics/featureTelemetry.js";
import {
  classifyAuthOutcome,
  settingsFetchOutcome,
  notAttemptedReason,
} from "../analytics/authOutcomeTelemetry.js";
import { countWhere } from "../../utils/collections.js";
import { settingsAuthSource, startInteractionAwarePoll } from "../remoteManagedSettings/fetchSupport.js";
import { errorReportingPolicyState } from "../errorReportingGate.js";
import { onCredentialChange, subscribeCredentialEpoch } from "../../utils/auth/credentialEpoch.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { skillChangeDetector } from "../../utils/skills/skillChangeDetector.js";
import { clearLockHolderSocket } from "../../utils/auth/lockHolderLiveness.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-pcv9zvvv.js:14399-14497 placement
/**
 * 策略接口请求的默认超时（10 秒），fetchPolicyLimitsForBearer 的 timeoutMs 默认值；第一次尝试的等待时间在此基础上加 2 秒。
 */
var POLICY_REQUEST_TIMEOUT_MS = 1e4;
var POLICY_LIMITS_FIRST_ATTEMPT_WAIT_MS = POLICY_REQUEST_TIMEOUT_MS + 2000;
var FETCH_MAX_RETRIES = 5;
var POLL_INTERVAL_MS = 3600000;
var VERDICTLESS_RETRY_DELAYS_MS = [15000, 15000, 30000, 60000, 180000, 600000];
var RETRY_JITTER_RATIO = 0.2;
var REGIME_REFUSAL_REFETCH_MIN_INTERVAL_MS = 60000;
//@ chunk-pcv9zvvv.js:14497-14551 placement
function isShimmyingStardustGateOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_shimmying_stardust", false);
}
//@ chunk-pcv9zvvv.js:14551-14565 placement
var PREFETCHED_POLICY_LIMITS_MAX_AGE_MS = 60000;
//@ chunk-pcv9zvvv.js:14565-14608 placement
function normalizeRecoverySource(source) {
  return source === "load" ? "other" : source;
}
//@ chunk-pcv9zvvv.js:14608-14708 placement
function isAcceleratedTrigger(trigger) {
  return (
    trigger === "accelerated_retry" || trigger === "api_success_trigger" || trigger === "api_refusal_trigger"
  );
}
//@ chunk-pcv9zvvv.js:14708-14743 placement
/**
 * 等待策略加载完成 promise 的最长时间（30 秒），超时后直接放行并记调试日志。
 */
var LOADING_PROMISE_TIMEOUT_MS = 30000;
var POLICY_LIMITS_COLD_AWAIT_MS = 5000;
var FAIL_CLOSED_SHADOW_CACHE_TTL_MS = 86400000;
//@ chunk-pcv9zvvv.js:14743-14830 placement
function revalidationChecksumForPolicy(etag, ageMs) {
  let normalizedEtag = etag || undefined;
  if (!isPolicyGraceEnabled()) return normalizedEtag;
  return keepIfFresh(normalizedEtag, ageMs ?? (isDiskCacheForeign() ? sessionBodyAgeMs() : cacheAgeMs()));
}
//@ chunk-pcv9zvvv.js:14830-15010 placement
function cacheAgeMs() {
  if (isDiskCacheForeign()) return;
  let persistedPolicyCacheConfirmedAt = getPersistedPolicyCacheConfirmedAt();
  if (persistedPolicyCacheConfirmedAt !== null) {
    let age = Date.now() - persistedPolicyCacheConfirmedAt;
    return age >= 0 ? age : undefined;
  }
  try {
    let age = Date.now() - Math.trunc(statSync(getCachePath()).mtimeMs);
    return age >= 0 ? age : undefined;
  } catch {
    return;
  }
}
//@ chunk-pcv9zvvv.js:15010-15095 placement
function sessionBodyAgeMs() {
  let sessionBodyReceivedAt = getSessionBodyReceivedAt();
  if (sessionBodyReceivedAt === null) return;
  let age = Date.now() - sessionBodyReceivedAt;
  return age >= 0 ? age : undefined;
}
//@ chunk-pcv9zvvv.js:15095-15113 placement
var now; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-pcv9zvvv.js:15095", () => {
  now = Date.now();
});
//@ chunk-pcv9zvvv.js:15113-15353 placement
function mergeUnknownTaints(body) {
  let sessionCache = getSessionCache();
  if (!sessionCache) return body;
  latchComplianceTaintsBustingBetas(body.compliance_taints);
  let sliced = normalizeCaseForComparison_2([
    ...sessionCache.compliance_taints,
    ...body.compliance_taints.filter((complianceTaint) => !isKnownTaint(complianceTaint)),
  ]).slice(0, MAX_COMPLIANCE_TAINTS);
  if (sliced.length === sessionCache.compliance_taints.length) return sessionCache;
  return {
    ...sessionCache,
    compliance_taints: sliced,
  };
}
//@ chunk-pcv9zvvv.js:15353-15421 placement
function policyLimitsBaseUrl() {
  return policyLimitsUrl(getPolicyLimitsTunnelSocket() ? "http://localhost" : getOauthConfig().BASE_API_URL);
}
//@ chunk-pcv9zvvv.js:15421-15447 placement
/**
 * 返回策略接口的基址（隧道时为 http://localhost，否则为 OAuth 配置的 BASE_API_URL），policyEndpointHost 由它取 host。
 */
function policyLimitsEndpointUrl() {
  return policyLimitsBaseUrl();
}
//@ chunk-pcv9zvvv.js:15447-15573 placement
function policyEndpointHost() {
  if (getPolicyLimitsTunnelSocket()) return "local machine (via claude ssh tunnel)";
  try {
    return new URL(policyLimitsEndpointUrl()).host;
  } catch {
    return "unknown host";
  }
}
//@ chunk-pcv9zvvv.js:15573-15606 placement
function checksumOfServerResponse(response) {
  return computeChecksum(serverBodyOf(response));
}
//@ chunk-pcv9zvvv.js:15606-15647 placement
function shouldAwaitPolicyLimitsOnStartup() {
  return isPolicyLimitsEligible() && loadCachedResponse() === null;
}
//@ chunk-pcv9zvvv.js:15647-16105 placement
/**
 * 策略请求使用的鉴权类型（api_key/oauth/wif）。
 */
function policyAuthKind() {
  if (getPolicyLimitsTunnelSocket())
    return {
      authType: env.CLAUDE_CODE_OAUTH_TOKEN ? "oauth" : "api_key",
      apiKeyFromHelper: false,
    };
  let apiKey = null;
  let keySource = "none";
  try {
    let anthropicApiKeyWithSource = getAnthropicApiKeyWithSource({
      skipRetrievingKeyFromApiKeyHelper: true,
    });
    apiKey = anthropicApiKeyWithSource.key;
    keySource = anthropicApiKeyWithSource.source;
  } catch {}
  let fromHelper = keySource === "apiKeyHelper";
  let hasKey = Boolean(apiKey) || fromHelper;
  if (!hasKey && shouldUseWIFAuth())
    return {
      authType: "wif",
      apiKeyFromHelper: false,
    };
  if (isClaudeAISubscriber() && getClaudeAIOAuthTokens()?.accessToken)
    return {
      authType: "oauth",
      apiKeyFromHelper: false,
    };
  return hasKey
    ? {
        authType: "api_key",
        apiKeyFromHelper: fromHelper,
      }
    : {
        authType: "oauth",
        apiKeyFromHelper: false,
      };
}
//@ chunk-pcv9zvvv.js:16105-16350 placement
function credentialOriginLabel(credential, wireInfo) {
  if (getPolicyLimitsTunnelSocket()) return "proxy";
  switch (credential.authType) {
    case "api_key":
      return credential.apiKeyFromHelper ? "helper_key" : "static_key";
    case "oauth":
      return wireInfo.sentStoredLogin === undefined
        ? undefined
        : wireInfo.sentStoredLogin
          ? "stored_login"
          : "injected_token";
    case "wif":
      return;
  }
}
//@ chunk-pcv9zvvv.js:16350-16457 placement
function authTokenSourceLabel() {
  if (getPolicyLimitsTunnelSocket()) return env.CLAUDE_CODE_OAUTH_TOKEN ? "CLAUDE_CODE_OAUTH_TOKEN" : "none";
  return getAuthTokenSource().source;
}
//@ chunk-pcv9zvvv.js:16457-16763 placement
/**
 * 是否使用代理及是否回环。
 */
function proxyTelemetry() {
  if (getPolicyLimitsTunnelSocket())
    return {
      proxy_in_use: false,
      proxy_is_loopback: false,
    };
  let proxyUrl;
  let bypass = false;
  try {
    proxyUrl = getUsableProxyUrl();
    bypass = proxyUrl !== undefined && shouldBypassProxy(policyLimitsEndpointUrl());
  } catch {
    return {
      proxy_in_use: false,
      proxy_is_loopback: false,
    };
  }
  if (proxyUrl === undefined || bypass)
    return {
      proxy_in_use: false,
      proxy_is_loopback: false,
    };
  let proxyUrl_2 = parseProxyUrl(proxyUrl);
  return {
    proxy_in_use: true,
    proxy_is_loopback: proxyUrl_2 !== undefined && isLoopbackHost(proxyUrl_2.hostname),
  };
}
//@ chunk-pcv9zvvv.js:21876-22474 placement
async function fetchPolicyLimitsForBearer(bearer, { timeoutMs = POLICY_REQUEST_TIMEOUT_MS } = {}) {
  if (getAPIProvider() !== "firstParty" || !isActualFirstPartyAnthropicBaseUrl()) return null;
  try {
    let policyLimitsResponse = await fetchPolicyLimitsResponse({
      endpoint: policyLimitsBaseUrl(),
      authHeaders: {
        Authorization: `Bearer ${bearer}`,
        "anthropic-beta": OAUTH_BETA_HEADER,
      },
      timeoutMs,
      acceptAny2xx: true,
    });
    if (policyLimitsResponse.kind === "not_modified") {
      logForDebugging("Policy limits (bearer read): 304 to an unconditional request");
      return null;
    }
    let projected = projectPolicyLimitsBody(policyLimitsResponse.data);
    if (!projected.success) {
      logForDebugging(
        `Policy limits (bearer read): invalid response format \u2014 ${projected.error.message}`,
      );
      return null;
    }
    return projected.data;
  } catch (error) {
    let { kind, status, message } = classifyAxiosError(error);
    logForDebugging(
      `Policy limits (bearer read): fetch failed (${kind}${status ? ` ${status}` : ""}) \u2014 ${message}`,
    );
    return null;
  }
}
//@ chunk-pcv9zvvv.js:22474-22593 placement
function responseShapeField(field) {
  if (field === undefined) return "root";
  return field === "restrictions" || field === "compliance_taints" || field === "defaults" ? field : "other";
}
//@ chunk-pcv9zvvv.js:22593-22806 placement
function connectionTelemetry() {
  return {
    has_custom_base_url: hasCustomBaseUrlForAnalytics(),
    via_unix_socket: getPolicyLimitsTunnelSocket() !== undefined,
    has_unix_socket: env.ANTHROPIC_UNIX_SOCKET !== undefined,
    has_auth_token: Boolean(effectiveAuthTokenEnv()),
    has_api_key_helper: Boolean(getConfiguredApiKeyHelper()),
    api_key_prefix: fromEnum(getApiKeyPrefixBucket()),
  };
}
//@ chunk-pcv9zvvv.js:22806-22912 placement
var CACHE_IO_ERRORS = [
  "EACCES",
  "EPERM",
  "EROFS",
  "ENOSPC",
  "EDQUOT",
  "ENOENT",
  "ENOTDIR",
  "EISDIR",
  "EMFILE",
  "ENFILE",
  "EBUSY",
];
//@ chunk-pcv9zvvv.js:22912-22971 placement
function cacheIoErrorCodeOrOther(errnoCode) {
  return errnoCode !== undefined && CACHE_IO_ERRORS.includes(errnoCode) ? errnoCode : "other";
}
//@ chunk-pcv9zvvv.js:22971-23002 placement
function cacheIoErrorCodeOf(error) {
  return cacheIoErrorCodeOrOther(getErrnoCode(error));
}
//@ chunk-pcv9zvvv.js:23002-23120 placement
function storageErrorIoCode(error) {
  let telemetryCode = "telemetryCode" in error ? error.telemetryCode : undefined;
  return cacheIoErrorCodeOrOther(
    telemetryCode === "UnexpectedAbsent" || telemetryCode === ABSENTPARENT ? "ENOENT" : telemetryCode,
  );
}
//@ chunk-pcv9zvvv.js:23120-23167 placement
function policyLimitsStorageSpace() {
  return STORAGE_SPACES.state("policy-limits");
}
//@ chunk-pcv9zvvv.js:23167-23182 placement
var MAX_POLICY_CACHE_BYTES = 1048576;
//@ chunk-pcv9zvvv.js:23182-23697 placement
async function primePolicyLimitsCache(storageV5) {
  if (
    !isStorageV5Enabled() ||
    storageV5 === undefined ||
    !isPolicyLimitsEligible() ||
    isPolicyCacheMemoryOnly()
  )
    return;
  try {
    let policyCacheStampForAdmission = readPolicyCacheStampForAdmission();
    let read = await storageV5.read([
      {
        key: policyLimitsStorageSpace(),
        offset: 0,
        length: MAX_POLICY_CACHE_BYTES + 1,
      },
    ]);
    if (!read.ok) {
      logForDebugging(`Policy limits: prime read failed: ${read.error.code}; raw cache read stays`);
      return;
    }
    let item = read.value.items[0];
    if (!item.found) {
      seedSessionCacheFromPrime(storageV5, null);
      return;
    }
    if (item.totalBytes > MAX_POLICY_CACHE_BYTES) {
      logForDebugging("Policy limits: prime skipped (oversize cache); raw cache read stays");
      return;
    }
    let body = parseCachedResponse(Buffer.from(item.value).toString("utf-8"));
    seedSessionCacheFromPrime(
      storageV5,
      body === null ? null : admitCachedResponse(body, settleStampRead(policyCacheStampForAdmission)),
    );
  } catch (error) {
    logForDebugging(`Policy limits: prime failed: ${errorMessage(error)}`);
  }
}
//@ chunk-pcv9zvvv.js:23697-63097 placement
/**
 * PolicyLimitsClient：组织策略限制（policy limits）客户端。持有存储与凭证，负责冷启动等待、预取结果接纳、OAuth 刷新闩锁、定时轮询与主体变化时重载，产出 fail-open/fail-closed 判定供启动门控和工具使用。
 */
class PolicyLimitsClient {
  storageV5;
  credentials;
  used = false;
  constructor(options = {}) {
    this.storageV5 = options.storageV5;
    this.credentials = options.credentials;
  }
  adoptStartupServices(services) {
    if (services.storageV5 === undefined && services.credentials === undefined) return "nothing to adopt";
    if (this.storageV5 !== undefined || this.credentials !== undefined) return "already composed";
    if (this.used) return "already used";
    this.storageV5 = services.storageV5;
    this.credentials = services.credentials;
    return "adopted";
  }
  oauthRefreshLatch = {
    attempted: false,
    recoveries: {
      begun: 0,
      running: 0,
    },
  };
  prefetchSlot = new PrefetchSlot();
  renewOAuthRefreshLatch() {
    this.oauthRefreshLatch = {
      attempted: false,
      lastOutcome: this.oauthRefreshLatch.lastOutcome,
      recoveries: {
        begun: 0,
        running: 0,
      },
    };
  }
  prefetch() {
    if (!isPolicyLimitsEligible()) return;
    let principalKey = currentPolicyCacheKey();
    if (principalKey === null) return;
    let cached = isDiskAdoptionSuppressed() ? null : loadCachedResponse();
    let usable = cached === EMPTY_POLICY_RESPONSE ? null : cached;
    let checksum = usable ? checksumOfServerResponse(usable) : undefined;
    let { credentials, storageV5, oauthRefreshLatch } = this;
    this.prefetchSlot.set(
      {
        checksum,
        generation: this.sessionGeneration,
        diskEpoch: getDiskAdoptionEpoch(),
        endpointHost: policyEndpointHost(),
        storageV5,
        credentials,
        principalKey,
      },
      (signal) =>
        fetchPolicyLimits(
          checksum,
          isPolicyGraceEnabled() ? cacheAgeMs() : undefined,
          credentials,
          storageV5,
          oauthRefreshLatch,
          signal,
        ),
      (result) => result.success || result.httpStatus === 404,
    );
  }
  poller = null;
  cleanupRegistered = false;
  loadingCompletePromise = null;
  loadingCompleteResolve = null;
  loadingTimeoutId = null;
  abortController = new AbortController();
  firstPromptStateLogged = false;
  cacheWriteFailureLogged = false;
  sessionGeneration = 0;
  serverConfirmedGeneration = -1;
  verdictPrincipalIdentity = null;
  verdictKey = null;
  verdictPrincipalKind = null;
  askedKey = null;
  cyclesInFlight = 0;
  unsettledCycles = new Set();
  principalCheckOwed = false;
  unclassifiedRecheckTimer = null;
  stopCredentialWatch = null;
  stopTunnelEpochWatch = null;
  stopRegimeRefusalWatch = null;
  stopKeyApprovalWatch = null;
  regimeRefusalRefetch = null;
  regimeRefusalRefetchStartedAtMs = undefined;
  tunnelEpochSeen = undefined;
  tunnelVerdictEpoch = undefined;
  tunnelRepolledForEpoch = undefined;
  principalCheckQueued = false;
  signedCacheShadowChecked = false;
  storedCopyShadow = undefined;
  storedCopyReported = false;
  storedCopyAtStart = undefined;
  liveAnswer = undefined;
  livePrincipalChecked = false;
  cacheClearEpoch = 0;
  verdictlessRetry = null;
  verdictlessRetryStep = 0;
  stopNetworkWatch = null;
  verdictlessEpisode = null;
  startupLoadState = "not_started";
  startupLoadClaimed = false;
  startupLoadGeneration = 0;
  prefetchAdmittedGeneration = -1;
  startupLoadErrorCode;
  startupLoadCredentialState;
  startupLoadOutcomeReason;
  startupLoadHttpStatus;
  startupLoadServerErrorType;
  startupLoadServerErrorCode;
  startupLoadServerAuthDenial;
  startupLoadLastAttempt;
  latestLoad;
  startupAwaitResult = "not_awaited";
  gateSnapshotThisRun;
  coldStartFirstWaitAtMs = undefined;
  coldStartWaitedMs = 0;
  recordStartupAwaitResult(startupAwaitResult) {
    this.startupAwaitResult = startupAwaitResult;
  }
  get coldStartTimedOut() {
    return this.startupAwaitResult === "timed_out";
  }
  async awaitColdStartVerdict() {
    let startTime = performance.now();
    this.coldStartFirstWaitAtMs ??= startTime;
    let max = Math.max(0, Math.round(this.coldStartFirstWaitAtMs + POLICY_LIMITS_COLD_AWAIT_MS - startTime));
    let outcome;
    try {
      await withTimeout(this.waitForLoad(), max, "policy_limits_cold_await");
      outcome = "completed";
    } catch {
      outcome = "timed_out";
    }
    this.coldStartWaitedMs += performance.now() - startTime;
    if (this.startupAwaitResult !== "timed_out") this.recordStartupAwaitResult(outcome);
    return outcome;
  }
  get coldStartVerdictWait() {
    return this.coldStartFirstWaitAtMs === undefined
      ? null
      : {
          waitedMs: this.coldStartWaitedMs,
          firstAtMs: this.coldStartFirstWaitAtMs,
        };
  }
  async admitPrefetched(prefetch) {
    let refuse = (reason) => {
      logForDebugging(`Policy limits: host prefetch not admitted (${reason})`);
      return {
        admitted: false,
        refused: reason,
      };
    };
    try {
      if (!isPolicyLimitsEligible()) return refuse("ineligible");
      if (
        this.startupLoadClaimed ||
        this.cyclesInFlight > 0 ||
        this.serverConfirmedGeneration === this.sessionGeneration
      )
        return refuse("already_loading");
      if (this.prefetchAdmittedGeneration === this.sessionGeneration) return refuse("already_admitted");
      let policyPrincipal = getPolicyPrincipal();
      if (
        policyPrincipal === null ||
        policyPrincipal.kind !== "org" ||
        policyPrincipal.unclassified === true ||
        policyPrincipal.descriptor !== `org:${prefetch.orgUuid.toLowerCase()}` ||
        policyPrincipal.bearerDigest === undefined ||
        policyPrincipal.bearerDigest !== prefetch.bearerDigest
      )
        return refuse("principal_mismatch");
      let host = policyEndpointHost();
      if (prefetch.endpointHost !== host) return refuse("endpoint_mismatch");
      let ageMs = Date.now() - prefetch.fetchedAtMs;
      if (
        !Number.isFinite(prefetch.fetchedAtMs) ||
        ageMs < -PREFETCHED_POLICY_LIMITS_MAX_AGE_MS ||
        ageMs > PREFETCHED_POLICY_LIMITS_MAX_AGE_MS
      )
        return refuse("stale");
      let projected = projectPolicyLimitsBody(prefetch.data);
      if (!projected.success) return refuse("unparseable");
      if (countDroppedComplianceTaints(prefetch.data) > 0) return refuse("lossy_taints");
      let policy = projected.data;
      let sessionGeneration = this.sessionGeneration;
      let hadCache = getSessionCache() !== null;
      this.used = true;
      this.prefetchAdmittedGeneration = sessionGeneration;
      setPolicyGate(() => this.managedConfigPolicyGateFields());
      setSessionCacheAsPriorEvidence(policy);
      this.recordVerdictPrincipal(policyPrincipal);
      let diskAdoptionEpoch = getDiskAdoptionEpoch();
      let saveResult = await this.saveCachedResponse(
        policy,
        sessionGeneration,
        validSignatureHeader(prefetch.signature),
        policyPrincipal,
        "prior_evidence",
      );
      if (this.sessionGeneration !== sessionGeneration) {
        recordManagedConfigResult("policy", {
          source: "superseded",
          hadCache,
          awaited: false,
        });
        if (saveResult !== "stale" && saveResult !== "skipped") {
          await this.deleteCacheFile();
          suppressDiskAdoption();
        }
        this.dropUnconfirmedSessionCache();
        return refuse("superseded");
      }
      recordManagedConfigResult("policy", {
        source: "cache",
        hadCache,
        awaited: false,
      });
      if (saveResult === "saved" && getDiskAdoptionEpoch() === diskAdoptionEpoch)
        liftDiskAdoptionSuppression();
      logForDebugging(
        `Policy limits: admitted the host's prefetch as this session's prior-evidence verdict (${Object.keys(policy.restrictions).length} restriction(s), ${policy.compliance_taints?.length ?? 0} taint(s), persisted=${saveResult})`,
      );
      return {
        admitted: true,
      };
    } catch (error) {
      logError(error);
      return refuse("error");
    }
  }
  ensureLoadRequested(reason) {
    let needsStart =
      this.startupLoadClaimed &&
      this.startupLoadState === "not_started" &&
      !this.loadingCompletePromise &&
      isPolicyLimitsEligible();
    if (this.startupLoadClaimed && !needsStart) return false;
    this.initializeLoadingPromise();
    this.load(reason).catch((error) => logError(error));
    return true;
  }
  stop() {
    this.sessionGeneration++;
    this.latestLoad = undefined;
    this.gateSnapshotThisRun = undefined;
    this.prefetchSlot.clear();
    this.verdictPrincipalIdentity = null;
    this.verdictPrincipalKind = null;
    this.verdictKey = null;
    this.askedKey = null;
    this.cyclesInFlight = 0;
    this.principalCheckOwed = false;
    if (this.unclassifiedRecheckTimer !== null) {
      clearTimeout(this.unclassifiedRecheckTimer);
      this.unclassifiedRecheckTimer = null;
    }
    this.stopCredentialWatch?.();
    this.stopCredentialWatch = null;
    this.stopTunnelEpochWatch?.();
    this.stopTunnelEpochWatch = null;
    this.stopRegimeRefusalWatch?.();
    this.stopRegimeRefusalWatch = null;
    this.stopKeyApprovalWatch?.();
    this.stopKeyApprovalWatch = null;
    this.regimeRefusalRefetchStartedAtMs = undefined;
    this.renewOAuthRefreshLatch();
    suppressDiskAdoption();
    forgetPersistedPolicyCache();
    this.stopBackgroundPolling();
    this.abortController.abort();
    this.abortController = new AbortController();
    setSessionCache(null);
    setLastFetchOutcome(null);
    detachPolicyLimitsBackend();
    this.releaseLoadingPromise();
  }
  releaseLoadingPromise() {
    this.loadingCompleteResolve?.();
    this.loadingCompletePromise = null;
    this.loadingCompleteResolve = null;
    if (this.loadingTimeoutId !== null) {
      clearTimeout(this.loadingTimeoutId);
      this.loadingTimeoutId = null;
    }
  }
  initializeLoadingPromise() {
    if (this.loadingCompletePromise) return;
    if (isPolicyLimitsEligible())
      this.loadingCompletePromise = new Promise((resolve) => {
        this.loadingCompleteResolve = resolve;
        this.loadingTimeoutId = setTimeout(
          (resolve) => {
            if (this.loadingCompleteResolve === resolve) {
              logForDebugging("Policy limits: Loading promise timed out, resolving anyway");
              this.loadingCompleteResolve();
              this.loadingCompleteResolve = null;
            }
          },
          LOADING_PROMISE_TIMEOUT_MS,
          resolve,
        );
      });
  }
  async waitForLoad() {
    if (this.loadingCompletePromise) await this.loadingCompletePromise;
  }
  async saveCachedResponse(policy, sessionGeneration, signature, principal, authority) {
    if (this.sessionGeneration !== sessionGeneration) {
      logForDebugging("Policy limits: skipped saving a fetch that outlived the account session");
      return "stale";
    }
    if (isPolicyCacheMemoryOnly()) return "skipped";
    if (!isPersistablePrincipal(principal)) {
      logForDebugging(
        "Policy limits: no server-attributable principal for this credential; the verdict is used for the session and not persisted",
      );
      return "skipped";
    }
    let evidence;
    try {
      evidence = await this.writeStampForSave(policy, principal, authority);
    } catch (error) {
      this.recordCacheWriteFailure(
        error instanceof Error ? error.message : "unknown error",
        cacheIoErrorCodeOf(error),
      );
      return "failed";
    }
    if (evidence === null) return "failed";
    let bodyChecksum = checksumOfServerResponse(policy);
    if (isStorageV5Enabled() && this.storageV5 !== undefined) {
      let failureMessage;
      let failureCode;
      try {
        let writeResult = await this.storageV5.write(
          policyLimitsStorageSpace(),
          jsonStringify(serverBodyOf(policy), null, 2),
          {
            publishDiscipline: "inPlace",
            mode: 384,
          },
        );
        if (writeResult.ok) {
          logForDebugging(`Policy limits: Saved to ${getCachePath()}`);
          await saveSignedCacheJws(getCachePath(), signature);
          return await this.sealSavedBody(evidence, bodyChecksum);
        }
        failureMessage = formatStorageError(writeResult.error);
        failureCode = storageErrorIoCode(writeResult.error);
      } catch (error) {
        failureMessage = errorMessage(error);
        failureCode = cacheIoErrorCodeOf(error);
      }
      forgetPersistedPolicyCache();
      this.recordCacheWriteFailure(failureMessage, failureCode);
      return "failed";
    }
    try {
      let cachePath = getCachePath();
      await writeFile(cachePath, jsonStringify(serverBodyOf(policy), null, 2), {
        encoding: "utf-8",
        mode: 384,
      });
      logForDebugging(`Policy limits: Saved to ${cachePath}`);
      await saveSignedCacheJws(cachePath, signature);
    } catch (error) {
      forgetPersistedPolicyCache();
      this.recordCacheWriteFailure(
        error instanceof Error ? error.message : "unknown error",
        cacheIoErrorCodeOf(error),
      );
      return "failed";
    }
    return this.sealSavedBody(evidence, bodyChecksum);
  }
  async sealSavedBody(evidence, diskBodyChecksum) {
    try {
      await evidence.rewrite();
    } catch (error) {
      let policyStamp = await readPolicyStamp(getCachePath());
      takeUpHipaaEvidenceLeftOnDisk(policyStamp);
      if (
        policyStamp.kind !== "ok" ||
        policyStamp.stamp.identity !== evidence.identity ||
        policyStamp.stamp.sha !== diskBodyChecksum
      ) {
        if (policyStamp.kind !== "ok") {
          let diskBody = await this.readDiskBody();
          if (
            (diskBody.kind === "unreadable" ||
              (diskBody.kind === "body" && diskBody.checksum === diskBodyChecksum)) &&
            !(await this.removeBodyLeavingStamp())
          ) {
            let policyStamp = await readPolicyStamp(getCachePath());
            takeUpHipaaEvidenceLeftOnDisk(policyStamp);
            if (policyStamp.kind !== "ok") await evidence.vouch();
          }
        }
        this.recordCacheWriteFailure(
          error instanceof Error ? error.message : "unknown error",
          cacheIoErrorCodeOf(error),
        );
        return "failed";
      }
    }
    recordPersistedPolicyCache(diskBodyChecksum, evidence.evidence, evidence.confirmedAt);
    return "saved";
  }
  async readDiskBody() {
    let notRegular = false;
    let raw;
    try {
      raw = await readSmallFileChecked(
        getFsImplementation(),
        getCachePath(),
        MAX_POLICY_CACHE_BYTES,
        (stats) => {
          notRegular = stats.isFile();
        },
      );
    } catch (error) {
      return {
        kind: isENOENT(error) ? "none" : "unreadable",
      };
    }
    if (notRegular)
      return {
        kind: "unreadable",
      };
    let parsed = raw === null ? null : parseCachedResponse(raw);
    return parsed === null
      ? {
          kind: "none",
        }
      : {
          kind: "body",
          checksum: checksumOfServerResponse(parsed),
        };
  }
  async removeBodyLeavingStamp() {
    forgetPersistedPolicyCache();
    await removeSignatureFiles(getCachePath());
    if (isStorageV5Enabled() && this.storageV5 !== undefined)
      try {
        await this.storageV5.delete(policyLimitsStorageSpace());
      } catch {}
    try {
      await unlink(getCachePath());
      return true;
    } catch (error) {
      return isENOENT(error);
    }
  }
  async removeUnstampedBody() {
    if (isPolicyCacheMemoryOnly()) return;
    let policyStamp = await readPolicyStamp(getCachePath());
    takeUpHipaaEvidenceLeftOnDisk(policyStamp);
    if (policyStamp.kind === "absent") await this.removeBodyLeavingStamp();
  }
  async removeSupersededLegacyBody(body, checksum) {
    if (!isUnrestrictiveBody(body)) return;
    let policyStamp = await readPolicyStamp(getCachePath());
    takeUpHipaaEvidenceLeftOnDisk(policyStamp);
    if (policyStamp.kind !== "absent") return;
    let diskBody = await this.readDiskBody();
    if (diskBody.kind !== "body" || diskBody.checksum !== checksum) return;
    logForDebugging(
      "Policy limits: removed an unstamped cache this credential cannot restamp after the server superseded it",
    );
    await this.removeBodyLeavingStamp();
  }
  async writeStampForSave(policy, principal, authority) {
    let cachePath = getCachePath();
    let readResult = await readPolicyStamp(cachePath);
    takeUpHipaaEvidenceLeftOnDisk(readResult);
    if (isIoUnusableStamp(readResult)) {
      logForDebugging(
        `Policy limits: the cache stamp could not be read just now (${readResult.code}); nothing persisted this cycle`,
      );
      return null;
    }
    let evidence = nextHipaaEvidence({
      principal,
      bodySha: checksumOfServerResponse(policy),
      confirmedAt: Date.now(),
      bodyTaints: policy.compliance_taints,
      previous: mergeHipaaEvidence(readResult, getHeldHipaaEvidence()),
      authority,
    });
    await writeCacheStampFile(cachePath, evidence);
    return {
      identity: evidence.identity,
      evidence: stampToHipaaEvidence(evidence),
      confirmedAt: evidence.confirmed_at,
      rewrite: () => writeCacheStampFile(cachePath, evidence),
      vouch: async () => {
        await writeCacheStampSafe(cachePath, evidence);
      },
    };
  }
  async restampConfirmedCache(
    policy,
    diskBodyChecksum,
    principal,
    sessionGeneration,
    authority,
    fallbackConfirmedAt,
  ) {
    if (
      this.sessionGeneration !== sessionGeneration ||
      !isPersistablePrincipal(principal) ||
      diskBodyChecksum === undefined ||
      getPersistedPolicyCacheChecksum() !== diskBodyChecksum
    )
      return;
    let cacheClearEpoch = this.cacheClearEpoch;
    let policyStamp = await readPolicyStamp(getCachePath());
    takeUpHipaaEvidenceLeftOnDisk(policyStamp);
    if (
      policyStamp.kind !== "absent" &&
      !(policyStamp.kind === "ok" && policyStamp.stamp.sha === diskBodyChecksum)
    )
      return;
    let evidence = nextHipaaEvidence({
      principal,
      bodySha: diskBodyChecksum,
      confirmedAt: !isPolicyGraceEnabled()
        ? Date.now()
        : policyStamp.kind === "ok"
          ? policyStamp.stamp.confirmed_at
          : fallbackConfirmedAt,
      bodyTaints: policy.compliance_taints,
      previous: mergeHipaaEvidence(policyStamp, getHeldHipaaEvidence()),
      authority,
    });
    await writeCacheStampSafe(getCachePath(), evidence);
    if (this.cacheClearEpoch !== cacheClearEpoch) {
      await this.deleteCacheFile();
      return;
    }
    if (this.sessionGeneration !== sessionGeneration) return;
    recordPersistedPolicyCache(diskBodyChecksum, stampToHipaaEvidence(evidence), evidence.confirmed_at);
  }
  recordCacheWriteFailure(message, errnoCode) {
    logForDebugging(`Policy limits: Failed to save - ${message}`);
    if (!this.cacheWriteFailureLogged) {
      this.cacheWriteFailureLogged = true;
      logEvent("tengu_policy_limits_cache_write_failed", {
        errno: fromEnum(errnoCode),
      });
    }
  }
  async fetchAndLoad(trigger, fetchTrigger, awaited = false) {
    let sessionGeneration = this.sessionGeneration;
    this.cyclesInFlight++;
    let cycle = this.runFetchCycle(trigger, fetchTrigger, awaited);
    this.unsettledCycles.add(cycle);
    try {
      return await cycle;
    } finally {
      this.unsettledCycles.delete(cycle);
      this.endCycle(sessionGeneration);
    }
  }
  async _settleCyclesForTesting() {
    while (this.unsettledCycles.size > 0) await Promise.allSettled([...this.unsettledCycles]);
  }
  endCycle(sessionGeneration) {
    if (this.sessionGeneration !== sessionGeneration) return;
    this.cyclesInFlight--;
    if (this.cyclesInFlight === 0 && this.principalCheckOwed) {
      this.principalCheckOwed = false;
      this.onCredentialMayHaveChanged();
    }
  }
  async runFetchCycle(label, trigger, awaited) {
    this.used = true;
    let isStartupLoad = label === "policy_limits_load" && !this.startupLoadClaimed;
    if (isStartupLoad) {
      this.startupLoadClaimed = true;
      this.startupLoadGeneration = this.sessionGeneration;
    }
    setPolicyGate(() => this.managedConfigPolicyGateFields());
    if (!isPolicyLimitsEligible()) {
      this.prefetchSlot.clear();
      recordManagedConfigResult("policy", {
        source: "ineligible",
        hadCache: false,
        awaited,
      });
      return null;
    }
    if (isStartupLoad) this.startupLoadState = "in_flight";
    let diskResponse = isDiskAdoptionSuppressed() ? null : loadCachedResponse();
    let diskPolicy = diskResponse === EMPTY_POLICY_RESPONSE ? null : diskResponse;
    let diskTrustedPrincipal = diskResponse === null ? undefined : getPolicyStoredCopyTrustedPrincipal();
    let diskAdoptionEpoch = getDiskAdoptionEpoch();
    let cacheAge = cacheAgeMs();
    let now_2 = Date.now();
    let policyPrincipal = getPolicyPrincipal();
    let principalIdentity = policyPrincipal === null ? "" : identityDigestOfDescriptor(policyPrincipal);
    let mayRetry = !isAcceleratedTrigger(trigger);
    if (diskPolicy && !getSessionCache()) installDiskDerivedVerdict(diskPolicy);
    let sessionCache = getSessionCache();
    if (
      diskPolicy &&
      sessionCache !== null &&
      this.verdictPrincipalIdentity === null &&
      this.serverConfirmedGeneration !== this.sessionGeneration
    )
      if (
        isClassifiedPrincipal(policyPrincipal) &&
        getLastPolicyCacheStampVerdict() === "match" &&
        getLastPolicyCacheStampMatchedIdentity() === identityDigestOfDescriptor(policyPrincipal) &&
        checksumOfServerResponse(sessionCache) === checksumOfServerResponse(diskPolicy)
      )
        this.recordVerdictPrincipal(policyPrincipal);
      else this.ensureCredentialWatch();
    if (diskPolicy)
      recordManagedConfigResult("policy", {
        source: "cache",
        hadCache: true,
        awaited,
      });
    let diskChecksum = diskPolicy ? checksumOfServerResponse(diskPolicy) : undefined;
    let cacheClearEpoch = this.cacheClearEpoch;
    if (!this.signedCacheShadowChecked) {
      this.signedCacheShadowChecked = true;
      this.storedCopyAtStart = isPolicyCacheMemoryOnly()
        ? "not_read"
        : {
            enforced: isSettingsGateSettled(),
            gateAnswer: getPolicyStoredCopyTrust(),
            hadCopy: diskPolicy !== null,
          };
      if (diskChecksum !== undefined && !isPolicyCacheMemoryOnly())
        verifyStoredCacheAsync({
          kind: "policy-limits",
          cachePath: getCachePath(),
          bodySha: diskChecksum,
          readStoredAccount: getStoredOauthAccountInfo,
          readOrgPin: describeMdmSettingsState,
          onJudged: (storedCopyShadow) => {
            this.storedCopyShadow = storedCopyShadow;
          },
        });
    }
    let authKind = policyAuthKind();
    let authType = authKind.authType;
    let now_3 = Date.now();
    let signal = this.abortController.signal;
    let sessionGeneration = this.sessionGeneration;
    let lastFetchOutcome = getLastFetchOutcome();
    let anotherFetchSucceeded = () => {
      let lastFetchOutcome_2 = getLastFetchOutcome();
      return (
        lastFetchOutcome_2 !== null && lastFetchOutcome_2.success && lastFetchOutcome_2 !== lastFetchOutcome
      );
    };
    let outcomeTerminal = false;
    let sawLiveOrStale = false;
    let reportOutcome = (outcome) => {
      outcomeTerminal = true;
      if (!outcome.success && anotherFetchSucceeded()) return;
      this.recordFetchOutcome(sessionGeneration, cacheClearEpoch, outcome, principalIdentity, mayRetry);
    };
    let reportRequestFailed = () =>
      reportOutcome({
        success: false,
        errorCode: "request_failed",
        httpStatus: null,
        host: policyEndpointHost(),
        retrying: false,
      });
    if (label === "policy_limits_load" && this.prefetchSlot.pending) {
      let origin = await getClaudeAIOAuthTokenOriginAsync(this.credentials);
      if (origin !== "store" || env.CLAUDE_CODE_OAUTH_TOKEN) clearOAuthTokenMemos();
      if (storeRecheckNeeded(origin))
        await checkOAuthCredentialsChangedOnDisk(getRootSession().host, this.credentials);
      policyPrincipal = getPolicyPrincipal();
    }
    let requestedKey = policyPrincipal === null ? null : policyCacheKey(policyPrincipal);
    let endpointHost = policyEndpointHost();
    let prefetched =
      label === "policy_limits_load"
        ? this.prefetchSlot.take(
            (slot) =>
              slot.checksum === diskChecksum &&
              slot.generation === sessionGeneration &&
              slot.diskEpoch === diskAdoptionEpoch &&
              slot.endpointHost === endpointHost &&
              slot.storageV5 === this.storageV5 &&
              slot.credentials === this.credentials &&
              slot.principalKey === requestedKey,
          )
        : undefined;
    try {
      let result = await fetchWithRetry(
        diskChecksum,
        cacheAge,
        this.credentials,
        this.storageV5,
        signal,
        (entry) => {
          if (isStartupLoad && this.startupLoadState === "in_flight")
            this.startupLoadLastAttempt = {
              errorCode: entry.errorCode ?? "request_failed",
              httpStatus: entry.httpStatus ?? undefined,
              serverErrorType: stampedServerErrorType(entry),
              serverErrorCode: serverErrorCodeOf(entry),
              serverAuthDenial: serverAuthDenialOf(entry),
            };
          if (getLastFetchOutcome()?.success) return;
          this.recordFetchOutcome(
            sessionGeneration,
            cacheClearEpoch,
            {
              success: false,
              host: endpointHost,
              httpStatus: entry.httpStatus ?? null,
              errorCode: entry.errorCode ?? "request_failed",
              retrying: true,
            },
            principalIdentity,
            mayRetry,
          );
        },
        this.oauthRefreshLatch,
        isAcceleratedTrigger(trigger) ? 0 : FETCH_MAX_RETRIES,
        {
          hedge: awaited && isManagedConfigPrefetchOn(),
          prefetched,
        },
      );
      if (this.sessionGeneration !== sessionGeneration || signal.aborted) {
        if (isStartupLoad && this.startupLoadState === "in_flight") {
          this.startupLoadState = "failed";
          this.startupLoadErrorCode = "session_changed";
          this.startupLoadCredentialState = undefined;
          this.startupLoadOutcomeReason = undefined;
          this.startupLoadHttpStatus = undefined;
          this.startupLoadServerErrorType = undefined;
          this.startupLoadServerErrorCode = undefined;
          this.startupLoadServerAuthDenial = undefined;
          this.startupLoadLastAttempt = undefined;
        }
        recordManagedConfigResult("policy", {
          source: "superseded",
          hadCache: diskPolicy !== null,
          awaited,
        });
        logForDebugging("Policy limits: Discarding a fetch that outlived the account session");
        logFeatureSad(label, "cycle_aborted");
        return getSessionCache();
      }
      let policyPrincipal_2 = getPolicyPrincipal();
      let currentKey = policyPrincipal_2 === null ? null : policyCacheKey(policyPrincipal_2);
      let wireKey = result.principalKeyAtWire === undefined ? currentKey : result.principalKeyAtWire;
      let staleTunnelEpoch =
        result.success && this.isStaleTunnelCredentialEpoch(result.tunnelCredentialEpoch);
      if (staleTunnelEpoch)
        logForDebugging(
          "Policy limits: this answer came back under an older claude ssh credential epoch than one already seen; not installing it",
        );
      let principalMoved = result.principalMovedAtWire === true || wireKey !== currentKey;
      if (!principalMoved && result.askedKeyAtWire !== undefined && result.askedKeyAtWire !== null)
        this.askedKey = result.askedKeyAtWire;
      if (principalMoved) {
        logForDebugging(
          "Policy limits: the credential changed principal during the fetch; this response is used for the session but not persisted or attributed",
        );
        policyPrincipal = null;
      } else if (requestedKey !== currentKey) {
        logForDebugging(
          "Policy limits: the credential changed principal before the request went out; attributing the response to the principal it authenticated as",
        );
        policyPrincipal = policyPrincipal_2;
      }
      if (getDiskAdoptionEpoch() !== diskAdoptionEpoch) {
        logForDebugging(
          "Policy limits: the disk snapshot predates an account-boundary hold; not installable",
        );
        diskPolicy = null;
      }
      let spurious304 = result.success && result.response === null && !diskPolicy;
      let usable = result.success && !spurious304 && !staleTunnelEpoch;
      if (!usable)
        this.observeTunnelCredentialEpoch(
          result.tunnelCredentialEpoch,
          result.success ? "a stale policy answer" : "a refused policy request",
          false,
        );
      let errorCode = staleTunnelEpoch
        ? "stale_tunnel_credential"
        : spurious304
          ? "spurious_304"
          : (result.errorCode ?? "request_failed");
      let failureCode = usable ? undefined : errorCode;
      let credentialOrigin = credentialOriginLabel(authKind, result);
      let injectedRecovery = credentialOrigin === "injected_token" ? injectedOAuthTokenRecovery() : undefined;
      let authFacts = {
        errorCode,
        httpStatus: result.httpStatus,
        serverErrorType: result.serverErrorType,
        serverErrorCode: result.serverErrorCode,
        serverAuthDenial: result.serverAuthDenial,
        tokenRefreshOutcome: result.tokenRefreshOutcome,
        forcedRefreshOutcome: result.forcedRefreshOutcome,
        authUnavailableReason: result.authUnavailableReason,
        authType,
        credentialOrigin,
        injectedTokenRecovery: injectedRecovery,
        noResponse: result.noResponse,
      };
      let credentialState = classifyAuthOutcome(authFacts);
      let credentialStateReported = usable ? undefined : credentialState;
      let credentialStateSettled =
        usable || result.serverErrorStamped === true || !isPolicyGraceEnabled()
          ? credentialStateReported
          : classifyAuthOutcome({
              ...authFacts,
              serverErrorType: undefined,
              serverErrorCode: undefined,
              serverAuthDenial: result.httpStatus === 401 ? result.serverAuthDenial : undefined,
            });
      let outcomeReason = settingsFetchOutcome(
        usable
          ? {
              succeeded: true,
              responseKind: result.response === null ? "not_modified" : "body",
            }
          : {
              succeeded: false,
              failure:
                result.authUnavailableReason !== undefined
                  ? "no_credentials"
                  : errorCode === "timeout"
                    ? "timeout"
                    : errorCode === "network_error" || result.noResponse
                      ? "network"
                      : errorCode === "parse_failed"
                        ? "parse"
                        : result.httpStatus !== undefined
                          ? "http"
                          : "other",
              httpStatus: result.httpStatus,
              serverErrorType: result.serverErrorType,
              serverErrorCode: result.serverErrorCode,
              serverAuthDenial: result.serverAuthDenial,
              credentialState: credentialStateReported,
              tokenRefreshOutcome: result.tokenRefreshOutcome,
              forcedRefreshOutcome: result.forcedRefreshOutcome,
              errno: result.errno,
              responseContentType: result.responseContentType ?? result.parseErrorContentType,
              requestIdPresent: result.requestIdPresent,
            },
      );
      let now_4 = Date.now();
      let lastPolicyCacheStampVerdict = getLastPolicyCacheStampVerdict();
      let settingsGateSettled = isSettingsGateSettled();
      let gateAnswer = getPolicyStoredCopyTrust();
      let storedPrincipal = settingsGateSettled
        ? diskTrustedPrincipal
        : trustedPrincipal(this.storedCopyShadow);
      let storedCopyAnswer = cacheTrustAnswer(
        {
          enforced: settingsGateSettled,
          gateAnswer,
          hadCopy: diskPolicy !== null,
        },
        this.storedCopyShadow,
      );
      let firstStoredeCopyReport = !this.storedCopyReported;
      this.storedCopyReported = true;
      sawLiveOrStale = usable;
      if (isStartupLoad) {
        this.startupLoadState = usable ? "succeeded" : "failed";
        this.startupLoadErrorCode = failureCode;
        this.startupLoadCredentialState = credentialStateSettled;
        this.startupLoadOutcomeReason = outcomeReason;
        this.startupLoadHttpStatus = usable ? undefined : (result.httpStatus ?? undefined);
        this.startupLoadServerErrorType = usable ? undefined : stampedServerErrorType(result);
        this.startupLoadServerErrorCode = usable ? undefined : serverErrorCodeOf(result);
        this.startupLoadServerAuthDenial = usable ? undefined : serverAuthDenialOf(result);
        this.startupLoadLastAttempt = undefined;
      }
      if (label === "policy_limits_load" && this.sessionGeneration === sessionGeneration)
        this.latestLoad = usable
          ? {
              succeeded: true,
            }
          : {
              succeeded: false,
              errorCode: failureCode,
              credentialState: credentialStateSettled,
              httpStatus: result.httpStatus ?? undefined,
              serverErrorType: stampedServerErrorType(result),
              serverErrorCode: serverErrorCodeOf(result),
              serverAuthDenial: serverAuthDenialOf(result),
            };
      let managedConfigResult = {
        source: usable ? "fetch" : "error",
        hadCache: diskPolicy !== null,
        awaited,
        fetchMs: now_4 - now_3,
      };
      if (!usable) recordManagedConfigResult("policy", managedConfigResult);
      let staleSource;
      let verdictlessRetryScheduled = false;
      if (
        !result.success &&
        (!result.skipRetry || result.errorCode === "parse_failed") &&
        trigger !== "api_refusal_trigger" &&
        isShimmyingStardustGateOn()
      ) {
        staleSource = this.staleFallbackSource();
        let mayKick = trigger !== "api_success_trigger";
        if (staleSource === null) {
          verdictlessRetryScheduled = this.armVerdictlessRetry();
          if (mayKick) this.armNetworkKick();
        } else if (!this.hasLiveVerdict() && mayKick) this.armNetworkKick();
      }
      let usedPolicy = usable ? (result.response ?? diskPolicy) : null;
      this.liveAnswer =
        usedPolicy === null
          ? undefined
          : {
              jws: result.signature,
              bodySha: () => checksumOfServerResponse(usedPolicy),
            };
      if (
        usable &&
        result.signature !== undefined &&
        storedPrincipal !== undefined &&
        !this.livePrincipalChecked
      ) {
        this.livePrincipalChecked = true;
        logPrincipalChange({
          kind: "policy-limits",
          jws: result.signature,
          trustedPrincipal: storedPrincipal,
          gate: settingsGateSettled ? "enforced" : "shadow",
        });
      }
      logEvent("tengu_policy_limits_fetch", {
        duration_ms: now_4 - now_3,
        ms_since_startup: now_4 - now,
        success: usable,
        had_cache: diskPolicy !== null,
        cache_stamp: fromEnum(lastPolicyCacheStampVerdict),
        stored_copy: firstStoredeCopyReport ? fromEnum(storedCopyAnswer) : undefined,
        stored_copy_gate: firstStoredeCopyReport
          ? fromEnum(settingsGateSettled ? "enforced" : "shadow")
          : undefined,
        cache_age_ms: cacheAge,
        attempts: result.attempts,
        prefetched: prefetched !== undefined,
        hedged: result.hedged === true,
        restrictions_denied_count: usedPolicy
          ? countWhere(Object.values(usedPolicy.restrictions), (restriction) => !restriction.allowed)
          : undefined,
        compliance_taint_count: usedPolicy ? (usedPolicy.compliance_taints?.length ?? 0) : undefined,
        is_load: label === "policy_limits_load",
        awaited,
        auth_type: fromEnum(authType),
        error_code: fromEnumOpt(failureCode),
        token_source: fromEnum(authTokenSourceLabel()),
        credential_road: fromEnum(settingsAuthSource()),
        ...connectionTelemetry(),
        auth_unavailable_reason: fromEnumOpt(result.authUnavailableReason),
        token_refresh_outcome: authType === "oauth" ? fromEnumOpt(result.tokenRefreshOutcome) : undefined,
        forced_refresh_outcome: authType === "oauth" ? fromEnumOpt(result.forcedRefreshOutcome) : undefined,
        retried_after_401: result.retriedAfter401 ?? false,
        http_status: result.httpStatus,
        parse_error_field: fromEnumOpt(result.parseErrorField),
        parse_error_content_type: fromEnumOpt(result.parseErrorContentType),
        server_error_type: fromEnumOpt(result.serverErrorType),
        server_error_code: fromEnumOpt(result.serverErrorCode),
        server_auth_denial: fromEnumOpt(result.serverAuthDenial),
        injected_token_recovery: fromEnumOpt(usable ? undefined : injectedRecovery),
        credential_state: fromEnumOpt(credentialStateReported),
        outcome_reason: fromEnum(outcomeReason),
        response_kind: usable ? fromEnum(result.response === null ? "not_modified" : "body") : undefined,
        request_id_present: result.requestIdPresent,
        response_content_type: fromEnumOpt(result.responseContentType),
        fetch_trigger: fromEnum(trigger),
        verdictless_retry_scheduled: verdictlessRetryScheduled,
        error_errno: fromEnumOpt(result.errno),
        ...proxyTelemetry(),
      });
      if (!usable) {
        reportOutcome({
          success: false,
          host: endpointHost,
          httpStatus: result.httpStatus ?? null,
          errorCode,
          retrying: false,
          credentialState,
          ...(result.serverErrorCode !== undefined && {
            serverErrorCode: result.serverErrorCode,
          }),
        });
        let fallbackSource = staleSource !== undefined ? staleSource : this.staleFallbackSource();
        if (fallbackSource) {
          logForDebugging(
            spurious304
              ? "Policy limits: 304 with no outstanding ETag \u2014 using stale cache"
              : "Policy limits: Using stale cache after fetch failure",
          );
          let fallbackPolicy = mergeUnknownTaints(fallbackSource);
          installDiskDerivedVerdict(fallbackPolicy);
          this.disposeVerdictlessRetryTimer();
          if (!this.hasLiveVerdict()) this.noteUnverifiedCycle(errorCode, true);
          logFeatureSad(label, spurious304 ? "spurious_304" : "stale_cache_used", {
            credential_state: fromEnum(credentialState),
          });
          return fallbackPolicy;
        }
        if (
          (result.httpStatus === 404 || result.httpStatus === 304) &&
          getSessionCache() === null &&
          !isAnthropicHosted() &&
          !getFeatureValue_CACHED_MAY_BE_STALE("tengu_rustling_orbit", false)
        ) {
          logForDebugging(
            `Policy limits: ${result.httpStatus} with no cache, no restrictions for this session (not persisted)`,
          );
          markSessionVerdictUnattributed();
          installFailOpenSessionVerdict();
          this.serverConfirmedGeneration = sessionGeneration;
          this.disposeVerdictlessRetryTimer();
          this.disarmNetworkKick();
          this.recordVerdictPrincipal(policyPrincipal);
          logFeatureSad(
            label,
            result.httpStatus === 404 ? "route_missing_fail_open" : "unsolicited_304_fail_open",
            {
              credential_state: fromEnum(credentialState),
            },
          );
          return EMPTY_POLICY_RESPONSE;
        }
        this.noteUnverifiedCycle(errorCode, false);
        logFeatureBad(label, errorCode, {
          credential_state: fromEnum(credentialState),
        });
        return null;
      }
      let response = result.response;
      if (response === null || response === undefined) {
        if (!diskPolicy) {
          reportRequestFailed();
          recordManagedConfigResult("policy", {
            ...managedConfigResult,
            source: "error",
          });
          logFeatureBad(label, "unexpected_error");
          return null;
        }
        logForDebugging("Policy limits: Cache still valid (304 Not Modified)");
        let keptPolicy = diskPolicy;
        let complianceTaints = diskPolicy.compliance_taints;
        let sessionTaints =
          this.serverConfirmedGeneration === sessionGeneration
            ? (getSessionCache()?.compliance_taints ?? [])
            : [];
        let lossyCachedTaints = countDroppedComplianceTaints(serverBodyOf(diskPolicy)) > 0;
        if (lossyCachedTaints && sessionTaints.some((taint) => !complianceTaints.includes(taint))) {
          keptPolicy = {
            ...diskPolicy,
            compliance_taints: normalizeCaseForComparison_2([...sessionTaints, ...complianceTaints]).slice(
              0,
              MAX_COMPLIANCE_TAINTS,
            ),
          };
          logForDebugging("Policy limits: lossy cached compliance_taints \u2014 kept the session taint set");
        }
        if (principalMoved) markSessionVerdictUnattributed();
        else dropPolicyTaintHints(result.stampAtWire);
        if (principalMoved || lossyCachedTaints) setSessionCacheAsPriorEvidence(keptPolicy);
        else setSessionCache(keptPolicy);
        noteSessionVerdictEnvBearer(principalMoved ? null : (result.sentEnvBearerDigest ?? null));
        this.settleTunnelCredentialEpoch(result.tunnelCredentialEpoch);
        this.serverConfirmedGeneration = sessionGeneration;
        this.onLiveVerdict(trigger);
        this.recordVerdictPrincipal(policyPrincipal);
        reportOutcome({
          success: true,
          host: endpointHost,
        });
        if (!isPolicyCacheMemoryOnly() && isPersistablePrincipal(policyPrincipal))
          try {
            await maybePersistSignature(getCachePath(), result.signature, {
              keptVerifiable: isSettingsGateAnswered(),
            });
            if (
              !(await clearSignatureIfStale(getCachePath(), this.cacheClearEpoch !== cacheClearEpoch)) &&
              !principalMoved
            )
              await this.restampConfirmedCache(
                keptPolicy,
                diskChecksum,
                policyPrincipal,
                sessionGeneration,
                lossyCachedTaints ? "prior_evidence" : "confirmed",
                cacheAge === undefined ? 0 : Math.floor(now_2 - cacheAge),
              );
          } catch {}
        recordManagedConfigResult("policy", managedConfigResult);
        logFeatureOk(label);
        return keptPolicy;
      }
      let policy = response;
      if (result.lossyComplianceTaints) {
        let knownTaints = [
          ...(getSessionCache()?.compliance_taints ?? []),
          ...(diskPolicy?.compliance_taints ?? []),
        ];
        if (knownTaints.length > 0) {
          policy = {
            ...policy,
            compliance_taints: normalizeCaseForComparison_2([
              ...policy.compliance_taints,
              ...knownTaints,
            ]).slice(0, MAX_COMPLIANCE_TAINTS),
          };
          logForDebugging("Policy limits: lossy compliance_taints \u2014 kept the known taint set");
        }
      }
      if (principalMoved) markSessionVerdictUnattributed();
      else dropPolicyTaintHints(result.stampAtWire);
      if (principalMoved || result.lossyComplianceTaints) setSessionCacheAsPriorEvidence(policy);
      else setSessionCache(policy);
      noteSessionBodyReceived(now_4);
      noteSessionVerdictEnvBearer(principalMoved ? null : (result.sentEnvBearerDigest ?? null));
      this.settleTunnelCredentialEpoch(result.tunnelCredentialEpoch);
      this.serverConfirmedGeneration = sessionGeneration;
      this.onLiveVerdict(trigger);
      this.recordVerdictPrincipal(policyPrincipal);
      reportOutcome({
        success: true,
        host: endpointHost,
      });
      let diskAdoptionEpoch_2 = getDiskAdoptionEpoch();
      let saveResult = principalMoved
        ? "stale"
        : await this.saveCachedResponse(
            policy,
            sessionGeneration,
            policy === response ? result.signature : undefined,
            policyPrincipal,
            result.lossyComplianceTaints ? "prior_evidence" : "confirmed",
          );
      recordManagedConfigResult("policy", managedConfigResult);
      if (
        saveResult === "skipped" &&
        !isPersistablePrincipal(policyPrincipal) &&
        !principalMoved &&
        !isPolicyCacheMemoryOnly() &&
        diskPolicy !== null &&
        diskChecksum !== undefined &&
        getLastPolicyCacheStampVerdict() === "legacy" &&
        diskChecksum !== checksumOfServerResponse(policy)
      )
        await this.removeSupersededLegacyBody(diskPolicy, diskChecksum);
      if (this.sessionGeneration !== sessionGeneration) {
        if (saveResult !== "stale" && saveResult !== "skipped") {
          let removed = await this.deleteCacheFile();
          suppressDiskAdoption();
          if (!removed)
            logForDebugging(
              "Policy limits: could not remove a dead fetch's cache write; disk adoption suppressed until the next save",
            );
        }
        this.dropUnconfirmedSessionCache();
        if (isStartupLoad && this.startupLoadState === "succeeded") {
          this.startupLoadState = "failed";
          this.startupLoadErrorCode = "session_changed";
          this.startupLoadCredentialState = undefined;
          this.startupLoadHttpStatus = undefined;
          this.startupLoadServerErrorType = undefined;
          this.startupLoadServerErrorCode = undefined;
          this.startupLoadServerAuthDenial = undefined;
          this.startupLoadLastAttempt = undefined;
        }
        logFeatureSad(label, "cycle_aborted");
        return getSessionCache();
      }
      if (saveResult === "saved" && getDiskAdoptionEpoch() === diskAdoptionEpoch_2)
        liftDiskAdoptionSuppression();
      logForDebugging(
        Object.keys(policy.restrictions).length > 0
          ? "Policy limits: Applied new restrictions successfully"
          : "Policy limits: No restrictions (cached empty)",
      );
      if (result.lossyComplianceTaints) logFeatureSad(label, "lossy_compliance_taints");
      else logFeatureOk(label);
      return policy;
    } catch {
      let superseded = this.sessionGeneration !== sessionGeneration;
      let unexpectedAfterTerminal = sawLiveOrStale && !outcomeTerminal;
      if (unexpectedAfterTerminal && label === "policy_limits_load" && !superseded)
        this.latestLoad = {
          succeeded: false,
          errorCode: undefined,
          credentialState: undefined,
          httpStatus: undefined,
          serverErrorType: undefined,
          serverErrorCode: undefined,
          serverAuthDenial: undefined,
        };
      if (isStartupLoad && (this.startupLoadState === "in_flight" || unexpectedAfterTerminal)) {
        this.startupLoadState = "failed";
        this.startupLoadErrorCode = superseded ? "session_changed" : "unexpected_error";
        this.startupLoadCredentialState = undefined;
        this.startupLoadOutcomeReason = undefined;
        this.startupLoadHttpStatus = undefined;
        this.startupLoadServerErrorType = undefined;
        this.startupLoadServerErrorCode = undefined;
        this.startupLoadServerAuthDenial = undefined;
        this.startupLoadLastAttempt = undefined;
      }
      recordManagedConfigResult("policy", {
        source: superseded ? "superseded" : "error",
        hadCache: diskPolicy !== null,
        awaited,
      });
      if (superseded || signal.aborted) {
        logFeatureSad(label, "cycle_aborted");
        return getSessionCache();
      }
      if (!outcomeTerminal) reportRequestFailed();
      let fallbackSource = this.staleFallbackSource();
      if (fallbackSource) {
        logForDebugging("Policy limits: Using stale cache after error");
        let fallbackPolicy = mergeUnknownTaints(fallbackSource);
        installDiskDerivedVerdict(fallbackPolicy);
        this.disposeVerdictlessRetryTimer();
        if (!this.hasLiveVerdict()) this.noteUnverifiedCycle("unexpected_error", true);
        logFeatureSad(label, "stale_cache_used");
        return fallbackPolicy;
      }
      this.noteUnverifiedCycle("unexpected_error", false);
      logFeatureBad(label, "unexpected_error");
      return null;
    }
  }
  hasLiveVerdict() {
    let sessionCache = getSessionCache();
    return (
      sessionCache !== null &&
      sessionCache !== EMPTY_POLICY_RESPONSE &&
      this.serverConfirmedGeneration === this.sessionGeneration
    );
  }
  armVerdictlessRetry() {
    if (this.verdictlessRetry !== null) return true;
    let verdictlessRetryStep = this.verdictlessRetryStep;
    let delayMs = VERDICTLESS_RETRY_DELAYS_MS[verdictlessRetryStep];
    if (delayMs === undefined || !isPolicyLimitsEligible()) return false;
    this.verdictlessRetryStep = verdictlessRetryStep + 1;
    let rounded = Math.round(delayMs * (1 - RETRY_JITTER_RATIO + 2 * RETRY_JITTER_RATIO * Math.random()));
    let sessionGeneration = this.sessionGeneration;
    logForDebugging(
      `Policy limits: no verdict \u2014 accelerated retry ${verdictlessRetryStep + 1}/${VERDICTLESS_RETRY_DELAYS_MS.length} in ${Math.round(rounded / 1000)}s`,
    );
    let interactionAwarePoll = startInteractionAwarePoll(
      () => {
        interactionAwarePoll[Symbol.dispose]();
        if (this.verdictlessRetry === interactionAwarePoll) this.verdictlessRetry = null;
        if (this.sessionGeneration !== sessionGeneration) return;
        if (getSessionCache() !== null) return;
        this.poll("accelerated_retry").catch((error) => logError(error));
      },
      rounded,
      {
        unref: true,
      },
    );
    this.verdictlessRetry = interactionAwarePoll;
    return true;
  }
  disposeVerdictlessRetryTimer() {
    this.verdictlessRetry?.[Symbol.dispose]();
    this.verdictlessRetry = null;
  }
  armNetworkKick() {
    if (this.stopNetworkWatch !== null) return;
    let sessionGeneration = this.sessionGeneration;
    let subscription = onPrefetchChanged(() => {
      queueMicrotask(() => {
        if (this.stopNetworkWatch !== subscription) return;
        try {
          this.kickOnNetworkSuccess(sessionGeneration);
        } catch (error) {
          logError(error);
        }
      });
    });
    this.stopNetworkWatch = subscription;
  }
  disarmNetworkKick() {
    this.stopNetworkWatch?.();
    this.stopNetworkWatch = null;
  }
  kickOnNetworkSuccess(sessionGeneration) {
    if (this.sessionGeneration !== sessionGeneration) {
      this.disarmNetworkKick();
      return;
    }
    if (this.cyclesInFlight > 0) return;
    this.disarmNetworkKick();
    if (!isPolicyLimitsEligible() || this.hasLiveVerdict()) return;
    logForDebugging("Policy limits: the API answered a request \u2014 re-fetching the org policy now");
    this.poll("api_success_trigger").catch((error) => logError(error));
  }
  resetAcceleratedRecovery() {
    this.disposeVerdictlessRetryTimer();
    this.verdictlessRetryStep = 0;
    this.disarmNetworkKick();
  }
  noteUnverifiedCycle(errorCode, staleServed) {
    if (this.verdictlessEpisode === null)
      this.verdictlessEpisode = {
        sinceMs: Date.now(),
        errorCode,
        failedCycles: 1,
        staleServed,
      };
    else this.verdictlessEpisode.failedCycles++;
  }
  onLiveVerdict(trigger) {
    this.resetAcceleratedRecovery();
    let verdictlessEpisode = this.verdictlessEpisode;
    if (verdictlessEpisode === null) return;
    this.verdictlessEpisode = null;
    let now_2 = Date.now();
    let recoverySource = normalizeRecoverySource(trigger);
    let errorCode = verdictlessEpisode.errorCode;
    logEvent("tengu_policy_limits_verdict_recovered", {
      ms_since_startup: now_2 - now,
      ms_verdictless: now_2 - verdictlessEpisode.sinceMs,
      recovered_by: fromEnum(recoverySource),
      startup_error_code: fromEnum(errorCode),
      attempts_before_recovery: verdictlessEpisode.failedCycles,
      was_stale_served: verdictlessEpisode.staleServed,
      fast_retry_enabled: isShimmyingStardustGateOn(),
    });
  }
  gateSnapshot() {
    return this.policyGateSnapshot();
  }
  policyGateSnapshot() {
    if (this.gateSnapshotThisRun !== undefined) return this.gateSnapshotThisRun;
    let ineligibleReason = getPolicyLimitsIneligibleReason();
    let eligible = ineligibleReason === undefined;
    let eligibleIfBaseUrlGateRemoved =
      ineligibleReason === "custom_base_url"
        ? getPolicyLimitsIneligibleReason({
            skipBaseUrlCheck: true,
          }) === undefined
        : eligible;
    let hasCache = getResponseFromCache() !== null;
    let cacheAgeMsValue = eligible ? cacheAgeMs() : undefined;
    let liveVerdict = this.hasLiveVerdict();
    let snapshot = {
      ineligibleReason,
      eligible,
      eligibleIfBaseUrlGateRemoved,
      hasCache,
      cacheAgeMs: cacheAgeMsValue,
      liveVerdict,
      wouldFailClosed:
        eligible &&
        !liveVerdict &&
        (!hasCache ||
          (getPolicyLimitsTunnelSocket() === undefined &&
            (cacheAgeMsValue ?? 1 / 0) > FAIL_CLOSED_SHADOW_CACHE_TTL_MS)),
      loadState: this.startupLoadState,
      loadFromEarlierGeneration:
        this.startupLoadClaimed && this.startupLoadGeneration !== this.sessionGeneration,
      loadErrorCode: this.startupLoadErrorCode,
      loadCredentialState: this.startupLoadCredentialState,
      loadOutcomeReason: eligible
        ? this.startupLoadOutcomeReason
        : notAttemptedReason(managedConfigNotAttemptedInput(ineligibleReason)),
      loadHttpStatus: this.startupLoadHttpStatus,
      loadLastAttempt: this.startupLoadLastAttempt,
      latestLoad: this.latestLoad,
      loadServerErrorType: this.startupLoadServerErrorType,
      loadServerErrorCode: this.startupLoadServerErrorCode,
      loadServerAuthDenial: this.startupLoadServerAuthDenial,
      awaitResult: this.startupAwaitResult,
    };
    this.gateSnapshotThisRun = snapshot;
    queueMicrotask(() => {
      this.gateSnapshotThisRun = undefined;
    });
    return snapshot;
  }
  signatureFacts() {
    let storedCopyAtStart = this.storedCopyAtStart;
    return {
      storedCopy:
        storedCopyAtStart === undefined || storedCopyAtStart === "not_read"
          ? "not_read"
          : cacheTrustAnswer(storedCopyAtStart, this.storedCopyShadow),
      liveSigned: verifyLiveAnswerSignature({
        kind: "policy-limits",
        answer: this.liveAnswer,
        account: getStoredOauthAccountInfo(),
      }),
    };
  }
  managedConfigPolicyGateFields() {
    let snapshot = this.policyGateSnapshot();
    let connection = connectionTelemetry();
    return {
      policy_ineligible_reason: fromEnumOpt(snapshot.ineligibleReason),
      policy_eligible_if_base_url_gate_removed: snapshot.eligibleIfBaseUrlGateRemoved,
      policy_cache_age_ms: snapshot.cacheAgeMs,
      policy_would_fail_closed: snapshot.wouldFailClosed,
      policy_live_verdict: snapshot.liveVerdict,
      policy_load_state: fromEnum(snapshot.loadState),
      policy_error_code: fromEnumOpt(snapshot.loadErrorCode),
      policy_credential_state: fromEnumOpt(snapshot.loadCredentialState),
      policy_outcome_reason: fromEnumOpt(snapshot.loadOutcomeReason),
      policy_has_auth_token: connection.has_auth_token,
      policy_has_api_key_helper: connection.has_api_key_helper,
      policy_has_custom_base_url: connection.has_custom_base_url,
      policy_api_provider: fromEnum(getAPIProvider()),
      policy_http_status: snapshot.loadHttpStatus,
      policy_server_error_type: fromEnumOpt(snapshot.loadServerErrorType),
      policy_server_error_code: fromEnumOpt(snapshot.loadServerErrorCode),
      policy_server_auth_denial: fromEnumOpt(snapshot.loadServerAuthDenial),
    };
  }
  logCacheStateAtFirstPrompt() {
    if (this.firstPromptStateLogged) return;
    this.firstPromptStateLogged = true;
    let snapshot = this.policyGateSnapshot();
    let errorReportingGate = fromEnum(errorReportingPolicyState());
    logEvent("tengu_policy_limits_cache_state_at_first_prompt", {
      eligible: snapshot.eligible,
      ineligible_reason: fromEnumOpt(snapshot.ineligibleReason),
      eligible_if_base_url_gate_removed: snapshot.eligibleIfBaseUrlGateRemoved,
      has_cache: snapshot.hasCache,
      cache_age_ms: snapshot.cacheAgeMs,
      would_fail_closed: snapshot.wouldFailClosed,
      live_verdict: snapshot.liveVerdict,
      token_source: fromEnum(authTokenSourceLabel()),
      credential_road: fromEnum(settingsAuthSource()),
      ...connectionTelemetry(),
      ms_since_startup: Date.now() - now,
      load_state: fromEnum(snapshot.loadState),
      startup_fetch_error_code: fromEnumOpt(snapshot.loadErrorCode),
      startup_credential_state: fromEnumOpt(snapshot.loadCredentialState),
      outcome_reason: fromEnumOpt(snapshot.loadOutcomeReason),
      startup_await_result: fromEnum(snapshot.awaitResult),
      error_reporting_gate: errorReportingGate,
    });
  }
  async load({ startupAwaited = false, singleAttempt = false } = {}) {
    if (singleAttempt && this.cyclesInFlight > 0) {
      await Promise.allSettled([...this.unsettledCycles]);
      return;
    }
    return this.loadFor(singleAttempt ? "accelerated_retry" : "load", startupAwaited);
  }
  async loadFor(trigger, startupAwaited = false) {
    this.used = true;
    this.ensureCredentialWatch();
    if (isPolicyLimitsEligible() && !this.loadingCompletePromise)
      this.loadingCompletePromise = new Promise((resolve) => {
        this.loadingCompleteResolve = resolve;
      });
    let loadingCompleteResolve = this.loadingCompleteResolve;
    try {
      await this.fetchAndLoad("policy_limits_load", trigger, startupAwaited);
      if (isPolicyLimitsEligible()) this.startBackgroundPolling();
    } finally {
      if (loadingCompleteResolve) {
        loadingCompleteResolve();
        if (this.loadingCompleteResolve === loadingCompleteResolve) {
          this.loadingCompleteResolve = null;
          if (this.loadingTimeoutId) {
            clearTimeout(this.loadingTimeoutId);
            this.loadingTimeoutId = null;
          }
        }
      }
    }
  }
  async refresh({ observedBoundary = false } = {}) {
    this.used = true;
    this.stop();
    this.ensureCredentialWatch();
    this.initializeLoadingPromise();
    let eligible = isPolicyLimitsEligible();
    if (observedBoundary) await this.removeUnstampedBody();
    else if (!(await this.deleteCacheFile()))
      logForDebugging(
        "Policy limits: could not remove the previous account's cache; disk adoption stays suppressed",
      );
    this.dropUnconfirmedSessionCache();
    if (!eligible) return;
    await this.loadFor("login_refresh");
    logForDebugging("Policy limits: Refreshed after auth change");
  }
  async clearCache() {
    this.used = true;
    this.stop();
    this.verdictlessEpisode = null;
    this.ensureCredentialWatch();
    if (!(await this.deleteCacheFile()))
      logForDebugging(
        "Policy limits: could not remove the previous account's cache; disk adoption stays suppressed",
      );
    this.dropUnconfirmedSessionCache();
  }
  recordFetchOutcome(sessionGeneration, cacheClearEpoch, outcome, principalIdentity, mayRetry) {
    if (this.sessionGeneration === sessionGeneration && this.cacheClearEpoch === cacheClearEpoch)
      setLastFetchOutcome(outcome, principalIdentity, mayRetry);
  }
  staleFallbackSource() {
    if (isDiskAdoptionSuppressed()) return getSessionCache();
    return loadCachedResponse() ?? getSessionCache();
  }
  dropUnconfirmedSessionCache() {
    if (getSessionCache() !== null && this.serverConfirmedGeneration !== this.sessionGeneration)
      setSessionCache(null);
  }
  async deleteCacheFile() {
    this.cacheClearEpoch++;
    if (isPolicyCacheMemoryOnly()) return false;
    takeUpHipaaEvidenceLeftOnDisk(await readPolicyStamp(getCachePath()));
    if (!(await this.removeBodyLeavingStamp())) return false;
    let policyStamp = await readPolicyStamp(getCachePath());
    if (policyStamp.kind === "unusable") return true;
    let evidence = mergeHipaaEvidence(policyStamp, getHeldHipaaEvidence());
    if (evidence.seen.length === 0 && !evidence.incomplete) await removeCacheStamp(getCachePath());
    else await writeCacheStampSafe(getCachePath(), buildTokenStamp(evidence));
    return true;
  }
  recordVerdictPrincipal(principal) {
    if (principal === null || isClassifiedPrincipal(principal)) {
      this.verdictPrincipalIdentity = principal === null ? null : identityDigestOfDescriptor(principal);
      this.verdictPrincipalKind = principal === null ? null : principal.kind;
      this.verdictKey = principal === null ? null : policyCacheKey(principal);
      if (principal !== null) this.askedKey = null;
    } else this.verdictKey = policyCacheKey(principal);
    this.ensureCredentialWatch();
    this.onCredentialMayHaveChanged();
  }
  isVerdictOfLiveCredential() {
    return this.verdictKey !== null && currentPolicyCacheKey() === this.verdictKey;
  }
  ensureCredentialWatch() {
    if (this.stopCredentialWatch === null)
      this.stopCredentialWatch = onCredentialChange(this.onCredentialMayHaveChanged);
    if (this.stopTunnelEpochWatch === null)
      this.stopTunnelEpochWatch = subscribeCredentialEpoch(this.onTunnelCredentialEpoch);
    if (this.stopRegimeRefusalWatch === null)
      this.stopRegimeRefusalWatch = setIdleTask(this.refetchAfterRegimeRefusal);
    if (this.stopKeyApprovalWatch === null)
      this.stopKeyApprovalWatch = onEnvApiKeyApprovalFlipped(this.onCredentialMayHaveChanged);
  }
  refetchAfterRegimeRefusal = () => {
    if (hasComplianceTaint("hipaa")) return Promise.resolve();
    if (this.regimeRefusalRefetch !== null) return this.regimeRefusalRefetch;
    let now = Date.now();
    let sinceLast =
      this.regimeRefusalRefetchStartedAtMs === undefined
        ? undefined
        : now - this.regimeRefusalRefetchStartedAtMs;
    let mayRefetch =
      sinceLast === undefined || sinceLast < 0 || sinceLast >= REGIME_REFUSAL_REFETCH_MIN_INTERVAL_MS;
    if (mayRefetch) {
      this.regimeRefusalRefetchStartedAtMs = now;
      logForDebugging(
        "Policy limits: the API refused a request for an organization policy this session has not loaded \u2014 re-fetching it now",
      );
    }
    this.regimeRefusalRefetch = withDeadline(
      (mayRefetch ? this.poll("api_refusal_trigger") : Promise.resolve()).then(() =>
        Promise.allSettled([...this.unsettledCycles]),
      ),
      POLICY_LIMITS_COLD_AWAIT_MS,
    )
      .catch((error) => logError(error))
      .then(() => {
        this.regimeRefusalRefetch = null;
      });
    return this.regimeRefusalRefetch;
  };
  onTunnelCredentialEpoch = (epoch) => {
    this.observeTunnelCredentialEpoch(epoch, "a model response", true);
  };
  observeTunnelCredentialEpoch(tunnelEpochHeard, why, mayPoll) {
    if (tunnelEpochHeard === undefined || getPolicyLimitsTunnelSocket() === undefined) return;
    let seenBefore = this.tunnelEpochSeen !== undefined;
    if (this.tunnelEpochSeen === undefined || tunnelEpochHeard > this.tunnelEpochSeen) {
      this.tunnelEpochSeen = tunnelEpochHeard;
      noteTunnelEpochHeard(tunnelEpochHeard);
    }
    if (this.tunnelVerdictEpoch !== undefined && tunnelEpochHeard <= this.tunnelVerdictEpoch) return;
    if (!seenBefore && this.tunnelVerdictEpoch === undefined) return;
    let hasVerdict = getSessionCache() !== null;
    let shouldRepoll =
      mayPoll && this.tunnelRepolledForEpoch !== this.tunnelEpochSeen && this.cyclesInFlight === 0;
    if (!hasVerdict && !shouldRepoll) return;
    logForDebugging(
      `Policy limits: the claude ssh launcher injects a different credential than the one this policy was fetched with (${why}); ${hasVerdict ? "withholding client-only keys" : "no verdict held"}${shouldRepoll ? ", re-polling" : ""}`,
    );
    if (hasVerdict) markSessionVerdictUnattributed();
    if (shouldRepoll) {
      this.tunnelRepolledForEpoch = this.tunnelEpochSeen;
      logEvent("tengu_policy_limits_principal_changed", {
        next_kind: fromEnum("none"),
        reason: fromEnum("tunnel_credential"),
      });
      this.fetchAndLoad("policy_limits_poll", "credential_change").catch((error) => logError(error));
    }
  }
  settleTunnelCredentialEpoch(tunnelEpochHeard) {
    if (tunnelEpochHeard === undefined || getPolicyLimitsTunnelSocket() === undefined) return;
    this.tunnelVerdictEpoch = tunnelEpochHeard;
    if (this.tunnelEpochSeen === undefined || tunnelEpochHeard > this.tunnelEpochSeen) {
      this.tunnelEpochSeen = tunnelEpochHeard;
      noteTunnelEpochHeard(tunnelEpochHeard);
    }
  }
  isStaleTunnelCredentialEpoch(epoch) {
    return (
      epoch !== undefined &&
      this.tunnelEpochSeen !== undefined &&
      epoch < this.tunnelEpochSeen &&
      getPolicyLimitsTunnelSocket() !== undefined
    );
  }
  onCredentialMayHaveChanged = () => {
    if (this.principalCheckQueued) return;
    this.principalCheckQueued = true;
    queueMicrotask(() => {
      this.checkPrincipal().catch((error) => {
        logError(error);
      });
    });
  };
  async checkPrincipal(reason = "credential_change") {
    let sessionGeneration = this.sessionGeneration;
    try {
      if (
        this.verdictPrincipalIdentity === null &&
        getSessionCache() === null &&
        getCredentialIndependentIneligibleReason() !== undefined
      )
        return "unchanged";
      try {
        await getClaudeAIOAuthTokensAsync(this.credentials);
      } catch {}
      if (storedLoginAccountNeedsRead() && getClaudeAIOAuthTokenOrigin() === "store")
        try {
          await noteStoredLoginAccountAtWire(this.storageV5, this.credentials);
        } catch (error) {
          logForDebugging(
            `Policy limits: stored login origin or account record unreadable (${errorMessage(error)})`,
          );
        }
    } finally {
      this.principalCheckQueued = false;
    }
    if (this.sessionGeneration !== sessionGeneration) return "superseded";
    let envBearerState = envBearerVerdictOnWire();
    if (envBearerState === "replaced" && isHostManagedProviderAuth())
      return this.askAsHostManagedEnvBearer(reason);
    if (envBearerState === "replaced" || envBearerState === "gone") {
      logForDebugging(
        "Policy limits: the env bearer the loaded policy was fetched with is no longer the wire credential; reloading as an account change",
      );
      logEvent("tengu_policy_limits_principal_changed", {
        next_kind: fromEnum("none"),
        reason: fromEnum("env_bearer"),
      });
      this.refresh({
        observedBoundary: true,
      }).catch((error) => logError(error));
      return "changed";
    }
    let policyPrincipal = getPolicyPrincipal();
    if (policyPrincipal !== null && !isClassifiedPrincipal(policyPrincipal))
      this.scheduleUnclassifiedRecheck();
    if (!isClassifiedPrincipal(policyPrincipal)) {
      if (
        policyPrincipal !== null &&
        getSessionCache() !== null &&
        policyCacheKey(policyPrincipal) !== this.verdictKey &&
        getClaudeAIOAuthTokenOrigin() === "store"
      ) {
        if (this.cyclesInFlight > 0) {
          this.principalCheckOwed = true;
          return "unchanged";
        }
        let askedKey = principalCacheKeyWithBearer(policyPrincipal);
        if (askedKey !== this.askedKey) {
          logForDebugging(
            "Policy limits: the stored login in use is not the one the loaded policy was fetched with, and its account record has not settled; asking the server with it (keyed on the token until the record settles)",
          );
          return this.repollFor(policyPrincipal, askedKey, "unattributed", reason);
        }
      }
      if (
        policyPrincipal === null &&
        envBearerState === null &&
        isHostManagedAnthropicApiBearer() &&
        isPolicyLimitsEligible()
      )
        return this.askAsHostManagedEnvBearer(reason);
      return "unchanged";
    }
    let identity = identityDigestOfDescriptor(policyPrincipal);
    let sameTokenKind = this.verdictPrincipalKind === "token" && policyPrincipal.kind === "token";
    if (
      this.verdictPrincipalIdentity !== null &&
      identity !== this.verdictPrincipalIdentity &&
      !sameTokenKind
    ) {
      if (isSteadyMarshmallowOn()) {
        let askedKey = principalCacheKeyWithBearer(policyPrincipal);
        let inFlight = this.cyclesInFlight > 0;
        if (inFlight && askedKey === this.askedKey) {
          this.principalCheckOwed = true;
          return "unchanged";
        }
        if (!inFlight && askedKey !== this.askedKey) {
          logForDebugging(
            `Policy limits: the credential now belongs to a different principal than the loaded policy; ${TENGU_STEADY_MARSHMALLOW} keeps the loaded verdict while the new principal's policy is fetched`,
          );
          logEvent("tengu_policy_limits_principal_changed", {
            next_kind: fromEnum(policyPrincipal.kind),
            reason: fromEnum("identity_kept"),
          });
          this.askedKey = askedKey;
          this.fetchAcrossBoundaryKeepingVerdict(reason).catch((error) => logError(error));
          return "changed";
        }
      }
      logForDebugging(
        "Policy limits: the credential now belongs to a different principal than the loaded policy; reloading as an account change",
      );
      logEvent("tengu_policy_limits_principal_changed", {
        next_kind: fromEnum(policyPrincipal.kind),
        reason: fromEnum("identity"),
      });
      this.refresh({
        observedBoundary: true,
      }).catch((error) => logError(error));
      return "changed";
    }
    if (this.cyclesInFlight > 0) {
      this.principalCheckOwed = true;
      return "unchanged";
    }
    let verdictKeyValue = policyCacheKey(policyPrincipal);
    let askedKeyValue = principalCacheKeyWithBearer(policyPrincipal);
    if (askedKeyValue === this.askedKey) return "unchanged";
    if (this.verdictPrincipalIdentity === null) {
      if (getSessionCache() === null) {
        if (!isPolicyLimitsEligible() || this.loadingCompleteResolve !== null) return "unchanged";
        this.askedKey = askedKeyValue;
        this.releaseLoadingPromise();
        this.initializeLoadingPromise();
        this.loadFor(reason).catch((error) => logError(error));
        return "started";
      }
      return this.repollFor(policyPrincipal, askedKeyValue, "unattributed", reason);
    }
    if (verdictKeyValue !== this.verdictKey) {
      let admitsOnlyFlipped =
        (policyPrincipal.admitsOnly === true) !==
        (this.verdictKey?.endsWith(ADMITS_ONLY_KEY_SUFFIX) ?? false);
      let obsbervedKind = admitsOnlyFlipped
        ? policyPrincipal.admitsOnly === true
          ? "snapshot_fallback"
          : "store_restored"
        : policyPrincipal.bearerDigest !== undefined || sameTokenKind
          ? "bearer"
          : "reclassified";
      logForDebugging(
        admitsOnlyFlipped
          ? `Policy limits: the login moved between the credential store and the daemon's snapshot of it (${obsbervedKind}); keeping the verdict and re-polling`
          : "Policy limits: a new bearer for the loaded policy (a declared organization's new bearer, one keyed on itself replacing another, a healed store); keeping the verdict and re-polling",
      );
      return this.repollFor(policyPrincipal, askedKeyValue, obsbervedKind, reason);
    }
    return "unchanged";
  }
  scheduleUnclassifiedRecheck() {
    if (this.unclassifiedRecheckTimer !== null) return;
    this.unclassifiedRecheckTimer = setTimeout(() => {
      this.unclassifiedRecheckTimer = null;
      this.onCredentialMayHaveChanged();
    }, UNCLASSIFIED_RECHECK_DELAY_MS);
    this.unclassifiedRecheckTimer.unref?.();
  }
  askAsHostManagedEnvBearer(reason) {
    if (this.cyclesInFlight > 0) {
      this.principalCheckOwed = true;
      return "unchanged";
    }
    let askedKey = envBearerCacheKey(tokenDigest(effectiveAuthTokenEnv() ?? ""));
    if (askedKey === this.askedKey) return "unchanged";
    if (getSessionCache() !== null) {
      this.askedKey = askedKey;
      logEvent("tengu_policy_limits_principal_changed", {
        next_kind: fromEnum("none"),
        reason: fromEnum("bearer"),
      });
      this.fetchAndLoad("policy_limits_poll", reason).catch((error) => logError(error));
      return "repolled";
    }
    if (this.loadingCompleteResolve !== null) return "unchanged";
    this.askedKey = askedKey;
    this.releaseLoadingPromise();
    this.initializeLoadingPromise();
    this.loadFor(reason).catch((error) => logError(error));
    return "started";
  }
  repollFor(principal, askedKey, observedKind, reason) {
    this.askedKey = askedKey;
    logEvent("tengu_policy_limits_principal_changed", {
      next_kind: fromEnum(principal.kind),
      reason: fromEnum(observedKind),
    });
    this.fetchAndLoad("policy_limits_poll", reason).catch((error) => logError(error));
    return "repolled";
  }
  async fetchAcrossBoundaryKeepingVerdict(reason) {
    let sessionGeneration = this.sessionGeneration;
    let verdictPrincipalIdentity = this.verdictPrincipalIdentity;
    suppressDiskAdoption();
    forgetPersistedPolicyCache();
    markSessionVerdictUnattributed();
    this.prefetchSlot.clear();
    this.renewOAuthRefreshLatch();
    this.cyclesInFlight++;
    try {
      await this.removeUnstampedBody().catch((error) => logError(error));
      if (this.sessionGeneration === sessionGeneration)
        await this.fetchAndLoad("policy_limits_poll", reason).catch((error) => logError(error));
    } finally {
      this.endCycle(sessionGeneration);
    }
    if (
      this.sessionGeneration !== sessionGeneration ||
      this.verdictPrincipalIdentity !== verdictPrincipalIdentity
    )
      return;
    logForDebugging(
      "Policy limits: the new principal's fetch installed nothing; dropping the previous principal's verdict as an account change",
    );
    await this.refresh({
      observedBoundary: true,
    });
  }
  async poll(reason = "hourly_poll") {
    if (!isPolicyLimitsEligible()) return;
    let sessionCache = getSessionCache();
    let beforeJson = sessionCache ? jsonStringify(sessionCache) : null;
    try {
      if ((await this.checkPrincipal(reason)) !== "unchanged") return;
      if (this.cyclesInFlight > 0) return;
      await this.fetchAndLoad("policy_limits_poll", reason);
      let sessionCache = getSessionCache();
      if ((sessionCache ? jsonStringify(sessionCache) : null) !== beforeJson)
        logForDebugging("Policy limits: Changed during background poll");
    } catch {}
  }
  startBackgroundPolling() {
    this.used = true;
    if (this.poller !== null) return;
    if (!isPolicyLimitsEligible()) return;
    this.poller = startInteractionAwarePoll(() => void this.poll(), POLL_INTERVAL_MS, {
      unref: true,
    });
    if (!this.cleanupRegistered) {
      this.cleanupRegistered = true;
      registerCleanup(() => this.stopBackgroundPolling());
    }
  }
  stopBackgroundPolling() {
    this.poller?.[Symbol.dispose]();
    this.poller = null;
    this.resetAcceleratedRecovery();
  }
}
//@ chunk-pcv9zvvv.js:63097-63121 placement
class DefaultPolicyLimitsClientSlot {
  client = undefined;
}
//@ chunk-pcv9zvvv.js:63121-63148 placement
var defaultPolicyLimitsClientSlots; // deferred: uses DefaultPolicyLimitsClientSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-pcv9zvvv.js:63121", () => {
  defaultPolicyLimitsClientSlots = new HostScoped(() => new DefaultPolicyLimitsClientSlot());
});
//@ chunk-pcv9zvvv.js:63148-63186 placement
function policyLimitsClientSlots() {
  return defaultPolicyLimitsClientSlots.of(getRootSession().host);
}
//@ chunk-pcv9zvvv.js:63186-63245 placement
function getPolicyLimitsClient() {
  let slots = policyLimitsClientSlots();
  slots.client ??= new PolicyLimitsClient();
  return slots.client;
}
//@ chunk-pcv9zvvv.js:63245-63933 placement
function composePolicyLimitsClient(services) {
  let slots = policyLimitsClientSlots();
  if (slots.client === undefined) {
    slots.client = new PolicyLimitsClient(services);
    return;
  }
  let outcome = slots.client.adoptStartupServices(services);
  switch (outcome) {
    case "nothing to adopt":
      logForDebugging("Policy limits: default client already constructed; start-up composition skipped");
      return;
    case "already used":
      logForDebugging(
        "Policy limits: start-up composition came after the bare default client was used; it keeps running without the backend and credentials store",
        {
          level: "warn",
        },
      );
      logEvent("tengu_policy_limits_late_composition", {});
      return;
    case "already composed":
      logForDebugging("Policy limits: default client already composed; later start-up composition skipped");
      return;
    case "adopted":
      logForDebugging("Policy limits: start-up services adopted by the default client");
      return;
    default:
  }
}
//@ chunk-pcv9zvvv.js:63933-63981 placement
function _recordPolicyLimitsStartupAwaitResultForTesting(result) {
  getPolicyLimitsClient().recordStartupAwaitResult(result);
}
//@ chunk-pcv9zvvv.js:63981-64182 placement
async function awaitPolicyLimitsColdStartVerdict() {
  let since = performance.now();
  let verdict;
  try {
    let policyLimitsClient = getPolicyLimitsClient();
    policyLimitsClient.ensureLoadRequested({
      startupAwaited: true,
    });
    verdict = await policyLimitsClient.awaitColdStartVerdict();
  } catch (error) {
    logError(error);
    verdict = "timed_out";
  }
  recordLoadBarrier("policy", verdict, {
    since,
  });
  return verdict;
}
//@ chunk-pcv9zvvv.js:64182-64226 placement
function didPolicyLimitsColdStartTimeOut() {
  return getPolicyLimitsClient().coldStartTimedOut;
}
//@ chunk-pcv9zvvv.js:64226-64267 placement
function getPolicyLimitsGateSnapshot() {
  return getPolicyLimitsClient().gateSnapshot();
}
//@ chunk-pcv9zvvv.js:64267-64314 placement
function getPolicyLimitsColdStartWait() {
  return getPolicyLimitsClient().coldStartVerdictWait;
}
//@ chunk-pcv9zvvv.js:64314-64429 placement
function ensurePolicyLimitsLoadRequested() {
  recordLoadBarrier("policy", "not_awaited");
  try {
    if (isPolicyLimitsEligible())
      getPolicyLimitsClient().ensureLoadRequested({
        startupAwaited: false,
      });
  } catch (error) {
    logError(error);
  }
}
//@ chunk-pcv9zvvv.js:64429-64593 placement
async function awaitPolicyLimitsColdStart() {
  let since = performance.now();
  try {
    if (!shouldAwaitPolicyLimitsOnStartup()) {
      ensurePolicyLimitsLoadRequested();
      return "skipped";
    }
  } catch (error) {
    logError(error);
    recordLoadBarrier("policy", "timed_out", {
      since,
    });
    return "timed_out";
  }
  return awaitPolicyLimitsColdStartVerdict();
}
//@ chunk-pcv9zvvv.js:64593-64619 placement
function _getDefaultPolicyLimitsClientForTesting() {
  return getPolicyLimitsClient();
}
//@ chunk-pcv9zvvv.js:64619-64706 placement
async function _awaitPolicyLimitsCyclesForTesting() {
  let client = policyLimitsClientSlots().client;
  if (client !== undefined) await client._settleCyclesForTesting();
}
//@ chunk-pcv9zvvv.js:64706-64781 placement
function _resetPolicyLimitsForTesting() {
  getPolicyLimitsClient().stop();
  liftDiskAdoptionSuppression();
  policyLimitsClientSlots().client = undefined;
  skillChangeDetector();
  _resetRememberedCoreSkillsForTesting();
  clearLockHolderSocket();
  _resetMachinePinsSignInForTesting();
}
//@ chunk-pcv9zvvv.js:64781-64827 placement
function initializePolicyLimitsLoadingPromise() {
  getPolicyLimitsClient().initializeLoadingPromise();
}
//@ chunk-pcv9zvvv.js:64827-64890 placement
function serverErrorCodeOf(error) {
  return stampedServerErrorType(error) !== undefined ? error.serverErrorCode : undefined;
}
//@ chunk-pcv9zvvv.js:64890-64954 placement
function serverAuthDenialOf(error) {
  return stampedServerErrorType(error) !== undefined ? error.serverAuthDenial : undefined;
}
//@ chunk-pcv9zvvv.js:64954-64997 placement
function getPolicyLimitsSignatureFacts() {
  return getPolicyLimitsClient().signatureFacts();
}
//@ chunk-pcv9zvvv.js:64997-65036 placement
function waitForPolicyLimitsToLoad() {
  return getPolicyLimitsClient().waitForLoad();
}
//@ chunk-pcv9zvvv.js:65036-65084 placement
function logPolicyLimitsCacheStateAtFirstPrompt() {
  getPolicyLimitsClient().logCacheStateAtFirstPrompt();
}
//@ chunk-pcv9zvvv.js:65084-65130 placement
function admitPrefetchedPolicyLimits(prefetched) {
  return getPolicyLimitsClient().admitPrefetched(prefetched);
}
//@ chunk-pcv9zvvv.js:65130-65197 placement
function isSessionVerdictOfLiveCredential() {
  return policyLimitsClientSlots().client?.isVerdictOfLiveCredential() ?? false;
}
//@ chunk-pcv9zvvv.js:65197-65235 placement
function loadPolicyLimits(options = {}) {
  return getPolicyLimitsClient().load(options);
}
//@ chunk-pcv9zvvv.js:65235-65265 placement (2.1.88 match: skillSearchModules, 1)
function prefetchPolicyLimits() {
  getPolicyLimitsClient().prefetch();
}
//@ chunk-pcv9zvvv.js:65265-65301 placement
function refreshPolicyLimits() {
  return getPolicyLimitsClient().refresh();
}
//@ chunk-pcv9zvvv.js:65301-65340 placement
function clearPolicyLimitsCache() {
  return getPolicyLimitsClient().clearCache();
}
//@ chunk-pcv9zvvv.js:65340-65384 placement
function startBackgroundPolling() {
  getPolicyLimitsClient().startBackgroundPolling();
}
//@ chunk-pcv9zvvv.js:65384-65427 placement
function stopBackgroundPolling() {
  getPolicyLimitsClient().stopBackgroundPolling();
}
//@ chunk-pcv9zvvv.js:65427-65453 placement
function stopPolicyLimits() {
  getPolicyLimitsClient().stop();
}
//@ chunk-pcv9zvvv.js:65453-65469 placement
var UNCLASSIFIED_RECHECK_DELAY_MS; // deferred: uses POLICY_LIMITS_CACHE_FILENAME (./policyState.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-pcv9zvvv.js:65453", () => {
  UNCLASSIFIED_RECHECK_DELAY_MS = UNCLASSIFIED_ORIGIN_MEMO_MS + 1000;
});
//@ chunk-pcv9zvvv.js:65469-65521 placement
function isClassifiedPrincipal(policyPrincipal) {
  return policyPrincipal !== null && policyPrincipal.unclassified !== true;
}
//@ chunk-pcv9zvvv.js:65521-65543 placement
var ADMITS_ONLY_KEY_SUFFIX = ":admits-only";
//@ chunk-pcv9zvvv.js:65543-65663 placement
function policyCacheKey(policyPrincipal) {
  let descriptorDigest = identityDigestOfDescriptor(policyPrincipal);
  let key =
    policyPrincipal.bearerDigest === undefined
      ? descriptorDigest
      : `${descriptorDigest}:${policyPrincipal.bearerDigest}`;
  return policyPrincipal.admitsOnly === true ? `${key}${ADMITS_ONLY_KEY_SUFFIX}` : key;
}
//@ chunk-pcv9zvvv.js:65663-65715 placement
function currentPolicyCacheKey() {
  let policyPrincipal = getPolicyPrincipal();
  return policyPrincipal === null ? null : policyCacheKey(policyPrincipal);
}
//@ chunk-pcv9zvvv.js:65715-65754 placement
function envBearerCacheKey(digest) {
  return `env-bearer:${digest}`;
}
//@ chunk-pcv9zvvv.js:65754-65825 placement
function principalCacheKeyWithBearer(policyPrincipal) {
  let accessToken = getClaudeAIOAuthTokens()?.accessToken;
  return `${policyCacheKey(policyPrincipal)}#${accessToken ? tokenDigest(accessToken) : ""}`;
}
export {
  didPolicyLimitsColdStartTimeOut,
  waitForPolicyLimitsToLoad,
  refreshPolicyLimits,
  getPolicyLimitsSignatureFacts,
  shouldAwaitPolicyLimitsOnStartup,
  loadPolicyLimits,
  awaitPolicyLimitsColdStart,
  clearPolicyLimitsCache,
  FETCH_MAX_RETRIES,
  policyLimitsEndpointUrl,
  currentPolicyCacheKey,
  policyCacheKey,
  isClassifiedPrincipal,
  principalCacheKeyWithBearer,
  envBearerCacheKey,
  revalidationChecksumForPolicy,
  POLICY_REQUEST_TIMEOUT_MS,
  responseShapeField,
  isShimmyingStardustGateOn,
  policyEndpointHost,
  awaitPolicyLimitsColdStartVerdict,
  ensurePolicyLimitsLoadRequested,
  getPolicyLimitsGateSnapshot,
  getPolicyLimitsColdStartWait,
  POLICY_LIMITS_COLD_AWAIT_MS,
  logPolicyLimitsCacheStateAtFirstPrompt,
  fetchPolicyLimitsForBearer,
  composePolicyLimitsClient,
  primePolicyLimitsCache,
  initializePolicyLimitsLoadingPromise,
  prefetchPolicyLimits,
  isSessionVerdictOfLiveCredential,
  DefaultPolicyLimitsClientSlot,
  FAIL_CLOSED_SHADOW_CACHE_TTL_MS,
  POLICY_LIMITS_FIRST_ATTEMPT_WAIT_MS,
  PREFETCHED_POLICY_LIMITS_MAX_AGE_MS,
  PolicyLimitsClient,
  _awaitPolicyLimitsCyclesForTesting,
  _getDefaultPolicyLimitsClientForTesting,
  _recordPolicyLimitsStartupAwaitResultForTesting,
  _resetPolicyLimitsForTesting,
  admitPrefetchedPolicyLimits,
  defaultPolicyLimitsClientSlots,
  startBackgroundPolling,
  stopBackgroundPolling,
  stopPolicyLimits,
};
