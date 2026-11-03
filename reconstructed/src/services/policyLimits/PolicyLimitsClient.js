/**
 * services/policyLimits/PolicyLimitsClient.ts
 *
 * 2.1.316 新增（门面模块 PolicyLimitsClient）。策略限制客户端。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-7t4fmt2f.js (69)
 * attribution: placement 69
 */
import { statSync } from "fs";
import { writeFile, unlink } from "fs/promises";
import { isManagedConfigPrefetchOn, onPrefetchChanged } from "./prefetchToggle.js";
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
import { uniq, count } from "../../utils/collections.js";
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
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../analytics/featureTelemetry.js";
import {
  classifyAuthOutcome,
  settingsFetchOutcome,
  notAttemptedReason,
} from "../analytics/authOutcomeTelemetry.js";
import { settingsAuthSource, startInteractionAwarePoll } from "../remoteManagedSettings/fetchSupport.js";
import { errorReportingPolicyState } from "../errorReportingGate.js";
import { onCredentialChange, subscribeCredentialEpoch } from "../../utils/auth/credentialEpoch.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { skillChangeDetector } from "../../utils/skills/skillChangeDetector.js";
import { clearLockHolderSocket } from "../../utils/auth/lockHolderLiveness.js";

//@ chunk-7t4fmt2f.js:14376-14397 placement
function registerManagedConfigPrefetchEnabledReader(isManagedConfigPrefetchEnabled) {
  isManagedConfigPrefetchOn = isManagedConfigPrefetchEnabled;
}
//@ chunk-7t4fmt2f.js:14397-14495 placement
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
//@ chunk-7t4fmt2f.js:14495-14549 placement
function isShimmyingStardustGateOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_shimmying_stardust", false);
}
//@ chunk-7t4fmt2f.js:14549-14563 placement
var PREFETCHED_POLICY_LIMITS_MAX_AGE_MS = 60000;
//@ chunk-7t4fmt2f.js:14563-14606 placement
function normalizeRecoverySource(e) {
  return e === "load" ? "other" : e;
}
//@ chunk-7t4fmt2f.js:14606-14706 placement
function isAcceleratedTrigger(e) {
  return e === "accelerated_retry" || e === "api_success_trigger" || e === "api_refusal_trigger";
}
//@ chunk-7t4fmt2f.js:14706-14741 placement
/**
 * 等待策略加载完成 promise 的最长时间（30 秒），超时后直接放行并记调试日志。
 */
var LOADING_PROMISE_TIMEOUT_MS = 30000;
var POLICY_LIMITS_COLD_AWAIT_MS = 5000;
var FAIL_CLOSED_SHADOW_CACHE_TTL_MS = 86400000;
//@ chunk-7t4fmt2f.js:14741-14828 placement
function revalidationChecksumForPolicy(e, r) {
  let n = e || undefined;
  if (!isPolicyGraceEnabled()) return n;
  return keepIfFresh(n, r ?? (isDiskCacheForeign() ? sessionBodyAgeMs() : cacheAgeMs()));
}
//@ chunk-7t4fmt2f.js:14828-15008 placement
function cacheAgeMs() {
  if (isDiskCacheForeign()) return;
  let persistedPolicyCacheConfirmedAt = getPersistedPolicyCacheConfirmedAt();
  if (persistedPolicyCacheConfirmedAt !== null) {
    let r = Date.now() - persistedPolicyCacheConfirmedAt;
    return r >= 0 ? r : undefined;
  }
  try {
    let r = Date.now() - Math.trunc(statSync(getCachePath()).mtimeMs);
    return r >= 0 ? r : undefined;
  } catch {
    return;
  }
}
//@ chunk-7t4fmt2f.js:15008-15093 placement
function sessionBodyAgeMs() {
  let sessionBodyReceivedAt = getSessionBodyReceivedAt();
  if (sessionBodyReceivedAt === null) return;
  let r = Date.now() - sessionBodyReceivedAt;
  return r >= 0 ? r : undefined;
}
//@ chunk-7t4fmt2f.js:15093-15111 placement
var now = Date.now();
//@ chunk-7t4fmt2f.js:15111-15351 placement
function mergeUnknownTaints(e) {
  let sessionCache = getSessionCache();
  if (!sessionCache) return e;
  latchComplianceTaintsBustingBetas(e.compliance_taints);
  let sliced = uniq([
    ...sessionCache.compliance_taints,
    ...e.compliance_taints.filter((complianceTaint) => !isKnownTaint(complianceTaint)),
  ]).slice(0, MAX_COMPLIANCE_TAINTS);
  if (sliced.length === sessionCache.compliance_taints.length) return sessionCache;
  return {
    ...sessionCache,
    compliance_taints: sliced,
  };
}
//@ chunk-7t4fmt2f.js:15351-15419 placement
function policyLimitsBaseUrl() {
  return policyLimitsUrl(getPolicyLimitsTunnelSocket() ? "http://localhost" : getOauthConfig().BASE_API_URL);
}
//@ chunk-7t4fmt2f.js:15419-15445 placement
/**
 * 返回策略接口的基址（隧道时为 http://localhost，否则为 OAuth 配置的 BASE_API_URL），policyEndpointHost 由它取 host。
 */
function policyLimitsEndpointUrl() {
  return policyLimitsBaseUrl();
}
//@ chunk-7t4fmt2f.js:15445-15571 placement
function policyEndpointHost() {
  if (getPolicyLimitsTunnelSocket()) return "local machine (via claude ssh tunnel)";
  try {
    return new URL(policyLimitsEndpointUrl()).host;
  } catch {
    return "unknown host";
  }
}
//@ chunk-7t4fmt2f.js:15571-15604 placement
function checksumOfServerResponse(e) {
  return computeChecksum(serverBodyOf(e));
}
//@ chunk-7t4fmt2f.js:15604-15645 placement
function shouldAwaitPolicyLimitsOnStartup() {
  return isPolicyLimitsEligible() && loadCachedResponse() === null;
}
//@ chunk-7t4fmt2f.js:15645-16103 placement
/**
 * 策略请求使用的鉴权类型（api_key/oauth/wif）。
 */
function policyAuthKind() {
  if (getPolicyLimitsTunnelSocket())
    return {
      authType: env.CLAUDE_CODE_OAUTH_TOKEN ? "oauth" : "api_key",
      apiKeyFromHelper: false,
    };
  let e = null;
  let r = "none";
  try {
    let anthropicApiKeyWithSource = getAnthropicApiKeyWithSource({
      skipRetrievingKeyFromApiKeyHelper: true,
    });
    e = anthropicApiKeyWithSource.key;
    r = anthropicApiKeyWithSource.source;
  } catch {}
  let n = r === "apiKeyHelper";
  let o = Boolean(e) || n;
  if (!o && shouldUseWIFAuth())
    return {
      authType: "wif",
      apiKeyFromHelper: false,
    };
  if (isClaudeAISubscriber() && getClaudeAIOAuthTokens()?.accessToken)
    return {
      authType: "oauth",
      apiKeyFromHelper: false,
    };
  return o
    ? {
        authType: "api_key",
        apiKeyFromHelper: n,
      }
    : {
        authType: "oauth",
        apiKeyFromHelper: false,
      };
}
//@ chunk-7t4fmt2f.js:16103-16348 placement
function credentialOriginLabel(e, r) {
  if (getPolicyLimitsTunnelSocket()) return "proxy";
  switch (e.authType) {
    case "api_key":
      return e.apiKeyFromHelper ? "helper_key" : "static_key";
    case "oauth":
      return r.sentStoredLogin === undefined
        ? undefined
        : r.sentStoredLogin
          ? "stored_login"
          : "injected_token";
    case "wif":
      return;
  }
}
//@ chunk-7t4fmt2f.js:16348-16455 placement
function authTokenSourceLabel() {
  if (getPolicyLimitsTunnelSocket()) return env.CLAUDE_CODE_OAUTH_TOKEN ? "CLAUDE_CODE_OAUTH_TOKEN" : "none";
  return getAuthTokenSource().source;
}
//@ chunk-7t4fmt2f.js:16455-16761 placement
/**
 * 是否使用代理及是否回环。
 */
function proxyTelemetry() {
  if (getPolicyLimitsTunnelSocket())
    return {
      proxy_in_use: false,
      proxy_is_loopback: false,
    };
  let e;
  let r = false;
  try {
    e = getUsableProxyUrl();
    r = e !== undefined && shouldBypassProxy(policyLimitsEndpointUrl());
  } catch {
    return {
      proxy_in_use: false,
      proxy_is_loopback: false,
    };
  }
  if (e === undefined || r)
    return {
      proxy_in_use: false,
      proxy_is_loopback: false,
    };
  let proxyUrl = parseProxyUrl(e);
  return {
    proxy_in_use: true,
    proxy_is_loopback: proxyUrl !== undefined && isLoopbackHost(proxyUrl.hostname),
  };
}
//@ chunk-7t4fmt2f.js:21874-22472 placement
async function fetchPolicyLimitsForBearer(bearer, { timeoutMs: r = POLICY_REQUEST_TIMEOUT_MS } = {}) {
  if (getAPIProvider() !== "firstParty" || !isActualFirstPartyAnthropicBaseUrl()) return null;
  try {
    let policyLimitsResponse = await fetchPolicyLimitsResponse({
      endpoint: policyLimitsBaseUrl(),
      authHeaders: {
        Authorization: `Bearer ${bearer}`,
        "anthropic-beta": OAUTH_BETA_HEADER,
      },
      timeoutMs: r,
      acceptAny2xx: true,
    });
    if (policyLimitsResponse.kind === "not_modified") {
      logForDebugging("Policy limits (bearer read): 304 to an unconditional request");
      return null;
    }
    let o = projectPolicyLimitsBody(policyLimitsResponse.data);
    if (!o.success) {
      logForDebugging(`Policy limits (bearer read): invalid response format \u2014 ${o.error.message}`);
      return null;
    }
    return o.data;
  } catch (error) {
    let { kind, status, message } = classifyAxiosError(error);
    logForDebugging(
      `Policy limits (bearer read): fetch failed (${kind}${status ? ` ${status}` : ""}) \u2014 ${message}`,
    );
    return null;
  }
}
//@ chunk-7t4fmt2f.js:22472-22591 placement
function responseShapeField(e) {
  if (e === undefined) return "root";
  return e === "restrictions" || e === "compliance_taints" || e === "defaults" ? e : "other";
}
//@ chunk-7t4fmt2f.js:22591-22804 placement
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
//@ chunk-7t4fmt2f.js:22804-22910 placement
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
//@ chunk-7t4fmt2f.js:22910-22969 placement
function cacheIoErrorCodeOrOther(errnoCode) {
  return errnoCode !== undefined && CACHE_IO_ERRORS.includes(errnoCode) ? errnoCode : "other";
}
//@ chunk-7t4fmt2f.js:22969-23000 placement
function cacheIoErrorCodeOf(error) {
  return cacheIoErrorCodeOrOther(getErrnoCode(error));
}
//@ chunk-7t4fmt2f.js:23000-23118 placement
function storageErrorIoCode(error) {
  let telemetryCode = "telemetryCode" in error ? error.telemetryCode : undefined;
  return cacheIoErrorCodeOrOther(
    telemetryCode === "UnexpectedAbsent" || telemetryCode === ABSENTPARENT ? "ENOENT" : telemetryCode,
  );
}
//@ chunk-7t4fmt2f.js:23118-23165 placement
function policyLimitsStorageSpace() {
  return STORAGE_SPACES.state("policy-limits");
}
//@ chunk-7t4fmt2f.js:23165-23180 placement
var MAX_POLICY_CACHE_BYTES = 1048576;
//@ chunk-7t4fmt2f.js:23180-23695 placement
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
    let n = await storageV5.read([
      {
        key: policyLimitsStorageSpace(),
        offset: 0,
        length: MAX_POLICY_CACHE_BYTES + 1,
      },
    ]);
    if (!n.ok) {
      logForDebugging(`Policy limits: prime read failed: ${n.error.code}; raw cache read stays`);
      return;
    }
    let o = n.value.items[0];
    if (!o.found) {
      seedSessionCacheFromPrime(storageV5, null);
      return;
    }
    if (o.totalBytes > MAX_POLICY_CACHE_BYTES) {
      logForDebugging("Policy limits: prime skipped (oversize cache); raw cache read stays");
      return;
    }
    let cachedResponse = parseCachedResponse(Buffer.from(o.value).toString("utf-8"));
    seedSessionCacheFromPrime(
      storageV5,
      cachedResponse === null
        ? null
        : admitCachedResponse(cachedResponse, settleStampRead(policyCacheStampForAdmission)),
    );
  } catch (error) {
    logForDebugging(`Policy limits: prime failed: ${errorMessage(error)}`);
  }
}
//@ chunk-7t4fmt2f.js:23695-63095 placement
/**
 * PolicyLimitsClient：组织策略限制（policy limits）客户端。持有存储与凭证，负责冷启动等待、预取结果接纳、OAuth 刷新闩锁、定时轮询与主体变化时重载，产出 fail-open/fail-closed 判定供启动门控和工具使用。
 */
class PolicyLimitsClient {
  storageV5;
  credentials;
  used = false;
  constructor(e = {}) {
    this.storageV5 = e.storageV5;
    this.credentials = e.credentials;
  }
  adoptStartupServices(e) {
    if (e.storageV5 === undefined && e.credentials === undefined) return "nothing to adopt";
    if (this.storageV5 !== undefined || this.credentials !== undefined) return "already composed";
    if (this.used) return "already used";
    this.storageV5 = e.storageV5;
    this.credentials = e.credentials;
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
    let e = currentPolicyCacheKey();
    if (e === null) return;
    let r = isDiskAdoptionSuppressed() ? null : loadCachedResponse();
    let n = r === EMPTY_POLICY_RESPONSE ? null : r;
    let o = n ? checksumOfServerResponse(n) : undefined;
    let { credentials, storageV5, oauthRefreshLatch } = this;
    this.prefetchSlot.set(
      {
        checksum: o,
        generation: this.sessionGeneration,
        diskEpoch: getDiskAdoptionEpoch(),
        endpointHost: policyEndpointHost(),
        storageV5,
        credentials,
        principalKey: e,
      },
      (signal) =>
        fetchPolicyLimits(
          o,
          isPolicyGraceEnabled() ? cacheAgeMs() : undefined,
          credentials,
          storageV5,
          oauthRefreshLatch,
          signal,
        ),
      (y) => y.success || y.httpStatus === 404,
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
    let n;
    try {
      await withTimeout(this.waitForLoad(), max, "policy_limits_cold_await");
      n = "completed";
    } catch {
      n = "timed_out";
    }
    this.coldStartWaitedMs += performance.now() - startTime;
    if (this.startupAwaitResult !== "timed_out") this.recordStartupAwaitResult(n);
    return n;
  }
  get coldStartVerdictWait() {
    return this.coldStartFirstWaitAtMs === undefined
      ? null
      : {
          waitedMs: this.coldStartWaitedMs,
          firstAtMs: this.coldStartFirstWaitAtMs,
        };
  }
  async admitPrefetched(e) {
    let r = (n) => {
      logForDebugging(`Policy limits: host prefetch not admitted (${n})`);
      return {
        admitted: false,
        refused: n,
      };
    };
    try {
      if (!isPolicyLimitsEligible()) return r("ineligible");
      if (
        this.startupLoadClaimed ||
        this.cyclesInFlight > 0 ||
        this.serverConfirmedGeneration === this.sessionGeneration
      )
        return r("already_loading");
      if (this.prefetchAdmittedGeneration === this.sessionGeneration) return r("already_admitted");
      let policyPrincipal = getPolicyPrincipal();
      if (
        policyPrincipal === null ||
        policyPrincipal.kind !== "org" ||
        policyPrincipal.unclassified === true ||
        policyPrincipal.descriptor !== `org:${e.orgUuid.toLowerCase()}` ||
        policyPrincipal.bearerDigest === undefined ||
        policyPrincipal.bearerDigest !== e.bearerDigest
      )
        return r("principal_mismatch");
      let o = policyEndpointHost();
      if (e.endpointHost !== o) return r("endpoint_mismatch");
      let u = Date.now() - e.fetchedAtMs;
      if (
        !Number.isFinite(e.fetchedAtMs) ||
        u < -PREFETCHED_POLICY_LIMITS_MAX_AGE_MS ||
        u > PREFETCHED_POLICY_LIMITS_MAX_AGE_MS
      )
        return r("stale");
      let p = projectPolicyLimitsBody(e.data);
      if (!p.success) return r("unparseable");
      if (countDroppedComplianceTaints(e.data) > 0) return r("lossy_taints");
      let h = p.data;
      let sessionGeneration = this.sessionGeneration;
      let hadCache = getSessionCache() !== null;
      this.used = true;
      this.prefetchAdmittedGeneration = sessionGeneration;
      setPolicyGate(() => this.managedConfigPolicyGateFields());
      setSessionCacheAsPriorEvidence(h);
      this.recordVerdictPrincipal(policyPrincipal);
      let diskAdoptionEpoch = getDiskAdoptionEpoch();
      let S = await this.saveCachedResponse(
        h,
        sessionGeneration,
        validSignatureHeader(e.signature),
        policyPrincipal,
        "prior_evidence",
      );
      if (this.sessionGeneration !== sessionGeneration) {
        recordManagedConfigResult("policy", {
          source: "superseded",
          hadCache,
          awaited: false,
        });
        if (S !== "stale" && S !== "skipped") {
          await this.deleteCacheFile();
          suppressDiskAdoption();
        }
        this.dropUnconfirmedSessionCache();
        return r("superseded");
      }
      recordManagedConfigResult("policy", {
        source: "cache",
        hadCache,
        awaited: false,
      });
      if (S === "saved" && getDiskAdoptionEpoch() === diskAdoptionEpoch) liftDiskAdoptionSuppression();
      logForDebugging(
        `Policy limits: admitted the host's prefetch as this session's prior-evidence verdict (${Object.keys(h.restrictions).length} restriction(s), ${h.compliance_taints?.length ?? 0} taint(s), persisted=${S})`,
      );
      return {
        admitted: true,
      };
    } catch (error) {
      logError(error);
      return r("error");
    }
  }
  ensureLoadRequested(e) {
    let r =
      this.startupLoadClaimed &&
      this.startupLoadState === "not_started" &&
      !this.loadingCompletePromise &&
      isPolicyLimitsEligible();
    if (this.startupLoadClaimed && !r) return false;
    this.initializeLoadingPromise();
    this.load(e).catch((error) => logError(error));
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
          (r) => {
            if (this.loadingCompleteResolve === r) {
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
  async saveCachedResponse(e, r, n, o, u) {
    if (this.sessionGeneration !== r) {
      logForDebugging("Policy limits: skipped saving a fetch that outlived the account session");
      return "stale";
    }
    if (isPolicyCacheMemoryOnly()) return "skipped";
    if (!isPersistablePrincipal(o)) {
      logForDebugging(
        "Policy limits: no server-attributable principal for this credential; the verdict is used for the session and not persisted",
      );
      return "skipped";
    }
    let p;
    try {
      p = await this.writeStampForSave(e, o, u);
    } catch (error) {
      this.recordCacheWriteFailure(
        error instanceof Error ? error.message : "unknown error",
        cacheIoErrorCodeOf(error),
      );
      return "failed";
    }
    if (p === null) return "failed";
    let h = checksumOfServerResponse(e);
    if (isStorageV5Enabled() && this.storageV5 !== undefined) {
      let y;
      let E;
      try {
        let R = await this.storageV5.write(
          policyLimitsStorageSpace(),
          jsonStringify(serverBodyOf(e), null, 2),
          {
            publishDiscipline: "inPlace",
            mode: 384,
          },
        );
        if (R.ok) {
          logForDebugging(`Policy limits: Saved to ${getCachePath()}`);
          await saveSignedCacheJws(getCachePath(), n);
          return await this.sealSavedBody(p, h);
        }
        y = formatStorageError(R.error);
        E = storageErrorIoCode(R.error);
      } catch (error) {
        y = errorMessage(error);
        E = cacheIoErrorCodeOf(error);
      }
      forgetPersistedPolicyCache();
      this.recordCacheWriteFailure(y, E);
      return "failed";
    }
    try {
      let cachePath = getCachePath();
      await writeFile(cachePath, jsonStringify(serverBodyOf(e), null, 2), {
        encoding: "utf-8",
        mode: 384,
      });
      logForDebugging(`Policy limits: Saved to ${cachePath}`);
      await saveSignedCacheJws(cachePath, n);
    } catch (error) {
      forgetPersistedPolicyCache();
      this.recordCacheWriteFailure(
        error instanceof Error ? error.message : "unknown error",
        cacheIoErrorCodeOf(error),
      );
      return "failed";
    }
    return this.sealSavedBody(p, h);
  }
  async sealSavedBody(e, diskBodyChecksum) {
    try {
      await e.rewrite();
    } catch (error) {
      let policyStamp = await readPolicyStamp(getCachePath());
      takeUpHipaaEvidenceLeftOnDisk(policyStamp);
      if (
        policyStamp.kind !== "ok" ||
        policyStamp.stamp.identity !== e.identity ||
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
            if (policyStamp.kind !== "ok") await e.vouch();
          }
        }
        this.recordCacheWriteFailure(
          error instanceof Error ? error.message : "unknown error",
          cacheIoErrorCodeOf(error),
        );
        return "failed";
      }
    }
    recordPersistedPolicyCache(diskBodyChecksum, e.evidence, e.confirmedAt);
    return "saved";
  }
  async readDiskBody() {
    let e = false;
    let r;
    try {
      r = await readSmallFileChecked(getFsImplementation(), getCachePath(), MAX_POLICY_CACHE_BYTES, (o) => {
        e = o.isFile();
      });
    } catch (error) {
      return {
        kind: isENOENT(error) ? "none" : "unreadable",
      };
    }
    if (e)
      return {
        kind: "unreadable",
      };
    let n = r === null ? null : parseCachedResponse(r);
    return n === null
      ? {
          kind: "none",
        }
      : {
          kind: "body",
          checksum: checksumOfServerResponse(n),
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
  async removeSupersededLegacyBody(e, r) {
    if (!isUnrestrictiveBody(e)) return;
    let policyStamp = await readPolicyStamp(getCachePath());
    takeUpHipaaEvidenceLeftOnDisk(policyStamp);
    if (policyStamp.kind !== "absent") return;
    let diskBody = await this.readDiskBody();
    if (diskBody.kind !== "body" || diskBody.checksum !== r) return;
    logForDebugging(
      "Policy limits: removed an unstamped cache this credential cannot restamp after the server superseded it",
    );
    await this.removeBodyLeavingStamp();
  }
  async writeStampForSave(e, principal, authority) {
    let cachePath = getCachePath();
    let policyStamp = await readPolicyStamp(cachePath);
    takeUpHipaaEvidenceLeftOnDisk(policyStamp);
    if (isIoUnusableStamp(policyStamp)) {
      logForDebugging(
        `Policy limits: the cache stamp could not be read just now (${policyStamp.code}); nothing persisted this cycle`,
      );
      return null;
    }
    let p = nextHipaaEvidence({
      principal,
      bodySha: checksumOfServerResponse(e),
      confirmedAt: Date.now(),
      bodyTaints: e.compliance_taints,
      previous: mergeHipaaEvidence(policyStamp, getHeldHipaaEvidence()),
      authority,
    });
    await writeCacheStampFile(cachePath, p);
    return {
      identity: p.identity,
      evidence: stampToHipaaEvidence(p),
      confirmedAt: p.confirmed_at,
      rewrite: () => writeCacheStampFile(cachePath, p),
      vouch: async () => {
        await writeCacheStampSafe(cachePath, p);
      },
    };
  }
  async restampConfirmedCache(e, diskBodyChecksum, n, o, authority, p) {
    if (
      this.sessionGeneration !== o ||
      !isPersistablePrincipal(n) ||
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
    let E = nextHipaaEvidence({
      principal: n,
      bodySha: diskBodyChecksum,
      confirmedAt: !isPolicyGraceEnabled()
        ? Date.now()
        : policyStamp.kind === "ok"
          ? policyStamp.stamp.confirmed_at
          : p,
      bodyTaints: e.compliance_taints,
      previous: mergeHipaaEvidence(policyStamp, getHeldHipaaEvidence()),
      authority,
    });
    await writeCacheStampSafe(getCachePath(), E);
    if (this.cacheClearEpoch !== cacheClearEpoch) {
      await this.deleteCacheFile();
      return;
    }
    if (this.sessionGeneration !== o) return;
    recordPersistedPolicyCache(diskBodyChecksum, stampToHipaaEvidence(E), E.confirmed_at);
  }
  recordCacheWriteFailure(e, r) {
    logForDebugging(`Policy limits: Failed to save - ${e}`);
    if (!this.cacheWriteFailureLogged) {
      this.cacheWriteFailureLogged = true;
      logEvent("tengu_policy_limits_cache_write_failed", {
        errno: fromEnum(r),
      });
    }
  }
  async fetchAndLoad(e, r, n = false) {
    let sessionGeneration = this.sessionGeneration;
    this.cyclesInFlight++;
    let u = this.runFetchCycle(e, r, n);
    this.unsettledCycles.add(u);
    try {
      return await u;
    } finally {
      this.unsettledCycles.delete(u);
      this.endCycle(sessionGeneration);
    }
  }
  async _settleCyclesForTesting() {
    while (this.unsettledCycles.size > 0) await Promise.allSettled([...this.unsettledCycles]);
  }
  endCycle(e) {
    if (this.sessionGeneration !== e) return;
    this.cyclesInFlight--;
    if (this.cyclesInFlight === 0 && this.principalCheckOwed) {
      this.principalCheckOwed = false;
      this.onCredentialMayHaveChanged();
    }
  }
  async runFetchCycle(e, r, n) {
    this.used = true;
    let o = e === "policy_limits_load" && !this.startupLoadClaimed;
    if (o) {
      this.startupLoadClaimed = true;
      this.startupLoadGeneration = this.sessionGeneration;
    }
    setPolicyGate(() => this.managedConfigPolicyGateFields());
    if (!isPolicyLimitsEligible()) {
      this.prefetchSlot.clear();
      recordManagedConfigResult("policy", {
        source: "ineligible",
        hadCache: false,
        awaited: n,
      });
      return null;
    }
    if (o) this.startupLoadState = "in_flight";
    let u = isDiskAdoptionSuppressed() ? null : loadCachedResponse();
    let p = u === EMPTY_POLICY_RESPONSE ? null : u;
    let h = u === null ? undefined : getPolicyStoredCopyTrustedPrincipal();
    let diskAdoptionEpoch = getDiskAdoptionEpoch();
    let E = cacheAgeMs();
    let now_2 = Date.now();
    let policyPrincipal = getPolicyPrincipal();
    let K = policyPrincipal === null ? "" : identityDigestOfDescriptor(policyPrincipal);
    let b = !isAcceleratedTrigger(r);
    if (p && !getSessionCache()) installDiskDerivedVerdict(p);
    let sessionCache = getSessionCache();
    if (
      p &&
      sessionCache !== null &&
      this.verdictPrincipalIdentity === null &&
      this.serverConfirmedGeneration !== this.sessionGeneration
    )
      if (
        isClassifiedPrincipal(policyPrincipal) &&
        getLastPolicyCacheStampVerdict() === "match" &&
        getLastPolicyCacheStampMatchedIdentity() === identityDigestOfDescriptor(policyPrincipal) &&
        checksumOfServerResponse(sessionCache) === checksumOfServerResponse(p)
      )
        this.recordVerdictPrincipal(policyPrincipal);
      else this.ensureCredentialWatch();
    if (p)
      recordManagedConfigResult("policy", {
        source: "cache",
        hadCache: true,
        awaited: n,
      });
    let A = p ? checksumOfServerResponse(p) : undefined;
    let cacheClearEpoch = this.cacheClearEpoch;
    if (!this.signedCacheShadowChecked) {
      this.signedCacheShadowChecked = true;
      this.storedCopyAtStart = isPolicyCacheMemoryOnly()
        ? "not_read"
        : {
            enforced: isSettingsGateSettled(),
            gateAnswer: getPolicyStoredCopyTrust(),
            hadCopy: p !== null,
          };
      if (A !== undefined && !isPolicyCacheMemoryOnly())
        verifyStoredCacheAsync({
          kind: "policy-limits",
          cachePath: getCachePath(),
          bodySha: A,
          readStoredAccount: getStoredOauthAccountInfo,
          readOrgPin: describeMdmSettingsState,
          onJudged: (storedCopyShadow) => {
            this.storedCopyShadow = storedCopyShadow;
          },
        });
    }
    let G = policyAuthKind();
    let authType = G.authType;
    let now_3 = Date.now();
    let signal = this.abortController.signal;
    let sessionGeneration = this.sessionGeneration;
    let lastFetchOutcome = getLastFetchOutcome();
    let se = () => {
      let lastFetchOutcome_2 = getLastFetchOutcome();
      return (
        lastFetchOutcome_2 !== null && lastFetchOutcome_2.success && lastFetchOutcome_2 !== lastFetchOutcome
      );
    };
    let I = false;
    let X = false;
    let j = (s) => {
      I = true;
      if (!s.success && se()) return;
      this.recordFetchOutcome(sessionGeneration, cacheClearEpoch, s, K, b);
    };
    let U = () =>
      j({
        success: false,
        errorCode: "request_failed",
        httpStatus: null,
        host: policyEndpointHost(),
        retrying: false,
      });
    if (e === "policy_limits_load" && this.prefetchSlot.pending) {
      let claudeAIOAuthTokenOrigin = await getClaudeAIOAuthTokenOriginAsync(this.credentials);
      if (claudeAIOAuthTokenOrigin !== "store" || env.CLAUDE_CODE_OAUTH_TOKEN) clearOAuthTokenMemos();
      if (storeRecheckNeeded(claudeAIOAuthTokenOrigin))
        await checkOAuthCredentialsChangedOnDisk(getRootSession().host, this.credentials);
      policyPrincipal = getPolicyPrincipal();
    }
    let V = policyPrincipal === null ? null : policyCacheKey(policyPrincipal);
    let te = policyEndpointHost();
    let ae =
      e === "policy_limits_load"
        ? this.prefetchSlot.take(
            (s) =>
              s.checksum === A &&
              s.generation === sessionGeneration &&
              s.diskEpoch === diskAdoptionEpoch &&
              s.endpointHost === te &&
              s.storageV5 === this.storageV5 &&
              s.credentials === this.credentials &&
              s.principalKey === V,
          )
        : undefined;
    try {
      let s = await fetchWithRetry(
        A,
        E,
        this.credentials,
        this.storageV5,
        signal,
        (L) => {
          if (o && this.startupLoadState === "in_flight")
            this.startupLoadLastAttempt = {
              errorCode: L.errorCode ?? "request_failed",
              httpStatus: L.httpStatus ?? undefined,
              serverErrorType: stampedServerErrorType(L),
              serverErrorCode: serverErrorCodeOf(L),
              serverAuthDenial: serverAuthDenialOf(L),
            };
          if (getLastFetchOutcome()?.success) return;
          this.recordFetchOutcome(
            sessionGeneration,
            cacheClearEpoch,
            {
              success: false,
              host: te,
              httpStatus: L.httpStatus ?? null,
              errorCode: L.errorCode ?? "request_failed",
              retrying: true,
            },
            K,
            b,
          );
        },
        this.oauthRefreshLatch,
        isAcceleratedTrigger(r) ? 0 : FETCH_MAX_RETRIES,
        {
          hedge: n && isManagedConfigPrefetchOn(),
          prefetched: ae,
        },
      );
      if (this.sessionGeneration !== sessionGeneration || signal.aborted) {
        if (o && this.startupLoadState === "in_flight") {
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
          hadCache: p !== null,
          awaited: n,
        });
        logForDebugging("Policy limits: Discarding a fetch that outlived the account session");
        logFeatureSad(e, "cycle_aborted");
        return getSessionCache();
      }
      let policyPrincipal_2 = getPolicyPrincipal();
      let ue = policyPrincipal_2 === null ? null : policyCacheKey(policyPrincipal_2);
      let ve = s.principalKeyAtWire === undefined ? ue : s.principalKeyAtWire;
      let Me = s.success && this.isStaleTunnelCredentialEpoch(s.tunnelCredentialEpoch);
      if (Me)
        logForDebugging(
          "Policy limits: this answer came back under an older claude ssh credential epoch than one already seen; not installing it",
        );
      let Q = s.principalMovedAtWire === true || ve !== ue;
      if (!Q && s.askedKeyAtWire !== undefined && s.askedKeyAtWire !== null) this.askedKey = s.askedKeyAtWire;
      if (Q) {
        logForDebugging(
          "Policy limits: the credential changed principal during the fetch; this response is used for the session but not persisted or attributed",
        );
        policyPrincipal = null;
      } else if (V !== ue) {
        logForDebugging(
          "Policy limits: the credential changed principal before the request went out; attributing the response to the principal it authenticated as",
        );
        policyPrincipal = policyPrincipal_2;
      }
      if (getDiskAdoptionEpoch() !== diskAdoptionEpoch) {
        logForDebugging(
          "Policy limits: the disk snapshot predates an account-boundary hold; not installable",
        );
        p = null;
      }
      let Se = s.success && s.response === null && !p;
      let D = s.success && !Se && !Me;
      if (!D)
        this.observeTunnelCredentialEpoch(
          s.tunnelCredentialEpoch,
          s.success ? "a stale policy answer" : "a refused policy request",
          false,
        );
      let ie = Me ? "stale_tunnel_credential" : Se ? "spurious_304" : (s.errorCode ?? "request_failed");
      let Ie = D ? undefined : ie;
      let rt = credentialOriginLabel(G, s);
      let nt = rt === "injected_token" ? injectedOAuthTokenRecovery() : undefined;
      let ot = {
        errorCode: ie,
        httpStatus: s.httpStatus,
        serverErrorType: s.serverErrorType,
        serverErrorCode: s.serverErrorCode,
        serverAuthDenial: s.serverAuthDenial,
        tokenRefreshOutcome: s.tokenRefreshOutcome,
        forcedRefreshOutcome: s.forcedRefreshOutcome,
        authUnavailableReason: s.authUnavailableReason,
        authType,
        credentialOrigin: rt,
        injectedTokenRecovery: nt,
        noResponse: s.noResponse,
      };
      let he = classifyAuthOutcome(ot);
      let De = D ? undefined : he;
      let st =
        D || s.serverErrorStamped === true || !isPolicyGraceEnabled()
          ? De
          : classifyAuthOutcome({
              ...ot,
              serverErrorType: undefined,
              serverErrorCode: undefined,
              serverAuthDenial: s.httpStatus === 401 ? s.serverAuthDenial : undefined,
            });
      let at = settingsFetchOutcome(
        D
          ? {
              succeeded: true,
              responseKind: s.response === null ? "not_modified" : "body",
            }
          : {
              succeeded: false,
              failure:
                s.authUnavailableReason !== undefined
                  ? "no_credentials"
                  : ie === "timeout"
                    ? "timeout"
                    : ie === "network_error" || s.noResponse
                      ? "network"
                      : ie === "parse_failed"
                        ? "parse"
                        : s.httpStatus !== undefined
                          ? "http"
                          : "other",
              httpStatus: s.httpStatus,
              serverErrorType: s.serverErrorType,
              serverErrorCode: s.serverErrorCode,
              serverAuthDenial: s.serverAuthDenial,
              credentialState: De,
              tokenRefreshOutcome: s.tokenRefreshOutcome,
              forcedRefreshOutcome: s.forcedRefreshOutcome,
              errno: s.errno,
              responseContentType: s.responseContentType ?? s.parseErrorContentType,
              requestIdPresent: s.requestIdPresent,
            },
      );
      let now_4 = Date.now();
      let lastPolicyCacheStampVerdict = getLastPolicyCacheStampVerdict();
      let Pe = isSettingsGateSettled();
      let gateAnswer = getPolicyStoredCopyTrust();
      let dt = Pe ? h : trustedPrincipal(this.storedCopyShadow);
      let qt = cacheTrustAnswer(
        {
          enforced: Pe,
          gateAnswer,
          hadCopy: p !== null,
        },
        this.storedCopyShadow,
      );
      let lt = !this.storedCopyReported;
      this.storedCopyReported = true;
      X = D;
      if (o) {
        this.startupLoadState = D ? "succeeded" : "failed";
        this.startupLoadErrorCode = Ie;
        this.startupLoadCredentialState = st;
        this.startupLoadOutcomeReason = at;
        this.startupLoadHttpStatus = D ? undefined : (s.httpStatus ?? undefined);
        this.startupLoadServerErrorType = D ? undefined : stampedServerErrorType(s);
        this.startupLoadServerErrorCode = D ? undefined : serverErrorCodeOf(s);
        this.startupLoadServerAuthDenial = D ? undefined : serverAuthDenialOf(s);
        this.startupLoadLastAttempt = undefined;
      }
      if (e === "policy_limits_load" && this.sessionGeneration === sessionGeneration)
        this.latestLoad = D
          ? {
              succeeded: true,
            }
          : {
              succeeded: false,
              errorCode: Ie,
              credentialState: st,
              httpStatus: s.httpStatus ?? undefined,
              serverErrorType: stampedServerErrorType(s),
              serverErrorCode: serverErrorCodeOf(s),
              serverAuthDenial: serverAuthDenialOf(s),
            };
      let Re = {
        source: D ? "fetch" : "error",
        hadCache: p !== null,
        awaited: n,
        fetchMs: now_4 - now_3,
      };
      if (!D) recordManagedConfigResult("policy", Re);
      let ke;
      let verdictlessRetryScheduled = false;
      if (
        !s.success &&
        (!s.skipRetry || s.errorCode === "parse_failed") &&
        r !== "api_refusal_trigger" &&
        isShimmyingStardustGateOn()
      ) {
        ke = this.staleFallbackSource();
        let L = r !== "api_success_trigger";
        if (ke === null) {
          verdictlessRetryScheduled = this.armVerdictlessRetry();
          if (L) this.armNetworkKick();
        } else if (!this.hasLiveVerdict() && L) this.armNetworkKick();
      }
      let pe = D ? (s.response ?? p) : null;
      this.liveAnswer =
        pe === null
          ? undefined
          : {
              jws: s.signature,
              bodySha: () => checksumOfServerResponse(pe),
            };
      if (D && s.signature !== undefined && dt !== undefined && !this.livePrincipalChecked) {
        this.livePrincipalChecked = true;
        logPrincipalChange({
          kind: "policy-limits",
          jws: s.signature,
          trustedPrincipal: dt,
          gate: Pe ? "enforced" : "shadow",
        });
      }
      logEvent("tengu_policy_limits_fetch", {
        duration_ms: now_4 - now_3,
        ms_since_startup: now_4 - now,
        success: D,
        had_cache: p !== null,
        cache_stamp: fromEnum(lastPolicyCacheStampVerdict),
        stored_copy: lt ? fromEnum(qt) : undefined,
        stored_copy_gate: lt ? fromEnum(Pe ? "enforced" : "shadow") : undefined,
        cache_age_ms: E,
        attempts: s.attempts,
        prefetched: ae !== undefined,
        hedged: s.hedged === true,
        restrictions_denied_count: pe ? count(Object.values(pe.restrictions), (L) => !L.allowed) : undefined,
        compliance_taint_count: pe ? (pe.compliance_taints?.length ?? 0) : undefined,
        is_load: e === "policy_limits_load",
        awaited: n,
        auth_type: fromEnum(authType),
        error_code: fromEnumOpt(Ie),
        token_source: fromEnum(authTokenSourceLabel()),
        credential_road: fromEnum(settingsAuthSource()),
        ...connectionTelemetry(),
        auth_unavailable_reason: fromEnumOpt(s.authUnavailableReason),
        token_refresh_outcome: authType === "oauth" ? fromEnumOpt(s.tokenRefreshOutcome) : undefined,
        forced_refresh_outcome: authType === "oauth" ? fromEnumOpt(s.forcedRefreshOutcome) : undefined,
        retried_after_401: s.retriedAfter401 ?? false,
        http_status: s.httpStatus,
        parse_error_field: fromEnumOpt(s.parseErrorField),
        parse_error_content_type: fromEnumOpt(s.parseErrorContentType),
        server_error_type: fromEnumOpt(s.serverErrorType),
        server_error_code: fromEnumOpt(s.serverErrorCode),
        server_auth_denial: fromEnumOpt(s.serverAuthDenial),
        injected_token_recovery: fromEnumOpt(D ? undefined : nt),
        credential_state: fromEnumOpt(De),
        outcome_reason: fromEnum(at),
        response_kind: D ? fromEnum(s.response === null ? "not_modified" : "body") : undefined,
        request_id_present: s.requestIdPresent,
        response_content_type: fromEnumOpt(s.responseContentType),
        fetch_trigger: fromEnum(r),
        verdictless_retry_scheduled: verdictlessRetryScheduled,
        error_errno: fromEnumOpt(s.errno),
        ...proxyTelemetry(),
      });
      if (!D) {
        j({
          success: false,
          host: te,
          httpStatus: s.httpStatus ?? null,
          errorCode: ie,
          retrying: false,
          credentialState: he,
          ...(s.serverErrorCode !== undefined && {
            serverErrorCode: s.serverErrorCode,
          }),
        });
        let L = ke !== undefined ? ke : this.staleFallbackSource();
        if (L) {
          logForDebugging(
            Se
              ? "Policy limits: 304 with no outstanding ETag \u2014 using stale cache"
              : "Policy limits: Using stale cache after fetch failure",
          );
          let fe = mergeUnknownTaints(L);
          installDiskDerivedVerdict(fe);
          this.disposeVerdictlessRetryTimer();
          if (!this.hasLiveVerdict()) this.noteUnverifiedCycle(ie, true);
          logFeatureSad(e, Se ? "spurious_304" : "stale_cache_used", {
            credential_state: fromEnum(he),
          });
          return fe;
        }
        if (
          (s.httpStatus === 404 || s.httpStatus === 304) &&
          getSessionCache() === null &&
          !isAnthropicHosted() &&
          !getFeatureValue_CACHED_MAY_BE_STALE("tengu_rustling_orbit", false)
        ) {
          logForDebugging(
            `Policy limits: ${s.httpStatus} with no cache, no restrictions for this session (not persisted)`,
          );
          markSessionVerdictUnattributed();
          installFailOpenSessionVerdict();
          this.serverConfirmedGeneration = sessionGeneration;
          this.disposeVerdictlessRetryTimer();
          this.disarmNetworkKick();
          this.recordVerdictPrincipal(policyPrincipal);
          logFeatureSad(e, s.httpStatus === 404 ? "route_missing_fail_open" : "unsolicited_304_fail_open", {
            credential_state: fromEnum(he),
          });
          return EMPTY_POLICY_RESPONSE;
        }
        this.noteUnverifiedCycle(ie, false);
        logFeatureBad(e, ie, {
          credential_state: fromEnum(he),
        });
        return null;
      }
      let response = s.response;
      if (response === null || response === undefined) {
        if (!p) {
          U();
          recordManagedConfigResult("policy", {
            ...Re,
            source: "error",
          });
          logFeatureBad(e, "unexpected_error");
          return null;
        }
        logForDebugging("Policy limits: Cache still valid (304 Not Modified)");
        let L = p;
        let complianceTaints = p.compliance_taints;
        let ut =
          this.serverConfirmedGeneration === sessionGeneration
            ? (getSessionCache()?.compliance_taints ?? [])
            : [];
        let xe = countDroppedComplianceTaints(serverBodyOf(p)) > 0;
        if (xe && ut.some((pt) => !complianceTaints.includes(pt))) {
          L = {
            ...p,
            compliance_taints: uniq([...ut, ...complianceTaints]).slice(0, MAX_COMPLIANCE_TAINTS),
          };
          logForDebugging("Policy limits: lossy cached compliance_taints \u2014 kept the session taint set");
        }
        if (Q) markSessionVerdictUnattributed();
        else dropPolicyTaintHints(s.stampAtWire);
        if (Q || xe) setSessionCacheAsPriorEvidence(L);
        else setSessionCache(L);
        noteSessionVerdictEnvBearer(Q ? null : (s.sentEnvBearerDigest ?? null));
        this.settleTunnelCredentialEpoch(s.tunnelCredentialEpoch);
        this.serverConfirmedGeneration = sessionGeneration;
        this.onLiveVerdict(r);
        this.recordVerdictPrincipal(policyPrincipal);
        j({
          success: true,
          host: te,
        });
        if (!isPolicyCacheMemoryOnly() && isPersistablePrincipal(policyPrincipal))
          try {
            await maybePersistSignature(getCachePath(), s.signature, {
              keptVerifiable: isSettingsGateAnswered(),
            });
            if (
              !(await clearSignatureIfStale(getCachePath(), this.cacheClearEpoch !== cacheClearEpoch)) &&
              !Q
            )
              await this.restampConfirmedCache(
                L,
                A,
                policyPrincipal,
                sessionGeneration,
                xe ? "prior_evidence" : "confirmed",
                E === undefined ? 0 : Math.floor(now_2 - E),
              );
          } catch {}
        recordManagedConfigResult("policy", Re);
        logFeatureOk(e);
        return L;
      }
      let ee = response;
      if (s.lossyComplianceTaints) {
        let L = [...(getSessionCache()?.compliance_taints ?? []), ...(p?.compliance_taints ?? [])];
        if (L.length > 0) {
          ee = {
            ...ee,
            compliance_taints: uniq([...ee.compliance_taints, ...L]).slice(0, MAX_COMPLIANCE_TAINTS),
          };
          logForDebugging("Policy limits: lossy compliance_taints \u2014 kept the known taint set");
        }
      }
      if (Q) markSessionVerdictUnattributed();
      else dropPolicyTaintHints(s.stampAtWire);
      if (Q || s.lossyComplianceTaints) setSessionCacheAsPriorEvidence(ee);
      else setSessionCache(ee);
      noteSessionBodyReceived(now_4);
      noteSessionVerdictEnvBearer(Q ? null : (s.sentEnvBearerDigest ?? null));
      this.settleTunnelCredentialEpoch(s.tunnelCredentialEpoch);
      this.serverConfirmedGeneration = sessionGeneration;
      this.onLiveVerdict(r);
      this.recordVerdictPrincipal(policyPrincipal);
      j({
        success: true,
        host: te,
      });
      let diskAdoptionEpoch_2 = getDiskAdoptionEpoch();
      let Ae = Q
        ? "stale"
        : await this.saveCachedResponse(
            ee,
            sessionGeneration,
            ee === response ? s.signature : undefined,
            policyPrincipal,
            s.lossyComplianceTaints ? "prior_evidence" : "confirmed",
          );
      recordManagedConfigResult("policy", Re);
      if (
        Ae === "skipped" &&
        !isPersistablePrincipal(policyPrincipal) &&
        !Q &&
        !isPolicyCacheMemoryOnly() &&
        p !== null &&
        A !== undefined &&
        getLastPolicyCacheStampVerdict() === "legacy" &&
        A !== checksumOfServerResponse(ee)
      )
        await this.removeSupersededLegacyBody(p, A);
      if (this.sessionGeneration !== sessionGeneration) {
        if (Ae !== "stale" && Ae !== "skipped") {
          let L = await this.deleteCacheFile();
          suppressDiskAdoption();
          if (!L)
            logForDebugging(
              "Policy limits: could not remove a dead fetch's cache write; disk adoption suppressed until the next save",
            );
        }
        this.dropUnconfirmedSessionCache();
        if (o && this.startupLoadState === "succeeded") {
          this.startupLoadState = "failed";
          this.startupLoadErrorCode = "session_changed";
          this.startupLoadCredentialState = undefined;
          this.startupLoadHttpStatus = undefined;
          this.startupLoadServerErrorType = undefined;
          this.startupLoadServerErrorCode = undefined;
          this.startupLoadServerAuthDenial = undefined;
          this.startupLoadLastAttempt = undefined;
        }
        logFeatureSad(e, "cycle_aborted");
        return getSessionCache();
      }
      if (Ae === "saved" && getDiskAdoptionEpoch() === diskAdoptionEpoch_2) liftDiskAdoptionSuppression();
      logForDebugging(
        Object.keys(ee.restrictions).length > 0
          ? "Policy limits: Applied new restrictions successfully"
          : "Policy limits: No restrictions (cached empty)",
      );
      if (s.lossyComplianceTaints) logFeatureSad(e, "lossy_compliance_taints");
      else logFeatureOk(e);
      return ee;
    } catch {
      let s = this.sessionGeneration !== sessionGeneration;
      let ce = X && !I;
      if (ce && e === "policy_limits_load" && !s)
        this.latestLoad = {
          succeeded: false,
          errorCode: undefined,
          credentialState: undefined,
          httpStatus: undefined,
          serverErrorType: undefined,
          serverErrorCode: undefined,
          serverAuthDenial: undefined,
        };
      if (o && (this.startupLoadState === "in_flight" || ce)) {
        this.startupLoadState = "failed";
        this.startupLoadErrorCode = s ? "session_changed" : "unexpected_error";
        this.startupLoadCredentialState = undefined;
        this.startupLoadOutcomeReason = undefined;
        this.startupLoadHttpStatus = undefined;
        this.startupLoadServerErrorType = undefined;
        this.startupLoadServerErrorCode = undefined;
        this.startupLoadServerAuthDenial = undefined;
        this.startupLoadLastAttempt = undefined;
      }
      recordManagedConfigResult("policy", {
        source: s ? "superseded" : "error",
        hadCache: p !== null,
        awaited: n,
      });
      if (s || signal.aborted) {
        logFeatureSad(e, "cycle_aborted");
        return getSessionCache();
      }
      if (!I) U();
      let ue = this.staleFallbackSource();
      if (ue) {
        logForDebugging("Policy limits: Using stale cache after error");
        let ve = mergeUnknownTaints(ue);
        installDiskDerivedVerdict(ve);
        this.disposeVerdictlessRetryTimer();
        if (!this.hasLiveVerdict()) this.noteUnverifiedCycle("unexpected_error", true);
        logFeatureSad(e, "stale_cache_used");
        return ve;
      }
      this.noteUnverifiedCycle("unexpected_error", false);
      logFeatureBad(e, "unexpected_error");
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
    let r = VERDICTLESS_RETRY_DELAYS_MS[verdictlessRetryStep];
    if (r === undefined || !isPolicyLimitsEligible()) return false;
    this.verdictlessRetryStep = verdictlessRetryStep + 1;
    let rounded = Math.round(r * (1 - RETRY_JITTER_RATIO + 2 * RETRY_JITTER_RATIO * Math.random()));
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
    let r = onPrefetchChanged(() => {
      queueMicrotask(() => {
        if (this.stopNetworkWatch !== r) return;
        try {
          this.kickOnNetworkSuccess(sessionGeneration);
        } catch (error) {
          logError(error);
        }
      });
    });
    this.stopNetworkWatch = r;
  }
  disarmNetworkKick() {
    this.stopNetworkWatch?.();
    this.stopNetworkWatch = null;
  }
  kickOnNetworkSuccess(e) {
    if (this.sessionGeneration !== e) {
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
  onLiveVerdict(e) {
    this.resetAcceleratedRecovery();
    let verdictlessEpisode = this.verdictlessEpisode;
    if (verdictlessEpisode === null) return;
    this.verdictlessEpisode = null;
    let now_2 = Date.now();
    let o = normalizeRecoverySource(e);
    let errorCode = verdictlessEpisode.errorCode;
    logEvent("tengu_policy_limits_verdict_recovered", {
      ms_since_startup: now_2 - now,
      ms_verdictless: now_2 - verdictlessEpisode.sinceMs,
      recovered_by: fromEnum(o),
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
    let r = ineligibleReason === undefined;
    let eligibleIfBaseUrlGateRemoved =
      ineligibleReason === "custom_base_url"
        ? getPolicyLimitsIneligibleReason({
            skipBaseUrlCheck: true,
          }) === undefined
        : r;
    let o = getResponseFromCache() !== null;
    let u = r ? cacheAgeMs() : undefined;
    let p = this.hasLiveVerdict();
    let h = {
      ineligibleReason,
      eligible: r,
      eligibleIfBaseUrlGateRemoved,
      hasCache: o,
      cacheAgeMs: u,
      liveVerdict: p,
      wouldFailClosed:
        r &&
        !p &&
        (!o ||
          (getPolicyLimitsTunnelSocket() === undefined && (u ?? 1 / 0) > FAIL_CLOSED_SHADOW_CACHE_TTL_MS)),
      loadState: this.startupLoadState,
      loadFromEarlierGeneration:
        this.startupLoadClaimed && this.startupLoadGeneration !== this.sessionGeneration,
      loadErrorCode: this.startupLoadErrorCode,
      loadCredentialState: this.startupLoadCredentialState,
      loadOutcomeReason: r
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
    this.gateSnapshotThisRun = h;
    queueMicrotask(() => {
      this.gateSnapshotThisRun = undefined;
    });
    return h;
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
    let e = this.policyGateSnapshot();
    let r = connectionTelemetry();
    return {
      policy_ineligible_reason: fromEnumOpt(e.ineligibleReason),
      policy_eligible_if_base_url_gate_removed: e.eligibleIfBaseUrlGateRemoved,
      policy_cache_age_ms: e.cacheAgeMs,
      policy_would_fail_closed: e.wouldFailClosed,
      policy_live_verdict: e.liveVerdict,
      policy_load_state: fromEnum(e.loadState),
      policy_error_code: fromEnumOpt(e.loadErrorCode),
      policy_credential_state: fromEnumOpt(e.loadCredentialState),
      policy_outcome_reason: fromEnumOpt(e.loadOutcomeReason),
      policy_has_auth_token: r.has_auth_token,
      policy_has_api_key_helper: r.has_api_key_helper,
      policy_has_custom_base_url: r.has_custom_base_url,
      policy_api_provider: fromEnum(getAPIProvider()),
      policy_http_status: e.loadHttpStatus,
      policy_server_error_type: fromEnumOpt(e.loadServerErrorType),
      policy_server_error_code: fromEnumOpt(e.loadServerErrorCode),
      policy_server_auth_denial: fromEnumOpt(e.loadServerAuthDenial),
    };
  }
  logCacheStateAtFirstPrompt() {
    if (this.firstPromptStateLogged) return;
    this.firstPromptStateLogged = true;
    let e = this.policyGateSnapshot();
    let errorReportingGate = fromEnum(errorReportingPolicyState());
    logEvent("tengu_policy_limits_cache_state_at_first_prompt", {
      eligible: e.eligible,
      ineligible_reason: fromEnumOpt(e.ineligibleReason),
      eligible_if_base_url_gate_removed: e.eligibleIfBaseUrlGateRemoved,
      has_cache: e.hasCache,
      cache_age_ms: e.cacheAgeMs,
      would_fail_closed: e.wouldFailClosed,
      live_verdict: e.liveVerdict,
      token_source: fromEnum(authTokenSourceLabel()),
      credential_road: fromEnum(settingsAuthSource()),
      ...connectionTelemetry(),
      ms_since_startup: Date.now() - now,
      load_state: fromEnum(e.loadState),
      startup_fetch_error_code: fromEnumOpt(e.loadErrorCode),
      startup_credential_state: fromEnumOpt(e.loadCredentialState),
      outcome_reason: fromEnumOpt(e.loadOutcomeReason),
      startup_await_result: fromEnum(e.awaitResult),
      error_reporting_gate: errorReportingGate,
    });
  }
  async load({ startupAwaited: e = false, singleAttempt: r = false } = {}) {
    if (r && this.cyclesInFlight > 0) {
      await Promise.allSettled([...this.unsettledCycles]);
      return;
    }
    return this.loadFor(r ? "accelerated_retry" : "load", e);
  }
  async loadFor(e, r = false) {
    this.used = true;
    this.ensureCredentialWatch();
    if (isPolicyLimitsEligible() && !this.loadingCompletePromise)
      this.loadingCompletePromise = new Promise((resolve) => {
        this.loadingCompleteResolve = resolve;
      });
    let loadingCompleteResolve = this.loadingCompleteResolve;
    try {
      await this.fetchAndLoad("policy_limits_load", e, r);
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
  async refresh({ observedBoundary: e = false } = {}) {
    this.used = true;
    this.stop();
    this.ensureCredentialWatch();
    this.initializeLoadingPromise();
    let r = isPolicyLimitsEligible();
    if (e) await this.removeUnstampedBody();
    else if (!(await this.deleteCacheFile()))
      logForDebugging(
        "Policy limits: could not remove the previous account's cache; disk adoption stays suppressed",
      );
    this.dropUnconfirmedSessionCache();
    if (!r) return;
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
  recordFetchOutcome(e, r, n, o, u) {
    if (this.sessionGeneration === e && this.cacheClearEpoch === r) setLastFetchOutcome(n, o, u);
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
    let n = mergeHipaaEvidence(policyStamp, getHeldHipaaEvidence());
    if (n.seen.length === 0 && !n.incomplete) await removeCacheStamp(getCachePath());
    else await writeCacheStampSafe(getCachePath(), buildTokenStamp(n));
    return true;
  }
  recordVerdictPrincipal(e) {
    if (e === null || isClassifiedPrincipal(e)) {
      this.verdictPrincipalIdentity = e === null ? null : identityDigestOfDescriptor(e);
      this.verdictPrincipalKind = e === null ? null : e.kind;
      this.verdictKey = e === null ? null : policyCacheKey(e);
      if (e !== null) this.askedKey = null;
    } else this.verdictKey = policyCacheKey(e);
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
    let r =
      this.regimeRefusalRefetchStartedAtMs === undefined
        ? undefined
        : now - this.regimeRefusalRefetchStartedAtMs;
    let n = r === undefined || r < 0 || r >= REGIME_REFUSAL_REFETCH_MIN_INTERVAL_MS;
    if (n) {
      this.regimeRefusalRefetchStartedAtMs = now;
      logForDebugging(
        "Policy limits: the API refused a request for an organization policy this session has not loaded \u2014 re-fetching it now",
      );
    }
    this.regimeRefusalRefetch = withDeadline(
      (n ? this.poll("api_refusal_trigger") : Promise.resolve()).then(() =>
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
  onTunnelCredentialEpoch = (e) => {
    this.observeTunnelCredentialEpoch(e, "a model response", true);
  };
  observeTunnelCredentialEpoch(tunnelEpochHeard, r, n) {
    if (tunnelEpochHeard === undefined || getPolicyLimitsTunnelSocket() === undefined) return;
    let o = this.tunnelEpochSeen !== undefined;
    if (this.tunnelEpochSeen === undefined || tunnelEpochHeard > this.tunnelEpochSeen) {
      this.tunnelEpochSeen = tunnelEpochHeard;
      noteTunnelEpochHeard(tunnelEpochHeard);
    }
    if (this.tunnelVerdictEpoch !== undefined && tunnelEpochHeard <= this.tunnelVerdictEpoch) return;
    if (!o && this.tunnelVerdictEpoch === undefined) return;
    let u = getSessionCache() !== null;
    let p = n && this.tunnelRepolledForEpoch !== this.tunnelEpochSeen && this.cyclesInFlight === 0;
    if (!u && !p) return;
    logForDebugging(
      `Policy limits: the claude ssh launcher injects a different credential than the one this policy was fetched with (${r}); ${u ? "withholding client-only keys" : "no verdict held"}${p ? ", re-polling" : ""}`,
    );
    if (u) markSessionVerdictUnattributed();
    if (p) {
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
  isStaleTunnelCredentialEpoch(e) {
    return (
      e !== undefined &&
      this.tunnelEpochSeen !== undefined &&
      e < this.tunnelEpochSeen &&
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
  async checkPrincipal(e = "credential_change") {
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
    let n = envBearerVerdictOnWire();
    if (n === "replaced" && isHostManagedProviderAuth()) return this.askAsHostManagedEnvBearer(e);
    if (n === "replaced" || n === "gone") {
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
        let E = principalCacheKeyWithBearer(policyPrincipal);
        if (E !== this.askedKey) {
          logForDebugging(
            "Policy limits: the stored login in use is not the one the loaded policy was fetched with, and its account record has not settled; asking the server with it (keyed on the token until the record settles)",
          );
          return this.repollFor(policyPrincipal, E, "unattributed", e);
        }
      }
      if (
        policyPrincipal === null &&
        n === null &&
        isHostManagedAnthropicApiBearer() &&
        isPolicyLimitsEligible()
      )
        return this.askAsHostManagedEnvBearer(e);
      return "unchanged";
    }
    let u = identityDigestOfDescriptor(policyPrincipal);
    let p = this.verdictPrincipalKind === "token" && policyPrincipal.kind === "token";
    if (this.verdictPrincipalIdentity !== null && u !== this.verdictPrincipalIdentity && !p) {
      if (isSteadyMarshmallowOn()) {
        let E = principalCacheKeyWithBearer(policyPrincipal);
        let R = this.cyclesInFlight > 0;
        if (R && E === this.askedKey) {
          this.principalCheckOwed = true;
          return "unchanged";
        }
        if (!R && E !== this.askedKey) {
          logForDebugging(
            `Policy limits: the credential now belongs to a different principal than the loaded policy; ${TENGU_STEADY_MARSHMALLOW} keeps the loaded verdict while the new principal's policy is fetched`,
          );
          logEvent("tengu_policy_limits_principal_changed", {
            next_kind: fromEnum(policyPrincipal.kind),
            reason: fromEnum("identity_kept"),
          });
          this.askedKey = E;
          this.fetchAcrossBoundaryKeepingVerdict(e).catch((error) => logError(error));
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
    let h = policyCacheKey(policyPrincipal);
    let y = principalCacheKeyWithBearer(policyPrincipal);
    if (y === this.askedKey) return "unchanged";
    if (this.verdictPrincipalIdentity === null) {
      if (getSessionCache() === null) {
        if (!isPolicyLimitsEligible() || this.loadingCompleteResolve !== null) return "unchanged";
        this.askedKey = y;
        this.releaseLoadingPromise();
        this.initializeLoadingPromise();
        this.loadFor(e).catch((error) => logError(error));
        return "started";
      }
      return this.repollFor(policyPrincipal, y, "unattributed", e);
    }
    if (h !== this.verdictKey) {
      let E =
        (policyPrincipal.admitsOnly === true) !==
        (this.verdictKey?.endsWith(ADMITS_ONLY_KEY_SUFFIX) ?? false);
      let R = E
        ? policyPrincipal.admitsOnly === true
          ? "snapshot_fallback"
          : "store_restored"
        : policyPrincipal.bearerDigest !== undefined || p
          ? "bearer"
          : "reclassified";
      logForDebugging(
        E
          ? `Policy limits: the login moved between the credential store and the daemon's snapshot of it (${R}); keeping the verdict and re-polling`
          : "Policy limits: a new bearer for the loaded policy (a declared organization's new bearer, one keyed on itself replacing another, a healed store); keeping the verdict and re-polling",
      );
      return this.repollFor(policyPrincipal, y, R, e);
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
  askAsHostManagedEnvBearer(e) {
    if (this.cyclesInFlight > 0) {
      this.principalCheckOwed = true;
      return "unchanged";
    }
    let r = envBearerCacheKey(tokenDigest(effectiveAuthTokenEnv() ?? ""));
    if (r === this.askedKey) return "unchanged";
    if (getSessionCache() !== null) {
      this.askedKey = r;
      logEvent("tengu_policy_limits_principal_changed", {
        next_kind: fromEnum("none"),
        reason: fromEnum("bearer"),
      });
      this.fetchAndLoad("policy_limits_poll", e).catch((error) => logError(error));
      return "repolled";
    }
    if (this.loadingCompleteResolve !== null) return "unchanged";
    this.askedKey = r;
    this.releaseLoadingPromise();
    this.initializeLoadingPromise();
    this.loadFor(e).catch((error) => logError(error));
    return "started";
  }
  repollFor(e, askedKey, n, o) {
    this.askedKey = askedKey;
    logEvent("tengu_policy_limits_principal_changed", {
      next_kind: fromEnum(e.kind),
      reason: fromEnum(n),
    });
    this.fetchAndLoad("policy_limits_poll", o).catch((error) => logError(error));
    return "repolled";
  }
  async fetchAcrossBoundaryKeepingVerdict(e) {
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
        await this.fetchAndLoad("policy_limits_poll", e).catch((error) => logError(error));
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
  async poll(e = "hourly_poll") {
    if (!isPolicyLimitsEligible()) return;
    let sessionCache = getSessionCache();
    let n = sessionCache ? jsonStringify(sessionCache) : null;
    try {
      if ((await this.checkPrincipal(e)) !== "unchanged") return;
      if (this.cyclesInFlight > 0) return;
      await this.fetchAndLoad("policy_limits_poll", e);
      let sessionCache = getSessionCache();
      if ((sessionCache ? jsonStringify(sessionCache) : null) !== n)
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
//@ chunk-7t4fmt2f.js:63095-63119 placement
class DefaultPolicyLimitsClientSlot {
  client = undefined;
}
//@ chunk-7t4fmt2f.js:63119-63146 placement
var defaultPolicyLimitsClientSlots = new HostScoped(() => new DefaultPolicyLimitsClientSlot());
//@ chunk-7t4fmt2f.js:63146-63184 placement
function policyLimitsClientSlots() {
  return defaultPolicyLimitsClientSlots.of(getRootSession().host);
}
//@ chunk-7t4fmt2f.js:63184-63243 placement
function getPolicyLimitsClient() {
  let e = policyLimitsClientSlots();
  e.client ??= new PolicyLimitsClient();
  return e.client;
}
//@ chunk-7t4fmt2f.js:63243-63931 placement
function composePolicyLimitsClient(e) {
  let r = policyLimitsClientSlots();
  if (r.client === undefined) {
    r.client = new PolicyLimitsClient(e);
    return;
  }
  let n = r.client.adoptStartupServices(e);
  switch (n) {
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
//@ chunk-7t4fmt2f.js:63931-63979 placement
function _recordPolicyLimitsStartupAwaitResultForTesting(e) {
  getPolicyLimitsClient().recordStartupAwaitResult(e);
}
//@ chunk-7t4fmt2f.js:63979-64180 placement
async function awaitPolicyLimitsColdStartVerdict() {
  let since = performance.now();
  let r;
  try {
    let policyLimitsClient = getPolicyLimitsClient();
    policyLimitsClient.ensureLoadRequested({
      startupAwaited: true,
    });
    r = await policyLimitsClient.awaitColdStartVerdict();
  } catch (error) {
    logError(error);
    r = "timed_out";
  }
  recordLoadBarrier("policy", r, {
    since,
  });
  return r;
}
//@ chunk-7t4fmt2f.js:64180-64224 placement
function didPolicyLimitsColdStartTimeOut() {
  return getPolicyLimitsClient().coldStartTimedOut;
}
//@ chunk-7t4fmt2f.js:64224-64265 placement
function getPolicyLimitsGateSnapshot() {
  return getPolicyLimitsClient().gateSnapshot();
}
//@ chunk-7t4fmt2f.js:64265-64312 placement
function getPolicyLimitsColdStartWait() {
  return getPolicyLimitsClient().coldStartVerdictWait;
}
//@ chunk-7t4fmt2f.js:64312-64427 placement
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
//@ chunk-7t4fmt2f.js:64427-64591 placement
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
//@ chunk-7t4fmt2f.js:64591-64617 placement
function _getDefaultPolicyLimitsClientForTesting() {
  return getPolicyLimitsClient();
}
//@ chunk-7t4fmt2f.js:64617-64704 placement
async function _awaitPolicyLimitsCyclesForTesting() {
  let client = policyLimitsClientSlots().client;
  if (client !== undefined) await client._settleCyclesForTesting();
}
//@ chunk-7t4fmt2f.js:64704-64779 placement
function _resetPolicyLimitsForTesting() {
  getPolicyLimitsClient().stop();
  liftDiskAdoptionSuppression();
  policyLimitsClientSlots().client = undefined;
  skillChangeDetector();
  _resetRememberedCoreSkillsForTesting();
  clearLockHolderSocket();
  _resetMachinePinsSignInForTesting();
}
//@ chunk-7t4fmt2f.js:64779-64825 placement
function initializePolicyLimitsLoadingPromise() {
  getPolicyLimitsClient().initializeLoadingPromise();
}
//@ chunk-7t4fmt2f.js:64825-64888 placement
function serverErrorCodeOf(e) {
  return stampedServerErrorType(e) !== undefined ? e.serverErrorCode : undefined;
}
//@ chunk-7t4fmt2f.js:64888-64952 placement
function serverAuthDenialOf(e) {
  return stampedServerErrorType(e) !== undefined ? e.serverAuthDenial : undefined;
}
//@ chunk-7t4fmt2f.js:64952-64995 placement
function getPolicyLimitsSignatureFacts() {
  return getPolicyLimitsClient().signatureFacts();
}
//@ chunk-7t4fmt2f.js:64995-65034 placement
function waitForPolicyLimitsToLoad() {
  return getPolicyLimitsClient().waitForLoad();
}
//@ chunk-7t4fmt2f.js:65034-65082 placement
function logPolicyLimitsCacheStateAtFirstPrompt() {
  getPolicyLimitsClient().logCacheStateAtFirstPrompt();
}
//@ chunk-7t4fmt2f.js:65082-65128 placement
function admitPrefetchedPolicyLimits(e) {
  return getPolicyLimitsClient().admitPrefetched(e);
}
//@ chunk-7t4fmt2f.js:65128-65195 placement
function isSessionVerdictOfLiveCredential() {
  return policyLimitsClientSlots().client?.isVerdictOfLiveCredential() ?? false;
}
//@ chunk-7t4fmt2f.js:65195-65233 placement
function loadPolicyLimits(e = {}) {
  return getPolicyLimitsClient().load(e);
}
//@ chunk-7t4fmt2f.js:65233-65263 placement = skillSearchModules (1)
function prefetchPolicyLimits() {
  getPolicyLimitsClient().prefetch();
}
//@ chunk-7t4fmt2f.js:65263-65299 placement
function refreshPolicyLimits() {
  return getPolicyLimitsClient().refresh();
}
//@ chunk-7t4fmt2f.js:65299-65338 placement
function clearPolicyLimitsCache() {
  return getPolicyLimitsClient().clearCache();
}
//@ chunk-7t4fmt2f.js:65338-65382 placement
function startBackgroundPolling() {
  getPolicyLimitsClient().startBackgroundPolling();
}
//@ chunk-7t4fmt2f.js:65382-65425 placement
function stopBackgroundPolling() {
  getPolicyLimitsClient().stopBackgroundPolling();
}
//@ chunk-7t4fmt2f.js:65425-65451 placement
function stopPolicyLimits() {
  getPolicyLimitsClient().stop();
}
//@ chunk-7t4fmt2f.js:65451-65467 placement
var UNCLASSIFIED_RECHECK_DELAY_MS = UNCLASSIFIED_ORIGIN_MEMO_MS + 1000;
//@ chunk-7t4fmt2f.js:65467-65519 placement
function isClassifiedPrincipal(policyPrincipal) {
  return policyPrincipal !== null && policyPrincipal.unclassified !== true;
}
//@ chunk-7t4fmt2f.js:65519-65541 placement
var ADMITS_ONLY_KEY_SUFFIX = ":admits-only";
//@ chunk-7t4fmt2f.js:65541-65661 placement
function policyCacheKey(policyPrincipal) {
  let r = identityDigestOfDescriptor(policyPrincipal);
  let n = policyPrincipal.bearerDigest === undefined ? r : `${r}:${policyPrincipal.bearerDigest}`;
  return policyPrincipal.admitsOnly === true ? `${n}${ADMITS_ONLY_KEY_SUFFIX}` : n;
}
//@ chunk-7t4fmt2f.js:65661-65713 placement
function currentPolicyCacheKey() {
  let policyPrincipal = getPolicyPrincipal();
  return policyPrincipal === null ? null : policyCacheKey(policyPrincipal);
}
//@ chunk-7t4fmt2f.js:65713-65752 placement
function envBearerCacheKey(e) {
  return `env-bearer:${e}`;
}
//@ chunk-7t4fmt2f.js:65752-65823 placement
function principalCacheKeyWithBearer(policyPrincipal) {
  let accessToken = getClaudeAIOAuthTokens()?.accessToken;
  return `${policyCacheKey(policyPrincipal)}#${accessToken ? tokenDigest(accessToken) : ""}`;
}
export {
  refreshPolicyLimits,
  waitForPolicyLimitsToLoad,
  getPolicyLimitsSignatureFacts,
  shouldAwaitPolicyLimitsOnStartup,
  loadPolicyLimits,
  didPolicyLimitsColdStartTimeOut,
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
  logPolicyLimitsCacheStateAtFirstPrompt,
  awaitPolicyLimitsColdStart,
  ensurePolicyLimitsLoadRequested,
  getPolicyLimitsColdStartWait,
  POLICY_LIMITS_COLD_AWAIT_MS,
  clearPolicyLimitsCache,
  composePolicyLimitsClient,
  primePolicyLimitsCache,
  initializePolicyLimitsLoadingPromise,
  registerManagedConfigPrefetchEnabledReader,
  prefetchPolicyLimits,
  getPolicyLimitsGateSnapshot,
  isSessionVerdictOfLiveCredential,
  awaitPolicyLimitsColdStartVerdict,
  fetchPolicyLimitsForBearer,
};
