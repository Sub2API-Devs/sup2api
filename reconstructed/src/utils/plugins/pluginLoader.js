/**
 * utils/plugins/pluginLoader.ts
 *
 * 插件加载核心：版本化缓存（目录/zip、link 模式）、各来源下载（npm/git/github/git-subdir/archive/command）、manifest 解析、由目录构造插件对象、合并会话/市场/同步/内置插件，loadAllPlugins/loadAllPluginsCacheOnly 及其全局缓存。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/pluginLoader.ts
 * pieces: chunk-3wek6r2k.js (1), chunk-5aas12zq.js (1), chunk-9tyqgtn4.js (1), chunk-e6aww6q8.js (196), chunk-g6j7q15x.js (1)
 * attribution: fingerprint 22, placement 127, affinity 1, layout 44, file-local 2, callgraph-witnessed 2, callgraph-fingerprint 1, sole-consumer 1
 */
import * as pathModule from "path";
import { join, sep, relative, isAbsolute, parse, resolve as resolve_2, dirname, basename } from "path";
import {
  realpath,
  lstat,
  stat,
  readdir,
  rm as rm_2,
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
import { xr } from "../../../vendor/lodash-es/_inlinedHelpers.js";
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
import { isPlainObject as isPlainObject_5 } from "../isPlainObject.js";
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
import { u } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { pluginLinkSchema, thinkbackStorageKey } from "./pluginLinks.js";
import { hasDotSegmentAlias } from "../pathClassification.js";
import { isServerPluginId, getPluginAttribution } from "./pluginAttribution.js";
import { getPluginRegistry } from "./pluginLoadState.js";
import { stripInvisibleKeepEmoji, cleanOptionalText_2 } from "../settings/marketplaceSettingsAliases.js";
import { isLocalMarketplaceSource } from "./reconciler.js";
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
import { count } from "../collections.js";
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
import { manifestRelativePath } from "./validate/validatePluginDirectory.js";
import { _ } from "../../services/modelCatalog/publishedCatalog.js";

//@ chunk-e6aww6q8.js:606211-606381 placement
function mapStringsDeep(e, expandData) {
  if (typeof e === "string") return expandData(e);
  if (Array.isArray(e)) return e.map((r) => mapStringsDeep(r, expandData));
  if (typeof e === "object" && e !== null) return xr(e, (r) => mapStringsDeep(r, expandData));
  return e;
}
//@ chunk-e6aww6q8.js:606867-606884 placement
var MAX_LISTED_ITEMS = 5;
var MAX_QUOTED_ITEM_LENGTH = 40;
//@ chunk-e6aww6q8.js:606884-606953 placement
/**
 * truncateListItem：截断列表项并补省略号。
 */
function truncateListItem(e) {
  let n = escapeControlCharsForDisplay(e);
  return n.length <= MAX_QUOTED_ITEM_LENGTH ? n : `${truncateToLength(n, MAX_QUOTED_ITEM_LENGTH)}...`;
}
//@ chunk-e6aww6q8.js:606953-606988 placement
/**
 * quotedListItem：列表项加引号。
 */
function quotedListItem(e) {
  return `"${truncateListItem(e)}"`;
}
//@ chunk-e6aww6q8.js:606988-607082 placement = formatFailureDetails (0.777)
/**
 * 列表前 N 项用逗号连接，多余的写“and N more”。
 */
function formatFailureDetails_2(e) {
  let remaining = e.length - MAX_LISTED_ITEMS;
  return e.slice(0, MAX_LISTED_ITEMS).join(", ") + (remaining > 0 ? ` and ${remaining} more` : "");
}
//@ chunk-e6aww6q8.js:724353-724409 fingerprint = getVersionedZipCachePath (1)
/**
 * 路径是否以 .zip 结尾（忽略大小写）。
 */
function isZipPathCaseInsensitive(e) {
  return e.toLowerCase().endsWith(".zip");
}
//@ chunk-e6aww6q8.js:4324611-4324691 fingerprint = resolveGitSubdirUrl (0.712)
/**
 * GitHub owner/repo 转克隆 URL：偏好 HTTPS 时 https://github.com/x.git，否则 git@github.com:x.git。
 */
function githubRepoToCloneUrl(url) {
  return preferHttpsGitTransport() ? `https://github.com/${url}.git` : `git@${GITHUB_HOST}:${url}.git`;
}
//@ chunk-e6aww6q8.js:4391044-4391264 fingerprint = installFromNpm (0.359)
/**
 * 构造 npm 命令的 --registry 参数；作用域包另加 --@scope:registry。
 */
function buildNpmRegistryArgs(e, n) {
  if (!e.registry) return [];
  let packageSpec =
    n !== undefined && n.startsWith("@") && isValidNpmPackageNameLoose(n)
      ? n.slice(0, n.indexOf("/"))
      : undefined;
  return packageSpec === undefined
    ? ["--registry", e.registry]
    : ["--registry", e.registry, `--${packageSpec}:registry=${e.registry}`];
}
//@ chunk-e6aww6q8.js:4496936-4497084 placement = discoverSkillDirsForPaths (0.562)
/**
 * skill 显示路径：project 作用域且在 .claude/skills 下显示为 ./ 相对路径，否则缩写主目录。
 */
function displaySkillsDirPath(e) {
  if (e.scope === "project") {
    let skillDir = join(getOriginalCwd(), ".claude", "skills");
    if (e.path.startsWith(skillDir + sep)) return "." + sep + relative(getOriginalCwd(), e.path);
  }
  return tildify(e.path);
}
//@ chunk-e6aww6q8.js:4497084-4497119 placement
function pluginCacheDirPath() {
  return join(getPluginsDirectory(), PLUGIN_CACHE_DIRNAME);
}
//@ chunk-e6aww6q8.js:4497119-4497210 placement
function anchoredPluginCachePath() {
  let e = pluginCacheDirPath();
  return isAbsolute(e) && (sep === "/" || parse(e).root.length > 1)
    ? resolve_2(e)
    : resolve_2(getOriginalCwd(), e);
}
//@ chunk-e6aww6q8.js:4497210-4497267 placement
function orphanMarkerCoordsV5(e, n) {
  return isStorageV5Enabled() && n !== undefined ? parseVersionCachePath(e, anchoredPluginCachePath()) : null;
}
//@ chunk-e6aww6q8.js:4497267-4497344 placement
function strictCacheAddressable(e) {
  return (
    isStorageV5Enabled() &&
    e !== undefined &&
    parseVersionCachePath(join(anchoredPluginCachePath(), "_", "_", "_"), anchoredPluginCachePath()) !== null
  );
}
//@ chunk-e6aww6q8.js:4497344-4497395 placement
async function versionParentContained(cachePath) {
  return (await versionParentState(cachePath)) === "real";
}
//@ chunk-e6aww6q8.js:4497395-4497558 placement
function versionParentUnexaminableError(e, error) {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `Could not examine the plugin directory of ${e} (${errorMessage(error)}); retry the install.`,
    "plugin cache version parent could not be examined",
  );
}
//@ chunk-e6aww6q8.js:4497558-4497804 placement
async function isPlainPluginParentDir(e) {
  let n = anchoredPluginCachePath();
  let r = relative(n, e);
  let parts = r.split(sep);
  if (!r || isAbsolute(r) || parts.length !== 2 || parts.some((w) => w === "" || w === "." || w === ".."))
    return false;
  let [h, y] = parts;
  if (h === undefined || y === undefined) return false;
  let S = await realpath(n);
  return (await isPlainDirectory(join(S, h))) && (await isPlainDirectory(join(S, h, y)));
}
//@ chunk-e6aww6q8.js:4497804-4497999 placement
async function isPlainDirectory(e) {
  if ((await lstat(e)).isDirectory() && (await isSameFilesystem(dirname(e), basename(e)))) return true;
  let r = await stat(e).catch((error) => {
    if (isPathAbsent(error) || getErrnoCode(error) === "ELOOP") return null;
    throw error;
  });
  return r !== null && r.isDirectory();
}
//@ chunk-e6aww6q8.js:4497999-4498693 placement
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
//@ chunk-e6aww6q8.js:4498693-4499051 placement
async function requireVersionParentContained(e, pluginId, version, s, h, y) {
  if (y === undefined && (await versionParentState(e)) === "real") return;
  let S = `Could not ${s} ${pluginId} ${version}: its plugin directory is not a directory (a dangling link, or a file wearing the marketplace or plugin folder name); make it a directory, or retry the install if it was being moved.`;
  throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    S,
    CONTAINMENT_FAILURE_MESSAGES[h] ?? "plugin cache version parent not contained",
  );
}
//@ chunk-e6aww6q8.js:4499051-4499167 placement
async function versionParentState(e) {
  try {
    return (await isPlainPluginParentDir(dirname(e))) ? "real" : "refused";
  } catch (error) {
    if (isPathAbsent(error)) return "absent";
    throw versionParentUnexaminableError(e, error);
  }
}
//@ chunk-e6aww6q8.js:4499167-4499324 placement
function getPluginCachePath(cachePath, pluginId, version, s = "cache") {
  return versionPathOccupantError(
    `Could not ${s} ${pluginId} ${version}: what occupies its cache path ${cachePath} could not be examined; retry the load or the install.`,
  );
}
//@ chunk-e6aww6q8.js:4499324-4499869 placement
/**
 * 缓存/归档路径上的残留链接删不掉时抛错。
 */
async function removeStrayLinkOrThrow(e, n, r, s, h) {
  if ((await removePathEntry(e).catch(() => "directory")) !== "directory") return;
  if (h === "archive")
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Could not ${s} ${n} ${r}: a link sits at its archive path and could not be removed; remove that link from the plugin cache, then retry the install.`,
      "plugin cache stray link at the archive path not removable",
    );
  throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `Could not ${s} ${n} ${r}: a link sits at its cache path and could not be removed; remove that link from the plugin cache, then retry the install.`,
    "plugin cache stray link not removable before replace",
  );
}
//@ chunk-e6aww6q8.js:4499869-4500162 placement
async function clearOccupantForReplace(cachePath, pluginId, version, s = "cache") {
  switch (await classifyCacheEntry(cachePath)) {
    case "absent":
      return "done";
    case "other":
      return "recurse";
    case "symlink":
      await removeStrayLinkOrThrow(cachePath, pluginId, version, s, "cache");
      logForDebugging(
        `Plugin ${pluginId} version ${version}: removed a link at its cache path ${cachePath} as an entry before replacing it`,
      );
      return "done";
    default:
      throw getPluginCachePath(cachePath, pluginId, version, s);
  }
}
//@ chunk-e6aww6q8.js:4500162-4500507 placement
async function strictArchivePresent(e, n, r, s) {
  switch (await classifyCacheEntry(e)) {
    case "absent":
      return false;
    case "other":
      return true;
    case "symlink":
      await s();
      await removeStrayLinkOrThrow(e, n, r, "cache", "archive");
      logForDebugging(
        `Plugin ${n} version ${r}: removed a link wearing its archive's name at ${e}; it is never served \u2014 the archive is rebuilt or the cached directory used`,
      );
      return false;
    default:
      throw getPluginCachePath(e, n, r);
  }
}
//@ chunk-e6aww6q8.js:4500507-4500596 placement
async function isCacheDirReusable(e) {
  return (
    (await isCachePathClean(e)) &&
    (await dirHasPluginRoot(e)) &&
    (await hasRealEntries(e, {
      whenUnreadable: false,
    }))
  );
}
//@ chunk-e6aww6q8.js:4500596-4500858 placement
async function decideCachedVersionReuse(cachePath, pluginId, version, linkFarm, sourcePath) {
  let y = await classifyCacheEntry(cachePath);
  if (y === "absent") return "absent";
  if (y === "unexaminable") throw getPluginCachePath(cachePath, pluginId, version);
  if (y === "symlink") return (await isCacheDirReusable(cachePath)) ? "serve" : "republish";
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
//@ chunk-e6aww6q8.js:4500858-4501029 placement
async function isStagedTreeIntact(e) {
  try {
    if (!(await lstat(e)).isDirectory()) return false;
    let r = dirname(e);
    let [s, h] = await Promise.all([realpath(e), realpath(r)]);
    return s === join(h, basename(e)) && (await isPlainPluginParentDir(r));
  } catch {
    return false;
  }
}
//@ chunk-e6aww6q8.js:4501029-4501662 placement
/**
 * 暂存树被替换时按阶段（install/publish/archive）抛错。
 */
async function assertStagedTreeIntact(e, pluginId, version, s) {
  if (await isStagedTreeIntact(e)) return;
  if (s === "install")
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Could not install dependencies for ${pluginId} ${version}: its staged tree was replaced after the copy; retry the load or the install.`,
      "plugin cache staged tree swapped before dependency install",
    );
  if (s === "publish")
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Could not publish ${pluginId} ${version}: its staged tree was replaced before publishing; retry the load or the install.`,
      "plugin cache staged tree swapped before publishing",
    );
  throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `Could not archive ${pluginId} ${version}: its staged tree was replaced before archiving; retry the load or the install.`,
    "plugin cache staged tree swapped before archiving",
  );
}
//@ chunk-e6aww6q8.js:4501662-4501821 placement
async function isCachePathClean(cachePath) {
  try {
    let [n, r] = await Promise.all([realpath(anchoredPluginCachePath()), realpath(dirname(cachePath))]);
    return (
      (await resolveLinkChainFromParent(join(r, basename(cachePath)), createLinkTargetScreen(n), undefined, {
        trustedRoot: n,
      })) === "clean"
    );
  } catch {
    return false;
  }
}
//@ chunk-e6aww6q8.js:4501821-4502215 placement
/**
 * 版本目录是缓存下的普通目录时返回其真实路径。
 */
async function resolvePlainVersionDir(e) {
  let n = relative(anchoredPluginCachePath(), e);
  let parts = n.split(sep);
  if (!n || isAbsolute(n) || parts.length !== 3 || parts.some((s) => s === "" || s === "." || s === ".."))
    return null;
  try {
    if (!(await isPlainPluginParentDir(dirname(e)))) return null;
    if (!(await lstat(e)).isDirectory() || !(await isSameFilesystem(dirname(e), basename(e)))) return null;
    let [h, y, S] = await Promise.all([
      realpath(e),
      realpath(dirname(e)),
      realpath(anchoredPluginCachePath()),
    ]);
    if (h === S || isPathUnder(S, h)) return null;
    return h === join(y, basename(e)) ? h : null;
  } catch (error) {
    if (isPathAbsent(error)) return null;
    throw error;
  }
}
//@ chunk-e6aww6q8.js:4502215-4502802 placement
/**
 * 严格安装步骤前确认版本目录仍是普通目录。
 */
async function requirePlainVersionDir(e, n) {
  let r;
  try {
    r = await resolvePlainVersionDir(e);
  } catch (error) {
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Could not prepare ${e} for its ${n} (it could not be examined: ${errorMessage(error)}); retry the install.`,
      "plugin cache version directory could not be examined before a strict install step",
    );
  }
  if (r === null && parseVersionCachePath(e, anchoredPluginCachePath()) !== null)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Could not prepare ${e} for its ${n}: it is no longer a plain version directory under its marketplace and plugin directories inside the plugin cache (it was removed or replaced after the copy); retry the install.`,
      "plugin cache version directory replaced before a strict install step",
    );
  return r;
}
//@ chunk-e6aww6q8.js:4502802-4503547 placement
async function unvouchBeforeDependencyStep(e, n, { staged: r = false } = {}) {
  if (!strictCacheAddressable(n)) return;
  if ((await requirePlainVersionDir(e, "dependency install")) === null) {
    logForDebugging(
      `Plugin cache: ${e} is not a version directory inside the plugin cache; its dependency step runs without a liveness record or vouch withdrawal`,
      {
        level: "warn",
      },
    );
    return;
  }
  if (!r && !(await writeInUseMarker(e, n)))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Could not prepare ${e} for its dependency install (this session could not be recorded as its user); retry the install.`,
      "plugin cache liveness record could not be written before dependency install",
    );
  if (await withdrawScreenMarker(e)) return;
  throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `Could not prepare ${e} for its dependency install (the conversion marker could not be withdrawn); retry the install.`,
    "plugin cache conversion marker could not be withdrawn before dependency install",
  );
}
//@ chunk-e6aww6q8.js:4503547-4504323 placement
async function unmarkBeforeArchiving(e, n, { staged: r = false } = {}) {
  if (!strictCacheAddressable(n) || r) return true;
  let s = await resolvePlainVersionDir(e).catch(() => null);
  if (s === null) {
    logForDebugging(
      `Plugin cache: ${e} is left as a directory this time (fully usable): it is not a version directory inside the plugin cache`,
      {
        level: "warn",
      },
    );
    return false;
  }
  if (await isPluginVersionInUseSafe(e, n)) {
    logForDebugging(
      `Plugin cache: ${e} is left as a directory this time (fully usable): another session is using it`,
    );
    return false;
  }
  if ((await realpath(e).catch(() => null)) !== s) {
    logForDebugging(
      `Plugin cache: ${e} is left as a directory this time: it moved while its users were probed`,
      {
        level: "warn",
      },
    );
    return false;
  }
  if (!(await removeInUseMarker(e, n))) {
    logForDebugging(
      `Plugin cache: ${e} is left as a directory this time (fully usable): this session's liveness record in it could not be withdrawn \u2014 it is never archived with one inside`,
      {
        level: "warn",
      },
    );
    return false;
  }
  return true;
}
//@ chunk-e6aww6q8.js:4504323-4504804 placement
async function removeFreshCopyUnlessInUse(e, n) {
  if (!strictCacheAddressable(n)) return;
  let r = await resolvePlainVersionDir(e).catch(() => null);
  if (r === null) return;
  let s = await realpath(anchoredPluginCachePath()).catch(() => null);
  if (s === null || r === s || !isPathUnder(r, s)) {
    logForDebugging(`Cache at ${e} left in place after the failed install: it lies outside the plugin cache`);
    return;
  }
  if ((await isPluginVersionInUseSafe(e, n)) || (await realpath(e).catch(() => null)) !== r) {
    logForDebugging(
      `Cache at ${e} left in place after the failed install: another session is using it, liveness could not be determined, or it moved`,
    );
    return;
  }
  await removeDirectoryTreeNoFollow_2(r).catch(() => {});
}
//@ chunk-e6aww6q8.js:4504804-4505997 placement
async function rescreenCachedPluginTree(e, n) {
  if (!strictCacheAddressable(n)) return;
  let r = await requirePlainVersionDir(e, "post-install screen");
  if (r === null) {
    logForDebugging(
      `Plugin cache: post-install screen of ${e} not run: it is not a version directory inside the plugin cache`,
      {
        level: "warn",
      },
    );
    return;
  }
  if (!(await withdrawScreenMarker(e)))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Could not re-screen ${e} after its dependency install (the conversion marker could not be withdrawn); retry the install.`,
      "plugin cache conversion marker could not be withdrawn before the post-install screen",
    );
  if (await isPluginVersionInUseSafe(e, n)) {
    logForDebugging(
      `Plugin cache: post-install screen of ${e} left to a later load: another session is using it (or liveness could not be determined)`,
    );
    return;
  }
  if ((await realpath(e).catch(() => null)) !== r) {
    logForDebugging(
      `Plugin cache: post-install screen of ${e} left to a later load: the directory moved while its liveness was probed`,
    );
    return;
  }
  let h = await materializePluginLinks(e, copyDir, {
    mode: "migrate",
  }).catch((error) => {
    logForDebugging(`Plugin cache: post-install screen of ${e} failed: ${errorMessage(error)}`, {
      level: "warn",
    });
    return null;
  });
  if ((h === null || !h.vouched) && !(await withdrawScreenMarker(e)))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Could not vouch for ${e} after its dependency install, and the conversion marker could not be withdrawn; retry the install.`,
      "plugin cache conversion marker could not be withdrawn after the post-install screen",
    );
}
//@ chunk-e6aww6q8.js:4505997-4506216 placement
async function materializeCachedLinks(e, storageV5, linkFarm = false) {
  if (!strictCacheAddressable(storageV5)) return;
  if (linkFarm) {
    logForDebugging(`materializeLinks: ${e}: link-mode command source (used in place), not converted`);
    return;
  }
  await materializeVersionLinksOnce(e, anchoredPluginCachePath(), copyDir, storageV5, () =>
    isPluginVersionInUse(
      e,
      {
        refusedCountsAsLive: false,
      },
      storageV5,
    ).catch(() => true),
  );
}
//@ chunk-e6aww6q8.js:4506216-4506326 placement
function getLegacyCachePath(e, n, r) {
  let replaced = r.replace(/[^a-zA-Z0-9\-_.]/g, "-");
  if (replaced === "." || replaced === "..") replaced = "-";
  return join(getPluginCacheDirIn(e, n), replaced);
}
//@ chunk-e6aww6q8.js:4506326-4506435 placement
function getPluginCacheDirIn(e, n) {
  let { name: r, marketplace } = parsePluginIdentifier(n);
  return join(
    e,
    PLUGIN_CACHE_DIRNAME,
    sanitizePluginId(marketplace || "unknown"),
    marketplace === pluginManifestPathSchemas ? escapeNpmPackageForDir(r) : sanitizePluginId(r || n),
  );
}
//@ chunk-e6aww6q8.js:4506435-4506455 placement
var weakSet_7 = new WeakSet();
//@ chunk-e6aww6q8.js:4506455-4506493 placement = getVersionedCachePath (0)
/**
 * 版本化缓存目录 <plugins>/cache/<marketplace>/<plugin>/<version>。
 */
function getVersionedCachePath(pluginId, version) {
  return getLegacyCachePath(getPluginsDirectory(), pluginId, version);
}
//@ chunk-e6aww6q8.js:4506493-4506868 placement
/**
 * 通过 storageV5 存储后端读取插件缓存内的文件，返回 {outcome:"found",content}/"absent"/"error"；路径不在插件缓存内返回 null。
 */
async function readFileViaStorageBackend(e, n) {
  let r = cacheStorageKeyOrFallback(n, anchoredPluginCachePath());
  if (r === null) return null;
  let s = await e.read([r]);
  if (!s.ok) {
    let error = s.error;
    return {
      outcome: "error",
      detail: formatStorageError(error),
      telemetryCode:
        "telemetryCode" in error && typeof error.telemetryCode === "string" ? error.telemetryCode : undefined,
    };
  }
  let h = s.value.items[0];
  if (!h?.found)
    return {
      outcome: "absent",
    };
  return {
    outcome: "found",
    content: Buffer.from(h.value).toString("utf-8"),
  };
}
//@ chunk-e6aww6q8.js:4506868-4507100 placement
async function isCachePathPresentInStorage(e, n) {
  let r = cacheStorageKeyOrFallback(n, anchoredPluginCachePath());
  if (r === null) return null;
  let s = await e.statMeta(r);
  if (s.ok) return true;
  let telemetryCode =
    "telemetryCode" in s.error && typeof s.error.telemetryCode === "string"
      ? s.error.telemetryCode
      : undefined;
  return isNonRegularError(telemetryCode) ? null : false;
}
//@ chunk-e6aww6q8.js:4507100-4507190 placement
async function isCachePresent(e, fullPath) {
  let r = isStorageV5Enabled() && e !== undefined ? await isCachePathPresentInStorage(e, fullPath) : null;
  return r !== null ? r : pathExists(fullPath);
}
//@ chunk-e6aww6q8.js:4507190-4507585 placement
/**
 * 检查插件组件路径：present/absent/{unknown, errno}。
 */
async function probeComponentPath(e, n) {
  let r =
    isStorageV5Enabled() && e !== undefined ? cacheStorageKeyOrFallback(n, anchoredPluginCachePath()) : null;
  if (e !== undefined && r !== null) {
    let s = await e.statMeta(r);
    if (s.ok) return "present";
    let h = storageErrorCode(s.error);
    if (s.error.code === "NotFound" || h === "ENOENT" || h === "ENOTDIR") return "absent";
    if (!isNonRegularError(h))
      return {
        unknown: formatStorageError(s.error),
        errno: sanitizeErrnoForTelemetry({
          code: h,
        }),
      };
  }
  try {
    await stat(n);
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
//@ chunk-e6aww6q8.js:4507585-4507791 placement
function reportUncheckablePath(e, source, name, component, h, y) {
  logForDebugging(`Plugin ${name}: could not check ${h} (${y.unknown}); not loading it`, {
    level: "error",
  });
  e.push({
    type: "path-not-found",
    source,
    plugin: name,
    path: h,
    component,
    errno: y.errno ?? "UNKNOWN",
  });
}
//@ chunk-e6aww6q8.js:4507791-4508003 placement = _temp2 (1)
async function statPluginPath(e, fullPath) {
  let r = isStorageV5Enabled() && e !== undefined ? await isCachePathPresentInStorage(e, fullPath) : null;
  if (r !== null)
    return {
      exists: r,
      isDirectory: false,
    };
  try {
    return {
      exists: true,
      isDirectory: (await stat(fullPath)).isDirectory(),
    };
  } catch {
    return {
      exists: false,
      isDirectory: false,
    };
  }
}
//@ chunk-e6aww6q8.js:4508003-4508498 placement
/**
 * 缓存目录（或存储作用域）中是否有非忽略项。
 */
async function dirHasRealEntries(e, n, isCacheEntryName = isCacheSkipEntry) {
  let s = orphanMarkerCoordsV5(e, n);
  if (n !== undefined && s !== null) {
    let y = await listStorageScopeNames(n, {
      namespace: "pluginCache",
      marketplace: s.marketplace,
      plugin: s.plugin,
      version: s.version,
    });
    if (y.error !== undefined) {
      let error = y.error;
      if ("telemetryCode" in error && isFsInaccessibleCode(error.telemetryCode)) return false;
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Failed to list plugin cache dir: ${formatStorageError(error)}`,
        "failed to list plugin cache dir (v5 backend error)",
      );
    }
    return y.names.some(({ name: S }) => !isCacheEntryName(S));
  }
  let h;
  try {
    h = await readdir(e);
  } catch (error) {
    if (isFsInaccessible(error)) return false;
    throw error;
  }
  return h.some((y) => !isCacheEntryName(y));
}
//@ chunk-e6aww6q8.js:4508498-4508528 placement
var LINKS_MATERIALIZED_MARKER = ".links_materialized";
//@ chunk-e6aww6q8.js:4508528-4508701 placement
/**
 * 判断版本化缓存目录是否完整可用；storageV5 下若有 .links_materialized 标记则按链接已物化方式检查。
 */
async function cacheDirHasPluginContentStrict(e, n) {
  if (
    !isStorageV5Enabled() ||
    n === undefined ||
    parseVersionCachePath(e, anchoredPluginCachePath()) === null
  )
    return dirHasRealEntries(e);
  let r = await lstat(join(e, LINKS_MATERIALIZED_MARKER)).catch(() => null);
  return r !== null && r.isFile()
    ? dirHasRealEntries(e, n, isCacheEntryName)
    : dirHasRealEntries(e, undefined, isCacheEntryName);
}
//@ chunk-e6aww6q8.js:4508701-4508908 placement
async function removeCacheInUseMarker(cachePath, storageV5) {
  if (await isSymlinkOrFalse(cachePath)) return;
  let r = orphanMarkerCoordsV5(cachePath, storageV5);
  if (storageV5 !== undefined && r !== null) {
    await storageV5.delete(
      STORAGE_SPACES.pluginCache(r.marketplace, r.plugin, r.version, [ORPHAN_MARKER_FILE]),
    );
    return;
  }
  await rm_2(join(cachePath, ORPHAN_MARKER_FILE), {
    force: true,
  }).catch(() => {});
}
//@ chunk-e6aww6q8.js:4508908-4509239 placement
/**
 * 在一个插件的多个安装记录中挑第一个 installPath 可信且缓存存在的；都不存在时返回第一个可信的或第一条。
 */
async function pickUsableInstallation(installations, { storageV5: n, trustedRoots: r = [] } = {}) {
  let s = installations && filterInstallationsForCurrentProject(installations);
  if (!s || s.length === 0) return;
  if (s.length === 1) return s[0];
  let h;
  for (let y of s) {
    if (!y.installPath) continue;
    let { absolute, suspect } = classifyMarketplacePath(y.installPath, {
      trustedRoots: r,
    });
    if (suspect) continue;
    h ??= y;
    if (
      absolute.endsWith(".zip")
        ? await pathExists(absolute)
        : await cacheDirHasPluginContentStrict(absolute, n)
    )
      return y;
  }
  return h ?? s[0];
}
//@ chunk-e6aww6q8.js:4509239-4509280 placement = getVersionedZipCachePath (1)
/**
 * 版本化缓存的 zip 路径（目录路径 + .zip）。
 */
function getVersionedZipCachePath(pluginId, version) {
  return `${getVersionedCachePath(pluginId, version)}.zip`;
}
//@ chunk-e6aww6q8.js:4509280-4509388 placement
async function findSeedCachePath(e, n) {
  for (let r of getPluginSeedDirs()) {
    let legacyCachePath = getLegacyCachePath(r, e, n);
    try {
      if (await dirHasRealEntries(legacyCachePath)) return legacyCachePath;
    } catch {}
  }
  return null;
}
//@ chunk-e6aww6q8.js:4509388-4509485 placement = formatRelativeTimeAgo (0.75)
async function probeSeedForPlugin(pluginId, n, r) {
  return (
    (await findSeedCachePath(pluginId, n)) ??
    (r === "always" || n === "unknown" ? await probeSeedCacheAnyVersion(pluginId) : null)
  );
}
//@ chunk-e6aww6q8.js:4509485-4509693 placement
async function probeSeedCacheAnyVersion(pluginId) {
  for (let seedDir of getPluginSeedDirs()) {
    let pluginDir = dirname(getLegacyCachePath(seedDir, pluginId, "_"));
    try {
      let s = [];
      for (let h of await readdir(pluginDir)) {
        if (isTempSiblingName(h)) continue;
        let versionDir = join(pluginDir, h);
        if (await dirHasRealEntries(versionDir)) s.push(versionDir);
      }
      if (s.length === 1) return s[0];
    } catch {}
  }
  return null;
}
//@ chunk-e6aww6q8.js:4509693-4509732 placement
function isCommandSourceError(e) {
  return e instanceof CommandSourceError;
}
//@ chunk-e6aww6q8.js:4509732-4509805 placement
function commandSourceErrorMessage(error, n = redactUrlsInMessage) {
  return isCommandSourceError(error)
    ? n(
        printableMessage(error, {
          isComposed: isCommandSourceError,
        }),
      )
    : printableMessage(n(errorMessage(error)));
}
//@ chunk-e6aww6q8.js:4509805-4509824 placement
var MAX_MANIFEST_PROBLEMS = 20;
var MAX_PROBLEM_TEXT_LENGTH = 500;
//@ chunk-e6aww6q8.js:4509824-4510322 placement
/**
 * manifest 解析/校验错误转插件错误（脱敏、截断）。
 */
function manifestErrorToPluginError(error, source, r) {
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
        ...(r !== undefined && {
          plugin: r,
        }),
        manifestPath,
        parseError: mapped.join(", "),
      }
    : {
        type: "manifest-validation-error",
        source,
        ...(r !== undefined && {
          plugin: r,
        }),
        manifestPath,
        validationErrors: mapped,
        ...(error.errorClass === MANIFEST_ERROR_CLASSES.containment && {
          containmentRefused: true,
        }),
      };
}
//@ chunk-e6aww6q8.js:4510322-4510589 placement
async function classifyLinkFarmReuse(cachePath, sourcePath) {
  let r = await classifyLinkFarm(cachePath);
  if (r === "not-live")
    return {
      live: false,
      reusable: false,
      unclassifiable: false,
    };
  if (r === "unclassifiable")
    return {
      live: true,
      reusable: false,
      unclassifiable: true,
    };
  let linkFarmTarget = await readLinkFarmTarget(sourcePath);
  return {
    live: true,
    reusable: linkFarmTarget !== undefined && !(await hasEntriesOutsideTarget(cachePath, linkFarmTarget)),
    unclassifiable: false,
  };
}
//@ chunk-e6aww6q8.js:4510589-4510671 placement
async function isPluginVersionInUseSafe(e, n) {
  try {
    return await isPluginVersionInUse(
      e,
      {
        excludeSelf: true,
      },
      n,
    );
  } catch {
    return true;
  }
}
//@ chunk-e6aww6q8.js:4510671-4510744 placement
async function copyPluginDir(e, n, r, useStorageBackend) {
  await copyDir(e, n, e, n, r, useStorageBackend, new Set(), freshSymlinkCopyBudget(), false, false, true);
}
//@ chunk-e6aww6q8.js:4510744-4510950 placement = isRealPathWithinTeamDir (1)
async function lstatChildBigintOrUndefined(realCandidate) {
  for (let n of getPluginSeedDirs()) {
    let r = dirname(getLegacyCachePath(n, realCandidate, "_"));
    try {
      for (let s of await readdir(r)) {
        if (isTempSiblingName(s)) continue;
        if (await dirHasRealEntries(join(r, s))) return true;
      }
    } catch (error) {
      if (isENOENT(error) || getErrnoCode(error) === "ENOTDIR") continue;
      return true;
    }
  }
  return false;
}
//@ chunk-e6aww6q8.js:4510950-4514602 placement
async function copyDir(
  e,
  n,
  r = e,
  s = n,
  h = r,
  y = false,
  S = new Set(),
  w = freshSymlinkCopyBudget(),
  L = false,
  G = false,
  q = false,
) {
  if (y) await mkdir(n);
  else await getFsImplementation().mkdir(n);
  let Z = resolve_2(e);
  let Se = resolve_2(n);
  let ke = Se.startsWith(Z + sep) ? relative(Z, Se).split(sep)[0] : undefined;
  let we = await readdir(e, {
    withFileTypes: true,
  });
  let Ee;
  let Ae;
  let Ie;
  let Me = !L && resolve_2(e) === resolve_2(r);
  for (let We of we) {
    if (ke !== undefined && We.name === ke) continue;
    if (q && isPristineLinkFarm(We.name)) continue;
    let ze = await classifyDirEntry(e, We);
    if ((G || y) && We.isDirectory() && ze.isSymbolicLink)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Refusing to copy ${join(e, We.name)}: it is no longer a directory as listed \u2014 a link or Windows junction stands there (planted, or swapped during the copy). Plugin trees must hold plain directories.`,
        "plugin copy source directory entry is a link at descent",
      );
    let lt = join(e, We.name);
    let Je = join(n, We.name);
    if (y && Me && !isNodeModulesSegment(We.name) && isCacheEntryName(We.name)) {
      logForDebugging(`copyDir: not copying shipped cache bookkeeping ${lt}`);
      continue;
    }
    if (ze.isDirectory) {
      if (L) consumeSymlinkCopyBudget(w, 1, 0);
      if ((G || y) && !(await lstat(lt)).isDirectory())
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Refusing to copy ${lt}: it is no longer a directory (swapped during the copy).`,
          "plugin copy source directory swapped mid-copy",
        );
      if (y && getPlatform() === "windows") {
        Ee ??= await realpath(e);
        if (!(await isSameFilesystem(Ee, We.name)))
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `Refusing to copy ${lt}: it resolves somewhere other than its own name (a junction or mount point).`,
            "plugin copy source directory is a reparse point",
          );
      }
      await copyDir(lt, Je, r, s, h, y, S, w, L, G, false);
    } else if (ze.isFile) {
      if (y) {
        let nt = await lstat(lt);
        if (!nt.isFile()) throw fileSwappedError(lt);
        if (L) consumeSymlinkCopyBudget(w, 1, nt.size);
      }
      if (G)
        await copyFileNoFollow(lt, Je, {
          exclusive: y,
          nonBlocking: y,
        });
      else if (y) await copyFile(lt, Je, constants.COPYFILE_EXCL);
      else await copyFile(lt, Je);
    } else if (ze.isSymbolicLink) {
      let nt;
      try {
        nt = ze.linkTarget ?? (await readlink(lt));
      } catch (error) {
        if (getErrnoCode(error) !== "EINVAL")
          logForDebugging(`copyDir: readlink failed for ${lt}: ${errorMessage(error)}`, {
            level: "warn",
          });
        continue;
      }
      if (y) {
        Ae ??= await realpath(r).catch(() => resolve_2(r));
        Ie ??= createLinkTargetScreen(Ae);
        let It;
        try {
          It = await resolveLinkChainFromParent(join(Ae, relative(resolve_2(r), resolve_2(lt))), Ie, nt, {
            trustedRoot: Ae,
          });
        } catch (error) {
          It = "unexaminable";
          logForDebugging(`copyDir: cannot examine symlink ${lt}: ${errorMessage(error)}`, {
            level: "warn",
          });
        }
        if (It !== "clean") {
          logForDebugging(
            `copyDir: dropping symlink ${lt} -> ${nt} (${It === "network" ? "names a network host" : It === "loop" ? "symlink loop" : It === "unexaminable" ? "could not be examined" : It === "unsupported" ? "unsupported target spelling" : "dangling"})`,
            {
              level: It === "unexaminable" ? "warn" : "debug",
            },
          );
          continue;
        }
      } else if (resolvePathChain(lt, h)) {
        logForDebugging(`copyDir: dropping a symlink whose target chain cannot be trusted: ${lt}`, {
          level: "warn",
        });
        continue;
      }
      let pt;
      try {
        pt = await realpath(lt);
      } catch {
        if (!y && !isAbsolute(nt)) {
          let It = resolve_2(dirname(lt), nt);
          if (isPathUnder(It, resolve_2(r))) {
            await symlink(nt, Je);
            continue;
          }
        }
        logForDebugging(`copyDir: skipping broken symlink ${lt} -> ${nt}`);
        continue;
      }
      let Et;
      try {
        Et = await realpath(r);
      } catch {
        Et = r;
      }
      let yt;
      try {
        yt = await realpath(h);
      } catch {
        yt = h;
      }
      let gt = isPathUnder(pt, Et);
      let At = pathHasNodeModulesSegment(relative(r, lt));
      if (gt && (!y || At)) {
        let It = relative(Et, pt);
        let Yt = join(s, It);
        let qt = relative(dirname(Je), Yt);
        await symlink(qt, Je);
      } else if (gt || (isPathUnder(pt, yt) && !isPathUnder(Et, pt))) {
        if (y) {
          let qt = join(Et, relative(resolve_2(r), Z));
          if (isPathUnder(qt, pt)) {
            logForDebugging(`copyDir: skipping symlink to an ancestor directory ${lt} -> ${pt}`);
            continue;
          }
        }
        if (S.has(pt)) {
          logForDebugging(`copyDir: skipping cyclic symlink target ${lt} -> ${pt}`);
          continue;
        }
        let Yt = await (y || G ? lstat : stat)(pt).catch((error) => {
          logForDebugging(`copyDir: stat failed while materializing ${lt} -> ${pt}: ${errorMessage(error)}`, {
            level: "warn",
          });
          return;
        });
        if (!Yt) continue;
        if (Yt.isSymbolicLink())
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `Refusing to copy ${lt}: its target is no longer what it resolved to (swapped during the copy).`,
            "plugin copy symlink target swapped mid-copy",
          );
        if (Yt.isFile()) {
          if (y) consumeSymlinkCopyBudget(w, 1, Yt.size);
          if (y || G)
            await copyFileNoFollow(pt, Je, {
              exactMode: true,
              exclusive: true,
              nonBlocking: y,
            });
          else await copyFile(pt, Je);
        } else if (Yt.isDirectory()) {
          if (y) consumeSymlinkCopyBudget(w, 1, 0);
          S.add(pt);
          try {
            await copyDir(pt, Je, pt, Je, h, y, S, w, y, G);
          } finally {
            S.delete(pt);
          }
        } else logForDebugging(`copyDir: skipping non-regular symlink target ${lt} -> ${pt}`);
      } else logForDebugging(`copyDir: skipping symlink escaping containment root: ${lt} -> ${pt}`);
    }
  }
}
//@ chunk-e6aww6q8.js:4514602-4514831 placement
function assertSymlinkFree(e, n) {
  if (e.failed > 0 || e.readOnly)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Plugin tree at ${n} could not be made symlink-free (${e.readOnly ? "not writable" : `${e.failed} failed`}); refusing to cache it`,
      "plugin tree could not be made symlink-free",
    );
}
//@ chunk-e6aww6q8.js:4514831-4515261 placement
/**
 * 存储中暂存副本是否为空（分页列举）。
 */
async function isStorageScopeEmpty(storageV5, n) {
  let r;
  do {
    let s = await storageV5.listEntries(n, {
      skipKeyStats: true,
      skipScopeStats: true,
      ...(r === undefined
        ? {}
        : {
            cursor: r,
          }),
    });
    if (!s.ok)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Failed to list the staged plugin copy (${formatStorageError(s.error)}); retry the load or the install.`,
        "plugin cache staged copy could not be listed",
      );
    let skipped = s.value.skipped;
    if (s.value.items.length > 0 || (skipped !== undefined && Object.values(skipped).some((y) => y > 0)))
      return false;
    r = s.value.cursor;
  } while (r !== undefined);
  return true;
}
//@ chunk-e6aww6q8.js:4515261-4521669 placement = copyPluginToVersionedCache (0.356)
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
  let ke = (yt, gt, At) => requireVersionParentContained(cachePath, pluginId, version, yt, gt, At);
  let we = useStorageBackend ? await versionParentState(cachePath) : "real";
  if (we === "refused") await ke("cache", "before reuse", we);
  let Ee;
  let Ae = () =>
    (Ee ??=
      we === "absent"
        ? Promise.resolve("absent")
        : decideCachedVersionReuse(cachePath, pluginId, version, linkFarm, sourcePath));
  if (zipCacheMode) {
    if (
      we !== "absent" &&
      (useStorageBackend
        ? await strictArchivePresent(zipPath, pluginId, version, () => ke("cache", "before reuse"))
        : await pathExists(zipPath))
    ) {
      if (!forceOverwrite) {
        logForDebugging(`Plugin ${pluginId} version ${version} already cached at ${zipPath}`);
        if (useStorageBackend && (await versionParentContained(cachePath).catch(() => false)))
          await Promise.all([sweepStaleTempSiblings(cachePath), sweepStaleTempSiblings(zipPath)]);
        return zipPath;
      }
      if (useStorageBackend) await ke("cache", "before overwrite");
      await rm_2(zipPath, {
        force: true,
      });
    } else if (useStorageBackend && !forceOverwrite) {
      if ((await Ae()) === "serve") {
        await materializeCachedLinks(cachePath, storageV5, linkFarm);
        await removeCacheInUseMarker(cachePath, storageV5);
        logForDebugging(
          `Plugin ${pluginId} version ${version} already cached at ${cachePath} (a directory; its archive not made yet)`,
        );
        return cachePath;
      }
    }
  } else if (useStorageBackend ? (await Ae()) !== "absent" : await pathExists(cachePath)) {
    if (!useStorageBackend || (await Ae()) === "serve")
      await materializeCachedLinks(cachePath, storageV5, linkFarm);
    let yt = false;
    let gt;
    if (useStorageBackend) gt = (await Ae()) === "serve";
    else {
      let At = await classifyLinkFarmReuse(cachePath, sourcePath);
      yt = At.live;
      gt = isLinkModeCommandSource(marketplaceEntry?.source)
        ? At.reusable
        : At.unclassifiable || (!yt && (await dirHasRealEntries(cachePath)));
    }
    if (!forceOverwrite && gt) {
      await removeCacheInUseMarker(cachePath, storageV5);
      logForDebugging(`Plugin ${pluginId} version ${version} already cached at ${cachePath}`);
      return cachePath;
    }
    if ((gt || yt) && (await isPluginVersionInUseSafe(cachePath, storageV5))) {
      logForDebugging(
        `Cache for ${pluginId} at ${cachePath} is in use by another session; deferring overwrite until it exits`,
      );
      return cachePath;
    }
    if (!useStorageBackend || gt) {
      if (useStorageBackend) await ke("cache", "before overwrite");
      if (!useStorageBackend || (await clearOccupantForReplace(cachePath, pluginId, version)) === "recurse") {
        logForDebugging(
          `Removing ${gt || yt ? "superseded" : "incomplete"} cache directory for ${pluginId} at ${cachePath}`,
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
    let yt = true;
    if (useStorageBackend) {
      await ke("link", "before relink");
      let entries = await classifyCacheEntry(cachePath);
      if (entries === "unexaminable") throw getPluginCachePath(cachePath, pluginId, version, "link");
      yt = entries !== "symlink";
    }
    let gt = yt
      ? await classifyLinkFarmReuse(cachePath, sourcePath)
      : {
          live: false,
          reusable: false,
        };
    if (gt.reusable) {
      logForDebugging(`Plugin ${pluginId} version ${version} already linked at ${cachePath}`);
      return cachePath;
    }
    if (!useStorageBackend && gt.live && (await isPluginVersionInUseSafe(cachePath, storageV5))) {
      logForDebugging(
        `Link farm for ${pluginId} at ${cachePath} is in use by another session; deferring the relink until it exits`,
      );
      return cachePath;
    }
    if (useStorageBackend) {
      let At = await lstat(cachePath).catch((error) => {
        if (isPathAbsent(error)) return null;
        throw getPluginCachePath(cachePath, pluginId, version, "link");
      });
      if (
        At !== null &&
        (At.isDirectory() || At.isSymbolicLink()) &&
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
    if (useStorageBackend) await ke("link", "during relink");
    if (
      !useStorageBackend ||
      (await clearOccupantForReplace(cachePath, pluginId, version, "link")) === "recurse"
    )
      await evictCachedVersionDir(cachePath, storageV5);
    if (useStorageBackend) await ke("link", "during relink");
    await checkRelinkTarget(sourcePath, cachePath);
    logForDebugging(`Linked plugin ${pluginId} into versioned cache at ${cachePath}`);
    return cachePath;
  }
  if (useStorageBackend) {
    await ke("cache", "before staging");
    await Promise.all([sweepStaleTempSiblings(cachePath), sweepStaleTempSiblings(zipPath)]);
  }
  let Me = useStorageBackend ? makeTempSiblingName(cachePath) : cachePath;
  let We = async (yt) => {
    await ke("publish", yt);
    await assertStagedTreeIntact(Me, pluginId, version, "publish");
  };
  let ze = useStorageBackend && zipCacheMode;
  let lt = false;
  let Je = false;
  let nt = false;
  try {
    if (marketplaceEntry && typeof marketplaceEntry.source === "string" && marketplaceDir) {
      let sourceDir = validatePathWithinBase(marketplaceDir, marketplaceEntry.source);
      logForDebugging(`Copying source directory ${marketplaceEntry.source} for plugin ${pluginId}`);
      try {
        await copyPluginDir(sourceDir, Me, marketplaceDir, useStorageBackend);
      } catch (error) {
        if (isENOENT(error) && getErrnoPath_2(error) === sourceDir)
          throw Error(
            `Plugin source directory not found: ${sourceDir} (from entry.source: ${marketplaceEntry.source})`,
          );
        throw error;
      }
    } else {
      logForDebugging(`Copying plugin ${pluginId} to versioned cache (fallback to full copy)`);
      await copyPluginDir(sourcePath, Me, sourcePath, useStorageBackend);
    }
    let gitPath = join(Me, ".git");
    await removeDirectoryTreeNoFollow_2(gitPath);
    let gt =
      useStorageBackend && storageV5 !== undefined
        ? versionCacheStorageSpace(Me, anchoredPluginCachePath())
        : null;
    if (
      gt !== null &&
      storageV5 !== undefined &&
      !(await hasLinkedAncestorBelow(cachePath, anchoredPluginCachePath()))
        ? await isStorageScopeEmpty(storageV5, gt)
        : (await readdir(Me)).length === 0
    )
      throw Error(`Failed to copy plugin ${pluginId} to versioned cache: destination is empty after copy`);
    if (useStorageBackend) assertSymlinkFree(await materializePluginLinks(Me, copyDir), Me);
    if (ze) nt = true;
    else if (useStorageBackend) {
      await We("during publish");
      try {
        await moveIntoVersionPath(Me, cachePath);
        lt = true;
      } catch (error) {
        let Yt = async () => {
          let cacheEntries = await classifyCacheEntry(cachePath);
          return (
            cacheEntries === "other" || (cacheEntries === "symlink" && (await isCachePathClean(cachePath)))
          );
        };
        let qt = async () =>
          (await versionParentContained(cachePath)) &&
          (await Yt()) &&
          (await hasRealEntries(cachePath, {
            whenUnreadable: false,
          }).catch(() => false));
        let Zt = async (error) => {
          if (await qt()) {
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
        let rn = async () => {
          await We("during publish");
          try {
            await moveIntoVersionPath(Me, cachePath);
            lt = true;
          } catch (error) {
            Je = await Zt(error);
          }
        };
        let pn = await classifyCacheEntry(cachePath);
        if (pn === "unexaminable") throw getPluginCachePath(cachePath, pluginId, version);
        let no = pn === "symlink" && !(await isCachePathClean(cachePath));
        if (pn === "absent") await rn();
        else if (
          pn === "symlink" ? no || !(await dirHasPluginRoot(cachePath)) : !(await hasRealEntries(cachePath))
        ) {
          await ke("publish", "during publish");
          let hn =
            pn === "other" &&
            (await lstat(cachePath).then(
              (yn) => yn.isDirectory(),
              () => false,
            ));
          if (
            (hn || pn === "symlink") &&
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
          if (hn) await removeInUseMarker(cachePath, storageV5);
          logForDebugging(
            `Plugin ${pluginId} version ${version}: clearing ${pn === "symlink" ? "a stray symlink" : hn ? "payload-free debris" : "a stray non-directory entry"} at ${cachePath} (${errorMessage(error)})`,
          );
          if (
            pn === "symlink"
              ? await removePathEntry(cachePath).then(
                  (yn) => yn !== "directory",
                  () => false,
                )
              : (await removeVersionDirIfIdle(cachePath)) === "removed"
          )
            await rn();
          else if (no)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `Could not publish ${pluginId} ${version}: a link sits at its cache path and could not be removed; remove that link from the plugin cache, then retry the install.`,
              "plugin cache stray link not removable",
            );
          else Je = await Zt(error);
        } else Je = await Zt(error);
      }
    }
  } finally {
    if (useStorageBackend && !lt && !nt) await removeDirectoryTreeNoFollow(Me);
  }
  if (Je) {
    await materializeCachedLinks(cachePath, storageV5, linkFarm);
    await removeCacheInUseMarker(cachePath, storageV5);
    await writeInUseMarker(cachePath, storageV5);
    return cachePath;
  }
  let pt = nt ? Me : cachePath;
  let Et = async () => {
    try {
      await We("after a failed archive");
      try {
        await moveIntoVersionPath(Me, cachePath);
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
        await We("after a failed archive");
        await moveIntoVersionPath(Me, cachePath);
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
      if (nt) await assertStagedTreeIntact(pt, pluginId, version, "install");
      await unvouchBeforeDependencyStep(pt, storageV5, {
        staged: nt,
      });
      let yt = await installPluginDependencies(pt);
      if (yt.error)
        logForDebugging(`Plugin dependency install warning for ${pluginId}: ${yt.error}`, {
          level: "warn",
        });
      await provisionBinaryAssets(pt, pluginId, {
        storageV5,
        credentials: options?.credentials,
      });
      await rescreenCachedPluginTree(pt, storageV5);
    } catch (error) {
      if (!nt) await removeFreshCopyUnlessInUse(cachePath, storageV5);
      throw error;
    }
    if (nt) await assertStagedTreeIntact(pt, pluginId, version, "archive");
    if (
      zipCacheMode &&
      (await unmarkBeforeArchiving(pt, storageV5, {
        staged: nt,
      }))
    ) {
      try {
        await publishDirectoryAsZip(pt, zipPath);
      } catch (error) {
        if (nt && (await classifyCacheEntry(zipPath)) === "absent") await Et();
        throw error;
      }
      if (
        nt &&
        (await versionParentContained(cachePath).catch(() => false)) &&
        (await classifyCacheEntry(cachePath)) === "other" &&
        !(await hasRealEntries(cachePath))
      )
        await removeStaleLeftover(cachePath);
      logForDebugging(`Successfully cached plugin ${pluginId} as ZIP at ${zipPath}`);
      return zipPath;
    }
  } finally {
    if (nt) await removeDirectoryTreeNoFollow(Me);
  }
  logForDebugging(`Successfully cached plugin ${pluginId} at ${cachePath}`);
  return cachePath;
}
//@ chunk-e6aww6q8.js:4521669-4522454 placement
/**
 * 删除版本化缓存目录：存储后端模式下先让存储层清理作用域，剩余部分再直接删除。
 */
async function evictCachedVersionDir(cachePath, storageV5) {
  let r = orphanMarkerCoordsV5(cachePath, storageV5);
  if (
    storageV5 !== undefined &&
    r !== null &&
    !(await hasLinkedAncestorBelow(cachePath, anchoredPluginCachePath()))
  ) {
    let s = await storageV5.deleteScope({
      namespace: "pluginCache",
      ...r,
    });
    if (s.ok && !(await pathExists(cachePath))) return;
    if (
      !s.ok &&
      (s.error.code === "InvalidArgument" ||
        (s.error.code === "Failed" && "telemetryCode" in s.error && s.error.telemetryCode === "ELOOP"))
    )
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Could not empty ${cachePath}: the storage layer refused the version folder (${formatStorageError(s.error)}); check that plugin cache folder \u2014 nothing was removed \u2014 and then retry the install or the update.`,
        "plugin cache version folder refused by the storage layer during removal",
      );
    logForDebugging(
      s.ok
        ? `Storage sweep of ${cachePath} left entries it does not own; removing the directory directly`
        : `Storage sweep of ${cachePath} failed (${formatStorageError(s.error)}); removing the directory directly`,
      {
        level: "warn",
      },
    );
  }
  await removeDirectoryTreeNoFollow_2(cachePath);
}
//@ chunk-e6aww6q8.js:4522454-4523178 placement
async function ensurePluginCacheFolder(cachePath, storageV5) {
  let r =
    isStorageV5Enabled() && storageV5 !== undefined
      ? pluginCacheStorageScope(dirname(cachePath), anchoredPluginCachePath())
      : null;
  if (
    isStorageV5Enabled() &&
    storageV5 !== undefined &&
    r !== null &&
    r.plugin !== undefined &&
    !(await hasLinkedAncestorBelow(cachePath, anchoredPluginCachePath()))
  ) {
    let s = await storageV5.ensureScope(r);
    if (s.ok) return;
    if (s.error.code === "Failed" && "telemetryCode" in s.error && s.error.telemetryCode === "ELOOP")
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Could not prepare the plugin cache folder of ${cachePath}: the storage layer refused it (${formatStorageError(s.error)}); check that plugin cache folder \u2014 the plugin version was not cached \u2014 and then retry the install or the update.`,
        "plugin cache plugin folder refused by the storage layer during creation",
      );
    logForDebugging(
      `The storage layer could not create the plugin cache folder of ${cachePath} (${formatStorageError(s.error)}); creating it directly`,
      {
        level: "warn",
      },
    );
  }
  await getFsImplementation().mkdir(dirname(cachePath));
}
//@ chunk-e6aww6q8.js:4523178-4523506 placement
/**
 * 不运行 install 脚本地下载 npm 包到目标目录（可指定 registry、期望 integrity）。
 */
async function fetchNpmPackageNoScripts(e, targetPath, r) {
  logForDebugging(`Fetching npm package ${e}@${r.version ?? "latest"} (no install scripts)`);
  return fetchNpmPackage(
    {
      packageName: e,
      versionSpec: r.version,
      targetPath,
    },
    {
      registry: r.registry,
      workDir: r.scratchDir,
      isNpmMarketplaceLane: r.isNpmMarketplaceLane ?? false,
      ...(r.expectedIntegrity !== undefined && {
        expectedIntegrity: r.expectedIntegrity,
      }),
    },
  );
}
//@ chunk-e6aww6q8.js:4524665-4524705 affinity
var CLONE_STEP_FAILED = Symbol("pluginCloneStepFailed");
//@ chunk-e6aww6q8.js:4524705-4526454 fingerprint = gitClone (0.736)
/**
 * git 克隆插件仓库：校验 sha/ref、--depth 1（有 sha 时 fetch 该提交）、可禁用子模块、校验钉住的提交。
 */
async function gitClone_2(
  gitUrl,
  targetPath,
  ref,
  sha,
  { isDirectoryPlugin: h, noSubmodules: y = false } = {},
) {
  assertFullCommitSha(sha);
  if (ref?.startsWith("-")) throw Error(`Invalid ref "${ref}": cannot start with "-"`);
  let S = runGitWithCeilingDirs(targetPath, await resolveGitSshConfig(gitUrl));
  let { pinArgs, env } = S;
  let G = y ? ["-c", "submodule.recurse=false"] : [];
  let q = [...S.inCheckoutArgs, ...G];
  let Z = [
    ...SSH_BATCH_CONFIG_ARGS,
    ...pinArgs,
    ...G,
    "clone",
    "--depth",
    "1",
    ...(y ? ["--no-recurse-submodules"] : ["--recurse-submodules", "--shallow-submodules"]),
  ];
  if (ref && !sha) Z.push("--branch", ref);
  if (sha) Z.push("--no-checkout");
  Z.push("--", gitUrl, targetPath);
  let cloneStarted = performance.now();
  let cloneResult = await execFileNoThrow(gitExe(), Z, {
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
      h,
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
  let we;
  if (sha) {
    if (
      (
        await execFileNoThrowWithCwd(
          gitExe(),
          [...q, "fetch", SAFE_UPLOAD_PACK_ARG_2, "--depth", "1", "origin", sha],
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
        [...q, "fetch", SAFE_UPLOAD_PACK_ARG_2, "--unshallow", ...(ref ? ["origin", ref] : [])],
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
          h,
        );
        throw withTelemetryMessage(
          Error(`Failed to fetch commit ${sha}: ${redactKnownUrls(unshallowResult.stderr, gitUrl)}`),
          "plugin git fetch (unshallow) failed (stderr redacted)",
        );
      }
    }
    let checkoutResult = await runGitInOwnWorkTree(
      targetPath,
      [...q, "checkout", sha],
      pickGitNoPromptEnv(env),
    );
    if (checkoutResult.code !== 0) {
      logPluginFetch(
        "plugin_clone",
        gitUrl,
        "failure",
        performance.now() - cloneStarted,
        classifyFetchError(checkoutResult.stderr),
        h,
      );
      throw withTelemetryMessage(
        Error(`Failed to checkout commit ${sha}: ${redactKnownUrls(checkoutResult.stderr, gitUrl)}`),
        "plugin git checkout failed (stderr redacted)",
      );
    }
    try {
      we = await verifyPinnedSha(targetPath, "HEAD", sha, {
        inCheckoutArgs: q,
        env,
      });
    } catch (error) {
      logPluginFetch(
        "plugin_clone",
        gitUrl,
        "failure",
        performance.now() - cloneStarted,
        "sha_pin_mismatch",
        h,
      );
      throw error;
    }
  }
  logPluginFetch("plugin_clone", gitUrl, "success", performance.now() - cloneStarted, undefined, h);
  return we;
}
//@ chunk-e6aww6q8.js:4526454-4526599 fingerprint = installFromGit (1)
async function installFromGit(gitUrl, targetPath, ref, sha, h) {
  let safeUrl = parsePluginGitUrl(gitUrl);
  let S = await gitClone_2(safeUrl, targetPath, ref, sha, h);
  let refMessage = ref ? ` (ref: ${ref})` : "";
  logForDebugging(`Cloned repository from ${redactUrlQuery(safeUrl)}${refMessage} to ${targetPath}`);
  return S;
}
//@ chunk-e6aww6q8.js:4526599-4527713 fingerprint = installFromGitHub (0.49)
/**
 * github 来源安装：校验 owner/repo，按 SSH 配置情况先 SSH 后 HTTPS（或直接 HTTPS）克隆，失败时回退另一种传输。
 */
async function installFromGitHub(repo, n, ref, s, noSubmodules, gitHubHttpsFallback) {
  if (!/^[a-zA-Z0-9-_.]+\/[a-zA-Z0-9-_.]+$/.test(repo))
    throw Error(`Invalid GitHub repository format: ${repo}. Expected format: owner/repo`);
  let S = `git@${GITHUB_HOST}:${repo}.git`;
  let w = `https://github.com/${repo}.git`;
  if (preferHttpsGitTransport())
    return installFromGit(w, n, ref, s, {
      noSubmodules,
    });
  if (gitHubHttpsFallback === undefined)
    return installFromGit(S, n, ref, s, {
      noSubmodules,
    });
  if (!(await readGitSshCommand(gitHubHttpsFallback, S, n, false)))
    try {
      return await installFromGit(S, n, ref, s, {
        noSubmodules,
      });
    } catch (error) {
      if (
        !isCloneStepFailure(error) ||
        !isSshAuthFailureOutput(errorMessage(error)) ||
        !(await readGitSshCommand(gitHubHttpsFallback, S, n, true))
      )
        throw error;
      await removeDirectoryTreeNoFollow_2(n).catch(() => {
        throw error;
      });
    }
  gitHubHttpsFallback.notify(sshNotConfiguredMessage(w));
  try {
    return await installFromGit(w, n, ref, s, {
      noSubmodules,
    });
  } catch (error) {
    if (!isCloneStepFailure(error)) throw error;
    try {
      await removeDirectoryTreeNoFollow_2(n);
    } catch (error_2) {
      logForDebugging(`Could not clear ${n} for the SSH retry: ${errorMessage(error_2)}`, {
        level: "warn",
      });
      throw error;
    }
    gitHubHttpsFallback.notify(httpsFailedRetrySshMessage(S));
    try {
      return await installFromGit(S, n, ref, s, {
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
//@ chunk-e6aww6q8.js:4527713-4527765 layout
function isCloneStepFailure(error) {
  return error instanceof Error && CLONE_STEP_FAILED in error;
}
//@ chunk-e6aww6q8.js:4527765-4527907 layout
function githubShorthandToCloneUrl(url) {
  if (/^[a-zA-Z0-9-_.]+\/[a-zA-Z0-9-_.]+$/.test(url))
    return preferHttpsGitTransport() ? `https://github.com/${url}.git` : `git@${GITHUB_HOST}:${url}.git`;
  return parsePluginGitUrl(url);
}
//@ chunk-e6aww6q8.js:4527907-4527932 placement
/**
 * git 不可用（xcrun 报错或找不到 git）时抛的错误类。
 */
class GitNotAvailableError extends Error {}
//@ chunk-e6aww6q8.js:4527932-4527957 placement
/**
 * git 网络错误（无法访问、RPC 失败、SSH 解析失败）时抛的错误类。
 */
class GitHostFetchFailedError extends Error {}
//@ chunk-e6aww6q8.js:4527957-4528180 layout
var GIT_NETWORK_ERROR_RE =
  /^(?:fatal: unable to access '[^']*': |error: RPC failed; (?:curl (?:6|7|18|28|35|52|55|56|60|92)\b|HTTP [45]\d\d)|ssh: Could not resolve hostname |ssh: connect to host \S+ port \d+: |fatal: unable to connect to )/;
//@ chunk-e6aww6q8.js:4528180-4528411 layout
function classifyGitError(stderr, n) {
  let lines = stderr.split(`
`);
  if (lines.some((line) => line.startsWith("fatal: remote error:"))) return Error(n);
  if (lines.some((line) => line.startsWith("xcrun: error:") || line === GIT_MISSING_MAC_MESSAGE))
    return new GitNotAvailableError(n);
  return lines.some((line) => GIT_NETWORK_ERROR_RE.test(line)) ? new GitHostFetchFailedError(n) : Error(n);
}
//@ chunk-e6aww6q8.js:4528411-4528527 layout
function gitEnvWithCMessages(env) {
  let { LC_ALL, ...r } = env;
  return {
    ...r,
    LC_ALL: undefined,
    ...(LC_ALL !== undefined &&
      LC_ALL !== "" && {
        LC_CTYPE: LC_ALL,
      }),
    LC_MESSAGES: "C",
  };
}
//@ chunk-e6aww6q8.js:4528527-4531133 fingerprint = installFromGitSubdir (0.721)
/**
 * git-subdir 来源安装：部分克隆（--filter=tree:0）+ sparse-checkout 只取子目录，校验 sha，复制子目录到目标。需要 git ≥2.25。
 */
async function installFromGitSubdir(
  url,
  n,
  subdirPath,
  ref,
  sha,
  tempPath = n,
  { noSubmodules: S = false } = {},
) {
  if (!(await isGitUsable()))
    throw new GitNotAvailableError(
      "git-subdir plugin source requires git to be installed and on PATH. Install git (version 2.25 or later for sparse-checkout cone mode) and try again.",
    );
  assertFullCommitSha(sha);
  if (ref?.startsWith("-")) throw Error(`Invalid ref "${ref}": cannot start with "-"`);
  let gitUrl = githubShorthandToCloneUrl(url);
  let cloneDir = `${tempPath}${TEMP_CACHE_CLONE_SUFFIX}`;
  let G = runGitWithCeilingDirs(cloneDir, await resolveGitSshConfig(gitUrl));
  let { pinArgs, env } = G;
  let Se = S ? ["-c", "submodule.recurse=false"] : [];
  let ke = [...G.inCheckoutArgs, ...Se];
  let cloneArgs = [
    ...SSH_BATCH_CONFIG_ARGS,
    ...pinArgs,
    ...Se,
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
    let Ae = pickGitNoPromptEnv(env);
    let Ie = [...ke, "read-tree", "-u", "--reset"];
    let sparseResult = await runGitInOwnWorkTree(
      cloneDir,
      [...ke, "sparse-checkout", "set", "--cone", "--", subdirPath],
      Ae,
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
            [...ke, "fetch", SAFE_UPLOAD_PACK_ARG_2, "--depth", "1", "origin", sha],
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
          [...ke, "fetch", SAFE_UPLOAD_PACK_ARG_2, "--unshallow", ...(ref ? ["origin", ref] : [])],
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
      let checkout = await runGitInOwnWorkTree(cloneDir, [...Ie, sha], Ae);
      if (checkout.code !== 0)
        throw withTelemetryMessage(
          Error(`Failed to checkout commit ${sha}: ${redactKnownUrls(checkout.stderr, gitUrl)}`),
          "plugin git-subdir checkout failed (stderr redacted)",
        );
      resolvedSha = await verifyPinnedSha(cloneDir, `${sha}^{commit}`, sha, {
        inCheckoutArgs: ke,
        env,
      });
    } else {
      let [checkout, revParse] = await Promise.all([
        runGitInOwnWorkTree(cloneDir, [...Ie, "HEAD"], Ae),
        execFileNoThrowWithCwd(gitExe(), [...ke, "rev-parse", "HEAD"], {
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
      if (dirname(n) !== anchoredPluginCachePath()) await getFsImplementation().mkdir(dirname(n));
      await retryFsOp(resolvedSubdir, n);
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
      `Extracted subdir ${subdirPath} from ${redactUrlQuery(gitUrl)}${refMsg}${shaMsg} to ${n}`,
    );
    return resolvedSha;
  } finally {
    await rm_2(cloneDir, {
      recursive: true,
      force: true,
    });
  }
}
//@ chunk-e6aww6q8.js:4531133-4531330 fingerprint = installFromLocal (0.745)
async function installFromLocal(sourcePath, targetPath, r, s = false, { noFollowFiles: h = false } = {}) {
  if (!(await pathExists(sourcePath))) throw Error(`Source path does not exist: ${sourcePath}`);
  await copyDir(
    sourcePath,
    targetPath,
    sourcePath,
    targetPath,
    r || sourcePath,
    s,
    new Set(),
    freshSymlinkCopyBudget(),
    false,
    h,
    true,
  );
  let gitPath = join(targetPath, ".git");
  await removeDirectoryTreeNoFollow_2(gitPath);
}
//@ chunk-e6aww6q8.js:4531330-4531365 layout
function getTemporaryCachePath(source) {
  return makeTempCachePathName(generateTemporaryCacheNameForPlugin(source));
}
//@ chunk-e6aww6q8.js:4531365-4531639 fingerprint = generateTemporaryCacheNameForPlugin (0.683)
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
//@ chunk-e6aww6q8.js:4531639-4531882 placement
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
//@ chunk-e6aww6q8.js:4531882-4534542 placement = cachePlugin (0.458)
/**
 * 按来源把插件下载/复制到临时目录：npm、github/url/git-subdir（git 克隆、sha 钉住校验）、archive（https zip）、command、本地路径；storageV5 下在插件缓存内分配暂存区。返回 {path, manifest, gitCommitSha…} 供 copyPluginToVersionedCache 使用。
 */
async function cachePlugin(source, options) {
  let cachePath = anchoredPluginCachePath();
  await getFsImplementation().mkdir(cachePath);
  let tempName = getTemporaryCachePath(source);
  let h = strictCacheAddressable(options?.storageV5);
  let y =
    isStorageV5Enabled() && options?.storageV5 !== undefined && h && options.pluginId
      ? allocateStagingInCache(options.storageV5, options.pluginId)
      : undefined;
  if (y !== undefined)
    try {
      await getFsImplementation().mkdir(dirname(y.path));
      if (!(await stat(dirname(y.path))).isDirectory())
        throw Error("the plugin cache folder is not a directory");
    } catch (error) {
      logForDebugging(
        `Could not prepare ${dirname(y.path)} for staging (${errorMessage(error)}); staging at the cache root instead`,
        {
          level: "debug",
        },
      );
      y = undefined;
    }
  let targetPath = y?.path ?? join(cachePath, tempName);
  let tempPath = join(cachePath, tempName);
  let L = async () => {
    if (y !== undefined) await getFsImplementation().mkdir(dirname(targetPath));
  };
  let G = false;
  let q;
  let Z;
  let Se;
  let ke;
  let we;
  try {
    logForDebugging(
      `Caching plugin from source: ${jsonStringify(redactPluginSourceForLog(source))} to temporary path ${targetPath}`,
    );
    G = true;
    if (typeof source === "string") {
      await L();
      await installFromLocal(source, targetPath, options?.containmentRoot, h);
    } else
      switch (source.source) {
        case "npm":
          await L();
          try {
            ke = await fetchNpmPackageNoScripts(source.package, targetPath, {
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
          await L();
          q = await installFromGitHub(
            source.repo,
            targetPath,
            source.ref,
            source.sha,
            options.directoryPin !== null,
            options.gitHubHttpsFallback,
          );
          break;
        case "url":
          await L();
          q = await installFromGit(source.url, targetPath, source.ref, source.sha, {
            isDirectoryPlugin: options?.isDirectoryPlugin,
            noSubmodules: options.directoryPin !== null,
          });
          break;
        case "git-subdir":
          q = await installFromGitSubdir(
            source.url,
            targetPath,
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
          Z = await installFromArchive(
            source,
            targetPath,
            tempPath,
            options?.archiveAuth,
            options?.entryDeclaresComponents ?? false,
            options?.declaredComponentPaths === undefined ? [] : options.declaredComponentPaths,
          );
          break;
        case "claudeai":
          Z = await installClaudeAiPlugin(source, targetPath, tempPath, options?.credentials);
          break;
        case "command": {
          let lt = await holdCommandSourceForOrg(
            source,
            targetPath,
            async (sourcePath, targetPath) => {
              await L();
              await installFromLocal(sourcePath, targetPath, undefined, h, {
                noFollowFiles: true,
              });
            },
            options?.commandSourceConsent,
          );
          Z = lt.contentSha256;
          Se = lt.producerDirectory;
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
    if (h && !isLinkModeCommandSource(source))
      assertSymlinkFree(await materializePluginLinks(targetPath, copyDir), targetPath);
    let ze = typeof source === "string" ? source : source.source;
    we = await loadPluginManifest(targetPath, tempName, ze, [join(targetPath, PLUGIN_JSON)]);
    if (!isLinkModeCommandSource(source))
      await removeIgnoredEntries(targetPath, {
        keepGit: true,
      });
  } catch (error) {
    if (G && (h || (await pathExists(targetPath)))) {
      logForDebugging(`Cleaning up failed installation at ${targetPath}`);
      try {
        await removeDirectoryTreeNoFollow_2(targetPath);
      } catch (error) {
        logForDebugging(`Failed to clean up installation: ${error}`, {
          level: "error",
        });
      }
    }
    throw error;
  }
  let Ee = typeof source === "string" ? source : source.source;
  let { manifest, manifestPath, depConstraints } = we;
  let We =
    manifestPath !== null
      ? manifest
      : options?.manifest || {
          name: tempName,
          description: `Plugin cached from ${Ee}`,
        };
  logForDebugging(`Successfully cached plugin ${We.name} to ${targetPath}`);
  return {
    path: targetPath,
    manifest: We,
    ...(q && {
      gitCommitSha: q,
    }),
    ...(Z && {
      contentSha256: Z,
    }),
    ...(Se && {
      producerPath: Se,
    }),
    ...(ke && {
      npmResolution: ke,
    }),
    ...(depConstraints && {
      depConstraints,
    }),
    ...(y && {
      stagingScope: y.scope,
    }),
  };
}
//@ chunk-e6aww6q8.js:4534542-4534733 placement
function allocateStagingInCache(storageV5, pluginId) {
  let r = anchoredPluginCachePath();
  let s = pluginCacheStorageScope(getPluginCacheDirIn(getPluginsDirectory(), pluginId), r);
  if (s === null || s.plugin === undefined) return;
  let h = storageV5.stagingScopeWithin(s);
  if (!isVersionRootStorageKey(h)) return;
  let y = storageKeyToCachePath(h, r);
  return y === null
    ? undefined
    : {
        scope: h,
        path: y,
      };
}
//@ chunk-e6aww6q8.js:4534733-4534867 placement
var ARCHIVE_RETRY_DELAYS_MS = [30, 70, 150];
var UNSUPPORTED_SOURCE_MESSAGE =
  "This plugin uses a source type your Claude Code version does not support. Update Claude Code and try again.";
//@ chunk-e6aww6q8.js:4534867-4537104 placement
/**
 * 安装插件压缩包：拒绝只声明不安全组件路径的条目，过滤 __MACOSX 等文件。
 */
async function installFromArchive(source, n, tempPath, archiveAuth, h = false, y = []) {
  return withFeatureTelemetry("plugin_archive_install", async () => {
    if (y === null)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Plugin archive from ${redactUrlsInText(source.url)} was not installed: its marketplace entry declares only unsafe or malformed component paths. Fix the entry.`,
        "plugin marketplace entry declares only unsafe component paths",
      );
    let headers;
    if (archiveAuth && Object.keys(archiveAuth.headers).length > 0)
      if (sameOrigin_2(archiveAuth.url, source.url)) headers = archiveAuth.headers;
      else logForDebugging("Not forwarding marketplace headers to plugin archive on a different origin");
    let { data: w, contentSha256 } = await downloadAndVerifyBinary(source.url, {
      sha256: source.sha256,
      headers,
    });
    let G = `${tempPath}${TEMP_CACHE_LINK_SUFFIX}`;
    try {
      if (
        !(await extractZipToDirectory(w, G)).some(
          (ke) => !ke.startsWith("__MACOSX/") && basename(ke) !== ".DS_Store",
        )
      )
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Plugin archive from ${redactUrlsInText(source.url)} contained no plugin files. The archive was not installed. Verify the URL serves a zip of the plugin contents.`,
          "plugin archive was empty",
        );
      let pluginRootInExtracted = await findPluginRootInExtracted(G);
      if (pluginRootInExtracted !== G)
        logForDebugging(
          `Plugin archive had a wrapper directory; using ${printableName(basename(pluginRootInExtracted))} as the plugin root`,
        );
      if (h && y !== null && y.length > 0) {
        if (!(await anyPathExistsUnder(pluginRootInExtracted, y))) {
          let singleTopDir = await findSingleTopDir(pluginRootInExtracted);
          if (singleTopDir && (await anyPathExistsUnder(singleTopDir, y))) {
            logForDebugging(
              `Plugin archive entry paths resolve under wrapper ${printableName(basename(singleTopDir))}; using it as the plugin root`,
            );
            pluginRootInExtracted = singleTopDir;
          } else if (
            pluginRootInExtracted !== G &&
            !(await hasManifestIdentityFile(pluginRootInExtracted)) &&
            (await anyPathExistsUnder(G, y))
          ) {
            logForDebugging(
              "Plugin archive entry paths resolve at the archive root; using it instead of the promoted subdirectory",
            );
            pluginRootInExtracted = G;
          } else {
            let we = examplePathSuffix(y[0]);
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `Plugin archive from ${redactUrlsInText(source.url)} does not contain the component paths its marketplace entry declares${we}. The archive was not installed. Repackage the zip so the declared paths sit at the plugin root (optionally inside a single wrapper directory), or fix the entry.`,
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
      if (!h && !(await pluginRootHasMarker(pluginRootInExtracted)))
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Plugin archive from ${redactUrlsInText(source.url)} has no plugin content at its root (expected .claude-plugin/ or a commands/, skills/, agents/, hooks/, themes/, output-styles/, monitors/, workflows/, SKILL.md, .mcp.json, or .lsp.json at the top level, optionally inside a single wrapper directory). The archive was not installed.`,
          "plugin archive has no plugin-shaped root",
        );
      if (dirname(n) !== anchoredPluginCachePath()) await getFsImplementation().mkdir(dirname(n));
      await retryFsOp(pluginRootInExtracted, n);
      return contentSha256;
    } finally {
      await rm_2(G, {
        recursive: true,
        force: true,
      }).catch(() => {});
    }
  });
}
//@ chunk-e6aww6q8.js:4537104-4539060 placement = loadPluginManifest (0.364)
/**
 * 读取并解析 .claude-plugin/plugin.json（找不到再试候选路径），先确认清单路径不经符号链接逃出插件目录；JSON 损坏或 schema 失败抛 TelemetrySafeError；返回 {manifest, manifestPath, depConstraints}。没有 manifest 时用目录名合成。
 */
async function loadPluginManifest(pluginPath, pluginName, source, s = [], h, y) {
  let S = () => {
    if (!h?.isProbe && !h?.noTelemetry) logFeatureOk("plugin_load_manifest");
  };
  let w = (G) => {
    if (h?.noTelemetry) return;
    logFeatureBad("plugin_load_manifest", G);
  };
  let L = [join(pluginPath, PLUGIN_MANIFEST_PATH_2), ...s];
  await assertManifestContained(
    h?.containedIn,
    pluginPath,
    pluginName,
    PLUGIN_MANIFEST_PATH_2,
    h?.noTelemetry,
  );
  for (let G of L) {
    let q;
    let Z = isStorageV5Enabled() && y !== undefined ? await readFileViaStorageBackend(y, G) : null;
    if (Z !== null) {
      if (Z.outcome === "absent" || (Z.outcome === "error" && Z.telemetryCode === "ENOTDIR")) continue;
      if (Z.outcome === "error") {
        w("plugin_load_manifest_read_failed");
        logForDebugging(
          `Plugin ${pluginName}: failed to read manifest file at ${G}. Read error: ${Z.detail}`,
          {
            level: "error",
          },
        );
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Plugin ${pluginName}: failed to read manifest file at ${G}.

Read error: ${Z.detail}`,
          "plugin manifest read failed (v5 backend error)",
          MANIFEST_ERROR_CLASSES.readFailed,
        );
      }
      q = Z.content;
    } else
      try {
        q = await readFile(G, {
          encoding: "utf-8",
        });
      } catch (error) {
        if (isENOENT(error) || getErrnoCode(error) === "ENOTDIR") continue;
        let parsedJson = errorMessage(error);
        w("plugin_load_manifest_read_failed");
        logForDebugging(
          `Plugin ${pluginName}: failed to read manifest file at ${G}. Read error: ${parsedJson}`,
          {
            level: "error",
          },
        );
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Plugin ${pluginName}: failed to read manifest file at ${G}.

Read error: ${parsedJson}`,
          "plugin manifest read failed",
          MANIFEST_ERROR_CLASSES.readFailed,
        );
      }
    let Se;
    try {
      Se = jsonParse(stripBom(q));
    } catch (error) {
      let errorMsg = errorMessage(error);
      w("plugin_load_manifest_json_invalid");
      logForDebugging(`Plugin ${pluginName} has a corrupt manifest file at ${G}. Parse error: ${errorMsg}`, {
        level: "error",
      });
      throw new ManifestLoadError(
        `Plugin ${pluginName} has a corrupt manifest file at ${G}.

JSON parse error: ${errorMsg}`,
        "plugin manifest is not valid JSON",
        MANIFEST_ERROR_CLASSES.jsonInvalid,
        G,
        [errorMsg],
      );
    }
    let ke = validatePluginManifest(Se, "plugin-json", {
      pluginName,
      manifestPath: G,
    });
    if (!ke.ok) {
      w("plugin_load_manifest_schema_invalid");
      logForDebugging(ke.error, {
        level: "error",
      });
      throw new ManifestLoadError(
        ke.error,
        "plugin manifest failed schema validation",
        MANIFEST_ERROR_CLASSES.schemaInvalid,
        G,
        ke.errors.map((error) => (error.path ? `${error.path}: ${error.message}` : error.message)),
      );
    }
    for (let hookNote of ke.hookNotes)
      logForDebugging(`Plugin ${pluginName}: ${hookNote}`, {
        level: "warn",
      });
    let { manifest, rawCandidate } = ke;
    S();
    return {
      manifest,
      manifestPath: G,
      depConstraints: readManifestDependencyPins(rawCandidate),
    };
  }
  S();
  return {
    manifest: {
      name: pluginName,
      description: `Plugin from ${source}`,
    },
    manifestPath: null,
    depConstraints: undefined,
  };
}
//@ chunk-e6aww6q8.js:4539060-4540263 fingerprint = loadPluginHooks (0.496)
/**
 * 读取 hooks/hooks.json：校验 PluginHooksSchema，返回 hooks 配置与 hooks 模块（modules）列表。
 */
async function loadPluginHooks_3(hooksFilePath, pluginName, r) {
  let s;
  let h = isStorageV5Enabled() && r !== undefined ? await readFileViaStorageBackend(r, hooksFilePath) : null;
  if (h !== null) {
    if (h.outcome === "error")
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Hooks file read failed at ${hooksFilePath} for plugin ${pluginName}: ${h.detail}`,
        "plugin hooks file read failed (v5 backend)",
      );
    s = h.outcome === "found" ? h.content : undefined;
  } else if (await pathExists(hooksFilePath))
    s = await readFile(hooksFilePath, {
      encoding: "utf-8",
    });
  if (s === undefined)
    throw Error(
      `Hooks file not found at ${hooksFilePath} for plugin ${pluginName}. If the manifest declares hooks, the file must exist.`,
    );
  let y = jsonParse(s);
  if (hasNestedHooks(y, SETTINGS_SKIPPED_KEYS) || looksLikeHookMatcher(y))
    throw new HookValidationError(
      `hooks.json declares ${[...GUARD_HOOK_EVENTS].join("/")} at its top level, outside the "hooks" object \u2014 ${UNLOADABLE_GUARD_NOTE}`,
    );
  if (
    y &&
    typeof y === "object" &&
    "hooks" in y &&
    y.hooks !== null &&
    y.hooks !== undefined &&
    !isPlainObject_5(y.hooks)
  )
    throw new HookValidationError(
      `hooks: must be an object mapping event names to matcher arrays \u2014 ${UNLOADABLE_GUARD_NOTE}`,
    );
  if (y && typeof y === "object" && "hooks" in y) {
    let rawHooksConfig = validateHooksSetting(y.hooks);
    for (let note of rawHooksConfig.notes)
      logForDebugging(`Plugin ${pluginName}: ${note}`, {
        level: "warn",
      });
    if (rawHooksConfig.unloadableGuards.length > 0)
      throw new HookValidationError(
        `${rawHooksConfig.unloadableGuards.join("; ")} \u2014 ${UNLOADABLE_GUARD_NOTE}`,
      );
  }
  let S;
  try {
    S = PluginHooksSchema().parse(y);
  } catch (error) {
    let hooks = y && typeof y === "object" && "hooks" in y ? y.hooks : undefined;
    if (hasGuardHooks_2(hooks) || hasGuardHooks_2(y))
      throw new HookValidationError(`${errorMessage(error)} \u2014 ${UNLOADABLE_GUARD_NOTE}`);
    throw error;
  }
  warnUnknownHooksJsonKeys(pluginName, hooksFilePath, y);
  return {
    hooks: S.hooks ?? {},
    modules: S.modules ?? [],
  };
}
//@ chunk-e6aww6q8.js:4540263-4540956 layout
/**
 * 处理 hooks.json 的 modules（JS hooks 模块）：每插件只允许一个，多于一个时报 hook-load-failed 都不加载。
 */
async function loadPluginHooksModule(e) {
  let { plugin, namedModules, source, storageV5, anchor } = e;
  let [S, w] = namedModules;
  if (S === undefined) return;
  if (w !== undefined)
    return {
      type: "hook-load-failed",
      source,
      plugin: plugin.name,
      hookPath: w.hooksFilePath,
      reason: `Plugin ${plugin.name} names one hooks module per plugin, but ${namedModules.map((namedModule) => namedModule.hooksFilePath).join(" and ")} each name one in \`modules\`; neither is loaded`,
    };
  let { fullPath, reason } = await resolveComponentPath(
    resolveWithinDir,
    anchor,
    plugin.path,
    join(relative(plugin.path, dirname(S.hooksFilePath)), S.spec),
  );
  if (fullPath === null)
    return {
      type: "path-traversal",
      source,
      plugin: plugin.name,
      path: S.spec,
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
//@ chunk-e6aww6q8.js:4540956-4542014 layout
/**
 * 读 manifest 的 monitors（或 experimental.monitors），缺省时读 monitors/monitors.json，校验后挂到插件对象上（后台常驻监视命令）。
 */
async function loadPluginMonitors(pluginPath, manifest, source, s, h, y, S) {
  let monitors = manifest.experimental?.monitors ?? manifest.monitors;
  let L;
  if (monitors === undefined) {
    let G = join(pluginPath, "monitors", "monitors.json");
    let q = await probeComponentPath(y, G);
    if (q === "present") {
      if (
        await reportIfPathEscapes(S, pluginPath, join("monitors", "monitors.json"), {
          errors: s,
          source,
          plugin: manifest.name,
          component: "monitors",
        })
      )
        return;
      L = G;
    } else if (q !== "absent") reportUncheckablePath(s, source, manifest.name, "monitors", G, q);
  } else if (typeof monitors === "string") {
    let { fullPath, reason } = await resolveComponentPath(resolveWithinDir, h, pluginPath, monitors);
    if (fullPath === null) {
      s.push({
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
    L = fullPath;
  } else return monitors;
  if (L === undefined) return;
  try {
    let G = isStorageV5Enabled() && y !== undefined ? await readFileViaStorageBackend(y, L) : null;
    let q;
    if (G !== null) {
      if (G.outcome !== "found")
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          G.outcome === "error" ? G.detail : `monitors file not found at ${L}`,
          "plugin monitors read failed (v5 backend)",
        );
      q = G.content;
    } else
      q = await readFile(L, {
        encoding: "utf-8",
      });
    return PluginMonitorsArraySchema().parse(jsonParse(q));
  } catch (error) {
    let q = errorMessage(error);
    logForDebugging(`Failed to load monitors for ${manifest.name} from ${L}: ${q}`, {
      level: "error",
    });
    s.push({
      type: "component-load-failed",
      source,
      plugin: manifest.name,
      component: "monitors",
      path: L,
      reason: q,
    });
    return;
  }
}
//@ chunk-e6aww6q8.js:4542014-4542132 layout
/**
 * 把相对路径解析到目录内，越界返回 null。
 */
function resolveWithinDir(e, n) {
  let r = resolve_2(e);
  let s = resolve_2(r, n);
  let h = relative(r, s);
  if (h === ".." || h.startsWith(`..${sep}`) || resolve_2(h) === h) return null;
  return s;
}
//@ chunk-e6aww6q8.js:4542132-4543378 fingerprint = validatePluginPaths (0.466)
/**
 * 校验 manifest 中声明的组件路径：都要在插件目录内且存在，逃逸或不存在的记 path-traversal/path-not-found 错误，返回有效路径。
 */
async function validatePluginPaths(relPaths, pluginPath, name, source, h, y, S, w, L, G = false, q) {
  let checks = await Promise.all(
    relPaths.map(async (relPath) => {
      let { fullPath, reason } = await resolveComponentPath(resolveWithinDir, L, pluginPath, relPath);
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
        ...(await statPluginPath(q, fullPath)),
      };
    }),
  );
  let validPaths = [];
  for (let { relPath, fullPath, exists, isDirectory, reason } of checks) {
    if (fullPath === null) {
      logForDebugging(
        `${y} path ${relPath} ${S} escapes plugin directory for ${name}${reason === undefined ? "" : `: ${reason}`}`,
        {
          level: "error",
        },
      );
      w.push({
        type: "path-traversal",
        source,
        plugin: name,
        path: relPath,
        component: h,
        ...(reason !== undefined && {
          reason,
        }),
      });
      continue;
    }
    if (!exists) {
      logForDebugging(`${y} path ${relPath} ${S} not found at ${fullPath} for ${name}`, {
        level: "error",
      });
      w.push({
        type: "path-not-found",
        source,
        plugin: name,
        path: fullPath,
        component: h,
      });
    } else if (G && !isDirectory) {
      let Me = dirname(relPath);
      let We =
        h === "skills" && basename(relPath).toLowerCase() === "skill.md"
          ? Me === "."
            ? " \u2014 point to the plugin root '.' instead"
            : ` \u2014 point to the parent directory '${Me}' instead`
          : "";
      let reason =
        h === "skills"
          ? `path is a file; skills entries must be directories containing SKILL.md${We}`
          : "path is a file; expected a directory";
      logForDebugging(`${y} path ${relPath} ${S} is a file, not a directory, for ${name}`, {
        level: "error",
      });
      w.push({
        type: "component-load-failed",
        source,
        plugin: name,
        path: relPath,
        component: h,
        reason,
      });
    } else validPaths.push(fullPath);
  }
  return validPaths;
}
//@ chunk-e6aww6q8.js:4543378-4546074 fingerprint = finishLoadingPluginFromPath (0.446)
/**
 * 处理 manifest 或 marketplace 条目中 commands 的对象形式（name → {source|content,…}）与路径数组：解析路径、校验逃逸、内联内容注册，结果写入插件对象。
 */
async function finishLoadingPluginFromPath(e, commands, r, s) {
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
  } = r;
  let ke = origin === "manifest" ? "specified in manifest but" : "from marketplace entry";
  let we = origin === "manifest" ? "manifest" : "marketplace entry";
  let Ee = Object.values(commands)[0];
  if (
    typeof commands === "object" &&
    !Array.isArray(commands) &&
    Ee &&
    typeof Ee === "object" &&
    ("source" in Ee || "content" in Ee)
  ) {
    let We =
      mode === "append"
        ? {
            ...(e.commandsMetadata || {}),
          }
        : {};
    let ze = 0;
    let lt = [];
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
            exists: fullPath !== null && (await isCachePresent(s, fullPath)),
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
        We[check.commandName] = check.metadata;
        ze++;
        continue;
      }
      if (check.fullPath === null) {
        logForDebugging(
          `Command ${check.commandName} source ${check.metadata.source} ${ke} escapes plugin directory for ${pluginName}${check.reason === undefined ? "" : `: ${check.reason}`}`,
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
        lt.push(check.fullPath);
        We[check.commandName] = check.metadata;
        ze++;
      } else {
        logForDebugging(
          `Command ${check.commandName} path ${check.metadata.source} ${ke} not found at ${check.fullPath} for ${pluginName}`,
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
    if (lt.length > 0) e.commandsPaths = mode === "append" ? [...(e.commandsPaths || []), ...lt] : lt;
    if (ze > 0) e.commandsMetadata = We;
    return;
  }
  let Ae = Array.isArray(commands) ? commands : [commands];
  let checks = await Promise.all(
    Ae.map(async (cmdPath) => {
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
        exists: fullPath !== null && (await isCachePresent(s, fullPath)),
      };
    }),
  );
  let Me = [];
  for (let check of checks) {
    if (check.kind === "invalid") {
      logForDebugging(`Unexpected command format in ${we} for ${pluginName}`, {
        level: "error",
      });
      continue;
    }
    if (check.fullPath === null) {
      logForDebugging(
        `Command path ${check.cmdPath} ${ke} escapes plugin directory for ${pluginName}${check.reason === undefined ? "" : `: ${check.reason}`}`,
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
    if (check.exists) Me.push(check.fullPath);
    else {
      logForDebugging(
        `Command path ${check.cmdPath} ${ke} not found at ${check.fullPath} for ${pluginName}`,
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
  if (Me.length > 0) e.commandsPaths = mode === "append" ? [...(e.commandsPaths || []), ...Me] : Me;
}
//@ chunk-e6aww6q8.js:4547805-4555972 placement = createPluginFromPath (0.485)
/**
 * 由插件目录构造 LoadedPlugin：读 manifest；默认目录 commands/、agents/、skills/、output-styles/、themes/、workflows/ 存在即挂 *Path，manifest 指定的路径挂 *Paths（并做目录逃逸检查）；根目录 SKILL.md 视为单技能插件；读 hooks/hooks.json 与 manifest.hooks、monitors、mcpServers、lspServers、settings、userConfig 等；错误收集到 errors 数组。
 */
async function createPluginFromPath(pluginPath, pluginSource, enabled, fallbackName, h = true, y, S, w, L) {
  let G = [];
  let q = [];
  let Z = S ?? (await resolveContainmentRoots([pluginPath], "plugin directory"));
  let { manifest, manifestPath, depConstraints } = await loadPluginManifest(
    pluginPath,
    fallbackName,
    pluginSource,
    [],
    {
      ...w,
      containedIn: L,
    },
    y,
  );
  let Ee = {
    name: manifest.name,
    manifest,
    path: pluginPath,
    source: pluginSource,
    repository: pluginSource,
    enabled,
    depConstraints,
  };
  let Ae = new Map();
  let Ie = async (ao) => {
    try {
      await stat(join(pluginPath, ao));
      return true;
    } catch (error) {
      if (!isPathAbsent(error)) Ae.set(ao, getErrnoCode(error) ?? "UNKNOWN");
      return false;
    }
  };
  let [Me, We, ze, lt, Je, nt] = await (async () => {
    let ao = ["commands", "agents", "skills", "output-styles", "themes"];
    let $o =
      isStorageV5Enabled() && y !== undefined
        ? parseVersionCachePath(pluginPath, anchoredPluginCachePath())
        : null;
    if (isStorageV5Enabled() && y !== undefined && $o !== null) {
      let yo = new Set();
      let Ho;
      let rr = false;
      do {
        let br = await y.listEntries(
          {
            namespace: "pluginCache",
            marketplace: $o.marketplace,
            plugin: $o.plugin,
            version: $o.version,
          },
          {
            skipKeyStats: true,
            ...(Ho === undefined
              ? {}
              : {
                  cursor: Ho,
                }),
          },
        );
        if (!br.ok) {
          rr = true;
          break;
        }
        for (let item of br.value.items) {
          let Fr =
            item.kind === "scope" && item.scope.namespace === "pluginCache"
              ? item.scope.relPath?.at(-1)
              : undefined;
          if (Fr !== undefined) yo.add(Fr);
        }
        Ho = br.value.cursor;
      } while (Ho !== undefined);
      if (!rr) {
        let br = (Hr, Fr) => (Fr ? Promise.resolve(true) : Ie(Hr));
        return Promise.all([...ao.map((Hr) => br(Hr, yo.has(Hr))), br("workflows", yo.has("workflows"))]);
      }
    }
    return Promise.all([...ao.map((cmdPath) => Ie(cmdPath)), Ie("workflows")]);
  })();
  for (let [ao, $o] of [...Ae].sort(([yo], [Ho]) => yo.localeCompare(Ho))) {
    let fullPath = join(pluginPath, ao);
    logForDebugging(
      `Plugin ${manifest.name}: could not check the default ${ao}/ folder at ${fullPath} (${$o}); not loading it`,
      {
        level: "error",
      },
    );
    G.push({
      type: "path-not-found",
      source: pluginSource,
      plugin: manifest.name,
      path: fullPath,
      component: ao,
      errno: $o,
    });
  }
  let { marketplace } = parsePluginIdentifier_2(pluginSource);
  for (let [ao, $o, yo, Ho] of [
    ["commands", Me, "commands", "commands"],
    ["agents", We, "agents", "agents"],
    ["outputStyles", lt, "output-styles", "output-styles"],
    ["themes", Je, "themes", "themes"],
  ]) {
    let rr = manifest.experimental?.[ao];
    let br = manifest[ao];
    if (ao === "themes") br = manifest.experimental?.themes ?? manifest.themes;
    else if (ao === "outputStyles") br = manifest.outputStyles;
    let Hr = [];
    if (rr !== undefined) Hr.push(`experimental.${ao}`);
    if (manifest[ao] !== undefined && (rr === undefined || true)) Hr.push(ao);
    if (!br || !$o) continue;
    logPluginFolderShadowed(manifest.name, marketplace, yo);
    let Fr = join(pluginPath, Ho);
    if (specCoversDefaultDir(br, pluginPath, Fr)) continue;
    logForDebugging(
      `Plugin ${manifest.name}: ${Ho}/ folder exists but is not auto-loaded because the manifest sets ${Hr.map((cs) => `"${cs}"`).join(" and ")}`,
    );
    q.push({
      type: "folder-shadowed-by-manifest",
      source: pluginSource,
      plugin: manifest.name,
      component: yo,
      folderPath: Fr,
      manifestFields: Hr,
    });
  }
  if (manifest.workflows && nt) {
    logPluginFolderShadowed(manifest.name, marketplace, "workflows");
    let ao = join(pluginPath, "workflows");
    if (!specCoversDefaultDir(manifest.workflows, pluginPath, ao))
      q.push({
        type: "folder-shadowed-by-manifest",
        source: pluginSource,
        plugin: manifest.name,
        component: "workflows",
        folderPath: ao,
        manifestFields: [
          manifest.experimental?.workflows !== undefined ? "experimental.workflows" : "workflows",
        ],
      });
  }
  if (
    (manifest.experimental?.monitors ?? manifest.monitors) !== undefined &&
    (await isCachePresent(y, join(pluginPath, "monitors", "monitors.json")))
  )
    logPluginFolderShadowed(manifest.name, marketplace, "monitors");
  let Et = !manifest.commands && Me;
  let yt = !manifest.agents && We;
  let gt = ze;
  let outputStyles = manifest.outputStyles;
  let It = !outputStyles && lt;
  let Yt = !(manifest.experimental?.themes ?? manifest.themes) && Je;
  let qt = !manifest.workflows && nt;
  let commandsPath = join(pluginPath, "commands");
  if (Et) Ee.commandsPath = commandsPath;
  if (manifest.commands)
    await finishLoadingPluginFromPath(
      Ee,
      manifest.commands,
      {
        pluginPath,
        pluginName: manifest.name,
        errorSource: pluginSource,
        mode: "assign",
        origin: "manifest",
        resolvePath: resolveWithinDir,
        anchor: Z,
        registerInlineContent: true,
        errors: G,
      },
      y,
    );
  let agentsPath = join(pluginPath, "agents");
  if (yt) Ee.agentsPath = agentsPath;
  if (manifest.agents) {
    let ao = Array.isArray(manifest.agents) ? manifest.agents : [manifest.agents];
    let $o = await validatePluginPaths(
      ao,
      pluginPath,
      manifest.name,
      pluginSource,
      "agents",
      "Agent",
      "specified in manifest but",
      G,
      Z,
      false,
      y,
    );
    if ($o.length > 0) Ee.agentsPaths = $o;
  }
  let skillsPath = join(pluginPath, "skills");
  if (gt) Ee.skillsPath = skillsPath;
  if (manifest.skills) {
    let ao = Array.isArray(manifest.skills) ? manifest.skills : [manifest.skills];
    let $o = resolve_2(skillsPath);
    let yo = resolve_2(pluginPath);
    let filtered = (
      await validatePluginPaths(
        ao,
        pluginPath,
        manifest.name,
        pluginSource,
        "skills",
        "Skill",
        "specified in manifest but",
        G,
        Z,
        true,
        y,
      )
    ).filter((rr) => {
      let br = resolve_2(rr);
      if (br === $o) return false;
      if (marketplace === SKILLS_DIR && br === yo) return false;
      return true;
    });
    if (filtered.length > 0) Ee.skillsPaths = filtered;
  } else if (!gt && marketplace !== SKILLS_DIR) {
    let ao = join(pluginPath, "SKILL.md");
    let $o = await probeComponentPath(y, ao);
    if (
      $o === "present" &&
      !(await reportIfPathEscapes(L, pluginPath, "SKILL.md", {
        errors: G,
        source: pluginSource,
        plugin: manifest.name,
        component: "skills",
      }))
    )
      Ee.skillsPaths = [pluginPath];
    else if (typeof $o === "object") reportUncheckablePath(G, pluginSource, manifest.name, "skills", ao, $o);
  }
  let outputStylesPath = join(pluginPath, "output-styles");
  if (It) Ee.outputStylesPath = outputStylesPath;
  if (outputStyles) {
    let ao = Array.isArray(outputStyles) ? outputStyles : [outputStyles];
    let $o = await validatePluginPaths(
      ao,
      pluginPath,
      manifest.name,
      pluginSource,
      "output-styles",
      "Output style",
      "specified in manifest but",
      G,
      Z,
      false,
      y,
    );
    if ($o.length > 0) Ee.outputStylesPaths = $o;
  }
  let themesPath = join(pluginPath, "themes");
  if (Yt) Ee.themesPath = themesPath;
  let themes = manifest.experimental?.themes ?? manifest.themes;
  if (themes) {
    let ao = Array.isArray(themes) ? themes : [themes];
    let $o = await validatePluginPaths(
      ao,
      pluginPath,
      manifest.name,
      pluginSource,
      "themes",
      "Theme",
      "specified in manifest but",
      G,
      Z,
      false,
      y,
    );
    if ($o.length > 0) Ee.themesPaths = $o;
  }
  if (qt) Ee.workflowsPath = join(pluginPath, "workflows");
  if (manifest.workflows) {
    let ao = Array.isArray(manifest.workflows) ? manifest.workflows : [manifest.workflows];
    let $o = await validatePluginPaths(
      ao,
      pluginPath,
      manifest.name,
      pluginSource,
      "workflows",
      "Workflow",
      "specified in manifest but",
      G,
      Z,
      false,
      y,
    );
    if ($o.length > 0) Ee.workflowsPaths = $o;
  }
  let base;
  let loadedHookPaths = new Set();
  let Xn = new Set();
  let fo = [];
  let standardHooksPath = join(pluginPath, "hooks", "hooks.json");
  let bo = await probeComponentPath(y, standardHooksPath);
  let vn =
    bo === "present" &&
    (await reportIfPathEscapes(L, pluginPath, join("hooks", "hooks.json"), {
      errors: G,
      source: pluginSource,
      plugin: manifest.name,
      component: "hooks",
    }));
  if (bo === "present" && !vn)
    try {
      let { hooks, modules } = await loadPluginHooks_3(standardHooksPath, manifest.name, y);
      base = Object.keys(hooks).length > 0 ? hooks : undefined;
      for (let spec of modules)
        fo.push({
          hooksFilePath: standardHooksPath,
          spec,
        });
      let yo = standardHooksPath;
      try {
        yo = await getFsImplementation().realpath(standardHooksPath);
      } catch {}
      loadedHookPaths.add(yo);
      Xn.add(yo);
      Xn.add(standardHooksPath);
      logForDebugging(
        `Read hooks.json for plugin ${manifest.name} (enabled=${enabled}${enabled ? "" : "; will NOT register, plugin is disabled"}): ${standardHooksPath}`,
      );
    } catch (error) {
      if (error instanceof HookValidationError) throw error;
      let errorMsg = errorMessage(error);
      logForDebugging(`Failed to load hooks for ${manifest.name}: ${errorMsg}`, {
        level: "error",
      });
      G.push({
        type: "hook-load-failed",
        source: pluginSource,
        plugin: manifest.name,
        hookPath: standardHooksPath,
        reason: errorMsg,
      });
    }
  else if (typeof bo === "object") {
    logForDebugging(`Could not determine whether ${manifest.name} ships hooks/hooks.json: ${bo.unknown}`, {
      level: "error",
    });
    G.push({
      type: "hook-load-failed",
      source: pluginSource,
      plugin: manifest.name,
      hookPath: standardHooksPath,
      reason: `Could not determine whether ${standardHooksPath} exists: ${bo.unknown}`,
      ...(bo.errno !== undefined && {
        errno: bo.errno,
      }),
    });
  }
  if (manifest.hooks) {
    let ao = Array.isArray(manifest.hooks) ? manifest.hooks : [manifest.hooks];
    for (let hookSpec of ao)
      if (typeof hookSpec === "string") {
        if (vn && resolveWithinDir(pluginPath, hookSpec) === resolve_2(standardHooksPath)) continue;
        let { fullPath, reason, real } = await resolveComponentPath(
          resolveWithinDir,
          Z,
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
          G.push({
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
        if (!(await isCachePresent(y, fullPath))) {
          logForDebugging(
            `Hooks file ${hookSpec} specified in manifest but not found at ${fullPath} for ${manifest.name}`,
            {
              level: "error",
            },
          );
          G.push({
            type: "path-not-found",
            source: pluginSource,
            plugin: manifest.name,
            path: fullPath,
            component: "hooks",
          });
          continue;
        }
        let br = real ?? fullPath;
        if (Xn.has(br)) {
          logForDebugging(
            `Hooks file ${hookSpec} in the manifest of plugin ${manifest.name} names the standard hooks/hooks.json, which loads on its own; loaded once`,
          );
          continue;
        }
        if (loadedHookPaths.has(br)) {
          logForDebugging(
            `Skipping duplicate hooks file for plugin ${manifest.name}: ${hookSpec} (resolves to already-loaded file: ${br})`,
          );
          if (h) {
            let errorMsg = `Duplicate hooks file detected: ${hookSpec} resolves to already-loaded file ${br}; manifest.hooks lists it more than once.`;
            logForDebugging(errorMsg, {
              level: "error",
            });
            G.push({
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
          let pluginHooks = await loadPluginHooks_3(fullPath, manifest.name, y);
          try {
            if (Object.keys(pluginHooks.hooks).length > 0) base = mergeHooksSettings(base, pluginHooks.hooks);
            loadedHookPaths.add(br);
            for (let spec of pluginHooks.modules)
              fo.push({
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
            G.push({
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
          G.push({
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
              .filter((br) => unloadableGuards.includes(br.path))
              .map((br) => `${br.path}: ${br.reason}`)
              .join("; "),
          );
        G.push(...toHookLoadErrors(invalid, pluginSource, manifest.name, manifestPath ?? pluginPath));
        if (hooks) base = mergeHooksSettings(base, hooks);
      }
  }
  let pluginHooksModule = await loadPluginHooksModule({
    plugin: Ee,
    namedModules: fo,
    source: pluginSource,
    storageV5: y,
    anchor: Z,
  });
  if (pluginHooksModule !== undefined) G.push(pluginHooksModule);
  if (base) Ee.hooksConfig = base;
  let pluginMonitors = await loadPluginMonitors(pluginPath, manifest, pluginSource, G, Z, y, L);
  if (pluginMonitors) Ee.monitors = pluginMonitors;
  let ko = await reportIfPathEscapes(L, pluginPath, "settings.json", {
    errors: G,
    source: pluginSource,
    plugin: manifest.name,
    component: "settings",
  });
  let pluginSettings = await loadPluginSettings(pluginPath, manifest, y, ko);
  if (pluginSettings) Ee.settings = pluginSettings;
  return {
    plugin: Ee,
    errors: G,
    warnings: q,
    hasManifest: manifestPath !== null,
    manifestPath,
  };
}
//@ chunk-e6aww6q8.js:4555972-4556034 layout
var PluginAllowedSettingsSchema = DoctorLazy(() =>
  u(Object.fromEntries(SETTINGS_KEYS_WITH_PLUGIN_ENUM.map((e) => [e, getSettingsFieldSchema(e)]))),
);
//@ chunk-e6aww6q8.js:4556034-4556154 file-local
function parsePluginSettings(raw) {
  let result = PluginAllowedSettingsSchema().safeParse(raw);
  if (!result.success) return;
  let data = result.data;
  if (Object.keys(data).length === 0) return;
  return data;
}
//@ chunk-e6aww6q8.js:4556154-4557356 fingerprint = loadPluginSettings (0.6)
/**
 * 读取插件根目录 settings.json（或 manifest.settings），只保留白名单键，作为插件启用期间合并进用户设置的值。
 */
async function loadPluginSettings(pluginPath, manifest, r, s = false) {
  let settingsJsonPath = join(pluginPath, "settings.json");
  let y = false;
  try {
    if (s)
      throw Object.assign(Error("settings.json not read"), {
        code: "ENOENT",
      });
    let S =
      isStorageV5Enabled() && r !== undefined ? await readFileViaStorageBackend(r, settingsJsonPath) : null;
    let w;
    if (S !== null) {
      if (S.outcome === "absent")
        throw Object.assign(Error("settings.json absent"), {
          code: "ENOENT",
        });
      if (S.outcome === "error")
        throw Object.assign(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            S.detail,
            "plugin settings read failed (v5 backend)",
          ),
          S.telemetryCode !== undefined
            ? {
                code: S.telemetryCode,
              }
            : {},
        );
      w = S.content;
    } else
      w = await readFile(settingsJsonPath, {
        encoding: "utf-8",
      });
    let parsed = jsonParse(w);
    if (isPlainObject_5(parsed)) {
      let filtered = parsePluginSettings(parsed);
      if (filtered) {
        logForDebugging(`Loaded settings from settings.json for plugin ${manifest.name}`);
        logFeatureOk("plugin_load_settings");
        return filtered;
      }
    }
  } catch (e) {
    if (!isFsInaccessible(e)) {
      y = true;
      logForDebugging(`Failed to parse settings.json for plugin ${manifest.name}: ${e}`, {
        level: "warn",
      });
    }
  }
  if (manifest.settings) {
    let filtered = parsePluginSettings(manifest.settings);
    if (filtered) {
      logForDebugging(`Loaded settings from manifest for plugin ${manifest.name}`);
      if (s) logFeatureSad("plugin_load_settings", "plugin_load_settings_containment_refused");
      else if (y) logFeatureSad("plugin_load_settings", "plugin_load_settings_parse_failed");
      else logFeatureOk("plugin_load_settings");
      return filtered;
    }
  }
  if (s) logFeatureSad("plugin_load_settings", "plugin_load_settings_containment_refused");
  else if (y) logFeatureSad("plugin_load_settings", "plugin_load_settings_parse_failed");
  else logFeatureOk("plugin_load_settings");
  return;
}
//@ chunk-e6aww6q8.js:4557356-4558076 layout
/**
 * 解析 marketplace 条目里内联的 hooks：只支持对象形式（事件名 → matcher 数组），文件路径与数组形式报 hook-load-failed。
 */
function parseMarketplaceEntryHooks(hooks, source, plugin, hookPath) {
  let h =
    "Define hooks in the plugin's own hooks/hooks.json (or its plugin.json), or inline them here as an object mapping hook event names to matcher arrays.";
  if (Array.isArray(hooks) && hasGuardHooks_2(hooks))
    throw new HookValidationError(
      `hooks: the array form is not yet supported in a marketplace entry (${UNLOADABLE_GUARD_NOTE}). ${h}`,
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
          reason: `hooks: the file-path and array forms are not yet supported in a marketplace entry. ${h}`,
        },
      ],
    };
  let { hooks: hooks_2, invalid, unloadableGuards } = parseHooksSetting(hooks);
  if (unloadableGuards.length > 0)
    throw new HookValidationError(
      invalid
        .filter((L) => unloadableGuards.includes(L.path))
        .map((L) => `${L.path}: ${L.reason}`)
        .join("; "),
    );
  return {
    hooks: hooks_2,
    errors: toHookLoadErrors(invalid, source, plugin, hookPath),
  };
}
//@ chunk-e6aww6q8.js:4558076-4558210 layout
function toHookLoadErrors(invalid, source, plugin, hookPath) {
  return invalid.map(({ path, reason }) => ({
    type: "hook-load-failed",
    source,
    plugin,
    hookPath,
    reason: `${path}: ${reason}`,
  }));
}
//@ chunk-e6aww6q8.js:4558210-4558343 file-local
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
//@ chunk-e6aww6q8.js:4558343-4560222 placement
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
  let Se = isDependencyAutoInstallState(enabledValue);
  if (!npmMarketplaceEnabled()) {
    if (Se)
      errors.push({
        type: "generic-error",
        source: pluginId,
        plugin: packageName,
        error: NPM_DIRECT_INSTALL_DISABLED_MESSAGE,
      });
    return null;
  }
  let trustedRoots = getMarketplaceCandidatePaths(pluginId, knownMarketplaces, tryUnwrapTextPayload());
  let we = await pickUsableInstallation(installations, {
    storageV5,
    trustedRoots,
  });
  let Ee =
    we === undefined
      ? undefined
      : {
          ...we,
          installPath: resolve_2(getOriginalCwd(), we.installPath),
        };
  if (Ee === undefined) {
    if (Se)
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
    we !== undefined &&
    classifyMarketplacePath(we.installPath, {
      trustedRoots,
    }).suspect
  ) {
    if (Se)
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
  let Ae =
    Ee.npmResolved !== undefined
      ? npmResolutionPolicyRefusal({
          packageName,
          tarballUrl: Ee.npmResolved,
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
  if (Ae !== null) {
    if (Se)
      errors.push({
        type: "generic-error",
        refused: true,
        source: pluginId,
        plugin: packageName,
        error: Ae,
      });
    return null;
  }
  let entry = toNpmMarketplaceSource(packageName, Ee);
  let Me = await (cacheOnly
    ? loadCachedMarketplacePlugin(
        entry,
        NPM_REGISTRY,
        undefined,
        pluginId,
        enabledValue === true,
        errors,
        warnings,
        Ee.installPath,
        installations?.find((installation) => installation.installPath)?.installPath,
        {
          storageV5,
          preview,
          entryEnabled: Se,
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
        Ee.version,
        undefined,
        {
          storageV5,
          entryEnabled: Se,
          credentials,
          installRecord: registryReadFailed ? "unknown" : "present",
          recordedArchiveSha256: undefined,
          recordedClaudeAiPluginId: undefined,
          recordedNpmIntegrity: Ee.npmIntegrity,
        },
      ));
  if (Me && Ee.npmResolved !== undefined) {
    let We = redactNpmTarball({
      packageName,
      tarballUrl: Ee.npmResolved,
    });
    if (We !== null) Me.npmResolution = We;
  }
  return Me;
}
//@ chunk-e6aww6q8.js:4560222-4560423 placement
/**
 * 合并 --add-dir 目录与设置的 enabledPlugins，过滤出 ID 合法、非 builtin、非保留市场的条目。
 */
function getEnabledPluginEntries() {
  let e = {
    ...getAddDirEnabledPlugins(),
    ...(getSettings_DEPRECATED().enabledPlugins || {}),
  };
  return Object.entries(e).filter(([key, value]) => {
    if (!PluginIdSchema().safeParse(key).success || value === undefined) return false;
    let { marketplace } = parsePluginIdentifier(key);
    return marketplace !== BUILTIN && !isOfficialMarketplace_2(marketplace);
  });
}
//@ chunk-e6aww6q8.js:4560423-4560460 placement
/**
 * 是否有启用的市场插件条目（用于决定刷新策略）。
 */
function hasMarketplaceBackedPlugins() {
  return getEnabledPluginEntries().length > 0;
}
//@ chunk-e6aww6q8.js:4560460-4573903 callgraph-witnessed = loadPluginsFromMarketplaces (0.141)
/**
 * 加载全部市场插件：读 known_marketplaces 与 enabledPlugins，套用 strictKnownMarketplaces/blockedMarketplaces 策略，对每个启用插件找安装记录与缓存（cacheOnly 时缓存缺失只报 plugin-cache-miss），调用 loadPluginFromMarketplaceEntry；收集 errors/warnings。
 */
async function loadPluginsFromMarketplaces({ cacheOnly, preview = false, storageV5, credentials }) {
  let now = Date.now();
  let y = [];
  let S = [];
  let w = [];
  let enabledPluginEntries = getEnabledPluginEntries();
  let knownMarketplaces = await loadKnownMarketplacesSafe(storageV5);
  let q = isKnownMarketplacesReadFailure(knownMarketplaces);
  let Z = admissionKindsFor(knownMarketplaces);
  let Se = (marketplaceName) => admissionCauseFor(knownMarketplaces, marketplaceName);
  let strictAllowlist = getStrictKnownMarketplaces();
  let blocklist = isMarketplaceRestrictionPolicyActive();
  let Ee = new Set(
    enabledPluginEntries
      .map(([yn]) => parsePluginIdentifier(yn).marketplace)
      .filter((yn) => !!yn && yn.toLowerCase() !== pluginManifestPathSchemas),
  );
  let Ae = q ? undefined : validateDeclaredMarketplaceSource(Ee, knownMarketplaces);
  let Ie = new Set(Object.keys(Ae?.additions ?? {}));
  let Me = new Map(Ae?.skipped);
  let We =
    Ie.size === 0
      ? knownMarketplaces
      : {
          ...knownMarketplaces,
          ...Ae?.additions,
        };
  let ze = new Map();
  let lt = new Set();
  await Promise.all(
    [...Ee].map(async (yn) => {
      let Kn = Object.hasOwn(We, yn) ? We[yn] : undefined;
      let Xn = Ie.has(yn);
      let fo = {
        registryEntry: Kn,
        registryEntryIsSaved: !Xn,
        unreadableCatalogs: lt,
      };
      let marketplaceCacheOnly = await getMarketplaceCacheOnly(yn, storageV5, fo);
      if (Xn && (marketplaceCacheOnly === null || marketplaceCacheOnly.name !== yn)) {
        let vn = We[yn];
        let co = printableOrEmpty(vn?.installLocation ?? "");
        if (marketplaceCacheOnly === null) {
          Me.set(yn, `no marketplace manifest could be read at its declared location ${co}`);
          logMarketplaceNoticeOnce(
            `declared-unreadable:${yn}:${co}`,
            `Marketplace ${jsonStringify(yn)} is declared in settings, but no marketplace manifest could be read at ${co} (.claude-plugin/marketplace.json missing or invalid): left to the reconciler, its plugins do not load from the declaration`,
          );
        } else {
          Me.set(
            yn,
            `the marketplace at its declared location names itself ${jsonStringify(marketplaceCacheOnly.name)}`,
          );
          logMarketplaceNoticeOnce(
            `catalog-name:${yn}:${marketplaceCacheOnly.name}`,
            `Marketplace ${jsonStringify(yn)} is declared in settings, but the marketplace at the declared path names itself ${jsonStringify(marketplaceCacheOnly.name)}: declare it under that name (its plugins are enabled as <plugin>@${marketplaceCacheOnly.name})`,
          );
        }
        delete We[yn];
        Ie.delete(yn);
        lt.delete(yn);
        ze.set(yn, null);
        return;
      }
      let bo =
        Kn !== undefined &&
        !Xn &&
        !isClaudeAiMarketplaceSource(Kn.source) &&
        !isPluginDirectorySource(Kn.source) &&
        validateReservedMarketplaceEntry(yn, Kn) === null &&
        !isImpersonatingOfficialMarketplace(yn, Kn);
      for (let vn of ARCHIVE_RETRY_DELAYS_MS) {
        if (marketplaceCacheOnly !== null || !bo) break;
        await sleep(vn);
        marketplaceCacheOnly = await getMarketplaceCacheOnly(yn, storageV5, fo);
        if (marketplaceCacheOnly !== null)
          logForDebugging(
            `Marketplace ${yn}: catalog readable again after a re-read (another process was refreshing it)`,
          );
      }
      ze.set(yn, marketplaceCacheOnly);
    }),
  );
  let Je = [];
  let uniqueMarketplaces = new Set(enabledPluginEntries.map(([yn]) => yn));
  let pt = new Map();
  let flattened = enabledPluginEntries.flatMap(([yn, Kn]) => {
    let { name: Xn, marketplace } = parsePluginIdentifier(yn);
    let To = marketplace ? ze.get(marketplace) : null;
    let bo = marketplace ? We[marketplace] : undefined;
    if (!Xn || !marketplace || !To?.renames || Kn === false || isSourceDisallowedOrUnverifiable(bo?.source))
      return [[yn, Kn]];
    let vn = pt.get(marketplace);
    if (!vn) {
      vn = new Set(To.plugins.map((plugin) => plugin.name));
      pt.set(marketplace, vn);
    }
    if (vn.has(Xn)) return [[yn, Kn]];
    let pluginRename = resolvePluginRename(Xn, To.renames, vn);
    if (pluginRename === null) return [[yn, Kn]];
    if (pluginRename.kind === "unresolved") {
      if (!preview) logPluginRenamed(Xn, marketplace, pluginRename);
      logForDebugging(
        `Plugin "${yn}" has a renames entry but it does not resolve (${pluginRename.reason}); falling through to plugin-not-found`,
        {
          level: "warn",
        },
      );
      return [[yn, Kn]];
    }
    let So = pluginRename.kind === "renamed" ? `${pluginRename.to}@${marketplace}` : null;
    if (So !== null && !PluginIdSchema().safeParse(So).success) {
      if (!preview)
        logPluginRenamed(Xn, marketplace, {
          kind: "unresolved",
          reason: "target-missing",
        });
      logForDebugging(
        `Plugin "${yn}" rename target "${So}" is not a valid PluginIdSchema id; falling through to plugin-not-found`,
        {
          level: "warn",
        },
      );
      return [[yn, Kn]];
    }
    if (!preview) logPluginRenamed(Xn, marketplace, pluginRename);
    Je.push({
      marketplace,
      oldName: Xn,
      oldId: yn,
      newId: So,
      resolution: pluginRename,
    });
    w.push({
      type: "plugin-renamed",
      source: yn,
      plugin: Xn,
      marketplace,
      renamedTo: pluginRename.kind === "renamed" ? pluginRename.to : null,
    });
    if (So === null || uniqueMarketplaces.has(So)) return [];
    uniqueMarketplaces.add(So);
    return [[So, Kn]];
  });
  if (!preview && Je.length > 0)
    try {
      await removeInstallationsAndRefreshSnapshot(
        Je.flatMap((yn) =>
          yn.newId === null
            ? []
            : [
                {
                  oldId: yn.oldId,
                  newId: yn.newId,
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
  let yt = preview
    ? isStorageV5Enabled() && storageV5 !== undefined
      ? await loadInstalledPlugins(storageV5)
      : loadInstalledPluginsSync()
    : getInstalledPluginsSnapshot();
  let gt = hasFailedInstalledPluginsRead(yt);
  let At = gt ? await readInstalledPluginsLenient(storageV5) : {};
  let It = isOfficialMarketplaceSourced(knownMarketplaces);
  let Yt = pluginDirectoryPolicyBlock();
  let qt = flattened.some(([yn]) => yn.endsWith(`@${OFFICIAL_MARKETPLACE_NAME}`))
    ? await bindingsWithReadFailure()
    : new Map();
  let Zt = (yn) => {
    let Kn;
    let marketplaceCatalogs = new Map();
    return (name) => {
      let To = marketplaceCatalogs.get(name);
      if (To === undefined) {
        Kn ??= toComparablePath(yn());
        let comparablePath = toComparablePath(name);
        To =
          comparablePath !== Kn &&
          isPathWithin_2(Kn, comparablePath, {
            alreadyComparable: true,
          });
        marketplaceCatalogs.set(name, To);
      }
      return To;
    };
  };
  let rn = Zt(getResolvedMarketplacesCacheDir);
  let pn = Zt(anchoredPluginCachePath);
  let no = (yn) => pn(yn.extractedFrom ?? yn.path);
  let results = await Promise.allSettled(
    flattened.map(async ([realCandidate, Kn]) => {
      let { name: pluginName, marketplace: marketplaceName } = parsePluginIdentifier(realCandidate);
      if (marketplaceName === pluginManifestPathSchemas)
        return loadNpmMarketplacePlugin({
          pluginId: realCandidate,
          packageName: pluginName,
          enabledValue: Kn,
          installations: yt.plugins[realCandidate],
          registryReadFailed: gt,
          knownMarketplaces: We,
          cacheOnly,
          preview,
          storageV5,
          credentials,
          errors: S,
          warnings: w,
        });
      let To = We[marketplaceName];
      let bo = marketplaceName === OFFICIAL_MARKETPLACE_NAME && It ? undefined : Z.get(marketplaceName);
      let vn = bo === undefined ? undefined : Se(marketplaceName);
      let co = q || bo !== undefined;
      let So = () => ({
        type: "marketplace-not-found",
        source: realCandidate,
        marketplace: marketplaceName,
        availableMarketplaces: Object.keys(We),
        ...(q && {
          registryReadFailed: true,
        }),
        ...(bo !== undefined && {
          registrationHidden: bo,
        }),
        ...(vn !== undefined && {
          registrationHiddenReason: vn,
        }),
      });
      let ko =
        !To &&
        !co &&
        marketplaceName === OFFICIAL_MARKETPLACE_NAME &&
        isSourceAllowedByPolicy({
          source: "pluginDirectory",
        });
      if (!To && blocklist && !ko) {
        if (co) {
          if (isDependencyAutoInstallState(Kn)) S.push(So());
          else logForDebugging(`Skipping load-failure error for disabled plugin ${realCandidate}`);
          return null;
        }
        S.push({
          type: "marketplace-blocked-by-policy",
          source: realCandidate,
          plugin: pluginName,
          marketplace: marketplaceName,
          blockedByBlocklist: strictAllowlist === null,
          allowedSources: (strictAllowlist ?? []).map((rs) => formatSourceForDisplay(rs)),
          sourceUnverifiable: true,
        });
        return null;
      }
      if (To) {
        let rs = validateReservedMarketplaceEntry(marketplaceName, To);
        if (rs) {
          if (isDependencyAutoInstallState(Kn))
            S.push({
              type: "marketplace-load-failed",
              source: realCandidate,
              marketplace: marketplaceName,
              reason: rs,
              untrustedReservedName: true,
            });
          else logForDebugging(`Skipping reserved-name refusal error for disabled plugin ${realCandidate}`);
          return null;
        }
      }
      if (To && !isSourceAllowedByPolicy(To.source)) {
        let isBlocked = isSourceInBlocklist(To.source);
        let Es = getStrictKnownMarketplaces() || [];
        S.push({
          type: "marketplace-blocked-by-policy",
          source: realCandidate,
          plugin: pluginName,
          marketplace: marketplaceName,
          blockedByBlocklist: isBlocked,
          allowedSources: isBlocked ? [] : Es.map((Nr) => formatSourceForDisplay(Nr)),
          ...(isPluginDirectorySource(To.source) && isPluginDirectoryDisabledByPolicy()
            ? {
                directoryDisabledByOrganization: true,
              }
            : {}),
        });
        return null;
      }
      let result = null;
      let marketplace = ze.get(marketplaceName);
      if (marketplace && To) {
        let entry = marketplace.plugins.find((plugin) => plugin.name === pluginName);
        if (entry)
          result = {
            entry,
            marketplaceInstallLocation: To.installLocation,
          };
      } else if (ko) result = await findPluginDirectoryEntry(pluginName, storageV5, "load");
      else result = await getPluginByIdCacheOnly(realCandidate, storageV5);
      if (
        !result &&
        marketplaceName === OFFICIAL_MARKETPLACE_NAME &&
        (To || ko) &&
        (gt || !!yt.plugins[realCandidate]?.length)
      )
        result = await findMissedListingEntry(pluginName, storageV5, ko || !marketplace);
      let $o = pluginBindingValues(yt.plugins, realCandidate);
      if (result && isUnboundOfficialPlugin(realCandidate, $o, qt, gt)) {
        if (isDependencyAutoInstallState(Kn))
          S.push({
            type: "generic-error",
            source: realCandidate,
            plugin: pluginName,
            error: `Not loading ${printableName(realCandidate, 200)}: plugin-directory-bindings.json in the plugins folder could not be used (unreadable, a symbolic link or not a file, over 1 MB, damaged, or written by a newer Claude Code), so its ${OFFICIAL_MARKETPLACE_DISPLAY} listing could not be checked against the repository it was installed from. It loads again once the file can be used.`,
          });
        return null;
      }
      let yo =
        gt && marketplaceName === OFFICIAL_MARKETPLACE_NAME
          ? findBindingKeysFor(qt.keys(), realCandidate).flatMap((rs) => {
              let Es = qt.get(rs);
              return Es === undefined ? [] : [parseRepoWithRef(Es)];
            })
          : [];
      let Ho = result ? samePluginSource(result.entry.source, undefined) : undefined;
      let rr = yo.find((rs) => rs !== Ho) ?? yo[0];
      if (
        result &&
        ((rr !== undefined
          ? rr !== samePluginSource(result.entry.source, undefined)
          : isDirectoryRepositoryChanged(realCandidate, $o, result.entry.source, qt)) ||
          (gt &&
            isDirectoryRepositoryChanged(
              realCandidate,
              pluginBindingValues(At, realCandidate),
              result.entry.source,
              qt,
            )))
      ) {
        if (isDependencyAutoInstallState(Kn)) {
          let rs = rr ?? getBoundRepositoryKeys(realCandidate, $o, qt)[0];
          let sliced = (marketplace?.plugins ?? [])
            .filter((Nr) => Nr.name !== pluginName && samePluginSource(Nr.source, undefined) === rs)
            .map((Nr) => Nr.name)
            .slice(0, 3);
          S.push({
            type: "plugin-not-found",
            source: realCandidate,
            pluginId: pluginName,
            marketplace: marketplaceName,
            removedFromDirectory: true,
            directoryIdentityChanged: true,
            ...(($o?.length ?? 0) === 0 &&
              rr === undefined && {
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
        let rs = gt || !!yt.plugins[realCandidate]?.length;
        let Es = To
          ? marketplace
          : ko && rs && isDependencyAutoInstallState(Kn)
            ? await loadPluginDirectoryMarketplace(pluginName, storageV5)
            : null;
        if (!isDependencyAutoInstallState(Kn))
          logForDebugging(`Skipping load-failure error for disabled plugin ${realCandidate}`);
        else if (!To && !Es) {
          if (rs || co) {
            S.push(So());
            let Nr = Me.get(marketplaceName);
            let Is = q
              ? "unknown because known_marketplaces.json could not be read this load"
              : bo !== undefined
                ? `recorded in known_marketplaces.json but refused this load (${bo})`
                : Nr !== undefined
                  ? `declared under extraKnownMarketplaces but not usable this load: ${Nr}`
                  : "not known here: neither recorded in known_marketplaces.json nor declared with a directory or file source under extraKnownMarketplaces in an enabled settings source";
            logMarketplaceNoticeOnce(
              `not-loaded:${realCandidate}:${Is}`,
              `plugin ${jsonStringify(realCandidate)} not loaded (hooks module, commands, skills, servers: none of it): its marketplace ${jsonStringify(marketplaceName)} is ${Is}; \`claude plugin marketplace add <path-or-repo>\` registers it`,
            );
          } else
            logForDebugging(
              `Skipping orphaned enabledPlugins entry ${realCandidate}: marketplace not registered`,
            );
        } else if (!Es)
          S.push({
            type: "marketplace-load-failed",
            source: realCandidate,
            marketplace: marketplaceName,
            reason: "cache-miss",
            ...(lt.has(marketplaceName) && {
              catalogReadFailed: true,
            }),
            ...(lt.has(marketplaceName) &&
              isRegistryOwnedByName(lt, marketplaceName) &&
              isAsciiImpersonatingOfficialName(marketplaceName) && {
                nameRefused: true,
                ...(We[marketplaceName]?.source.source === "settings" && {
                  nameRefusedDeclaredInSettings: true,
                }),
              }),
            ...(Yt !== null && marketplaceName === OFFICIAL_MARKETPLACE_NAME
              ? {
                  directoryBlockedBy: Yt,
                }
              : {}),
          });
        else if (rs) {
          let Nr = marketplaceName === OFFICIAL_MARKETPLACE_NAME;
          let Is = Nr ? getBoundRepositoryKeys(realCandidate, $o, qt)[0] : undefined;
          let fs =
            Is !== undefined
              ? Es.plugins
                  .filter(
                    (plugin) =>
                      plugin.name !== pluginName && samePluginSource(plugin.source, undefined) === Is,
                  )
                  .map((plugin) => plugin.name)
                  .slice(0, 3)
              : [];
          let as = Nr ? await pluginDirectoryNotInstallableReason(pluginName, storageV5) : undefined;
          S.push({
            type: "plugin-not-found",
            source: realCandidate,
            pluginId: pluginName,
            marketplace: marketplaceName,
            ...(Nr
              ? {
                  removedFromDirectory: true,
                  ...(gt && {
                    registryReadFailed: true,
                  }),
                  ...(fs.length > 0 && {
                    directoryRenamedTo: fs,
                  }),
                  ...(as !== undefined && {
                    directoryNotInstallableReason: as,
                  }),
                }
              : {}),
          });
        } else
          logForDebugging(
            `Skipping orphaned enabledPlugins entry ${realCandidate}: not in marketplace catalog`,
          );
        return null;
      }
      let trustedRoots = getMarketplaceCandidatePaths(realCandidate, We, tryUnwrapTextPayload());
      let Hr = await pickUsableInstallation(yt.plugins[realCandidate], {
        storageV5,
        trustedRoots,
      });
      let Fr =
        Hr === undefined
          ? undefined
          : {
              ...Hr,
              installPath: resolve_2(getOriginalCwd(), Hr.installPath),
            };
      if (typeof result.entry.source !== "string" && !Fr) {
        if (
          !SETTING_SOURCES.filter(isOperatorSettingSource_2).some(
            (Es) => getSettingsForSource(Es)?.enabledPlugins?.[realCandidate] === true,
          )
        ) {
          let pluginVersion = await calculatePluginVersion(
            realCandidate,
            result.entry.source,
            undefined,
            undefined,
            {
              kind: "catalog",
              version: result.entry.version,
            },
            "sha" in result.entry.source ? result.entry.source.sha : undefined,
          );
          if (!(await probeSeedForPlugin(realCandidate, pluginVersion, "when-unknown"))) {
            let Is = isDependencyAutoInstallState(Kn) && (await lstatChildBigintOrUndefined(realCandidate));
            S.push({
              type: "plugin-not-installed",
              source: realCandidate,
              plugin: result.entry.name,
              ...(Is && {
                seedHasOtherVersion: true,
              }),
              ...(isDependencyAutoInstallState(Kn) &&
                gt && {
                  registryReadFailed: true,
                }),
            });
            return null;
          }
        }
      }
      let cs =
        commandSourceSpecOf(result.entry.source) !== undefined ||
        (Fr !== undefined && (Fr.sourceCommand !== undefined || Fr.sourceProducerPath !== undefined));
      let _r = cs || Fr?.previousProducerPaths !== undefined;
      if (cs && areCommandPluginSourcesDisabledByPolicy()) {
        noteHeldForTheAnswer();
        if (isDependencyAutoInstallState(Kn))
          S.push({
            type: "generic-error",
            orphan: true,
            source: realCandidate,
            plugin: result.entry.name,
            error: commandPluginSourcesDisabledMessage(),
          });
        return null;
      }
      if (isLinkModeCommandSource(result.entry.source) && Fr === undefined) {
        if (isDependencyAutoInstallState(Kn))
          S.push({
            type: "generic-error",
            orphan: true,
            source: realCandidate,
            plugin: result.entry.name,
            error: `Not loading ${printableName(realCandidate, 200)}: it installs as a link farm but has no install record here; ${runCommandHint(
              "plugin install",
              realCandidate,
              {
                tail: "to record it",
                fallback: "install it explicitly to record it",
              },
            )}.`,
          });
        return null;
      }
      let Cr =
        Hr?.installPath !== undefined
          ? classifyMarketplacePath(Hr.installPath, {
              trustedRoots,
            })
          : undefined;
      let installEntry = Cr?.absolute;
      let suspect = Cr?.suspect ?? false;
      let jr =
        Fr !== undefined &&
        (Fr.sourceCommand?.endsWith(pluginLinkSchema) === true ||
          (Fr.sourceCommand === undefined &&
            (Fr.sourceProducerPath !== undefined || Fr.previousProducerPaths !== undefined) &&
            isLinkModeCommandSource(result.entry.source)) ||
          suspect ||
          (_r &&
            installEntry !== undefined &&
            (await isLiveLinkFarm(installEntry, {
              unclassifiableIsFarm: true,
            }))));
      if (
        Fr !== undefined &&
        jr &&
        (suspect ||
          Fr.sourceProducerPath === undefined ||
          hasDotSegmentAlias(Fr.sourceProducerPath) ||
          realpathAllowMissing_2(Fr.sourceProducerPath) ||
          isPathWithin_2(Fr.sourceProducerPath, getOriginalCwd(), {
            foldCase: true,
          }) ||
          (installEntry !== undefined &&
            (await hasEntriesOutsideTarget(installEntry, Fr.sourceProducerPath))))
      ) {
        if (isDependencyAutoInstallState(Kn))
          S.push({
            type: "generic-error",
            orphan: true,
            source: realCandidate,
            plugin: result.entry.name,
            error: suspect
              ? `Not loading ${printableName(realCandidate, 200)}: its recorded install path ${UNSAFE_PATH_EXPLANATION}; ${
                  commandSourceSpecOf(result.entry.source) !== undefined
                    ? runCommandHint("plugin update", realCandidate, {
                        tail: "to re-install it",
                        fallback: "re-install it with an explicit plugin update",
                      })
                    : runCommandHint("plugin uninstall", realCandidate, {
                        tail: "and install it again to re-record it",
                        fallback: "uninstall and install it again to re-record it",
                      })
                }.`
              : `Not loading ${printableName(realCandidate, 200)} here: it is served in place from ${printableName(Fr.sourceProducerPath ?? "(unrecorded)", 200)}, which contains the working directory, is a network location, could not be resolved, or no longer matches its cached links \u2014 its content cannot be protected from sandboxed commands; ${runCommandHint(
                  "plugin update",
                  realCandidate,
                  {
                    tail: "elsewhere to re-resolve it",
                    fallback: "re-resolve it with an explicit plugin update elsewhere",
                  },
                )}.`,
          });
        return null;
      }
      let linkFarm =
        Fr !== undefined
          ? Fr.sourceCommand?.endsWith(pluginLinkSchema) === true
          : isLinkModeCommandSource(result.entry.source);
      let linkFarmProducer = jr ? Fr?.sourceProducerPath : undefined;
      if (Fr?.claudeaiPluginId !== undefined) {
        let source = result.entry.source;
        if (
          typeof source !== "object" ||
          source.source !== "claudeai" ||
          source.pluginId !== Fr.claudeaiPluginId
        ) {
          if (isDependencyAutoInstallState(Kn))
            S.push({
              type: "generic-error",
              refused: true,
              source: realCandidate,
              plugin: result.entry.name,
              error: `Not loading ${printableName(realCandidate, 200)}: it was installed from a claude.ai-hosted marketplace, but that marketplace name now lists ${typeof source === "object" && source.source === "claudeai" ? "a different claude.ai plugin" : "another source"} under this name; ${runCommandHint(
                "plugin uninstall",
                realCandidate,
                {
                  tail: "and install it again to switch, or remove it",
                  fallback: "uninstall and reinstall it to switch, or remove it",
                },
              )}`,
            });
          return null;
        }
      }
      let zo = await (cacheOnly
        ? loadCachedMarketplacePlugin(
            result.entry,
            result.marketplaceInstallLocation,
            To?.source,
            realCandidate,
            Kn === true,
            S,
            w,
            Fr?.installPath,
            yt.plugins[realCandidate]?.find((rs) => rs.installPath)?.installPath,
            {
              storageV5,
              preview,
              linkFarm,
              linkFarmProducer,
              entryEnabled: isDependencyAutoInstallState(Kn),
              registryReadFailed: gt,
              recordedClaudeAiPluginId: Fr?.claudeaiPluginId,
            },
          )
        : loadPluginFromMarketplaceEntry(
            result.entry,
            result.marketplaceInstallLocation,
            To?.source,
            realCandidate,
            Kn === true,
            S,
            w,
            Fr?.version,
            findMatchingSourceCommand(commandSourceSpecOf(result.entry.source), yt.plugins[realCandidate]) ??
              Fr?.sourceCommand,
            {
              storageV5,
              linkFarm,
              linkFarmProducer,
              entryEnabled: isDependencyAutoInstallState(Kn),
              credentials,
              installRecord: gt ? "unknown" : Fr !== undefined ? "present" : "absent",
              recordedArchiveSha256: Fr?.archiveSha256,
              recordedClaudeAiPluginId: Fr?.claudeaiPluginId,
              recordedGitCommitSha: Fr?.gitCommitSha,
            },
          ));
      if (zo && Fr?.resolvedVersion !== undefined) zo.resolvedVersion = Fr.resolvedVersion;
      if (
        zo &&
        !weakSet_7.has(zo) &&
        Fr?.gitCommitSha !== undefined &&
        resolve_2(Fr.installPath) === resolve_2(zo.path)
      )
        zo.gitCommitSha = Fr.gitCommitSha;
      if (zo && Fr?.claudeaiPluginId !== undefined && isServerPluginId(Fr.claudeaiPluginId))
        zo.serverPluginId = Fr.claudeaiPluginId;
      if (zo && isLocalMarketplaceEntry(result.entry.source, To?.source)) {
        zo.readFromFolderAt = now;
        let { folderReadAt } = getPluginRegistry();
        if (!preview && !folderReadAt.has(zo.source)) folderReadAt.set(zo.source, now);
      }
      if (zo && To) {
        let err = redactMarketplaceSource(To.source);
        if (err !== null) {
          zo.marketplaceSource = err;
          if (
            isOfficialMarketplaceName_3(marketplaceName) &&
            isOfficialMarketplaceSourceVouched(err) &&
            rn(result.marketplaceInstallLocation) &&
            no(zo)
          )
            zo.officialMarketplaceSourceVouched = true;
          if (
            await isWindowsPluginInsideLocalMarketplace(err, {
              entrySource: result.entry.source,
              marketplaceLocation: result.marketplaceInstallLocation,
              pluginPath: zo.path,
            })
          )
            zo.readInPlace = true;
        }
      }
      return zo;
    }),
  );
  for (let [yn, Kn] of results.entries())
    if (Kn.status === "fulfilled" && Kn.value) y.push(Kn.value);
    else if (Kn.status === "rejected") {
      let error = toError(Kn.reason);
      let [source, To] = flattened[yn];
      logForDebugging(`Failed to load plugin ${source}: ${redactUrlsInMessage(error.message)}`, {
        level: "error",
      });
      if (isDependencyAutoInstallState(To))
        S.push(
          manifestErrorToPluginError(error, source, firstLineOf(source, "@")) ?? {
            type: "generic-error",
            source,
            plugin: firstLineOf(source, "@"),
            error: commandSourceErrorMessage(error),
          },
        );
    }
  if (!preview) await migrateRenamedPluginsInSettings(Je, storageV5);
  let ho = gt ? await getInstalledListRefusal(storageV5) : undefined;
  if (ho !== undefined)
    return {
      plugins: y,
      errors: annotateRegistryReadFailures(S, readInstalledPluginsFile(ho)),
      warnings: w,
    };
  return {
    plugins: y,
    errors: S,
    warnings: w,
  };
}
//@ chunk-e6aww6q8.js:4573903-4574093 layout
function annotateRegistryReadFailures(e, installedListHeldNote) {
  return e.map((r) =>
    (r.type === "plugin-cache-miss" || r.type === "plugin-not-installed" || r.type === "plugin-not-found") &&
    r.registryReadFailed === true
      ? {
          ...r,
          installedListHeldNote,
        }
      : r,
  );
}
//@ chunk-e6aww6q8.js:4574093-4574427 layout
function commandSourceCacheMissError(e, plugin) {
  return {
    type: "generic-error",
    orphan: true,
    source: e,
    plugin,
    error: `${stripInvisibleKeepEmoji(e)} is installed by running a command, and background command execution is currently switched off, so its missing cache was not rebuilt. Run \`${claudeCommand("plugin update", e) ?? "claude plugin update <plugin>@<marketplace>"}\` in a terminal to rebuild it.`,
  };
}
//@ chunk-e6aww6q8.js:4574427-4575334 layout
function checkClaudeAiPluginLoadable(e, plugin, source, s, h) {
  if (typeof source !== "object" || source.source !== "claudeai") return null;
  if (s === "unknown")
    return {
      type: "plugin-cache-miss",
      source: e,
      plugin,
      installPath: NOT_RECORDED,
      registryReadFailed: true,
    };
  if (s === "present" && h === undefined)
    return {
      type: "generic-error",
      refused: true,
      source: e,
      plugin,
      error: `Not loading ${printableName(e, 200)}: its install record no longer says which claude.ai plugin it came from, so it is not downloaded again; ${runCommandHint(
        "plugin uninstall",
        e,
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
      source: e,
      plugin,
      error: `Not loading ${printableName(e, 200)}: its files are missing and it can't be downloaded again in this session \u2014 claude.ai lists no installable version for it, or its marketplace's catalog isn't readable here (sign in to claude.ai with the organization it was added under, then restart)`,
    };
  return null;
}
//@ chunk-e6aww6q8.js:4575334-4575469 layout
function sessionPluginDirFor(e, n) {
  let replaced = n.replace(/[^a-zA-Z0-9@\-_]/g, "-");
  let s = createHash("sha256").update(n).digest("hex");
  return join(e, `${replaced}-${s.slice(0, 8)}`);
}
//@ chunk-e6aww6q8.js:4575469-4575749 layout
function planArchiveExtraction(e, n) {
  let r = relative(e, n);
  if (!r || r === ".." || r.startsWith(`..${sep}`) || isAbsolute(r))
    throw Error("Refusing to extract a plugin archive outside the session plugin cache");
  let str = randomBytes(4).toString("hex");
  return {
    extractDir: n,
    staging: `${n}.staging-${str}`,
    previousPrefix: `${n}.previous-${str}`,
  };
}
//@ chunk-e6aww6q8.js:4575749-4575765 layout
var MIXED_ARCHIVE_HASH = "mixed";
//@ chunk-e6aww6q8.js:4575765-4576369 layout
async function extractSessionArchive(e, n) {
  let zipExtractionState = getZipExtractionState();
  let seq = ++zipExtractionState.nextSeq;
  let fileBytes = await getFsImplementation().readFileBytes(e);
  let y = createHash("sha256").update(fileBytes).digest("hex");
  let { extractDir } = n;
  if (zipExtractionState.byDir.get(extractDir)?.archiveHash === y && (await isDirectory(extractDir))) return;
  let w = zipExtractionState.inFlight.get(extractDir);
  if (w?.archiveHash === y)
    try {
      await w.done;
      return;
    } catch {}
  let { promise, resolve, reject } = Promise.withResolvers();
  promise.catch(() => {});
  let Z = {
    archiveHash: y,
    done: promise,
  };
  zipExtractionState.inFlight.set(extractDir, Z);
  let Se = (error) => {
    if (zipExtractionState.inFlight.get(extractDir) === Z) zipExtractionState.inFlight.delete(extractDir);
    if (error === undefined) resolve();
    else reject(error);
  };
  try {
    await extractZipToDirectory(fileBytes, n.staging);
  } catch (error) {
    await removeTreeQuietly(n.staging);
    Se(error);
    throw error;
  }
  return {
    archive: fileBytes,
    archiveHash: y,
    seq,
    settle: Se,
  };
}
//@ chunk-e6aww6q8.js:4576369-4576379 layout
var MAX_PREVIEW_TREES = 2;
//@ chunk-e6aww6q8.js:4576379-4576672 layout
async function prunePreviewTrees(zipExtractionState, n, r, s) {
  let filtered = (zipExtractionState.previews.get(r) ?? []).filter((w) => w !== s);
  filtered.push(s);
  let y = filtered.splice(0, Math.max(0, filtered.length - MAX_PREVIEW_TREES));
  zipExtractionState.previews.set(r, filtered);
  let mapped = y.map((w) => {
    let L = removePreviewTree(n, w).finally(() => {
      if (zipExtractionState.pruning.get(w) === L) zipExtractionState.pruning.delete(w);
    });
    zipExtractionState.pruning.set(w, L);
    return L;
  });
  await Promise.all(mapped);
}
//@ chunk-e6aww6q8.js:4576672-4576854 layout
async function removePreviewTree(e, n) {
  let { previousPrefix } = planArchiveExtraction(e, n);
  try {
    await retryFsOp(n, previousPrefix);
  } catch (error) {
    if (!isENOENT(error))
      logForDebugging(`Could not move aside the preview tree ${n}: ${errorMessage(error)}`, {
        level: "warn",
      });
    return;
  }
  await removeTreeQuietly(previousPrefix);
}
//@ chunk-e6aww6q8.js:4576854-4577324 layout
async function statDirIdentity(e, n) {
  try {
    let { dev, ino, birthtimeMs } = await lstat(e);
    return {
      dev,
      ino,
      birthtimeMs,
    };
  } catch (error) {
    if (isENOENT(error) || getErrnoCode(error) === "ENOTDIR")
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Plugin directory ${e} was removed ${n === "before" ? "before it could be loaded" : "while it was being loaded"}`,
        "plugin extraction tree removed during load",
      );
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Plugin directory ${e} could not be ${n === "before" ? "checked before" : "re-checked after"} loading: ${getErrnoCode(error) ?? errorMessage(error)}`,
      "plugin extraction tree check failed",
    );
  }
}
//@ chunk-e6aww6q8.js:4577324-4577560 layout
async function assertDirUnchanged(e, n) {
  let r = await statDirIdentity(e, "after");
  if (r.dev !== n.dev || r.ino !== n.ino || r.birthtimeMs !== n.birthtimeMs)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Plugin directory ${e} was replaced while it was being loaded`,
      "plugin extraction tree replaced during load",
    );
}
//@ chunk-e6aww6q8.js:4577560-4578063 layout
async function extractPreviewArchive(e, sessionPluginCachePath, r) {
  let zipExtractionState = getZipExtractionState();
  let fileBytes = await getFsImplementation().readFileBytes(e);
  let y = createHash("sha256").update(fileBytes).digest("hex");
  if (zipExtractionState.byDir.get(r)?.archiveHash === y && (await isDirectory(r))) return r;
  let S = `${r}.preview-${y.slice(0, 32)}`;
  let { staging } = planArchiveExtraction(sessionPluginCachePath, S);
  let L = 0;
  for (;;) {
    await zipExtractionState.pruning.get(S);
    if (await isDirectory(S)) {
      if (zipExtractionState.pruning.has(S)) continue;
      await prunePreviewTrees(zipExtractionState, sessionPluginCachePath, r, S);
      return S;
    }
    try {
      await extractZipToDirectory(fileBytes, staging);
    } catch (error) {
      await removeTreeQuietly(staging);
      throw error;
    }
    try {
      await retryFsOp(staging, S);
    } catch (error) {
      let q = await isTargetOccupiedError_2(error, S);
      await removeTreeQuietly(staging);
      if (!q || ++L >= MAX_EXTRACT_ATTEMPTS) throw error;
      continue;
    }
    await prunePreviewTrees(zipExtractionState, sessionPluginCachePath, r, S);
    return S;
  }
}
//@ chunk-e6aww6q8.js:4578063-4578073 layout
var MAX_EXTRACT_ATTEMPTS = 3;
//@ chunk-e6aww6q8.js:4578073-4578149 layout
async function isDirectory(e) {
  try {
    return (await lstat(e)).isDirectory();
  } catch {
    return false;
  }
}
//@ chunk-e6aww6q8.js:4578149-4578241 layout
function isWindowsLockError(e) {
  let errnoCode = getErrnoCode(e);
  return (
    getPlatform() === "windows" && (errnoCode === "EPERM" || errnoCode === "EACCES" || errnoCode === "EBUSY")
  );
}
//@ chunk-e6aww6q8.js:4578241-4578293 layout
async function isLockedButPresent(e, n) {
  return isWindowsLockError(e) && (await isDirectory(n));
}
//@ chunk-e6aww6q8.js:4578293-4578386 layout
async function isTargetOccupiedError_2(error, n) {
  let errnoCode = getErrnoCode(error);
  if (errnoCode === "ENOTEMPTY" || errnoCode === "EEXIST") return true;
  return isLockedButPresent(error, n);
}
//@ chunk-e6aww6q8.js:4578386-4578504 layout
async function removeTreeQuietly(staging) {
  await removeDirectoryTreeNoFollow_2(staging).catch((error) => {
    logForDebugging(`Failed to remove the extraction tree ${staging}: ${errorMessage(error)}`, {
      level: "warn",
    });
  });
}
//@ chunk-e6aww6q8.js:4578504-4578677 layout
async function moveIntoPlace(zipExtractionState, n, extractDir) {
  try {
    await retryFsOp(n, extractDir);
  } catch (error) {
    if (await isDirectory(extractDir)) return false;
    throw error;
  }
  let s = zipExtractionState.byDir.get(extractDir);
  if (s !== undefined)
    zipExtractionState.byDir.set(extractDir, {
      archiveHash: MIXED_ARCHIVE_HASH,
      seq: s.seq,
    });
  return true;
}
//@ chunk-e6aww6q8.js:4578677-4579962 layout
/**
 * 把暂存解压树原子替换到目标解压目录（旧树先移到 .previous-*，Windows 被占用时退化为原地解压）。
 */
async function swapInExtractedTree({ extractDir, staging, previousPrefix }, s) {
  let zipExtractionState = getZipExtractionState();
  let y = [];
  try {
    for (let idx = 0; ; idx++) {
      let w = zipExtractionState.byDir.get(extractDir);
      if (w !== undefined && w.seq > s.seq) {
        await removeTreeQuietly(staging);
        s.settle();
        return;
      }
      let L = `${previousPrefix}-${idx}`;
      let G = false;
      try {
        await retryFsOp(extractDir, L);
        y.push(L);
      } catch (error) {
        if (!isENOENT(error)) {
          if (!(await isLockedButPresent(error, extractDir))) throw error;
          G = true;
        }
      }
      let q = zipExtractionState.byDir.get(extractDir);
      if (q !== undefined && q.seq > s.seq) {
        if (y.at(-1) === L) {
          await moveIntoPlace(zipExtractionState, L, extractDir);
          y.pop();
        }
        await removeTreeQuietly(staging);
        s.settle();
        return;
      }
      if (!G)
        try {
          await retryFsOp(staging, extractDir);
          break;
        } catch (error) {
          if (await isTargetOccupiedError_2(error, extractDir)) {
            if (idx + 1 >= MAX_EXTRACT_ATTEMPTS) throw error;
            continue;
          }
          if (!isWindowsLockError(error)) throw error;
          if (y.at(-1) === L) {
            await moveIntoPlace(zipExtractionState, L, extractDir);
            y.pop();
          }
          let Se = zipExtractionState.byDir.get(extractDir);
          if (Se !== undefined && Se.seq > s.seq) {
            await removeTreeQuietly(staging);
            s.settle();
            return;
          }
          G = true;
        }
      logForDebugging(
        `Plugin extraction directory ${extractDir} or its staged copy is held open; extracting the archive in place, so files dropped from it are not cleared this time`,
        {
          level: "warn",
        },
      );
      zipExtractionState.byDir.set(extractDir, {
        archiveHash: MIXED_ARCHIVE_HASH,
        seq: s.seq,
      });
      await extractZipToDirectory(s.archive, extractDir);
      await removeTreeQuietly(staging);
      s.settle();
      return;
    }
  } catch (error) {
    let w = y.pop();
    if (w !== undefined)
      try {
        if (!(await moveIntoPlace(zipExtractionState, w, extractDir)))
          logForDebugging(
            `A newer extraction of ${extractDir} is live; the one moved aside by a failed swap stays at ${w}`,
          );
      } catch (error) {
        logForDebugging(
          `The previous extraction of ${extractDir} could not be restored after a failed swap (${errorMessage(error)}); it was at ${w}`,
          {
            level: "error",
          },
        );
      }
    await removeTreeQuietly(staging);
    s.settle(error);
    throw error;
  }
  zipExtractionState.byDir.set(extractDir, {
    archiveHash: s.archiveHash,
    seq: s.seq,
  });
  s.settle();
}
//@ chunk-e6aww6q8.js:4579962-4582994 layout
/**
 * cacheOnly 模式加载市场插件：只用已有版本化缓存或种子缓存，缺失时报 plugin-cache-miss 并返回 null。
 */
async function loadCachedMarketplacePlugin(
  e,
  pluginId,
  r,
  realCandidate,
  h,
  y,
  S,
  installPath,
  installPath_2,
  {
    storageV5: G,
    preview: q = false,
    linkFarm: Z = false,
    linkFarmProducer: Se,
    entryEnabled: ke = h,
    registryReadFailed: we = false,
    recordedClaudeAiPluginId: Ee,
  } = {},
) {
  let Ae;
  let Ie;
  if (typeof e.source === "string") {
    let lt = isLocalMarketplaceEntry(e.source, r);
    if (!lt && installPath) await materializeCachedLinks(installPath, G, Z);
    if (
      !lt &&
      installPath &&
      (installPath.endsWith(".zip")
        ? await pathExists(installPath)
        : await cacheDirHasPluginContentStrict(installPath, G))
    )
      Ae = installPath;
    else if (!lt) {
      let Je = null;
      if (getPluginSeedDirs().length > 0) {
        let nt = installPath
          ? basename(installPath).replace(/\.zip$/, "")
          : await calculatePluginVersion(realCandidate, e.source, undefined, undefined, {
              kind: "catalog",
              version: e.version,
            });
        Je = await probeSeedForPlugin(realCandidate, nt, "always");
      }
      if (Je) {
        logForDebugging(`Using seed cache for ${realCandidate} at ${Je} (cache-only)`);
        Ae = Je;
      } else {
        if (h)
          y.push({
            type: "plugin-cache-miss",
            source: realCandidate,
            plugin: e.name,
            installPath: installPath ?? installPath_2 ?? pluginId,
          });
        return null;
      }
    } else {
      let Je = seedDirFor(pluginId) !== undefined ? "system" : "workspace";
      let marketplaceEntryPath = await resolveMarketplaceEntryPath(pluginId, e.source, {
        marketplaceSource: r,
        corroboratingSource: marketplaceSourceOfPlugin(realCandidate),
        storageV5: G,
        localMarketplaceSpace: Je,
      });
      if (marketplaceEntryPath.kind !== "ok") {
        if (ke)
          y.push({
            type: "generic-error",
            source: realCandidate,
            error: entryResolutionError(marketplaceEntryPath, pluginId, e.source).message,
          });
        return null;
      }
      Ae = marketplaceEntryPath.entryPath;
      Ie = marketplaceEntryPath.marketplaceDir;
      if (!(await localMarketplacePathExists(G, Ae, Je))) {
        if (ke)
          y.push({
            type: "generic-error",
            source: realCandidate,
            error: `Plugin directory not found at path: ${printableOrEmpty(Ae)}. Check that the marketplace entry has the correct path.`,
          });
        return null;
      }
    }
  } else {
    if (installPath) await materializeCachedLinks(installPath, G, Z);
    if (
      installPath &&
      (installPath.endsWith(".zip")
        ? await pathExists(installPath)
        : await cacheDirHasPluginContentStrict(installPath, G))
    )
      Ae = installPath;
    else if (!installPath) {
      let any = SETTING_SOURCES.filter(isOperatorSettingSource_2).some(
        (pt) => getSettingsForSource(pt)?.enabledPlugins?.[realCandidate] === true,
      );
      let pluginVersion = await calculatePluginVersion(
        realCandidate,
        e.source,
        undefined,
        undefined,
        {
          kind: "catalog",
          version: e.version,
        },
        "sha" in e.source ? e.source.sha : undefined,
      );
      let nt;
      if (any) {
        let versionedZipCachePath = getVersionedZipCachePath(realCandidate, pluginVersion);
        let versionedCachePath = getVersionedCachePath(realCandidate, pluginVersion);
        await materializeCachedLinks(versionedCachePath, G, Z);
        if (isPluginZipCacheEnabled() && (await pathExists(versionedZipCachePath)))
          nt = versionedZipCachePath;
        else if (await cacheDirHasPluginContentStrict(versionedCachePath, G)) {
          await removeCacheInUseMarker(versionedCachePath, G);
          nt = versionedCachePath;
        }
      }
      if (!nt) {
        nt = (await probeSeedForPlugin(realCandidate, pluginVersion, "when-unknown")) ?? undefined;
        if (nt) logForDebugging(`Using seed cache for ${realCandidate} at ${nt} (cache-only)`);
      }
      if (nt) Ae = nt;
      else if (any) {
        if (ke) {
          let pt = checkClaudeAiPluginLoadable(
            realCandidate,
            e.name,
            e.source,
            we ? "unknown" : "absent",
            undefined,
          );
          if (e.source.source === "command" && !shouldRefreshCommandPlugins())
            y.push(commandSourceCacheMissError(realCandidate, e.name));
          else if (pt !== null) y.push(pt);
          else {
            let Et = installPath_2 === undefined && (await lstatChildBigintOrUndefined(realCandidate));
            y.push({
              type: "plugin-cache-miss",
              source: realCandidate,
              plugin: e.name,
              installPath: installPath_2 ?? NOT_RECORDED,
              ...(we && {
                registryReadFailed: true,
              }),
              ...(Et && {
                seedHasOtherVersion: true,
              }),
            });
          }
        }
        return null;
      } else {
        let pt = ke && (await lstatChildBigintOrUndefined(realCandidate));
        y.push({
          type: "plugin-not-installed",
          source: realCandidate,
          plugin: e.name,
          ...(pt && {
            seedHasOtherVersion: true,
          }),
          ...(ke &&
            we && {
              registryReadFailed: true,
            }),
        });
        return null;
      }
    } else {
      if (h)
        if (e.source.source === "command" && !shouldRefreshCommandPlugins())
          y.push(commandSourceCacheMissError(realCandidate, e.name));
        else
          y.push(
            checkClaudeAiPluginLoadable(realCandidate, e.name, e.source, "present", Ee) ?? {
              type: "plugin-cache-miss",
              source: realCandidate,
              plugin: e.name,
              installPath,
            },
          );
      return null;
    }
  }
  let Me;
  let We;
  if (isPluginZipCacheEnabled() && Ae.endsWith(".zip")) {
    let sessionPluginCachePath = await getSessionPluginCachePath();
    let Je = sessionPluginDirFor(sessionPluginCachePath, realCandidate);
    let nt = planArchiveExtraction(sessionPluginCachePath, Je);
    let pt;
    We = Ae;
    try {
      if (q) Ae = await extractPreviewArchive(Ae, sessionPluginCachePath, Je);
      else {
        pt = await extractSessionArchive(Ae, nt);
        Ae = Je;
      }
    } catch (error) {
      logForDebugging(`Failed to extract plugin ZIP ${Ae}: ${error}`, {
        level: "error",
      });
      if (ke)
        y.push({
          type: "plugin-cache-miss",
          source: realCandidate,
          plugin: e.name,
          installPath: Ae,
        });
      return null;
    }
    if (pt !== undefined) await swapInExtractedTree(nt, pt);
    Ie = undefined;
    if (q) Me = await statDirIdentity(Ae, "before");
  }
  let ze = await finishMarketplacePluginLoad(e, realCandidate, h, y, S, Ae, {
    storageV5: G,
    linkFarm: Z,
    linkFarmProducer: Se,
    entryEnabled: ke,
    containmentAnchorDir: Ie,
  });
  if (Me !== undefined && ze !== null) await assertDirUnchanged(Ae, Me);
  if (We !== undefined && ze !== null) ze.extractedFrom = We;
  return ze;
}
//@ chunk-e6aww6q8.js:4582994-4590867 fingerprint = loadPluginFromMarketplaceEntry (0.385)
/**
 * 按 marketplace 条目加载一个插件：相对路径来源直接在市场目录里读；远程来源走安装记录/版本化缓存，必要时 cachePlugin + copyPluginToVersionedCache；校验钉住的 sha/integrity/archiveSha256；strict=false 时用条目合成 manifest；最后 createPluginFromPath 并合并条目里的组件声明。
 */
async function loadPluginFromMarketplaceEntry(
  entry,
  marketplaceInstallLocation,
  pluginId,
  s,
  h,
  y,
  S,
  version,
  L,
  {
    storageV5,
    linkFarm = false,
    linkFarmProducer,
    entryEnabled = h,
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
  let We;
  let ze;
  let lt;
  if (typeof entry.source === "string") {
    let pt = pluginId !== undefined && isLocalMarketplaceSource(pluginId);
    let Et = seedDirFor(marketplaceInstallLocation) !== undefined ? "system" : "workspace";
    let marketplaceEntryPath = await resolveMarketplaceEntryPath(marketplaceInstallLocation, entry.source, {
      marketplaceSource: pluginId,
      corroboratingSource: marketplaceSourceOfPlugin(s),
      storageV5,
      localMarketplaceSpace: Et,
    });
    if (marketplaceEntryPath.kind === "location-error") throw marketplaceEntryPath.error;
    if (marketplaceEntryPath.kind !== "ok") {
      y.push({
        type: "generic-error",
        source: s,
        error: entryResolutionError(marketplaceEntryPath, marketplaceInstallLocation, entry.source).message,
      });
      return null;
    }
    let { marketplaceDir, entryPath } = marketplaceEntryPath;
    if (!(pt ? await localMarketplacePathExists(storageV5, entryPath, Et) : await pathExists(entryPath))) {
      logForDebugging(`Plugin path not found: ${entryPath}`, {
        level: "error",
      });
      if (entryEnabled)
        y.push({
          type: "generic-error",
          source: s,
          error: `Plugin directory not found at path: ${printableOrEmpty(entryPath)}. Check that the marketplace entry has the correct path.`,
        });
      return null;
    }
    if (isLocalMarketplaceEntry(entry.source, pluginId)) {
      We = entryPath;
      ze = marketplaceDir;
    } else
      try {
        let It;
        try {
          It = (await loadPluginManifest(entryPath, entry.name, entry.source)).manifest;
        } catch {}
        let pluginVersion = await calculatePluginVersion(s, entry.source, It, marketplaceDir, {
          kind: "catalog",
          version: entry.version,
        });
        let sourcePluginPath = getVersionedCachePath(s, pluginVersion);
        let Zt = await dirHasRealEntries(sourcePluginPath);
        let sha;
        if (!Zt) {
          let pn = await probePluginGitHead(marketplaceDir);
          sha = pn.repo
            ? (pn.sha ?? undefined)
            : marketplaceNameOfId(s) === CLAUDE_PLUGINS_OFFICIAL
              ? ((await pluginVersionOrNull(marketplaceDir)) ?? undefined)
              : undefined;
        }
        We = await copyPluginToVersionedCache(entryPath, s, pluginVersion, entry, marketplaceDir, {
          storageV5,
          linkFarm,
          credentials,
        });
        logForDebugging(`Copied plugin ${entry.name} to versioned cache: ${We}`);
        if (We === sourcePluginPath && !Zt)
          lt = {
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
          if (entryEnabled)
            y.push({
              type: "generic-error",
              source: s,
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
        We = entryPath;
        ze = marketplaceDir;
      }
  } else
    try {
      let version_2 = await calculatePluginVersion(
        s,
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
      let versionedPath = getVersionedCachePath(s, version_2);
      await materializeCachedLinks(versionedPath, storageV5, linkFarm);
      let zipPath = getVersionedZipCachePath(s, version_2);
      if (isPluginZipCacheEnabled() && (await pathExists(zipPath))) {
        logForDebugging(`Using versioned cached plugin ZIP ${entry.name} from ${zipPath}`);
        We = zipPath;
      } else if (await cacheDirHasPluginContentStrict(versionedPath, storageV5)) {
        await removeCacheInUseMarker(versionedPath, storageV5);
        logForDebugging(`Using versioned cached plugin ${entry.name} from ${versionedPath}`);
        We = versionedPath;
      } else {
        let gt = await probeSeedForPlugin(s, version_2, "when-unknown");
        if (gt) {
          We = gt;
          logForDebugging(`Using seed cache for external plugin ${entry.name} at ${gt}`);
        } else {
          if (entry.source.source === "command" && !h) {
            logForDebugging(
              `Not materializing disabled command-sourced plugin ${s}: its command is not run while it is disabled`,
            );
            return null;
          }
          if (entry.source.source === "command" && !shouldRefreshCommandPlugins()) {
            logForDebugging(
              `Plugin ${s}: command-source execution is switched off; not materializing the missing cache dir`,
              {
                level: "warn",
              },
            );
            y.push(commandSourceCacheMissError(s, entry.name));
            return null;
          }
          let At = checkClaudeAiPluginLoadable(
            s,
            entry.name,
            entry.source,
            installRecord,
            recordedClaudeAiPluginId,
          );
          if (At !== null) {
            if (entryEnabled) y.push(At);
            return null;
          }
          if (isNpmPluginId(s) && recordedNpmIntegrity === undefined) {
            if (entryEnabled)
              y.push({
                type: "generic-error",
                refused: true,
                source: s,
                plugin: entry.name,
                error: `${printableName(s, 200)} was not re-downloaded: its install record carries no integrity to check the download against; ${runCommandHint(
                  "plugin uninstall",
                  s,
                  {
                    tail: "and install it again to re-record it",
                    fallback: "uninstall and install it again to re-record it",
                  },
                )}.`,
              });
            return null;
          }
          if (s.endsWith(`@${OFFICIAL_MARKETPLACE_NAME}`)) {
            if (installRecord === "unknown") {
              if (entryEnabled)
                y.push({
                  type: "plugin-cache-miss",
                  source: s,
                  plugin: entry.name,
                  installPath: NOT_RECORDED,
                  registryReadFailed: true,
                });
              return null;
            }
            let Xn = pinnedSha(s, entry.source);
            if (Xn === undefined || (installRecord === "present" && recordedGitCommitSha !== Xn)) {
              if (entryEnabled)
                y.push({
                  type: "generic-error",
                  refused: true,
                  source: s,
                  plugin: entry.name,
                  error:
                    Xn === undefined
                      ? `Not loading ${printableName(s, 200)}: its files are missing and its ${OFFICIAL_MARKETPLACE_DISPLAY} listing has no listed commit, so it was not downloaded. Only a change to the listing can fix this.`
                      : recordedGitCommitSha === undefined
                        ? `Not loading ${printableName(s, 200)}: its files are missing and its install record has no commit, so it was not downloaded again; ${runCommandHint(
                            "plugin update",
                            s,
                            {
                              tail: "to repair it",
                              fallback: "update it to repair it",
                            },
                          )}`
                        : `Not loading ${printableName(s, 200)}: its files are missing, and the ${OFFICIAL_MARKETPLACE_DISPLAY} now lists another commit than the one installed, so it was not downloaded again; ${runCommandHint(
                            "plugin update",
                            s,
                            {
                              tail: "to move to the listed commit",
                              fallback: "update it to move to the listed commit",
                            },
                          )}`,
                });
              return null;
            }
          }
          let It = undefined;
          if (It !== undefined && !It.ok) {
            if (entryEnabled)
              y.push({
                type: "generic-error",
                refused: true,
                source: s,
                plugin: entry.name,
                error: It.message,
              });
            return null;
          }
          let Yt = gitSha().safeParse(recordedGitCommitSha);
          let qt =
            Yt.success &&
            (entry.source.source === "github" ||
              entry.source.source === "url" ||
              entry.source.source === "git-subdir") &&
            entry.source.sha === undefined &&
            version ===
              (await calculatePluginVersion(s, entry.source, undefined, undefined, undefined, Yt.data))
              ? {
                  ...entry.source,
                  sha: Yt.data,
                }
              : undefined;
          let Zt =
            typeof entry.source === "object" && entry.source.source === "claudeai" && version_2 !== "unknown"
              ? {
                  ...entry.source,
                  version: version_2,
                }
              : entry.source;
          let rn = {
            manifest: {
              name: entry.name,
            },
            archiveAuth: await resolveArchiveDownloadHeaders({
              pluginSource: entry.source,
              pluginName: entry.name,
              marketplaceName: marketplaceNameOfId(s),
              marketplaceSource: pluginId,
              trustedMarketplaceAuth: findUrlMarketplaceHeaders(pluginId, marketplaceNameOfId(s)),
              trustedSettingsEntryAuth: findSettingsArchiveEntry(marketplaceNameOfId(s), entry.name),
              entry,
              runEntryHelper: false,
            }),
            entryDeclaresComponents: entryDeclaresComponents(entry),
            declaredComponentPaths: entryDeclaredComponentPaths(entry),
            isDirectoryPlugin: isOfficialDirectoryPlugin(s),
            directoryPin: pinnedSha(s, Zt) ?? null,
            commandSourceConsent:
              version === undefined && L === undefined
                ? {
                    kind: "none",
                    pluginId: s,
                  }
                : {
                    kind: "recorded",
                    command: L,
                    pluginId: s,
                  },
            storageV5,
            credentials,
            isNpmMarketplaceLane: isNpmPluginId(s),
            expectedNpmIntegrity: recordedNpmIntegrity,
          };
          let no =
            (qt === undefined
              ? undefined
              : await cachePlugin(qt, rn).then(
                  async (Xn) => {
                    let fo = join(Xn.path, ".gitmodules");
                    if ((await pathPresence(fo)) === "gone") return Xn;
                    await removeDirectoryTreeNoFollow_2(Xn.path).catch(() => {});
                    logForDebugging(
                      `${s} has a .gitmodules file, and a fetch at its installed commit ${qt.sha.substring(0, 12)} brings no submodules; fetching its source as the marketplace lists it instead. \`claude plugin update\` records the commit then in use`,
                      {
                        level: "warn",
                      },
                    );
                    return;
                  },
                  (error) => {
                    logForDebugging(
                      `Could not fetch ${s} at its installed commit ${qt.sha.substring(0, 12)} (${redactUrlsInMessage(errorMessage(error))}); fetching its source as the marketplace lists it instead. \`claude plugin update\` records the commit then in use`,
                      {
                        level: "warn",
                      },
                    );
                    return;
                  },
                )) ?? (await cachePlugin(Zt, rn));
          if (
            recordedArchiveSha256 !== undefined &&
            typeof Zt === "object" &&
            Zt.source === "claudeai" &&
            Zt.version === version &&
            no.contentSha256 !== recordedArchiveSha256
          ) {
            await removeDirectoryTreeNoFollow_2(no.path).catch(() => {});
            if (entryEnabled)
              y.push({
                type: "generic-error",
                refused: true,
                source: s,
                plugin: entry.name,
                error: `Not loading ${printableName(s, 200)}: the archive claude.ai served for version ${printableName(Zt.version, 64)} does not match the one recorded at install (digest differs); ${runCommandHint(
                  "plugin uninstall",
                  s,
                  {
                    tail: "and install it again to accept new content",
                    fallback: "uninstall and reinstall it to accept new content",
                  },
                )}`,
              });
            return null;
          }
          let hn =
            version_2 !== "unknown" && !commandSourceSpecOf(entry.source)
              ? version_2
              : await calculatePluginVersion(
                  s,
                  entry.source,
                  no.manifest,
                  no.path,
                  version !== undefined
                    ? {
                        kind: "installed",
                        version,
                      }
                    : {
                        kind: "catalog",
                        version: entry.version,
                      },
                  no.gitCommitSha,
                  no.contentSha256,
                );
          if (no.producerPath !== undefined) recordProducerDir(no.producerPath);
          let sha =
            no.gitCommitSha ??
            (getPluginCloneUrl(entry.source) !== null
              ? ((await pluginGitHead(no.path)) ?? undefined)
              : undefined);
          let versionedCachePath = getVersionedCachePath(s, hn);
          let Kn = await dirHasRealEntries(versionedCachePath);
          We = await copyPluginToVersionedCache(no.path, s, hn, entry, undefined, {
            storageV5,
            linkFarm,
            credentials,
          });
          if (We === versionedCachePath && !Kn)
            lt = {
              sha,
            };
          if (no.path !== We && !resolve_2(We).startsWith(resolve_2(no.path) + sep))
            await removeDirectoryTreeNoFollow_2(no.path).catch((error) => {
              logForDebugging(
                `Failed to remove the staging tree ${no.path} after publishing: ${errorMessage(error)}`,
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
      if (entryEnabled)
        y.push({
          type: "generic-error",
          source: s,
          error: `Failed to download/cache plugin ${printableName(entry.name, 200)}: ${commandSourceErrorMessage(error)}`,
        });
      return null;
    }
  let Je;
  if (isPluginZipCacheEnabled() && We.endsWith(".zip")) {
    let sessionDir = await getSessionPluginCachePath();
    let extractDir = sessionPluginDirFor(sessionDir, s);
    let yt = planArchiveExtraction(sessionDir, extractDir);
    let gt;
    Je = We;
    try {
      gt = await extractSessionArchive(We, yt);
    } catch (error) {
      logForDebugging(`Failed to extract plugin ZIP ${We}, deleting corrupt file: ${error}`);
      await rm_2(We, {
        force: true,
      }).catch(() => {});
      throw error;
    }
    if (gt !== undefined) await swapInExtractedTree(yt, gt);
    logForDebugging(`Extracted plugin ZIP to session dir: ${extractDir}`);
    We = extractDir;
    ze = undefined;
  }
  let nt = await finishMarketplacePluginLoad(entry, s, h, y, S, We, {
    storageV5,
    linkFarm,
    linkFarmProducer,
    entryEnabled,
    containmentAnchorDir: ze,
  });
  if (nt && lt !== undefined) {
    if (lt.sha !== undefined) nt.gitCommitSha = lt.sha;
    weakSet_7.add(nt);
  }
  if (nt && Je !== undefined) nt.extractedFrom = Je;
  return nt;
}
//@ chunk-e6aww6q8.js:4590867-4593927 layout
/**
 * 市场插件定位到目录后的收尾：link/producer 目录检查、createPluginFromPath、合并 marketplace 条目中的组件声明（strict=false 时条目即 manifest）。
 */
async function finishMarketplacePluginLoad(
  e,
  n,
  r,
  s,
  h,
  y,
  {
    storageV5: S,
    linkFarm: w = false,
    linkFarmProducer: L,
    entryEnabled: G = r,
    containmentAnchorDir: q,
  } = {},
) {
  let Z = [];
  await materializeCachedLinks(y, S, w);
  let Se;
  let ke;
  if (w || L !== undefined) {
    Se =
      L !== undefined && !isUntrustedLinkPath(L)
        ? await resolveContainmentRoots([L, y], "plugin's producer directory")
        : await resolveContainmentRoots([y], "plugin directory");
    ke = Se;
  } else if (q !== undefined) {
    Se = await resolveContainmentRoots([q], "marketplace directory");
    ke = await resolveContainmentRoots([y, q], "plugin directory and its marketplace directory");
  } else {
    Se = await resolveContainmentRoots([y], "plugin directory");
    ke = Se;
  }
  let { plugin, errors, warnings, hasManifest } = await createPluginFromPath(
    y,
    n,
    r,
    e.name,
    e.strict ?? true,
    S,
    Se,
    undefined,
    ke,
  );
  Z.push(...errors);
  if (typeof e.source === "object" && "sha" in e.source && e.source.sha) plugin.sha = e.source.sha;
  if (
    typeof e.source === "string" &&
    e.source.split(/[\\/]/).every((We) => We === "" || We === ".") &&
    e.skills !== undefined
  ) {
    let We = Array.isArray(e.skills) ? e.skills : [e.skills];
    if (We.length > 0) {
      let ze = [];
      let lt = await validatePluginPaths(
        We,
        y,
        e.name,
        n,
        "skills",
        "Skill",
        "declared in marketplace entry but",
        ze,
        Se,
        true,
        S,
      );
      let any = ze.some((nt) => nt.type === "path-traversal");
      if (lt.length === 0 && any) {
        plugin.skillsPath = undefined;
        plugin.skillsPaths = undefined;
      } else if (lt.length > 0) {
        let nt = join(y, "skills");
        let pt = resolve_2(nt);
        let Et = resolve_2(y);
        let any = lt.some((At) => {
          let It = resolve_2(At);
          return It === pt || It === Et;
        });
        plugin.skillsPath = any ? plugin.skillsPath : undefined;
        let filtered = lt.filter((At) => {
          let It = resolve_2(At);
          return It !== pt && It !== Et;
        });
        plugin.skillsPaths = filtered.length > 0 ? filtered : undefined;
      }
    }
  }
  if (!hasManifest) {
    let We = validatePluginManifest(e, "marketplace-entry", {
      pluginName: e.name,
      manifestPath: n,
    });
    if (We.ok) {
      plugin.manifest = We.manifest;
      for (let hookNote of We.hookNotes)
        logForDebugging(`Plugin ${e.name}: ${hookNote}`, {
          level: "warn",
        });
    } else {
      if (We.unloadableGuard) throw new HookValidationError(We.error);
      logForDebugging(
        `marketplace entry ${e.name}: canonicalizeManifest rejected an entry that PluginMarketplaceEntrySchema accepted \u2014 falling back to legacy cast. ${We.error}`,
        {
          level: "warn",
        },
      );
      plugin.manifest = {
        ...e,
        id: undefined,
        source: undefined,
        strict: undefined,
      };
    }
    plugin.name = plugin.manifest.name;
    await loadMarketplaceEntryComponents(
      {
        plugin,
        entry: e,
        pluginPath: y,
        pluginId: n,
        mode: "assign",
        errors: Z,
        anchor: Se,
      },
      S,
    );
  } else if (
    !e.strict &&
    hasManifest &&
    (e.commands ||
      e.agents ||
      e.skills ||
      e.hooks ||
      e.outputStyles ||
      e.themes ||
      e.experimental?.themes ||
      false)
  ) {
    logForDebugging(
      `Plugin ${e.name} has both plugin.json and marketplace manifest entries for commands/agents/skills/hooks/outputStyles/themes/syntaxHighlighting. This is a conflict.`,
      {
        level: "error",
      },
    );
    if (G)
      s.push({
        type: "generic-error",
        source: n,
        error: `Plugin ${printableName(e.name, 200)} has conflicting manifests: both plugin.json and marketplace entry specify components. Set strict: true in marketplace entry or remove component specs from one location.`,
      });
    return null;
  } else if (hasManifest) {
    let manifest = plugin.manifest;
    let ze = (lt) => cleanOptionalText_2(lt) !== undefined;
    if (ze(e.displayName)) manifest.displayName = e.displayName;
    if (ze(e.description)) manifest.description = e.description;
    if (e.author !== undefined && ze(e.author.name))
      manifest.author = {
        ...e.author,
      };
    if (ze(e.homepage)) manifest.homepage = e.homepage;
    if (ze(e.repository)) manifest.repository = e.repository;
    if (ze(e.license)) manifest.license = e.license;
    if (e.keywords?.length) manifest.keywords = [...e.keywords];
    await loadMarketplaceEntryComponents(
      {
        plugin,
        entry: e,
        pluginPath: y,
        pluginId: n,
        mode: "append",
        errors: Z,
        anchor: Se,
      },
      S,
    );
  }
  if (r) {
    s.push(...Z);
    h.push(...warnings);
    let We = await checkDependencyGap(y, n, e.name, !w && L === undefined && q === undefined);
    if (We !== undefined) h.push(We);
  }
  return plugin;
}
//@ chunk-e6aww6q8.js:4593927-4594243 layout
/**
 * 缓存副本缺依赖时生成 dependencies-refused/not-installed 错误。
 */
async function checkDependencyGap(e, n, plugin, s) {
  if (!s) return;
  try {
    let h = await cacheCopyDependencyGap(e);
    if (h === undefined) return;
    return h.kind === "refused"
      ? {
          type: "dependencies-refused",
          source: n,
          plugin,
          reason: h.reason,
        }
      : {
          type: "dependencies-not-installed",
          source: n,
          plugin,
        };
  } catch (error) {
    logForDebugging(`Could not check the dependencies of ${n}: ${errorMessage(error)}`, {
      level: "warn",
    });
    return;
  }
}
//@ chunk-e6aww6q8.js:4594243-4594401 placement
async function realPathInsideCache(absolute) {
  let [n, r] = await Promise.all([
    realpath(absolute).catch(() => {
      return;
    }),
    realpath(anchoredPluginCachePath()).catch(() => {
      return;
    }),
  ]);
  return n !== undefined && r !== undefined && isSubpathOf(r, n, false) ? n : undefined;
}
//@ chunk-e6aww6q8.js:4594401-4594637 placement
async function cacheCopyDependencyGap(absolute) {
  if (isPluginZipCacheEnabled() || isUsingCoworkPlugins()) return;
  let n = resolve_2(getOriginalCwd(), absolute);
  let r = anchoredPluginCachePath();
  if (!isSubpathOf(r, n, false)) return;
  let s = await lstat(n).catch(() => {
    return;
  });
  if (s === undefined || !s.isDirectory()) return;
  let h = await checkLockfileSupported(n);
  return h !== undefined && (await realPathInsideCache(n)) !== undefined ? h : undefined;
}
//@ chunk-e6aww6q8.js:4594637-4596117 placement
/**
 * 从市场条目加载插件组件（代理、技能、输出风格等）。
 */
async function loadMarketplaceEntryComponents(
  { plugin, entry, pluginPath, pluginId, mode, errors, anchor },
  w,
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
      w,
    );
  if (entry.agents) {
    let G = Array.isArray(entry.agents) ? entry.agents : [entry.agents];
    let q = await validatePluginPaths(
      G,
      pluginPath,
      entry.name,
      pluginId,
      "agents",
      "Agent",
      "from marketplace entry",
      errors,
      anchor,
      false,
      w,
    );
    if (q.length > 0) plugin.agentsPaths = mode === "append" ? [...(plugin.agentsPaths || []), ...q] : q;
  }
  if (entry.skills) {
    let G = Array.isArray(entry.skills) ? entry.skills : [entry.skills];
    let q = resolve_2(join(pluginPath, "skills"));
    let filtered = (
      await validatePluginPaths(
        G,
        pluginPath,
        entry.name,
        pluginId,
        "skills",
        "Skill",
        "from marketplace entry",
        errors,
        anchor,
        true,
        w,
      )
    ).filter((Se) => resolve_2(Se) !== q);
    if (mode === "append") {
      let Se = new Set((plugin.skillsPaths || []).map((we) => resolve_2(we)));
      let filtered_2 = filtered.filter((we) => !Se.has(resolve_2(we)));
      if (filtered_2.length > 0) plugin.skillsPaths = [...(plugin.skillsPaths || []), ...filtered_2];
    } else if (filtered.length > 0) plugin.skillsPaths = filtered;
  }
  if (entry.outputStyles) {
    let G = Array.isArray(entry.outputStyles) ? entry.outputStyles : [entry.outputStyles];
    let q = await validatePluginPaths(
      G,
      pluginPath,
      entry.name,
      pluginId,
      "output-styles",
      "Output style",
      "from marketplace entry",
      errors,
      anchor,
      false,
      w,
    );
    if (q.length > 0)
      plugin.outputStylesPaths = mode === "append" ? [...(plugin.outputStylesPaths || []), ...q] : q;
  }
  let themes = entry.experimental?.themes ?? entry.themes;
  if (themes) {
    let G = Array.isArray(themes) ? themes : [themes];
    let q = await validatePluginPaths(
      G,
      pluginPath,
      entry.name,
      pluginId,
      "themes",
      "Theme",
      "from marketplace entry",
      errors,
      anchor,
      false,
      w,
    );
    if (q.length > 0) plugin.themesPaths = mode === "append" ? [...(plugin.themesPaths || []), ...q] : q;
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
//@ chunk-e6aww6q8.js:4596117-4596782 placement
async function describePluginDirShape_2(e) {
  return (
    await Promise.all(
      e.map(async (r) => {
        if (r.kind !== "path" || isZipPathCaseInsensitive(r.value)) return [r];
        let s = resolve_2(r.value);
        let h = await describePluginDirShape(s);
        if (h.kind === "plugin")
          logForDebugging(`--plugin-dir ${s} is one plugin: ${h.marker} at its top marks it`);
        if (h.kind !== "collection") return [r];
        logForDebugging(
          `--plugin-dir ${s} is a folder of plugins` +
            (h.isMarketplaceRoot
              ? ` (its ${MARKETPLACE_MANIFEST_PATH} lists plugins and is not read here; with no ${PLUGIN_MANIFEST_PATH_2} beside it the folder is not itself a plugin)`
              : " (nothing at its top marks it as one plugin)") +
            `: loading ${h.children.join(", ") || "none"}` +
            (h.skipped.length > 0 ? `; no manifest in ${h.skipped.join(", ")}` : ""),
        );
        return h.children.map((child) => ({
          ...r,
          value: join(s, child),
        }));
      }),
    )
  ).flat();
}
//@ chunk-e6aww6q8.js:4596782-4596796 placement
var PLUGIN_ZIP_FETCH_TIMEOUT_MS = 30000;
//@ chunk-e6aww6q8.js:4596796-4596830 placement
function dirHasPluginRoot(e) {
  return dirHasAnyEntry(e, PLUGIN_ROOT_MARKERS);
}
//@ chunk-e6aww6q8.js:4596830-4596957 placement
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
//@ chunk-e6aww6q8.js:4596957-4597666 placement
function entryDeclaredComponentPaths(entry) {
  if (!entry || typeof entry !== "object") return [];
  let n = entry;
  let mapped = MANIFEST_COMPONENT_KEYS.filter((S) => S !== "experimental").map((S) => n[S]);
  let experimental = n.experimental;
  if (experimental && typeof experimental === "object" && !Array.isArray(experimental)) {
    let S = experimental;
    mapped.push(S.themes);
  }
  let h = [];
  let y = false;
  for (let S of mapped) {
    let w = Array.isArray(S)
      ? S
      : typeof S === "string"
        ? [S]
        : S && typeof S === "object"
          ? Object.values(S).map((L) => (L && typeof L === "object" && !Array.isArray(L) ? L.source : L))
          : [];
    for (let L of w) {
      if (typeof L !== "string" || L.length === 0) continue;
      if (/^[a-z][a-z\d+.-]*:\/\//i.test(L)) continue;
      let filePath = L.startsWith("./") ? L.slice(2) : L;
      if (filePath === "" || filePath === ".") continue;
      if (filePath.split(/[\\/]/).some((q) => /^[. ]+$/.test(q)) || !isSafeZipPath(filePath)) {
        y = true;
        continue;
      }
      h.push(filePath);
      if (h.length >= 32) return h;
    }
  }
  if (h.length === 0 && y) return null;
  return h;
}
//@ chunk-e6aww6q8.js:4597666-4597787 placement
function entryDeclaresComponents(entry) {
  if (!entry || typeof entry !== "object") return false;
  let n = entry;
  return MANIFEST_COMPONENT_KEYS.some((r) => (r === "experimental" ? isRecord(n[r]) : isNonEmptyValue(n[r])));
}
//@ chunk-e6aww6q8.js:4597787-4597967 placement
function isNonEmptyValue(e) {
  if (e === undefined || e === null) return false;
  if (Array.isArray(e)) return e.length > 0;
  if (typeof e === "string") return e.length > 0;
  return typeof e === "object" && Object.keys(e).length > 0;
}
//@ chunk-e6aww6q8.js:4597967-4598091 placement
function isRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  let n = value;
  if (THEME_ONLY_KEYS.some((r) => isNonEmptyValue(n[r]))) return true;
  return false;
}
//@ chunk-e6aww6q8.js:4598091-4598149 placement
var RELATIVE_PATH_RE = /^[A-Za-z0-9_.$-]+(\/[A-Za-z0-9_.$-]+)*$/;
var MAX_EXAMPLE_PATH_LENGTH = 120;
//@ chunk-e6aww6q8.js:4598149-4598229 placement
function examplePathSuffix(e) {
  if (!e || e.length > MAX_EXAMPLE_PATH_LENGTH || !RELATIVE_PATH_RE.test(e)) return "";
  return ` (e.g. ${e})`;
}
//@ chunk-e6aww6q8.js:4598229-4598255 placement
var MANIFEST_IDENTITY_READ_RELPATHS = [PLUGIN_MANIFEST_PATH_2];
var MANIFEST_IDENTITY_READ_PATHS = [PLUGIN_MANIFEST_PATH_2, PLUGIN_JSON];
//@ chunk-e6aww6q8.js:4598255-4598333 placement
async function hasManifestIdentityFile(pluginRootInExtracted) {
  for (let n of MANIFEST_IDENTITY_READ_PATHS)
    if (await pathExists(join(pluginRootInExtracted, n))) return true;
  return false;
}
//@ chunk-e6aww6q8.js:4598333-4598464 placement
async function anyPathExistsUnder(e, n) {
  let r = resolve_2(e);
  for (let s of n) {
    let h = resolve_2(r, s);
    if (!h.startsWith(r + sep)) continue;
    if (await pathExists(h)) return true;
  }
  return false;
}
//@ chunk-e6aww6q8.js:4598464-4598643 placement
async function findSingleTopDir(pluginRootInExtracted) {
  let filtered = (
    await readdir(pluginRootInExtracted, {
      withFileTypes: true,
    })
  ).filter((r) => r.name !== "__MACOSX" && r.name !== ".DS_Store");
  return filtered.length === 1 && filtered[0].isDirectory()
    ? join(pluginRootInExtracted, filtered[0].name)
    : undefined;
}
//@ chunk-e6aww6q8.js:4598643-4598714 placement
function isPluginNameAcceptable(name, n, r) {
  if (n && !r) return false;
  return name.length === 0 || PLUGIN_NAME_FORBIDDEN_CHARS_RE.test(name);
}
//@ chunk-e6aww6q8.js:4598714-4598789 placement
function directoryPluginFallbackName(e, n) {
  let replaced = basename(e).replace(/\.zip$/i, "");
  return n === SYNCED ? stripGenerationSuffix(replaced) : replaced;
}
//@ chunk-e6aww6q8.js:4598789-4598832 placement
function syncedPluginFolderId(e) {
  return `${directoryPluginFallbackName(e, SYNCED)}@${SYNCED}`;
}
//@ chunk-e6aww6q8.js:4598832-4599039 placement
async function syncedPluginMintedName(e, n) {
  let r = directoryPluginFallbackName(e, SYNCED);
  try {
    let { manifest, manifestPath } = await loadPluginManifest(
      e,
      r,
      `${r}@${SYNCED}`,
      [],
      {
        noTelemetry: true,
      },
      n,
    );
    let y = manifestPath === null || basename(manifestPath) === "SKILL.md";
    return isPluginNameAcceptable(manifest.name, y, true) ? undefined : manifest.name;
  } catch {
    return;
  }
}
//@ chunk-e6aww6q8.js:4599039-4599129 placement
function attributionFromManifest(e) {
  return e.unread === true
    ? {}
    : {
        attribution: {
          marketplaceName: e.marketplaceName,
        },
      };
}
//@ chunk-e6aww6q8.js:4599129-4599602 placement
/**
 * 插件名非法时的 manifest-validation-error。
 */
function invalidPluginNameError(plugin, source, manifestPath, s, h, y) {
  let S = manifestPath === null || basename(manifestPath) === "SKILL.md";
  if (isPluginNameAcceptable(plugin.name, S, s))
    return {
      type: "manifest-validation-error",
      source,
      manifestPath: manifestPath ?? plugin.path,
      validationErrors: [
        `name: "${stripInvisibleKeepEmoji(plugin.name)}" is not a valid plugin name (must be non-empty and must not contain "@", ":", whitespace, path separators, or invisible/control characters)${S ? " \u2014 this plugin is named after its directory; rename the directory" : ""}`,
      ],
      ...(h !== undefined && {
        path: h,
      }),
      ...(y !== undefined && attributionFromManifest(y)),
    };
  return null;
}
//@ chunk-e6aww6q8.js:4599602-4600076 placement
/**
 * 记一次桌面技能目录保留命名空间检查结果。
 */
function logReservedNamespaceWrapperCheck(e) {
  if (e.length === 0 || !claimOnce().claim("skill_reserved_namespace_wrapper_check")) return;
  let folders = e.length;
  let r = {
    desktop_skills_folder_path: fromEnum(
      desktopSkillsPluginDir() === undefined
        ? "not_sent"
        : e.some((h) => h.isNamedFolder)
          ? "matched"
          : "not_matched",
    ),
  };
  if (e.some((h) => h.failedLeg === undefined)) {
    logFeatureOk("skill_reserved_namespace", {
      check: lit_2("desktop_wrapper_marked"),
      folders,
      ...r,
    });
    return;
  }
  let failedLeg = e[0]?.failedLeg;
  if (failedLeg !== undefined)
    logFeatureSad("skill_reserved_namespace", "desktop_wrapper_unmarked", {
      failed_leg: fromEnum(failedLeg),
      folders,
      ...r,
    });
}
//@ chunk-e6aww6q8.js:4600076-4600286 placement
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
//@ chunk-e6aww6q8.js:4600286-4600471 placement
function isOperatorSettingSource_2(e) {
  switch (e) {
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
//@ chunk-e6aww6q8.js:4600471-4600772 placement
/**
 * 插件在设置中被显式禁用（可只认操作者设置）。
 */
function isPluginDisabledBySettings(
  e,
  marketplaceName,
  enabledPluginsIndexed,
  s,
  { repoAuthoredContent: h = false, installationPreference: y } = {},
) {
  if (isRequiredPlugin(`${e}@${marketplaceName}`, y)) return false;
  let S = h ? settingsSourcesReversed() : undefined;
  let w = (L) => {
    let pluginSetting = findPluginSetting(L, enabledPluginsIndexed);
    if (pluginSetting === undefined || pluginSetting.enabled) return false;
    if (S === undefined) return true;
    let q = S[pluginSetting.index];
    return q !== undefined && isOperatorSettingSource_2(q);
  };
  return w(`${e}@${marketplaceName}`) || (s !== undefined && w(`${s}@${marketplaceName}`));
}
//@ chunk-e6aww6q8.js:4600772-4600925 placement
function isUnderOriginalCwd(e) {
  let originalCwd = getOriginalCwd();
  if (
    isPathWithin_2(originalCwd, e, {
      foldCase: true,
    })
  )
    return true;
  let r = (s) => resolve_2(s).normalize("NFC").toLowerCase();
  return isPathWithin_2(r(originalCwd), r(e), {
    alreadyComparable: true,
  });
}
//@ chunk-e6aww6q8.js:4600925-4601068 placement = ghIsDangerousCallback (1)
function ghIsDangerousCallback(_rawCommand, args) {
  return (args ? replaceAll(_rawCommand, args, redactUrlQuery(args)) : _rawCommand)
    .split(/(\s+)/)
    .map((s) =>
      s.includes("://") && /["'`<>]/.test(s) && /[@?#]/.test(s) ? REDACTED_URL : redactUrlsInLoadError(s),
    )
    .join("");
}
//@ chunk-e6aww6q8.js:4601068-4601393 placement
/**
 * 错误文字中的 URL 脱敏（含凭证与查询串）。
 */
function redactUrlsInLoadError(e) {
  let replaced = e.replace(/[a-z][a-z0-9+.-]{0,31}:\/\/[^\s"']*/gi, (r, s) => {
    if (/[?#]/.test(r)) return redactUrlsTracked(r);
    let index = r.indexOf("@");
    if (index === -1) return r;
    let y = s === 0 || /[([]/.test(e[s - 1] ?? "");
    let sliced = r.slice(r.indexOf("//") + 2, index);
    return y && index === r.lastIndexOf("@") && !sliced.includes(":")
      ? redactUrlQuery(r)
      : redactUrlsTracked(r);
  });
  return redactUrlsInMessage(replaced).replace(/\?[^\s"']*/g, "");
}
//@ chunk-e6aww6q8.js:4601393-4607537 callgraph-witnessed = loadSessionOnlyPlugins (0.231)
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
  let y;
  let results = await Promise.all(
    specs.map(async (spec, Se) => {
      let ke = commandIdGeneration();
      let we =
        spec.kind === "url"
          ? {}
          : {
              unread: true,
            };
      let Ee;
      let wrapperCheck;
      let Ie;
      try {
        let Me;
        let We;
        if (spec.kind === "url") {
          let sessionPluginCachePath = await getSessionPluginCachePath();
          let It = new URL(spec.value);
          let Yt = It.origin + It.pathname;
          let qt = basename(It.pathname).replace(/\.zip$/i, "") || "download";
          Me = join(sessionPluginCachePath, `url-${Se}-${qt.replace(/[^a-zA-Z0-9\-_]/g, "-")}.zip`);
          try {
            let response = await fetch(spec.value, {
              ...getProxyFetchOptions({
                url: spec.value,
              }),
              signal: AbortSignal.timeout(PLUGIN_ZIP_FETCH_TIMEOUT_MS),
            });
            if (!response.ok || !response.body)
              throw Error(`HTTP ${response.status} ${response.statusText} from ${Yt}`);
            let rn = Number(response.headers.get("content-length"));
            if (rn > MAX_SPILL_BYTES)
              throw Error(`Plugin archive too large (${rn} bytes, max ${MAX_SPILL_BYTES}) from ${Yt}`);
            let pn = 0;
            let no = Readable.fromWeb(response.body);
            no.on("data", (ho) => {
              pn += ho.byteLength;
              if (pn > MAX_SPILL_BYTES)
                no.destroy(Error(`Plugin archive exceeded ${MAX_SPILL_BYTES} bytes from ${Yt}`));
            });
            let hn = `${Me}.${preview ? "preview-" : ""}${randomBytes(4).toString("hex")}.part`;
            Ee = hn;
            await pipeline(no, createWriteStream(hn));
            if (preview) We = hn;
            else {
              await retryFsOp(hn, Me);
              Ee = undefined;
            }
            logForDebugging(`Downloaded inline plugin from ${Yt}`);
          } catch (error) {
            if (!(await pathExists(Me))) throw error;
            logForDebugging(`Re-fetch of inline plugin from ${Yt} failed; reusing cached ${Me}`, {
              level: "warn",
            });
          }
        } else {
          Me = resolve_2(spec.value);
          markSyncedFolderRefused();
          let At;
          try {
            await stat(Me);
          } catch (error) {
            At = getErrnoCode(error) ?? "UNKNOWN";
          }
          let It = At;
          if (At !== undefined && Me.startsWith("/mnt/")) {
            await sleep(250);
            try {
              await stat(Me);
              logForDebugging(
                `Plugin path ${Me}: first stat failed with ${At}, retry succeeded (transient mount race)`,
                {
                  level: "warn",
                },
              );
              At = undefined;
            } catch (error) {
              At = getErrnoCode(error) ?? "UNKNOWN";
            }
          }
          if (At === "ENOENT" && marketplaceName === SYNCED) {
            y ??= listSyncedPluginDirsOnly().catch((error) => {
              logError(error);
              return [];
            });
            let Yt = Me;
            let resolvedPath = stripGenerationSuffix(basename(Yt));
            let found = (await y)
              .map((rn) => resolve_2(rn))
              .find(
                (rn) =>
                  rn !== Yt &&
                  dirname(rn) === dirname(Yt) &&
                  stripGenerationSuffix(basename(rn)) === resolvedPath &&
                  !specs.some((spec) => spec.kind === "path" && resolve_2(spec.value) === rn),
              );
            if (found !== undefined) {
              markSyncedPluginDirsLoadedHere([found]);
              try {
                await stat(found);
                logForDebugging(
                  `Synced plugin dir ${Yt} is gone; the sync manifest now places it at ${found}, loading that`,
                  {
                    level: "warn",
                  },
                );
                Me = found;
                At = undefined;
                Ie = found;
              } catch (error) {
                logForDebugging(
                  `Synced plugin dir ${Yt} is gone and its manifest successor ${found} did not stat either (${getErrnoCode(error) ?? "UNKNOWN"})`,
                  {
                    level: "warn",
                  },
                );
              }
            }
          }
          we = await getPluginAttribution(Me);
          if (At !== undefined) {
            let Yt = At !== "ENOENT" ? At : It !== "ENOENT" ? It : undefined;
            logForDebugging(
              `Plugin path does not exist: ${Me} (${At}${Yt && Yt !== At ? `, first ${Yt}` : ""}), skipping`,
              {
                level: "warn",
              },
            );
            let qt = directoryPluginFallbackName(Me, marketplaceName);
            if (
              isPluginDisabledBySettings(qt, marketplaceName, enabledPluginsIndexed, undefined, {
                repoAuthoredContent: isUnderOriginalCwd(Me),
                installationPreference: we.installationPreference,
              })
            ) {
              logForDebugging(`Skipping load-failure error for disabled plugin ${qt}@${marketplaceName}`);
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
                  source: `${marketplaceName}[${Se}]`,
                  path: Me,
                  component: "commands",
                  ...(Yt && {
                    errno: Yt,
                  }),
                },
              ],
              warnings: [],
            };
          }
        }
        let dirName = isZipPathCaseInsensitive(Me);
        let lt;
        let Je = directoryPluginFallbackName(Me, marketplaceName);
        if (dirName) {
          let sessionPluginCachePath = await getSessionPluginCachePath();
          let It = join(sessionPluginCachePath, `inline-${Se}-${Je.replace(/[^a-zA-Z0-9\-_]/g, "-")}`);
          let Yt = It;
          let qt = We ?? Me;
          if (preview) {
            Yt = await extractPreviewArchive(qt, sessionPluginCachePath, It);
            logForDebugging(`Previewing inline plugin zip from ${Yt}`);
          } else {
            let Zt = planArchiveExtraction(sessionPluginCachePath, It);
            let sessionArchive = await extractSessionArchive(qt, Zt);
            if (sessionArchive !== undefined) {
              logForDebugging(`Extracted inline plugin zip; swapping it into ${It}`);
              await swapInExtractedTree(Zt, sessionArchive);
            } else logForDebugging(`Inline plugin zip unchanged; loading ${It}`);
          }
          Me = await findPluginRootInExtracted(Yt);
          if (Me !== Yt) logForDebugging(`Inline plugin zip had wrapper directory; using ${Me}`);
          if (preview) lt = await statDirIdentity(Me, "before");
        }
        let { plugin, errors, warnings, manifestPath } = await createPluginFromPath(
          Me,
          `${Je}@${marketplaceName}`,
          true,
          Je,
          true,
          storageV5,
        );
        if (lt !== undefined) await assertDirUnchanged(Me, lt);
        let gt = invalidPluginNameError(
          plugin,
          `${marketplaceName}[${Se}]`,
          manifestPath,
          marketplaceName === SYNCED,
          spec.kind === "path" ? resolve_2(spec.value) : undefined,
          we,
        );
        if (gt) {
          if (
            isPluginDisabledBySettings(Je, marketplaceName, enabledPluginsIndexed, plugin.name, {
              repoAuthoredContent: spec.kind === "path" && isUnderOriginalCwd(resolve_2(spec.value)),
              installationPreference: we.installationPreference,
            })
          ) {
            logForDebugging(`Skipping load-failure error for disabled plugin ${Je}@${marketplaceName}`);
            return {
              plugin: undefined,
              errors,
              warnings,
            };
          }
          return {
            plugin: undefined,
            errors: [gt, ...errors],
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
          let At =
            spec.kind !== "path"
              ? "not_a_path"
              : isZipPathCaseInsensitive(spec.value)
                ? "archive"
                : undefined;
          let It = desktopSkillsPluginDir();
          let Yt =
            At === undefined && It !== undefined && normalizeRegistryKey(It) === normalizeRegistryKey(Me);
          if (At === undefined) plugin.accountSkillsWrapper = true;
          if (Yt) plugin.hostNamedSkillsFolder = true;
          wrapperCheck = {
            failedLeg: At,
            isNamedFolder: Yt,
          };
        }
        if (
          marketplaceName === SYNCED &&
          spec.kind === "path" &&
          spec.attestation !== undefined &&
          Ie === undefined &&
          plugin.name === spec.attestation.pluginName
        )
          plugin.officialAttestation = {
            marketplace: spec.attestation.marketplace,
          };
        if (we.serverPluginId !== undefined) plugin.serverPluginId = we.serverPluginId;
        if (we.installationPreference !== undefined)
          plugin.installationPreference = we.installationPreference;
        if (we.marketplaceKind !== undefined && marketplaceName === SYNCED)
          plugin.marketplaceKind = we.marketplaceKind;
        if (we.marketplaceName !== undefined) {
          plugin.attributedMarketplaceName = we.marketplaceName;
          registerCommandId(plugin.name, marketplaceSuffix(plugin.repository), we.marketplaceName, ke);
        }
        plugin.enabled = isPluginEnabled_2(
          plugin.source,
          enabledPluginsIndexed,
          plugin.manifest.defaultEnabled,
          we.installationPreference,
        );
        if (spec.kind === "path" && spec.skipMcpDiscovery) {
          plugin.skipMcpDiscovery = true;
          plugin.mcpServers = {};
        }
        logForDebugging(`Loaded inline plugin from path: ${plugin.name}`);
        return {
          plugin,
          errors,
          warnings,
          wrapperCheck,
        };
      } catch (error) {
        let We = (pt) => ghIsDangerousCallback(pt, spec.kind === "url" ? spec.value : undefined);
        let errorMsg = We(errorMessage(error));
        logForDebugging(
          `Failed to load session plugin from ${spec.kind === "url" ? We(spec.value) : spec.value}: ${errorMsg}`,
          {
            level: "warn",
          },
        );
        let lt;
        let Je;
        if (spec.kind === "path") {
          Je = Ie ?? resolve_2(spec.value);
          lt = directoryPluginFallbackName(Je, marketplaceName);
        } else
          try {
            let pt = new URL(spec.value);
            let Et = basename(pt.pathname).replace(/\.zip$/i, "") || "download";
            lt = `url-${Se}-${Et.replace(/[^a-zA-Z0-9\-_]/g, "-")}`;
          } catch {}
        let nt =
          lt !== undefined && Je !== undefined && !isZipPathCaseInsensitive(Je)
            ? await loadPluginManifest(
                Je,
                lt,
                `${lt}@${marketplaceName}`,
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
          lt !== undefined &&
          isPluginDisabledBySettings(lt, marketplaceName, enabledPluginsIndexed, nt, {
            repoAuthoredContent: Je !== undefined && isUnderOriginalCwd(Je),
            installationPreference: we.installationPreference,
          })
        ) {
          logForDebugging(`Skipping load-failure error for disabled plugin ${lt}@${marketplaceName}`);
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
              source: `${marketplaceName}[${Se}]`,
              error: `Failed to load plugin: ${commandSourceErrorMessage(error, We)}`,
              ...(Je !== undefined && {
                path: Je,
              }),
              ...(nt !== undefined && {
                manifestName: nt,
              }),
              ...attributionFromManifest(we),
            },
          ],
          warnings: [],
        };
      } finally {
        if (Ee !== undefined) {
          let Me = Ee;
          await retryTransient(() =>
            rm_2(Me, {
              force: true,
            }),
          ).catch((error) => {
            logForDebugging(`Failed to remove the temporary download ${Me}: ${errorMessage(error)}`, {
              level: "warn",
            });
          });
        }
      }
    }),
  );
  let flattened = results.flatMap((Z) => (Z.plugin ? [Z.plugin] : []));
  let errors = results.flatMap((Z) => Z.errors);
  let warnings = results.flatMap((Z) => Z.warnings);
  let flattened_2 = results.flatMap((Z) => (Z.wrapperCheck ? [Z.wrapperCheck] : []));
  if (flattened_2.length > 0) logReservedNamespaceWrapperCheck(flattened_2);
  if (flattened.length > 0) logForDebugging(`Loaded ${flattened.length} directory-loaded plugins`);
  return {
    plugins: flattened,
    errors,
    warnings,
  };
}
//@ chunk-e6aww6q8.js:4607537-4607820 placement = isRealPathWithinTeamDir (0.772)
async function listDirNamesSet(e, n) {
  let r = isStorageV5Enabled() && e !== undefined ? thinkbackStorageKey(n) : null;
  if (e !== undefined && r !== null) {
    let s = await listStorageScopeNames(e, r);
    if (s.error === undefined) return new Set(s.names.map(({ name: h }) => h));
    throw Error(formatStorageError(s.error));
  }
  try {
    return new Set(await readdir(n));
  } catch (error) {
    if (isENOENT(error) || getErrnoCode(error) === "ENOTDIR") return new Set();
    throw error;
  }
}
//@ chunk-e6aww6q8.js:4607820-4607906 placement
async function hasClaudePluginEntry(e, dir, r) {
  if ((await listDirNamesSet(e, dir)).has(".claude-plugin")) return true;
  return false;
}
//@ chunk-e6aww6q8.js:4607906-4611594 placement
async function loadSkillsAsPlugins(storageV5, enabledPluginsBySource = getEnabledPluginsBySource()) {
  let skillsAsPlugins = await loadSkillsAsPlugins_2(storageV5);
  let s = [];
  let h = isPersonalConfigRestricted();
  let y = 0;
  let filtered = skillsAsPlugins.filter((skillsAsPlugin) => {
    if (skillsAsPlugin.scope === "project" && !isWorkspaceTrustedForMarketplace()) {
      s.push(skillsAsPlugin);
      return false;
    }
    if (skillsAsPlugin.scope === "user" && h) {
      y++;
      return false;
    }
    return true;
  });
  if (y > 0)
    logForDebugging(
      `[skill-as-plugin] not loading plugins from ${y} folder(s) in your own skills directory (CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG); they load as skills only`,
    );
  let w = (we, scope, Ae) =>
    isPluginDisabledBySettings(we, SKILLS_DIR, enabledPluginsBySource, Ae, {
      repoAuthoredContent: scope === "project",
    });
  let L = await pMap(
    filtered,
    async ({ dir, scope }) => {
      await new Promise((resolve) => setImmediate(resolve));
      let Ae = basename(dir);
      try {
        if (!(await hasClaudePluginEntry(storageV5, dir, Ae).catch(() => false))) return null;
        let { plugin, errors, warnings, hasManifest, manifestPath } = await createPluginFromPath(
          dir,
          `${Ae}@${SKILLS_DIR}`,
          true,
          Ae,
          false,
          storageV5,
        );
        if (!isSkillCustomizationBookingAllowed(plugin, hasManifest))
          return errors.length || warnings.length
            ? {
                plugin: null,
                errors,
                warnings,
              }
            : null;
        let Je = invalidPluginNameError(plugin, `${Ae}@${SKILLS_DIR}`, manifestPath, false);
        if (Je) {
          if (w(Ae, scope, plugin.name)) {
            logForDebugging(`Skipping load-failure error for disabled plugin ${Ae}@${SKILLS_DIR}`);
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
            errors: [Je, ...errors],
            warnings,
          };
        }
        dropUnprintableManifestVersion(plugin);
        plugin.source = `${plugin.name}@${SKILLS_DIR}`;
        plugin.repository = plugin.source;
        plugin.scope = scope;
        if (scope === "project") {
          let mapped = (plugin.monitors ?? []).map((pt, Et) => pt.name ?? `#${Et + 1}`);
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
        return {
          plugin,
          errors,
          warnings,
        };
      } catch (error) {
        let Me = await loadPluginManifest(
          dir,
          Ae,
          `${Ae}@${SKILLS_DIR}`,
          [],
          {
            noTelemetry: true,
          },
          storageV5,
        )
          .then(({ manifest }) => manifest.name)
          .catch(() => {
            return;
          });
        if (w(Ae, scope, Me)) {
          logForDebugging(`Skipping load-failure error for disabled plugin ${Ae}@${SKILLS_DIR}`);
          return null;
        }
        return {
          plugin: null,
          errors: [
            manifestErrorToPluginError(error, `${Ae}@${SKILLS_DIR}`, undefined) ?? {
              type: "generic-error",
              source: `${Ae}@${SKILLS_DIR}`,
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
  let G = [];
  let q = [];
  let Z = new Map();
  for (let we of L) {
    if (!we) continue;
    if (!we.plugin) {
      G.push(...we.errors);
      q.push(...we.warnings);
      continue;
    }
    let Ee = Z.get(we.plugin.name);
    if (Ee) {
      let Ae = Ee.scope !== we.plugin.scope;
      G.push({
        type: "generic-error",
        orphan: true,
        source: `${basename(we.plugin.path)}@${SKILLS_DIR}`,
        error: Ae
          ? `Not loaded \u2014 your ${printableOrEmpty(displaySkillsDirPath(Ee))} (same plugin name "${quotedPrintable(we.plugin.name)}") shadowed the project's ${printableOrEmpty(displaySkillsDirPath(we.plugin))}. To use the project's copy here, rename or move yours.`
          : `Not loaded \u2014 same plugin name "${quotedPrintable(we.plugin.name)}" as ${printableOrEmpty(displaySkillsDirPath(Ee))} (which loaded instead). Delete ${printableOrEmpty(displaySkillsDirPath(we.plugin))}, or give it a different "name" in its plugin.json.`,
      });
      continue;
    }
    G.push(...we.errors);
    q.push(...we.warnings);
    Z.set(we.plugin.name, we.plugin);
  }
  let Se = [...Z.values()];
  for (let we of Se)
    we.enabled = isPluginEnabled_2(we.source, enabledPluginsBySource, we.manifest.defaultEnabled, undefined);
  let filtered_2 = (
    await pMap(
      s,
      async (we) => {
        await new Promise((resolve) => setImmediate(resolve));
        try {
          return (await hasClaudePluginEntry(storageV5, we.dir, basename(we.dir))) ? we : null;
        } catch {
          return we;
        }
      },
      {
        concurrency: 32,
      },
    )
  ).filter((we) => we !== null);
  if (filtered_2.length > 0) {
    let we = filtered_2.length;
    q.push({
      type: "project-scope-suppressed-untrusted",
      source: `(suppressed)@${SKILLS_DIR}`,
      count: we,
      warning: `${we} project-scope ${we === 1 ? "directory" : "directories"} under ./.claude/skills/ that may load as ${we === 1 ? "a plugin" : "plugins"} ${we === 1 ? "was" : "were"} skipped because this workspace was not trusted when plugins were scanned. After accepting the trust dialog, run /reload-plugins (or relaunch) to load what qualifies.`,
    });
  }
  logEvent("tengu_plugin_skills_dir_loaded", {
    count: Se.length,
    user_count: count(Se, (we) => we.scope === "user"),
    project_count: count(Se, (we) => we.scope === "project"),
    project_suppressed_count: filtered_2.length,
    error_count: G.length,
  });
  if (Se.length > 0) logForDebugging(`Loaded ${Se.length} skills-as-plugins`);
  return {
    plugins: Se,
    errors: G,
    warnings: q,
  };
}
//@ chunk-e6aww6q8.js:4611594-4611707 placement
function localCopyShadowingSynced(e, n) {
  let r = nfcLower(e);
  return n.find(
    (s) =>
      s.enabled !== false &&
      marketplaceSuffix(s.source) !== SYNCED &&
      pluginNameAliases(s).some((h) => nfcLower(h) === r),
  );
}
//@ chunk-e6aww6q8.js:4611707-4612189 layout
/**
 * 操作者设置中被禁用的 synced/inline 插件名。
 */
function collectDisabledInlineNames(e, n) {
  let filtered = e.filter((S, w) => {
    let L = n[w];
    return S !== undefined && L !== undefined && L !== "policySettings" && isOperatorSettingSource_2(L);
  });
  let filtered_2 = e.filter((S, w) => S !== undefined && n[w] === "localSettings");
  let h = new Set();
  for (let S of [...filtered, ...filtered_2])
    for (let key of Object.keys(S?.record ?? {})) {
      let L = normalizePluginId(key);
      let G = marketplaceSuffix(L);
      if (G === SYNCED || G === INLINE_PLUGIN_MARKETPLACE) h.add(L);
    }
  let y = new Set();
  for (let S of h) {
    let w = nfcLower(S.slice(0, S.lastIndexOf("@")));
    if (findPluginSetting(S, filtered)?.enabled === false) {
      y.add(w);
      continue;
    }
    let L = nfcLower(S);
    if (filtered_2.some((G) => G?.byFold.get(L)?.enabled === false)) y.add(w);
  }
  return y;
}
//@ chunk-e6aww6q8.js:4612189-4612370 layout
function countAdmittedPluginNames(e, managedEntries) {
  let r = new Map();
  for (let s of e)
    if (
      s.enabled !== false &&
      matchPolicyPluginEntry(managedEntries, s.name, s.attributedMarketplaceName).outcome === "admitted"
    ) {
      let h = nfcLower(s.name);
      r.set(h, (r.get(h) ?? 0) + 1);
    }
  return r;
}
//@ chunk-e6aww6q8.js:4612370-4617007 callgraph-fingerprint = mergePluginSources (0.184)
/**
 * 合并各来源插件（session/marketplace/skills-dir/synced/builtin），同名时按 托管策略 > 会话 > 市场 的优先级去重，托管锁定（managed）条目可强制启用/禁用，记录冲突警告。
 */
function mergePluginSources(sources) {
  let n = [];
  let r = [];
  let managedEntries = sources.managedEntries;
  let h = sources.recordedDisableFolds ?? new Set();
  for (let Se of [sources.session, sources.synced ?? []])
    for (let ke of Se) {
      if (
        matchPolicyPluginEntry(managedEntries, ke.name, ke.attributedMarketplaceName).outcome !== "admitted"
      )
        continue;
      if (h.has(nfcLower(ke.name)) && !isRequiredPlugin(ke.source, ke.installationPreference)) {
        ke.enabled = false;
        r.push({
          type: "managed-plugin-disabled-by-settings",
          source: ke.source,
        });
      } else if (ke.enabled === false) ke.enabled = true;
    }
  let y = countAdmittedPluginNames(sources.session, managedEntries);
  let S = countAdmittedPluginNames(sources.synced ?? [], managedEntries);
  let sessionPlugins = sources.session.filter((Se) => {
    let ke = matchPolicyPluginEntry(managedEntries, Se.name, Se.attributedMarketplaceName);
    if (ke.outcome === "locked") {
      let we =
        Se.attributedMarketplaceName !== undefined ||
        Se.serverPluginId !== undefined ||
        Se.installationPreference !== undefined;
      logForDebugging(
        `Plugin "${Se.name}" from ${we ? "a sync-attributed directory" : "--plugin-dir"} is blocked by managed settings`,
        {
          level: "warn",
        },
      );
      n.push({
        type: "generic-error",
        orphan: true,
        source: Se.source,
        plugin: Se.name,
        error: `${we ? "sync-attributed" : "--plugin-dir"} copy of "${quotedPrintable(Se.name)}" ignored: plugin is locked by managed settings`,
      });
      return false;
    }
    if (ke.outcome === "admitted" && Se.enabled !== false) {
      let we = nfcLower(Se.name);
      if ((y.get(we) ?? 0) > 1) {
        n.push({
          type: "generic-error",
          orphan: true,
          source: Se.source,
          plugin: Se.name,
          error: `sync-attributed copy of "${quotedPrintable(Se.name)}" ignored: multiple session copies claim the managed plugin's marketplace, so none is loaded`,
        });
        return false;
      }
      let Ee = nfcLower(Se.name);
      let Ae =
        [...sources.marketplace, ...sources.builtin].find(
          (Ie) => Ie.enabled !== false && pluginNameAliases(Ie).some((Me) => nfcLower(Me) === Ee),
        ) ??
        sources.synced?.find(
          (Ie) =>
            Ie.enabled !== false &&
            nfcLower(Ie.name) === Ee &&
            matchPolicyPluginEntry(managedEntries, Ie.name, Ie.attributedMarketplaceName).outcome ===
              "admitted",
        );
      if (Ae) {
        logForDebugging(`Admitted session copy of managed plugin "${Se.name}" shadowed by ${Ae.source}`);
        r.push({
          type: "synced-plugin-shadowed",
          orphan: true,
          source: Se.source,
          shadowedBy: stripInvisibleKeepEmoji(Ae.source),
        });
        return false;
      }
      Se.admittedByManagedLock = true;
      if (sources.managedHooksOnly)
        r.push({
          type: "managed-hooks-restricted",
          source: Se.source,
        });
    }
    return true;
  });
  let sessionNames = new Set(
    sessionPlugins
      .filter((sessionPlugin) => sessionPlugin.enabled !== false)
      .map((sessionPlugin) => sessionPlugin.name),
  );
  let marketplacePlugins = sources.marketplace.filter((Se) => {
    if (sessionNames.has(Se.name)) {
      logForDebugging(`Plugin "${Se.name}" from --plugin-dir overrides installed version`);
      return false;
    }
    return true;
  });
  let q = [];
  if (sources.skill?.length) {
    let Se = new Map();
    for (let marketplacePlugin of marketplacePlugins)
      Se.set(marketplacePlugin.name, `an installed plugin (${marketplacePlugin.source})`);
    for (let sessionName of sessionNames)
      Se.set(sessionName, "a session-only plugin (--plugin-dir / --plugin-url)");
    q = sources.skill.filter((ke) => {
      let we =
        matchPolicyPluginEntry(managedEntries, ke.name).outcome === "locked"
          ? "managed settings"
          : Se.get(ke.name);
      if (!we) return true;
      n.push({
        type: "generic-error",
        orphan: true,
        source: `${basename(ke.path)}@${SKILLS_DIR}`,
        error: `Not loaded \u2014 the name "${quotedPrintable(ke.name)}" is already taken by ${quotedPrintable(we)}, which takes precedence. Give the plugin at ${printableOrEmpty(displaySkillsDirPath(ke))} a different "name" (in plugin.json or SKILL.md frontmatter) to load this copy.`,
      });
      return false;
    });
  }
  let Z = [];
  if (sources.synced?.length) {
    let Se = new Map();
    for (let we of [sessionPlugins, marketplacePlugins, q, sources.builtin])
      for (let Ee of we)
        for (let Ae of pluginNameAliases(Ee)) {
          let Ie = nfcLower(Ae);
          if (Ee.enabled !== false && !Se.has(Ie)) Se.set(Ie, Ee.source);
        }
    let ke = new Map();
    Z = sources.synced.filter((we) => {
      let Ee = matchPolicyPluginEntry(managedEntries, we.name, we.attributedMarketplaceName);
      if (Ee.outcome === "locked") {
        n.push({
          type: "generic-error",
          orphan: true,
          source: we.source,
          error: `claude.ai-synced copy of "${we.name}" ignored: plugin is locked by managed settings`,
        });
        return false;
      }
      if (Ee.outcome === "admitted" && we.enabled !== false && (S.get(nfcLower(we.name)) ?? 0) > 1) {
        n.push({
          type: "generic-error",
          orphan: true,
          source: we.source,
          error: `claude.ai-synced copy of "${quotedPrintable(we.name)}" ignored: multiple synced copies claim the managed plugin's marketplace, so none is loaded`,
        });
        return false;
      }
      let Ae = ke.get(nfcLower(we.name));
      if (Ae) {
        n.push({
          type: "generic-error",
          orphan: true,
          source: `${basename(we.path)}@${SYNCED}`,
          error:
            Ae.fate === "used"
              ? `Not loaded \u2014 the claude.ai-synced copy in ${basename(we.path)}/ declares the same plugin name "${we.name}" as ${basename(Ae.first.path)}/, which is used instead`
              : Ae.fate === "disabled"
                ? `Not loaded \u2014 the claude.ai-synced copy in ${basename(we.path)}/ declares the same plugin name "${we.name}" as ${basename(Ae.first.path)}/, which is kept as a disabled row`
                : `Not loaded \u2014 the claude.ai-synced copy in ${basename(we.path)}/ declares the same plugin name "${we.name}" as ${basename(Ae.first.path)}/ (the first claude.ai copy of that name); only one synced copy per name is considered`,
        });
        return false;
      }
      let Ie;
      let Me = Se.get(nfcLower(we.name));
      if (Me === undefined || we.enabled === false) Ie = we.enabled === false ? "disabled" : "used";
      else {
        logForDebugging(`Synced plugin "${we.name}" shadowed by local copy ${Me}`);
        r.push({
          type: "synced-plugin-shadowed",
          orphan: true,
          source: we.source,
          shadowedBy: stripInvisibleKeepEmoji(Me),
        });
        Ie = "dropped";
      }
      if (Ie === "used" && Ee.outcome === "admitted") {
        we.admittedByManagedLock = true;
        if (sources.managedHooksOnly)
          r.push({
            type: "managed-hooks-restricted",
            source: we.source,
          });
      }
      ke.set(nfcLower(we.name), {
        first: we,
        fate: Ie,
      });
      return Ie !== "dropped";
    });
  }
  return {
    plugins: [...sessionPlugins, ...marketplacePlugins, ...q, ...Z, ...sources.builtin],
    errors: n,
    warnings: r,
  };
}
//@ chunk-e6aww6q8.js:4617007-4617584 placement
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
  let h = managedHooksPolicyStamp_2();
  pluginRegistry.pluginLoadArm = loadArm;
  let y = async () => {
    let w = await assemblePluginLoadResult(
      () =>
        loadPluginsFromMarketplaces({
          cacheOnly: false,
          storageV5,
          credentials,
        }),
      {
        storageV5,
        readUnder: h,
      },
    );
    if (
      pluginRegistry.pluginLoad === S ||
      (w.readUnder === managedHooksPolicyStamp_2() &&
        (!isStorageV5Enabled() || storageV5 === undefined) &&
        pluginRegistry.pluginLoadArm !== "v5" &&
        pluginRegistry.pluginLoadCacheOnlyArm !== "v5")
    ) {
      let resolved = Promise.resolve(w);
      pluginRegistry.pluginLoadMarks.set(resolved, w.readUnder ?? EMPTY_POLICY_STAMP);
      pluginRegistry.pluginLoadCacheOnly = resolved;
      pluginRegistry.pluginLoadCacheOnlyArm = loadArm;
    }
    return w;
  };
  notePluginFullLoad();
  let S = trackPluginLoad(y());
  pluginRegistry.pluginLoadMarks.set(S, h);
  pluginRegistry.pluginLoad = S;
  return S;
}
//@ chunk-e6aww6q8.js:4617584-4617634 placement
function getLoadArm(storageV5) {
  return isStorageV5Enabled() && storageV5 !== undefined ? "v5" : "raw";
}
//@ chunk-e6aww6q8.js:4617634-4617837 placement
function logJoinedLoadArmMismatch(e, n, storageV5) {
  if (isStorageV5Enabled() && storageV5 !== undefined && n === "raw")
    logForDebugging(
      `${e}: joining a plugin load that an earlier caller started without the storage backend (tengu_hover_rest); this caller's backend is not used for it`,
    );
}
//@ chunk-e6aww6q8.js:4617837-4617913 placement
/**
 * 是否启用同步插件安装（storageV5 且 CLAUDE_CODE_SYNC_PLUGIN_INSTALL）。
 */
function shouldFillPluginLoadWithStore(e) {
  return isStorageV5Enabled() && e !== undefined && !!env.CLAUDE_CODE_SYNC_PLUGIN_INSTALL;
}
//@ chunk-e6aww6q8.js:4617913-4618473 placement
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
  let s = env.CLAUDE_CODE_SYNC_PLUGIN_INSTALL ? undefined : managedHooksPolicyStamp_2();
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
          readUnder: s,
        },
      );
    })(),
  );
  if (s !== undefined) pluginRegistry.pluginLoadMarks.set(pluginRegistry.pluginLoadCacheOnly, s);
  return pluginRegistry.pluginLoadCacheOnly;
}
//@ chunk-e6aww6q8.js:4618473-4618570 placement
function trackPluginLoad(e) {
  let pluginRegistry = getPluginRegistry();
  pluginRegistry.pluginLoadsRunning++;
  return e.finally(() => {
    pluginRegistry.pluginLoadsRunning--;
  });
}
//@ chunk-e6aww6q8.js:4618570-4618631 fingerprint = loadAllPlugins (0.743)
var cacheOnlyLoadOptions = (storageV5) => ({
  cacheOnly: true,
  storageV5,
  credentials: undefined,
});
//@ chunk-e6aww6q8.js:4618631-4618765 placement
/**
 * 返回与当前插件相关设置一致的 cacheOnly 加载结果：缓存的 Promise 标记与当前设置指纹一致就复用，否则重新加载。
 */
function rereadPluginsCacheOnly(e) {
  let pluginRegistry = getPluginRegistry();
  let r = managedHooksPolicyStamp_2();
  let pluginLoadCacheOnly = pluginRegistry.pluginLoadCacheOnly;
  return (
    (r !== EMPTY_POLICY_STAMP &&
    pluginLoadCacheOnly !== undefined &&
    pluginRegistry.pluginLoadMarks.get(pluginLoadCacheOnly) === r
      ? pluginLoadCacheOnly
      : undefined) ?? reloadCacheOnlyUnder(r, e)
  );
}
//@ chunk-e6aww6q8.js:4618765-4619057 placement
function reloadCacheOnlyUnder(e, storageV5) {
  let pluginRegistry = getPluginRegistry();
  let pluginLoad = pluginRegistry.pluginLoad;
  if (!(
    e !== EMPTY_POLICY_STAMP &&
    pluginLoad !== undefined &&
    pluginRegistry.pluginLoadMarks.get(pluginLoad) === e
  )) {
    pluginRegistry.pluginLoad = undefined;
    pluginRegistry.pluginLoadArm = undefined;
  }
  let y = trackPluginLoad(
    assemblePluginLoadResult(() => loadPluginsFromMarketplaces(cacheOnlyLoadOptions(storageV5)), {
      storageV5,
      readUnder: e,
    }),
  );
  pluginRegistry.pluginLoadMarks.set(y, e);
  pluginRegistry.pluginLoadCacheOnlyArm = getLoadArm(storageV5);
  pluginRegistry.pluginLoadCacheOnly = y;
  return y;
}
//@ chunk-e6aww6q8.js:4619057-4619182 placement
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
//@ chunk-e6aww6q8.js:4619182-4619195 placement
var BIN_STAT_TIMEOUT_MS = 2000;
//@ chunk-e6aww6q8.js:4619195-4619739 placement
/**
 * 收集已启用（非内置）插件的 bin/ 目录（stat 超时 2 秒，含 shell 元字符的路径丢弃），用于加进 Bash 工具的 PATH。
 */
async function getEnabledPluginBinPaths(e) {
  let { enabled } = await loadAllPluginsCacheOnly(e);
  let filtered = enabled
    .filter((h) => !h.isBuiltin && h.path)
    .map((h) => join(h.path, "bin"))
    .filter((h) => {
      if (sep !== "\\" && /[:"'$`\\\n\r]/.test(h)) {
        logForDebugging(`Dropping plugin bin path with shell metacharacters: ${h}`);
        return false;
      }
      return true;
    });
  let results = await Promise.all(
    filtered.map(async (h) => {
      try {
        return (
          await withTimeout_2(stat(h), BIN_STAT_TIMEOUT_MS, `stat timed out after ${BIN_STAT_TIMEOUT_MS}ms`)
        ).isDirectory();
      } catch (error) {
        let errnoCode = getErrnoCode(error);
        if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return false;
        logForDebugging(
          `Keeping plugin bin path on PATH despite a failed stat (${errnoCode ?? errorMessage(error)}): ${h}`,
        );
        return true;
      }
    }),
  );
  return filtered.filter((h, y) => results[y]);
}
//@ chunk-e6aww6q8.js:4619739-4620032 layout
async function listSyncedPluginDirs_2() {
  let e = {
    dirs: [],
    rows: [],
  };
  try {
    if (!hasSyncedContent() || !syncSettingsEnabled() || isPluginsSyncVetoed()) return e;
    markSyncedPluginLaneOpened();
    let n = hasRegisteredSyncedPluginDirs() ? await getRegisteredSyncedDirs() : null;
    let r =
      n === null
        ? await listSyncedPluginDirs()
        : n.flatMap((h) => {
            let syncedPluginRowId = getSyncedPluginRowId(h);
            return syncedPluginRowId === undefined
              ? []
              : [
                  {
                    dir: h,
                    pluginId: syncedPluginRowId,
                  },
                ];
          });
    let s = n ?? r.map(({ dir }) => dir);
    markSyncedPluginDirsLoadedHere(s);
    return {
      dirs: s,
      rows: r,
    };
  } catch (error) {
    logError(error);
    return e;
  }
}
//@ chunk-e6aww6q8.js:4620032-4620293 layout
function describeSyncedPluginOutcomes(e) {
  try {
    let n = mapSyncedDirsToPluginIds(e.manifestRows);
    let r = new Set(e.merged);
    return e.synced.map((s) => {
      let h = dirname(s.path);
      let y = n.get(skillKeyFromPath(h, s.path));
      return {
        bucket: basename(h),
        outcome: classifySyncedPluginOutcome(s, r, e),
        pluginName: s.name,
        folder: s.path,
        ...(y !== undefined && {
          pluginId: y,
        }),
      };
    });
  } catch (error) {
    logError(error);
    return null;
  }
}
//@ chunk-e6aww6q8.js:4620293-4620853 layout
function classifySyncedPluginOutcome(e, n, r) {
  let s = matchPolicyPluginEntry(r.managedEntries, e.name, e.attributedMarketplaceName);
  if (s.outcome === "locked") return s.entry.enabled ? "not_loaded" : "held_back";
  if (!n.has(e) || r.demoted.has(e.source)) return "not_loaded";
  if (e.enabled) return "loaded";
  let mapped = r.enabledPluginsIndexed.map((w, L) => {
    let G = r.sourcesHighFirst[L];
    return w !== undefined && G !== undefined && isOperatorSettingSource_2(G) ? w : undefined;
  });
  let pluginSetting = findPluginSetting(e.source, mapped);
  if (pluginSetting !== undefined && mapped[pluginSetting.index]?.record[pluginSetting.key] === false)
    return "held_back";
  if (s.outcome !== "admitted") return "not_loaded";
  return collectDisabledInlineNames(mapped, r.sourcesHighFirst).has(nfcLower(e.name))
    ? "held_back"
    : "not_loaded";
}
//@ chunk-e6aww6q8.js:4620853-4621016 layout
function mapSyncedDirsToPluginIds(manifestRows) {
  let n = new Map();
  let r = new Set();
  for (let { dir, pluginId } of manifestRows) {
    let y = skillKeyFromPath(dirname(dir), dir);
    if (r.has(y)) {
      n.delete(y);
      continue;
    }
    r.add(y);
    if (isServerPluginId(pluginId)) n.set(y, pluginId);
  }
  return n;
}
//@ chunk-e6aww6q8.js:4621016-4621253 layout
function collectOfficialAttestations_2(allPlugins) {
  let n = new Map();
  let r = new Set();
  for (let s of allPlugins) {
    let marketplace = s.officialAttestation?.marketplace;
    if (
      marketplace === undefined ||
      !ALLOWED_OFFICIAL_MARKETPLACE_NAMES.has(marketplace) ||
      (n.has(s.source) && n.get(s.source) !== marketplace)
    )
      r.add(s.source);
    else n.set(s.source, marketplace);
  }
  for (let s of r) n.delete(s);
  return n;
}
//@ chunk-e6aww6q8.js:4621253-4624204 fingerprint = assemblePluginLoadResult (0.337)
/**
 * 插件加载总装：并行跑市场加载、会话插件（--plugin-dir/--plugin-url）、claude.ai 同步插件、skills-dir 插件，再合并内置插件，mergePluginSources 去重，verifyAndDemote 处理依赖不满足的降级，最后（非预览且设置未变时）执行副作用：缓存插件 settings、清理旧缓存等。返回 {enabled, disabled, errors, warnings}。
 */
async function assemblePluginLoadResult(loadMarketplacePlugins, options) {
  let r = options?.readUnder ?? managedHooksPolicyStamp_2();
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
  let y = builtinResult
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
  let w = checkHooksModulesFlag();
  let [marketplacePlugins, G, q, skillsAsPlugins] = await Promise.all([
    loadMarketplacePlugins(),
    describePluginDirShape_2(y).then((specs) =>
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
  await w;
  let builtinPlugins = getBuiltinPlugins();
  let managedEntries = getPolicyEnabledPluginEntries();
  let we = settingsSourcesReversed();
  let recordedDisableFolds = collectDisabledInlineNames(enabledPluginsBySource, we);
  let {
    plugins: allPlugins,
    errors: mergeErrors,
    warnings,
  } = mergePluginSources({
    session: G.plugins,
    marketplace: marketplacePlugins.plugins,
    skill: skillsAsPlugins.plugins,
    synced: q.plugins,
    builtin: [...builtinPlugins.enabled, ...builtinPlugins.disabled],
    managedEntries,
    managedHooksOnly: shouldAllowManagedHooksOnlyByPolicy(),
    recordedDisableFolds,
  });
  let syncedSkillOverrides = collectSyncedSkillOverrides({
    merged: allPlugins,
    synced: q.plugins,
    pluginIdOf: () => {
      let yt = mapSyncedDirsToPluginIds(q.manifestRows);
      return (gt) => yt.get(skillKeyFromPath(dirname(gt.path), gt.path));
    },
    enabledPluginsIndexed: enabledPluginsBySource,
    sourcesHighFirst: we,
  });
  let ze =
    syncedSkillOverrides === null
      ? {
          held: [],
          toWrite: [],
          following: [],
        }
      : await syncedSkillOverrides;
  for (let yt of ze.held) yt.enabled = false;
  for (let yt of ze.following) yt.followsSyncedSkillState = true;
  let lt = [
    ...marketplacePlugins.errors,
    ...G.errors,
    ...q.errors,
    ...skillsAsPlugins.errors,
    ...mergeErrors,
  ];
  let Je = [
    ...marketplacePlugins.warnings,
    ...G.warnings,
    ...q.warnings,
    ...skillsAsPlugins.warnings,
    ...warnings,
  ];
  let { demoted, errors: depErrors } = verifyAndDemote(allPlugins);
  for (let plugin of allPlugins) if (demoted.has(plugin.source)) plugin.enabled = false;
  lt.push(...depErrors);
  let enabledPlugins = allPlugins.filter((plugin) => plugin.enabled);
  logForDebugging(
    `Found ${allPlugins.length} plugins (${enabledPlugins.length} enabled, ${allPlugins.length - enabledPlugins.length} disabled)`,
  );
  if (options?.preview);
  else if (inlinePlugins !== getOriginalCwdOrNull())
    logForDebugging(
      "assemblePluginLoadResult: originalCwd changed mid-scan; skipping side-effects (stale early-kick)",
    );
  else if (r !== managedHooksPolicyStamp_2()) {
    logForDebugging(
      "assemblePluginLoadResult: plugin-affecting settings changed mid-scan; skipping side-effects, answering with a read under the settings in force",
    );
    return rereadPluginsCacheOnly(options?.storageV5);
  } else {
    setAttestedOfficialPluginIds(collectOfficialAttestations_2(allPlugins));
    setLastSyncedLaneLoad(
      describeSyncedPluginOutcomes({
        synced: q.plugins,
        merged: allPlugins,
        demoted,
        managedEntries,
        enabledPluginsIndexed: enabledPluginsBySource,
        sourcesHighFirst: we,
        manifestRows: q.manifestRows,
      }),
    );
    persistSyncedPluginsOff(ze.toWrite, managedHooksPolicyStamp_2);
    let yt = new Set(enabledPlugins.map((enabledPlugin) => enabledPlugin.source));
    for (let gt of findUserDisabledOverrides())
      if (yt.has(gt.pluginId))
        Je.push({
          type: "ineffective-disable",
          source: gt.pluginId,
          overriddenBy: gt.overriddenBy,
        });
    releaseUnusedPluginCaches(enabledPlugins, options?.storageV5);
    cachePluginSettings(enabledPlugins);
    if (lt.length > 0 && allPlugins.length === 0) {
      let gt = "generic-error";
      let At = 0;
      let It = new Map();
      for (let Yt of lt) {
        let qt = (It.get(Yt.type) ?? 0) + 1;
        It.set(Yt.type, qt);
        if (qt > At || (qt === At && Yt.type < gt)) {
          gt = Yt.type;
          At = qt;
        }
      }
      logFeatureBad("plugin_load_all", `plugin_load_total_failure_${gt.replaceAll("-", "_")}`, {
        error_count: lt.length,
      });
    } else if (lt.length > 0) logFeatureSad("plugin_load_all", "plugin_load_partial_failures");
    else logFeatureOk("plugin_load_all");
  }
  return {
    enabled: enabledPlugins,
    disabled: allPlugins.filter((plugin) => !plugin.enabled),
    errors: lt,
    warnings: Je,
    readUnder: r,
  };
}
//@ chunk-e6aww6q8.js:4624204-4624432 layout = getVersionedZipCachePath (1)
async function releaseUnusedPluginCaches(pluginId, version) {
  if (isDiskless()) return;
  let r = anchoredPluginCachePath();
  let s = syncedPluginsRoot();
  let flattened = pluginId.flatMap((y) => {
    if (!y.path || y.path.endsWith(".zip")) return [];
    return isSubpathOf(r, y.path, false) || isSubpathOf(s, y.path, false) ? [y.path] : [];
  });
  await Promise.all(flattened.map((y) => writeInUseMarker(y, version)));
  await sweepInUseMarkers(flattened, version);
}
//@ chunk-e6aww6q8.js:4624432-4624502 placement
/**
 * 清理不再被会话使用的插件解压目录。
 */
async function releaseSyncedDirsNotIn(e, n) {
  await releaseMarkersOutside(syncedPluginsRoot(), new Set(e.map((r) => r.path)), n);
}
//@ chunk-e6aww6q8.js:4624502-4624736 placement = clearPluginCache (0.483)
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
//@ chunk-e6aww6q8.js:4624736-4624946 placement
/**
 * 存储后端模式下预先发起一次 cacheOnly 加载以填充缓存；失败则清掉缓存。
 */
function refillPluginLoadCacheOnly(e, n) {
  if (
    !isStorageV5Enabled() ||
    e === undefined ||
    env.CLAUDE_CODE_SYNC_PLUGIN_INSTALL ||
    getPluginRegistry().pluginLoadCacheOnly !== undefined
  )
    return;
  let allPluginsCacheOnly = loadAllPluginsCacheOnly(e);
  allPluginsCacheOnly.catch(() => {
    if (getPluginRegistry().pluginLoadCacheOnly === allPluginsCacheOnly)
      clearPluginCache(`${n}: re-fill failed`);
  });
  return allPluginsCacheOnly;
}
//@ chunk-e6aww6q8.js:4624946-4625173 fingerprint = mergePluginSettings (1)
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
//@ chunk-e6aww6q8.js:4625173-4625422 fingerprint = cachePluginSettings (0.667)
function cachePluginSettings(plugins) {
  let settings = mergePluginSettings(plugins);
  let r = Object.keys(pluginCommandBase() ?? {}).length > 0;
  setPluginCommandBase(settings);
  if (settings && Object.keys(settings).length > 0) {
    invalidateCommandNames();
    logForDebugging(`Cached plugin settings with keys: ${Object.keys(settings).join(", ")}`);
  } else if (r) {
    invalidateCommandNames();
    logForDebugging("Dropped plugin settings: no enabled plugin supplies any");
  }
}
//@ chunk-e6aww6q8.js:4625422-4625529 sole-consumer
function findMatchingSourceCommand(e, n) {
  if (!e) return;
  let r = describeCommandOutputMode(e);
  return (n && filterInstallationsForCurrentProject(n).find((s) => s.sourceCommand === r))?.sourceCommand;
}
//@ chunk-3wek6r2k.js:15714-15773 fingerprint = loadAllPluginsCacheOnly (0.661)
/**
 * 是否同步安装插件（传入值存在且 CLAUDE_CODE_SYNC_PLUGIN_INSTALL）。
 */
function shouldSyncPluginInstall(isNonInteractiveSession) {
  return isNonInteractiveSession && env.CLAUDE_CODE_SYNC_PLUGIN_INSTALL;
}
//@ chunk-5aas12zq.js:24411-24816 fingerprint = copyDir (0.664)
/**
 * 递归复制目录（带缓存的目录创建）。
 */
async function copyDir_2(e) {
  let n = new Map();
  let t = async (r) => {
    let s = n.get(r);
    if (s !== undefined) return s;
    let o = await readdir(r, {
      withFileTypes: true,
    }).catch(() => []);
    n.set(r, o);
    return o;
  };
  for (let r of manifestRelativePath) {
    let parts = r.split("/");
    let o = parts.pop() ?? "";
    let a = e;
    for (let entry of parts) {
      a = (await t(a)).some((f) => f.name === entry && f.isDirectory())
        ? pathModule.join(a, entry)
        : undefined;
      if (a === undefined) break;
    }
    if (a !== undefined && (await t(a)).some((l) => l.name === o && l.isSymbolicLink())) return r;
  }
  return;
}
//@ chunk-9tyqgtn4.js:20076-20329 fingerprint = loadPluginFromMarketplaceEntryCacheOnly (0.344)
/**
 * 从一次 cacheOnly 加载结果中找出缓存缺失的启用插件，供后台补装。
 */
function loadPluginFromMarketplaceEntryCacheOnly({ enabled, errors }, a) {
  let r = new Set(enabled.flatMap(pluginNameAliases).map(nfcLower));
  let s = new Set();
  for (let error of errors) if (error.type === "plugin-cache-miss") s.add(error.source);
  let c = new Set();
  for (let d of a?.enabled ?? []) if (s.has(d.source) && !r.has(nfcLower(d.name))) c.add(d.source);
  return c;
}
//@ chunk-g6j7q15x.js:4001-4202 fingerprint = validateGitUrl (0.458)
/**
 * 判断 URL 类型：file（本机）、hosted（官方地址）、custom_url（其他 http(s)）。
 */
function validateGitUrl(url) {
  if (url.protocol === "file:")
    return url.hostname === "" || url.hostname === "localhost" ? "file" : undefined;
  if (url.protocol !== "https:" && url.protocol !== "http:") return;
  return url.toString() === _ ? "hosted" : "custom_url";
}
export {
  loadAllPluginsCacheOnly,
  loadAllPluginsForPreview,
  syncedPluginFolderId,
  clearPluginCache,
  createPluginFromPath,
  loadAllPlugins,
  refillPluginLoadCacheOnly,
  shouldFillPluginLoadWithStore,
  shouldSyncPluginInstall,
  loadPluginManifest,
  copyDir,
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
  hasMarketplaceBackedPlugins,
  releaseSyncedDirsNotIn,
  copyDir_2,
  mapStringsDeep,
  loadPluginFromMarketplaceEntryCacheOnly,
  directoryPluginFallbackName,
  quotedListItem,
  formatFailureDetails_2,
  truncateListItem,
  rereadPluginsCacheOnly,
  displaySkillsDirPath,
  resolveWithinDir,
  getEnabledPluginBinPaths,
  isZipPathCaseInsensitive,
  orphanMarkerCoordsV5,
  evictCachedVersionDir,
  githubRepoToCloneUrl,
  strictCacheAddressable,
  versionParentContained,
  probeSeedForPlugin,
  buildNpmRegistryArgs,
  getPluginCacheDirIn,
  versionParentState,
  strictArchivePresent,
  requireVersionParentContained,
  removeFreshCopyUnlessInUse,
  unmarkBeforeArchiving,
  GitNotAvailableError,
  GitHostFetchFailedError,
  clearOccupantForReplace,
  validateGitUrl,
  MANIFEST_IDENTITY_READ_RELPATHS,
  loadSkillsAsPlugins,
};
