/**
 * utils/plugins/marketplaceManager.ts
 *
 * 市场管理：known_marketplaces.json 读写（加锁）、按来源（github/git/url/npm/file/directory/settings）克隆或下载并缓存市场、添加/删除/刷新市场、按插件 ID 查条目。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/marketplaceManager.ts
 * pieces: chunk-dcmhvw5a.js (1), chunk-e6aww6q8.js (155), chunk-s61vbvea.js (1), chunk-sycgf9xs.js (1)
 * attribution: fingerprint 33, affinity 1, placement 22, layout 94, file-local 1, callgraph-fingerprint 2, sole-consumer 5
 */
import { join, resolve as resolve_2, sep, basename, dirname, isAbsolute } from "path";
import { writeFile } from "fs/promises";
import { execFileNoThrow, execFileNoThrowWithCwd, execGitNoThrow } from "../execFileNoThrow.js";
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
import { gitExe, forgetGitRootsUnder } from "../git.js";
import { GIT_SAFE_GLOBAL_ARGS } from "../git/gitSafeEnv.js";
import { buildGitEnvForRepo } from "../git/gitDirResolution.js";
import { listSubmodulePaths, listGitlinkEntries } from "../git/submoduleInspection.js";
import { msUntilDeadline, pickSubmodulesToFetch } from "./marketplaceSubmodules.js";
import {
  MAX_SCANNED_BYTES,
  probeMarketplaceCheckout,
  writeSparsePaths,
  checkGitLfsFiles,
  describeGitLfsMissing,
} from "./marketplaceGitCheckout.js";
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
  getPluginsDirectory,
  pluginRegistrySpace,
  relocateInstallPath,
  getPluginSeedDirs,
  getMarketplaceStorageKey,
  marketplaceCacheSpace,
  hasClaudeAiReservedPrefix,
  isUsingCoworkPlugins,
} from "./pluginDirectories.js";
import {
  isDiskless,
  getProjectConfigRoot,
  getOriginalCwd,
  getAdditionalDirectoriesForClaudeMd,
} from "../../bootstrap/state.js";
import {
  getAddDirEnabledPlugins,
  getAddDirExtraMarketplaces,
  SETTINGS_FILES,
} from "./addDirPluginSettings.js";
import {
  getInitialSettings_2,
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
  weakMap_11,
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
import { En, xr } from "../../../vendor/lodash-es/_inlinedHelpers.js";
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
import { isLocalMarketplaceSource } from "./reconciler.js";
import { writeAndPublishSync, writeFileAtomic as writeFileAtomic_2 } from "../atomicPublishWrite.js";
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
import { removeExtraMarketplace } from "../../commands/plugin/PluginSettings.js";
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
import { uniq } from "../collections.js";
import { getCachedCatalogPlugins } from "./installCounts.js";
import { logError } from "../log.js";
import { withDeadline } from "../sleep.js";
import { fetchOfficialMarketplaceFromGcs } from "./officialMarketplaceGcs.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { setMarketplaceAutoUpdateFlag } from "./pluginAutoupdate.js";
import { pluginSettingRecords } from "./pluginSettingsSources.js";
import { stripInvisibleChars } from "../sanitization.js";

//@ chunk-e6aww6q8.js:611593-611687 fingerprint = findSeedMarketplaceLocation (1)
/**
 * zip 缓存/种子目录中市场 JSON 的相对路径 marketplaces/<名字转义>.json。
 */
function findSeedMarketplaceLocation(marketplaceName) {
  let replaced = marketplaceName.replace(/[^a-zA-Z0-9\-_]/g, "-");
  return join("marketplaces", `${replaced}.json`);
}
//@ chunk-e6aww6q8.js:731294-731349 affinity
async function isGithubSshConfigured() {
  return (await isGitHubSshLikelyConfigured()) === "configured";
}
//@ chunk-e6aww6q8.js:731349-731913 fingerprint = isGitHubSshLikelyConfigured (0.894)
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
    let n = `${result.stdout ?? ""}
${result.stderr ?? ""}`;
    let configured = result.code === 1 && n.includes("successfully authenticated");
    logForDebugging(`SSH config check: code=${result.code} configured=${configured}`);
    if (configured) return "configured";
    if (result.timedOut) return "unknown";
    if (result.code === 255 && isSshAuthFailureOutput(n)) return "not-configured";
    return (await whichAsync("ssh")) === null ? "not-configured" : "unknown";
  } catch (error) {
    logForDebugging(`SSH configuration check failed: ${errorMessage(error)}`, {
      level: "warn",
    });
    return "unknown";
  }
}
//@ chunk-e6aww6q8.js:3591085-3591246 fingerprint = reconcileSparseCheckout (0.442)
/**
 * 已有克隆的 remote URL 与 sparse-checkout 配置是否需要重新对齐。
 */
async function reconcileSparseCheckout(cwd, sparsePaths) {
  let check = await execFileNoThrowWithCwd(
    gitExe(),
    [...GIT_SAFE_GLOBAL_ARGS, "config", "--get", `remote.${sparsePaths}.url`],
    {
      cwd,
      env: buildGitEnvForRepo(cwd),
      stdin: "ignore",
    },
  );
  return check.code === 0 && check.stdout.trim() !== "";
}
//@ chunk-e6aww6q8.js:4192802-4193818 fingerprint = gitSubmoduleUpdate (0.492)
/**
 * 市场克隆后更新子模块（受截止时间约束，失败给出进度提示）。
 */
async function gitSubmoduleUpdate({ checkoutDir, manifestPath, inCheckoutArgs, env, deadline }) {
  let y = {
    repository: inCheckoutArgs,
    env,
  };
  let S = await listSubmodulePaths(checkoutDir, {
    ...y,
    deadlineMs: msUntilDeadline(deadline),
  });
  if (Array.isArray(S) && S.length === 0)
    return {
      result: undefined,
      submodules: undefined,
    };
  let w = Array.isArray(S)
    ? await listGitlinkEntries(checkoutDir, {
        ...y,
        deadlineMs: msUntilDeadline(deadline),
      })
    : S;
  let L = new Set(Array.isArray(w) ? w : []);
  let G = Array.isArray(S) && Array.isArray(w) ? S.filter((we) => L.has(we)) : undefined;
  let q =
    G === undefined
      ? "all"
      : G.length === 0
        ? []
        : await pickSubmodulesToFetch({
            checkoutDir,
            manifestPath,
            submodules: G,
            inCheckoutArgs,
            env,
            deadline,
          });
  let Z = q !== "all" && q.join(" ").length <= MAX_SCANNED_BYTES ? q : "all";
  let Se = {
    recorded: G?.length,
    fetched: Z === "all" ? "all" : Z.length,
  };
  logForDebugging(
    `Marketplace clone: ${Se.recorded ?? "an unknown number of"} submodules recorded, fetching ${Se.fetched}`,
  );
  if (Se.fetched === 0)
    return {
      result: undefined,
      submodules: Se,
    };
  return {
    result: await execFileNoThrowWithCwd(
      gitExe(),
      [
        ...inCheckoutArgs,
        ...(Z === "all" ? ["-c", "submodule.active=."] : []),
        "submodule",
        "update",
        "--init",
        "--recursive",
        "--depth",
        "1",
        ...(Z === "all" ? [] : ["--", ...Z]),
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
    submodules: Se,
  };
}
//@ chunk-e6aww6q8.js:4224911-4224938 placement
/**
 * isWorkspaceTrustedForMarketplace：工作区是否已持久信任。
 */
function isWorkspaceTrustedForMarketplace() {
  return isWorkspacePersistedTrusted();
}
//@ chunk-e6aww6q8.js:4224938-4225011 placement
var pluginDirectoryModules = require("./chunk-s67w32sp.js");
var pluginDirectoryStatusModule = require("./chunk-yh2j89hr.js");
//@ chunk-e6aww6q8.js:4225011-4225058 placement
function pluginDirectoryModuleIfUsable() {
  return isPluginDirectoryModeOn() && pluginDirectoryPolicyBlock() === null ? pluginDirectoryModules : null;
}
//@ chunk-e6aww6q8.js:4225058-4225091 placement
/**
 * isPluginDirectoryAvailable：插件目录模块是否可用。
 */
function isPluginDirectoryAvailable() {
  return pluginDirectoryModuleIfUsable() !== null;
}
//@ chunk-e6aww6q8.js:4225091-4225125 fingerprint = getKnownMarketplacesFile (1)
var KNOWN_MARKETPLACES_FILENAME = "known_marketplaces.json";
//@ chunk-e6aww6q8.js:4225125-4225159 layout
function getKnownMarketplacesPath() {
  return join(getPluginsDirectory(), KNOWN_MARKETPLACES_FILENAME);
}
//@ chunk-e6aww6q8.js:4225159-4225194 layout
function getKnownMarketplacesPathForDisplay() {
  return isDiskless() ? KNOWN_MARKETPLACES_FILENAME : getKnownMarketplacesPath();
}
//@ chunk-e6aww6q8.js:4225194-4225236 fingerprint = getMarketplacesCacheDir (1)
function getMarketplacesStorageScope() {
  return pluginRegistrySpace("marketplaces");
}
//@ chunk-e6aww6q8.js:4234796-4235057 fingerprint = getDeclaredMarketplaces (1)
/**
 * 读取所有设置源里的 extraKnownMarketplaces（以及种子/托管声明），返回 名字→{source, sourceIsFallback…}。
 */
function getDeclaredMarketplaces() {
  let implicit = {};
  let enabledPlugins = {
    ...getAddDirEnabledPlugins(),
    ...(getInitialSettings_2().enabledPlugins ?? {}),
  };
  for (let [pluginId, value] of Object.entries(enabledPlugins))
    if (value && parsePluginIdentifier(pluginId).marketplace === CLAUDE_PLUGINS_OFFICIAL) {
      implicit[CLAUDE_PLUGINS_OFFICIAL] = {
        source: OFFICIAL_MARKETPLACE_SOURCE,
        sourceIsFallback: true,
      };
      break;
    }
  let r = isWorkspaceTrustedForMarketplace();
  let s = r
    ? normalizeLocalMarketplaceSources(getInitialSettings_2().extraKnownMarketplaces ?? {})
    : tryUnwrapTextPayload();
  return {
    ...implicit,
    ...(r ? getAddDirExtraMarketplaces() : {}),
    ...s,
  };
}
//@ chunk-e6aww6q8.js:4236073-4236366 placement = tryUnwrapTextPayload (0.311)
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
    operatorDeclaredMemo.inputs.every((input, S) => input === flattened[S])
  )
    return operatorDeclaredMemo.value;
  let h = {};
  for (let { extras } of nonRepoExtraMarketplaces)
    if (extras) h = mergeExtraKnownMarketplacesByEntry(h, extras);
  h = normalizeLocalMarketplaceSources(h);
  pluginRegistry.operatorDeclaredMemo = {
    inputs: flattened,
    value: h,
  };
  return h;
}
//@ chunk-e6aww6q8.js:4236366-4236511 placement
function normalizeLocalMarketplaceSources(e) {
  let n;
  for (let [key, value] of Object.entries(e)) {
    let h = normalizeLocalMarketplaceSource(value.source);
    if (h === value.source) continue;
    n ??= {
      ...e,
    };
    n[key] = {
      ...value,
      source: h,
    };
  }
  return n ?? e;
}
//@ chunk-e6aww6q8.js:4236511-4236553 placement
/**
 * settingsSourceOfMarketplace：市场记录所在的设置源。
 */
function settingsSourceOfMarketplace(e) {
  return ownPropertyOrUndefined(tryUnwrapTextPayload(), e)?.source;
}
//@ chunk-e6aww6q8.js:4236553-4236630 placement
function findMarketplaceSource(resolvedSource) {
  return Object.values(tryUnwrapTextPayload()).find((n) => En(n.source, resolvedSource))?.source;
}
//@ chunk-e6aww6q8.js:4242257-4242385 fingerprint = saveMarketplaceToSettings (1)
/**
 * 把市场写入某设置源（默认 userSettings）的 extraKnownMarketplaces。
 */
function saveMarketplaceToSettings(name, entry, r = "userSettings", storageV5) {
  return updateSettingsForSourceWithTransform(
    r,
    (h) => ({
      extraKnownMarketplaces: {
        ...h?.extraKnownMarketplaces,
        [name]: entry,
      },
    }),
    undefined,
    storageV5,
  );
}
//@ chunk-e6aww6q8.js:4242385-4242853 layout
/**
 * 读取 known_marketplaces.json，补上设置里 extraKnownMarketplaces 声明但尚未写盘的市场，以及（开启时）内置的 anthropic-plugin-directory 市场；返回 名字→KnownMarketplace。
 */
async function loadKnownMarketplacesWithDeclared(e) {
  let [knownMarketplacesConfig, claudeAiMarketplaceRegistry] = await Promise.all([
    loadKnownMarketplacesConfig(e),
    readClaudeAiMarketplaceRegistry(),
  ]);
  let s = filterAdmittedMarketplaces(knownMarketplacesConfig, getStorageArm(e));
  let h = s;
  for (let [key, value] of Object.entries(claudeAiMarketplaceRegistry)) {
    if (Object.hasOwn(s, key)) continue;
    if (h === s)
      h = {
        ...s,
      };
    h[key] = toKnownMarketplaceEntry(key, value);
  }
  let y = isPluginDirectoryModeOn() ? pluginDirectoryModules : null;
  if (y && !Object.hasOwn(h, OFFICIAL_MARKETPLACE_NAME)) {
    let w = pluginDirectoryPolicyBlock();
    if (w !== null) logDirectoryBlockedOnce(w);
    if (w !== null || (await y.isPluginDirectoryMarketplaceEnabled())) {
      if (h === s)
        h = {
          ...s,
        };
      h[OFFICIAL_MARKETPLACE_NAME] = await y.pluginDirectoryRegistryEntry();
    }
  }
  setCommandSourceNameRegistration(h[OFFICIAL_MARKETPLACE_NAME]?.source?.source);
  let S = weakMap_11.get(s);
  if (h !== s && S !== undefined) weakMap_11.set(h, S);
  return h;
}
//@ chunk-e6aww6q8.js:4242853-4242916 layout
/**
 * 存储模式：storageV5 可用为 "v5"，否则 "raw"。
 */
function getStorageArm(e) {
  return isStorageV5Enabled() && e !== undefined && getMarketplacesStorageScope() !== null ? "v5" : "raw";
}
//@ chunk-e6aww6q8.js:4242916-4244446 fingerprint = loadKnownMarketplacesConfig (0.657)
/**
 * 读 known_marketplaces.json 并用 KnownMarketplacesFileSchema 校验，非法条目（保留名、来源不合法）丢弃并记日志；读不到抛 TelemetrySafeError。
 */
async function loadKnownMarketplacesConfig(e) {
  let n = isStorageV5Enabled() && e !== undefined ? getMarketplacesStorageScope() : null;
  if (e !== undefined && n !== null) {
    let fs = getKnownMarketplacesPathForDisplay();
    let h = await e.read([n]);
    if (!h.ok) {
      let L = `Failed to load marketplace configuration: ${formatStorageError(h.error)}`;
      logForDebugging(L, {
        level: "error",
      });
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        L,
        "failed to load marketplace configuration (v5 backend error)",
      );
    }
    let y = h.value.items[0];
    if (y === undefined) {
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
    if (!y.found) return {};
    let S;
    try {
      S = jsonParse(Buffer.from(y.value).toString("utf-8"));
    } catch (error) {
      let G = `Failed to load marketplace configuration: ${errorMessage(error)}`;
      logForDebugging(G, {
        level: "error",
      });
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        G,
        "failed to load marketplace configuration (v5 parse error)",
      );
    }
    let w = KnownMarketplacesFileSchema().safeParse(S);
    if (!w.success) {
      let L = `Marketplace configuration file is corrupted: ${w.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join(", ")}`;
      logForDebugging(L, {
        level: "error",
      });
      throw new ConfigParseError(L, fs, S);
    }
    return normalizeInstallLocations(w.data);
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
//@ chunk-e6aww6q8.js:4244446-4244564 layout
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
//@ chunk-e6aww6q8.js:4244564-4244669 layout
function normalizeInstallLocations(e) {
  for (let n of Object.values(e)) n.installLocation = normalizeInstallLocation(n.source, n.installLocation);
  return e;
}
//@ chunk-e6aww6q8.js:4244669-4244749 layout
/**
 * 同 loadKnownMarketplacesWithDeclared，但读失败时返回一个被标记为“读失败”的空对象（isKnownMarketplacesReadFailure 可判断），调用方据此区分“没有市场”和“读不到”。
 */
async function loadKnownMarketplacesSafe(e) {
  try {
    return await loadKnownMarketplacesWithDeclared(e);
  } catch {
    let n = {};
    failedKnownMarketplacesReads.add(n);
    return n;
  }
}
//@ chunk-e6aww6q8.js:4244749-4244769 layout
var failedKnownMarketplacesReads = new WeakSet();
//@ chunk-e6aww6q8.js:4244769-4244803 layout
/**
 * 判断一个已知市场表对象是否为“读失败”占位。
 */
function isKnownMarketplacesReadFailure(e) {
  return failedKnownMarketplacesReads.has(e);
}
//@ chunk-e6aww6q8.js:4244803-4245409 fingerprint = saveKnownMarketplacesConfig (0.43)
/**
 * 校验后写回 known_marketplaces.json（原子写），失败抛错。
 */
async function saveKnownMarketplacesConfig(e, n, r = new Map()) {
  let storageArm = getStorageArm(n);
  let h = omitPluginDirectoryEntries(omitClaudeAiMarketplaces(e));
  for (let [q, Z] of r) {
    if (releasedRegistryEntries()[storageArm].has(q)) continue;
    if (!Object.hasOwn(h, q))
      h = {
        ...h,
        [q]: Z,
      };
  }
  let parsed = KnownMarketplacesFileSchema().safeParse(h);
  if (!parsed.success)
    throw new ConfigParseError(
      `Invalid marketplace config: ${parsed.error.message}`,
      getKnownMarketplacesPathForDisplay(),
      h,
    );
  let S = isStorageV5Enabled() && n !== undefined ? getMarketplacesStorageScope() : null;
  if (isStorageV5Enabled() && n !== undefined && S !== null) {
    let q = await n.write(S, jsonStringify(parsed.data, null, 2), {
      mode: 438 & ~process.umask(),
    });
    if (!q.ok)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Failed to save marketplace configuration: ${formatStorageError(q.error)}`,
        "failed to save marketplace configuration (v5 backend error)",
      );
    return;
  }
  let configFile = getFsImplementation();
  let fs = getKnownMarketplacesPath();
  let dir = join(fs, "..");
  await configFile.mkdir(dir);
  writeAndPublishSync(fs, jsonStringify(parsed.data, null, 2));
}
//@ chunk-e6aww6q8.js:4245409-4245422 layout
var knownMarketplacesWriteQueue = createKeyedQueue();
//@ chunk-e6aww6q8.js:4245422-4245456 layout
function drainKnownMarketplacesWrites() {
  return knownMarketplacesWriteQueue.drain();
}
//@ chunk-e6aww6q8.js:4245456-4245465 layout
registerWriteQueueDrain(drainKnownMarketplacesWrites);
//@ chunk-e6aww6q8.js:4245465-4246111 layout
/**
 * 对 known_marketplaces.json 做串行化的读-改-写：进程内队列 + proper-lockfile 文件锁（.lock，重试 5 次）；回调返回 null 表示不写；存储后端模式下走存储层。
 */
async function updateKnownMarketplaces(e, n) {
  if (isDiskless()) {
    if (getStorageArm(n) === "raw") {
      warnDisklessSettingsWrite("known_marketplaces", KNOWN_MARKETPLACES_FILENAME);
      return false;
    }
    return knownMarketplacesWriteQueue.run(KNOWN_MARKETPLACES_FILENAME, () =>
      updateKnownMarketplacesLocked(e, n),
    );
  }
  let knownMarketplacesPath = getKnownMarketplacesPath();
  return knownMarketplacesWriteQueue.run(knownMarketplacesPath, async () => {
    await getFsImplementation().mkdir(join(knownMarketplacesPath, ".."));
    let h;
    let y = false;
    try {
      h = await lock(knownMarketplacesPath, {
        lockfilePath: `${knownMarketplacesPath}.lock`,
        realpath: false,
        retries: {
          retries: 5,
          minTimeout: 100,
          maxTimeout: 1000,
        },
        onCompromised: (S) => {
          logForDebugging(`known_marketplaces.json lock compromised: ${S}`, {
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
      y = true;
    }
    try {
      let S = await updateKnownMarketplacesLocked(e, n);
      if (S && y) logEvent("tengu_known_marketplaces_fallback_write", {});
      return S;
    } finally {
      await releaseLockQuietly(h, "known_marketplaces.json");
    }
  });
}
//@ chunk-e6aww6q8.js:4246111-4246231 layout
async function updateKnownMarketplacesLocked(e, n) {
  let knownMarketplacesWithDeclared = await loadKnownMarketplacesWithDeclared(n);
  let s = new Map(hiddenRegistryEntries()[getStorageArm(n)]);
  let h = e(knownMarketplacesWithDeclared);
  if (h === null) return false;
  await saveKnownMarketplacesConfig(h, n, s);
  return true;
}
//@ chunk-e6aww6q8.js:4246231-4246365 layout
async function touchMarketplaceLastUpdated(marketplaceName, storageV5) {
  await updateKnownMarketplaces((r) => {
    let s = ownPropertyOrUndefined(r, marketplaceName);
    if (!s) return null;
    r[marketplaceName] = {
      ...s,
      lastUpdated: new Date().toISOString(),
    };
    return r;
  }, storageV5);
}
//@ chunk-e6aww6q8.js:4246365-4246607 layout
/**
 * 把种子目录（CLAUDE_CODE_PLUGIN_SEED_DIR 等）里登记的市场同步进 known_marketplaces.json，有变化返回 true。
 */
async function syncSeedMarketplaces(e) {
  let n = await registerSeedMarketplaces(e);
  if (n.length === 0) return false;
  let r = 0;
  await updateKnownMarketplaces((s) => {
    for (let [h, y] of n) {
      if (En(ownPropertyOrUndefined(s, h), y)) continue;
      s[h] = y;
      r++;
    }
    return r > 0 ? s : null;
  }, e);
  if (r > 0) {
    logForDebugging(`Synced ${r} marketplace(s) from seed dir(s)`);
    return true;
  }
  return false;
}
//@ chunk-e6aww6q8.js:4246607-4246991 fingerprint = registerSeedMarketplaces (0.805)
/**
 * 扫描 CLAUDE_CODE_PLUGIN_SEED_DIR 下各种子目录的 known_marketplaces.json，返回可登记的 [名字, 条目]（同名先到先得）。
 */
async function registerSeedMarketplaces(e) {
  let claimed = new Set();
  let changed = [];
  for (let seedDir of getPluginSeedDirs()) {
    let seedConfig = await readSeedKnownMarketplaces(seedDir);
    if (!seedConfig) continue;
    for (let [name, seedEntry] of Object.entries(seedConfig)) {
      if (claimed.has(name)) continue;
      let resolvedLocation = await findSeedMarketplaceCatalog(seedDir, name, e);
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
//@ chunk-e6aww6q8.js:4246991-4247362 fingerprint = readSeedKnownMarketplaces (1)
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
//@ chunk-e6aww6q8.js:4247362-4247580 layout
async function findSeedMarketplaceCatalog(seedDir, name, r) {
  let dirCandidate = join(seedDir, "marketplaces", name);
  let jsonCandidate = join(seedDir, "marketplaces", `${name}.json`);
  for (let candidate of [dirCandidate, jsonCandidate])
    try {
      await readMarketplaceManifest(
        candidate,
        undefined,
        r,
        isStorageV5Enabled() && r !== undefined
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
//@ chunk-e6aww6q8.js:4247580-4247678 file-local
/**
 * 返回包含该安装位置的种子目录（不在任何种子目录下返回 undefined）；种子目录下的市场/插件只读、不刷新。
 */
function seedDirFor(installLocation) {
  let n = resolve_2(installLocation);
  return getPluginSeedDirs().find((r) => {
    let s = resolve_2(r);
    return n === s || n.startsWith(s + sep);
  });
}
//@ chunk-e6aww6q8.js:4247678-4247707 layout
var DEFAULT_GIT_TIMEOUT_MS = 120000;
var CLONE_TEMP_SUFFIX = "..clone";
//@ chunk-e6aww6q8.js:4247707-4247803 fingerprint = getPluginGitTimeoutMs (1)
function getPluginGitTimeoutMs() {
  let envValue = env.CLAUDE_CODE_PLUGIN_GIT_TIMEOUT_MS;
  if (envValue !== undefined && envValue > 0) return envValue;
  return DEFAULT_GIT_TIMEOUT_MS;
}
//@ chunk-e6aww6q8.js:4247803-4248068 layout
async function marketplacePathExists(e, nestedPath, r) {
  let s =
    isStorageV5Enabled() && e !== undefined
      ? getMarketplaceStorageKey(nestedPath, getPluginsDirectory())
      : null;
  if (e === undefined || s === null) return r();
  let h = await e.statMeta(s);
  if (h.ok) return true;
  let telemetryCode =
    "telemetryCode" in h.error && typeof h.error.telemetryCode === "string"
      ? h.error.telemetryCode
      : undefined;
  return isNonRegularError(telemetryCode) ? r() : false;
}
//@ chunk-e6aww6q8.js:4248068-4248187 fingerprint = readCachedMarketplace (0.788)
function readCachedMarketplace_2(e, n) {
  let nestedPath = join(n, ".claude-plugin", "marketplace.json");
  return marketplacePathExists(e, nestedPath, () =>
    getFsImplementation()
      .stat(nestedPath)
      .then(
        () => true,
        () => false,
      ),
  );
}
//@ chunk-e6aww6q8.js:4248187-4248286 layout
function orderGithubTransports(e, url, url_2) {
  let s = {
    transport: "SSH",
    url,
  };
  let h = {
    transport: "HTTPS",
    url: url_2,
  };
  return e ? [s, h] : [h, s];
}
//@ chunk-e6aww6q8.js:4248286-4248529 layout
function mergeBothTransportErrors(e, n) {
  if (e.error.message !== n.error.message)
    n.error.message = `Fetching the marketplace from GitHub failed on both attempts. ${e.transport} (${e.url}): ${e.error.message}

${n.transport} (${n.url}): ${n.error.message}`;
  return n.error;
}
//@ chunk-e6aww6q8.js:4248529-4248706 fingerprint = isAuthenticationError (1)
function isAuthenticationError(stderr) {
  return (
    stderr.includes("Authentication failed") ||
    stderr.includes("could not read Username") ||
    stderr.includes("terminal prompts disabled") ||
    stderr.includes("403") ||
    stderr.includes("401")
  );
}
//@ chunk-e6aww6q8.js:4248706-4248801 layout = ghIsDangerousCallback (1)
function getScpRemoteHost(e) {
  if (e.includes("://")) return null;
  return e.match(/^[^:]*@([^@:]+):/)?.[1] ?? null;
}
//@ chunk-e6aww6q8.js:4248801-4248907 layout
function gitHostDisplayName(url) {
  let hostFromSource = extractHostFromSource({
    source: "git",
    url,
  });
  if (hostFromSource === null) return "your git host";
  return isGithubDotCom(hostFromSource) ? "GitHub" : hostFromSource;
}
//@ chunk-e6aww6q8.js:4248907-4249152 layout
function credentialHelperHint(url) {
  let hostFromSource = extractHostFromSource({
    source: "git",
    url,
  });
  if (hostFromSource !== null && isGithubDotCom(hostFromSource))
    return "your credential helper is configured (e.g., gh auth login)";
  return `your git credential helper has valid credentials for ${hostFromSource ?? "this host"} (e.g., a personal access token)`;
}
//@ chunk-e6aww6q8.js:4249152-4252358 fingerprint = gitClone (0.829)
/**
 * 克隆市场仓库：校验 ref/URL（拒绝 - 开头参数与危险协议）、--depth 1、可选 sparse-checkout、禁用交互提示与 LFS、超时 CLAUDE_CODE_PLUGIN_GIT_TIMEOUT_MS。
 */
async function gitClone(url, n, ref, sparsePaths, manifestPath) {
  let y = pluginGitUrlError(url);
  if (y !== null)
    return {
      code: 1,
      stderr: `Refusing to clone. ${y.message}`,
    };
  let useSparse = sparsePaths && sparsePaths.length > 0;
  let { pinArgs, inCheckoutArgs, env } = runGitWithCeilingDirs(n, await resolveGitSshConfig(url));
  let args = [...SSH_BATCH_CONFIG_ARGS, ...pinArgs, "clone", "--depth", "1"];
  if (useSparse) {
    if (isNetworkGitUrl(url)) args.push("--filter=blob:none");
    args.push("--no-checkout");
  } else args.push("--no-recurse-submodules");
  if (ref) args.push("--branch", ref);
  args.push("--", url, n);
  let timeoutMs = getPluginGitTimeoutMs();
  logForDebugging(`git clone: url=${redactUrlQuery(url)} ref=${ref ?? "default"} timeout=${timeoutMs}ms`);
  let startTime = performance.now();
  let result = await execFileNoThrowWithCwd(gitExe(), args, {
    ...(await prepareGitWorkDir(n, env)),
    timeout: timeoutMs,
    stdin: "ignore",
  });
  let we =
    result.code === 0 && !useSparse
      ? await gitSubmoduleUpdate({
          checkoutDir: n,
          manifestPath,
          inCheckoutArgs,
          env,
          deadline: startTime + timeoutMs,
        })
      : undefined;
  let result_2 = {
    ...(we?.result ?? result),
    submodules: we?.submodules,
  };
  if (result_2.error) result_2.error = redactKnownUrls(result_2.error, url);
  if (result_2.stderr) result_2.stderr = redactKnownUrls(result_2.stderr, url);
  if (result_2.code === 0) {
    if (useSparse) {
      let redacted = pickGitNoPromptEnv(env);
      let Ie = await runGitInOwnWorkTree(
        n,
        [...inCheckoutArgs, "sparse-checkout", "set", "--cone", "--", ...sparsePaths],
        redacted,
        {
          timeout: timeoutMs,
        },
      );
      if (Ie.code !== 0)
        return {
          code: Ie.code,
          stderr: `git sparse-checkout set failed: ${redactKnownUrls(Ie.stderr, url)}`,
        };
      let checkoutResult = await runGitInOwnWorkTree(
        n,
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
//@ chunk-e6aww6q8.js:4252358-4252460 fingerprint = safeCallProgress (1)
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
//@ chunk-e6aww6q8.js:4252460-4252641 layout
function throwDisklessMarketplaceFetch(e) {
  warnDisklessSettingsWrite("marketplace_cache", e);
  throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    "Marketplaces can't be fetched in this session, because it can't save them",
    "marketplace fetch refused in a diskless session",
  );
}
//@ chunk-e6aww6q8.js:4252641-4255727 fingerprint = cacheMarketplaceFromGit (0.416)
/**
 * git 来源市场的缓存：已有克隆则 fetch/pull 刷新（失败可回退），否则克隆；GitHub 来源按 SSH/HTTPS 顺序各试一次。
 */
async function cacheMarketplaceFromGit(url, n, storageV5, path, ref, sparsePaths, onProgress) {
  let fs = getFsImplementation();
  let pluginGitTimeoutMs = getPluginGitTimeoutMs();
  let timeoutSec = Math.round(pluginGitTimeoutMs / 1000);
  switch (
    (safeCallProgress(onProgress, `Refreshing marketplace cache (timeout: ${timeoutSec}s)\u2026`),
    await probeMarketplaceCheckout(n, url, {
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
        (await readCachedMarketplace_2(storageV5, n))
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
  let Z = `${n}.bak`;
  let Se = `${basename(n)}.bak`;
  let { owner } = await findMarketplaceNameOwner(dirname(n), Se, storageV5, {
    isSelf: (ze) => ze === basename(n),
  });
  if (owner !== undefined)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Cannot fetch marketplace ${jsonStringify(basename(n))}: the directory it would use as its backup (${Z}) is the registered marketplace ${jsonStringify(owner)}'s directory. Remove or rename that marketplace first (claude plugin marketplace remove).`,
      "marketplace backup path is another marketplace clone",
    );
  try {
    await fs.rename(Z, n);
    forgetGitRootsUnder(n);
  } catch (error) {
    if (!isENOENT(error)) {
      if (!(await readCachedMarketplace_2(storageV5, n))) {
        await removeDirectoryTreeNoFollow_2(n).catch(() => {});
        await fs.rename(Z, n);
        forgetGitRootsUnder(n);
      }
    }
  }
  try {
    await removeDirectoryTreeNoFollow_2(Z);
  } catch (error) {
    throw Error(`Failed to clean up stale marketplace backup directory. Please manually delete the directory at ${Z} and try again.

Technical details: ${errorMessage(error)}`);
  }
  let we = join(dirname(n), `${basename(n)}${CLONE_TEMP_SUFFIX}`);
  try {
    await removeDirectoryTreeNoFollow_2(we);
  } catch (error) {
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Failed to clean up a leftover marketplace staging directory. Please manually delete the directory at ${we} and try again.

Technical details: ${errorMessage(error)}`,
      "Failed to clean up a leftover marketplace staging directory",
    );
  }
  let Ee = ref ? ` (ref: ${ref})` : "";
  safeCallProgress(onProgress, `Cloning repository (timeout: ${timeoutSec}s): ${redactUrlQuery(url)}${Ee}`);
  let pullStarted = performance.now();
  let Ie = await gitClone(url, we, ref, sparsePaths, path);
  logPluginFetch(
    "marketplace_clone",
    url,
    Ie.code === 0 ? "success" : "failure",
    performance.now() - pullStarted,
    Ie.code === 0 ? undefined : classifyFetchError(Ie.stderr),
    undefined,
    Ie.submodules,
  );
  if (Ie.code !== 0) {
    await removeDirectoryTreeNoFollow_2(we).catch(() => {});
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Failed to clone marketplace repository: ${Ie.stderr}`,
      `Failed to clone marketplace repository: ${classifyFetchError(Ie.stderr)} (exit ${Ie.code})`,
    );
  }
  try {
    await writeSparsePaths(we, sparsePaths);
  } catch (error) {
    logForDebugging(`Could not record the marketplace clone's sparse paths: ${errorMessage(error)}`, {
      level: "warn",
    });
  }
  let lfsPointerScan = await checkGitLfsFiles(we);
  let We = false;
  try {
    await fs.rename(n, Z);
    We = true;
    safeCallProgress(onProgress, "Replacing the existing marketplace clone\u2026");
  } catch (rmError) {
    let rmErrorMsg = getErrnoCode(rmError);
    if (rmErrorMsg !== "ENOENT") {
      await removeDirectoryTreeNoFollow_2(we).catch(() => {});
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        rmErrorMsg === "EBUSY" || rmErrorMsg === "EPERM" || rmErrorMsg === "EACCES"
          ? `Could not replace the marketplace directory at ${n} because it is in use; the existing copy was kept and the next refresh will try again.

Technical details: ${errorMessage(rmError)}`
          : `Failed to move the existing marketplace directory aside. Please manually delete the directory at ${n} and try again.

Technical details: ${errorMessage(rmError)}`,
        "Failed to move the existing marketplace directory aside",
      );
    }
  }
  try {
    await fs.rename(we, n);
    forgetGitRootsUnder(n);
  } catch (error) {
    if (We)
      await fs
        .rename(Z, n)
        .then(() => forgetGitRootsUnder(n))
        .catch(() => {});
    await removeDirectoryTreeNoFollow_2(we).catch(() => {});
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Failed to move the new marketplace clone into place at ${n}. Please try again.

Technical details: ${errorMessage(error)}`,
      "Failed to move the new marketplace clone into place",
    );
  }
  if (We) await removeDirectoryTreeNoFollow_2(Z).catch(() => {});
  safeCallProgress(onProgress, "Clone complete, validating marketplace\u2026");
  return {
    kind: "cloned",
    lfsPointerScan,
  };
}
//@ chunk-e6aww6q8.js:4255727-4255868 layout
function warnLfsPointers(e, n, r) {
  if (n?.kind !== "cloned") return;
  let s = describeGitLfsMissing(e, n.lfsPointerScan);
  if (s === null) return;
  logForDebugging(`[git-lfs] ${s}`, {
    level: "warn",
  });
  safeCallProgress(r, s);
}
//@ chunk-e6aww6q8.js:4255868-4255918 fingerprint = redactHeaders (0.878)
function redactHeaders(headers) {
  return xr(headers, () => "***REDACTED***");
}
//@ chunk-e6aww6q8.js:4255918-4257447 fingerprint = cacheMarketplaceFromUrl (0.867)
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
    let Z = (message) => message.replaceAll(url, () => redactedUrl);
    if (isAxiosError(error)) {
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND")
        throw Error(`Could not connect to ${redactedUrl}. Please check your internet connection and verify the URL is correct.

Technical details: ${Z(error.message)}`);
      if (error.code === "ETIMEDOUT")
        throw Error(`Request timed out while downloading marketplace from ${redactedUrl}. The server may be slow or unreachable.

Technical details: ${Z(error.message)}`);
      if (error.response)
        throw Error(`HTTP ${error.response.status} error while downloading marketplace from ${redactedUrl}. The marketplace file may not exist at this URL.

Technical details: ${Z(error.message)}`);
    }
    throw Error(`Failed to download marketplace from ${redactedUrl}: ${Z(errorMessage(error))}`);
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
//@ chunk-e6aww6q8.js:4257447-4257603 layout
async function cacheMarketplaceFromUrlToFile(url, n, cachePath, customHeaders, onProgress) {
  let fsImplementation = getFsImplementation();
  let S = await cacheMarketplaceFromUrl(url, cachePath, customHeaders, onProgress);
  safeCallProgress(onProgress, "Saving marketplace to cache");
  let dir = join(n, "..");
  await fsImplementation.mkdir(dir);
  await writeFileAtomic_2(n, jsonStringify(S, null, 2));
}
//@ chunk-e6aww6q8.js:4257603-4257894 fingerprint = getCachePathForSource (0.821)
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
//@ chunk-e6aww6q8.js:4257894-4257983 layout = readJsonFile (0.83)
/**
 * 读取 UTF-8 文件并按 schema 解析（共享指纹误归 agentMemorySnapshot）。
 */
async function readJsonFileWithSchema(path, schema) {
  let content = await getFsImplementation().readFile(path, {
    encoding: "utf-8",
  });
  return parseFileWithSchema(content, path, schema);
}
//@ chunk-e6aww6q8.js:4257983-4258249 fingerprint = parseFileWithSchema (0.801)
/**
 * 读 JSON 文本（去 BOM）并用 zod schema 校验，失败抛带路径的错误。
 */
function parseFileWithSchema(e, n, schema) {
  let data;
  try {
    data = jsonParse(stripBom(e));
  } catch (error) {
    throw new ConfigParseError(`Invalid JSON in ${n}: ${errorMessage(error)}`, n, e);
  }
  let result = schema.safeParse(data);
  if (!result.success)
    throw new ConfigParseError(
      `Invalid schema: ${n} ${result.error?.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`,
      n,
      data,
    );
  return result.data;
}
//@ chunk-e6aww6q8.js:4258249-4259634 layout
/**
 * 解析下载到的 marketplace.json：schema 校验、保留名来源校验，失败抛 manifest_invalid 类错误。
 */
async function parseAndValidateFetchedMarketplace(
  e,
  source,
  r,
  temporaryCachePath,
  cacheDir,
  marketplaceName,
  S,
  w,
  known,
  selfKey,
) {
  let q;
  try {
    q = parseFileWithSchema(
      r,
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
  let Z = validateOfficialNameSource(q.name, source);
  if (Z)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      Z,
      "marketplace reserved-name/source validation failed",
    );
  await w?.(q.name);
  if (!isValidMarketplaceDirName(q.name))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Marketplace name ${jsonStringify(q.name)} is not a plain directory name; refusing to cache it`,
      "fetched url marketplace name is not a plain cache component",
    );
  await assertMarketplaceNameAvailable(cacheDir, q.name, e, {
    known,
    selfKey,
    source,
  });
  let Se = marketplaceCacheSpace(q.name, "catalog", getPluginsDirectory());
  if (Se === null)
    return {
      declined: q,
    };
  let ke = join(cacheDir, q.name);
  safeCallProgress(S, "Saving marketplace to cache");
  let we = () =>
    e.write(Se, r, {
      publishDiscipline: "atomic",
      mode: 438 & ~process.umask(),
    });
  let Ee = await we();
  if (
    !Ee.ok &&
    Ee.error.code === "Failed" &&
    (isNonRegularError(Ee.error.telemetryCode) ||
      (await e.scopeKind(marketplaceCacheKey(q.name)).then(
        (Ae) => Ae.ok && Ae.value.kind === "directory",
        () => false,
      )))
  ) {
    try {
      await removeDirectoryTreeNoFollow_2(ke);
    } catch (error) {
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Failed to finalize marketplace cache. Please manually delete the directory at ${ke} if it exists and try again.

Technical details: ${errorMessage(error)}`,
        "failed to remove a clone directory holding the url catalog name",
      );
    }
    Ee = await we();
  }
  if (!Ee.ok)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Failed to write marketplace catalog: ${formatStorageError(Ee.error)}`,
      "failed to write marketplace catalog (v5 backend error)",
    );
  return {
    published: {
      marketplace: q,
      cachePath: ke,
      keptStaleClone: false,
    },
  };
}
//@ chunk-e6aww6q8.js:4259634-4259950 layout
async function cacheMarketplaceFromUrlToStorage(storageV5, n, url, cachePath, customHeaders, onProgress) {
  let S = await cacheMarketplaceFromUrl(url, cachePath, customHeaders, onProgress);
  safeCallProgress(onProgress, "Saving marketplace to cache");
  let w = await storageV5.write(n, jsonStringify(S, null, 2), {
    publishDiscipline: "atomic",
    mode: 438 & ~process.umask(),
  });
  if (!w.ok)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Failed to write marketplace catalog: ${formatStorageError(w.error)}`,
      "failed to write marketplace catalog (v5 backend error)",
    );
}
//@ chunk-e6aww6q8.js:4259950-4265413 fingerprint = loadAndCacheMarketplace (0.572)
/**
 * 按来源（github/git/url/npm/file/directory/settings）获取并缓存市场目录，校验企业策略（blockedMarketplaces/strictKnownMarketplaces）、保留名来源、marketplace.json schema；返回 {marketplace, cachePath}。
 */
async function loadAndCacheMarketplace(
  source,
  marketplaceName,
  onProgress,
  s,
  h,
  y,
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
  let selfKey = y === undefined ? h : undefined;
  let schema = getPluginMarketplaceSchemaFor(marketplaceNameUnlessCowork(marketplaceName));
  await fs.mkdir(cacheDir);
  let temporaryCachePath;
  let path;
  let we = false;
  let Ee;
  let Ae;
  let Ie;
  let tempName = getCachePathForSource(source);
  let We = source.source === "github" && (await checkCloneDirOwnedByOther(cacheDir, tempName, source, s));
  try {
    switch (source.source) {
      case "url": {
        temporaryCachePath = join(cacheDir, `${tempName}.json`);
        if (isStorageV5Enabled() && s !== undefined && !refuseNameCollision) {
          let gt = await cacheMarketplaceFromUrl(
            source.url,
            marketplaceName,
            await describeHelperDeclaration(source, {
              marketplaceName: h,
              trustedDeclaration: findUrlMarketplaceHeaders(source, h),
            }),
            onProgress,
          );
          let At = jsonStringify(gt, null, 2);
          let It = await parseAndValidateFetchedMarketplace(
            s,
            source,
            At,
            temporaryCachePath,
            cacheDir,
            marketplaceName,
            onProgress,
            y,
            known,
            selfKey,
          );
          if ("published" in It) return It.published;
          we = true;
          safeCallProgress(onProgress, "Saving marketplace to cache");
          await writeFileAtomic_2(temporaryCachePath, At);
          path = temporaryCachePath;
          Ae = It.declined;
          break;
        }
        we = true;
        await cacheMarketplaceFromUrlToFile(
          source.url,
          temporaryCachePath,
          marketplaceName,
          await describeHelperDeclaration(source, {
            marketplaceName: h,
            trustedDeclaration: findUrlMarketplaceHeaders(source, h),
          }),
          onProgress,
        );
        path = temporaryCachePath;
        break;
      }
      case "github": {
        let sshUrl = `git@${GITHUB_HOST}:${source.repo}.git`;
        let httpsUrl = `https://github.com/${source.repo}.git`;
        temporaryCachePath = join(cacheDir, tempName);
        we = !We;
        if (preferHttpsGitTransport()) {
          safeCallProgress(onProgress, `Cloning via HTTPS: ${httpsUrl}`);
          Ie = await cacheMarketplaceFromGit(
            httpsUrl,
            temporaryCachePath,
            s,
            source.path,
            source.ref,
            source.sparsePaths,
            onProgress,
          );
          we = true;
          path = join(temporaryCachePath, source.path || ".claude-plugin/marketplace.json");
          break;
        }
        let sshConfigured = await isGithubSshConfigured();
        let [Yt, qt] = orderGithubTransports(sshConfigured, sshUrl, httpsUrl);
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
          Ie = await cacheMarketplaceFromGit(
            Yt.url,
            temporaryCachePath,
            s,
            source.path,
            source.ref,
            source.sparsePaths,
            onProgress,
          );
        } catch (err) {
          logForDebugging(
            `${Yt.transport} clone failed for marketplace ${source.repo} (${errorMessage(err)}), falling back to ${qt.transport}`,
            {
              level: "error",
            },
          );
          safeCallProgress(
            onProgress,
            `${Yt.transport} clone failed, retrying with ${qt.transport}: ${qt.url}`,
          );
          if (we) await removeDirectoryTreeNoFollow_2(temporaryCachePath);
          try {
            Ie = await cacheMarketplaceFromGit(
              qt.url,
              temporaryCachePath,
              s,
              source.path,
              source.ref,
              source.sparsePaths,
              onProgress,
            );
          } catch (httpsErr) {
            logForDebugging(
              `${qt.transport} clone fallback also failed for marketplace ${source.repo}: ${errorMessage(httpsErr)}`,
              {
                level: "error",
              },
            );
            throw mergeBothTransportErrors(
              {
                ...Yt,
                error: toError(err),
              },
              {
                ...qt,
                error: toError(httpsErr),
              },
            );
          }
        }
        we = true;
        path = join(temporaryCachePath, source.path || ".claude-plugin/marketplace.json");
        break;
      }
      case "git": {
        temporaryCachePath = join(cacheDir, tempName);
        we = true;
        Ie = await cacheMarketplaceFromGit(
          source.url,
          temporaryCachePath,
          s,
          source.path,
          source.ref,
          source.sparsePaths,
          onProgress,
        );
        path = join(temporaryCachePath, source.path || ".claude-plugin/marketplace.json");
        break;
      }
      case "npm":
        throw Error("NPM marketplace sources not yet implemented");
      case "file": {
        let absPath = resolve_2(getProjectConfigRoot() ?? getOriginalCwd(), source.path);
        path = absPath;
        temporaryCachePath = dirname(dirname(absPath));
        we = false;
        break;
      }
      case "directory": {
        let absPath = resolve_2(getProjectConfigRoot() ?? getOriginalCwd(), source.path);
        path = join(absPath, ".claude-plugin", "marketplace.json");
        temporaryCachePath = absPath;
        we = false;
        break;
      }
      case "settings": {
        temporaryCachePath = join(cacheDir, source.name);
        path = join(temporaryCachePath, ".claude-plugin", "marketplace.json");
        we = false;
        if (!isValidMarketplaceDirName(source.name))
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `Marketplace name ${jsonStringify(source.name)} is not a plain directory name; refusing to cache it`,
            "settings marketplace name is not a plain cache component",
          );
        await assertMarketplaceNameAvailable(cacheDir, source.name, s, {
          known,
          selfKey,
          source,
        });
        let gt = jsonStringify(
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
        await fs.mkdir(dirname(path));
        let At =
          isStorageV5Enabled() && s !== undefined
            ? marketplaceCacheSpace(source.name, "manifest", getPluginsDirectory())
            : null;
        if (isStorageV5Enabled() && s !== undefined && At !== null) {
          let It = await s.write(At, gt, {
            publishDiscipline: "inPlace",
          });
          if (!It.ok)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `Failed to write marketplace manifest: ${formatStorageError(It.error)}`,
              "failed to write marketplace manifest (v5 backend error)",
            );
          Ee = gt;
          break;
        }
        await writeFile(path, gt);
        break;
      }
      default:
        throw Error("Unsupported marketplace source type");
    }
    logForDebugging(`Reading marketplace from ${path}`);
    let ze =
      isStorageV5Enabled() && (source.source === "file" || source.source === "directory") ? s : undefined;
    let lt =
      isStorageV5Enabled() && s !== undefined && (source.source === "github" || source.source === "git")
        ? getMarketplaceStorageKey(path, getPluginsDirectory())
        : null;
    let Je;
    try {
      Je =
        Ae ??
        (Ee !== undefined
          ? parseFileWithSchema(Ee, path, schema)
          : ze !== undefined
            ? parseFileWithSchema(await getSteps(ze, path), path, schema)
            : s !== undefined && lt !== null
              ? parseFileWithSchema(await cachedMarketplaceOrThrow(s, lt), path, schema)
              : await readJsonFileWithSchema(path, schema));
    } catch (e) {
      if (isENOENT(e))
        throw withMarketplaceFailureCode(Error(`Marketplace file not found at ${path}`), "manifest_missing");
      throw withMarketplaceFailureCode(
        Error(`Failed to parse marketplace file at ${path}: ${errorMessage(e)}`),
        e instanceof ConfigParseError ? "manifest_invalid" : undefined,
      );
    }
    let finalCachePath = validateOfficialNameSource(Je.name, source);
    if (finalCachePath) throw Error(finalCachePath);
    await y?.(Je.name);
    if (!isValidMarketplaceDirName(Je.name))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Marketplace name ${jsonStringify(Je.name)} is not a plain directory name; refusing to cache it`,
        "marketplace name is not a plain directory name",
      );
    let pt = join(cacheDir, Je.name);
    if (temporaryCachePath !== pt && !isLocalMarketplaceSource(source))
      await assertMarketplaceNameAvailable(cacheDir, Je.name, s, {
        ownEntry: basename(temporaryCachePath),
        known,
        selfKey,
        source,
      });
    else if (source.source === "github")
      await assertMarketplaceNameUsable(cacheDir, Je.name, s, {
        known,
        isSelf: sameNfcAs(Je.name, selfKey),
        source,
      });
    let resolvedFinal = resolve_2(pt);
    let resolvedCacheDir = resolve_2(cacheDir);
    if (!resolvedFinal.startsWith(resolvedCacheDir + sep))
      throw Error(`Marketplace name '${Je.name}' resolves to a path outside the cache directory`);
    if (temporaryCachePath !== pt && !isLocalMarketplaceSource(source)) {
      let gt = false;
      try {
        let [At, It] = await Promise.all([fs.stat(temporaryCachePath), fs.stat(pt)]);
        gt = At.dev === It.dev && At.ino === It.ino && At.ino !== 0;
      } catch {}
      if (gt) {
        temporaryCachePath = pt;
        forgetGitRootsUnder(pt);
        we = false;
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
            await removeDirectoryTreeNoFollow_2(pt);
          }
          if (refuseNameCollision && source.source === "url") {
            await fs.link(temporaryCachePath, pt);
            let At = temporaryCachePath;
            await fs.unlink(At).catch((error) => {
              logForDebugging(`Failed to remove the linked temp catalog ${At}: ${errorMessage(error)}`, {
                level: "warn",
              });
            });
          } else await fs.rename(temporaryCachePath, pt);
          forgetGitRootsUnder(pt);
          temporaryCachePath = pt;
          we = false;
        } catch (error) {
          let errorMsg = errorMessage(error);
          if (refuseNameCollision)
            throw new MarketplaceError(
              `Marketplace ${jsonStringify(Je.name)} was not added: this add never replaces what is cached at ${pt}, and caching it there failed. If a marketplace of that name is added, remove it first with /plugin marketplace remove ${Je.name}; if none is, delete that path and try again.

Technical details: ${errorMsg}`,
              "marketplace add: the no-replace publish failed",
              {
                kind: "stored",
                name: Je.name,
                folder: pt,
              },
            );
          throw Error(`Failed to finalize marketplace cache. Please manually delete the directory at ${pt} if it exists and try again.

Technical details: ${errorMsg}`);
        }
    }
    warnLfsPointers(temporaryCachePath, Ie, onProgress);
    return {
      marketplace: Je,
      cachePath: temporaryCachePath,
      keptStaleClone: Ie?.kind === "kept-stale",
    };
  } catch (error) {
    if (we && temporaryCachePath && !isLocalMarketplaceSource(source))
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
//@ chunk-e6aww6q8.js:4265413-4265526 layout
function buildKnownMarketplaceEntry(e, n) {
  return {
    source: e,
    installLocation: isLocalMarketplaceSource(e) ? e.path : join(getResolvedMarketplacesCacheDir(), n),
    lastUpdated: new Date().toISOString(),
  };
}
//@ chunk-e6aww6q8.js:4265526-4266146 layout
function assertMarketplaceNameAddable(e) {
  if (hasClaudeAiReservedPrefix(e))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Cannot add marketplace ${jsonStringify(e)}: names starting with "${CLAUDEAI_MARKETPLACE_PREFIX}" are reserved for marketplaces hosted on claude.ai (claude plugin marketplace add --claudeai <name>).`,
      "marketplace add refused: name uses the reserved claude.ai prefix",
    );
  if (isOfficialMarketplaceSpelling(e)) {
    if (isPluginDirectoryModeOn())
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Cannot add marketplace ${jsonStringify(e)}: the name is reserved for the built-in ${OFFICIAL_MARKETPLACE_DISPLAY}.`,
        "marketplace add refused: name is the built-in plugin directory",
      );
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      reservedNameMessage(e),
      "marketplace add refused: reserved marketplace name",
    );
  }
  let n = lookalikeReservedMarketplaceName(e);
  if (n !== undefined)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      reservedMarketplaceSpellingMessage(e, n),
      "marketplace add refused: reserved marketplace name",
    );
}
//@ chunk-e6aww6q8.js:4266146-4266232 layout
/**
 * 在已知市场表中找来源与给定来源相同的市场名。
 */
function findMarketplaceBySource(e, n) {
  for (let [key, value] of Object.entries(e)) if (isSameMarketplaceSource(value.source, n)) return key;
  return;
}
//@ chunk-e6aww6q8.js:4266232-4266374 layout
/**
 * 同上，找不到时再按“地址键”（忽略 sparsePaths/headers/凭据）宽松比较。
 */
function findMarketplaceBySourceLoose(knownMarketplacesWithDeclared, n) {
  let marketplaceBySource = findMarketplaceBySource(knownMarketplacesWithDeclared, n);
  if (marketplaceBySource !== undefined) return marketplaceBySource;
  let s = sourceAddressKey(n);
  for (let [key, value] of Object.entries(knownMarketplacesWithDeclared))
    if (isSameMarketplaceSource(sourceAddressKey(value.source), s)) return key;
  return;
}
//@ chunk-e6aww6q8.js:4266374-4266417 layout
function isSameMarketplaceSource(source, n) {
  return En(canonicalizeGithubSource(source), canonicalizeGithubSource(n));
}
//@ chunk-e6aww6q8.js:4266417-4266609 layout
function canonicalizeGithubSource(e) {
  if (e.source === "github")
    return {
      ...e,
      repo: normalizeGithubRepoSlug(e.repo) ?? e.repo,
    };
  if (e.source === "git") {
    let n = normalizeGithubRepoSlug(e.url);
    if (n !== null) {
      let { url, ...s } = e;
      return {
        ...s,
        source: "github",
        repo: n,
      };
    }
  }
  return e;
}
//@ chunk-e6aww6q8.js:4266609-4266748 layout
function getMarketplaceCandidateFolders(e, n, r, { cloneFolder }) {
  let knownMarketplaceEntry = buildKnownMarketplaceEntry(e, n);
  if (cloneFolder && e.source === "github")
    knownMarketplaceEntry.installLocation = join(r, getCachePathForSource(e));
  return marketplaceDirCandidates(
    {
      [n]: knownMarketplaceEntry,
    },
    undefined,
    r,
  )(n);
}
//@ chunk-e6aww6q8.js:4266748-4266930 layout
function findDeclaredMarketplacesUsingFolders(declaredMarketplaces, n, resolvedMarketplacesCacheDir) {
  return Object.keys(declaredMarketplaces).filter((key) => {
    let h = ownPropertyOrUndefined(declaredMarketplaces, key);
    return (
      h !== undefined &&
      !h.sourceIsFallback &&
      getMarketplaceCandidateFolders(h.source, key, resolvedMarketplacesCacheDir, {
        cloneFolder: true,
      }).some((y) => findByMarketplaceName(y, [key], () => n) !== undefined)
    );
  });
}
//@ chunk-e6aww6q8.js:4266930-4267119 layout
function checkDeclaredMarketplaceCollision(e, resolvedSource) {
  let declaredMarketplaces = getDeclaredMarketplaces();
  let s = ownPropertyOrUndefined(declaredMarketplaces, e);
  if (s !== undefined) return checkDeclaredNameCollision(e, resolvedSource, e, s);
  let resolvedMarketplacesCacheDir = getResolvedMarketplacesCacheDir();
  for (let y of findDeclaredMarketplacesUsingFolders(
    declaredMarketplaces,
    getMarketplaceCandidateFolders(resolvedSource, e, resolvedMarketplacesCacheDir, {
      cloneFolder: false,
    }),
    resolvedMarketplacesCacheDir,
  )) {
    let S = ownPropertyOrUndefined(declaredMarketplaces, y);
    let w = S && checkDeclaredNameCollision(e, resolvedSource, y, S);
    if (w) return w;
  }
  return;
}
//@ chunk-e6aww6q8.js:4267119-4267662 layout
function checkCloneFolderCollision(resolvedSource) {
  if (resolvedSource.source !== "github") return;
  let declaredMarketplaces = getDeclaredMarketplaces();
  let resolvedMarketplacesCacheDir = getResolvedMarketplacesCacheDir();
  let cachePathForSource = getCachePathForSource(resolvedSource);
  for (let h of findDeclaredMarketplacesUsingFolders(
    declaredMarketplaces,
    [cachePathForSource, `${cachePathForSource}.bak`],
    resolvedMarketplacesCacheDir,
  )) {
    let y = ownPropertyOrUndefined(declaredMarketplaces, h);
    if (
      y !== undefined &&
      !isSameGithubMarketplace(
        h,
        {
          [h]: buildKnownMarketplaceEntry(y.source, h),
        },
        resolvedSource,
        undefined,
      )
    )
      return new MarketplaceError(
        `Cannot add this marketplace: it would download into the folder ${jsonStringify(cachePathForSource)}, which the marketplace ${jsonStringify(h)} listed under extraKnownMarketplaces in your settings (from ${formatSourceForDisplay(y.source)}) uses, so it can't be added while that entry is listed.`,
        "marketplace add refused: its clone folder is one a declared marketplace needs",
        {
          kind: "declared",
          name: h,
        },
      );
  }
  return;
}
//@ chunk-e6aww6q8.js:4267662-4268555 layout
function checkDeclaredNameCollision(e, n, r, s) {
  if (s.sourceIsFallback) return;
  let h = isLocalMarketplaceSource(s.source)
    ? isLocalMarketplaceSource(n)
    : !isLocalMarketplaceSource(n) && isSourceConsistentWith(n, s.source);
  if (r.normalize("NFC") !== e.normalize("NFC"))
    return h
      ? undefined
      : new MarketplaceError(
          `Cannot add marketplace ${jsonStringify(e)} from this source: your settings list ${jsonStringify(r)} under extraKnownMarketplaces with another source (${formatSourceForDisplay(s.source)}), and the two names would clash in the marketplaces folder, so it can't be added while that entry is listed.`,
          "marketplace add refused: settings declare a colliding name with a different source",
          {
            kind: "declared",
            name: r,
          },
        );
  if (h || (r === e && settingsSourceOfMarketplace(r) !== undefined)) return;
  return new MarketplaceError(
    `Cannot add marketplace ${jsonStringify(e)} from this source: your settings list ${jsonStringify(r)} under extraKnownMarketplaces with another source (${formatSourceForDisplay(s.source)}). Add it from that source, or change that entry if it is wrong.`,
    "marketplace add refused: settings declare the name with a different source",
    {
      kind: "declared",
      name: r,
    },
  );
}
//@ chunk-e6aww6q8.js:4268555-4268949 layout
function checkExistingNameDifferentSource(e, n, resolvedSource) {
  if (n === undefined || isSameMarketplaceSource(n.source, resolvedSource)) return;
  return new MarketplaceError(
    `Marketplace ${jsonStringify(e)} is already added from a different source (${formatSourceForDisplay(n.source)}). To use this source instead, remove that marketplace first with /plugin marketplace remove ${e}.`,
    "marketplace add refused: the name is registered from a different source",
    {
      kind: isSameMarketplaceSource(sourceAddressKey(n.source), sourceAddressKey(resolvedSource))
        ? "same_address"
        : "name_taken",
      name: e,
    },
  );
}
//@ chunk-e6aww6q8.js:4268949-4269237 layout
function sourceAddressKey(source) {
  switch (source.source) {
    case "github": {
      let { sparsePaths, skipLfs, ...s } = source;
      return s;
    }
    case "git": {
      let { sparsePaths, skipLfs, ...s } = source;
      return isUnsafeRemoteUrl(source.url)
        ? s
        : {
            ...s,
            url: stripUrlUserinfo(source.url),
          };
    }
    case "url": {
      let { headers, headersHelper, ...s } = source;
      return isUnsafeRemoteUrl(source.url)
        ? s
        : {
            ...s,
            url: stripUrlUserinfo(source.url),
          };
    }
    default:
      return source;
  }
}
//@ chunk-e6aww6q8.js:4269237-4269305 layout
function stripUrlUserinfo(url) {
  return url.replace(/^(https?:\/\/)[^/?#\\@]*@/i, "$1");
}
//@ chunk-e6aww6q8.js:4269305-4273867 fingerprint = addMarketplaceSource (0.569)
/**
 * 添加市场（/plugin marketplace add、claude plugin marketplace add）：校验名字与来源、检查与已声明/已存在市场冲突、loadAndCacheMarketplace 下载、写入 known_marketplaces.json。
 */
async function addMarketplaceSource(source, onProgress, storageV5, s, h) {
  let resolvedSource = source;
  if (isLocalMarketplaceSource(source) && !isAbsolute(source.path))
    resolvedSource = {
      ...source,
      path: resolve_2(source.path),
    };
  if (resolvedSource.source === "git") {
    let we = pluginGitUrlError(resolvedSource.url);
    if (we !== null) throw withMarketplaceFailureCode(we, "invalid_source");
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
      errorMessage += ` Allowed sources: ${allowlist.map((Me) => formatSourceForDisplay(Me)).join(", ")}`;
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
    s !== undefined &&
    (isOfficialMarketplaceSpelling(s) || lookalikeReservedMarketplaceName(s) !== undefined)
  )
    assertMarketplaceNameAddable(s);
  let knownMarketplacesWithDeclared = await loadKnownMarketplacesWithDeclared(storageV5);
  for (let [existingName, existingEntry] of Object.entries(knownMarketplacesWithDeclared))
    if (En(existingEntry.source, resolvedSource)) {
      let Ae = h?.refuseNameCollision
        ? checkDeclaredMarketplaceCollision(existingName, resolvedSource)
        : undefined;
      if (Ae) throw Ae;
      logForDebugging(`Source already materialized as '${existingName}', skipping clone`);
      return {
        name: existingName,
        alreadyMaterialized: true,
        resolvedSource,
      };
    }
  if (h?.refuseNameCollision) {
    let we = checkCloneFolderCollision(resolvedSource);
    if (we) throw we;
  }
  let w = describeUnusableMarketplaceSource(
    buildKnownMarketplaceEntry(resolvedSource, "pending-add"),
    findMarketplaceSource(resolvedSource),
  );
  if (w !== undefined)
    throw withMarketplaceFailureCode(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Cannot add this marketplace: ${w.cause}; ${MARKETPLACE_SOURCE_FIX_HINTS[w.kind]}.`,
        "marketplace add refused by the registry admission rule",
      ),
      MARKETPLACE_SOURCE_FAILURE_CODES[w.kind],
    );
  let { marketplace, cachePath, keptStaleClone } = await loadAndCacheMarketplace(
    resolvedSource,
    undefined,
    onProgress,
    storageV5,
    s,
    async (we) => {
      let Ee = describeUnusableMarketplaceSource(
        buildKnownMarketplaceEntry(resolvedSource, we),
        settingsSourceOfMarketplace(we),
      );
      if (Ee !== undefined) {
        let Ae = `Cannot add marketplace ${jsonStringify(we)}: ${Ee.cause}; ${MARKETPLACE_SOURCE_FIX_HINTS[Ee.kind]}.`;
        throw Ee.kind === "declaration"
          ? new MarketplaceError(Ae, "marketplace add refused by the registry admission rule (named)", {
              kind: "declared",
              name: we,
            })
          : withMarketplaceFailureCode(
              new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                Ae,
                "marketplace add refused by the registry admission rule (named)",
              ),
              MARKETPLACE_SOURCE_FAILURE_CODES[Ee.kind],
            );
      }
      assertMarketplaceNameAddable(we);
      if (
        s === undefined &&
        !isValidPluginIdSegment(we) &&
        !Object.hasOwn(knownMarketplacesWithDeclared, we) &&
        !admissionKindsFor(knownMarketplacesWithDeclared).has(we)
      )
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Cannot add marketplace "${quotedPrintable(we, 64)}": Claude Code cannot install plugins from a marketplace with this name. Each part of a plugin id (plugin@marketplace) may use only the letters a-z and A-Z, digits, ".", "_" and "-", and must start with a letter or digit. The name is set by "name" in the marketplace's marketplace.json; ask its maintainer to change it.`,
          "marketplace add refused: the name cannot form a plugin id",
        );
      if (
        Object.hasOwn(Object.prototype, we) &&
        !Object.hasOwn(knownMarketplacesWithDeclared, we) &&
        !admissionKindsFor(knownMarketplacesWithDeclared).has(we)
      )
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Cannot add marketplace "${quotedPrintable(we, 64)}": Claude Code reserves this name and cannot register a marketplace under it. The name is set by "name" in the marketplace's marketplace.json; ask its maintainer to change it.`,
          "marketplace add refused: the name is an inherited object member",
        );
      if (h?.refuseNameCollision) {
        let knownMarketplacesWithDeclared = await loadKnownMarketplacesWithDeclared(storageV5);
        let Ie = checkExistingNameDifferentSource(
          we,
          (Object.hasOwn(knownMarketplacesWithDeclared, we)
            ? knownMarketplacesWithDeclared[we]
            : undefined) ?? hiddenRegistryEntryFor(we, storageV5),
          resolvedSource,
        );
        if (Ie) throw Ie;
        let Me = checkDeclaredMarketplaceCollision(we, resolvedSource);
        if (Me) throw Me;
      }
    },
    knownMarketplacesWithDeclared,
    h?.refuseNameCollision,
  );
  let sourceValidationError = validateOfficialNameSource(marketplace.name, resolvedSource);
  if (sourceValidationError) throw Error(sourceValidationError);
  let Se;
  let ke;
  await updateKnownMarketplaces((we) => {
    assertMarketplaceNameAddable(marketplace.name);
    Se = ownPropertyOrUndefined(we, marketplace.name);
    ke = h?.refuseNameCollision
      ? (checkExistingNameDifferentSource(
          marketplace.name,
          Se ?? hiddenRegistryEntryFor(marketplace.name, storageV5),
          resolvedSource,
        ) ?? checkDeclaredMarketplaceCollision(marketplace.name, resolvedSource))
      : undefined;
    if (ke) return null;
    if (Se) {
      let seedDir = seedDirFor(Se.installLocation);
      if (seedDir)
        throw withMarketplaceFailureCode(
          Error(
            `Marketplace '${marketplace.name}' is seed-managed (${seedDir}). To use a different source, ask your admin to update the seed, or use a different marketplace name.`,
          ),
          "managed",
        );
      logForDebugging(
        `Marketplace '${marketplace.name}' exists with different source \u2014 overwriting (was ${formatSourceForDisplay(Se.source)}, now ${formatSourceForDisplay(resolvedSource)})`,
      );
    }
    we[marketplace.name] = {
      source: resolvedSource,
      installLocation: cachePath,
      lastUpdated: keptStaleClone && Se ? Se.lastUpdated : new Date().toISOString(),
    };
    return we;
  }, storageV5);
  if (ke) throw ke;
  if (Se) {
    let we =
      isStorageV5Enabled() && storageV5 !== undefined
        ? getSyntheticMarketplaceStorageKey(marketplace.name, Se.source, Se.installLocation)
        : null;
    let Ee =
      isStorageV5Enabled() && storageV5 !== undefined
        ? getSyntheticMarketplaceStorageKey(marketplace.name, resolvedSource, cachePath)
        : null;
    let Ae = Ee === null && resolve_2(Se.installLocation) === resolve_2(cachePath);
    if (isStorageV5Enabled() && storageV5 !== undefined && we !== null && !En(we, Ee) && !Ae) {
      let Ie = await storageV5.delete(we);
      if (!Ie.ok)
        logForDebugging(
          `Failed to delete the previous entry's cached marketplace ${marketplace.name} through the storage backend: ${formatStorageError(Ie.error)}`,
          {
            level: "warn",
          },
        );
    }
    if (!isLocalMarketplaceSource(Se.source)) {
      let resolvedMarketplacesCacheDir = getResolvedMarketplacesCacheDir();
      let cacheDir = classifyMarketplacePath(Se.installLocation);
      let absolute = cacheDir.absolute;
      let ze = resolve_2(getOriginalCwd(), cachePath);
      let lt = cacheDir.suspect
        ? "outside"
        : comparePathContainment(resolvedMarketplacesCacheDir, absolute, ze);
      if (lt === "same");
      else if (
        lt === "inside" &&
        (await checkMarketplaceDirCollision(
          resolvedMarketplacesCacheDir,
          absolute,
          marketplace.name,
          storageV5,
          knownMarketplacesWithDeclared,
        )) === undefined
      )
        await removeDirectoryTreeNoFollow_2(absolute);
      else
        logForDebugging(
          `Skipping cleanup of old installLocation (${Se.installLocation}) \u2014 ` +
            `outside ${resolvedMarketplacesCacheDir}. The path is corrupted; leaving it alone and overwriting the config entry.`,
          {
            level: "warn",
          },
        );
    }
  }
  getPluginRegistry().marketplaces.delete(marketplace.name);
  logForDebugging(`Added marketplace source: ${marketplace.name}`);
  return Se !== undefined && !isSameMarketplaceSource(Se.source, resolvedSource)
    ? {
        name: marketplace.name,
        alreadyMaterialized: false,
        resolvedSource,
        replacedSource: Se.source,
      }
    : {
        name: marketplace.name,
        alreadyMaterialized: false,
        resolvedSource,
      };
}
//@ chunk-e6aww6q8.js:4273867-4273913 layout
var RESERVED_NAME_REGISTRY_WRITE_FAILED = "reserved_name_registry_write_failed";
//@ chunk-e6aww6q8.js:4273913-4274014 layout
function reservedNameRemovalError(e, cause) {
  let r = new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    e,
    "removing a reserved-name entry failed part-way",
  );
  r.cause = cause;
  return r;
}
//@ chunk-e6aww6q8.js:4274014-4275802 layout
/**
 * 删除市场的外层入口（CLI/界面调用）：名字属于需要成组处理的保留名时，先逐个删除相关条目并汇总结果，再调用 removeMarketplaceSource。
 */
async function removeMarketplaceWithReservedSiblings(marketplaceName, n, storageV5, credentials, h) {
  if (n === undefined && isOfficialMarketplaceName_2(marketplaceName)) {
    let filtered = listReservedNameRefusals(await loadKnownMarketplacesWithDeclared(storageV5)).filter(
      ({ name: S }) => isOfficialMarketplaceName_2(S),
    );
    if (filtered.length > 0) {
      let S = [];
      let w = [];
      let L = [];
      let G = "commit_mismatch";
      for (let { name: marketplaceName } of filtered) {
        let Z = {
          pluginIds: [],
          reason: "commit_mismatch",
          entryDeleted: false,
        };
        let Se = await removeMarketplaceSource(
          marketplaceName,
          undefined,
          storageV5,
          credentials,
          S.length > 0,
          true,
          Z,
        ).catch(async (error) => {
          let we = null;
          try {
            we = listReservedNameRefusals(await loadKnownMarketplacesWithDeclared(storageV5))
              .map((We) => We.name)
              .filter(isOfficialMarketplaceName_2);
          } catch {
            we = null;
          }
          if (!(Z.entryDeleted || (we !== null && !we.includes(marketplaceName)))) {
            let We = blockedPluginsNotice(L, G, {
              insideFailure: true,
            });
            if (We === null) throw error;
            throw reservedNameRemovalError(
              `${We} Another known_marketplaces.json entry, named "${quotedPrintable(marketplaceName)}", could not be removed (${quotedPrintable(errorMessage(error))}). Run this remove again.`,
              error,
            );
          }
          let Ae = blockedPluginsNotice([...L, ...Z.pluginIds], L.length > 0 ? G : Z.reason, {
            insideFailure: true,
          });
          let Ie =
            error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS &&
            error.errorClass === RESERVED_NAME_REGISTRY_WRITE_FAILED &&
            error.cause !== undefined
              ? error.cause
              : error;
          let Me =
            we === null
              ? `Before running this remove again, check known_marketplaces.json: if no entry of this name is left, this remove can turn the ${OFFICIAL_MARKETPLACE_DISPLAY} itself off.`
              : we.length > 0
                ? "Another entry of this name is left: run this remove again."
                : `Do not run this remove again: no entry of this name is left, so it can turn the ${OFFICIAL_MARKETPLACE_DISPLAY} itself off.`;
          throw reservedNameRemovalError(
            `${Me} The known_marketplaces.json entry named "${quotedPrintable(marketplaceName)}" is gone, but this remove did not finish. ${Ae === null ? "" : `${Ae} `}(${quotedPrintable(errorMessage(Ie), 2000)})`,
            error,
          );
        });
        if (Se.kind !== "ignored-plugin-directory-name-entry-removed" || Se.removedNames.length === 0)
          continue;
        if (S.length === 0) {
          L = Se.disabledPluginIds;
          G = Se.disabledReason;
        }
        w.push(...Se.removedPluginIds);
        S.push(marketplaceName);
      }
      return {
        kind: "ignored-plugin-directory-name-entry-removed",
        removedNames: S,
        removedPluginIds: w,
        disabledPluginIds: L,
        disabledReason: G,
      };
    }
    if (h?.onlyIgnoredNameEntries)
      return {
        kind: "ignored-plugin-directory-name-entry-removed",
        removedNames: [],
        removedPluginIds: [],
        disabledPluginIds: [],
        disabledReason: "commit_mismatch",
      };
  }
  return removeMarketplaceSource(marketplaceName, n, storageV5, credentials, false);
}
//@ chunk-e6aww6q8.js:4275802-4276224 layout
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
//@ chunk-e6aww6q8.js:4276224-4276283 layout
var SETTINGS_FLAG_SOURCE_LABEL = "the --settings flag's";
var ADD_DIR_SOURCE_LABEL = "an added directory's";
//@ chunk-e6aww6q8.js:4276283-4278957 layout
/**
 * 删除市场时把该市场的插件在各可写设置源（userSettings、localSettings、projectSettings）的 enabledPlugins 中关掉；--settings 与 --add-dir 来源无法写时记入 notTurnedOff。
 */
async function disablePluginsInSettings(e, n, storageV5) {
  let s = new Set();
  let h = new Map();
  let legacyFileIsTheCause = false;
  let legacyPathRefused;
  if (e.length === 0)
    return {
      turnedOff: [],
      notTurnedOff: h,
      legacyFileIsTheCause: false,
      unreadSources: [],
      unreadAddDirFiles: [],
      legacyPathRefused: undefined,
      addDirFileBehindALink: false,
    };
  invalidateCommandNames();
  let filtered = n.filter((Ae) => !e.includes(Ae));
  let addDirEnabledPlugins = getAddDirEnabledPlugins();
  let filtered_2 = e.filter((Ae) => findEnablingSettingSource(Ae, filtered) !== undefined);
  for (let Ae of EDITABLE_SETTING_SOURCES) {
    let Ie = new Set();
    let Me = new Set();
    let We = 0;
    let ze = await updateSettingsForSourceWithTransform(
      Ae,
      (It) => {
        We += 1;
        let enabledPlugins = It?.enabledPlugins;
        let settingSource = [];
        for (let Zt of e) {
          let filtered_2 = enabledPluginKeysFor(enabledPlugins, Zt, filtered).filter((pn) =>
            isDependencyAutoInstallState(enabledPlugins?.[pn]),
          );
          if (filtered_2.length > 0) Ie.add(Zt);
          for (let pn of filtered_2) Me.add(pn);
          settingSource.push(
            ...filtered_2,
            ...(Ae !== "userSettings"
              ? []
              : [
                  ...(enabledPlugins?.[Zt] !== false ? [Zt] : []),
                  ...enabledPluginKeysFor(addDirEnabledPlugins, Zt, filtered).filter(
                    (pn) =>
                      isDependencyAutoInstallState(addDirEnabledPlugins[pn]) &&
                      enabledPlugins?.[pn] !== false,
                  ),
                ]),
          );
        }
        return settingSource.length > 0 ? getEnabledPluginIdsForScope(settingSource) : null;
      },
      undefined,
      storageV5,
    );
    let settingSource = [...Me].filter((It) => enabledPluginSettings(Ae)?.[It] !== false);
    if (!ze.error && Ae === "localSettings" && settingSource.length > 0)
      ze = await updateSettingsForSourceWithTransform(
        Ae,
        () => getEnabledPluginIdsForScope(settingSource),
        undefined,
        storageV5,
      );
    if (ze.error)
      logForDebugging(`Failed to turn plugins off in ${Ae} settings: ${ze.error.message}`, {
        level: "error",
      });
    let Je = Ae === "localSettings" ? getLegacyLocalSettingsFilePath() : undefined;
    let nt = Je !== undefined && We < 2 ? await probeSettingsFileMayExist(Je) : undefined;
    if (nt?.refused !== undefined) {
      legacyPathRefused = nt.refused;
      logForDebugging(
        `Did not read the legacy local settings file ${Je}: readScreenedSettingsFile refused it (${nt.refused}); counting it as present`,
      );
    }
    let pt = nt?.mayExist === true;
    let Et = Je !== undefined && (ze.error !== null || pt);
    let yt = pt && We === 1 && (ze.error === null || Ie.size === 0);
    let gt = enabledPluginSettings(Ae);
    let At = We === 0 || Et;
    for (let It of At ? e : Ie) {
      if (!Et && (!At || gt?.[It] === false) && hasDisabledEnabledPlugin(gt, It, filtered)) {
        s.add(It);
        continue;
      }
      legacyFileIsTheCause ||= yt;
      h.set(It, [...(h.get(It) ?? []), settingsSourceName(Ae)]);
    }
  }
  invalidateCommandNames();
  for (let Ae of e) {
    let enablingSettingSource = findEnablingSettingSource(Ae, filtered);
    if (enablingSettingSource === undefined) {
      if (filtered_2.includes(Ae)) s.add(Ae);
      continue;
    }
    if (h.has(Ae)) continue;
    h.set(Ae, [
      enablingSettingSource === "addDir"
        ? ADD_DIR_SOURCE_LABEL
        : enablingSettingSource === "flagSettings"
          ? SETTINGS_FLAG_SOURCE_LABEL
          : SETTING_SOURCE_TO_SCOPE[enablingSettingSource],
    ]);
  }
  let any = getPolicySettingsLoadErrors().some(isBlockingPolicyLoadError);
  let any_2 = getSettingsParseErrorsForSource("flagSettings").some((Ae) => Ae.severity !== "warning");
  let Se = false;
  for (let Ae of e) {
    let Ie = h.has(Ae) ? undefined : await sourceEnablementEntry("flagSettings", Ae, filtered);
    if (Ie?.readsBack === "on") h.set(Ae, [SETTINGS_FLAG_SOURCE_LABEL]);
    else if (Ie !== undefined) Se = true;
  }
  let ke = (
    await Promise.all(
      getAdditionalDirectoriesForClaudeMd()
        .flatMap((Ae) => SETTINGS_FILES.map((Ie) => join(Ae, ".claude", Ie)))
        .map(async (Ae) => {
          let { settings, errors } = parseSettingsFile(Ae);
          if (settings !== null || !errors.some((error) => error.severity !== "warning")) return [];
          let We = await probeSettingsFileMayExist(Ae);
          if (We.refused !== undefined)
            logForDebugging(
              `Did not read the added directory's settings file ${Ae}: readScreenedSettingsFile refused it (${We.refused}); counting it as present`,
            );
          return We.cannotHoldAFile &&
            errors.some((error) => error.errorClass === "unreadable" && error.errno === "ENOTDIR")
            ? []
            : [
                {
                  file: Ae,
                  behindALink: We.refused === "vet-network",
                },
              ];
        }),
    )
  ).flat();
  let mapped = ke.map((Ae) => Ae.file);
  let unreadSources = [
    ...(any ? ["managed"] : []),
    ...(any_2 || Se ? ["flag"] : []),
    ...(mapped.length > 0 ? ["addDir"] : []),
  ];
  return {
    turnedOff: [...s].filter((Ae) => !h.has(Ae)),
    notTurnedOff: h,
    legacyFileIsTheCause,
    unreadSources,
    unreadAddDirFiles: mapped,
    legacyPathRefused,
    addDirFileBehindALink: ke.some((Ae) => Ae.behindALink),
  };
}
//@ chunk-e6aww6q8.js:4278957-4289668 callgraph-fingerprint = removeMarketplaceSource (0.202)
/**
 * 删除市场：从 known_marketplaces.json 与 settings 的 extraKnownMarketplaces 中移除，关掉其插件、删除缓存目录与安装记录，处理托管/保留名等特殊情况。
 */
async function removeMarketplaceSource(marketplaceName, n, storageV5, s, h, y = false, S) {
  let knownMarketplacesWithDeclared = await loadKnownMarketplacesWithDeclared(storageV5);
  let L =
    marketplaceName !== OFFICIAL_MARKETPLACE_NAME &&
    isOfficialMarketplaceName_2(marketplaceName) &&
    !Object.hasOwn(knownMarketplacesWithDeclared, marketplaceName) &&
    hiddenRegistryEntryFor(marketplaceName, storageV5) === undefined
      ? OFFICIAL_MARKETPLACE_NAME
      : marketplaceName;
  let G =
    L === OFFICIAL_MARKETPLACE_NAME && isOfficialMarketplaceSourced(knownMarketplacesWithDeclared)
      ? true
      : false;
  let q =
    isOfficialMarketplaceSpelling(L) && admissionKindsFor(knownMarketplacesWithDeclared).get(L) === "source"
      ? true
      : false;
  if (y && !q)
    return {
      kind: "ignored-plugin-directory-name-entry-removed",
      removedNames: [],
      removedPluginIds: [],
      disabledPluginIds: [],
      disabledReason: "commit_mismatch",
    };
  let Z =
    !G && Object.hasOwn(knownMarketplacesWithDeclared, L) ? knownMarketplacesWithDeclared[L] : undefined;
  let Se = Z !== undefined ? undefined : hiddenRegistryEntryFor(L, storageV5);
  let ke = Z ?? Se;
  if (ke === undefined) {
    if (L === OFFICIAL_MARKETPLACE_NAME && n === undefined && (await getPluginDirectoryState()) === "off") {
      await persistPluginDirectoryChoice(false);
      return {
        kind: "plugin-directory-built-in",
      };
    }
    throw withMarketplaceFailureCode(Error(`Marketplace '${L}' not found`), "not_configured");
  }
  let we = isPluginDirectorySource(ke.source) ? true : false;
  if (we && n !== undefined) {
    let settingsForSourceForUpkeep = getSettingsForSourceForUpkeep(n);
    let mapped = listReservedNameRefusals(knownMarketplacesWithDeclared)
      .filter(
        (Yt) =>
          isOfficialMarketplaceName_2(Yt.name) && removeExtraMarketplace(settingsForSourceForUpkeep, Yt.name),
      )
      .map(
        (Yt) =>
          ` An ignored entry named "${Yt.name}" is declared there: claude plugin marketplace remove ${Yt.name} --scope ${settingsSourceName(n)}`,
      );
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${OFFICIAL_MARKETPLACE_DISPLAY} is built in and not declared in any settings scope. Omit --scope to turn it off.${mapped.join("")}`,
      "plugin directory marketplace remove with --scope",
    );
  }
  let seedDir = isClaudeAiMarketplaceSource(ke.source);
  if (seedDir && n !== undefined)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Marketplace '${L}' is hosted on claude.ai and not declared in any settings scope. Omit --scope to remove it.`,
      "claude.ai marketplace remove with --scope",
    );
  let Ae = seedDir || we ? undefined : seedDirFor(ke.installLocation);
  let Ie = isSafeCliArg(L)
    ? ` To stop using its plugins: claude plugin disable <plugin>@${L}`
    : " To stop using its plugins, disable each one in /plugin.";
  if (Ae && n === undefined)
    throw withMarketplaceFailureCode(
      Error(
        `Marketplace '${L}' is registered from the read-only seed directory (${Ae}) and will be re-registered on next startup.${Ie}`,
      ),
      "managed",
    );
  let Me = false;
  if (n !== undefined) {
    if (!removeExtraMarketplace(getSettingsForSourceForUpkeep(n), L)) {
      let At = Ae
        ? `It is registered from the read-only seed directory.${Ie}`
        : "Omit --scope to remove it from all scopes.";
      throw withMarketplaceFailureCode(
        Error(`Marketplace '${L}' is not declared in ${settingsSourceName(n)} settings. ${At}`),
        "not_configured",
      );
    }
    Me =
      Boolean(Ae) ||
      EDITABLE_SETTING_SOURCES.some(
        (At) => At !== n && removeExtraMarketplace(getSettingsForSourceForUpkeep(At), L),
      ) ||
      Boolean(removeExtraMarketplace(getSettingsForSource("policySettings"), L));
  }
  let We = [];
  let ze = "commit_mismatch";
  if (q && !h && !Me) {
    let pluginDirectoryMarketplace = await loadPluginDirectoryMarketplaceCached({
      ignoreToggle: true,
      storageV5,
    });
    if (pluginDirectoryMarketplace === null) ze = "catalog_unreadable";
    let installedPlugins = await loadInstalledPlugins(storageV5);
    if (hasFailedInstalledPluginsRead(installedPlugins)) {
      let installedListRefusal = await getInstalledListRefusal(storageV5);
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `The list of installed plugins (installed_plugins.json) could not be read or is not a valid list, so this remove cannot tell which plugins to turn off. Nothing was deleted, and the known_marketplaces.json entry named "${quotedPrintable(L)}" was left in place: repair or restore installed_plugins.json, then run this remove again.${installedListRefusal === undefined ? "" : ` ${readInstalledPluginsFile(installedListRefusal)}`}`,
        "removing a reserved-name entry was held back: the installed plugins could not be read",
      );
    }
    let plugins = installedPlugins.plugins;
    let mapped = Object.entries(plugins)
      .filter(([key, value]) => {
        let { name: fo, marketplace } = parsePluginIdentifier(key);
        if (marketplace !== OFFICIAL_MARKETPLACE_NAME) return false;
        let bo = pinnedSha(
          key,
          pluginDirectoryMarketplace?.marketplace.plugins.find((plugin) => plugin.name === fo)?.source,
        );
        return bo === undefined || value.some((vn) => vn.gitCommitSha !== bo);
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
      let Kn = [...notTurnedOff.values()].flat();
      let joined = [
        Kn.some((To) => ["user", "project"].includes(To) || (To === "local" && !legacyFileIsTheCause))
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
        Kn.includes("managed")
          ? "Your organization's managed settings turn a plugin named here on, and this command cannot change them: ask your administrator to take that plugin out of managed settings."
          : "",
        Kn.includes(SETTINGS_FLAG_SOURCE_LABEL)
          ? "The --settings given to this session turn a plugin named here on, and this command cannot change them: take that plugin out of --settings, or start Claude Code without it."
          : "",
        Kn.includes(ADD_DIR_SOURCE_LABEL)
          ? "An added directory's settings (--add-dir) turn a plugin named here on, and user settings did not overrule them: check that user settings can be written and that this session reads them, or start Claude Code without that directory."
          : "",
      ]
        .filter((To) => To !== "")
        .join(" ");
      let joined_2 = [...notTurnedOff]
        .map(([To, bo]) => `${quotedPrintable(To)} in ${bo.join(" and ")} settings`)
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
          .filter((bo) => bo !== "")
          .join(" ");
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `${joined_3} Nothing was deleted, and the known_marketplaces.json entry named "${quotedPrintable(L)}" was left in place: those settings may turn ${formatPluginNameList(
            mapped,
            {
              disabledNote: false,
            },
          )} on again, ${ze === "catalog_unreadable" ? "not checked against" : "not at"} the commit the ${OFFICIAL_MARKETPLACE_DISPLAY} lists.${notTurnedOff.size > 0 ? ` May still be on: ${joined_2}. ${joined}` : " No settings that could be read switch them on now."}`,
          "removing a reserved-name entry was held back by settings that could not be read",
        );
      }
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${turnedOff.length > 0 ? `Turned off ${formatPluginNameList(turnedOff)}. ` : ""}Could not turn off ${joined_2}: ${ze === "catalog_unreadable" ? "not checked against" : "not at"} the commit the ${OFFICIAL_MARKETPLACE_DISPLAY} lists, and may still be enabled. The known_marketplaces.json entry named "${quotedPrintable(L)}" was left in place: run this remove again once each plugin named here is off. ${joined}`,
        "removing a reserved-name entry could not turn plugins off",
      );
    }
    We = turnedOff;
    if (S !== undefined) {
      S.pluginIds = turnedOff;
      S.reason = ze;
    }
  }
  if (isClaudeAiMarketplaceSource(ke.source)) {
    await removeClaudeAiMarketplace(L, ke.source, s);
    getPluginRegistry().marketplaces.delete(L);
  } else if (we) {
    let fs = pluginDirectoryModuleIfUsable();
    if (!fs)
      return {
        kind: "plugin-directory-built-in",
      };
    await fs.setPluginDirectoryMarketplaceEnabled(false);
    getPluginRegistry().marketplaces.delete(L);
    logForDebugging(`Turned the built-in marketplace '${L}' off`);
    return {
      kind: "plugin-directory-built-in",
    };
  } else if (!Me) {
    let At = false;
    if (Se !== undefined) {
      releaseRegistryEntry(L, storageV5);
      At = true;
    }
    try {
      await updateKnownMarketplaces((Zt) => {
        if (!Object.hasOwn(Zt, L)) {
          if (hiddenRegistryEntryFor(L, storageV5) === undefined && !At) return null;
          if (!At) {
            releaseRegistryEntry(L, storageV5);
            At = true;
          }
        }
        delete Zt[L];
        return Zt;
      }, storageV5);
    } catch (error) {
      let rn = blockedPluginsNotice(We, ze, {
        insideFailure: true,
      });
      if (rn === null) throw error;
      let pn = new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${rn} The known_marketplaces.json entry named "${quotedPrintable(L)}" could not be removed (${quotedPrintable(errorMessage(error))}). Run this remove again.`,
        "removing a reserved-name entry failed after plugins were turned off",
        RESERVED_NAME_REGISTRY_WRITE_FAILED,
      );
      pn.cause = error;
      throw pn;
    } finally {
      if (At) {
        releasedRegistryEntries()[getStorageArm(storageV5)].delete(L);
        clearMarketplaceAdmissionVerdicts();
      }
    }
    if (S !== undefined) S.entryDeleted = true;
    getPluginRegistry().marketplaces.delete(L);
    let It =
      isStorageV5Enabled() && storageV5 !== undefined
        ? getSyntheticMarketplaceStorageKey(L, ke.source, ke.installLocation)
        : null;
    if (storageV5 !== undefined && It !== null) {
      let Zt = await storageV5.delete(It);
      if (!Zt.ok)
        logForDebugging(
          `Failed to delete cached marketplace ${L} through the storage backend: ${formatStorageError(Zt.error)}`,
          {
            level: "warn",
          },
        );
    }
    let knownMarketplacesWithDeclared = await loadKnownMarketplacesWithDeclared(storageV5);
    let filtered = listMarketplaceNames(knownMarketplacesWithDeclared, storageV5).filter((Zt) => Zt !== L);
    await removeMarketplaceCacheFiles(
      L,
      filtered,
      marketplaceDirCandidates(knownMarketplacesWithDeclared, storageV5, getResolvedMarketplacesCacheDir()),
    ).catch((error) => {
      logForDebugging(
        `Left the cache files of removed marketplace ${jsonStringify(L)} in place: ${errorMessage(error)}`,
        {
          level: "warn",
        },
      );
    });
  }
  let lt = !Me && !G;
  for (let source of EDITABLE_SETTING_SOURCES) {
    let It = n === undefined || source === n;
    if (!It && !lt) continue;
    let Yt = false;
    let qt = await updateSettingsForSourceWithTransform(
      source,
      (Zt) => {
        if (!Zt) return null;
        let rn = false;
        let updates = {};
        let no =
          G &&
          n === undefined &&
          source === "userSettings" &&
          removeExtraMarketplace(Zt, L)?.autoUpdate !== undefined;
        if (It && removeExtraMarketplace(Zt, L) && !no) {
          let updatedMarketplaces = {
            ...Zt.extraKnownMarketplaces,
          };
          updatedMarketplaces[L] = undefined;
          updates.extraKnownMarketplaces = updatedMarketplaces;
          rn = true;
        }
        if (lt && Zt.enabledPlugins) {
          let marketplaceSuffix = `@${L}`;
          let updatedPlugins = {
            ...Zt.enabledPlugins,
          };
          let yn = false;
          for (let pluginId in updatedPlugins)
            if (pluginId.endsWith(marketplaceSuffix)) {
              updatedPlugins[pluginId] = undefined;
              yn = true;
            }
          if (yn) {
            updates.enabledPlugins = updatedPlugins;
            rn = true;
          }
        }
        if (!rn) return null;
        Yt = true;
        return updates;
      },
      undefined,
      storageV5,
    );
    if (qt.error)
      logForDebugging(`Failed to clean up marketplace '${L}' from ${source} settings: ${qt.error.message}`, {
        level: "error",
      });
    else if (Yt) logForDebugging(`Cleaned up marketplace '${L}' from ${source} settings`);
  }
  if (Me) {
    logForDebugging(
      `Removed marketplace '${L}' declaration from ${n}; still declared in another scope, keeping state layer and installed plugins`,
    );
    return {
      kind: "removed",
      removedPluginIds: [],
    };
  }
  if (G) {
    logForDebugging(
      `Removed the ignored registry entry named '${L}'; turned off ${We.length} plugin(s) (${ze})`,
    );
    return {
      kind: "ignored-plugin-directory-name-entry-removed",
      removedNames: [L],
      removedPluginIds: [],
      disabledPluginIds: We,
      disabledReason: ze,
    };
  }
  let { orphanedPaths, removedPluginIds, sharedDataDirPluginIds, installPathsStillInUse } =
    await removeAllPluginsForMarketplace(L, storageV5);
  let yt = new Set();
  if (q && L !== OFFICIAL_MARKETPLACE_NAME)
    for (let At of installPathsStillInUse) {
      let It = normalizeMarketplaceInputPath(At);
      if (It !== undefined) yt.add(It);
    }
  for (let installPath of orphanedPaths) {
    let It = yt.size > 0 ? normalizeMarketplaceInputPath(installPath) : undefined;
    if (It !== undefined && yt.has(It)) continue;
    await markPluginVersionOrphaned(installPath, storageV5);
  }
  let installedIds = listInstalledPluginIds(getInstalledPlugins());
  for (let pluginId of removedPluginIds)
    await planUninstallCleanup(pluginId, {
      deleteDataDir: !sharedDataDirPluginIds.includes(pluginId),
      installedIds,
      storageV5,
      credentials: s,
    });
  removePluginUsage(removedPluginIds, storageV5);
  logForDebugging(`Removed marketplace source: ${L}`);
  if (q)
    return {
      kind: "ignored-plugin-directory-name-entry-removed",
      removedNames: [L],
      removedPluginIds,
      disabledPluginIds: We,
      disabledReason: ze,
    };
  return {
    kind: "removed",
    removedPluginIds,
  };
}
//@ chunk-e6aww6q8.js:4289668-4289720 placement
/**
 * reservedMarketplaceSpellingMessage：保留市场名的拒绝说明。
 */
function reservedMarketplaceSpellingMessage(e, n) {
  return PLUGIN_DIRECTORY_MARKETPLACE_NAMES.has(n)
    ? reservedNameMessage(e)
    : formatReservedSpellingMessage(e, n);
}
//@ chunk-e6aww6q8.js:4289720-4289810 placement
/**
 * lookalikeReservedMarketplaceName：与保留名形似的市场名。
 */
function lookalikeReservedMarketplaceName(e) {
  for (let n of RESERVED_MARKETPLACE_NAMES)
    if (n !== OFFICIAL_MARKETPLACE_NAME && e.toLowerCase() !== n && isFoldedSpellingOf(e, n)) return n;
  return;
}
//@ chunk-e6aww6q8.js:4289810-4290233 placement
/**
 * 校验注册表条目对保留市场名的使用：官方名只允许 pluginDirectory 源；其他保留名需种子目录或官方来源；源格式错误时返回说明。
 */
function validateReservedMarketplaceEntry(e, n) {
  if (e === OFFICIAL_MARKETPLACE_NAME)
    return n.source?.source === "pluginDirectory"
      ? null
      : reservedMarketplaceEntryMessage(e, isPluginDirectoryModeOn());
  let r = reservedMarketplaceNameMessage(e);
  if (r !== undefined) return r;
  if (!RESERVED_MARKETPLACE_NAMES.has(e.toLowerCase())) return null;
  if (typeof n.installLocation === "string" && seedDirFor(n.installLocation)) return null;
  let source = n.source;
  if (typeof source !== "object" || source === null)
    return `The name '${e}' is reserved for official Anthropic marketplaces and its registered source is malformed.`;
  return validateOfficialNameSource(e, n.source);
}
//@ chunk-e6aww6q8.js:4290233-4290272 placement
/**
 * isImpersonatingOfficialMarketplace：是否在冒充官方市场名。
 */
function isImpersonatingOfficialMarketplace(e, n) {
  return impersonationCheckDisabled() && isImpersonatingOfficialName(e);
}
//@ chunk-e6aww6q8.js:4290272-4290492 placement
function assertNotLookAlikeName(marketplaceName, n) {
  if (!isImpersonatingOfficialMarketplace(marketplaceName, n)) return;
  if (isAsciiImpersonatingOfficialName(marketplaceName))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      reservedNameMessage_2(n.source.source === "settings"),
      "Marketplace name refused by the look-alike check",
    );
  throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    marketplaceLoadFailedMessage(marketplaceName, IMPERSONATION_ERROR_MESSAGE),
    "Marketplace name refused by the look-alike check",
  );
}
//@ chunk-e6aww6q8.js:4290492-4290923 placement
/**
 * 保留名被不受信来源注册时抛错。
 */
function assertReservedNameTrusted(marketplaceName, n) {
  let r = validateReservedMarketplaceEntry(marketplaceName, n);
  let s = isOfficialMarketplaceSpelling(marketplaceName);
  if (r && (s || lookalikeReservedMarketplaceName(marketplaceName) !== undefined)) {
    if (s)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        r,
        "Plugin directory name held by another registry entry",
      );
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      r,
      "Reserved marketplace name held by a registry entry",
    );
  }
  if (r)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Marketplace "${marketplaceName}" is registered from an untrusted source: ${r} To fix it, remove the marketplace and re-add it from the official source.`,
      "Reserved marketplace name registered from untrusted source",
    );
}
//@ chunk-e6aww6q8.js:4290923-4291532 placement
async function readCachedMarketplace(storage, key, { folderAsEisdir: r = false } = {}) {
  let s = await storage.read([key]);
  if (!s.ok) {
    if (r && isNonRegularFailure(s.error))
      throw Object.assign(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `EISDIR: not a regular file (${formatStorageError(s.error)})`,
          "cached marketplace folder is not a regular file (v5)",
        ),
        {
          code: "EISDIR",
        },
      );
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Failed to read cached marketplace: ${formatStorageError(s.error)}`,
      "failed to read cached marketplace (v5 backend error)",
    );
  }
  let h = s.value.items[0];
  if (h === undefined)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "Failed to read cached marketplace: the backend returned no item for the key",
      "failed to read cached marketplace (v5 backend error)",
    );
  return h.found ? Buffer.from(h.value).toString("utf-8") : null;
}
//@ chunk-e6aww6q8.js:4291632-4291733 sole-consumer
function catalogNotCachedError() {
  return Object.assign(Error("ENOENT: marketplace catalog not cached"), {
    code: "ENOENT",
  });
}
//@ chunk-e6aww6q8.js:4291733-4291811 sole-consumer
async function cachedMarketplaceOrThrow(e, n) {
  let cachedMarketplace = await readCachedMarketplace(e, n);
  if (cachedMarketplace === null) throw catalogNotCachedError();
  return cachedMarketplace;
}
//@ chunk-e6aww6q8.js:4291811-4291849 sole-consumer
function marketplaceNameUnlessCowork(e) {
  return isUsingCoworkPlugins() ? undefined : e;
}
//@ chunk-e6aww6q8.js:4291849-4291904 sole-consumer
function isLookalikeUnblockedMarketplace(e) {
  let n = marketplaceNameUnlessCowork(e);
  return n !== undefined && isLookalikeButNotBlockedName(n);
}
//@ chunk-e6aww6q8.js:4291904-4292977 sole-consumer
/**
 * 读取已缓存市场的 marketplace.json：v5 存储下按 hostFolder、manifest 或 catalog 键读取；否则读本地文件， .claude-plugin/marketplace.json 不存在时退回把位置本身当作文件。按来源选 schema 校验。
 */
async function readMarketplaceManifest(location, source, storage, storageLocation = null) {
  let manifestPath = join(location, ".claude-plugin", "marketplace.json");
  let key = storageLocation?.kind === "key" ? storageLocation.key : null;
  let schema = getPluginMarketplaceSchemaFor(marketplaceNameUnlessCowork(source));
  if (isStorageV5Enabled() && storage !== undefined && storageLocation?.kind === "hostFolder") {
    let w;
    try {
      w = await readLocalMarketplaceFile(storage, storageLocation.space, manifestPath);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR")
        w = {
          absent: errnoCode,
        };
      else throw error;
    }
    if ("text" in w) return parseFileWithSchema(w.text, manifestPath, schema);
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
//@ chunk-e6aww6q8.js:4292977-4293865 fingerprint = getMarketplaceCacheOnly (0.629)
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
  let y = isStorageV5Enabled() && storageV5 !== undefined ? getMarketplacesStorageScope() : null;
  if (storageV5 !== undefined && y !== null) {
    let L = await storageV5.read([y]);
    if (!L.ok) {
      logForDebugging(
        `Failed to read cached marketplace ${marketplaceName}: ${formatStorageError(L.error)}`,
        {
          level: "warn",
        },
      );
      return null;
    }
    let G = L.value.items[0];
    if (!G?.found) return loadDeclaredMarketplace(storageV5, marketplaceName, unreadableCatalogs);
    let q;
    try {
      let Z = jsonParse(Buffer.from(G.value).toString("utf-8"));
      q = getAdmittedMarketplaceEntry(marketplaceName, Z);
    } catch (error) {
      logForDebugging(`Failed to read cached marketplace ${marketplaceName}: ${errorMessage(error)}`, {
        level: "warn",
      });
      return null;
    }
    return q
      ? await loadCachedMarketplace(storageV5, marketplaceName, q, marketplaceName, unreadableCatalogs)
      : await loadDeclaredMarketplace(storageV5, marketplaceName, unreadableCatalogs);
  }
  if (isDiskless()) return loadDeclaredMarketplace(storageV5, marketplaceName, unreadableCatalogs);
  let configFile = getKnownMarketplacesPath();
  let w;
  try {
    let content = await fs.readFile(configFile, {
      encoding: "utf-8",
    });
    let config = jsonParse(content);
    w = getAdmittedMarketplaceEntry(marketplaceName, config);
  } catch (error) {
    if (isENOENT(error)) return loadDeclaredMarketplace(storageV5, marketplaceName, unreadableCatalogs);
    logForDebugging(`Failed to read cached marketplace ${marketplaceName}: ${errorMessage(error)}`, {
      level: "warn",
    });
    return null;
  }
  return w
    ? await loadCachedMarketplace(storageV5, marketplaceName, w, marketplaceName, unreadableCatalogs)
    : await loadDeclaredMarketplace(storageV5, marketplaceName, unreadableCatalogs);
}
//@ chunk-e6aww6q8.js:4293865-4294027 layout
async function loadDeclaredMarketplace(storageV5, marketplaceName, unreadableCatalogs) {
  if (marketplaceName === OFFICIAL_MARKETPLACE_NAME)
    return (
      (
        await loadPluginDirectoryMarketplaceCached({
          storageV5,
        })
      )?.marketplace ?? null
    );
  let s = ownPropertyOrUndefined(await readClaudeAiMarketplaceRegistry(), marketplaceName);
  return s === undefined
    ? null
    : loadCachedMarketplace(
        storageV5,
        marketplaceName,
        toKnownMarketplaceEntry(marketplaceName, s),
        undefined,
        unreadableCatalogs,
      );
}
//@ chunk-e6aww6q8.js:4294027-4294059 layout
var BLOCKLIST_DIRECTION_OPTION = {
  blocklistDirection: true,
};
//@ chunk-e6aww6q8.js:4294059-4294123 layout
function looseMarketplaceName(e) {
  return e.toLowerCase().replace(/[^a-z0-9]/g, "");
}
//@ chunk-e6aww6q8.js:4294123-4294438 layout
/**
 * 仿冒检查用的不可见字符、易混标点正则与非 ASCII 正则。
 */
var INVISIBLE_FORMAT_CHARS_RE = /[\u200c-\u200f\u202a-\u202e\u206a-\u206f\ufeff]/g;
var CONFUSABLE_PUNCTUATION_RE =
  /[\u2018\u2019\u201c\u201d\u2010-\u2015\u00b7\u0387\u2022\u2027\u2219\u22c5\u30fb\uff65\u2190-\u2199\u21d0-\u21d5\u21e6-\u21e9\u2794\u2798-\u27a4\u27a7-\u27af\u27b1\u27b3-\u27be\u27f5-\u27fa\u2b00-\u2b0d\u2b95\uffe9-\uffec]/g;
var MAX_LOOSE_NAME_LENGTH = 512;
var NON_ASCII_RE = /[^\x00-\x7f]/;
//@ chunk-e6aww6q8.js:4294438-4294474 layout
function isLooseNameTooLong(e) {
  return e.length > MAX_LOOSE_NAME_LENGTH;
}
//@ chunk-e6aww6q8.js:4294474-4294609 layout
function looseNameVariants(e) {
  let n = [looseMarketplaceName(e)];
  if (NON_ASCII_RE.test(e) && !isLooseNameTooLong(e))
    n.push(looseMarketplaceName(e.normalize("NFKC").replace(INVISIBLE_FORMAT_CHARS_RE, "")));
  return uniq(n).filter((r) => r !== "");
}
//@ chunk-e6aww6q8.js:4294609-4294670 layout
var FULLWIDTH_ALNUM_RE = /^[\uff10-\uff19\uff21-\uff3a\uff41-\uff5a]$/;
var MAX_CONFUSABLE_RUN = 16;
//@ chunk-e6aww6q8.js:4294670-4294891 layout
function splitLooseNameSegments(e) {
  let n = [];
  let r = 0;
  for (let s of e) {
    let normalized = s.normalize("NFKC");
    if (NON_ASCII_RE.test(normalized)) continue;
    let y = looseMarketplaceName(normalized);
    if (y === "") continue;
    let S = NON_ASCII_RE.test(s) && !FULLWIDTH_ALNUM_RE.test(s);
    if (S && ++r > MAX_CONFUSABLE_RUN) return null;
    n.push({
      text: y,
      eitherWay: S,
    });
  }
  return n;
}
//@ chunk-e6aww6q8.js:4294891-4295044 layout
function isSuspiciousNonAsciiName(e) {
  if (!NON_ASCII_RE.test(e)) return false;
  if (isLooseNameTooLong(e)) return true;
  if (splitLooseNameSegments(e) === null) return true;
  return NON_ASCII_RE.test(
    e.replace(CONFUSABLE_PUNCTUATION_RE, "").normalize("NFKC").replace(INVISIBLE_FORMAT_CHARS_RE, ""),
  );
}
//@ chunk-e6aww6q8.js:4295044-4295247 layout
function matchesLooseSegments(e, looseName) {
  let r = new Set([0]);
  for (let { text, eitherWay } of e) {
    let y = new Set();
    for (let S of r) {
      if (eitherWay) y.add(S);
      if (looseName.startsWith(text, S)) y.add(S + text.length);
    }
    if (y.size === 0) return false;
    r = y;
  }
  return r.has(looseName.length);
}
//@ chunk-e6aww6q8.js:4295247-4295514 layout
function matchesBlockedLooseName(e, n) {
  if (!NON_ASCII_RE.test(e) || isLooseNameTooLong(e)) return false;
  let r = splitLooseNameSegments(e);
  if (r === null || !r.some((y) => y.eitherWay)) return false;
  let s = 0;
  let h = 0;
  for (let { text, eitherWay } of r) {
    h += text.length;
    if (!eitherWay) s += text.length;
  }
  for (let looseName of n.looseNames)
    if (looseName.length >= s && looseName.length <= h && matchesLooseSegments(r, looseName)) return true;
  return false;
}
//@ chunk-e6aww6q8.js:4295514-4296565 layout
/**
 * 读取 policySettings.enabledPlugins 中为 false 的插件，收集名字、宽松名，并尽量解析出其仓库来源键； 无法解析仓库时只按名字阻止并记 warn。没有禁用项返回 null。
 */
async function collectOrgBlockedPlugins(e) {
  {
    let blockedIds = Object.entries(getSettingsForSource("policySettings")?.enabledPlugins ?? {})
      .filter(([, value]) => value === false)
      .map(([key]) => key);
    if (blockedIds.length === 0) return null;
    let knownMarketplaces = await loadKnownMarketplacesSafe(e);
    let blocked = {
      keys: new Set(),
      names: new Set(),
      looseNames: new Set(),
      looseNameBlock: false,
    };
    let h;
    let y = false;
    for (let blockedId of blockedIds) {
      let { name: w, marketplace } = parsePluginIdentifier(blockedId);
      if (!w) continue;
      blocked.names.add(w);
      blocked.looseNameBlock = true;
      for (let q of looseNameVariants(w)) blocked.looseNames.add(q);
      if (marketplace === OFFICIAL_MARKETPLACE_NAME) continue;
      let G;
      try {
        let pluginByIdCacheOnly = await getPluginByIdCacheOnly(blockedId, e);
        if (pluginByIdCacheOnly)
          G = samePluginSource(
            pluginByIdCacheOnly.entry.source,
            sourceUrlAndRef(
              marketplace ? ownPropertyOrUndefined(knownMarketplaces, marketplace)?.source : undefined,
            ),
            BLOCKLIST_DIRECTION_OPTION,
          );
        else if (marketplace === CLAUDE_PLUGINS_OFFICIAL) {
          h ??= getCachedCatalogPlugins(e);
          G = samePluginSource(
            (await h)?.[blockedId]?.marketplace_entry.source,
            OFFICIAL_MARKETPLACE_SOURCE.repo,
            BLOCKLIST_DIRECTION_OPTION,
          );
          y ||= G === undefined;
        }
      } catch (error) {
        logForDebugging(`Could not resolve org-blocked plugin ${blockedId}: ${errorMessage(error)}`, {
          level: "warn",
        });
      }
      if (G === undefined)
        logForDebugging(
          `Org-blocked plugin ${blockedId} has no resolvable repository; the plugin directory blocks it by name only`,
          {
            level: "warn",
          },
        );
      else blocked.keys.add(G);
    }
    if (y && (await h) === undefined && (await getMarketplaceCacheOnly(CLAUDE_PLUGINS_OFFICIAL, e)) === null)
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
//@ chunk-e6aww6q8.js:4296565-4297073 layout
/**
 * 判断插件目录中的条目是否应隐藏：仓库被主机策略阻止；或按名字、仓库键、宽松名、可疑非 ASCII 名与禁用名匹配。
 */
function isListingBlocked(e, orgBlockedPlugins) {
  {
    let { source } = e;
    if (
      isListingRepositoryBlockedByHostPolicy(
        typeof source === "object" && "url" in source ? source.url : undefined,
      )
    )
      return true;
    if (orgBlockedPlugins === null) return false;
    let s = samePluginSource(e.source, undefined, BLOCKLIST_DIRECTION_OPTION);
    if (
      orgBlockedPlugins.names.has(e.name) ||
      (s === undefined ? orgBlockedPlugins.keys.size > 0 : orgBlockedPlugins.keys.has(s))
    )
      return true;
    if (!orgBlockedPlugins.looseNameBlock) return false;
    let path = typeof source === "object" && "path" in source ? source.path : undefined;
    let filtered = [e.name, e.displayName, path?.split("/").findLast(Boolean)].filter((S) => S !== undefined);
    if (filtered.some((S) => looseNameVariants(S).some((w) => orgBlockedPlugins.looseNames.has(w))))
      return true;
    if (filtered.some(isSuspiciousNonAsciiName)) return true;
    return filtered.some((S) => matchesBlockedLooseName(S, orgBlockedPlugins));
  }
  return false;
}
//@ chunk-e6aww6q8.js:4297073-4297293 layout
/**
 * 插件目录缓存清单中的该插件是否被组织阻止。
 */
async function isPluginDirectoryListingBlocked(pluginName, storageV5) {
  let r = pluginDirectoryModuleIfUsable();
  if (!r) return false;
  let orgBlockedPlugins = await collectOrgBlockedPlugins(storageV5);
  let { marketplace } = await r.loadPluginDirectoryMarketplace("cache-only", {
    installRecords: getInstalledPluginsMap,
  });
  let found = marketplace?.plugins.find((plugin) => plugin.name === pluginName);
  return found !== undefined && isListingBlocked(found, orgBlockedPlugins);
}
//@ chunk-e6aww6q8.js:4297293-4297550 layout
/**
 * 插件目录启用时返回插件不可安装的说明。
 */
async function pluginDirectoryNotInstallableMessage(e) {
  let n = pluginDirectoryModuleIfUsable();
  if (!n || !(await n.isPluginDirectoryMarketplaceEnabled())) return;
  let { marketplace } = await n.loadPluginDirectoryMarketplace("cache-only", {
    installRecords: getInstalledPluginsMap,
  });
  return marketplace === null ? undefined : await n.pluginDirectoryNotInstallableMessage(e);
}
//@ chunk-e6aww6q8.js:4297550-4297745 layout
async function filterBlockedListings(marketplace, n) {
  let orgBlockedPlugins = await collectOrgBlockedPlugins(n);
  let filtered = marketplace.plugins.filter((plugin) => !isListingBlocked(plugin, orgBlockedPlugins));
  if (filtered.length === marketplace.plugins.length) return marketplace;
  if (marketplace.plugins.some((plugin) => isListingBlocked(plugin, null)))
    logDirectoryBlockedOnce("host_pattern");
  return {
    ...marketplace,
    plugins: filtered,
  };
}
//@ chunk-e6aww6q8.js:4297745-4298209 layout
/**
 * 只读缓存加载插件目录市场清单（滤掉被阻止项）。
 */
async function loadPluginDirectoryMarketplaceCached({
  ignoreToggle: e = false,
  storageV5: n,
  onlyMissedListings: r = false,
} = {}) {
  {
    let s =
      e && pluginDirectoryPolicyBlock() === null ? pluginDirectoryModules : pluginDirectoryModuleIfUsable();
    if (!s || (!e && !(await s.isPluginDirectoryMarketplaceEnabled()))) return null;
    let { marketplace } = await s.loadPluginDirectoryMarketplace("cache-only", {
      forInstalledPlugin: e,
      onlyMissedListings: r,
      installRecords: getInstalledPluginsMap,
    });
    if (marketplace === null) return null;
    let { installLocation } = await s.pluginDirectoryRegistryEntry();
    return {
      marketplace: await filterBlockedListings(marketplace, n),
      installLocation,
    };
  }
  return null;
}
//@ chunk-e6aww6q8.js:4298209-4300613 layout
/**
 * 返回带 lookUp(name, purpose) 的读取器：首次查询时刷新插件目录（不在会话可用、不允许读取或关闭时返回 not-read）， 结果在本次操作内共享；查询结果为 listed / hidden-by-policy / not-installable / not-listed / not-read。
 */
function createPluginDirectoryReader(storage, { mayWalkTheFeed, onBehalfOf = "a-person" }) {
  let readPromise;
  let readState = "unasked";
  let readOnce = (w, L) => {
    readPromise ??= (async () => {
      let pluginDirectoryMarketplace = await w.loadPluginDirectoryMarketplace("refresh", {
        purpose: L,
        trigger: L === "update" ? "update" : "install",
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
      let { installLocation } = await w.pluginDirectoryRegistryEntry();
      let Z = await filterBlockedListings(pluginDirectoryMarketplace.marketplace, storage);
      let Se = new Set(Z.plugins);
      return {
        marketplace: Z,
        installLocation,
        reviewerMarkedNames: pluginDirectoryMarketplace.reviewerMarkedNames ?? new Set(),
        hiddenByPolicy: new Set(
          pluginDirectoryMarketplace.marketplace.plugins
            .filter((plugin) => !Se.has(plugin))
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
    async lookUp(w, L) {
      {
        let G = pluginDirectoryModuleIfUsable();
        if (G === null)
          return {
            outcome: "not-read",
            purpose: L,
            detail: "it isn't available in this session",
          };
        if (!mayWalkTheFeed)
          return {
            outcome: "not-read",
            purpose: L,
            detail: "it is read only when a person asks for it",
          };
        if (
          L !== "switch" &&
          !(await G.isPluginDirectoryMarketplaceEnabled()) &&
          !(L === "update" && hasInstalledOfficialEntry(w))
        )
          return {
            outcome: "not-read",
            purpose: L,
            detail: "it is off",
            nextStep: `Turn it on: claude plugin marketplace add ${OFFICIAL_MARKETPLACE_NAME}`,
          };
        if (readPromise === undefined) {
          let ke = G.pluginDirectoryFailedWalkWindow();
          let timestamp =
            ke === undefined
              ? undefined
              : onBehalfOf === "nobody"
                ? ke.closesAt
                : ke.serviceDelayMs === undefined
                  ? undefined
                  : ke.failedAt + Math.min(ke.serviceDelayMs, MARKETPLACE_CACHE_TTL_MS);
          if (ke !== undefined && timestamp !== undefined && Date.now() < timestamp) {
            readState = "not-read";
            return {
              outcome: "not-read",
              purpose: L,
              detail:
                onBehalfOf === "nobody"
                  ? `it could not be read a short while ago (${ke.reason}), and work that runs by itself does not ask it again before ${formatTimeOfDay(timestamp)}`
                  : `it asked Claude Code to wait, and can be asked again at ${formatTimeOfDay(timestamp)}`,
            };
          }
        }
        let q = await readOnce(G, L);
        if (q.marketplace === null)
          return {
            outcome: "not-read",
            purpose: L,
            detail: q.detail,
            ...(q.nextStep !== undefined && {
              nextStep: q.nextStep,
            }),
          };
        let found = q.marketplace.plugins.find((plugin) => plugin.name === w);
        if (found !== undefined)
          return {
            outcome: "listed",
            entry: found,
            marketplaceInstallLocation: q.installLocation,
            reviewerMarked: q.reviewerMarkedNames.has(w),
          };
        if (q.hiddenByPolicy.has(w))
          return {
            outcome: "hidden-by-policy",
          };
        let Se = q.notInstallable.get(w);
        return Se === undefined
          ? {
              outcome: "not-listed",
            }
          : {
              outcome: "not-installable",
              why: Se,
            };
      }
      return {
        outcome: "not-read",
        purpose: L,
        detail: "it isn't available in this build",
      };
    },
  };
  weakMap_12.set(reader, () => readState);
  return reader;
}
//@ chunk-e6aww6q8.js:4300613-4300628 layout
var MARKETPLACE_CACHE_TTL_MS = 300000;
//@ chunk-e6aww6q8.js:4300628-4300724 layout = formatLocalTime (0.892)
function formatTimeOfDay(timestamp) {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
//@ chunk-e6aww6q8.js:4300724-4300744 layout
var weakMap_12 = new WeakMap();
//@ chunk-e6aww6q8.js:4300744-4301197 layout
/**
 * 为切换安装来源查插件目录条目。
 */
async function lookUpPluginForSwitch(
  pluginName,
  storage,
  r = createPluginDirectoryReader(storage, {
    mayWalkTheFeed: true,
  }),
) {
  let s = await r.lookUp(pluginName, "switch");
  switch (s.outcome) {
    case "listed":
      return {
        entry: s.entry,
        marketplaceInstallLocation: s.marketplaceInstallLocation,
        reviewerMarked: s.reviewerMarked,
      };
    case "not-read":
      return {
        notFreshEnoughFor: "switch",
        detail: s.detail,
      };
    case "hidden-by-policy":
    case "not-installable":
    case "not-listed":
      return {
        entry: null,
      };
    default: {
      let h = s;
      throw Error("Unhandled outcome of a read of the Directory");
    }
  }
}
//@ chunk-e6aww6q8.js:4301197-4301390 layout
/**
 * 切换需要重新读取插件目录但读取失败。
 */
function formatSwitchNeedsFreshReadMessage(detail) {
  return `A switch needs a fresh read of the ${OFFICIAL_MARKETPLACE_DISPLAY}, not the copy saved on this machine, and it could not be read: ${quotedPrintable(detail, 200)}. Nothing was changed; try again once it can be read`;
}
//@ chunk-e6aww6q8.js:4301390-4301558 layout
async function findPluginDirectoryEntry(e, n, r) {
  let pluginDirectoryForPurpose = await loadPluginDirectoryForPurpose(e, n, r);
  let found = pluginDirectoryForPurpose?.marketplace.plugins.find((plugin) => plugin.name === e);
  return pluginDirectoryForPurpose && found
    ? {
        entry: found,
        marketplaceInstallLocation: pluginDirectoryForPurpose.installLocation,
      }
    : null;
}
//@ chunk-e6aww6q8.js:4301558-4301631 layout
/**
 * 加载插件目录（Directory）市场的清单（缓存模式），没有返回 null。
 */
async function loadPluginDirectoryMarketplace(e, storageV5) {
  return (await loadPluginDirectoryForPurpose(e, storageV5, "load"))?.marketplace ?? null;
}
//@ chunk-e6aww6q8.js:4301631-4301747 layout
async function pluginDirectoryNotInstallableReason(pluginName, storageV5) {
  return (await loadPluginDirectoryForPurpose(pluginName, storageV5, "load")) === null
    ? undefined
    : await pluginDirectoryModules?.pluginDirectoryNotInstallableReason(pluginName);
}
//@ chunk-e6aww6q8.js:4301747-4301972 layout
/**
 * 在插件目录（可只看漏列项）中查插件条目。
 */
async function findMissedListingEntry(e, n, r) {
  let s = r
    ? await loadPluginDirectoryForPurpose(e, n, "load", true)
    : await loadPluginDirectoryMarketplaceCached({
        storageV5: n,
        onlyMissedListings: true,
      });
  let found = s?.marketplace.plugins.find((plugin) => plugin.name === e);
  return s && found
    ? {
        entry: found,
        marketplaceInstallLocation: s.installLocation,
      }
    : null;
}
//@ chunk-e6aww6q8.js:4301972-4302079 layout
function loadPluginDirectoryForPurpose(e, storageV5, r, onlyMissedListings = false) {
  return loadPluginDirectoryMarketplaceCached({
    onlyMissedListings,
    ignoreToggle: r !== "install" && hasInstalledOfficialEntry(e),
    storageV5,
  });
}
//@ chunk-e6aww6q8.js:4302079-4302177 layout
/**
 * pluginDirectoryUnavailableKind：插件目录不可用的类别。
 */
function pluginDirectoryUnavailableKind() {
  if (pluginDirectoryPolicyBlock() !== null) return "blocked";
  return pluginDirectoryStatusModule?.pluginDirectoryUnavailableCause() ?? null;
}
//@ chunk-e6aww6q8.js:4302177-4302245 layout
/**
 * pluginDirectoryRefusalReason：插件目录策略拒绝原因。
 */
function pluginDirectoryRefusalReason() {
  return pluginDirectoryStatusModule?.pluginDirectoryPolicyRefusalReason() ?? "";
}
//@ chunk-e6aww6q8.js:4302245-4302312 layout
/**
 * awaitPluginDirectoryVerdict：等待插件目录策略裁决。
 */
async function awaitPluginDirectoryVerdict() {
  await pluginDirectoryModules?.awaitPluginDirectoryPolicyVerdict();
}
//@ chunk-e6aww6q8.js:4302312-4302965 layout
/**
 * 加载插件目录市场，不可用（或过期）时抛 PluginDirectoryUnavailableError。
 */
async function loadPluginDirectoryMarketplace_2(
  e,
  storageV5,
  { staleIsFailure: r = false, trigger: s = "other", signal: h } = {},
) {
  let y = pluginDirectoryModuleIfUsable();
  let S = y
    ? await y.loadPluginDirectoryMarketplace(e, {
        trigger: s,
        signal: h,
        installRecords: getInstalledPluginsMap,
      })
    : {
        marketplace: null,
        message: "it isn't available in this session",
      };
  if (r && S.marketplace !== null && "staleReason" in S && S.staleReason)
    throw withTelemetryMessage(
      new PluginDirectoryUnavailableError(
        `${OFFICIAL_MARKETPLACE_DISPLAY} could not be refreshed: ${S.staleReason}`,
      ),
      "Plugin directory marketplace refresh served stale cache",
    );
  if (S.marketplace === null) {
    let w = pluginDirectoryPolicyBlockHint();
    throw withTelemetryMessage(
      new PluginDirectoryUnavailableError(
        w === ""
          ? `${OFFICIAL_MARKETPLACE_DISPLAY} is unavailable: ${S.message}`
          : `${OFFICIAL_MARKETPLACE_DISPLAY} is blocked by your organization. ${w}`,
      ),
      "Plugin directory marketplace catalog unavailable",
    );
  }
  return await filterBlockedListings(S.marketplace, storageV5);
}
//@ chunk-e6aww6q8.js:4302965-4303774 layout
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
    let y = normalizeInstallLocation(entry.source, entry.installLocation);
    let S = validateReservedMarketplaceEntry(marketplaceName, {
      source: entry.source,
      installLocation: y,
    });
    if (S) {
      logForDebugging(`Refusing to load marketplace '${marketplaceName}': ${S}`, {
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
      y,
      declaredSource,
      storage,
      isStorageV5Enabled() && storage !== undefined
        ? getMarketplaceStorageLocation(marketplaceName, entry.source, y)
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
//@ chunk-e6aww6q8.js:4303774-4303794 layout
var weakMap_13 = new WeakMap();
//@ chunk-e6aww6q8.js:4303794-4303927 layout
function markImpersonationFailure(failedNames, marketplaceName, r) {
  if (failedNames === undefined) return;
  let s = weakMap_13.get(failedNames);
  if (r) {
    if (s === undefined) weakMap_13.set(failedNames, new Set([marketplaceName]));
    else s.add(marketplaceName);
  } else s?.delete(marketplaceName);
}
//@ chunk-e6aww6q8.js:4303927-4303976 layout
/**
 * isRegistryOwnedByName：weakMap 里是否登记了该名字。
 */
function isRegistryOwnedByName(e, marketplaceName) {
  return weakMap_13.get(e)?.has(marketplaceName) === true;
}
//@ chunk-e6aww6q8.js:4303976-4306122 fingerprint = getMarketplace (0.462)
/**
 * 取市场目录：缓存存在且可解析就用，否则（或缓存过期时）重新 loadAndCacheMarketplace。
 */
function getMarketplace(marketplaceName, storageV5, r = "other") {
  if (marketplaceName.toLowerCase() === pluginManifestPathSchemas)
    return Promise.reject(
      Error(
        'The marketplace registered as "npm" is ignored: the name npm is reserved for plugins installed from an npm registry (<package>@npm).',
      ),
    );
  let { marketplaces } = getPluginRegistry();
  let h = marketplaces.get(marketplaceName);
  if (h)
    return marketplaceName === OFFICIAL_MARKETPLACE_NAME
      ? h.then(
          (S) =>
            pluginDirectoryUnavailableKind() !== null
              ? loadPluginDirectoryMarketplace_2("if-stale", storageV5)
              : filterBlockedListings(S, storageV5),
          (error) => {
            let w = marketplaces.get(marketplaceName);
            if (
              !(error instanceof PluginDirectoryUnavailableError) ||
              pluginDirectoryPolicyBlock() !== null ||
              w === undefined
            )
              throw error;
            if (w === h) marketplaces.delete(marketplaceName);
            return getMarketplace(marketplaceName, storageV5, r);
          },
        )
      : h;
  let y = (async () => {
    let knownMarketplacesWithDeclared = await loadKnownMarketplacesWithDeclared(storageV5);
    let w = ownPropertyOrUndefined(knownMarketplacesWithDeclared, marketplaceName);
    if (!w)
      throw withTelemetryMessage(
        Error(
          `Marketplace '${marketplaceName}' not found in configuration. Available marketplaces: ${Object.keys(knownMarketplacesWithDeclared).join(", ")}`,
        ),
        "Marketplace not found in configuration",
      );
    if (isClaudeAiMarketplaceSource(w.source)) {
      let { marketplace, status } = await ensureClaudeAiMarketplace(marketplaceName, w.source, {
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
    if (isPluginDirectorySource(w.source))
      return await loadPluginDirectoryMarketplace_2("if-stale", storageV5, {
        trigger: r,
      });
    assertReservedNameTrusted(marketplaceName, w);
    assertNotLookAlikeName(marketplaceName, w);
    if (isLocalMarketplaceSource(w.source) && !isAbsolute(w.source.path)) {
      let q = claudeCommand("plugin marketplace remove", marketplaceName);
      throw withTelemetryMessage(
        Error(
          `Marketplace "${marketplaceName}" has a relative source path (${w.source.path}) ` +
            "in known_marketplaces.json \u2014 this is stale state from an older " +
            `Claude Code version. ${q ? `Run \`${q}\` and re-add` : "Remove and re-add"} it from the original project directory.`,
        ),
        "Marketplace has relative source path (legacy state)",
      );
    }
    try {
      return await readMarketplaceManifest(
        w.installLocation,
        marketplaceName,
        storageV5,
        isStorageV5Enabled() && storageV5 !== undefined
          ? getMarketplaceStorageLocation(marketplaceName, w.source, w.installLocation)
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
    let L;
    let G;
    try {
      ({ marketplace: L, keptStaleClone: G } = await loadAndCacheMarketplace(
        w.source,
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
          reservedNameMessage_2(w.source.source === "settings"),
          "Marketplace name refused by the look-alike check",
        );
      throw withTelemetryMessage(
        Error(
          `Failed to load marketplace "${marketplaceName}" from source (${w.source.source}): ${errorMessage(error)}`,
        ),
        "Failed to load marketplace from source",
      );
    }
    if (!G) await touchMarketplaceLastUpdated(marketplaceName, storageV5);
    return L;
  })();
  marketplaces.set(marketplaceName, y);
  y.catch((error) => {
    if (
      error instanceof PluginDirectoryUnavailableError &&
      pluginDirectoryPolicyBlock() === null &&
      marketplaces.get(marketplaceName) === y
    )
      marketplaces.delete(marketplaceName);
  }).catch(() => {});
  return y;
}
//@ chunk-e6aww6q8.js:4306122-4307000 fingerprint = getPluginByIdCacheOnly (0.811)
/**
 * 由插件 ID（name@marketplace）只用缓存找到 marketplace 条目，返回 {entry, marketplaceInstallLocation}。
 */
async function getPluginByIdCacheOnly(pluginId, storageV5, r = "load") {
  let { name: pluginName, marketplace: marketplaceName } = parsePluginIdentifier(pluginId);
  if (!pluginName || !marketplaceName || marketplaceName.toLowerCase() === pluginManifestPathSchemas)
    return null;
  let fs = getFsImplementation();
  let S = isStorageV5Enabled() && storageV5 !== undefined ? getMarketplacesStorageScope() : null;
  if (storageV5 !== undefined && S !== null) {
    let L = await storageV5.read([S]);
    if (!L.ok) return null;
    let G = L.value.items[0];
    if (!G?.found) return getPluginByIdFromCacheOrDeclared(storageV5, pluginId, r);
    try {
      let q = jsonParse(Buffer.from(G.value).toString("utf-8"));
      let admittedMarketplaceEntry = getAdmittedMarketplaceEntry(marketplaceName, q);
      if (!admittedMarketplaceEntry) return await getPluginByIdFromCacheOrDeclared(storageV5, pluginId, r);
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
  if (isDiskless()) return getPluginByIdFromCacheOrDeclared(storageV5, pluginId, r);
  let configFile = getKnownMarketplacesPath();
  try {
    let content = await fs.readFile(configFile, {
      encoding: "utf-8",
    });
    let config = jsonParse(content);
    let marketplaceConfig = getAdmittedMarketplaceEntry(marketplaceName, config);
    if (!marketplaceConfig) return await getPluginByIdFromCacheOrDeclared(storageV5, pluginId, r);
    let marketplace = await getMarketplaceCacheOnly(marketplaceName);
    if (!marketplace) return null;
    let plugin = marketplace.plugins.find((plugin) => plugin.name === pluginName);
    if (!plugin) return null;
    return {
      entry: plugin,
      marketplaceInstallLocation: marketplaceConfig.installLocation,
    };
  } catch (error) {
    return isENOENT(error) ? getPluginByIdFromCacheOrDeclared(storageV5, pluginId, r) : null;
  }
}
//@ chunk-e6aww6q8.js:4307000-4307675 layout
async function getPluginByIdFromCacheOrDeclared(storageV5, pluginId, r) {
  let { name: s, marketplace } = parsePluginIdentifier(pluginId);
  if (!s || !marketplace) return null;
  if (marketplace === OFFICIAL_MARKETPLACE_NAME) return findPluginDirectoryEntry(s, storageV5, r);
  let y = ownPropertyOrUndefined(await readClaudeAiMarketplaceRegistry(), marketplace);
  if (y === undefined) return null;
  let marketplaceInstallLocation = toKnownMarketplaceEntry(marketplace, y).installLocation;
  let { marketplace: marketplace_2, status } = await ensureClaudeAiMarketplace(marketplace, y.source, {
    mode: "cache-only",
    credentials: undefined,
  });
  if (marketplace_2 !== null) {
    let found = marketplace_2.plugins.find((plugin) => plugin.name === s);
    return found === undefined
      ? null
      : {
          entry: found,
          marketplaceInstallLocation,
        };
  }
  if (status.kind === "gone") return null;
  let q = getInstalledPlugins().plugins[pluginId]?.[0];
  if (q === undefined) return null;
  return {
    entry: {
      name: s,
      source: {
        source: "claudeai",
        pluginId: q.claudeaiPluginId ?? "",
        version: q.version ?? "",
        installable: false,
      },
      ...(q.version !== undefined && {
        version: q.version,
      }),
      strict: true,
    },
    marketplaceInstallLocation,
  };
}
//@ chunk-e6aww6q8.js:4307675-4308144 fingerprint = getPluginById (0.765)
/**
 * 由插件 ID 找 marketplace 条目，必要时联网刷新市场。
 */
async function getPluginById(pluginId, storageV5, r = "other") {
  let cached = await getPluginByIdCacheOnly(
    pluginId,
    storageV5,
    r === "install" || r === "update" ? r : "load",
  );
  if (cached) return cached;
  let { name: pluginName, marketplace: marketplaceName } = parsePluginIdentifier(pluginId);
  if (!pluginName || !marketplaceName || marketplaceName.toLowerCase() === pluginManifestPathSchemas)
    return null;
  try {
    let config = await loadKnownMarketplacesWithDeclared(storageV5);
    let marketplaceConfig = ownPropertyOrUndefined(config, marketplaceName);
    if (!marketplaceConfig) return null;
    let plugin = (await getMarketplace(marketplaceName, storageV5, r)).plugins.find(
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
//@ chunk-e6aww6q8.js:4308144-4308924 layout
/**
 * 确保插件目录市场的目录在本机（必要时 cache-only 加载），返回 not_needed/ok/not_allowed 等。
 */
async function ensurePluginDirectoryCatalog(e, n = PLUGIN_DIRECTORY_CATALOG_MISSING_ERROR) {
  {
    let r = pluginDirectoryModuleIfUsable();
    if (
      r === null ||
      !isSourceAllowedByPolicy({
        source: "pluginDirectory",
      }) ||
      r.pluginDirectoryWalkReadiness() === "not_allowed"
    )
      return "not_needed";
    if (
      (
        await r.loadPluginDirectoryMarketplace("cache-only", {
          forInstalledPlugin: true,
          installRecords: getInstalledPluginsMap,
        })
      ).marketplace !== null
    )
      return "not_needed";
    if (r.pluginDirectoryWalkReadiness() === "backed_off") return "unreachable";
    let abortController = new AbortController();
    let y = await withDeadline(
      refreshMarketplaceDeduped(OFFICIAL_MARKETPLACE_NAME, e, undefined, {
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
      n,
    );
    if (y === undefined) {
      abortController.abort();
      r.notePluginDirectoryWalkTimedOut();
      return "unreachable";
    }
    if (y) return "fetched";
    return r.pluginDirectoryWalkReadiness() === "backed_off" ? "unreachable" : "unavailable";
  }
  return "not_needed";
}
//@ chunk-e6aww6q8.js:4308924-4309042 layout
/**
 * 插件目录 catalog 不在本机时的错误类别名。
 */
var PLUGIN_DIRECTORY_CATALOG_MISSING_ERROR = OFFICIAL_MARKETPLACE_NAME_CHECK_TTL_MS;
var PLUGIN_DIRECTORY_CATALOG_MISSING = `the ${OFFICIAL_MARKETPLACE_DISPLAY}'s catalog is not on this machine (it is off, blocked, unavailable, or not downloaded yet)`;
//@ chunk-e6aww6q8.js:4309042-4309159 layout
/**
 * 插件目录市场的目录（catalog）不在本机时抛出的错误。
 */
class PluginDirectoryCatalogMissingError extends Error {
  constructor() {
    super(`Not available: ${PLUGIN_DIRECTORY_CATALOG_MISSING}`);
    this.name = "PluginDirectoryCatalogMissingError";
  }
}
//@ chunk-e6aww6q8.js:4309159-4309264 layout
/**
 * 取市场目录；插件目录市场只读缓存，没有缓存时抛 PluginDirectoryCatalogMissingError。
 */
async function getMarketplaceOrDirectoryCatalog(e, n) {
  if (e === OFFICIAL_MARKETPLACE_NAME) {
    let marketplaceCacheOnly = await getMarketplaceCacheOnly(e, n);
    if (marketplaceCacheOnly === null) throw new PluginDirectoryCatalogMissingError();
    return marketplaceCacheOnly;
  }
  return getMarketplace(e, n);
}
//@ chunk-e6aww6q8.js:4309264-4309332 layout
/**
 * 按插件 ID 取 marketplace 条目；插件目录市场只用缓存。
 */
function getPluginByIdAnySource(e, n, r) {
  return parsePluginIdentifier(e).marketplace === OFFICIAL_MARKETPLACE_NAME
    ? getPluginByIdCacheOnly(e, n, r)
    : getPluginById(e, n);
}
//@ chunk-e6aww6q8.js:4309332-4311978 fingerprint = refreshAllMarketplaces (0.447)
/**
 * 刷新所有市场（跳过种子管理和 settings 内联的市场），逐个调用 refreshMarketplace，汇总失败。
 */
async function refreshAllMarketplaces(e) {
  let n = [];
  let r = [];
  let s = [];
  let h = 0;
  let knownMarketplacesWithDeclared = await loadKnownMarketplacesWithDeclared(e);
  let S = {};
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
        h++;
        r.push(key);
      }
      continue;
    }
    if (isClaudeAiMarketplaceSource(value.source)) {
      if (!isSourceAllowedByPolicy(value.source)) continue;
      h++;
      getPluginRegistry().marketplaces.delete(key);
      try {
        await refreshClaudeAiMarketplace(key, value.source, {
          credentials: undefined,
        });
      } catch (error) {
        logForDebugging(`Failed to refresh claude.ai marketplace ${key}: ${errorMessage(error)}`, {
          level: "warn",
        });
        r.push(key);
      }
      continue;
    }
    if (isPluginDirectorySource(value.source)) {
      if (!isSourceAllowedByPolicy(value.source) || pluginDirectoryPolicyBlock() !== null) continue;
      getPluginRegistry().marketplaces.delete(key);
      try {
        await loadPluginDirectoryMarketplace_2("refresh", e, {
          staleIsFailure: true,
          trigger: "update",
        });
        h++;
      } catch (error) {
        if (pluginDirectoryPolicyBlock() !== null) continue;
        logForDebugging(`Failed to refresh the plugin directory marketplace: ${errorMessage(error)}`, {
          level: "warn",
        });
        s.push(key);
      }
      continue;
    }
    if (!isSourceAllowedByPolicy(value.source)) {
      logForDebugging(`Skipping policy-blocked marketplace '${key}' in bulk refresh`);
      continue;
    }
    h++;
    let G = validateReservedMarketplaceEntry(key, value);
    if (G) {
      logForDebugging(`Skipping marketplace '${key}' in bulk refresh: ${G}`, {
        level: "warn",
      });
      r.push(key);
      continue;
    }
    if (isImpersonatingOfficialMarketplace(key, value)) {
      logForDebugging(
        `Skipping marketplace '${key}' in bulk refresh: the look-alike check refuses the name it is saved under`,
        {
          level: "warn",
        },
      );
      r.push(key);
      continue;
    }
    let q = false;
    if (key === CLAUDE_PLUGINS_OFFICIAL) {
      try {
        await removeMarketplaceCacheDir(key, value.installLocation, e, knownMarketplacesWithDeclared);
      } catch (error) {
        logForDebugging(`Skipping marketplace '${key}' in bulk refresh: ${errorMessage(error)}`, {
          level: "warn",
        });
        r.push(key);
        continue;
      }
      if (
        (await fetchOfficialMarketplaceFromGcs(
          value.installLocation,
          getResolvedMarketplacesCacheDir(),
          e,
        )) !== null
      ) {
        logFeatureOk("plugin_official_marketplace_fetch");
        S[key] = {
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
        r.push(key);
        continue;
      }
      q = true;
    }
    try {
      let { cachePath, keptStaleClone } = await loadAndCacheMarketplace(
        value.source,
        key,
        undefined,
        e,
        key,
        undefined,
        knownMarketplacesWithDeclared,
      );
      if (!keptStaleClone)
        S[key] = {
          forSource: value.source,
          patch: {
            lastUpdated: new Date().toISOString(),
            installLocation: cachePath,
          },
        };
      else if (cachePath !== value.installLocation)
        S[key] = {
          forSource: value.source,
          patch: {
            installLocation: cachePath,
          },
        };
      if (q) logFeatureSad("plugin_official_marketplace_fetch", "gcs_failed_git_fallback");
    } catch (error) {
      if (q) logFeatureBad("plugin_official_marketplace_fetch", "gcs_and_git_failed");
      if (error instanceof CommandSourceError) {
        n.push(key);
        logForDebugging(`Marketplace ${key} not refreshed (managed policy): ${errorMessage(error)}`);
        continue;
      }
      r.push(key);
      logForDebugging(`Failed to refresh marketplace ${key}: ${errorMessage(error)}`, {
        level: "error",
      });
    }
  }
  await updateKnownMarketplaces((w) => {
    let L = false;
    for (let [key, { forSource: q, patch: Z }] of Object.entries(S)) {
      let Se = ownPropertyOrUndefined(w, key);
      if (!Se || !En(Se.source, q) || seedDirFor(Se.installLocation)) continue;
      w[key] = {
        ...Se,
        ...Z,
      };
      L = true;
    }
    return L ? w : null;
  }, e);
  return {
    policyRefused: n,
    failed: r,
    attempted: h,
    builtInSkipped: s,
  };
}
//@ chunk-e6aww6q8.js:4311978-4312224 layout
/**
 * 刷新一个市场，同名刷新进行中时复用同一个 Promise 并追加进度监听（全局 marketplaceRefreshesInFlight）。
 */
function refreshMarketplaceDeduped(marketplaceName, storageV5, r, options) {
  let { marketplaceRefreshesInFlight } = getPluginRegistry();
  let y = marketplaceRefreshesInFlight.get(marketplaceName);
  if (y) {
    if (r) y.listeners.push(r);
    return y.promise;
  }
  let S = r ? [r] : [];
  let L = refreshMarketplace(
    marketplaceName,
    storageV5,
    (G) => {
      for (let q of S) safeCallProgress(q, G);
    },
    options,
  ).finally(() => marketplaceRefreshesInFlight.delete(marketplaceName));
  marketplaceRefreshesInFlight.set(marketplaceName, {
    promise: L,
    listeners: S,
  });
  return L;
}
//@ chunk-e6aww6q8.js:4312224-4312980 layout
async function removeMarketplaceCacheDir(e, installLocation, r, knownMarketplacesWithDeclared) {
  let resolvedMarketplacesCacheDir = getResolvedMarketplacesCacheDir();
  let y = resolve_2(getOriginalCwd(), installLocation);
  if (
    classifyMarketplacePath(installLocation).suspect ||
    comparePathContainment(resolvedMarketplacesCacheDir, y, resolvedMarketplacesCacheDir) !== "inside"
  ) {
    let w = claudeCommand("plugin marketplace remove", e);
    throw Error(
      `Marketplace '${quotedPrintable(e)}' has a corrupted installLocation (${printableOrEmpty(installLocation)}) \u2014 expected a path inside ${resolvedMarketplacesCacheDir}. This can happen after cross-platform path writes or manual edits to known_marketplaces.json. ${w ? `Run \`${w}\`` : "Remove the entry"} and re-add it.`,
    );
  }
  let S = await checkMarketplaceDirCollision(
    resolvedMarketplacesCacheDir,
    y,
    e,
    r,
    knownMarketplacesWithDeclared,
  );
  if (S !== undefined) {
    let w = claudeCommand("plugin marketplace remove", e);
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Marketplace '${quotedPrintable(e)}' has a corrupted installLocation (${printableOrEmpty(installLocation)}) \u2014 it belongs to the registered marketplace ` +
        `'${quotedPrintable(S)}'. ${w ? `Run \`${w}\`` : "Remove the entry"} and re-add it.`,
      "marketplace installLocation names another registered marketplace directory",
    );
  }
}
//@ chunk-e6aww6q8.js:4312980-4317754 fingerprint = refreshMarketplace (0.552)
/**
 * 刷新一个市场：git pull/重新下载，校验后更新 lastUpdated；后台模式下失败只记日志。
 */
async function refreshMarketplace(marketplaceName, storageV5, onProgress, options) {
  let knownMarketplacesWithDeclared = await loadKnownMarketplacesWithDeclared(storageV5);
  let y = ownPropertyOrUndefined(knownMarketplacesWithDeclared, marketplaceName);
  let trigger = options?.directoryTrigger ?? (options?.isBackground ? "background" : "update");
  if (
    !y &&
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
    let q = lastUpdated ? Date.now() - new Date(lastUpdated).getTime() : -1;
    if (q >= 0 && q < 30000) {
      logForDebugging(
        `Skipping refresh for marketplace '${marketplaceName}' \u2014 refreshed ${Math.round(q / 1000)}s ago`,
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
  if (!y)
    throw withMarketplaceFailureCode(
      Error(
        `Marketplace '${marketplaceName}' not found. Available marketplaces: ${Object.keys(knownMarketplacesWithDeclared).join(", ")}`,
      ),
      "not_configured",
    );
  if (isPluginDirectorySource(y.source) && pluginDirectoryPolicyBlock() !== null)
    throw withMarketplaceFailureCode(
      withTelemetryMessage(
        new PluginDirectoryUnavailableError(
          `${OFFICIAL_MARKETPLACE_DISPLAY} is blocked by your organization. ${pluginDirectoryPolicyBlockHint()}`,
        ),
        "Plugin directory marketplace refresh blocked by organization policy",
      ),
      "source_blocked_by_policy",
    );
  if (!isSourceAllowedByPolicy(y.source))
    throw withMarketplaceFailureCode(
      Error(`Marketplace source '${formatSourceForDisplay(y.source)}' is blocked by enterprise policy.`),
      "source_blocked_by_policy",
    );
  assertReservedNameTrusted(marketplaceName, y);
  getPluginRegistry().marketplaces.delete(marketplaceName);
  if (options?.skipIfRecent && y.lastUpdated) {
    let G = Date.now() - new Date(y.lastUpdated).getTime();
    if (G >= 0 && G < 30000) {
      logForDebugging(
        `Skipping refresh for marketplace '${marketplaceName}' \u2014 refreshed ${Math.round(G / 1000)}s ago`,
      );
      return;
    }
  }
  if (isClaudeAiMarketplaceSource(y.source)) {
    safeCallProgress(onProgress, "Refreshing plugin list from claude.ai");
    await refreshClaudeAiMarketplace(marketplaceName, y.source, {
      credentials: undefined,
      skipIfRecent: options?.skipIfRecent,
      isBackground: options?.isBackground,
    });
    return;
  }
  if (isPluginDirectorySource(y.source)) {
    safeCallProgress(onProgress, `Refreshing ${OFFICIAL_MARKETPLACE_DISPLAY}`);
    await loadPluginDirectoryMarketplace_2(options?.isBackground ? "if-stale" : "refresh", undefined, {
      staleIsFailure: true,
      trigger,
      signal: options?.directorySignal,
    });
    return;
  }
  if (y.source.source === "settings") {
    assertNotLookAlikeName(marketplaceName, y);
    logForDebugging(
      `Skipping refresh for settings-sourced marketplace '${marketplaceName}' \u2014 no upstream`,
    );
    return;
  }
  if (isDiskless()) throwDisklessMarketplaceFetch(join("plugins", "marketplaces"));
  let w = false;
  let L;
  try {
    let { installLocation, source } = y;
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
    assertNotLookAlikeName(marketplaceName, y);
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
      w = true;
      logForDebugging("Official marketplace GCS failed; falling back to git", {
        level: "warn",
      });
    }
    if (source.source === "github" || source.source === "git") {
      if (source.source === "github") {
        let sshUrl = `git@${GITHUB_HOST}:${source.repo}.git`;
        let httpsUrl = `https://github.com/${source.repo}.git`;
        if (preferHttpsGitTransport())
          L = await cacheMarketplaceFromGit(
            httpsUrl,
            installLocation,
            storageV5,
            source.path,
            source.ref,
            source.sparsePaths,
            onProgress,
          );
        else {
          let [we, Ee] = orderGithubTransports(await isGithubSshConfigured(), sshUrl, httpsUrl);
          try {
            L = await cacheMarketplaceFromGit(
              we.url,
              installLocation,
              storageV5,
              source.path,
              source.ref,
              source.sparsePaths,
              onProgress,
            );
          } catch (error) {
            logForDebugging(
              `Marketplace refresh failed with ${we.transport} for ${source.repo} (${errorMessage(error)}), falling back to ${Ee.transport}`,
              {
                level: "info",
              },
            );
            try {
              L = await cacheMarketplaceFromGit(
                Ee.url,
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
                  ...we,
                  error: toError(error),
                },
                {
                  ...Ee,
                  error: toError(error_2),
                },
              );
            }
          }
        }
      } else
        L = await cacheMarketplaceFromGit(
          source.url,
          installLocation,
          storageV5,
          source.path,
          source.ref,
          source.sparsePaths,
          onProgress,
        );
      warnLfsPointers(installLocation, L, onProgress);
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
        let ke = source.source === "github" ? source.repo : redactUrlsTracked(source.url);
        let reason =
          marketplaceName === "claude-code-plugins"
            ? `We've deprecated "claude-code-plugins" in favor of "claude-plugins-official".`
            : "This marketplace may have been deprecated or moved to a new location.";
        let Ee = claudeCommand("plugin marketplace remove", marketplaceName);
        let Ae = error instanceof ConfigParseError;
        throw withMarketplaceFailureCode(
          Error(
            `The marketplace.json file is no longer present in this repository.

${reason}
Source: ${ke}` +
              (Ee
                ? `

You can remove this marketplace with: ${Ee}`
                : `

You can remove this marketplace from /plugin or by editing known_marketplaces.json.`) +
              (Ae
                ? `

Details: the repository does have a marketplace.json, but it isn't a valid marketplace file: ${errorMessage(error)}`
                : ""),
          ),
          isENOENT(error) || getErrnoCode(error) === "EISDIR"
            ? "manifest_missing"
            : Ae
              ? "manifest_invalid"
              : undefined,
        );
      }
    } else if (source.source === "url") {
      let Se = await describeHelperDeclaration(source, {
        marketplaceName,
        trustedDeclaration: findUrlMarketplaceHeaders(source, marketplaceName),
      });
      let ke =
        isStorageV5Enabled() && storageV5 !== undefined
          ? getSyntheticMarketplaceStorageKey(marketplaceName, source, installLocation)
          : null;
      if (storageV5 !== undefined && ke !== null)
        await cacheMarketplaceFromUrlToStorage(storageV5, ke, source.url, marketplaceName, Se, onProgress);
      else await cacheMarketplaceFromUrlToFile(source.url, installLocation, marketplaceName, Se, onProgress);
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
    if (L?.kind !== "kept-stale") await touchMarketplaceLastUpdated(marketplaceName, storageV5);
    if (w) logFeatureSad("plugin_official_marketplace_fetch", "gcs_failed_git_fallback");
    logForDebugging(`Successfully refreshed marketplace: ${marketplaceName}`);
  } catch (error) {
    if (w) logFeatureBad("plugin_official_marketplace_fetch", "gcs_and_git_failed");
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
//@ chunk-e6aww6q8.js:4317754-4318944 fingerprint = setMarketplaceAutoUpdate (0.513)
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
  await updateKnownMarketplaces((L) => {
    let G = ownPropertyOrUndefined(L, name);
    if (!G || G.autoUpdate === autoUpdate || seedDirFor(G.installLocation)) return null;
    L[name] = {
      ...G,
      autoUpdate,
    };
    return L;
  }, storageV5);
  let declaringSource = supportsPersistence(name);
  if (declaringSource) {
    let declared = removeExtraMarketplace(getSettingsForSourceWriteSeed(declaringSource), name);
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
//@ chunk-e6aww6q8.js:4318944-4319493 placement
/**
 * 把设置中声明的市场 autoUpdate 同步到 known_marketplaces.json。
 */
async function syncDeclaredAutoUpdateToJson(storageV5) {
  let declaredMarketplaces = getDeclaredMarketplaces();
  if (Object.keys(declaredMarketplaces).length === 0) return false;
  try {
    return await updateKnownMarketplaces((r) => {
      let s = false;
      for (let [key, value] of Object.entries(declaredMarketplaces)) {
        if (value.autoUpdate === undefined) continue;
        let S = ownPropertyOrUndefined(r, key);
        if (!S || seedDirFor(S.installLocation)) continue;
        if (isPluginDirectorySource(S.source)) continue;
        if (S.autoUpdate === value.autoUpdate) continue;
        r[key] = {
          ...S,
          autoUpdate: value.autoUpdate,
        };
        s = true;
        logForDebugging(`Synced autoUpdate=${value.autoUpdate} from settings for marketplace: ${key}`);
      }
      return s ? r : null;
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
//@ chunk-e6aww6q8.js:4319493-4319643 placement
/**
 * 插件目录市场状态：on/off/blocked/unavailable。
 */
async function getPluginDirectoryState() {
  let e = pluginDirectoryModuleIfUsable();
  if (!e)
    return isPluginDirectoryModeOn() && pluginDirectoryPolicyBlock() !== null ? "blocked" : "unavailable";
  return (await e.isPluginDirectoryMarketplaceEnabled()) ? "on" : "off";
}
//@ chunk-e6aww6q8.js:4319643-4320055 placement
/**
 * 打开/关闭插件目录市场，不可用或被策略阻止时抛错。
 */
async function setPluginDirectoryEnabled(marketplace) {
  {
    let n = pluginDirectoryModuleIfUsable();
    if (!n)
      throw pluginDirectoryPolicyBlock() === null
        ? new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `The ${OFFICIAL_MARKETPLACE_DISPLAY} isn't available in this session`,
            "plugin directory marketplace toggled while unavailable",
          )
        : new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `${OFFICIAL_MARKETPLACE_DISPLAY} is blocked by your organization. ${pluginDirectoryPolicyBlockHint()}`,
            "plugin directory marketplace toggled while blocked by policy",
          );
    await n.setPluginDirectoryMarketplaceEnabled(marketplace);
    getPluginRegistry().marketplaces.delete(OFFICIAL_MARKETPLACE_NAME);
    return;
  }
  throw Error("Not available in this build");
}
//@ chunk-e6aww6q8.js:4320055-4320361 placement
/**
 * 当前值来自默认时把开关保存为用户的选择。
 */
async function persistPluginDirectoryChoice(e) {
  {
    let n = pluginDirectoryModuleIfUsable();
    if (!n) return;
    try {
      let pluginDirectoryMarketplaceChoice = await n.readPluginDirectoryMarketplaceChoice();
      if (
        pluginDirectoryMarketplaceChoice.source === "flag_default" &&
        pluginDirectoryMarketplaceChoice.enabled === e
      )
        await n.setPluginDirectoryMarketplaceEnabled(e);
    } catch (error) {
      logForDebugging(
        `Could not save "${e ? "on" : "off"}" as the person's choice for the ${OFFICIAL_MARKETPLACE_DISPLAY}: ${errorMessage(error)}`,
        {
          level: "warn",
        },
      );
    }
  }
}
//@ chunk-e6aww6q8.js:4320361-4320575 placement
function findEnablingSettingSource(e, n) {
  let r = pluginSettingRecords(e);
  let s = uniq(r.flatMap(({ record }) => enabledPluginKeysFor(record, e, n)));
  for (let h of s) {
    let found = r.find(({ record }) => record?.[h] !== undefined);
    let S = found?.record?.[h];
    if (found !== undefined && (S === true || Array.isArray(S))) return found.source;
  }
  return;
}
//@ chunk-e6aww6q8.js:4320575-4320613 placement
function enabledPluginKeysFor(e, n, r) {
  return enabledPluginKeys(e, n, r);
}
//@ chunk-e6aww6q8.js:4320613-4320708 placement
function hasDisabledEnabledPlugin(e, n, r) {
  let s = enabledPluginKeysFor(e, n, r);
  return s.some((h) => e?.[h] === false) && !s.some((h) => isDependencyAutoInstallState(e?.[h]));
}
//@ chunk-dcmhvw5a.js:376366-376544 fingerprint = redactUrlCredentials (0.842)
/**
 * URL 去掉用户名口令后返回（用于显示与日志）。
 */
function redactUrlCredentials(urlString) {
  if (urlString === undefined) return;
  let n = stripInvisibleChars(urlString, "");
  try {
    let { protocol, username, password } = new URL(n);
    return (protocol === "https:" || protocol === "http:") && username === "" && password === ""
      ? n
      : undefined;
  } catch {
    return;
  }
}
//@ chunk-s61vbvea.js:532138-532376 callgraph-fingerprint = gitPull (0.191)
/**
 * 确定 git pull 用的 remote（分支配置的 remote，缺省 origin）。
 */
async function gitPull(gitState, cwdOption, branch, gitOptions) {
  if (gitState.hasDir(cwdOption)) return "origin";
  if (branch !== undefined && branch !== "HEAD") {
    let fetchResult = await execGitNoThrow(
      cwdOption,
      ["config", "--get", `branch.${branch}.remote`],
      gitOptions,
    );
    if (fetchResult !== undefined) return fetchResult;
  }
  return (await execGitNoThrow(cwdOption, ["config", "--get", "remote.pushDefault"], gitOptions)) ?? "origin";
}
//@ chunk-sycgf9xs.js:7815-7888 fingerprint = GIT_NO_PROMPT_ENV (0.627)
var GIT_NO_PROMPT_ENV = {
  GIT_TERMINAL_PROMPT: "0",
  GIT_ASKPASS: "",
  GCM_INTERACTIVE: "never",
};
export {
  loadKnownMarketplacesWithDeclared,
  getDeclaredMarketplaces,
  isPluginDirectoryAvailable,
  loadKnownMarketplacesSafe,
  getMarketplaceCacheOnly,
  refreshMarketplaceDeduped,
  tryUnwrapTextPayload,
  seedDirFor,
  getPluginById,
  syncSeedMarketplaces,
  updateKnownMarketplaces,
  addMarketplaceSource,
  getMarketplaceOrDirectoryCatalog,
  getPluginByIdAnySource,
  GIT_NO_PROMPT_ENV,
  isImpersonatingOfficialMarketplace,
  lookUpPluginForSwitch,
  formatSwitchNeedsFreshReadMessage,
  getPluginDirectoryState,
  getPluginByIdCacheOnly,
  isPluginDirectoryListingBlocked,
  getMarketplace,
  pluginDirectoryNotInstallableMessage,
  isKnownMarketplacesReadFailure,
  validateReservedMarketplaceEntry,
  findPluginDirectoryEntry,
  findMissedListingEntry,
  loadPluginDirectoryMarketplace,
  isRegistryOwnedByName,
  pluginDirectoryNotInstallableReason,
  isWorkspaceTrustedForMarketplace,
  redactUrlCredentials,
  removeMarketplaceWithReservedSiblings,
  setPluginDirectoryEnabled,
  persistPluginDirectoryChoice,
  saveMarketplaceToSettings,
  findMarketplaceBySourceLoose,
  refreshAllMarketplaces,
  PLUGIN_DIRECTORY_CATALOG_MISSING,
  PluginDirectoryCatalogMissingError,
  lookalikeReservedMarketplaceName,
  reservedMarketplaceSpellingMessage,
  syncDeclaredAutoUpdateToJson,
  isGitHubSshLikelyConfigured,
  reconcileSparseCheckout,
  getCachePathForSource,
  getStorageArm,
  settingsSourceOfMarketplace,
  normalizeInstallLocation,
  collectOrgBlockedPlugins,
  isListingBlocked,
  pluginDirectoryUnavailableKind,
  awaitPluginDirectoryVerdict,
  pluginDirectoryRefusalReason,
  ensurePluginDirectoryCatalog,
  registerSeedMarketplaces,
  findSeedMarketplaceLocation,
  gitPull,
  findMarketplaceBySource,
  setMarketplaceAutoUpdate,
};
