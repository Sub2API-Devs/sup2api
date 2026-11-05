/**
 * services/remoteManagedSettings/remoteSettingsState.ts
 *
 * 2.1.316 新增：远程托管设置的进程级状态（会话缓存、副本信任、组织固定、加载状态、同意基线、混合登录）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-z20c443b.js (57)
 * attribution: placement 57
 */
import { join } from "path";
import { getClaudeConfigDir } from "../../utils/markdownConfigLoader.js";
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

//@ chunk-z20c443b.js:390747-390834 placement (2.1.88 match: SETTINGS_FILENAME, 0.646)
/**
 * 远程托管设置与存储视图的字节上限。
 */
var SETTINGS_FILENAME = "remote-settings.json";
var MAX_BACKEND_SETTINGS_BYTES = 5000;
var MAX_STORAGE_VIEW_BYTES = 2097152;
var HELPER_CONSENT_STATE_ID = "remote-settings-helper-consent";
//@ chunk-z20c443b.js:390834-390869 placement
function getHelperConsentPath() {
  return join(getClaudeConfigDir(), HELPER_CONSENT_STATE_ID);
}
//@ chunk-z20c443b.js:390869-390918 placement
/**
 * 计算设置的风险摘要，只在需要用户同意时返回（否则 undefined）。
 */
function consentRiskOrUndefined(settings) {
  let risk = summarizeManagedSettingsRisk(settings);
  return needsManagedSettingsConsent(risk) ? risk : undefined;
}
//@ chunk-z20c443b.js:390918-390963 placement
function helperConsentDigest(settings) {
  let risk = consentRiskOrUndefined(settings);
  return risk && realCanonicalPath(risk);
}
//@ chunk-z20c443b.js:390963-391101 placement
function stripReservedKeys(settings) {
  let stripped = import_reject(settings, (value, key) => key.startsWith("$") && key !== "$schema");
  if (Object.keys(stripped).length !== Object.keys(settings).length) weakMap.set(stripped, settings);
  return stripped;
}
//@ chunk-z20c443b.js:391101-391137 placement
function servedBodyOf(settings) {
  return weakMap.get(settings) ?? settings;
}
//@ chunk-z20c443b.js:391137-391156 placement
var weakMap; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-z20c443b.js:391137", () => {
  weakMap = new WeakMap();
});
//@ chunk-z20c443b.js:391156-395053 placement
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
  hybridCacheLeftOut = null;
  lastLoadStatus = undefined;
  loadCycleEnded = false;
  loadCycleBegun = false;
  loadCycleEndedSignal = createSignal();
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
    this.hybridCacheLeftOut = null;
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
//@ chunk-z20c443b.js:395053-395078 placement
/**
 * 按 host 隔离的远程托管设置进程状态容器（会话缓存、信任、加载状态、同意基线等）。
 */
var remoteSettingsStateSlots; // deferred: uses RemoteSettingsState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-z20c443b.js:395053", () => {
  remoteSettingsStateSlots = new HostScoped(() => new RemoteSettingsState());
});
//@ chunk-z20c443b.js:395078-395115 placement
/**
 * 取当前 host 的远程托管设置状态（本文件及缓存/加载模块的高频入口）。
 */
function currentRemoteSettingsState_2() {
  return remoteSettingsStateSlots.of(getRootSession().host);
}
//@ chunk-z20c443b.js:395115-395152 placement
function getSyncCacheResetEpoch() {
  return currentRemoteSettingsState_2().resetEpoch;
}
//@ chunk-z20c443b.js:395152-395196 placement
function getRemoteManagedSettingsConsentedBaseline() {
  return currentRemoteSettingsState_2().consentedPayload;
}
//@ chunk-z20c443b.js:395196-395234 placement
function markRemoteManagedSettingsConsented(settings) {
  currentRemoteSettingsState_2().markConsented(settings);
}
//@ chunk-z20c443b.js:395234-395276 placement
function dropRemoteManagedSettingsConsentDeferral() {
  currentRemoteSettingsState_2().dropConsentDeferral();
}
//@ chunk-z20c443b.js:395276-395332 placement
function setSessionCache(nextCache, options, extra) {
  currentRemoteSettingsState_2().replaceSessionCache(nextCache, options);
  invalidateCommandNames(extra);
}
//@ chunk-z20c443b.js:395332-395412 placement
function isRemoteManagedSettingsVerified() {
  let { sessionCache, verifiedPayload } = currentRemoteSettingsState_2();
  return sessionCache !== null && sessionCache === verifiedPayload;
}
//@ chunk-z20c443b.js:395412-395469 placement
function getGatewayThatVerifiedRemoteManagedSettings() {
  return isRemoteManagedSettingsVerified() ? currentRemoteSettingsState_2().verifiedByGateway : undefined;
}
//@ chunk-z20c443b.js:395469-395603 placement
function isRemoteManagedSettingsVerifiedAndApprovedForSession() {
  let { sessionCache, verifiedPayload, consentedPayload, deferredPayload } = currentRemoteSettingsState_2();
  return (
    sessionCache !== null &&
    sessionCache === verifiedPayload &&
    (sessionCache === consentedPayload || sessionCache === deferredPayload)
  );
}
//@ chunk-z20c443b.js:395603-395649 placement
function registerSyncCacheResetListener(deactivateRemoteHelper) {
  currentRemoteSettingsState_2().registerResetListener(deactivateRemoteHelper);
}
//@ chunk-z20c443b.js:395649-395705 placement
function resetSyncCache() {
  let state = currentRemoteSettingsState_2();
  state.reset();
  state.resetListener?.();
}
//@ chunk-z20c443b.js:395705-395754 placement
function markPolicySettingsNotified() {
  currentRemoteSettingsState_2().markPolicySettingsNotified();
}
//@ chunk-z20c443b.js:395754-395804 placement
function hasPolicySettingsNotified() {
  return currentRemoteSettingsState_2().policySettingsNotified;
}
//@ chunk-z20c443b.js:395804-395879 placement
function isManagedSettingsCopyTrustEnforced() {
  return (
    isSettingsGateSettled() ||
    (((!isInteractivityDecided() && !isNoDialogLaunch()) || isInteractiveSettingsHost()) &&
      currentRemoteSettingsState_2().mayHideDialog())
  );
}
//@ chunk-z20c443b.js:395879-395937 placement
function isManagedSettingsCopyKeptVerifiable() {
  return isSettingsGateAnswered() || currentRemoteSettingsState_2().writesForHiddenDialog();
}
//@ chunk-z20c443b.js:395937-396207 placement
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
//@ chunk-z20c443b.js:396207-396316 placement
function setStoredCopyOrgPin(orgPinState) {
  let state = currentRemoteSettingsState_2();
  let storedCopyOrgPin = state.storedCopyOrgPin;
  state.storedCopyOrgPin = orgPinState;
  if (jsonStringify(storedCopyOrgPin) !== jsonStringify(orgPinState)) state.storedCopyRefusal = null;
}
//@ chunk-z20c443b.js:396316-396395 placement
function refusedCopyForcesRefresh() {
  return (
    getRemoteManagedSettingsRawCache() === null &&
    currentRemoteSettingsState_2().storedCopyRefusal?.forcesRefresh === true
  );
}
//@ chunk-z20c443b.js:396395-396469 placement
function getStoredCopyTrust() {
  let storedCopyTrust = currentRemoteSettingsState_2().storedCopyTrust;
  return storedCopyTrust === "not_asked" ? storedCopyTrust : cacheTrustLabel(storedCopyTrust);
}
//@ chunk-z20c443b.js:396469-396517 placement
function getStoredCopyTrustedPrincipal() {
  return trustedPrincipal(currentRemoteSettingsState_2().storedCopyTrust);
}
//@ chunk-z20c443b.js:396517-396602 placement
function rememberEligibility(eligible, ineligibleReason) {
  currentRemoteSettingsState_2().recordEligibility(eligible, {
    memoize: true,
    ineligibleReason,
  });
  return eligible;
}
//@ chunk-z20c443b.js:396602-396644 placement
function getEligibilityMemo() {
  return currentRemoteSettingsState_2().eligibilityMemo;
}
//@ chunk-z20c443b.js:396644-396856 placement
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
//@ chunk-z20c443b.js:396856-397004 placement
function heldMachinePinsSignIn(machineAdminPinsSignInOrg, hasMdmResult) {
  let state = currentRemoteSettingsState_2();
  if (state.machinePinsSignInMemo !== undefined) return state.machinePinsSignInMemo;
  let pinsSignIn = machineAdminPinsSignInOrg();
  if (hasMdmResult()) state.machinePinsSignInMemo = pinsSignIn;
  return pinsSignIn;
}
//@ chunk-z20c443b.js:397004-397048 placement
function getIneligibleReason() {
  return currentRemoteSettingsState_2().ineligibleReason;
}
//@ chunk-z20c443b.js:397048-397121 placement
function setLastLoadStatus(status) {
  let state = currentRemoteSettingsState_2();
  state.lastLoadStatus = status;
  state.emitLoadStatusChanged(status);
}
//@ chunk-z20c443b.js:397121-397162 placement
function getLastLoadStatus() {
  return currentRemoteSettingsState_2().lastLoadStatus;
}
//@ chunk-z20c443b.js:397162-397299 placement
function markLoadCycleEnded() {
  let state = currentRemoteSettingsState_2();
  state.loadCycleEnded = true;
  if (state.lastLoadStatus === undefined) state.emitLoadStatusChanged(undefined);
  state.loadCycleEndedSignal.emit();
}
//@ chunk-z20c443b.js:397299-397361 placement
/**
 * 订阅远端托管设置的加载周期结束信号。
 */
function onLoadCycleEnded(listener) {
  return currentRemoteSettingsState_2().loadCycleEndedSignal.subscribe(listener);
}
//@ chunk-z20c443b.js:397361-397403 placement
function hasLoadCycleEnded() {
  return currentRemoteSettingsState_2().loadCycleEnded;
}
//@ chunk-z20c443b.js:397403-397441 placement
function markLoadCycleBegun() {
  currentRemoteSettingsState_2().loadCycleBegun = true;
}
//@ chunk-z20c443b.js:397441-397483 placement
function hasLoadCycleBegun() {
  return currentRemoteSettingsState_2().loadCycleBegun;
}
//@ chunk-z20c443b.js:397483-397527 placement
function markLoadBackstopReleased() {
  currentRemoteSettingsState_2().loadBackstopReleased = true;
}
//@ chunk-z20c443b.js:397527-397763 placement
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
//@ chunk-z20c443b.js:397763-397826 placement
function onLastLoadStatusChanged(listener) {
  return currentRemoteSettingsState_2().lastLoadStatusChanged.subscribe(listener);
}
//@ chunk-z20c443b.js:397826-397847 placement
function getRemoteSettingsPathOverride() {
  return;
}
//@ chunk-z20c443b.js:397847-397897 placement
function isEvalPolicySnapshotOnly() {
  return currentRemoteSettingsState_2().evalPolicySnapshotOnly;
}
//@ chunk-z20c443b.js:397897-397943 placement
function setEvalPolicySnapshotOnly(evalPolicySnapshotOnly) {
  currentRemoteSettingsState_2().evalPolicySnapshotOnly = evalPolicySnapshotOnly;
}
//@ chunk-z20c443b.js:397943-397990 placement
function getSessionUsesGatewayVariable() {
  return currentRemoteSettingsState_2().usesGatewayVariable;
}
//@ chunk-z20c443b.js:397990-398033 placement
function setSessionUsesGatewayVariable(usesGatewayVariable) {
  currentRemoteSettingsState_2().usesGatewayVariable = usesGatewayVariable;
}
//@ chunk-z20c443b.js:398033-398083 placement
function getSessionHybridOrganizationUuid() {
  return currentRemoteSettingsState_2().hybridOrganizationUuid;
}
//@ chunk-z20c443b.js:398083-398255 placement
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
//@ chunk-z20c443b.js:398255-398306 placement
function isHybridOnlyForConnection() {
  return currentRemoteSettingsState_2().hybridOnlyForConnection;
}
//@ chunk-z20c443b.js:398306-398332 placement
/**
 * 按 host 保存的混合（网关）连接映射表。
 */
var hybridConnectionSlots; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-z20c443b.js:398306", () => {
  hybridConnectionSlots = new HostScoped(() => new Map());
});
//@ chunk-z20c443b.js:398332-398378 placement
function getSessionHybridConnection(hybridOrganizationUuid) {
  return hybridConnectionSlots.of(getRootSession().host).get(hybridOrganizationUuid);
}
//@ chunk-z20c443b.js:398378-398409 placement
var verifyAllowedState; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-z20c443b.js:398378", () => {
  verifyAllowedState = new HostScoped(() => ({
    value: true,
  }));
});
//@ chunk-z20c443b.js:398409-398441 placement
/**
 * 无盘会话或只做策略快照评估时，不依赖磁盘缓存。
 */
function isSnapshotOnlySession() {
  return isDiskless() || isEvalPolicySnapshotOnly();
}
//@ chunk-z20c443b.js:398441-398551 placement
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
  hasPolicySettingsNotified,
  onLastLoadStatusChanged,
  getLastLoadStatus,
  getSyncCacheResetEpoch,
  servedSettingsLoadLeftNoAnswer,
  hasLoadCycleBegun,
  hasLoadCycleEnded,
  markLoadCycleBegun,
  getEligibilityMemo,
  isRemoteManagedSettingsVerified,
  getRemoteSettingsPathOverride,
  isRemoteManagedSettingsVerifiedAndApprovedForSession,
  registerSyncCacheResetListener,
  isEvalPolicySnapshotOnly,
  HELPER_CONSENT_STATE_ID,
  SETTINGS_FILENAME,
  servedBodyOf,
  stripReservedKeys,
  isManagedSettingsCopyKeptVerifiable,
  helperConsentDigest,
  getHelperConsentPath,
  getStoredCopyTrust,
  getStoredCopyTrustedPrincipal,
  isManagedSettingsCopyTrustEnforced,
  setSessionCache,
  getRemoteManagedSettingsConsentedBaseline,
  markRemoteManagedSettingsConsented,
  markPolicySettingsNotified,
  markLoadBackstopReleased,
  getIneligibleReason,
  setLastLoadStatus,
  markLoadCycleEnded,
  resetEligibilityMemo,
  resetSyncCache,
  setStoredCopyOrgPin,
  getSessionUsesGatewayVariable,
  getSessionHybridOrganizationUuid,
  setSessionUsesGatewayVariable,
  setSessionHybridOrganizationUuid,
  setStoredCopyGateInputs,
  setEvalPolicySnapshotOnly,
  rememberEligibility,
  onLoadCycleEnded,
  getGatewayThatVerifiedRemoteManagedSettings,
  heldMachinePinsSignIn,
  dropRemoteManagedSettingsConsentDeferral,
  isSnapshotOnlySession,
  currentRemoteSettingsState_2,
  MAX_BACKEND_SETTINGS_BYTES,
  MAX_STORAGE_VIEW_BYTES,
  isProjectedSnapshot,
  refusedCopyForcesRefresh,
  getSessionHybridConnection,
  isHybridOnlyForConnection,
};
