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
  N_i,
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
import { u1e, hasManagedSettings } from "../../utils/settings/managedRestrictionKeys.js";
import { cacheTrustAnswer, BIn } from "../../utils/settings/policyCertificates.js";
import { verifyLiveAnswerSignature } from "../policyLimits/signedCache.js";
import { Swi } from "../../utils/model/allowedProviders.js";
import { d_i } from "./storedLoginSurface.js";
import { zW } from "../../utils/plugins/commandSource.js";
import { isSdkEntrypoint } from "../../utils/entrypointKinds.js";
import { N1s } from "../policyLimits/coldStartWaiter.js";
import { or } from "../../utils/settings/commandSyncNames.js";
import { Yie } from "../orgMemory/memoryStores.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { formatStorageError } from "../../utils/storage/storageErrors.js";
import { errorMessage, isENOENT } from "../../utils/errors.js";
import { parseRemoteManagedSettings } from "../../utils/settings/managedFileSettings.js";
import { reserveRemoteStaticPayload, eio } from "../../utils/settings/policyHelper/helperRemote.js";
import { getRemotePolicyTierWithKind } from "../../utils/settings/settings.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum, fromEnumOpt } from "../analytics/safeMetadata.js";
import { settingsAuthSource, startInteractionAwarePoll } from "./fetchSupport.js";
import { rbr } from "../../utils/settings/marketplaceSettingsAliases.js";
import { logFeatureSad } from "../analytics/featureTelemetry.js";
import { isCoworkWithRemote } from "../../utils/sessionShape.js";
import { logError } from "../../utils/log.js";
import { notAttemptedReason } from "../analytics/authOutcomeTelemetry.js";
import { withDeadline } from "../../utils/sleep.js";
import { Dt } from "../../../vendor/axios/dist/esm/axios.js";
import { getOauthConfig, OAUTH_BETA_HEADER } from "../../constants/oauth.js";
import { claudeCodeUserAgent } from "../../utils/http.js";
import { k5e } from "../api/errorUtils.js";
import { serializeSettingsErrors } from "../../utils/fileStateCache.js";
import { writeToStderr } from "../../utils/process.js";
import { isArtifactMountMode } from "../artifacts/artifactMount.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { xJ } from "./seating.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";

//@ chunk-4pc1m5n9.js:4155-4191 placement
var He = 1e4,
  at = 5,
  dt = 3600000,
  ct = 30000;
//@ chunk-4pc1m5n9.js:4191-5287 placement
class RemoteManagedSettingsState {
  poller = null;
  loadingCompletePromise = null;
  loadingCompleteResolve = null;
  fetchSettledPromise = null;
  fetchSettledResolve = null;
  signedCacheShadowChecked = !1;
  storedCopyShadow = void 0;
  storedCopyReported = !1;
  storedCopyAtStart = void 0;
  liveAnswer = void 0;
  livePrincipalChecked = !1;
  backstopReleased = !1;
  refreshesHybridToken = !0;
  prefetch = new PrefetchSlot();
  oauthRefreshLatch = { attempted: !1, recoveries: { begun: 0, running: 0 } };
  createBarrier(e) {
    ((this.fetchSettledPromise = new Promise((n) => {
      ((this.fetchSettledResolve = n), e?.(n));
    })),
      (this.loadingCompletePromise = new Promise((n) => {
        this.loadingCompleteResolve = n;
      })));
  }
  releaseLoadBarrier() {
    (this.loadingCompleteResolve?.(), (this.loadingCompleteResolve = null));
  }
  releaseBarrier() {
    (this.releaseLoadBarrier(), this.fetchSettledResolve?.(), (this.fetchSettledResolve = null));
  }
  detachBarrier() {
    let loadingCompleteResolve = this.loadingCompleteResolve,
      fetchSettledResolve = this.fetchSettledResolve;
    if (
      ((this.loadingCompleteResolve = null),
      (this.loadingCompletePromise = null),
      (this.fetchSettledResolve = null),
      (this.fetchSettledPromise = null),
      !loadingCompleteResolve && !fetchSettledResolve)
    )
      return null;
    return () => {
      (loadingCompleteResolve?.(), fetchSettledResolve?.());
    };
  }
  startPoller(e) {
    this.poller = e;
  }
  stopPoller() {
    (this.poller?.[Symbol.dispose](), (this.poller = null));
  }
}
//@ chunk-4pc1m5n9.js:5287-5312 placement
var ut = new HostScoped(() => new RemoteManagedSettingsState());
//@ chunk-4pc1m5n9.js:5312-5348 placement
function D() {
  return ut.of(getRootSession().host);
}
//@ chunk-4pc1m5n9.js:5348-5745 placement
function initializeRemoteManagedSettingsLoadingPromise() {
  registerRemoteSettingsStartupWait();
  let e = D();
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
            (logForDebugging(
              "Remote settings: Loading promise timed out, resolving anyway (load and fetch barriers)",
            ),
              (r.backstopReleased = !0),
              markLoadBackstopReleased(),
              r.releaseBarrier());
          }
        },
        ct,
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
    !1 ||
    getRemoteSettingsPathOverride() ||
    isEvalPolicySnapshotOnly() ||
    getMockRemoteSettingsValue() !== void 0
  )
    return;
  if (getClaudeAIOAuthTokens()?.refreshToken && getStoredOauthAccountInfo() === void 0) return;
  let n = getRemoteManagedSettingsRawCache(),
    s = n ? computeChecksum(n) : void 0,
    r = D(),
    { oauthRefreshLatch: oauthRefreshLatch } = r;
  r.prefetch.set(
    {
      checksum: s,
      epoch: getSyncCacheResetEpoch(),
      endpoint: getRemoteManagedSettingsEndpoint(),
      principal: remoteSettingsCredentialKey(),
    },
    async (S) =>
      fetchRemoteManagedSettings(
        isPolicyGraceEnabled() ? keepIfFresh(s, await settingsAgeMs(n !== null, await readSyncAge())) : s,
        !1,
        e,
        S,
        oauthRefreshLatch,
      ),
    (S) => S.success,
  );
}
//@ chunk-4pc1m5n9.js:6088-6198 placement
function clearRemoteManagedSettingsPrefetch() {
  let e = D();
  (e.prefetch.clear(), (e.oauthRefreshLatch = { attempted: !1, recoveries: { begun: 0, running: 0 } }));
}
//@ chunk-4pc1m5n9.js:8688-8715 placement
function isEligibleForRemoteManagedSettings() {
  return computeRemoteSettingsEligibility();
}
/**
 * 等待远程托管设置首次加载完成（若已启动）。
 */
//@ chunk-4pc1m5n9.js:8715-8820 placement
async function waitForRemoteManagedSettingsToLoad() {
  if (u1e()) return;
  let e = D();
  if (e.loadingCompletePromise) await e.loadingCompletePromise;
}
//@ chunk-4pc1m5n9.js:8820-9025 placement
function getRemoteManagedSettingsSignatureFacts() {
  let e = D(),
    storedCopyAtStart = e.storedCopyAtStart;
  return {
    storedCopy:
      storedCopyAtStart === void 0 || storedCopyAtStart === "not_read"
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
  let e = D();
  if (e.fetchSettledPromise) await e.fetchSettledPromise;
}
//@ chunk-4pc1m5n9.js:9108-9120 placement
Swi(waitForRemoteManagedSettingsFetchToSettle, d_i);
//@ chunk-4pc1m5n9.js:9120-9131 placement
zW.wait = waitForRemoteManagedSettingsFetchToSettle;
//@ chunk-4pc1m5n9.js:9131-9147 placement
zW.ask = () => pollRemoteSettings();
//@ chunk-4pc1m5n9.js:9147-9161 placement
zW.fetches = computeRemoteSettingsEligibility;
//@ chunk-4pc1m5n9.js:9161-9204 placement
function didRemoteManagedSettingsBackstopRelease() {
  return D().backstopReleased;
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
  N1s(async () => {
    if (isRemoteManagedProvisionPending()) await waitForRemoteManagedSettingsFetchToSettle();
    else if (isRemoteManagedSettingsColdStartPending()) await waitForRemoteManagedSettingsToLoad();
  });
}
//@ chunk-4pc1m5n9.js:22630-23210 placement
async function clearRemoteManagedSettingsCache(e) {
  if (
    (stopBackgroundPolling(),
    resetRemoteSettingsSyncCache(),
    or(),
    clearRemoteManagedSettingsPrefetch(),
    D().detachBarrier()?.(),
    Yie(e))
  )
    return;
  if (hasManagedSettings()) return;
  let n =
    isStorageV5Enabled() && e !== void 0
      ? await e
          .delete(STORAGE_SPACES.state(HELPER_CONSENT_STATE_ID))
          .then((s) => (s.ok ? void 0 : formatStorageError(s.error)))
      : await rm(getHelperConsentPath(), { force: !0 }).then(() => {
          return;
        }, errorMessage);
  if (n !== void 0) {
    logForDebugging(`Remote settings: Failed to remove helper consent - ${n}`);
    return;
  }
  if (isStorageV5Enabled() && !getRemoteSettingsPathOverride())
    remoteSettingsFileWritten("helperConsent", null);
  if (getRemoteSettingsPathOverride()) return;
  if ((await BIn(getSettingsPath()), await removeSyncStamp(), isStorageV5Enabled() && e !== void 0)) {
    if ((await e.delete(STORAGE_SPACES.state("remote-settings"))).ok)
      remoteSettingsFileWritten("cache", null);
    return;
  }
  try {
    let s = getSettingsPath();
    await unlink(s);
  } catch (error) {
    if (isStorageV5Enabled() && !isENOENT(error)) return;
  }
  if (isStorageV5Enabled()) remoteSettingsFileWritten("cache", null);
}
//@ chunk-4pc1m5n9.js:23210-23217 placement
var ke;
//@ chunk-4pc1m5n9.js:23217-23311 placement
async function fetchAndLoadRemoteManagedSettingsAndNotify(e = {}) {
  try {
    return await fetchAndLoadRemoteManagedSettings(e);
  } finally {
    let n = () => parseRemoteManagedSettings().settings;
    (reserveRemoteStaticPayload(n), eio(n));
  }
}
//@ chunk-4pc1m5n9.js:33728-34222 placement
function recordRemoteSettingsStatus(e) {
  if (!computeRemoteSettingsEligibility()) {
    let s = getIneligibleReason();
    if (s) setLastLoadStatus({ state: "ineligible", reason: s });
    return;
  }
  let n = lastFailureRulings() !== void 0;
  if (e.fetchSucceeded) {
    if (
      (setLastLoadStatus({
        state: "ok",
        hasSettings: e.settings !== null && Object.keys(e.settings).length > 0,
      }),
      n)
    )
      or();
    return;
  }
  if (e.failure) {
    let r = e.settings !== null && Object.keys(e.settings).length > 0;
    if (
      (setLastLoadStatus(
        r
          ? {
              state: "stale_cache",
              failure: e.failure,
              transportEnvWithheld: !isRemoteManagedSettingsVerified(),
            }
          : {
              state: "failed",
              failure: e.failure,
              ...(r && getRemotePolicyTierWithKind().settings !== null && { restrictionsOnly: !0 }),
            },
      ),
      n || e.failure.rulings !== void 0)
    )
      or();
  }
}
//@ chunk-4pc1m5n9.js:34222-34325 placement
function lastFailureRulings() {
  let e = getLastLoadStatus();
  return e?.state === "failed" || e?.state === "stale_cache" ? e.failure.rulings : void 0;
}
//@ chunk-4pc1m5n9.js:34325-35257 placement
async function loadRemoteManagedSettings(e, n, s) {
  (markLoadCycleBegun(), registerRemoteSettingsStartupWait(), N_i(settingsOutcomeFields));
  let r = D(),
    y = computeRemoteSettingsEligibility();
  if (hasManagedSettings())
    try {
      if (
        (logEvent("tengu_cowork_cloud_launch_credential", {
          credential_road: fromEnum(settingsAuthSource()),
          asks: y,
        }),
        rbr())
      )
        logFeatureSad("cowork_cloud_launch", "name_on_wsl_kernel", {
          container_launch: isCoworkWithRemote(),
        });
    } catch (error) {
      logError(error);
    }
  if (y && !r.loadingCompletePromise) r.createBarrier();
  let fetchSettledResolve = r.fetchSettledResolve,
    k = getSyncCacheResetEpoch(),
    R = getRemoteManagedSettingsSyncFromCache() !== null;
  if (R && r.loadingCompleteResolve) r.releaseLoadBarrier();
  let C = s?.startupAwaited === !0;
  if (R && !C) recordManagedConfigResult("settings", { source: "cache", hadCache: R, awaited: C });
  let T = {},
    O = "error",
    E = C ? beginStartupBlock("settings") : null;
  try {
    let A = await fetchAndLoadRemoteManagedSettingsAndNotify({
        ...s,
        showSecurityDialog: e,
        storageV5: n,
        cycleFacts: T,
      }),
      { settings: settings, fetchSucceeded: fetchSucceeded } = A;
    if (((O = getRemoteSettingsSourceLabel(A)), getSyncCacheResetEpoch() === k))
      recordRemoteSettingsStatus(A);
    if (
      getSyncCacheResetEpoch() === k &&
      computeRemoteSettingsEligibility() &&
      !getRemoteSettingsPathOverride() &&
      !isEvalPolicySnapshotOnly()
    )
      startRemoteSettingsPoller(e, n, s?.credentials);
    if (settings !== null && A.changesNothing !== !0) loadRemoteManagedSettings_2();
    return fetchSucceeded;
  } finally {
    if ((Ve(fetchSettledResolve), getSyncCacheResetEpoch() === k)) markLoadCycleEnded();
    if (T.outcomeReason !== void 0) ke = T.outcomeReason;
    (recordManagedConfigResult("settings", { source: O, hadCache: R, awaited: C, fetchMs: T.fetchMs }),
      E?.("completed"));
  }
}
//@ chunk-4pc1m5n9.js:35257-35375 placement
function settingsOutcomeFields() {
  let e = getIneligibleReason(),
    n = computeRemoteSettingsEligibility() ? ke : notAttemptedReason(managedConfigNotAttemptedInput(e));
  return { settings_outcome_reason: fromEnumOpt(n), settings_ineligible_reason: fromEnumOpt(e) };
}
//@ chunk-4pc1m5n9.js:35375-35771 placement
function getRemoteSettingsSourceLabel({ resolution: resolution, settings: settings }) {
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
function Ve(e) {
  let n = D();
  if (n.fetchSettledResolve && n.fetchSettledResolve === e) n.releaseBarrier();
}
/**
 * 后台刷新远程托管设置，成功后让设置缓存失效并通知变更。
 */
//@ chunk-4pc1m5n9.js:35867-35936 placement
async function refreshRemoteManagedSettings(e, n, s, r) {
  return (await refreshRemoteManagedSettingsWithOutcome(e, n, s, r)).fetchSucceeded;
}
//@ chunk-4pc1m5n9.js:35936-35948 placement
var Tt = 5000;
//@ chunk-4pc1m5n9.js:35948-36411 placement
async function refreshRemoteManagedSettingsForStartup(e, n, s) {
  let r,
    promise = new Promise((R) => {
      r = armStartupConsentRelease(() => R("consent_pending"));
    }),
    S = beginStartupBlock("settings", { supersede: !0 }),
    k = refreshRemoteManagedSettingsWithOutcome(e, n, s, {
      startupAwaited: !0,
      callerRecordsBarrier: !0,
    }).then(
      ({ fetchSucceeded: fetchSucceeded }) => (fetchSucceeded ? "refreshed" : "failed"),
      (R) => (logError(R), "failed"),
    );
  try {
    let R = await withDeadline(Promise.race([k, promise]), Tt);
    if ((S(R === void 0 ? "timed_out" : "completed"), R === void 0))
      return (logFeatureSad("remote_managed_settings_startup_await", "deadline_expired"), "timed_out");
    return R;
  } finally {
    (r?.(), S("completed"));
  }
}
//@ chunk-4pc1m5n9.js:36411-36890 placement
async function probeManagedSettingsForBearer(e, { timeoutMs: n = He } = {}) {
  let s = await Dt.get(`${getOauthConfig().BASE_API_URL}/api/claude_code/settings`, {
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
    }),
    r = s.headers ?? {},
    y = r["content-type"];
  return { status: s.status, contentType: typeof y === "string" ? y : "", requestIdPresent: k5e(r) };
}
//@ chunk-4pc1m5n9.js:36890-37968 placement
async function refreshRemoteManagedSettingsWithOutcome(e, n, s, r) {
  let y = r?.startupAwaited === !0;
  (stopBackgroundPolling(), resetRemoteSettingsSyncCache(), markLoadCycleBegun());
  let S = getSyncCacheResetEpoch(),
    k = D(),
    detachBarrier = k.detachBarrier();
  if (!computeRemoteSettingsEligibility())
    return (
      k.prefetch.clear(),
      detachBarrier?.(),
      recordRemoteSettingsStatus({ settings: null, fetchSucceeded: !0, resolution: "ineligible" }),
      recordManagedConfigResult("settings", { source: "ineligible", hadCache: !1, awaited: y }),
      loadRemoteManagedSettings_2(),
      eio(() => parseRemoteManagedSettings().settings),
      { fetchSucceeded: !0 }
    );
  initializeRemoteManagedSettingsLoadingPromise();
  let fetchSettledResolve = k.fetchSettledResolve;
  if (detachBarrier)
    if (k.fetchSettledPromise) k.fetchSettledPromise.then(detachBarrier);
    else detachBarrier();
  let T,
    O,
    E = {},
    A = "error",
    P = y && !r?.callerRecordsBarrier ? beginStartupBlock("settings", { supersede: !0 }) : null;
  try {
    ((O = await fetchAndLoadRemoteManagedSettingsAndNotify({
      showSecurityDialog: e,
      storageV5: n,
      credentials: s,
      startupAwaited: y,
      maxRetries: r?.maxRetries,
      cycleFacts: E,
    })),
      (A = getRemoteSettingsSourceLabel(O)),
      (T = { fetchSucceeded: O.fetchSucceeded, ...(O.failure && { failure: O.failure }) }));
  } finally {
    if ((Ve(fetchSettledResolve), getSyncCacheResetEpoch() === S)) markLoadCycleEnded();
    if (E.outcomeReason !== void 0) ke = E.outcomeReason;
    (recordManagedConfigResult("settings", {
      source: A,
      hadCache: E.hadCache === !0,
      awaited: y,
      fetchMs: E.fetchMs,
    }),
      P?.("completed"));
  }
  if ((logForDebugging("Remote settings: Refreshed after auth change"), getSyncCacheResetEpoch() !== S))
    return (logForDebugging("Remote settings: Refresh superseded by a login/logout reset; not notifying"), T);
  if ((recordRemoteSettingsStatus(O), !getRemoteSettingsPathOverride())) startRemoteSettingsPoller(e, n, s);
  return (loadRemoteManagedSettings_2(), T);
}
/**
 * （切分错误）格式化首个目录问题："(<路径>: <消息>, and N more)"。
 */
//@ chunk-4pc1m5n9.js:38764-38908 placement = formatDirectoryList (1)
function firstRulingClause(directories) {
  let [n] = serializeSettingsErrors(directories?.slice(0, 1) ?? []);
  if (!n || !directories) return "";
  let s = directories.length - 1;
  return ` (${n.path}: ${n.message}${s > 0 ? `, and ${s} more` : ""})`;
}
//@ chunk-4pc1m5n9.js:38908-38994 placement
function Re(e) {
  let { origin: origin, pathname: pathname } = new URL(e);
  return `${origin}${pathname.replace(/\/$/, "")}`;
}
//@ chunk-4pc1m5n9.js:38994-39116 placement
function gatewayPolicyPrefix(e) {
  return `Claude Desktop runs Claude Code under your organization's policy from the gateway at ${Re(e)}, but`;
}
//@ chunk-4pc1m5n9.js:39116-40272 placement
function hostLaunchedGatewayRefusal(e) {
  let n = getGatewayAuth(),
    s = n?.hostVerdict;
  if (!n || !s) return;
  if ("unresolvedReason" in s)
    return `${gatewayPolicyPrefix(n.url)} it could not be checked. ${s.unresolvedReason} If this keeps happening, contact your administrator.`;
  if (s.verified) return;
  let r = s.reason ?? "it is not Anthropic-operated or inside your organization's network.";
  if (e)
    return `Your organization requires managed settings, but the gateway at ${Re(n.url)} is not an accepted source for them: ${r} Contact your administrator.`;
  if (s.codeTabRulesUnanswered !== void 0)
    return `${gatewayPolicyPrefix(n.url)} Claude Code couldn't ask that gateway whether it has rules for this session (${s.codeTabRulesUnanswered}). Send your message again. This check runs because Claude Code on ${hostname()} doesn't take settings from that gateway: ${r}`;
  if (s.hasCodeTabRules)
    return `${gatewayPolicyPrefix(n.url)} Claude Code on ${hostname()} doesn't take settings from that gateway: ${r}`;
  if (s.hasCodeTabRules === !1) {
    logForDebugging(
      `[gateway] ${Re(n.url)} is not accepted as a source of managed settings. It says that it has no Code tab rules for this person, so no warning is shown`,
    );
    return;
  }
  warnStartingWithoutSettings(
    `the gateway at ${n.url} is not an accepted source for them: ${r.replace(/\.\s*$/, "")}`,
  );
  return;
}
//@ chunk-4pc1m5n9.js:40272-41082 placement
function hostLaunchedGatewayLoadRefusal(e) {
  let n = getGatewayAuth();
  if (!n || !isHostVerifiedGatewayAuth(n)) return;
  let s = gatewayPolicyPrefix(n.url),
    r = getLastLoadStatus(),
    y = r?.state === "failed" || r?.state === "stale_cache" ? r.failure : void 0;
  if (y?.errorKind === "gateway_public_address")
    return `${s} this machine is no longer reaching it from inside your organization's network (it may have left that network or VPN, or the gateway's name now resolves elsewhere), so the policy was not fetched. Reconnect to that network and start again, or contact your administrator.`;
  if (y?.errorKind === "ruled_empty")
    return `${s} none of the settings it served could be applied as written${firstRulingClause(y.rulings)}. Ask your administrator to fix them.`;
  if (!e || y) {
    let S = y ? `: ${describeFetchFailure(y.errorKind, y.httpStatus)}` : "";
    return `${s} the policy could not be loaded from it${S}. Check your network connection, or contact your administrator.`;
  }
  noteHostLaunchedGatewayWithoutPolicy();
  return;
}
//@ chunk-4pc1m5n9.js:41082-41387 placement
function noteHostLaunchedGatewayWithoutPolicy() {
  let e = getGatewayAuth();
  if (!e || !isHostVerifiedGatewayAuth(e)) return;
  let n = getLastLoadStatus();
  if (n?.state === "ok" && !n.hasSettings)
    warnStartingWithoutSettings(
      `the gateway at ${e.url} has no Claude Code policy for this Desktop session (self-hosted gateway admins: set \`serve_to_desktop: true\` on this user's policy, or change \`cli\` to \`code\` in every policy)`,
    );
}
//@ chunk-4pc1m5n9.js:41387-41525 placement
function warnStartingWithoutSettings(e) {
  let n = `Starting without your organization's managed settings: ${e}.`;
  (logForDebugging(`Remote settings: ${n}`, { level: "warn" }),
    writeToStderr(`${n}
`));
}
//@ chunk-4pc1m5n9.js:41525-41624 placement
var me = "Your organization requires remote managed settings to load, but they could not be loaded.";
//@ chunk-4pc1m5n9.js:41624-42156 placement
async function validateForceRemoteSettingsRefresh(e, n) {
  try {
    if (await e()) {
      let S = n();
      return S === void 0 ? { valid: !0 } : { valid: !1, message: `${me} ${S}` };
    }
  } catch (error) {
    logError(error);
  }
  let s = lastFailureRulings();
  if (s !== void 0)
    return {
      valid: !1,
      message: `${me} None of the settings the server returned could be applied as written${firstRulingClause(s)}; ask your administrator to fix them.`,
    };
  let r = "claude auth login",
    y = isArtifactMountMode()
      ? "You can check your network connection or contact your admin."
      : `Run \`${r}\` to re-authenticate, check your network connection, or contact your administrator.`;
  return { valid: !1, message: `${me} ${y}` };
}
/**
 * 后台轮询远程设置，有变化时通知。
 */
//@ chunk-4pc1m5n9.js:42156-42744 placement
async function pollRemoteSettings(e, n, s) {
  if (!computeRemoteSettingsEligibility()) return;
  D().refreshesHybridToken = !0;
  let r = getRemoteManagedSettingsSyncFromCache(),
    y = r ? jsonStringify(r) : null,
    S = isRemoteManagedSettingsVerified(),
    k = xJ.get() === "served",
    R = getSyncCacheResetEpoch();
  try {
    let C = await fetchAndLoadRemoteManagedSettingsAndNotify({
      background: !0,
      showSecurityDialog: e,
      storageV5: n,
      credentials: s,
    });
    if (getSyncCacheResetEpoch() !== R) {
      logForDebugging("Remote settings: Background poll superseded by a login/logout reset; not notifying");
      return;
    }
    if (C.fetchSucceeded || C.failure?.errorKind === "ruled_empty") recordRemoteSettingsStatus(C);
    let T = getRemoteManagedSettingsSyncFromCache(),
      E = (T ? jsonStringify(T) : null) !== y,
      A = !S && isRemoteManagedSettingsVerified(),
      P = hasManagedSettings() && !k && xJ.get() === "served";
    if (E || A || P)
      (logForDebugging(
        E
          ? "Remote settings: Changed during background poll"
          : "Remote settings: Confirmed by a background poll",
      ),
        loadRemoteManagedSettings_2());
  } catch {}
}
//@ chunk-4pc1m5n9.js:42744-42882 placement
function startRemoteSettingsPoller(e, n, s) {
  let r = D();
  if (r.poller !== null) return;
  if (!computeRemoteSettingsEligibility()) return;
  let S = startInteractionAwarePoll(() => void pollRemoteSettings(e, n, s), dt, { unref: !0 });
  (r.startPoller(S), registerCleanup(S));
}
//@ chunk-4pc1m5n9.js:42882-42914 placement
function stopBackgroundPolling() {
  D().stopPoller();
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
  at,
  He,
  D,
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
