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
import { sep, dirname, join, isAbsolute, parse, resolve, basename } from "path";
import { lstatSync, readlinkSync } from "fs";
import {
  isUntrustedLinkPathStrict,
  MAX_UNTRUSTED_PATH_DEPTH,
  alwaysFalse,
  splitPathSegments,
} from "../pathResolution.js";
import { captureSyncResult } from "../fsJunctions.js";
import { hasDotSegment } from "../pathClassification.js";
import { mergeWithAssigner_2 } from "../../../vendor/lodash-es/_mergeWithFamily.js";
import { omitAlias } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { clone, jsonStringify } from "../slowOperations.js";
import {
  SETTING_SOURCES,
  INLINE_FLAG_SETTINGS_LABEL,
  isSettingSourceEnabled,
  REPO_DIR_SETTING_SOURCES,
  REPO_DIR_SETTING_SOURCE_LIST,
  getEnabledSettingSources as getEnabledSettingSources_2,
} from "./constants.js";
import { getManagedFilePath } from "./managedPath.js";
import {
  isInClaudeConfigHome,
  parseSettingsContent,
  settingsReadErrorResult,
  getSettingsFilePathForSource_3,
  getSettingsRootPathForSource as getSettingsRootPathForSource_2,
  localSettingsStoreRootBeforeOwnership,
  getRuleAnchorRootForSource as getRuleAnchorRootForSource_2,
  parseSettingsFileIfChanged,
  userSettingsHomes,
  USER_SETTINGS_FILE_NAMES,
  mdmPolicyErrors,
} from "./settingsFileParsing.js";
import {
  safeResolvePath,
  getFsImplementation,
  vetRepoSettingsPath,
  vetRepoSettingsPathAsync,
} from "../fsOperations.js";
import { readFileSync, decodeTextBuffer, readFileChecked } from "../fileRead.js";
import { getPlatform } from "../platform.js";
import { uniq, count } from "../collections.js";
import { isPlainObject } from "../isPlainObject.js";
import {
  mergeExtraKnownMarketplacesByEntry,
  loadPolicySettings,
  trimmedPolicyTier,
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
} from "./policyTiers.js";
import { logForDiagnosticsNoPII } from "../diagLogs.js";
import { WSL_MANAGED_SETTINGS_DIR } from "./mdm/wslRegistry.js";
import {
  deniedModelsEntryWarnings,
  availableModelsExactEntryWarnings,
  getLegacyLocalSettingsFilePath_3,
  getAllPolicyTierSettings_3,
  getSettingsForSource_3,
  getSettingsForSourceIfRead,
  getPairedPolicyModelOverrides as getPairedPolicyModelOverrides_2,
  getDeniedModelsPolicyOverrides as getDeniedModelsPolicyOverrides_2,
  getHostManagedModelPricing as getHostManagedModelPricing_2,
  getHostManagedToolSearchEnv as getHostManagedToolSearchEnv_2,
} from "./settingsSources.js";
import {
  parseSettingsFile_3,
  parseInlineFlagSettings,
  loadManagedFileSettings as loadManagedFileSettings_2,
  parseRemoteManagedSettings as parseRemoteManagedSettings_2,
  heldOffPluginIds,
  allowListEntriesThatVouch as allowListEntriesThatVouch_2,
  parseParentManagedSettings,
  parseParentTierWithOrganization,
  managedFileSettingsDirs,
  isManagedSettingsDropInName,
  PARENT_MANAGED_SETTINGS_SOURCE_LABEL,
  isInertManagedMcpServersNotice,
  handleFileSystemError,
} from "./managedFileSettings.js";
import { HostScoped } from "../hostScoped.js";
import { LegacyLocalSettingsProbe, seedProjectSettings } from "./settingsSeed.js";
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
import { mdmResult, isMdmLoadInFlight } from "./mdm/mdmLoader.js";
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
import { usesSessionAccessToken } from "../sessionAccessToken.js";
import { withDeadline } from "../sleep.js";
import {
  isENOENT,
  toError,
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../errors.js";
import { samePath, normalizePathForCompare, writeFileAtomic } from "../file.js";
import {
  SettingsCacheStore,
  nullIfEmptyObject,
  CONFIG_DIR_UNSAFE_REASONS,
} from "../../bootstrap/stateSlices.js";
import { safeParseJSON } from "../json.js";
import { import_sortedIndex_2 } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { logError } from "../log.js";
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
import { sandboxFilesystemSettingsSchema } from "./settingsSourceTrust.js";
import { HOOK_EVENTS } from "../../entrypoints/sdk/coreSchemas.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { MANAGED_RESTRICTION_KEYS, asArray, restrictionValue } from "./managedRestrictionKeys.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, array, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { DEFAULTS_PLACEHOLDER, replacesDefaults } from "../permissions/autoModeRulesPrompt.js";
import { settingsSourceForPathByPriority } from "./settingsReview.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-aat7wt0p.js:16206-17231 fingerprint (2.1.88 match: loadManagedFileSettings, 0.344)
function pathTraversesUntrustedLink(
  base,
  parts,
  depth,
  trustedSet,
  { trustedStart = false, trustedRoot = base, eisdirIsFolder = false } = {},
) {
  let rootWithSep = trustedRoot.endsWith(sep) ? trustedRoot : trustedRoot + sep;
  let isTrusted = (isInsideTrustedRoot) =>
    trustedStart && (isInsideTrustedRoot === trustedRoot || isInsideTrustedRoot.startsWith(rootWithSep));
  let current = base;
  if (!isTrusted(current) && isUntrustedLinkPathStrict(current, trustedSet)) return true;
  let resolvedPath;
  for (let idx = 0; idx < parts.length; idx++) {
    let part = parts[idx];
    if (part === ".") continue;
    if (part === "..") {
      current = dirname(current);
      continue;
    }
    let joined = join(current, part);
    if (!isTrusted(joined) && isUntrustedLinkPathStrict(joined, trustedSet)) return true;
    let code = captureSyncResult(() => lstatSync(joined));
    if (code.value === undefined) {
      if (code.code !== "ENOENT" && code.code !== "ENOTDIR") return true;
      let probe = joined;
      for (let segment of parts.slice(idx + 1)) {
        probe = segment === ".." ? dirname(probe) : segment === "." ? probe : join(probe, segment);
        if (!isTrusted(probe) && isUntrustedLinkPathStrict(probe, trustedSet)) return true;
      }
      return false;
    }
    let linkText;
    if (code.value.isSymbolicLink()) {
      if (depth >= MAX_UNTRUSTED_PATH_DEPTH) return true;
      linkText = captureSyncResult(() => readlinkSync(joined)).value;
      if (linkText === undefined) return true;
    } else {
      current = joined;
      continue;
    }
    let inputPath = linkText.replace(/^\/{2,}/, "/");
    if (
      !(trustedStart && isAbsolute(inputPath) && !hasDotSegment(inputPath) && isTrusted(inputPath)) &&
      isUntrustedLinkPathStrict(inputPath, trustedSet)
    )
      return true;
    let sliced = parts.slice(idx + 1);
    if (alwaysFalse(inputPath)) return true;
    if (isAbsolute(inputPath)) {
      if (trustedStart && !hasDotSegment(inputPath) && isTrusted(inputPath))
        return pathTraversesUntrustedLink(
          trustedRoot,
          [...splitPathSegments(inputPath.slice(rootWithSep.length)), ...sliced],
          depth + 1,
          trustedSet,
          {
            trustedStart: true,
            trustedRoot,
            eisdirIsFolder,
          },
        );
      let root = parse(inputPath).root;
      return pathTraversesUntrustedLink(
        root,
        [...splitPathSegments(inputPath.slice(root.length)), ...sliced],
        depth + 1,
        trustedSet,
        {
          eisdirIsFolder,
        },
      );
    }
    return pathTraversesUntrustedLink(
      current,
      [...splitPathSegments(inputPath), ...sliced],
      depth + 1,
      trustedSet,
      {
        trustedStart: isTrusted(current),
        trustedRoot,
        eisdirIsFolder,
      },
    );
  }
  return false;
}
//@ chunk-dcmhvw5a.js:429611-429843 placement (2.1.88 match: cacheToObject, 0.679)
/**
 * 把设置覆盖层合并进设置对象（删除值为 undefined 的键）；误配名且归属错误。
 */
function cacheToObject(result, answers) {
  if (answers === null) return result;
  let answered = [...answers.values];
  return {
    settings: mergeWithAssigner_2(
      omitAlias(
        result.settings,
        answered.filter(([, value]) => value === undefined).map(([key]) => key),
      ),
      clone(Object.fromEntries(answered.filter(([, value]) => value !== undefined))),
      (current, next) => next,
    ),
    errors: [...result.errors, ...answers.errors],
  };
}
//@ chunk-dcmhvw5a.js:456962-457088 placement (2.1.88 match: getEnabledSettingSources, 0.819)
/**
 * 同 getEnabledSettingSources，但基于传入的设置上下文。
 */
function getEnabledSettingSources(allowed) {
  let result = new Set(allowed.allowedSources);
  result.add("flagSettings");
  result.add("policySettings");
  return SETTING_SOURCES.filter((source) => result.has(source));
}
//@ chunk-dcmhvw5a.js:457088-457142 fingerprint (2.1.88 match: getManagedSettingsFilePath, 1)
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
function parseSettingsFileUncached(path, content, pinned) {
  try {
    let text;
    if (content !== undefined) text = content;
    else {
      let safe =
        pinned || isInClaudeConfigHome(path)
          ? safeResolvePath(getFsImplementation(), path)
          : vetRepoSettingsPath(getFsImplementation(), path);
      if (pinned) {
        let owner = {};
        text = readFileSync(safe.resolvedPath, MAX_SETTINGS_JSON_BYTES, (stats) => {
          owner.owner = {
            uid: stats.uid,
            gid: stats.gid,
            mode: stats.mode,
          };
        });
        let settingsContent = parseSettingsContent(text, path, pinned);
        return owner.owner
          ? {
              ...settingsContent,
              fileOwner: owner.owner,
            }
          : settingsContent;
      }
      text = readFileSync(safe.resolvedPath, MAX_SETTINGS_JSON_BYTES);
    }
    return parseSettingsContent(text, path, pinned);
  } catch (error) {
    return settingsReadErrorResult(error, path);
  }
}
//@ chunk-dcmhvw5a.js:477334-477482 placement (2.1.88 match: getRelativeSettingsFilePathForSource, 1)
function getRelativeSettingsFilePathForSource(source) {
  switch (source) {
    case "projectSettings":
      return join(".claude", "settings.json");
    case "localSettings":
      return join(".claude", "settings.local.json");
  }
}
//@ chunk-dcmhvw5a.js:485208-485280 placement
function isAdminPolicyOrigin(origin) {
  return origin === "helper" || origin === "plist" || origin === "hklm" || origin === "file";
}
//@ chunk-dcmhvw5a.js:485280-485330 fingerprint (2.1.88 match: getPolicySettingsOrigin, 0.675)
function getPolicySettingsOrigin_2() {
  return getPlatform() === "macos" ? "plist" : "hklm";
}
//@ chunk-dcmhvw5a.js:510659-510911 placement
/**
 * lodash mergeWith 定制器：数组拼接去重（fallbackModel 取后者）；extraKnownMarketplaces、managedMcpServers 浅合并；modelPicker 整体替换；其余返回 undefined 交给默认深合并。
 */
function settingsMergeCustomizer(previous, next, key) {
  if (key === "modelPicker" && next !== undefined) return cloneModelPicker(next);
  if (Array.isArray(previous) && Array.isArray(next)) {
    if (key === "fallbackModel") return next;
    return uniq([...previous, ...next]);
  }
  if (
    (key === "extraKnownMarketplaces" || key === "managedMcpServers") &&
    isPlainObject(previous) &&
    isPlainObject(next)
  )
    return mergeExtraKnownMarketplacesByEntry(previous, next);
  return;
}
//@ chunk-dcmhvw5a.js:510911-511030 file-local
function cloneModelPicker(picker) {
  if (!isPlainObject(picker)) return picker;
  let options = picker.options;
  return {
    ...picker,
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
//@ chunk-dcmhvw5a.js:511030-514083 placement (2.1.88 match: loadSettingsFromDisk, 0.255)
/**
 * 按 getEnabledSettingSourcesFor 的顺序（user→project→local→flag→policy，后者覆盖前者）逐来源读取并用 settingsMergeCustomizer 合并：policy 走 loadPolicySettings；local 先合并旧位置 cwd/.claude/settings.local.json；flag 合并 --settings 文件与 SDK 内联设置。最后 policy 的 availableModels/deniedModels/modelPicker 强制覆盖，并对 allowManagedReadPathsOnly/allowManagedDomainsOnly 下被忽略的 sandbox 条目给出警告。结果缓存在 store.mergedSettings。
 */
function loadSettingsFromDisk(context) {
  if (context.store.isLoadingFromDisk)
    return {
      settings: {},
      errors: [],
    };
  let startTime = Date.now();
  logForDiagnosticsNoPII("info", "settings_load_started");
  context.store.isLoadingFromDisk = true;
  try {
    let pluginBase = context.store.pluginBase;
    let mergedSettings = {};
    if (pluginBase) mergedSettings = mergeWithAssigner_2(mergedSettings, pluginBase, settingsMergeCustomizer);
    let errors = [];
    let seenErrors = new Set();
    let seenFiles = new Set();
    let pushError = (errors_2) => {
      for (let error of errors_2) {
        let errorKey = `${error.file}:${error.path}:${error.message}`;
        if (!seenErrors.has(errorKey)) {
          seenErrors.add(errorKey);
          errors.push(error);
        }
      }
    };
    let sandboxRows = [];
    let managedDirs = [getManagedFilePath()];
    if (getPlatform() === "wsl" && context.wslInherits?.()) managedDirs.push(WSL_MANAGED_SETTINGS_DIR);
    let managedFilePaths = new Set(managedDirs.map((dir) => resolve(join(dir, "managed-settings.json"))));
    let dropInDirs = new Set(managedDirs.map((dir) => resolve(join(dir, "managed-settings.d"))));
    let isManagedFile = (path) => {
      let filePath = resolve(path);
      return managedFilePaths.has(filePath) || dropInDirs.has(dirname(filePath));
    };
    let noteSandboxOverrides = (file, settings, options) => {
      if (options?.channelLabel !== true && isManagedFile(file)) return;
      let allowReadCount = settings.sandbox?.filesystem?.allowRead?.length ?? 0;
      let allowedDomainsCount = settings.sandbox?.network?.allowedDomains?.length ?? 0;
      if (allowReadCount > 0 || allowedDomainsCount > 0)
        sandboxRows.push({
          file,
          allowReadCount,
          allowedDomainsCount,
        });
    };
    let policySettings = null;
    for (let source of getEnabledSettingSources(context)) {
      if (source === "policySettings") {
        let { settings, errors } = loadPolicySettings(context);
        policySettings = settings;
        pushError(deniedModelsEntryWarnings(settings));
        pushError(availableModelsExactEntryWarnings(settings));
        if (settings)
          mergedSettings = mergeWithAssigner_2(
            mergedSettings,
            trimmedPolicyTier(source, settings, context),
            settingsMergeCustomizer,
          );
        pushError(errors);
        continue;
      }
      let frozen = context.store.repoTierFreeze.tier(source);
      if (frozen !== undefined) {
        let settingsFilePathForSource = getSettingsFilePathForSource_3(source, context);
        if (settingsFilePathForSource) seenFiles.add(resolve(settingsFilePathForSource));
        pushError([...frozen.errors]);
        if (frozen.settings)
          mergedSettings = mergeWithAssigner_2(mergedSettings, frozen.settings, settingsMergeCustomizer);
        continue;
      }
      if (source === "localSettings") {
        let resolvedPath = getLegacyLocalSettingsFilePath_3(context);
        if (resolvedPath && !seenFiles.has(resolve(resolvedPath))) {
          seenFiles.add(resolve(resolvedPath));
          let { settings, errors } = parseSettingsFile_3(resolvedPath, context.store);
          pushError(errors);
          if (settings) {
            context.onLegacyLocalSettingsRead?.("cascade");
            noteSandboxOverrides(resolvedPath, settings);
            mergedSettings = mergeWithAssigner_2(
              mergedSettings,
              trimmedPolicyTier(source, settings, context),
              settingsMergeCustomizer,
            );
          }
        }
      }
      let settingsFilePathForSource = getSettingsFilePathForSource_3(source, context);
      if (settingsFilePathForSource) {
        let path = resolve(settingsFilePathForSource);
        let pinnedFlag = source === "flagSettings" && context.flagExpectedContent !== undefined;
        if (!seenFiles.has(path) || pinnedFlag) {
          seenFiles.add(path);
          let { settings, errors } = parseSettingsFile_3(
            settingsFilePathForSource,
            context.store,
            source === "flagSettings" ? context.flagExpectedContent : undefined,
          );
          pushError(errors);
          if (settings) {
            if (source === "flagSettings" && context.flagInlineJson === true)
              noteSandboxOverrides(INLINE_FLAG_SETTINGS_LABEL, settings, {
                channelLabel: true,
              });
            else noteSandboxOverrides(settingsFilePathForSource, settings);
            mergedSettings = mergeWithAssigner_2(
              mergedSettings,
              trimmedPolicyTier(source, settings, context),
              settingsMergeCustomizer,
            );
          }
        }
      }
      if (source === "flagSettings") {
        let { settings, errors } = parseInlineFlagSettings(context);
        pushError(errors);
        if (settings) {
          noteSandboxOverrides("SDK inline settings", settings, {
            channelLabel: true,
          });
          mergedSettings = mergeWithAssigner_2(
            mergedSettings,
            trimmedPolicyTier(source, settings, context),
            settingsMergeCustomizer,
          );
        }
      }
    }
    if (policySettings) {
      if (policySettings.availableModels !== undefined)
        mergedSettings.availableModels = [...policySettings.availableModels];
      if (policySettings.enforceAvailableModels !== undefined)
        mergedSettings.enforceAvailableModels = policySettings.enforceAvailableModels;
      if (policySettings.modelPicker !== undefined)
        mergedSettings.modelPicker = cloneModelPicker(policySettings.modelPicker);
    }
    let deniedModels = policySettings?.deniedModels;
    if (deniedModels !== undefined) mergedSettings.deniedModels = [...deniedModels];
    else delete mergedSettings.deniedModels;
    if (sandboxRows.length > 0) {
      let allPolicyTierSettings = getAllPolicyTierSettings_3(context);
      let makeIgnored = (file, settingPath, managedValue, honoredKeys, entryCount) => ({
        file,
        path: settingPath,
        severity: "warning",
        statusOnly: true,
        message: `${settingPath} is ignored \u2014 managed settings set ${managedValue}, so only ${honoredKeys} from managed settings are honored. The ${entryCount === 1 ? "entry" : `${entryCount} entries`} in ${file} will NOT apply (see https://code.claude.com/docs/en/settings#sandbox-settings).`,
      });
      if (
        allPolicyTierSettings.some(
          (policyTierSetting) => policyTierSetting.sandbox?.filesystem?.allowManagedReadPathsOnly === true,
        )
      ) {
        for (let error of sandboxRows)
          if (error.allowReadCount > 0)
            pushError([
              makeIgnored(
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
        for (let row of sandboxRows)
          if (row.allowedDomainsCount > 0)
            pushError([
              makeIgnored(
                row.file,
                "sandbox.network.allowedDomains",
                "allowManagedDomainsOnly",
                "allowed domains (and WebFetch domain rules)",
                row.allowedDomainsCount,
              ),
            ]);
      }
    }
    logForDiagnosticsNoPII("info", "settings_load_completed", {
      duration_ms: Date.now() - startTime,
      source_count: seenFiles.size,
      error_count: errors.length,
    });
    context.store.hookedMerge.computed = mergedSettings;
    return cacheToObject(
      {
        settings: mergedSettings,
        errors,
      },
      context.store.hookedMerge.answers,
    );
  } finally {
    context.store.isLoadingFromDisk = false;
  }
}
//@ chunk-dcmhvw5a.js:514083-514196 placement
function getSettingsWithErrors(context) {
  let mergedSettings = context.store.mergedSettings;
  if (mergedSettings !== null) return mergedSettings;
  let settingsFromDisk = loadSettingsFromDisk(context);
  context.store.mergedSettings = settingsFromDisk;
  return settingsFromDisk;
}
//@ chunk-dcmhvw5a.js:514196-514248 placement
function getInitialSettings(context) {
  let { settings } = getSettingsWithErrors(context);
  return settings || {};
}
//@ chunk-dcmhvw5a.js:514248-514428 placement
function getSettingsWithSources(context) {
  context.store.invalidateAll();
  let sources = [];
  for (let source of getEnabledSettingSources(context)) {
    let settingsForSource = getSettingsForSource_3(source, context);
    if (settingsForSource && Object.keys(settingsForSource).length > 0)
      sources.push({
        source,
        settings: settingsForSource,
      });
  }
  return {
    effective: getInitialSettings(context),
    sources,
  };
}
//@ chunk-dcmhvw5a.js:514428-514548 placement
function getEffectiveSettingSource(key, context) {
  let enabledSettingSources = getEnabledSettingSources(context);
  for (let j = enabledSettingSources.length - 1; j >= 0; j--) {
    let source = enabledSettingSources[j];
    if (getSettingsForSource_3(source, context)?.[key] !== undefined) return source;
  }
  return null;
}
//@ chunk-q8cqcff6.js:94076-94102 placement
var legacyLocalSettingsProbes; // deferred: uses LegacyLocalSettingsProbe (./settingsSeed.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-q8cqcff6.js:94076", () => {
  legacyLocalSettingsProbes = new HostScoped(() => new LegacyLocalSettingsProbe());
});
//@ chunk-q8cqcff6.js:94102-94143 placement
function parseSettingsFile(path, store, pinned) {
  return parseSettingsFile_3(path, commandSyncNameState(), store, pinned);
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
    onLegacyLocalSettingsRead: (source) => legacyLocalSettingsProbes.of(getRootSession().host).fire(source),
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
    credentialHelperKeysFrom: (source) => credentialHelperKeysFrom(source),
    launchFolderKeysFrom: (source) => launchFolderKeysFrom(source),
    asksOrganization: () => hasManagedSettingsCached(),
    policyOnlyServerTier: noSettingsOverride,
  };
  context.file = () => loadManagedFileSettings_2(context);
  return context;
}
//@ chunk-q8cqcff6.js:94887-95050 placement
function isSettingsTierWithheld(source) {
  if (!isStoredLoginPinned()) return false;
  if (source !== "policySettings") return true;
  let policySettingsOrigin = getPolicySettingsOrigin();
  return !(
    (isAdminPolicyOrigin(policySettingsOrigin) || policySettingsOrigin === "remote") &&
    mdmResult().userWritable !== true &&
    !armedFromUserWritableBase() &&
    (getRemoteManagedSettingsSyncFromCache() === null || isRemoteManagedSettingsVerified())
  );
}
//@ chunk-q8cqcff6.js:95050-95282 placement
function credentialHelperKeysFrom(source) {
  if (isHttpMcpServeInvocation()) return "none";
  if (
    source === "policySettings" &&
    noSettingsOverride() !== undefined &&
    getPolicySettingsOrigin() === "remote"
  )
    return "machine_admin";
  if (!isStoredLoginPinned())
    return isAttachServeRepoScopedSourceOrNonInteractive(source) ? "none" : "as_read";
  if (source !== "policySettings") return "none";
  return isSettingsTierWithheld(source) ? "machine_admin" : "as_read";
}
//@ chunk-q8cqcff6.js:95282-95377 placement
function launchFolderKeysFrom(source) {
  if (!isAttachServeRepoScopedSource(source)) return "as_read";
  return source === "projectSettings" && projectSettingsAliasesUserSettings() ? "as_read" : "none";
}
//@ chunk-q8cqcff6.js:95377-95411 placement
function getSettingsRootPathForSource(source) {
  return getSettingsRootPathForSource_2(source, buildSettingsContext());
}
//@ chunk-q8cqcff6.js:95411-95535 placement
function localSettingsStoreRootAwaitingOwnershipProbe() {
  let settingsContext = buildSettingsContext();
  if (settingsContext.cwd === null) return;
  let root = localSettingsStoreRootBeforeOwnership(settingsContext.cwd, settingsContext.canonicalGitRoot);
  return root.decided === undefined ? root.root : undefined;
}
//@ chunk-q8cqcff6.js:95535-95567 placement
function getSettingsFilePathForSource(source) {
  return getSettingsFilePathForSource_3(source, buildSettingsContext());
}
//@ chunk-q8cqcff6.js:95567-95600 placement
function getSettingsParseErrorsForSource(source) {
  return getSettingsParseErrorsForSource_2(source, buildSettingsContext());
}
//@ chunk-q8cqcff6.js:95600-95634 placement
function getRuleAnchorRootForSource(source) {
  return getRuleAnchorRootForSource_2(source, buildSettingsContext());
}
//@ chunk-q8cqcff6.js:95634-95664 placement
function getLegacyLocalSettingsFilePath() {
  return getLegacyLocalSettingsFilePath_3(buildSettingsContext());
}
//@ chunk-q8cqcff6.js:95664-95757 placement (2.1.88 match: supportsPersistence, 0.797)
function projectSettingsAliasesUserSettings() {
  let settingsFilePathForSource = getSettingsFilePathForSource("projectSettings");
  let settingsFilePathForSource_2 = getSettingsFilePathForSource("userSettings");
  return (
    !!settingsFilePathForSource &&
    !!settingsFilePathForSource_2 &&
    resolve(settingsFilePathForSource) === resolve(settingsFilePathForSource_2)
  );
}
//@ chunk-q8cqcff6.js:95757-95833 placement (2.1.88 match: _temp8, 1)
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
  let state = commandSyncNameState();
  if (state.policy.baseNamesHelper === undefined) {
    let basePolicySettings = getBasePolicySettings();
    state.policy.baseNamesHelper =
      basePolicySettings?.policyHelper != null || basePolicySettings?.policyHelpers != null;
  }
  return state.policy.baseNamesHelper;
}
//@ chunk-q8cqcff6.js:96072-96178 placement
function getManagedFileLoadState() {
  let state = commandSyncNameState();
  state.policy.managedFileLoadState ??= loadStateOf(loadManagedFileSettings());
  return state.policy.managedFileLoadState;
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
function machinePolicyKeepsPriorityOver(orgUuid) {
  return isMdmLoadInFlight() || machinePolicyKeepsPriority(buildSettingsContext(), orgUuid);
}
//@ chunk-q8cqcff6.js:96336-96375 placement (2.1.88 match: getSettingsForSource, 0)
/**
 * 取某来源的有效设置（来源未启用返回 null），带 perSource 缓存。
 */
function getSettingsForSource(source) {
  return isSettingSourceEnabled(source) ? getSettingsForSourceGuarded(source) : null;
}
//@ chunk-q8cqcff6.js:96375-96403 placement
function getSettingsForSourceTightenOnly(source) {
  return settingsForSourceOrGuarded(source);
}
//@ chunk-q8cqcff6.js:96403-96431 placement
function getSettingsForSourceForUpkeep(source) {
  return settingsForSourceOrGuarded(source);
}
//@ chunk-q8cqcff6.js:96431-96479 placement
function settingsForSourceOrGuarded(source) {
  return (
    getSettingsForSource(source) ??
    (isSettingSourceEnabled(source) ? null : getSettingsForSourceGuarded(source))
  );
}
//@ chunk-q8cqcff6.js:96479-96627 placement (2.1.88 match: _temp5, 1)
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
function getSettingsForSourceWriteSeed(source) {
  return getSettingsForSourceUncached(source, buildSettingsContext(), {
    includeLegacyLocalSettings: false,
  });
}
//@ chunk-q8cqcff6.js:96939-96952 placement
var BACKGROUND_SETTINGS_WORK_WAIT_MS = 5000;
//@ chunk-q8cqcff6.js:96952-97028 placement
function settleBackgroundSettingsWork(timeoutMs = BACKGROUND_SETTINGS_WORK_WAIT_MS) {
  return withDeadline(commandSyncNameState().backgroundWorkTail, timeoutMs).then(() => {
    return;
  });
}
//@ chunk-q8cqcff6.js:97028-97055 placement
var repoDirSettingsParses; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-q8cqcff6.js:97028", () => {
  repoDirSettingsParses = new HostScoped(() => new Map());
});
//@ chunk-q8cqcff6.js:97055-97796 placement
function readRepoDirSettingsFresh(source) {
  let settingsContext = buildSettingsContext();
  let filtered = [
    getSettingsFilePathForSource_3(source, settingsContext),
    ...(source === "localSettings" ? [getLegacyLocalSettingsFilePath_3(settingsContext)] : []),
  ].filter((file) => file !== undefined);
  let parsed = repoDirSettingsParses.of(getRootSession().host);
  let mapped = filtered.map((file) => ({
    file,
    ...parseSettingsFileIfChanged(file, parsed, source === "userSettings"),
  }));
  let filtered_2 = mapped.filter(
    ({ settings, errors }) => settings === null && errors.some((error) => error.severity !== "warning"),
  );
  let [first, second] = mapped.map(
    ({ file, settings, textRead }) =>
      settings ?? (textRead === undefined ? clone(parsed.get(file)?.parsed.settings ?? null) : null),
  );
  let merged =
    second === null || second === undefined
      ? (first ?? null)
      : mergeWithAssigner_2({}, second, first ?? {}, settingsMergeCustomizer);
  if (filtered_2.length === 0)
    return {
      kind: "in_effect",
      settings: merged,
    };
  let flattened = filtered_2.flatMap(({ textRead }) => textRead ?? []);
  if (flattened.length === filtered_2.length)
    return {
      kind: "some_do_not_load",
      texts: flattened,
      settingsOfTheOtherFile: merged,
    };
  return filtered_2.every(({ file, textRead }) => textRead !== undefined || parsed.has(file))
    ? {
        kind: "unreadable_for_now",
        settingsAsLastRead: merged,
      }
    : {
        kind: "unreadable",
        settingsOfTheOtherFile: merged,
      };
}
//@ chunk-q8cqcff6.js:97796-97803 placement
var settingsMemo;
//@ chunk-q8cqcff6.js:97803-98000 placement
function settingsContextForRepoTier() {
  let settingsContext = buildSettingsContext();
  let memo = settingsMemo;
  if (memo === undefined) return settingsContext;
  let canonicalGitRoot = settingsContext.canonicalGitRoot;
  return {
    ...settingsContext,
    cwd: memo.cwd,
    projectConfigDir: memo.projectConfigDir,
    canonicalGitRoot: (path) => (path === memo.cwd ? memo.canonicalRoot : (canonicalGitRoot?.(path) ?? null)),
  };
}
//@ chunk-q8cqcff6.js:98000-98399 placement
function repoTierFileLeadsAway(file) {
  let fsImplementation = getFsImplementation();
  try {
    let linksResolvedPath = vetRepoSettingsPath(fsImplementation, file, {
      failClosed: true,
    }).linksResolvedPath;
    if (linksResolvedPath === undefined) {
      for (let path of [dirname(file), file])
        try {
          if (fsImplementation.lstatSync(path).isSymbolicLink()) return true;
        } catch (error) {
          if (!isENOENT(error)) return true;
        }
      return readRepoTierFileText(file) !== "absent";
    }
    let parentVet = vetRepoSettingsPath(fsImplementation, dirname(dirname(file)), {
      failClosed: true,
    });
    let expected = join(
      parentVet.linksResolvedPath ?? parentVet.resolvedPath,
      basename(dirname(file)),
      basename(file),
    );
    if (!samePath(linksResolvedPath, expected)) return true;
    let stats = fsImplementation.lstatSync(linksResolvedPath);
    return !stats.isFile() || stats.nlink > 1;
  } catch {
    return true;
  }
}
//@ chunk-q8cqcff6.js:98399-98751 placement
/**
 * 判断路径（含解析链接后的真实路径，macOS 忽略大小写）是否就是用户设置文件之一。
 */
function isUserSettingsPath(settingsFilePathForSource, context) {
  let settingsFilePathForSource_2 = getSettingsFilePathForSource_3("userSettings", context);
  let userPaths = [
    ...(settingsFilePathForSource_2 ? [settingsFilePathForSource_2] : []),
    ...userSettingsHomes().flatMap((home) =>
      Object.values(USER_SETTINGS_FILE_NAMES).map((name) => join(home, name)),
    ),
  ];
  let fsImplementation = getFsImplementation();
  let targetPaths = [resolve(settingsFilePathForSource)];
  try {
    let vet = vetRepoSettingsPath(fsImplementation, settingsFilePathForSource);
    targetPaths.push(vet.linksResolvedPath ?? vet.resolvedPath);
  } catch {}
  let isMac = getPlatform() === "macos";
  return userPaths.some((candidate) =>
    [resolve(candidate), safeResolvePath(fsImplementation, candidate).resolvedPath].some((resolved) =>
      targetPaths.some(
        (target) =>
          samePath(target, resolved) ||
          (isMac &&
            normalizePathForCompare(target).toLowerCase() ===
              normalizePathForCompare(resolved).toLowerCase()),
      ),
    ),
  );
}
//@ chunk-q8cqcff6.js:98751-99039 placement
function repoTierFileSlots() {
  let context = settingsContextForRepoTier();
  let settingsFilePathForSource = getSettingsFilePathForSource_3("projectSettings", context);
  let slots = {
    project:
      settingsFilePathForSource && !isUserSettingsPath(settingsFilePathForSource, context)
        ? settingsFilePathForSource
        : null,
    local: getSettingsFilePathForSource_3("localSettings", context) ?? null,
    legacy: getLegacyLocalSettingsFilePath_3(context) ?? null,
  };
  return {
    key: `${context.cwd ?? ""}\x00${context.projectConfigDir ?? ""}`,
    ...slots,
    linkedAway: ["project", "local", "legacy"].filter((key) => {
      let path = slots[key];
      return path !== null && repoTierFileLeadsAway(path);
    }),
  };
}
//@ chunk-q8cqcff6.js:99039-99200 placement
function readRepoTierFileText(filePath) {
  let cache = new Map();
  let settingsFileIfChanged = parseSettingsFileIfChanged(filePath, cache);
  let entry = cache.get(filePath);
  if (entry !== undefined)
    return {
      text: entry.content,
    };
  return settingsFileIfChanged.errors.some((error) => error.severity !== "warning") ? "unreadable" : "absent";
}
//@ chunk-q8cqcff6.js:99200-99629 placement
function readRepoTiersFresh(cachedFiles = new Map()) {
  let store = new SettingsCacheStore();
  for (let [path, entry] of cachedFiles) store.parsedFiles.set(path, entry);
  let localContext = {
    ...settingsContextForRepoTier(),
    store,
  };
  let tiers = new Map();
  for (let source of REPO_DIR_SETTING_SOURCE_LIST) {
    if (
      source === "projectSettings" &&
      (() => {
        let settingsFilePathForSource = getSettingsFilePathForSource_3(source, localContext);
        let settingsFilePathForSource_2 = getSettingsFilePathForSource_3("userSettings", localContext);
        return (
          !!settingsFilePathForSource &&
          !!settingsFilePathForSource_2 &&
          samePath(resolve(settingsFilePathForSource), resolve(settingsFilePathForSource_2))
        );
      })()
    )
      continue;
    let legacyPath = source === "localSettings" ? getLegacyLocalSettingsFilePath_3(localContext) : undefined;
    tiers.set(source, {
      settings: getSettingsForSource_3(source, localContext),
      errors: getSettingsParseErrorsForSource_2(source, localContext),
      unfiltered: getSettingsForSourceUncached(source, localContext),
      ...(source === "localSettings" && {
        legacy: legacyPath === undefined ? null : (parseSettingsFile_3(legacyPath, store).settings ?? null),
      }),
    });
  }
  return tiers;
}
//@ chunk-q8cqcff6.js:99629-99636 placement
var rawSettingsCache;
//@ chunk-q8cqcff6.js:99636-100184 placement
function holdRepoTiers(options) {
  let state = commandSyncNameState();
  let began = !state.repoTierFreeze.isHeld();
  let settingsContext = buildSettingsContext();
  if (began)
    settingsMemo = {
      cwd: settingsContext.cwd,
      projectConfigDir: settingsContext.projectConfigDir,
      canonicalRoot:
        settingsContext.cwd === null
          ? null
          : (settingsContext.canonicalGitRoot?.(settingsContext.cwd) ?? null),
    };
  let freeze;
  try {
    freeze =
      options === undefined
        ? state.repoTierFreeze.engage(readRepoTiersFresh)
        : state.repoTierFreeze.engage(
            () => readRepoTiersFresh(options.files),
            () => readRepoTiersFresh(),
          );
  } catch (error) {
    if (began) settingsMemo = undefined;
    throw error;
  }
  if (began) rawSettingsCache = options?.onOwnWrite;
  try {
    state.invalidateAll();
  } catch (error) {
    freeze.abandon();
    if (!state.repoTierFreeze.isHeld()) {
      settingsMemo = undefined;
      rawSettingsCache = undefined;
    }
    throw error;
  }
  return {
    began,
    release: () => {
      let result = freeze.release();
      if (result.last) {
        settingsMemo = undefined;
        rawSettingsCache = undefined;
        state.invalidateAll();
      }
      return result;
    },
  };
}
//@ chunk-q8cqcff6.js:100184-100214 placement
function repoTiersFrom(seeds) {
  return readRepoTiersFresh(seeds);
}
//@ chunk-q8cqcff6.js:100214-100290 placement
function repoTierFolderKey() {
  let context = settingsContextForRepoTier();
  return `${context.cwd ?? ""}\x00${context.projectConfigDir ?? ""}`;
}
//@ chunk-q8cqcff6.js:100290-100402 placement
function lingerRepoTiers(files, repoTiersRefresher) {
  let state = commandSyncNameState();
  if (state.repoTierFreeze.isHeld()) return;
  state.repoTierFreeze.linger(files, repoTiersRefresher);
  state.invalidateAll();
}
//@ chunk-q8cqcff6.js:100402-100494 placement
function compareRepoTiersWithHeld() {
  return commandSyncNameState().repoTierFreeze.differingTiers(readRepoTiersFresh()).length === 0
    ? "same"
    : "changed";
}
//@ chunk-q8cqcff6.js:100494-101792 placement
function readLocalSettingsAliases(source) {
  let repoTierFreeze = commandSyncNameState().repoTierFreeze;
  let frozen =
    REPO_DIR_SETTING_SOURCES.has(source) &&
    repoTierFreeze.isHeld() &&
    repoTierFreeze.baselineTier(source) !== undefined;
  let differs = false;
  let readings = new Map();
  let identities = new Map();
  let resolvedIdentity = (path) => {
    try {
      return safeResolvePath(getFsImplementation(), path).resolvedPath;
    } catch {
      return path;
    }
  };
  return {
    before: (next, preserveOnWrite, writtenPath) => {
      let baseline = frozen ? repoTierFreeze.baselineTier(source) : undefined;
      if (baseline === undefined) return;
      let context = settingsContextForRepoTier();
      let legacyPath = source === "localSettings" ? getLegacyLocalSettingsFilePath_3(context) : undefined;
      let legacyParsed =
        legacyPath === undefined ? undefined : parseSettingsFile_3(legacyPath, new SettingsCacheStore());
      if (legacyPath !== undefined && legacyParsed !== undefined) {
        readings.set(legacyPath, legacyParsed);
        identities.set(legacyPath, resolvedIdentity(legacyPath));
      }
      let path = getSettingsFilePathForSource_3(source, context);
      if (path !== writtenPath) {
        differs = true;
        return;
      }
      let parsed = path === undefined ? undefined : parseSettingsFile_3(path, new SettingsCacheStore());
      if (path !== undefined && parsed !== undefined) {
        readings.set(path, parsed);
        identities.set(path, resolvedIdentity(path));
      }
      let content =
        next === null
          ? null
          : parseSettingsContent(jsonStringify(next), getSettingsFilePathForSource_3(source, context) ?? "");
      let settings = content?.settings ?? null;
      let merged = legacyParsed?.settings
        ? mergeWithAssigner_2(clone(legacyParsed.settings), settings ?? {}, settingsMergeCustomizer)
        : settings;
      let errors = [...(content?.errors ?? []), ...(legacyParsed?.errors ?? [])];
      let normalize = (value) => {
        let parsed = value && safeParseJSON(jsonStringify(value), false);
        return typeof parsed === "object" ? nullIfEmptyObject(parsed) : parsed;
      };
      let included = repoTierFreeze.differingTiers(readRepoTiersFresh(readings)).includes(source);
      let keepErrors = (errors) =>
        errors.filter(
          (error) =>
            error.file === legacyPath || ((preserveOnWrite || error.preserveOnWrite) && !("alias" in error)),
        );
      differs =
        included ||
        !import_sortedIndex_2(normalize(merged), normalize(baseline.unfiltered)) ||
        !import_sortedIndex_2(keepErrors(errors), keepErrors(baseline.errors)) ||
        !import_sortedIndex_2(normalize(parsed?.settings ?? null), normalize(settings));
    },
    noteRead: ({ path, content }) => {
      let before = readings.get(path);
      let settingsContent = parseSettingsContent(content, path);
      if (
        frozen &&
        (before === undefined ||
          !import_sortedIndex_2(
            nullIfEmptyObject(settingsContent.settings),
            nullIfEmptyObject(before.settings),
          ) ||
          !import_sortedIndex_2(settingsContent.errors, before.errors))
      )
        differs = true;
    },
    after: ({ path, content }) => {
      let settingsContent = parseSettingsContent(content, path);
      let identity = identities.get(path);
      readings.set(path, settingsContent);
      for (let key of readings.keys())
        if (key !== path && identity !== undefined && identities.get(key) === identity)
          readings.set(key, settingsContent);
      if (frozen && !differs && repoTierFreeze.isHeld()) {
        repoTierFreeze.rebaseline(readRepoTiersFresh(readings), [source]);
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
function withRepoTiersLive(fn) {
  let state = commandSyncNameState();
  if (!state.repoTierFreeze.isHeld()) return fn();
  try {
    return state.repoTierFreeze.whileLive(fn);
  } finally {
    state.invalidateAll();
  }
}
//@ chunk-q8cqcff6.js:101928-101979 placement
function isRepoTierFreezeHeld() {
  return commandSyncNameState().repoTierFreeze.isHeld();
}
//@ chunk-q8cqcff6.js:101979-102039 placement
function isRepoTierAnsweredByACopy(source) {
  return commandSyncNameState().repoTierFreeze.tier(source) !== undefined;
}
//@ chunk-q8cqcff6.js:102039-102153 placement
function flagInlineConsentDropped() {
  let settingsContext = buildSettingsContext();
  if (!isPlainObject(settingsContext.flagInline)) return false;
  if (!hasAttributionSettings(settingsContext.flagInline)) return false;
  return parseInlineFlagSettings(settingsContext).settings === null;
}
//@ chunk-q8cqcff6.js:102153-102260 placement
function flagInlineSettingDropped(key) {
  let settingsContext = buildSettingsContext();
  if (!isPlainObject(settingsContext.flagInline) || !(key in settingsContext.flagInline)) return false;
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
function hasAttributionSettings(settings) {
  if (!isPlainObject(settings)) return false;
  let attribution = settings.attribution;
  return (
    "includeCoAuthoredBy" in settings ||
    attribution === false ||
    (isPlainObject(attribution) &&
      ("commitTrailers" in attribution || "commit" in attribution || "pr" in attribution))
  );
}
//@ chunk-q8cqcff6.js:102666-102907 placement (2.1.88 match: getSettingsForSourceUncached, 0.566)
function flagFileConsentDropped() {
  let remoteSettings = buildSettingsContext();
  let path = getSettingsFilePathForSource_3("flagSettings", remoteSettings);
  if (!path) return false;
  if (parseSettingsFile_3(path, remoteSettings.store, remoteSettings.flagExpectedContent).settings !== null)
    return false;
  if (remoteSettings.flagExpectedContent !== undefined) {
    let expected = safeParseJSON(remoteSettings.flagExpectedContent, false);
    if (!isPlainObject(expected)) return true;
    return hasAttributionSettings(expected);
  }
  return fileMayDropConsent(path);
}
//@ chunk-q8cqcff6.js:102907-103087 placement
function fileMayDropConsent(path, clamp = false) {
  if (isDiskless()) return false;
  let parsed;
  try {
    let resolved =
      clamp || isInClaudeConfigHome(path)
        ? safeResolvePath(getFsImplementation(), path)
        : vetRepoSettingsPath(getFsImplementation(), path);
    parsed = safeParseJSON(readFileSync(resolved.resolvedPath, MAX_SETTINGS_JSON_BYTES), false);
  } catch (error) {
    if (isENOENT(error)) return false;
    return true;
  }
  if (!isPlainObject(parsed)) return true;
  return hasAttributionSettings(parsed);
}
//@ chunk-q8cqcff6.js:103087-103605 placement (2.1.88 match: getSettingsForSourceLenient_FOR_EDITING_ONLY_NOT_FOR_READING, 0.192)
function getRawSettingFromRejectedSource(source, key) {
  let settingsContext = buildSettingsContext();
  let isRejected = (parsed) =>
    parsed.settings === null && parsed.errors.some((error) => error.severity !== "warning");
  if (source === "flagSettings" && settingsContext.flagInline && key in settingsContext.flagInline) {
    let filePath = parseInlineFlagSettings(settingsContext);
    if (isRejected(filePath)) return settingsContext.flagInline[key];
    if (filePath.settings?.[key] !== undefined) return;
  }
  let settingsFilePathForSource = getSettingsFilePathForSource_3(source, settingsContext);
  if (!settingsFilePathForSource) return;
  let flagExpectedContent = source === "flagSettings" ? settingsContext.flagExpectedContent : undefined;
  if (!isRejected(parseSettingsFile_3(settingsFilePathForSource, settingsContext.store, flagExpectedContent)))
    return;
  if (flagExpectedContent === undefined && settingsContext.diskless) return;
  let parsed;
  try {
    if (flagExpectedContent !== undefined) parsed = safeParseJSON(flagExpectedContent, false);
    else {
      let { resolvedPath } = safeResolvePath(getFsImplementation(), settingsFilePathForSource);
      parsed = safeParseJSON(readFileSync(resolvedPath, MAX_SETTINGS_JSON_BYTES), false);
    }
  } catch {
    return;
  }
  if (!isPlainObject(parsed) || !(key in parsed)) return;
  return parsed[key];
}
//@ chunk-q8cqcff6.js:103605-103931 placement
async function sourceFileConsentDropped(source, storage) {
  let settingsContext = buildSettingsContext();
  let path = getSettingsFilePathForSource_3(source, settingsContext);
  if (!path) return false;
  let settingsFile = parseSettingsFile_3(path, settingsContext.store);
  if (settingsFile.settings !== null) return false;
  if (settingsFile.errors.length === 0) return false;
  if (isStorageV5Enabled() && storage !== undefined && isDefaultUserSettingsPath(source, path)) {
    let stored;
    try {
      stored = await readStoredUserSettings(storage);
    } catch {
      return true;
    }
    switch (stored.kind) {
      case "absent":
        return false;
      case "object":
        return hasAttributionSettings(stored.raw);
      default:
        return true;
    }
  }
  return fileMayDropConsent(path, source === "userSettings");
}
//@ chunk-q8cqcff6.js:103931-103994 placement (2.1.88 match: _temp5, 1)
function isDefaultUserSettingsPath(a_0, filePath) {
  return a_0 === "userSettings" && basename(filePath) === USER_SETTINGS_FILE_NAMES.default;
}
//@ chunk-q8cqcff6.js:103994-104349 placement
/**
 * 从存储后端读取用户设置：区分不可读、不存在、过大、空、非对象与正常对象（附原始内容）。
 */
async function readStoredUserSettings(storage) {
  let read = await storage.read([STORAGE_SPACES.userSettings()]);
  if (!read.ok)
    return {
      kind: "unreadable",
      code: read.error.code,
    };
  let item = read.value.items[0];
  if (!item.found)
    return {
      kind: "absent",
    };
  if (item.totalBytes > MAX_SETTINGS_JSON_BYTES)
    return {
      kind: "oversize",
    };
  let text = decodeTextBuffer(item.value);
  if (!text.trim())
    return {
      kind: "empty",
    };
  let parsed = safeParseJSON(text, false);
  if (!isPlainObject(parsed))
    return {
      kind: "non-object",
    };
  return {
    kind: "object",
    raw: parsed,
    content: text,
  };
}
//@ chunk-q8cqcff6.js:104349-104493 placement
function legacyLocalConsentDropped() {
  let settingsContext = buildSettingsContext();
  let path = getLegacyLocalSettingsFilePath_3(settingsContext);
  if (!path) return false;
  let settingsFile = parseSettingsFile_3(path, settingsContext.store);
  if (settingsFile.settings !== null) return false;
  if (settingsFile.errors.length === 0) return false;
  return fileMayDropConsent(path);
}
//@ chunk-q8cqcff6.js:104493-104670 placement
function getLegacyLocalSettingsOverlay() {
  let settingsContext = buildSettingsContext();
  let frozen = settingsContext.store.repoTierFreeze.tier("localSettings");
  if (frozen?.legacy !== undefined) return frozen.legacy;
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
    let state = commandSyncNameState();
    state.policy.machineMayPinSignInOrg ??= machineAdminMayPinSignInOrg_2(buildSettingsContext());
    return state.policy.machineMayPinSignInOrg;
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
function getAdminTierEnvValue(name) {
  let adminTierEnvView = commandSyncNameState().policy.adminTierEnvView;
  if (adminTierEnvView !== undefined) return adminTierEnvView[name];
  return getAdminTierEnvValue_2(buildSettingsContext(), name);
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
//@ chunk-q8cqcff6.js:105717-105783 placement (2.1.88 match: getMcpAllowlistSettings, 0.55)
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
  let mcpsOnly = shouldAllowManagedMcpServersOnly(mcpPolicyView);
  return {
    mcpLockFromLowerSource: mcpsOnly && mcpPolicyView.slot?.allowManagedMcpServersOnly !== true,
    mcpAllowlistFromLowerSource:
      mcpsOnly &&
      mcpPolicyView.slot?.allowedMcpServers === undefined &&
      getAllowedMcpServersFromTiers(mcpPolicyView) !== undefined,
    mcpShadowedSourceCount: shadowedMcpPolicySources.length,
    mcpShadowedKeyCount: shadowedMcpPolicySources.reduce((acc, { keys }) => acc + keys.length, 0),
  };
}
//@ chunk-q8cqcff6.js:106097-106136 placement (2.1.88 match: getInitialSettings, 1)
/**
 * 合并后的设置（getSettingsWithErrors().settings 或 {}），旧版 getInitialSettings。
 */
function getInitialSettings_2() {
  return getSettingsWithErrors_2().settings || {};
}
//@ chunk-q8cqcff6.js:106136-106146 placement (2.1.88 match: getSettings_DEPRECATED, 0)
var getSettings_DEPRECATED = getInitialSettings_2;
//@ chunk-q8cqcff6.js:106146-106299 placement (2.1.88 match: getSettingsWithSources, 1)
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
function getEffectiveSettingSource_2(key) {
  let enabledSettingSources = getEnabledSettingSources_2();
  for (let j = enabledSettingSources.length - 1; j >= 0; j--) {
    let source = enabledSettingSources[j];
    if (getSettingsForSource(source)?.[key] !== undefined) return source;
  }
  return null;
}
//@ chunk-q8cqcff6.js:106411-106583 placement (2.1.88 match: getSettingsWithErrors, 0.574)
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
//@ chunk-q8cqcff6.js:106583-107046 placement (2.1.88 match: getManagedFileSettingsPresence, 0.548)
/**
 * 检查托管目录中 managed-settings.json 与 managed-settings.d/*.json 是否有内容，供 /status 显示 file / drop-ins。
 */
function getManagedFileSettingsPresence() {
  if (isDiskless())
    return {
      hasBase: false,
      hasDropIns: false,
    };
  for (let dir of managedFileSettingsDirs(wslInheritsSettings())) {
    let hasBase = isPolicyTier(parseSettingsFile(join(dir, "managed-settings.json"), undefined, true));
    let hasDropIns = false;
    try {
      let dropInDir = join(dir, "managed-settings.d");
      let isPolicy = (name) => isPolicyTier(parseSettingsFile(join(dropInDir, name), undefined, true));
      let listing = commandSyncNameState().primedFolderListing(dropInDir);
      if (listing !== undefined) hasDropIns = listing.some(isPolicy);
      else
        hasDropIns = getFsImplementation()
          .readdirSync(dropInDir)
          .some((dirent) => {
            if (!(dirent.isFile() || dirent.isSymbolicLink()) || !isManagedSettingsDropInName(dirent.name))
              return false;
            return isPolicy(dirent.name);
          });
    } catch {}
    if (hasBase || hasDropIns)
      return {
        hasBase,
        hasDropIns,
      };
  }
  return {
    hasBase: false,
    hasDropIns: false,
  };
}
//@ chunk-q8cqcff6.js:107046-107335 placement
function getBasePolicySettings() {
  let context = {
    ...buildSettingsContext(),
    helper: undefined,
  };
  let { present, heldEmpty } = resolvePolicySettings(context);
  if (heldEmpty) return {};
  if (present.remote) return parseRemoteManagedSettings_2(context).settings;
  if (present.mdm) return mdmResult().settings;
  if (present.file) return loadManagedFileSettings().settings;
  let { settings } = parseParentManagedSettings(context);
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
  let state = commandSyncNameState();
  let origin = state.policy.origin;
  if (origin !== undefined) return origin.value;
  let policySettingsOrigin = getPolicySettingsOrigin_2_2(buildSettingsContext());
  state.policy.origin = {
    value: policySettingsOrigin,
  };
  return policySettingsOrigin;
}
//@ chunk-q8cqcff6.js:107563-107746 placement
function getVouchedPolicyTierSettings() {
  let state = commandSyncNameState();
  let remoteVerified = isRemoteManagedSettingsVerified();
  let vouchedTiers = state.policy.vouchedTiers;
  if (vouchedTiers !== undefined && vouchedTiers.remoteVerified === remoteVerified) return vouchedTiers.value;
  let vouchedPolicyTierSettings = getVouchedPolicyTierSettings_2(buildSettingsContext(), remoteVerified);
  state.policy.vouchedTiers = {
    remoteVerified,
    value: vouchedPolicyTierSettings,
  };
  return vouchedPolicyTierSettings;
}
//@ chunk-q8cqcff6.js:107746-107937 placement
function getVouchedAdminPolicyTier() {
  let state = commandSyncNameState();
  let remoteVerified = isRemoteManagedSettingsVerified();
  let vouchedAdminTier = state.policy.vouchedAdminTier;
  if (vouchedAdminTier !== undefined && vouchedAdminTier.remoteVerified === remoteVerified)
    return vouchedAdminTier.value;
  let vouchedAdminPolicyTier = getVouchedAdminPolicyTier_2(buildSettingsContext(), remoteVerified);
  state.policy.vouchedAdminTier = {
    remoteVerified,
    value: vouchedAdminPolicyTier,
  };
  return vouchedAdminPolicyTier;
}
//@ chunk-q8cqcff6.js:107937-108074 placement
function getHostPolicyLoginPins() {
  let state = commandSyncNameState();
  let hostLoginPins = state.policy.hostLoginPins;
  if (hostLoginPins !== undefined) return hostLoginPins.value;
  let hostPolicyLoginPins = getHostPolicyLoginPins_2(buildSettingsContext());
  state.policy.hostLoginPins = {
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
  let state = commandSyncNameState();
  let machineCredentialInputs = state.policy.machineCredentialInputs;
  if (machineCredentialInputs !== undefined) return machineCredentialInputs;
  let context = buildSettingsContext();
  let managedFileSettings = loadManagedFileSettings_2(context);
  context.file = () => managedFileSettings;
  let machineAdminPolicyTiers = getMachineAdminPolicyTiers_2(context);
  let inputs = {
    envs: machineAdminPolicyTiers.flatMap((machineAdminPolicyTier) =>
      Object.entries(machineAdminPolicyTier.env ?? {}).map(([key, value]) => ({
        [key.toUpperCase()]: value,
      })),
    ),
    apiKeyHelper: machineAdminPolicyTiers.some(
      (machineAdminPolicyTier) => machineAdminPolicyTier.apiKeyHelper !== undefined,
    ),
    unread: isMachineAdminSourceUnread(context),
  };
  state.policy.machineCredentialInputs = inputs;
  return inputs;
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
  let state = commandSyncNameState();
  let slotAdminOrParentComposed = state.policy.slotAdminOrParentComposed;
  if (slotAdminOrParentComposed !== undefined) return slotAdminOrParentComposed;
  let result = isPolicySlotAdminOrParentComposed_2(buildSettingsContext());
  state.policy.slotAdminOrParentComposed = result;
  return result;
}
//@ chunk-q8cqcff6.js:108660-108885 placement
function anyAdminPolicyTierGovernsRetention() {
  let state = commandSyncNameState();
  let adminRetentionGoverned = state.policy.adminRetentionGoverned;
  if (adminRetentionGoverned !== undefined) return adminRetentionGoverned;
  let any = [
    parseRemoteManagedSettings_2(buildSettingsContext()).settings,
    mdmResult().settings,
    loadManagedFileSettings_2(buildSettingsContext()).settings,
  ].some((settings) => settings?.cleanupPeriodDays !== undefined);
  state.policy.adminRetentionGoverned = any;
  return any;
}
//@ chunk-q8cqcff6.js:108885-109112 placement
function getPolicySettingsLoadErrors() {
  let state = commandSyncNameState();
  let loadErrors = state.policy.loadErrors;
  if (loadErrors !== undefined) return loadErrors;
  let errors = [];
  errors.push(...parseRemoteManagedSettings_2(buildSettingsContext()).errors);
  errors.push(...settingsPolicyErrors());
  errors.push(...loadManagedFileSettings().errors);
  errors.push(...parseParentManagedSettings(buildSettingsContext()).errors);
  errors.push(...startMdmPoll().errors);
  state.policy.loadErrors = errors;
  return errors;
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
function policySettingUnreadable(key) {
  return getPolicySettingsLoadErrors().some((issue) => {
    if (issue.userWritable || issue.wslIgnored || issue.file === PARENT_MANAGED_SETTINGS_SOURCE_LABEL)
      return false;
    if (issue.path === "") return true;
    return issue.path === key && !issue.statusOnly;
  });
}
//@ chunk-q8cqcff6.js:109367-109553 placement
function getAdminLoadErrors() {
  let state = commandSyncNameState();
  let adminLoadErrors = state.policy.adminLoadErrors;
  if (adminLoadErrors !== undefined) return adminLoadErrors;
  let errors = [];
  errors.push(...parseRemoteManagedSettings_2(buildSettingsContext()).errors);
  errors.push(...settingsPolicyErrors());
  errors.push(...loadManagedFileSettings().errors);
  state.policy.adminLoadErrors = errors;
  return errors;
}
//@ chunk-q8cqcff6.js:109553-109630 placement
function hasAdminPolicyLoadRecords() {
  return getAdminLoadErrors().some((issue) => issue.userWritable !== true && issue.wslIgnored !== true);
}
//@ chunk-q8cqcff6.js:109630-109890 placement
function hasMachinePluginKeyLoadRecords() {
  let state = commandSyncNameState();
  let machinePluginKeyLoadRecords = state.policy.machinePluginKeyLoadRecords;
  if (machinePluginKeyLoadRecords !== undefined) return machinePluginKeyLoadRecords;
  let any = getPolicyHelperSourceLoadErrors().some(
    (issue) =>
      issue.userWritable !== true &&
      issue.wslIgnored !== true &&
      (issue.severity !== "warning" ||
        MACHINE_PLUGIN_KEY_PATHS.includes(firstLineOf(firstLineOf(issue.path, "."), "["))),
  );
  state.policy.machinePluginKeyLoadRecords = any;
  return any;
}
//@ chunk-q8cqcff6.js:109890-110059 placement
var MACHINE_PLUGIN_KEY_PATHS; // deferred: uses SETTING_ALIASES (./marketplaceSettingsAliases.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-q8cqcff6.js:109890", () => {
  MACHINE_PLUGIN_KEY_PATHS = [
    "",
    "enabledPlugins",
    "extraKnownMarketplaces",
    "strictKnownMarketplaces",
    "prependPlugins",
    "appendPlugins",
    "policyHelper",
    "policyHelpers",
    ...SETTING_ALIASES.map((alias) => alias.alias),
  ];
});
//@ chunk-q8cqcff6.js:110059-110091 placement
function getFatalAdminPolicyLoadErrors() {
  return filterFatalPolicyErrors(getAdminLoadErrors());
}
//@ chunk-q8cqcff6.js:110091-110152 placement
function filterFatalPolicyErrors(errors) {
  return errors.filter((error) => error.severity !== "warning");
}
//@ chunk-q8cqcff6.js:110152-110415 placement
function hasSurvivingAdminPolicySource() {
  let state = commandSyncNameState();
  let adminSurvivor = state.policy.adminSurvivor;
  if (adminSurvivor !== undefined) return adminSurvivor;
  let settingsContext = buildSettingsContext();
  let helper = armedHelperOutput(settingsContext);
  let mdm = mdmResult();
  let surviving =
    (helper.composes === "tier" && !armedFromUserWritableBase() && !mdm.userWritable) ||
    authoredPolicyContent(parseRemoteManagedSettings_2(settingsContext)) ||
    (!mdm.userWritable && authoredPolicyContent(mdm));
  if (!surviving) {
    let managedFileSettings = loadManagedFileSettings();
    surviving = managedFileSettings.heldOnly !== true && authoredPolicyContent(managedFileSettings);
  }
  state.policy.adminSurvivor = surviving;
  return surviving;
}
//@ chunk-q8cqcff6.js:110415-110459 placement
function isAdminPolicyUnreadable() {
  return !hasSurvivingAdminPolicySource() && getFatalAdminPolicyLoadErrors().length > 0;
}
//@ chunk-q8cqcff6.js:110459-110494 placement
var PERMISSION_DENIED_ERRNOS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-q8cqcff6.js:110459", () => {
  PERMISSION_DENIED_ERRNOS = new Set(["EACCES", "EPERM"]);
});
//@ chunk-q8cqcff6.js:110494-110580 placement
function isPermissionDeniedPolicyError(error) {
  return (
    error.errorClass === "unreadable" &&
    error.errno !== undefined &&
    PERMISSION_DENIED_ERRNOS.has(error.errno)
  );
}
//@ chunk-q8cqcff6.js:110580-110633 placement
function adminPolicyLoadFailureRefusesLaunch() {
  return (
    !hasSurvivingAdminPolicySource() &&
    getFatalAdminPolicyLoadErrors().some((error) => !isPermissionDeniedPolicyError(error))
  );
}
//@ chunk-q8cqcff6.js:110633-110722 placement (2.1.88 match: _temp7, 1)
function policyEntryWarnings() {
  try {
    let settings = getSettingsForSource("policySettings");
    return [...deniedModelsEntryWarnings(settings), ...availableModelsExactEntryWarnings(settings)];
  } catch {
    return [];
  }
}
//@ chunk-q8cqcff6.js:110722-111545 placement
function surfaceManagedSettingsErrorsHeadless() {
  let policySettingsLoadErrors = getPolicySettingsLoadErrors();
  let notices = [
    ...helperSelectionWarnings().filter((notice) => !isInertManagedMcpServersNotice(notice.path)),
    ...policyEntryWarnings(),
  ];
  if (policySettingsLoadErrors.length === 0 && notices.length === 0) return;
  let any = policySettingsLoadErrors.some(
    (policySettingsLoadError) => policySettingsLoadError.severity !== "warning",
  );
  let any_2 = policySettingsLoadErrors.some(isBlockingSettingsIssue);
  let sections = [];
  if (policySettingsLoadErrors.length > 0) {
    let headline = any_2
      ? "Managed settings failed to load; policies from the failed source are NOT in effect:"
      : any
        ? "Managed settings contain invalid entries, including PreToolUse/PermissionRequest hooks that are NOT loaded; fix or remove each entry:"
        : "Managed settings contain invalid entries (remaining valid policies are still enforced):";
    sections.push(`${headline}
${policySettingsLoadErrors.map(formatManagedSettingsError).join(`
`)}`);
  }
  if (notices.length > 0)
    sections.push(`Managed settings notices:
${notices.map(formatManagedSettingsError).join(`
`)}`);
  process.stderr.write(`${sections.join(`
`)}
`);
  if (policySettingsLoadErrors.length === 0) return;
  logEvent("tengu_managed_settings_validation_errors", {
    error_count: policySettingsLoadErrors.length,
    remote_error_count: count(policySettingsLoadErrors, (error) => error.file === "remote managed settings"),
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
  return managedDocumentLinks().flatMap((link) => {
    let line = describeLinkedPath(link);
    return line === null ? [] : [line];
  });
}
//@ chunk-q8cqcff6.js:111721-111781 placement
function managedFileProtections() {
  getPolicySettingsLoadErrors();
  return commandSyncNameState().managedFileProtections.all();
}
//@ chunk-q8cqcff6.js:111781-111949 placement
function getManagedFileProtectionForLogging() {
  let reasons = new Set(managedFileProtections().map(([, reason]) => reason));
  let found = CONFIG_DIR_UNSAFE_REASONS.find((reason) => reasons.has(reason));
  if (found === undefined) return;
  return {
    protection: found,
    setsOrgPin: commandSyncNameState().managedFileProtections.setsOrgPin,
  };
}
//@ chunk-q8cqcff6.js:111949-112335 placement
function logManagedDocumentLinks() {
  let links = managedDocumentLinks();
  if (links.length === 0) return;
  logEvent("tengu_managed_settings_links", {
    inside_count: count(links, (link) => link.kind === "inside"),
    outside_count: count(links, (link) => link.kind === "outside"),
    unverified_count: count(links, (link) => link.kind === "unverified"),
    outside_writable_count: count(links, (link) => link.kind === "outside" && link.targetWritable === "yes"),
    outside_writable_unknown_count: count(
      links,
      (link) => link.kind === "outside" && link.targetWritable === "unknown",
    ),
  });
}
//@ chunk-q8cqcff6.js:112335-112450 placement
function formatManagedSettingsError(issue) {
  return `  ${issue.file === undefined ? "managed settings" : cleanForDisplay(issue.file)}${issue.path ? ` (${issue.path})` : ""}: ${issue.message}`;
}
//@ chunk-q8cqcff6.js:112450-112494 placement
/**
 * 写入可编辑来源（user/project/local）：读取原始文件（校验失败时保留原文以免丢失未知键），用 mergeWith 合并（undefined 表示删除键、数组整体替换），以原子写落盘（user 允许符号链接，project/local 检查父目录），写 local 时异步把 .claude/settings.local.json 加入全局 gitignore，最后刷新缓存并通知变更。storage v5 后端时写入存储记录。
 */
function updateSettingsForSource(source, transform, options, storage) {
  return updateSettingsForSourceWithTransform(source, () => transform, options, storage);
}
//@ chunk-q8cqcff6.js:112494-112706 placement (2.1.88 match: getEnabledSettingSources, 0.888)
function updateSettingsForSourceWithTransform(source, transform, options, storage) {
  if (source === "policySettings" || source === "flagSettings")
    return Promise.resolve({
      error: null,
    });
  let settingsFilePathForSource = getSettingsFilePathForSource(source);
  if (!settingsFilePathForSource)
    return Promise.resolve(
      getOriginalCwdOrNull() === null
        ? {
            error: new NoProjectDirectoryError(),
          }
        : refuseDisklessSettingsWrite(source),
    );
  return settingsWriteQueue.run(settingsFilePathForSource, () =>
    updateSettingsForSource_2(source, transform, settingsFilePathForSource, options, storage),
  );
}
//@ chunk-q8cqcff6.js:112706-112718 placement
var settingsWriteQueue; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-q8cqcff6.js:112706", () => {
  settingsWriteQueue = createKeyedQueue();
});
//@ chunk-q8cqcff6.js:112718-112819 placement
function refuseDisklessSettingsWrite(source) {
  warnDisklessSettingsWrite("settings", source);
  return {
    error: Error("This session does not write settings to disk"),
  };
}
//@ chunk-q8cqcff6.js:112819-112900 placement
function runInSettingsWriteQueue(key, fn) {
  return settingsWriteQueue.run(key, async () => {
    try {
      return await fn();
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
// deferred: uses registerWriteQueueDrain (./writeQueues.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-q8cqcff6.js:112933", () => {
  registerWriteQueueDrain(drainSettingsWrites);
});
//@ chunk-q8cqcff6.js:112942-113146 layout
async function writeSettingsFileAtomic(path, text, options) {
  try {
    await writeFileAtomic(path, text, options);
  } catch (error) {
    if (!(error instanceof SymlinkWriteRefusedError) || !(await neverSettingsSave(path))) throw error;
    logForDebugging(`Writing settings through symlinked path ${path}`);
    await writeFileAtomic(path, text, {
      ...options,
      allowSymlink: true,
      checkParentDir: false,
    });
  }
}
//@ chunk-q8cqcff6.js:113146-113176 layout
async function neverSettingsSave(path) {
  return false;
}
//@ chunk-q8cqcff6.js:113176-113230 layout
function sanitizeRawSettingsForWrite(raw, path) {
  let workingCopy = clone(raw);
  applySettingAliases(workingCopy, path);
  coerceStringListSettings(workingCopy);
  return workingCopy;
}
//@ chunk-q8cqcff6.js:113230-113295 layout
class SettingsWriteRefusedError extends Error {
  why;
  constructor(why, message) {
    super(message);
    this.why = why;
  }
}
//@ chunk-q8cqcff6.js:113295-113909 layout
function decodeStoredSettingsRecord(storedUserSettings, path) {
  switch (storedUserSettings.kind) {
    case "object": {
      let settingsContent = parseSettingsContent(storedUserSettings.content, path);
      let keepRaw =
        settingsContent.settings === null || settingsContent.errors.some((error) => error.preserveOnWrite);
      return {
        settings: keepRaw
          ? sanitizeRawSettingsForWrite(storedUserSettings.raw, path)
          : settingsContent.settings,
        raw: keepRaw,
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
//@ chunk-q8cqcff6.js:113909-117127 callgraph-witnessed (2.1.88 match: updateSettingsForSource, 0.24)
async function updateSettingsForSource_2(source, transform, settingsFilePathForSource, options, storage) {
  let useStorage =
    isStorageV5Enabled() &&
    storage !== undefined &&
    isDefaultUserSettingsPath(source, settingsFilePathForSource);
  if (isDiskless() && !useStorage) return refuseDisklessSettingsWrite(settingsFilePathForSource);
  let skipRevoke = options?.legacyRevocation === "skip";
  let error = null;
  let release;
  using scope = {
    [Symbol.dispose]: () => release?.(),
  };
  let storageHandle = useStorage && isDiskless() ? storage : undefined;
  try {
    let filePath = readLocalSettingsAliases(source);
    let usedRaw = false;
    let current = storageHandle
      ? null
      : getSettingsForSourceUncached(source, buildSettingsContext(), {
          includeLegacyLocalSettings: false,
        });
    let preserveOnWrite =
      current !== null &&
      parseSettingsFile_3(settingsFilePathForSource, buildSettingsContext().store).errors.some(
        (error) => error.preserveOnWrite,
      );
    if (preserveOnWrite) current = null;
    if (!current && !storageHandle) {
      let content = null;
      try {
        let vet =
          source === "userSettings" || isInClaudeConfigHome(settingsFilePathForSource)
            ? safeResolvePath(getFsImplementation(), settingsFilePathForSource)
            : await vetRepoSettingsPathAsync(getFsImplementation(), settingsFilePathForSource);
        content = (await readFileChecked(vet.resolvedPath, MAX_SETTINGS_JSON_BYTES)).content;
      } catch (error) {
        if (!isENOENT(error)) throw error;
      }
      if (content !== null && content.trim() !== "") {
        let parsed = safeParseJSON(content, false);
        if (parsed === null) {
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
        if (parsed && typeof parsed === "object") {
          current = sanitizeRawSettingsForWrite(parsed, settingsFilePathForSource);
          usedRaw = true;
          logForDebugging(
            preserveOnWrite
              ? `Using raw settings from ${settingsFilePathForSource} so entries this build does not recognize survive the write`
              : `Using raw settings from ${settingsFilePathForSource} due to validation failure`,
          );
        }
      }
    }
    if (storageHandle) {
      let decoded = decodeStoredSettingsRecord(
        await readStoredUserSettings(storageHandle),
        settingsFilePathForSource,
      );
      current = decoded.settings;
      usedRaw = decoded.raw;
    }
    filePath.before(current ?? null, usedRaw, settingsFilePathForSource);
    let rawData = transform(current ?? null);
    if (rawData === null) {
      if (source === "localSettings" && !skipRevoke) {
        let revoked = await revokeFromLegacyLocalSettings(transform, filePath);
        if (revoked.error)
          return {
            error: revoked.error,
          };
        if (revoked.changed) {
          if (isStorageV5Enabled() && storage !== undefined)
            release = await mirrorUserSettingsWrite(storage, settingsFilePathForSource);
          try {
            getSettingsWithErrors_2();
          } catch (error) {
            logError(error);
          }
          emitSettingsChanged(source);
        }
      }
      return {
        error: null,
      };
    }
    if (!isDiskless()) await getFsImplementation().mkdir(dirname(settingsFilePathForSource));
    let updatedSettings = mergeWithAssigner_2(current || {}, rawData, (previous, srcValue, key, object) => {
      if (srcValue === undefined && object && typeof key === "string") {
        delete object[key];
        return;
      }
      if (Array.isArray(srcValue)) return srcValue;
      if (key === "extraKnownMarketplaces" && isPlainObject(previous) && isPlainObject(srcValue))
        return mergeExtraKnownMarketplacesByEntry(previous, srcValue);
      return;
    });
    let text =
      jsonStringify(updatedSettings, null, 2) +
      `
`;
    if (storageHandle && Buffer.byteLength(text) > MAX_SETTINGS_JSON_BYTES)
      throw new SettingsWriteRefusedError(
        "result_oversize",
        "Your saved settings would be too large after this change, so the change was not saved",
      );
    markInternalWrite(settingsFilePathForSource);
    if (useStorage) {
      let written = await storage.write(STORAGE_SPACES.userSettings(), text, {
        publishDiscipline: "followAtomic",
      });
      if (!written.ok)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `settings storageV5 write failed: ${written.error.code}${"failureClass" in written.error ? ` (${written.error.failureClass})` : ""}`,
          "settings storageV5 write failed",
        );
    } else {
      let configDir = isPathConfigDir(dirname(settingsFilePathForSource));
      await writeSettingsFileAtomic(settingsFilePathForSource, text, {
        encoding: "utf-8",
        allowSymlink: source === "userSettings" || configDir,
        checkParentDir: (source === "projectSettings" || source === "localSettings") && !configDir,
        stagingDir: join(dirname(settingsFilePathForSource), ATOMIC_WRITE_DIRNAME),
      });
    }
    filePath.after({
      path: settingsFilePathForSource,
      content: text,
    });
    invalidateCommandNames();
    if (useStorage) release = seedWrittenUserSettings(settingsFilePathForSource, text);
    if (source === "localSettings" && !skipRevoke) {
      let revoked = await revokeFromLegacyLocalSettings(transform, filePath);
      if (revoked.error && revoked.phase !== undefined && !hasArrayOrUndefined(rawData))
        logForDebugging(
          `localSettings: legacy settings.local.json could not be evaluated (${revoked.phase} failure) but this write contains no removals \u2014 canonical write succeeded, ignoring: ${revoked.error.message}`,
          {
            level: "warn",
          },
        );
      else error = revoked.error;
    }
    if (source === "localSettings") {
      let gitignore = addFileGlobRuleToGitignore(
        getRelativeSettingsFilePathForSource("localSettings"),
        getProjectConfigRoot() ?? getOriginalCwd(),
      )
        .then((result) => {
          if (!result.written) return;
          if (result.effective) logFeatureOk("gitignore_global_rule");
          else if (result.reason === "already_tracked") logFeatureSad("gitignore_global_rule", result.reason);
          else logFeatureBad("gitignore_global_rule", result.reason ?? "write_ineffective");
        })
        .catch(() => {
          return;
        });
      let state = commandSyncNameState();
      state.backgroundWorkTail = Promise.all([state.backgroundWorkTail, gitignore]).then(() => {
        return;
      });
    }
    if (storageHandle && usedRaw) logFeatureSad("ccs_user_settings_write", "merged_into_raw_record");
    else if (storageHandle) logFeatureOk("ccs_user_settings_write");
  } catch (error) {
    if (storageHandle)
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
    let wrapped = Error(`Failed to read raw settings from ${settingsFilePathForSource}: ${error}`, {
      cause: error,
    });
    logForDebugging(wrapped.message, {
      level: "error",
    });
    return {
      error: wrapped,
    };
  }
  if (isStorageV5Enabled() && storage !== undefined && !useStorage)
    release = await mirrorUserSettingsWrite(storage, settingsFilePathForSource);
  try {
    getSettingsWithErrors_2();
  } catch (error) {
    logError(error);
  }
  emitSettingsChanged(source);
  return {
    error,
  };
}
//@ chunk-q8cqcff6.js:117127-117247 layout (2.1.88 match: _temp5, 1)
async function mirrorUserSettingsWrite(storage, writtenPath) {
  let settingsPath = getSettingsFilePathForSource("userSettings");
  if (
    settingsPath === undefined ||
    settingsPath === writtenPath ||
    !isDefaultUserSettingsPath("userSettings", settingsPath)
  )
    return;
  return seedProjectSettings(storage, commandSyncNameState(), settingsPath);
}
//@ chunk-q8cqcff6.js:117247-117483 layout
function seedWrittenUserSettings(path, text) {
  if (Buffer.byteLength(text) > MAX_SETTINGS_JSON_BYTES) return;
  let parsed;
  try {
    parsed = parseSettingsContent(text, path);
  } catch (error) {
    logForDebugging(`updateSettingsForSource: written settings not seeded: ${errorMessage(error)}`);
    return;
  }
  let state = commandSyncNameState();
  state.seedParsedFile(path, "userSettings", parsed, state.epoch);
  return state.retainLayer(path, parsed);
}
//@ chunk-q8cqcff6.js:117483-117614 layout
function hasArrayOrUndefined(rawData) {
  if (rawData === undefined || Array.isArray(rawData)) return true;
  if (rawData === null || typeof rawData !== "object") return false;
  return Object.values(rawData).some(hasArrayOrUndefined);
}
//@ chunk-q8cqcff6.js:117614-117723 layout
function emitSettingsChanged(source) {
  try {
    commandSyncNameState().changed.emit(source);
  } catch (error) {
    for (let suberror of error instanceof AggregateError ? error.errors : [error]) logError(suberror);
  }
}
//@ chunk-q8cqcff6.js:117723-119159 layout
/**
 * 对旧版 settings.local.json 应用变换但只保留删除部分（撤销授权）：读取并规范化旧文件，执行变换，内容有变化时原子写回并通知；各阶段失败返回遥测安全错误。
 */
async function revokeFromLegacyLocalSettings(transform, filePath) {
  let legacyPath = getLegacyLocalSettingsFilePath_3(buildSettingsContext());
  if (!legacyPath)
    return {
      changed: false,
      error: null,
    };
  let content;
  try {
    let safe = isInClaudeConfigHome(legacyPath)
      ? safeResolvePath(getFsImplementation(), legacyPath)
      : await vetRepoSettingsPathAsync(getFsImplementation(), legacyPath);
    content = (await readFileChecked(safe.resolvedPath, MAX_SETTINGS_JSON_BYTES)).content;
  } catch (error) {
    if (isENOENT(error))
      return {
        changed: false,
        error: null,
      };
    let wrapped = new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Failed to read legacy settings.local.json at ${legacyPath}: ${error}`,
      "Failed to read legacy settings.local.json",
    );
    logForDebugging(wrapped.message, {
      level: "error",
    });
    return {
      changed: false,
      error: wrapped,
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
  let legacyNormalized = normalized;
  let transformed;
  try {
    transformed = transform(clone(legacyNormalized));
  } catch (error) {
    let wrapped = new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Transform failed against legacy settings.local.json at ${legacyPath} (malformed legacy content?): ${error}`,
      "Transform failed against legacy settings.local.json",
    );
    logForDebugging(wrapped.message, {
      level: "error",
    });
    return {
      changed: false,
      error: wrapped,
      phase: "transform",
    };
  }
  if (transformed === null)
    return {
      changed: false,
      error: null,
    };
  let merged = mergeWithAssigner_2(clone(legacyNormalized), transformed, (previous, next, key, target) => {
    if (next === undefined && target && typeof key === "string") {
      delete target[key];
      return;
    }
    if (Array.isArray(next)) return next;
    return;
  });
  let result = projectRemovalsOnly(legacyNormalized, merged);
  if (jsonStringify(result) === jsonStringify(legacyNormalized))
    return {
      changed: false,
      error: null,
    };
  try {
    markInternalWrite(legacyPath);
    let configDir = isPathConfigDir(dirname(legacyPath));
    let text =
      jsonStringify(result, null, 2) +
      `
`;
    await writeSettingsFileAtomic(legacyPath, text, {
      encoding: "utf-8",
      allowSymlink: configDir,
      checkParentDir: !configDir,
      stagingDir: join(dirname(legacyPath), ATOMIC_WRITE_DIRNAME),
    });
    filePath.after({
      path: legacyPath,
      content: text,
    });
    invalidateCommandNames();
    return {
      changed: true,
      error: null,
    };
  } catch (error) {
    let wrapped = new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Failed to revoke from legacy settings.local.json at ${legacyPath}: ${error}`,
      "Failed to revoke from legacy settings.local.json",
    );
    logForDebugging(wrapped.message, {
      level: "error",
    });
    return {
      changed: false,
      error: wrapped,
    };
  }
}
//@ chunk-q8cqcff6.js:119159-119410 placement
function projectRemovalsOnly(original, merged) {
  if (Array.isArray(original) && Array.isArray(merged)) {
    let mergedSet = new Set(merged.map((item) => jsonStringify(item)));
    return original.filter((item) => mergedSet.has(jsonStringify(item)));
  }
  if (isPlainObject(original) && isPlainObject(merged)) {
    let out = {};
    for (let key of Object.keys(original)) {
      if (!(key in merged) || merged[key] === undefined) continue;
      out[key] = projectRemovalsOnly(original[key], merged[key]);
    }
    return out;
  }
  return original;
}
//@ chunk-q8cqcff6.js:119410-119791 placement (2.1.88 match: getManagedSettingsKeysForLogging, 0.208)
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
function getSettingsAfterPluginLoad(key) {
  if (!commandSyncNameState().pluginBaseLoaded)
    logEvent("tengu_plugin_settings_premature_read", {
      key: fromEnum(key),
    });
  let { settings } = getSettingsWithErrors_2();
  return (settings || {})[key];
}
//@ chunk-q8cqcff6.js:119924-119970 placement
function getSecuritySensitiveSetting(key) {
  return getSecuritySensitiveSettingWithSources(key).map((entry) => entry.value);
}
//@ chunk-q8cqcff6.js:119970-120027 placement (2.1.88 match: TRUSTED_SETTING_SOURCES, 1)
var SECURITY_SENSITIVE_SETTING_SOURCES = ["policySettings", "flagSettings", "userSettings"];
//@ chunk-q8cqcff6.js:120027-120243 placement
function getSecuritySensitiveSettingWithSources(key) {
  let values = [];
  for (let source of SECURITY_SENSITIVE_SETTING_SOURCES) {
    let settingsForSourceTightenOnly = getSettingsForSourceTightenOnly(source);
    let value = settingsForSourceTightenOnly?.[key];
    if (
      value !== undefined &&
      (isSettingSourceEnabled(source) ||
        MANAGED_RESTRICTION_KEYS().some(
          (def) =>
            def.path.length === 1 &&
            def.path[0] === key &&
            asArray(def.restrictive).some(
              (option) => option === restrictionValue(def, settingsForSourceTightenOnly),
            ),
        ))
    )
      values.push({
        source,
        value,
      });
  }
  return values;
}
//@ chunk-q8cqcff6.js:120243-120489 placement (2.1.88 match: hasSkipDangerousModePermissionPrompt, 1)
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
//@ chunk-q8cqcff6.js:120625-120836 placement (2.1.88 match: hasSkipDangerousModePermissionPrompt, 0.81)
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
  return getEnabledSettingSources_2().some(
    (source) => getSettingsForSource(source)?.isolatePeerMachines === true,
  );
}
//@ chunk-q8cqcff6.js:120906-121033 placement
function hasDisableClaudeAiConnectors() {
  return (
    getEnabledSettingSources_2().some(
      (source) => getSettingsForSource(source)?.disableClaudeAiConnectors === true,
    ) || getDurablePolicyTierSettings().some((tier) => tier.disableClaudeAiConnectors === true)
  );
}
//@ chunk-q8cqcff6.js:121033-121057 placement
function hasAutoModeOptIn() {
  return true;
}
//@ chunk-q8cqcff6.js:121057-121299 placement (2.1.88 match: hasSkipDangerousModePermissionPrompt, 0.763)
function isNotDisabledInTrustedSources(settingKey) {
  let pick = settingKey === "useAutoModeDuringPlan" ? getSettingsForSource : getSettingsForSourceTightenOnly;
  return ![
    ...getAllPolicyTierSettings(),
    ...getDurablePolicyTierSettings(),
    getSettingsForSource("policySettings"),
    getSettingsForSource("flagSettings"),
    pick("userSettings"),
    pick("localSettings"),
    settingKey !== "useAutoModeDuringPlan" || isSettingSourceEnabled("localSettings")
      ? getLegacyLocalSettingsOverlay()
      : null,
  ].some((settings) => settings?.[settingKey] === false);
}
//@ chunk-q8cqcff6.js:121299-121374 placement (2.1.88 match: _temp9, 1)
function isDisabledAboveWorkloadFiles(a_4) {
  return [...getVouchedPolicyTierSettings(), getSettingsForSource("flagSettings")].some(
    (settings) => settings?.[a_4] === false,
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
  let value = getSecuritySensitiveSetting("modelProposedGoals")[0];
  if (value !== undefined) return value;
  if ((await rawSettingsKeyPresence("modelProposedGoals", storageV5)) !== "absent") return "alwaysAsk";
  return "auto";
}
//@ chunk-q8cqcff6.js:121739-121945 placement
var autoModeConfigSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var AUTO_MODE_TRUSTED_SOURCES;
deferInit("chunk-q8cqcff6.js:121739", () => {
  autoModeConfigSchema = DoctorLazy(() =>
    objectSchema({
      allow: array(stringSchema()).optional(),
      soft_deny: array(stringSchema()).optional(),
      hard_deny: array(stringSchema()).optional(),
      deny: array(stringSchema()).optional(),
      environment: array(stringSchema()).optional(),
    }),
  );
  AUTO_MODE_TRUSTED_SOURCES = ["userSettings", "flagSettings", "policySettings"];
});
//@ chunk-q8cqcff6.js:121945-123032 placement (2.1.88 match: getAutoModeConfig, 0.293)
/**
 * 汇总 autoMode 分类器规则（allow/soft_deny/hard_deny/environment），只接受 user/flag/policy 来源；project/local 中的 autoMode 被忽略并打 tengu_settings_auto_mode_rules_untrusted_source_ignored。
 */
function getAutoModeConfig() {
  let schema = autoModeConfigSchema();
  let state = commandSyncNameState();
  if (!state.autoModeUntrustedSourceWarned)
    for (let source of ["projectSettings", "localSettings"]) {
      if (source === "projectSettings" && projectSettingsAliasesUserSettings()) continue;
      let autoMode = getSettingsForSource(source)?.autoMode;
      if (autoMode && schema.safeParse(autoMode).success) {
        state.autoModeUntrustedSourceWarned = true;
        logForDebugging(
          `settings autoMode in ${source} ignored \u2014 only user/flag/managed settings may set classifier rules (projectSettings and localSettings are repo-controllable)`,
          {
            level: "warn",
          },
        );
        logEvent("tengu_settings_auto_mode_rules_untrusted_source_ignored", {
          source: fromEnum(source),
        });
      }
    }
  let allow = {};
  let softDeny = [];
  let hardDeny = [];
  let environment = [];
  let hasAutoModeContent = false;
  for (let source of AUTO_MODE_TRUSTED_SOURCES) {
    let settings = getSettingsForSource(source);
    if (!settings) continue;
    let result = schema.safeParse(settings.autoMode);
    if (result.success) {
      if (result.data.allow) allow[source] = result.data.allow;
      if (result.data.soft_deny) softDeny.push(...result.data.soft_deny);
      if (result.data.hard_deny) hardDeny.push(...result.data.hard_deny);
      if (result.data.environment) environment.push(...result.data.environment);
    }
  }
  if (allow.flagSettings)
    allow.flagSettings = flagAllowBesideManagedAllow(allow.flagSettings, allow.policySettings);
  let flattened = AUTO_MODE_TRUSTED_SOURCES.flatMap((source) => allow[source] ?? []);
  if (
    flattened.length > 0 ||
    softDeny.length > 0 ||
    hardDeny.length > 0 ||
    environment.length > 0 ||
    hasAutoModeContent
  )
    return {
      ...(flattened.length > 0 && {
        allow: flattened,
      }),
      ...(softDeny.length > 0 && {
        soft_deny: softDeny,
      }),
      ...(hardDeny.length > 0 && {
        hard_deny: hardDeny,
      }),
      ...(environment.length > 0 && {
        environment,
      }),
      ...{},
    };
  return;
}
//@ chunk-q8cqcff6.js:123032-123146 placement
function flagAllowBesideManagedAllow(flagAllow, policyAllow) {
  return flagAllow.includes(DEFAULTS_PLACEHOLDER) &&
    (replacesDefaults(policyAllow) ||
      policySettingUnreadable("autoMode") ||
      policySettingUnreadable("autoMode.allow"))
    ? flagAllow.filter((rule) => rule !== DEFAULTS_PLACEHOLDER)
    : flagAllow;
}
//@ chunk-q8cqcff6.js:123146-123185 placement
function builtinAllowRulesAreOff() {
  return replacesDefaults(getAutoModeConfig()?.allow);
}
//@ chunk-q8cqcff6.js:123185-123277 placement
function isAutoModeClassifyAllShellEnabled() {
  for (let source of AUTO_MODE_TRUSTED_SOURCES)
    if (getSettingsForSourceTightenOnly(source)?.autoMode?.classifyAllShell === true) return true;
  return false;
}
//@ chunk-q8cqcff6.js:123277-124758 placement
async function rawSettingsKeyPresence(key, storage, options) {
  let settingsContext = buildSettingsContext();
  let enabledSettingSources = getEnabledSettingSources(settingsContext);
  let present = false;
  let unknowable = false;
  for (let enabledSettingSource of enabledSettingSources) {
    if (enabledSettingSource === "policySettings" && settingsContext.diskless) continue;
    let countsPresent =
      enabledSettingSource !== "policySettings" &&
      (options?.presenceSources === undefined || options.presenceSources.includes(enabledSettingSource));
    if (
      countsPresent &&
      enabledSettingSource === "flagSettings" &&
      isPlainObject(settingsContext.flagInline) &&
      key in settingsContext.flagInline &&
      key !== "attribution" &&
      key !== "includeCoAuthoredBy"
    )
      present = true;
    if (enabledSettingSource === "flagSettings" && settingsContext.flagExpectedContent !== undefined) {
      if (!settingsContext.flagExpectedContent.trim()) continue;
      let parsed = safeParseJSON(settingsContext.flagExpectedContent, false);
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) unknowable = true;
      else if (countsPresent && key in parsed && key !== "attribution" && key !== "includeCoAuthoredBy")
        present = true;
      continue;
    }
    let settingsFilePathForSource = getSettingsFilePathForSource_3(enabledSettingSource, settingsContext);
    if (!settingsFilePathForSource) continue;
    if (
      isStorageV5Enabled() &&
      storage !== undefined &&
      enabledSettingSource === "projectSettings" &&
      enabledSettingSources.includes("userSettings") &&
      projectSettingsAliasesUserSettings()
    )
      continue;
    let legacyPath =
      enabledSettingSource === "localSettings"
        ? getLegacyLocalSettingsFilePath_3(settingsContext)
        : undefined;
    let paths = legacyPath ? [settingsFilePathForSource, legacyPath] : [settingsFilePathForSource];
    let useStored =
      isStorageV5Enabled() &&
      storage !== undefined &&
      isDefaultUserSettingsPath(enabledSettingSource, settingsFilePathForSource);
    for (let path of paths) {
      if (useStored) {
        let storedUserSettings = await readStoredUserSettings(storage);
        switch (storedUserSettings.kind) {
          case "unreadable":
            logForDebugging(
              `rawSettingsKeyPresence: v5 user-settings read failed: ${storedUserSettings.code}`,
            );
            unknowable = true;
            break;
          case "oversize":
          case "non-object":
            unknowable = true;
            break;
          case "object":
            if (
              countsPresent &&
              key in storedUserSettings.raw &&
              !(key === "attribution" || key === "includeCoAuthoredBy")
            )
              present = true;
            break;
          case "absent":
          case "empty":
            break;
        }
        continue;
      }
      if (settingsContext.diskless) continue;
      try {
        let safe =
          enabledSettingSource === "policySettings" ||
          enabledSettingSource === "userSettings" ||
          isInClaudeConfigHome(path)
            ? safeResolvePath(getFsImplementation(), path)
            : vetRepoSettingsPath(getFsImplementation(), path);
        let file = readFileSync(safe.resolvedPath, MAX_SETTINGS_JSON_BYTES);
        if (!file.trim()) continue;
        let parsed = safeParseJSON(file, false);
        if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) unknowable = true;
        else if (countsPresent && key in parsed && !(key === "attribution" || key === "includeCoAuthoredBy"))
          present = true;
      } catch (error) {
        handleFileSystemError(error, path);
        if (!isENOENT(error)) unknowable = true;
      }
    }
  }
  if (unknowable) return "unknowable";
  return present ? "present" : "absent";
}
//@ chunk-6zvepy0r.js:10205-10335 fingerprint (2.1.88 match: rawSettingsContainsKey, 0.783)
async function resolveSettingsWritePath(key) {
  if (settingsSourceForPathByPriority(key) === "policySettings" || isInClaudeConfigHome(key)) return key;
  let vet = await vetRepoSettingsPathAsync(getFsImplementation(), key);
  return vet.linksResolvedPath ?? vet.resolvedPath;
}
//@ chunk-4xpk3fhh.js:11081-11176 fingerprint (2.1.88 match: getSettingsRootPathForSource, 1)
var TRUSTED_SETTING_SOURCES = ["policySettings", "flagSettings", "userSettings"];
var REPO_SETTING_SOURCES = ["localSettings", "projectSettings"];
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
  MAX_SETTINGS_JSON_BYTES,
  getManagedSettingsKeysForLogging,
  getSettingsForSourceForUpkeep,
  getBasePolicySettings,
  getBasePolicySettingsOrigin,
  getPolicyHelperSourceLoadErrors,
  isForceRemoteSettingsRefreshConfigured,
  getEffectiveSettingSource_2,
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
  isAutoModeClassifyAllShellEnabled,
  getVouchedPolicyTierSettings,
  getUseAutoModeDuringPlan,
  isDisabledAboveWorkloadFiles,
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
  BACKGROUND_SETTINGS_WORK_WAIT_MS,
  SECURITY_SENSITIVE_SETTING_SOURCES,
  credentialHelperKeysFrom,
  flagFileConsentDropped,
  flagInlineConsentDropped,
  getRawSettingFromRejectedSource,
  getSettingsRootPathForSource,
  launchFolderKeysFrom,
  legacyLocalConsentDropped,
  legacyLocalSettingsProbes,
  loadManagedFileSettings,
  machineAdminSignInKey,
  machinePolicyKeepsPriorityOver,
  projectRemovalsOnly,
  readRepoTiersFresh,
  repoDirSettingsParses,
  sourceFileConsentDropped,
  getEffectiveSettingSource,
  getEnabledSettingSources,
  getInitialSettings,
  getSettingsWithErrors,
  getSettingsWithSources,
  loadSettingsFromDisk,
};
