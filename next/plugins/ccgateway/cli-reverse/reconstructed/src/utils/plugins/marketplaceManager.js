/**
 * utils/plugins/marketplaceManager.ts
 *
 * 市场管理：known_marketplaces.json 读写（加锁）、按来源（github/git/url/npm/file/directory/settings）克隆或下载并缓存市场、添加/删除/刷新市场、按插件 ID 查条目。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/marketplaceManager.ts
 * pieces: chunk-5s0qaz1x.js (1), chunk-5xgkngpb.js (155), chunk-7jxyna5q.js (1), chunk-hb44av3w.js (1), chunk-tmkr83ys.js (1), chunk-z20c443b.js (1)
 * attribution: fingerprint 33, affinity 4, placement 22, callgraph-fingerprint 3, layout 92, file-local 1, sole-consumer 5
 */
import { join, relative, sep, isAbsolute, resolve as resolve_2, basename, dirname } from "path";
import { writeFile } from "fs/promises";
import { stripInvisibleChars } from "../sanitization.js";
import {
  isDefaultPluginsDir,
  getPluginsDirectory,
  pluginRegistrySpace,
  relocateInstallPath,
  getPluginSeedDirs,
  getMarketplaceStorageKey,
  marketplaceCacheSpace,
  hasClaudeAiReservedPrefix,
  isUsingCoworkPlugins,
} from "./pluginDirectories.js";
import { execGitNoThrow, execFileNoThrow, execFileNoThrowWithCwd } from "../execFileNoThrow.js";
import {
  homeDirOrDefault,
  runGitWithCeilingDirs,
  SSH_BATCH_CONFIG_ARGS,
  prepareGitWorkDir,
  pickGitNoPromptEnv,
  preferHttpsGitTransport,
} from "../gitSafeExec.js";
import { logForDebugging } from "../debug.js";
import { isSshAuthFailureOutput, resolveGitSshConfig, sshNotConfiguredMessage } from "./gitSshConfig.js";
import { whichAsync } from "../which.js";
import {
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  ConfigParseError,
  isENOENT,
  getErrnoCode,
  toError,
  withTelemetryMessage,
} from "../errors.js";
import { listSubmodulePaths, listGitlinkEntries } from "../git/submoduleInspection.js";
import { msUntilDeadline, pickSubmodulesToFetch } from "./marketplaceSubmodules.js";
import {
  MAX_SCANNED_BYTES,
  probeMarketplaceCheckout,
  writeSparsePaths,
  checkGitLfsFiles,
  describeGitLfsMissing,
} from "./marketplaceGitCheckout.js";
import { gitExe, forgetGitRootsUnder } from "../git.js";
import { LITERAL_PATHSPEC_ENV } from "../git/builderGit/gitRun.js";
import { isWorkspacePersistedTrusted } from "../config.js";
import { isPluginDirectoryModeOn } from "./pluginGates.js";
import {
  pluginDirectoryPolicyBlock,
  extractHostFromSource,
  isSourceAllowedByPolicy,
  isSourceInBlocklist,
  getStrictKnownMarketplaces,
  getHostPatternsFromAllowlist,
  isListingRepositoryBlockedByHostPolicy,
  pluginDirectoryPolicyBlockHint,
} from "./marketplacePolicy.js";
import {
  isDiskless,
  getProjectConfigRoot,
  getOriginalCwd,
  getAdditionalDirectoriesForClaudeMd,
} from "../../bootstrap/state.js";
import {
  getAddDirEnabledPlugins,
  getAddDirExtraMarketplaces,
  SETTINGS_FILE_NAMES,
} from "./addDirPluginSettings.js";
import {
  getInitialSettings,
  updateSettingsForSourceWithTransform,
  getLegacyLocalSettingsFilePath,
  getPolicySettingsLoadErrors,
  getSettingsParseErrorsForSource,
  parseSettingsFile,
  getSettingsForSourceForUpkeep,
  getSettingsForSource,
  getSettingsForSourceWriteSeed,
} from "../settings/settings.js";
import { parsePluginIdentifier, SETTING_SOURCE_TO_SCOPE } from "./pluginIdentifier.js";
import { CLAUDE_PLUGINS_OFFICIAL, OFFICIAL_MARKETPLACE_SOURCE } from "./officialMarketplace.js";
import { getPluginRegistry } from "./pluginLoadState.js";
import {
  getNonRepoExtraMarketplaces,
  ownPropertyOrUndefined,
  filterAdmittedMarketplaces,
  weakMap_16,
  releasedRegistryEntries,
  hiddenRegistryEntries,
  findUrlMarketplaceHeaders,
  isSourceConsistentWith,
  describeUnusableMarketplaceSource,
  MARKETPLACE_SOURCE_FIX_HINTS,
  MARKETPLACE_SOURCE_FAILURE_CODES,
  admissionKindsFor,
  hiddenRegistryEntryFor,
  listReservedNameRefusals,
  isOfficialMarketplaceSourced,
  releaseRegistryEntry,
  clearMarketplaceAdmissionVerdicts,
  reservedMarketplaceNameMessage,
  getAdmittedMarketplaceEntry,
  findAutoUpdateOverrideSource,
  supportsPersistence,
} from "./marketplaceSources.js";
import { mergeExtraKnownMarketplacesByEntry } from "../settings/policyTiers.js";
import {
  normalizeLocalMarketplaceSource,
  classifyMarketplacePath,
  normalizeMarketplaceInputPath,
  readLocalMarketplaceFile,
  enoentError,
} from "./localMarketplacePaths.js";
import { import_sortedIndex_2, import_mapValues } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import {
  readClaudeAiMarketplaceRegistry,
  toKnownMarketplaceEntry,
  omitClaudeAiMarketplaces,
  isClaudeAiMarketplaceSource,
  removeClaudeAiMarketplace,
  ensureClaudeAiMarketplace,
  ClaudeAiMarketplaceError,
  describeMarketplaceFreshness,
  catalogStatusCode,
  refreshClaudeAiMarketplace,
} from "./claudeAiMarketplaces.js";
import {
  OFFICIAL_MARKETPLACE_NAME,
  omitPluginDirectoryEntries,
  isOfficialMarketplaceSpelling,
  OFFICIAL_MARKETPLACE_DISPLAY,
  reservedNameMessage,
  isOfficialMarketplaceName_2,
  blockedPluginsNotice,
  isPluginDirectorySource,
  formatPluginNameList,
  formatReservedSpellingMessage,
  isFoldedSpellingOf,
  reservedMarketplaceEntryMessage,
  OFFICIAL_MARKETPLACE_NAME_CHECK_TTL_MS,
} from "./officialMarketplaceNames.js";
import { logDirectoryBlockedOnce, pluginGitUrlError } from "./pluginDirectoryTelemetry.js";
import { setCommandSourceNameRegistration } from "./commandSourceErrors.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { formatStorageError } from "../storage/storageErrors.js";
import { jsonParse, jsonStringify } from "../slowOperations.js";
import {
  KnownMarketplacesFileSchema,
  isLocalMarketplaceSource,
  PluginMarketplaceSchema,
  getMarketplaceNameSchemaFor,
  getPluginMarketplaceSchemaFor,
  validateOfficialNameSource,
  CLAUDEAI_MARKETPLACE_PREFIX,
  isValidPluginIdSegment,
  PLUGIN_DIRECTORY_MARKETPLACE_NAMES,
  RESERVED_MARKETPLACE_NAMES,
  isImpersonatingOfficialName,
  isAsciiImpersonatingOfficialName,
  IMPERSONATION_ERROR_MESSAGE,
  isLookalikeButNotBlockedName,
  pluginManifestPathSchemas,
} from "./schemas.js";
import { getFsImplementation } from "../fsOperations.js";
import { syncTarget, writeFileAtomic as writeFileAtomic_2 } from "../atomicPublishWrite.js";
import { createKeyedQueue } from "../promiseQueue.js";
import { registerWriteQueueDrain } from "../settings/writeQueues.js";
import { warnDisklessSettingsWrite } from "../settings/settingsStorage.js";
import { lock, releaseLockQuietly } from "../lockfile.js";
import { logEvent } from "../../services/analytics/index.js";
import { env } from "../env.js";
import { isNonRegularError, isNonRegularFailure } from "../../services/memorySync/pathScrub.js";
import { isGithubDotCom, GITHUB_HOST, isUnsafeRemoteUrl } from "../git/githubUrl.js";
import { isNetworkGitUrl, runGitInOwnWorkTree } from "../git/gitLanes.js";
import {
  redactUrlQuery,
  redactKnownUrls,
  redactUrlsInText,
  redactUrlsTracked,
} from "../redaction/urlRedaction.js";
import {
  findMarketplaceNameOwner,
  isValidMarketplaceDirName,
  assertMarketplaceNameAvailable,
  getResolvedMarketplacesCacheDir,
  checkCloneDirOwnedByOther,
  assertMarketplaceNameUsable,
  sameNfcAs,
  marketplaceDirCandidates,
  findByMarketplaceName,
  isSameGithubMarketplace,
  getSyntheticMarketplaceStorageKey,
  comparePathContainment,
  checkMarketplaceDirCollision,
  listMarketplaceNames,
  removeMarketplaceCacheFiles,
  impersonationCheckDisabled,
  reservedNameMessage as reservedNameMessage_2,
  marketplaceLoadFailedMessage,
  getMarketplaceStorageLocation,
  RESERVED_MARKETPLACE_NAME_MESSAGE,
} from "./marketplaceNames.js";
import { removeDirectoryTreeNoFollow as removeDirectoryTreeNoFollow_2 } from "../fsRemove.js";
import { logPluginFetch, classifyFetchError } from "./fetchTelemetry.js";
import {
  CLAUDE_CODE_PLUGIN_MANAGER,
  MAX_PLUGIN_ARCHIVE_BYTES,
  makeTempCachePathName,
  CommandSourceError,
} from "./commandSource.js";
import { externalHttp } from "../../services/http/externalHttp.js";
import { checkCatalogRedirect, headerNamesExceptUserAgent } from "./archiveDownload.js";
import { findTelemetrySafeCause, describeHelperDeclaration } from "./headersHelper.js";
import { isAxiosError } from "../../../vendor/axios/dist/esm/axios.js";
import { array, unknown } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  withMarketplaceFailureCode,
  MarketplaceError,
  getMarketplaceFailureCode,
} from "./marketplaceErrors.js";
import { stripBom } from "../json.js";
import { marketplaceCacheKey, STORAGE_SPACES } from "../storage/storageSpaces.js";
import { formatSourceForDisplay } from "./marketplaceHelpers.js";
import { getSteps } from "../../projectOnboardingState.js";
import { normalizeGithubRepoSlug } from "./parseMarketplaceInput.js";
import { quotedPrintable, printableOrEmpty } from "../printableName.js";
import {
  readRepoSettingsBytes,
  isBlockingPolicyLoadError,
  sourceEnablementEntry,
  planUninstallCleanup,
  enabledPluginKeys,
} from "../../services/plugins/pluginUninstallSettings.js";
import { invalidateCommandNames } from "../settings/commandSyncNames.js";
import { EDITABLE_SETTING_SOURCES } from "../settings/constants.js";
import { isDependencyAutoInstallState, getEnabledPluginIdsForScope } from "./dependencyResolver.js";
import { enabledPluginSettings, hasInstalledOfficialEntry } from "./pluginVersioning.js";
import { settingsSourceName } from "../settings/settingsSourceTrust.js";
import { isSafeCliArg, claudeCommand } from "../worktreeResumeHint.js";
import {
  loadInstalledPlugins,
  hasFailedInstalledPluginsRead,
  getInstalledListRefusal,
  readInstalledPluginsFile,
  removeAllPluginsForMarketplace,
  listInstalledPluginIds,
  getInstalledPlugins,
  getInstalledPluginsMap,
} from "./installedPluginsManager.js";
import {
  pinnedSha,
  samePluginSource,
  sourceUrlAndRef,
  PluginDirectoryUnavailableError,
} from "./pluginSourceUrl.js";
import { markPluginVersionOrphaned } from "./cacheUtils.js";
import { removePluginUsage } from "../telemetry/pluginTelemetry.js";
import { normalizeCaseForComparison_2 } from "../permissions/filesystem.js";
import { getCachedCatalogPlugins } from "./installCounts.js";
import { logError } from "../log.js";
import { withDeadline } from "../sleep.js";
import { fetchOfficialMarketplaceFromGcs } from "./officialMarketplaceGcs.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { setMarketplaceAutoUpdateFlag } from "./pluginAutoupdate.js";
import { pluginSettingRecords } from "./pluginSettingsSources.js";
import { runGit } from "../../bridge/worktreeState.js";
import { isGitVersionAtLeast236 } from "./marketplaceGitVersion.js";
import { parseGitVersion } from "../../remote/tools/servedOwnerSettings.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-hb44av3w.js:7851-7924 fingerprint (2.1.88 match: GIT_NO_PROMPT_ENV, 0.628)
var GIT_NO_PROMPT_ENV = {
  GIT_TERMINAL_PROMPT: "0",
  GIT_ASKPASS: "",
  GCM_INTERACTIVE: "never",
};
//@ chunk-z20c443b.js:374616-374794 fingerprint (2.1.88 match: redactUrlCredentials, 0.842)
/**
 * URL 去掉用户名口令后返回（用于显示与日志）。
 */
function redactUrlCredentials(urlString) {
  if (urlString === undefined) return;
  let url = stripInvisibleChars(urlString, "");
  try {
    let { protocol, username, password } = new URL(url);
    return (protocol === "https:" || protocol === "http:") && username === "" && password === ""
      ? url
      : undefined;
  } catch {
    return;
  }
}
//@ chunk-5s0qaz1x.js:3872-4054 fingerprint (2.1.88 match: getMarketplacesCacheDir, 1)
function splitMarketplaceCachePath(cachePath, pluginsDir) {
  if (!isDefaultPluginsDir(pluginsDir)) return null;
  let marketplaceRoot = join(pluginsDir, "marketplaces");
  let relPath = relative(marketplaceRoot, cachePath);
  if (relPath === "" || relPath === ".." || relPath.startsWith(`..${sep}`) || isAbsolute(relPath))
    return null;
  let parts = relPath.split(sep);
  return join(marketplaceRoot, ...parts) === cachePath ? parts : null;
}
//@ chunk-7jxyna5q.js:449241-449479 callgraph-fingerprint (2.1.88 match: gitPull, 0.191)
/**
 * 确定 git pull 用的 remote（分支配置的 remote，缺省 origin）。
 */
async function gitPull(gitState, dir, branch, gitOptions) {
  if (gitState.hasDir(dir)) return "origin";
  if (branch !== undefined && branch !== "HEAD") {
    let fetchResult = await execGitNoThrow(dir, ["config", "--get", `branch.${branch}.remote`], gitOptions);
    if (fetchResult !== undefined) return fetchResult;
  }
  return (await execGitNoThrow(dir, ["config", "--get", "remote.pushDefault"], gitOptions)) ?? "origin";
}
//@ chunk-5xgkngpb.js:621679-621773 fingerprint (2.1.88 match: findSeedMarketplaceLocation, 1)
/**
 * zip 缓存/种子目录中市场 JSON 的相对路径 marketplaces/<名字转义>.json。
 */
function findSeedMarketplaceLocation(marketplaceName) {
  let replaced = marketplaceName.replace(/[^a-zA-Z0-9\-_]/g, "-");
  return join("marketplaces", `${replaced}.json`);
}
//@ chunk-5xgkngpb.js:741823-741878 affinity
async function isGithubSshConfigured() {
  return (await isGitHubSshLikelyConfigured()) === "configured";
}
//@ chunk-5xgkngpb.js:741878-742442 fingerprint (2.1.88 match: isGitHubSshLikelyConfigured, 0.895)
/**
 * 用 ssh -T git@github.com（BatchMode、2 秒超时）探测 GitHub SSH 是否已配置，决定先用 SSH 还是 HTTPS 克隆。
 */
async function isGitHubSshLikelyConfigured() {
  try {
    let result = await execFileNoThrow(
      "ssh",
      [
        "-T",
        "-o",
        "BatchMode=yes",
        "-o",
        "ConnectTimeout=2",
        "-o",
        "StrictHostKeyChecking=yes",
        "git@github.com",
      ],
      {
        cwd: homeDirOrDefault(),
        timeout: 3000,
      },
    );
    let output = `${result.stdout ?? ""}
${result.stderr ?? ""}`;
    let configured = result.code === 1 && output.includes("successfully authenticated");
    logForDebugging(`SSH config check: code=${result.code} configured=${configured}`);
    if (configured) return "configured";
    if (result.timedOut) return "unknown";
    if (result.code === 255 && isSshAuthFailureOutput(output)) return "not-configured";
    return (await whichAsync("ssh")) === null ? "not-configured" : "unknown";
  } catch (error) {
    logForDebugging(`SSH configuration check failed: ${errorMessage(error)}`, {
      level: "warn",
    });
    return "unknown";
  }
}
//@ chunk-5xgkngpb.js:4299185-4300207 fingerprint (2.1.88 match: gitSubmoduleUpdate, 0.49)
/**
 * 市场克隆后更新子模块（受截止时间约束，失败给出进度提示）。
 */
async function gitSubmoduleUpdate({ checkoutDir, manifestPath, inCheckoutArgs, env, deadline }) {
  let gitContext = {
    repository: inCheckoutArgs,
    env,
  };
  let submodulePaths = await listSubmodulePaths(checkoutDir, {
    ...gitContext,
    deadlineMs: msUntilDeadline(deadline),
  });
  if (Array.isArray(submodulePaths) && submodulePaths.length === 0)
    return {
      result: undefined,
      submodules: undefined,
    };
  let gitlinks = Array.isArray(submodulePaths)
    ? await listGitlinkEntries(checkoutDir, {
        ...gitContext,
        deadlineMs: msUntilDeadline(deadline),
      })
    : submodulePaths;
  let gitlinkSet = new Set(Array.isArray(gitlinks) ? gitlinks : []);
  let recorded =
    Array.isArray(submodulePaths) && Array.isArray(gitlinks)
      ? submodulePaths.filter((path) => gitlinkSet.has(path))
      : undefined;
  let selected =
    recorded === undefined
      ? "all"
      : recorded.length === 0
        ? []
        : await pickSubmodulesToFetch({
            checkoutDir,
            manifestPath,
            submodules: recorded,
            inCheckoutArgs,
            env,
            deadline,
          });
  let fetchSelection =
    selected !== "all" && selected.join(" ").length <= MAX_SCANNED_BYTES ? selected : "all";
  let submodules = {
    recorded: recorded?.length,
    fetched: fetchSelection === "all" ? "all" : fetchSelection.length,
  };
  logForDebugging(
    `Marketplace clone: ${submodules.recorded ?? "an unknown number of"} submodules recorded, fetching ${submodules.fetched}`,
  );
  if (submodules.fetched === 0)
    return {
      result: undefined,
      submodules,
    };
  return {
    result: await execFileNoThrowWithCwd(
      gitExe(),
      [
        ...inCheckoutArgs,
        ...(fetchSelection === "all" ? ["-c", "submodule.active=."] : []),
        "submodule",
        "update",
        "--init",
        "--recursive",
        "--depth",
        "1",
        ...(fetchSelection === "all" ? [] : ["--", ...fetchSelection]),
      ],
      {
        cwd: checkoutDir,
        env: {
          ...env,
          ...LITERAL_PATHSPEC_ENV,
        },
        timeout: msUntilDeadline(deadline),
        stdin: "ignore",
      },
    ),
    submodules,
  };
}
//@ chunk-5xgkngpb.js:4331335-4331362 placement
/**
 * isWorkspaceTrustedForMarketplace：工作区是否已持久信任。
 */
function isWorkspaceTrustedForMarketplace() {
  return isWorkspacePersistedTrusted();
}
//@ chunk-5xgkngpb.js:4331362-4331435 placement
var pluginDirectoryModules; // deferred: loads other modules while loading; runs once its import cycle is complete
var pluginDirectoryStatusModule;
deferInit("chunk-5xgkngpb.js:4331362", () => {
  pluginDirectoryModules = require("./pluginDirectoryCatalog.js");
  pluginDirectoryStatusModule = require("./pluginDirectorySearch.js");
});
//@ chunk-5xgkngpb.js:4331435-4331482 placement
function pluginDirectoryModuleIfUsable() {
  return isPluginDirectoryModeOn() && pluginDirectoryPolicyBlock() === null ? pluginDirectoryModules : null;
}
//@ chunk-5xgkngpb.js:4331482-4331515 placement
/**
 * isPluginDirectoryAvailable：插件目录模块是否可用。
 */
function isPluginDirectoryAvailable() {
  return pluginDirectoryModuleIfUsable() !== null;
}
//@ chunk-5xgkngpb.js:4331515-4331549 fingerprint (2.1.88 match: getKnownMarketplacesFile, 1)
var KNOWN_MARKETPLACES_FILENAME = "known_marketplaces.json";
//@ chunk-5xgkngpb.js:4331549-4331583 affinity
function getKnownMarketplacesPath() {
  return join(getPluginsDirectory(), KNOWN_MARKETPLACES_FILENAME);
}
//@ chunk-5xgkngpb.js:4331583-4331618 affinity
function getKnownMarketplacesPathForDisplay() {
  return isDiskless() ? KNOWN_MARKETPLACES_FILENAME : getKnownMarketplacesPath();
}
//@ chunk-5xgkngpb.js:4331618-4331660 affinity (2.1.88 match: getMarketplacesCacheDir, 1)
function getMarketplacesStorageScope() {
  return pluginRegistrySpace("marketplaces");
}
//@ chunk-5xgkngpb.js:4341229-4341490 fingerprint (2.1.88 match: getDeclaredMarketplaces, 1)
/**
 * 读取所有设置源里的 extraKnownMarketplaces（以及种子/托管声明），返回 名字→{source, sourceIsFallback…}。
 */
function getDeclaredMarketplaces() {
  let implicit = {};
  let enabledPlugins = {
    ...getAddDirEnabledPlugins(),
    ...(getInitialSettings().enabledPlugins ?? {}),
  };
  for (let [pluginId, value] of Object.entries(enabledPlugins))
    if (value && parsePluginIdentifier(pluginId).marketplace === CLAUDE_PLUGINS_OFFICIAL) {
      implicit[CLAUDE_PLUGINS_OFFICIAL] = {
        source: OFFICIAL_MARKETPLACE_SOURCE,
        sourceIsFallback: true,
      };
      break;
    }
  let trusted = isWorkspaceTrustedForMarketplace();
  let declared = trusted
    ? normalizeLocalMarketplaceSources(getInitialSettings().extraKnownMarketplaces ?? {})
    : tryUnwrapTextPayload();
  return {
    ...implicit,
    ...(trusted ? getAddDirExtraMarketplaces() : {}),
    ...declared,
  };
}
//@ chunk-5xgkngpb.js:4342506-4342799 placement (2.1.88 match: tryUnwrapTextPayload, 0.311)
/**
 * 合并各来源声明的 extras 并按输入做记忆化缓存（operatorDeclaredMemo），被多处设置/插件逻辑使用；与 MCP UI 无关。
 */
function tryUnwrapTextPayload() {
  let pluginRegistry = getPluginRegistry();
  let nonRepoExtraMarketplaces = getNonRepoExtraMarketplaces();
  let flattened = nonRepoExtraMarketplaces.flatMap((nonRepoExtraMarketplace) => [
    nonRepoExtraMarketplace.source,
    nonRepoExtraMarketplace.extras,
  ]);
  let operatorDeclaredMemo = pluginRegistry.operatorDeclaredMemo;
  if (
    operatorDeclaredMemo !== undefined &&
    operatorDeclaredMemo.inputs.length === flattened.length &&
    operatorDeclaredMemo.inputs.every((input, index) => input === flattened[index])
  )
    return operatorDeclaredMemo.value;
  let merged = {};
  for (let { extras } of nonRepoExtraMarketplaces)
    if (extras) merged = mergeExtraKnownMarketplacesByEntry(merged, extras);
  merged = normalizeLocalMarketplaceSources(merged);
  pluginRegistry.operatorDeclaredMemo = {
    inputs: flattened,
    value: merged,
  };
  return merged;
}
//@ chunk-5xgkngpb.js:4342799-4342944 placement
function normalizeLocalMarketplaceSources(marketplaces) {
  let normalized;
  for (let [key, value] of Object.entries(marketplaces)) {
    let source = normalizeLocalMarketplaceSource(value.source);
    if (source === value.source) continue;
    normalized ??= {
      ...marketplaces,
    };
    normalized[key] = {
      ...value,
      source,
    };
  }
  return normalized ?? marketplaces;
}
//@ chunk-5xgkngpb.js:4342944-4342986 placement
/**
 * settingsSourceOfMarketplace：市场记录所在的设置源。
 */
function settingsSourceOfMarketplace(name) {
  return ownPropertyOrUndefined(tryUnwrapTextPayload(), name)?.source;
}
//@ chunk-5xgkngpb.js:4342986-4343063 placement
function findMarketplaceSource(resolvedSource) {
  return Object.values(tryUnwrapTextPayload()).find((entry) =>
    import_sortedIndex_2(entry.source, resolvedSource),
  )?.source;
}
//@ chunk-5xgkngpb.js:4343063-4343163 callgraph-fingerprint (2.1.88 match: getMarketplaceDeclaringSource, 0.338)
function getMarketplaceDeclaringSource(settings, name) {
  let extraKnownMarketplaces = settings?.extraKnownMarketplaces;
  return extraKnownMarketplaces !== undefined && Object.hasOwn(extraKnownMarketplaces, name)
    ? extraKnownMarketplaces[name]
    : undefined;
}
//@ chunk-5xgkngpb.js:4348690-4348818 fingerprint (2.1.88 match: saveMarketplaceToSettings, 1)
/**
 * 把市场写入某设置源（默认 userSettings）的 extraKnownMarketplaces。
 */
function saveMarketplaceToSettings(name, entry, source = "userSettings", storageV5) {
  return updateSettingsForSourceWithTransform(
    source,
    (settings) => ({
      extraKnownMarketplaces: {
        ...settings?.extraKnownMarketplaces,
        [name]: entry,
      },
    }),
    undefined,
    storageV5,
  );
}
//@ chunk-5xgkngpb.js:4348818-4349286 layout
/**
 * 读取 known_marketplaces.json，补上设置里 extraKnownMarketplaces 声明但尚未写盘的市场，以及（开启时）内置的 anthropic-plugin-directory 市场；返回 名字→KnownMarketplace。
 */
async function loadKnownMarketplacesWithDeclared(storageV5) {
  let [knownMarketplacesConfig, claudeAiMarketplaceRegistry] = await Promise.all([
    loadKnownMarketplacesConfig(storageV5),
    readClaudeAiMarketplaceRegistry(),
  ]);
  let base = filterAdmittedMarketplaces(knownMarketplacesConfig, getStorageArm(storageV5));
  let merged = base;
  for (let [key, value] of Object.entries(claudeAiMarketplaceRegistry)) {
    if (Object.hasOwn(base, key)) continue;
    if (merged === base)
      merged = {
        ...base,
      };
    merged[key] = toKnownMarketplaceEntry(key, value);
  }
  let directoryModules = isPluginDirectoryModeOn() ? pluginDirectoryModules : null;
  if (directoryModules && !Object.hasOwn(merged, OFFICIAL_MARKETPLACE_NAME)) {
    let block = pluginDirectoryPolicyBlock();
    if (block !== null) logDirectoryBlockedOnce(block);
    if (block !== null || (await directoryModules.isPluginDirectoryMarketplaceEnabled())) {
      if (merged === base)
        merged = {
          ...base,
        };
      merged[OFFICIAL_MARKETPLACE_NAME] = await directoryModules.pluginDirectoryRegistryEntry();
    }
  }
  setCommandSourceNameRegistration(merged[OFFICIAL_MARKETPLACE_NAME]?.source?.source);
  let identity = weakMap_16.get(base);
  if (merged !== base && identity !== undefined) weakMap_16.set(merged, identity);
  return merged;
}
//@ chunk-5xgkngpb.js:4349286-4349349 layout
/**
 * 存储模式：storageV5 可用为 "v5"，否则 "raw"。
 */
function getStorageArm(storageV5) {
  return isStorageV5Enabled() && storageV5 !== undefined && getMarketplacesStorageScope() !== null
    ? "v5"
    : "raw";
}
//@ chunk-5xgkngpb.js:4349349-4350879 fingerprint (2.1.88 match: loadKnownMarketplacesConfig, 0.657)
/**
 * 读 known_marketplaces.json 并用 KnownMarketplacesFileSchema 校验，非法条目（保留名、来源不合法）丢弃并记日志；读不到抛 TelemetrySafeError。
 */
async function loadKnownMarketplacesConfig(storageV5) {
  let scope = isStorageV5Enabled() && storageV5 !== undefined ? getMarketplacesStorageScope() : null;
  if (storageV5 !== undefined && scope !== null) {
    let fs = getKnownMarketplacesPathForDisplay();
    let readResult = await storageV5.read([scope]);
    if (!readResult.ok) {
      let message = `Failed to load marketplace configuration: ${formatStorageError(readResult.error)}`;
      logForDebugging(message, {
        level: "error",
      });
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        message,
        "failed to load marketplace configuration (v5 backend error)",
      );
    }
    let item = readResult.value.items[0];
    if (item === undefined) {
      logForDebugging(
        "Failed to load marketplace configuration: the backend returned no item for the registry key",
        {
          level: "error",
        },
      );
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "Failed to load marketplace configuration: the backend returned no item for the registry key",
        "failed to load marketplace configuration (v5 backend error)",
      );
    }
    if (!item.found) return {};
    let parsedJson;
    try {
      parsedJson = jsonParse(Buffer.from(item.value).toString("utf-8"));
    } catch (error) {
      let message = `Failed to load marketplace configuration: ${errorMessage(error)}`;
      logForDebugging(message, {
        level: "error",
      });
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        message,
        "failed to load marketplace configuration (v5 parse error)",
      );
    }
    let parseResult = KnownMarketplacesFileSchema().safeParse(parsedJson);
    if (!parseResult.success) {
      let message = `Marketplace configuration file is corrupted: ${parseResult.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join(", ")}`;
      logForDebugging(message, {
        level: "error",
      });
      throw new ConfigParseError(message, fs, parsedJson);
    }
    return normalizeInstallLocations(parseResult.data);
  }
  if (isDiskless()) return {};
  let configFile = getKnownMarketplacesPath();
  try {
    let content = await getFsImplementation().readFile(configFile, {
      encoding: "utf-8",
    });
    let data = jsonParse(content);
    let parsed = KnownMarketplacesFileSchema().safeParse(data);
    if (!parsed.success) {
      let errorMsg = `Marketplace configuration file is corrupted: ${parsed.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`;
      logForDebugging(errorMsg, {
        level: "error",
      });
      throw new ConfigParseError(errorMsg, configFile, data);
    }
    return normalizeInstallLocations(parsed.data);
  } catch (error) {
    if (isENOENT(error)) return {};
    if (error instanceof ConfigParseError) throw error;
    let errorMsg = `Failed to load marketplace configuration: ${errorMessage(error)}`;
    logForDebugging(errorMsg, {
      level: "error",
    });
    throw Error(errorMsg);
  }
}
//@ chunk-5xgkngpb.js:4350879-4350997 layout
/**
 * 规范化 known_marketplaces 中的 installLocation（本地来源与种子目录除外）。
 */
function normalizeInstallLocation(source, installLocation) {
  if (
    typeof installLocation !== "string" ||
    typeof source !== "object" ||
    source === null ||
    isLocalMarketplaceSource(source) ||
    seedDirFor(installLocation) !== undefined
  )
    return installLocation;
  return relocateInstallPath(installLocation);
}
//@ chunk-5xgkngpb.js:4350997-4351102 layout
function normalizeInstallLocations(config) {
  for (let entry of Object.values(config))
    entry.installLocation = normalizeInstallLocation(entry.source, entry.installLocation);
  return config;
}
//@ chunk-5xgkngpb.js:4351102-4351182 layout
/**
 * 同 loadKnownMarketplacesWithDeclared，但读失败时返回一个被标记为“读失败”的空对象（isKnownMarketplacesReadFailure 可判断），调用方据此区分“没有市场”和“读不到”。
 */
async function loadKnownMarketplacesSafe(storageV5) {
  try {
    return await loadKnownMarketplacesWithDeclared(storageV5);
  } catch {
    let failed = {};
    failedKnownMarketplacesReads.add(failed);
    return failed;
  }
}
//@ chunk-5xgkngpb.js:4351182-4351202 layout
var failedKnownMarketplacesReads; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:4351182", () => {
  failedKnownMarketplacesReads = new WeakSet();
});
//@ chunk-5xgkngpb.js:4351202-4351236 layout
/**
 * 判断一个已知市场表对象是否为“读失败”占位。
 */
function isKnownMarketplacesReadFailure(config) {
  return failedKnownMarketplacesReads.has(config);
}
//@ chunk-5xgkngpb.js:4351236-4351844 fingerprint (2.1.88 match: saveKnownMarketplacesConfig, 0.43)
/**
 * 校验后写回 known_marketplaces.json（原子写），失败抛错。
 */
async function saveKnownMarketplacesConfig(config, storageV5, extraEntries = new Map()) {
  let storageArm = getStorageArm(storageV5);
  let sanitizedConfig = omitPluginDirectoryEntries(omitClaudeAiMarketplaces(config));
  for (let [name, entry] of extraEntries) {
    if (releasedRegistryEntries()[storageArm].has(name)) continue;
    if (!Object.hasOwn(sanitizedConfig, name))
      sanitizedConfig = {
        ...sanitizedConfig,
        [name]: entry,
      };
  }
  let parsed = KnownMarketplacesFileSchema().safeParse(sanitizedConfig);
  if (!parsed.success)
    throw new ConfigParseError(
      `Invalid marketplace config: ${parsed.error.message}`,
      getKnownMarketplacesPathForDisplay(),
      sanitizedConfig,
    );
  let scope = isStorageV5Enabled() && storageV5 !== undefined ? getMarketplacesStorageScope() : null;
  if (isStorageV5Enabled() && storageV5 !== undefined && scope !== null) {
    let writeResult = await storageV5.write(scope, jsonStringify(parsed.data, null, 2), {
      mode: 438 & ~process.umask(),
    });
    if (!writeResult.ok)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Failed to save marketplace configuration: ${formatStorageError(writeResult.error)}`,
        "failed to save marketplace configuration (v5 backend error)",
      );
    return;
  }
  let configFile = getFsImplementation();
  let fs = getKnownMarketplacesPath();
  let dir = join(fs, "..");
  await configFile.mkdir(dir);
  syncTarget(fs, jsonStringify(parsed.data, null, 2));
}
//@ chunk-5xgkngpb.js:4351844-4351857 layout
var knownMarketplacesWriteQueue; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:4351844", () => {
  knownMarketplacesWriteQueue = createKeyedQueue();
});
//@ chunk-5xgkngpb.js:4351857-4351891 layout
function drainKnownMarketplacesWrites() {
  return knownMarketplacesWriteQueue.drain();
}
//@ chunk-5xgkngpb.js:4351891-4351900 layout
// deferred: uses registerWriteQueueDrain (../settings/writeQueues.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:4351891", () => {
  registerWriteQueueDrain(drainKnownMarketplacesWrites);
});
//@ chunk-5xgkngpb.js:4351900-4352546 layout
/**
 * 对 known_marketplaces.json 做串行化的读-改-写：进程内队列 + proper-lockfile 文件锁（.lock，重试 5 次）；回调返回 null 表示不写；存储后端模式下走存储层。
 */
async function updateKnownMarketplaces(update, storageV5) {
  if (isDiskless()) {
    if (getStorageArm(storageV5) === "raw") {
      warnDisklessSettingsWrite("known_marketplaces", KNOWN_MARKETPLACES_FILENAME);
      return false;
    }
    return knownMarketplacesWriteQueue.run(KNOWN_MARKETPLACES_FILENAME, () =>
      updateKnownMarketplacesLocked(update, storageV5),
    );
  }
  let knownMarketplacesPath = getKnownMarketplacesPath();
  return knownMarketplacesWriteQueue.run(knownMarketplacesPath, async () => {
    await getFsImplementation().mkdir(join(knownMarketplacesPath, ".."));
    let lockHandle;
    let unlocked = false;
    try {
      lockHandle = await lock(knownMarketplacesPath, {
        lockfilePath: `${knownMarketplacesPath}.lock`,
        realpath: false,
        retries: {
          retries: 5,
          minTimeout: 100,
          maxTimeout: 1000,
        },
        onCompromised: (error) => {
          logForDebugging(`known_marketplaces.json lock compromised: ${error}`, {
            level: "error",
          });
        },
      });
    } catch (error) {
      logForDebugging(
        `Failed to acquire known_marketplaces.json lock, writing without it: ${errorMessage(error)}`,
        {
          level: "error",
        },
      );
      unlocked = true;
    }
    try {
      let changed = await updateKnownMarketplacesLocked(update, storageV5);
      if (changed && unlocked) logEvent("tengu_known_marketplaces_fallback_write", {});
      return changed;
    } finally {
      await releaseLockQuietly(lockHandle, "known_marketplaces.json");
    }
  });
}
//@ chunk-5xgkngpb.js:4352546-4352666 layout
async function updateKnownMarketplacesLocked(update, storageV5) {
  let knownMarketplacesWithDeclared = await loadKnownMarketplacesWithDeclared(storageV5);
  let hiddenEntries = new Map(hiddenRegistryEntries()[getStorageArm(storageV5)]);
  let next = update(knownMarketplacesWithDeclared);
  if (next === null) return false;
  await saveKnownMarketplacesConfig(next, storageV5, hiddenEntries);
  return true;
}
//@ chunk-5xgkngpb.js:4352666-4352800 layout
async function touchMarketplaceLastUpdated(marketplaceName, storageV5) {
  await updateKnownMarketplaces((config) => {
    let entry = ownPropertyOrUndefined(config, marketplaceName);
    if (!entry) return null;
    config[marketplaceName] = {
      ...entry,
      lastUpdated: new Date().toISOString(),
    };
    return config;
  }, storageV5);
}
//@ chunk-5xgkngpb.js:4352800-4353042 layout
/**
 * 把种子目录（CLAUDE_CODE_PLUGIN_SEED_DIR 等）里登记的市场同步进 known_marketplaces.json，有变化返回 true。
 */
async function syncSeedMarketplaces(storageV5) {
  let seedEntries = await registerSeedMarketplaces(storageV5);
  if (seedEntries.length === 0) return false;
  let changedCount = 0;
  await updateKnownMarketplaces((config) => {
    for (let [name, entry] of seedEntries) {
      if (import_sortedIndex_2(ownPropertyOrUndefined(config, name), entry)) continue;
      config[name] = entry;
      changedCount++;
    }
    return changedCount > 0 ? config : null;
  }, storageV5);
  if (changedCount > 0) {
    logForDebugging(`Synced ${changedCount} marketplace(s) from seed dir(s)`);
    return true;
  }
  return false;
}
//@ chunk-5xgkngpb.js:4353042-4353426 fingerprint (2.1.88 match: registerSeedMarketplaces, 0.806)
/**
 * 扫描 CLAUDE_CODE_PLUGIN_SEED_DIR 下各种子目录的 known_marketplaces.json，返回可登记的 [名字, 条目]（同名先到先得）。
 */
async function registerSeedMarketplaces(storageV5) {
  let claimed = new Set();
  let changed = [];
  for (let seedDir of getPluginSeedDirs()) {
    let seedConfig = await readSeedKnownMarketplaces(seedDir);
    if (!seedConfig) continue;
    for (let [name, seedEntry] of Object.entries(seedConfig)) {
      if (claimed.has(name)) continue;
      let resolvedLocation = await findSeedMarketplaceCatalog(seedDir, name, storageV5);
      if (!resolvedLocation) {
        logForDebugging(`Seed marketplace '${name}' not found under ${seedDir}/marketplaces/, skipping`, {
          level: "warn",
        });
        continue;
      }
      claimed.add(name);
      changed.push([
        name,
        {
          source: seedEntry.source,
          installLocation: resolvedLocation,
          lastUpdated: seedEntry.lastUpdated,
          autoUpdate: false,
        },
      ]);
    }
  }
  return changed;
}
//@ chunk-5xgkngpb.js:4353426-4353797 fingerprint (2.1.88 match: readSeedKnownMarketplaces, 1)
async function readSeedKnownMarketplaces(seedDir) {
  let seedJsonPath = join(seedDir, "known_marketplaces.json");
  try {
    let content = await getFsImplementation().readFile(seedJsonPath, {
      encoding: "utf-8",
    });
    let parsed = KnownMarketplacesFileSchema().safeParse(jsonParse(content));
    if (!parsed.success) {
      logForDebugging(`Seed known_marketplaces.json invalid at ${seedDir}: ${parsed.error.message}`, {
        level: "warn",
      });
      return null;
    }
    return parsed.data;
  } catch (e) {
    if (!isENOENT(e))
      logForDebugging(`Failed to read seed known_marketplaces.json at ${seedDir}: ${e}`, {
        level: "warn",
      });
    return null;
  }
}
//@ chunk-5xgkngpb.js:4353797-4354015 layout
async function findSeedMarketplaceCatalog(seedDir, name, storageV5) {
  let dirCandidate = join(seedDir, "marketplaces", name);
  let jsonCandidate = join(seedDir, "marketplaces", `${name}.json`);
  for (let candidate of [dirCandidate, jsonCandidate])
    try {
      await readMarketplaceManifest(
        candidate,
        undefined,
        storageV5,
        isStorageV5Enabled() && storageV5 !== undefined
          ? {
              kind: "hostFolder",
              space: "system",
            }
          : null,
      );
      return candidate;
    } catch {}
  return null;
}
//@ chunk-5xgkngpb.js:4354015-4354113 file-local
/**
 * 返回包含该安装位置的种子目录（不在任何种子目录下返回 undefined）；种子目录下的市场/插件只读、不刷新。
 */
function seedDirFor(installLocation) {
  let resolvedPath = resolve_2(installLocation);
  return getPluginSeedDirs().find((seedDir) => {
    let resolvedSeedDir = resolve_2(seedDir);
    return resolvedPath === resolvedSeedDir || resolvedPath.startsWith(resolvedSeedDir + sep);
  });
}
//@ chunk-5xgkngpb.js:4354113-4354142 layout
var DEFAULT_GIT_TIMEOUT_MS = 120000;
var CLONE_TEMP_SUFFIX = "..clone";
//@ chunk-5xgkngpb.js:4354142-4354238 fingerprint (2.1.88 match: getPluginGitTimeoutMs, 1)
function getPluginGitTimeoutMs() {
  let envValue = env.CLAUDE_CODE_PLUGIN_GIT_TIMEOUT_MS;
  if (envValue !== undefined && envValue > 0) return envValue;
  return DEFAULT_GIT_TIMEOUT_MS;
}
//@ chunk-5xgkngpb.js:4354238-4354503 layout
async function marketplacePathExists(storageV5, nestedPath, fallback) {
  let storageKey =
    isStorageV5Enabled() && storageV5 !== undefined
      ? getMarketplaceStorageKey(nestedPath, getPluginsDirectory())
      : null;
  if (storageV5 === undefined || storageKey === null) return fallback();
  let statResult = await storageV5.statMeta(storageKey);
  if (statResult.ok) return true;
  let telemetryCode =
    "telemetryCode" in statResult.error && typeof statResult.error.telemetryCode === "string"
      ? statResult.error.telemetryCode
      : undefined;
  return isNonRegularError(telemetryCode) ? fallback() : false;
}
//@ chunk-5xgkngpb.js:4354503-4354622 fingerprint (2.1.88 match: readCachedMarketplace, 0.788)
function readCachedMarketplace_2(storageV5, rootDir) {
  let nestedPath = join(rootDir, ".claude-plugin", "marketplace.json");
  return marketplacePathExists(storageV5, nestedPath, () =>
    getFsImplementation()
      .stat(nestedPath)
      .then(
        () => true,
        () => false,
      ),
  );
}
//@ chunk-5xgkngpb.js:4354622-4354721 layout
function orderGithubTransports(preferSsh, url, url_2) {
  let sshAttempt = {
    transport: "SSH",
    url,
  };
  let httpsAttempt = {
    transport: "HTTPS",
    url: url_2,
  };
  return preferSsh ? [sshAttempt, httpsAttempt] : [httpsAttempt, sshAttempt];
}
//@ chunk-5xgkngpb.js:4354721-4354964 layout
function mergeBothTransportErrors(firstFailure, secondFailure) {
  if (firstFailure.error.message !== secondFailure.error.message)
    secondFailure.error.message = `Fetching the marketplace from GitHub failed on both attempts. ${firstFailure.transport} (${firstFailure.url}): ${firstFailure.error.message}

${secondFailure.transport} (${secondFailure.url}): ${secondFailure.error.message}`;
  return secondFailure.error;
}
//@ chunk-5xgkngpb.js:4354964-4355141 fingerprint (2.1.88 match: isAuthenticationError, 1)
function isAuthenticationError(stderr) {
  return (
    stderr.includes("Authentication failed") ||
    stderr.includes("could not read Username") ||
    stderr.includes("terminal prompts disabled") ||
    stderr.includes("403") ||
    stderr.includes("401")
  );
}
//@ chunk-5xgkngpb.js:4355141-4355236 layout (2.1.88 match: ghIsDangerousCallback, 1)
function getScpRemoteHost(url) {
  if (url.includes("://")) return null;
  return url.match(/^[^:]*@([^@:]+):/)?.[1] ?? null;
}
//@ chunk-5xgkngpb.js:4355236-4355342 layout
function gitHostDisplayName(url) {
  let hostFromSource = extractHostFromSource({
    source: "git",
    url,
  });
  if (hostFromSource === null) return "your git host";
  return isGithubDotCom(hostFromSource) ? "GitHub" : hostFromSource;
}
//@ chunk-5xgkngpb.js:4355342-4355587 layout
function credentialHelperHint(url) {
  let hostFromSource = extractHostFromSource({
    source: "git",
    url,
  });
  if (hostFromSource !== null && isGithubDotCom(hostFromSource))
    return "your credential helper is configured (e.g., gh auth login)";
  return `your git credential helper has valid credentials for ${hostFromSource ?? "this host"} (e.g., a personal access token)`;
}
//@ chunk-5xgkngpb.js:4355587-4358800 fingerprint (2.1.88 match: gitClone, 0.829)
/**
 * 克隆市场仓库：校验 ref/URL（拒绝 - 开头参数与危险协议）、--depth 1、可选 sparse-checkout、禁用交互提示与 LFS、超时 CLAUDE_CODE_PLUGIN_GIT_TIMEOUT_MS。
 */
async function gitClone(url, targetDir, ref, sparsePaths, manifestPath) {
  let urlError = pluginGitUrlError(url);
  if (urlError !== null)
    return {
      code: 1,
      stderr: `Refusing to clone. ${urlError.message}`,
    };
  let useSparse = sparsePaths && sparsePaths.length > 0;
  let { pinArgs, inCheckoutArgs, env } = runGitWithCeilingDirs(targetDir, await resolveGitSshConfig(url));
  let args = [...SSH_BATCH_CONFIG_ARGS, ...pinArgs, "clone", "--depth", "1"];
  if (useSparse) {
    if (isNetworkGitUrl(url)) args.push("--filter=blob:none");
    args.push("--no-checkout");
  } else args.push("--no-recurse-submodules");
  if (ref) args.push("--branch", ref);
  args.push("--", url, targetDir);
  let timeoutMs = getPluginGitTimeoutMs();
  logForDebugging(`git clone: url=${redactUrlQuery(url)} ref=${ref ?? "default"} timeout=${timeoutMs}ms`);
  let startTime = performance.now();
  let result = await execFileNoThrowWithCwd(gitExe(), args, {
    ...(await prepareGitWorkDir(targetDir, env)),
    timeout: timeoutMs,
    stdin: "ignore",
  });
  let submoduleResult =
    result.code === 0 && !useSparse
      ? await gitSubmoduleUpdate({
          checkoutDir: targetDir,
          manifestPath,
          inCheckoutArgs,
          env,
          deadline: startTime + timeoutMs,
        })
      : undefined;
  let result_2 = {
    ...(submoduleResult?.result ?? result),
    submodules: submoduleResult?.submodules,
  };
  if (result_2.error) result_2.error = redactKnownUrls(result_2.error, url);
  if (result_2.stderr) result_2.stderr = redactKnownUrls(result_2.stderr, url);
  if (result_2.code === 0) {
    if (useSparse) {
      let redacted = pickGitNoPromptEnv(env);
      let sparseResult = await runGitInOwnWorkTree(
        targetDir,
        [...inCheckoutArgs, "sparse-checkout", "set", "--cone", "--", ...sparsePaths],
        redacted,
        {
          timeout: timeoutMs,
        },
      );
      if (sparseResult.code !== 0)
        return {
          code: sparseResult.code,
          stderr: `git sparse-checkout set failed: ${redactKnownUrls(sparseResult.stderr, url)}`,
        };
      let checkoutResult = await runGitInOwnWorkTree(
        targetDir,
        [...inCheckoutArgs, "read-tree", "-u", "--reset", "HEAD"],
        redacted,
        {
          timeout: timeoutMs,
        },
      );
      if (checkoutResult.code !== 0)
        return {
          code: checkoutResult.code,
          stderr: `git read-tree after sparse-checkout failed: ${redactKnownUrls(checkoutResult.stderr, url)}`,
        };
    }
    logForDebugging(`git clone succeeded: ${redactUrlQuery(url)}`);
    return result_2;
  }
  logForDebugging(
    `git clone failed: url=${redactUrlQuery(url)} code=${result_2.code} error=${result_2.error ?? "none"} stderr=${result_2.stderr}`,
    {
      level: "warn",
    },
  );
  if (result_2.error?.includes("timed out"))
    return {
      ...result_2,
      stderr: `Git clone timed out after ${Math.round(timeoutMs / 1000)}s. The repository may be too large for the current timeout. Set CLAUDE_CODE_PLUGIN_GIT_TIMEOUT_MS to increase it (e.g., 300000 for 5 minutes).

Original error: ${result_2.stderr}`,
    };
  if (result_2.stderr) {
    if (result_2.stderr.includes("REMOTE HOST IDENTIFICATION HAS CHANGED")) {
      let host = getScpRemoteHost(url);
      let removeHint = host ? `ssh-keygen -R ${host}` : "ssh-keygen -R <host>";
      return {
        ...result_2,
        stderr: `SSH host key has changed (server key rotation or possible MITM). Remove the stale known_hosts entry:
  ${removeHint}
Then connect once manually to verify and accept the new key.

Original error: ${result_2.stderr}`,
      };
    }
    if (result_2.stderr.includes("Host key verification failed")) {
      let host = getScpRemoteHost(url);
      let connectHint = host ? `ssh -T git@${host}` : "ssh -T git@<host>";
      return {
        ...result_2,
        stderr: `SSH host key is not in your known_hosts file. To add it, connect once manually (this will show the fingerprint for you to verify):
  ${connectHint}

Or use an HTTPS URL instead (recommended for public repos).

Original error: ${result_2.stderr}`,
      };
    }
    if (
      result_2.stderr.includes("Permission denied (publickey)") ||
      result_2.stderr.includes("Could not read from remote repository")
    )
      return {
        ...result_2,
        stderr: `SSH authentication failed. Please ensure your SSH keys are configured for ${gitHostDisplayName(url)}, or use an HTTPS URL instead.

Original error: ${result_2.stderr}`,
      };
    if (isAuthenticationError(result_2.stderr))
      return {
        ...result_2,
        stderr: `HTTPS authentication failed. Please ensure ${credentialHelperHint(url)}.

Original error: ${result_2.stderr}`,
      };
    if (
      result_2.stderr.includes("timed out") ||
      result_2.stderr.includes("timeout") ||
      result_2.stderr.includes("Could not resolve host")
    )
      return {
        ...result_2,
        stderr: `Network error or timeout while cloning repository. Please check your internet connection and try again.

Original error: ${result_2.stderr}`,
      };
  }
  if (!result_2.stderr)
    return {
      submodules: result_2.submodules,
      code: result_2.code,
      stderr:
        result_2.error ||
        `git clone exited with code ${result_2.code} (no stderr output). Run with --debug to see the full command.`,
    };
  return result_2;
}
//@ chunk-5xgkngpb.js:4358800-4358902 fingerprint (2.1.88 match: safeCallProgress, 1)
function safeCallProgress(onProgress, message) {
  if (!onProgress) return;
  try {
    onProgress(message);
  } catch (callbackError) {
    logForDebugging(`Progress callback error: ${errorMessage(callbackError)}`, {
      level: "warn",
    });
  }
}
//@ chunk-5xgkngpb.js:4358902-4359083 layout
function throwDisklessMarketplaceFetch(cachePath) {
  warnDisklessSettingsWrite("marketplace_cache", cachePath);
  throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    "Marketplaces can't be fetched in this session, because it can't save them",
    "marketplace fetch refused in a diskless session",
  );
}
//@ chunk-5xgkngpb.js:4359083-4362178 fingerprint (2.1.88 match: cacheMarketplaceFromGit, 0.416)
/**
 * git 来源市场的缓存：已有克隆则 fetch/pull 刷新（失败可回退），否则克隆；GitHub 来源按 SSH/HTTPS 顺序各试一次。
 */
async function cacheMarketplaceFromGit(remoteUrl, targetDir, storageV5, path, ref, sparsePaths, onProgress) {
  let fs = getFsImplementation();
  let pluginGitTimeoutMs = getPluginGitTimeoutMs();
  let timeoutSec = Math.round(pluginGitTimeoutMs / 1000);
  switch (
    (safeCallProgress(onProgress, `Refreshing marketplace cache (timeout: ${timeoutSec}s)\u2026`),
    await probeMarketplaceCheckout(targetDir, remoteUrl, {
      ref,
      sparsePaths,
      timeout: pluginGitTimeoutMs,
    }))
  ) {
    case "current":
      return {
        kind: "current",
      };
    case "unreachable":
      if (
        env.CLAUDE_CODE_PLUGIN_KEEP_MARKETPLACE_ON_FAILURE &&
        (await readCachedMarketplace_2(storageV5, targetDir))
      ) {
        logForDebugging(
          "Marketplace remote unreachable, keeping existing clone (CLAUDE_CODE_PLUGIN_KEEP_MARKETPLACE_ON_FAILURE)",
          {
            level: "warn",
          },
        );
        return {
          kind: "kept-stale",
        };
      }
      break;
    case "stale":
      break;
  }
  let backupPath = `${targetDir}.bak`;
  let backupName = `${basename(targetDir)}.bak`;
  let { owner } = await findMarketplaceNameOwner(dirname(targetDir), backupName, storageV5, {
    isSelf: (name) => name === basename(targetDir),
  });
  if (owner !== undefined)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Cannot fetch marketplace ${jsonStringify(basename(targetDir))}: the directory it would use as its backup (${backupPath}) is the registered marketplace ${jsonStringify(owner)}'s directory. Remove or rename that marketplace first (claude plugin marketplace remove).`,
      "marketplace backup path is another marketplace clone",
    );
  try {
    await fs.rename(backupPath, targetDir);
    forgetGitRootsUnder(targetDir);
  } catch (error) {
    if (!isENOENT(error)) {
      if (!(await readCachedMarketplace_2(storageV5, targetDir))) {
        await removeDirectoryTreeNoFollow_2(targetDir).catch(() => {});
        await fs.rename(backupPath, targetDir);
        forgetGitRootsUnder(targetDir);
      }
    }
  }
  try {
    await removeDirectoryTreeNoFollow_2(backupPath);
  } catch (error) {
    throw Error(`Failed to clean up stale marketplace backup directory. Please manually delete the directory at ${backupPath} and try again.

Technical details: ${errorMessage(error)}`);
  }
  let stagingDir = join(dirname(targetDir), `${basename(targetDir)}${CLONE_TEMP_SUFFIX}`);
  try {
    await removeDirectoryTreeNoFollow_2(stagingDir);
  } catch (error) {
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Failed to clean up a leftover marketplace staging directory. Please manually delete the directory at ${stagingDir} and try again.

Technical details: ${errorMessage(error)}`,
      "Failed to clean up a leftover marketplace staging directory",
    );
  }
  let refSuffix = ref ? ` (ref: ${ref})` : "";
  safeCallProgress(
    onProgress,
    `Cloning repository (timeout: ${timeoutSec}s): ${redactUrlQuery(remoteUrl)}${refSuffix}`,
  );
  let pullStarted = performance.now();
  let cloneResult = await gitClone(remoteUrl, stagingDir, ref, sparsePaths, path);
  logPluginFetch(
    "marketplace_clone",
    remoteUrl,
    cloneResult.code === 0 ? "success" : "failure",
    performance.now() - pullStarted,
    cloneResult.code === 0 ? undefined : classifyFetchError(cloneResult.stderr),
    undefined,
    cloneResult.submodules,
  );
  if (cloneResult.code !== 0) {
    await removeDirectoryTreeNoFollow_2(stagingDir).catch(() => {});
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Failed to clone marketplace repository: ${cloneResult.stderr}`,
      `Failed to clone marketplace repository: ${classifyFetchError(cloneResult.stderr)} (exit ${cloneResult.code})`,
    );
  }
  try {
    await writeSparsePaths(stagingDir, sparsePaths);
  } catch (error) {
    logForDebugging(`Could not record the marketplace clone's sparse paths: ${errorMessage(error)}`, {
      level: "warn",
    });
  }
  let lfsPointerScan = await checkGitLfsFiles(stagingDir);
  let movedAside = false;
  try {
    await fs.rename(targetDir, backupPath);
    movedAside = true;
    safeCallProgress(onProgress, "Replacing the existing marketplace clone\u2026");
  } catch (rmError) {
    let rmErrorMsg = getErrnoCode(rmError);
    if (rmErrorMsg !== "ENOENT") {
      await removeDirectoryTreeNoFollow_2(stagingDir).catch(() => {});
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        rmErrorMsg === "EBUSY" || rmErrorMsg === "EPERM" || rmErrorMsg === "EACCES"
          ? `Could not replace the marketplace directory at ${targetDir} because it is in use; the existing copy was kept and the next refresh will try again.

Technical details: ${errorMessage(rmError)}`
          : `Failed to move the existing marketplace directory aside. Please manually delete the directory at ${targetDir} and try again.

Technical details: ${errorMessage(rmError)}`,
        "Failed to move the existing marketplace directory aside",
      );
    }
  }
  try {
    await fs.rename(stagingDir, targetDir);
    forgetGitRootsUnder(targetDir);
  } catch (error) {
    if (movedAside)
      await fs
        .rename(backupPath, targetDir)
        .then(() => forgetGitRootsUnder(targetDir))
        .catch(() => {});
    await removeDirectoryTreeNoFollow_2(stagingDir).catch(() => {});
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Failed to move the new marketplace clone into place at ${targetDir}. Please try again.

Technical details: ${errorMessage(error)}`,
      "Failed to move the new marketplace clone into place",
    );
  }
  if (movedAside) await removeDirectoryTreeNoFollow_2(backupPath).catch(() => {});
  safeCallProgress(onProgress, "Clone complete, validating marketplace\u2026");
  return {
    kind: "cloned",
    lfsPointerScan,
  };
}
//@ chunk-5xgkngpb.js:4362178-4362319 layout
function warnLfsPointers(targetDir, fetchResult, onProgress) {
  if (fetchResult?.kind !== "cloned") return;
  let warning = describeGitLfsMissing(targetDir, fetchResult.lfsPointerScan);
  if (warning === null) return;
  logForDebugging(`[git-lfs] ${warning}`, {
    level: "warn",
  });
  safeCallProgress(onProgress, warning);
}
//@ chunk-5xgkngpb.js:4362319-4362369 fingerprint (2.1.88 match: redactHeaders, 0.879)
function redactHeaders(headers) {
  return import_mapValues(headers, () => "***REDACTED***");
}
//@ chunk-5xgkngpb.js:4362369-4363903 fingerprint (2.1.88 match: cacheMarketplaceFromUrl, 0.867)
/**
 * 下载 url 来源的 marketplace.json（带 headers 与 headersHelper 生成的头，日志中脱敏），返回解析后的 JSON。
 */
async function cacheMarketplaceFromUrl(url, cachePath, customHeaders, onProgress) {
  let redactedUrl = redactUrlsInText(url);
  safeCallProgress(onProgress, `Downloading marketplace from ${redactedUrl}`);
  logForDebugging(`Downloading marketplace from URL: ${redactedUrl}`);
  if (customHeaders && Object.keys(customHeaders).length > 0)
    logForDebugging(`Using custom headers: ${jsonStringify(redactHeaders(customHeaders))}`);
  let headers = {
    ...customHeaders,
    "User-Agent": CLAUDE_CODE_PLUGIN_MANAGER,
  };
  let response;
  let fetchStarted = performance.now();
  try {
    response = await externalHttp.get(url, {
      timeout: 1e4,
      maxContentLength: MAX_PLUGIN_ARCHIVE_BYTES,
      headers,
      beforeRedirect: checkCatalogRedirect(url, headerNamesExceptUserAgent(customHeaders)),
    });
  } catch (error) {
    logPluginFetch(
      "marketplace_url",
      url,
      "failure",
      performance.now() - fetchStarted,
      classifyFetchError(error),
    );
    let telemetrySafeCause = findTelemetrySafeCause(error);
    if (telemetrySafeCause) throw telemetrySafeCause;
    let redactMessage = (message) => message.replaceAll(url, () => redactedUrl);
    if (isAxiosError(error)) {
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND")
        throw Error(`Could not connect to ${redactedUrl}. Please check your internet connection and verify the URL is correct.

Technical details: ${redactMessage(error.message)}`);
      if (error.code === "ETIMEDOUT")
        throw Error(`Request timed out while downloading marketplace from ${redactedUrl}. The server may be slow or unreachable.

Technical details: ${redactMessage(error.message)}`);
      if (error.response)
        throw Error(`HTTP ${error.response.status} error while downloading marketplace from ${redactedUrl}. The marketplace file may not exist at this URL.

Technical details: ${redactMessage(error.message)}`);
    }
    throw Error(`Failed to download marketplace from ${redactedUrl}: ${redactMessage(errorMessage(error))}`);
  }
  safeCallProgress(onProgress, "Validating marketplace data");
  let result = PluginMarketplaceSchema()
    .extend({
      name: getMarketplaceNameSchemaFor(marketplaceNameUnlessCowork(cachePath)),
      plugins: array(unknown()),
    })
    .safeParse(response.data);
  if (!result.success) {
    logPluginFetch("marketplace_url", url, "failure", performance.now() - fetchStarted, "invalid_schema");
    throw withMarketplaceFailureCode(
      new ConfigParseError(
        `Invalid marketplace schema from URL: ${result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`,
        redactedUrl,
        response.data,
      ),
      "manifest_invalid",
    );
  }
  logPluginFetch("marketplace_url", url, "success", performance.now() - fetchStarted);
  return response.data;
}
//@ chunk-5xgkngpb.js:4363903-4364059 layout
async function cacheMarketplaceFromUrlToFile(url, cachePath, cachePath_2, customHeaders, onProgress) {
  let fsImplementation = getFsImplementation();
  let marketplace = await cacheMarketplaceFromUrl(url, cachePath_2, customHeaders, onProgress);
  safeCallProgress(onProgress, "Saving marketplace to cache");
  let dir = join(cachePath, "..");
  await fsImplementation.mkdir(dir);
  await writeFileAtomic_2(cachePath, jsonStringify(marketplace, null, 2));
}
//@ chunk-5xgkngpb.js:4364059-4364350 fingerprint (2.1.88 match: getCachePathForSource, 0.821)
/**
 * 由市场来源算出 marketplaces/ 下的缓存目录名（github 用 owner-repo，git 用 URL 派生，npm/file/directory 各有规则）。
 */
function getCachePathForSource(source) {
  let tempName = (
    source.source === "github"
      ? source.repo.replaceAll("/", "-")
      : source.source === "npm"
        ? source.package.replace("@", "").replaceAll("/", "-")
        : source.source === "file"
          ? basename(source.path).replace(".json", "")
          : source.source === "directory"
            ? basename(source.path)
            : makeTempCachePathName("git")
  ).replace(/[^a-zA-Z0-9\-_]/g, "-");
  return tempName === "" ? makeTempCachePathName("unknown") : tempName;
}
//@ chunk-5xgkngpb.js:4364350-4364439 layout (2.1.88 match: readJsonFile, 0.83)
/**
 * 读取 UTF-8 文件并按 schema 解析（共享指纹误归 agentMemorySnapshot）。
 */
async function readJsonFileWithSchema(path, schema) {
  let content = await getFsImplementation().readFile(path, {
    encoding: "utf-8",
  });
  return parseFileWithSchema(content, path, schema);
}
//@ chunk-5xgkngpb.js:4364439-4364705 fingerprint (2.1.88 match: parseFileWithSchema, 0.801)
/**
 * 读 JSON 文本（去 BOM）并用 zod schema 校验，失败抛带路径的错误。
 */
function parseFileWithSchema(text, label, schema) {
  let data;
  try {
    data = jsonParse(stripBom(text));
  } catch (error) {
    throw new ConfigParseError(`Invalid JSON in ${label}: ${errorMessage(error)}`, label, text);
  }
  let result = schema.safeParse(data);
  if (!result.success)
    throw new ConfigParseError(
      `Invalid schema: ${label} ${result.error?.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`,
      label,
      data,
    );
  return result.data;
}
//@ chunk-5xgkngpb.js:4364705-4366093 layout
/**
 * 解析下载到的 marketplace.json：schema 校验、保留名来源校验，失败抛 manifest_invalid 类错误。
 */
async function parseAndValidateFetchedMarketplace(
  storageV5,
  source,
  text,
  temporaryCachePath,
  cacheDir,
  marketplaceName,
  onProgress,
  onName,
  known,
  selfKey,
) {
  let parsed;
  try {
    parsed = parseFileWithSchema(
      text,
      temporaryCachePath,
      getPluginMarketplaceSchemaFor(marketplaceNameUnlessCowork(marketplaceName)),
    );
  } catch (error) {
    throw withMarketplaceFailureCode(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Failed to parse marketplace file at ${temporaryCachePath}: ${errorMessage(error)}`,
        "failed to parse fetched marketplace catalog",
      ),
      "manifest_invalid",
    );
  }
  let refusal = validateOfficialNameSource(parsed.name, source);
  if (refusal)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      refusal,
      "marketplace reserved-name/source validation failed",
    );
  await onName?.(parsed.name);
  if (!isValidMarketplaceDirName(parsed.name))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Marketplace name ${jsonStringify(parsed.name)} is not a plain directory name; refusing to cache it`,
      "fetched url marketplace name is not a plain cache component",
    );
  await assertMarketplaceNameAvailable(cacheDir, parsed.name, storageV5, {
    known,
    selfKey,
    source,
  });
  let storageKey = marketplaceCacheSpace(parsed.name, "catalog", getPluginsDirectory());
  if (storageKey === null)
    return {
      declined: parsed,
    };
  let cacheDirPath = join(cacheDir, parsed.name);
  safeCallProgress(onProgress, "Saving marketplace to cache");
  let writeCatalog = () =>
    storageV5.write(storageKey, text, {
      publishDiscipline: "atomic",
      mode: 438 & ~process.umask(),
    });
  let writeResult = await writeCatalog();
  if (
    !writeResult.ok &&
    writeResult.error.code === "Failed" &&
    (isNonRegularError(writeResult.error.telemetryCode) ||
      (await storageV5.scopeKind(marketplaceCacheKey(parsed.name)).then(
        (scopeResult) => scopeResult.ok && scopeResult.value.kind === "directory",
        () => false,
      )))
  ) {
    try {
      await removeDirectoryTreeNoFollow_2(cacheDirPath);
    } catch (error) {
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Failed to finalize marketplace cache. Please manually delete the directory at ${cacheDirPath} if it exists and try again.

Technical details: ${errorMessage(error)}`,
        "failed to remove a clone directory holding the url catalog name",
      );
    }
    writeResult = await writeCatalog();
  }
  if (!writeResult.ok)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Failed to write marketplace catalog: ${formatStorageError(writeResult.error)}`,
      "failed to write marketplace catalog (v5 backend error)",
    );
  return {
    published: {
      marketplace: parsed,
      cachePath: cacheDirPath,
      keptStaleClone: false,
    },
  };
}
//@ chunk-5xgkngpb.js:4366093-4366409 layout
async function cacheMarketplaceFromUrlToStorage(
  storageV5,
  storageKey,
  url,
  cachePath,
  customHeaders,
  onProgress,
) {
  let marketplace = await cacheMarketplaceFromUrl(url, cachePath, customHeaders, onProgress);
  safeCallProgress(onProgress, "Saving marketplace to cache");
  let writeResult = await storageV5.write(storageKey, jsonStringify(marketplace, null, 2), {
    publishDiscipline: "atomic",
    mode: 438 & ~process.umask(),
  });
  if (!writeResult.ok)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Failed to write marketplace catalog: ${formatStorageError(writeResult.error)}`,
      "failed to write marketplace catalog (v5 backend error)",
    );
}
//@ chunk-5xgkngpb.js:4366409-4371877 fingerprint (2.1.88 match: loadAndCacheMarketplace, 0.572)
/**
 * 按来源（github/git/url/npm/file/directory/settings）获取并缓存市场目录，校验企业策略（blockedMarketplaces/strictKnownMarketplaces）、保留名来源、marketplace.json schema；返回 {marketplace, cachePath}。
 */
async function loadAndCacheMarketplace(
  source,
  marketplaceName,
  onProgress,
  storageV5,
  knownName,
  onName,
  known,
  refuseNameCollision,
) {
  if (!isSourceAllowedByPolicy(source))
    throw withMarketplaceFailureCode(
      Error(`Marketplace source '${formatSourceForDisplay(source)}' is blocked by enterprise policy.`),
      "source_blocked_by_policy",
    );
  if (isDiskless()) throwDisklessMarketplaceFetch(join("plugins", "marketplaces"));
  let fs = getFsImplementation();
  let cacheDir = getResolvedMarketplacesCacheDir();
  let selfKey = onName === undefined ? knownName : undefined;
  let schema = getPluginMarketplaceSchemaFor(marketplaceNameUnlessCowork(marketplaceName));
  await fs.mkdir(cacheDir);
  let temporaryCachePath;
  let manifestPath;
  let ownsTemp = false;
  let settingsJson;
  let parsedMarketplace;
  let fetchResult;
  let tempName = getCachePathForSource(source);
  let folderTaken =
    source.source === "github" && (await checkCloneDirOwnedByOther(cacheDir, tempName, source, storageV5));
  try {
    switch (source.source) {
      case "url": {
        temporaryCachePath = join(cacheDir, `${tempName}.json`);
        if (isStorageV5Enabled() && storageV5 !== undefined && !refuseNameCollision) {
          let marketplace = await cacheMarketplaceFromUrl(
            source.url,
            marketplaceName,
            await describeHelperDeclaration(source, {
              marketplaceName: knownName,
              trustedDeclaration: findUrlMarketplaceHeaders(source, knownName),
            }),
            onProgress,
          );
          let marketplaceJson = jsonStringify(marketplace, null, 2);
          let validateResult = await parseAndValidateFetchedMarketplace(
            storageV5,
            source,
            marketplaceJson,
            temporaryCachePath,
            cacheDir,
            marketplaceName,
            onProgress,
            onName,
            known,
            selfKey,
          );
          if ("published" in validateResult) return validateResult.published;
          ownsTemp = true;
          safeCallProgress(onProgress, "Saving marketplace to cache");
          await writeFileAtomic_2(temporaryCachePath, marketplaceJson);
          manifestPath = temporaryCachePath;
          parsedMarketplace = validateResult.declined;
          break;
        }
        ownsTemp = true;
        await cacheMarketplaceFromUrlToFile(
          source.url,
          temporaryCachePath,
          marketplaceName,
          await describeHelperDeclaration(source, {
            marketplaceName: knownName,
            trustedDeclaration: findUrlMarketplaceHeaders(source, knownName),
          }),
          onProgress,
        );
        manifestPath = temporaryCachePath;
        break;
      }
      case "github": {
        let sshUrl = `git@${GITHUB_HOST}:${source.repo}.git`;
        let httpsUrl = `https://github.com/${source.repo}.git`;
        temporaryCachePath = join(cacheDir, tempName);
        ownsTemp = !folderTaken;
        if (preferHttpsGitTransport()) {
          safeCallProgress(onProgress, `Cloning via HTTPS: ${httpsUrl}`);
          fetchResult = await cacheMarketplaceFromGit(
            httpsUrl,
            temporaryCachePath,
            storageV5,
            source.path,
            source.ref,
            source.sparsePaths,
            onProgress,
          );
          ownsTemp = true;
          manifestPath = join(temporaryCachePath, source.path || ".claude-plugin/marketplace.json");
          break;
        }
        let sshConfigured = await isGithubSshConfigured();
        let [firstAttempt, fallbackAttempt] = orderGithubTransports(sshConfigured, sshUrl, httpsUrl);
        safeCallProgress(
          onProgress,
          sshConfigured ? `Cloning via SSH: ${sshUrl}` : sshNotConfiguredMessage(httpsUrl),
        );
        logForDebugging(
          sshConfigured
            ? `SSH configured for GitHub, using SSH for ${source.repo}`
            : `SSH not configured for GitHub, using HTTPS for ${source.repo}`,
          {
            level: "info",
          },
        );
        try {
          fetchResult = await cacheMarketplaceFromGit(
            firstAttempt.url,
            temporaryCachePath,
            storageV5,
            source.path,
            source.ref,
            source.sparsePaths,
            onProgress,
          );
        } catch (err) {
          logForDebugging(
            `${firstAttempt.transport} clone failed for marketplace ${source.repo} (${errorMessage(err)}), falling back to ${fallbackAttempt.transport}`,
            {
              level: "error",
            },
          );
          safeCallProgress(
            onProgress,
            `${firstAttempt.transport} clone failed, retrying with ${fallbackAttempt.transport}: ${fallbackAttempt.url}`,
          );
          if (ownsTemp) await removeDirectoryTreeNoFollow_2(temporaryCachePath);
          try {
            fetchResult = await cacheMarketplaceFromGit(
              fallbackAttempt.url,
              temporaryCachePath,
              storageV5,
              source.path,
              source.ref,
              source.sparsePaths,
              onProgress,
            );
          } catch (httpsErr) {
            logForDebugging(
              `${fallbackAttempt.transport} clone fallback also failed for marketplace ${source.repo}: ${errorMessage(httpsErr)}`,
              {
                level: "error",
              },
            );
            throw mergeBothTransportErrors(
              {
                ...firstAttempt,
                error: toError(err),
              },
              {
                ...fallbackAttempt,
                error: toError(httpsErr),
              },
            );
          }
        }
        ownsTemp = true;
        manifestPath = join(temporaryCachePath, source.path || ".claude-plugin/marketplace.json");
        break;
      }
      case "git": {
        temporaryCachePath = join(cacheDir, tempName);
        ownsTemp = true;
        fetchResult = await cacheMarketplaceFromGit(
          source.url,
          temporaryCachePath,
          storageV5,
          source.path,
          source.ref,
          source.sparsePaths,
          onProgress,
        );
        manifestPath = join(temporaryCachePath, source.path || ".claude-plugin/marketplace.json");
        break;
      }
      case "npm":
        throw Error("NPM marketplace sources not yet implemented");
      case "file": {
        let absPath = resolve_2(getProjectConfigRoot() ?? getOriginalCwd(), source.path);
        manifestPath = absPath;
        temporaryCachePath = dirname(dirname(absPath));
        ownsTemp = false;
        break;
      }
      case "directory": {
        let absPath = resolve_2(getProjectConfigRoot() ?? getOriginalCwd(), source.path);
        manifestPath = join(absPath, ".claude-plugin", "marketplace.json");
        temporaryCachePath = absPath;
        ownsTemp = false;
        break;
      }
      case "settings": {
        temporaryCachePath = join(cacheDir, source.name);
        manifestPath = join(temporaryCachePath, ".claude-plugin", "marketplace.json");
        ownsTemp = false;
        if (!isValidMarketplaceDirName(source.name))
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `Marketplace name ${jsonStringify(source.name)} is not a plain directory name; refusing to cache it`,
            "settings marketplace name is not a plain cache component",
          );
        await assertMarketplaceNameAvailable(cacheDir, source.name, storageV5, {
          known,
          selfKey,
          source,
        });
        let manifestJson = jsonStringify(
          {
            name: source.name,
            owner: source.owner ?? {
              name: "settings",
            },
            plugins: source.plugins,
          },
          null,
          2,
        );
        await fs.mkdir(dirname(manifestPath));
        let storageKey =
          isStorageV5Enabled() && storageV5 !== undefined
            ? marketplaceCacheSpace(source.name, "manifest", getPluginsDirectory())
            : null;
        if (isStorageV5Enabled() && storageV5 !== undefined && storageKey !== null) {
          let writeResult = await storageV5.write(storageKey, manifestJson, {
            publishDiscipline: "inPlace",
          });
          if (!writeResult.ok)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `Failed to write marketplace manifest: ${formatStorageError(writeResult.error)}`,
              "failed to write marketplace manifest (v5 backend error)",
            );
          settingsJson = manifestJson;
          break;
        }
        await writeFile(manifestPath, manifestJson);
        break;
      }
      default:
        throw Error("Unsupported marketplace source type");
    }
    logForDebugging(`Reading marketplace from ${manifestPath}`);
    let localStorageV5 =
      isStorageV5Enabled() && (source.source === "file" || source.source === "directory")
        ? storageV5
        : undefined;
    let storageKey =
      isStorageV5Enabled() &&
      storageV5 !== undefined &&
      (source.source === "github" || source.source === "git")
        ? getMarketplaceStorageKey(manifestPath, getPluginsDirectory())
        : null;
    let marketplace;
    try {
      marketplace =
        parsedMarketplace ??
        (settingsJson !== undefined
          ? parseFileWithSchema(settingsJson, manifestPath, schema)
          : localStorageV5 !== undefined
            ? parseFileWithSchema(await getSteps(localStorageV5, manifestPath), manifestPath, schema)
            : storageV5 !== undefined && storageKey !== null
              ? parseFileWithSchema(
                  await cachedMarketplaceOrThrow(storageV5, storageKey),
                  manifestPath,
                  schema,
                )
              : await readJsonFileWithSchema(manifestPath, schema));
    } catch (e) {
      if (isENOENT(e))
        throw withMarketplaceFailureCode(
          Error(`Marketplace file not found at ${manifestPath}`),
          "manifest_missing",
        );
      throw withMarketplaceFailureCode(
        Error(`Failed to parse marketplace file at ${manifestPath}: ${errorMessage(e)}`),
        e instanceof ConfigParseError ? "manifest_invalid" : undefined,
      );
    }
    let finalCachePath = validateOfficialNameSource(marketplace.name, source);
    if (finalCachePath) throw Error(finalCachePath);
    await onName?.(marketplace.name);
    if (!isValidMarketplaceDirName(marketplace.name))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Marketplace name ${jsonStringify(marketplace.name)} is not a plain directory name; refusing to cache it`,
        "marketplace name is not a plain directory name",
      );
    let finalPath = join(cacheDir, marketplace.name);
    if (temporaryCachePath !== finalPath && !isLocalMarketplaceSource(source))
      await assertMarketplaceNameAvailable(cacheDir, marketplace.name, storageV5, {
        ownEntry: basename(temporaryCachePath),
        known,
        selfKey,
        source,
      });
    else if (source.source === "github")
      await assertMarketplaceNameUsable(cacheDir, marketplace.name, storageV5, {
        known,
        isSelf: sameNfcAs(marketplace.name, selfKey),
        source,
      });
    let resolvedFinal = resolve_2(finalPath);
    let resolvedCacheDir = resolve_2(cacheDir);
    if (!resolvedFinal.startsWith(resolvedCacheDir + sep))
      throw Error(`Marketplace name '${marketplace.name}' resolves to a path outside the cache directory`);
    if (temporaryCachePath !== finalPath && !isLocalMarketplaceSource(source)) {
      let sameFile = false;
      try {
        let [tempStat, finalStat] = await Promise.all([fs.stat(temporaryCachePath), fs.stat(finalPath)]);
        sameFile = tempStat.dev === finalStat.dev && tempStat.ino === finalStat.ino && tempStat.ino !== 0;
      } catch {}
      if (sameFile) {
        temporaryCachePath = finalPath;
        forgetGitRootsUnder(finalPath);
        ownsTemp = false;
      } else
        try {
          if (!refuseNameCollision) {
            try {
              onProgress?.("Cleaning up old marketplace cache\u2026");
            } catch (callbackError) {
              logForDebugging(`Progress callback error: ${errorMessage(callbackError)}`, {
                level: "warn",
              });
            }
            await removeDirectoryTreeNoFollow_2(finalPath);
          }
          if (refuseNameCollision && source.source === "url") {
            await fs.link(temporaryCachePath, finalPath);
            let tempPath = temporaryCachePath;
            await fs.unlink(tempPath).catch((error) => {
              logForDebugging(
                `Failed to remove the linked temp catalog ${tempPath}: ${errorMessage(error)}`,
                {
                  level: "warn",
                },
              );
            });
          } else await fs.rename(temporaryCachePath, finalPath);
          forgetGitRootsUnder(finalPath);
          temporaryCachePath = finalPath;
          ownsTemp = false;
        } catch (error) {
          let errorMsg = errorMessage(error);
          if (refuseNameCollision)
            throw new MarketplaceError(
              `Marketplace ${jsonStringify(marketplace.name)} was not added: this add never replaces what is cached at ${finalPath}, and caching it there failed. If a marketplace of that name is added, remove it first with /plugin marketplace remove ${marketplace.name}; if none is, delete that path and try again.

Technical details: ${errorMsg}`,
              "marketplace add: the no-replace publish failed",
              {
                kind: "stored",
                name: marketplace.name,
                folder: finalPath,
              },
            );
          throw Error(`Failed to finalize marketplace cache. Please manually delete the directory at ${finalPath} if it exists and try again.

Technical details: ${errorMsg}`);
        }
    }
    warnLfsPointers(temporaryCachePath, fetchResult, onProgress);
    return {
      marketplace,
      cachePath: temporaryCachePath,
      keptStaleClone: fetchResult?.kind === "kept-stale",
    };
  } catch (error) {
    if (ownsTemp && temporaryCachePath && !isLocalMarketplaceSource(source))
      try {
        await removeDirectoryTreeNoFollow_2(temporaryCachePath);
      } catch (cleanupError) {
        logForDebugging(
          `Warning: Failed to clean up temporary marketplace cache at ${temporaryCachePath}: ${errorMessage(cleanupError)}`,
          {
            level: "warn",
          },
        );
      }
    throw error;
  }
}
//@ chunk-5xgkngpb.js:4371877-4371990 layout
function buildKnownMarketplaceEntry(source, name) {
  return {
    source,
    installLocation: isLocalMarketplaceSource(source)
      ? source.path
      : join(getResolvedMarketplacesCacheDir(), name),
    lastUpdated: new Date().toISOString(),
  };
}
//@ chunk-5xgkngpb.js:4371990-4372610 layout
function assertMarketplaceNameAddable(name) {
  if (hasClaudeAiReservedPrefix(name))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Cannot add marketplace ${jsonStringify(name)}: names starting with "${CLAUDEAI_MARKETPLACE_PREFIX}" are reserved for marketplaces hosted on claude.ai (claude plugin marketplace add --claudeai <name>).`,
      "marketplace add refused: name uses the reserved claude.ai prefix",
    );
  if (isOfficialMarketplaceSpelling(name)) {
    if (isPluginDirectoryModeOn())
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Cannot add marketplace ${jsonStringify(name)}: the name is reserved for the built-in ${OFFICIAL_MARKETPLACE_DISPLAY}.`,
        "marketplace add refused: name is the built-in plugin directory",
      );
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      reservedNameMessage(name),
      "marketplace add refused: reserved marketplace name",
    );
  }
  let reservedName = lookalikeReservedMarketplaceName(name);
  if (reservedName !== undefined)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      reservedMarketplaceSpellingMessage(name, reservedName),
      "marketplace add refused: reserved marketplace name",
    );
}
//@ chunk-5xgkngpb.js:4372610-4372696 layout
/**
 * 在已知市场表中找来源与给定来源相同的市场名。
 */
function findMarketplaceBySource(marketplaces, source) {
  for (let [key, value] of Object.entries(marketplaces))
    if (isSameMarketplaceSource(value.source, source)) return key;
  return;
}
//@ chunk-5xgkngpb.js:4372696-4372838 layout
/**
 * 同上，找不到时再按“地址键”（忽略 sparsePaths/headers/凭据）宽松比较。
 */
function findMarketplaceBySourceLoose(marketplaces, source) {
  let marketplaceBySource = findMarketplaceBySource(marketplaces, source);
  if (marketplaceBySource !== undefined) return marketplaceBySource;
  let addressKey = sourceAddressKey(source);
  for (let [key, value] of Object.entries(marketplaces))
    if (isSameMarketplaceSource(sourceAddressKey(value.source), addressKey)) return key;
  return;
}
//@ chunk-5xgkngpb.js:4372838-4372881 layout
function isSameMarketplaceSource(source, other) {
  return import_sortedIndex_2(canonicalizeGithubSource(source), canonicalizeGithubSource(other));
}
//@ chunk-5xgkngpb.js:4372881-4373073 layout
function canonicalizeGithubSource(source) {
  if (source.source === "github")
    return {
      ...source,
      repo: normalizeGithubRepoSlug(source.repo) ?? source.repo,
    };
  if (source.source === "git") {
    let repoSlug = normalizeGithubRepoSlug(source.url);
    if (repoSlug !== null) {
      let { url, ...rest } = source;
      return {
        ...rest,
        source: "github",
        repo: repoSlug,
      };
    }
  }
  return source;
}
//@ chunk-5xgkngpb.js:4373073-4373212 layout
function getMarketplaceCandidateFolders(source, name, cacheDir, { cloneFolder }) {
  let knownMarketplaceEntry = buildKnownMarketplaceEntry(source, name);
  if (cloneFolder && source.source === "github")
    knownMarketplaceEntry.installLocation = join(cacheDir, getCachePathForSource(source));
  return marketplaceDirCandidates(
    {
      [name]: knownMarketplaceEntry,
    },
    undefined,
    cacheDir,
  )(name);
}
//@ chunk-5xgkngpb.js:4373212-4373394 layout
function findDeclaredMarketplacesUsingFolders(declaredMarketplaces, candidates, cacheDir) {
  return Object.keys(declaredMarketplaces).filter((key) => {
    let entry = ownPropertyOrUndefined(declaredMarketplaces, key);
    return (
      entry !== undefined &&
      !entry.sourceIsFallback &&
      getMarketplaceCandidateFolders(entry.source, key, cacheDir, {
        cloneFolder: true,
      }).some((folder) => findByMarketplaceName(folder, [key], () => candidates) !== undefined)
    );
  });
}
//@ chunk-5xgkngpb.js:4373394-4373583 layout
function checkDeclaredMarketplaceCollision(name, resolvedSource) {
  let declaredMarketplaces = getDeclaredMarketplaces();
  let entry = ownPropertyOrUndefined(declaredMarketplaces, name);
  if (entry !== undefined) return checkDeclaredNameCollision(name, resolvedSource, name, entry);
  let cacheDir = getResolvedMarketplacesCacheDir();
  for (let otherName of findDeclaredMarketplacesUsingFolders(
    declaredMarketplaces,
    getMarketplaceCandidateFolders(resolvedSource, name, cacheDir, {
      cloneFolder: false,
    }),
    cacheDir,
  )) {
    let otherEntry = ownPropertyOrUndefined(declaredMarketplaces, otherName);
    let collision = otherEntry && checkDeclaredNameCollision(name, resolvedSource, otherName, otherEntry);
    if (collision) return collision;
  }
  return;
}
//@ chunk-5xgkngpb.js:4373583-4374126 layout
function checkCloneFolderCollision(resolvedSource) {
  if (resolvedSource.source !== "github") return;
  let declaredMarketplaces = getDeclaredMarketplaces();
  let resolvedMarketplacesCacheDir = getResolvedMarketplacesCacheDir();
  let cachePathForSource = getCachePathForSource(resolvedSource);
  for (let otherName of findDeclaredMarketplacesUsingFolders(
    declaredMarketplaces,
    [cachePathForSource, `${cachePathForSource}.bak`],
    resolvedMarketplacesCacheDir,
  )) {
    let otherEntry = ownPropertyOrUndefined(declaredMarketplaces, otherName);
    if (
      otherEntry !== undefined &&
      !isSameGithubMarketplace(
        otherName,
        {
          [otherName]: buildKnownMarketplaceEntry(otherEntry.source, otherName),
        },
        resolvedSource,
        undefined,
      )
    )
      return new MarketplaceError(
        `Cannot add this marketplace: it would download into the folder ${jsonStringify(cachePathForSource)}, which the marketplace ${jsonStringify(otherName)} listed under extraKnownMarketplaces in your settings (from ${formatSourceForDisplay(otherEntry.source)}) uses, so it can't be added while that entry is listed.`,
        "marketplace add refused: its clone folder is one a declared marketplace needs",
        {
          kind: "declared",
          name: otherName,
        },
      );
  }
  return;
}
//@ chunk-5xgkngpb.js:4374126-4375019 layout
function checkDeclaredNameCollision(candidateName, candidateSource, declaredName, declaredEntry) {
  if (declaredEntry.sourceIsFallback) return;
  let sameKind = isLocalMarketplaceSource(declaredEntry.source)
    ? isLocalMarketplaceSource(candidateSource)
    : !isLocalMarketplaceSource(candidateSource) &&
      isSourceConsistentWith(candidateSource, declaredEntry.source);
  if (declaredName.normalize("NFC") !== candidateName.normalize("NFC"))
    return sameKind
      ? undefined
      : new MarketplaceError(
          `Cannot add marketplace ${jsonStringify(candidateName)} from this source: your settings list ${jsonStringify(declaredName)} under extraKnownMarketplaces with another source (${formatSourceForDisplay(declaredEntry.source)}), and the two names would clash in the marketplaces folder, so it can't be added while that entry is listed.`,
          "marketplace add refused: settings declare a colliding name with a different source",
          {
            kind: "declared",
            name: declaredName,
          },
        );
  if (sameKind || (declaredName === candidateName && settingsSourceOfMarketplace(declaredName) !== undefined))
    return;
  return new MarketplaceError(
    `Cannot add marketplace ${jsonStringify(candidateName)} from this source: your settings list ${jsonStringify(declaredName)} under extraKnownMarketplaces with another source (${formatSourceForDisplay(declaredEntry.source)}). Add it from that source, or change that entry if it is wrong.`,
    "marketplace add refused: settings declare the name with a different source",
    {
      kind: "declared",
      name: declaredName,
    },
  );
}
//@ chunk-5xgkngpb.js:4375019-4375413 layout
function checkExistingNameDifferentSource(name, existing, resolvedSource) {
  if (existing === undefined || isSameMarketplaceSource(existing.source, resolvedSource)) return;
  return new MarketplaceError(
    `Marketplace ${jsonStringify(name)} is already added from a different source (${formatSourceForDisplay(existing.source)}). To use this source instead, remove that marketplace first with /plugin marketplace remove ${name}.`,
    "marketplace add refused: the name is registered from a different source",
    {
      kind: isSameMarketplaceSource(sourceAddressKey(existing.source), sourceAddressKey(resolvedSource))
        ? "same_address"
        : "name_taken",
      name,
    },
  );
}
//@ chunk-5xgkngpb.js:4375413-4375701 layout
function sourceAddressKey(source) {
  switch (source.source) {
    case "github": {
      let { sparsePaths, skipLfs, ...rest } = source;
      return rest;
    }
    case "git": {
      let { sparsePaths, skipLfs, ...rest } = source;
      return isUnsafeRemoteUrl(source.url)
        ? rest
        : {
            ...rest,
            url: stripUrlUserinfo(source.url),
          };
    }
    case "url": {
      let { headers, headersHelper, ...rest } = source;
      return isUnsafeRemoteUrl(source.url)
        ? rest
        : {
            ...rest,
            url: stripUrlUserinfo(source.url),
          };
    }
    default:
      return source;
  }
}
//@ chunk-5xgkngpb.js:4375701-4375769 layout
function stripUrlUserinfo(url) {
  return url.replace(/^(https?:\/\/)[^/?#\\@]*@/i, "$1");
}
//@ chunk-5xgkngpb.js:4375769-4380334 fingerprint (2.1.88 match: addMarketplaceSource, 0.569)
/**
 * 添加市场（/plugin marketplace add、claude plugin marketplace add）：校验名字与来源、检查与已声明/已存在市场冲突、loadAndCacheMarketplace 下载、写入 known_marketplaces.json。
 */
async function addMarketplaceSource(source, onProgress, storageV5, expectedName, options) {
  let resolvedSource = source;
  if (isLocalMarketplaceSource(source) && !isAbsolute(source.path))
    resolvedSource = {
      ...source,
      path: resolve_2(source.path),
    };
  if (resolvedSource.source === "git") {
    let urlError = pluginGitUrlError(resolvedSource.url);
    if (urlError !== null) throw withMarketplaceFailureCode(urlError, "invalid_source");
  }
  if (!isSourceAllowedByPolicy(resolvedSource)) {
    if (isSourceInBlocklist(resolvedSource))
      throw withMarketplaceFailureCode(
        Error(
          `Marketplace source '${formatSourceForDisplay(resolvedSource)}' is blocked by enterprise policy.`,
        ),
        "source_blocked_by_policy",
      );
    let allowlist = getStrictKnownMarketplaces() || [];
    let hostPatterns = getHostPatternsFromAllowlist();
    let sourceHost = extractHostFromSource(resolvedSource);
    let errorMessage = `Marketplace source '${formatSourceForDisplay(resolvedSource)}'`;
    if (sourceHost) errorMessage += ` (${sourceHost})`;
    errorMessage += " is blocked by enterprise policy.";
    if (allowlist.length > 0)
      errorMessage += ` Allowed sources: ${allowlist.map((entry) => formatSourceForDisplay(entry)).join(", ")}`;
    else errorMessage += " No external marketplaces are allowed.";
    if (resolvedSource.source === "github" && hostPatterns.length > 0)
      errorMessage +=
        `

Tip: The shorthand "${resolvedSource.repo}" assumes github.com. ` +
        `For an internal git host (GitHub Enterprise, GitLab Self-Managed or Dedicated, \u2026), use the full repository URL:
` +
        `  git@your-git-host.com:${resolvedSource.repo}.git`;
    throw withMarketplaceFailureCode(Error(errorMessage), "source_blocked_by_policy");
  }
  if (
    expectedName !== undefined &&
    (isOfficialMarketplaceSpelling(expectedName) ||
      lookalikeReservedMarketplaceName(expectedName) !== undefined)
  )
    assertMarketplaceNameAddable(expectedName);
  let known = await loadKnownMarketplacesWithDeclared(storageV5);
  for (let [existingName, existingEntry] of Object.entries(known))
    if (import_sortedIndex_2(existingEntry.source, resolvedSource)) {
      let declaredCollision = options?.refuseNameCollision
        ? checkDeclaredMarketplaceCollision(existingName, resolvedSource)
        : undefined;
      if (declaredCollision) throw declaredCollision;
      logForDebugging(`Source already materialized as '${existingName}', skipping clone`);
      return {
        name: existingName,
        alreadyMaterialized: true,
        resolvedSource,
      };
    }
  if (options?.refuseNameCollision) {
    let folderCollision = checkCloneFolderCollision(resolvedSource);
    if (folderCollision) throw folderCollision;
  }
  let unusable = describeUnusableMarketplaceSource(
    buildKnownMarketplaceEntry(resolvedSource, "pending-add"),
    findMarketplaceSource(resolvedSource),
  );
  if (unusable !== undefined)
    throw withMarketplaceFailureCode(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Cannot add this marketplace: ${unusable.cause}; ${MARKETPLACE_SOURCE_FIX_HINTS[unusable.kind]}.`,
        "marketplace add refused by the registry admission rule",
      ),
      MARKETPLACE_SOURCE_FAILURE_CODES[unusable.kind],
    );
  let { marketplace, cachePath, keptStaleClone } = await loadAndCacheMarketplace(
    resolvedSource,
    undefined,
    onProgress,
    storageV5,
    expectedName,
    async (name) => {
      let unusable = describeUnusableMarketplaceSource(
        buildKnownMarketplaceEntry(resolvedSource, name),
        settingsSourceOfMarketplace(name),
      );
      if (unusable !== undefined) {
        let message = `Cannot add marketplace ${jsonStringify(name)}: ${unusable.cause}; ${MARKETPLACE_SOURCE_FIX_HINTS[unusable.kind]}.`;
        throw unusable.kind === "declaration"
          ? new MarketplaceError(message, "marketplace add refused by the registry admission rule (named)", {
              kind: "declared",
              name,
            })
          : withMarketplaceFailureCode(
              new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                message,
                "marketplace add refused by the registry admission rule (named)",
              ),
              MARKETPLACE_SOURCE_FAILURE_CODES[unusable.kind],
            );
      }
      assertMarketplaceNameAddable(name);
      if (
        expectedName === undefined &&
        !isValidPluginIdSegment(name) &&
        !Object.hasOwn(known, name) &&
        !admissionKindsFor(known).has(name)
      )
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Cannot add marketplace "${quotedPrintable(name, 64)}": Claude Code cannot install plugins from a marketplace with this name. Each part of a plugin id (plugin@marketplace) may use only the letters a-z and A-Z, digits, ".", "_" and "-", and must start with a letter or digit. The name is set by "name" in the marketplace's marketplace.json; ask its maintainer to change it.`,
          "marketplace add refused: the name cannot form a plugin id",
        );
      if (
        Object.hasOwn(Object.prototype, name) &&
        !Object.hasOwn(known, name) &&
        !admissionKindsFor(known).has(name)
      )
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Cannot add marketplace "${quotedPrintable(name, 64)}": Claude Code reserves this name and cannot register a marketplace under it. The name is set by "name" in the marketplace's marketplace.json; ask its maintainer to change it.`,
          "marketplace add refused: the name is an inherited object member",
        );
      if (options?.refuseNameCollision) {
        let knownMarketplacesWithDeclared = await loadKnownMarketplacesWithDeclared(storageV5);
        let collision = checkExistingNameDifferentSource(
          name,
          (Object.hasOwn(knownMarketplacesWithDeclared, name)
            ? knownMarketplacesWithDeclared[name]
            : undefined) ?? hiddenRegistryEntryFor(name, storageV5),
          resolvedSource,
        );
        if (collision) throw collision;
        let declaredCollision2 = checkDeclaredMarketplaceCollision(name, resolvedSource);
        if (declaredCollision2) throw declaredCollision2;
      }
    },
    known,
    options?.refuseNameCollision,
  );
  let sourceValidationError = validateOfficialNameSource(marketplace.name, resolvedSource);
  if (sourceValidationError) throw Error(sourceValidationError);
  let previousEntry;
  let collision;
  await updateKnownMarketplaces((config) => {
    assertMarketplaceNameAddable(marketplace.name);
    previousEntry = ownPropertyOrUndefined(config, marketplace.name);
    collision = options?.refuseNameCollision
      ? (checkExistingNameDifferentSource(
          marketplace.name,
          previousEntry ?? hiddenRegistryEntryFor(marketplace.name, storageV5),
          resolvedSource,
        ) ?? checkDeclaredMarketplaceCollision(marketplace.name, resolvedSource))
      : undefined;
    if (collision) return null;
    if (previousEntry) {
      let seedDir = seedDirFor(previousEntry.installLocation);
      if (seedDir)
        throw withMarketplaceFailureCode(
          Error(
            `Marketplace '${marketplace.name}' is seed-managed (${seedDir}). To use a different source, ask your admin to update the seed, or use a different marketplace name.`,
          ),
          "managed",
        );
      logForDebugging(
        `Marketplace '${marketplace.name}' exists with different source \u2014 overwriting (was ${formatSourceForDisplay(previousEntry.source)}, now ${formatSourceForDisplay(resolvedSource)})`,
      );
    }
    config[marketplace.name] = {
      source: resolvedSource,
      installLocation: cachePath,
      lastUpdated: keptStaleClone && previousEntry ? previousEntry.lastUpdated : new Date().toISOString(),
    };
    return config;
  }, storageV5);
  if (collision) throw collision;
  if (previousEntry) {
    let previousKey =
      isStorageV5Enabled() && storageV5 !== undefined
        ? getSyntheticMarketplaceStorageKey(
            marketplace.name,
            previousEntry.source,
            previousEntry.installLocation,
          )
        : null;
    let nextKey =
      isStorageV5Enabled() && storageV5 !== undefined
        ? getSyntheticMarketplaceStorageKey(marketplace.name, resolvedSource, cachePath)
        : null;
    let sameLocation = nextKey === null && resolve_2(previousEntry.installLocation) === resolve_2(cachePath);
    if (
      isStorageV5Enabled() &&
      storageV5 !== undefined &&
      previousKey !== null &&
      !import_sortedIndex_2(previousKey, nextKey) &&
      !sameLocation
    ) {
      let deleteResult = await storageV5.delete(previousKey);
      if (!deleteResult.ok)
        logForDebugging(
          `Failed to delete the previous entry's cached marketplace ${marketplace.name} through the storage backend: ${formatStorageError(deleteResult.error)}`,
          {
            level: "warn",
          },
        );
    }
    if (!isLocalMarketplaceSource(previousEntry.source)) {
      let rootPath = getResolvedMarketplacesCacheDir();
      let cacheDir = classifyMarketplacePath(previousEntry.installLocation);
      let absolute = cacheDir.absolute;
      let nextAbsPath = resolve_2(getOriginalCwd(), cachePath);
      let containment = cacheDir.suspect
        ? "outside"
        : comparePathContainment(rootPath, absolute, nextAbsPath);
      if (containment === "same");
      else if (
        containment === "inside" &&
        (await checkMarketplaceDirCollision(rootPath, absolute, marketplace.name, storageV5, known)) ===
          undefined
      )
        await removeDirectoryTreeNoFollow_2(absolute);
      else
        logForDebugging(
          `Skipping cleanup of old installLocation (${previousEntry.installLocation}) \u2014 ` +
            `outside ${rootPath}. The path is corrupted; leaving it alone and overwriting the config entry.`,
          {
            level: "warn",
          },
        );
    }
  }
  getPluginRegistry().marketplaces.delete(marketplace.name);
  logForDebugging(`Added marketplace source: ${marketplace.name}`);
  return previousEntry !== undefined && !isSameMarketplaceSource(previousEntry.source, resolvedSource)
    ? {
        name: marketplace.name,
        alreadyMaterialized: false,
        resolvedSource,
        replacedSource: previousEntry.source,
      }
    : {
        name: marketplace.name,
        alreadyMaterialized: false,
        resolvedSource,
      };
}
//@ chunk-5xgkngpb.js:4380334-4380380 layout
var RESERVED_NAME_REGISTRY_WRITE_FAILED = "reserved_name_registry_write_failed";
//@ chunk-5xgkngpb.js:4380380-4380481 layout
function reservedNameRemovalError(message, cause) {
  let error = new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    message,
    "removing a reserved-name entry failed part-way",
  );
  error.cause = cause;
  return error;
}
//@ chunk-5xgkngpb.js:4380481-4382274 layout
/**
 * 删除市场的外层入口（CLI/界面调用）：名字属于需要成组处理的保留名时，先逐个删除相关条目并汇总结果，再调用 removeMarketplaceSource。
 */
async function removeMarketplaceWithReservedSiblings(
  marketplaceName,
  scope,
  storageV5,
  credentials,
  options,
) {
  if (scope === undefined && isOfficialMarketplaceName_2(marketplaceName)) {
    let filtered = listReservedNameRefusals(await loadKnownMarketplacesWithDeclared(storageV5)).filter(
      ({ name }) => isOfficialMarketplaceName_2(name),
    );
    if (filtered.length > 0) {
      let removedNames = [];
      let removedPluginIds = [];
      let disabledPluginIds = [];
      let disabledReason = "commit_mismatch";
      for (let { name: marketplaceName } of filtered) {
        let outcome = {
          pluginIds: [],
          reason: "commit_mismatch",
          entryDeleted: false,
        };
        let result = await removeMarketplaceSource(
          marketplaceName,
          undefined,
          storageV5,
          credentials,
          removedNames.length > 0,
          true,
          outcome,
        ).catch(async (error) => {
          let remaining = null;
          try {
            remaining = listReservedNameRefusals(await loadKnownMarketplacesWithDeclared(storageV5))
              .map((entry) => entry.name)
              .filter(isOfficialMarketplaceName_2);
          } catch {
            remaining = null;
          }
          if (!(outcome.entryDeleted || (remaining !== null && !remaining.includes(marketplaceName)))) {
            let notice = blockedPluginsNotice(disabledPluginIds, disabledReason, {
              insideFailure: true,
            });
            if (notice === null) throw error;
            throw reservedNameRemovalError(
              `${notice} Another known_marketplaces.json entry, named "${quotedPrintable(marketplaceName)}", could not be removed (${quotedPrintable(errorMessage(error))}). Run this remove again.`,
              error,
            );
          }
          let notice = blockedPluginsNotice(
            [...disabledPluginIds, ...outcome.pluginIds],
            disabledPluginIds.length > 0 ? disabledReason : outcome.reason,
            {
              insideFailure: true,
            },
          );
          let cause =
            error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS &&
            error.errorClass === RESERVED_NAME_REGISTRY_WRITE_FAILED &&
            error.cause !== undefined
              ? error.cause
              : error;
          let hint =
            remaining === null
              ? `Before running this remove again, check known_marketplaces.json: if no entry of this name is left, this remove can turn the ${OFFICIAL_MARKETPLACE_DISPLAY} itself off.`
              : remaining.length > 0
                ? "Another entry of this name is left: run this remove again."
                : `Do not run this remove again: no entry of this name is left, so it can turn the ${OFFICIAL_MARKETPLACE_DISPLAY} itself off.`;
          throw reservedNameRemovalError(
            `${hint} The known_marketplaces.json entry named "${quotedPrintable(marketplaceName)}" is gone, but this remove did not finish. ${notice === null ? "" : `${notice} `}(${quotedPrintable(errorMessage(cause), 2000)})`,
            error,
          );
        });
        if (result.kind !== "ignored-plugin-directory-name-entry-removed" || result.removedNames.length === 0)
          continue;
        if (removedNames.length === 0) {
          disabledPluginIds = result.disabledPluginIds;
          disabledReason = result.disabledReason;
        }
        removedPluginIds.push(...result.removedPluginIds);
        removedNames.push(marketplaceName);
      }
      return {
        kind: "ignored-plugin-directory-name-entry-removed",
        removedNames,
        removedPluginIds,
        disabledPluginIds,
        disabledReason,
      };
    }
    if (options?.onlyIgnoredNameEntries)
      return {
        kind: "ignored-plugin-directory-name-entry-removed",
        removedNames: [],
        removedPluginIds: [],
        disabledPluginIds: [],
        disabledReason: "commit_mismatch",
      };
  }
  return removeMarketplaceSource(marketplaceName, scope, storageV5, credentials, false);
}
//@ chunk-5xgkngpb.js:4382274-4382696 layout
async function probeSettingsFileMayExist(filePath) {
  try {
    let repoSettingsBytes = await readRepoSettingsBytes(filePath);
    switch (repoSettingsBytes.kind) {
      case "refused":
        return {
          mayExist: true,
          refused: repoSettingsBytes.why,
        };
      case "absent":
        return {
          mayExist: false,
          ...(repoSettingsBytes.notAFolder &&
            !repoSettingsBytes.belowALinkToNothing && {
              cannotHoldAFile: true,
            }),
        };
      case "bytes":
        return {
          mayExist:
            Buffer.byteLength(repoSettingsBytes.content) > 1024 || repoSettingsBytes.content.trim() !== "",
        };
    }
  } catch (error) {
    if (isENOENT(error))
      return {
        mayExist: false,
      };
    logForDebugging(
      `Could not read settings file ${filePath} (${errorMessage(error)}); counting it as present`,
    );
    return {
      mayExist: true,
    };
  }
}
//@ chunk-5xgkngpb.js:4382696-4382755 layout
var SETTINGS_FLAG_SOURCE_LABEL = "the --settings flag's";
var ADD_DIR_SOURCE_LABEL = "an added directory's";
//@ chunk-5xgkngpb.js:4382755-4385434 layout
/**
 * 删除市场时把该市场的插件在各可写设置源（userSettings、localSettings、projectSettings）的 enabledPlugins 中关掉；--settings 与 --add-dir 来源无法写时记入 notTurnedOff。
 */
async function disablePluginsInSettings(pluginIds, allPluginIds, storageV5) {
  let turnedOff = new Set();
  let notTurnedOff = new Map();
  let legacyFileIsTheCause = false;
  let legacyPathRefused;
  if (pluginIds.length === 0)
    return {
      turnedOff: [],
      notTurnedOff,
      legacyFileIsTheCause: false,
      unreadSources: [],
      unreadAddDirFiles: [],
      legacyPathRefused: undefined,
      addDirFileBehindALink: false,
    };
  invalidateCommandNames();
  let excluded = allPluginIds.filter((id) => !pluginIds.includes(id));
  let addDirEnabledPlugins = getAddDirEnabledPlugins(SETTINGS_FILE_NAMES);
  let filtered = pluginIds.filter((id) => findEnablingSettingSource(id, excluded) !== undefined);
  for (let source of EDITABLE_SETTING_SOURCES) {
    let turnedOffHere = new Set();
    let turnedOffIds = new Set();
    let passCount = 0;
    let result = await updateSettingsForSourceWithTransform(
      source,
      (settings) => {
        passCount += 1;
        let enabledPlugins = settings?.enabledPlugins;
        let settingSource = [];
        for (let id of pluginIds) {
          let filtered = enabledPluginKeysFor(enabledPlugins, id, excluded).filter((key) =>
            isDependencyAutoInstallState(enabledPlugins?.[key]),
          );
          if (filtered.length > 0) turnedOffHere.add(id);
          for (let key of filtered) turnedOffIds.add(key);
          settingSource.push(
            ...filtered,
            ...(source !== "userSettings"
              ? []
              : [
                  ...(enabledPlugins?.[id] !== false ? [id] : []),
                  ...enabledPluginKeysFor(addDirEnabledPlugins, id, excluded).filter(
                    (key) =>
                      isDependencyAutoInstallState(addDirEnabledPlugins[key]) &&
                      enabledPlugins?.[key] !== false,
                  ),
                ]),
          );
        }
        return settingSource.length > 0 ? getEnabledPluginIdsForScope(settingSource) : null;
      },
      undefined,
      storageV5,
    );
    let settingSource = [...turnedOffIds].filter((id) => enabledPluginSettings(source)?.[id] !== false);
    if (!result.error && source === "localSettings" && settingSource.length > 0)
      result = await updateSettingsForSourceWithTransform(
        source,
        () => getEnabledPluginIdsForScope(settingSource),
        undefined,
        storageV5,
      );
    if (result.error)
      logForDebugging(`Failed to turn plugins off in ${source} settings: ${result.error.message}`, {
        level: "error",
      });
    let legacyPath = source === "localSettings" ? getLegacyLocalSettingsFilePath() : undefined;
    let probe =
      legacyPath !== undefined && passCount < 2 ? await probeSettingsFileMayExist(legacyPath) : undefined;
    if (probe?.refused !== undefined) {
      legacyPathRefused = probe.refused;
      logForDebugging(
        `Did not read the legacy local settings file ${legacyPath}: readScreenedSettingsFile refused it (${probe.refused}); counting it as present`,
      );
    }
    let legacyMayExist = probe?.mayExist === true;
    let legacyUnreadable = legacyPath !== undefined && (result.error !== null || legacyMayExist);
    let legacyIsCause =
      legacyMayExist && passCount === 1 && (result.error === null || turnedOffHere.size === 0);
    let enabledSettings = enabledPluginSettings(source);
    let ignoreFilter = passCount === 0 || legacyUnreadable;
    for (let id of ignoreFilter ? pluginIds : turnedOffHere) {
      if (
        !legacyUnreadable &&
        (!ignoreFilter || enabledSettings?.[id] === false) &&
        hasDisabledEnabledPlugin(enabledSettings, id, excluded)
      ) {
        turnedOff.add(id);
        continue;
      }
      legacyFileIsTheCause ||= legacyIsCause;
      notTurnedOff.set(id, [...(notTurnedOff.get(id) ?? []), settingsSourceName(source)]);
    }
  }
  invalidateCommandNames();
  for (let id of pluginIds) {
    let enablingSettingSource = findEnablingSettingSource(id, excluded);
    if (enablingSettingSource === undefined) {
      if (filtered.includes(id)) turnedOff.add(id);
      continue;
    }
    if (notTurnedOff.has(id)) continue;
    notTurnedOff.set(id, [
      enablingSettingSource === "addDir"
        ? ADD_DIR_SOURCE_LABEL
        : enablingSettingSource === "flagSettings"
          ? SETTINGS_FLAG_SOURCE_LABEL
          : SETTING_SOURCE_TO_SCOPE[enablingSettingSource],
    ]);
  }
  let any = getPolicySettingsLoadErrors().some(isBlockingPolicyLoadError);
  let any_2 = getSettingsParseErrorsForSource("flagSettings").some((error) => error.severity !== "warning");
  let flagUnreadable = false;
  for (let id of pluginIds) {
    let entry = notTurnedOff.has(id) ? undefined : await sourceEnablementEntry("flagSettings", id, excluded);
    if (entry?.readsBack === "on") notTurnedOff.set(id, [SETTINGS_FLAG_SOURCE_LABEL]);
    else if (entry !== undefined) flagUnreadable = true;
  }
  let addDirFiles = (
    await Promise.all(
      getAdditionalDirectoriesForClaudeMd()
        .flatMap((dir) => SETTINGS_FILE_NAMES.map((fileName) => join(dir, ".claude", fileName)))
        .map(async (filePath) => {
          let { settings, errors } = parseSettingsFile(filePath);
          if (settings !== null || !errors.some((error) => error.severity !== "warning")) return [];
          let probe = await probeSettingsFileMayExist(filePath);
          if (probe.refused !== undefined)
            logForDebugging(
              `Did not read the added directory's settings file ${filePath}: readScreenedSettingsFile refused it (${probe.refused}); counting it as present`,
            );
          return probe.cannotHoldAFile &&
            errors.some((error) => error.errorClass === "unreadable" && error.errno === "ENOTDIR")
            ? []
            : [
                {
                  file: filePath,
                  behindALink: probe.refused === "vet-network",
                },
              ];
        }),
    )
  ).flat();
  let mapped = addDirFiles.map((item) => item.file);
  let unreadSources = [
    ...(any ? ["managed"] : []),
    ...(any_2 || flagUnreadable ? ["flag"] : []),
    ...(mapped.length > 0 ? ["addDir"] : []),
  ];
  return {
    turnedOff: [...turnedOff].filter((id) => !notTurnedOff.has(id)),
    notTurnedOff,
    legacyFileIsTheCause,
    unreadSources,
    unreadAddDirFiles: mapped,
    legacyPathRefused,
    addDirFileBehindALink: addDirFiles.some((item) => item.behindALink),
  };
}
//@ chunk-5xgkngpb.js:4385434-4396149 callgraph-fingerprint (2.1.88 match: removeMarketplaceSource, 0.202)
/**
 * 删除市场：从 known_marketplaces.json 与 settings 的 extraKnownMarketplaces 中移除，关掉其插件、删除缓存目录与安装记录，处理托管/保留名等特殊情况。
 */
async function removeMarketplaceSource(
  marketplaceName,
  scope,
  storageV5,
  credentials,
  onlyIgnored,
  onlyIgnoredNameEntries = false,
  sharedOutcome,
) {
  let config = await loadKnownMarketplacesWithDeclared(storageV5);
  let targetName =
    marketplaceName !== OFFICIAL_MARKETPLACE_NAME &&
    isOfficialMarketplaceName_2(marketplaceName) &&
    !Object.hasOwn(config, marketplaceName) &&
    hiddenRegistryEntryFor(marketplaceName, storageV5) === undefined
      ? OFFICIAL_MARKETPLACE_NAME
      : marketplaceName;
  let officialSourced =
    targetName === OFFICIAL_MARKETPLACE_NAME && isOfficialMarketplaceSourced(config) ? true : false;
  let ignoredNameEntry =
    isOfficialMarketplaceSpelling(targetName) && admissionKindsFor(config).get(targetName) === "source"
      ? true
      : false;
  if (onlyIgnoredNameEntries && !ignoredNameEntry)
    return {
      kind: "ignored-plugin-directory-name-entry-removed",
      removedNames: [],
      removedPluginIds: [],
      disabledPluginIds: [],
      disabledReason: "commit_mismatch",
    };
  let entry = !officialSourced && Object.hasOwn(config, targetName) ? config[targetName] : undefined;
  let hiddenEntry = entry !== undefined ? undefined : hiddenRegistryEntryFor(targetName, storageV5);
  let known = entry ?? hiddenEntry;
  if (known === undefined) {
    if (
      targetName === OFFICIAL_MARKETPLACE_NAME &&
      scope === undefined &&
      (await getPluginDirectoryState()) === "off"
    ) {
      await persistPluginDirectoryChoice(false);
      return {
        kind: "plugin-directory-built-in",
      };
    }
    throw withMarketplaceFailureCode(Error(`Marketplace '${targetName}' not found`), "not_configured");
  }
  let isDirectorySource = isPluginDirectorySource(known.source) ? true : false;
  if (isDirectorySource && scope !== undefined) {
    let settingsForSourceForUpkeep = getSettingsForSourceForUpkeep(scope);
    let mapped = listReservedNameRefusals(config)
      .filter(
        (refusal) =>
          isOfficialMarketplaceName_2(refusal.name) &&
          getMarketplaceDeclaringSource(settingsForSourceForUpkeep, refusal.name),
      )
      .map(
        (refusal) =>
          ` An ignored entry named "${refusal.name}" is declared there: claude plugin marketplace remove ${refusal.name} --scope ${settingsSourceName(scope)}`,
      );
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${OFFICIAL_MARKETPLACE_DISPLAY} is built in and not declared in any settings scope. Omit --scope to turn it off.${mapped.join("")}`,
      "plugin directory marketplace remove with --scope",
    );
  }
  let seedDir = isClaudeAiMarketplaceSource(known.source);
  if (seedDir && scope !== undefined)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Marketplace '${targetName}' is hosted on claude.ai and not declared in any settings scope. Omit --scope to remove it.`,
      "claude.ai marketplace remove with --scope",
    );
  let seedDirPath = seedDir || isDirectorySource ? undefined : seedDirFor(known.installLocation);
  let disableHint = isSafeCliArg(targetName)
    ? ` To stop using its plugins: claude plugin disable <plugin>@${targetName}`
    : " To stop using its plugins, disable each one in /plugin.";
  if (seedDirPath && scope === undefined)
    throw withMarketplaceFailureCode(
      Error(
        `Marketplace '${targetName}' is registered from the read-only seed directory (${seedDirPath}) and will be re-registered on next startup.${disableHint}`,
      ),
      "managed",
    );
  let declaredElsewhere = false;
  if (scope !== undefined) {
    if (!getMarketplaceDeclaringSource(getSettingsForSourceForUpkeep(scope), targetName)) {
      let extraHint = seedDirPath
        ? `It is registered from the read-only seed directory.${disableHint}`
        : "Omit --scope to remove it from all scopes.";
      throw withMarketplaceFailureCode(
        Error(
          `Marketplace '${targetName}' is not declared in ${settingsSourceName(scope)} settings. ${extraHint}`,
        ),
        "not_configured",
      );
    }
    declaredElsewhere =
      Boolean(seedDirPath) ||
      EDITABLE_SETTING_SOURCES.some(
        (source) =>
          source !== scope &&
          getMarketplaceDeclaringSource(getSettingsForSourceForUpkeep(source), targetName),
      ) ||
      Boolean(getMarketplaceDeclaringSource(getSettingsForSource("policySettings"), targetName));
  }
  let disabledPluginIds = [];
  let disabledReason = "commit_mismatch";
  if (ignoredNameEntry && !onlyIgnored && !declaredElsewhere) {
    let pluginDirectoryMarketplace = await loadPluginDirectoryMarketplaceCached({
      ignoreToggle: true,
      storageV5,
    });
    if (pluginDirectoryMarketplace === null) disabledReason = "catalog_unreadable";
    let installedPlugins = await loadInstalledPlugins(storageV5);
    if (hasFailedInstalledPluginsRead(installedPlugins)) {
      let installedListRefusal = await getInstalledListRefusal(storageV5);
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `The list of installed plugins (installed_plugins.json) could not be read or is not a valid list, so this remove cannot tell which plugins to turn off. Nothing was deleted, and the known_marketplaces.json entry named "${quotedPrintable(targetName)}" was left in place: repair or restore installed_plugins.json, then run this remove again.${installedListRefusal === undefined ? "" : ` ${readInstalledPluginsFile(installedListRefusal)}`}`,
        "removing a reserved-name entry was held back: the installed plugins could not be read",
      );
    }
    let plugins = installedPlugins.plugins;
    let mapped = Object.entries(plugins)
      .filter(([key, value]) => {
        let { name, marketplace } = parsePluginIdentifier(key);
        if (marketplace !== OFFICIAL_MARKETPLACE_NAME) return false;
        let pinnedShaValue = pinnedSha(
          key,
          pluginDirectoryMarketplace?.marketplace.plugins.find((plugin) => plugin.name === name)?.source,
        );
        return (
          pinnedShaValue === undefined ||
          value.some((installation) => installation.gitCommitSha !== pinnedShaValue)
        );
      })
      .map(([key]) => key);
    let {
      turnedOff,
      notTurnedOff,
      legacyFileIsTheCause,
      unreadSources,
      unreadAddDirFiles,
      legacyPathRefused,
      addDirFileBehindALink,
    } = await disablePluginsInSettings(mapped, Object.keys(plugins), storageV5);
    if (notTurnedOff.size > 0 || unreadSources.length > 0) {
      let scopes = [...notTurnedOff.values()].flat();
      let joined = [
        scopes.some(
          (scope) => ["user", "project"].includes(scope) || (scope === "local" && !legacyFileIsTheCause),
        )
          ? "Turn each off with: claude plugin disable <id> --scope <scope>, or repair that scope's settings file."
          : "",
        legacyFileIsTheCause
          ? legacyPathRefused === "vet-network"
            ? "A link on the path of the legacy local settings file (.claude/settings.local.json in the folder Claude Code was started in) leads to another machine, so the file was not read: replace that link with a real folder or file, or remove the link. No command can turn off a plugin that file enables."
            : legacyPathRefused === "suspect-link" || legacyPathRefused === "crossing"
              ? "The legacy local settings file (.claude/settings.local.json in the folder Claude Code was started in) was not read: a link on its path leads, or may lead, to another machine or could not be followed to its end, or a folder on it could not be checked. Replace such a link with a real folder or file, make each folder on that path readable, then run this remove again."
              : legacyPathRefused === "unbound"
                ? "The legacy local settings file (.claude/settings.local.json in the folder Claude Code was started in) was not read: it, or a folder on its path, changed or was removed while this command was reading it, or this command could not follow that path all the way to the file. Run this remove again. If this message comes back, make each folder on that path readable and replace any link on it with a real folder or file, then run this remove again."
                : legacyPathRefused !== undefined
                  ? "The path of the legacy local settings file (.claude/settings.local.json in the folder Claude Code was started in) could not be checked for links to another machine, so the file was not read: make each folder on that path readable, and replace any link on it with a real folder or file. No command can turn off a plugin that file enables."
                  : "Repair or delete the legacy local settings file (.claude/settings.local.json in the folder Claude Code was started in): it could not be read as settings, and no command can turn off a plugin that file enables."
          : "",
        scopes.includes("managed")
          ? "Your organization's managed settings turn a plugin named here on, and this command cannot change them: ask your administrator to take that plugin out of managed settings."
          : "",
        scopes.includes(SETTINGS_FLAG_SOURCE_LABEL)
          ? "The --settings given to this session turn a plugin named here on, and this command cannot change them: take that plugin out of --settings, or start Claude Code without it."
          : "",
        scopes.includes(ADD_DIR_SOURCE_LABEL)
          ? "An added directory's settings (--add-dir) turn a plugin named here on, and user settings did not overrule them: check that user settings can be written and that this session reads them, or start Claude Code without that directory."
          : "",
      ]
        .filter((hint) => hint !== "")
        .join(" ");
      let joined_2 = [...notTurnedOff]
        .map(([pluginId, scopes]) => `${quotedPrintable(pluginId)} in ${scopes.join(" and ")} settings`)
        .join("; ");
      if (unreadSources.length > 0) {
        let joined_3 = [
          unreadSources.includes("managed")
            ? "Your organization's managed settings could not be read in full, so a plugin they turn on cannot be seen, and this command cannot change them: ask your administrator to mend them, then run this remove again."
            : "",
          unreadSources.includes("flag")
            ? "The settings given to this session with --settings, or by the application that started it, could not be read as settings, so a plugin they turn on cannot be seen: mend them and start Claude Code again, or start it without them, then run this remove again."
            : "",
          unreadSources.includes("addDir")
            ? `A settings file of an added directory (--add-dir) could not be read, so a plugin it turns on cannot be seen: mend ${unreadAddDirFiles.map((unreadAddDirFile) => printableOrEmpty(unreadAddDirFile)).join(" and ")}${addDirFileBehindALink ? " (where a link on the way to such a file leads to another machine, replace that link with a real folder or file)" : ""}, or start Claude Code without ${new Set(unreadAddDirFiles.map((unreadAddDirFile) => dirname(dirname(unreadAddDirFile)))).size === 1 ? "that directory" : "those directories"}, then run this remove again.`
            : "",
        ]
          .filter((hint) => hint !== "")
          .join(" ");
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `${joined_3} Nothing was deleted, and the known_marketplaces.json entry named "${quotedPrintable(targetName)}" was left in place: those settings may turn ${formatPluginNameList(
            mapped,
            {
              disabledNote: false,
            },
          )} on again, ${disabledReason === "catalog_unreadable" ? "not checked against" : "not at"} the commit the ${OFFICIAL_MARKETPLACE_DISPLAY} lists.${notTurnedOff.size > 0 ? ` May still be on: ${joined_2}. ${joined}` : " No settings that could be read switch them on now."}`,
          "removing a reserved-name entry was held back by settings that could not be read",
        );
      }
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${turnedOff.length > 0 ? `Turned off ${formatPluginNameList(turnedOff)}. ` : ""}Could not turn off ${joined_2}: ${disabledReason === "catalog_unreadable" ? "not checked against" : "not at"} the commit the ${OFFICIAL_MARKETPLACE_DISPLAY} lists, and may still be enabled. The known_marketplaces.json entry named "${quotedPrintable(targetName)}" was left in place: run this remove again once each plugin named here is off. ${joined}`,
        "removing a reserved-name entry could not turn plugins off",
      );
    }
    disabledPluginIds = turnedOff;
    if (sharedOutcome !== undefined) {
      sharedOutcome.pluginIds = turnedOff;
      sharedOutcome.reason = disabledReason;
    }
  }
  if (isClaudeAiMarketplaceSource(known.source)) {
    await removeClaudeAiMarketplace(targetName, known.source, credentials);
    getPluginRegistry().marketplaces.delete(targetName);
  } else if (isDirectorySource) {
    let fs = pluginDirectoryModuleIfUsable();
    if (!fs)
      return {
        kind: "plugin-directory-built-in",
      };
    await fs.setPluginDirectoryMarketplaceEnabled(false);
    getPluginRegistry().marketplaces.delete(targetName);
    logForDebugging(`Turned the built-in marketplace '${targetName}' off`);
    return {
      kind: "plugin-directory-built-in",
    };
  } else if (!declaredElsewhere) {
    let released = false;
    if (hiddenEntry !== undefined) {
      releaseRegistryEntry(targetName, storageV5);
      released = true;
    }
    try {
      await updateKnownMarketplaces((config) => {
        if (!Object.hasOwn(config, targetName)) {
          if (hiddenRegistryEntryFor(targetName, storageV5) === undefined && !released) return null;
          if (!released) {
            releaseRegistryEntry(targetName, storageV5);
            released = true;
          }
        }
        delete config[targetName];
        return config;
      }, storageV5);
    } catch (error) {
      let blockedNotice = blockedPluginsNotice(disabledPluginIds, disabledReason, {
        insideFailure: true,
      });
      if (blockedNotice === null) throw error;
      let failureError = new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${blockedNotice} The known_marketplaces.json entry named "${quotedPrintable(targetName)}" could not be removed (${quotedPrintable(errorMessage(error))}). Run this remove again.`,
        "removing a reserved-name entry failed after plugins were turned off",
        RESERVED_NAME_REGISTRY_WRITE_FAILED,
      );
      failureError.cause = error;
      throw failureError;
    } finally {
      if (released) {
        releasedRegistryEntries()[getStorageArm(storageV5)].delete(targetName);
        clearMarketplaceAdmissionVerdicts();
      }
    }
    if (sharedOutcome !== undefined) sharedOutcome.entryDeleted = true;
    getPluginRegistry().marketplaces.delete(targetName);
    let storageKey =
      isStorageV5Enabled() && storageV5 !== undefined
        ? getSyntheticMarketplaceStorageKey(targetName, known.source, known.installLocation)
        : null;
    if (storageV5 !== undefined && storageKey !== null) {
      let deleteResult = await storageV5.delete(storageKey);
      if (!deleteResult.ok)
        logForDebugging(
          `Failed to delete cached marketplace ${targetName} through the storage backend: ${formatStorageError(deleteResult.error)}`,
          {
            level: "warn",
          },
        );
    }
    let knownMarketplacesWithDeclared = await loadKnownMarketplacesWithDeclared(storageV5);
    let names = listMarketplaceNames(knownMarketplacesWithDeclared, storageV5).filter(
      (name) => name !== targetName,
    );
    await removeMarketplaceCacheFiles(
      targetName,
      names,
      marketplaceDirCandidates(knownMarketplacesWithDeclared, storageV5, getResolvedMarketplacesCacheDir()),
    ).catch((error) => {
      logForDebugging(
        `Left the cache files of removed marketplace ${jsonStringify(targetName)} in place: ${errorMessage(error)}`,
        {
          level: "warn",
        },
      );
    });
  }
  let alsoClearEnabledPlugins = !declaredElsewhere && !officialSourced;
  for (let source of EDITABLE_SETTING_SOURCES) {
    let currentScope = scope === undefined || source === scope;
    if (!currentScope && !alsoClearEnabledPlugins) continue;
    let hasChanges = false;
    let updateResult = await updateSettingsForSourceWithTransform(
      source,
      (settings) => {
        if (!settings) return null;
        let changed = false;
        let updates = {};
        let keepAutoUpdate =
          officialSourced &&
          scope === undefined &&
          source === "userSettings" &&
          getMarketplaceDeclaringSource(settings, targetName)?.autoUpdate !== undefined;
        if (currentScope && getMarketplaceDeclaringSource(settings, targetName) && !keepAutoUpdate) {
          let updatedMarketplaces = {
            ...settings.extraKnownMarketplaces,
          };
          updatedMarketplaces[targetName] = undefined;
          updates.extraKnownMarketplaces = updatedMarketplaces;
          changed = true;
        }
        if (alsoClearEnabledPlugins && settings.enabledPlugins) {
          let marketplaceSuffix = `@${targetName}`;
          let updatedPlugins = {
            ...settings.enabledPlugins,
          };
          let clearedAny = false;
          for (let pluginId in updatedPlugins)
            if (pluginId.endsWith(marketplaceSuffix)) {
              updatedPlugins[pluginId] = undefined;
              clearedAny = true;
            }
          if (clearedAny) {
            updates.enabledPlugins = updatedPlugins;
            changed = true;
          }
        }
        if (!changed) return null;
        hasChanges = true;
        return updates;
      },
      undefined,
      storageV5,
    );
    if (updateResult.error)
      logForDebugging(
        `Failed to clean up marketplace '${targetName}' from ${source} settings: ${updateResult.error.message}`,
        {
          level: "error",
        },
      );
    else if (hasChanges) logForDebugging(`Cleaned up marketplace '${targetName}' from ${source} settings`);
  }
  if (declaredElsewhere) {
    logForDebugging(
      `Removed marketplace '${targetName}' declaration from ${scope}; still declared in another scope, keeping state layer and installed plugins`,
    );
    return {
      kind: "removed",
      removedPluginIds: [],
    };
  }
  if (officialSourced) {
    logForDebugging(
      `Removed the ignored registry entry named '${targetName}'; turned off ${disabledPluginIds.length} plugin(s) (${disabledReason})`,
    );
    return {
      kind: "ignored-plugin-directory-name-entry-removed",
      removedNames: [targetName],
      removedPluginIds: [],
      disabledPluginIds,
      disabledReason,
    };
  }
  let { orphanedPaths, removedPluginIds, sharedDataDirPluginIds, installPathsStillInUse } =
    await removeAllPluginsForMarketplace(targetName, storageV5);
  let inUsePaths = new Set();
  if (ignoredNameEntry && targetName !== OFFICIAL_MARKETPLACE_NAME)
    for (let installPath of installPathsStillInUse) {
      let normalizedPath = normalizeMarketplaceInputPath(installPath);
      if (normalizedPath !== undefined) inUsePaths.add(normalizedPath);
    }
  for (let installPath of orphanedPaths) {
    let normalizedOrphanPath = inUsePaths.size > 0 ? normalizeMarketplaceInputPath(installPath) : undefined;
    if (normalizedOrphanPath !== undefined && inUsePaths.has(normalizedOrphanPath)) continue;
    await markPluginVersionOrphaned(installPath, storageV5);
  }
  let installedIds = listInstalledPluginIds(getInstalledPlugins());
  for (let pluginId of removedPluginIds)
    await planUninstallCleanup(pluginId, {
      deleteDataDir: !sharedDataDirPluginIds.includes(pluginId),
      installedIds,
      storageV5,
      credentials,
    });
  removePluginUsage(removedPluginIds, storageV5);
  logForDebugging(`Removed marketplace source: ${targetName}`);
  if (ignoredNameEntry)
    return {
      kind: "ignored-plugin-directory-name-entry-removed",
      removedNames: [targetName],
      removedPluginIds,
      disabledPluginIds,
      disabledReason,
    };
  return {
    kind: "removed",
    removedPluginIds,
  };
}
//@ chunk-5xgkngpb.js:4396149-4396201 placement
/**
 * reservedMarketplaceSpellingMessage：保留市场名的拒绝说明。
 */
function reservedMarketplaceSpellingMessage(name, reservedName) {
  return PLUGIN_DIRECTORY_MARKETPLACE_NAMES.has(reservedName)
    ? reservedNameMessage(name)
    : formatReservedSpellingMessage(name, reservedName);
}
//@ chunk-5xgkngpb.js:4396201-4396291 placement
/**
 * lookalikeReservedMarketplaceName：与保留名形似的市场名。
 */
function lookalikeReservedMarketplaceName(name) {
  for (let reservedName of RESERVED_MARKETPLACE_NAMES)
    if (
      reservedName !== OFFICIAL_MARKETPLACE_NAME &&
      name.toLowerCase() !== reservedName &&
      isFoldedSpellingOf(name, reservedName)
    )
      return reservedName;
  return;
}
//@ chunk-5xgkngpb.js:4396291-4396714 placement
/**
 * 校验注册表条目对保留市场名的使用：官方名只允许 pluginDirectory 源；其他保留名需种子目录或官方来源；源格式错误时返回说明。
 */
function validateReservedMarketplaceEntry(marketplaceName, entry) {
  if (marketplaceName === OFFICIAL_MARKETPLACE_NAME)
    return entry.source?.source === "pluginDirectory"
      ? null
      : reservedMarketplaceEntryMessage(marketplaceName, isPluginDirectoryModeOn());
  let nameMessage = reservedMarketplaceNameMessage(marketplaceName);
  if (nameMessage !== undefined) return nameMessage;
  if (!RESERVED_MARKETPLACE_NAMES.has(marketplaceName.toLowerCase())) return null;
  if (typeof entry.installLocation === "string" && seedDirFor(entry.installLocation)) return null;
  let source = entry.source;
  if (typeof source !== "object" || source === null)
    return `The name '${marketplaceName}' is reserved for official Anthropic marketplaces and its registered source is malformed.`;
  return validateOfficialNameSource(marketplaceName, entry.source);
}
//@ chunk-5xgkngpb.js:4396714-4396753 placement
/**
 * isImpersonatingOfficialMarketplace：是否在冒充官方市场名。
 */
function isImpersonatingOfficialMarketplace(marketplaceName, entry) {
  return impersonationCheckDisabled() && isImpersonatingOfficialName(marketplaceName);
}
//@ chunk-5xgkngpb.js:4396753-4396974 placement
function assertNotLookAlikeName(marketplaceName, entry) {
  if (!isImpersonatingOfficialMarketplace(marketplaceName, entry)) return;
  if (isAsciiImpersonatingOfficialName(marketplaceName))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      reservedNameMessage_2(entry.source.source === "settings"),
      "Marketplace name refused by the look-alike check",
    );
  throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    marketplaceLoadFailedMessage(marketplaceName, IMPERSONATION_ERROR_MESSAGE),
    "Marketplace name refused by the look-alike check",
  );
}
//@ chunk-5xgkngpb.js:4396974-4397405 placement
/**
 * 保留名被不受信来源注册时抛错。
 */
function assertReservedNameTrusted(marketplaceName, entry) {
  let refusal = validateReservedMarketplaceEntry(marketplaceName, entry);
  let isOfficialSpelling = isOfficialMarketplaceSpelling(marketplaceName);
  if (refusal && (isOfficialSpelling || lookalikeReservedMarketplaceName(marketplaceName) !== undefined)) {
    if (isOfficialSpelling)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        refusal,
        "Plugin directory name held by another registry entry",
      );
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      refusal,
      "Reserved marketplace name held by a registry entry",
    );
  }
  if (refusal)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Marketplace "${marketplaceName}" is registered from an untrusted source: ${refusal} To fix it, remove the marketplace and re-add it from the official source.`,
      "Reserved marketplace name registered from untrusted source",
    );
}
//@ chunk-5xgkngpb.js:4397405-4398014 placement
async function readCachedMarketplace(storage, key, { folderAsEisdir = false } = {}) {
  let readResult = await storage.read([key]);
  if (!readResult.ok) {
    if (folderAsEisdir && isNonRegularFailure(readResult.error))
      throw Object.assign(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `EISDIR: not a regular file (${formatStorageError(readResult.error)})`,
          "cached marketplace folder is not a regular file (v5)",
        ),
        {
          code: "EISDIR",
        },
      );
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Failed to read cached marketplace: ${formatStorageError(readResult.error)}`,
      "failed to read cached marketplace (v5 backend error)",
    );
  }
  let item = readResult.value.items[0];
  if (item === undefined)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "Failed to read cached marketplace: the backend returned no item for the key",
      "failed to read cached marketplace (v5 backend error)",
    );
  return item.found ? Buffer.from(item.value).toString("utf-8") : null;
}
//@ chunk-5xgkngpb.js:4398114-4398215 sole-consumer
function catalogNotCachedError() {
  return Object.assign(Error("ENOENT: marketplace catalog not cached"), {
    code: "ENOENT",
  });
}
//@ chunk-5xgkngpb.js:4398215-4398293 sole-consumer
async function cachedMarketplaceOrThrow(storageV5, key) {
  let cachedMarketplace = await readCachedMarketplace(storageV5, key);
  if (cachedMarketplace === null) throw catalogNotCachedError();
  return cachedMarketplace;
}
//@ chunk-5xgkngpb.js:4398293-4398331 sole-consumer
function marketplaceNameUnlessCowork(name) {
  return isUsingCoworkPlugins() ? undefined : name;
}
//@ chunk-5xgkngpb.js:4398331-4398386 sole-consumer
function isLookalikeUnblockedMarketplace(name) {
  let normalizedName = marketplaceNameUnlessCowork(name);
  return normalizedName !== undefined && isLookalikeButNotBlockedName(normalizedName);
}
//@ chunk-5xgkngpb.js:4398386-4399459 sole-consumer
/**
 * 读取已缓存市场的 marketplace.json：v5 存储下按 hostFolder、manifest 或 catalog 键读取；否则读本地文件， .claude-plugin/marketplace.json 不存在时退回把位置本身当作文件。按来源选 schema 校验。
 */
async function readMarketplaceManifest(location, source, storage, storageLocation = null) {
  let manifestPath = join(location, ".claude-plugin", "marketplace.json");
  let key = storageLocation?.kind === "key" ? storageLocation.key : null;
  let schema = getPluginMarketplaceSchemaFor(marketplaceNameUnlessCowork(source));
  if (isStorageV5Enabled() && storage !== undefined && storageLocation?.kind === "hostFolder") {
    let localFile;
    try {
      localFile = await readLocalMarketplaceFile(storage, storageLocation.space, manifestPath);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR")
        localFile = {
          absent: errnoCode,
        };
      else throw error;
    }
    if ("text" in localFile) return parseFileWithSchema(localFile.text, manifestPath, schema);
    let localMarketplaceFile = await readLocalMarketplaceFile(storage, storageLocation.space, location);
    if ("text" in localMarketplaceFile)
      return parseFileWithSchema(localMarketplaceFile.text, location, schema);
    throw enoentError(location);
  }
  if (
    isStorageV5Enabled() &&
    storage !== undefined &&
    key?.namespace === "marketplaceCache" &&
    key.form === "manifest"
  ) {
    let cachedMarketplace = await readCachedMarketplace(storage, key);
    if (cachedMarketplace !== null) return parseFileWithSchema(cachedMarketplace, manifestPath, schema);
  } else if (
    isStorageV5Enabled() &&
    storage !== undefined &&
    key?.namespace === "marketplaceCache" &&
    "relPath" in key
  ) {
    let cachedMarketplace = await readCachedMarketplace(storage, key);
    if (cachedMarketplace !== null) return parseFileWithSchema(cachedMarketplace, manifestPath, schema);
    let cachedMarketplace_2 = await readCachedMarketplace(
      storage,
      STORAGE_SPACES.marketplaceCache(key.marketplace, "catalog"),
      {
        folderAsEisdir: true,
      },
    );
    if (cachedMarketplace_2 === null) throw catalogNotCachedError();
    return parseFileWithSchema(cachedMarketplace_2, location, schema);
  } else if (!isDiskless())
    try {
      return await readJsonFileWithSchema(manifestPath, schema);
    } catch (error) {
      if (error instanceof ConfigParseError) throw error;
      let errnoCode = getErrnoCode(error);
      if (errnoCode !== "ENOENT" && errnoCode !== "ENOTDIR") throw error;
    }
  if (
    isStorageV5Enabled() &&
    storage !== undefined &&
    key?.namespace === "marketplaceCache" &&
    key.form === "catalog"
  ) {
    let cachedMarketplace = await readCachedMarketplace(storage, key);
    if (cachedMarketplace === null) throw catalogNotCachedError();
    return parseFileWithSchema(cachedMarketplace, location, schema);
  }
  if (isDiskless()) throw catalogNotCachedError();
  return await readJsonFileWithSchema(location, schema);
}
//@ chunk-5xgkngpb.js:4399459-4400351 fingerprint (2.1.88 match: getMarketplaceCacheOnly, 0.629)
/**
 * 只读缓存取市场目录（不联网）；用于加载插件、提示与推荐。
 */
async function getMarketplaceCacheOnly(marketplaceName, storageV5, options) {
  if (marketplaceName.toLowerCase() === pluginManifestPathSchemas) return null;
  let unreadableCatalogs = options?.unreadableCatalogs;
  if (options?.registryEntry)
    return loadCachedMarketplace(
      storageV5,
      marketplaceName,
      options.registryEntry,
      options.registryEntryIsSaved ? marketplaceName : undefined,
      unreadableCatalogs,
    );
  let fs = getFsImplementation();
  let scope = isStorageV5Enabled() && storageV5 !== undefined ? getMarketplacesStorageScope() : null;
  if (storageV5 !== undefined && scope !== null) {
    let readResult = await storageV5.read([scope]);
    if (!readResult.ok) {
      logForDebugging(
        `Failed to read cached marketplace ${marketplaceName}: ${formatStorageError(readResult.error)}`,
        {
          level: "warn",
        },
      );
      return null;
    }
    let item = readResult.value.items[0];
    if (!item?.found) return loadDeclaredMarketplace(storageV5, marketplaceName, unreadableCatalogs);
    let entry;
    try {
      let config = jsonParse(Buffer.from(item.value).toString("utf-8"));
      entry = getAdmittedMarketplaceEntry(marketplaceName, config);
    } catch (error) {
      logForDebugging(`Failed to read cached marketplace ${marketplaceName}: ${errorMessage(error)}`, {
        level: "warn",
      });
      return null;
    }
    return entry
      ? await loadCachedMarketplace(storageV5, marketplaceName, entry, marketplaceName, unreadableCatalogs)
      : await loadDeclaredMarketplace(storageV5, marketplaceName, unreadableCatalogs);
  }
  if (isDiskless()) return loadDeclaredMarketplace(storageV5, marketplaceName, unreadableCatalogs);
  let configFile = getKnownMarketplacesPath();
  let entry;
  try {
    let content = await fs.readFile(configFile, {
      encoding: "utf-8",
    });
    let config = jsonParse(content);
    entry = getAdmittedMarketplaceEntry(marketplaceName, config);
  } catch (error) {
    if (isENOENT(error)) return loadDeclaredMarketplace(storageV5, marketplaceName, unreadableCatalogs);
    logForDebugging(`Failed to read cached marketplace ${marketplaceName}: ${errorMessage(error)}`, {
      level: "warn",
    });
    return null;
  }
  return entry
    ? await loadCachedMarketplace(storageV5, marketplaceName, entry, marketplaceName, unreadableCatalogs)
    : await loadDeclaredMarketplace(storageV5, marketplaceName, unreadableCatalogs);
}
//@ chunk-5xgkngpb.js:4400351-4400513 layout
async function loadDeclaredMarketplace(storageV5, marketplaceName, unreadableCatalogs) {
  if (marketplaceName === OFFICIAL_MARKETPLACE_NAME)
    return (
      (
        await loadPluginDirectoryMarketplaceCached({
          storageV5,
        })
      )?.marketplace ?? null
    );
  let entry = ownPropertyOrUndefined(await readClaudeAiMarketplaceRegistry(), marketplaceName);
  return entry === undefined
    ? null
    : loadCachedMarketplace(
        storageV5,
        marketplaceName,
        toKnownMarketplaceEntry(marketplaceName, entry),
        undefined,
        unreadableCatalogs,
      );
}
//@ chunk-5xgkngpb.js:4400513-4400545 layout
var BLOCKLIST_DIRECTION_OPTION = {
  blocklistDirection: true,
};
//@ chunk-5xgkngpb.js:4400545-4400609 layout
function looseMarketplaceName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}
//@ chunk-5xgkngpb.js:4400609-4400924 layout
/**
 * 仿冒检查用的不可见字符、易混标点正则与非 ASCII 正则。
 */
var INVISIBLE_FORMAT_CHARS_RE = /[\u200c-\u200f\u202a-\u202e\u206a-\u206f\ufeff]/g;
var CONFUSABLE_PUNCTUATION_RE =
  /[\u2018\u2019\u201c\u201d\u2010-\u2015\u00b7\u0387\u2022\u2027\u2219\u22c5\u30fb\uff65\u2190-\u2199\u21d0-\u21d5\u21e6-\u21e9\u2794\u2798-\u27a4\u27a7-\u27af\u27b1\u27b3-\u27be\u27f5-\u27fa\u2b00-\u2b0d\u2b95\uffe9-\uffec]/g;
var MAX_LOOSE_NAME_LENGTH = 512;
var NON_ASCII_RE = /[^\x00-\x7f]/;
//@ chunk-5xgkngpb.js:4400924-4400960 layout
function isLooseNameTooLong(name) {
  return name.length > MAX_LOOSE_NAME_LENGTH;
}
//@ chunk-5xgkngpb.js:4400960-4401095 layout
function looseNameVariants(name) {
  let variants = [looseMarketplaceName(name)];
  if (NON_ASCII_RE.test(name) && !isLooseNameTooLong(name))
    variants.push(looseMarketplaceName(name.normalize("NFKC").replace(INVISIBLE_FORMAT_CHARS_RE, "")));
  return normalizeCaseForComparison_2(variants).filter((variant) => variant !== "");
}
//@ chunk-5xgkngpb.js:4401095-4401156 layout
var FULLWIDTH_ALNUM_RE = /^[\uff10-\uff19\uff21-\uff3a\uff41-\uff5a]$/;
var MAX_CONFUSABLE_RUN = 16;
//@ chunk-5xgkngpb.js:4401156-4401377 layout
function splitLooseNameSegments(segments) {
  let parts = [];
  let runLength = 0;
  for (let segment of segments) {
    let name = segment.normalize("NFKC");
    if (NON_ASCII_RE.test(name)) continue;
    let loose = looseMarketplaceName(name);
    if (loose === "") continue;
    let eitherWay = NON_ASCII_RE.test(segment) && !FULLWIDTH_ALNUM_RE.test(segment);
    if (eitherWay && ++runLength > MAX_CONFUSABLE_RUN) return null;
    parts.push({
      text: loose,
      eitherWay,
    });
  }
  return parts;
}
//@ chunk-5xgkngpb.js:4401377-4401530 layout
function isSuspiciousNonAsciiName(name) {
  if (!NON_ASCII_RE.test(name)) return false;
  if (isLooseNameTooLong(name)) return true;
  if (splitLooseNameSegments(name) === null) return true;
  return NON_ASCII_RE.test(
    name.replace(CONFUSABLE_PUNCTUATION_RE, "").normalize("NFKC").replace(INVISIBLE_FORMAT_CHARS_RE, ""),
  );
}
//@ chunk-5xgkngpb.js:4401530-4401733 layout
function matchesLooseSegments(segments, looseName) {
  let positions = new Set([0]);
  for (let { text, eitherWay } of segments) {
    let next = new Set();
    for (let index of positions) {
      if (eitherWay) next.add(index);
      if (looseName.startsWith(text, index)) next.add(index + text.length);
    }
    if (next.size === 0) return false;
    positions = next;
  }
  return positions.has(looseName.length);
}
//@ chunk-5xgkngpb.js:4401733-4402000 layout
function matchesBlockedLooseName(name, blocked) {
  if (!NON_ASCII_RE.test(name) || isLooseNameTooLong(name)) return false;
  let segments = splitLooseNameSegments(name);
  if (segments === null || !segments.some((segment) => segment.eitherWay)) return false;
  let fixedLength = 0;
  let maxLength = 0;
  for (let { text, eitherWay } of segments) {
    maxLength += text.length;
    if (!eitherWay) fixedLength += text.length;
  }
  for (let looseName of blocked.looseNames)
    if (
      looseName.length >= fixedLength &&
      looseName.length <= maxLength &&
      matchesLooseSegments(segments, looseName)
    )
      return true;
  return false;
}
//@ chunk-5xgkngpb.js:4402000-4403051 layout
/**
 * 读取 policySettings.enabledPlugins 中为 false 的插件，收集名字、宽松名，并尽量解析出其仓库来源键； 无法解析仓库时只按名字阻止并记 warn。没有禁用项返回 null。
 */
async function collectOrgBlockedPlugins(storageV5) {
  {
    let blockedIds = Object.entries(getSettingsForSource("policySettings")?.enabledPlugins ?? {})
      .filter(([, value]) => value === false)
      .map(([key]) => key);
    if (blockedIds.length === 0) return null;
    let knownMarketplaces = await loadKnownMarketplacesSafe(storageV5);
    let blocked = {
      keys: new Set(),
      names: new Set(),
      looseNames: new Set(),
      looseNameBlock: false,
    };
    let catalogPromise;
    let unresolvedNames = false;
    for (let blockedId of blockedIds) {
      let { name, marketplace } = parsePluginIdentifier(blockedId);
      if (!name) continue;
      blocked.names.add(name);
      blocked.looseNameBlock = true;
      for (let variant of looseNameVariants(name)) blocked.looseNames.add(variant);
      if (marketplace === OFFICIAL_MARKETPLACE_NAME) continue;
      let sourceKey;
      try {
        let pluginByIdCacheOnly = await getPluginByIdCacheOnly(blockedId, storageV5);
        if (pluginByIdCacheOnly)
          sourceKey = samePluginSource(
            pluginByIdCacheOnly.entry.source,
            sourceUrlAndRef(
              marketplace ? ownPropertyOrUndefined(knownMarketplaces, marketplace)?.source : undefined,
            ),
            BLOCKLIST_DIRECTION_OPTION,
          );
        else if (marketplace === CLAUDE_PLUGINS_OFFICIAL) {
          catalogPromise ??= getCachedCatalogPlugins(storageV5);
          sourceKey = samePluginSource(
            (await catalogPromise)?.[blockedId]?.marketplace_entry.source,
            OFFICIAL_MARKETPLACE_SOURCE.repo,
            BLOCKLIST_DIRECTION_OPTION,
          );
          unresolvedNames ||= sourceKey === undefined;
        }
      } catch (error) {
        logForDebugging(`Could not resolve org-blocked plugin ${blockedId}: ${errorMessage(error)}`, {
          level: "warn",
        });
      }
      if (sourceKey === undefined)
        logForDebugging(
          `Org-blocked plugin ${blockedId} has no resolvable repository; the plugin directory blocks it by name only`,
          {
            level: "warn",
          },
        );
      else blocked.keys.add(sourceKey);
    }
    if (
      unresolvedNames &&
      (await catalogPromise) === undefined &&
      (await getMarketplaceCacheOnly(CLAUDE_PLUGINS_OFFICIAL, storageV5)) === null
    )
      logForDebugging(
        `${CLAUDE_PLUGINS_OFFICIAL} has never been cached on this machine, so the plugins your organization blocks in it are matched in the plugin directory by name alone`,
        {
          level: "warn",
        },
      );
    return blocked;
  }
  return null;
}
//@ chunk-5xgkngpb.js:4403051-4403559 layout
/**
 * 判断插件目录中的条目是否应隐藏：仓库被主机策略阻止；或按名字、仓库键、宽松名、可疑非 ASCII 名与禁用名匹配。
 */
function isListingBlocked(listing, blocked) {
  {
    let { source } = listing;
    if (
      isListingRepositoryBlockedByHostPolicy(
        typeof source === "object" && "url" in source ? source.url : undefined,
      )
    )
      return true;
    if (blocked === null) return false;
    let sourceKey = samePluginSource(listing.source, undefined, BLOCKLIST_DIRECTION_OPTION);
    if (
      blocked.names.has(listing.name) ||
      (sourceKey === undefined ? blocked.keys.size > 0 : blocked.keys.has(sourceKey))
    )
      return true;
    if (!blocked.looseNameBlock) return false;
    let path = typeof source === "object" && "path" in source ? source.path : undefined;
    let filtered = [listing.name, listing.displayName, path?.split("/").findLast(Boolean)].filter(
      (label) => label !== undefined,
    );
    if (filtered.some((label) => looseNameVariants(label).some((variant) => blocked.looseNames.has(variant))))
      return true;
    if (filtered.some(isSuspiciousNonAsciiName)) return true;
    return filtered.some((label) => matchesBlockedLooseName(label, blocked));
  }
  return false;
}
//@ chunk-5xgkngpb.js:4403559-4403779 layout
/**
 * 插件目录缓存清单中的该插件是否被组织阻止。
 */
async function isPluginDirectoryListingBlocked(pluginName, storageV5) {
  let directoryModule = pluginDirectoryModuleIfUsable();
  if (!directoryModule) return false;
  let orgBlockedPlugins = await collectOrgBlockedPlugins(storageV5);
  let { marketplace } = await directoryModule.loadPluginDirectoryMarketplace("cache-only", {
    installRecords: getInstalledPluginsMap,
  });
  let found = marketplace?.plugins.find((plugin) => plugin.name === pluginName);
  return found !== undefined && isListingBlocked(found, orgBlockedPlugins);
}
//@ chunk-5xgkngpb.js:4403779-4404036 layout
/**
 * 插件目录启用时返回插件不可安装的说明。
 */
async function pluginDirectoryNotInstallableMessage(pluginName) {
  let directoryModule = pluginDirectoryModuleIfUsable();
  if (!directoryModule || !(await directoryModule.isPluginDirectoryMarketplaceEnabled())) return;
  let { marketplace } = await directoryModule.loadPluginDirectoryMarketplace("cache-only", {
    installRecords: getInstalledPluginsMap,
  });
  return marketplace === null
    ? undefined
    : await directoryModule.pluginDirectoryNotInstallableMessage(pluginName);
}
//@ chunk-5xgkngpb.js:4404036-4404231 layout
async function filterBlockedListings(marketplace, storageV5) {
  let orgBlockedPlugins = await collectOrgBlockedPlugins(storageV5);
  let filtered = marketplace.plugins.filter((plugin) => !isListingBlocked(plugin, orgBlockedPlugins));
  if (filtered.length === marketplace.plugins.length) return marketplace;
  if (marketplace.plugins.some((plugin) => isListingBlocked(plugin, null)))
    logDirectoryBlockedOnce("host_pattern");
  return {
    ...marketplace,
    plugins: filtered,
  };
}
//@ chunk-5xgkngpb.js:4404231-4404695 layout
/**
 * 只读缓存加载插件目录市场清单（滤掉被阻止项）。
 */
async function loadPluginDirectoryMarketplaceCached({
  ignoreToggle = false,
  storageV5,
  onlyMissedListings = false,
} = {}) {
  {
    let directoryModule =
      ignoreToggle && pluginDirectoryPolicyBlock() === null
        ? pluginDirectoryModules
        : pluginDirectoryModuleIfUsable();
    if (!directoryModule || (!ignoreToggle && !(await directoryModule.isPluginDirectoryMarketplaceEnabled())))
      return null;
    let { marketplace } = await directoryModule.loadPluginDirectoryMarketplace("cache-only", {
      forInstalledPlugin: ignoreToggle,
      onlyMissedListings,
      installRecords: getInstalledPluginsMap,
    });
    if (marketplace === null) return null;
    let { installLocation } = await directoryModule.pluginDirectoryRegistryEntry();
    return {
      marketplace: await filterBlockedListings(marketplace, storageV5),
      installLocation,
    };
  }
  return null;
}
//@ chunk-5xgkngpb.js:4404695-4407105 layout
/**
 * 返回带 lookUp(name, purpose) 的读取器：首次查询时刷新插件目录（不在会话可用、不允许读取或关闭时返回 not-read）， 结果在本次操作内共享；查询结果为 listed / hidden-by-policy / not-installable / not-listed / not-read。
 */
function createPluginDirectoryReader(storage, { mayWalkTheFeed, onBehalfOf = "a-person" }) {
  let readPromise;
  let readState = "unasked";
  let readOnce = (directoryModule, purpose) => {
    readPromise ??= (async () => {
      let pluginDirectoryMarketplace = await directoryModule.loadPluginDirectoryMarketplace("refresh", {
        purpose,
        trigger: purpose === "update" ? "update" : "install",
        installRecords: getInstalledPluginsMap,
      });
      if (pluginDirectoryMarketplace.marketplace === null) {
        readState = "not-read";
        return {
          marketplace: null,
          detail: pluginDirectoryMarketplace.message,
          ...(pluginDirectoryMarketplace.laterMayHelp && {
            nextStep: "Try again later",
          }),
        };
      }
      readState = "read";
      getPluginRegistry().marketplaces.delete(OFFICIAL_MARKETPLACE_NAME);
      let { installLocation } = await directoryModule.pluginDirectoryRegistryEntry();
      let filteredMarketplace = await filterBlockedListings(pluginDirectoryMarketplace.marketplace, storage);
      let visibleSet = new Set(filteredMarketplace.plugins);
      return {
        marketplace: filteredMarketplace,
        installLocation,
        reviewerMarkedNames: pluginDirectoryMarketplace.reviewerMarkedNames ?? new Set(),
        hiddenByPolicy: new Set(
          pluginDirectoryMarketplace.marketplace.plugins
            .filter((plugin) => !visibleSet.has(plugin))
            .map((plugin) => plugin.name),
        ),
        notInstallable: pluginDirectoryMarketplace.notInstallable ?? new Map(),
      };
    })().catch((error) => {
      logError(withTelemetryMessage(toError(error), "Plugin directory operation read threw"));
      readState = "not-read";
      return {
        marketplace: null,
        detail: "an unexpected error stopped the read",
      };
    });
    return readPromise;
  };
  let reader = {
    async lookUp(pluginName, purpose) {
      {
        let directoryModule = pluginDirectoryModuleIfUsable();
        if (directoryModule === null)
          return {
            outcome: "not-read",
            purpose,
            detail: "it isn't available in this session",
          };
        if (!mayWalkTheFeed)
          return {
            outcome: "not-read",
            purpose,
            detail: "it is read only when a person asks for it",
          };
        if (
          purpose !== "switch" &&
          !(await directoryModule.isPluginDirectoryMarketplaceEnabled()) &&
          !(purpose === "update" && hasInstalledOfficialEntry(pluginName))
        )
          return {
            outcome: "not-read",
            purpose,
            detail: "it is off",
            nextStep: `Turn it on: claude plugin marketplace add ${OFFICIAL_MARKETPLACE_NAME}`,
          };
        if (readPromise === undefined) {
          let failedWalkWindow = directoryModule.pluginDirectoryFailedWalkWindow();
          let timestamp =
            failedWalkWindow === undefined
              ? undefined
              : onBehalfOf === "nobody"
                ? failedWalkWindow.closesAt
                : failedWalkWindow.serviceDelayMs === undefined
                  ? undefined
                  : failedWalkWindow.failedAt +
                    Math.min(failedWalkWindow.serviceDelayMs, MARKETPLACE_CACHE_TTL_MS);
          if (failedWalkWindow !== undefined && timestamp !== undefined && Date.now() < timestamp) {
            readState = "not-read";
            return {
              outcome: "not-read",
              purpose,
              detail:
                onBehalfOf === "nobody"
                  ? `it could not be read a short while ago (${failedWalkWindow.reason}), and work that runs by itself does not ask it again before ${formatTimeOfDay(timestamp)}`
                  : `it asked Claude Code to wait, and can be asked again at ${formatTimeOfDay(timestamp)}`,
            };
          }
        }
        let readResult = await readOnce(directoryModule, purpose);
        if (readResult.marketplace === null)
          return {
            outcome: "not-read",
            purpose,
            detail: readResult.detail,
            ...(readResult.nextStep !== undefined && {
              nextStep: readResult.nextStep,
            }),
          };
        let found = readResult.marketplace.plugins.find((plugin) => plugin.name === pluginName);
        if (found !== undefined)
          return {
            outcome: "listed",
            entry: found,
            marketplaceInstallLocation: readResult.installLocation,
            reviewerMarked: readResult.reviewerMarkedNames.has(pluginName),
          };
        if (readResult.hiddenByPolicy.has(pluginName))
          return {
            outcome: "hidden-by-policy",
          };
        let reason = readResult.notInstallable.get(pluginName);
        return reason === undefined
          ? {
              outcome: "not-listed",
            }
          : {
              outcome: "not-installable",
              why: reason,
            };
      }
      return {
        outcome: "not-read",
        purpose,
        detail: "it isn't available in this build",
      };
    },
  };
  weakMap_17.set(reader, () => readState);
  return reader;
}
//@ chunk-5xgkngpb.js:4407105-4407120 layout
var MARKETPLACE_CACHE_TTL_MS = 300000;
//@ chunk-5xgkngpb.js:4407120-4407216 layout (2.1.88 match: formatLocalTime, 0.894)
function formatTimeOfDay(timestamp) {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
//@ chunk-5xgkngpb.js:4407216-4407236 layout
var weakMap_17; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:4407216", () => {
  weakMap_17 = new WeakMap();
});
//@ chunk-5xgkngpb.js:4407236-4407689 layout
/**
 * 为切换安装来源查插件目录条目。
 */
async function lookUpPluginForSwitch(
  pluginName,
  storage,
  reader = createPluginDirectoryReader(storage, {
    mayWalkTheFeed: true,
  }),
) {
  let result = await reader.lookUp(pluginName, "switch");
  switch (result.outcome) {
    case "listed":
      return {
        entry: result.entry,
        marketplaceInstallLocation: result.marketplaceInstallLocation,
        reviewerMarked: result.reviewerMarked,
      };
    case "not-read":
      return {
        notFreshEnoughFor: "switch",
        detail: result.detail,
      };
    case "hidden-by-policy":
    case "not-installable":
    case "not-listed":
      return {
        entry: null,
      };
    default: {
      let outcome = result;
      throw Error("Unhandled outcome of a read of the Directory");
    }
  }
}
//@ chunk-5xgkngpb.js:4407689-4407882 layout
/**
 * 切换需要重新读取插件目录但读取失败。
 */
function formatSwitchNeedsFreshReadMessage(detail) {
  return `A switch needs a fresh read of the ${OFFICIAL_MARKETPLACE_DISPLAY}, not the copy saved on this machine, and it could not be read: ${quotedPrintable(detail, 200)}. Nothing was changed; try again once it can be read`;
}
//@ chunk-5xgkngpb.js:4407882-4408050 layout
async function findPluginDirectoryEntry(pluginName, purpose, storageV5) {
  let pluginDirectoryForPurpose = await loadPluginDirectoryForPurpose(pluginName, purpose, storageV5);
  let found = pluginDirectoryForPurpose?.marketplace.plugins.find((plugin) => plugin.name === pluginName);
  return pluginDirectoryForPurpose && found
    ? {
        entry: found,
        marketplaceInstallLocation: pluginDirectoryForPurpose.installLocation,
      }
    : null;
}
//@ chunk-5xgkngpb.js:4408050-4408123 layout
/**
 * 加载插件目录（Directory）市场的清单（缓存模式），没有返回 null。
 */
async function loadPluginDirectoryMarketplace(pluginName, storageV5) {
  return (await loadPluginDirectoryForPurpose(pluginName, storageV5, "load"))?.marketplace ?? null;
}
//@ chunk-5xgkngpb.js:4408123-4408239 layout
async function pluginDirectoryNotInstallableReason(pluginName, storageV5) {
  return (await loadPluginDirectoryForPurpose(pluginName, storageV5, "load")) === null
    ? undefined
    : await pluginDirectoryModules?.pluginDirectoryNotInstallableReason(pluginName);
}
//@ chunk-5xgkngpb.js:4408239-4408464 layout
/**
 * 在插件目录（可只看漏列项）中查插件条目。
 */
async function findMissedListingEntry(pluginName, storageV5, ignoreToggle) {
  let directory = ignoreToggle
    ? await loadPluginDirectoryForPurpose(pluginName, storageV5, "load", true)
    : await loadPluginDirectoryMarketplaceCached({
        storageV5,
        onlyMissedListings: true,
      });
  let found = directory?.marketplace.plugins.find((plugin) => plugin.name === pluginName);
  return directory && found
    ? {
        entry: found,
        marketplaceInstallLocation: directory.installLocation,
      }
    : null;
}
//@ chunk-5xgkngpb.js:4408464-4408571 layout
function loadPluginDirectoryForPurpose(pluginName, storageV5, purpose, onlyMissedListings = false) {
  return loadPluginDirectoryMarketplaceCached({
    onlyMissedListings,
    ignoreToggle: purpose !== "install" && hasInstalledOfficialEntry(pluginName),
    storageV5,
  });
}
//@ chunk-5xgkngpb.js:4408571-4408669 layout
/**
 * pluginDirectoryUnavailableKind：插件目录不可用的类别。
 */
function pluginDirectoryUnavailableKind() {
  if (pluginDirectoryPolicyBlock() !== null) return "blocked";
  return pluginDirectoryStatusModule?.pluginDirectoryUnavailableCause() ?? null;
}
//@ chunk-5xgkngpb.js:4408669-4408737 layout
/**
 * pluginDirectoryRefusalReason：插件目录策略拒绝原因。
 */
function pluginDirectoryRefusalReason() {
  return pluginDirectoryStatusModule?.pluginDirectoryPolicyRefusalReason() ?? "";
}
//@ chunk-5xgkngpb.js:4408737-4408804 layout
/**
 * awaitPluginDirectoryVerdict：等待插件目录策略裁决。
 */
async function awaitPluginDirectoryVerdict() {
  await pluginDirectoryModules?.awaitPluginDirectoryPolicyVerdict();
}
//@ chunk-5xgkngpb.js:4408804-4409457 layout
/**
 * 加载插件目录市场，不可用（或过期）时抛 PluginDirectoryUnavailableError。
 */
async function loadPluginDirectoryMarketplace_2(
  mode,
  storageV5,
  { staleIsFailure = false, trigger = "other", signal } = {},
) {
  let directoryModule = pluginDirectoryModuleIfUsable();
  let loadResult = directoryModule
    ? await directoryModule.loadPluginDirectoryMarketplace(mode, {
        trigger,
        signal,
        installRecords: getInstalledPluginsMap,
      })
    : {
        marketplace: null,
        message: "it isn't available in this session",
      };
  if (
    staleIsFailure &&
    loadResult.marketplace !== null &&
    "staleReason" in loadResult &&
    loadResult.staleReason
  )
    throw withTelemetryMessage(
      new PluginDirectoryUnavailableError(
        `${OFFICIAL_MARKETPLACE_DISPLAY} could not be refreshed: ${loadResult.staleReason}`,
      ),
      "Plugin directory marketplace refresh served stale cache",
    );
  if (loadResult.marketplace === null) {
    let policyHint = pluginDirectoryPolicyBlockHint();
    throw withTelemetryMessage(
      new PluginDirectoryUnavailableError(
        policyHint === ""
          ? `${OFFICIAL_MARKETPLACE_DISPLAY} is unavailable: ${loadResult.message}`
          : `${OFFICIAL_MARKETPLACE_DISPLAY} is blocked by your organization. ${policyHint}`,
      ),
      "Plugin directory marketplace catalog unavailable",
    );
  }
  return await filterBlockedListings(loadResult.marketplace, storageV5);
}
//@ chunk-5xgkngpb.js:4409457-4410266 layout
/**
 * 按来源加载已缓存市场：claude.ai 源走账号缓存，插件目录源走缓存清单；其他源先做保留名与仿冒检查， 再读 marketplace.json。失败或拒绝时把市场名记入 failed 集合（仿冒错误另行标记）。
 */
async function loadCachedMarketplace(storage, marketplaceName, entry, declaredSource, failedNames) {
  if (isClaudeAiMarketplaceSource(entry.source))
    return (
      await ensureClaudeAiMarketplace(marketplaceName, entry.source, {
        mode: "cache-only",
        credentials: undefined,
      })
    ).marketplace;
  if (isPluginDirectorySource(entry.source))
    return (
      (
        await loadPluginDirectoryMarketplaceCached({
          storageV5: storage,
        })
      )?.marketplace ?? null
    );
  try {
    let installLocation = normalizeInstallLocation(entry.source, entry.installLocation);
    let refusal = validateReservedMarketplaceEntry(marketplaceName, {
      source: entry.source,
      installLocation,
    });
    if (refusal) {
      logForDebugging(`Refusing to load marketplace '${marketplaceName}': ${refusal}`, {
        level: "warn",
      });
      return null;
    }
    if (isImpersonatingOfficialMarketplace(marketplaceName, entry)) {
      logForDebugging(
        `Refusing to load marketplace '${marketplaceName}': the look-alike check refuses the name it is saved under`,
        {
          level: "warn",
        },
      );
      failedNames?.add(marketplaceName);
      markImpersonationFailure(failedNames, marketplaceName, true);
      return null;
    }
    let marketplaceManifest = await readMarketplaceManifest(
      installLocation,
      declaredSource,
      storage,
      isStorageV5Enabled() && storage !== undefined
        ? getMarketplaceStorageLocation(marketplaceName, entry.source, installLocation)
        : null,
    );
    failedNames?.delete(marketplaceName);
    markImpersonationFailure(failedNames, marketplaceName, false);
    return marketplaceManifest;
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT") {
      failedNames?.delete(marketplaceName);
      markImpersonationFailure(failedNames, marketplaceName, false);
      return null;
    }
    logForDebugging(`Failed to read cached marketplace ${marketplaceName}: ${errorMessage(error)}`, {
      level: "warn",
    });
    failedNames?.add(marketplaceName);
    markImpersonationFailure(
      failedNames,
      marketplaceName,
      !isLookalikeUnblockedMarketplace(declaredSource) &&
        errorMessage(error).includes(IMPERSONATION_ERROR_MESSAGE),
    );
    return null;
  }
}
//@ chunk-5xgkngpb.js:4410266-4410286 layout
var weakMap_18; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:4410266", () => {
  weakMap_18 = new WeakMap();
});
//@ chunk-5xgkngpb.js:4410286-4410419 layout
function markImpersonationFailure(failedNames, marketplaceName, isImpersonating) {
  if (failedNames === undefined) return;
  let names = weakMap_18.get(failedNames);
  if (isImpersonating) {
    if (names === undefined) weakMap_18.set(failedNames, new Set([marketplaceName]));
    else names.add(marketplaceName);
  } else names?.delete(marketplaceName);
}
//@ chunk-5xgkngpb.js:4410419-4410468 layout
/**
 * isRegistryOwnedByName：weakMap 里是否登记了该名字。
 */
function isRegistryOwnedByName(failedNames, marketplaceName) {
  return weakMap_18.get(failedNames)?.has(marketplaceName) === true;
}
//@ chunk-5xgkngpb.js:4410468-4412618 fingerprint (2.1.88 match: getMarketplace, 0.462)
/**
 * 取市场目录：缓存存在且可解析就用，否则（或缓存过期时）重新 loadAndCacheMarketplace。
 */
function getMarketplace(marketplaceName, storageV5, purpose = "other") {
  if (marketplaceName.toLowerCase() === pluginManifestPathSchemas)
    return Promise.reject(
      Error(
        'The marketplace registered as "npm" is ignored: the name npm is reserved for plugins installed from an npm registry (<package>@npm).',
      ),
    );
  let { marketplaces } = getPluginRegistry();
  let cached = marketplaces.get(marketplaceName);
  if (cached)
    return marketplaceName === OFFICIAL_MARKETPLACE_NAME
      ? cached.then(
          (marketplace) =>
            pluginDirectoryUnavailableKind() !== null
              ? loadPluginDirectoryMarketplace_2("if-stale", storageV5)
              : filterBlockedListings(marketplace, storageV5),
          (error) => {
            let current = marketplaces.get(marketplaceName);
            if (
              !(error instanceof PluginDirectoryUnavailableError) ||
              pluginDirectoryPolicyBlock() !== null ||
              current === undefined
            )
              throw error;
            if (current === cached) marketplaces.delete(marketplaceName);
            return getMarketplace(marketplaceName, storageV5, purpose);
          },
        )
      : cached;
  let load = (async () => {
    let knownMarketplacesWithDeclared = await loadKnownMarketplacesWithDeclared(storageV5);
    let entry = ownPropertyOrUndefined(knownMarketplacesWithDeclared, marketplaceName);
    if (!entry)
      throw withTelemetryMessage(
        Error(
          `Marketplace '${marketplaceName}' not found in configuration. Available marketplaces: ${Object.keys(knownMarketplacesWithDeclared).join(", ")}`,
        ),
        "Marketplace not found in configuration",
      );
    if (isClaudeAiMarketplaceSource(entry.source)) {
      let { marketplace, status } = await ensureClaudeAiMarketplace(marketplaceName, entry.source, {
        mode: "if-missing",
        credentials: undefined,
      });
      if (marketplace === null)
        throw new ClaudeAiMarketplaceError(
          `Marketplace "${marketplaceName}" (hosted on claude.ai) is ${describeMarketplaceFreshness(status) ?? "not available"}`,
          catalogStatusCode(status),
          "claude.ai marketplace catalog unavailable",
        );
      return marketplace;
    }
    if (isPluginDirectorySource(entry.source))
      return await loadPluginDirectoryMarketplace_2("if-stale", storageV5, {
        trigger: purpose,
      });
    assertReservedNameTrusted(marketplaceName, entry);
    assertNotLookAlikeName(marketplaceName, entry);
    if (isLocalMarketplaceSource(entry.source) && !isAbsolute(entry.source.path)) {
      let hint = claudeCommand("plugin marketplace remove", marketplaceName);
      throw withTelemetryMessage(
        Error(
          `Marketplace "${marketplaceName}" has a relative source path (${entry.source.path}) ` +
            "in known_marketplaces.json \u2014 this is stale state from an older " +
            `Claude Code version. ${hint ? `Run \`${hint}\` and re-add` : "Remove and re-add"} it from the original project directory.`,
        ),
        "Marketplace has relative source path (legacy state)",
      );
    }
    try {
      return await readMarketplaceManifest(
        entry.installLocation,
        marketplaceName,
        storageV5,
        isStorageV5Enabled() && storageV5 !== undefined
          ? getMarketplaceStorageLocation(marketplaceName, entry.source, entry.installLocation)
          : null,
      );
    } catch (error) {
      logForDebugging(
        `Cache corrupted or missing for marketplace ${marketplaceName}, re-fetching from source: ${errorMessage(error)}`,
        {
          level: "warn",
        },
      );
    }
    let marketplace;
    let keptStale;
    try {
      ({ marketplace, keptStaleClone: keptStale } = await loadAndCacheMarketplace(
        entry.source,
        marketplaceName,
        undefined,
        storageV5,
        marketplaceName,
        undefined,
        knownMarketplacesWithDeclared,
      ));
    } catch (error) {
      if (error instanceof CommandSourceError) throw error;
      if (
        isAsciiImpersonatingOfficialName(marketplaceName) &&
        !isLookalikeUnblockedMarketplace(marketplaceName) &&
        errorMessage(error).includes(IMPERSONATION_ERROR_MESSAGE)
      )
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          reservedNameMessage_2(entry.source.source === "settings"),
          "Marketplace name refused by the look-alike check",
        );
      throw withTelemetryMessage(
        Error(
          `Failed to load marketplace "${marketplaceName}" from source (${entry.source.source}): ${errorMessage(error)}`,
        ),
        "Failed to load marketplace from source",
      );
    }
    if (!keptStale) await touchMarketplaceLastUpdated(marketplaceName, storageV5);
    return marketplace;
  })();
  marketplaces.set(marketplaceName, load);
  load
    .catch((error) => {
      if (
        error instanceof PluginDirectoryUnavailableError &&
        pluginDirectoryPolicyBlock() === null &&
        marketplaces.get(marketplaceName) === load
      )
        marketplaces.delete(marketplaceName);
    })
    .catch(() => {});
  return load;
}
//@ chunk-5xgkngpb.js:4412618-4413502 fingerprint (2.1.88 match: getPluginByIdCacheOnly, 0.811)
/**
 * 由插件 ID（name@marketplace）只用缓存找到 marketplace 条目，返回 {entry, marketplaceInstallLocation}。
 */
async function getPluginByIdCacheOnly(pluginId, storageV5, purpose = "load") {
  let { name: pluginName, marketplace: marketplaceName } = parsePluginIdentifier(pluginId);
  if (!pluginName || !marketplaceName || marketplaceName.toLowerCase() === pluginManifestPathSchemas)
    return null;
  let fs = getFsImplementation();
  let scope = isStorageV5Enabled() && storageV5 !== undefined ? getMarketplacesStorageScope() : null;
  if (storageV5 !== undefined && scope !== null) {
    let readResult = await storageV5.read([scope]);
    if (!readResult.ok) return null;
    let item = readResult.value.items[0];
    if (!item?.found) return getPluginByIdFromCacheOrDeclared(storageV5, pluginId, purpose);
    try {
      let config = jsonParse(Buffer.from(item.value).toString("utf-8"));
      let admittedMarketplaceEntry = getAdmittedMarketplaceEntry(marketplaceName, config);
      if (!admittedMarketplaceEntry)
        return await getPluginByIdFromCacheOrDeclared(storageV5, pluginId, purpose);
      let marketplaceCacheOnly = await getMarketplaceCacheOnly(marketplaceName, storageV5);
      if (!marketplaceCacheOnly) return null;
      let found = marketplaceCacheOnly.plugins.find((plugin) => plugin.name === pluginName);
      if (!found) return null;
      return {
        entry: found,
        marketplaceInstallLocation: admittedMarketplaceEntry.installLocation,
      };
    } catch {
      return null;
    }
  }
  if (isDiskless()) return getPluginByIdFromCacheOrDeclared(storageV5, pluginId, purpose);
  let configFile = getKnownMarketplacesPath();
  try {
    let content = await fs.readFile(configFile, {
      encoding: "utf-8",
    });
    let config = jsonParse(content);
    let marketplaceConfig = getAdmittedMarketplaceEntry(marketplaceName, config);
    if (!marketplaceConfig) return await getPluginByIdFromCacheOrDeclared(storageV5, pluginId, purpose);
    let marketplace = await getMarketplaceCacheOnly(marketplaceName);
    if (!marketplace) return null;
    let plugin = marketplace.plugins.find((plugin) => plugin.name === pluginName);
    if (!plugin) return null;
    return {
      entry: plugin,
      marketplaceInstallLocation: marketplaceConfig.installLocation,
    };
  } catch (error) {
    return isENOENT(error) ? getPluginByIdFromCacheOrDeclared(storageV5, pluginId, purpose) : null;
  }
}
//@ chunk-5xgkngpb.js:4413502-4414180 layout
async function getPluginByIdFromCacheOrDeclared(storageV5, pluginId, purpose) {
  let { name: pluginName, marketplace } = parsePluginIdentifier(pluginId);
  if (!pluginName || !marketplace) return null;
  if (marketplace === OFFICIAL_MARKETPLACE_NAME)
    return findPluginDirectoryEntry(pluginName, storageV5, purpose);
  let entry = ownPropertyOrUndefined(await readClaudeAiMarketplaceRegistry(), marketplace);
  if (entry === undefined) return null;
  let marketplaceInstallLocation = toKnownMarketplaceEntry(marketplace, entry).installLocation;
  let { marketplace: marketplace_2, status } = await ensureClaudeAiMarketplace(marketplace, entry.source, {
    mode: "cache-only",
    credentials: undefined,
  });
  if (marketplace_2 !== null) {
    let found = marketplace_2.plugins.find((plugin) => plugin.name === pluginName);
    return found === undefined
      ? null
      : {
          entry: found,
          marketplaceInstallLocation,
        };
  }
  if (status.kind === "gone") return null;
  let installation = getInstalledPlugins().plugins[pluginId]?.[0];
  if (installation === undefined) return null;
  return {
    entry: {
      name: pluginName,
      source: {
        source: "claudeai",
        pluginId: installation.claudeaiPluginId ?? "",
        version: installation.version ?? "",
        installable: false,
      },
      ...(installation.version !== undefined && {
        version: installation.version,
      }),
      strict: true,
    },
    marketplaceInstallLocation,
  };
}
//@ chunk-5xgkngpb.js:4414180-4414649 fingerprint (2.1.88 match: getPluginById, 0.765)
/**
 * 由插件 ID 找 marketplace 条目，必要时联网刷新市场。
 */
async function getPluginById(pluginId, storageV5, purpose = "other") {
  let cached = await getPluginByIdCacheOnly(
    pluginId,
    storageV5,
    purpose === "install" || purpose === "update" ? purpose : "load",
  );
  if (cached) return cached;
  let { name: pluginName, marketplace: marketplaceName } = parsePluginIdentifier(pluginId);
  if (!pluginName || !marketplaceName || marketplaceName.toLowerCase() === pluginManifestPathSchemas)
    return null;
  try {
    let config = await loadKnownMarketplacesWithDeclared(storageV5);
    let marketplaceConfig = ownPropertyOrUndefined(config, marketplaceName);
    if (!marketplaceConfig) return null;
    let plugin = (await getMarketplace(marketplaceName, storageV5, purpose)).plugins.find(
      (plugin) => plugin.name === pluginName,
    );
    if (!plugin) return null;
    return {
      entry: plugin,
      marketplaceInstallLocation: marketplaceConfig.installLocation,
    };
  } catch (error) {
    if (error instanceof CommandSourceError) throw error;
    logForDebugging(`Could not find plugin ${pluginId}: ${errorMessage(error)}`, {
      level: "debug",
    });
    return null;
  }
}
//@ chunk-5xgkngpb.js:4414649-4415429 layout
/**
 * 确保插件目录市场的目录在本机（必要时 cache-only 加载），返回 not_needed/ok/not_allowed 等。
 */
async function ensurePluginDirectoryCatalog(storageV5, timeoutMs = PLUGIN_DIRECTORY_CATALOG_MISSING_ERROR) {
  {
    let directoryModule = pluginDirectoryModuleIfUsable();
    if (
      directoryModule === null ||
      !isSourceAllowedByPolicy({
        source: "pluginDirectory",
      }) ||
      directoryModule.pluginDirectoryWalkReadiness() === "not_allowed"
    )
      return "not_needed";
    if (
      (
        await directoryModule.loadPluginDirectoryMarketplace("cache-only", {
          forInstalledPlugin: true,
          installRecords: getInstalledPluginsMap,
        })
      ).marketplace !== null
    )
      return "not_needed";
    if (directoryModule.pluginDirectoryWalkReadiness() === "backed_off") return "unreachable";
    let abortController = new AbortController();
    let result = await withDeadline(
      refreshMarketplaceDeduped(OFFICIAL_MARKETPLACE_NAME, storageV5, undefined, {
        directoryTrigger: "reload",
        directorySignal: abortController.signal,
      }).then(
        () => true,
        (error) => {
          logForDebugging(
            `/reload-plugins could not fetch the ${OFFICIAL_MARKETPLACE_DISPLAY}'s catalog: ${errorMessage(error)}`,
            {
              level: "warn",
            },
          );
          return false;
        },
      ),
      timeoutMs,
    );
    if (result === undefined) {
      abortController.abort();
      directoryModule.notePluginDirectoryWalkTimedOut();
      return "unreachable";
    }
    if (result) return "fetched";
    return directoryModule.pluginDirectoryWalkReadiness() === "backed_off" ? "unreachable" : "unavailable";
  }
  return "not_needed";
}
//@ chunk-5xgkngpb.js:4415429-4415547 layout
/**
 * 插件目录 catalog 不在本机时的错误类别名。
 */
var PLUGIN_DIRECTORY_CATALOG_MISSING_ERROR; // deferred: uses OFFICIAL_MARKETPLACE_NAME (./officialMarketplaceNames.js) of its import cycle while loading; runs once the cycle is complete
var PLUGIN_DIRECTORY_CATALOG_MISSING;
deferInit("chunk-5xgkngpb.js:4415429", () => {
  PLUGIN_DIRECTORY_CATALOG_MISSING_ERROR = OFFICIAL_MARKETPLACE_NAME_CHECK_TTL_MS;
  PLUGIN_DIRECTORY_CATALOG_MISSING = `the ${OFFICIAL_MARKETPLACE_DISPLAY}'s catalog is not on this machine (it is off, blocked, unavailable, or not downloaded yet)`;
});
//@ chunk-5xgkngpb.js:4415547-4415664 layout
/**
 * 插件目录市场的目录（catalog）不在本机时抛出的错误。
 */
class PluginDirectoryCatalogMissingError extends Error {
  constructor() {
    super(`Not available: ${PLUGIN_DIRECTORY_CATALOG_MISSING}`);
    this.name = "PluginDirectoryCatalogMissingError";
  }
}
//@ chunk-5xgkngpb.js:4415664-4415769 layout
/**
 * 取市场目录；插件目录市场只读缓存，没有缓存时抛 PluginDirectoryCatalogMissingError。
 */
async function getMarketplaceOrDirectoryCatalog(name, storageV5) {
  if (name === OFFICIAL_MARKETPLACE_NAME) {
    let marketplaceCacheOnly = await getMarketplaceCacheOnly(name, storageV5);
    if (marketplaceCacheOnly === null) throw new PluginDirectoryCatalogMissingError();
    return marketplaceCacheOnly;
  }
  return getMarketplace(name, storageV5);
}
//@ chunk-5xgkngpb.js:4415769-4415837 layout
/**
 * 按插件 ID 取 marketplace 条目；插件目录市场只用缓存。
 */
function getPluginByIdAnySource(pluginId, storageV5, purpose) {
  return parsePluginIdentifier(pluginId).marketplace === OFFICIAL_MARKETPLACE_NAME
    ? getPluginByIdCacheOnly(pluginId, storageV5, purpose)
    : getPluginById(pluginId, storageV5);
}
//@ chunk-5xgkngpb.js:4415837-4418497 fingerprint (2.1.88 match: refreshAllMarketplaces, 0.447)
/**
 * 刷新所有市场（跳过种子管理和 settings 内联的市场），逐个调用 refreshMarketplace，汇总失败。
 */
async function refreshAllMarketplaces(storageV5) {
  let policyRefused = [];
  let failed = [];
  let builtInSkipped = [];
  let attempted = 0;
  let knownMarketplacesWithDeclared = await loadKnownMarketplacesWithDeclared(storageV5);
  let patches = {};
  for (let [key, value] of Object.entries(knownMarketplacesWithDeclared)) {
    if (seedDirFor(value.installLocation)) {
      logForDebugging(`Skipping seed-managed marketplace '${key}' in bulk refresh`);
      continue;
    }
    if (value.source.source === "settings") {
      if (isImpersonatingOfficialMarketplace(key, value)) {
        logForDebugging(
          `Skipping marketplace '${key}' in bulk refresh: the look-alike check refuses the name it is saved under`,
          {
            level: "warn",
          },
        );
        attempted++;
        failed.push(key);
      }
      continue;
    }
    if (isClaudeAiMarketplaceSource(value.source)) {
      if (!isSourceAllowedByPolicy(value.source)) continue;
      attempted++;
      getPluginRegistry().marketplaces.delete(key);
      try {
        await refreshClaudeAiMarketplace(key, value.source, {
          credentials: undefined,
        });
      } catch (error) {
        logForDebugging(`Failed to refresh claude.ai marketplace ${key}: ${errorMessage(error)}`, {
          level: "warn",
        });
        failed.push(key);
      }
      continue;
    }
    if (isPluginDirectorySource(value.source)) {
      if (!isSourceAllowedByPolicy(value.source) || pluginDirectoryPolicyBlock() !== null) continue;
      getPluginRegistry().marketplaces.delete(key);
      try {
        await loadPluginDirectoryMarketplace_2("refresh", storageV5, {
          staleIsFailure: true,
          trigger: "update",
        });
        attempted++;
      } catch (error) {
        if (pluginDirectoryPolicyBlock() !== null) continue;
        logForDebugging(`Failed to refresh the plugin directory marketplace: ${errorMessage(error)}`, {
          level: "warn",
        });
        builtInSkipped.push(key);
      }
      continue;
    }
    if (!isSourceAllowedByPolicy(value.source)) {
      logForDebugging(`Skipping policy-blocked marketplace '${key}' in bulk refresh`);
      continue;
    }
    attempted++;
    let refusal = validateReservedMarketplaceEntry(key, value);
    if (refusal) {
      logForDebugging(`Skipping marketplace '${key}' in bulk refresh: ${refusal}`, {
        level: "warn",
      });
      failed.push(key);
      continue;
    }
    if (isImpersonatingOfficialMarketplace(key, value)) {
      logForDebugging(
        `Skipping marketplace '${key}' in bulk refresh: the look-alike check refuses the name it is saved under`,
        {
          level: "warn",
        },
      );
      failed.push(key);
      continue;
    }
    let usedGitFallback = false;
    if (key === CLAUDE_PLUGINS_OFFICIAL) {
      try {
        await removeMarketplaceCacheDir(key, value.installLocation, storageV5, knownMarketplacesWithDeclared);
      } catch (error) {
        logForDebugging(`Skipping marketplace '${key}' in bulk refresh: ${errorMessage(error)}`, {
          level: "warn",
        });
        failed.push(key);
        continue;
      }
      if (
        (await fetchOfficialMarketplaceFromGcs(
          value.installLocation,
          getResolvedMarketplacesCacheDir(),
          storageV5,
        )) !== null
      ) {
        logFeatureOk("plugin_official_marketplace_fetch");
        patches[key] = {
          forSource: value.source,
          patch: {
            lastUpdated: new Date().toISOString(),
          },
        };
        continue;
      }
      if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_plugin_official_mkt_git_fallback", true)) {
        logFeatureBad("plugin_official_marketplace_fetch", "gcs_failed_fallback_disabled");
        logForDebugging("Skipping official marketplace bulk refresh: GCS failed, git fallback disabled");
        failed.push(key);
        continue;
      }
      usedGitFallback = true;
    }
    try {
      let { cachePath, keptStaleClone } = await loadAndCacheMarketplace(
        value.source,
        key,
        undefined,
        storageV5,
        key,
        undefined,
        knownMarketplacesWithDeclared,
      );
      if (!keptStaleClone)
        patches[key] = {
          forSource: value.source,
          patch: {
            lastUpdated: new Date().toISOString(),
            installLocation: cachePath,
          },
        };
      else if (cachePath !== value.installLocation)
        patches[key] = {
          forSource: value.source,
          patch: {
            installLocation: cachePath,
          },
        };
      if (usedGitFallback) logFeatureSad("plugin_official_marketplace_fetch", "gcs_failed_git_fallback");
    } catch (error) {
      if (usedGitFallback) logFeatureBad("plugin_official_marketplace_fetch", "gcs_and_git_failed");
      if (error instanceof CommandSourceError) {
        policyRefused.push(key);
        logForDebugging(`Marketplace ${key} not refreshed (managed policy): ${errorMessage(error)}`);
        continue;
      }
      failed.push(key);
      logForDebugging(`Failed to refresh marketplace ${key}: ${errorMessage(error)}`, {
        level: "error",
      });
    }
  }
  await updateKnownMarketplaces((config) => {
    let changed = false;
    for (let [key, { forSource, patch }] of Object.entries(patches)) {
      let entry = ownPropertyOrUndefined(config, key);
      if (!entry || !import_sortedIndex_2(entry.source, forSource) || seedDirFor(entry.installLocation))
        continue;
      config[key] = {
        ...entry,
        ...patch,
      };
      changed = true;
    }
    return changed ? config : null;
  }, storageV5);
  return {
    policyRefused,
    failed,
    attempted,
    builtInSkipped,
  };
}
//@ chunk-5xgkngpb.js:4418497-4418743 layout
/**
 * 刷新一个市场，同名刷新进行中时复用同一个 Promise 并追加进度监听（全局 marketplaceRefreshesInFlight）。
 */
function refreshMarketplaceDeduped(marketplaceName, storageV5, listener, options) {
  let { marketplaceRefreshesInFlight } = getPluginRegistry();
  let inFlight = marketplaceRefreshesInFlight.get(marketplaceName);
  if (inFlight) {
    if (listener) inFlight.listeners.push(listener);
    return inFlight.promise;
  }
  let listeners = listener ? [listener] : [];
  let promise = refreshMarketplace(
    marketplaceName,
    storageV5,
    (message) => {
      for (let listener of listeners) safeCallProgress(listener, message);
    },
    options,
  ).finally(() => marketplaceRefreshesInFlight.delete(marketplaceName));
  marketplaceRefreshesInFlight.set(marketplaceName, {
    promise,
    listeners,
  });
  return promise;
}
//@ chunk-5xgkngpb.js:4418743-4419499 layout
async function removeMarketplaceCacheDir(name, installLocation, storageV5, known) {
  let resolvedMarketplacesCacheDir = getResolvedMarketplacesCacheDir();
  let absolutePath = resolve_2(getOriginalCwd(), installLocation);
  if (
    classifyMarketplacePath(installLocation).suspect ||
    comparePathContainment(resolvedMarketplacesCacheDir, absolutePath, resolvedMarketplacesCacheDir) !==
      "inside"
  ) {
    let hint = claudeCommand("plugin marketplace remove", name);
    throw Error(
      `Marketplace '${quotedPrintable(name)}' has a corrupted installLocation (${printableOrEmpty(installLocation)}) \u2014 expected a path inside ${resolvedMarketplacesCacheDir}. This can happen after cross-platform path writes or manual edits to known_marketplaces.json. ${hint ? `Run \`${hint}\`` : "Remove the entry"} and re-add it.`,
    );
  }
  let owner = await checkMarketplaceDirCollision(
    resolvedMarketplacesCacheDir,
    absolutePath,
    name,
    storageV5,
    known,
  );
  if (owner !== undefined) {
    let hint = claudeCommand("plugin marketplace remove", name);
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Marketplace '${quotedPrintable(name)}' has a corrupted installLocation (${printableOrEmpty(installLocation)}) \u2014 it belongs to the registered marketplace ` +
        `'${quotedPrintable(owner)}'. ${hint ? `Run \`${hint}\`` : "Remove the entry"} and re-add it.`,
      "marketplace installLocation names another registered marketplace directory",
    );
  }
}
//@ chunk-5xgkngpb.js:4419499-4424276 fingerprint (2.1.88 match: refreshMarketplace, 0.552)
/**
 * 刷新一个市场：git pull/重新下载，校验后更新 lastUpdated；后台模式下失败只记日志。
 */
async function refreshMarketplace(marketplaceName, storageV5, onProgress, options) {
  let knownMarketplacesWithDeclared = await loadKnownMarketplacesWithDeclared(storageV5);
  let entry = ownPropertyOrUndefined(knownMarketplacesWithDeclared, marketplaceName);
  let trigger = options?.directoryTrigger ?? (options?.isBackground ? "background" : "update");
  if (
    !entry &&
    marketplaceName === OFFICIAL_MARKETPLACE_NAME &&
    isPluginDirectoryAvailable() &&
    isSourceAllowedByPolicy({
      source: "pluginDirectory",
    })
  ) {
    getPluginRegistry().marketplaces.delete(marketplaceName);
    let lastUpdated = options?.skipIfRecent
      ? (await pluginDirectoryModules?.pluginDirectoryRegistryEntry())?.lastUpdated
      : undefined;
    let ageMs = lastUpdated ? Date.now() - new Date(lastUpdated).getTime() : -1;
    if (ageMs >= 0 && ageMs < 30000) {
      logForDebugging(
        `Skipping refresh for marketplace '${marketplaceName}' \u2014 refreshed ${Math.round(ageMs / 1000)}s ago`,
      );
      return;
    }
    await loadPluginDirectoryMarketplace_2(options?.isBackground ? "if-stale" : "refresh", undefined, {
      staleIsFailure: true,
      trigger,
      signal: options?.directorySignal,
    });
    return;
  }
  if (!entry)
    throw withMarketplaceFailureCode(
      Error(
        `Marketplace '${marketplaceName}' not found. Available marketplaces: ${Object.keys(knownMarketplacesWithDeclared).join(", ")}`,
      ),
      "not_configured",
    );
  if (isPluginDirectorySource(entry.source) && pluginDirectoryPolicyBlock() !== null)
    throw withMarketplaceFailureCode(
      withTelemetryMessage(
        new PluginDirectoryUnavailableError(
          `${OFFICIAL_MARKETPLACE_DISPLAY} is blocked by your organization. ${pluginDirectoryPolicyBlockHint()}`,
        ),
        "Plugin directory marketplace refresh blocked by organization policy",
      ),
      "source_blocked_by_policy",
    );
  if (!isSourceAllowedByPolicy(entry.source))
    throw withMarketplaceFailureCode(
      Error(`Marketplace source '${formatSourceForDisplay(entry.source)}' is blocked by enterprise policy.`),
      "source_blocked_by_policy",
    );
  assertReservedNameTrusted(marketplaceName, entry);
  getPluginRegistry().marketplaces.delete(marketplaceName);
  if (options?.skipIfRecent && entry.lastUpdated) {
    let ageMs = Date.now() - new Date(entry.lastUpdated).getTime();
    if (ageMs >= 0 && ageMs < 30000) {
      logForDebugging(
        `Skipping refresh for marketplace '${marketplaceName}' \u2014 refreshed ${Math.round(ageMs / 1000)}s ago`,
      );
      return;
    }
  }
  if (isClaudeAiMarketplaceSource(entry.source)) {
    safeCallProgress(onProgress, "Refreshing plugin list from claude.ai");
    await refreshClaudeAiMarketplace(marketplaceName, entry.source, {
      credentials: undefined,
      skipIfRecent: options?.skipIfRecent,
      isBackground: options?.isBackground,
    });
    return;
  }
  if (isPluginDirectorySource(entry.source)) {
    safeCallProgress(onProgress, `Refreshing ${OFFICIAL_MARKETPLACE_DISPLAY}`);
    await loadPluginDirectoryMarketplace_2(options?.isBackground ? "if-stale" : "refresh", undefined, {
      staleIsFailure: true,
      trigger,
      signal: options?.directorySignal,
    });
    return;
  }
  if (entry.source.source === "settings") {
    assertNotLookAlikeName(marketplaceName, entry);
    logForDebugging(
      `Skipping refresh for settings-sourced marketplace '${marketplaceName}' \u2014 no upstream`,
    );
    return;
  }
  if (isDiskless()) throwDisklessMarketplaceFetch(join("plugins", "marketplaces"));
  let usedGcsFallbackToGit = false;
  let fetchResult;
  try {
    let { installLocation, source } = entry;
    let seedDir = seedDirFor(installLocation);
    if (seedDir)
      throw withMarketplaceFailureCode(
        Error(
          `Marketplace '${marketplaceName}' is seed-managed (${seedDir}) and its content is controlled by the seed image. To update: ask your admin to update the seed.`,
        ),
        "managed",
      );
    if (!isLocalMarketplaceSource(source))
      await removeMarketplaceCacheDir(
        marketplaceName,
        installLocation,
        storageV5,
        knownMarketplacesWithDeclared,
      );
    assertNotLookAlikeName(marketplaceName, entry);
    if (marketplaceName === CLAUDE_PLUGINS_OFFICIAL) {
      if (
        (await fetchOfficialMarketplaceFromGcs(
          installLocation,
          getResolvedMarketplacesCacheDir(),
          storageV5,
        )) !== null
      ) {
        logFeatureOk("plugin_official_marketplace_fetch");
        await touchMarketplaceLastUpdated(marketplaceName, storageV5);
        return;
      }
      if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_plugin_official_mkt_git_fallback", true)) {
        logFeatureBad("plugin_official_marketplace_fetch", "gcs_failed_fallback_disabled");
        throw Error("Official marketplace GCS fetch failed and git fallback is disabled");
      }
      usedGcsFallbackToGit = true;
      logForDebugging("Official marketplace GCS failed; falling back to git", {
        level: "warn",
      });
    }
    if (source.source === "github" || source.source === "git") {
      if (source.source === "github") {
        let sshUrl = `git@${GITHUB_HOST}:${source.repo}.git`;
        let httpsUrl = `https://github.com/${source.repo}.git`;
        if (preferHttpsGitTransport())
          fetchResult = await cacheMarketplaceFromGit(
            httpsUrl,
            installLocation,
            storageV5,
            source.path,
            source.ref,
            source.sparsePaths,
            onProgress,
          );
        else {
          let [firstAttempt, fallbackAttempt] = orderGithubTransports(
            await isGithubSshConfigured(),
            sshUrl,
            httpsUrl,
          );
          try {
            fetchResult = await cacheMarketplaceFromGit(
              firstAttempt.url,
              installLocation,
              storageV5,
              source.path,
              source.ref,
              source.sparsePaths,
              onProgress,
            );
          } catch (error) {
            logForDebugging(
              `Marketplace refresh failed with ${firstAttempt.transport} for ${source.repo} (${errorMessage(error)}), falling back to ${fallbackAttempt.transport}`,
              {
                level: "info",
              },
            );
            try {
              fetchResult = await cacheMarketplaceFromGit(
                fallbackAttempt.url,
                installLocation,
                storageV5,
                source.path,
                source.ref,
                source.sparsePaths,
                onProgress,
              );
            } catch (error_2) {
              throw mergeBothTransportErrors(
                {
                  ...firstAttempt,
                  error: toError(error),
                },
                {
                  ...fallbackAttempt,
                  error: toError(error_2),
                },
              );
            }
          }
        }
      } else
        fetchResult = await cacheMarketplaceFromGit(
          source.url,
          installLocation,
          storageV5,
          source.path,
          source.ref,
          source.sparsePaths,
          onProgress,
        );
      warnLfsPointers(installLocation, fetchResult, onProgress);
      try {
        await readMarketplaceManifest(
          installLocation,
          marketplaceName,
          storageV5,
          isStorageV5Enabled() && storageV5 !== undefined
            ? getMarketplaceStorageLocation(marketplaceName, source, installLocation)
            : null,
        );
      } catch (error) {
        let sourceLabel = source.source === "github" ? source.repo : redactUrlsTracked(source.url);
        let reason =
          marketplaceName === "claude-code-plugins"
            ? `We've deprecated "claude-code-plugins" in favor of "claude-plugins-official".`
            : "This marketplace may have been deprecated or moved to a new location.";
        let removeHint = claudeCommand("plugin marketplace remove", marketplaceName);
        let isParseError = error instanceof ConfigParseError;
        throw withMarketplaceFailureCode(
          Error(
            `The marketplace.json file is no longer present in this repository.

${reason}
Source: ${sourceLabel}` +
              (removeHint
                ? `

You can remove this marketplace with: ${removeHint}`
                : `

You can remove this marketplace from /plugin or by editing known_marketplaces.json.`) +
              (isParseError
                ? `

Details: the repository does have a marketplace.json, but it isn't a valid marketplace file: ${errorMessage(error)}`
                : ""),
          ),
          isENOENT(error) || getErrnoCode(error) === "EISDIR"
            ? "manifest_missing"
            : isParseError
              ? "manifest_invalid"
              : undefined,
        );
      }
    } else if (source.source === "url") {
      let helperHeaders = await describeHelperDeclaration(source, {
        marketplaceName,
        trustedDeclaration: findUrlMarketplaceHeaders(source, marketplaceName),
      });
      let storageKey =
        isStorageV5Enabled() && storageV5 !== undefined
          ? getSyntheticMarketplaceStorageKey(marketplaceName, source, installLocation)
          : null;
      if (storageV5 !== undefined && storageKey !== null)
        await cacheMarketplaceFromUrlToStorage(
          storageV5,
          storageKey,
          source.url,
          marketplaceName,
          helperHeaders,
          onProgress,
        );
      else
        await cacheMarketplaceFromUrlToFile(
          source.url,
          installLocation,
          marketplaceName,
          helperHeaders,
          onProgress,
        );
    } else if (isLocalMarketplaceSource(source)) {
      safeCallProgress(onProgress, "Validating local marketplace");
      await readMarketplaceManifest(
        installLocation,
        marketplaceName,
        storageV5,
        isStorageV5Enabled() && storageV5 !== undefined
          ? {
              kind: "hostFolder",
              space: "workspace",
            }
          : null,
      ).catch((error) => {
        throw withMarketplaceFailureCode(
          error,
          isENOENT(error) || getErrnoCode(error) === "EISDIR"
            ? "manifest_missing"
            : error instanceof ConfigParseError
              ? "manifest_invalid"
              : undefined,
        );
      });
    } else throw Error("Unsupported marketplace source type for refresh");
    if (fetchResult?.kind !== "kept-stale") await touchMarketplaceLastUpdated(marketplaceName, storageV5);
    if (usedGcsFallbackToGit) logFeatureSad("plugin_official_marketplace_fetch", "gcs_failed_git_fallback");
    logForDebugging(`Successfully refreshed marketplace: ${marketplaceName}`);
  } catch (error) {
    if (usedGcsFallbackToGit) logFeatureBad("plugin_official_marketplace_fetch", "gcs_and_git_failed");
    let errorMessage = error instanceof Error ? error.message : String(error);
    logForDebugging(`Failed to refresh marketplace ${marketplaceName}: ${errorMessage}`, {
      level: "error",
    });
    if (error instanceof CommandSourceError) throw error;
    if (errorMessage === RESERVED_MARKETPLACE_NAME_MESSAGE) throw error;
    throw withMarketplaceFailureCode(
      Error(`Failed to refresh marketplace '${marketplaceName}': ${errorMessage}`),
      getMarketplaceFailureCode(error),
    );
  }
}
//@ chunk-5xgkngpb.js:4424276-4425466 fingerprint (2.1.88 match: setMarketplaceAutoUpdate, 0.513)
/**
 * 设置某市场的 autoUpdate（写 known_marketplaces.json），市场不存在时报可用列表。
 */
async function setMarketplaceAutoUpdate(name, autoUpdate, storageV5) {
  let config = await loadKnownMarketplacesWithDeclared(storageV5);
  let entry = ownPropertyOrUndefined(config, name);
  if (!entry)
    throw Error(`Marketplace '${name}' not found. Available marketplaces: ${Object.keys(config).join(", ")}`);
  let seedDir = seedDirFor(entry.installLocation);
  if (seedDir)
    throw Error(
      `Marketplace '${name}' is seed-managed (${seedDir}) and auto-update is always disabled for seed content. To update: ask your admin to update the seed.`,
    );
  let seedDir_2 = findAutoUpdateOverrideSource(name);
  if (seedDir_2 !== null)
    throw Error(
      `Auto-update for '${name}' is set by ${seedDir_2} and can't be changed here. Update that settings source (or ask your admin to) instead.`,
    );
  if (entry.autoUpdate === autoUpdate) return;
  if (isClaudeAiMarketplaceSource(entry.source)) {
    await setMarketplaceAutoUpdateFlag(name, autoUpdate);
    logForDebugging(`Set autoUpdate=${autoUpdate} for marketplace: ${name}`);
    return;
  }
  if (isPluginDirectorySource(entry.source))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Auto-update can't be turned off for ${OFFICIAL_MARKETPLACE_DISPLAY}: its plugins follow the commit the Directory lists`,
      "plugin directory marketplace auto-update toggle refused",
    );
  await updateKnownMarketplaces((config) => {
    let entry = ownPropertyOrUndefined(config, name);
    if (!entry || entry.autoUpdate === autoUpdate || seedDirFor(entry.installLocation)) return null;
    config[name] = {
      ...entry,
      autoUpdate,
    };
    return config;
  }, storageV5);
  let declaringSource = supportsPersistence(name);
  if (declaringSource) {
    let declared = getMarketplaceDeclaringSource(getSettingsForSourceWriteSeed(declaringSource), name);
    if (declared) {
      let { error } = await saveMarketplaceToSettings(
        name,
        {
          source: declared.source,
          autoUpdate,
        },
        declaringSource,
        storageV5,
      );
      if (error)
        logForDebugging(
          `Failed to persist autoUpdate=${autoUpdate} for marketplace ${name} to ${declaringSource}: ${error.message}`,
          {
            level: "error",
          },
        );
    }
  }
  logForDebugging(`Set autoUpdate=${autoUpdate} for marketplace: ${name}`);
}
//@ chunk-5xgkngpb.js:4425466-4426015 placement
/**
 * 把设置中声明的市场 autoUpdate 同步到 known_marketplaces.json。
 */
async function syncDeclaredAutoUpdateToJson(storageV5) {
  let declaredMarketplaces = getDeclaredMarketplaces();
  if (Object.keys(declaredMarketplaces).length === 0) return false;
  try {
    return await updateKnownMarketplaces((config) => {
      let changed = false;
      for (let [key, value] of Object.entries(declaredMarketplaces)) {
        if (value.autoUpdate === undefined) continue;
        let entry = ownPropertyOrUndefined(config, key);
        if (!entry || seedDirFor(entry.installLocation)) continue;
        if (isPluginDirectorySource(entry.source)) continue;
        if (entry.autoUpdate === value.autoUpdate) continue;
        config[key] = {
          ...entry,
          autoUpdate: value.autoUpdate,
        };
        changed = true;
        logForDebugging(`Synced autoUpdate=${value.autoUpdate} from settings for marketplace: ${key}`);
      }
      return changed ? config : null;
    }, storageV5);
  } catch (error) {
    logForDebugging(
      `syncDeclaredAutoUpdateToJson: failed to update known_marketplaces.json: ${errorMessage(error)}`,
      {
        level: "error",
      },
    );
    return false;
  }
}
//@ chunk-5xgkngpb.js:4426015-4426165 placement
/**
 * 插件目录市场状态：on/off/blocked/unavailable。
 */
async function getPluginDirectoryState() {
  let directoryModule = pluginDirectoryModuleIfUsable();
  if (!directoryModule)
    return isPluginDirectoryModeOn() && pluginDirectoryPolicyBlock() !== null ? "blocked" : "unavailable";
  return (await directoryModule.isPluginDirectoryMarketplaceEnabled()) ? "on" : "off";
}
//@ chunk-5xgkngpb.js:4426165-4426577 placement
/**
 * 打开/关闭插件目录市场，不可用或被策略阻止时抛错。
 */
async function setPluginDirectoryEnabled(marketplace) {
  {
    let directoryModule = pluginDirectoryModuleIfUsable();
    if (!directoryModule)
      throw pluginDirectoryPolicyBlock() === null
        ? new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `The ${OFFICIAL_MARKETPLACE_DISPLAY} isn't available in this session`,
            "plugin directory marketplace toggled while unavailable",
          )
        : new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `${OFFICIAL_MARKETPLACE_DISPLAY} is blocked by your organization. ${pluginDirectoryPolicyBlockHint()}`,
            "plugin directory marketplace toggled while blocked by policy",
          );
    await directoryModule.setPluginDirectoryMarketplaceEnabled(marketplace);
    getPluginRegistry().marketplaces.delete(OFFICIAL_MARKETPLACE_NAME);
    return;
  }
  throw Error("Not available in this build");
}
//@ chunk-5xgkngpb.js:4426577-4426883 placement
/**
 * 当前值来自默认时把开关保存为用户的选择。
 */
async function persistPluginDirectoryChoice(enabled) {
  {
    let directoryModule = pluginDirectoryModuleIfUsable();
    if (!directoryModule) return;
    try {
      let pluginDirectoryMarketplaceChoice = await directoryModule.readPluginDirectoryMarketplaceChoice();
      if (
        pluginDirectoryMarketplaceChoice.source === "flag_default" &&
        pluginDirectoryMarketplaceChoice.enabled === enabled
      )
        await directoryModule.setPluginDirectoryMarketplaceEnabled(enabled);
    } catch (error) {
      logForDebugging(
        `Could not save "${enabled ? "on" : "off"}" as the person's choice for the ${OFFICIAL_MARKETPLACE_DISPLAY}: ${errorMessage(error)}`,
        {
          level: "warn",
        },
      );
    }
  }
}
//@ chunk-5xgkngpb.js:4426883-4427101 placement
function findEnablingSettingSource(pluginId, excluded) {
  let records = pluginSettingRecords(pluginId, SETTINGS_FILE_NAMES);
  let keys = normalizeCaseForComparison_2(
    records.flatMap(({ record }) => enabledPluginKeysFor(record, pluginId, excluded)),
  );
  for (let key of keys) {
    let found = records.find(({ record }) => record?.[key] !== undefined);
    let value = found?.record?.[key];
    if (found !== undefined && (value === true || Array.isArray(value))) return found.source;
  }
  return;
}
//@ chunk-5xgkngpb.js:4427101-4427139 placement
function enabledPluginKeysFor(record, pluginId, excluded) {
  return enabledPluginKeys(record, pluginId, excluded);
}
//@ chunk-5xgkngpb.js:4427139-4427234 placement
function hasDisabledEnabledPlugin(record, pluginId, excluded) {
  let keys = enabledPluginKeysFor(record, pluginId, excluded);
  return (
    keys.some((key) => record?.[key] === false) &&
    !keys.some((key) => isDependencyAutoInstallState(record?.[key]))
  );
}
//@ chunk-tmkr83ys.js:4813-5026 fingerprint (2.1.88 match: reconcileSparseCheckout, 0.534)
async function reconcileSparseCheckout(cwd, sparsePaths) {
  let [versionResult, sparseResult] = await Promise.all([
    runGit(sparsePaths, cwd, ["version"]),
    runGit(sparsePaths, cwd, ["config", "--type=bool", "--get", "core.sparseCheckout"]),
  ]);
  return (
    versionResult.code === 0 &&
    isGitVersionAtLeast236(parseGitVersion(versionResult.stdout)) &&
    sparseResult.code === 0 &&
    sparseResult.stdout.trim() === "true"
  );
}
export {
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
  loadKnownMarketplacesWithDeclared,
  getMarketplaceDeclaringSource,
  removeMarketplaceWithReservedSiblings,
  findSeedMarketplaceLocation,
  syncSeedMarketplaces,
  getDeclaredMarketplaces,
  splitMarketplaceCachePath,
  getCachePathForSource,
  getStorageArm,
  getMarketplace,
  isPluginDirectoryAvailable,
  refreshMarketplaceDeduped,
  isGitHubSshLikelyConfigured,
  settingsSourceOfMarketplace,
  lookalikeReservedMarketplaceName,
  normalizeInstallLocation,
  getPluginById,
  collectOrgBlockedPlugins,
  isListingBlocked,
  getPluginDirectoryState,
  formatSwitchNeedsFreshReadMessage,
  pluginDirectoryUnavailableKind,
  awaitPluginDirectoryVerdict,
  pluginDirectoryRefusalReason,
  lookUpPluginForSwitch,
  isPluginDirectoryListingBlocked,
  pluginDirectoryNotInstallableMessage,
  setPluginDirectoryEnabled,
  persistPluginDirectoryChoice,
  addMarketplaceSource,
  saveMarketplaceToSettings,
  findMarketplaceBySourceLoose,
  refreshAllMarketplaces,
  PLUGIN_DIRECTORY_CATALOG_MISSING,
  PluginDirectoryCatalogMissingError,
  gitPull,
  GIT_NO_PROMPT_ENV,
  registerSeedMarketplaces,
  updateKnownMarketplaces,
  getPluginByIdAnySource,
  getMarketplaceOrDirectoryCatalog,
  ensurePluginDirectoryCatalog,
  reconcileSparseCheckout,
  reservedMarketplaceSpellingMessage,
  syncDeclaredAutoUpdateToJson,
  findMarketplaceBySource,
  redactUrlCredentials,
  setMarketplaceAutoUpdate,
};
