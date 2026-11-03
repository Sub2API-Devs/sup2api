/**
 * services/plugins/pluginOperations.ts
 *
 * 并入已有模块：插件被组织或策略阻止时的结果；--plugin-dir 等无法安装/更新/卸载的插件说明等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/plugins/pluginOperations.ts
 * pieces: chunk-1qpz7qcd.js (1), chunk-csq9ftr9.js (1), chunk-e6aww6q8.js (1), chunk-pp50kewz.js (114)
 * attribution: fingerprint 10, callgraph-fingerprint 3, placement 38, file-local 2, layout 63, callgraph-witnessed 1
 */
import { join, dirname, relative, resolve, sep } from "path";
import { Re } from "../../../runtime/bun-runtime.js";
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
import { logForDebugging } from "../../utils/debug.js";
import {
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  isENOENT,
  WireSafeControlError,
  isAbortError,
} from "../../utils/errors.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../analytics/featureTelemetry.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { isLocalMarketplaceSource } from "../../utils/plugins/reconciler.js";
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
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import {
  loadInstalledPlugins,
  loadInstalledPluginsSync,
  getInstalledPlugins,
  listInstalledPluginIds,
  hasFailedInstalledPluginsRead,
  hasInstallationForCurrentProject,
  getInstalledListRefusal,
  readInstalledPluginsFile,
  clearAutoInstalledFlag,
  formatInvalidPluginIdMessage,
  isInstallationRelevantToCurrentProject,
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
import {
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
  parsePluginIdentifier_2,
} from "../../utils/plugins/pluginIdentifier.js";
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
import {
  INLINE_PLUGIN_MARKETPLACE,
  SYNCED,
  SKILLS_DIR,
  BUILTIN,
  removePluginUsage,
  seedPluginUsage,
  touchPluginUsage,
  pluginIdHash,
} from "../../utils/telemetry/pluginTelemetry.js";
import { tildify } from "../../utils/path.js";
import { getClaudeConfigDir } from "../../utils/envUtils.js";
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
  MAX_BINDINGS_FILE_BYTES,
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
import { uniq, count } from "../../utils/collections.js";
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
import { getPluginAttribution } from "../../utils/plugins/pluginAttribution.js";
import { getFsImplementation } from "../../utils/fsOperations.js";
import { CLAUDE_PLUGINS_OFFICIAL } from "../../utils/plugins/officialMarketplace.js";
import { emitProducerDirsChanged } from "../../utils/plugins/pluginCachePaths.js";
import { describeArchiveFetchCommand } from "../../components/ManagedSettingsSecurityDialog/utils.js";
import { isReviewerMarkedEntry } from "../../utils/plugins/commandSourceErrors.js";
import { Uo } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { sanitizeTelemetryString } from "../../utils/sanitization.js";
import { hashEntries } from "../../utils/model/modelCatalog/maskedIds.js";

//@ chunk-pp50kewz.js:2631-2649 placement
/**
 * 懒加载的 semver 模块。
 */
var semverModule = Re(require_semver_3(), 1);
//@ chunk-pp50kewz.js:2731-3129 placement
/**
 * 安装时插件不在目录中则刷新一次市场（失败时用缓存）。
 */
async function refreshMarketplaceOnCatalogMiss(e, n, storageV5) {
  if (shouldSkipPluginAutoupdate()) return "ineligible";
  if (!n?.source || !isSourceAllowedByPolicy(n.source)) return "ineligible";
  if (!isMarketplaceAutoUpdate(e, n, getMarketplaceAutoUpdate(e, getDeclaredMarketplaces())))
    return "ineligible";
  try {
    await refreshMarketplaceDeduped(e, storageV5, undefined, {
      skipIfRecent: true,
      directoryTrigger: "install",
    });
    getPluginRegistry().marketplaces.delete(e);
    return "refreshed";
  } catch (error) {
    logForDebugging(
      `Failed to refresh marketplace '${e}' on catalog miss; using cached data: ${errorMessage(error)}`,
      {
        level: "warn",
      },
    );
    return "refresh-failed";
  }
}
//@ chunk-pp50kewz.js:3129-3330 placement
/**
 * 记录"安装前先刷新市场"的特性状态：已刷新、刷新失败或不适用。
 */
function logInstallRefreshFirst(outcome) {
  if (outcome === "refreshed") logFeatureOk("plugin_install_refresh_first");
  else if (outcome === "refresh-failed") logFeatureBad("plugin_install_refresh_first", "refresh_failed");
  else logFeatureSad("plugin_install_refresh_first", "ineligible");
}
//@ chunk-pp50kewz.js:3330-4013 placement
/**
 * 按作用域安装前刷新 github 来源的市场。
 */
async function refreshBeforeScopedInstall(e, n, storageV5) {
  if (isEssentialTrafficOnly())
    return {
      outcome: "ineligible",
    };
  if (!n?.source || !isSourceAllowedByPolicy(n.source))
    return {
      outcome: "ineligible",
    };
  if (n.installLocation && seedDirFor(n.installLocation))
    return {
      outcome: "ineligible",
    };
  let source = n.source.source;
  if (
    source !== "github" &&
    source !== "git" &&
    source !== "url" &&
    source !== "claudeai" &&
    source !== "pluginDirectory"
  ) {
    if (isLocalMarketplaceSource(n.source) || source === "settings")
      getPluginRegistry().marketplaces.delete(e);
    return {
      outcome: "ineligible",
    };
  }
  try {
    await refreshMarketplaceDeduped(e, storageV5, undefined, {
      skipIfRecent: true,
      directoryTrigger: "install",
    });
    getPluginRegistry().marketplaces.delete(e);
    return {
      outcome: "refreshed",
    };
  } catch (error) {
    logForDebugging(
      `Failed to refresh marketplace '${e}' before scoped install; using cached data: ${errorMessage(error)}`,
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
//@ chunk-pp50kewz.js:4013-4187 placement
async function installedAndAvailableVersions(e) {
  let n = await installedVersionAtScope(e);
  let i = await getAvailablePluginVersion(e).catch(() => Jn);
  return {
    installedVersion: cleanVersion(n),
    availableVersion: cleanVersion(i.availableVersion),
    loadsInPlaceFrom: i.loadsInPlaceFrom,
  };
}
//@ chunk-pp50kewz.js:4187-4838 placement
/**
 * 描述插件可更新版本与更新命令。
 */
function describeUpdateAvailability(e, scope, marketplace) {
  let a = claudeCommand("plugin update", e, scope === "user" ? undefined : `--scope ${scope}`);
  let o =
    marketplace.availableVersion !== undefined &&
    marketplace.installedVersion !== undefined &&
    marketplace.availableVersion !== marketplace.installedVersion;
  let u = quotedPrintable(marketplace.installedVersion, MAX_VERSION_CHARS);
  let h = quotedPrintable(marketplace.availableVersion, MAX_VERSION_CHARS);
  let p = `${u} to ${h}`;
  if (marketplace.loadsInPlaceFrom !== undefined) {
    let j = printableOrEmpty(marketplace.loadsInPlaceFrom);
    let I = o && a !== null ? `; \`${a}\` re-records its version, ${p}` : "";
    return ` \u2014 it loads in place from ${j}, so edits there take effect at the next session start or /reload-plugins${I}`;
  }
  if (!o) return "";
  let c = a !== null ? `run \`${a}\` to get it` : "update it from /plugin";
  return `${` \u2014 the marketplace now offers ${h}`} (installed: ${u}); ${c}`;
}
//@ chunk-pp50kewz.js:4838-4869 placement
/**
 * 版本号展示的最大字符数（64）。
 */
var MAX_VERSION_CHARS = 64;
var Jn = Object.freeze({});
//@ chunk-pp50kewz.js:4869-5087 placement
async function installedVersionAtScope({ pluginId, scope, projectPath, storageV5 }) {
  let u =
    isStorageV5Enabled() && storageV5 !== undefined
      ? await loadInstalledPlugins(storageV5)
      : loadInstalledPluginsSync();
  let pluginName = findPluginName(Object.keys(u.plugins), pluginId);
  let filtered = (u.plugins[pluginName ?? pluginId] ?? []).filter((c) => c.scope === scope);
  return (installationAtTarget(filtered, scope, projectPath) ?? filtered[0])?.version;
}
//@ chunk-pp50kewz.js:5087-5704 placement
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
  if (marketplaceInstallLocation === undefined) return Jn;
  let knownMarketplacesWithDeclared = await loadKnownMarketplacesWithDeclared(storageV5);
  let p = seedDirFor(marketplaceInstallLocation) !== undefined ? "system" : "workspace";
  let pluginEntryPath = await resolvePluginEntryPath(
    pluginId,
    marketplaceInstallLocation,
    entry.source,
    knownMarketplacesWithDeclared,
    tryUnwrapTextPayload(),
    storageV5,
    p,
  );
  if (pluginEntryPath.kind !== "ok") return Jn;
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
  let y = isLocalMarketplaceEntry(entry.source, knownMarketplacesWithDeclared[marketplaceName]?.source);
  return {
    availableVersion: pluginVersion !== "unknown" ? pluginVersion : undefined,
    loadsInPlaceFrom: y ? pluginEntryPath.entryPath : undefined,
  };
}
//@ chunk-pp50kewz.js:5704-5827 placement
function claudeAiSourceVersion(entry) {
  let { source } = entry;
  if (!(typeof source !== "string" && source.source === "claudeai")) return;
  return entry.version || source.version || undefined;
}
//@ chunk-pp50kewz.js:5827-5873 placement
/**
 * 清洗版本号（去掉不可见字符但保留 emoji）。
 */
function cleanVersion(e) {
  return e === undefined ? undefined : stripInvisibleKeepEmoji(e);
}
//@ chunk-pp50kewz.js:5873-6648 placement
/**
 * --plugin-dir 等无法安装/更新/卸载的插件说明。
 */
function unmanageablePluginMessage(e, n) {
  let i = {
    install: "installed",
    update: "updated",
    uninstall: "uninstalled",
  }[n];
  switch (e) {
    case INLINE_PLUGIN_MARKETPLACE:
      return `This plugin is loaded via --plugin-dir for this session with no marketplace backing \u2014 it cannot be ${i}. Drop the --plugin-dir flag to stop loading it, or \`claude plugin disable\` to turn it off.`;
    case SYNCED:
      return `This plugin is synced from your claude.ai account with no marketplace backing \u2014 it cannot be ${i} here. Manage it on claude.ai, or \`claude plugin disable\` to turn it off on this machine.`;
    case SKILLS_DIR:
      return `This plugin is loaded from ${tildify(join(getClaudeConfigDir(), "skills"))}/ with no marketplace backing \u2014 it cannot be ${i}. Delete the directory to remove it; \`claude plugin disable\` to turn it off; edits there take effect after /reload-plugins.`;
  }
}
//@ chunk-pp50kewz.js:6648-6968 placement
/**
 * 插件操作被拒原因（内置插件、托管插件等）。
 */
function pluginOperationRefusal(pluginId, n, i) {
  if (isOfficialMarketplace(n)) return unmanageablePluginMessage(n, i);
  if (n !== undefined && isUnavailablePackageMarketplace(n)) return formatPackageMarketplaceUnavailable(n);
  if (isBuiltinPluginId(pluginId) && getBuiltinPlugin(parsePluginIdentifier(pluginId).name) !== undefined)
    return `This is a built-in plugin \u2014 built-in plugins cannot be installed, updated or uninstalled. ${managedPluginRefusal(pluginId)?.message ?? "Use `claude plugin enable` / `claude plugin disable` to turn it on or off."}`;
  return;
}
//@ chunk-pp50kewz.js:6968-7071 placement
function unmanageablePluginReason(pluginId, n) {
  if (isUnavailablePackageMarketplace(n)) return "marketplace_not_available";
  return isBuiltinPluginId(pluginId) ? "builtin" : "directory_loaded";
}
//@ chunk-pp50kewz.js:7071-7172 placement
function lockedDependentName(e, n) {
  let { name: i } = parsePluginId(e);
  let a = matchPolicyPluginEntry(getPolicyEnabledPluginEntries(), i, n);
  return a.outcome === "locked" ? a.entry.name : undefined;
}
//@ chunk-pp50kewz.js:7172-7293 placement
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
//@ chunk-pp50kewz.js:7293-7484 callgraph-fingerprint = VALID_INSTALLABLE_SCOPES (0.443)
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
//@ chunk-pp50kewz.js:7484-7590 fingerprint = assertInstallableScope (1)
/**
 * 校验作用域是 user/project/local 之一，否则抛错。
 */
function assertInstallableScope(scope) {
  if (!VALID_INSTALLABLE_SCOPES.includes(scope))
    throw Error(`Invalid scope "${scope}". Must be one of: ${VALID_INSTALLABLE_SCOPES.join(", ")}`);
}
//@ chunk-pp50kewz.js:7590-7629 file-local
/**
 * 作用域是否为可安装作用域（user/project/local）。
 */
function isInstallableScope(scope) {
  return VALID_INSTALLABLE_SCOPES.includes(scope);
}
//@ chunk-pp50kewz.js:7629-7691 layout = isMcpServerFromProjectOrLocalSettings (1)
/**
 * 插件作用域对应的项目路径：project/local 作用域返回当前项目根，其他返回 undefined。旧版名 isMcpServerFromProjectOrLocalSettings 配错。
 */
function getProjectPathForScope(config) {
  return config === "project" || config === "local" ? getOriginalCwd() : undefined;
}
//@ chunk-pp50kewz.js:7691-7822 fingerprint = isPluginEnabledAtProjectScope (1)
/**
 * 插件是否在项目设置（.claude/settings.json）的 enabledPlugins 中启用（按插件 ID 宽松匹配）。
 */
function isPluginEnabledAtProjectScope(pluginId) {
  let enabledPlugins = getSettingsForSourceForUpkeep("projectSettings")?.enabledPlugins;
  if (!enabledPlugins) return false;
  let pluginName = findPluginName(Object.keys(enabledPlugins), pluginId);
  return pluginName !== undefined && enabledPlugins[pluginName] === true;
}
//@ chunk-pp50kewz.js:7822-7859 layout
/**
 * failureCode 是否属于“sad”（用户侧/预期内）类别，决定遥测走 f 还是 m。
 */
function isSadFailureCode(failureCode) {
  return FAILURE_CODE_SEVERITY[failureCode] === "sad";
}
//@ chunk-pp50kewz.js:7859-8716 layout
var FAILURE_CODE_SEVERITY = {
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
//@ chunk-pp50kewz.js:8716-8925 layout = findPluginInSettings (0.828)
/**
 * 在 installed_plugins 中把用户输入的名字解析成已安装的完整插件 ID。
 */
function findPluginInSettings_2(plugin) {
  let installedPlugins = getInstalledPlugins();
  let pluginName = findPluginName(Object.keys(installedPlugins.plugins), plugin);
  if (pluginName) return pluginName;
  for (let a of ["local", "project", "user"]) {
    let enabledPlugins = getSettingsForSourceForUpkeep(scopeToSettingSource(a))?.enabledPlugins;
    if (!enabledPlugins) continue;
    let pluginName = findPluginName(Object.keys(enabledPlugins), plugin);
    if (pluginName) return pluginName;
  }
  return plugin;
}
//@ chunk-pp50kewz.js:8925-9019 layout
/**
 * 综合各设置源 enabledPlugins、manifest.defaultEnabled 与安装偏好，判断插件当前是否实际启用。
 */
function isPluginEffectivelyEnabled(e, plugin, i) {
  return isPluginEnabled_2(
    e,
    filterTrustedForBuiltin(e, i),
    plugin.manifest.defaultEnabled,
    plugin.installationPreference,
  );
}
//@ chunk-pp50kewz.js:9019-9103 layout
function findScopeDeclaringPlugin(e, n) {
  return e.find((i) =>
    Object.hasOwn(getSettingsForSourceForUpkeep(scopeToSettingSource(i))?.enabledPlugins ?? {}, n),
  );
}
//@ chunk-pp50kewz.js:9103-9662 fingerprint = findPluginInSettings (0.869)
/**
 * 在 local > project > user 设置的 enabledPlugins 中找插件，返回 {pluginId, scope}。
 */
function findPluginInSettings(pluginId, n = ["local", "project", "user"]) {
  let hasMarketplace = pluginId.includes("@");
  let lower = pluginId.toLowerCase();
  if (hasMarketplace) {
    let o = listInstalledPluginIds(getInstalledPlugins());
    let u = o === "unknown" ? undefined : findPluginName(o, pluginId);
    if (u !== undefined) {
      let filtered = n.filter((p) => !hasSuspectSettingsLink(scopeToSettingSource(p)));
      if (
        u === pluginId ||
        (filtered.length === n.length && findScopeDeclaringPlugin(filtered, pluginId) === undefined)
      ) {
        let scopeDeclaringPlugin = findScopeDeclaringPlugin(filtered, u);
        if (
          scopeDeclaringPlugin !== undefined &&
          n.slice(0, n.indexOf(scopeDeclaringPlugin)).every((r) => filtered.includes(r))
        )
          return {
            pluginId: u,
            scope: scopeDeclaringPlugin,
          };
      }
    }
  }
  for (let scope of n) {
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
//@ chunk-pp50kewz.js:9662-9724 layout
function isSameRepoRoot(key, n) {
  let i = canonicalPluginId(key);
  return legacyPluginIds(i).length > 0 && i === canonicalPluginId(n);
}
//@ chunk-pp50kewz.js:9724-9760 layout
/**
 * 插件是否出现在任一可写设置源的 enabledPlugins 中。
 */
function isPluginInSettings(e) {
  return findPluginInSettings(e) !== null;
}
//@ chunk-pp50kewz.js:9760-9971 callgraph-fingerprint = findPluginByIdentifier (1)
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
//@ chunk-pp50kewz.js:9971-10385 layout
function resolveInstalledPluginId(pluginId, scope, projectPathForScope) {
  let { name: a } = parsePluginIdentifier(pluginId);
  let installedPlugins = getInstalledPlugins();
  let keys = Object.keys(installedPlugins.plugins);
  let pluginName = findPluginName(keys, pluginId);
  if (pluginName && installedPlugins.plugins[pluginName]?.length)
    return {
      pluginId: pluginName,
      pluginName: a,
    };
  let included = pluginId.includes("@");
  let filtered = pluginsNamed(keys, a).filter(
    (key) =>
      (!included || !parsePluginIdentifier(key).marketplace) &&
      (installedPlugins.plugins[key]?.length ?? 0) > 0,
  );
  let c =
    filtered.find((y) =>
      installedPlugins.plugins[y]?.some((j) => j.scope === scope && j.projectPath === projectPathForScope),
    ) ??
    filtered.find((y) =>
      installedPlugins.plugins[y]?.some((j) => isSameInstallScope(j, scope, projectPathForScope)),
    ) ??
    filtered[0];
  if (c)
    return {
      pluginId: c,
      pluginName: a,
    };
  return null;
}
//@ chunk-pp50kewz.js:10385-10954 fingerprint = getPluginInstallationFromV2 (1)
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
  for (let r of ["local", "project"]) {
    let c = installationAtTarget(installations, r, currentProjectPath);
    if (c)
      return {
        scope: c.scope,
        projectPath: c.projectPath,
      };
  }
  return {
    scope: installations[0].scope,
    projectPath: installations[0].projectPath,
  };
}
//@ chunk-pp50kewz.js:10954-11366 layout
function describePolicyBlock(e) {
  switch (e.reason) {
    case "blocked-by-policy":
      return {
        message: `Plugin "${e.pluginName}" is blocked by your organization's policy and cannot be installed`,
        failureCode: "plugin_policy_blocked",
      };
    case "marketplace-blocked-by-policy":
      return {
        message: `Plugin "${e.pluginName}" is from marketplace "${e.marketplaceName}", which is blocked by your organization's policy`,
        failureCode: "marketplace_policy_blocked",
      };
  }
}
//@ chunk-pp50kewz.js:11366-11515 layout
/**
 * 是否“仅缺少依赖”：插件在该作用域启用且缓存存在，加载问题只有依赖未找到（dependency-unsatisfied/not-found）。
 */
async function hasOnlyMissingDependencyIssues(e, n, i) {
  if (!(await isPluginEnabledAndCachedAtScope(e, n, i))) return false;
  return !(await dependencyErrorsForSource(e, i)).some(
    (o) => o.type !== "dependency-unsatisfied" || o.reason !== "not-found",
  );
}
//@ chunk-pp50kewz.js:11515-11715 layout
function hasDirectoryCounterpartInstalled(pluginName, marketplaceName) {
  {
    let i = marketplaceName === OFFICIAL_MARKETPLACE_NAME;
    return Object.entries(getInstalledPlugins().plugins).some(([key, value]) => {
      if (value.length === 0) return false;
      let { name: u, marketplace } = parsePluginIdentifier(key);
      return (
        u === pluginName &&
        marketplace !== undefined &&
        marketplace !== marketplaceName &&
        (i ? isOfficialMarketplaceName_3(marketplace) : marketplace === OFFICIAL_MARKETPLACE_NAME)
      );
    });
  }
  return false;
}
//@ chunk-pp50kewz.js:11715-11882 layout
/**
 * --replace 需要完整 name@marketplace 的提示。
 */
function replaceNeedsFullIdMessage() {
  return "--replace switches one copy of a plugin for another, so it needs the full id of the copy to switch to: name@marketplace. Nothing was installed.";
}
//@ chunk-pp50kewz.js:11882-12052 layout
/**
 * --replace 切换市场副本在本会话不可用的原因：插件目录不在会话中、工作区受限（不读项目/本地设置）、设置源被缩小。
 */
function getReplaceUnavailableReason() {
  if (!isPluginDirectoryAvailable()) return "directory-not-in-session";
  if (isWorkspaceRestricted()) return "workspace-restricted";
  if (!EDITABLE_SETTING_SOURCES.every((e) => getEnabledSettingSources().includes(e)))
    return "setting-sources-narrowed";
  return;
}
//@ chunk-pp50kewz.js:12052-12766 layout
/**
 * 把 --replace 不可用原因转成用户提示（CLI 与界面两种措辞）。
 */
function describeReplaceUnavailable(e, n) {
  {
    let i = n === "cli" ? ", so nothing was installed" : "";
    switch (e) {
      case "directory-not-in-session":
        return n === "cli"
          ? "--replace is not available in this session, so nothing was installed."
          : `Switching marketplaces needs the ${OFFICIAL_MARKETPLACE_DISPLAY}, which is not available in this session.`;
      case "workspace-restricted":
        return `Switching marketplaces is not available while this folder's project and local settings are not being read${i}. Try again from a session that reads them.`;
      case "setting-sources-narrowed":
        return `Switching marketplaces is not available while this session ignores any of your user, project or local settings files${i}. Try again from a session started without --setting-sources or --restricted.`;
    }
  }
  return "";
}
//@ chunk-pp50kewz.js:12766-12879 layout
function describeImpersonatingMarketplace(e, n) {
  return `${isAsciiImpersonatingOfficialName(e) ? reservedMarketplaceNameError(e) : marketplaceLoadFailedMessage(e, IMPERSONATION_ERROR_MESSAGE)}. ${marketplaceRemovalAdvice(
    e,
    {
      declaredInSettings: n.source.source === "settings",
    },
  )}`;
}
//@ chunk-pp50kewz.js:12879-13496 layout
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
//@ chunk-pp50kewz.js:13496-13557 layout
async function readInstalledPlugins(e) {
  return isStorageV5Enabled() && e !== undefined ? await loadInstalledPlugins(e) : loadInstalledPluginsSync();
}
//@ chunk-pp50kewz.js:13557-13611 layout
async function getInstallationsOf(e, storageV5) {
  return (await readInstalledPlugins(storageV5)).plugins[e];
}
//@ chunk-pp50kewz.js:13611-13694 layout
async function isPluginPossiblyInstalled(key, storageV5) {
  let installedPlugins = await readInstalledPlugins(storageV5);
  return hasFailedInstalledPluginsRead(installedPlugins) || (installedPlugins.plugins[key]?.length ?? 0) > 0;
}
//@ chunk-pp50kewz.js:13694-13756 layout
function latestInstallationAtScope(installationsOf, scope) {
  return hasInstallationForCurrentProject((installationsOf ?? []).filter((i) => i.scope === scope));
}
//@ chunk-pp50kewz.js:13756-36288 callgraph-witnessed = installPluginOp (0.16)
/**
 * 安装插件的操作入口（CLI claude plugin install 与 /plugin 界面）：解析 name[@marketplace]、校验作用域与策略（blocklist/policy、市场被禁）、取 marketplace 条目、处理依赖（自动安装同市场或白名单市场的依赖）、下载缓存、写 installed_plugins.json 与 settings 的 enabledPlugins；支持 --replace 在不同市场副本间切换。
 */
async function installPluginOp(
  pluginId,
  scope = "user",
  {
    shownSourceCommand: i,
    shownEntryHelper: a,
    announceRefreshResult: o,
    replaceInstalledCopy: u,
    replaceOnlyPluginIds: h,
    carrySettingsFrom: p,
    surface: r = "cli",
    npmRegistry: c,
    gitHubHttpsFallback: y,
    withoutRefresh: j,
  } = {},
  storageV5,
) {
  assertInstallableScope(scope);
  pluginId = normalizePluginId(pluginId);
  let { name: pluginName, marketplace: marketplaceName } = parsePluginId(pluginId);
  let b = pluginOperationRefusal(pluginId, marketplaceName, "install");
  if (b !== undefined)
    return {
      success: false,
      message: b,
      failureCode: unmanageablePluginReason(pluginId, marketplaceName),
    };
  let installedListRefusal = await getInstalledListRefusal(storageV5);
  if (installedListRefusal !== undefined)
    return {
      success: false,
      message: `Plugin "${quotedPrintable(pluginId)}" was not installed: ${readInstalledPluginsFile(installedListRefusal)}`,
      failureCode: "install_records_unreadable",
    };
  if (u && !marketplaceName)
    return {
      success: false,
      message: replaceNeedsFullIdMessage(),
      failureCode: "replace_needs_full_id",
    };
  let ee = u ? getReplaceUnavailableReason() : undefined;
  if (ee !== undefined)
    return {
      success: false,
      message: describeReplaceUnavailable(ee, "cli"),
      failureCode: "replace_unavailable",
    };
  let W;
  let se;
  let Ce;
  let X = false;
  let we;
  let J;
  let D;
  let ce = false;
  let ge = false;
  let k;
  let pe = false;
  let Ee = false;
  let M;
  let P = "";
  let L;
  let U = "";
  let B = "";
  let me = false;
  let npmPluginId = parseNpmPluginId(pluginId);
  if (npmPluginId === null && pluginId.toLowerCase().endsWith(`@${pluginManifestPathSchemas}`))
    return {
      success: false,
      message: `"${pluginId}" is not an npm package spec: expected <package>@npm, e.g. @scope/name@npm, name@npm or name@1.2.3@npm`,
      failureCode: "not_found",
    };
  if (npmPluginId !== null && c !== undefined && !isHttpUrl(c))
    return {
      success: false,
      message: `--registry must be an http(s) URL (got "${c}")`,
      failureCode: "not_found",
    };
  if (npmPluginId !== null) {
    if (!npmMarketplaceEnabled())
      return {
        success: false,
        message: NPM_DIRECT_INSTALL_DISABLED_MESSAGE,
        failureCode: "npm_marketplace_disabled",
      };
    W = toNpmPluginSource(npmPluginId, c);
    se = pluginManifestPathSchemas;
    Ce = NPM_REGISTRY;
  } else if (marketplaceName) {
    let pluginInfo = await loadKnownMarketplacesWithDeclared(storageV5);
    let ie = ownPropertyOrUndefined(pluginInfo, marketplaceName);
    if (ie !== undefined && isImpersonatingOfficialMarketplace(marketplaceName, ie)) {
      logFeatureBad("plugin_marketplace_resolve", "marketplace_name_refused", {
        scoped: true,
      });
      return {
        success: false,
        message: describeImpersonatingMarketplace(marketplaceName, ie),
        failureCode: "not_found",
      };
    }
    me = listReservedNameRefusals(pluginInfo).some((ue) => ue.name === marketplaceName);
    let V = ie !== undefined && isSourceAllowedByPolicy(ie.source);
    ce = ie !== undefined && !V;
    let He =
      u && ie !== undefined && V && isPluginDirectorySource(ie.source)
        ? await lookUpPluginForSwitch(pluginName, storageV5)
        : undefined;
    if (He !== undefined && "notFreshEnoughFor" in He) {
      D = He.detail;
      if (hasDirectoryCounterpartInstalled(pluginName, marketplaceName)) {
        logFeatureBad("plugin_marketplace_resolve", "refresh_failed", {
          scoped: true,
        });
        return {
          success: false,
          message: `Plugin "${quotedPrintable(pluginName)}" was not switched. ${formatSwitchNeedsFreshReadMessage(He.detail)}`,
          failureCode: "replace_needs_fresh_listing",
        };
      }
    }
    let R = He !== undefined && "entry" in He ? He : undefined;
    let Q =
      R !== undefined
        ? {
            outcome: "refreshed",
          }
        : j
          ? {
              outcome: "ineligible",
            }
          : (o ?? (await refreshBeforeScopedInstall(marketplaceName, ie, storageV5)));
    if (!j) logInstallRefreshFirst(Q.outcome);
    if (Q.outcome === "refreshed") X = true;
    else if (Q.outcome === "refresh-failed") {
      ge = true;
      we = `marketplace not refreshed (${Q.errorMessage})`;
      if (ie && isPluginDirectorySource(ie.source)) k = Q.errorMessage;
    }
    pe = ie !== undefined && isPluginDirectorySource(ie.source);
    Ee = ie === undefined && marketplaceName === OFFICIAL_MARKETPLACE_NAME && !isPluginDirectoryAvailable();
    if (pe && (await getPluginDirectoryState()) === "blocked") {
      logFeatureBad("plugin_marketplace_resolve", "marketplace_policy_blocked", {
        scoped: true,
      });
      return {
        success: false,
        message: directoryBlockedMessage(pluginName),
        failureCode: "marketplace_policy_blocked",
      };
    }
    let x =
      R !== undefined
        ? R.entry === null
          ? null
          : R
        : k === undefined
          ? await getPluginById(pluginId, storageV5, "install")
          : await getPluginByIdCacheOnly(pluginId, storageV5, "install");
    if (R !== undefined && R.entry !== null) J = R.reviewerMarked;
    if (x) {
      W = x.entry;
      se = marketplaceName;
      Ce = x.marketplaceInstallLocation;
    }
  } else {
    let K;
    let pluginInMarketplaces = await findPluginInMarketplaces(pluginName, storageV5, (Q) => {
      K = Q;
    });
    let ie = !pluginInMarketplaces ? await getPluginDirectoryState() : undefined;
    let message = K?.message;
    let He = message?.indexOf(": ") ?? -1;
    let R =
      message?.startsWith(`${OFFICIAL_MARKETPLACE_DISPLAY} `) && He !== -1 ? message.slice(He + 2) : message;
    if (pluginInMarketplaces) {
      W = pluginInMarketplaces.entry;
      se = pluginInMarketplaces.marketplace;
      Ce = pluginInMarketplaces.marketplaceInstallLocation;
      L = pluginInMarketplaces.preferredOver;
      if (
        R !== undefined &&
        pluginInMarketplaces.marketplace !== OFFICIAL_MARKETPLACE_NAME &&
        isPluginDirectoryAvailable()
      )
        P = ` (The ${OFFICIAL_MARKETPLACE_DISPLAY} could not be checked: ${R}; installed from ${
          printableLabel(marketplaceDisplayName(pluginInMarketplaces.marketplace), {
            head: 60,
            tail: 20,
          }) || "another marketplace"
        }.)`;
    } else if (ie === "blocked")
      U = `. (The ${OFFICIAL_MARKETPLACE_DISPLAY} is blocked by your organization. ${pluginDirectoryPolicyBlockHint()})`;
    else if (ie === "off")
      B = `. (The ${OFFICIAL_MARKETPLACE_DISPLAY} was not searched: it is turned off. Turn it back on: claude plugin marketplace add ${OFFICIAL_MARKETPLACE_NAME})`;
    else {
      M = R;
      if (M === undefined && (await isPluginDirectoryListingBlocked(pluginName, storageV5)))
        U = `. (The ${OFFICIAL_MARKETPLACE_DISPLAY} lists it, but it is blocked by your organization's policy.)`;
    }
  }
  if (!W || !se) {
    if ((!W || !se) && pe && marketplaceName && k === undefined)
      try {
        await getMarketplace(marketplaceName, storageV5, "install");
      } catch (error) {
        if (error instanceof PluginDirectoryUnavailableError) k = error.message;
      }
    if ((!W || !se) && k) {
      logFeatureBad("plugin_marketplace_resolve", "refresh_failed_stale_lookup", {
        scoped: true,
      });
      return {
        success: false,
        message: `Could not look up "${quotedPrintable(pluginName)}". ${k}`,
        failureCode: "directory_unavailable",
      };
    }
    if ((!W || !se) && Ee) {
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
      (!W || !se) &&
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
    if ((!W || !se) && pe && (await isPluginDirectoryListingBlocked(pluginName, storageV5))) {
      logFeatureBad("plugin_marketplace_resolve", "marketplace_policy_blocked", {
        scoped: true,
      });
      return {
        success: false,
        message: `Plugin "${quotedPrintable(pluginName)}" is blocked by your organization's policy and cannot be installed`,
        failureCode: "plugin_policy_blocked",
      };
    }
    if ((!W || !se) && pe) {
      let K = await pluginDirectoryNotInstallableMessage(pluginName);
      if (K !== undefined) {
        logFeatureBad("plugin_marketplace_resolve", "not_installable", {
          scoped: true,
        });
        return {
          success: false,
          message: K,
          failureCode: "not_found",
        };
      }
    }
    if ((!W || !se) && me) {
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
  if (!W || !se) {
    let K = marketplaceName ? `marketplace "${marketplaceName}"` : "any configured marketplace";
    let q = marketplaceName ? claudeCommand("plugin marketplace update", marketplaceName) : null;
    let ie =
      marketplaceName !== undefined &&
      marketplaceName !== OFFICIAL_MARKETPLACE_NAME &&
      isOfficialMarketplaceSpelling(marketplaceName)
        ? true
        : false;
    let V =
      marketplaceName && !X && !ie
        ? `. Your local copy may be out of date${q ? ` \u2014 try \`${q}\`` : " \u2014 update it from /plugin > Marketplaces"}.`
        : "";
    logFeatureBad(
      "plugin_marketplace_resolve",
      ce ? "marketplace_policy_blocked" : ge ? "refresh_failed_stale_lookup" : "not_found",
      {
        scoped: marketplaceName !== undefined,
      },
    );
    let He = M ? `. (The ${OFFICIAL_MARKETPLACE_DISPLAY} could not be checked: ${M})` : "";
    let R = "";
    if (pe && marketplaceName) {
      let replaced = pluginName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      let sliced = (await getMarketplace(marketplaceName, storageV5, "install").catch(() => null))?.plugins
        .filter((plugin) => plugin.displayName?.toLowerCase().replace(/[^a-z0-9]+/g, "-") === replaced)
        .map((plugin) => plugin.name)
        .slice(0, 3);
      if (sliced !== undefined && sliced.length > 0)
        R = `${V === "" ? "." : ""} It may be listed as: ${sliced.map((ue) => printableName(ue, 80)).join(", ")}`;
    }
    return {
      success: false,
      message: `Plugin "${pluginName}" not found in ${K}${V}${R}${He}${U}${B}`,
      failureCode: ce
        ? "marketplace_policy_blocked"
        : ge
          ? "not_found_stale_catalog"
          : M
            ? "directory_unavailable"
            : "not_found",
    };
  }
  let Z = W;
  let S = `${Z.name}@${se}`;
  if (ce)
    logFeatureBad("plugin_marketplace_resolve", "marketplace_policy_blocked", {
      scoped: true,
    });
  else
    logFeatureOk("plugin_marketplace_resolve", {
      scoped: marketplaceName !== undefined,
    });
  if (npmPluginId?.versionSpec === undefined && (await hasOnlyMissingDependencyIssues(S, scope, storageV5))) {
    let K = S.endsWith(`@${OFFICIAL_MARKETPLACE_NAME}`)
      ? bindingKeysFor(
          (isStorageV5Enabled() && storageV5 !== undefined
            ? await loadInstalledPlugins(storageV5)
            : loadInstalledPluginsSync()
          ).plugins,
          S,
        )
      : [];
    let q = K.length > 0 ? K.flatMap(([, Te]) => Te) : undefined;
    let ie = q !== undefined ? await seedDirectoryBindings(K) : undefined;
    if (ie !== undefined && isUnboundOfficialPlugin(S, q, ie))
      return {
        success: false,
        message: `"${printableName(Z.name, 120)}" is already installed, but plugin-directory-bindings.json in the plugins folder could not be used (unreadable, a symbolic link or not a file, over 1 MB, damaged, or written by a newer Claude Code), so its ${OFFICIAL_MARKETPLACE_DISPLAY} listing could not be checked against the repository it was installed from. Nothing was changed. Try again; if this repeats, check the file for those causes.`,
        failureCode: "directory_binding_unreadable",
      };
    if (q !== undefined && ie !== undefined && isDirectoryRepositoryChanged(S, q, Z.source, ie)) {
      let dataDirConflictingRecord = findDataDirConflictingRecord(Object.fromEntries(K), ie, S, Z.source);
      return {
        success: false,
        message:
          dataDirConflictingRecord !== undefined
            ? formatSharedDataFolderMessage(Z.name, dataDirConflictingRecord)
            : `"${quotedPrintable(Z.name, 120)}" is already installed from a different repository than the one the ${OFFICIAL_MARKETPLACE_DISPLAY} now lists under that name. Uninstall it first, then install it again.`,
        failureCode: "directory_identity_changed",
      };
    }
    let V = isPluginDirectoryAvailable()
      ? await describeOtherMarketplaceInstalls(S, Z, await loadKnownMarketplacesSafe(storageV5), storageV5)
      : [];
    let He = () => checkInstallAllowed(S, Z, storageV5).then((Te) => (Te.ok ? undefined : Te.refusal));
    if (u) {
      if ((await resolveDelistedPluginId(h, V, storageV5)).length > 0)
        return {
          success: false,
          message: formatSwitchTargetChangedMessage(Z.name),
          failureCode: "installed_from_other_marketplace",
        };
      let [Te] = V;
      if (Te !== undefined && D !== undefined) {
        logMarketplaceSwitch({
          fromPluginId: Te.pluginId,
          toPluginId: S,
          surface: r,
          managedNames: policyEnabledPluginNameSet(),
          result: {
            outcome: "bad",
            code: "replace_needs_fresh_listing",
          },
        });
        return {
          success: false,
          message: `Plugin ${displayPluginId(S)} is already installed (scope: ${scope}), and nothing was switched. ${formatSwitchNeedsFreshReadMessage(D)}`,
          failureCode: "replace_needs_fresh_listing",
        };
      }
      let Ze = Te === undefined ? undefined : await He();
      if (Ze !== undefined && Te !== undefined) {
        let Be =
          Ze.reason === "plugin-directory-unavailable"
            ? {
                message: formatDirectoryUnavailableMessage(Ze.pluginName, Ze.unavailableDependency),
                failureCode: "plugin_directory_unavailable",
              }
            : describePolicyBlock(Ze);
        let wn =
          Be.failureCode === "plugin_directory_unavailable"
            ? ": switching to this copy is allowed only where installing it is. "
            : ". ";
        logMarketplaceSwitch({
          fromPluginId: Te.pluginId,
          toPluginId: S,
          surface: r,
          managedNames: policyEnabledPluginNameSet(),
          result: {
            outcome: "bad",
            code: Be.failureCode,
          },
        });
        return {
          success: false,
          message: `Plugin ${displayPluginId(S)} is already installed (scope: ${scope}), and nothing was switched${wn}${Be.message}`,
          failureCode: Be.failureCode,
        };
      }
      let otherMarketplaceInstallBlocker = findOtherMarketplaceInstallBlocker(S, V, h, J);
      if (otherMarketplaceInstallBlocker?.reason === "more-installed-than-shown")
        return {
          success: false,
          message: formatMoreInstallsThanShownMessage(Z.name),
          failureCode: "installed_from_other_marketplace",
        };
      if (otherMarketplaceInstallBlocker !== undefined) {
        logMarketplaceSwitch({
          fromPluginId: otherMarketplaceInstallBlocker.blocking.pluginId,
          toPluginId: S,
          surface: r,
          managedNames: policyEnabledPluginNameSet(),
          result: {
            outcome: "bad",
            code: "installed_from_other_marketplace",
          },
        });
        return {
          success: false,
          message: `Plugin ${displayPluginId(S)} is already installed (scope: ${scope}), and nothing was switched. ${installFromOtherMarketplace(S, Z.name, V, r === "cli" ? "cli" : "ui", scope, J)}`,
          failureCode: "installed_from_other_marketplace",
        };
      }
      let [gn, ...on] = V;
      if (gn) {
        let Be = await finishReplaceSwitch(
          S,
          scope,
          [gn, ...on],
          {
            newCopyWasJustInstalled: false,
            newCopyWasOn: locatePluginInstall(S, undefined, groupedEnabledPlugins()).effective === true,
            surface: r,
            carrySettingsFrom: p,
          },
          storageV5,
        );
        let wn =
          scope === "user"
            ? await findOtherProjectInstalls(S, Z, await loadKnownMarketplacesSafe(storageV5), storageV5)
            : [];
        let kn = describeOtherMarketplaceInstall(S, Z.name, wn);
        if (Be.ok) await clearAutoInstalledFlag(S, scope, getProjectPathForScope(scope), storageV5);
        let _n = claudeCommand("plugin enable", S);
        let jn =
          Be.ok &&
          !Be.stayedDisabled &&
          locatePluginInstall(S, undefined, groupedEnabledPlugins()).effective === false
            ? `. ${displayPluginId(S)} is disabled in your settings \u2014 enable it ${_n ? `with: ${_n}` : "in /plugin"}`
            : "";
        return Be.ok
          ? {
              success: true,
              message: `Plugin ${displayPluginId(S)} was already installed (scope: ${scope})${Be.note}${jn}${kn === "" ? "" : `. ${kn}`}`,
              pluginId: S,
              pluginName: Z.name,
              scope,
              switched: {
                from: Be.from,
                replaced: Be.replaced,
                stayedDisabled: Be.stayedDisabled,
                keptOwnSettings: Be.keptOwnSettings,
                settingsRemovedFrom: Be.settingsRemovedFrom,
                ...(Be.settingsLeftInPlace && {
                  settingsLeftInPlace: Be.settingsLeftInPlace,
                }),
                savedDataRemovedFrom: Be.savedDataRemovedFrom,
                ...(Be.keptDataDir && {
                  keptDataDir: Be.keptDataDir,
                }),
                ...(Be.oldCopyStillRecordedAt.length > 0 && {
                  oldCopyStillRecordedAt: Be.oldCopyStillRecordedAt,
                }),
                ...((Be.saysMore || jn !== "" || kn !== "") && {
                  messageSaysMore: true,
                }),
              },
            }
          : {
              success: false,
              message: Be.message,
              failureCode: "replace_failed",
            };
      }
    }
    let R = await clearAutoInstalledFlag(S, scope, getProjectPathForScope(scope), storageV5);
    let Q = await installMissingDependencies(S, storageV5);
    let x =
      V.length > 0 &&
      findOtherMarketplaceInstallBlocker(S, V, undefined) === undefined &&
      (await He()) === undefined
        ? claudeCommand("plugin install", S, scope === "user" ? "--replace" : `--replace --scope ${scope}`)
        : null;
    let ue = (pluginId) => {
      let Ze = marketplaceNameOfId(pluginId);
      return Ze !== OFFICIAL_MARKETPLACE_NAME && !(Ze !== undefined && isOfficialMarketplaceName_3(Ze));
    };
    let fe = (Te) => {
      let Ze = new Map();
      for (let Ve of Te) {
        let gn = marketplaceNameOfId(Ve.pluginId);
        Ze.set(gn, [...(Ze.get(gn) ?? []), displayPluginId(Ve.pluginId)]);
      }
      return new Intl.ListFormat("en", {
        type: "conjunction",
      }).format(
        [...Ze].map(
          ([Ve, gn]) =>
            `${(Ve !== undefined ? displayMarketplaceName(Ve) : "") || "another marketplace"} (${gn.join(", ")})`,
        ),
      );
    };
    let ze = marketplaceNameOfId(S);
    let Se = ze !== undefined && ue(S);
    let Fe = Se ? [] : V.filter((Te) => !ue(Te.pluginId));
    let Ye = Se ? [] : V.filter((Te) => ue(Te.pluginId));
    let sn = V.length > 0 ? fe(V) : "";
    let an = plural(V.length, "other", "others");
    let marketplace = await installedAndAvailableVersions({
      pluginId: S,
      entry: Z,
      marketplaceName: se,
      marketplaceInstallLocation: Ce,
      scope,
      projectPath: getProjectPathForScope(scope),
      storageV5,
    });
    let Qe = `${describeUpdateAvailability(S, scope, marketplace)}${Q?.suffix ?? ""}`;
    let ye = /[.?]$/.test(Qe) ? " " : ". ";
    let We =
      sn !== ""
        ? Se
          ? `${ye}${displayMarketplaceName(ze ?? "") || "\u201C\u201D"} lists it at the same repository and folder as ${plural(V.length, "a plugin", "plugins")} installed here from ${sn}. If they are the same plugin, it loads ${V.length === 1 ? "twice" : "more than once"}: to keep only one, uninstall the ${an}`
          : `${Fe.length === 0 ? "" : `${Qe === "" ? " \u2014 also installed from " : `${ye}${displayPluginId(S)} is also installed from `}${fe(Fe)}${x !== null ? `; to keep only this one: ${x}` : ""}`}${Ye.length === 0 ? "" : `${Fe.length === 0 ? ye : ". "}${plural(Ye.length, "A plugin", "Plugins")} installed here from ${fe(Ye)} ${plural(Ye.length, "is", "are")} listed there at the same repository and folder as this one. ${Fe.length === 0 ? `If they are the same plugin, it loads ${V.length === 1 ? "twice" : "more than once"}` : `If ${plural(Ye.length, "that one is", "those are")} the same plugin too, it loads ${V.length + 1} times`}: to keep only one, uninstall the ${an}`}`
        : "";
    return {
      success: true,
      message: `Plugin ${We === "" ? `"${S}"` : displayPluginId(S)} is already installed (scope: ${scope})${R ? " \u2014 marked as manually installed" : ""}${Qe}${We}${nothingSwitchedSuffix(u === true && V.length === 0, `${Qe}${We}`)}`,
      pluginId: S,
      pluginName: Z.name,
      scope,
      installedVersion: marketplace.installedVersion,
      availableVersion: marketplace.availableVersion,
    };
  }
  let he;
  if (a !== undefined) he = a;
  else {
    he = await archiveFetchWarning(S, Z, storageV5);
    if (he !== null)
      throw new EntryHelperError(
        `${archiveHelperDisclosure(he)}
This install runs that command; confirm it by running \`claude plugin install\` in a terminal (or with -y/--yes).`,
        "entry_helper_unconfirmed",
      );
  }
  let installationsOf = await getInstallationsOf(S, storageV5);
  let Oe = latestInstallationAtScope(installationsOf, scope);
  let newCopyWasOn =
    hasInstallationForCurrentProject(installationsOf ?? []) &&
    locatePluginInstall(S, undefined, groupedEnabledPlugins()).effective === true;
  let Ge = await installResolvedPlugin({
    pluginId: S,
    entry: Z,
    scope,
    marketplaceInstallLocation: Ce,
    trigger: "cli",
    explicit: true,
    consentedEntryHelper: he,
    commandSourceConsent:
      i !== undefined
        ? {
            kind: "shown",
            command: i,
            pluginId: S,
          }
        : recordedSourceCommand(S, Z.source, installationsOf),
    replaceInstalledCopy: u,
    replaceOnlyPluginIds: h,
    switchTargetMarkedInItsOwnWalk: J,
    switchWalkNotFresh: D,
    storageV5,
    gitHubHttpsFallback: y,
  }).catch(async (error) => {
    let q =
      L !== undefined &&
      typeof L.entry.source === "string" &&
      !installationsOf?.length &&
      !(await isPluginPossiblyInstalled(S, storageV5))
        ? classifyOfficialFetchError(error)
        : undefined;
    if (q !== undefined && L !== undefined)
      return {
        fetchFailed: error,
        why: q,
        official: L,
      };
    throw error;
  });
  if ("fetchFailed" in Ge) {
    {
      let { fetchFailed, why, official } = Ge;
      let V = `${official.entry.name}@${official.marketplace}`;
      let He = await whyNotInstallableInPlace(official, storageV5);
      if (He !== undefined) {
        logForDebugging(
          `Bare-name install of "${quotedPrintable(pluginName)}": the ${OFFICIAL_MARKETPLACE_DISPLAY}'s copy could not be fetched, and ${quotedPrintable(V)} was not installed in its place: ${He}`,
        );
        throw fetchFailed;
      }
      let R;
      let Q;
      try {
        let allPluginsCacheOnly = await loadAllPluginsCacheOnly(storageV5);
        R = collectDependencyVersionRanges(
          [...allPluginsCacheOnly.enabled, ...allPluginsCacheOnly.disabled],
          new Set(),
        );
      } catch (error) {
        logError(error);
        Q = errorMessage(error);
      }
      let x = R?.ranges.get(V) ?? [];
      let ue = x.length > 0 ? intersectVersionConstraints(x) : undefined;
      if (Q !== undefined || (ue !== undefined && (!ue.ok || ue.range !== "*"))) {
        let Fe = uniq(R?.requirers.get(V) ?? []);
        logForDebugging(
          `Bare-name install of "${quotedPrintable(pluginName)}": the ${OFFICIAL_MARKETPLACE_DISPLAY}'s copy could not be fetched, and ${quotedPrintable(V)} was not installed in its place: ${Q !== undefined ? `could not read the installed plugins to check (${quotedPrintable(Q, 300)})` : `${quotedPrintable(Fe.join(", "))} ${Fe.length === 1 ? "requires" : "require"} version ${quotedPrintable(x.join(", "))} of it, which could be downloaded from the marketplace's git host`}`,
        );
        throw fetchFailed;
      }
      logForDebugging(
        `Bare-name install of "${quotedPrintable(pluginName)}": the ${OFFICIAL_MARKETPLACE_DISPLAY}'s copy could not be fetched (${quotedPrintable(errorMessage(fetchFailed), 300)}); installing ${quotedPrintable(official.marketplace)}'s copy instead`,
      );
      let fe = latestInstallationAtScope(await getInstallationsOf(V, storageV5), scope);
      let ze;
      let Se = await installPluginOp(
        V,
        scope,
        {
          surface: r,
          withoutRefresh: true,
          gitHubHttpsFallback: y,
        },
        storageV5,
      ).catch((error) => {
        ze = error;
        logForDebugging(
          `Bare-name install of "${quotedPrintable(pluginName)}": ${quotedPrintable(official.marketplace)}'s copy did not install either: ${quotedPrintable(errorMessage(error), 300)}`,
        );
        return;
      });
      if (!Se?.success && !fe && latestInstallationAtScope(await getInstallationsOf(V, storageV5), scope))
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          describeInstallFetchFailure(
            why,
            V,
            official.marketplace,
            scope,
            Se === undefined ? errorMessage(ze) : Se.message,
          ),
          "bare-name install: the official copy it fell back to was left installed after its install failed",
        );
      if (!Se?.success || Se.pluginId !== V || Se.aliasedId || Se.nothingWritten) {
        if (Se !== undefined)
          logForDebugging(
            `Bare-name install of "${quotedPrintable(pluginName)}": ${quotedPrintable(official.marketplace)}'s copy was not installed: ${quotedPrintable(Se.message, 300)}`,
          );
        throw fetchFailed;
      }
      logFeatureSad(
        "plugin_marketplace_resolve",
        why === "git-missing" ? "directory_copy_git_missing" : "directory_copy_fetch_failed",
      );
      return {
        ...Se,
        message: `${Se.message}${formatOfficialFallbackNote(why, official.marketplace)}`,
      };
    }
    throw Ge.fetchFailed;
  }
  let A = Ge;
  if (!A.ok)
    switch (A.reason) {
      case "installed-from-other-marketplace":
      case "more-installed-than-shown":
      case "fewer-installed-than-shown":
      case "switch-needs-fresh-listing":
      case "directory-pin-unsatisfied":
      case "directory-binding-unreadable":
      case "directory-identity-changed":
        switch (A.reason) {
          case "switch-needs-fresh-listing":
            logMarketplaceSwitch({
              fromPluginId: A.installedCopies[0].pluginId,
              toPluginId: S,
              surface: r,
              managedNames: policyEnabledPluginNameSet(),
              result: {
                outcome: "bad",
                code: "replace_needs_fresh_listing",
              },
            });
            return {
              success: false,
              message: `Plugin "${quotedPrintable(A.pluginName)}" was not switched. ${formatSwitchNeedsFreshReadMessage(A.detail)}`,
              failureCode: "replace_needs_fresh_listing",
            };
          case "installed-from-other-marketplace":
            if (u)
              logMarketplaceSwitch({
                fromPluginId: (
                  A.installedCopies.find((installedCopy) => !installedCopy.replaceable) ??
                  A.installedCopies[0]
                ).pluginId,
                toPluginId: S,
                surface: r,
                managedNames: policyEnabledPluginNameSet(),
                result: {
                  outcome: "bad",
                  code: "installed_from_other_marketplace",
                },
              });
            else if (r === "cli") {
              let K = await installSelectedPlugins(S, storageV5);
              let q = K?.installed.scopes.some(isInstallableScope) ? K : undefined;
              if (q) {
                let index = q.repositoryKey.indexOf("#");
                let V = index < 0 ? q.repositoryKey : q.repositoryKey.slice(0, index);
                let He = index < 0 ? "" : q.repositoryKey.slice(index + 1);
                let R = V.startsWith(`${GITHUB_HOST}/`) ? V.slice(GITHUB_HOST.length + 1) : V;
                let Q = quotedPrintable(A.pluginName, 120);
                let included = q.installed.scopes.includes(scope);
                let ue = included ? "" : ` at ${q.installed.scopes.join(" and ")} scope`;
                let fe = included ? scope : q.installed.scopes.find(isInstallableScope);
                if (fe !== undefined && (included || scope === "user")) {
                  let ze = marketplaceDisplayName(
                    parsePluginIdentifier(q.installed.pluginId).marketplace ?? "",
                  );
                  let trimmed = printableName(He, 200).trim();
                  let Fe = printableLabel(
                    printableName(`${R}${trimmed === "" ? "" : ` \xB7 ${trimmed}`}`, 200),
                  );
                  let Ye = Fe === "" ? "" : ` (the same plugin: ${Fe})`;
                  let sn = scope === "user" ? "--replace" : `--replace --scope ${scope}`;
                  let an = claudeCommand("plugin install", S, sn);
                  let Ue = marketplaceDisplayName(se);
                  let Qe = findOtherMarketplaceInstallBlocker(S, [q.installed], undefined) === undefined;
                  let ye = !Qe
                    ? ""
                    : an === null
                      ? ` To switch it to ${Ue}, open it in /plugin \u2192 Installed and choose "Switch to ${Ue}"`
                      : ` To switch it to ${Ue}: ${an}`;
                  let We = !Qe ? "" : ` To switch it to ${Ue}, install ${displayPluginId(S)} with ${sn}.`;
                  let Te = included ? [fe] : q.installed.scopes.filter(isInstallableScope);
                  let Ze;
                  for (let on of Te)
                    if (await hasCachedInstallationAtScope(q.installed.pluginId, on, storageV5)) {
                      Ze = on;
                      break;
                    }
                  if (Ze === undefined) {
                    let on = claudeCommand(
                      "plugin install",
                      q.installed.pluginId,
                      fe === "user" ? undefined : `--scope ${fe}`,
                    );
                    return {
                      success: false,
                      message: `"${Q}" is installed from ${ze}${ue}${Ye}, but its files are missing from the plugin cache. Nothing was changed. To restore them${on === null ? ", install it again from /plugin" : `: ${on}`}`,
                      failureCode: "installed_from_other_marketplace",
                      pluginId: q.installed.pluginId,
                      aliasedId: true,
                    };
                  }
                  if (!included) {
                    let on = claudeCommand("plugin enable", q.installed.pluginId, "--scope local");
                    let Be = locatePluginInstall(q.installed.pluginId, undefined, groupedEnabledPlugins());
                    let wn =
                      Be.effective === true
                        ? ""
                        : Be.override !== undefined
                          ? ` The plugin is turned off by ${Be.override.source === "policySettings" ? "your organization's managed settings" : "this session's --settings flag"}, and this command changed nothing.`
                          : ` The plugin is turned off in this project, and this command did not turn it on. To turn it on${on === null ? ", open it in /plugin" : ` for yourself in this project: ${on}`}`;
                    return {
                      success: true,
                      message: `"${Q}" is already installed from ${ze}${ue}${Ye}. Nothing to install.${wn === "" ? ye : We}${wn}`,
                      pluginId: q.installed.pluginId,
                      pluginName: A.pluginName,
                      scope: Ze,
                      aliasedId: true,
                      nothingWritten: true,
                    };
                  }
                  let Ve = await setPluginEnabledOp(q.installed.pluginId, true, fe, undefined, storageV5);
                  if (!Ve.success && !Ve.alreadyInGoalState)
                    return {
                      success: false,
                      message: Ve.message,
                      failureCode: Ve.failureCode,
                      pluginId: q.installed.pluginId,
                      aliasedId: true,
                    };
                  let gn = await clearAutoInstalledFlag(
                    q.installed.pluginId,
                    fe,
                    getProjectPathForScope(fe),
                    storageV5,
                  );
                  return {
                    success: true,
                    message: `"${Q}" is already installed from ${ze}${Ye}. ${Ve.success ? "It was disabled, so it is enabled again." : "Nothing to install."}${gn ? " It is now marked as manually installed." : ""}${ye}`,
                    pluginId: q.installed.pluginId,
                    pluginName: A.pluginName,
                    scope: (Ve.success ? Ve.scope : undefined) ?? fe,
                    aliasedId: true,
                    ...(Ve.success && {
                      reenabled: true,
                    }),
                  };
                }
              }
            }
            return {
              success: false,
              message: installFromOtherMarketplace(
                S,
                A.pluginName,
                A.installedCopies,
                r === "cli" ? "cli" : "ui",
                scope,
                J,
              ),
              failureCode: "installed_from_other_marketplace",
            };
          case "more-installed-than-shown":
            return {
              success: false,
              message: formatMoreInstallsThanShownMessage(A.pluginName),
              failureCode: "installed_from_other_marketplace",
            };
          case "fewer-installed-than-shown":
            return {
              success: false,
              message: formatSwitchTargetChangedMessage(A.pluginName),
              failureCode: "installed_from_other_marketplace",
            };
          case "directory-pin-unsatisfied":
            return {
              success: false,
              message: A.message,
              failureCode: "dependency_pinned_version_unsatisfied",
            };
          case "directory-binding-unreadable":
            return {
              success: false,
              message: A.message,
              failureCode: "directory_binding_unreadable",
            };
          case "directory-identity-changed":
            return {
              success: false,
              message: A.message,
              failureCode: "directory_identity_changed",
            };
        }
        return {
          success: false,
          message: `Failed to install plugin "${S}"`,
          failureCode: "dependency_resolution_failed",
        };
      case "local-source-no-location":
        return {
          success: false,
          message: `Cannot install local plugin "${A.pluginName}" without marketplace install location`,
          failureCode: "local_source_no_location",
        };
      case "plugin-folder-held":
        return {
          success: false,
          message: findPluginNameCollision({
            ...A,
            refused: A.pluginId,
            askedFor: S,
            surface: r === "cli" ? "cli" : "ui",
          }),
          failureCode: "plugin_folder_held",
        };
      case "unrecordable-plugin-id":
        return {
          success: false,
          message: formatInvalidPluginIdMessage(
            A.pluginId,
            S,
            A.pluginId === S
              ? {
                  pluginName: Z.name,
                  marketplaceName: se,
                }
              : undefined,
          ),
          failureCode: "invalid_plugin_id",
        };
      case "installed-list-held":
        return {
          success: false,
          message: `Plugin "${quotedPrintable(S)}" was not installed: ${readInstalledPluginsFile(A.held)}`,
          failureCode: "install_records_unreadable",
        };
      case "settings-write-failed":
        return {
          success: false,
          message: `Failed to update settings: ${A.message}`,
          failureCode: "settings_write_failed",
        };
      case "resolution-failed":
        return {
          success: false,
          message: formatResolutionError(A.resolution),
          failureCode: "dependency_resolution_failed",
        };
      case "blocked-by-policy":
        return {
          success: false,
          ...describePolicyBlock(A),
        };
      case "dependency-blocked-by-policy":
        return {
          success: false,
          message: `Plugin "${A.pluginName}" depends on "${A.blockedDependency}", which is blocked by your organization's policy`,
          failureCode: "dependency_policy_blocked",
        };
      case "marketplace-blocked-by-policy":
        return {
          success: false,
          ...describePolicyBlock(A),
        };
      case "dependency-marketplace-blocked-by-policy":
        return {
          success: false,
          message: `Plugin "${A.pluginName}" depends on "${A.blockedDependency}" from marketplace "${A.marketplaceName}", which is blocked by your organization's policy`,
          failureCode: "dependency_policy_blocked",
        };
      case "plugin-directory-unavailable":
        switch (A.reason) {
          case "plugin-directory-unavailable":
            return {
              success: false,
              message: formatDirectoryUnavailableMessage(A.pluginName, A.unavailableDependency),
              failureCode: "plugin_directory_unavailable",
            };
        }
        return {
          success: false,
          message: `Failed to install plugin "${quotedPrintable(S)}"`,
          failureCode: "dependency_resolution_failed",
        };
      case "range-conflict": {
        let K = A.dep === S ? "Plugin" : "Dependency";
        return {
          success: false,
          failureCode: "dependency_version_conflict",
          message: describeConstraintConflict(
            K,
            A.dep,
            A.ranges,
            A.why,
            A.installed,
            A.suggestDependencyUpdate,
          ),
        };
      }
      case "no-matching-tag": {
        let K = A.dep === S ? "Plugin" : "Dependency";
        return {
          success: false,
          message: noMatchingTagMessage(K, A.dep, A.range),
          failureCode: "dependency_version_conflict",
        };
      }
    }
  let Ke = claudeCommand("plugin enable", S);
  let De = Ke ? ` \u2014 enable it with: ${Ke}` : " \u2014 enable it in /plugin";
  let Ie = A.installedDisabled.includes(S)
    ? A.installedDisabledByDefault.includes(S)
      ? `. This plugin is disabled by default${De}`
      : `. This plugin is disabled in your settings${De}`
    : "";
  let Le = !we
    ? ""
    : pe
      ? `. Warning: ${directoryUnreachableMessage()}`
      : `. Warning: ${we} \u2014 installed from the cached catalog, so the version may be stale`;
  let un = describeOtherMarketplaceInstall(S, Z.name, A.copiesInOtherProjects);
  let qe = "";
  let fn;
  if (A.replacedCopies) {
    let K = await finishReplaceSwitch(
      S,
      scope,
      A.replacedCopies,
      {
        newCopyWasJustInstalled: !Oe,
        newCopyWasOn,
        surface: r,
        carrySettingsFrom: p,
      },
      storageV5,
    );
    if (!K.ok)
      return {
        success: false,
        message: K.message,
        failureCode: "replace_failed",
      };
    qe = K.note;
    fn = {
      from: K.from,
      replaced: K.replaced,
      stayedDisabled: K.stayedDisabled,
      keptOwnSettings: K.keptOwnSettings,
      settingsRemovedFrom: K.settingsRemovedFrom,
      ...(K.settingsLeftInPlace && {
        settingsLeftInPlace: K.settingsLeftInPlace,
      }),
      savedDataRemovedFrom: K.savedDataRemovedFrom,
      ...(K.keptDataDir && {
        keptDataDir: K.keptDataDir,
      }),
      ...(K.oldCopyStillRecordedAt.length > 0 && {
        oldCopyStillRecordedAt: K.oldCopyStillRecordedAt,
      }),
      ...((K.saysMore || A.depNote !== "" || Ie !== "" || Le !== "" || un !== "" || P !== "") && {
        messageSaysMore: true,
      }),
    };
  }
  let pluginId_2 = `Successfully installed plugin: ${qe !== "" || un !== "" ? displayPluginId(S) : S} (scope: ${scope})${A.depNote}${Ie}${Le}${qe}${un === "" ? "" : `. ${un}`}${P}`;
  return {
    success: true,
    message: `${pluginId_2}${nothingSwitchedSuffix(u === true && A.replacedCopies === undefined, pluginId_2)}`,
    pluginId: S,
    pluginName: Z.name,
    scope,
    ...(fn && {
      switched: fn,
    }),
  };
}
//@ chunk-pp50kewz.js:36288-36447 layout
function nothingSwitchedSuffix(e, pluginId) {
  return e
    ? `${/[.?]$/.test(pluginId) ? " " : ". "}Nothing was switched: no installed copy of this plugin from another marketplace matched this listing`
    : "";
}
//@ chunk-pp50kewz.js:36447-36519 layout
/**
 * 插件 ID 展示用：截断到 200 字符并去掉不可见字符，全不可见时给占位描述。
 */
function displayPluginId(pluginId) {
  return printableLabel(printableName(pluginId, 200)) || "an id with no visible characters";
}
//@ chunk-pp50kewz.js:36519-36598 layout
function displayFolderName(file) {
  return printableLabel(file) || "a folder with no visible characters in its name";
}
//@ chunk-pp50kewz.js:36598-36663 layout
function describeFolder(e) {
  let n = printableLabel(e);
  return n === "" ? displayFolderName(e) : `the folder ${n}`;
}
//@ chunk-pp50kewz.js:36663-36712 layout
function displayMarketplaceName(e) {
  return e === OFFICIAL_MARKETPLACE_NAME ? marketplaceDisplayName(e) : printableLabel(printableName(e, 64));
}
//@ chunk-pp50kewz.js:36712-36987 layout
function findOtherPluginSharingDataDir(pluginId, n, i = new Set([pluginId])) {
  {
    if (hasFailedInstalledPluginsRead(n))
      return {
        kind: "records-unreadable",
      };
    let lower = pluginDataDirPath(pluginId).toLowerCase();
    let found = Object.keys(n.plugins).find(
      (key) => key !== pluginId && !i.has(key) && pluginDataDirPath(key).toLowerCase() === lower,
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
//@ chunk-pp50kewz.js:36987-37402 layout
/**
 * 卸载时插件数据目录被保留的说明（另一插件共用、或安装列表读不到无法判断）。
 */
function describeKeptDataDir(e, n) {
  return `The data directory of ${displayPluginId(e.pluginId)} was kept: ${e.reason === "another-plugin-uses-it" ? `${e.usedBy === undefined ? "the list of installed plugins could not be read, so another installed plugin may use it" : `${displayPluginId(e.usedBy)} is installed and uses it`}${e.copied ? `; its contents were also copied to ${displayPluginId(n)}` : ""}` : e.reason === "target-had-own" ? `${displayPluginId(n)} already had its own` : "it could not be copied"}`;
}
//@ chunk-pp50kewz.js:37402-37589 layout
function getEnabledValueAtScope(scope, n, i) {
  let enabledPlugins = getSettingsForSourceForUpkeep(scopeToSettingSource(scope))?.enabledPlugins ?? {};
  let pluginName = findPluginName(Object.keys(enabledPlugins), n);
  if (pluginName === undefined || pluginName === n) return enabledPlugins[n];
  return i !== "unknown" &&
    enabledPluginKeys(
      enabledPlugins,
      n,
      i.filter((u) => u !== n),
    ).includes(pluginName)
    ? enabledPlugins[pluginName]
    : undefined;
}
//@ chunk-pp50kewz.js:37589-37631 layout
function dataDirKey(pluginId) {
  return pluginDataDirPath(pluginId).toLowerCase();
}
//@ chunk-pp50kewz.js:37631-42839 layout
/**
 * 卸载后仍残留 local 作用域安装记录时的长说明（列出文件夹、原因与清理命令）。
 */
function describeLeftLocalRecords({ shownId, shownNewId, folders, because }) {
  {
    let o = new Intl.ListFormat("en", {
      type: "conjunction",
    });
    let u = (M, P) => o.format(M.length > 2 ? [...M.slice(0, 2), `${M.length - 2} ${P}`] : M);
    let [h] = folders;
    let p = folders.length !== 1 || h === undefined;
    let r = p
      ? `the folders ${u(folders.map(displayFolderName), "more of this repository")}`
      : describeFolder(h);
    let c = `. ${capitalize(shownId)} is still recorded as installed at local scope from ${r}: ${p ? "those records were" : "that record was"} left, because `;
    let y = `To remove ${p ? "them" : "it"}`;
    let j = p
      ? "start Claude Code in each of those folders and uninstall it there"
      : "start Claude Code in that folder and uninstall it there";
    let T = (M) =>
      M.readsBack === "on"
        ? displayFolderName(M.file)
        : describeUnwritableSettingsSource({
            source: "otherFolder",
            file: M.file,
            readsBack: M.readsBack,
            ...(M.notReadBecause !== undefined && {
              notReadBecause: M.notReadBecause,
            }),
          }).replace(M.file, () => displayFolderName(M.file));
    if (because.kind === "own-local-line")
      return `${c}its line in local settings (.claude/settings.local.json) is still there although its uninstall was to remove it. ${y}, first take that line out of "enabledPlugins" in that file yourself, then ${j}`;
    if (because.kind === "legacy-local-file") {
      let { file } = because;
      let P = file.readsBack === "on";
      let L = P
        ? 'take it out of "enabledPlugins" in that file yourself'
        : file.readsBack === "unreadable"
          ? "fix that file so that it can be read as settings, and switch the plugin off in it if it is on there"
          : "switch it off in that file if it is on there";
      return `${c}${T(file)} ${P ? "still switches it on" : "may still switch it on"} (it is an older local settings file in the folder this session was started in). ${y}, first ${L}, then ${j}. Until then it ${P ? "can load" : "may still load"} beside ${shownNewId}`;
    }
    let I = because.ofTheLaunchFolder.length > 0;
    let w = I && because.ofFolders.length > 0;
    let b = w
      ? [...because.ofTheLaunchFolder, ...because.ofFolders]
      : I
        ? because.ofTheLaunchFolder
        : because.ofFolders;
    let all = b.every((M) => M.readsBack === "on");
    let all_2 = b.every((M) => M.readsBack !== "on");
    let any = b.some((M) => M.readsBack === "unreadable");
    let se = (M) => (M.readsBack === "not-read-here" ? (M.notReadBecause ?? "not-trusted") : M.readsBack);
    let [Ce] = b;
    let X =
      b.length > 1 && Ce !== undefined && all_2 && b.every((M) => se(M) === se(Ce)) ? se(Ce) : undefined;
    let we = all ? "can load" : "may still load";
    let J = b.length === 1 ? "that file" : "those files";
    let D = b.every((M) => M.file.endsWith(join(".claude", "settings.json")))
      ? ` (that uninstall does not edit ${J})`
      : "";
    let ce =
      X === "unreadable"
        ? "they are there and could not be read"
        : X === "network-path"
          ? "not read: they are on a network path or are links to one, or could not be checked"
          : "not read: this workspace is not yet trusted";
    if (w) {
      let M = (B) =>
        X !== undefined || B.readsBack === "on"
          ? ""
          : `; ${T(B).slice(displayFolderName(B.file).length + 2, -1)}`;
      let P = [
        ...because.ofTheLaunchFolder.map(
          (B) => `${displayFolderName(B.file)} (in the folder this session was started in${M(B)})`,
        ),
        ...because.ofFolders
          .slice(0, 2)
          .map((ofFolder) => (X === undefined ? T(ofFolder) : displayFolderName(ofFolder.file))),
        ...(because.ofFolders.length > 2 ? [`${because.ofFolders.length - 2} more`] : []),
      ];
      let L = all ? "still switch it on" : all_2 ? "may still switch it on" : "still switch it on, or may";
      let U = all
        ? "switch it off in each of those files"
        : any
          ? "fix any of those files that cannot be read as settings, and switch it off in each where it is on"
          : "switch it off in each of those files where it is on";
      return `${c}settings files that this session does not read ${L}: ${o.format(P)}${X === undefined ? "" : ` (${ce})`}. ${y}, first ${U}, then ${j}. Until then it ${we} beside ${shownNewId}`;
    }
    if (!I && p) {
      let M = all ? "still switch it on" : all_2 ? "may still switch it on" : "still switch it on, or may";
      let P =
        X === undefined
          ? u(b.map(T), "more")
          : `${u(
              b.map((U) => displayFolderName(U.file)),
              "more",
            )} (${ce})`;
      return `${c}settings files in those folders ${M}: ${P}. ${y}, for each folder first ${`switch it off in its settings file${any ? ", or fix the file if it cannot be read as settings" : all_2 ? " if it is on there" : ""}`}, then start Claude Code in that folder and uninstall it there${D}. Until then it ${we} in those folders beside ${shownNewId}`;
    }
    let ge = o.format(X === undefined ? b.map(T) : b.map((M) => displayFolderName(M.file)));
    let k =
      X === "unreadable"
        ? "are there and could not be read, and may still switch it on"
        : X === "network-path"
          ? "were not read (they are on a network path or are links to one, or could not be checked) and may still switch it on"
          : X === "not-trusted"
            ? "were not read (this workspace is not yet trusted) and may still switch it on"
            : all
              ? b.length === 1
                ? "still switches it on"
                : "still switch it on"
              : all_2
                ? "may still switch it on"
                : "still switch it on, or may";
    let pe = b.length === 1;
    let Ee = all
      ? pe
        ? "switch it off in that file"
        : "switch it off in both files"
      : any
        ? pe
          ? "fix that file so that it can be read as settings, and switch the plugin off in it if it is on there"
          : "fix the file that could not be read so that it can be read as settings, and switch the plugin off in both files where it is on"
        : pe
          ? "switch it off in that file if it is on there"
          : "switch it off in those files where it is on";
    if (I)
      return `${c}in the folder this session was started in ${ge} ${k} (this session reads its settings from another folder, so nothing done from here edits ${J}). ${y}, first ${Ee}, then ${j}. Until then it ${we} beside ${shownNewId}`;
    if (because.sharedCheckout && pe && all)
      return `${c}${ge} ${k}. ${y}: if that is this repository's shared settings file, checked out in that folder too, first switch the plugin off in the repository's settings file and update the other checkouts; otherwise first switch it off in that file; then ${j}. Until then it ${we} in that folder beside ${shownNewId}`;
    return `${c}${ge} ${k}. ${y}, first ${Ee}, then ${j}${D}. Until then it ${we} in that folder beside ${shownNewId}`;
  }
  return "";
}
//@ chunk-pp50kewz.js:42839-43471 layout
function describeSecretStore(pluginId, carriedTo) {
  {
    let i = primarySecureStoreKind();
    return {
      name: quotedPrintable(parsePluginIdentifier(pluginId).name, 120),
      store:
        i === "keychain"
          ? "your keychain (or in the credentials file in your Claude configuration folder)"
          : i === "credential-manager"
            ? "Windows Credential Manager (or in the credentials file in your Claude configuration folder)"
            : "the credentials file in your Claude configuration folder",
      uninstallCommand: runCommandHint("plugin uninstall", pluginId, {
        fallback: `uninstall "${quotedPrintable(pluginId, 200)}" from the command line`,
      }),
      carriedClause: (a) =>
        carriedTo === undefined
          ? ""
          : ` (its settings and stored secrets were also carried over to ${carriedTo}; ${a} the old copies)`,
    };
  }
  return {
    name: "",
    store: "",
    uninstallCommand: "",
    carriedClause: () => "",
  };
}
//@ chunk-pp50kewz.js:43471-45146 layout
/**
 * 无安装记录但上次卸载清理未完成时的说明（残留的密钥存储项、数据目录等）。
 */
function describeUnfinishedCleanup({ pluginId, entry, carriedTo, dataFolder }) {
  {
    let { name: o, store, uninstallCommand, carriedClause } = describeSecretStore(pluginId, carriedTo);
    let r = `. ${capitalize(displayPluginId(pluginId))} has no install record left, but the clean-up after its last uninstall did not finish${carriedClause("what may be left are")}: `;
    if (entry === "held")
      return `${r}its settings and stored secrets or its data folder may still be there, and "${o}" may still be tied to the repository it came from. To finish it, ${uninstallCommand}`;
    let c =
      dataFolder === "may-go"
        ? `${r}its settings may still be under "pluginConfigs" in your user settings file, its stored secrets in ${store}, and its data folder (${displayFolderName(pluginDataDirPath(pluginId))}) may still be there. No command removes them for this id yet; you can take that entry out and delete that folder yourself; the stored secrets stay`
        : dataFolder === "not-known"
          ? `${r}its settings may still be under "pluginConfigs" in your user settings file, its stored secrets in ${store}, and its data folder (${displayFolderName(pluginDataDirPath(pluginId))}) may still be there. No command removes them for this id yet; you can take that entry out yourself; leave the data folder until the install records can be read again, because another installed plugin may use it; the stored secrets stay`
          : `${r}its settings may still be under "pluginConfigs" in your user settings file, and its stored secrets in ${store}. No command removes them for this id yet; you can take that entry out yourself; the stored secrets stay`;
    return entry === "none"
      ? `${c}. Nothing ties "${o}" to the repository it came from, so a plugin installed under that name later could read what is left`
      : entry === "unreadable"
        ? `${c}. plugin-directory-bindings.json in the plugins folder could not be used, so "${o}" cannot be installed again until that file can be used`
        : c;
  }
  return "";
}
//@ chunk-pp50kewz.js:45146-46442 layout
/**
 * 移除安装记录后清理残留时的说明文本。
 */
function describeLeftRecordCleanup({ pluginId, folder, entry, carriedTo, dataFolder }) {
  {
    let { name: u, store, uninstallCommand, carriedClause } = describeSecretStore(pluginId, carriedTo);
    let c = `. After Claude Code tried to remove the record of ${displayPluginId(pluginId)} for ${describeFolder(folder)}, the install records could not be read, so it is not known whether that record went or whether the plugin is still installed anywhere, and what the plugin saved was left in place${carriedClause("what is left are")}`;
    if (entry === "held")
      return `${c}. If it is installed nowhere any more, ${uninstallCommand} to remove what it saved and free its name`;
    let y = dataFolder !== "in-use";
    return `${c}: its settings under "pluginConfigs" in your user settings file, ${y ? `its stored secrets in ${store}, and its data folder (${displayFolderName(pluginDataDirPath(pluginId))})` : `and its stored secrets in ${store}`}.${entry === "unreadable" ? ` plugin-directory-bindings.json in the plugins folder could not be used, so "${u}" cannot be installed again until that file can be used.` : ""} If it is installed nowhere any more, no command removes them for this id yet; you can take that entry out yourself; ${y ? "leave the data folder until the install records can be read again, because another installed plugin may use it; " : ""}the stored secrets stay${entry === "none" ? `. Nothing ties "${u}" to the repository it came from, so a plugin installed under that name later could read what is left` : ""}`;
  }
  return "";
}
//@ chunk-pp50kewz.js:46442-47492 layout
/**
 * 找出哪些 settings.local.json（本会话目录、其他仓库目录）仍提到该插件，供卸载提示使用。
 */
async function findLocalSettingsMentions(pluginId, n, { installedOthers, launchFolderToo, ownLocalFileToo }) {
  {
    let u = {
      kind: "by-files",
      ofTheLaunchFolder: [],
      ofFolders: new Map(),
      launchProjectFileOn: undefined,
    };
    let h = await scanSettingsForPluginUninstall(
      pluginId,
      installedOthers,
      launchFolderToo === undefined ? n : [...n, launchFolderToo],
      {
        theSessions: getSettingsFilePathForSource("localSettings"),
        byAFreshWalk: join(getRepoRootOrCwd(), ".claude", "settings.local.json"),
      },
    );
    if (ownLocalFileToo && h.thisLaunchsLocalFile !== undefined)
      return {
        kind: "own-local-file",
        readsBack: h.thisLaunchsLocalFile,
        theSessionsOwn: true,
      };
    if (ownLocalFileToo && h.thisLaunchsLocalFileByAFreshWalk !== undefined)
      return {
        kind: "own-local-file",
        readsBack: h.thisLaunchsLocalFileByAFreshWalk,
        theSessionsOwn: false,
      };
    if (ownLocalFileToo && h.thisLaunchsLegacyLocalFile !== undefined)
      return {
        kind: "own-legacy-local-file",
        file: h.thisLaunchsLegacyLocalFile,
      };
    let p = (r) =>
      (h.byFolder.get(r) ?? []).filter(
        (c) => c.alsoThisLaunchs !== "localSettings" && c.alsoThisLaunchs !== "legacyLocalSettings",
      );
    if (launchFolderToo !== undefined) u.ofTheLaunchFolder = p(launchFolderToo);
    for (let r of n) {
      let c = p(r);
      if (c.length > 0) u.ofFolders.set(r, c);
    }
    u.launchProjectFileOn = h.thisLaunchsProjectFileOn;
    return u;
  }
  return {
    kind: "by-files",
    ofTheLaunchFolder: [],
    ofFolders: new Map(),
    launchProjectFileOn: undefined,
  };
}
//@ chunk-pp50kewz.js:47492-47607 layout
function isSameRepoPathMoved(file, n) {
  if (realpathAllowMissing(file)) return false;
  let gitRootUncached = findGitRootUncached(dirname(file));
  let gitRootUncached_2 = findGitRootUncached(dirname(n));
  return (
    gitRootUncached !== null &&
    gitRootUncached_2 !== null &&
    gitRootUncached !== gitRootUncached_2 &&
    relative(gitRootUncached, file) === relative(gitRootUncached_2, n)
  );
}
//@ chunk-pp50kewz.js:47607-48061 layout
async function checkDirectoryBindingPersistable(pluginId) {
  {
    let n = await persistDirectoryBinding(pluginId, getInstalledPlugins().plugins[pluginId]);
    return n === "not-persisted"
      ? "plugin-directory-bindings.json in the plugins folder could not be used or written, so nothing would keep the name for the repository it was installed from: once the file can be written, switch again"
      : n === "cannot-hold"
        ? "its id is too long for plugin-directory-bindings.json to hold, so nothing would keep the name for the repository it was installed from"
        : undefined;
  }
  return;
}
//@ chunk-pp50kewz.js:48061-48100 layout
function getRepoRootOrCwd() {
  return getProjectConfigRoot() ?? resolveLocalSettingsStoreRoot(getOriginalCwd(), uncachedStorageRootFor);
}
//@ chunk-pp50kewz.js:48100-48294 layout
function isInstallationForThisRepo(e) {
  {
    let originalCwd = getOriginalCwd();
    let projectPath = e.projectPath;
    if (projectPath !== undefined && projectPath !== originalCwd && realpathAllowMissing(projectPath))
      return false;
    if (!isInstallationRelevantToCurrentProject(e)) return false;
    if (projectPath === undefined || projectPath === originalCwd) return true;
    let a = uncachedStorageRootFor(originalCwd);
    return (
      a !== null &&
      uncachedStorageRootFor(projectPath) === a &&
      resolveLocalSettingsStoreRoot(projectPath, uncachedStorageRootFor) === getRepoRootOrCwd()
    );
  }
  return false;
}
//@ chunk-pp50kewz.js:48294-70928 layout
/**
 * --replace 切换到另一个市场的同名插件之后的收尾：迁移启用状态与插件选项、禁用/卸载旧副本，生成结果说明。
 */
async function finishReplaceSwitch(
  e,
  scope,
  i,
  { newCopyWasJustInstalled, newCopyWasOn, surface, carrySettingsFrom },
  storageV5,
) {
  {
    let r = displayPluginId(e);
    let c =
      i.find((s) => s.pluginId === carrySettingsFrom) ??
      i.find(
        (s) => locatePluginInstall(s.pluginId, undefined, groupedEnabledPlugins()).effective !== false,
      ) ??
      i[0];
    let y = displayPluginId(c.pluginId);
    let j = new Intl.ListFormat("en", {
      type: "conjunction",
    });
    let T = {
      head: 200,
      tail: 200,
    };
    let I = j.format(i.map((s) => displayPluginId(s.pluginId)));
    let w = i.length > 1;
    let b = `${I} ${w ? "are" : "is"} still installed`;
    let _e = {
      fromPluginId: c.pluginId,
      toPluginId: e,
      surface,
      managedNames: policyEnabledPluginNameSet(),
    };
    let gitCommitSha = getInstalledPlugins().plugins[e]?.find(
      (s) => s.scope === scope && isInstallationRelevantToCurrentProject(s),
    )?.gitCommitSha;
    let pinChanged =
      c.gitCommitSha !== undefined && gitCommitSha !== undefined && c.gitCommitSha !== gitCommitSha;
    let se = locatePluginInstall(c.pluginId, undefined, groupedEnabledPlugins());
    let X = se.effective === false && !newCopyWasOn;
    let we = async () => {
      let scope_2 = findPluginInSettings(e)?.scope;
      let decidingScope = se.decidingScope === "project" && scope !== "project" ? "local" : se.decidingScope;
      let v =
        decidingScope !== undefined &&
        (scope_2 === undefined || SCOPE_PRECEDENCE[decidingScope] >= SCOPE_PRECEDENCE[scope_2])
          ? decidingScope
          : undefined;
      let G = await disablePluginOp(e, v, storageV5).catch(() => ({
        success: false,
        message: "",
      }));
      return G.success || G.alreadyInGoalState === true;
    };
    let {
      optionsCarried,
      secretsCarried,
      oldDataDirDisposable,
      dataDirCopied,
      targetHadOwn,
      dataDirKeptReason,
    } = await copyPluginOptions(c.pluginId, e, copyDir, storageV5);
    let Ee = dataDirKey(e);
    let M = dataDirKey(c.pluginId);
    let P;
    let L = false;
    let U = (s) => {
      if (!oldDataDirDisposable || M === Ee) return false;
      let otherPluginSharingDataDir = findOtherPluginSharingDataDir(
        c.pluginId,
        s,
        new Set(
          i.flatMap((v) => (v === c || (s.plugins[v.pluginId]?.length ?? 0) === 0 ? [v.pluginId] : [])),
        ),
      );
      P = otherPluginSharingDataDir.kind === "nobody" ? undefined : otherPluginSharingDataDir;
      return otherPluginSharingDataDir.kind === "nobody";
    };
    let B;
    if (!optionsCarried || !secretsCarried) {
      let joined = [
        ...(optionsCarried ? [] : ["option values"]),
        ...(secretsCarried ? [] : ["stored secrets"]),
      ].join(" and ");
      B = {
        fromPluginId: c.pluginId,
        rollBack: newCopyWasJustInstalled,
        rolledBack: `Could not switch: the ${joined} of ${y} could not be copied to ${r}. ${capitalize(b)} and ${r} was uninstalled again. Plugins that were installed with it as its dependencies, if any, stay installed`,
        bothInstalled: w
          ? `${capitalize(r)} is installed, but the ${joined} of ${y} could not be copied to it, so nothing was uninstalled. ${capitalize(b)} beside it until you switch again or uninstall them`
          : `${capitalize(r)} is installed, but the ${joined} of ${y} could not be copied to it, so ${y} was not uninstalled. Both are installed until you switch again or uninstall ${y}`,
      };
    }
    let me = [];
    let N = (s) =>
      s === "unknown"
        ? s
        : uniq([...s, ...me.flatMap((_) => (_.record === undefined ? [] : [_.copy.pluginId]))]);
    let Z = [];
    let S = new Set();
    let he = new Map();
    let re;
    let Oe;
    let ae = new Set();
    let Ge = new Set();
    let A = listInstalledPluginIds(getInstalledPlugins());
    let Ke =
      B !== undefined
        ? []
        : i.flatMap((s) =>
            ["user", "local"].map((_) => ({
              scope: _,
              id: s.pluginId,
              value: getEnabledValueAtScope(_, s.pluginId, A),
            })),
          );
    let De = (copy, oldScope) => {
      let filtered = (getInstalledPlugins().plugins[copy.pluginId] ?? []).filter(
        (Pe) => Pe.scope === oldScope,
      );
      let found = filtered.find(isInstallationRelevantToCurrentProject);
      let projectPathForScope = getProjectPathForScope(oldScope);
      let de =
        projectPathForScope === undefined
          ? found
          : filtered.find(
              (Pe) => Pe.projectPath === projectPathForScope && isInstallationRelevantToCurrentProject(Pe),
            );
      let Je = new Set([projectPathForScope]);
      let otherFolders =
        oldScope !== "local" || de === undefined
          ? []
          : filtered.filter((Pe) => {
              if (Je.has(Pe.projectPath)) return false;
              Je.add(Pe.projectPath);
              return isInstallationForThisRepo(Pe);
            });
      return {
        anyRecordHere: found,
        launchFolder: projectPathForScope,
        record: de,
        otherFolders,
      };
    };
    let flattened = [c, ...i.filter((s) => s !== c)].flatMap((s) =>
      s.scopes.flatMap((scope) =>
        scope === "managed"
          ? []
          : [
              {
                copy: s,
                oldScope: scope,
              },
            ],
      ),
    );
    let Le = (oldScope, projectPath) =>
      `it was installed at ${oldScope} scope from the folder ${projectPath}: start Claude Code in that folder and switch there`;
    for (let { copy, oldScope } of B !== undefined ? [] : flattened) {
      let { anyRecordHere, record } = De(copy, oldScope);
      if (record === undefined && anyRecordHere?.projectPath) {
        re = {
          copy,
          scope: oldScope,
          message: Le(oldScope, anyRecordHere.projectPath),
        };
        break;
      }
    }
    let un = new Map();
    let projectConfigRoot = getProjectConfigRoot();
    let launchFolderToo =
      projectConfigRoot !== null && resolve(projectConfigRoot) !== resolve(getOriginalCwd())
        ? getOriginalCwd()
        : undefined;
    let vn = (plugins, pluginId) =>
      bindingKeysFor(plugins, pluginId).flatMap(([v, G]) => (v !== pluginId && G.length > 0 ? [v] : []));
    for (let s of B !== undefined || re !== undefined ? [] : i) {
      let plugins = getInstalledPlugins().plugins;
      let otherFolders = s.scopes.includes("local") ? De(s, "local").otherFolders : [];
      let flattened = otherFolders.flatMap((otherFolder) => otherFolder.projectPath ?? []);
      let oe =
        flattened.length === 0
          ? undefined
          : await findLocalSettingsMentions(s.pluginId, flattened, {
              installedOthers: vn(plugins, s.pluginId),
              launchFolderToo,
              ownLocalFileToo: false,
            }).catch((error) => errorMessage(error));
      if (typeof oe === "string") {
        re = {
          copy: s,
          scope: "local",
          message: oe,
        };
        break;
      }
      un.set(s, {
        records: [...(plugins[s.pluginId] ?? [])],
        otherFolders,
        judged: oe,
      });
    }
    for (let [s, { otherFolders: _ }] of re !== undefined ? [] : un) {
      let v =
        _.length > 0 && isOfficialPluginDirectoryId(s.pluginId)
          ? await checkDirectoryBindingPersistable(s.pluginId).catch((error) => errorMessage(error))
          : undefined;
      if (v !== undefined) {
        re = {
          copy: s,
          scope: "local",
          message: v,
        };
        break;
      }
    }
    let tn = new Map();
    for (let { copy, oldScope } of B !== undefined || re !== undefined ? [] : flattened) {
      let { anyRecordHere, launchFolder, record } = De(copy, oldScope);
      let de = Ke.find((Pe) => Pe.id === copy.pluginId && Pe.scope === oldScope)?.value;
      let Je = copy === c && U(getInstalledPlugins());
      L ||= Je;
      let Me = await uninstallPluginOp(copy.pluginId, oldScope, Je, storageV5, {
        settingsStillOn: "remove-anyway",
      }).catch((error) => ({
        success: false,
        message: errorMessage(error),
      }));
      if (Me.success) {
        me.push({
          copy,
          scope: oldScope,
          record,
          enabledValue: de,
        });
        tn.set(copy, record?.installPath);
        if (Me.directoryNameNote) Z.push([copy.pluginId, Me.directoryNameNote]);
        if (Me.optionsRemoved) S.add(copy);
        if (Me.savedKept !== undefined) Ge.add(copy);
        else Ge.delete(copy);
        if (Me.dataFolderUser !== undefined) he.set(copy, Me.dataFolderUser);
        if ((getInstalledPlugins().plugins[copy.pluginId]?.length ?? 0) === 0) ae.add(copy);
      } else {
        let Pe = !getInstalledPlugins().plugins[copy.pluginId]?.some(
          (je) =>
            je.scope === oldScope &&
            (record === undefined || launchFolder === undefined
              ? isInstallationRelevantToCurrentProject(je)
              : je.projectPath === launchFolder),
        );
        let Ae = Me.failureCode === "not_installed" || Me.failureCode === "not_installed_at_scope";
        if (Ae && (anyRecordHere === undefined || Pe)) continue;
        re = {
          copy,
          scope: oldScope,
          message:
            Ae && record === undefined && anyRecordHere?.projectPath
              ? Le(oldScope, anyRecordHere.projectPath)
              : Me.message,
        };
        if (record !== undefined && Pe)
          me.push({
            copy,
            scope: oldScope,
            enabledValue: de,
            record,
          });
        else if (anyRecordHere !== undefined) Oe = de;
        break;
      }
    }
    if (re !== undefined) {
      let installedPlugins = getInstalledPlugins();
      let _ = N(listInstalledPluginIds(installedPlugins));
      let v = (installedPlugins.plugins[c.pluginId]?.length ?? 0) === 0;
      let G = [];
      let oe = [];
      let de = async (scope, ln, Pn) => {
        try {
          return (
            (
              await updateSettingsForSourceWithTransform(
                scopeToSettingSource(scope),
                (In) => ({
                  enabledPlugins: {
                    ...In?.enabledPlugins,
                    [ln]: Pn,
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
      let Je = (scope, id) =>
        `the "enabledPlugins" line in ${scope} settings that turned ${displayPluginId(id)} off there (if you want it off, disable it in /plugin)`;
      let Me = new Set();
      let pluginId = re.copy.pluginId;
      let Ae =
        Oe !== undefined && getEnabledValueAtScope(re.scope, pluginId, _) === undefined ? Oe : undefined;
      for (let ke of Ke.filter((ln) => ln.value === false))
        if (getEnabledValueAtScope(ke.scope, ke.id, _) !== false && !(await de(ke.scope, ke.id, false))) {
          Me.add(ke.id);
          oe.push(Je(ke.scope, ke.id));
        }
      for (let ke of me) {
        let { record, enabledValue } = ke;
        let In =
          record !== undefined &&
          (await addInstalledPlugin(
            ke.copy.pluginId,
            {
              ...record,
              version: record.version ?? "unknown",
              installedAt: record.installedAt ?? new Date().toISOString(),
            },
            ke.scope,
            record.projectPath,
            storageV5,
          ).then(
            () => true,
            () => false,
          ));
        let It =
          enabledValue === undefined ||
          enabledValue === false ||
          !In ||
          (!Me.has(ke.copy.pluginId) && (await de(ke.scope, ke.copy.pluginId, enabledValue)));
        if (!In) G.push(`${displayPluginId(ke.copy.pluginId)} (${ke.scope} scope)`);
        else if (!It)
          oe.push(
            `the "enabledPlugins" line for ${displayPluginId(ke.copy.pluginId)} in ${ke.scope} settings${Me.has(ke.copy.pluginId) ? " (left out, because the line that turned it off could not be put back; if you want it on, enable it in /plugin)" : ""}`,
          );
      }
      if (Ae !== undefined && Ae !== false && !(!Me.has(pluginId) && (await de(re.scope, pluginId, Ae))))
        oe.push(
          `the "enabledPlugins" line for ${displayPluginId(pluginId)} in ${re.scope} settings${Me.has(pluginId) ? " (left out, because the line that turned it off could not be put back; if you want it on, enable it in /plugin)" : ""}`,
        );
      if (ae.has(c) || (v && me.some((ke) => ke.copy === c))) {
        let ke = await copyPluginOptions(e, c.pluginId, copyDir, storageV5).catch(() => ({
          optionsCarried: false,
          secretsCarried: false,
          targetHadOwn: false,
          dataDirCopied: false,
        }));
        if (!ke.optionsCarried || !ke.secretsCarried)
          G.push(`the option values and stored secrets of ${y} (they are under ${r})`);
        else if (targetHadOwn && !ke.targetHadOwn)
          G.push(`the option values ${y} had (${r} already had its own, and ${y} now has those)`);
        if (dataDirCopied && !ke.dataDirCopied) {
          if (!(await pathExists(pluginDataDirPath(c.pluginId))))
            G.push(`the data directory of ${y} (it is under ${r})`);
          else if (L)
            G.push(
              `the data directory of ${y} (what is left of it may be incomplete; the whole copy is under ${r})`,
            );
        }
      }
      refreshPluginCaches(storageV5);
      let filtered = i.filter((ke) => ke !== c && ke !== re.copy && ae.has(ke) && !Ge.has(ke));
      let Ne = [...G, ...oe];
      let en = j.format(filtered.map((ke) => displayPluginId(ke.pluginId)));
      let pn = `they were deleted when ${filtered.length === 1 ? "that plugin was" : "those plugins were"} uninstalled and have to be entered again`;
      let mn =
        me.length === 0 && Ne.length === 0
          ? ""
          : Ne.length > 0
            ? ` Could not be put back: ${j.format(Ne)}.${filtered.length > 0 ? ` The settings and stored secrets saved for ${en} did not come back either: ${pn}.` : ""}`
            : ` What had been uninstalled was put back${filtered.length > 0 ? `, except the settings and stored secrets saved for ${en}: ${pn}` : ""}.`;
      let message = re.message;
      let Un = printableLabel(
        printableName(
          message.length > 1000
            ? `${truncateToLength(message, 500)} \u2026 ${takeLastChars(message, 500)}`
            : message,
          1100,
        ),
        T,
      );
      let Fn = Un === "" ? "" : ` (${Un})`;
      B = {
        fromPluginId: re.copy.pluginId,
        rollBack: G.length === 0 && newCopyWasJustInstalled,
        rolledBack: `Could not switch: ${displayPluginId(re.copy.pluginId)} could not be uninstalled${Fn}.${mn} ${capitalize(b)} and ${r} was uninstalled again. Plugins that were installed with it as its dependencies, if any, stay installed`,
        bothInstalled: w
          ? `${capitalize(r)} is installed, but ${displayPluginId(re.copy.pluginId)} could not be uninstalled at ${re.scope} scope${Fn}.${mn} Uninstall ${G.length > 0 ? "what is left of them" : I} to finish the switch`
          : `${capitalize(r)} is installed, but ${y} could not be uninstalled at ${re.scope} scope${Fn}.${mn} Both are installed until you uninstall ${y}`,
      };
    }
    if (B !== undefined) {
      logMarketplaceSwitch({
        ..._e,
        fromPluginId: B.fromPluginId,
        result: {
          outcome: "bad",
          code: "replace_failed",
        },
      });
      let s = async (bothInstalled) => {
        if (!X)
          return {
            ok: false,
            message: bothInstalled,
          };
        let G = await we().catch(() => false);
        return {
          ok: false,
          message: `${bothInstalled}. ${G ? `${capitalize(r)} was turned off, as ${y} was` : `${capitalize(y)} was disabled, but ${r} could not be disabled \u2014 disable it in /plugin`}`,
        };
      };
      if (!B.rollBack) return s(B.bothInstalled);
      let _ = await uninstallPluginOp(e, scope, false, storageV5, {
        settingsStillOn: "remove-anyway",
      }).catch((error) => ({
        success: false,
        message: errorMessage(error),
      }));
      if (_.success && dataDirCopied) {
        let v = listInstalledPluginIds(await loadInstalledPlugins(storageV5));
        if (v !== "unknown" && !v.some((G) => dataDirKey(G) === Ee))
          await removeDirectoryTreeNoFollow(pluginDataDirPath(e)).catch((error) => {
            logForDebugging(
              `Switch to ${e}: could not remove the data directory that the switch had copied: ${errorMessage(error)}`,
              {
                level: "warn",
              },
            );
          });
      }
      return _.success || _.failureCode === "not_installed"
        ? {
            ok: false,
            message: B.rolledBack,
          }
        : s(B.bothInstalled);
    }
    let K = X && (await we().catch(() => false));
    let q = [];
    let ie = [];
    let V = new Set();
    for (let s of Ge) {
      V.add(s.pluginId);
      ie.push(
        `. The settings and stored secrets of ${displayPluginId(s.pluginId)} were left in place because the list of installed plugins could not be read`,
      );
    }
    if (Ge.size > 0)
      ie.push(`. To delete what was left in place, ${manualCleanupHint(Ge.size === 1 ? "its" : "their")}`);
    let He = async (s) => {
      let _ = dataDirKey(s.pluginId);
      if ([Ee, M].includes(_)) return;
      let v = listInstalledPluginIds(await loadInstalledPlugins(storageV5));
      let G = v === "unknown" ? undefined : v.find((de) => dataDirKey(de) === _);
      if (v === "unknown" || G !== undefined) {
        if (G !== s.pluginId && (await pathExists(pluginDataDirPath(s.pluginId))))
          ie.push(
            `. The saved data of ${displayPluginId(s.pluginId)} was left in place because ${G === undefined ? "the list of installed plugins could not be read" : `${displayPluginId(G)} is installed and uses it`}`,
          );
        return;
      }
      if (
        (await deletePluginDataDir(s.pluginId).catch((error) => {
          logForDebugging(
            `Switch to ${e}: could not remove the data directory of ${s.pluginId}: ${errorMessage(error)}`,
            {
              level: "warn",
            },
          );
          return "failed";
        })) === "removed"
      )
        q.push(s.pluginId);
    };
    let R = async (s, installPath, v, G) => {
      let oe = listInstalledPluginIds(v);
      let de = dataDirKey(s.pluginId);
      let deleteDataDir =
        s === c
          ? U(v)
          : isOfficialPluginDirectoryId(s.pluginId) &&
            ![Ee, M].includes(de) &&
            oe !== "unknown" &&
            !oe.some((en) => dataDirKey(en) === de);
      let { dataDirKept, directoryBindingKept } = await cleanupAfterUninstall({
        pluginId: s.pluginId,
        installPath,
        deleteDataDir,
        scope: s.scopes.filter(isInstallableScope).at(-1) ?? scope,
        storageV5,
        registry: v,
        installedOthers: oe === "unknown" ? [] : vn(v.plugins, s.pluginId),
      });
      let index = Z.findIndex(([en]) => en === s.pluginId);
      if (directoryBindingKept?.installsUnknown === true && Q.has(s) && S.has(s)) {
        let en = he.get(s);
        let any = i.some((mn) => mn !== s && mn.pluginId === en && (ae.has(mn) || Fe.includes(mn)));
        if (any && index !== -1) Z.splice(index, 1);
        if ((index === -1 || any) && G)
          ie.push(
            `. The saved data of ${displayPluginId(s.pluginId)} was left in place because the list of installed plugins could not be read`,
          );
        return {
          stillSwitchedOn: false,
        };
      }
      let je = directoryReleaseNote(directoryBindingKept);
      let Ne = je === "" ? [] : [[s.pluginId, je]];
      if (index === -1) Z.push(...Ne);
      else Z.splice(index, 1, ...Ne);
      if (directoryBindingKept !== undefined && !directoryBindingKept.optionsGone) V.add(s.pluginId);
      else V.delete(s.pluginId);
      if (
        s !== c &&
        G &&
        !dataDirKept &&
        (directoryBindingKept === undefined || directoryBindingKept.dataGone)
      )
        q.push(s.pluginId);
      return {
        stillSwitchedOn: directoryBindingKept?.stillOnIn !== undefined,
      };
    };
    let Q = new Set(ae);
    let x = [];
    let ue = new Map();
    let fe = new Map();
    let ze = new Map();
    let Se = new Map();
    let Fe = [];
    let Ye = new Map();
    let sn = new Map();
    let an = async (installedPlugins) => {
      let installedPlugins_2 = await loadInstalledPlugins(storageV5);
      return listInstalledPluginIds(installedPlugins_2) === "unknown" ? installedPlugins : installedPlugins_2;
    };
    let Ue = async (s, installPath, v) => {
      let G = await pathExists(pluginDataDirPath(s.pluginId));
      let oe = await R(s, installPath, v, G)
        .catch(() => R(s, undefined, v, G))
        .catch((error) => {
          logForDebugging(
            `Switch to ${e}: could not finish removing what ${s.pluginId} saved: ${errorMessage(error)}`,
            {
              level: "warn",
            },
          );
          return "rejected-twice";
        });
      if (oe === "rejected-twice") {
        Fe.push(s);
        V.add(s.pluginId);
        return;
      }
      ae.add(s);
      Se.set(s, oe.stillSwitchedOn);
      if (s !== c && !isOfficialPluginDirectoryId(s.pluginId)) await He(s);
    };
    for (let s of i) {
      let _ = un.get(s);
      let judged = _?.judged;
      let records = _?.records ?? [];
      let oe = ue.get(s) ?? [];
      let de;
      if (judged?.kind === "by-files" && judged.ofTheLaunchFolder.length > 0) {
        de = "launch-folder-files";
        fe.set(s, judged.ofTheLaunchFolder);
      }
      let Je = tn.get(s);
      let Me;
      for (let Ae of _?.otherFolders ?? []) {
        let projectPath = Ae.projectPath;
        if (projectPath === undefined) continue;
        let Ne = (because, Hn = [], launchProjectFileOn) => {
          let [Ct] = Hn;
          oe.push({
            folder: projectPath,
            because,
            files: Hn,
            sharedCheckout:
              launchProjectFileOn !== undefined &&
              Hn.length === 1 &&
              Ct?.readsBack === "on" &&
              isSameRepoPathMoved(Ct.file, launchProjectFileOn),
          });
        };
        let en = judged?.kind === "by-files" ? judged.ofFolders.get(projectPath) : undefined;
        if (en !== undefined && judged?.kind === "by-files") {
          Ne("own-files", en, judged.launchProjectFileOn);
          continue;
        }
        if (de !== undefined) {
          Ne(de);
          continue;
        }
        if (Ye.has(s)) {
          Ne("a-failed-read");
          continue;
        }
        let installedPlugins = await loadInstalledPlugins(storageV5);
        if (listInstalledPluginIds(installedPlugins) === "unknown") {
          Ne("a-failed-read");
          continue;
        }
        Me = installedPlugins;
        let mn = installedPlugins.plugins[s.pluginId] ?? [];
        if (!mn.some((nn) => nn.scope === "local" && nn.projectPath === projectPath)) continue;
        let rn = await findLocalSettingsMentions(s.pluginId, [projectPath], {
          installedOthers: vn(installedPlugins.plugins, s.pluginId),
          launchFolderToo,
          ownLocalFileToo: true,
        }).catch(() => "threw");
        if (rn === "threw") {
          de = "a-failed-read";
          Ne("a-failed-read");
          continue;
        }
        if (rn.kind === "own-local-file") {
          de = rn.readsBack === "on" && rn.theSessionsOwn ? "own-local-line" : "own-local-file-unsure";
          Ne(de);
          continue;
        }
        if (rn.kind === "own-legacy-local-file") {
          de = "own-legacy-local-file";
          ze.set(s, rn.file);
          Ne("own-legacy-local-file");
          continue;
        }
        let Un = rn.ofTheLaunchFolder.length > 0;
        if (Un) {
          de = "launch-folder-files";
          fe.set(s, rn.ofTheLaunchFolder);
        }
        let Fn = rn.ofFolders.get(projectPath);
        if (Fn !== undefined) {
          Ne("own-files", Fn, rn.launchProjectFileOn);
          continue;
        }
        if (Un) {
          Ne("launch-folder-files");
          continue;
        }
        if (
          isOfficialPluginDirectoryId(s.pluginId) &&
          !mn
            .filter((nn) => !(nn.scope === "local" && nn.projectPath === projectPath))
            .some(hasDirectoryRepositoryKey)
        ) {
          let nn = await persistDirectoryBinding(s.pluginId, [...mn, ...records]).catch(
            () => "not-persisted",
          );
          if (!(
            nn === "held" ||
            (nn === "no-key" && !records.some((record) => record.directoryRepositoryKey))
          )) {
            Ne("hold-not-proven");
            continue;
          }
        }
        let ke = await removePluginInstallation(s.pluginId, "local", projectPath, storageV5, {
          installPath: Ae.installPath,
          lastUpdated: Ae.lastUpdated,
        }).then(
          (nn) => nn !== false,
          () => false,
        );
        let ln = async () => {
          let installedPlugins = await loadInstalledPlugins(storageV5);
          return listInstalledPluginIds(installedPlugins) === "unknown" ? "unknown" : installedPlugins;
        };
        let Pn = await ln();
        let In = Pn === "unknown" && ke ? await ln() : Pn;
        if (In === "unknown") {
          if (ke)
            Ye.set(s, {
              folder: projectPath,
              installPath: Ae.installPath,
            });
          else Ne("a-failed-read");
          continue;
        }
        Me = In;
        if (
          (In.plugins[s.pluginId] ?? []).some((nn) => nn.scope === "local" && nn.projectPath === projectPath)
        )
          Ne("not-removed");
        else if (ke) {
          x.push({
            copy: s,
            folder: projectPath,
          });
          Je = Ae.installPath;
        }
      }
      if (oe.length > 0) ue.set(s, oe);
      sn.set(s, Je);
      if (ae.has(s) || Ye.has(s)) continue;
      let Pe = await an(x.some((Ae) => Ae.copy === s) ? Me : undefined);
      if (Pe === undefined || (Pe.plugins[s.pluginId]?.length ?? 0) > 0) continue;
      await Ue(s, Je, Pe);
    }
    let installedPlugins = await loadInstalledPlugins(storageV5);
    let ye = listInstalledPluginIds(installedPlugins);
    for (let [s, { folder: _, installPath: v }] of [...Ye]) {
      if (ye === "unknown") continue;
      Ye.delete(s);
      if (
        (installedPlugins.plugins[s.pluginId] ?? []).some(
          (oe) => oe.scope === "local" && oe.projectPath === _,
        )
      ) {
        ue.set(s, [
          ...(ue.get(s) ?? []),
          {
            folder: _,
            because: "not-removed",
            files: [],
            sharedCheckout: false,
          },
        ]);
        continue;
      }
      x.push({
        copy: s,
        folder: _,
      });
      sn.set(s, v);
    }
    if (ye !== "unknown") {
      for (let s of i)
        if ((installedPlugins.plugins[s.pluginId]?.length ?? 0) === 0 && !ae.has(s) && !Fe.includes(s)) {
          let _ = (await an(installedPlugins)) ?? installedPlugins;
          if ((_.plugins[s.pluginId]?.length ?? 0) > 0) continue;
          await Ue(s, sn.get(s), _);
        }
    }
    let joined = i
      .map((s) => {
        let flattened = x.flatMap(({ copy, folder }) => (copy === s ? [displayFolderName(folder)] : []));
        let v = flattened.length - 2;
        return flattened.length === 0
          ? ""
          : `. Claude Code had also recorded ${displayPluginId(s.pluginId)} as installed from ${j.format(v > 0 ? [...flattened.slice(0, 2), `${v} more ${plural(v, "folder")} of this repository`] : flattened)} (it does so when it is started there); ${flattened.length === 1 ? "that record was" : "those records were"} removed too`;
      })
      .join("");
    let Te = (s) =>
      uniq(
        (installedPlugins.plugins[s.pluginId] ?? []).flatMap((_) =>
          _.scope === "local" && _.projectPath !== undefined && isInstallationForThisRepo(_)
            ? [_.projectPath]
            : [],
        ),
      );
    let Ze = new Set(["own-local-line", "own-legacy-local-file", "launch-folder-files", "own-files"]);
    let Ve = new Map();
    let gn = new Set();
    let joined_2 = i
      .map((s) => {
        let _ = Te(s);
        let filtered = (ue.get(s) ?? []).filter(
          ({ folder, because }) => Ze.has(because) && (ye === "unknown" || _.includes(folder)),
        );
        Ve.set(
          s,
          filtered.map(({ folder }) => folder),
        );
        let G = (...Ne) => filtered.flatMap(({ folder, because }) => (Ne.includes(because) ? [folder] : []));
        let oe = ze.get(s);
        let flattened = filtered.flatMap(({ because, files }) => (because === "own-files" ? files : []));
        let filtered_2 = filtered.filter(({ because }) =>
          ["launch-folder-files", "own-files"].includes(because),
        );
        let Me = filtered_2.length === 0 ? [] : (fe.get(s) ?? []);
        if ([...Me, ...flattened.slice(0, 2)].some((Ne) => Ne.alsoThisLaunchs === "projectSettings"))
          gn.add(s);
        let [Ae] = filtered_2;
        let je = (Ne, because) =>
          Ne.length === 0
            ? ""
            : describeLeftLocalRecords({
                shownId: displayPluginId(s.pluginId),
                shownNewId: r,
                folders: Ne,
                because,
              });
        return [
          je(G("own-local-line"), {
            kind: "own-local-line",
          }),
          oe === undefined
            ? ""
            : je(G("own-legacy-local-file"), {
                kind: "legacy-local-file",
                file: oe,
              }),
          je(G("launch-folder-files", "own-files"), {
            kind: "files",
            ofTheLaunchFolder: Me,
            ofFolders: flattened,
            sharedCheckout: filtered_2.length === 1 && Ae?.sharedCheckout === true,
          }),
        ].join("");
      })
      .join("");
    let flattened_2 = i.flatMap((s) => {
      let _ = Ve.get(s) ?? [];
      let filtered = (ye === "unknown" ? uniq((ue.get(s) ?? []).map(({ folder }) => folder)) : Te(s)).filter(
        (Je) => !_.includes(Je),
      );
      let [G] = filtered;
      if (G === undefined) return [];
      let oe = `. ${capitalize(displayPluginId(s.pluginId))} is still recorded as installed at local scope from`;
      let de = filtered.length - 2;
      return [
        {
          scope: "local",
          said:
            filtered.length === 1
              ? `${oe} ${describeFolder(G)}: to remove it, start Claude Code in that folder and uninstall it there`
              : `${oe} the folders ${j.format(de > 0 ? [...filtered.slice(0, 2).map(displayFolderName), `${de} more in which Claude Code was started`] : filtered.map(displayFolderName))}: to remove it, start Claude Code in each of those folders and uninstall it there`,
        },
      ];
    });
    let joined_3 = flattened_2.map((s) => s.said).join("");
    let kn = [];
    let _n = new Map();
    let jn = false;
    for (let s of i) {
      let _ = ye === "unknown" || ye.includes(s.pluginId);
      let v = ye === "unknown" ? undefined : ye.filter((G) => G !== s.pluginId);
      for (let G of SETTING_SOURCES) {
        let enabledPlugins = getSettingsForSourceForUpkeep(G)?.enabledPlugins ?? {};
        let pluginName = findPluginName(Object.keys(enabledPlugins), s.pluginId);
        let Je = pluginName === undefined ? undefined : enabledPlugins[pluginName];
        if (pluginName === undefined || !isDependencyAutoInstallState(Je)) continue;
        if (v !== undefined && !enabledPluginKeys(enabledPlugins, s.pluginId, v).includes(pluginName))
          continue;
        if (
          !_ &&
          G === "userSettings" &&
          (
            await updateSettingsForSourceWithTransform(
              G,
              (Pe) => {
                let Ae = {
                  ...Pe?.enabledPlugins,
                };
                let pluginName = findPluginName(Object.keys(Ae), s.pluginId);
                if (
                  pluginName === undefined ||
                  v === undefined ||
                  !enabledPluginKeys(Ae, s.pluginId, v).includes(pluginName)
                )
                  return null;
                Ae[pluginName] = undefined;
                return {
                  enabledPlugins: Ae,
                };
              },
              undefined,
              storageV5,
            ).catch(() => ({
              error: Error("settings write failed"),
            }))
          ).error === null
        )
          jn = true;
        else {
          let Pe =
            G === "policySettings"
              ? "managed settings: only your administrator can remove it"
              : G === "flagSettings"
                ? "the --settings flag"
                : G === "projectSettings"
                  ? "project settings: .claude/settings.json"
                  : G === "localSettings"
                    ? "local settings: .claude/settings.local.json"
                    : ye === "unknown"
                      ? "user settings: kept, because the list of installed plugins could not be read"
                      : _
                        ? "user settings: kept, because it is still recorded as installed from another folder; when you uninstall it there, also take this line out of your user settings file, or the next start can record it again"
                        : "user settings: it could not be removed";
          if (ye === "unknown" && pluginName !== s.pluginId)
            _n.set(
              `${displayPluginId(pluginName)} (${Pe}; it may be another installed plugin's own line${G === "userSettings" ? "" : ": the list of installed plugins could not be read"})`,
              pluginName,
            );
          else if (!(G === "projectSettings" && gn.has(s))) kn.push(`${displayPluginId(s.pluginId)} (${Pe})`);
        }
      }
    }
    if (jn) refreshPluginCaches(storageV5);
    for (let s of i) {
      if (Fe.includes(s) || Ye.has(s)) continue;
      if (Q.has(s)) {
        if (s === c) continue;
        if (!isOfficialPluginDirectoryId(s.pluginId)) {
          await He(s);
          continue;
        }
        if ([Ee, M].includes(dataDirKey(s.pluginId))) continue;
      } else if (Se.get(s) !== true) continue;
      if (!isOfficialPluginDirectoryId(s.pluginId)) continue;
      let installedPlugins = await loadInstalledPlugins(storageV5);
      if ((installedPlugins.plugins[s.pluginId]?.length ?? 0) > 0) continue;
      let v = await pathExists(pluginDataDirPath(s.pluginId));
      await R(s, undefined, installedPlugins, v).catch((error) => {
        logForDebugging(
          `Switch to ${e}: could not finish removing what ${s.pluginId} saved: ${errorMessage(error)}`,
          {
            level: "warn",
          },
        );
        V.add(s.pluginId);
      });
    }
    let Mn = P === undefined ? undefined : await loadInstalledPlugins(storageV5);
    let En =
      Mn === undefined || (!hasFailedInstalledPluginsRead(Mn) && (Mn.plugins[c.pluginId]?.length ?? 0) > 0)
        ? undefined
        : findOtherPluginSharingDataDir(c.pluginId, Mn);
    if (En?.kind === "nobody" && dataDirCopied && !isOfficialPluginDirectoryId(c.pluginId)) {
      if ((await deletePluginDataDir(c.pluginId).catch(() => "failed")) === "failed")
        logForDebugging(`Switch to ${e}: could not remove the data directory of ${c.pluginId}`, {
          level: "warn",
        });
    }
    let ut =
      En === undefined || En.kind === "nobody"
        ? undefined
        : {
            usedBy: En.kind === "plugin" ? En.pluginId : undefined,
          };
    let di = !X
      ? ""
      : K
        ? " (it stays disabled, as before)"
        : ` (it was disabled before, but ${r} could not be disabled \u2014 disable it in /plugin)`;
    let ft = !c.scopes.some((scope_2) => scope_2 === scope);
    let ci =
      ft || c.scopes.some((scope_2) => scope_2 !== scope) ? ` (was ${c.scopes.join(" and ")} scope)` : "";
    let qn = oldDataDirDisposable
      ? ut !== undefined && (await pathExists(pluginDataDirPath(c.pluginId)))
        ? {
            pluginId: c.pluginId,
            reason: "another-plugin-uses-it",
            usedBy: ut.usedBy,
            copied: dataDirCopied,
          }
        : undefined
      : {
          pluginId: c.pluginId,
          reason: dataDirKeptReason === "target-had-own" ? "target-had-own" : "copy-failed",
        };
    let ui = qn === undefined ? "" : `. ${describeKeptDataDir(qn, e)}`;
    let zn = {
      scopeChanged: ft,
      stayedDisabled: K,
      dataDirCarried: dataDirCopied,
      pinChanged,
      replacedCount: i.length,
      isPrimary: true,
    };
    logMarketplaceSwitch({
      ..._e,
      result:
        X && !K
          ? {
              ...zn,
              outcome: "sad",
              code: "disable_failed",
            }
          : !oldDataDirDisposable
            ? {
                ...zn,
                outcome: "sad",
                code: "data_dir_kept",
              }
            : {
                ...zn,
                outcome: "ok",
              },
    });
    for (let s of i) {
      if (s === c) continue;
      logMarketplaceSwitch({
        ..._e,
        fromPluginId: s.pluginId,
        result: {
          outcome: "ok",
          scopeChanged: !s.scopes.some((scope_2) => scope_2 === scope),
          stayedDisabled: false,
          dataDirCarried: false,
          pinChanged:
            s.gitCommitSha !== undefined && gitCommitSha !== undefined && s.gitCommitSha !== gitCommitSha,
          replacedCount: i.length,
          isPrimary: false,
        },
      });
    }
    let mapped = i
      .filter((s) => ae.has(s) && (targetHadOwn || s !== c) && !V.has(s.pluginId))
      .map((s) => s.pluginId);
    let filtered = mapped.filter((s) => q.includes(s));
    let filtered_2 = mapped.filter((s) => !q.includes(s));
    let filtered_3 = q.filter((s) => !mapped.includes(s));
    let ht = [
      ...(filtered.length > 0
        ? [`the settings and saved data for ${j.format(filtered.map(displayPluginId))}`]
        : []),
      ...(filtered_2.length > 0
        ? [`the settings saved for ${j.format(filtered_2.map(displayPluginId))}`]
        : []),
      ...(filtered_3.length > 0 ? [`the saved data of ${j.format(filtered_3.map(displayPluginId))}`] : []),
    ];
    let yt = ht.length === 0 ? "" : `, and ${j.format(ht)} were removed`;
    let fi = targetHadOwn
      ? `${r} kept its own settings${yt}`
      : w
        ? `your plugin settings carried over from ${y}${yt}`
        : "your plugin settings carried over";
    let joined_4 = Z.map(([s, _]) => `. About ${displayPluginId(s)}: ${_.replace(/\.$/, "")}`).join("");
    let wt = async (s) => {
      let _ = dataDirKey(s.pluginId);
      let v =
        s === c
          ? !(oldDataDirDisposable && M !== Ee) || (Mn !== undefined && En?.kind !== "nobody")
          : [Ee, M].includes(_);
      return {
        pluginId: s.pluginId,
        entry: isOfficialPluginDirectoryId(s.pluginId)
          ? await releaseDirectoryBinding_2(s.pluginId, false).catch(() => "unreadable")
          : undefined,
        carriedTo: s === c && !targetHadOwn ? r : undefined,
        knownInUse: v,
        mayGo: !v && ye !== "unknown" && !ye.some((G) => dataDirKey(G) === _),
      };
    };
    let joined_5 = (
      await Promise.all(
        i
          .filter((s) => Fe.includes(s))
          .map(async (s) => {
            let { mayGo, knownInUse, ...G } = await wt(s);
            return describeUnfinishedCleanup({
              ...G,
              dataFolder: mayGo ? "may-go" : !knownInUse && ye === "unknown" ? "not-known" : "in-use",
            });
          }),
      )
    ).join("");
    let joined_6 = (
      await Promise.all(
        i.flatMap((s) => {
          let folder = Ye.get(s)?.folder;
          return folder === undefined
            ? []
            : [
                wt(s).then(({ mayGo, knownInUse, ...oe }) =>
                  describeLeftRecordCleanup({
                    ...oe,
                    folder,
                    dataFolder: knownInUse ? "in-use" : "not-known",
                  }),
                ),
              ];
        }),
      )
    ).join("");
    let mi =
      kn.length === 0
        ? ""
        : `. Still listed under "enabledPlugins": ${j.format(kn)}. Until ${kn.length === 1 ? "that line is" : "those lines are"} removed, an old copy can load again beside ${r} or show as enabled but not installed`;
    let [Pt] = [..._n.values()];
    let hi =
      Pt === undefined
        ? ""
        : `. Still listed under "enabledPlugins": ${j.format([..._n.keys()])}. ${_n.size === 1 ? `If ${displayPluginId(Pt)} does not name a plugin you have installed, that line should be removed` : "Any of these that does not name a plugin you have installed should be removed"}: until then an old copy can load again beside ${r} or show as enabled but not installed`;
    return {
      ok: true,
      note: `. Switched from ${I}; ${fi}${di}${ci}${joined}${ui}${ie.join("")}${joined_4}${joined_5}${joined_6}${mi}${hi}${joined_2}${joined_3}`,
      stayedDisabled: K,
      keptOwnSettings: targetHadOwn,
      settingsRemovedFrom: mapped,
      ...(Ge.size > 0 && {
        settingsLeftInPlace: [...Ge].map((s) => s.pluginId),
      }),
      savedDataRemovedFrom: q,
      keptDataDir: qn,
      from: c.pluginId,
      replaced: i.map((s) => s.pluginId),
      oldCopyStillRecordedAt: uniq([
        ...flattened_2.map((s) => s.scope),
        ...(joined_2 === "" ? [] : ["local"]),
      ]),
      saysMore:
        joined !== "" ||
        joined_2 !== "" ||
        joined_5 !== "" ||
        joined_6 !== "" ||
        joined_3 !== "" ||
        (X && !K) ||
        kn.length > 0 ||
        _n.size > 0 ||
        ie.length > 0 ||
        joined_4 !== "",
    };
  }
  return {
    ok: false,
    message: "",
  };
}
//@ chunk-pp50kewz.js:70928-71035 layout
function directoryBlockedMessage(e) {
  return `Plugin "${quotedPrintable(e)}" is from the ${OFFICIAL_MARKETPLACE_DISPLAY}, which is blocked by your organization. ${pluginDirectoryPolicyBlockHint()}`;
}
//@ chunk-pp50kewz.js:71035-71113 layout
function directoryUnreachableMessage() {
  return `couldn't reach the ${OFFICIAL_MARKETPLACE_DISPLAY}, so this may not be the latest`;
}
//@ chunk-pp50kewz.js:71113-71275 layout
function appendRefreshWarning({ refreshWarning, directoryRefreshFailed }, i) {
  return refreshWarning === undefined
    ? i
    : directoryRefreshFailed
      ? `${i} Warning: ${directoryUnreachableMessage()}.`
      : `${i} Warning: ${refreshWarning} \u2014 version shown may be stale.`;
}
//@ chunk-pp50kewz.js:71275-71493 layout
function upToDateMessage(e, version) {
  return e.directoryNotChecked
    ? `${e.pluginName} was not checked for updates: the ${OFFICIAL_MARKETPLACE_DISPLAY} isn't available in this session (installed: ${version})`
    : appendRefreshWarning(e, `${e.pluginName} is already at the latest version (${version}).`);
}
//@ chunk-pp50kewz.js:71493-77525 fingerprint = uninstallPluginOp (0.405)
/**
 * 卸载插件：从指定作用域的安装记录与 enabledPlugins 中移除，最后一个安装被移除时删除版本缓存、插件数据目录（可保留）与密钥存储里的 userConfig 敏感值；托管插件拒绝。
 */
async function uninstallPluginOp(
  pluginId,
  scope = "user",
  deleteDataDir = true,
  storageV5,
  { settingsStillOn: o = "refuse" } = {},
) {
  assertInstallableScope(scope);
  pluginId = normalizePluginId(pluginId);
  let u = pluginOperationRefusal(pluginId, parsePluginId(pluginId).marketplace, "uninstall");
  if (u !== undefined)
    return {
      success: false,
      message: u,
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
  let pluginId_3;
  let installedPlugins = getInstalledPlugins();
  let keys = Object.keys(installedPlugins.plugins);
  let projectPathForScope = getProjectPathForScope(scope);
  if (foundPlugin) {
    let keys_2 = Object.keys(settings?.enabledPlugins ?? {});
    let lower = foundPlugin.name.toLowerCase();
    let included = pluginId.includes("@");
    let N = [
      ...keys_2.filter((he) => he === pluginId),
      ...keys_2.filter((he) => pluginNamesEqual(he, pluginId)),
      ...(included
        ? []
        : [
            ...keys_2.filter((he) => he === foundPlugin.name),
            ...keys_2.filter((he) => he.startsWith(`${foundPlugin.name}@`)),
            ...keys_2.filter((he) => he.toLowerCase() === lower),
            ...keys_2.filter((he) => he.toLowerCase().startsWith(`${lower}@`)),
          ]),
      included ? pluginId : foundPlugin.name,
    ];
    let Z = included && (installedPlugins.plugins[pluginId] ?? []).length > 0;
    let S = (he) => installedPlugins.plugins[findPluginName(keys, he) ?? he] ?? [];
    pluginId_2 = Z
      ? pluginId
      : (N.find((he) => S(he).some((re) => re.scope === scope && re.projectPath === projectPathForScope)) ??
        N.find((he) => S(he).some((re) => isSameInstallScope(re, scope, projectPathForScope))) ??
        N[0]);
    pluginId_3 = foundPlugin.name;
  } else {
    let installedPluginId = resolveInstalledPluginId(pluginId, scope, projectPathForScope);
    if (!installedPluginId) {
      let B = await uninstallLeftoverOfficialName(pluginId, scope, deleteDataDir, storageV5);
      if (B !== undefined) return B;
      return {
        success: false,
        message: `Plugin "${pluginId}" not found in installed plugins`,
        failureCode: "not_installed",
      };
    }
    pluginId_2 = installedPluginId.pluginId;
    pluginId_3 = installedPluginId.pluginName;
  }
  pluginId_2 = findPluginName(keys, pluginId_2) ?? pluginId_2;
  let W = installedPlugins.plugins[pluginId_2];
  let se = installationAtTarget(W, scope, projectPathForScope);
  if (!se) {
    let { scope: actualScope } = getPluginInstallationFromV2(pluginId_2);
    if (actualScope !== scope && W && W.length > 0) {
      if (actualScope === "project" && isPluginEnabledAtProjectScope(pluginId_2)) {
        let B = claudeCommand("plugin disable", pluginId, "--scope local");
        let me =
          managedPluginRefusal(pluginId_2)?.message ??
          `To disable just for you${B ? `: ${B}` : ", use claude plugin disable with --scope local"}`;
        return {
          success: false,
          message: `Plugin "${pluginId}" is enabled at project scope (.claude/settings.json, shared with your team). ${me}`,
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
    if ((W?.length ?? 0) === 0) {
      let B = await uninstallLeftoverOfficialName(pluginId, scope, deleteDataDir, storageV5);
      if (B !== undefined) return B;
    }
    return {
      success: false,
      message: `Plugin "${pluginId}" is not installed in ${scope} scope. Use --scope to specify the correct scope.`,
      failureCode: "not_installed_at_scope",
    };
  }
  let installPath = se.installPath;
  let flattened = Object.entries(installedPlugins.plugins).flatMap(([key, value]) =>
    key !== pluginId_2 && pluginNamesEqual(key, pluginId_2) && value.length > 0 ? [key] : [],
  );
  flattened = uniq([
    ...flattened,
    ...bindingKeysFor(installedPlugins.plugins, pluginId_2).flatMap(([U, B]) =>
      U !== pluginId_2 && B.length > 0 ? [U] : [],
    ),
  ]);
  if (isOfficialPluginDirectoryId(pluginId_2) && isWorkspaceRestrictedSource(settingSource))
    return {
      success: false,
      message: `"${quotedPrintable(pluginId_3)}" was not uninstalled: this workspace is not yet trusted, so its settings files are not read, and the change could not be checked afterwards. Nothing was changed. Trust the workspace, start Claude Code again, then uninstall it again.`,
      failureCode: "settings_write_failed",
      pluginId: pluginId_2,
      scope,
    };
  let we = (enablingSettingsFile, error, me) => ({
    success: false,
    message: describeSettingsWriteNotRead(
      pluginId_3,
      "network-path",
      enablingSettingsFile.notRead[0],
      error,
      settingSource,
      enablingSettingsFile.why,
      me,
    ),
    failureCode: "settings_still_on",
    pluginId: pluginId_2,
    scope,
  });
  if (isOfficialPluginDirectoryId(pluginId_2) && settingSource !== "userSettings") {
    let enablingSettingsFile = await findEnablingSettingsFile(settingSource, pluginId_2, flattened);
    if ("notRead" in enablingSettingsFile) return we(enablingSettingsFile, undefined, "nothing-was-changed");
  }
  let { error } = await updateSettingsForSourceWithTransform(
    settingSource,
    (U) => {
      if (enabledPluginKeys(U?.enabledPlugins ?? {}, pluginId_2).length === 0) return null;
      let newEnabledPlugins = {
        ...U?.enabledPlugins,
      };
      let me = findPluginName(Object.keys(newEnabledPlugins), pluginId_2) ?? pluginId_2;
      if (me === pluginId_2 || !flattened.some((N) => pluginNamesEqual(N, me)))
        newEnabledPlugins[me] = undefined;
      for (let N of enabledPluginKeys(newEnabledPlugins, pluginId_2, flattened))
        newEnabledPlugins[N] = undefined;
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
    if ("notRead" in enablingSettingsFile) return we(enablingSettingsFile, error, "change-may-be-made");
    let { readsBack, file } = enablingSettingsFile;
    if (readsBack !== "off") {
      let N = quotedPrintable(pluginId_3);
      let Z = file ?? "that settings file";
      let S = error ? `, and the settings change failed (${error.message})` : "";
      return {
        success: false,
        message:
          readsBack !== "on"
            ? `"${N}" was not uninstalled: ${Z} is there and could not be read, so it may still switch "${N}" on${S}. It is still installed. Once that file can be read and saved, uninstall it again.`
            : error
              ? `"${N}" was not uninstalled: it is still switched on in ${Z}${S}. It is still installed. Once that file can be saved, uninstall it again.`
              : `"${N}" was not uninstalled: it is still switched on in ${Z}, although the settings change reported no error. It is still installed. Take it out of "enabledPlugins" in that file yourself, then uninstall it again.`,
        failureCode: "settings_write_failed",
        pluginId: pluginId_2,
        scope,
      };
    }
  }
  let D = false;
  D = isOfficialPluginDirectoryId(pluginId_2);
  let ce;
  if (!D && o === "refuse") {
    let enablingSettingsFile = await findEnablingSettingsFile(settingSource, pluginId_2, flattened);
    if ("notRead" in enablingSettingsFile) return we(enablingSettingsFile, error);
    let { readsBack, file } = enablingSettingsFile;
    if (
      readsBack === "unreadable" &&
      file !== undefined &&
      file === getLegacyLocalSettingsFilePath() &&
      (await formatFileSize(file))
    )
      ce = `${file} (an older local settings file) is not JSON, so it was not checked: as it is, Claude Code ignores it and it switches nothing on. If you repair it, take "${quotedPrintable(pluginId_3)}" out of its "enabledPlugins" if it is there.`;
    else if (readsBack === "on" || readsBack === "unreadable" || (readsBack === "not-read-here" && error))
      return {
        success: false,
        message: describeSettingsWriteNotRead(pluginId_3, readsBack, file, error, settingSource),
        failureCode: "settings_still_on",
        pluginId: pluginId_2,
        scope,
      };
  }
  if (isOfficialPluginDirectoryId(pluginId_2)) {
    let U =
      (isStorageV5Enabled() && storageV5 !== undefined
        ? await loadInstalledPlugins(storageV5)
        : loadInstalledPluginsSync()
      ).plugins[pluginId_2] ?? [];
    let matchingInstallations = findMatchingInstallations(U, scope, projectPathForScope);
    if (!U.filter((N) => !matchingInstallations.includes(N)).some(hasDirectoryRepositoryKey)) {
      if ((await persistDirectoryBinding(pluginId_2, [...U, ...(W ?? [])])) === "not-persisted")
        return {
          success: false,
          message: `"${quotedPrintable(pluginId_3)}" was switched off at ${scope} scope but not uninstalled, and nothing it saved was removed: plugin-directory-bindings.json in the plugins folder could not be used or written (unreadable, a symbolic link or not a file, over 1 MB, damaged, written by a newer Claude Code, or not writable), so nothing would keep the name for the repository it was installed from. Once the file can be written, uninstall it again.`,
          failureCode: "directory_binding_unreadable",
          pluginId: pluginId_2,
          scope,
        };
    } else await seedBindingsFromInstall(pluginId_2, W);
  }
  await removePluginInstallation(pluginId_2, scope, projectPathForScope, storageV5);
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
  let L = savedKept === undefined ? undefined : keptSavedDataMessage(pluginId_3, deleteDataDir);
  return {
    success: true,
    message: `Successfully uninstalled plugin: ${pluginId_3} (scope: ${scope})${depWarn}${directoryBindingKept === undefined ? "" : `. ${directoryReleaseNote(directoryBindingKept)}`}${L === undefined ? "" : `. ${L}`}${ce === undefined ? "" : `${L === undefined ? "." : ""} ${ce}`}`,
    pluginId: pluginId_2,
    pluginName: pluginId_3,
    scope,
    ...(savedKept !== undefined &&
      L !== undefined && {
        savedKept: {
          reason: savedKept,
          note: L,
        },
      }),
    ...(ce !== undefined && {
      olderLocalSettingsSkippedNote: ce,
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
//@ chunk-pp50kewz.js:77525-79169 layout
/**
 * 设置文件写入了但本会话读不到（网络路径或未被读取）时的提示文本。
 */
function describeSettingsWriteNotRead(e, n, i, a, source, u, h) {
  let p = quotedPrintable(e);
  let r = i ?? "that settings file";
  let c = a ? `, and the settings change failed (${a.message})` : "";
  if (n === "network-path" || n === "not-read-here") {
    let y = describeUnwritableSettingsSource({
      source,
      file: r,
      readsBack: "not-read-here",
      ...(n === "network-path" && {
        notReadBecause: n,
      }),
    });
    let j =
      n === "not-read-here"
        ? "Once that file can be saved, uninstall it again."
        : u === "vet-network" || u === "suspect-link" || u === "crossing"
          ? `If that file, its ".claude" folder or a folder above them is a link to another machine, replace the link with a real file or folder, or start Claude Code from the folder's real location. Then uninstall it again.`
          : "Try uninstalling it again: if the path to that file changed during the check, that will work. If you see this again, the path cannot be checked, and trying again will not help.";
    let T =
      h === "nothing-was-changed"
        ? " Nothing was changed."
        : h === "change-may-be-made" && !a
          ? ` "${p}" may already have been removed from the enabled plugins in this scope's settings.`
          : "";
    return `"${p}" was not uninstalled: ${y}, so it may still switch "${p}" on${c}.${T} It is still installed. ${j}`;
  }
  if (n === "unreadable")
    return `"${p}" was not uninstalled: ${r} is there and could not be read, so it may still switch "${p}" on${c}. It is still installed. Once that file can be read and saved, uninstall it again.`;
  return a
    ? `"${p}" was not uninstalled: it is still switched on in ${r}${c}. It is still installed. Once that file can be saved, uninstall it again.`
    : `"${p}" was not uninstalled: it is still switched on in ${r}, although the settings change reported no error. It is still installed. Take it out of "enabledPlugins" in that file yourself, then uninstall it again.`;
}
//@ chunk-pp50kewz.js:79169-79329 layout = formatFileSize (0.782)
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
//@ chunk-pp50kewz.js:79329-79482 layout
function manualCleanupHint(e) {
  return `take ${e} entries out of "pluginConfigs" in your user settings file and out of "pluginSecrets" in your credentials store yourself`;
}
//@ chunk-pp50kewz.js:79482-79983 layout
/**
 * 卸载后安装列表无法重新读取时的说明：插件保存的选项、密钥、用量记录（及数据目录）被保留，并告诉用户如何删除。
 */
function keptSavedDataMessage(pluginId, hadDataDir) {
  let quotedId = `"${quotedPrintable(pluginId)}"`;
  return `What ${quotedId} saved was kept (its options, its secrets${hadDataDir ? ", its usage record and its data folder" : " and its usage record"}): the list of installed plugins could not be read again, so ${quotedId} may still be installed at another scope. If it is installed again, it will use what was kept without asking. To delete what was kept, uninstall ${quotedId} again; if that says it is not installed, install it and then uninstall it; if it can no longer be installed, ${manualCleanupHint("its")}.`;
}
//@ chunk-pp50kewz.js:79983-80981 layout
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
      officialSiblings = findDataDirSharers(pluginId, registry).flatMap((b) => registry.plugins[b] ?? []);
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
      let b = normalizeMarketplaceInputPath(officialSibling.installPath);
      return b !== undefined && b === normalizeMarketplaceInputPath(installPath);
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
//@ chunk-pp50kewz.js:80981-81955 layout
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
      stillOnUnsure: stillOn.some((w) => w.readsBack !== "on"),
      stillOnNotReadHere: stillOn.some(
        (w) => w.readsBack === "not-read-here" && w.notReadBecause === undefined,
      ),
      ...(stillOn.some((w) => w.notReadBecause === "network-path") && {
        stillOnNotReadForItsPath: stillOn,
      }),
      stillOnProjectFile:
        scope !== "project" && stillOn.some((w) => w.source === "projectSettings" && w.readsBack === "on"),
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
//@ chunk-pp50kewz.js:81955-82112 file-local
function getProjectPathForScope_2(e, scope) {
  return e.map((i) =>
    i.readsBack !== "on"
      ? describeUnwritableSettingsSource(i)
      : i.source === "projectSettings" && scope !== "project"
        ? `${i.file} (the project's shared settings)`
        : describeUnwritableSettingsSource(i),
  );
}
//@ chunk-pp50kewz.js:82112-85070 layout
/**
 * 卸载一个已无安装记录、但目录名仍被绑定的官方市场插件：先从可写的设置里移除 enabledPlugins 中的同名项，确认没有其他地方启用、也没有新安装记录后，释放目录绑定并返回结果说明。
 */
async function uninstallLeftoverOfficialName(pluginId, scope, deleteDataDir, storageV5) {
  {
    let { name: o, marketplace } = parsePluginIdentifier(pluginId);
    let h = quotedPrintable(o, 120);
    if (marketplace !== OFFICIAL_MARKETPLACE_NAME) return;
    let p = await bindingsWithReadFailure();
    if (isUnreadableBindings(p)) return;
    let r = `${o}@${marketplace}`;
    let pluginId_2 = findBindingKeysFor(p.keys(), r)[0];
    if (pluginId_2 === undefined) return;
    let j =
      isStorageV5Enabled() && storageV5 !== undefined
        ? await loadInstalledPlugins(storageV5)
        : loadInstalledPluginsSync();
    if (hasFailedInstalledPluginsRead(j)) return;
    let T = bindingKeysFor(j.plugins, r).find(([, ee]) => ee.length > 0)?.[0];
    if (T === r) return;
    if (T !== undefined)
      return {
        success: false,
        message: `"${h}" is not installed. "${quotedPrintable(T, 200)}" is, and it uses the same data folder, so nothing was removed. To free the name, ${runCommandHint(
          "plugin uninstall",
          T,
          {
            fallback: `uninstall "${quotedPrintable(T, 200)}" from the command line`,
          },
        )}.`,
        failureCode: "directory_name_held",
        pluginId: r,
        scope,
      };
    let I = (enabledPlugins) => enabledPluginKeys(enabledPlugins, pluginId_2);
    let w = [];
    try {
      for (let W of ["userSettings", "localSettings", ...(scope === "project" ? ["projectSettings"] : [])]) {
        let enablingSettingsFile = await findEnablingSettingsFile(W, pluginId_2);
        if ("notRead" in enablingSettingsFile || enablingSettingsFile.readsBack !== "on") continue;
        let { error } = await updateSettingsForSourceWithTransform(
          W,
          (we) => ({
            enabledPlugins: {
              ...we?.enabledPlugins,
              ...Object.fromEntries(I(we?.enabledPlugins).map((J) => [J, undefined])),
            },
          }),
          undefined,
          storageV5,
        );
        let X = getSettingsFilePathForSource(W) ?? `your ${getSettingSourceDisplayNameLowercase(W)}`;
        if (error)
          return {
            success: false,
            message: `"${h}" could not be removed from the enabled plugins in ${X} (${error.message})${w.length > 0 ? `; it was removed from them in ${w.join(" and ")}` : ""}. Nothing it saved was removed, so "${h}" can still only be installed from the same repository. Once ${X} can be saved, uninstall it again.`,
            failureCode: "settings_write_failed",
            pluginId: pluginId_2,
            scope,
          };
        w.push(X);
      }
      let entries = await listUninstallSettingsFiles(pluginId_2);
      if (entries.length > 0) {
        let any = entries.some((Ce) => Ce.readsBack !== "on");
        let se =
          scope !== "project" &&
          entries.some((Ce) => Ce.source === "projectSettings" && Ce.readsBack === "on")
            ? "To remove it there, uninstall it again with --scope project"
            : entries.some((Ce) => Ce.readsBack === "not-read-here" && Ce.notReadBecause === undefined)
              ? "Once this workspace is trusted and Claude Code has been started again, uninstall it again"
              : (networkPathRetryHint(entries, "uninstall it again") ??
                "Once it is switched off there, uninstall it again");
        return {
          success: false,
          message: `"${h}" is still switched on${any ? ", or may be," : ""} in ${getProjectPathForScope_2(entries, scope).join(" and ")}${w.length > 0 ? `; it was removed from the enabled plugins in ${w.join(" and ")}` : ""}. Nothing it saved was removed, so "${h}" can still only be installed from the same repository. ${se}.`,
          failureCode: "directory_name_held",
          pluginId: pluginId_2,
          scope,
        };
      }
    } finally {
      refreshPluginCaches(storageV5);
    }
    let b =
      isStorageV5Enabled() && storageV5 !== undefined
        ? await loadInstalledPlugins(storageV5)
        : loadInstalledPluginsSync();
    if (hasFailedInstalledPluginsRead(b) || bindingKeysFor(b.plugins, r).some(([, ee]) => ee.length > 0))
      return {
        success: false,
        message: `"${h}" was not removed: an install record for it appeared while it was being switched off, or the install records could no longer be read. Nothing it saved was removed. Run the uninstall again.`,
        failureCode: "directory_name_held",
        pluginId: pluginId_2,
        scope,
      };
    let _e = await releaseDirectoryBinding(
      pluginId_2,
      deleteDataDir,
      listInstalledPluginIds(b),
      storageV5,
      scope,
    );
    return {
      success: true,
      message: `"${h}" was no longer installed.${w.length > 0 ? ` Removed it from the enabled plugins in ${w.join(" and ")}.` : ""} ${_e === undefined ? `Removed anything still saved under its name (${deleteDataDir ? "options, secrets, data" : "options, secrets"}).` : directoryReleaseNote(_e)}`,
      pluginId: pluginId_2,
      pluginName: o,
      scope,
      dataDirKept: !deleteDataDir || _e?.dataLeftInPlace === true,
      directoryNameNote: _e && directoryReleaseNote(_e),
    };
  }
  return;
}
//@ chunk-pp50kewz.js:85070-86368 layout
/**
 * 列出删除插件保存的选项/密钥前用户需要先做的事：解锁钥匙串、修复不可读或不可写的设置文件与凭据存储等。
 */
function savedDataFixSteps(reasons, storeKind) {
  {
    let i = [
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
    let a = [
      ...(reasons.includes("secrets_unreadable") && storeKind === "credential-manager"
        ? [
            "run it from a Claude Code that can reach Windows Credential Manager (this one could not, so it cannot tell whether secrets are still saved there)",
          ]
        : []),
      ...(i.length > 0 ? [`first ${i.join(", and ")}`] : []),
      ...(reasons.includes("secrets_remain") ? ["its secrets were still there after this delete"] : []),
      ...(reasons.includes("settings_remain")
        ? [
            'its options were still in your user settings file after this delete: take its entry out of "pluginConfigs" there yourself',
          ]
        : []),
    ];
    return a.length > 0
      ? a.join("; ")
      : "first make sure your user settings file and the credentials store can be read and written";
  }
  return "";
}
//@ chunk-pp50kewz.js:86368-89406 layout
/**
 * 根据目录释放结果生成给用户的说明：仍启用的位置、安装列表不可读、存在占用者、绑定文件不可用，以及选项/密钥/数据目录未删除时的处理建议与重新卸载命令。
 */
function directoryReleaseNote(result) {
  {
    if (result === undefined) return "";
    let n = quotedPrintable(parsePluginIdentifier(result.pluginId).name, 120);
    let i = pluginDataDirPath(result.pluginId);
    let a = "Its saved options and secrets could not be deleted";
    let o =
      result.entry === "held" ? `, and "${n}" can still only be installed from the same repository` : "";
    let action = runCommandHint("plugin uninstall", result.pluginId, {
      ...(result.stillOnProjectFile && {
        extra: "--scope project",
      }),
      tail: "again",
      fallback: `uninstall "${quotedPrintable(result.pluginId, 200)}" again from the command line${result.stillOnProjectFile ? " with --scope project" : ""}`,
    });
    if (result.stillOnIn !== undefined) {
      let c = result.stillOnProjectFile
        ? `To remove it there too, ${action}`
        : result.stillOnNotReadHere
          ? `Once this workspace is trusted and Claude Code has been started again, ${action}`
          : (networkPathRetryHint(result.stillOnNotReadForItsPath ?? [], action) ??
            `Once it is switched off there, ${action}`);
      return `It is still switched on${result.stillOnUnsure ? ", or may be," : ""} in ${result.stillOnIn.join(" and ")}, so nothing it saved was removed${o}. ${c}.`;
    }
    if (result.installsUnknown)
      return `The list of installed plugins could not be read, so nothing it saved was removed${o}. Once the list can be read, ${action}.`;
    if (result.liveHolder === result.pluginId)
      return `An install record for "${n}" appeared while it was being uninstalled, so nothing it saved was removed.`;
    if (result.liveHolder !== undefined) {
      let c = quotedPrintable(result.liveHolder, 200);
      let y = runCommandHint("plugin uninstall", result.liveHolder, {
        fallback: `uninstall "${c}" from the command line`,
      });
      let j = isOfficialPluginDirectoryId(result.liveHolder)
        ? ""
        : `, then ${runCommandHint("plugin uninstall", result.pluginId, {
            fallback: `uninstall "${quotedPrintable(result.pluginId, 200)}" from the command line`,
          })}`;
      return `${result.optionsGone ? "" : `${a}. `}Its data folder (${i}) was left in place because "${c}" is installed and uses it${result.entry === "held" ? `, so "${n}" can still only be installed from the same repository` : ""}. What is left is removed when "${c}" is uninstalled: ${y}${j}.`;
    }
    if (result.entry !== "held")
      return [
        ...[
          ...(result.optionsGone ? [] : ["Its saved options and secrets may not have been deleted."]),
          ...(result.dataGone || result.dataKeptOnRequest
            ? []
            : [`Its data folder could not be deleted (${i}); you can delete it yourself.`]),
        ],
        result.entry === "unreadable"
          ? `plugin-directory-bindings.json in the plugins folder could not be used, so "${n}" cannot be installed again until that file can be used.`
          : `Nothing ties "${n}" to the repository it came from, so a plugin installed under that name later could read what is left.`,
      ].join(" ");
    let h = `so "${n}" can still only be installed from the same repository`;
    let p = runCommandHint("plugin uninstall", result.pluginId, {
      fallback: `uninstall "${quotedPrintable(result.pluginId, 200)}" from the command line`,
    });
    let r = savedDataFixSteps(result.optionsNotGoneBecause, primarySecureStoreKind());
    if (result.optionsGone)
      return result.dataKeptOnRequest
        ? `Its data folder was kept (${i}), ${h}. To free the name, ${p}, which deletes that folder.`
        : `Its data folder could not be deleted (${i}), ${h}. Once the folder can be deleted, ${p} to free the name.`;
    if (result.dataGone) return `${a}, ${h}. To delete them and free the name, ${p} (${r}).`;
    return result.dataKeptOnRequest
      ? `${a}, and its data folder was kept (${i}), ${h}. To delete both and free the name, ${p} (${r}).`
      : `Its saved options and secrets and its data folder (${i}) could not be deleted, ${h}. Once they can be deleted (${r}), ${p} to free the name.`;
  }
  return "";
}
//@ chunk-pp50kewz.js:89406-99791 fingerprint = setPluginEnabledOp (0.318)
/**
 * 启用/禁用插件：写入目标作用域 settings 的 enabledPlugins[pluginId]=true/false；处理托管策略锁定、被依赖（禁用时提示谁依赖它）、依赖自动启用、作用域优先级（已有更高作用域值时提示）。
 */
async function setPluginEnabledOp(pluginId, enabled, scope, a, storageV5) {
  let u = enabled ? "enable" : "disable";
  let h = groupedEnabledPlugins();
  pluginId = normalizePluginId(pluginId);
  let { name: p, marketplace } = parsePluginId(pluginId);
  if (isStorageV5Enabled() && storageV5 !== undefined) await primeInstalledPluginsCache(storageV5);
  if (marketplace === undefined && !isBuiltinPluginId(pluginId)) {
    let J = joinPluginId(pluginId, BUILTIN);
    let pluginId_2 = findPluginInSettings(pluginId, ["user"])?.pluginId;
    if (hasTrustedOnlyBuiltinPlugin(J) && pluginId_2 !== undefined && !isBuiltinPluginId(pluginId_2))
      return setPluginEnabledOp(pluginId_2, enabled, scope, a, storageV5);
    if (hasTrustedOnlyBuiltinPlugin(J)) {
      let allPlugins = await loadAllPlugins(storageV5);
      if (
        ![...allPlugins.enabled, ...allPlugins.disabled].some(
          (pe) => pluginNamesEqual(pe.name, pluginId) && !isBuiltinPluginId(pe.source),
        )
      )
        return setPluginEnabledOp(J, enabled, scope, a, storageV5);
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
      return setPluginEnabledOp(pluginId_3, enabled, scope, a, storageV5);
  }
  if (isBuiltinPluginId(pluginId) || isOfficialMarketplace(marketplace)) {
    let J = "user";
    let D = trustedOnlyBuiltinPluginId(pluginId) ?? pluginId;
    let ce = hasTrustedOnlyBuiltinPlugin(D) ? getPluginEnablementLockingSource(D, enabled) : undefined;
    if (ce !== undefined) return pluginBlockedResult(D, enabled, ce, D);
    let ge = !enabled && isBuiltinPluginId(D) ? managedPluginRefusal(D) : undefined;
    if (ge !== undefined) return ge;
    let k;
    let pe;
    let Ee = [];
    let M = false;
    let P = false;
    let L;
    let U = false;
    let B = "";
    if (isOfficialMarketplace(marketplace)) {
      let allPlugins = await loadAllPlugins(storageV5);
      let pluginByIdentifier = findPluginByIdentifier(
        pluginId,
        [...allPlugins.enabled, ...allPlugins.disabled].filter(
          (De) => marketplaceSuffix(De.source) === marketplace,
        ),
      );
      if (pluginByIdentifier) {
        D = pluginByIdentifier.source;
        k = pluginByIdentifier.manifest.defaultEnabled === false;
      }
      P =
        marketplace === SYNCED &&
        (pluginByIdentifier !== undefined
          ? isRequiredPlugin(pluginByIdentifier.source, pluginByIdentifier.installationPreference)
          : (await listSyncedRequiredPlugins(storageV5)).some(
              (De) => De.required && nfcLower(De.id) === nfcLower(D),
            ));
      if (!enabled && P)
        return {
          success: false,
          message: requiredPluginMessage(D),
          failureCode: "required_by_organization",
        };
      if (!enabled && marketplace === INLINE_PLUGIN_MARKETPLACE && pluginByIdentifier === undefined) {
        let De = `${p}@${SYNCED}`;
        let found = (await listSyncedRequiredPlugins(storageV5)).find(
          (Le) => Le.required && nfcLower(Le.id) === nfcLower(De),
        );
        if (found !== undefined)
          return {
            success: false,
            message: requiredPluginMessage(found.id),
            failureCode: "required_by_organization",
          };
      }
      if (!enabled && !a?.bypassDependentsBlock) {
        let De =
          buildRequiredByPolicyMap([...allPlugins.enabled, ...allPlugins.disabled]).get(nfcLower(D)) ?? [];
        if (De.length > 0)
          return {
            success: false,
            message: requiredDependencyMessage(parsePluginId(D).name, De),
            failureCode: "required_by_organization",
            reverseDependents: De.map((Ie) => Ie.name),
          };
      }
      let any = allPlugins.warnings.some(
        (warning) => warning.type === "synced-plugin-shadowed" && nfcLower(warning.source) === nfcLower(D),
      );
      let A =
        enabled && !any ? lockedDependentName(D, pluginByIdentifier?.attributedMarketplaceName) : undefined;
      if (A !== undefined)
        return {
          success: false,
          message: `Plugin "${D}" cannot be ${u}d here: "${A}" is locked by your organization's managed settings, so this ${nonInstallableSourceLabel(marketplace)} copy is never loaded`,
          failureCode: "managed_name_locked",
        };
      M =
        pluginByIdentifier !== undefined &&
        matchPolicyPluginEntry(
          getPolicyEnabledPluginEntries(),
          parsePluginId(D).name,
          pluginByIdentifier.attributedMarketplaceName,
        ).outcome === "admitted";
      if (enabled && M && pluginByIdentifier !== undefined)
        Ee = [
          `${pluginByIdentifier.name}@${SYNCED}`,
          `${pluginByIdentifier.name}@${INLINE_PLUGIN_MARKETPLACE}`,
        ].flatMap((De) =>
          ["local", "user"].flatMap((Ie) => {
            let pluginInSource = findPluginInSource(Ie, De, h);
            return pluginInSource?.value === false
              ? [
                  {
                    scope: Ie,
                    key: pluginInSource.key,
                  },
                ]
              : [];
          }),
        );
      if (enabled && marketplace === SYNCED) {
        let De = new Set(allPlugins.errors.filter(isDependencyError).map((error) => error.source));
        let Ie = localCopyShadowingSynced(p, [
          ...allPlugins.enabled.filter((Le) => !Le.isBuiltin),
          ...allPlugins.disabled
            .filter((Le) => De.has(Le.source))
            .map((Le) => ({
              ...Le,
              enabled: true,
            })),
          ...allPlugins.enabled.filter((Le) => Le.isBuiltin),
        ]);
        if (Ie !== undefined)
          B = ` (a local copy, ${stripInvisibleKeepEmoji(Ie.source)}, currently takes precedence over the synced one \u2014 disable it in /plugin to run this copy)`;
      }
      if (enabled && marketplace === INLINE_PLUGIN_MARKETPLACE && !M) {
        let { name: De } = splitPluginId(D);
        let Ie = `${De}@${SYNCED}`;
        let filtered = VALID_INSTALLABLE_SCOPES.filter(
          (un) =>
            findPluginInSource(un, D, h)?.value === false && findPluginInSource(un, Ie, h) === undefined,
        );
        if (filtered.length > 0)
          pe = {
            syncedId: Ie,
            scopes: filtered,
          };
      }
      let Ke = locatePluginInstall(D, scope, h);
      L = Ke.override;
      if (scope) {
        D = Ke.atRequested?.key ?? Ke.found?.key ?? D;
        U = Ke.atRequested !== undefined;
        if (
          Ke.atRequested === undefined &&
          Ke.found &&
          SCOPE_PRECEDENCE[Ke.found.scope] > SCOPE_PRECEDENCE[scope]
        )
          return {
            success: false,
            message: `Plugin "${D}" is set at ${Ke.found.scope} scope (which overrides ${scope}). Use --scope ${Ke.found.scope} or omit --scope to auto-detect.`,
            failureCode: "not_installed_at_scope",
            installedScope: Ke.found.scope,
          };
        J = scope;
      } else {
        J = Ke.decidingScope ?? Ke.found?.scope ?? "user";
        D = findPluginInSource(J, D, h)?.key ?? D;
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
    if (enabled && isPluginBlockedByPolicy(D))
      return {
        success: false,
        message: `Plugin "${D}" is blocked by your organization's policy and cannot be enabled`,
        failureCode: "plugin_policy_blocked",
      };
    if (marketplace === SYNCED && L && L.enabling !== enabled && !(P && L.source === "flagSettings"))
      return pluginBlockedResult(D, enabled, L.source, L.key);
    let me = scopeToSettingSource(J);
    let N =
      enabled &&
      isOfficialMarketplace(marketplace) &&
      me === "userSettings" &&
      k === false &&
      (marketplace !== SYNCED || isPluginEnabled(D, pluginRecordsFor(me, D)) !== false)
        ? undefined
        : enabled;
    let Z = "";
    if (marketplace === SYNCED) {
      let Oe = enabledPluginsBySource(me, D, N);
      let ae = pluginSettingAt(
        D,
        Oe.map(({ record }) => record),
      );
      let Ge = ae?.enabled ?? k !== true;
      let source = ae === undefined ? undefined : Oe[ae.index]?.source;
      if (Ge !== enabled && source !== undefined && !(P && source !== "policySettings")) {
        let settingSourceName = getSettingSourceName(source);
        let De =
          source === "localSettings" || source === "projectSettings" || source === "userSettings"
            ? SETTING_SOURCE_TO_SCOPE[source]
            : undefined;
        let Ie = De !== undefined ? ` (--scope ${De})` : "";
        if (!U)
          return {
            success: false,
            message: `Plugin "${D}" would still be ${enabled ? "disabled" : "enabled"} after writing ${J} settings: ${settingSourceName} settings govern it. Change it there${Ie}.`,
            failureCode: "governed_elsewhere",
            ...(De !== undefined && {
              governingScope: De,
            }),
          };
        Z = ` (still ${enabled ? "disabled" : "enabled"} here: ${settingSourceName} settings govern it${Ie})`;
      }
      if (!getEnabledSettingSources().includes(me))
        Z += ` (this session ignores ${getSettingSourceName(me)} settings: --setting-sources)`;
    }
    for (let { scope, key } of Ee) {
      if (scope === J && nfcLower(key) === nfcLower(D)) continue;
      let { error } = await writeEnabledPlugins(scopeToSettingSource(scope), key, true, {}, storageV5);
      if (error)
        return {
          success: false,
          message: `Failed to ${u} plugin: ${error.message}`,
          failureCode: "settings_write_failed",
        };
    }
    if (
      !enabled &&
      isOfficialMarketplace(marketplace) &&
      J === "project" &&
      (getPolicyEnabledPluginEntries()?.some(
        (Oe) =>
          Oe.enabled &&
          pluginNameAliases_2(Oe).some((ae) => nfcLower(ae) === nfcLower(parsePluginId(D).name)),
      ) ??
        false)
    ) {
      let { error } = await writeEnabledPlugins("userSettings", D, false, {}, storageV5);
      if (error)
        return {
          success: false,
          message: `Failed to ${u} plugin: ${error.message}`,
          failureCode: "settings_write_failed",
        };
    }
    if (pe) {
      let { syncedId, scopes } = pe;
      for (let scope of scopes) {
        if (scope === J) continue;
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
            message: `Failed to ${u} plugin: ${error.message}`,
            failureCode: "settings_write_failed",
          };
      }
    }
    let { error } = await writeEnabledPlugins(
      me,
      D,
      N,
      pe?.scopes.includes(J)
        ? {
            [pe.syncedId]: false,
          }
        : {},
      storageV5,
    );
    if (error)
      return {
        success: false,
        message: `Failed to ${u} plugin: ${error.message}`,
        failureCode: "settings_write_failed",
      };
    refreshPluginCaches(storageV5);
    let { name: pluginName } = splitPluginId(D);
    return {
      success: true,
      message: `Successfully ${u}d plugin: ${pluginName}${Z}${B}${enabled ? "" : flagSettingsEnabledNote(D)}`,
      pluginId: D,
      pluginName,
      scope: J,
    };
  }
  if (scope) assertInstallableScope(scope);
  let rootId;
  let y;
  let found = findPluginInSettings(pluginId);
  if (scope) {
    y = scope;
    if (found) rootId = found.pluginId;
    else if (pluginId.includes("@")) rootId = pluginId;
    else
      return {
        success: false,
        message: `Plugin "${pluginId}" not found in settings. Use plugin@marketplace format.`,
        failureCode: "ambiguous_marketplace",
      };
  } else if (found) {
    rootId = found.pluginId;
    y = found.scope;
  } else if (pluginId.includes("@")) {
    rootId = pluginId;
    y = "user";
  } else
    return {
      success: false,
      message: `Plugin "${pluginId}" not found in any editable settings scope. Use plugin@marketplace format.`,
      failureCode: "ambiguous_marketplace",
    };
  if (enabled && isPluginBlockedByPolicy(rootId))
    return {
      success: false,
      message: `Plugin "${rootId}" is blocked by your organization's policy and cannot be enabled`,
      failureCode: "plugin_policy_blocked",
    };
  let T = enabled ? undefined : managedPluginRefusal(rootId);
  if (T !== undefined) return T;
  if (isNpmPluginSource(rootId)) {
    let J = parsePluginIdentifier(rootId).name ?? rootId;
    if (enabled && pluginDirectoryPolicyBlock() !== null)
      return {
        success: false,
        message: directoryBlockedMessage(J),
        failureCode: "marketplace_policy_blocked",
      };
    if (enabled && (await isPluginDirectoryListingBlocked(J, storageV5)))
      return {
        success: false,
        message: `Plugin "${quotedPrintable(rootId)}" is blocked by your organization's policy and cannot be enabled`,
        failureCode: "plugin_policy_blocked",
      };
    await seedBindingsFromInstall(rootId, getInstalledPlugins().plugins[rootId]);
  }
  let settingSource = scopeToSettingSource(y);
  let w = lookupByPluginAliases(getSettingsForSourceForUpkeep(settingSource)?.enabledPlugins, rootId);
  let b = scope && found && SCOPE_PRECEDENCE[scope] > SCOPE_PRECEDENCE[found.scope];
  if (scope && w === undefined && found && found.scope !== scope && !b)
    return {
      success: false,
      message: `Plugin "${pluginId}" is installed at ${found.scope} scope, not ${scope}. Use --scope ${found.scope} or omit --scope to auto-detect.`,
      failureCode: "not_installed_at_scope",
      installedScope: found.scope,
    };
  let _e =
    scope && !b
      ? w === true || (!enabled && getPluginEnablingSource(rootId, h) === "flagSettings")
      : legacyPluginIds(canonicalPluginId(rootId)).length > 0
        ? findEnabledSettingForPlugin(canonicalPluginId(rootId)) === true
        : getPluginEditableScopes().has(rootId);
  if (enabled === _e)
    return {
      success: false,
      alreadyInGoalState: true,
      failureCode: "already_in_goal_state",
      message: `Plugin "${pluginId}" is already ${enabled ? "enabled" : "disabled"}${scope ? ` at ${scope} scope` : ""}`,
    };
  let rdeps;
  if (!enabled) {
    let { enabled, disabled } = await loadAllPlugins(storageV5);
    let ce = [...enabled, ...disabled];
    let ge = canonicalPluginId(rootId);
    let reverseDependentNames = findReverseDependentNames(ge, ce);
    if (reverseDependentNames.length > 0) rdeps = reverseDependentNames;
    if (!a?.bypassDependentsBlock) {
      let M = buildRequiredByPolicyMap(ce).get(nfcLower(ge)) ?? [];
      if (M.length > 0)
        return {
          success: false,
          message: requiredDependencyMessage(parsePluginIdentifier(rootId).name, M),
          failureCode: "required_by_organization",
          reverseDependents: M.map((P) => P.name),
        };
    }
    let pe = isSyncWanted() ? ce : ce.filter((M) => marketplaceSuffix(M.source) !== SYNCED);
    let reverseDependentNames_2 = findReverseDependentNames(ge, pe);
    if (reverseDependentNames_2.length > 0 && !a?.bypassDependentsBlock) {
      let { name: M } = parsePluginIdentifier(rootId);
      let rdeps = collectTransitiveDependents(ge, pe);
      let mapped = [...rdeps, rootId].map((B) => claudeCommand("plugin disable", B));
      let U = mapped.every((B) => B !== null)
        ? `, or disable everything together: ${mapped.join(" && ")}`
        : ", or disable them together in /plugin.";
      return {
        success: false,
        message: `${M} is still required by ${reverseDependentNames_2.map(stripInvisibleKeepEmoji).join(", ")}. Disable ${plural(reverseDependentNames_2.length, "that plugin", "those plugins")} first${U}`,
        failureCode: "required_by_dependents",
        reverseDependents: reverseDependentNames_2,
        disableFirst: rdeps,
      };
    }
  }
  let W = [];
  if (enabled) {
    let { enabled, disabled } = await loadAllPlugins(storageV5);
    let { closure, missing } = computeDependencyClosure(rootId, [...enabled, ...disabled]);
    if (missing.length > 0) {
      let { name: N } = parsePluginIdentifier(rootId);
      let mapped = missing.map((he) => claudeCommand("plugin install", he));
      let S = mapped.every((he) => he !== null) ? `: ${mapped.join(" && ")}` : " from /plugin.";
      return {
        success: false,
        message: `${N} depends on ${missing.join(", ")}, which ${plural(missing.length, "is", "are")} not installed. Install ${plural(missing.length, "it", "them")} first${S}`,
        failureCode: "dependency_missing",
        dependencies: missing,
      };
    }
    let k = new Set(enabled.map((N) => N.source));
    let pe = new Map(
      [...enabled, ...disabled]
        .filter((N) => isOfficialMarketplace(marketplaceSuffix(N.source)))
        .map((N) => [N.source, N]),
    );
    let enabledPluginsBySource = getEnabledPluginsBySource();
    let filtered = closure.filter(
      (N) =>
        isOfficialMarketplace(marketplaceSuffix(N)) &&
        !k.has(N) &&
        !isPluginEnabled_2(
          N,
          enabledPluginsBySource,
          pe.get(N)?.manifest.defaultEnabled,
          pe.get(N)?.installationPreference,
        ),
    );
    if (filtered.length > 0) {
      let { name: N } = parsePluginIdentifier(rootId);
      let Z = filtered.length;
      let mapped = filtered.map((re) => claudeCommand("plugin enable", re));
      let he = mapped.every((re) => re !== null) ? `: ${mapped.join(" && ")}` : " in /plugin.";
      return {
        success: false,
        message: `${N} depends on ${filtered.join(", ")}, ${plural(Z, "a local copy that is", "local copies that are")} currently disabled. Enable ${plural(Z, "it", "them")} first${he}`,
        failureCode: "dependency_disabled",
        dependencies: filtered,
      };
    }
    let filtered_2 = closure.filter((N) => !isOfficialMarketplace(marketplaceSuffix(N)));
    let filtered_3 = filtered_2.filter((N) => isPluginBlockedByPolicy(N));
    if (filtered_3.length > 0) {
      let { name: N } = parsePluginIdentifier(rootId);
      return {
        success: false,
        message: `${N} depends on ${filtered_3.join(", ")}, which ${plural(filtered_3.length, "is", "are")} blocked by your organization's plugin policy. Ask an admin to allow ${plural(filtered_3.length, "it", "them")}.`,
        failureCode: "dependency_policy_blocked",
      };
    }
    let sorted = [...VALID_INSTALLABLE_SCOPES].sort((N, Z) => SCOPE_PRECEDENCE[Z] - SCOPE_PRECEDENCE[N]);
    let B = [];
    for (let N of filtered_2)
      for (let Z of sorted) {
        if (SCOPE_PRECEDENCE[Z] <= SCOPE_PRECEDENCE[y]) continue;
        let S = getSettingsForSourceForUpkeep(scopeToSettingSource(Z))?.enabledPlugins?.[N];
        if (S === undefined) continue;
        if (S === false)
          B.push({
            dep: N,
            scope: Z,
          });
        break;
      }
    if (B.length > 0) {
      let { name: N } = parsePluginIdentifier(rootId);
      let joined = B.map((re) => `${re.dep} (${re.scope} scope)`).join(", ");
      let S = uniq(B.map((re) => re.scope));
      let he = S.length === 1 ? `, or use --scope ${S[0]} to write where the override lives` : "";
      return {
        success: false,
        message: `${N} depends on ${joined}, which ${plural(B.length, "is", "are")} disabled there. Enable ${plural(B.length, "it", "them")} at that scope${he}.`,
        failureCode: "dependency_disabled",
        dependencies: B.map((re) => re.dep),
      };
    }
    let enabledPluginIdsInSource = getEnabledPluginIdsInSource(settingSource);
    W = filtered_2.filter((N) => !enabledPluginIdsInSource.has(N));
  }
  let { error } = await writeEnabledPlugins(
    settingSource,
    rootId,
    enabled,
    Object.fromEntries(W.map((J) => [J, true])),
    storageV5,
  );
  if (error)
    return {
      success: false,
      message: `Failed to ${u} plugin: ${error.message}`,
      failureCode: "settings_write_failed",
    };
  refreshPluginCaches(storageV5);
  if (enabled) {
    seedPluginUsage([rootId, ...W], storageV5);
    touchPluginUsage([rootId, ...W], storageV5);
  }
  let { name: pluginName } = parsePluginIdentifier(rootId);
  let depWarn = formatReverseDependentsSuffix(rdeps);
  let we =
    W.length > 0
      ? ` (also enabled ${W.length} ${plural(W.length, "dependency", "dependencies")}: ${W.map((J) => parsePluginIdentifier(J).name).join(", ")})`
      : "";
  return {
    success: true,
    message: `Successfully ${u}d plugin: ${pluginName} (scope: ${y})${enabled ? "" : flagSettingsEnabledNote(rootId)}${depWarn}${we}`,
    pluginId: rootId,
    pluginName,
    scope: y,
    reverseDependents: rdeps,
  };
}
//@ chunk-pp50kewz.js:99791-99844 layout
/**
 * 启用插件：setPluginEnabledOp(pluginId, true, scope)。
 */
async function enablePluginOp(e, n, storageV5) {
  return setPluginEnabledOp(e, true, n, undefined, storageV5);
}
//@ chunk-pp50kewz.js:99844-99897 layout
/**
 * 禁用插件：setPluginEnabledOp(pluginId, false, scope)。
 */
async function disablePluginOp(e, n, storageV5) {
  return setPluginEnabledOp(e, false, n, undefined, storageV5);
}
//@ chunk-pp50kewz.js:99897-102187 layout
/**
 * 列出必须保持启用的插件：托管策略 policySettings 启用的、claude.ai 同步要求的，以及它们的依赖闭包；用于禁止禁用。
 */
async function listRequiredPlugins(e) {
  let pluginEditableScopes = getPluginEditableScopes();
  await ensureSyncedPluginDirsRegistered();
  let i = await listSyncedRequiredPlugins(e);
  let a = uniq(i.map((P) => P.id));
  let o = new Set(i.filter((P) => P.required).map((P) => nfcLower(P.id)));
  let u = enabledPluginRecordsBySource();
  let h = groupedEnabledPlugins();
  let filtered = [
    ...a,
    ...u
      .filter(({ source }) => source === "policySettings")
      .flatMap(({ record }) => Object.keys(record ?? {})),
  ].filter((P) => getPluginEnablingSource(P, h) === "policySettings");
  let r =
    (o.size > 0 && isSyncAvailable()) || filtered.length > 0
      ? await loadAllPlugins(e).then((allPlugins) => [...allPlugins.enabled, ...allPlugins.disabled])
      : [];
  let c = new Set(
    r.filter((P) => marketplaceSuffix(P.source) === INLINE_PLUGIN_MARKETPLACE).map((P) => nfcLower(P.source)),
  );
  let y = (P) => {
    let L = normalizePluginId(P);
    let U = marketplaceSuffix(L);
    if (U === INLINE_PLUGIN_MARKETPLACE) {
      if (c.has(nfcLower(L))) return false;
    } else if (U !== SYNCED) return false;
    let sliced = L.slice(0, L.lastIndexOf("@"));
    return o.has(nfcLower(`${sliced}@${SYNCED}`));
  };
  let T = ((P) => new Set(P.flatMap(({ record }) => Object.keys(record ?? {}).map(nfcLower))))(u);
  let filtered_2 = a.filter((P) => !T.has(nfcLower(P)) && !y(P));
  let w = (P) => new Set(P.flatMap(({ record }) => Object.keys(record ?? {})));
  let b = w(u);
  let _e = w(u.filter(({ source }) => TRUSTED_SETTING_SOURCES.includes(source)));
  let filtered_3 = getBuiltinPlugins()
    .enabled.map((P) => P.source)
    .filter((P) => {
      let L = hasTrustedOnlyBuiltinPlugin(P) ? _e : b;
      return ![P, ...legacyPluginIds(P)].some((U) => L.has(U));
    });
  let W = new Set(buildRequiredByPolicyMap(r).keys());
  let se = (P) => W.has(nfcLower(normalizePluginId(P)));
  let Ce = [...pluginEditableScopes.keys(), ...filtered_2, ...filtered_3];
  let X = uniq(Ce.filter((P) => !isManagedDisabled(P, y, h) && se(P)));
  let filtered_4 = [...filtered_2, ...filtered_3].filter((P) => !isManagedDisabled(P, y, h) && !se(P));
  let filtered_5 = [...pluginEditableScopes.keys()].filter(
    (key) => !isManagedDisabled(key, y, h) && !se(key),
  );
  let size = new Set([
    ...o,
    ...[
      ...filtered_3,
      ...a,
      ...r.map((P) => P.source),
      ...[...pluginEditableScopes].filter(([, P]) => P !== "managed").map(([P]) => P),
    ]
      .filter((P) => getPluginEnablingSource(P, h) === "policySettings")
      .map(nfcLower),
  ]).size;
  let ce =
    X.length > 0
      ? ` and ${X.length} ${plural(X.length, "plugin")} ${plural(size, "it depends", "they depend")} on`
      : "";
  let ge = size > 0 ? ` (skipped ${size} required by your organization${ce})` : "";
  if (filtered_5.length === 0 && filtered_4.length === 0)
    return {
      success: true,
      message: `No enabled plugins to disable${ge}`,
    };
  let k = [];
  let pe = [];
  for (let P of filtered_5) {
    let L = await setPluginEnabledOp(
      P,
      false,
      undefined,
      {
        bypassDependentsBlock: true,
      },
      e,
    );
    if (L.success) k.push(P);
    else pe.push(stripInvisibleKeepEmoji(`${P}: ${L.message}`));
  }
  for (let P of filtered_4) {
    let { error } = await updateSettingsForSourceWithTransform(
      "userSettings",
      (U) => ({
        enabledPlugins: {
          ...U?.enabledPlugins,
          [P]: false,
        },
      }),
      undefined,
      e,
    );
    if (error) pe.push(stripInvisibleKeepEmoji(`${P}: ${error.message}`));
    else k.push(P);
  }
  if (filtered_4.length > 0) refreshPluginCaches(e);
  let Ee = count(k, (P) => getPluginEnablingSource(P, h) === "flagSettings");
  let M =
    Ee > 0 ? ` (${Ee} still enabled this session: --settings keeps ${plural(Ee, "it", "them")} on)` : "";
  if (pe.length > 0)
    return {
      success: false,
      message: `Disabled ${k.length} ${plural(k.length, "plugin")}${ge}${M}, ${pe.length} failed:
${pe.join(`
`)}`,
      failureCode: "partial_failure",
    };
  return {
    success: true,
    message: `Disabled ${k.length} ${plural(k.length, "plugin")}${ge}${M}`,
  };
}
//@ chunk-pp50kewz.js:102187-102435 layout
async function listSyncedRequiredPlugins(storageV5) {
  return (
    await Promise.all(
      getSyncedPluginDirs().map(async (i) => {
        let a = await syncedPluginMintedName(i, storageV5);
        if (a === undefined) return [];
        let o = `${a}@${SYNCED}`;
        let pluginAttribution = await getPluginAttribution(resolve(i));
        return [
          {
            id: o,
            required:
              isRequiredPlugin(o, pluginAttribution.installationPreference) &&
              lockedDependentName(o, pluginAttribution.marketplaceName) === undefined,
          },
        ];
      }),
    )
  ).flat();
}
//@ chunk-pp50kewz.js:102435-102675 layout
function buildRequiredByPolicyMap(plugins) {
  let n = new Map();
  let i = isSyncAvailable();
  let a = groupedEnabledPlugins();
  for (let o of plugins) {
    if (
      !(i && isRequiredPlugin(o.source, o.installationPreference)) &&
      getPluginEnablingSource(o.source, a) !== "policySettings"
    )
      continue;
    for (let h of computeDependencyClosure(o.source, plugins).closure) {
      let p = nfcLower(h);
      n.set(p, [...(n.get(p) ?? []), o]);
    }
  }
  return n;
}
//@ chunk-pp50kewz.js:102675-102882 layout
function requiredDependencyMessage(name, n) {
  return `${name} is needed by ${n.map((i) => stripInvisibleKeepEmoji(i.name)).join(", ")}, which ${plural(n.length, "is", "are")} required by your organization, so it can't be disabled here. Contact your admin to change it.`;
}
//@ chunk-pp50kewz.js:102882-103014 layout
/**
 * “该插件由组织要求启用，不能在此禁用”的提示文本。
 */
function requiredPluginMessage(id) {
  return `Plugin "${id}" is required by your organization and can't be disabled here. Contact your admin to change it.`;
}
//@ chunk-pp50kewz.js:103014-104076 layout
/**
 * 更新插件的操作入口（CLI 与 /plugin 界面共用）：执行实际更新，异常按 failureCode 分 bad/sad 记 plugin_update_op 遥测，返回 {outcome, message, scope, failureCode}。
 */
async function updatePluginOp(pluginId, scope, i = {}, storageV5) {
  let o;
  try {
    o = await updatePluginOpInner(pluginId, scope, i, storageV5);
  } catch (error) {
    let p = {
      is_directory: isOfficialDirectoryPlugin(pluginId),
    };
    if (error instanceof CommandSourceError) {
      let failureCode = error instanceof EntryHelperError ? error.failureCode : "command_source_refused";
      if (FAILURE_CODE_SEVERITY[failureCode] === "sad") logFeatureSad("plugin_update_op", failureCode, p);
      else logFeatureBad("plugin_update_op", failureCode, p);
      return {
        outcome: "failed",
        message: error.message,
        scope,
        failureCode,
      };
    }
    logFeatureBad("plugin_update_op", "exception", p);
    throw error;
  }
  let u = {
    is_directory: isOfficialDirectoryPlugin(o.pluginId ?? pluginId),
    pin_changed: o.pinChanged === true,
    no_clone_short_circuit: o.noCloneShortCircuit === true,
    not_checked: o.notChecked === true,
  };
  switch (o.outcome) {
    case "failed":
      if (o.failureCode !== undefined && FAILURE_CODE_SEVERITY[o.failureCode] === "sad")
        logFeatureSad("plugin_update_op", o.failureCode, u);
      else logFeatureBad("plugin_update_op", o.failureCode ?? "op_failed", u);
      break;
    case "skipped":
      logFeatureSad("plugin_update_op", o.skipReason ?? "skipped", u);
      break;
    case "up_to_date":
    case "updated":
      if (o.refreshFailed)
        logFeatureSad(
          "plugin_update_op",
          o.refreshRefusedByPolicy ? "marketplace_refresh_policy_refused" : "marketplace_refresh_failed",
          u,
        );
      else
        logFeatureOk("plugin_update_op", {
          already_up_to_date: o.outcome === "up_to_date",
          version_unknown: o.newVersion === "unknown",
          ...u,
        });
      break;
  }
  return o;
}
//@ chunk-pp50kewz.js:104076-105363 layout
/**
 * 更新结果为 up_to_date 时补充检查：安装路径已不存在则改报需重新安装。
 */
async function annotateUpToDateResult(e, n, i, a) {
  if (e.outcome !== "up_to_date") return e;
  let { absolute, suspect } = classifyMarketplacePath(n.installPath);
  let p =
    (suspect
      ? undefined
      : await cacheCopyDependencyGap(absolute).catch(() => {
          return;
        })
    )?.kind === "not-installed"
      ? await realPathInsideCache(absolute)
      : undefined;
  if (p === undefined) return e;
  if (isEssentialTrafficOnly()) return e;
  let r = n.projectPath ? `${n.scope} (${n.projectPath})` : n.scope;
  let c;
  let y = false;
  try {
    await unvouchBeforeDependencyStep(absolute, a);
    c = (
      await installPluginDependencies(absolute, {
        inPlaceAt: p,
      })
    ).error;
  } catch (error) {
    y = true;
    c = errorMessage(error);
  }
  let j;
  if (!y)
    await rescreenCachedPluginTree(absolute, a).catch((error) => {
      j = errorMessage(error);
    });
  if (!(
    !y &&
    (await realPathInsideCache(absolute)) === p &&
    (await hasNodeModulesDir(absolute)) &&
    (await cacheCopyDependencyGap(absolute).then(
      (I) => I === undefined,
      () => false,
    ))
  ))
    return {
      pluginId: e.pluginId,
      newVersion: e.newVersion,
      oldVersion: e.oldVersion,
      scope: e.scope,
      outcome: "failed",
      message: `Could not install the packages that "${i}" lists for scope ${r}, so parts of it may not work. Updating it again retries the install.${c ? ` Cause: ${quotedPrintable(c)}` : ""}`,
      failureCode: "dependencies_not_installed",
    };
  if (j !== undefined)
    return {
      pluginId: e.pluginId,
      newVersion: e.newVersion,
      oldVersion: e.oldVersion,
      scope: e.scope,
      outcome: "failed",
      message: `Installed the packages that "${i}" lists for scope ${r}, but could not finish checking them for links that lead outside the plugin. Cause: ${quotedPrintable(j)}`,
      failureCode: "dependencies_not_screened",
    };
  return {
    ...e,
    outcome: "updated",
    message: `Installed the packages that "${i}" lists for scope ${r}. Restart to apply changes. ${e.message}`,
  };
}
//@ chunk-pp50kewz.js:105363-121835 layout
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
  let c = explicit;
  pluginId = normalizePluginId(pluginId);
  let { name: y, marketplace } = parsePluginId(pluginId);
  let T = pluginOperationRefusal(pluginId, marketplace, "update");
  if (T !== undefined)
    return {
      outcome: "failed",
      message: T,
      failureCode: unmanageablePluginReason(pluginId, marketplace),
    };
  let installedListRefusal = await getInstalledListRefusal(storageV5);
  if (installedListRefusal !== undefined)
    return {
      outcome: "failed",
      message: `Plugin "${quotedPrintable(pluginId)}" was not updated: ${readInstalledPluginsFile(installedListRefusal)}`,
      failureCode: "install_records_unreadable",
    };
  let w = marketplace;
  let b = w ? `${y}@${w}` : pluginId;
  let _e =
    isStorageV5Enabled() && storageV5 !== undefined
      ? await loadInstalledPlugins(storageV5)
      : loadInstalledPluginsSync();
  let pluginName = findPluginName(Object.keys(_e.plugins), b);
  if (pluginName === undefined && w === undefined) {
    let filtered = pluginsNamed(Object.keys(_e.plugins), y).filter((Q) => (_e.plugins[Q]?.length ?? 0) > 0);
    if (filtered.length > 1)
      return {
        outcome: "failed",
        message: `Plugin "${printableName(y, 200)}" is installed from more than one marketplace. Include the marketplace name to pick one: ${filtered.map((Q) => `\`claude plugin update ${printableName(Q, 200)}\``).join(" or ")}`,
        scope,
        failureCode: "ambiguous_marketplace",
      };
    if (filtered.length === 0)
      return {
        outcome: "failed",
        message: `Plugin "${printableName(y, 200)}" is not installed`,
        scope,
        failureCode: "not_installed",
      };
    pluginName = filtered[0];
  }
  if (pluginName) {
    b = pluginName;
    ({ marketplace: w } = parsePluginIdentifier(b));
  }
  let W = pluginName ? _e.plugins[pluginName] : undefined;
  let se = await seedBindingsFromInstall(b, W);
  let Ce = undefined;
  if (Ce !== undefined && !Ce.ok)
    return {
      outcome: "failed",
      message: Ce.message,
      pluginId: b,
      scope,
      failureCode: "not_found",
    };
  let X;
  let we = false;
  let J;
  let D = false;
  if (isPluginBlockedByPolicy(b))
    return {
      outcome: "failed",
      message: `Plugin "${printableName(b, 200)}" is blocked by your organization's policy and was not updated`,
      pluginId: b,
      scope,
      failureCode: "plugin_policy_blocked",
    };
  if (w === pluginManifestPathSchemas) {
    if (!npmMarketplaceEnabled())
      return {
        outcome: "failed",
        message: NPM_DIRECT_INSTALL_DISABLED_MESSAGE,
        pluginId: b,
        scope,
        failureCode: "npm_marketplace_disabled",
      };
    if (!W || W.length === 0)
      return {
        outcome: "failed",
        message: `Plugin "${y}" is not installed`,
        pluginId: b,
        scope,
        failureCode: "not_installed",
      };
    return performPluginUpdate(b, y, scope ?? VALID_UPDATE_SCOPES_2(W), W, storageV5, explicit);
  }
  if (w) {
    let knownMarketplacesWithDeclared = await loadKnownMarketplacesWithDeclared(storageV5);
    let Q = ownPropertyOrUndefined(knownMarketplacesWithDeclared, w);
    let source = Q?.source;
    if (source && isPluginDirectorySource(source) && (await getPluginDirectoryState()) === "blocked")
      return {
        outcome: "failed",
        message: directoryBlockedMessage(y),
        pluginId: b,
        scope,
        failureCode: "marketplace_policy_blocked",
      };
    let ue = !source && w === OFFICIAL_MARKETPLACE_NAME && isPluginDirectoryAvailable();
    if (
      isSourceDisallowedOrUnverifiable(
        ue
          ? {
              source: "pluginDirectory",
            }
          : source,
      )
    )
      return {
        outcome: "failed",
        message: `Plugin "${y}" is from marketplace "${w}", which is blocked by your organization's policy`,
        pluginId: b,
        scope,
        failureCode: "marketplace_policy_blocked",
      };
    if (Q !== undefined && isImpersonatingOfficialMarketplace(w, Q))
      return {
        outcome: "failed",
        message: describeImpersonatingMarketplace(w, Q),
        pluginId: b,
        scope,
        failureCode: "not_found",
      };
    D = !source && w === OFFICIAL_MARKETPLACE_NAME && !isPluginDirectoryAvailable();
    if (
      !skipMarketplaceRefresh &&
      ((source &&
        (source.source === "github" ||
          source.source === "git" ||
          source.source === "url" ||
          source.source === "claudeai" ||
          source.source === "pluginDirectory")) ||
        (!source && w === OFFICIAL_MARKETPLACE_NAME && isPluginDirectoryAvailable()))
    )
      try {
        await refreshMarketplaceDeduped(w, storageV5, undefined, {
          skipIfRecent: true,
        });
      } catch (error) {
        we = error instanceof CommandSourceError;
        X = we
          ? "marketplace not refreshed \u2014 your organization's managed settings forbid its headersHelper (the version shown is from the cached catalog; ask your admin)"
          : `marketplace not refreshed (${oneLineClipped(errorMessage(error))})`;
        if (error instanceof PluginDirectoryUnavailableError) J = oneLineClipped(error.message);
        logForDebugging(
          `Failed to refresh marketplace '${w}' before update; using cached data: ${errorMessage(error)}`,
          {
            level: "warn",
          },
        );
      }
  }
  let ce = {
    pluginName: y,
    refreshWarning: X,
    directoryRefreshFailed: w === OFFICIAL_MARKETPLACE_NAME && !we,
    directoryNotChecked: D,
  };
  let ge =
    skipMarketplaceRefresh || J !== undefined
      ? await getPluginByIdCacheOnly(b, storageV5)
      : await getPluginById(b, storageV5, "update");
  if (!ge && !skipMarketplaceRefresh && w === OFFICIAL_MARKETPLACE_NAME) {
    if (J !== undefined)
      return {
        outcome: "failed",
        message: `Could not check "${quotedPrintable(y)}" for updates. ${J}`,
        pluginId: b,
        scope,
        failureCode: "directory_unavailable",
      };
    if (await isPluginDirectoryListingBlocked(y, storageV5))
      return {
        outcome: "failed",
        message: `Plugin "${quotedPrintable(y)}" is blocked by your organization's policy and was not updated`,
        pluginId: b,
        scope,
        failureCode: "plugin_policy_blocked",
      };
    let R = await pluginDirectoryNotInstallableMessage(y);
    if (R !== undefined)
      return {
        outcome: "failed",
        message: `"${quotedPrintable(y)}" was not updated: ${R}`,
        pluginId: b,
        scope,
        failureCode: "directory_listing_not_installable",
      };
  }
  if (!ge)
    return {
      outcome: "failed",
      message: skipMarketplaceRefresh
        ? `Plugin "${y}" is not in the locally cached marketplace catalog; it was not re-resolved.`
        : `Plugin "${y}" not found`,
      pluginId: b,
      scope,
      failureCode: skipMarketplaceRefresh ? "not_cached" : "not_found",
    };
  let { entry } = ge;
  let { marketplaceInstallLocation } = ge;
  if (!W || W.length === 0)
    return {
      outcome: "failed",
      message: `Plugin "${y}" is not installed`,
      pluginId: b,
      scope,
      failureCode: "not_installed",
    };
  if (scope === undefined) scope = VALID_UPDATE_SCOPES_2(W);
  let projectPathForScope = getProjectPathForScope(scope);
  let filtered = W.filter((R) => R.scope === scope);
  let installationForCurrentProject = findInstallationForCurrentProject(filtered);
  if (!installationForCurrentProject && filtered.length > 1)
    logForDebugging(
      `updatePluginOp: ${filtered.length} ${scope}-scope installs, none match CWD '${projectPathForScope}'; updating '${filtered[0]?.projectPath}' only`,
      {
        level: "warn",
      },
    );
  let L = installationForCurrentProject ?? filtered[0];
  if (!L) {
    let R = projectPathForScope ? `${scope} (${projectPathForScope})` : scope;
    return {
      outcome: "failed",
      message: `Plugin "${y}" is not installed at scope ${R}`,
      pluginId: b,
      scope,
      failureCode: "not_installed_at_scope",
    };
  }
  let projectPath = L.projectPath;
  let B;
  if (typeof entry.source === "object" && entry.source.source === "command") {
    let R = areCommandPluginSourcesDisabledByPolicy();
    let Q = R || skipCommandSources;
    let x = findPluginName(await checkEnabledPlugins(), b) !== undefined;
    let ue = R || (skipCommandSources && !x);
    let extra = scope === "user" ? undefined : `--scope ${scope}`;
    B = Q ? undefined : await announceCommandSource?.(b, entry, L.sourceCommand);
    let ze =
      announceCommandSource !== undefined &&
      !isPluginsDirOnLocalDisk() &&
      L.sourceCommand === describeCommandOutputMode(entry.source);
    if (Q || (B === undefined && !ze && !x))
      return {
        outcome: "failed",
        message:
          skipCommandSources && !ue
            ? `${printableName(y, 200)} is installed by running a command, which the background marketplace update never runs; it is left to the per-session re-resolve (when that is enabled) or an explicit update \u2014 ${runCommandHint(
                "plugin update",
                b,
                {
                  extra,
                  fallback: "a per-plugin update reviews it",
                },
              )}.`
            : R
              ? commandPluginSourcesDisabledMessage()
              : `${printableName(y, 200)} is disabled, so the command that installs it was not run. Enable it first, then ${runCommandHint(
                  "plugin update",
                  b,
                  {
                    extra,
                    fallback: "update it explicitly",
                  },
                )}.`,
        pluginId: b,
        scope,
        failureCode: skipCommandSources && !ue ? "command_source_skipped" : "command_source_inactive",
      };
  }
  let fsImplementation = getFsImplementation();
  let version = L.version;
  let { enabled, disabled } = skipMarketplaceRefresh
    ? await loadAllPluginsCacheOnly(storageV5)
    : await loadAllPlugins(storageV5);
  let constraintsOn = collectConstraintsOn(b, [...enabled, ...disabled]);
  let filtered_2 = constraintsOn.filter((R) => R.constraint.version !== undefined);
  let filtered_3 = constraintsOn.map((R) => R.constraint.version).filter((R) => R !== undefined);
  let ae;
  let Ge = "";
  let knownMarketplacesWithDeclared = await loadKnownMarketplacesWithDeclared(storageV5);
  let source = knownMarketplacesWithDeclared[w ?? ""]?.source;
  let De = (R) =>
    explicit && !isLinkModeCommandSource(entry.source) && !isLocalMarketplaceEntry(entry.source, source)
      ? annotateUpToDateResult(R, L, y, storageV5)
      : Promise.resolve(R);
  if (filtered_3.length > 0) {
    let R = intersectVersionConstraints(filtered_3);
    if (!R.ok)
      return {
        outcome: "skipped",
        message: `Skipped \u2014 ${describeConstraintConflict("Plugin", b, filtered_3, R.reason)}`,
        pluginId: b,
        scope,
        blockedBy: filtered_2.map((ue) => ue.plugin.source),
        oldVersion: version,
        skipReason: "pinner_blocked",
      };
    let source = knownMarketplacesWithDeclared[w ?? ""]?.source;
    let x =
      getPluginCloneUrl(entry.source) ??
      (typeof entry.source === "string" ? getMarketplaceCloneUrl(source) : null);
    if (x !== null && R.range !== "*" && !b.endsWith(`@${OFFICIAL_MARKETPLACE_NAME}`)) {
      let versionRange = await resolveVersionRange(x, entry.name, R.range);
      if (versionRange === null)
        logForDebugging(
          `updatePluginOp(${b}): no ${entry.name}--v* tag satisfying ${R.range}; falling back to HEAD + post-fetch guard`,
        );
      else if (versionRange.version === L.resolvedVersion && versionRange.sha === L.gitCommitSha)
        return De({
          outcome: "up_to_date",
          message: appendRefreshWarning(
            ce,
            `${y} is already at the latest version satisfying ${filtered_3.join(", ")} (${versionRange.version}, required by ${filtered_2.map((fe) => fe.plugin.name).join(", ")}).`,
          ),
          pluginId: b,
          newVersion: L.version,
          oldVersion: version,
          scope,
          refreshFailed: X !== undefined ? true : undefined,
          refreshRefusedByPolicy: we || undefined,
        });
      else {
        ae = versionRange;
        Ge = ` (highest tag satisfying ${filtered_3.join(", ")} from ${filtered_2.map((fe) => fe.plugin.name).join(", ")})`;
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
  let Ie;
  let Le;
  let archiveSha256;
  let qe;
  let fn;
  let vn = false;
  let gitCommitSha;
  let K;
  let q;
  {
    let source = entry.source;
    let Q = typeof source === "object" && source.source === "claudeai";
    let claudeaiPluginId = L.claudeaiPluginId;
    if (
      (claudeaiPluginId !== undefined && (!Q || source.pluginId !== claudeaiPluginId)) ||
      (claudeaiPluginId === undefined && Q)
    )
      return {
        outcome: "failed",
        message:
          claudeaiPluginId === undefined
            ? `${y} is listed by a claude.ai-hosted marketplace but its install record no longer says which claude.ai plugin it came from \u2014 not updated. Uninstall and install it again to re-pin it.`
            : `${y} was installed from a claude.ai-hosted marketplace, but "${w}" now lists ${Q ? "a different claude.ai plugin" : "another source"} under that name \u2014 not updated. Uninstall and install it again to switch to what the marketplace lists now, or remove it.`,
        pluginId: b,
        scope,
        failureCode: "claudeai_identity_changed",
      };
  }
  let ie = b.endsWith(`@${OFFICIAL_MARKETPLACE_NAME}`);
  if (ie && isUnboundOfficialPlugin(b, W, se))
    return {
      outcome: "failed",
      message: `"${quotedPrintable(y)}" was not updated: plugin-directory-bindings.json in the plugins folder could not be used (unreadable, a symbolic link or not a file, over 1 MB, damaged, or written by a newer Claude Code), so its ${OFFICIAL_MARKETPLACE_DISPLAY} listing could not be checked against the repository it was installed from. Nothing was changed. Try again; if this repeats, check the file for those causes.`,
      pluginId: b,
      scope,
      failureCode: "directory_binding_unreadable",
    };
  if (ie && isDirectoryRepositoryChanged(b, W, entry.source, se))
    return {
      outcome: "failed",
      message: `"${quotedPrintable(y)}" was not updated: the ${OFFICIAL_MARKETPLACE_DISPLAY} now lists a different repository under that name. Uninstall it, then install the new listing if you want it.`,
      pluginId: b,
      scope,
      failureCode: "directory_identity_changed",
    };
  if (ie && (samePluginSource(entry.source, undefined)?.length ?? 0) > MAX_BINDINGS_FILE_BYTES)
    return {
      outcome: "failed",
      message: `"${quotedPrintable(y)}" was not updated: the repository address in its ${OFFICIAL_MARKETPLACE_DISPLAY} listing is too long. Nothing was changed. Only a change to the listing can fix this.`,
      pluginId: b,
      scope,
      failureCode: "directory_listing_not_installable",
    };
  let V = getBoundRepositoryKeys(b, W, se).length > 0;
  let He = verifyReviewedCommit({
    pluginId: b,
    pluginName: y,
    source: entry.source,
    boundByRecord: V,
    action: "updated",
  });
  if (!He.ok)
    return {
      outcome: "failed",
      message: He.message,
      pluginId: b,
      scope,
      failureCode: "directory_listing_not_installable",
    };
  if (typeof entry.source !== "string") {
    let source = entry.source;
    let Q =
      ae && (source.source === "github" || source.source === "url" || source.source === "git-subdir")
        ? {
            ...source,
            ref: ae.ref,
            sha: ae.sha,
          }
        : source;
    let source_2 = knownMarketplacesWithDeclared[w ?? ""]?.source;
    let ue = marketplaceNameOfId(b);
    let trustedSettingsEntryAuth = findSettingsArchiveEntry(ue, entry.name);
    let ze =
      source.source === "archive"
        ? headersHelperNotRunReason({
            entry,
            archiveUrl: source.url,
            marketplaceSource: source_2,
            trustedSettingsEntryAuth,
          })
        : undefined;
    let Se =
      ze !== undefined && source.source === "archive" ? getEntryHelperConsentSubject(ze, source.url) : null;
    let Fe = Se === null ? null : headersHelperPolicyRefusal(source_2, w);
    let Ye =
      Fe !== null
        ? {
            outcome: "failed",
            message: checkHeadersHelperConsent(entry.name, Fe),
            pluginId: b,
            scope,
            failureCode: helperRefusalFailureCode(Fe),
          }
        : null;
    if (c && Ye !== null) return Ye;
    let sn =
      c && onEntryHelperDisclosure === undefined ? diffEntryHelperConsent(consentedEntryHelper, Se) : null;
    if (sn !== null)
      return {
        outcome: "failed",
        message: describeHelperReview(sn, entry.name, "update"),
        pluginId: b,
        scope,
        failureCode: HELPER_CONSENT_MISMATCH_CODES[sn],
      };
    if (!c && Se !== null) {
      let ye =
        entry.version ??
        (source.source === "archive" && source.sha256 !== undefined
          ? shortLowerPrefix(source.sha256)
          : undefined);
      if (ye !== undefined && ye === version)
        return {
          outcome: "up_to_date",
          message: upToDateMessage(ce, version),
          pluginId: b,
          newVersion: version,
          oldVersion: version,
          scope,
          refreshFailed: X !== undefined ? true : undefined,
          refreshRefusedByPolicy: we || undefined,
        };
      if (Ye !== null) return Ye;
      let We = claudeCommand("plugin update", b);
      return {
        outcome: "skipped",
        message:
          `Skipped \u2014 "${quotedPrintable(entry.name)}" fetches its archive through a headersHelper, which only runs when you update it yourself. Update it from /plugin` +
          (We ? ` (or \`${We}\`).` : "."),
        pluginId: b,
        scope,
        oldVersion: version,
        skipReason: "entry_helper_deferred",
      };
    }
    if (c && Se !== null) {
      if (onEntryHelperDisclosure !== undefined) {
        let ye = await onEntryHelperDisclosure(archiveHelperDisclosure(Se), Se, b);
        if (ye !== "accepted")
          return {
            outcome: "failed",
            message: "Aborted \u2014 the headersHelper command was not confirmed, so it was not run.",
            pluginId: b,
            scope,
            failureCode: ye === "declined" ? "entry_helper_declined" : "entry_helper_unconfirmed",
          };
      }
    }
    if (
      source.source === "claudeai" &&
      ae === undefined &&
      source.version !== "" &&
      source.version === version
    )
      return De({
        outcome: "up_to_date",
        message: upToDateMessage(ce, version),
        pluginId: b,
        newVersion: version,
        oldVersion: version,
        scope,
        refreshFailed: X !== undefined ? true : undefined,
        refreshRefusedByPolicy: we || undefined,
      });
    let an = pinnedSha(b, entry.source);
    if (an !== undefined && (D || L.gitCommitSha === an)) {
      let ye = samePluginSource(entry.source, undefined);
      if (!D && L.gitCommitSha === an && L.directoryRepositoryKey === undefined && ye !== undefined)
        try {
          await recordDirectoryRepositoryKey(b, scope, projectPath, ye, storageV5);
        } catch (error) {
          logForDebugging(`Could not record the repository of ${b}: ${errorMessage(error)}`, {
            level: "warn",
          });
        }
      return De({
        outcome: "up_to_date",
        message: upToDateMessage(ce, version),
        pluginId: b,
        newVersion: version,
        oldVersion: version,
        scope,
        refreshFailed: X !== undefined ? true : undefined,
        refreshRefusedByPolicy: we || undefined,
        ...(D
          ? {
              notChecked: true,
            }
          : {
              noCloneShortCircuit: true,
            }),
      });
    }
    let Ue = await cachePlugin(Q, {
      manifest: {
        name: entry.name,
      },
      storageV5,
      isDirectoryPlugin: isOfficialDirectoryPlugin(b),
      directoryPin: pinnedSha(b, Q) ?? null,
      archiveAuth: await resolveArchiveDownloadHeaders({
        pluginSource: Q,
        pluginName: entry.name,
        marketplaceName: w,
        marketplaceSource: source_2,
        trustedMarketplaceAuth: findUrlMarketplaceHeaders(source_2, ue),
        trustedSettingsEntryAuth,
        entry,
        runEntryHelper: c,
      }),
      entryDeclaresComponents: entryDeclaresComponents(entry),
      declaredComponentPaths: entryDeclaredComponentPaths(entry),
      commandSourceConsent:
        B !== undefined
          ? {
              kind: "shown",
              command: B,
              pluginId: b,
            }
          : {
              kind: "recorded",
              command: isPluginsDirOnLocalDisk() ? undefined : L.sourceCommand,
              pluginId: b,
            },
    });
    Ie = Ue.path;
    Le = Ue.producerPath;
    archiveSha256 = Ue.contentSha256;
    vn = true;
    if (
      ae?.sha !== undefined ||
      Ue.gitCommitSha !== undefined ||
      V ||
      b.endsWith(`@${OFFICIAL_MARKETPLACE_NAME}`)
    )
      gitCommitSha = ae?.sha ?? Ue.gitCommitSha;
    else if (getPluginCloneUrl(Q) !== null) {
      let ye = await probePluginGitHead(Ue.path);
      gitCommitSha = ye.repo ? (ye.sha ?? undefined) : null;
    } else gitCommitSha = null;
    fn = Ue.manifest?.version;
    let pluginVersion = await calculatePluginVersion(
      b,
      entry.source,
      Ue.manifest,
      Ue.path,
      {
        kind: "catalog",
        version: entry.version,
      },
      ae?.sha ?? Ue.gitCommitSha,
      Ue.contentSha256,
    );
    qe = ae && (Ue.manifest?.version || entry.version) ? withShaSuffix(pluginVersion, ae.sha) : pluginVersion;
  } else {
    let R = seedDirFor(marketplaceInstallLocation) !== undefined ? "system" : "workspace";
    let pluginEntryPath = await resolvePluginEntryPath(
      b,
      marketplaceInstallLocation,
      entry.source,
      knownMarketplacesWithDeclared,
      tryUnwrapTextPayload(),
      storageV5,
      R,
    );
    if (pluginEntryPath.kind === "location-error") throw pluginEntryPath.error;
    if (pluginEntryPath.kind !== "ok") {
      let Se = entryResolutionError(pluginEntryPath, marketplaceInstallLocation, entry.source);
      return {
        outcome: "failed",
        message: Se.message,
        pluginId: b,
        scope,
        failureCode: Se.code,
      };
    }
    q = pluginEntryPath.marketplaceDir;
    Ie = pluginEntryPath.entryPath;
    let x = knownMarketplacesWithDeclared[w ?? ""];
    let ue = x !== undefined && isLocalMarketplaceSource(x.source);
    try {
      if (ue) await probeLocalMarketplacePath(storageV5, Ie, R);
      else await fsImplementation.stat(Ie);
    } catch (error) {
      if (isENOENT(error))
        return {
          outcome: "failed",
          message: `Plugin source not found at ${printableOrEmpty(Ie)}`,
          pluginId: b,
          scope,
          failureCode: "source_missing",
        };
      throw error;
    }
    let fe;
    try {
      fe = (await loadPluginManifest(Ie, entry.name, entry.source)).manifest;
    } catch {}
    fn = fe?.version;
    let ze = await probePluginGitHead(Ie, q);
    if (!ze.repo && w === CLAUDE_PLUGINS_OFFICIAL) K = await readMarketplaceCommit(Ie);
    gitCommitSha = ze.repo ? (ze.sha ?? undefined) : K !== undefined ? commitShaOf(K) : null;
    qe = await calculatePluginVersion(
      b,
      entry.source,
      fe,
      Ie,
      {
        kind: "catalog",
        version: entry.version,
      },
      undefined,
      undefined,
      q,
    );
  }
  try {
    let R = verifyReviewedCommit({
      pluginId: b,
      pluginName: y,
      source: entry.source,
      boundByRecord: V,
      fetched: {
        gitCommitSha: gitCommitSha ?? undefined,
      },
      action: "updated",
    });
    if (!R.ok)
      return {
        outcome: "failed",
        message: R.message,
        pluginId: b,
        scope,
        failureCode: "directory_commit_mismatch",
      };
    if (ae === undefined && filtered_3.length > 0) {
      let ye = semverModule.valid(fn) ?? semverModule.coerce(fn)?.version;
      let mapped = constraintsOn
        .filter(
          ({ constraint }) =>
            constraint.version !== undefined &&
            ye !== undefined &&
            !semverModule.satisfies(ye, constraint.version),
        )
        .map(({ plugin }) => plugin.source);
      if (mapped.length > 0)
        return {
          outcome: "skipped",
          message: `Skipped \u2014 ${mapped.join(", ")} requires ${y} at a version range that ${fn ?? qe} does not satisfy`,
          pluginId: b,
          scope,
          blockedBy: mapped,
          oldVersion: version,
          skipReason: "pinner_blocked",
        };
    }
    if (
      qe === "unknown" &&
      version !== undefined &&
      version !== "unknown" &&
      (K?.kind === "refused" || K?.kind === "too-large")
    )
      return {
        outcome: "skipped",
        message:
          K.kind === "refused"
            ? `Skipped \u2014 ${y} stays at ${version}. Its new version comes from the official marketplace's .gcs-sha file, and that name is now a link, a folder or another special file, so it was not read.`
            : `Skipped \u2014 ${y} stays at ${version}. Its new version comes from the official marketplace's .gcs-sha file, which is larger than 1 MB, so it was not read.`,
        pluginId: b,
        scope,
        oldVersion: version,
        skipReason: "snapshot_file_refused",
      };
    let versionedCachePath = getVersionedCachePath(b, qe);
    let x = qe === "unknown";
    let versionedZipCachePath = getVersionedZipCachePath(b, qe);
    let fe = R.reviewedCommit !== undefined && L.gitCommitSha !== R.reviewedCommit;
    let ze =
      !x &&
      !fe &&
      (L.version === qe || L.installPath === versionedCachePath || L.installPath === versionedZipCachePath);
    let Se = false;
    if (ze && typeof entry.source === "object" && entry.source.source === "command") {
      let ye = classifyMarketplacePath(L.installPath, {
        trustedRoots: getMarketplaceCandidatePaths(b, knownMarketplacesWithDeclared, tryUnwrapTextPayload()),
      });
      let absolute = ye.absolute;
      Se =
        ye.suspect ||
        !(await (isLinkModeCommandSource(entry.source)
          ? isLiveLinkFarm(absolute)
          : absolute.endsWith(".zip")
            ? pathExists(absolute)
            : cacheDirHasPluginContentStrict(absolute, storageV5))) ||
        (isLinkModeCommandSource(entry.source)
          ? await hasEntriesOutsideTarget(absolute, Le ?? L.sourceProducerPath)
          : await isLiveLinkFarm(absolute, {
              unclassifiableIsFarm: true,
            }));
    }
    if (ze && !Se) {
      if (
        typeof entry.source === "object" &&
        entry.source.source === "command" &&
        (L.sourceCommand !== describeCommandOutputMode(entry.source) ||
          (Le !== undefined && L.sourceProducerPath !== Le))
      ) {
        await updateInstallationPathOnDisk(
          b,
          scope,
          projectPath,
          L.installPath,
          qe,
          L.gitCommitSha,
          L.resolvedVersion,
          {
            sourceCommand: describeCommandOutputMode(entry.source),
            sourceProducerPath: Le ?? L.sourceProducerPath,
          },
          storageV5,
        );
        emitProducerDirsChanged();
      }
      let ye = isLocalMarketplaceEntry(entry.source, source);
      return De({
        outcome: "up_to_date",
        message: upToDateMessage(ce, qe),
        folderNote: ye
          ? `${y} is read from its folder, ${printableOrEmpty(Ie)}: nothing to update. Edits there take effect at the next session start or /reload-plugins.`
          : undefined,
        pluginId: b,
        newVersion: qe,
        oldVersion: version,
        scope,
        refreshFailed: X !== undefined ? true : undefined,
        refreshRefusedByPolicy: we || undefined,
      });
    }
    versionedCachePath = await copyPluginToVersionedCache(Ie, b, qe, entry, q, {
      forceOverwrite: x || fe,
      storageV5,
    });
    let installPath = L.installPath;
    await updateInstallationPathOnDisk(
      b,
      scope,
      projectPath,
      versionedCachePath,
      qe,
      gitCommitSha,
      ae?.version,
      typeof entry.source === "object" && entry.source.source === "command"
        ? {
            sourceCommand: describeCommandOutputMode(entry.source),
            sourceProducerPath: Le ?? L.sourceProducerPath,
          }
        : undefined,
      storageV5,
      typeof entry.source === "object" && entry.source.source === "claudeai"
        ? {
            claudeaiPluginId: entry.source.pluginId,
            archiveSha256,
          }
        : undefined,
      ie ? samePluginSource(entry.source, undefined) : undefined,
    );
    if (Le !== undefined) emitProducerDirsChanged();
    if (installPath && installPath !== versionedCachePath) {
      let ye =
        isStorageV5Enabled() && storageV5 !== undefined
          ? await loadInstalledPlugins(storageV5)
          : loadInstalledPluginsSync();
      if (!Object.values(ye.plugins).some((plugin) => plugin.some((Ze) => Ze.installPath === installPath)))
        await markPluginVersionOrphaned(installPath, storageV5);
    }
    let Ye = projectPath ? `${scope} (${projectPath})` : scope;
    let sn = pinnedSha(b, entry.source);
    let an = sn === undefined ? undefined : (gitCommitSha ?? sn);
    let Ue = displayableGitHeadName(qe);
    let Qe = an
      ? `Plugin "${y}" updated to the listed commit ${an.slice(0, 7)}${Ue ? ` (version ${Ue})` : ""} for scope ${Ye}. Restart to apply changes.`
      : x && (version ?? "unknown") === "unknown"
        ? `Plugin "${y}" refreshed from source for scope ${Ye}. Restart to apply changes.`
        : `Plugin "${y}" updated from ${version || "unknown"} to ${qe}${Ge} for scope ${Ye}. Restart to apply changes.`;
    return {
      outcome: "updated",
      message:
        X === undefined
          ? Qe
          : ce.directoryRefreshFailed
            ? `${Qe} Warning: ${directoryUnreachableMessage()}.`
            : `${Qe} Warning: ${X}.`,
      pluginId: b,
      newVersion: qe,
      oldVersion: version,
      ...(gitCommitSha && {
        gitCommitSha,
      }),
      scope,
      refreshFailed: X !== undefined ? true : undefined,
      refreshRefusedByPolicy: we || undefined,
      pinChanged:
        typeof L.gitCommitSha === "string" &&
        typeof gitCommitSha === "string" &&
        L.gitCommitSha !== gitCommitSha,
    };
  } finally {
    let versionedCachePath = getVersionedCachePath(b, qe);
    if (vn && Ie !== versionedCachePath && !resolve(versionedCachePath).startsWith(resolve(Ie) + sep))
      await fsImplementation.rm(Ie, {
        recursive: true,
        force: true,
      });
  }
}
//@ chunk-pp50kewz.js:121835-121960 fingerprint = VALID_UPDATE_SCOPES (1)
function VALID_UPDATE_SCOPES_2(e) {
  let n = filterInstallationsForCurrentProject(e);
  let i = n.length > 0 ? n : e;
  return ["local", "project", "user"].find((a) => i.some((o) => o.scope === a)) ?? "managed";
}
//@ chunk-pp50kewz.js:121960-123943 fingerprint = performPluginUpdate (0.358)
/**
 * 执行一次插件更新并整理成 CLI 输出用的结果对象（不存在时报“not installed”）。
 */
async function performPluginUpdate(e, n, i, a, storageV5, explicit) {
  if (!a || a.length === 0)
    return {
      outcome: "failed",
      message: `Plugin "${n}" is not installed`,
      pluginId: e,
      scope: i,
      failureCode: "not_installed",
    };
  let projectPathForScope = getProjectPathForScope(i);
  let filtered = a.filter((D) => D.scope === i);
  let r = installationAtTarget(filtered, i, projectPathForScope) ?? filtered[0];
  if (!r) {
    let D = projectPathForScope ? `${i} (${projectPathForScope})` : i;
    return {
      outcome: "failed",
      message: `Plugin "${n}" is not installed at scope ${D}`,
      pluginId: e,
      scope: i,
      failureCode: "not_installed_at_scope",
    };
  }
  if (r.scope === "managed")
    return {
      outcome: "failed",
      message: `Plugin "${n}" is installed by managed settings and is not updated here`,
      pluginId: e,
      scope: i,
      failureCode: "not_installed_at_scope",
    };
  let { scope, projectPath, version, npmVersionSpec } = r;
  let I = (D) => (explicit ? annotateUpToDateResult(D, r, n, storageV5) : Promise.resolve(D));
  let npmPluginSource = toNpmPluginSource({
    packageName: n,
    versionSpec: npmVersionSpec,
  });
  let b = join(anchoredPluginCachePath(), `${makeTempCachePathName("npm")}${TEMP_CACHE_LINK_SUFFIX}`);
  let _e;
  try {
    await getFsImplementation().mkdir(b);
    _e = (
      await resolveNpmPackage(n, npmVersionSpec, {
        workDir: b,
        registry: r.npmRegistry,
      })
    ).version;
  } finally {
    await removeDirectoryTreeNoFollow(b).catch(() => {});
  }
  let ee = npmVersionSpec !== undefined ? ` (tracking ${npmVersionSpec})` : "";
  if (_e === version || r.installPath === getVersionedCachePath(e, _e))
    return I({
      outcome: "up_to_date",
      message: `${n} is already at the latest version${ee} (${_e}).`,
      pluginId: e,
      newVersion: _e,
      oldVersion: version,
      scope: i,
    });
  let source = toNpmPluginSource(
    {
      packageName: n,
      versionSpec: _e,
    },
    r.npmRegistry,
  ).source;
  let cacheResult = await cachePlugin(source, {
    manifest: {
      name: npmPluginSource.name,
    },
    storageV5,
    isNpmMarketplaceLane: true,
    directoryPin: pinnedSha(e, source) ?? null,
  });
  let npmResolution = cacheResult.npmResolution;
  let version_2 = npmResolution?.version ?? _e;
  let versionedPath = getVersionedCachePath(e, version_2);
  try {
    versionedPath = await copyPluginToVersionedCache(
      cacheResult.path,
      e,
      version_2,
      npmPluginSource,
      undefined,
      {
        storageV5,
      },
    );
    await updateInstallationPathOnDisk(
      e,
      scope,
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
        npmResolved: npmResolution?.tarballUrl ?? r.npmResolved,
        npmIntegrity: npmResolution?.integrity,
        npmRegistry: r.npmRegistry,
      },
    );
    let oldVersionPath = r.installPath;
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
  let scopeDesc = projectPath ? `${i} (${projectPath})` : i;
  return {
    outcome: "updated",
    message: `Plugin "${n}" updated from ${version || "unknown"} to ${version_2}${ee} for scope ${scopeDesc}. Restart to apply changes.`,
    pluginId: e,
    newVersion: version_2,
    oldVersion: version,
    scope: i,
  };
}
//@ chunk-pp50kewz.js:123943-124391 placement
/**
 * 归档来源插件下载会运行 headersHelper 时的警告。
 */
async function archiveFetchWarning(e, n, storageV5) {
  let a = n ?? (await getPluginByIdCacheOnly(e, storageV5))?.entry;
  if (!a || typeof a.source !== "object" || a.source.source !== "archive") return null;
  if (isPluginBlockedByPolicy(e)) return null;
  let knownMarketplaces = await loadKnownMarketplacesSafe(storageV5);
  let u = marketplaceNameOfId(e);
  if (
    u !== undefined &&
    isSourceDisallowedOrUnverifiable(ownPropertyOrUndefined(knownMarketplaces, u)?.source)
  )
    return null;
  let h = marketplaceSourceOfEntry(e, knownMarketplaces);
  let p;
  try {
    p = headersHelperNotRunReason({
      entry: a,
      archiveUrl: a.source.url,
      marketplaceSource: h,
      trustedSettingsEntryAuth: findSettingsArchiveEntry(u, a.name),
    });
  } catch (error) {
    if (error instanceof EntryHelperError) return null;
    throw error;
  }
  if (isHeadersHelperDisabledByPolicy(h, u)) return null;
  return getEntryHelperConsentSubject(p, a.source.url);
}
//@ chunk-pp50kewz.js:124391-124642 placement
/**
 * 生成插件归档获取命令的披露文本：会把 helper 生成的请求头发到哪个地址、隐藏字符警告与实际运行的本地命令。
 */
function archiveHelperDisclosure(e) {
  let n = describeArchiveFetchCommand(e);
  return (
    `Fetching this plugin's archive sends helper-minted headers to ${n.destination}; ` +
    (n.hiddenCharactersWarning ? `WARNING: ${n.hiddenCharactersWarning} ` : "") +
    `the local command it runs (headersHelper) is: ${n.command}`
  );
}
//@ chunk-pp50kewz.js:124642-124869 placement
function recordedSourceCommand(pluginId, source, installationsOf) {
  let a = commandSourceSpecOf(source);
  if (!a || !installationsOf || installationsOf.length === 0 || isPluginsDirOnLocalDisk()) return;
  let o = describeCommandOutputMode(a);
  return {
    kind: "recorded",
    command:
      installationsOf.find((h) => h.sourceCommand === o)?.sourceCommand ??
      installationsOf.find((h) => h.sourceCommand !== undefined)?.sourceCommand,
    pluginId,
  };
}
//@ chunk-pp50kewz.js:124869-125641 placement
/**
 * 在已知市场中自动安装缺失的插件。
 */
async function autoInstallFromMarketplace(e, knownMarketplacesWithDeclared, i, a) {
  let source = knownMarketplacesWithDeclared[e.marketplace]?.source;
  if (!source || isPluginDirectorySource(source)) return;
  if (!isOfficialMarketplaceName_3(e.marketplace)) return;
  let plugins = (
    isStorageV5Enabled() && i !== undefined ? await loadInstalledPlugins(i) : loadInstalledPluginsSync()
  ).plugins;
  if (plugins[`${e.entry.name}@${e.marketplace}`]?.length) return;
  let h = samePluginSource(e.entry.source, sourceUrlAndRef(source));
  if (h === undefined) return;
  for (let [key, value] of Object.entries(knownMarketplacesWithDeclared)) {
    if (!isPluginDirectorySource(value.source) || !isSourceAllowedByPolicy(value.source)) continue;
    if (isOfficialFamilySameSource(e.marketplace, e.entry) && !plugins[`${e.entry.name}@${key}`]?.length)
      continue;
    try {
      let found = (await getMarketplace(key, i, "install")).plugins.find(
        (plugin) => plugin.name === e.entry.name,
      );
      if (found && isReviewerMarkedEntry(found.name) && samePluginSource(found.source, undefined) === h)
        return {
          entry: found,
          marketplace: key,
          marketplaceInstallLocation: value.installLocation,
        };
    } catch (error) {
      if (error instanceof PluginDirectoryUnavailableError) a?.(error);
      logForDebugging(
        `Bare-name search for "${e.entry.name}": the ${OFFICIAL_MARKETPLACE_DISPLAY} could not be read, keeping ${e.marketplace}'s listing: ${errorMessage(error)}`,
      );
    }
  }
  return;
}
//@ chunk-pp50kewz.js:125641-126162 placement
/**
 * 按名字在所有市场中搜索插件。
 */
async function findPluginInMarketplaces(e, n, i) {
  let knownMarketplacesWithDeclared = await loadKnownMarketplacesWithDeclared(n);
  let o;
  for (let [key, value] of Object.entries(knownMarketplacesWithDeclared)) {
    if (!isSourceAllowedByPolicy(value.source)) continue;
    try {
      let found = (await getMarketplace(key, n, "install")).plugins.find((plugin) => plugin.name === e);
      if (found) {
        let c = {
          entry: found,
          marketplace: key,
          marketplaceInstallLocation: value.installLocation,
        };
        {
          let y = await autoInstallFromMarketplace(c, knownMarketplacesWithDeclared, n, i);
          return y
            ? {
                ...y,
                preferredOver: c,
              }
            : c;
        }
        return c;
      }
    } catch (error) {
      if (error instanceof CommandSourceError) {
        o ??= error;
        continue;
      }
      if (error instanceof PluginDirectoryUnavailableError) i?.(error);
      logForDebugging(
        `Failed to load marketplace "${key}" while searching for plugin "${e}": ${errorMessage(error)}`,
        {
          level: "error",
        },
      );
    }
  }
  if (o !== undefined) throw o;
  return;
}
//@ chunk-pp50kewz.js:126162-126219 placement
/**
 * 判断目标目录之外是否还有条目。
 */
async function hasEntriesOutsideTarget(absolute, n) {
  return n === undefined || (await hasEntriesOutsideTarget_2(absolute, n));
}
//@ chunk-pp50kewz.js:126219-126279 placement
/**
 * 在指定作用域的启用插件里查找条目。
 */
function findPluginInSource(e, n, i) {
  return findPluginEntry(getSettingsForSourceForUpkeep(scopeToSettingSource(e))?.enabledPlugins, n, i);
}
//@ chunk-pp50kewz.js:126279-126378 placement
/**
 * 按来源缓存分组后的启用插件。
 */
function groupedEnabledPlugins() {
  let e = new Map();
  return (n) => {
    let i = e.get(n);
    if (i === undefined) {
      i = groupEnabledPlugins(n);
      e.set(n, i);
    }
    return i;
  };
}
//@ chunk-pp50kewz.js:126378-126516 placement
function findPluginEntry(enabledPlugins, n, i) {
  if (!enabledPlugins) return;
  let a = isOfficialPluginId(n)
    ? i(enabledPlugins).byFold.get(nfcLower(n))?.key
    : findPluginName(Object.keys(enabledPlugins), n);
  return a === undefined
    ? undefined
    : {
        key: a,
        value: enabledPlugins[a],
      };
}
//@ chunk-pp50kewz.js:126516-126997 placement
/**
 * 按作用域查找插件安装记录。
 */
function locatePluginInstall(e, n, i) {
  let found;
  for (let p of sorted) {
    let pluginInSource = findPluginInSource(p, e, i);
    if (pluginInSource !== undefined) {
      found = {
        scope: p,
        ...pluginInSource,
      };
      break;
    }
  }
  let o = pluginSettingRecords(e);
  let pluginSetting = findPluginSetting(
    e,
    o.map(({ record }) => (record === undefined ? undefined : i(record))),
  );
  let source = pluginSetting === undefined ? undefined : o[pluginSetting.index]?.source;
  return {
    found,
    atRequested: n === undefined ? undefined : findPluginInSource(n, e, i),
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
//@ chunk-pp50kewz.js:126997-127038 placement
var sorted = [...VALID_INSTALLABLE_SCOPES].sort((e, n) => SCOPE_PRECEDENCE[n] - SCOPE_PRECEDENCE[e]);
//@ chunk-pp50kewz.js:127038-127856 placement
/**
 * 插件被组织或策略阻止时的结果。
 */
function pluginBlockedResult(e, enabled, i, a) {
  let o = pluginNamesEqual(a, e) ? "" : ` via its legacy "${stripInvisibleKeepEmoji(a)}" entry`;
  let u = o ? ` (remove that entry, or add "${e}": true beside it)` : "";
  if (i === "policySettings")
    return {
      success: false,
      message: enabled
        ? `Plugin "${e}" is blocked by your organization's policy${o} and cannot be enabled here \u2014 ask an admin${u}`
        : `Plugin "${e}" is turned on by your organization's managed settings and cannot be disabled here`,
      failureCode: enabled ? "plugin_policy_blocked" : "managed_settings_override",
    };
  return {
    success: false,
    message: enabled
      ? `Plugin "${e}" is turned off by this session's --settings flag${o}, which overrides your settings files. Change it in --settings to enable it${u}.`
      : `Plugin "${e}" is turned on by this session's --settings flag, which overrides your settings files. Remove it from --settings to disable it.`,
    failureCode: "settings_flag_override",
  };
}
//@ chunk-pp50kewz.js:127856-128053 placement = getEnabledSettingSources (0.862)
function getPluginEnablementLockingSource(e, n) {
  let result = new Set(getEnabledSettingSources());
  for (let a of ["policySettings", "flagSettings"]) {
    if (!result.has(a)) continue;
    let o = lookupByPluginAliases(getSettingsForSource(a)?.enabledPlugins, e);
    if (o === undefined) continue;
    return (o === true) === n ? undefined : a;
  }
  return;
}
//@ chunk-pp50kewz.js:128053-128347 placement = loadAllPermissionRulesFromDisk (0.344)
/**
 * 插件启用的锁定来源：仅策略启用的插件返回 policySettings；否则看覆盖来源是否为 flagSettings 等（属插件启用管理，误归入 permissionsLoader）。
 */
function getPluginEnablingSource(e, n) {
  let i = normalizePluginId(e);
  let a = canonicalPluginId(i);
  if (isBuiltinPluginId(a) && getBuiltinPlugin(parsePluginIdentifier(a).name)?.enabledFromPolicyOnly)
    return getBuiltinPlugins().enabled.some((h) => h.source === a) ? "policySettings" : undefined;
  let o = marketplaceSuffix(i);
  if (!isOfficialMarketplace(o)) return getPluginEnablementLockingSource(i, false);
  let { override } = locatePluginInstall(i, undefined, n);
  return override?.enabling && (override.source === "flagSettings" || o === SYNCED)
    ? override.source
    : undefined;
}
//@ chunk-pp50kewz.js:128347-128406 placement = _temp7 (1)
/**
 * 是否由托管策略启用（不能禁用/卸载）。
 */
function isManagedDisabled(e, n, i) {
  return n(e) || getPluginEnablingSource(e, i) === "policySettings";
}
//@ chunk-pp50kewz.js:128406-128531 placement
/**
 * 插件由托管策略设置启用时返回拒绝结果（不能禁用或卸载）。
 */
function managedPluginRefusal(e) {
  return getPluginEnablingSource(e, groupedEnabledPlugins()) === "policySettings"
    ? {
        success: false,
        message: MANAGED_PLUGIN_DISABLE_MESSAGE,
        failureCode: "managed_settings_override",
      }
    : undefined;
}
//@ chunk-pp50kewz.js:128531-128641 placement
/**
 * 插件由 --settings 启用时返回附注："本会话仍启用"。
 */
function flagSettingsEnabledNote(e) {
  return getPluginEnablingSource(e, groupedEnabledPlugins()) === "flagSettings"
    ? " (still enabled this session: --settings keeps it on)"
    : "";
}
//@ chunk-pp50kewz.js:128641-128766 placement
function matchingEnabledKeys(enabledPlugins, n) {
  let keys = Object.keys(enabledPlugins ?? {});
  if (!isOfficialPluginId(n)) return keys.filter((o) => o === n);
  let a = nfcLower(n);
  return keys.filter((o) => nfcLower(o) === a);
}
//@ chunk-pp50kewz.js:128766-129148 placement
/**
 * 写入 enabledPlugins（替换遗留键）。
 */
function writeEnabledPlugins(e, n, i, a, storageV5) {
  return updateSettingsForSourceWithTransform(
    e,
    (u) => {
      let h = Object.fromEntries(
        Object.entries({
          ...a,
          [n]: i,
        }).flatMap(([key, value]) => {
          let c = pluginSettingWriteTarget(u?.enabledPlugins, key);
          return [...c.replaced.map((y) => [y, undefined]), [c.written, value]];
        }),
      );
      return {
        enabledPlugins: {
          ...u?.enabledPlugins,
          ...Object.fromEntries(
            Object.keys(h).flatMap((key) =>
              matchingEnabledKeys(u?.enabledPlugins, key)
                .filter((r) => r !== key)
                .map((r) => [r, undefined]),
            ),
          ),
          ...h,
        },
      };
    },
    undefined,
    storageV5,
  );
}
//@ chunk-pp50kewz.js:129148-129208 placement
/**
 * 取某作用域下所有插件的记录。
 */
function pluginRecordsFor(e, n) {
  return enabledPluginsBySource(e, n, undefined).map(({ record }) => record);
}
//@ chunk-pp50kewz.js:129208-129386 placement
function enabledPluginsBySource(e, n, i) {
  return Yi.map((a) => {
    let enabledPlugins = getSettingsForSourceForUpkeep(a)?.enabledPlugins;
    if (a !== e)
      return {
        source: a,
        record: enabledPlugins,
      };
    let u = Uo(enabledPlugins ?? {}, matchingEnabledKeys(enabledPlugins, n));
    return {
      source: a,
      record:
        i === undefined
          ? u
          : {
              ...u,
              [n]: i,
            },
    };
  });
}
//@ chunk-pp50kewz.js:129386-129411 placement
var Yi = [...SETTING_SOURCES].reverse();
//@ chunk-1qpz7qcd.js:7508-7648 fingerprint = disableAllPluginsOp (0.338)
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
//@ chunk-csq9ftr9.js:8420-8587 callgraph-fingerprint = updatePluginOp (0.187)
/**
 * 按插件 ID 对一组条目分组（名字配错，见 lead 建议）。
 */
function countByPluginKey(userHooks) {
  let n = new Map();
  for (let { pluginId } of userHooks) {
    if (!pluginId) continue;
    let { name: pluginName, marketplace: marketplaceName } = parsePluginIdentifier_2(pluginId);
    let f = pluginIdHash(pluginName, marketplaceName);
    n.set(f, (n.get(f) ?? 0) + 1);
  }
  return n.size > 0 ? hashEntries(n) : undefined;
}
//@ chunk-e6aww6q8.js:4444317-4444531 fingerprint = resolveDelistedPluginId (0.791)
/**
 * 已下架插件 ID 的解析：排除已有结果的，从安装记录中找出仍存在的。
 */
async function resolveDelistedPluginId(e, n, storageV5) {
  let filtered = (e ?? []).filter((y) => !n.some((S) => S.pluginId === y));
  if (filtered.length === 0) return [];
  let h =
    isStorageV5Enabled() && storageV5 !== undefined
      ? await loadInstalledPlugins(storageV5)
      : loadInstalledPluginsSync();
  if (hasFailedInstalledPluginsRead(h)) return filtered;
  return filtered.filter((key) => h.plugins[key]?.some(isInstallationRelevantToCurrentProject) === true);
}
export {
  updatePluginOp,
  findPluginInMarketplaces,
  hasOnlyMissingDependencyIssues,
  archiveFetchWarning,
  archiveHelperDisclosure,
  refreshBeforeScopedInstall,
  installPluginOp,
  getProjectPathForScope,
  isPluginInSettings,
  uninstallPluginOp,
  disablePluginOp,
  listRequiredPlugins,
  isSadFailureCode,
  formatOperationFailure,
  countByPluginKey,
  displayPluginId,
  findPluginInSettings_2,
  getReplaceUnavailableReason,
  describeReplaceUnavailable,
  isPluginEffectivelyEnabled,
  getPluginInstallationFromV2,
  isInstallableScope,
  MANAGED_PLUGIN_DISABLE_MESSAGE,
  enablePluginOp,
  isPluginEnabledAtProjectScope,
  requiredPluginMessage,
  managedPluginRefusal,
  flagSettingsEnabledNote,
  describeKeptDataDir,
  VALID_INSTALLABLE_SCOPES,
  logInstallRefreshFirst,
  replaceNeedsFullIdMessage,
  VALID_UPDATE_SCOPES,
  resolveDelistedPluginId,
  refreshMarketplaceOnCatalogMiss,
};
