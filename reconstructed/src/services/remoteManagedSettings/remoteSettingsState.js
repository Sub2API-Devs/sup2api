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
import { import_reject } from "../../../vendor/lodash-es/_inlinedHelpers.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

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
function consentRiskOrUndefined(settings) {
  let risk = summarizeManagedSettingsRisk(settings);
  return needsManagedSettingsConsent(risk) ? risk : undefined;
}
//@ chunk-dcmhvw5a.js:392672-392717 placement
function helperConsentDigest(settings) {
  let risk = consentRiskOrUndefined(settings);
  return risk && realCanonicalPath(risk);
}
//@ chunk-dcmhvw5a.js:392717-392855 placement
function stripReservedKeys(settings) {
  let stripped = import_reject(settings, (value, key) => key.startsWith("$") && key !== "$schema");
  if (Object.keys(stripped).length !== Object.keys(settings).length) weakMap.set(stripped, settings);
  return stripped;
}
//@ chunk-dcmhvw5a.js:392855-392891 placement
function servedBodyOf(settings) {
  return weakMap.get(settings) ?? settings;
}
//@ chunk-dcmhvw5a.js:392891-392910 placement
var weakMap; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-dcmhvw5a.js:392891", () => {
  weakMap = new WeakMap();
});
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
  heldSoFar(settings) {
    let hasHolds = Object.keys(this.coworkCloudHolds).length > 0;
    if (!hasHolds && !hasManagedOrCoworkSurface()) return settings;
    if (settings !== null) {
      let merged = mergeManagedSettingsPaths(this.coworkCloudHolds, settings);
      this.coworkCloudHolds = extractRestrictionSettings(merged);
      return merged;
    }
    return hasHolds ? this.coworkCloudHolds : null;
  }
  replaceSessionCache(next, options) {
    let verified = options?.verified === true || !hasManagedOrCoworkSurface();
    if (!verified && next !== null && next === this.sessionCache) return;
    let held = this.heldSoFar(verified ? narrowToRestrictions(next) : null);
    this.keepHelperLeaving();
    this.sessionCache = held;
    if (options?.verified) {
      this.seededUnjudged = null;
      this.verifiedPayload = held;
      this.verifiedByGateway = getGatewayAuth()?.url;
      this.projectedView = null;
      this.projectedParse = null;
      if (options.consentDeferred) this.deferredPayload = held;
    }
  }
  seedFromDisk(settings) {
    let merged =
      Object.keys(this.coworkCloudHolds).length > 0
        ? mergeManagedSettingsPaths(this.coworkCloudHolds, settings)
        : settings;
    this.sessionCache = merged;
    this.seedConsentBaseline(merged);
  }
  seedConsentBaseline(settings) {
    let risk = consentRiskOrUndefined(settings);
    if (risk !== undefined) {
      let consentedHash = readHelperConsentAttestation();
      if (consentedHash === undefined || !matchesConsentedHash(consentedHash, risk, settings.claudeMd))
        return;
    }
    this.consentedPayload ??= settings;
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
  recordEligibility(eligible, options) {
    this.eligible = eligible;
    if (options.memoize) {
      this.eligibilityMemo = eligible;
      this.ineligibleReason = eligible ? undefined : options.ineligibleReason;
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
      let tier = helperTierOf(this.sessionCache);
      this.droppedHelperTier =
        tier === null
          ? this.droppedHelperTier
          : {
              ...tier,
              env: {
                ...this.droppedHelperTier?.env,
                ...tier.env,
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
  emitLoadStatusChanged(status) {
    try {
      this.lastLoadStatusChanged.emit(status);
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
var remoteSettingsStateSlots; // deferred: uses RemoteSettingsState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-dcmhvw5a.js:396728", () => {
  remoteSettingsStateSlots = new HostScoped(() => new RemoteSettingsState());
});
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
function markRemoteManagedSettingsConsented(settings) {
  currentRemoteSettingsState_2().markConsented(settings);
}
//@ chunk-dcmhvw5a.js:396909-396951 placement
function dropRemoteManagedSettingsConsentDeferral() {
  currentRemoteSettingsState_2().dropConsentDeferral();
}
//@ chunk-dcmhvw5a.js:396951-397007 placement
function setSessionCache(nextCache, options, extra) {
  currentRemoteSettingsState_2().replaceSessionCache(nextCache, options);
  invalidateCommandNames(extra);
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
  let state = currentRemoteSettingsState_2();
  state.reset();
  state.resetListener?.();
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
  let state = currentRemoteSettingsState_2();
  state.storedAccountReader = readAccount;
  state.storedCopyGateCovers = covers;
  state.storedCopyOrgPin = orgPin;
  state.mayHideDialog = mayHideDialog;
  state.writesForHiddenDialog = writesForHiddenDialog;
  state.storedCopyTrust = "not_asked";
  state.storedCopyRefusal = null;
}
//@ chunk-dcmhvw5a.js:397882-397991 placement
function setStoredCopyOrgPin(orgPinState) {
  let state = currentRemoteSettingsState_2();
  let storedCopyOrgPin = state.storedCopyOrgPin;
  state.storedCopyOrgPin = orgPinState;
  if (jsonStringify(storedCopyOrgPin) !== jsonStringify(orgPinState)) state.storedCopyRefusal = null;
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
function rememberEligibility(eligible, ineligibleReason) {
  currentRemoteSettingsState_2().recordEligibility(eligible, {
    memoize: true,
    ineligibleReason,
  });
  return eligible;
}
//@ chunk-dcmhvw5a.js:398277-398319 placement
function getEligibilityMemo() {
  return currentRemoteSettingsState_2().eligibilityMemo;
}
//@ chunk-dcmhvw5a.js:398319-398531 placement
function resetEligibilityMemo() {
  let state = currentRemoteSettingsState_2();
  state.eligible = undefined;
  state.eligibilityMemo = undefined;
  state.machinePinsSignInMemo = undefined;
  state.ineligibleReason = undefined;
  if (state.lastLoadStatus?.state === "ineligible") {
    state.lastLoadStatus = undefined;
    state.loadCycleEnded = false;
  }
}
//@ chunk-dcmhvw5a.js:398531-398679 placement
function heldMachinePinsSignIn(machineAdminPinsSignInOrg, hasMdmResult) {
  let state = currentRemoteSettingsState_2();
  if (state.machinePinsSignInMemo !== undefined) return state.machinePinsSignInMemo;
  let pinsSignIn = machineAdminPinsSignInOrg();
  if (hasMdmResult()) state.machinePinsSignInMemo = pinsSignIn;
  return pinsSignIn;
}
//@ chunk-dcmhvw5a.js:398679-398722 placement
function getIneligibleReason() {
  return currentRemoteSettingsState_2().ineligibleReason;
}
//@ chunk-dcmhvw5a.js:398722-398795 placement
function setLastLoadStatus(status) {
  let state = currentRemoteSettingsState_2();
  state.lastLoadStatus = status;
  state.emitLoadStatusChanged(status);
}
//@ chunk-dcmhvw5a.js:398795-398836 placement
function getLastLoadStatus() {
  return currentRemoteSettingsState_2().lastLoadStatus;
}
//@ chunk-dcmhvw5a.js:398836-398943 placement
function markLoadCycleEnded() {
  let state = currentRemoteSettingsState_2();
  state.loadCycleEnded = true;
  if (state.lastLoadStatus === undefined) state.emitLoadStatusChanged(undefined);
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
  let state = currentRemoteSettingsState_2();
  let lastLoadStatus = state.lastLoadStatus;
  switch (lastLoadStatus?.state) {
    case "failed":
      return true;
    case "stale_cache":
      return lastLoadStatus.transportEnvWithheld;
    case undefined:
      return state.eligibilityMemo === true && (state.loadCycleEnded || state.loadBackstopReleased);
    default:
      return false;
  }
}
//@ chunk-dcmhvw5a.js:399345-399408 placement
function onLastLoadStatusChanged(listener) {
  return currentRemoteSettingsState_2().lastLoadStatusChanged.subscribe(listener);
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
  let state = currentRemoteSettingsState_2();
  state.hybridOrganizationUuid = hybridOrganizationUuid;
  state.hybridSignInEnded = hybridSignInEnded;
  state.hybridBlockFilter = hybridBlockFilter;
  state.hybridProviderFromOrganization = hybridProviderFromOrganization;
  state.hybridOnlyForConnection = hybridOnlyForConnection;
}
//@ chunk-dcmhvw5a.js:399837-399888 placement
function isHybridOnlyForConnection() {
  return currentRemoteSettingsState_2().hybridOnlyForConnection;
}
//@ chunk-dcmhvw5a.js:399888-399914 placement
/**
 * 按 host 保存的混合（网关）连接映射表。
 */
var hybridConnectionSlots; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-dcmhvw5a.js:399888", () => {
  hybridConnectionSlots = new HostScoped(() => new Map());
});
//@ chunk-dcmhvw5a.js:399914-399960 placement
function getSessionHybridConnection(hybridOrganizationUuid) {
  return hybridConnectionSlots.of(getRootSession().host).get(hybridOrganizationUuid);
}
//@ chunk-dcmhvw5a.js:399960-399991 placement
var verifyAllowedState; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-dcmhvw5a.js:399960", () => {
  verifyAllowedState = new HostScoped(() => ({
    value: true,
  }));
});
//@ chunk-dcmhvw5a.js:399991-400023 placement
/**
 * 无盘会话或只做策略快照评估时，不依赖磁盘缓存。
 */
function isSnapshotOnlySession() {
  return isDiskless() || isEvalPolicySnapshotOnly();
}
//@ chunk-dcmhvw5a.js:400023-400133 placement
function isProjectedSnapshot(settings) {
  let { projectedView, projectedParse } = currentRemoteSettingsState_2();
  return (
    settings !== null &&
    (projectedView?.view === settings ||
      projectedParse?.view === settings ||
      isRestrictedUnvouchedDocument(settings))
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
  getSessionHybridConnection,
  isHybridOnlyForConnection,
};
