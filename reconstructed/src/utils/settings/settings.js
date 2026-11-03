/**
 * utils/settings/settings.ts
 *
 * 设置读取与合并核心：来源路径、单文件解析（带缓存与路径安全检查）、托管层组合（remote/MDM/file/HKCU/父进程）、按来源顺序 mergeWith 合并、写入 updateSettingsForSource、autoMode 规则汇总。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/settings/settings.ts
 * pieces: chunk-4xpk3fhh.js (1), chunk-6zvepy0r.js (1), chunk-aat7wt0p.js (1), chunk-dcmhvw5a.js (15), chunk-q8cqcff6.js (175)
 * attribution: fingerprint 5, placement 175, file-local 1, layout 11, callgraph-witnessed 1
 */
import { resolve, dirname, join, basename, sep, isAbsolute, parse } from "path";
import { lstatSync, readlinkSync } from "fs";
import { HostScoped } from "../hostScoped.js";
import { LegacyLocalSettingsProbe, seedProjectSettings } from "./settingsSeed.js";
import {
  loadManagedFileSettings as loadManagedFileSettings_2,
  parseRemoteManagedSettings as parseRemoteManagedSettings_2,
  heldOffPluginIds,
  allowListEntriesThatVouch as allowListEntriesThatVouch_2,
  parseInlineFlagSettings,
  parseParentManagedSettings,
  parseParentTierWithOrganization,
  managedFileSettingsDirs,
  isManagedSettingsDropInName,
  PARENT_MANAGED_SETTINGS_SOURCE_LABEL,
  isInertManagedMcpServersNotice,
  handleFileSystemError,
  parseSettingsFile_3,
} from "./managedFileSettings.js";
import { commandSyncNameState, invalidateCommandNames } from "./commandSyncNames.js";
import {
  getOriginalCwdOrNull,
  getProjectConfigRoot,
  getAllowedSettingSources,
  isDiskless,
  getRootSession,
  getParentManagedSettings,
  getParentOrganizationSettings,
  getFlagSettingsInline,
  getFlagSettingsPath,
  getFlagSettingsExpectedContent,
  getFlagSettingsFilePinnedContent,
  getUseCoworkPlugins,
  isWorkspaceRestricted,
  getOriginalCwd,
} from "../../bootstrap/state.js";
import { env } from "../env.js";
import { storageRootFor, warnDisklessSettingsWrite } from "./settingsStorage.js";
import { mdmResult, isMdmLoadInFlight } from "./managedPluginTiers.js";
import { startMdmPoll } from "./changeDetector.js";
import {
  managedSettingsFromRemote,
  armedFromRemote,
  mergesRemoteOutput,
  helperSelectionWarnings,
  armedFromUserWritableBase,
} from "./policyHelper/helperRemote.js";
import { wslInheritsSettings } from "./mdm/settings.js";
import {
  hasManagedSettingsCached,
  isStoredLoginPinned,
  isAttachServeRepoScopedSourceOrNonInteractive,
  isAttachServeRepoScopedSource,
  markInternalWrite,
} from "../../cli/headlessCloud/attachServe.js";
import { getRemoteManagedSettingsSyncFromCache } from "../../services/remoteManagedSettings/remoteSettingsCache.js";
import { isRemoteManagedSettingsVerified } from "../../services/remoteManagedSettings/remoteSettingsState.js";
import { isHttpMcpServeInvocation } from "../../entrypoints/mcpServeArgs.js";
import {
  getSettingsRootPathForSource as getSettingsRootPathForSource_2,
  localSettingsStoreRootBeforeOwnership,
  getRuleAnchorRootForSource as getRuleAnchorRootForSource_2,
  parseSettingsFileIfChanged,
  userSettingsHomes,
  USER_SETTINGS_FILE_NAMES,
  parseSettingsContent,
  isInClaudeConfigHome,
  mdmPolicyErrors,
  settingsReadErrorResult,
  getSettingsFilePathForSource_3,
} from "./settingsFileParsing.js";
import {
  getSettingsParseErrorsForSource as getSettingsParseErrorsForSource_2,
  getMachineAdminPolicyEnv as getMachineAdminPolicyEnv_2,
  machinePolicyKeepsPriority,
  getSettingsForSourceUncached,
  machineAdminMayPinSignInOrg as machineAdminMayPinSignInOrg_2,
  getMachineAdminPolicyTier as getMachineAdminPolicyTier_2,
  getRemotePolicyTierWithKind as getRemotePolicyTierWithKind_2,
  getMachineAdminPolicyTiers as getMachineAdminPolicyTiers_2,
  getAdminTierEnvValue as getAdminTierEnvValue_2,
  getVouchedAdminPolicyTier as getVouchedAdminPolicyTier_2,
  isMachineAdminSourceUnread,
  mergeExtraKnownMarketplacesByEntry,
  loadPolicySettings,
  trimmedPolicyTier,
} from "./policyTiers.js";
import {
  getSettingsForSourceIfRead,
  getPairedPolicyModelOverrides as getPairedPolicyModelOverrides_2,
  getDeniedModelsPolicyOverrides as getDeniedModelsPolicyOverrides_2,
  getHostManagedModelPricing as getHostManagedModelPricing_2,
  getHostManagedToolSearchEnv as getHostManagedToolSearchEnv_2,
  deniedModelsEntryWarnings,
  availableModelsExactEntryWarnings,
  getLegacyLocalSettingsFilePath_3,
  getAllPolicyTierSettings_3,
  getSettingsForSource_3,
} from "./settingsSources.js";
import {
  loadStateOf,
  parentManagedTierParticipates as parentManagedTierParticipates_2,
  armedHelperOutput,
  getMergedPolicySources as getMergedPolicySources_2,
  resolvePolicySettings,
  getMachineAdminTierSettings as getMachineAdminTierSettings_2,
  getEveryMachineAdminTierSettings as getEveryMachineAdminTierSettings_2,
  getMachineAdminDocumentLoadErrors as getMachineAdminDocumentLoadErrors_2,
  isMachineAdminDocumentUnreadable as isMachineAdminDocumentUnreadable_2,
  getDurablePolicyTierSettings as getDurablePolicyTierSettings_2,
  getAdminPolicyTierSettings as getAdminPolicyTierSettings_2,
  getAdminAuthoredPolicySettings as getAdminAuthoredPolicySettings_2,
  getShadowedMcpPolicySources as getShadowedMcpPolicySources_2,
  isPolicyTier,
  getPolicySettingsOrigin as getPolicySettingsOrigin_2_2,
  isForceRemoteSettingsRefreshConfigured as isForceRemoteSettingsRefreshConfigured_2,
  getVouchedPolicyTierSettings as getVouchedPolicyTierSettings_2,
  getHostPolicyLoginPins as getHostPolicyLoginPins_2,
  getShadowedManagedSources as getShadowedManagedSources_2,
  getManagedSourcesInEffect as getManagedSourcesInEffect_2,
  isPolicySlotAdminOrParentComposed as isPolicySlotAdminOrParentComposed_2,
  authoredPolicyContent,
} from "./policySettings.js";
import {
  isSettingSourceEnabled,
  REPO_DIR_SETTING_SOURCES,
  REPO_DIR_SETTING_SOURCE_LIST,
  getEnabledSettingSources as getEnabledSettingSources_2,
  SETTING_SOURCES,
  INLINE_FLAG_SETTINGS_LABEL,
} from "./constants.js";
import { usesSessionAccessToken } from "../sessionAccessToken.js";
import { withDeadline } from "../sleep.js";
import { clone, jsonStringify } from "../slowOperations.js";
import { mergeWithAssigner_2, sandboxFilesystemSettingsSchema } from "./settingsSourceTrust.js";
import {
  getFsImplementation,
  vetRepoSettingsPath,
  safeResolvePath,
  vetRepoSettingsPathAsync,
} from "../fsOperations.js";
import {
  isENOENT,
  toError,
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../errors.js";
import { samePath, normalizePathForCompare, writeFileAtomic } from "../file.js";
import { getPlatform } from "../platform.js";
import {
  SettingsCacheStore,
  nullIfEmptyObject,
  CONFIG_DIR_UNSAFE_REASONS,
} from "../../bootstrap/stateSlices.js";
import { safeParseJSON } from "../json.js";
import { En } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { logError } from "../log.js";
import { isPlainObject } from "../isPlainObject.js";
import { readFileSync, decodeTextBuffer, readFileChecked } from "../fileRead.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { STORAGE_SPACES } from "../storage/storageSpaces.js";
import { logForDebugging } from "../debug.js";
import { shouldAllowManagedMcpServersOnly } from "../../services/mcp/config.js";
import { getAllowedMcpServersFromTiers, describeLinkedPath } from "../../services/mcp/managedMcpPolicy.js";
import { profileCheckpoint } from "../startupProfiler.js";
import { firstLineOf, cleanForDisplay } from "../stringUtils.js";
import { SETTING_ALIASES, applySettingAliases } from "./marketplaceSettingsAliases.js";
import { isBlockingSettingsIssue } from "./validation.js";
import { logEvent } from "../../services/analytics/index.js";
import { count, uniq } from "../collections.js";
import { NoProjectDirectoryError } from "../../bootstrap/sessionSlices.js";
import { createKeyedQueue } from "../promiseQueue.js";
import { registerWriteQueueDrain } from "./writeQueues.js";
import { SymlinkWriteRefusedError } from "../fsSafety/atomicWriteStaging.js";
import { coerceStringListSettings } from "./hooksValidation.js";
import { isPathConfigDir } from "../envUtils.js";
import { ATOMIC_WRITE_DIRNAME } from "../plugins/safeCopy.js";
import { addFileGlobRuleToGitignore } from "../git/gitignore.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { getStrippingSettingsSchema, PermissionsSettingsSchema } from "./types.js";
import { HOOK_EVENTS } from "../../entrypoints/sdk/coreSchemas.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { MANAGED_RESTRICTION_KEYS, asArray, restrictionValue } from "./managedRestrictionKeys.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, array, string } from "../../../vendor/zod/v4/classic/schemas.js";
import { DEFAULTS_PLACEHOLDER, replacesDefaults } from "../permissions/autoModeRulesPrompt.js";
import { Uo } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { getManagedFilePath } from "./managedPath.js";
import { logForDiagnosticsNoPII } from "../diagLogs.js";
import { WSL_MANAGED_SETTINGS_DIR } from "./mdm/wslRegistry.js";
import { settingsSourceForPathByPriority } from "./settingsReview.js";
import {
  isUntrustedLinkPathStrict,
  MAX_UNTRUSTED_PATH_DEPTH,
  alwaysFalse,
  splitPathSegments,
} from "../pathResolution.js";
import { captureSyncResult } from "../fsJunctions.js";
import { hasDotSegment } from "../pathClassification.js";

//@ chunk-q8cqcff6.js:94076-94102 placement
var legacyLocalSettingsProbes = new HostScoped(() => new LegacyLocalSettingsProbe());
//@ chunk-q8cqcff6.js:94102-94143 placement
function parseSettingsFile(e, n, r) {
  return parseSettingsFile_3(e, commandSyncNameState(), n, r);
}
//@ chunk-q8cqcff6.js:94143-94887 placement
/**
 * 构造读取设置所需的上下文：缓存存储、cwd、项目配置目录、允许的来源、无盘标记、父进程托管设置、flag 设置、cowork 插件、MDM/HKCU/helper 读取函数等，并挂上托管文件设置加载器。
 */
function buildSettingsContext() {
  let context = {
    store: commandSyncNameState(),
    cwd: getOriginalCwdOrNull(),
    projectConfigDir: getProjectConfigRoot() ?? undefined,
    allowedSources: getAllowedSettingSources(),
    diskless: isDiskless(),
    onLegacyLocalSettingsRead: (n) => legacyLocalSettingsProbes.of(getRootSession().host).fire(n),
    parentManaged: getParentManagedSettings(),
    parentOrganizationSettings: getParentOrganizationSettings(),
    hostManagedProvider: env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST,
    flagInline: getFlagSettingsInline(),
    flagPath: getFlagSettingsPath(),
    flagExpectedContent: getFlagSettingsExpectedContent() ?? getFlagSettingsFilePinnedContent(),
    flagInlineJson: getFlagSettingsExpectedContent() !== undefined,
    coworkPlugins: getUseCoworkPlugins(),
    canonicalGitRoot: storageRootFor,
    mdm: () => mdmResult(),
    hkcu: () => startMdmPoll(),
    helper: () => managedSettingsFromRemote(),
    helperArmedFromRemote: () => armedFromRemote(),
    helperMergesOutput: () => mergesRemoteOutput(),
    helperWarnings: () => helperSelectionWarnings(),
    wslInherits: () => wslInheritsSettings(),
    helperArmedFromUserWritableBase: () => armedFromUserWritableBase(),
    credentialHelperKeysFrom: (n) => credentialHelperKeysFrom(n),
    launchFolderKeysFrom: (n) => launchFolderKeysFrom(n),
    asksOrganization: () => hasManagedSettingsCached(),
    policyOnlyServerTier: noSettingsOverride,
  };
  context.file = () => loadManagedFileSettings_2(context);
  return context;
}
//@ chunk-q8cqcff6.js:94887-95050 placement
function isSettingsTierWithheld(e) {
  if (!isStoredLoginPinned()) return false;
  if (e !== "policySettings") return true;
  let policySettingsOrigin = getPolicySettingsOrigin();
  return !(
    (isAdminPolicyOrigin(policySettingsOrigin) || policySettingsOrigin === "remote") &&
    mdmResult().userWritable !== true &&
    !armedFromUserWritableBase() &&
    (getRemoteManagedSettingsSyncFromCache() === null || isRemoteManagedSettingsVerified())
  );
}
//@ chunk-q8cqcff6.js:95050-95282 placement
function credentialHelperKeysFrom(e) {
  if (isHttpMcpServeInvocation()) return "none";
  if (e === "policySettings" && noSettingsOverride() !== undefined && getPolicySettingsOrigin() === "remote")
    return "machine_admin";
  if (!isStoredLoginPinned()) return isAttachServeRepoScopedSourceOrNonInteractive(e) ? "none" : "as_read";
  if (e !== "policySettings") return "none";
  return isSettingsTierWithheld(e) ? "machine_admin" : "as_read";
}
//@ chunk-q8cqcff6.js:95282-95377 placement
function launchFolderKeysFrom(e) {
  if (!isAttachServeRepoScopedSource(e)) return "as_read";
  return e === "projectSettings" && projectSettingsAliasesUserSettings() ? "as_read" : "none";
}
//@ chunk-q8cqcff6.js:95377-95411 placement
function getSettingsRootPathForSource(e) {
  return getSettingsRootPathForSource_2(e, buildSettingsContext());
}
//@ chunk-q8cqcff6.js:95411-95535 placement
function localSettingsStoreRootAwaitingOwnershipProbe() {
  let settingsContext = buildSettingsContext();
  if (settingsContext.cwd === null) return;
  let n = localSettingsStoreRootBeforeOwnership(settingsContext.cwd, settingsContext.canonicalGitRoot);
  return n.decided === undefined ? n.root : undefined;
}
//@ chunk-q8cqcff6.js:95535-95567 placement
function getSettingsFilePathForSource(e) {
  return getSettingsFilePathForSource_3(e, buildSettingsContext());
}
//@ chunk-q8cqcff6.js:95567-95600 placement
function getSettingsParseErrorsForSource(e) {
  return getSettingsParseErrorsForSource_2(e, buildSettingsContext());
}
//@ chunk-q8cqcff6.js:95600-95634 placement
function getRuleAnchorRootForSource(e) {
  return getRuleAnchorRootForSource_2(e, buildSettingsContext());
}
//@ chunk-q8cqcff6.js:95634-95664 placement
function getLegacyLocalSettingsFilePath() {
  return getLegacyLocalSettingsFilePath_3(buildSettingsContext());
}
//@ chunk-q8cqcff6.js:95664-95757 placement = supportsPersistence (0.797)
function projectSettingsAliasesUserSettings() {
  let settingsFilePathForSource = getSettingsFilePathForSource("projectSettings");
  let settingsFilePathForSource_2 = getSettingsFilePathForSource("userSettings");
  return (
    !!settingsFilePathForSource &&
    !!settingsFilePathForSource_2 &&
    resolve(settingsFilePathForSource) === resolve(settingsFilePathForSource_2)
  );
}
//@ chunk-q8cqcff6.js:95757-95833 placement = _temp8 (1)
function getLocalSettingsValidationErrors() {
  let settingsFilePathForSource = getSettingsFilePathForSource("localSettings");
  if (!settingsFilePathForSource) return [];
  return parseSettingsFile(settingsFilePathForSource).errors;
}
//@ chunk-q8cqcff6.js:95833-95863 placement
function parseRemoteManagedSettings() {
  return parseRemoteManagedSettings_2(buildSettingsContext());
}
//@ chunk-q8cqcff6.js:95863-95894 placement
function loadManagedFileSettings() {
  return loadManagedFileSettings_2(buildSettingsContext());
}
//@ chunk-q8cqcff6.js:95894-96072 placement
function basePolicyNamesHelper() {
  let e = commandSyncNameState();
  if (e.policy.baseNamesHelper === undefined) {
    let basePolicySettings = getBasePolicySettings();
    e.policy.baseNamesHelper =
      basePolicySettings?.policyHelper != null || basePolicySettings?.policyHelpers != null;
  }
  return e.policy.baseNamesHelper;
}
//@ chunk-q8cqcff6.js:96072-96178 placement
function getManagedFileLoadState() {
  let e = commandSyncNameState();
  e.policy.managedFileLoadState ??= loadStateOf(loadManagedFileSettings());
  return e.policy.managedFileLoadState;
}
//@ chunk-q8cqcff6.js:96178-96209 placement
function getHeldOffPluginIds() {
  return heldOffPluginIds(buildSettingsContext());
}
//@ chunk-q8cqcff6.js:96209-96243 placement
function allowListEntriesThatVouch(strictKnownMarketplaces) {
  return allowListEntriesThatVouch_2(buildSettingsContext(), strictKnownMarketplaces);
}
//@ chunk-q8cqcff6.js:96243-96264 placement
function noSettingsOverride() {
  return;
}
//@ chunk-q8cqcff6.js:96264-96295 placement
function getMachineAdminPolicyEnv() {
  return getMachineAdminPolicyEnv_2(buildSettingsContext());
}
//@ chunk-q8cqcff6.js:96295-96336 placement
function machinePolicyKeepsPriorityOver(e) {
  return isMdmLoadInFlight() || machinePolicyKeepsPriority(buildSettingsContext(), e);
}
//@ chunk-q8cqcff6.js:96336-96375 placement = getSettingsForSource (0)
/**
 * 取某来源的有效设置（来源未启用返回 null），带 perSource 缓存。
 */
function getSettingsForSource(source) {
  return isSettingSourceEnabled(source) ? getSettingsForSourceGuarded(source) : null;
}
//@ chunk-q8cqcff6.js:96375-96403 placement
function getSettingsForSourceTightenOnly(e) {
  return settingsForSourceOrGuarded(e);
}
//@ chunk-q8cqcff6.js:96403-96431 placement
function getSettingsForSourceForUpkeep(e) {
  return settingsForSourceOrGuarded(e);
}
//@ chunk-q8cqcff6.js:96431-96479 placement
function settingsForSourceOrGuarded(e) {
  return getSettingsForSource(e) ?? (isSettingSourceEnabled(e) ? null : getSettingsForSourceGuarded(e));
}
//@ chunk-q8cqcff6.js:96479-96627 placement = _temp5 (1)
function getSettingsForSourceGuarded(a_0) {
  if (isWorkspaceRestricted() && REPO_DIR_SETTING_SOURCES.has(a_0)) return null;
  if ((a_0 === "userSettings" || REPO_DIR_SETTING_SOURCES.has(a_0)) && usesSessionAccessToken()) return null;
  let settingsForSourceIfRead = getSettingsForSourceIfRead(a_0, commandSyncNameState());
  return settingsForSourceIfRead !== undefined
    ? settingsForSourceIfRead
    : getSettingsForSource_3(a_0, buildSettingsContext());
}
//@ chunk-q8cqcff6.js:96627-96716 placement
function getPairedPolicyModelOverrides() {
  let pairedModelOverrides = commandSyncNameState().policy.pairedModelOverrides;
  return pairedModelOverrides !== undefined
    ? pairedModelOverrides.value
    : getPairedPolicyModelOverrides_2(buildSettingsContext());
}
//@ chunk-q8cqcff6.js:96716-96747 placement
function getDeniedModelsPolicyOverrides() {
  return getDeniedModelsPolicyOverrides_2(buildSettingsContext());
}
//@ chunk-q8cqcff6.js:96747-96778 placement
function getHostManagedModelPricing() {
  return getHostManagedModelPricing_2(buildSettingsContext());
}
//@ chunk-q8cqcff6.js:96778-96874 placement
function getHostManagedToolSearchEnv() {
  let hostToolSearchEnv = commandSyncNameState().policy.hostToolSearchEnv;
  if (hostToolSearchEnv !== undefined) return hostToolSearchEnv.value;
  return getHostManagedToolSearchEnv_2(buildSettingsContext());
}
//@ chunk-q8cqcff6.js:96874-96939 placement
function getSettingsForSourceWriteSeed(e) {
  return getSettingsForSourceUncached(e, buildSettingsContext(), {
    includeLegacyLocalSettings: false,
  });
}
//@ chunk-q8cqcff6.js:96939-96952 placement
var BACKGROUND_SETTINGS_WORK_WAIT_MS = 5000;
//@ chunk-q8cqcff6.js:96952-97028 placement
function settleBackgroundSettingsWork(e = BACKGROUND_SETTINGS_WORK_WAIT_MS) {
  return withDeadline(commandSyncNameState().backgroundWorkTail, e).then(() => {
    return;
  });
}
//@ chunk-q8cqcff6.js:97028-97055 placement
var repoDirSettingsParses = new HostScoped(() => new Map());
//@ chunk-q8cqcff6.js:97055-97796 placement
function readRepoDirSettingsFresh(e) {
  let settingsContext = buildSettingsContext();
  let filtered = [
    getSettingsFilePathForSource_3(e, settingsContext),
    ...(e === "localSettings" ? [getLegacyLocalSettingsFilePath_3(settingsContext)] : []),
  ].filter((T) => T !== undefined);
  let s = repoDirSettingsParses.of(getRootSession().host);
  let mapped = filtered.map((T) => ({
    file: T,
    ...parseSettingsFileIfChanged(T, s, e === "userSettings"),
  }));
  let filtered_2 = mapped.filter(
    ({ settings, errors }) => settings === null && errors.some((error) => error.severity !== "warning"),
  );
  let [h, y] = mapped.map(
    ({ file, settings, textRead }) =>
      settings ?? (textRead === undefined ? clone(s.get(file)?.parsed.settings ?? null) : null),
  );
  let P =
    y === null || y === undefined
      ? (h ?? null)
      : mergeWithAssigner_2({}, y, h ?? {}, settingsMergeCustomizer);
  if (filtered_2.length === 0)
    return {
      kind: "in_effect",
      settings: P,
    };
  let flattened = filtered_2.flatMap(({ textRead }) => textRead ?? []);
  if (flattened.length === filtered_2.length)
    return {
      kind: "some_do_not_load",
      texts: flattened,
      settingsOfTheOtherFile: P,
    };
  return filtered_2.every(({ file, textRead }) => textRead !== undefined || s.has(file))
    ? {
        kind: "unreadable_for_now",
        settingsAsLastRead: P,
      }
    : {
        kind: "unreadable",
        settingsOfTheOtherFile: P,
      };
}
//@ chunk-q8cqcff6.js:97796-97803 placement
var settingsMemo;
//@ chunk-q8cqcff6.js:97803-98000 placement
function settingsContextForRepoTier() {
  let settingsContext = buildSettingsContext();
  let n = settingsMemo;
  if (n === undefined) return settingsContext;
  let canonicalGitRoot = settingsContext.canonicalGitRoot;
  return {
    ...settingsContext,
    cwd: n.cwd,
    projectConfigDir: n.projectConfigDir,
    canonicalGitRoot: (s) => (s === n.cwd ? n.canonicalRoot : (canonicalGitRoot?.(s) ?? null)),
  };
}
//@ chunk-q8cqcff6.js:98000-98399 placement
function repoTierFileLeadsAway(e) {
  let fsImplementation = getFsImplementation();
  try {
    let linksResolvedPath = vetRepoSettingsPath(fsImplementation, e, {
      failClosed: true,
    }).linksResolvedPath;
    if (linksResolvedPath === undefined) {
      for (let h of [dirname(e), e])
        try {
          if (fsImplementation.lstatSync(h).isSymbolicLink()) return true;
        } catch (error) {
          if (!isENOENT(error)) return true;
        }
      return readRepoTierFileText(e) !== "absent";
    }
    let s = vetRepoSettingsPath(fsImplementation, dirname(dirname(e)), {
      failClosed: true,
    });
    let S = join(s.linksResolvedPath ?? s.resolvedPath, basename(dirname(e)), basename(e));
    if (!samePath(linksResolvedPath, S)) return true;
    let E = fsImplementation.lstatSync(linksResolvedPath);
    return !E.isFile() || E.nlink > 1;
  } catch {
    return true;
  }
}
//@ chunk-q8cqcff6.js:98399-98751 placement
/**
 * 判断路径（含解析链接后的真实路径，macOS 忽略大小写）是否就是用户设置文件之一。
 */
function isUserSettingsPath(settingsFilePathForSource, n) {
  let settingsFilePathForSource_2 = getSettingsFilePathForSource_3("userSettings", n);
  let s = [
    ...(settingsFilePathForSource_2 ? [settingsFilePathForSource_2] : []),
    ...userSettingsHomes().flatMap((y) => Object.values(USER_SETTINGS_FILE_NAMES).map((P) => join(y, P))),
  ];
  let fsImplementation = getFsImplementation();
  let E = [resolve(settingsFilePathForSource)];
  try {
    let y = vetRepoSettingsPath(fsImplementation, settingsFilePathForSource);
    E.push(y.linksResolvedPath ?? y.resolvedPath);
  } catch {}
  let h = getPlatform() === "macos";
  return s.some((y) =>
    [resolve(y), safeResolvePath(fsImplementation, y).resolvedPath].some((P) =>
      E.some(
        (O) =>
          samePath(O, P) ||
          (h && normalizePathForCompare(O).toLowerCase() === normalizePathForCompare(P).toLowerCase()),
      ),
    ),
  );
}
//@ chunk-q8cqcff6.js:98751-99039 placement
function repoTierFileSlots() {
  let e = settingsContextForRepoTier();
  let settingsFilePathForSource = getSettingsFilePathForSource_3("projectSettings", e);
  let r = {
    project:
      settingsFilePathForSource && !isUserSettingsPath(settingsFilePathForSource, e)
        ? settingsFilePathForSource
        : null,
    local: getSettingsFilePathForSource_3("localSettings", e) ?? null,
    legacy: getLegacyLocalSettingsFilePath_3(e) ?? null,
  };
  return {
    key: `${e.cwd ?? ""}\x00${e.projectConfigDir ?? ""}`,
    ...r,
    linkedAway: ["project", "local", "legacy"].filter((s) => {
      let S = r[s];
      return S !== null && repoTierFileLeadsAway(S);
    }),
  };
}
//@ chunk-q8cqcff6.js:99039-99200 placement
function readRepoTierFileText(settingsFilePathForSource) {
  let n = new Map();
  let settingsFileIfChanged = parseSettingsFileIfChanged(settingsFilePathForSource, n);
  let s = n.get(settingsFilePathForSource);
  if (s !== undefined)
    return {
      text: s.content,
    };
  return settingsFileIfChanged.errors.some((error) => error.severity !== "warning") ? "unreadable" : "absent";
}
//@ chunk-q8cqcff6.js:99200-99629 placement
function readRepoTiersFresh(e = new Map()) {
  let n = new SettingsCacheStore();
  for (let [S, E] of e) n.parsedFiles.set(S, E);
  let r = {
    ...settingsContextForRepoTier(),
    store: n,
  };
  let s = new Map();
  for (let S of REPO_DIR_SETTING_SOURCE_LIST) {
    if (
      S === "projectSettings" &&
      (() => {
        let settingsFilePathForSource = getSettingsFilePathForSource_3(S, r);
        let settingsFilePathForSource_2 = getSettingsFilePathForSource_3("userSettings", r);
        return (
          !!settingsFilePathForSource &&
          !!settingsFilePathForSource_2 &&
          samePath(resolve(settingsFilePathForSource), resolve(settingsFilePathForSource_2))
        );
      })()
    )
      continue;
    let E = S === "localSettings" ? getLegacyLocalSettingsFilePath_3(r) : undefined;
    s.set(S, {
      settings: getSettingsForSource_3(S, r),
      errors: getSettingsParseErrorsForSource_2(S, r),
      unfiltered: getSettingsForSourceUncached(S, r),
      ...(S === "localSettings" && {
        legacy: E === undefined ? null : (parseSettingsFile_3(E, n).settings ?? null),
      }),
    });
  }
  return s;
}
//@ chunk-q8cqcff6.js:99629-99636 placement
var rawSettingsCache;
//@ chunk-q8cqcff6.js:99636-100184 placement
function holdRepoTiers(e) {
  let n = commandSyncNameState();
  let r = !n.repoTierFreeze.isHeld();
  let settingsContext = buildSettingsContext();
  if (r)
    settingsMemo = {
      cwd: settingsContext.cwd,
      projectConfigDir: settingsContext.projectConfigDir,
      canonicalRoot:
        settingsContext.cwd === null
          ? null
          : (settingsContext.canonicalGitRoot?.(settingsContext.cwd) ?? null),
    };
  let S;
  try {
    S =
      e === undefined
        ? n.repoTierFreeze.engage(readRepoTiersFresh)
        : n.repoTierFreeze.engage(
            () => readRepoTiersFresh(e.files),
            () => readRepoTiersFresh(),
          );
  } catch (error) {
    if (r) settingsMemo = undefined;
    throw error;
  }
  if (r) rawSettingsCache = e?.onOwnWrite;
  try {
    n.invalidateAll();
  } catch (error) {
    S.abandon();
    if (!n.repoTierFreeze.isHeld()) {
      settingsMemo = undefined;
      rawSettingsCache = undefined;
    }
    throw error;
  }
  return {
    began: r,
    release: () => {
      let E = S.release();
      if (E.last) {
        settingsMemo = undefined;
        rawSettingsCache = undefined;
        n.invalidateAll();
      }
      return E;
    },
  };
}
//@ chunk-q8cqcff6.js:100184-100214 placement
function repoTiersFrom(seeds) {
  return readRepoTiersFresh(seeds);
}
//@ chunk-q8cqcff6.js:100214-100290 placement
function repoTierFolderKey() {
  let e = settingsContextForRepoTier();
  return `${e.cwd ?? ""}\x00${e.projectConfigDir ?? ""}`;
}
//@ chunk-q8cqcff6.js:100290-100402 placement
function lingerRepoTiers(e, repoTiersRefresher) {
  let r = commandSyncNameState();
  if (r.repoTierFreeze.isHeld()) return;
  r.repoTierFreeze.linger(e, repoTiersRefresher);
  r.invalidateAll();
}
//@ chunk-q8cqcff6.js:100402-100494 placement
function compareRepoTiersWithHeld() {
  return commandSyncNameState().repoTierFreeze.differingTiers(readRepoTiersFresh()).length === 0
    ? "same"
    : "changed";
}
//@ chunk-q8cqcff6.js:100494-101792 placement
function readLocalSettingsAliases(e) {
  let repoTierFreeze = commandSyncNameState().repoTierFreeze;
  let r =
    REPO_DIR_SETTING_SOURCES.has(e) &&
    repoTierFreeze.isHeld() &&
    repoTierFreeze.baselineTier(e) !== undefined;
  let s = false;
  let S = new Map();
  let E = new Map();
  let h = (y) => {
    try {
      return safeResolvePath(getFsImplementation(), y).resolvedPath;
    } catch {
      return y;
    }
  };
  return {
    before: (y, P, O) => {
      let T = r ? repoTierFreeze.baselineTier(e) : undefined;
      if (T === undefined) return;
      let v = settingsContextForRepoTier();
      let M = e === "localSettings" ? getLegacyLocalSettingsFilePath_3(v) : undefined;
      let x = M === undefined ? undefined : parseSettingsFile_3(M, new SettingsCacheStore());
      if (M !== undefined && x !== undefined) {
        S.set(M, x);
        E.set(M, h(M));
      }
      let settingsFilePathForSource = getSettingsFilePathForSource_3(e, v);
      if (settingsFilePathForSource !== O) {
        s = true;
        return;
      }
      let G =
        settingsFilePathForSource === undefined
          ? undefined
          : parseSettingsFile_3(settingsFilePathForSource, new SettingsCacheStore());
      if (settingsFilePathForSource !== undefined && G !== undefined) {
        S.set(settingsFilePathForSource, G);
        E.set(settingsFilePathForSource, h(settingsFilePathForSource));
      }
      let q =
        y === null
          ? null
          : parseSettingsContent(jsonStringify(y), getSettingsFilePathForSource_3(e, v) ?? "");
      let settings = q?.settings ?? null;
      let U = x?.settings
        ? mergeWithAssigner_2(clone(x.settings), settings ?? {}, settingsMergeCustomizer)
        : settings;
      let j = [...(q?.errors ?? []), ...(x?.errors ?? [])];
      let Z = (re) => {
        let ee = re && safeParseJSON(jsonStringify(re), false);
        return typeof ee === "object" ? nullIfEmptyObject(ee) : ee;
      };
      let included = repoTierFreeze.differingTiers(readRepoTiersFresh(S)).includes(e);
      let ie = (re) => re.filter((ee) => ee.file === M || ((P || ee.preserveOnWrite) && !("alias" in ee)));
      s =
        included ||
        !En(Z(U), Z(T.unfiltered)) ||
        !En(ie(j), ie(T.errors)) ||
        !En(Z(G?.settings ?? null), Z(settings));
    },
    noteRead: ({ path, content }) => {
      let O = S.get(path);
      let settingsContent = parseSettingsContent(content, path);
      if (
        r &&
        (O === undefined ||
          !En(nullIfEmptyObject(settingsContent.settings), nullIfEmptyObject(O.settings)) ||
          !En(settingsContent.errors, O.errors))
      )
        s = true;
    },
    after: ({ path, content }) => {
      let settingsContent = parseSettingsContent(content, path);
      let T = E.get(path);
      S.set(path, settingsContent);
      for (let key of S.keys())
        if (key !== path && T !== undefined && E.get(key) === T) S.set(key, settingsContent);
      if (r && !s && repoTierFreeze.isHeld()) {
        repoTierFreeze.rebaseline(readRepoTiersFresh(S), [e]);
        try {
          rawSettingsCache?.(path, content);
        } catch (error) {
          logError(toError(error));
        }
      }
    },
  };
}
//@ chunk-q8cqcff6.js:101792-101928 placement
function withRepoTiersLive(e) {
  let n = commandSyncNameState();
  if (!n.repoTierFreeze.isHeld()) return e();
  try {
    return n.repoTierFreeze.whileLive(e);
  } finally {
    n.invalidateAll();
  }
}
//@ chunk-q8cqcff6.js:101928-101979 placement
function isRepoTierFreezeHeld() {
  return commandSyncNameState().repoTierFreeze.isHeld();
}
//@ chunk-q8cqcff6.js:101979-102039 placement
function isRepoTierAnsweredByACopy(e) {
  return commandSyncNameState().repoTierFreeze.tier(e) !== undefined;
}
//@ chunk-q8cqcff6.js:102039-102153 placement
function flagInlineConsentDropped() {
  let settingsContext = buildSettingsContext();
  if (!isPlainObject(settingsContext.flagInline)) return false;
  if (!hasAttributionSettings(settingsContext.flagInline)) return false;
  return parseInlineFlagSettings(settingsContext).settings === null;
}
//@ chunk-q8cqcff6.js:102153-102260 placement
function flagInlineSettingDropped(e) {
  let settingsContext = buildSettingsContext();
  if (!isPlainObject(settingsContext.flagInline) || !(e in settingsContext.flagInline)) return false;
  return parseInlineFlagSettings(settingsContext).settings === null;
}
//@ chunk-q8cqcff6.js:102260-102291 placement
function parentManagedTierParticipates() {
  return parentManagedTierParticipates_2(buildSettingsContext());
}
//@ chunk-q8cqcff6.js:102291-102331 placement
function getParsedParentManagedSettings() {
  return parseParentManagedSettings(buildSettingsContext()).settings;
}
//@ chunk-q8cqcff6.js:102331-102400 placement
function parentTierWithOrganizationLocksHooks() {
  return parseParentTierWithOrganization(buildSettingsContext())?.settings?.allowManagedHooksOnly === true;
}
//@ chunk-q8cqcff6.js:102400-102430 placement
function getArmedHelperOutput() {
  return armedHelperOutput(buildSettingsContext());
}
//@ chunk-q8cqcff6.js:102430-102461 placement
function getMergedPolicySources() {
  return getMergedPolicySources_2(buildSettingsContext());
}
//@ chunk-q8cqcff6.js:102461-102513 placement
function getShadowedPolicyHelperSources() {
  return resolvePolicySettings(buildSettingsContext()).shadowedHelperSources;
}
//@ chunk-q8cqcff6.js:102513-102666 placement
function hasAttributionSettings(e) {
  if (!isPlainObject(e)) return false;
  let attribution = e.attribution;
  return (
    "includeCoAuthoredBy" in e ||
    attribution === false ||
    (isPlainObject(attribution) &&
      ("commitTrailers" in attribution || "commit" in attribution || "pr" in attribution))
  );
}
//@ chunk-q8cqcff6.js:102666-102907 placement = getSettingsForSourceUncached (0.566)
function flagFileConsentDropped() {
  let remoteSettings = buildSettingsContext();
  let settingsFilePathForSource = getSettingsFilePathForSource_3("flagSettings", remoteSettings);
  if (!settingsFilePathForSource) return false;
  if (
    parseSettingsFile_3(settingsFilePathForSource, remoteSettings.store, remoteSettings.flagExpectedContent)
      .settings !== null
  )
    return false;
  if (remoteSettings.flagExpectedContent !== undefined) {
    let r = safeParseJSON(remoteSettings.flagExpectedContent, false);
    if (!isPlainObject(r)) return true;
    return hasAttributionSettings(r);
  }
  return fileMayDropConsent(settingsFilePathForSource);
}
//@ chunk-q8cqcff6.js:102907-103087 placement
function fileMayDropConsent(e, n = false) {
  if (isDiskless()) return false;
  let r;
  try {
    let s =
      n || isInClaudeConfigHome(e)
        ? safeResolvePath(getFsImplementation(), e)
        : vetRepoSettingsPath(getFsImplementation(), e);
    r = safeParseJSON(readFileSync(s.resolvedPath, MAX_SETTINGS_JSON_BYTES), false);
  } catch (error) {
    if (isENOENT(error)) return false;
    return true;
  }
  if (!isPlainObject(r)) return true;
  return hasAttributionSettings(r);
}
//@ chunk-q8cqcff6.js:103087-103605 placement = getSettingsForSourceLenient_FOR_EDITING_ONLY_NOT_FOR_READING (0.192)
function getRawSettingFromRejectedSource(e, n) {
  let settingsContext = buildSettingsContext();
  let s = (y) => y.settings === null && y.errors.some((error) => error.severity !== "warning");
  if (e === "flagSettings" && settingsContext.flagInline && n in settingsContext.flagInline) {
    let filePath = parseInlineFlagSettings(settingsContext);
    if (s(filePath)) return settingsContext.flagInline[n];
    if (filePath.settings?.[n] !== undefined) return;
  }
  let settingsFilePathForSource = getSettingsFilePathForSource_3(e, settingsContext);
  if (!settingsFilePathForSource) return;
  let flagExpectedContent = e === "flagSettings" ? settingsContext.flagExpectedContent : undefined;
  if (!s(parseSettingsFile_3(settingsFilePathForSource, settingsContext.store, flagExpectedContent))) return;
  if (flagExpectedContent === undefined && settingsContext.diskless) return;
  let h;
  try {
    if (flagExpectedContent !== undefined) h = safeParseJSON(flagExpectedContent, false);
    else {
      let { resolvedPath } = safeResolvePath(getFsImplementation(), settingsFilePathForSource);
      h = safeParseJSON(readFileSync(resolvedPath, MAX_SETTINGS_JSON_BYTES), false);
    }
  } catch {
    return;
  }
  if (!isPlainObject(h) || !(n in h)) return;
  return h[n];
}
//@ chunk-q8cqcff6.js:103605-103931 placement
async function sourceFileConsentDropped(e, n) {
  let settingsContext = buildSettingsContext();
  let settingsFilePathForSource = getSettingsFilePathForSource_3(e, settingsContext);
  if (!settingsFilePathForSource) return false;
  let settingsFile = parseSettingsFile_3(settingsFilePathForSource, settingsContext.store);
  if (settingsFile.settings !== null) return false;
  if (settingsFile.errors.length === 0) return false;
  if (isStorageV5Enabled() && n !== undefined && isDefaultUserSettingsPath(e, settingsFilePathForSource)) {
    let E;
    try {
      E = await readStoredUserSettings(n);
    } catch {
      return true;
    }
    switch (E.kind) {
      case "absent":
        return false;
      case "object":
        return hasAttributionSettings(E.raw);
      default:
        return true;
    }
  }
  return fileMayDropConsent(settingsFilePathForSource, e === "userSettings");
}
//@ chunk-q8cqcff6.js:103931-103994 placement = _temp5 (1)
function isDefaultUserSettingsPath(a_0, settingsFilePathForSource) {
  return a_0 === "userSettings" && basename(settingsFilePathForSource) === USER_SETTINGS_FILE_NAMES.default;
}
//@ chunk-q8cqcff6.js:103994-104349 placement
/**
 * 从存储后端读取用户设置：区分不可读、不存在、过大、空、非对象与正常对象（附原始内容）。
 */
async function readStoredUserSettings(e) {
  let n = await e.read([STORAGE_SPACES.userSettings()]);
  if (!n.ok)
    return {
      kind: "unreadable",
      code: n.error.code,
    };
  let r = n.value.items[0];
  if (!r.found)
    return {
      kind: "absent",
    };
  if (r.totalBytes > MAX_SETTINGS_JSON_BYTES)
    return {
      kind: "oversize",
    };
  let s = decodeTextBuffer(r.value);
  if (!s.trim())
    return {
      kind: "empty",
    };
  let S = safeParseJSON(s, false);
  if (!isPlainObject(S))
    return {
      kind: "non-object",
    };
  return {
    kind: "object",
    raw: S,
    content: s,
  };
}
//@ chunk-q8cqcff6.js:104349-104493 placement
function legacyLocalConsentDropped() {
  let settingsContext = buildSettingsContext();
  let legacyLocalSettingsFilePath = getLegacyLocalSettingsFilePath_3(settingsContext);
  if (!legacyLocalSettingsFilePath) return false;
  let settingsFile = parseSettingsFile_3(legacyLocalSettingsFilePath, settingsContext.store);
  if (settingsFile.settings !== null) return false;
  if (settingsFile.errors.length === 0) return false;
  return fileMayDropConsent(legacyLocalSettingsFilePath);
}
//@ chunk-q8cqcff6.js:104493-104670 placement
function getLegacyLocalSettingsOverlay() {
  let settingsContext = buildSettingsContext();
  let n = settingsContext.store.repoTierFreeze.tier("localSettings");
  if (n?.legacy !== undefined) return n.legacy;
  let legacyLocalSettingsFilePath = getLegacyLocalSettingsFilePath_3(settingsContext);
  if (!legacyLocalSettingsFilePath) return null;
  return parseSettingsFile_3(legacyLocalSettingsFilePath, settingsContext.store).settings ?? null;
}
//@ chunk-q8cqcff6.js:104670-104722 placement
function getAllPolicyTierSettings() {
  return commandSyncNameState().policy.allTiers ?? getAllPolicyTierSettings_3(buildSettingsContext());
}
//@ chunk-q8cqcff6.js:104722-104961 placement
function machineAdminMayPinSignInOrg() {
  try {
    if (isMdmLoadInFlight()) return true;
    let e = commandSyncNameState();
    e.policy.machineMayPinSignInOrg ??= machineAdminMayPinSignInOrg_2(buildSettingsContext());
    return e.policy.machineMayPinSignInOrg;
  } catch (error) {
    logForDebugging(`machineAdminMayPinSignInOrg: the machine policy read threw: ${errorMessage(error)}`, {
      level: "error",
    });
    return true;
  }
}
//@ chunk-q8cqcff6.js:104961-105127 placement
function machineAdminPinsSignInOrg() {
  try {
    return getMachineAdminPolicyTier()?.forceLoginOrgUUID !== undefined;
  } catch (error) {
    logForDebugging(`machineAdminPinsSignInOrg: the machine policy read threw: ${errorMessage(error)}`, {
      level: "error",
    });
    return false;
  }
}
//@ chunk-q8cqcff6.js:105127-105156 placement
function machineAdminSignInKey() {
  return "unset";
}
//@ chunk-q8cqcff6.js:105156-105186 placement
function getMachineAdminPolicyTier() {
  return getMachineAdminPolicyTier_2(buildSettingsContext());
}
//@ chunk-q8cqcff6.js:105186-105236 placement
function getMachineAdminDocumentTier() {
  return getMachineAdminPolicyTier_2({
    ...buildSettingsContext(),
    helper: undefined,
  });
}
//@ chunk-q8cqcff6.js:105236-105267 placement
function getRemotePolicyTierWithKind() {
  return getRemotePolicyTierWithKind_2(buildSettingsContext());
}
//@ chunk-q8cqcff6.js:105267-105298 placement
function getMachineAdminPolicyTiers() {
  return getMachineAdminPolicyTiers_2(buildSettingsContext());
}
//@ chunk-q8cqcff6.js:105298-105329 placement
function getMachineAdminTierSettings() {
  return getMachineAdminTierSettings_2(buildSettingsContext());
}
//@ chunk-q8cqcff6.js:105329-105360 placement
function getEveryMachineAdminTierSettings() {
  return getEveryMachineAdminTierSettings_2(buildSettingsContext());
}
//@ chunk-q8cqcff6.js:105360-105396 placement
function getMachineAdminDocumentLoadErrors() {
  return filterFatalPolicyErrors(getMachineAdminDocumentLoadErrors_2(buildSettingsContext()));
}
//@ chunk-q8cqcff6.js:105396-105427 placement
function isMachineAdminDocumentUnreadable() {
  return isMachineAdminDocumentUnreadable_2(buildSettingsContext());
}
//@ chunk-q8cqcff6.js:105427-105522 placement
function getAdminTierEnvValue(e) {
  let adminTierEnvView = commandSyncNameState().policy.adminTierEnvView;
  if (adminTierEnvView !== undefined) return adminTierEnvView[e];
  return getAdminTierEnvValue_2(buildSettingsContext(), e);
}
//@ chunk-q8cqcff6.js:105522-105574 placement
function getPolicyEnvCompositionForLogging() {
  return commandSyncNameState().lastPolicyEnvComposition;
}
//@ chunk-q8cqcff6.js:105574-105631 placement
function getDurablePolicyTierSettings() {
  return commandSyncNameState().policy.durableTiers ?? getDurablePolicyTierSettings_2(buildSettingsContext());
}
//@ chunk-q8cqcff6.js:105631-105686 placement
function getAdminPolicyTierSettings() {
  return commandSyncNameState().policy.adminTiers ?? getAdminPolicyTierSettings_2(buildSettingsContext());
}
//@ chunk-q8cqcff6.js:105686-105717 placement
function getAdminAuthoredPolicySettings() {
  return getAdminAuthoredPolicySettings_2(buildSettingsContext());
}
//@ chunk-q8cqcff6.js:105717-105783 placement = getMcpAllowlistSettings (0.55)
/**
 * getMcpAllowlistSettings：{slot: policySettings, adminTiers}。
 */
function getMcpPolicyView() {
  return {
    slot: getSettingsForSource("policySettings"),
    adminTiers: getAdminPolicyTierSettings(),
  };
}
//@ chunk-q8cqcff6.js:105783-105814 placement
function getShadowedMcpPolicySources() {
  return getShadowedMcpPolicySources_2(buildSettingsContext());
}
//@ chunk-q8cqcff6.js:105814-106097 placement
function getMcpPolicyCompositionForLogging(shadowedMcpPolicySources) {
  let mcpPolicyView = getMcpPolicyView();
  let r = shouldAllowManagedMcpServersOnly(mcpPolicyView);
  return {
    mcpLockFromLowerSource: r && mcpPolicyView.slot?.allowManagedMcpServersOnly !== true,
    mcpAllowlistFromLowerSource:
      r &&
      mcpPolicyView.slot?.allowedMcpServers === undefined &&
      getAllowedMcpServersFromTiers(mcpPolicyView) !== undefined,
    mcpShadowedSourceCount: shadowedMcpPolicySources.length,
    mcpShadowedKeyCount: shadowedMcpPolicySources.reduce((acc, { keys }) => acc + keys.length, 0),
  };
}
//@ chunk-q8cqcff6.js:106097-106136 placement = getInitialSettings (1)
/**
 * 合并后的设置（getSettingsWithErrors().settings 或 {}），旧版 getInitialSettings。
 */
function getInitialSettings_2() {
  return getSettingsWithErrors_2().settings || {};
}
//@ chunk-q8cqcff6.js:106136-106146 placement = getSettings_DEPRECATED (0)
var getSettings_DEPRECATED = getInitialSettings_2;
//@ chunk-q8cqcff6.js:106146-106299 placement = getSettingsWithSources (1)
/**
 * 清缓存后返回合并结果与每个非空来源的设置，供 /status、doctor 展示。
 */
function getSettingsWithSources_2() {
  invalidateCommandNames();
  let sources = [];
  for (let source of getEnabledSettingSources_2()) {
    let settings = getSettingsForSource(source);
    if (settings && Object.keys(settings).length > 0)
      sources.push({
        source,
        settings,
      });
  }
  return {
    effective: getInitialSettings_2(),
    sources,
  };
}
//@ chunk-q8cqcff6.js:106299-106411 placement
/**
 * 从优先级最高的来源往下找第一个定义了某键的来源，用于提示该值来自哪里。
 */
function getEffectiveSettingSource_2(e) {
  let enabledSettingSources = getEnabledSettingSources_2();
  for (let j = enabledSettingSources.length - 1; j >= 0; j--) {
    let s = enabledSettingSources[j];
    if (getSettingsForSource(s)?.[e] !== undefined) return s;
  }
  return null;
}
//@ chunk-q8cqcff6.js:106411-106583 placement = getSettingsWithErrors (0.574)
/**
 * 返回合并后的设置与全部错误，首次调用时 loadSettingsFromDisk 并缓存（启动剖析点 loadSettingsFromDisk_start/end）。
 */
function getSettingsWithErrors_2() {
  let cached = commandSyncNameState();
  let mergedSettings = cached.mergedSettings;
  if (mergedSettings !== null) return mergedSettings;
  profileCheckpoint("loadSettingsFromDisk_start");
  let result = loadSettingsFromDisk(buildSettingsContext());
  profileCheckpoint("loadSettingsFromDisk_end");
  cached.mergedSettings = result;
  return result;
}
//@ chunk-q8cqcff6.js:106583-107046 placement = getManagedFileSettingsPresence (0.548)
/**
 * 检查托管目录中 managed-settings.json 与 managed-settings.d/*.json 是否有内容，供 /status 显示 file / drop-ins。
 */
function getManagedFileSettingsPresence() {
  if (isDiskless())
    return {
      hasBase: false,
      hasDropIns: false,
    };
  for (let e of managedFileSettingsDirs(wslInheritsSettings())) {
    let n = isPolicyTier(parseSettingsFile(join(e, "managed-settings.json"), undefined, true));
    let r = false;
    try {
      let s = join(e, "managed-settings.d");
      let S = (name) => isPolicyTier(parseSettingsFile(join(s, name), undefined, true));
      let E = commandSyncNameState().primedFolderListing(s);
      if (E !== undefined) r = E.some(S);
      else
        r = getFsImplementation()
          .readdirSync(s)
          .some((h) => {
            if (!(h.isFile() || h.isSymbolicLink()) || !isManagedSettingsDropInName(h.name)) return false;
            return S(h.name);
          });
    } catch {}
    if (n || r)
      return {
        hasBase: n,
        hasDropIns: r,
      };
  }
  return {
    hasBase: false,
    hasDropIns: false,
  };
}
//@ chunk-q8cqcff6.js:107046-107335 placement
function getBasePolicySettings() {
  let e = {
    ...buildSettingsContext(),
    helper: undefined,
  };
  let { present, heldEmpty } = resolvePolicySettings(e);
  if (heldEmpty) return {};
  if (present.remote) return parseRemoteManagedSettings_2(e).settings;
  if (present.mdm) return mdmResult().settings;
  if (present.file) return loadManagedFileSettings().settings;
  let { settings } = parseParentManagedSettings(e);
  if (settings) return settings;
  let mdmPoll = startMdmPoll();
  return Object.keys(mdmPoll.settings).length > 0 ? mdmPoll.settings : null;
}
//@ chunk-q8cqcff6.js:107335-107410 placement
function getBasePolicySettingsOrigin() {
  let policySettingsOrigin = getPolicySettingsOrigin_2_2({
    ...buildSettingsContext(),
    helper: undefined,
  });
  return policySettingsOrigin === "helper" ? null : policySettingsOrigin;
}
//@ chunk-q8cqcff6.js:107410-107441 placement
function isForceRemoteSettingsRefreshConfigured() {
  return isForceRemoteSettingsRefreshConfigured_2(buildSettingsContext());
}
//@ chunk-q8cqcff6.js:107441-107563 placement
function getPolicySettingsOrigin() {
  let e = commandSyncNameState();
  let origin = e.policy.origin;
  if (origin !== undefined) return origin.value;
  let policySettingsOrigin = getPolicySettingsOrigin_2_2(buildSettingsContext());
  e.policy.origin = {
    value: policySettingsOrigin,
  };
  return policySettingsOrigin;
}
//@ chunk-q8cqcff6.js:107563-107746 placement
function getVouchedPolicyTierSettings() {
  let e = commandSyncNameState();
  let remoteVerified = isRemoteManagedSettingsVerified();
  let vouchedTiers = e.policy.vouchedTiers;
  if (vouchedTiers !== undefined && vouchedTiers.remoteVerified === remoteVerified) return vouchedTiers.value;
  let vouchedPolicyTierSettings = getVouchedPolicyTierSettings_2(buildSettingsContext(), remoteVerified);
  e.policy.vouchedTiers = {
    remoteVerified,
    value: vouchedPolicyTierSettings,
  };
  return vouchedPolicyTierSettings;
}
//@ chunk-q8cqcff6.js:107746-107937 placement
function getVouchedAdminPolicyTier() {
  let e = commandSyncNameState();
  let n = isRemoteManagedSettingsVerified();
  let vouchedAdminTier = e.policy.vouchedAdminTier;
  if (vouchedAdminTier !== undefined && vouchedAdminTier.remoteVerified === n) return vouchedAdminTier.value;
  let vouchedAdminPolicyTier = getVouchedAdminPolicyTier_2(buildSettingsContext(), n);
  e.policy.vouchedAdminTier = {
    remoteVerified: n,
    value: vouchedAdminPolicyTier,
  };
  return vouchedAdminPolicyTier;
}
//@ chunk-q8cqcff6.js:107937-108074 placement
function getHostPolicyLoginPins() {
  let e = commandSyncNameState();
  let hostLoginPins = e.policy.hostLoginPins;
  if (hostLoginPins !== undefined) return hostLoginPins.value;
  let hostPolicyLoginPins = getHostPolicyLoginPins_2(buildSettingsContext());
  e.policy.hostLoginPins = {
    value: hostPolicyLoginPins,
  };
  return hostPolicyLoginPins;
}
//@ chunk-q8cqcff6.js:108074-108451 placement
function getMachineAdminCredentialInputs() {
  if (isMdmLoadInFlight())
    return {
      envs: [],
      apiKeyHelper: false,
      unread: true,
    };
  let e = commandSyncNameState();
  let machineCredentialInputs = e.policy.machineCredentialInputs;
  if (machineCredentialInputs !== undefined) return machineCredentialInputs;
  let settingsContext = buildSettingsContext();
  let managedFileSettings = loadManagedFileSettings_2(settingsContext);
  settingsContext.file = () => managedFileSettings;
  let machineAdminPolicyTiers = getMachineAdminPolicyTiers_2(settingsContext);
  let E = {
    envs: machineAdminPolicyTiers.flatMap((machineAdminPolicyTier) =>
      Object.entries(machineAdminPolicyTier.env ?? {}).map(([key, value]) => ({
        [key.toUpperCase()]: value,
      })),
    ),
    apiKeyHelper: machineAdminPolicyTiers.some(
      (machineAdminPolicyTier) => machineAdminPolicyTier.apiKeyHelper !== undefined,
    ),
    unread: isMachineAdminSourceUnread(settingsContext),
  };
  e.policy.machineCredentialInputs = E;
  return E;
}
//@ chunk-q8cqcff6.js:108451-108482 placement
function getShadowedManagedSources() {
  return getShadowedManagedSources_2(buildSettingsContext());
}
//@ chunk-q8cqcff6.js:108482-108513 placement
function getManagedSourcesInEffect() {
  return getManagedSourcesInEffect_2(buildSettingsContext());
}
//@ chunk-q8cqcff6.js:108513-108660 placement
function isPolicySlotAdminOrParentComposed() {
  let e = commandSyncNameState();
  let slotAdminOrParentComposed = e.policy.slotAdminOrParentComposed;
  if (slotAdminOrParentComposed !== undefined) return slotAdminOrParentComposed;
  let r = isPolicySlotAdminOrParentComposed_2(buildSettingsContext());
  e.policy.slotAdminOrParentComposed = r;
  return r;
}
//@ chunk-q8cqcff6.js:108660-108885 placement
function anyAdminPolicyTierGovernsRetention() {
  let e = commandSyncNameState();
  let adminRetentionGoverned = e.policy.adminRetentionGoverned;
  if (adminRetentionGoverned !== undefined) return adminRetentionGoverned;
  let any = [
    parseRemoteManagedSettings_2(buildSettingsContext()).settings,
    mdmResult().settings,
    loadManagedFileSettings_2(buildSettingsContext()).settings,
  ].some((S) => S?.cleanupPeriodDays !== undefined);
  e.policy.adminRetentionGoverned = any;
  return any;
}
//@ chunk-q8cqcff6.js:108885-109112 placement
function getPolicySettingsLoadErrors() {
  let e = commandSyncNameState();
  let loadErrors = e.policy.loadErrors;
  if (loadErrors !== undefined) return loadErrors;
  let r = [];
  r.push(...parseRemoteManagedSettings_2(buildSettingsContext()).errors);
  r.push(...settingsPolicyErrors());
  r.push(...loadManagedFileSettings().errors);
  r.push(...parseParentManagedSettings(buildSettingsContext()).errors);
  r.push(...startMdmPoll().errors);
  e.policy.loadErrors = r;
  return r;
}
//@ chunk-q8cqcff6.js:109112-109160 placement
function settingsPolicyErrors() {
  return mdmPolicyErrors(
    mdmResult(),
    () => parseRemoteManagedSettings_2(buildSettingsContext()),
    loadManagedFileSettings,
  );
}
//@ chunk-q8cqcff6.js:109160-109214 placement
function getPolicyHelperSourceLoadErrors() {
  return [...mdmResult().errors, ...loadManagedFileSettings().errors];
}
//@ chunk-q8cqcff6.js:109214-109367 placement
function policySettingUnreadable(e) {
  return getPolicySettingsLoadErrors().some((n) => {
    if (n.userWritable || n.wslIgnored || n.file === PARENT_MANAGED_SETTINGS_SOURCE_LABEL) return false;
    if (n.path === "") return true;
    return n.path === e && !n.statusOnly;
  });
}
//@ chunk-q8cqcff6.js:109367-109553 placement
function getAdminLoadErrors() {
  let e = commandSyncNameState();
  let adminLoadErrors = e.policy.adminLoadErrors;
  if (adminLoadErrors !== undefined) return adminLoadErrors;
  let r = [];
  r.push(...parseRemoteManagedSettings_2(buildSettingsContext()).errors);
  r.push(...settingsPolicyErrors());
  r.push(...loadManagedFileSettings().errors);
  e.policy.adminLoadErrors = r;
  return r;
}
//@ chunk-q8cqcff6.js:109553-109630 placement
function hasAdminPolicyLoadRecords() {
  return getAdminLoadErrors().some((e) => e.userWritable !== true && e.wslIgnored !== true);
}
//@ chunk-q8cqcff6.js:109630-109890 placement
function hasMachinePluginKeyLoadRecords() {
  let e = commandSyncNameState();
  let machinePluginKeyLoadRecords = e.policy.machinePluginKeyLoadRecords;
  if (machinePluginKeyLoadRecords !== undefined) return machinePluginKeyLoadRecords;
  let any = getPolicyHelperSourceLoadErrors().some(
    (s) =>
      s.userWritable !== true &&
      s.wslIgnored !== true &&
      (s.severity !== "warning" ||
        MACHINE_PLUGIN_KEY_PATHS.includes(firstLineOf(firstLineOf(s.path, "."), "["))),
  );
  e.policy.machinePluginKeyLoadRecords = any;
  return any;
}
//@ chunk-q8cqcff6.js:109890-110059 placement
var MACHINE_PLUGIN_KEY_PATHS = [
  "",
  "enabledPlugins",
  "extraKnownMarketplaces",
  "strictKnownMarketplaces",
  "prependPlugins",
  "appendPlugins",
  "policyHelper",
  "policyHelpers",
  ...SETTING_ALIASES.map((e) => e.alias),
];
//@ chunk-q8cqcff6.js:110059-110091 placement
function getFatalAdminPolicyLoadErrors() {
  return filterFatalPolicyErrors(getAdminLoadErrors());
}
//@ chunk-q8cqcff6.js:110091-110152 placement
function filterFatalPolicyErrors(e) {
  return e.filter((n) => n.severity !== "warning");
}
//@ chunk-q8cqcff6.js:110152-110415 placement
function hasSurvivingAdminPolicySource() {
  let e = commandSyncNameState();
  let adminSurvivor = e.policy.adminSurvivor;
  if (adminSurvivor !== undefined) return adminSurvivor;
  let settingsContext = buildSettingsContext();
  let s = armedHelperOutput(settingsContext);
  let S = mdmResult();
  let E =
    (s.composes === "tier" && !armedFromUserWritableBase() && !S.userWritable) ||
    authoredPolicyContent(parseRemoteManagedSettings_2(settingsContext)) ||
    (!S.userWritable && authoredPolicyContent(S));
  if (!E) {
    let managedFileSettings = loadManagedFileSettings();
    E = managedFileSettings.heldOnly !== true && authoredPolicyContent(managedFileSettings);
  }
  e.policy.adminSurvivor = E;
  return E;
}
//@ chunk-q8cqcff6.js:110415-110459 placement
function isAdminPolicyUnreadable() {
  return !hasSurvivingAdminPolicySource() && getFatalAdminPolicyLoadErrors().length > 0;
}
//@ chunk-q8cqcff6.js:110459-110494 placement
var PERMISSION_DENIED_ERRNOS = new Set(["EACCES", "EPERM"]);
//@ chunk-q8cqcff6.js:110494-110580 placement
function isPermissionDeniedPolicyError(e) {
  return e.errorClass === "unreadable" && e.errno !== undefined && PERMISSION_DENIED_ERRNOS.has(e.errno);
}
//@ chunk-q8cqcff6.js:110580-110633 placement
function adminPolicyLoadFailureRefusesLaunch() {
  return (
    !hasSurvivingAdminPolicySource() &&
    getFatalAdminPolicyLoadErrors().some((e) => !isPermissionDeniedPolicyError(e))
  );
}
//@ chunk-q8cqcff6.js:110633-110722 placement = _temp7 (1)
function policyEntryWarnings() {
  try {
    let settingsForSource = getSettingsForSource("policySettings");
    return [
      ...deniedModelsEntryWarnings(settingsForSource),
      ...availableModelsExactEntryWarnings(settingsForSource),
    ];
  } catch {
    return [];
  }
}
//@ chunk-q8cqcff6.js:110722-111545 placement
function surfaceManagedSettingsErrorsHeadless() {
  let policySettingsLoadErrors = getPolicySettingsLoadErrors();
  let n = [
    ...helperSelectionWarnings().filter((E) => !isInertManagedMcpServersNotice(E.path)),
    ...policyEntryWarnings(),
  ];
  if (policySettingsLoadErrors.length === 0 && n.length === 0) return;
  let any = policySettingsLoadErrors.some(
    (policySettingsLoadError) => policySettingsLoadError.severity !== "warning",
  );
  let any_2 = policySettingsLoadErrors.some(isBlockingSettingsIssue);
  let S = [];
  if (policySettingsLoadErrors.length > 0) {
    let E = any_2
      ? "Managed settings failed to load; policies from the failed source are NOT in effect:"
      : any
        ? "Managed settings contain invalid entries, including PreToolUse/PermissionRequest hooks that are NOT loaded; fix or remove each entry:"
        : "Managed settings contain invalid entries (remaining valid policies are still enforced):";
    S.push(`${E}
${policySettingsLoadErrors.map(formatManagedSettingsError).join(`
`)}`);
  }
  if (n.length > 0)
    S.push(`Managed settings notices:
${n.map(formatManagedSettingsError).join(`
`)}`);
  process.stderr.write(`${S.join(`
`)}
`);
  if (policySettingsLoadErrors.length === 0) return;
  logEvent("tengu_managed_settings_validation_errors", {
    error_count: policySettingsLoadErrors.length,
    remote_error_count: count(policySettingsLoadErrors, (E) => E.file === "remote managed settings"),
    fatal: any,
  });
}
//@ chunk-q8cqcff6.js:111545-111642 placement
function managedDocumentLinks() {
  getPolicySettingsLoadErrors();
  return [...commandSyncNameState().managedDocumentLinks.all(), ...(mdmResult().managedDocumentLinks ?? [])];
}
//@ chunk-q8cqcff6.js:111642-111721 placement
function managedLinkWarningLines() {
  return managedDocumentLinks().flatMap((e) => {
    let n = describeLinkedPath(e);
    return n === null ? [] : [n];
  });
}
//@ chunk-q8cqcff6.js:111721-111781 placement
function managedFileProtections() {
  getPolicySettingsLoadErrors();
  return commandSyncNameState().managedFileProtections.all();
}
//@ chunk-q8cqcff6.js:111781-111949 placement
function getManagedFileProtectionForLogging() {
  let e = new Set(managedFileProtections().map(([, r]) => r));
  let found = CONFIG_DIR_UNSAFE_REASONS.find((r) => e.has(r));
  if (found === undefined) return;
  return {
    protection: found,
    setsOrgPin: commandSyncNameState().managedFileProtections.setsOrgPin,
  };
}
//@ chunk-q8cqcff6.js:111949-112335 placement
function logManagedDocumentLinks() {
  let e = managedDocumentLinks();
  if (e.length === 0) return;
  logEvent("tengu_managed_settings_links", {
    inside_count: count(e, (n) => n.kind === "inside"),
    outside_count: count(e, (n) => n.kind === "outside"),
    unverified_count: count(e, (n) => n.kind === "unverified"),
    outside_writable_count: count(e, (n) => n.kind === "outside" && n.targetWritable === "yes"),
    outside_writable_unknown_count: count(e, (n) => n.kind === "outside" && n.targetWritable === "unknown"),
  });
}
//@ chunk-q8cqcff6.js:112335-112450 placement
function formatManagedSettingsError(e) {
  return `  ${e.file === undefined ? "managed settings" : cleanForDisplay(e.file)}${e.path ? ` (${e.path})` : ""}: ${e.message}`;
}
//@ chunk-q8cqcff6.js:112450-112494 placement
/**
 * 写入可编辑来源（user/project/local）：读取原始文件（校验失败时保留原文以免丢失未知键），用 mergeWith 合并（undefined 表示删除键、数组整体替换），以原子写落盘（user 允许符号链接，project/local 检查父目录），写 local 时异步把 .claude/settings.local.json 加入全局 gitignore，最后刷新缓存并通知变更。storage v5 后端时写入存储记录。
 */
function updateSettingsForSource(e, n, r, s) {
  return updateSettingsForSourceWithTransform(e, () => n, r, s);
}
//@ chunk-q8cqcff6.js:112494-112706 placement = getEnabledSettingSources (0.888)
function updateSettingsForSourceWithTransform(e, n, r, s) {
  if (e === "policySettings" || e === "flagSettings")
    return Promise.resolve({
      error: null,
    });
  let settingsFilePathForSource = getSettingsFilePathForSource(e);
  if (!settingsFilePathForSource)
    return Promise.resolve(
      getOriginalCwdOrNull() === null
        ? {
            error: new NoProjectDirectoryError(),
          }
        : refuseDisklessSettingsWrite(e),
    );
  return settingsWriteQueue.run(settingsFilePathForSource, () =>
    updateSettingsForSource_2(e, n, settingsFilePathForSource, r, s),
  );
}
//@ chunk-q8cqcff6.js:112706-112718 placement
var settingsWriteQueue = createKeyedQueue();
//@ chunk-q8cqcff6.js:112718-112819 placement
function refuseDisklessSettingsWrite(e) {
  warnDisklessSettingsWrite("settings", e);
  return {
    error: Error("This session does not write settings to disk"),
  };
}
//@ chunk-q8cqcff6.js:112819-112900 placement
function runInSettingsWriteQueue(e, n) {
  return settingsWriteQueue.run(e, async () => {
    try {
      return await n();
    } finally {
      invalidateCommandNames();
    }
  });
}
//@ chunk-q8cqcff6.js:112900-112933 placement
function drainSettingsWrites() {
  return settingsWriteQueue.drain();
}
//@ chunk-q8cqcff6.js:112933-112942 layout
registerWriteQueueDrain(drainSettingsWrites);
//@ chunk-q8cqcff6.js:112942-113146 layout
async function writeSettingsFileAtomic(e, n, r) {
  try {
    await writeFileAtomic(e, n, r);
  } catch (error) {
    if (!(error instanceof SymlinkWriteRefusedError) || !(await neverSettingsSave(e))) throw error;
    logForDebugging(`Writing settings through symlinked path ${e}`);
    await writeFileAtomic(e, n, {
      ...r,
      allowSymlink: true,
      checkParentDir: false,
    });
  }
}
//@ chunk-q8cqcff6.js:113146-113176 layout
async function neverSettingsSave(e) {
  return false;
}
//@ chunk-q8cqcff6.js:113176-113230 layout
function sanitizeRawSettingsForWrite(e, n) {
  let r = clone(e);
  applySettingAliases(r, n);
  coerceStringListSettings(r);
  return r;
}
//@ chunk-q8cqcff6.js:113230-113295 layout
class SettingsWriteRefusedError extends Error {
  why;
  constructor(why, n) {
    super(n);
    this.why = why;
  }
}
//@ chunk-q8cqcff6.js:113295-113909 layout
function decodeStoredSettingsRecord(storedUserSettings, n) {
  switch (storedUserSettings.kind) {
    case "object": {
      let settingsContent = parseSettingsContent(storedUserSettings.content, n);
      let s =
        settingsContent.settings === null || settingsContent.errors.some((error) => error.preserveOnWrite);
      return {
        settings: s ? sanitizeRawSettingsForWrite(storedUserSettings.raw, n) : settingsContent.settings,
        raw: s,
      };
    }
    case "absent":
      return {
        settings: null,
        raw: false,
      };
    case "empty":
      return {
        settings: {},
        raw: false,
      };
    case "oversize":
      throw new SettingsWriteRefusedError(
        "stored_oversize",
        "Your saved settings are too large to read, so this change was not saved",
      );
    case "non-object":
      throw new SettingsWriteRefusedError(
        "stored_not_object",
        "Your saved settings are damaged, so this change was not saved",
      );
    case "unreadable":
      throw new SettingsWriteRefusedError(
        "stored_unreadable",
        "Your saved settings could not be read, so this change was not saved",
      );
  }
}
//@ chunk-q8cqcff6.js:113909-117127 callgraph-witnessed = updateSettingsForSource (0.24)
async function updateSettingsForSource_2(e, n, settingsFilePathForSource, s, S) {
  let E = isStorageV5Enabled() && S !== undefined && isDefaultUserSettingsPath(e, settingsFilePathForSource);
  if (isDiskless() && !E) return refuseDisklessSettingsWrite(settingsFilePathForSource);
  let h = s?.legacyRevocation === "skip";
  let error = null;
  let P;
  using O = {
    [Symbol.dispose]: () => P?.(),
  };
  let T = E && isDiskless() ? S : undefined;
  try {
    let filePath = readLocalSettingsAliases(e);
    let M = false;
    let x = T
      ? null
      : getSettingsForSourceUncached(e, buildSettingsContext(), {
          includeLegacyLocalSettings: false,
        });
    let L =
      x !== null &&
      parseSettingsFile_3(settingsFilePathForSource, buildSettingsContext().store).errors.some(
        (error) => error.preserveOnWrite,
      );
    if (L) x = null;
    if (!x && !T) {
      let content = null;
      try {
        let j =
          e === "userSettings" || isInClaudeConfigHome(settingsFilePathForSource)
            ? safeResolvePath(getFsImplementation(), settingsFilePathForSource)
            : await vetRepoSettingsPathAsync(getFsImplementation(), settingsFilePathForSource);
        content = (await readFileChecked(j.resolvedPath, MAX_SETTINGS_JSON_BYTES)).content;
      } catch (error) {
        if (!isENOENT(error)) throw error;
      }
      if (content !== null && content.trim() !== "") {
        let j = safeParseJSON(content, false);
        if (j === null) {
          logForDebugging(
            `updateSettingsForSource: invalid JSON in settings file at ${settingsFilePathForSource}`,
            {
              level: "error",
            },
          );
          return {
            error: Error(`Invalid JSON syntax in settings file at ${settingsFilePathForSource}`),
          };
        }
        if (j && typeof j === "object") {
          x = sanitizeRawSettingsForWrite(j, settingsFilePathForSource);
          M = true;
          logForDebugging(
            L
              ? `Using raw settings from ${settingsFilePathForSource} so entries this build does not recognize survive the write`
              : `Using raw settings from ${settingsFilePathForSource} due to validation failure`,
          );
        }
      }
    }
    if (T) {
      let U = decodeStoredSettingsRecord(await readStoredUserSettings(T), settingsFilePathForSource);
      x = U.settings;
      M = U.raw;
    }
    filePath.before(x ?? null, M, settingsFilePathForSource);
    let rawData = n(x ?? null);
    if (rawData === null) {
      if (e === "localSettings" && !h) {
        let U = await revokeFromLegacyLocalSettings(n, filePath);
        if (U.error)
          return {
            error: U.error,
          };
        if (U.changed) {
          if (isStorageV5Enabled() && S !== undefined)
            P = await mirrorUserSettingsWrite(S, settingsFilePathForSource);
          try {
            getSettingsWithErrors_2();
          } catch (error) {
            logError(error);
          }
          emitSettingsChanged(e);
        }
      }
      return {
        error: null,
      };
    }
    if (!isDiskless()) await getFsImplementation().mkdir(dirname(settingsFilePathForSource));
    let updatedSettings = mergeWithAssigner_2(x || {}, rawData, (U, srcValue, key, object) => {
      if (srcValue === undefined && object && typeof key === "string") {
        delete object[key];
        return;
      }
      if (Array.isArray(srcValue)) return srcValue;
      if (key === "extraKnownMarketplaces" && isPlainObject(U) && isPlainObject(srcValue))
        return mergeExtraKnownMarketplacesByEntry(U, srcValue);
      return;
    });
    let K =
      jsonStringify(updatedSettings, null, 2) +
      `
`;
    if (T && Buffer.byteLength(K) > MAX_SETTINGS_JSON_BYTES)
      throw new SettingsWriteRefusedError(
        "result_oversize",
        "Your saved settings would be too large after this change, so the change was not saved",
      );
    markInternalWrite(settingsFilePathForSource);
    if (E) {
      let U = await S.write(STORAGE_SPACES.userSettings(), K, {
        publishDiscipline: "followAtomic",
      });
      if (!U.ok)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `settings storageV5 write failed: ${U.error.code}${"failureClass" in U.error ? ` (${U.error.failureClass})` : ""}`,
          "settings storageV5 write failed",
        );
    } else {
      let U = isPathConfigDir(dirname(settingsFilePathForSource));
      await writeSettingsFileAtomic(settingsFilePathForSource, K, {
        encoding: "utf-8",
        allowSymlink: e === "userSettings" || U,
        checkParentDir: (e === "projectSettings" || e === "localSettings") && !U,
        stagingDir: join(dirname(settingsFilePathForSource), ATOMIC_WRITE_DIRNAME),
      });
    }
    filePath.after({
      path: settingsFilePathForSource,
      content: K,
    });
    invalidateCommandNames();
    if (E) P = seedWrittenUserSettings(settingsFilePathForSource, K);
    if (e === "localSettings" && !h) {
      let U = await revokeFromLegacyLocalSettings(n, filePath);
      if (U.error && U.phase !== undefined && !hasArrayOrUndefined(rawData))
        logForDebugging(
          `localSettings: legacy settings.local.json could not be evaluated (${U.phase} failure) but this write contains no removals \u2014 canonical write succeeded, ignoring: ${U.error.message}`,
          {
            level: "warn",
          },
        );
      else error = U.error;
    }
    if (e === "localSettings") {
      let U = addFileGlobRuleToGitignore(
        getRelativeSettingsFilePathForSource("localSettings"),
        getProjectConfigRoot() ?? getOriginalCwd(),
      )
        .then((Z) => {
          if (!Z.written) return;
          if (Z.effective) logFeatureOk("gitignore_global_rule");
          else if (Z.reason === "already_tracked") logFeatureSad("gitignore_global_rule", Z.reason);
          else logFeatureBad("gitignore_global_rule", Z.reason ?? "write_ineffective");
        })
        .catch(() => {
          return;
        });
      let j = commandSyncNameState();
      j.backgroundWorkTail = Promise.all([j.backgroundWorkTail, U]).then(() => {
        return;
      });
    }
    if (T && M) logFeatureSad("ccs_user_settings_write", "merged_into_raw_record");
    else if (T) logFeatureOk("ccs_user_settings_write");
  } catch (error) {
    if (T)
      logFeatureBad(
        "ccs_user_settings_write",
        error instanceof SettingsWriteRefusedError ? error.why : "failed",
      );
    if (error instanceof SettingsWriteRefusedError) {
      logForDebugging(`updateSettingsForSource: refused (${error.why}): ${error.message}`, {
        level: "error",
      });
      return {
        error,
      };
    }
    let M = Error(`Failed to read raw settings from ${settingsFilePathForSource}: ${error}`, {
      cause: error,
    });
    logForDebugging(M.message, {
      level: "error",
    });
    return {
      error: M,
    };
  }
  if (isStorageV5Enabled() && S !== undefined && !E)
    P = await mirrorUserSettingsWrite(S, settingsFilePathForSource);
  try {
    getSettingsWithErrors_2();
  } catch (error) {
    logError(error);
  }
  emitSettingsChanged(e);
  return {
    error,
  };
}
//@ chunk-q8cqcff6.js:117127-117247 layout = _temp5 (1)
async function mirrorUserSettingsWrite(e, n) {
  let settingsFilePathForSource = getSettingsFilePathForSource("userSettings");
  if (
    settingsFilePathForSource === undefined ||
    settingsFilePathForSource === n ||
    !isDefaultUserSettingsPath("userSettings", settingsFilePathForSource)
  )
    return;
  return seedProjectSettings(e, commandSyncNameState(), settingsFilePathForSource);
}
//@ chunk-q8cqcff6.js:117247-117483 layout
function seedWrittenUserSettings(e, n) {
  if (Buffer.byteLength(n) > MAX_SETTINGS_JSON_BYTES) return;
  let r;
  try {
    r = parseSettingsContent(n, e);
  } catch (error) {
    logForDebugging(`updateSettingsForSource: written settings not seeded: ${errorMessage(error)}`);
    return;
  }
  let s = commandSyncNameState();
  s.seedParsedFile(e, "userSettings", r, s.epoch);
  return s.retainLayer(e, r);
}
//@ chunk-q8cqcff6.js:117483-117614 layout
function hasArrayOrUndefined(rawData) {
  if (rawData === undefined || Array.isArray(rawData)) return true;
  if (rawData === null || typeof rawData !== "object") return false;
  return Object.values(rawData).some(hasArrayOrUndefined);
}
//@ chunk-q8cqcff6.js:117614-117723 layout
function emitSettingsChanged(e) {
  try {
    commandSyncNameState().changed.emit(e);
  } catch (error) {
    for (let r of error instanceof AggregateError ? error.errors : [error]) logError(r);
  }
}
//@ chunk-q8cqcff6.js:117723-119159 layout
/**
 * 对旧版 settings.local.json 应用变换但只保留删除部分（撤销授权）：读取并规范化旧文件，执行变换，内容有变化时原子写回并通知；各阶段失败返回遥测安全错误。
 */
async function revokeFromLegacyLocalSettings(e, filePath) {
  let legacyPath = getLegacyLocalSettingsFilePath_3(buildSettingsContext());
  if (!legacyPath)
    return {
      changed: false,
      error: null,
    };
  let content;
  try {
    let T = isInClaudeConfigHome(legacyPath)
      ? safeResolvePath(getFsImplementation(), legacyPath)
      : await vetRepoSettingsPathAsync(getFsImplementation(), legacyPath);
    content = (await readFileChecked(T.resolvedPath, MAX_SETTINGS_JSON_BYTES)).content;
  } catch (error) {
    if (isENOENT(error))
      return {
        changed: false,
        error: null,
      };
    let v = new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Failed to read legacy settings.local.json at ${legacyPath}: ${error}`,
      "Failed to read legacy settings.local.json",
    );
    logForDebugging(v.message, {
      level: "error",
    });
    return {
      changed: false,
      error: v,
      phase: "read",
    };
  }
  filePath.noteRead({
    path: legacyPath,
    content,
  });
  let parsed = safeParseJSON(content, false);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    return {
      changed: false,
      error: null,
    };
  let normalized = clone(parsed);
  applySettingAliases(normalized, legacyPath);
  coerceStringListSettings(normalized);
  let h = normalized;
  let transformed;
  try {
    transformed = e(clone(h));
  } catch (error) {
    let v = new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Transform failed against legacy settings.local.json at ${legacyPath} (malformed legacy content?): ${error}`,
      "Transform failed against legacy settings.local.json",
    );
    logForDebugging(v.message, {
      level: "error",
    });
    return {
      changed: false,
      error: v,
      phase: "transform",
    };
  }
  if (transformed === null)
    return {
      changed: false,
      error: null,
    };
  let merged = mergeWithAssigner_2(clone(h), transformed, (T, v, M, x) => {
    if (v === undefined && x && typeof M === "string") {
      delete x[M];
      return;
    }
    if (Array.isArray(v)) return v;
    return;
  });
  let result = projectRemovalsOnly(h, merged);
  if (jsonStringify(result) === jsonStringify(h))
    return {
      changed: false,
      error: null,
    };
  try {
    markInternalWrite(legacyPath);
    let T = isPathConfigDir(dirname(legacyPath));
    let v =
      jsonStringify(result, null, 2) +
      `
`;
    await writeSettingsFileAtomic(legacyPath, v, {
      encoding: "utf-8",
      allowSymlink: T,
      checkParentDir: !T,
      stagingDir: join(dirname(legacyPath), ATOMIC_WRITE_DIRNAME),
    });
    filePath.after({
      path: legacyPath,
      content: v,
    });
    invalidateCommandNames();
    return {
      changed: true,
      error: null,
    };
  } catch (error) {
    let v = new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Failed to revoke from legacy settings.local.json at ${legacyPath}: ${error}`,
      "Failed to revoke from legacy settings.local.json",
    );
    logForDebugging(v.message, {
      level: "error",
    });
    return {
      changed: false,
      error: v,
    };
  }
}
//@ chunk-q8cqcff6.js:119159-119410 placement
function projectRemovalsOnly(e, merged) {
  if (Array.isArray(e) && Array.isArray(merged)) {
    let r = new Set(merged.map((s) => jsonStringify(s)));
    return e.filter((s) => r.has(jsonStringify(s)));
  }
  if (isPlainObject(e) && isPlainObject(merged)) {
    let r = {};
    for (let key of Object.keys(e)) {
      if (!(key in merged) || merged[key] === undefined) continue;
      r[key] = projectRemovalsOnly(e[key], merged[key]);
    }
    return r;
  }
  return e;
}
//@ chunk-q8cqcff6.js:119410-119791 placement = getManagedSettingsKeysForLogging (0.208)
/**
 * 列出托管设置里出现的键（permissions/sandbox/hooks 展开一层），用于遥测。
 */
function getManagedSettingsKeysForLogging(settings) {
  let validSettings = getStrippingSettingsSchema(settings).parse(settings);
  let keysToExpand = ["permissions", "sandbox", "hooks"];
  let allKeys = [];
  let validNestedKeys = {
    permissions: new Set(Object.keys(PermissionsSettingsSchema().shape)),
    sandbox: new Set(Object.keys(sandboxFilesystemSettingsSchema().shape)),
    hooks: new Set(HOOK_EVENTS),
  };
  for (let key of Object.keys(validSettings))
    if (keysToExpand.includes(key) && validSettings[key] && typeof validSettings[key] === "object") {
      let nestedObj = validSettings[key];
      let validKeys = validNestedKeys[key];
      if (validKeys) {
        for (let nestedKey of Object.keys(nestedObj))
          if (validKeys.has(nestedKey)) allKeys.push(`${key}.${nestedKey}`);
      }
    } else allKeys.push(key);
  return allKeys.sort();
}
//@ chunk-q8cqcff6.js:119791-119924 placement
function getSettingsAfterPluginLoad(e) {
  if (!commandSyncNameState().pluginBaseLoaded)
    logEvent("tengu_plugin_settings_premature_read", {
      key: fromEnum(e),
    });
  let { settings } = getSettingsWithErrors_2();
  return (settings || {})[e];
}
//@ chunk-q8cqcff6.js:119924-119970 placement
function getSecuritySensitiveSetting(e) {
  return getSecuritySensitiveSettingWithSources(e).map((n) => n.value);
}
//@ chunk-q8cqcff6.js:119970-120027 placement = TRUSTED_SETTING_SOURCES (1)
var SECURITY_SENSITIVE_SETTING_SOURCES = ["policySettings", "flagSettings", "userSettings"];
//@ chunk-q8cqcff6.js:120027-120243 placement
function getSecuritySensitiveSettingWithSources(e) {
  let n = [];
  for (let r of SECURITY_SENSITIVE_SETTING_SOURCES) {
    let settingsForSourceTightenOnly = getSettingsForSourceTightenOnly(r);
    let S = settingsForSourceTightenOnly?.[e];
    if (
      S !== undefined &&
      (isSettingSourceEnabled(r) ||
        MANAGED_RESTRICTION_KEYS().some(
          (E) =>
            E.path.length === 1 &&
            E.path[0] === e &&
            asArray(E.restrictive).some((h) => h === restrictionValue(E, settingsForSourceTightenOnly)),
        ))
    )
      n.push({
        source: r,
        value: S,
      });
  }
  return n;
}
//@ chunk-q8cqcff6.js:120243-120489 placement = hasSkipDangerousModePermissionPrompt (1)
/**
 * 任一来源（user/local/flag/policy，不含 project）设置了 skipDangerousModePermissionPrompt。
 */
function hasSkipDangerousModePermissionPrompt() {
  return !!(
    getSettingsForSource("userSettings")?.skipDangerousModePermissionPrompt ||
    getSettingsForSource("localSettings")?.skipDangerousModePermissionPrompt ||
    getSettingsForSource("flagSettings")?.skipDangerousModePermissionPrompt ||
    getSettingsForSource("policySettings")?.skipDangerousModePermissionPrompt
  );
}
//@ chunk-q8cqcff6.js:120489-120625 placement
function hasVouchedSkipDangerousModePermissionPrompt() {
  return !!(
    getSettingsForSource("policySettings")?.skipDangerousModePermissionPrompt ||
    getSettingsForSource("userSettings")?.skipDangerousModePermissionPrompt
  );
}
//@ chunk-q8cqcff6.js:120625-120836 placement = hasSkipDangerousModePermissionPrompt (0.81)
function hasSkipWorkflowUsageWarning() {
  return !!(
    getSettingsForSource("userSettings")?.skipWorkflowUsageWarning ||
    getSettingsForSource("localSettings")?.skipWorkflowUsageWarning ||
    getSettingsForSource("flagSettings")?.skipWorkflowUsageWarning ||
    getSettingsForSource("policySettings")?.skipWorkflowUsageWarning
  );
}
//@ chunk-q8cqcff6.js:120836-120906 placement
function hasIsolatePeerMachines() {
  return getEnabledSettingSources_2().some((e) => getSettingsForSource(e)?.isolatePeerMachines === true);
}
//@ chunk-q8cqcff6.js:120906-121033 placement
function hasDisableClaudeAiConnectors() {
  return (
    getEnabledSettingSources_2().some((e) => getSettingsForSource(e)?.disableClaudeAiConnectors === true) ||
    getDurablePolicyTierSettings().some((e) => e.disableClaudeAiConnectors === true)
  );
}
//@ chunk-q8cqcff6.js:121033-121057 placement
function hasAutoModeOptIn() {
  return true;
}
//@ chunk-q8cqcff6.js:121057-121299 placement = hasSkipDangerousModePermissionPrompt (0.763)
function isNotDisabledInTrustedSources(settingKey) {
  let n = settingKey === "useAutoModeDuringPlan" ? getSettingsForSource : getSettingsForSourceTightenOnly;
  return ![
    ...getAllPolicyTierSettings(),
    ...getDurablePolicyTierSettings(),
    getSettingsForSource("policySettings"),
    getSettingsForSource("flagSettings"),
    n("userSettings"),
    n("localSettings"),
    settingKey !== "useAutoModeDuringPlan" || isSettingSourceEnabled("localSettings")
      ? getLegacyLocalSettingsOverlay()
      : null,
  ].some((r) => r?.[settingKey] === false);
}
//@ chunk-q8cqcff6.js:121299-121374 placement = _temp9 (1)
function isDisabledAboveWorkloadFiles(a_4) {
  return [...getVouchedPolicyTierSettings(), getSettingsForSource("flagSettings")].some(
    (n) => n?.[a_4] === false,
  );
}
//@ chunk-q8cqcff6.js:121374-121425 placement
function getUseAutoModeDuringPlan() {
  return isNotDisabledInTrustedSources("useAutoModeDuringPlan");
}
//@ chunk-q8cqcff6.js:121425-121479 placement
function getAskUserQuestionTimeout() {
  return getSecuritySensitiveSetting("askUserQuestionTimeout")[0];
}
//@ chunk-q8cqcff6.js:121479-121523 placement
function getDialogExpiry() {
  return getSecuritySensitiveSetting("dialogExpiry")[0];
}
//@ chunk-q8cqcff6.js:121523-121581 placement
function getModelProposedGoalsSettingParsed() {
  return getSecuritySensitiveSetting("modelProposedGoals")[0] ?? "auto";
}
//@ chunk-q8cqcff6.js:121581-121739 placement
async function getModelProposedGoalsSetting(storageV5) {
  let n = getSecuritySensitiveSetting("modelProposedGoals")[0];
  if (n !== undefined) return n;
  if ((await rawSettingsKeyPresence("modelProposedGoals", storageV5)) !== "absent") return "alwaysAsk";
  return "auto";
}
//@ chunk-q8cqcff6.js:121739-121945 placement
var autoModeConfigSchema = DoctorLazy(() =>
  u({
    allow: array(string()).optional(),
    soft_deny: array(string()).optional(),
    hard_deny: array(string()).optional(),
    deny: array(string()).optional(),
    environment: array(string()).optional(),
  }),
);
var AUTO_MODE_TRUSTED_SOURCES = ["userSettings", "flagSettings", "policySettings"];
//@ chunk-q8cqcff6.js:121945-123032 placement = getAutoModeConfig (0.293)
/**
 * 汇总 autoMode 分类器规则（allow/soft_deny/hard_deny/environment），只接受 user/flag/policy 来源；project/local 中的 autoMode 被忽略并打 tengu_settings_auto_mode_rules_untrusted_source_ignored。
 */
function getAutoModeConfig() {
  let e = autoModeConfigSchema();
  let n = commandSyncNameState();
  if (!n.autoModeUntrustedSourceWarned)
    for (let P of ["projectSettings", "localSettings"]) {
      if (P === "projectSettings" && projectSettingsAliasesUserSettings()) continue;
      let autoMode = getSettingsForSource(P)?.autoMode;
      if (autoMode && e.safeParse(autoMode).success) {
        n.autoModeUntrustedSourceWarned = true;
        logForDebugging(
          `settings autoMode in ${P} ignored \u2014 only user/flag/managed settings may set classifier rules (projectSettings and localSettings are repo-controllable)`,
          {
            level: "warn",
          },
        );
        logEvent("tengu_settings_auto_mode_rules_untrusted_source_ignored", {
          source: fromEnum(P),
        });
      }
    }
  let r = {};
  let s = [];
  let S = [];
  let E = [];
  let h = false;
  for (let source of AUTO_MODE_TRUSTED_SOURCES) {
    let settings = getSettingsForSource(source);
    if (!settings) continue;
    let result = e.safeParse(settings.autoMode);
    if (result.success) {
      if (result.data.allow) r[source] = result.data.allow;
      if (result.data.soft_deny) s.push(...result.data.soft_deny);
      if (result.data.hard_deny) S.push(...result.data.hard_deny);
      if (result.data.environment) E.push(...result.data.environment);
    }
  }
  if (r.flagSettings) r.flagSettings = flagAllowBesideManagedAllow(r.flagSettings, r.policySettings);
  let flattened = AUTO_MODE_TRUSTED_SOURCES.flatMap((P) => r[P] ?? []);
  if (flattened.length > 0 || s.length > 0 || S.length > 0 || E.length > 0 || h)
    return {
      ...(flattened.length > 0 && {
        allow: flattened,
      }),
      ...(s.length > 0 && {
        soft_deny: s,
      }),
      ...(S.length > 0 && {
        hard_deny: S,
      }),
      ...(E.length > 0 && {
        environment: E,
      }),
      ...{},
    };
  return;
}
//@ chunk-q8cqcff6.js:123032-123146 placement
function flagAllowBesideManagedAllow(e, n) {
  return e.includes(DEFAULTS_PLACEHOLDER) &&
    (replacesDefaults(n) || policySettingUnreadable("autoMode") || policySettingUnreadable("autoMode.allow"))
    ? e.filter((r) => r !== DEFAULTS_PLACEHOLDER)
    : e;
}
//@ chunk-q8cqcff6.js:123146-123185 placement
function builtinAllowRulesAreOff() {
  return replacesDefaults(getAutoModeConfig()?.allow);
}
//@ chunk-q8cqcff6.js:123185-123277 placement
function isAutoModeClassifyAllShellEnabled() {
  for (let e of AUTO_MODE_TRUSTED_SOURCES)
    if (getSettingsForSourceTightenOnly(e)?.autoMode?.classifyAllShell === true) return true;
  return false;
}
//@ chunk-q8cqcff6.js:123277-124758 placement
async function rawSettingsKeyPresence(e, n, r) {
  let settingsContext = buildSettingsContext();
  let enabledSettingSources = getEnabledSettingSources(settingsContext);
  let E = false;
  let h = false;
  for (let enabledSettingSource of enabledSettingSources) {
    if (enabledSettingSource === "policySettings" && settingsContext.diskless) continue;
    let P =
      enabledSettingSource !== "policySettings" &&
      (r?.presenceSources === undefined || r.presenceSources.includes(enabledSettingSource));
    if (
      P &&
      enabledSettingSource === "flagSettings" &&
      isPlainObject(settingsContext.flagInline) &&
      e in settingsContext.flagInline &&
      e !== "attribution" &&
      e !== "includeCoAuthoredBy"
    )
      E = true;
    if (enabledSettingSource === "flagSettings" && settingsContext.flagExpectedContent !== undefined) {
      if (!settingsContext.flagExpectedContent.trim()) continue;
      let x = safeParseJSON(settingsContext.flagExpectedContent, false);
      if (x === null || typeof x !== "object" || Array.isArray(x)) h = true;
      else if (P && e in x && e !== "attribution" && e !== "includeCoAuthoredBy") E = true;
      continue;
    }
    let settingsFilePathForSource = getSettingsFilePathForSource_3(enabledSettingSource, settingsContext);
    if (!settingsFilePathForSource) continue;
    if (
      isStorageV5Enabled() &&
      n !== undefined &&
      enabledSettingSource === "projectSettings" &&
      enabledSettingSources.includes("userSettings") &&
      projectSettingsAliasesUserSettings()
    )
      continue;
    let T =
      enabledSettingSource === "localSettings"
        ? getLegacyLocalSettingsFilePath_3(settingsContext)
        : undefined;
    let v = T ? [settingsFilePathForSource, T] : [settingsFilePathForSource];
    let M =
      isStorageV5Enabled() &&
      n !== undefined &&
      isDefaultUserSettingsPath(enabledSettingSource, settingsFilePathForSource);
    for (let x of v) {
      if (M) {
        let storedUserSettings = await readStoredUserSettings(n);
        switch (storedUserSettings.kind) {
          case "unreadable":
            logForDebugging(
              `rawSettingsKeyPresence: v5 user-settings read failed: ${storedUserSettings.code}`,
            );
            h = true;
            break;
          case "oversize":
          case "non-object":
            h = true;
            break;
          case "object":
            if (P && e in storedUserSettings.raw && !(e === "attribution" || e === "includeCoAuthoredBy"))
              E = true;
            break;
          case "absent":
          case "empty":
            break;
        }
        continue;
      }
      if (settingsContext.diskless) continue;
      try {
        let L =
          enabledSettingSource === "policySettings" ||
          enabledSettingSource === "userSettings" ||
          isInClaudeConfigHome(x)
            ? safeResolvePath(getFsImplementation(), x)
            : vetRepoSettingsPath(getFsImplementation(), x);
        let file = readFileSync(L.resolvedPath, MAX_SETTINGS_JSON_BYTES);
        if (!file.trim()) continue;
        let q = safeParseJSON(file, false);
        if (q === null || typeof q !== "object" || Array.isArray(q)) h = true;
        else if (P && e in q && !(e === "attribution" || e === "includeCoAuthoredBy")) E = true;
      } catch (error) {
        handleFileSystemError(error, x);
        if (!isENOENT(error)) h = true;
      }
    }
  }
  if (h) return "unknowable";
  return E ? "present" : "absent";
}
//@ chunk-dcmhvw5a.js:429611-429843 placement = cacheToObject (0.679)
/**
 * 把设置覆盖层合并进设置对象（删除值为 undefined 的键）；误配名且归属错误。
 */
function cacheToObject(e, answers) {
  if (answers === null) return e;
  let r = [...answers.values];
  return {
    settings: mergeWithAssigner_2(
      Uo(
        e.settings,
        r.filter(([, s]) => s === undefined).map(([s]) => s),
      ),
      clone(Object.fromEntries(r.filter(([, s]) => s !== undefined))),
      (s, a) => a,
    ),
    errors: [...e.errors, ...answers.errors],
  };
}
//@ chunk-dcmhvw5a.js:456962-457088 placement = getEnabledSettingSources (0.819)
/**
 * 同 getEnabledSettingSources，但基于传入的设置上下文。
 */
function getEnabledSettingSources(allowed) {
  let result = new Set(allowed.allowedSources);
  result.add("flagSettings");
  result.add("policySettings");
  return SETTING_SOURCES.filter((r) => result.has(r));
}
//@ chunk-dcmhvw5a.js:457088-457142 fingerprint = getManagedSettingsFilePath (1)
/**
 * <托管目录>/managed-settings.json；托管目录 macOS=/Library/Application Support/ClaudeCode，Windows=C:\Program Files\ClaudeCode，其他=/etc/claude-code。
 */
function getManagedSettingsFilePath() {
  return join(getManagedFilePath(), "managed-settings.json");
}
//@ chunk-dcmhvw5a.js:470468-470483 placement
var MAX_SETTINGS_JSON_BYTES = 2097152;
//@ chunk-dcmhvw5a.js:470483-470784 placement
/**
 * 读取设置文件：先做路径安全检查（符号链接指向其他主机/无法核实则拒读并给 fatal 错误），按文件内容缓存解析结果，空文件视为 {}。
 */
function parseSettingsFileUncached(e, n, r) {
  try {
    let s;
    if (n !== undefined) s = n;
    else {
      let a =
        r || isInClaudeConfigHome(e)
          ? safeResolvePath(getFsImplementation(), e)
          : vetRepoSettingsPath(getFsImplementation(), e);
      if (r) {
        let c = {};
        s = readFileSync(a.resolvedPath, MAX_SETTINGS_JSON_BYTES, (m) => {
          c.owner = {
            uid: m.uid,
            gid: m.gid,
            mode: m.mode,
          };
        });
        let settingsContent = parseSettingsContent(s, e, r);
        return c.owner
          ? {
              ...settingsContent,
              fileOwner: c.owner,
            }
          : settingsContent;
      }
      s = readFileSync(a.resolvedPath, MAX_SETTINGS_JSON_BYTES);
    }
    return parseSettingsContent(s, e, r);
  } catch (error) {
    return settingsReadErrorResult(error, e);
  }
}
//@ chunk-dcmhvw5a.js:477334-477482 placement = getRelativeSettingsFilePathForSource (1)
function getRelativeSettingsFilePathForSource(source) {
  switch (source) {
    case "projectSettings":
      return join(".claude", "settings.json");
    case "localSettings":
      return join(".claude", "settings.local.json");
  }
}
//@ chunk-dcmhvw5a.js:485208-485280 placement
function isAdminPolicyOrigin(e) {
  return e === "helper" || e === "plist" || e === "hklm" || e === "file";
}
//@ chunk-dcmhvw5a.js:485280-485330 fingerprint = getPolicySettingsOrigin (0.675)
function getPolicySettingsOrigin_2() {
  return getPlatform() === "macos" ? "plist" : "hklm";
}
//@ chunk-dcmhvw5a.js:510659-510911 placement
/**
 * lodash mergeWith 定制器：数组拼接去重（fallbackModel 取后者）；extraKnownMarketplaces、managedMcpServers 浅合并；modelPicker 整体替换；其余返回 undefined 交给默认深合并。
 */
function settingsMergeCustomizer(e, n, r) {
  if (r === "modelPicker" && n !== undefined) return cloneModelPicker(n);
  if (Array.isArray(e) && Array.isArray(n)) {
    if (r === "fallbackModel") return n;
    return uniq([...e, ...n]);
  }
  if ((r === "extraKnownMarketplaces" || r === "managedMcpServers") && isPlainObject(e) && isPlainObject(n))
    return mergeExtraKnownMarketplacesByEntry(e, n);
  return;
}
//@ chunk-dcmhvw5a.js:510911-511030 file-local
function cloneModelPicker(e) {
  if (!isPlainObject(e)) return e;
  let options = e.options;
  return {
    ...e,
    ...(Array.isArray(options) && {
      options: options.map((option) =>
        isPlainObject(option)
          ? {
              ...option,
            }
          : option,
      ),
    }),
  };
}
//@ chunk-dcmhvw5a.js:511030-514083 placement = loadSettingsFromDisk (0.255)
/**
 * 按 getEnabledSettingSourcesFor 的顺序（user→project→local→flag→policy，后者覆盖前者）逐来源读取并用 settingsMergeCustomizer 合并：policy 走 loadPolicySettings；local 先合并旧位置 cwd/.claude/settings.local.json；flag 合并 --settings 文件与 SDK 内联设置。最后 policy 的 availableModels/deniedModels/modelPicker 强制覆盖，并对 allowManagedReadPathsOnly/allowManagedDomainsOnly 下被忽略的 sandbox 条目给出警告。结果缓存在 store.mergedSettings。
 */
function loadSettingsFromDisk(e) {
  if (e.store.isLoadingFromDisk)
    return {
      settings: {},
      errors: [],
    };
  let startTime = Date.now();
  logForDiagnosticsNoPII("info", "settings_load_started");
  e.store.isLoadingFromDisk = true;
  try {
    let pluginBase = e.store.pluginBase;
    let mergedSettings = {};
    if (pluginBase) mergedSettings = mergeWithAssigner_2(mergedSettings, pluginBase, settingsMergeCustomizer);
    let a = [];
    let seenErrors = new Set();
    let seenFiles = new Set();
    let m = (errors) => {
      for (let error of errors) {
        let errorKey = `${error.file}:${error.path}:${error.message}`;
        if (!seenErrors.has(errorKey)) {
          seenErrors.add(errorKey);
          a.push(error);
        }
      }
    };
    let f = [];
    let h = [getManagedFilePath()];
    if (getPlatform() === "wsl" && e.wslInherits?.()) h.push(WSL_MANAGED_SETTINGS_DIR);
    let y = new Set(h.map((v) => resolve(join(v, "managed-settings.json"))));
    let b = new Set(h.map((v) => resolve(join(v, "managed-settings.d"))));
    let S = (v) => {
      let filePath = resolve(v);
      return y.has(filePath) || b.has(dirname(filePath));
    };
    let C = (v, settings, x) => {
      if (x?.channelLabel !== true && S(v)) return;
      let K = settings.sandbox?.filesystem?.allowRead?.length ?? 0;
      let q = settings.sandbox?.network?.allowedDomains?.length ?? 0;
      if (K > 0 || q > 0)
        f.push({
          file: v,
          allowReadCount: K,
          allowedDomainsCount: q,
        });
    };
    let w = null;
    for (let v of getEnabledSettingSources(e)) {
      if (v === "policySettings") {
        let { settings, errors } = loadPolicySettings(e);
        w = settings;
        m(deniedModelsEntryWarnings(settings));
        m(availableModelsExactEntryWarnings(settings));
        if (settings)
          mergedSettings = mergeWithAssigner_2(
            mergedSettings,
            trimmedPolicyTier(v, settings, e),
            settingsMergeCustomizer,
          );
        m(errors);
        continue;
      }
      let j = e.store.repoTierFreeze.tier(v);
      if (j !== undefined) {
        let settingsFilePathForSource = getSettingsFilePathForSource_3(v, e);
        if (settingsFilePathForSource) seenFiles.add(resolve(settingsFilePathForSource));
        m([...j.errors]);
        if (j.settings)
          mergedSettings = mergeWithAssigner_2(mergedSettings, j.settings, settingsMergeCustomizer);
        continue;
      }
      if (v === "localSettings") {
        let resolvedPath = getLegacyLocalSettingsFilePath_3(e);
        if (resolvedPath && !seenFiles.has(resolve(resolvedPath))) {
          seenFiles.add(resolve(resolvedPath));
          let { settings, errors } = parseSettingsFile_3(resolvedPath, e.store);
          m(errors);
          if (settings) {
            e.onLegacyLocalSettingsRead?.("cascade");
            C(resolvedPath, settings);
            mergedSettings = mergeWithAssigner_2(
              mergedSettings,
              trimmedPolicyTier(v, settings, e),
              settingsMergeCustomizer,
            );
          }
        }
      }
      let settingsFilePathForSource = getSettingsFilePathForSource_3(v, e);
      if (settingsFilePathForSource) {
        let K = resolve(settingsFilePathForSource);
        let q = v === "flagSettings" && e.flagExpectedContent !== undefined;
        if (!seenFiles.has(K) || q) {
          seenFiles.add(K);
          let { settings, errors } = parseSettingsFile_3(
            settingsFilePathForSource,
            e.store,
            v === "flagSettings" ? e.flagExpectedContent : undefined,
          );
          m(errors);
          if (settings) {
            if (v === "flagSettings" && e.flagInlineJson === true)
              C(INLINE_FLAG_SETTINGS_LABEL, settings, {
                channelLabel: true,
              });
            else C(settingsFilePathForSource, settings);
            mergedSettings = mergeWithAssigner_2(
              mergedSettings,
              trimmedPolicyTier(v, settings, e),
              settingsMergeCustomizer,
            );
          }
        }
      }
      if (v === "flagSettings") {
        let { settings, errors } = parseInlineFlagSettings(e);
        m(errors);
        if (settings) {
          C("SDK inline settings", settings, {
            channelLabel: true,
          });
          mergedSettings = mergeWithAssigner_2(
            mergedSettings,
            trimmedPolicyTier(v, settings, e),
            settingsMergeCustomizer,
          );
        }
      }
    }
    if (w) {
      if (w.availableModels !== undefined) mergedSettings.availableModels = [...w.availableModels];
      if (w.enforceAvailableModels !== undefined)
        mergedSettings.enforceAvailableModels = w.enforceAvailableModels;
      if (w.modelPicker !== undefined) mergedSettings.modelPicker = cloneModelPicker(w.modelPicker);
    }
    let deniedModels = w?.deniedModels;
    if (deniedModels !== undefined) mergedSettings.deniedModels = [...deniedModels];
    else delete mergedSettings.deniedModels;
    if (f.length > 0) {
      let allPolicyTierSettings = getAllPolicyTierSettings_3(e);
      let j = (file, K, q, ee, Z) => ({
        file,
        path: K,
        severity: "warning",
        statusOnly: true,
        message: `${K} is ignored \u2014 managed settings set ${q}, so only ${ee} from managed settings are honored. The ${Z === 1 ? "entry" : `${Z} entries`} in ${file} will NOT apply (see https://code.claude.com/docs/en/settings#sandbox-settings).`,
      });
      if (
        allPolicyTierSettings.some(
          (policyTierSetting) => policyTierSetting.sandbox?.filesystem?.allowManagedReadPathsOnly === true,
        )
      ) {
        for (let error of f)
          if (error.allowReadCount > 0)
            m([
              j(
                error.file,
                "sandbox.filesystem.allowRead",
                "allowManagedReadPathsOnly",
                "allowRead paths",
                error.allowReadCount,
              ),
            ]);
      }
      if (
        allPolicyTierSettings.some(
          (policyTierSetting) => policyTierSetting.sandbox?.network?.allowManagedDomainsOnly === true,
        )
      ) {
        for (let x of f)
          if (x.allowedDomainsCount > 0)
            m([
              j(
                x.file,
                "sandbox.network.allowedDomains",
                "allowManagedDomainsOnly",
                "allowed domains (and WebFetch domain rules)",
                x.allowedDomainsCount,
              ),
            ]);
      }
    }
    logForDiagnosticsNoPII("info", "settings_load_completed", {
      duration_ms: Date.now() - startTime,
      source_count: seenFiles.size,
      error_count: a.length,
    });
    e.store.hookedMerge.computed = mergedSettings;
    return cacheToObject(
      {
        settings: mergedSettings,
        errors: a,
      },
      e.store.hookedMerge.answers,
    );
  } finally {
    e.store.isLoadingFromDisk = false;
  }
}
//@ chunk-dcmhvw5a.js:514083-514196 placement
function getSettingsWithErrors(e) {
  let mergedSettings = e.store.mergedSettings;
  if (mergedSettings !== null) return mergedSettings;
  let settingsFromDisk = loadSettingsFromDisk(e);
  e.store.mergedSettings = settingsFromDisk;
  return settingsFromDisk;
}
//@ chunk-dcmhvw5a.js:514196-514248 placement
function getInitialSettings(e) {
  let { settings } = getSettingsWithErrors(e);
  return settings || {};
}
//@ chunk-dcmhvw5a.js:514248-514428 placement
function getSettingsWithSources(e) {
  e.store.invalidateAll();
  let n = [];
  for (let r of getEnabledSettingSources(e)) {
    let settingsForSource = getSettingsForSource_3(r, e);
    if (settingsForSource && Object.keys(settingsForSource).length > 0)
      n.push({
        source: r,
        settings: settingsForSource,
      });
  }
  return {
    effective: getInitialSettings(e),
    sources: n,
  };
}
//@ chunk-dcmhvw5a.js:514428-514548 placement
function getEffectiveSettingSource(e, n) {
  let enabledSettingSources = getEnabledSettingSources(n);
  for (let j = enabledSettingSources.length - 1; j >= 0; j--) {
    let a = enabledSettingSources[j];
    if (getSettingsForSource_3(a, n)?.[e] !== undefined) return a;
  }
  return null;
}
//@ chunk-4xpk3fhh.js:11081-11176 fingerprint = getSettingsRootPathForSource (1)
var TRUSTED_SETTING_SOURCES = ["policySettings", "flagSettings", "userSettings"];
var REPO_SETTING_SOURCES = ["localSettings", "projectSettings"];
//@ chunk-6zvepy0r.js:10205-10335 fingerprint = rawSettingsContainsKey (0.783)
async function resolveSettingsWritePath(key) {
  if (settingsSourceForPathByPriority(key) === "policySettings" || isInClaudeConfigHome(key)) return key;
  let n = await vetRepoSettingsPathAsync(getFsImplementation(), key);
  return n.linksResolvedPath ?? n.resolvedPath;
}
//@ chunk-aat7wt0p.js:16206-17231 fingerprint = loadManagedFileSettings (0.344)
function pathTraversesUntrustedLink(
  t,
  n,
  e,
  r,
  { trustedStart: o = false, trustedRoot: i = t, eisdirIsFolder: s = false } = {},
) {
  let u = i.endsWith(sep) ? i : i + sep;
  let a = (d) => o && (d === i || d.startsWith(u));
  let l = t;
  if (!a(l) && isUntrustedLinkPathStrict(l, r)) return true;
  let A;
  for (let idx = 0; idx < n.length; idx++) {
    let I = n[idx];
    if (I === ".") continue;
    if (I === "..") {
      l = dirname(l);
      continue;
    }
    let S = join(l, I);
    if (!a(S) && isUntrustedLinkPathStrict(S, r)) return true;
    let code = captureSyncResult(() => lstatSync(S));
    if (code.value === undefined) {
      if (code.code !== "ENOENT" && code.code !== "ENOTDIR") return true;
      let m = S;
      for (let O of n.slice(idx + 1)) {
        m = O === ".." ? dirname(m) : O === "." ? m : join(m, O);
        if (!a(m) && isUntrustedLinkPathStrict(m, r)) return true;
      }
      return false;
    }
    let M;
    if (code.value.isSymbolicLink()) {
      if (e >= MAX_UNTRUSTED_PATH_DEPTH) return true;
      M = captureSyncResult(() => readlinkSync(S)).value;
      if (M === undefined) return true;
    } else {
      l = S;
      continue;
    }
    let replaced = M.replace(/^\/{2,}/, "/");
    if (
      !(o && isAbsolute(replaced) && !hasDotSegment(replaced) && a(replaced)) &&
      isUntrustedLinkPathStrict(replaced, r)
    )
      return true;
    let sliced = n.slice(idx + 1);
    if (alwaysFalse(replaced)) return true;
    if (isAbsolute(replaced)) {
      if (o && !hasDotSegment(replaced) && a(replaced))
        return pathTraversesUntrustedLink(
          i,
          [...splitPathSegments(replaced.slice(u.length)), ...sliced],
          e + 1,
          r,
          {
            trustedStart: true,
            trustedRoot: i,
            eisdirIsFolder: s,
          },
        );
      let root = parse(replaced).root;
      return pathTraversesUntrustedLink(
        root,
        [...splitPathSegments(replaced.slice(root.length)), ...sliced],
        e + 1,
        r,
        {
          eisdirIsFolder: s,
        },
      );
    }
    return pathTraversesUntrustedLink(l, [...splitPathSegments(replaced), ...sliced], e + 1, r, {
      trustedStart: a(l),
      trustedRoot: i,
      eisdirIsFolder: s,
    });
  }
  return false;
}
export {
  getSettingsForSource,
  updateSettingsForSource,
  parseSettingsFileUncached,
  getAutoModeConfig,
  TRUSTED_SETTING_SOURCES,
  getDurablePolicyTierSettings,
  isPolicySlotAdminOrParentComposed,
  REPO_SETTING_SOURCES,
  getAllPolicyTierSettings,
  getLegacyLocalSettingsOverlay,
  projectSettingsAliasesUserSettings,
  getAdminTierEnvValue,
  getMergedPolicySources,
  getArmedHelperOutput,
  getPolicySettingsOrigin,
  getShadowedManagedSources,
  getManagedFileSettingsPresence,
  managedLinkWarningLines,
  getInitialSettings_2,
  getPairedPolicyModelOverrides,
  isAdminPolicyOrigin,
  getMcpPolicyView,
  hasDisableClaudeAiConnectors,
  getMachineAdminPolicyTier,
  getSettingsForSourceTightenOnly,
  getSettingsFilePathForSource,
  getSettingsParseErrorsForSource,
  isForceRemoteSettingsRefreshConfigured,
  getEffectiveSettingSource_2,
  getSettingsForSourceForUpkeep,
  getBasePolicySettings,
  getBasePolicySettingsOrigin,
  getPolicyHelperSourceLoadErrors,
  MAX_SETTINGS_JSON_BYTES,
  getManagedSettingsKeysForLogging,
  getManagedSourcesInEffect,
  parseRemoteManagedSettings,
  getHostPolicyLoginPins,
  getMachineAdminDocumentTier,
  getSettings_DEPRECATED,
  isAdminPolicyUnreadable,
  adminPolicyLoadFailureRefusesLaunch,
  getFatalAdminPolicyLoadErrors,
  getLegacyLocalSettingsFilePath,
  getRuleAnchorRootForSource,
  getSecuritySensitiveSetting,
  updateSettingsForSourceWithTransform,
  surfaceManagedSettingsErrorsHeadless,
  getSettingsWithSources_2,
  getSettingsWithErrors_2,
  getSettingsAfterPluginLoad,
  getSecuritySensitiveSettingWithSources,
  getHostManagedModelPricing,
  getAskUserQuestionTimeout,
  hasIsolatePeerMachines,
  basePolicyNamesHelper,
  getPolicySettingsLoadErrors,
  getManagedFileLoadState,
  getPolicyEnvCompositionForLogging,
  getShadowedMcpPolicySources,
  getManagedFileProtectionForLogging,
  getMcpPolicyCompositionForLogging,
  getShadowedPolicyHelperSources,
  logManagedDocumentLinks,
  hasSkipDangerousModePermissionPrompt,
  getModelProposedGoalsSettingParsed,
  getModelProposedGoalsSetting,
  hasVouchedSkipDangerousModePermissionPrompt,
  rawSettingsKeyPresence,
  anyAdminPolicyTierGovernsRetention,
  parseSettingsFile,
  AUTO_MODE_TRUSTED_SOURCES,
  autoModeConfigSchema,
  builtinAllowRulesAreOff,
  filterFatalPolicyErrors,
  parentManagedTierParticipates,
  getMachineAdminCredentialInputs,
  getEveryMachineAdminTierSettings,
  isPermissionDeniedPolicyError,
  isMachineAdminDocumentUnreadable,
  hasSurvivingAdminPolicySource,
  getMachineAdminDocumentLoadErrors,
  getVouchedPolicyTierSettings,
  getUseAutoModeDuringPlan,
  isDisabledAboveWorkloadFiles,
  isAutoModeClassifyAllShellEnabled,
  getRemotePolicyTierWithKind,
  policySettingUnreadable,
  machineAdminMayPinSignInOrg,
  isRepoTierFreezeHeld,
  localSettingsStoreRootAwaitingOwnershipProbe,
  repoTierFileSlots,
  readRepoTierFileText,
  resolveSettingsWritePath,
  isRepoTierAnsweredByACopy,
  pathTraversesUntrustedLink,
  getDeniedModelsPolicyOverrides,
  getMachineAdminPolicyTiers,
  getRelativeSettingsFilePathForSource,
  getAdminAuthoredPolicySettings,
  getSettingsForSourceWriteSeed,
  settleBackgroundSettingsWork,
  getVouchedAdminPolicyTier,
  hasMachinePluginKeyLoadRecords,
  getHeldOffPluginIds,
  hasAdminPolicyLoadRecords,
  hasAutoModeOptIn,
  getLocalSettingsValidationErrors,
  settingsMergeCustomizer,
  getManagedSettingsFilePath,
  getPolicySettingsOrigin_2,
  drainSettingsWrites,
  withRepoTiersLive,
  getMachineAdminTierSettings,
  allowListEntriesThatVouch,
  runInSettingsWriteQueue,
  getParsedParentManagedSettings,
  parentTierWithOrganizationLocksHooks,
  getAdminPolicyTierSettings,
  flagInlineSettingDropped,
  isNotDisabledInTrustedSources,
  repoTierFolderKey,
  repoTierFileLeadsAway,
  repoTiersFrom,
  holdRepoTiers,
  compareRepoTiersWithHeld,
  lingerRepoTiers,
  getDialogExpiry,
  hasSkipWorkflowUsageWarning,
  machineAdminPinsSignInOrg,
  getHostManagedToolSearchEnv,
  flagAllowBesideManagedAllow,
  getMachineAdminPolicyEnv,
  isSettingsTierWithheld,
  readRepoDirSettingsFresh,
};
