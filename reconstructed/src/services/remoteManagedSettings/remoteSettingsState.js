/**
 * services/remoteManagedSettings/remoteSettingsState.ts
 *
 * 2.1.316 新增：远程托管设置的进程级状态（会话缓存、副本信任、组织固定、加载状态、同意基线、混合登录）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dcmhvw5a.js (56)
 * attribution: placement 56
 */
import { join, join as join_2, join as join_3, join as join_4 } from "path";
import { getClaudeConfigDir } from "../../utils/envUtils.js";
import {
  summarizeManagedSettingsRisk,
  needsManagedSettingsConsent,
  hbr,
  matchesConsentedHash,
} from "../../components/ManagedSettingsSecurityDialog/utils.js";
import { wi } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { createSignal } from "../../utils/signal.js";
import {
  u1e,
  mergeManagedSettingsPaths,
  extractRestrictionSettings,
} from "../../utils/settings/managedRestrictionKeys.js";
import {
  xC,
  readHelperConsentAttestation,
  helperTierOf,
  getRemoteManagedSettingsRawCache,
} from "./remoteSettingsCache.js";
import {
  getGatewayAuth,
  getRootSession,
  isInteractivityDecided,
  isNoDialogLaunch,
  isDiskless,
} from "../../bootstrap/state.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { or } from "../../utils/settings/commandSyncNames.js";
import { isSettingsGateSettled, vio, kio } from "../../utils/settings/settingsSourceTrust.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { yOt, trustedPrincipal } from "../../utils/settings/policyCertificates.js";
import { DC } from "./unvouchedRestrictions.js";

//@ chunk-dcmhvw5a.js:392501-392588 placement = SETTINGS_FILENAME (0.646)
var SETTINGS_FILENAME = "remote-settings.json",
  Yu = 5000,
  xo = 2097152,
  HELPER_CONSENT_STATE_ID = "remote-settings-helper-consent";
//@ chunk-dcmhvw5a.js:392588-392623 placement
function getHelperConsentPath() {
  return join(getClaudeConfigDir(), HELPER_CONSENT_STATE_ID);
}
//@ chunk-dcmhvw5a.js:392623-392672 placement
function Ju(e) {
  let n = summarizeManagedSettingsRisk(e);
  return needsManagedSettingsConsent(n) ? n : void 0;
}
//@ chunk-dcmhvw5a.js:392672-392717 placement
function helperConsentDigest(e) {
  let n = Ju(e);
  return n && hbr(n);
}
//@ chunk-dcmhvw5a.js:392717-392855 placement
function stripReservedKeys(e) {
  let n = wi(e, (r, s) => s.startsWith("$") && s !== "$schema");
  if (Object.keys(n).length !== Object.keys(e).length) weakMap.set(n, e);
  return n;
}
//@ chunk-dcmhvw5a.js:392855-392891 placement
function servedBodyOf(e) {
  return weakMap.get(e) ?? e;
}
//@ chunk-dcmhvw5a.js:392891-392910 placement
var weakMap = new WeakMap();
/**
 * 远程托管设置的进程级状态（会话缓存、副本信任、组织固定、加载状态、同意基线、混合登录）。
 */
//@ chunk-dcmhvw5a.js:392910-396728 placement
class RemoteSettingsState {
  sessionCache = null;
  storedAccountReader = null;
  storedCopyGateCovers = !0;
  storedCopyOrgPin = { kind: "unreadable" };
  mayHideDialog = () => !1;
  writesForHiddenDialog = () => !1;
  seededUnjudged = null;
  storedCopyTrust = "not_asked";
  storedCopyRefusal = null;
  helperTierReadAtMs = null;
  refusedCopyHelperTier = null;
  droppedHelperTier = null;
  eligible = void 0;
  eligibilityMemo = void 0;
  machinePinsSignInMemo = void 0;
  ineligibleReason = void 0;
  evalPolicySnapshotOnly = !1;
  hybridTokenRenewalDue = !1;
  hybridOrganizationUuid = null;
  usesGatewayVariable = !1;
  hybridSignInEnded = !1;
  hybridBlockFilter = null;
  hybridHostsWithheld = !1;
  hybridProviderFromOrganization = !1;
  hybridOnlyForConnection = !1;
  hybridLeftOut = null;
  lastLoadStatus = void 0;
  loadCycleEnded = !1;
  loadCycleBegun = !1;
  loadBackstopReleased = !1;
  lastLoadStatusChanged = createSignal();
  policySettingsNotified = !1;
  verifiedPayload = null;
  verifiedByGateway = void 0;
  unverifiedView = null;
  projectedView = null;
  projectedParse = null;
  consentedPayload = null;
  deferredPayload = null;
  resetEpoch = 0;
  backendView = void 0;
  coworkCloudHolds = {};
  heldSoFar(e) {
    let n = Object.keys(this.coworkCloudHolds).length > 0;
    if (!n && !u1e()) return e;
    if (e !== null) {
      let r = mergeManagedSettingsPaths(this.coworkCloudHolds, e);
      return ((this.coworkCloudHolds = extractRestrictionSettings(r)), r);
    }
    return n ? this.coworkCloudHolds : null;
  }
  replaceSessionCache(e, n) {
    let r = n?.verified === !0 || !u1e();
    if (!r && e !== null && e === this.sessionCache) return;
    let heldSoFar = this.heldSoFar(r ? xC(e) : null);
    if ((this.keepHelperLeaving(), (this.sessionCache = heldSoFar), n?.verified)) {
      if (
        ((this.seededUnjudged = null),
        (this.verifiedPayload = heldSoFar),
        (this.verifiedByGateway = getGatewayAuth()?.url),
        (this.projectedView = null),
        (this.projectedParse = null),
        n.consentDeferred)
      )
        this.deferredPayload = heldSoFar;
    }
  }
  seedFromDisk(e) {
    let n =
      Object.keys(this.coworkCloudHolds).length > 0 ? mergeManagedSettingsPaths(this.coworkCloudHolds, e) : e;
    ((this.sessionCache = n), this.seedConsentBaseline(n));
  }
  seedConsentBaseline(e) {
    let n = Ju(e);
    if (n !== void 0) {
      let r = readHelperConsentAttestation();
      if (r === void 0 || !matchesConsentedHash(r, n, e.claudeMd)) return;
    }
    this.consentedPayload ??= e;
  }
  markConsented(e) {
    this.consentedPayload = e;
  }
  dropConsentDeferral() {
    this.deferredPayload = null;
  }
  markPolicySettingsNotified() {
    this.policySettingsNotified = !0;
  }
  recordEligibility(e, n) {
    if (((this.eligible = e), n.memoize))
      ((this.eligibilityMemo = e), (this.ineligibleReason = e ? void 0 : n.ineligibleReason));
  }
  resetListener = null;
  registerResetListener(e) {
    if (this.resetListener !== null)
      throw Error(
        "registerSyncCacheResetListener: a listener is already registered; a second one would unhook the first",
      );
    this.resetListener = e;
  }
  keepHelperLeaving() {
    if (this.sessionCache === this.verifiedPayload) {
      let e = helperTierOf(this.sessionCache);
      this.droppedHelperTier =
        e === null ? this.droppedHelperTier : { ...e, env: { ...this.droppedHelperTier?.env, ...e.env } };
    }
  }
  reset() {
    (this.keepHelperLeaving(),
      (this.sessionCache = null),
      (this.helperTierReadAtMs = null),
      (this.storedCopyTrust = "not_asked"),
      (this.storedCopyRefusal = null),
      (this.refusedCopyHelperTier = null),
      (this.storedAccountReader = null),
      (this.storedCopyGateCovers = !0),
      (this.storedCopyOrgPin = { kind: "unreadable" }),
      (this.mayHideDialog = () => !1),
      (this.writesForHiddenDialog = () => !1),
      (this.seededUnjudged = null),
      (this.eligible = void 0),
      (this.eligibilityMemo = void 0),
      (this.machinePinsSignInMemo = void 0),
      (this.ineligibleReason = void 0),
      (this.hybridTokenRenewalDue = !1),
      (this.evalPolicySnapshotOnly = !1),
      (this.hybridOrganizationUuid = null),
      (this.usesGatewayVariable = !1),
      (this.hybridSignInEnded = !1),
      (this.hybridBlockFilter = null),
      (this.hybridHostsWithheld = !1),
      (this.hybridProviderFromOrganization = !1),
      (this.hybridOnlyForConnection = !1),
      (this.hybridLeftOut = null),
      (this.lastLoadStatus = void 0),
      (this.loadCycleEnded = !1),
      (this.loadCycleBegun = !1),
      (this.loadBackstopReleased = !1),
      (this.policySettingsNotified = !1),
      (this.verifiedPayload = null),
      (this.verifiedByGateway = void 0),
      (this.unverifiedView = null),
      (this.projectedView = null),
      (this.projectedParse = null),
      (this.consentedPayload = null),
      (this.deferredPayload = null),
      this.resetEpoch++,
      this.emitLoadStatusChanged(void 0));
  }
  emitLoadStatusChanged(e) {
    try {
      this.lastLoadStatusChanged.emit(e);
    } catch (error) {
      logForDebugging(`Remote settings: load-status listener threw: ${errorMessage(error)}`, {
        level: "error",
      });
    }
  }
}
//@ chunk-dcmhvw5a.js:396728-396753 placement
var vC = new HostScoped(() => new RemoteSettingsState());
//@ chunk-dcmhvw5a.js:396753-396790 placement
function re() {
  return vC.of(getRootSession().host);
}
//@ chunk-dcmhvw5a.js:396790-396827 placement
function getSyncCacheResetEpoch() {
  return re().resetEpoch;
}
//@ chunk-dcmhvw5a.js:396827-396871 placement
function getRemoteManagedSettingsConsentedBaseline() {
  return re().consentedPayload;
}
//@ chunk-dcmhvw5a.js:396871-396909 placement
function markRemoteManagedSettingsConsented(e) {
  re().markConsented(e);
}
//@ chunk-dcmhvw5a.js:396909-396951 placement
function dropRemoteManagedSettingsConsentDeferral() {
  re().dropConsentDeferral();
}
//@ chunk-dcmhvw5a.js:396951-397007 placement
function setSessionCache(e, n, r) {
  (re().replaceSessionCache(e, n), or(r));
}
//@ chunk-dcmhvw5a.js:397007-397087 placement
function isRemoteManagedSettingsVerified() {
  let { sessionCache: sessionCache, verifiedPayload: verifiedPayload } = re();
  return sessionCache !== null && sessionCache === verifiedPayload;
}
//@ chunk-dcmhvw5a.js:397087-397144 placement
function getGatewayThatVerifiedRemoteManagedSettings() {
  return isRemoteManagedSettingsVerified() ? re().verifiedByGateway : void 0;
}
//@ chunk-dcmhvw5a.js:397144-397278 placement
function isRemoteManagedSettingsVerifiedAndApprovedForSession() {
  let {
    sessionCache: sessionCache,
    verifiedPayload: verifiedPayload,
    consentedPayload: consentedPayload,
    deferredPayload: deferredPayload,
  } = re();
  return (
    sessionCache !== null &&
    sessionCache === verifiedPayload &&
    (sessionCache === consentedPayload || sessionCache === deferredPayload)
  );
}
//@ chunk-dcmhvw5a.js:397278-397324 placement
function registerSyncCacheResetListener(e) {
  re().registerResetListener(e);
}
//@ chunk-dcmhvw5a.js:397324-397380 placement
function resetSyncCache() {
  let e = re();
  (e.reset(), e.resetListener?.());
}
//@ chunk-dcmhvw5a.js:397380-397429 placement
function markPolicySettingsNotified() {
  re().markPolicySettingsNotified();
}
//@ chunk-dcmhvw5a.js:397429-397479 placement
function hasPolicySettingsNotified() {
  return re().policySettingsNotified;
}
//@ chunk-dcmhvw5a.js:397479-397554 placement
function isManagedSettingsCopyTrustEnforced() {
  return (
    isSettingsGateSettled() ||
    (((!isInteractivityDecided() && !isNoDialogLaunch()) || vio()) && re().mayHideDialog())
  );
}
//@ chunk-dcmhvw5a.js:397554-397612 placement
function isManagedSettingsCopyKeptVerifiable() {
  return kio() || re().writesForHiddenDialog();
}
//@ chunk-dcmhvw5a.js:397612-397882 placement
function setStoredCopyGateInputs({
  readAccount: readAccount,
  covers: covers,
  orgPin: orgPin,
  mayHideDialog: mayHideDialog,
  writesForHiddenDialog: writesForHiddenDialog = mayHideDialog,
}) {
  let c = re();
  ((c.storedAccountReader = readAccount),
    (c.storedCopyGateCovers = covers),
    (c.storedCopyOrgPin = orgPin),
    (c.mayHideDialog = mayHideDialog),
    (c.writesForHiddenDialog = writesForHiddenDialog),
    (c.storedCopyTrust = "not_asked"),
    (c.storedCopyRefusal = null));
}
//@ chunk-dcmhvw5a.js:397882-397991 placement
function setStoredCopyOrgPin(e) {
  let n = re(),
    storedCopyOrgPin = n.storedCopyOrgPin;
  if (((n.storedCopyOrgPin = e), jsonStringify(storedCopyOrgPin) !== jsonStringify(e)))
    n.storedCopyRefusal = null;
}
//@ chunk-dcmhvw5a.js:397991-398070 placement
function refusedCopyForcesRefresh() {
  return getRemoteManagedSettingsRawCache() === null && re().storedCopyRefusal?.forcesRefresh === !0;
}
//@ chunk-dcmhvw5a.js:398070-398144 placement
function getStoredCopyTrust() {
  let storedCopyTrust = re().storedCopyTrust;
  return storedCopyTrust === "not_asked" ? storedCopyTrust : yOt(storedCopyTrust);
}
//@ chunk-dcmhvw5a.js:398144-398192 placement
function getStoredCopyTrustedPrincipal() {
  return trustedPrincipal(re().storedCopyTrust);
}
//@ chunk-dcmhvw5a.js:398192-398277 placement
function rememberEligibility(e, n) {
  return (re().recordEligibility(e, { memoize: !0, ineligibleReason: n }), e);
}
//@ chunk-dcmhvw5a.js:398277-398319 placement
function getEligibilityMemo() {
  return re().eligibilityMemo;
}
//@ chunk-dcmhvw5a.js:398319-398531 placement
function resetEligibilityMemo() {
  let e = re();
  if (
    ((e.eligible = void 0),
    (e.eligibilityMemo = void 0),
    (e.machinePinsSignInMemo = void 0),
    (e.ineligibleReason = void 0),
    e.lastLoadStatus?.state === "ineligible")
  )
    ((e.lastLoadStatus = void 0), (e.loadCycleEnded = !1));
}
//@ chunk-dcmhvw5a.js:398531-398679 placement
function heldMachinePinsSignIn(e, n) {
  let r = re();
  if (r.machinePinsSignInMemo !== void 0) return r.machinePinsSignInMemo;
  let s = e();
  if (n()) r.machinePinsSignInMemo = s;
  return s;
}
//@ chunk-dcmhvw5a.js:398679-398722 placement
function getIneligibleReason() {
  return re().ineligibleReason;
}
//@ chunk-dcmhvw5a.js:398722-398795 placement
function setLastLoadStatus(e) {
  let n = re();
  ((n.lastLoadStatus = e), n.emitLoadStatusChanged(e));
}
//@ chunk-dcmhvw5a.js:398795-398836 placement
function getLastLoadStatus() {
  return re().lastLoadStatus;
}
//@ chunk-dcmhvw5a.js:398836-398943 placement
function markLoadCycleEnded() {
  let e = re();
  if (((e.loadCycleEnded = !0), e.lastLoadStatus === void 0)) e.emitLoadStatusChanged(void 0);
}
//@ chunk-dcmhvw5a.js:398943-398985 placement
function hasLoadCycleEnded() {
  return re().loadCycleEnded;
}
//@ chunk-dcmhvw5a.js:398985-399023 placement
function markLoadCycleBegun() {
  re().loadCycleBegun = !0;
}
//@ chunk-dcmhvw5a.js:399023-399065 placement
function hasLoadCycleBegun() {
  return re().loadCycleBegun;
}
//@ chunk-dcmhvw5a.js:399065-399109 placement
function markLoadBackstopReleased() {
  re().loadBackstopReleased = !0;
}
//@ chunk-dcmhvw5a.js:399109-399345 placement
function servedSettingsLoadLeftNoAnswer() {
  let e = re(),
    lastLoadStatus = e.lastLoadStatus;
  switch (lastLoadStatus?.state) {
    case "failed":
      return !0;
    case "stale_cache":
      return lastLoadStatus.transportEnvWithheld;
    case void 0:
      return e.eligibilityMemo === !0 && (e.loadCycleEnded || e.loadBackstopReleased);
    default:
      return !1;
  }
}
//@ chunk-dcmhvw5a.js:399345-399408 placement
function onLastLoadStatusChanged(e) {
  return re().lastLoadStatusChanged.subscribe(e);
}
//@ chunk-dcmhvw5a.js:399408-399429 placement
function getRemoteSettingsPathOverride() {
  return;
}
//@ chunk-dcmhvw5a.js:399429-399479 placement
function isEvalPolicySnapshotOnly() {
  return re().evalPolicySnapshotOnly;
}
//@ chunk-dcmhvw5a.js:399479-399525 placement
function setEvalPolicySnapshotOnly(e) {
  re().evalPolicySnapshotOnly = e;
}
//@ chunk-dcmhvw5a.js:399525-399572 placement
function getSessionUsesGatewayVariable() {
  return re().usesGatewayVariable;
}
//@ chunk-dcmhvw5a.js:399572-399615 placement
function setSessionUsesGatewayVariable(e) {
  re().usesGatewayVariable = e;
}
//@ chunk-dcmhvw5a.js:399615-399665 placement
function getSessionHybridOrganizationUuid() {
  return re().hybridOrganizationUuid;
}
//@ chunk-dcmhvw5a.js:399665-399837 placement
function setSessionHybridOrganizationUuid(e, n, r, s, a = !1) {
  let c = re();
  ((c.hybridOrganizationUuid = e),
    (c.hybridSignInEnded = n),
    (c.hybridBlockFilter = r),
    (c.hybridProviderFromOrganization = s),
    (c.hybridOnlyForConnection = a));
}
//@ chunk-dcmhvw5a.js:399837-399888 placement
function isHybridOnlyForConnection() {
  return re().hybridOnlyForConnection;
}
//@ chunk-dcmhvw5a.js:399888-399914 placement
var PC = new HostScoped(() => new Map());
//@ chunk-dcmhvw5a.js:399914-399960 placement
function getSessionHybridConnection(e) {
  return PC.of(getRootSession().host).get(e);
}
//@ chunk-dcmhvw5a.js:399960-399991 placement
var DN = new HostScoped(() => ({ value: !0 }));
//@ chunk-dcmhvw5a.js:399991-400023 placement
function Is() {
  return isDiskless() || isEvalPolicySnapshotOnly();
}
//@ chunk-dcmhvw5a.js:400023-400133 placement
function isProjectedSnapshot(e) {
  let { projectedView: projectedView, projectedParse: projectedParse } = re();
  return e !== null && (projectedView?.view === e || projectedParse?.view === e || DC(e));
}

export {
  isEvalPolicySnapshotOnly,
  markLoadCycleBegun,
  onLastLoadStatusChanged,
  isRemoteManagedSettingsVerified,
  getRemoteSettingsPathOverride,
  getEligibilityMemo,
  getLastLoadStatus,
  hasLoadCycleEnded,
  servedSettingsLoadLeftNoAnswer,
  getIneligibleReason,
  servedBodyOf,
  stripReservedKeys,
  getSyncCacheResetEpoch,
  isManagedSettingsCopyKeptVerifiable,
  helperConsentDigest,
  HELPER_CONSENT_STATE_ID,
  getHelperConsentPath,
  getStoredCopyTrust,
  getStoredCopyTrustedPrincipal,
  isManagedSettingsCopyTrustEnforced,
  setSessionCache,
  getRemoteManagedSettingsConsentedBaseline,
  markRemoteManagedSettingsConsented,
  markPolicySettingsNotified,
  markLoadBackstopReleased,
  setLastLoadStatus,
  markLoadCycleEnded,
  SETTINGS_FILENAME,
  getGatewayThatVerifiedRemoteManagedSettings,
  resetEligibilityMemo,
  dropRemoteManagedSettingsConsentDeferral,
  isRemoteManagedSettingsVerifiedAndApprovedForSession,
  Is,
  re,
  Yu,
  xo,
  isProjectedSnapshot,
  refusedCopyForcesRefresh,
  hasLoadCycleBegun,
  getSessionHybridOrganizationUuid,
  resetSyncCache,
  setStoredCopyOrgPin,
  getSessionUsesGatewayVariable,
  setSessionUsesGatewayVariable,
  setSessionHybridOrganizationUuid,
  setStoredCopyGateInputs,
  setEvalPolicySnapshotOnly,
  rememberEligibility,
  heldMachinePinsSignIn,
  hasPolicySettingsNotified,
  registerSyncCacheResetListener,
};
