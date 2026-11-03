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
import {
  resolve,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  join,
  join as join_2,
  join as join_3,
  basename,
  join as join_4,
  resolve as resolve_2,
  resolve as resolve_3,
  sep,
  isAbsolute,
  parse,
} from "path";
import { lstatSync, readlinkSync } from "fs";
import { HostScoped } from "../hostScoped.js";
import { LegacyLocalSettingsProbe, nio } from "./settingsSeed.js";
import {
  parseSettingsFile_3 as parseSettingsFile_2,
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
import { is, or } from "./commandSyncNames.js";
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
import { GD, warnDisklessSettingsWrite } from "./settingsStorage.js";
import { One, uIn } from "./managedPluginTiers.js";
import { startMdmPoll } from "./changeDetector.js";
import { br, wr, Lr, sOt, Kdt } from "./policyHelper/helperRemote.js";
import { Mne } from "./mdm/settings.js";
import {
  hasManagedSettingsCached,
  isStoredLoginPinned,
  Vso,
  zso,
  eOt,
} from "../../cli/headlessCloud/attachServe.js";
import { getRemoteManagedSettingsSyncFromCache } from "../../services/remoteManagedSettings/remoteSettingsCache.js";
import { isRemoteManagedSettingsVerified } from "../../services/remoteManagedSettings/remoteSettingsState.js";
import { isHttpMcpServeInvocation } from "../../entrypoints/mcpServeArgs.js";
import {
  getSettingsRootPathForSource as getSettingsRootPathForSource_2,
  localSettingsStoreRootBeforeOwnership,
  getSettingsFilePathForSource_3 as getSettingsFilePathForSource_2,
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
  kn,
} from "./policyTiers.js";
import {
  getLegacyLocalSettingsFilePath_3 as getLegacyLocalSettingsFilePath_2,
  getSettingsForSourceIfRead,
  getSettingsForSource_3 as getSettingsForSource_2,
  getPairedPolicyModelOverrides as getPairedPolicyModelOverrides_2,
  getDeniedModelsPolicyOverrides as getDeniedModelsPolicyOverrides_2,
  getHostManagedModelPricing as getHostManagedModelPricing_2,
  getHostManagedToolSearchEnv as getHostManagedToolSearchEnv_2,
  getAllPolicyTierSettings_3 as getAllPolicyTierSettings_2,
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
import { fj, m_r } from "./settingsSourceTrust.js";
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
import { SettingsCacheStore, m7t, CONFIG_DIR_UNSAFE_REASONS } from "../../bootstrap/stateSlices.js";
import { safeParseJSON } from "../json.js";
import { En } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { logError } from "../log.js";
import { isPlainObject, isPlainObject as isPlainObject_2 } from "../isPlainObject.js";
import { readFileSync, decodeTextBuffer, readFileChecked } from "../fileRead.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { STORAGE_SPACES } from "../storage/storageSpaces.js";
import { logForDebugging } from "../debug.js";
import { shouldAllowManagedMcpServersOnly } from "../../services/mcp/config.js";
import { getAllowedMcpServersFromTiers, describeLinkedPath } from "../../services/mcp/managedMcpPolicy.js";
import { profileCheckpoint } from "../startupProfiler.js";
import { firstLineOf, ql } from "../stringUtils.js";
import { SETTING_ALIASES, applySettingAliases } from "./marketplaceSettingsAliases.js";
import { AOn } from "./validation.js";
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
import { MANAGED_RESTRICTION_KEYS, JOe, restrictionValue } from "./managedRestrictionKeys.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, A, o } from "../../../vendor/zod/v4/classic/schemas.js";
import { DEFAULTS_PLACEHOLDER, replacesDefaults } from "../permissions/autoModeRulesPrompt.js";
import { Uo } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { getManagedFilePath } from "./managedPath.js";
import { logForDiagnosticsNoPII } from "../diagLogs.js";
import { WSL_MANAGED_SETTINGS_DIR } from "./mdm/wslRegistry.js";
import { J } from "./settingsReview.js";
import { P, Mt, alwaysFalse, x } from "../pathResolution.js";
import { E } from "../fsJunctions.js";
import { cl } from "../pathClassification.js";

//@ chunk-q8cqcff6.js:94076-94102 placement
var legacyLocalSettingsProbes = new HostScoped(() => new LegacyLocalSettingsProbe());
//@ chunk-q8cqcff6.js:94102-94143 placement
function parseSettingsFile(e, n, r) {
  return parseSettingsFile_2(e, is(), n, r);
}
/**
 * 构造读取设置所需的上下文：缓存存储、cwd、项目配置目录、允许的来源、无盘标记、父进程托管设置、flag 设置、cowork 插件、MDM/HKCU/helper 读取函数等，并挂上托管文件设置加载器。
 */
//@ chunk-q8cqcff6.js:94143-94887 placement
function buildSettingsContext() {
  let context = {
    store: is(),
    cwd: getOriginalCwdOrNull(),
    projectConfigDir: getProjectConfigRoot() ?? void 0,
    allowedSources: getAllowedSettingSources(),
    diskless: isDiskless(),
    onLegacyLocalSettingsRead: (n) => legacyLocalSettingsProbes.of(getRootSession().host).fire(n),
    parentManaged: getParentManagedSettings(),
    parentOrganizationSettings: getParentOrganizationSettings(),
    hostManagedProvider: env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST,
    flagInline: getFlagSettingsInline(),
    flagPath: getFlagSettingsPath(),
    flagExpectedContent: getFlagSettingsExpectedContent() ?? getFlagSettingsFilePinnedContent(),
    flagInlineJson: getFlagSettingsExpectedContent() !== void 0,
    coworkPlugins: getUseCoworkPlugins(),
    canonicalGitRoot: GD,
    mdm: () => One(),
    hkcu: () => startMdmPoll(),
    helper: () => br(),
    helperArmedFromRemote: () => wr(),
    helperMergesOutput: () => Lr(),
    helperWarnings: () => sOt(),
    wslInherits: () => Mne(),
    helperArmedFromUserWritableBase: () => Kdt(),
    credentialHelperKeysFrom: (n) => credentialHelperKeysFrom(n),
    launchFolderKeysFrom: (n) => launchFolderKeysFrom(n),
    asksOrganization: () => hasManagedSettingsCached(),
    policyOnlyServerTier: Vr,
  };
  return ((context.file = () => loadManagedFileSettings_2(context)), context);
}
//@ chunk-q8cqcff6.js:94887-95050 placement
function isSettingsTierWithheld(e) {
  if (!isStoredLoginPinned()) return !1;
  if (e !== "policySettings") return !0;
  let n = getPolicySettingsOrigin();
  return !(
    (isAdminPolicyOrigin(n) || n === "remote") &&
    One().userWritable !== !0 &&
    !Kdt() &&
    (getRemoteManagedSettingsSyncFromCache() === null || isRemoteManagedSettingsVerified())
  );
}
//@ chunk-q8cqcff6.js:95050-95282 placement
function credentialHelperKeysFrom(e) {
  if (isHttpMcpServeInvocation()) return "none";
  if (e === "policySettings" && Vr() !== void 0 && getPolicySettingsOrigin() === "remote")
    return "machine_admin";
  if (!isStoredLoginPinned()) return Vso(e) ? "none" : "as_read";
  if (e !== "policySettings") return "none";
  return isSettingsTierWithheld(e) ? "machine_admin" : "as_read";
}
//@ chunk-q8cqcff6.js:95282-95377 placement
function launchFolderKeysFrom(e) {
  if (!zso(e)) return "as_read";
  return e === "projectSettings" && projectSettingsAliasesUserSettings() ? "as_read" : "none";
}
//@ chunk-q8cqcff6.js:95377-95411 placement
function getSettingsRootPathForSource(e) {
  return getSettingsRootPathForSource_2(e, buildSettingsContext());
}
//@ chunk-q8cqcff6.js:95411-95535 placement
function localSettingsStoreRootAwaitingOwnershipProbe() {
  let e = buildSettingsContext();
  if (e.cwd === null) return;
  let n = localSettingsStoreRootBeforeOwnership(e.cwd, e.canonicalGitRoot);
  return n.decided === void 0 ? n.root : void 0;
}
//@ chunk-q8cqcff6.js:95535-95567 placement
function getSettingsFilePathForSource(e) {
  return getSettingsFilePathForSource_2(e, buildSettingsContext());
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
  return getLegacyLocalSettingsFilePath_2(buildSettingsContext());
}
//@ chunk-q8cqcff6.js:95664-95757 placement = supportsPersistence (0.797)
function projectSettingsAliasesUserSettings() {
  let e = getSettingsFilePathForSource("projectSettings"),
    n = getSettingsFilePathForSource("userSettings");
  return !!e && !!n && resolve(e) === resolve(n);
}
//@ chunk-q8cqcff6.js:95757-95833 placement = _temp8 (1)
function getLocalSettingsValidationErrors() {
  let e = getSettingsFilePathForSource("localSettings");
  if (!e) return [];
  return parseSettingsFile(e).errors;
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
  let e = is();
  if (e.policy.baseNamesHelper === void 0) {
    let n = getBasePolicySettings();
    e.policy.baseNamesHelper = n?.policyHelper != null || n?.policyHelpers != null;
  }
  return e.policy.baseNamesHelper;
}
//@ chunk-q8cqcff6.js:96072-96178 placement
function getManagedFileLoadState() {
  let e = is();
  return (
    (e.policy.managedFileLoadState ??= loadStateOf(loadManagedFileSettings())),
    e.policy.managedFileLoadState
  );
}
//@ chunk-q8cqcff6.js:96178-96209 placement
function getHeldOffPluginIds() {
  return heldOffPluginIds(buildSettingsContext());
}
//@ chunk-q8cqcff6.js:96209-96243 placement
function allowListEntriesThatVouch(e) {
  return allowListEntriesThatVouch_2(buildSettingsContext(), e);
}
//@ chunk-q8cqcff6.js:96243-96264 placement
function Vr() {
  return;
}
//@ chunk-q8cqcff6.js:96264-96295 placement
function getMachineAdminPolicyEnv() {
  return getMachineAdminPolicyEnv_2(buildSettingsContext());
}
//@ chunk-q8cqcff6.js:96295-96336 placement
function machinePolicyKeepsPriorityOver(e) {
  return uIn() || machinePolicyKeepsPriority(buildSettingsContext(), e);
}
/**
 * 取某来源的有效设置（来源未启用返回 null），带 perSource 缓存。
 */
//@ chunk-q8cqcff6.js:96336-96375 placement = getSettingsForSource (0)
function getSettingsForSource(source) {
  return isSettingSourceEnabled(source) ? getSettingsForSourceGuarded(source) : null;
}
//@ chunk-q8cqcff6.js:96375-96403 placement
function getSettingsForSourceTightenOnly(e) {
  return jr(e);
}
//@ chunk-q8cqcff6.js:96403-96431 placement
function getSettingsForSourceForUpkeep(e) {
  return jr(e);
}
//@ chunk-q8cqcff6.js:96431-96479 placement
function jr(e) {
  return getSettingsForSource(e) ?? (isSettingSourceEnabled(e) ? null : getSettingsForSourceGuarded(e));
}
//@ chunk-q8cqcff6.js:96479-96627 placement = _temp5 (1)
function getSettingsForSourceGuarded(a_0) {
  if (isWorkspaceRestricted() && REPO_DIR_SETTING_SOURCES.has(a_0)) return null;
  if ((a_0 === "userSettings" || REPO_DIR_SETTING_SOURCES.has(a_0)) && usesSessionAccessToken()) return null;
  let n = getSettingsForSourceIfRead(a_0, is());
  return n !== void 0 ? n : getSettingsForSource_2(a_0, buildSettingsContext());
}
//@ chunk-q8cqcff6.js:96627-96716 placement
function getPairedPolicyModelOverrides() {
  let pairedModelOverrides = is().policy.pairedModelOverrides;
  return pairedModelOverrides !== void 0
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
  let hostToolSearchEnv = is().policy.hostToolSearchEnv;
  if (hostToolSearchEnv !== void 0) return hostToolSearchEnv.value;
  return getHostManagedToolSearchEnv_2(buildSettingsContext());
}
//@ chunk-q8cqcff6.js:96874-96939 placement
function getSettingsForSourceWriteSeed(e) {
  return getSettingsForSourceUncached(e, buildSettingsContext(), { includeLegacyLocalSettings: !1 });
}
//@ chunk-q8cqcff6.js:96939-96952 placement
var BACKGROUND_SETTINGS_WORK_WAIT_MS = 5000;
//@ chunk-q8cqcff6.js:96952-97028 placement
function settleBackgroundSettingsWork(e = BACKGROUND_SETTINGS_WORK_WAIT_MS) {
  return withDeadline(is().backgroundWorkTail, e).then(() => {
    return;
  });
}
//@ chunk-q8cqcff6.js:97028-97055 placement
var repoDirSettingsParses = new HostScoped(() => new Map());
//@ chunk-q8cqcff6.js:97055-97796 placement
function readRepoDirSettingsFresh(e) {
  let n = buildSettingsContext(),
    filtered = [
      getSettingsFilePathForSource_2(e, n),
      ...(e === "localSettings" ? [getLegacyLocalSettingsFilePath_2(n)] : []),
    ].filter((T) => T !== void 0),
    of = repoDirSettingsParses.of(getRootSession().host),
    mapped = filtered.map((T) => ({ file: T, ...parseSettingsFileIfChanged(T, of, e === "userSettings") })),
    filtered_2 = mapped.filter(
      ({ settings: settings, errors: errors }) =>
        settings === null && errors.some((M) => M.severity !== "warning"),
    ),
    [h, y] = mapped.map(
      ({ file: file, settings: settings, textRead: textRead }) =>
        settings ?? (textRead === void 0 ? clone(of.get(file)?.parsed.settings ?? null) : null),
    ),
    P = y === null || y === void 0 ? (h ?? null) : fj({}, y, h ?? {}, settingsMergeCustomizer);
  if (filtered_2.length === 0) return { kind: "in_effect", settings: P };
  let flattened = filtered_2.flatMap(({ textRead: textRead }) => textRead ?? []);
  if (flattened.length === filtered_2.length)
    return { kind: "some_do_not_load", texts: flattened, settingsOfTheOtherFile: P };
  return filtered_2.every(({ file: file, textRead: textRead }) => textRead !== void 0 || of.has(file))
    ? { kind: "unreadable_for_now", settingsAsLastRead: P }
    : { kind: "unreadable", settingsOfTheOtherFile: P };
}
//@ chunk-q8cqcff6.js:97796-97803 placement
var He;
//@ chunk-q8cqcff6.js:97803-98000 placement
function settingsContextForRepoTier() {
  let e = buildSettingsContext(),
    n = He;
  if (n === void 0) return e;
  let canonicalGitRoot = e.canonicalGitRoot;
  return {
    ...e,
    cwd: n.cwd,
    projectConfigDir: n.projectConfigDir,
    canonicalGitRoot: (s) => (s === n.cwd ? n.canonicalRoot : (canonicalGitRoot?.(s) ?? null)),
  };
}
//@ chunk-q8cqcff6.js:98000-98399 placement
function repoTierFileLeadsAway(e) {
  let n = getFsImplementation();
  try {
    let linksResolvedPath = vetRepoSettingsPath(n, e, { failClosed: !0 }).linksResolvedPath;
    if (linksResolvedPath === void 0) {
      for (let h of [dirname(e), e])
        try {
          if (n.lstatSync(h).isSymbolicLink()) return !0;
        } catch (error) {
          if (!isENOENT(error)) return !0;
        }
      return readRepoTierFileText(e) !== "absent";
    }
    let s = vetRepoSettingsPath(n, dirname(dirname(e)), { failClosed: !0 }),
      S = join(s.linksResolvedPath ?? s.resolvedPath, basename(dirname(e)), basename(e));
    if (!samePath(linksResolvedPath, S)) return !0;
    let lstatSync = n.lstatSync(linksResolvedPath);
    return !lstatSync.isFile() || lstatSync.nlink > 1;
  } catch {
    return !0;
  }
}
/**
 * 判断路径（含解析链接后的真实路径，macOS 忽略大小写）是否就是用户设置文件之一。
 */
//@ chunk-q8cqcff6.js:98399-98751 placement
function isUserSettingsPath(e, n) {
  let r = getSettingsFilePathForSource_2("userSettings", n),
    s = [
      ...(r ? [r] : []),
      ...userSettingsHomes().flatMap((y) => Object.values(USER_SETTINGS_FILE_NAMES).map((P) => join(y, P))),
    ],
    S = getFsImplementation(),
    E = [resolve(e)];
  try {
    let y = vetRepoSettingsPath(S, e);
    E.push(y.linksResolvedPath ?? y.resolvedPath);
  } catch {}
  let h = getPlatform() === "macos";
  return s.some((y) =>
    [resolve(y), safeResolvePath(S, y).resolvedPath].some((P) =>
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
  let e = settingsContextForRepoTier(),
    n = getSettingsFilePathForSource_2("projectSettings", e),
    r = {
      project: n && !isUserSettingsPath(n, e) ? n : null,
      local: getSettingsFilePathForSource_2("localSettings", e) ?? null,
      legacy: getLegacyLocalSettingsFilePath_2(e) ?? null,
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
function readRepoTierFileText(e) {
  let n = new Map(),
    r = parseSettingsFileIfChanged(e, n),
    s = n.get(e);
  if (s !== void 0) return { text: s.content };
  return r.errors.some((error) => error.severity !== "warning") ? "unreadable" : "absent";
}
//@ chunk-q8cqcff6.js:99200-99629 placement
function readRepoTiersFresh(e = new Map()) {
  let n = new SettingsCacheStore();
  for (let [S, E] of e) n.parsedFiles.set(S, E);
  let r = { ...settingsContextForRepoTier(), store: n },
    s = new Map();
  for (let S of REPO_DIR_SETTING_SOURCE_LIST) {
    if (
      S === "projectSettings" &&
      (() => {
        let h = getSettingsFilePathForSource_2(S, r),
          y = getSettingsFilePathForSource_2("userSettings", r);
        return !!h && !!y && samePath(resolve(h), resolve(y));
      })()
    )
      continue;
    let E = S === "localSettings" ? getLegacyLocalSettingsFilePath_2(r) : void 0;
    s.set(S, {
      settings: getSettingsForSource_2(S, r),
      errors: getSettingsParseErrorsForSource_2(S, r),
      unfiltered: getSettingsForSourceUncached(S, r),
      ...(S === "localSettings" && {
        legacy: E === void 0 ? null : (parseSettingsFile_2(E, n).settings ?? null),
      }),
    });
  }
  return s;
}
//@ chunk-q8cqcff6.js:99629-99636 placement
var ot;
//@ chunk-q8cqcff6.js:99636-100184 placement
function holdRepoTiers(e) {
  let n = is(),
    r = !n.repoTierFreeze.isHeld(),
    s = buildSettingsContext();
  if (r)
    He = {
      cwd: s.cwd,
      projectConfigDir: s.projectConfigDir,
      canonicalRoot: s.cwd === null ? null : (s.canonicalGitRoot?.(s.cwd) ?? null),
    };
  let S;
  try {
    S =
      e === void 0
        ? n.repoTierFreeze.engage(readRepoTiersFresh)
        : n.repoTierFreeze.engage(
            () => readRepoTiersFresh(e.files),
            () => readRepoTiersFresh(),
          );
  } catch (error) {
    if (r) He = void 0;
    throw error;
  }
  if (r) ot = e?.onOwnWrite;
  try {
    n.invalidateAll();
  } catch (error) {
    if ((S.abandon(), !n.repoTierFreeze.isHeld())) ((He = void 0), (ot = void 0));
    throw error;
  }
  return {
    began: r,
    release: () => {
      let release = S.release();
      if (release.last) ((He = void 0), (ot = void 0), n.invalidateAll());
      return release;
    },
  };
}
//@ chunk-q8cqcff6.js:100184-100214 placement
function repoTiersFrom(e) {
  return readRepoTiersFresh(e);
}
//@ chunk-q8cqcff6.js:100214-100290 placement
function repoTierFolderKey() {
  let e = settingsContextForRepoTier();
  return `${e.cwd ?? ""}\x00${e.projectConfigDir ?? ""}`;
}
//@ chunk-q8cqcff6.js:100290-100402 placement
function lingerRepoTiers(e, n) {
  let r = is();
  if (r.repoTierFreeze.isHeld()) return;
  (r.repoTierFreeze.linger(e, n), r.invalidateAll());
}
//@ chunk-q8cqcff6.js:100402-100494 placement
function compareRepoTiersWithHeld() {
  return is().repoTierFreeze.differingTiers(readRepoTiersFresh()).length === 0 ? "same" : "changed";
}
//@ chunk-q8cqcff6.js:100494-101792 placement
function readLocalSettingsAliases(e) {
  let repoTierFreeze = is().repoTierFreeze,
    r =
      REPO_DIR_SETTING_SOURCES.has(e) && repoTierFreeze.isHeld() && repoTierFreeze.baselineTier(e) !== void 0,
    s = !1,
    S = new Map(),
    E = new Map(),
    h = (y) => {
      try {
        return safeResolvePath(getFsImplementation(), y).resolvedPath;
      } catch {
        return y;
      }
    };
  return {
    before: (y, P, O) => {
      let T = r ? repoTierFreeze.baselineTier(e) : void 0;
      if (T === void 0) return;
      let v = settingsContextForRepoTier(),
        M = e === "localSettings" ? getLegacyLocalSettingsFilePath_2(v) : void 0,
        x = M === void 0 ? void 0 : parseSettingsFile_2(M, new SettingsCacheStore());
      if (M !== void 0 && x !== void 0) (S.set(M, x), E.set(M, h(M)));
      let L = getSettingsFilePathForSource_2(e, v);
      if (L !== O) {
        s = !0;
        return;
      }
      let G = L === void 0 ? void 0 : parseSettingsFile_2(L, new SettingsCacheStore());
      if (L !== void 0 && G !== void 0) (S.set(L, G), E.set(L, h(L)));
      let q =
          y === null
            ? null
            : parseSettingsContent(jsonStringify(y), getSettingsFilePathForSource_2(e, v) ?? ""),
        K = q?.settings ?? null,
        U = x?.settings ? fj(clone(x.settings), K ?? {}, settingsMergeCustomizer) : K,
        j = [...(q?.errors ?? []), ...(x?.errors ?? [])],
        Z = (re) => {
          let ee = re && safeParseJSON(jsonStringify(re), !1);
          return typeof ee === "object" ? m7t(ee) : ee;
        },
        included = repoTierFreeze.differingTiers(readRepoTiersFresh(S)).includes(e),
        ie = (re) => re.filter((ee) => ee.file === M || ((P || ee.preserveOnWrite) && !("alias" in ee)));
      s =
        included ||
        !En(Z(U), Z(T.unfiltered)) ||
        !En(ie(j), ie(T.errors)) ||
        !En(Z(G?.settings ?? null), Z(K));
    },
    noteRead: ({ path: path, content: content }) => {
      let O = S.get(path),
        T = parseSettingsContent(content, path);
      if (r && (O === void 0 || !En(m7t(T.settings), m7t(O.settings)) || !En(T.errors, O.errors))) s = !0;
    },
    after: ({ path: path, content: content }) => {
      let O = parseSettingsContent(content, path),
        T = E.get(path);
      S.set(path, O);
      for (let v of S.keys()) if (v !== path && T !== void 0 && E.get(v) === T) S.set(v, O);
      if (r && !s && repoTierFreeze.isHeld()) {
        repoTierFreeze.rebaseline(readRepoTiersFresh(S), [e]);
        try {
          ot?.(path, content);
        } catch (error) {
          logError(toError(error));
        }
      }
    },
  };
}
//@ chunk-q8cqcff6.js:101792-101928 placement
function withRepoTiersLive(e) {
  let n = is();
  if (!n.repoTierFreeze.isHeld()) return e();
  try {
    return n.repoTierFreeze.whileLive(e);
  } finally {
    n.invalidateAll();
  }
}
//@ chunk-q8cqcff6.js:101928-101979 placement
function isRepoTierFreezeHeld() {
  return is().repoTierFreeze.isHeld();
}
//@ chunk-q8cqcff6.js:101979-102039 placement
function isRepoTierAnsweredByACopy(e) {
  return is().repoTierFreeze.tier(e) !== void 0;
}
//@ chunk-q8cqcff6.js:102039-102153 placement
function flagInlineConsentDropped() {
  let e = buildSettingsContext();
  if (!isPlainObject(e.flagInline)) return !1;
  if (!hasAttributionSettings(e.flagInline)) return !1;
  return parseInlineFlagSettings(e).settings === null;
}
//@ chunk-q8cqcff6.js:102153-102260 placement
function flagInlineSettingDropped(e) {
  let n = buildSettingsContext();
  if (!isPlainObject(n.flagInline) || !(e in n.flagInline)) return !1;
  return parseInlineFlagSettings(n).settings === null;
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
  return parseParentTierWithOrganization(buildSettingsContext())?.settings?.allowManagedHooksOnly === !0;
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
  if (!isPlainObject(e)) return !1;
  let attribution = e.attribution;
  return (
    "includeCoAuthoredBy" in e ||
    attribution === !1 ||
    (isPlainObject(attribution) &&
      ("commitTrailers" in attribution || "commit" in attribution || "pr" in attribution))
  );
}
//@ chunk-q8cqcff6.js:102666-102907 placement = getSettingsForSourceUncached (0.566)
function flagFileConsentDropped() {
  let remoteSettings = buildSettingsContext(),
    n = getSettingsFilePathForSource_2("flagSettings", remoteSettings);
  if (!n) return !1;
  if (parseSettingsFile_2(n, remoteSettings.store, remoteSettings.flagExpectedContent).settings !== null)
    return !1;
  if (remoteSettings.flagExpectedContent !== void 0) {
    let r = safeParseJSON(remoteSettings.flagExpectedContent, !1);
    if (!isPlainObject(r)) return !0;
    return hasAttributionSettings(r);
  }
  return fileMayDropConsent(n);
}
//@ chunk-q8cqcff6.js:102907-103087 placement
function fileMayDropConsent(e, n = !1) {
  if (isDiskless()) return !1;
  let r;
  try {
    let s =
      n || isInClaudeConfigHome(e)
        ? safeResolvePath(getFsImplementation(), e)
        : vetRepoSettingsPath(getFsImplementation(), e);
    r = safeParseJSON(readFileSync(s.resolvedPath, MAX_SETTINGS_JSON_BYTES), !1);
  } catch (error) {
    if (isENOENT(error)) return !1;
    return !0;
  }
  if (!isPlainObject(r)) return !0;
  return hasAttributionSettings(r);
}
//@ chunk-q8cqcff6.js:103087-103605 placement = getSettingsForSourceLenient_FOR_EDITING_ONLY_NOT_FOR_READING (0.192)
function getRawSettingFromRejectedSource(e, n) {
  let r = buildSettingsContext(),
    s = (y) => y.settings === null && y.errors.some((error) => error.severity !== "warning");
  if (e === "flagSettings" && r.flagInline && n in r.flagInline) {
    let filePath = parseInlineFlagSettings(r);
    if (s(filePath)) return r.flagInline[n];
    if (filePath.settings?.[n] !== void 0) return;
  }
  let S = getSettingsFilePathForSource_2(e, r);
  if (!S) return;
  let E = e === "flagSettings" ? r.flagExpectedContent : void 0;
  if (!s(parseSettingsFile_2(S, r.store, E))) return;
  if (E === void 0 && r.diskless) return;
  let h;
  try {
    if (E !== void 0) h = safeParseJSON(E, !1);
    else {
      let { resolvedPath: resolvedPath } = safeResolvePath(getFsImplementation(), S);
      h = safeParseJSON(readFileSync(resolvedPath, MAX_SETTINGS_JSON_BYTES), !1);
    }
  } catch {
    return;
  }
  if (!isPlainObject(h) || !(n in h)) return;
  return h[n];
}
//@ chunk-q8cqcff6.js:103605-103931 placement
async function sourceFileConsentDropped(e, n) {
  let r = buildSettingsContext(),
    s = getSettingsFilePathForSource_2(e, r);
  if (!s) return !1;
  let S = parseSettingsFile_2(s, r.store);
  if (S.settings !== null) return !1;
  if (S.errors.length === 0) return !1;
  if (isStorageV5Enabled() && n !== void 0 && ct(e, s)) {
    let E;
    try {
      E = await readStoredUserSettings(n);
    } catch {
      return !0;
    }
    switch (E.kind) {
      case "absent":
        return !1;
      case "object":
        return hasAttributionSettings(E.raw);
      default:
        return !0;
    }
  }
  return fileMayDropConsent(s, e === "userSettings");
}
//@ chunk-q8cqcff6.js:103931-103994 placement = _temp5 (1)
function ct(e, n) {
  return e === "userSettings" && basename(n) === USER_SETTINGS_FILE_NAMES.default;
}
/**
 * 从存储后端读取用户设置：区分不可读、不存在、过大、空、非对象与正常对象（附原始内容）。
 */
//@ chunk-q8cqcff6.js:103994-104349 placement
async function readStoredUserSettings(e) {
  let read = await e.read([STORAGE_SPACES.userSettings()]);
  if (!read.ok) return { kind: "unreadable", code: read.error.code };
  let r = read.value.items[0];
  if (!r.found) return { kind: "absent" };
  if (r.totalBytes > MAX_SETTINGS_JSON_BYTES) return { kind: "oversize" };
  let s = decodeTextBuffer(r.value);
  if (!s.trim()) return { kind: "empty" };
  let S = safeParseJSON(s, !1);
  if (!isPlainObject(S)) return { kind: "non-object" };
  return { kind: "object", raw: S, content: s };
}
//@ chunk-q8cqcff6.js:104349-104493 placement
function legacyLocalConsentDropped() {
  let e = buildSettingsContext(),
    n = getLegacyLocalSettingsFilePath_2(e);
  if (!n) return !1;
  let r = parseSettingsFile_2(n, e.store);
  if (r.settings !== null) return !1;
  if (r.errors.length === 0) return !1;
  return fileMayDropConsent(n);
}
//@ chunk-q8cqcff6.js:104493-104670 placement
function getLegacyLocalSettingsOverlay() {
  let e = buildSettingsContext(),
    tier = e.store.repoTierFreeze.tier("localSettings");
  if (tier?.legacy !== void 0) return tier.legacy;
  let r = getLegacyLocalSettingsFilePath_2(e);
  if (!r) return null;
  return parseSettingsFile_2(r, e.store).settings ?? null;
}
//@ chunk-q8cqcff6.js:104670-104722 placement
function getAllPolicyTierSettings() {
  return is().policy.allTiers ?? getAllPolicyTierSettings_2(buildSettingsContext());
}
//@ chunk-q8cqcff6.js:104722-104961 placement
function machineAdminMayPinSignInOrg() {
  try {
    if (uIn()) return !0;
    let e = is();
    return (
      (e.policy.machineMayPinSignInOrg ??= machineAdminMayPinSignInOrg_2(buildSettingsContext())),
      e.policy.machineMayPinSignInOrg
    );
  } catch (error) {
    return (
      logForDebugging(`machineAdminMayPinSignInOrg: the machine policy read threw: ${errorMessage(error)}`, {
        level: "error",
      }),
      !0
    );
  }
}
//@ chunk-q8cqcff6.js:104961-105127 placement
function machineAdminPinsSignInOrg() {
  try {
    return getMachineAdminPolicyTier()?.forceLoginOrgUUID !== void 0;
  } catch (error) {
    return (
      logForDebugging(`machineAdminPinsSignInOrg: the machine policy read threw: ${errorMessage(error)}`, {
        level: "error",
      }),
      !1
    );
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
  return getMachineAdminPolicyTier_2({ ...buildSettingsContext(), helper: void 0 });
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
  let adminTierEnvView = is().policy.adminTierEnvView;
  if (adminTierEnvView !== void 0) return adminTierEnvView[e];
  return getAdminTierEnvValue_2(buildSettingsContext(), e);
}
//@ chunk-q8cqcff6.js:105522-105574 placement
function getPolicyEnvCompositionForLogging() {
  return is().lastPolicyEnvComposition;
}
//@ chunk-q8cqcff6.js:105574-105631 placement
function getDurablePolicyTierSettings() {
  return is().policy.durableTiers ?? getDurablePolicyTierSettings_2(buildSettingsContext());
}
//@ chunk-q8cqcff6.js:105631-105686 placement
function getAdminPolicyTierSettings() {
  return is().policy.adminTiers ?? getAdminPolicyTierSettings_2(buildSettingsContext());
}
//@ chunk-q8cqcff6.js:105686-105717 placement
function getAdminAuthoredPolicySettings() {
  return getAdminAuthoredPolicySettings_2(buildSettingsContext());
}
/**
 * getMcpAllowlistSettings：{slot: policySettings, adminTiers}。
 */
//@ chunk-q8cqcff6.js:105717-105783 placement = getMcpAllowlistSettings (0.55)
function getMcpPolicyView() {
  return { slot: getSettingsForSource("policySettings"), adminTiers: getAdminPolicyTierSettings() };
}
//@ chunk-q8cqcff6.js:105783-105814 placement
function getShadowedMcpPolicySources() {
  return getShadowedMcpPolicySources_2(buildSettingsContext());
}
//@ chunk-q8cqcff6.js:105814-106097 placement
function getMcpPolicyCompositionForLogging(e) {
  let n = getMcpPolicyView(),
    r = shouldAllowManagedMcpServersOnly(n);
  return {
    mcpLockFromLowerSource: r && n.slot?.allowManagedMcpServersOnly !== !0,
    mcpAllowlistFromLowerSource:
      r && n.slot?.allowedMcpServers === void 0 && getAllowedMcpServersFromTiers(n) !== void 0,
    mcpShadowedSourceCount: e.length,
    mcpShadowedKeyCount: e.reduce((s, { keys: keys }) => s + keys.length, 0),
  };
}
/**
 * 合并后的设置（getSettingsWithErrors().settings 或 {}），旧版 getInitialSettings。
 */
//@ chunk-q8cqcff6.js:106097-106136 placement = getInitialSettings (1)
function getInitialSettings_2() {
  return getSettingsWithErrors_2().settings || {};
}
//@ chunk-q8cqcff6.js:106136-106146 placement = getSettings_DEPRECATED (0)
var getSettings_DEPRECATED = getInitialSettings_2;
/**
 * 清缓存后返回合并结果与每个非空来源的设置，供 /status、doctor 展示。
 */
//@ chunk-q8cqcff6.js:106146-106299 placement = getSettingsWithSources (1)
function getSettingsWithSources_2() {
  or();
  let sources = [];
  for (let source of getEnabledSettingSources_2()) {
    let settings = getSettingsForSource(source);
    if (settings && Object.keys(settings).length > 0) sources.push({ source: source, settings: settings });
  }
  return { effective: getInitialSettings_2(), sources: sources };
}
/**
 * 从优先级最高的来源往下找第一个定义了某键的来源，用于提示该值来自哪里。
 */
//@ chunk-q8cqcff6.js:106299-106411 placement
function getEffectiveSettingSource_2(e) {
  let n = getEnabledSettingSources_2();
  for (let r = n.length - 1; r >= 0; r--) {
    let s = n[r];
    if (getSettingsForSource(s)?.[e] !== void 0) return s;
  }
  return null;
}
/**
 * 返回合并后的设置与全部错误，首次调用时 loadSettingsFromDisk 并缓存（启动剖析点 loadSettingsFromDisk_start/end）。
 */
//@ chunk-q8cqcff6.js:106411-106583 placement = getSettingsWithErrors (0.574)
function getSettingsWithErrors_2() {
  let cached = is(),
    mergedSettings = cached.mergedSettings;
  if (mergedSettings !== null) return mergedSettings;
  profileCheckpoint("loadSettingsFromDisk_start");
  let r = loadSettingsFromDisk(buildSettingsContext());
  return (profileCheckpoint("loadSettingsFromDisk_end"), (cached.mergedSettings = r), r);
}
/**
 * 检查托管目录中 managed-settings.json 与 managed-settings.d/*.json 是否有内容，供 /status 显示 file / drop-ins。
 */
//@ chunk-q8cqcff6.js:106583-107046 placement = getManagedFileSettingsPresence (0.548)
function getManagedFileSettingsPresence() {
  if (isDiskless()) return { hasBase: !1, hasDropIns: !1 };
  for (let e of managedFileSettingsDirs(Mne())) {
    let n = isPolicyTier(parseSettingsFile(join(e, "managed-settings.json"), void 0, !0)),
      r = !1;
    try {
      let s = join(e, "managed-settings.d"),
        S = (h) => isPolicyTier(parseSettingsFile(join(s, h), void 0, !0)),
        primedFolderListing = is().primedFolderListing(s);
      if (primedFolderListing !== void 0) r = primedFolderListing.some(S);
      else
        r = getFsImplementation()
          .readdirSync(s)
          .some((h) => {
            if (!(h.isFile() || h.isSymbolicLink()) || !isManagedSettingsDropInName(h.name)) return !1;
            return S(h.name);
          });
    } catch {}
    if (n || r) return { hasBase: n, hasDropIns: r };
  }
  return { hasBase: !1, hasDropIns: !1 };
}
//@ chunk-q8cqcff6.js:107046-107335 placement
function getBasePolicySettings() {
  let e = { ...buildSettingsContext(), helper: void 0 },
    { present: present, heldEmpty: heldEmpty } = resolvePolicySettings(e);
  if (heldEmpty) return {};
  if (present.remote) return parseRemoteManagedSettings_2(e).settings;
  if (present.mdm) return One().settings;
  if (present.file) return loadManagedFileSettings().settings;
  let { settings: settings } = parseParentManagedSettings(e);
  if (settings) return settings;
  let S = startMdmPoll();
  return Object.keys(S.settings).length > 0 ? S.settings : null;
}
//@ chunk-q8cqcff6.js:107335-107410 placement
function getBasePolicySettingsOrigin() {
  let e = getPolicySettingsOrigin_2_2({ ...buildSettingsContext(), helper: void 0 });
  return e === "helper" ? null : e;
}
//@ chunk-q8cqcff6.js:107410-107441 placement
function isForceRemoteSettingsRefreshConfigured() {
  return isForceRemoteSettingsRefreshConfigured_2(buildSettingsContext());
}
//@ chunk-q8cqcff6.js:107441-107563 placement
function getPolicySettingsOrigin() {
  let e = is(),
    origin = e.policy.origin;
  if (origin !== void 0) return origin.value;
  let r = getPolicySettingsOrigin_2_2(buildSettingsContext());
  return ((e.policy.origin = { value: r }), r);
}
//@ chunk-q8cqcff6.js:107563-107746 placement
function getVouchedPolicyTierSettings() {
  let e = is(),
    n = isRemoteManagedSettingsVerified(),
    vouchedTiers = e.policy.vouchedTiers;
  if (vouchedTiers !== void 0 && vouchedTiers.remoteVerified === n) return vouchedTiers.value;
  let s = getVouchedPolicyTierSettings_2(buildSettingsContext(), n);
  return ((e.policy.vouchedTiers = { remoteVerified: n, value: s }), s);
}
//@ chunk-q8cqcff6.js:107746-107937 placement
function getVouchedAdminPolicyTier() {
  let e = is(),
    n = isRemoteManagedSettingsVerified(),
    vouchedAdminTier = e.policy.vouchedAdminTier;
  if (vouchedAdminTier !== void 0 && vouchedAdminTier.remoteVerified === n) return vouchedAdminTier.value;
  let s = getVouchedAdminPolicyTier_2(buildSettingsContext(), n);
  return ((e.policy.vouchedAdminTier = { remoteVerified: n, value: s }), s);
}
//@ chunk-q8cqcff6.js:107937-108074 placement
function getHostPolicyLoginPins() {
  let e = is(),
    hostLoginPins = e.policy.hostLoginPins;
  if (hostLoginPins !== void 0) return hostLoginPins.value;
  let r = getHostPolicyLoginPins_2(buildSettingsContext());
  return ((e.policy.hostLoginPins = { value: r }), r);
}
//@ chunk-q8cqcff6.js:108074-108451 placement
function getMachineAdminCredentialInputs() {
  if (uIn()) return { envs: [], apiKeyHelper: !1, unread: !0 };
  let e = is(),
    machineCredentialInputs = e.policy.machineCredentialInputs;
  if (machineCredentialInputs !== void 0) return machineCredentialInputs;
  let r = buildSettingsContext(),
    s = loadManagedFileSettings_2(r);
  r.file = () => s;
  let S = getMachineAdminPolicyTiers_2(r),
    E = {
      envs: S.flatMap((h) => Object.entries(h.env ?? {}).map(([y, P]) => ({ [y.toUpperCase()]: P }))),
      apiKeyHelper: S.some((h) => h.apiKeyHelper !== void 0),
      unread: isMachineAdminSourceUnread(r),
    };
  return ((e.policy.machineCredentialInputs = E), E);
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
  let e = is(),
    slotAdminOrParentComposed = e.policy.slotAdminOrParentComposed;
  if (slotAdminOrParentComposed !== void 0) return slotAdminOrParentComposed;
  let r = isPolicySlotAdminOrParentComposed_2(buildSettingsContext());
  return ((e.policy.slotAdminOrParentComposed = r), r);
}
//@ chunk-q8cqcff6.js:108660-108885 placement
function anyAdminPolicyTierGovernsRetention() {
  let e = is(),
    adminRetentionGoverned = e.policy.adminRetentionGoverned;
  if (adminRetentionGoverned !== void 0) return adminRetentionGoverned;
  let any = [
    parseRemoteManagedSettings_2(buildSettingsContext()).settings,
    One().settings,
    loadManagedFileSettings_2(buildSettingsContext()).settings,
  ].some((S) => S?.cleanupPeriodDays !== void 0);
  return ((e.policy.adminRetentionGoverned = any), any);
}
//@ chunk-q8cqcff6.js:108885-109112 placement
function getPolicySettingsLoadErrors() {
  let e = is(),
    loadErrors = e.policy.loadErrors;
  if (loadErrors !== void 0) return loadErrors;
  let r = [];
  return (
    r.push(...parseRemoteManagedSettings_2(buildSettingsContext()).errors),
    r.push(...Jr()),
    r.push(...loadManagedFileSettings().errors),
    r.push(...parseParentManagedSettings(buildSettingsContext()).errors),
    r.push(...startMdmPoll().errors),
    (e.policy.loadErrors = r),
    r
  );
}
//@ chunk-q8cqcff6.js:109112-109160 placement
function Jr() {
  return mdmPolicyErrors(
    One(),
    () => parseRemoteManagedSettings_2(buildSettingsContext()),
    loadManagedFileSettings,
  );
}
//@ chunk-q8cqcff6.js:109160-109214 placement
function getPolicyHelperSourceLoadErrors() {
  return [...One().errors, ...loadManagedFileSettings().errors];
}
//@ chunk-q8cqcff6.js:109214-109367 placement
function policySettingUnreadable(e) {
  return getPolicySettingsLoadErrors().some((n) => {
    if (n.userWritable || n.wslIgnored || n.file === PARENT_MANAGED_SETTINGS_SOURCE_LABEL) return !1;
    if (n.path === "") return !0;
    return n.path === e && !n.statusOnly;
  });
}
//@ chunk-q8cqcff6.js:109367-109553 placement
function getAdminLoadErrors() {
  let e = is(),
    adminLoadErrors = e.policy.adminLoadErrors;
  if (adminLoadErrors !== void 0) return adminLoadErrors;
  let r = [];
  return (
    r.push(...parseRemoteManagedSettings_2(buildSettingsContext()).errors),
    r.push(...Jr()),
    r.push(...loadManagedFileSettings().errors),
    (e.policy.adminLoadErrors = r),
    r
  );
}
//@ chunk-q8cqcff6.js:109553-109630 placement
function hasAdminPolicyLoadRecords() {
  return getAdminLoadErrors().some((e) => e.userWritable !== !0 && e.wslIgnored !== !0);
}
//@ chunk-q8cqcff6.js:109630-109890 placement
function hasMachinePluginKeyLoadRecords() {
  let e = is(),
    machinePluginKeyLoadRecords = e.policy.machinePluginKeyLoadRecords;
  if (machinePluginKeyLoadRecords !== void 0) return machinePluginKeyLoadRecords;
  let any = getPolicyHelperSourceLoadErrors().some(
    (s) =>
      s.userWritable !== !0 &&
      s.wslIgnored !== !0 &&
      (s.severity !== "warning" ||
        MACHINE_PLUGIN_KEY_PATHS.includes(firstLineOf(firstLineOf(s.path, "."), "["))),
  );
  return ((e.policy.machinePluginKeyLoadRecords = any), any);
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
  let e = is(),
    adminSurvivor = e.policy.adminSurvivor;
  if (adminSurvivor !== void 0) return adminSurvivor;
  let r = buildSettingsContext(),
    s = armedHelperOutput(r),
    S = One(),
    E =
      (s.composes === "tier" && !Kdt() && !S.userWritable) ||
      authoredPolicyContent(parseRemoteManagedSettings_2(r)) ||
      (!S.userWritable && authoredPolicyContent(S));
  if (!E) {
    let h = loadManagedFileSettings();
    E = h.heldOnly !== !0 && authoredPolicyContent(h);
  }
  return ((e.policy.adminSurvivor = E), E);
}
//@ chunk-q8cqcff6.js:110415-110459 placement
function isAdminPolicyUnreadable() {
  return !hasSurvivingAdminPolicySource() && getFatalAdminPolicyLoadErrors().length > 0;
}
//@ chunk-q8cqcff6.js:110459-110494 placement
var Gs = new Set(["EACCES", "EPERM"]);
//@ chunk-q8cqcff6.js:110494-110580 placement
function isPermissionDeniedPolicyError(e) {
  return e.errorClass === "unreadable" && e.errno !== void 0 && Gs.has(e.errno);
}
//@ chunk-q8cqcff6.js:110580-110633 placement
function adminPolicyLoadFailureRefusesLaunch() {
  return (
    !hasSurvivingAdminPolicySource() &&
    getFatalAdminPolicyLoadErrors().some((e) => !isPermissionDeniedPolicyError(e))
  );
}
//@ chunk-q8cqcff6.js:110633-110722 placement = _temp7 (1)
function Ws() {
  try {
    let e = getSettingsForSource("policySettings");
    return [...deniedModelsEntryWarnings(e), ...availableModelsExactEntryWarnings(e)];
  } catch {
    return [];
  }
}
//@ chunk-q8cqcff6.js:110722-111545 placement
function surfaceManagedSettingsErrorsHeadless() {
  let e = getPolicySettingsLoadErrors(),
    n = [...sOt().filter((E) => !isInertManagedMcpServersNotice(E.path)), ...Ws()];
  if (e.length === 0 && n.length === 0) return;
  let any = e.some((E) => E.severity !== "warning"),
    any_2 = e.some(AOn),
    S = [];
  if (e.length > 0) {
    let E = any_2
      ? "Managed settings failed to load; policies from the failed source are NOT in effect:"
      : any
        ? "Managed settings contain invalid entries, including PreToolUse/PermissionRequest hooks that are NOT loaded; fix or remove each entry:"
        : "Managed settings contain invalid entries (remaining valid policies are still enforced):";
    S.push(`${E}
${e.map(formatManagedSettingsError).join(`
`)}`);
  }
  if (n.length > 0)
    S.push(`Managed settings notices:
${n.map(formatManagedSettingsError).join(`
`)}`);
  if (
    (process.stderr.write(`${S.join(`
`)}
`),
    e.length === 0)
  )
    return;
  logEvent("tengu_managed_settings_validation_errors", {
    error_count: e.length,
    remote_error_count: count(e, (E) => E.file === "remote managed settings"),
    fatal: any,
  });
}
//@ chunk-q8cqcff6.js:111545-111642 placement
function Zr() {
  return (
    getPolicySettingsLoadErrors(),
    [...is().managedDocumentLinks.all(), ...(One().managedDocumentLinks ?? [])]
  );
}
//@ chunk-q8cqcff6.js:111642-111721 placement
function managedLinkWarningLines() {
  return Zr().flatMap((e) => {
    let n = describeLinkedPath(e);
    return n === null ? [] : [n];
  });
}
//@ chunk-q8cqcff6.js:111721-111781 placement
function Ks() {
  return (getPolicySettingsLoadErrors(), is().managedFileProtections.all());
}
//@ chunk-q8cqcff6.js:111781-111949 placement
function getManagedFileProtectionForLogging() {
  let e = new Set(Ks().map(([, r]) => r)),
    found = CONFIG_DIR_UNSAFE_REASONS.find((r) => e.has(r));
  if (found === void 0) return;
  return { protection: found, setsOrgPin: is().managedFileProtections.setsOrgPin };
}
//@ chunk-q8cqcff6.js:111949-112335 placement
function logManagedDocumentLinks() {
  let e = Zr();
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
  return `  ${e.file === void 0 ? "managed settings" : ql(e.file)}${e.path ? ` (${e.path})` : ""}: ${e.message}`;
}
/**
 * 写入可编辑来源（user/project/local）：读取原始文件（校验失败时保留原文以免丢失未知键），用 mergeWith 合并（undefined 表示删除键、数组整体替换），以原子写落盘（user 允许符号链接，project/local 检查父目录），写 local 时异步把 .claude/settings.local.json 加入全局 gitignore，最后刷新缓存并通知变更。storage v5 后端时写入存储记录。
 */
//@ chunk-q8cqcff6.js:112450-112494 placement
function updateSettingsForSource(e, n, r, s) {
  return updateSettingsForSourceWithTransform(e, () => n, r, s);
}
//@ chunk-q8cqcff6.js:112494-112706 placement = getEnabledSettingSources (0.888)
function updateSettingsForSourceWithTransform(e, n, r, s) {
  if (e === "policySettings" || e === "flagSettings") return Promise.resolve({ error: null });
  let S = getSettingsFilePathForSource(e);
  if (!S)
    return Promise.resolve(
      getOriginalCwdOrNull() === null
        ? { error: new NoProjectDirectoryError() }
        : refuseDisklessSettingsWrite(e),
    );
  return settingsWriteQueue.run(S, () => updateSettingsForSource_2(e, n, S, r, s));
}
//@ chunk-q8cqcff6.js:112706-112718 placement
var settingsWriteQueue = createKeyedQueue();
//@ chunk-q8cqcff6.js:112718-112819 placement
function refuseDisklessSettingsWrite(e) {
  return (
    warnDisklessSettingsWrite("settings", e),
    { error: Error("This session does not write settings to disk") }
  );
}
//@ chunk-q8cqcff6.js:112819-112900 placement
function runInSettingsWriteQueue(e, n) {
  return settingsWriteQueue.run(e, async () => {
    try {
      return await n();
    } finally {
      or();
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
    if (!(error instanceof SymlinkWriteRefusedError) || !(await Bs(e))) throw error;
    (logForDebugging(`Writing settings through symlinked path ${e}`),
      await writeFileAtomic(e, n, { ...r, allowSymlink: !0, checkParentDir: !1 }));
  }
}
//@ chunk-q8cqcff6.js:113146-113176 layout
async function Bs(e) {
  return !1;
}
//@ chunk-q8cqcff6.js:113176-113230 layout
function sanitizeRawSettingsForWrite(e, n) {
  let r = clone(e);
  return (applySettingAliases(r, n), coerceStringListSettings(r), r);
}
//@ chunk-q8cqcff6.js:113230-113295 layout
class SettingsWriteRefusedError extends Error {
  why;
  constructor(e, n) {
    super(n);
    this.why = e;
  }
}
//@ chunk-q8cqcff6.js:113295-113909 layout
function decodeStoredSettingsRecord(e, n) {
  switch (e.kind) {
    case "object": {
      let r = parseSettingsContent(e.content, n),
        s = r.settings === null || r.errors.some((error) => error.preserveOnWrite);
      return { settings: s ? sanitizeRawSettingsForWrite(e.raw, n) : r.settings, raw: s };
    }
    case "absent":
      return { settings: null, raw: !1 };
    case "empty":
      return { settings: {}, raw: !1 };
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
async function updateSettingsForSource_2(e, n, r, s, S) {
  let E = isStorageV5Enabled() && S !== void 0 && ct(e, r);
  if (isDiskless() && !E) return refuseDisklessSettingsWrite(r);
  let h = s?.legacyRevocation === "skip",
    y = null,
    P;
  using O = { [Symbol.dispose]: () => P?.() };
  let T = E && isDiskless() ? S : void 0;
  try {
    let filePath = readLocalSettingsAliases(e),
      M = !1,
      x = T
        ? null
        : getSettingsForSourceUncached(e, buildSettingsContext(), { includeLegacyLocalSettings: !1 }),
      L =
        x !== null &&
        parseSettingsFile_2(r, buildSettingsContext().store).errors.some((error) => error.preserveOnWrite);
    if (L) x = null;
    if (!x && !T) {
      let content = null;
      try {
        let j =
          e === "userSettings" || isInClaudeConfigHome(r)
            ? safeResolvePath(getFsImplementation(), r)
            : await vetRepoSettingsPathAsync(getFsImplementation(), r);
        content = (await readFileChecked(j.resolvedPath, MAX_SETTINGS_JSON_BYTES)).content;
      } catch (error) {
        if (!isENOENT(error)) throw error;
      }
      if (content !== null && content.trim() !== "") {
        let j = safeParseJSON(content, !1);
        if (j === null)
          return (
            logForDebugging(`updateSettingsForSource: invalid JSON in settings file at ${r}`, {
              level: "error",
            }),
            { error: Error(`Invalid JSON syntax in settings file at ${r}`) }
          );
        if (j && typeof j === "object")
          ((x = sanitizeRawSettingsForWrite(j, r)),
            (M = !0),
            logForDebugging(
              L
                ? `Using raw settings from ${r} so entries this build does not recognize survive the write`
                : `Using raw settings from ${r} due to validation failure`,
            ));
      }
    }
    if (T) {
      let U = decodeStoredSettingsRecord(await readStoredUserSettings(T), r);
      ((x = U.settings), (M = U.raw));
    }
    filePath.before(x ?? null, M, r);
    let rawData = n(x ?? null);
    if (rawData === null) {
      if (e === "localSettings" && !h) {
        let U = await revokeFromLegacyLocalSettings(n, filePath);
        if (U.error) return { error: U.error };
        if (U.changed) {
          if (isStorageV5Enabled() && S !== void 0) P = await mirrorUserSettingsWrite(S, r);
          try {
            getSettingsWithErrors_2();
          } catch (error) {
            logError(error);
          }
          emitSettingsChanged(e);
        }
      }
      return { error: null };
    }
    if (!isDiskless()) await getFsImplementation().mkdir(dirname(r));
    let updatedSettings = fj(x || {}, rawData, (U, srcValue, key, object) => {
        if (srcValue === void 0 && object && typeof key === "string") {
          delete object[key];
          return;
        }
        if (Array.isArray(srcValue)) return srcValue;
        if (key === "extraKnownMarketplaces" && isPlainObject(U) && isPlainObject(srcValue))
          return mergeExtraKnownMarketplacesByEntry(U, srcValue);
        return;
      }),
      K =
        jsonStringify(updatedSettings, null, 2) +
        `
`;
    if (T && Buffer.byteLength(K) > MAX_SETTINGS_JSON_BYTES)
      throw new SettingsWriteRefusedError(
        "result_oversize",
        "Your saved settings would be too large after this change, so the change was not saved",
      );
    if ((eOt(r), E)) {
      let write = await S.write(STORAGE_SPACES.userSettings(), K, { publishDiscipline: "followAtomic" });
      if (!write.ok)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `settings storageV5 write failed: ${write.error.code}${"failureClass" in write.error ? ` (${write.error.failureClass})` : ""}`,
          "settings storageV5 write failed",
        );
    } else {
      let U = isPathConfigDir(dirname(r));
      await writeSettingsFileAtomic(r, K, {
        encoding: "utf-8",
        allowSymlink: e === "userSettings" || U,
        checkParentDir: (e === "projectSettings" || e === "localSettings") && !U,
        stagingDir: join(dirname(r), ATOMIC_WRITE_DIRNAME),
      });
    }
    if ((filePath.after({ path: r, content: K }), or(), E)) P = seedWrittenUserSettings(r, K);
    if (e === "localSettings" && !h) {
      let U = await revokeFromLegacyLocalSettings(n, filePath);
      if (U.error && U.phase !== void 0 && !hasArrayOrUndefined(rawData))
        logForDebugging(
          `localSettings: legacy settings.local.json could not be evaluated (${U.phase} failure) but this write contains no removals \u2014 canonical write succeeded, ignoring: ${U.error.message}`,
          { level: "warn" },
        );
      else y = U.error;
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
          }),
        j = is();
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
    if (error instanceof SettingsWriteRefusedError)
      return (
        logForDebugging(`updateSettingsForSource: refused (${error.why}): ${error.message}`, {
          level: "error",
        }),
        { error: error }
      );
    let M = Error(`Failed to read raw settings from ${r}: ${error}`, { cause: error });
    return (logForDebugging(M.message, { level: "error" }), { error: M });
  }
  if (isStorageV5Enabled() && S !== void 0 && !E) P = await mirrorUserSettingsWrite(S, r);
  try {
    getSettingsWithErrors_2();
  } catch (error) {
    logError(error);
  }
  return (emitSettingsChanged(e), { error: y });
}
//@ chunk-q8cqcff6.js:117127-117247 layout = _temp5 (1)
async function mirrorUserSettingsWrite(e, n) {
  let r = getSettingsFilePathForSource("userSettings");
  if (r === void 0 || r === n || !ct("userSettings", r)) return;
  return nio(e, is(), r);
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
  let s = is();
  return (s.seedParsedFile(e, "userSettings", r, s.epoch), s.retainLayer(e, r));
}
//@ chunk-q8cqcff6.js:117483-117614 layout
function hasArrayOrUndefined(e) {
  if (e === void 0 || Array.isArray(e)) return !0;
  if (e === null || typeof e !== "object") return !1;
  return Object.values(e).some(hasArrayOrUndefined);
}
//@ chunk-q8cqcff6.js:117614-117723 layout
function emitSettingsChanged(e) {
  try {
    is().changed.emit(e);
  } catch (error) {
    for (let r of error instanceof AggregateError ? error.errors : [error]) logError(r);
  }
}
/**
 * 对旧版 settings.local.json 应用变换但只保留删除部分（撤销授权）：读取并规范化旧文件，执行变换，内容有变化时原子写回并通知；各阶段失败返回遥测安全错误。
 */
//@ chunk-q8cqcff6.js:117723-119159 layout
async function revokeFromLegacyLocalSettings(e, n) {
  let legacyPath = getLegacyLocalSettingsFilePath_2(buildSettingsContext());
  if (!legacyPath) return { changed: !1, error: null };
  let content;
  try {
    let T = isInClaudeConfigHome(legacyPath)
      ? safeResolvePath(getFsImplementation(), legacyPath)
      : await vetRepoSettingsPathAsync(getFsImplementation(), legacyPath);
    content = (await readFileChecked(T.resolvedPath, MAX_SETTINGS_JSON_BYTES)).content;
  } catch (error) {
    if (isENOENT(error)) return { changed: !1, error: null };
    let v = new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Failed to read legacy settings.local.json at ${legacyPath}: ${error}`,
      "Failed to read legacy settings.local.json",
    );
    return (logForDebugging(v.message, { level: "error" }), { changed: !1, error: v, phase: "read" });
  }
  n.noteRead({ path: legacyPath, content: content });
  let parsed = safeParseJSON(content, !1);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { changed: !1, error: null };
  let normalized = clone(parsed);
  (applySettingAliases(normalized, legacyPath), coerceStringListSettings(normalized));
  let h = normalized,
    transformed;
  try {
    transformed = e(clone(h));
  } catch (error) {
    let v = new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Transform failed against legacy settings.local.json at ${legacyPath} (malformed legacy content?): ${error}`,
      "Transform failed against legacy settings.local.json",
    );
    return (logForDebugging(v.message, { level: "error" }), { changed: !1, error: v, phase: "transform" });
  }
  if (transformed === null) return { changed: !1, error: null };
  let merged = fj(clone(h), transformed, (T, v, M, x) => {
      if (v === void 0 && x && typeof M === "string") {
        delete x[M];
        return;
      }
      if (Array.isArray(v)) return v;
      return;
    }),
    result = projectRemovalsOnly(h, merged);
  if (jsonStringify(result) === jsonStringify(h)) return { changed: !1, error: null };
  try {
    eOt(legacyPath);
    let T = isPathConfigDir(dirname(legacyPath)),
      v =
        jsonStringify(result, null, 2) +
        `
`;
    return (
      await writeSettingsFileAtomic(legacyPath, v, {
        encoding: "utf-8",
        allowSymlink: T,
        checkParentDir: !T,
        stagingDir: join(dirname(legacyPath), ATOMIC_WRITE_DIRNAME),
      }),
      n.after({ path: legacyPath, content: v }),
      or(),
      { changed: !0, error: null }
    );
  } catch (error) {
    let v = new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Failed to revoke from legacy settings.local.json at ${legacyPath}: ${error}`,
      "Failed to revoke from legacy settings.local.json",
    );
    return (logForDebugging(v.message, { level: "error" }), { changed: !1, error: v });
  }
}
//@ chunk-q8cqcff6.js:119159-119410 placement
function projectRemovalsOnly(e, n) {
  if (Array.isArray(e) && Array.isArray(n)) {
    let r = new Set(n.map((s) => jsonStringify(s)));
    return e.filter((s) => r.has(jsonStringify(s)));
  }
  if (isPlainObject(e) && isPlainObject(n)) {
    let r = {};
    for (let s of Object.keys(e)) {
      if (!(s in n) || n[s] === void 0) continue;
      r[s] = projectRemovalsOnly(e[s], n[s]);
    }
    return r;
  }
  return e;
}
/**
 * 列出托管设置里出现的键（permissions/sandbox/hooks 展开一层），用于遥测。
 */
//@ chunk-q8cqcff6.js:119410-119791 placement = getManagedSettingsKeysForLogging (0.208)
function getManagedSettingsKeysForLogging(settings) {
  let validSettings = getStrippingSettingsSchema(settings).parse(settings),
    keysToExpand = ["permissions", "sandbox", "hooks"],
    allKeys = [],
    validNestedKeys = {
      permissions: new Set(Object.keys(PermissionsSettingsSchema().shape)),
      sandbox: new Set(Object.keys(m_r().shape)),
      hooks: new Set(HOOK_EVENTS),
    };
  for (let key of Object.keys(validSettings))
    if (keysToExpand.includes(key) && validSettings[key] && typeof validSettings[key] === "object") {
      let h = validSettings[key],
        y = validNestedKeys[key];
      if (y) {
        for (let nestedKey of Object.keys(h)) if (y.has(nestedKey)) allKeys.push(`${key}.${nestedKey}`);
      }
    } else allKeys.push(key);
  return allKeys.sort();
}
//@ chunk-q8cqcff6.js:119791-119924 placement
function getSettingsAfterPluginLoad(e) {
  if (!is().pluginBaseLoaded) logEvent("tengu_plugin_settings_premature_read", { key: fromEnum(e) });
  let { settings: settings } = getSettingsWithErrors_2();
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
    let s = getSettingsForSourceTightenOnly(r),
      S = s?.[e];
    if (
      S !== void 0 &&
      (isSettingSourceEnabled(r) ||
        MANAGED_RESTRICTION_KEYS().some(
          (E) =>
            E.path.length === 1 &&
            E.path[0] === e &&
            JOe(E.restrictive).some((h) => h === restrictionValue(E, s)),
        ))
    )
      n.push({ source: r, value: S });
  }
  return n;
}
/**
 * 任一来源（user/local/flag/policy，不含 project）设置了 skipDangerousModePermissionPrompt。
 */
//@ chunk-q8cqcff6.js:120243-120489 placement = hasSkipDangerousModePermissionPrompt (1)
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
  return getEnabledSettingSources_2().some((e) => getSettingsForSource(e)?.isolatePeerMachines === !0);
}
//@ chunk-q8cqcff6.js:120906-121033 placement
function hasDisableClaudeAiConnectors() {
  return (
    getEnabledSettingSources_2().some((e) => getSettingsForSource(e)?.disableClaudeAiConnectors === !0) ||
    getDurablePolicyTierSettings().some((e) => e.disableClaudeAiConnectors === !0)
  );
}
//@ chunk-q8cqcff6.js:121033-121057 placement
function hasAutoModeOptIn() {
  return !0;
}
//@ chunk-q8cqcff6.js:121057-121299 placement = hasSkipDangerousModePermissionPrompt (0.763)
function isNotDisabledInTrustedSources(e) {
  let n = e === "useAutoModeDuringPlan" ? getSettingsForSource : getSettingsForSourceTightenOnly;
  return ![
    ...getAllPolicyTierSettings(),
    ...getDurablePolicyTierSettings(),
    getSettingsForSource("policySettings"),
    getSettingsForSource("flagSettings"),
    n("userSettings"),
    n("localSettings"),
    e !== "useAutoModeDuringPlan" || isSettingSourceEnabled("localSettings")
      ? getLegacyLocalSettingsOverlay()
      : null,
  ].some((r) => r?.[e] === !1);
}
//@ chunk-q8cqcff6.js:121299-121374 placement = _temp9 (1)
function isDisabledAboveWorkloadFiles(a_4) {
  return [...getVouchedPolicyTierSettings(), getSettingsForSource("flagSettings")].some(
    (n) => n?.[a_4] === !1,
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
async function getModelProposedGoalsSetting(e) {
  let n = getSecuritySensitiveSetting("modelProposedGoals")[0];
  if (n !== void 0) return n;
  if ((await rawSettingsKeyPresence("modelProposedGoals", e)) !== "absent") return "alwaysAsk";
  return "auto";
}
//@ chunk-q8cqcff6.js:121739-121945 placement
var autoModeConfigSchema = DoctorLazy(() =>
    u({
      allow: A(o()).optional(),
      soft_deny: A(o()).optional(),
      hard_deny: A(o()).optional(),
      deny: A(o()).optional(),
      environment: A(o()).optional(),
    }),
  ),
  AUTO_MODE_TRUSTED_SOURCES = ["userSettings", "flagSettings", "policySettings"];
/**
 * 汇总 autoMode 分类器规则（allow/soft_deny/hard_deny/environment），只接受 user/flag/policy 来源；project/local 中的 autoMode 被忽略并打 tengu_settings_auto_mode_rules_untrusted_source_ignored。
 */
//@ chunk-q8cqcff6.js:121945-123032 placement = getAutoModeConfig (0.293)
function getAutoModeConfig() {
  let e = autoModeConfigSchema(),
    n = is();
  if (!n.autoModeUntrustedSourceWarned)
    for (let P of ["projectSettings", "localSettings"]) {
      if (P === "projectSettings" && projectSettingsAliasesUserSettings()) continue;
      let O = getSettingsForSource(P)?.autoMode;
      if (O && e.safeParse(O).success)
        ((n.autoModeUntrustedSourceWarned = !0),
          logForDebugging(
            `settings autoMode in ${P} ignored \u2014 only user/flag/managed settings may set classifier rules (projectSettings and localSettings are repo-controllable)`,
            { level: "warn" },
          ),
          logEvent("tengu_settings_auto_mode_rules_untrusted_source_ignored", { source: fromEnum(P) }));
    }
  let r = {},
    s = [],
    S = [],
    E = [],
    h = !1;
  for (let P of AUTO_MODE_TRUSTED_SOURCES) {
    let settings = getSettingsForSource(P);
    if (!settings) continue;
    let result = e.safeParse(settings.autoMode);
    if (result.success) {
      if (result.data.allow) r[P] = result.data.allow;
      if (result.data.soft_deny) s.push(...result.data.soft_deny);
      if (result.data.hard_deny) S.push(...result.data.hard_deny);
      if (result.data.environment) E.push(...result.data.environment);
    }
  }
  if (r.flagSettings) r.flagSettings = flagAllowBesideManagedAllow(r.flagSettings, r.policySettings);
  let flattened = AUTO_MODE_TRUSTED_SOURCES.flatMap((P) => r[P] ?? []);
  if (flattened.length > 0 || s.length > 0 || S.length > 0 || E.length > 0 || h)
    return {
      ...(flattened.length > 0 && { allow: flattened }),
      ...(s.length > 0 && { soft_deny: s }),
      ...(S.length > 0 && { hard_deny: S }),
      ...(E.length > 0 && { environment: E }),
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
    if (getSettingsForSourceTightenOnly(e)?.autoMode?.classifyAllShell === !0) return !0;
  return !1;
}
//@ chunk-q8cqcff6.js:123277-124758 placement
async function rawSettingsKeyPresence(e, n, r) {
  let s = buildSettingsContext(),
    S = getEnabledSettingSources(s),
    E = !1,
    h = !1;
  for (let y of S) {
    if (y === "policySettings" && s.diskless) continue;
    let P = y !== "policySettings" && (r?.presenceSources === void 0 || r.presenceSources.includes(y));
    if (
      P &&
      y === "flagSettings" &&
      isPlainObject(s.flagInline) &&
      e in s.flagInline &&
      e !== "attribution" &&
      e !== "includeCoAuthoredBy"
    )
      E = !0;
    if (y === "flagSettings" && s.flagExpectedContent !== void 0) {
      if (!s.flagExpectedContent.trim()) continue;
      let x = safeParseJSON(s.flagExpectedContent, !1);
      if (x === null || typeof x !== "object" || Array.isArray(x)) h = !0;
      else if (P && e in x && e !== "attribution" && e !== "includeCoAuthoredBy") E = !0;
      continue;
    }
    let O = getSettingsFilePathForSource_2(y, s);
    if (!O) continue;
    if (
      isStorageV5Enabled() &&
      n !== void 0 &&
      y === "projectSettings" &&
      S.includes("userSettings") &&
      projectSettingsAliasesUserSettings()
    )
      continue;
    let T = y === "localSettings" ? getLegacyLocalSettingsFilePath_2(s) : void 0,
      v = T ? [O, T] : [O],
      M = isStorageV5Enabled() && n !== void 0 && ct(y, O);
    for (let x of v) {
      if (M) {
        let L = await readStoredUserSettings(n);
        switch (L.kind) {
          case "unreadable":
            (logForDebugging(`rawSettingsKeyPresence: v5 user-settings read failed: ${L.code}`), (h = !0));
            break;
          case "oversize":
          case "non-object":
            h = !0;
            break;
          case "object":
            if (P && e in L.raw && !(e === "attribution" || e === "includeCoAuthoredBy")) E = !0;
            break;
          case "absent":
          case "empty":
            break;
        }
        continue;
      }
      if (s.diskless) continue;
      try {
        let L =
            y === "policySettings" || y === "userSettings" || isInClaudeConfigHome(x)
              ? safeResolvePath(getFsImplementation(), x)
              : vetRepoSettingsPath(getFsImplementation(), x),
          G = readFileSync(L.resolvedPath, MAX_SETTINGS_JSON_BYTES);
        if (!G.trim()) continue;
        let q = safeParseJSON(G, !1);
        if (q === null || typeof q !== "object" || Array.isArray(q)) h = !0;
        else if (P && e in q && !(e === "attribution" || e === "includeCoAuthoredBy")) E = !0;
      } catch (error) {
        if ((handleFileSystemError(error, x), !isENOENT(error))) h = !0;
      }
    }
  }
  if (h) return "unknowable";
  return E ? "present" : "absent";
}
/**
 * 把设置覆盖层合并进设置对象（删除值为 undefined 的键）；误配名且归属错误。
 */
//@ chunk-dcmhvw5a.js:429611-429843 placement = cacheToObject (0.679)
function cacheToObject(e, n) {
  if (n === null) return e;
  let r = [...n.values];
  return {
    settings: fj(
      Uo(
        e.settings,
        r.filter(([, s]) => s === void 0).map(([s]) => s),
      ),
      clone(Object.fromEntries(r.filter(([, s]) => s !== void 0))),
      (s, a) => a,
    ),
    errors: [...e.errors, ...n.errors],
  };
}
/**
 * 同 getEnabledSettingSources，但基于传入的设置上下文。
 */
//@ chunk-dcmhvw5a.js:456962-457088 placement = getEnabledSettingSources (0.819)
function getEnabledSettingSources(e) {
  let result = new Set(e.allowedSources);
  return (
    result.add("flagSettings"),
    result.add("policySettings"),
    SETTING_SOURCES.filter((r) => result.has(r))
  );
}
/**
 * <托管目录>/managed-settings.json；托管目录 macOS=/Library/Application Support/ClaudeCode，Windows=C:\Program Files\ClaudeCode，其他=/etc/claude-code。
 */
//@ chunk-dcmhvw5a.js:457088-457142 fingerprint = getManagedSettingsFilePath (1)
function getManagedSettingsFilePath() {
  return join_2(getManagedFilePath(), "managed-settings.json");
}
//@ chunk-dcmhvw5a.js:470468-470483 placement
var MAX_SETTINGS_JSON_BYTES = 2097152;
/**
 * 读取设置文件：先做路径安全检查（符号链接指向其他主机/无法核实则拒读并给 fatal 错误），按文件内容缓存解析结果，空文件视为 {}。
 */
//@ chunk-dcmhvw5a.js:470483-470784 placement
function parseSettingsFileUncached(e, n, r) {
  try {
    let s;
    if (n !== void 0) s = n;
    else {
      let a =
        r || isInClaudeConfigHome(e)
          ? safeResolvePath(getFsImplementation(), e)
          : vetRepoSettingsPath(getFsImplementation(), e);
      if (r) {
        let c = {};
        s = readFileSync(a.resolvedPath, MAX_SETTINGS_JSON_BYTES, (m) => {
          c.owner = { uid: m.uid, gid: m.gid, mode: m.mode };
        });
        let g = parseSettingsContent(s, e, r);
        return c.owner ? { ...g, fileOwner: c.owner } : g;
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
      return join_2(".claude", "settings.json");
    case "localSettings":
      return join_2(".claude", "settings.local.json");
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
/**
 * lodash mergeWith 定制器：数组拼接去重（fallbackModel 取后者）；extraKnownMarketplaces、managedMcpServers 浅合并；modelPicker 整体替换；其余返回 undefined 交给默认深合并。
 */
//@ chunk-dcmhvw5a.js:510659-510911 placement
function settingsMergeCustomizer(e, n, r) {
  if (r === "modelPicker" && n !== void 0) return cloneModelPicker(n);
  if (Array.isArray(e) && Array.isArray(n)) {
    if (r === "fallbackModel") return n;
    return uniq([...e, ...n]);
  }
  if (
    (r === "extraKnownMarketplaces" || r === "managedMcpServers") &&
    isPlainObject_2(e) &&
    isPlainObject_2(n)
  )
    return mergeExtraKnownMarketplacesByEntry(e, n);
  return;
}
//@ chunk-dcmhvw5a.js:510911-511030 file-local
function cloneModelPicker(e) {
  if (!isPlainObject_2(e)) return e;
  let options = e.options;
  return {
    ...e,
    ...(Array.isArray(options) && { options: options.map((r) => (isPlainObject_2(r) ? { ...r } : r)) }),
  };
}
/**
 * 按 getEnabledSettingSourcesFor 的顺序（user→project→local→flag→policy，后者覆盖前者）逐来源读取并用 settingsMergeCustomizer 合并：policy 走 loadPolicySettings；local 先合并旧位置 cwd/.claude/settings.local.json；flag 合并 --settings 文件与 SDK 内联设置。最后 policy 的 availableModels/deniedModels/modelPicker 强制覆盖，并对 allowManagedReadPathsOnly/allowManagedDomainsOnly 下被忽略的 sandbox 条目给出警告。结果缓存在 store.mergedSettings。
 */
//@ chunk-dcmhvw5a.js:511030-514083 placement = loadSettingsFromDisk (0.255)
function loadSettingsFromDisk(e) {
  if (e.store.isLoadingFromDisk) return { settings: {}, errors: [] };
  let startTime = Date.now();
  (logForDiagnosticsNoPII("info", "settings_load_started"), (e.store.isLoadingFromDisk = !0));
  try {
    let pluginBase = e.store.pluginBase,
      mergedSettings = {};
    if (pluginBase) mergedSettings = fj(mergedSettings, pluginBase, settingsMergeCustomizer);
    let a = [],
      seenErrors = new Set(),
      seenFiles = new Set(),
      m = (v) => {
        for (let error of v) {
          let errorKey = `${error.file}:${error.path}:${error.message}`;
          if (!seenErrors.has(errorKey)) (seenErrors.add(errorKey), a.push(error));
        }
      },
      f = [],
      h = [getManagedFilePath()];
    if (getPlatform() === "wsl" && e.wslInherits?.()) h.push(WSL_MANAGED_SETTINGS_DIR);
    let y = new Set(h.map((v) => resolve_2(join_2(v, "managed-settings.json")))),
      b = new Set(h.map((v) => resolve_2(join_2(v, "managed-settings.d")))),
      S = (v) => {
        let filePath = resolve_2(v);
        return y.has(filePath) || b.has(dirname(filePath));
      },
      C = (v, j, x) => {
        if (x?.channelLabel !== !0 && S(v)) return;
        let K = j.sandbox?.filesystem?.allowRead?.length ?? 0,
          q = j.sandbox?.network?.allowedDomains?.length ?? 0;
        if (K > 0 || q > 0) f.push({ file: v, allowReadCount: K, allowedDomainsCount: q });
      },
      w = null;
    for (let v of getEnabledSettingSources(e)) {
      if (v === "policySettings") {
        let { settings: settings, errors: errors } = loadPolicySettings(e);
        if (
          ((w = settings),
          m(deniedModelsEntryWarnings(settings)),
          m(availableModelsExactEntryWarnings(settings)),
          settings)
        )
          mergedSettings = fj(mergedSettings, kn(v, settings, e), settingsMergeCustomizer);
        m(errors);
        continue;
      }
      let tier = e.store.repoTierFreeze.tier(v);
      if (tier !== void 0) {
        let K = getSettingsFilePathForSource_3(v, e);
        if (K) seenFiles.add(resolve_2(K));
        if ((m([...tier.errors]), tier.settings))
          mergedSettings = fj(mergedSettings, tier.settings, settingsMergeCustomizer);
        continue;
      }
      if (v === "localSettings") {
        let resolvedPath = getLegacyLocalSettingsFilePath_3(e);
        if (resolvedPath && !seenFiles.has(resolve_2(resolvedPath))) {
          seenFiles.add(resolve_2(resolvedPath));
          let { settings: settings, errors: errors } = parseSettingsFile_3(resolvedPath, e.store);
          if ((m(errors), settings))
            (e.onLegacyLocalSettingsRead?.("cascade"),
              C(resolvedPath, settings),
              (mergedSettings = fj(mergedSettings, kn(v, settings, e), settingsMergeCustomizer)));
        }
      }
      let x = getSettingsFilePathForSource_3(v, e);
      if (x) {
        let K = resolve_2(x),
          q = v === "flagSettings" && e.flagExpectedContent !== void 0;
        if (!seenFiles.has(K) || q) {
          seenFiles.add(K);
          let { settings: settings, errors: errors } = parseSettingsFile_3(
            x,
            e.store,
            v === "flagSettings" ? e.flagExpectedContent : void 0,
          );
          if ((m(errors), settings)) {
            if (v === "flagSettings" && e.flagInlineJson === !0)
              C(INLINE_FLAG_SETTINGS_LABEL, settings, { channelLabel: !0 });
            else C(x, settings);
            mergedSettings = fj(mergedSettings, kn(v, settings, e), settingsMergeCustomizer);
          }
        }
      }
      if (v === "flagSettings") {
        let { settings: settings, errors: errors } = parseInlineFlagSettings(e);
        if ((m(errors), settings))
          (C("SDK inline settings", settings, { channelLabel: !0 }),
            (mergedSettings = fj(mergedSettings, kn(v, settings, e), settingsMergeCustomizer)));
      }
    }
    if (w) {
      if (w.availableModels !== void 0) mergedSettings.availableModels = [...w.availableModels];
      if (w.enforceAvailableModels !== void 0)
        mergedSettings.enforceAvailableModels = w.enforceAvailableModels;
      if (w.modelPicker !== void 0) mergedSettings.modelPicker = cloneModelPicker(w.modelPicker);
    }
    let L = w?.deniedModels;
    if (L !== void 0) mergedSettings.deniedModels = [...L];
    else delete mergedSettings.deniedModels;
    if (f.length > 0) {
      let v = getAllPolicyTierSettings_3(e),
        j = (x, K, q, ee, Z) => ({
          file: x,
          path: K,
          severity: "warning",
          statusOnly: !0,
          message: `${K} is ignored \u2014 managed settings set ${q}, so only ${ee} from managed settings are honored. The ${Z === 1 ? "entry" : `${Z} entries`} in ${x} will NOT apply (see https://code.claude.com/docs/en/settings#sandbox-settings).`,
        });
      if (v.some((x) => x.sandbox?.filesystem?.allowManagedReadPathsOnly === !0)) {
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
      if (v.some((x) => x.sandbox?.network?.allowManagedDomainsOnly === !0)) {
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
    return (
      logForDiagnosticsNoPII("info", "settings_load_completed", {
        duration_ms: Date.now() - startTime,
        source_count: seenFiles.size,
        error_count: a.length,
      }),
      (e.store.hookedMerge.computed = mergedSettings),
      cacheToObject({ settings: mergedSettings, errors: a }, e.store.hookedMerge.answers)
    );
  } finally {
    e.store.isLoadingFromDisk = !1;
  }
}
//@ chunk-dcmhvw5a.js:514083-514196 placement
function getSettingsWithErrors(e) {
  let mergedSettings = e.store.mergedSettings;
  if (mergedSettings !== null) return mergedSettings;
  let r = loadSettingsFromDisk(e);
  return ((e.store.mergedSettings = r), r);
}
//@ chunk-dcmhvw5a.js:514196-514248 placement
function getInitialSettings(e) {
  let { settings: settings } = getSettingsWithErrors(e);
  return settings || {};
}
//@ chunk-dcmhvw5a.js:514248-514428 placement
function getSettingsWithSources(e) {
  e.store.invalidateAll();
  let n = [];
  for (let r of getEnabledSettingSources(e)) {
    let s = getSettingsForSource_3(r, e);
    if (s && Object.keys(s).length > 0) n.push({ source: r, settings: s });
  }
  return { effective: getInitialSettings(e), sources: n };
}
//@ chunk-dcmhvw5a.js:514428-514548 placement
function getEffectiveSettingSource(e, n) {
  let r = getEnabledSettingSources(n);
  for (let s = r.length - 1; s >= 0; s--) {
    let a = r[s];
    if (getSettingsForSource_3(a, n)?.[e] !== void 0) return a;
  }
  return null;
}
//@ chunk-4xpk3fhh.js:11081-11176 fingerprint = getSettingsRootPathForSource (1)
var TRUSTED_SETTING_SOURCES = ["policySettings", "flagSettings", "userSettings"],
  REPO_SETTING_SOURCES = ["localSettings", "projectSettings"];
//@ chunk-6zvepy0r.js:10205-10335 fingerprint = rawSettingsContainsKey (0.783)
async function resolveSettingsWritePath(key) {
  if (J(key) === "policySettings" || isInClaudeConfigHome(key)) return key;
  let n = await vetRepoSettingsPathAsync(getFsImplementation(), key);
  return n.linksResolvedPath ?? n.resolvedPath;
}
//@ chunk-aat7wt0p.js:16206-17231 fingerprint = loadManagedFileSettings (0.344)
function pathTraversesUntrustedLink(
  t,
  n,
  e,
  r,
  { trustedStart: o = !1, trustedRoot: i = t, eisdirIsFolder: s = !1 } = {},
) {
  let u = i.endsWith(sep) ? i : i + sep,
    a = (d) => o && (d === i || d.startsWith(u)),
    l = t;
  if (!a(l) && P(l, r)) return !0;
  let A;
  for (let d = 0; d < n.length; d++) {
    let I = n[d];
    if (I === ".") continue;
    if (I === "..") {
      l = dirname(l);
      continue;
    }
    let S = join(l, I);
    if (!a(S) && P(S, r)) return !0;
    let code = E(() => lstatSync(S));
    if (code.value === void 0) {
      if (code.code !== "ENOENT" && code.code !== "ENOTDIR") return !0;
      let m = S;
      for (let O of n.slice(d + 1))
        if (((m = O === ".." ? dirname(m) : O === "." ? m : join(m, O)), !a(m) && P(m, r))) return !0;
      return !1;
    }
    let M;
    if (code.value.isSymbolicLink()) {
      if (e >= Mt) return !0;
      if (((M = E(() => readlinkSync(S)).value), M === void 0)) return !0;
    } else {
      l = S;
      continue;
    }
    let replaced = M.replace(/^\/{2,}/, "/");
    if (!(o && isAbsolute(replaced) && !cl(replaced) && a(replaced)) && P(replaced, r)) return !0;
    let sliced = n.slice(d + 1);
    if (alwaysFalse(replaced)) return !0;
    if (isAbsolute(replaced)) {
      if (o && !cl(replaced) && a(replaced))
        return pathTraversesUntrustedLink(i, [...x(replaced.slice(u.length)), ...sliced], e + 1, r, {
          trustedStart: !0,
          trustedRoot: i,
          eisdirIsFolder: s,
        });
      let root = parse(replaced).root;
      return pathTraversesUntrustedLink(root, [...x(replaced.slice(root.length)), ...sliced], e + 1, r, {
        eisdirIsFolder: s,
      });
    }
    return pathTraversesUntrustedLink(l, [...x(replaced), ...sliced], e + 1, r, {
      trustedStart: a(l),
      trustedRoot: i,
      eisdirIsFolder: s,
    });
  }
  return !1;
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
