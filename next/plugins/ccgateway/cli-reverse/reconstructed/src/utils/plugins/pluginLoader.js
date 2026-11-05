/**
 * utils/plugins/pluginLoader.ts
 *
 * 插件加载核心：版本化缓存（目录/zip、link 模式）、各来源下载（npm/git/github/git-subdir/archive/command）、manifest 解析、由目录构造插件对象、合并会话/市场/同步/内置插件，loadAllPlugins/loadAllPluginsCacheOnly 及其全局缓存。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/pluginLoader.ts
 * pieces: chunk-0yw3taqg.js (1), chunk-4hx0rq5z.js (1), chunk-5xgkngpb.js (196), chunk-6vxyfwtv.js (1), chunk-b08ck61p.js (1)
 * attribution: fingerprint 21, placement 128, affinity 1, layout 44, file-local 2, callgraph-witnessed 2, callgraph-fingerprint 1, sole-consumer 1
 */
import * as pathModule from "path";
import { join, sep, relative, isAbsolute, parse, resolve as resolve_2, dirname, basename } from "path";
import {
  realpath,
  lstat,
  stat as stat_2,
  readdir,
  rm,
  mkdir,
  copyFile,
  readlink,
  symlink,
  readFile,
} from "fs/promises";
import { constants, createWriteStream } from "fs";
import { createHash, randomBytes } from "crypto";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { import_mapValues } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import {
  escapeControlCharsForDisplay,
  truncateToLength,
  firstLineOf,
  plural,
  nfcLower,
} from "../stringUtils.js";
import {
  preferHttpsGitTransport,
  runGitWithCeilingDirs,
  SSH_BATCH_CONFIG_ARGS,
  prepareGitWorkDir,
  SAFE_UPLOAD_PACK_ARG_2,
  pickGitNoPromptEnv,
} from "../gitSafeExec.js";
import { GITHUB_HOST } from "../git/githubUrl.js";
import {
  isValidNpmPackageNameLoose,
  fetchNpmPackage,
  npmMarketplaceEnabled,
  NPM_DIRECT_INSTALL_DISABLED_MESSAGE,
  toNpmMarketplaceSource,
  NPM_REGISTRY,
} from "./npmPluginSource.js";
import {
  getOriginalCwd,
  markSyncedPluginDirsLoadedHere,
  markSyncedPluginLaneOpened,
  hasRegisteredSyncedPluginDirs,
  getSyncedPluginRowId,
  getOriginalCwdOrNull,
  getInlinePlugins,
  getInlinePluginsNoMcp,
  getInlinePluginUrls,
  getSyncedPluginAttestation,
  setAttestedOfficialPluginIds,
  setLastSyncedLaneLoad,
  isDiskless,
} from "../../bootstrap/state.js";
import { tildify } from "../path.js";
import {
  getPluginsDirectory,
  parseVersionCachePath,
  sanitizePluginId,
  escapeNpmPackageForDir,
  cacheStorageKeyOrFallback,
  getPluginSeedDirs,
  versionCacheStorageSpace,
  isVersionRootStorageKey,
  storageKeyToCachePath,
  isLocalMarketplaceEntry,
  isUsingCoworkPlugins,
} from "./pluginDirectories.js";
import { PLUGIN_CACHE_DIRNAME, recordProducerDir } from "./pluginCachePaths.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errorMessage,
  isPathAbsent,
  getErrnoCode,
  sanitizeErrnoForTelemetry,
  isENOENT,
  isFsInaccessibleCode,
  isFsInaccessible,
  getErrnoPath as getErrnoPath_2,
  withTelemetryMessage,
  toError,
} from "../errors.js";
import { isSameFilesystem, fileSwappedError, copyFileNoFollow } from "./safeCopy.js";
import {
  versionPathOccupantError,
  classifyCacheEntry,
  hasRealEntries,
  resolveLinkChainFromParent,
  createLinkTargetScreen,
  isPathUnder,
  withdrawScreenMarker,
  materializePluginLinks,
  materializeVersionLinksOnce,
  isCacheSkipEntry,
  isCacheEntryName,
  isTempSiblingName,
  freshSymlinkCopyBudget,
  consumeSymlinkCopyBudget,
  pathHasNodeModulesSegment,
  sweepStaleTempSiblings,
  makeTempSiblingName,
  hasLinkedAncestorBelow,
  moveIntoVersionPath,
  removeVersionDirIfIdle,
  removeDirectoryTreeNoFollow,
  removeStaleLeftover,
  dirHasAnyEntry,
} from "./pluginCacheMaterialize.js";
import {
  removePathEntry,
  removeDirectoryTreeNoFollow as removeDirectoryTreeNoFollow_2,
  classifyDirEntry,
} from "../fsRemove.js";
import { logForDebugging } from "../debug.js";
import {
  writeInUseMarker,
  removeInUseMarker,
  isPluginVersionInUse,
  isSymlinkOrFalse,
  sweepInUseMarkers,
  releaseMarkersOutside,
} from "./inUseMarkers.js";
import {
  parsePluginIdentifier,
  parsePluginIdentifier_2,
  isOfficialMarketplace as isOfficialMarketplace_2,
  isOfficialMarketplaceName_3,
  isRequiredPlugin,
  findPluginSetting,
  marketplaceSuffix,
  isPluginEnabled_2,
  pluginNameAliases,
  normalizePluginId,
} from "./pluginIdentifier.js";
import {
  pluginManifestPathSchemas,
  PluginHooksSchema,
  PluginMonitorsArraySchema,
  redactNpmTarball,
  PluginIdSchema,
  isAsciiImpersonatingOfficialName,
  redactMarketplaceSource,
  isLocalMarketplaceSource,
  isNpmPluginId,
  gitSha,
  PLUGIN_NAME_FORBIDDEN_CHARS_RE,
  INVISIBLE_CHARS_RE,
  ALLOWED_OFFICIAL_MARKETPLACE_NAMES,
} from "./schemas.js";
import { formatStorageError, storageErrorCode } from "../storage/storageErrors.js";
import { isNonRegularError } from "../../services/memorySync/pathScrub.js";
import { pathExists, pathPresence } from "../fsSafety/atomicWriteStaging.js";
import {
  listStorageScopeNames,
  ManifestLoadError,
  MANIFEST_ERROR_CLASSES,
  isGitUsable,
  validatePluginManifest,
  describePluginDirShape,
  loadSkillsAsPlugins_2,
  isSkillCustomizationBookingAllowed,
} from "./pluginManifestRead.js";
import { STORAGE_SPACES } from "../storage/storageSpaces.js";
import { ORPHAN_MARKER_FILE } from "./cacheUtils.js";
import {
  filterInstallationsForCurrentProject,
  removeInstallationsAndRefreshSnapshot,
  primeInstalledPluginsCache,
  loadInstalledPlugins,
  loadInstalledPluginsSync,
  getInstalledPluginsSnapshot,
  hasFailedInstalledPluginsRead,
  readInstalledPluginsLenient,
  getInstalledListRefusal,
  readInstalledPluginsFile,
} from "./installedPluginsManager.js";
import {
  classifyMarketplacePath,
  getMarketplaceCandidatePaths,
  UNSAFE_PATH_EXPLANATION,
  isWindowsPluginInsideLocalMarketplace,
  resolveMarketplaceEntryPath,
  entryResolutionError,
  localMarketplacePathExists,
  normalizeRegistryKey,
} from "./localMarketplacePaths.js";
import {
  CommandSourceError,
  classifyLinkFarm,
  readLinkFarmTarget,
  hasEntriesOutsideTarget,
  isPristineLinkFarm,
  isLinkModeCommandSource,
  checkRelinkTarget,
  TEMP_CACHE_CLONE_SUFFIX,
  makeTempCachePathName,
  TEMP_CACHE_LINK_SUFFIX,
  holdCommandSourceForOrg,
  PLUGIN_JSON,
  removeIgnoredEntries,
  findPluginRootInExtracted,
  pluginRootHasMarker,
  PLUGIN_MANIFEST_PATH as PLUGIN_MANIFEST_PATH_2,
  commandSourceSpecOf,
  isLiveLinkFarm,
  shouldRefreshCommandPlugins,
  MARKETPLACE_MANIFEST_PATH,
  PLUGIN_ROOT_MARKERS,
  MAX_SPILL_BYTES,
  describeCommandOutputMode,
} from "./commandSource.js";
import {
  redactUrlsInMessage,
  redactKnownUrls,
  redactUrlQuery,
  redactUrlsTracked,
  redactUrlsInText,
  replaceAll,
  REDACTED_URL,
} from "../redaction/urlRedaction.js";
import {
  printableMessage,
  truncateWithEllipsis as truncateWithEllipsis_2,
  printableName,
  printableOrEmpty,
  quotedPrintable,
} from "../printableName.js";
import { getFsImplementation } from "../fsOperations.js";
import { isNodeModulesSegment } from "../pathSegments.js";
import { getPlatform } from "../platform.js";
import {
  resolvePathChain,
  realpathAllowMissing as realpathAllowMissing_2,
  isUntrustedLinkPath,
} from "../pathResolution.js";
import {
  isPluginZipCacheEnabled,
  publishDirectoryAsZip,
  extractZipToDirectory,
  getZipExtractionState,
  getSessionPluginCachePath,
} from "./zipCache.js";
import {
  validatePathWithinBase,
  pluginBindingValues,
  isUnboundOfficialPlugin,
  isDirectoryRepositoryChanged,
  getBoundRepositoryKeys,
} from "./pluginInstallationHelpers.js";
import { installPluginDependencies, checkLockfileSupported } from "./pluginDependencies.js";
import { provisionBinaryAssets } from "./pluginBinaryAssets.js";
import {
  pluginCacheStorageScope,
  calculatePluginVersion,
  probePluginGitHead,
  pluginVersionOrNull,
  getPluginCloneUrl,
  pluginGitHead,
} from "./pluginVersioning.js";
import { assertFullCommitSha, verifyPinnedSha, hasSymlinkBetween } from "./gitShaPin.js";
import {
  resolveGitSshConfig,
  readGitSshCommand,
  isSshAuthFailureOutput,
  sshNotConfiguredMessage,
  httpsFailedRetrySshMessage,
} from "./gitSshConfig.js";
import { execFileNoThrow, execFileNoThrowWithCwd } from "../execFileNoThrow.js";
import { gitExe } from "../git.js";
import { logPluginFetch, classifyFetchError } from "./fetchTelemetry.js";
import { runGitInOwnWorkTree, isNetworkGitUrl } from "../git/gitLanes.js";
import { parsePluginGitUrl } from "./gitUrl.js";
import { GIT_MISSING_MAC_MESSAGE } from "../git/gitMissingMessage.js";
import { retryFsOp, retryTransient } from "../atomicPublishWrite.js";
import { jsonStringify, jsonParse } from "../slowOperations.js";
import { installClaudeAiPlugin } from "./claudeAiPluginInstall.js";
import {
  withFeatureTelemetry,
  logFeatureOk,
  logFeatureBad,
  logFeatureSad,
} from "../../services/analytics/featureTelemetry.js";
import { sameOrigin as sameOrigin_2 } from "../network/privateHostCheck.js";
import { downloadAndVerifyBinary } from "./archiveDownload.js";
import {
  assertManifestContained,
  resolveComponentPath,
  reportIfPathEscapes,
  resolveContainmentRoots,
  specCoversDefaultDir,
  findSymlinkEscape,
  checkPluginContainment,
} from "./pluginPathContainment.js";
import { stripBom } from "../json.js";
import {
  readManifestDependencyPins,
  isDependencyAutoInstallState,
  verifyAndDemote,
} from "./dependencyResolver.js";
import {
  hasNestedHooks,
  SETTINGS_SKIPPED_KEYS,
  looksLikeHookMatcher,
  HookValidationError,
  GUARD_HOOK_EVENTS,
  UNLOADABLE_GUARD_NOTE,
  validateHooksSetting,
  hasGuardHooks_2,
  parseHooksSetting,
} from "../../schemas/hookEntryValidation.js";
import { isPlainObject as isPlainObject_6 } from "../isPlainObject.js";
import { warnUnknownHooksJsonKeys } from "./loadPluginHooks.js";
import {
  logPluginFolderShadowed,
  SKILLS_DIR,
  SETTINGS_KEYS_WITH_PLUGIN_ENUM,
  BUILTIN,
  logPluginRenamed,
  SYNCED,
  INLINE_PLUGIN_MARKETPLACE,
  commandIdGeneration,
  registerCommandId,
  clearCommandIds,
} from "../telemetry/pluginTelemetry.js";
import { logError } from "../log.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { getSettingsFieldSchema } from "../settings/types.js";
import {
  tryUnwrapTextPayload,
  loadKnownMarketplacesSafe,
  isKnownMarketplacesReadFailure,
  getMarketplaceCacheOnly,
  validateReservedMarketplaceEntry,
  isImpersonatingOfficialMarketplace,
  findPluginDirectoryEntry,
  getPluginByIdCacheOnly,
  findMissedListingEntry,
  loadPluginDirectoryMarketplace,
  isRegistryOwnedByName,
  pluginDirectoryNotInstallableReason,
  seedDirFor,
  isWorkspaceTrustedForMarketplace,
} from "./marketplaceManager.js";
import { runCommandHint, claudeCommand } from "../worktreeResumeHint.js";
import {
  npmResolutionPolicyRefusal,
  isMarketplaceRestrictionPolicyActive,
  getStrictKnownMarketplaces,
  isSourceDisallowedOrUnverifiable,
  pluginDirectoryPolicyBlock,
  isSourceAllowedByPolicy,
  isSourceInBlocklist,
  isPluginDirectoryDisabledByPolicy,
  areCommandPluginSourcesDisabledByPolicy,
  noteHeldForTheAnswer,
  commandPluginSourcesDisabledMessage,
  isOfficialMarketplaceSourceVouched,
  areSideloadFlagsDisabledByPolicy,
  sideloadFlagsBlockedMessage,
} from "./marketplacePolicy.js";
import { getAddDirEnabledPlugins } from "./addDirPluginSettings.js";
import { getSettings_DEPRECATED, getSettingsForSource } from "../settings/settings.js";
import {
  admissionKindsFor,
  admissionCauseFor,
  validateDeclaredMarketplaceSource,
  logMarketplaceNoticeOnce,
  isOfficialMarketplaceSourced,
  marketplaceSourceOfPlugin,
  findUrlMarketplaceHeaders,
  findSettingsArchiveEntry,
} from "./marketplaceSources.js";
import { isClaudeAiMarketplaceSource } from "./claudeAiMarketplaces.js";
import {
  isPluginDirectorySource,
  OFFICIAL_MARKETPLACE_NAME,
  OFFICIAL_MARKETPLACE_DISPLAY,
} from "./officialMarketplaceNames.js";
import { sleep, withTimeout as withTimeout_2 } from "../sleep.js";
import { resolvePluginRename, migrateRenamedPluginsInSettings } from "./pluginRenames.js";
import { bindingsWithReadFailure, findBindingKeysFor } from "./pluginDirectoryBindings.js";
import { toComparablePath, isPathWithin as isPathWithin_2 } from "../fsJunctions.js";
import { getResolvedMarketplacesCacheDir, NOT_RECORDED } from "./marketplaceNames.js";
import { formatSourceForDisplay } from "./marketplaceHelpers.js";
import { parseRepoWithRef, samePluginSource, pinnedSha } from "./pluginSourceUrl.js";
import { SETTING_SOURCES } from "../settings/constants.js";
import { PLUGIN_LINK_HEADER, thinkbackStorageKey } from "./pluginLinks.js";
import { hasDotSegmentAlias } from "../pathClassification.js";
import { isServerPluginId, getPluginAttribution } from "./pluginAttribution.js";
import { getPluginRegistry } from "./pluginLoadState.js";
import { stripInvisibleKeepEmoji, cleanOptionalText_2 } from "../settings/marketplaceSettingsAliases.js";
import { marketplaceNameOfId, resolveArchiveDownloadHeaders } from "./headersHelper.js";
import { CLAUDE_PLUGINS_OFFICIAL } from "./officialMarketplace.js";
import { isOfficialDirectoryPlugin } from "./pluginDirectoryTelemetry.js";
import { isSubpathOf } from "../pathPrefix.js";
import { isSafeZipPath } from "../dxt/zip.js";
import { stripGenerationSuffix } from "./syncedItems.js";
import { claimOnce } from "../../services/api/verificationRequired.js";
import { fromEnum, lit as lit_2 } from "../../services/analytics/safeMetadata.js";
import { desktopSkillsPluginDir, isTopHostSession } from "../sessionShape.js";
import { isLocalSettingsGitTracked } from "../config.js";
import {
  settingsSourcesReversed,
  getEnabledPluginsBySource,
  findUserDisabledOverrides,
} from "./pluginSettingsSources.js";
import { getProxyFetchOptions } from "../proxy.js";
import {
  markSyncedFolderRefused,
  hasSyncedContent,
  syncSettingsEnabled,
  isPluginsSyncVetoed,
  skillKeyFromPath,
} from "../../services/plugins/accountSync/syncedPluginHooks.js";
import {
  listSyncedPluginDirsOnly,
  getRegisteredSyncedDirs,
  listSyncedPluginDirs,
  syncedPluginsRoot,
} from "../claudeAiSync/pluginsSync.js";
import { ANTHROPIC_SKILLS } from "../../skills/syncedSkills.js";
import { isPersonalConfigRestricted } from "../personalConfigRestriction.js";
import { pMap } from "../../../vendor/p-map/index.js";
import { logEvent } from "../../services/analytics/index.js";
import { countWhere } from "../collections.js";
import { matchPolicyPluginEntry, getPolicyEnabledPluginEntries } from "./managedPlugins.js";
import { managedHooksPolicyStamp_2, EMPTY_POLICY_STAMP } from "../../plugins/functionHooks/policyGate.js";
import { notePluginFullLoad } from "../startupTiming.js";
import { env } from "../env.js";
import { checkHooksModulesFlag } from "../../services/analytics/growthbookCredentials.js";
import { getBuiltinPlugins } from "../../plugins/builtinPlugins.js";
import { shouldAllowManagedHooksOnlyByPolicy } from "../hooks/hooksConfigSnapshot.js";
import { collectSyncedSkillOverrides, persistSyncedPluginsOff } from "./syncedPluginSettings.js";
import {
  pluginCommandBase,
  invalidateCommandNames,
  clearPluginCommandBase,
  setPluginCommandBase,
} from "../settings/commandSyncNames.js";
import { _ } from "../../services/modelCatalog/publishedCatalog.js";
import { isRemoteCowork } from "../entrypointKinds.js";
import { manifestRelativePath } from "./validate/validatePluginDirectory.js";
import { buildSecretScanResult } from "../../skills/bundled/pluginAuthoring/secretScanTool.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:616281-616451 placement
function mapStringsDeep(value, expandData) {
  if (typeof value === "string") return expandData(value);
  if (Array.isArray(value)) return value.map((item) => mapStringsDeep(item, expandData));
  if (typeof value === "object" && value !== null)
    return import_mapValues(value, (value) => mapStringsDeep(value, expandData));
  return value;
}
//@ chunk-5xgkngpb.js:616952-616969 placement
var MAX_LISTED_ITEMS = 5;
var MAX_QUOTED_ITEM_LENGTH = 40;
//@ chunk-5xgkngpb.js:616969-617037 placement
/**
 * truncateListItem：截断列表项并补省略号。
 */
function truncateListItem(item) {
  let escaped = escapeControlCharsForDisplay(item);
  return escaped.length <= MAX_QUOTED_ITEM_LENGTH
    ? escaped
    : `${truncateToLength(escaped, MAX_QUOTED_ITEM_LENGTH)}...`;
}
//@ chunk-5xgkngpb.js:617037-617072 placement
/**
 * quotedListItem：列表项加引号。
 */
function quotedListItem(item) {
  return `"${truncateListItem(item)}"`;
}
//@ chunk-5xgkngpb.js:617072-617166 placement (2.1.88 match: formatFailureDetails, 0.776)
/**
 * 列表前 N 项用逗号连接，多余的写“and N more”。
 */
function formatFailureDetails_2(items) {
  let remaining = items.length - MAX_LISTED_ITEMS;
  return items.slice(0, MAX_LISTED_ITEMS).join(", ") + (remaining > 0 ? ` and ${remaining} more` : "");
}
//@ chunk-5xgkngpb.js:734869-734925 placement (2.1.88 match: getVersionedZipCachePath, 1)
/**
 * 路径是否以 .zip 结尾（忽略大小写）。
 */
function isZipPathCaseInsensitive(path) {
  return path.toLowerCase().endsWith(".zip");
}
//@ chunk-5xgkngpb.js:4431156-4431236 fingerprint (2.1.88 match: resolveGitSubdirUrl, 0.713)
/**
 * GitHub owner/repo 转克隆 URL：偏好 HTTPS 时 https://github.com/x.git，否则 git@github.com:x.git。
 */
function githubRepoToCloneUrl(url) {
  return preferHttpsGitTransport() ? `https://github.com/${url}.git` : `git@${GITHUB_HOST}:${url}.git`;
}
//@ chunk-5xgkngpb.js:4497657-4497877 fingerprint (2.1.88 match: installFromNpm, 0.359)
/**
 * 构造 npm 命令的 --registry 参数；作用域包另加 --@scope:registry。
 */
function buildNpmRegistryArgs(options, packageName) {
  if (!options.registry) return [];
  let packageSpec =
    packageName !== undefined && packageName.startsWith("@") && isValidNpmPackageNameLoose(packageName)
      ? packageName.slice(0, packageName.indexOf("/"))
      : undefined;
  return packageSpec === undefined
    ? ["--registry", options.registry]
    : ["--registry", options.registry, `--${packageSpec}:registry=${options.registry}`];
}
//@ chunk-5xgkngpb.js:4603771-4603919 placement (2.1.88 match: discoverSkillDirsForPaths, 0.562)
/**
 * skill 显示路径：project 作用域且在 .claude/skills 下显示为 ./ 相对路径，否则缩写主目录。
 */
function displaySkillsDirPath(plugin) {
  if (plugin.scope === "project") {
    let skillDir = join(getOriginalCwd(), ".claude", "skills");
    if (plugin.path.startsWith(skillDir + sep)) return "." + sep + relative(getOriginalCwd(), plugin.path);
  }
  return tildify(plugin.path);
}
//@ chunk-5xgkngpb.js:4603919-4603954 placement
function pluginCacheDirPath() {
  return join(getPluginsDirectory(), PLUGIN_CACHE_DIRNAME);
}
//@ chunk-5xgkngpb.js:4603954-4604045 placement
function anchoredPluginCachePath() {
  let cacheDir = pluginCacheDirPath();
  return isAbsolute(cacheDir) && (sep === "/" || parse(cacheDir).root.length > 1)
    ? resolve_2(cacheDir)
    : resolve_2(getOriginalCwd(), cacheDir);
}
//@ chunk-5xgkngpb.js:4604045-4604102 placement
function orphanMarkerCoordsV5(versionPath, storageV5) {
  return isStorageV5Enabled() && storageV5 !== undefined
    ? parseVersionCachePath(versionPath, anchoredPluginCachePath())
    : null;
}
//@ chunk-5xgkngpb.js:4604102-4604179 placement
function strictCacheAddressable(storageV5) {
  return (
    isStorageV5Enabled() &&
    storageV5 !== undefined &&
    parseVersionCachePath(join(anchoredPluginCachePath(), "_", "_", "_"), anchoredPluginCachePath()) !== null
  );
}
//@ chunk-5xgkngpb.js:4604179-4604230 placement
async function versionParentContained(cachePath) {
  return (await versionParentState(cachePath)) === "real";
}
//@ chunk-5xgkngpb.js:4604230-4604393 placement
function versionParentUnexaminableError(pluginId, error) {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `Could not examine the plugin directory of ${pluginId} (${errorMessage(error)}); retry the install.`,
    "plugin cache version parent could not be examined",
  );
}
//@ chunk-5xgkngpb.js:4604393-4604639 placement
async function isPlainPluginParentDir(parentDir) {
  let cacheRoot = anchoredPluginCachePath();
  let relPath = relative(cacheRoot, parentDir);
  let parts = relPath.split(sep);
  if (
    !relPath ||
    isAbsolute(relPath) ||
    parts.length !== 2 ||
    parts.some((part) => part === "" || part === "." || part === "..")
  )
    return false;
  let [marketplace, plugin] = parts;
  if (marketplace === undefined || plugin === undefined) return false;
  let realRoot = await realpath(cacheRoot);
  return (
    (await isPlainDirectory(join(realRoot, marketplace))) &&
    (await isPlainDirectory(join(realRoot, marketplace, plugin)))
  );
}
//@ chunk-5xgkngpb.js:4604639-4604834 placement
async function isPlainDirectory(dirPath) {
  if ((await lstat(dirPath)).isDirectory() && (await isSameFilesystem(dirname(dirPath), basename(dirPath))))
    return true;
  let stat = await stat_2(dirPath).catch((error) => {
    if (isPathAbsent(error) || getErrnoCode(error) === "ELOOP") return null;
    throw error;
  });
  return stat !== null && stat.isDirectory();
}
//@ chunk-5xgkngpb.js:4604834-4605528 placement
/**
 * 各阶段版本父目录越界的遥测消息。
 */
var CONTAINMENT_FAILURE_MESSAGES = {
  "before relink": "plugin cache version parent not contained before relink",
  "during relink": "plugin cache version parent not contained during relink",
  "before reuse": "plugin cache version parent not contained before reuse",
  "before move": "plugin cache version parent not contained before move",
  "during move": "plugin cache version parent not contained during move",
  "before staging": "plugin cache version parent not contained before staging",
  "before overwrite": "plugin cache version parent not contained before overwrite",
  "during publish": "plugin cache version parent not contained during publish",
  "after a failed archive": "plugin cache version parent not contained after a failed archive",
};
//@ chunk-5xgkngpb.js:4605528-4605886 placement
async function requireVersionParentContained(cachePath, pluginId, version, verb, stage, state) {
  if (state === undefined && (await versionParentState(cachePath)) === "real") return;
  let message = `Could not ${verb} ${pluginId} ${version}: its plugin directory is not a directory (a dangling link, or a file wearing the marketplace or plugin folder name); make it a directory, or retry the install if it was being moved.`;
  throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    message,
    CONTAINMENT_FAILURE_MESSAGES[stage] ?? "plugin cache version parent not contained",
  );
}
//@ chunk-5xgkngpb.js:4605886-4606002 placement
async function versionParentState(cachePath) {
  try {
    return (await isPlainPluginParentDir(dirname(cachePath))) ? "real" : "refused";
  } catch (error) {
    if (isPathAbsent(error)) return "absent";
    throw versionParentUnexaminableError(cachePath, error);
  }
}
//@ chunk-5xgkngpb.js:4606002-4606159 placement
function getPluginCachePath(cachePath, pluginId, version, verb = "cache") {
  return versionPathOccupantError(
    `Could not ${verb} ${pluginId} ${version}: what occupies its cache path ${cachePath} could not be examined; retry the load or the install.`,
  );
}
//@ chunk-5xgkngpb.js:4606159-4606704 placement
/**
 * 缓存/归档路径上的残留链接删不掉时抛错。
 */
async function removeStrayLinkOrThrow(linkPath, pluginId, version, verb, where) {
  if ((await removePathEntry(linkPath).catch(() => "directory")) !== "directory") return;
  if (where === "archive")
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Could not ${verb} ${pluginId} ${version}: a link sits at its archive path and could not be removed; remove that link from the plugin cache, then retry the install.`,
      "plugin cache stray link at the archive path not removable",
    );
  throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `Could not ${verb} ${pluginId} ${version}: a link sits at its cache path and could not be removed; remove that link from the plugin cache, then retry the install.`,
    "plugin cache stray link not removable before replace",
  );
}
//@ chunk-5xgkngpb.js:4606704-4606997 placement
async function clearOccupantForReplace(linkPath, pluginId, version, verb = "cache") {
  switch (await classifyCacheEntry(linkPath)) {
    case "absent":
      return "done";
    case "other":
      return "recurse";
    case "symlink":
      await removeStrayLinkOrThrow(linkPath, pluginId, version, verb, "cache");
      logForDebugging(
        `Plugin ${pluginId} version ${version}: removed a link at its cache path ${linkPath} as an entry before replacing it`,
      );
      return "done";
    default:
      throw getPluginCachePath(linkPath, pluginId, version, verb);
  }
}
//@ chunk-5xgkngpb.js:4606997-4607342 placement
async function strictArchivePresent(archivePath, pluginId, version, assertParent) {
  switch (await classifyCacheEntry(archivePath)) {
    case "absent":
      return false;
    case "other":
      return true;
    case "symlink":
      await assertParent();
      await removeStrayLinkOrThrow(archivePath, pluginId, version, "cache", "archive");
      logForDebugging(
        `Plugin ${pluginId} version ${version}: removed a link wearing its archive's name at ${archivePath}; it is never served \u2014 the archive is rebuilt or the cached directory used`,
      );
      return false;
    default:
      throw getPluginCachePath(archivePath, pluginId, version);
  }
}
//@ chunk-5xgkngpb.js:4607342-4607431 placement
async function isCacheDirReusable(cachePath) {
  return (
    (await isCachePathClean(cachePath)) &&
    (await dirHasPluginRoot(cachePath)) &&
    (await hasRealEntries(cachePath, {
      whenUnreadable: false,
    }))
  );
}
//@ chunk-5xgkngpb.js:4607431-4607693 placement
async function decideCachedVersionReuse(cachePath, pluginId, version, linkFarm, sourcePath) {
  let kind = await classifyCacheEntry(cachePath);
  if (kind === "absent") return "absent";
  if (kind === "unexaminable") throw getPluginCachePath(cachePath, pluginId, version);
  if (kind === "symlink") return (await isCacheDirReusable(cachePath)) ? "serve" : "republish";
  return (
    linkFarm
      ? (await classifyLinkFarmReuse(cachePath, sourcePath)).reusable
      : await hasRealEntries(cachePath, {
          whenUnreadable: false,
        })
  )
    ? "serve"
    : "republish";
}
//@ chunk-5xgkngpb.js:4607693-4607864 placement
async function isStagedTreeIntact(stagedPath) {
  try {
    if (!(await lstat(stagedPath)).isDirectory()) return false;
    let parent = dirname(stagedPath);
    let [realStaged, realParent] = await Promise.all([realpath(stagedPath), realpath(parent)]);
    return realStaged === join(realParent, basename(stagedPath)) && (await isPlainPluginParentDir(parent));
  } catch {
    return false;
  }
}
//@ chunk-5xgkngpb.js:4607864-4608497 placement
/**
 * 暂存树被替换时按阶段（install/publish/archive）抛错。
 */
async function assertStagedTreeIntact(stagedPath, pluginId, version, phase) {
  if (await isStagedTreeIntact(stagedPath)) return;
  if (phase === "install")
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Could not install dependencies for ${pluginId} ${version}: its staged tree was replaced after the copy; retry the load or the install.`,
      "plugin cache staged tree swapped before dependency install",
    );
  if (phase === "publish")
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Could not publish ${pluginId} ${version}: its staged tree was replaced before publishing; retry the load or the install.`,
      "plugin cache staged tree swapped before publishing",
    );
  throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `Could not archive ${pluginId} ${version}: its staged tree was replaced before archiving; retry the load or the install.`,
    "plugin cache staged tree swapped before archiving",
  );
}
//@ chunk-5xgkngpb.js:4608497-4608656 placement
async function isCachePathClean(cachePath) {
  try {
    let [rootReal, parentReal] = await Promise.all([
      realpath(anchoredPluginCachePath()),
      realpath(dirname(cachePath)),
    ]);
    return (
      (await resolveLinkChainFromParent(
        join(parentReal, basename(cachePath)),
        createLinkTargetScreen(rootReal),
        undefined,
        {
          trustedRoot: rootReal,
        },
      )) === "clean"
    );
  } catch {
    return false;
  }
}
//@ chunk-5xgkngpb.js:4608656-4609050 placement
/**
 * 版本目录是缓存下的普通目录时返回其真实路径。
 */
async function resolvePlainVersionDir(versionDir) {
  let relPath = relative(anchoredPluginCachePath(), versionDir);
  let parts = relPath.split(sep);
  if (
    !relPath ||
    isAbsolute(relPath) ||
    parts.length !== 3 ||
    parts.some((part) => part === "" || part === "." || part === "..")
  )
    return null;
  try {
    if (!(await isPlainPluginParentDir(dirname(versionDir)))) return null;
    if (
      !(await lstat(versionDir)).isDirectory() ||
      !(await isSameFilesystem(dirname(versionDir), basename(versionDir)))
    )
      return null;
    let [realVersion, realParent, rootReal] = await Promise.all([
      realpath(versionDir),
      realpath(dirname(versionDir)),
      realpath(anchoredPluginCachePath()),
    ]);
    if (realVersion === rootReal || isPathUnder(rootReal, realVersion)) return null;
    return realVersion === join(realParent, basename(versionDir)) ? realVersion : null;
  } catch (error) {
    if (isPathAbsent(error)) return null;
    throw error;
  }
}
//@ chunk-5xgkngpb.js:4609050-4609637 placement
/**
 * 严格安装步骤前确认版本目录仍是普通目录。
 */
async function requirePlainVersionDir(versionDir, phase) {
  let resolved;
  try {
    resolved = await resolvePlainVersionDir(versionDir);
  } catch (error) {
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Could not prepare ${versionDir} for its ${phase} (it could not be examined: ${errorMessage(error)}); retry the install.`,
      "plugin cache version directory could not be examined before a strict install step",
    );
  }
  if (resolved === null && parseVersionCachePath(versionDir, anchoredPluginCachePath()) !== null)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Could not prepare ${versionDir} for its ${phase}: it is no longer a plain version directory under its marketplace and plugin directories inside the plugin cache (it was removed or replaced after the copy); retry the install.`,
      "plugin cache version directory replaced before a strict install step",
    );
  return resolved;
}
//@ chunk-5xgkngpb.js:4609637-4610382 placement
async function unvouchBeforeDependencyStep(versionDir, storageV5, { staged = false } = {}) {
  if (!strictCacheAddressable(storageV5)) return;
  if ((await requirePlainVersionDir(versionDir, "dependency install")) === null) {
    logForDebugging(
      `Plugin cache: ${versionDir} is not a version directory inside the plugin cache; its dependency step runs without a liveness record or vouch withdrawal`,
      {
        level: "warn",
      },
    );
    return;
  }
  if (!staged && !(await writeInUseMarker(versionDir, storageV5)))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Could not prepare ${versionDir} for its dependency install (this session could not be recorded as its user); retry the install.`,
      "plugin cache liveness record could not be written before dependency install",
    );
  if (await withdrawScreenMarker(versionDir)) return;
  throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `Could not prepare ${versionDir} for its dependency install (the conversion marker could not be withdrawn); retry the install.`,
    "plugin cache conversion marker could not be withdrawn before dependency install",
  );
}
//@ chunk-5xgkngpb.js:4610382-4611158 placement
async function unmarkBeforeArchiving(versionDir, storageV5, { staged = false } = {}) {
  if (!strictCacheAddressable(storageV5) || staged) return true;
  let resolved = await resolvePlainVersionDir(versionDir).catch(() => null);
  if (resolved === null) {
    logForDebugging(
      `Plugin cache: ${versionDir} is left as a directory this time (fully usable): it is not a version directory inside the plugin cache`,
      {
        level: "warn",
      },
    );
    return false;
  }
  if (await isPluginVersionInUseSafe(versionDir, storageV5)) {
    logForDebugging(
      `Plugin cache: ${versionDir} is left as a directory this time (fully usable): another session is using it`,
    );
    return false;
  }
  if ((await realpath(versionDir).catch(() => null)) !== resolved) {
    logForDebugging(
      `Plugin cache: ${versionDir} is left as a directory this time: it moved while its users were probed`,
      {
        level: "warn",
      },
    );
    return false;
  }
  if (!(await removeInUseMarker(versionDir, storageV5))) {
    logForDebugging(
      `Plugin cache: ${versionDir} is left as a directory this time (fully usable): this session's liveness record in it could not be withdrawn \u2014 it is never archived with one inside`,
      {
        level: "warn",
      },
    );
    return false;
  }
  return true;
}
//@ chunk-5xgkngpb.js:4611158-4611639 placement
async function removeFreshCopyUnlessInUse(versionDir, storageV5) {
  if (!strictCacheAddressable(storageV5)) return;
  let resolved = await resolvePlainVersionDir(versionDir).catch(() => null);
  if (resolved === null) return;
  let rootReal = await realpath(anchoredPluginCachePath()).catch(() => null);
  if (rootReal === null || resolved === rootReal || !isPathUnder(resolved, rootReal)) {
    logForDebugging(
      `Cache at ${versionDir} left in place after the failed install: it lies outside the plugin cache`,
    );
    return;
  }
  if (
    (await isPluginVersionInUseSafe(versionDir, storageV5)) ||
    (await realpath(versionDir).catch(() => null)) !== resolved
  ) {
    logForDebugging(
      `Cache at ${versionDir} left in place after the failed install: another session is using it, liveness could not be determined, or it moved`,
    );
    return;
  }
  await removeDirectoryTreeNoFollow_2(resolved).catch(() => {});
}
//@ chunk-5xgkngpb.js:4611639-4612832 placement
async function rescreenCachedPluginTree(versionDir, storageV5) {
  if (!strictCacheAddressable(storageV5)) return;
  let resolved = await requirePlainVersionDir(versionDir, "post-install screen");
  if (resolved === null) {
    logForDebugging(
      `Plugin cache: post-install screen of ${versionDir} not run: it is not a version directory inside the plugin cache`,
      {
        level: "warn",
      },
    );
    return;
  }
  if (!(await withdrawScreenMarker(versionDir)))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Could not re-screen ${versionDir} after its dependency install (the conversion marker could not be withdrawn); retry the install.`,
      "plugin cache conversion marker could not be withdrawn before the post-install screen",
    );
  if (await isPluginVersionInUseSafe(versionDir, storageV5)) {
    logForDebugging(
      `Plugin cache: post-install screen of ${versionDir} left to a later load: another session is using it (or liveness could not be determined)`,
    );
    return;
  }
  if ((await realpath(versionDir).catch(() => null)) !== resolved) {
    logForDebugging(
      `Plugin cache: post-install screen of ${versionDir} left to a later load: the directory moved while its liveness was probed`,
    );
    return;
  }
  let screenResult = await materializePluginLinks(versionDir, copyDir, {
    mode: "migrate",
  }).catch((error) => {
    logForDebugging(`Plugin cache: post-install screen of ${versionDir} failed: ${errorMessage(error)}`, {
      level: "warn",
    });
    return null;
  });
  if ((screenResult === null || !screenResult.vouched) && !(await withdrawScreenMarker(versionDir)))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Could not vouch for ${versionDir} after its dependency install, and the conversion marker could not be withdrawn; retry the install.`,
      "plugin cache conversion marker could not be withdrawn after the post-install screen",
    );
}
//@ chunk-5xgkngpb.js:4612832-4613051 placement
async function materializeCachedLinks(versionDir, storageV5, linkFarm = false) {
  if (!strictCacheAddressable(storageV5)) return;
  if (linkFarm) {
    logForDebugging(
      `materializeLinks: ${versionDir}: link-mode command source (used in place), not converted`,
    );
    return;
  }
  await materializeVersionLinksOnce(versionDir, anchoredPluginCachePath(), copyDir, storageV5, () =>
    isPluginVersionInUse(
      versionDir,
      {
        refusedCountsAsLive: false,
      },
      storageV5,
    ).catch(() => true),
  );
}
//@ chunk-5xgkngpb.js:4613051-4613161 placement
function getLegacyCachePath(baseDir, pluginId, version) {
  let replaced = version.replace(/[^a-zA-Z0-9\-_.]/g, "-");
  if (replaced === "." || replaced === "..") replaced = "-";
  return join(getPluginCacheDirIn(baseDir, pluginId), replaced);
}
//@ chunk-5xgkngpb.js:4613161-4613270 placement
function getPluginCacheDirIn(baseDir, pluginId) {
  let { name, marketplace } = parsePluginIdentifier(pluginId);
  return join(
    baseDir,
    PLUGIN_CACHE_DIRNAME,
    sanitizePluginId(marketplace || "unknown"),
    marketplace === pluginManifestPathSchemas
      ? escapeNpmPackageForDir(name)
      : sanitizePluginId(name || pluginId),
  );
}
//@ chunk-5xgkngpb.js:4613270-4613290 placement
var weakSet_8; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:4613270", () => {
  weakSet_8 = new WeakSet();
});
//@ chunk-5xgkngpb.js:4613290-4613328 placement (2.1.88 match: getVersionedCachePath, 0)
/**
 * 版本化缓存目录 <plugins>/cache/<marketplace>/<plugin>/<version>。
 */
function getVersionedCachePath(pluginId, version) {
  return getLegacyCachePath(getPluginsDirectory(), pluginId, version);
}
//@ chunk-5xgkngpb.js:4613328-4613703 placement
/**
 * 通过 storageV5 存储后端读取插件缓存内的文件，返回 {outcome:"found",content}/"absent"/"error"；路径不在插件缓存内返回 null。
 */
async function readFileViaStorageBackend(storageV5, fullPath) {
  let storageKey = cacheStorageKeyOrFallback(fullPath, anchoredPluginCachePath());
  if (storageKey === null) return null;
  let readResult = await storageV5.read([storageKey]);
  if (!readResult.ok) {
    let error = readResult.error;
    return {
      outcome: "error",
      detail: formatStorageError(error),
      telemetryCode:
        "telemetryCode" in error && typeof error.telemetryCode === "string" ? error.telemetryCode : undefined,
    };
  }
  let item = readResult.value.items[0];
  if (!item?.found)
    return {
      outcome: "absent",
    };
  return {
    outcome: "found",
    content: Buffer.from(item.value).toString("utf-8"),
  };
}
//@ chunk-5xgkngpb.js:4613703-4613935 placement
async function isCachePathPresentInStorage(storageV5, fullPath) {
  let storageKey = cacheStorageKeyOrFallback(fullPath, anchoredPluginCachePath());
  if (storageKey === null) return null;
  let statResult = await storageV5.statMeta(storageKey);
  if (statResult.ok) return true;
  let telemetryCode =
    "telemetryCode" in statResult.error && typeof statResult.error.telemetryCode === "string"
      ? statResult.error.telemetryCode
      : undefined;
  return isNonRegularError(telemetryCode) ? null : false;
}
//@ chunk-5xgkngpb.js:4613935-4614025 placement
async function isCachePresent(storageV5, fullPath) {
  let result =
    isStorageV5Enabled() && storageV5 !== undefined
      ? await isCachePathPresentInStorage(storageV5, fullPath)
      : null;
  return result !== null ? result : pathExists(fullPath);
}
//@ chunk-5xgkngpb.js:4614025-4614420 placement
/**
 * 检查插件组件路径：present/absent/{unknown, errno}。
 */
async function probeComponentPath(storageV5, fullPath) {
  let storageKey =
    isStorageV5Enabled() && storageV5 !== undefined
      ? cacheStorageKeyOrFallback(fullPath, anchoredPluginCachePath())
      : null;
  if (storageV5 !== undefined && storageKey !== null) {
    let statResult = await storageV5.statMeta(storageKey);
    if (statResult.ok) return "present";
    let code = storageErrorCode(statResult.error);
    if (statResult.error.code === "NotFound" || code === "ENOENT" || code === "ENOTDIR") return "absent";
    if (!isNonRegularError(code))
      return {
        unknown: formatStorageError(statResult.error),
        errno: sanitizeErrnoForTelemetry({
          code,
        }),
      };
  }
  try {
    await stat_2(fullPath);
    return "present";
  } catch (error) {
    return isENOENT(error) || getErrnoCode(error) === "ENOTDIR"
      ? "absent"
      : {
          unknown: errorMessage(error),
          errno: sanitizeErrnoForTelemetry(error),
        };
  }
}
//@ chunk-5xgkngpb.js:4614420-4614626 placement
function reportUncheckablePath(errors, source, name, component, relPath, unknown) {
  logForDebugging(`Plugin ${name}: could not check ${relPath} (${unknown.unknown}); not loading it`, {
    level: "error",
  });
  errors.push({
    type: "path-not-found",
    source,
    plugin: name,
    path: relPath,
    component,
    errno: unknown.errno ?? "UNKNOWN",
  });
}
//@ chunk-5xgkngpb.js:4614626-4614838 placement (2.1.88 match: _temp2, 1)
async function statPluginPath(storageV5, fullPath) {
  let result =
    isStorageV5Enabled() && storageV5 !== undefined
      ? await isCachePathPresentInStorage(storageV5, fullPath)
      : null;
  if (result !== null)
    return {
      exists: result,
      isDirectory: false,
    };
  try {
    return {
      exists: true,
      isDirectory: (await stat_2(fullPath)).isDirectory(),
    };
  } catch {
    return {
      exists: false,
      isDirectory: false,
    };
  }
}
//@ chunk-5xgkngpb.js:4614838-4615333 placement
/**
 * 缓存目录（或存储作用域）中是否有非忽略项。
 */
async function dirHasRealEntries(dirPath, storageV5, isCacheEntryName = isCacheSkipEntry) {
  let coords = orphanMarkerCoordsV5(dirPath, storageV5);
  if (storageV5 !== undefined && coords !== null) {
    let listing = await listStorageScopeNames(storageV5, {
      namespace: "pluginCache",
      marketplace: coords.marketplace,
      plugin: coords.plugin,
      version: coords.version,
    });
    if (listing.error !== undefined) {
      let error = listing.error;
      if ("telemetryCode" in error && isFsInaccessibleCode(error.telemetryCode)) return false;
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Failed to list plugin cache dir: ${formatStorageError(error)}`,
        "failed to list plugin cache dir (v5 backend error)",
      );
    }
    return listing.names.some(({ name }) => !isCacheEntryName(name));
  }
  let names;
  try {
    names = await readdir(dirPath);
  } catch (error) {
    if (isFsInaccessible(error)) return false;
    throw error;
  }
  return names.some((name) => !isCacheEntryName(name));
}
//@ chunk-5xgkngpb.js:4615333-4615363 placement
var LINKS_MATERIALIZED_MARKER = ".links_materialized";
//@ chunk-5xgkngpb.js:4615363-4615536 placement
/**
 * 判断版本化缓存目录是否完整可用；storageV5 下若有 .links_materialized 标记则按链接已物化方式检查。
 */
async function cacheDirHasPluginContentStrict(cachePath, storageV5) {
  if (
    !isStorageV5Enabled() ||
    storageV5 === undefined ||
    parseVersionCachePath(cachePath, anchoredPluginCachePath()) === null
  )
    return dirHasRealEntries(cachePath);
  let markerStat = await lstat(join(cachePath, LINKS_MATERIALIZED_MARKER)).catch(() => null);
  return markerStat !== null && markerStat.isFile()
    ? dirHasRealEntries(cachePath, storageV5, isCacheEntryName)
    : dirHasRealEntries(cachePath, undefined, isCacheEntryName);
}
//@ chunk-5xgkngpb.js:4615536-4615743 placement
async function removeCacheInUseMarker(cachePath, storageV5) {
  if (await isSymlinkOrFalse(cachePath)) return;
  let coords = orphanMarkerCoordsV5(cachePath, storageV5);
  if (storageV5 !== undefined && coords !== null) {
    await storageV5.delete(
      STORAGE_SPACES.pluginCache(coords.marketplace, coords.plugin, coords.version, [ORPHAN_MARKER_FILE]),
    );
    return;
  }
  await rm(join(cachePath, ORPHAN_MARKER_FILE), {
    force: true,
  }).catch(() => {});
}
//@ chunk-5xgkngpb.js:4615743-4616074 placement
/**
 * 在一个插件的多个安装记录中挑第一个 installPath 可信且缓存存在的；都不存在时返回第一个可信的或第一条。
 */
async function pickUsableInstallation(installations, { storageV5, trustedRoots = [] } = {}) {
  let relevant = installations && filterInstallationsForCurrentProject(installations);
  if (!relevant || relevant.length === 0) return;
  if (relevant.length === 1) return relevant[0];
  let fallback;
  for (let installation of relevant) {
    if (!installation.installPath) continue;
    let { absolute, suspect } = classifyMarketplacePath(installation.installPath, {
      trustedRoots,
    });
    if (suspect) continue;
    fallback ??= installation;
    if (
      absolute.endsWith(".zip")
        ? await pathExists(absolute)
        : await cacheDirHasPluginContentStrict(absolute, storageV5)
    )
      return installation;
  }
  return fallback ?? relevant[0];
}
//@ chunk-5xgkngpb.js:4616074-4616115 placement (2.1.88 match: getVersionedZipCachePath, 1)
/**
 * 版本化缓存的 zip 路径（目录路径 + .zip）。
 */
function getVersionedZipCachePath(pluginId, version) {
  return `${getVersionedCachePath(pluginId, version)}.zip`;
}
//@ chunk-5xgkngpb.js:4616115-4616223 placement
async function findSeedCachePath(pluginId, version) {
  for (let seedDir of getPluginSeedDirs()) {
    let legacyCachePath = getLegacyCachePath(seedDir, pluginId, version);
    try {
      if (await dirHasRealEntries(legacyCachePath)) return legacyCachePath;
    } catch {}
  }
  return null;
}
//@ chunk-5xgkngpb.js:4616223-4616320 placement (2.1.88 match: formatRelativeTimeAgo, 0.75)
async function probeSeedForPlugin(pluginId, version, mode) {
  return (
    (await findSeedCachePath(pluginId, version)) ??
    (mode === "always" || version === "unknown" ? await probeSeedCacheAnyVersion(pluginId) : null)
  );
}
//@ chunk-5xgkngpb.js:4616320-4616528 placement
async function probeSeedCacheAnyVersion(pluginId) {
  for (let seedDir of getPluginSeedDirs()) {
    let pluginDir = dirname(getLegacyCachePath(seedDir, pluginId, "_"));
    try {
      let found = [];
      for (let name of await readdir(pluginDir)) {
        if (isTempSiblingName(name)) continue;
        let versionDir = join(pluginDir, name);
        if (await dirHasRealEntries(versionDir)) found.push(versionDir);
      }
      if (found.length === 1) return found[0];
    } catch {}
  }
  return null;
}
//@ chunk-5xgkngpb.js:4616528-4616567 placement
function isCommandSourceError(error) {
  return error instanceof CommandSourceError;
}
//@ chunk-5xgkngpb.js:4616567-4616640 placement
function commandSourceErrorMessage(error, redact = redactUrlsInMessage) {
  return isCommandSourceError(error)
    ? redact(
        printableMessage(error, {
          isComposed: isCommandSourceError,
        }),
      )
    : printableMessage(redact(errorMessage(error)));
}
//@ chunk-5xgkngpb.js:4616640-4616659 placement
var MAX_MANIFEST_PROBLEMS = 20;
var MAX_PROBLEM_TEXT_LENGTH = 500;
//@ chunk-5xgkngpb.js:4616659-4617158 placement
/**
 * manifest 解析/校验错误转插件错误（脱敏、截断）。
 */
function manifestErrorToPluginError(error, source, pluginName) {
  if (!(error instanceof ManifestLoadError)) return;
  let manifestPath = redactUrlsInMessage(error.manifestPath);
  let mapped = error.problems
    .slice(0, MAX_MANIFEST_PROBLEMS)
    .map((problem) => truncateWithEllipsis_2(redactUrlsInMessage(problem), MAX_PROBLEM_TEXT_LENGTH));
  if (error.problems.length > MAX_MANIFEST_PROBLEMS)
    mapped.push(`and ${error.problems.length - MAX_MANIFEST_PROBLEMS} more`);
  return error.errorClass === MANIFEST_ERROR_CLASSES.jsonInvalid
    ? {
        type: "manifest-parse-error",
        source,
        ...(pluginName !== undefined && {
          plugin: pluginName,
        }),
        manifestPath,
        parseError: mapped.join(", "),
      }
    : {
        type: "manifest-validation-error",
        source,
        ...(pluginName !== undefined && {
          plugin: pluginName,
        }),
        manifestPath,
        validationErrors: mapped,
        ...(error.errorClass === MANIFEST_ERROR_CLASSES.containment && {
          containmentRefused: true,
        }),
      };
}
//@ chunk-5xgkngpb.js:4617158-4617425 placement
async function classifyLinkFarmReuse(farmDir, farmDir_2) {
  let classification = await classifyLinkFarm(farmDir);
  if (classification === "not-live")
    return {
      live: false,
      reusable: false,
      unclassifiable: false,
    };
  if (classification === "unclassifiable")
    return {
      live: true,
      reusable: false,
      unclassifiable: true,
    };
  let linkFarmTarget = await readLinkFarmTarget(farmDir_2);
  return {
    live: true,
    reusable: linkFarmTarget !== undefined && !(await hasEntriesOutsideTarget(farmDir, linkFarmTarget)),
    unclassifiable: false,
  };
}
//@ chunk-5xgkngpb.js:4617425-4617507 placement
async function isPluginVersionInUseSafe(cachePath, storageV5) {
  try {
    return await isPluginVersionInUse(
      cachePath,
      {
        excludeSelf: true,
      },
      storageV5,
    );
  } catch {
    return true;
  }
}
//@ chunk-5xgkngpb.js:4617507-4617580 placement
async function copyPluginDir(sourceDir, targetDir, containmentRoot, useStorageBackend) {
  await copyDir(
    sourceDir,
    targetDir,
    sourceDir,
    targetDir,
    containmentRoot,
    useStorageBackend,
    new Set(),
    freshSymlinkCopyBudget(),
    false,
    false,
    true,
  );
}
//@ chunk-5xgkngpb.js:4617580-4617786 placement (2.1.88 match: isRealPathWithinTeamDir, 1)
async function lstatChildBigintOrUndefined(realCandidate) {
  for (let seedDir of getPluginSeedDirs()) {
    let pluginDir = dirname(getLegacyCachePath(seedDir, realCandidate, "_"));
    try {
      for (let name of await readdir(pluginDir)) {
        if (isTempSiblingName(name)) continue;
        if (await dirHasRealEntries(join(pluginDir, name))) return true;
      }
    } catch (error) {
      if (isENOENT(error) || getErrnoCode(error) === "ENOTDIR") continue;
      return true;
    }
  }
  return false;
}
//@ chunk-5xgkngpb.js:4617786-4621442 placement
async function copyDir(
  sourceDir,
  targetDir,
  containmentRoot = sourceDir,
  viewRoot = targetDir,
  containmentBase = containmentRoot,
  strict = false,
  cycleSet = new Set(),
  budget = freshSymlinkCopyBudget(),
  budgeted = false,
  noFollow = false,
  skipFarms = false,
) {
  if (strict) await mkdir(targetDir);
  else await getFsImplementation().mkdir(targetDir);
  let sourceResolved = resolve_2(sourceDir);
  let targetResolved = resolve_2(targetDir);
  let nestedDirName = targetResolved.startsWith(sourceResolved + sep)
    ? relative(sourceResolved, targetResolved).split(sep)[0]
    : undefined;
  let entries = await readdir(sourceDir, {
    withFileTypes: true,
  });
  let realSourceOnce;
  let realRootOnce;
  let screenOnce;
  let isTop = !budgeted && resolve_2(sourceDir) === resolve_2(containmentRoot);
  for (let entry of entries) {
    if (nestedDirName !== undefined && entry.name === nestedDirName) continue;
    if (skipFarms && isPristineLinkFarm(entry.name)) continue;
    let info = await classifyDirEntry(sourceDir, entry);
    if ((noFollow || strict) && entry.isDirectory() && info.isSymbolicLink)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Refusing to copy ${join(sourceDir, entry.name)}: it is no longer a directory as listed \u2014 a link or Windows junction stands there (planted, or swapped during the copy). Plugin trees must hold plain directories.`,
        "plugin copy source directory entry is a link at descent",
      );
    let sourcePath = join(sourceDir, entry.name);
    let targetPath = join(targetDir, entry.name);
    if (strict && isTop && !isNodeModulesSegment(entry.name) && isCacheEntryName(entry.name)) {
      logForDebugging(`copyDir: not copying shipped cache bookkeeping ${sourcePath}`);
      continue;
    }
    if (info.isDirectory) {
      if (budgeted) consumeSymlinkCopyBudget(budget, 1, 0);
      if ((noFollow || strict) && !(await lstat(sourcePath)).isDirectory())
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Refusing to copy ${sourcePath}: it is no longer a directory (swapped during the copy).`,
          "plugin copy source directory swapped mid-copy",
        );
      if (strict && getPlatform() === "windows") {
        realSourceOnce ??= await realpath(sourceDir);
        if (!(await isSameFilesystem(realSourceOnce, entry.name)))
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `Refusing to copy ${sourcePath}: it resolves somewhere other than its own name (a junction or mount point).`,
            "plugin copy source directory is a reparse point",
          );
      }
      await copyDir(
        sourcePath,
        targetPath,
        containmentRoot,
        viewRoot,
        containmentBase,
        strict,
        cycleSet,
        budget,
        budgeted,
        noFollow,
        false,
      );
    } else if (info.isFile) {
      if (strict) {
        let stat = await lstat(sourcePath);
        if (!stat.isFile()) throw fileSwappedError(sourcePath);
        if (budgeted) consumeSymlinkCopyBudget(budget, 1, stat.size);
      }
      if (noFollow)
        await copyFileNoFollow(sourcePath, targetPath, {
          exclusive: strict,
          nonBlocking: strict,
        });
      else if (strict) await copyFile(sourcePath, targetPath, constants.COPYFILE_EXCL);
      else await copyFile(sourcePath, targetPath);
    } else if (info.isSymbolicLink) {
      let linkTarget;
      try {
        linkTarget = info.linkTarget ?? (await readlink(sourcePath));
      } catch (error) {
        if (getErrnoCode(error) !== "EINVAL")
          logForDebugging(`copyDir: readlink failed for ${sourcePath}: ${errorMessage(error)}`, {
            level: "warn",
          });
        continue;
      }
      if (strict) {
        realRootOnce ??= await realpath(containmentRoot).catch(() => resolve_2(containmentRoot));
        screenOnce ??= createLinkTargetScreen(realRootOnce);
        let verdict;
        try {
          verdict = await resolveLinkChainFromParent(
            join(realRootOnce, relative(resolve_2(containmentRoot), resolve_2(sourcePath))),
            screenOnce,
            linkTarget,
            {
              trustedRoot: realRootOnce,
            },
          );
        } catch (error) {
          verdict = "unexaminable";
          logForDebugging(`copyDir: cannot examine symlink ${sourcePath}: ${errorMessage(error)}`, {
            level: "warn",
          });
        }
        if (verdict !== "clean") {
          logForDebugging(
            `copyDir: dropping symlink ${sourcePath} -> ${linkTarget} (${verdict === "network" ? "names a network host" : verdict === "loop" ? "symlink loop" : verdict === "unexaminable" ? "could not be examined" : verdict === "unsupported" ? "unsupported target spelling" : "dangling"})`,
            {
              level: verdict === "unexaminable" ? "warn" : "debug",
            },
          );
          continue;
        }
      } else if (resolvePathChain(sourcePath, containmentBase)) {
        logForDebugging(`copyDir: dropping a symlink whose target chain cannot be trusted: ${sourcePath}`, {
          level: "warn",
        });
        continue;
      }
      let realTarget;
      try {
        realTarget = await realpath(sourcePath);
      } catch {
        if (!strict && !isAbsolute(linkTarget)) {
          let resolvedTarget = resolve_2(dirname(sourcePath), linkTarget);
          if (isPathUnder(resolvedTarget, resolve_2(containmentRoot))) {
            await symlink(linkTarget, targetPath);
            continue;
          }
        }
        logForDebugging(`copyDir: skipping broken symlink ${sourcePath} -> ${linkTarget}`);
        continue;
      }
      let realRoot;
      try {
        realRoot = await realpath(containmentRoot);
      } catch {
        realRoot = containmentRoot;
      }
      let realBase;
      try {
        realBase = await realpath(containmentBase);
      } catch {
        realBase = containmentBase;
      }
      let targetInsideRoot = isPathUnder(realTarget, realRoot);
      let targetInNodeModules = pathHasNodeModulesSegment(relative(containmentRoot, sourcePath));
      if (targetInsideRoot && (!strict || targetInNodeModules)) {
        let relInRoot = relative(realRoot, realTarget);
        let viewTarget = join(viewRoot, relInRoot);
        let relativeTarget = relative(dirname(targetPath), viewTarget);
        await symlink(relativeTarget, targetPath);
      } else if (
        targetInsideRoot ||
        (isPathUnder(realTarget, realBase) && !isPathUnder(realRoot, realTarget))
      ) {
        if (strict) {
          let ancestorTarget = join(realRoot, relative(resolve_2(containmentRoot), sourceResolved));
          if (isPathUnder(ancestorTarget, realTarget)) {
            logForDebugging(
              `copyDir: skipping symlink to an ancestor directory ${sourcePath} -> ${realTarget}`,
            );
            continue;
          }
        }
        if (cycleSet.has(realTarget)) {
          logForDebugging(`copyDir: skipping cyclic symlink target ${sourcePath} -> ${realTarget}`);
          continue;
        }
        let targetStat = await (strict || noFollow ? lstat : stat_2)(realTarget).catch((error) => {
          logForDebugging(
            `copyDir: stat failed while materializing ${sourcePath} -> ${realTarget}: ${errorMessage(error)}`,
            {
              level: "warn",
            },
          );
          return;
        });
        if (!targetStat) continue;
        if (targetStat.isSymbolicLink())
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `Refusing to copy ${sourcePath}: its target is no longer what it resolved to (swapped during the copy).`,
            "plugin copy symlink target swapped mid-copy",
          );
        if (targetStat.isFile()) {
          if (strict) consumeSymlinkCopyBudget(budget, 1, targetStat.size);
          if (strict || noFollow)
            await copyFileNoFollow(realTarget, targetPath, {
              exactMode: true,
              exclusive: true,
              nonBlocking: strict,
            });
          else await copyFile(realTarget, targetPath);
        } else if (targetStat.isDirectory()) {
          if (strict) consumeSymlinkCopyBudget(budget, 1, 0);
          cycleSet.add(realTarget);
          try {
            await copyDir(
              realTarget,
              targetPath,
              realTarget,
              targetPath,
              containmentBase,
              strict,
              cycleSet,
              budget,
              strict,
              noFollow,
            );
          } finally {
            cycleSet.delete(realTarget);
          }
        } else logForDebugging(`copyDir: skipping non-regular symlink target ${sourcePath} -> ${realTarget}`);
      } else
        logForDebugging(
          `copyDir: skipping symlink escaping containment root: ${sourcePath} -> ${realTarget}`,
        );
    }
  }
}
//@ chunk-5xgkngpb.js:4621442-4621671 placement
function assertSymlinkFree(result, pluginPath) {
  if (result.failed > 0 || result.readOnly)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Plugin tree at ${pluginPath} could not be made symlink-free (${result.readOnly ? "not writable" : `${result.failed} failed`}); refusing to cache it`,
      "plugin tree could not be made symlink-free",
    );
}
//@ chunk-5xgkngpb.js:4621671-4622101 placement
/**
 * 存储中暂存副本是否为空（分页列举）。
 */
async function isStorageScopeEmpty(storageV5, scope) {
  let cursor;
  do {
    let page = await storageV5.listEntries(scope, {
      skipKeyStats: true,
      skipScopeStats: true,
      ...(cursor === undefined
        ? {}
        : {
            cursor,
          }),
    });
    if (!page.ok)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Failed to list the staged plugin copy (${formatStorageError(page.error)}); retry the load or the install.`,
        "plugin cache staged copy could not be listed",
      );
    let skipped = page.value.skipped;
    if (
      page.value.items.length > 0 ||
      (skipped !== undefined && Object.values(skipped).some((skippedCount) => skippedCount > 0))
    )
      return false;
    cursor = page.value.cursor;
  } while (cursor !== undefined);
  return true;
}
//@ chunk-5xgkngpb.js:4622101-4628592 placement (2.1.88 match: copyPluginToVersionedCache, 0.356)
/**
 * 把插件复制进版本化缓存 <plugins>/cache/<marketplace>/<plugin>/<version>（zip 缓存开启时再打成 .zip）。已有完整缓存直接复用；其他会话正在用时推迟覆盖；种子缓存命中直接用；link 模式建立链接农场；复制后装依赖、拉 binaries，再原子发布。返回最终路径。
 */
async function copyPluginToVersionedCache(
  sourcePath,
  pluginId,
  version,
  marketplaceEntry,
  marketplaceDir,
  options,
) {
  let zipCacheMode = isPluginZipCacheEnabled();
  let linkFarm = options?.linkFarm ?? isLinkModeCommandSource(marketplaceEntry?.source);
  let forceOverwrite = options?.forceOverwrite ?? false;
  let storageV5 = options?.storageV5;
  let useStorageBackend = strictCacheAddressable(storageV5);
  let cachePath = getVersionedCachePath(pluginId, version);
  let zipPath = getVersionedZipCachePath(pluginId, version);
  let assertParent = (verb, stage, state) =>
    requireVersionParentContained(cachePath, pluginId, version, verb, stage, state);
  let parentState = useStorageBackend ? await versionParentState(cachePath) : "real";
  if (parentState === "refused") await assertParent("cache", "before reuse", parentState);
  let reuseDecision;
  let reuseOnce = () =>
    (reuseDecision ??=
      parentState === "absent"
        ? Promise.resolve("absent")
        : decideCachedVersionReuse(cachePath, pluginId, version, linkFarm, sourcePath));
  if (zipCacheMode) {
    if (
      parentState !== "absent" &&
      (useStorageBackend
        ? await strictArchivePresent(zipPath, pluginId, version, () => assertParent("cache", "before reuse"))
        : await pathExists(zipPath))
    ) {
      if (!forceOverwrite) {
        logForDebugging(`Plugin ${pluginId} version ${version} already cached at ${zipPath}`);
        if (useStorageBackend && (await versionParentContained(cachePath).catch(() => false)))
          await Promise.all([sweepStaleTempSiblings(cachePath), sweepStaleTempSiblings(zipPath)]);
        return zipPath;
      }
      if (useStorageBackend) await assertParent("cache", "before overwrite");
      await rm(zipPath, {
        force: true,
      });
    } else if (useStorageBackend && !forceOverwrite) {
      if ((await reuseOnce()) === "serve") {
        await materializeCachedLinks(cachePath, storageV5, linkFarm);
        await removeCacheInUseMarker(cachePath, storageV5);
        logForDebugging(
          `Plugin ${pluginId} version ${version} already cached at ${cachePath} (a directory; its archive not made yet)`,
        );
        return cachePath;
      }
    }
  } else if (useStorageBackend ? (await reuseOnce()) !== "absent" : await pathExists(cachePath)) {
    if (!useStorageBackend || (await reuseOnce()) === "serve")
      await materializeCachedLinks(cachePath, storageV5, linkFarm);
    let wasLive = false;
    let reusable;
    if (useStorageBackend) reusable = (await reuseOnce()) === "serve";
    else {
      let farmReuse = await classifyLinkFarmReuse(cachePath, sourcePath);
      wasLive = farmReuse.live;
      reusable = isLinkModeCommandSource(marketplaceEntry?.source)
        ? farmReuse.reusable
        : farmReuse.unclassifiable || (!wasLive && (await dirHasRealEntries(cachePath)));
    }
    if (!forceOverwrite && reusable) {
      await removeCacheInUseMarker(cachePath, storageV5);
      logForDebugging(`Plugin ${pluginId} version ${version} already cached at ${cachePath}`);
      return cachePath;
    }
    if ((reusable || wasLive) && (await isPluginVersionInUseSafe(cachePath, storageV5))) {
      logForDebugging(
        `Cache for ${pluginId} at ${cachePath} is in use by another session; deferring overwrite until it exits`,
      );
      return cachePath;
    }
    if (!useStorageBackend || reusable) {
      if (useStorageBackend) await assertParent("cache", "before overwrite");
      if (!useStorageBackend || (await clearOccupantForReplace(cachePath, pluginId, version)) === "recurse") {
        logForDebugging(
          `Removing ${reusable || wasLive ? "superseded" : "incomplete"} cache directory for ${pluginId} at ${cachePath}`,
        );
        await evictCachedVersionDir(cachePath, storageV5);
      }
    }
  }
  let seedCachePath = await findSeedCachePath(pluginId, version);
  if (seedCachePath) {
    logForDebugging(`Using seed cache for ${pluginId}@${version} at ${seedCachePath}`);
    return seedCachePath;
  }
  await ensurePluginCacheFolder(cachePath, storageV5);
  if (isLinkModeCommandSource(marketplaceEntry?.source)) {
    let notSymlink = true;
    if (useStorageBackend) {
      await assertParent("link", "before relink");
      let entries = await classifyCacheEntry(cachePath);
      if (entries === "unexaminable") throw getPluginCachePath(cachePath, pluginId, version, "link");
      notSymlink = entries !== "symlink";
    }
    let farmReuse = notSymlink
      ? await classifyLinkFarmReuse(cachePath, sourcePath)
      : {
          live: false,
          reusable: false,
        };
    if (farmReuse.reusable) {
      logForDebugging(`Plugin ${pluginId} version ${version} already linked at ${cachePath}`);
      return cachePath;
    }
    if (!useStorageBackend && farmReuse.live && (await isPluginVersionInUseSafe(cachePath, storageV5))) {
      logForDebugging(
        `Link farm for ${pluginId} at ${cachePath} is in use by another session; deferring the relink until it exits`,
      );
      return cachePath;
    }
    if (useStorageBackend) {
      let stat = await lstat(cachePath).catch((error) => {
        if (isPathAbsent(error)) return null;
        throw getPluginCachePath(cachePath, pluginId, version, "link");
      });
      if (
        stat !== null &&
        (stat.isDirectory() || stat.isSymbolicLink()) &&
        (await isPluginVersionInUse(
          cachePath,
          {
            excludeSelf: true,
          },
          storageV5,
        ).catch(() => true))
      )
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Could not link ${pluginId} ${version}: another session is recorded as using the entry at its cache path; retry the load or the install.`,
          "plugin cache relink target has live users",
        );
    }
    if (useStorageBackend) await assertParent("link", "during relink");
    if (
      !useStorageBackend ||
      (await clearOccupantForReplace(cachePath, pluginId, version, "link")) === "recurse"
    )
      await evictCachedVersionDir(cachePath, storageV5);
    if (useStorageBackend) await assertParent("link", "during relink");
    await checkRelinkTarget(sourcePath, cachePath);
    logForDebugging(`Linked plugin ${pluginId} into versioned cache at ${cachePath}`);
    return cachePath;
  }
  if (useStorageBackend) {
    await assertParent("cache", "before staging");
    await Promise.all([sweepStaleTempSiblings(cachePath), sweepStaleTempSiblings(zipPath)]);
  }
  let stagingPath = useStorageBackend ? makeTempSiblingName(cachePath) : cachePath;
  let assertPublishable = async (stage) => {
    await assertParent("publish", stage);
    await assertStagedTreeIntact(stagingPath, pluginId, version, "publish");
  };
  let zipStaged = useStorageBackend && zipCacheMode;
  let published = false;
  let zipDeferred = false;
  let deferZip = false;
  try {
    if (marketplaceEntry && typeof marketplaceEntry.source === "string" && marketplaceDir) {
      let sourceDir = validatePathWithinBase(marketplaceDir, marketplaceEntry.source);
      logForDebugging(`Copying source directory ${marketplaceEntry.source} for plugin ${pluginId}`);
      try {
        await copyPluginDir(sourceDir, stagingPath, marketplaceDir, useStorageBackend);
      } catch (error) {
        if (isENOENT(error) && getErrnoPath_2(error) === sourceDir)
          throw Error(
            `Plugin source directory not found: ${sourceDir} (from entry.source: ${marketplaceEntry.source})`,
          );
        throw error;
      }
    } else {
      logForDebugging(`Copying plugin ${pluginId} to versioned cache (fallback to full copy)`);
      await copyPluginDir(sourcePath, stagingPath, sourcePath, useStorageBackend);
    }
    let gitPath = join(stagingPath, ".git");
    await removeDirectoryTreeNoFollow_2(gitPath);
    let storageScope =
      useStorageBackend && storageV5 !== undefined
        ? versionCacheStorageSpace(stagingPath, anchoredPluginCachePath())
        : null;
    if (
      storageScope !== null &&
      storageV5 !== undefined &&
      !(await hasLinkedAncestorBelow(cachePath, anchoredPluginCachePath()))
        ? await isStorageScopeEmpty(storageV5, storageScope)
        : (await readdir(stagingPath)).length === 0
    )
      throw Error(`Failed to copy plugin ${pluginId} to versioned cache: destination is empty after copy`);
    if (useStorageBackend) assertSymlinkFree(await materializePluginLinks(stagingPath, copyDir), stagingPath);
    if (zipStaged) deferZip = true;
    else if (useStorageBackend) {
      await assertPublishable("during publish");
      try {
        await moveIntoVersionPath(stagingPath, cachePath);
        published = true;
      } catch (error) {
        let isUsableOccupant = async () => {
          let cacheEntries = await classifyCacheEntry(cachePath);
          return (
            cacheEntries === "other" || (cacheEntries === "symlink" && (await isCachePathClean(cachePath)))
          );
        };
        let recheckOccupied = async () =>
          (await versionParentContained(cachePath)) &&
          (await isUsableOccupant()) &&
          (await hasRealEntries(cachePath, {
            whenUnreadable: false,
          }).catch(() => false));
        let deferArchive = async (error) => {
          if (await recheckOccupied()) {
            logForDebugging(
              `Plugin ${pluginId} version ${version} was cached concurrently at ${cachePath}; using it (${errorMessage(error)})`,
            );
            return true;
          }
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `Could not publish ${pluginId} ${version} into the plugin cache (${errorMessage(error)}); retry the load or the install.`,
            "plugin cache staged publish could not complete",
          );
        };
        let publishNow = async () => {
          await assertPublishable("during publish");
          try {
            await moveIntoVersionPath(stagingPath, cachePath);
            published = true;
          } catch (error) {
            zipDeferred = await deferArchive(error);
          }
        };
        let entryKind = await classifyCacheEntry(cachePath);
        if (entryKind === "unexaminable") throw getPluginCachePath(cachePath, pluginId, version);
        let uncleanLink = entryKind === "symlink" && !(await isCachePathClean(cachePath));
        if (entryKind === "absent") await publishNow();
        else if (
          entryKind === "symlink"
            ? uncleanLink || !(await dirHasPluginRoot(cachePath))
            : !(await hasRealEntries(cachePath))
        ) {
          await assertParent("publish", "during publish");
          let isRealDirectory =
            entryKind === "other" &&
            (await lstat(cachePath).then(
              (entryStats) => entryStats.isDirectory(),
              () => false,
            ));
          if (
            (isRealDirectory || entryKind === "symlink") &&
            (await isPluginVersionInUse(
              cachePath,
              {
                excludeSelf: true,
              },
              storageV5,
            ).catch(() => true))
          )
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `Could not publish ${pluginId} ${version}: another session is recorded as using the entry at its cache path; retry the load or the install.`,
              "plugin cache payload-free debris has live users",
            );
          if (isRealDirectory) await removeInUseMarker(cachePath, storageV5);
          logForDebugging(
            `Plugin ${pluginId} version ${version}: clearing ${entryKind === "symlink" ? "a stray symlink" : isRealDirectory ? "payload-free debris" : "a stray non-directory entry"} at ${cachePath} (${errorMessage(error)})`,
          );
          if (
            entryKind === "symlink"
              ? await removePathEntry(cachePath).then(
                  (removeResult) => removeResult !== "directory",
                  () => false,
                )
              : (await removeVersionDirIfIdle(cachePath)) === "removed"
          )
            await publishNow();
          else if (uncleanLink)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `Could not publish ${pluginId} ${version}: a link sits at its cache path and could not be removed; remove that link from the plugin cache, then retry the install.`,
              "plugin cache stray link not removable",
            );
          else zipDeferred = await deferArchive(error);
        } else zipDeferred = await deferArchive(error);
      }
    }
  } finally {
    if (useStorageBackend && !published && !deferZip) await removeDirectoryTreeNoFollow(stagingPath);
  }
  if (zipDeferred) {
    await materializeCachedLinks(cachePath, storageV5, linkFarm);
    await removeCacheInUseMarker(cachePath, storageV5);
    await writeInUseMarker(cachePath, storageV5);
    return cachePath;
  }
  let treePath = deferZip ? stagingPath : cachePath;
  let republishStaged = async () => {
    try {
      await assertPublishable("after a failed archive");
      try {
        await moveIntoVersionPath(stagingPath, cachePath);
      } catch (error) {
        if (
          (await classifyCacheEntry(cachePath)) !== "other" ||
          (await hasRealEntries(cachePath)) ||
          (await isPluginVersionInUse(
            cachePath,
            {
              excludeSelf: true,
            },
            storageV5,
          ).catch(() => true))
        )
          throw error;
        await removeInUseMarker(cachePath, storageV5);
        if ((await removeVersionDirIfIdle(cachePath)) !== "removed") throw error;
        await assertPublishable("after a failed archive");
        await moveIntoVersionPath(stagingPath, cachePath);
      }
      logForDebugging(
        `Plugin ${pluginId} version ${version}: its archive could not be written; the completed directory is kept at ${cachePath} instead`,
        {
          level: "warn",
        },
      );
    } catch (error) {
      logForDebugging(
        `Plugin ${pluginId} version ${version}: its archive could not be written and the staged directory could not be kept either (${errorMessage(error)})`,
        {
          level: "warn",
        },
      );
    }
  };
  try {
    try {
      if (deferZip) await assertStagedTreeIntact(treePath, pluginId, version, "install");
      await unvouchBeforeDependencyStep(treePath, storageV5, {
        staged: deferZip,
      });
      let dependencyResult = await installPluginDependencies(treePath);
      if (dependencyResult.error)
        logForDebugging(`Plugin dependency install warning for ${pluginId}: ${dependencyResult.error}`, {
          level: "warn",
        });
      await provisionBinaryAssets(treePath, pluginId, {
        storageV5,
        credentials: options?.credentials,
      });
      await rescreenCachedPluginTree(treePath, storageV5);
    } catch (error) {
      if (!deferZip) await removeFreshCopyUnlessInUse(cachePath, storageV5);
      throw error;
    }
    if (deferZip) await assertStagedTreeIntact(treePath, pluginId, version, "archive");
    if (
      zipCacheMode &&
      (await unmarkBeforeArchiving(treePath, storageV5, {
        staged: deferZip,
      }))
    ) {
      try {
        await publishDirectoryAsZip(treePath, zipPath);
      } catch (error) {
        if (deferZip && (await classifyCacheEntry(zipPath)) === "absent") await republishStaged();
        throw error;
      }
      if (
        deferZip &&
        (await versionParentContained(cachePath).catch(() => false)) &&
        (await classifyCacheEntry(cachePath)) === "other" &&
        !(await hasRealEntries(cachePath))
      )
        await removeStaleLeftover(cachePath);
      logForDebugging(`Successfully cached plugin ${pluginId} as ZIP at ${zipPath}`);
      return zipPath;
    }
  } finally {
    if (deferZip) await removeDirectoryTreeNoFollow(stagingPath);
  }
  logForDebugging(`Successfully cached plugin ${pluginId} at ${cachePath}`);
  return cachePath;
}
//@ chunk-5xgkngpb.js:4628592-4629377 placement
/**
 * 删除版本化缓存目录：存储后端模式下先让存储层清理作用域，剩余部分再直接删除。
 */
async function evictCachedVersionDir(cachePath, storageV5) {
  let storageCoords = orphanMarkerCoordsV5(cachePath, storageV5);
  if (
    storageV5 !== undefined &&
    storageCoords !== null &&
    !(await hasLinkedAncestorBelow(cachePath, anchoredPluginCachePath()))
  ) {
    let deleteResult = await storageV5.deleteScope({
      namespace: "pluginCache",
      ...storageCoords,
    });
    if (deleteResult.ok && !(await pathExists(cachePath))) return;
    if (
      !deleteResult.ok &&
      (deleteResult.error.code === "InvalidArgument" ||
        (deleteResult.error.code === "Failed" &&
          "telemetryCode" in deleteResult.error &&
          deleteResult.error.telemetryCode === "ELOOP"))
    )
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Could not empty ${cachePath}: the storage layer refused the version folder (${formatStorageError(deleteResult.error)}); check that plugin cache folder \u2014 nothing was removed \u2014 and then retry the install or the update.`,
        "plugin cache version folder refused by the storage layer during removal",
      );
    logForDebugging(
      deleteResult.ok
        ? `Storage sweep of ${cachePath} left entries it does not own; removing the directory directly`
        : `Storage sweep of ${cachePath} failed (${formatStorageError(deleteResult.error)}); removing the directory directly`,
      {
        level: "warn",
      },
    );
  }
  await removeDirectoryTreeNoFollow_2(cachePath);
}
//@ chunk-5xgkngpb.js:4629377-4630101 placement
async function ensurePluginCacheFolder(cachePath, storageV5) {
  let storageScope =
    isStorageV5Enabled() && storageV5 !== undefined
      ? pluginCacheStorageScope(dirname(cachePath), anchoredPluginCachePath())
      : null;
  if (
    isStorageV5Enabled() &&
    storageV5 !== undefined &&
    storageScope !== null &&
    storageScope.plugin !== undefined &&
    !(await hasLinkedAncestorBelow(cachePath, anchoredPluginCachePath()))
  ) {
    let ensureResult = await storageV5.ensureScope(storageScope);
    if (ensureResult.ok) return;
    if (
      ensureResult.error.code === "Failed" &&
      "telemetryCode" in ensureResult.error &&
      ensureResult.error.telemetryCode === "ELOOP"
    )
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Could not prepare the plugin cache folder of ${cachePath}: the storage layer refused it (${formatStorageError(ensureResult.error)}); check that plugin cache folder \u2014 the plugin version was not cached \u2014 and then retry the install or the update.`,
        "plugin cache plugin folder refused by the storage layer during creation",
      );
    logForDebugging(
      `The storage layer could not create the plugin cache folder of ${cachePath} (${formatStorageError(ensureResult.error)}); creating it directly`,
      {
        level: "warn",
      },
    );
  }
  await getFsImplementation().mkdir(dirname(cachePath));
}
//@ chunk-5xgkngpb.js:4630101-4630429 placement
/**
 * 不运行 install 脚本地下载 npm 包到目标目录（可指定 registry、期望 integrity）。
 */
async function fetchNpmPackageNoScripts(packageName, targetPath, options) {
  logForDebugging(`Fetching npm package ${packageName}@${options.version ?? "latest"} (no install scripts)`);
  return fetchNpmPackage(
    {
      packageName,
      versionSpec: options.version,
      targetPath,
    },
    {
      registry: options.registry,
      workDir: options.scratchDir,
      isNpmMarketplaceLane: options.isNpmMarketplaceLane ?? false,
      ...(options.expectedIntegrity !== undefined && {
        expectedIntegrity: options.expectedIntegrity,
      }),
    },
  );
}
//@ chunk-5xgkngpb.js:4631589-4631629 affinity
var CLONE_STEP_FAILED; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:4631589", () => {
  CLONE_STEP_FAILED = Symbol("pluginCloneStepFailed");
});
//@ chunk-5xgkngpb.js:4631629-4633381 fingerprint (2.1.88 match: gitClone, 0.736)
/**
 * git 克隆插件仓库：校验 sha/ref、--depth 1（有 sha 时 fetch 该提交）、可禁用子模块、校验钉住的提交。
 */
async function gitClone_2(gitUrl, targetPath, ref, sha, { isDirectoryPlugin, noSubmodules = false } = {}) {
  assertFullCommitSha(sha);
  if (ref?.startsWith("-")) throw Error(`Invalid ref "${ref}": cannot start with "-"`);
  let gitEnv = runGitWithCeilingDirs(targetPath, await resolveGitSshConfig(gitUrl));
  let { pinArgs, env } = gitEnv;
  let recurseArgs = noSubmodules ? ["-c", "submodule.recurse=false"] : [];
  let checkoutArgs = [...gitEnv.inCheckoutArgs, ...recurseArgs];
  let cloneArgs = [
    ...SSH_BATCH_CONFIG_ARGS,
    ...pinArgs,
    ...recurseArgs,
    "clone",
    "--depth",
    "1",
    ...(noSubmodules ? ["--no-recurse-submodules"] : ["--recurse-submodules", "--shallow-submodules"]),
  ];
  if (ref && !sha) cloneArgs.push("--branch", ref);
  if (sha) cloneArgs.push("--no-checkout");
  cloneArgs.push("--", gitUrl, targetPath);
  let cloneStarted = performance.now();
  let cloneResult = await execFileNoThrow(gitExe(), cloneArgs, {
    ...(await prepareGitWorkDir(targetPath, gitEnvWithCMessages(env))),
    stdin: "ignore",
  });
  if (cloneResult.code !== 0) {
    logPluginFetch(
      "plugin_clone",
      gitUrl,
      "failure",
      performance.now() - cloneStarted,
      classifyFetchError(cloneResult.stderr),
      isDirectoryPlugin,
    );
    throw withTelemetryMessage(
      Object.assign(
        classifyGitError(
          cloneResult.stderr,
          `Failed to clone repository: ${redactKnownUrls(cloneResult.stderr, gitUrl)}`,
        ),
        {
          [CLONE_STEP_FAILED]: true,
        },
      ),
      "plugin git clone failed (stderr redacted)",
    );
  }
  let pinned;
  if (sha) {
    if (
      (
        await execFileNoThrowWithCwd(
          gitExe(),
          [...checkoutArgs, "fetch", SAFE_UPLOAD_PACK_ARG_2, "--depth", "1", "origin", sha],
          {
            cwd: targetPath,
            env,
            stdin: "ignore",
          },
        )
      ).code !== 0
    ) {
      logForDebugging(`Shallow fetch of SHA ${sha} failed, falling back to unshallow fetch`);
      let unshallowResult = await execFileNoThrowWithCwd(
        gitExe(),
        [...checkoutArgs, "fetch", SAFE_UPLOAD_PACK_ARG_2, "--unshallow", ...(ref ? ["origin", ref] : [])],
        {
          cwd: targetPath,
          env,
          stdin: "ignore",
        },
      );
      if (unshallowResult.code !== 0) {
        logPluginFetch(
          "plugin_clone",
          gitUrl,
          "failure",
          performance.now() - cloneStarted,
          classifyFetchError(unshallowResult.stderr),
          isDirectoryPlugin,
        );
        throw withTelemetryMessage(
          Error(`Failed to fetch commit ${sha}: ${redactKnownUrls(unshallowResult.stderr, gitUrl)}`),
          "plugin git fetch (unshallow) failed (stderr redacted)",
        );
      }
    }
    let checkoutResult = await runGitInOwnWorkTree(
      targetPath,
      [...checkoutArgs, "checkout", sha],
      pickGitNoPromptEnv(env),
    );
    if (checkoutResult.code !== 0) {
      logPluginFetch(
        "plugin_clone",
        gitUrl,
        "failure",
        performance.now() - cloneStarted,
        classifyFetchError(checkoutResult.stderr),
        isDirectoryPlugin,
      );
      throw withTelemetryMessage(
        Error(`Failed to checkout commit ${sha}: ${redactKnownUrls(checkoutResult.stderr, gitUrl)}`),
        "plugin git checkout failed (stderr redacted)",
      );
    }
    try {
      pinned = await verifyPinnedSha(targetPath, "HEAD", sha, {
        inCheckoutArgs: checkoutArgs,
        env,
      });
    } catch (error) {
      logPluginFetch(
        "plugin_clone",
        gitUrl,
        "failure",
        performance.now() - cloneStarted,
        "sha_pin_mismatch",
        isDirectoryPlugin,
      );
      throw error;
    }
  }
  logPluginFetch(
    "plugin_clone",
    gitUrl,
    "success",
    performance.now() - cloneStarted,
    undefined,
    isDirectoryPlugin,
  );
  return pinned;
}
//@ chunk-5xgkngpb.js:4633381-4633526 fingerprint (2.1.88 match: installFromGit, 1)
async function installFromGit(gitUrl, targetPath, ref, sha, options) {
  let safeUrl = parsePluginGitUrl(gitUrl);
  let pinnedSha = await gitClone_2(safeUrl, targetPath, ref, sha, options);
  let refMessage = ref ? ` (ref: ${ref})` : "";
  logForDebugging(`Cloned repository from ${redactUrlQuery(safeUrl)}${refMessage} to ${targetPath}`);
  return pinnedSha;
}
//@ chunk-5xgkngpb.js:4633526-4634640 fingerprint (2.1.88 match: installFromGitHub, 0.49)
/**
 * github 来源安装：校验 owner/repo，按 SSH 配置情况先 SSH 后 HTTPS（或直接 HTTPS）克隆，失败时回退另一种传输。
 */
async function installFromGitHub(repo, targetPath, ref, sha, noSubmodules, fallback) {
  if (!/^[a-zA-Z0-9-_.]+\/[a-zA-Z0-9-_.]+$/.test(repo))
    throw Error(`Invalid GitHub repository format: ${repo}. Expected format: owner/repo`);
  let sshUrl = `git@${GITHUB_HOST}:${repo}.git`;
  let httpsUrl = `https://github.com/${repo}.git`;
  if (preferHttpsGitTransport())
    return installFromGit(httpsUrl, targetPath, ref, sha, {
      noSubmodules,
    });
  if (fallback === undefined)
    return installFromGit(sshUrl, targetPath, ref, sha, {
      noSubmodules,
    });
  if (!(await readGitSshCommand(fallback, sshUrl, targetPath, false)))
    try {
      return await installFromGit(sshUrl, targetPath, ref, sha, {
        noSubmodules,
      });
    } catch (error) {
      if (
        !isCloneStepFailure(error) ||
        !isSshAuthFailureOutput(errorMessage(error)) ||
        !(await readGitSshCommand(fallback, sshUrl, targetPath, true))
      )
        throw error;
      await removeDirectoryTreeNoFollow_2(targetPath).catch(() => {
        throw error;
      });
    }
  fallback.notify(sshNotConfiguredMessage(httpsUrl));
  try {
    return await installFromGit(httpsUrl, targetPath, ref, sha, {
      noSubmodules,
    });
  } catch (error) {
    if (!isCloneStepFailure(error)) throw error;
    try {
      await removeDirectoryTreeNoFollow_2(targetPath);
    } catch (error_2) {
      logForDebugging(`Could not clear ${targetPath} for the SSH retry: ${errorMessage(error_2)}`, {
        level: "warn",
      });
      throw error;
    }
    fallback.notify(httpsFailedRetrySshMessage(sshUrl));
    try {
      return await installFromGit(sshUrl, targetPath, ref, sha, {
        noSubmodules,
      });
    } catch (error_2) {
      if (!isCloneStepFailure(error_2)) throw error_2;
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${errorMessage(error)}
The retry over SSH failed too: ${errorMessage(error_2)}
Check the repository and ref in the marketplace entry and that github.com can be reached. If the repository is private, add an SSH key to your GitHub account or set up a git credential helper for https://github.com. Then install again.`,
        "plugin github clone failed over HTTPS and SSH",
      );
    }
  }
}
//@ chunk-5xgkngpb.js:4634640-4634692 layout
function isCloneStepFailure(error) {
  return error instanceof Error && CLONE_STEP_FAILED in error;
}
//@ chunk-5xgkngpb.js:4634692-4634834 layout
function githubShorthandToCloneUrl(url) {
  if (/^[a-zA-Z0-9-_.]+\/[a-zA-Z0-9-_.]+$/.test(url))
    return preferHttpsGitTransport() ? `https://github.com/${url}.git` : `git@${GITHUB_HOST}:${url}.git`;
  return parsePluginGitUrl(url);
}
//@ chunk-5xgkngpb.js:4634834-4634859 placement
/**
 * git 不可用（xcrun 报错或找不到 git）时抛的错误类。
 */
class GitNotAvailableError extends Error {}
//@ chunk-5xgkngpb.js:4634859-4634884 placement
/**
 * git 网络错误（无法访问、RPC 失败、SSH 解析失败）时抛的错误类。
 */
class GitHostFetchFailedError extends Error {}
//@ chunk-5xgkngpb.js:4634884-4635107 layout
var GIT_NETWORK_ERROR_RE =
  /^(?:fatal: unable to access '[^']*': |error: RPC failed; (?:curl (?:6|7|18|28|35|52|55|56|60|92)\b|HTTP [45]\d\d)|ssh: Could not resolve hostname |ssh: connect to host \S+ port \d+: |fatal: unable to connect to )/;
//@ chunk-5xgkngpb.js:4635107-4635338 layout
function classifyGitError(stderr, message) {
  let lines = stderr.split(`
`);
  if (lines.some((line) => line.startsWith("fatal: remote error:"))) return Error(message);
  if (lines.some((line) => line.startsWith("xcrun: error:") || line === GIT_MISSING_MAC_MESSAGE))
    return new GitNotAvailableError(message);
  return lines.some((line) => GIT_NETWORK_ERROR_RE.test(line))
    ? new GitHostFetchFailedError(message)
    : Error(message);
}
//@ chunk-5xgkngpb.js:4635338-4635454 layout
function gitEnvWithCMessages(env) {
  let { LC_ALL, ...rest } = env;
  return {
    ...rest,
    LC_ALL: undefined,
    ...(LC_ALL !== undefined &&
      LC_ALL !== "" && {
        LC_CTYPE: LC_ALL,
      }),
    LC_MESSAGES: "C",
  };
}
//@ chunk-5xgkngpb.js:4635454-4638065 fingerprint (2.1.88 match: installFromGitSubdir, 0.721)
/**
 * git-subdir 来源安装：部分克隆（--filter=tree:0）+ sparse-checkout 只取子目录，校验 sha，复制子目录到目标。需要 git ≥2.25。
 */
async function installFromGitSubdir(
  url,
  targetPath,
  subdirPath,
  ref,
  sha,
  tempPath = targetPath,
  { noSubmodules = false } = {},
) {
  if (!(await isGitUsable()))
    throw new GitNotAvailableError(
      "git-subdir plugin source requires git to be installed and on PATH. Install git (version 2.25 or later for sparse-checkout cone mode) and try again.",
    );
  assertFullCommitSha(sha);
  if (ref?.startsWith("-")) throw Error(`Invalid ref "${ref}": cannot start with "-"`);
  let gitUrl = githubShorthandToCloneUrl(url);
  let cloneDir = `${tempPath}${TEMP_CACHE_CLONE_SUFFIX}`;
  let gitEnv = runGitWithCeilingDirs(cloneDir, await resolveGitSshConfig(gitUrl));
  let { pinArgs, env } = gitEnv;
  let recurseArgs = noSubmodules ? ["-c", "submodule.recurse=false"] : [];
  let checkoutArgs = [...gitEnv.inCheckoutArgs, ...recurseArgs];
  let cloneArgs = [
    ...SSH_BATCH_CONFIG_ARGS,
    ...pinArgs,
    ...recurseArgs,
    "clone",
    "--depth",
    "1",
    ...(isNetworkGitUrl(gitUrl) ? ["--filter=tree:0"] : []),
    "--no-checkout",
  ];
  if (ref && !sha) cloneArgs.push("--branch", ref);
  cloneArgs.push("--", gitUrl, cloneDir);
  let cloneResult = await execFileNoThrow(gitExe(), cloneArgs, {
    ...(await prepareGitWorkDir(cloneDir, gitEnvWithCMessages(env))),
    stdin: "ignore",
  });
  if (cloneResult.code !== 0)
    throw withTelemetryMessage(
      classifyGitError(
        cloneResult.stderr,
        `Failed to clone repository for git-subdir source: ${redactKnownUrls(cloneResult.stderr, gitUrl)}`,
      ),
      "plugin git-subdir clone failed (stderr redacted)",
    );
  try {
    let noPromptEnv = pickGitNoPromptEnv(env);
    let readTreeArgs = [...checkoutArgs, "read-tree", "-u", "--reset"];
    let sparseResult = await runGitInOwnWorkTree(
      cloneDir,
      [...checkoutArgs, "sparse-checkout", "set", "--cone", "--", subdirPath],
      noPromptEnv,
    );
    if (sparseResult.code !== 0)
      throw withTelemetryMessage(
        Error(
          `git sparse-checkout set failed (git >= 2.25 required for cone mode): ${redactKnownUrls(sparseResult.stderr, gitUrl)}`,
        ),
        "plugin git sparse-checkout set failed (stderr redacted)",
      );
    let resolvedSha;
    if (sha) {
      if (
        (
          await execFileNoThrowWithCwd(
            gitExe(),
            [...checkoutArgs, "fetch", SAFE_UPLOAD_PACK_ARG_2, "--depth", "1", "origin", sha],
            {
              cwd: cloneDir,
              env,
              stdin: "ignore",
            },
          )
        ).code !== 0
      ) {
        logForDebugging(`Shallow fetch of SHA ${sha} failed for git-subdir, falling back to unshallow fetch`);
        let unshallow = await execFileNoThrowWithCwd(
          gitExe(),
          [...checkoutArgs, "fetch", SAFE_UPLOAD_PACK_ARG_2, "--unshallow", ...(ref ? ["origin", ref] : [])],
          {
            cwd: cloneDir,
            env,
            stdin: "ignore",
          },
        );
        if (unshallow.code !== 0)
          throw withTelemetryMessage(
            Error(`Failed to fetch commit ${sha}: ${redactKnownUrls(unshallow.stderr, gitUrl)}`),
            "plugin git-subdir fetch (unshallow) failed (stderr redacted)",
          );
      }
      let checkout = await runGitInOwnWorkTree(cloneDir, [...readTreeArgs, sha], noPromptEnv);
      if (checkout.code !== 0)
        throw withTelemetryMessage(
          Error(`Failed to checkout commit ${sha}: ${redactKnownUrls(checkout.stderr, gitUrl)}`),
          "plugin git-subdir checkout failed (stderr redacted)",
        );
      resolvedSha = await verifyPinnedSha(cloneDir, `${sha}^{commit}`, sha, {
        inCheckoutArgs: checkoutArgs,
        env,
      });
    } else {
      let [checkout, revParse] = await Promise.all([
        runGitInOwnWorkTree(cloneDir, [...readTreeArgs, "HEAD"], noPromptEnv),
        execFileNoThrowWithCwd(gitExe(), [...checkoutArgs, "rev-parse", "HEAD"], {
          cwd: cloneDir,
          env,
          stdin: "ignore",
        }),
      ]);
      if (checkout.code !== 0)
        throw withTelemetryMessage(
          Error(`git read-tree after sparse-checkout failed: ${redactKnownUrls(checkout.stderr, gitUrl)}`),
          "plugin git-subdir read-tree (post sparse-checkout) failed (stderr redacted)",
        );
      if (revParse.code === 0) resolvedSha = revParse.stdout.trim();
    }
    let resolvedSubdir = validatePathWithinBase(cloneDir, subdirPath);
    await hasSymlinkBetween(cloneDir, resolvedSubdir, subdirPath);
    try {
      if (dirname(targetPath) !== anchoredPluginCachePath())
        await getFsImplementation().mkdir(dirname(targetPath));
      await retryFsOp(resolvedSubdir, targetPath);
    } catch (e) {
      if (isENOENT(e))
        throw Error(
          `Subdirectory '${subdirPath}' not found in repository ${redactUrlQuery(gitUrl)}${ref ? ` (ref: ${ref})` : ""}. Check that the path is correct and exists at the specified ref/sha.`,
        );
      throw e;
    }
    let refMsg = ref ? ` ref=${ref}` : "";
    let shaMsg = resolvedSha ? ` sha=${resolvedSha}` : "";
    logForDebugging(
      `Extracted subdir ${subdirPath} from ${redactUrlQuery(gitUrl)}${refMsg}${shaMsg} to ${targetPath}`,
    );
    return resolvedSha;
  } finally {
    await rm(cloneDir, {
      recursive: true,
      force: true,
    });
  }
}
//@ chunk-5xgkngpb.js:4638065-4638262 fingerprint (2.1.88 match: installFromLocal, 0.745)
async function installFromLocal(
  sourcePath,
  targetPath,
  containmentRoot,
  strict = false,
  { noFollowFiles = false } = {},
) {
  if (!(await pathExists(sourcePath))) throw Error(`Source path does not exist: ${sourcePath}`);
  await copyDir(
    sourcePath,
    targetPath,
    sourcePath,
    targetPath,
    containmentRoot || sourcePath,
    strict,
    new Set(),
    freshSymlinkCopyBudget(),
    false,
    noFollowFiles,
    true,
  );
  let gitPath = join(targetPath, ".git");
  await removeDirectoryTreeNoFollow_2(gitPath);
}
//@ chunk-5xgkngpb.js:4638262-4638297 layout
function getTemporaryCachePath(source) {
  return makeTempCachePathName(generateTemporaryCacheNameForPlugin(source));
}
//@ chunk-5xgkngpb.js:4638297-4638571 fingerprint (2.1.88 match: generateTemporaryCacheNameForPlugin, 0.683)
function generateTemporaryCacheNameForPlugin(source) {
  if (typeof source === "string") return "local";
  switch (source.source) {
    case "npm":
      return "npm";
    case "github":
      return "github";
    case "url":
      return "git";
    case "git-subdir":
      return "subdir";
    case "archive":
    case "claudeai":
      return "archive";
    case "command":
      return "command";
    default:
      return "unknown";
  }
}
//@ chunk-5xgkngpb.js:4638571-4638814 placement
function redactPluginSourceForLog(source) {
  if (typeof source === "string") return source;
  return {
    ...source,
    ...("url" in source && {
      url: redactUrlsTracked(source.url),
    }),
    ...("registry" in source &&
      source.registry !== undefined && {
        registry: redactUrlsInText(source.registry),
      }),
    ...("package" in source &&
      /^[a-z][a-z\d+.-]*:\/\//i.test(source.package) && {
        package: redactUrlsInText(source.package),
      }),
  };
}
//@ chunk-5xgkngpb.js:4638814-4641481 placement (2.1.88 match: cachePlugin, 0.458)
/**
 * 按来源把插件下载/复制到临时目录：npm、github/url/git-subdir（git 克隆、sha 钉住校验）、archive（https zip）、command、本地路径；storageV5 下在插件缓存内分配暂存区。返回 {path, manifest, gitCommitSha…} 供 copyPluginToVersionedCache 使用。
 */
async function cachePlugin(source, options) {
  let cachePath = anchoredPluginCachePath();
  await getFsImplementation().mkdir(cachePath);
  let tempName = getTemporaryCachePath(source);
  let strict = strictCacheAddressable(options?.storageV5);
  let staging =
    isStorageV5Enabled() && options?.storageV5 !== undefined && strict && options.pluginId
      ? allocateStagingInCache(options.storageV5, options.pluginId)
      : undefined;
  if (staging !== undefined)
    try {
      await getFsImplementation().mkdir(dirname(staging.path));
      if (!(await stat_2(dirname(staging.path))).isDirectory())
        throw Error("the plugin cache folder is not a directory");
    } catch (error) {
      logForDebugging(
        `Could not prepare ${dirname(staging.path)} for staging (${errorMessage(error)}); staging at the cache root instead`,
        {
          level: "debug",
        },
      );
      staging = undefined;
    }
  let stagingPath = staging?.path ?? join(cachePath, tempName);
  let tempPath = join(cachePath, tempName);
  let prepareTargetParent = async () => {
    if (staging !== undefined) await getFsImplementation().mkdir(dirname(stagingPath));
  };
  let started = false;
  let gitSha;
  let contentSha;
  let producerDir;
  let npmResolution;
  let manifestResult;
  try {
    logForDebugging(
      `Caching plugin from source: ${jsonStringify(redactPluginSourceForLog(source))} to temporary path ${stagingPath}`,
    );
    started = true;
    if (typeof source === "string") {
      await prepareTargetParent();
      await installFromLocal(source, stagingPath, options?.containmentRoot, strict);
    } else
      switch (source.source) {
        case "npm":
          await prepareTargetParent();
          try {
            npmResolution = await fetchNpmPackageNoScripts(source.package, stagingPath, {
              registry: source.registry,
              version: source.version,
              scratchDir: `${tempPath}${TEMP_CACHE_LINK_SUFFIX}`,
              isNpmMarketplaceLane: options?.isNpmMarketplaceLane,
              expectedIntegrity: options?.expectedNpmIntegrity,
            });
          } finally {
            await removeDirectoryTreeNoFollow_2(`${tempPath}${TEMP_CACHE_LINK_SUFFIX}`).catch(() => {});
          }
          break;
        case "github":
          await prepareTargetParent();
          gitSha = await installFromGitHub(
            source.repo,
            stagingPath,
            source.ref,
            source.sha,
            options.directoryPin !== null,
            options.gitHubHttpsFallback,
          );
          break;
        case "url":
          await prepareTargetParent();
          gitSha = await installFromGit(source.url, stagingPath, source.ref, source.sha, {
            isDirectoryPlugin: options?.isDirectoryPlugin,
            noSubmodules: options.directoryPin !== null,
          });
          break;
        case "git-subdir":
          gitSha = await installFromGitSubdir(
            source.url,
            stagingPath,
            source.path,
            source.ref,
            source.sha,
            tempPath,
            {
              noSubmodules: options.directoryPin !== null,
            },
          );
          break;
        case "archive":
          contentSha = await installFromArchive(
            source,
            stagingPath,
            tempPath,
            options?.archiveAuth,
            options?.entryDeclaresComponents ?? false,
            options?.declaredComponentPaths === undefined ? [] : options.declaredComponentPaths,
          );
          break;
        case "claudeai":
          contentSha = await installClaudeAiPlugin(source, stagingPath, tempPath, options?.credentials);
          break;
        case "command": {
          let commandResult = await holdCommandSourceForOrg(
            source,
            stagingPath,
            async (sourcePath, targetPath) => {
              await prepareTargetParent();
              await installFromLocal(sourcePath, targetPath, undefined, strict, {
                noFollowFiles: true,
              });
            },
            options?.commandSourceConsent,
          );
          contentSha = commandResult.contentSha256;
          producerDir = commandResult.producerDirectory;
          break;
        }
        case "unsupported":
          if (source.error)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `This plugin's marketplace entry is invalid: ${source.error}`,
              "plugin marketplace entry source invalid",
            );
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            UNSUPPORTED_SOURCE_MESSAGE,
            "plugin source type unsupported",
          );
        default:
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            UNSUPPORTED_SOURCE_MESSAGE,
            "plugin source type unsupported",
          );
      }
    if (strict && !isLinkModeCommandSource(source))
      assertSymlinkFree(await materializePluginLinks(stagingPath, copyDir), stagingPath);
    let sourceKind = typeof source === "string" ? source : source.source;
    manifestResult = await loadPluginManifest(stagingPath, tempName, sourceKind, [
      join(stagingPath, PLUGIN_JSON),
    ]);
    if (!isLinkModeCommandSource(source))
      await removeIgnoredEntries(stagingPath, {
        keepGit: true,
      });
  } catch (error) {
    if (started && (strict || (await pathExists(stagingPath)))) {
      logForDebugging(`Cleaning up failed installation at ${stagingPath}`);
      try {
        await removeDirectoryTreeNoFollow_2(stagingPath);
      } catch (error) {
        logForDebugging(`Failed to clean up installation: ${error}`, {
          level: "error",
        });
      }
    }
    throw error;
  }
  let sourceKind = typeof source === "string" ? source : source.source;
  let { manifest, manifestPath, depConstraints } = manifestResult;
  let pluginManifest =
    manifestPath !== null
      ? manifest
      : options?.manifest || {
          name: tempName,
          description: `Plugin cached from ${sourceKind}`,
        };
  logForDebugging(`Successfully cached plugin ${pluginManifest.name} to ${stagingPath}`);
  return {
    path: stagingPath,
    manifest: pluginManifest,
    ...(gitSha && {
      gitCommitSha: gitSha,
    }),
    ...(contentSha && {
      contentSha256: contentSha,
    }),
    ...(producerDir && {
      producerPath: producerDir,
    }),
    ...(npmResolution && {
      npmResolution,
    }),
    ...(depConstraints && {
      depConstraints,
    }),
    ...(staging && {
      stagingScope: staging.scope,
    }),
  };
}
//@ chunk-5xgkngpb.js:4641481-4641672 placement
function allocateStagingInCache(storageV5, pluginId) {
  let cacheRoot = anchoredPluginCachePath();
  let pluginScope = pluginCacheStorageScope(getPluginCacheDirIn(getPluginsDirectory(), pluginId), cacheRoot);
  if (pluginScope === null || pluginScope.plugin === undefined) return;
  let stagingKey = storageV5.stagingScopeWithin(pluginScope);
  if (!isVersionRootStorageKey(stagingKey)) return;
  let stagingPath = storageKeyToCachePath(stagingKey, cacheRoot);
  return stagingPath === null
    ? undefined
    : {
        scope: stagingKey,
        path: stagingPath,
      };
}
//@ chunk-5xgkngpb.js:4641672-4641806 placement
var ARCHIVE_RETRY_DELAYS_MS = [30, 70, 150];
var UNSUPPORTED_SOURCE_MESSAGE =
  "This plugin uses a source type your Claude Code version does not support. Update Claude Code and try again.";
//@ chunk-5xgkngpb.js:4641806-4644045 placement
/**
 * 安装插件压缩包：拒绝只声明不安全组件路径的条目，过滤 __MACOSX 等文件。
 */
async function installFromArchive(
  source,
  targetPath,
  tempPath,
  archiveAuth,
  entryDeclaresComponents = false,
  declaredComponentPaths = [],
) {
  return withFeatureTelemetry("plugin_archive_install", async () => {
    if (declaredComponentPaths === null)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Plugin archive from ${redactUrlsInText(source.url)} was not installed: its marketplace entry declares only unsafe or malformed component paths. Fix the entry.`,
        "plugin marketplace entry declares only unsafe component paths",
      );
    let headers;
    if (archiveAuth && Object.keys(archiveAuth.headers).length > 0)
      if (sameOrigin_2(archiveAuth.url, source.url)) headers = archiveAuth.headers;
      else logForDebugging("Not forwarding marketplace headers to plugin archive on a different origin");
    let { data: archiveData, contentSha256 } = await downloadAndVerifyBinary(source.url, {
      sha256: source.sha256,
      headers,
    });
    let stagingDirPath = `${tempPath}${TEMP_CACHE_LINK_SUFFIX}`;
    try {
      if (
        !(await extractZipToDirectory(archiveData, stagingDirPath)).some(
          (extractedPath) =>
            !extractedPath.startsWith("__MACOSX/") && basename(extractedPath) !== ".DS_Store",
        )
      )
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Plugin archive from ${redactUrlsInText(source.url)} contained no plugin files. The archive was not installed. Verify the URL serves a zip of the plugin contents.`,
          "plugin archive was empty",
        );
      let pluginRootInExtracted = await findPluginRootInExtracted(stagingDirPath);
      if (pluginRootInExtracted !== stagingDirPath)
        logForDebugging(
          `Plugin archive had a wrapper directory; using ${printableName(basename(pluginRootInExtracted))} as the plugin root`,
        );
      if (entryDeclaresComponents && declaredComponentPaths !== null && declaredComponentPaths.length > 0) {
        if (!(await anyPathExistsUnder(pluginRootInExtracted, declaredComponentPaths))) {
          let root = await findSingleTopDir(pluginRootInExtracted);
          if (root && (await anyPathExistsUnder(root, declaredComponentPaths))) {
            logForDebugging(
              `Plugin archive entry paths resolve under wrapper ${printableName(basename(root))}; using it as the plugin root`,
            );
            pluginRootInExtracted = root;
          } else if (
            pluginRootInExtracted !== stagingDirPath &&
            !(await hasManifestIdentityFile(pluginRootInExtracted)) &&
            (await anyPathExistsUnder(stagingDirPath, declaredComponentPaths))
          ) {
            logForDebugging(
              "Plugin archive entry paths resolve at the archive root; using it instead of the promoted subdirectory",
            );
            pluginRootInExtracted = stagingDirPath;
          } else {
            let pathSuffix = examplePathSuffix(declaredComponentPaths[0]);
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `Plugin archive from ${redactUrlsInText(source.url)} does not contain the component paths its marketplace entry declares${pathSuffix}. The archive was not installed. Repackage the zip so the declared paths sit at the plugin root (optionally inside a single wrapper directory), or fix the entry.`,
              "plugin archive missing entry-declared component paths",
            );
          }
        }
      }
      await loadPluginManifest(
        pluginRootInExtracted,
        basename(tempPath),
        "archive",
        [join(pluginRootInExtracted, PLUGIN_JSON)],
        {
          isProbe: true,
        },
      );
      if (!entryDeclaresComponents && !(await pluginRootHasMarker(pluginRootInExtracted)))
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Plugin archive from ${redactUrlsInText(source.url)} has no plugin content at its root (expected .claude-plugin/ or a commands/, skills/, agents/, hooks/, themes/, output-styles/, monitors/, workflows/, SKILL.md, .mcp.json, or .lsp.json at the top level, optionally inside a single wrapper directory). The archive was not installed.`,
          "plugin archive has no plugin-shaped root",
        );
      if (dirname(targetPath) !== anchoredPluginCachePath())
        await getFsImplementation().mkdir(dirname(targetPath));
      await retryFsOp(pluginRootInExtracted, targetPath);
      return contentSha256;
    } finally {
      await rm(stagingDirPath, {
        recursive: true,
        force: true,
      }).catch(() => {});
    }
  });
}
//@ chunk-5xgkngpb.js:4644045-4646011 placement (2.1.88 match: loadPluginManifest, 0.364)
/**
 * 读取并解析 .claude-plugin/plugin.json（找不到再试候选路径），先确认清单路径不经符号链接逃出插件目录；JSON 损坏或 schema 失败抛 TelemetrySafeError；返回 {manifest, manifestPath, depConstraints}。没有 manifest 时用目录名合成。
 */
async function loadPluginManifest(
  pluginPath,
  pluginName,
  source,
  extraManifestPaths = [],
  options,
  storageV5,
) {
  let onSuccess = () => {
    if (!options?.isProbe && !options?.noTelemetry) logFeatureOk("plugin_load_manifest");
  };
  let onFailure = (reason) => {
    if (options?.noTelemetry) return;
    logFeatureBad("plugin_load_manifest", reason);
  };
  let candidatePaths = [join(pluginPath, PLUGIN_MANIFEST_PATH_2), ...extraManifestPaths];
  await assertManifestContained(
    options?.containedIn,
    pluginPath,
    pluginName,
    PLUGIN_MANIFEST_PATH_2,
    options?.noTelemetry,
  );
  for (let manifestPath of candidatePaths) {
    let manifestContent;
    let backendRead =
      isStorageV5Enabled() && storageV5 !== undefined
        ? await readFileViaStorageBackend(storageV5, manifestPath)
        : null;
    if (backendRead !== null) {
      if (
        backendRead.outcome === "absent" ||
        (backendRead.outcome === "error" && backendRead.telemetryCode === "ENOTDIR")
      )
        continue;
      if (backendRead.outcome === "error") {
        onFailure("plugin_load_manifest_read_failed");
        logForDebugging(
          `Plugin ${pluginName}: failed to read manifest file at ${manifestPath}. Read error: ${backendRead.detail}`,
          {
            level: "error",
          },
        );
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Plugin ${pluginName}: failed to read manifest file at ${manifestPath}.

Read error: ${backendRead.detail}`,
          "plugin manifest read failed (v5 backend error)",
          MANIFEST_ERROR_CLASSES.readFailed,
        );
      }
      manifestContent = backendRead.content;
    } else
      try {
        manifestContent = await readFile(manifestPath, {
          encoding: "utf-8",
        });
      } catch (error) {
        if (isENOENT(error) || getErrnoCode(error) === "ENOTDIR") continue;
        let parsedJson = errorMessage(error);
        onFailure("plugin_load_manifest_read_failed");
        logForDebugging(
          `Plugin ${pluginName}: failed to read manifest file at ${manifestPath}. Read error: ${parsedJson}`,
          {
            level: "error",
          },
        );
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Plugin ${pluginName}: failed to read manifest file at ${manifestPath}.

Read error: ${parsedJson}`,
          "plugin manifest read failed",
          MANIFEST_ERROR_CLASSES.readFailed,
        );
      }
    let manifestJson;
    try {
      manifestJson = jsonParse(stripBom(manifestContent));
    } catch (error) {
      let errorMsg = errorMessage(error);
      onFailure("plugin_load_manifest_json_invalid");
      logForDebugging(
        `Plugin ${pluginName} has a corrupt manifest file at ${manifestPath}. Parse error: ${errorMsg}`,
        {
          level: "error",
        },
      );
      throw new ManifestLoadError(
        `Plugin ${pluginName} has a corrupt manifest file at ${manifestPath}.

JSON parse error: ${errorMsg}`,
        "plugin manifest is not valid JSON",
        MANIFEST_ERROR_CLASSES.jsonInvalid,
        manifestPath,
        [errorMsg],
      );
    }
    let validation = validatePluginManifest(manifestJson, "plugin-json", {
      pluginName,
      manifestPath,
    });
    if (!validation.ok) {
      onFailure("plugin_load_manifest_schema_invalid");
      logForDebugging(validation.error, {
        level: "error",
      });
      throw new ManifestLoadError(
        validation.error,
        "plugin manifest failed schema validation",
        MANIFEST_ERROR_CLASSES.schemaInvalid,
        manifestPath,
        validation.errors.map((error) => (error.path ? `${error.path}: ${error.message}` : error.message)),
      );
    }
    for (let hookNote of validation.hookNotes)
      logForDebugging(`Plugin ${pluginName}: ${hookNote}`, {
        level: "warn",
      });
    let { manifest, rawCandidate } = validation;
    onSuccess();
    return {
      manifest,
      manifestPath,
      depConstraints: readManifestDependencyPins(rawCandidate),
    };
  }
  onSuccess();
  return {
    manifest: {
      name: pluginName,
      description: `Plugin from ${source}`,
    },
    manifestPath: null,
    depConstraints: undefined,
  };
}
//@ chunk-5xgkngpb.js:4646011-4647214 fingerprint (2.1.88 match: loadPluginHooks, 0.497)
/**
 * 读取 hooks/hooks.json：校验 PluginHooksSchema，返回 hooks 配置与 hooks 模块（modules）列表。
 */
async function loadPluginHooks_3(hooksFilePath, pluginName, storageV5) {
  let content;
  let backendRead =
    isStorageV5Enabled() && storageV5 !== undefined
      ? await readFileViaStorageBackend(storageV5, hooksFilePath)
      : null;
  if (backendRead !== null) {
    if (backendRead.outcome === "error")
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Hooks file read failed at ${hooksFilePath} for plugin ${pluginName}: ${backendRead.detail}`,
        "plugin hooks file read failed (v5 backend)",
      );
    content = backendRead.outcome === "found" ? backendRead.content : undefined;
  } else if (await pathExists(hooksFilePath))
    content = await readFile(hooksFilePath, {
      encoding: "utf-8",
    });
  if (content === undefined)
    throw Error(
      `Hooks file not found at ${hooksFilePath} for plugin ${pluginName}. If the manifest declares hooks, the file must exist.`,
    );
  let parsed = jsonParse(content);
  if (hasNestedHooks(parsed, SETTINGS_SKIPPED_KEYS) || looksLikeHookMatcher(parsed))
    throw new HookValidationError(
      `hooks.json declares ${[...GUARD_HOOK_EVENTS].join("/")} at its top level, outside the "hooks" object \u2014 ${UNLOADABLE_GUARD_NOTE}`,
    );
  if (
    parsed &&
    typeof parsed === "object" &&
    "hooks" in parsed &&
    parsed.hooks !== null &&
    parsed.hooks !== undefined &&
    !isPlainObject_6(parsed.hooks)
  )
    throw new HookValidationError(
      `hooks: must be an object mapping event names to matcher arrays \u2014 ${UNLOADABLE_GUARD_NOTE}`,
    );
  if (parsed && typeof parsed === "object" && "hooks" in parsed) {
    let rawHooksConfig = validateHooksSetting(parsed.hooks);
    for (let note of rawHooksConfig.notes)
      logForDebugging(`Plugin ${pluginName}: ${note}`, {
        level: "warn",
      });
    if (rawHooksConfig.unloadableGuards.length > 0)
      throw new HookValidationError(
        `${rawHooksConfig.unloadableGuards.join("; ")} \u2014 ${UNLOADABLE_GUARD_NOTE}`,
      );
  }
  let parsedHooks;
  try {
    parsedHooks = PluginHooksSchema().parse(parsed);
  } catch (error) {
    let hooks = parsed && typeof parsed === "object" && "hooks" in parsed ? parsed.hooks : undefined;
    if (hasGuardHooks_2(hooks) || hasGuardHooks_2(parsed))
      throw new HookValidationError(`${errorMessage(error)} \u2014 ${UNLOADABLE_GUARD_NOTE}`);
    throw error;
  }
  warnUnknownHooksJsonKeys(pluginName, hooksFilePath, parsed);
  return {
    hooks: parsedHooks.hooks ?? {},
    modules: parsedHooks.modules ?? [],
  };
}
//@ chunk-5xgkngpb.js:4647214-4647907 layout
/**
 * 处理 hooks.json 的 modules（JS hooks 模块）：每插件只允许一个，多于一个时报 hook-load-failed 都不加载。
 */
async function loadPluginHooksModule(options) {
  let { plugin, namedModules, source, storageV5, anchor } = options;
  let [spec, moduleSpec] = namedModules;
  if (spec === undefined) return;
  if (moduleSpec !== undefined)
    return {
      type: "hook-load-failed",
      source,
      plugin: plugin.name,
      hookPath: moduleSpec.hooksFilePath,
      reason: `Plugin ${plugin.name} names one hooks module per plugin, but ${namedModules.map((namedModule) => namedModule.hooksFilePath).join(" and ")} each name one in \`modules\`; neither is loaded`,
    };
  let { fullPath, reason } = await resolveComponentPath(
    resolveWithinDir,
    anchor,
    plugin.path,
    join(relative(plugin.path, dirname(spec.hooksFilePath)), spec.spec),
  );
  if (fullPath === null)
    return {
      type: "path-traversal",
      source,
      plugin: plugin.name,
      path: spec.spec,
      component: "hooks",
      ...(reason !== undefined && {
        reason,
      }),
    };
  if (!(await isCachePresent(storageV5, fullPath)))
    return {
      type: "path-not-found",
      source,
      plugin: plugin.name,
      path: fullPath,
      component: "hooks",
    };
  plugin.modulePath = fullPath;
  return;
}
//@ chunk-5xgkngpb.js:4647907-4648964 layout
/**
 * 读 manifest 的 monitors（或 experimental.monitors），缺省时读 monitors/monitors.json，校验后挂到插件对象上（后台常驻监视命令）。
 */
async function loadPluginMonitors(
  pluginPath,
  manifest,
  source,
  errors,
  anchor,
  storageV5,
  containmentAnchorDir,
) {
  let monitors = manifest.experimental?.monitors ?? manifest.monitors;
  let monitorsPath;
  if (monitors === undefined) {
    let standardPath = join(pluginPath, "monitors", "monitors.json");
    let presence = await probeComponentPath(storageV5, standardPath);
    if (presence === "present") {
      if (
        await reportIfPathEscapes(containmentAnchorDir, pluginPath, join("monitors", "monitors.json"), {
          errors,
          source,
          plugin: manifest.name,
          component: "monitors",
        })
      )
        return;
      monitorsPath = standardPath;
    } else if (presence !== "absent")
      reportUncheckablePath(errors, source, manifest.name, "monitors", standardPath, presence);
  } else if (typeof monitors === "string") {
    let { fullPath, reason } = await resolveComponentPath(resolveWithinDir, anchor, pluginPath, monitors);
    if (fullPath === null) {
      errors.push({
        type: "path-traversal",
        source,
        plugin: manifest.name,
        path: monitors,
        component: "monitors",
        ...(reason !== undefined && {
          reason,
        }),
      });
      return;
    }
    monitorsPath = fullPath;
  } else return monitors;
  if (monitorsPath === undefined) return;
  try {
    let backendRead =
      isStorageV5Enabled() && storageV5 !== undefined
        ? await readFileViaStorageBackend(storageV5, monitorsPath)
        : null;
    let monitorsContent;
    if (backendRead !== null) {
      if (backendRead.outcome !== "found")
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          backendRead.outcome === "error" ? backendRead.detail : `monitors file not found at ${monitorsPath}`,
          "plugin monitors read failed (v5 backend)",
        );
      monitorsContent = backendRead.content;
    } else
      monitorsContent = await readFile(monitorsPath, {
        encoding: "utf-8",
      });
    return PluginMonitorsArraySchema().parse(jsonParse(monitorsContent));
  } catch (error) {
    let reason = errorMessage(error);
    logForDebugging(`Failed to load monitors for ${manifest.name} from ${monitorsPath}: ${reason}`, {
      level: "error",
    });
    errors.push({
      type: "component-load-failed",
      source,
      plugin: manifest.name,
      component: "monitors",
      path: monitorsPath,
      reason,
    });
    return;
  }
}
//@ chunk-5xgkngpb.js:4648964-4649082 layout
/**
 * 把相对路径解析到目录内，越界返回 null。
 */
function resolveWithinDir(baseDir, targetPath) {
  let resolvedBase = resolve_2(baseDir);
  let resolvedTarget = resolve_2(resolvedBase, targetPath);
  let relativePath = relative(resolvedBase, resolvedTarget);
  if (
    relativePath === ".." ||
    relativePath.startsWith(`..${sep}`) ||
    resolve_2(relativePath) === relativePath
  )
    return null;
  return resolvedTarget;
}
//@ chunk-5xgkngpb.js:4649082-4650330 fingerprint (2.1.88 match: validatePluginPaths, 0.467)
/**
 * 校验 manifest 中声明的组件路径：都要在插件目录内且存在，逃逸或不存在的记 path-traversal/path-not-found 错误，返回有效路径。
 */
async function validatePluginPaths(
  relPaths,
  pluginPath,
  name,
  source,
  component,
  label,
  verb,
  errors,
  anchor,
  mustBeDirectory = false,
  storageV5,
) {
  let checks = await Promise.all(
    relPaths.map(async (relPath) => {
      let { fullPath, reason } = await resolveComponentPath(resolveWithinDir, anchor, pluginPath, relPath);
      if (fullPath === null)
        return {
          relPath,
          fullPath,
          reason,
          exists: false,
          isDirectory: false,
        };
      return {
        relPath,
        fullPath,
        reason,
        ...(await statPluginPath(storageV5, fullPath)),
      };
    }),
  );
  let validPaths = [];
  for (let { relPath, fullPath, exists, isDirectory, reason } of checks) {
    if (fullPath === null) {
      logForDebugging(
        `${label} path ${relPath} ${verb} escapes plugin directory for ${name}${reason === undefined ? "" : `: ${reason}`}`,
        {
          level: "error",
        },
      );
      errors.push({
        type: "path-traversal",
        source,
        plugin: name,
        path: relPath,
        component,
        ...(reason !== undefined && {
          reason,
        }),
      });
      continue;
    }
    if (!exists) {
      logForDebugging(`${label} path ${relPath} ${verb} not found at ${fullPath} for ${name}`, {
        level: "error",
      });
      errors.push({
        type: "path-not-found",
        source,
        plugin: name,
        path: fullPath,
        component,
      });
    } else if (mustBeDirectory && !isDirectory) {
      let parent = dirname(relPath);
      let parentHint =
        component === "skills" && basename(relPath).toLowerCase() === "skill.md"
          ? parent === "."
            ? " \u2014 point to the plugin root '.' instead"
            : ` \u2014 point to the parent directory '${parent}' instead`
          : "";
      let reason =
        component === "skills"
          ? `path is a file; skills entries must be directories containing SKILL.md${parentHint}`
          : "path is a file; expected a directory";
      logForDebugging(`${label} path ${relPath} ${verb} is a file, not a directory, for ${name}`, {
        level: "error",
      });
      errors.push({
        type: "component-load-failed",
        source,
        plugin: name,
        path: relPath,
        component,
        reason,
      });
    } else validPaths.push(fullPath);
  }
  return validPaths;
}
//@ chunk-5xgkngpb.js:4650330-4653028 fingerprint (2.1.88 match: finishLoadingPluginFromPath, 0.446)
/**
 * 处理 manifest 或 marketplace 条目中 commands 的对象形式（name → {source|content,…}）与路径数组：解析路径、校验逃逸、内联内容注册，结果写入插件对象。
 */
async function finishLoadingPluginFromPath(plugin, commands, options, storageV5) {
  let {
    pluginPath,
    pluginName,
    errorSource,
    mode,
    origin,
    resolvePath,
    anchor,
    registerInlineContent,
    errors,
  } = options;
  let originNote = origin === "manifest" ? "specified in manifest but" : "from marketplace entry";
  let originLabel = origin === "manifest" ? "manifest" : "marketplace entry";
  let firstEntry = Object.values(commands)[0];
  if (
    typeof commands === "object" &&
    !Array.isArray(commands) &&
    firstEntry &&
    typeof firstEntry === "object" &&
    ("source" in firstEntry || "content" in firstEntry)
  ) {
    let commandsMetadata =
      mode === "append"
        ? {
            ...(plugin.commandsMetadata || {}),
          }
        : {};
    let acceptedCount = 0;
    let acceptedPaths = [];
    let checks = await Promise.all(
      Object.entries(commands).map(async ([commandName, metadata]) => {
        if (!metadata || typeof metadata !== "object")
          return {
            commandName,
            metadata,
            kind: "skip",
          };
        if (metadata.source) {
          let { fullPath, reason } = await resolveComponentPath(
            resolvePath,
            anchor,
            pluginPath,
            metadata.source,
          );
          return {
            commandName,
            metadata,
            kind: "source",
            fullPath,
            reason,
            exists: fullPath !== null && (await isCachePresent(storageV5, fullPath)),
          };
        }
        if (metadata.content && registerInlineContent)
          return {
            commandName,
            metadata,
            kind: "content",
          };
        return {
          commandName,
          metadata,
          kind: "skip",
        };
      }),
    );
    for (let check of checks) {
      if (check.kind === "skip") continue;
      if (check.kind === "content") {
        commandsMetadata[check.commandName] = check.metadata;
        acceptedCount++;
        continue;
      }
      if (check.fullPath === null) {
        logForDebugging(
          `Command ${check.commandName} source ${check.metadata.source} ${originNote} escapes plugin directory for ${pluginName}${check.reason === undefined ? "" : `: ${check.reason}`}`,
          {
            level: "error",
          },
        );
        errors.push({
          type: "path-traversal",
          source: errorSource,
          plugin: pluginName,
          path: check.metadata.source ?? "",
          component: "commands",
          ...(check.reason !== undefined && {
            reason: check.reason,
          }),
        });
      } else if (check.exists) {
        acceptedPaths.push(check.fullPath);
        commandsMetadata[check.commandName] = check.metadata;
        acceptedCount++;
      } else {
        logForDebugging(
          `Command ${check.commandName} path ${check.metadata.source} ${originNote} not found at ${check.fullPath} for ${pluginName}`,
          {
            level: "error",
          },
        );
        errors.push({
          type: "path-not-found",
          source: errorSource,
          plugin: pluginName,
          path: check.fullPath,
          component: "commands",
        });
      }
    }
    if (acceptedPaths.length > 0)
      plugin.commandsPaths =
        mode === "append" ? [...(plugin.commandsPaths || []), ...acceptedPaths] : acceptedPaths;
    if (acceptedCount > 0) plugin.commandsMetadata = commandsMetadata;
    return;
  }
  let cmdPaths = Array.isArray(commands) ? commands : [commands];
  let checks = await Promise.all(
    cmdPaths.map(async (cmdPath) => {
      if (typeof cmdPath !== "string")
        return {
          cmdPath,
          kind: "invalid",
        };
      let { fullPath, reason } = await resolveComponentPath(resolvePath, anchor, pluginPath, cmdPath);
      return {
        cmdPath,
        kind: "path",
        fullPath,
        reason,
        exists: fullPath !== null && (await isCachePresent(storageV5, fullPath)),
      };
    }),
  );
  let validPaths = [];
  for (let check of checks) {
    if (check.kind === "invalid") {
      logForDebugging(`Unexpected command format in ${originLabel} for ${pluginName}`, {
        level: "error",
      });
      continue;
    }
    if (check.fullPath === null) {
      logForDebugging(
        `Command path ${check.cmdPath} ${originNote} escapes plugin directory for ${pluginName}${check.reason === undefined ? "" : `: ${check.reason}`}`,
        {
          level: "error",
        },
      );
      errors.push({
        type: "path-traversal",
        source: errorSource,
        plugin: pluginName,
        path: check.cmdPath,
        component: "commands",
        ...(check.reason !== undefined && {
          reason: check.reason,
        }),
      });
      continue;
    }
    if (check.exists) validPaths.push(check.fullPath);
    else {
      logForDebugging(
        `Command path ${check.cmdPath} ${originNote} not found at ${check.fullPath} for ${pluginName}`,
        {
          level: "error",
        },
      );
      errors.push({
        type: "path-not-found",
        source: errorSource,
        plugin: pluginName,
        path: check.fullPath,
        component: "commands",
      });
    }
  }
  if (validPaths.length > 0)
    plugin.commandsPaths = mode === "append" ? [...(plugin.commandsPaths || []), ...validPaths] : validPaths;
}
//@ chunk-5xgkngpb.js:4655346-4664194 placement (2.1.88 match: createPluginFromPath, 0.473)
/**
 * 由插件目录构造 LoadedPlugin：读 manifest；默认目录 commands/、agents/、skills/、output-styles/、themes/、workflows/ 存在即挂 *Path，manifest 指定的路径挂 *Paths（并做目录逃逸检查）；根目录 SKILL.md 视为单技能插件；读 hooks/hooks.json 与 manifest.hooks、monitors、mcpServers、lspServers、settings、userConfig 等；错误收集到 errors 数组。
 */
async function createPluginFromPath(
  pluginPath,
  pluginSource,
  enabled,
  fallbackName,
  pluginEnabled = true,
  storageV5,
  containmentRoots,
  options,
  containedIn,
) {
  let errors = [];
  let warnings = [];
  let resolvedRoots = containmentRoots ?? (await resolveContainmentRoots([pluginPath], "plugin directory"));
  let { manifest, manifestPath, depConstraints } = await loadPluginManifest(
    pluginPath,
    fallbackName,
    pluginSource,
    [],
    {
      ...options,
      containedIn,
    },
    storageV5,
  );
  let plugin = {
    name: manifest.name,
    manifest,
    path: pluginPath,
    source: pluginSource,
    repository: pluginSource,
    enabled,
    depConstraints,
    ...(containedIn !== undefined && {
      filesAnchor: containedIn,
      entriesAnchor: containedIn,
    }),
  };
  let statErrors = new Map();
  let probeDir = async (dirName) => {
    try {
      await stat_2(join(pluginPath, dirName));
      return true;
    } catch (error) {
      if (!isPathAbsent(error)) statErrors.set(dirName, getErrnoCode(error) ?? "UNKNOWN");
      return false;
    }
  };
  let [hasCommands, hasAgents, hasSkills, hasOutputStyles, hasThemes, hasWorkflows] = await (async () => {
    let folderNames = ["commands", "agents", "skills", "output-styles", "themes"];
    let coords =
      isStorageV5Enabled() && storageV5 !== undefined
        ? parseVersionCachePath(pluginPath, anchoredPluginCachePath())
        : null;
    if (isStorageV5Enabled() && storageV5 !== undefined && coords !== null) {
      let scopesPaged = new Set();
      let cursor;
      let failed = false;
      do {
        let page = await storageV5.listEntries(
          {
            namespace: "pluginCache",
            marketplace: coords.marketplace,
            plugin: coords.plugin,
            version: coords.version,
          },
          {
            skipKeyStats: true,
            ...(cursor === undefined
              ? {}
              : {
                  cursor,
                }),
          },
        );
        if (!page.ok) {
          failed = true;
          break;
        }
        for (let item of page.value.items) {
          let name =
            item.kind === "scope" && item.scope.namespace === "pluginCache"
              ? item.scope.relPath?.at(-1)
              : undefined;
          if (name !== undefined) scopesPaged.add(name);
        }
        cursor = page.value.cursor;
      } while (cursor !== undefined);
      if (!failed) {
        let probeOne = (dirName, alreadyKnown) => (alreadyKnown ? Promise.resolve(true) : probeDir(dirName));
        return Promise.all([
          ...folderNames.map((folderName) => probeOne(folderName, scopesPaged.has(folderName))),
          probeOne("workflows", scopesPaged.has("workflows")),
        ]);
      }
    }
    return Promise.all([...folderNames.map((folderName) => probeDir(folderName)), probeDir("workflows")]);
  })();
  for (let [folderName, code] of [...statErrors].sort(([left], [right]) => left.localeCompare(right))) {
    let folderPath = join(pluginPath, folderName);
    logForDebugging(
      `Plugin ${manifest.name}: could not check the default ${folderName}/ folder at ${folderPath} (${code}); not loading it`,
      {
        level: "error",
      },
    );
    errors.push({
      type: "path-not-found",
      source: pluginSource,
      plugin: manifest.name,
      path: folderPath,
      component: folderName,
      errno: code,
    });
  }
  let { marketplace } = parsePluginIdentifier_2(pluginSource);
  for (let [manifestField, hasDefaultFolder, component, folderName] of [
    ["commands", hasCommands, "commands", "commands"],
    ["agents", hasAgents, "agents", "agents"],
    ["outputStyles", hasOutputStyles, "output-styles", "output-styles"],
    ["themes", hasThemes, "themes", "themes"],
  ]) {
    let experimentalValue = manifest.experimental?.[manifestField];
    let spec = manifest[manifestField];
    if (manifestField === "themes") spec = manifest.experimental?.themes ?? manifest.themes;
    else if (manifestField === "outputStyles") spec = manifest.outputStyles;
    let fields = [];
    if (experimentalValue !== undefined) fields.push(`experimental.${manifestField}`);
    if (manifest[manifestField] !== undefined && (experimentalValue === undefined || true))
      fields.push(manifestField);
    if (!spec || !hasDefaultFolder) continue;
    logPluginFolderShadowed(manifest.name, marketplace, component);
    let folderPath = join(pluginPath, folderName);
    if (specCoversDefaultDir(spec, pluginPath, folderPath)) continue;
    logForDebugging(
      `Plugin ${manifest.name}: ${folderName}/ folder exists but is not auto-loaded because the manifest sets ${fields.map((field) => `"${field}"`).join(" and ")}`,
    );
    warnings.push({
      type: "folder-shadowed-by-manifest",
      source: pluginSource,
      plugin: manifest.name,
      component,
      folderPath,
      manifestFields: fields,
    });
  }
  if (manifest.workflows && hasWorkflows) {
    logPluginFolderShadowed(manifest.name, marketplace, "workflows");
    let workflowsFolder = join(pluginPath, "workflows");
    if (!specCoversDefaultDir(manifest.workflows, pluginPath, workflowsFolder))
      warnings.push({
        type: "folder-shadowed-by-manifest",
        source: pluginSource,
        plugin: manifest.name,
        component: "workflows",
        folderPath: workflowsFolder,
        manifestFields: [
          manifest.experimental?.workflows !== undefined ? "experimental.workflows" : "workflows",
        ],
      });
  }
  if (
    (manifest.experimental?.monitors ?? manifest.monitors) !== undefined &&
    (await isCachePresent(storageV5, join(pluginPath, "monitors", "monitors.json")))
  )
    logPluginFolderShadowed(manifest.name, marketplace, "monitors");
  let useDefaultCommands = !manifest.commands && hasCommands;
  let useDefaultAgents = !manifest.agents && hasAgents;
  let useDefaultSkills = hasSkills;
  let outputStyles = manifest.outputStyles;
  let useDefaultOutputStyles = !outputStyles && hasOutputStyles;
  let useDefaultThemes = !(manifest.experimental?.themes ?? manifest.themes) && hasThemes;
  let useDefaultWorkflows = !manifest.workflows && hasWorkflows;
  let folderChecks = [
    ["commands", useDefaultCommands],
    ["agents", useDefaultAgents],
    ["skills", useDefaultSkills],
    ["output-styles", useDefaultOutputStyles],
    ["themes", useDefaultThemes],
    ["workflows", useDefaultWorkflows],
  ];
  let checks = await Promise.all(
    folderChecks.map(([folderName, useDefault]) =>
      useDefault && containedIn !== undefined
        ? findSymlinkEscape(containedIn, pluginPath, folderName)
        : undefined,
    ),
  );
  let escapedFolders = new Set();
  folderChecks.forEach(([folderName], index) => {
    let escapeReason = checks[index];
    if (escapeReason === undefined) return;
    escapedFolders.add(folderName);
    let fullPath = join(pluginPath, folderName);
    logForDebugging(
      `Plugin ${manifest.name}: did not load the ${folderName} folder at ${fullPath}: ${escapeReason}`,
      {
        level: "error",
      },
    );
    errors.push({
      type: "path-traversal",
      source: pluginSource,
      plugin: manifest.name,
      path: fullPath,
      component: folderName,
      reason: escapeReason,
    });
  });
  let commandsPath = join(pluginPath, "commands");
  if (useDefaultCommands && !escapedFolders.has("commands")) plugin.commandsPath = commandsPath;
  if (manifest.commands)
    await finishLoadingPluginFromPath(
      plugin,
      manifest.commands,
      {
        pluginPath,
        pluginName: manifest.name,
        errorSource: pluginSource,
        mode: "assign",
        origin: "manifest",
        resolvePath: resolveWithinDir,
        anchor: resolvedRoots,
        registerInlineContent: true,
        errors,
      },
      storageV5,
    );
  let agentsPath = join(pluginPath, "agents");
  if (useDefaultAgents && !escapedFolders.has("agents")) plugin.agentsPath = agentsPath;
  if (manifest.agents) {
    let agentSpecs = Array.isArray(manifest.agents) ? manifest.agents : [manifest.agents];
    let validAgents = await validatePluginPaths(
      agentSpecs,
      pluginPath,
      manifest.name,
      pluginSource,
      "agents",
      "Agent",
      "specified in manifest but",
      errors,
      resolvedRoots,
      false,
      storageV5,
    );
    if (validAgents.length > 0) plugin.agentsPaths = validAgents;
  }
  let skillsPath = join(pluginPath, "skills");
  if (useDefaultSkills && !escapedFolders.has("skills")) plugin.skillsPath = skillsPath;
  if (manifest.skills) {
    let defaultSkillsPath = resolve_2(skillsPath);
    let filtered = (Array.isArray(manifest.skills) ? manifest.skills : [manifest.skills]).filter(
      (skillSpec) => !escapedFolders.has("skills") || resolve_2(pluginPath, skillSpec) !== defaultSkillsPath,
    );
    let rootResolved = resolve_2(pluginPath);
    let filtered_2 = (
      await validatePluginPaths(
        filtered,
        pluginPath,
        manifest.name,
        pluginSource,
        "skills",
        "Skill",
        "specified in manifest but",
        errors,
        resolvedRoots,
        true,
        storageV5,
      )
    ).filter((path) => {
      let resolved = resolve_2(path);
      if (resolved === defaultSkillsPath) return false;
      if (marketplace === SKILLS_DIR && resolved === rootResolved) return false;
      return true;
    });
    if (filtered_2.length > 0) plugin.skillsPaths = filtered_2;
  } else if (!useDefaultSkills && marketplace !== SKILLS_DIR) {
    let skillFilePath = join(pluginPath, "SKILL.md");
    let probe = await probeComponentPath(storageV5, skillFilePath);
    if (
      probe === "present" &&
      !(await reportIfPathEscapes(containedIn, pluginPath, "SKILL.md", {
        errors,
        source: pluginSource,
        plugin: manifest.name,
        component: "skills",
      }))
    )
      plugin.skillsPaths = [pluginPath];
    else if (typeof probe === "object")
      reportUncheckablePath(errors, pluginSource, manifest.name, "skills", skillFilePath, probe);
  }
  let outputStylesPath = join(pluginPath, "output-styles");
  if (useDefaultOutputStyles && !escapedFolders.has("output-styles"))
    plugin.outputStylesPath = outputStylesPath;
  if (outputStyles) {
    let styleSpecs = Array.isArray(outputStyles) ? outputStyles : [outputStyles];
    let validStyles = await validatePluginPaths(
      styleSpecs,
      pluginPath,
      manifest.name,
      pluginSource,
      "output-styles",
      "Output style",
      "specified in manifest but",
      errors,
      resolvedRoots,
      false,
      storageV5,
    );
    if (validStyles.length > 0) plugin.outputStylesPaths = validStyles;
  }
  let themesPath = join(pluginPath, "themes");
  if (useDefaultThemes && !escapedFolders.has("themes")) plugin.themesPath = themesPath;
  let themes = manifest.experimental?.themes ?? manifest.themes;
  if (themes) {
    let themeSpecs = Array.isArray(themes) ? themes : [themes];
    let validThemes = await validatePluginPaths(
      themeSpecs,
      pluginPath,
      manifest.name,
      pluginSource,
      "themes",
      "Theme",
      "specified in manifest but",
      errors,
      resolvedRoots,
      false,
      storageV5,
    );
    if (validThemes.length > 0) plugin.themesPaths = validThemes;
  }
  if (useDefaultWorkflows && !escapedFolders.has("workflows"))
    plugin.workflowsPath = join(pluginPath, "workflows");
  if (manifest.workflows) {
    let workflowSpecs = Array.isArray(manifest.workflows) ? manifest.workflows : [manifest.workflows];
    let validWorkflows = await validatePluginPaths(
      workflowSpecs,
      pluginPath,
      manifest.name,
      pluginSource,
      "workflows",
      "Workflow",
      "specified in manifest but",
      errors,
      resolvedRoots,
      false,
      storageV5,
    );
    if (validWorkflows.length > 0) plugin.workflowsPaths = validWorkflows;
  }
  let base;
  let loadedHookPaths = new Set();
  let hooksPathsSeen = new Set();
  let hookModules = [];
  let standardHooksPath = join(pluginPath, "hooks", "hooks.json");
  let hooksProbe = await probeComponentPath(storageV5, standardHooksPath);
  let hooksEscapes =
    hooksProbe === "present" &&
    (await reportIfPathEscapes(containedIn, pluginPath, join("hooks", "hooks.json"), {
      errors,
      source: pluginSource,
      plugin: manifest.name,
      component: "hooks",
    }));
  if (hooksProbe === "present" && !hooksEscapes)
    try {
      let { hooks, modules } = await loadPluginHooks_3(standardHooksPath, manifest.name, storageV5);
      base = Object.keys(hooks).length > 0 ? hooks : undefined;
      for (let spec of modules)
        hookModules.push({
          hooksFilePath: standardHooksPath,
          spec,
        });
      let realHooksPath = standardHooksPath;
      try {
        realHooksPath = await getFsImplementation().realpath(standardHooksPath);
      } catch {}
      loadedHookPaths.add(realHooksPath);
      hooksPathsSeen.add(realHooksPath);
      hooksPathsSeen.add(standardHooksPath);
      logForDebugging(
        `Read hooks.json for plugin ${manifest.name} (enabled=${enabled}${enabled ? "" : "; will NOT register, plugin is disabled"}): ${standardHooksPath}`,
      );
    } catch (error) {
      if (error instanceof HookValidationError) throw error;
      let errorMsg = errorMessage(error);
      logForDebugging(`Failed to load hooks for ${manifest.name}: ${errorMsg}`, {
        level: "error",
      });
      errors.push({
        type: "hook-load-failed",
        source: pluginSource,
        plugin: manifest.name,
        hookPath: standardHooksPath,
        reason: errorMsg,
      });
    }
  else if (typeof hooksProbe === "object") {
    logForDebugging(
      `Could not determine whether ${manifest.name} ships hooks/hooks.json: ${hooksProbe.unknown}`,
      {
        level: "error",
      },
    );
    errors.push({
      type: "hook-load-failed",
      source: pluginSource,
      plugin: manifest.name,
      hookPath: standardHooksPath,
      reason: `Could not determine whether ${standardHooksPath} exists: ${hooksProbe.unknown}`,
      ...(hooksProbe.errno !== undefined && {
        errno: hooksProbe.errno,
      }),
    });
  }
  if (manifest.hooks) {
    let hookSpecs = Array.isArray(manifest.hooks) ? manifest.hooks : [manifest.hooks];
    for (let hookSpec of hookSpecs)
      if (typeof hookSpec === "string") {
        if (hooksEscapes && resolveWithinDir(pluginPath, hookSpec) === resolve_2(standardHooksPath)) continue;
        let { fullPath, reason, real } = await resolveComponentPath(
          resolveWithinDir,
          resolvedRoots,
          pluginPath,
          hookSpec,
        );
        if (fullPath === null) {
          logForDebugging(
            `Hooks file ${hookSpec} specified in manifest but escapes plugin directory for ${manifest.name}${reason === undefined ? "" : `: ${reason}`}`,
            {
              level: "error",
            },
          );
          errors.push({
            type: "path-traversal",
            source: pluginSource,
            plugin: manifest.name,
            path: hookSpec,
            component: "hooks",
            ...(reason !== undefined && {
              reason,
            }),
          });
          continue;
        }
        if (!(await isCachePresent(storageV5, fullPath))) {
          logForDebugging(
            `Hooks file ${hookSpec} specified in manifest but not found at ${fullPath} for ${manifest.name}`,
            {
              level: "error",
            },
          );
          errors.push({
            type: "path-not-found",
            source: pluginSource,
            plugin: manifest.name,
            path: fullPath,
            component: "hooks",
          });
          continue;
        }
        let loadedPath = real ?? fullPath;
        if (hooksPathsSeen.has(loadedPath)) {
          logForDebugging(
            `Hooks file ${hookSpec} in the manifest of plugin ${manifest.name} names the standard hooks/hooks.json, which loads on its own; loaded once`,
          );
          continue;
        }
        if (loadedHookPaths.has(loadedPath)) {
          logForDebugging(
            `Skipping duplicate hooks file for plugin ${manifest.name}: ${hookSpec} (resolves to already-loaded file: ${loadedPath})`,
          );
          if (pluginEnabled) {
            let errorMsg = `Duplicate hooks file detected: ${hookSpec} resolves to already-loaded file ${loadedPath}; manifest.hooks lists it more than once.`;
            logForDebugging(errorMsg, {
              level: "error",
            });
            errors.push({
              type: "hook-load-failed",
              source: pluginSource,
              plugin: manifest.name,
              hookPath: fullPath,
              reason: errorMsg,
            });
          }
          continue;
        }
        try {
          let pluginHooks = await loadPluginHooks_3(fullPath, manifest.name, storageV5);
          try {
            if (Object.keys(pluginHooks.hooks).length > 0) base = mergeHooksSettings(base, pluginHooks.hooks);
            loadedHookPaths.add(loadedPath);
            for (let spec of pluginHooks.modules)
              hookModules.push({
                hooksFilePath: fullPath,
                spec,
              });
            logForDebugging(
              `Read manifest hooks for plugin ${manifest.name} (enabled=${enabled}${enabled ? "" : "; will NOT register, plugin is disabled"}): ${hookSpec}`,
            );
          } catch (mergeError) {
            let mergeErrorMsg = errorMessage(mergeError);
            logForDebugging(`Failed to merge hooks from ${hookSpec} for ${manifest.name}: ${mergeErrorMsg}`, {
              level: "error",
            });
            logError(toError(mergeError));
            errors.push({
              type: "hook-load-failed",
              source: pluginSource,
              plugin: manifest.name,
              hookPath: fullPath,
              reason: `Failed to merge: ${mergeErrorMsg}`,
            });
          }
        } catch (error) {
          if (error instanceof HookValidationError) throw error;
          let errorMsg = errorMessage(error);
          logForDebugging(`Failed to load hooks from ${hookSpec} for ${manifest.name}: ${errorMsg}`, {
            level: "error",
          });
          errors.push({
            type: "hook-load-failed",
            source: pluginSource,
            plugin: manifest.name,
            hookPath: fullPath,
            reason: errorMsg,
          });
        }
      } else if (typeof hookSpec === "object") {
        let { hooks, invalid, unloadableGuards } = parseHooksSetting(hookSpec);
        if (unloadableGuards.length > 0)
          throw new HookValidationError(
            invalid
              .filter((invalid) => unloadableGuards.includes(invalid.path))
              .map((invalidEntry) => `${invalidEntry.path}: ${invalidEntry.reason}`)
              .join("; "),
          );
        errors.push(...toHookLoadErrors(invalid, pluginSource, manifest.name, manifestPath ?? pluginPath));
        if (hooks) base = mergeHooksSettings(base, hooks);
      }
  }
  let pluginHooksModule = await loadPluginHooksModule({
    plugin,
    namedModules: hookModules,
    source: pluginSource,
    storageV5,
    anchor: resolvedRoots,
  });
  if (pluginHooksModule !== undefined) errors.push(pluginHooksModule);
  if (base) plugin.hooksConfig = base;
  let pluginMonitors = await loadPluginMonitors(
    pluginPath,
    manifest,
    pluginSource,
    errors,
    resolvedRoots,
    storageV5,
    containedIn,
  );
  if (pluginMonitors) plugin.monitors = pluginMonitors;
  let containmentRefused = await reportIfPathEscapes(containedIn, pluginPath, "settings.json", {
    errors,
    source: pluginSource,
    plugin: manifest.name,
    component: "settings",
  });
  let pluginSettings = await loadPluginSettings(pluginPath, manifest, storageV5, containmentRefused);
  if (pluginSettings) plugin.settings = pluginSettings;
  return {
    plugin,
    errors,
    warnings,
    hasManifest: manifestPath !== null,
    manifestPath,
  };
}
//@ chunk-5xgkngpb.js:4664194-4664256 layout
var PluginAllowedSettingsSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:4664194", () => {
  PluginAllowedSettingsSchema = DoctorLazy(() =>
    objectSchema(
      Object.fromEntries(
        SETTINGS_KEYS_WITH_PLUGIN_ENUM.map((settingKey) => [settingKey, getSettingsFieldSchema(settingKey)]),
      ),
    ),
  );
});
//@ chunk-5xgkngpb.js:4664256-4664376 file-local
function parsePluginSettings(raw) {
  let result = PluginAllowedSettingsSchema().safeParse(raw);
  if (!result.success) return;
  let data = result.data;
  if (Object.keys(data).length === 0) return;
  return data;
}
//@ chunk-5xgkngpb.js:4664376-4665578 fingerprint (2.1.88 match: loadPluginSettings, 0.6)
/**
 * 读取插件根目录 settings.json（或 manifest.settings），只保留白名单键，作为插件启用期间合并进用户设置的值。
 */
async function loadPluginSettings(pluginPath, manifest, storageV5, containmentRefused = false) {
  let settingsJsonPath = join(pluginPath, "settings.json");
  let parseFailed = false;
  try {
    if (containmentRefused)
      throw Object.assign(Error("settings.json not read"), {
        code: "ENOENT",
      });
    let backendRead =
      isStorageV5Enabled() && storageV5 !== undefined
        ? await readFileViaStorageBackend(storageV5, settingsJsonPath)
        : null;
    let settingsContent;
    if (backendRead !== null) {
      if (backendRead.outcome === "absent")
        throw Object.assign(Error("settings.json absent"), {
          code: "ENOENT",
        });
      if (backendRead.outcome === "error")
        throw Object.assign(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            backendRead.detail,
            "plugin settings read failed (v5 backend)",
          ),
          backendRead.telemetryCode !== undefined
            ? {
                code: backendRead.telemetryCode,
              }
            : {},
        );
      settingsContent = backendRead.content;
    } else
      settingsContent = await readFile(settingsJsonPath, {
        encoding: "utf-8",
      });
    let parsed = jsonParse(settingsContent);
    if (isPlainObject_6(parsed)) {
      let filtered = parsePluginSettings(parsed);
      if (filtered) {
        logForDebugging(`Loaded settings from settings.json for plugin ${manifest.name}`);
        logFeatureOk("plugin_load_settings");
        return filtered;
      }
    }
  } catch (e) {
    if (!isFsInaccessible(e)) {
      parseFailed = true;
      logForDebugging(`Failed to parse settings.json for plugin ${manifest.name}: ${e}`, {
        level: "warn",
      });
    }
  }
  if (manifest.settings) {
    let filtered = parsePluginSettings(manifest.settings);
    if (filtered) {
      logForDebugging(`Loaded settings from manifest for plugin ${manifest.name}`);
      if (containmentRefused)
        logFeatureSad("plugin_load_settings", "plugin_load_settings_containment_refused");
      else if (parseFailed) logFeatureSad("plugin_load_settings", "plugin_load_settings_parse_failed");
      else logFeatureOk("plugin_load_settings");
      return filtered;
    }
  }
  if (containmentRefused) logFeatureSad("plugin_load_settings", "plugin_load_settings_containment_refused");
  else if (parseFailed) logFeatureSad("plugin_load_settings", "plugin_load_settings_parse_failed");
  else logFeatureOk("plugin_load_settings");
  return;
}
//@ chunk-5xgkngpb.js:4665578-4666298 layout
/**
 * 解析 marketplace 条目里内联的 hooks：只支持对象形式（事件名 → matcher 数组），文件路径与数组形式报 hook-load-failed。
 */
function parseMarketplaceEntryHooks(hooks, source, plugin, hookPath) {
  let formHint =
    "Define hooks in the plugin's own hooks/hooks.json (or its plugin.json), or inline them here as an object mapping hook event names to matcher arrays.";
  if (Array.isArray(hooks) && hasGuardHooks_2(hooks))
    throw new HookValidationError(
      `hooks: the array form is not yet supported in a marketplace entry (${UNLOADABLE_GUARD_NOTE}). ${formHint}`,
    );
  if (typeof hooks === "string" || Array.isArray(hooks))
    return {
      hooks: undefined,
      errors: [
        {
          type: "hook-load-failed",
          source,
          plugin,
          hookPath,
          reason: `hooks: the file-path and array forms are not yet supported in a marketplace entry. ${formHint}`,
        },
      ],
    };
  let { hooks: hooks_2, invalid, unloadableGuards } = parseHooksSetting(hooks);
  if (unloadableGuards.length > 0)
    throw new HookValidationError(
      invalid
        .filter((entry) => unloadableGuards.includes(entry.path))
        .map((entry) => `${entry.path}: ${entry.reason}`)
        .join("; "),
    );
  return {
    hooks: hooks_2,
    errors: toHookLoadErrors(invalid, source, plugin, hookPath),
  };
}
//@ chunk-5xgkngpb.js:4666298-4666432 layout
function toHookLoadErrors(invalid, source, plugin, hookPath) {
  return invalid.map(({ path, reason }) => ({
    type: "hook-load-failed",
    source,
    plugin,
    hookPath,
    reason: `${path}: ${reason}`,
  }));
}
//@ chunk-5xgkngpb.js:4666432-4666565 file-local
function mergeHooksSettings(base, additional) {
  if (!base) return additional;
  let merged = {
    ...base,
  };
  for (let [event, matchers] of Object.entries(additional))
    if (!merged[event]) merged[event] = matchers;
    else merged[event] = [...(merged[event] || []), ...matchers];
  return merged;
}
//@ chunk-5xgkngpb.js:4666565-4668447 placement
/**
 * 解析安装记录中的插件路径，路径缺失或不对时提示重新安装。
 */
async function loadNpmMarketplacePlugin({
  pluginId,
  packageName,
  enabledValue,
  installations,
  registryReadFailed,
  knownMarketplaces,
  cacheOnly,
  preview,
  storageV5,
  credentials,
  errors,
  warnings,
}) {
  let entryEnabled = isDependencyAutoInstallState(enabledValue);
  if (!npmMarketplaceEnabled()) {
    if (entryEnabled)
      errors.push({
        type: "generic-error",
        source: pluginId,
        plugin: packageName,
        error: NPM_DIRECT_INSTALL_DISABLED_MESSAGE,
      });
    return null;
  }
  let trustedRoots = getMarketplaceCandidatePaths(pluginId, knownMarketplaces, tryUnwrapTextPayload());
  let usableInstallation = await pickUsableInstallation(installations, {
    storageV5,
    trustedRoots,
  });
  let resolvedInstallation =
    usableInstallation === undefined
      ? undefined
      : {
          ...usableInstallation,
          installPath: resolve_2(getOriginalCwd(), usableInstallation.installPath),
        };
  if (resolvedInstallation === undefined) {
    if (entryEnabled)
      errors.push({
        type: "plugin-not-installed",
        source: pluginId,
        plugin: packageName,
        ...(registryReadFailed && {
          registryReadFailed: true,
        }),
      });
    return null;
  }
  if (
    usableInstallation !== undefined &&
    classifyMarketplacePath(usableInstallation.installPath, {
      trustedRoots,
    }).suspect
  ) {
    if (entryEnabled)
      errors.push({
        type: "generic-error",
        refused: true,
        source: pluginId,
        plugin: packageName,
        error: `Not loading ${printableName(pluginId, 200)}: its recorded install path ${UNSAFE_PATH_EXPLANATION}; ${runCommandHint(
          "plugin uninstall",
          pluginId,
          {
            tail: "and install it again to re-record it",
            fallback: "uninstall and install it again to re-record it",
          },
        )}.`,
      });
    return null;
  }
  let policyRefusal =
    resolvedInstallation.npmResolved !== undefined
      ? npmResolutionPolicyRefusal({
          packageName,
          tarballUrl: resolvedInstallation.npmResolved,
        })
      : isMarketplaceRestrictionPolicyActive()
        ? `${printableName(pluginId, 200)} was not loaded: its install record does not say where it was fetched from, and your organization restricts plugin sources; ${runCommandHint(
            "plugin uninstall",
            pluginId,
            {
              tail: "and install it again to re-record it",
              fallback: "uninstall and install it again to re-record it",
            },
          )}`
        : null;
  if (policyRefusal !== null) {
    if (entryEnabled)
      errors.push({
        type: "generic-error",
        refused: true,
        source: pluginId,
        plugin: packageName,
        error: policyRefusal,
      });
    return null;
  }
  let entry = toNpmMarketplaceSource(packageName, resolvedInstallation);
  let plugin = await (cacheOnly
    ? loadCachedMarketplacePlugin(
        entry,
        NPM_REGISTRY,
        undefined,
        pluginId,
        enabledValue === true,
        errors,
        warnings,
        resolvedInstallation.installPath,
        installations?.find((installation) => installation.installPath)?.installPath,
        {
          storageV5,
          preview,
          entryEnabled,
          registryReadFailed,
        },
      )
    : loadPluginFromMarketplaceEntry(
        entry,
        NPM_REGISTRY,
        undefined,
        pluginId,
        enabledValue === true,
        errors,
        warnings,
        resolvedInstallation.version,
        undefined,
        {
          storageV5,
          entryEnabled,
          credentials,
          installRecord: registryReadFailed ? "unknown" : "present",
          recordedArchiveSha256: undefined,
          recordedClaudeAiPluginId: undefined,
          recordedNpmIntegrity: resolvedInstallation.npmIntegrity,
        },
      ));
  if (plugin && resolvedInstallation.npmResolved !== undefined) {
    let npmResolution = redactNpmTarball({
      packageName,
      tarballUrl: resolvedInstallation.npmResolved,
    });
    if (npmResolution !== null) plugin.npmResolution = npmResolution;
  }
  return plugin;
}
//@ chunk-5xgkngpb.js:4668447-4668648 placement
/**
 * 合并 --add-dir 目录与设置的 enabledPlugins，过滤出 ID 合法、非 builtin、非保留市场的条目。
 */
function getEnabledPluginEntries() {
  let allEnabledPlugins = {
    ...getAddDirEnabledPlugins(),
    ...(getSettings_DEPRECATED().enabledPlugins || {}),
  };
  return Object.entries(allEnabledPlugins).filter(([key, value]) => {
    if (!PluginIdSchema().safeParse(key).success || value === undefined) return false;
    let { marketplace } = parsePluginIdentifier(key);
    return marketplace !== BUILTIN && !isOfficialMarketplace_2(marketplace);
  });
}
//@ chunk-5xgkngpb.js:4668648-4668685 placement
/**
 * 是否有启用的市场插件条目（用于决定刷新策略）。
 */
function hasMarketplaceBackedPlugins() {
  return getEnabledPluginEntries().length > 0;
}
//@ chunk-5xgkngpb.js:4668685-4682132 callgraph-witnessed (2.1.88 match: loadPluginsFromMarketplaces, 0.141)
/**
 * 加载全部市场插件：读 known_marketplaces 与 enabledPlugins，套用 strictKnownMarketplaces/blockedMarketplaces 策略，对每个启用插件找安装记录与缓存（cacheOnly 时缓存缺失只报 plugin-cache-miss），调用 loadPluginFromMarketplaceEntry；收集 errors/warnings。
 */
async function loadPluginsFromMarketplaces({ cacheOnly, preview = false, storageV5, credentials }) {
  let now = Date.now();
  let plugins = [];
  let errors = [];
  let warnings = [];
  let enabledPluginEntries = getEnabledPluginEntries();
  let config = await loadKnownMarketplacesSafe(storageV5);
  let registryReadFailed = isKnownMarketplacesReadFailure(config);
  let admissionKinds = admissionKindsFor(config);
  let admissionCause = (name) => admissionCauseFor(config, name);
  let strictAllowlist = getStrictKnownMarketplaces();
  let blocklist = isMarketplaceRestrictionPolicyActive();
  let marketplaceNames = new Set(
    enabledPluginEntries
      .map(([pluginId]) => parsePluginIdentifier(pluginId).marketplace)
      .filter(
        (marketplaceName) => !!marketplaceName && marketplaceName.toLowerCase() !== pluginManifestPathSchemas,
      ),
  );
  let declaredSource = registryReadFailed
    ? undefined
    : validateDeclaredMarketplaceSource(marketplaceNames, config);
  let addedMarketplaces = new Set(Object.keys(declaredSource?.additions ?? {}));
  let skippedMarketplaces = new Map(declaredSource?.skipped);
  let mergedMarketplaces =
    addedMarketplaces.size === 0
      ? config
      : {
          ...config,
          ...declaredSource?.additions,
        };
  let marketplaceCatalogs = new Map();
  let unreadableCatalogs = new Set();
  await Promise.all(
    [...marketplaceNames].map(async (marketplaceName) => {
      let registryEntry = Object.hasOwn(mergedMarketplaces, marketplaceName)
        ? mergedMarketplaces[marketplaceName]
        : undefined;
      let isAdded = addedMarketplaces.has(marketplaceName);
      let readOptions = {
        registryEntry,
        registryEntryIsSaved: !isAdded,
        unreadableCatalogs,
      };
      let marketplaceCacheOnly = await getMarketplaceCacheOnly(marketplaceName, storageV5, readOptions);
      if (isAdded && (marketplaceCacheOnly === null || marketplaceCacheOnly.name !== marketplaceName)) {
        let entry = mergedMarketplaces[marketplaceName];
        let location = printableOrEmpty(entry?.installLocation ?? "");
        if (marketplaceCacheOnly === null) {
          skippedMarketplaces.set(
            marketplaceName,
            `no marketplace manifest could be read at its declared location ${location}`,
          );
          logMarketplaceNoticeOnce(
            `declared-unreadable:${marketplaceName}:${location}`,
            `Marketplace ${jsonStringify(marketplaceName)} is declared in settings, but no marketplace manifest could be read at ${location} (.claude-plugin/marketplace.json missing or invalid): left to the reconciler, its plugins do not load from the declaration`,
          );
        } else {
          skippedMarketplaces.set(
            marketplaceName,
            `the marketplace at its declared location names itself ${jsonStringify(marketplaceCacheOnly.name)}`,
          );
          logMarketplaceNoticeOnce(
            `catalog-name:${marketplaceName}:${marketplaceCacheOnly.name}`,
            `Marketplace ${jsonStringify(marketplaceName)} is declared in settings, but the marketplace at the declared path names itself ${jsonStringify(marketplaceCacheOnly.name)}: declare it under that name (its plugins are enabled as <plugin>@${marketplaceCacheOnly.name})`,
          );
        }
        delete mergedMarketplaces[marketplaceName];
        addedMarketplaces.delete(marketplaceName);
        unreadableCatalogs.delete(marketplaceName);
        marketplaceCatalogs.set(marketplaceName, null);
        return;
      }
      let canRetry =
        registryEntry !== undefined &&
        !isAdded &&
        !isClaudeAiMarketplaceSource(registryEntry.source) &&
        !isPluginDirectorySource(registryEntry.source) &&
        validateReservedMarketplaceEntry(marketplaceName, registryEntry) === null &&
        !isImpersonatingOfficialMarketplace(marketplaceName, registryEntry);
      for (let delayMs of ARCHIVE_RETRY_DELAYS_MS) {
        if (marketplaceCacheOnly !== null || !canRetry) break;
        await sleep(delayMs);
        marketplaceCacheOnly = await getMarketplaceCacheOnly(marketplaceName, storageV5, readOptions);
        if (marketplaceCacheOnly !== null)
          logForDebugging(
            `Marketplace ${marketplaceName}: catalog readable again after a re-read (another process was refreshing it)`,
          );
      }
      marketplaceCatalogs.set(marketplaceName, marketplaceCacheOnly);
    }),
  );
  let renames = [];
  let uniqueMarketplaces = new Set(enabledPluginEntries.map(([pluginId]) => pluginId));
  let marketplacePluginNames = new Map();
  let flattened = enabledPluginEntries.flatMap(([pluginId, enabledValue]) => {
    let { name: pluginName, marketplace } = parsePluginIdentifier(pluginId);
    let catalog = marketplace ? marketplaceCatalogs.get(marketplace) : null;
    let registryEntry = marketplace ? mergedMarketplaces[marketplace] : undefined;
    if (
      !pluginName ||
      !marketplace ||
      !catalog?.renames ||
      enabledValue === false ||
      isSourceDisallowedOrUnverifiable(registryEntry?.source)
    )
      return [[pluginId, enabledValue]];
    let names = marketplacePluginNames.get(marketplace);
    if (!names) {
      names = new Set(catalog.plugins.map((plugin) => plugin.name));
      marketplacePluginNames.set(marketplace, names);
    }
    if (names.has(pluginName)) return [[pluginId, enabledValue]];
    let pluginRename = resolvePluginRename(pluginName, catalog.renames, names);
    if (pluginRename === null) return [[pluginId, enabledValue]];
    if (pluginRename.kind === "unresolved") {
      if (!preview) logPluginRenamed(pluginName, marketplace, pluginRename);
      logForDebugging(
        `Plugin "${pluginId}" has a renames entry but it does not resolve (${pluginRename.reason}); falling through to plugin-not-found`,
        {
          level: "warn",
        },
      );
      return [[pluginId, enabledValue]];
    }
    let renamedId = pluginRename.kind === "renamed" ? `${pluginRename.to}@${marketplace}` : null;
    if (renamedId !== null && !PluginIdSchema().safeParse(renamedId).success) {
      if (!preview)
        logPluginRenamed(pluginName, marketplace, {
          kind: "unresolved",
          reason: "target-missing",
        });
      logForDebugging(
        `Plugin "${pluginId}" rename target "${renamedId}" is not a valid PluginIdSchema id; falling through to plugin-not-found`,
        {
          level: "warn",
        },
      );
      return [[pluginId, enabledValue]];
    }
    if (!preview) logPluginRenamed(pluginName, marketplace, pluginRename);
    renames.push({
      marketplace,
      oldName: pluginName,
      oldId: pluginId,
      newId: renamedId,
      resolution: pluginRename,
    });
    warnings.push({
      type: "plugin-renamed",
      source: pluginId,
      plugin: pluginName,
      marketplace,
      renamedTo: pluginRename.kind === "renamed" ? pluginRename.to : null,
    });
    if (renamedId === null || uniqueMarketplaces.has(renamedId)) return [];
    uniqueMarketplaces.add(renamedId);
    return [[renamedId, enabledValue]];
  });
  if (!preview && renames.length > 0)
    try {
      await removeInstallationsAndRefreshSnapshot(
        renames.flatMap((rename) =>
          rename.newId === null
            ? []
            : [
                {
                  oldId: rename.oldId,
                  newId: rename.newId,
                },
              ],
        ),
        storageV5,
      );
    } catch (error) {
      logForDebugging(`renamePluginInstallations failed: ${toError(error).message}`, {
        level: "warn",
      });
    }
  if (!preview && isStorageV5Enabled() && storageV5 !== undefined)
    await primeInstalledPluginsCache(storageV5);
  let installedPlugins = preview
    ? isStorageV5Enabled() && storageV5 !== undefined
      ? await loadInstalledPlugins(storageV5)
      : loadInstalledPluginsSync()
    : getInstalledPluginsSnapshot();
  let installedListFailed = hasFailedInstalledPluginsRead(installedPlugins);
  let lenientInstalled = installedListFailed ? await readInstalledPluginsLenient(storageV5) : {};
  let officialSourced = isOfficialMarketplaceSourced(config);
  let directoryPolicyBlock = pluginDirectoryPolicyBlock();
  let bindings = flattened.some(([pluginId]) => pluginId.endsWith(`@${OFFICIAL_MARKETPLACE_NAME}`))
    ? await bindingsWithReadFailure()
    : new Map();
  let makeContainsCheck = (rootPathFn) => {
    let rootPath;
    let marketplaceCatalogs = new Map();
    return (name) => {
      let contained = marketplaceCatalogs.get(name);
      if (contained === undefined) {
        rootPath ??= toComparablePath(rootPathFn());
        let comparablePath = toComparablePath(name);
        contained =
          comparablePath !== rootPath &&
          isPathWithin_2(rootPath, comparablePath, {
            alreadyComparable: true,
          });
        marketplaceCatalogs.set(name, contained);
      }
      return contained;
    };
  };
  let isInMarketplaceCache = makeContainsCheck(getResolvedMarketplacesCacheDir);
  let isInPluginCache = makeContainsCheck(anchoredPluginCachePath);
  let isPluginCachePath = (install) => isInPluginCache(install.extractedFrom ?? install.path);
  let results = await Promise.allSettled(
    flattened.map(async ([pluginId, enabledValue]) => {
      let { name: pluginName, marketplace: marketplaceName } = parsePluginIdentifier(pluginId);
      if (marketplaceName === pluginManifestPathSchemas)
        return loadNpmMarketplacePlugin({
          pluginId,
          packageName: pluginName,
          enabledValue,
          installations: installedPlugins.plugins[pluginId],
          registryReadFailed: installedListFailed,
          knownMarketplaces: mergedMarketplaces,
          cacheOnly,
          preview,
          storageV5,
          credentials,
          errors,
          warnings,
        });
      let registryEntry = mergedMarketplaces[marketplaceName];
      let admissionKind =
        marketplaceName === OFFICIAL_MARKETPLACE_NAME && officialSourced
          ? undefined
          : admissionKinds.get(marketplaceName);
      let admissionReason = admissionKind === undefined ? undefined : admissionCause(marketplaceName);
      let registryUnusable = registryReadFailed || admissionKind !== undefined;
      let marketplaceNotFoundError = () => ({
        type: "marketplace-not-found",
        source: pluginId,
        marketplace: marketplaceName,
        availableMarketplaces: Object.keys(mergedMarketplaces),
        ...(registryReadFailed && {
          registryReadFailed: true,
        }),
        ...(admissionKind !== undefined && {
          registrationHidden: admissionKind,
        }),
        ...(admissionReason !== undefined && {
          registrationHiddenReason: admissionReason,
        }),
      });
      let directoryFallback =
        !registryEntry &&
        !registryUnusable &&
        marketplaceName === OFFICIAL_MARKETPLACE_NAME &&
        isSourceAllowedByPolicy({
          source: "pluginDirectory",
        });
      if (!registryEntry && blocklist && !directoryFallback) {
        if (registryUnusable) {
          if (isDependencyAutoInstallState(enabledValue)) errors.push(marketplaceNotFoundError());
          else logForDebugging(`Skipping load-failure error for disabled plugin ${pluginId}`);
          return null;
        }
        errors.push({
          type: "marketplace-blocked-by-policy",
          source: pluginId,
          plugin: pluginName,
          marketplace: marketplaceName,
          blockedByBlocklist: strictAllowlist === null,
          allowedSources: (strictAllowlist ?? []).map((allowlistSource) =>
            formatSourceForDisplay(allowlistSource),
          ),
          sourceUnverifiable: true,
        });
        return null;
      }
      if (registryEntry) {
        let reservedNameMessage = validateReservedMarketplaceEntry(marketplaceName, registryEntry);
        if (reservedNameMessage) {
          if (isDependencyAutoInstallState(enabledValue))
            errors.push({
              type: "marketplace-load-failed",
              source: pluginId,
              marketplace: marketplaceName,
              reason: reservedNameMessage,
              untrustedReservedName: true,
            });
          else logForDebugging(`Skipping reserved-name refusal error for disabled plugin ${pluginId}`);
          return null;
        }
      }
      if (registryEntry && !isSourceAllowedByPolicy(registryEntry.source)) {
        let isBlocked = isSourceInBlocklist(registryEntry.source);
        let allowlist = getStrictKnownMarketplaces() || [];
        errors.push({
          type: "marketplace-blocked-by-policy",
          source: pluginId,
          plugin: pluginName,
          marketplace: marketplaceName,
          blockedByBlocklist: isBlocked,
          allowedSources: isBlocked
            ? []
            : allowlist.map((allowlistSource) => formatSourceForDisplay(allowlistSource)),
          ...(isPluginDirectorySource(registryEntry.source) && isPluginDirectoryDisabledByPolicy()
            ? {
                directoryDisabledByOrganization: true,
              }
            : {}),
        });
        return null;
      }
      let result = null;
      let marketplace = marketplaceCatalogs.get(marketplaceName);
      if (marketplace && registryEntry) {
        let entry = marketplace.plugins.find((plugin) => plugin.name === pluginName);
        if (entry)
          result = {
            entry,
            marketplaceInstallLocation: registryEntry.installLocation,
          };
      } else if (directoryFallback) result = await findPluginDirectoryEntry(pluginName, storageV5, "load");
      else result = await getPluginByIdCacheOnly(pluginId, storageV5);
      if (
        !result &&
        marketplaceName === OFFICIAL_MARKETPLACE_NAME &&
        (registryEntry || directoryFallback) &&
        (installedListFailed || !!installedPlugins.plugins[pluginId]?.length)
      )
        result = await findMissedListingEntry(pluginName, storageV5, directoryFallback || !marketplace);
      let bindingValues = pluginBindingValues(installedPlugins.plugins, pluginId);
      if (result && isUnboundOfficialPlugin(pluginId, bindingValues, bindings, installedListFailed)) {
        if (isDependencyAutoInstallState(enabledValue))
          errors.push({
            type: "generic-error",
            source: pluginId,
            plugin: pluginName,
            error: `Not loading ${printableName(pluginId, 200)}: plugin-directory-bindings.json in the plugins folder could not be used (unreadable, a symbolic link or not a file, over 1 MB, damaged, or written by a newer Claude Code), so its ${OFFICIAL_MARKETPLACE_DISPLAY} listing could not be checked against the repository it was installed from. It loads again once the file can be used.`,
          });
        return null;
      }
      let boundRepoKeys =
        installedListFailed && marketplaceName === OFFICIAL_MARKETPLACE_NAME
          ? findBindingKeysFor(bindings.keys(), pluginId).flatMap((bindingKey) => {
              let repositoryKey = bindings.get(bindingKey);
              return repositoryKey === undefined ? [] : [parseRepoWithRef(repositoryKey)];
            })
          : [];
      let entryRepoKey = result ? samePluginSource(result.entry.source, undefined) : undefined;
      let changedRepoKey = boundRepoKeys.find((repoKey) => repoKey !== entryRepoKey) ?? boundRepoKeys[0];
      if (
        result &&
        ((changedRepoKey !== undefined
          ? changedRepoKey !== samePluginSource(result.entry.source, undefined)
          : isDirectoryRepositoryChanged(pluginId, bindingValues, result.entry.source, bindings)) ||
          (installedListFailed &&
            isDirectoryRepositoryChanged(
              pluginId,
              pluginBindingValues(lenientInstalled, pluginId),
              result.entry.source,
              bindings,
            )))
      ) {
        if (isDependencyAutoInstallState(enabledValue)) {
          let repoKey = changedRepoKey ?? getBoundRepositoryKeys(pluginId, bindingValues, bindings)[0];
          let sliced = (marketplace?.plugins ?? [])
            .filter(
              (otherPlugin) =>
                otherPlugin.name !== pluginName &&
                samePluginSource(otherPlugin.source, undefined) === repoKey,
            )
            .map((otherPlugin) => otherPlugin.name)
            .slice(0, 3);
          errors.push({
            type: "plugin-not-found",
            source: pluginId,
            pluginId: pluginName,
            marketplace: marketplaceName,
            removedFromDirectory: true,
            directoryIdentityChanged: true,
            ...((bindingValues?.length ?? 0) === 0 &&
              changedRepoKey === undefined && {
                directoryHeldWithoutRecord: true,
              }),
            ...(sliced.length > 0 && {
              directoryRenamedTo: sliced,
            }),
          });
        }
        return null;
      }
      if (!result) {
        let hasInstallRecords = installedListFailed || !!installedPlugins.plugins[pluginId]?.length;
        let directoryCatalog = registryEntry
          ? marketplace
          : directoryFallback && hasInstallRecords && isDependencyAutoInstallState(enabledValue)
            ? await loadPluginDirectoryMarketplace(pluginName, storageV5)
            : null;
        if (!isDependencyAutoInstallState(enabledValue))
          logForDebugging(`Skipping load-failure error for disabled plugin ${pluginId}`);
        else if (!registryEntry && !directoryCatalog) {
          if (hasInstallRecords || registryUnusable) {
            errors.push(marketplaceNotFoundError());
            let skippedReason = skippedMarketplaces.get(marketplaceName);
            let reason = registryReadFailed
              ? "unknown because known_marketplaces.json could not be read this load"
              : admissionKind !== undefined
                ? `recorded in known_marketplaces.json but refused this load (${admissionKind})`
                : skippedReason !== undefined
                  ? `declared under extraKnownMarketplaces but not usable this load: ${skippedReason}`
                  : "not known here: neither recorded in known_marketplaces.json nor declared with a directory or file source under extraKnownMarketplaces in an enabled settings source";
            logMarketplaceNoticeOnce(
              `not-loaded:${pluginId}:${reason}`,
              `plugin ${jsonStringify(pluginId)} not loaded (hooks module, commands, skills, servers: none of it): its marketplace ${jsonStringify(marketplaceName)} is ${reason}; \`claude plugin marketplace add <path-or-repo>\` registers it`,
            );
          } else
            logForDebugging(`Skipping orphaned enabledPlugins entry ${pluginId}: marketplace not registered`);
        } else if (!directoryCatalog)
          errors.push({
            type: "marketplace-load-failed",
            source: pluginId,
            marketplace: marketplaceName,
            reason: "cache-miss",
            ...(unreadableCatalogs.has(marketplaceName) && {
              catalogReadFailed: true,
            }),
            ...(unreadableCatalogs.has(marketplaceName) &&
              isRegistryOwnedByName(unreadableCatalogs, marketplaceName) &&
              isAsciiImpersonatingOfficialName(marketplaceName) && {
                nameRefused: true,
                ...(mergedMarketplaces[marketplaceName]?.source.source === "settings" && {
                  nameRefusedDeclaredInSettings: true,
                }),
              }),
            ...(directoryPolicyBlock !== null && marketplaceName === OFFICIAL_MARKETPLACE_NAME
              ? {
                  directoryBlockedBy: directoryPolicyBlock,
                }
              : {}),
          });
        else if (hasInstallRecords) {
          let isOfficialName = marketplaceName === OFFICIAL_MARKETPLACE_NAME;
          let boundRepoKey = isOfficialName
            ? getBoundRepositoryKeys(pluginId, bindingValues, bindings)[0]
            : undefined;
          let renamedTo =
            boundRepoKey !== undefined
              ? directoryCatalog.plugins
                  .filter(
                    (plugin) =>
                      plugin.name !== pluginName &&
                      samePluginSource(plugin.source, undefined) === boundRepoKey,
                  )
                  .map((plugin) => plugin.name)
                  .slice(0, 3)
              : [];
          let notInstallableReason = isOfficialName
            ? await pluginDirectoryNotInstallableReason(pluginName, storageV5)
            : undefined;
          errors.push({
            type: "plugin-not-found",
            source: pluginId,
            pluginId: pluginName,
            marketplace: marketplaceName,
            ...(isOfficialName
              ? {
                  removedFromDirectory: true,
                  ...(installedListFailed && {
                    registryReadFailed: true,
                  }),
                  ...(renamedTo.length > 0 && {
                    directoryRenamedTo: renamedTo,
                  }),
                  ...(notInstallableReason !== undefined && {
                    directoryNotInstallableReason: notInstallableReason,
                  }),
                }
              : {}),
          });
        } else
          logForDebugging(`Skipping orphaned enabledPlugins entry ${pluginId}: not in marketplace catalog`);
        return null;
      }
      let trustedRoots = getMarketplaceCandidatePaths(pluginId, mergedMarketplaces, tryUnwrapTextPayload());
      let usableInstall = await pickUsableInstallation(installedPlugins.plugins[pluginId], {
        storageV5,
        trustedRoots,
      });
      let installRecord =
        usableInstall === undefined
          ? undefined
          : {
              ...usableInstall,
              installPath: resolve_2(getOriginalCwd(), usableInstall.installPath),
            };
      if (typeof result.entry.source !== "string" && !installRecord) {
        if (
          !SETTING_SOURCES.filter(isOperatorSettingSource_2).some(
            (settingSource) => getSettingsForSource(settingSource)?.enabledPlugins?.[pluginId] === true,
          )
        ) {
          let pluginVersion = await calculatePluginVersion(
            pluginId,
            result.entry.source,
            undefined,
            undefined,
            {
              kind: "catalog",
              version: result.entry.version,
            },
            "sha" in result.entry.source ? result.entry.source.sha : undefined,
          );
          if (!(await probeSeedForPlugin(pluginId, pluginVersion, "when-unknown"))) {
            let seedHasOtherVersion =
              isDependencyAutoInstallState(enabledValue) && (await lstatChildBigintOrUndefined(pluginId));
            errors.push({
              type: "plugin-not-installed",
              source: pluginId,
              plugin: result.entry.name,
              ...(seedHasOtherVersion && {
                seedHasOtherVersion: true,
              }),
              ...(isDependencyAutoInstallState(enabledValue) &&
                installedListFailed && {
                  registryReadFailed: true,
                }),
            });
            return null;
          }
        }
      }
      let commandSource =
        commandSourceSpecOf(result.entry.source) !== undefined ||
        (installRecord !== undefined &&
          (installRecord.sourceCommand !== undefined || installRecord.sourceProducerPath !== undefined));
      let linkFarmSource = commandSource || installRecord?.previousProducerPaths !== undefined;
      if (commandSource && areCommandPluginSourcesDisabledByPolicy()) {
        noteHeldForTheAnswer();
        if (isDependencyAutoInstallState(enabledValue))
          errors.push({
            type: "generic-error",
            orphan: true,
            source: pluginId,
            plugin: result.entry.name,
            error: commandPluginSourcesDisabledMessage(),
          });
        return null;
      }
      if (isLinkModeCommandSource(result.entry.source) && installRecord === undefined) {
        if (isDependencyAutoInstallState(enabledValue))
          errors.push({
            type: "generic-error",
            orphan: true,
            source: pluginId,
            plugin: result.entry.name,
            error: `Not loading ${printableName(pluginId, 200)}: it installs as a link farm but has no install record here; ${runCommandHint(
              "plugin install",
              pluginId,
              {
                tail: "to record it",
                fallback: "install it explicitly to record it",
              },
            )}.`,
          });
        return null;
      }
      let pathClass =
        usableInstall?.installPath !== undefined
          ? classifyMarketplacePath(usableInstall.installPath, {
              trustedRoots,
            })
          : undefined;
      let installEntry = pathClass?.absolute;
      let suspect = pathClass?.suspect ?? false;
      let isLinkFarm =
        installRecord !== undefined &&
        (installRecord.sourceCommand?.endsWith(PLUGIN_LINK_HEADER) === true ||
          (installRecord.sourceCommand === undefined &&
            (installRecord.sourceProducerPath !== undefined ||
              installRecord.previousProducerPaths !== undefined) &&
            isLinkModeCommandSource(result.entry.source)) ||
          suspect ||
          (linkFarmSource &&
            installEntry !== undefined &&
            (await isLiveLinkFarm(installEntry, {
              unclassifiableIsFarm: true,
            }))));
      if (
        installRecord !== undefined &&
        isLinkFarm &&
        (suspect ||
          installRecord.sourceProducerPath === undefined ||
          hasDotSegmentAlias(installRecord.sourceProducerPath) ||
          realpathAllowMissing_2(installRecord.sourceProducerPath) ||
          isPathWithin_2(installRecord.sourceProducerPath, getOriginalCwd(), {
            foldCase: true,
          }) ||
          (installEntry !== undefined &&
            (await hasEntriesOutsideTarget(installEntry, installRecord.sourceProducerPath))))
      ) {
        if (isDependencyAutoInstallState(enabledValue))
          errors.push({
            type: "generic-error",
            orphan: true,
            source: pluginId,
            plugin: result.entry.name,
            error: suspect
              ? `Not loading ${printableName(pluginId, 200)}: its recorded install path ${UNSAFE_PATH_EXPLANATION}; ${
                  commandSourceSpecOf(result.entry.source) !== undefined
                    ? runCommandHint("plugin update", pluginId, {
                        tail: "to re-install it",
                        fallback: "re-install it with an explicit plugin update",
                      })
                    : runCommandHint("plugin uninstall", pluginId, {
                        tail: "and install it again to re-record it",
                        fallback: "uninstall and install it again to re-record it",
                      })
                }.`
              : `Not loading ${printableName(pluginId, 200)} here: it is served in place from ${printableName(installRecord.sourceProducerPath ?? "(unrecorded)", 200)}, which contains the working directory, is a network location, could not be resolved, or no longer matches its cached links \u2014 its content cannot be protected from sandboxed commands; ${runCommandHint(
                  "plugin update",
                  pluginId,
                  {
                    tail: "elsewhere to re-resolve it",
                    fallback: "re-resolve it with an explicit plugin update elsewhere",
                  },
                )}.`,
          });
        return null;
      }
      let linkFarm =
        installRecord !== undefined
          ? installRecord.sourceCommand?.endsWith(PLUGIN_LINK_HEADER) === true
          : isLinkModeCommandSource(result.entry.source);
      let linkFarmProducer = isLinkFarm ? installRecord?.sourceProducerPath : undefined;
      if (installRecord?.claudeaiPluginId !== undefined) {
        let source = result.entry.source;
        if (
          typeof source !== "object" ||
          source.source !== "claudeai" ||
          source.pluginId !== installRecord.claudeaiPluginId
        ) {
          if (isDependencyAutoInstallState(enabledValue))
            errors.push({
              type: "generic-error",
              refused: true,
              source: pluginId,
              plugin: result.entry.name,
              error: `Not loading ${printableName(pluginId, 200)}: it was installed from a claude.ai-hosted marketplace, but that marketplace name now lists ${typeof source === "object" && source.source === "claudeai" ? "a different claude.ai plugin" : "another source"} under this name; ${runCommandHint(
                "plugin uninstall",
                pluginId,
                {
                  tail: "and install it again to switch, or remove it",
                  fallback: "uninstall and reinstall it to switch, or remove it",
                },
              )}`,
            });
          return null;
        }
      }
      let plugin = await (cacheOnly
        ? loadCachedMarketplacePlugin(
            result.entry,
            result.marketplaceInstallLocation,
            registryEntry?.source,
            pluginId,
            enabledValue === true,
            errors,
            warnings,
            installRecord?.installPath,
            installedPlugins.plugins[pluginId]?.find((install) => install.installPath)?.installPath,
            {
              storageV5,
              preview,
              linkFarm,
              linkFarmProducer,
              entryEnabled: isDependencyAutoInstallState(enabledValue),
              registryReadFailed: installedListFailed,
              recordedClaudeAiPluginId: installRecord?.claudeaiPluginId,
            },
          )
        : loadPluginFromMarketplaceEntry(
            result.entry,
            result.marketplaceInstallLocation,
            registryEntry?.source,
            pluginId,
            enabledValue === true,
            errors,
            warnings,
            installRecord?.version,
            findMatchingSourceCommand(
              commandSourceSpecOf(result.entry.source),
              installedPlugins.plugins[pluginId],
            ) ?? installRecord?.sourceCommand,
            {
              storageV5,
              linkFarm,
              linkFarmProducer,
              entryEnabled: isDependencyAutoInstallState(enabledValue),
              credentials,
              installRecord: installedListFailed
                ? "unknown"
                : installRecord !== undefined
                  ? "present"
                  : "absent",
              recordedArchiveSha256: installRecord?.archiveSha256,
              recordedClaudeAiPluginId: installRecord?.claudeaiPluginId,
              recordedGitCommitSha: installRecord?.gitCommitSha,
            },
          ));
      if (plugin && installRecord?.resolvedVersion !== undefined)
        plugin.resolvedVersion = installRecord.resolvedVersion;
      if (
        plugin &&
        !weakSet_8.has(plugin) &&
        installRecord?.gitCommitSha !== undefined &&
        resolve_2(installRecord.installPath) === resolve_2(plugin.path)
      )
        plugin.gitCommitSha = installRecord.gitCommitSha;
      if (
        plugin &&
        installRecord?.claudeaiPluginId !== undefined &&
        isServerPluginId(installRecord.claudeaiPluginId)
      )
        plugin.serverPluginId = installRecord.claudeaiPluginId;
      if (plugin && isLocalMarketplaceEntry(result.entry.source, registryEntry?.source)) {
        plugin.readFromFolderAt = now;
        let { folderReadAt } = getPluginRegistry();
        if (!preview && !folderReadAt.has(plugin.source)) folderReadAt.set(plugin.source, now);
      }
      if (plugin && registryEntry) {
        let err = redactMarketplaceSource(registryEntry.source);
        if (err !== null) {
          plugin.marketplaceSource = err;
          if (
            isOfficialMarketplaceName_3(marketplaceName) &&
            isOfficialMarketplaceSourceVouched(err) &&
            isInMarketplaceCache(result.marketplaceInstallLocation) &&
            isPluginCachePath(plugin)
          )
            plugin.officialMarketplaceSourceVouched = true;
          if (
            await isWindowsPluginInsideLocalMarketplace(err, {
              entrySource: result.entry.source,
              marketplaceLocation: result.marketplaceInstallLocation,
              pluginPath: plugin.path,
            })
          )
            plugin.readInPlace = true;
        }
      }
      return plugin;
    }),
  );
  for (let [index, outcome] of results.entries())
    if (outcome.status === "fulfilled" && outcome.value) plugins.push(outcome.value);
    else if (outcome.status === "rejected") {
      let error = toError(outcome.reason);
      let [source, enabledValue] = flattened[index];
      logForDebugging(`Failed to load plugin ${source}: ${redactUrlsInMessage(error.message)}`, {
        level: "error",
      });
      if (isDependencyAutoInstallState(enabledValue))
        errors.push(
          manifestErrorToPluginError(error, source, firstLineOf(source, "@")) ?? {
            type: "generic-error",
            source,
            plugin: firstLineOf(source, "@"),
            error: commandSourceErrorMessage(error),
          },
        );
    }
  if (!preview) await migrateRenamedPluginsInSettings(renames, storageV5);
  let installedListRefusal = installedListFailed ? await getInstalledListRefusal(storageV5) : undefined;
  if (installedListRefusal !== undefined)
    return {
      plugins,
      errors: annotateRegistryReadFailures(errors, readInstalledPluginsFile(installedListRefusal)),
      warnings,
    };
  return {
    plugins,
    errors,
    warnings,
  };
}
//@ chunk-5xgkngpb.js:4682132-4682322 layout
function annotateRegistryReadFailures(errors, installedListHeldNote) {
  return errors.map((error) =>
    (error.type === "plugin-cache-miss" ||
      error.type === "plugin-not-installed" ||
      error.type === "plugin-not-found") &&
    error.registryReadFailed === true
      ? {
          ...error,
          installedListHeldNote,
        }
      : error,
  );
}
//@ chunk-5xgkngpb.js:4682322-4682656 layout
function commandSourceCacheMissError(pluginId, plugin) {
  return {
    type: "generic-error",
    orphan: true,
    source: pluginId,
    plugin,
    error: `${stripInvisibleKeepEmoji(pluginId)} is installed by running a command, and background command execution is currently switched off, so its missing cache was not rebuilt. Run \`${claudeCommand("plugin update", pluginId) ?? "claude plugin update <plugin>@<marketplace>"}\` in a terminal to rebuild it.`,
  };
}
//@ chunk-5xgkngpb.js:4682656-4683563 layout
function checkClaudeAiPluginLoadable(pluginId, plugin, source, installRecord, recordedClaudeAiPluginId) {
  if (typeof source !== "object" || source.source !== "claudeai") return null;
  if (installRecord === "unknown")
    return {
      type: "plugin-cache-miss",
      source: pluginId,
      plugin,
      installPath: NOT_RECORDED,
      registryReadFailed: true,
    };
  if (installRecord === "present" && recordedClaudeAiPluginId === undefined)
    return {
      type: "generic-error",
      refused: true,
      source: pluginId,
      plugin,
      error: `Not loading ${printableName(pluginId, 200)}: its install record no longer says which claude.ai plugin it came from, so it is not downloaded again; ${runCommandHint(
        "plugin uninstall",
        pluginId,
        {
          tail: "and install it again to re-pin it",
          fallback: "uninstall and reinstall it to re-pin it",
        },
      )}`,
    };
  if (!source.installable)
    return {
      type: "generic-error",
      refused: true,
      source: pluginId,
      plugin,
      error: `Not loading ${printableName(pluginId, 200)}: its files are missing and it can't be downloaded again in this session \u2014 claude.ai lists no installable version for it, or its marketplace's catalog isn't readable here (sign in to claude.ai with the organization it was added under, then restart)`,
    };
  return null;
}
//@ chunk-5xgkngpb.js:4683563-4683698 layout
function sessionPluginDirFor(baseDir, pluginId) {
  let replaced = pluginId.replace(/[^a-zA-Z0-9@\-_]/g, "-");
  let hash = createHash("sha256").update(pluginId).digest("hex");
  return join(baseDir, `${replaced}-${hash.slice(0, 8)}`);
}
//@ chunk-5xgkngpb.js:4683698-4683978 layout
function planArchiveExtraction(sessionCacheDir, extractDir) {
  let relativePath = relative(sessionCacheDir, extractDir);
  if (
    !relativePath ||
    relativePath === ".." ||
    relativePath.startsWith(`..${sep}`) ||
    isAbsolute(relativePath)
  )
    throw Error("Refusing to extract a plugin archive outside the session plugin cache");
  let str = randomBytes(4).toString("hex");
  return {
    extractDir,
    staging: `${extractDir}.staging-${str}`,
    previousPrefix: `${extractDir}.previous-${str}`,
  };
}
//@ chunk-5xgkngpb.js:4683978-4683994 layout
var MIXED_ARCHIVE_HASH = "mixed";
//@ chunk-5xgkngpb.js:4683994-4684601 layout
async function extractSessionArchive(filePath, plan) {
  let zipExtractionState = getZipExtractionState();
  let seq = ++zipExtractionState.nextSeq;
  let fileBytes = await getFsImplementation().readFileBytes(filePath);
  let archiveHash = createHash("sha256").update(fileBytes).digest("hex");
  let { extractDir } = plan;
  if (
    zipExtractionState.byDir.get(extractDir)?.archiveHash === archiveHash &&
    (await isDirectory(extractDir))
  )
    return;
  let inflight = zipExtractionState.inFlight.get(extractDir);
  if (inflight?.archiveHash === archiveHash)
    try {
      await inflight.done;
      return;
    } catch {}
  let { promise, resolve, reject } = Promise.withResolvers();
  promise.catch(() => {});
  let entry = {
    archiveHash,
    done: promise,
  };
  zipExtractionState.inFlight.set(extractDir, entry);
  let settle = (error) => {
    if (zipExtractionState.inFlight.get(extractDir) === entry) zipExtractionState.inFlight.delete(extractDir);
    if (error === undefined) resolve();
    else reject(error);
  };
  try {
    await extractZipToDirectory(fileBytes, plan.staging);
  } catch (error) {
    await removeTreeQuietly(plan.staging);
    settle(error);
    throw error;
  }
  return {
    archive: fileBytes,
    archiveHash,
    seq,
    settle,
  };
}
//@ chunk-5xgkngpb.js:4684601-4684611 layout
var MAX_PREVIEW_TREES = 2;
//@ chunk-5xgkngpb.js:4684611-4684904 layout
async function prunePreviewTrees(zipExtractionState, sessionCacheDir, extractDir, previewPath) {
  let filtered = (zipExtractionState.previews.get(extractDir) ?? []).filter(
    (existingPath) => existingPath !== previewPath,
  );
  filtered.push(previewPath);
  let excessPaths = filtered.splice(0, Math.max(0, filtered.length - MAX_PREVIEW_TREES));
  zipExtractionState.previews.set(extractDir, filtered);
  let mapped = excessPaths.map((pathToRemove) => {
    let removal = removePreviewTree(sessionCacheDir, pathToRemove).finally(() => {
      if (zipExtractionState.pruning.get(pathToRemove) === removal)
        zipExtractionState.pruning.delete(pathToRemove);
    });
    zipExtractionState.pruning.set(pathToRemove, removal);
    return removal;
  });
  await Promise.all(mapped);
}
//@ chunk-5xgkngpb.js:4684904-4685086 layout
async function removePreviewTree(extractDir, targetDir) {
  let { previousPrefix } = planArchiveExtraction(extractDir, targetDir);
  try {
    await retryFsOp(targetDir, previousPrefix);
  } catch (error) {
    if (!isENOENT(error))
      logForDebugging(`Could not move aside the preview tree ${targetDir}: ${errorMessage(error)}`, {
        level: "warn",
      });
    return;
  }
  await removeTreeQuietly(previousPrefix);
}
//@ chunk-5xgkngpb.js:4685086-4685556 layout
async function statDirIdentity(dirPath, when) {
  try {
    let { dev, ino, birthtimeMs } = await lstat(dirPath);
    return {
      dev,
      ino,
      birthtimeMs,
    };
  } catch (error) {
    if (isENOENT(error) || getErrnoCode(error) === "ENOTDIR")
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Plugin directory ${dirPath} was removed ${when === "before" ? "before it could be loaded" : "while it was being loaded"}`,
        "plugin extraction tree removed during load",
      );
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Plugin directory ${dirPath} could not be ${when === "before" ? "checked before" : "re-checked after"} loading: ${getErrnoCode(error) ?? errorMessage(error)}`,
      "plugin extraction tree check failed",
    );
  }
}
//@ chunk-5xgkngpb.js:4685556-4685792 layout
async function assertDirUnchanged(dirPath, identity) {
  let currentIdentity = await statDirIdentity(dirPath, "after");
  if (
    currentIdentity.dev !== identity.dev ||
    currentIdentity.ino !== identity.ino ||
    currentIdentity.birthtimeMs !== identity.birthtimeMs
  )
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Plugin directory ${dirPath} was replaced while it was being loaded`,
      "plugin extraction tree replaced during load",
    );
}
//@ chunk-5xgkngpb.js:4685792-4686295 layout
async function extractPreviewArchive(archivePath, sessionCacheDir, extractDir) {
  let zipExtractionState = getZipExtractionState();
  let fileBytes = await getFsImplementation().readFileBytes(archivePath);
  let archiveHash = createHash("sha256").update(fileBytes).digest("hex");
  if (
    zipExtractionState.byDir.get(extractDir)?.archiveHash === archiveHash &&
    (await isDirectory(extractDir))
  )
    return extractDir;
  let previewDir = `${extractDir}.preview-${archiveHash.slice(0, 32)}`;
  let { staging } = planArchiveExtraction(sessionCacheDir, previewDir);
  let attempts = 0;
  for (;;) {
    await zipExtractionState.pruning.get(previewDir);
    if (await isDirectory(previewDir)) {
      if (zipExtractionState.pruning.has(previewDir)) continue;
      await prunePreviewTrees(zipExtractionState, sessionCacheDir, extractDir, previewDir);
      return previewDir;
    }
    try {
      await extractZipToDirectory(fileBytes, staging);
    } catch (error) {
      await removeTreeQuietly(staging);
      throw error;
    }
    try {
      await retryFsOp(staging, previewDir);
    } catch (error) {
      let occupied = await isTargetOccupiedError_2(error, previewDir);
      await removeTreeQuietly(staging);
      if (!occupied || ++attempts >= MAX_EXTRACT_ATTEMPTS) throw error;
      continue;
    }
    await prunePreviewTrees(zipExtractionState, sessionCacheDir, extractDir, previewDir);
    return previewDir;
  }
}
//@ chunk-5xgkngpb.js:4686295-4686305 layout
var MAX_EXTRACT_ATTEMPTS = 3;
//@ chunk-5xgkngpb.js:4686305-4686381 layout
async function isDirectory(path) {
  try {
    return (await lstat(path)).isDirectory();
  } catch {
    return false;
  }
}
//@ chunk-5xgkngpb.js:4686381-4686473 layout
function isWindowsLockError(error) {
  let errnoCode = getErrnoCode(error);
  return (
    getPlatform() === "windows" && (errnoCode === "EPERM" || errnoCode === "EACCES" || errnoCode === "EBUSY")
  );
}
//@ chunk-5xgkngpb.js:4686473-4686525 layout
async function isLockedButPresent(error, path) {
  return isWindowsLockError(error) && (await isDirectory(path));
}
//@ chunk-5xgkngpb.js:4686525-4686618 layout
async function isTargetOccupiedError_2(error, path) {
  let errnoCode = getErrnoCode(error);
  if (errnoCode === "ENOTEMPTY" || errnoCode === "EEXIST") return true;
  return isLockedButPresent(error, path);
}
//@ chunk-5xgkngpb.js:4686618-4686736 layout
async function removeTreeQuietly(staging) {
  await removeDirectoryTreeNoFollow_2(staging).catch((error) => {
    logForDebugging(`Failed to remove the extraction tree ${staging}: ${errorMessage(error)}`, {
      level: "warn",
    });
  });
}
//@ chunk-5xgkngpb.js:4686736-4686909 layout
async function moveIntoPlace(zipExtractionState, sourceDir, extractDir) {
  try {
    await retryFsOp(sourceDir, extractDir);
  } catch (error) {
    if (await isDirectory(extractDir)) return false;
    throw error;
  }
  let entry = zipExtractionState.byDir.get(extractDir);
  if (entry !== undefined)
    zipExtractionState.byDir.set(extractDir, {
      archiveHash: MIXED_ARCHIVE_HASH,
      seq: entry.seq,
    });
  return true;
}
//@ chunk-5xgkngpb.js:4686909-4688203 layout
/**
 * 把暂存解压树原子替换到目标解压目录（旧树先移到 .previous-*，Windows 被占用时退化为原地解压）。
 */
async function swapInExtractedTree({ extractDir, staging, previousPrefix }, plan) {
  let zipExtractionState = getZipExtractionState();
  let parkedPaths = [];
  try {
    for (let idx = 0; ; idx++) {
      let current = zipExtractionState.byDir.get(extractDir);
      if (current !== undefined && current.seq > plan.seq) {
        await removeTreeQuietly(staging);
        plan.settle();
        return;
      }
      let previousPath = `${previousPrefix}-${idx}`;
      let locked = false;
      try {
        await retryFsOp(extractDir, previousPath);
        parkedPaths.push(previousPath);
      } catch (error) {
        if (!isENOENT(error)) {
          if (!(await isLockedButPresent(error, extractDir))) throw error;
          locked = true;
        }
      }
      let currentAfter = zipExtractionState.byDir.get(extractDir);
      if (currentAfter !== undefined && currentAfter.seq > plan.seq) {
        if (parkedPaths.at(-1) === previousPath) {
          await moveIntoPlace(zipExtractionState, previousPath, extractDir);
          parkedPaths.pop();
        }
        await removeTreeQuietly(staging);
        plan.settle();
        return;
      }
      if (!locked)
        try {
          await retryFsOp(staging, extractDir);
          break;
        } catch (error) {
          if (await isTargetOccupiedError_2(error, extractDir)) {
            if (idx + 1 >= MAX_EXTRACT_ATTEMPTS) throw error;
            continue;
          }
          if (!isWindowsLockError(error)) throw error;
          if (parkedPaths.at(-1) === previousPath) {
            await moveIntoPlace(zipExtractionState, previousPath, extractDir);
            parkedPaths.pop();
          }
          let currentAgain = zipExtractionState.byDir.get(extractDir);
          if (currentAgain !== undefined && currentAgain.seq > plan.seq) {
            await removeTreeQuietly(staging);
            plan.settle();
            return;
          }
          locked = true;
        }
      logForDebugging(
        `Plugin extraction directory ${extractDir} or its staged copy is held open; extracting the archive in place, so files dropped from it are not cleared this time`,
        {
          level: "warn",
        },
      );
      zipExtractionState.byDir.set(extractDir, {
        archiveHash: MIXED_ARCHIVE_HASH,
        seq: plan.seq,
      });
      await extractZipToDirectory(plan.archive, extractDir);
      await removeTreeQuietly(staging);
      plan.settle();
      return;
    }
  } catch (error) {
    let parked = parkedPaths.pop();
    if (parked !== undefined)
      try {
        if (!(await moveIntoPlace(zipExtractionState, parked, extractDir)))
          logForDebugging(
            `A newer extraction of ${extractDir} is live; the one moved aside by a failed swap stays at ${parked}`,
          );
      } catch (error) {
        logForDebugging(
          `The previous extraction of ${extractDir} could not be restored after a failed swap (${errorMessage(error)}); it was at ${parked}`,
          {
            level: "error",
          },
        );
      }
    await removeTreeQuietly(staging);
    plan.settle(error);
    throw error;
  }
  zipExtractionState.byDir.set(extractDir, {
    archiveHash: plan.archiveHash,
    seq: plan.seq,
  });
  plan.settle();
}
//@ chunk-5xgkngpb.js:4688203-4691242 layout
/**
 * cacheOnly 模式加载市场插件：只用已有版本化缓存或种子缓存，缺失时报 plugin-cache-miss 并返回 null。
 */
async function loadCachedMarketplacePlugin(
  entry,
  pluginId,
  marketplaceSource,
  pluginId_2,
  reportErrors,
  errors,
  warnings,
  installPath,
  installPath_2,
  {
    storageV5,
    preview = false,
    linkFarm = false,
    linkFarmProducer,
    entryEnabled = reportErrors,
    registryReadFailed = false,
    recordedClaudeAiPluginId,
  } = {},
) {
  let pluginPath;
  let marketplaceDir;
  if (typeof entry.source === "string") {
    let isLocalEntry = isLocalMarketplaceEntry(entry.source, marketplaceSource);
    if (!isLocalEntry && installPath) await materializeCachedLinks(installPath, storageV5, linkFarm);
    if (
      !isLocalEntry &&
      installPath &&
      (installPath.endsWith(".zip")
        ? await pathExists(installPath)
        : await cacheDirHasPluginContentStrict(installPath, storageV5))
    )
      pluginPath = installPath;
    else if (!isLocalEntry) {
      let seedPath = null;
      if (getPluginSeedDirs().length > 0) {
        let versionName = installPath
          ? basename(installPath).replace(/\.zip$/, "")
          : await calculatePluginVersion(pluginId_2, entry.source, undefined, undefined, {
              kind: "catalog",
              version: entry.version,
            });
        seedPath = await probeSeedForPlugin(pluginId_2, versionName, "always");
      }
      if (seedPath) {
        logForDebugging(`Using seed cache for ${pluginId_2} at ${seedPath} (cache-only)`);
        pluginPath = seedPath;
      } else {
        if (reportErrors)
          errors.push({
            type: "plugin-cache-miss",
            source: pluginId_2,
            plugin: entry.name,
            installPath: installPath ?? installPath_2 ?? pluginId,
          });
        return null;
      }
    } else {
      let space = seedDirFor(pluginId) !== undefined ? "system" : "workspace";
      let marketplaceEntryPath = await resolveMarketplaceEntryPath(pluginId, entry.source, {
        marketplaceSource,
        corroboratingSource: marketplaceSourceOfPlugin(pluginId_2),
        storageV5,
        localMarketplaceSpace: space,
      });
      if (marketplaceEntryPath.kind !== "ok") {
        if (entryEnabled)
          errors.push({
            type: "generic-error",
            source: pluginId_2,
            error: entryResolutionError(marketplaceEntryPath, pluginId, entry.source).message,
          });
        return null;
      }
      pluginPath = marketplaceEntryPath.entryPath;
      marketplaceDir = marketplaceEntryPath.marketplaceDir;
      if (!(await localMarketplacePathExists(storageV5, pluginPath, space))) {
        if (entryEnabled)
          errors.push({
            type: "generic-error",
            source: pluginId_2,
            error: `Plugin directory not found at path: ${printableOrEmpty(pluginPath)}. Check that the marketplace entry has the correct path.`,
          });
        return null;
      }
    }
  } else {
    if (installPath) await materializeCachedLinks(installPath, storageV5, linkFarm);
    if (
      installPath &&
      (installPath.endsWith(".zip")
        ? await pathExists(installPath)
        : await cacheDirHasPluginContentStrict(installPath, storageV5))
    )
      pluginPath = installPath;
    else if (!installPath) {
      let any = SETTING_SOURCES.filter(isOperatorSettingSource_2).some(
        (source) => getSettingsForSource(source)?.enabledPlugins?.[pluginId_2] === true,
      );
      let pluginVersion = await calculatePluginVersion(
        pluginId_2,
        entry.source,
        undefined,
        undefined,
        {
          kind: "catalog",
          version: entry.version,
        },
        "sha" in entry.source ? entry.source.sha : undefined,
      );
      let foundPath;
      if (any) {
        let versionedZipCachePath = getVersionedZipCachePath(pluginId_2, pluginVersion);
        let versionedCachePath = getVersionedCachePath(pluginId_2, pluginVersion);
        await materializeCachedLinks(versionedCachePath, storageV5, linkFarm);
        if (isPluginZipCacheEnabled() && (await pathExists(versionedZipCachePath)))
          foundPath = versionedZipCachePath;
        else if (await cacheDirHasPluginContentStrict(versionedCachePath, storageV5)) {
          await removeCacheInUseMarker(versionedCachePath, storageV5);
          foundPath = versionedCachePath;
        }
      }
      if (!foundPath) {
        foundPath = (await probeSeedForPlugin(pluginId_2, pluginVersion, "when-unknown")) ?? undefined;
        if (foundPath) logForDebugging(`Using seed cache for ${pluginId_2} at ${foundPath} (cache-only)`);
      }
      if (foundPath) pluginPath = foundPath;
      else if (any) {
        if (entryEnabled) {
          let loadableError = checkClaudeAiPluginLoadable(
            pluginId_2,
            entry.name,
            entry.source,
            registryReadFailed ? "unknown" : "absent",
            undefined,
          );
          if (entry.source.source === "command" && !shouldRefreshCommandPlugins())
            errors.push(commandSourceCacheMissError(pluginId_2, entry.name));
          else if (loadableError !== null) errors.push(loadableError);
          else {
            let seedHasOther = installPath_2 === undefined && (await lstatChildBigintOrUndefined(pluginId_2));
            errors.push({
              type: "plugin-cache-miss",
              source: pluginId_2,
              plugin: entry.name,
              installPath: installPath_2 ?? NOT_RECORDED,
              ...(registryReadFailed && {
                registryReadFailed: true,
              }),
              ...(seedHasOther && {
                seedHasOtherVersion: true,
              }),
            });
          }
        }
        return null;
      } else {
        let seedHasOther = entryEnabled && (await lstatChildBigintOrUndefined(pluginId_2));
        errors.push({
          type: "plugin-not-installed",
          source: pluginId_2,
          plugin: entry.name,
          ...(seedHasOther && {
            seedHasOtherVersion: true,
          }),
          ...(entryEnabled &&
            registryReadFailed && {
              registryReadFailed: true,
            }),
        });
        return null;
      }
    } else {
      if (reportErrors)
        if (entry.source.source === "command" && !shouldRefreshCommandPlugins())
          errors.push(commandSourceCacheMissError(pluginId_2, entry.name));
        else
          errors.push(
            checkClaudeAiPluginLoadable(
              pluginId_2,
              entry.name,
              entry.source,
              "present",
              recordedClaudeAiPluginId,
            ) ?? {
              type: "plugin-cache-miss",
              source: pluginId_2,
              plugin: entry.name,
              installPath,
            },
          );
      return null;
    }
  }
  let dirIdentity;
  let extractedFrom;
  if (isPluginZipCacheEnabled() && pluginPath.endsWith(".zip")) {
    let baseDir = await getSessionPluginCachePath();
    let extractDir = sessionPluginDirFor(baseDir, pluginId_2);
    let plan = planArchiveExtraction(baseDir, extractDir);
    let stager;
    extractedFrom = pluginPath;
    try {
      if (preview) pluginPath = await extractPreviewArchive(pluginPath, baseDir, extractDir);
      else {
        stager = await extractSessionArchive(pluginPath, plan);
        pluginPath = extractDir;
      }
    } catch (error) {
      logForDebugging(`Failed to extract plugin ZIP ${pluginPath}: ${error}`, {
        level: "error",
      });
      if (entryEnabled)
        errors.push({
          type: "plugin-cache-miss",
          source: pluginId_2,
          plugin: entry.name,
          installPath: pluginPath,
        });
      return null;
    }
    if (stager !== undefined) await swapInExtractedTree(plan, stager);
    marketplaceDir = undefined;
    if (preview) dirIdentity = await statDirIdentity(pluginPath, "before");
  }
  let loaded = await finishMarketplacePluginLoad(
    entry,
    pluginId_2,
    reportErrors,
    errors,
    warnings,
    pluginPath,
    {
      storageV5,
      linkFarm,
      linkFarmProducer,
      entryEnabled,
      containmentAnchorDir: marketplaceDir,
    },
  );
  if (dirIdentity !== undefined && loaded !== null) await assertDirUnchanged(pluginPath, dirIdentity);
  if (extractedFrom !== undefined && loaded !== null) loaded.extractedFrom = extractedFrom;
  return loaded;
}
//@ chunk-5xgkngpb.js:4691242-4699120 fingerprint (2.1.88 match: loadPluginFromMarketplaceEntry, 0.385)
/**
 * 按 marketplace 条目加载一个插件：相对路径来源直接在市场目录里读；远程来源走安装记录/版本化缓存，必要时 cachePlugin + copyPluginToVersionedCache；校验钉住的 sha/integrity/archiveSha256；strict=false 时用条目合成 manifest；最后 createPluginFromPath 并合并条目里的组件声明。
 */
async function loadPluginFromMarketplaceEntry(
  entry,
  marketplaceInstallLocation,
  pluginId,
  pluginSourceId,
  entryEnabled,
  errors,
  warnings,
  version,
  installedVersion,
  {
    storageV5,
    linkFarm = false,
    linkFarmProducer,
    entryEnabled: entryEnabled_2 = entryEnabled,
    credentials,
    installRecord,
    recordedArchiveSha256,
    recordedClaudeAiPluginId,
    recordedNpmIntegrity,
    recordedGitCommitSha,
  },
) {
  logForDebugging(
    `Loading plugin ${entry.name} from source: ${jsonStringify(redactPluginSourceForLog(entry.source))}`,
  );
  let pluginPath;
  let marketplaceDir;
  let shaInfo;
  if (typeof entry.source === "string") {
    let isLocalEntry = pluginId !== undefined && isLocalMarketplaceSource(pluginId);
    let space = seedDirFor(marketplaceInstallLocation) !== undefined ? "system" : "workspace";
    let marketplaceEntryPath = await resolveMarketplaceEntryPath(marketplaceInstallLocation, entry.source, {
      marketplaceSource: pluginId,
      corroboratingSource: marketplaceSourceOfPlugin(pluginSourceId),
      storageV5,
      localMarketplaceSpace: space,
    });
    if (marketplaceEntryPath.kind === "location-error") throw marketplaceEntryPath.error;
    if (marketplaceEntryPath.kind !== "ok") {
      errors.push({
        type: "generic-error",
        source: pluginSourceId,
        error: entryResolutionError(marketplaceEntryPath, marketplaceInstallLocation, entry.source).message,
      });
      return null;
    }
    let { marketplaceDir: marketplaceDir_2, entryPath } = marketplaceEntryPath;
    if (
      !(isLocalEntry
        ? await localMarketplacePathExists(storageV5, entryPath, space)
        : await pathExists(entryPath))
    ) {
      logForDebugging(`Plugin path not found: ${entryPath}`, {
        level: "error",
      });
      if (entryEnabled_2)
        errors.push({
          type: "generic-error",
          source: pluginSourceId,
          error: `Plugin directory not found at path: ${printableOrEmpty(entryPath)}. Check that the marketplace entry has the correct path.`,
        });
      return null;
    }
    if (isLocalMarketplaceEntry(entry.source, pluginId)) {
      pluginPath = entryPath;
      marketplaceDir = marketplaceDir_2;
    } else
      try {
        let manifest;
        try {
          manifest = (await loadPluginManifest(entryPath, entry.name, entry.source)).manifest;
        } catch {}
        let pluginVersion = await calculatePluginVersion(
          pluginSourceId,
          entry.source,
          manifest,
          marketplaceDir_2,
          {
            kind: "catalog",
            version: entry.version,
          },
        );
        let sourcePluginPath = getVersionedCachePath(pluginSourceId, pluginVersion);
        let hasCached = await dirHasRealEntries(sourcePluginPath);
        let sha;
        if (!hasCached) {
          let head = await probePluginGitHead(marketplaceDir_2);
          sha = head.repo
            ? (head.sha ?? undefined)
            : marketplaceNameOfId(pluginSourceId) === CLAUDE_PLUGINS_OFFICIAL
              ? ((await pluginVersionOrNull(marketplaceDir_2)) ?? undefined)
              : undefined;
        }
        pluginPath = await copyPluginToVersionedCache(
          entryPath,
          pluginSourceId,
          pluginVersion,
          entry,
          marketplaceDir_2,
          {
            storageV5,
            linkFarm,
            credentials,
          },
        );
        logForDebugging(`Copied plugin ${entry.name} to versioned cache: ${pluginPath}`);
        if (pluginPath === sourcePluginPath && !hasCached)
          shaInfo = {
            sha,
          };
      } catch (error) {
        let errorMsg = errorMessage(error);
        if (strictCacheAddressable(storageV5)) {
          logForDebugging(
            `Failed to copy plugin ${entry.name} to versioned cache: ${errorMsg}. Not loading it from the marketplace clone (strict plugin cache).`,
            {
              level: "error",
            },
          );
          if (entryEnabled_2)
            errors.push({
              type: "generic-error",
              source: pluginSourceId,
              error: `Plugin ${printableName(entry.name, 200)} could not be copied into the plugin cache (${
                error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
                  ? printableMessage(error, {
                      isComposed: isCommandSourceError,
                    })
                  : "see debug log"
              }); it is not loaded from the marketplace copy. Reinstalling the plugin retries the copy.`,
            });
          return null;
        }
        logForDebugging(
          `Failed to copy plugin ${entry.name} to versioned cache: ${errorMsg}. Using marketplace path.`,
          {
            level: "warn",
          },
        );
        pluginPath = entryPath;
        marketplaceDir = marketplaceDir_2;
      }
  } else
    try {
      let version_2 = await calculatePluginVersion(
        pluginSourceId,
        entry.source,
        undefined,
        undefined,
        version !== undefined
          ? {
              kind: "installed",
              version,
            }
          : {
              kind: "catalog",
              version: entry.version,
            },
        "sha" in entry.source ? entry.source.sha : undefined,
      );
      let versionedPath = getVersionedCachePath(pluginSourceId, version_2);
      await materializeCachedLinks(versionedPath, storageV5, linkFarm);
      let zipPath = getVersionedZipCachePath(pluginSourceId, version_2);
      if (isPluginZipCacheEnabled() && (await pathExists(zipPath))) {
        logForDebugging(`Using versioned cached plugin ZIP ${entry.name} from ${zipPath}`);
        pluginPath = zipPath;
      } else if (await cacheDirHasPluginContentStrict(versionedPath, storageV5)) {
        await removeCacheInUseMarker(versionedPath, storageV5);
        logForDebugging(`Using versioned cached plugin ${entry.name} from ${versionedPath}`);
        pluginPath = versionedPath;
      } else {
        let seedPath = await probeSeedForPlugin(pluginSourceId, version_2, "when-unknown");
        if (seedPath) {
          pluginPath = seedPath;
          logForDebugging(`Using seed cache for external plugin ${entry.name} at ${seedPath}`);
        } else {
          if (entry.source.source === "command" && !entryEnabled) {
            logForDebugging(
              `Not materializing disabled command-sourced plugin ${pluginSourceId}: its command is not run while it is disabled`,
            );
            return null;
          }
          if (entry.source.source === "command" && !shouldRefreshCommandPlugins()) {
            logForDebugging(
              `Plugin ${pluginSourceId}: command-source execution is switched off; not materializing the missing cache dir`,
              {
                level: "warn",
              },
            );
            errors.push(commandSourceCacheMissError(pluginSourceId, entry.name));
            return null;
          }
          let loadableIssue = checkClaudeAiPluginLoadable(
            pluginSourceId,
            entry.name,
            entry.source,
            installRecord,
            recordedClaudeAiPluginId,
          );
          if (loadableIssue !== null) {
            if (entryEnabled_2) errors.push(loadableIssue);
            return null;
          }
          if (isNpmPluginId(pluginSourceId) && recordedNpmIntegrity === undefined) {
            if (entryEnabled_2)
              errors.push({
                type: "generic-error",
                refused: true,
                source: pluginSourceId,
                plugin: entry.name,
                error: `${printableName(pluginSourceId, 200)} was not re-downloaded: its install record carries no integrity to check the download against; ${runCommandHint(
                  "plugin uninstall",
                  pluginSourceId,
                  {
                    tail: "and install it again to re-record it",
                    fallback: "uninstall and install it again to re-record it",
                  },
                )}.`,
              });
            return null;
          }
          if (pluginSourceId.endsWith(`@${OFFICIAL_MARKETPLACE_NAME}`)) {
            if (installRecord === "unknown") {
              if (entryEnabled_2)
                errors.push({
                  type: "plugin-cache-miss",
                  source: pluginSourceId,
                  plugin: entry.name,
                  installPath: NOT_RECORDED,
                  registryReadFailed: true,
                });
              return null;
            }
            let listingSha = pinnedSha(pluginSourceId, entry.source);
            if (
              listingSha === undefined ||
              (installRecord === "present" && recordedGitCommitSha !== listingSha)
            ) {
              if (entryEnabled_2)
                errors.push({
                  type: "generic-error",
                  refused: true,
                  source: pluginSourceId,
                  plugin: entry.name,
                  error:
                    listingSha === undefined
                      ? `Not loading ${printableName(pluginSourceId, 200)}: its files are missing and its ${OFFICIAL_MARKETPLACE_DISPLAY} listing has no listed commit, so it was not downloaded. Only a change to the listing can fix this.`
                      : recordedGitCommitSha === undefined
                        ? `Not loading ${printableName(pluginSourceId, 200)}: its files are missing and its install record has no commit, so it was not downloaded again; ${runCommandHint(
                            "plugin update",
                            pluginSourceId,
                            {
                              tail: "to repair it",
                              fallback: "update it to repair it",
                            },
                          )}`
                        : `Not loading ${printableName(pluginSourceId, 200)}: its files are missing, and the ${OFFICIAL_MARKETPLACE_DISPLAY} now lists another commit than the one installed, so it was not downloaded again; ${runCommandHint(
                            "plugin update",
                            pluginSourceId,
                            {
                              tail: "to move to the listed commit",
                              fallback: "update it to move to the listed commit",
                            },
                          )}`,
                });
              return null;
            }
          }
          let scriptsResult = undefined;
          if (scriptsResult !== undefined && !scriptsResult.ok) {
            if (entryEnabled_2)
              errors.push({
                type: "generic-error",
                refused: true,
                source: pluginSourceId,
                plugin: entry.name,
                error: scriptsResult.message,
              });
            return null;
          }
          let shaParse = gitSha().safeParse(recordedGitCommitSha);
          let pinnedSource =
            shaParse.success &&
            (entry.source.source === "github" ||
              entry.source.source === "url" ||
              entry.source.source === "git-subdir") &&
            entry.source.sha === undefined &&
            version ===
              (await calculatePluginVersion(
                pluginSourceId,
                entry.source,
                undefined,
                undefined,
                undefined,
                shaParse.data,
              ))
              ? {
                  ...entry.source,
                  sha: shaParse.data,
                }
              : undefined;
          let sourceForFetch =
            typeof entry.source === "object" && entry.source.source === "claudeai" && version_2 !== "unknown"
              ? {
                  ...entry.source,
                  version: version_2,
                }
              : entry.source;
          let cacheOptions = {
            manifest: {
              name: entry.name,
            },
            archiveAuth: await resolveArchiveDownloadHeaders({
              pluginSource: entry.source,
              pluginName: entry.name,
              marketplaceName: marketplaceNameOfId(pluginSourceId),
              marketplaceSource: pluginId,
              trustedMarketplaceAuth: findUrlMarketplaceHeaders(
                pluginId,
                marketplaceNameOfId(pluginSourceId),
              ),
              trustedSettingsEntryAuth: findSettingsArchiveEntry(
                marketplaceNameOfId(pluginSourceId),
                entry.name,
              ),
              entry,
              runEntryHelper: false,
            }),
            entryDeclaresComponents: entryDeclaresComponents(entry),
            declaredComponentPaths: entryDeclaredComponentPaths(entry),
            isDirectoryPlugin: isOfficialDirectoryPlugin(pluginSourceId),
            directoryPin: pinnedSha(pluginSourceId, sourceForFetch) ?? null,
            commandSourceConsent:
              version === undefined && installedVersion === undefined
                ? {
                    kind: "none",
                    pluginId: pluginSourceId,
                  }
                : {
                    kind: "recorded",
                    command: installedVersion,
                    pluginId: pluginSourceId,
                  },
            storageV5,
            credentials,
            isNpmMarketplaceLane: isNpmPluginId(pluginSourceId),
            expectedNpmIntegrity: recordedNpmIntegrity,
          };
          let cached =
            (pinnedSource === undefined
              ? undefined
              : await cachePlugin(pinnedSource, cacheOptions).then(
                  async (cacheResult) => {
                    let gitmodulesPath = join(cacheResult.path, ".gitmodules");
                    if ((await pathPresence(gitmodulesPath)) === "gone") return cacheResult;
                    await removeDirectoryTreeNoFollow_2(cacheResult.path).catch(() => {});
                    logForDebugging(
                      `${pluginSourceId} has a .gitmodules file, and a fetch at its installed commit ${pinnedSource.sha.substring(0, 12)} brings no submodules; fetching its source as the marketplace lists it instead. \`claude plugin update\` records the commit then in use`,
                      {
                        level: "warn",
                      },
                    );
                    return;
                  },
                  (error) => {
                    logForDebugging(
                      `Could not fetch ${pluginSourceId} at its installed commit ${pinnedSource.sha.substring(0, 12)} (${redactUrlsInMessage(errorMessage(error))}); fetching its source as the marketplace lists it instead. \`claude plugin update\` records the commit then in use`,
                      {
                        level: "warn",
                      },
                    );
                    return;
                  },
                )) ?? (await cachePlugin(sourceForFetch, cacheOptions));
          if (
            recordedArchiveSha256 !== undefined &&
            typeof sourceForFetch === "object" &&
            sourceForFetch.source === "claudeai" &&
            sourceForFetch.version === version &&
            cached.contentSha256 !== recordedArchiveSha256
          ) {
            await removeDirectoryTreeNoFollow_2(cached.path).catch(() => {});
            if (entryEnabled_2)
              errors.push({
                type: "generic-error",
                refused: true,
                source: pluginSourceId,
                plugin: entry.name,
                error: `Not loading ${printableName(pluginSourceId, 200)}: the archive claude.ai served for version ${printableName(sourceForFetch.version, 64)} does not match the one recorded at install (digest differs); ${runCommandHint(
                  "plugin uninstall",
                  pluginSourceId,
                  {
                    tail: "and install it again to accept new content",
                    fallback: "uninstall and reinstall it to accept new content",
                  },
                )}`,
              });
            return null;
          }
          let pluginVersion =
            version_2 !== "unknown" && !commandSourceSpecOf(entry.source)
              ? version_2
              : await calculatePluginVersion(
                  pluginSourceId,
                  entry.source,
                  cached.manifest,
                  cached.path,
                  version !== undefined
                    ? {
                        kind: "installed",
                        version,
                      }
                    : {
                        kind: "catalog",
                        version: entry.version,
                      },
                  cached.gitCommitSha,
                  cached.contentSha256,
                );
          if (cached.producerPath !== undefined) recordProducerDir(cached.producerPath);
          let sha =
            cached.gitCommitSha ??
            (getPluginCloneUrl(entry.source) !== null
              ? ((await pluginGitHead(cached.path)) ?? undefined)
              : undefined);
          let versionedCachePath = getVersionedCachePath(pluginSourceId, pluginVersion);
          let hadEntries = await dirHasRealEntries(versionedCachePath);
          pluginPath = await copyPluginToVersionedCache(
            cached.path,
            pluginSourceId,
            pluginVersion,
            entry,
            undefined,
            {
              storageV5,
              linkFarm,
              credentials,
            },
          );
          if (pluginPath === versionedCachePath && !hadEntries)
            shaInfo = {
              sha,
            };
          if (cached.path !== pluginPath && !resolve_2(pluginPath).startsWith(resolve_2(cached.path) + sep))
            await removeDirectoryTreeNoFollow_2(cached.path).catch((error) => {
              logForDebugging(
                `Failed to remove the staging tree ${cached.path} after publishing: ${errorMessage(error)}`,
                {
                  level: "warn",
                },
              );
            });
        }
      }
    } catch (error) {
      let errorMsg = redactUrlsInMessage(errorMessage(error));
      logForDebugging(`Failed to cache plugin ${entry.name}: ${errorMsg}`, {
        level: "error",
      });
      if (entryEnabled_2)
        errors.push({
          type: "generic-error",
          source: pluginSourceId,
          error: `Failed to download/cache plugin ${printableName(entry.name, 200)}: ${commandSourceErrorMessage(error)}`,
        });
      return null;
    }
  let extractedFrom;
  if (isPluginZipCacheEnabled() && pluginPath.endsWith(".zip")) {
    let sessionDir = await getSessionPluginCachePath();
    let extractDir = sessionPluginDirFor(sessionDir, pluginSourceId);
    let extractionPlan = planArchiveExtraction(sessionDir, extractDir);
    let extraction;
    extractedFrom = pluginPath;
    try {
      extraction = await extractSessionArchive(pluginPath, extractionPlan);
    } catch (error) {
      logForDebugging(`Failed to extract plugin ZIP ${pluginPath}, deleting corrupt file: ${error}`);
      await rm(pluginPath, {
        force: true,
      }).catch(() => {});
      throw error;
    }
    if (extraction !== undefined) await swapInExtractedTree(extractionPlan, extraction);
    logForDebugging(`Extracted plugin ZIP to session dir: ${extractDir}`);
    pluginPath = extractDir;
    marketplaceDir = undefined;
  }
  let plugin = await finishMarketplacePluginLoad(
    entry,
    pluginSourceId,
    entryEnabled,
    errors,
    warnings,
    pluginPath,
    {
      storageV5,
      linkFarm,
      linkFarmProducer,
      entryEnabled: entryEnabled_2,
      containmentAnchorDir: marketplaceDir,
    },
  );
  if (plugin && shaInfo !== undefined) {
    if (shaInfo.sha !== undefined) plugin.gitCommitSha = shaInfo.sha;
    weakSet_8.add(plugin);
  }
  if (plugin && extractedFrom !== undefined) plugin.extractedFrom = extractedFrom;
  return plugin;
}
//@ chunk-5xgkngpb.js:4699120-4702202 layout
/**
 * 市场插件定位到目录后的收尾：link/producer 目录检查、createPluginFromPath、合并 marketplace 条目中的组件声明（strict=false 时条目即 manifest）。
 */
async function finishMarketplacePluginLoad(
  entry,
  pluginId,
  requestedEntryEnabled,
  errors,
  warnings,
  pluginPath,
  {
    storageV5,
    linkFarm = false,
    linkFarmProducer,
    entryEnabled: effectiveEntryEnabled = requestedEntryEnabled,
    containmentAnchorDir,
  } = {},
) {
  let outErrors = [];
  await materializeCachedLinks(pluginPath, storageV5, linkFarm);
  let anchor;
  let containmentAnchor;
  if (linkFarm || linkFarmProducer !== undefined) {
    anchor =
      linkFarmProducer !== undefined && !isUntrustedLinkPath(linkFarmProducer)
        ? await resolveContainmentRoots([linkFarmProducer, pluginPath], "plugin's producer directory")
        : await resolveContainmentRoots([pluginPath], "plugin directory");
    containmentAnchor = anchor;
  } else if (containmentAnchorDir !== undefined) {
    anchor = await resolveContainmentRoots([containmentAnchorDir], "marketplace directory");
    containmentAnchor = await resolveContainmentRoots(
      [pluginPath, containmentAnchorDir],
      "plugin directory and its marketplace directory",
    );
  } else {
    anchor = await resolveContainmentRoots([pluginPath], "plugin directory");
    containmentAnchor = anchor;
  }
  let {
    plugin,
    errors: errors_2,
    warnings: warnings_2,
    hasManifest,
  } = await createPluginFromPath(
    pluginPath,
    pluginId,
    requestedEntryEnabled,
    entry.name,
    entry.strict ?? true,
    storageV5,
    anchor,
    undefined,
    containmentAnchor,
  );
  outErrors.push(...errors_2);
  if (typeof entry.source === "object" && "sha" in entry.source && entry.source.sha)
    plugin.sha = entry.source.sha;
  if (
    typeof entry.source === "string" &&
    entry.source.split(/[\\/]/).every((segment) => segment === "" || segment === ".") &&
    entry.skills !== undefined
  ) {
    let skillSpecs = Array.isArray(entry.skills) ? entry.skills : [entry.skills];
    if (skillSpecs.length > 0) {
      let skillErrors = [];
      let validSkillPaths = await validatePluginPaths(
        skillSpecs,
        pluginPath,
        entry.name,
        pluginId,
        "skills",
        "Skill",
        "declared in marketplace entry but",
        skillErrors,
        anchor,
        true,
        storageV5,
      );
      let any = skillErrors.some((error) => error.type === "path-traversal");
      if (validSkillPaths.length === 0 && any) {
        plugin.skillsPath = undefined;
        plugin.skillsPaths = undefined;
      } else if (validSkillPaths.length > 0) {
        let skillsDir = join(pluginPath, "skills");
        let resolvedSkillsDir = resolve_2(skillsDir);
        let resolvedPluginPath = resolve_2(pluginPath);
        let any = validSkillPaths.some((skillPath) => {
          let resolvedSkillPath = resolve_2(skillPath);
          return resolvedSkillPath === resolvedSkillsDir || resolvedSkillPath === resolvedPluginPath;
        });
        plugin.skillsPath = any ? plugin.skillsPath : undefined;
        let filtered = validSkillPaths.filter((skillPath) => {
          let resolvedSkillPath = resolve_2(skillPath);
          return resolvedSkillPath !== resolvedSkillsDir && resolvedSkillPath !== resolvedPluginPath;
        });
        plugin.skillsPaths = filtered.length > 0 ? filtered : undefined;
      }
    }
  }
  if (!hasManifest) {
    let validation = validatePluginManifest(entry, "marketplace-entry", {
      pluginName: entry.name,
      manifestPath: pluginId,
    });
    if (validation.ok) {
      plugin.manifest = validation.manifest;
      for (let hookNote of validation.hookNotes)
        logForDebugging(`Plugin ${entry.name}: ${hookNote}`, {
          level: "warn",
        });
    } else {
      if (validation.unloadableGuard) throw new HookValidationError(validation.error);
      logForDebugging(
        `marketplace entry ${entry.name}: canonicalizeManifest rejected an entry that PluginMarketplaceEntrySchema accepted \u2014 falling back to legacy cast. ${validation.error}`,
        {
          level: "warn",
        },
      );
      plugin.manifest = {
        ...entry,
        id: undefined,
        source: undefined,
        strict: undefined,
      };
    }
    plugin.name = plugin.manifest.name;
    await loadMarketplaceEntryComponents(
      {
        plugin,
        entry,
        pluginPath,
        pluginId,
        mode: "assign",
        errors: outErrors,
        anchor,
      },
      storageV5,
    );
  } else if (
    !entry.strict &&
    hasManifest &&
    (entry.commands ||
      entry.agents ||
      entry.skills ||
      entry.hooks ||
      entry.outputStyles ||
      entry.themes ||
      entry.experimental?.themes ||
      false)
  ) {
    logForDebugging(
      `Plugin ${entry.name} has both plugin.json and marketplace manifest entries for commands/agents/skills/hooks/outputStyles/themes/syntaxHighlighting. This is a conflict.`,
      {
        level: "error",
      },
    );
    if (effectiveEntryEnabled)
      errors.push({
        type: "generic-error",
        source: pluginId,
        error: `Plugin ${printableName(entry.name, 200)} has conflicting manifests: both plugin.json and marketplace entry specify components. Set strict: true in marketplace entry or remove component specs from one location.`,
      });
    return null;
  } else if (hasManifest) {
    let manifest = plugin.manifest;
    let hasText = (value) => cleanOptionalText_2(value) !== undefined;
    if (hasText(entry.displayName)) manifest.displayName = entry.displayName;
    if (hasText(entry.description)) manifest.description = entry.description;
    if (entry.author !== undefined && hasText(entry.author.name))
      manifest.author = {
        ...entry.author,
      };
    if (hasText(entry.homepage)) manifest.homepage = entry.homepage;
    if (hasText(entry.repository)) manifest.repository = entry.repository;
    if (hasText(entry.license)) manifest.license = entry.license;
    if (entry.keywords?.length) manifest.keywords = [...entry.keywords];
    await loadMarketplaceEntryComponents(
      {
        plugin,
        entry,
        pluginPath,
        pluginId,
        mode: "append",
        errors: outErrors,
        anchor,
      },
      storageV5,
    );
  }
  if (requestedEntryEnabled) {
    await checkPluginContainment(plugin, outErrors);
    errors.push(...outErrors);
    warnings.push(...warnings_2);
    let gapWarning = await checkDependencyGap(
      pluginPath,
      pluginId,
      entry.name,
      !linkFarm && linkFarmProducer === undefined && containmentAnchorDir === undefined,
    );
    if (gapWarning !== undefined) warnings.push(gapWarning);
  }
  return plugin;
}
//@ chunk-5xgkngpb.js:4702202-4702518 layout
/**
 * 缓存副本缺依赖时生成 dependencies-refused/not-installed 错误。
 */
async function checkDependencyGap(pluginPath, pluginId, plugin, checkEnabled) {
  if (!checkEnabled) return;
  try {
    let gap = await cacheCopyDependencyGap(pluginPath);
    if (gap === undefined) return;
    return gap.kind === "refused"
      ? {
          type: "dependencies-refused",
          source: pluginId,
          plugin,
          reason: gap.reason,
        }
      : {
          type: "dependencies-not-installed",
          source: pluginId,
          plugin,
        };
  } catch (error) {
    logForDebugging(`Could not check the dependencies of ${pluginId}: ${errorMessage(error)}`, {
      level: "warn",
    });
    return;
  }
}
//@ chunk-5xgkngpb.js:4702518-4702676 placement
async function realPathInsideCache(filePath) {
  let [realPath, realCacheRoot] = await Promise.all([
    realpath(filePath).catch(() => {
      return;
    }),
    realpath(anchoredPluginCachePath()).catch(() => {
      return;
    }),
  ]);
  return realPath !== undefined && realCacheRoot !== undefined && isSubpathOf(realCacheRoot, realPath, false)
    ? realPath
    : undefined;
}
//@ chunk-5xgkngpb.js:4702676-4702913 placement
async function cacheCopyDependencyGap(pluginPath) {
  if (isPluginZipCacheEnabled() || isUsingCoworkPlugins()) return;
  let absolutePath = resolve_2(getOriginalCwd(), pluginPath);
  let cacheRoot = anchoredPluginCachePath();
  if (!isSubpathOf(cacheRoot, absolutePath, false)) return;
  let stats = await lstat(absolutePath).catch(() => {
    return;
  });
  if (stats === undefined || !stats.isDirectory()) return;
  let lockfileInfo = await checkLockfileSupported(absolutePath);
  return lockfileInfo !== undefined && (await realPathInsideCache(absolutePath)) !== undefined
    ? lockfileInfo
    : undefined;
}
//@ chunk-5xgkngpb.js:4702913-4704397 placement
/**
 * 从市场条目加载插件组件（代理、技能、输出风格等）。
 */
async function loadMarketplaceEntryComponents(
  { plugin, entry, pluginPath, pluginId, mode, errors, anchor },
  storageV5,
) {
  if (entry.commands)
    await finishLoadingPluginFromPath(
      plugin,
      entry.commands,
      {
        pluginPath,
        pluginName: entry.name,
        errorSource: pluginId,
        mode,
        origin: "marketplace-entry",
        resolvePath: resolveWithinDir,
        anchor,
        registerInlineContent: false,
        errors,
      },
      storageV5,
    );
  if (entry.agents) {
    let agentSpecs = Array.isArray(entry.agents) ? entry.agents : [entry.agents];
    let validAgents = await validatePluginPaths(
      agentSpecs,
      pluginPath,
      entry.name,
      pluginId,
      "agents",
      "Agent",
      "from marketplace entry",
      errors,
      anchor,
      false,
      storageV5,
    );
    if (validAgents.length > 0)
      plugin.agentsPaths = mode === "append" ? [...(plugin.agentsPaths || []), ...validAgents] : validAgents;
  }
  if (entry.skills) {
    let skillSpecs = Array.isArray(entry.skills) ? entry.skills : [entry.skills];
    let skillsDirResolved = resolve_2(join(pluginPath, "skills"));
    let filtered = (
      await validatePluginPaths(
        skillSpecs,
        pluginPath,
        entry.name,
        pluginId,
        "skills",
        "Skill",
        "from marketplace entry",
        errors,
        anchor,
        true,
        storageV5,
      )
    ).filter((path) => resolve_2(path) !== skillsDirResolved);
    if (mode === "append") {
      let existingSkills = new Set((plugin.skillsPaths || []).map((path) => resolve_2(path)));
      let filtered_2 = filtered.filter((path) => !existingSkills.has(resolve_2(path)));
      if (filtered_2.length > 0) plugin.skillsPaths = [...(plugin.skillsPaths || []), ...filtered_2];
    } else if (filtered.length > 0) plugin.skillsPaths = filtered;
  }
  if (entry.outputStyles) {
    let styleSpecs = Array.isArray(entry.outputStyles) ? entry.outputStyles : [entry.outputStyles];
    let validStyles = await validatePluginPaths(
      styleSpecs,
      pluginPath,
      entry.name,
      pluginId,
      "output-styles",
      "Output style",
      "from marketplace entry",
      errors,
      anchor,
      false,
      storageV5,
    );
    if (validStyles.length > 0)
      plugin.outputStylesPaths =
        mode === "append" ? [...(plugin.outputStylesPaths || []), ...validStyles] : validStyles;
  }
  let themes = entry.experimental?.themes ?? entry.themes;
  if (themes) {
    let themeSpecs = Array.isArray(themes) ? themes : [themes];
    let validThemes = await validatePluginPaths(
      themeSpecs,
      pluginPath,
      entry.name,
      pluginId,
      "themes",
      "Theme",
      "from marketplace entry",
      errors,
      anchor,
      false,
      storageV5,
    );
    if (validThemes.length > 0)
      plugin.themesPaths = mode === "append" ? [...(plugin.themesPaths || []), ...validThemes] : validThemes;
  }
  if (entry.hooks) {
    let { hooks, errors: errors_2 } = parseMarketplaceEntryHooks(
      entry.hooks,
      pluginId,
      entry.name,
      pluginPath,
    );
    if (hooks)
      plugin.hooksConfig =
        mode === "append"
          ? {
              ...(plugin.hooksConfig || {}),
              ...hooks,
            }
          : hooks;
    errors.push(...errors_2);
  }
}
//@ chunk-5xgkngpb.js:4704397-4705062 placement
async function describePluginDirShape_2(entries) {
  return (
    await Promise.all(
      entries.map(async (entry) => {
        if (entry.kind !== "path" || isZipPathCaseInsensitive(entry.value)) return [entry];
        let resolved = resolve_2(entry.value);
        let shape = await describePluginDirShape(resolved);
        if (shape.kind === "plugin")
          logForDebugging(`--plugin-dir ${resolved} is one plugin: ${shape.marker} at its top marks it`);
        if (shape.kind !== "collection") return [entry];
        logForDebugging(
          `--plugin-dir ${resolved} is a folder of plugins` +
            (shape.isMarketplaceRoot
              ? ` (its ${MARKETPLACE_MANIFEST_PATH} lists plugins and is not read here; with no ${PLUGIN_MANIFEST_PATH_2} beside it the folder is not itself a plugin)`
              : " (nothing at its top marks it as one plugin)") +
            `: loading ${shape.children.join(", ") || "none"}` +
            (shape.skipped.length > 0 ? `; no manifest in ${shape.skipped.join(", ")}` : ""),
        );
        return shape.children.map((child) => ({
          ...entry,
          value: join(resolved, child),
        }));
      }),
    )
  ).flat();
}
//@ chunk-5xgkngpb.js:4705062-4705076 placement
var PLUGIN_ZIP_FETCH_TIMEOUT_MS = 30000;
//@ chunk-5xgkngpb.js:4705076-4705110 placement
function dirHasPluginRoot(dirPath) {
  return dirHasAnyEntry(dirPath, PLUGIN_ROOT_MARKERS);
}
//@ chunk-5xgkngpb.js:4705110-4705237 placement
var MANIFEST_COMPONENT_KEYS = [
  "commands",
  "agents",
  "skills",
  "hooks",
  "outputStyles",
  "themes",
  "mcpServers",
  "lspServers",
  "experimental",
];
var THEME_ONLY_KEYS = ["themes"];
//@ chunk-5xgkngpb.js:4705237-4705946 placement
function entryDeclaredComponentPaths(entry) {
  if (!entry || typeof entry !== "object") return [];
  let manifest = entry;
  let mapped = MANIFEST_COMPONENT_KEYS.filter((key) => key !== "experimental").map(
    (value) => manifest[value],
  );
  let experimental = manifest.experimental;
  if (experimental && typeof experimental === "object" && !Array.isArray(experimental)) {
    let experimentalField = experimental;
    mapped.push(experimentalField.themes);
  }
  let paths = [];
  let hadUnsafe = false;
  for (let fieldValue of mapped) {
    let list = Array.isArray(fieldValue)
      ? fieldValue
      : typeof fieldValue === "string"
        ? [fieldValue]
        : fieldValue && typeof fieldValue === "object"
          ? Object.values(fieldValue).map((item) =>
              item && typeof item === "object" && !Array.isArray(item) ? item.source : item,
            )
          : [];
    for (let item of list) {
      if (typeof item !== "string" || item.length === 0) continue;
      if (/^[a-z][a-z\d+.-]*:\/\//i.test(item)) continue;
      let filePath = item.startsWith("./") ? item.slice(2) : item;
      if (filePath === "" || filePath === ".") continue;
      if (filePath.split(/[\\/]/).some((segment) => /^[. ]+$/.test(segment)) || !isSafeZipPath(filePath)) {
        hadUnsafe = true;
        continue;
      }
      paths.push(filePath);
      if (paths.length >= 32) return paths;
    }
  }
  if (paths.length === 0 && hadUnsafe) return null;
  return paths;
}
//@ chunk-5xgkngpb.js:4705946-4706067 placement
function entryDeclaresComponents(entry) {
  if (!entry || typeof entry !== "object") return false;
  let manifest = entry;
  return MANIFEST_COMPONENT_KEYS.some((key) =>
    key === "experimental" ? isRecord(manifest[key]) : isNonEmptyValue(manifest[key]),
  );
}
//@ chunk-5xgkngpb.js:4706067-4706247 placement
function isNonEmptyValue(value) {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.length > 0;
  return typeof value === "object" && Object.keys(value).length > 0;
}
//@ chunk-5xgkngpb.js:4706247-4706371 placement
function isRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  let themeValue = value;
  if (THEME_ONLY_KEYS.some((key) => isNonEmptyValue(themeValue[key]))) return true;
  return false;
}
//@ chunk-5xgkngpb.js:4706371-4706429 placement
var RELATIVE_PATH_RE = /^[A-Za-z0-9_.$-]+(\/[A-Za-z0-9_.$-]+)*$/;
var MAX_EXAMPLE_PATH_LENGTH = 120;
//@ chunk-5xgkngpb.js:4706429-4706509 placement
function examplePathSuffix(path) {
  if (!path || path.length > MAX_EXAMPLE_PATH_LENGTH || !RELATIVE_PATH_RE.test(path)) return "";
  return ` (e.g. ${path})`;
}
//@ chunk-5xgkngpb.js:4706509-4706535 placement
var MANIFEST_IDENTITY_READ_RELPATHS; // deferred: uses PLUGIN_MANIFEST_DIR (./commandSource.js) of its import cycle while loading; runs once the cycle is complete
var MANIFEST_IDENTITY_READ_PATHS;
deferInit("chunk-5xgkngpb.js:4706509", () => {
  MANIFEST_IDENTITY_READ_RELPATHS = [PLUGIN_MANIFEST_PATH_2];
  MANIFEST_IDENTITY_READ_PATHS = [PLUGIN_MANIFEST_PATH_2, PLUGIN_JSON];
});
//@ chunk-5xgkngpb.js:4706535-4706613 placement
async function hasManifestIdentityFile(rootDir) {
  for (let relPath of MANIFEST_IDENTITY_READ_PATHS) if (await pathExists(join(rootDir, relPath))) return true;
  return false;
}
//@ chunk-5xgkngpb.js:4706613-4706744 placement
async function anyPathExistsUnder(root, paths) {
  let resolvedRoot = resolve_2(root);
  for (let path of paths) {
    let full = resolve_2(resolvedRoot, path);
    if (!full.startsWith(resolvedRoot + sep)) continue;
    if (await pathExists(full)) return true;
  }
  return false;
}
//@ chunk-5xgkngpb.js:4706744-4706923 placement
async function findSingleTopDir(extractDir) {
  let filtered = (
    await readdir(extractDir, {
      withFileTypes: true,
    })
  ).filter((entry) => entry.name !== "__MACOSX" && entry.name !== ".DS_Store");
  return filtered.length === 1 && filtered[0].isDirectory() ? join(extractDir, filtered[0].name) : undefined;
}
//@ chunk-5xgkngpb.js:4706923-4706994 placement
function isPluginNameAcceptable(name, fromSkillFile, allowEmpty) {
  if (fromSkillFile && !allowEmpty) return false;
  return name.length === 0 || PLUGIN_NAME_FORBIDDEN_CHARS_RE.test(name);
}
//@ chunk-5xgkngpb.js:4706994-4707069 placement
function directoryPluginFallbackName(pluginPath, marketplace) {
  let replaced = basename(pluginPath).replace(/\.zip$/i, "");
  return marketplace === SYNCED ? stripGenerationSuffix(replaced) : replaced;
}
//@ chunk-5xgkngpb.js:4707069-4707112 placement
function syncedPluginFolderId(pluginPath) {
  return `${directoryPluginFallbackName(pluginPath, SYNCED)}@${SYNCED}`;
}
//@ chunk-5xgkngpb.js:4707112-4707320 placement
async function syncedPluginMintedName(pluginPath, storageV5) {
  let folderName = directoryPluginFallbackName(pluginPath, SYNCED);
  try {
    let { manifest, manifestPath } = await loadPluginManifest(
      pluginPath,
      folderName,
      `${folderName}@${SYNCED}`,
      [],
      {
        noTelemetry: true,
      },
      storageV5,
    );
    let fromSkillFile = manifestPath === null || basename(manifestPath) === "SKILL.md";
    return isPluginNameAcceptable(manifest.name, fromSkillFile, true) ? undefined : manifest.name;
  } catch {
    return;
  }
}
//@ chunk-5xgkngpb.js:4707320-4707410 placement
function attributionFromManifest(attribution) {
  return attribution.unread === true
    ? {}
    : {
        attribution: {
          marketplaceName: attribution.marketplaceName,
        },
      };
}
//@ chunk-5xgkngpb.js:4707410-4707883 placement
/**
 * 插件名非法时的 manifest-validation-error。
 */
function invalidPluginNameError(
  plugin,
  source,
  manifestPath,
  isSyncedMarketplace,
  declaredPath,
  attribution,
) {
  let namedAfterDirectory = manifestPath === null || basename(manifestPath) === "SKILL.md";
  if (isPluginNameAcceptable(plugin.name, namedAfterDirectory, isSyncedMarketplace))
    return {
      type: "manifest-validation-error",
      source,
      manifestPath: manifestPath ?? plugin.path,
      validationErrors: [
        `name: "${stripInvisibleKeepEmoji(plugin.name)}" is not a valid plugin name (must be non-empty and must not contain "@", ":", whitespace, path separators, or invisible/control characters)${namedAfterDirectory ? " \u2014 this plugin is named after its directory; rename the directory" : ""}`,
      ],
      ...(declaredPath !== undefined && {
        path: declaredPath,
      }),
      ...(attribution !== undefined && attributionFromManifest(attribution)),
    };
  return null;
}
//@ chunk-5xgkngpb.js:4707883-4708357 placement
/**
 * 记一次桌面技能目录保留命名空间检查结果。
 */
function logReservedNamespaceWrapperCheck(folderChecks) {
  if (folderChecks.length === 0 || !claimOnce().claim("skill_reserved_namespace_wrapper_check")) return;
  let folders = folderChecks.length;
  let desktopFolderFields = {
    desktop_skills_folder_path: fromEnum(
      desktopSkillsPluginDir() === undefined
        ? "not_sent"
        : folderChecks.some((check) => check.isNamedFolder)
          ? "matched"
          : "not_matched",
    ),
  };
  if (folderChecks.some((check) => check.failedLeg === undefined)) {
    logFeatureOk("skill_reserved_namespace", {
      check: lit_2("desktop_wrapper_marked"),
      folders,
      ...desktopFolderFields,
    });
    return;
  }
  let failedLeg = folderChecks[0]?.failedLeg;
  if (failedLeg !== undefined)
    logFeatureSad("skill_reserved_namespace", "desktop_wrapper_unmarked", {
      failed_leg: fromEnum(failedLeg),
      folders,
      ...desktopFolderFields,
    });
}
//@ chunk-5xgkngpb.js:4708357-4708567 placement
function dropUnprintableManifestVersion(plugin) {
  if (plugin.manifest.version !== undefined && INVISIBLE_CHARS_RE.test(plugin.manifest.version)) {
    logForDebugging(
      `Plugin ${plugin.name}: manifest version contains unprintable characters; treating as absent`,
      {
        level: "warn",
      },
    );
    plugin.manifest.version = undefined;
  }
}
//@ chunk-5xgkngpb.js:4708567-4708752 placement
function isOperatorSettingSource_2(settingSource) {
  switch (settingSource) {
    case "userSettings":
    case "flagSettings":
    case "policySettings":
      return true;
    case "localSettings":
      return !isLocalSettingsGitTracked({
        onIndeterminate: "tracked",
      });
    case "projectSettings":
      return false;
  }
}
//@ chunk-5xgkngpb.js:4708752-4709053 placement
/**
 * 插件在设置中被显式禁用（可只认操作者设置）。
 */
function isPluginDisabledBySettings(
  pluginName,
  marketplaceName,
  enabledPluginsIndexed,
  alternateName,
  { repoAuthoredContent = false, installationPreference } = {},
) {
  if (isRequiredPlugin(`${pluginName}@${marketplaceName}`, installationPreference)) return false;
  let reversedSources = repoAuthoredContent ? settingsSourcesReversed() : undefined;
  let isDisabledIn = (pluginId) => {
    let pluginSetting = findPluginSetting(pluginId, enabledPluginsIndexed);
    if (pluginSetting === undefined || pluginSetting.enabled) return false;
    if (reversedSources === undefined) return true;
    let settingSource = reversedSources[pluginSetting.index];
    return settingSource !== undefined && isOperatorSettingSource_2(settingSource);
  };
  return (
    isDisabledIn(`${pluginName}@${marketplaceName}`) ||
    (alternateName !== undefined && isDisabledIn(`${alternateName}@${marketplaceName}`))
  );
}
//@ chunk-5xgkngpb.js:4709053-4709206 placement
function isUnderOriginalCwd(targetPath) {
  let path = getOriginalCwd();
  if (
    isPathWithin_2(path, targetPath, {
      foldCase: true,
    })
  )
    return true;
  let toComparable = (path) => resolve_2(path).normalize("NFC").toLowerCase();
  return isPathWithin_2(toComparable(path), toComparable(targetPath), {
    alreadyComparable: true,
  });
}
//@ chunk-5xgkngpb.js:4709206-4709349 placement (2.1.88 match: ghIsDangerousCallback, 1)
function ghIsDangerousCallback(_rawCommand, args) {
  return (args ? replaceAll(_rawCommand, args, redactUrlQuery(args)) : _rawCommand)
    .split(/(\s+)/)
    .map((token) =>
      token.includes("://") && /["'`<>]/.test(token) && /[@?#]/.test(token)
        ? REDACTED_URL
        : redactUrlsInLoadError(token),
    )
    .join("");
}
//@ chunk-5xgkngpb.js:4709349-4709674 placement
/**
 * 错误文字中的 URL 脱敏（含凭证与查询串）。
 */
function redactUrlsInLoadError(rawText) {
  let replaced = rawText.replace(/[a-z][a-z0-9+.-]{0,31}:\/\/[^\s"']*/gi, (match, matchOffset) => {
    if (/[?#]/.test(match)) return redactUrlsTracked(match);
    let index = match.indexOf("@");
    if (index === -1) return match;
    let atTokenStart = matchOffset === 0 || /[([]/.test(rawText[matchOffset - 1] ?? "");
    let sliced = match.slice(match.indexOf("//") + 2, index);
    return atTokenStart && index === match.lastIndexOf("@") && !sliced.includes(":")
      ? redactUrlQuery(match)
      : redactUrlsTracked(match);
  });
  return redactUrlsInMessage(replaced).replace(/\?[^\s"']*/g, "");
}
//@ chunk-5xgkngpb.js:4709674-4715938 callgraph-witnessed (2.1.88 match: loadSessionOnlyPlugins, 0.228)
/**
 * 加载会话级插件（--plugin-dir 目录、--plugin-url 归档、claude.ai 同步目录）：url 先下载解压到会话缓存；每个目录走 createPluginFromPath；市场名默认 inline（同步的为 synced）。
 */
async function loadSessionOnlyPlugins(
  specs,
  { marketplaceName = INLINE_PLUGIN_MARKETPLACE, storageV5, enabledPluginsIndexed, preview = false },
) {
  if (specs.length === 0)
    return {
      plugins: [],
      errors: [],
      warnings: [],
    };
  let syncedDirList;
  let results = await Promise.all(
    specs.map(async (spec, index) => {
      let generation = commandIdGeneration();
      let attribution =
        spec.kind === "url"
          ? {}
          : {
              unread: true,
            };
      let tempDownload;
      let wrapperCheck;
      let successorDir;
      try {
        let pluginPath;
        let previewFile;
        if (spec.kind === "url") {
          let sessionPluginCachePath = await getSessionPluginCachePath();
          let parsedUrl = new URL(spec.value);
          let urlLabel = parsedUrl.origin + parsedUrl.pathname;
          let baseName = basename(parsedUrl.pathname).replace(/\.zip$/i, "") || "download";
          pluginPath = join(
            sessionPluginCachePath,
            `url-${index}-${baseName.replace(/[^a-zA-Z0-9\-_]/g, "-")}.zip`,
          );
          try {
            let response = await fetch(spec.value, {
              ...getProxyFetchOptions({
                url: spec.value,
              }),
              signal: AbortSignal.timeout(PLUGIN_ZIP_FETCH_TIMEOUT_MS),
            });
            if (!response.ok || !response.body)
              throw Error(`HTTP ${response.status} ${response.statusText} from ${urlLabel}`);
            let contentLength = Number(response.headers.get("content-length"));
            if (contentLength > MAX_SPILL_BYTES)
              throw Error(
                `Plugin archive too large (${contentLength} bytes, max ${MAX_SPILL_BYTES}) from ${urlLabel}`,
              );
            let received = 0;
            let body = Readable.fromWeb(response.body);
            body.on("data", (chunk) => {
              received += chunk.byteLength;
              if (received > MAX_SPILL_BYTES)
                body.destroy(Error(`Plugin archive exceeded ${MAX_SPILL_BYTES} bytes from ${urlLabel}`));
            });
            let partPath = `${pluginPath}.${preview ? "preview-" : ""}${randomBytes(4).toString("hex")}.part`;
            tempDownload = partPath;
            await pipeline(body, createWriteStream(partPath));
            if (preview) previewFile = partPath;
            else {
              await retryFsOp(partPath, pluginPath);
              tempDownload = undefined;
            }
            logForDebugging(`Downloaded inline plugin from ${urlLabel}`);
          } catch (error) {
            if (!(await pathExists(pluginPath))) throw error;
            logForDebugging(
              `Re-fetch of inline plugin from ${urlLabel} failed; reusing cached ${pluginPath}`,
              {
                level: "warn",
              },
            );
          }
        } else {
          pluginPath = resolve_2(spec.value);
          markSyncedFolderRefused();
          let firstErrno;
          try {
            await stat_2(pluginPath);
          } catch (error) {
            firstErrno = getErrnoCode(error) ?? "UNKNOWN";
          }
          let priorErrno = firstErrno;
          if (firstErrno !== undefined && pluginPath.startsWith("/mnt/")) {
            await sleep(250);
            try {
              await stat_2(pluginPath);
              logForDebugging(
                `Plugin path ${pluginPath}: first stat failed with ${firstErrno}, retry succeeded (transient mount race)`,
                {
                  level: "warn",
                },
              );
              firstErrno = undefined;
            } catch (error) {
              firstErrno = getErrnoCode(error) ?? "UNKNOWN";
            }
          }
          if (firstErrno === "ENOENT" && marketplaceName === SYNCED) {
            syncedDirList ??= listSyncedPluginDirsOnly().catch((error) => {
              logError(error);
              return [];
            });
            let staleDir = pluginPath;
            let resolvedPath = stripGenerationSuffix(basename(staleDir));
            let found = (await syncedDirList)
              .map((candidate) => resolve_2(candidate))
              .find(
                (candidate) =>
                  candidate !== staleDir &&
                  dirname(candidate) === dirname(staleDir) &&
                  stripGenerationSuffix(basename(candidate)) === resolvedPath &&
                  !specs.some((spec) => spec.kind === "path" && resolve_2(spec.value) === candidate),
              );
            if (found !== undefined) {
              markSyncedPluginDirsLoadedHere([found]);
              try {
                await stat_2(found);
                logForDebugging(
                  `Synced plugin dir ${staleDir} is gone; the sync manifest now places it at ${found}, loading that`,
                  {
                    level: "warn",
                  },
                );
                pluginPath = found;
                firstErrno = undefined;
                successorDir = found;
              } catch (error) {
                logForDebugging(
                  `Synced plugin dir ${staleDir} is gone and its manifest successor ${found} did not stat either (${getErrnoCode(error) ?? "UNKNOWN"})`,
                  {
                    level: "warn",
                  },
                );
              }
            }
          }
          attribution = await getPluginAttribution(pluginPath);
          if (firstErrno !== undefined) {
            let errno =
              firstErrno !== "ENOENT" ? firstErrno : priorErrno !== "ENOENT" ? priorErrno : undefined;
            logForDebugging(
              `Plugin path does not exist: ${pluginPath} (${firstErrno}${errno && errno !== firstErrno ? `, first ${errno}` : ""}), skipping`,
              {
                level: "warn",
              },
            );
            let fallbackName = directoryPluginFallbackName(pluginPath, marketplaceName);
            if (
              isPluginDisabledBySettings(fallbackName, marketplaceName, enabledPluginsIndexed, undefined, {
                repoAuthoredContent: isUnderOriginalCwd(pluginPath),
                installationPreference: attribution.installationPreference,
              })
            ) {
              logForDebugging(
                `Skipping load-failure error for disabled plugin ${fallbackName}@${marketplaceName}`,
              );
              return {
                plugin: undefined,
                errors: [],
                warnings: [],
              };
            }
            return {
              plugin: undefined,
              errors: [
                {
                  type: "path-not-found",
                  source: `${marketplaceName}[${index}]`,
                  path: pluginPath,
                  component: "commands",
                  ...(errno && {
                    errno,
                  }),
                },
              ],
              warnings: [],
            };
          }
        }
        let dirName = isZipPathCaseInsensitive(pluginPath);
        let dirIdentity;
        let fallbackName = directoryPluginFallbackName(pluginPath, marketplaceName);
        if (dirName) {
          let sessionPluginCachePath = await getSessionPluginCachePath();
          let extractDir = join(
            sessionPluginCachePath,
            `inline-${index}-${fallbackName.replace(/[^a-zA-Z0-9\-_]/g, "-")}`,
          );
          let extractTarget = extractDir;
          let archivePath = previewFile ?? pluginPath;
          if (preview) {
            extractTarget = await extractPreviewArchive(archivePath, sessionPluginCachePath, extractDir);
            logForDebugging(`Previewing inline plugin zip from ${extractTarget}`);
          } else {
            let plan = planArchiveExtraction(sessionPluginCachePath, extractDir);
            let plan_2 = await extractSessionArchive(archivePath, plan);
            if (plan_2 !== undefined) {
              logForDebugging(`Extracted inline plugin zip; swapping it into ${extractDir}`);
              await swapInExtractedTree(plan, plan_2);
            } else logForDebugging(`Inline plugin zip unchanged; loading ${extractDir}`);
          }
          pluginPath = await findPluginRootInExtracted(extractTarget);
          if (pluginPath !== extractTarget)
            logForDebugging(`Inline plugin zip had wrapper directory; using ${pluginPath}`);
          if (preview) dirIdentity = await statDirIdentity(pluginPath, "before");
        }
        let fields =
          marketplaceName === SYNCED
            ? await resolveContainmentRoots([pluginPath], "plugin directory")
            : undefined;
        let { plugin, errors, warnings, manifestPath } = await createPluginFromPath(
          pluginPath,
          `${fallbackName}@${marketplaceName}`,
          true,
          fallbackName,
          true,
          storageV5,
          fields,
          undefined,
          fields,
        );
        if (dirIdentity !== undefined) await assertDirUnchanged(pluginPath, dirIdentity);
        let nameError = invalidPluginNameError(
          plugin,
          `${marketplaceName}[${index}]`,
          manifestPath,
          marketplaceName === SYNCED,
          spec.kind === "path" ? resolve_2(spec.value) : undefined,
          attribution,
        );
        if (nameError) {
          if (
            isPluginDisabledBySettings(fallbackName, marketplaceName, enabledPluginsIndexed, plugin.name, {
              repoAuthoredContent: spec.kind === "path" && isUnderOriginalCwd(resolve_2(spec.value)),
              installationPreference: attribution.installationPreference,
            })
          ) {
            logForDebugging(
              `Skipping load-failure error for disabled plugin ${fallbackName}@${marketplaceName}`,
            );
            return {
              plugin: undefined,
              errors,
              warnings,
            };
          }
          return {
            plugin: undefined,
            errors: [nameError, ...errors],
            warnings,
          };
        }
        dropUnprintableManifestVersion(plugin);
        plugin.source = `${plugin.name}@${marketplaceName}`;
        plugin.repository = `${plugin.name}@${marketplaceName}`;
        if (
          plugin.name === ANTHROPIC_SKILLS &&
          marketplaceName === INLINE_PLUGIN_MARKETPLACE &&
          isTopHostSession()
        ) {
          let failedLeg =
            spec.kind !== "path"
              ? "not_a_path"
              : isZipPathCaseInsensitive(spec.value)
                ? "archive"
                : undefined;
          let desktopSkillsDir = desktopSkillsPluginDir();
          let isNamedFolder =
            failedLeg === undefined &&
            desktopSkillsDir !== undefined &&
            normalizeRegistryKey(desktopSkillsDir) === normalizeRegistryKey(pluginPath);
          if (failedLeg === undefined) plugin.accountSkillsWrapper = true;
          if (isNamedFolder) plugin.hostNamedSkillsFolder = true;
          wrapperCheck = {
            failedLeg,
            isNamedFolder,
          };
        }
        if (
          marketplaceName === SYNCED &&
          spec.kind === "path" &&
          spec.attestation !== undefined &&
          successorDir === undefined &&
          plugin.name === spec.attestation.pluginName
        )
          plugin.officialAttestation = {
            marketplace: spec.attestation.marketplace,
          };
        if (attribution.serverPluginId !== undefined) plugin.serverPluginId = attribution.serverPluginId;
        if (attribution.installationPreference !== undefined)
          plugin.installationPreference = attribution.installationPreference;
        if (attribution.marketplaceKind !== undefined && marketplaceName === SYNCED)
          plugin.marketplaceKind = attribution.marketplaceKind;
        if (attribution.marketplaceName !== undefined) {
          plugin.attributedMarketplaceName = attribution.marketplaceName;
          registerCommandId(
            plugin.name,
            marketplaceSuffix(plugin.repository),
            attribution.marketplaceName,
            generation,
          );
        }
        plugin.enabled = isPluginEnabled_2(
          plugin.source,
          enabledPluginsIndexed,
          plugin.manifest.defaultEnabled,
          attribution.installationPreference,
        );
        if (spec.kind === "path" && spec.skipMcpDiscovery) {
          plugin.skipMcpDiscovery = true;
          plugin.mcpServers = {};
        }
        await checkPluginContainment(plugin, errors);
        logForDebugging(`Loaded inline plugin from path: ${plugin.name}`);
        return {
          plugin,
          errors,
          warnings,
          wrapperCheck,
        };
      } catch (error) {
        let redact = (message) =>
          ghIsDangerousCallback(message, spec.kind === "url" ? spec.value : undefined);
        let errorMsg = redact(errorMessage(error));
        logForDebugging(
          `Failed to load session plugin from ${spec.kind === "url" ? redact(spec.value) : spec.value}: ${errorMsg}`,
          {
            level: "warn",
          },
        );
        let fallbackName;
        let path;
        if (spec.kind === "path") {
          path = successorDir ?? resolve_2(spec.value);
          fallbackName = directoryPluginFallbackName(path, marketplaceName);
        } else
          try {
            let parsedUrl = new URL(spec.value);
            let baseName = basename(parsedUrl.pathname).replace(/\.zip$/i, "") || "download";
            fallbackName = `url-${index}-${baseName.replace(/[^a-zA-Z0-9\-_]/g, "-")}`;
          } catch {}
        let manifestName =
          fallbackName !== undefined && path !== undefined && !isZipPathCaseInsensitive(path)
            ? await loadPluginManifest(
                path,
                fallbackName,
                `${fallbackName}@${marketplaceName}`,
                [],
                {
                  noTelemetry: true,
                },
                storageV5,
              )
                .then(({ manifest }) => manifest.name)
                .catch(() => {
                  return;
                })
            : undefined;
        if (
          fallbackName !== undefined &&
          isPluginDisabledBySettings(fallbackName, marketplaceName, enabledPluginsIndexed, manifestName, {
            repoAuthoredContent: path !== undefined && isUnderOriginalCwd(path),
            installationPreference: attribution.installationPreference,
          })
        ) {
          logForDebugging(
            `Skipping load-failure error for disabled plugin ${fallbackName}@${marketplaceName}`,
          );
          return {
            plugin: undefined,
            errors: [],
            warnings: [],
          };
        }
        return {
          plugin: undefined,
          errors: [
            {
              type: "generic-error",
              source: `${marketplaceName}[${index}]`,
              error: `Failed to load plugin: ${commandSourceErrorMessage(error, redact)}`,
              ...(path !== undefined && {
                path,
              }),
              ...(manifestName !== undefined && {
                manifestName,
              }),
              ...attributionFromManifest(attribution),
            },
          ],
          warnings: [],
        };
      } finally {
        if (tempDownload !== undefined) {
          let tempPath = tempDownload;
          await retryTransient(() =>
            rm(tempPath, {
              force: true,
            }),
          ).catch((error) => {
            logForDebugging(`Failed to remove the temporary download ${tempPath}: ${errorMessage(error)}`, {
              level: "warn",
            });
          });
        }
      }
    }),
  );
  let flattened = results.flatMap((result) => (result.plugin ? [result.plugin] : []));
  let errors = results.flatMap((result) => result.errors);
  let warnings = results.flatMap((result) => result.warnings);
  let folderChecks = results.flatMap((result) => (result.wrapperCheck ? [result.wrapperCheck] : []));
  if (folderChecks.length > 0) logReservedNamespaceWrapperCheck(folderChecks);
  if (flattened.length > 0) logForDebugging(`Loaded ${flattened.length} directory-loaded plugins`);
  return {
    plugins: flattened,
    errors,
    warnings,
  };
}
//@ chunk-5xgkngpb.js:4715938-4716221 placement (2.1.88 match: isRealPathWithinTeamDir, 0.772)
async function listDirNamesSet(storageV5, dir) {
  let storageKey = isStorageV5Enabled() && storageV5 !== undefined ? thinkbackStorageKey(dir) : null;
  if (storageV5 !== undefined && storageKey !== null) {
    let listing = await listStorageScopeNames(storageV5, storageKey);
    if (listing.error === undefined) return new Set(listing.names.map(({ name }) => name));
    throw Error(formatStorageError(listing.error));
  }
  try {
    return new Set(await readdir(dir));
  } catch (error) {
    if (isENOENT(error) || getErrnoCode(error) === "ENOTDIR") return new Set();
    throw error;
  }
}
//@ chunk-5xgkngpb.js:4716221-4716307 placement
async function hasClaudePluginEntry(storageV5, dir, dirName) {
  if ((await listDirNamesSet(storageV5, dir)).has(".claude-plugin")) return true;
  return false;
}
//@ chunk-5xgkngpb.js:4716307-4720171 placement
async function loadSkillsAsPlugins(storageV5, enabledPluginsIndexed = getEnabledPluginsBySource()) {
  let skillsAsPlugins = await loadSkillsAsPlugins_2(storageV5);
  let untrusted = [];
  let restrictPersonal = isPersonalConfigRestricted();
  let restrictedCount = 0;
  let filtered = skillsAsPlugins.filter((skillsAsPlugin) => {
    if (skillsAsPlugin.scope === "project" && !isWorkspaceTrustedForMarketplace()) {
      untrusted.push(skillsAsPlugin);
      return false;
    }
    if (skillsAsPlugin.scope === "user" && restrictPersonal) {
      restrictedCount++;
      return false;
    }
    return true;
  });
  if (restrictedCount > 0)
    logForDebugging(
      `[skill-as-plugin] not loading plugins from ${restrictedCount} folder(s) in your own skills directory (CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG); they load as skills only`,
    );
  let isDisabled = (name, scope, manifestName) =>
    isPluginDisabledBySettings(name, SKILLS_DIR, enabledPluginsIndexed, manifestName, {
      repoAuthoredContent: scope === "project",
    });
  let results = await pMap(
    filtered,
    async ({ dir, scope }) => {
      await new Promise((resolve) => setImmediate(resolve));
      let dirName = basename(dir);
      let fields;
      try {
        if (!(await hasClaudePluginEntry(storageV5, dir, dirName).catch(() => false))) return null;
        if (scope === "project")
          fields = await resolveContainmentRoots(
            [dir, resolve_2(dir, "..", "..", "..")],
            "plugin directory and its project folder",
          );
        let { plugin, errors, warnings, hasManifest, manifestPath } = await createPluginFromPath(
          dir,
          `${dirName}@${SKILLS_DIR}`,
          true,
          dirName,
          false,
          storageV5,
          fields,
          undefined,
          fields,
        );
        delete plugin.filesAnchor;
        if (!isSkillCustomizationBookingAllowed(plugin, hasManifest))
          return errors.length || warnings.length
            ? {
                plugin: null,
                errors,
                warnings,
              }
            : null;
        let nameError = invalidPluginNameError(plugin, `${dirName}@${SKILLS_DIR}`, manifestPath, false);
        if (nameError) {
          if (isDisabled(dirName, scope, plugin.name)) {
            logForDebugging(`Skipping load-failure error for disabled plugin ${dirName}@${SKILLS_DIR}`);
            return errors.length || warnings.length
              ? {
                  plugin: null,
                  errors,
                  warnings,
                }
              : null;
          }
          return {
            plugin: null,
            errors: [nameError, ...errors],
            warnings,
          };
        }
        dropUnprintableManifestVersion(plugin);
        plugin.source = `${plugin.name}@${SKILLS_DIR}`;
        plugin.repository = plugin.source;
        plugin.scope = scope;
        if (scope === "project") {
          let mapped = (plugin.monitors ?? []).map(
            (monitor, monitorIndex) => monitor.name ?? `#${monitorIndex + 1}`,
          );
          if (mapped.length > 0)
            warnings.push({
              type: "project-scope-server-stripped",
              source: plugin.source,
              plugin: plugin.name,
              monitors: mapped,
              warning: `${plural(mapped.length, "monitor")} (${quotedPrintable(mapped.join(", "))}) from project-scope plugin "${quotedPrintable(plugin.name)}" ${plural(mapped.length, "was", "were")} not armed \u2014 project-supplied monitors have no per-item approval flow.`,
            });
          plugin.monitors = [];
        }
        await checkPluginContainment(plugin, errors);
        return {
          plugin,
          errors,
          warnings,
        };
      } catch (error) {
        let manifestName = await loadPluginManifest(
          dir,
          dirName,
          `${dirName}@${SKILLS_DIR}`,
          [],
          {
            noTelemetry: true,
            containedIn: fields,
          },
          storageV5,
        )
          .then(({ manifest }) => manifest.name)
          .catch(() => {
            return;
          });
        if (isDisabled(dirName, scope, manifestName)) {
          logForDebugging(`Skipping load-failure error for disabled plugin ${dirName}@${SKILLS_DIR}`);
          return null;
        }
        return {
          plugin: null,
          errors: [
            manifestErrorToPluginError(error, `${dirName}@${SKILLS_DIR}`, undefined) ?? {
              type: "generic-error",
              source: `${dirName}@${SKILLS_DIR}`,
              error: `Failed to load skill folder as plugin: ${printableMessage(error)}`,
            },
          ],
          warnings: [],
        };
      }
    },
    {
      concurrency: 32,
    },
  );
  let errors = [];
  let warnings = [];
  let pluginsByName = new Map();
  for (let result of results) {
    if (!result) continue;
    if (!result.plugin) {
      errors.push(...result.errors);
      warnings.push(...result.warnings);
      continue;
    }
    let existingPlugin = pluginsByName.get(result.plugin.name);
    if (existingPlugin) {
      let scopeDiffers = existingPlugin.scope !== result.plugin.scope;
      errors.push({
        type: "generic-error",
        orphan: true,
        source: `${basename(result.plugin.path)}@${SKILLS_DIR}`,
        error: scopeDiffers
          ? `Not loaded \u2014 your ${printableOrEmpty(displaySkillsDirPath(existingPlugin))} (same plugin name "${quotedPrintable(result.plugin.name)}") shadowed the project's ${printableOrEmpty(displaySkillsDirPath(result.plugin))}. To use the project's copy here, rename or move yours.`
          : `Not loaded \u2014 same plugin name "${quotedPrintable(result.plugin.name)}" as ${printableOrEmpty(displaySkillsDirPath(existingPlugin))} (which loaded instead). Delete ${printableOrEmpty(displaySkillsDirPath(result.plugin))}, or give it a different "name" in its plugin.json.`,
      });
      continue;
    }
    errors.push(...result.errors);
    warnings.push(...result.warnings);
    pluginsByName.set(result.plugin.name, result.plugin);
  }
  let plugins = [...pluginsByName.values()];
  for (let plugin of plugins)
    plugin.enabled = isPluginEnabled_2(
      plugin.source,
      enabledPluginsIndexed,
      plugin.manifest.defaultEnabled,
      undefined,
    );
  let filtered_2 = (
    await pMap(
      untrusted,
      async (candidate) => {
        await new Promise((resolve) => setImmediate(resolve));
        try {
          return (await hasClaudePluginEntry(storageV5, candidate.dir, basename(candidate.dir)))
            ? candidate
            : null;
        } catch {
          return candidate;
        }
      },
      {
        concurrency: 32,
      },
    )
  ).filter((candidate) => candidate !== null);
  if (filtered_2.length > 0) {
    let suppressedCount = filtered_2.length;
    warnings.push({
      type: "project-scope-suppressed-untrusted",
      source: `(suppressed)@${SKILLS_DIR}`,
      count: suppressedCount,
      warning: `${suppressedCount} project-scope ${suppressedCount === 1 ? "directory" : "directories"} under ./.claude/skills/ that may load as ${suppressedCount === 1 ? "a plugin" : "plugins"} ${suppressedCount === 1 ? "was" : "were"} skipped because this workspace was not trusted when plugins were scanned. After accepting the trust dialog, run /reload-plugins (or relaunch) to load what qualifies.`,
    });
  }
  logEvent("tengu_plugin_skills_dir_loaded", {
    count: plugins.length,
    user_count: countWhere(plugins, (plugin) => plugin.scope === "user"),
    project_count: countWhere(plugins, (plugin) => plugin.scope === "project"),
    project_suppressed_count: filtered_2.length,
    error_count: errors.length,
  });
  if (plugins.length > 0) logForDebugging(`Loaded ${plugins.length} skills-as-plugins`);
  return {
    plugins,
    errors,
    warnings,
  };
}
//@ chunk-5xgkngpb.js:4720171-4720284 placement
function localCopyShadowingSynced(pluginName, plugins) {
  let lowerName = nfcLower(pluginName);
  return plugins.find(
    (plugin) =>
      plugin.enabled !== false &&
      marketplaceSuffix(plugin.source) !== SYNCED &&
      pluginNameAliases(plugin).some((alias) => nfcLower(alias) === lowerName),
  );
}
//@ chunk-5xgkngpb.js:4720284-4720766 layout
/**
 * 操作者设置中被禁用的 synced/inline 插件名。
 */
function collectDisabledInlineNames(records, settingSources) {
  let filtered = records.filter((record, index) => {
    let settingSource = settingSources[index];
    return (
      record !== undefined &&
      settingSource !== undefined &&
      settingSource !== "policySettings" &&
      isOperatorSettingSource_2(settingSource)
    );
  });
  let filtered_2 = records.filter(
    (record, index) => record !== undefined && settingSources[index] === "localSettings",
  );
  let inlinePluginIds = new Set();
  for (let record of [...filtered, ...filtered_2])
    for (let key of Object.keys(record?.record ?? {})) {
      let pluginId = normalizePluginId(key);
      let suffix = marketplaceSuffix(pluginId);
      if (suffix === SYNCED || suffix === INLINE_PLUGIN_MARKETPLACE) inlinePluginIds.add(pluginId);
    }
  let disabledNames = new Set();
  for (let pluginId of inlinePluginIds) {
    let pluginName = nfcLower(pluginId.slice(0, pluginId.lastIndexOf("@")));
    if (findPluginSetting(pluginId, filtered)?.enabled === false) {
      disabledNames.add(pluginName);
      continue;
    }
    let lowerId = nfcLower(pluginId);
    if (filtered_2.some((record) => record?.byFold.get(lowerId)?.enabled === false))
      disabledNames.add(pluginName);
  }
  return disabledNames;
}
//@ chunk-5xgkngpb.js:4720766-4720947 layout
function countAdmittedPluginNames(plugins, managedEntries) {
  let counts = new Map();
  for (let plugin of plugins)
    if (
      plugin.enabled !== false &&
      matchPolicyPluginEntry(managedEntries, plugin.name, plugin.attributedMarketplaceName).outcome ===
        "admitted"
    ) {
      let lowerName = nfcLower(plugin.name);
      counts.set(lowerName, (counts.get(lowerName) ?? 0) + 1);
    }
  return counts;
}
//@ chunk-5xgkngpb.js:4720947-4725587 callgraph-fingerprint (2.1.88 match: mergePluginSources, 0.184)
/**
 * 合并各来源插件（session/marketplace/skills-dir/synced/builtin），同名时按 托管策略 > 会话 > 市场 的优先级去重，托管锁定（managed）条目可强制启用/禁用，记录冲突警告。
 */
function mergePluginSources(sources) {
  let errors = [];
  let warnings = [];
  let managedEntries = sources.managedEntries;
  let recordedDisableFolds = sources.recordedDisableFolds ?? new Set();
  for (let pluginList of [sources.session, sources.synced ?? []])
    for (let plugin of pluginList) {
      if (
        matchPolicyPluginEntry(managedEntries, plugin.name, plugin.attributedMarketplaceName).outcome !==
        "admitted"
      )
        continue;
      if (
        recordedDisableFolds.has(nfcLower(plugin.name)) &&
        !isRequiredPlugin(plugin.source, plugin.installationPreference)
      ) {
        plugin.enabled = false;
        warnings.push({
          type: "managed-plugin-disabled-by-settings",
          source: plugin.source,
        });
      } else if (plugin.enabled === false) plugin.enabled = true;
    }
  let sessionNameCounts = countAdmittedPluginNames(sources.session, managedEntries);
  let syncedNameCounts = countAdmittedPluginNames(sources.synced ?? [], managedEntries);
  let sessionPlugins = sources.session.filter((plugin) => {
    let decision = matchPolicyPluginEntry(managedEntries, plugin.name, plugin.attributedMarketplaceName);
    if (decision.outcome === "locked") {
      let isAttributedCopy =
        plugin.attributedMarketplaceName !== undefined ||
        plugin.serverPluginId !== undefined ||
        plugin.installationPreference !== undefined;
      logForDebugging(
        `Plugin "${plugin.name}" from ${isAttributedCopy ? "a sync-attributed directory" : "--plugin-dir"} is blocked by managed settings`,
        {
          level: "warn",
        },
      );
      errors.push({
        type: "generic-error",
        orphan: true,
        source: plugin.source,
        plugin: plugin.name,
        error: `${isAttributedCopy ? "sync-attributed" : "--plugin-dir"} copy of "${quotedPrintable(plugin.name)}" ignored: plugin is locked by managed settings`,
      });
      return false;
    }
    if (decision.outcome === "admitted" && plugin.enabled !== false) {
      let lowerName = nfcLower(plugin.name);
      if ((sessionNameCounts.get(lowerName) ?? 0) > 1) {
        errors.push({
          type: "generic-error",
          orphan: true,
          source: plugin.source,
          plugin: plugin.name,
          error: `sync-attributed copy of "${quotedPrintable(plugin.name)}" ignored: multiple session copies claim the managed plugin's marketplace, so none is loaded`,
        });
        return false;
      }
      let admittedName = nfcLower(plugin.name);
      let shadowingPlugin =
        [...sources.marketplace, ...sources.builtin].find(
          (candidatePlugin) =>
            candidatePlugin.enabled !== false &&
            pluginNameAliases(candidatePlugin).some((alias) => nfcLower(alias) === admittedName),
        ) ??
        sources.synced?.find(
          (candidatePlugin) =>
            candidatePlugin.enabled !== false &&
            nfcLower(candidatePlugin.name) === admittedName &&
            matchPolicyPluginEntry(
              managedEntries,
              candidatePlugin.name,
              candidatePlugin.attributedMarketplaceName,
            ).outcome === "admitted",
        );
      if (shadowingPlugin) {
        logForDebugging(
          `Admitted session copy of managed plugin "${plugin.name}" shadowed by ${shadowingPlugin.source}`,
        );
        warnings.push({
          type: "synced-plugin-shadowed",
          orphan: true,
          source: plugin.source,
          shadowedBy: stripInvisibleKeepEmoji(shadowingPlugin.source),
        });
        return false;
      }
      plugin.admittedByManagedLock = true;
      if (sources.managedHooksOnly)
        warnings.push({
          type: "managed-hooks-restricted",
          source: plugin.source,
        });
    }
    return true;
  });
  let sessionNames = new Set(
    sessionPlugins
      .filter((sessionPlugin) => sessionPlugin.enabled !== false)
      .map((sessionPlugin) => sessionPlugin.name),
  );
  let marketplacePlugins = sources.marketplace.filter((marketplacePlugin) => {
    if (sessionNames.has(marketplacePlugin.name)) {
      logForDebugging(`Plugin "${marketplacePlugin.name}" from --plugin-dir overrides installed version`);
      return false;
    }
    return true;
  });
  let skillPlugins = [];
  if (sources.skill?.length) {
    let nameOwners = new Map();
    for (let marketplacePlugin of marketplacePlugins)
      nameOwners.set(marketplacePlugin.name, `an installed plugin (${marketplacePlugin.source})`);
    for (let sessionName of sessionNames)
      nameOwners.set(sessionName, "a session-only plugin (--plugin-dir / --plugin-url)");
    skillPlugins = sources.skill.filter((skillPlugin) => {
      let ownerDescription =
        matchPolicyPluginEntry(managedEntries, skillPlugin.name).outcome === "locked"
          ? "managed settings"
          : nameOwners.get(skillPlugin.name);
      if (!ownerDescription) return true;
      errors.push({
        type: "generic-error",
        orphan: true,
        source: `${basename(skillPlugin.path)}@${SKILLS_DIR}`,
        error: `Not loaded \u2014 the name "${quotedPrintable(skillPlugin.name)}" is already taken by ${quotedPrintable(ownerDescription)}, which takes precedence. Give the plugin at ${printableOrEmpty(displaySkillsDirPath(skillPlugin))} a different "name" (in plugin.json or SKILL.md frontmatter) to load this copy.`,
      });
      return false;
    });
  }
  let syncedPlugins = [];
  if (sources.synced?.length) {
    let localNameOwners = new Map();
    for (let pluginList of [sessionPlugins, marketplacePlugins, skillPlugins, sources.builtin])
      for (let plugin of pluginList)
        for (let alias of pluginNameAliases(plugin)) {
          let lowerAlias = nfcLower(alias);
          if (plugin.enabled !== false && !localNameOwners.has(lowerAlias))
            localNameOwners.set(lowerAlias, plugin.source);
        }
    let firstSyncedByName = new Map();
    syncedPlugins = sources.synced.filter((syncedPlugin) => {
      let decision = matchPolicyPluginEntry(
        managedEntries,
        syncedPlugin.name,
        syncedPlugin.attributedMarketplaceName,
      );
      if (decision.outcome === "locked") {
        errors.push({
          type: "generic-error",
          orphan: true,
          source: syncedPlugin.source,
          error: `claude.ai-synced copy of "${syncedPlugin.name}" ignored: plugin is locked by managed settings`,
        });
        return false;
      }
      if (
        decision.outcome === "admitted" &&
        syncedPlugin.enabled !== false &&
        (syncedNameCounts.get(nfcLower(syncedPlugin.name)) ?? 0) > 1
      ) {
        errors.push({
          type: "generic-error",
          orphan: true,
          source: syncedPlugin.source,
          error: `claude.ai-synced copy of "${quotedPrintable(syncedPlugin.name)}" ignored: multiple synced copies claim the managed plugin's marketplace, so none is loaded`,
        });
        return false;
      }
      let firstEntry = firstSyncedByName.get(nfcLower(syncedPlugin.name));
      if (firstEntry) {
        errors.push({
          type: "generic-error",
          orphan: true,
          source: `${basename(syncedPlugin.path)}@${SYNCED}`,
          error:
            firstEntry.fate === "used"
              ? `Not loaded \u2014 the claude.ai-synced copy in ${basename(syncedPlugin.path)}/ declares the same plugin name "${syncedPlugin.name}" as ${basename(firstEntry.first.path)}/, which is used instead`
              : firstEntry.fate === "disabled"
                ? `Not loaded \u2014 the claude.ai-synced copy in ${basename(syncedPlugin.path)}/ declares the same plugin name "${syncedPlugin.name}" as ${basename(firstEntry.first.path)}/, which is kept as a disabled row`
                : `Not loaded \u2014 the claude.ai-synced copy in ${basename(syncedPlugin.path)}/ declares the same plugin name "${syncedPlugin.name}" as ${basename(firstEntry.first.path)}/ (the first claude.ai copy of that name); only one synced copy per name is considered`,
        });
        return false;
      }
      let fate;
      let shadowingSource = localNameOwners.get(nfcLower(syncedPlugin.name));
      if (shadowingSource === undefined || syncedPlugin.enabled === false)
        fate = syncedPlugin.enabled === false ? "disabled" : "used";
      else {
        logForDebugging(`Synced plugin "${syncedPlugin.name}" shadowed by local copy ${shadowingSource}`);
        warnings.push({
          type: "synced-plugin-shadowed",
          orphan: true,
          source: syncedPlugin.source,
          shadowedBy: stripInvisibleKeepEmoji(shadowingSource),
        });
        fate = "dropped";
      }
      if (fate === "used" && decision.outcome === "admitted") {
        syncedPlugin.admittedByManagedLock = true;
        if (sources.managedHooksOnly)
          warnings.push({
            type: "managed-hooks-restricted",
            source: syncedPlugin.source,
          });
      }
      firstSyncedByName.set(nfcLower(syncedPlugin.name), {
        first: syncedPlugin,
        fate,
      });
      return fate !== "dropped";
    });
  }
  return {
    plugins: [
      ...sessionPlugins,
      ...marketplacePlugins,
      ...skillPlugins,
      ...syncedPlugins,
      ...sources.builtin,
    ],
    errors,
    warnings,
  };
}
//@ chunk-5xgkngpb.js:4725587-4726164 placement
/**
 * 完整加载全部插件（允许网络获取缺失缓存），结果 Promise 缓存在全局状态 pluginLoad；完成后若设置未变也填充 cacheOnly 缓存。
 */
function loadAllPlugins(storageV5, credentials) {
  let pluginRegistry = getPluginRegistry();
  if (pluginRegistry.pluginLoad !== undefined) {
    logJoinedLoadArmMismatch("loadAllPlugins", pluginRegistry.pluginLoadArm, storageV5);
    return pluginRegistry.pluginLoad;
  }
  let loadArm = getLoadArm(storageV5);
  let policyStamp = managedHooksPolicyStamp_2();
  pluginRegistry.pluginLoadArm = loadArm;
  let loadFull = async () => {
    let result = await assemblePluginLoadResult(
      () =>
        loadPluginsFromMarketplaces({
          cacheOnly: false,
          storageV5,
          credentials,
        }),
      {
        storageV5,
        readUnder: policyStamp,
      },
    );
    if (
      pluginRegistry.pluginLoad === loadPromise ||
      (result.readUnder === managedHooksPolicyStamp_2() &&
        (!isStorageV5Enabled() || storageV5 === undefined) &&
        pluginRegistry.pluginLoadArm !== "v5" &&
        pluginRegistry.pluginLoadCacheOnlyArm !== "v5")
    ) {
      let resolved = Promise.resolve(result);
      pluginRegistry.pluginLoadMarks.set(resolved, result.readUnder ?? EMPTY_POLICY_STAMP);
      pluginRegistry.pluginLoadCacheOnly = resolved;
      pluginRegistry.pluginLoadCacheOnlyArm = loadArm;
    }
    return result;
  };
  notePluginFullLoad();
  let loadPromise = trackPluginLoad(loadFull());
  pluginRegistry.pluginLoadMarks.set(loadPromise, policyStamp);
  pluginRegistry.pluginLoad = loadPromise;
  return loadPromise;
}
//@ chunk-5xgkngpb.js:4726164-4726214 placement
function getLoadArm(storageV5) {
  return isStorageV5Enabled() && storageV5 !== undefined ? "v5" : "raw";
}
//@ chunk-5xgkngpb.js:4726214-4726417 placement
function logJoinedLoadArmMismatch(label, arm, storageV5) {
  if (isStorageV5Enabled() && storageV5 !== undefined && arm === "raw")
    logForDebugging(
      `${label}: joining a plugin load that an earlier caller started without the storage backend (tengu_hover_rest); this caller's backend is not used for it`,
    );
}
//@ chunk-5xgkngpb.js:4726417-4726493 placement
/**
 * 是否启用同步插件安装（storageV5 且 CLAUDE_CODE_SYNC_PLUGIN_INSTALL）。
 */
function shouldFillPluginLoadWithStore(storageV5) {
  return isStorageV5Enabled() && storageV5 !== undefined && !!env.CLAUDE_CODE_SYNC_PLUGIN_INSTALL;
}
//@ chunk-5xgkngpb.js:4726493-4727053 placement
/**
 * 只用本地缓存加载全部插件（不联网），结果缓存在全局 pluginLoadCacheOnly；设置 CLAUDE_CODE_SYNC_PLUGIN_INSTALL 时改为等待完整加载。启动与大多数读取插件列表的地方都调用它。
 */
function loadAllPluginsCacheOnly(storageV5, credentials) {
  let pluginRegistry = getPluginRegistry();
  if (pluginRegistry.pluginLoadCacheOnly !== undefined) {
    logJoinedLoadArmMismatch("loadAllPluginsCacheOnly", pluginRegistry.pluginLoadCacheOnlyArm, storageV5);
    return pluginRegistry.pluginLoadCacheOnly;
  }
  pluginRegistry.pluginLoadCacheOnlyArm = getLoadArm(storageV5);
  let policyStamp = env.CLAUDE_CODE_SYNC_PLUGIN_INSTALL ? undefined : managedHooksPolicyStamp_2();
  pluginRegistry.pluginLoadCacheOnly = trackPluginLoad(
    (async () => {
      if (env.CLAUDE_CODE_SYNC_PLUGIN_INSTALL) {
        let allPlugins = loadAllPlugins(storageV5, credentials);
        pluginRegistry.pluginLoadCacheOnlyArm = pluginRegistry.pluginLoadArm;
        return allPlugins;
      }
      return assemblePluginLoadResult(
        () =>
          loadPluginsFromMarketplaces({
            cacheOnly: true,
            storageV5,
            credentials: undefined,
          }),
        {
          storageV5,
          readUnder: policyStamp,
        },
      );
    })(),
  );
  if (policyStamp !== undefined)
    pluginRegistry.pluginLoadMarks.set(pluginRegistry.pluginLoadCacheOnly, policyStamp);
  return pluginRegistry.pluginLoadCacheOnly;
}
//@ chunk-5xgkngpb.js:4727053-4727150 placement
function trackPluginLoad(load) {
  let pluginRegistry = getPluginRegistry();
  pluginRegistry.pluginLoadsRunning++;
  return load.finally(() => {
    pluginRegistry.pluginLoadsRunning--;
  });
}
//@ chunk-5xgkngpb.js:4727150-4727211 fingerprint (2.1.88 match: loadAllPlugins, 0.743)
var cacheOnlyLoadOptions = (storageV5) => ({
  cacheOnly: true,
  storageV5,
  credentials: undefined,
});
//@ chunk-5xgkngpb.js:4727211-4727345 placement
/**
 * 返回与当前插件相关设置一致的 cacheOnly 加载结果：缓存的 Promise 标记与当前设置指纹一致就复用，否则重新加载。
 */
function rereadPluginsCacheOnly(storageV5) {
  let pluginRegistry = getPluginRegistry();
  let stamp = managedHooksPolicyStamp_2();
  let pluginLoadCacheOnly = pluginRegistry.pluginLoadCacheOnly;
  return (
    (stamp !== EMPTY_POLICY_STAMP &&
    pluginLoadCacheOnly !== undefined &&
    pluginRegistry.pluginLoadMarks.get(pluginLoadCacheOnly) === stamp
      ? pluginLoadCacheOnly
      : undefined) ?? reloadCacheOnlyUnder(stamp, storageV5)
  );
}
//@ chunk-5xgkngpb.js:4727345-4727637 placement
function reloadCacheOnlyUnder(stamp, storageV5) {
  let pluginRegistry = getPluginRegistry();
  let pluginLoad = pluginRegistry.pluginLoad;
  if (!(
    stamp !== EMPTY_POLICY_STAMP &&
    pluginLoad !== undefined &&
    pluginRegistry.pluginLoadMarks.get(pluginLoad) === stamp
  )) {
    pluginRegistry.pluginLoad = undefined;
    pluginRegistry.pluginLoadArm = undefined;
  }
  let load = trackPluginLoad(
    assemblePluginLoadResult(() => loadPluginsFromMarketplaces(cacheOnlyLoadOptions(storageV5)), {
      storageV5,
      readUnder: stamp,
    }),
  );
  pluginRegistry.pluginLoadMarks.set(load, stamp);
  pluginRegistry.pluginLoadCacheOnlyArm = getLoadArm(storageV5);
  pluginRegistry.pluginLoadCacheOnly = load;
  return load;
}
//@ chunk-5xgkngpb.js:4727637-4727762 placement
/**
 * 预览模式加载（cacheOnly + preview，不产生副作用、不写缓存），供 /plugin 界面等展示用。
 */
async function loadAllPluginsForPreview(storageV5) {
  return assemblePluginLoadResult(
    () =>
      loadPluginsFromMarketplaces({
        cacheOnly: true,
        preview: true,
        storageV5,
        credentials: undefined,
      }),
    {
      preview: true,
      storageV5,
    },
  );
}
//@ chunk-5xgkngpb.js:4727762-4727775 placement
var BIN_STAT_TIMEOUT_MS = 2000;
//@ chunk-5xgkngpb.js:4727775-4728319 placement
/**
 * 收集已启用（非内置）插件的 bin/ 目录（stat 超时 2 秒，含 shell 元字符的路径丢弃），用于加进 Bash 工具的 PATH。
 */
async function getEnabledPluginBinPaths(storageV5) {
  let { enabled } = await loadAllPluginsCacheOnly(storageV5);
  let filtered = enabled
    .filter((plugin) => !plugin.isBuiltin && plugin.path)
    .map((plugin) => join(plugin.path, "bin"))
    .filter((binPath) => {
      if (sep !== "\\" && /[:"'$`\\\n\r]/.test(binPath)) {
        logForDebugging(`Dropping plugin bin path with shell metacharacters: ${binPath}`);
        return false;
      }
      return true;
    });
  let results = await Promise.all(
    filtered.map(async (binPath) => {
      try {
        return (
          await withTimeout_2(
            stat_2(binPath),
            BIN_STAT_TIMEOUT_MS,
            `stat timed out after ${BIN_STAT_TIMEOUT_MS}ms`,
          )
        ).isDirectory();
      } catch (error) {
        let errnoCode = getErrnoCode(error);
        if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return false;
        logForDebugging(
          `Keeping plugin bin path on PATH despite a failed stat (${errnoCode ?? errorMessage(error)}): ${binPath}`,
        );
        return true;
      }
    }),
  );
  return filtered.filter((binPath, index) => results[index]);
}
//@ chunk-5xgkngpb.js:4728319-4728612 layout
async function listSyncedPluginDirs_2() {
  let empty = {
    dirs: [],
    rows: [],
  };
  try {
    if (!hasSyncedContent() || !syncSettingsEnabled() || isPluginsSyncVetoed()) return empty;
    markSyncedPluginLaneOpened();
    let registered = hasRegisteredSyncedPluginDirs() ? await getRegisteredSyncedDirs() : null;
    let rows =
      registered === null
        ? await listSyncedPluginDirs()
        : registered.flatMap((dir) => {
            let syncedPluginRowId = getSyncedPluginRowId(dir);
            return syncedPluginRowId === undefined
              ? []
              : [
                  {
                    dir,
                    pluginId: syncedPluginRowId,
                  },
                ];
          });
    let dirs = registered ?? rows.map(({ dir }) => dir);
    markSyncedPluginDirsLoadedHere(dirs);
    return {
      dirs,
      rows,
    };
  } catch (error) {
    logError(error);
    return empty;
  }
}
//@ chunk-5xgkngpb.js:4728612-4728873 layout
function describeSyncedPluginOutcomes(input) {
  try {
    let byKey = mapSyncedDirsToPluginIds(input.manifestRows);
    let mergedSet = new Set(input.merged);
    return input.synced.map((plugin) => {
      let parentDir = dirname(plugin.path);
      let pluginId = byKey.get(skillKeyFromPath(parentDir, plugin.path));
      return {
        bucket: basename(parentDir),
        outcome: classifySyncedPluginOutcome(plugin, mergedSet, input),
        pluginName: plugin.name,
        folder: plugin.path,
        ...(pluginId !== undefined && {
          pluginId,
        }),
      };
    });
  } catch (error) {
    logError(error);
    return null;
  }
}
//@ chunk-5xgkngpb.js:4728873-4729433 layout
function classifySyncedPluginOutcome(plugin, mergedSet, context) {
  let policyMatch = matchPolicyPluginEntry(
    context.managedEntries,
    plugin.name,
    plugin.attributedMarketplaceName,
  );
  if (policyMatch.outcome === "locked") return policyMatch.entry.enabled ? "not_loaded" : "held_back";
  if (!mergedSet.has(plugin) || context.demoted.has(plugin.source)) return "not_loaded";
  if (plugin.enabled) return "loaded";
  let records = context.enabledPluginsIndexed.map((settingsEntry, index) => {
    let source = context.sourcesHighFirst[index];
    return settingsEntry !== undefined && source !== undefined && isOperatorSettingSource_2(source)
      ? settingsEntry
      : undefined;
  });
  let pluginSetting = findPluginSetting(plugin.source, records);
  if (pluginSetting !== undefined && records[pluginSetting.index]?.record[pluginSetting.key] === false)
    return "held_back";
  if (policyMatch.outcome !== "admitted") return "not_loaded";
  return collectDisabledInlineNames(records, context.sourcesHighFirst).has(nfcLower(plugin.name))
    ? "held_back"
    : "not_loaded";
}
//@ chunk-5xgkngpb.js:4729433-4729596 layout
function mapSyncedDirsToPluginIds(manifestRows) {
  let byKey = new Map();
  let seenKeys = new Set();
  for (let { dir, pluginId } of manifestRows) {
    let key = skillKeyFromPath(dirname(dir), dir);
    if (seenKeys.has(key)) {
      byKey.delete(key);
      continue;
    }
    seenKeys.add(key);
    if (isServerPluginId(pluginId)) byKey.set(key, pluginId);
  }
  return byKey;
}
//@ chunk-5xgkngpb.js:4729596-4729833 layout
function collectOfficialAttestations_2(allPlugins) {
  let bySource = new Map();
  let conflicting = new Set();
  for (let plugin of allPlugins) {
    let marketplace = plugin.officialAttestation?.marketplace;
    if (
      marketplace === undefined ||
      !ALLOWED_OFFICIAL_MARKETPLACE_NAMES.has(marketplace) ||
      (bySource.has(plugin.source) && bySource.get(plugin.source) !== marketplace)
    )
      conflicting.add(plugin.source);
    else bySource.set(plugin.source, marketplace);
  }
  for (let source of conflicting) bySource.delete(source);
  return bySource;
}
//@ chunk-5xgkngpb.js:4729833-4732788 fingerprint (2.1.88 match: assemblePluginLoadResult, 0.338)
/**
 * 插件加载总装：并行跑市场加载、会话插件（--plugin-dir/--plugin-url）、claude.ai 同步插件、skills-dir 插件，再合并内置插件，mergePluginSources 去重，verifyAndDemote 处理依赖不满足的降级，最后（非预览且设置未变时）执行副作用：缓存插件 settings、清理旧缓存等。返回 {enabled, disabled, errors, warnings}。
 */
async function assemblePluginLoadResult(loadMarketplacePlugins, options) {
  let readUnder = options?.readUnder ?? managedHooksPolicyStamp_2();
  let inlinePlugins = getOriginalCwdOrNull();
  let builtinResult = areSideloadFlagsDisabledByPolicy();
  if (
    builtinResult &&
    (getInlinePlugins().length > 0 || getInlinePluginsNoMcp().length > 0 || getInlinePluginUrls().length > 0)
  )
    logForDebugging(
      `disableSideloadFlags: dropping @inline plugin specs at load time (parse-site gate should have caught this earlier): ${sideloadFlagsBlockedMessage(["--plugin-dir", "--plugin-url"])}`,
      {
        level: "warn",
      },
    );
  let inlineSpecs = builtinResult
    ? []
    : [
        ...getInlinePlugins().map((value) => ({
          kind: "path",
          value,
        })),
        ...getInlinePluginsNoMcp().map((value) => ({
          kind: "path",
          value,
          skipMcpDiscovery: true,
        })),
        ...getInlinePluginUrls().map((value) => ({
          kind: "url",
          value,
        })),
      ];
  let enabledPluginsBySource = getEnabledPluginsBySource();
  let flagCheck = checkHooksModulesFlag();
  let [marketplacePlugins, sessionResult, syncedResult, skillsAsPlugins] = await Promise.all([
    loadMarketplacePlugins(),
    describePluginDirShape_2(inlineSpecs).then((specs) =>
      loadSessionOnlyPlugins(specs, {
        storageV5: options?.storageV5,
        enabledPluginsIndexed: enabledPluginsBySource,
        preview: options?.preview,
      }),
    ),
    listSyncedPluginDirs_2().then(async ({ dirs, rows }) => ({
      ...(await loadSessionOnlyPlugins(
        dirs.map((dir) => ({
          kind: "path",
          value: dir,
          attestation: getSyncedPluginAttestation(dir),
        })),
        {
          marketplaceName: SYNCED,
          storageV5: options?.storageV5,
          enabledPluginsIndexed: enabledPluginsBySource,
          preview: options?.preview,
        },
      )),
      manifestRows: rows,
    })),
    loadSkillsAsPlugins(options?.storageV5, enabledPluginsBySource),
  ]);
  await flagCheck;
  let builtinPlugins = getBuiltinPlugins();
  let managedEntries = getPolicyEnabledPluginEntries();
  let sourcesHighFirst = settingsSourcesReversed();
  let recordedDisableFolds = collectDisabledInlineNames(enabledPluginsBySource, sourcesHighFirst);
  let {
    plugins: allPlugins,
    errors: mergeErrors,
    warnings,
  } = mergePluginSources({
    session: sessionResult.plugins,
    marketplace: marketplacePlugins.plugins,
    skill: skillsAsPlugins.plugins,
    synced: syncedResult.plugins,
    builtin: [...builtinPlugins.enabled, ...builtinPlugins.disabled],
    managedEntries,
    managedHooksOnly: shouldAllowManagedHooksOnlyByPolicy(),
    recordedDisableFolds,
  });
  let syncedSkillOverrides = collectSyncedSkillOverrides({
    merged: allPlugins,
    synced: syncedResult.plugins,
    pluginIdOf: () => {
      let idsByKey = mapSyncedDirsToPluginIds(syncedResult.manifestRows);
      return (plugin) => idsByKey.get(skillKeyFromPath(dirname(plugin.path), plugin.path));
    },
    enabledPluginsIndexed: enabledPluginsBySource,
    sourcesHighFirst,
  });
  let overrideResult =
    syncedSkillOverrides === null
      ? {
          held: [],
          toWrite: [],
          following: [],
        }
      : await syncedSkillOverrides;
  for (let plugin of overrideResult.held) plugin.enabled = false;
  for (let plugin of overrideResult.following) plugin.followsSyncedSkillState = true;
  let errors = [
    ...marketplacePlugins.errors,
    ...sessionResult.errors,
    ...syncedResult.errors,
    ...skillsAsPlugins.errors,
    ...mergeErrors,
  ];
  let warnings_2 = [
    ...marketplacePlugins.warnings,
    ...sessionResult.warnings,
    ...syncedResult.warnings,
    ...skillsAsPlugins.warnings,
    ...warnings,
  ];
  let { demoted, errors: depErrors } = verifyAndDemote(allPlugins);
  for (let plugin of allPlugins) if (demoted.has(plugin.source)) plugin.enabled = false;
  errors.push(...depErrors);
  let enabledPlugins = allPlugins.filter((plugin) => plugin.enabled);
  logForDebugging(
    `Found ${allPlugins.length} plugins (${enabledPlugins.length} enabled, ${allPlugins.length - enabledPlugins.length} disabled)`,
  );
  if (options?.preview);
  else if (inlinePlugins !== getOriginalCwdOrNull())
    logForDebugging(
      "assemblePluginLoadResult: originalCwd changed mid-scan; skipping side-effects (stale early-kick)",
    );
  else if (readUnder !== managedHooksPolicyStamp_2()) {
    logForDebugging(
      "assemblePluginLoadResult: plugin-affecting settings changed mid-scan; skipping side-effects, answering with a read under the settings in force",
    );
    return rereadPluginsCacheOnly(options?.storageV5);
  } else {
    setAttestedOfficialPluginIds(collectOfficialAttestations_2(allPlugins));
    setLastSyncedLaneLoad(
      describeSyncedPluginOutcomes({
        synced: syncedResult.plugins,
        merged: allPlugins,
        demoted,
        managedEntries,
        enabledPluginsIndexed: enabledPluginsBySource,
        sourcesHighFirst,
        manifestRows: syncedResult.manifestRows,
      }),
    );
    persistSyncedPluginsOff(overrideResult.toWrite, managedHooksPolicyStamp_2);
    let enabledSources = new Set(enabledPlugins.map((enabledPlugin) => enabledPlugin.source));
    for (let override of findUserDisabledOverrides())
      if (enabledSources.has(override.pluginId))
        warnings_2.push({
          type: "ineffective-disable",
          source: override.pluginId,
          overriddenBy: override.overriddenBy,
        });
    releaseUnusedPluginCaches(enabledPlugins, options?.storageV5);
    cachePluginSettings(enabledPlugins);
    if (errors.length > 0 && allPlugins.length === 0) {
      let dominantType = "generic-error";
      let dominantCount = 0;
      let counts = new Map();
      for (let error of errors) {
        let count = (counts.get(error.type) ?? 0) + 1;
        counts.set(error.type, count);
        if (count > dominantCount || (count === dominantCount && error.type < dominantType)) {
          dominantType = error.type;
          dominantCount = count;
        }
      }
      logFeatureBad("plugin_load_all", `plugin_load_total_failure_${dominantType.replaceAll("-", "_")}`, {
        error_count: errors.length,
      });
    } else if (errors.length > 0) logFeatureSad("plugin_load_all", "plugin_load_partial_failures");
    else logFeatureOk("plugin_load_all");
  }
  return {
    enabled: enabledPlugins,
    disabled: allPlugins.filter((plugin) => !plugin.enabled),
    errors,
    warnings: warnings_2,
    readUnder,
  };
}
//@ chunk-5xgkngpb.js:4732788-4733016 layout (2.1.88 match: getVersionedZipCachePath, 1)
async function releaseUnusedPluginCaches(pluginId, version) {
  if (isDiskless()) return;
  let cacheRoot = anchoredPluginCachePath();
  let syncedRoot = syncedPluginsRoot();
  let versionDirs = pluginId.flatMap((plugin) => {
    if (!plugin.path || plugin.path.endsWith(".zip")) return [];
    return isSubpathOf(cacheRoot, plugin.path, false) || isSubpathOf(syncedRoot, plugin.path, false)
      ? [plugin.path]
      : [];
  });
  await Promise.all(versionDirs.map((path) => writeInUseMarker(path, version)));
  await sweepInUseMarkers(versionDirs, version);
}
//@ chunk-5xgkngpb.js:4733016-4733086 placement
/**
 * 清理不再被会话使用的插件解压目录。
 */
async function releaseSyncedDirsNotIn(plugins, storageV5) {
  await releaseMarkersOutside(syncedPluginsRoot(), new Set(plugins.map((plugin) => plugin.path)), storageV5);
}
//@ chunk-5xgkngpb.js:4733086-4733320 placement (2.1.88 match: clearPluginCache, 0.483)
/**
 * 清空 loadAllPlugins/loadAllPluginsCacheOnly 的缓存 Promise（附原因日志），并清掉依赖插件列表的下游缓存；安装/卸载/刷新后调用。
 */
function clearPluginCache(reason) {
  if (reason) logForDebugging(`clearPluginCache: invalidating loadAllPlugins cache (${reason})`);
  let pluginRegistry = getPluginRegistry();
  pluginRegistry.pluginLoad = undefined;
  pluginRegistry.pluginLoadArm = undefined;
  pluginRegistry.pluginLoadCacheOnly = undefined;
  pluginRegistry.pluginLoadCacheOnlyArm = undefined;
  clearCommandIds();
  if (pluginCommandBase() !== undefined) invalidateCommandNames();
  clearPluginCommandBase();
}
//@ chunk-5xgkngpb.js:4733320-4733530 placement
/**
 * 存储后端模式下预先发起一次 cacheOnly 加载以填充缓存；失败则清掉缓存。
 */
function refillPluginLoadCacheOnly(storageV5, label) {
  if (
    !isStorageV5Enabled() ||
    storageV5 === undefined ||
    env.CLAUDE_CODE_SYNC_PLUGIN_INSTALL ||
    getPluginRegistry().pluginLoadCacheOnly !== undefined
  )
    return;
  let allPluginsCacheOnly = loadAllPluginsCacheOnly(storageV5);
  allPluginsCacheOnly.catch(() => {
    if (getPluginRegistry().pluginLoadCacheOnly === allPluginsCacheOnly)
      clearPluginCache(`${label}: re-fill failed`);
  });
  return allPluginsCacheOnly;
}
//@ chunk-5xgkngpb.js:4733530-4733757 fingerprint (2.1.88 match: mergePluginSettings, 1)
function mergePluginSettings(plugins) {
  let merged;
  for (let plugin of plugins) {
    if (!plugin.settings) continue;
    if (!merged) merged = {};
    for (let [key, value] of Object.entries(plugin.settings)) {
      if (key in merged)
        logForDebugging(
          `Plugin "${plugin.name}" overrides setting "${key}" (previously set by another plugin)`,
        );
      merged[key] = value;
    }
  }
  return merged;
}
//@ chunk-5xgkngpb.js:4733757-4734006 fingerprint (2.1.88 match: cachePluginSettings, 0.667)
function cachePluginSettings(plugins) {
  let settings = mergePluginSettings(plugins);
  let hadSettings = Object.keys(pluginCommandBase() ?? {}).length > 0;
  setPluginCommandBase(settings);
  if (settings && Object.keys(settings).length > 0) {
    invalidateCommandNames();
    logForDebugging(`Cached plugin settings with keys: ${Object.keys(settings).join(", ")}`);
  } else if (hadSettings) {
    invalidateCommandNames();
    logForDebugging("Dropped plugin settings: no enabled plugin supplies any");
  }
}
//@ chunk-5xgkngpb.js:4734006-4734113 sole-consumer
function findMatchingSourceCommand(source, installations) {
  if (!source) return;
  let mode = describeCommandOutputMode(source);
  return (
    installations &&
    filterInstallationsForCurrentProject(installations).find(
      (installation) => installation.sourceCommand === mode,
    )
  )?.sourceCommand;
}
//@ chunk-4hx0rq5z.js:4002-4203 fingerprint (2.1.88 match: validateGitUrl, 0.458)
/**
 * 判断 URL 类型：file（本机）、hosted（官方地址）、custom_url（其他 http(s)）。
 */
function validateGitUrl(url) {
  if (url.protocol === "file:")
    return url.hostname === "" || url.hostname === "localhost" ? "file" : undefined;
  if (url.protocol !== "https:" && url.protocol !== "http:") return;
  return url.toString() === _ ? "hosted" : "custom_url";
}
//@ chunk-0yw3taqg.js:197589-197650 fingerprint (2.1.88 match: loadAllPluginsCacheOnly, 0.661)
function loadAllPluginsCacheOnly_2() {
  return !env.CLAUDE_CODE_SYNC_PLUGIN_INSTALL && isRemoteCowork();
}
//@ chunk-6vxyfwtv.js:24675-25104 fingerprint (2.1.88 match: copyDir, 0.664)
/**
 * 递归复制目录（带缓存的目录创建）。
 */
async function copyDir_2(root) {
  let cache = new Map();
  let listDir = async (dir) => {
    let cached = cache.get(dir);
    if (cached !== undefined) return cached;
    let entries = await readdir(dir, {
      withFileTypes: true,
    }).catch(() => []);
    cache.set(dir, entries);
    return entries;
  };
  for (let relPath of manifestRelativePath) {
    let parts = relPath.split("/");
    let baseName = parts.pop() ?? "";
    let current = root;
    for (let entry of parts) {
      current =
        (await listDir(current)).some(
          (childEntry) => childEntry.name === entry && childEntry.isDirectory(),
        ) && !(await buildSecretScanResult(pathModule.join(current, entry)))
          ? pathModule.join(current, entry)
          : undefined;
      if (current === undefined) break;
    }
    if (
      current !== undefined &&
      (await listDir(current)).some((entry) => entry.name === baseName && entry.isSymbolicLink())
    )
      return relPath;
  }
  return;
}
//@ chunk-b08ck61p.js:20490-20743 fingerprint (2.1.88 match: loadPluginFromMarketplaceEntryCacheOnly, 0.344)
/**
 * 从一次 cacheOnly 加载结果中找出缓存缺失的启用插件，供后台补装。
 */
function loadPluginFromMarketplaceEntryCacheOnly({ enabled, errors }, rootPlugins) {
  let knownNames = new Set(enabled.flatMap(pluginNameAliases).map(nfcLower));
  let cacheMissIds = new Set();
  for (let error of errors) if (error.type === "plugin-cache-miss") cacheMissIds.add(error.source);
  let missing = new Set();
  for (let plugin of rootPlugins?.enabled ?? [])
    if (cacheMissIds.has(plugin.source) && !knownNames.has(nfcLower(plugin.name))) missing.add(plugin.source);
  return missing;
}
export {
  loadAllPluginsCacheOnly,
  loadAllPluginsCacheOnly_2,
  clearPluginCache,
  shouldFillPluginLoadWithStore,
  syncedPluginFolderId,
  hasMarketplaceBackedPlugins,
  loadAllPlugins,
  releaseSyncedDirsNotIn,
  loadAllPluginsForPreview,
  validateGitUrl,
  refillPluginLoadCacheOnly,
  getEnabledPluginBinPaths,
  anchoredPluginCachePath,
  orphanMarkerCoordsV5,
  evictCachedVersionDir,
  githubRepoToCloneUrl,
  resolveWithinDir,
  mapStringsDeep,
  truncateListItem,
  quotedListItem,
  formatFailureDetails_2,
  rereadPluginsCacheOnly,
  createPluginFromPath,
  directoryPluginFallbackName,
  isZipPathCaseInsensitive,
  getVersionedCachePath,
  copyPluginToVersionedCache,
  strictCacheAddressable,
  versionParentContained,
  cacheDirHasPluginContentStrict,
  probeSeedForPlugin,
  buildNpmRegistryArgs,
  getPluginCacheDirIn,
  cachePlugin,
  entryDeclaresComponents,
  entryDeclaredComponentPaths,
  versionParentState,
  getVersionedZipCachePath,
  strictArchivePresent,
  requireVersionParentContained,
  unvouchBeforeDependencyStep,
  rescreenCachedPluginTree,
  removeFreshCopyUnlessInUse,
  unmarkBeforeArchiving,
  loadPluginManifest,
  copyDir,
  localCopyShadowingSynced,
  syncedPluginMintedName,
  cacheCopyDependencyGap,
  realPathInsideCache,
  GitNotAvailableError,
  GitHostFetchFailedError,
  clearOccupantForReplace,
  displaySkillsDirPath,
  copyDir_2,
  MANIFEST_IDENTITY_READ_RELPATHS,
  loadSkillsAsPlugins,
  loadPluginFromMarketplaceEntryCacheOnly,
};
