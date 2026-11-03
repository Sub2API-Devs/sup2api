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
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
  join as join_21,
  join as join_22,
  join as join_23,
  join as join_24,
  join as join_25,
  join as join_26,
  join as join_27,
  join as join_28,
  join as join_29,
  join as join_30,
  join as join_31,
  join as join_32,
  join as join_33,
  join as join_34,
  join as join_35,
  join as join_36,
  join as join_37,
  join as join_38,
  join as join_40,
  join as join_41,
  join as join_42,
  join as join_43,
  join as join_44,
  join as join_45,
  join as join_46,
  join as join_47,
  join as join_48,
  join as join_49,
  join as join_50,
  join as join_51,
  join as join_52,
  join as join_53,
  join as join_54,
  join as join_55,
  join as join_56,
  join as join_57,
  join as join_58,
  join as join_59,
  join as join_60,
  join as join_61,
  join as join_62,
  join as join_63,
  join as join_64,
  join as join_65,
  join as join_66,
  join as join_67,
  join as join_68,
  join as join_69,
  join as join_70,
  join as join_71,
  join as join_72,
  join as join_73,
  join as join_74,
  join as join_75,
  join as join_76,
  join as join_77,
  join as join_78,
  join as join_79,
  join as join_80,
  join as join_81,
  join as join_82,
  join as join_84,
  join as join_85,
  join as join_86,
  join as join_87,
  join as join_88,
  join as join_89,
  join as join_90,
  join as join_91,
  join as join_92,
  join as join_93,
  join as join_94,
  join as join_95,
  join as join_96,
  join as join_97,
  join as join_98,
  join as join_99,
  join as join_100,
  join as join_101,
  join as join_102,
  join as join_103,
  join as join_104,
  join as join_105,
  join as join_106,
  join as join_107,
  join as join_108,
  join as join_109,
  join as join_110,
  join as join_111,
  join as join_112,
  join as join_113,
  join as join_114,
  join as join_115,
  join as join_116,
  join as join_117,
  join as join_118,
  join as join_119,
  join as join_120,
  join as join_121,
  join as join_122,
  join as join_123,
  join as join_124,
  join as join_125,
  join as join_126,
  join as join_127,
  join as join_128,
  join as join_129,
  resolve as resolve_2,
  resolve as resolve_3,
  resolve as resolve_4,
  resolve as resolve_5,
  resolve as resolve_6,
  resolve as resolve_7,
  resolve as resolve_8,
  resolve as resolve_9,
  resolve as resolve_10,
  resolve as resolve_11,
  resolve as resolve_12,
  resolve as resolve_13,
  resolve as resolve_14,
  resolve as resolve_15,
  resolve as resolve_16,
  resolve as resolve_17,
  resolve as resolve_18,
  resolve as resolve_19,
  resolve as resolve_20,
  resolve as resolve_21,
  resolve as resolve_22,
  resolve as resolve_23,
  resolve as resolve_24,
  resolve as resolve_25,
  resolve as resolve_26,
  resolve as resolve_27,
  resolve as resolve_28,
  resolve as resolve_29,
  resolve as resolve_30,
  resolve as resolve_31,
  resolve as resolve_32,
  resolve as resolve_33,
  resolve as resolve_34,
  resolve as resolve_35,
  resolve as resolve_36,
  resolve as resolve_37,
  resolve as resolve_38,
  resolve as resolve_39,
  resolve as resolve_40,
  resolve as resolve_41,
  resolve as resolve_42,
  resolve as resolve_43,
  resolve as resolve_44,
  resolve as resolve_45,
  resolve as resolve_46,
  resolve as resolve_47,
  resolve as resolve_48,
  resolve as resolve_49,
  resolve as resolve_50,
  resolve as resolve_51,
  resolve as resolve_52,
  resolve as resolve_53,
  resolve as resolve_54,
  resolve as resolve_55,
  resolve as resolve_56,
  resolve as resolve_57,
  resolve as resolve_58,
  resolve as resolve_59,
  resolve as resolve_60,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  sep as sep_9,
  sep as sep_10,
  sep as sep_11,
  sep as sep_12,
  sep as sep_13,
  sep as sep_14,
  sep as sep_15,
  sep as sep_16,
  sep as sep_17,
  sep as sep_18,
  sep as sep_19,
  sep as sep_20,
  sep as sep_21,
  sep as sep_22,
  sep as sep_23,
  sep as sep_24,
  sep as sep_25,
  sep as sep_26,
  sep as sep_27,
  sep as sep_28,
  sep as sep_29,
  sep as sep_30,
  sep as sep_31,
  sep as sep_32,
  sep as sep_33,
  sep as sep_34,
  sep as sep_35,
  sep as sep_36,
  sep as sep_37,
  sep as sep_38,
  sep as sep_39,
  sep as sep_40,
  sep as sep_41,
  sep as sep_42,
  sep as sep_43,
  sep as sep_44,
  sep as sep_45,
  sep as sep_46,
  sep as sep_47,
  sep as sep_48,
  sep as sep_49,
  sep as sep_50,
  sep as sep_51,
  sep as sep_52,
  sep as sep_53,
  sep as sep_54,
  sep as sep_55,
  sep as sep_56,
  sep as sep_57,
  sep as sep_58,
  sep as sep_59,
  sep as sep_60,
  sep as sep_61,
  sep as sep_62,
  sep as sep_63,
  sep as sep_64,
  sep as sep_65,
  sep as sep_66,
  sep as sep_67,
  sep as sep_68,
  sep as sep_69,
  sep as sep_70,
  sep as sep_71,
  sep as sep_72,
  sep as sep_73,
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
  basename as basename_7,
  basename as basename_8,
  basename as basename_9,
  basename as basename_10,
  basename as basename_11,
  basename as basename_12,
  basename as basename_13,
  basename as basename_14,
  basename as basename_15,
  basename as basename_16,
  basename as basename_17,
  basename as basename_18,
  basename as basename_19,
  basename as basename_20,
  basename as basename_21,
  basename as basename_22,
  basename as basename_23,
  basename as basename_24,
  basename as basename_25,
  basename as basename_26,
  basename as basename_27,
  basename as basename_28,
  basename as basename_29,
  basename as basename_30,
  basename as basename_31,
  basename as basename_32,
  basename as basename_33,
  basename as basename_34,
  basename as basename_35,
  basename as basename_36,
  basename as basename_37,
  basename as basename_38,
  basename as basename_39,
  basename as basename_40,
  basename as basename_41,
  basename as basename_42,
  basename as basename_43,
  basename as basename_45,
  basename as basename_46,
  basename as basename_47,
  basename as basename_48,
  basename as basename_49,
  basename as basename_50,
  basename as basename_51,
  basename as basename_52,
  basename as basename_53,
  basename as basename_54,
  basename as basename_55,
  basename as basename_56,
  basename as basename_57,
  basename as basename_58,
  basename as basename_59,
  basename as basename_60,
  basename as basename_61,
  basename as basename_62,
  basename as basename_63,
  basename as basename_64,
  basename as basename_65,
  basename as basename_66,
  basename as basename_67,
  basename as basename_68,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
  dirname as dirname_9,
  dirname as dirname_10,
  dirname as dirname_11,
  dirname as dirname_12,
  dirname as dirname_13,
  dirname as dirname_14,
  dirname as dirname_15,
  dirname as dirname_16,
  dirname as dirname_17,
  dirname as dirname_18,
  dirname as dirname_19,
  dirname as dirname_20,
  dirname as dirname_21,
  dirname as dirname_22,
  dirname as dirname_23,
  dirname as dirname_24,
  dirname as dirname_25,
  dirname as dirname_26,
  dirname as dirname_27,
  dirname as dirname_28,
  dirname as dirname_29,
  dirname as dirname_30,
  dirname as dirname_31,
  dirname as dirname_32,
  dirname as dirname_33,
  dirname as dirname_34,
  dirname as dirname_35,
  dirname as dirname_36,
  dirname as dirname_37,
  dirname as dirname_38,
  dirname as dirname_39,
  dirname as dirname_40,
  dirname as dirname_41,
  dirname as dirname_42,
  dirname as dirname_43,
  dirname as dirname_44,
  dirname as dirname_45,
  dirname as dirname_46,
  dirname as dirname_47,
  dirname as dirname_48,
  dirname as dirname_49,
  dirname as dirname_50,
  dirname as dirname_51,
  dirname as dirname_52,
  dirname as dirname_53,
  dirname as dirname_54,
  dirname as dirname_55,
  dirname as dirname_56,
  dirname as dirname_57,
  dirname as dirname_58,
  dirname as dirname_59,
  dirname as dirname_60,
  dirname as dirname_61,
  dirname as dirname_62,
  dirname as dirname_63,
  dirname as dirname_64,
  dirname as dirname_65,
  dirname as dirname_66,
  dirname as dirname_67,
  dirname as dirname_68,
  dirname as dirname_69,
  dirname as dirname_70,
  dirname as dirname_71,
  dirname as dirname_72,
  dirname as dirname_73,
  dirname as dirname_74,
  dirname as dirname_75,
  dirname as dirname_76,
  dirname as dirname_77,
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  isAbsolute as isAbsolute_4,
  isAbsolute as isAbsolute_5,
  isAbsolute as isAbsolute_6,
  isAbsolute as isAbsolute_7,
  isAbsolute as isAbsolute_8,
  isAbsolute as isAbsolute_9,
  isAbsolute as isAbsolute_10,
  isAbsolute as isAbsolute_11,
  isAbsolute as isAbsolute_12,
  isAbsolute as isAbsolute_13,
  isAbsolute as isAbsolute_14,
  isAbsolute as isAbsolute_15,
  isAbsolute as isAbsolute_16,
  isAbsolute as isAbsolute_17,
  isAbsolute as isAbsolute_18,
  isAbsolute as isAbsolute_19,
  isAbsolute as isAbsolute_20,
  isAbsolute as isAbsolute_21,
  isAbsolute as isAbsolute_22,
  isAbsolute as isAbsolute_23,
  isAbsolute as isAbsolute_24,
  isAbsolute as isAbsolute_25,
  isAbsolute as isAbsolute_26,
  isAbsolute as isAbsolute_27,
  isAbsolute as isAbsolute_28,
  isAbsolute as isAbsolute_29,
  isAbsolute as isAbsolute_30,
  isAbsolute as isAbsolute_31,
  isAbsolute as isAbsolute_32,
  isAbsolute as isAbsolute_33,
  isAbsolute as isAbsolute_34,
  isAbsolute as isAbsolute_35,
  isAbsolute as isAbsolute_36,
  isAbsolute as isAbsolute_37,
  isAbsolute as isAbsolute_38,
  isAbsolute as isAbsolute_39,
  isAbsolute as isAbsolute_40,
  isAbsolute as isAbsolute_42,
  isAbsolute as isAbsolute_43,
  isAbsolute as isAbsolute_44,
  isAbsolute as isAbsolute_45,
  isAbsolute as isAbsolute_46,
  isAbsolute as isAbsolute_47,
  isAbsolute as isAbsolute_48,
  isAbsolute as isAbsolute_49,
  isAbsolute as isAbsolute_50,
  isAbsolute as isAbsolute_51,
  isAbsolute as isAbsolute_52,
  isAbsolute as isAbsolute_53,
  isAbsolute as isAbsolute_54,
  isAbsolute as isAbsolute_55,
  isAbsolute as isAbsolute_56,
  isAbsolute as isAbsolute_57,
} from "path";
import {
  writeFile,
  writeFile as writeFile_2,
  writeFile as writeFile_3,
  writeFile as writeFile_4,
  writeFile as writeFile_5,
  writeFile as writeFile_6,
  writeFile as writeFile_7,
  writeFile as writeFile_8,
  writeFile as writeFile_9,
  writeFile as writeFile_10,
  writeFile as writeFile_11,
  writeFile as writeFile_12,
  writeFile as writeFile_13,
  writeFile as writeFile_14,
  writeFile as writeFile_15,
  writeFile as writeFile_16,
  writeFile as writeFile_17,
  writeFile as writeFile_18,
} from "fs/promises";
import { execFileNoThrow, execFileNoThrowWithCwd, execGitNoThrow } from "../execFileNoThrow.js";
import {
  xut,
  SMe,
  SSH_BATCH_CONFIG_ARGS,
  prepareGitWorkDir,
  pickGitNoPromptEnv,
  NMt,
} from "../gitSafeExec.js";
import { logForDebugging } from "../debug.js";
import { isSshAuthFailureOutput, resolveGitSshConfig, zpe } from "./gitSshConfig.js";
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
import { freeze as freeze_23 } from "../git/gitSafeEnv.js";
import { buildGitEnvForRepo } from "../git/gitDirResolution.js";
import { listSubmodulePaths, j3r } from "../git/submoduleInspection.js";
import { msUntilDeadline, pickSubmodulesToFetch } from "./marketplaceSubmodules.js";
import {
  MAX_SCANNED_BYTES,
  probeMarketplaceCheckout,
  qWn,
  checkGitLfsFiles,
  describeGitLfsMissing,
} from "./marketplaceGitCheckout.js";
import { LITERAL_PATHSPEC_ENV } from "../git/builderGit/gitRun.js";
import { isWorkspacePersistedTrusted } from "../config.js";
import { QE } from "./pluginGates.js";
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
  Tet,
  relocateInstallPath,
  getPluginSeedDirs,
  getMarketplaceStorageKey,
  PJr,
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
import { CLAUDE_PLUGINS_OFFICIAL, Epe } from "./officialMarketplace.js";
import { getPluginRegistry } from "./pluginLoadState.js";
import {
  getNonRepoExtraMarketplaces,
  Zb,
  filterAdmittedMarketplaces,
  weakMap_11,
  HIe,
  Vj,
  findUrlMarketplaceHeaders,
  isSourceConsistentWith,
  describeUnusableMarketplaceSource,
  MARKETPLACE_SOURCE_FIX_HINTS,
  MARKETPLACE_SOURCE_FAILURE_CODES,
  uF,
  L6,
  listReservedNameRefusals,
  Xut,
  O1n,
  uGn,
  reservedMarketplaceNameMessage,
  getAdmittedMarketplaceEntry,
  findAutoUpdateOverrideSource,
  supportsPersistence,
} from "./marketplaceSources.js";
import { mergeExtraKnownMarketplacesByEntry } from "../settings/policyTiers.js";
import {
  normalizeLocalMarketplaceSource,
  classifyMarketplacePath,
  f5t,
  readLocalMarketplaceFile,
  enoentError,
} from "./localMarketplacePaths.js";
import { En, xr } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import {
  readClaudeAiMarketplaceRegistry,
  toKnownMarketplaceEntry,
  omitClaudeAiMarketplaces,
  X5,
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
  cbr,
} from "./officialMarketplaceNames.js";
import { logDirectoryBlockedOnce, krt } from "./pluginDirectoryTelemetry.js";
import { nri } from "./commandSourceErrors.js";
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
  NPM,
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
import { FX, $Zn } from "../../services/memorySync/pathScrub.js";
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
  cdr,
  reservedNameMessage as reservedNameMessage_2,
  marketplaceLoadFailedMessage,
  getMarketplaceStorageLocation,
  RESERVED_MARKETPLACE_NAME_MESSAGE,
} from "./marketplaceNames.js";
import { removeDirectoryTreeNoFollow } from "../fsRemove.js";
import { logPluginFetch, classifyFetchError } from "./fetchTelemetry.js";
import { CLAUDE_CODE_PLUGIN_MANAGER, FVt, makeTempCachePathName, Bd } from "./commandSource.js";
import { externalHttp } from "../../services/http/externalHttp.js";
import { checkCatalogRedirect, t6o } from "./archiveDownload.js";
import { findTelemetrySafeCause, describeHelperDeclaration } from "./headersHelper.js";
import { isAxiosError } from "../../../vendor/axios/dist/esm/axios.js";
import { A, oe } from "../../../vendor/zod/v4/classic/schemas.js";
import { withMarketplaceFailureCode, bfe, getMarketplaceFailureCode } from "./marketplaceErrors.js";
import { Wo } from "../json.js";
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
import { or } from "../settings/commandSyncNames.js";
import { EDITABLE_SETTING_SOURCES } from "../settings/constants.js";
import { mO, getEnabledPluginIdsForScope } from "./dependencyResolver.js";
import { K1n, FGn } from "./pluginVersioning.js";
import { settingsSourceName } from "../settings/settingsSourceTrust.js";
import { removeExtraMarketplace } from "../../commands/plugin/PluginSettings.js";
import { isSafeCliArg, claudeCommand } from "../worktreeResumeHint.js";
import {
  loadInstalledPlugins,
  PF,
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
import { _Br } from "./pluginSettingsSources.js";
import { stripInvisibleChars } from "../sanitization.js";

/**
 * zip 缓存/种子目录中市场 JSON 的相对路径 marketplaces/<名字转义>.json。
 */
//@ chunk-e6aww6q8.js:611593-611687 fingerprint = findSeedMarketplaceLocation (1)
function findSeedMarketplaceLocation(e) {
  let replaced = e.replace(/[^a-zA-Z0-9\-_]/g, "-");
  return join_12("marketplaces", `${replaced}.json`);
}
//@ chunk-e6aww6q8.js:731294-731349 affinity
async function isGithubSshConfigured() {
  return (await isGitHubSshLikelyConfigured()) === "configured";
}
/**
 * 用 ssh -T git@github.com（BatchMode、2 秒超时）探测 GitHub SSH 是否已配置，决定先用 SSH 还是 HTTPS 克隆。
 */
//@ chunk-e6aww6q8.js:731349-731913 fingerprint = isGitHubSshLikelyConfigured (0.894)
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
        { cwd: xut(), timeout: 3000 },
      ),
      n = `${result.stdout ?? ""}
${result.stderr ?? ""}`,
      configured = result.code === 1 && n.includes("successfully authenticated");
    if ((logForDebugging(`SSH config check: code=${result.code} configured=${configured}`), configured))
      return "configured";
    if (result.timedOut) return "unknown";
    if (result.code === 255 && isSshAuthFailureOutput(n)) return "not-configured";
    return (await whichAsync("ssh")) === null ? "not-configured" : "unknown";
  } catch (error) {
    return (
      logForDebugging(`SSH configuration check failed: ${errorMessage(error)}`, { level: "warn" }),
      "unknown"
    );
  }
}
/**
 * 已有克隆的 remote URL 与 sparse-checkout 配置是否需要重新对齐。
 */
//@ chunk-e6aww6q8.js:3591085-3591246 fingerprint = reconcileSparseCheckout (0.442)
async function reconcileSparseCheckout(cwd, sparsePaths) {
  let check = await execFileNoThrowWithCwd(
    gitExe(),
    [...freeze_23, "config", "--get", `remote.${sparsePaths}.url`],
    { cwd: cwd, env: buildGitEnvForRepo(cwd), stdin: "ignore" },
  );
  return check.code === 0 && check.stdout.trim() !== "";
}
/**
 * 市场克隆后更新子模块（受截止时间约束，失败给出进度提示）。
 */
//@ chunk-e6aww6q8.js:4192802-4193818 fingerprint = gitSubmoduleUpdate (0.492)
async function gitSubmoduleUpdate({
  checkoutDir: checkoutDir,
  manifestPath: manifestPath,
  inCheckoutArgs: inCheckoutArgs,
  env: env,
  deadline: deadline,
}) {
  let y = { repository: inCheckoutArgs, env: env },
    S = await listSubmodulePaths(checkoutDir, { ...y, deadlineMs: msUntilDeadline(deadline) });
  if (Array.isArray(S) && S.length === 0) return { result: void 0, submodules: void 0 };
  let w = Array.isArray(S) ? await j3r(checkoutDir, { ...y, deadlineMs: msUntilDeadline(deadline) }) : S,
    L = new Set(Array.isArray(w) ? w : []),
    G = Array.isArray(S) && Array.isArray(w) ? S.filter((we) => L.has(we)) : void 0,
    q =
      G === void 0
        ? "all"
        : G.length === 0
          ? []
          : await pickSubmodulesToFetch({
              checkoutDir: checkoutDir,
              manifestPath: manifestPath,
              submodules: G,
              inCheckoutArgs: inCheckoutArgs,
              env: env,
              deadline: deadline,
            }),
    Z = q !== "all" && q.join(" ").length <= MAX_SCANNED_BYTES ? q : "all",
    Se = { recorded: G?.length, fetched: Z === "all" ? "all" : Z.length };
  if (
    (logForDebugging(
      `Marketplace clone: ${Se.recorded ?? "an unknown number of"} submodules recorded, fetching ${Se.fetched}`,
    ),
    Se.fetched === 0)
  )
    return { result: void 0, submodules: Se };
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
        env: { ...env, ...LITERAL_PATHSPEC_ENV },
        timeout: msUntilDeadline(deadline),
        stdin: "ignore",
      },
    ),
    submodules: Se,
  };
}
//@ chunk-e6aww6q8.js:4224911-4224938 placement
function lEt() {
  return isWorkspacePersistedTrusted();
}
//@ chunk-e6aww6q8.js:4224938-4225011 placement
var $6 = require("./chunk-s67w32sp.js"),
  X1n = require("./chunk-yh2j89hr.js");
//@ chunk-e6aww6q8.js:4225011-4225058 placement
function SC() {
  return QE() && pluginDirectoryPolicyBlock() === null ? $6 : null;
}
//@ chunk-e6aww6q8.js:4225058-4225091 placement
function Eq() {
  return SC() !== null;
}
//@ chunk-e6aww6q8.js:4225091-4225125 fingerprint = getKnownMarketplacesFile (1)
var KNOWN_MARKETPLACES_FILENAME = "known_marketplaces.json";
//@ chunk-e6aww6q8.js:4225125-4225159 layout
function getKnownMarketplacesPath() {
  return join_29(getPluginsDirectory(), KNOWN_MARKETPLACES_FILENAME);
}
//@ chunk-e6aww6q8.js:4225159-4225194 layout
function getKnownMarketplacesPathForDisplay() {
  return isDiskless() ? KNOWN_MARKETPLACES_FILENAME : getKnownMarketplacesPath();
}
//@ chunk-e6aww6q8.js:4225194-4225236 fingerprint = getMarketplacesCacheDir (1)
function getMarketplacesStorageScope() {
  return Tet("marketplaces");
}
/**
 * 读取所有设置源里的 extraKnownMarketplaces（以及种子/托管声明），返回 名字→{source, sourceIsFallback…}。
 */
//@ chunk-e6aww6q8.js:4234796-4235057 fingerprint = getDeclaredMarketplaces (1)
function getDeclaredMarketplaces() {
  let implicit = {},
    enabledPlugins = { ...getAddDirEnabledPlugins(), ...(getInitialSettings_2().enabledPlugins ?? {}) };
  for (let [h, y] of Object.entries(enabledPlugins))
    if (y && parsePluginIdentifier(h).marketplace === CLAUDE_PLUGINS_OFFICIAL) {
      implicit[CLAUDE_PLUGINS_OFFICIAL] = { source: Epe, sourceIsFallback: !0 };
      break;
    }
  let r = lEt(),
    s = r
      ? normalizeLocalMarketplaceSources(getInitialSettings_2().extraKnownMarketplaces ?? {})
      : tryUnwrapTextPayload();
  return { ...implicit, ...(r ? getAddDirExtraMarketplaces() : {}), ...s };
}
/**
 * 合并各来源声明的 extras 并按输入做记忆化缓存（operatorDeclaredMemo），被多处设置/插件逻辑使用；与 MCP UI 无关。
 */
//@ chunk-e6aww6q8.js:4236073-4236366 placement = tryUnwrapTextPayload (0.311)
function tryUnwrapTextPayload() {
  let e = getPluginRegistry(),
    n = getNonRepoExtraMarketplaces(),
    flattened = n.flatMap((y) => [y.source, y.extras]),
    operatorDeclaredMemo = e.operatorDeclaredMemo;
  if (
    operatorDeclaredMemo !== void 0 &&
    operatorDeclaredMemo.inputs.length === flattened.length &&
    operatorDeclaredMemo.inputs.every((input, S) => input === flattened[S])
  )
    return operatorDeclaredMemo.value;
  let h = {};
  for (let { extras: extras } of n) if (extras) h = mergeExtraKnownMarketplacesByEntry(h, extras);
  return (
    (h = normalizeLocalMarketplaceSources(h)),
    (e.operatorDeclaredMemo = { inputs: flattened, value: h }),
    h
  );
}
//@ chunk-e6aww6q8.js:4236366-4236511 placement
function normalizeLocalMarketplaceSources(e) {
  let n;
  for (let [r, s] of Object.entries(e)) {
    let h = normalizeLocalMarketplaceSource(s.source);
    if (h === s.source) continue;
    ((n ??= { ...e }), (n[r] = { ...s, source: h }));
  }
  return n ?? e;
}
//@ chunk-e6aww6q8.js:4236511-4236553 placement
function FIe(e) {
  return Zb(tryUnwrapTextPayload(), e)?.source;
}
//@ chunk-e6aww6q8.js:4236553-4236630 placement
function rhs(e) {
  return Object.values(tryUnwrapTextPayload()).find((n) => En(n.source, e))?.source;
}
/**
 * 把市场写入某设置源（默认 userSettings）的 extraKnownMarketplaces。
 */
//@ chunk-e6aww6q8.js:4242257-4242385 fingerprint = saveMarketplaceToSettings (1)
function saveMarketplaceToSettings(e, n, r = "userSettings", s) {
  return updateSettingsForSourceWithTransform(
    r,
    (h) => ({ extraKnownMarketplaces: { ...h?.extraKnownMarketplaces, [e]: n } }),
    void 0,
    s,
  );
}
/**
 * 读取 known_marketplaces.json，补上设置里 extraKnownMarketplaces 声明但尚未写盘的市场，以及（开启时）内置的 anthropic-plugin-directory 市场；返回 名字→KnownMarketplace。
 */
//@ chunk-e6aww6q8.js:4242385-4242853 layout
async function loadKnownMarketplacesWithDeclared(e) {
  let [n, r] = await Promise.all([loadKnownMarketplacesConfig(e), readClaudeAiMarketplaceRegistry()]),
    s = filterAdmittedMarketplaces(n, getStorageArm(e)),
    h = s;
  for (let [w, L] of Object.entries(r)) {
    if (Object.hasOwn(s, w)) continue;
    if (h === s) h = { ...s };
    h[w] = toKnownMarketplaceEntry(w, L);
  }
  let y = QE() ? $6 : null;
  if (y && !Object.hasOwn(h, OFFICIAL_MARKETPLACE_NAME)) {
    let w = pluginDirectoryPolicyBlock();
    if (w !== null) logDirectoryBlockedOnce(w);
    if (w !== null || (await y.isPluginDirectoryMarketplaceEnabled())) {
      if (h === s) h = { ...s };
      h[OFFICIAL_MARKETPLACE_NAME] = await y.pluginDirectoryRegistryEntry();
    }
  }
  nri(h[OFFICIAL_MARKETPLACE_NAME]?.source?.source);
  let S = weakMap_11.get(s);
  if (h !== s && S !== void 0) weakMap_11.set(h, S);
  return h;
}
/**
 * 存储模式：storageV5 可用为 "v5"，否则 "raw"。
 */
//@ chunk-e6aww6q8.js:4242853-4242916 layout
function getStorageArm(e) {
  return isStorageV5Enabled() && e !== void 0 && getMarketplacesStorageScope() !== null ? "v5" : "raw";
}
/**
 * 读 known_marketplaces.json 并用 KnownMarketplacesFileSchema 校验，非法条目（保留名、来源不合法）丢弃并记日志；读不到抛 TelemetrySafeError。
 */
//@ chunk-e6aww6q8.js:4242916-4244446 fingerprint = loadKnownMarketplacesConfig (0.657)
async function loadKnownMarketplacesConfig(e) {
  let n = isStorageV5Enabled() && e !== void 0 ? getMarketplacesStorageScope() : null;
  if (e !== void 0 && n !== null) {
    let fs = getKnownMarketplacesPathForDisplay(),
      read = await e.read([n]);
    if (!read.ok) {
      let L = `Failed to load marketplace configuration: ${formatStorageError(read.error)}`;
      throw (
        logForDebugging(L, { level: "error" }),
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          L,
          "failed to load marketplace configuration (v5 backend error)",
        )
      );
    }
    let y = read.value.items[0];
    if (y === void 0)
      throw (
        logForDebugging(
          "Failed to load marketplace configuration: the backend returned no item for the registry key",
          { level: "error" },
        ),
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          "Failed to load marketplace configuration: the backend returned no item for the registry key",
          "failed to load marketplace configuration (v5 backend error)",
        )
      );
    if (!y.found) return {};
    let S;
    try {
      S = jsonParse(Buffer.from(y.value).toString("utf-8"));
    } catch (error) {
      let G = `Failed to load marketplace configuration: ${errorMessage(error)}`;
      throw (
        logForDebugging(G, { level: "error" }),
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          G,
          "failed to load marketplace configuration (v5 parse error)",
        )
      );
    }
    let safeParse = KnownMarketplacesFileSchema().safeParse(S);
    if (!safeParse.success) {
      let L = `Marketplace configuration file is corrupted: ${safeParse.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join(", ")}`;
      throw (logForDebugging(L, { level: "error" }), new ConfigParseError(L, fs, S));
    }
    return normalizeInstallLocations(safeParse.data);
  }
  if (isDiskless()) return {};
  let configFile = getKnownMarketplacesPath();
  try {
    let content = await getFsImplementation().readFile(configFile, { encoding: "utf-8" }),
      data = jsonParse(content),
      parsed = KnownMarketplacesFileSchema().safeParse(data);
    if (!parsed.success) {
      let errorMsg = `Marketplace configuration file is corrupted: ${parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join(", ")}`;
      throw (logForDebugging(errorMsg, { level: "error" }), new ConfigParseError(errorMsg, configFile, data));
    }
    return normalizeInstallLocations(parsed.data);
  } catch (error) {
    if (isENOENT(error)) return {};
    if (error instanceof ConfigParseError) throw error;
    let errorMsg = `Failed to load marketplace configuration: ${errorMessage(error)}`;
    throw (logForDebugging(errorMsg, { level: "error" }), Error(errorMsg));
  }
}
/**
 * 规范化 known_marketplaces 中的 installLocation（本地来源与种子目录除外）。
 */
//@ chunk-e6aww6q8.js:4244446-4244564 layout
function normalizeInstallLocation(e, n) {
  if (
    typeof n !== "string" ||
    typeof e !== "object" ||
    e === null ||
    isLocalMarketplaceSource(e) ||
    seedDirFor(n) !== void 0
  )
    return n;
  return relocateInstallPath(n);
}
//@ chunk-e6aww6q8.js:4244564-4244669 layout
function normalizeInstallLocations(e) {
  for (let n of Object.values(e)) n.installLocation = normalizeInstallLocation(n.source, n.installLocation);
  return e;
}
/**
 * 同 loadKnownMarketplacesWithDeclared，但读失败时返回一个被标记为“读失败”的空对象（isKnownMarketplacesReadFailure 可判断），调用方据此区分“没有市场”和“读不到”。
 */
//@ chunk-e6aww6q8.js:4244669-4244749 layout
async function loadKnownMarketplacesSafe(e) {
  try {
    return await loadKnownMarketplacesWithDeclared(e);
  } catch {
    let n = {};
    return (failedKnownMarketplacesReads.add(n), n);
  }
}
//@ chunk-e6aww6q8.js:4244749-4244769 layout
var failedKnownMarketplacesReads = new WeakSet();
/**
 * 判断一个已知市场表对象是否为“读失败”占位。
 */
//@ chunk-e6aww6q8.js:4244769-4244803 layout
function isKnownMarketplacesReadFailure(e) {
  return failedKnownMarketplacesReads.has(e);
}
/**
 * 校验后写回 known_marketplaces.json（原子写），失败抛错。
 */
//@ chunk-e6aww6q8.js:4244803-4245409 fingerprint = saveKnownMarketplacesConfig (0.43)
async function saveKnownMarketplacesConfig(e, n, r = new Map()) {
  let s = getStorageArm(n),
    h = omitPluginDirectoryEntries(omitClaudeAiMarketplaces(e));
  for (let [q, Z] of r) {
    if (HIe()[s].has(q)) continue;
    if (!Object.hasOwn(h, q)) h = { ...h, [q]: Z };
  }
  let parsed = KnownMarketplacesFileSchema().safeParse(h);
  if (!parsed.success)
    throw new ConfigParseError(
      `Invalid marketplace config: ${parsed.error.message}`,
      getKnownMarketplacesPathForDisplay(),
      h,
    );
  let S = isStorageV5Enabled() && n !== void 0 ? getMarketplacesStorageScope() : null;
  if (isStorageV5Enabled() && n !== void 0 && S !== null) {
    let write = await n.write(S, jsonStringify(parsed.data, null, 2), { mode: 438 & ~process.umask() });
    if (!write.ok)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Failed to save marketplace configuration: ${formatStorageError(write.error)}`,
        "failed to save marketplace configuration (v5 backend error)",
      );
    return;
  }
  let configFile = getFsImplementation(),
    fs = getKnownMarketplacesPath(),
    dir = join_29(fs, "..");
  (await configFile.mkdir(dir), writeAndPublishSync(fs, jsonStringify(parsed.data, null, 2)));
}
//@ chunk-e6aww6q8.js:4245409-4245422 layout
var knownMarketplacesWriteQueue = createKeyedQueue();
//@ chunk-e6aww6q8.js:4245422-4245456 layout
function drainKnownMarketplacesWrites() {
  return knownMarketplacesWriteQueue.drain();
}
//@ chunk-e6aww6q8.js:4245456-4245465 layout
registerWriteQueueDrain(drainKnownMarketplacesWrites);
/**
 * 对 known_marketplaces.json 做串行化的读-改-写：进程内队列 + proper-lockfile 文件锁（.lock，重试 5 次）；回调返回 null 表示不写；存储后端模式下走存储层。
 */
//@ chunk-e6aww6q8.js:4245465-4246111 layout
async function updateKnownMarketplaces(e, n) {
  if (isDiskless()) {
    if (getStorageArm(n) === "raw")
      return (warnDisklessSettingsWrite("known_marketplaces", KNOWN_MARKETPLACES_FILENAME), !1);
    return knownMarketplacesWriteQueue.run(KNOWN_MARKETPLACES_FILENAME, () =>
      updateKnownMarketplacesLocked(e, n),
    );
  }
  let r = getKnownMarketplacesPath();
  return knownMarketplacesWriteQueue.run(r, async () => {
    await getFsImplementation().mkdir(join_29(r, ".."));
    let h,
      y = !1;
    try {
      h = await lock(r, {
        lockfilePath: `${r}.lock`,
        realpath: !1,
        retries: { retries: 5, minTimeout: 100, maxTimeout: 1000 },
        onCompromised: (S) => {
          logForDebugging(`known_marketplaces.json lock compromised: ${S}`, { level: "error" });
        },
      });
    } catch (error) {
      (logForDebugging(
        `Failed to acquire known_marketplaces.json lock, writing without it: ${errorMessage(error)}`,
        { level: "error" },
      ),
        (y = !0));
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
  let r = await loadKnownMarketplacesWithDeclared(n),
    s = new Map(Vj()[getStorageArm(n)]),
    h = e(r);
  if (h === null) return !1;
  return (await saveKnownMarketplacesConfig(h, n, s), !0);
}
//@ chunk-e6aww6q8.js:4246231-4246365 layout
async function touchMarketplaceLastUpdated(e, n) {
  await updateKnownMarketplaces((r) => {
    let s = Zb(r, e);
    if (!s) return null;
    return ((r[e] = { ...s, lastUpdated: new Date().toISOString() }), r);
  }, n);
}
/**
 * 把种子目录（CLAUDE_CODE_PLUGIN_SEED_DIR 等）里登记的市场同步进 known_marketplaces.json，有变化返回 true。
 */
//@ chunk-e6aww6q8.js:4246365-4246607 layout
async function syncSeedMarketplaces(e) {
  let n = await registerSeedMarketplaces(e);
  if (n.length === 0) return !1;
  let r = 0;
  if (
    (await updateKnownMarketplaces((s) => {
      for (let [h, y] of n) {
        if (En(Zb(s, h), y)) continue;
        ((s[h] = y), r++);
      }
      return r > 0 ? s : null;
    }, e),
    r > 0)
  )
    return (logForDebugging(`Synced ${r} marketplace(s) from seed dir(s)`), !0);
  return !1;
}
/**
 * 扫描 CLAUDE_CODE_PLUGIN_SEED_DIR 下各种子目录的 known_marketplaces.json，返回可登记的 [名字, 条目]（同名先到先得）。
 */
//@ chunk-e6aww6q8.js:4246607-4246991 fingerprint = registerSeedMarketplaces (0.805)
async function registerSeedMarketplaces(e) {
  let claimed = new Set(),
    r = [];
  for (let s of getPluginSeedDirs()) {
    let seedConfig = await readSeedKnownMarketplaces(s);
    if (!seedConfig) continue;
    for (let [y, S] of Object.entries(seedConfig)) {
      if (claimed.has(y)) continue;
      let w = await findSeedMarketplaceCatalog(s, y, e);
      if (!w) {
        logForDebugging(`Seed marketplace '${y}' not found under ${s}/marketplaces/, skipping`, {
          level: "warn",
        });
        continue;
      }
      (claimed.add(y),
        r.push([y, { source: S.source, installLocation: w, lastUpdated: S.lastUpdated, autoUpdate: !1 }]));
    }
  }
  return r;
}
//@ chunk-e6aww6q8.js:4246991-4247362 fingerprint = readSeedKnownMarketplaces (1)
async function readSeedKnownMarketplaces(seedDir) {
  let seedJsonPath = join_29(seedDir, "known_marketplaces.json");
  try {
    let content = await getFsImplementation().readFile(seedJsonPath, { encoding: "utf-8" }),
      parsed = KnownMarketplacesFileSchema().safeParse(jsonParse(content));
    if (!parsed.success)
      return (
        logForDebugging(`Seed known_marketplaces.json invalid at ${seedDir}: ${parsed.error.message}`, {
          level: "warn",
        }),
        null
      );
    return parsed.data;
  } catch (error) {
    if (!isENOENT(error))
      logForDebugging(`Failed to read seed known_marketplaces.json at ${seedDir}: ${error}`, {
        level: "warn",
      });
    return null;
  }
}
//@ chunk-e6aww6q8.js:4247362-4247580 layout
async function findSeedMarketplaceCatalog(e, n, r) {
  let s = join_29(e, "marketplaces", n),
    h = join_29(e, "marketplaces", `${n}.json`);
  for (let y of [s, h])
    try {
      return (
        await readMarketplaceManifest(
          y,
          void 0,
          r,
          isStorageV5Enabled() && r !== void 0 ? { kind: "hostFolder", space: "system" } : null,
        ),
        y
      );
    } catch {}
  return null;
}
/**
 * 返回包含该安装位置的种子目录（不在任何种子目录下返回 undefined）；种子目录下的市场/插件只读、不刷新。
 */
//@ chunk-e6aww6q8.js:4247580-4247678 file-local
function seedDirFor(installLocation) {
  let n = resolve_10(installLocation);
  return getPluginSeedDirs().find((r) => {
    let s = resolve_10(r);
    return n === s || n.startsWith(s + sep_18);
  });
}
//@ chunk-e6aww6q8.js:4247678-4247707 layout
var DEFAULT_GIT_TIMEOUT_MS = 120000,
  CLONE_TEMP_SUFFIX = "..clone";
//@ chunk-e6aww6q8.js:4247707-4247803 fingerprint = getPluginGitTimeoutMs (1)
function getPluginGitTimeoutMs() {
  let envValue = env.CLAUDE_CODE_PLUGIN_GIT_TIMEOUT_MS;
  if (envValue !== void 0 && envValue > 0) return envValue;
  return DEFAULT_GIT_TIMEOUT_MS;
}
//@ chunk-e6aww6q8.js:4247803-4248068 layout
async function marketplacePathExists(e, n, r) {
  let s = isStorageV5Enabled() && e !== void 0 ? getMarketplaceStorageKey(n, getPluginsDirectory()) : null;
  if (e === void 0 || s === null) return r();
  let statMeta = await e.statMeta(s);
  if (statMeta.ok) return !0;
  let y =
    "telemetryCode" in statMeta.error && typeof statMeta.error.telemetryCode === "string"
      ? statMeta.error.telemetryCode
      : void 0;
  return FX(y) ? r() : !1;
}
//@ chunk-e6aww6q8.js:4248068-4248187 fingerprint = readCachedMarketplace (0.788)
function readCachedMarketplace_2(e, n) {
  let nestedPath = join_29(n, ".claude-plugin", "marketplace.json");
  return marketplacePathExists(e, nestedPath, () =>
    getFsImplementation()
      .stat(nestedPath)
      .then(
        () => !0,
        () => !1,
      ),
  );
}
//@ chunk-e6aww6q8.js:4248187-4248286 layout
function orderGithubTransports(e, n, r) {
  let s = { transport: "SSH", url: n },
    h = { transport: "HTTPS", url: r };
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
function gitHostDisplayName(e) {
  let n = extractHostFromSource({ source: "git", url: e });
  if (n === null) return "your git host";
  return isGithubDotCom(n) ? "GitHub" : n;
}
//@ chunk-e6aww6q8.js:4248907-4249152 layout
function credentialHelperHint(e) {
  let n = extractHostFromSource({ source: "git", url: e });
  if (n !== null && isGithubDotCom(n)) return "your credential helper is configured (e.g., gh auth login)";
  return `your git credential helper has valid credentials for ${n ?? "this host"} (e.g., a personal access token)`;
}
/**
 * 克隆市场仓库：校验 ref/URL（拒绝 - 开头参数与危险协议）、--depth 1、可选 sparse-checkout、禁用交互提示与 LFS、超时 CLAUDE_CODE_PLUGIN_GIT_TIMEOUT_MS。
 */
//@ chunk-e6aww6q8.js:4249152-4252358 fingerprint = gitClone (0.829)
async function gitClone(e, n, r, s, h) {
  let y = krt(e);
  if (y !== null) return { code: 1, stderr: `Refusing to clone. ${y.message}` };
  let useSparse = s && s.length > 0,
    { pinArgs: pinArgs, inCheckoutArgs: inCheckoutArgs, env: env } = SMe(n, await resolveGitSshConfig(e)),
    args = [...SSH_BATCH_CONFIG_ARGS, ...pinArgs, "clone", "--depth", "1"];
  if (useSparse) {
    if (isNetworkGitUrl(e)) args.push("--filter=blob:none");
    args.push("--no-checkout");
  } else args.push("--no-recurse-submodules");
  if (r) args.push("--branch", r);
  args.push("--", e, n);
  let timeoutMs = getPluginGitTimeoutMs();
  logForDebugging(`git clone: url=${redactUrlQuery(e)} ref=${r ?? "default"} timeout=${timeoutMs}ms`);
  let startTime = performance.now(),
    result = await execFileNoThrowWithCwd(gitExe(), args, {
      ...(await prepareGitWorkDir(n, env)),
      timeout: timeoutMs,
      stdin: "ignore",
    }),
    we =
      result.code === 0 && !useSparse
        ? await gitSubmoduleUpdate({
            checkoutDir: n,
            manifestPath: h,
            inCheckoutArgs: inCheckoutArgs,
            env: env,
            deadline: startTime + timeoutMs,
          })
        : void 0,
    Ee = { ...(we?.result ?? result), submodules: we?.submodules };
  if (Ee.error) Ee.error = redactKnownUrls(Ee.error, e);
  if (Ee.stderr) Ee.stderr = redactKnownUrls(Ee.stderr, e);
  if (Ee.code === 0) {
    if (useSparse) {
      let redacted = pickGitNoPromptEnv(env),
        Ie = await runGitInOwnWorkTree(
          n,
          [...inCheckoutArgs, "sparse-checkout", "set", "--cone", "--", ...s],
          redacted,
          { timeout: timeoutMs },
        );
      if (Ie.code !== 0)
        return { code: Ie.code, stderr: `git sparse-checkout set failed: ${redactKnownUrls(Ie.stderr, e)}` };
      let Me = await runGitInOwnWorkTree(
        n,
        [...inCheckoutArgs, "read-tree", "-u", "--reset", "HEAD"],
        redacted,
        { timeout: timeoutMs },
      );
      if (Me.code !== 0)
        return {
          code: Me.code,
          stderr: `git read-tree after sparse-checkout failed: ${redactKnownUrls(Me.stderr, e)}`,
        };
    }
    return (logForDebugging(`git clone succeeded: ${redactUrlQuery(e)}`), Ee);
  }
  if (
    (logForDebugging(
      `git clone failed: url=${redactUrlQuery(e)} code=${Ee.code} error=${Ee.error ?? "none"} stderr=${Ee.stderr}`,
      { level: "warn" },
    ),
    Ee.error?.includes("timed out"))
  )
    return {
      ...Ee,
      stderr: `Git clone timed out after ${Math.round(timeoutMs / 1000)}s. The repository may be too large for the current timeout. Set CLAUDE_CODE_PLUGIN_GIT_TIMEOUT_MS to increase it (e.g., 300000 for 5 minutes).

Original error: ${Ee.stderr}`,
    };
  if (Ee.stderr) {
    if (Ee.stderr.includes("REMOTE HOST IDENTIFICATION HAS CHANGED")) {
      let host = getScpRemoteHost(e),
        Ie = host ? `ssh-keygen -R ${host}` : "ssh-keygen -R <host>";
      return {
        ...Ee,
        stderr: `SSH host key has changed (server key rotation or possible MITM). Remove the stale known_hosts entry:
  ${Ie}
Then connect once manually to verify and accept the new key.

Original error: ${Ee.stderr}`,
      };
    }
    if (Ee.stderr.includes("Host key verification failed")) {
      let host = getScpRemoteHost(e),
        Ie = host ? `ssh -T git@${host}` : "ssh -T git@<host>";
      return {
        ...Ee,
        stderr: `SSH host key is not in your known_hosts file. To add it, connect once manually (this will show the fingerprint for you to verify):
  ${Ie}

Or use an HTTPS URL instead (recommended for public repos).

Original error: ${Ee.stderr}`,
      };
    }
    if (
      Ee.stderr.includes("Permission denied (publickey)") ||
      Ee.stderr.includes("Could not read from remote repository")
    )
      return {
        ...Ee,
        stderr: `SSH authentication failed. Please ensure your SSH keys are configured for ${gitHostDisplayName(e)}, or use an HTTPS URL instead.

Original error: ${Ee.stderr}`,
      };
    if (isAuthenticationError(Ee.stderr))
      return {
        ...Ee,
        stderr: `HTTPS authentication failed. Please ensure ${credentialHelperHint(e)}.

Original error: ${Ee.stderr}`,
      };
    if (
      Ee.stderr.includes("timed out") ||
      Ee.stderr.includes("timeout") ||
      Ee.stderr.includes("Could not resolve host")
    )
      return {
        ...Ee,
        stderr: `Network error or timeout while cloning repository. Please check your internet connection and try again.

Original error: ${Ee.stderr}`,
      };
  }
  if (!Ee.stderr)
    return {
      submodules: Ee.submodules,
      code: Ee.code,
      stderr:
        Ee.error ||
        `git clone exited with code ${Ee.code} (no stderr output). Run with --debug to see the full command.`,
    };
  return Ee;
}
//@ chunk-e6aww6q8.js:4252358-4252460 fingerprint = safeCallProgress (1)
function safeCallProgress(onProgress, message) {
  if (!onProgress) return;
  try {
    onProgress(message);
  } catch (callbackError) {
    logForDebugging(`Progress callback error: ${errorMessage(callbackError)}`, { level: "warn" });
  }
}
//@ chunk-e6aww6q8.js:4252460-4252641 layout
function throwDisklessMarketplaceFetch(e) {
  throw (
    warnDisklessSettingsWrite("marketplace_cache", e),
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "Marketplaces can't be fetched in this session, because it can't save them",
      "marketplace fetch refused in a diskless session",
    )
  );
}
/**
 * git 来源市场的缓存：已有克隆则 fetch/pull 刷新（失败可回退），否则克隆；GitHub 来源按 SSH/HTTPS 顺序各试一次。
 */
//@ chunk-e6aww6q8.js:4252641-4255727 fingerprint = cacheMarketplaceFromGit (0.416)
async function cacheMarketplaceFromGit(e, n, r, s, h, y, S) {
  let fs = getFsImplementation(),
    L = getPluginGitTimeoutMs(),
    timeoutSec = Math.round(L / 1000);
  switch (
    (safeCallProgress(S, `Refreshing marketplace cache (timeout: ${timeoutSec}s)\u2026`),
    await probeMarketplaceCheckout(n, e, { ref: h, sparsePaths: y, timeout: L }))
  ) {
    case "current":
      return { kind: "current" };
    case "unreachable":
      if (env.CLAUDE_CODE_PLUGIN_KEEP_MARKETPLACE_ON_FAILURE && (await readCachedMarketplace_2(r, n)))
        return (
          logForDebugging(
            "Marketplace remote unreachable, keeping existing clone (CLAUDE_CODE_PLUGIN_KEEP_MARKETPLACE_ON_FAILURE)",
            { level: "warn" },
          ),
          { kind: "kept-stale" }
        );
      break;
    case "stale":
      break;
  }
  let Z = `${n}.bak`,
    Se = `${basename_10(n)}.bak`,
    { owner: owner } = await findMarketplaceNameOwner(dirname_19(n), Se, r, {
      isSelf: (ze) => ze === basename_10(n),
    });
  if (owner !== void 0)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Cannot fetch marketplace ${jsonStringify(basename_10(n))}: the directory it would use as its backup (${Z}) is the registered marketplace ${jsonStringify(owner)}'s directory. Remove or rename that marketplace first (claude plugin marketplace remove).`,
      "marketplace backup path is another marketplace clone",
    );
  try {
    (await fs.rename(Z, n), forgetGitRootsUnder(n));
  } catch (error) {
    if (!isENOENT(error)) {
      if (!(await readCachedMarketplace_2(r, n)))
        (await removeDirectoryTreeNoFollow(n).catch(() => {}), await fs.rename(Z, n), forgetGitRootsUnder(n));
    }
  }
  try {
    await removeDirectoryTreeNoFollow(Z);
  } catch (error) {
    throw Error(`Failed to clean up stale marketplace backup directory. Please manually delete the directory at ${Z} and try again.

Technical details: ${errorMessage(error)}`);
  }
  let we = join_29(dirname_19(n), `${basename_10(n)}${CLONE_TEMP_SUFFIX}`);
  try {
    await removeDirectoryTreeNoFollow(we);
  } catch (error) {
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Failed to clean up a leftover marketplace staging directory. Please manually delete the directory at ${we} and try again.

Technical details: ${errorMessage(error)}`,
      "Failed to clean up a leftover marketplace staging directory",
    );
  }
  let Ee = h ? ` (ref: ${h})` : "";
  safeCallProgress(S, `Cloning repository (timeout: ${timeoutSec}s): ${redactUrlQuery(e)}${Ee}`);
  let pullStarted = performance.now(),
    Ie = await gitClone(e, we, h, y, s);
  if (
    (logPluginFetch(
      "marketplace_clone",
      e,
      Ie.code === 0 ? "success" : "failure",
      performance.now() - pullStarted,
      Ie.code === 0 ? void 0 : classifyFetchError(Ie.stderr),
      void 0,
      Ie.submodules,
    ),
    Ie.code !== 0)
  )
    throw (
      await removeDirectoryTreeNoFollow(we).catch(() => {}),
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Failed to clone marketplace repository: ${Ie.stderr}`,
        `Failed to clone marketplace repository: ${classifyFetchError(Ie.stderr)} (exit ${Ie.code})`,
      )
    );
  try {
    await qWn(we, y);
  } catch (error) {
    logForDebugging(`Could not record the marketplace clone's sparse paths: ${errorMessage(error)}`, {
      level: "warn",
    });
  }
  let Me = await checkGitLfsFiles(we),
    We = !1;
  try {
    (await fs.rename(n, Z), (We = !0), safeCallProgress(S, "Replacing the existing marketplace clone\u2026"));
  } catch (rmError) {
    let rmErrorMsg = getErrnoCode(rmError);
    if (rmErrorMsg !== "ENOENT")
      throw (
        await removeDirectoryTreeNoFollow(we).catch(() => {}),
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          rmErrorMsg === "EBUSY" || rmErrorMsg === "EPERM" || rmErrorMsg === "EACCES"
            ? `Could not replace the marketplace directory at ${n} because it is in use; the existing copy was kept and the next refresh will try again.

Technical details: ${errorMessage(rmError)}`
            : `Failed to move the existing marketplace directory aside. Please manually delete the directory at ${n} and try again.

Technical details: ${errorMessage(rmError)}`,
          "Failed to move the existing marketplace directory aside",
        )
      );
  }
  try {
    (await fs.rename(we, n), forgetGitRootsUnder(n));
  } catch (error) {
    if (We)
      await fs
        .rename(Z, n)
        .then(() => forgetGitRootsUnder(n))
        .catch(() => {});
    throw (
      await removeDirectoryTreeNoFollow(we).catch(() => {}),
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Failed to move the new marketplace clone into place at ${n}. Please try again.

Technical details: ${errorMessage(error)}`,
        "Failed to move the new marketplace clone into place",
      )
    );
  }
  if (We) await removeDirectoryTreeNoFollow(Z).catch(() => {});
  return (
    safeCallProgress(S, "Clone complete, validating marketplace\u2026"),
    { kind: "cloned", lfsPointerScan: Me }
  );
}
//@ chunk-e6aww6q8.js:4255727-4255868 layout
function warnLfsPointers(e, n, r) {
  if (n?.kind !== "cloned") return;
  let s = describeGitLfsMissing(e, n.lfsPointerScan);
  if (s === null) return;
  (logForDebugging(`[git-lfs] ${s}`, { level: "warn" }), safeCallProgress(r, s));
}
//@ chunk-e6aww6q8.js:4255868-4255918 fingerprint = redactHeaders (0.878)
function redactHeaders(headers) {
  return xr(headers, () => "***REDACTED***");
}
/**
 * 下载 url 来源的 marketplace.json（带 headers 与 headersHelper 生成的头，日志中脱敏），返回解析后的 JSON。
 */
//@ chunk-e6aww6q8.js:4255918-4257447 fingerprint = cacheMarketplaceFromUrl (0.867)
async function cacheMarketplaceFromUrl(url, cachePath, customHeaders, onProgress) {
  let redactedUrl = redactUrlsInText(url);
  if (
    (safeCallProgress(onProgress, `Downloading marketplace from ${redactedUrl}`),
    logForDebugging(`Downloading marketplace from URL: ${redactedUrl}`),
    customHeaders && Object.keys(customHeaders).length > 0)
  )
    logForDebugging(`Using custom headers: ${jsonStringify(redactHeaders(customHeaders))}`);
  let headers = { ...customHeaders, "User-Agent": CLAUDE_CODE_PLUGIN_MANAGER },
    response,
    fetchStarted = performance.now();
  try {
    response = await externalHttp.get(url, {
      timeout: 1e4,
      maxContentLength: FVt,
      headers: headers,
      beforeRedirect: checkCatalogRedirect(url, t6o(customHeaders)),
    });
  } catch (error) {
    logPluginFetch(
      "marketplace_url",
      url,
      "failure",
      performance.now() - fetchStarted,
      classifyFetchError(error),
    );
    let q = findTelemetrySafeCause(error);
    if (q) throw q;
    let Z = (Se) => Se.replaceAll(url, () => redactedUrl);
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
    .extend({ name: getMarketplaceNameSchemaFor(zse(cachePath)), plugins: A(oe()) })
    .safeParse(response.data);
  if (!result.success)
    throw (
      logPluginFetch("marketplace_url", url, "failure", performance.now() - fetchStarted, "invalid_schema"),
      withMarketplaceFailureCode(
        new ConfigParseError(
          `Invalid marketplace schema from URL: ${result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join(", ")}`,
          redactedUrl,
          response.data,
        ),
        "manifest_invalid",
      )
    );
  return (logPluginFetch("marketplace_url", url, "success", performance.now() - fetchStarted), response.data);
}
//@ chunk-e6aww6q8.js:4257447-4257603 layout
async function cacheMarketplaceFromUrlToFile(e, n, r, s, h) {
  let y = getFsImplementation(),
    S = await cacheMarketplaceFromUrl(e, r, s, h);
  safeCallProgress(h, "Saving marketplace to cache");
  let w = join_29(n, "..");
  (await y.mkdir(w), await writeFileAtomic_2(n, jsonStringify(S, null, 2)));
}
/**
 * 由市场来源算出 marketplaces/ 下的缓存目录名（github 用 owner-repo，git 用 URL 派生，npm/file/directory 各有规则）。
 */
//@ chunk-e6aww6q8.js:4257603-4257894 fingerprint = getCachePathForSource (0.821)
function getCachePathForSource(source) {
  let replaced = (
    source.source === "github"
      ? source.repo.replaceAll("/", "-")
      : source.source === "npm"
        ? source.package.replace("@", "").replaceAll("/", "-")
        : source.source === "file"
          ? basename_10(source.path).replace(".json", "")
          : source.source === "directory"
            ? basename_10(source.path)
            : makeTempCachePathName("git")
  ).replace(/[^a-zA-Z0-9\-_]/g, "-");
  return replaced === "" ? makeTempCachePathName("unknown") : replaced;
}
/**
 * 读取 UTF-8 文件并按 schema 解析（共享指纹误归 agentMemorySnapshot）。
 */
//@ chunk-e6aww6q8.js:4257894-4257983 layout = readJsonFile (0.83)
async function readJsonFileWithSchema(path, schema) {
  let content = await getFsImplementation().readFile(path, { encoding: "utf-8" });
  return parseFileWithSchema(content, path, schema);
}
/**
 * 读 JSON 文本（去 BOM）并用 zod schema 校验，失败抛带路径的错误。
 */
//@ chunk-e6aww6q8.js:4257983-4258249 fingerprint = parseFileWithSchema (0.801)
function parseFileWithSchema(e, n, r) {
  let data;
  try {
    data = jsonParse(Wo(e));
  } catch (error) {
    throw new ConfigParseError(`Invalid JSON in ${n}: ${errorMessage(error)}`, n, e);
  }
  let result = r.safeParse(data);
  if (!result.success)
    throw new ConfigParseError(
      `Invalid schema: ${n} ${result.error?.issues.map((y) => `${y.path.join(".")}: ${y.message}`).join(", ")}`,
      n,
      data,
    );
  return result.data;
}
/**
 * 解析下载到的 marketplace.json：schema 校验、保留名来源校验，失败抛 manifest_invalid 类错误。
 */
//@ chunk-e6aww6q8.js:4258249-4259634 layout
async function parseAndValidateFetchedMarketplace(e, n, r, s, h, y, S, w, L, G) {
  let q;
  try {
    q = parseFileWithSchema(r, s, getPluginMarketplaceSchemaFor(zse(y)));
  } catch (error) {
    throw withMarketplaceFailureCode(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Failed to parse marketplace file at ${s}: ${errorMessage(error)}`,
        "failed to parse fetched marketplace catalog",
      ),
      "manifest_invalid",
    );
  }
  let Z = validateOfficialNameSource(q.name, n);
  if (Z)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      Z,
      "marketplace reserved-name/source validation failed",
    );
  if ((await w?.(q.name), !isValidMarketplaceDirName(q.name)))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Marketplace name ${jsonStringify(q.name)} is not a plain directory name; refusing to cache it`,
      "fetched url marketplace name is not a plain cache component",
    );
  await assertMarketplaceNameAvailable(h, q.name, e, { known: L, selfKey: G, source: n });
  let Se = PJr(q.name, "catalog", getPluginsDirectory());
  if (Se === null) return { declined: q };
  let ke = join_29(h, q.name);
  safeCallProgress(S, "Saving marketplace to cache");
  let we = () => e.write(Se, r, { publishDiscipline: "atomic", mode: 438 & ~process.umask() }),
    Ee = await we();
  if (
    !Ee.ok &&
    Ee.error.code === "Failed" &&
    (FX(Ee.error.telemetryCode) ||
      (await e.scopeKind(marketplaceCacheKey(q.name)).then(
        (Ae) => Ae.ok && Ae.value.kind === "directory",
        () => !1,
      )))
  ) {
    try {
      await removeDirectoryTreeNoFollow(ke);
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
  return { published: { marketplace: q, cachePath: ke, keptStaleClone: !1 } };
}
//@ chunk-e6aww6q8.js:4259634-4259950 layout
async function cacheMarketplaceFromUrlToStorage(e, n, r, s, h, y) {
  let S = await cacheMarketplaceFromUrl(r, s, h, y);
  safeCallProgress(y, "Saving marketplace to cache");
  let write = await e.write(n, jsonStringify(S, null, 2), {
    publishDiscipline: "atomic",
    mode: 438 & ~process.umask(),
  });
  if (!write.ok)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Failed to write marketplace catalog: ${formatStorageError(write.error)}`,
      "failed to write marketplace catalog (v5 backend error)",
    );
}
/**
 * 按来源（github/git/url/npm/file/directory/settings）获取并缓存市场目录，校验企业策略（blockedMarketplaces/strictKnownMarketplaces）、保留名来源、marketplace.json schema；返回 {marketplace, cachePath}。
 */
//@ chunk-e6aww6q8.js:4259950-4265413 fingerprint = loadAndCacheMarketplace (0.572)
async function loadAndCacheMarketplace(source, marketplaceName, r, s, h, y, S, w) {
  if (!isSourceAllowedByPolicy(source))
    throw withMarketplaceFailureCode(
      Error(`Marketplace source '${formatSourceForDisplay(source)}' is blocked by enterprise policy.`),
      "source_blocked_by_policy",
    );
  if (isDiskless()) throwDisklessMarketplaceFetch(join_29("plugins", "marketplaces"));
  let fs = getFsImplementation(),
    cacheDir = getResolvedMarketplacesCacheDir(),
    q = y === void 0 ? h : void 0,
    Z = getPluginMarketplaceSchemaFor(zse(marketplaceName));
  await fs.mkdir(cacheDir);
  let Se,
    ke,
    we = !1,
    Ee,
    Ae,
    Ie,
    tempName = getCachePathForSource(source),
    We = source.source === "github" && (await checkCloneDirOwnedByOther(cacheDir, tempName, source, s));
  try {
    switch (source.source) {
      case "url": {
        if (((Se = join_29(cacheDir, `${tempName}.json`)), isStorageV5Enabled() && s !== void 0 && !w)) {
          let gt = await cacheMarketplaceFromUrl(
              source.url,
              marketplaceName,
              await describeHelperDeclaration(source, {
                marketplaceName: h,
                trustedDeclaration: findUrlMarketplaceHeaders(source, h),
              }),
              r,
            ),
            At = jsonStringify(gt, null, 2),
            It = await parseAndValidateFetchedMarketplace(
              s,
              source,
              At,
              Se,
              cacheDir,
              marketplaceName,
              r,
              y,
              S,
              q,
            );
          if ("published" in It) return It.published;
          ((we = !0),
            safeCallProgress(r, "Saving marketplace to cache"),
            await writeFileAtomic_2(Se, At),
            (ke = Se),
            (Ae = It.declined));
          break;
        }
        ((we = !0),
          await cacheMarketplaceFromUrlToFile(
            source.url,
            Se,
            marketplaceName,
            await describeHelperDeclaration(source, {
              marketplaceName: h,
              trustedDeclaration: findUrlMarketplaceHeaders(source, h),
            }),
            r,
          ),
          (ke = Se));
        break;
      }
      case "github": {
        let sshUrl = `git@${GITHUB_HOST}:${source.repo}.git`,
          httpsUrl = `https://github.com/${source.repo}.git`;
        if (((Se = join_29(cacheDir, tempName)), (we = !We), NMt())) {
          (safeCallProgress(r, `Cloning via HTTPS: ${httpsUrl}`),
            (Ie = await cacheMarketplaceFromGit(
              httpsUrl,
              Se,
              s,
              source.path,
              source.ref,
              source.sparsePaths,
              r,
            )),
            (we = !0),
            (ke = join_29(Se, source.path || ".claude-plugin/marketplace.json")));
          break;
        }
        let sshConfigured = await isGithubSshConfigured(),
          [Yt, qt] = orderGithubTransports(sshConfigured, sshUrl, httpsUrl);
        (safeCallProgress(r, sshConfigured ? `Cloning via SSH: ${sshUrl}` : zpe(httpsUrl)),
          logForDebugging(
            sshConfigured
              ? `SSH configured for GitHub, using SSH for ${source.repo}`
              : `SSH not configured for GitHub, using HTTPS for ${source.repo}`,
            { level: "info" },
          ));
        try {
          Ie = await cacheMarketplaceFromGit(Yt.url, Se, s, source.path, source.ref, source.sparsePaths, r);
        } catch (err) {
          if (
            (logForDebugging(
              `${Yt.transport} clone failed for marketplace ${source.repo} (${errorMessage(err)}), falling back to ${qt.transport}`,
              { level: "error" },
            ),
            safeCallProgress(r, `${Yt.transport} clone failed, retrying with ${qt.transport}: ${qt.url}`),
            we)
          )
            await removeDirectoryTreeNoFollow(Se);
          try {
            Ie = await cacheMarketplaceFromGit(qt.url, Se, s, source.path, source.ref, source.sparsePaths, r);
          } catch (httpsErr) {
            throw (
              logForDebugging(
                `${qt.transport} clone fallback also failed for marketplace ${source.repo}: ${errorMessage(httpsErr)}`,
                { level: "error" },
              ),
              mergeBothTransportErrors({ ...Yt, error: toError(err) }, { ...qt, error: toError(httpsErr) })
            );
          }
        }
        ((we = !0), (ke = join_29(Se, source.path || ".claude-plugin/marketplace.json")));
        break;
      }
      case "git": {
        ((Se = join_29(cacheDir, tempName)),
          (we = !0),
          (Ie = await cacheMarketplaceFromGit(
            source.url,
            Se,
            s,
            source.path,
            source.ref,
            source.sparsePaths,
            r,
          )),
          (ke = join_29(Se, source.path || ".claude-plugin/marketplace.json")));
        break;
      }
      case "npm":
        throw Error("NPM marketplace sources not yet implemented");
      case "file": {
        let gt = resolve_10(getProjectConfigRoot() ?? getOriginalCwd(), source.path);
        ((ke = gt), (Se = dirname_19(dirname_19(gt))), (we = !1));
        break;
      }
      case "directory": {
        let gt = resolve_10(getProjectConfigRoot() ?? getOriginalCwd(), source.path);
        ((ke = join_29(gt, ".claude-plugin", "marketplace.json")), (Se = gt), (we = !1));
        break;
      }
      case "settings": {
        if (
          ((Se = join_29(cacheDir, source.name)),
          (ke = join_29(Se, ".claude-plugin", "marketplace.json")),
          (we = !1),
          !isValidMarketplaceDirName(source.name))
        )
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `Marketplace name ${jsonStringify(source.name)} is not a plain directory name; refusing to cache it`,
            "settings marketplace name is not a plain cache component",
          );
        await assertMarketplaceNameAvailable(cacheDir, source.name, s, {
          known: S,
          selfKey: q,
          source: source,
        });
        let gt = jsonStringify(
          { name: source.name, owner: source.owner ?? { name: "settings" }, plugins: source.plugins },
          null,
          2,
        );
        await fs.mkdir(dirname_19(ke));
        let At =
          isStorageV5Enabled() && s !== void 0 ? PJr(source.name, "manifest", getPluginsDirectory()) : null;
        if (isStorageV5Enabled() && s !== void 0 && At !== null) {
          let write = await s.write(At, gt, { publishDiscipline: "inPlace" });
          if (!write.ok)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `Failed to write marketplace manifest: ${formatStorageError(write.error)}`,
              "failed to write marketplace manifest (v5 backend error)",
            );
          Ee = gt;
          break;
        }
        await writeFile_6(ke, gt);
        break;
      }
      default:
        throw Error("Unsupported marketplace source type");
    }
    logForDebugging(`Reading marketplace from ${ke}`);
    let ze = isStorageV5Enabled() && (source.source === "file" || source.source === "directory") ? s : void 0,
      lt =
        isStorageV5Enabled() && s !== void 0 && (source.source === "github" || source.source === "git")
          ? getMarketplaceStorageKey(ke, getPluginsDirectory())
          : null,
      Je;
    try {
      Je =
        Ae ??
        (Ee !== void 0
          ? parseFileWithSchema(Ee, ke, Z)
          : ze !== void 0
            ? parseFileWithSchema(await getSteps(ze, ke), ke, Z)
            : s !== void 0 && lt !== null
              ? parseFileWithSchema(await Ohs(s, lt), ke, Z)
              : await readJsonFileWithSchema(ke, Z));
    } catch (error) {
      if (isENOENT(error))
        throw withMarketplaceFailureCode(Error(`Marketplace file not found at ${ke}`), "manifest_missing");
      throw withMarketplaceFailureCode(
        Error(`Failed to parse marketplace file at ${ke}: ${errorMessage(error)}`),
        error instanceof ConfigParseError ? "manifest_invalid" : void 0,
      );
    }
    let finalCachePath = validateOfficialNameSource(Je.name, source);
    if (finalCachePath) throw Error(finalCachePath);
    if ((await y?.(Je.name), !isValidMarketplaceDirName(Je.name)))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Marketplace name ${jsonStringify(Je.name)} is not a plain directory name; refusing to cache it`,
        "marketplace name is not a plain directory name",
      );
    let pt = join_29(cacheDir, Je.name);
    if (Se !== pt && !isLocalMarketplaceSource(source))
      await assertMarketplaceNameAvailable(cacheDir, Je.name, s, {
        ownEntry: basename_10(Se),
        known: S,
        selfKey: q,
        source: source,
      });
    else if (source.source === "github")
      await assertMarketplaceNameUsable(cacheDir, Je.name, s, {
        known: S,
        isSelf: sameNfcAs(Je.name, q),
        source: source,
      });
    let resolvedFinal = resolve_10(pt),
      resolvedCacheDir = resolve_10(cacheDir);
    if (!resolvedFinal.startsWith(resolvedCacheDir + sep_18))
      throw Error(`Marketplace name '${Je.name}' resolves to a path outside the cache directory`);
    if (Se !== pt && !isLocalMarketplaceSource(source)) {
      let gt = !1;
      try {
        let [At, It] = await Promise.all([fs.stat(Se), fs.stat(pt)]);
        gt = At.dev === It.dev && At.ino === It.ino && At.ino !== 0;
      } catch {}
      if (gt) ((Se = pt), forgetGitRootsUnder(pt), (we = !1));
      else
        try {
          if (!w) {
            try {
              r?.("Cleaning up old marketplace cache\u2026");
            } catch (callbackError) {
              logForDebugging(`Progress callback error: ${errorMessage(callbackError)}`, { level: "warn" });
            }
            await removeDirectoryTreeNoFollow(pt);
          }
          if (w && source.source === "url") {
            await fs.link(Se, pt);
            let At = Se;
            await fs.unlink(At).catch((It) => {
              logForDebugging(`Failed to remove the linked temp catalog ${At}: ${errorMessage(It)}`, {
                level: "warn",
              });
            });
          } else await fs.rename(Se, pt);
          (forgetGitRootsUnder(pt), (Se = pt), (we = !1));
        } catch (error) {
          let errorMsg = errorMessage(error);
          if (w)
            throw new bfe(
              `Marketplace ${jsonStringify(Je.name)} was not added: this add never replaces what is cached at ${pt}, and caching it there failed. If a marketplace of that name is added, remove it first with /plugin marketplace remove ${Je.name}; if none is, delete that path and try again.

Technical details: ${errorMsg}`,
              "marketplace add: the no-replace publish failed",
              { kind: "stored", name: Je.name, folder: pt },
            );
          throw Error(`Failed to finalize marketplace cache. Please manually delete the directory at ${pt} if it exists and try again.

Technical details: ${errorMsg}`);
        }
    }
    return (
      warnLfsPointers(Se, Ie, r),
      { marketplace: Je, cachePath: Se, keptStaleClone: Ie?.kind === "kept-stale" }
    );
  } catch (error) {
    if (we && Se && !isLocalMarketplaceSource(source))
      try {
        await removeDirectoryTreeNoFollow(Se);
      } catch (cleanupError) {
        logForDebugging(
          `Warning: Failed to clean up temporary marketplace cache at ${Se}: ${errorMessage(cleanupError)}`,
          { level: "warn" },
        );
      }
    throw error;
  }
}
//@ chunk-e6aww6q8.js:4265413-4265526 layout
function buildKnownMarketplaceEntry(e, n) {
  return {
    source: e,
    installLocation: isLocalMarketplaceSource(e) ? e.path : join_29(getResolvedMarketplacesCacheDir(), n),
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
    if (QE())
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Cannot add marketplace ${jsonStringify(e)}: the name is reserved for the built-in ${OFFICIAL_MARKETPLACE_DISPLAY}.`,
        "marketplace add refused: name is the built-in plugin directory",
      );
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      reservedNameMessage(e),
      "marketplace add refused: reserved marketplace name",
    );
  }
  let n = ozt(e);
  if (n !== void 0)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      HWo(e, n),
      "marketplace add refused: reserved marketplace name",
    );
}
/**
 * 在已知市场表中找来源与给定来源相同的市场名。
 */
//@ chunk-e6aww6q8.js:4266146-4266232 layout
function findMarketplaceBySource(e, n) {
  for (let [r, s] of Object.entries(e)) if (isSameMarketplaceSource(s.source, n)) return r;
  return;
}
/**
 * 同上，找不到时再按“地址键”（忽略 sparsePaths/headers/凭据）宽松比较。
 */
//@ chunk-e6aww6q8.js:4266232-4266374 layout
function findMarketplaceBySourceLoose(e, n) {
  let r = findMarketplaceBySource(e, n);
  if (r !== void 0) return r;
  let s = sourceAddressKey(n);
  for (let [h, y] of Object.entries(e)) if (isSameMarketplaceSource(sourceAddressKey(y.source), s)) return h;
  return;
}
//@ chunk-e6aww6q8.js:4266374-4266417 layout
function isSameMarketplaceSource(e, n) {
  return En(canonicalizeGithubSource(e), canonicalizeGithubSource(n));
}
//@ chunk-e6aww6q8.js:4266417-4266609 layout
function canonicalizeGithubSource(e) {
  if (e.source === "github") return { ...e, repo: normalizeGithubRepoSlug(e.repo) ?? e.repo };
  if (e.source === "git") {
    let n = normalizeGithubRepoSlug(e.url);
    if (n !== null) {
      let { url: url, ...s } = e;
      return { ...s, source: "github", repo: n };
    }
  }
  return e;
}
//@ chunk-e6aww6q8.js:4266609-4266748 layout
function getMarketplaceCandidateFolders(e, n, r, { cloneFolder: cloneFolder }) {
  let h = buildKnownMarketplaceEntry(e, n);
  if (cloneFolder && e.source === "github") h.installLocation = join_29(r, getCachePathForSource(e));
  return marketplaceDirCandidates({ [n]: h }, void 0, r)(n);
}
//@ chunk-e6aww6q8.js:4266748-4266930 layout
function findDeclaredMarketplacesUsingFolders(e, n, r) {
  return Object.keys(e).filter((s) => {
    let h = Zb(e, s);
    return (
      h !== void 0 &&
      !h.sourceIsFallback &&
      getMarketplaceCandidateFolders(h.source, s, r, { cloneFolder: !0 }).some(
        (y) => findByMarketplaceName(y, [s], () => n) !== void 0,
      )
    );
  });
}
//@ chunk-e6aww6q8.js:4266930-4267119 layout
function checkDeclaredMarketplaceCollision(e, n) {
  let r = getDeclaredMarketplaces(),
    s = Zb(r, e);
  if (s !== void 0) return checkDeclaredNameCollision(e, n, e, s);
  let h = getResolvedMarketplacesCacheDir();
  for (let y of findDeclaredMarketplacesUsingFolders(
    r,
    getMarketplaceCandidateFolders(n, e, h, { cloneFolder: !1 }),
    h,
  )) {
    let S = Zb(r, y),
      w = S && checkDeclaredNameCollision(e, n, y, S);
    if (w) return w;
  }
  return;
}
//@ chunk-e6aww6q8.js:4267119-4267662 layout
function checkCloneFolderCollision(e) {
  if (e.source !== "github") return;
  let n = getDeclaredMarketplaces(),
    r = getResolvedMarketplacesCacheDir(),
    s = getCachePathForSource(e);
  for (let h of findDeclaredMarketplacesUsingFolders(n, [s, `${s}.bak`], r)) {
    let y = Zb(n, h);
    if (
      y !== void 0 &&
      !isSameGithubMarketplace(h, { [h]: buildKnownMarketplaceEntry(y.source, h) }, e, void 0)
    )
      return new bfe(
        `Cannot add this marketplace: it would download into the folder ${jsonStringify(s)}, which the marketplace ${jsonStringify(h)} listed under extraKnownMarketplaces in your settings (from ${formatSourceForDisplay(y.source)}) uses, so it can't be added while that entry is listed.`,
        "marketplace add refused: its clone folder is one a declared marketplace needs",
        { kind: "declared", name: h },
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
      ? void 0
      : new bfe(
          `Cannot add marketplace ${jsonStringify(e)} from this source: your settings list ${jsonStringify(r)} under extraKnownMarketplaces with another source (${formatSourceForDisplay(s.source)}), and the two names would clash in the marketplaces folder, so it can't be added while that entry is listed.`,
          "marketplace add refused: settings declare a colliding name with a different source",
          { kind: "declared", name: r },
        );
  if (h || (r === e && FIe(r) !== void 0)) return;
  return new bfe(
    `Cannot add marketplace ${jsonStringify(e)} from this source: your settings list ${jsonStringify(r)} under extraKnownMarketplaces with another source (${formatSourceForDisplay(s.source)}). Add it from that source, or change that entry if it is wrong.`,
    "marketplace add refused: settings declare the name with a different source",
    { kind: "declared", name: r },
  );
}
//@ chunk-e6aww6q8.js:4268555-4268949 layout
function checkExistingNameDifferentSource(e, n, r) {
  if (n === void 0 || isSameMarketplaceSource(n.source, r)) return;
  return new bfe(
    `Marketplace ${jsonStringify(e)} is already added from a different source (${formatSourceForDisplay(n.source)}). To use this source instead, remove that marketplace first with /plugin marketplace remove ${e}.`,
    "marketplace add refused: the name is registered from a different source",
    {
      kind: isSameMarketplaceSource(sourceAddressKey(n.source), sourceAddressKey(r))
        ? "same_address"
        : "name_taken",
      name: e,
    },
  );
}
//@ chunk-e6aww6q8.js:4268949-4269237 layout
function sourceAddressKey(e) {
  switch (e.source) {
    case "github": {
      let { sparsePaths: sparsePaths, skipLfs: skipLfs, ...s } = e;
      return s;
    }
    case "git": {
      let { sparsePaths: sparsePaths, skipLfs: skipLfs, ...s } = e;
      return isUnsafeRemoteUrl(e.url) ? s : { ...s, url: stripUrlUserinfo(e.url) };
    }
    case "url": {
      let { headers: headers, headersHelper: headersHelper, ...s } = e;
      return isUnsafeRemoteUrl(e.url) ? s : { ...s, url: stripUrlUserinfo(e.url) };
    }
    default:
      return e;
  }
}
//@ chunk-e6aww6q8.js:4269237-4269305 layout
function stripUrlUserinfo(e) {
  return e.replace(/^(https?:\/\/)[^/?#\\@]*@/i, "$1");
}
/**
 * 添加市场（/plugin marketplace add、claude plugin marketplace add）：校验名字与来源、检查与已声明/已存在市场冲突、loadAndCacheMarketplace 下载、写入 known_marketplaces.json。
 */
//@ chunk-e6aww6q8.js:4269305-4273867 fingerprint = addMarketplaceSource (0.569)
async function addMarketplaceSource(source, n, r, s, h) {
  let resolvedSource = source;
  if (isLocalMarketplaceSource(source) && !isAbsolute_8(source.path))
    resolvedSource = { ...source, path: resolve_10(source.path) };
  if (resolvedSource.source === "git") {
    let we = krt(resolvedSource.url);
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
    let we = getStrictKnownMarketplaces() || [],
      hostPatterns = getHostPatternsFromAllowlist(),
      sourceHost = extractHostFromSource(resolvedSource),
      errorMessage = `Marketplace source '${formatSourceForDisplay(resolvedSource)}'`;
    if (sourceHost) errorMessage += ` (${sourceHost})`;
    if (((errorMessage += " is blocked by enterprise policy."), we.length > 0))
      errorMessage += ` Allowed sources: ${we.map((Me) => formatSourceForDisplay(Me)).join(", ")}`;
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
  if (s !== void 0 && (isOfficialMarketplaceSpelling(s) || ozt(s) !== void 0))
    assertMarketplaceNameAddable(s);
  let S = await loadKnownMarketplacesWithDeclared(r);
  for (let [we, Ee] of Object.entries(S))
    if (En(Ee.source, resolvedSource)) {
      let Ae = h?.refuseNameCollision ? checkDeclaredMarketplaceCollision(we, resolvedSource) : void 0;
      if (Ae) throw Ae;
      return (
        logForDebugging(`Source already materialized as '${we}', skipping clone`),
        { name: we, alreadyMaterialized: !0, resolvedSource: resolvedSource }
      );
    }
  if (h?.refuseNameCollision) {
    let we = checkCloneFolderCollision(resolvedSource);
    if (we) throw we;
  }
  let w = describeUnusableMarketplaceSource(
    buildKnownMarketplaceEntry(resolvedSource, "pending-add"),
    rhs(resolvedSource),
  );
  if (w !== void 0)
    throw withMarketplaceFailureCode(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Cannot add this marketplace: ${w.cause}; ${MARKETPLACE_SOURCE_FIX_HINTS[w.kind]}.`,
        "marketplace add refused by the registry admission rule",
      ),
      MARKETPLACE_SOURCE_FAILURE_CODES[w.kind],
    );
  let {
      marketplace: marketplace,
      cachePath: cachePath,
      keptStaleClone: keptStaleClone,
    } = await loadAndCacheMarketplace(
      resolvedSource,
      void 0,
      n,
      r,
      s,
      async (we) => {
        let Ee = describeUnusableMarketplaceSource(buildKnownMarketplaceEntry(resolvedSource, we), FIe(we));
        if (Ee !== void 0) {
          let Ae = `Cannot add marketplace ${jsonStringify(we)}: ${Ee.cause}; ${MARKETPLACE_SOURCE_FIX_HINTS[Ee.kind]}.`;
          throw Ee.kind === "declaration"
            ? new bfe(Ae, "marketplace add refused by the registry admission rule (named)", {
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
        if (
          (assertMarketplaceNameAddable(we),
          s === void 0 && !isValidPluginIdSegment(we) && !Object.hasOwn(S, we) && !uF(S).has(we))
        )
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `Cannot add marketplace "${quotedPrintable(we, 64)}": Claude Code cannot install plugins from a marketplace with this name. Each part of a plugin id (plugin@marketplace) may use only the letters a-z and A-Z, digits, ".", "_" and "-", and must start with a letter or digit. The name is set by "name" in the marketplace's marketplace.json; ask its maintainer to change it.`,
            "marketplace add refused: the name cannot form a plugin id",
          );
        if (Object.hasOwn(Object.prototype, we) && !Object.hasOwn(S, we) && !uF(S).has(we))
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `Cannot add marketplace "${quotedPrintable(we, 64)}": Claude Code reserves this name and cannot register a marketplace under it. The name is set by "name" in the marketplace's marketplace.json; ask its maintainer to change it.`,
            "marketplace add refused: the name is an inherited object member",
          );
        if (h?.refuseNameCollision) {
          let Ae = await loadKnownMarketplacesWithDeclared(r),
            Ie = checkExistingNameDifferentSource(
              we,
              (Object.hasOwn(Ae, we) ? Ae[we] : void 0) ?? L6(we, r),
              resolvedSource,
            );
          if (Ie) throw Ie;
          let Me = checkDeclaredMarketplaceCollision(we, resolvedSource);
          if (Me) throw Me;
        }
      },
      S,
      h?.refuseNameCollision,
    ),
    sourceValidationError = validateOfficialNameSource(marketplace.name, resolvedSource);
  if (sourceValidationError) throw Error(sourceValidationError);
  let Se, ke;
  if (
    (await updateKnownMarketplaces((we) => {
      if (
        (assertMarketplaceNameAddable(marketplace.name),
        (Se = Zb(we, marketplace.name)),
        (ke = h?.refuseNameCollision
          ? (checkExistingNameDifferentSource(
              marketplace.name,
              Se ?? L6(marketplace.name, r),
              resolvedSource,
            ) ?? checkDeclaredMarketplaceCollision(marketplace.name, resolvedSource))
          : void 0),
        ke)
      )
        return null;
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
      return (
        (we[marketplace.name] = {
          source: resolvedSource,
          installLocation: cachePath,
          lastUpdated: keptStaleClone && Se ? Se.lastUpdated : new Date().toISOString(),
        }),
        we
      );
    }, r),
    ke)
  )
    throw ke;
  if (Se) {
    let we =
        isStorageV5Enabled() && r !== void 0
          ? getSyntheticMarketplaceStorageKey(marketplace.name, Se.source, Se.installLocation)
          : null,
      Ee =
        isStorageV5Enabled() && r !== void 0
          ? getSyntheticMarketplaceStorageKey(marketplace.name, resolvedSource, cachePath)
          : null,
      Ae = Ee === null && resolve_10(Se.installLocation) === resolve_10(cachePath);
    if (isStorageV5Enabled() && r !== void 0 && we !== null && !En(we, Ee) && !Ae) {
      let Ie = await r.delete(we);
      if (!Ie.ok)
        logForDebugging(
          `Failed to delete the previous entry's cached marketplace ${marketplace.name} through the storage backend: ${formatStorageError(Ie.error)}`,
          { level: "warn" },
        );
    }
    if (!isLocalMarketplaceSource(Se.source)) {
      let Ie = getResolvedMarketplacesCacheDir(),
        cacheDir = classifyMarketplacePath(Se.installLocation),
        absolute = cacheDir.absolute,
        ze = resolve_10(getOriginalCwd(), cachePath),
        lt = cacheDir.suspect ? "outside" : comparePathContainment(Ie, absolute, ze);
      if (lt === "same");
      else if (
        lt === "inside" &&
        (await checkMarketplaceDirCollision(Ie, absolute, marketplace.name, r, S)) === void 0
      )
        await removeDirectoryTreeNoFollow(absolute);
      else
        logForDebugging(
          `Skipping cleanup of old installLocation (${Se.installLocation}) \u2014 ` +
            `outside ${Ie}. The path is corrupted; leaving it alone and overwriting the config entry.`,
          { level: "warn" },
        );
    }
  }
  return (
    getPluginRegistry().marketplaces.delete(marketplace.name),
    logForDebugging(`Added marketplace source: ${marketplace.name}`),
    Se !== void 0 && !isSameMarketplaceSource(Se.source, resolvedSource)
      ? {
          name: marketplace.name,
          alreadyMaterialized: !1,
          resolvedSource: resolvedSource,
          replacedSource: Se.source,
        }
      : { name: marketplace.name, alreadyMaterialized: !1, resolvedSource: resolvedSource }
  );
}
//@ chunk-e6aww6q8.js:4273867-4273913 layout
var RESERVED_NAME_REGISTRY_WRITE_FAILED = "reserved_name_registry_write_failed";
//@ chunk-e6aww6q8.js:4273913-4274014 layout
function reservedNameRemovalError(e, n) {
  let r = new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    e,
    "removing a reserved-name entry failed part-way",
  );
  return ((r.cause = n), r);
}
/**
 * 删除市场的外层入口（CLI/界面调用）：名字属于需要成组处理的保留名时，先逐个删除相关条目并汇总结果，再调用 removeMarketplaceSource。
 */
//@ chunk-e6aww6q8.js:4274014-4275802 layout
async function removeMarketplaceWithReservedSiblings(e, n, r, s, h) {
  if (n === void 0 && isOfficialMarketplaceName_2(e)) {
    let filtered = listReservedNameRefusals(await loadKnownMarketplacesWithDeclared(r)).filter(
      ({ name: S }) => isOfficialMarketplaceName_2(S),
    );
    if (filtered.length > 0) {
      let S = [],
        w = [],
        L = [],
        G = "commit_mismatch";
      for (let { name: q } of filtered) {
        let Z = { pluginIds: [], reason: "commit_mismatch", entryDeleted: !1 },
          Se = await removeMarketplaceSource(q, void 0, r, s, S.length > 0, !0, Z).catch(async (ke) => {
            let we = null;
            try {
              we = listReservedNameRefusals(await loadKnownMarketplacesWithDeclared(r))
                .map((We) => We.name)
                .filter(isOfficialMarketplaceName_2);
            } catch {
              we = null;
            }
            if (!(Z.entryDeleted || (we !== null && !we.includes(q)))) {
              let We = blockedPluginsNotice(L, G, { insideFailure: !0 });
              if (We === null) throw ke;
              throw reservedNameRemovalError(
                `${We} Another known_marketplaces.json entry, named "${quotedPrintable(q)}", could not be removed (${quotedPrintable(errorMessage(ke))}). Run this remove again.`,
                ke,
              );
            }
            let Ae = blockedPluginsNotice([...L, ...Z.pluginIds], L.length > 0 ? G : Z.reason, {
                insideFailure: !0,
              }),
              Ie =
                ke instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS &&
                ke.errorClass === RESERVED_NAME_REGISTRY_WRITE_FAILED &&
                ke.cause !== void 0
                  ? ke.cause
                  : ke,
              Me =
                we === null
                  ? `Before running this remove again, check known_marketplaces.json: if no entry of this name is left, this remove can turn the ${OFFICIAL_MARKETPLACE_DISPLAY} itself off.`
                  : we.length > 0
                    ? "Another entry of this name is left: run this remove again."
                    : `Do not run this remove again: no entry of this name is left, so it can turn the ${OFFICIAL_MARKETPLACE_DISPLAY} itself off.`;
            throw reservedNameRemovalError(
              `${Me} The known_marketplaces.json entry named "${quotedPrintable(q)}" is gone, but this remove did not finish. ${Ae === null ? "" : `${Ae} `}(${quotedPrintable(errorMessage(Ie), 2000)})`,
              ke,
            );
          });
        if (Se.kind !== "ignored-plugin-directory-name-entry-removed" || Se.removedNames.length === 0)
          continue;
        if (S.length === 0) ((L = Se.disabledPluginIds), (G = Se.disabledReason));
        (w.push(...Se.removedPluginIds), S.push(q));
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
  return removeMarketplaceSource(e, n, r, s, !1);
}
//@ chunk-e6aww6q8.js:4275802-4276224 layout
async function probeSettingsFileMayExist(e) {
  try {
    let n = await readRepoSettingsBytes(e);
    switch (n.kind) {
      case "refused":
        return { mayExist: !0, refused: n.why };
      case "absent":
        return { mayExist: !1, ...(n.notAFolder && !n.belowALinkToNothing && { cannotHoldAFile: !0 }) };
      case "bytes":
        return { mayExist: Buffer.byteLength(n.content) > 1024 || n.content.trim() !== "" };
    }
  } catch (error) {
    if (isENOENT(error)) return { mayExist: !1 };
    return (
      logForDebugging(`Could not read settings file ${e} (${errorMessage(error)}); counting it as present`),
      { mayExist: !0 }
    );
  }
}
//@ chunk-e6aww6q8.js:4276224-4276283 layout
var SETTINGS_FLAG_SOURCE_LABEL = "the --settings flag's",
  ADD_DIR_SOURCE_LABEL = "an added directory's";
/**
 * 删除市场时把该市场的插件在各可写设置源（userSettings、localSettings、projectSettings）的 enabledPlugins 中关掉；--settings 与 --add-dir 来源无法写时记入 notTurnedOff。
 */
//@ chunk-e6aww6q8.js:4276283-4278957 layout
async function disablePluginsInSettings(e, n, r) {
  let s = new Set(),
    h = new Map(),
    y = !1,
    S;
  if (e.length === 0)
    return {
      turnedOff: [],
      notTurnedOff: h,
      legacyFileIsTheCause: !1,
      unreadSources: [],
      unreadAddDirFiles: [],
      legacyPathRefused: void 0,
      addDirFileBehindALink: !1,
    };
  or();
  let filtered = n.filter((Ae) => !e.includes(Ae)),
    L = getAddDirEnabledPlugins(),
    filtered_2 = e.filter((Ae) => findEnablingSettingSource(Ae, filtered) !== void 0);
  for (let Ae of EDITABLE_SETTING_SOURCES) {
    let Ie = new Set(),
      Me = new Set(),
      We = 0,
      ze = await updateSettingsForSourceWithTransform(
        Ae,
        (It) => {
          We += 1;
          let Yt = It?.enabledPlugins,
            qt = [];
          for (let Zt of e) {
            let filtered_2 = AIe(Yt, Zt, filtered).filter((pn) => mO(Yt?.[pn]));
            if (filtered_2.length > 0) Ie.add(Zt);
            for (let pn of filtered_2) Me.add(pn);
            qt.push(
              ...filtered_2,
              ...(Ae !== "userSettings"
                ? []
                : [
                    ...(Yt?.[Zt] !== !1 ? [Zt] : []),
                    ...AIe(L, Zt, filtered).filter((pn) => mO(L[pn]) && Yt?.[pn] !== !1),
                  ]),
            );
          }
          return qt.length > 0 ? getEnabledPluginIdsForScope(qt) : null;
        },
        void 0,
        r,
      ),
      filtered_2 = [...Me].filter((It) => K1n(Ae)?.[It] !== !1);
    if (!ze.error && Ae === "localSettings" && filtered_2.length > 0)
      ze = await updateSettingsForSourceWithTransform(
        Ae,
        () => getEnabledPluginIdsForScope(filtered_2),
        void 0,
        r,
      );
    if (ze.error)
      logForDebugging(`Failed to turn plugins off in ${Ae} settings: ${ze.error.message}`, {
        level: "error",
      });
    let Je = Ae === "localSettings" ? getLegacyLocalSettingsFilePath() : void 0,
      nt = Je !== void 0 && We < 2 ? await probeSettingsFileMayExist(Je) : void 0;
    if (nt?.refused !== void 0)
      ((S = nt.refused),
        logForDebugging(
          `Did not read the legacy local settings file ${Je}: readScreenedSettingsFile refused it (${nt.refused}); counting it as present`,
        ));
    let pt = nt?.mayExist === !0,
      Et = Je !== void 0 && (ze.error !== null || pt),
      yt = pt && We === 1 && (ze.error === null || Ie.size === 0),
      gt = K1n(Ae),
      At = We === 0 || Et;
    for (let It of At ? e : Ie) {
      if (!Et && (!At || gt?.[It] === !1) && Jhs(gt, It, filtered)) {
        s.add(It);
        continue;
      }
      ((y ||= yt), h.set(It, [...(h.get(It) ?? []), settingsSourceName(Ae)]));
    }
  }
  or();
  for (let Ae of e) {
    let Ie = findEnablingSettingSource(Ae, filtered);
    if (Ie === void 0) {
      if (filtered_2.includes(Ae)) s.add(Ae);
      continue;
    }
    if (h.has(Ae)) continue;
    h.set(Ae, [
      Ie === "addDir"
        ? ADD_DIR_SOURCE_LABEL
        : Ie === "flagSettings"
          ? SETTINGS_FLAG_SOURCE_LABEL
          : SETTING_SOURCE_TO_SCOPE[Ie],
    ]);
  }
  let any = getPolicySettingsLoadErrors().some(isBlockingPolicyLoadError),
    any_2 = getSettingsParseErrorsForSource("flagSettings").some((Ae) => Ae.severity !== "warning"),
    Se = !1;
  for (let Ae of e) {
    let Ie = h.has(Ae) ? void 0 : await sourceEnablementEntry("flagSettings", Ae, filtered);
    if (Ie?.readsBack === "on") h.set(Ae, [SETTINGS_FLAG_SOURCE_LABEL]);
    else if (Ie !== void 0) Se = !0;
  }
  let flat = (
      await Promise.all(
        getAdditionalDirectoriesForClaudeMd()
          .flatMap((Ae) => SETTINGS_FILES.map((Ie) => join_29(Ae, ".claude", Ie)))
          .map(async (Ae) => {
            let { settings: settings, errors: errors } = parseSettingsFile(Ae);
            if (settings !== null || !errors.some((ze) => ze.severity !== "warning")) return [];
            let We = await probeSettingsFileMayExist(Ae);
            if (We.refused !== void 0)
              logForDebugging(
                `Did not read the added directory's settings file ${Ae}: readScreenedSettingsFile refused it (${We.refused}); counting it as present`,
              );
            return We.cannotHoldAFile &&
              errors.some((ze) => ze.errorClass === "unreadable" && ze.errno === "ENOTDIR")
              ? []
              : [{ file: Ae, behindALink: We.refused === "vet-network" }];
          }),
      )
    ).flat(),
    mapped = flat.map((Ae) => Ae.file),
    Ee = [
      ...(any ? ["managed"] : []),
      ...(any_2 || Se ? ["flag"] : []),
      ...(mapped.length > 0 ? ["addDir"] : []),
    ];
  return {
    turnedOff: [...s].filter((Ae) => !h.has(Ae)),
    notTurnedOff: h,
    legacyFileIsTheCause: y,
    unreadSources: Ee,
    unreadAddDirFiles: mapped,
    legacyPathRefused: S,
    addDirFileBehindALink: flat.some((Ae) => Ae.behindALink),
  };
}
/**
 * 删除市场：从 known_marketplaces.json 与 settings 的 extraKnownMarketplaces 中移除，关掉其插件、删除缓存目录与安装记录，处理托管/保留名等特殊情况。
 */
//@ chunk-e6aww6q8.js:4278957-4289668 callgraph-fingerprint = removeMarketplaceSource (0.202)
async function removeMarketplaceSource(marketplaceName, n, storageV5, s, h, y = !1, S) {
  let w = await loadKnownMarketplacesWithDeclared(storageV5),
    L =
      marketplaceName !== OFFICIAL_MARKETPLACE_NAME &&
      isOfficialMarketplaceName_2(marketplaceName) &&
      !Object.hasOwn(w, marketplaceName) &&
      L6(marketplaceName, storageV5) === void 0
        ? OFFICIAL_MARKETPLACE_NAME
        : marketplaceName,
    G = L === OFFICIAL_MARKETPLACE_NAME && Xut(w) ? !0 : !1,
    q = isOfficialMarketplaceSpelling(L) && uF(w).get(L) === "source" ? !0 : !1;
  if (y && !q)
    return {
      kind: "ignored-plugin-directory-name-entry-removed",
      removedNames: [],
      removedPluginIds: [],
      disabledPluginIds: [],
      disabledReason: "commit_mismatch",
    };
  let Z = !G && Object.hasOwn(w, L) ? w[L] : void 0,
    Se = Z !== void 0 ? void 0 : L6(L, storageV5),
    ke = Z ?? Se;
  if (ke === void 0) {
    if (L === OFFICIAL_MARKETPLACE_NAME && n === void 0 && (await getPluginDirectoryState()) === "off")
      return (await persistPluginDirectoryChoice(!1), { kind: "plugin-directory-built-in" });
    throw withMarketplaceFailureCode(Error(`Marketplace '${L}' not found`), "not_configured");
  }
  let we = isPluginDirectorySource(ke.source) ? !0 : !1;
  if (we && n !== void 0) {
    let At = getSettingsForSourceForUpkeep(n),
      mapped = listReservedNameRefusals(w)
        .filter((Yt) => isOfficialMarketplaceName_2(Yt.name) && removeExtraMarketplace(At, Yt.name))
        .map(
          (Yt) =>
            ` An ignored entry named "${Yt.name}" is declared there: claude plugin marketplace remove ${Yt.name} --scope ${settingsSourceName(n)}`,
        );
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${OFFICIAL_MARKETPLACE_DISPLAY} is built in and not declared in any settings scope. Omit --scope to turn it off.${mapped.join("")}`,
      "plugin directory marketplace remove with --scope",
    );
  }
  let seedDir = X5(ke.source);
  if (seedDir && n !== void 0)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Marketplace '${L}' is hosted on claude.ai and not declared in any settings scope. Omit --scope to remove it.`,
      "claude.ai marketplace remove with --scope",
    );
  let Ae = seedDir || we ? void 0 : seedDirFor(ke.installLocation),
    Ie = isSafeCliArg(L)
      ? ` To stop using its plugins: claude plugin disable <plugin>@${L}`
      : " To stop using its plugins, disable each one in /plugin.";
  if (Ae && n === void 0)
    throw withMarketplaceFailureCode(
      Error(
        `Marketplace '${L}' is registered from the read-only seed directory (${Ae}) and will be re-registered on next startup.${Ie}`,
      ),
      "managed",
    );
  let Me = !1;
  if (n !== void 0) {
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
  let We = [],
    ze = "commit_mismatch";
  if (q && !h && !Me) {
    let At = await loadPluginDirectoryMarketplaceCached({ ignoreToggle: !0, storageV5: storageV5 });
    if (At === null) ze = "catalog_unreadable";
    let It = await loadInstalledPlugins(storageV5);
    if (PF(It)) {
      let Kn = await getInstalledListRefusal(storageV5);
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `The list of installed plugins (installed_plugins.json) could not be read or is not a valid list, so this remove cannot tell which plugins to turn off. Nothing was deleted, and the known_marketplaces.json entry named "${quotedPrintable(L)}" was left in place: repair or restore installed_plugins.json, then run this remove again.${Kn === void 0 ? "" : ` ${readInstalledPluginsFile(Kn)}`}`,
        "removing a reserved-name entry was held back: the installed plugins could not be read",
      );
    }
    let plugins = It.plugins,
      mapped = Object.entries(plugins)
        .filter(([Kn, Xn]) => {
          let { name: fo, marketplace: marketplace } = parsePluginIdentifier(Kn);
          if (marketplace !== OFFICIAL_MARKETPLACE_NAME) return !1;
          let bo = pinnedSha(Kn, At?.marketplace.plugins.find((vn) => vn.name === fo)?.source);
          return bo === void 0 || Xn.some((vn) => vn.gitCommitSha !== bo);
        })
        .map(([Kn]) => Kn),
      {
        turnedOff: turnedOff,
        notTurnedOff: notTurnedOff,
        legacyFileIsTheCause: legacyFileIsTheCause,
        unreadSources: unreadSources,
        unreadAddDirFiles: unreadAddDirFiles,
        legacyPathRefused: legacyPathRefused,
        addDirFileBehindALink: addDirFileBehindALink,
      } = await disablePluginsInSettings(mapped, Object.keys(plugins), storageV5);
    if (notTurnedOff.size > 0 || unreadSources.length > 0) {
      let flat = [...notTurnedOff.values()].flat(),
        joined = [
          flat.some((To) => ["user", "project"].includes(To) || (To === "local" && !legacyFileIsTheCause))
            ? "Turn each off with: claude plugin disable <id> --scope <scope>, or repair that scope's settings file."
            : "",
          legacyFileIsTheCause
            ? legacyPathRefused === "vet-network"
              ? "A link on the path of the legacy local settings file (.claude/settings.local.json in the folder Claude Code was started in) leads to another machine, so the file was not read: replace that link with a real folder or file, or remove the link. No command can turn off a plugin that file enables."
              : legacyPathRefused === "suspect-link" || legacyPathRefused === "crossing"
                ? "The legacy local settings file (.claude/settings.local.json in the folder Claude Code was started in) was not read: a link on its path leads, or may lead, to another machine or could not be followed to its end, or a folder on it could not be checked. Replace such a link with a real folder or file, make each folder on that path readable, then run this remove again."
                : legacyPathRefused === "unbound"
                  ? "The legacy local settings file (.claude/settings.local.json in the folder Claude Code was started in) was not read: it, or a folder on its path, changed or was removed while this command was reading it, or this command could not follow that path all the way to the file. Run this remove again. If this message comes back, make each folder on that path readable and replace any link on it with a real folder or file, then run this remove again."
                  : legacyPathRefused !== void 0
                    ? "The path of the legacy local settings file (.claude/settings.local.json in the folder Claude Code was started in) could not be checked for links to another machine, so the file was not read: make each folder on that path readable, and replace any link on it with a real folder or file. No command can turn off a plugin that file enables."
                    : "Repair or delete the legacy local settings file (.claude/settings.local.json in the folder Claude Code was started in): it could not be read as settings, and no command can turn off a plugin that file enables."
            : "",
          flat.includes("managed")
            ? "Your organization's managed settings turn a plugin named here on, and this command cannot change them: ask your administrator to take that plugin out of managed settings."
            : "",
          flat.includes(SETTINGS_FLAG_SOURCE_LABEL)
            ? "The --settings given to this session turn a plugin named here on, and this command cannot change them: take that plugin out of --settings, or start Claude Code without it."
            : "",
          flat.includes(ADD_DIR_SOURCE_LABEL)
            ? "An added directory's settings (--add-dir) turn a plugin named here on, and user settings did not overrule them: check that user settings can be written and that this session reads them, or start Claude Code without that directory."
            : "",
        ]
          .filter((To) => To !== "")
          .join(" "),
        joined_2 = [...notTurnedOff]
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
            ? `A settings file of an added directory (--add-dir) could not be read, so a plugin it turns on cannot be seen: mend ${unreadAddDirFiles.map((bo) => printableOrEmpty(bo)).join(" and ")}${addDirFileBehindALink ? " (where a link on the way to such a file leads to another machine, replace that link with a real folder or file)" : ""}, or start Claude Code without ${new Set(unreadAddDirFiles.map((bo) => dirname_19(dirname_19(bo)))).size === 1 ? "that directory" : "those directories"}, then run this remove again.`
            : "",
        ]
          .filter((bo) => bo !== "")
          .join(" ");
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `${joined_3} Nothing was deleted, and the known_marketplaces.json entry named "${quotedPrintable(L)}" was left in place: those settings may turn ${formatPluginNameList(mapped, { disabledNote: !1 })} on again, ${ze === "catalog_unreadable" ? "not checked against" : "not at"} the commit the ${OFFICIAL_MARKETPLACE_DISPLAY} lists.${notTurnedOff.size > 0 ? ` May still be on: ${joined_2}. ${joined}` : " No settings that could be read switch them on now."}`,
          "removing a reserved-name entry was held back by settings that could not be read",
        );
      }
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${turnedOff.length > 0 ? `Turned off ${formatPluginNameList(turnedOff)}. ` : ""}Could not turn off ${joined_2}: ${ze === "catalog_unreadable" ? "not checked against" : "not at"} the commit the ${OFFICIAL_MARKETPLACE_DISPLAY} lists, and may still be enabled. The known_marketplaces.json entry named "${quotedPrintable(L)}" was left in place: run this remove again once each plugin named here is off. ${joined}`,
        "removing a reserved-name entry could not turn plugins off",
      );
    }
    if (((We = turnedOff), S !== void 0)) ((S.pluginIds = turnedOff), (S.reason = ze));
  }
  if (X5(ke.source))
    (await removeClaudeAiMarketplace(L, ke.source, s), getPluginRegistry().marketplaces.delete(L));
  else if (we) {
    let fs = SC();
    if (!fs) return { kind: "plugin-directory-built-in" };
    return (
      await fs.setPluginDirectoryMarketplaceEnabled(!1),
      getPluginRegistry().marketplaces.delete(L),
      logForDebugging(`Turned the built-in marketplace '${L}' off`),
      { kind: "plugin-directory-built-in" }
    );
  } else if (!Me) {
    let At = !1;
    if (Se !== void 0) (O1n(L, storageV5), (At = !0));
    try {
      await updateKnownMarketplaces((Zt) => {
        if (!Object.hasOwn(Zt, L)) {
          if (L6(L, storageV5) === void 0 && !At) return null;
          if (!At) (O1n(L, storageV5), (At = !0));
        }
        return (delete Zt[L], Zt);
      }, storageV5);
    } catch (error) {
      let rn = blockedPluginsNotice(We, ze, { insideFailure: !0 });
      if (rn === null) throw error;
      let pn = new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${rn} The known_marketplaces.json entry named "${quotedPrintable(L)}" could not be removed (${quotedPrintable(errorMessage(error))}). Run this remove again.`,
        "removing a reserved-name entry failed after plugins were turned off",
        RESERVED_NAME_REGISTRY_WRITE_FAILED,
      );
      throw ((pn.cause = error), pn);
    } finally {
      if (At) (HIe()[getStorageArm(storageV5)].delete(L), uGn());
    }
    if (S !== void 0) S.entryDeleted = !0;
    getPluginRegistry().marketplaces.delete(L);
    let It =
      isStorageV5Enabled() && storageV5 !== void 0
        ? getSyntheticMarketplaceStorageKey(L, ke.source, ke.installLocation)
        : null;
    if (storageV5 !== void 0 && It !== null) {
      let Zt = await storageV5.delete(It);
      if (!Zt.ok)
        logForDebugging(
          `Failed to delete cached marketplace ${L} through the storage backend: ${formatStorageError(Zt.error)}`,
          { level: "warn" },
        );
    }
    let Yt = await loadKnownMarketplacesWithDeclared(storageV5),
      filtered = listMarketplaceNames(Yt, storageV5).filter((Zt) => Zt !== L);
    await removeMarketplaceCacheFiles(
      L,
      filtered,
      marketplaceDirCandidates(Yt, storageV5, getResolvedMarketplacesCacheDir()),
    ).catch((Zt) => {
      logForDebugging(
        `Left the cache files of removed marketplace ${jsonStringify(L)} in place: ${errorMessage(Zt)}`,
        { level: "warn" },
      );
    });
  }
  let lt = !Me && !G;
  for (let source of EDITABLE_SETTING_SOURCES) {
    let It = n === void 0 || source === n;
    if (!It && !lt) continue;
    let Yt = !1,
      qt = await updateSettingsForSourceWithTransform(
        source,
        (Zt) => {
          if (!Zt) return null;
          let rn = !1,
            updates = {},
            no =
              G &&
              n === void 0 &&
              source === "userSettings" &&
              removeExtraMarketplace(Zt, L)?.autoUpdate !== void 0;
          if (It && removeExtraMarketplace(Zt, L) && !no) {
            let updatedMarketplaces = { ...Zt.extraKnownMarketplaces };
            ((updatedMarketplaces[L] = void 0),
              (updates.extraKnownMarketplaces = updatedMarketplaces),
              (rn = !0));
          }
          if (lt && Zt.enabledPlugins) {
            let marketplaceSuffix = `@${L}`,
              updatedPlugins = { ...Zt.enabledPlugins },
              yn = !1;
            for (let pluginId in updatedPlugins)
              if (pluginId.endsWith(marketplaceSuffix)) ((updatedPlugins[pluginId] = void 0), (yn = !0));
            if (yn) ((updates.enabledPlugins = updatedPlugins), (rn = !0));
          }
          if (!rn) return null;
          return ((Yt = !0), updates);
        },
        void 0,
        storageV5,
      );
    if (qt.error)
      logForDebugging(`Failed to clean up marketplace '${L}' from ${source} settings: ${qt.error.message}`, {
        level: "error",
      });
    else if (Yt) logForDebugging(`Cleaned up marketplace '${L}' from ${source} settings`);
  }
  if (Me)
    return (
      logForDebugging(
        `Removed marketplace '${L}' declaration from ${n}; still declared in another scope, keeping state layer and installed plugins`,
      ),
      { kind: "removed", removedPluginIds: [] }
    );
  if (G)
    return (
      logForDebugging(
        `Removed the ignored registry entry named '${L}'; turned off ${We.length} plugin(s) (${ze})`,
      ),
      {
        kind: "ignored-plugin-directory-name-entry-removed",
        removedNames: [L],
        removedPluginIds: [],
        disabledPluginIds: We,
        disabledReason: ze,
      }
    );
  let {
      orphanedPaths: orphanedPaths,
      removedPluginIds: removedPluginIds,
      sharedDataDirPluginIds: sharedDataDirPluginIds,
      installPathsStillInUse: installPathsStillInUse,
    } = await removeAllPluginsForMarketplace(L, storageV5),
    yt = new Set();
  if (q && L !== OFFICIAL_MARKETPLACE_NAME)
    for (let At of installPathsStillInUse) {
      let It = f5t(At);
      if (It !== void 0) yt.add(It);
    }
  for (let installPath of orphanedPaths) {
    let It = yt.size > 0 ? f5t(installPath) : void 0;
    if (It !== void 0 && yt.has(It)) continue;
    await markPluginVersionOrphaned(installPath, storageV5);
  }
  let gt = listInstalledPluginIds(getInstalledPlugins());
  for (let pluginId of removedPluginIds)
    await planUninstallCleanup(pluginId, {
      deleteDataDir: !sharedDataDirPluginIds.includes(pluginId),
      installedIds: gt,
      storageV5: storageV5,
      credentials: s,
    });
  if (
    (removePluginUsage(removedPluginIds, storageV5), logForDebugging(`Removed marketplace source: ${L}`), q)
  )
    return {
      kind: "ignored-plugin-directory-name-entry-removed",
      removedNames: [L],
      removedPluginIds: removedPluginIds,
      disabledPluginIds: We,
      disabledReason: ze,
    };
  return { kind: "removed", removedPluginIds: removedPluginIds };
}
//@ chunk-e6aww6q8.js:4289668-4289720 placement
function HWo(e, n) {
  return PLUGIN_DIRECTORY_MARKETPLACE_NAMES.has(n)
    ? reservedNameMessage(e)
    : formatReservedSpellingMessage(e, n);
}
//@ chunk-e6aww6q8.js:4289720-4289810 placement
function ozt(e) {
  for (let n of RESERVED_MARKETPLACE_NAMES)
    if (n !== OFFICIAL_MARKETPLACE_NAME && e.toLowerCase() !== n && isFoldedSpellingOf(e, n)) return n;
  return;
}
/**
 * 校验注册表条目对保留市场名的使用：官方名只允许 pluginDirectory 源；其他保留名需种子目录或官方来源；源格式错误时返回说明。
 */
//@ chunk-e6aww6q8.js:4289810-4290233 placement
function validateReservedMarketplaceEntry(e, n) {
  if (e === OFFICIAL_MARKETPLACE_NAME)
    return n.source?.source === "pluginDirectory" ? null : reservedMarketplaceEntryMessage(e, QE());
  let r = reservedMarketplaceNameMessage(e);
  if (r !== void 0) return r;
  if (!RESERVED_MARKETPLACE_NAMES.has(e.toLowerCase())) return null;
  if (typeof n.installLocation === "string" && seedDirFor(n.installLocation)) return null;
  let source = n.source;
  if (typeof source !== "object" || source === null)
    return `The name '${e}' is reserved for official Anthropic marketplaces and its registered source is malformed.`;
  return validateOfficialNameSource(e, n.source);
}
//@ chunk-e6aww6q8.js:4290233-4290272 placement
function Dse(e, n) {
  return cdr() && isImpersonatingOfficialName(e);
}
//@ chunk-e6aww6q8.js:4290272-4290492 placement
function assertNotLookAlikeName(e, n) {
  if (!Dse(e, n)) return;
  if (isAsciiImpersonatingOfficialName(e))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      reservedNameMessage_2(n.source.source === "settings"),
      "Marketplace name refused by the look-alike check",
    );
  throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    marketplaceLoadFailedMessage(e, IMPERSONATION_ERROR_MESSAGE),
    "Marketplace name refused by the look-alike check",
  );
}
/**
 * 保留名被不受信来源注册时抛错。
 */
//@ chunk-e6aww6q8.js:4290492-4290923 placement
function assertReservedNameTrusted(e, n) {
  let r = validateReservedMarketplaceEntry(e, n),
    s = isOfficialMarketplaceSpelling(e);
  if (r && (s || ozt(e) !== void 0)) {
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
      `Marketplace "${e}" is registered from an untrusted source: ${r} To fix it, remove the marketplace and re-add it from the official source.`,
      "Reserved marketplace name registered from untrusted source",
    );
}
//@ chunk-e6aww6q8.js:4290923-4291532 placement
async function readCachedMarketplace(e, n, { folderAsEisdir: r = !1 } = {}) {
  let read = await e.read([n]);
  if (!read.ok) {
    if (r && $Zn(read.error))
      throw Object.assign(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `EISDIR: not a regular file (${formatStorageError(read.error)})`,
          "cached marketplace folder is not a regular file (v5)",
        ),
        { code: "EISDIR" },
      );
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Failed to read cached marketplace: ${formatStorageError(read.error)}`,
      "failed to read cached marketplace (v5 backend error)",
    );
  }
  let h = read.value.items[0];
  if (h === void 0)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "Failed to read cached marketplace: the backend returned no item for the key",
      "failed to read cached marketplace (v5 backend error)",
    );
  return h.found ? Buffer.from(h.value).toString("utf-8") : null;
}
//@ chunk-e6aww6q8.js:4291632-4291733 sole-consumer
function catalogNotCachedError() {
  return Object.assign(Error("ENOENT: marketplace catalog not cached"), { code: "ENOENT" });
}
//@ chunk-e6aww6q8.js:4291733-4291811 sole-consumer
async function Ohs(e, n) {
  let r = await readCachedMarketplace(e, n);
  if (r === null) throw catalogNotCachedError();
  return r;
}
//@ chunk-e6aww6q8.js:4291811-4291849 sole-consumer
function zse(e) {
  return isUsingCoworkPlugins() ? void 0 : e;
}
//@ chunk-e6aww6q8.js:4291849-4291904 sole-consumer
function AGn(e) {
  let n = zse(e);
  return n !== void 0 && isLookalikeButNotBlockedName(n);
}
/**
 * 读取已缓存市场的 marketplace.json：v5 存储下按 hostFolder、manifest 或 catalog 键读取；否则读本地文件， .claude-plugin/marketplace.json 不存在时退回把位置本身当作文件。按来源选 schema 校验。
 */
//@ chunk-e6aww6q8.js:4291904-4292977 sole-consumer
async function readMarketplaceManifest(location, source, storage, storageLocation = null) {
  let manifestPath = join_29(location, ".claude-plugin", "marketplace.json"),
    y = storageLocation?.kind === "key" ? storageLocation.key : null,
    schema = getPluginMarketplaceSchemaFor(zse(source));
  if (isStorageV5Enabled() && storage !== void 0 && storageLocation?.kind === "hostFolder") {
    let w;
    try {
      w = await readLocalMarketplaceFile(storage, storageLocation.space, manifestPath);
    } catch (error) {
      let q = getErrnoCode(error);
      if (q === "ENOENT" || q === "ENOTDIR") w = { absent: q };
      else throw error;
    }
    if ("text" in w) return parseFileWithSchema(w.text, manifestPath, schema);
    let L = await readLocalMarketplaceFile(storage, storageLocation.space, location);
    if ("text" in L) return parseFileWithSchema(L.text, location, schema);
    throw enoentError(location);
  }
  if (
    isStorageV5Enabled() &&
    storage !== void 0 &&
    y?.namespace === "marketplaceCache" &&
    y.form === "manifest"
  ) {
    let w = await readCachedMarketplace(storage, y);
    if (w !== null) return parseFileWithSchema(w, manifestPath, schema);
  } else if (
    isStorageV5Enabled() &&
    storage !== void 0 &&
    y?.namespace === "marketplaceCache" &&
    "relPath" in y
  ) {
    let w = await readCachedMarketplace(storage, y);
    if (w !== null) return parseFileWithSchema(w, manifestPath, schema);
    let L = await readCachedMarketplace(storage, STORAGE_SPACES.marketplaceCache(y.marketplace, "catalog"), {
      folderAsEisdir: !0,
    });
    if (L === null) throw catalogNotCachedError();
    return parseFileWithSchema(L, location, schema);
  } else if (!isDiskless())
    try {
      return await readJsonFileWithSchema(manifestPath, schema);
    } catch (error) {
      if (error instanceof ConfigParseError) throw error;
      let L = getErrnoCode(error);
      if (L !== "ENOENT" && L !== "ENOTDIR") throw error;
    }
  if (
    isStorageV5Enabled() &&
    storage !== void 0 &&
    y?.namespace === "marketplaceCache" &&
    y.form === "catalog"
  ) {
    let w = await readCachedMarketplace(storage, y);
    if (w === null) throw catalogNotCachedError();
    return parseFileWithSchema(w, location, schema);
  }
  if (isDiskless()) throw catalogNotCachedError();
  return await readJsonFileWithSchema(location, schema);
}
/**
 * 只读缓存取市场目录（不联网）；用于加载插件、提示与推荐。
 */
//@ chunk-e6aww6q8.js:4292977-4293865 fingerprint = getMarketplaceCacheOnly (0.629)
async function getMarketplaceCacheOnly(marketplaceName, storageV5, options) {
  if (marketplaceName.toLowerCase() === NPM) return null;
  let s = options?.unreadableCatalogs;
  if (options?.registryEntry)
    return loadCachedMarketplace(
      storageV5,
      marketplaceName,
      options.registryEntry,
      options.registryEntryIsSaved ? marketplaceName : void 0,
      s,
    );
  let fs = getFsImplementation(),
    y = isStorageV5Enabled() && storageV5 !== void 0 ? getMarketplacesStorageScope() : null;
  if (storageV5 !== void 0 && y !== null) {
    let read = await storageV5.read([y]);
    if (!read.ok)
      return (
        logForDebugging(
          `Failed to read cached marketplace ${marketplaceName}: ${formatStorageError(read.error)}`,
          { level: "warn" },
        ),
        null
      );
    let G = read.value.items[0];
    if (!G?.found) return loadDeclaredMarketplace(storageV5, marketplaceName, s);
    let q;
    try {
      let Z = jsonParse(Buffer.from(G.value).toString("utf-8"));
      q = getAdmittedMarketplaceEntry(marketplaceName, Z);
    } catch (error) {
      return (
        logForDebugging(`Failed to read cached marketplace ${marketplaceName}: ${errorMessage(error)}`, {
          level: "warn",
        }),
        null
      );
    }
    return q
      ? await loadCachedMarketplace(storageV5, marketplaceName, q, marketplaceName, s)
      : await loadDeclaredMarketplace(storageV5, marketplaceName, s);
  }
  if (isDiskless()) return loadDeclaredMarketplace(storageV5, marketplaceName, s);
  let configFile = getKnownMarketplacesPath(),
    w;
  try {
    let content = await fs.readFile(configFile, { encoding: "utf-8" }),
      config = jsonParse(content);
    w = getAdmittedMarketplaceEntry(marketplaceName, config);
  } catch (error) {
    if (isENOENT(error)) return loadDeclaredMarketplace(storageV5, marketplaceName, s);
    return (
      logForDebugging(`Failed to read cached marketplace ${marketplaceName}: ${errorMessage(error)}`, {
        level: "warn",
      }),
      null
    );
  }
  return w
    ? await loadCachedMarketplace(storageV5, marketplaceName, w, marketplaceName, s)
    : await loadDeclaredMarketplace(storageV5, marketplaceName, s);
}
//@ chunk-e6aww6q8.js:4293865-4294027 layout
async function loadDeclaredMarketplace(e, n, r) {
  if (n === OFFICIAL_MARKETPLACE_NAME)
    return (await loadPluginDirectoryMarketplaceCached({ storageV5: e }))?.marketplace ?? null;
  let s = Zb(await readClaudeAiMarketplaceRegistry(), n);
  return s === void 0 ? null : loadCachedMarketplace(e, n, toKnownMarketplaceEntry(n, s), void 0, r);
}
//@ chunk-e6aww6q8.js:4294027-4294059 layout
var Nut = { blocklistDirection: !0 };
//@ chunk-e6aww6q8.js:4294059-4294123 layout
function Fut(e) {
  return e.toLowerCase().replace(/[^a-z0-9]/g, "");
}
/**
 * 仿冒检查用的不可见字符、易混标点正则与非 ASCII 正则。
 */
//@ chunk-e6aww6q8.js:4294123-4294438 layout
var INVISIBLE_FORMAT_CHARS_RE = /[\u200c-\u200f\u202a-\u202e\u206a-\u206f\ufeff]/g,
  CONFUSABLE_PUNCTUATION_RE =
    /[\u2018\u2019\u201c\u201d\u2010-\u2015\u00b7\u0387\u2022\u2027\u2219\u22c5\u30fb\uff65\u2190-\u2199\u21d0-\u21d5\u21e6-\u21e9\u2794\u2798-\u27a4\u27a7-\u27af\u27b1\u27b3-\u27be\u27f5-\u27fa\u2b00-\u2b0d\u2b95\uffe9-\uffec]/g,
  MAX_LOOSE_NAME_LENGTH = 512,
  NON_ASCII_RE = /[^\x00-\x7f]/;
//@ chunk-e6aww6q8.js:4294438-4294474 layout
function tct(e) {
  return e.length > MAX_LOOSE_NAME_LENGTH;
}
//@ chunk-e6aww6q8.js:4294474-4294609 layout
function looseNameVariants(e) {
  let n = [Fut(e)];
  if (NON_ASCII_RE.test(e) && !tct(e))
    n.push(Fut(e.normalize("NFKC").replace(INVISIBLE_FORMAT_CHARS_RE, "")));
  return uniq(n).filter((r) => r !== "");
}
//@ chunk-e6aww6q8.js:4294609-4294670 layout
var Nhs = /^[\uff10-\uff19\uff21-\uff3a\uff41-\uff5a]$/,
  $hs = 16;
//@ chunk-e6aww6q8.js:4294670-4294891 layout
function splitLooseNameSegments(e) {
  let n = [],
    r = 0;
  for (let s of e) {
    let normalized = s.normalize("NFKC");
    if (NON_ASCII_RE.test(normalized)) continue;
    let y = Fut(normalized);
    if (y === "") continue;
    let S = NON_ASCII_RE.test(s) && !Nhs.test(s);
    if (S && ++r > $hs) return null;
    n.push({ text: y, eitherWay: S });
  }
  return n;
}
//@ chunk-e6aww6q8.js:4294891-4295044 layout
function isSuspiciousNonAsciiName(e) {
  if (!NON_ASCII_RE.test(e)) return !1;
  if (tct(e)) return !0;
  if (splitLooseNameSegments(e) === null) return !0;
  return NON_ASCII_RE.test(
    e.replace(CONFUSABLE_PUNCTUATION_RE, "").normalize("NFKC").replace(INVISIBLE_FORMAT_CHARS_RE, ""),
  );
}
//@ chunk-e6aww6q8.js:4295044-4295247 layout
function matchesLooseSegments(e, n) {
  let r = new Set([0]);
  for (let { text: text, eitherWay: eitherWay } of e) {
    let y = new Set();
    for (let S of r) {
      if (eitherWay) y.add(S);
      if (n.startsWith(text, S)) y.add(S + text.length);
    }
    if (y.size === 0) return !1;
    r = y;
  }
  return r.has(n.length);
}
//@ chunk-e6aww6q8.js:4295247-4295514 layout
function matchesBlockedLooseName(e, n) {
  if (!NON_ASCII_RE.test(e) || tct(e)) return !1;
  let r = splitLooseNameSegments(e);
  if (r === null || !r.some((y) => y.eitherWay)) return !1;
  let s = 0,
    h = 0;
  for (let { text: text, eitherWay: eitherWay } of r) if (((h += text.length), !eitherWay)) s += text.length;
  for (let looseName of n.looseNames)
    if (looseName.length >= s && looseName.length <= h && matchesLooseSegments(r, looseName)) return !0;
  return !1;
}
/**
 * 读取 policySettings.enabledPlugins 中为 false 的插件，收集名字、宽松名，并尽量解析出其仓库来源键； 无法解析仓库时只按名字阻止并记 warn。没有禁用项返回 null。
 */
//@ chunk-e6aww6q8.js:4295514-4296565 layout
async function collectOrgBlockedPlugins(e) {
  {
    let blockedIds = Object.entries(getSettingsForSource("policySettings")?.enabledPlugins ?? {})
      .filter(([, S]) => S === !1)
      .map(([S]) => S);
    if (blockedIds.length === 0) return null;
    let knownMarketplaces = await loadKnownMarketplacesSafe(e),
      blocked = { keys: new Set(), names: new Set(), looseNames: new Set(), looseNameBlock: !1 },
      h,
      y = !1;
    for (let S of blockedIds) {
      let { name: w, marketplace: marketplace } = parsePluginIdentifier(S);
      if (!w) continue;
      (blocked.names.add(w), (blocked.looseNameBlock = !0));
      for (let q of looseNameVariants(w)) blocked.looseNames.add(q);
      if (marketplace === OFFICIAL_MARKETPLACE_NAME) continue;
      let G;
      try {
        let q = await getPluginByIdCacheOnly(S, e);
        if (q)
          G = samePluginSource(
            q.entry.source,
            sourceUrlAndRef(marketplace ? Zb(knownMarketplaces, marketplace)?.source : void 0),
            Nut,
          );
        else if (marketplace === CLAUDE_PLUGINS_OFFICIAL)
          ((h ??= getCachedCatalogPlugins(e)),
            (G = samePluginSource((await h)?.[S]?.marketplace_entry.source, Epe.repo, Nut)),
            (y ||= G === void 0));
      } catch (error) {
        logForDebugging(`Could not resolve org-blocked plugin ${S}: ${errorMessage(error)}`, {
          level: "warn",
        });
      }
      if (G === void 0)
        logForDebugging(
          `Org-blocked plugin ${S} has no resolvable repository; the plugin directory blocks it by name only`,
          { level: "warn" },
        );
      else blocked.keys.add(G);
    }
    if (y && (await h) === void 0 && (await getMarketplaceCacheOnly(CLAUDE_PLUGINS_OFFICIAL, e)) === null)
      logForDebugging(
        `${CLAUDE_PLUGINS_OFFICIAL} has never been cached on this machine, so the plugins your organization blocks in it are matched in the plugin directory by name alone`,
        { level: "warn" },
      );
    return blocked;
  }
  return null;
}
/**
 * 判断插件目录中的条目是否应隐藏：仓库被主机策略阻止；或按名字、仓库键、宽松名、可疑非 ASCII 名与禁用名匹配。
 */
//@ chunk-e6aww6q8.js:4296565-4297073 layout
function isListingBlocked(e, n) {
  {
    let { source: source } = e;
    if (
      isListingRepositoryBlockedByHostPolicy(
        typeof source === "object" && "url" in source ? source.url : void 0,
      )
    )
      return !0;
    if (n === null) return !1;
    let s = samePluginSource(e.source, void 0, Nut);
    if (n.names.has(e.name) || (s === void 0 ? n.keys.size > 0 : n.keys.has(s))) return !0;
    if (!n.looseNameBlock) return !1;
    let h = typeof source === "object" && "path" in source ? source.path : void 0,
      filtered = [e.name, e.displayName, h?.split("/").findLast(Boolean)].filter((S) => S !== void 0);
    if (filtered.some((S) => looseNameVariants(S).some((w) => n.looseNames.has(w)))) return !0;
    if (filtered.some(isSuspiciousNonAsciiName)) return !0;
    return filtered.some((S) => matchesBlockedLooseName(S, n));
  }
  return !1;
}
/**
 * 插件目录缓存清单中的该插件是否被组织阻止。
 */
//@ chunk-e6aww6q8.js:4297073-4297293 layout
async function isPluginDirectoryListingBlocked(e, n) {
  let r = SC();
  if (!r) return !1;
  let s = await collectOrgBlockedPlugins(n),
    { marketplace: marketplace } = await r.loadPluginDirectoryMarketplace("cache-only", {
      installRecords: getInstalledPluginsMap,
    }),
    y = marketplace?.plugins.find((S) => S.name === e);
  return y !== void 0 && isListingBlocked(y, s);
}
/**
 * 插件目录启用时返回插件不可安装的说明。
 */
//@ chunk-e6aww6q8.js:4297293-4297550 layout
async function pluginDirectoryNotInstallableMessage(e) {
  let n = SC();
  if (!n || !(await n.isPluginDirectoryMarketplaceEnabled())) return;
  let { marketplace: marketplace } = await n.loadPluginDirectoryMarketplace("cache-only", {
    installRecords: getInstalledPluginsMap,
  });
  return marketplace === null ? void 0 : await n.pluginDirectoryNotInstallableMessage(e);
}
//@ chunk-e6aww6q8.js:4297550-4297745 layout
async function filterBlockedListings(e, n) {
  let r = await collectOrgBlockedPlugins(n),
    filtered = e.plugins.filter((plugin) => !isListingBlocked(plugin, r));
  if (filtered.length === e.plugins.length) return e;
  if (e.plugins.some((plugin) => isListingBlocked(plugin, null))) logDirectoryBlockedOnce("host_pattern");
  return { ...e, plugins: filtered };
}
/**
 * 只读缓存加载插件目录市场清单（滤掉被阻止项）。
 */
//@ chunk-e6aww6q8.js:4297745-4298209 layout
async function loadPluginDirectoryMarketplaceCached({
  ignoreToggle: e = !1,
  storageV5: n,
  onlyMissedListings: r = !1,
} = {}) {
  {
    let s = e && pluginDirectoryPolicyBlock() === null ? $6 : SC();
    if (!s || (!e && !(await s.isPluginDirectoryMarketplaceEnabled()))) return null;
    let { marketplace: marketplace } = await s.loadPluginDirectoryMarketplace("cache-only", {
      forInstalledPlugin: e,
      onlyMissedListings: r,
      installRecords: getInstalledPluginsMap,
    });
    if (marketplace === null) return null;
    let { installLocation: installLocation } = await s.pluginDirectoryRegistryEntry();
    return { marketplace: await filterBlockedListings(marketplace, n), installLocation: installLocation };
  }
  return null;
}
/**
 * 返回带 lookUp(name, purpose) 的读取器：首次查询时刷新插件目录（不在会话可用、不允许读取或关闭时返回 not-read）， 结果在本次操作内共享；查询结果为 listed / hidden-by-policy / not-installable / not-listed / not-read。
 */
//@ chunk-e6aww6q8.js:4298209-4300613 layout
function createPluginDirectoryReader(
  storage,
  { mayWalkTheFeed: mayWalkTheFeed, onBehalfOf: onBehalfOf = "a-person" },
) {
  let readPromise,
    readState = "unasked",
    readOnce = (w, L) => (
      (readPromise ??= (async () => {
        let pluginDirectoryMarketplace = await w.loadPluginDirectoryMarketplace("refresh", {
          purpose: L,
          trigger: L === "update" ? "update" : "install",
          installRecords: getInstalledPluginsMap,
        });
        if (pluginDirectoryMarketplace.marketplace === null)
          return (
            (readState = "not-read"),
            {
              marketplace: null,
              detail: pluginDirectoryMarketplace.message,
              ...(pluginDirectoryMarketplace.laterMayHelp && { nextStep: "Try again later" }),
            }
          );
        ((readState = "read"), getPluginRegistry().marketplaces.delete(OFFICIAL_MARKETPLACE_NAME));
        let { installLocation: installLocation } = await w.pluginDirectoryRegistryEntry(),
          Z = await filterBlockedListings(pluginDirectoryMarketplace.marketplace, storage),
          Se = new Set(Z.plugins);
        return {
          marketplace: Z,
          installLocation: installLocation,
          reviewerMarkedNames: pluginDirectoryMarketplace.reviewerMarkedNames ?? new Set(),
          hiddenByPolicy: new Set(
            pluginDirectoryMarketplace.marketplace.plugins
              .filter((plugin) => !Se.has(plugin))
              .map((ke) => ke.name),
          ),
          notInstallable: pluginDirectoryMarketplace.notInstallable ?? new Map(),
        };
      })().catch(
        (G) => (
          logError(withTelemetryMessage(toError(G), "Plugin directory operation read threw")),
          (readState = "not-read"),
          { marketplace: null, detail: "an unexpected error stopped the read" }
        ),
      )),
      readPromise
    ),
    reader = {
      async lookUp(w, L) {
        {
          let G = SC();
          if (G === null)
            return { outcome: "not-read", purpose: L, detail: "it isn't available in this session" };
          if (!mayWalkTheFeed)
            return { outcome: "not-read", purpose: L, detail: "it is read only when a person asks for it" };
          if (
            L !== "switch" &&
            !(await G.isPluginDirectoryMarketplaceEnabled()) &&
            !(L === "update" && FGn(w))
          )
            return {
              outcome: "not-read",
              purpose: L,
              detail: "it is off",
              nextStep: `Turn it on: claude plugin marketplace add ${OFFICIAL_MARKETPLACE_NAME}`,
            };
          if (readPromise === void 0) {
            let pluginDirectoryFailedWalkWindow = G.pluginDirectoryFailedWalkWindow(),
              we =
                pluginDirectoryFailedWalkWindow === void 0
                  ? void 0
                  : onBehalfOf === "nobody"
                    ? pluginDirectoryFailedWalkWindow.closesAt
                    : pluginDirectoryFailedWalkWindow.serviceDelayMs === void 0
                      ? void 0
                      : pluginDirectoryFailedWalkWindow.failedAt +
                        Math.min(pluginDirectoryFailedWalkWindow.serviceDelayMs, qhs);
            if (pluginDirectoryFailedWalkWindow !== void 0 && we !== void 0 && Date.now() < we)
              return (
                (readState = "not-read"),
                {
                  outcome: "not-read",
                  purpose: L,
                  detail:
                    onBehalfOf === "nobody"
                      ? `it could not be read a short while ago (${pluginDirectoryFailedWalkWindow.reason}), and work that runs by itself does not ask it again before ${formatTimeOfDay(we)}`
                      : `it asked Claude Code to wait, and can be asked again at ${formatTimeOfDay(we)}`,
                }
              );
          }
          let q = await readOnce(G, L);
          if (q.marketplace === null)
            return {
              outcome: "not-read",
              purpose: L,
              detail: q.detail,
              ...(q.nextStep !== void 0 && { nextStep: q.nextStep }),
            };
          let found = q.marketplace.plugins.find((plugin) => plugin.name === w);
          if (found !== void 0)
            return {
              outcome: "listed",
              entry: found,
              marketplaceInstallLocation: q.installLocation,
              reviewerMarked: q.reviewerMarkedNames.has(w),
            };
          if (q.hiddenByPolicy.has(w)) return { outcome: "hidden-by-policy" };
          let Se = q.notInstallable.get(w);
          return Se === void 0 ? { outcome: "not-listed" } : { outcome: "not-installable", why: Se };
        }
        return { outcome: "not-read", purpose: L, detail: "it isn't available in this build" };
      },
    };
  return (weakMap_12.set(reader, () => readState), reader);
}
//@ chunk-e6aww6q8.js:4300613-4300628 layout
var qhs = 300000;
//@ chunk-e6aww6q8.js:4300628-4300724 layout = formatLocalTime (0.892)
function formatTimeOfDay(timestamp) {
  return new Date(timestamp).toLocaleTimeString(void 0, { hour: "numeric", minute: "2-digit" });
}
//@ chunk-e6aww6q8.js:4300724-4300744 layout
var weakMap_12 = new WeakMap();
/**
 * 为切换安装来源查插件目录条目。
 */
//@ chunk-e6aww6q8.js:4300744-4301197 layout
async function lookUpPluginForSwitch(e, n, r = createPluginDirectoryReader(n, { mayWalkTheFeed: !0 })) {
  let lookUp = await r.lookUp(e, "switch");
  switch (lookUp.outcome) {
    case "listed":
      return {
        entry: lookUp.entry,
        marketplaceInstallLocation: lookUp.marketplaceInstallLocation,
        reviewerMarked: lookUp.reviewerMarked,
      };
    case "not-read":
      return { notFreshEnoughFor: "switch", detail: lookUp.detail };
    case "hidden-by-policy":
    case "not-installable":
    case "not-listed":
      return { entry: null };
    default: {
      let h = lookUp;
      throw Error("Unhandled outcome of a read of the Directory");
    }
  }
}
/**
 * 切换需要重新读取插件目录但读取失败。
 */
//@ chunk-e6aww6q8.js:4301197-4301390 layout
function formatSwitchNeedsFreshReadMessage(e) {
  return `A switch needs a fresh read of the ${OFFICIAL_MARKETPLACE_DISPLAY}, not the copy saved on this machine, and it could not be read: ${quotedPrintable(e, 200)}. Nothing was changed; try again once it can be read`;
}
//@ chunk-e6aww6q8.js:4301390-4301558 layout
async function findPluginDirectoryEntry(e, n, r) {
  let s = await loadPluginDirectoryForPurpose(e, n, r),
    h = s?.marketplace.plugins.find((y) => y.name === e);
  return s && h ? { entry: h, marketplaceInstallLocation: s.installLocation } : null;
}
/**
 * 加载插件目录（Directory）市场的清单（缓存模式），没有返回 null。
 */
//@ chunk-e6aww6q8.js:4301558-4301631 layout
async function ugn(e, n) {
  return (await loadPluginDirectoryForPurpose(e, n, "load"))?.marketplace ?? null;
}
//@ chunk-e6aww6q8.js:4301631-4301747 layout
async function pluginDirectoryNotInstallableReason(e, n) {
  return (await loadPluginDirectoryForPurpose(e, n, "load")) === null
    ? void 0
    : await $6?.pluginDirectoryNotInstallableReason(e);
}
/**
 * 在插件目录（可只看漏列项）中查插件条目。
 */
//@ chunk-e6aww6q8.js:4301747-4301972 layout
async function findMissedListingEntry(e, n, r) {
  let s = r
      ? await loadPluginDirectoryForPurpose(e, n, "load", !0)
      : await loadPluginDirectoryMarketplaceCached({ storageV5: n, onlyMissedListings: !0 }),
    h = s?.marketplace.plugins.find((y) => y.name === e);
  return s && h ? { entry: h, marketplaceInstallLocation: s.installLocation } : null;
}
//@ chunk-e6aww6q8.js:4301972-4302079 layout
function loadPluginDirectoryForPurpose(e, n, r, s = !1) {
  return loadPluginDirectoryMarketplaceCached({
    onlyMissedListings: s,
    ignoreToggle: r !== "install" && FGn(e),
    storageV5: n,
  });
}
//@ chunk-e6aww6q8.js:4302079-4302177 layout
function zIe() {
  if (pluginDirectoryPolicyBlock() !== null) return "blocked";
  return X1n?.pluginDirectoryUnavailableCause() ?? null;
}
//@ chunk-e6aww6q8.js:4302177-4302245 layout
function IGn() {
  return X1n?.pluginDirectoryPolicyRefusalReason() ?? "";
}
//@ chunk-e6aww6q8.js:4302245-4302312 layout
async function DGn() {
  await $6?.awaitPluginDirectoryPolicyVerdict();
}
/**
 * 加载插件目录市场，不可用（或过期）时抛 PluginDirectoryUnavailableError。
 */
//@ chunk-e6aww6q8.js:4302312-4302965 layout
async function loadPluginDirectoryMarketplace(
  e,
  n,
  { staleIsFailure: r = !1, trigger: s = "other", signal: h } = {},
) {
  let y = SC(),
    S = y
      ? await y.loadPluginDirectoryMarketplace(e, {
          trigger: s,
          signal: h,
          installRecords: getInstalledPluginsMap,
        })
      : { marketplace: null, message: "it isn't available in this session" };
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
  return await filterBlockedListings(S.marketplace, n);
}
/**
 * 按来源加载已缓存市场：claude.ai 源走账号缓存，插件目录源走缓存清单；其他源先做保留名与仿冒检查， 再读 marketplace.json。失败或拒绝时把市场名记入 failed 集合（仿冒错误另行标记）。
 */
//@ chunk-e6aww6q8.js:4302965-4303774 layout
async function loadCachedMarketplace(storage, marketplaceName, entry, declaredSource, failedNames) {
  if (X5(entry.source))
    return (
      await ensureClaudeAiMarketplace(marketplaceName, entry.source, {
        mode: "cache-only",
        credentials: void 0,
      })
    ).marketplace;
  if (isPluginDirectorySource(entry.source))
    return (await loadPluginDirectoryMarketplaceCached({ storageV5: storage }))?.marketplace ?? null;
  try {
    let y = normalizeInstallLocation(entry.source, entry.installLocation),
      S = validateReservedMarketplaceEntry(marketplaceName, { source: entry.source, installLocation: y });
    if (S)
      return (
        logForDebugging(`Refusing to load marketplace '${marketplaceName}': ${S}`, { level: "warn" }),
        null
      );
    if (Dse(marketplaceName, entry))
      return (
        logForDebugging(
          `Refusing to load marketplace '${marketplaceName}': the look-alike check refuses the name it is saved under`,
          { level: "warn" },
        ),
        failedNames?.add(marketplaceName),
        markImpersonationFailure(failedNames, marketplaceName, !0),
        null
      );
    let w = await readMarketplaceManifest(
      y,
      declaredSource,
      storage,
      isStorageV5Enabled() && storage !== void 0
        ? getMarketplaceStorageLocation(marketplaceName, entry.source, y)
        : null,
    );
    return (
      failedNames?.delete(marketplaceName),
      markImpersonationFailure(failedNames, marketplaceName, !1),
      w
    );
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT")
      return (
        failedNames?.delete(marketplaceName),
        markImpersonationFailure(failedNames, marketplaceName, !1),
        null
      );
    return (
      logForDebugging(`Failed to read cached marketplace ${marketplaceName}: ${errorMessage(error)}`, {
        level: "warn",
      }),
      failedNames?.add(marketplaceName),
      markImpersonationFailure(
        failedNames,
        marketplaceName,
        !AGn(declaredSource) && errorMessage(error).includes(IMPERSONATION_ERROR_MESSAGE),
      ),
      null
    );
  }
}
//@ chunk-e6aww6q8.js:4303774-4303794 layout
var weakMap_13 = new WeakMap();
//@ chunk-e6aww6q8.js:4303794-4303927 layout
function markImpersonationFailure(e, n, r) {
  if (e === void 0) return;
  let s = weakMap_13.get(e);
  if (r)
    if (s === void 0) weakMap_13.set(e, new Set([n]));
    else s.add(n);
  else s?.delete(n);
}
//@ chunk-e6aww6q8.js:4303927-4303976 layout
function LGn(e, n) {
  return weakMap_13.get(e)?.has(n) === !0;
}
/**
 * 取市场目录：缓存存在且可解析就用，否则（或缓存过期时）重新 loadAndCacheMarketplace。
 */
//@ chunk-e6aww6q8.js:4303976-4306122 fingerprint = getMarketplace (0.462)
function getMarketplace(marketplaceName, storageV5, r = "other") {
  if (marketplaceName.toLowerCase() === NPM)
    return Promise.reject(
      Error(
        'The marketplace registered as "npm" is ignored: the name npm is reserved for plugins installed from an npm registry (<package>@npm).',
      ),
    );
  let { marketplaces: marketplaces } = getPluginRegistry(),
    h = marketplaces.get(marketplaceName);
  if (h)
    return marketplaceName === OFFICIAL_MARKETPLACE_NAME
      ? h.then(
          (S) =>
            zIe() !== null
              ? loadPluginDirectoryMarketplace("if-stale", storageV5)
              : filterBlockedListings(S, storageV5),
          (S) => {
            let w = marketplaces.get(marketplaceName);
            if (
              !(S instanceof PluginDirectoryUnavailableError) ||
              pluginDirectoryPolicyBlock() !== null ||
              w === void 0
            )
              throw S;
            if (w === h) marketplaces.delete(marketplaceName);
            return getMarketplace(marketplaceName, storageV5, r);
          },
        )
      : h;
  let y = (async () => {
    let S = await loadKnownMarketplacesWithDeclared(storageV5),
      w = Zb(S, marketplaceName);
    if (!w)
      throw withTelemetryMessage(
        Error(
          `Marketplace '${marketplaceName}' not found in configuration. Available marketplaces: ${Object.keys(S).join(", ")}`,
        ),
        "Marketplace not found in configuration",
      );
    if (X5(w.source)) {
      let { marketplace: marketplace, status: status } = await ensureClaudeAiMarketplace(
        marketplaceName,
        w.source,
        { mode: "if-missing", credentials: void 0 },
      );
      if (marketplace === null)
        throw new ClaudeAiMarketplaceError(
          `Marketplace "${marketplaceName}" (hosted on claude.ai) is ${describeMarketplaceFreshness(status) ?? "not available"}`,
          catalogStatusCode(status),
          "claude.ai marketplace catalog unavailable",
        );
      return marketplace;
    }
    if (isPluginDirectorySource(w.source))
      return await loadPluginDirectoryMarketplace("if-stale", storageV5, { trigger: r });
    if (
      (assertReservedNameTrusted(marketplaceName, w),
      assertNotLookAlikeName(marketplaceName, w),
      isLocalMarketplaceSource(w.source) && !isAbsolute_8(w.source.path))
    ) {
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
        isStorageV5Enabled() && storageV5 !== void 0
          ? getMarketplaceStorageLocation(marketplaceName, w.source, w.installLocation)
          : null,
      );
    } catch (error) {
      logForDebugging(
        `Cache corrupted or missing for marketplace ${marketplaceName}, re-fetching from source: ${errorMessage(error)}`,
        { level: "warn" },
      );
    }
    let L, G;
    try {
      ({ marketplace: L, keptStaleClone: G } = await loadAndCacheMarketplace(
        w.source,
        marketplaceName,
        void 0,
        storageV5,
        marketplaceName,
        void 0,
        S,
      ));
    } catch (error) {
      if (error instanceof Bd) throw error;
      if (
        isAsciiImpersonatingOfficialName(marketplaceName) &&
        !AGn(marketplaceName) &&
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
  return (
    marketplaces.set(marketplaceName, y),
    y
      .catch((S) => {
        if (
          S instanceof PluginDirectoryUnavailableError &&
          pluginDirectoryPolicyBlock() === null &&
          marketplaces.get(marketplaceName) === y
        )
          marketplaces.delete(marketplaceName);
      })
      .catch(() => {}),
    y
  );
}
/**
 * 由插件 ID（name@marketplace）只用缓存找到 marketplace 条目，返回 {entry, marketplaceInstallLocation}。
 */
//@ chunk-e6aww6q8.js:4306122-4307000 fingerprint = getPluginByIdCacheOnly (0.811)
async function getPluginByIdCacheOnly(pluginId, storageV5, r = "load") {
  let { name: pluginName, marketplace: marketplaceName } = parsePluginIdentifier(pluginId);
  if (!pluginName || !marketplaceName || marketplaceName.toLowerCase() === NPM) return null;
  let fs = getFsImplementation(),
    S = isStorageV5Enabled() && storageV5 !== void 0 ? getMarketplacesStorageScope() : null;
  if (storageV5 !== void 0 && S !== null) {
    let read = await storageV5.read([S]);
    if (!read.ok) return null;
    let G = read.value.items[0];
    if (!G?.found) return getPluginByIdFromCacheOrDeclared(storageV5, pluginId, r);
    try {
      let q = jsonParse(Buffer.from(G.value).toString("utf-8")),
        Z = getAdmittedMarketplaceEntry(marketplaceName, q);
      if (!Z) return await getPluginByIdFromCacheOrDeclared(storageV5, pluginId, r);
      let Se = await getMarketplaceCacheOnly(marketplaceName, storageV5);
      if (!Se) return null;
      let found = Se.plugins.find((plugin) => plugin.name === pluginName);
      if (!found) return null;
      return { entry: found, marketplaceInstallLocation: Z.installLocation };
    } catch {
      return null;
    }
  }
  if (isDiskless()) return getPluginByIdFromCacheOrDeclared(storageV5, pluginId, r);
  let configFile = getKnownMarketplacesPath();
  try {
    let content = await fs.readFile(configFile, { encoding: "utf-8" }),
      config = jsonParse(content),
      q = getAdmittedMarketplaceEntry(marketplaceName, config);
    if (!q) return await getPluginByIdFromCacheOrDeclared(storageV5, pluginId, r);
    let marketplace = await getMarketplaceCacheOnly(marketplaceName);
    if (!marketplace) return null;
    let plugin = marketplace.plugins.find((plugin) => plugin.name === pluginName);
    if (!plugin) return null;
    return { entry: plugin, marketplaceInstallLocation: q.installLocation };
  } catch (error) {
    return isENOENT(error) ? getPluginByIdFromCacheOrDeclared(storageV5, pluginId, r) : null;
  }
}
//@ chunk-e6aww6q8.js:4307000-4307675 layout
async function getPluginByIdFromCacheOrDeclared(e, n, r) {
  let { name: s, marketplace: marketplace } = parsePluginIdentifier(n);
  if (!s || !marketplace) return null;
  if (marketplace === OFFICIAL_MARKETPLACE_NAME) return findPluginDirectoryEntry(s, e, r);
  let y = Zb(await readClaudeAiMarketplaceRegistry(), marketplace);
  if (y === void 0) return null;
  let installLocation = toKnownMarketplaceEntry(marketplace, y).installLocation,
    { marketplace: marketplace_2, status: status } = await ensureClaudeAiMarketplace(marketplace, y.source, {
      mode: "cache-only",
      credentials: void 0,
    });
  if (marketplace_2 !== null) {
    let found = marketplace_2.plugins.find((plugin) => plugin.name === s);
    return found === void 0 ? null : { entry: found, marketplaceInstallLocation: installLocation };
  }
  if (status.kind === "gone") return null;
  let q = getInstalledPlugins().plugins[n]?.[0];
  if (q === void 0) return null;
  return {
    entry: {
      name: s,
      source: {
        source: "claudeai",
        pluginId: q.claudeaiPluginId ?? "",
        version: q.version ?? "",
        installable: !1,
      },
      ...(q.version !== void 0 && { version: q.version }),
      strict: !0,
    },
    marketplaceInstallLocation: installLocation,
  };
}
/**
 * 由插件 ID 找 marketplace 条目，必要时联网刷新市场。
 */
//@ chunk-e6aww6q8.js:4307675-4308144 fingerprint = getPluginById (0.765)
async function getPluginById(e, n, r = "other") {
  let s = await getPluginByIdCacheOnly(e, n, r === "install" || r === "update" ? r : "load");
  if (s) return s;
  let { name: pluginName, marketplace: marketplaceName } = parsePluginIdentifier(e);
  if (!pluginName || !marketplaceName || marketplaceName.toLowerCase() === NPM) return null;
  try {
    let marketplace = await loadKnownMarketplacesWithDeclared(n),
      w = Zb(marketplace, marketplaceName);
    if (!w) return null;
    let plugin = (await getMarketplace(marketplaceName, n, r)).plugins.find(
      (plugin) => plugin.name === pluginName,
    );
    if (!plugin) return null;
    return { entry: plugin, marketplaceInstallLocation: w.installLocation };
  } catch (error) {
    if (error instanceof Bd) throw error;
    return (logForDebugging(`Could not find plugin ${e}: ${errorMessage(error)}`, { level: "debug" }), null);
  }
}
/**
 * 确保插件目录市场的目录在本机（必要时 cache-only 加载），返回 not_needed/ok/not_allowed 等。
 */
//@ chunk-e6aww6q8.js:4308144-4308924 layout
async function ensurePluginDirectoryCatalog(e, n = PLUGIN_DIRECTORY_CATALOG_MISSING_ERROR) {
  {
    let r = SC();
    if (
      r === null ||
      !isSourceAllowedByPolicy({ source: "pluginDirectory" }) ||
      r.pluginDirectoryWalkReadiness() === "not_allowed"
    )
      return "not_needed";
    if (
      (
        await r.loadPluginDirectoryMarketplace("cache-only", {
          forInstalledPlugin: !0,
          installRecords: getInstalledPluginsMap,
        })
      ).marketplace !== null
    )
      return "not_needed";
    if (r.pluginDirectoryWalkReadiness() === "backed_off") return "unreachable";
    let abortController = new AbortController(),
      y = await withDeadline(
        refreshMarketplaceDeduped(OFFICIAL_MARKETPLACE_NAME, e, void 0, {
          directoryTrigger: "reload",
          directorySignal: abortController.signal,
        }).then(
          () => !0,
          (S) => (
            logForDebugging(
              `/reload-plugins could not fetch the ${OFFICIAL_MARKETPLACE_DISPLAY}'s catalog: ${errorMessage(S)}`,
              { level: "warn" },
            ),
            !1
          ),
        ),
        n,
      );
    if (y === void 0) return (abortController.abort(), r.notePluginDirectoryWalkTimedOut(), "unreachable");
    if (y) return "fetched";
    return r.pluginDirectoryWalkReadiness() === "backed_off" ? "unreachable" : "unavailable";
  }
  return "not_needed";
}
/**
 * 插件目录 catalog 不在本机时的错误类别名。
 */
//@ chunk-e6aww6q8.js:4308924-4309042 layout
var PLUGIN_DIRECTORY_CATALOG_MISSING_ERROR = cbr,
  PLUGIN_DIRECTORY_CATALOG_MISSING = `the ${OFFICIAL_MARKETPLACE_DISPLAY}'s catalog is not on this machine (it is off, blocked, unavailable, or not downloaded yet)`;
/**
 * 插件目录市场的目录（catalog）不在本机时抛出的错误。
 */
//@ chunk-e6aww6q8.js:4309042-4309159 layout
class PluginDirectoryCatalogMissingError extends Error {
  constructor() {
    super(`Not available: ${PLUGIN_DIRECTORY_CATALOG_MISSING}`);
    this.name = "PluginDirectoryCatalogMissingError";
  }
}
/**
 * 取市场目录；插件目录市场只读缓存，没有缓存时抛 PluginDirectoryCatalogMissingError。
 */
//@ chunk-e6aww6q8.js:4309159-4309264 layout
async function getMarketplaceOrDirectoryCatalog(e, n) {
  if (e === OFFICIAL_MARKETPLACE_NAME) {
    let r = await getMarketplaceCacheOnly(e, n);
    if (r === null) throw new PluginDirectoryCatalogMissingError();
    return r;
  }
  return getMarketplace(e, n);
}
/**
 * 按插件 ID 取 marketplace 条目；插件目录市场只用缓存。
 */
//@ chunk-e6aww6q8.js:4309264-4309332 layout
function getPluginByIdAnySource(e, n, r) {
  return parsePluginIdentifier(e).marketplace === OFFICIAL_MARKETPLACE_NAME
    ? getPluginByIdCacheOnly(e, n, r)
    : getPluginById(e, n);
}
/**
 * 刷新所有市场（跳过种子管理和 settings 内联的市场），逐个调用 refreshMarketplace，汇总失败。
 */
//@ chunk-e6aww6q8.js:4309332-4311978 fingerprint = refreshAllMarketplaces (0.447)
async function refreshAllMarketplaces(e) {
  let n = [],
    r = [],
    s = [],
    h = 0,
    y = await loadKnownMarketplacesWithDeclared(e),
    S = {};
  for (let [w, L] of Object.entries(y)) {
    if (seedDirFor(L.installLocation)) {
      logForDebugging(`Skipping seed-managed marketplace '${w}' in bulk refresh`);
      continue;
    }
    if (L.source.source === "settings") {
      if (Dse(w, L))
        (logForDebugging(
          `Skipping marketplace '${w}' in bulk refresh: the look-alike check refuses the name it is saved under`,
          { level: "warn" },
        ),
          h++,
          r.push(w));
      continue;
    }
    if (X5(L.source)) {
      if (!isSourceAllowedByPolicy(L.source)) continue;
      (h++, getPluginRegistry().marketplaces.delete(w));
      try {
        await refreshClaudeAiMarketplace(w, L.source, { credentials: void 0 });
      } catch (error) {
        (logForDebugging(`Failed to refresh claude.ai marketplace ${w}: ${errorMessage(error)}`, {
          level: "warn",
        }),
          r.push(w));
      }
      continue;
    }
    if (isPluginDirectorySource(L.source)) {
      if (!isSourceAllowedByPolicy(L.source) || pluginDirectoryPolicyBlock() !== null) continue;
      getPluginRegistry().marketplaces.delete(w);
      try {
        (await loadPluginDirectoryMarketplace("refresh", e, { staleIsFailure: !0, trigger: "update" }), h++);
      } catch (error) {
        if (pluginDirectoryPolicyBlock() !== null) continue;
        (logForDebugging(`Failed to refresh the plugin directory marketplace: ${errorMessage(error)}`, {
          level: "warn",
        }),
          s.push(w));
      }
      continue;
    }
    if (!isSourceAllowedByPolicy(L.source)) {
      logForDebugging(`Skipping policy-blocked marketplace '${w}' in bulk refresh`);
      continue;
    }
    h++;
    let G = validateReservedMarketplaceEntry(w, L);
    if (G) {
      (logForDebugging(`Skipping marketplace '${w}' in bulk refresh: ${G}`, { level: "warn" }), r.push(w));
      continue;
    }
    if (Dse(w, L)) {
      (logForDebugging(
        `Skipping marketplace '${w}' in bulk refresh: the look-alike check refuses the name it is saved under`,
        { level: "warn" },
      ),
        r.push(w));
      continue;
    }
    let q = !1;
    if (w === CLAUDE_PLUGINS_OFFICIAL) {
      try {
        await removeMarketplaceCacheDir(w, L.installLocation, e, y);
      } catch (error) {
        (logForDebugging(`Skipping marketplace '${w}' in bulk refresh: ${errorMessage(error)}`, {
          level: "warn",
        }),
          r.push(w));
        continue;
      }
      if (
        (await fetchOfficialMarketplaceFromGcs(L.installLocation, getResolvedMarketplacesCacheDir(), e)) !==
        null
      ) {
        (logFeatureOk("plugin_official_marketplace_fetch"),
          (S[w] = { forSource: L.source, patch: { lastUpdated: new Date().toISOString() } }));
        continue;
      }
      if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_plugin_official_mkt_git_fallback", !0)) {
        (logFeatureBad("plugin_official_marketplace_fetch", "gcs_failed_fallback_disabled"),
          logForDebugging("Skipping official marketplace bulk refresh: GCS failed, git fallback disabled"),
          r.push(w));
        continue;
      }
      q = !0;
    }
    try {
      let { cachePath: cachePath, keptStaleClone: keptStaleClone } = await loadAndCacheMarketplace(
        L.source,
        w,
        void 0,
        e,
        w,
        void 0,
        y,
      );
      if (!keptStaleClone)
        S[w] = {
          forSource: L.source,
          patch: { lastUpdated: new Date().toISOString(), installLocation: cachePath },
        };
      else if (cachePath !== L.installLocation)
        S[w] = { forSource: L.source, patch: { installLocation: cachePath } };
      if (q) logFeatureSad("plugin_official_marketplace_fetch", "gcs_failed_git_fallback");
    } catch (error) {
      if (q) logFeatureBad("plugin_official_marketplace_fetch", "gcs_and_git_failed");
      if (error instanceof Bd) {
        (n.push(w),
          logForDebugging(`Marketplace ${w} not refreshed (managed policy): ${errorMessage(error)}`));
        continue;
      }
      (r.push(w),
        logForDebugging(`Failed to refresh marketplace ${w}: ${errorMessage(error)}`, { level: "error" }));
    }
  }
  return (
    await updateKnownMarketplaces((w) => {
      let L = !1;
      for (let [G, { forSource: q, patch: Z }] of Object.entries(S)) {
        let Se = Zb(w, G);
        if (!Se || !En(Se.source, q) || seedDirFor(Se.installLocation)) continue;
        ((w[G] = { ...Se, ...Z }), (L = !0));
      }
      return L ? w : null;
    }, e),
    { policyRefused: n, failed: r, attempted: h, builtInSkipped: s }
  );
}
/**
 * 刷新一个市场，同名刷新进行中时复用同一个 Promise 并追加进度监听（全局 marketplaceRefreshesInFlight）。
 */
//@ chunk-e6aww6q8.js:4311978-4312224 layout
function refreshMarketplaceDeduped(e, n, r, s) {
  let { marketplaceRefreshesInFlight: marketplaceRefreshesInFlight } = getPluginRegistry(),
    y = marketplaceRefreshesInFlight.get(e);
  if (y) {
    if (r) y.listeners.push(r);
    return y.promise;
  }
  let S = r ? [r] : [],
    L = refreshMarketplace(
      e,
      n,
      (G) => {
        for (let q of S) safeCallProgress(q, G);
      },
      s,
    ).finally(() => marketplaceRefreshesInFlight.delete(e));
  return (marketplaceRefreshesInFlight.set(e, { promise: L, listeners: S }), L);
}
//@ chunk-e6aww6q8.js:4312224-4312980 layout
async function removeMarketplaceCacheDir(e, n, r, s) {
  let h = getResolvedMarketplacesCacheDir(),
    y = resolve_10(getOriginalCwd(), n);
  if (classifyMarketplacePath(n).suspect || comparePathContainment(h, y, h) !== "inside") {
    let w = claudeCommand("plugin marketplace remove", e);
    throw Error(
      `Marketplace '${quotedPrintable(e)}' has a corrupted installLocation (${printableOrEmpty(n)}) \u2014 expected a path inside ${h}. This can happen after cross-platform path writes or manual edits to known_marketplaces.json. ${w ? `Run \`${w}\`` : "Remove the entry"} and re-add it.`,
    );
  }
  let S = await checkMarketplaceDirCollision(h, y, e, r, s);
  if (S !== void 0) {
    let w = claudeCommand("plugin marketplace remove", e);
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Marketplace '${quotedPrintable(e)}' has a corrupted installLocation (${printableOrEmpty(n)}) \u2014 it belongs to the registered marketplace ` +
        `'${quotedPrintable(S)}'. ${w ? `Run \`${w}\`` : "Remove the entry"} and re-add it.`,
      "marketplace installLocation names another registered marketplace directory",
    );
  }
}
/**
 * 刷新一个市场：git pull/重新下载，校验后更新 lastUpdated；后台模式下失败只记日志。
 */
//@ chunk-e6aww6q8.js:4312980-4317754 fingerprint = refreshMarketplace (0.552)
async function refreshMarketplace(marketplaceName, storageV5, onProgress, options) {
  let h = await loadKnownMarketplacesWithDeclared(storageV5),
    y = Zb(h, marketplaceName),
    S = options?.directoryTrigger ?? (options?.isBackground ? "background" : "update");
  if (
    !y &&
    marketplaceName === OFFICIAL_MARKETPLACE_NAME &&
    Eq() &&
    isSourceAllowedByPolicy({ source: "pluginDirectory" })
  ) {
    getPluginRegistry().marketplaces.delete(marketplaceName);
    let G = options?.skipIfRecent ? (await $6?.pluginDirectoryRegistryEntry())?.lastUpdated : void 0,
      q = G ? Date.now() - new Date(G).getTime() : -1;
    if (q >= 0 && q < 30000) {
      logForDebugging(
        `Skipping refresh for marketplace '${marketplaceName}' \u2014 refreshed ${Math.round(q / 1000)}s ago`,
      );
      return;
    }
    await loadPluginDirectoryMarketplace(options?.isBackground ? "if-stale" : "refresh", void 0, {
      staleIsFailure: !0,
      trigger: S,
      signal: options?.directorySignal,
    });
    return;
  }
  if (!y)
    throw withMarketplaceFailureCode(
      Error(
        `Marketplace '${marketplaceName}' not found. Available marketplaces: ${Object.keys(h).join(", ")}`,
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
  if (
    (assertReservedNameTrusted(marketplaceName, y),
    getPluginRegistry().marketplaces.delete(marketplaceName),
    options?.skipIfRecent && y.lastUpdated)
  ) {
    let G = Date.now() - new Date(y.lastUpdated).getTime();
    if (G >= 0 && G < 30000) {
      logForDebugging(
        `Skipping refresh for marketplace '${marketplaceName}' \u2014 refreshed ${Math.round(G / 1000)}s ago`,
      );
      return;
    }
  }
  if (X5(y.source)) {
    (safeCallProgress(onProgress, "Refreshing plugin list from claude.ai"),
      await refreshClaudeAiMarketplace(marketplaceName, y.source, {
        credentials: void 0,
        skipIfRecent: options?.skipIfRecent,
        isBackground: options?.isBackground,
      }));
    return;
  }
  if (isPluginDirectorySource(y.source)) {
    (safeCallProgress(onProgress, `Refreshing ${OFFICIAL_MARKETPLACE_DISPLAY}`),
      await loadPluginDirectoryMarketplace(options?.isBackground ? "if-stale" : "refresh", void 0, {
        staleIsFailure: !0,
        trigger: S,
        signal: options?.directorySignal,
      }));
    return;
  }
  if (y.source.source === "settings") {
    (assertNotLookAlikeName(marketplaceName, y),
      logForDebugging(
        `Skipping refresh for settings-sourced marketplace '${marketplaceName}' \u2014 no upstream`,
      ));
    return;
  }
  if (isDiskless()) throwDisklessMarketplaceFetch(join_29("plugins", "marketplaces"));
  let w = !1,
    L;
  try {
    let { installLocation: installLocation, source: source } = y,
      seedDir = seedDirFor(installLocation);
    if (seedDir)
      throw withMarketplaceFailureCode(
        Error(
          `Marketplace '${marketplaceName}' is seed-managed (${seedDir}) and its content is controlled by the seed image. To update: ask your admin to update the seed.`,
        ),
        "managed",
      );
    if (!isLocalMarketplaceSource(source))
      await removeMarketplaceCacheDir(marketplaceName, installLocation, storageV5, h);
    if ((assertNotLookAlikeName(marketplaceName, y), marketplaceName === CLAUDE_PLUGINS_OFFICIAL)) {
      if (
        (await fetchOfficialMarketplaceFromGcs(
          installLocation,
          getResolvedMarketplacesCacheDir(),
          storageV5,
        )) !== null
      ) {
        (logFeatureOk("plugin_official_marketplace_fetch"),
          await touchMarketplaceLastUpdated(marketplaceName, storageV5));
        return;
      }
      if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_plugin_official_mkt_git_fallback", !0))
        throw (
          logFeatureBad("plugin_official_marketplace_fetch", "gcs_failed_fallback_disabled"),
          Error("Official marketplace GCS fetch failed and git fallback is disabled")
        );
      ((w = !0), logForDebugging("Official marketplace GCS failed; falling back to git", { level: "warn" }));
    }
    if (source.source === "github" || source.source === "git") {
      if (source.source === "github") {
        let sshUrl = `git@${GITHUB_HOST}:${source.repo}.git`,
          httpsUrl = `https://github.com/${source.repo}.git`;
        if (NMt())
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
              { level: "info" },
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
                { ...we, error: toError(error) },
                { ...Ee, error: toError(error_2) },
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
          isStorageV5Enabled() && storageV5 !== void 0
            ? getMarketplaceStorageLocation(marketplaceName, source, installLocation)
            : null,
        );
      } catch (error) {
        let ke = source.source === "github" ? source.repo : redactUrlsTracked(source.url),
          we =
            marketplaceName === "claude-code-plugins"
              ? `We've deprecated "claude-code-plugins" in favor of "claude-plugins-official".`
              : "This marketplace may have been deprecated or moved to a new location.",
          Ee = claudeCommand("plugin marketplace remove", marketplaceName),
          Ae = error instanceof ConfigParseError;
        throw withMarketplaceFailureCode(
          Error(
            `The marketplace.json file is no longer present in this repository.

${we}
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
              : void 0,
        );
      }
    } else if (source.source === "url") {
      let Se = await describeHelperDeclaration(source, {
          marketplaceName: marketplaceName,
          trustedDeclaration: findUrlMarketplaceHeaders(source, marketplaceName),
        }),
        ke =
          isStorageV5Enabled() && storageV5 !== void 0
            ? getSyntheticMarketplaceStorageKey(marketplaceName, source, installLocation)
            : null;
      if (storageV5 !== void 0 && ke !== null)
        await cacheMarketplaceFromUrlToStorage(storageV5, ke, source.url, marketplaceName, Se, onProgress);
      else await cacheMarketplaceFromUrlToFile(source.url, installLocation, marketplaceName, Se, onProgress);
    } else if (isLocalMarketplaceSource(source))
      (safeCallProgress(onProgress, "Validating local marketplace"),
        await readMarketplaceManifest(
          installLocation,
          marketplaceName,
          storageV5,
          isStorageV5Enabled() && storageV5 !== void 0 ? { kind: "hostFolder", space: "workspace" } : null,
        ).catch((Se) => {
          throw withMarketplaceFailureCode(
            Se,
            isENOENT(Se) || getErrnoCode(Se) === "EISDIR"
              ? "manifest_missing"
              : Se instanceof ConfigParseError
                ? "manifest_invalid"
                : void 0,
          );
        }));
    else throw Error("Unsupported marketplace source type for refresh");
    if (L?.kind !== "kept-stale") await touchMarketplaceLastUpdated(marketplaceName, storageV5);
    if (w) logFeatureSad("plugin_official_marketplace_fetch", "gcs_failed_git_fallback");
    logForDebugging(`Successfully refreshed marketplace: ${marketplaceName}`);
  } catch (error) {
    if (w) logFeatureBad("plugin_official_marketplace_fetch", "gcs_and_git_failed");
    let q = error instanceof Error ? error.message : String(error);
    if (
      (logForDebugging(`Failed to refresh marketplace ${marketplaceName}: ${q}`, { level: "error" }),
      error instanceof Bd)
    )
      throw error;
    if (q === RESERVED_MARKETPLACE_NAME_MESSAGE) throw error;
    throw withMarketplaceFailureCode(
      Error(`Failed to refresh marketplace '${marketplaceName}': ${q}`),
      getMarketplaceFailureCode(error),
    );
  }
}
/**
 * 设置某市场的 autoUpdate（写 known_marketplaces.json），市场不存在时报可用列表。
 */
//@ chunk-e6aww6q8.js:4317754-4318944 fingerprint = setMarketplaceAutoUpdate (0.513)
async function setMarketplaceAutoUpdate(e, n, r) {
  let s = await loadKnownMarketplacesWithDeclared(r),
    h = Zb(s, e);
  if (!h) throw Error(`Marketplace '${e}' not found. Available marketplaces: ${Object.keys(s).join(", ")}`);
  let y = seedDirFor(h.installLocation);
  if (y)
    throw Error(
      `Marketplace '${e}' is seed-managed (${y}) and auto-update is always disabled for seed content. To update: ask your admin to update the seed.`,
    );
  let seedDir = findAutoUpdateOverrideSource(e);
  if (seedDir !== null)
    throw Error(
      `Auto-update for '${e}' is set by ${seedDir} and can't be changed here. Update that settings source (or ask your admin to) instead.`,
    );
  if (h.autoUpdate === n) return;
  if (X5(h.source)) {
    (await setMarketplaceAutoUpdateFlag(e, n), logForDebugging(`Set autoUpdate=${n} for marketplace: ${e}`));
    return;
  }
  if (isPluginDirectorySource(h.source))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Auto-update can't be turned off for ${OFFICIAL_MARKETPLACE_DISPLAY}: its plugins follow the commit the Directory lists`,
      "plugin directory marketplace auto-update toggle refused",
    );
  await updateKnownMarketplaces((L) => {
    let G = Zb(L, e);
    if (!G || G.autoUpdate === n || seedDirFor(G.installLocation)) return null;
    return ((L[e] = { ...G, autoUpdate: n }), L);
  }, r);
  let declaringSource = supportsPersistence(e);
  if (declaringSource) {
    let L = removeExtraMarketplace(getSettingsForSourceWriteSeed(declaringSource), e);
    if (L) {
      let { error: error } = await saveMarketplaceToSettings(
        e,
        { source: L.source, autoUpdate: n },
        declaringSource,
        r,
      );
      if (error)
        logForDebugging(
          `Failed to persist autoUpdate=${n} for marketplace ${e} to ${declaringSource}: ${error.message}`,
          { level: "error" },
        );
    }
  }
  logForDebugging(`Set autoUpdate=${n} for marketplace: ${e}`);
}
/**
 * 把设置中声明的市场 autoUpdate 同步到 known_marketplaces.json。
 */
//@ chunk-e6aww6q8.js:4318944-4319493 placement
async function syncDeclaredAutoUpdateToJson(e) {
  let n = getDeclaredMarketplaces();
  if (Object.keys(n).length === 0) return !1;
  try {
    return await updateKnownMarketplaces((r) => {
      let s = !1;
      for (let [h, y] of Object.entries(n)) {
        if (y.autoUpdate === void 0) continue;
        let S = Zb(r, h);
        if (!S || seedDirFor(S.installLocation)) continue;
        if (isPluginDirectorySource(S.source)) continue;
        if (S.autoUpdate === y.autoUpdate) continue;
        ((r[h] = { ...S, autoUpdate: y.autoUpdate }),
          (s = !0),
          logForDebugging(`Synced autoUpdate=${y.autoUpdate} from settings for marketplace: ${h}`));
      }
      return s ? r : null;
    }, e);
  } catch (error) {
    return (
      logForDebugging(
        `syncDeclaredAutoUpdateToJson: failed to update known_marketplaces.json: ${errorMessage(error)}`,
        { level: "error" },
      ),
      !1
    );
  }
}
/**
 * 插件目录市场状态：on/off/blocked/unavailable。
 */
//@ chunk-e6aww6q8.js:4319493-4319643 placement
async function getPluginDirectoryState() {
  let e = SC();
  if (!e) return QE() && pluginDirectoryPolicyBlock() !== null ? "blocked" : "unavailable";
  return (await e.isPluginDirectoryMarketplaceEnabled()) ? "on" : "off";
}
/**
 * 打开/关闭插件目录市场，不可用或被策略阻止时抛错。
 */
//@ chunk-e6aww6q8.js:4319643-4320055 placement
async function setPluginDirectoryEnabled(e) {
  {
    let n = SC();
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
    (await n.setPluginDirectoryMarketplaceEnabled(e),
      getPluginRegistry().marketplaces.delete(OFFICIAL_MARKETPLACE_NAME));
    return;
  }
  throw Error("Not available in this build");
}
/**
 * 当前值来自默认时把开关保存为用户的选择。
 */
//@ chunk-e6aww6q8.js:4320055-4320361 placement
async function persistPluginDirectoryChoice(e) {
  {
    let n = SC();
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
        { level: "warn" },
      );
    }
  }
}
//@ chunk-e6aww6q8.js:4320361-4320575 placement
function findEnablingSettingSource(e, n) {
  let r = _Br(e),
    s = uniq(r.flatMap(({ record: record }) => AIe(record, e, n)));
  for (let h of s) {
    let found = r.find(({ record: record }) => record?.[h] !== void 0),
      S = found?.record?.[h];
    if (found !== void 0 && (S === !0 || Array.isArray(S))) return found.source;
  }
  return;
}
//@ chunk-e6aww6q8.js:4320575-4320613 placement
function AIe(e, n, r) {
  return enabledPluginKeys(e, n, r);
}
//@ chunk-e6aww6q8.js:4320613-4320708 placement
function Jhs(e, n, r) {
  let s = AIe(e, n, r);
  return s.some((h) => e?.[h] === !1) && !s.some((h) => mO(e?.[h]));
}
/**
 * URL 去掉用户名口令后返回（用于显示与日志）。
 */
//@ chunk-dcmhvw5a.js:376366-376544 fingerprint = redactUrlCredentials (0.842)
function redactUrlCredentials(urlString) {
  if (urlString === void 0) return;
  let n = stripInvisibleChars(urlString, "");
  try {
    let { protocol: protocol, username: username, password: password } = new URL(n);
    return (protocol === "https:" || protocol === "http:") && username === "" && password === "" ? n : void 0;
  } catch {
    return;
  }
}
/**
 * 确定 git pull 用的 remote（分支配置的 remote，缺省 origin）。
 */
//@ chunk-s61vbvea.js:532138-532376 callgraph-fingerprint = gitPull (0.191)
async function gitPull(e, n, r, s) {
  if (e.hasDir(n)) return "origin";
  if (r !== void 0 && r !== "HEAD") {
    let fetchResult = await execGitNoThrow(n, ["config", "--get", `branch.${r}.remote`], s);
    if (fetchResult !== void 0) return fetchResult;
  }
  return (await execGitNoThrow(n, ["config", "--get", "remote.pushDefault"], s)) ?? "origin";
}
//@ chunk-sycgf9xs.js:7815-7888 fingerprint = GIT_NO_PROMPT_ENV (0.627)
var GIT_NO_PROMPT_ENV = { GIT_TERMINAL_PROMPT: "0", GIT_ASKPASS: "", GCM_INTERACTIVE: "never" };

export {
  loadKnownMarketplacesWithDeclared,
  getDeclaredMarketplaces,
  Eq,
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
  Dse,
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
  ugn,
  LGn,
  pluginDirectoryNotInstallableReason,
  lEt,
  redactUrlCredentials,
  removeMarketplaceWithReservedSiblings,
  GIT_NO_PROMPT_ENV,
  setPluginDirectoryEnabled,
  persistPluginDirectoryChoice,
  saveMarketplaceToSettings,
  findMarketplaceBySourceLoose,
  refreshAllMarketplaces,
  PLUGIN_DIRECTORY_CATALOG_MISSING,
  PluginDirectoryCatalogMissingError,
  ozt,
  HWo,
  syncDeclaredAutoUpdateToJson,
  isGitHubSshLikelyConfigured,
  reconcileSparseCheckout,
  getCachePathForSource,
  getStorageArm,
  FIe,
  normalizeInstallLocation,
  collectOrgBlockedPlugins,
  isListingBlocked,
  zIe,
  DGn,
  IGn,
  ensurePluginDirectoryCatalog,
  registerSeedMarketplaces,
  findSeedMarketplaceLocation,
  gitPull,
  findMarketplaceBySource,
  setMarketplaceAutoUpdate,
};
