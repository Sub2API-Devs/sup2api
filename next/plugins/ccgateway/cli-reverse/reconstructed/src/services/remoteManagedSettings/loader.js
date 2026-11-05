/**
 * services/remoteManagedSettings/loader.ts
 *
 * 2.1.316 新增（门面模块 hostLaunchedGatewayRefusal）。远程托管设置加载与网关拒绝。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-a28agxjs.js (47)
 * attribution: placement 47
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import {
  getRootSession,
  getGatewayAuth,
  isHostVerifiedGatewayAuth,
  isGatewayRequiredByHostPolicy,
} from "../../bootstrap/state.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-a28agxjs.js:4164-4200 placement
/**
 * 探测托管设置是否可用的默认超时（10 秒）。
 */
var PROBE_TIMEOUT_MS = 1e4;
var MAX_BACKGROUND_FETCH_RETRIES = 5;
var POLL_INTERVAL_MS = 3600000;
var LOADING_BACKSTOP_MS = 30000;
//@ chunk-a28agxjs.js:4200-5296 placement
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
  createBarrier(onCreate) {
    this.fetchSettledPromise = new Promise((resolve) => {
      this.fetchSettledResolve = resolve;
      onCreate?.(resolve);
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
//@ chunk-a28agxjs.js:5296-5321 placement
/**
 * 按 host 隔离的远程托管设置状态容器。
 */
var remoteSettingsStateSlots; // deferred: uses RemoteManagedSettingsState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-a28agxjs.js:5296", () => {
  remoteSettingsStateSlots = new HostScoped(() => new RemoteManagedSettingsState());
});
//@ chunk-a28agxjs.js:5321-5357 placement
/**
 * 取当前 host 的远程托管设置状态（缓存、加载/拉取屏障、签名缓存影子等）。
 */
function currentRemoteSettingsState() {
  return remoteSettingsStateSlots.of(getRootSession().host);
}
//@ chunk-a28agxjs.js:5357-5754 placement
function initializeRemoteManagedSettingsLoadingPromise() {
  registerRemoteSettingsStartupWait();
  let state = currentRemoteSettingsState();
  if (state.loadingCompletePromise) return;
  if (computeRemoteSettingsEligibility())
    state.createBarrier((resolveFetch) => {
      setTimeout(
        (resolve, state) => {
          if (state.fetchSettledResolve === resolve) {
            if (isSecuritySettingsDialogPending()) {
              logForDebugging(
                "Remote settings: Loading promise timeout deferred \u2014 consent dialog pending",
              );
              return;
            }
            logForDebugging(
              "Remote settings: Loading promise timed out, resolving anyway (load and fetch barriers)",
            );
            state.backstopReleased = true;
            markLoadBackstopReleased();
            state.releaseBarrier();
          }
        },
        LOADING_BACKSTOP_MS,
        resolveFetch,
        state,
      );
    });
}
//@ chunk-a28agxjs.js:5754-5770 placement
function declareNoHybridTokenRefresh() {}
//@ chunk-a28agxjs.js:5770-6097 placement
function prefetchRemoteManagedSettings(credentials) {
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
  let checksum = remoteManagedSettingsRawCache ? computeChecksum(remoteManagedSettingsRawCache) : undefined;
  let state = currentRemoteSettingsState();
  let { oauthRefreshLatch } = state;
  state.prefetch.set(
    {
      checksum,
      epoch: getSyncCacheResetEpoch(),
      endpoint: getRemoteManagedSettingsEndpoint(),
      principal: remoteSettingsCredentialKey(),
    },
    async (signal) =>
      fetchRemoteManagedSettings(
        isPolicyGraceEnabled()
          ? keepIfFresh(
              checksum,
              await settingsAgeMs(remoteManagedSettingsRawCache !== null, await readSyncAge()),
            )
          : checksum,
        false,
        credentials,
        signal,
        oauthRefreshLatch,
      ),
    (result) => result.success,
  );
}
//@ chunk-a28agxjs.js:6097-6207 placement
function clearRemoteManagedSettingsPrefetch() {
  let state = currentRemoteSettingsState();
  state.prefetch.clear();
  state.oauthRefreshLatch = {
    attempted: false,
    recoveries: {
      begun: 0,
      running: 0,
    },
  };
}
//@ chunk-a28agxjs.js:8697-8724 placement
function isEligibleForRemoteManagedSettings() {
  return computeRemoteSettingsEligibility();
}
//@ chunk-a28agxjs.js:8724-8829 placement
/**
 * 等待远程托管设置首次加载完成（若已启动）。
 */
async function waitForRemoteManagedSettingsToLoad() {
  if (hasManagedOrCoworkSurface()) return;
  let state = currentRemoteSettingsState();
  if (state.loadingCompletePromise) await state.loadingCompletePromise;
}
//@ chunk-a28agxjs.js:8829-9034 placement
function getRemoteManagedSettingsSignatureFacts() {
  let state = currentRemoteSettingsState();
  let storedCopyAtStart = state.storedCopyAtStart;
  return {
    storedCopy:
      storedCopyAtStart === undefined || storedCopyAtStart === "not_read"
        ? "not_read"
        : cacheTrustAnswer(storedCopyAtStart, state.storedCopyShadow),
    liveSigned: verifyLiveAnswerSignature({
      kind: "managed-settings",
      answer: state.liveAnswer,
      account: getStoredOauthAccountInfo(),
    }),
  };
}
//@ chunk-a28agxjs.js:9034-9117 placement
async function waitForRemoteManagedSettingsFetchToSettle() {
  let state = currentRemoteSettingsState();
  if (state.fetchSettledPromise) await state.fetchSettledPromise;
}
//@ chunk-a28agxjs.js:9117-9129 placement
// deferred: uses setRemotePolicySettler (../../utils/model/allowedProviders.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-a28agxjs.js:9117", () => {
  setRemotePolicySettler(waitForRemoteManagedSettingsFetchToSettle, noteStoredLoginSurface);
});
//@ chunk-a28agxjs.js:9129-9140 placement
// deferred: uses organizationAnswerState (../../utils/plugins/commandSource.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-a28agxjs.js:9129", () => {
  organizationAnswerState.wait = waitForRemoteManagedSettingsFetchToSettle;
});
//@ chunk-a28agxjs.js:9140-9156 placement
// deferred: uses organizationAnswerState (../../utils/plugins/commandSource.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-a28agxjs.js:9140", () => {
  organizationAnswerState.ask = () => pollRemoteSettings();
});
//@ chunk-a28agxjs.js:9156-9170 placement
// deferred: uses organizationAnswerState (../../utils/plugins/commandSource.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-a28agxjs.js:9156", () => {
  organizationAnswerState.fetches = computeRemoteSettingsEligibility;
});
//@ chunk-a28agxjs.js:9170-9213 placement
function didRemoteManagedSettingsBackstopRelease() {
  return currentRemoteSettingsState().backstopReleased;
}
//@ chunk-a28agxjs.js:9213-9245 placement
function isRemoteManagedSettingsColdStartPending() {
  return holdsNoServedSettings(computeRemoteSettingsEligibility());
}
//@ chunk-a28agxjs.js:9245-9286 placement
function isRemoteManagedProvisionPending() {
  return (
    !isSdkEntrypoint() && computeRemoteSettingsEligibility() && unverifiedRemoteCacheWithholdsProvisions()
  );
}
//@ chunk-a28agxjs.js:9286-9361 placement
function registerRemoteSettingsStartupWait() {
  setPolicyColdStartWaiter(async () => {
    if (isRemoteManagedProvisionPending()) await waitForRemoteManagedSettingsFetchToSettle();
    else if (isRemoteManagedSettingsColdStartPending()) await waitForRemoteManagedSettingsToLoad();
  });
}
//@ chunk-a28agxjs.js:22640-23219 placement
async function clearRemoteManagedSettingsCache(storageV5) {
  stopBackgroundPolling();
  resetRemoteSettingsSyncCache();
  invalidateCommandNames();
  clearRemoteManagedSettingsPrefetch();
  currentRemoteSettingsState().detachBarrier()?.();
  if (isDisklessWithoutState(storageV5)) return;
  if (hasManagedSettings()) return;
  let helperError =
    isStorageV5Enabled() && storageV5 !== undefined
      ? await storageV5
          .delete(STORAGE_SPACES.state(HELPER_CONSENT_STATE_ID))
          .then((deleteResult) => (deleteResult.ok ? undefined : formatStorageError(deleteResult.error)))
      : await rm(getHelperConsentPath(), {
          force: true,
        }).then(() => {
          return;
        }, errorMessage);
  if (helperError !== undefined) {
    logForDebugging(`Remote settings: Failed to remove helper consent - ${helperError}`);
    return;
  }
  if (isStorageV5Enabled() && !getRemoteSettingsPathOverride())
    remoteSettingsFileWritten("helperConsent", null);
  if (getRemoteSettingsPathOverride()) return;
  await removeSignatureFiles(getSettingsPath());
  await removeSyncStamp();
  if (isStorageV5Enabled() && storageV5 !== undefined) {
    if ((await storageV5.delete(STORAGE_SPACES.state("remote-settings"))).ok)
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
//@ chunk-a28agxjs.js:23219-23226 placement
var lastOutcomeReason;
//@ chunk-a28agxjs.js:23226-23321 placement
async function fetchAndLoadRemoteManagedSettingsAndNotify(options = {}) {
  try {
    return await fetchAndLoadRemoteManagedSettings(options);
  } finally {
    let currentSettings = () => parseRemoteManagedSettings().settings;
    reserveRemoteStaticPayload(currentSettings);
    applyRemotePolicyMidSession(currentSettings);
  }
}
//@ chunk-a28agxjs.js:33778-34273 placement
function recordRemoteSettingsStatus(result) {
  if (!computeRemoteSettingsEligibility()) {
    let ineligibleReason = getIneligibleReason();
    if (ineligibleReason)
      setLastLoadStatus({
        state: "ineligible",
        reason: ineligibleReason,
      });
    return;
  }
  let hadRulings = lastFailureRulings() !== undefined;
  if (result.fetchSucceeded) {
    setLastLoadStatus({
      state: "ok",
      hasSettings: result.settings !== null && Object.keys(result.settings).length > 0,
    });
    if (hadRulings) invalidateCommandNames();
    return;
  }
  if (result.failure) {
    let hasSettings = result.settings !== null && Object.keys(result.settings).length > 0;
    setLastLoadStatus(
      hasSettings
        ? {
            state: "stale_cache",
            failure: result.failure,
            transportEnvWithheld: !isRemoteManagedSettingsVerified(),
          }
        : {
            state: "failed",
            failure: result.failure,
            ...(hasSettings &&
              getRemotePolicyTierWithKind().settings !== null && {
                restrictionsOnly: true,
              }),
          },
    );
    if (hadRulings || result.failure.rulings !== undefined) invalidateCommandNames();
  }
}
//@ chunk-a28agxjs.js:34273-34376 placement
function lastFailureRulings() {
  let lastLoadStatus = getLastLoadStatus();
  return lastLoadStatus?.state === "failed" || lastLoadStatus?.state === "stale_cache"
    ? lastLoadStatus.failure.rulings
    : undefined;
}
//@ chunk-a28agxjs.js:34376-35308 placement
async function loadRemoteManagedSettings(showSecurityDialog, storageV5, options) {
  markLoadCycleBegun();
  registerRemoteSettingsStartupWait();
  setSettingsReader(settingsOutcomeFields);
  let state = currentRemoteSettingsState();
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
  if (remoteSettingsEligibility && !state.loadingCompletePromise) state.createBarrier();
  let fetchSettledResolve = state.fetchSettledResolve;
  let syncCacheResetEpoch = getSyncCacheResetEpoch();
  let hadCache = getRemoteManagedSettingsSyncFromCache() !== null;
  if (hadCache && state.loadingCompleteResolve) state.releaseLoadBarrier();
  let awaited = options?.startupAwaited === true;
  if (hadCache && !awaited)
    recordManagedConfigResult("settings", {
      source: "cache",
      hadCache,
      awaited,
    });
  let cycleFacts = {};
  let source = "error";
  let startupBlock = awaited ? beginStartupBlock("settings") : null;
  try {
    let result = await fetchAndLoadRemoteManagedSettingsAndNotify({
      ...options,
      showSecurityDialog,
      storageV5,
      cycleFacts,
    });
    let { settings, fetchSucceeded } = result;
    source = getRemoteSettingsSourceLabel(result);
    if (getSyncCacheResetEpoch() === syncCacheResetEpoch) recordRemoteSettingsStatus(result);
    if (
      getSyncCacheResetEpoch() === syncCacheResetEpoch &&
      computeRemoteSettingsEligibility() &&
      !getRemoteSettingsPathOverride() &&
      !isEvalPolicySnapshotOnly()
    )
      startRemoteSettingsPoller(showSecurityDialog, storageV5, options?.credentials);
    if (settings !== null && result.changesNothing !== true) loadRemoteManagedSettings_2();
    return fetchSucceeded;
  } finally {
    releaseBarrierIfSame(fetchSettledResolve);
    if (getSyncCacheResetEpoch() === syncCacheResetEpoch) markLoadCycleEnded();
    if (cycleFacts.outcomeReason !== undefined) lastOutcomeReason = cycleFacts.outcomeReason;
    recordManagedConfigResult("settings", {
      source,
      hadCache,
      awaited,
      fetchMs: cycleFacts.fetchMs,
    });
    startupBlock?.("completed");
  }
}
//@ chunk-a28agxjs.js:35308-35427 placement
function settingsOutcomeFields() {
  let ineligibleReason = getIneligibleReason();
  let outcomeReason = computeRemoteSettingsEligibility()
    ? lastOutcomeReason
    : notAttemptedReason(managedConfigNotAttemptedInput(ineligibleReason));
  return {
    settings_outcome_reason: fromEnumOpt(outcomeReason),
    settings_ineligible_reason: fromEnumOpt(ineligibleReason),
  };
}
//@ chunk-a28agxjs.js:35427-35823 placement
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
//@ chunk-a28agxjs.js:35823-35919 placement
/**
 * 如果传入的结算回调仍是当前加载的回调，就释放加载/拉取屏障。
 */
function releaseBarrierIfSame(fetchSettledResolve) {
  let state = currentRemoteSettingsState();
  if (state.fetchSettledResolve && state.fetchSettledResolve === fetchSettledResolve) state.releaseBarrier();
}
//@ chunk-a28agxjs.js:35919-35989 placement
/**
 * 后台刷新远程托管设置，成功后让设置缓存失效并通知变更。
 */
async function refreshRemoteManagedSettings(showSecurityDialog, storageV5, credentials, options) {
  return (await refreshRemoteManagedSettingsWithOutcome(showSecurityDialog, storageV5, credentials, options))
    .fetchSucceeded;
}
//@ chunk-a28agxjs.js:35989-36001 placement
var STARTUP_AWAIT_DEADLINE_MS = 5000;
//@ chunk-a28agxjs.js:36001-36464 placement
async function refreshRemoteManagedSettingsForStartup(showSecurityDialog, storageV5, credentials) {
  let releaseConsent;
  let promise = new Promise((resolve) => {
    releaseConsent = armStartupConsentRelease(() => resolve("consent_pending"));
  });
  let startupBlock = beginStartupBlock("settings", {
    supersede: true,
  });
  let refreshOutcome = refreshRemoteManagedSettingsWithOutcome(showSecurityDialog, storageV5, credentials, {
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
    let outcome = await withDeadline(Promise.race([refreshOutcome, promise]), STARTUP_AWAIT_DEADLINE_MS);
    startupBlock(outcome === undefined ? "timed_out" : "completed");
    if (outcome === undefined) {
      logFeatureSad("remote_managed_settings_startup_await", "deadline_expired");
      return "timed_out";
    }
    return outcome;
  } finally {
    releaseConsent?.();
    startupBlock("completed");
  }
}
//@ chunk-a28agxjs.js:36464-36943 placement
async function probeManagedSettingsForBearer(bearer, { timeoutMs = PROBE_TIMEOUT_MS } = {}) {
  let response = await axios_default.get(`${getOauthConfig().BASE_API_URL}/api/claude_code/settings`, {
    headers: {
      "User-Agent": claudeCodeUserAgent(),
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      Authorization: `Bearer ${bearer}`,
      "anthropic-beta": OAUTH_BETA_HEADER,
    },
    timeout: timeoutMs,
    signal: AbortSignal.timeout(timeoutMs),
    maxRedirects: 0,
    adapter: "http",
    validateStatus: (status) => status === 200 || status === 204 || status === 304 || status === 404,
  });
  let headers = response.headers ?? {};
  let contentType = headers["content-type"];
  return {
    status: response.status,
    contentType: typeof contentType === "string" ? contentType : "",
    requestIdPresent: hasSessionsTokenRequestId(headers),
  };
}
//@ chunk-a28agxjs.js:36943-38028 placement
async function refreshRemoteManagedSettingsWithOutcome(showSecurityDialog, storageV5, credentials, options) {
  let awaited = options?.startupAwaited === true;
  stopBackgroundPolling();
  resetRemoteSettingsSyncCache();
  markLoadCycleBegun();
  let syncCacheResetEpoch = getSyncCacheResetEpoch();
  let state = currentRemoteSettingsState();
  let releaseOldBarrier = state.detachBarrier();
  if (!computeRemoteSettingsEligibility()) {
    state.prefetch.clear();
    releaseOldBarrier?.();
    recordRemoteSettingsStatus({
      settings: null,
      fetchSucceeded: true,
      resolution: "ineligible",
    });
    markLoadCycleEnded();
    recordManagedConfigResult("settings", {
      source: "ineligible",
      hadCache: false,
      awaited,
    });
    loadRemoteManagedSettings_2();
    applyRemotePolicyMidSession(() => parseRemoteManagedSettings().settings);
    return {
      fetchSucceeded: true,
    };
  }
  initializeRemoteManagedSettingsLoadingPromise();
  let fetchSettledResolve = state.fetchSettledResolve;
  if (releaseOldBarrier)
    if (state.fetchSettledPromise) state.fetchSettledPromise.then(releaseOldBarrier);
    else releaseOldBarrier();
  let outcome;
  let result;
  let cycleFacts = {};
  let source = "error";
  let startupBlock =
    awaited && !options?.callerRecordsBarrier
      ? beginStartupBlock("settings", {
          supersede: true,
        })
      : null;
  try {
    result = await fetchAndLoadRemoteManagedSettingsAndNotify({
      showSecurityDialog,
      storageV5,
      credentials,
      startupAwaited: awaited,
      maxRetries: options?.maxRetries,
      cycleFacts,
    });
    source = getRemoteSettingsSourceLabel(result);
    outcome = {
      fetchSucceeded: result.fetchSucceeded,
      ...(result.failure && {
        failure: result.failure,
      }),
    };
  } finally {
    releaseBarrierIfSame(fetchSettledResolve);
    if (getSyncCacheResetEpoch() === syncCacheResetEpoch) markLoadCycleEnded();
    if (cycleFacts.outcomeReason !== undefined) lastOutcomeReason = cycleFacts.outcomeReason;
    recordManagedConfigResult("settings", {
      source,
      hadCache: cycleFacts.hadCache === true,
      awaited,
      fetchMs: cycleFacts.fetchMs,
    });
    startupBlock?.("completed");
  }
  logForDebugging("Remote settings: Refreshed after auth change");
  if (getSyncCacheResetEpoch() !== syncCacheResetEpoch) {
    logForDebugging("Remote settings: Refresh superseded by a login/logout reset; not notifying");
    return outcome;
  }
  recordRemoteSettingsStatus(result);
  if (!getRemoteSettingsPathOverride()) startRemoteSettingsPoller(showSecurityDialog, storageV5, credentials);
  loadRemoteManagedSettings_2();
  return outcome;
}
//@ chunk-a28agxjs.js:38824-38968 placement (2.1.88 match: formatDirectoryList, 1)
/**
 * （切分错误）格式化首个目录问题："(<路径>: <消息>, and N more)"。
 */
function firstRulingClause(directories) {
  let [first] = serializeSettingsErrors(directories?.slice(0, 1) ?? []);
  if (!first || !directories) return "";
  let moreCount = directories.length - 1;
  return ` (${first.path}: ${first.message}${moreCount > 0 ? `, and ${moreCount} more` : ""})`;
}
//@ chunk-a28agxjs.js:38968-39054 placement
/**
 * 把 URL 规范成 origin + 路径（去掉结尾斜杠），用于错误与日志里指代网关。
 */
function originWithPath(url) {
  let { origin, pathname } = new URL(url);
  return `${origin}${pathname.replace(/\/$/, "")}`;
}
//@ chunk-a28agxjs.js:39054-39176 placement
function gatewayPolicyPrefix(url) {
  return `Claude Desktop runs Claude Code under your organization's policy from the gateway at ${originWithPath(url)}, but`;
}
//@ chunk-a28agxjs.js:39176-40332 placement
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
//@ chunk-a28agxjs.js:40332-41142 placement
function hostLaunchedGatewayLoadRefusal(remoteManagedSettings) {
  let gatewayAuth = getGatewayAuth();
  if (!gatewayAuth || !isHostVerifiedGatewayAuth(gatewayAuth)) return;
  let prefix = gatewayPolicyPrefix(gatewayAuth.url);
  let lastLoadStatus = getLastLoadStatus();
  let failure =
    lastLoadStatus?.state === "failed" || lastLoadStatus?.state === "stale_cache"
      ? lastLoadStatus.failure
      : undefined;
  if (failure?.errorKind === "gateway_public_address")
    return `${prefix} this machine is no longer reaching it from inside your organization's network (it may have left that network or VPN, or the gateway's name now resolves elsewhere), so the policy was not fetched. Reconnect to that network and start again, or contact your administrator.`;
  if (failure?.errorKind === "ruled_empty")
    return `${prefix} none of the settings it served could be applied as written${firstRulingClause(failure.rulings)}. Ask your administrator to fix them.`;
  if (!remoteManagedSettings || failure) {
    let detail = failure ? `: ${describeFetchFailure(failure.errorKind, failure.httpStatus)}` : "";
    return `${prefix} the policy could not be loaded from it${detail}. Check your network connection, or contact your administrator.`;
  }
  noteHostLaunchedGatewayWithoutPolicy();
  return;
}
//@ chunk-a28agxjs.js:41142-41447 placement
function noteHostLaunchedGatewayWithoutPolicy() {
  let gatewayAuth = getGatewayAuth();
  if (!gatewayAuth || !isHostVerifiedGatewayAuth(gatewayAuth)) return;
  let lastLoadStatus = getLastLoadStatus();
  if (lastLoadStatus?.state === "ok" && !lastLoadStatus.hasSettings)
    warnStartingWithoutSettings(
      `the gateway at ${gatewayAuth.url} has no Claude Code policy for this Desktop session (self-hosted gateway admins: set \`serve_to_desktop: true\` on this user's policy, or change \`cli\` to \`code\` in every policy)`,
    );
}
//@ chunk-a28agxjs.js:41447-41585 placement
function warnStartingWithoutSettings(reason) {
  let message = `Starting without your organization's managed settings: ${reason}.`;
  logForDebugging(`Remote settings: ${message}`, {
    level: "warn",
  });
  writeToStderr(`${message}
`);
}
//@ chunk-a28agxjs.js:41585-41684 placement
/**
 * 组织要求远程托管设置、但本次加载失败时的提示前缀。
 */
var REQUIRED_SETTINGS_LOAD_FAILED_MESSAGE =
  "Your organization requires remote managed settings to load, but they could not be loaded.";
//@ chunk-a28agxjs.js:41684-42000 placement
/**
 * 宿主启动的网关连不上时的提示文案（证书错误与一般连接错误两种）。
 */
function gatewayRequiredLoadFailedSteps(failure) {
  return failure?.errno === "CERT_ERROR"
    ? "Could not verify the gateway's TLS certificate. Check your connection, and join your organization's network if the gateway needs it."
    : "Check your connection, and join your organization's network if the gateway needs it. If it still fails, try again in a few minutes.";
}
//@ chunk-a28agxjs.js:42000-42671 placement
async function validateForceRemoteSettingsRefresh(isSettingsLoaded, machineForcedRefresh) {
  try {
    if (await isSettingsLoaded()) {
      let forcedMessage = machineForcedRefresh();
      return forcedMessage === undefined
        ? {
            valid: true,
          }
        : {
            valid: false,
            message: `${REQUIRED_SETTINGS_LOAD_FAILED_MESSAGE} ${forcedMessage}`,
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
  let loginCommand = "claude auth login";
  let lastLoadStatus = getLastLoadStatus();
  let failure =
    lastLoadStatus?.state === "failed" || lastLoadStatus?.state === "stale_cache"
      ? lastLoadStatus.failure
      : undefined;
  let failureHintText = isArtifactMountMode()
    ? "You can check your network connection or contact your admin."
    : isGatewayRequiredByHostPolicy() &&
        failure?.errorKind !== "http_401" &&
        failure?.errorKind !== "http_403"
      ? gatewayRequiredLoadFailedSteps(failure)
      : `Run \`${loginCommand}\` to re-authenticate, check your network connection, or contact your administrator.`;
  return {
    valid: false,
    message: `${REQUIRED_SETTINGS_LOAD_FAILED_MESSAGE} ${failureHintText}`,
  };
}
//@ chunk-a28agxjs.js:42671-43259 placement
/**
 * 后台轮询远程设置，有变化时通知。
 */
async function pollRemoteSettings(showSecurityDialog, storageV5, credentials) {
  if (!computeRemoteSettingsEligibility()) return;
  currentRemoteSettingsState().refreshesHybridToken = true;
  let remoteManagedSettingsSyncFromCache = getRemoteManagedSettingsSyncFromCache();
  let beforeSnapshot = remoteManagedSettingsSyncFromCache
    ? jsonStringify(remoteManagedSettingsSyncFromCache)
    : null;
  let wasVerified = isRemoteManagedSettingsVerified();
  let hadPresence = settingsPresenceSignal.get() === "served";
  let syncCacheResetEpoch = getSyncCacheResetEpoch();
  try {
    let result = await fetchAndLoadRemoteManagedSettingsAndNotify({
      background: true,
      showSecurityDialog,
      storageV5,
      credentials,
    });
    if (getSyncCacheResetEpoch() !== syncCacheResetEpoch) {
      logForDebugging("Remote settings: Background poll superseded by a login/logout reset; not notifying");
      return;
    }
    if (result.fetchSucceeded || result.failure?.errorKind === "ruled_empty")
      recordRemoteSettingsStatus(result);
    let remoteManagedSettingsSyncFromCache = getRemoteManagedSettingsSyncFromCache();
    let changed =
      (remoteManagedSettingsSyncFromCache ? jsonStringify(remoteManagedSettingsSyncFromCache) : null) !==
      beforeSnapshot;
    let becameVerified = !wasVerified && isRemoteManagedSettingsVerified();
    let appearedNow = hasManagedSettings() && !hadPresence && settingsPresenceSignal.get() === "served";
    if (changed || becameVerified || appearedNow) {
      logForDebugging(
        changed
          ? "Remote settings: Changed during background poll"
          : "Remote settings: Confirmed by a background poll",
      );
      loadRemoteManagedSettings_2();
    }
  } catch {}
}
//@ chunk-a28agxjs.js:43259-43397 placement
function startRemoteSettingsPoller(showSecurityDialog, storageV5, credentials) {
  let state = currentRemoteSettingsState();
  if (state.poller !== null) return;
  if (!computeRemoteSettingsEligibility()) return;
  let interactionAwarePoll = startInteractionAwarePoll(
    () => void pollRemoteSettings(showSecurityDialog, storageV5, credentials),
    POLL_INTERVAL_MS,
    {
      unref: true,
    },
  );
  state.startPoller(interactionAwarePoll);
  registerCleanup(interactionAwarePoll);
}
//@ chunk-a28agxjs.js:43397-43429 placement
function stopBackgroundPolling() {
  currentRemoteSettingsState().stopPoller();
}
export {
  waitForRemoteManagedSettingsFetchToSettle,
  waitForRemoteManagedSettingsToLoad,
  refreshRemoteManagedSettings,
  declareNoHybridTokenRefresh,
  getRemoteManagedSettingsSignatureFacts,
  hostLaunchedGatewayRefusal,
  validateForceRemoteSettingsRefresh,
  loadRemoteManagedSettings,
  hostLaunchedGatewayLoadRefusal,
  noteHostLaunchedGatewayWithoutPolicy,
  refreshRemoteManagedSettingsForStartup,
  isRemoteManagedSettingsColdStartPending,
  didRemoteManagedSettingsBackstopRelease,
  MAX_BACKGROUND_FETCH_RETRIES,
  PROBE_TIMEOUT_MS,
  currentRemoteSettingsState,
  clearRemoteManagedSettingsCache,
  isRemoteManagedProvisionPending,
  probeManagedSettingsForBearer,
  isEligibleForRemoteManagedSettings,
  initializeRemoteManagedSettingsLoadingPromise,
  prefetchRemoteManagedSettings,
  stopBackgroundPolling,
  clearRemoteManagedSettingsPrefetch,
  firstRulingClause,
  gatewayRequiredLoadFailedSteps,
  refreshRemoteManagedSettingsWithOutcome,
};
