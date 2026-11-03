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
import { Vy } from "../../../vendor/semver/index.js";
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
  NPM,
  isHttpUrl,
} from "../../utils/plugins/schemas.js";
import { getMarketplaceAutoUpdate } from "../../utils/plugins/marketplaceAutoUpdate.js";
import {
  getDeclaredMarketplaces,
  refreshMarketplaceDeduped,
  seedDirFor,
  loadKnownMarketplacesWithDeclared,
  tryUnwrapTextPayload,
  Eq,
  Dse,
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
  U$,
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
  PF,
  hasInstallationForCurrentProject,
  getInstalledListRefusal,
  readInstalledPluginsFile,
  clearAutoInstalledFlag,
  formatInvalidPluginIdMessage,
  isInstallationRelevantToCurrentProject,
  addInstalledPlugin,
  removePluginInstallation,
  findDataDirSharers,
  QJn,
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
  isPluginEnabled,
  pluginNamesEqual,
  joinPluginId,
  canonicalPluginId,
  legacyPluginIds,
  Qps,
  isOfficialMarketplaceName_3,
  normalizePluginId,
  parseNpmPluginId,
  marketplaceSuffix,
  isRequiredPlugin,
  splitPluginId,
  vPi,
  Jps,
  SETTING_SOURCE_TO_SCOPE,
  pluginNameAliases_2,
  groupEnabledPlugins,
  isOfficialPluginId,
  findPluginSetting,
  parsePluginIdentifier_2,
} from "../../utils/plugins/pluginIdentifier.js";
import {
  qP,
  isSameInstallScope,
  intersectVersionConstraints,
  describeConstraintConflict,
  noMatchingTagMessage,
  mO,
  findMatchingInstallations,
  findReverseDependentNames,
  formatReverseDependentsSuffix,
  collectTransitiveDependents,
  collectConstraintsOn,
} from "../../utils/plugins/dependencyResolver.js";
import {
  resolvePluginEntryPath,
  entryPathOrReason,
  f5t,
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
  VGr,
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
import { L2e, pluginDataDirPath, deletePluginDataDir } from "../../utils/plugins/pluginDirectories.js";
import { stripInvisibleKeepEmoji } from "../../utils/settings/marketplaceSettingsAliases.js";
import {
  INLINE_PLUGIN_MARKETPLACE,
  SYNCED,
  SKILLS_DIR,
  BUILTIN,
  removePluginUsage,
  seedPluginUsage,
  touchPluginUsage,
  lx,
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
  mE,
  Eie,
  headersHelperNotRunReason,
  getEntryHelperConsentSubject,
  checkHeadersHelperConsent,
  helperRefusalFailureCode,
  diffEntryHelperConsent,
  describeHelperReview,
  HELPER_CONSENT_MISMATCH_CODES,
  resolveArchiveDownloadHeaders,
  E$e,
} from "../../utils/plugins/headersHelper.js";
import {
  filterTrustedForBuiltin,
  getEnabledPluginsBySource,
  djt,
  _Br,
} from "../../utils/plugins/pluginSettingsSources.js";
import {
  U3s,
  enabledPluginKeys,
  describeUnwritableSettingsSource,
  scanSettingsForPluginUninstall,
  $wt,
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
  F3s,
} from "../../utils/plugins/pluginDependencies.js";
import { YCo, installMissingDependencies } from "../../utils/plugins/dependencyInstall.js";
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
  Bd,
  isPluginsDirOnLocalDisk,
  o1,
  Nee,
  isLiveLinkFarm,
  makeTempCachePathName,
  Kqe,
  wpe,
  hasEntriesOutsideTarget,
} from "../../utils/plugins/commandSource.js";
import {
  ZJn,
  NPM_DIRECT_INSTALL_DISABLED_MESSAGE,
  toNpmPluginSource,
  NPM_REGISTRY,
  resolveNpmPackage,
} from "../../utils/plugins/npmPluginSource.js";
import {
  Zb,
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
  eVe,
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
  VS,
  tVt,
  releaseDirectoryBinding as releaseDirectoryBinding_2,
  Rrt,
  lpe,
  xSe,
  findBindingKeysFor,
  Y_n,
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
  Rmn,
} from "../../utils/plugins/installResultMessages.js";
import { logMarketplaceSwitch, YX } from "../../utils/plugins/pluginDirectoryTelemetry.js";
import {
  af,
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
import { eA } from "../../utils/settings/settingsStorage.js";
import { copyPluginOptions } from "../../utils/plugins/pluginOptionsStorage.js";
import { pathExists } from "../../utils/fsSafety/atomicWriteStaging.js";
import { ic, markPluginVersionOrphaned } from "../../utils/plugins/cacheUtils.js";
import { removeDirectoryTreeNoFollow } from "../../utils/fsRemove.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { Wo } from "../../utils/json.js";
import { Wq, trustedOnlyBuiltinPluginId } from "../../utils/plugins/loadPluginHooks.js";
import { Qbn, X5o } from "./accountSync/syncedPluginHooks.js";
import { ensureSyncedPluginDirsRegistered } from "../../utils/claudeAiSync/pluginsSync.js";
import { getPluginAttribution } from "../../utils/plugins/pluginAttribution.js";
import { getFsImplementation } from "../../utils/fsOperations.js";
import { CLAUDE_PLUGINS_OFFICIAL } from "../../utils/plugins/officialMarketplace.js";
import { emitProducerDirsChanged } from "../../utils/plugins/pluginCachePaths.js";
import { describeArchiveFetchCommand } from "../../components/ManagedSettingsSecurityDialog/utils.js";
import { Prt } from "../../utils/plugins/commandSourceErrors.js";
import { Uo } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { sanitizeTelemetryString } from "../../utils/sanitization.js";
import { hashEntries } from "../../utils/model/modelCatalog/maskedIds.js";

//@ chunk-pp50kewz.js:2631-2649 placement
var Bn = Re(Vy(), 1);
/**
 * 安装时插件不在目录中则刷新一次市场（失败时用缓存）。
 */
//@ chunk-pp50kewz.js:2731-3129 placement
async function refreshMarketplaceOnCatalogMiss(e, n, i) {
  if (shouldSkipPluginAutoupdate()) return "ineligible";
  if (!n?.source || !isSourceAllowedByPolicy(n.source)) return "ineligible";
  if (!isMarketplaceAutoUpdate(e, n, getMarketplaceAutoUpdate(e, getDeclaredMarketplaces())))
    return "ineligible";
  try {
    return (
      await refreshMarketplaceDeduped(e, i, void 0, { skipIfRecent: !0, directoryTrigger: "install" }),
      getPluginRegistry().marketplaces.delete(e),
      "refreshed"
    );
  } catch (error) {
    return (
      logForDebugging(
        `Failed to refresh marketplace '${e}' on catalog miss; using cached data: ${errorMessage(error)}`,
        { level: "warn" },
      ),
      "refresh-failed"
    );
  }
}
/**
 * 记录"安装前先刷新市场"的特性状态：已刷新、刷新失败或不适用。
 */
//@ chunk-pp50kewz.js:3129-3330 placement
function logInstallRefreshFirst(e) {
  if (e === "refreshed") logFeatureOk("plugin_install_refresh_first");
  else if (e === "refresh-failed") logFeatureBad("plugin_install_refresh_first", "refresh_failed");
  else logFeatureSad("plugin_install_refresh_first", "ineligible");
}
/**
 * 按作用域安装前刷新 github 来源的市场。
 */
//@ chunk-pp50kewz.js:3330-4013 placement
async function refreshBeforeScopedInstall(e, n, i) {
  if (isEssentialTrafficOnly()) return { outcome: "ineligible" };
  if (!n?.source || !isSourceAllowedByPolicy(n.source)) return { outcome: "ineligible" };
  if (n.installLocation && seedDirFor(n.installLocation)) return { outcome: "ineligible" };
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
    return { outcome: "ineligible" };
  }
  try {
    return (
      await refreshMarketplaceDeduped(e, i, void 0, { skipIfRecent: !0, directoryTrigger: "install" }),
      getPluginRegistry().marketplaces.delete(e),
      { outcome: "refreshed" }
    );
  } catch (error) {
    return (
      logForDebugging(
        `Failed to refresh marketplace '${e}' before scoped install; using cached data: ${errorMessage(error)}`,
        { level: "warn" },
      ),
      { outcome: "refresh-failed", errorMessage: U$(errorMessage(error)) }
    );
  }
}
//@ chunk-pp50kewz.js:4013-4187 placement
async function installedAndAvailableVersions(e) {
  let n = await installedVersionAtScope(e),
    i = await getAvailablePluginVersion(e).catch(() => freeze);
  return {
    installedVersion: vt(n),
    availableVersion: vt(i.availableVersion),
    loadsInPlaceFrom: i.loadsInPlaceFrom,
  };
}
/**
 * 描述插件可更新版本与更新命令。
 */
//@ chunk-pp50kewz.js:4187-4838 placement
function describeUpdateAvailability(e, n, i) {
  let a = claudeCommand("plugin update", e, n === "user" ? void 0 : `--scope ${n}`),
    o =
      i.availableVersion !== void 0 &&
      i.installedVersion !== void 0 &&
      i.availableVersion !== i.installedVersion,
    u = quotedPrintable(i.installedVersion, Rt),
    h = quotedPrintable(i.availableVersion, Rt),
    p = `${u} to ${h}`;
  if (i.loadsInPlaceFrom !== void 0) {
    let j = printableOrEmpty(i.loadsInPlaceFrom),
      I = o && a !== null ? `; \`${a}\` re-records its version, ${p}` : "";
    return ` \u2014 it loads in place from ${j}, so edits there take effect at the next session start or /reload-plugins${I}`;
  }
  if (!o) return "";
  let c = a !== null ? `run \`${a}\` to get it` : "update it from /plugin";
  return `${` \u2014 the marketplace now offers ${h}`} (installed: ${u}); ${c}`;
}
//@ chunk-pp50kewz.js:4838-4869 placement
var Rt = 64,
  freeze = Object.freeze({});
//@ chunk-pp50kewz.js:4869-5087 placement
async function installedVersionAtScope({
  pluginId: pluginId,
  scope: scope,
  projectPath: projectPath,
  storageV5: storageV5,
}) {
  let u =
      isStorageV5Enabled() && storageV5 !== void 0
        ? await loadInstalledPlugins(storageV5)
        : loadInstalledPluginsSync(),
    h = findPluginName(Object.keys(u.plugins), pluginId),
    filtered = (u.plugins[h ?? pluginId] ?? []).filter((c) => c.scope === scope);
  return (qP(filtered, scope, projectPath) ?? filtered[0])?.version;
}
/**
 * 查询插件可用版本（市场条目或系统市场）。
 */
//@ chunk-pp50kewz.js:5087-5704 placement
async function getAvailablePluginVersion({
  pluginId: pluginId,
  entry: entry,
  marketplaceName: marketplaceName,
  marketplaceInstallLocation: marketplaceInstallLocation,
  storageV5: storageV5,
}) {
  if (typeof entry.source !== "string") return { availableVersion: claudeAiSourceVersion(entry) };
  if (marketplaceInstallLocation === void 0) return freeze;
  let u = await loadKnownMarketplacesWithDeclared(storageV5),
    p = seedDirFor(marketplaceInstallLocation) !== void 0 ? "system" : "workspace",
    r = await resolvePluginEntryPath(
      pluginId,
      marketplaceInstallLocation,
      entry.source,
      u,
      tryUnwrapTextPayload(),
      storageV5,
      p,
    );
  if (r.kind !== "ok") return freeze;
  let c = await calculatePluginVersion(
      pluginId,
      entry.source,
      await loadPluginManifest(r.entryPath, entry.name, entry.source, [], { noTelemetry: !0 }).then(
        (T) => T.manifest,
        () => {
          return;
        },
      ),
      r.entryPath,
      { kind: "catalog", version: entry.version },
      void 0,
      void 0,
      r.marketplaceDir,
    ),
    y = L2e(entry.source, u[marketplaceName]?.source);
  return { availableVersion: c !== "unknown" ? c : void 0, loadsInPlaceFrom: y ? r.entryPath : void 0 };
}
//@ chunk-pp50kewz.js:5704-5827 placement
function claudeAiSourceVersion(e) {
  let { source: source } = e;
  if (!(typeof source !== "string" && source.source === "claudeai")) return;
  return e.version || source.version || void 0;
}
//@ chunk-pp50kewz.js:5827-5873 placement
function vt(e) {
  return e === void 0 ? void 0 : stripInvisibleKeepEmoji(e);
}
/**
 * --plugin-dir 等无法安装/更新/卸载的插件说明。
 */
//@ chunk-pp50kewz.js:5873-6648 placement
function unmanageablePluginMessage(e, n) {
  let i = { install: "installed", update: "updated", uninstall: "uninstalled" }[n];
  switch (e) {
    case INLINE_PLUGIN_MARKETPLACE:
      return `This plugin is loaded via --plugin-dir for this session with no marketplace backing \u2014 it cannot be ${i}. Drop the --plugin-dir flag to stop loading it, or \`claude plugin disable\` to turn it off.`;
    case SYNCED:
      return `This plugin is synced from your claude.ai account with no marketplace backing \u2014 it cannot be ${i} here. Manage it on claude.ai, or \`claude plugin disable\` to turn it off on this machine.`;
    case SKILLS_DIR:
      return `This plugin is loaded from ${tildify(join(getClaudeConfigDir(), "skills"))}/ with no marketplace backing \u2014 it cannot be ${i}. Delete the directory to remove it; \`claude plugin disable\` to turn it off; edits there take effect after /reload-plugins.`;
  }
}
/**
 * 插件操作被拒原因（内置插件、托管插件等）。
 */
//@ chunk-pp50kewz.js:6648-6968 placement
function pluginOperationRefusal(e, n, i) {
  if (isOfficialMarketplace(n)) return unmanageablePluginMessage(n, i);
  if (n !== void 0 && isUnavailablePackageMarketplace(n)) return formatPackageMarketplaceUnavailable(n);
  if (isBuiltinPluginId(e) && getBuiltinPlugin(parsePluginIdentifier(e).name) !== void 0)
    return `This is a built-in plugin \u2014 built-in plugins cannot be installed, updated or uninstalled. ${managedPluginRefusal(e)?.message ?? "Use `claude plugin enable` / `claude plugin disable` to turn it on or off."}`;
  return;
}
//@ chunk-pp50kewz.js:6968-7071 placement
function unmanageablePluginReason(e, n) {
  if (isUnavailablePackageMarketplace(n)) return "marketplace_not_available";
  return isBuiltinPluginId(e) ? "builtin" : "directory_loaded";
}
//@ chunk-pp50kewz.js:7071-7172 placement
function lockedDependentName(e, n) {
  let { name: i } = parsePluginId(e),
    a = matchPolicyPluginEntry(getPolicyEnabledPluginEntries(), i, n);
  return a.outcome === "locked" ? a.entry.name : void 0;
}
//@ chunk-pp50kewz.js:7172-7293 placement
function nonInstallableSourceLabel(e) {
  switch (e) {
    case INLINE_PLUGIN_MARKETPLACE:
      return "--plugin-dir";
    case SKILLS_DIR:
      return "skills-directory";
    case SYNCED:
      return "claude.ai-synced";
  }
}
/**
 * 插件作用域常量：可安装作用域 user/project/local，更新可用作用域额外含 managed；SCOPE_PRECEDENCE 表示同名设置的覆盖优先级（local 最高）。
 */
//@ chunk-pp50kewz.js:7293-7484 callgraph-fingerprint = VALID_INSTALLABLE_SCOPES (0.443)
var MANAGED_PLUGIN_DISABLE_MESSAGE =
    "This plugin is managed by your organization. Contact your admin to disable it.",
  VALID_INSTALLABLE_SCOPES = ["user", "project", "local"],
  SCOPE_PRECEDENCE = { user: 0, project: 1, local: 2 },
  VALID_UPDATE_SCOPES = ["user", "project", "local", "managed"];
/**
 * 校验作用域是 user/project/local 之一，否则抛错。
 */
//@ chunk-pp50kewz.js:7484-7590 fingerprint = assertInstallableScope (1)
function assertInstallableScope(scope) {
  if (!VALID_INSTALLABLE_SCOPES.includes(scope))
    throw Error(`Invalid scope "${scope}". Must be one of: ${VALID_INSTALLABLE_SCOPES.join(", ")}`);
}
/**
 * 作用域是否为可安装作用域（user/project/local）。
 */
//@ chunk-pp50kewz.js:7590-7629 file-local
function isInstallableScope(scope) {
  return VALID_INSTALLABLE_SCOPES.includes(scope);
}
/**
 * 插件作用域对应的项目路径：project/local 作用域返回当前项目根，其他返回 undefined。旧版名 isMcpServerFromProjectOrLocalSettings 配错。
 */
//@ chunk-pp50kewz.js:7629-7691 layout = isMcpServerFromProjectOrLocalSettings (1)
function getProjectPathForScope(config) {
  return config === "project" || config === "local" ? getOriginalCwd() : void 0;
}
/**
 * 插件是否在项目设置（.claude/settings.json）的 enabledPlugins 中启用（按插件 ID 宽松匹配）。
 */
//@ chunk-pp50kewz.js:7691-7822 fingerprint = isPluginEnabledAtProjectScope (1)
function isPluginEnabledAtProjectScope(pluginId) {
  let n = getSettingsForSourceForUpkeep("projectSettings")?.enabledPlugins;
  if (!n) return !1;
  let i = findPluginName(Object.keys(n), pluginId);
  return i !== void 0 && n[i] === !0;
}
/**
 * failureCode 是否属于“sad”（用户侧/预期内）类别，决定遥测走 f 还是 m。
 */
//@ chunk-pp50kewz.js:7822-7859 layout
function isSadFailureCode(e) {
  return FAILURE_CODE_SEVERITY[e] === "sad";
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
/**
 * 在 installed_plugins 中把用户输入的名字解析成已安装的完整插件 ID。
 */
//@ chunk-pp50kewz.js:8716-8925 layout = findPluginInSettings (0.828)
function findPluginInSettings_2(plugin) {
  let n = getInstalledPlugins(),
    i = findPluginName(Object.keys(n.plugins), plugin);
  if (i) return i;
  for (let a of ["local", "project", "user"]) {
    let enabledPlugins = getSettingsForSourceForUpkeep(scopeToSettingSource(a))?.enabledPlugins;
    if (!enabledPlugins) continue;
    let u = findPluginName(Object.keys(enabledPlugins), plugin);
    if (u) return u;
  }
  return plugin;
}
/**
 * 综合各设置源 enabledPlugins、manifest.defaultEnabled 与安装偏好，判断插件当前是否实际启用。
 */
//@ chunk-pp50kewz.js:8925-9019 layout
function isPluginEffectivelyEnabled(e, n, i) {
  return isPluginEnabled(
    e,
    filterTrustedForBuiltin(e, i),
    n.manifest.defaultEnabled,
    n.installationPreference,
  );
}
//@ chunk-pp50kewz.js:9019-9103 layout
function findScopeDeclaringPlugin(e, n) {
  return e.find((i) =>
    Object.hasOwn(getSettingsForSourceForUpkeep(scopeToSettingSource(i))?.enabledPlugins ?? {}, n),
  );
}
/**
 * 在 local > project > user 设置的 enabledPlugins 中找插件，返回 {pluginId, scope}。
 */
//@ chunk-pp50kewz.js:9103-9662 fingerprint = findPluginInSettings (0.869)
function findPluginInSettings(e, n = ["local", "project", "user"]) {
  let hasMarketplace = e.includes("@"),
    lower = e.toLowerCase();
  if (hasMarketplace) {
    let o = listInstalledPluginIds(getInstalledPlugins()),
      u = o === "unknown" ? void 0 : findPluginName(o, e);
    if (u !== void 0) {
      let filtered = n.filter((p) => !U3s(scopeToSettingSource(p)));
      if (u === e || (filtered.length === n.length && findScopeDeclaringPlugin(filtered, e) === void 0)) {
        let p = findScopeDeclaringPlugin(filtered, u);
        if (p !== void 0 && n.slice(0, n.indexOf(p)).every((r) => filtered.includes(r)))
          return { pluginId: u, scope: p };
      }
    }
  }
  for (let scope of n) {
    let enabledPlugins = getSettingsForSourceForUpkeep(scopeToSettingSource(scope))?.enabledPlugins;
    if (!enabledPlugins) continue;
    for (let key of Object.keys(enabledPlugins))
      if (
        (hasMarketplace ? pluginNamesEqual(key, e) : key.toLowerCase().startsWith(`${lower}@`)) ||
        isSameRepoRoot(key, hasMarketplace ? e : joinPluginId(e, BUILTIN))
      )
        return { pluginId: pluginSettingWriteTarget(enabledPlugins, key).deciding, scope: scope };
  }
  return null;
}
//@ chunk-pp50kewz.js:9662-9724 layout
function isSameRepoRoot(e, n) {
  let i = canonicalPluginId(e);
  return legacyPluginIds(i).length > 0 && i === canonicalPluginId(n);
}
/**
 * 插件是否出现在任一可写设置源的 enabledPlugins 中。
 */
//@ chunk-pp50kewz.js:9724-9760 layout
function isPluginInSettings(e) {
  return findPluginInSettings(e) !== null;
}
//@ chunk-pp50kewz.js:9760-9971 callgraph-fingerprint = findPluginByIdentifier (1)
function findPluginByIdentifier(plugin, plugins) {
  let { name: name, marketplace: marketplace } = parsePluginId(plugin);
  return plugins.find((o) => {
    if (pluginNamesEqual(o.name, plugin) || pluginNamesEqual(o.name, name)) return !0;
    if (marketplace && o.source)
      return (
        pluginNamesEqual(o.name, name) && o.source.toLowerCase().includes(`@${marketplace.toLowerCase()}`)
      );
    return !1;
  });
}
//@ chunk-pp50kewz.js:9971-10385 layout
function resolveInstalledPluginId(e, n, i) {
  let { name: a } = parsePluginIdentifier(e),
    o = getInstalledPlugins(),
    keys = Object.keys(o.plugins),
    h = findPluginName(keys, e);
  if (h && o.plugins[h]?.length) return { pluginId: h, pluginName: a };
  let included = e.includes("@"),
    filtered = Qps(keys, a).filter(
      (y) => (!included || !parsePluginIdentifier(y).marketplace) && (o.plugins[y]?.length ?? 0) > 0,
    ),
    c =
      filtered.find((y) => o.plugins[y]?.some((j) => j.scope === n && j.projectPath === i)) ??
      filtered.find((y) => o.plugins[y]?.some((j) => isSameInstallScope(j, n, i))) ??
      filtered[0];
  if (c) return { pluginId: c, pluginName: a };
  return null;
}
/**
 * 从 installed_plugins V2 记录中按作用域与当前项目路径找到对应安装条目。
 */
//@ chunk-pp50kewz.js:10385-10954 fingerprint = getPluginInstallationFromV2 (1)
function getPluginInstallationFromV2(pluginId) {
  let installedData = getInstalledPlugins(),
    i = findPluginName(Object.keys(installedData.plugins), pluginId),
    a = i ? installedData.plugins[i] : void 0;
  if (!a || a.length === 0) return { scope: "user" };
  let currentProjectPath = getOriginalCwd(),
    localInstall = a.find((inst) => inst.scope === "local" && inst.projectPath === currentProjectPath);
  if (localInstall) return { scope: localInstall.scope, projectPath: localInstall.projectPath };
  let projectInstall = a.find((inst) => inst.scope === "project" && inst.projectPath === currentProjectPath);
  if (projectInstall) return { scope: projectInstall.scope, projectPath: projectInstall.projectPath };
  let userInstall = a.find((inst) => inst.scope === "user");
  if (userInstall) return { scope: userInstall.scope };
  for (let r of ["local", "project"]) {
    let c = qP(a, r, currentProjectPath);
    if (c) return { scope: c.scope, projectPath: c.projectPath };
  }
  return { scope: a[0].scope, projectPath: a[0].projectPath };
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
/**
 * 是否“仅缺少依赖”：插件在该作用域启用且缓存存在，加载问题只有依赖未找到（dependency-unsatisfied/not-found）。
 */
//@ chunk-pp50kewz.js:11366-11515 layout
async function hasOnlyMissingDependencyIssues(e, n, i) {
  if (!(await isPluginEnabledAndCachedAtScope(e, n, i))) return !1;
  return !(await YCo(e, i)).some((o) => o.type !== "dependency-unsatisfied" || o.reason !== "not-found");
}
//@ chunk-pp50kewz.js:11515-11715 layout
function hasDirectoryCounterpartInstalled(e, n) {
  {
    let i = n === OFFICIAL_MARKETPLACE_NAME;
    return Object.entries(getInstalledPlugins().plugins).some(([a, o]) => {
      if (o.length === 0) return !1;
      let { name: u, marketplace: marketplace } = parsePluginIdentifier(a);
      return (
        u === e &&
        marketplace !== void 0 &&
        marketplace !== n &&
        (i ? isOfficialMarketplaceName_3(marketplace) : marketplace === OFFICIAL_MARKETPLACE_NAME)
      );
    });
  }
  return !1;
}
/**
 * --replace 需要完整 name@marketplace 的提示。
 */
//@ chunk-pp50kewz.js:11715-11882 layout
function replaceNeedsFullIdMessage() {
  return "--replace switches one copy of a plugin for another, so it needs the full id of the copy to switch to: name@marketplace. Nothing was installed.";
}
/**
 * --replace 切换市场副本在本会话不可用的原因：插件目录不在会话中、工作区受限（不读项目/本地设置）、设置源被缩小。
 */
//@ chunk-pp50kewz.js:11882-12052 layout
function getReplaceUnavailableReason() {
  if (!Eq()) return "directory-not-in-session";
  if (isWorkspaceRestricted()) return "workspace-restricted";
  if (!EDITABLE_SETTING_SOURCES.every((e) => getEnabledSettingSources().includes(e)))
    return "setting-sources-narrowed";
  return;
}
/**
 * 把 --replace 不可用原因转成用户提示（CLI 与界面两种措辞）。
 */
//@ chunk-pp50kewz.js:12052-12766 layout
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
  return `${isAsciiImpersonatingOfficialName(e) ? reservedMarketplaceNameError(e) : marketplaceLoadFailedMessage(e, IMPERSONATION_ERROR_MESSAGE)}. ${marketplaceRemovalAdvice(e, { declaredInSettings: n.source.source === "settings" })}`;
}
//@ chunk-pp50kewz.js:12879-13496 layout
async function whyNotInstallableInPlace(e, n) {
  if ((e.entry.dependencies?.length ?? 0) > 0) return "its catalog entry declares dependencies";
  let source = e.entry.source;
  if (typeof source !== "string") return "its source is not a folder in the marketplace";
  try {
    let { entryPath: entryPath } = entryPathOrReason(
      await resolvePluginEntryPath(
        `${e.entry.name}@${e.marketplace}`,
        e.marketplaceInstallLocation,
        source,
        await loadKnownMarketplacesWithDeclared(n),
        tryUnwrapTextPayload(),
        n,
      ),
    );
    if (entryPath === void 0) return "its folder in the marketplace could not be resolved";
    let { manifest: manifest } = await loadPluginManifest(
      entryPath,
      e.entry.name,
      source,
      [join(entryPath, PLUGIN_JSON)],
      { noTelemetry: !0 },
      n,
    );
    return (manifest.dependencies?.length ?? 0) > 0 ? "its manifest declares dependencies" : void 0;
  } catch (error) {
    return `it could not be checked (${quotedPrintable(errorMessage(error), 200)})`;
  }
}
//@ chunk-pp50kewz.js:13496-13557 layout
async function readInstalledPlugins(e) {
  return isStorageV5Enabled() && e !== void 0 ? await loadInstalledPlugins(e) : loadInstalledPluginsSync();
}
//@ chunk-pp50kewz.js:13557-13611 layout
async function getInstallationsOf(e, n) {
  return (await readInstalledPlugins(n)).plugins[e];
}
//@ chunk-pp50kewz.js:13611-13694 layout
async function isPluginPossiblyInstalled(e, n) {
  let i = await readInstalledPlugins(n);
  return PF(i) || (i.plugins[e]?.length ?? 0) > 0;
}
//@ chunk-pp50kewz.js:13694-13756 layout
function latestInstallationAtScope(e, n) {
  return hasInstallationForCurrentProject((e ?? []).filter((i) => i.scope === n));
}
/**
 * 安装插件的操作入口（CLI claude plugin install 与 /plugin 界面）：解析 name[@marketplace]、校验作用域与策略（blocklist/policy、市场被禁）、取 marketplace 条目、处理依赖（自动安装同市场或白名单市场的依赖）、下载缓存、写 installed_plugins.json 与 settings 的 enabledPlugins；支持 --replace 在不同市场副本间切换。
 */
//@ chunk-pp50kewz.js:13756-36288 callgraph-witnessed = installPluginOp (0.16)
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
  (assertInstallableScope(scope), (pluginId = normalizePluginId(pluginId)));
  let { name: pluginName, marketplace: marketplaceName } = parsePluginId(pluginId),
    b = pluginOperationRefusal(pluginId, marketplaceName, "install");
  if (b !== void 0)
    return { success: !1, message: b, failureCode: unmanageablePluginReason(pluginId, marketplaceName) };
  let _e = await getInstalledListRefusal(storageV5);
  if (_e !== void 0)
    return {
      success: !1,
      message: `Plugin "${quotedPrintable(pluginId)}" was not installed: ${readInstalledPluginsFile(_e)}`,
      failureCode: "install_records_unreadable",
    };
  if (u && !marketplaceName)
    return { success: !1, message: replaceNeedsFullIdMessage(), failureCode: "replace_needs_full_id" };
  let ee = u ? getReplaceUnavailableReason() : void 0;
  if (ee !== void 0)
    return {
      success: !1,
      message: describeReplaceUnavailable(ee, "cli"),
      failureCode: "replace_unavailable",
    };
  let W,
    se,
    Ce,
    X = !1,
    we,
    J,
    D,
    ce = !1,
    ge = !1,
    k,
    pe = !1,
    Ee = !1,
    M,
    P = "",
    L,
    U = "",
    B = "",
    me = !1,
    N = parseNpmPluginId(pluginId);
  if (N === null && pluginId.toLowerCase().endsWith(`@${NPM}`))
    return {
      success: !1,
      message: `"${pluginId}" is not an npm package spec: expected <package>@npm, e.g. @scope/name@npm, name@npm or name@1.2.3@npm`,
      failureCode: "not_found",
    };
  if (N !== null && c !== void 0 && !isHttpUrl(c))
    return {
      success: !1,
      message: `--registry must be an http(s) URL (got "${c}")`,
      failureCode: "not_found",
    };
  if (N !== null) {
    if (!ZJn())
      return {
        success: !1,
        message: NPM_DIRECT_INSTALL_DISABLED_MESSAGE,
        failureCode: "npm_marketplace_disabled",
      };
    ((W = toNpmPluginSource(N, c)), (se = NPM), (Ce = NPM_REGISTRY));
  } else if (marketplaceName) {
    let pluginInfo = await loadKnownMarketplacesWithDeclared(storageV5),
      ie = Zb(pluginInfo, marketplaceName);
    if (ie !== void 0 && Dse(marketplaceName, ie))
      return (
        logFeatureBad("plugin_marketplace_resolve", "marketplace_name_refused", { scoped: !0 }),
        {
          success: !1,
          message: describeImpersonatingMarketplace(marketplaceName, ie),
          failureCode: "not_found",
        }
      );
    me = listReservedNameRefusals(pluginInfo).some((ue) => ue.name === marketplaceName);
    let V = ie !== void 0 && isSourceAllowedByPolicy(ie.source);
    ce = ie !== void 0 && !V;
    let He =
      u && ie !== void 0 && V && isPluginDirectorySource(ie.source)
        ? await lookUpPluginForSwitch(pluginName, storageV5)
        : void 0;
    if (He !== void 0 && "notFreshEnoughFor" in He) {
      if (((D = He.detail), hasDirectoryCounterpartInstalled(pluginName, marketplaceName)))
        return (
          logFeatureBad("plugin_marketplace_resolve", "refresh_failed", { scoped: !0 }),
          {
            success: !1,
            message: `Plugin "${quotedPrintable(pluginName)}" was not switched. ${formatSwitchNeedsFreshReadMessage(He.detail)}`,
            failureCode: "replace_needs_fresh_listing",
          }
        );
    }
    let R = He !== void 0 && "entry" in He ? He : void 0,
      Q =
        R !== void 0
          ? { outcome: "refreshed" }
          : j
            ? { outcome: "ineligible" }
            : (o ?? (await refreshBeforeScopedInstall(marketplaceName, ie, storageV5)));
    if (!j) logInstallRefreshFirst(Q.outcome);
    if (Q.outcome === "refreshed") X = !0;
    else if (Q.outcome === "refresh-failed") {
      if (
        ((ge = !0),
        (we = `marketplace not refreshed (${Q.errorMessage})`),
        ie && isPluginDirectorySource(ie.source))
      )
        k = Q.errorMessage;
    }
    if (
      ((pe = ie !== void 0 && isPluginDirectorySource(ie.source)),
      (Ee = ie === void 0 && marketplaceName === OFFICIAL_MARKETPLACE_NAME && !Eq()),
      pe && (await getPluginDirectoryState()) === "blocked")
    )
      return (
        logFeatureBad("plugin_marketplace_resolve", "marketplace_policy_blocked", { scoped: !0 }),
        {
          success: !1,
          message: directoryBlockedMessage(pluginName),
          failureCode: "marketplace_policy_blocked",
        }
      );
    let x =
      R !== void 0
        ? R.entry === null
          ? null
          : R
        : k === void 0
          ? await getPluginById(pluginId, storageV5, "install")
          : await getPluginByIdCacheOnly(pluginId, storageV5, "install");
    if (R !== void 0 && R.entry !== null) J = R.reviewerMarked;
    if (x) ((W = x.entry), (se = marketplaceName), (Ce = x.marketplaceInstallLocation));
  } else {
    let K,
      q = await findPluginInMarketplaces(pluginName, storageV5, (Q) => {
        K = Q;
      }),
      ie = !q ? await getPluginDirectoryState() : void 0,
      V = K?.message,
      He = V?.indexOf(": ") ?? -1,
      R = V?.startsWith(`${OFFICIAL_MARKETPLACE_DISPLAY} `) && He !== -1 ? V.slice(He + 2) : V;
    if (q) {
      if (
        ((W = q.entry),
        (se = q.marketplace),
        (Ce = q.marketplaceInstallLocation),
        (L = q.preferredOver),
        R !== void 0 && q.marketplace !== OFFICIAL_MARKETPLACE_NAME && Eq())
      )
        P = ` (The ${OFFICIAL_MARKETPLACE_DISPLAY} could not be checked: ${R}; installed from ${printableLabel(marketplaceDisplayName(q.marketplace), { head: 60, tail: 20 }) || "another marketplace"}.)`;
    } else if (ie === "blocked")
      U = `. (The ${OFFICIAL_MARKETPLACE_DISPLAY} is blocked by your organization. ${pluginDirectoryPolicyBlockHint()})`;
    else if (ie === "off")
      B = `. (The ${OFFICIAL_MARKETPLACE_DISPLAY} was not searched: it is turned off. Turn it back on: claude plugin marketplace add ${OFFICIAL_MARKETPLACE_NAME})`;
    else if (((M = R), M === void 0 && (await isPluginDirectoryListingBlocked(pluginName, storageV5))))
      U = `. (The ${OFFICIAL_MARKETPLACE_DISPLAY} lists it, but it is blocked by your organization's policy.)`;
  }
  if (!W || !se) {
    if ((!W || !se) && pe && marketplaceName && k === void 0)
      try {
        await getMarketplace(marketplaceName, storageV5, "install");
      } catch (error) {
        if (error instanceof PluginDirectoryUnavailableError) k = error.message;
      }
    if ((!W || !se) && k)
      return (
        logFeatureBad("plugin_marketplace_resolve", "refresh_failed_stale_lookup", { scoped: !0 }),
        {
          success: !1,
          message: `Could not look up "${quotedPrintable(pluginName)}". ${k}`,
          failureCode: "directory_unavailable",
        }
      );
    if ((!W || !se) && Ee)
      return (
        logFeatureBad("plugin_marketplace_resolve", "not_found", { scoped: !0 }),
        {
          success: !1,
          message: `Plugin "${quotedPrintable(pluginName)}" not found: the ${OFFICIAL_MARKETPLACE_DISPLAY} isn't available in this session`,
          failureCode: "directory_not_in_session",
        }
      );
    if (
      (!W || !se) &&
      marketplaceName === OFFICIAL_MARKETPLACE_NAME &&
      (await getPluginDirectoryState()) === "off"
    )
      return (
        logFeatureBad("plugin_marketplace_resolve", "not_found", { scoped: !0 }),
        {
          success: !1,
          message: `Could not look up "${quotedPrintable(pluginName)}": the ${OFFICIAL_MARKETPLACE_DISPLAY} is off. Turn it on: claude plugin marketplace add ${OFFICIAL_MARKETPLACE_NAME}`,
          failureCode: "directory_off",
        }
      );
    if ((!W || !se) && pe && (await isPluginDirectoryListingBlocked(pluginName, storageV5)))
      return (
        logFeatureBad("plugin_marketplace_resolve", "marketplace_policy_blocked", { scoped: !0 }),
        {
          success: !1,
          message: `Plugin "${quotedPrintable(pluginName)}" is blocked by your organization's policy and cannot be installed`,
          failureCode: "plugin_policy_blocked",
        }
      );
    if ((!W || !se) && pe) {
      let K = await pluginDirectoryNotInstallableMessage(pluginName);
      if (K !== void 0)
        return (
          logFeatureBad("plugin_marketplace_resolve", "not_installable", { scoped: !0 }),
          { success: !1, message: K, failureCode: "not_found" }
        );
    }
    if ((!W || !se) && me)
      return (
        logFeatureBad("plugin_marketplace_resolve", "not_found", { scoped: !0 }),
        {
          success: !1,
          message: `Plugin "${quotedPrintable(pluginName)}" not found: "${quotedPrintable(marketplaceName)}" is not a marketplace Claude Code uses (see the warning above)`,
          failureCode: "not_found",
        }
      );
  }
  if (!W || !se) {
    let K = marketplaceName ? `marketplace "${marketplaceName}"` : "any configured marketplace",
      q = marketplaceName ? claudeCommand("plugin marketplace update", marketplaceName) : null,
      ie =
        marketplaceName !== void 0 &&
        marketplaceName !== OFFICIAL_MARKETPLACE_NAME &&
        isOfficialMarketplaceSpelling(marketplaceName)
          ? !0
          : !1,
      V =
        marketplaceName && !X && !ie
          ? `. Your local copy may be out of date${q ? ` \u2014 try \`${q}\`` : " \u2014 update it from /plugin > Marketplaces"}.`
          : "";
    logFeatureBad(
      "plugin_marketplace_resolve",
      ce ? "marketplace_policy_blocked" : ge ? "refresh_failed_stale_lookup" : "not_found",
      { scoped: marketplaceName !== void 0 },
    );
    let He = M ? `. (The ${OFFICIAL_MARKETPLACE_DISPLAY} could not be checked: ${M})` : "",
      R = "";
    if (pe && marketplaceName) {
      let replaced = pluginName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        x = (await getMarketplace(marketplaceName, storageV5, "install").catch(() => null))?.plugins
          .filter((ue) => ue.displayName?.toLowerCase().replace(/[^a-z0-9]+/g, "-") === replaced)
          .map((ue) => ue.name)
          .slice(0, 3);
      if (x !== void 0 && x.length > 0)
        R = `${V === "" ? "." : ""} It may be listed as: ${x.map((ue) => printableName(ue, 80)).join(", ")}`;
    }
    return {
      success: !1,
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
  let Z = W,
    S = `${Z.name}@${se}`;
  if (ce) logFeatureBad("plugin_marketplace_resolve", "marketplace_policy_blocked", { scoped: !0 });
  else logFeatureOk("plugin_marketplace_resolve", { scoped: marketplaceName !== void 0 });
  if (N?.versionSpec === void 0 && (await hasOnlyMissingDependencyIssues(S, scope, storageV5))) {
    let K = S.endsWith(`@${OFFICIAL_MARKETPLACE_NAME}`)
        ? eVe(
            (isStorageV5Enabled() && storageV5 !== void 0
              ? await loadInstalledPlugins(storageV5)
              : loadInstalledPluginsSync()
            ).plugins,
            S,
          )
        : [],
      q = K.length > 0 ? K.flatMap(([, Te]) => Te) : void 0,
      ie = q !== void 0 ? await seedDirectoryBindings(K) : void 0;
    if (ie !== void 0 && isUnboundOfficialPlugin(S, q, ie))
      return {
        success: !1,
        message: `"${printableName(Z.name, 120)}" is already installed, but plugin-directory-bindings.json in the plugins folder could not be used (unreadable, a symbolic link or not a file, over 1 MB, damaged, or written by a newer Claude Code), so its ${OFFICIAL_MARKETPLACE_DISPLAY} listing could not be checked against the repository it was installed from. Nothing was changed. Try again; if this repeats, check the file for those causes.`,
        failureCode: "directory_binding_unreadable",
      };
    if (q !== void 0 && ie !== void 0 && isDirectoryRepositoryChanged(S, q, Z.source, ie)) {
      let Te = findDataDirConflictingRecord(Object.fromEntries(K), ie, S, Z.source);
      return {
        success: !1,
        message:
          Te !== void 0
            ? formatSharedDataFolderMessage(Z.name, Te)
            : `"${quotedPrintable(Z.name, 120)}" is already installed from a different repository than the one the ${OFFICIAL_MARKETPLACE_DISPLAY} now lists under that name. Uninstall it first, then install it again.`,
        failureCode: "directory_identity_changed",
      };
    }
    let V = Eq()
        ? await describeOtherMarketplaceInstalls(S, Z, await loadKnownMarketplacesSafe(storageV5), storageV5)
        : [],
      He = () => checkInstallAllowed(S, Z, storageV5).then((Te) => (Te.ok ? void 0 : Te.refusal));
    if (u) {
      if ((await resolveDelistedPluginId(h, V, storageV5)).length > 0)
        return {
          success: !1,
          message: formatSwitchTargetChangedMessage(Z.name),
          failureCode: "installed_from_other_marketplace",
        };
      let [Te] = V;
      if (Te !== void 0 && D !== void 0)
        return (
          logMarketplaceSwitch({
            fromPluginId: Te.pluginId,
            toPluginId: S,
            surface: r,
            managedNames: af(),
            result: { outcome: "bad", code: "replace_needs_fresh_listing" },
          }),
          {
            success: !1,
            message: `Plugin ${displayPluginId(S)} is already installed (scope: ${scope}), and nothing was switched. ${formatSwitchNeedsFreshReadMessage(D)}`,
            failureCode: "replace_needs_fresh_listing",
          }
        );
      let Ze = Te === void 0 ? void 0 : await He();
      if (Ze !== void 0 && Te !== void 0) {
        let Be =
            Ze.reason === "plugin-directory-unavailable"
              ? {
                  message: formatDirectoryUnavailableMessage(Ze.pluginName, Ze.unavailableDependency),
                  failureCode: "plugin_directory_unavailable",
                }
              : describePolicyBlock(Ze),
          wn =
            Be.failureCode === "plugin_directory_unavailable"
              ? ": switching to this copy is allowed only where installing it is. "
              : ". ";
        return (
          logMarketplaceSwitch({
            fromPluginId: Te.pluginId,
            toPluginId: S,
            surface: r,
            managedNames: af(),
            result: { outcome: "bad", code: Be.failureCode },
          }),
          {
            success: !1,
            message: `Plugin ${displayPluginId(S)} is already installed (scope: ${scope}), and nothing was switched${wn}${Be.message}`,
            failureCode: Be.failureCode,
          }
        );
      }
      let Ve = findOtherMarketplaceInstallBlocker(S, V, h, J);
      if (Ve?.reason === "more-installed-than-shown")
        return {
          success: !1,
          message: formatMoreInstallsThanShownMessage(Z.name),
          failureCode: "installed_from_other_marketplace",
        };
      if (Ve !== void 0)
        return (
          logMarketplaceSwitch({
            fromPluginId: Ve.blocking.pluginId,
            toPluginId: S,
            surface: r,
            managedNames: af(),
            result: { outcome: "bad", code: "installed_from_other_marketplace" },
          }),
          {
            success: !1,
            message: `Plugin ${displayPluginId(S)} is already installed (scope: ${scope}), and nothing was switched. ${installFromOtherMarketplace(S, Z.name, V, r === "cli" ? "cli" : "ui", scope, J)}`,
            failureCode: "installed_from_other_marketplace",
          }
        );
      let [gn, ...on] = V;
      if (gn) {
        let Be = await finishReplaceSwitch(
            S,
            scope,
            [gn, ...on],
            {
              newCopyWasJustInstalled: !1,
              newCopyWasOn: locatePluginInstall(S, void 0, yn()).effective === !0,
              surface: r,
              carrySettingsFrom: p,
            },
            storageV5,
          ),
          wn =
            scope === "user"
              ? await findOtherProjectInstalls(S, Z, await loadKnownMarketplacesSafe(storageV5), storageV5)
              : [],
          kn = describeOtherMarketplaceInstall(S, Z.name, wn);
        if (Be.ok) await clearAutoInstalledFlag(S, scope, getProjectPathForScope(scope), storageV5);
        let _n = claudeCommand("plugin enable", S),
          jn =
            Be.ok && !Be.stayedDisabled && locatePluginInstall(S, void 0, yn()).effective === !1
              ? `. ${displayPluginId(S)} is disabled in your settings \u2014 enable it ${_n ? `with: ${_n}` : "in /plugin"}`
              : "";
        return Be.ok
          ? {
              success: !0,
              message: `Plugin ${displayPluginId(S)} was already installed (scope: ${scope})${Be.note}${jn}${kn === "" ? "" : `. ${kn}`}`,
              pluginId: S,
              pluginName: Z.name,
              scope: scope,
              switched: {
                from: Be.from,
                replaced: Be.replaced,
                stayedDisabled: Be.stayedDisabled,
                keptOwnSettings: Be.keptOwnSettings,
                settingsRemovedFrom: Be.settingsRemovedFrom,
                ...(Be.settingsLeftInPlace && { settingsLeftInPlace: Be.settingsLeftInPlace }),
                savedDataRemovedFrom: Be.savedDataRemovedFrom,
                ...(Be.keptDataDir && { keptDataDir: Be.keptDataDir }),
                ...(Be.oldCopyStillRecordedAt.length > 0 && {
                  oldCopyStillRecordedAt: Be.oldCopyStillRecordedAt,
                }),
                ...((Be.saysMore || jn !== "" || kn !== "") && { messageSaysMore: !0 }),
              },
            }
          : { success: !1, message: Be.message, failureCode: "replace_failed" };
      }
    }
    let R = await clearAutoInstalledFlag(S, scope, getProjectPathForScope(scope), storageV5),
      Q = await installMissingDependencies(S, storageV5),
      x =
        V.length > 0 && findOtherMarketplaceInstallBlocker(S, V, void 0) === void 0 && (await He()) === void 0
          ? claudeCommand("plugin install", S, scope === "user" ? "--replace" : `--replace --scope ${scope}`)
          : null,
      ue = (Te) => {
        let Ze = mE(Te);
        return Ze !== OFFICIAL_MARKETPLACE_NAME && !(Ze !== void 0 && isOfficialMarketplaceName_3(Ze));
      },
      fe = (Te) => {
        let Ze = new Map();
        for (let Ve of Te) {
          let gn = mE(Ve.pluginId);
          Ze.set(gn, [...(Ze.get(gn) ?? []), displayPluginId(Ve.pluginId)]);
        }
        return new Intl.ListFormat("en", { type: "conjunction" }).format(
          [...Ze].map(
            ([Ve, gn]) =>
              `${(Ve !== void 0 ? displayMarketplaceName(Ve) : "") || "another marketplace"} (${gn.join(", ")})`,
          ),
        );
      },
      ze = mE(S),
      Se = ze !== void 0 && ue(S),
      Fe = Se ? [] : V.filter((Te) => !ue(Te.pluginId)),
      Ye = Se ? [] : V.filter((Te) => ue(Te.pluginId)),
      sn = V.length > 0 ? fe(V) : "",
      an = plural(V.length, "other", "others"),
      marketplace = await installedAndAvailableVersions({
        pluginId: S,
        entry: Z,
        marketplaceName: se,
        marketplaceInstallLocation: Ce,
        scope: scope,
        projectPath: getProjectPathForScope(scope),
        storageV5: storageV5,
      }),
      Qe = `${describeUpdateAvailability(S, scope, marketplace)}${Q?.suffix ?? ""}`,
      ye = /[.?]$/.test(Qe) ? " " : ". ",
      We =
        sn !== ""
          ? Se
            ? `${ye}${displayMarketplaceName(ze ?? "") || "\u201C\u201D"} lists it at the same repository and folder as ${plural(V.length, "a plugin", "plugins")} installed here from ${sn}. If they are the same plugin, it loads ${V.length === 1 ? "twice" : "more than once"}: to keep only one, uninstall the ${an}`
            : `${Fe.length === 0 ? "" : `${Qe === "" ? " \u2014 also installed from " : `${ye}${displayPluginId(S)} is also installed from `}${fe(Fe)}${x !== null ? `; to keep only this one: ${x}` : ""}`}${Ye.length === 0 ? "" : `${Fe.length === 0 ? ye : ". "}${plural(Ye.length, "A plugin", "Plugins")} installed here from ${fe(Ye)} ${plural(Ye.length, "is", "are")} listed there at the same repository and folder as this one. ${Fe.length === 0 ? `If they are the same plugin, it loads ${V.length === 1 ? "twice" : "more than once"}` : `If ${plural(Ye.length, "that one is", "those are")} the same plugin too, it loads ${V.length + 1} times`}: to keep only one, uninstall the ${an}`}`
          : "";
    return {
      success: !0,
      message: `Plugin ${We === "" ? `"${S}"` : displayPluginId(S)} is already installed (scope: ${scope})${R ? " \u2014 marked as manually installed" : ""}${Qe}${We}${nothingSwitchedSuffix(u === !0 && V.length === 0, `${Qe}${We}`)}`,
      pluginId: S,
      pluginName: Z.name,
      scope: scope,
      installedVersion: marketplace.installedVersion,
      availableVersion: marketplace.availableVersion,
    };
  }
  let he;
  if (a !== void 0) he = a;
  else if (((he = await archiveFetchWarning(S, Z, storageV5)), he !== null))
    throw new Eie(
      `${archiveHelperDisclosure(he)}
This install runs that command; confirm it by running \`claude plugin install\` in a terminal (or with -y/--yes).`,
      "entry_helper_unconfirmed",
    );
  let re = await getInstallationsOf(S, storageV5),
    Oe = latestInstallationAtScope(re, scope),
    ae = hasInstallationForCurrentProject(re ?? []) && locatePluginInstall(S, void 0, yn()).effective === !0,
    Ge = await installResolvedPlugin({
      pluginId: S,
      entry: Z,
      scope: scope,
      marketplaceInstallLocation: Ce,
      trigger: "cli",
      explicit: !0,
      consentedEntryHelper: he,
      commandSourceConsent:
        i !== void 0 ? { kind: "shown", command: i, pluginId: S } : recordedSourceCommand(S, Z.source, re),
      replaceInstalledCopy: u,
      replaceOnlyPluginIds: h,
      switchTargetMarkedInItsOwnWalk: J,
      switchWalkNotFresh: D,
      storageV5: storageV5,
      gitHubHttpsFallback: y,
    }).catch(async (K) => {
      let q =
        L !== void 0 &&
        typeof L.entry.source === "string" &&
        !re?.length &&
        !(await isPluginPossiblyInstalled(S, storageV5))
          ? classifyOfficialFetchError(K)
          : void 0;
      if (q !== void 0 && L !== void 0) return { fetchFailed: K, why: q, official: L };
      throw K;
    });
  if ("fetchFailed" in Ge) {
    {
      let { fetchFailed: fetchFailed, why: why, official: official } = Ge,
        V = `${official.entry.name}@${official.marketplace}`,
        He = await whyNotInstallableInPlace(official, storageV5);
      if (He !== void 0)
        throw (
          logForDebugging(
            `Bare-name install of "${quotedPrintable(pluginName)}": the ${OFFICIAL_MARKETPLACE_DISPLAY}'s copy could not be fetched, and ${quotedPrintable(V)} was not installed in its place: ${He}`,
          ),
          fetchFailed
        );
      let R, Q;
      try {
        let Fe = await loadAllPluginsCacheOnly(storageV5);
        R = collectDependencyVersionRanges([...Fe.enabled, ...Fe.disabled], new Set());
      } catch (error) {
        (logError(error), (Q = errorMessage(error)));
      }
      let x = R?.ranges.get(V) ?? [],
        ue = x.length > 0 ? intersectVersionConstraints(x) : void 0;
      if (Q !== void 0 || (ue !== void 0 && (!ue.ok || ue.range !== "*"))) {
        let Fe = uniq(R?.requirers.get(V) ?? []);
        throw (
          logForDebugging(
            `Bare-name install of "${quotedPrintable(pluginName)}": the ${OFFICIAL_MARKETPLACE_DISPLAY}'s copy could not be fetched, and ${quotedPrintable(V)} was not installed in its place: ${Q !== void 0 ? `could not read the installed plugins to check (${quotedPrintable(Q, 300)})` : `${quotedPrintable(Fe.join(", "))} ${Fe.length === 1 ? "requires" : "require"} version ${quotedPrintable(x.join(", "))} of it, which could be downloaded from the marketplace's git host`}`,
          ),
          fetchFailed
        );
      }
      logForDebugging(
        `Bare-name install of "${quotedPrintable(pluginName)}": the ${OFFICIAL_MARKETPLACE_DISPLAY}'s copy could not be fetched (${quotedPrintable(errorMessage(fetchFailed), 300)}); installing ${quotedPrintable(official.marketplace)}'s copy instead`,
      );
      let fe = latestInstallationAtScope(await getInstallationsOf(V, storageV5), scope),
        ze,
        Se = await installPluginOp(
          V,
          scope,
          { surface: r, withoutRefresh: !0, gitHubHttpsFallback: y },
          storageV5,
        ).catch((Fe) => {
          ((ze = Fe),
            logForDebugging(
              `Bare-name install of "${quotedPrintable(pluginName)}": ${quotedPrintable(official.marketplace)}'s copy did not install either: ${quotedPrintable(errorMessage(Fe), 300)}`,
            ));
          return;
        });
      if (!Se?.success && !fe && latestInstallationAtScope(await getInstallationsOf(V, storageV5), scope))
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          describeInstallFetchFailure(
            why,
            V,
            official.marketplace,
            scope,
            Se === void 0 ? errorMessage(ze) : Se.message,
          ),
          "bare-name install: the official copy it fell back to was left installed after its install failed",
        );
      if (!Se?.success || Se.pluginId !== V || Se.aliasedId || Se.nothingWritten) {
        if (Se !== void 0)
          logForDebugging(
            `Bare-name install of "${quotedPrintable(pluginName)}": ${quotedPrintable(official.marketplace)}'s copy was not installed: ${quotedPrintable(Se.message, 300)}`,
          );
        throw fetchFailed;
      }
      return (
        logFeatureSad(
          "plugin_marketplace_resolve",
          why === "git-missing" ? "directory_copy_git_missing" : "directory_copy_fetch_failed",
        ),
        { ...Se, message: `${Se.message}${formatOfficialFallbackNote(why, official.marketplace)}` }
      );
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
            return (
              logMarketplaceSwitch({
                fromPluginId: A.installedCopies[0].pluginId,
                toPluginId: S,
                surface: r,
                managedNames: af(),
                result: { outcome: "bad", code: "replace_needs_fresh_listing" },
              }),
              {
                success: !1,
                message: `Plugin "${quotedPrintable(A.pluginName)}" was not switched. ${formatSwitchNeedsFreshReadMessage(A.detail)}`,
                failureCode: "replace_needs_fresh_listing",
              }
            );
          case "installed-from-other-marketplace":
            if (u)
              logMarketplaceSwitch({
                fromPluginId: (
                  A.installedCopies.find((installedCopy) => !installedCopy.replaceable) ??
                  A.installedCopies[0]
                ).pluginId,
                toPluginId: S,
                surface: r,
                managedNames: af(),
                result: { outcome: "bad", code: "installed_from_other_marketplace" },
              });
            else if (r === "cli") {
              let K = await installSelectedPlugins(S, storageV5),
                q = K?.installed.scopes.some(isInstallableScope) ? K : void 0;
              if (q) {
                let index = q.repositoryKey.indexOf("#"),
                  V = index < 0 ? q.repositoryKey : q.repositoryKey.slice(0, index),
                  He = index < 0 ? "" : q.repositoryKey.slice(index + 1),
                  R = V.startsWith(`${GITHUB_HOST}/`) ? V.slice(GITHUB_HOST.length + 1) : V,
                  Q = quotedPrintable(A.pluginName, 120),
                  included = q.installed.scopes.includes(scope),
                  ue = included ? "" : ` at ${q.installed.scopes.join(" and ")} scope`,
                  fe = included ? scope : q.installed.scopes.find(isInstallableScope);
                if (fe !== void 0 && (included || scope === "user")) {
                  let ze = marketplaceDisplayName(
                      parsePluginIdentifier(q.installed.pluginId).marketplace ?? "",
                    ),
                    trimmed = printableName(He, 200).trim(),
                    Fe = printableLabel(
                      printableName(`${R}${trimmed === "" ? "" : ` \xB7 ${trimmed}`}`, 200),
                    ),
                    Ye = Fe === "" ? "" : ` (the same plugin: ${Fe})`,
                    sn = scope === "user" ? "--replace" : `--replace --scope ${scope}`,
                    an = claudeCommand("plugin install", S, sn),
                    Ue = marketplaceDisplayName(se),
                    Qe = findOtherMarketplaceInstallBlocker(S, [q.installed], void 0) === void 0,
                    ye = !Qe
                      ? ""
                      : an === null
                        ? ` To switch it to ${Ue}, open it in /plugin \u2192 Installed and choose "Switch to ${Ue}"`
                        : ` To switch it to ${Ue}: ${an}`,
                    We = !Qe ? "" : ` To switch it to ${Ue}, install ${displayPluginId(S)} with ${sn}.`,
                    Te = included ? [fe] : q.installed.scopes.filter(isInstallableScope),
                    Ze;
                  for (let on of Te)
                    if (await hasCachedInstallationAtScope(q.installed.pluginId, on, storageV5)) {
                      Ze = on;
                      break;
                    }
                  if (Ze === void 0) {
                    let on = claudeCommand(
                      "plugin install",
                      q.installed.pluginId,
                      fe === "user" ? void 0 : `--scope ${fe}`,
                    );
                    return {
                      success: !1,
                      message: `"${Q}" is installed from ${ze}${ue}${Ye}, but its files are missing from the plugin cache. Nothing was changed. To restore them${on === null ? ", install it again from /plugin" : `: ${on}`}`,
                      failureCode: "installed_from_other_marketplace",
                      pluginId: q.installed.pluginId,
                      aliasedId: !0,
                    };
                  }
                  if (!included) {
                    let on = claudeCommand("plugin enable", q.installed.pluginId, "--scope local"),
                      Be = locatePluginInstall(q.installed.pluginId, void 0, yn()),
                      wn =
                        Be.effective === !0
                          ? ""
                          : Be.override !== void 0
                            ? ` The plugin is turned off by ${Be.override.source === "policySettings" ? "your organization's managed settings" : "this session's --settings flag"}, and this command changed nothing.`
                            : ` The plugin is turned off in this project, and this command did not turn it on. To turn it on${on === null ? ", open it in /plugin" : ` for yourself in this project: ${on}`}`;
                    return {
                      success: !0,
                      message: `"${Q}" is already installed from ${ze}${ue}${Ye}. Nothing to install.${wn === "" ? ye : We}${wn}`,
                      pluginId: q.installed.pluginId,
                      pluginName: A.pluginName,
                      scope: Ze,
                      aliasedId: !0,
                      nothingWritten: !0,
                    };
                  }
                  let Ve = await setPluginEnabledOp(q.installed.pluginId, !0, fe, void 0, storageV5);
                  if (!Ve.success && !Ve.alreadyInGoalState)
                    return {
                      success: !1,
                      message: Ve.message,
                      failureCode: Ve.failureCode,
                      pluginId: q.installed.pluginId,
                      aliasedId: !0,
                    };
                  let gn = await clearAutoInstalledFlag(
                    q.installed.pluginId,
                    fe,
                    getProjectPathForScope(fe),
                    storageV5,
                  );
                  return {
                    success: !0,
                    message: `"${Q}" is already installed from ${ze}${Ye}. ${Ve.success ? "It was disabled, so it is enabled again." : "Nothing to install."}${gn ? " It is now marked as manually installed." : ""}${ye}`,
                    pluginId: q.installed.pluginId,
                    pluginName: A.pluginName,
                    scope: (Ve.success ? Ve.scope : void 0) ?? fe,
                    aliasedId: !0,
                    ...(Ve.success && { reenabled: !0 }),
                  };
                }
              }
            }
            return {
              success: !1,
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
              success: !1,
              message: formatMoreInstallsThanShownMessage(A.pluginName),
              failureCode: "installed_from_other_marketplace",
            };
          case "fewer-installed-than-shown":
            return {
              success: !1,
              message: formatSwitchTargetChangedMessage(A.pluginName),
              failureCode: "installed_from_other_marketplace",
            };
          case "directory-pin-unsatisfied":
            return { success: !1, message: A.message, failureCode: "dependency_pinned_version_unsatisfied" };
          case "directory-binding-unreadable":
            return { success: !1, message: A.message, failureCode: "directory_binding_unreadable" };
          case "directory-identity-changed":
            return { success: !1, message: A.message, failureCode: "directory_identity_changed" };
        }
        return {
          success: !1,
          message: `Failed to install plugin "${S}"`,
          failureCode: "dependency_resolution_failed",
        };
      case "local-source-no-location":
        return {
          success: !1,
          message: `Cannot install local plugin "${A.pluginName}" without marketplace install location`,
          failureCode: "local_source_no_location",
        };
      case "plugin-folder-held":
        return {
          success: !1,
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
          success: !1,
          message: formatInvalidPluginIdMessage(
            A.pluginId,
            S,
            A.pluginId === S ? { pluginName: Z.name, marketplaceName: se } : void 0,
          ),
          failureCode: "invalid_plugin_id",
        };
      case "installed-list-held":
        return {
          success: !1,
          message: `Plugin "${quotedPrintable(S)}" was not installed: ${readInstalledPluginsFile(A.held)}`,
          failureCode: "install_records_unreadable",
        };
      case "settings-write-failed":
        return {
          success: !1,
          message: `Failed to update settings: ${A.message}`,
          failureCode: "settings_write_failed",
        };
      case "resolution-failed":
        return {
          success: !1,
          message: formatResolutionError(A.resolution),
          failureCode: "dependency_resolution_failed",
        };
      case "blocked-by-policy":
        return { success: !1, ...describePolicyBlock(A) };
      case "dependency-blocked-by-policy":
        return {
          success: !1,
          message: `Plugin "${A.pluginName}" depends on "${A.blockedDependency}", which is blocked by your organization's policy`,
          failureCode: "dependency_policy_blocked",
        };
      case "marketplace-blocked-by-policy":
        return { success: !1, ...describePolicyBlock(A) };
      case "dependency-marketplace-blocked-by-policy":
        return {
          success: !1,
          message: `Plugin "${A.pluginName}" depends on "${A.blockedDependency}" from marketplace "${A.marketplaceName}", which is blocked by your organization's policy`,
          failureCode: "dependency_policy_blocked",
        };
      case "plugin-directory-unavailable":
        switch (A.reason) {
          case "plugin-directory-unavailable":
            return {
              success: !1,
              message: formatDirectoryUnavailableMessage(A.pluginName, A.unavailableDependency),
              failureCode: "plugin_directory_unavailable",
            };
        }
        return {
          success: !1,
          message: `Failed to install plugin "${quotedPrintable(S)}"`,
          failureCode: "dependency_resolution_failed",
        };
      case "range-conflict": {
        let K = A.dep === S ? "Plugin" : "Dependency";
        return {
          success: !1,
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
          success: !1,
          message: noMatchingTagMessage(K, A.dep, A.range),
          failureCode: "dependency_version_conflict",
        };
      }
    }
  let Ke = claudeCommand("plugin enable", S),
    De = Ke ? ` \u2014 enable it with: ${Ke}` : " \u2014 enable it in /plugin",
    Ie = A.installedDisabled.includes(S)
      ? A.installedDisabledByDefault.includes(S)
        ? `. This plugin is disabled by default${De}`
        : `. This plugin is disabled in your settings${De}`
      : "",
    Le = !we
      ? ""
      : pe
        ? `. Warning: ${directoryUnreachableMessage()}`
        : `. Warning: ${we} \u2014 installed from the cached catalog, so the version may be stale`,
    un = describeOtherMarketplaceInstall(S, Z.name, A.copiesInOtherProjects),
    qe = "",
    fn;
  if (A.replacedCopies) {
    let K = await finishReplaceSwitch(
      S,
      scope,
      A.replacedCopies,
      { newCopyWasJustInstalled: !Oe, newCopyWasOn: ae, surface: r, carrySettingsFrom: p },
      storageV5,
    );
    if (!K.ok) return { success: !1, message: K.message, failureCode: "replace_failed" };
    ((qe = K.note),
      (fn = {
        from: K.from,
        replaced: K.replaced,
        stayedDisabled: K.stayedDisabled,
        keptOwnSettings: K.keptOwnSettings,
        settingsRemovedFrom: K.settingsRemovedFrom,
        ...(K.settingsLeftInPlace && { settingsLeftInPlace: K.settingsLeftInPlace }),
        savedDataRemovedFrom: K.savedDataRemovedFrom,
        ...(K.keptDataDir && { keptDataDir: K.keptDataDir }),
        ...(K.oldCopyStillRecordedAt.length > 0 && { oldCopyStillRecordedAt: K.oldCopyStillRecordedAt }),
        ...((K.saysMore || A.depNote !== "" || Ie !== "" || Le !== "" || un !== "" || P !== "") && {
          messageSaysMore: !0,
        }),
      }));
  }
  let pluginId_2 = `Successfully installed plugin: ${qe !== "" || un !== "" ? displayPluginId(S) : S} (scope: ${scope})${A.depNote}${Ie}${Le}${qe}${un === "" ? "" : `. ${un}`}${P}`;
  return {
    success: !0,
    message: `${pluginId_2}${nothingSwitchedSuffix(u === !0 && A.replacedCopies === void 0, pluginId_2)}`,
    pluginId: S,
    pluginName: Z.name,
    scope: scope,
    ...(fn && { switched: fn }),
  };
}
//@ chunk-pp50kewz.js:36288-36447 layout
function nothingSwitchedSuffix(e, n) {
  return e
    ? `${/[.?]$/.test(n) ? " " : ". "}Nothing was switched: no installed copy of this plugin from another marketplace matched this listing`
    : "";
}
/**
 * 插件 ID 展示用：截断到 200 字符并去掉不可见字符，全不可见时给占位描述。
 */
//@ chunk-pp50kewz.js:36447-36519 layout
function displayPluginId(e) {
  return printableLabel(printableName(e, 200)) || "an id with no visible characters";
}
//@ chunk-pp50kewz.js:36519-36598 layout
function displayFolderName(e) {
  return printableLabel(e) || "a folder with no visible characters in its name";
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
function findOtherPluginSharingDataDir(e, n, i = new Set([e])) {
  {
    if (PF(n)) return { kind: "records-unreadable" };
    let lower = pluginDataDirPath(e).toLowerCase(),
      found = Object.keys(n.plugins).find(
        (u) => u !== e && !i.has(u) && pluginDataDirPath(u).toLowerCase() === lower,
      );
    return found === void 0 ? { kind: "nobody" } : { kind: "plugin", pluginId: found };
  }
  return { kind: "records-unreadable" };
}
/**
 * 卸载时插件数据目录被保留的说明（另一插件共用、或安装列表读不到无法判断）。
 */
//@ chunk-pp50kewz.js:36987-37402 layout
function describeKeptDataDir(e, n) {
  return `The data directory of ${displayPluginId(e.pluginId)} was kept: ${e.reason === "another-plugin-uses-it" ? `${e.usedBy === void 0 ? "the list of installed plugins could not be read, so another installed plugin may use it" : `${displayPluginId(e.usedBy)} is installed and uses it`}${e.copied ? `; its contents were also copied to ${displayPluginId(n)}` : ""}` : e.reason === "target-had-own" ? `${displayPluginId(n)} already had its own` : "it could not be copied"}`;
}
//@ chunk-pp50kewz.js:37402-37589 layout
function getEnabledValueAtScope(e, n, i) {
  let a = getSettingsForSourceForUpkeep(scopeToSettingSource(e))?.enabledPlugins ?? {},
    o = findPluginName(Object.keys(a), n);
  if (o === void 0 || o === n) return a[n];
  return i !== "unknown" &&
    enabledPluginKeys(
      a,
      n,
      i.filter((u) => u !== n),
    ).includes(o)
    ? a[o]
    : void 0;
}
//@ chunk-pp50kewz.js:37589-37631 layout
function dataDirKey(e) {
  return pluginDataDirPath(e).toLowerCase();
}
/**
 * 卸载后仍残留 local 作用域安装记录时的长说明（列出文件夹、原因与清理命令）。
 */
//@ chunk-pp50kewz.js:37631-42839 layout
function describeLeftLocalRecords({
  shownId: shownId,
  shownNewId: shownNewId,
  folders: folders,
  because: because,
}) {
  {
    let o = new Intl.ListFormat("en", { type: "conjunction" }),
      u = (M, P) => o.format(M.length > 2 ? [...M.slice(0, 2), `${M.length - 2} ${P}`] : M),
      [h] = folders,
      p = folders.length !== 1 || h === void 0,
      r = p
        ? `the folders ${u(folders.map(displayFolderName), "more of this repository")}`
        : describeFolder(h),
      c = `. ${capitalize(shownId)} is still recorded as installed at local scope from ${r}: ${p ? "those records were" : "that record was"} left, because `,
      y = `To remove ${p ? "them" : "it"}`,
      j = p
        ? "start Claude Code in each of those folders and uninstall it there"
        : "start Claude Code in that folder and uninstall it there",
      T = (M) =>
        M.readsBack === "on"
          ? displayFolderName(M.file)
          : describeUnwritableSettingsSource({
              source: "otherFolder",
              file: M.file,
              readsBack: M.readsBack,
              ...(M.notReadBecause !== void 0 && { notReadBecause: M.notReadBecause }),
            }).replace(M.file, () => displayFolderName(M.file));
    if (because.kind === "own-local-line")
      return `${c}its line in local settings (.claude/settings.local.json) is still there although its uninstall was to remove it. ${y}, first take that line out of "enabledPlugins" in that file yourself, then ${j}`;
    if (because.kind === "legacy-local-file") {
      let { file: file } = because,
        P = file.readsBack === "on",
        L = P
          ? 'take it out of "enabledPlugins" in that file yourself'
          : file.readsBack === "unreadable"
            ? "fix that file so that it can be read as settings, and switch the plugin off in it if it is on there"
            : "switch it off in that file if it is on there";
      return `${c}${T(file)} ${P ? "still switches it on" : "may still switch it on"} (it is an older local settings file in the folder this session was started in). ${y}, first ${L}, then ${j}. Until then it ${P ? "can load" : "may still load"} beside ${shownNewId}`;
    }
    let I = because.ofTheLaunchFolder.length > 0,
      w = I && because.ofFolders.length > 0,
      b = w
        ? [...because.ofTheLaunchFolder, ...because.ofFolders]
        : I
          ? because.ofTheLaunchFolder
          : because.ofFolders,
      all = b.every((M) => M.readsBack === "on"),
      all_2 = b.every((M) => M.readsBack !== "on"),
      any = b.some((M) => M.readsBack === "unreadable"),
      se = (M) => (M.readsBack === "not-read-here" ? (M.notReadBecause ?? "not-trusted") : M.readsBack),
      [Ce] = b,
      X = b.length > 1 && Ce !== void 0 && all_2 && b.every((M) => se(M) === se(Ce)) ? se(Ce) : void 0,
      we = all ? "can load" : "may still load",
      J = b.length === 1 ? "that file" : "those files",
      D = b.every((M) => M.file.endsWith(join(".claude", "settings.json")))
        ? ` (that uninstall does not edit ${J})`
        : "",
      ce =
        X === "unreadable"
          ? "they are there and could not be read"
          : X === "network-path"
            ? "not read: they are on a network path or are links to one, or could not be checked"
            : "not read: this workspace is not yet trusted";
    if (w) {
      let M = (B) =>
          X !== void 0 || B.readsBack === "on"
            ? ""
            : `; ${T(B).slice(displayFolderName(B.file).length + 2, -1)}`,
        P = [
          ...because.ofTheLaunchFolder.map(
            (B) => `${displayFolderName(B.file)} (in the folder this session was started in${M(B)})`,
          ),
          ...because.ofFolders.slice(0, 2).map((B) => (X === void 0 ? T(B) : displayFolderName(B.file))),
          ...(because.ofFolders.length > 2 ? [`${because.ofFolders.length - 2} more`] : []),
        ],
        L = all ? "still switch it on" : all_2 ? "may still switch it on" : "still switch it on, or may",
        U = all
          ? "switch it off in each of those files"
          : any
            ? "fix any of those files that cannot be read as settings, and switch it off in each where it is on"
            : "switch it off in each of those files where it is on";
      return `${c}settings files that this session does not read ${L}: ${o.format(P)}${X === void 0 ? "" : ` (${ce})`}. ${y}, first ${U}, then ${j}. Until then it ${we} beside ${shownNewId}`;
    }
    if (!I && p) {
      let M = all ? "still switch it on" : all_2 ? "may still switch it on" : "still switch it on, or may",
        P =
          X === void 0
            ? u(b.map(T), "more")
            : `${u(
                b.map((U) => displayFolderName(U.file)),
                "more",
              )} (${ce})`;
      return `${c}settings files in those folders ${M}: ${P}. ${y}, for each folder first ${`switch it off in its settings file${any ? ", or fix the file if it cannot be read as settings" : all_2 ? " if it is on there" : ""}`}, then start Claude Code in that folder and uninstall it there${D}. Until then it ${we} in those folders beside ${shownNewId}`;
    }
    let format = o.format(X === void 0 ? b.map(T) : b.map((M) => displayFolderName(M.file))),
      k =
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
                  : "still switch it on, or may",
      pe = b.length === 1,
      Ee = all
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
      return `${c}in the folder this session was started in ${format} ${k} (this session reads its settings from another folder, so nothing done from here edits ${J}). ${y}, first ${Ee}, then ${j}. Until then it ${we} beside ${shownNewId}`;
    if (because.sharedCheckout && pe && all)
      return `${c}${format} ${k}. ${y}: if that is this repository's shared settings file, checked out in that folder too, first switch the plugin off in the repository's settings file and update the other checkouts; otherwise first switch it off in that file; then ${j}. Until then it ${we} in that folder beside ${shownNewId}`;
    return `${c}${format} ${k}. ${y}, first ${Ee}, then ${j}${D}. Until then it ${we} in that folder beside ${shownNewId}`;
  }
  return "";
}
//@ chunk-pp50kewz.js:42839-43471 layout
function describeSecretStore(e, n) {
  {
    let i = primarySecureStoreKind();
    return {
      name: quotedPrintable(parsePluginIdentifier(e).name, 120),
      store:
        i === "keychain"
          ? "your keychain (or in the credentials file in your Claude configuration folder)"
          : i === "credential-manager"
            ? "Windows Credential Manager (or in the credentials file in your Claude configuration folder)"
            : "the credentials file in your Claude configuration folder",
      uninstallCommand: runCommandHint("plugin uninstall", e, {
        fallback: `uninstall "${quotedPrintable(e, 200)}" from the command line`,
      }),
      carriedClause: (a) =>
        n === void 0
          ? ""
          : ` (its settings and stored secrets were also carried over to ${n}; ${a} the old copies)`,
    };
  }
  return { name: "", store: "", uninstallCommand: "", carriedClause: () => "" };
}
/**
 * 无安装记录但上次卸载清理未完成时的说明（残留的密钥存储项、数据目录等）。
 */
//@ chunk-pp50kewz.js:43471-45146 layout
function describeUnfinishedCleanup({
  pluginId: pluginId,
  entry: entry,
  carriedTo: carriedTo,
  dataFolder: dataFolder,
}) {
  {
    let {
        name: o,
        store: store,
        uninstallCommand: uninstallCommand,
        carriedClause: carriedClause,
      } = describeSecretStore(pluginId, carriedTo),
      r = `. ${capitalize(displayPluginId(pluginId))} has no install record left, but the clean-up after its last uninstall did not finish${carriedClause("what may be left are")}: `;
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
/**
 * 移除安装记录后清理残留时的说明文本。
 */
//@ chunk-pp50kewz.js:45146-46442 layout
function describeLeftRecordCleanup({
  pluginId: pluginId,
  folder: folder,
  entry: entry,
  carriedTo: carriedTo,
  dataFolder: dataFolder,
}) {
  {
    let {
        name: u,
        store: store,
        uninstallCommand: uninstallCommand,
        carriedClause: carriedClause,
      } = describeSecretStore(pluginId, carriedTo),
      c = `. After Claude Code tried to remove the record of ${displayPluginId(pluginId)} for ${describeFolder(folder)}, the install records could not be read, so it is not known whether that record went or whether the plugin is still installed anywhere, and what the plugin saved was left in place${carriedClause("what is left are")}`;
    if (entry === "held")
      return `${c}. If it is installed nowhere any more, ${uninstallCommand} to remove what it saved and free its name`;
    let y = dataFolder !== "in-use";
    return `${c}: its settings under "pluginConfigs" in your user settings file, ${y ? `its stored secrets in ${store}, and its data folder (${displayFolderName(pluginDataDirPath(pluginId))})` : `and its stored secrets in ${store}`}.${entry === "unreadable" ? ` plugin-directory-bindings.json in the plugins folder could not be used, so "${u}" cannot be installed again until that file can be used.` : ""} If it is installed nowhere any more, no command removes them for this id yet; you can take that entry out yourself; ${y ? "leave the data folder until the install records can be read again, because another installed plugin may use it; " : ""}the stored secrets stay${entry === "none" ? `. Nothing ties "${u}" to the repository it came from, so a plugin installed under that name later could read what is left` : ""}`;
  }
  return "";
}
/**
 * 找出哪些 settings.local.json（本会话目录、其他仓库目录）仍提到该插件，供卸载提示使用。
 */
//@ chunk-pp50kewz.js:46442-47492 layout
async function findLocalSettingsMentions(
  e,
  n,
  { installedOthers: installedOthers, launchFolderToo: launchFolderToo, ownLocalFileToo: ownLocalFileToo },
) {
  {
    let u = { kind: "by-files", ofTheLaunchFolder: [], ofFolders: new Map(), launchProjectFileOn: void 0 },
      h = await scanSettingsForPluginUninstall(
        e,
        installedOthers,
        launchFolderToo === void 0 ? n : [...n, launchFolderToo],
        {
          theSessions: getSettingsFilePathForSource("localSettings"),
          byAFreshWalk: join(getRepoRootOrCwd(), ".claude", "settings.local.json"),
        },
      );
    if (ownLocalFileToo && h.thisLaunchsLocalFile !== void 0)
      return { kind: "own-local-file", readsBack: h.thisLaunchsLocalFile, theSessionsOwn: !0 };
    if (ownLocalFileToo && h.thisLaunchsLocalFileByAFreshWalk !== void 0)
      return { kind: "own-local-file", readsBack: h.thisLaunchsLocalFileByAFreshWalk, theSessionsOwn: !1 };
    if (ownLocalFileToo && h.thisLaunchsLegacyLocalFile !== void 0)
      return { kind: "own-legacy-local-file", file: h.thisLaunchsLegacyLocalFile };
    let p = (r) =>
      (h.byFolder.get(r) ?? []).filter(
        (c) => c.alsoThisLaunchs !== "localSettings" && c.alsoThisLaunchs !== "legacyLocalSettings",
      );
    if (launchFolderToo !== void 0) u.ofTheLaunchFolder = p(launchFolderToo);
    for (let r of n) {
      let c = p(r);
      if (c.length > 0) u.ofFolders.set(r, c);
    }
    return ((u.launchProjectFileOn = h.thisLaunchsProjectFileOn), u);
  }
  return { kind: "by-files", ofTheLaunchFolder: [], ofFolders: new Map(), launchProjectFileOn: void 0 };
}
//@ chunk-pp50kewz.js:47492-47607 layout
function isSameRepoPathMoved(e, n) {
  if (realpathAllowMissing(e)) return !1;
  let i = findGitRootUncached(dirname(e)),
    a = findGitRootUncached(dirname(n));
  return i !== null && a !== null && i !== a && relative(i, e) === relative(a, n);
}
//@ chunk-pp50kewz.js:47607-48061 layout
async function checkDirectoryBindingPersistable(e) {
  {
    let n = await persistDirectoryBinding(e, getInstalledPlugins().plugins[e]);
    return n === "not-persisted"
      ? "plugin-directory-bindings.json in the plugins folder could not be used or written, so nothing would keep the name for the repository it was installed from: once the file can be written, switch again"
      : n === "cannot-hold"
        ? "its id is too long for plugin-directory-bindings.json to hold, so nothing would keep the name for the repository it was installed from"
        : void 0;
  }
  return;
}
//@ chunk-pp50kewz.js:48061-48100 layout
function getRepoRootOrCwd() {
  return getProjectConfigRoot() ?? resolveLocalSettingsStoreRoot(getOriginalCwd(), eA);
}
//@ chunk-pp50kewz.js:48100-48294 layout
function isInstallationForThisRepo(e) {
  {
    let n = getOriginalCwd(),
      projectPath = e.projectPath;
    if (projectPath !== void 0 && projectPath !== n && realpathAllowMissing(projectPath)) return !1;
    if (!isInstallationRelevantToCurrentProject(e)) return !1;
    if (projectPath === void 0 || projectPath === n) return !0;
    let a = eA(n);
    return (
      a !== null &&
      eA(projectPath) === a &&
      resolveLocalSettingsStoreRoot(projectPath, eA) === getRepoRootOrCwd()
    );
  }
  return !1;
}
/**
 * --replace 切换到另一个市场的同名插件之后的收尾：迁移启用状态与插件选项、禁用/卸载旧副本，生成结果说明。
 */
//@ chunk-pp50kewz.js:48294-70928 layout
async function finishReplaceSwitch(
  e,
  n,
  i,
  {
    newCopyWasJustInstalled: newCopyWasJustInstalled,
    newCopyWasOn: newCopyWasOn,
    surface: surface,
    carrySettingsFrom: carrySettingsFrom,
  },
  p,
) {
  {
    let r = displayPluginId(e),
      c =
        i.find((s) => s.pluginId === carrySettingsFrom) ??
        i.find((s) => locatePluginInstall(s.pluginId, void 0, yn()).effective !== !1) ??
        i[0],
      y = displayPluginId(c.pluginId),
      j = new Intl.ListFormat("en", { type: "conjunction" }),
      T = { head: 200, tail: 200 },
      format = j.format(i.map((s) => displayPluginId(s.pluginId))),
      w = i.length > 1,
      b = `${format} ${w ? "are" : "is"} still installed`,
      _e = { fromPluginId: c.pluginId, toPluginId: e, surface: surface, managedNames: af() },
      ee = getInstalledPlugins().plugins[e]?.find(
        (s) => s.scope === n && isInstallationRelevantToCurrentProject(s),
      )?.gitCommitSha,
      W = c.gitCommitSha !== void 0 && ee !== void 0 && c.gitCommitSha !== ee,
      se = locatePluginInstall(c.pluginId, void 0, yn()),
      X = se.effective === !1 && !newCopyWasOn,
      we = async () => {
        let s = findPluginInSettings(e)?.scope,
          _ = se.decidingScope === "project" && n !== "project" ? "local" : se.decidingScope,
          v = _ !== void 0 && (s === void 0 || SCOPE_PRECEDENCE[_] >= SCOPE_PRECEDENCE[s]) ? _ : void 0,
          G = await disablePluginOp(e, v, p).catch(() => ({ success: !1, message: "" }));
        return G.success || G.alreadyInGoalState === !0;
      },
      {
        optionsCarried: optionsCarried,
        secretsCarried: secretsCarried,
        oldDataDirDisposable: oldDataDirDisposable,
        dataDirCopied: dataDirCopied,
        targetHadOwn: targetHadOwn,
        dataDirKeptReason: dataDirKeptReason,
      } = await copyPluginOptions(c.pluginId, e, copyDir, p),
      Ee = dataDirKey(e),
      M = dataDirKey(c.pluginId),
      P,
      L = !1,
      U = (s) => {
        if (!oldDataDirDisposable || M === Ee) return !1;
        let _ = findOtherPluginSharingDataDir(
          c.pluginId,
          s,
          new Set(
            i.flatMap((v) => (v === c || (s.plugins[v.pluginId]?.length ?? 0) === 0 ? [v.pluginId] : [])),
          ),
        );
        return ((P = _.kind === "nobody" ? void 0 : _), _.kind === "nobody");
      },
      B;
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
    let me = [],
      N = (s) =>
        s === "unknown"
          ? s
          : uniq([...s, ...me.flatMap((_) => (_.record === void 0 ? [] : [_.copy.pluginId]))]),
      Z = [],
      S = new Set(),
      he = new Map(),
      re,
      Oe,
      ae = new Set(),
      Ge = new Set(),
      A = listInstalledPluginIds(getInstalledPlugins()),
      Ke =
        B !== void 0
          ? []
          : i.flatMap((s) =>
              ["user", "local"].map((_) => ({
                scope: _,
                id: s.pluginId,
                value: getEnabledValueAtScope(_, s.pluginId, A),
              })),
            ),
      De = (s, _) => {
        let filtered = (getInstalledPlugins().plugins[s.pluginId] ?? []).filter((Pe) => Pe.scope === _),
          found = filtered.find(isInstallationRelevantToCurrentProject),
          oe = getProjectPathForScope(_),
          de =
            oe === void 0
              ? found
              : filtered.find((Pe) => Pe.projectPath === oe && isInstallationRelevantToCurrentProject(Pe)),
          Je = new Set([oe]),
          Me =
            _ !== "local" || de === void 0
              ? []
              : filtered.filter((Pe) => {
                  if (Je.has(Pe.projectPath)) return !1;
                  return (Je.add(Pe.projectPath), isInstallationForThisRepo(Pe));
                });
        return { anyRecordHere: found, launchFolder: oe, record: de, otherFolders: Me };
      },
      flattened = [c, ...i.filter((s) => s !== c)].flatMap((s) =>
        s.scopes.flatMap((scope) => (scope === "managed" ? [] : [{ copy: s, oldScope: scope }])),
      ),
      Le = (s, _) =>
        `it was installed at ${s} scope from the folder ${_}: start Claude Code in that folder and switch there`;
    for (let { copy: copy, oldScope: oldScope } of B !== void 0 ? [] : flattened) {
      let { anyRecordHere: anyRecordHere, record: record } = De(copy, oldScope);
      if (record === void 0 && anyRecordHere?.projectPath) {
        re = { copy: copy, scope: oldScope, message: Le(oldScope, anyRecordHere.projectPath) };
        break;
      }
    }
    let un = new Map(),
      qe = getProjectConfigRoot(),
      fn = qe !== null && resolve(qe) !== resolve(getOriginalCwd()) ? getOriginalCwd() : void 0,
      vn = (s, _) => eVe(s, _).flatMap(([v, G]) => (v !== _ && G.length > 0 ? [v] : []));
    for (let s of B !== void 0 || re !== void 0 ? [] : i) {
      let plugins = getInstalledPlugins().plugins,
        v = s.scopes.includes("local") ? De(s, "local").otherFolders : [],
        flattened = v.flatMap((de) => de.projectPath ?? []),
        oe =
          flattened.length === 0
            ? void 0
            : await findLocalSettingsMentions(s.pluginId, flattened, {
                installedOthers: vn(plugins, s.pluginId),
                launchFolderToo: fn,
                ownLocalFileToo: !1,
              }).catch((de) => errorMessage(de));
      if (typeof oe === "string") {
        re = { copy: s, scope: "local", message: oe };
        break;
      }
      un.set(s, { records: [...(plugins[s.pluginId] ?? [])], otherFolders: v, judged: oe });
    }
    for (let [s, { otherFolders: _ }] of re !== void 0 ? [] : un) {
      let v =
        _.length > 0 && VS(s.pluginId)
          ? await checkDirectoryBindingPersistable(s.pluginId).catch((G) => errorMessage(G))
          : void 0;
      if (v !== void 0) {
        re = { copy: s, scope: "local", message: v };
        break;
      }
    }
    let tn = new Map();
    for (let { copy: copy, oldScope: oldScope } of B !== void 0 || re !== void 0 ? [] : flattened) {
      let { anyRecordHere: anyRecordHere, launchFolder: launchFolder, record: record } = De(copy, oldScope),
        de = Ke.find((Pe) => Pe.id === copy.pluginId && Pe.scope === oldScope)?.value,
        Je = copy === c && U(getInstalledPlugins());
      L ||= Je;
      let Me = await uninstallPluginOp(copy.pluginId, oldScope, Je, p, {
        settingsStillOn: "remove-anyway",
      }).catch((Pe) => ({ success: !1, message: errorMessage(Pe) }));
      if (Me.success) {
        if (
          (me.push({ copy: copy, scope: oldScope, record: record, enabledValue: de }),
          tn.set(copy, record?.installPath),
          Me.directoryNameNote)
        )
          Z.push([copy.pluginId, Me.directoryNameNote]);
        if (Me.optionsRemoved) S.add(copy);
        if (Me.savedKept !== void 0) Ge.add(copy);
        else Ge.delete(copy);
        if (Me.dataFolderUser !== void 0) he.set(copy, Me.dataFolderUser);
        if ((getInstalledPlugins().plugins[copy.pluginId]?.length ?? 0) === 0) ae.add(copy);
      } else {
        let Pe = !getInstalledPlugins().plugins[copy.pluginId]?.some(
            (je) =>
              je.scope === oldScope &&
              (record === void 0 || launchFolder === void 0
                ? isInstallationRelevantToCurrentProject(je)
                : je.projectPath === launchFolder),
          ),
          Ae = Me.failureCode === "not_installed" || Me.failureCode === "not_installed_at_scope";
        if (Ae && (anyRecordHere === void 0 || Pe)) continue;
        if (
          ((re = {
            copy: copy,
            scope: oldScope,
            message:
              Ae && record === void 0 && anyRecordHere?.projectPath
                ? Le(oldScope, anyRecordHere.projectPath)
                : Me.message,
          }),
          record !== void 0 && Pe)
        )
          me.push({ copy: copy, scope: oldScope, enabledValue: de, record: record });
        else if (anyRecordHere !== void 0) Oe = de;
        break;
      }
    }
    if (re !== void 0) {
      let s = getInstalledPlugins(),
        _ = N(listInstalledPluginIds(s)),
        v = (s.plugins[c.pluginId]?.length ?? 0) === 0,
        G = [],
        oe = [],
        de = async (ke, ln, Pn) => {
          try {
            return (
              (
                await updateSettingsForSourceWithTransform(
                  scopeToSettingSource(ke),
                  (In) => ({ enabledPlugins: { ...In?.enabledPlugins, [ln]: Pn } }),
                  void 0,
                  p,
                )
              ).error === null
            );
          } catch {
            return !1;
          }
        },
        Je = (ke, ln) =>
          `the "enabledPlugins" line in ${ke} settings that turned ${displayPluginId(ln)} off there (if you want it off, disable it in /plugin)`,
        Me = new Set(),
        pluginId = re.copy.pluginId,
        Ae = Oe !== void 0 && getEnabledValueAtScope(re.scope, pluginId, _) === void 0 ? Oe : void 0;
      for (let ke of Ke.filter((ln) => ln.value === !1))
        if (getEnabledValueAtScope(ke.scope, ke.id, _) !== !1 && !(await de(ke.scope, ke.id, !1)))
          (Me.add(ke.id), oe.push(Je(ke.scope, ke.id)));
      for (let ke of me) {
        let { record: record, enabledValue: enabledValue } = ke,
          In =
            record !== void 0 &&
            (await addInstalledPlugin(
              ke.copy.pluginId,
              {
                ...record,
                version: record.version ?? "unknown",
                installedAt: record.installedAt ?? new Date().toISOString(),
              },
              ke.scope,
              record.projectPath,
              p,
            ).then(
              () => !0,
              () => !1,
            )),
          It =
            enabledValue === void 0 ||
            enabledValue === !1 ||
            !In ||
            (!Me.has(ke.copy.pluginId) && (await de(ke.scope, ke.copy.pluginId, enabledValue)));
        if (!In) G.push(`${displayPluginId(ke.copy.pluginId)} (${ke.scope} scope)`);
        else if (!It)
          oe.push(
            `the "enabledPlugins" line for ${displayPluginId(ke.copy.pluginId)} in ${ke.scope} settings${Me.has(ke.copy.pluginId) ? " (left out, because the line that turned it off could not be put back; if you want it on, enable it in /plugin)" : ""}`,
          );
      }
      if (Ae !== void 0 && Ae !== !1 && !(!Me.has(pluginId) && (await de(re.scope, pluginId, Ae))))
        oe.push(
          `the "enabledPlugins" line for ${displayPluginId(pluginId)} in ${re.scope} settings${Me.has(pluginId) ? " (left out, because the line that turned it off could not be put back; if you want it on, enable it in /plugin)" : ""}`,
        );
      if (ae.has(c) || (v && me.some((ke) => ke.copy === c))) {
        let ke = await copyPluginOptions(e, c.pluginId, copyDir, p).catch(() => ({
          optionsCarried: !1,
          secretsCarried: !1,
          targetHadOwn: !1,
          dataDirCopied: !1,
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
      ic(p);
      let filtered = i.filter((ke) => ke !== c && ke !== re.copy && ae.has(ke) && !Ge.has(ke)),
        Ne = [...G, ...oe],
        format_2 = j.format(filtered.map((ke) => displayPluginId(ke.pluginId))),
        pn = `they were deleted when ${filtered.length === 1 ? "that plugin was" : "those plugins were"} uninstalled and have to be entered again`,
        mn =
          me.length === 0 && Ne.length === 0
            ? ""
            : Ne.length > 0
              ? ` Could not be put back: ${j.format(Ne)}.${filtered.length > 0 ? ` The settings and stored secrets saved for ${format_2} did not come back either: ${pn}.` : ""}`
              : ` What had been uninstalled was put back${filtered.length > 0 ? `, except the settings and stored secrets saved for ${format_2}: ${pn}` : ""}.`,
        message = re.message,
        Un = printableLabel(
          printableName(
            message.length > 1000
              ? `${truncateToLength(message, 500)} \u2026 ${takeLastChars(message, 500)}`
              : message,
            1100,
          ),
          T,
        ),
        Fn = Un === "" ? "" : ` (${Un})`;
      B = {
        fromPluginId: re.copy.pluginId,
        rollBack: G.length === 0 && newCopyWasJustInstalled,
        rolledBack: `Could not switch: ${displayPluginId(re.copy.pluginId)} could not be uninstalled${Fn}.${mn} ${capitalize(b)} and ${r} was uninstalled again. Plugins that were installed with it as its dependencies, if any, stay installed`,
        bothInstalled: w
          ? `${capitalize(r)} is installed, but ${displayPluginId(re.copy.pluginId)} could not be uninstalled at ${re.scope} scope${Fn}.${mn} Uninstall ${G.length > 0 ? "what is left of them" : format} to finish the switch`
          : `${capitalize(r)} is installed, but ${y} could not be uninstalled at ${re.scope} scope${Fn}.${mn} Both are installed until you uninstall ${y}`,
      };
    }
    if (B !== void 0) {
      logMarketplaceSwitch({
        ..._e,
        fromPluginId: B.fromPluginId,
        result: { outcome: "bad", code: "replace_failed" },
      });
      let s = async (v) => {
        if (!X) return { ok: !1, message: v };
        let G = await we().catch(() => !1);
        return {
          ok: !1,
          message: `${v}. ${G ? `${capitalize(r)} was turned off, as ${y} was` : `${capitalize(y)} was disabled, but ${r} could not be disabled \u2014 disable it in /plugin`}`,
        };
      };
      if (!B.rollBack) return s(B.bothInstalled);
      let _ = await uninstallPluginOp(e, n, !1, p, { settingsStillOn: "remove-anyway" }).catch((v) => ({
        success: !1,
        message: errorMessage(v),
      }));
      if (_.success && dataDirCopied) {
        let v = listInstalledPluginIds(await loadInstalledPlugins(p));
        if (v !== "unknown" && !v.some((G) => dataDirKey(G) === Ee))
          await removeDirectoryTreeNoFollow(pluginDataDirPath(e)).catch((G) => {
            logForDebugging(
              `Switch to ${e}: could not remove the data directory that the switch had copied: ${errorMessage(G)}`,
              { level: "warn" },
            );
          });
      }
      return _.success || _.failureCode === "not_installed"
        ? { ok: !1, message: B.rolledBack }
        : s(B.bothInstalled);
    }
    let K = X && (await we().catch(() => !1)),
      q = [],
      ie = [],
      V = new Set();
    for (let s of Ge)
      (V.add(s.pluginId),
        ie.push(
          `. The settings and stored secrets of ${displayPluginId(s.pluginId)} were left in place because the list of installed plugins could not be read`,
        ));
    if (Ge.size > 0)
      ie.push(`. To delete what was left in place, ${manualCleanupHint(Ge.size === 1 ? "its" : "their")}`);
    let He = async (s) => {
        let _ = dataDirKey(s.pluginId);
        if ([Ee, M].includes(_)) return;
        let v = listInstalledPluginIds(await loadInstalledPlugins(p)),
          G = v === "unknown" ? void 0 : v.find((de) => dataDirKey(de) === _);
        if (v === "unknown" || G !== void 0) {
          if (G !== s.pluginId && (await pathExists(pluginDataDirPath(s.pluginId))))
            ie.push(
              `. The saved data of ${displayPluginId(s.pluginId)} was left in place because ${G === void 0 ? "the list of installed plugins could not be read" : `${displayPluginId(G)} is installed and uses it`}`,
            );
          return;
        }
        if (
          (await deletePluginDataDir(s.pluginId).catch(
            (de) => (
              logForDebugging(
                `Switch to ${e}: could not remove the data directory of ${s.pluginId}: ${errorMessage(de)}`,
                { level: "warn" },
              ),
              "failed"
            ),
          )) === "removed"
        )
          q.push(s.pluginId);
      },
      R = async (s, _, v, G) => {
        let oe = listInstalledPluginIds(v),
          de = dataDirKey(s.pluginId),
          Je =
            s === c
              ? U(v)
              : VS(s.pluginId) &&
                ![Ee, M].includes(de) &&
                oe !== "unknown" &&
                !oe.some((en) => dataDirKey(en) === de),
          { dataDirKept: dataDirKept, directoryBindingKept: directoryBindingKept } =
            await cleanupAfterUninstall({
              pluginId: s.pluginId,
              installPath: _,
              deleteDataDir: Je,
              scope: s.scopes.filter(isInstallableScope).at(-1) ?? n,
              storageV5: p,
              registry: v,
              installedOthers: oe === "unknown" ? [] : vn(v.plugins, s.pluginId),
            }),
          index = Z.findIndex(([en]) => en === s.pluginId);
        if (directoryBindingKept?.installsUnknown === !0 && Q.has(s) && S.has(s)) {
          let en = he.get(s),
            any = i.some((mn) => mn !== s && mn.pluginId === en && (ae.has(mn) || Fe.includes(mn)));
          if (any && index !== -1) Z.splice(index, 1);
          if ((index === -1 || any) && G)
            ie.push(
              `. The saved data of ${displayPluginId(s.pluginId)} was left in place because the list of installed plugins could not be read`,
            );
          return { stillSwitchedOn: !1 };
        }
        let je = directoryReleaseNote(directoryBindingKept),
          Ne = je === "" ? [] : [[s.pluginId, je]];
        if (index === -1) Z.push(...Ne);
        else Z.splice(index, 1, ...Ne);
        if (directoryBindingKept !== void 0 && !directoryBindingKept.optionsGone) V.add(s.pluginId);
        else V.delete(s.pluginId);
        if (
          s !== c &&
          G &&
          !dataDirKept &&
          (directoryBindingKept === void 0 || directoryBindingKept.dataGone)
        )
          q.push(s.pluginId);
        return { stillSwitchedOn: directoryBindingKept?.stillOnIn !== void 0 };
      },
      Q = new Set(ae),
      x = [],
      ue = new Map(),
      fe = new Map(),
      ze = new Map(),
      Se = new Map(),
      Fe = [],
      Ye = new Map(),
      sn = new Map(),
      an = async (s) => {
        let _ = await loadInstalledPlugins(p);
        return listInstalledPluginIds(_) === "unknown" ? s : _;
      },
      Ue = async (s, _, v) => {
        let G = await pathExists(pluginDataDirPath(s.pluginId)),
          oe = await R(s, _, v, G)
            .catch(() => R(s, void 0, v, G))
            .catch(
              (de) => (
                logForDebugging(
                  `Switch to ${e}: could not finish removing what ${s.pluginId} saved: ${errorMessage(de)}`,
                  { level: "warn" },
                ),
                "rejected-twice"
              ),
            );
        if (oe === "rejected-twice") {
          (Fe.push(s), V.add(s.pluginId));
          return;
        }
        if ((ae.add(s), Se.set(s, oe.stillSwitchedOn), s !== c && !VS(s.pluginId))) await He(s);
      };
    for (let s of i) {
      let _ = un.get(s),
        v = _?.judged,
        G = _?.records ?? [],
        oe = ue.get(s) ?? [],
        de;
      if (v?.kind === "by-files" && v.ofTheLaunchFolder.length > 0)
        ((de = "launch-folder-files"), fe.set(s, v.ofTheLaunchFolder));
      let Je = tn.get(s),
        Me;
      for (let Ae of _?.otherFolders ?? []) {
        let projectPath = Ae.projectPath;
        if (projectPath === void 0) continue;
        let Ne = (nn, Hn = [], Yn) => {
            let [Ct] = Hn;
            oe.push({
              folder: projectPath,
              because: nn,
              files: Hn,
              sharedCheckout:
                Yn !== void 0 &&
                Hn.length === 1 &&
                Ct?.readsBack === "on" &&
                isSameRepoPathMoved(Ct.file, Yn),
            });
          },
          en = v?.kind === "by-files" ? v.ofFolders.get(projectPath) : void 0;
        if (en !== void 0 && v?.kind === "by-files") {
          Ne("own-files", en, v.launchProjectFileOn);
          continue;
        }
        if (de !== void 0) {
          Ne(de);
          continue;
        }
        if (Ye.has(s)) {
          Ne("a-failed-read");
          continue;
        }
        let pn = await loadInstalledPlugins(p);
        if (listInstalledPluginIds(pn) === "unknown") {
          Ne("a-failed-read");
          continue;
        }
        Me = pn;
        let mn = pn.plugins[s.pluginId] ?? [];
        if (!mn.some((nn) => nn.scope === "local" && nn.projectPath === projectPath)) continue;
        let rn = await findLocalSettingsMentions(s.pluginId, [projectPath], {
          installedOthers: vn(pn.plugins, s.pluginId),
          launchFolderToo: fn,
          ownLocalFileToo: !0,
        }).catch(() => "threw");
        if (rn === "threw") {
          ((de = "a-failed-read"), Ne("a-failed-read"));
          continue;
        }
        if (rn.kind === "own-local-file") {
          ((de = rn.readsBack === "on" && rn.theSessionsOwn ? "own-local-line" : "own-local-file-unsure"),
            Ne(de));
          continue;
        }
        if (rn.kind === "own-legacy-local-file") {
          ((de = "own-legacy-local-file"), ze.set(s, rn.file), Ne("own-legacy-local-file"));
          continue;
        }
        let Un = rn.ofTheLaunchFolder.length > 0;
        if (Un) ((de = "launch-folder-files"), fe.set(s, rn.ofTheLaunchFolder));
        let Fn = rn.ofFolders.get(projectPath);
        if (Fn !== void 0) {
          Ne("own-files", Fn, rn.launchProjectFileOn);
          continue;
        }
        if (Un) {
          Ne("launch-folder-files");
          continue;
        }
        if (
          VS(s.pluginId) &&
          !mn.filter((nn) => !(nn.scope === "local" && nn.projectPath === projectPath)).some(tVt)
        ) {
          let nn = await persistDirectoryBinding(s.pluginId, [...mn, ...G]).catch(() => "not-persisted");
          if (!(nn === "held" || (nn === "no-key" && !G.some((Yn) => Yn.directoryRepositoryKey)))) {
            Ne("hold-not-proven");
            continue;
          }
        }
        let ke = await removePluginInstallation(s.pluginId, "local", projectPath, p, {
            installPath: Ae.installPath,
            lastUpdated: Ae.lastUpdated,
          }).then(
            (nn) => nn !== !1,
            () => !1,
          ),
          ln = async () => {
            let nn = await loadInstalledPlugins(p);
            return listInstalledPluginIds(nn) === "unknown" ? "unknown" : nn;
          },
          Pn = await ln(),
          In = Pn === "unknown" && ke ? await ln() : Pn;
        if (In === "unknown") {
          if (ke) Ye.set(s, { folder: projectPath, installPath: Ae.installPath });
          else Ne("a-failed-read");
          continue;
        }
        if (
          ((Me = In),
          (In.plugins[s.pluginId] ?? []).some((nn) => nn.scope === "local" && nn.projectPath === projectPath))
        )
          Ne("not-removed");
        else if (ke) (x.push({ copy: s, folder: projectPath }), (Je = Ae.installPath));
      }
      if (oe.length > 0) ue.set(s, oe);
      if ((sn.set(s, Je), ae.has(s) || Ye.has(s))) continue;
      let Pe = await an(x.some((Ae) => Ae.copy === s) ? Me : void 0);
      if (Pe === void 0 || (Pe.plugins[s.pluginId]?.length ?? 0) > 0) continue;
      await Ue(s, Je, Pe);
    }
    let Qe = await loadInstalledPlugins(p),
      ye = listInstalledPluginIds(Qe);
    for (let [s, { folder: _, installPath: v }] of [...Ye]) {
      if (ye === "unknown") continue;
      if (
        (Ye.delete(s),
        (Qe.plugins[s.pluginId] ?? []).some((oe) => oe.scope === "local" && oe.projectPath === _))
      ) {
        ue.set(s, [
          ...(ue.get(s) ?? []),
          { folder: _, because: "not-removed", files: [], sharedCheckout: !1 },
        ]);
        continue;
      }
      (x.push({ copy: s, folder: _ }), sn.set(s, v));
    }
    if (ye !== "unknown") {
      for (let s of i)
        if ((Qe.plugins[s.pluginId]?.length ?? 0) === 0 && !ae.has(s) && !Fe.includes(s)) {
          let _ = (await an(Qe)) ?? Qe;
          if ((_.plugins[s.pluginId]?.length ?? 0) > 0) continue;
          await Ue(s, sn.get(s), _);
        }
    }
    let joined = i
        .map((s) => {
          let flattened = x.flatMap(({ copy: copy, folder: folder }) =>
              copy === s ? [displayFolderName(folder)] : [],
            ),
            v = flattened.length - 2;
          return flattened.length === 0
            ? ""
            : `. Claude Code had also recorded ${displayPluginId(s.pluginId)} as installed from ${j.format(v > 0 ? [...flattened.slice(0, 2), `${v} more ${plural(v, "folder")} of this repository`] : flattened)} (it does so when it is started there); ${flattened.length === 1 ? "that record was" : "those records were"} removed too`;
        })
        .join(""),
      Te = (s) =>
        uniq(
          (Qe.plugins[s.pluginId] ?? []).flatMap((_) =>
            _.scope === "local" && _.projectPath !== void 0 && isInstallationForThisRepo(_)
              ? [_.projectPath]
              : [],
          ),
        ),
      Ze = new Set(["own-local-line", "own-legacy-local-file", "launch-folder-files", "own-files"]),
      Ve = new Map(),
      gn = new Set(),
      joined_2 = i
        .map((s) => {
          let _ = Te(s),
            filtered = (ue.get(s) ?? []).filter(
              ({ folder: folder, because: because }) =>
                Ze.has(because) && (ye === "unknown" || _.includes(folder)),
            );
          Ve.set(
            s,
            filtered.map(({ folder: folder }) => folder),
          );
          let G = (...Ne) =>
              filtered.flatMap(({ folder: folder, because: because }) =>
                Ne.includes(because) ? [folder] : [],
              ),
            oe = ze.get(s),
            flattened = filtered.flatMap(({ because: because, files: files }) =>
              because === "own-files" ? files : [],
            ),
            filtered_2 = filtered.filter(({ because: because }) =>
              ["launch-folder-files", "own-files"].includes(because),
            ),
            Me = filtered_2.length === 0 ? [] : (fe.get(s) ?? []);
          if ([...Me, ...flattened.slice(0, 2)].some((Ne) => Ne.alsoThisLaunchs === "projectSettings"))
            gn.add(s);
          let [Ae] = filtered_2,
            je = (Ne, en) =>
              Ne.length === 0
                ? ""
                : describeLeftLocalRecords({
                    shownId: displayPluginId(s.pluginId),
                    shownNewId: r,
                    folders: Ne,
                    because: en,
                  });
          return [
            je(G("own-local-line"), { kind: "own-local-line" }),
            oe === void 0 ? "" : je(G("own-legacy-local-file"), { kind: "legacy-local-file", file: oe }),
            je(G("launch-folder-files", "own-files"), {
              kind: "files",
              ofTheLaunchFolder: Me,
              ofFolders: flattened,
              sharedCheckout: filtered_2.length === 1 && Ae?.sharedCheckout === !0,
            }),
          ].join("");
        })
        .join(""),
      flattened_2 = i.flatMap((s) => {
        let _ = Ve.get(s) ?? [],
          filtered = (
            ye === "unknown" ? uniq((ue.get(s) ?? []).map(({ folder: folder }) => folder)) : Te(s)
          ).filter((Je) => !_.includes(Je)),
          [G] = filtered;
        if (G === void 0) return [];
        let oe = `. ${capitalize(displayPluginId(s.pluginId))} is still recorded as installed at local scope from`,
          de = filtered.length - 2;
        return [
          {
            scope: "local",
            said:
              filtered.length === 1
                ? `${oe} ${describeFolder(G)}: to remove it, start Claude Code in that folder and uninstall it there`
                : `${oe} the folders ${j.format(de > 0 ? [...filtered.slice(0, 2).map(displayFolderName), `${de} more in which Claude Code was started`] : filtered.map(displayFolderName))}: to remove it, start Claude Code in each of those folders and uninstall it there`,
          },
        ];
      }),
      joined_3 = flattened_2.map((s) => s.said).join(""),
      kn = [],
      _n = new Map(),
      jn = !1;
    for (let s of i) {
      let _ = ye === "unknown" || ye.includes(s.pluginId),
        v = ye === "unknown" ? void 0 : ye.filter((G) => G !== s.pluginId);
      for (let G of SETTING_SOURCES) {
        let oe = getSettingsForSourceForUpkeep(G)?.enabledPlugins ?? {},
          de = findPluginName(Object.keys(oe), s.pluginId),
          Je = de === void 0 ? void 0 : oe[de];
        if (de === void 0 || !mO(Je)) continue;
        if (v !== void 0 && !enabledPluginKeys(oe, s.pluginId, v).includes(de)) continue;
        if (
          !_ &&
          G === "userSettings" &&
          (
            await updateSettingsForSourceWithTransform(
              G,
              (Pe) => {
                let Ae = { ...Pe?.enabledPlugins },
                  je = findPluginName(Object.keys(Ae), s.pluginId);
                if (je === void 0 || v === void 0 || !enabledPluginKeys(Ae, s.pluginId, v).includes(je))
                  return null;
                return ((Ae[je] = void 0), { enabledPlugins: Ae });
              },
              void 0,
              p,
            ).catch(() => ({ error: Error("settings write failed") }))
          ).error === null
        )
          jn = !0;
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
          if (ye === "unknown" && de !== s.pluginId)
            _n.set(
              `${displayPluginId(de)} (${Pe}; it may be another installed plugin's own line${G === "userSettings" ? "" : ": the list of installed plugins could not be read"})`,
              de,
            );
          else if (!(G === "projectSettings" && gn.has(s))) kn.push(`${displayPluginId(s.pluginId)} (${Pe})`);
        }
      }
    }
    if (jn) ic(p);
    for (let s of i) {
      if (Fe.includes(s) || Ye.has(s)) continue;
      if (Q.has(s)) {
        if (s === c) continue;
        if (!VS(s.pluginId)) {
          await He(s);
          continue;
        }
        if ([Ee, M].includes(dataDirKey(s.pluginId))) continue;
      } else if (Se.get(s) !== !0) continue;
      if (!VS(s.pluginId)) continue;
      let _ = await loadInstalledPlugins(p);
      if ((_.plugins[s.pluginId]?.length ?? 0) > 0) continue;
      let v = await pathExists(pluginDataDirPath(s.pluginId));
      await R(s, void 0, _, v).catch((G) => {
        (logForDebugging(
          `Switch to ${e}: could not finish removing what ${s.pluginId} saved: ${errorMessage(G)}`,
          { level: "warn" },
        ),
          V.add(s.pluginId));
      });
    }
    let Mn = P === void 0 ? void 0 : await loadInstalledPlugins(p),
      En =
        Mn === void 0 || (!PF(Mn) && (Mn.plugins[c.pluginId]?.length ?? 0) > 0)
          ? void 0
          : findOtherPluginSharingDataDir(c.pluginId, Mn);
    if (En?.kind === "nobody" && dataDirCopied && !VS(c.pluginId)) {
      if ((await deletePluginDataDir(c.pluginId).catch(() => "failed")) === "failed")
        logForDebugging(`Switch to ${e}: could not remove the data directory of ${c.pluginId}`, {
          level: "warn",
        });
    }
    let ut =
        En === void 0 || En.kind === "nobody"
          ? void 0
          : { usedBy: En.kind === "plugin" ? En.pluginId : void 0 },
      di = !X
        ? ""
        : K
          ? " (it stays disabled, as before)"
          : ` (it was disabled before, but ${r} could not be disabled \u2014 disable it in /plugin)`,
      ft = !c.scopes.some((scope) => scope === n),
      ci = ft || c.scopes.some((scope) => scope !== n) ? ` (was ${c.scopes.join(" and ")} scope)` : "",
      qn = oldDataDirDisposable
        ? ut !== void 0 && (await pathExists(pluginDataDirPath(c.pluginId)))
          ? {
              pluginId: c.pluginId,
              reason: "another-plugin-uses-it",
              usedBy: ut.usedBy,
              copied: dataDirCopied,
            }
          : void 0
        : {
            pluginId: c.pluginId,
            reason: dataDirKeptReason === "target-had-own" ? "target-had-own" : "copy-failed",
          },
      ui = qn === void 0 ? "" : `. ${describeKeptDataDir(qn, e)}`,
      zn = {
        scopeChanged: ft,
        stayedDisabled: K,
        dataDirCarried: dataDirCopied,
        pinChanged: W,
        replacedCount: i.length,
        isPrimary: !0,
      };
    logMarketplaceSwitch({
      ..._e,
      result:
        X && !K
          ? { ...zn, outcome: "sad", code: "disable_failed" }
          : !oldDataDirDisposable
            ? { ...zn, outcome: "sad", code: "data_dir_kept" }
            : { ...zn, outcome: "ok" },
    });
    for (let s of i) {
      if (s === c) continue;
      logMarketplaceSwitch({
        ..._e,
        fromPluginId: s.pluginId,
        result: {
          outcome: "ok",
          scopeChanged: !s.scopes.some((scope) => scope === n),
          stayedDisabled: !1,
          dataDirCarried: !1,
          pinChanged: s.gitCommitSha !== void 0 && ee !== void 0 && s.gitCommitSha !== ee,
          replacedCount: i.length,
          isPrimary: !1,
        },
      });
    }
    let mapped = i
        .filter((s) => ae.has(s) && (targetHadOwn || s !== c) && !V.has(s.pluginId))
        .map((s) => s.pluginId),
      filtered = mapped.filter((s) => q.includes(s)),
      filtered_2 = mapped.filter((s) => !q.includes(s)),
      filtered_3 = q.filter((s) => !mapped.includes(s)),
      ht = [
        ...(filtered.length > 0
          ? [`the settings and saved data for ${j.format(filtered.map(displayPluginId))}`]
          : []),
        ...(filtered_2.length > 0
          ? [`the settings saved for ${j.format(filtered_2.map(displayPluginId))}`]
          : []),
        ...(filtered_3.length > 0 ? [`the saved data of ${j.format(filtered_3.map(displayPluginId))}`] : []),
      ],
      yt = ht.length === 0 ? "" : `, and ${j.format(ht)} were removed`,
      fi = targetHadOwn
        ? `${r} kept its own settings${yt}`
        : w
          ? `your plugin settings carried over from ${y}${yt}`
          : "your plugin settings carried over",
      joined_4 = Z.map(([s, _]) => `. About ${displayPluginId(s)}: ${_.replace(/\.$/, "")}`).join(""),
      wt = async (s) => {
        let _ = dataDirKey(s.pluginId),
          v =
            s === c
              ? !(oldDataDirDisposable && M !== Ee) || (Mn !== void 0 && En?.kind !== "nobody")
              : [Ee, M].includes(_);
        return {
          pluginId: s.pluginId,
          entry: VS(s.pluginId)
            ? await releaseDirectoryBinding_2(s.pluginId, !1).catch(() => "unreadable")
            : void 0,
          carriedTo: s === c && !targetHadOwn ? r : void 0,
          knownInUse: v,
          mayGo: !v && ye !== "unknown" && !ye.some((G) => dataDirKey(G) === _),
        };
      },
      joined_5 = (
        await Promise.all(
          i
            .filter((s) => Fe.includes(s))
            .map(async (s) => {
              let { mayGo: mayGo, knownInUse: knownInUse, ...G } = await wt(s);
              return describeUnfinishedCleanup({
                ...G,
                dataFolder: mayGo ? "may-go" : !knownInUse && ye === "unknown" ? "not-known" : "in-use",
              });
            }),
        )
      ).join(""),
      joined_6 = (
        await Promise.all(
          i.flatMap((s) => {
            let _ = Ye.get(s)?.folder;
            return _ === void 0
              ? []
              : [
                  wt(s).then(({ mayGo: mayGo, knownInUse: knownInUse, ...oe }) =>
                    describeLeftRecordCleanup({
                      ...oe,
                      folder: _,
                      dataFolder: knownInUse ? "in-use" : "not-known",
                    }),
                  ),
                ];
          }),
        )
      ).join(""),
      mi =
        kn.length === 0
          ? ""
          : `. Still listed under "enabledPlugins": ${j.format(kn)}. Until ${kn.length === 1 ? "that line is" : "those lines are"} removed, an old copy can load again beside ${r} or show as enabled but not installed`,
      [Pt] = [..._n.values()],
      hi =
        Pt === void 0
          ? ""
          : `. Still listed under "enabledPlugins": ${j.format([..._n.keys()])}. ${_n.size === 1 ? `If ${displayPluginId(Pt)} does not name a plugin you have installed, that line should be removed` : "Any of these that does not name a plugin you have installed should be removed"}: until then an old copy can load again beside ${r} or show as enabled but not installed`;
    return {
      ok: !0,
      note: `. Switched from ${format}; ${fi}${di}${ci}${joined}${ui}${ie.join("")}${joined_4}${joined_5}${joined_6}${mi}${hi}${joined_2}${joined_3}`,
      stayedDisabled: K,
      keptOwnSettings: targetHadOwn,
      settingsRemovedFrom: mapped,
      ...(Ge.size > 0 && { settingsLeftInPlace: [...Ge].map((s) => s.pluginId) }),
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
  return { ok: !1, message: "" };
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
function appendRefreshWarning(
  { refreshWarning: refreshWarning, directoryRefreshFailed: directoryRefreshFailed },
  i,
) {
  return refreshWarning === void 0
    ? i
    : directoryRefreshFailed
      ? `${i} Warning: ${directoryUnreachableMessage()}.`
      : `${i} Warning: ${refreshWarning} \u2014 version shown may be stale.`;
}
//@ chunk-pp50kewz.js:71275-71493 layout
function upToDateMessage(e, n) {
  return e.directoryNotChecked
    ? `${e.pluginName} was not checked for updates: the ${OFFICIAL_MARKETPLACE_DISPLAY} isn't available in this session (installed: ${n})`
    : appendRefreshWarning(e, `${e.pluginName} is already at the latest version (${n}).`);
}
/**
 * 卸载插件：从指定作用域的安装记录与 enabledPlugins 中移除，最后一个安装被移除时删除版本缓存、插件数据目录（可保留）与密钥存储里的 userConfig 敏感值；托管插件拒绝。
 */
//@ chunk-pp50kewz.js:71493-77525 fingerprint = uninstallPluginOp (0.405)
async function uninstallPluginOp(
  pluginId,
  scope = "user",
  deleteDataDir = !0,
  storageV5,
  { settingsStillOn: o = "refuse" } = {},
) {
  (assertInstallableScope(scope), (pluginId = normalizePluginId(pluginId)));
  let u = pluginOperationRefusal(pluginId, parsePluginId(pluginId).marketplace, "uninstall");
  if (u !== void 0)
    return {
      success: !1,
      message: u,
      failureCode: unmanageablePluginReason(pluginId, parsePluginId(pluginId).marketplace),
    };
  let h = await getInstalledListRefusal(storageV5);
  if (h !== void 0)
    return {
      success: !1,
      message: `Plugin "${quotedPrintable(pluginId)}" was not uninstalled: ${readInstalledPluginsFile(h)}`,
      failureCode: "install_records_unreadable",
    };
  let { enabled: enabled, disabled: disabled } = await loadAllPlugins(storageV5),
    allPlugins = [...enabled, ...disabled],
    foundPlugin = findPluginByIdentifier(pluginId, allPlugins),
    settingSource = scopeToSettingSource(scope),
    settings = getSettingsForSourceForUpkeep(settingSource),
    I,
    w,
    b = getInstalledPlugins(),
    keys = Object.keys(b.plugins),
    ee = getProjectPathForScope(scope);
  if (foundPlugin) {
    let keys_2 = Object.keys(settings?.enabledPlugins ?? {}),
      lower = foundPlugin.name.toLowerCase(),
      included = pluginId.includes("@"),
      N = [
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
      ],
      Z = included && (b.plugins[pluginId] ?? []).length > 0,
      S = (he) => b.plugins[findPluginName(keys, he) ?? he] ?? [];
    ((I = Z
      ? pluginId
      : (N.find((he) => S(he).some((re) => re.scope === scope && re.projectPath === ee)) ??
        N.find((he) => S(he).some((re) => isSameInstallScope(re, scope, ee))) ??
        N[0])),
      (w = foundPlugin.name));
  } else {
    let U = resolveInstalledPluginId(pluginId, scope, ee);
    if (!U) {
      let B = await uninstallLeftoverOfficialName(pluginId, scope, deleteDataDir, storageV5);
      if (B !== void 0) return B;
      return {
        success: !1,
        message: `Plugin "${pluginId}" not found in installed plugins`,
        failureCode: "not_installed",
      };
    }
    ((I = U.pluginId), (w = U.pluginName));
  }
  I = findPluginName(keys, I) ?? I;
  let W = b.plugins[I],
    se = qP(W, scope, ee);
  if (!se) {
    let { scope: actualScope } = getPluginInstallationFromV2(I);
    if (actualScope !== scope && W && W.length > 0) {
      if (actualScope === "project" && isPluginEnabledAtProjectScope(I)) {
        let B = claudeCommand("plugin disable", pluginId, "--scope local"),
          me =
            managedPluginRefusal(I)?.message ??
            `To disable just for you${B ? `: ${B}` : ", use claude plugin disable with --scope local"}`;
        return {
          success: !1,
          message: `Plugin "${pluginId}" is enabled at project scope (.claude/settings.json, shared with your team). ${me}`,
          failureCode: "enabled_at_project_scope",
          installedScope: actualScope,
        };
      }
      return {
        success: !1,
        message: `Plugin "${pluginId}" is installed in ${actualScope} scope, not ${scope}. Use --scope ${actualScope} to uninstall.`,
        failureCode: "not_installed_at_scope",
        installedScope: actualScope,
      };
    }
    if ((W?.length ?? 0) === 0) {
      let B = await uninstallLeftoverOfficialName(pluginId, scope, deleteDataDir, storageV5);
      if (B !== void 0) return B;
    }
    return {
      success: !1,
      message: `Plugin "${pluginId}" is not installed in ${scope} scope. Use --scope to specify the correct scope.`,
      failureCode: "not_installed_at_scope",
    };
  }
  let installPath = se.installPath,
    flattened = Object.entries(b.plugins).flatMap(([U, B]) =>
      U !== I && pluginNamesEqual(U, I) && B.length > 0 ? [U] : [],
    );
  if (
    ((flattened = uniq([
      ...flattened,
      ...eVe(b.plugins, I).flatMap(([U, B]) => (U !== I && B.length > 0 ? [U] : [])),
    ])),
    VS(I) && $wt(settingSource))
  )
    return {
      success: !1,
      message: `"${quotedPrintable(w)}" was not uninstalled: this workspace is not yet trusted, so its settings files are not read, and the change could not be checked afterwards. Nothing was changed. Trust the workspace, start Claude Code again, then uninstall it again.`,
      failureCode: "settings_write_failed",
      pluginId: I,
      scope: scope,
    };
  let we = (U, B, me) => ({
    success: !1,
    message: describeSettingsWriteNotRead(w, "network-path", U.notRead[0], B, settingSource, U.why, me),
    failureCode: "settings_still_on",
    pluginId: I,
    scope: scope,
  });
  if (VS(I) && settingSource !== "userSettings") {
    let U = await findEnablingSettingsFile(settingSource, I, flattened);
    if ("notRead" in U) return we(U, void 0, "nothing-was-changed");
  }
  let { error: error } = await updateSettingsForSourceWithTransform(
    settingSource,
    (U) => {
      if (enabledPluginKeys(U?.enabledPlugins ?? {}, I).length === 0) return null;
      let newEnabledPlugins = { ...U?.enabledPlugins },
        me = findPluginName(Object.keys(newEnabledPlugins), I) ?? I;
      if (me === I || !flattened.some((N) => pluginNamesEqual(N, me))) newEnabledPlugins[me] = void 0;
      for (let N of enabledPluginKeys(newEnabledPlugins, I, flattened)) newEnabledPlugins[N] = void 0;
      return { enabledPlugins: newEnabledPlugins };
    },
    void 0,
    storageV5,
  );
  if ((ic(storageV5), VS(I))) {
    let U = await findEnablingSettingsFile(settingSource, I, flattened);
    if ("notRead" in U) return we(U, error, "change-may-be-made");
    let { readsBack: readsBack, file: file } = U;
    if (readsBack !== "off") {
      let N = quotedPrintable(w),
        Z = file ?? "that settings file",
        S = error ? `, and the settings change failed (${error.message})` : "";
      return {
        success: !1,
        message:
          readsBack !== "on"
            ? `"${N}" was not uninstalled: ${Z} is there and could not be read, so it may still switch "${N}" on${S}. It is still installed. Once that file can be read and saved, uninstall it again.`
            : error
              ? `"${N}" was not uninstalled: it is still switched on in ${Z}${S}. It is still installed. Once that file can be saved, uninstall it again.`
              : `"${N}" was not uninstalled: it is still switched on in ${Z}, although the settings change reported no error. It is still installed. Take it out of "enabledPlugins" in that file yourself, then uninstall it again.`,
        failureCode: "settings_write_failed",
        pluginId: I,
        scope: scope,
      };
    }
  }
  let D = !1;
  D = VS(I);
  let ce;
  if (!D && o === "refuse") {
    let U = await findEnablingSettingsFile(settingSource, I, flattened);
    if ("notRead" in U) return we(U, error);
    let { readsBack: readsBack, file: file } = U;
    if (
      readsBack === "unreadable" &&
      file !== void 0 &&
      file === getLegacyLocalSettingsFilePath() &&
      (await formatFileSize(file))
    )
      ce = `${file} (an older local settings file) is not JSON, so it was not checked: as it is, Claude Code ignores it and it switches nothing on. If you repair it, take "${quotedPrintable(w)}" out of its "enabledPlugins" if it is there.`;
    else if (readsBack === "on" || readsBack === "unreadable" || (readsBack === "not-read-here" && error))
      return {
        success: !1,
        message: describeSettingsWriteNotRead(w, readsBack, file, error, settingSource),
        failureCode: "settings_still_on",
        pluginId: I,
        scope: scope,
      };
  }
  if (VS(I)) {
    let U =
        (isStorageV5Enabled() && storageV5 !== void 0
          ? await loadInstalledPlugins(storageV5)
          : loadInstalledPluginsSync()
        ).plugins[I] ?? [],
      B = findMatchingInstallations(U, scope, ee);
    if (!U.filter((N) => !B.includes(N)).some(tVt)) {
      if ((await persistDirectoryBinding(I, [...U, ...(W ?? [])])) === "not-persisted")
        return {
          success: !1,
          message: `"${quotedPrintable(w)}" was switched off at ${scope} scope but not uninstalled, and nothing it saved was removed: plugin-directory-bindings.json in the plugins folder could not be used or written (unreadable, a symbolic link or not a file, over 1 MB, damaged, written by a newer Claude Code, or not writable), so nothing would keep the name for the repository it was installed from. Once the file can be written, uninstall it again.`,
          failureCode: "directory_binding_unreadable",
          pluginId: I,
          scope: scope,
        };
    } else await Rrt(I, W);
  }
  await removePluginInstallation(I, scope, ee, storageV5);
  let {
      dataDirKept: dataDirKept,
      directoryBindingKept: directoryBindingKept,
      optionsRemoved: optionsRemoved,
      savedKept: savedKept,
    } = await cleanupAfterUninstall({
      pluginId: I,
      installPath: installPath,
      deleteDataDir: deleteDataDir,
      scope: scope,
      storageV5: storageV5,
      registry: getInstalledPlugins(),
      installedOthers: flattened,
    }),
    reverseDependents = findReverseDependentNames(I, allPlugins),
    depWarn = formatReverseDependentsSuffix(reverseDependents),
    L = savedKept === void 0 ? void 0 : keptSavedDataMessage(w, deleteDataDir);
  return {
    success: !0,
    message: `Successfully uninstalled plugin: ${w} (scope: ${scope})${depWarn}${directoryBindingKept === void 0 ? "" : `. ${directoryReleaseNote(directoryBindingKept)}`}${L === void 0 ? "" : `. ${L}`}${ce === void 0 ? "" : `${L === void 0 ? "." : ""} ${ce}`}`,
    pluginId: I,
    pluginName: w,
    scope: scope,
    ...(savedKept !== void 0 && L !== void 0 && { savedKept: { reason: savedKept, note: L } }),
    ...(ce !== void 0 && { olderLocalSettingsSkippedNote: ce }),
    dataDirKept: dataDirKept || directoryBindingKept?.dataLeftInPlace === !0,
    ...(directoryBindingKept !== void 0 && { directoryNameNote: directoryReleaseNote(directoryBindingKept) }),
    ...(optionsRemoved && { optionsRemoved: !0 }),
    ...(directoryBindingKept?.liveHolder !== void 0 &&
      directoryBindingKept.liveHolder !== I && { dataFolderUser: directoryBindingKept.liveHolder }),
    reverseDependents: reverseDependents.length > 0 ? reverseDependents : void 0,
  };
}
/**
 * 设置文件写入了但本会话读不到（网络路径或未被读取）时的提示文本。
 */
//@ chunk-pp50kewz.js:77525-79169 layout
function describeSettingsWriteNotRead(e, n, i, a, o, u, h) {
  let p = quotedPrintable(e),
    r = i ?? "that settings file",
    c = a ? `, and the settings change failed (${a.message})` : "";
  if (n === "network-path" || n === "not-read-here") {
    let y = describeUnwritableSettingsSource({
        source: o,
        file: r,
        readsBack: "not-read-here",
        ...(n === "network-path" && { notReadBecause: n }),
      }),
      j =
        n === "not-read-here"
          ? "Once that file can be saved, uninstall it again."
          : u === "vet-network" || u === "suspect-link" || u === "crossing"
            ? `If that file, its ".claude" folder or a folder above them is a link to another machine, replace the link with a real file or folder, or start Claude Code from the folder's real location. Then uninstall it again.`
            : "Try uninstalling it again: if the path to that file changed during the check, that will work. If you see this again, the path cannot be checked, and trying again will not help.",
      T =
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
    let n = await readRepoSettingsBytes(sizeInBytes);
    if (n.kind !== "bytes" || n.content.trim() === "") return !1;
    try {
      return (jsonParse(Wo(n.content)), !1);
    } catch {
      return !0;
    }
  } catch {
    return !1;
  }
}
//@ chunk-pp50kewz.js:79329-79482 layout
function manualCleanupHint(e) {
  return `take ${e} entries out of "pluginConfigs" in your user settings file and out of "pluginSecrets" in your credentials store yourself`;
}
/**
 * 卸载后安装列表无法重新读取时的说明：插件保存的选项、密钥、用量记录（及数据目录）被保留，并告诉用户如何删除。
 */
//@ chunk-pp50kewz.js:79482-79983 layout
function keptSavedDataMessage(pluginId, hadDataDir) {
  let quotedId = `"${quotedPrintable(pluginId)}"`;
  return `What ${quotedId} saved was kept (its options, its secrets${hadDataDir ? ", its usage record and its data folder" : " and its usage record"}): the list of installed plugins could not be read again, so ${quotedId} may still be installed at another scope. If it is installed again, it will use what was kept without asking. To delete what was kept, uninstall ${quotedId} again; if that says it is not installed, install it and then uninstall it; if it can no longer be installed, ${manualCleanupHint("its")}.`;
}
/**
 * 卸载最后一条安装记录后的清理：官方市场插件检查同目录的兄弟安装，必要时把版本目录标记为孤儿，清理已删除记录的缓存，在最后一个作用域被卸载时释放目录名绑定、删除选项/密钥与数据目录。
 */
//@ chunk-pp50kewz.js:79983-80981 layout
async function cleanupAfterUninstall({
  pluginId: pluginId,
  installPath: installPath,
  deleteDataDir: deleteDataDir,
  scope: scope,
  storageV5: storageV5,
  registry: registry,
  installedOthers: installedOthers,
}) {
  let records = registry.plugins[pluginId],
    lastRecord = !records || records.length === 0,
    officialSiblings = [],
    installsUnknown = !1;
  {
    let w = parsePluginIdentifier(pluginId);
    if (
      w.marketplace !== void 0 &&
      (w.marketplace === OFFICIAL_MARKETPLACE_NAME || isOfficialMarketplaceSpelling(w.marketplace))
    ) {
      if (((installsUnknown = listInstalledPluginIds(registry) === "unknown"), installsUnknown))
        logForDebugging(
          `installed_plugins.json could not be read, so the version folder of ${pluginId} was kept`,
        );
      officialSiblings = findDataDirSharers(pluginId, registry).flatMap((b) => registry.plugins[b] ?? []);
    }
  }
  let readBack = !1;
  if (((readBack = VS(pluginId)), !readBack && listInstalledPluginIds(registry) === "unknown"))
    return (
      logForDebugging(
        `installed_plugins.json could not be read again after an install record of ${pluginId} was removed, so what it saved was kept`,
        { level: "warn" },
      ),
      {
        dataDirKept: !0,
        directoryBindingKept: void 0,
        optionsRemoved: !1,
        savedKept: "install_records_unreadable",
      }
    );
  if (
    lastRecord &&
    installPath &&
    !installsUnknown &&
    !officialSiblings.some((w) => {
      let b = f5t(w.installPath);
      return b !== void 0 && b === f5t(installPath);
    })
  )
    await markPluginVersionOrphaned(installPath, storageV5);
  if (!lastRecord) await Rrt(pluginId, records);
  let dataDirKept = !deleteDataDir || QJn(pluginId, registry),
    bindingResult = lastRecord
      ? await releaseDirectoryBinding(
          pluginId,
          !dataDirKept,
          VS(pluginId)
            ? listInstalledPluginIds(
                isStorageV5Enabled() && storageV5 !== void 0
                  ? await loadInstalledPlugins(storageV5)
                  : loadInstalledPluginsSync(),
              )
            : [],
          storageV5,
          scope,
          installedOthers,
        )
      : void 0;
  return {
    dataDirKept: dataDirKept,
    directoryBindingKept: bindingResult,
    optionsRemoved: lastRecord && VS(pluginId) && (bindingResult === void 0 || bindingResult.optionsGone),
  };
}
/**
 * 为卸载的插件执行目录名释放计划：仍在某处启用时返回 stillOn 细节，未完全删除选项/数据或存在占用者时返回说明结构，全部清理完毕时返回 undefined。
 */
//@ chunk-pp50kewz.js:80981-81955 layout
async function releaseDirectoryBinding(
  pluginId,
  deleteDataDir,
  installedIds,
  storageV5,
  scope,
  installedOthers = [],
) {
  let {
    plan: plan,
    stillOn: stillOn,
    optionsGone: optionsGone,
    dataGone: dataGone,
    optionsNotGoneBecause: optionsNotGoneBecause,
    liveHolder: liveHolder,
    installsUnknown: installsUnknown,
    entry: entry,
  } = await planUninstallCleanup(pluginId, {
    deleteDataDir: deleteDataDir,
    installedIds: installedIds,
    installedOthers: installedOthers,
    storageV5: storageV5,
  });
  if (
    (removePluginUsage([pluginId], storageV5), plan.kind === "nothing" && plan.reason === "still-switched-on")
  )
    return {
      pluginId: pluginId,
      optionsGone: !1,
      optionsNotGoneBecause: [],
      dataGone: !1,
      dataKeptOnRequest: !deleteDataDir,
      stillOnIn: getProjectPathForScope_2(stillOn, scope),
      stillOnUnsure: stillOn.some((w) => w.readsBack !== "on"),
      stillOnNotReadHere: stillOn.some((w) => w.readsBack === "not-read-here" && w.notReadBecause === void 0),
      ...(stillOn.some((w) => w.notReadBecause === "network-path") && { stillOnNotReadForItsPath: stillOn }),
      stillOnProjectFile:
        scope !== "project" && stillOn.some((w) => w.source === "projectSettings" && w.readsBack === "on"),
      dataLeftInPlace: !0,
      entry: entry,
    };
  if (
    entry !== "none" ||
    liveHolder !== void 0 ||
    (VS(pluginId) && (!optionsGone || (deleteDataDir && !dataGone)))
  )
    return {
      pluginId: pluginId,
      optionsGone: optionsGone,
      optionsNotGoneBecause: optionsNotGoneBecause,
      dataGone: dataGone,
      dataKeptOnRequest: !deleteDataDir,
      ...(liveHolder !== void 0 && { liveHolder: liveHolder }),
      ...(installsUnknown && { installsUnknown: installsUnknown }),
      dataLeftInPlace: liveHolder !== void 0 || installsUnknown === !0,
      entry: entry,
    };
  return;
}
//@ chunk-pp50kewz.js:81955-82112 file-local
function getProjectPathForScope_2(e, n) {
  return e.map((i) =>
    i.readsBack !== "on"
      ? describeUnwritableSettingsSource(i)
      : i.source === "projectSettings" && n !== "project"
        ? `${i.file} (the project's shared settings)`
        : describeUnwritableSettingsSource(i),
  );
}
/**
 * 卸载一个已无安装记录、但目录名仍被绑定的官方市场插件：先从可写的设置里移除 enabledPlugins 中的同名项，确认没有其他地方启用、也没有新安装记录后，释放目录绑定并返回结果说明。
 */
//@ chunk-pp50kewz.js:82112-85070 layout
async function uninstallLeftoverOfficialName(pluginId, scope, deleteDataDir, storageV5) {
  {
    let { name: o, marketplace: marketplace } = parsePluginIdentifier(pluginId),
      h = quotedPrintable(o, 120);
    if (marketplace !== OFFICIAL_MARKETPLACE_NAME) return;
    let p = await lpe();
    if (xSe(p)) return;
    let r = `${o}@${marketplace}`,
      y = findBindingKeysFor(p.keys(), r)[0];
    if (y === void 0) return;
    let j =
      isStorageV5Enabled() && storageV5 !== void 0
        ? await loadInstalledPlugins(storageV5)
        : loadInstalledPluginsSync();
    if (PF(j)) return;
    let T = eVe(j.plugins, r).find(([, ee]) => ee.length > 0)?.[0];
    if (T === r) return;
    if (T !== void 0)
      return {
        success: !1,
        message: `"${h}" is not installed. "${quotedPrintable(T, 200)}" is, and it uses the same data folder, so nothing was removed. To free the name, ${runCommandHint("plugin uninstall", T, { fallback: `uninstall "${quotedPrintable(T, 200)}" from the command line` })}.`,
        failureCode: "directory_name_held",
        pluginId: r,
        scope: scope,
      };
    let I = (ee) => enabledPluginKeys(ee, y),
      w = [];
    try {
      for (let W of ["userSettings", "localSettings", ...(scope === "project" ? ["projectSettings"] : [])]) {
        let se = await findEnablingSettingsFile(W, y);
        if ("notRead" in se || se.readsBack !== "on") continue;
        let { error: error } = await updateSettingsForSourceWithTransform(
            W,
            (we) => ({
              enabledPlugins: {
                ...we?.enabledPlugins,
                ...Object.fromEntries(I(we?.enabledPlugins).map((J) => [J, void 0])),
              },
            }),
            void 0,
            storageV5,
          ),
          X = getSettingsFilePathForSource(W) ?? `your ${getSettingSourceDisplayNameLowercase(W)}`;
        if (error)
          return {
            success: !1,
            message: `"${h}" could not be removed from the enabled plugins in ${X} (${error.message})${w.length > 0 ? `; it was removed from them in ${w.join(" and ")}` : ""}. Nothing it saved was removed, so "${h}" can still only be installed from the same repository. Once ${X} can be saved, uninstall it again.`,
            failureCode: "settings_write_failed",
            pluginId: y,
            scope: scope,
          };
        w.push(X);
      }
      let ee = await listUninstallSettingsFiles(y);
      if (ee.length > 0) {
        let any = ee.some((Ce) => Ce.readsBack !== "on"),
          se =
            scope !== "project" && ee.some((Ce) => Ce.source === "projectSettings" && Ce.readsBack === "on")
              ? "To remove it there, uninstall it again with --scope project"
              : ee.some((Ce) => Ce.readsBack === "not-read-here" && Ce.notReadBecause === void 0)
                ? "Once this workspace is trusted and Claude Code has been started again, uninstall it again"
                : (networkPathRetryHint(ee, "uninstall it again") ??
                  "Once it is switched off there, uninstall it again");
        return {
          success: !1,
          message: `"${h}" is still switched on${any ? ", or may be," : ""} in ${getProjectPathForScope_2(ee, scope).join(" and ")}${w.length > 0 ? `; it was removed from the enabled plugins in ${w.join(" and ")}` : ""}. Nothing it saved was removed, so "${h}" can still only be installed from the same repository. ${se}.`,
          failureCode: "directory_name_held",
          pluginId: y,
          scope: scope,
        };
      }
    } finally {
      ic(storageV5);
    }
    let b =
      isStorageV5Enabled() && storageV5 !== void 0
        ? await loadInstalledPlugins(storageV5)
        : loadInstalledPluginsSync();
    if (PF(b) || eVe(b.plugins, r).some(([, ee]) => ee.length > 0))
      return {
        success: !1,
        message: `"${h}" was not removed: an install record for it appeared while it was being switched off, or the install records could no longer be read. Nothing it saved was removed. Run the uninstall again.`,
        failureCode: "directory_name_held",
        pluginId: y,
        scope: scope,
      };
    let _e = await releaseDirectoryBinding(y, deleteDataDir, listInstalledPluginIds(b), storageV5, scope);
    return {
      success: !0,
      message: `"${h}" was no longer installed.${w.length > 0 ? ` Removed it from the enabled plugins in ${w.join(" and ")}.` : ""} ${_e === void 0 ? `Removed anything still saved under its name (${deleteDataDir ? "options, secrets, data" : "options, secrets"}).` : directoryReleaseNote(_e)}`,
      pluginId: y,
      pluginName: o,
      scope: scope,
      dataDirKept: !deleteDataDir || _e?.dataLeftInPlace === !0,
      directoryNameNote: _e && directoryReleaseNote(_e),
    };
  }
  return;
}
/**
 * 列出删除插件保存的选项/密钥前用户需要先做的事：解锁钥匙串、修复不可读或不可写的设置文件与凭据存储等。
 */
//@ chunk-pp50kewz.js:85070-86368 layout
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
      ],
      a = [
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
/**
 * 根据目录释放结果生成给用户的说明：仍启用的位置、安装列表不可读、存在占用者、绑定文件不可用，以及选项/密钥/数据目录未删除时的处理建议与重新卸载命令。
 */
//@ chunk-pp50kewz.js:86368-89406 layout
function directoryReleaseNote(result) {
  {
    if (result === void 0) return "";
    let n = quotedPrintable(parsePluginIdentifier(result.pluginId).name, 120),
      i = pluginDataDirPath(result.pluginId),
      a = "Its saved options and secrets could not be deleted",
      o = result.entry === "held" ? `, and "${n}" can still only be installed from the same repository` : "",
      u = runCommandHint("plugin uninstall", result.pluginId, {
        ...(result.stillOnProjectFile && { extra: "--scope project" }),
        tail: "again",
        fallback: `uninstall "${quotedPrintable(result.pluginId, 200)}" again from the command line${result.stillOnProjectFile ? " with --scope project" : ""}`,
      });
    if (result.stillOnIn !== void 0) {
      let c = result.stillOnProjectFile
        ? `To remove it there too, ${u}`
        : result.stillOnNotReadHere
          ? `Once this workspace is trusted and Claude Code has been started again, ${u}`
          : (networkPathRetryHint(result.stillOnNotReadForItsPath ?? [], u) ??
            `Once it is switched off there, ${u}`);
      return `It is still switched on${result.stillOnUnsure ? ", or may be," : ""} in ${result.stillOnIn.join(" and ")}, so nothing it saved was removed${o}. ${c}.`;
    }
    if (result.installsUnknown)
      return `The list of installed plugins could not be read, so nothing it saved was removed${o}. Once the list can be read, ${u}.`;
    if (result.liveHolder === result.pluginId)
      return `An install record for "${n}" appeared while it was being uninstalled, so nothing it saved was removed.`;
    if (result.liveHolder !== void 0) {
      let c = quotedPrintable(result.liveHolder, 200),
        y = runCommandHint("plugin uninstall", result.liveHolder, {
          fallback: `uninstall "${c}" from the command line`,
        }),
        j = VS(result.liveHolder)
          ? ""
          : `, then ${runCommandHint("plugin uninstall", result.pluginId, { fallback: `uninstall "${quotedPrintable(result.pluginId, 200)}" from the command line` })}`;
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
    let h = `so "${n}" can still only be installed from the same repository`,
      p = runCommandHint("plugin uninstall", result.pluginId, {
        fallback: `uninstall "${quotedPrintable(result.pluginId, 200)}" from the command line`,
      }),
      r = savedDataFixSteps(result.optionsNotGoneBecause, primarySecureStoreKind());
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
/**
 * 启用/禁用插件：写入目标作用域 settings 的 enabledPlugins[pluginId]=true/false；处理托管策略锁定、被依赖（禁用时提示谁依赖它）、依赖自动启用、作用域优先级（已有更高作用域值时提示）。
 */
//@ chunk-pp50kewz.js:89406-99791 fingerprint = setPluginEnabledOp (0.318)
async function setPluginEnabledOp(pluginId, enabled, scope, a, storageV5) {
  let u = enabled ? "enable" : "disable",
    h = yn();
  pluginId = normalizePluginId(pluginId);
  let { name: p, marketplace: marketplace } = parsePluginId(pluginId);
  if (isStorageV5Enabled() && storageV5 !== void 0) await primeInstalledPluginsCache(storageV5);
  if (marketplace === void 0 && !isBuiltinPluginId(pluginId)) {
    let J = joinPluginId(pluginId, BUILTIN),
      D = findPluginInSettings(pluginId, ["user"])?.pluginId;
    if (Wq(J) && D !== void 0 && !isBuiltinPluginId(D))
      return setPluginEnabledOp(D, enabled, scope, a, storageV5);
    if (Wq(J)) {
      let ge = await loadAllPlugins(storageV5);
      if (
        ![...ge.enabled, ...ge.disabled].some(
          (pe) => pluginNamesEqual(pe.name, pluginId) && !isBuiltinPluginId(pe.source),
        )
      )
        return setPluginEnabledOp(J, enabled, scope, a, storageV5);
      return {
        success: !1,
        message: `Plugin "${pluginId}" names both a built-in and another loaded plugin. Use plugin@marketplace format.`,
        failureCode: "ambiguous_marketplace",
      };
    }
    let ce = findPluginInSettings(pluginId)?.pluginId;
    if (ce !== void 0 && (isOfficialMarketplace(marketplaceSuffix(ce)) || Wq(ce)))
      return setPluginEnabledOp(ce, enabled, scope, a, storageV5);
  }
  if (isBuiltinPluginId(pluginId) || isOfficialMarketplace(marketplace)) {
    let J = "user",
      D = trustedOnlyBuiltinPluginId(pluginId) ?? pluginId,
      ce = Wq(D) ? getPluginEnablementLockingSource(D, enabled) : void 0;
    if (ce !== void 0) return pluginBlockedResult(D, enabled, ce, D);
    let ge = !enabled && isBuiltinPluginId(D) ? managedPluginRefusal(D) : void 0;
    if (ge !== void 0) return ge;
    let k,
      pe,
      Ee = [],
      M = !1,
      P = !1,
      L,
      U = !1,
      B = "";
    if (isOfficialMarketplace(marketplace)) {
      let Oe = await loadAllPlugins(storageV5),
        ae = findPluginByIdentifier(
          pluginId,
          [...Oe.enabled, ...Oe.disabled].filter((De) => marketplaceSuffix(De.source) === marketplace),
        );
      if (ae) ((D = ae.source), (k = ae.manifest.defaultEnabled === !1));
      if (
        ((P =
          marketplace === SYNCED &&
          (ae !== void 0
            ? isRequiredPlugin(ae.source, ae.installationPreference)
            : (await listSyncedRequiredPlugins(storageV5)).some(
                (De) => De.required && nfcLower(De.id) === nfcLower(D),
              ))),
        !enabled && P)
      )
        return { success: !1, message: requiredPluginMessage(D), failureCode: "required_by_organization" };
      if (!enabled && marketplace === INLINE_PLUGIN_MARKETPLACE && ae === void 0) {
        let De = `${p}@${SYNCED}`,
          found = (await listSyncedRequiredPlugins(storageV5)).find(
            (Le) => Le.required && nfcLower(Le.id) === nfcLower(De),
          );
        if (found !== void 0)
          return {
            success: !1,
            message: requiredPluginMessage(found.id),
            failureCode: "required_by_organization",
          };
      }
      if (!enabled && !a?.bypassDependentsBlock) {
        let De = buildRequiredByPolicyMap([...Oe.enabled, ...Oe.disabled]).get(nfcLower(D)) ?? [];
        if (De.length > 0)
          return {
            success: !1,
            message: requiredDependencyMessage(parsePluginId(D).name, De),
            failureCode: "required_by_organization",
            reverseDependents: De.map((Ie) => Ie.name),
          };
      }
      let any = Oe.warnings.some(
          (warning) => warning.type === "synced-plugin-shadowed" && nfcLower(warning.source) === nfcLower(D),
        ),
        A = enabled && !any ? lockedDependentName(D, ae?.attributedMarketplaceName) : void 0;
      if (A !== void 0)
        return {
          success: !1,
          message: `Plugin "${D}" cannot be ${u}d here: "${A}" is locked by your organization's managed settings, so this ${nonInstallableSourceLabel(marketplace)} copy is never loaded`,
          failureCode: "managed_name_locked",
        };
      if (
        ((M =
          ae !== void 0 &&
          matchPolicyPluginEntry(
            getPolicyEnabledPluginEntries(),
            parsePluginId(D).name,
            ae.attributedMarketplaceName,
          ).outcome === "admitted"),
        enabled && M && ae !== void 0)
      )
        Ee = [`${ae.name}@${SYNCED}`, `${ae.name}@${INLINE_PLUGIN_MARKETPLACE}`].flatMap((De) =>
          ["local", "user"].flatMap((Ie) => {
            let Le = Tn(Ie, De, h);
            return Le?.value === !1 ? [{ scope: Ie, key: Le.key }] : [];
          }),
        );
      if (enabled && marketplace === SYNCED) {
        let De = new Set(Oe.errors.filter(isDependencyError).map((Le) => Le.source)),
          Ie = localCopyShadowingSynced(p, [
            ...Oe.enabled.filter((Le) => !Le.isBuiltin),
            ...Oe.disabled.filter((Le) => De.has(Le.source)).map((Le) => ({ ...Le, enabled: !0 })),
            ...Oe.enabled.filter((Le) => Le.isBuiltin),
          ]);
        if (Ie !== void 0)
          B = ` (a local copy, ${stripInvisibleKeepEmoji(Ie.source)}, currently takes precedence over the synced one \u2014 disable it in /plugin to run this copy)`;
      }
      if (enabled && marketplace === INLINE_PLUGIN_MARKETPLACE && !M) {
        let { name: De } = splitPluginId(D),
          Ie = `${De}@${SYNCED}`,
          filtered = VALID_INSTALLABLE_SCOPES.filter(
            (un) => Tn(un, D, h)?.value === !1 && Tn(un, Ie, h) === void 0,
          );
        if (filtered.length > 0) pe = { syncedId: Ie, scopes: filtered };
      }
      let Ke = locatePluginInstall(D, scope, h);
      if (((L = Ke.override), scope)) {
        if (
          ((D = Ke.atRequested?.key ?? Ke.found?.key ?? D),
          (U = Ke.atRequested !== void 0),
          Ke.atRequested === void 0 && Ke.found && SCOPE_PRECEDENCE[Ke.found.scope] > SCOPE_PRECEDENCE[scope])
        )
          return {
            success: !1,
            message: `Plugin "${D}" is set at ${Ke.found.scope} scope (which overrides ${scope}). Use --scope ${Ke.found.scope} or omit --scope to auto-detect.`,
            failureCode: "not_installed_at_scope",
            installedScope: Ke.found.scope,
          };
        J = scope;
      } else ((J = Ke.decidingScope ?? Ke.found?.scope ?? "user"), (D = Tn(J, D, h)?.key ?? D));
    }
    if (enabled && marketplace === SKILLS_DIR) {
      if (!areLocalPluginDirsAllowedByPolicy())
        return {
          success: !1,
          message: localPluginDirsBlockedMessage(tildify(join(getClaudeConfigDir(), "skills"))),
          failureCode: "local_plugin_dirs_blocked",
        };
    }
    if (enabled && isPluginBlockedByPolicy(D))
      return {
        success: !1,
        message: `Plugin "${D}" is blocked by your organization's policy and cannot be enabled`,
        failureCode: "plugin_policy_blocked",
      };
    if (marketplace === SYNCED && L && L.enabling !== enabled && !(P && L.source === "flagSettings"))
      return pluginBlockedResult(D, enabled, L.source, L.key);
    let me = scopeToSettingSource(J),
      N =
        enabled &&
        isOfficialMarketplace(marketplace) &&
        me === "userSettings" &&
        k === !1 &&
        (marketplace !== SYNCED || vPi(D, Hi(me, D)) !== !1)
          ? void 0
          : enabled,
      Z = "";
    if (marketplace === SYNCED) {
      let Oe = enabledPluginsBySource(me, D, N),
        ae = Jps(
          D,
          Oe.map(({ record: record }) => record),
        ),
        Ge = ae?.enabled ?? k !== !0,
        A = ae === void 0 ? void 0 : Oe[ae.index]?.source;
      if (Ge !== enabled && A !== void 0 && !(P && A !== "policySettings")) {
        let Ke = getSettingSourceName(A),
          De =
            A === "localSettings" || A === "projectSettings" || A === "userSettings"
              ? SETTING_SOURCE_TO_SCOPE[A]
              : void 0,
          Ie = De !== void 0 ? ` (--scope ${De})` : "";
        if (!U)
          return {
            success: !1,
            message: `Plugin "${D}" would still be ${enabled ? "disabled" : "enabled"} after writing ${J} settings: ${Ke} settings govern it. Change it there${Ie}.`,
            failureCode: "governed_elsewhere",
            ...(De !== void 0 && { governingScope: De }),
          };
        Z = ` (still ${enabled ? "disabled" : "enabled"} here: ${Ke} settings govern it${Ie})`;
      }
      if (!getEnabledSettingSources().includes(me))
        Z += ` (this session ignores ${getSettingSourceName(me)} settings: --setting-sources)`;
    }
    for (let { scope: scope, key: key } of Ee) {
      if (scope === J && nfcLower(key) === nfcLower(D)) continue;
      let { error: error } = await writeEnabledPlugins(scopeToSettingSource(scope), key, !0, {}, storageV5);
      if (error)
        return {
          success: !1,
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
        !1)
    ) {
      let { error: error } = await writeEnabledPlugins("userSettings", D, !1, {}, storageV5);
      if (error)
        return {
          success: !1,
          message: `Failed to ${u} plugin: ${error.message}`,
          failureCode: "settings_write_failed",
        };
    }
    if (pe) {
      let { syncedId: syncedId, scopes: scopes } = pe;
      for (let Ge of scopes) {
        if (Ge === J) continue;
        let { error: error } = await writeEnabledPlugins(
          scopeToSettingSource(Ge),
          syncedId,
          !1,
          {},
          storageV5,
        );
        if (error)
          return {
            success: !1,
            message: `Failed to ${u} plugin: ${error.message}`,
            failureCode: "settings_write_failed",
          };
      }
    }
    let { error: error } = await writeEnabledPlugins(
      me,
      D,
      N,
      pe?.scopes.includes(J) ? { [pe.syncedId]: !1 } : {},
      storageV5,
    );
    if (error)
      return {
        success: !1,
        message: `Failed to ${u} plugin: ${error.message}`,
        failureCode: "settings_write_failed",
      };
    ic(storageV5);
    let { name: pluginName } = splitPluginId(D);
    return {
      success: !0,
      message: `Successfully ${u}d plugin: ${pluginName}${Z}${B}${enabled ? "" : flagSettingsEnabledNote(D)}`,
      pluginId: D,
      pluginName: pluginName,
      scope: J,
    };
  }
  if (scope) assertInstallableScope(scope);
  let c,
    y,
    found = findPluginInSettings(pluginId);
  if (scope)
    if (((y = scope), found)) c = found.pluginId;
    else if (pluginId.includes("@")) c = pluginId;
    else
      return {
        success: !1,
        message: `Plugin "${pluginId}" not found in settings. Use plugin@marketplace format.`,
        failureCode: "ambiguous_marketplace",
      };
  else if (found) ((c = found.pluginId), (y = found.scope));
  else if (pluginId.includes("@")) ((c = pluginId), (y = "user"));
  else
    return {
      success: !1,
      message: `Plugin "${pluginId}" not found in any editable settings scope. Use plugin@marketplace format.`,
      failureCode: "ambiguous_marketplace",
    };
  if (enabled && isPluginBlockedByPolicy(c))
    return {
      success: !1,
      message: `Plugin "${c}" is blocked by your organization's policy and cannot be enabled`,
      failureCode: "plugin_policy_blocked",
    };
  let T = enabled ? void 0 : managedPluginRefusal(c);
  if (T !== void 0) return T;
  if (isNpmPluginSource(c)) {
    let J = parsePluginIdentifier(c).name ?? c;
    if (enabled && pluginDirectoryPolicyBlock() !== null)
      return { success: !1, message: directoryBlockedMessage(J), failureCode: "marketplace_policy_blocked" };
    if (enabled && (await isPluginDirectoryListingBlocked(J, storageV5)))
      return {
        success: !1,
        message: `Plugin "${quotedPrintable(c)}" is blocked by your organization's policy and cannot be enabled`,
        failureCode: "plugin_policy_blocked",
      };
    await Rrt(c, getInstalledPlugins().plugins[c]);
  }
  let settingSource = scopeToSettingSource(y),
    w = lookupByPluginAliases(getSettingsForSourceForUpkeep(settingSource)?.enabledPlugins, c),
    b = scope && found && SCOPE_PRECEDENCE[scope] > SCOPE_PRECEDENCE[found.scope];
  if (scope && w === void 0 && found && found.scope !== scope && !b)
    return {
      success: !1,
      message: `Plugin "${pluginId}" is installed at ${found.scope} scope, not ${scope}. Use --scope ${found.scope} or omit --scope to auto-detect.`,
      failureCode: "not_installed_at_scope",
      installedScope: found.scope,
    };
  let _e =
    scope && !b
      ? w === !0 || (!enabled && getPluginEnablingSource(c, h) === "flagSettings")
      : legacyPluginIds(canonicalPluginId(c)).length > 0
        ? findEnabledSettingForPlugin(canonicalPluginId(c)) === !0
        : getPluginEditableScopes().has(c);
  if (enabled === _e)
    return {
      success: !1,
      alreadyInGoalState: !0,
      failureCode: "already_in_goal_state",
      message: `Plugin "${pluginId}" is already ${enabled ? "enabled" : "disabled"}${scope ? ` at ${scope} scope` : ""}`,
    };
  let ee;
  if (!enabled) {
    let { enabled: enabled, disabled: disabled } = await loadAllPlugins(storageV5),
      ce = [...enabled, ...disabled],
      ge = canonicalPluginId(c),
      k = findReverseDependentNames(ge, ce);
    if (k.length > 0) ee = k;
    if (!a?.bypassDependentsBlock) {
      let M = buildRequiredByPolicyMap(ce).get(nfcLower(ge)) ?? [];
      if (M.length > 0)
        return {
          success: !1,
          message: requiredDependencyMessage(parsePluginIdentifier(c).name, M),
          failureCode: "required_by_organization",
          reverseDependents: M.map((P) => P.name),
        };
    }
    let pe = Qbn() ? ce : ce.filter((M) => marketplaceSuffix(M.source) !== SYNCED),
      Ee = findReverseDependentNames(ge, pe);
    if (Ee.length > 0 && !a?.bypassDependentsBlock) {
      let { name: M } = parsePluginIdentifier(c),
        rdeps = collectTransitiveDependents(ge, pe),
        mapped = [...rdeps, c].map((B) => claudeCommand("plugin disable", B)),
        U = mapped.every((B) => B !== null)
          ? `, or disable everything together: ${mapped.join(" && ")}`
          : ", or disable them together in /plugin.";
      return {
        success: !1,
        message: `${M} is still required by ${Ee.map(stripInvisibleKeepEmoji).join(", ")}. Disable ${plural(Ee.length, "that plugin", "those plugins")} first${U}`,
        failureCode: "required_by_dependents",
        reverseDependents: Ee,
        disableFirst: rdeps,
      };
    }
  }
  let W = [];
  if (enabled) {
    let { enabled: enabled, disabled: disabled } = await loadAllPlugins(storageV5),
      { closure: closure, missing: missing } = computeDependencyClosure(c, [...enabled, ...disabled]);
    if (missing.length > 0) {
      let { name: N } = parsePluginIdentifier(c),
        mapped = missing.map((he) => claudeCommand("plugin install", he)),
        S = mapped.every((he) => he !== null) ? `: ${mapped.join(" && ")}` : " from /plugin.";
      return {
        success: !1,
        message: `${N} depends on ${missing.join(", ")}, which ${plural(missing.length, "is", "are")} not installed. Install ${plural(missing.length, "it", "them")} first${S}`,
        failureCode: "dependency_missing",
        dependencies: missing,
      };
    }
    let k = new Set(enabled.map((N) => N.source)),
      pe = new Map(
        [...enabled, ...disabled]
          .filter((N) => isOfficialMarketplace(marketplaceSuffix(N.source)))
          .map((N) => [N.source, N]),
      ),
      Ee = getEnabledPluginsBySource(),
      filtered = closure.filter(
        (N) =>
          isOfficialMarketplace(marketplaceSuffix(N)) &&
          !k.has(N) &&
          !isPluginEnabled(N, Ee, pe.get(N)?.manifest.defaultEnabled, pe.get(N)?.installationPreference),
      );
    if (filtered.length > 0) {
      let { name: N } = parsePluginIdentifier(c),
        Z = filtered.length,
        mapped = filtered.map((re) => claudeCommand("plugin enable", re)),
        he = mapped.every((re) => re !== null) ? `: ${mapped.join(" && ")}` : " in /plugin.";
      return {
        success: !1,
        message: `${N} depends on ${filtered.join(", ")}, ${plural(Z, "a local copy that is", "local copies that are")} currently disabled. Enable ${plural(Z, "it", "them")} first${he}`,
        failureCode: "dependency_disabled",
        dependencies: filtered,
      };
    }
    let filtered_2 = closure.filter((N) => !isOfficialMarketplace(marketplaceSuffix(N))),
      filtered_3 = filtered_2.filter((N) => isPluginBlockedByPolicy(N));
    if (filtered_3.length > 0) {
      let { name: N } = parsePluginIdentifier(c);
      return {
        success: !1,
        message: `${N} depends on ${filtered_3.join(", ")}, which ${plural(filtered_3.length, "is", "are")} blocked by your organization's plugin policy. Ask an admin to allow ${plural(filtered_3.length, "it", "them")}.`,
        failureCode: "dependency_policy_blocked",
      };
    }
    let sorted = [...VALID_INSTALLABLE_SCOPES].sort((N, Z) => SCOPE_PRECEDENCE[Z] - SCOPE_PRECEDENCE[N]),
      B = [];
    for (let N of filtered_2)
      for (let Z of sorted) {
        if (SCOPE_PRECEDENCE[Z] <= SCOPE_PRECEDENCE[y]) continue;
        let S = getSettingsForSourceForUpkeep(scopeToSettingSource(Z))?.enabledPlugins?.[N];
        if (S === void 0) continue;
        if (S === !1) B.push({ dep: N, scope: Z });
        break;
      }
    if (B.length > 0) {
      let { name: N } = parsePluginIdentifier(c),
        joined = B.map((re) => `${re.dep} (${re.scope} scope)`).join(", "),
        S = uniq(B.map((re) => re.scope)),
        he = S.length === 1 ? `, or use --scope ${S[0]} to write where the override lives` : "";
      return {
        success: !1,
        message: `${N} depends on ${joined}, which ${plural(B.length, "is", "are")} disabled there. Enable ${plural(B.length, "it", "them")} at that scope${he}.`,
        failureCode: "dependency_disabled",
        dependencies: B.map((re) => re.dep),
      };
    }
    let me = getEnabledPluginIdsInSource(settingSource);
    W = filtered_2.filter((N) => !me.has(N));
  }
  let { error: error } = await writeEnabledPlugins(
    settingSource,
    c,
    enabled,
    Object.fromEntries(W.map((J) => [J, !0])),
    storageV5,
  );
  if (error)
    return {
      success: !1,
      message: `Failed to ${u} plugin: ${error.message}`,
      failureCode: "settings_write_failed",
    };
  if ((ic(storageV5), enabled))
    (seedPluginUsage([c, ...W], storageV5), touchPluginUsage([c, ...W], storageV5));
  let { name: pluginName } = parsePluginIdentifier(c),
    depWarn = formatReverseDependentsSuffix(ee),
    we =
      W.length > 0
        ? ` (also enabled ${W.length} ${plural(W.length, "dependency", "dependencies")}: ${W.map((J) => parsePluginIdentifier(J).name).join(", ")})`
        : "";
  return {
    success: !0,
    message: `Successfully ${u}d plugin: ${pluginName} (scope: ${y})${enabled ? "" : flagSettingsEnabledNote(c)}${depWarn}${we}`,
    pluginId: c,
    pluginName: pluginName,
    scope: y,
    reverseDependents: ee,
  };
}
/**
 * 启用插件：setPluginEnabledOp(pluginId, true, scope)。
 */
//@ chunk-pp50kewz.js:99791-99844 layout
async function enablePluginOp(e, n, i) {
  return setPluginEnabledOp(e, !0, n, void 0, i);
}
/**
 * 禁用插件：setPluginEnabledOp(pluginId, false, scope)。
 */
//@ chunk-pp50kewz.js:99844-99897 layout
async function disablePluginOp(e, n, i) {
  return setPluginEnabledOp(e, !1, n, void 0, i);
}
/**
 * 列出必须保持启用的插件：托管策略 policySettings 启用的、claude.ai 同步要求的，以及它们的依赖闭包；用于禁止禁用。
 */
//@ chunk-pp50kewz.js:99897-102187 layout
async function listRequiredPlugins(e) {
  let n = getPluginEditableScopes();
  await ensureSyncedPluginDirsRegistered();
  let i = await listSyncedRequiredPlugins(e),
    a = uniq(i.map((P) => P.id)),
    o = new Set(i.filter((P) => P.required).map((P) => nfcLower(P.id))),
    u = djt(),
    h = yn(),
    filtered = [
      ...a,
      ...u
        .filter(({ source: source }) => source === "policySettings")
        .flatMap(({ record: record }) => Object.keys(record ?? {})),
    ].filter((P) => getPluginEnablingSource(P, h) === "policySettings"),
    r =
      (o.size > 0 && X5o()) || filtered.length > 0
        ? await loadAllPlugins(e).then((P) => [...P.enabled, ...P.disabled])
        : [],
    c = new Set(
      r
        .filter((P) => marketplaceSuffix(P.source) === INLINE_PLUGIN_MARKETPLACE)
        .map((P) => nfcLower(P.source)),
    ),
    y = (P) => {
      let L = normalizePluginId(P),
        U = marketplaceSuffix(L);
      if (U === INLINE_PLUGIN_MARKETPLACE) {
        if (c.has(nfcLower(L))) return !1;
      } else if (U !== SYNCED) return !1;
      let sliced = L.slice(0, L.lastIndexOf("@"));
      return o.has(nfcLower(`${sliced}@${SYNCED}`));
    },
    T = ((P) => new Set(P.flatMap(({ record: record }) => Object.keys(record ?? {}).map(nfcLower))))(u),
    filtered_2 = a.filter((P) => !T.has(nfcLower(P)) && !y(P)),
    w = (P) => new Set(P.flatMap(({ record: record }) => Object.keys(record ?? {}))),
    b = w(u),
    _e = w(u.filter(({ source: source }) => TRUSTED_SETTING_SOURCES.includes(source))),
    filtered_3 = getBuiltinPlugins()
      .enabled.map((P) => P.source)
      .filter((P) => {
        let L = Wq(P) ? _e : b;
        return ![P, ...legacyPluginIds(P)].some((U) => L.has(U));
      }),
    W = new Set(buildRequiredByPolicyMap(r).keys()),
    se = (P) => W.has(nfcLower(normalizePluginId(P))),
    Ce = [...n.keys(), ...filtered_2, ...filtered_3],
    X = uniq(Ce.filter((P) => !nt(P, y, h) && se(P))),
    filtered_4 = [...filtered_2, ...filtered_3].filter((P) => !nt(P, y, h) && !se(P)),
    filtered_5 = [...n.keys()].filter((P) => !nt(P, y, h) && !se(P)),
    size = new Set([
      ...o,
      ...[
        ...filtered_3,
        ...a,
        ...r.map((P) => P.source),
        ...[...n].filter(([, P]) => P !== "managed").map(([P]) => P),
      ]
        .filter((P) => getPluginEnablingSource(P, h) === "policySettings")
        .map(nfcLower),
    ]).size,
    ce =
      X.length > 0
        ? ` and ${X.length} ${plural(X.length, "plugin")} ${plural(size, "it depends", "they depend")} on`
        : "",
    ge = size > 0 ? ` (skipped ${size} required by your organization${ce})` : "";
  if (filtered_5.length === 0 && filtered_4.length === 0)
    return { success: !0, message: `No enabled plugins to disable${ge}` };
  let k = [],
    pe = [];
  for (let P of filtered_5) {
    let L = await setPluginEnabledOp(P, !1, void 0, { bypassDependentsBlock: !0 }, e);
    if (L.success) k.push(P);
    else pe.push(stripInvisibleKeepEmoji(`${P}: ${L.message}`));
  }
  for (let P of filtered_4) {
    let { error: error } = await updateSettingsForSourceWithTransform(
      "userSettings",
      (U) => ({ enabledPlugins: { ...U?.enabledPlugins, [P]: !1 } }),
      void 0,
      e,
    );
    if (error) pe.push(stripInvisibleKeepEmoji(`${P}: ${error.message}`));
    else k.push(P);
  }
  if (filtered_4.length > 0) ic(e);
  let Ee = count(k, (P) => getPluginEnablingSource(P, h) === "flagSettings"),
    M = Ee > 0 ? ` (${Ee} still enabled this session: --settings keeps ${plural(Ee, "it", "them")} on)` : "";
  if (pe.length > 0)
    return {
      success: !1,
      message: `Disabled ${k.length} ${plural(k.length, "plugin")}${ge}${M}, ${pe.length} failed:
${pe.join(`
`)}`,
      failureCode: "partial_failure",
    };
  return { success: !0, message: `Disabled ${k.length} ${plural(k.length, "plugin")}${ge}${M}` };
}
//@ chunk-pp50kewz.js:102187-102435 layout
async function listSyncedRequiredPlugins(e) {
  return (
    await Promise.all(
      getSyncedPluginDirs().map(async (i) => {
        let a = await syncedPluginMintedName(i, e);
        if (a === void 0) return [];
        let o = `${a}@${SYNCED}`,
          u = await getPluginAttribution(resolve(i));
        return [
          {
            id: o,
            required:
              isRequiredPlugin(o, u.installationPreference) &&
              lockedDependentName(o, u.marketplaceName) === void 0,
          },
        ];
      }),
    )
  ).flat();
}
//@ chunk-pp50kewz.js:102435-102675 layout
function buildRequiredByPolicyMap(e) {
  let n = new Map(),
    i = X5o(),
    a = yn();
  for (let o of e) {
    if (
      !(i && isRequiredPlugin(o.source, o.installationPreference)) &&
      getPluginEnablingSource(o.source, a) !== "policySettings"
    )
      continue;
    for (let h of computeDependencyClosure(o.source, e).closure) {
      let p = nfcLower(h);
      n.set(p, [...(n.get(p) ?? []), o]);
    }
  }
  return n;
}
//@ chunk-pp50kewz.js:102675-102882 layout
function requiredDependencyMessage(e, n) {
  return `${e} is needed by ${n.map((i) => stripInvisibleKeepEmoji(i.name)).join(", ")}, which ${plural(n.length, "is", "are")} required by your organization, so it can't be disabled here. Contact your admin to change it.`;
}
/**
 * “该插件由组织要求启用，不能在此禁用”的提示文本。
 */
//@ chunk-pp50kewz.js:102882-103014 layout
function requiredPluginMessage(e) {
  return `Plugin "${e}" is required by your organization and can't be disabled here. Contact your admin to change it.`;
}
/**
 * 更新插件的操作入口（CLI 与 /plugin 界面共用）：执行实际更新，异常按 failureCode 分 bad/sad 记 plugin_update_op 遥测，返回 {outcome, message, scope, failureCode}。
 */
//@ chunk-pp50kewz.js:103014-104076 layout
async function updatePluginOp(e, n, i = {}, a) {
  let o;
  try {
    o = await updatePluginOpInner(e, n, i, a);
  } catch (error) {
    let p = { is_directory: YX(e) };
    if (error instanceof Bd) {
      let r = error instanceof Eie ? error.failureCode : "command_source_refused";
      if (FAILURE_CODE_SEVERITY[r] === "sad") logFeatureSad("plugin_update_op", r, p);
      else logFeatureBad("plugin_update_op", r, p);
      return { outcome: "failed", message: error.message, scope: n, failureCode: r };
    }
    throw (logFeatureBad("plugin_update_op", "exception", p), error);
  }
  let u = {
    is_directory: YX(o.pluginId ?? e),
    pin_changed: o.pinChanged === !0,
    no_clone_short_circuit: o.noCloneShortCircuit === !0,
    not_checked: o.notChecked === !0,
  };
  switch (o.outcome) {
    case "failed":
      if (o.failureCode !== void 0 && FAILURE_CODE_SEVERITY[o.failureCode] === "sad")
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
/**
 * 更新结果为 up_to_date 时补充检查：安装路径已不存在则改报需重新安装。
 */
//@ chunk-pp50kewz.js:104076-105363 layout
async function annotateUpToDateResult(e, n, i, a) {
  if (e.outcome !== "up_to_date") return e;
  let { absolute: absolute, suspect: suspect } = classifyMarketplacePath(n.installPath),
    p =
      (suspect
        ? void 0
        : await cacheCopyDependencyGap(absolute).catch(() => {
            return;
          })
      )?.kind === "not-installed"
        ? await realPathInsideCache(absolute)
        : void 0;
  if (p === void 0) return e;
  if (isEssentialTrafficOnly()) return e;
  let r = n.projectPath ? `${n.scope} (${n.projectPath})` : n.scope,
    c,
    y = !1;
  try {
    (await unvouchBeforeDependencyStep(absolute, a),
      (c = (await installPluginDependencies(absolute, { inPlaceAt: p })).error));
  } catch (error) {
    ((y = !0), (c = errorMessage(error)));
  }
  let j;
  if (!y)
    await rescreenCachedPluginTree(absolute, a).catch((I) => {
      j = errorMessage(I);
    });
  if (!(
    !y &&
    (await realPathInsideCache(absolute)) === p &&
    (await F3s(absolute)) &&
    (await cacheCopyDependencyGap(absolute).then(
      (I) => I === void 0,
      () => !1,
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
  if (j !== void 0)
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
/**
 * 插件更新主体：刷新所属市场（可跳过）、按作用域找到安装记录，重新 cachePlugin + copyPluginToVersionedCache 得到新版本，比较版本后更新 installed_plugins 记录；command 来源需用户同意，背景模式下跳过。
 */
//@ chunk-pp50kewz.js:105363-121835 layout
async function updatePluginOpInner(
  pluginId,
  scope,
  {
    skipMarketplaceRefresh: skipMarketplaceRefresh = !1,
    skipCommandSources: skipCommandSources = !1,
    announceCommandSource: announceCommandSource,
    explicit: explicit = !1,
    consentedEntryHelper: consentedEntryHelper,
    onEntryHelperDisclosure: onEntryHelperDisclosure,
  },
  storageV5,
) {
  let c = explicit;
  pluginId = normalizePluginId(pluginId);
  let { name: y, marketplace: marketplace } = parsePluginId(pluginId),
    T = pluginOperationRefusal(pluginId, marketplace, "update");
  if (T !== void 0)
    return { outcome: "failed", message: T, failureCode: unmanageablePluginReason(pluginId, marketplace) };
  let I = await getInstalledListRefusal(storageV5);
  if (I !== void 0)
    return {
      outcome: "failed",
      message: `Plugin "${quotedPrintable(pluginId)}" was not updated: ${readInstalledPluginsFile(I)}`,
      failureCode: "install_records_unreadable",
    };
  let w = marketplace,
    b = w ? `${y}@${w}` : pluginId,
    _e =
      isStorageV5Enabled() && storageV5 !== void 0
        ? await loadInstalledPlugins(storageV5)
        : loadInstalledPluginsSync(),
    ee = findPluginName(Object.keys(_e.plugins), b);
  if (ee === void 0 && w === void 0) {
    let filtered = Qps(Object.keys(_e.plugins), y).filter((Q) => (_e.plugins[Q]?.length ?? 0) > 0);
    if (filtered.length > 1)
      return {
        outcome: "failed",
        message: `Plugin "${printableName(y, 200)}" is installed from more than one marketplace. Include the marketplace name to pick one: ${filtered.map((Q) => `\`claude plugin update ${printableName(Q, 200)}\``).join(" or ")}`,
        scope: scope,
        failureCode: "ambiguous_marketplace",
      };
    if (filtered.length === 0)
      return {
        outcome: "failed",
        message: `Plugin "${printableName(y, 200)}" is not installed`,
        scope: scope,
        failureCode: "not_installed",
      };
    ee = filtered[0];
  }
  if (ee) ((b = ee), ({ marketplace: w } = parsePluginIdentifier(b)));
  let W = ee ? _e.plugins[ee] : void 0,
    se = await Rrt(b, W),
    Ce = void 0;
  if (Ce !== void 0 && !Ce.ok)
    return { outcome: "failed", message: Ce.message, pluginId: b, scope: scope, failureCode: "not_found" };
  let X,
    we = !1,
    J,
    D = !1;
  if (isPluginBlockedByPolicy(b))
    return {
      outcome: "failed",
      message: `Plugin "${printableName(b, 200)}" is blocked by your organization's policy and was not updated`,
      pluginId: b,
      scope: scope,
      failureCode: "plugin_policy_blocked",
    };
  if (w === NPM) {
    if (!ZJn())
      return {
        outcome: "failed",
        message: NPM_DIRECT_INSTALL_DISABLED_MESSAGE,
        pluginId: b,
        scope: scope,
        failureCode: "npm_marketplace_disabled",
      };
    if (!W || W.length === 0)
      return {
        outcome: "failed",
        message: `Plugin "${y}" is not installed`,
        pluginId: b,
        scope: scope,
        failureCode: "not_installed",
      };
    return performPluginUpdate(b, y, scope ?? VALID_UPDATE_SCOPES_2(W), W, storageV5, explicit);
  }
  if (w) {
    let R = await loadKnownMarketplacesWithDeclared(storageV5),
      Q = Zb(R, w),
      x = Q?.source;
    if (x && isPluginDirectorySource(x) && (await getPluginDirectoryState()) === "blocked")
      return {
        outcome: "failed",
        message: directoryBlockedMessage(y),
        pluginId: b,
        scope: scope,
        failureCode: "marketplace_policy_blocked",
      };
    let ue = !x && w === OFFICIAL_MARKETPLACE_NAME && Eq();
    if (isSourceDisallowedOrUnverifiable(ue ? { source: "pluginDirectory" } : x))
      return {
        outcome: "failed",
        message: `Plugin "${y}" is from marketplace "${w}", which is blocked by your organization's policy`,
        pluginId: b,
        scope: scope,
        failureCode: "marketplace_policy_blocked",
      };
    if (Q !== void 0 && Dse(w, Q))
      return {
        outcome: "failed",
        message: describeImpersonatingMarketplace(w, Q),
        pluginId: b,
        scope: scope,
        failureCode: "not_found",
      };
    if (
      ((D = !x && w === OFFICIAL_MARKETPLACE_NAME && !Eq()),
      !skipMarketplaceRefresh &&
        ((x &&
          (x.source === "github" ||
            x.source === "git" ||
            x.source === "url" ||
            x.source === "claudeai" ||
            x.source === "pluginDirectory")) ||
          (!x && w === OFFICIAL_MARKETPLACE_NAME && Eq())))
    )
      try {
        await refreshMarketplaceDeduped(w, storageV5, void 0, { skipIfRecent: !0 });
      } catch (error) {
        if (
          ((we = error instanceof Bd),
          (X = we
            ? "marketplace not refreshed \u2014 your organization's managed settings forbid its headersHelper (the version shown is from the cached catalog; ask your admin)"
            : `marketplace not refreshed (${U$(errorMessage(error))})`),
          error instanceof PluginDirectoryUnavailableError)
        )
          J = U$(error.message);
        logForDebugging(
          `Failed to refresh marketplace '${w}' before update; using cached data: ${errorMessage(error)}`,
          { level: "warn" },
        );
      }
  }
  let ce = {
      pluginName: y,
      refreshWarning: X,
      directoryRefreshFailed: w === OFFICIAL_MARKETPLACE_NAME && !we,
      directoryNotChecked: D,
    },
    ge =
      skipMarketplaceRefresh || J !== void 0
        ? await getPluginByIdCacheOnly(b, storageV5)
        : await getPluginById(b, storageV5, "update");
  if (!ge && !skipMarketplaceRefresh && w === OFFICIAL_MARKETPLACE_NAME) {
    if (J !== void 0)
      return {
        outcome: "failed",
        message: `Could not check "${quotedPrintable(y)}" for updates. ${J}`,
        pluginId: b,
        scope: scope,
        failureCode: "directory_unavailable",
      };
    if (await isPluginDirectoryListingBlocked(y, storageV5))
      return {
        outcome: "failed",
        message: `Plugin "${quotedPrintable(y)}" is blocked by your organization's policy and was not updated`,
        pluginId: b,
        scope: scope,
        failureCode: "plugin_policy_blocked",
      };
    let R = await pluginDirectoryNotInstallableMessage(y);
    if (R !== void 0)
      return {
        outcome: "failed",
        message: `"${quotedPrintable(y)}" was not updated: ${R}`,
        pluginId: b,
        scope: scope,
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
      scope: scope,
      failureCode: skipMarketplaceRefresh ? "not_cached" : "not_found",
    };
  let { entry: entry } = ge,
    { marketplaceInstallLocation: marketplaceInstallLocation } = ge;
  if (!W || W.length === 0)
    return {
      outcome: "failed",
      message: `Plugin "${y}" is not installed`,
      pluginId: b,
      scope: scope,
      failureCode: "not_installed",
    };
  if (scope === void 0) scope = VALID_UPDATE_SCOPES_2(W);
  let Ee = getProjectPathForScope(scope),
    filtered = W.filter((R) => R.scope === scope),
    P = findInstallationForCurrentProject(filtered);
  if (!P && filtered.length > 1)
    logForDebugging(
      `updatePluginOp: ${filtered.length} ${scope}-scope installs, none match CWD '${Ee}'; updating '${filtered[0]?.projectPath}' only`,
      { level: "warn" },
    );
  let L = P ?? filtered[0];
  if (!L) {
    let R = Ee ? `${scope} (${Ee})` : scope;
    return {
      outcome: "failed",
      message: `Plugin "${y}" is not installed at scope ${R}`,
      pluginId: b,
      scope: scope,
      failureCode: "not_installed_at_scope",
    };
  }
  let projectPath = L.projectPath,
    B;
  if (typeof entry.source === "object" && entry.source.source === "command") {
    let R = areCommandPluginSourcesDisabledByPolicy(),
      Q = R || skipCommandSources,
      x = findPluginName(await checkEnabledPlugins(), b) !== void 0,
      ue = R || (skipCommandSources && !x),
      fe = scope === "user" ? void 0 : `--scope ${scope}`;
    B = Q ? void 0 : await announceCommandSource?.(b, entry, L.sourceCommand);
    let ze =
      announceCommandSource !== void 0 && !isPluginsDirOnLocalDisk() && L.sourceCommand === o1(entry.source);
    if (Q || (B === void 0 && !ze && !x))
      return {
        outcome: "failed",
        message:
          skipCommandSources && !ue
            ? `${printableName(y, 200)} is installed by running a command, which the background marketplace update never runs; it is left to the per-session re-resolve (when that is enabled) or an explicit update \u2014 ${runCommandHint("plugin update", b, { extra: fe, fallback: "a per-plugin update reviews it" })}.`
            : R
              ? commandPluginSourcesDisabledMessage()
              : `${printableName(y, 200)} is disabled, so the command that installs it was not run. Enable it first, then ${runCommandHint("plugin update", b, { extra: fe, fallback: "update it explicitly" })}.`,
        pluginId: b,
        scope: scope,
        failureCode: skipCommandSources && !ue ? "command_source_skipped" : "command_source_inactive",
      };
  }
  let me = getFsImplementation(),
    version = L.version,
    { enabled: enabled, disabled: disabled } = skipMarketplaceRefresh
      ? await loadAllPluginsCacheOnly(storageV5)
      : await loadAllPlugins(storageV5),
    he = collectConstraintsOn(b, [...enabled, ...disabled]),
    filtered_2 = he.filter((R) => R.constraint.version !== void 0),
    filtered_3 = he.map((R) => R.constraint.version).filter((R) => R !== void 0),
    ae,
    Ge = "",
    A = await loadKnownMarketplacesWithDeclared(storageV5),
    Ke = A[w ?? ""]?.source,
    De = (R) =>
      explicit && !Nee(entry.source) && !L2e(entry.source, Ke)
        ? annotateUpToDateResult(R, L, y, storageV5)
        : Promise.resolve(R);
  if (filtered_3.length > 0) {
    let R = intersectVersionConstraints(filtered_3);
    if (!R.ok)
      return {
        outcome: "skipped",
        message: `Skipped \u2014 ${describeConstraintConflict("Plugin", b, filtered_3, R.reason)}`,
        pluginId: b,
        scope: scope,
        blockedBy: filtered_2.map((ue) => ue.plugin.source),
        oldVersion: version,
        skipReason: "pinner_blocked",
      };
    let Q = A[w ?? ""]?.source,
      x =
        getPluginCloneUrl(entry.source) ??
        (typeof entry.source === "string" ? getMarketplaceCloneUrl(Q) : null);
    if (x !== null && R.range !== "*" && !b.endsWith(`@${OFFICIAL_MARKETPLACE_NAME}`)) {
      let ue = await resolveVersionRange(x, entry.name, R.range);
      if (ue === null)
        logForDebugging(
          `updatePluginOp(${b}): no ${entry.name}--v* tag satisfying ${R.range}; falling back to HEAD + post-fetch guard`,
        );
      else if (ue.version === L.resolvedVersion && ue.sha === L.gitCommitSha)
        return De({
          outcome: "up_to_date",
          message: appendRefreshWarning(
            ce,
            `${y} is already at the latest version satisfying ${filtered_3.join(", ")} (${ue.version}, required by ${filtered_2.map((fe) => fe.plugin.name).join(", ")}).`,
          ),
          pluginId: b,
          newVersion: L.version,
          oldVersion: version,
          scope: scope,
          refreshFailed: X !== void 0 ? !0 : void 0,
          refreshRefusedByPolicy: we || void 0,
        });
      else if (
        ((ae = ue),
        (Ge = ` (highest tag satisfying ${filtered_3.join(", ")} from ${filtered_2.map((fe) => fe.plugin.name).join(", ")})`),
        typeof entry.source === "string")
      ) {
        let fe = toRelativePluginSource(Q, entry.source);
        if (fe !== null) entry = { ...entry, source: fe };
      }
    }
  }
  let Ie,
    Le,
    un,
    qe,
    fn,
    vn = !1,
    tn,
    K,
    q;
  {
    let source = entry.source,
      Q = typeof source === "object" && source.source === "claudeai",
      claudeaiPluginId = L.claudeaiPluginId;
    if (
      (claudeaiPluginId !== void 0 && (!Q || source.pluginId !== claudeaiPluginId)) ||
      (claudeaiPluginId === void 0 && Q)
    )
      return {
        outcome: "failed",
        message:
          claudeaiPluginId === void 0
            ? `${y} is listed by a claude.ai-hosted marketplace but its install record no longer says which claude.ai plugin it came from \u2014 not updated. Uninstall and install it again to re-pin it.`
            : `${y} was installed from a claude.ai-hosted marketplace, but "${w}" now lists ${Q ? "a different claude.ai plugin" : "another source"} under that name \u2014 not updated. Uninstall and install it again to switch to what the marketplace lists now, or remove it.`,
        pluginId: b,
        scope: scope,
        failureCode: "claudeai_identity_changed",
      };
  }
  let endsWith = b.endsWith(`@${OFFICIAL_MARKETPLACE_NAME}`);
  if (endsWith && isUnboundOfficialPlugin(b, W, se))
    return {
      outcome: "failed",
      message: `"${quotedPrintable(y)}" was not updated: plugin-directory-bindings.json in the plugins folder could not be used (unreadable, a symbolic link or not a file, over 1 MB, damaged, or written by a newer Claude Code), so its ${OFFICIAL_MARKETPLACE_DISPLAY} listing could not be checked against the repository it was installed from. Nothing was changed. Try again; if this repeats, check the file for those causes.`,
      pluginId: b,
      scope: scope,
      failureCode: "directory_binding_unreadable",
    };
  if (endsWith && isDirectoryRepositoryChanged(b, W, entry.source, se))
    return {
      outcome: "failed",
      message: `"${quotedPrintable(y)}" was not updated: the ${OFFICIAL_MARKETPLACE_DISPLAY} now lists a different repository under that name. Uninstall it, then install the new listing if you want it.`,
      pluginId: b,
      scope: scope,
      failureCode: "directory_identity_changed",
    };
  if (endsWith && (samePluginSource(entry.source, void 0)?.length ?? 0) > Y_n)
    return {
      outcome: "failed",
      message: `"${quotedPrintable(y)}" was not updated: the repository address in its ${OFFICIAL_MARKETPLACE_DISPLAY} listing is too long. Nothing was changed. Only a change to the listing can fix this.`,
      pluginId: b,
      scope: scope,
      failureCode: "directory_listing_not_installable",
    };
  let V = getBoundRepositoryKeys(b, W, se).length > 0,
    He = verifyReviewedCommit({
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
      scope: scope,
      failureCode: "directory_listing_not_installable",
    };
  if (typeof entry.source !== "string") {
    let source = entry.source,
      Q =
        ae && (source.source === "github" || source.source === "url" || source.source === "git-subdir")
          ? { ...source, ref: ae.ref, sha: ae.sha }
          : source,
      x = A[w ?? ""]?.source,
      ue = mE(b),
      fe = findSettingsArchiveEntry(ue, entry.name),
      ze =
        source.source === "archive"
          ? headersHelperNotRunReason({
              entry: entry,
              archiveUrl: source.url,
              marketplaceSource: x,
              trustedSettingsEntryAuth: fe,
            })
          : void 0,
      Se = ze !== void 0 && source.source === "archive" ? getEntryHelperConsentSubject(ze, source.url) : null,
      Fe = Se === null ? null : headersHelperPolicyRefusal(x, w),
      Ye =
        Fe !== null
          ? {
              outcome: "failed",
              message: checkHeadersHelperConsent(entry.name, Fe),
              pluginId: b,
              scope: scope,
              failureCode: helperRefusalFailureCode(Fe),
            }
          : null;
    if (c && Ye !== null) return Ye;
    let sn =
      c && onEntryHelperDisclosure === void 0 ? diffEntryHelperConsent(consentedEntryHelper, Se) : null;
    if (sn !== null)
      return {
        outcome: "failed",
        message: describeHelperReview(sn, entry.name, "update"),
        pluginId: b,
        scope: scope,
        failureCode: HELPER_CONSENT_MISMATCH_CODES[sn],
      };
    if (!c && Se !== null) {
      let ye =
        entry.version ??
        (source.source === "archive" && source.sha256 !== void 0 ? VGr(source.sha256) : void 0);
      if (ye !== void 0 && ye === version)
        return {
          outcome: "up_to_date",
          message: upToDateMessage(ce, version),
          pluginId: b,
          newVersion: version,
          oldVersion: version,
          scope: scope,
          refreshFailed: X !== void 0 ? !0 : void 0,
          refreshRefusedByPolicy: we || void 0,
        };
      if (Ye !== null) return Ye;
      let We = claudeCommand("plugin update", b);
      return {
        outcome: "skipped",
        message:
          `Skipped \u2014 "${quotedPrintable(entry.name)}" fetches its archive through a headersHelper, which only runs when you update it yourself. Update it from /plugin` +
          (We ? ` (or \`${We}\`).` : "."),
        pluginId: b,
        scope: scope,
        oldVersion: version,
        skipReason: "entry_helper_deferred",
      };
    }
    if (c && Se !== null) {
      if (onEntryHelperDisclosure !== void 0) {
        let ye = await onEntryHelperDisclosure(archiveHelperDisclosure(Se), Se, b);
        if (ye !== "accepted")
          return {
            outcome: "failed",
            message: "Aborted \u2014 the headersHelper command was not confirmed, so it was not run.",
            pluginId: b,
            scope: scope,
            failureCode: ye === "declined" ? "entry_helper_declined" : "entry_helper_unconfirmed",
          };
      }
    }
    if (source.source === "claudeai" && ae === void 0 && source.version !== "" && source.version === version)
      return De({
        outcome: "up_to_date",
        message: upToDateMessage(ce, version),
        pluginId: b,
        newVersion: version,
        oldVersion: version,
        scope: scope,
        refreshFailed: X !== void 0 ? !0 : void 0,
        refreshRefusedByPolicy: we || void 0,
      });
    let an = pinnedSha(b, entry.source);
    if (an !== void 0 && (D || L.gitCommitSha === an)) {
      let ye = samePluginSource(entry.source, void 0);
      if (!D && L.gitCommitSha === an && L.directoryRepositoryKey === void 0 && ye !== void 0)
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
        scope: scope,
        refreshFailed: X !== void 0 ? !0 : void 0,
        refreshRefusedByPolicy: we || void 0,
        ...(D ? { notChecked: !0 } : { noCloneShortCircuit: !0 }),
      });
    }
    let Ue = await cachePlugin(Q, {
      manifest: { name: entry.name },
      storageV5: storageV5,
      isDirectoryPlugin: YX(b),
      directoryPin: pinnedSha(b, Q) ?? null,
      archiveAuth: await resolveArchiveDownloadHeaders({
        pluginSource: Q,
        pluginName: entry.name,
        marketplaceName: w,
        marketplaceSource: x,
        trustedMarketplaceAuth: findUrlMarketplaceHeaders(x, ue),
        trustedSettingsEntryAuth: fe,
        entry: entry,
        runEntryHelper: c,
      }),
      entryDeclaresComponents: entryDeclaresComponents(entry),
      declaredComponentPaths: entryDeclaredComponentPaths(entry),
      commandSourceConsent:
        B !== void 0
          ? { kind: "shown", command: B, pluginId: b }
          : { kind: "recorded", command: isPluginsDirOnLocalDisk() ? void 0 : L.sourceCommand, pluginId: b },
    });
    if (
      ((Ie = Ue.path),
      (Le = Ue.producerPath),
      (un = Ue.contentSha256),
      (vn = !0),
      ae?.sha !== void 0 || Ue.gitCommitSha !== void 0 || V || b.endsWith(`@${OFFICIAL_MARKETPLACE_NAME}`))
    )
      tn = ae?.sha ?? Ue.gitCommitSha;
    else if (getPluginCloneUrl(Q) !== null) {
      let ye = await probePluginGitHead(Ue.path);
      tn = ye.repo ? (ye.sha ?? void 0) : null;
    } else tn = null;
    fn = Ue.manifest?.version;
    let Qe = await calculatePluginVersion(
      b,
      entry.source,
      Ue.manifest,
      Ue.path,
      { kind: "catalog", version: entry.version },
      ae?.sha ?? Ue.gitCommitSha,
      Ue.contentSha256,
    );
    qe = ae && (Ue.manifest?.version || entry.version) ? withShaSuffix(Qe, ae.sha) : Qe;
  } else {
    let R = seedDirFor(marketplaceInstallLocation) !== void 0 ? "system" : "workspace",
      Q = await resolvePluginEntryPath(
        b,
        marketplaceInstallLocation,
        entry.source,
        A,
        tryUnwrapTextPayload(),
        storageV5,
        R,
      );
    if (Q.kind === "location-error") throw Q.error;
    if (Q.kind !== "ok") {
      let Se = entryResolutionError(Q, marketplaceInstallLocation, entry.source);
      return { outcome: "failed", message: Se.message, pluginId: b, scope: scope, failureCode: Se.code };
    }
    ((q = Q.marketplaceDir), (Ie = Q.entryPath));
    let x = A[w ?? ""],
      ue = x !== void 0 && isLocalMarketplaceSource(x.source);
    try {
      if (ue) await probeLocalMarketplacePath(storageV5, Ie, R);
      else await me.stat(Ie);
    } catch (error) {
      if (isENOENT(error))
        return {
          outcome: "failed",
          message: `Plugin source not found at ${printableOrEmpty(Ie)}`,
          pluginId: b,
          scope: scope,
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
    ((tn = ze.repo ? (ze.sha ?? void 0) : K !== void 0 ? commitShaOf(K) : null),
      (qe = await calculatePluginVersion(
        b,
        entry.source,
        fe,
        Ie,
        { kind: "catalog", version: entry.version },
        void 0,
        void 0,
        q,
      )));
  }
  try {
    let R = verifyReviewedCommit({
      pluginId: b,
      pluginName: y,
      source: entry.source,
      boundByRecord: V,
      fetched: { gitCommitSha: tn ?? void 0 },
      action: "updated",
    });
    if (!R.ok)
      return {
        outcome: "failed",
        message: R.message,
        pluginId: b,
        scope: scope,
        failureCode: "directory_commit_mismatch",
      };
    if (ae === void 0 && filtered_3.length > 0) {
      let ye = Bn.valid(fn) ?? Bn.coerce(fn)?.version,
        mapped = he
          .filter(
            ({ constraint: constraint }) =>
              constraint.version !== void 0 && ye !== void 0 && !Bn.satisfies(ye, constraint.version),
          )
          .map(({ plugin: plugin }) => plugin.source);
      if (mapped.length > 0)
        return {
          outcome: "skipped",
          message: `Skipped \u2014 ${mapped.join(", ")} requires ${y} at a version range that ${fn ?? qe} does not satisfy`,
          pluginId: b,
          scope: scope,
          blockedBy: mapped,
          oldVersion: version,
          skipReason: "pinner_blocked",
        };
    }
    if (
      qe === "unknown" &&
      version !== void 0 &&
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
        scope: scope,
        oldVersion: version,
        skipReason: "snapshot_file_refused",
      };
    let Q = getVersionedCachePath(b, qe),
      x = qe === "unknown",
      ue = getVersionedZipCachePath(b, qe),
      fe = R.reviewedCommit !== void 0 && L.gitCommitSha !== R.reviewedCommit,
      ze = !x && !fe && (L.version === qe || L.installPath === Q || L.installPath === ue),
      Se = !1;
    if (ze && typeof entry.source === "object" && entry.source.source === "command") {
      let ye = classifyMarketplacePath(L.installPath, {
          trustedRoots: getMarketplaceCandidatePaths(b, A, tryUnwrapTextPayload()),
        }),
        absolute = ye.absolute;
      Se =
        ye.suspect ||
        !(await (Nee(entry.source)
          ? isLiveLinkFarm(absolute)
          : absolute.endsWith(".zip")
            ? pathExists(absolute)
            : cacheDirHasPluginContentStrict(absolute, storageV5))) ||
        (Nee(entry.source)
          ? await Gi(absolute, Le ?? L.sourceProducerPath)
          : await isLiveLinkFarm(absolute, { unclassifiableIsFarm: !0 }));
    }
    if (ze && !Se) {
      if (
        typeof entry.source === "object" &&
        entry.source.source === "command" &&
        (L.sourceCommand !== o1(entry.source) || (Le !== void 0 && L.sourceProducerPath !== Le))
      )
        (await updateInstallationPathOnDisk(
          b,
          scope,
          projectPath,
          L.installPath,
          qe,
          L.gitCommitSha,
          L.resolvedVersion,
          { sourceCommand: o1(entry.source), sourceProducerPath: Le ?? L.sourceProducerPath },
          storageV5,
        ),
          emitProducerDirsChanged());
      let ye = L2e(entry.source, Ke);
      return De({
        outcome: "up_to_date",
        message: upToDateMessage(ce, qe),
        folderNote: ye
          ? `${y} is read from its folder, ${printableOrEmpty(Ie)}: nothing to update. Edits there take effect at the next session start or /reload-plugins.`
          : void 0,
        pluginId: b,
        newVersion: qe,
        oldVersion: version,
        scope: scope,
        refreshFailed: X !== void 0 ? !0 : void 0,
        refreshRefusedByPolicy: we || void 0,
      });
    }
    Q = await copyPluginToVersionedCache(Ie, b, qe, entry, q, {
      forceOverwrite: x || fe,
      storageV5: storageV5,
    });
    let installPath = L.installPath;
    if (
      (await updateInstallationPathOnDisk(
        b,
        scope,
        projectPath,
        Q,
        qe,
        tn,
        ae?.version,
        typeof entry.source === "object" && entry.source.source === "command"
          ? { sourceCommand: o1(entry.source), sourceProducerPath: Le ?? L.sourceProducerPath }
          : void 0,
        storageV5,
        typeof entry.source === "object" && entry.source.source === "claudeai"
          ? { claudeaiPluginId: entry.source.pluginId, archiveSha256: un }
          : void 0,
        endsWith ? samePluginSource(entry.source, void 0) : void 0,
      ),
      Le !== void 0)
    )
      emitProducerDirsChanged();
    if (installPath && installPath !== Q) {
      let ye =
        isStorageV5Enabled() && storageV5 !== void 0
          ? await loadInstalledPlugins(storageV5)
          : loadInstalledPluginsSync();
      if (!Object.values(ye.plugins).some((Te) => Te.some((Ze) => Ze.installPath === installPath)))
        await markPluginVersionOrphaned(installPath, storageV5);
    }
    let Ye = projectPath ? `${scope} (${projectPath})` : scope,
      sn = pinnedSha(b, entry.source),
      an = sn === void 0 ? void 0 : (tn ?? sn),
      Ue = displayableGitHeadName(qe),
      Qe = an
        ? `Plugin "${y}" updated to the listed commit ${an.slice(0, 7)}${Ue ? ` (version ${Ue})` : ""} for scope ${Ye}. Restart to apply changes.`
        : x && (version ?? "unknown") === "unknown"
          ? `Plugin "${y}" refreshed from source for scope ${Ye}. Restart to apply changes.`
          : `Plugin "${y}" updated from ${version || "unknown"} to ${qe}${Ge} for scope ${Ye}. Restart to apply changes.`;
    return {
      outcome: "updated",
      message:
        X === void 0
          ? Qe
          : ce.directoryRefreshFailed
            ? `${Qe} Warning: ${directoryUnreachableMessage()}.`
            : `${Qe} Warning: ${X}.`,
      pluginId: b,
      newVersion: qe,
      oldVersion: version,
      ...(tn && { gitCommitSha: tn }),
      scope: scope,
      refreshFailed: X !== void 0 ? !0 : void 0,
      refreshRefusedByPolicy: we || void 0,
      pinChanged: typeof L.gitCommitSha === "string" && typeof tn === "string" && L.gitCommitSha !== tn,
    };
  } finally {
    let R = getVersionedCachePath(b, qe);
    if (vn && Ie !== R && !resolve(R).startsWith(resolve(Ie) + sep))
      await me.rm(Ie, { recursive: !0, force: !0 });
  }
}
//@ chunk-pp50kewz.js:121835-121960 fingerprint = VALID_UPDATE_SCOPES (1)
function VALID_UPDATE_SCOPES_2(e) {
  let n = filterInstallationsForCurrentProject(e),
    i = n.length > 0 ? n : e;
  return ["local", "project", "user"].find((a) => i.some((o) => o.scope === a)) ?? "managed";
}
/**
 * 执行一次插件更新并整理成 CLI 输出用的结果对象（不存在时报“not installed”）。
 */
//@ chunk-pp50kewz.js:121960-123943 fingerprint = performPluginUpdate (0.358)
async function performPluginUpdate(e, n, i, a, o, u) {
  if (!a || a.length === 0)
    return {
      outcome: "failed",
      message: `Plugin "${n}" is not installed`,
      pluginId: e,
      scope: i,
      failureCode: "not_installed",
    };
  let h = getProjectPathForScope(i),
    filtered = a.filter((D) => D.scope === i),
    r = qP(filtered, i, h) ?? filtered[0];
  if (!r) {
    let D = h ? `${i} (${h})` : i;
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
  let { scope: scope, projectPath: projectPath, version: version, npmVersionSpec: npmVersionSpec } = r,
    I = (D) => (u ? annotateUpToDateResult(D, r, n, o) : Promise.resolve(D)),
    w = toNpmPluginSource({ packageName: n, versionSpec: npmVersionSpec }),
    b = join(anchoredPluginCachePath(), `${makeTempCachePathName("npm")}${Kqe}`),
    _e;
  try {
    (await getFsImplementation().mkdir(b),
      (_e = (await resolveNpmPackage(n, npmVersionSpec, { workDir: b, registry: r.npmRegistry })).version));
  } finally {
    await removeDirectoryTreeNoFollow(b).catch(() => {});
  }
  let ee = npmVersionSpec !== void 0 ? ` (tracking ${npmVersionSpec})` : "";
  if (_e === version || r.installPath === getVersionedCachePath(e, _e))
    return I({
      outcome: "up_to_date",
      message: `${n} is already at the latest version${ee} (${_e}).`,
      pluginId: e,
      newVersion: _e,
      oldVersion: version,
      scope: i,
    });
  let source = toNpmPluginSource({ packageName: n, versionSpec: _e }, r.npmRegistry).source,
    cacheResult = await cachePlugin(source, {
      manifest: { name: w.name },
      storageV5: o,
      isNpmMarketplaceLane: !0,
      directoryPin: pinnedSha(e, source) ?? null,
    }),
    npmResolution = cacheResult.npmResolution,
    X = npmResolution?.version ?? _e,
    versionedPath = getVersionedCachePath(e, X);
  try {
    ((versionedPath = await copyPluginToVersionedCache(cacheResult.path, e, X, w, void 0, { storageV5: o })),
      await updateInstallationPathOnDisk(
        e,
        scope,
        projectPath,
        versionedPath,
        X,
        null,
        void 0,
        void 0,
        o,
        void 0,
        void 0,
        {
          npmVersionSpec: npmVersionSpec,
          npmResolved: npmResolution?.tarballUrl ?? r.npmResolved,
          npmIntegrity: npmResolution?.integrity,
          npmRegistry: r.npmRegistry,
        },
      ));
    let oldVersionPath = r.installPath;
    if (oldVersionPath && oldVersionPath !== versionedPath) {
      let ce =
        isStorageV5Enabled() && o !== void 0 ? await loadInstalledPlugins(o) : loadInstalledPluginsSync();
      if (
        !Object.values(ce.plugins).some((pluginInstallations) =>
          pluginInstallations.some((inst) => inst.installPath === oldVersionPath),
        )
      )
        await markPluginVersionOrphaned(oldVersionPath, o);
    }
  } finally {
    if (
      cacheResult.path !== versionedPath &&
      !resolve(versionedPath).startsWith(resolve(cacheResult.path) + sep)
    )
      await removeDirectoryTreeNoFollow(cacheResult.path).catch(() => {});
  }
  let J = projectPath ? `${i} (${projectPath})` : i;
  return {
    outcome: "updated",
    message: `Plugin "${n}" updated from ${version || "unknown"} to ${X}${ee} for scope ${J}. Restart to apply changes.`,
    pluginId: e,
    newVersion: X,
    oldVersion: version,
    scope: i,
  };
}
/**
 * 归档来源插件下载会运行 headersHelper 时的警告。
 */
//@ chunk-pp50kewz.js:123943-124391 placement
async function archiveFetchWarning(e, n, i) {
  let a = n ?? (await getPluginByIdCacheOnly(e, i))?.entry;
  if (!a || typeof a.source !== "object" || a.source.source !== "archive") return null;
  if (isPluginBlockedByPolicy(e)) return null;
  let o = await loadKnownMarketplacesSafe(i),
    u = mE(e);
  if (u !== void 0 && isSourceDisallowedOrUnverifiable(Zb(o, u)?.source)) return null;
  let h = E$e(e, o),
    p;
  try {
    p = headersHelperNotRunReason({
      entry: a,
      archiveUrl: a.source.url,
      marketplaceSource: h,
      trustedSettingsEntryAuth: findSettingsArchiveEntry(u, a.name),
    });
  } catch (error) {
    if (error instanceof Eie) return null;
    throw error;
  }
  if (isHeadersHelperDisabledByPolicy(h, u)) return null;
  return getEntryHelperConsentSubject(p, a.source.url);
}
/**
 * 生成插件归档获取命令的披露文本：会把 helper 生成的请求头发到哪个地址、隐藏字符警告与实际运行的本地命令。
 */
//@ chunk-pp50kewz.js:124391-124642 placement
function archiveHelperDisclosure(e) {
  let n = describeArchiveFetchCommand(e);
  return (
    `Fetching this plugin's archive sends helper-minted headers to ${n.destination}; ` +
    (n.hiddenCharactersWarning ? `WARNING: ${n.hiddenCharactersWarning} ` : "") +
    `the local command it runs (headersHelper) is: ${n.command}`
  );
}
//@ chunk-pp50kewz.js:124642-124869 placement
function recordedSourceCommand(e, n, i) {
  let a = wpe(n);
  if (!a || !i || i.length === 0 || isPluginsDirOnLocalDisk()) return;
  let o = o1(a);
  return {
    kind: "recorded",
    command:
      i.find((h) => h.sourceCommand === o)?.sourceCommand ??
      i.find((h) => h.sourceCommand !== void 0)?.sourceCommand,
    pluginId: e,
  };
}
/**
 * 在已知市场中自动安装缺失的插件。
 */
//@ chunk-pp50kewz.js:124869-125641 placement
async function autoInstallFromMarketplace(e, n, i, a) {
  let o = n[e.marketplace]?.source;
  if (!o || isPluginDirectorySource(o)) return;
  if (!isOfficialMarketplaceName_3(e.marketplace)) return;
  let plugins = (
    isStorageV5Enabled() && i !== void 0 ? await loadInstalledPlugins(i) : loadInstalledPluginsSync()
  ).plugins;
  if (plugins[`${e.entry.name}@${e.marketplace}`]?.length) return;
  let h = samePluginSource(e.entry.source, sourceUrlAndRef(o));
  if (h === void 0) return;
  for (let [p, r] of Object.entries(n)) {
    if (!isPluginDirectorySource(r.source) || !isSourceAllowedByPolicy(r.source)) continue;
    if (Rmn(e.marketplace, e.entry) && !plugins[`${e.entry.name}@${p}`]?.length) continue;
    try {
      let found = (await getMarketplace(p, i, "install")).plugins.find(
        (plugin) => plugin.name === e.entry.name,
      );
      if (found && Prt(found.name) && samePluginSource(found.source, void 0) === h)
        return { entry: found, marketplace: p, marketplaceInstallLocation: r.installLocation };
    } catch (error) {
      if (error instanceof PluginDirectoryUnavailableError) a?.(error);
      logForDebugging(
        `Bare-name search for "${e.entry.name}": the ${OFFICIAL_MARKETPLACE_DISPLAY} could not be read, keeping ${e.marketplace}'s listing: ${errorMessage(error)}`,
      );
    }
  }
  return;
}
/**
 * 按名字在所有市场中搜索插件。
 */
//@ chunk-pp50kewz.js:125641-126162 placement
async function findPluginInMarketplaces(e, n, i) {
  let a = await loadKnownMarketplacesWithDeclared(n),
    o;
  for (let [u, h] of Object.entries(a)) {
    if (!isSourceAllowedByPolicy(h.source)) continue;
    try {
      let found = (await getMarketplace(u, n, "install")).plugins.find((plugin) => plugin.name === e);
      if (found) {
        let c = { entry: found, marketplace: u, marketplaceInstallLocation: h.installLocation };
        {
          let y = await autoInstallFromMarketplace(c, a, n, i);
          return y ? { ...y, preferredOver: c } : c;
        }
        return c;
      }
    } catch (error) {
      if (error instanceof Bd) {
        o ??= error;
        continue;
      }
      if (error instanceof PluginDirectoryUnavailableError) i?.(error);
      logForDebugging(
        `Failed to load marketplace "${u}" while searching for plugin "${e}": ${errorMessage(error)}`,
        { level: "error" },
      );
    }
  }
  if (o !== void 0) throw o;
  return;
}
//@ chunk-pp50kewz.js:126162-126219 placement
async function Gi(e, n) {
  return n === void 0 || (await hasEntriesOutsideTarget(e, n));
}
//@ chunk-pp50kewz.js:126219-126279 placement
function Tn(e, n, i) {
  return findPluginEntry(getSettingsForSourceForUpkeep(scopeToSettingSource(e))?.enabledPlugins, n, i);
}
//@ chunk-pp50kewz.js:126279-126378 placement
function yn() {
  let e = new Map();
  return (n) => {
    let i = e.get(n);
    if (i === void 0) ((i = groupEnabledPlugins(n)), e.set(n, i));
    return i;
  };
}
//@ chunk-pp50kewz.js:126378-126516 placement
function findPluginEntry(e, n, i) {
  if (!e) return;
  let a = isOfficialPluginId(n) ? i(e).byFold.get(nfcLower(n))?.key : findPluginName(Object.keys(e), n);
  return a === void 0 ? void 0 : { key: a, value: e[a] };
}
/**
 * 按作用域查找插件安装记录。
 */
//@ chunk-pp50kewz.js:126516-126997 placement
function locatePluginInstall(e, n, i) {
  let a;
  for (let p of sorted) {
    let r = Tn(p, e, i);
    if (r !== void 0) {
      a = { scope: p, ...r };
      break;
    }
  }
  let o = _Br(e),
    u = findPluginSetting(
      e,
      o.map(({ record: record }) => (record === void 0 ? void 0 : i(record))),
    ),
    h = u === void 0 ? void 0 : o[u.index]?.source;
  return {
    found: a,
    atRequested: n === void 0 ? void 0 : Tn(n, e, i),
    override:
      u !== void 0 && (h === "policySettings" || h === "flagSettings")
        ? { source: h, enabling: u.enabled, key: u.key }
        : void 0,
    decidingScope:
      h === "localSettings" || h === "projectSettings" || h === "userSettings"
        ? SETTING_SOURCE_TO_SCOPE[h]
        : void 0,
    effective: u?.enabled,
  };
}
//@ chunk-pp50kewz.js:126997-127038 placement
var sorted = [...VALID_INSTALLABLE_SCOPES].sort((e, n) => SCOPE_PRECEDENCE[n] - SCOPE_PRECEDENCE[e]);
/**
 * 插件被组织或策略阻止时的结果。
 */
//@ chunk-pp50kewz.js:127038-127856 placement
function pluginBlockedResult(e, n, i, a) {
  let o = pluginNamesEqual(a, e) ? "" : ` via its legacy "${stripInvisibleKeepEmoji(a)}" entry`,
    u = o ? ` (remove that entry, or add "${e}": true beside it)` : "";
  if (i === "policySettings")
    return {
      success: !1,
      message: n
        ? `Plugin "${e}" is blocked by your organization's policy${o} and cannot be enabled here \u2014 ask an admin${u}`
        : `Plugin "${e}" is turned on by your organization's managed settings and cannot be disabled here`,
      failureCode: n ? "plugin_policy_blocked" : "managed_settings_override",
    };
  return {
    success: !1,
    message: n
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
    if (o === void 0) continue;
    return (o === !0) === n ? void 0 : a;
  }
  return;
}
/**
 * 插件启用的锁定来源：仅策略启用的插件返回 policySettings；否则看覆盖来源是否为 flagSettings 等（属插件启用管理，误归入 permissionsLoader）。
 */
//@ chunk-pp50kewz.js:128053-128347 placement = loadAllPermissionRulesFromDisk (0.344)
function getPluginEnablingSource(e, n) {
  let i = normalizePluginId(e),
    a = canonicalPluginId(i);
  if (isBuiltinPluginId(a) && getBuiltinPlugin(parsePluginIdentifier(a).name)?.enabledFromPolicyOnly)
    return getBuiltinPlugins().enabled.some((h) => h.source === a) ? "policySettings" : void 0;
  let o = marketplaceSuffix(i);
  if (!isOfficialMarketplace(o)) return getPluginEnablementLockingSource(i, !1);
  let { override: override } = locatePluginInstall(i, void 0, n);
  return override?.enabling && (override.source === "flagSettings" || o === SYNCED)
    ? override.source
    : void 0;
}
//@ chunk-pp50kewz.js:128347-128406 placement = _temp7 (1)
function nt(e, n, i) {
  return n(e) || getPluginEnablingSource(e, i) === "policySettings";
}
/**
 * 插件由托管策略设置启用时返回拒绝结果（不能禁用或卸载）。
 */
//@ chunk-pp50kewz.js:128406-128531 placement
function managedPluginRefusal(e) {
  return getPluginEnablingSource(e, yn()) === "policySettings"
    ? { success: !1, message: MANAGED_PLUGIN_DISABLE_MESSAGE, failureCode: "managed_settings_override" }
    : void 0;
}
/**
 * 插件由 --settings 启用时返回附注："本会话仍启用"。
 */
//@ chunk-pp50kewz.js:128531-128641 placement
function flagSettingsEnabledNote(e) {
  return getPluginEnablingSource(e, yn()) === "flagSettings"
    ? " (still enabled this session: --settings keeps it on)"
    : "";
}
//@ chunk-pp50kewz.js:128641-128766 placement
function matchingEnabledKeys(e, n) {
  let keys = Object.keys(e ?? {});
  if (!isOfficialPluginId(n)) return keys.filter((o) => o === n);
  let a = nfcLower(n);
  return keys.filter((o) => nfcLower(o) === a);
}
/**
 * 写入 enabledPlugins（替换遗留键）。
 */
//@ chunk-pp50kewz.js:128766-129148 placement
function writeEnabledPlugins(e, n, i, a, o) {
  return updateSettingsForSourceWithTransform(
    e,
    (u) => {
      let fromEntries = Object.fromEntries(
        Object.entries({ ...a, [n]: i }).flatMap(([p, r]) => {
          let c = pluginSettingWriteTarget(u?.enabledPlugins, p);
          return [...c.replaced.map((y) => [y, void 0]), [c.written, r]];
        }),
      );
      return {
        enabledPlugins: {
          ...u?.enabledPlugins,
          ...Object.fromEntries(
            Object.keys(fromEntries).flatMap((p) =>
              matchingEnabledKeys(u?.enabledPlugins, p)
                .filter((r) => r !== p)
                .map((r) => [r, void 0]),
            ),
          ),
          ...fromEntries,
        },
      };
    },
    void 0,
    o,
  );
}
//@ chunk-pp50kewz.js:129148-129208 placement
function Hi(e, n) {
  return enabledPluginsBySource(e, n, void 0).map(({ record: record }) => record);
}
//@ chunk-pp50kewz.js:129208-129386 placement
function enabledPluginsBySource(e, n, i) {
  return reverse.map((a) => {
    let o = getSettingsForSourceForUpkeep(a)?.enabledPlugins;
    if (a !== e) return { source: a, record: o };
    let u = Uo(o ?? {}, matchingEnabledKeys(o, n));
    return { source: a, record: i === void 0 ? u : { ...u, [n]: i } };
  });
}
//@ chunk-pp50kewz.js:129386-129411 placement
var reverse = [...SETTING_SOURCES].reverse();
/**
 * 插件批量操作的错误转文本（用户可见错误原样，其他记日志后返回“X failed”）。属 CLI 处理器，见 lead 建议。
 */
//@ chunk-1qpz7qcd.js:7508-7648 fingerprint = disableAllPluginsOp (0.338)
function formatOperationFailure(e, r) {
  if (r instanceof WireSafeControlError) return sanitizeTelemetryString(errorMessage(r));
  if (isAbortError(r)) return sanitizeTelemetryString(errorMessage(r));
  return (logForDebugging(`${e} failed: ${errorMessage(r)}`, { level: "error" }), `${e} failed`);
}
/**
 * 按插件 ID 对一组条目分组（名字配错，见 lead 建议）。
 */
//@ chunk-csq9ftr9.js:8420-8587 callgraph-fingerprint = updatePluginOp (0.187)
function countByPluginKey(e) {
  let n = new Map();
  for (let { pluginId: pluginId } of e) {
    if (!pluginId) continue;
    let { name: pluginName, marketplace: marketplaceName } = parsePluginIdentifier_2(pluginId),
      f = lx(pluginName, marketplaceName);
    n.set(f, (n.get(f) ?? 0) + 1);
  }
  return n.size > 0 ? hashEntries(n) : void 0;
}
/**
 * 已下架插件 ID 的解析：排除已有结果的，从安装记录中找出仍存在的。
 */
//@ chunk-e6aww6q8.js:4444317-4444531 fingerprint = resolveDelistedPluginId (0.791)
async function resolveDelistedPluginId(e, n, r) {
  let filtered = (e ?? []).filter((y) => !n.some((S) => S.pluginId === y));
  if (filtered.length === 0) return [];
  let h = isStorageV5Enabled() && r !== void 0 ? await loadInstalledPlugins(r) : loadInstalledPluginsSync();
  if (PF(h)) return filtered;
  return filtered.filter((key) => h.plugins[key]?.some(isInstallationRelevantToCurrentProject) === !0);
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
