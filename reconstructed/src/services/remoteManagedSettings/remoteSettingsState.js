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
import { join } from "path";
import { getClaudeConfigDir } from "../../utils/envUtils.js";
import {
  summarizeManagedSettingsRisk,
  needsManagedSettingsConsent,
  realCanonicalPath,
  matchesConsentedHash,
} from "../../components/ManagedSettingsSecurityDialog/utils.js";
import { wi } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { createSignal } from "../../utils/signal.js";
import {
  hasManagedOrCoworkSurface,
  mergeManagedSettingsPaths,
  extractRestrictionSettings,
} from "../../utils/settings/managedRestrictionKeys.js";
import {
  narrowToRestrictions,
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
import { invalidateCommandNames } from "../../utils/settings/commandSyncNames.js";
import {
  isSettingsGateSettled,
  isInteractiveSettingsHost,
  isSettingsGateAnswered,
} from "../../utils/settings/settingsSourceTrust.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { cacheTrustLabel, trustedPrincipal } from "../../utils/settings/policyCertificates.js";
import { isRestrictedUnvouchedDocument } from "./unvouchedRestrictions.js";

//@ chunk-dcmhvw5a.js:392501-392588 placement = SETTINGS_FILENAME (0.646)
/**
 * 远程托管设置与存储视图的字节上限。
 */
var SETTINGS_FILENAME = "remote-settings.json";
var MAX_BACKEND_SETTINGS_BYTES = 5000;
var MAX_STORAGE_VIEW_BYTES = 2097152;
var HELPER_CONSENT_STATE_ID = "remote-settings-helper-consent";
//@ chunk-dcmhvw5a.js:392588-392623 placement
function getHelperConsentPath() {
  return join(getClaudeConfigDir(), HELPER_CONSENT_STATE_ID);
}
//@ chunk-dcmhvw5a.js:392623-392672 placement
/**
 * 计算设置的风险摘要，只在需要用户同意时返回（否则 undefined）。
 */
function consentRiskOrUndefined(e) {
  let n = summarizeManagedSettingsRisk(e);
  return needsManagedSettingsConsent(n) ? n : undefined;
}
//@ chunk-dcmhvw5a.js:392672-392717 placement
function helperConsentDigest(e) {
  let n = consentRiskOrUndefined(e);
  return n && realCanonicalPath(n);
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
//@ chunk-dcmhvw5a.js:392910-396728 placement
/**
 * 远程托管设置的进程级状态（会话缓存、副本信任、组织固定、加载状态、同意基线、混合登录）。
 */
class RemoteSettingsState {
  sessionCache = null;
  storedAccountReader = null;
  storedCopyGateCovers = true;
  storedCopyOrgPin = {
    kind: "unreadable",
  };
  mayHideDialog = () => false;
  writesForHiddenDialog = () => false;
  seededUnjudged = null;
  storedCopyTrust = "not_asked";
  storedCopyRefusal = null;
  helperTierReadAtMs = null;
  refusedCopyHelperTier = null;
  droppedHelperTier = null;
  eligible = undefined;
  eligibilityMemo = undefined;
  machinePinsSignInMemo = undefined;
  ineligibleReason = undefined;
  evalPolicySnapshotOnly = false;
  hybridTokenRenewalDue = false;
  hybridOrganizationUuid = null;
  usesGatewayVariable = false;
  hybridSignInEnded = false;
  hybridBlockFilter = null;
  hybridHostsWithheld = false;
  hybridProviderFromOrganization = false;
  hybridOnlyForConnection = false;
  hybridLeftOut = null;
  lastLoadStatus = undefined;
  loadCycleEnded = false;
  loadCycleBegun = false;
  loadBackstopReleased = false;
  lastLoadStatusChanged = createSignal();
  policySettingsNotified = false;
  verifiedPayload = null;
  verifiedByGateway = undefined;
  unverifiedView = null;
  projectedView = null;
  projectedParse = null;
  consentedPayload = null;
  deferredPayload = null;
  resetEpoch = 0;
  backendView = undefined;
  coworkCloudHolds = {};
  heldSoFar(e) {
    let n = Object.keys(this.coworkCloudHolds).length > 0;
    if (!n && !hasManagedOrCoworkSurface()) return e;
    if (e !== null) {
      let r = mergeManagedSettingsPaths(this.coworkCloudHolds, e);
      this.coworkCloudHolds = extractRestrictionSettings(r);
      return r;
    }
    return n ? this.coworkCloudHolds : null;
  }
  replaceSessionCache(e, n) {
    let r = n?.verified === true || !hasManagedOrCoworkSurface();
    if (!r && e !== null && e === this.sessionCache) return;
    let s = this.heldSoFar(r ? narrowToRestrictions(e) : null);
    this.keepHelperLeaving();
    this.sessionCache = s;
    if (n?.verified) {
      this.seededUnjudged = null;
      this.verifiedPayload = s;
      this.verifiedByGateway = getGatewayAuth()?.url;
      this.projectedView = null;
      this.projectedParse = null;
      if (n.consentDeferred) this.deferredPayload = s;
    }
  }
  seedFromDisk(e) {
    let n =
      Object.keys(this.coworkCloudHolds).length > 0 ? mergeManagedSettingsPaths(this.coworkCloudHolds, e) : e;
    this.sessionCache = n;
    this.seedConsentBaseline(n);
  }
  seedConsentBaseline(e) {
    let n = consentRiskOrUndefined(e);
    if (n !== undefined) {
      let helperConsentAttestation = readHelperConsentAttestation();
      if (
        helperConsentAttestation === undefined ||
        !matchesConsentedHash(helperConsentAttestation, n, e.claudeMd)
      )
        return;
    }
    this.consentedPayload ??= e;
  }
  markConsented(consentedPayload) {
    this.consentedPayload = consentedPayload;
  }
  dropConsentDeferral() {
    this.deferredPayload = null;
  }
  markPolicySettingsNotified() {
    this.policySettingsNotified = true;
  }
  recordEligibility(e, n) {
    this.eligible = e;
    if (n.memoize) {
      this.eligibilityMemo = e;
      this.ineligibleReason = e ? undefined : n.ineligibleReason;
    }
  }
  resetListener = null;
  registerResetListener(resetListener) {
    if (this.resetListener !== null)
      throw Error(
        "registerSyncCacheResetListener: a listener is already registered; a second one would unhook the first",
      );
    this.resetListener = resetListener;
  }
  keepHelperLeaving() {
    if (this.sessionCache === this.verifiedPayload) {
      let e = helperTierOf(this.sessionCache);
      this.droppedHelperTier =
        e === null
          ? this.droppedHelperTier
          : {
              ...e,
              env: {
                ...this.droppedHelperTier?.env,
                ...e.env,
              },
            };
    }
  }
  reset() {
    this.keepHelperLeaving();
    this.sessionCache = null;
    this.helperTierReadAtMs = null;
    this.storedCopyTrust = "not_asked";
    this.storedCopyRefusal = null;
    this.refusedCopyHelperTier = null;
    this.storedAccountReader = null;
    this.storedCopyGateCovers = true;
    this.storedCopyOrgPin = {
      kind: "unreadable",
    };
    this.mayHideDialog = () => false;
    this.writesForHiddenDialog = () => false;
    this.seededUnjudged = null;
    this.eligible = undefined;
    this.eligibilityMemo = undefined;
    this.machinePinsSignInMemo = undefined;
    this.ineligibleReason = undefined;
    this.hybridTokenRenewalDue = false;
    this.evalPolicySnapshotOnly = false;
    this.hybridOrganizationUuid = null;
    this.usesGatewayVariable = false;
    this.hybridSignInEnded = false;
    this.hybridBlockFilter = null;
    this.hybridHostsWithheld = false;
    this.hybridProviderFromOrganization = false;
    this.hybridOnlyForConnection = false;
    this.hybridLeftOut = null;
    this.lastLoadStatus = undefined;
    this.loadCycleEnded = false;
    this.loadCycleBegun = false;
    this.loadBackstopReleased = false;
    this.policySettingsNotified = false;
    this.verifiedPayload = null;
    this.verifiedByGateway = undefined;
    this.unverifiedView = null;
    this.projectedView = null;
    this.projectedParse = null;
    this.consentedPayload = null;
    this.deferredPayload = null;
    this.resetEpoch++;
    this.emitLoadStatusChanged(undefined);
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
/**
 * 按 host 隔离的远程托管设置进程状态容器（会话缓存、信任、加载状态、同意基线等）。
 */
var remoteSettingsStateSlots = new HostScoped(() => new RemoteSettingsState());
//@ chunk-dcmhvw5a.js:396753-396790 placement
/**
 * 取当前 host 的远程托管设置状态（本文件及缓存/加载模块的高频入口）。
 */
function currentRemoteSettingsState_2() {
  return remoteSettingsStateSlots.of(getRootSession().host);
}
//@ chunk-dcmhvw5a.js:396790-396827 placement
function getSyncCacheResetEpoch() {
  return currentRemoteSettingsState_2().resetEpoch;
}
//@ chunk-dcmhvw5a.js:396827-396871 placement
function getRemoteManagedSettingsConsentedBaseline() {
  return currentRemoteSettingsState_2().consentedPayload;
}
//@ chunk-dcmhvw5a.js:396871-396909 placement
function markRemoteManagedSettingsConsented(e) {
  currentRemoteSettingsState_2().markConsented(e);
}
//@ chunk-dcmhvw5a.js:396909-396951 placement
function dropRemoteManagedSettingsConsentDeferral() {
  currentRemoteSettingsState_2().dropConsentDeferral();
}
//@ chunk-dcmhvw5a.js:396951-397007 placement
function setSessionCache(remoteManagedSettingsRawCache, n, r) {
  currentRemoteSettingsState_2().replaceSessionCache(remoteManagedSettingsRawCache, n);
  invalidateCommandNames(r);
}
//@ chunk-dcmhvw5a.js:397007-397087 placement
function isRemoteManagedSettingsVerified() {
  let { sessionCache, verifiedPayload } = currentRemoteSettingsState_2();
  return sessionCache !== null && sessionCache === verifiedPayload;
}
//@ chunk-dcmhvw5a.js:397087-397144 placement
function getGatewayThatVerifiedRemoteManagedSettings() {
  return isRemoteManagedSettingsVerified() ? currentRemoteSettingsState_2().verifiedByGateway : undefined;
}
//@ chunk-dcmhvw5a.js:397144-397278 placement
function isRemoteManagedSettingsVerifiedAndApprovedForSession() {
  let { sessionCache, verifiedPayload, consentedPayload, deferredPayload } = currentRemoteSettingsState_2();
  return (
    sessionCache !== null &&
    sessionCache === verifiedPayload &&
    (sessionCache === consentedPayload || sessionCache === deferredPayload)
  );
}
//@ chunk-dcmhvw5a.js:397278-397324 placement
function registerSyncCacheResetListener(deactivateRemoteHelper) {
  currentRemoteSettingsState_2().registerResetListener(deactivateRemoteHelper);
}
//@ chunk-dcmhvw5a.js:397324-397380 placement
function resetSyncCache() {
  let e = currentRemoteSettingsState_2();
  e.reset();
  e.resetListener?.();
}
//@ chunk-dcmhvw5a.js:397380-397429 placement
function markPolicySettingsNotified() {
  currentRemoteSettingsState_2().markPolicySettingsNotified();
}
//@ chunk-dcmhvw5a.js:397429-397479 placement
function hasPolicySettingsNotified() {
  return currentRemoteSettingsState_2().policySettingsNotified;
}
//@ chunk-dcmhvw5a.js:397479-397554 placement
function isManagedSettingsCopyTrustEnforced() {
  return (
    isSettingsGateSettled() ||
    (((!isInteractivityDecided() && !isNoDialogLaunch()) || isInteractiveSettingsHost()) &&
      currentRemoteSettingsState_2().mayHideDialog())
  );
}
//@ chunk-dcmhvw5a.js:397554-397612 placement
function isManagedSettingsCopyKeptVerifiable() {
  return isSettingsGateAnswered() || currentRemoteSettingsState_2().writesForHiddenDialog();
}
//@ chunk-dcmhvw5a.js:397612-397882 placement
function setStoredCopyGateInputs({
  readAccount,
  covers,
  orgPin,
  mayHideDialog,
  writesForHiddenDialog = mayHideDialog,
}) {
  let c = currentRemoteSettingsState_2();
  c.storedAccountReader = readAccount;
  c.storedCopyGateCovers = covers;
  c.storedCopyOrgPin = orgPin;
  c.mayHideDialog = mayHideDialog;
  c.writesForHiddenDialog = writesForHiddenDialog;
  c.storedCopyTrust = "not_asked";
  c.storedCopyRefusal = null;
}
//@ chunk-dcmhvw5a.js:397882-397991 placement
function setStoredCopyOrgPin(orgPinState) {
  let n = currentRemoteSettingsState_2();
  let storedCopyOrgPin = n.storedCopyOrgPin;
  n.storedCopyOrgPin = orgPinState;
  if (jsonStringify(storedCopyOrgPin) !== jsonStringify(orgPinState)) n.storedCopyRefusal = null;
}
//@ chunk-dcmhvw5a.js:397991-398070 placement
function refusedCopyForcesRefresh() {
  return (
    getRemoteManagedSettingsRawCache() === null &&
    currentRemoteSettingsState_2().storedCopyRefusal?.forcesRefresh === true
  );
}
//@ chunk-dcmhvw5a.js:398070-398144 placement
function getStoredCopyTrust() {
  let storedCopyTrust = currentRemoteSettingsState_2().storedCopyTrust;
  return storedCopyTrust === "not_asked" ? storedCopyTrust : cacheTrustLabel(storedCopyTrust);
}
//@ chunk-dcmhvw5a.js:398144-398192 placement
function getStoredCopyTrustedPrincipal() {
  return trustedPrincipal(currentRemoteSettingsState_2().storedCopyTrust);
}
//@ chunk-dcmhvw5a.js:398192-398277 placement
function rememberEligibility(e, ineligibleReason) {
  currentRemoteSettingsState_2().recordEligibility(e, {
    memoize: true,
    ineligibleReason,
  });
  return e;
}
//@ chunk-dcmhvw5a.js:398277-398319 placement
function getEligibilityMemo() {
  return currentRemoteSettingsState_2().eligibilityMemo;
}
//@ chunk-dcmhvw5a.js:398319-398531 placement
function resetEligibilityMemo() {
  let e = currentRemoteSettingsState_2();
  e.eligible = undefined;
  e.eligibilityMemo = undefined;
  e.machinePinsSignInMemo = undefined;
  e.ineligibleReason = undefined;
  if (e.lastLoadStatus?.state === "ineligible") {
    e.lastLoadStatus = undefined;
    e.loadCycleEnded = false;
  }
}
//@ chunk-dcmhvw5a.js:398531-398679 placement
function heldMachinePinsSignIn(machineAdminPinsSignInOrg, hasMdmResult) {
  let r = currentRemoteSettingsState_2();
  if (r.machinePinsSignInMemo !== undefined) return r.machinePinsSignInMemo;
  let s = machineAdminPinsSignInOrg();
  if (hasMdmResult()) r.machinePinsSignInMemo = s;
  return s;
}
//@ chunk-dcmhvw5a.js:398679-398722 placement
function getIneligibleReason() {
  return currentRemoteSettingsState_2().ineligibleReason;
}
//@ chunk-dcmhvw5a.js:398722-398795 placement
function setLastLoadStatus(e) {
  let n = currentRemoteSettingsState_2();
  n.lastLoadStatus = e;
  n.emitLoadStatusChanged(e);
}
//@ chunk-dcmhvw5a.js:398795-398836 placement
function getLastLoadStatus() {
  return currentRemoteSettingsState_2().lastLoadStatus;
}
//@ chunk-dcmhvw5a.js:398836-398943 placement
function markLoadCycleEnded() {
  let e = currentRemoteSettingsState_2();
  e.loadCycleEnded = true;
  if (e.lastLoadStatus === undefined) e.emitLoadStatusChanged(undefined);
}
//@ chunk-dcmhvw5a.js:398943-398985 placement
function hasLoadCycleEnded() {
  return currentRemoteSettingsState_2().loadCycleEnded;
}
//@ chunk-dcmhvw5a.js:398985-399023 placement
function markLoadCycleBegun() {
  currentRemoteSettingsState_2().loadCycleBegun = true;
}
//@ chunk-dcmhvw5a.js:399023-399065 placement
function hasLoadCycleBegun() {
  return currentRemoteSettingsState_2().loadCycleBegun;
}
//@ chunk-dcmhvw5a.js:399065-399109 placement
function markLoadBackstopReleased() {
  currentRemoteSettingsState_2().loadBackstopReleased = true;
}
//@ chunk-dcmhvw5a.js:399109-399345 placement
function servedSettingsLoadLeftNoAnswer() {
  let e = currentRemoteSettingsState_2();
  let lastLoadStatus = e.lastLoadStatus;
  switch (lastLoadStatus?.state) {
    case "failed":
      return true;
    case "stale_cache":
      return lastLoadStatus.transportEnvWithheld;
    case undefined:
      return e.eligibilityMemo === true && (e.loadCycleEnded || e.loadBackstopReleased);
    default:
      return false;
  }
}
//@ chunk-dcmhvw5a.js:399345-399408 placement
function onLastLoadStatusChanged(e) {
  return currentRemoteSettingsState_2().lastLoadStatusChanged.subscribe(e);
}
//@ chunk-dcmhvw5a.js:399408-399429 placement
function getRemoteSettingsPathOverride() {
  return;
}
//@ chunk-dcmhvw5a.js:399429-399479 placement
function isEvalPolicySnapshotOnly() {
  return currentRemoteSettingsState_2().evalPolicySnapshotOnly;
}
//@ chunk-dcmhvw5a.js:399479-399525 placement
function setEvalPolicySnapshotOnly(evalPolicySnapshotOnly) {
  currentRemoteSettingsState_2().evalPolicySnapshotOnly = evalPolicySnapshotOnly;
}
//@ chunk-dcmhvw5a.js:399525-399572 placement
function getSessionUsesGatewayVariable() {
  return currentRemoteSettingsState_2().usesGatewayVariable;
}
//@ chunk-dcmhvw5a.js:399572-399615 placement
function setSessionUsesGatewayVariable(usesGatewayVariable) {
  currentRemoteSettingsState_2().usesGatewayVariable = usesGatewayVariable;
}
//@ chunk-dcmhvw5a.js:399615-399665 placement
function getSessionHybridOrganizationUuid() {
  return currentRemoteSettingsState_2().hybridOrganizationUuid;
}
//@ chunk-dcmhvw5a.js:399665-399837 placement
function setSessionHybridOrganizationUuid(
  hybridOrganizationUuid,
  hybridSignInEnded,
  hybridBlockFilter,
  hybridProviderFromOrganization,
  hybridOnlyForConnection = false,
) {
  let c = currentRemoteSettingsState_2();
  c.hybridOrganizationUuid = hybridOrganizationUuid;
  c.hybridSignInEnded = hybridSignInEnded;
  c.hybridBlockFilter = hybridBlockFilter;
  c.hybridProviderFromOrganization = hybridProviderFromOrganization;
  c.hybridOnlyForConnection = hybridOnlyForConnection;
}
//@ chunk-dcmhvw5a.js:399837-399888 placement
function isHybridOnlyForConnection() {
  return currentRemoteSettingsState_2().hybridOnlyForConnection;
}
//@ chunk-dcmhvw5a.js:399888-399914 placement
/**
 * 按 host 保存的混合（网关）连接映射表。
 */
var hybridConnectionSlots = new HostScoped(() => new Map());
//@ chunk-dcmhvw5a.js:399914-399960 placement
function getSessionHybridConnection(e) {
  return hybridConnectionSlots.of(getRootSession().host).get(e);
}
//@ chunk-dcmhvw5a.js:399960-399991 placement
var verifyAllowedState = new HostScoped(() => ({
  value: true,
}));
//@ chunk-dcmhvw5a.js:399991-400023 placement
/**
 * 无盘会话或只做策略快照评估时，不依赖磁盘缓存。
 */
function isSnapshotOnlySession() {
  return isDiskless() || isEvalPolicySnapshotOnly();
}
//@ chunk-dcmhvw5a.js:400023-400133 placement
function isProjectedSnapshot(e) {
  let { projectedView, projectedParse } = currentRemoteSettingsState_2();
  return (
    e !== null &&
    (projectedView?.view === e || projectedParse?.view === e || isRestrictedUnvouchedDocument(e))
  );
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
  isSnapshotOnlySession,
  currentRemoteSettingsState_2,
  MAX_BACKEND_SETTINGS_BYTES,
  MAX_STORAGE_VIEW_BYTES,
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
