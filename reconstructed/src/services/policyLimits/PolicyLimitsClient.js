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
import { et, Ot } from "./prefetchToggle.js";
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
  MRt,
  R5e,
  countDroppedComplianceTaints,
  hasComplianceTaint,
} from "./complianceTaints.js";
import {
  L7r,
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
import { pw } from "../../utils/localhost.js";
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
import { PrefetchSlot, Ue, recordManagedConfigResult, oat } from "./startupGate.js";
import { withTimeout, withDeadline } from "../../utils/sleep.js";
import {
  qfs,
  saveSignedCacheJws,
  BIn,
  trustedPrincipal,
  cacheTrustAnswer,
  y_r,
  __r,
} from "../../utils/settings/policyCertificates.js";
import { logError } from "../../utils/log.js";
import {
  kur,
  readPolicyStamp,
  Tur,
  nextHipaaEvidence,
  mergeHipaaEvidence,
  U7r,
  stampToHipaaEvidence,
  writeCacheStampSafe,
  eEe,
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
  kio,
  Exi,
  TENGU_STEADY_MARSHMALLOW,
} from "../../utils/settings/settingsSourceTrust.js";
import { describeMdmSettingsState } from "../../utils/settings/mdm/settings.js";
import { getRootSession } from "../../bootstrap/state.js";
import { stampedServerErrorType, mt } from "../api/errorUtils.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../analytics/featureTelemetry.js";
import {
  classifyAuthOutcome,
  settingsFetchOutcome,
  notAttemptedReason,
} from "../analytics/authOutcomeTelemetry.js";
import { settingsAuthSource, startInteractionAwarePoll } from "../remoteManagedSettings/fetchSupport.js";
import { errorReportingPolicyState } from "../errorReportingGate.js";
import { W3t, Hwi } from "../../utils/auth/credentialEpoch.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { skillChangeDetector } from "../../utils/skills/skillChangeDetector.js";
import { Nwi } from "../../utils/auth/lockHolderLiveness.js";

//@ chunk-7t4fmt2f.js:14376-14397 placement
function registerManagedConfigPrefetchEnabledReader(e) {
  et = e;
}
//@ chunk-7t4fmt2f.js:14397-14495 placement
var tt = 1e4,
  POLICY_LIMITS_FIRST_ATTEMPT_WAIT_MS = tt + 2000,
  Ht = 5,
  mi = 3600000,
  Ft = [15000, 15000, 30000, 60000, 180000, 600000],
  Mt = 0.2,
  gi = 60000;
//@ chunk-7t4fmt2f.js:14495-14549 placement
function isShimmyingStardustGateOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_shimmying_stardust", !1);
}
//@ chunk-7t4fmt2f.js:14549-14563 placement
var PREFETCHED_POLICY_LIMITS_MAX_AGE_MS = 60000;
//@ chunk-7t4fmt2f.js:14563-14606 placement
function yi(e) {
  return e === "load" ? "other" : e;
}
//@ chunk-7t4fmt2f.js:14606-14706 placement
function isAcceleratedTrigger(e) {
  return e === "accelerated_retry" || e === "api_success_trigger" || e === "api_refusal_trigger";
}
//@ chunk-7t4fmt2f.js:14706-14741 placement
var _i = 30000,
  POLICY_LIMITS_COLD_AWAIT_MS = 5000,
  FAIL_CLOSED_SHADOW_CACHE_TTL_MS = 86400000;
//@ chunk-7t4fmt2f.js:14741-14828 placement
function revalidationChecksumForPolicy(e, r) {
  let n = e || void 0;
  if (!isPolicyGraceEnabled()) return n;
  return keepIfFresh(n, r ?? (isDiskCacheForeign() ? vi() : cacheAgeMs()));
}
//@ chunk-7t4fmt2f.js:14828-15008 placement
function cacheAgeMs() {
  if (isDiskCacheForeign()) return;
  let e = getPersistedPolicyCacheConfirmedAt();
  if (e !== null) {
    let r = Date.now() - e;
    return r >= 0 ? r : void 0;
  }
  try {
    let r = Date.now() - Math.trunc(statSync(getCachePath()).mtimeMs);
    return r >= 0 ? r : void 0;
  } catch {
    return;
  }
}
//@ chunk-7t4fmt2f.js:15008-15093 placement
function vi() {
  let e = getSessionBodyReceivedAt();
  if (e === null) return;
  let r = Date.now() - e;
  return r >= 0 ? r : void 0;
}
//@ chunk-7t4fmt2f.js:15093-15111 placement
var now = Date.now();
//@ chunk-7t4fmt2f.js:15111-15351 placement
function mergeUnknownTaints(e) {
  let r = getSessionCache();
  if (!r) return e;
  latchComplianceTaintsBustingBetas(e.compliance_taints);
  let sliced = uniq([
    ...r.compliance_taints,
    ...e.compliance_taints.filter((compliance_taint) => !isKnownTaint(compliance_taint)),
  ]).slice(0, MRt);
  if (sliced.length === r.compliance_taints.length) return r;
  return { ...r, compliance_taints: sliced };
}
//@ chunk-7t4fmt2f.js:15351-15419 placement
function Wt() {
  return L7r(getPolicyLimitsTunnelSocket() ? "http://localhost" : getOauthConfig().BASE_API_URL);
}
//@ chunk-7t4fmt2f.js:15419-15445 placement
function it() {
  return Wt();
}
//@ chunk-7t4fmt2f.js:15445-15571 placement
function policyEndpointHost() {
  if (getPolicyLimitsTunnelSocket()) return "local machine (via claude ssh tunnel)";
  try {
    return new URL(it()).host;
  } catch {
    return "unknown host";
  }
}
//@ chunk-7t4fmt2f.js:15571-15604 placement
function re(e) {
  return computeChecksum(serverBodyOf(e));
}
//@ chunk-7t4fmt2f.js:15604-15645 placement
function shouldAwaitPolicyLimitsOnStartup() {
  return isPolicyLimitsEligible() && loadCachedResponse() === null;
}
/**
 * 策略请求使用的鉴权类型（api_key/oauth/wif）。
 */
//@ chunk-7t4fmt2f.js:15645-16103 placement
function policyAuthKind() {
  if (getPolicyLimitsTunnelSocket())
    return { authType: env.CLAUDE_CODE_OAUTH_TOKEN ? "oauth" : "api_key", apiKeyFromHelper: !1 };
  let e = null,
    r = "none";
  try {
    let u = getAnthropicApiKeyWithSource({ skipRetrievingKeyFromApiKeyHelper: !0 });
    ((e = u.key), (r = u.source));
  } catch {}
  let n = r === "apiKeyHelper",
    o = Boolean(e) || n;
  if (!o && shouldUseWIFAuth()) return { authType: "wif", apiKeyFromHelper: !1 };
  if (isClaudeAISubscriber() && getClaudeAIOAuthTokens()?.accessToken)
    return { authType: "oauth", apiKeyFromHelper: !1 };
  return o ? { authType: "api_key", apiKeyFromHelper: n } : { authType: "oauth", apiKeyFromHelper: !1 };
}
//@ chunk-7t4fmt2f.js:16103-16348 placement
function credentialOriginLabel(e, r) {
  if (getPolicyLimitsTunnelSocket()) return "proxy";
  switch (e.authType) {
    case "api_key":
      return e.apiKeyFromHelper ? "helper_key" : "static_key";
    case "oauth":
      return r.sentStoredLogin === void 0 ? void 0 : r.sentStoredLogin ? "stored_login" : "injected_token";
    case "wif":
      return;
  }
}
//@ chunk-7t4fmt2f.js:16348-16455 placement
function authTokenSourceLabel() {
  if (getPolicyLimitsTunnelSocket()) return env.CLAUDE_CODE_OAUTH_TOKEN ? "CLAUDE_CODE_OAUTH_TOKEN" : "none";
  return getAuthTokenSource().source;
}
/**
 * 是否使用代理及是否回环。
 */
//@ chunk-7t4fmt2f.js:16455-16761 placement
function proxyTelemetry() {
  if (getPolicyLimitsTunnelSocket()) return { proxy_in_use: !1, proxy_is_loopback: !1 };
  let e,
    r = !1;
  try {
    ((e = getUsableProxyUrl()), (r = e !== void 0 && shouldBypassProxy(it())));
  } catch {
    return { proxy_in_use: !1, proxy_is_loopback: !1 };
  }
  if (e === void 0 || r) return { proxy_in_use: !1, proxy_is_loopback: !1 };
  let n = parseProxyUrl(e);
  return { proxy_in_use: !0, proxy_is_loopback: n !== void 0 && pw(n.hostname) };
}
//@ chunk-7t4fmt2f.js:21874-22472 placement
async function fetchPolicyLimitsForBearer(e, { timeoutMs: r = tt } = {}) {
  if (getAPIProvider() !== "firstParty" || !isActualFirstPartyAnthropicBaseUrl()) return null;
  try {
    let n = await fetchPolicyLimitsResponse({
      endpoint: Wt(),
      authHeaders: { Authorization: `Bearer ${e}`, "anthropic-beta": OAUTH_BETA_HEADER },
      timeoutMs: r,
      acceptAny2xx: !0,
    });
    if (n.kind === "not_modified")
      return (logForDebugging("Policy limits (bearer read): 304 to an unconditional request"), null);
    let o = projectPolicyLimitsBody(n.data);
    if (!o.success)
      return (
        logForDebugging(`Policy limits (bearer read): invalid response format \u2014 ${o.error.message}`),
        null
      );
    return o.data;
  } catch (error) {
    let { kind: kind, status: status, message: message } = classifyAxiosError(error);
    return (
      logForDebugging(
        `Policy limits (bearer read): fetch failed (${kind}${status ? ` ${status}` : ""}) \u2014 ${message}`,
      ),
      null
    );
  }
}
//@ chunk-7t4fmt2f.js:22472-22591 placement
function responseShapeField(e) {
  if (e === void 0) return "root";
  return e === "restrictions" || e === "compliance_taints" || e === "defaults" ? e : "other";
}
//@ chunk-7t4fmt2f.js:22591-22804 placement
function connectionTelemetry() {
  return {
    has_custom_base_url: hasCustomBaseUrlForAnalytics(),
    via_unix_socket: getPolicyLimitsTunnelSocket() !== void 0,
    has_unix_socket: env.ANTHROPIC_UNIX_SOCKET !== void 0,
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
function Ut(e) {
  return e !== void 0 && CACHE_IO_ERRORS.includes(e) ? e : "other";
}
//@ chunk-7t4fmt2f.js:22969-23000 placement
function be(e) {
  return Ut(getErrnoCode(e));
}
//@ chunk-7t4fmt2f.js:23000-23118 placement
function storageErrorIoCode(e) {
  let r = "telemetryCode" in e ? e.telemetryCode : void 0;
  return Ut(r === "UnexpectedAbsent" || r === ABSENTPARENT ? "ENOENT" : r);
}
//@ chunk-7t4fmt2f.js:23118-23165 placement
function Xe() {
  return STORAGE_SPACES.state("policy-limits");
}
//@ chunk-7t4fmt2f.js:23165-23180 placement
var Qe = 1048576;
//@ chunk-7t4fmt2f.js:23180-23695 placement
async function primePolicyLimitsCache(e) {
  if (!isStorageV5Enabled() || e === void 0 || !isPolicyLimitsEligible() || isPolicyCacheMemoryOnly()) return;
  try {
    let r = readPolicyCacheStampForAdmission(),
      read = await e.read([{ key: Xe(), offset: 0, length: Qe + 1 }]);
    if (!read.ok) {
      logForDebugging(`Policy limits: prime read failed: ${read.error.code}; raw cache read stays`);
      return;
    }
    let o = read.value.items[0];
    if (!o.found) {
      seedSessionCacheFromPrime(e, null);
      return;
    }
    if (o.totalBytes > Qe) {
      logForDebugging("Policy limits: prime skipped (oversize cache); raw cache read stays");
      return;
    }
    let u = parseCachedResponse(Buffer.from(o.value).toString("utf-8"));
    seedSessionCacheFromPrime(e, u === null ? null : admitCachedResponse(u, settleStampRead(r)));
  } catch (error) {
    logForDebugging(`Policy limits: prime failed: ${errorMessage(error)}`);
  }
}
/**
 * PolicyLimitsClient：组织策略限制（policy limits）客户端。持有存储与凭证，负责冷启动等待、预取结果接纳、OAuth 刷新闩锁、定时轮询与主体变化时重载，产出 fail-open/fail-closed 判定供启动门控和工具使用。
 */
//@ chunk-7t4fmt2f.js:23695-63095 placement
class PolicyLimitsClient {
  storageV5;
  credentials;
  used = !1;
  constructor(e = {}) {
    ((this.storageV5 = e.storageV5), (this.credentials = e.credentials));
  }
  adoptStartupServices(e) {
    if (e.storageV5 === void 0 && e.credentials === void 0) return "nothing to adopt";
    if (this.storageV5 !== void 0 || this.credentials !== void 0) return "already composed";
    if (this.used) return "already used";
    return ((this.storageV5 = e.storageV5), (this.credentials = e.credentials), "adopted");
  }
  oauthRefreshLatch = { attempted: !1, recoveries: { begun: 0, running: 0 } };
  prefetchSlot = new PrefetchSlot();
  renewOAuthRefreshLatch() {
    this.oauthRefreshLatch = {
      attempted: !1,
      lastOutcome: this.oauthRefreshLatch.lastOutcome,
      recoveries: { begun: 0, running: 0 },
    };
  }
  prefetch() {
    if (!isPolicyLimitsEligible()) return;
    let e = Ze();
    if (e === null) return;
    let r = isDiskAdoptionSuppressed() ? null : loadCachedResponse(),
      n = r === R5e ? null : r,
      o = n ? re(n) : void 0,
      { credentials: credentials, storageV5: storageV5, oauthRefreshLatch: oauthRefreshLatch } = this;
    this.prefetchSlot.set(
      {
        checksum: o,
        generation: this.sessionGeneration,
        diskEpoch: getDiskAdoptionEpoch(),
        endpointHost: policyEndpointHost(),
        storageV5: storageV5,
        credentials: credentials,
        principalKey: e,
      },
      (y) =>
        fetchPolicyLimits(
          o,
          isPolicyGraceEnabled() ? cacheAgeMs() : void 0,
          credentials,
          storageV5,
          oauthRefreshLatch,
          y,
        ),
      (y) => y.success || y.httpStatus === 404,
    );
  }
  poller = null;
  cleanupRegistered = !1;
  loadingCompletePromise = null;
  loadingCompleteResolve = null;
  loadingTimeoutId = null;
  abortController = new AbortController();
  firstPromptStateLogged = !1;
  cacheWriteFailureLogged = !1;
  sessionGeneration = 0;
  serverConfirmedGeneration = -1;
  verdictPrincipalIdentity = null;
  verdictKey = null;
  verdictPrincipalKind = null;
  askedKey = null;
  cyclesInFlight = 0;
  unsettledCycles = new Set();
  principalCheckOwed = !1;
  unclassifiedRecheckTimer = null;
  stopCredentialWatch = null;
  stopTunnelEpochWatch = null;
  stopRegimeRefusalWatch = null;
  stopKeyApprovalWatch = null;
  regimeRefusalRefetch = null;
  regimeRefusalRefetchStartedAtMs = void 0;
  tunnelEpochSeen = void 0;
  tunnelVerdictEpoch = void 0;
  tunnelRepolledForEpoch = void 0;
  principalCheckQueued = !1;
  signedCacheShadowChecked = !1;
  storedCopyShadow = void 0;
  storedCopyReported = !1;
  storedCopyAtStart = void 0;
  liveAnswer = void 0;
  livePrincipalChecked = !1;
  cacheClearEpoch = 0;
  verdictlessRetry = null;
  verdictlessRetryStep = 0;
  stopNetworkWatch = null;
  verdictlessEpisode = null;
  startupLoadState = "not_started";
  startupLoadClaimed = !1;
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
  coldStartFirstWaitAtMs = void 0;
  coldStartWaitedMs = 0;
  recordStartupAwaitResult(e) {
    this.startupAwaitResult = e;
  }
  get coldStartTimedOut() {
    return this.startupAwaitResult === "timed_out";
  }
  async awaitColdStartVerdict() {
    let startTime = performance.now();
    this.coldStartFirstWaitAtMs ??= startTime;
    let max = Math.max(0, Math.round(this.coldStartFirstWaitAtMs + POLICY_LIMITS_COLD_AWAIT_MS - startTime)),
      n;
    try {
      (await withTimeout(this.waitForLoad(), max, "policy_limits_cold_await"), (n = "completed"));
    } catch {
      n = "timed_out";
    }
    if (((this.coldStartWaitedMs += performance.now() - startTime), this.startupAwaitResult !== "timed_out"))
      this.recordStartupAwaitResult(n);
    return n;
  }
  get coldStartVerdictWait() {
    return this.coldStartFirstWaitAtMs === void 0
      ? null
      : { waitedMs: this.coldStartWaitedMs, firstAtMs: this.coldStartFirstWaitAtMs };
  }
  async admitPrefetched(e) {
    let r = (n) => (
      logForDebugging(`Policy limits: host prefetch not admitted (${n})`),
      { admitted: !1, refused: n }
    );
    try {
      if (!isPolicyLimitsEligible()) return r("ineligible");
      if (
        this.startupLoadClaimed ||
        this.cyclesInFlight > 0 ||
        this.serverConfirmedGeneration === this.sessionGeneration
      )
        return r("already_loading");
      if (this.prefetchAdmittedGeneration === this.sessionGeneration) return r("already_admitted");
      let n = getPolicyPrincipal();
      if (
        n === null ||
        n.kind !== "org" ||
        n.unclassified === !0 ||
        n.descriptor !== `org:${e.orgUuid.toLowerCase()}` ||
        n.bearerDigest === void 0 ||
        n.bearerDigest !== e.bearerDigest
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
      let h = p.data,
        sessionGeneration = this.sessionGeneration,
        E = getSessionCache() !== null;
      ((this.used = !0),
        (this.prefetchAdmittedGeneration = sessionGeneration),
        Ue(() => this.managedConfigPolicyGateFields()),
        setSessionCacheAsPriorEvidence(h),
        this.recordVerdictPrincipal(n));
      let R = getDiskAdoptionEpoch(),
        saveCachedResponse = await this.saveCachedResponse(
          h,
          sessionGeneration,
          qfs(e.signature),
          n,
          "prior_evidence",
        );
      if (this.sessionGeneration !== sessionGeneration) {
        if (
          (recordManagedConfigResult("policy", { source: "superseded", hadCache: E, awaited: !1 }),
          saveCachedResponse !== "stale" && saveCachedResponse !== "skipped")
        )
          (await this.deleteCacheFile(), suppressDiskAdoption());
        return (this.dropUnconfirmedSessionCache(), r("superseded"));
      }
      if (
        (recordManagedConfigResult("policy", { source: "cache", hadCache: E, awaited: !1 }),
        saveCachedResponse === "saved" && getDiskAdoptionEpoch() === R)
      )
        liftDiskAdoptionSuppression();
      return (
        logForDebugging(
          `Policy limits: admitted the host's prefetch as this session's prior-evidence verdict (${Object.keys(h.restrictions).length} restriction(s), ${h.compliance_taints?.length ?? 0} taint(s), persisted=${saveCachedResponse})`,
        ),
        { admitted: !0 }
      );
    } catch (error) {
      return (logError(error), r("error"));
    }
  }
  ensureLoadRequested(e) {
    let r =
      this.startupLoadClaimed &&
      this.startupLoadState === "not_started" &&
      !this.loadingCompletePromise &&
      isPolicyLimitsEligible();
    if (this.startupLoadClaimed && !r) return !1;
    return (this.initializeLoadingPromise(), this.load(e).catch((n) => logError(n)), !0);
  }
  stop() {
    if (
      (this.sessionGeneration++,
      (this.latestLoad = void 0),
      (this.gateSnapshotThisRun = void 0),
      this.prefetchSlot.clear(),
      (this.verdictPrincipalIdentity = null),
      (this.verdictPrincipalKind = null),
      (this.verdictKey = null),
      (this.askedKey = null),
      (this.cyclesInFlight = 0),
      (this.principalCheckOwed = !1),
      this.unclassifiedRecheckTimer !== null)
    )
      (clearTimeout(this.unclassifiedRecheckTimer), (this.unclassifiedRecheckTimer = null));
    (this.stopCredentialWatch?.(),
      (this.stopCredentialWatch = null),
      this.stopTunnelEpochWatch?.(),
      (this.stopTunnelEpochWatch = null),
      this.stopRegimeRefusalWatch?.(),
      (this.stopRegimeRefusalWatch = null),
      this.stopKeyApprovalWatch?.(),
      (this.stopKeyApprovalWatch = null),
      (this.regimeRefusalRefetchStartedAtMs = void 0),
      this.renewOAuthRefreshLatch(),
      suppressDiskAdoption(),
      forgetPersistedPolicyCache(),
      this.stopBackgroundPolling(),
      this.abortController.abort(),
      (this.abortController = new AbortController()),
      setSessionCache(null),
      setLastFetchOutcome(null),
      detachPolicyLimitsBackend(),
      this.releaseLoadingPromise());
  }
  releaseLoadingPromise() {
    if (
      (this.loadingCompleteResolve?.(),
      (this.loadingCompletePromise = null),
      (this.loadingCompleteResolve = null),
      this.loadingTimeoutId !== null)
    )
      (clearTimeout(this.loadingTimeoutId), (this.loadingTimeoutId = null));
  }
  initializeLoadingPromise() {
    if (this.loadingCompletePromise) return;
    if (isPolicyLimitsEligible())
      this.loadingCompletePromise = new Promise((e) => {
        ((this.loadingCompleteResolve = e),
          (this.loadingTimeoutId = setTimeout(
            (r) => {
              if (this.loadingCompleteResolve === r)
                (logForDebugging("Policy limits: Loading promise timed out, resolving anyway"),
                  this.loadingCompleteResolve(),
                  (this.loadingCompleteResolve = null));
            },
            _i,
            e,
          )));
      });
  }
  async waitForLoad() {
    if (this.loadingCompletePromise) await this.loadingCompletePromise;
  }
  async saveCachedResponse(e, r, n, o, u) {
    if (this.sessionGeneration !== r)
      return (
        logForDebugging("Policy limits: skipped saving a fetch that outlived the account session"),
        "stale"
      );
    if (isPolicyCacheMemoryOnly()) return "skipped";
    if (!kur(o))
      return (
        logForDebugging(
          "Policy limits: no server-attributable principal for this credential; the verdict is used for the session and not persisted",
        ),
        "skipped"
      );
    let p;
    try {
      p = await this.writeStampForSave(e, o, u);
    } catch (error) {
      return (
        this.recordCacheWriteFailure(error instanceof Error ? error.message : "unknown error", be(error)),
        "failed"
      );
    }
    if (p === null) return "failed";
    let h = re(e);
    if (isStorageV5Enabled() && this.storageV5 !== void 0) {
      let y, E;
      try {
        let write = await this.storageV5.write(Xe(), jsonStringify(serverBodyOf(e), null, 2), {
          publishDiscipline: "inPlace",
          mode: 384,
        });
        if (write.ok)
          return (
            logForDebugging(`Policy limits: Saved to ${getCachePath()}`),
            await saveSignedCacheJws(getCachePath(), n),
            await this.sealSavedBody(p, h)
          );
        ((y = formatStorageError(write.error)), (E = storageErrorIoCode(write.error)));
      } catch (error) {
        ((y = errorMessage(error)), (E = be(error)));
      }
      return (forgetPersistedPolicyCache(), this.recordCacheWriteFailure(y, E), "failed");
    }
    try {
      let y = getCachePath();
      (await writeFile(y, jsonStringify(serverBodyOf(e), null, 2), { encoding: "utf-8", mode: 384 }),
        logForDebugging(`Policy limits: Saved to ${y}`),
        await saveSignedCacheJws(y, n));
    } catch (error) {
      return (
        forgetPersistedPolicyCache(),
        this.recordCacheWriteFailure(error instanceof Error ? error.message : "unknown error", be(error)),
        "failed"
      );
    }
    return this.sealSavedBody(p, h);
  }
  async sealSavedBody(e, r) {
    try {
      await e.rewrite();
    } catch (error) {
      let o = await readPolicyStamp(getCachePath());
      if (
        (takeUpHipaaEvidenceLeftOnDisk(o),
        o.kind !== "ok" || o.stamp.identity !== e.identity || o.stamp.sha !== r)
      ) {
        if (o.kind !== "ok") {
          let diskBody = await this.readDiskBody();
          if (
            (diskBody.kind === "unreadable" || (diskBody.kind === "body" && diskBody.checksum === r)) &&
            !(await this.removeBodyLeavingStamp())
          ) {
            let h = await readPolicyStamp(getCachePath());
            if ((takeUpHipaaEvidenceLeftOnDisk(h), h.kind !== "ok")) await e.vouch();
          }
        }
        return (
          this.recordCacheWriteFailure(error instanceof Error ? error.message : "unknown error", be(error)),
          "failed"
        );
      }
    }
    return (recordPersistedPolicyCache(r, e.evidence, e.confirmedAt), "saved");
  }
  async readDiskBody() {
    let e = !1,
      r;
    try {
      r = await readSmallFileChecked(getFsImplementation(), getCachePath(), Qe, (o) => {
        e = o.isFile();
      });
    } catch (error) {
      return { kind: isENOENT(error) ? "none" : "unreadable" };
    }
    if (e) return { kind: "unreadable" };
    let n = r === null ? null : parseCachedResponse(r);
    return n === null ? { kind: "none" } : { kind: "body", checksum: re(n) };
  }
  async removeBodyLeavingStamp() {
    if (
      (forgetPersistedPolicyCache(),
      await BIn(getCachePath()),
      isStorageV5Enabled() && this.storageV5 !== void 0)
    )
      try {
        await this.storageV5.delete(Xe());
      } catch {}
    try {
      return (await unlink(getCachePath()), !0);
    } catch (error) {
      return isENOENT(error);
    }
  }
  async removeUnstampedBody() {
    if (isPolicyCacheMemoryOnly()) return;
    let e = await readPolicyStamp(getCachePath());
    if ((takeUpHipaaEvidenceLeftOnDisk(e), e.kind === "absent")) await this.removeBodyLeavingStamp();
  }
  async removeSupersededLegacyBody(e, r) {
    if (!isUnrestrictiveBody(e)) return;
    let n = await readPolicyStamp(getCachePath());
    if ((takeUpHipaaEvidenceLeftOnDisk(n), n.kind !== "absent")) return;
    let diskBody = await this.readDiskBody();
    if (diskBody.kind !== "body" || diskBody.checksum !== r) return;
    (logForDebugging(
      "Policy limits: removed an unstamped cache this credential cannot restamp after the server superseded it",
    ),
      await this.removeBodyLeavingStamp());
  }
  async writeStampForSave(e, r, n) {
    let o = getCachePath(),
      u = await readPolicyStamp(o);
    if ((takeUpHipaaEvidenceLeftOnDisk(u), Tur(u)))
      return (
        logForDebugging(
          `Policy limits: the cache stamp could not be read just now (${u.code}); nothing persisted this cycle`,
        ),
        null
      );
    let p = nextHipaaEvidence({
      principal: r,
      bodySha: re(e),
      confirmedAt: Date.now(),
      bodyTaints: e.compliance_taints,
      previous: mergeHipaaEvidence(u, getHeldHipaaEvidence()),
      authority: n,
    });
    return (
      await U7r(o, p),
      {
        identity: p.identity,
        evidence: stampToHipaaEvidence(p),
        confirmedAt: p.confirmed_at,
        rewrite: () => U7r(o, p),
        vouch: async () => {
          await writeCacheStampSafe(o, p);
        },
      }
    );
  }
  async restampConfirmedCache(e, r, n, o, u, p) {
    if (this.sessionGeneration !== o || !kur(n) || r === void 0 || getPersistedPolicyCacheChecksum() !== r)
      return;
    let cacheClearEpoch = this.cacheClearEpoch,
      y = await readPolicyStamp(getCachePath());
    if ((takeUpHipaaEvidenceLeftOnDisk(y), y.kind !== "absent" && !(y.kind === "ok" && y.stamp.sha === r)))
      return;
    let E = nextHipaaEvidence({
      principal: n,
      bodySha: r,
      confirmedAt: !isPolicyGraceEnabled() ? Date.now() : y.kind === "ok" ? y.stamp.confirmed_at : p,
      bodyTaints: e.compliance_taints,
      previous: mergeHipaaEvidence(y, getHeldHipaaEvidence()),
      authority: u,
    });
    if ((await writeCacheStampSafe(getCachePath(), E), this.cacheClearEpoch !== cacheClearEpoch)) {
      await this.deleteCacheFile();
      return;
    }
    if (this.sessionGeneration !== o) return;
    recordPersistedPolicyCache(r, stampToHipaaEvidence(E), E.confirmed_at);
  }
  recordCacheWriteFailure(e, r) {
    if ((logForDebugging(`Policy limits: Failed to save - ${e}`), !this.cacheWriteFailureLogged))
      ((this.cacheWriteFailureLogged = !0),
        logEvent("tengu_policy_limits_cache_write_failed", { errno: fromEnum(r) }));
  }
  async fetchAndLoad(e, r, n = !1) {
    let sessionGeneration = this.sessionGeneration;
    this.cyclesInFlight++;
    let runFetchCycle = this.runFetchCycle(e, r, n);
    this.unsettledCycles.add(runFetchCycle);
    try {
      return await runFetchCycle;
    } finally {
      (this.unsettledCycles.delete(runFetchCycle), this.endCycle(sessionGeneration));
    }
  }
  async _settleCyclesForTesting() {
    while (this.unsettledCycles.size > 0) await Promise.allSettled([...this.unsettledCycles]);
  }
  endCycle(e) {
    if (this.sessionGeneration !== e) return;
    if ((this.cyclesInFlight--, this.cyclesInFlight === 0 && this.principalCheckOwed))
      ((this.principalCheckOwed = !1), this.onCredentialMayHaveChanged());
  }
  async runFetchCycle(e, r, n) {
    this.used = !0;
    let o = e === "policy_limits_load" && !this.startupLoadClaimed;
    if (o) ((this.startupLoadClaimed = !0), (this.startupLoadGeneration = this.sessionGeneration));
    if ((Ue(() => this.managedConfigPolicyGateFields()), !isPolicyLimitsEligible()))
      return (
        this.prefetchSlot.clear(),
        recordManagedConfigResult("policy", { source: "ineligible", hadCache: !1, awaited: n }),
        null
      );
    if (o) this.startupLoadState = "in_flight";
    let u = isDiskAdoptionSuppressed() ? null : loadCachedResponse(),
      p = u === R5e ? null : u,
      h = u === null ? void 0 : getPolicyStoredCopyTrustedPrincipal(),
      y = getDiskAdoptionEpoch(),
      E = cacheAgeMs(),
      now_2 = Date.now(),
      S = getPolicyPrincipal(),
      K = S === null ? "" : eEe(S),
      b = !isAcceleratedTrigger(r);
    if (p && !getSessionCache()) installDiskDerivedVerdict(p);
    let w = getSessionCache();
    if (
      p &&
      w !== null &&
      this.verdictPrincipalIdentity === null &&
      this.serverConfirmedGeneration !== this.sessionGeneration
    )
      if (
        ye(S) &&
        getLastPolicyCacheStampVerdict() === "match" &&
        getLastPolicyCacheStampMatchedIdentity() === eEe(S) &&
        re(w) === re(p)
      )
        this.recordVerdictPrincipal(S);
      else this.ensureCredentialWatch();
    if (p) recordManagedConfigResult("policy", { source: "cache", hadCache: !0, awaited: n });
    let A = p ? re(p) : void 0,
      cacheClearEpoch = this.cacheClearEpoch;
    if (!this.signedCacheShadowChecked) {
      if (
        ((this.signedCacheShadowChecked = !0),
        (this.storedCopyAtStart = isPolicyCacheMemoryOnly()
          ? "not_read"
          : {
              enforced: isSettingsGateSettled(),
              gateAnswer: getPolicyStoredCopyTrust(),
              hadCopy: p !== null,
            }),
        A !== void 0 && !isPolicyCacheMemoryOnly())
      )
        verifyStoredCacheAsync({
          kind: "policy-limits",
          cachePath: getCachePath(),
          bodySha: A,
          readStoredAccount: getStoredOauthAccountInfo,
          readOrgPin: describeMdmSettingsState,
          onJudged: (s) => {
            this.storedCopyShadow = s;
          },
        });
    }
    let G = policyAuthKind(),
      authType = G.authType,
      now_3 = Date.now(),
      signal = this.abortController.signal,
      sessionGeneration = this.sessionGeneration,
      oe = getLastFetchOutcome(),
      se = () => {
        let s = getLastFetchOutcome();
        return s !== null && s.success && s !== oe;
      },
      I = !1,
      X = !1,
      j = (s) => {
        if (((I = !0), !s.success && se())) return;
        this.recordFetchOutcome(sessionGeneration, cacheClearEpoch, s, K, b);
      },
      U = () =>
        j({
          success: !1,
          errorCode: "request_failed",
          httpStatus: null,
          host: policyEndpointHost(),
          retrying: !1,
        });
    if (e === "policy_limits_load" && this.prefetchSlot.pending) {
      let s = await getClaudeAIOAuthTokenOriginAsync(this.credentials);
      if (s !== "store" || env.CLAUDE_CODE_OAUTH_TOKEN) clearOAuthTokenMemos();
      if (storeRecheckNeeded(s))
        await checkOAuthCredentialsChangedOnDisk(getRootSession().host, this.credentials);
      S = getPolicyPrincipal();
    }
    let V = S === null ? null : policyCacheKey(S),
      te = policyEndpointHost(),
      ae =
        e === "policy_limits_load"
          ? this.prefetchSlot.take(
              (s) =>
                s.checksum === A &&
                s.generation === sessionGeneration &&
                s.diskEpoch === y &&
                s.endpointHost === te &&
                s.storageV5 === this.storageV5 &&
                s.credentials === this.credentials &&
                s.principalKey === V,
            )
          : void 0;
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
              httpStatus: L.httpStatus ?? void 0,
              serverErrorType: stampedServerErrorType(L),
              serverErrorCode: Ye(L),
              serverAuthDenial: ze(L),
            };
          if (getLastFetchOutcome()?.success) return;
          this.recordFetchOutcome(
            sessionGeneration,
            cacheClearEpoch,
            {
              success: !1,
              host: te,
              httpStatus: L.httpStatus ?? null,
              errorCode: L.errorCode ?? "request_failed",
              retrying: !0,
            },
            K,
            b,
          );
        },
        this.oauthRefreshLatch,
        isAcceleratedTrigger(r) ? 0 : Ht,
        { hedge: n && et(), prefetched: ae },
      );
      if (this.sessionGeneration !== sessionGeneration || signal.aborted) {
        if (o && this.startupLoadState === "in_flight")
          ((this.startupLoadState = "failed"),
            (this.startupLoadErrorCode = "session_changed"),
            (this.startupLoadCredentialState = void 0),
            (this.startupLoadOutcomeReason = void 0),
            (this.startupLoadHttpStatus = void 0),
            (this.startupLoadServerErrorType = void 0),
            (this.startupLoadServerErrorCode = void 0),
            (this.startupLoadServerAuthDenial = void 0),
            (this.startupLoadLastAttempt = void 0));
        return (
          recordManagedConfigResult("policy", { source: "superseded", hadCache: p !== null, awaited: n }),
          logForDebugging("Policy limits: Discarding a fetch that outlived the account session"),
          logFeatureSad(e, "cycle_aborted"),
          getSessionCache()
        );
      }
      let ce = getPolicyPrincipal(),
        ue = ce === null ? null : policyCacheKey(ce),
        ve = s.principalKeyAtWire === void 0 ? ue : s.principalKeyAtWire,
        Me = s.success && this.isStaleTunnelCredentialEpoch(s.tunnelCredentialEpoch);
      if (Me)
        logForDebugging(
          "Policy limits: this answer came back under an older claude ssh credential epoch than one already seen; not installing it",
        );
      let Q = s.principalMovedAtWire === !0 || ve !== ue;
      if (!Q && s.askedKeyAtWire !== void 0 && s.askedKeyAtWire !== null) this.askedKey = s.askedKeyAtWire;
      if (Q)
        (logForDebugging(
          "Policy limits: the credential changed principal during the fetch; this response is used for the session but not persisted or attributed",
        ),
          (S = null));
      else if (V !== ue)
        (logForDebugging(
          "Policy limits: the credential changed principal before the request went out; attributing the response to the principal it authenticated as",
        ),
          (S = ce));
      if (getDiskAdoptionEpoch() !== y)
        (logForDebugging(
          "Policy limits: the disk snapshot predates an account-boundary hold; not installable",
        ),
          (p = null));
      let Se = s.success && s.response === null && !p,
        D = s.success && !Se && !Me;
      if (!D)
        this.observeTunnelCredentialEpoch(
          s.tunnelCredentialEpoch,
          s.success ? "a stale policy answer" : "a refused policy request",
          !1,
        );
      let ie = Me ? "stale_tunnel_credential" : Se ? "spurious_304" : (s.errorCode ?? "request_failed"),
        Ie = D ? void 0 : ie,
        rt = credentialOriginLabel(G, s),
        nt = rt === "injected_token" ? injectedOAuthTokenRecovery() : void 0,
        ot = {
          errorCode: ie,
          httpStatus: s.httpStatus,
          serverErrorType: s.serverErrorType,
          serverErrorCode: s.serverErrorCode,
          serverAuthDenial: s.serverAuthDenial,
          tokenRefreshOutcome: s.tokenRefreshOutcome,
          forcedRefreshOutcome: s.forcedRefreshOutcome,
          authUnavailableReason: s.authUnavailableReason,
          authType: authType,
          credentialOrigin: rt,
          injectedTokenRecovery: nt,
          noResponse: s.noResponse,
        },
        he = classifyAuthOutcome(ot),
        De = D ? void 0 : he,
        st =
          D || s.serverErrorStamped === !0 || !isPolicyGraceEnabled()
            ? De
            : classifyAuthOutcome({
                ...ot,
                serverErrorType: void 0,
                serverErrorCode: void 0,
                serverAuthDenial: s.httpStatus === 401 ? s.serverAuthDenial : void 0,
              }),
        at = settingsFetchOutcome(
          D
            ? { succeeded: !0, responseKind: s.response === null ? "not_modified" : "body" }
            : {
                succeeded: !1,
                failure:
                  s.authUnavailableReason !== void 0
                    ? "no_credentials"
                    : ie === "timeout"
                      ? "timeout"
                      : ie === "network_error" || s.noResponse
                        ? "network"
                        : ie === "parse_failed"
                          ? "parse"
                          : s.httpStatus !== void 0
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
        ),
        now_4 = Date.now(),
        $t = getLastPolicyCacheStampVerdict(),
        Pe = isSettingsGateSettled(),
        jt = getPolicyStoredCopyTrust(),
        dt = Pe ? h : trustedPrincipal(this.storedCopyShadow),
        qt = cacheTrustAnswer({ enforced: Pe, gateAnswer: jt, hadCopy: p !== null }, this.storedCopyShadow),
        lt = !this.storedCopyReported;
      if (((this.storedCopyReported = !0), (X = D), o))
        ((this.startupLoadState = D ? "succeeded" : "failed"),
          (this.startupLoadErrorCode = Ie),
          (this.startupLoadCredentialState = st),
          (this.startupLoadOutcomeReason = at),
          (this.startupLoadHttpStatus = D ? void 0 : (s.httpStatus ?? void 0)),
          (this.startupLoadServerErrorType = D ? void 0 : stampedServerErrorType(s)),
          (this.startupLoadServerErrorCode = D ? void 0 : Ye(s)),
          (this.startupLoadServerAuthDenial = D ? void 0 : ze(s)),
          (this.startupLoadLastAttempt = void 0));
      if (e === "policy_limits_load" && this.sessionGeneration === sessionGeneration)
        this.latestLoad = D
          ? { succeeded: !0 }
          : {
              succeeded: !1,
              errorCode: Ie,
              credentialState: st,
              httpStatus: s.httpStatus ?? void 0,
              serverErrorType: stampedServerErrorType(s),
              serverErrorCode: Ye(s),
              serverAuthDenial: ze(s),
            };
      let Re = { source: D ? "fetch" : "error", hadCache: p !== null, awaited: n, fetchMs: now_4 - now_3 };
      if (!D) recordManagedConfigResult("policy", Re);
      let ke,
        ct = !1;
      if (
        !s.success &&
        (!s.skipRetry || s.errorCode === "parse_failed") &&
        r !== "api_refusal_trigger" &&
        isShimmyingStardustGateOn()
      ) {
        ke = this.staleFallbackSource();
        let L = r !== "api_success_trigger";
        if (ke === null) {
          if (((ct = this.armVerdictlessRetry()), L)) this.armNetworkKick();
        } else if (!this.hasLiveVerdict() && L) this.armNetworkKick();
      }
      let pe = D ? (s.response ?? p) : null;
      if (
        ((this.liveAnswer = pe === null ? void 0 : { jws: s.signature, bodySha: () => re(pe) }),
        D && s.signature !== void 0 && dt !== void 0 && !this.livePrincipalChecked)
      )
        ((this.livePrincipalChecked = !0),
          logPrincipalChange({
            kind: "policy-limits",
            jws: s.signature,
            trustedPrincipal: dt,
            gate: Pe ? "enforced" : "shadow",
          }));
      if (
        (logEvent("tengu_policy_limits_fetch", {
          duration_ms: now_4 - now_3,
          ms_since_startup: now_4 - now,
          success: D,
          had_cache: p !== null,
          cache_stamp: fromEnum($t),
          stored_copy: lt ? fromEnum(qt) : void 0,
          stored_copy_gate: lt ? fromEnum(Pe ? "enforced" : "shadow") : void 0,
          cache_age_ms: E,
          attempts: s.attempts,
          prefetched: ae !== void 0,
          hedged: s.hedged === !0,
          restrictions_denied_count: pe ? count(Object.values(pe.restrictions), (L) => !L.allowed) : void 0,
          compliance_taint_count: pe ? (pe.compliance_taints?.length ?? 0) : void 0,
          is_load: e === "policy_limits_load",
          awaited: n,
          auth_type: fromEnum(authType),
          error_code: fromEnumOpt(Ie),
          token_source: fromEnum(authTokenSourceLabel()),
          credential_road: fromEnum(settingsAuthSource()),
          ...connectionTelemetry(),
          auth_unavailable_reason: fromEnumOpt(s.authUnavailableReason),
          token_refresh_outcome: authType === "oauth" ? fromEnumOpt(s.tokenRefreshOutcome) : void 0,
          forced_refresh_outcome: authType === "oauth" ? fromEnumOpt(s.forcedRefreshOutcome) : void 0,
          retried_after_401: s.retriedAfter401 ?? !1,
          http_status: s.httpStatus,
          parse_error_field: fromEnumOpt(s.parseErrorField),
          parse_error_content_type: fromEnumOpt(s.parseErrorContentType),
          server_error_type: fromEnumOpt(s.serverErrorType),
          server_error_code: fromEnumOpt(s.serverErrorCode),
          server_auth_denial: fromEnumOpt(s.serverAuthDenial),
          injected_token_recovery: fromEnumOpt(D ? void 0 : nt),
          credential_state: fromEnumOpt(De),
          outcome_reason: fromEnum(at),
          response_kind: D ? fromEnum(s.response === null ? "not_modified" : "body") : void 0,
          request_id_present: s.requestIdPresent,
          response_content_type: fromEnumOpt(s.responseContentType),
          fetch_trigger: fromEnum(r),
          verdictless_retry_scheduled: ct,
          error_errno: fromEnumOpt(s.errno),
          ...proxyTelemetry(),
        }),
        !D)
      ) {
        j({
          success: !1,
          host: te,
          httpStatus: s.httpStatus ?? null,
          errorCode: ie,
          retrying: !1,
          credentialState: he,
          ...(s.serverErrorCode !== void 0 && { serverErrorCode: s.serverErrorCode }),
        });
        let L = ke !== void 0 ? ke : this.staleFallbackSource();
        if (L) {
          logForDebugging(
            Se
              ? "Policy limits: 304 with no outstanding ETag \u2014 using stale cache"
              : "Policy limits: Using stale cache after fetch failure",
          );
          let fe = mergeUnknownTaints(L);
          if ((installDiskDerivedVerdict(fe), this.disposeVerdictlessRetryTimer(), !this.hasLiveVerdict()))
            this.noteUnverifiedCycle(ie, !0);
          return (
            logFeatureSad(e, Se ? "spurious_304" : "stale_cache_used", { credential_state: fromEnum(he) }),
            fe
          );
        }
        if (
          (s.httpStatus === 404 || s.httpStatus === 304) &&
          getSessionCache() === null &&
          !isAnthropicHosted() &&
          !getFeatureValue_CACHED_MAY_BE_STALE("tengu_rustling_orbit", !1)
        )
          return (
            logForDebugging(
              `Policy limits: ${s.httpStatus} with no cache, no restrictions for this session (not persisted)`,
            ),
            markSessionVerdictUnattributed(),
            installFailOpenSessionVerdict(),
            (this.serverConfirmedGeneration = sessionGeneration),
            this.disposeVerdictlessRetryTimer(),
            this.disarmNetworkKick(),
            this.recordVerdictPrincipal(S),
            logFeatureSad(e, s.httpStatus === 404 ? "route_missing_fail_open" : "unsolicited_304_fail_open", {
              credential_state: fromEnum(he),
            }),
            R5e
          );
        return (
          this.noteUnverifiedCycle(ie, !1),
          logFeatureBad(e, ie, { credential_state: fromEnum(he) }),
          null
        );
      }
      let response = s.response;
      if (response === null || response === void 0) {
        if (!p)
          return (
            U(),
            recordManagedConfigResult("policy", { ...Re, source: "error" }),
            logFeatureBad(e, "unexpected_error"),
            null
          );
        logForDebugging("Policy limits: Cache still valid (304 Not Modified)");
        let L = p,
          compliance_taints = p.compliance_taints,
          ut =
            this.serverConfirmedGeneration === sessionGeneration
              ? (getSessionCache()?.compliance_taints ?? [])
              : [],
          xe = countDroppedComplianceTaints(serverBodyOf(p)) > 0;
        if (xe && ut.some((pt) => !compliance_taints.includes(pt)))
          ((L = { ...p, compliance_taints: uniq([...ut, ...compliance_taints]).slice(0, MRt) }),
            logForDebugging(
              "Policy limits: lossy cached compliance_taints \u2014 kept the session taint set",
            ));
        if (Q) markSessionVerdictUnattributed();
        else dropPolicyTaintHints(s.stampAtWire);
        if (Q || xe) setSessionCacheAsPriorEvidence(L);
        else setSessionCache(L);
        if (
          (noteSessionVerdictEnvBearer(Q ? null : (s.sentEnvBearerDigest ?? null)),
          this.settleTunnelCredentialEpoch(s.tunnelCredentialEpoch),
          (this.serverConfirmedGeneration = sessionGeneration),
          this.onLiveVerdict(r),
          this.recordVerdictPrincipal(S),
          j({ success: !0, host: te }),
          !isPolicyCacheMemoryOnly() && kur(S))
        )
          try {
            if (
              (await y_r(getCachePath(), s.signature, { keptVerifiable: kio() }),
              !(await __r(getCachePath(), this.cacheClearEpoch !== cacheClearEpoch)) && !Q)
            )
              await this.restampConfirmedCache(
                L,
                A,
                S,
                sessionGeneration,
                xe ? "prior_evidence" : "confirmed",
                E === void 0 ? 0 : Math.floor(now_2 - E),
              );
          } catch {}
        return (recordManagedConfigResult("policy", Re), logFeatureOk(e), L);
      }
      let ee = response;
      if (s.lossyComplianceTaints) {
        let L = [...(getSessionCache()?.compliance_taints ?? []), ...(p?.compliance_taints ?? [])];
        if (L.length > 0)
          ((ee = { ...ee, compliance_taints: uniq([...ee.compliance_taints, ...L]).slice(0, MRt) }),
            logForDebugging("Policy limits: lossy compliance_taints \u2014 kept the known taint set"));
      }
      if (Q) markSessionVerdictUnattributed();
      else dropPolicyTaintHints(s.stampAtWire);
      if (Q || s.lossyComplianceTaints) setSessionCacheAsPriorEvidence(ee);
      else setSessionCache(ee);
      (noteSessionBodyReceived(now_4),
        noteSessionVerdictEnvBearer(Q ? null : (s.sentEnvBearerDigest ?? null)),
        this.settleTunnelCredentialEpoch(s.tunnelCredentialEpoch),
        (this.serverConfirmedGeneration = sessionGeneration),
        this.onLiveVerdict(r),
        this.recordVerdictPrincipal(S),
        j({ success: !0, host: te }));
      let Yt = getDiskAdoptionEpoch(),
        Ae = Q
          ? "stale"
          : await this.saveCachedResponse(
              ee,
              sessionGeneration,
              ee === response ? s.signature : void 0,
              S,
              s.lossyComplianceTaints ? "prior_evidence" : "confirmed",
            );
      if (
        (recordManagedConfigResult("policy", Re),
        Ae === "skipped" &&
          !kur(S) &&
          !Q &&
          !isPolicyCacheMemoryOnly() &&
          p !== null &&
          A !== void 0 &&
          getLastPolicyCacheStampVerdict() === "legacy" &&
          A !== re(ee))
      )
        await this.removeSupersededLegacyBody(p, A);
      if (this.sessionGeneration !== sessionGeneration) {
        if (Ae !== "stale" && Ae !== "skipped") {
          let deleteCacheFile = await this.deleteCacheFile();
          if ((suppressDiskAdoption(), !deleteCacheFile))
            logForDebugging(
              "Policy limits: could not remove a dead fetch's cache write; disk adoption suppressed until the next save",
            );
        }
        if ((this.dropUnconfirmedSessionCache(), o && this.startupLoadState === "succeeded"))
          ((this.startupLoadState = "failed"),
            (this.startupLoadErrorCode = "session_changed"),
            (this.startupLoadCredentialState = void 0),
            (this.startupLoadHttpStatus = void 0),
            (this.startupLoadServerErrorType = void 0),
            (this.startupLoadServerErrorCode = void 0),
            (this.startupLoadServerAuthDenial = void 0),
            (this.startupLoadLastAttempt = void 0));
        return (logFeatureSad(e, "cycle_aborted"), getSessionCache());
      }
      if (Ae === "saved" && getDiskAdoptionEpoch() === Yt) liftDiskAdoptionSuppression();
      if (
        (logForDebugging(
          Object.keys(ee.restrictions).length > 0
            ? "Policy limits: Applied new restrictions successfully"
            : "Policy limits: No restrictions (cached empty)",
        ),
        s.lossyComplianceTaints)
      )
        logFeatureSad(e, "lossy_compliance_taints");
      else logFeatureOk(e);
      return ee;
    } catch {
      let s = this.sessionGeneration !== sessionGeneration,
        ce = X && !I;
      if (ce && e === "policy_limits_load" && !s)
        this.latestLoad = {
          succeeded: !1,
          errorCode: void 0,
          credentialState: void 0,
          httpStatus: void 0,
          serverErrorType: void 0,
          serverErrorCode: void 0,
          serverAuthDenial: void 0,
        };
      if (o && (this.startupLoadState === "in_flight" || ce))
        ((this.startupLoadState = "failed"),
          (this.startupLoadErrorCode = s ? "session_changed" : "unexpected_error"),
          (this.startupLoadCredentialState = void 0),
          (this.startupLoadOutcomeReason = void 0),
          (this.startupLoadHttpStatus = void 0),
          (this.startupLoadServerErrorType = void 0),
          (this.startupLoadServerErrorCode = void 0),
          (this.startupLoadServerAuthDenial = void 0),
          (this.startupLoadLastAttempt = void 0));
      if (
        (recordManagedConfigResult("policy", {
          source: s ? "superseded" : "error",
          hadCache: p !== null,
          awaited: n,
        }),
        s || signal.aborted)
      )
        return (logFeatureSad(e, "cycle_aborted"), getSessionCache());
      if (!I) U();
      let staleFallbackSource = this.staleFallbackSource();
      if (staleFallbackSource) {
        logForDebugging("Policy limits: Using stale cache after error");
        let ve = mergeUnknownTaints(staleFallbackSource);
        if ((installDiskDerivedVerdict(ve), this.disposeVerdictlessRetryTimer(), !this.hasLiveVerdict()))
          this.noteUnverifiedCycle("unexpected_error", !0);
        return (logFeatureSad(e, "stale_cache_used"), ve);
      }
      return (this.noteUnverifiedCycle("unexpected_error", !1), logFeatureBad(e, "unexpected_error"), null);
    }
  }
  hasLiveVerdict() {
    let e = getSessionCache();
    return e !== null && e !== R5e && this.serverConfirmedGeneration === this.sessionGeneration;
  }
  armVerdictlessRetry() {
    if (this.verdictlessRetry !== null) return !0;
    let verdictlessRetryStep = this.verdictlessRetryStep,
      r = Ft[verdictlessRetryStep];
    if (r === void 0 || !isPolicyLimitsEligible()) return !1;
    this.verdictlessRetryStep = verdictlessRetryStep + 1;
    let rounded = Math.round(r * (1 - Mt + 2 * Mt * Math.random())),
      sessionGeneration = this.sessionGeneration;
    logForDebugging(
      `Policy limits: no verdict \u2014 accelerated retry ${verdictlessRetryStep + 1}/${Ft.length} in ${Math.round(rounded / 1000)}s`,
    );
    let u = startInteractionAwarePoll(
      () => {
        if ((u[Symbol.dispose](), this.verdictlessRetry === u)) this.verdictlessRetry = null;
        if (this.sessionGeneration !== sessionGeneration) return;
        if (getSessionCache() !== null) return;
        this.poll("accelerated_retry").catch((p) => logError(p));
      },
      rounded,
      { unref: !0 },
    );
    return ((this.verdictlessRetry = u), !0);
  }
  disposeVerdictlessRetryTimer() {
    (this.verdictlessRetry?.[Symbol.dispose](), (this.verdictlessRetry = null));
  }
  armNetworkKick() {
    if (this.stopNetworkWatch !== null) return;
    let sessionGeneration = this.sessionGeneration,
      r = Ot(() => {
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
    (this.stopNetworkWatch?.(), (this.stopNetworkWatch = null));
  }
  kickOnNetworkSuccess(e) {
    if (this.sessionGeneration !== e) {
      this.disarmNetworkKick();
      return;
    }
    if (this.cyclesInFlight > 0) return;
    if ((this.disarmNetworkKick(), !isPolicyLimitsEligible() || this.hasLiveVerdict())) return;
    (logForDebugging("Policy limits: the API answered a request \u2014 re-fetching the org policy now"),
      this.poll("api_success_trigger").catch((r) => logError(r)));
  }
  resetAcceleratedRecovery() {
    (this.disposeVerdictlessRetryTimer(), (this.verdictlessRetryStep = 0), this.disarmNetworkKick());
  }
  noteUnverifiedCycle(e, r) {
    if (this.verdictlessEpisode === null)
      this.verdictlessEpisode = { sinceMs: Date.now(), errorCode: e, failedCycles: 1, staleServed: r };
    else this.verdictlessEpisode.failedCycles++;
  }
  onLiveVerdict(e) {
    this.resetAcceleratedRecovery();
    let verdictlessEpisode = this.verdictlessEpisode;
    if (verdictlessEpisode === null) return;
    this.verdictlessEpisode = null;
    let now_2 = Date.now(),
      o = yi(e),
      errorCode = verdictlessEpisode.errorCode;
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
    if (this.gateSnapshotThisRun !== void 0) return this.gateSnapshotThisRun;
    let e = getPolicyLimitsIneligibleReason(),
      r = e === void 0,
      n = e === "custom_base_url" ? getPolicyLimitsIneligibleReason({ skipBaseUrlCheck: !0 }) === void 0 : r,
      o = getResponseFromCache() !== null,
      u = r ? cacheAgeMs() : void 0,
      hasLiveVerdict = this.hasLiveVerdict(),
      h = {
        ineligibleReason: e,
        eligible: r,
        eligibleIfBaseUrlGateRemoved: n,
        hasCache: o,
        cacheAgeMs: u,
        liveVerdict: hasLiveVerdict,
        wouldFailClosed:
          r &&
          !hasLiveVerdict &&
          (!o ||
            (getPolicyLimitsTunnelSocket() === void 0 && (u ?? 1 / 0) > FAIL_CLOSED_SHADOW_CACHE_TTL_MS)),
        loadState: this.startupLoadState,
        loadFromEarlierGeneration:
          this.startupLoadClaimed && this.startupLoadGeneration !== this.sessionGeneration,
        loadErrorCode: this.startupLoadErrorCode,
        loadCredentialState: this.startupLoadCredentialState,
        loadOutcomeReason: r
          ? this.startupLoadOutcomeReason
          : notAttemptedReason(managedConfigNotAttemptedInput(e)),
        loadHttpStatus: this.startupLoadHttpStatus,
        loadLastAttempt: this.startupLoadLastAttempt,
        latestLoad: this.latestLoad,
        loadServerErrorType: this.startupLoadServerErrorType,
        loadServerErrorCode: this.startupLoadServerErrorCode,
        loadServerAuthDenial: this.startupLoadServerAuthDenial,
        awaitResult: this.startupAwaitResult,
      };
    return (
      (this.gateSnapshotThisRun = h),
      queueMicrotask(() => {
        this.gateSnapshotThisRun = void 0;
      }),
      h
    );
  }
  signatureFacts() {
    let storedCopyAtStart = this.storedCopyAtStart;
    return {
      storedCopy:
        storedCopyAtStart === void 0 || storedCopyAtStart === "not_read"
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
    let policyGateSnapshot = this.policyGateSnapshot(),
      r = connectionTelemetry();
    return {
      policy_ineligible_reason: fromEnumOpt(policyGateSnapshot.ineligibleReason),
      policy_eligible_if_base_url_gate_removed: policyGateSnapshot.eligibleIfBaseUrlGateRemoved,
      policy_cache_age_ms: policyGateSnapshot.cacheAgeMs,
      policy_would_fail_closed: policyGateSnapshot.wouldFailClosed,
      policy_live_verdict: policyGateSnapshot.liveVerdict,
      policy_load_state: fromEnum(policyGateSnapshot.loadState),
      policy_error_code: fromEnumOpt(policyGateSnapshot.loadErrorCode),
      policy_credential_state: fromEnumOpt(policyGateSnapshot.loadCredentialState),
      policy_outcome_reason: fromEnumOpt(policyGateSnapshot.loadOutcomeReason),
      policy_has_auth_token: r.has_auth_token,
      policy_has_api_key_helper: r.has_api_key_helper,
      policy_has_custom_base_url: r.has_custom_base_url,
      policy_api_provider: fromEnum(getAPIProvider()),
      policy_http_status: policyGateSnapshot.loadHttpStatus,
      policy_server_error_type: fromEnumOpt(policyGateSnapshot.loadServerErrorType),
      policy_server_error_code: fromEnumOpt(policyGateSnapshot.loadServerErrorCode),
      policy_server_auth_denial: fromEnumOpt(policyGateSnapshot.loadServerAuthDenial),
    };
  }
  logCacheStateAtFirstPrompt() {
    if (this.firstPromptStateLogged) return;
    this.firstPromptStateLogged = !0;
    let policyGateSnapshot = this.policyGateSnapshot(),
      r = fromEnum(errorReportingPolicyState());
    logEvent("tengu_policy_limits_cache_state_at_first_prompt", {
      eligible: policyGateSnapshot.eligible,
      ineligible_reason: fromEnumOpt(policyGateSnapshot.ineligibleReason),
      eligible_if_base_url_gate_removed: policyGateSnapshot.eligibleIfBaseUrlGateRemoved,
      has_cache: policyGateSnapshot.hasCache,
      cache_age_ms: policyGateSnapshot.cacheAgeMs,
      would_fail_closed: policyGateSnapshot.wouldFailClosed,
      live_verdict: policyGateSnapshot.liveVerdict,
      token_source: fromEnum(authTokenSourceLabel()),
      credential_road: fromEnum(settingsAuthSource()),
      ...connectionTelemetry(),
      ms_since_startup: Date.now() - now,
      load_state: fromEnum(policyGateSnapshot.loadState),
      startup_fetch_error_code: fromEnumOpt(policyGateSnapshot.loadErrorCode),
      startup_credential_state: fromEnumOpt(policyGateSnapshot.loadCredentialState),
      outcome_reason: fromEnumOpt(policyGateSnapshot.loadOutcomeReason),
      startup_await_result: fromEnum(policyGateSnapshot.awaitResult),
      error_reporting_gate: r,
    });
  }
  async load({ startupAwaited: e = !1, singleAttempt: r = !1 } = {}) {
    if (r && this.cyclesInFlight > 0) {
      await Promise.allSettled([...this.unsettledCycles]);
      return;
    }
    return this.loadFor(r ? "accelerated_retry" : "load", e);
  }
  async loadFor(e, r = !1) {
    if (
      ((this.used = !0),
      this.ensureCredentialWatch(),
      isPolicyLimitsEligible() && !this.loadingCompletePromise)
    )
      this.loadingCompletePromise = new Promise((o) => {
        this.loadingCompleteResolve = o;
      });
    let loadingCompleteResolve = this.loadingCompleteResolve;
    try {
      if ((await this.fetchAndLoad("policy_limits_load", e, r), isPolicyLimitsEligible()))
        this.startBackgroundPolling();
    } finally {
      if (loadingCompleteResolve) {
        if ((loadingCompleteResolve(), this.loadingCompleteResolve === loadingCompleteResolve)) {
          if (((this.loadingCompleteResolve = null), this.loadingTimeoutId))
            (clearTimeout(this.loadingTimeoutId), (this.loadingTimeoutId = null));
        }
      }
    }
  }
  async refresh({ observedBoundary: e = !1 } = {}) {
    ((this.used = !0), this.stop(), this.ensureCredentialWatch(), this.initializeLoadingPromise());
    let r = isPolicyLimitsEligible();
    if (e) await this.removeUnstampedBody();
    else if (!(await this.deleteCacheFile()))
      logForDebugging(
        "Policy limits: could not remove the previous account's cache; disk adoption stays suppressed",
      );
    if ((this.dropUnconfirmedSessionCache(), !r)) return;
    (await this.loadFor("login_refresh"), logForDebugging("Policy limits: Refreshed after auth change"));
  }
  async clearCache() {
    if (
      ((this.used = !0),
      this.stop(),
      (this.verdictlessEpisode = null),
      this.ensureCredentialWatch(),
      !(await this.deleteCacheFile()))
    )
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
    if ((this.cacheClearEpoch++, isPolicyCacheMemoryOnly())) return !1;
    if (
      (takeUpHipaaEvidenceLeftOnDisk(await readPolicyStamp(getCachePath())),
      !(await this.removeBodyLeavingStamp()))
    )
      return !1;
    let r = await readPolicyStamp(getCachePath());
    if (r.kind === "unusable") return !0;
    let n = mergeHipaaEvidence(r, getHeldHipaaEvidence());
    if (n.seen.length === 0 && !n.incomplete) await removeCacheStamp(getCachePath());
    else await writeCacheStampSafe(getCachePath(), buildTokenStamp(n));
    return !0;
  }
  recordVerdictPrincipal(e) {
    if (e === null || ye(e)) {
      if (
        ((this.verdictPrincipalIdentity = e === null ? null : eEe(e)),
        (this.verdictPrincipalKind = e === null ? null : e.kind),
        (this.verdictKey = e === null ? null : policyCacheKey(e)),
        e !== null)
      )
        this.askedKey = null;
    } else this.verdictKey = policyCacheKey(e);
    (this.ensureCredentialWatch(), this.onCredentialMayHaveChanged());
  }
  isVerdictOfLiveCredential() {
    return this.verdictKey !== null && Ze() === this.verdictKey;
  }
  ensureCredentialWatch() {
    if (this.stopCredentialWatch === null) this.stopCredentialWatch = W3t(this.onCredentialMayHaveChanged);
    if (this.stopTunnelEpochWatch === null) this.stopTunnelEpochWatch = Hwi(this.onTunnelCredentialEpoch);
    if (this.stopRegimeRefusalWatch === null)
      this.stopRegimeRefusalWatch = mt(this.refetchAfterRegimeRefusal);
    if (this.stopKeyApprovalWatch === null)
      this.stopKeyApprovalWatch = onEnvApiKeyApprovalFlipped(this.onCredentialMayHaveChanged);
  }
  refetchAfterRegimeRefusal = () => {
    if (hasComplianceTaint("hipaa")) return Promise.resolve();
    if (this.regimeRefusalRefetch !== null) return this.regimeRefusalRefetch;
    let now = Date.now(),
      r =
        this.regimeRefusalRefetchStartedAtMs === void 0 ? void 0 : now - this.regimeRefusalRefetchStartedAtMs,
      n = r === void 0 || r < 0 || r >= gi;
    if (n)
      ((this.regimeRefusalRefetchStartedAtMs = now),
        logForDebugging(
          "Policy limits: the API refused a request for an organization policy this session has not loaded \u2014 re-fetching it now",
        ));
    return (
      (this.regimeRefusalRefetch = withDeadline(
        (n ? this.poll("api_refusal_trigger") : Promise.resolve()).then(() =>
          Promise.allSettled([...this.unsettledCycles]),
        ),
        POLICY_LIMITS_COLD_AWAIT_MS,
      )
        .catch((o) => logError(o))
        .then(() => {
          this.regimeRefusalRefetch = null;
        })),
      this.regimeRefusalRefetch
    );
  };
  onTunnelCredentialEpoch = (e) => {
    this.observeTunnelCredentialEpoch(e, "a model response", !0);
  };
  observeTunnelCredentialEpoch(e, r, n) {
    if (e === void 0 || getPolicyLimitsTunnelSocket() === void 0) return;
    let o = this.tunnelEpochSeen !== void 0;
    if (this.tunnelEpochSeen === void 0 || e > this.tunnelEpochSeen)
      ((this.tunnelEpochSeen = e), noteTunnelEpochHeard(e));
    if (this.tunnelVerdictEpoch !== void 0 && e <= this.tunnelVerdictEpoch) return;
    if (!o && this.tunnelVerdictEpoch === void 0) return;
    let u = getSessionCache() !== null,
      p = n && this.tunnelRepolledForEpoch !== this.tunnelEpochSeen && this.cyclesInFlight === 0;
    if (!u && !p) return;
    if (
      (logForDebugging(
        `Policy limits: the claude ssh launcher injects a different credential than the one this policy was fetched with (${r}); ${u ? "withholding client-only keys" : "no verdict held"}${p ? ", re-polling" : ""}`,
      ),
      u)
    )
      markSessionVerdictUnattributed();
    if (p)
      ((this.tunnelRepolledForEpoch = this.tunnelEpochSeen),
        logEvent("tengu_policy_limits_principal_changed", {
          next_kind: fromEnum("none"),
          reason: fromEnum("tunnel_credential"),
        }),
        this.fetchAndLoad("policy_limits_poll", "credential_change").catch((h) => logError(h)));
  }
  settleTunnelCredentialEpoch(e) {
    if (e === void 0 || getPolicyLimitsTunnelSocket() === void 0) return;
    if (((this.tunnelVerdictEpoch = e), this.tunnelEpochSeen === void 0 || e > this.tunnelEpochSeen))
      ((this.tunnelEpochSeen = e), noteTunnelEpochHeard(e));
  }
  isStaleTunnelCredentialEpoch(e) {
    return (
      e !== void 0 &&
      this.tunnelEpochSeen !== void 0 &&
      e < this.tunnelEpochSeen &&
      getPolicyLimitsTunnelSocket() !== void 0
    );
  }
  onCredentialMayHaveChanged = () => {
    if (this.principalCheckQueued) return;
    ((this.principalCheckQueued = !0),
      queueMicrotask(() => {
        this.checkPrincipal().catch((e) => {
          logError(e);
        });
      }));
  };
  async checkPrincipal(e = "credential_change") {
    let sessionGeneration = this.sessionGeneration;
    try {
      if (
        this.verdictPrincipalIdentity === null &&
        getSessionCache() === null &&
        getCredentialIndependentIneligibleReason() !== void 0
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
      this.principalCheckQueued = !1;
    }
    if (this.sessionGeneration !== sessionGeneration) return "superseded";
    let n = envBearerVerdictOnWire();
    if (n === "replaced" && isHostManagedProviderAuth()) return this.askAsHostManagedEnvBearer(e);
    if (n === "replaced" || n === "gone")
      return (
        logForDebugging(
          "Policy limits: the env bearer the loaded policy was fetched with is no longer the wire credential; reloading as an account change",
        ),
        logEvent("tengu_policy_limits_principal_changed", {
          next_kind: fromEnum("none"),
          reason: fromEnum("env_bearer"),
        }),
        this.refresh({ observedBoundary: !0 }).catch((E) => logError(E)),
        "changed"
      );
    let o = getPolicyPrincipal();
    if (o !== null && !ye(o)) this.scheduleUnclassifiedRecheck();
    if (!ye(o)) {
      if (
        o !== null &&
        getSessionCache() !== null &&
        policyCacheKey(o) !== this.verdictKey &&
        getClaudeAIOAuthTokenOrigin() === "store"
      ) {
        if (this.cyclesInFlight > 0) return ((this.principalCheckOwed = !0), "unchanged");
        let E = Fe(o);
        if (E !== this.askedKey)
          return (
            logForDebugging(
              "Policy limits: the stored login in use is not the one the loaded policy was fetched with, and its account record has not settled; asking the server with it (keyed on the token until the record settles)",
            ),
            this.repollFor(o, E, "unattributed", e)
          );
      }
      if (o === null && n === null && isHostManagedAnthropicApiBearer() && isPolicyLimitsEligible())
        return this.askAsHostManagedEnvBearer(e);
      return "unchanged";
    }
    let u = eEe(o),
      p = this.verdictPrincipalKind === "token" && o.kind === "token";
    if (this.verdictPrincipalIdentity !== null && u !== this.verdictPrincipalIdentity && !p) {
      if (Exi()) {
        let E = Fe(o),
          R = this.cyclesInFlight > 0;
        if (R && E === this.askedKey) return ((this.principalCheckOwed = !0), "unchanged");
        if (!R && E !== this.askedKey)
          return (
            logForDebugging(
              `Policy limits: the credential now belongs to a different principal than the loaded policy; ${TENGU_STEADY_MARSHMALLOW} keeps the loaded verdict while the new principal's policy is fetched`,
            ),
            logEvent("tengu_policy_limits_principal_changed", {
              next_kind: fromEnum(o.kind),
              reason: fromEnum("identity_kept"),
            }),
            (this.askedKey = E),
            this.fetchAcrossBoundaryKeepingVerdict(e).catch((S) => logError(S)),
            "changed"
          );
      }
      return (
        logForDebugging(
          "Policy limits: the credential now belongs to a different principal than the loaded policy; reloading as an account change",
        ),
        logEvent("tengu_policy_limits_principal_changed", {
          next_kind: fromEnum(o.kind),
          reason: fromEnum("identity"),
        }),
        this.refresh({ observedBoundary: !0 }).catch((E) => logError(E)),
        "changed"
      );
    }
    if (this.cyclesInFlight > 0) return ((this.principalCheckOwed = !0), "unchanged");
    let h = policyCacheKey(o),
      y = Fe(o);
    if (y === this.askedKey) return "unchanged";
    if (this.verdictPrincipalIdentity === null) {
      if (getSessionCache() === null) {
        if (!isPolicyLimitsEligible() || this.loadingCompleteResolve !== null) return "unchanged";
        return (
          (this.askedKey = y),
          this.releaseLoadingPromise(),
          this.initializeLoadingPromise(),
          this.loadFor(e).catch((E) => logError(E)),
          "started"
        );
      }
      return this.repollFor(o, y, "unattributed", e);
    }
    if (h !== this.verdictKey) {
      let E = (o.admitsOnly === !0) !== (this.verdictKey?.endsWith(Vt) ?? !1),
        R = E
          ? o.admitsOnly === !0
            ? "snapshot_fallback"
            : "store_restored"
          : o.bearerDigest !== void 0 || p
            ? "bearer"
            : "reclassified";
      return (
        logForDebugging(
          E
            ? `Policy limits: the login moved between the credential store and the daemon's snapshot of it (${R}); keeping the verdict and re-polling`
            : "Policy limits: a new bearer for the loaded policy (a declared organization's new bearer, one keyed on itself replacing another, a healed store); keeping the verdict and re-polling",
        ),
        this.repollFor(o, y, R, e)
      );
    }
    return "unchanged";
  }
  scheduleUnclassifiedRecheck() {
    if (this.unclassifiedRecheckTimer !== null) return;
    ((this.unclassifiedRecheckTimer = setTimeout(() => {
      ((this.unclassifiedRecheckTimer = null), this.onCredentialMayHaveChanged());
    }, Ai)),
      this.unclassifiedRecheckTimer.unref?.());
  }
  askAsHostManagedEnvBearer(e) {
    if (this.cyclesInFlight > 0) return ((this.principalCheckOwed = !0), "unchanged");
    let r = Nt(tokenDigest(effectiveAuthTokenEnv() ?? ""));
    if (r === this.askedKey) return "unchanged";
    if (getSessionCache() !== null)
      return (
        (this.askedKey = r),
        logEvent("tengu_policy_limits_principal_changed", {
          next_kind: fromEnum("none"),
          reason: fromEnum("bearer"),
        }),
        this.fetchAndLoad("policy_limits_poll", e).catch((n) => logError(n)),
        "repolled"
      );
    if (this.loadingCompleteResolve !== null) return "unchanged";
    return (
      (this.askedKey = r),
      this.releaseLoadingPromise(),
      this.initializeLoadingPromise(),
      this.loadFor(e).catch((n) => logError(n)),
      "started"
    );
  }
  repollFor(e, r, n, o) {
    return (
      (this.askedKey = r),
      logEvent("tengu_policy_limits_principal_changed", { next_kind: fromEnum(e.kind), reason: fromEnum(n) }),
      this.fetchAndLoad("policy_limits_poll", o).catch((u) => logError(u)),
      "repolled"
    );
  }
  async fetchAcrossBoundaryKeepingVerdict(e) {
    let sessionGeneration = this.sessionGeneration,
      verdictPrincipalIdentity = this.verdictPrincipalIdentity;
    (suppressDiskAdoption(),
      forgetPersistedPolicyCache(),
      markSessionVerdictUnattributed(),
      this.prefetchSlot.clear(),
      this.renewOAuthRefreshLatch(),
      this.cyclesInFlight++);
    try {
      if (
        (await this.removeUnstampedBody().catch((o) => logError(o)),
        this.sessionGeneration === sessionGeneration)
      )
        await this.fetchAndLoad("policy_limits_poll", e).catch((o) => logError(o));
    } finally {
      this.endCycle(sessionGeneration);
    }
    if (
      this.sessionGeneration !== sessionGeneration ||
      this.verdictPrincipalIdentity !== verdictPrincipalIdentity
    )
      return;
    (logForDebugging(
      "Policy limits: the new principal's fetch installed nothing; dropping the previous principal's verdict as an account change",
    ),
      await this.refresh({ observedBoundary: !0 }));
  }
  async poll(e = "hourly_poll") {
    if (!isPolicyLimitsEligible()) return;
    let r = getSessionCache(),
      n = r ? jsonStringify(r) : null;
    try {
      if ((await this.checkPrincipal(e)) !== "unchanged") return;
      if (this.cyclesInFlight > 0) return;
      await this.fetchAndLoad("policy_limits_poll", e);
      let o = getSessionCache();
      if ((o ? jsonStringify(o) : null) !== n)
        logForDebugging("Policy limits: Changed during background poll");
    } catch {}
  }
  startBackgroundPolling() {
    if (((this.used = !0), this.poller !== null)) return;
    if (!isPolicyLimitsEligible()) return;
    if (
      ((this.poller = startInteractionAwarePoll(() => void this.poll(), mi, { unref: !0 })),
      !this.cleanupRegistered)
    )
      ((this.cleanupRegistered = !0), registerCleanup(() => this.stopBackgroundPolling()));
  }
  stopBackgroundPolling() {
    (this.poller?.[Symbol.dispose](), (this.poller = null), this.resetAcceleratedRecovery());
  }
}
//@ chunk-7t4fmt2f.js:63095-63119 placement
class DefaultPolicyLimitsClientSlot {
  client = void 0;
}
//@ chunk-7t4fmt2f.js:63119-63146 placement
var defaultPolicyLimitsClientSlots = new HostScoped(() => new DefaultPolicyLimitsClientSlot());
//@ chunk-7t4fmt2f.js:63146-63184 placement
function _e() {
  return defaultPolicyLimitsClientSlots.of(getRootSession().host);
}
//@ chunk-7t4fmt2f.js:63184-63243 placement
function x() {
  let e = _e();
  return ((e.client ??= new PolicyLimitsClient()), e.client);
}
//@ chunk-7t4fmt2f.js:63243-63931 placement
function composePolicyLimitsClient(e) {
  let r = _e();
  if (r.client === void 0) {
    r.client = new PolicyLimitsClient(e);
    return;
  }
  let adoptStartupServices = r.client.adoptStartupServices(e);
  switch (adoptStartupServices) {
    case "nothing to adopt":
      logForDebugging("Policy limits: default client already constructed; start-up composition skipped");
      return;
    case "already used":
      (logForDebugging(
        "Policy limits: start-up composition came after the bare default client was used; it keeps running without the backend and credentials store",
        { level: "warn" },
      ),
        logEvent("tengu_policy_limits_late_composition", {}));
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
  x().recordStartupAwaitResult(e);
}
//@ chunk-7t4fmt2f.js:63979-64180 placement
async function awaitPolicyLimitsColdStartVerdict() {
  let startTime = performance.now(),
    r;
  try {
    let n = x();
    (n.ensureLoadRequested({ startupAwaited: !0 }), (r = await n.awaitColdStartVerdict()));
  } catch (error) {
    (logError(error), (r = "timed_out"));
  }
  return (oat("policy", r, { since: startTime }), r);
}
//@ chunk-7t4fmt2f.js:64180-64224 placement
function didPolicyLimitsColdStartTimeOut() {
  return x().coldStartTimedOut;
}
//@ chunk-7t4fmt2f.js:64224-64265 placement
function getPolicyLimitsGateSnapshot() {
  return x().gateSnapshot();
}
//@ chunk-7t4fmt2f.js:64265-64312 placement
function getPolicyLimitsColdStartWait() {
  return x().coldStartVerdictWait;
}
//@ chunk-7t4fmt2f.js:64312-64427 placement
function ensurePolicyLimitsLoadRequested() {
  oat("policy", "not_awaited");
  try {
    if (isPolicyLimitsEligible()) x().ensureLoadRequested({ startupAwaited: !1 });
  } catch (error) {
    logError(error);
  }
}
//@ chunk-7t4fmt2f.js:64427-64591 placement
async function awaitPolicyLimitsColdStart() {
  let startTime = performance.now();
  try {
    if (!shouldAwaitPolicyLimitsOnStartup()) return (ensurePolicyLimitsLoadRequested(), "skipped");
  } catch (error) {
    return (logError(error), oat("policy", "timed_out", { since: startTime }), "timed_out");
  }
  return awaitPolicyLimitsColdStartVerdict();
}
//@ chunk-7t4fmt2f.js:64591-64617 placement
function _getDefaultPolicyLimitsClientForTesting() {
  return x();
}
//@ chunk-7t4fmt2f.js:64617-64704 placement
async function _awaitPolicyLimitsCyclesForTesting() {
  let client = _e().client;
  if (client !== void 0) await client._settleCyclesForTesting();
}
//@ chunk-7t4fmt2f.js:64704-64779 placement
function _resetPolicyLimitsForTesting() {
  (x().stop(),
    liftDiskAdoptionSuppression(),
    (_e().client = void 0),
    skillChangeDetector(),
    _resetRememberedCoreSkillsForTesting(),
    Nwi(),
    _resetMachinePinsSignInForTesting());
}
//@ chunk-7t4fmt2f.js:64779-64825 placement
function initializePolicyLimitsLoadingPromise() {
  x().initializeLoadingPromise();
}
//@ chunk-7t4fmt2f.js:64825-64888 placement
function Ye(e) {
  return stampedServerErrorType(e) !== void 0 ? e.serverErrorCode : void 0;
}
//@ chunk-7t4fmt2f.js:64888-64952 placement
function ze(e) {
  return stampedServerErrorType(e) !== void 0 ? e.serverAuthDenial : void 0;
}
//@ chunk-7t4fmt2f.js:64952-64995 placement
function getPolicyLimitsSignatureFacts() {
  return x().signatureFacts();
}
//@ chunk-7t4fmt2f.js:64995-65034 placement
function waitForPolicyLimitsToLoad() {
  return x().waitForLoad();
}
//@ chunk-7t4fmt2f.js:65034-65082 placement
function logPolicyLimitsCacheStateAtFirstPrompt() {
  x().logCacheStateAtFirstPrompt();
}
//@ chunk-7t4fmt2f.js:65082-65128 placement
function admitPrefetchedPolicyLimits(e) {
  return x().admitPrefetched(e);
}
//@ chunk-7t4fmt2f.js:65128-65195 placement
function isSessionVerdictOfLiveCredential() {
  return _e().client?.isVerdictOfLiveCredential() ?? !1;
}
//@ chunk-7t4fmt2f.js:65195-65233 placement
function loadPolicyLimits(e = {}) {
  return x().load(e);
}
//@ chunk-7t4fmt2f.js:65233-65263 placement = skillSearchModules (1)
function prefetchPolicyLimits() {
  x().prefetch();
}
//@ chunk-7t4fmt2f.js:65263-65299 placement
function refreshPolicyLimits() {
  return x().refresh();
}
//@ chunk-7t4fmt2f.js:65299-65338 placement
function clearPolicyLimitsCache() {
  return x().clearCache();
}
//@ chunk-7t4fmt2f.js:65338-65382 placement
function startBackgroundPolling() {
  x().startBackgroundPolling();
}
//@ chunk-7t4fmt2f.js:65382-65425 placement
function stopBackgroundPolling() {
  x().stopBackgroundPolling();
}
//@ chunk-7t4fmt2f.js:65425-65451 placement
function stopPolicyLimits() {
  x().stop();
}
//@ chunk-7t4fmt2f.js:65451-65467 placement
var Ai = UNCLASSIFIED_ORIGIN_MEMO_MS + 1000;
//@ chunk-7t4fmt2f.js:65467-65519 placement
function ye(e) {
  return e !== null && e.unclassified !== !0;
}
//@ chunk-7t4fmt2f.js:65519-65541 placement
var Vt = ":admits-only";
//@ chunk-7t4fmt2f.js:65541-65661 placement
function policyCacheKey(e) {
  let r = eEe(e),
    n = e.bearerDigest === void 0 ? r : `${r}:${e.bearerDigest}`;
  return e.admitsOnly === !0 ? `${n}${Vt}` : n;
}
//@ chunk-7t4fmt2f.js:65661-65713 placement
function Ze() {
  let e = getPolicyPrincipal();
  return e === null ? null : policyCacheKey(e);
}
//@ chunk-7t4fmt2f.js:65713-65752 placement
function Nt(e) {
  return `env-bearer:${e}`;
}
//@ chunk-7t4fmt2f.js:65752-65823 placement
function Fe(e) {
  let r = getClaudeAIOAuthTokens()?.accessToken;
  return `${policyCacheKey(e)}#${r ? tokenDigest(r) : ""}`;
}

export {
  refreshPolicyLimits,
  waitForPolicyLimitsToLoad,
  getPolicyLimitsSignatureFacts,
  shouldAwaitPolicyLimitsOnStartup,
  loadPolicyLimits,
  didPolicyLimitsColdStartTimeOut,
  Ht,
  it,
  Ze,
  policyCacheKey,
  ye,
  Fe,
  Nt,
  revalidationChecksumForPolicy,
  tt,
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
