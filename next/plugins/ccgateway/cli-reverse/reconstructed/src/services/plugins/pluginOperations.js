/**
 * services/plugins/pluginOperations.ts
 *
 * 并入已有模块：插件被组织或策略阻止时的结果；--plugin-dir 等无法安装/更新/卸载的插件说明等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/plugins/pluginOperations.ts
 * pieces: chunk-5xgkngpb.js (1), chunk-ck4jrdtf.js (1), chunk-md9fmgw9.js (114), chunk-n0gp41wj.js (1)
 * attribution: fingerprint 9, placement 39, callgraph-fingerprint 3, file-local 2, layout 63, callgraph-witnessed 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join, dirname, relative, resolve, sep } from "path";
import {
  parsePluginIdentifier_2,
  findPluginName,
  isOfficialMarketplace,
  parsePluginIdentifier,
  parsePluginId,
  scopeToSettingSource,
  isPluginEnabled_2,
  pluginNamesEqual,
  joinPluginId,
  canonicalPluginId,
  legacyPluginIds,
  pluginsNamed,
  isOfficialMarketplaceName_3,
  normalizePluginId,
  parseNpmPluginId,
  marketplaceSuffix,
  isRequiredPlugin,
  splitPluginId,
  isPluginEnabled,
  pluginSettingAt,
  SETTING_SOURCE_TO_SCOPE,
  pluginNameAliases_2,
  groupEnabledPlugins,
  isOfficialPluginId,
  findPluginSetting,
} from "../../utils/plugins/pluginIdentifier.js";
import {
  pluginIdHash,
  INLINE_PLUGIN_MARKETPLACE,
  SYNCED,
  SKILLS_DIR,
  BUILTIN,
  removePluginUsage,
  seedPluginUsage,
  touchPluginUsage,
} from "../../utils/telemetry/pluginTelemetry.js";
import { hashEntries } from "../../utils/model/modelCatalog/maskedIds.js";
import {
  WireSafeControlError,
  errorMessage,
  isAbortError,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  isENOENT,
} from "../../utils/errors.js";
import { sanitizeTelemetryString } from "../../utils/sanitization.js";
import { logForDebugging } from "../../utils/debug.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import {
  loadInstalledPlugins,
  loadInstalledPluginsSync,
  hasFailedInstalledPluginsRead,
  isInstallationRelevantToCurrentProject,
  getInstalledPlugins,
  listInstalledPluginIds,
  hasInstallationForCurrentProject,
  getInstalledListRefusal,
  readInstalledPluginsFile,
  clearAutoInstalledFlag,
  formatInvalidPluginIdMessage,
  addInstalledPlugin,
  removePluginInstallation,
  findDataDirSharers,
  isPluginUnreadableOrShared,
  primeInstalledPluginsCache,
  findInstallationForCurrentProject,
  recordDirectoryRepositoryKey,
  updateInstallationPathOnDisk,
  filterInstallationsForCurrentProject,
} from "../../utils/plugins/installedPluginsManager.js";
import { __toESM } from "../../../runtime/bun-runtime.js";
import { require_semver_3 } from "../../../vendor/semver/index.js";
import { shouldSkipPluginAutoupdate } from "../../utils/config.js";
import {
  isSourceAllowedByPolicy,
  pluginDirectoryPolicyBlockHint,
  areLocalPluginDirsAllowedByPolicy,
  localPluginDirsBlockedMessage,
  isPluginBlockedByPolicy,
  pluginDirectoryPolicyBlock,
  isSourceDisallowedOrUnverifiable,
  areCommandPluginSourcesDisabledByPolicy,
  commandPluginSourcesDisabledMessage,
  headersHelperPolicyRefusal,
  isHeadersHelperDisabledByPolicy,
} from "../../utils/plugins/marketplacePolicy.js";
import {
  isMarketplaceAutoUpdate,
  isLocalMarketplaceSource,
  isUnavailablePackageMarketplace,
  formatPackageMarketplaceUnavailable,
  isAsciiImpersonatingOfficialName,
  IMPERSONATION_ERROR_MESSAGE,
  pluginManifestPathSchemas,
  isHttpUrl,
} from "../../utils/plugins/schemas.js";
import { getMarketplaceAutoUpdate } from "../../utils/plugins/marketplaceAutoUpdate.js";
import {
  getDeclaredMarketplaces,
  refreshMarketplaceDeduped,
  seedDirFor,
  loadKnownMarketplacesWithDeclared,
  tryUnwrapTextPayload,
  isPluginDirectoryAvailable,
  isImpersonatingOfficialMarketplace,
  lookUpPluginForSwitch,
  formatSwitchNeedsFreshReadMessage,
  getPluginDirectoryState,
  getPluginById,
  getPluginByIdCacheOnly,
  isPluginDirectoryListingBlocked,
  getMarketplace,
  pluginDirectoryNotInstallableMessage,
  loadKnownMarketplacesSafe,
} from "../../utils/plugins/marketplaceManager.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../analytics/featureTelemetry.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import {
  oneLineClipped,
  plural,
  capitalize,
  truncateToLength,
  takeLastChars,
  nfcLower,
} from "../../utils/stringUtils.js";
import { claudeCommand, runCommandHint } from "../../utils/worktreeResumeHint.js";
import {
  quotedPrintable,
  printableOrEmpty,
  printableLabel,
  printableName,
} from "../../utils/printableName.js";
import {
  installationAtTarget,
  isSameInstallScope,
  intersectVersionConstraints,
  describeConstraintConflict,
  noMatchingTagMessage,
  isDependencyAutoInstallState,
  findMatchingInstallations,
  findReverseDependentNames,
  formatReverseDependentsSuffix,
  collectTransitiveDependents,
  collectConstraintsOn,
} from "../../utils/plugins/dependencyResolver.js";
import {
  resolvePluginEntryPath,
  entryPathOrReason,
  normalizeMarketplaceInputPath,
  classifyMarketplacePath,
  entryResolutionError,
  probeLocalMarketplacePath,
  getMarketplaceCandidatePaths,
} from "../../utils/plugins/localMarketplacePaths.js";
import {
  calculatePluginVersion,
  getPluginCloneUrl,
  getMarketplaceCloneUrl,
  resolveVersionRange,
  toRelativePluginSource,
  verifyReviewedCommit,
  shortLowerPrefix,
  probePluginGitHead,
  readMarketplaceCommit,
  commitShaOf,
} from "../../utils/plugins/pluginVersioning.js";
import {
  loadPluginManifest,
  loadAllPluginsCacheOnly,
  copyDir,
  loadAllPlugins,
  localCopyShadowingSynced,
  syncedPluginMintedName,
  cacheCopyDependencyGap,
  realPathInsideCache,
  unvouchBeforeDependencyStep,
  rescreenCachedPluginTree,
  cachePlugin,
  entryDeclaresComponents,
  entryDeclaredComponentPaths,
  getVersionedCachePath,
  getVersionedZipCachePath,
  cacheDirHasPluginContentStrict,
  copyPluginToVersionedCache,
  anchoredPluginCachePath,
} from "../../utils/plugins/pluginLoader.js";
import {
  isLocalMarketplaceEntry,
  pluginDataDirPath,
  deletePluginDataDir,
} from "../../utils/plugins/pluginDirectories.js";
import { stripInvisibleKeepEmoji } from "../../utils/settings/marketplaceSettingsAliases.js";
import { tildify } from "../../utils/path.js";
import { getClaudeConfigDir } from "../../utils/markdownConfigLoader.js";
import { isBuiltinPluginId, getBuiltinPlugin, getBuiltinPlugins } from "../../plugins/builtinPlugins.js";
import {
  matchPolicyPluginEntry,
  getPolicyEnabledPluginEntries,
  findEnabledSettingForPlugin,
} from "../../utils/plugins/managedPlugins.js";
import {
  getOriginalCwd,
  isWorkspaceRestricted,
  getProjectConfigRoot,
  getSyncedPluginDirs,
} from "../../bootstrap/state.js";
import {
  getSettingsForSourceForUpkeep,
  getSettingsFilePathForSource,
  updateSettingsForSourceWithTransform,
  getLegacyLocalSettingsFilePath,
  getSettingsForSource,
} from "../../utils/settings/settings.js";
import {
  ENTRY_HELPER_FAILURE_SEVERITY,
  marketplaceNameOfId,
  EntryHelperError,
  headersHelperNotRunReason,
  getEntryHelperConsentSubject,
  checkHeadersHelperConsent,
  helperRefusalFailureCode,
  diffEntryHelperConsent,
  describeHelperReview,
  HELPER_CONSENT_MISMATCH_CODES,
  resolveArchiveDownloadHeaders,
  marketplaceSourceOfEntry,
} from "../../utils/plugins/headersHelper.js";
import {
  filterTrustedForBuiltin,
  getEnabledPluginsBySource,
  enabledPluginRecordsBySource,
  pluginSettingRecords,
} from "../../utils/plugins/pluginSettingsSources.js";
import {
  hasSuspectSettingsLink,
  enabledPluginKeys,
  describeUnwritableSettingsSource,
  scanSettingsForPluginUninstall,
  isWorkspaceRestrictedSource,
  findEnablingSettingsFile,
  readRepoSettingsBytes,
  planUninstallCleanup,
  listUninstallSettingsFiles,
  networkPathRetryHint,
} from "./pluginUninstallSettings.js";
import {
  pluginSettingWriteTarget,
  lookupByPluginAliases,
  TRUSTED_SETTING_SOURCES,
} from "../../utils/plugins/pluginConfigSources.js";
import {
  isPluginEnabledAndCachedAtScope,
  describeOtherMarketplaceInstalls,
  formatDirectoryUnavailableMessage,
  hasCachedInstallationAtScope,
  installPluginDependencies,
  hasNodeModulesDir,
} from "../../utils/plugins/pluginDependencies.js";
import {
  dependencyErrorsForSource,
  installMissingDependencies,
} from "../../utils/plugins/dependencyInstall.js";
import {
  OFFICIAL_MARKETPLACE_NAME,
  OFFICIAL_MARKETPLACE_DISPLAY,
  isPluginDirectorySource,
  marketplaceDisplayName,
  isOfficialMarketplaceSpelling,
  isNpmPluginSource,
} from "../../utils/plugins/officialMarketplaceNames.js";
import {
  EDITABLE_SETTING_SOURCES,
  getEnabledSettingSources,
  SETTING_SOURCES,
  getSettingSourceDisplayNameLowercase,
  getSettingSourceName,
} from "../../utils/settings/constants.js";
import {
  reservedMarketplaceNameError,
  marketplaceLoadFailedMessage,
  marketplaceRemovalAdvice,
  isDependencyError,
} from "../../utils/plugins/marketplaceNames.js";
import {
  PLUGIN_JSON,
  CommandSourceError,
  isPluginsDirOnLocalDisk,
  describeCommandOutputMode,
  isLinkModeCommandSource,
  isLiveLinkFarm,
  makeTempCachePathName,
  TEMP_CACHE_LINK_SUFFIX,
  commandSourceSpecOf,
  hasEntriesOutsideTarget as hasEntriesOutsideTarget_2,
} from "../../utils/plugins/commandSource.js";
import {
  npmMarketplaceEnabled,
  NPM_DIRECT_INSTALL_DISABLED_MESSAGE,
  toNpmPluginSource,
  NPM_REGISTRY,
  resolveNpmPackage,
} from "../../utils/plugins/npmPluginSource.js";
import {
  ownPropertyOrUndefined,
  listReservedNameRefusals,
  findSettingsArchiveEntry,
  findUrlMarketplaceHeaders,
} from "../../utils/plugins/marketplaceSources.js";
import {
  PluginDirectoryUnavailableError,
  samePluginSource,
  pinnedSha,
  withShaSuffix,
  sourceUrlAndRef,
} from "../../utils/plugins/pluginSourceUrl.js";
import {
  bindingKeysFor,
  isUnboundOfficialPlugin,
  isDirectoryRepositoryChanged,
  findDataDirConflictingRecord,
  installResolvedPlugin,
  formatResolutionError,
  getBoundRepositoryKeys,
} from "../../utils/plugins/pluginInstallationHelpers.js";
import {
  seedDirectoryBindings,
  persistDirectoryBinding,
  isOfficialPluginDirectoryId,
  hasDirectoryRepositoryKey,
  releaseDirectoryBinding as releaseDirectoryBinding_2,
  seedBindingsFromInstall,
  bindingsWithReadFailure,
  isUnreadableBindings,
  findBindingKeysFor,
  MAX_REPOSITORY_KEY_CHARS,
} from "../../utils/plugins/pluginDirectoryBindings.js";
import {
  formatSharedDataFolderMessage,
  formatSwitchTargetChangedMessage,
  findOtherMarketplaceInstallBlocker,
  formatMoreInstallsThanShownMessage,
  installFromOtherMarketplace,
  displayableGitHeadName,
} from "../../utils/plugins/crossMarketplaceInstall.js";
import {
  checkInstallAllowed,
  findOtherProjectInstalls,
  describeOtherMarketplaceInstall,
  classifyOfficialFetchError,
  collectDependencyVersionRanges,
  describeInstallFetchFailure,
  formatOfficialFallbackNote,
  isOfficialFamilySameSource,
} from "../../utils/plugins/installResultMessages.js";
import {
  logMarketplaceSwitch,
  isOfficialDirectoryPlugin,
} from "../../utils/plugins/pluginDirectoryTelemetry.js";
import {
  policyEnabledPluginNameSet,
  computeDependencyClosure,
  getEnabledPluginIdsInSource,
} from "../../utils/plugins/pluginPolicy.js";
import { logError } from "../../utils/log.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import {
  installSelectedPlugins,
  getPluginEditableScopes,
  checkEnabledPlugins,
} from "../../utils/plugins/pluginStartupCheck.js";
import { GITHUB_HOST } from "../../utils/git/githubUrl.js";
import { findPluginNameCollision } from "../../utils/plugins/pluginNameCollision.js";
import { primarySecureStoreKind } from "../../utils/secureStorage/index.js";
import { realpathAllowMissing } from "../../utils/pathResolution.js";
import { findGitRootUncached } from "../../utils/git.js";
import { resolveLocalSettingsStoreRoot } from "../../utils/settings/settingsFileParsing.js";
import { uncachedStorageRootFor } from "../../utils/settings/settingsStorage.js";
import { copyPluginOptions } from "../../utils/plugins/pluginOptionsStorage.js";
import { pathExists } from "../../utils/fsSafety/atomicWriteStaging.js";
import { refreshPluginCaches, markPluginVersionOrphaned } from "../../utils/plugins/cacheUtils.js";
import { removeDirectoryTreeNoFollow } from "../../utils/fsRemove.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { stripBom } from "../../utils/json.js";
import {
  hasTrustedOnlyBuiltinPlugin,
  trustedOnlyBuiltinPluginId,
} from "../../utils/plugins/loadPluginHooks.js";
import { isSyncWanted, isSyncAvailable } from "./accountSync/syncedPluginHooks.js";
import { ensureSyncedPluginDirsRegistered } from "../../utils/claudeAiSync/pluginsSync.js";
import { countWhere } from "../../utils/collections.js";
import { getPluginAttribution } from "../../utils/plugins/pluginAttribution.js";
import { getFsImplementation } from "../../utils/fsOperations.js";
import { CLAUDE_PLUGINS_OFFICIAL } from "../../utils/plugins/officialMarketplace.js";
import { emitProducerDirsChanged } from "../../utils/plugins/pluginCachePaths.js";
import { describeArchiveFetchCommand } from "../../components/ManagedSettingsSecurityDialog/utils.js";
import { isReviewerMarkedEntry } from "../../utils/plugins/commandSourceErrors.js";
import { omitAlias } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-n0gp41wj.js:8420-8587 callgraph-fingerprint (2.1.88 match: updatePluginOp, 0.187)
/**
 * 按插件 ID 对一组条目分组（名字配错，见 lead 建议）。
 */
function countByPluginKey(userHooks) {
  let countsByKey = new Map();
  for (let { pluginId } of userHooks) {
    if (!pluginId) continue;
    let { name: pluginName, marketplace: marketplaceName } = parsePluginIdentifier_2(pluginId);
    let pluginKey = pluginIdHash(pluginName, marketplaceName);
    countsByKey.set(pluginKey, (countsByKey.get(pluginKey) ?? 0) + 1);
  }
  return countsByKey.size > 0 ? hashEntries(countsByKey) : undefined;
}
//@ chunk-ck4jrdtf.js:7993-8133 placement
/**
 * 插件批量操作的错误转文本（用户可见错误原样，其他记日志后返回“X failed”）。属 CLI 处理器，见 lead 建议。
 */
function formatOperationFailure(subtype, error) {
  if (error instanceof WireSafeControlError) return sanitizeTelemetryString(errorMessage(error));
  if (isAbortError(error)) return sanitizeTelemetryString(errorMessage(error));
  logForDebugging(`${subtype} failed: ${errorMessage(error)}`, {
    level: "error",
  });
  return `${subtype} failed`;
}
//@ chunk-5xgkngpb.js:4550976-4551190 fingerprint (2.1.88 match: resolveDelistedPluginId, 0.791)
/**
 * 已下架插件 ID 的解析：排除已有结果的，从安装记录中找出仍存在的。
 */
async function resolveDelistedPluginId(keys, resolved, storageV5) {
  let filtered = (keys ?? []).filter((key) => !resolved.some((entry) => entry.pluginId === key));
  if (filtered.length === 0) return [];
  let installedData =
    isStorageV5Enabled() && storageV5 !== undefined
      ? await loadInstalledPlugins(storageV5)
      : loadInstalledPluginsSync();
  if (hasFailedInstalledPluginsRead(installedData)) return filtered;
  return filtered.filter(
    (key) => installedData.plugins[key]?.some(isInstallationRelevantToCurrentProject) === true,
  );
}
//@ chunk-md9fmgw9.js:2633-2651 placement
/**
 * 懒加载的 semver 模块。
 */
var semverModule; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-md9fmgw9.js:2633", () => {
  semverModule = __toESM(require_semver_3(), 1);
});
//@ chunk-md9fmgw9.js:2733-3131 placement
/**
 * 安装时插件不在目录中则刷新一次市场（失败时用缓存）。
 */
async function refreshMarketplaceOnCatalogMiss(marketplaceName, knownMarketplace, storageV5) {
  if (shouldSkipPluginAutoupdate()) return "ineligible";
  if (!knownMarketplace?.source || !isSourceAllowedByPolicy(knownMarketplace.source)) return "ineligible";
  if (
    !isMarketplaceAutoUpdate(
      marketplaceName,
      knownMarketplace,
      getMarketplaceAutoUpdate(marketplaceName, getDeclaredMarketplaces()),
    )
  )
    return "ineligible";
  try {
    await refreshMarketplaceDeduped(marketplaceName, storageV5, undefined, {
      skipIfRecent: true,
      directoryTrigger: "install",
    });
    getPluginRegistry().marketplaces.delete(marketplaceName);
    return "refreshed";
  } catch (error) {
    logForDebugging(
      `Failed to refresh marketplace '${marketplaceName}' on catalog miss; using cached data: ${errorMessage(error)}`,
      {
        level: "warn",
      },
    );
    return "refresh-failed";
  }
}
//@ chunk-md9fmgw9.js:3131-3332 placement
/**
 * 记录"安装前先刷新市场"的特性状态：已刷新、刷新失败或不适用。
 */
function logInstallRefreshFirst(outcome) {
  if (outcome === "refreshed") logFeatureOk("plugin_install_refresh_first");
  else if (outcome === "refresh-failed") logFeatureBad("plugin_install_refresh_first", "refresh_failed");
  else logFeatureSad("plugin_install_refresh_first", "ineligible");
}
//@ chunk-md9fmgw9.js:3332-4015 placement
/**
 * 按作用域安装前刷新 github 来源的市场。
 */
async function refreshBeforeScopedInstall(marketplaceName, knownMarketplace, storageV5) {
  if (isEssentialTrafficOnly())
    return {
      outcome: "ineligible",
    };
  if (!knownMarketplace?.source || !isSourceAllowedByPolicy(knownMarketplace.source))
    return {
      outcome: "ineligible",
    };
  if (knownMarketplace.installLocation && seedDirFor(knownMarketplace.installLocation))
    return {
      outcome: "ineligible",
    };
  let source = knownMarketplace.source.source;
  if (
    source !== "github" &&
    source !== "git" &&
    source !== "url" &&
    source !== "claudeai" &&
    source !== "pluginDirectory"
  ) {
    if (isLocalMarketplaceSource(knownMarketplace.source) || source === "settings")
      getPluginRegistry().marketplaces.delete(marketplaceName);
    return {
      outcome: "ineligible",
    };
  }
  try {
    await refreshMarketplaceDeduped(marketplaceName, storageV5, undefined, {
      skipIfRecent: true,
      directoryTrigger: "install",
    });
    getPluginRegistry().marketplaces.delete(marketplaceName);
    return {
      outcome: "refreshed",
    };
  } catch (error) {
    logForDebugging(
      `Failed to refresh marketplace '${marketplaceName}' before scoped install; using cached data: ${errorMessage(error)}`,
      {
        level: "warn",
      },
    );
    return {
      outcome: "refresh-failed",
      errorMessage: oneLineClipped(errorMessage(error)),
    };
  }
}
//@ chunk-md9fmgw9.js:4015-4189 placement
async function installedAndAvailableVersions(input) {
  let installedVersion = await installedVersionAtScope(input);
  let available = await getAvailablePluginVersion(input).catch(() => NO_AVAILABLE_VERSION);
  return {
    installedVersion: cleanVersion(installedVersion),
    availableVersion: cleanVersion(available.availableVersion),
    loadsInPlaceFrom: available.loadsInPlaceFrom,
  };
}
//@ chunk-md9fmgw9.js:4189-4840 placement
/**
 * 描述插件可更新版本与更新命令。
 */
function describeUpdateAvailability(pluginId, scope, marketplace) {
  let updateCommand = claudeCommand(
    "plugin update",
    pluginId,
    scope === "user" ? undefined : `--scope ${scope}`,
  );
  let hasNewerVersion =
    marketplace.availableVersion !== undefined &&
    marketplace.installedVersion !== undefined &&
    marketplace.availableVersion !== marketplace.installedVersion;
  let installedLabel = quotedPrintable(marketplace.installedVersion, MAX_VERSION_CHARS);
  let availableLabel = quotedPrintable(marketplace.availableVersion, MAX_VERSION_CHARS);
  let versionChange = `${installedLabel} to ${availableLabel}`;
  if (marketplace.loadsInPlaceFrom !== undefined) {
    let displayPath = printableOrEmpty(marketplace.loadsInPlaceFrom);
    let versionNote =
      hasNewerVersion && updateCommand !== null
        ? `; \`${updateCommand}\` re-records its version, ${versionChange}`
        : "";
    return ` \u2014 it loads in place from ${displayPath}, so edits there take effect at the next session start or /reload-plugins${versionNote}`;
  }
  if (!hasNewerVersion) return "";
  let updateHint = updateCommand !== null ? `run \`${updateCommand}\` to get it` : "update it from /plugin";
  return `${` \u2014 the marketplace now offers ${availableLabel}`} (installed: ${installedLabel}); ${updateHint}`;
}
//@ chunk-md9fmgw9.js:4840-4871 placement
/**
 * 版本号展示的最大字符数（64）。
 */
var MAX_VERSION_CHARS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var NO_AVAILABLE_VERSION;
deferInit("chunk-md9fmgw9.js:4840", () => {
  MAX_VERSION_CHARS = 64;
  NO_AVAILABLE_VERSION = Object.freeze({});
});
//@ chunk-md9fmgw9.js:4871-5089 placement
async function installedVersionAtScope({ pluginId, scope, projectPath, storageV5 }) {
  let installedPlugins =
    isStorageV5Enabled() && storageV5 !== undefined
      ? await loadInstalledPlugins(storageV5)
      : loadInstalledPluginsSync();
  let pluginName = findPluginName(Object.keys(installedPlugins.plugins), pluginId);
  let filtered = (installedPlugins.plugins[pluginName ?? pluginId] ?? []).filter(
    (installation) => installation.scope === scope,
  );
  return (installationAtTarget(filtered, scope, projectPath) ?? filtered[0])?.version;
}
//@ chunk-md9fmgw9.js:5089-5707 placement
/**
 * 查询插件可用版本（市场条目或系统市场）。
 */
async function getAvailablePluginVersion({
  pluginId,
  entry,
  marketplaceName,
  marketplaceInstallLocation,
  storageV5,
}) {
  if (typeof entry.source !== "string")
    return {
      availableVersion: claudeAiSourceVersion(entry),
    };
  if (marketplaceInstallLocation === undefined) return NO_AVAILABLE_VERSION;
  let knownMarketplacesWithDeclared = await loadKnownMarketplacesWithDeclared(storageV5);
  let directoryKind = seedDirFor(marketplaceInstallLocation) !== undefined ? "system" : "workspace";
  let pluginEntryPath = await resolvePluginEntryPath(
    pluginId,
    marketplaceInstallLocation,
    entry.source,
    knownMarketplacesWithDeclared,
    tryUnwrapTextPayload(),
    storageV5,
    directoryKind,
  );
  if (pluginEntryPath.kind !== "ok") return NO_AVAILABLE_VERSION;
  let pluginVersion = await calculatePluginVersion(
    pluginId,
    entry.source,
    await loadPluginManifest(pluginEntryPath.entryPath, entry.name, entry.source, [], {
      noTelemetry: true,
    }).then(
      (pluginManifest) => pluginManifest.manifest,
      () => {
        return;
      },
    ),
    pluginEntryPath.entryPath,
    {
      kind: "catalog",
      version: entry.version,
    },
    undefined,
    undefined,
    pluginEntryPath.marketplaceDir,
  );
  let loadsInPlace = isLocalMarketplaceEntry(
    entry.source,
    knownMarketplacesWithDeclared[marketplaceName]?.source,
  );
  return {
    availableVersion: pluginVersion !== "unknown" ? pluginVersion : undefined,
    loadsInPlaceFrom: loadsInPlace ? pluginEntryPath.entryPath : undefined,
  };
}
//@ chunk-md9fmgw9.js:5707-5830 placement
function claudeAiSourceVersion(entry) {
  let { source } = entry;
  if (!(typeof source !== "string" && source.source === "claudeai")) return;
  return entry.version || source.version || undefined;
}
//@ chunk-md9fmgw9.js:5830-5876 placement
/**
 * 清洗版本号（去掉不可见字符但保留 emoji）。
 */
function cleanVersion(version) {
  return version === undefined ? undefined : stripInvisibleKeepEmoji(version);
}
//@ chunk-md9fmgw9.js:5876-6651 placement
/**
 * --plugin-dir 等无法安装/更新/卸载的插件说明。
 */
function unmanageablePluginMessage(marketplaceName, operation) {
  let pastTense = {
    install: "installed",
    update: "updated",
    uninstall: "uninstalled",
  }[operation];
  switch (marketplaceName) {
    case INLINE_PLUGIN_MARKETPLACE:
      return `This plugin is loaded via --plugin-dir for this session with no marketplace backing \u2014 it cannot be ${pastTense}. Drop the --plugin-dir flag to stop loading it, or \`claude plugin disable\` to turn it off.`;
    case SYNCED:
      return `This plugin is synced from your claude.ai account with no marketplace backing \u2014 it cannot be ${pastTense} here. Manage it on claude.ai, or \`claude plugin disable\` to turn it off on this machine.`;
    case SKILLS_DIR:
      return `This plugin is loaded from ${tildify(join(getClaudeConfigDir(), "skills"))}/ with no marketplace backing \u2014 it cannot be ${pastTense}. Delete the directory to remove it; \`claude plugin disable\` to turn it off; edits there take effect after /reload-plugins.`;
  }
}
//@ chunk-md9fmgw9.js:6651-6971 placement
/**
 * 插件操作被拒原因（内置插件、托管插件等）。
 */
function pluginOperationRefusal(pluginId, marketplaceName, operation) {
  if (isOfficialMarketplace(marketplaceName)) return unmanageablePluginMessage(marketplaceName, operation);
  if (marketplaceName !== undefined && isUnavailablePackageMarketplace(marketplaceName))
    return formatPackageMarketplaceUnavailable(marketplaceName);
  if (isBuiltinPluginId(pluginId) && getBuiltinPlugin(parsePluginIdentifier(pluginId).name) !== undefined)
    return `This is a built-in plugin \u2014 built-in plugins cannot be installed, updated or uninstalled. ${managedPluginRefusal(pluginId)?.message ?? "Use `claude plugin enable` / `claude plugin disable` to turn it on or off."}`;
  return;
}
//@ chunk-md9fmgw9.js:6971-7074 placement
function unmanageablePluginReason(pluginId, marketplaceName) {
  if (isUnavailablePackageMarketplace(marketplaceName)) return "marketplace_not_available";
  return isBuiltinPluginId(pluginId) ? "builtin" : "directory_loaded";
}
//@ chunk-md9fmgw9.js:7074-7175 placement
function lockedDependentName(pluginId, marketplaceName) {
  let { name: pluginName } = parsePluginId(pluginId);
  let match = matchPolicyPluginEntry(getPolicyEnabledPluginEntries(), pluginName, marketplaceName);
  return match.outcome === "locked" ? match.entry.name : undefined;
}
//@ chunk-md9fmgw9.js:7175-7296 placement
function nonInstallableSourceLabel(marketplace) {
  switch (marketplace) {
    case INLINE_PLUGIN_MARKETPLACE:
      return "--plugin-dir";
    case SKILLS_DIR:
      return "skills-directory";
    case SYNCED:
      return "claude.ai-synced";
  }
}
//@ chunk-md9fmgw9.js:7296-7487 callgraph-fingerprint (2.1.88 match: VALID_INSTALLABLE_SCOPES, 0.443)
/**
 * 插件作用域常量：可安装作用域 user/project/local，更新可用作用域额外含 managed；SCOPE_PRECEDENCE 表示同名设置的覆盖优先级（local 最高）。
 */
var MANAGED_PLUGIN_DISABLE_MESSAGE =
  "This plugin is managed by your organization. Contact your admin to disable it.";
var VALID_INSTALLABLE_SCOPES = ["user", "project", "local"];
var SCOPE_PRECEDENCE = {
  user: 0,
  project: 1,
  local: 2,
};
var VALID_UPDATE_SCOPES = ["user", "project", "local", "managed"];
//@ chunk-md9fmgw9.js:7487-7593 fingerprint (2.1.88 match: assertInstallableScope, 1)
/**
 * 校验作用域是 user/project/local 之一，否则抛错。
 */
function assertInstallableScope(scope) {
  if (!VALID_INSTALLABLE_SCOPES.includes(scope))
    throw Error(`Invalid scope "${scope}". Must be one of: ${VALID_INSTALLABLE_SCOPES.join(", ")}`);
}
//@ chunk-md9fmgw9.js:7593-7632 file-local
/**
 * 作用域是否为可安装作用域（user/project/local）。
 */
function isInstallableScope(scope) {
  return VALID_INSTALLABLE_SCOPES.includes(scope);
}
//@ chunk-md9fmgw9.js:7632-7694 layout (2.1.88 match: isMcpServerFromProjectOrLocalSettings, 1)
/**
 * 插件作用域对应的项目路径：project/local 作用域返回当前项目根，其他返回 undefined。旧版名 isMcpServerFromProjectOrLocalSettings 配错。
 */
function getProjectPathForScope(config) {
  return config === "project" || config === "local" ? getOriginalCwd() : undefined;
}
//@ chunk-md9fmgw9.js:7694-7825 fingerprint (2.1.88 match: isPluginEnabledAtProjectScope, 1)
/**
 * 插件是否在项目设置（.claude/settings.json）的 enabledPlugins 中启用（按插件 ID 宽松匹配）。
 */
function isPluginEnabledAtProjectScope(pluginId) {
  let enabledPlugins = getSettingsForSourceForUpkeep("projectSettings")?.enabledPlugins;
  if (!enabledPlugins) return false;
  let pluginName = findPluginName(Object.keys(enabledPlugins), pluginId);
  return pluginName !== undefined && enabledPlugins[pluginName] === true;
}
//@ chunk-md9fmgw9.js:7825-7862 layout
/**
 * failureCode 是否属于“sad”（用户侧/预期内）类别，决定遥测走 f 还是 m。
 */
function isSadFailureCode(failureCode) {
  return FAILURE_CODE_SEVERITY[failureCode] === "sad";
}
//@ chunk-md9fmgw9.js:7862-8719 layout
var FAILURE_CODE_SEVERITY; // deferred: uses ENTRY_HELPER_FAILURE_SEVERITY (../../utils/plugins/headersHelper.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-md9fmgw9.js:7862", () => {
  FAILURE_CODE_SEVERITY = {
    ...ENTRY_HELPER_FAILURE_SEVERITY,
    not_installed: "bad",
    not_installed_at_scope: "bad",
    install_records_unreadable: "bad",
    ambiguous_marketplace: "sad",
    not_found: "bad",
    not_cached: "bad",
    source_missing: "bad",
    directory_loaded: "sad",
    builtin: "sad",
    marketplace_dir_missing: "bad",
    marketplace_dir_unreadable: "bad",
    marketplace_location_refused: "bad",
    marketplace_entry_path_refused: "bad",
    marketplace_policy_blocked: "sad",
    plugin_policy_blocked: "sad",
    directory_unavailable: "bad",
    command_source_inactive: "sad",
    command_source_skipped: "sad",
    command_source_refused: "sad",
    entry_helper_declined: "sad",
    claudeai_identity_changed: "sad",
    directory_identity_changed: "sad",
    directory_binding_unreadable: "bad",
    directory_commit_mismatch: "bad",
    directory_listing_not_installable: "sad",
    npm_marketplace_disabled: "sad",
    marketplace_not_available: "sad",
    dependencies_not_installed: "bad",
    dependencies_not_screened: "bad",
  };
});
//@ chunk-md9fmgw9.js:8719-8928 layout (2.1.88 match: findPluginInSettings, 0.828)
/**
 * 在 installed_plugins 中把用户输入的名字解析成已安装的完整插件 ID。
 */
function findPluginInSettings_2(plugin) {
  let installedPlugins = getInstalledPlugins();
  let pluginName = findPluginName(Object.keys(installedPlugins.plugins), plugin);
  if (pluginName) return pluginName;
  for (let scope of ["local", "project", "user"]) {
    let enabledPlugins = getSettingsForSourceForUpkeep(scopeToSettingSource(scope))?.enabledPlugins;
    if (!enabledPlugins) continue;
    let pluginName = findPluginName(Object.keys(enabledPlugins), plugin);
    if (pluginName) return pluginName;
  }
  return plugin;
}
//@ chunk-md9fmgw9.js:8928-9022 layout
/**
 * 综合各设置源 enabledPlugins、manifest.defaultEnabled 与安装偏好，判断插件当前是否实际启用。
 */
function isPluginEffectivelyEnabled(pluginId, plugin, builtinPlugins) {
  return isPluginEnabled_2(
    pluginId,
    filterTrustedForBuiltin(pluginId, builtinPlugins),
    plugin.manifest.defaultEnabled,
    plugin.installationPreference,
  );
}
//@ chunk-md9fmgw9.js:9022-9106 layout
function findScopeDeclaringPlugin(scopes, pluginId) {
  return scopes.find((scope) =>
    Object.hasOwn(getSettingsForSourceForUpkeep(scopeToSettingSource(scope))?.enabledPlugins ?? {}, pluginId),
  );
}
//@ chunk-md9fmgw9.js:9106-9665 fingerprint (2.1.88 match: findPluginInSettings, 0.869)
/**
 * 在 local > project > user 设置的 enabledPlugins 中找插件，返回 {pluginId, scope}。
 */
function findPluginInSettings(pluginId, scopes = ["local", "project", "user"]) {
  let hasMarketplace = pluginId.includes("@");
  let lower = pluginId.toLowerCase();
  if (hasMarketplace) {
    let installedIds = listInstalledPluginIds(getInstalledPlugins());
    let resolvedId = installedIds === "unknown" ? undefined : findPluginName(installedIds, pluginId);
    if (resolvedId !== undefined) {
      let scopes_2 = scopes.filter((scope) => !hasSuspectSettingsLink(scopeToSettingSource(scope)));
      if (
        resolvedId === pluginId ||
        (scopes_2.length === scopes.length && findScopeDeclaringPlugin(scopes_2, pluginId) === undefined)
      ) {
        let scopeDeclaringPlugin = findScopeDeclaringPlugin(scopes_2, resolvedId);
        if (
          scopeDeclaringPlugin !== undefined &&
          scopes.slice(0, scopes.indexOf(scopeDeclaringPlugin)).every((scope) => scopes_2.includes(scope))
        )
          return {
            pluginId: resolvedId,
            scope: scopeDeclaringPlugin,
          };
      }
    }
  }
  for (let scope of scopes) {
    let enabledPlugins = getSettingsForSourceForUpkeep(scopeToSettingSource(scope))?.enabledPlugins;
    if (!enabledPlugins) continue;
    for (let key of Object.keys(enabledPlugins))
      if (
        (hasMarketplace ? pluginNamesEqual(key, pluginId) : key.toLowerCase().startsWith(`${lower}@`)) ||
        isSameRepoRoot(key, hasMarketplace ? pluginId : joinPluginId(pluginId, BUILTIN))
      )
        return {
          pluginId: pluginSettingWriteTarget(enabledPlugins, key).deciding,
          scope,
        };
  }
  return null;
}
//@ chunk-md9fmgw9.js:9665-9727 layout
function isSameRepoRoot(key, pluginId) {
  let canonicalId = canonicalPluginId(key);
  return legacyPluginIds(canonicalId).length > 0 && canonicalId === canonicalPluginId(pluginId);
}
//@ chunk-md9fmgw9.js:9727-9763 layout
/**
 * 插件是否出现在任一可写设置源的 enabledPlugins 中。
 */
function isPluginInSettings(pluginId) {
  return findPluginInSettings(pluginId) !== null;
}
//@ chunk-md9fmgw9.js:9763-9974 callgraph-fingerprint (2.1.88 match: findPluginByIdentifier, 1)
function findPluginByIdentifier(plugin, plugins) {
  let { name, marketplace } = parsePluginId(plugin);
  return plugins.find((plugin_2) => {
    if (pluginNamesEqual(plugin_2.name, plugin) || pluginNamesEqual(plugin_2.name, name)) return true;
    if (marketplace && plugin_2.source)
      return (
        pluginNamesEqual(plugin_2.name, name) &&
        plugin_2.source.toLowerCase().includes(`@${marketplace.toLowerCase()}`)
      );
    return false;
  });
}
//@ chunk-md9fmgw9.js:9974-10388 layout
function resolveInstalledPluginId(pluginId, scope, projectPath) {
  let { name: pluginName } = parsePluginIdentifier(pluginId);
  let installedPlugins = getInstalledPlugins();
  let keys = Object.keys(installedPlugins.plugins);
  let pluginName_2 = findPluginName(keys, pluginId);
  if (pluginName_2 && installedPlugins.plugins[pluginName_2]?.length)
    return {
      pluginId: pluginName_2,
      pluginName,
    };
  let included = pluginId.includes("@");
  let filtered = pluginsNamed(keys, pluginName).filter(
    (key) =>
      (!included || !parsePluginIdentifier(key).marketplace) &&
      (installedPlugins.plugins[key]?.length ?? 0) > 0,
  );
  let chosenKey =
    filtered.find((key) =>
      installedPlugins.plugins[key]?.some(
        (installation) => installation.scope === scope && installation.projectPath === projectPath,
      ),
    ) ??
    filtered.find((key) =>
      installedPlugins.plugins[key]?.some((installation) =>
        isSameInstallScope(installation, scope, projectPath),
      ),
    ) ??
    filtered[0];
  if (chosenKey)
    return {
      pluginId: chosenKey,
      pluginName,
    };
  return null;
}
//@ chunk-md9fmgw9.js:10388-10957 fingerprint (2.1.88 match: getPluginInstallationFromV2, 1)
/**
 * 从 installed_plugins V2 记录中按作用域与当前项目路径找到对应安装条目。
 */
function getPluginInstallationFromV2(pluginId) {
  let installedData = getInstalledPlugins();
  let pluginName = findPluginName(Object.keys(installedData.plugins), pluginId);
  let installations = pluginName ? installedData.plugins[pluginName] : undefined;
  if (!installations || installations.length === 0)
    return {
      scope: "user",
    };
  let currentProjectPath = getOriginalCwd();
  let localInstall = installations.find(
    (inst) => inst.scope === "local" && inst.projectPath === currentProjectPath,
  );
  if (localInstall)
    return {
      scope: localInstall.scope,
      projectPath: localInstall.projectPath,
    };
  let projectInstall = installations.find(
    (inst) => inst.scope === "project" && inst.projectPath === currentProjectPath,
  );
  if (projectInstall)
    return {
      scope: projectInstall.scope,
      projectPath: projectInstall.projectPath,
    };
  let userInstall = installations.find((inst) => inst.scope === "user");
  if (userInstall)
    return {
      scope: userInstall.scope,
    };
  for (let scope of ["local", "project"]) {
    let installation = installationAtTarget(installations, scope, currentProjectPath);
    if (installation)
      return {
        scope: installation.scope,
        projectPath: installation.projectPath,
      };
  }
  return {
    scope: installations[0].scope,
    projectPath: installations[0].projectPath,
  };
}
//@ chunk-md9fmgw9.js:10957-11369 layout
function describePolicyBlock(block) {
  switch (block.reason) {
    case "blocked-by-policy":
      return {
        message: `Plugin "${block.pluginName}" is blocked by your organization's policy and cannot be installed`,
        failureCode: "plugin_policy_blocked",
      };
    case "marketplace-blocked-by-policy":
      return {
        message: `Plugin "${block.pluginName}" is from marketplace "${block.marketplaceName}", which is blocked by your organization's policy`,
        failureCode: "marketplace_policy_blocked",
      };
  }
}
//@ chunk-md9fmgw9.js:11369-11518 layout
/**
 * 是否“仅缺少依赖”：插件在该作用域启用且缓存存在，加载问题只有依赖未找到（dependency-unsatisfied/not-found）。
 */
async function hasOnlyMissingDependencyIssues(pluginId, scope, storageV5) {
  if (!(await isPluginEnabledAndCachedAtScope(pluginId, scope, storageV5))) return false;
  return !(await dependencyErrorsForSource(pluginId, storageV5)).some(
    (error) => error.type !== "dependency-unsatisfied" || error.reason !== "not-found",
  );
}
//@ chunk-md9fmgw9.js:11518-11718 layout
function hasDirectoryCounterpartInstalled(pluginName, marketplaceName) {
  {
    let officialMarketplaceTarget = marketplaceName === OFFICIAL_MARKETPLACE_NAME;
    return Object.entries(getInstalledPlugins().plugins).some(([key, value]) => {
      if (value.length === 0) return false;
      let { name, marketplace } = parsePluginIdentifier(key);
      return (
        name === pluginName &&
        marketplace !== undefined &&
        marketplace !== marketplaceName &&
        (officialMarketplaceTarget
          ? isOfficialMarketplaceName_3(marketplace)
          : marketplace === OFFICIAL_MARKETPLACE_NAME)
      );
    });
  }
  return false;
}
//@ chunk-md9fmgw9.js:11718-11885 layout
/**
 * --replace 需要完整 name@marketplace 的提示。
 */
function replaceNeedsFullIdMessage() {
  return "--replace switches one copy of a plugin for another, so it needs the full id of the copy to switch to: name@marketplace. Nothing was installed.";
}
//@ chunk-md9fmgw9.js:11885-12055 layout
/**
 * --replace 切换市场副本在本会话不可用的原因：插件目录不在会话中、工作区受限（不读项目/本地设置）、设置源被缩小。
 */
function getReplaceUnavailableReason() {
  if (!isPluginDirectoryAvailable()) return "directory-not-in-session";
  if (isWorkspaceRestricted()) return "workspace-restricted";
  if (!EDITABLE_SETTING_SOURCES.every((source) => getEnabledSettingSources().includes(source)))
    return "setting-sources-narrowed";
  return;
}
//@ chunk-md9fmgw9.js:12055-12769 layout
/**
 * 把 --replace 不可用原因转成用户提示（CLI 与界面两种措辞）。
 */
function describeReplaceUnavailable(reason, surface) {
  {
    let cliSuffix = surface === "cli" ? ", so nothing was installed" : "";
    switch (reason) {
      case "directory-not-in-session":
        return surface === "cli"
          ? "--replace is not available in this session, so nothing was installed."
          : `Switching marketplaces needs the ${OFFICIAL_MARKETPLACE_DISPLAY}, which is not available in this session.`;
      case "workspace-restricted":
        return `Switching marketplaces is not available while this folder's project and local settings are not being read${cliSuffix}. Try again from a session that reads them.`;
      case "setting-sources-narrowed":
        return `Switching marketplaces is not available while this session ignores any of your user, project or local settings files${cliSuffix}. Try again from a session started without --setting-sources or --restricted.`;
    }
  }
  return "";
}
//@ chunk-md9fmgw9.js:12769-12883 layout
function describeImpersonatingMarketplace(marketplaceName, knownMarketplace) {
  return `${isAsciiImpersonatingOfficialName(marketplaceName) ? reservedMarketplaceNameError(marketplaceName) : marketplaceLoadFailedMessage(marketplaceName, IMPERSONATION_ERROR_MESSAGE)}. ${marketplaceRemovalAdvice(
    marketplaceName,
    {
      declaredInSettings: knownMarketplace.source.source === "settings",
    },
  )}`;
}
//@ chunk-md9fmgw9.js:12883-13501 layout
async function whyNotInstallableInPlace(official, storageV5) {
  if ((official.entry.dependencies?.length ?? 0) > 0) return "its catalog entry declares dependencies";
  let source = official.entry.source;
  if (typeof source !== "string") return "its source is not a folder in the marketplace";
  try {
    let { entryPath } = entryPathOrReason(
      await resolvePluginEntryPath(
        `${official.entry.name}@${official.marketplace}`,
        official.marketplaceInstallLocation,
        source,
        await loadKnownMarketplacesWithDeclared(storageV5),
        tryUnwrapTextPayload(),
        storageV5,
      ),
    );
    if (entryPath === undefined) return "its folder in the marketplace could not be resolved";
    let { manifest } = await loadPluginManifest(
      entryPath,
      official.entry.name,
      source,
      [join(entryPath, PLUGIN_JSON)],
      {
        noTelemetry: true,
      },
      storageV5,
    );
    return (manifest.dependencies?.length ?? 0) > 0 ? "its manifest declares dependencies" : undefined;
  } catch (error) {
    return `it could not be checked (${quotedPrintable(errorMessage(error), 200)})`;
  }
}
//@ chunk-md9fmgw9.js:13501-13562 layout
async function readInstalledPlugins(storageV5) {
  return isStorageV5Enabled() && storageV5 !== undefined
    ? await loadInstalledPlugins(storageV5)
    : loadInstalledPluginsSync();
}
//@ chunk-md9fmgw9.js:13562-13616 layout
async function getInstallationsOf(pluginId, storageV5) {
  return (await readInstalledPlugins(storageV5)).plugins[pluginId];
}
//@ chunk-md9fmgw9.js:13616-13699 layout
async function isPluginPossiblyInstalled(key, storageV5) {
  let installedPlugins = await readInstalledPlugins(storageV5);
  return hasFailedInstalledPluginsRead(installedPlugins) || (installedPlugins.plugins[key]?.length ?? 0) > 0;
}
//@ chunk-md9fmgw9.js:13699-13761 layout
function latestInstallationAtScope(installationsOf, scope) {
  return hasInstallationForCurrentProject(
    (installationsOf ?? []).filter((installation) => installation.scope === scope),
  );
}
//@ chunk-md9fmgw9.js:13761-36337 callgraph-witnessed (2.1.88 match: installPluginOp, 0.16)
/**
 * 安装插件的操作入口（CLI claude plugin install 与 /plugin 界面）：解析 name[@marketplace]、校验作用域与策略（blocklist/policy、市场被禁）、取 marketplace 条目、处理依赖（自动安装同市场或白名单市场的依赖）、下载缓存、写 installed_plugins.json 与 settings 的 enabledPlugins；支持 --replace 在不同市场副本间切换。
 */
async function installPluginOp(
  pluginId,
  scope = "user",
  {
    shownSourceCommand,
    shownEntryHelper,
    announceRefreshResult,
    replaceInstalledCopy,
    replaceOnlyPluginIds,
    carrySettingsFrom,
    surface = "cli",
    npmRegistry,
    gitHubHttpsFallback,
    withoutRefresh,
  } = {},
  storageV5,
) {
  assertInstallableScope(scope);
  pluginId = normalizePluginId(pluginId);
  let { name: pluginName, marketplace: marketplaceName } = parsePluginId(pluginId);
  let refusal = pluginOperationRefusal(pluginId, marketplaceName, "install");
  if (refusal !== undefined)
    return {
      success: false,
      message: refusal,
      failureCode: unmanageablePluginReason(pluginId, marketplaceName),
    };
  let installedListRefusal = await getInstalledListRefusal(storageV5);
  if (installedListRefusal !== undefined)
    return {
      success: false,
      message: `Plugin "${quotedPrintable(pluginId)}" was not installed: ${readInstalledPluginsFile(installedListRefusal)}`,
      failureCode: "install_records_unreadable",
    };
  if (replaceInstalledCopy && !marketplaceName)
    return {
      success: false,
      message: replaceNeedsFullIdMessage(),
      failureCode: "replace_needs_full_id",
    };
  let replaceUnavailable = replaceInstalledCopy ? getReplaceUnavailableReason() : undefined;
  if (replaceUnavailable !== undefined)
    return {
      success: false,
      message: describeReplaceUnavailable(replaceUnavailable, "cli"),
      failureCode: "replace_unavailable",
    };
  let entry;
  let foundMarketplace;
  let installLocation;
  let refreshed = false;
  let refreshError;
  let reviewerMarked;
  let switchDetail;
  let marketplacePolicyBlocked = false;
  let refreshFailed = false;
  let refreshErrorMessage;
  let isDirectorySource = false;
  let officialUnavailable = false;
  let officialError;
  let officialNote = "";
  let preferredOver;
  let blockedNote = "";
  let offNote = "";
  let isReservedName = false;
  let request = parseNpmPluginId(pluginId);
  if (request === null && pluginId.toLowerCase().endsWith(`@${pluginManifestPathSchemas}`))
    return {
      success: false,
      message: `"${pluginId}" is not an npm package spec: expected <package>@npm, e.g. @scope/name@npm, name@npm or name@1.2.3@npm`,
      failureCode: "not_found",
    };
  if (request !== null && npmRegistry !== undefined && !isHttpUrl(npmRegistry))
    return {
      success: false,
      message: `--registry must be an http(s) URL (got "${npmRegistry}")`,
      failureCode: "not_found",
    };
  if (request !== null) {
    if (!npmMarketplaceEnabled())
      return {
        success: false,
        message: NPM_DIRECT_INSTALL_DISABLED_MESSAGE,
        failureCode: "npm_marketplace_disabled",
      };
    entry = toNpmPluginSource(request, npmRegistry);
    foundMarketplace = pluginManifestPathSchemas;
    installLocation = NPM_REGISTRY;
  } else if (marketplaceName) {
    let pluginInfo = await loadKnownMarketplacesWithDeclared(storageV5);
    let knownMarketplace = ownPropertyOrUndefined(pluginInfo, marketplaceName);
    if (
      knownMarketplace !== undefined &&
      isImpersonatingOfficialMarketplace(marketplaceName, knownMarketplace)
    ) {
      logFeatureBad("plugin_marketplace_resolve", "marketplace_name_refused", {
        scoped: true,
      });
      return {
        success: false,
        message: describeImpersonatingMarketplace(marketplaceName, knownMarketplace),
        failureCode: "not_found",
      };
    }
    isReservedName = listReservedNameRefusals(pluginInfo).some((entry) => entry.name === marketplaceName);
    let policyAllowed = knownMarketplace !== undefined && isSourceAllowedByPolicy(knownMarketplace.source);
    marketplacePolicyBlocked = knownMarketplace !== undefined && !policyAllowed;
    let switchLookup =
      replaceInstalledCopy &&
      knownMarketplace !== undefined &&
      policyAllowed &&
      isPluginDirectorySource(knownMarketplace.source)
        ? await lookUpPluginForSwitch(pluginName, storageV5)
        : undefined;
    if (switchLookup !== undefined && "notFreshEnoughFor" in switchLookup) {
      switchDetail = switchLookup.detail;
      if (hasDirectoryCounterpartInstalled(pluginName, marketplaceName)) {
        logFeatureBad("plugin_marketplace_resolve", "refresh_failed", {
          scoped: true,
        });
        return {
          success: false,
          message: `Plugin "${quotedPrintable(pluginName)}" was not switched. ${formatSwitchNeedsFreshReadMessage(switchLookup.detail)}`,
          failureCode: "replace_needs_fresh_listing",
        };
      }
    }
    let freshLookup = switchLookup !== undefined && "entry" in switchLookup ? switchLookup : undefined;
    let refreshResult =
      freshLookup !== undefined
        ? {
            outcome: "refreshed",
          }
        : withoutRefresh
          ? {
              outcome: "ineligible",
            }
          : (announceRefreshResult ??
            (await refreshBeforeScopedInstall(marketplaceName, knownMarketplace, storageV5)));
    if (!withoutRefresh) logInstallRefreshFirst(refreshResult.outcome);
    if (refreshResult.outcome === "refreshed") refreshed = true;
    else if (refreshResult.outcome === "refresh-failed") {
      refreshFailed = true;
      refreshError = `marketplace not refreshed (${refreshResult.errorMessage})`;
      if (knownMarketplace && isPluginDirectorySource(knownMarketplace.source))
        refreshErrorMessage = refreshResult.errorMessage;
    }
    isDirectorySource = knownMarketplace !== undefined && isPluginDirectorySource(knownMarketplace.source);
    officialUnavailable =
      knownMarketplace === undefined &&
      marketplaceName === OFFICIAL_MARKETPLACE_NAME &&
      !isPluginDirectoryAvailable();
    if (isDirectorySource && (await getPluginDirectoryState()) === "blocked") {
      logFeatureBad("plugin_marketplace_resolve", "marketplace_policy_blocked", {
        scoped: true,
      });
      return {
        success: false,
        message: directoryBlockedMessage(pluginName),
        failureCode: "marketplace_policy_blocked",
      };
    }
    let lookup =
      freshLookup !== undefined
        ? freshLookup.entry === null
          ? null
          : freshLookup
        : refreshErrorMessage === undefined
          ? await getPluginById(pluginId, storageV5, "install")
          : await getPluginByIdCacheOnly(pluginId, storageV5, "install");
    if (freshLookup !== undefined && freshLookup.entry !== null) reviewerMarked = freshLookup.reviewerMarked;
    if (lookup) {
      entry = lookup.entry;
      foundMarketplace = marketplaceName;
      installLocation = lookup.marketplaceInstallLocation;
    }
  } else {
    let lookupFailure;
    let pluginInMarketplaces = await findPluginInMarketplaces(pluginName, storageV5, (failure) => {
      lookupFailure = failure;
    });
    let directoryState = !pluginInMarketplaces ? await getPluginDirectoryState() : undefined;
    let message = lookupFailure?.message;
    let separatorIndex = message?.indexOf(": ") ?? -1;
    let officialMessage =
      message?.startsWith(`${OFFICIAL_MARKETPLACE_DISPLAY} `) && separatorIndex !== -1
        ? message.slice(separatorIndex + 2)
        : message;
    if (pluginInMarketplaces) {
      entry = pluginInMarketplaces.entry;
      foundMarketplace = pluginInMarketplaces.marketplace;
      installLocation = pluginInMarketplaces.marketplaceInstallLocation;
      preferredOver = pluginInMarketplaces.preferredOver;
      if (
        officialMessage !== undefined &&
        pluginInMarketplaces.marketplace !== OFFICIAL_MARKETPLACE_NAME &&
        isPluginDirectoryAvailable()
      )
        officialNote = ` (The ${OFFICIAL_MARKETPLACE_DISPLAY} could not be checked: ${officialMessage}; installed from ${
          printableLabel(marketplaceDisplayName(pluginInMarketplaces.marketplace), {
            head: 60,
            tail: 20,
          }) || "another marketplace"
        }.)`;
    } else if (directoryState === "blocked")
      blockedNote = `. (The ${OFFICIAL_MARKETPLACE_DISPLAY} is blocked by your organization. ${pluginDirectoryPolicyBlockHint()})`;
    else if (directoryState === "off")
      offNote = `. (The ${OFFICIAL_MARKETPLACE_DISPLAY} was not searched: it is turned off. Turn it back on: claude plugin marketplace add ${OFFICIAL_MARKETPLACE_NAME})`;
    else {
      officialError = officialMessage;
      if (officialError === undefined && (await isPluginDirectoryListingBlocked(pluginName, storageV5)))
        blockedNote = `. (The ${OFFICIAL_MARKETPLACE_DISPLAY} lists it, but it is blocked by your organization's policy.)`;
    }
  }
  if (!entry || !foundMarketplace) {
    if (
      (!entry || !foundMarketplace) &&
      isDirectorySource &&
      marketplaceName &&
      refreshErrorMessage === undefined
    )
      try {
        await getMarketplace(marketplaceName, storageV5, "install");
      } catch (error) {
        if (error instanceof PluginDirectoryUnavailableError) refreshErrorMessage = error.message;
      }
    if ((!entry || !foundMarketplace) && refreshErrorMessage) {
      logFeatureBad("plugin_marketplace_resolve", "refresh_failed_stale_lookup", {
        scoped: true,
      });
      return {
        success: false,
        message: `Could not look up "${quotedPrintable(pluginName)}". ${refreshErrorMessage}`,
        failureCode: "directory_unavailable",
      };
    }
    if ((!entry || !foundMarketplace) && officialUnavailable) {
      logFeatureBad("plugin_marketplace_resolve", "not_found", {
        scoped: true,
      });
      return {
        success: false,
        message: `Plugin "${quotedPrintable(pluginName)}" not found: the ${OFFICIAL_MARKETPLACE_DISPLAY} isn't available in this session`,
        failureCode: "directory_not_in_session",
      };
    }
    if (
      (!entry || !foundMarketplace) &&
      marketplaceName === OFFICIAL_MARKETPLACE_NAME &&
      (await getPluginDirectoryState()) === "off"
    ) {
      logFeatureBad("plugin_marketplace_resolve", "not_found", {
        scoped: true,
      });
      return {
        success: false,
        message: `Could not look up "${quotedPrintable(pluginName)}": the ${OFFICIAL_MARKETPLACE_DISPLAY} is off. Turn it on: claude plugin marketplace add ${OFFICIAL_MARKETPLACE_NAME}`,
        failureCode: "directory_off",
      };
    }
    if (
      (!entry || !foundMarketplace) &&
      isDirectorySource &&
      (await isPluginDirectoryListingBlocked(pluginName, storageV5))
    ) {
      logFeatureBad("plugin_marketplace_resolve", "marketplace_policy_blocked", {
        scoped: true,
      });
      return {
        success: false,
        message: `Plugin "${quotedPrintable(pluginName)}" is blocked by your organization's policy and cannot be installed`,
        failureCode: "plugin_policy_blocked",
      };
    }
    if ((!entry || !foundMarketplace) && isDirectorySource) {
      let notInstallable = await pluginDirectoryNotInstallableMessage(pluginName);
      if (notInstallable !== undefined) {
        logFeatureBad("plugin_marketplace_resolve", "not_installable", {
          scoped: true,
        });
        return {
          success: false,
          message: notInstallable,
          failureCode: "not_found",
        };
      }
    }
    if ((!entry || !foundMarketplace) && isReservedName) {
      logFeatureBad("plugin_marketplace_resolve", "not_found", {
        scoped: true,
      });
      return {
        success: false,
        message: `Plugin "${quotedPrintable(pluginName)}" not found: "${quotedPrintable(marketplaceName)}" is not a marketplace Claude Code uses (see the warning above)`,
        failureCode: "not_found",
      };
    }
  }
  if (!entry || !foundMarketplace) {
    let whereText = marketplaceName ? `marketplace "${marketplaceName}"` : "any configured marketplace";
    let updateCommand = marketplaceName ? claudeCommand("plugin marketplace update", marketplaceName) : null;
    let officialSpelling =
      marketplaceName !== undefined &&
      marketplaceName !== OFFICIAL_MARKETPLACE_NAME &&
      isOfficialMarketplaceSpelling(marketplaceName)
        ? true
        : false;
    let staleHint =
      marketplaceName && !refreshed && !officialSpelling
        ? `. Your local copy may be out of date${updateCommand ? ` \u2014 try \`${updateCommand}\`` : " \u2014 update it from /plugin > Marketplaces"}.`
        : "";
    logFeatureBad(
      "plugin_marketplace_resolve",
      marketplacePolicyBlocked
        ? "marketplace_policy_blocked"
        : refreshFailed
          ? "refresh_failed_stale_lookup"
          : "not_found",
      {
        scoped: marketplaceName !== undefined,
      },
    );
    let officialErrorNote = officialError
      ? `. (The ${OFFICIAL_MARKETPLACE_DISPLAY} could not be checked: ${officialError})`
      : "";
    let similarNote = "";
    if (isDirectorySource && marketplaceName) {
      let replaced = pluginName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      let sliced = (await getMarketplace(marketplaceName, storageV5, "install").catch(() => null))?.plugins
        .filter((plugin) => plugin.displayName?.toLowerCase().replace(/[^a-z0-9]+/g, "-") === replaced)
        .map((plugin) => plugin.name)
        .slice(0, 3);
      if (sliced !== undefined && sliced.length > 0)
        similarNote = `${staleHint === "" ? "." : ""} It may be listed as: ${sliced.map((name) => printableName(name, 80)).join(", ")}`;
    }
    return {
      success: false,
      message: `Plugin "${pluginName}" not found in ${whereText}${staleHint}${similarNote}${officialErrorNote}${blockedNote}${offNote}`,
      failureCode: marketplacePolicyBlocked
        ? "marketplace_policy_blocked"
        : refreshFailed
          ? "not_found_stale_catalog"
          : officialError
            ? "directory_unavailable"
            : "not_found",
    };
  }
  let catalogEntry = entry;
  let fullPluginId = `${catalogEntry.name}@${foundMarketplace}`;
  if (marketplacePolicyBlocked)
    logFeatureBad("plugin_marketplace_resolve", "marketplace_policy_blocked", {
      scoped: true,
    });
  else
    logFeatureOk("plugin_marketplace_resolve", {
      scoped: marketplaceName !== undefined,
    });
  if (
    request?.versionSpec === undefined &&
    (await hasOnlyMissingDependencyIssues(fullPluginId, scope, storageV5))
  ) {
    let bindingKeys = fullPluginId.endsWith(`@${OFFICIAL_MARKETPLACE_NAME}`)
      ? bindingKeysFor(
          (isStorageV5Enabled() && storageV5 !== undefined
            ? await loadInstalledPlugins(storageV5)
            : loadInstalledPluginsSync()
          ).plugins,
          fullPluginId,
        )
      : [];
    let installs = bindingKeys.length > 0 ? bindingKeys.flatMap(([, installs]) => installs) : undefined;
    let bindings = installs !== undefined ? await seedDirectoryBindings(bindingKeys) : undefined;
    if (bindings !== undefined && isUnboundOfficialPlugin(fullPluginId, installs, bindings))
      return {
        success: false,
        message: `"${printableName(catalogEntry.name, 120)}" is already installed, but plugin-directory-bindings.json in the plugins folder could not be used (unreadable, a symbolic link or not a file, over 1 MB, damaged, or written by a newer Claude Code), so its ${OFFICIAL_MARKETPLACE_DISPLAY} listing could not be checked against the repository it was installed from. Nothing was changed. Try again; if this repeats, check the file for those causes.`,
        failureCode: "directory_binding_unreadable",
      };
    if (
      installs !== undefined &&
      bindings !== undefined &&
      isDirectoryRepositoryChanged(fullPluginId, installs, catalogEntry.source, bindings)
    ) {
      let dataDirConflictingRecord = findDataDirConflictingRecord(
        Object.fromEntries(bindingKeys),
        bindings,
        fullPluginId,
        catalogEntry.source,
      );
      return {
        success: false,
        message:
          dataDirConflictingRecord !== undefined
            ? formatSharedDataFolderMessage(catalogEntry.name, dataDirConflictingRecord)
            : `"${quotedPrintable(catalogEntry.name, 120)}" is already installed from a different repository than the one the ${OFFICIAL_MARKETPLACE_DISPLAY} now lists under that name. Uninstall it first, then install it again.`,
        failureCode: "directory_identity_changed",
      };
    }
    let otherInstalls = isPluginDirectoryAvailable()
      ? await describeOtherMarketplaceInstalls(
          fullPluginId,
          catalogEntry,
          await loadKnownMarketplacesSafe(storageV5),
          storageV5,
        )
      : [];
    let checkAllowed = () =>
      checkInstallAllowed(fullPluginId, catalogEntry, storageV5).then((allowed) =>
        allowed.ok ? undefined : allowed.refusal,
      );
    if (replaceInstalledCopy) {
      if ((await resolveDelistedPluginId(replaceOnlyPluginIds, otherInstalls, storageV5)).length > 0)
        return {
          success: false,
          message: formatSwitchTargetChangedMessage(catalogEntry.name),
          failureCode: "installed_from_other_marketplace",
        };
      let [firstOther] = otherInstalls;
      if (firstOther !== undefined && switchDetail !== undefined) {
        logMarketplaceSwitch({
          fromPluginId: firstOther.pluginId,
          toPluginId: fullPluginId,
          surface,
          managedNames: policyEnabledPluginNameSet(),
          result: {
            outcome: "bad",
            code: "replace_needs_fresh_listing",
          },
        });
        return {
          success: false,
          message: `Plugin ${displayPluginId(fullPluginId)} is already installed (scope: ${scope}), and nothing was switched. ${formatSwitchNeedsFreshReadMessage(switchDetail)}`,
          failureCode: "replace_needs_fresh_listing",
        };
      }
      let policyRefusal = firstOther === undefined ? undefined : await checkAllowed();
      if (policyRefusal !== undefined && firstOther !== undefined) {
        let policyBlock =
          policyRefusal.reason === "plugin-directory-unavailable"
            ? {
                message: formatDirectoryUnavailableMessage(
                  policyRefusal.pluginName,
                  policyRefusal.unavailableDependency,
                ),
                failureCode: "plugin_directory_unavailable",
              }
            : describePolicyBlock(policyRefusal);
        let joiner =
          policyBlock.failureCode === "plugin_directory_unavailable"
            ? ": switching to this copy is allowed only where installing it is. "
            : ". ";
        logMarketplaceSwitch({
          fromPluginId: firstOther.pluginId,
          toPluginId: fullPluginId,
          surface,
          managedNames: policyEnabledPluginNameSet(),
          result: {
            outcome: "bad",
            code: policyBlock.failureCode,
          },
        });
        return {
          success: false,
          message: `Plugin ${displayPluginId(fullPluginId)} is already installed (scope: ${scope}), and nothing was switched${joiner}${policyBlock.message}`,
          failureCode: policyBlock.failureCode,
        };
      }
      let otherMarketplaceInstallBlocker = findOtherMarketplaceInstallBlocker(
        fullPluginId,
        otherInstalls,
        replaceOnlyPluginIds,
        reviewerMarked,
      );
      if (otherMarketplaceInstallBlocker?.reason === "more-installed-than-shown")
        return {
          success: false,
          message: formatMoreInstallsThanShownMessage(catalogEntry.name),
          failureCode: "installed_from_other_marketplace",
        };
      if (otherMarketplaceInstallBlocker !== undefined) {
        logMarketplaceSwitch({
          fromPluginId: otherMarketplaceInstallBlocker.blocking.pluginId,
          toPluginId: fullPluginId,
          surface,
          managedNames: policyEnabledPluginNameSet(),
          result: {
            outcome: "bad",
            code: "installed_from_other_marketplace",
          },
        });
        return {
          success: false,
          message: `Plugin ${displayPluginId(fullPluginId)} is already installed (scope: ${scope}), and nothing was switched. ${installFromOtherMarketplace(fullPluginId, catalogEntry.name, otherInstalls, surface === "cli" ? "cli" : "ui", scope, reviewerMarked)}`,
          failureCode: "installed_from_other_marketplace",
        };
      }
      let [firstCopy, ...remainingCopies] = otherInstalls;
      if (firstCopy) {
        let switchResult = await finishReplaceSwitch(
          fullPluginId,
          scope,
          [firstCopy, ...remainingCopies],
          {
            newCopyWasJustInstalled: false,
            newCopyWasOn:
              locatePluginInstall(fullPluginId, undefined, groupedEnabledPlugins()).effective === true,
            surface,
            carrySettingsFrom,
          },
          storageV5,
        );
        let projectInstalls =
          scope === "user"
            ? await findOtherProjectInstalls(
                fullPluginId,
                catalogEntry,
                await loadKnownMarketplacesSafe(storageV5),
                storageV5,
              )
            : [];
        let otherNote = describeOtherMarketplaceInstall(fullPluginId, catalogEntry.name, projectInstalls);
        if (switchResult.ok)
          await clearAutoInstalledFlag(fullPluginId, scope, getProjectPathForScope(scope), storageV5);
        let enableCommand = claudeCommand("plugin enable", fullPluginId);
        let disabledNote =
          switchResult.ok &&
          !switchResult.stayedDisabled &&
          locatePluginInstall(fullPluginId, undefined, groupedEnabledPlugins()).effective === false
            ? `. ${displayPluginId(fullPluginId)} is disabled in your settings \u2014 enable it ${enableCommand ? `with: ${enableCommand}` : "in /plugin"}`
            : "";
        return switchResult.ok
          ? {
              success: true,
              message: `Plugin ${displayPluginId(fullPluginId)} was already installed (scope: ${scope})${switchResult.note}${disabledNote}${otherNote === "" ? "" : `. ${otherNote}`}`,
              pluginId: fullPluginId,
              pluginName: catalogEntry.name,
              scope,
              switched: {
                from: switchResult.from,
                replaced: switchResult.replaced,
                stayedDisabled: switchResult.stayedDisabled,
                keptOwnSettings: switchResult.keptOwnSettings,
                settingsRemovedFrom: switchResult.settingsRemovedFrom,
                ...(switchResult.settingsLeftInPlace && {
                  settingsLeftInPlace: switchResult.settingsLeftInPlace,
                }),
                savedDataRemovedFrom: switchResult.savedDataRemovedFrom,
                ...(switchResult.keptDataDir && {
                  keptDataDir: switchResult.keptDataDir,
                }),
                ...(switchResult.oldCopyStillRecordedAt.length > 0 && {
                  oldCopyStillRecordedAt: switchResult.oldCopyStillRecordedAt,
                }),
                ...((switchResult.saysMore || disabledNote !== "" || otherNote !== "") && {
                  messageSaysMore: true,
                }),
              },
            }
          : {
              success: false,
              message: switchResult.message,
              failureCode: "replace_failed",
            };
      }
    }
    let clearedAutoFlag = await clearAutoInstalledFlag(
      fullPluginId,
      scope,
      getProjectPathForScope(scope),
      storageV5,
    );
    let dependencyResult = await installMissingDependencies(fullPluginId, storageV5);
    let replaceCommand =
      otherInstalls.length > 0 &&
      findOtherMarketplaceInstallBlocker(fullPluginId, otherInstalls, undefined) === undefined &&
      (await checkAllowed()) === undefined
        ? claudeCommand(
            "plugin install",
            fullPluginId,
            scope === "user" ? "--replace" : `--replace --scope ${scope}`,
          )
        : null;
    let isOtherMarketplace = (candidateId) => {
      let marketplaceName = marketplaceNameOfId(candidateId);
      return (
        marketplaceName !== OFFICIAL_MARKETPLACE_NAME &&
        !(marketplaceName !== undefined && isOfficialMarketplaceName_3(marketplaceName))
      );
    };
    let describeByMarketplace = (installs) => {
      let byMarketplace = new Map();
      for (let install of installs) {
        let marketplaceName = marketplaceNameOfId(install.pluginId);
        byMarketplace.set(marketplaceName, [
          ...(byMarketplace.get(marketplaceName) ?? []),
          displayPluginId(install.pluginId),
        ]);
      }
      return new Intl.ListFormat("en", {
        type: "conjunction",
      }).format(
        [...byMarketplace].map(
          ([marketplaceName, pluginNames]) =>
            `${(marketplaceName !== undefined ? displayMarketplaceName(marketplaceName) : "") || "another marketplace"} (${pluginNames.join(", ")})`,
        ),
      );
    };
    let targetMarketplace = marketplaceNameOfId(fullPluginId);
    let targetIsOther = targetMarketplace !== undefined && isOtherMarketplace(fullPluginId);
    let sameMarketplaceInstalls = targetIsOther
      ? []
      : otherInstalls.filter((install) => !isOtherMarketplace(install.pluginId));
    let otherMarketplaceInstalls = targetIsOther
      ? []
      : otherInstalls.filter((install) => isOtherMarketplace(install.pluginId));
    let marketplacesText = otherInstalls.length > 0 ? describeByMarketplace(otherInstalls) : "";
    let othersWord = plural(otherInstalls.length, "other", "others");
    let marketplace = await installedAndAvailableVersions({
      pluginId: fullPluginId,
      entry: catalogEntry,
      marketplaceName: foundMarketplace,
      marketplaceInstallLocation: installLocation,
      scope,
      projectPath: getProjectPathForScope(scope),
      storageV5,
    });
    let updateText = `${describeUpdateAvailability(fullPluginId, scope, marketplace)}${dependencyResult?.suffix ?? ""}`;
    let separator = /[.?]$/.test(updateText) ? " " : ". ";
    let duplicateNote =
      marketplacesText !== ""
        ? targetIsOther
          ? `${separator}${displayMarketplaceName(targetMarketplace ?? "") || "\u201C\u201D"} lists it at the same repository and folder as ${plural(otherInstalls.length, "a plugin", "plugins")} installed here from ${marketplacesText}. If they are the same plugin, it loads ${otherInstalls.length === 1 ? "twice" : "more than once"}: to keep only one, uninstall the ${othersWord}`
          : `${sameMarketplaceInstalls.length === 0 ? "" : `${updateText === "" ? " \u2014 also installed from " : `${separator}${displayPluginId(fullPluginId)} is also installed from `}${describeByMarketplace(sameMarketplaceInstalls)}${replaceCommand !== null ? `; to keep only this one: ${replaceCommand}` : ""}`}${otherMarketplaceInstalls.length === 0 ? "" : `${sameMarketplaceInstalls.length === 0 ? separator : ". "}${plural(otherMarketplaceInstalls.length, "A plugin", "Plugins")} installed here from ${describeByMarketplace(otherMarketplaceInstalls)} ${plural(otherMarketplaceInstalls.length, "is", "are")} listed there at the same repository and folder as this one. ${sameMarketplaceInstalls.length === 0 ? `If they are the same plugin, it loads ${otherInstalls.length === 1 ? "twice" : "more than once"}` : `If ${plural(otherMarketplaceInstalls.length, "that one is", "those are")} the same plugin too, it loads ${otherInstalls.length + 1} times`}: to keep only one, uninstall the ${othersWord}`}`
        : "";
    return {
      success: true,
      message: `Plugin ${duplicateNote === "" ? `"${fullPluginId}"` : displayPluginId(fullPluginId)} is already installed (scope: ${scope})${clearedAutoFlag ? " \u2014 marked as manually installed" : ""}${updateText}${duplicateNote}${nothingSwitchedSuffix(replaceInstalledCopy === true && otherInstalls.length === 0, `${updateText}${duplicateNote}`)}`,
      pluginId: fullPluginId,
      pluginName: catalogEntry.name,
      scope,
      installedVersion: marketplace.installedVersion,
      availableVersion: marketplace.availableVersion,
    };
  }
  let entryHelper;
  if (shownEntryHelper !== undefined) entryHelper = shownEntryHelper;
  else {
    entryHelper = await archiveFetchWarning(fullPluginId, catalogEntry, storageV5);
    if (entryHelper !== null)
      throw new EntryHelperError(
        `${archiveHelperDisclosure(entryHelper)}
This install runs that command; confirm it by running \`claude plugin install\` in a terminal (or with -y/--yes).`,
        "entry_helper_unconfirmed",
      );
  }
  let installationsOf = await getInstallationsOf(fullPluginId, storageV5);
  let existingInstall = latestInstallationAtScope(installationsOf, scope);
  let newCopyWasOn =
    hasInstallationForCurrentProject(installationsOf ?? []) &&
    locatePluginInstall(fullPluginId, undefined, groupedEnabledPlugins()).effective === true;
  let installOutcome = await installResolvedPlugin({
    pluginId: fullPluginId,
    entry: catalogEntry,
    scope,
    marketplaceInstallLocation: installLocation,
    trigger: "cli",
    explicit: true,
    consentedEntryHelper: entryHelper,
    commandSourceConsent:
      shownSourceCommand !== undefined
        ? {
            kind: "shown",
            command: shownSourceCommand,
            pluginId: fullPluginId,
          }
        : recordedSourceCommand(fullPluginId, catalogEntry.source, installationsOf),
    replaceInstalledCopy,
    replaceOnlyPluginIds,
    switchTargetMarkedInItsOwnWalk: reviewerMarked,
    switchWalkNotFresh: switchDetail,
    storageV5,
    gitHubHttpsFallback,
  }).catch(async (error) => {
    let fetchFailureClass =
      preferredOver !== undefined &&
      typeof preferredOver.entry.source === "string" &&
      !installationsOf?.length &&
      !(await isPluginPossiblyInstalled(fullPluginId, storageV5))
        ? classifyOfficialFetchError(error)
        : undefined;
    if (fetchFailureClass !== undefined && preferredOver !== undefined)
      return {
        fetchFailed: error,
        why: fetchFailureClass,
        official: preferredOver,
      };
    throw error;
  });
  if ("fetchFailed" in installOutcome) {
    {
      let { fetchFailed, why, official } = installOutcome;
      let officialId = `${official.entry.name}@${official.marketplace}`;
      let notInstallable = await whyNotInstallableInPlace(official, storageV5);
      if (notInstallable !== undefined) {
        logForDebugging(
          `Bare-name install of "${quotedPrintable(pluginName)}": the ${OFFICIAL_MARKETPLACE_DISPLAY}'s copy could not be fetched, and ${quotedPrintable(officialId)} was not installed in its place: ${notInstallable}`,
        );
        throw fetchFailed;
      }
      let dependencies;
      let dependencyReadError;
      try {
        let allPluginsCacheOnly = await loadAllPluginsCacheOnly(storageV5);
        dependencies = collectDependencyVersionRanges(
          [...allPluginsCacheOnly.enabled, ...allPluginsCacheOnly.disabled],
          new Set(),
        );
      } catch (error) {
        logError(error);
        dependencyReadError = errorMessage(error);
      }
      let ranges = dependencies?.ranges.get(officialId) ?? [];
      let intersected = ranges.length > 0 ? intersectVersionConstraints(ranges) : undefined;
      if (
        dependencyReadError !== undefined ||
        (intersected !== undefined && (!intersected.ok || intersected.range !== "*"))
      ) {
        let requirers = normalizeCaseForComparison_2(dependencies?.requirers.get(officialId) ?? []);
        logForDebugging(
          `Bare-name install of "${quotedPrintable(pluginName)}": the ${OFFICIAL_MARKETPLACE_DISPLAY}'s copy could not be fetched, and ${quotedPrintable(officialId)} was not installed in its place: ${dependencyReadError !== undefined ? `could not read the installed plugins to check (${quotedPrintable(dependencyReadError, 300)})` : `${quotedPrintable(requirers.join(", "))} ${requirers.length === 1 ? "requires" : "require"} version ${quotedPrintable(ranges.join(", "))} of it, which could be downloaded from the marketplace's git host`}`,
        );
        throw fetchFailed;
      }
      logForDebugging(
        `Bare-name install of "${quotedPrintable(pluginName)}": the ${OFFICIAL_MARKETPLACE_DISPLAY}'s copy could not be fetched (${quotedPrintable(errorMessage(fetchFailed), 300)}); installing ${quotedPrintable(official.marketplace)}'s copy instead`,
      );
      let existingOfficialInstall = latestInstallationAtScope(
        await getInstallationsOf(officialId, storageV5),
        scope,
      );
      let fallbackError;
      let fallbackResult = await installPluginOp(
        officialId,
        scope,
        {
          surface,
          withoutRefresh: true,
          gitHubHttpsFallback,
        },
        storageV5,
      ).catch((error) => {
        fallbackError = error;
        logForDebugging(
          `Bare-name install of "${quotedPrintable(pluginName)}": ${quotedPrintable(official.marketplace)}'s copy did not install either: ${quotedPrintable(errorMessage(error), 300)}`,
        );
        return;
      });
      if (
        !fallbackResult?.success &&
        !existingOfficialInstall &&
        latestInstallationAtScope(await getInstallationsOf(officialId, storageV5), scope)
      )
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          describeInstallFetchFailure(
            why,
            officialId,
            official.marketplace,
            scope,
            fallbackResult === undefined ? errorMessage(fallbackError) : fallbackResult.message,
          ),
          "bare-name install: the official copy it fell back to was left installed after its install failed",
        );
      if (
        !fallbackResult?.success ||
        fallbackResult.pluginId !== officialId ||
        fallbackResult.aliasedId ||
        fallbackResult.nothingWritten
      ) {
        if (fallbackResult !== undefined)
          logForDebugging(
            `Bare-name install of "${quotedPrintable(pluginName)}": ${quotedPrintable(official.marketplace)}'s copy was not installed: ${quotedPrintable(fallbackResult.message, 300)}`,
          );
        throw fetchFailed;
      }
      logFeatureSad(
        "plugin_marketplace_resolve",
        why === "git-missing" ? "directory_copy_git_missing" : "directory_copy_fetch_failed",
      );
      return {
        ...fallbackResult,
        message: `${fallbackResult.message}${formatOfficialFallbackNote(why, official.marketplace)}`,
      };
    }
    throw installOutcome.fetchFailed;
  }
  let outcome = installOutcome;
  if (!outcome.ok)
    switch (outcome.reason) {
      case "installed-from-other-marketplace":
      case "more-installed-than-shown":
      case "fewer-installed-than-shown":
      case "switch-needs-fresh-listing":
      case "directory-pin-unsatisfied":
      case "directory-binding-unreadable":
      case "directory-identity-changed":
        switch (outcome.reason) {
          case "switch-needs-fresh-listing":
            logMarketplaceSwitch({
              fromPluginId: outcome.installedCopies[0].pluginId,
              toPluginId: fullPluginId,
              surface,
              managedNames: policyEnabledPluginNameSet(),
              result: {
                outcome: "bad",
                code: "replace_needs_fresh_listing",
              },
            });
            return {
              success: false,
              message: `Plugin "${quotedPrintable(outcome.pluginName)}" was not switched. ${formatSwitchNeedsFreshReadMessage(outcome.detail)}`,
              failureCode: "replace_needs_fresh_listing",
            };
          case "installed-from-other-marketplace":
            if (replaceInstalledCopy)
              logMarketplaceSwitch({
                fromPluginId: (
                  outcome.installedCopies.find((installedCopy) => !installedCopy.replaceable) ??
                  outcome.installedCopies[0]
                ).pluginId,
                toPluginId: fullPluginId,
                surface,
                managedNames: policyEnabledPluginNameSet(),
                result: {
                  outcome: "bad",
                  code: "installed_from_other_marketplace",
                },
              });
            else if (surface === "cli") {
              let selected = await installSelectedPlugins(fullPluginId, storageV5);
              let selectedInstall = selected?.installed.scopes.some(isInstallableScope)
                ? selected
                : undefined;
              if (selectedInstall) {
                let index = selectedInstall.repositoryKey.indexOf("#");
                let repository =
                  index < 0 ? selectedInstall.repositoryKey : selectedInstall.repositoryKey.slice(0, index);
                let subPath = index < 0 ? "" : selectedInstall.repositoryKey.slice(index + 1);
                let repoSlug = repository.startsWith(`${GITHUB_HOST}/`)
                  ? repository.slice(GITHUB_HOST.length + 1)
                  : repository;
                let shownName = quotedPrintable(outcome.pluginName, 120);
                let included = selectedInstall.installed.scopes.includes(scope);
                let scopeSuffix = included
                  ? ""
                  : ` at ${selectedInstall.installed.scopes.join(" and ")} scope`;
                let ownScope = included ? scope : selectedInstall.installed.scopes.find(isInstallableScope);
                if (ownScope !== undefined && (included || scope === "user")) {
                  let installedMarketplace = marketplaceDisplayName(
                    parsePluginIdentifier(selectedInstall.installed.pluginId).marketplace ?? "",
                  );
                  let trimmed = printableName(subPath, 200).trim();
                  let repoLabel = printableLabel(
                    printableName(`${repoSlug}${trimmed === "" ? "" : ` \xB7 ${trimmed}`}`, 200),
                  );
                  let samePluginNote = repoLabel === "" ? "" : ` (the same plugin: ${repoLabel})`;
                  let replaceFlags = scope === "user" ? "--replace" : `--replace --scope ${scope}`;
                  let ownInstallCommand = claudeCommand("plugin install", fullPluginId, replaceFlags);
                  let targetMarketplaceDisplay = marketplaceDisplayName(foundMarketplace);
                  let canSwitch =
                    findOtherMarketplaceInstallBlocker(
                      fullPluginId,
                      [selectedInstall.installed],
                      undefined,
                    ) === undefined;
                  let switchHint = !canSwitch
                    ? ""
                    : ownInstallCommand === null
                      ? ` To switch it to ${targetMarketplaceDisplay}, open it in /plugin \u2192 Installed and choose "Switch to ${targetMarketplaceDisplay}"`
                      : ` To switch it to ${targetMarketplaceDisplay}: ${ownInstallCommand}`;
                  let switchHintShort = !canSwitch
                    ? ""
                    : ` To switch it to ${targetMarketplaceDisplay}, install ${displayPluginId(fullPluginId)} with ${replaceFlags}.`;
                  let scopesToCheck = included
                    ? [ownScope]
                    : selectedInstall.installed.scopes.filter(isInstallableScope);
                  let cachedScope;
                  for (let scope of scopesToCheck)
                    if (
                      await hasCachedInstallationAtScope(selectedInstall.installed.pluginId, scope, storageV5)
                    ) {
                      cachedScope = scope;
                      break;
                    }
                  if (cachedScope === undefined) {
                    let restoreCommand = claudeCommand(
                      "plugin install",
                      selectedInstall.installed.pluginId,
                      ownScope === "user" ? undefined : `--scope ${ownScope}`,
                    );
                    return {
                      success: false,
                      message: `"${shownName}" is installed from ${installedMarketplace}${scopeSuffix}${samePluginNote}, but its files are missing from the plugin cache. Nothing was changed. To restore them${restoreCommand === null ? ", install it again from /plugin" : `: ${restoreCommand}`}`,
                      failureCode: "installed_from_other_marketplace",
                      pluginId: selectedInstall.installed.pluginId,
                      aliasedId: true,
                    };
                  }
                  if (!included) {
                    let localEnableCommand = claudeCommand(
                      "plugin enable",
                      selectedInstall.installed.pluginId,
                      "--scope local",
                    );
                    let installLocation = locatePluginInstall(
                      selectedInstall.installed.pluginId,
                      undefined,
                      groupedEnabledPlugins(),
                    );
                    let disabledNote =
                      installLocation.effective === true
                        ? ""
                        : installLocation.override !== undefined
                          ? ` The plugin is turned off by ${installLocation.override.source === "policySettings" ? "your organization's managed settings" : "this session's --settings flag"}, and this command changed nothing.`
                          : ` The plugin is turned off in this project, and this command did not turn it on. To turn it on${localEnableCommand === null ? ", open it in /plugin" : ` for yourself in this project: ${localEnableCommand}`}`;
                    return {
                      success: true,
                      message: `"${shownName}" is already installed from ${installedMarketplace}${scopeSuffix}${samePluginNote}. Nothing to install.${disabledNote === "" ? switchHint : switchHintShort}${disabledNote}`,
                      pluginId: selectedInstall.installed.pluginId,
                      pluginName: outcome.pluginName,
                      scope: cachedScope,
                      aliasedId: true,
                      nothingWritten: true,
                    };
                  }
                  let enableResult = await setPluginEnabledOp(
                    selectedInstall.installed.pluginId,
                    true,
                    ownScope,
                    undefined,
                    storageV5,
                  );
                  if (!enableResult.success && !enableResult.alreadyInGoalState)
                    return {
                      success: false,
                      message: enableResult.message,
                      failureCode: enableResult.failureCode,
                      pluginId: selectedInstall.installed.pluginId,
                      aliasedId: true,
                    };
                  let clearedAutoFlag = await clearAutoInstalledFlag(
                    selectedInstall.installed.pluginId,
                    ownScope,
                    getProjectPathForScope(ownScope),
                    storageV5,
                  );
                  return {
                    success: true,
                    message: `"${shownName}" is already installed from ${installedMarketplace}${samePluginNote}. ${enableResult.success ? "It was disabled, so it is enabled again." : "Nothing to install."}${clearedAutoFlag ? " It is now marked as manually installed." : ""}${switchHint}`,
                    pluginId: selectedInstall.installed.pluginId,
                    pluginName: outcome.pluginName,
                    scope: (enableResult.success ? enableResult.scope : undefined) ?? ownScope,
                    aliasedId: true,
                    ...(enableResult.success && {
                      reenabled: true,
                    }),
                  };
                }
              }
            }
            return {
              success: false,
              message: installFromOtherMarketplace(
                fullPluginId,
                outcome.pluginName,
                outcome.installedCopies,
                surface === "cli" ? "cli" : "ui",
                scope,
                reviewerMarked,
              ),
              failureCode: "installed_from_other_marketplace",
            };
          case "more-installed-than-shown":
            return {
              success: false,
              message: formatMoreInstallsThanShownMessage(outcome.pluginName),
              failureCode: "installed_from_other_marketplace",
            };
          case "fewer-installed-than-shown":
            return {
              success: false,
              message: formatSwitchTargetChangedMessage(outcome.pluginName),
              failureCode: "installed_from_other_marketplace",
            };
          case "directory-pin-unsatisfied":
            return {
              success: false,
              message: outcome.message,
              failureCode: "dependency_pinned_version_unsatisfied",
            };
          case "directory-binding-unreadable":
            return {
              success: false,
              message: outcome.message,
              failureCode: "directory_binding_unreadable",
            };
          case "directory-identity-changed":
            return {
              success: false,
              message: outcome.message,
              failureCode: "directory_identity_changed",
            };
        }
        return {
          success: false,
          message: `Failed to install plugin "${fullPluginId}"`,
          failureCode: "dependency_resolution_failed",
        };
      case "local-source-no-location":
        return {
          success: false,
          message: `Cannot install local plugin "${outcome.pluginName}" without marketplace install location`,
          failureCode: "local_source_no_location",
        };
      case "plugin-folder-held":
        return {
          success: false,
          message: findPluginNameCollision({
            ...outcome,
            refused: outcome.pluginId,
            askedFor: fullPluginId,
            surface: surface === "cli" ? "cli" : "ui",
          }),
          failureCode: "plugin_folder_held",
        };
      case "unrecordable-plugin-id":
        return {
          success: false,
          message: formatInvalidPluginIdMessage(
            outcome.pluginId,
            fullPluginId,
            outcome.pluginId === fullPluginId
              ? {
                  pluginName: catalogEntry.name,
                  marketplaceName: foundMarketplace,
                }
              : undefined,
          ),
          failureCode: "invalid_plugin_id",
        };
      case "installed-list-held":
        return {
          success: false,
          message: `Plugin "${quotedPrintable(fullPluginId)}" was not installed: ${readInstalledPluginsFile(outcome.held)}`,
          failureCode: "install_records_unreadable",
        };
      case "settings-write-failed":
        return {
          success: false,
          message: `Failed to update settings: ${outcome.message}`,
          failureCode: "settings_write_failed",
        };
      case "resolution-failed":
        return {
          success: false,
          message: formatResolutionError(outcome.resolution),
          failureCode: "dependency_resolution_failed",
        };
      case "blocked-by-policy":
        return {
          success: false,
          ...describePolicyBlock(outcome),
        };
      case "dependency-blocked-by-policy":
        return {
          success: false,
          message: `Plugin "${outcome.pluginName}" depends on "${outcome.blockedDependency}", which is blocked by your organization's policy`,
          failureCode: "dependency_policy_blocked",
        };
      case "marketplace-blocked-by-policy":
        return {
          success: false,
          ...describePolicyBlock(outcome),
        };
      case "dependency-marketplace-blocked-by-policy":
        return {
          success: false,
          message: `Plugin "${outcome.pluginName}" depends on "${outcome.blockedDependency}" from marketplace "${outcome.marketplaceName}", which is blocked by your organization's policy`,
          failureCode: "dependency_policy_blocked",
        };
      case "plugin-directory-unavailable":
        switch (outcome.reason) {
          case "plugin-directory-unavailable":
            return {
              success: false,
              message: formatDirectoryUnavailableMessage(outcome.pluginName, outcome.unavailableDependency),
              failureCode: "plugin_directory_unavailable",
            };
        }
        return {
          success: false,
          message: `Failed to install plugin "${quotedPrintable(fullPluginId)}"`,
          failureCode: "dependency_resolution_failed",
        };
      case "range-conflict": {
        let subjectWord = outcome.dep === fullPluginId ? "Plugin" : "Dependency";
        return {
          success: false,
          failureCode: "dependency_version_conflict",
          message: describeConstraintConflict(
            subjectWord,
            outcome.dep,
            outcome.ranges,
            outcome.why,
            outcome.installed,
            outcome.suggestDependencyUpdate,
          ),
        };
      }
      case "no-matching-tag": {
        let subjectWord = outcome.dep === fullPluginId ? "Plugin" : "Dependency";
        return {
          success: false,
          message: noMatchingTagMessage(subjectWord, outcome.dep, outcome.range),
          failureCode: "dependency_version_conflict",
        };
      }
    }
  let enableCommand = claudeCommand("plugin enable", fullPluginId);
  let enableHint = enableCommand
    ? ` \u2014 enable it with: ${enableCommand}`
    : " \u2014 enable it in /plugin";
  let disabledNote = outcome.installedDisabled.includes(fullPluginId)
    ? outcome.installedDisabledByDefault.includes(fullPluginId)
      ? `. This plugin is disabled by default${enableHint}`
      : `. This plugin is disabled in your settings${enableHint}`
    : "";
  let staleWarning = !refreshError
    ? ""
    : isDirectorySource
      ? `. Warning: ${directoryUnreachableMessage()}`
      : `. Warning: ${refreshError} \u2014 installed from the cached catalog, so the version may be stale`;
  let otherInstallsNote = describeOtherMarketplaceInstall(
    fullPluginId,
    catalogEntry.name,
    outcome.copiesInOtherProjects,
  );
  let switchNote = "";
  let switched;
  if (outcome.replacedCopies) {
    let switchResult = await finishReplaceSwitch(
      fullPluginId,
      scope,
      outcome.replacedCopies,
      {
        newCopyWasJustInstalled: !existingInstall,
        newCopyWasOn,
        surface,
        carrySettingsFrom,
      },
      storageV5,
    );
    if (!switchResult.ok)
      return {
        success: false,
        message: switchResult.message,
        failureCode: "replace_failed",
      };
    switchNote = switchResult.note;
    switched = {
      from: switchResult.from,
      replaced: switchResult.replaced,
      stayedDisabled: switchResult.stayedDisabled,
      keptOwnSettings: switchResult.keptOwnSettings,
      settingsRemovedFrom: switchResult.settingsRemovedFrom,
      ...(switchResult.settingsLeftInPlace && {
        settingsLeftInPlace: switchResult.settingsLeftInPlace,
      }),
      savedDataRemovedFrom: switchResult.savedDataRemovedFrom,
      ...(switchResult.keptDataDir && {
        keptDataDir: switchResult.keptDataDir,
      }),
      ...(switchResult.oldCopyStillRecordedAt.length > 0 && {
        oldCopyStillRecordedAt: switchResult.oldCopyStillRecordedAt,
      }),
      ...((switchResult.saysMore ||
        outcome.depNote !== "" ||
        disabledNote !== "" ||
        staleWarning !== "" ||
        otherInstallsNote !== "" ||
        officialNote !== "") && {
        messageSaysMore: true,
      }),
    };
  }
  let pluginId_2 = `Successfully installed plugin: ${switchNote !== "" || otherInstallsNote !== "" ? displayPluginId(fullPluginId) : fullPluginId} (scope: ${scope})${outcome.depNote}${disabledNote}${staleWarning}${switchNote}${otherInstallsNote === "" ? "" : `. ${otherInstallsNote}`}${officialNote}`;
  return {
    success: true,
    message: `${pluginId_2}${nothingSwitchedSuffix(replaceInstalledCopy === true && outcome.replacedCopies === undefined, pluginId_2)}`,
    pluginId: fullPluginId,
    pluginName: catalogEntry.name,
    scope,
    ...(switched && {
      switched,
    }),
  };
}
//@ chunk-md9fmgw9.js:36337-36496 layout
function nothingSwitchedSuffix(isSwitchContext, pluginId) {
  return isSwitchContext
    ? `${/[.?]$/.test(pluginId) ? " " : ". "}Nothing was switched: no installed copy of this plugin from another marketplace matched this listing`
    : "";
}
//@ chunk-md9fmgw9.js:36496-36568 layout
/**
 * 插件 ID 展示用：截断到 200 字符并去掉不可见字符，全不可见时给占位描述。
 */
function displayPluginId(pluginId) {
  return printableLabel(printableName(pluginId, 200)) || "an id with no visible characters";
}
//@ chunk-md9fmgw9.js:36568-36647 layout
function displayFolderName(file) {
  return printableLabel(file) || "a folder with no visible characters in its name";
}
//@ chunk-md9fmgw9.js:36647-36712 layout
function describeFolder(folder) {
  let label = printableLabel(folder);
  return label === "" ? displayFolderName(folder) : `the folder ${label}`;
}
//@ chunk-md9fmgw9.js:36712-36761 layout
function displayMarketplaceName(marketplaceName) {
  return marketplaceName === OFFICIAL_MARKETPLACE_NAME
    ? marketplaceDisplayName(marketplaceName)
    : printableLabel(printableName(marketplaceName, 64));
}
//@ chunk-md9fmgw9.js:36761-37036 layout
function findOtherPluginSharingDataDir(pluginId, installedData, excluded = new Set([pluginId])) {
  {
    if (hasFailedInstalledPluginsRead(installedData))
      return {
        kind: "records-unreadable",
      };
    let lower = pluginDataDirPath(pluginId).toLowerCase();
    let found = Object.keys(installedData.plugins).find(
      (key) => key !== pluginId && !excluded.has(key) && pluginDataDirPath(key).toLowerCase() === lower,
    );
    return found === undefined
      ? {
          kind: "nobody",
        }
      : {
          kind: "plugin",
          pluginId: found,
        };
  }
  return {
    kind: "records-unreadable",
  };
}
//@ chunk-md9fmgw9.js:37036-37451 layout
/**
 * 卸载时插件数据目录被保留的说明（另一插件共用、或安装列表读不到无法判断）。
 */
function describeKeptDataDir(keptData, targetPluginId) {
  return `The data directory of ${displayPluginId(keptData.pluginId)} was kept: ${keptData.reason === "another-plugin-uses-it" ? `${keptData.usedBy === undefined ? "the list of installed plugins could not be read, so another installed plugin may use it" : `${displayPluginId(keptData.usedBy)} is installed and uses it`}${keptData.copied ? `; its contents were also copied to ${displayPluginId(targetPluginId)}` : ""}` : keptData.reason === "target-had-own" ? `${displayPluginId(targetPluginId)} already had its own` : "it could not be copied"}`;
}
//@ chunk-md9fmgw9.js:37451-37638 layout
function getEnabledValueAtScope(scope, pluginId, installedIds) {
  let enabledPlugins = getSettingsForSourceForUpkeep(scopeToSettingSource(scope))?.enabledPlugins ?? {};
  let pluginName = findPluginName(Object.keys(enabledPlugins), pluginId);
  if (pluginName === undefined || pluginName === pluginId) return enabledPlugins[pluginId];
  return installedIds !== "unknown" &&
    enabledPluginKeys(
      enabledPlugins,
      pluginId,
      installedIds.filter((key) => key !== pluginId),
    ).includes(pluginName)
    ? enabledPlugins[pluginName]
    : undefined;
}
//@ chunk-md9fmgw9.js:37638-37680 layout
function dataDirKey(pluginId) {
  return pluginDataDirPath(pluginId).toLowerCase();
}
//@ chunk-md9fmgw9.js:37680-42888 layout
/**
 * 卸载后仍残留 local 作用域安装记录时的长说明（列出文件夹、原因与清理命令）。
 */
function describeLeftLocalRecords({ shownId, shownNewId, folders, because }) {
  {
    let listFormat = new Intl.ListFormat("en", {
      type: "conjunction",
    });
    let listWithCount = (items, moreWord) =>
      listFormat.format(items.length > 2 ? [...items.slice(0, 2), `${items.length - 2} ${moreWord}`] : items);
    let [onlyFolder] = folders;
    let severalFolders = folders.length !== 1 || onlyFolder === undefined;
    let folderPhrase = severalFolders
      ? `the folders ${listWithCount(folders.map(displayFolderName), "more of this repository")}`
      : describeFolder(onlyFolder);
    let intro = `. ${capitalize(shownId)} is still recorded as installed at local scope from ${folderPhrase}: ${severalFolders ? "those records were" : "that record was"} left, because `;
    let removeClause = `To remove ${severalFolders ? "them" : "it"}`;
    let whereToUninstall = severalFolders
      ? "start Claude Code in each of those folders and uninstall it there"
      : "start Claude Code in that folder and uninstall it there";
    let describeFile = (fileJudgement) =>
      fileJudgement.readsBack === "on"
        ? displayFolderName(fileJudgement.file)
        : describeUnwritableSettingsSource({
            source: "otherFolder",
            file: fileJudgement.file,
            readsBack: fileJudgement.readsBack,
            ...(fileJudgement.notReadBecause !== undefined && {
              notReadBecause: fileJudgement.notReadBecause,
            }),
          }).replace(fileJudgement.file, () => displayFolderName(fileJudgement.file));
    if (because.kind === "own-local-line")
      return `${intro}its line in local settings (.claude/settings.local.json) is still there although its uninstall was to remove it. ${removeClause}, first take that line out of "enabledPlugins" in that file yourself, then ${whereToUninstall}`;
    if (because.kind === "legacy-local-file") {
      let { file } = because;
      let readsBackOn = file.readsBack === "on";
      let fixInstruction = readsBackOn
        ? 'take it out of "enabledPlugins" in that file yourself'
        : file.readsBack === "unreadable"
          ? "fix that file so that it can be read as settings, and switch the plugin off in it if it is on there"
          : "switch it off in that file if it is on there";
      return `${intro}${describeFile(file)} ${readsBackOn ? "still switches it on" : "may still switch it on"} (it is an older local settings file in the folder this session was started in). ${removeClause}, first ${fixInstruction}, then ${whereToUninstall}. Until then it ${readsBackOn ? "can load" : "may still load"} beside ${shownNewId}`;
    }
    let hasLaunchFolderFiles = because.ofTheLaunchFolder.length > 0;
    let hasBothGroups = hasLaunchFolderFiles && because.ofFolders.length > 0;
    let relevantFiles = hasBothGroups
      ? [...because.ofTheLaunchFolder, ...because.ofFolders]
      : hasLaunchFolderFiles
        ? because.ofTheLaunchFolder
        : because.ofFolders;
    let all = relevantFiles.every((fileJudgement) => fileJudgement.readsBack === "on");
    let all_2 = relevantFiles.every((fileJudgement) => fileJudgement.readsBack !== "on");
    let any = relevantFiles.some((fileJudgement) => fileJudgement.readsBack === "unreadable");
    let readsBackKey = (fileJudgement) =>
      fileJudgement.readsBack === "not-read-here"
        ? (fileJudgement.notReadBecause ?? "not-trusted")
        : fileJudgement.readsBack;
    let [firstFile] = relevantFiles;
    let commonUnreadReason =
      relevantFiles.length > 1 &&
      firstFile !== undefined &&
      all_2 &&
      relevantFiles.every((fileJudgement) => readsBackKey(fileJudgement) === readsBackKey(firstFile))
        ? readsBackKey(firstFile)
        : undefined;
    let loadPhrase = all ? "can load" : "may still load";
    let filesPronoun = relevantFiles.length === 1 ? "that file" : "those files";
    let projectFileNote = relevantFiles.every((fileJudgement) =>
      fileJudgement.file.endsWith(join(".claude", "settings.json")),
    )
      ? ` (that uninstall does not edit ${filesPronoun})`
      : "";
    let notReadPhrase =
      commonUnreadReason === "unreadable"
        ? "they are there and could not be read"
        : commonUnreadReason === "network-path"
          ? "not read: they are on a network path or are links to one, or could not be checked"
          : "not read: this workspace is not yet trusted";
    if (hasBothGroups) {
      let reasonSuffix = (fileJudgement) =>
        commonUnreadReason !== undefined || fileJudgement.readsBack === "on"
          ? ""
          : `; ${describeFile(fileJudgement).slice(displayFolderName(fileJudgement.file).length + 2, -1)}`;
      let fileDescriptions = [
        ...because.ofTheLaunchFolder.map(
          (fileJudgement) =>
            `${displayFolderName(fileJudgement.file)} (in the folder this session was started in${reasonSuffix(fileJudgement)})`,
        ),
        ...because.ofFolders
          .slice(0, 2)
          .map((ofFolder) =>
            commonUnreadReason === undefined ? describeFile(ofFolder) : displayFolderName(ofFolder.file),
          ),
        ...(because.ofFolders.length > 2 ? [`${because.ofFolders.length - 2} more`] : []),
      ];
      let switchPhrase = all
        ? "still switch it on"
        : all_2
          ? "may still switch it on"
          : "still switch it on, or may";
      let fixInstruction = all
        ? "switch it off in each of those files"
        : any
          ? "fix any of those files that cannot be read as settings, and switch it off in each where it is on"
          : "switch it off in each of those files where it is on";
      return `${intro}settings files that this session does not read ${switchPhrase}: ${listFormat.format(fileDescriptions)}${commonUnreadReason === undefined ? "" : ` (${notReadPhrase})`}. ${removeClause}, first ${fixInstruction}, then ${whereToUninstall}. Until then it ${loadPhrase} beside ${shownNewId}`;
    }
    if (!hasLaunchFolderFiles && severalFolders) {
      let switchPhrase = all
        ? "still switch it on"
        : all_2
          ? "may still switch it on"
          : "still switch it on, or may";
      let fileDescriptions =
        commonUnreadReason === undefined
          ? listWithCount(relevantFiles.map(describeFile), "more")
          : `${listWithCount(
              relevantFiles.map((fileJudgement) => displayFolderName(fileJudgement.file)),
              "more",
            )} (${notReadPhrase})`;
      return `${intro}settings files in those folders ${switchPhrase}: ${fileDescriptions}. ${removeClause}, for each folder first ${`switch it off in its settings file${any ? ", or fix the file if it cannot be read as settings" : all_2 ? " if it is on there" : ""}`}, then start Claude Code in that folder and uninstall it there${projectFileNote}. Until then it ${loadPhrase} in those folders beside ${shownNewId}`;
    }
    let fileDescriptions = listFormat.format(
      commonUnreadReason === undefined
        ? relevantFiles.map(describeFile)
        : relevantFiles.map((fileJudgement) => displayFolderName(fileJudgement.file)),
    );
    let statusPhrase =
      commonUnreadReason === "unreadable"
        ? "are there and could not be read, and may still switch it on"
        : commonUnreadReason === "network-path"
          ? "were not read (they are on a network path or are links to one, or could not be checked) and may still switch it on"
          : commonUnreadReason === "not-trusted"
            ? "were not read (this workspace is not yet trusted) and may still switch it on"
            : all
              ? relevantFiles.length === 1
                ? "still switches it on"
                : "still switch it on"
              : all_2
                ? "may still switch it on"
                : "still switch it on, or may";
    let isSingleFile = relevantFiles.length === 1;
    let fixInstruction = all
      ? isSingleFile
        ? "switch it off in that file"
        : "switch it off in both files"
      : any
        ? isSingleFile
          ? "fix that file so that it can be read as settings, and switch the plugin off in it if it is on there"
          : "fix the file that could not be read so that it can be read as settings, and switch the plugin off in both files where it is on"
        : isSingleFile
          ? "switch it off in that file if it is on there"
          : "switch it off in those files where it is on";
    if (hasLaunchFolderFiles)
      return `${intro}in the folder this session was started in ${fileDescriptions} ${statusPhrase} (this session reads its settings from another folder, so nothing done from here edits ${filesPronoun}). ${removeClause}, first ${fixInstruction}, then ${whereToUninstall}. Until then it ${loadPhrase} beside ${shownNewId}`;
    if (because.sharedCheckout && isSingleFile && all)
      return `${intro}${fileDescriptions} ${statusPhrase}. ${removeClause}: if that is this repository's shared settings file, checked out in that folder too, first switch the plugin off in the repository's settings file and update the other checkouts; otherwise first switch it off in that file; then ${whereToUninstall}. Until then it ${loadPhrase} in that folder beside ${shownNewId}`;
    return `${intro}${fileDescriptions} ${statusPhrase}. ${removeClause}, first ${fixInstruction}, then ${whereToUninstall}${projectFileNote}. Until then it ${loadPhrase} in that folder beside ${shownNewId}`;
  }
  return "";
}
//@ chunk-md9fmgw9.js:42888-43520 layout
function describeSecretStore(pluginId, carriedTo) {
  {
    let storeKind = primarySecureStoreKind();
    return {
      name: quotedPrintable(parsePluginIdentifier(pluginId).name, 120),
      store:
        storeKind === "keychain"
          ? "your keychain (or in the credentials file in your Claude configuration folder)"
          : storeKind === "credential-manager"
            ? "Windows Credential Manager (or in the credentials file in your Claude configuration folder)"
            : "the credentials file in your Claude configuration folder",
      uninstallCommand: runCommandHint("plugin uninstall", pluginId, {
        fallback: `uninstall "${quotedPrintable(pluginId, 200)}" from the command line`,
      }),
      carriedClause: (leftoverPhrase) =>
        carriedTo === undefined
          ? ""
          : ` (its settings and stored secrets were also carried over to ${carriedTo}; ${leftoverPhrase} the old copies)`,
    };
  }
  return {
    name: "",
    store: "",
    uninstallCommand: "",
    carriedClause: () => "",
  };
}
//@ chunk-md9fmgw9.js:43520-45195 layout
/**
 * 无安装记录但上次卸载清理未完成时的说明（残留的密钥存储项、数据目录等）。
 */
function describeUnfinishedCleanup({ pluginId, entry, carriedTo, dataFolder }) {
  {
    let {
      name: pluginName,
      store,
      uninstallCommand,
      carriedClause,
    } = describeSecretStore(pluginId, carriedTo);
    let intro = `. ${capitalize(displayPluginId(pluginId))} has no install record left, but the clean-up after its last uninstall did not finish${carriedClause("what may be left are")}: `;
    if (entry === "held")
      return `${intro}its settings and stored secrets or its data folder may still be there, and "${pluginName}" may still be tied to the repository it came from. To finish it, ${uninstallCommand}`;
    let leftoverText =
      dataFolder === "may-go"
        ? `${intro}its settings may still be under "pluginConfigs" in your user settings file, its stored secrets in ${store}, and its data folder (${displayFolderName(pluginDataDirPath(pluginId))}) may still be there. No command removes them for this id yet; you can take that entry out and delete that folder yourself; the stored secrets stay`
        : dataFolder === "not-known"
          ? `${intro}its settings may still be under "pluginConfigs" in your user settings file, its stored secrets in ${store}, and its data folder (${displayFolderName(pluginDataDirPath(pluginId))}) may still be there. No command removes them for this id yet; you can take that entry out yourself; leave the data folder until the install records can be read again, because another installed plugin may use it; the stored secrets stay`
          : `${intro}its settings may still be under "pluginConfigs" in your user settings file, and its stored secrets in ${store}. No command removes them for this id yet; you can take that entry out yourself; the stored secrets stay`;
    return entry === "none"
      ? `${leftoverText}. Nothing ties "${pluginName}" to the repository it came from, so a plugin installed under that name later could read what is left`
      : entry === "unreadable"
        ? `${leftoverText}. plugin-directory-bindings.json in the plugins folder could not be used, so "${pluginName}" cannot be installed again until that file can be used`
        : leftoverText;
  }
  return "";
}
//@ chunk-md9fmgw9.js:45195-46491 layout
/**
 * 移除安装记录后清理残留时的说明文本。
 */
function describeLeftRecordCleanup({ pluginId, folder, entry, carriedTo, dataFolder }) {
  {
    let {
      name: pluginName,
      store,
      uninstallCommand,
      carriedClause,
    } = describeSecretStore(pluginId, carriedTo);
    let intro = `. After Claude Code tried to remove the record of ${displayPluginId(pluginId)} for ${describeFolder(folder)}, the install records could not be read, so it is not known whether that record went or whether the plugin is still installed anywhere, and what the plugin saved was left in place${carriedClause("what is left are")}`;
    if (entry === "held")
      return `${intro}. If it is installed nowhere any more, ${uninstallCommand} to remove what it saved and free its name`;
    let hasDataFolder = dataFolder !== "in-use";
    return `${intro}: its settings under "pluginConfigs" in your user settings file, ${hasDataFolder ? `its stored secrets in ${store}, and its data folder (${displayFolderName(pluginDataDirPath(pluginId))})` : `and its stored secrets in ${store}`}.${entry === "unreadable" ? ` plugin-directory-bindings.json in the plugins folder could not be used, so "${pluginName}" cannot be installed again until that file can be used.` : ""} If it is installed nowhere any more, no command removes them for this id yet; you can take that entry out yourself; ${hasDataFolder ? "leave the data folder until the install records can be read again, because another installed plugin may use it; " : ""}the stored secrets stay${entry === "none" ? `. Nothing ties "${pluginName}" to the repository it came from, so a plugin installed under that name later could read what is left` : ""}`;
  }
  return "";
}
//@ chunk-md9fmgw9.js:46491-47541 layout
/**
 * 找出哪些 settings.local.json（本会话目录、其他仓库目录）仍提到该插件，供卸载提示使用。
 */
async function findLocalSettingsMentions(
  pluginId,
  folders,
  { installedOthers, launchFolderToo, ownLocalFileToo },
) {
  {
    let mentions = {
      kind: "by-files",
      ofTheLaunchFolder: [],
      ofFolders: new Map(),
      launchProjectFileOn: undefined,
    };
    let scan = await scanSettingsForPluginUninstall(
      pluginId,
      installedOthers,
      launchFolderToo === undefined ? folders : [...folders, launchFolderToo],
      {
        theSessions: getSettingsFilePathForSource("localSettings"),
        byAFreshWalk: join(getRepoRootOrCwd(), ".claude", "settings.local.json"),
      },
    );
    if (ownLocalFileToo && scan.thisLaunchsLocalFile !== undefined)
      return {
        kind: "own-local-file",
        readsBack: scan.thisLaunchsLocalFile,
        theSessionsOwn: true,
      };
    if (ownLocalFileToo && scan.thisLaunchsLocalFileByAFreshWalk !== undefined)
      return {
        kind: "own-local-file",
        readsBack: scan.thisLaunchsLocalFileByAFreshWalk,
        theSessionsOwn: false,
      };
    if (ownLocalFileToo && scan.thisLaunchsLegacyLocalFile !== undefined)
      return {
        kind: "own-legacy-local-file",
        file: scan.thisLaunchsLegacyLocalFile,
      };
    let mentionsInFolder = (folder) =>
      (scan.byFolder.get(folder) ?? []).filter(
        (mention) =>
          mention.alsoThisLaunchs !== "localSettings" && mention.alsoThisLaunchs !== "legacyLocalSettings",
      );
    if (launchFolderToo !== undefined) mentions.ofTheLaunchFolder = mentionsInFolder(launchFolderToo);
    for (let folder of folders) {
      let folderMentions = mentionsInFolder(folder);
      if (folderMentions.length > 0) mentions.ofFolders.set(folder, folderMentions);
    }
    mentions.launchProjectFileOn = scan.thisLaunchsProjectFileOn;
    return mentions;
  }
  return {
    kind: "by-files",
    ofTheLaunchFolder: [],
    ofFolders: new Map(),
    launchProjectFileOn: undefined,
  };
}
//@ chunk-md9fmgw9.js:47541-47656 layout
function isSameRepoPathMoved(file, otherFile) {
  if (realpathAllowMissing(file)) return false;
  let gitRootUncached = findGitRootUncached(dirname(file));
  let gitRootUncached_2 = findGitRootUncached(dirname(otherFile));
  return (
    gitRootUncached !== null &&
    gitRootUncached_2 !== null &&
    gitRootUncached !== gitRootUncached_2 &&
    relative(gitRootUncached, file) === relative(gitRootUncached_2, otherFile)
  );
}
//@ chunk-md9fmgw9.js:47656-48110 layout
async function checkDirectoryBindingPersistable(pluginId) {
  {
    let outcome = await persistDirectoryBinding(pluginId, getInstalledPlugins().plugins[pluginId]);
    return outcome === "not-persisted"
      ? "plugin-directory-bindings.json in the plugins folder could not be used or written, so nothing would keep the name for the repository it was installed from: once the file can be written, switch again"
      : outcome === "cannot-hold"
        ? "its id is too long for plugin-directory-bindings.json to hold, so nothing would keep the name for the repository it was installed from"
        : undefined;
  }
  return;
}
//@ chunk-md9fmgw9.js:48110-48149 layout
function getRepoRootOrCwd() {
  return getProjectConfigRoot() ?? resolveLocalSettingsStoreRoot(getOriginalCwd(), uncachedStorageRootFor);
}
//@ chunk-md9fmgw9.js:48149-48343 layout
function isInstallationForThisRepo(installation) {
  {
    let originalCwd = getOriginalCwd();
    let projectPath = installation.projectPath;
    if (projectPath !== undefined && projectPath !== originalCwd && realpathAllowMissing(projectPath))
      return false;
    if (!isInstallationRelevantToCurrentProject(installation)) return false;
    if (projectPath === undefined || projectPath === originalCwd) return true;
    let storageRoot = uncachedStorageRootFor(originalCwd);
    return (
      storageRoot !== null &&
      uncachedStorageRootFor(projectPath) === storageRoot &&
      resolveLocalSettingsStoreRoot(projectPath, uncachedStorageRootFor) === getRepoRootOrCwd()
    );
  }
  return false;
}
//@ chunk-md9fmgw9.js:48343-70983 layout
/**
 * --replace 切换到另一个市场的同名插件之后的收尾：迁移启用状态与插件选项、禁用/卸载旧副本，生成结果说明。
 */
async function finishReplaceSwitch(
  pluginId,
  scope,
  copies,
  { newCopyWasJustInstalled, newCopyWasOn, surface, carrySettingsFrom },
  storageV5,
) {
  {
    let newPluginName = displayPluginId(pluginId);
    let primaryCopy =
      copies.find((copy) => copy.pluginId === carrySettingsFrom) ??
      copies.find(
        (copy) => locatePluginInstall(copy.pluginId, undefined, groupedEnabledPlugins()).effective !== false,
      ) ??
      copies[0];
    let oldPluginName = displayPluginId(primaryCopy.pluginId);
    let listFormat = new Intl.ListFormat("en", {
      type: "conjunction",
    });
    let labelBudget = {
      head: 200,
      tail: 200,
    };
    let oldNamesText = listFormat.format(copies.map((copy) => displayPluginId(copy.pluginId)));
    let severalOldCopies = copies.length > 1;
    let stillInstalledText = `${oldNamesText} ${severalOldCopies ? "are" : "is"} still installed`;
    let switchEvent = {
      fromPluginId: primaryCopy.pluginId,
      toPluginId: pluginId,
      surface,
      managedNames: policyEnabledPluginNameSet(),
    };
    let gitCommitSha = getInstalledPlugins().plugins[pluginId]?.find(
      (install) => install.scope === scope && isInstallationRelevantToCurrentProject(install),
    )?.gitCommitSha;
    let pinChanged =
      primaryCopy.gitCommitSha !== undefined &&
      gitCommitSha !== undefined &&
      primaryCopy.gitCommitSha !== gitCommitSha;
    let oldCopyLocation = locatePluginInstall(primaryCopy.pluginId, undefined, groupedEnabledPlugins());
    let oldCopyWasOff = oldCopyLocation.effective === false && !newCopyWasOn;
    let keepNewCopyOffIfNeeded = async () => {
      let scope_2 = findPluginInSettings(pluginId)?.scope;
      let decidingScope =
        oldCopyLocation.decidingScope === "project" && scope !== "project"
          ? "local"
          : oldCopyLocation.decidingScope;
      let disableScope =
        decidingScope !== undefined &&
        (scope_2 === undefined || SCOPE_PRECEDENCE[decidingScope] >= SCOPE_PRECEDENCE[scope_2])
          ? decidingScope
          : undefined;
      let disableResult = await disablePluginOp(pluginId, disableScope, storageV5).catch(() => ({
        success: false,
        message: "",
      }));
      return disableResult.success || disableResult.alreadyInGoalState === true;
    };
    let {
      optionsCarried,
      secretsCarried,
      oldDataDirDisposable,
      dataDirCopied,
      targetHadOwn,
      dataDirKeptReason,
    } = await copyPluginOptions(primaryCopy.pluginId, pluginId, copyDir, storageV5);
    let newDataDirKey = dataDirKey(pluginId);
    let oldDataDirKey = dataDirKey(primaryCopy.pluginId);
    let otherDataDirUser;
    let oldDataDirShared = false;
    let canRemoveOldDataDir = (registry) => {
      if (!oldDataDirDisposable || oldDataDirKey === newDataDirKey) return false;
      let otherPluginSharingDataDir = findOtherPluginSharingDataDir(
        primaryCopy.pluginId,
        registry,
        new Set(
          copies.flatMap((copy) =>
            copy === primaryCopy || (registry.plugins[copy.pluginId]?.length ?? 0) === 0
              ? [copy.pluginId]
              : [],
          ),
        ),
      );
      otherDataDirUser = otherPluginSharingDataDir.kind === "nobody" ? undefined : otherPluginSharingDataDir;
      return otherPluginSharingDataDir.kind === "nobody";
    };
    let failure;
    if (!optionsCarried || !secretsCarried) {
      let joined = [
        ...(optionsCarried ? [] : ["option values"]),
        ...(secretsCarried ? [] : ["stored secrets"]),
      ].join(" and ");
      failure = {
        fromPluginId: primaryCopy.pluginId,
        rollBack: newCopyWasJustInstalled,
        rolledBack: `Could not switch: the ${joined} of ${oldPluginName} could not be copied to ${newPluginName}. ${capitalize(stillInstalledText)} and ${newPluginName} was uninstalled again. Plugins that were installed with it as its dependencies, if any, stay installed`,
        bothInstalled: severalOldCopies
          ? `${capitalize(newPluginName)} is installed, but the ${joined} of ${oldPluginName} could not be copied to it, so nothing was uninstalled. ${capitalize(stillInstalledText)} beside it until you switch again or uninstall them`
          : `${capitalize(newPluginName)} is installed, but the ${joined} of ${oldPluginName} could not be copied to it, so ${oldPluginName} was not uninstalled. Both are installed until you switch again or uninstall ${oldPluginName}`,
      };
    }
    let uninstalledCopies = [];
    let withDataDirUsers = (installedIds) =>
      installedIds === "unknown"
        ? installedIds
        : normalizeCaseForComparison_2([
            ...installedIds,
            ...uninstalledCopies.flatMap((uninstalled) =>
              uninstalled.record === undefined ? [] : [uninstalled.copy.pluginId],
            ),
          ]);
    let directoryNotes = [];
    let optionsRemoved = new Set();
    let dataFolderOwner = new Map();
    let blocker;
    let blockerEnabledValue;
    let uninstalledSet = new Set();
    let settingsKept = new Set();
    let installedIds = listInstalledPluginIds(getInstalledPlugins());
    let enabledValues =
      failure !== undefined
        ? []
        : copies.flatMap((copy) =>
            ["user", "local"].map((scope) => ({
              scope,
              id: copy.pluginId,
              value: getEnabledValueAtScope(scope, copy.pluginId, installedIds),
            })),
          );
    let localRecords = (copy, oldScope) => {
      let filtered = (getInstalledPlugins().plugins[copy.pluginId] ?? []).filter(
        (install) => install.scope === oldScope,
      );
      let found = filtered.find(isInstallationRelevantToCurrentProject);
      let projectPathForScope = getProjectPathForScope(oldScope);
      let record =
        projectPathForScope === undefined
          ? found
          : filtered.find(
              (install) =>
                install.projectPath === projectPathForScope &&
                isInstallationRelevantToCurrentProject(install),
            );
      let seenPaths = new Set([projectPathForScope]);
      let otherFolders =
        oldScope !== "local" || record === undefined
          ? []
          : filtered.filter((install) => {
              if (seenPaths.has(install.projectPath)) return false;
              seenPaths.add(install.projectPath);
              return isInstallationForThisRepo(install);
            });
      return {
        anyRecordHere: found,
        launchFolder: projectPathForScope,
        record,
        otherFolders,
      };
    };
    let flattened = [primaryCopy, ...copies.filter((copy) => copy !== primaryCopy)].flatMap((copy) =>
      copy.scopes.flatMap((scope) =>
        scope === "managed"
          ? []
          : [
              {
                copy,
                oldScope: scope,
              },
            ],
      ),
    );
    let folderHint = (oldScope, projectPath) =>
      `it was installed at ${oldScope} scope from the folder ${projectPath}: start Claude Code in that folder and switch there`;
    for (let { copy, oldScope } of failure !== undefined ? [] : flattened) {
      let { anyRecordHere, record } = localRecords(copy, oldScope);
      if (record === undefined && anyRecordHere?.projectPath) {
        blocker = {
          copy,
          scope: oldScope,
          message: folderHint(oldScope, anyRecordHere.projectPath),
        };
        break;
      }
    }
    let judgedByCopy = new Map();
    let projectConfigRoot = getProjectConfigRoot();
    let launchFolderToo =
      projectConfigRoot !== null && resolve(projectConfigRoot) !== resolve(getOriginalCwd())
        ? getOriginalCwd()
        : undefined;
    let otherInstalledUsers = (plugins, pluginId) =>
      bindingKeysFor(plugins, pluginId).flatMap(([otherId, installs]) =>
        otherId !== pluginId && installs.length > 0 ? [otherId] : [],
      );
    for (let copy of failure !== undefined || blocker !== undefined ? [] : copies) {
      let plugins = getInstalledPlugins().plugins;
      let otherFolders = copy.scopes.includes("local") ? localRecords(copy, "local").otherFolders : [];
      let folders = otherFolders.flatMap((otherFolder) => otherFolder.projectPath ?? []);
      let judged =
        folders.length === 0
          ? undefined
          : await findLocalSettingsMentions(copy.pluginId, folders, {
              installedOthers: otherInstalledUsers(plugins, copy.pluginId),
              launchFolderToo,
              ownLocalFileToo: false,
            }).catch((error) => errorMessage(error));
      if (typeof judged === "string") {
        blocker = {
          copy,
          scope: "local",
          message: judged,
        };
        break;
      }
      judgedByCopy.set(copy, {
        records: [...(plugins[copy.pluginId] ?? [])],
        otherFolders,
        judged,
      });
    }
    for (let [copy, { otherFolders }] of blocker !== undefined ? [] : judgedByCopy) {
      let persistError =
        otherFolders.length > 0 && isOfficialPluginDirectoryId(copy.pluginId)
          ? await checkDirectoryBindingPersistable(copy.pluginId).catch((error) => errorMessage(error))
          : undefined;
      if (persistError !== undefined) {
        blocker = {
          copy,
          scope: "local",
          message: persistError,
        };
        break;
      }
    }
    let installPaths = new Map();
    for (let { copy, oldScope } of failure !== undefined || blocker !== undefined ? [] : flattened) {
      let { anyRecordHere, launchFolder, record } = localRecords(copy, oldScope);
      let enabledValue = enabledValues.find(
        (entry) => entry.id === copy.pluginId && entry.scope === oldScope,
      )?.value;
      let sharesDataDir = copy === primaryCopy && canRemoveOldDataDir(getInstalledPlugins());
      oldDataDirShared ||= sharesDataDir;
      let uninstallResult = await uninstallPluginOp(copy.pluginId, oldScope, sharesDataDir, storageV5, {
        settingsStillOn: "remove-anyway",
      }).catch((error) => ({
        success: false,
        message: errorMessage(error),
      }));
      if (uninstallResult.success) {
        uninstalledCopies.push({
          copy,
          scope: oldScope,
          record,
          enabledValue,
        });
        installPaths.set(copy, record?.installPath);
        if (uninstallResult.directoryNameNote)
          directoryNotes.push([copy.pluginId, uninstallResult.directoryNameNote]);
        if (uninstallResult.optionsRemoved) optionsRemoved.add(copy);
        if (uninstallResult.savedKept !== undefined) settingsKept.add(copy);
        else settingsKept.delete(copy);
        if (uninstallResult.dataFolderUser !== undefined)
          dataFolderOwner.set(copy, uninstallResult.dataFolderUser);
        if ((getInstalledPlugins().plugins[copy.pluginId]?.length ?? 0) === 0) uninstalledSet.add(copy);
      } else {
        let stillInstalled = !getInstalledPlugins().plugins[copy.pluginId]?.some(
          (install) =>
            install.scope === oldScope &&
            (record === undefined || launchFolder === undefined
              ? isInstallationRelevantToCurrentProject(install)
              : install.projectPath === launchFolder),
        );
        let notInstalled =
          uninstallResult.failureCode === "not_installed" ||
          uninstallResult.failureCode === "not_installed_at_scope";
        if (notInstalled && (anyRecordHere === undefined || stillInstalled)) continue;
        blocker = {
          copy,
          scope: oldScope,
          message:
            notInstalled && record === undefined && anyRecordHere?.projectPath
              ? folderHint(oldScope, anyRecordHere.projectPath)
              : uninstallResult.message,
        };
        if (record !== undefined && stillInstalled)
          uninstalledCopies.push({
            copy,
            scope: oldScope,
            enabledValue,
            record,
          });
        else if (anyRecordHere !== undefined) blockerEnabledValue = enabledValue;
        break;
      }
    }
    if (blocker !== undefined) {
      let installedPlugins = getInstalledPlugins();
      let installedIds = withDataDirUsers(listInstalledPluginIds(installedPlugins));
      let oldCopyGone = (installedPlugins.plugins[primaryCopy.pluginId]?.length ?? 0) === 0;
      let couldNotRestore = [];
      let settingsNotes = [];
      let setEnabledAtScope = async (scope, pluginId, value) => {
        try {
          return (
            (
              await updateSettingsForSourceWithTransform(
                scopeToSettingSource(scope),
                (settings) => ({
                  enabledPlugins: {
                    ...settings?.enabledPlugins,
                    [pluginId]: value,
                  },
                }),
                undefined,
                storageV5,
              )
            ).error === null
          );
        } catch {
          return false;
        }
      };
      let enabledLineNote = (scope, id) =>
        `the "enabledPlugins" line in ${scope} settings that turned ${displayPluginId(id)} off there (if you want it off, disable it in /plugin)`;
      let failedToDisable = new Set();
      let pluginId_2 = blocker.copy.pluginId;
      let blockerEnabled =
        blockerEnabledValue !== undefined &&
        getEnabledValueAtScope(blocker.scope, pluginId_2, installedIds) === undefined
          ? blockerEnabledValue
          : undefined;
      for (let entry of enabledValues.filter((entry) => entry.value === false))
        if (
          getEnabledValueAtScope(entry.scope, entry.id, installedIds) !== false &&
          !(await setEnabledAtScope(entry.scope, entry.id, false))
        ) {
          failedToDisable.add(entry.id);
          settingsNotes.push(enabledLineNote(entry.scope, entry.id));
        }
      for (let uninstalled of uninstalledCopies) {
        let { record, enabledValue } = uninstalled;
        let reinstalled =
          record !== undefined &&
          (await addInstalledPlugin(
            uninstalled.copy.pluginId,
            {
              ...record,
              version: record.version ?? "unknown",
              installedAt: record.installedAt ?? new Date().toISOString(),
            },
            uninstalled.scope,
            record.projectPath,
            storageV5,
          ).then(
            () => true,
            () => false,
          ));
        let enabledRestored =
          enabledValue === undefined ||
          enabledValue === false ||
          !reinstalled ||
          (!failedToDisable.has(uninstalled.copy.pluginId) &&
            (await setEnabledAtScope(uninstalled.scope, uninstalled.copy.pluginId, enabledValue)));
        if (!reinstalled)
          couldNotRestore.push(`${displayPluginId(uninstalled.copy.pluginId)} (${uninstalled.scope} scope)`);
        else if (!enabledRestored)
          settingsNotes.push(
            `the "enabledPlugins" line for ${displayPluginId(uninstalled.copy.pluginId)} in ${uninstalled.scope} settings${failedToDisable.has(uninstalled.copy.pluginId) ? " (left out, because the line that turned it off could not be put back; if you want it on, enable it in /plugin)" : ""}`,
          );
      }
      if (
        blockerEnabled !== undefined &&
        blockerEnabled !== false &&
        !(
          !failedToDisable.has(pluginId_2) &&
          (await setEnabledAtScope(blocker.scope, pluginId_2, blockerEnabled))
        )
      )
        settingsNotes.push(
          `the "enabledPlugins" line for ${displayPluginId(pluginId_2)} in ${blocker.scope} settings${failedToDisable.has(pluginId_2) ? " (left out, because the line that turned it off could not be put back; if you want it on, enable it in /plugin)" : ""}`,
        );
      if (
        uninstalledSet.has(primaryCopy) ||
        (oldCopyGone && uninstalledCopies.some((uninstalled) => uninstalled.copy === primaryCopy))
      ) {
        let copyBack = await copyPluginOptions(pluginId, primaryCopy.pluginId, copyDir, storageV5).catch(
          () => ({
            optionsCarried: false,
            secretsCarried: false,
            targetHadOwn: false,
            dataDirCopied: false,
          }),
        );
        if (!copyBack.optionsCarried || !copyBack.secretsCarried)
          couldNotRestore.push(
            `the option values and stored secrets of ${oldPluginName} (they are under ${newPluginName})`,
          );
        else if (targetHadOwn && !copyBack.targetHadOwn)
          couldNotRestore.push(
            `the option values ${oldPluginName} had (${newPluginName} already had its own, and ${oldPluginName} now has those)`,
          );
        if (dataDirCopied && !copyBack.dataDirCopied) {
          if (!(await pathExists(pluginDataDirPath(primaryCopy.pluginId))))
            couldNotRestore.push(`the data directory of ${oldPluginName} (it is under ${newPluginName})`);
          else if (oldDataDirShared)
            couldNotRestore.push(
              `the data directory of ${oldPluginName} (what is left of it may be incomplete; the whole copy is under ${newPluginName})`,
            );
        }
      }
      refreshPluginCaches(storageV5);
      let filtered = copies.filter(
        (copy) =>
          copy !== primaryCopy &&
          copy !== blocker.copy &&
          uninstalledSet.has(copy) &&
          !settingsKept.has(copy),
      );
      let problems = [...couldNotRestore, ...settingsNotes];
      let affectedNames = listFormat.format(filtered.map((copy) => displayPluginId(copy.pluginId)));
      let reenterText = `they were deleted when ${filtered.length === 1 ? "that plugin was" : "those plugins were"} uninstalled and have to be entered again`;
      let extraNote =
        uninstalledCopies.length === 0 && problems.length === 0
          ? ""
          : problems.length > 0
            ? ` Could not be put back: ${listFormat.format(problems)}.${filtered.length > 0 ? ` The settings and stored secrets saved for ${affectedNames} did not come back either: ${reenterText}.` : ""}`
            : ` What had been uninstalled was put back${filtered.length > 0 ? `, except the settings and stored secrets saved for ${affectedNames}: ${reenterText}` : ""}.`;
      let message = blocker.message;
      let shortMessage = printableLabel(
        printableName(
          message.length > 1000
            ? `${truncateToLength(message, 500)} \u2026 ${takeLastChars(message, 500)}`
            : message,
          1100,
        ),
        labelBudget,
      );
      let messageSuffix = shortMessage === "" ? "" : ` (${shortMessage})`;
      failure = {
        fromPluginId: blocker.copy.pluginId,
        rollBack: couldNotRestore.length === 0 && newCopyWasJustInstalled,
        rolledBack: `Could not switch: ${displayPluginId(blocker.copy.pluginId)} could not be uninstalled${messageSuffix}.${extraNote} ${capitalize(stillInstalledText)} and ${newPluginName} was uninstalled again. Plugins that were installed with it as its dependencies, if any, stay installed`,
        bothInstalled: severalOldCopies
          ? `${capitalize(newPluginName)} is installed, but ${displayPluginId(blocker.copy.pluginId)} could not be uninstalled at ${blocker.scope} scope${messageSuffix}.${extraNote} Uninstall ${couldNotRestore.length > 0 ? "what is left of them" : oldNamesText} to finish the switch`
          : `${capitalize(newPluginName)} is installed, but ${oldPluginName} could not be uninstalled at ${blocker.scope} scope${messageSuffix}.${extraNote} Both are installed until you uninstall ${oldPluginName}`,
      };
    }
    if (failure !== undefined) {
      logMarketplaceSwitch({
        ...switchEvent,
        fromPluginId: failure.fromPluginId,
        result: {
          outcome: "bad",
          code: "replace_failed",
        },
      });
      let failureResult = async (bothInstalled) => {
        if (!oldCopyWasOff)
          return {
            ok: false,
            message: bothInstalled,
          };
        let disabled = await keepNewCopyOffIfNeeded().catch(() => false);
        return {
          ok: false,
          message: `${bothInstalled}. ${disabled ? `${capitalize(newPluginName)} was turned off, as ${oldPluginName} was` : `${capitalize(oldPluginName)} was disabled, but ${newPluginName} could not be disabled \u2014 disable it in /plugin`}`,
        };
      };
      if (!failure.rollBack) return failureResult(failure.bothInstalled);
      let rollbackResult = await uninstallPluginOp(pluginId, scope, false, storageV5, {
        settingsStillOn: "remove-anyway",
      }).catch((error) => ({
        success: false,
        message: errorMessage(error),
      }));
      if (rollbackResult.success && dataDirCopied) {
        let installedIds = listInstalledPluginIds(await loadInstalledPlugins(storageV5));
        if (
          installedIds !== "unknown" &&
          !installedIds.some((installedId) => dataDirKey(installedId) === newDataDirKey)
        )
          await removeDirectoryTreeNoFollow(pluginDataDirPath(pluginId)).catch((error) => {
            logForDebugging(
              `Switch to ${pluginId}: could not remove the data directory that the switch had copied: ${errorMessage(error)}`,
              {
                level: "warn",
              },
            );
          });
      }
      return rollbackResult.success || rollbackResult.failureCode === "not_installed"
        ? {
            ok: false,
            message: failure.rolledBack,
          }
        : failureResult(failure.bothInstalled);
    }
    let stayedDisabled = oldCopyWasOff && (await keepNewCopyOffIfNeeded().catch(() => false));
    let dataRemovedIds = [];
    let cleanupNotes = [];
    let keptDataDirIds = new Set();
    for (let copy of settingsKept) {
      keptDataDirIds.add(copy.pluginId);
      cleanupNotes.push(
        `. The settings and stored secrets of ${displayPluginId(copy.pluginId)} were left in place because the list of installed plugins could not be read`,
      );
    }
    if (settingsKept.size > 0)
      cleanupNotes.push(
        `. To delete what was left in place, ${manualCleanupHint(settingsKept.size === 1 ? "its" : "their")}`,
      );
    let removeLeftData = async (copy) => {
      let copyDataDirKey = dataDirKey(copy.pluginId);
      if ([newDataDirKey, oldDataDirKey].includes(copyDataDirKey)) return;
      let installedIds = listInstalledPluginIds(await loadInstalledPlugins(storageV5));
      let owner =
        installedIds === "unknown"
          ? undefined
          : installedIds.find((installedId) => dataDirKey(installedId) === copyDataDirKey);
      if (installedIds === "unknown" || owner !== undefined) {
        if (owner !== copy.pluginId && (await pathExists(pluginDataDirPath(copy.pluginId))))
          cleanupNotes.push(
            `. The saved data of ${displayPluginId(copy.pluginId)} was left in place because ${owner === undefined ? "the list of installed plugins could not be read" : `${displayPluginId(owner)} is installed and uses it`}`,
          );
        return;
      }
      if (
        (await deletePluginDataDir(copy.pluginId).catch((error) => {
          logForDebugging(
            `Switch to ${pluginId}: could not remove the data directory of ${copy.pluginId}: ${errorMessage(error)}`,
            {
              level: "warn",
            },
          );
          return "failed";
        })) === "removed"
      )
        dataRemovedIds.push(copy.pluginId);
    };
    let cleanupCopy = async (copy, installPath, registry, dataDirExists) => {
      let installedIds = listInstalledPluginIds(registry);
      let copyDataDirKey = dataDirKey(copy.pluginId);
      let deleteDataDir =
        copy === primaryCopy
          ? canRemoveOldDataDir(registry)
          : isOfficialPluginDirectoryId(copy.pluginId) &&
            ![newDataDirKey, oldDataDirKey].includes(copyDataDirKey) &&
            installedIds !== "unknown" &&
            !installedIds.some((installedId) => dataDirKey(installedId) === copyDataDirKey);
      let { dataDirKept, directoryBindingKept } = await cleanupAfterUninstall({
        pluginId: copy.pluginId,
        installPath,
        deleteDataDir,
        scope: copy.scopes.filter(isInstallableScope).at(-1) ?? scope,
        storageV5,
        registry,
        installedOthers:
          installedIds === "unknown" ? [] : otherInstalledUsers(registry.plugins, copy.pluginId),
      });
      let index = directoryNotes.findIndex(([pluginId]) => pluginId === copy.pluginId);
      if (
        directoryBindingKept?.installsUnknown === true &&
        officialUninstalled.has(copy) &&
        optionsRemoved.has(copy)
      ) {
        let dataFolderUser = dataFolderOwner.get(copy);
        let any = copies.some(
          (otherCopy) =>
            otherCopy !== copy &&
            otherCopy.pluginId === dataFolderUser &&
            (uninstalledSet.has(otherCopy) || doubleRejected.includes(otherCopy)),
        );
        if (any && index !== -1) directoryNotes.splice(index, 1);
        if ((index === -1 || any) && dataDirExists)
          cleanupNotes.push(
            `. The saved data of ${displayPluginId(copy.pluginId)} was left in place because the list of installed plugins could not be read`,
          );
        return {
          stillSwitchedOn: false,
        };
      }
      let releaseNote = directoryReleaseNote(directoryBindingKept);
      let releaseNotes = releaseNote === "" ? [] : [[copy.pluginId, releaseNote]];
      if (index === -1) directoryNotes.push(...releaseNotes);
      else directoryNotes.splice(index, 1, ...releaseNotes);
      if (directoryBindingKept !== undefined && !directoryBindingKept.optionsGone)
        keptDataDirIds.add(copy.pluginId);
      else keptDataDirIds.delete(copy.pluginId);
      if (
        copy !== primaryCopy &&
        dataDirExists &&
        !dataDirKept &&
        (directoryBindingKept === undefined || directoryBindingKept.dataGone)
      )
        dataRemovedIds.push(copy.pluginId);
      return {
        stillSwitchedOn: directoryBindingKept?.stillOnIn !== undefined,
      };
    };
    let officialUninstalled = new Set(uninstalledSet);
    let removedFolders = [];
    let folderJudgements = new Map();
    let launchFolderFiles = new Map();
    let legacyLocalFiles = new Map();
    let stillSwitchedOn = new Map();
    let doubleRejected = [];
    let failedReads = new Map();
    let installPathByCopy = new Map();
    let loadRegistry = async (installedPlugins) => {
      let installedPlugins_2 = await loadInstalledPlugins(storageV5);
      return listInstalledPluginIds(installedPlugins_2) === "unknown" ? installedPlugins : installedPlugins_2;
    };
    let cleanupUninstalled = async (copy, installPath, registry) => {
      let dataDirExists = await pathExists(pluginDataDirPath(copy.pluginId));
      let cleanupResult = await cleanupCopy(copy, installPath, registry, dataDirExists)
        .catch(() => cleanupCopy(copy, undefined, registry, dataDirExists))
        .catch((error) => {
          logForDebugging(
            `Switch to ${pluginId}: could not finish removing what ${copy.pluginId} saved: ${errorMessage(error)}`,
            {
              level: "warn",
            },
          );
          return "rejected-twice";
        });
      if (cleanupResult === "rejected-twice") {
        doubleRejected.push(copy);
        keptDataDirIds.add(copy.pluginId);
        return;
      }
      uninstalledSet.add(copy);
      stillSwitchedOn.set(copy, cleanupResult.stillSwitchedOn);
      if (copy !== primaryCopy && !isOfficialPluginDirectoryId(copy.pluginId)) await removeLeftData(copy);
    };
    for (let copy of copies) {
      let judgedEntry = judgedByCopy.get(copy);
      let judged = judgedEntry?.judged;
      let records = judgedEntry?.records ?? [];
      let folderJudged = folderJudgements.get(copy) ?? [];
      let filesBecause;
      if (judged?.kind === "by-files" && judged.ofTheLaunchFolder.length > 0) {
        filesBecause = "launch-folder-files";
        launchFolderFiles.set(copy, judged.ofTheLaunchFolder);
      }
      let installPath = installPaths.get(copy);
      let registry;
      for (let otherFolder of judgedEntry?.otherFolders ?? []) {
        let projectPath = otherFolder.projectPath;
        if (projectPath === undefined) continue;
        let addFolder = (because, files = [], otherFile) => {
          let [firstFile] = files;
          folderJudged.push({
            folder: projectPath,
            because,
            files,
            sharedCheckout:
              otherFile !== undefined &&
              files.length === 1 &&
              firstFile?.readsBack === "on" &&
              isSameRepoPathMoved(firstFile.file, otherFile),
          });
        };
        let folderFiles = judged?.kind === "by-files" ? judged.ofFolders.get(projectPath) : undefined;
        if (folderFiles !== undefined && judged?.kind === "by-files") {
          addFolder("own-files", folderFiles, judged.launchProjectFileOn);
          continue;
        }
        if (filesBecause !== undefined) {
          addFolder(filesBecause);
          continue;
        }
        if (failedReads.has(copy)) {
          addFolder("a-failed-read");
          continue;
        }
        let installedPlugins = await loadInstalledPlugins(storageV5);
        if (listInstalledPluginIds(installedPlugins) === "unknown") {
          addFolder("a-failed-read");
          continue;
        }
        registry = installedPlugins;
        let installs = installedPlugins.plugins[copy.pluginId] ?? [];
        if (!installs.some((install) => install.scope === "local" && install.projectPath === projectPath))
          continue;
        let localMentions = await findLocalSettingsMentions(copy.pluginId, [projectPath], {
          installedOthers: otherInstalledUsers(installedPlugins.plugins, copy.pluginId),
          launchFolderToo,
          ownLocalFileToo: true,
        }).catch(() => "threw");
        if (localMentions === "threw") {
          filesBecause = "a-failed-read";
          addFolder("a-failed-read");
          continue;
        }
        if (localMentions.kind === "own-local-file") {
          filesBecause =
            localMentions.readsBack === "on" && localMentions.theSessionsOwn
              ? "own-local-line"
              : "own-local-file-unsure";
          addFolder(filesBecause);
          continue;
        }
        if (localMentions.kind === "own-legacy-local-file") {
          filesBecause = "own-legacy-local-file";
          legacyLocalFiles.set(copy, localMentions.file);
          addFolder("own-legacy-local-file");
          continue;
        }
        let hasLaunchFolderFiles = localMentions.ofTheLaunchFolder.length > 0;
        if (hasLaunchFolderFiles) {
          filesBecause = "launch-folder-files";
          launchFolderFiles.set(copy, localMentions.ofTheLaunchFolder);
        }
        let folderFileList = localMentions.ofFolders.get(projectPath);
        if (folderFileList !== undefined) {
          addFolder("own-files", folderFileList, localMentions.launchProjectFileOn);
          continue;
        }
        if (hasLaunchFolderFiles) {
          addFolder("launch-folder-files");
          continue;
        }
        if (
          isOfficialPluginDirectoryId(copy.pluginId) &&
          !installs
            .filter((install) => !(install.scope === "local" && install.projectPath === projectPath))
            .some(hasDirectoryRepositoryKey)
        ) {
          let persistResult = await persistDirectoryBinding(copy.pluginId, [...installs, ...records]).catch(
            () => "not-persisted",
          );
          if (!(
            persistResult === "held" ||
            (persistResult === "no-key" && !records.some((record) => record.directoryRepositoryKey))
          )) {
            addFolder("hold-not-proven");
            continue;
          }
        }
        let removed = await removePluginInstallation(copy.pluginId, "local", projectPath, storageV5, {
          installPath: otherFolder.installPath,
          lastUpdated: otherFolder.lastUpdated,
        }).then(
          (result) => result !== false,
          () => false,
        );
        let loadRegistryOrUnknown = async () => {
          let installedPlugins = await loadInstalledPlugins(storageV5);
          return listInstalledPluginIds(installedPlugins) === "unknown" ? "unknown" : installedPlugins;
        };
        let registryNow = await loadRegistryOrUnknown();
        let registryAgain =
          registryNow === "unknown" && removed ? await loadRegistryOrUnknown() : registryNow;
        if (registryAgain === "unknown") {
          if (removed)
            failedReads.set(copy, {
              folder: projectPath,
              installPath: otherFolder.installPath,
            });
          else addFolder("a-failed-read");
          continue;
        }
        registry = registryAgain;
        if (
          (registryAgain.plugins[copy.pluginId] ?? []).some(
            (install) => install.scope === "local" && install.projectPath === projectPath,
          )
        )
          addFolder("not-removed");
        else if (removed) {
          removedFolders.push({
            copy,
            folder: projectPath,
          });
          installPath = otherFolder.installPath;
        }
      }
      if (folderJudged.length > 0) folderJudgements.set(copy, folderJudged);
      installPathByCopy.set(copy, installPath);
      if (uninstalledSet.has(copy) || failedReads.has(copy)) continue;
      let loadedRegistry = await loadRegistry(
        removedFolders.some((removed) => removed.copy === copy) ? registry : undefined,
      );
      if (loadedRegistry === undefined || (loadedRegistry.plugins[copy.pluginId]?.length ?? 0) > 0) continue;
      await cleanupUninstalled(copy, installPath, loadedRegistry);
    }
    let installedPlugins = await loadInstalledPlugins(storageV5);
    let finalInstalledIds = listInstalledPluginIds(installedPlugins);
    for (let [copy, { folder, installPath }] of [...failedReads]) {
      if (finalInstalledIds === "unknown") continue;
      failedReads.delete(copy);
      if (
        (installedPlugins.plugins[copy.pluginId] ?? []).some(
          (install) => install.scope === "local" && install.projectPath === folder,
        )
      ) {
        folderJudgements.set(copy, [
          ...(folderJudgements.get(copy) ?? []),
          {
            folder,
            because: "not-removed",
            files: [],
            sharedCheckout: false,
          },
        ]);
        continue;
      }
      removedFolders.push({
        copy,
        folder,
      });
      installPathByCopy.set(copy, installPath);
    }
    if (finalInstalledIds !== "unknown") {
      for (let copy of copies)
        if (
          (installedPlugins.plugins[copy.pluginId]?.length ?? 0) === 0 &&
          !uninstalledSet.has(copy) &&
          !doubleRejected.includes(copy)
        ) {
          let registry = (await loadRegistry(installedPlugins)) ?? installedPlugins;
          if ((registry.plugins[copy.pluginId]?.length ?? 0) > 0) continue;
          await cleanupUninstalled(copy, installPathByCopy.get(copy), registry);
        }
    }
    let joined = copies
      .map((copy) => {
        let flattened = removedFolders.flatMap(({ copy: copy_2, folder }) =>
          copy_2 === copy ? [displayFolderName(folder)] : [],
        );
        let moreCount = flattened.length - 2;
        return flattened.length === 0
          ? ""
          : `. Claude Code had also recorded ${displayPluginId(copy.pluginId)} as installed from ${listFormat.format(moreCount > 0 ? [...flattened.slice(0, 2), `${moreCount} more ${plural(moreCount, "folder")} of this repository`] : flattened)} (it does so when it is started there); ${flattened.length === 1 ? "that record was" : "those records were"} removed too`;
      })
      .join("");
    let localFolders = (copy) =>
      normalizeCaseForComparison_2(
        (installedPlugins.plugins[copy.pluginId] ?? []).flatMap((install) =>
          install.scope === "local" && install.projectPath !== undefined && isInstallationForThisRepo(install)
            ? [install.projectPath]
            : [],
        ),
      );
    let reportableReasons = new Set([
      "own-local-line",
      "own-legacy-local-file",
      "launch-folder-files",
      "own-files",
    ]);
    let keptFolders = new Map();
    let projectSettingsFolders = new Set();
    let joined_2 = copies
      .map((copy) => {
        let coveredFolders = localFolders(copy);
        let filtered = (folderJudgements.get(copy) ?? []).filter(
          ({ folder, because }) =>
            reportableReasons.has(because) &&
            (finalInstalledIds === "unknown" || coveredFolders.includes(folder)),
        );
        keptFolders.set(
          copy,
          filtered.map(({ folder }) => folder),
        );
        let foldersWith = (...reasons) =>
          filtered.flatMap(({ folder, because }) => (reasons.includes(because) ? [folder] : []));
        let legacyFile = legacyLocalFiles.get(copy);
        let flattened = filtered.flatMap(({ because, files }) => (because === "own-files" ? files : []));
        let filtered_2 = filtered.filter(({ because }) =>
          ["launch-folder-files", "own-files"].includes(because),
        );
        let launchFiles = filtered_2.length === 0 ? [] : (launchFolderFiles.get(copy) ?? []);
        if (
          [...launchFiles, ...flattened.slice(0, 2)].some(
            (file) => file.alsoThisLaunchs === "projectSettings",
          )
        )
          projectSettingsFolders.add(copy);
        let [firstKept] = filtered_2;
        let describeFolders = (folders, because) =>
          folders.length === 0
            ? ""
            : describeLeftLocalRecords({
                shownId: displayPluginId(copy.pluginId),
                shownNewId: newPluginName,
                folders,
                because,
              });
        return [
          describeFolders(foldersWith("own-local-line"), {
            kind: "own-local-line",
          }),
          legacyFile === undefined
            ? ""
            : describeFolders(foldersWith("own-legacy-local-file"), {
                kind: "legacy-local-file",
                file: legacyFile,
              }),
          describeFolders(foldersWith("launch-folder-files", "own-files"), {
            kind: "files",
            ofTheLaunchFolder: launchFiles,
            ofFolders: flattened,
            sharedCheckout: filtered_2.length === 1 && firstKept?.sharedCheckout === true,
          }),
        ].join("");
      })
      .join("");
    let flattened_2 = copies.flatMap((copy) => {
      let kept = keptFolders.get(copy) ?? [];
      let filtered = (
        finalInstalledIds === "unknown"
          ? normalizeCaseForComparison_2((folderJudgements.get(copy) ?? []).map(({ folder }) => folder))
          : localFolders(copy)
      ).filter((folder) => !kept.includes(folder));
      let [firstFolder] = filtered;
      if (firstFolder === undefined) return [];
      let prefix = `. ${capitalize(displayPluginId(copy.pluginId))} is still recorded as installed at local scope from`;
      let moreCount = filtered.length - 2;
      return [
        {
          scope: "local",
          said:
            filtered.length === 1
              ? `${prefix} ${describeFolder(firstFolder)}: to remove it, start Claude Code in that folder and uninstall it there`
              : `${prefix} the folders ${listFormat.format(moreCount > 0 ? [...filtered.slice(0, 2).map(displayFolderName), `${moreCount} more in which Claude Code was started`] : filtered.map(displayFolderName))}: to remove it, start Claude Code in each of those folders and uninstall it there`,
        },
      ];
    });
    let joined_3 = flattened_2.map((entry) => entry.said).join("");
    let stillListed = [];
    let ambiguousLines = new Map();
    let touchedUserSettings = false;
    for (let copy of copies) {
      let mayStillBeInstalled = finalInstalledIds === "unknown" || finalInstalledIds.includes(copy.pluginId);
      let otherInstalledIds =
        finalInstalledIds === "unknown"
          ? undefined
          : finalInstalledIds.filter((installedId) => installedId !== copy.pluginId);
      for (let settingSource of SETTING_SOURCES) {
        let enabledPlugins = getSettingsForSourceForUpkeep(settingSource)?.enabledPlugins ?? {};
        let pluginName = findPluginName(Object.keys(enabledPlugins), copy.pluginId);
        let value = pluginName === undefined ? undefined : enabledPlugins[pluginName];
        if (pluginName === undefined || !isDependencyAutoInstallState(value)) continue;
        if (
          otherInstalledIds !== undefined &&
          !enabledPluginKeys(enabledPlugins, copy.pluginId, otherInstalledIds).includes(pluginName)
        )
          continue;
        if (
          !mayStillBeInstalled &&
          settingSource === "userSettings" &&
          (
            await updateSettingsForSourceWithTransform(
              settingSource,
              (settings) => {
                let enabledPlugins = {
                  ...settings?.enabledPlugins,
                };
                let pluginName = findPluginName(Object.keys(enabledPlugins), copy.pluginId);
                if (
                  pluginName === undefined ||
                  otherInstalledIds === undefined ||
                  !enabledPluginKeys(enabledPlugins, copy.pluginId, otherInstalledIds).includes(pluginName)
                )
                  return null;
                enabledPlugins[pluginName] = undefined;
                return {
                  enabledPlugins,
                };
              },
              undefined,
              storageV5,
            ).catch(() => ({
              error: Error("settings write failed"),
            }))
          ).error === null
        )
          touchedUserSettings = true;
        else {
          let reasonText =
            settingSource === "policySettings"
              ? "managed settings: only your administrator can remove it"
              : settingSource === "flagSettings"
                ? "the --settings flag"
                : settingSource === "projectSettings"
                  ? "project settings: .claude/settings.json"
                  : settingSource === "localSettings"
                    ? "local settings: .claude/settings.local.json"
                    : finalInstalledIds === "unknown"
                      ? "user settings: kept, because the list of installed plugins could not be read"
                      : mayStillBeInstalled
                        ? "user settings: kept, because it is still recorded as installed from another folder; when you uninstall it there, also take this line out of your user settings file, or the next start can record it again"
                        : "user settings: it could not be removed";
          if (finalInstalledIds === "unknown" && pluginName !== copy.pluginId)
            ambiguousLines.set(
              `${displayPluginId(pluginName)} (${reasonText}; it may be another installed plugin's own line${settingSource === "userSettings" ? "" : ": the list of installed plugins could not be read"})`,
              pluginName,
            );
          else if (!(settingSource === "projectSettings" && projectSettingsFolders.has(copy)))
            stillListed.push(`${displayPluginId(copy.pluginId)} (${reasonText})`);
        }
      }
    }
    if (touchedUserSettings) refreshPluginCaches(storageV5);
    for (let copy of copies) {
      if (doubleRejected.includes(copy) || failedReads.has(copy)) continue;
      if (officialUninstalled.has(copy)) {
        if (copy === primaryCopy) continue;
        if (!isOfficialPluginDirectoryId(copy.pluginId)) {
          await removeLeftData(copy);
          continue;
        }
        if ([newDataDirKey, oldDataDirKey].includes(dataDirKey(copy.pluginId))) continue;
      } else if (stillSwitchedOn.get(copy) !== true) continue;
      if (!isOfficialPluginDirectoryId(copy.pluginId)) continue;
      let registry = await loadInstalledPlugins(storageV5);
      if ((registry.plugins[copy.pluginId]?.length ?? 0) > 0) continue;
      let dataDirExists = await pathExists(pluginDataDirPath(copy.pluginId));
      await cleanupCopy(copy, undefined, registry, dataDirExists).catch((error) => {
        logForDebugging(
          `Switch to ${pluginId}: could not finish removing what ${copy.pluginId} saved: ${errorMessage(error)}`,
          {
            level: "warn",
          },
        );
        keptDataDirIds.add(copy.pluginId);
      });
    }
    let registry = otherDataDirUser === undefined ? undefined : await loadInstalledPlugins(storageV5);
    let dataDirOwner =
      registry === undefined ||
      (!hasFailedInstalledPluginsRead(registry) && (registry.plugins[primaryCopy.pluginId]?.length ?? 0) > 0)
        ? undefined
        : findOtherPluginSharingDataDir(primaryCopy.pluginId, registry);
    if (
      dataDirOwner?.kind === "nobody" &&
      dataDirCopied &&
      !isOfficialPluginDirectoryId(primaryCopy.pluginId)
    ) {
      if ((await deletePluginDataDir(primaryCopy.pluginId).catch(() => "failed")) === "failed")
        logForDebugging(
          `Switch to ${pluginId}: could not remove the data directory of ${primaryCopy.pluginId}`,
          {
            level: "warn",
          },
        );
    }
    let dataDirInUse =
      dataDirOwner === undefined || dataDirOwner.kind === "nobody"
        ? undefined
        : {
            usedBy: dataDirOwner.kind === "plugin" ? dataDirOwner.pluginId : undefined,
          };
    let disabledNote = !oldCopyWasOff
      ? ""
      : stayedDisabled
        ? " (it stays disabled, as before)"
        : ` (it was disabled before, but ${newPluginName} could not be disabled \u2014 disable it in /plugin)`;
    let scopeChanged = !primaryCopy.scopes.some((scope_2) => scope_2 === scope);
    let scopeNote =
      scopeChanged || primaryCopy.scopes.some((scope_2) => scope_2 !== scope)
        ? ` (was ${primaryCopy.scopes.join(" and ")} scope)`
        : "";
    let keptDataDir = oldDataDirDisposable
      ? dataDirInUse !== undefined && (await pathExists(pluginDataDirPath(primaryCopy.pluginId)))
        ? {
            pluginId: primaryCopy.pluginId,
            reason: "another-plugin-uses-it",
            usedBy: dataDirInUse.usedBy,
            copied: dataDirCopied,
          }
        : undefined
      : {
          pluginId: primaryCopy.pluginId,
          reason: dataDirKeptReason === "target-had-own" ? "target-had-own" : "copy-failed",
        };
    let keptDataDirNote = keptDataDir === undefined ? "" : `. ${describeKeptDataDir(keptDataDir, pluginId)}`;
    let switchResult = {
      scopeChanged,
      stayedDisabled,
      dataDirCarried: dataDirCopied,
      pinChanged,
      replacedCount: copies.length,
      isPrimary: true,
    };
    logMarketplaceSwitch({
      ...switchEvent,
      result:
        oldCopyWasOff && !stayedDisabled
          ? {
              ...switchResult,
              outcome: "sad",
              code: "disable_failed",
            }
          : !oldDataDirDisposable
            ? {
                ...switchResult,
                outcome: "sad",
                code: "data_dir_kept",
              }
            : {
                ...switchResult,
                outcome: "ok",
              },
    });
    for (let copy of copies) {
      if (copy === primaryCopy) continue;
      logMarketplaceSwitch({
        ...switchEvent,
        fromPluginId: copy.pluginId,
        result: {
          outcome: "ok",
          scopeChanged: !copy.scopes.some((scope_2) => scope_2 === scope),
          stayedDisabled: false,
          dataDirCarried: false,
          pinChanged:
            copy.gitCommitSha !== undefined &&
            gitCommitSha !== undefined &&
            copy.gitCommitSha !== gitCommitSha,
          replacedCount: copies.length,
          isPrimary: false,
        },
      });
    }
    let mapped = copies
      .filter(
        (copy) =>
          uninstalledSet.has(copy) &&
          (targetHadOwn || copy !== primaryCopy) &&
          !keptDataDirIds.has(copy.pluginId),
      )
      .map((copy) => copy.pluginId);
    let filtered = mapped.filter((pluginId) => dataRemovedIds.includes(pluginId));
    let filtered_2 = mapped.filter((pluginId) => !dataRemovedIds.includes(pluginId));
    let filtered_3 = dataRemovedIds.filter((pluginId) => !mapped.includes(pluginId));
    let removedThings = [
      ...(filtered.length > 0
        ? [`the settings and saved data for ${listFormat.format(filtered.map(displayPluginId))}`]
        : []),
      ...(filtered_2.length > 0
        ? [`the settings saved for ${listFormat.format(filtered_2.map(displayPluginId))}`]
        : []),
      ...(filtered_3.length > 0
        ? [`the saved data of ${listFormat.format(filtered_3.map(displayPluginId))}`]
        : []),
    ];
    let removedSuffix =
      removedThings.length === 0 ? "" : `, and ${listFormat.format(removedThings)} were removed`;
    let carriedText = targetHadOwn
      ? `${newPluginName} kept its own settings${removedSuffix}`
      : severalOldCopies
        ? `your plugin settings carried over from ${oldPluginName}${removedSuffix}`
        : "your plugin settings carried over";
    let joined_4 = directoryNotes
      .map(([pluginId, note]) => `. About ${displayPluginId(pluginId)}: ${note.replace(/\.$/, "")}`)
      .join("");
    let describeDataDir = async (copy) => {
      let copyDataDirKey = dataDirKey(copy.pluginId);
      let knownInUse =
        copy === primaryCopy
          ? !(oldDataDirDisposable && oldDataDirKey !== newDataDirKey) ||
            (registry !== undefined && dataDirOwner?.kind !== "nobody")
          : [newDataDirKey, oldDataDirKey].includes(copyDataDirKey);
      return {
        pluginId: copy.pluginId,
        entry: isOfficialPluginDirectoryId(copy.pluginId)
          ? await releaseDirectoryBinding_2(copy.pluginId, false).catch(() => "unreadable")
          : undefined,
        carriedTo: copy === primaryCopy && !targetHadOwn ? newPluginName : undefined,
        knownInUse,
        mayGo:
          !knownInUse &&
          finalInstalledIds !== "unknown" &&
          !finalInstalledIds.some((installedId) => dataDirKey(installedId) === copyDataDirKey),
      };
    };
    let joined_5 = (
      await Promise.all(
        copies
          .filter((copy) => doubleRejected.includes(copy))
          .map(async (copy) => {
            let { mayGo, knownInUse, ...rest } = await describeDataDir(copy);
            return describeUnfinishedCleanup({
              ...rest,
              dataFolder: mayGo
                ? "may-go"
                : !knownInUse && finalInstalledIds === "unknown"
                  ? "not-known"
                  : "in-use",
            });
          }),
      )
    ).join("");
    let joined_6 = (
      await Promise.all(
        copies.flatMap((copy) => {
          let folder = failedReads.get(copy)?.folder;
          return folder === undefined
            ? []
            : [
                describeDataDir(copy).then(({ mayGo, knownInUse, ...rest }) =>
                  describeLeftRecordCleanup({
                    ...rest,
                    folder,
                    dataFolder: knownInUse ? "in-use" : "not-known",
                  }),
                ),
              ];
        }),
      )
    ).join("");
    let stillListedNote =
      stillListed.length === 0
        ? ""
        : `. Still listed under "enabledPlugins": ${listFormat.format(stillListed)}. Until ${stillListed.length === 1 ? "that line is" : "those lines are"} removed, an old copy can load again beside ${newPluginName} or show as enabled but not installed`;
    let [firstAmbiguousId] = [...ambiguousLines.values()];
    let ambiguousNote =
      firstAmbiguousId === undefined
        ? ""
        : `. Still listed under "enabledPlugins": ${listFormat.format([...ambiguousLines.keys()])}. ${ambiguousLines.size === 1 ? `If ${displayPluginId(firstAmbiguousId)} does not name a plugin you have installed, that line should be removed` : "Any of these that does not name a plugin you have installed should be removed"}: until then an old copy can load again beside ${newPluginName} or show as enabled but not installed`;
    return {
      ok: true,
      note: `. Switched from ${oldNamesText}; ${carriedText}${disabledNote}${scopeNote}${joined}${keptDataDirNote}${cleanupNotes.join("")}${joined_4}${joined_5}${joined_6}${stillListedNote}${ambiguousNote}${joined_2}${joined_3}`,
      stayedDisabled,
      keptOwnSettings: targetHadOwn,
      settingsRemovedFrom: mapped,
      ...(settingsKept.size > 0 && {
        settingsLeftInPlace: [...settingsKept].map((copy) => copy.pluginId),
      }),
      savedDataRemovedFrom: dataRemovedIds,
      keptDataDir,
      from: primaryCopy.pluginId,
      replaced: copies.map((copy) => copy.pluginId),
      oldCopyStillRecordedAt: normalizeCaseForComparison_2([
        ...flattened_2.map((entry) => entry.scope),
        ...(joined_2 === "" ? [] : ["local"]),
      ]),
      saysMore:
        joined !== "" ||
        joined_2 !== "" ||
        joined_5 !== "" ||
        joined_6 !== "" ||
        joined_3 !== "" ||
        (oldCopyWasOff && !stayedDisabled) ||
        stillListed.length > 0 ||
        ambiguousLines.size > 0 ||
        cleanupNotes.length > 0 ||
        joined_4 !== "",
    };
  }
  return {
    ok: false,
    message: "",
  };
}
//@ chunk-md9fmgw9.js:70983-71090 layout
function directoryBlockedMessage(pluginName) {
  return `Plugin "${quotedPrintable(pluginName)}" is from the ${OFFICIAL_MARKETPLACE_DISPLAY}, which is blocked by your organization. ${pluginDirectoryPolicyBlockHint()}`;
}
//@ chunk-md9fmgw9.js:71090-71168 layout
function directoryUnreachableMessage() {
  return `couldn't reach the ${OFFICIAL_MARKETPLACE_DISPLAY}, so this may not be the latest`;
}
//@ chunk-md9fmgw9.js:71168-71330 layout
function appendRefreshWarning({ refreshWarning, directoryRefreshFailed }, message) {
  return refreshWarning === undefined
    ? message
    : directoryRefreshFailed
      ? `${message} Warning: ${directoryUnreachableMessage()}.`
      : `${message} Warning: ${refreshWarning} \u2014 version shown may be stale.`;
}
//@ chunk-md9fmgw9.js:71330-71548 layout
function upToDateMessage(updateInfo, version) {
  return updateInfo.directoryNotChecked
    ? `${updateInfo.pluginName} was not checked for updates: the ${OFFICIAL_MARKETPLACE_DISPLAY} isn't available in this session (installed: ${version})`
    : appendRefreshWarning(
        updateInfo,
        `${updateInfo.pluginName} is already at the latest version (${version}).`,
      );
}
//@ chunk-md9fmgw9.js:71548-77581 fingerprint (2.1.88 match: uninstallPluginOp, 0.405)
/**
 * 卸载插件：从指定作用域的安装记录与 enabledPlugins 中移除，最后一个安装被移除时删除版本缓存、插件数据目录（可保留）与密钥存储里的 userConfig 敏感值；托管插件拒绝。
 */
async function uninstallPluginOp(
  pluginId,
  scope = "user",
  deleteDataDir = true,
  storageV5,
  { settingsStillOn = "refuse" } = {},
) {
  assertInstallableScope(scope);
  pluginId = normalizePluginId(pluginId);
  let refusal = pluginOperationRefusal(pluginId, parsePluginId(pluginId).marketplace, "uninstall");
  if (refusal !== undefined)
    return {
      success: false,
      message: refusal,
      failureCode: unmanageablePluginReason(pluginId, parsePluginId(pluginId).marketplace),
    };
  let installedListRefusal = await getInstalledListRefusal(storageV5);
  if (installedListRefusal !== undefined)
    return {
      success: false,
      message: `Plugin "${quotedPrintable(pluginId)}" was not uninstalled: ${readInstalledPluginsFile(installedListRefusal)}`,
      failureCode: "install_records_unreadable",
    };
  let { enabled, disabled } = await loadAllPlugins(storageV5);
  let allPlugins = [...enabled, ...disabled];
  let foundPlugin = findPluginByIdentifier(pluginId, allPlugins);
  let settingSource = scopeToSettingSource(scope);
  let settings = getSettingsForSourceForUpkeep(settingSource);
  let pluginId_2;
  let pluginName;
  let installedPlugins = getInstalledPlugins();
  let keys = Object.keys(installedPlugins.plugins);
  let projectPath = getProjectPathForScope(scope);
  if (foundPlugin) {
    let keys_2 = Object.keys(settings?.enabledPlugins ?? {});
    let lower = foundPlugin.name.toLowerCase();
    let included = pluginId.includes("@");
    let candidateIds = [
      ...keys_2.filter((key) => key === pluginId),
      ...keys_2.filter((key) => pluginNamesEqual(key, pluginId)),
      ...(included
        ? []
        : [
            ...keys_2.filter((key) => key === foundPlugin.name),
            ...keys_2.filter((key) => key.startsWith(`${foundPlugin.name}@`)),
            ...keys_2.filter((key) => key.toLowerCase() === lower),
            ...keys_2.filter((key) => key.toLowerCase().startsWith(`${lower}@`)),
          ]),
      included ? pluginId : foundPlugin.name,
    ];
    let idIsInstalled = included && (installedPlugins.plugins[pluginId] ?? []).length > 0;
    let installationsOf = (candidateId) =>
      installedPlugins.plugins[findPluginName(keys, candidateId) ?? candidateId] ?? [];
    pluginId_2 = idIsInstalled
      ? pluginId
      : (candidateIds.find((candidateId) =>
          installationsOf(candidateId).some(
            (installation) => installation.scope === scope && installation.projectPath === projectPath,
          ),
        ) ??
        candidateIds.find((candidateId) =>
          installationsOf(candidateId).some((installation) =>
            isSameInstallScope(installation, scope, projectPath),
          ),
        ) ??
        candidateIds[0]);
    pluginName = foundPlugin.name;
  } else {
    let installedPluginId = resolveInstalledPluginId(pluginId, scope, projectPath);
    if (!installedPluginId) {
      let leftoverResult = await uninstallLeftoverOfficialName(pluginId, scope, deleteDataDir, storageV5);
      if (leftoverResult !== undefined) return leftoverResult;
      return {
        success: false,
        message: `Plugin "${pluginId}" not found in installed plugins`,
        failureCode: "not_installed",
      };
    }
    pluginId_2 = installedPluginId.pluginId;
    pluginName = installedPluginId.pluginName;
  }
  pluginId_2 = findPluginName(keys, pluginId_2) ?? pluginId_2;
  let installations = installedPlugins.plugins[pluginId_2];
  let installation = installationAtTarget(installations, scope, projectPath);
  if (!installation) {
    let { scope: actualScope } = getPluginInstallationFromV2(pluginId_2);
    if (actualScope !== scope && installations && installations.length > 0) {
      if (actualScope === "project" && isPluginEnabledAtProjectScope(pluginId_2)) {
        let disableCommand = claudeCommand("plugin disable", pluginId, "--scope local");
        let disableHint =
          managedPluginRefusal(pluginId_2)?.message ??
          `To disable just for you${disableCommand ? `: ${disableCommand}` : ", use claude plugin disable with --scope local"}`;
        return {
          success: false,
          message: `Plugin "${pluginId}" is enabled at project scope (.claude/settings.json, shared with your team). ${disableHint}`,
          failureCode: "enabled_at_project_scope",
          installedScope: actualScope,
        };
      }
      return {
        success: false,
        message: `Plugin "${pluginId}" is installed in ${actualScope} scope, not ${scope}. Use --scope ${actualScope} to uninstall.`,
        failureCode: "not_installed_at_scope",
        installedScope: actualScope,
      };
    }
    if ((installations?.length ?? 0) === 0) {
      let leftoverResult = await uninstallLeftoverOfficialName(pluginId, scope, deleteDataDir, storageV5);
      if (leftoverResult !== undefined) return leftoverResult;
    }
    return {
      success: false,
      message: `Plugin "${pluginId}" is not installed in ${scope} scope. Use --scope to specify the correct scope.`,
      failureCode: "not_installed_at_scope",
    };
  }
  let installPath = installation.installPath;
  let flattened = Object.entries(installedPlugins.plugins).flatMap(([key, value]) =>
    key !== pluginId_2 && pluginNamesEqual(key, pluginId_2) && value.length > 0 ? [key] : [],
  );
  flattened = normalizeCaseForComparison_2([
    ...flattened,
    ...bindingKeysFor(installedPlugins.plugins, pluginId_2).flatMap(([key, installations]) =>
      key !== pluginId_2 && installations.length > 0 ? [key] : [],
    ),
  ]);
  if (isOfficialPluginDirectoryId(pluginId_2) && isWorkspaceRestrictedSource(settingSource))
    return {
      success: false,
      message: `"${quotedPrintable(pluginName)}" was not uninstalled: this workspace is not yet trusted, so its settings files are not read, and the change could not be checked afterwards. Nothing was changed. Trust the workspace, start Claude Code again, then uninstall it again.`,
      failureCode: "settings_write_failed",
      pluginId: pluginId_2,
      scope,
    };
  let settingsFailure = (enablingSettingsFile, error, changeNote) => ({
    success: false,
    message: describeSettingsWriteNotRead(
      pluginName,
      "network-path",
      enablingSettingsFile.notRead[0],
      error,
      settingSource,
      enablingSettingsFile.why,
      changeNote,
    ),
    failureCode: "settings_still_on",
    pluginId: pluginId_2,
    scope,
  });
  if (isOfficialPluginDirectoryId(pluginId_2) && settingSource !== "userSettings") {
    let enablingSettingsFile = await findEnablingSettingsFile(settingSource, pluginId_2, flattened);
    if ("notRead" in enablingSettingsFile)
      return settingsFailure(enablingSettingsFile, undefined, "nothing-was-changed");
  }
  let { error } = await updateSettingsForSourceWithTransform(
    settingSource,
    (settings) => {
      if (enabledPluginKeys(settings?.enabledPlugins ?? {}, pluginId_2).length === 0) return null;
      let newEnabledPlugins = {
        ...settings?.enabledPlugins,
      };
      let enabledKey = findPluginName(Object.keys(newEnabledPlugins), pluginId_2) ?? pluginId_2;
      if (
        enabledKey === pluginId_2 ||
        !flattened.some((candidateId) => pluginNamesEqual(candidateId, enabledKey))
      )
        newEnabledPlugins[enabledKey] = undefined;
      for (let enabledKey of enabledPluginKeys(newEnabledPlugins, pluginId_2, flattened))
        newEnabledPlugins[enabledKey] = undefined;
      return {
        enabledPlugins: newEnabledPlugins,
      };
    },
    undefined,
    storageV5,
  );
  refreshPluginCaches(storageV5);
  if (isOfficialPluginDirectoryId(pluginId_2)) {
    let enablingSettingsFile = await findEnablingSettingsFile(settingSource, pluginId_2, flattened);
    if ("notRead" in enablingSettingsFile)
      return settingsFailure(enablingSettingsFile, error, "change-may-be-made");
    let { readsBack, file } = enablingSettingsFile;
    if (readsBack !== "off") {
      let printableId = quotedPrintable(pluginName);
      let fileLabel = file ?? "that settings file";
      let errorSuffix = error ? `, and the settings change failed (${error.message})` : "";
      return {
        success: false,
        message:
          readsBack !== "on"
            ? `"${printableId}" was not uninstalled: ${fileLabel} is there and could not be read, so it may still switch "${printableId}" on${errorSuffix}. It is still installed. Once that file can be read and saved, uninstall it again.`
            : error
              ? `"${printableId}" was not uninstalled: it is still switched on in ${fileLabel}${errorSuffix}. It is still installed. Once that file can be saved, uninstall it again.`
              : `"${printableId}" was not uninstalled: it is still switched on in ${fileLabel}, although the settings change reported no error. It is still installed. Take it out of "enabledPlugins" in that file yourself, then uninstall it again.`,
        failureCode: "settings_write_failed",
        pluginId: pluginId_2,
        scope,
      };
    }
  }
  let isDirectoryPlugin = false;
  isDirectoryPlugin = isOfficialPluginDirectoryId(pluginId_2);
  let legacyNote;
  if (!isDirectoryPlugin && settingsStillOn === "refuse") {
    let enablingSettingsFile = await findEnablingSettingsFile(settingSource, pluginId_2, flattened);
    if ("notRead" in enablingSettingsFile) return settingsFailure(enablingSettingsFile, error);
    let { readsBack, file } = enablingSettingsFile;
    if (
      readsBack === "unreadable" &&
      file !== undefined &&
      file === getLegacyLocalSettingsFilePath() &&
      (await formatFileSize(file))
    )
      legacyNote = `${file} (an older local settings file) is not JSON, so it was not checked: as it is, Claude Code ignores it and it switches nothing on. If you repair it, take "${quotedPrintable(pluginName)}" out of its "enabledPlugins" if it is there.`;
    else if (readsBack === "on" || readsBack === "unreadable" || (readsBack === "not-read-here" && error))
      return {
        success: false,
        message: describeSettingsWriteNotRead(pluginName, readsBack, file, error, settingSource),
        failureCode: "settings_still_on",
        pluginId: pluginId_2,
        scope,
      };
  }
  if (isOfficialPluginDirectoryId(pluginId_2)) {
    let latestInstallations =
      (isStorageV5Enabled() && storageV5 !== undefined
        ? await loadInstalledPlugins(storageV5)
        : loadInstalledPluginsSync()
      ).plugins[pluginId_2] ?? [];
    let matchingInstallations = findMatchingInstallations(latestInstallations, scope, projectPath);
    if (
      !latestInstallations
        .filter((installation) => !matchingInstallations.includes(installation))
        .some(hasDirectoryRepositoryKey)
    ) {
      if (
        (await persistDirectoryBinding(pluginId_2, [...latestInstallations, ...(installations ?? [])])) ===
        "not-persisted"
      )
        return {
          success: false,
          message: `"${quotedPrintable(pluginName)}" was switched off at ${scope} scope but not uninstalled, and nothing it saved was removed: plugin-directory-bindings.json in the plugins folder could not be used or written (unreadable, a symbolic link or not a file, over 1 MB, damaged, written by a newer Claude Code, or not writable), so nothing would keep the name for the repository it was installed from. Once the file can be written, uninstall it again.`,
          failureCode: "directory_binding_unreadable",
          pluginId: pluginId_2,
          scope,
        };
    } else await seedBindingsFromInstall(pluginId_2, installations);
  }
  await removePluginInstallation(pluginId_2, scope, projectPath, storageV5);
  let { dataDirKept, directoryBindingKept, optionsRemoved, savedKept } = await cleanupAfterUninstall({
    pluginId: pluginId_2,
    installPath,
    deleteDataDir,
    scope,
    storageV5,
    registry: getInstalledPlugins(),
    installedOthers: flattened,
  });
  let reverseDependents = findReverseDependentNames(pluginId_2, allPlugins);
  let depWarn = formatReverseDependentsSuffix(reverseDependents);
  let savedDataNote = savedKept === undefined ? undefined : keptSavedDataMessage(pluginName, deleteDataDir);
  return {
    success: true,
    message: `Successfully uninstalled plugin: ${pluginName} (scope: ${scope})${depWarn}${directoryBindingKept === undefined ? "" : `. ${directoryReleaseNote(directoryBindingKept)}`}${savedDataNote === undefined ? "" : `. ${savedDataNote}`}${legacyNote === undefined ? "" : `${savedDataNote === undefined ? "." : ""} ${legacyNote}`}`,
    pluginId: pluginId_2,
    pluginName,
    scope,
    ...(savedKept !== undefined &&
      savedDataNote !== undefined && {
        savedKept: {
          reason: savedKept,
          note: savedDataNote,
        },
      }),
    ...(legacyNote !== undefined && {
      olderLocalSettingsSkippedNote: legacyNote,
    }),
    dataDirKept: dataDirKept || directoryBindingKept?.dataLeftInPlace === true,
    ...(directoryBindingKept !== undefined && {
      directoryNameNote: directoryReleaseNote(directoryBindingKept),
    }),
    ...(optionsRemoved && {
      optionsRemoved: true,
    }),
    ...(directoryBindingKept?.liveHolder !== undefined &&
      directoryBindingKept.liveHolder !== pluginId_2 && {
        dataFolderUser: directoryBindingKept.liveHolder,
      }),
    reverseDependents: reverseDependents.length > 0 ? reverseDependents : undefined,
  };
}
//@ chunk-md9fmgw9.js:77581-79225 layout
/**
 * 设置文件写入了但本会话读不到（网络路径或未被读取）时的提示文本。
 */
function describeSettingsWriteNotRead(pluginName, readFailure, file, error, source, pathIssue, changeState) {
  let printableName = quotedPrintable(pluginName);
  let fileLabel = file ?? "that settings file";
  let errorSuffix = error ? `, and the settings change failed (${error.message})` : "";
  if (readFailure === "network-path" || readFailure === "not-read-here") {
    let sourceDescription = describeUnwritableSettingsSource({
      source,
      file: fileLabel,
      readsBack: "not-read-here",
      ...(readFailure === "network-path" && {
        notReadBecause: readFailure,
      }),
    });
    let retryAdvice =
      readFailure === "not-read-here"
        ? "Once that file can be saved, uninstall it again."
        : pathIssue === "vet-network" || pathIssue === "suspect-link" || pathIssue === "crossing"
          ? `If that file, its ".claude" folder or a folder above them is a link to another machine, replace the link with a real file or folder, or start Claude Code from the folder's real location. Then uninstall it again.`
          : "Try uninstalling it again: if the path to that file changed during the check, that will work. If you see this again, the path cannot be checked, and trying again will not help.";
    let changeNote =
      changeState === "nothing-was-changed"
        ? " Nothing was changed."
        : changeState === "change-may-be-made" && !error
          ? ` "${printableName}" may already have been removed from the enabled plugins in this scope's settings.`
          : "";
    return `"${printableName}" was not uninstalled: ${sourceDescription}, so it may still switch "${printableName}" on${errorSuffix}.${changeNote} It is still installed. ${retryAdvice}`;
  }
  if (readFailure === "unreadable")
    return `"${printableName}" was not uninstalled: ${fileLabel} is there and could not be read, so it may still switch "${printableName}" on${errorSuffix}. It is still installed. Once that file can be read and saved, uninstall it again.`;
  return error
    ? `"${printableName}" was not uninstalled: it is still switched on in ${fileLabel}${errorSuffix}. It is still installed. Once that file can be saved, uninstall it again.`
    : `"${printableName}" was not uninstalled: it is still switched on in ${fileLabel}, although the settings change reported no error. It is still installed. Take it out of "enabledPlugins" in that file yourself, then uninstall it again.`;
}
//@ chunk-md9fmgw9.js:79225-79385 layout (2.1.88 match: formatFileSize, 0.782)
async function formatFileSize(sizeInBytes) {
  try {
    let repoSettingsBytes = await readRepoSettingsBytes(sizeInBytes);
    if (repoSettingsBytes.kind !== "bytes" || repoSettingsBytes.content.trim() === "") return false;
    try {
      jsonParse(stripBom(repoSettingsBytes.content));
      return false;
    } catch {
      return true;
    }
  } catch {
    return false;
  }
}
//@ chunk-md9fmgw9.js:79385-79538 layout
function manualCleanupHint(pluginId) {
  return `take ${pluginId} entries out of "pluginConfigs" in your user settings file and out of "pluginSecrets" in your credentials store yourself`;
}
//@ chunk-md9fmgw9.js:79538-80039 layout
/**
 * 卸载后安装列表无法重新读取时的说明：插件保存的选项、密钥、用量记录（及数据目录）被保留，并告诉用户如何删除。
 */
function keptSavedDataMessage(pluginId, hadDataDir) {
  let quotedId = `"${quotedPrintable(pluginId)}"`;
  return `What ${quotedId} saved was kept (its options, its secrets${hadDataDir ? ", its usage record and its data folder" : " and its usage record"}): the list of installed plugins could not be read again, so ${quotedId} may still be installed at another scope. If it is installed again, it will use what was kept without asking. To delete what was kept, uninstall ${quotedId} again; if that says it is not installed, install it and then uninstall it; if it can no longer be installed, ${manualCleanupHint("its")}.`;
}
//@ chunk-md9fmgw9.js:80039-81037 layout
/**
 * 卸载最后一条安装记录后的清理：官方市场插件检查同目录的兄弟安装，必要时把版本目录标记为孤儿，清理已删除记录的缓存，在最后一个作用域被卸载时释放目录名绑定、删除选项/密钥与数据目录。
 */
async function cleanupAfterUninstall({
  pluginId,
  installPath,
  deleteDataDir,
  scope,
  storageV5,
  registry,
  installedOthers,
}) {
  let records = registry.plugins[pluginId];
  let lastRecord = !records || records.length === 0;
  let officialSiblings = [];
  let installsUnknown = false;
  {
    let pluginIdentifier = parsePluginIdentifier(pluginId);
    if (
      pluginIdentifier.marketplace !== undefined &&
      (pluginIdentifier.marketplace === OFFICIAL_MARKETPLACE_NAME ||
        isOfficialMarketplaceSpelling(pluginIdentifier.marketplace))
    ) {
      installsUnknown = listInstalledPluginIds(registry) === "unknown";
      if (installsUnknown)
        logForDebugging(
          `installed_plugins.json could not be read, so the version folder of ${pluginId} was kept`,
        );
      officialSiblings = findDataDirSharers(pluginId, registry).flatMap(
        (pluginId) => registry.plugins[pluginId] ?? [],
      );
    }
  }
  let readBack = false;
  readBack = isOfficialPluginDirectoryId(pluginId);
  if (!readBack && listInstalledPluginIds(registry) === "unknown") {
    logForDebugging(
      `installed_plugins.json could not be read again after an install record of ${pluginId} was removed, so what it saved was kept`,
      {
        level: "warn",
      },
    );
    return {
      dataDirKept: true,
      directoryBindingKept: undefined,
      optionsRemoved: false,
      savedKept: "install_records_unreadable",
    };
  }
  if (
    lastRecord &&
    installPath &&
    !installsUnknown &&
    !officialSiblings.some((officialSibling) => {
      let normalizedPath = normalizeMarketplaceInputPath(officialSibling.installPath);
      return normalizedPath !== undefined && normalizedPath === normalizeMarketplaceInputPath(installPath);
    })
  )
    await markPluginVersionOrphaned(installPath, storageV5);
  if (!lastRecord) await seedBindingsFromInstall(pluginId, records);
  let dataDirKept = !deleteDataDir || isPluginUnreadableOrShared(pluginId, registry);
  let bindingResult = lastRecord
    ? await releaseDirectoryBinding(
        pluginId,
        !dataDirKept,
        isOfficialPluginDirectoryId(pluginId)
          ? listInstalledPluginIds(
              isStorageV5Enabled() && storageV5 !== undefined
                ? await loadInstalledPlugins(storageV5)
                : loadInstalledPluginsSync(),
            )
          : [],
        storageV5,
        scope,
        installedOthers,
      )
    : undefined;
  return {
    dataDirKept,
    directoryBindingKept: bindingResult,
    optionsRemoved:
      lastRecord &&
      isOfficialPluginDirectoryId(pluginId) &&
      (bindingResult === undefined || bindingResult.optionsGone),
  };
}
//@ chunk-md9fmgw9.js:81037-82011 layout
/**
 * 为卸载的插件执行目录名释放计划：仍在某处启用时返回 stillOn 细节，未完全删除选项/数据或存在占用者时返回说明结构，全部清理完毕时返回 undefined。
 */
async function releaseDirectoryBinding(
  pluginId,
  deleteDataDir,
  installedIds,
  storageV5,
  scope,
  installedOthers = [],
) {
  let { plan, stillOn, optionsGone, dataGone, optionsNotGoneBecause, liveHolder, installsUnknown, entry } =
    await planUninstallCleanup(pluginId, {
      deleteDataDir,
      installedIds,
      installedOthers,
      storageV5,
    });
  removePluginUsage([pluginId], storageV5);
  if (plan.kind === "nothing" && plan.reason === "still-switched-on")
    return {
      pluginId,
      optionsGone: false,
      optionsNotGoneBecause: [],
      dataGone: false,
      dataKeptOnRequest: !deleteDataDir,
      stillOnIn: getProjectPathForScope_2(stillOn, scope),
      stillOnUnsure: stillOn.some((stillOn) => stillOn.readsBack !== "on"),
      stillOnNotReadHere: stillOn.some(
        (stillOn) => stillOn.readsBack === "not-read-here" && stillOn.notReadBecause === undefined,
      ),
      ...(stillOn.some((stillOn) => stillOn.notReadBecause === "network-path") && {
        stillOnNotReadForItsPath: stillOn,
      }),
      stillOnProjectFile:
        scope !== "project" &&
        stillOn.some((stillOn) => stillOn.source === "projectSettings" && stillOn.readsBack === "on"),
      dataLeftInPlace: true,
      entry,
    };
  if (
    entry !== "none" ||
    liveHolder !== undefined ||
    (isOfficialPluginDirectoryId(pluginId) && (!optionsGone || (deleteDataDir && !dataGone)))
  )
    return {
      pluginId,
      optionsGone,
      optionsNotGoneBecause,
      dataGone,
      dataKeptOnRequest: !deleteDataDir,
      ...(liveHolder !== undefined && {
        liveHolder,
      }),
      ...(installsUnknown && {
        installsUnknown,
      }),
      dataLeftInPlace: liveHolder !== undefined || installsUnknown === true,
      entry,
    };
  return;
}
//@ chunk-md9fmgw9.js:82011-82168 file-local
function getProjectPathForScope_2(stillOn, scope) {
  return stillOn.map((stillOn) =>
    stillOn.readsBack !== "on"
      ? describeUnwritableSettingsSource(stillOn)
      : stillOn.source === "projectSettings" && scope !== "project"
        ? `${stillOn.file} (the project's shared settings)`
        : describeUnwritableSettingsSource(stillOn),
  );
}
//@ chunk-md9fmgw9.js:82168-85126 layout
/**
 * 卸载一个已无安装记录、但目录名仍被绑定的官方市场插件：先从可写的设置里移除 enabledPlugins 中的同名项，确认没有其他地方启用、也没有新安装记录后，释放目录绑定并返回结果说明。
 */
async function uninstallLeftoverOfficialName(pluginId, scope, deleteDataDir, storageV5) {
  {
    let { name: pluginName, marketplace } = parsePluginIdentifier(pluginId);
    let printableName = quotedPrintable(pluginName, 120);
    if (marketplace !== OFFICIAL_MARKETPLACE_NAME) return;
    let bindings = await bindingsWithReadFailure();
    if (isUnreadableBindings(bindings)) return;
    let officialId = `${pluginName}@${marketplace}`;
    let pluginId_2 = findBindingKeysFor(bindings.keys(), officialId)[0];
    if (pluginId_2 === undefined) return;
    let installedData =
      isStorageV5Enabled() && storageV5 !== undefined
        ? await loadInstalledPlugins(storageV5)
        : loadInstalledPluginsSync();
    if (hasFailedInstalledPluginsRead(installedData)) return;
    let boundKey = bindingKeysFor(installedData.plugins, officialId).find(
      ([, installations]) => installations.length > 0,
    )?.[0];
    if (boundKey === officialId) return;
    if (boundKey !== undefined)
      return {
        success: false,
        message: `"${printableName}" is not installed. "${quotedPrintable(boundKey, 200)}" is, and it uses the same data folder, so nothing was removed. To free the name, ${runCommandHint(
          "plugin uninstall",
          boundKey,
          {
            fallback: `uninstall "${quotedPrintable(boundKey, 200)}" from the command line`,
          },
        )}.`,
        failureCode: "directory_name_held",
        pluginId: officialId,
        scope,
      };
    let enabledKeysOf = (enabledPlugins) => enabledPluginKeys(enabledPlugins, pluginId_2);
    let clearedFiles = [];
    try {
      for (let source of [
        "userSettings",
        "localSettings",
        ...(scope === "project" ? ["projectSettings"] : []),
      ]) {
        let enablingSettingsFile = await findEnablingSettingsFile(source, pluginId_2);
        if ("notRead" in enablingSettingsFile || enablingSettingsFile.readsBack !== "on") continue;
        let { error } = await updateSettingsForSourceWithTransform(
          source,
          (settings) => ({
            enabledPlugins: {
              ...settings?.enabledPlugins,
              ...Object.fromEntries(enabledKeysOf(settings?.enabledPlugins).map((key) => [key, undefined])),
            },
          }),
          undefined,
          storageV5,
        );
        let fileLabel =
          getSettingsFilePathForSource(source) ?? `your ${getSettingSourceDisplayNameLowercase(source)}`;
        if (error)
          return {
            success: false,
            message: `"${printableName}" could not be removed from the enabled plugins in ${fileLabel} (${error.message})${clearedFiles.length > 0 ? `; it was removed from them in ${clearedFiles.join(" and ")}` : ""}. Nothing it saved was removed, so "${printableName}" can still only be installed from the same repository. Once ${fileLabel} can be saved, uninstall it again.`,
            failureCode: "settings_write_failed",
            pluginId: pluginId_2,
            scope,
          };
        clearedFiles.push(fileLabel);
      }
      let settingsFiles = await listUninstallSettingsFiles(pluginId_2);
      if (settingsFiles.length > 0) {
        let any = settingsFiles.some((entry) => entry.readsBack !== "on");
        let advice =
          scope !== "project" &&
          settingsFiles.some((entry) => entry.source === "projectSettings" && entry.readsBack === "on")
            ? "To remove it there, uninstall it again with --scope project"
            : settingsFiles.some(
                  (entry) => entry.readsBack === "not-read-here" && entry.notReadBecause === undefined,
                )
              ? "Once this workspace is trusted and Claude Code has been started again, uninstall it again"
              : (networkPathRetryHint(settingsFiles, "uninstall it again") ??
                "Once it is switched off there, uninstall it again");
        return {
          success: false,
          message: `"${printableName}" is still switched on${any ? ", or may be," : ""} in ${getProjectPathForScope_2(settingsFiles, scope).join(" and ")}${clearedFiles.length > 0 ? `; it was removed from the enabled plugins in ${clearedFiles.join(" and ")}` : ""}. Nothing it saved was removed, so "${printableName}" can still only be installed from the same repository. ${advice}.`,
          failureCode: "directory_name_held",
          pluginId: pluginId_2,
          scope,
        };
      }
    } finally {
      refreshPluginCaches(storageV5);
    }
    let installedAfterRefresh =
      isStorageV5Enabled() && storageV5 !== undefined
        ? await loadInstalledPlugins(storageV5)
        : loadInstalledPluginsSync();
    if (
      hasFailedInstalledPluginsRead(installedAfterRefresh) ||
      bindingKeysFor(installedAfterRefresh.plugins, officialId).some(
        ([, installations]) => installations.length > 0,
      )
    )
      return {
        success: false,
        message: `"${printableName}" was not removed: an install record for it appeared while it was being switched off, or the install records could no longer be read. Nothing it saved was removed. Run the uninstall again.`,
        failureCode: "directory_name_held",
        pluginId: pluginId_2,
        scope,
      };
    let releaseNote = await releaseDirectoryBinding(
      pluginId_2,
      deleteDataDir,
      listInstalledPluginIds(installedAfterRefresh),
      storageV5,
      scope,
    );
    return {
      success: true,
      message: `"${printableName}" was no longer installed.${clearedFiles.length > 0 ? ` Removed it from the enabled plugins in ${clearedFiles.join(" and ")}.` : ""} ${releaseNote === undefined ? `Removed anything still saved under its name (${deleteDataDir ? "options, secrets, data" : "options, secrets"}).` : directoryReleaseNote(releaseNote)}`,
      pluginId: pluginId_2,
      pluginName,
      scope,
      dataDirKept: !deleteDataDir || releaseNote?.dataLeftInPlace === true,
      directoryNameNote: releaseNote && directoryReleaseNote(releaseNote),
    };
  }
  return;
}
//@ chunk-md9fmgw9.js:85126-86424 layout
/**
 * 列出删除插件保存的选项/密钥前用户需要先做的事：解锁钥匙串、修复不可读或不可写的设置文件与凭据存储等。
 */
function savedDataFixSteps(reasons, storeKind) {
  {
    let firstSteps = [
      ...(reasons.includes("secrets_unreadable") && storeKind === "keychain"
        ? ["unlock your keychain, or allow its prompt, so that the saved secrets can be checked"]
        : []),
      ...(reasons.includes("secrets_unreadable") && storeKind === "file"
        ? ["make sure the credentials file in your Claude configuration folder can be read"]
        : []),
      ...(reasons.includes("settings_unreadable")
        ? ["fix your user settings file, which is there and could not be read"]
        : []),
      ...(reasons.includes("settings_write_failed")
        ? ["make sure your user settings file can be saved"]
        : []),
      ...(reasons.includes("secrets_write_failed")
        ? [
            "make sure the credentials store can be written (if another Claude Code was using it, just try again)",
          ]
        : []),
    ];
    let notes = [
      ...(reasons.includes("secrets_unreadable") && storeKind === "credential-manager"
        ? [
            "run it from a Claude Code that can reach Windows Credential Manager (this one could not, so it cannot tell whether secrets are still saved there)",
          ]
        : []),
      ...(firstSteps.length > 0 ? [`first ${firstSteps.join(", and ")}`] : []),
      ...(reasons.includes("secrets_remain") ? ["its secrets were still there after this delete"] : []),
      ...(reasons.includes("settings_remain")
        ? [
            'its options were still in your user settings file after this delete: take its entry out of "pluginConfigs" there yourself',
          ]
        : []),
    ];
    return notes.length > 0
      ? notes.join("; ")
      : "first make sure your user settings file and the credentials store can be read and written";
  }
  return "";
}
//@ chunk-md9fmgw9.js:86424-89462 layout
/**
 * 根据目录释放结果生成给用户的说明：仍启用的位置、安装列表不可读、存在占用者、绑定文件不可用，以及选项/密钥/数据目录未删除时的处理建议与重新卸载命令。
 */
function directoryReleaseNote(result) {
  {
    if (result === undefined) return "";
    let printableName = quotedPrintable(parsePluginIdentifier(result.pluginId).name, 120);
    let dataDir = pluginDataDirPath(result.pluginId);
    let optionsError = "Its saved options and secrets could not be deleted";
    let stillOnNote =
      result.entry === "held"
        ? `, and "${printableName}" can still only be installed from the same repository`
        : "";
    let action = runCommandHint("plugin uninstall", result.pluginId, {
      ...(result.stillOnProjectFile && {
        extra: "--scope project",
      }),
      tail: "again",
      fallback: `uninstall "${quotedPrintable(result.pluginId, 200)}" again from the command line${result.stillOnProjectFile ? " with --scope project" : ""}`,
    });
    if (result.stillOnIn !== undefined) {
      let projectFileNote = result.stillOnProjectFile
        ? `To remove it there too, ${action}`
        : result.stillOnNotReadHere
          ? `Once this workspace is trusted and Claude Code has been started again, ${action}`
          : (networkPathRetryHint(result.stillOnNotReadForItsPath ?? [], action) ??
            `Once it is switched off there, ${action}`);
      return `It is still switched on${result.stillOnUnsure ? ", or may be," : ""} in ${result.stillOnIn.join(" and ")}, so nothing it saved was removed${stillOnNote}. ${projectFileNote}.`;
    }
    if (result.installsUnknown)
      return `The list of installed plugins could not be read, so nothing it saved was removed${stillOnNote}. Once the list can be read, ${action}.`;
    if (result.liveHolder === result.pluginId)
      return `An install record for "${printableName}" appeared while it was being uninstalled, so nothing it saved was removed.`;
    if (result.liveHolder !== undefined) {
      let holderName = quotedPrintable(result.liveHolder, 200);
      let uninstallHolderHint = runCommandHint("plugin uninstall", result.liveHolder, {
        fallback: `uninstall "${holderName}" from the command line`,
      });
      let holderNote = isOfficialPluginDirectoryId(result.liveHolder)
        ? ""
        : `, then ${runCommandHint("plugin uninstall", result.pluginId, {
            fallback: `uninstall "${quotedPrintable(result.pluginId, 200)}" from the command line`,
          })}`;
      return `${result.optionsGone ? "" : `${optionsError}. `}Its data folder (${dataDir}) was left in place because "${holderName}" is installed and uses it${result.entry === "held" ? `, so "${printableName}" can still only be installed from the same repository` : ""}. What is left is removed when "${holderName}" is uninstalled: ${uninstallHolderHint}${holderNote}.`;
    }
    if (result.entry !== "held")
      return [
        ...[
          ...(result.optionsGone ? [] : ["Its saved options and secrets may not have been deleted."]),
          ...(result.dataGone || result.dataKeptOnRequest
            ? []
            : [`Its data folder could not be deleted (${dataDir}); you can delete it yourself.`]),
        ],
        result.entry === "unreadable"
          ? `plugin-directory-bindings.json in the plugins folder could not be used, so "${printableName}" cannot be installed again until that file can be used.`
          : `Nothing ties "${printableName}" to the repository it came from, so a plugin installed under that name later could read what is left.`,
      ].join(" ");
    let repoTieNote = `so "${printableName}" can still only be installed from the same repository`;
    let uninstallHint = runCommandHint("plugin uninstall", result.pluginId, {
      fallback: `uninstall "${quotedPrintable(result.pluginId, 200)}" from the command line`,
    });
    let fixSteps = savedDataFixSteps(result.optionsNotGoneBecause, primarySecureStoreKind());
    if (result.optionsGone)
      return result.dataKeptOnRequest
        ? `Its data folder was kept (${dataDir}), ${repoTieNote}. To free the name, ${uninstallHint}, which deletes that folder.`
        : `Its data folder could not be deleted (${dataDir}), ${repoTieNote}. Once the folder can be deleted, ${uninstallHint} to free the name.`;
    if (result.dataGone)
      return `${optionsError}, ${repoTieNote}. To delete them and free the name, ${uninstallHint} (${fixSteps}).`;
    return result.dataKeptOnRequest
      ? `${optionsError}, and its data folder was kept (${dataDir}), ${repoTieNote}. To delete both and free the name, ${uninstallHint} (${fixSteps}).`
      : `Its saved options and secrets and its data folder (${dataDir}) could not be deleted, ${repoTieNote}. Once they can be deleted (${fixSteps}), ${uninstallHint} to free the name.`;
  }
  return "";
}
//@ chunk-md9fmgw9.js:89462-99847 fingerprint (2.1.88 match: setPluginEnabledOp, 0.318)
/**
 * 启用/禁用插件：写入目标作用域 settings 的 enabledPlugins[pluginId]=true/false；处理托管策略锁定、被依赖（禁用时提示谁依赖它）、依赖自动启用、作用域优先级（已有更高作用域值时提示）。
 */
async function setPluginEnabledOp(pluginId, enabled, scope, options, storageV5) {
  let verb = enabled ? "enable" : "disable";
  let grouped = groupedEnabledPlugins();
  pluginId = normalizePluginId(pluginId);
  let { name: bareName, marketplace } = parsePluginId(pluginId);
  if (isStorageV5Enabled() && storageV5 !== undefined) await primeInstalledPluginsCache(storageV5);
  if (marketplace === undefined && !isBuiltinPluginId(pluginId)) {
    let builtinId = joinPluginId(pluginId, BUILTIN);
    let pluginId_2 = findPluginInSettings(pluginId, ["user"])?.pluginId;
    if (hasTrustedOnlyBuiltinPlugin(builtinId) && pluginId_2 !== undefined && !isBuiltinPluginId(pluginId_2))
      return setPluginEnabledOp(pluginId_2, enabled, scope, options, storageV5);
    if (hasTrustedOnlyBuiltinPlugin(builtinId)) {
      let allPlugins = await loadAllPlugins(storageV5);
      if (
        ![...allPlugins.enabled, ...allPlugins.disabled].some(
          (plugin) => pluginNamesEqual(plugin.name, pluginId) && !isBuiltinPluginId(plugin.source),
        )
      )
        return setPluginEnabledOp(builtinId, enabled, scope, options, storageV5);
      return {
        success: false,
        message: `Plugin "${pluginId}" names both a built-in and another loaded plugin. Use plugin@marketplace format.`,
        failureCode: "ambiguous_marketplace",
      };
    }
    let pluginId_3 = findPluginInSettings(pluginId)?.pluginId;
    if (
      pluginId_3 !== undefined &&
      (isOfficialMarketplace(marketplaceSuffix(pluginId_3)) || hasTrustedOnlyBuiltinPlugin(pluginId_3))
    )
      return setPluginEnabledOp(pluginId_3, enabled, scope, options, storageV5);
  }
  if (isBuiltinPluginId(pluginId) || isOfficialMarketplace(marketplace)) {
    let settingScope = "user";
    let targetId = trustedOnlyBuiltinPluginId(pluginId) ?? pluginId;
    let lockSource = hasTrustedOnlyBuiltinPlugin(targetId)
      ? getPluginEnablementLockingSource(targetId, enabled)
      : undefined;
    if (lockSource !== undefined) return pluginBlockedResult(targetId, enabled, lockSource, targetId);
    let managedRefusal = !enabled && isBuiltinPluginId(targetId) ? managedPluginRefusal(targetId) : undefined;
    if (managedRefusal !== undefined) return managedRefusal;
    let defaultEnabled;
    let syncedFallback;
    let shadowsToTurnOff = [];
    let policyAdmitted = false;
    let required = false;
    let override;
    let scopeGiven = false;
    let shadowNote = "";
    if (isOfficialMarketplace(marketplace)) {
      let allPlugins = await loadAllPlugins(storageV5);
      let pluginByIdentifier = findPluginByIdentifier(
        pluginId,
        [...allPlugins.enabled, ...allPlugins.disabled].filter(
          (plugin) => marketplaceSuffix(plugin.source) === marketplace,
        ),
      );
      if (pluginByIdentifier) {
        targetId = pluginByIdentifier.source;
        defaultEnabled = pluginByIdentifier.manifest.defaultEnabled === false;
      }
      required =
        marketplace === SYNCED &&
        (pluginByIdentifier !== undefined
          ? isRequiredPlugin(pluginByIdentifier.source, pluginByIdentifier.installationPreference)
          : (await listSyncedRequiredPlugins(storageV5)).some(
              (entry) => entry.required && nfcLower(entry.id) === nfcLower(targetId),
            ));
      if (!enabled && required)
        return {
          success: false,
          message: requiredPluginMessage(targetId),
          failureCode: "required_by_organization",
        };
      if (!enabled && marketplace === INLINE_PLUGIN_MARKETPLACE && pluginByIdentifier === undefined) {
        let syncedId = `${bareName}@${SYNCED}`;
        let found = (await listSyncedRequiredPlugins(storageV5)).find(
          (entry) => entry.required && nfcLower(entry.id) === nfcLower(syncedId),
        );
        if (found !== undefined)
          return {
            success: false,
            message: requiredPluginMessage(found.id),
            failureCode: "required_by_organization",
          };
      }
      if (!enabled && !options?.bypassDependentsBlock) {
        let requiredBy =
          buildRequiredByPolicyMap([...allPlugins.enabled, ...allPlugins.disabled]).get(nfcLower(targetId)) ??
          [];
        if (requiredBy.length > 0)
          return {
            success: false,
            message: requiredDependencyMessage(parsePluginId(targetId).name, requiredBy),
            failureCode: "required_by_organization",
            reverseDependents: requiredBy.map((dependent) => dependent.name),
          };
      }
      let any = allPlugins.warnings.some(
        (warning) =>
          warning.type === "synced-plugin-shadowed" && nfcLower(warning.source) === nfcLower(targetId),
      );
      let lockedName =
        enabled && !any
          ? lockedDependentName(targetId, pluginByIdentifier?.attributedMarketplaceName)
          : undefined;
      if (lockedName !== undefined)
        return {
          success: false,
          message: `Plugin "${targetId}" cannot be ${verb}d here: "${lockedName}" is locked by your organization's managed settings, so this ${nonInstallableSourceLabel(marketplace)} copy is never loaded`,
          failureCode: "managed_name_locked",
        };
      policyAdmitted =
        pluginByIdentifier !== undefined &&
        matchPolicyPluginEntry(
          getPolicyEnabledPluginEntries(),
          parsePluginId(targetId).name,
          pluginByIdentifier.attributedMarketplaceName,
        ).outcome === "admitted";
      if (enabled && policyAdmitted && pluginByIdentifier !== undefined)
        shadowsToTurnOff = [
          `${pluginByIdentifier.name}@${SYNCED}`,
          `${pluginByIdentifier.name}@${INLINE_PLUGIN_MARKETPLACE}`,
        ].flatMap((otherId) =>
          ["local", "user"].flatMap((scope) => {
            let pluginInSource = findPluginInSource(scope, otherId, grouped);
            return pluginInSource?.value === false
              ? [
                  {
                    scope,
                    key: pluginInSource.key,
                  },
                ]
              : [];
          }),
        );
      if (enabled && marketplace === SYNCED) {
        let brokenSources = new Set(allPlugins.errors.filter(isDependencyError).map((error) => error.source));
        let shadowingCopy = localCopyShadowingSynced(bareName, [
          ...allPlugins.enabled.filter((plugin) => !plugin.isBuiltin),
          ...allPlugins.disabled
            .filter((plugin) => brokenSources.has(plugin.source))
            .map((plugin) => ({
              ...plugin,
              enabled: true,
            })),
          ...allPlugins.enabled.filter((plugin) => plugin.isBuiltin),
        ]);
        if (shadowingCopy !== undefined)
          shadowNote = ` (a local copy, ${stripInvisibleKeepEmoji(shadowingCopy.source)}, currently takes precedence over the synced one \u2014 disable it in /plugin to run this copy)`;
      }
      if (enabled && marketplace === INLINE_PLUGIN_MARKETPLACE && !policyAdmitted) {
        let { name } = splitPluginId(targetId);
        let syncedId = `${name}@${SYNCED}`;
        let filtered = VALID_INSTALLABLE_SCOPES.filter(
          (scope) =>
            findPluginInSource(scope, targetId, grouped)?.value === false &&
            findPluginInSource(scope, syncedId, grouped) === undefined,
        );
        if (filtered.length > 0)
          syncedFallback = {
            syncedId,
            scopes: filtered,
          };
      }
      let located = locatePluginInstall(targetId, scope, grouped);
      override = located.override;
      if (scope) {
        targetId = located.atRequested?.key ?? located.found?.key ?? targetId;
        scopeGiven = located.atRequested !== undefined;
        if (
          located.atRequested === undefined &&
          located.found &&
          SCOPE_PRECEDENCE[located.found.scope] > SCOPE_PRECEDENCE[scope]
        )
          return {
            success: false,
            message: `Plugin "${targetId}" is set at ${located.found.scope} scope (which overrides ${scope}). Use --scope ${located.found.scope} or omit --scope to auto-detect.`,
            failureCode: "not_installed_at_scope",
            installedScope: located.found.scope,
          };
        settingScope = scope;
      } else {
        settingScope = located.decidingScope ?? located.found?.scope ?? "user";
        targetId = findPluginInSource(settingScope, targetId, grouped)?.key ?? targetId;
      }
    }
    if (enabled && marketplace === SKILLS_DIR) {
      if (!areLocalPluginDirsAllowedByPolicy())
        return {
          success: false,
          message: localPluginDirsBlockedMessage(tildify(join(getClaudeConfigDir(), "skills"))),
          failureCode: "local_plugin_dirs_blocked",
        };
    }
    if (enabled && isPluginBlockedByPolicy(targetId))
      return {
        success: false,
        message: `Plugin "${targetId}" is blocked by your organization's policy and cannot be enabled`,
        failureCode: "plugin_policy_blocked",
      };
    if (
      marketplace === SYNCED &&
      override &&
      override.enabling !== enabled &&
      !(required && override.source === "flagSettings")
    )
      return pluginBlockedResult(targetId, enabled, override.source, override.key);
    let settingSource = scopeToSettingSource(settingScope);
    let writeValue =
      enabled &&
      isOfficialMarketplace(marketplace) &&
      settingSource === "userSettings" &&
      defaultEnabled === false &&
      (marketplace !== SYNCED ||
        isPluginEnabled(targetId, pluginRecordsFor(settingSource, targetId)) !== false)
        ? undefined
        : enabled;
    let governedNote = "";
    if (marketplace === SYNCED) {
      let records = enabledPluginsBySource(settingSource, targetId, writeValue);
      let setting = pluginSettingAt(
        targetId,
        records.map(({ record }) => record),
      );
      let currentEnabled = setting?.enabled ?? defaultEnabled !== true;
      let source = setting === undefined ? undefined : records[setting.index]?.source;
      if (currentEnabled !== enabled && source !== undefined && !(required && source !== "policySettings")) {
        let settingSourceName = getSettingSourceName(source);
        let governingScope =
          source === "localSettings" || source === "projectSettings" || source === "userSettings"
            ? SETTING_SOURCE_TO_SCOPE[source]
            : undefined;
        let scopeSuffix = governingScope !== undefined ? ` (--scope ${governingScope})` : "";
        if (!scopeGiven)
          return {
            success: false,
            message: `Plugin "${targetId}" would still be ${enabled ? "disabled" : "enabled"} after writing ${settingScope} settings: ${settingSourceName} settings govern it. Change it there${scopeSuffix}.`,
            failureCode: "governed_elsewhere",
            ...(governingScope !== undefined && {
              governingScope,
            }),
          };
        governedNote = ` (still ${enabled ? "disabled" : "enabled"} here: ${settingSourceName} settings govern it${scopeSuffix})`;
      }
      if (!getEnabledSettingSources().includes(settingSource))
        governedNote += ` (this session ignores ${getSettingSourceName(settingSource)} settings: --setting-sources)`;
    }
    for (let { scope, key } of shadowsToTurnOff) {
      if (scope === settingScope && nfcLower(key) === nfcLower(targetId)) continue;
      let { error } = await writeEnabledPlugins(scopeToSettingSource(scope), key, true, {}, storageV5);
      if (error)
        return {
          success: false,
          message: `Failed to ${verb} plugin: ${error.message}`,
          failureCode: "settings_write_failed",
        };
    }
    if (
      !enabled &&
      isOfficialMarketplace(marketplace) &&
      settingScope === "project" &&
      (getPolicyEnabledPluginEntries()?.some(
        (entry) =>
          entry.enabled &&
          pluginNameAliases_2(entry).some(
            (alias) => nfcLower(alias) === nfcLower(parsePluginId(targetId).name),
          ),
      ) ??
        false)
    ) {
      let { error } = await writeEnabledPlugins("userSettings", targetId, false, {}, storageV5);
      if (error)
        return {
          success: false,
          message: `Failed to ${verb} plugin: ${error.message}`,
          failureCode: "settings_write_failed",
        };
    }
    if (syncedFallback) {
      let { syncedId, scopes } = syncedFallback;
      for (let scope of scopes) {
        if (scope === settingScope) continue;
        let { error } = await writeEnabledPlugins(
          scopeToSettingSource(scope),
          syncedId,
          false,
          {},
          storageV5,
        );
        if (error)
          return {
            success: false,
            message: `Failed to ${verb} plugin: ${error.message}`,
            failureCode: "settings_write_failed",
          };
      }
    }
    let { error } = await writeEnabledPlugins(
      settingSource,
      targetId,
      writeValue,
      syncedFallback?.scopes.includes(settingScope)
        ? {
            [syncedFallback.syncedId]: false,
          }
        : {},
      storageV5,
    );
    if (error)
      return {
        success: false,
        message: `Failed to ${verb} plugin: ${error.message}`,
        failureCode: "settings_write_failed",
      };
    refreshPluginCaches(storageV5);
    let { name: pluginName } = splitPluginId(targetId);
    return {
      success: true,
      message: `Successfully ${verb}d plugin: ${pluginName}${governedNote}${shadowNote}${enabled ? "" : flagSettingsEnabledNote(targetId)}`,
      pluginId: targetId,
      pluginName,
      scope: settingScope,
    };
  }
  if (scope) assertInstallableScope(scope);
  let resolvedId;
  let resolvedScope;
  let found = findPluginInSettings(pluginId);
  if (scope) {
    resolvedScope = scope;
    if (found) resolvedId = found.pluginId;
    else if (pluginId.includes("@")) resolvedId = pluginId;
    else
      return {
        success: false,
        message: `Plugin "${pluginId}" not found in settings. Use plugin@marketplace format.`,
        failureCode: "ambiguous_marketplace",
      };
  } else if (found) {
    resolvedId = found.pluginId;
    resolvedScope = found.scope;
  } else if (pluginId.includes("@")) {
    resolvedId = pluginId;
    resolvedScope = "user";
  } else
    return {
      success: false,
      message: `Plugin "${pluginId}" not found in any editable settings scope. Use plugin@marketplace format.`,
      failureCode: "ambiguous_marketplace",
    };
  if (enabled && isPluginBlockedByPolicy(resolvedId))
    return {
      success: false,
      message: `Plugin "${resolvedId}" is blocked by your organization's policy and cannot be enabled`,
      failureCode: "plugin_policy_blocked",
    };
  let managedRefusal = enabled ? undefined : managedPluginRefusal(resolvedId);
  if (managedRefusal !== undefined) return managedRefusal;
  if (isNpmPluginSource(resolvedId)) {
    let name = parsePluginIdentifier(resolvedId).name ?? resolvedId;
    if (enabled && pluginDirectoryPolicyBlock() !== null)
      return {
        success: false,
        message: directoryBlockedMessage(name),
        failureCode: "marketplace_policy_blocked",
      };
    if (enabled && (await isPluginDirectoryListingBlocked(name, storageV5)))
      return {
        success: false,
        message: `Plugin "${quotedPrintable(resolvedId)}" is blocked by your organization's policy and cannot be enabled`,
        failureCode: "plugin_policy_blocked",
      };
    await seedBindingsFromInstall(resolvedId, getInstalledPlugins().plugins[resolvedId]);
  }
  let settingSource = scopeToSettingSource(resolvedScope);
  let existingValue = lookupByPluginAliases(
    getSettingsForSourceForUpkeep(settingSource)?.enabledPlugins,
    resolvedId,
  );
  let scopeOverrides = scope && found && SCOPE_PRECEDENCE[scope] > SCOPE_PRECEDENCE[found.scope];
  if (scope && existingValue === undefined && found && found.scope !== scope && !scopeOverrides)
    return {
      success: false,
      message: `Plugin "${pluginId}" is installed at ${found.scope} scope, not ${scope}. Use --scope ${found.scope} or omit --scope to auto-detect.`,
      failureCode: "not_installed_at_scope",
      installedScope: found.scope,
    };
  let alreadyThere =
    scope && !scopeOverrides
      ? existingValue === true ||
        (!enabled && getPluginEnablingSource(resolvedId, grouped) === "flagSettings")
      : legacyPluginIds(canonicalPluginId(resolvedId)).length > 0
        ? findEnabledSettingForPlugin(canonicalPluginId(resolvedId)) === true
        : getPluginEditableScopes().has(resolvedId);
  if (enabled === alreadyThere)
    return {
      success: false,
      alreadyInGoalState: true,
      failureCode: "already_in_goal_state",
      message: `Plugin "${pluginId}" is already ${enabled ? "enabled" : "disabled"}${scope ? ` at ${scope} scope` : ""}`,
    };
  let rdeps;
  if (!enabled) {
    let { enabled, disabled } = await loadAllPlugins(storageV5);
    let allPlugins = [...enabled, ...disabled];
    let canonical = canonicalPluginId(resolvedId);
    let reverseDependentNames = findReverseDependentNames(canonical, allPlugins);
    if (reverseDependentNames.length > 0) rdeps = reverseDependentNames;
    if (!options?.bypassDependentsBlock) {
      let requiredBy = buildRequiredByPolicyMap(allPlugins).get(nfcLower(canonical)) ?? [];
      if (requiredBy.length > 0)
        return {
          success: false,
          message: requiredDependencyMessage(parsePluginIdentifier(resolvedId).name, requiredBy),
          failureCode: "required_by_organization",
          reverseDependents: requiredBy.map((dependent) => dependent.name),
        };
    }
    let relevantPlugins = isSyncWanted()
      ? allPlugins
      : allPlugins.filter((plugin) => marketplaceSuffix(plugin.source) !== SYNCED);
    let reverseDependentNames_2 = findReverseDependentNames(canonical, relevantPlugins);
    if (reverseDependentNames_2.length > 0 && !options?.bypassDependentsBlock) {
      let { name } = parsePluginIdentifier(resolvedId);
      let rdeps = collectTransitiveDependents(canonical, relevantPlugins);
      let mapped = [...rdeps, resolvedId].map((id) => claudeCommand("plugin disable", id));
      let hint = mapped.every((command) => command !== null)
        ? `, or disable everything together: ${mapped.join(" && ")}`
        : ", or disable them together in /plugin.";
      return {
        success: false,
        message: `${name} is still required by ${reverseDependentNames_2.map(stripInvisibleKeepEmoji).join(", ")}. Disable ${plural(reverseDependentNames_2.length, "that plugin", "those plugins")} first${hint}`,
        failureCode: "required_by_dependents",
        reverseDependents: reverseDependentNames_2,
        disableFirst: rdeps,
      };
    }
  }
  let dependenciesToEnable = [];
  if (enabled) {
    let { enabled, disabled } = await loadAllPlugins(storageV5);
    let { closure, missing } = computeDependencyClosure(resolvedId, [...enabled, ...disabled]);
    if (missing.length > 0) {
      let { name } = parsePluginIdentifier(resolvedId);
      let mapped = missing.map((dependency) => claudeCommand("plugin install", dependency));
      let hint = mapped.every((command) => command !== null) ? `: ${mapped.join(" && ")}` : " from /plugin.";
      return {
        success: false,
        message: `${name} depends on ${missing.join(", ")}, which ${plural(missing.length, "is", "are")} not installed. Install ${plural(missing.length, "it", "them")} first${hint}`,
        failureCode: "dependency_missing",
        dependencies: missing,
      };
    }
    let enabledSources = new Set(enabled.map((plugin) => plugin.source));
    let knownBySource = new Map(
      [...enabled, ...disabled]
        .filter((plugin) => isOfficialMarketplace(marketplaceSuffix(plugin.source)))
        .map((plugin) => [plugin.source, plugin]),
    );
    let enabledPluginsBySource = getEnabledPluginsBySource();
    let filtered = closure.filter(
      (dependency) =>
        isOfficialMarketplace(marketplaceSuffix(dependency)) &&
        !enabledSources.has(dependency) &&
        !isPluginEnabled_2(
          dependency,
          enabledPluginsBySource,
          knownBySource.get(dependency)?.manifest.defaultEnabled,
          knownBySource.get(dependency)?.installationPreference,
        ),
    );
    if (filtered.length > 0) {
      let { name } = parsePluginIdentifier(resolvedId);
      let count = filtered.length;
      let mapped = filtered.map((dependency) => claudeCommand("plugin enable", dependency));
      let hint = mapped.every((command) => command !== null) ? `: ${mapped.join(" && ")}` : " in /plugin.";
      return {
        success: false,
        message: `${name} depends on ${filtered.join(", ")}, ${plural(count, "a local copy that is", "local copies that are")} currently disabled. Enable ${plural(count, "it", "them")} first${hint}`,
        failureCode: "dependency_disabled",
        dependencies: filtered,
      };
    }
    let filtered_2 = closure.filter((dependency) => !isOfficialMarketplace(marketplaceSuffix(dependency)));
    let filtered_3 = filtered_2.filter((dependency) => isPluginBlockedByPolicy(dependency));
    if (filtered_3.length > 0) {
      let { name } = parsePluginIdentifier(resolvedId);
      return {
        success: false,
        message: `${name} depends on ${filtered_3.join(", ")}, which ${plural(filtered_3.length, "is", "are")} blocked by your organization's plugin policy. Ask an admin to allow ${plural(filtered_3.length, "it", "them")}.`,
        failureCode: "dependency_policy_blocked",
      };
    }
    let sorted = [...VALID_INSTALLABLE_SCOPES].sort(
      (left, right) => SCOPE_PRECEDENCE[right] - SCOPE_PRECEDENCE[left],
    );
    let disableAtScopes = [];
    for (let dependency of filtered_2)
      for (let scope of sorted) {
        if (SCOPE_PRECEDENCE[scope] <= SCOPE_PRECEDENCE[resolvedScope]) continue;
        let value = getSettingsForSourceForUpkeep(scopeToSettingSource(scope))?.enabledPlugins?.[dependency];
        if (value === undefined) continue;
        if (value === false)
          disableAtScopes.push({
            dep: dependency,
            scope,
          });
        break;
      }
    if (disableAtScopes.length > 0) {
      let { name } = parsePluginIdentifier(resolvedId);
      let joined = disableAtScopes.map((entry) => `${entry.dep} (${entry.scope} scope)`).join(", ");
      let scopes = normalizeCaseForComparison_2(disableAtScopes.map((entry) => entry.scope));
      let scopeHint =
        scopes.length === 1 ? `, or use --scope ${scopes[0]} to write where the override lives` : "";
      return {
        success: false,
        message: `${name} depends on ${joined}, which ${plural(disableAtScopes.length, "is", "are")} disabled there. Enable ${plural(disableAtScopes.length, "it", "them")} at that scope${scopeHint}.`,
        failureCode: "dependency_disabled",
        dependencies: disableAtScopes.map((entry) => entry.dep),
      };
    }
    let enabledPluginIdsInSource = getEnabledPluginIdsInSource(settingSource);
    dependenciesToEnable = filtered_2.filter((dependency) => !enabledPluginIdsInSource.has(dependency));
  }
  let { error } = await writeEnabledPlugins(
    settingSource,
    resolvedId,
    enabled,
    Object.fromEntries(dependenciesToEnable.map((dependency) => [dependency, true])),
    storageV5,
  );
  if (error)
    return {
      success: false,
      message: `Failed to ${verb} plugin: ${error.message}`,
      failureCode: "settings_write_failed",
    };
  refreshPluginCaches(storageV5);
  if (enabled) {
    seedPluginUsage([resolvedId, ...dependenciesToEnable], storageV5);
    touchPluginUsage([resolvedId, ...dependenciesToEnable], storageV5);
  }
  let { name: pluginName } = parsePluginIdentifier(resolvedId);
  let depWarn = formatReverseDependentsSuffix(rdeps);
  let enabledNote =
    dependenciesToEnable.length > 0
      ? ` (also enabled ${dependenciesToEnable.length} ${plural(dependenciesToEnable.length, "dependency", "dependencies")}: ${dependenciesToEnable.map((dependency) => parsePluginIdentifier(dependency).name).join(", ")})`
      : "";
  return {
    success: true,
    message: `Successfully ${verb}d plugin: ${pluginName} (scope: ${resolvedScope})${enabled ? "" : flagSettingsEnabledNote(resolvedId)}${depWarn}${enabledNote}`,
    pluginId: resolvedId,
    pluginName,
    scope: resolvedScope,
    reverseDependents: rdeps,
  };
}
//@ chunk-md9fmgw9.js:99847-99900 layout
/**
 * 启用插件：setPluginEnabledOp(pluginId, true, scope)。
 */
async function enablePluginOp(pluginId, scope, storageV5) {
  return setPluginEnabledOp(pluginId, true, scope, undefined, storageV5);
}
//@ chunk-md9fmgw9.js:99900-99953 layout
/**
 * 禁用插件：setPluginEnabledOp(pluginId, false, scope)。
 */
async function disablePluginOp(pluginId, scope, storageV5) {
  return setPluginEnabledOp(pluginId, false, scope, undefined, storageV5);
}
//@ chunk-md9fmgw9.js:99953-102243 layout
/**
 * 列出必须保持启用的插件：托管策略 policySettings 启用的、claude.ai 同步要求的，以及它们的依赖闭包；用于禁止禁用。
 */
async function listRequiredPlugins(storageV5) {
  let pluginEditableScopes = getPluginEditableScopes();
  await ensureSyncedPluginDirsRegistered();
  let syncedRequired = await listSyncedRequiredPlugins(storageV5);
  let syncedIds = normalizeCaseForComparison_2(syncedRequired.map((syncedPlugin) => syncedPlugin.id));
  let requiredSyncedIds = new Set(
    syncedRequired
      .filter((syncedPlugin) => syncedPlugin.required)
      .map((syncedPlugin) => nfcLower(syncedPlugin.id)),
  );
  let recordsBySource = enabledPluginRecordsBySource();
  let groupedPlugins = groupedEnabledPlugins();
  let filtered = [
    ...syncedIds,
    ...recordsBySource
      .filter(({ source }) => source === "policySettings")
      .flatMap(({ record }) => Object.keys(record ?? {})),
  ].filter((pluginId) => getPluginEnablingSource(pluginId, groupedPlugins) === "policySettings");
  let allPlugins =
    (requiredSyncedIds.size > 0 && isSyncAvailable()) || filtered.length > 0
      ? await loadAllPlugins(storageV5).then((allPlugins) => [...allPlugins.enabled, ...allPlugins.disabled])
      : [];
  let inlineSources = new Set(
    allPlugins
      .filter((plugin) => marketplaceSuffix(plugin.source) === INLINE_PLUGIN_MARKETPLACE)
      .map((plugin) => nfcLower(plugin.source)),
  );
  let isSyncedDisabled = (pluginId) => {
    let normalizedId = normalizePluginId(pluginId);
    let marketplace = marketplaceSuffix(normalizedId);
    if (marketplace === INLINE_PLUGIN_MARKETPLACE) {
      if (inlineSources.has(nfcLower(normalizedId))) return false;
    } else if (marketplace !== SYNCED) return false;
    let sliced = normalizedId.slice(0, normalizedId.lastIndexOf("@"));
    return requiredSyncedIds.has(nfcLower(`${sliced}@${SYNCED}`));
  };
  let allRecordKeys = ((records) =>
    new Set(records.flatMap(({ record }) => Object.keys(record ?? {}).map(nfcLower))))(recordsBySource);
  let filtered_2 = syncedIds.filter(
    (pluginId) => !allRecordKeys.has(nfcLower(pluginId)) && !isSyncedDisabled(pluginId),
  );
  let recordKeysOf = (records) => new Set(records.flatMap(({ record }) => Object.keys(record ?? {})));
  let allKeys = recordKeysOf(recordsBySource);
  let trustedKeys = recordKeysOf(
    recordsBySource.filter(({ source }) => TRUSTED_SETTING_SOURCES.includes(source)),
  );
  let filtered_3 = getBuiltinPlugins()
    .enabled.map((builtin) => builtin.source)
    .filter((builtinId) => {
      let candidateKeys = hasTrustedOnlyBuiltinPlugin(builtinId) ? trustedKeys : allKeys;
      return ![builtinId, ...legacyPluginIds(builtinId)].some((id) => candidateKeys.has(id));
    });
  let policyRequired = new Set(buildRequiredByPolicyMap(allPlugins).keys());
  let isPolicyRequired = (pluginId) => policyRequired.has(nfcLower(normalizePluginId(pluginId)));
  let candidates = [...pluginEditableScopes.keys(), ...filtered_2, ...filtered_3];
  let requiredAndDisabled = normalizeCaseForComparison_2(
    candidates.filter(
      (pluginId) =>
        !isManagedDisabled(pluginId, isSyncedDisabled, groupedPlugins) && isPolicyRequired(pluginId),
    ),
  );
  let filtered_4 = [...filtered_2, ...filtered_3].filter(
    (pluginId) =>
      !isManagedDisabled(pluginId, isSyncedDisabled, groupedPlugins) && !isPolicyRequired(pluginId),
  );
  let filtered_5 = [...pluginEditableScopes.keys()].filter(
    (key) => !isManagedDisabled(key, isSyncedDisabled, groupedPlugins) && !isPolicyRequired(key),
  );
  let size = new Set([
    ...requiredSyncedIds,
    ...[
      ...filtered_3,
      ...syncedIds,
      ...allPlugins.map((plugin) => plugin.source),
      ...[...pluginEditableScopes]
        .filter(([, scopeEntry]) => scopeEntry !== "managed")
        .map(([editableKey]) => editableKey),
    ]
      .filter((pluginId) => getPluginEnablingSource(pluginId, groupedPlugins) === "policySettings")
      .map(nfcLower),
  ]).size;
  let dependentsClause =
    requiredAndDisabled.length > 0
      ? ` and ${requiredAndDisabled.length} ${plural(requiredAndDisabled.length, "plugin")} ${plural(size, "it depends", "they depend")} on`
      : "";
  let skippedSuffix = size > 0 ? ` (skipped ${size} required by your organization${dependentsClause})` : "";
  if (filtered_5.length === 0 && filtered_4.length === 0)
    return {
      success: true,
      message: `No enabled plugins to disable${skippedSuffix}`,
    };
  let disabled = [];
  let failures = [];
  for (let pluginId of filtered_5) {
    let result = await setPluginEnabledOp(
      pluginId,
      false,
      undefined,
      {
        bypassDependentsBlock: true,
      },
      storageV5,
    );
    if (result.success) disabled.push(pluginId);
    else failures.push(stripInvisibleKeepEmoji(`${pluginId}: ${result.message}`));
  }
  for (let pluginId of filtered_4) {
    let { error } = await updateSettingsForSourceWithTransform(
      "userSettings",
      (settings) => ({
        enabledPlugins: {
          ...settings?.enabledPlugins,
          [pluginId]: false,
        },
      }),
      undefined,
      storageV5,
    );
    if (error) failures.push(stripInvisibleKeepEmoji(`${pluginId}: ${error.message}`));
    else disabled.push(pluginId);
  }
  if (filtered_4.length > 0) refreshPluginCaches(storageV5);
  let stillOnCount = countWhere(
    disabled,
    (pluginId) => getPluginEnablingSource(pluginId, groupedPlugins) === "flagSettings",
  );
  let stillOnSuffix =
    stillOnCount > 0
      ? ` (${stillOnCount} still enabled this session: --settings keeps ${plural(stillOnCount, "it", "them")} on)`
      : "";
  if (failures.length > 0)
    return {
      success: false,
      message: `Disabled ${disabled.length} ${plural(disabled.length, "plugin")}${skippedSuffix}${stillOnSuffix}, ${failures.length} failed:
${failures.join(`
`)}`,
      failureCode: "partial_failure",
    };
  return {
    success: true,
    message: `Disabled ${disabled.length} ${plural(disabled.length, "plugin")}${skippedSuffix}${stillOnSuffix}`,
  };
}
//@ chunk-md9fmgw9.js:102243-102491 layout
async function listSyncedRequiredPlugins(storageV5) {
  return (
    await Promise.all(
      getSyncedPluginDirs().map(async (dir) => {
        let mintedName = await syncedPluginMintedName(dir, storageV5);
        if (mintedName === undefined) return [];
        let pluginId = `${mintedName}@${SYNCED}`;
        let pluginAttribution = await getPluginAttribution(resolve(dir));
        return [
          {
            id: pluginId,
            required:
              isRequiredPlugin(pluginId, pluginAttribution.installationPreference) &&
              lockedDependentName(pluginId, pluginAttribution.marketplaceName) === undefined,
          },
        ];
      }),
    )
  ).flat();
}
//@ chunk-md9fmgw9.js:102491-102731 layout
function buildRequiredByPolicyMap(plugins) {
  let dependentsByKey = new Map();
  let syncAvailable = isSyncAvailable();
  let groupedPlugins = groupedEnabledPlugins();
  for (let plugin of plugins) {
    if (
      !(syncAvailable && isRequiredPlugin(plugin.source, plugin.installationPreference)) &&
      getPluginEnablingSource(plugin.source, groupedPlugins) !== "policySettings"
    )
      continue;
    for (let dependencyId of computeDependencyClosure(plugin.source, plugins).closure) {
      let dependencyKey = nfcLower(dependencyId);
      dependentsByKey.set(dependencyKey, [...(dependentsByKey.get(dependencyKey) ?? []), plugin]);
    }
  }
  return dependentsByKey;
}
//@ chunk-md9fmgw9.js:102731-102938 layout
function requiredDependencyMessage(name, dependents) {
  return `${name} is needed by ${dependents.map((dependent) => stripInvisibleKeepEmoji(dependent.name)).join(", ")}, which ${plural(dependents.length, "is", "are")} required by your organization, so it can't be disabled here. Contact your admin to change it.`;
}
//@ chunk-md9fmgw9.js:102938-103070 layout
/**
 * “该插件由组织要求启用，不能在此禁用”的提示文本。
 */
function requiredPluginMessage(pluginName) {
  return `Plugin "${pluginName}" is required by your organization and can't be disabled here. Contact your admin to change it.`;
}
//@ chunk-md9fmgw9.js:103070-104132 layout
/**
 * 更新插件的操作入口（CLI 与 /plugin 界面共用）：执行实际更新，异常按 failureCode 分 bad/sad 记 plugin_update_op 遥测，返回 {outcome, message, scope, failureCode}。
 */
async function updatePluginOp(pluginId, scope, options = {}, storageV5) {
  let result;
  try {
    result = await updatePluginOpInner(pluginId, scope, options, storageV5);
  } catch (error) {
    let fields = {
      is_directory: isOfficialDirectoryPlugin(pluginId),
    };
    if (error instanceof CommandSourceError) {
      let failureCode = error instanceof EntryHelperError ? error.failureCode : "command_source_refused";
      if (FAILURE_CODE_SEVERITY[failureCode] === "sad")
        logFeatureSad("plugin_update_op", failureCode, fields);
      else logFeatureBad("plugin_update_op", failureCode, fields);
      return {
        outcome: "failed",
        message: error.message,
        scope,
        failureCode,
      };
    }
    logFeatureBad("plugin_update_op", "exception", fields);
    throw error;
  }
  let fields = {
    is_directory: isOfficialDirectoryPlugin(result.pluginId ?? pluginId),
    pin_changed: result.pinChanged === true,
    no_clone_short_circuit: result.noCloneShortCircuit === true,
    not_checked: result.notChecked === true,
  };
  switch (result.outcome) {
    case "failed":
      if (result.failureCode !== undefined && FAILURE_CODE_SEVERITY[result.failureCode] === "sad")
        logFeatureSad("plugin_update_op", result.failureCode, fields);
      else logFeatureBad("plugin_update_op", result.failureCode ?? "op_failed", fields);
      break;
    case "skipped":
      logFeatureSad("plugin_update_op", result.skipReason ?? "skipped", fields);
      break;
    case "up_to_date":
    case "updated":
      if (result.refreshFailed)
        logFeatureSad(
          "plugin_update_op",
          result.refreshRefusedByPolicy ? "marketplace_refresh_policy_refused" : "marketplace_refresh_failed",
          fields,
        );
      else
        logFeatureOk("plugin_update_op", {
          already_up_to_date: result.outcome === "up_to_date",
          version_unknown: result.newVersion === "unknown",
          ...fields,
        });
      break;
  }
  return result;
}
//@ chunk-md9fmgw9.js:104132-105419 layout
/**
 * 更新结果为 up_to_date 时补充检查：安装路径已不存在则改报需重新安装。
 */
async function annotateUpToDateResult(result, installation, pluginName, storageV5) {
  if (result.outcome !== "up_to_date") return result;
  let { absolute, suspect } = classifyMarketplacePath(installation.installPath);
  let sourceReal =
    (suspect
      ? undefined
      : await cacheCopyDependencyGap(absolute).catch(() => {
          return;
        })
    )?.kind === "not-installed"
      ? await realPathInsideCache(absolute)
      : undefined;
  if (sourceReal === undefined) return result;
  if (isEssentialTrafficOnly()) return result;
  let scopeLabel = installation.projectPath
    ? `${installation.scope} (${installation.projectPath})`
    : installation.scope;
  let installError;
  let installThrew = false;
  try {
    await unvouchBeforeDependencyStep(absolute, storageV5);
    installError = (
      await installPluginDependencies(absolute, {
        inPlaceAt: sourceReal,
      })
    ).error;
  } catch (error) {
    installThrew = true;
    installError = errorMessage(error);
  }
  let screenError;
  if (!installThrew)
    await rescreenCachedPluginTree(absolute, storageV5).catch((error) => {
      screenError = errorMessage(error);
    });
  if (!(
    !installThrew &&
    (await realPathInsideCache(absolute)) === sourceReal &&
    (await hasNodeModulesDir(absolute)) &&
    (await cacheCopyDependencyGap(absolute).then(
      (gap) => gap === undefined,
      () => false,
    ))
  ))
    return {
      pluginId: result.pluginId,
      newVersion: result.newVersion,
      oldVersion: result.oldVersion,
      scope: result.scope,
      outcome: "failed",
      message: `Could not install the packages that "${pluginName}" lists for scope ${scopeLabel}, so parts of it may not work. Updating it again retries the install.${installError ? ` Cause: ${quotedPrintable(installError)}` : ""}`,
      failureCode: "dependencies_not_installed",
    };
  if (screenError !== undefined)
    return {
      pluginId: result.pluginId,
      newVersion: result.newVersion,
      oldVersion: result.oldVersion,
      scope: result.scope,
      outcome: "failed",
      message: `Installed the packages that "${pluginName}" lists for scope ${scopeLabel}, but could not finish checking them for links that lead outside the plugin. Cause: ${quotedPrintable(screenError)}`,
      failureCode: "dependencies_not_screened",
    };
  return {
    ...result,
    outcome: "updated",
    message: `Installed the packages that "${pluginName}" lists for scope ${scopeLabel}. Restart to apply changes. ${result.message}`,
  };
}
//@ chunk-md9fmgw9.js:105419-121897 layout
/**
 * 插件更新主体：刷新所属市场（可跳过）、按作用域找到安装记录，重新 cachePlugin + copyPluginToVersionedCache 得到新版本，比较版本后更新 installed_plugins 记录；command 来源需用户同意，背景模式下跳过。
 */
async function updatePluginOpInner(
  pluginId,
  scope,
  {
    skipMarketplaceRefresh = false,
    skipCommandSources = false,
    announceCommandSource,
    explicit = false,
    consentedEntryHelper,
    onEntryHelperDisclosure,
  },
  storageV5,
) {
  let isExplicit = explicit;
  pluginId = normalizePluginId(pluginId);
  let { name: pluginName, marketplace } = parsePluginId(pluginId);
  let refusal = pluginOperationRefusal(pluginId, marketplace, "update");
  if (refusal !== undefined)
    return {
      outcome: "failed",
      message: refusal,
      failureCode: unmanageablePluginReason(pluginId, marketplace),
    };
  let installedListRefusal = await getInstalledListRefusal(storageV5);
  if (installedListRefusal !== undefined)
    return {
      outcome: "failed",
      message: `Plugin "${quotedPrintable(pluginId)}" was not updated: ${readInstalledPluginsFile(installedListRefusal)}`,
      failureCode: "install_records_unreadable",
    };
  let marketplaceName = marketplace;
  let fullId = marketplaceName ? `${pluginName}@${marketplaceName}` : pluginId;
  let installed =
    isStorageV5Enabled() && storageV5 !== undefined
      ? await loadInstalledPlugins(storageV5)
      : loadInstalledPluginsSync();
  let pluginName_2 = findPluginName(Object.keys(installed.plugins), fullId);
  if (pluginName_2 === undefined && marketplaceName === undefined) {
    let filtered = pluginsNamed(Object.keys(installed.plugins), pluginName).filter(
      (name) => (installed.plugins[name]?.length ?? 0) > 0,
    );
    if (filtered.length > 1)
      return {
        outcome: "failed",
        message: `Plugin "${printableName(pluginName, 200)}" is installed from more than one marketplace. Include the marketplace name to pick one: ${filtered.map((name) => `\`claude plugin update ${printableName(name, 200)}\``).join(" or ")}`,
        scope,
        failureCode: "ambiguous_marketplace",
      };
    if (filtered.length === 0)
      return {
        outcome: "failed",
        message: `Plugin "${printableName(pluginName, 200)}" is not installed`,
        scope,
        failureCode: "not_installed",
      };
    pluginName_2 = filtered[0];
  }
  if (pluginName_2) {
    fullId = pluginName_2;
    ({ marketplace: marketplaceName } = parsePluginIdentifier(fullId));
  }
  let installs = pluginName_2 ? installed.plugins[pluginName_2] : undefined;
  let bindings = await seedBindingsFromInstall(fullId, installs);
  let bindingResult = undefined;
  if (bindingResult !== undefined && !bindingResult.ok)
    return {
      outcome: "failed",
      message: bindingResult.message,
      pluginId: fullId,
      scope,
      failureCode: "not_found",
    };
  let refreshWarning;
  let refreshRefusedByPolicy = false;
  let directoryError;
  let directoryNotChecked = false;
  if (isPluginBlockedByPolicy(fullId))
    return {
      outcome: "failed",
      message: `Plugin "${printableName(fullId, 200)}" is blocked by your organization's policy and was not updated`,
      pluginId: fullId,
      scope,
      failureCode: "plugin_policy_blocked",
    };
  if (marketplaceName === pluginManifestPathSchemas) {
    if (!npmMarketplaceEnabled())
      return {
        outcome: "failed",
        message: NPM_DIRECT_INSTALL_DISABLED_MESSAGE,
        pluginId: fullId,
        scope,
        failureCode: "npm_marketplace_disabled",
      };
    if (!installs || installs.length === 0)
      return {
        outcome: "failed",
        message: `Plugin "${pluginName}" is not installed`,
        pluginId: fullId,
        scope,
        failureCode: "not_installed",
      };
    return performPluginUpdate(
      fullId,
      pluginName,
      scope ?? pickUpdateScope(installs),
      installs,
      storageV5,
      explicit,
    );
  }
  if (marketplaceName) {
    let knownMarketplacesWithDeclared = await loadKnownMarketplacesWithDeclared(storageV5);
    let knownMarketplace = ownPropertyOrUndefined(knownMarketplacesWithDeclared, marketplaceName);
    let source = knownMarketplace?.source;
    if (source && isPluginDirectorySource(source) && (await getPluginDirectoryState()) === "blocked")
      return {
        outcome: "failed",
        message: directoryBlockedMessage(pluginName),
        pluginId: fullId,
        scope,
        failureCode: "marketplace_policy_blocked",
      };
    let usesDirectory =
      !source && marketplaceName === OFFICIAL_MARKETPLACE_NAME && isPluginDirectoryAvailable();
    if (
      isSourceDisallowedOrUnverifiable(
        usesDirectory
          ? {
              source: "pluginDirectory",
            }
          : source,
      )
    )
      return {
        outcome: "failed",
        message: `Plugin "${pluginName}" is from marketplace "${marketplaceName}", which is blocked by your organization's policy`,
        pluginId: fullId,
        scope,
        failureCode: "marketplace_policy_blocked",
      };
    if (
      knownMarketplace !== undefined &&
      isImpersonatingOfficialMarketplace(marketplaceName, knownMarketplace)
    )
      return {
        outcome: "failed",
        message: describeImpersonatingMarketplace(marketplaceName, knownMarketplace),
        pluginId: fullId,
        scope,
        failureCode: "not_found",
      };
    directoryNotChecked =
      !source && marketplaceName === OFFICIAL_MARKETPLACE_NAME && !isPluginDirectoryAvailable();
    if (
      !skipMarketplaceRefresh &&
      ((source &&
        (source.source === "github" ||
          source.source === "git" ||
          source.source === "url" ||
          source.source === "claudeai" ||
          source.source === "pluginDirectory")) ||
        (!source && marketplaceName === OFFICIAL_MARKETPLACE_NAME && isPluginDirectoryAvailable()))
    )
      try {
        await refreshMarketplaceDeduped(marketplaceName, storageV5, undefined, {
          skipIfRecent: true,
        });
      } catch (error) {
        refreshRefusedByPolicy = error instanceof CommandSourceError;
        refreshWarning = refreshRefusedByPolicy
          ? "marketplace not refreshed \u2014 your organization's managed settings forbid its headersHelper (the version shown is from the cached catalog; ask your admin)"
          : `marketplace not refreshed (${oneLineClipped(errorMessage(error))})`;
        if (error instanceof PluginDirectoryUnavailableError) directoryError = oneLineClipped(error.message);
        logForDebugging(
          `Failed to refresh marketplace '${marketplaceName}' before update; using cached data: ${errorMessage(error)}`,
          {
            level: "warn",
          },
        );
      }
  }
  let refreshState = {
    pluginName,
    refreshWarning,
    directoryRefreshFailed: marketplaceName === OFFICIAL_MARKETPLACE_NAME && !refreshRefusedByPolicy,
    directoryNotChecked,
  };
  let lookup =
    skipMarketplaceRefresh || directoryError !== undefined
      ? await getPluginByIdCacheOnly(fullId, storageV5)
      : await getPluginById(fullId, storageV5, "update");
  if (!lookup && !skipMarketplaceRefresh && marketplaceName === OFFICIAL_MARKETPLACE_NAME) {
    if (directoryError !== undefined)
      return {
        outcome: "failed",
        message: `Could not check "${quotedPrintable(pluginName)}" for updates. ${directoryError}`,
        pluginId: fullId,
        scope,
        failureCode: "directory_unavailable",
      };
    if (await isPluginDirectoryListingBlocked(pluginName, storageV5))
      return {
        outcome: "failed",
        message: `Plugin "${quotedPrintable(pluginName)}" is blocked by your organization's policy and was not updated`,
        pluginId: fullId,
        scope,
        failureCode: "plugin_policy_blocked",
      };
    let notInstallable = await pluginDirectoryNotInstallableMessage(pluginName);
    if (notInstallable !== undefined)
      return {
        outcome: "failed",
        message: `"${quotedPrintable(pluginName)}" was not updated: ${notInstallable}`,
        pluginId: fullId,
        scope,
        failureCode: "directory_listing_not_installable",
      };
  }
  if (!lookup)
    return {
      outcome: "failed",
      message: skipMarketplaceRefresh
        ? `Plugin "${pluginName}" is not in the locally cached marketplace catalog; it was not re-resolved.`
        : `Plugin "${pluginName}" not found`,
      pluginId: fullId,
      scope,
      failureCode: skipMarketplaceRefresh ? "not_cached" : "not_found",
    };
  let { entry } = lookup;
  let { marketplaceInstallLocation } = lookup;
  if (!installs || installs.length === 0)
    return {
      outcome: "failed",
      message: `Plugin "${pluginName}" is not installed`,
      pluginId: fullId,
      scope,
      failureCode: "not_installed",
    };
  if (scope === undefined) scope = pickUpdateScope(installs);
  let projectPathForScope = getProjectPathForScope(scope);
  let installations = installs.filter((install) => install.scope === scope);
  let installationForCurrentProject = findInstallationForCurrentProject(installations);
  if (!installationForCurrentProject && installations.length > 1)
    logForDebugging(
      `updatePluginOp: ${installations.length} ${scope}-scope installs, none match CWD '${projectPathForScope}'; updating '${installations[0]?.projectPath}' only`,
      {
        level: "warn",
      },
    );
  let install = installationForCurrentProject ?? installations[0];
  if (!install) {
    let scopeLabel = projectPathForScope ? `${scope} (${projectPathForScope})` : scope;
    return {
      outcome: "failed",
      message: `Plugin "${pluginName}" is not installed at scope ${scopeLabel}`,
      pluginId: fullId,
      scope,
      failureCode: "not_installed_at_scope",
    };
  }
  let projectPath = install.projectPath;
  let shownCommand;
  if (typeof entry.source === "object" && entry.source.source === "command") {
    let commandSourcesDisabled = areCommandPluginSourcesDisabledByPolicy();
    let commandSkipped = commandSourcesDisabled || skipCommandSources;
    let enabledByName = findPluginName(await checkEnabledPlugins(), fullId) !== undefined;
    let commandInactive = commandSourcesDisabled || (skipCommandSources && !enabledByName);
    let extra = scope === "user" ? undefined : `--scope ${scope}`;
    shownCommand = commandSkipped
      ? undefined
      : await announceCommandSource?.(fullId, entry, install.sourceCommand);
    let commandModeMatches =
      announceCommandSource !== undefined &&
      !isPluginsDirOnLocalDisk() &&
      install.sourceCommand === describeCommandOutputMode(entry.source);
    if (commandSkipped || (shownCommand === undefined && !commandModeMatches && !enabledByName))
      return {
        outcome: "failed",
        message:
          skipCommandSources && !commandInactive
            ? `${printableName(pluginName, 200)} is installed by running a command, which the background marketplace update never runs; it is left to the per-session re-resolve (when that is enabled) or an explicit update \u2014 ${runCommandHint(
                "plugin update",
                fullId,
                {
                  extra,
                  fallback: "a per-plugin update reviews it",
                },
              )}.`
            : commandSourcesDisabled
              ? commandPluginSourcesDisabledMessage()
              : `${printableName(pluginName, 200)} is disabled, so the command that installs it was not run. Enable it first, then ${runCommandHint(
                  "plugin update",
                  fullId,
                  {
                    extra,
                    fallback: "update it explicitly",
                  },
                )}.`,
        pluginId: fullId,
        scope,
        failureCode:
          skipCommandSources && !commandInactive ? "command_source_skipped" : "command_source_inactive",
      };
  }
  let fsImplementation = getFsImplementation();
  let version = install.version;
  let { enabled, disabled } = skipMarketplaceRefresh
    ? await loadAllPluginsCacheOnly(storageV5)
    : await loadAllPlugins(storageV5);
  let constraintsOn = collectConstraintsOn(fullId, [...enabled, ...disabled]);
  let filtered = constraintsOn.filter((constraint) => constraint.constraint.version !== undefined);
  let filtered_2 = constraintsOn
    .map((constraint) => constraint.constraint.version)
    .filter((range) => range !== undefined);
  let resolvedRange;
  let rangeNote = "";
  let knownMarketplacesWithDeclared = await loadKnownMarketplacesWithDeclared(storageV5);
  let source = knownMarketplacesWithDeclared[marketplaceName ?? ""]?.source;
  let finishUpToDate = (result) =>
    explicit && !isLinkModeCommandSource(entry.source) && !isLocalMarketplaceEntry(entry.source, source)
      ? annotateUpToDateResult(result, install, pluginName, storageV5)
      : Promise.resolve(result);
  if (filtered_2.length > 0) {
    let intersected = intersectVersionConstraints(filtered_2);
    if (!intersected.ok)
      return {
        outcome: "skipped",
        message: `Skipped \u2014 ${describeConstraintConflict("Plugin", fullId, filtered_2, intersected.reason)}`,
        pluginId: fullId,
        scope,
        blockedBy: filtered.map((constraint) => constraint.plugin.source),
        oldVersion: version,
        skipReason: "pinner_blocked",
      };
    let source = knownMarketplacesWithDeclared[marketplaceName ?? ""]?.source;
    let cloneUrl =
      getPluginCloneUrl(entry.source) ??
      (typeof entry.source === "string" ? getMarketplaceCloneUrl(source) : null);
    if (cloneUrl !== null && intersected.range !== "*" && !fullId.endsWith(`@${OFFICIAL_MARKETPLACE_NAME}`)) {
      let versionRange = await resolveVersionRange(cloneUrl, entry.name, intersected.range);
      if (versionRange === null)
        logForDebugging(
          `updatePluginOp(${fullId}): no ${entry.name}--v* tag satisfying ${intersected.range}; falling back to HEAD + post-fetch guard`,
        );
      else if (versionRange.version === install.resolvedVersion && versionRange.sha === install.gitCommitSha)
        return finishUpToDate({
          outcome: "up_to_date",
          message: appendRefreshWarning(
            refreshState,
            `${pluginName} is already at the latest version satisfying ${filtered_2.join(", ")} (${versionRange.version}, required by ${filtered.map((constraint) => constraint.plugin.name).join(", ")}).`,
          ),
          pluginId: fullId,
          newVersion: install.version,
          oldVersion: version,
          scope,
          refreshFailed: refreshWarning !== undefined ? true : undefined,
          refreshRefusedByPolicy: refreshRefusedByPolicy || undefined,
        });
      else {
        resolvedRange = versionRange;
        rangeNote = ` (highest tag satisfying ${filtered_2.join(", ")} from ${filtered.map((constraint) => constraint.plugin.name).join(", ")})`;
        if (typeof entry.source === "string") {
          let relativePluginSource = toRelativePluginSource(source, entry.source);
          if (relativePluginSource !== null)
            entry = {
              ...entry,
              source: relativePluginSource,
            };
        }
      }
    }
  }
  let pluginPath;
  let producerPath;
  let archiveSha256;
  let newVersion;
  let manifestVersion;
  let fetched = false;
  let gitCommitSha;
  let marketplaceCommit;
  let marketplaceDir;
  {
    let source = entry.source;
    let isClaudeAiSource = typeof source === "object" && source.source === "claudeai";
    let claudeaiPluginId = install.claudeaiPluginId;
    if (
      (claudeaiPluginId !== undefined && (!isClaudeAiSource || source.pluginId !== claudeaiPluginId)) ||
      (claudeaiPluginId === undefined && isClaudeAiSource)
    )
      return {
        outcome: "failed",
        message:
          claudeaiPluginId === undefined
            ? `${pluginName} is listed by a claude.ai-hosted marketplace but its install record no longer says which claude.ai plugin it came from \u2014 not updated. Uninstall and install it again to re-pin it.`
            : `${pluginName} was installed from a claude.ai-hosted marketplace, but "${marketplaceName}" now lists ${isClaudeAiSource ? "a different claude.ai plugin" : "another source"} under that name \u2014 not updated. Uninstall and install it again to switch to what the marketplace lists now, or remove it.`,
        pluginId: fullId,
        scope,
        failureCode: "claudeai_identity_changed",
      };
  }
  let isOfficial = fullId.endsWith(`@${OFFICIAL_MARKETPLACE_NAME}`);
  if (isOfficial && isUnboundOfficialPlugin(fullId, installs, bindings))
    return {
      outcome: "failed",
      message: `"${quotedPrintable(pluginName)}" was not updated: plugin-directory-bindings.json in the plugins folder could not be used (unreadable, a symbolic link or not a file, over 1 MB, damaged, or written by a newer Claude Code), so its ${OFFICIAL_MARKETPLACE_DISPLAY} listing could not be checked against the repository it was installed from. Nothing was changed. Try again; if this repeats, check the file for those causes.`,
      pluginId: fullId,
      scope,
      failureCode: "directory_binding_unreadable",
    };
  if (isOfficial && isDirectoryRepositoryChanged(fullId, installs, entry.source, bindings))
    return {
      outcome: "failed",
      message: `"${quotedPrintable(pluginName)}" was not updated: the ${OFFICIAL_MARKETPLACE_DISPLAY} now lists a different repository under that name. Uninstall it, then install the new listing if you want it.`,
      pluginId: fullId,
      scope,
      failureCode: "directory_identity_changed",
    };
  if (isOfficial && (samePluginSource(entry.source, undefined)?.length ?? 0) > MAX_REPOSITORY_KEY_CHARS)
    return {
      outcome: "failed",
      message: `"${quotedPrintable(pluginName)}" was not updated: the repository address in its ${OFFICIAL_MARKETPLACE_DISPLAY} listing is too long. Nothing was changed. Only a change to the listing can fix this.`,
      pluginId: fullId,
      scope,
      failureCode: "directory_listing_not_installable",
    };
  let boundByRecord = getBoundRepositoryKeys(fullId, installs, bindings).length > 0;
  let reviewCheck = verifyReviewedCommit({
    pluginId: fullId,
    pluginName,
    source: entry.source,
    boundByRecord,
    action: "updated",
  });
  if (!reviewCheck.ok)
    return {
      outcome: "failed",
      message: reviewCheck.message,
      pluginId: fullId,
      scope,
      failureCode: "directory_listing_not_installable",
    };
  if (typeof entry.source !== "string") {
    let source = entry.source;
    let sourceForFetch =
      resolvedRange &&
      (source.source === "github" || source.source === "url" || source.source === "git-subdir")
        ? {
            ...source,
            ref: resolvedRange.ref,
            sha: resolvedRange.sha,
          }
        : source;
    let source_2 = knownMarketplacesWithDeclared[marketplaceName ?? ""]?.source;
    let marketplaceId = marketplaceNameOfId(fullId);
    let trustedSettingsEntryAuth = findSettingsArchiveEntry(marketplaceId, entry.name);
    let helperNotRun =
      source.source === "archive"
        ? headersHelperNotRunReason({
            entry,
            archiveUrl: source.url,
            marketplaceSource: source_2,
            trustedSettingsEntryAuth,
          })
        : undefined;
    let helperConsentSubject =
      helperNotRun !== undefined && source.source === "archive"
        ? getEntryHelperConsentSubject(helperNotRun, source.url)
        : null;
    let helperRefusal =
      helperConsentSubject === null ? null : headersHelperPolicyRefusal(source_2, marketplaceName);
    let helperFailure =
      helperRefusal !== null
        ? {
            outcome: "failed",
            message: checkHeadersHelperConsent(entry.name, helperRefusal),
            pluginId: fullId,
            scope,
            failureCode: helperRefusalFailureCode(helperRefusal),
          }
        : null;
    if (isExplicit && helperFailure !== null) return helperFailure;
    let consentDiff =
      isExplicit && onEntryHelperDisclosure === undefined
        ? diffEntryHelperConsent(consentedEntryHelper, helperConsentSubject)
        : null;
    if (consentDiff !== null)
      return {
        outcome: "failed",
        message: describeHelperReview(consentDiff, entry.name, "update"),
        pluginId: fullId,
        scope,
        failureCode: HELPER_CONSENT_MISMATCH_CODES[consentDiff],
      };
    if (!isExplicit && helperConsentSubject !== null) {
      let listedVersion =
        entry.version ??
        (source.source === "archive" && source.sha256 !== undefined
          ? shortLowerPrefix(source.sha256)
          : undefined);
      if (listedVersion !== undefined && listedVersion === version)
        return {
          outcome: "up_to_date",
          message: upToDateMessage(refreshState, version),
          pluginId: fullId,
          newVersion: version,
          oldVersion: version,
          scope,
          refreshFailed: refreshWarning !== undefined ? true : undefined,
          refreshRefusedByPolicy: refreshRefusedByPolicy || undefined,
        };
      if (helperFailure !== null) return helperFailure;
      let updateCommand = claudeCommand("plugin update", fullId);
      return {
        outcome: "skipped",
        message:
          `Skipped \u2014 "${quotedPrintable(entry.name)}" fetches its archive through a headersHelper, which only runs when you update it yourself. Update it from /plugin` +
          (updateCommand ? ` (or \`${updateCommand}\`).` : "."),
        pluginId: fullId,
        scope,
        oldVersion: version,
        skipReason: "entry_helper_deferred",
      };
    }
    if (isExplicit && helperConsentSubject !== null) {
      if (onEntryHelperDisclosure !== undefined) {
        let disclosureAnswer = await onEntryHelperDisclosure(
          archiveHelperDisclosure(helperConsentSubject),
          helperConsentSubject,
          fullId,
        );
        if (disclosureAnswer !== "accepted")
          return {
            outcome: "failed",
            message: "Aborted \u2014 the headersHelper command was not confirmed, so it was not run.",
            pluginId: fullId,
            scope,
            failureCode:
              disclosureAnswer === "declined" ? "entry_helper_declined" : "entry_helper_unconfirmed",
          };
      }
    }
    if (
      source.source === "claudeai" &&
      resolvedRange === undefined &&
      source.version !== "" &&
      source.version === version
    )
      return finishUpToDate({
        outcome: "up_to_date",
        message: upToDateMessage(refreshState, version),
        pluginId: fullId,
        newVersion: version,
        oldVersion: version,
        scope,
        refreshFailed: refreshWarning !== undefined ? true : undefined,
        refreshRefusedByPolicy: refreshRefusedByPolicy || undefined,
      });
    let pinned = pinnedSha(fullId, entry.source);
    if (pinned !== undefined && (directoryNotChecked || install.gitCommitSha === pinned)) {
      let sameSource = samePluginSource(entry.source, undefined);
      if (
        !directoryNotChecked &&
        install.gitCommitSha === pinned &&
        install.directoryRepositoryKey === undefined &&
        sameSource !== undefined
      )
        try {
          await recordDirectoryRepositoryKey(fullId, scope, projectPath, sameSource, storageV5);
        } catch (error) {
          logForDebugging(`Could not record the repository of ${fullId}: ${errorMessage(error)}`, {
            level: "warn",
          });
        }
      return finishUpToDate({
        outcome: "up_to_date",
        message: upToDateMessage(refreshState, version),
        pluginId: fullId,
        newVersion: version,
        oldVersion: version,
        scope,
        refreshFailed: refreshWarning !== undefined ? true : undefined,
        refreshRefusedByPolicy: refreshRefusedByPolicy || undefined,
        ...(directoryNotChecked
          ? {
              notChecked: true,
            }
          : {
              noCloneShortCircuit: true,
            }),
      });
    }
    let cached = await cachePlugin(sourceForFetch, {
      manifest: {
        name: entry.name,
      },
      storageV5,
      isDirectoryPlugin: isOfficialDirectoryPlugin(fullId),
      directoryPin: pinnedSha(fullId, sourceForFetch) ?? null,
      archiveAuth: await resolveArchiveDownloadHeaders({
        pluginSource: sourceForFetch,
        pluginName: entry.name,
        marketplaceName,
        marketplaceSource: source_2,
        trustedMarketplaceAuth: findUrlMarketplaceHeaders(source_2, marketplaceId),
        trustedSettingsEntryAuth,
        entry,
        runEntryHelper: isExplicit,
      }),
      entryDeclaresComponents: entryDeclaresComponents(entry),
      declaredComponentPaths: entryDeclaredComponentPaths(entry),
      commandSourceConsent:
        shownCommand !== undefined
          ? {
              kind: "shown",
              command: shownCommand,
              pluginId: fullId,
            }
          : {
              kind: "recorded",
              command: isPluginsDirOnLocalDisk() ? undefined : install.sourceCommand,
              pluginId: fullId,
            },
    });
    pluginPath = cached.path;
    producerPath = cached.producerPath;
    archiveSha256 = cached.contentSha256;
    fetched = true;
    if (
      resolvedRange?.sha !== undefined ||
      cached.gitCommitSha !== undefined ||
      boundByRecord ||
      fullId.endsWith(`@${OFFICIAL_MARKETPLACE_NAME}`)
    )
      gitCommitSha = resolvedRange?.sha ?? cached.gitCommitSha;
    else if (getPluginCloneUrl(sourceForFetch) !== null) {
      let head = await probePluginGitHead(cached.path);
      gitCommitSha = head.repo ? (head.sha ?? undefined) : null;
    } else gitCommitSha = null;
    manifestVersion = cached.manifest?.version;
    let version_2 = await calculatePluginVersion(
      fullId,
      entry.source,
      cached.manifest,
      cached.path,
      {
        kind: "catalog",
        version: entry.version,
      },
      resolvedRange?.sha ?? cached.gitCommitSha,
      cached.contentSha256,
    );
    newVersion =
      resolvedRange && (cached.manifest?.version || entry.version)
        ? withShaSuffix(version_2, resolvedRange.sha)
        : version_2;
  } else {
    let seedDir = seedDirFor(marketplaceInstallLocation) !== undefined ? "system" : "workspace";
    let pluginEntryPath = await resolvePluginEntryPath(
      fullId,
      marketplaceInstallLocation,
      entry.source,
      knownMarketplacesWithDeclared,
      tryUnwrapTextPayload(),
      storageV5,
      seedDir,
    );
    if (pluginEntryPath.kind === "location-error") throw pluginEntryPath.error;
    if (pluginEntryPath.kind !== "ok") {
      let resolutionError = entryResolutionError(pluginEntryPath, marketplaceInstallLocation, entry.source);
      return {
        outcome: "failed",
        message: resolutionError.message,
        pluginId: fullId,
        scope,
        failureCode: resolutionError.code,
      };
    }
    marketplaceDir = pluginEntryPath.marketplaceDir;
    pluginPath = pluginEntryPath.entryPath;
    let knownMarketplace = knownMarketplacesWithDeclared[marketplaceName ?? ""];
    let isLocalMarketplace =
      knownMarketplace !== undefined && isLocalMarketplaceSource(knownMarketplace.source);
    try {
      if (isLocalMarketplace) await probeLocalMarketplacePath(storageV5, pluginPath, seedDir);
      else await fsImplementation.stat(pluginPath);
    } catch (error) {
      if (isENOENT(error))
        return {
          outcome: "failed",
          message: `Plugin source not found at ${printableOrEmpty(pluginPath)}`,
          pluginId: fullId,
          scope,
          failureCode: "source_missing",
        };
      throw error;
    }
    let manifest;
    try {
      manifest = (await loadPluginManifest(pluginPath, entry.name, entry.source)).manifest;
    } catch {}
    manifestVersion = manifest?.version;
    let head = await probePluginGitHead(pluginPath, marketplaceDir);
    if (!head.repo && marketplaceName === CLAUDE_PLUGINS_OFFICIAL)
      marketplaceCommit = await readMarketplaceCommit(pluginPath);
    gitCommitSha = head.repo
      ? (head.sha ?? undefined)
      : marketplaceCommit !== undefined
        ? commitShaOf(marketplaceCommit)
        : null;
    newVersion = await calculatePluginVersion(
      fullId,
      entry.source,
      manifest,
      pluginPath,
      {
        kind: "catalog",
        version: entry.version,
      },
      undefined,
      undefined,
      marketplaceDir,
    );
  }
  try {
    let reviewCheck = verifyReviewedCommit({
      pluginId: fullId,
      pluginName,
      source: entry.source,
      boundByRecord,
      fetched: {
        gitCommitSha: gitCommitSha ?? undefined,
      },
      action: "updated",
    });
    if (!reviewCheck.ok)
      return {
        outcome: "failed",
        message: reviewCheck.message,
        pluginId: fullId,
        scope,
        failureCode: "directory_commit_mismatch",
      };
    if (resolvedRange === undefined && filtered_2.length > 0) {
      let semver = semverModule.valid(manifestVersion) ?? semverModule.coerce(manifestVersion)?.version;
      let mapped = constraintsOn
        .filter(
          ({ constraint }) =>
            constraint.version !== undefined &&
            semver !== undefined &&
            !semverModule.satisfies(semver, constraint.version),
        )
        .map(({ plugin }) => plugin.source);
      if (mapped.length > 0)
        return {
          outcome: "skipped",
          message: `Skipped \u2014 ${mapped.join(", ")} requires ${pluginName} at a version range that ${manifestVersion ?? newVersion} does not satisfy`,
          pluginId: fullId,
          scope,
          blockedBy: mapped,
          oldVersion: version,
          skipReason: "pinner_blocked",
        };
    }
    if (
      newVersion === "unknown" &&
      version !== undefined &&
      version !== "unknown" &&
      (marketplaceCommit?.kind === "refused" || marketplaceCommit?.kind === "too-large")
    )
      return {
        outcome: "skipped",
        message:
          marketplaceCommit.kind === "refused"
            ? `Skipped \u2014 ${pluginName} stays at ${version}. Its new version comes from the official marketplace's .gcs-sha file, and that name is now a link, a folder or another special file, so it was not read.`
            : `Skipped \u2014 ${pluginName} stays at ${version}. Its new version comes from the official marketplace's .gcs-sha file, which is larger than 1 MB, so it was not read.`,
        pluginId: fullId,
        scope,
        oldVersion: version,
        skipReason: "snapshot_file_refused",
      };
    let installPath = getVersionedCachePath(fullId, newVersion);
    let unknownVersion = newVersion === "unknown";
    let versionedZipCachePath = getVersionedZipCachePath(fullId, newVersion);
    let reviewChanged =
      reviewCheck.reviewedCommit !== undefined && install.gitCommitSha !== reviewCheck.reviewedCommit;
    let alreadyCurrent =
      !unknownVersion &&
      !reviewChanged &&
      (install.version === newVersion ||
        install.installPath === installPath ||
        install.installPath === versionedZipCachePath);
    let cacheSuspect = false;
    if (alreadyCurrent && typeof entry.source === "object" && entry.source.source === "command") {
      let classified = classifyMarketplacePath(install.installPath, {
        trustedRoots: getMarketplaceCandidatePaths(
          fullId,
          knownMarketplacesWithDeclared,
          tryUnwrapTextPayload(),
        ),
      });
      let absolute = classified.absolute;
      cacheSuspect =
        classified.suspect ||
        !(await (isLinkModeCommandSource(entry.source)
          ? isLiveLinkFarm(absolute)
          : absolute.endsWith(".zip")
            ? pathExists(absolute)
            : cacheDirHasPluginContentStrict(absolute, storageV5))) ||
        (isLinkModeCommandSource(entry.source)
          ? await hasEntriesOutsideTarget(absolute, producerPath ?? install.sourceProducerPath)
          : await isLiveLinkFarm(absolute, {
              unclassifiableIsFarm: true,
            }));
    }
    if (alreadyCurrent && !cacheSuspect) {
      if (
        typeof entry.source === "object" &&
        entry.source.source === "command" &&
        (install.sourceCommand !== describeCommandOutputMode(entry.source) ||
          (producerPath !== undefined && install.sourceProducerPath !== producerPath))
      ) {
        await updateInstallationPathOnDisk(
          fullId,
          scope,
          projectPath,
          install.installPath,
          newVersion,
          install.gitCommitSha,
          install.resolvedVersion,
          {
            sourceCommand: describeCommandOutputMode(entry.source),
            sourceProducerPath: producerPath ?? install.sourceProducerPath,
          },
          storageV5,
        );
        emitProducerDirsChanged();
      }
      let isLocalEntry = isLocalMarketplaceEntry(entry.source, source);
      return finishUpToDate({
        outcome: "up_to_date",
        message: upToDateMessage(refreshState, newVersion),
        folderNote: isLocalEntry
          ? `${pluginName} is read from its folder, ${printableOrEmpty(pluginPath)}: nothing to update. Edits there take effect at the next session start or /reload-plugins.`
          : undefined,
        pluginId: fullId,
        newVersion,
        oldVersion: version,
        scope,
        refreshFailed: refreshWarning !== undefined ? true : undefined,
        refreshRefusedByPolicy: refreshRefusedByPolicy || undefined,
      });
    }
    installPath = await copyPluginToVersionedCache(pluginPath, fullId, newVersion, entry, marketplaceDir, {
      forceOverwrite: unknownVersion || reviewChanged,
      storageV5,
    });
    let installPath_2 = install.installPath;
    await updateInstallationPathOnDisk(
      fullId,
      scope,
      projectPath,
      installPath,
      newVersion,
      gitCommitSha,
      resolvedRange?.version,
      typeof entry.source === "object" && entry.source.source === "command"
        ? {
            sourceCommand: describeCommandOutputMode(entry.source),
            sourceProducerPath: producerPath ?? install.sourceProducerPath,
          }
        : undefined,
      storageV5,
      typeof entry.source === "object" && entry.source.source === "claudeai"
        ? {
            claudeaiPluginId: entry.source.pluginId,
            archiveSha256,
          }
        : undefined,
      isOfficial ? samePluginSource(entry.source, undefined) : undefined,
    );
    if (producerPath !== undefined) emitProducerDirsChanged();
    if (installPath_2 && installPath_2 !== installPath) {
      let installedNow =
        isStorageV5Enabled() && storageV5 !== undefined
          ? await loadInstalledPlugins(storageV5)
          : loadInstalledPluginsSync();
      if (
        !Object.values(installedNow.plugins).some((plugin) =>
          plugin.some((install) => install.installPath === installPath_2),
        )
      )
        await markPluginVersionOrphaned(installPath_2, storageV5);
    }
    let scopeLabel = projectPath ? `${scope} (${projectPath})` : scope;
    let pinned = pinnedSha(fullId, entry.source);
    let commitShown = pinned === undefined ? undefined : (gitCommitSha ?? pinned);
    let versionLabel = displayableGitHeadName(newVersion);
    let message = commitShown
      ? `Plugin "${pluginName}" updated to the listed commit ${commitShown.slice(0, 7)}${versionLabel ? ` (version ${versionLabel})` : ""} for scope ${scopeLabel}. Restart to apply changes.`
      : unknownVersion && (version ?? "unknown") === "unknown"
        ? `Plugin "${pluginName}" refreshed from source for scope ${scopeLabel}. Restart to apply changes.`
        : `Plugin "${pluginName}" updated from ${version || "unknown"} to ${newVersion}${rangeNote} for scope ${scopeLabel}. Restart to apply changes.`;
    return {
      outcome: "updated",
      message:
        refreshWarning === undefined
          ? message
          : refreshState.directoryRefreshFailed
            ? `${message} Warning: ${directoryUnreachableMessage()}.`
            : `${message} Warning: ${refreshWarning}.`,
      pluginId: fullId,
      newVersion,
      oldVersion: version,
      ...(gitCommitSha && {
        gitCommitSha,
      }),
      scope,
      refreshFailed: refreshWarning !== undefined ? true : undefined,
      refreshRefusedByPolicy: refreshRefusedByPolicy || undefined,
      pinChanged:
        typeof install.gitCommitSha === "string" &&
        typeof gitCommitSha === "string" &&
        install.gitCommitSha !== gitCommitSha,
    };
  } finally {
    let versionedCachePath = getVersionedCachePath(fullId, newVersion);
    if (
      fetched &&
      pluginPath !== versionedCachePath &&
      !resolve(versionedCachePath).startsWith(resolve(pluginPath) + sep)
    )
      await fsImplementation.rm(pluginPath, {
        recursive: true,
        force: true,
      });
  }
}
//@ chunk-md9fmgw9.js:121897-122022 fingerprint (2.1.88 match: VALID_UPDATE_SCOPES, 1)
/**
 * 按插件各条目的 scope 选出一个更新作用域：local < project < user，都没有则 managed。
 */
function pickUpdateScope(installations) {
  let projectInstallations = filterInstallationsForCurrentProject(installations);
  let candidates = projectInstallations.length > 0 ? projectInstallations : installations;
  return (
    ["local", "project", "user"].find((scope) =>
      candidates.some((installation) => installation.scope === scope),
    ) ?? "managed"
  );
}
//@ chunk-md9fmgw9.js:122022-124005 fingerprint (2.1.88 match: performPluginUpdate, 0.358)
/**
 * 执行一次插件更新并整理成 CLI 输出用的结果对象（不存在时报“not installed”）。
 */
async function performPluginUpdate(pluginId, pluginName, scope, installations, storageV5, explicit) {
  if (!installations || installations.length === 0)
    return {
      outcome: "failed",
      message: `Plugin "${pluginName}" is not installed`,
      pluginId,
      scope,
      failureCode: "not_installed",
    };
  let projectPathForScope = getProjectPathForScope(scope);
  let filtered = installations.filter((installation) => installation.scope === scope);
  let installation = installationAtTarget(filtered, scope, projectPathForScope) ?? filtered[0];
  if (!installation) {
    let scopeLabel = projectPathForScope ? `${scope} (${projectPathForScope})` : scope;
    return {
      outcome: "failed",
      message: `Plugin "${pluginName}" is not installed at scope ${scopeLabel}`,
      pluginId,
      scope,
      failureCode: "not_installed_at_scope",
    };
  }
  if (installation.scope === "managed")
    return {
      outcome: "failed",
      message: `Plugin "${pluginName}" is installed by managed settings and is not updated here`,
      pluginId,
      scope,
      failureCode: "not_installed_at_scope",
    };
  let { scope: scope_2, projectPath, version, npmVersionSpec } = installation;
  let recordResult = (result) =>
    explicit ? annotateUpToDateResult(result, installation, pluginName, storageV5) : Promise.resolve(result);
  let npmPluginSource = toNpmPluginSource({
    packageName: pluginName,
    versionSpec: npmVersionSpec,
  });
  let workDir = join(anchoredPluginCachePath(), `${makeTempCachePathName("npm")}${TEMP_CACHE_LINK_SUFFIX}`);
  let resolvedVersion;
  try {
    await getFsImplementation().mkdir(workDir);
    resolvedVersion = (
      await resolveNpmPackage(pluginName, npmVersionSpec, {
        workDir,
        registry: installation.npmRegistry,
      })
    ).version;
  } finally {
    await removeDirectoryTreeNoFollow(workDir).catch(() => {});
  }
  let trackingSuffix = npmVersionSpec !== undefined ? ` (tracking ${npmVersionSpec})` : "";
  if (
    resolvedVersion === version ||
    installation.installPath === getVersionedCachePath(pluginId, resolvedVersion)
  )
    return recordResult({
      outcome: "up_to_date",
      message: `${pluginName} is already at the latest version${trackingSuffix} (${resolvedVersion}).`,
      pluginId,
      newVersion: resolvedVersion,
      oldVersion: version,
      scope,
    });
  let source = toNpmPluginSource(
    {
      packageName: pluginName,
      versionSpec: resolvedVersion,
    },
    installation.npmRegistry,
  ).source;
  let cacheResult = await cachePlugin(source, {
    manifest: {
      name: npmPluginSource.name,
    },
    storageV5,
    isNpmMarketplaceLane: true,
    directoryPin: pinnedSha(pluginId, source) ?? null,
  });
  let npmResolution = cacheResult.npmResolution;
  let version_2 = npmResolution?.version ?? resolvedVersion;
  let versionedPath = getVersionedCachePath(pluginId, version_2);
  try {
    versionedPath = await copyPluginToVersionedCache(
      cacheResult.path,
      pluginId,
      version_2,
      npmPluginSource,
      undefined,
      {
        storageV5,
      },
    );
    await updateInstallationPathOnDisk(
      pluginId,
      scope_2,
      projectPath,
      versionedPath,
      version_2,
      null,
      undefined,
      undefined,
      storageV5,
      undefined,
      undefined,
      {
        npmVersionSpec,
        npmResolved: npmResolution?.tarballUrl ?? installation.npmResolved,
        npmIntegrity: npmResolution?.integrity,
        npmRegistry: installation.npmRegistry,
      },
    );
    let oldVersionPath = installation.installPath;
    if (oldVersionPath && oldVersionPath !== versionedPath) {
      let updatedDiskData =
        isStorageV5Enabled() && storageV5 !== undefined
          ? await loadInstalledPlugins(storageV5)
          : loadInstalledPluginsSync();
      if (
        !Object.values(updatedDiskData.plugins).some((pluginInstallations) =>
          pluginInstallations.some((inst) => inst.installPath === oldVersionPath),
        )
      )
        await markPluginVersionOrphaned(oldVersionPath, storageV5);
    }
  } finally {
    if (
      cacheResult.path !== versionedPath &&
      !resolve(versionedPath).startsWith(resolve(cacheResult.path) + sep)
    )
      await removeDirectoryTreeNoFollow(cacheResult.path).catch(() => {});
  }
  let scopeDesc = projectPath ? `${scope} (${projectPath})` : scope;
  return {
    outcome: "updated",
    message: `Plugin "${pluginName}" updated from ${version || "unknown"} to ${version_2}${trackingSuffix} for scope ${scopeDesc}. Restart to apply changes.`,
    pluginId,
    newVersion: version_2,
    oldVersion: version,
    scope,
  };
}
//@ chunk-md9fmgw9.js:124005-124453 placement
/**
 * 归档来源插件下载会运行 headersHelper 时的警告。
 */
async function archiveFetchWarning(pluginId, entry, storageV5) {
  let resolvedEntry = entry ?? (await getPluginByIdCacheOnly(pluginId, storageV5))?.entry;
  if (!resolvedEntry || typeof resolvedEntry.source !== "object" || resolvedEntry.source.source !== "archive")
    return null;
  if (isPluginBlockedByPolicy(pluginId)) return null;
  let knownMarketplaces = await loadKnownMarketplacesSafe(storageV5);
  let marketplaceName = marketplaceNameOfId(pluginId);
  if (
    marketplaceName !== undefined &&
    isSourceDisallowedOrUnverifiable(ownPropertyOrUndefined(knownMarketplaces, marketplaceName)?.source)
  )
    return null;
  let marketplaceSource = marketplaceSourceOfEntry(pluginId, knownMarketplaces);
  let consentSubject;
  try {
    consentSubject = headersHelperNotRunReason({
      entry: resolvedEntry,
      archiveUrl: resolvedEntry.source.url,
      marketplaceSource,
      trustedSettingsEntryAuth: findSettingsArchiveEntry(marketplaceName, resolvedEntry.name),
    });
  } catch (error) {
    if (error instanceof EntryHelperError) return null;
    throw error;
  }
  if (isHeadersHelperDisabledByPolicy(marketplaceSource, marketplaceName)) return null;
  return getEntryHelperConsentSubject(consentSubject, resolvedEntry.source.url);
}
//@ chunk-md9fmgw9.js:124453-124704 placement
/**
 * 生成插件归档获取命令的披露文本：会把 helper 生成的请求头发到哪个地址、隐藏字符警告与实际运行的本地命令。
 */
function archiveHelperDisclosure(entry) {
  let details = describeArchiveFetchCommand(entry);
  return (
    `Fetching this plugin's archive sends helper-minted headers to ${details.destination}; ` +
    (details.hiddenCharactersWarning ? `WARNING: ${details.hiddenCharactersWarning} ` : "") +
    `the local command it runs (headersHelper) is: ${details.command}`
  );
}
//@ chunk-md9fmgw9.js:124704-124931 placement
function recordedSourceCommand(pluginId, source, installationsOf) {
  let spec = commandSourceSpecOf(source);
  if (!spec || !installationsOf || installationsOf.length === 0 || isPluginsDirOnLocalDisk()) return;
  let outputMode = describeCommandOutputMode(spec);
  return {
    kind: "recorded",
    command:
      installationsOf.find((installation) => installation.sourceCommand === outputMode)?.sourceCommand ??
      installationsOf.find((installation) => installation.sourceCommand !== undefined)?.sourceCommand,
    pluginId,
  };
}
//@ chunk-md9fmgw9.js:124931-125703 placement
/**
 * 在已知市场中自动安装缺失的插件。
 */
async function autoInstallFromMarketplace(
  listing,
  knownMarketplacesWithDeclared,
  storageV5,
  onDirectoryError,
) {
  let source = knownMarketplacesWithDeclared[listing.marketplace]?.source;
  if (!source || isPluginDirectorySource(source)) return;
  if (!isOfficialMarketplaceName_3(listing.marketplace)) return;
  let plugins = (
    isStorageV5Enabled() && storageV5 !== undefined
      ? await loadInstalledPlugins(storageV5)
      : loadInstalledPluginsSync()
  ).plugins;
  if (plugins[`${listing.entry.name}@${listing.marketplace}`]?.length) return;
  let sameSource = samePluginSource(listing.entry.source, sourceUrlAndRef(source));
  if (sameSource === undefined) return;
  for (let [key, value] of Object.entries(knownMarketplacesWithDeclared)) {
    if (!isPluginDirectorySource(value.source) || !isSourceAllowedByPolicy(value.source)) continue;
    if (
      isOfficialFamilySameSource(listing.marketplace, listing.entry) &&
      !plugins[`${listing.entry.name}@${key}`]?.length
    )
      continue;
    try {
      let found = (await getMarketplace(key, storageV5, "install")).plugins.find(
        (plugin) => plugin.name === listing.entry.name,
      );
      if (
        found &&
        isReviewerMarkedEntry(found.name) &&
        samePluginSource(found.source, undefined) === sameSource
      )
        return {
          entry: found,
          marketplace: key,
          marketplaceInstallLocation: value.installLocation,
        };
    } catch (error) {
      if (error instanceof PluginDirectoryUnavailableError) onDirectoryError?.(error);
      logForDebugging(
        `Bare-name search for "${listing.entry.name}": the ${OFFICIAL_MARKETPLACE_DISPLAY} could not be read, keeping ${listing.marketplace}'s listing: ${errorMessage(error)}`,
      );
    }
  }
  return;
}
//@ chunk-md9fmgw9.js:125703-126224 placement
/**
 * 按名字在所有市场中搜索插件。
 */
async function findPluginInMarketplaces(pluginName, storageV5, onDirectoryError) {
  let knownMarketplacesWithDeclared = await loadKnownMarketplacesWithDeclared(storageV5);
  let firstError;
  for (let [key, value] of Object.entries(knownMarketplacesWithDeclared)) {
    if (!isSourceAllowedByPolicy(value.source)) continue;
    try {
      let found = (await getMarketplace(key, storageV5, "install")).plugins.find(
        (plugin) => plugin.name === pluginName,
      );
      if (found) {
        let localFound = {
          entry: found,
          marketplace: key,
          marketplaceInstallLocation: value.installLocation,
        };
        {
          let preferred = await autoInstallFromMarketplace(
            localFound,
            knownMarketplacesWithDeclared,
            storageV5,
            onDirectoryError,
          );
          return preferred
            ? {
                ...preferred,
                preferredOver: localFound,
              }
            : localFound;
        }
        return localFound;
      }
    } catch (error) {
      if (error instanceof CommandSourceError) {
        firstError ??= error;
        continue;
      }
      if (error instanceof PluginDirectoryUnavailableError) onDirectoryError?.(error);
      logForDebugging(
        `Failed to load marketplace "${key}" while searching for plugin "${pluginName}": ${errorMessage(error)}`,
        {
          level: "error",
        },
      );
    }
  }
  if (firstError !== undefined) throw firstError;
  return;
}
//@ chunk-md9fmgw9.js:126224-126281 placement
/**
 * 判断目标目录之外是否还有条目。
 */
async function hasEntriesOutsideTarget(absolute, oldInstallPath) {
  return oldInstallPath === undefined || (await hasEntriesOutsideTarget_2(absolute, oldInstallPath));
}
//@ chunk-md9fmgw9.js:126281-126341 placement
/**
 * 在指定作用域的启用插件里查找条目。
 */
function findPluginInSource(scope, pluginId, pluginName) {
  return findPluginEntry(
    getSettingsForSourceForUpkeep(scopeToSettingSource(scope))?.enabledPlugins,
    pluginId,
    pluginName,
  );
}
//@ chunk-md9fmgw9.js:126341-126440 placement
/**
 * 按来源缓存分组后的启用插件。
 */
function groupedEnabledPlugins() {
  let cache = new Map();
  return (enabledPlugins) => {
    let grouped = cache.get(enabledPlugins);
    if (grouped === undefined) {
      grouped = groupEnabledPlugins(enabledPlugins);
      cache.set(enabledPlugins, grouped);
    }
    return grouped;
  };
}
//@ chunk-md9fmgw9.js:126440-126578 placement
function findPluginEntry(enabledPlugins, pluginId, groupPlugins) {
  if (!enabledPlugins) return;
  let key = isOfficialPluginId(pluginId)
    ? groupPlugins(enabledPlugins).byFold.get(nfcLower(pluginId))?.key
    : findPluginName(Object.keys(enabledPlugins), pluginId);
  return key === undefined
    ? undefined
    : {
        key,
        value: enabledPlugins[key],
      };
}
//@ chunk-md9fmgw9.js:126578-127059 placement
/**
 * 按作用域查找插件安装记录。
 */
function locatePluginInstall(pluginId, requestedScope, groupPlugins) {
  let found;
  for (let scope of sorted) {
    let pluginInSource = findPluginInSource(scope, pluginId, groupPlugins);
    if (pluginInSource !== undefined) {
      found = {
        scope,
        ...pluginInSource,
      };
      break;
    }
  }
  let records = pluginSettingRecords(pluginId);
  let pluginSetting = findPluginSetting(
    pluginId,
    records.map(({ record }) => (record === undefined ? undefined : groupPlugins(record))),
  );
  let source = pluginSetting === undefined ? undefined : records[pluginSetting.index]?.source;
  return {
    found,
    atRequested:
      requestedScope === undefined ? undefined : findPluginInSource(requestedScope, pluginId, groupPlugins),
    override:
      pluginSetting !== undefined && (source === "policySettings" || source === "flagSettings")
        ? {
            source,
            enabling: pluginSetting.enabled,
            key: pluginSetting.key,
          }
        : undefined,
    decidingScope:
      source === "localSettings" || source === "projectSettings" || source === "userSettings"
        ? SETTING_SOURCE_TO_SCOPE[source]
        : undefined,
    effective: pluginSetting?.enabled,
  };
}
//@ chunk-md9fmgw9.js:127059-127100 placement
var sorted; // deferred: uses MANAGED_PLUGIN_DISABLE_MESSAGE of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-md9fmgw9.js:127059", () => {
  sorted = [...VALID_INSTALLABLE_SCOPES].sort(
    (left, right) => SCOPE_PRECEDENCE[right] - SCOPE_PRECEDENCE[left],
  );
});
//@ chunk-md9fmgw9.js:127100-127918 placement
/**
 * 插件被组织或策略阻止时的结果。
 */
function pluginBlockedResult(pluginId, enabled, lockSource, legacyKey) {
  let legacyNote = pluginNamesEqual(legacyKey, pluginId)
    ? ""
    : ` via its legacy "${stripInvisibleKeepEmoji(legacyKey)}" entry`;
  let legacyHint = legacyNote ? ` (remove that entry, or add "${pluginId}": true beside it)` : "";
  if (lockSource === "policySettings")
    return {
      success: false,
      message: enabled
        ? `Plugin "${pluginId}" is blocked by your organization's policy${legacyNote} and cannot be enabled here \u2014 ask an admin${legacyHint}`
        : `Plugin "${pluginId}" is turned on by your organization's managed settings and cannot be disabled here`,
      failureCode: enabled ? "plugin_policy_blocked" : "managed_settings_override",
    };
  return {
    success: false,
    message: enabled
      ? `Plugin "${pluginId}" is turned off by this session's --settings flag${legacyNote}, which overrides your settings files. Change it in --settings to enable it${legacyHint}.`
      : `Plugin "${pluginId}" is turned on by this session's --settings flag, which overrides your settings files. Remove it from --settings to disable it.`,
    failureCode: "settings_flag_override",
  };
}
//@ chunk-md9fmgw9.js:127918-128115 placement (2.1.88 match: getEnabledSettingSources, 0.861)
function getPluginEnablementLockingSource(pluginId, desiredEnabled) {
  let result = new Set(getEnabledSettingSources());
  for (let source of ["policySettings", "flagSettings"]) {
    if (!result.has(source)) continue;
    let value = lookupByPluginAliases(getSettingsForSource(source)?.enabledPlugins, pluginId);
    if (value === undefined) continue;
    return (value === true) === desiredEnabled ? undefined : source;
  }
  return;
}
//@ chunk-md9fmgw9.js:128115-128409 placement (2.1.88 match: loadAllPermissionRulesFromDisk, 0.344)
/**
 * 插件启用的锁定来源：仅策略启用的插件返回 policySettings；否则看覆盖来源是否为 flagSettings 等（属插件启用管理，误归入 permissionsLoader）。
 */
function getPluginEnablingSource(pluginId, groupPlugins) {
  let normalizedId = normalizePluginId(pluginId);
  let canonicalId = canonicalPluginId(normalizedId);
  if (
    isBuiltinPluginId(canonicalId) &&
    getBuiltinPlugin(parsePluginIdentifier(canonicalId).name)?.enabledFromPolicyOnly
  )
    return getBuiltinPlugins().enabled.some((builtin) => builtin.source === canonicalId)
      ? "policySettings"
      : undefined;
  let marketplace = marketplaceSuffix(normalizedId);
  if (!isOfficialMarketplace(marketplace)) return getPluginEnablementLockingSource(normalizedId, false);
  let { override } = locatePluginInstall(normalizedId, undefined, groupPlugins);
  return override?.enabling && (override.source === "flagSettings" || marketplace === SYNCED)
    ? override.source
    : undefined;
}
//@ chunk-md9fmgw9.js:128409-128468 placement (2.1.88 match: _temp7, 1)
/**
 * 是否由托管策略启用（不能禁用/卸载）。
 */
function isManagedDisabled(pluginId, isDisabledBySync, groupPlugins) {
  return isDisabledBySync(pluginId) || getPluginEnablingSource(pluginId, groupPlugins) === "policySettings";
}
//@ chunk-md9fmgw9.js:128468-128593 placement
/**
 * 插件由托管策略设置启用时返回拒绝结果（不能禁用或卸载）。
 */
function managedPluginRefusal(pluginId) {
  return getPluginEnablingSource(pluginId, groupedEnabledPlugins()) === "policySettings"
    ? {
        success: false,
        message: MANAGED_PLUGIN_DISABLE_MESSAGE,
        failureCode: "managed_settings_override",
      }
    : undefined;
}
//@ chunk-md9fmgw9.js:128593-128703 placement
/**
 * 插件由 --settings 启用时返回附注："本会话仍启用"。
 */
function flagSettingsEnabledNote(pluginId) {
  return getPluginEnablingSource(pluginId, groupedEnabledPlugins()) === "flagSettings"
    ? " (still enabled this session: --settings keeps it on)"
    : "";
}
//@ chunk-md9fmgw9.js:128703-128828 placement
function matchingEnabledKeys(enabledPlugins, pluginId) {
  let keys = Object.keys(enabledPlugins ?? {});
  if (!isOfficialPluginId(pluginId)) return keys.filter((key) => key === pluginId);
  let lowerId = nfcLower(pluginId);
  return keys.filter((key) => nfcLower(key) === lowerId);
}
//@ chunk-md9fmgw9.js:128828-129210 placement
/**
 * 写入 enabledPlugins（替换遗留键）。
 */
function writeEnabledPlugins(source, pluginId, enabled, extraRecords, storageV5) {
  return updateSettingsForSourceWithTransform(
    source,
    (settings) => {
      let merged = Object.fromEntries(
        Object.entries({
          ...extraRecords,
          [pluginId]: enabled,
        }).flatMap(([key, value]) => {
          let target = pluginSettingWriteTarget(settings?.enabledPlugins, key);
          return [...target.replaced.map((replacedKey) => [replacedKey, undefined]), [target.written, value]];
        }),
      );
      return {
        enabledPlugins: {
          ...settings?.enabledPlugins,
          ...Object.fromEntries(
            Object.keys(merged).flatMap((key) =>
              matchingEnabledKeys(settings?.enabledPlugins, key)
                .filter((existingKey) => existingKey !== key)
                .map((existingKey) => [existingKey, undefined]),
            ),
          ),
          ...merged,
        },
      };
    },
    undefined,
    storageV5,
  );
}
//@ chunk-md9fmgw9.js:129210-129270 placement
/**
 * 取某作用域下所有插件的记录。
 */
function pluginRecordsFor(source, pluginId) {
  return enabledPluginsBySource(source, pluginId, undefined).map(({ record }) => record);
}
//@ chunk-md9fmgw9.js:129270-129448 placement
function enabledPluginsBySource(overriddenSource, pluginId, overrideValue) {
  return SETTING_SOURCES_DESC.map((source) => {
    let enabledPlugins = getSettingsForSourceForUpkeep(source)?.enabledPlugins;
    if (source !== overriddenSource)
      return {
        source,
        record: enabledPlugins,
      };
    let filteredRecord = omitAlias(enabledPlugins ?? {}, matchingEnabledKeys(enabledPlugins, pluginId));
    return {
      source,
      record:
        overrideValue === undefined
          ? filteredRecord
          : {
              ...filteredRecord,
              [pluginId]: overrideValue,
            },
    };
  });
}
//@ chunk-md9fmgw9.js:129448-129473 placement
var SETTING_SOURCES_DESC; // deferred: uses SETTING_SOURCES (../../utils/settings/constants.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-md9fmgw9.js:129448", () => {
  SETTING_SOURCES_DESC = [...SETTING_SOURCES].reverse();
});
export {
  installPluginOp,
  updatePluginOp,
  countByPluginKey,
  resolveDelistedPluginId,
  isPluginEnabledAtProjectScope,
  VALID_INSTALLABLE_SCOPES,
  logInstallRefreshFirst,
  replaceNeedsFullIdMessage,
  enablePluginOp,
  VALID_UPDATE_SCOPES,
  formatOperationFailure,
  findPluginInMarketplaces,
  hasOnlyMissingDependencyIssues,
  archiveFetchWarning,
  archiveHelperDisclosure,
  refreshBeforeScopedInstall,
  getProjectPathForScope,
  isPluginInSettings,
  uninstallPluginOp,
  disablePluginOp,
  listRequiredPlugins,
  isSadFailureCode,
  refreshMarketplaceOnCatalogMiss,
  displayPluginId,
  findPluginInSettings_2,
  getReplaceUnavailableReason,
  describeReplaceUnavailable,
  isPluginEffectivelyEnabled,
  getPluginInstallationFromV2,
  isInstallableScope,
  MANAGED_PLUGIN_DISABLE_MESSAGE,
  requiredPluginMessage,
  managedPluginRefusal,
  flagSettingsEnabledNote,
  describeKeptDataDir,
};
