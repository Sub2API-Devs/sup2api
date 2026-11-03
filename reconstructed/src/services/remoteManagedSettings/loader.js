/**
 * services/remoteManagedSettings/loader.ts
 *
 * 2.1.316 新增（门面模块 hostLaunchedGatewayRefusal）。远程托管设置加载与网关拒绝。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4pc1m5n9.js (46)
 * attribution: placement 46
 */
import { rm, unlink } from "fs/promises";
import { hostname } from "os";
import {
  PrefetchSlot,
  setSettingsReader,
  recordManagedConfigResult,
  beginStartupBlock,
} from "../policyLimits/startupGate.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession, getGatewayAuth, isHostVerifiedGatewayAuth } from "../../bootstrap/state.js";
import {
  computeRemoteSettingsEligibility,
  resetRemoteSettingsSyncCache,
  describeFetchFailure,
} from "../cloudSessions/eligibility.js";
import { isSecuritySettingsDialogPending, armStartupConsentRelease } from "./securityCheck.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  markLoadBackstopReleased,
  getRemoteSettingsPathOverride,
  isEvalPolicySnapshotOnly,
  getSyncCacheResetEpoch,
  HELPER_CONSENT_STATE_ID,
  getHelperConsentPath,
  getIneligibleReason,
  setLastLoadStatus,
  isRemoteManagedSettingsVerified,
  getLastLoadStatus,
  markLoadCycleBegun,
  markLoadCycleEnded,
} from "./remoteSettingsState.js";
import {
  getMockRemoteSettingsValue,
  getRemoteManagedSettingsRawCache,
  holdsNoServedSettings,
  unverifiedRemoteCacheWithholdsProvisions,
  remoteSettingsFileWritten,
  getSettingsPath,
  getRemoteManagedSettingsSyncFromCache,
} from "./remoteSettingsCache.js";
import {
  getClaudeAIOAuthTokens,
  getStoredOauthAccountInfo,
  managedConfigNotAttemptedInput,
} from "../../utils/auth.js";
import { computeChecksum, isPolicyGraceEnabled } from "../policyLimits/index.js";
import {
  getRemoteManagedSettingsEndpoint,
  remoteSettingsCredentialKey,
  fetchRemoteManagedSettings,
  fetchAndLoadRemoteManagedSettings,
  loadRemoteManagedSettings_2,
} from "./index.js";
import { keepIfFresh } from "../analytics/growthbookGates.js";
import { settingsAgeMs, readSyncAge, removeSyncStamp } from "./consentRecords.js";
import {
  hasManagedOrCoworkSurface,
  hasManagedSettings,
} from "../../utils/settings/managedRestrictionKeys.js";
import { cacheTrustAnswer, removeSignatureFiles } from "../../utils/settings/policyCertificates.js";
import { verifyLiveAnswerSignature } from "../policyLimits/signedCache.js";
import { setRemotePolicySettler } from "../../utils/model/allowedProviders.js";
import { noteStoredLoginSurface } from "./storedLoginSurface.js";
import { organizationAnswerState } from "../../utils/plugins/commandSource.js";
import { isSdkEntrypoint } from "../../utils/entrypointKinds.js";
import { setPolicyColdStartWaiter } from "../policyLimits/coldStartWaiter.js";
import { invalidateCommandNames } from "../../utils/settings/commandSyncNames.js";
import { isDisklessWithoutState } from "../orgMemory/memoryStores.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { formatStorageError } from "../../utils/storage/storageErrors.js";
import { errorMessage, isENOENT } from "../../utils/errors.js";
import { parseRemoteManagedSettings } from "../../utils/settings/managedFileSettings.js";
import {
  reserveRemoteStaticPayload,
  applyRemotePolicyMidSession,
} from "../../utils/settings/policyHelper/helperRemote.js";
import { getRemotePolicyTierWithKind } from "../../utils/settings/settings.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum, fromEnumOpt } from "../analytics/safeMetadata.js";
import { settingsAuthSource, startInteractionAwarePoll } from "./fetchSupport.js";
import { isWslEnvironment } from "../../utils/settings/marketplaceSettingsAliases.js";
import { logFeatureSad } from "../analytics/featureTelemetry.js";
import { isCoworkWithRemote } from "../../utils/sessionShape.js";
import { logError } from "../../utils/log.js";
import { notAttemptedReason } from "../analytics/authOutcomeTelemetry.js";
import { withDeadline } from "../../utils/sleep.js";
import { axios_default } from "../../../vendor/axios/dist/esm/axios.js";
import { getOauthConfig, OAUTH_BETA_HEADER } from "../../constants/oauth.js";
import { claudeCodeUserAgent } from "../../utils/http.js";
import { hasSessionsTokenRequestId } from "../api/errorUtils.js";
import { serializeSettingsErrors } from "../../utils/fileStateCache.js";
import { writeToStderr } from "../../utils/process.js";
import { isArtifactMountMode } from "../artifacts/artifactMount.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { settingsPresenceSignal } from "./seating.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";

//@ chunk-4pc1m5n9.js:4155-4191 placement
/**
 * 探测托管设置是否可用的默认超时（10 秒）。
 */
var PROBE_TIMEOUT_MS = 1e4;
var MAX_BACKGROUND_FETCH_RETRIES = 5;
var POLL_INTERVAL_MS = 3600000;
var LOADING_BACKSTOP_MS = 30000;
//@ chunk-4pc1m5n9.js:4191-5287 placement
class RemoteManagedSettingsState {
  poller = null;
  loadingCompletePromise = null;
  loadingCompleteResolve = null;
  fetchSettledPromise = null;
  fetchSettledResolve = null;
  signedCacheShadowChecked = false;
  storedCopyShadow = undefined;
  storedCopyReported = false;
  storedCopyAtStart = undefined;
  liveAnswer = undefined;
  livePrincipalChecked = false;
  backstopReleased = false;
  refreshesHybridToken = true;
  prefetch = new PrefetchSlot();
  oauthRefreshLatch = {
    attempted: false,
    recoveries: {
      begun: 0,
      running: 0,
    },
  };
  createBarrier(e) {
    this.fetchSettledPromise = new Promise((resolve) => {
      this.fetchSettledResolve = resolve;
      e?.(resolve);
    });
    this.loadingCompletePromise = new Promise((resolve) => {
      this.loadingCompleteResolve = resolve;
    });
  }
  releaseLoadBarrier() {
    this.loadingCompleteResolve?.();
    this.loadingCompleteResolve = null;
  }
  releaseBarrier() {
    this.releaseLoadBarrier();
    this.fetchSettledResolve?.();
    this.fetchSettledResolve = null;
  }
  detachBarrier() {
    let loadingCompleteResolve = this.loadingCompleteResolve;
    let fetchSettledResolve = this.fetchSettledResolve;
    this.loadingCompleteResolve = null;
    this.loadingCompletePromise = null;
    this.fetchSettledResolve = null;
    this.fetchSettledPromise = null;
    if (!loadingCompleteResolve && !fetchSettledResolve) return null;
    return () => {
      loadingCompleteResolve?.();
      fetchSettledResolve?.();
    };
  }
  startPoller(poller) {
    this.poller = poller;
  }
  stopPoller() {
    this.poller?.[Symbol.dispose]();
    this.poller = null;
  }
}
//@ chunk-4pc1m5n9.js:5287-5312 placement
/**
 * 按 host 隔离的远程托管设置状态容器。
 */
var remoteSettingsStateSlots = new HostScoped(() => new RemoteManagedSettingsState());
//@ chunk-4pc1m5n9.js:5312-5348 placement
/**
 * 取当前 host 的远程托管设置状态（缓存、加载/拉取屏障、签名缓存影子等）。
 */
function currentRemoteSettingsState() {
  return remoteSettingsStateSlots.of(getRootSession().host);
}
//@ chunk-4pc1m5n9.js:5348-5745 placement
function initializeRemoteManagedSettingsLoadingPromise() {
  registerRemoteSettingsStartupWait();
  let e = currentRemoteSettingsState();
  if (e.loadingCompletePromise) return;
  if (computeRemoteSettingsEligibility())
    e.createBarrier((n) => {
      setTimeout(
        (s, r) => {
          if (r.fetchSettledResolve === s) {
            if (isSecuritySettingsDialogPending()) {
              logForDebugging(
                "Remote settings: Loading promise timeout deferred \u2014 consent dialog pending",
              );
              return;
            }
            logForDebugging(
              "Remote settings: Loading promise timed out, resolving anyway (load and fetch barriers)",
            );
            r.backstopReleased = true;
            markLoadBackstopReleased();
            r.releaseBarrier();
          }
        },
        LOADING_BACKSTOP_MS,
        n,
        e,
      );
    });
}
//@ chunk-4pc1m5n9.js:5745-5761 placement
function declareNoHybridTokenRefresh() {}
//@ chunk-4pc1m5n9.js:5761-6088 placement
function prefetchRemoteManagedSettings(e) {
  if (
    getGatewayAuth() ||
    !computeRemoteSettingsEligibility() ||
    false ||
    getRemoteSettingsPathOverride() ||
    isEvalPolicySnapshotOnly() ||
    getMockRemoteSettingsValue() !== undefined
  )
    return;
  if (getClaudeAIOAuthTokens()?.refreshToken && getStoredOauthAccountInfo() === undefined) return;
  let remoteManagedSettingsRawCache = getRemoteManagedSettingsRawCache();
  let s = remoteManagedSettingsRawCache ? computeChecksum(remoteManagedSettingsRawCache) : undefined;
  let r = currentRemoteSettingsState();
  let { oauthRefreshLatch } = r;
  r.prefetch.set(
    {
      checksum: s,
      epoch: getSyncCacheResetEpoch(),
      endpoint: getRemoteManagedSettingsEndpoint(),
      principal: remoteSettingsCredentialKey(),
    },
    async (S) =>
      fetchRemoteManagedSettings(
        isPolicyGraceEnabled()
          ? keepIfFresh(s, await settingsAgeMs(remoteManagedSettingsRawCache !== null, await readSyncAge()))
          : s,
        false,
        e,
        S,
        oauthRefreshLatch,
      ),
    (S) => S.success,
  );
}
//@ chunk-4pc1m5n9.js:6088-6198 placement
function clearRemoteManagedSettingsPrefetch() {
  let e = currentRemoteSettingsState();
  e.prefetch.clear();
  e.oauthRefreshLatch = {
    attempted: false,
    recoveries: {
      begun: 0,
      running: 0,
    },
  };
}
//@ chunk-4pc1m5n9.js:8688-8715 placement
function isEligibleForRemoteManagedSettings() {
  return computeRemoteSettingsEligibility();
}
//@ chunk-4pc1m5n9.js:8715-8820 placement
/**
 * 等待远程托管设置首次加载完成（若已启动）。
 */
async function waitForRemoteManagedSettingsToLoad() {
  if (hasManagedOrCoworkSurface()) return;
  let e = currentRemoteSettingsState();
  if (e.loadingCompletePromise) await e.loadingCompletePromise;
}
//@ chunk-4pc1m5n9.js:8820-9025 placement
function getRemoteManagedSettingsSignatureFacts() {
  let e = currentRemoteSettingsState();
  let storedCopyAtStart = e.storedCopyAtStart;
  return {
    storedCopy:
      storedCopyAtStart === undefined || storedCopyAtStart === "not_read"
        ? "not_read"
        : cacheTrustAnswer(storedCopyAtStart, e.storedCopyShadow),
    liveSigned: verifyLiveAnswerSignature({
      kind: "managed-settings",
      answer: e.liveAnswer,
      account: getStoredOauthAccountInfo(),
    }),
  };
}
//@ chunk-4pc1m5n9.js:9025-9108 placement
async function waitForRemoteManagedSettingsFetchToSettle() {
  let e = currentRemoteSettingsState();
  if (e.fetchSettledPromise) await e.fetchSettledPromise;
}
//@ chunk-4pc1m5n9.js:9108-9120 placement
setRemotePolicySettler(waitForRemoteManagedSettingsFetchToSettle, noteStoredLoginSurface);
//@ chunk-4pc1m5n9.js:9120-9131 placement
organizationAnswerState.wait = waitForRemoteManagedSettingsFetchToSettle;
//@ chunk-4pc1m5n9.js:9131-9147 placement
organizationAnswerState.ask = () => pollRemoteSettings();
//@ chunk-4pc1m5n9.js:9147-9161 placement
organizationAnswerState.fetches = computeRemoteSettingsEligibility;
//@ chunk-4pc1m5n9.js:9161-9204 placement
function didRemoteManagedSettingsBackstopRelease() {
  return currentRemoteSettingsState().backstopReleased;
}
//@ chunk-4pc1m5n9.js:9204-9236 placement
function isRemoteManagedSettingsColdStartPending() {
  return holdsNoServedSettings(computeRemoteSettingsEligibility());
}
//@ chunk-4pc1m5n9.js:9236-9277 placement
function isRemoteManagedProvisionPending() {
  return (
    !isSdkEntrypoint() && computeRemoteSettingsEligibility() && unverifiedRemoteCacheWithholdsProvisions()
  );
}
//@ chunk-4pc1m5n9.js:9277-9352 placement
function registerRemoteSettingsStartupWait() {
  setPolicyColdStartWaiter(async () => {
    if (isRemoteManagedProvisionPending()) await waitForRemoteManagedSettingsFetchToSettle();
    else if (isRemoteManagedSettingsColdStartPending()) await waitForRemoteManagedSettingsToLoad();
  });
}
//@ chunk-4pc1m5n9.js:22630-23210 placement
async function clearRemoteManagedSettingsCache(e) {
  stopBackgroundPolling();
  resetRemoteSettingsSyncCache();
  invalidateCommandNames();
  clearRemoteManagedSettingsPrefetch();
  currentRemoteSettingsState().detachBarrier()?.();
  if (isDisklessWithoutState(e)) return;
  if (hasManagedSettings()) return;
  let n =
    isStorageV5Enabled() && e !== undefined
      ? await e
          .delete(STORAGE_SPACES.state(HELPER_CONSENT_STATE_ID))
          .then((s) => (s.ok ? undefined : formatStorageError(s.error)))
      : await rm(getHelperConsentPath(), {
          force: true,
        }).then(() => {
          return;
        }, errorMessage);
  if (n !== undefined) {
    logForDebugging(`Remote settings: Failed to remove helper consent - ${n}`);
    return;
  }
  if (isStorageV5Enabled() && !getRemoteSettingsPathOverride())
    remoteSettingsFileWritten("helperConsent", null);
  if (getRemoteSettingsPathOverride()) return;
  await removeSignatureFiles(getSettingsPath());
  await removeSyncStamp();
  if (isStorageV5Enabled() && e !== undefined) {
    if ((await e.delete(STORAGE_SPACES.state("remote-settings"))).ok)
      remoteSettingsFileWritten("cache", null);
    return;
  }
  try {
    let settingsPath = getSettingsPath();
    await unlink(settingsPath);
  } catch (error) {
    if (isStorageV5Enabled() && !isENOENT(error)) return;
  }
  if (isStorageV5Enabled()) remoteSettingsFileWritten("cache", null);
}
//@ chunk-4pc1m5n9.js:23210-23217 placement
var lastOutcomeReason;
//@ chunk-4pc1m5n9.js:23217-23311 placement
async function fetchAndLoadRemoteManagedSettingsAndNotify(e = {}) {
  try {
    return await fetchAndLoadRemoteManagedSettings(e);
  } finally {
    let n = () => parseRemoteManagedSettings().settings;
    reserveRemoteStaticPayload(n);
    applyRemotePolicyMidSession(n);
  }
}
//@ chunk-4pc1m5n9.js:33728-34222 placement
function recordRemoteSettingsStatus(e) {
  if (!computeRemoteSettingsEligibility()) {
    let ineligibleReason = getIneligibleReason();
    if (ineligibleReason)
      setLastLoadStatus({
        state: "ineligible",
        reason: ineligibleReason,
      });
    return;
  }
  let n = lastFailureRulings() !== undefined;
  if (e.fetchSucceeded) {
    setLastLoadStatus({
      state: "ok",
      hasSettings: e.settings !== null && Object.keys(e.settings).length > 0,
    });
    if (n) invalidateCommandNames();
    return;
  }
  if (e.failure) {
    let r = e.settings !== null && Object.keys(e.settings).length > 0;
    setLastLoadStatus(
      r
        ? {
            state: "stale_cache",
            failure: e.failure,
            transportEnvWithheld: !isRemoteManagedSettingsVerified(),
          }
        : {
            state: "failed",
            failure: e.failure,
            ...(r &&
              getRemotePolicyTierWithKind().settings !== null && {
                restrictionsOnly: true,
              }),
          },
    );
    if (n || e.failure.rulings !== undefined) invalidateCommandNames();
  }
}
//@ chunk-4pc1m5n9.js:34222-34325 placement
function lastFailureRulings() {
  let lastLoadStatus = getLastLoadStatus();
  return lastLoadStatus?.state === "failed" || lastLoadStatus?.state === "stale_cache"
    ? lastLoadStatus.failure.rulings
    : undefined;
}
//@ chunk-4pc1m5n9.js:34325-35257 placement
async function loadRemoteManagedSettings(e, n, s) {
  markLoadCycleBegun();
  registerRemoteSettingsStartupWait();
  setSettingsReader(settingsOutcomeFields);
  let r = currentRemoteSettingsState();
  let remoteSettingsEligibility = computeRemoteSettingsEligibility();
  if (hasManagedSettings())
    try {
      logEvent("tengu_cowork_cloud_launch_credential", {
        credential_road: fromEnum(settingsAuthSource()),
        asks: remoteSettingsEligibility,
      });
      if (isWslEnvironment())
        logFeatureSad("cowork_cloud_launch", "name_on_wsl_kernel", {
          container_launch: isCoworkWithRemote(),
        });
    } catch (error) {
      logError(error);
    }
  if (remoteSettingsEligibility && !r.loadingCompletePromise) r.createBarrier();
  let fetchSettledResolve = r.fetchSettledResolve;
  let syncCacheResetEpoch = getSyncCacheResetEpoch();
  let R = getRemoteManagedSettingsSyncFromCache() !== null;
  if (R && r.loadingCompleteResolve) r.releaseLoadBarrier();
  let C = s?.startupAwaited === true;
  if (R && !C)
    recordManagedConfigResult("settings", {
      source: "cache",
      hadCache: R,
      awaited: C,
    });
  let T = {};
  let source = "error";
  let E = C ? beginStartupBlock("settings") : null;
  try {
    let A = await fetchAndLoadRemoteManagedSettingsAndNotify({
      ...s,
      showSecurityDialog: e,
      storageV5: n,
      cycleFacts: T,
    });
    let { settings, fetchSucceeded } = A;
    source = getRemoteSettingsSourceLabel(A);
    if (getSyncCacheResetEpoch() === syncCacheResetEpoch) recordRemoteSettingsStatus(A);
    if (
      getSyncCacheResetEpoch() === syncCacheResetEpoch &&
      computeRemoteSettingsEligibility() &&
      !getRemoteSettingsPathOverride() &&
      !isEvalPolicySnapshotOnly()
    )
      startRemoteSettingsPoller(e, n, s?.credentials);
    if (settings !== null && A.changesNothing !== true) loadRemoteManagedSettings_2();
    return fetchSucceeded;
  } finally {
    releaseBarrierIfSame(fetchSettledResolve);
    if (getSyncCacheResetEpoch() === syncCacheResetEpoch) markLoadCycleEnded();
    if (T.outcomeReason !== undefined) lastOutcomeReason = T.outcomeReason;
    recordManagedConfigResult("settings", {
      source,
      hadCache: R,
      awaited: C,
      fetchMs: T.fetchMs,
    });
    E?.("completed");
  }
}
//@ chunk-4pc1m5n9.js:35257-35375 placement
function settingsOutcomeFields() {
  let ineligibleReason = getIneligibleReason();
  let n = computeRemoteSettingsEligibility()
    ? lastOutcomeReason
    : notAttemptedReason(managedConfigNotAttemptedInput(ineligibleReason));
  return {
    settings_outcome_reason: fromEnumOpt(n),
    settings_ineligible_reason: fromEnumOpt(ineligibleReason),
  };
}
//@ chunk-4pc1m5n9.js:35375-35771 placement
function getRemoteSettingsSourceLabel({ resolution, settings }) {
  switch (resolution) {
    case "applied":
      return settings !== null && Object.keys(settings).length > 0 ? "fetch" : "none";
    case "none":
      return "none";
    case "local":
      return "cache";
    case "failed":
    case "ruled_empty":
    case "no_consent_surface":
      return "error";
    case "reset":
    case "consent_superseded":
      return "superseded";
    case "rejected":
      return "rejected";
    case "deferred":
      return "deferred";
    case "ineligible":
      return "ineligible";
  }
}
//@ chunk-4pc1m5n9.js:35771-35867 placement
/**
 * 如果传入的结算回调仍是当前加载的回调，就释放加载/拉取屏障。
 */
function releaseBarrierIfSame(fetchSettledResolve) {
  let n = currentRemoteSettingsState();
  if (n.fetchSettledResolve && n.fetchSettledResolve === fetchSettledResolve) n.releaseBarrier();
}
//@ chunk-4pc1m5n9.js:35867-35936 placement
/**
 * 后台刷新远程托管设置，成功后让设置缓存失效并通知变更。
 */
async function refreshRemoteManagedSettings(e, storageV5, credentials, r) {
  return (await refreshRemoteManagedSettingsWithOutcome(e, storageV5, credentials, r)).fetchSucceeded;
}
//@ chunk-4pc1m5n9.js:35936-35948 placement
var STARTUP_AWAIT_DEADLINE_MS = 5000;
//@ chunk-4pc1m5n9.js:35948-36411 placement
async function refreshRemoteManagedSettingsForStartup(standaloneSecurityDialog, storageV5, credentials) {
  let r;
  let promise = new Promise((resolve) => {
    r = armStartupConsentRelease(() => resolve("consent_pending"));
  });
  let S = beginStartupBlock("settings", {
    supersede: true,
  });
  let k = refreshRemoteManagedSettingsWithOutcome(standaloneSecurityDialog, storageV5, credentials, {
    startupAwaited: true,
    callerRecordsBarrier: true,
  }).then(
    ({ fetchSucceeded }) => (fetchSucceeded ? "refreshed" : "failed"),
    (error) => {
      logError(error);
      return "failed";
    },
  );
  try {
    let R = await withDeadline(Promise.race([k, promise]), STARTUP_AWAIT_DEADLINE_MS);
    S(R === undefined ? "timed_out" : "completed");
    if (R === undefined) {
      logFeatureSad("remote_managed_settings_startup_await", "deadline_expired");
      return "timed_out";
    }
    return R;
  } finally {
    r?.();
    S("completed");
  }
}
//@ chunk-4pc1m5n9.js:36411-36890 placement
async function probeManagedSettingsForBearer(e, { timeoutMs: n = PROBE_TIMEOUT_MS } = {}) {
  let s = await axios_default.get(`${getOauthConfig().BASE_API_URL}/api/claude_code/settings`, {
    headers: {
      "User-Agent": claudeCodeUserAgent(),
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      Authorization: `Bearer ${e}`,
      "anthropic-beta": OAUTH_BETA_HEADER,
    },
    timeout: n,
    signal: AbortSignal.timeout(n),
    maxRedirects: 0,
    adapter: "http",
    validateStatus: (S) => S === 200 || S === 204 || S === 304 || S === 404,
  });
  let headers = s.headers ?? {};
  let y = headers["content-type"];
  return {
    status: s.status,
    contentType: typeof y === "string" ? y : "",
    requestIdPresent: hasSessionsTokenRequestId(headers),
  };
}
//@ chunk-4pc1m5n9.js:36890-37968 placement
async function refreshRemoteManagedSettingsWithOutcome(e, n, s, r) {
  let y = r?.startupAwaited === true;
  stopBackgroundPolling();
  resetRemoteSettingsSyncCache();
  markLoadCycleBegun();
  let syncCacheResetEpoch = getSyncCacheResetEpoch();
  let k = currentRemoteSettingsState();
  let R = k.detachBarrier();
  if (!computeRemoteSettingsEligibility()) {
    k.prefetch.clear();
    R?.();
    recordRemoteSettingsStatus({
      settings: null,
      fetchSucceeded: true,
      resolution: "ineligible",
    });
    recordManagedConfigResult("settings", {
      source: "ineligible",
      hadCache: false,
      awaited: y,
    });
    loadRemoteManagedSettings_2();
    applyRemotePolicyMidSession(() => parseRemoteManagedSettings().settings);
    return {
      fetchSucceeded: true,
    };
  }
  initializeRemoteManagedSettingsLoadingPromise();
  let fetchSettledResolve = k.fetchSettledResolve;
  if (R)
    if (k.fetchSettledPromise) k.fetchSettledPromise.then(R);
    else R();
  let T;
  let O;
  let E = {};
  let source = "error";
  let P =
    y && !r?.callerRecordsBarrier
      ? beginStartupBlock("settings", {
          supersede: true,
        })
      : null;
  try {
    O = await fetchAndLoadRemoteManagedSettingsAndNotify({
      showSecurityDialog: e,
      storageV5: n,
      credentials: s,
      startupAwaited: y,
      maxRetries: r?.maxRetries,
      cycleFacts: E,
    });
    source = getRemoteSettingsSourceLabel(O);
    T = {
      fetchSucceeded: O.fetchSucceeded,
      ...(O.failure && {
        failure: O.failure,
      }),
    };
  } finally {
    releaseBarrierIfSame(fetchSettledResolve);
    if (getSyncCacheResetEpoch() === syncCacheResetEpoch) markLoadCycleEnded();
    if (E.outcomeReason !== undefined) lastOutcomeReason = E.outcomeReason;
    recordManagedConfigResult("settings", {
      source,
      hadCache: E.hadCache === true,
      awaited: y,
      fetchMs: E.fetchMs,
    });
    P?.("completed");
  }
  logForDebugging("Remote settings: Refreshed after auth change");
  if (getSyncCacheResetEpoch() !== syncCacheResetEpoch) {
    logForDebugging("Remote settings: Refresh superseded by a login/logout reset; not notifying");
    return T;
  }
  recordRemoteSettingsStatus(O);
  if (!getRemoteSettingsPathOverride()) startRemoteSettingsPoller(e, n, s);
  loadRemoteManagedSettings_2();
  return T;
}
//@ chunk-4pc1m5n9.js:38764-38908 placement = formatDirectoryList (1)
/**
 * （切分错误）格式化首个目录问题："(<路径>: <消息>, and N more)"。
 */
function firstRulingClause(directories) {
  let [n] = serializeSettingsErrors(directories?.slice(0, 1) ?? []);
  if (!n || !directories) return "";
  let s = directories.length - 1;
  return ` (${n.path}: ${n.message}${s > 0 ? `, and ${s} more` : ""})`;
}
//@ chunk-4pc1m5n9.js:38908-38994 placement
/**
 * 把 URL 规范成 origin + 路径（去掉结尾斜杠），用于错误与日志里指代网关。
 */
function originWithPath(url) {
  let { origin, pathname } = new URL(url);
  return `${origin}${pathname.replace(/\/$/, "")}`;
}
//@ chunk-4pc1m5n9.js:38994-39116 placement
function gatewayPolicyPrefix(url) {
  return `Claude Desktop runs Claude Code under your organization's policy from the gateway at ${originWithPath(url)}, but`;
}
//@ chunk-4pc1m5n9.js:39116-40272 placement
function hostLaunchedGatewayRefusal(initialMainLoopModel) {
  let gatewayAuth = getGatewayAuth();
  let hostVerdict = gatewayAuth?.hostVerdict;
  if (!gatewayAuth || !hostVerdict) return;
  if ("unresolvedReason" in hostVerdict)
    return `${gatewayPolicyPrefix(gatewayAuth.url)} it could not be checked. ${hostVerdict.unresolvedReason} If this keeps happening, contact your administrator.`;
  if (hostVerdict.verified) return;
  let reason = hostVerdict.reason ?? "it is not Anthropic-operated or inside your organization's network.";
  if (initialMainLoopModel)
    return `Your organization requires managed settings, but the gateway at ${originWithPath(gatewayAuth.url)} is not an accepted source for them: ${reason} Contact your administrator.`;
  if (hostVerdict.codeTabRulesUnanswered !== undefined)
    return `${gatewayPolicyPrefix(gatewayAuth.url)} Claude Code couldn't ask that gateway whether it has rules for this session (${hostVerdict.codeTabRulesUnanswered}). Send your message again. This check runs because Claude Code on ${hostname()} doesn't take settings from that gateway: ${reason}`;
  if (hostVerdict.hasCodeTabRules)
    return `${gatewayPolicyPrefix(gatewayAuth.url)} Claude Code on ${hostname()} doesn't take settings from that gateway: ${reason}`;
  if (hostVerdict.hasCodeTabRules === false) {
    logForDebugging(
      `[gateway] ${originWithPath(gatewayAuth.url)} is not accepted as a source of managed settings. It says that it has no Code tab rules for this person, so no warning is shown`,
    );
    return;
  }
  warnStartingWithoutSettings(
    `the gateway at ${gatewayAuth.url} is not an accepted source for them: ${reason.replace(/\.\s*$/, "")}`,
  );
  return;
}
//@ chunk-4pc1m5n9.js:40272-41082 placement
function hostLaunchedGatewayLoadRefusal(remoteManagedSettings) {
  let gatewayAuth = getGatewayAuth();
  if (!gatewayAuth || !isHostVerifiedGatewayAuth(gatewayAuth)) return;
  let s = gatewayPolicyPrefix(gatewayAuth.url);
  let lastLoadStatus = getLastLoadStatus();
  let failure =
    lastLoadStatus?.state === "failed" || lastLoadStatus?.state === "stale_cache"
      ? lastLoadStatus.failure
      : undefined;
  if (failure?.errorKind === "gateway_public_address")
    return `${s} this machine is no longer reaching it from inside your organization's network (it may have left that network or VPN, or the gateway's name now resolves elsewhere), so the policy was not fetched. Reconnect to that network and start again, or contact your administrator.`;
  if (failure?.errorKind === "ruled_empty")
    return `${s} none of the settings it served could be applied as written${firstRulingClause(failure.rulings)}. Ask your administrator to fix them.`;
  if (!remoteManagedSettings || failure) {
    let S = failure ? `: ${describeFetchFailure(failure.errorKind, failure.httpStatus)}` : "";
    return `${s} the policy could not be loaded from it${S}. Check your network connection, or contact your administrator.`;
  }
  noteHostLaunchedGatewayWithoutPolicy();
  return;
}
//@ chunk-4pc1m5n9.js:41082-41387 placement
function noteHostLaunchedGatewayWithoutPolicy() {
  let gatewayAuth = getGatewayAuth();
  if (!gatewayAuth || !isHostVerifiedGatewayAuth(gatewayAuth)) return;
  let lastLoadStatus = getLastLoadStatus();
  if (lastLoadStatus?.state === "ok" && !lastLoadStatus.hasSettings)
    warnStartingWithoutSettings(
      `the gateway at ${gatewayAuth.url} has no Claude Code policy for this Desktop session (self-hosted gateway admins: set \`serve_to_desktop: true\` on this user's policy, or change \`cli\` to \`code\` in every policy)`,
    );
}
//@ chunk-4pc1m5n9.js:41387-41525 placement
function warnStartingWithoutSettings(e) {
  let n = `Starting without your organization's managed settings: ${e}.`;
  logForDebugging(`Remote settings: ${n}`, {
    level: "warn",
  });
  writeToStderr(`${n}
`);
}
//@ chunk-4pc1m5n9.js:41525-41624 placement
/**
 * 组织要求远程托管设置、但本次加载失败时的提示前缀。
 */
var REQUIRED_SETTINGS_LOAD_FAILED_MESSAGE =
  "Your organization requires remote managed settings to load, but they could not be loaded.";
//@ chunk-4pc1m5n9.js:41624-42156 placement
async function validateForceRemoteSettingsRefresh(e, machineForcedRefresh) {
  try {
    if (await e()) {
      let S = machineForcedRefresh();
      return S === undefined
        ? {
            valid: true,
          }
        : {
            valid: false,
            message: `${REQUIRED_SETTINGS_LOAD_FAILED_MESSAGE} ${S}`,
          };
    }
  } catch (error) {
    logError(error);
  }
  let directories = lastFailureRulings();
  if (directories !== undefined)
    return {
      valid: false,
      message: `${REQUIRED_SETTINGS_LOAD_FAILED_MESSAGE} None of the settings the server returned could be applied as written${firstRulingClause(directories)}; ask your administrator to fix them.`,
    };
  let r = "claude auth login";
  let y = isArtifactMountMode()
    ? "You can check your network connection or contact your admin."
    : `Run \`${r}\` to re-authenticate, check your network connection, or contact your administrator.`;
  return {
    valid: false,
    message: `${REQUIRED_SETTINGS_LOAD_FAILED_MESSAGE} ${y}`,
  };
}
//@ chunk-4pc1m5n9.js:42156-42744 placement
/**
 * 后台轮询远程设置，有变化时通知。
 */
async function pollRemoteSettings(showSecurityDialog, storageV5, credentials) {
  if (!computeRemoteSettingsEligibility()) return;
  currentRemoteSettingsState().refreshesHybridToken = true;
  let remoteManagedSettingsSyncFromCache = getRemoteManagedSettingsSyncFromCache();
  let y = remoteManagedSettingsSyncFromCache ? jsonStringify(remoteManagedSettingsSyncFromCache) : null;
  let S = isRemoteManagedSettingsVerified();
  let k = settingsPresenceSignal.get() === "served";
  let syncCacheResetEpoch = getSyncCacheResetEpoch();
  try {
    let C = await fetchAndLoadRemoteManagedSettingsAndNotify({
      background: true,
      showSecurityDialog,
      storageV5,
      credentials,
    });
    if (getSyncCacheResetEpoch() !== syncCacheResetEpoch) {
      logForDebugging("Remote settings: Background poll superseded by a login/logout reset; not notifying");
      return;
    }
    if (C.fetchSucceeded || C.failure?.errorKind === "ruled_empty") recordRemoteSettingsStatus(C);
    let remoteManagedSettingsSyncFromCache = getRemoteManagedSettingsSyncFromCache();
    let E =
      (remoteManagedSettingsSyncFromCache ? jsonStringify(remoteManagedSettingsSyncFromCache) : null) !== y;
    let A = !S && isRemoteManagedSettingsVerified();
    let P = hasManagedSettings() && !k && settingsPresenceSignal.get() === "served";
    if (E || A || P) {
      logForDebugging(
        E
          ? "Remote settings: Changed during background poll"
          : "Remote settings: Confirmed by a background poll",
      );
      loadRemoteManagedSettings_2();
    }
  } catch {}
}
//@ chunk-4pc1m5n9.js:42744-42882 placement
function startRemoteSettingsPoller(showSecurityDialog, storageV5, credentials) {
  let r = currentRemoteSettingsState();
  if (r.poller !== null) return;
  if (!computeRemoteSettingsEligibility()) return;
  let interactionAwarePoll = startInteractionAwarePoll(
    () => void pollRemoteSettings(showSecurityDialog, storageV5, credentials),
    POLL_INTERVAL_MS,
    {
      unref: true,
    },
  );
  r.startPoller(interactionAwarePoll);
  registerCleanup(interactionAwarePoll);
}
//@ chunk-4pc1m5n9.js:42882-42914 placement
function stopBackgroundPolling() {
  currentRemoteSettingsState().stopPoller();
}
export {
  validateForceRemoteSettingsRefresh,
  refreshRemoteManagedSettings,
  refreshRemoteManagedSettingsForStartup,
  declareNoHybridTokenRefresh,
  waitForRemoteManagedSettingsFetchToSettle,
  getRemoteManagedSettingsSignatureFacts,
  hostLaunchedGatewayRefusal,
  loadRemoteManagedSettings,
  hostLaunchedGatewayLoadRefusal,
  noteHostLaunchedGatewayWithoutPolicy,
  waitForRemoteManagedSettingsToLoad,
  MAX_BACKGROUND_FETCH_RETRIES,
  PROBE_TIMEOUT_MS,
  currentRemoteSettingsState,
  clearRemoteManagedSettingsCache,
  isEligibleForRemoteManagedSettings,
  initializeRemoteManagedSettingsLoadingPromise,
  prefetchRemoteManagedSettings,
  isRemoteManagedSettingsColdStartPending,
  didRemoteManagedSettingsBackstopRelease,
  stopBackgroundPolling,
  clearRemoteManagedSettingsPrefetch,
  firstRulingClause,
  refreshRemoteManagedSettingsWithOutcome,
  isRemoteManagedProvisionPending,
  probeManagedSettingsForBearer,
};
