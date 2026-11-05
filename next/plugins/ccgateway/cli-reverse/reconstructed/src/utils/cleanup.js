/**
 * utils/cleanup.ts
 *
 * 并入旧版已有路径：清理（转录保留期清理）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/cleanup.ts
 * pieces: chunk-2zeqrfs5.js (1), chunk-3328vqg0.js (3), chunk-pc3x100t.js (112)
 * attribution: fingerprint 8, placement 35, facade-majority 8, layout 54, file-local 1, callgraph-witnessed 2, affinity 7, sole-consumer 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join, dirname, basename } from "path";
import * as fsPromisesModule from "fs/promises";
import { lstat, readdir, unlink, rmdir } from "fs/promises";
import { homedir, tmpdir as tmpdir_2 } from "os";
import { getFsImplementation } from "./fsOperations.js";
import {
  claudeTempDir,
  projectTempDirNames,
  PDF_SCRATCH_DIR_PREFIX,
  PREVIEW_COPY_DIR_PREFIX,
  tmpdir,
} from "./tempDir.js";
import { getSessionId, isDiskless } from "../bootstrap/state.js";
import { normalizeUuidOrNull } from "./agentId.js";
import { isFsInaccessible, getErrnoCode, isEnvFsErrno, isENOENT, errorMessage } from "./errors.js";
import { pinWriteTarget } from "./fsSafety/pathRevalidation.js";
import { isOwnTempName, filePath, isTempFileName } from "./atomicPublishWrite.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { objectSchema, stringSchema, numberSchema } from "../../vendor/zod/v4/classic/schemas.js";
import { createJsonStore } from "./jsonStore.js";
import { REREAD_INITIAL_DELAY_MS } from "./plugins/hooksModulesRollout.js";
import { getPluginRegistry } from "./plugins/pluginLoadState.js";
import { queueHookedSettingsMerge } from "./plugins/loadPluginHooks.js";
import { sleep } from "./sleep.js";
import { logForDebugging } from "./debug.js";
import {
  AUTO_MODE_DUMP_FILES,
  AUTO_MODE_DUMP,
  AUTO_MODE_ENV_EDIT,
  AUTO_MODE_BUILTINS,
} from "./teleport/autoModeDumps.js";
import {
  storageNameSpellings,
  isValidKeySegment,
  bridgeSpawnScope,
  isTempFileName as isTempFileName_2,
  STORAGE_SPACES,
} from "./storage/storageSpaces.js";
import {
  isNameableSessionId,
  ARCHIVE_SYNC,
  FOLDER_SYNC,
  STEPS_UNDER_WAY_DIR,
  SIDE_GIT,
  CLOUD_SNAPSHOTS_DIR,
  recordingStampOfStreamName,
} from "./storage/storageKeys.js";
import { isSettingSourceEnabled } from "./settings/constants.js";
import {
  getSettings_DEPRECATED,
  getSettingsForSource,
  rawSettingsKeyPresence,
  getSettingsForSourceTightenOnly,
  getSecuritySensitiveSetting,
  anyAdminPolicyTierGovernsRetention,
  getPolicySettingsLoadErrors,
} from "./settings/settings.js";
import { formatInvalidSettingNotice } from "./settings/settingsNotices.js";
import {
  RETENTION_POLICY_KEYS,
  PARENT_MANAGED_SETTINGS_SOURCE_LABEL,
} from "./settings/managedFileSettings.js";
import {
  hostSessionSkipsSharedCache,
  holdsNoServedSettings,
} from "../services/remoteManagedSettings/remoteSettingsCache.js";
import { getEligibilityMemo } from "../services/remoteManagedSettings/remoteSettingsState.js";
import {
  CEL_MAX_ITEMS,
  bridgeSpawnDir,
  BRIDGE_SPAWN,
  CEL_MAX_PATTERN_LENGTH,
  CEL_MAX_PATTERNS,
  HOST_FUNCTION_CATEGORIES,
} from "./sandbox/celHostFunctions.js";
import { jsonParse, jsonParseRaw } from "./slowOperations.js";
import { hasComplianceTaint } from "../services/policyLimits/complianceTaints.js";
import { firstLineOf } from "./stringUtils.js";
import { logError } from "./log.js";
import { CACHE_PATHS } from "./cachePaths.js";
import { scanDirectoryForPaths } from "./suggestions/directoryCompletion.js";
import { getProjectsDir } from "./sessionStorage.js";
import {
  LITE_READ_BUF_SIZE,
  readHeadAndTail,
  anchorOffsetTail,
  extractFieldFromFirstEntryStrict,
  extractFieldFromLastEntryStrict,
} from "./sessionStoragePortable.js";
import { isHostEntrypointName } from "./entrypointKinds.js";
import { TOOL_RESULTS_SUBDIR } from "./toolResultStorage.js";
import { getClaudeConfigDir } from "./markdownConfigLoader.js";
import { accessMemoryPath, providerProbeVerdictsPath } from "./model/thirdPartyModelAccess.js";
import { modelCatalogCacheDir, MASKED_IDS_JSON_2 } from "./model/modelCatalog/maskedIds.js";
import { PUBLISHED_FLOOR_JSON } from "./model/modelCatalog/publishedCatalogFloor.js";
import { getClaudeConfigDirOrNull, getTeamsDir } from "./envUtils.js";
import { isProcessRunning } from "./genericProcessUtils.js";
import { pruneReviewEntriesBefore } from "./settings/settingsReview.js";
import { isHashTempFile } from "../services/memorySync/syncFiles.js";
import { REMOTE_SETTINGS_CONSENT_FILE } from "../services/remoteManagedSettings/consentRecords.js";
import { mapped, checkCacheFilePermissions } from "./settings/policyCertificates.js";
import { openHistoryFile, HistoryFileError, HISTORY_FILE_RETRY_OPTIONS } from "./historyFile.js";
import { lock, releaseLockQuietly } from "./lockfile.js";
import { resetPlanFileCacheToUnknown } from "./plans.js";
import { verifySyncRoot, readSyncMarker, moveRootToTrashOk } from "./claudeAiSync/syncOwnedRoot.js";
import { skillWatchStateByHost } from "../skills/skillChangeWatch.js";
import { scanAllSessions } from "../commands/insights.js";
import {
  getBashEditDiffDir,
  statOwnedPrivateDir,
  BASH_EDIT_DIFF,
  getFileIdentity,
} from "./sandbox/userTempRoot.js";
import { sweepSeedAdmin } from "./git/builderGit/seedAdmin.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { peerTransferSpoolDir } from "./peerFileReceive.js";
import { PEER_TRANSFER_VERSION } from "./peerFileTransfer.js";
import {
  SKILLS_TRASH_DIR,
  SKILLS_STAGING_DIR,
  SKILLS_SYNC_DIR_2,
  isSyncBucketName,
  TRASH_SUBDIR,
  SKILLS_SYNC_DIR,
  PLUGINS_SYNC_DIR,
  getSyncBucket,
  getStoredAccountBucket,
  SYNCED_MANIFEST_FILE,
  SKILLS_SYNCED_STAGING,
  PLUGINS_STAGING_DIR,
} from "./plugins/syncedItems.js";
import { queueSyncTrashTrim } from "./plugins/syncTrash.js";
import { removeSyncedSkillDir } from "./claudeAiSync/skillsSync.js";
import {
  getPluginsDirectory,
  isSetAsideFileName,
  isUnreadableKeptFileName,
} from "./plugins/pluginDirectories.js";
import { cacheBreakStatePrefix } from "../services/api/promptCacheBreakDetection.js";
import { readPinnedJobIds, readJobStateFreshOrNull, isSettled } from "../services/daemon/jobState.js";
import { isSameProcessAsync } from "./processIdentity.js";
import { reapJobWorktreeIfSafe, cleanupStaleAgentWorktrees } from "./worktree.js";
import { sweepJobDrafts } from "../daemon/jobs/draftSweep.js";
import { renewGlobalConfigBackup } from "./config.js";
import { nonRegularErrorSet } from "../services/memorySync/pathScrub.js";
import { lit, fromEnum } from "../services/analytics/safeMetadata.js";
import { logEvent } from "../services/analytics/index.js";
import { formatStorageError } from "./storage/storageErrors.js";
import { getMemoryBaseDir, getAutoMemPath } from "../memdir/paths.js";
import { findModifiedFiles } from "./filePersistence/outputsScanner.js";
import { cleanupOldImageCaches } from "./imageStore.js";
import { logRetentionSweep } from "./telemetry/thirdPartyEventRecords.js";
import { getSessionEnvDirPath } from "./sessionEnvironment.js";
import { getDumpPromptsPath } from "../services/api/dumpPrompts.js";
import { cleanupOldPastes } from "./pasteStore.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-3328vqg0.js:557-596 placement
/**
 * 匹配 “数字.扩展名” 的图片文件名。
 */
var IMAGES = "images";
var IMAGE_FILE_NAME_RE = /^(\d+)\.[a-z]+$/;
//@ chunk-3328vqg0.js:596-1076 placement
/**
 * 遍历临时目录中各项目下的会话目录（跳过当前会话），删除早于截止时间的 images 子目录，统计删除数与错误数。
 */
async function cleanupSessionImageDirs(cutoffDate, tempDir) {
  let result = {
    removed: 0,
    errors: 0,
  };
  let fsImplementation = getFsImplementation();
  let realTempDir;
  let topEntries;
  try {
    realTempDir = await fsImplementation.realpath(tempDir ?? claudeTempDir());
    topEntries = await fsImplementation.readdir(realTempDir);
  } catch {
    return result;
  }
  let sessionId = getSessionId();
  for (let topEntry of topEntries) {
    if (!topEntry.isDirectory()) continue;
    let scopeDir = join(realTempDir, topEntry.name);
    let sessionEntries;
    try {
      sessionEntries = await fsImplementation.readdir(scopeDir);
    } catch {
      continue;
    }
    for (let sessionEntry of sessionEntries) {
      if (
        !sessionEntry.isDirectory() ||
        sessionEntry.name === sessionId ||
        normalizeUuidOrNull(sessionEntry.name) === null
      )
        continue;
      let imagesDir = join(scopeDir, sessionEntry.name, IMAGES);
      try {
        let stats = await fsImplementation.lstat(imagesDir);
        if (!stats.isDirectory() || stats.mtime >= cutoffDate) continue;
        if (await removeStaleImagesDir(imagesDir, cutoffDate)) result.removed++;
      } catch (error) {
        if (!isFsInaccessible(error)) result.errors++;
      }
    }
  }
  return result;
}
//@ chunk-3328vqg0.js:1076-1698 placement
/**
 * 删除过期的 images 子目录（变新则中止）。
 */
async function removeStaleImagesDir(imagesDir, cutoffDate) {
  let dirPin = await pinWriteTarget(imagesDir, [imagesDir], {
    leaf: "replace",
  });
  try {
    await dirPin.recheckBeforeWrite();
    let dirStats = await lstat(dirPin.ioPath);
    if (!dirStats.isDirectory() || dirStats.mtime >= cutoffDate) return false;
    let anySubdir = join(imagesDir, "any");
    let anyPin = await pinWriteTarget(anySubdir, [anySubdir], {
      leaf: "replace",
    });
    try {
      let parentDir = dirname(anyPin.ioPath);
      await anyPin.recheckBeforeWrite();
      for (let fileName of await readdir(parentDir)) {
        let index = fileName.lastIndexOf(".tmp.");
        let baseName = index === -1 ? fileName : fileName.slice(0, index);
        if (!IMAGE_FILE_NAME_RE.test(baseName) || (index !== -1 && !isOwnTempName(fileName, baseName)))
          continue;
        await anyPin.recheckBeforeWrite();
        await unlink(join(parentDir, fileName)).catch(() => {});
      }
    } finally {
      await anyPin.close();
    }
    await dirPin.recheckBeforeWrite();
    try {
      await rmdir(dirPin.ioPath);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ENOTEMPTY" || errnoCode === "EEXIST") return false;
      throw error;
    }
    return true;
  } finally {
    await dirPin.close();
  }
}
//@ chunk-pc3x100t.js:2490-2533 placement
var MCP_SKILL_ARCHIVES = "mcp-skill-archives";
var META_JSON = "meta.json";
//@ chunk-pc3x100t.js:2533-2598 placement
/**
 * 资源元数据（uri、cacheKey、fetchedAt）的 schema。
 */
var assetMetaSchema; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-pc3x100t.js:2533", () => {
  assetMetaSchema = DoctorLazy(() =>
    objectSchema({
      uri: stringSchema().optional(),
      cacheKey: stringSchema(),
      fetchedAt: numberSchema(),
    }),
  );
});
//@ chunk-pc3x100t.js:2598-2687 placement
/**
 * 某目录下的资源元数据 JSON 存储。
 */
function assetMetaStore(dirPath) {
  return createJsonStore(join(dirPath, META_JSON), () => assetMetaSchema().nullable(), {
    defaultValue: null,
    ensureDir: true,
  });
}
//@ chunk-pc3x100t.js:2687-2719 placement
/**
 * 内容哈希的十六进制长度（64）。
 */
var HASH_HEX_CHARS = 64;
var HASH_PREFIX_CHARS = 16;
var CONTENT_ADDRESSED_NAME_CHARS = HASH_HEX_CHARS + 2 + HASH_HEX_CHARS + 2 + HASH_PREFIX_CHARS;
//@ chunk-pc3x100t.js:2719-2789 placement
/**
 * 读取资源元数据，失败返回 null。
 */
async function readAssetMetaOrNull(dirPath) {
  try {
    return await assetMetaStore(dirPath).read();
  } catch {
    return null;
  }
}
//@ chunk-pc3x100t.js:3157-3218 placement
var cacheIndexEntrySchema; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-pc3x100t.js:3157", () => {
  cacheIndexEntrySchema = DoctorLazy(() =>
    objectSchema({
      key: stringSchema(),
      integrity: stringSchema().nullable(),
      time: numberSchema(),
    }),
  );
});
//@ chunk-pc3x100t.js:3218-4003 placement
async function startRetentionSweep(initialDelayMs = REREAD_INITIAL_DELAY_MS) {
  let pluginRegistry = getPluginRegistry();
  let hookWait = {
    end: () => {},
  };
  let abortController = new AbortController();
  if (
    await Promise.race([
      Promise.resolve(pluginRegistry.hooksLoadAtStartup)
        .catch(() => {})
        .then(() => pluginRegistry.hookRegistrationInFlight?.catch(() => {}))
        .then(async () => {
          while (pluginRegistry.hookRegistrationOwed && !abortController.signal.aborted) {
            await new Promise((resolve) => {
              hookWait.end = pluginRegistry.hookRegistrationEnded.subscribe(resolve);
            });
            hookWait.end();
          }
          if (abortController.signal.aborted) return false;
          await queueHookedSettingsMerge("a retention sweep starts");
          return true;
        }),
      sleep(initialDelayMs, abortController.signal).then(() => false),
    ]).finally(() => abortController.abort())
  )
    return pluginRegistry.hooksUnknownCause === undefined ? "asked" : "load_failed";
  hookWait.end();
  let waitState = pluginRegistry.hookRegistrationInFlight !== undefined ? "load_running" : "unanswered";
  let waitReason = pluginRegistry.hookRegistrationOwed ? "load_owed" : waitState;
  logForDebugging(
    `Retention cleanup: the settings.read hooks were not asked within ${initialDelayMs} ms (${waitReason}); the sweep begins on the merge as last held.`,
  );
  return waitReason;
}
//@ chunk-pc3x100t.js:4003-4093 placement
/**
 * 桌面会话清理的默认天数（0 表示不清理）。
 */
var DEFAULT_DESKTOP_CLEANUP_DAYS = 0;
var DESKTOP_SIDE_FILES = [
  "ccr-tip.json",
  "custom-title.json",
  "precompact.json",
  "sent-prefix.json",
  AUTO_MODE_DUMP_FILES,
];
//@ chunk-pc3x100t.js:4093-4180 placement
/**
 * 判断文件名是否为规范的会话名（单拼写且小写）。
 */
function isCanonicalSessionName(name) {
  let spellings = storageNameSpellings(name);
  return (
    isValidKeySegment(name) &&
    spellings.length === 1 &&
    spellings[0] === name.toLowerCase() &&
    isNameableSessionId(name)
  );
}
//@ chunk-pc3x100t.js:4180-4337 placement
function isAutoModeStateFile(name) {
  return (
    DESKTOP_SIDE_FILES.some((sideFile) => name === sideFile || isOwnTempName(name, sideFile)) ||
    (name.startsWith(AUTO_MODE_DUMP) && (name.endsWith(".json") || name.includes(".json.tmp."))) ||
    (name.startsWith(AUTO_MODE_ENV_EDIT) && name.endsWith(".md"))
  );
}
//@ chunk-pc3x100t.js:4337-5686 facade-majority
async function retentionCleanupSkipReason(settingsState) {
  if (isDiskless()) return "diskless";
  if (!isSettingSourceEnabled("userSettings") && getSettings_DEPRECATED()?.cleanupPeriodDays === undefined) {
    logForDebugging(
      "Skipping retention cleanup: userSettings source is disabled (--setting-sources) and no enabled source provides cleanupPeriodDays.",
    );
    return "user_source_disabled";
  }
  if (getSettingsForSource("policySettings")?.cleanupPeriodDays !== undefined) return null;
  if (
    formatInvalidSettingNotice().errors.filter(
      (error) => !error.mcpErrorMetadata && error.severity !== "warning",
    ).length > 0
  )
    for (let policyKey of RETENTION_POLICY_KEYS) {
      let presence = await rawSettingsKeyPresence(
        policyKey,
        settingsState,
        policyKey === "desktopSessionCleanupPeriodDays"
          ? {
              presenceSources: ["userSettings", "flagSettings"],
            }
          : undefined,
      );
      if (presence === "unknowable") {
        logForDebugging(
          `Skipping cleanup: a settings file could not be read or parsed, so ${policyKey} may be set to a value that cannot be seen. Fix the settings file (see /doctor) to re-enable cleanup.`,
        );
        return "settings_unknowable";
      }
      if (presence === "present") {
        logForDebugging(
          `Skipping cleanup: settings have validation errors but ${policyKey} was explicitly set. Fix settings errors to enable cleanup.`,
        );
        return "settings_invalid_key_set";
      }
    }
  if (hostSessionSkipsSharedCache() && holdsNoServedSettings(getEligibilityMemo() === true)) {
    logForDebugging(
      "Skipping retention cleanup: this session reads no stored server-managed settings and holds none of its own (its request failed, has not finished, or returned nothing that could be applied), so cleanupPeriodDays may be set to a value that cannot be seen. A later process that is not paused for this reason runs the cleanup.",
    );
    return "remote_settings_unknowable";
  }
  return null;
}
//@ chunk-pc3x100t.js:5686-5749 facade-majority
async function isRetentionCleanupSafe(settingsState, initialDelayMs) {
  await startRetentionSweep(initialDelayMs);
  return (await retentionCleanupSkipReason(settingsState)) === null;
}
//@ chunk-pc3x100t.js:5749-5847 layout
/**
 * 由天数算出清理截止日期（非法日期返回 null）。
 */
function cutoffDateFromDays(days) {
  let date = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return Number.isNaN(date.getTime()) ? null : date;
}
//@ chunk-pc3x100t.js:5847-5959 facade-majority (2.1.88 match: getCutoffDate, 1)
/**
 * 计算清理截止日期；cleanupPeriodDays=0 时返回 null（不清理）。
 */
function getCutoffDate(requestedDays) {
  let cleanupPeriodDays = (getSettings_DEPRECATED() || {}).cleanupPeriodDays ?? CEL_MAX_ITEMS;
  if (cleanupPeriodDays === 0) return null;
  if (requestedDays !== undefined && requestedDays < cleanupPeriodDays) cleanupPeriodDays = requestedDays;
  return cutoffDateFromDays(cleanupPeriodDays);
}
//@ chunk-pc3x100t.js:5959-5998 placement
/**
 * 桌面会话“已释放”标记文件的后缀。
 */
var DESKTOP_RELEASED_SUFFIX = ".desktop-released.json";
var MAX_RELEASE_STATE_BYTES = 4096;
//@ chunk-pc3x100t.js:5998-6036 placement
/**
 * 由会话文件路径推出其释放状态文件路径。
 */
function releasedStatePath(transcriptPath) {
  return transcriptPath.slice(0, -6) + DESKTOP_RELEASED_SUFFIX;
}
//@ chunk-pc3x100t.js:6036-6077 placement
/**
 * 释放状态文件的 schema。
 */
var releaseStateSchema; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-pc3x100t.js:6036", () => {
  releaseStateSchema = DoctorLazy(() =>
    objectSchema({
      reason: stringSchema().optional(),
    }),
  );
});
//@ chunk-pc3x100t.js:6077-6372 placement
async function getDumpReleaseState(statePath, fsImplementation, cutoffDate) {
  let fileFdGated = await fsImplementation.readFileFdGated(statePath, MAX_RELEASE_STATE_BYTES);
  if (fileFdGated === null) return "none";
  let releaseReason;
  try {
    let parseResult = releaseStateSchema().safeParse(jsonParse(fileFdGated.content));
    releaseReason = parseResult.success ? parseResult.data.reason : undefined;
  } catch {
    return "none";
  }
  if (releaseReason === "delete") return "release-now";
  if (releaseReason === "archive") return fileFdGated.stats.mtime < cutoffDate ? "release-now" : "grace";
  return "none";
}
//@ chunk-pc3x100t.js:6372-6425 placement
/**
 * 判断释放状态对应的会话 id 是否合法。
 */
function isValidReleaseSessionId(sessionId) {
  return /^[0-9A-Za-z_-]{1,64}$/.test(sessionId);
}
//@ chunk-pc3x100t.js:6425-6487 layout
/**
 * 取桌面会话清理的截止日期。
 */
function desktopCleanupCutoff() {
  return getRetentionCutoff("desktopSessionCleanupPeriodDays", DEFAULT_DESKTOP_CLEANUP_DAYS);
}
//@ chunk-pc3x100t.js:6487-6609 placement (2.1.88 match: _temp5, 1)
function getRetentionCutoff(policyKey, defaultDays) {
  let userSettingDays = getSettingsForSourceTightenOnly("userSettings")?.[policyKey];
  let days =
    getSecuritySensitiveSetting(policyKey)[0] ??
    (userSettingDays !== undefined && defaultDays !== 0 && userSettingDays > defaultDays
      ? userSettingDays
      : defaultDays);
  if (days === 0) return null;
  return cutoffDateFromDays(days);
}
//@ chunk-pc3x100t.js:6609-6791 layout
function isRetentionPolicyManaged() {
  if (getSettingsForSource("policySettings")?.cleanupPeriodDays !== undefined) return true;
  if (anyAdminPolicyTierGovernsRetention()) return true;
  return getPolicySettingsLoadErrors().some(
    (issue) =>
      issue.file !== PARENT_MANAGED_SETTINGS_SOURCE_LABEL &&
      (RETENTION_POLICY_KEYS.some((policyKey) => policyKey === issue.path) || issue.severity !== "warning"),
  );
}
//@ chunk-pc3x100t.js:6791-6842 facade-majority
function isRetentionExemptionDisabled() {
  return isRetentionPolicyManaged() || hasComplianceTaint("hipaa") || hasComplianceTaint("zdr");
}
//@ chunk-pc3x100t.js:6842-6922 layout
function emptyCleanupResult() {
  return {
    messages: 0,
    errors: 0,
    filesRetainedFresh: 0,
    filesPastCutoff: 0,
  };
}
//@ chunk-pc3x100t.js:6922-7115 layout
function addCleanupResults(target, source) {
  return {
    messages: target.messages + source.messages,
    errors: target.errors + source.errors,
    filesRetainedFresh: target.filesRetainedFresh + source.filesRetainedFresh,
    filesPastCutoff: target.filesPastCutoff + source.filesPastCutoff,
  };
}
//@ chunk-pc3x100t.js:7115-7226 fingerprint (2.1.88 match: convertFileNameToDate, 1)
function convertFileNameToDate(filename) {
  let isoStr = firstLineOf(filename, ".").replace(/T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z/, "T$1:$2:$3.$4Z");
  return new Date(isoStr);
}
//@ chunk-pc3x100t.js:7226-7262 facade-majority
/**
 * 清理时可静默忽略的文件系统错误（不存在/已删除等）。
 */
function isCleanupQuietFsErrno(error) {
  return isFsInaccessible(error) || isEnvFsErrno(error);
}
//@ chunk-pc3x100t.js:7262-7620 layout
async function cleanupFilesByNameDate(dirPath, cutoffDate, isMessagePath) {
  let result = emptyCleanupResult();
  try {
    let files = await getFsImplementation().readdir(dirPath);
    for (let file of files)
      try {
        if (convertFileNameToDate(file.name) < cutoffDate) {
          await getFsImplementation().unlink(join(dirPath, file.name));
          if (isMessagePath) result.messages++;
          else result.errors++;
        }
      } catch (error) {
        logForDebugging(`Failed to clean up file ${file.name} in ${dirPath}: ${error}`, {
          level: "error",
        });
      }
  } catch (error) {
    if (isENOENT(error));
    else if (isCleanupQuietFsErrno(error))
      logForDebugging(`cleanup readdir ${dirPath} failed: ${error.code}`, {
        level: "error",
      });
    else logError(error);
  }
  return result;
}
//@ chunk-pc3x100t.js:7620-8042 fingerprint (2.1.88 match: cleanupOldMessageFiles, 0.7)
async function cleanupOldMessageFiles() {
  let fsImpl = getFsImplementation();
  let cutoffDate = getCutoffDate();
  if (cutoffDate === null) return emptyCleanupResult();
  let errorPath = CACHE_PATHS.errors();
  let baseCachePath = CACHE_PATHS.baseLogs();
  let result = await cleanupFilesByNameDate(errorPath, cutoffDate, false);
  try {
    let dirents;
    try {
      dirents = await fsImpl.readdir(baseCachePath);
    } catch {
      return result;
    }
    let mcpLogDirs = dirents
      .filter((dirent) => dirent.isDirectory() && dirent.name.startsWith("mcp-logs-"))
      .map((dirent) => join(baseCachePath, dirent.name));
    for (let mcpLogDir of mcpLogDirs) {
      result = addCleanupResults(result, await cleanupFilesByNameDate(mcpLogDir, cutoffDate, true));
      await tryRmdir(mcpLogDir, fsImpl);
    }
  } catch (error) {
    if (isENOENT(error));
    else if (isCleanupQuietFsErrno(error))
      logForDebugging(`cleanup mcp-logs scan failed: ${error.code}`, {
        level: "error",
      });
    else logError(error);
  }
  return result;
}
//@ chunk-pc3x100t.js:8042-8330 fingerprint (2.1.88 match: unlinkIfOld, 0.685)
async function unlinkIfOld(
  filePath,
  cutoffDate,
  fsImplementation,
  result,
  pastCutoffDate = cutoffDate,
  shouldKeep,
) {
  let stats;
  try {
    stats = await fsImplementation.stat(filePath);
  } catch (error) {
    if (isENOENT(error)) return false;
    throw error;
  }
  if (!(stats.mtime < cutoffDate)) {
    result.filesRetainedFresh++;
    return false;
  }
  if (shouldKeep !== undefined && (await shouldKeep(filePath, stats))) return false;
  try {
    await fsImplementation.unlink(filePath);
  } catch (error) {
    if (isENOENT(error)) return false;
    if (pastCutoffDate !== null && stats.mtime < pastCutoffDate) result.filesPastCutoff++;
    throw error;
  }
  return true;
}
//@ chunk-pc3x100t.js:8330-8405 fingerprint (2.1.88 match: tryRmdir, 1)
async function tryRmdir(dirPath, fsImpl) {
  if (!(await isDirectory(dirPath, fsImpl))) return;
  try {
    await fsImpl.rmdir(dirPath);
  } catch {}
}
//@ chunk-pc3x100t.js:8405-8422 layout
var SESSION_SUBDIR_NAMES; // deferred: uses CLOUD_SNAPSHOTS_DIR (./storage/storageKeys.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-pc3x100t.js:8405", () => {
  SESSION_SUBDIR_NAMES = [ARCHIVE_SYNC, FOLDER_SYNC];
});
//@ chunk-pc3x100t.js:8422-9479 layout
async function cleanupSessionDir(sessionDir, cutoffDate, fsImpl, result) {
  try {
    for (let subdirName of SESSION_SUBDIR_NAMES)
      await cleanupDirFiles(join(sessionDir, subdirName), cutoffDate, fsImpl, result);
    let sawLiveSession = false;
    try {
      let { sweepCheckoutSessionTrash } = await import("./sweepCheckoutSessionTrash.lazy.js");
      let trashSweep = await sweepCheckoutSessionTrash(sessionDir, cutoffDate.getTime());
      result.messages += trashSweep.removed;
      result.errors += trashSweep.errors;
      sawLiveSession = trashSweep.newestKeptMs !== null;
    } catch {
      result.errors++;
      sawLiveSession = true;
    }
    let filtered = (await fsImpl.readdir(sessionDir)).filter(
      (entry) => !SESSION_SUBDIR_NAMES.includes(entry.name),
    );
    let newestMtimeMs = null;
    for (let entry of filtered) {
      let entryPath = join(sessionDir, entry.name);
      let entryMtimeMs =
        (await entryKind(entry, entryPath, fsImpl)) === "directory"
          ? await scanDirectoryForPaths(entryPath, fsImpl, {
              requireCompleteWalk: true,
            })
          : (await fsImpl.lstat(entryPath)).mtimeMs;
      if (entryMtimeMs !== null) newestMtimeMs = Math.max(newestMtimeMs ?? -1 / 0, entryMtimeMs);
    }
    if (!((newestMtimeMs ?? (await cleanupOldVersionsThrottled(sessionDir, fsImpl))) < cutoffDate.getTime()))
      return;
    let included = (
      await Promise.all(
        SESSION_SUBDIR_NAMES.map((subdirName) =>
          fsImpl.lstat(join(sessionDir, subdirName)).then(
            (stats) => stats.isDirectory(),
            (error) => {
              if (isENOENT(error)) return false;
              throw error;
            },
          ),
        ),
      )
    ).includes(true);
    let entries = filtered.toSorted(
      (leftEntry, rightEntry) =>
        Number(leftEntry.name === STEPS_UNDER_WAY_DIR) - Number(rightEntry.name === STEPS_UNDER_WAY_DIR),
    );
    if (included || sawLiveSession) {
      let removedAny = false;
      for (let entry of entries) {
        if (sawLiveSession && entry.name === SIDE_GIT) {
          removedAny = (await removeGitObjectsDir(join(sessionDir, entry.name), fsImpl)) || removedAny;
          continue;
        }
        await fsImpl.rm(join(sessionDir, entry.name), {
          recursive: true,
          force: true,
        });
        removedAny = true;
      }
      if (removedAny) result.messages++;
      return;
    }
    for (let entry of entries.slice(0, -1))
      await fsImpl.rm(join(sessionDir, entry.name), {
        recursive: true,
        force: true,
      });
    await fsImpl.rm(sessionDir, {
      recursive: true,
      force: true,
    });
    result.messages++;
  } catch (error) {
    if (!isENOENT(error)) result.errors++;
  }
}
//@ chunk-pc3x100t.js:9479-9966 layout
async function cleanupDirFiles(dirPath, cutoffDate, fsImpl, result) {
  if (!(await isDirectory(dirPath, fsImpl))) return;
  let entries = await fsImpl.readdir(dirPath).catch(() => []);
  for (let entry of entries) {
    let kind = await entryKind(entry, join(dirPath, entry.name), fsImpl).catch((error) => {
      if (!isENOENT(error)) result.errors++;
      return "other";
    });
    if (kind === "file") {
      try {
        if (await unlinkIfOld(join(dirPath, entry.name), cutoffDate, fsImpl, result)) result.messages++;
      } catch {
        result.errors++;
      }
      continue;
    }
    if (kind !== "directory") continue;
    let entryPath = join(dirPath, entry.name);
    try {
      if (
        ((await scanDirectoryForPaths(entryPath, fsImpl, {
          requireCompleteWalk: true,
        })) ?? (await cleanupOldVersionsThrottled(entryPath, fsImpl))) < cutoffDate.getTime()
      ) {
        await fsImpl.rm(entryPath, {
          recursive: true,
          force: true,
        });
        result.messages++;
      }
    } catch (error) {
      if (!isENOENT(error)) result.errors++;
    }
  }
  await tryRmdir(dirPath, fsImpl);
}
//@ chunk-pc3x100t.js:9966-10243 layout
async function entryKind(dirent, entryPath, fsImpl) {
  if (dirent.isDirectory()) return "directory";
  if (dirent.isFile()) return "file";
  if (
    dirent.isSymbolicLink() ||
    dirent.isFIFO() ||
    dirent.isSocket() ||
    dirent.isBlockDevice() ||
    dirent.isCharacterDevice()
  )
    return "other";
  let stats = await fsImpl.lstat(entryPath);
  return stats.isDirectory() ? "directory" : stats.isFile() ? "file" : "other";
}
//@ chunk-pc3x100t.js:10243-10298 file-local
async function cleanupOldVersionsThrottled(dirPath, fsImpl) {
  return (await fsImpl.lstat(dirPath)).mtimeMs;
}
//@ chunk-pc3x100t.js:10298-10524 callgraph-witnessed (2.1.88 match: cleanupOldSessionFiles, 0.307)
async function cleanupOldSessionFiles(result) {
  let cutoffDate = getCutoffDate();
  let result_2 = emptyCleanupResult();
  if (cutoffDate === null) return result_2;
  let projectsDir = getProjectsDir();
  let fsImpl = getFsImplementation();
  for (let projectEntry of await fsImpl.readdir(projectsDir).catch(() => [])) {
    let projectDir = join(projectsDir, projectEntry.name);
    let sessionDir = join(projectDir, CLOUD_SNAPSHOTS_DIR);
    if (projectEntry.isDirectory() && (await isDirectory(sessionDir, fsImpl))) {
      await cleanupSessionDir(sessionDir, cutoffDate, fsImpl, result_2);
      await tryRmdir(projectDir, fsImpl);
    }
  }
  return result_2;
}
//@ chunk-pc3x100t.js:10524-10807 affinity
async function removeGitObjectsDir(gitDirPath, fsImpl) {
  let currentDir = gitDirPath;
  let removedAny = false;
  for (let keepSegment of ["objects", "info", "alternates"]) {
    if (!(await fsImpl.lstat(currentDir)).isDirectory()) {
      await fsImpl.rm(currentDir, {
        recursive: true,
        force: true,
      });
      return true;
    }
    for (let entry of await fsImpl.readdir(currentDir))
      if (entry.name !== keepSegment) {
        await fsImpl.rm(join(currentDir, entry.name), {
          recursive: true,
          force: true,
        });
        removedAny = true;
      }
    currentDir = join(currentDir, keepSegment);
  }
  return removedAny;
}
//@ chunk-pc3x100t.js:10807-10888 affinity
async function isDirectory(dirPath, fsImpl) {
  try {
    return (await fsImpl.lstat(dirPath)).isDirectory();
  } catch {
    return false;
  }
}
//@ chunk-pc3x100t.js:10888-11318 affinity
async function cleanupTreeRecursive(dirPath, cutoffDate, fsImplementation, result, options = {}) {
  let { entryMatcher } = options;
  let entries = await fsImplementation.readdir(dirPath).catch((error) => {
    if (options.countEnumerationFailures === true && !isENOENT(error)) result.errors++;
    return [];
  });
  for (let entry of entries) {
    let entryPath = join(dirPath, entry.name);
    if (entry.isDirectory())
      await cleanupTreeRecursive(entryPath, cutoffDate, fsImplementation, result, options);
    else if (entryMatcher !== undefined && !entryMatcher(entry.name));
    else if (entry.isFile())
      try {
        if (await unlinkIfOld(entryPath, cutoffDate, fsImplementation, result)) result.messages++;
      } catch {
        result.errors++;
      }
    else
      try {
        if ((await fsImplementation.lstat(entryPath)).mtime < cutoffDate) {
          await fsImplementation.unlink(entryPath);
          result.messages++;
        }
      } catch {
        result.errors++;
      }
  }
  await tryRmdir(dirPath, fsImplementation);
}
//@ chunk-pc3x100t.js:11811-16190 placement
/**
 * 按保留期清理旧会话转录（hipaa/zdr/桌面端等情况豁免）。
 */
async function cleanupOldTranscripts() {
  let cutoffDate = getCutoffDate();
  let result = {
    ...emptyCleanupResult(),
    transcripts: 0,
    transcriptsExemptedDesktop: 0,
  };
  if (cutoffDate === null) return result;
  let projectsDir = getProjectsDir();
  let fsImplementation = getFsImplementation();
  let projectEntries;
  try {
    projectEntries = await fsImplementation.readdir(projectsDir);
  } catch (error) {
    if (!isENOENT(error)) result.errors++;
    return result;
  }
  let tempDir;
  try {
    tempDir = claudeTempDir();
    if (!(await fsImplementation.lstat(tempDir)).isDirectory()) tempDir = null;
  } catch {
    tempDir = null;
  }
  let isExemptionDisabled = isRetentionExemptionDisabled();
  let desktopCutoff = desktopCleanupCutoff();
  let exemptionDisabled = null;
  let shouldExempt = isExemptionDisabled
    ? undefined
    : async (transcriptPath, stats) => {
        if (hasComplianceTaint("hipaa") || hasComplianceTaint("zdr")) return false;
        if (desktopCutoff !== null && stats.mtime < desktopCutoff) return false;
        let dumpReleaseState = await getDumpReleaseState(
          releasedStatePath(transcriptPath),
          fsImplementation,
          cutoffDate,
        );
        if (dumpReleaseState === "release-now") return false;
        if (dumpReleaseState === "grace") {
          result.transcriptsExemptedDesktop++;
          return true;
        }
        if (stats.size === 0) {
          if (
            !(await fsImplementation.stat(transcriptPath.slice(0, -6)).then(
              (stats) => stats.isDirectory(),
              () => false,
            ))
          ) {
            result.transcriptsExemptedDesktop++;
            return true;
          }
        }
        exemptionDisabled ??= Buffer.allocUnsafe(LITE_READ_BUF_SIZE);
        let { head, tail } = await readHeadAndTail(transcriptPath, stats.size, exemptionDisabled);
        if (head === "" && stats.size > 0) {
          await fsImplementation.stat(transcriptPath);
          throw Error(
            "transient read failure while classifying a transcript for the desktop retention exemption",
          );
        }
        let tailText = stats.size > LITE_READ_BUF_SIZE ? anchorOffsetTail(tail) : tail;
        let firstEntrypoint = extractFieldFromFirstEntryStrict(head, "entrypoint");
        let lastEntrypoint = extractFieldFromLastEntryStrict(tailText, "entrypoint");
        if (!(
          (firstEntrypoint !== undefined && isHostEntrypointName(firstEntrypoint)) ||
          (lastEntrypoint !== undefined && isHostEntrypointName(lastEntrypoint))
        ))
          return false;
        let sessionId = basename(transcriptPath).startsWith("agent-")
          ? (extractFieldFromFirstEntryStrict(head, "sessionId") ??
            extractFieldFromLastEntryStrict(tailText, "sessionId"))
          : undefined;
        if (sessionId !== undefined && isValidReleaseSessionId(sessionId)) {
          let statePath = join(dirname(transcriptPath), `${sessionId}${DESKTOP_RELEASED_SUFFIX}`);
          if (statePath !== releasedStatePath(transcriptPath)) {
            if ((await getDumpReleaseState(statePath, fsImplementation, cutoffDate)) === "release-now")
              return false;
          }
        }
        result.transcriptsExemptedDesktop++;
        return true;
      };
  for (let projectEntry of projectEntries) {
    if (!projectEntry.isDirectory()) continue;
    let projectDir = join(projectsDir, projectEntry.name);
    let entries;
    try {
      entries = await fsImplementation.readdir(projectDir);
    } catch {
      result.errors++;
      continue;
    }
    entries.sort(
      (leftEntry, rightEntry) => Number(rightEntry.isDirectory()) - Number(leftEntry.isDirectory()),
    );
    let releasedStatePaths = [];
    let errorsBeforeFiles = null;
    let liveTranscriptIds = new Set(
      entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".jsonl"))
        .map((entry) => entry.name.slice(0, -6)),
    );
    for (let entry of entries) {
      if (errorsBeforeFiles === null && !entry.isDirectory()) errorsBeforeFiles = result.errors;
      if (entry.isFile()) {
        if (
          entry.name.endsWith(DESKTOP_RELEASED_SUFFIX) &&
          liveTranscriptIds.has(entry.name.slice(0, -DESKTOP_RELEASED_SUFFIX.length))
        )
          continue;
        if (
          !entry.name.endsWith(".jsonl") &&
          !entry.name.endsWith(".cast") &&
          !entry.name.endsWith(".ccr-tip.json") &&
          !entry.name.endsWith(".precompact.json") &&
          !entry.name.endsWith(DESKTOP_RELEASED_SUFFIX) &&
          !entry.name.includes(".desktop-released.json.tmp") &&
          !entry.name.endsWith(".dir-sync.json") &&
          !entry.name.endsWith(".dir-sync-empty.json") &&
          !entry.name.endsWith(".cloud-worktrees.json") &&
          !entry.name.includes(".ccr-tip.json.tmp.") &&
          !entry.name.includes(".precompact.json.tmp.") &&
          !entry.name.includes(".dir-sync.json.tmp.") &&
          !entry.name.includes(".dir-sync-empty.json.tmp.") &&
          !entry.name.includes(".cloud-worktrees.json.tmp.") &&
          !entry.name.includes(".jsonl.compact.tmp.") &&
          !entry.name.includes(".jsonl.superseded-")
        )
          continue;
        let entryPath = join(projectDir, entry.name);
        try {
          if (
            await unlinkIfOld(
              entryPath,
              cutoffDate,
              fsImplementation,
              result,
              undefined,
              entry.name.endsWith(".jsonl") ? shouldExempt : undefined,
            )
          ) {
            result.messages++;
            if (entry.name.endsWith(".jsonl")) {
              result.transcripts++;
              let name = entry.name.slice(0, -6);
              if (isCanonicalSessionName(name)) {
                await fsImplementation.unlink(join(projectDir, `${name}.ccr-tip.json`)).catch(() => {});
                await fsImplementation.unlink(join(projectDir, `${name}.precompact.json`)).catch(() => {});
                releasedStatePaths.push(releasedStatePath(entryPath));
                await fsImplementation
                  .rm(join(projectDir, name), {
                    recursive: true,
                    force: true,
                  })
                  .catch(() => {
                    result.errors++;
                  });
                if (tempDir !== null)
                  for (let dirName of projectTempDirNames(projectEntry.name)) {
                    let projectPath = join(tempDir, dirName);
                    let tempSessionStats = await fsImplementation.lstat(projectPath).catch(() => null);
                    if (tempSessionStats?.isDirectory()) {
                      await fsImplementation
                        .rm(join(projectPath, name), {
                          recursive: true,
                          force: true,
                        })
                        .catch(() => {
                          result.errors++;
                        });
                      if (tempSessionStats.mtime < cutoffDate) await tryRmdir(projectPath, fsImplementation);
                    }
                  }
              }
            }
          }
        } catch (error) {
          if (!isENOENT(error)) result.errors++;
        }
      } else if (entry.isDirectory()) {
        let sessionDirPath = join(projectDir, entry.name);
        if (entry.name === "bagel") {
          let newestMtimeMs = await scanDirectoryForPaths(sessionDirPath, fsImplementation);
          if (newestMtimeMs !== null && newestMtimeMs < cutoffDate.getTime())
            try {
              await fsImplementation.rm(sessionDirPath, {
                recursive: true,
                force: true,
              });
              result.messages++;
            } catch {
              result.errors++;
            }
          continue;
        }
        if (entry.name === CLOUD_SNAPSHOTS_DIR) continue;
        if (!isCanonicalSessionName(entry.name)) {
          let sessionStats = await fsImplementation.lstat(sessionDirPath).catch(() => null);
          if (sessionStats !== null && sessionStats.mtime < cutoffDate)
            await tryRmdir(sessionDirPath, fsImplementation);
          continue;
        }
        let toolResultsDir = join(sessionDirPath, TOOL_RESULTS_SUBDIR);
        if (await isDirectory(toolResultsDir, fsImplementation)) {
          let toolResultEntries = await fsImplementation.readdir(toolResultsDir).catch(() => []);
          for (let toolResultEntry of toolResultEntries)
            if (toolResultEntry.isFile())
              try {
                if (
                  await unlinkIfOld(
                    join(toolResultsDir, toolResultEntry.name),
                    cutoffDate,
                    fsImplementation,
                    result,
                  )
                )
                  result.messages++;
              } catch {
                result.errors++;
              }
            else if (toolResultEntry.isDirectory()) {
              let toolResultSubdir = join(toolResultsDir, toolResultEntry.name);
              let subdirEntries;
              try {
                subdirEntries = await fsImplementation.readdir(toolResultSubdir);
              } catch {
                continue;
              }
              for (let subdirEntry of subdirEntries) {
                if (!subdirEntry.isFile()) continue;
                try {
                  if (
                    await unlinkIfOld(
                      join(toolResultSubdir, subdirEntry.name),
                      cutoffDate,
                      fsImplementation,
                      result,
                    )
                  )
                    result.messages++;
                } catch {
                  result.errors++;
                }
              }
              if (
                subdirEntries.length > 0 ||
                (await cleanupOldVersionsThrottled(toolResultSubdir, fsImplementation).catch(() => 1 / 0)) <
                  cutoffDate.getTime()
              )
                await tryRmdir(toolResultSubdir, fsImplementation);
            }
          if (
            toolResultEntries.length > 0 ||
            (await cleanupOldVersionsThrottled(toolResultsDir, fsImplementation).catch(() => 1 / 0)) <
              cutoffDate.getTime()
          )
            await tryRmdir(toolResultsDir, fsImplementation);
        }
        let sessionEntries = await fsImplementation.readdir(sessionDirPath).catch(() => []);
        for (let sessionEntry of sessionEntries) {
          if (
            !sessionEntry.isFile() ||
            !(
              isAutoModeStateFile(sessionEntry.name) ||
              recordingStampOfStreamName(sessionEntry.name) !== undefined
            )
          )
            continue;
          if (sessionEntry.name === "custom-title.json" && liveTranscriptIds.has(entry.name)) continue;
          try {
            if (
              await unlinkIfOld(join(sessionDirPath, sessionEntry.name), cutoffDate, fsImplementation, result)
            )
              result.messages++;
          } catch {
            result.errors++;
          }
        }
        let mcpTasksDir = join(sessionDirPath, "mcp-tasks");
        if (await isDirectory(mcpTasksDir, fsImplementation)) {
          for (let taskEntry of await fsImplementation.readdir(mcpTasksDir).catch(() => [])) {
            let isTaskFile = taskEntry.name.endsWith(".json") || taskEntry.name.includes(".json.tmp.");
            if (!taskEntry.isFile() || !isTaskFile) continue;
            try {
              if (await unlinkIfOld(join(mcpTasksDir, taskEntry.name), cutoffDate, fsImplementation, result))
                result.messages++;
            } catch {
              result.errors++;
            }
          }
          await tryRmdir(mcpTasksDir, fsImplementation);
        }
        if (!liveTranscriptIds.has(entry.name))
          for (let subdirName of ["subagents", "workflows", "remote-agents"]) {
            let subdirPath = join(sessionDirPath, subdirName);
            if (await isDirectory(subdirPath, fsImplementation))
              await cleanupTreeRecursive(subdirPath, cutoffDate, fsImplementation, result);
          }
        await tryRmdir(sessionDirPath, fsImplementation);
      }
    }
    if (errorsBeforeFiles !== null && result.errors > errorsBeforeFiles) releasedStatePaths.length = 0;
    for (let statePath of releasedStatePaths) await fsImplementation.unlink(statePath).catch(() => {});
    await tryRmdir(projectDir, fsImplementation);
  }
  return result;
}
//@ chunk-pc3x100t.js:16190-16547 placement
/**
 * 删除目录中名字匹配（后缀或谓词）且早于保留期截止时间的文件，统计删除数与错误数，可选在清空后删除目录。
 */
async function cleanupOldFilesMatching(
  dirPath,
  suffixOrMatcher,
  removeEmptyDir = true,
  overrideDays,
  retentionCutoff,
) {
  let cutoffDate = retentionCutoff === undefined ? getCutoffDate(overrideDays) : retentionCutoff;
  let result = emptyCleanupResult();
  if (cutoffDate === null) return result;
  let pastCutoffDate =
    retentionCutoff !== undefined || overrideDays === undefined ? cutoffDate : getCutoffDate();
  let matcher =
    typeof suffixOrMatcher === "string" ? (name) => name.endsWith(suffixOrMatcher) : suffixOrMatcher;
  let fsImplementation = getFsImplementation();
  let entries;
  try {
    entries = await fsImplementation.readdir(dirPath);
  } catch {
    return result;
  }
  for (let entry of entries) {
    if (!entry.isFile() || !matcher(entry.name)) continue;
    try {
      if (await unlinkIfOld(join(dirPath, entry.name), cutoffDate, fsImplementation, result, pastCutoffDate))
        result.messages++;
    } catch {
      result.errors++;
    }
  }
  if (removeEmptyDir) await tryRmdir(dirPath, fsImplementation);
  return result;
}
//@ chunk-pc3x100t.js:16547-16773 placement
async function cleanupHfiAuthFile() {
  let result = emptyCleanupResult();
  let cutoffDate = getCutoffDate();
  if (cutoffDate === null) return result;
  let authFilePath = join(getClaudeConfigDir(), "hfi-auth.json");
  try {
    if (await unlinkIfOld(authFilePath, cutoffDate, getFsImplementation(), result)) result.messages++;
  } catch (error) {
    if (!isENOENT(error)) {
      logForDebugging(`Failed to clean up HFI auth file: ${error}`, {
        level: "error",
      });
      result.errors++;
    }
  }
  return result;
}
//@ chunk-pc3x100t.js:16773-17041 placement
async function cleanupTeamDiscoveryCache() {
  let result = emptyCleanupResult();
  let cutoffDate = getCutoffDate();
  if (cutoffDate === null) return result;
  let cacheFilePath = join(getClaudeConfigDir(), "cache", "team-discovery.json");
  try {
    if (await unlinkIfOld(cacheFilePath, cutoffDate, getFsImplementation(), result)) result.messages++;
  } catch (error) {
    if (!isENOENT(error)) {
      result.errors++;
      if (isCleanupQuietFsErrno(error))
        logForDebugging(`cleanup team-discovery-cache failed: ${error.code}`, {
          level: "error",
        });
      else logError(error);
    }
  }
  return result;
}
//@ chunk-pc3x100t.js:17041-17290 placement
async function cleanupModelAccessMemory() {
  let result = emptyCleanupResult();
  let cutoffDate = getCutoffDate();
  if (cutoffDate === null) return result;
  for (let filePath of [accessMemoryPath(), providerProbeVerdictsPath()])
    try {
      if (await unlinkIfOld(filePath, cutoffDate, getFsImplementation(), result)) result.messages++;
    } catch (error) {
      if (!isENOENT(error)) {
        result.errors++;
        if (isCleanupQuietFsErrno(error))
          logForDebugging(`cleanup model-access memory failed: ${error.code}`, {
            level: "error",
          });
        else logError(error);
      }
    }
  return result;
}
//@ chunk-pc3x100t.js:17290-17396 placement
async function cleanupModelCatalogCache() {
  return cleanupOldFilesMatching(
    modelCatalogCacheDir(),
    (fileName) =>
      fileName !== MASKED_IDS_JSON_2 &&
      fileName !== PUBLISHED_FLOOR_JSON &&
      (fileName.endsWith(".json") || fileName.includes(".json.tmp.")),
  );
}
//@ chunk-pc3x100t.js:17396-17656 layout
/**
 * getMcpAuthCachePath：needs-auth 缓存文件路径（<配置目录>/mcp-needs-auth-cache.json）。
 */
async function cleanupMcpAuthCache() {
  let result = emptyCleanupResult();
  let cutoffDate = getCutoffDate();
  if (cutoffDate === null) return result;
  let cachePath = join(getClaudeConfigDir(), "mcp-needs-auth-cache.json");
  try {
    if (await unlinkIfOld(cachePath, cutoffDate, getFsImplementation(), result)) result.messages++;
  } catch (error) {
    if (!isENOENT(error)) {
      result.errors++;
      if (isCleanupQuietFsErrno(error))
        logForDebugging(`cleanup mcp-auth-cache failed: ${error.code}`, {
          level: "error",
        });
      else logError(error);
    }
  }
  return result;
}
//@ chunk-pc3x100t.js:17656-17934 layout
async function cleanupDeviceUnboundCreates() {
  let result = emptyCleanupResult();
  let cutoffDate = getCutoffDate();
  if (cutoffDate === null) return result;
  let stateFilePath = join(getClaudeConfigDir(), "state", "device-unbound-creates.json");
  try {
    if (await unlinkIfOld(stateFilePath, cutoffDate, getFsImplementation(), result)) result.messages++;
  } catch (error) {
    if (!isENOENT(error)) {
      result.errors++;
      if (isCleanupQuietFsErrno(error))
        logForDebugging(`cleanup device-unbound-creates failed: ${error.code}`, {
          level: "error",
        });
      else logError(error);
    }
  }
  return result;
}
//@ chunk-pc3x100t.js:17934-18210 layout
async function cleanupMcpDiscoverVerdicts() {
  let result = emptyCleanupResult();
  let cutoffDate = getCutoffDate();
  if (cutoffDate === null) return result;
  let stateFilePath = join(getClaudeConfigDir(), "state", "mcp-discover-verdicts.json");
  try {
    if (await unlinkIfOld(stateFilePath, cutoffDate, getFsImplementation(), result)) result.messages++;
  } catch (error) {
    if (!isENOENT(error)) {
      result.errors++;
      if (isCleanupQuietFsErrno(error))
        logForDebugging(`cleanup mcp-discover-verdicts failed: ${error.code}`, {
          level: "error",
        });
      else logError(error);
    }
  }
  return result;
}
//@ chunk-pc3x100t.js:18210-18502 layout
async function cleanupDeviceMcpNotNow() {
  let result = emptyCleanupResult();
  let cutoffDate = getCutoffDate();
  let claudeConfigDirOrNull = getClaudeConfigDirOrNull();
  if (cutoffDate === null || claudeConfigDirOrNull === null) return result;
  let stateFilePath = join(claudeConfigDirOrNull, "state", "device-mcp-consent-not-now.json");
  try {
    if (await unlinkIfOld(stateFilePath, cutoffDate, getFsImplementation(), result)) result.messages++;
  } catch (error) {
    if (!isENOENT(error)) {
      result.errors++;
      if (isCleanupQuietFsErrno(error))
        logForDebugging(`cleanup device-mcp-not-now failed: ${error.code}`, {
          level: "error",
        });
      else logError(error);
    }
  }
  return result;
}
//@ chunk-pc3x100t.js:18502-18667 layout
async function cleanupServedCalls(dirPath = join(homedir(), ".claude", "state", "served-calls")) {
  return cleanupOldFilesMatching(
    dirPath,
    (fileName) => fileName.endsWith(".jsonl") || fileName.includes(".jsonl.tmp."),
    true,
    undefined,
    getRetentionCutoff("cleanupPeriodDays", CEL_MAX_ITEMS),
  );
}
//@ chunk-pc3x100t.js:18667-18902 layout
async function cleanupUnattendedServingRuns(
  dirPath = join(homedir(), ".claude", "state", "unattended-serving-runs"),
) {
  return cleanupOldFilesMatching(
    dirPath,
    (fileName) => {
      let runPid = /^([1-9][0-9]{0,9})\.json$/.exec(fileName)?.[1];
      return runPid === undefined ? fileName.includes(".json.tmp.") : !isProcessRunning(Number(runPid));
    },
    true,
    undefined,
    getRetentionCutoff("cleanupPeriodDays", CEL_MAX_ITEMS),
  );
}
//@ chunk-pc3x100t.js:18902-19110 layout
async function cleanupSettingsReviewStore(storageV5) {
  let result = emptyCleanupResult();
  let cutoffDate = getCutoffDate();
  if (cutoffDate === null) return result;
  try {
    result.messages += await pruneReviewEntriesBefore(cutoffDate, storageV5);
  } catch (error) {
    result.errors++;
    if (isCleanupQuietFsErrno(error))
      logForDebugging(`cleanup settings-review store failed: ${error.code}`, {
        level: "error",
      });
    else logError(error);
  }
  return result;
}
//@ chunk-pc3x100t.js:19110-19312 layout
function isMalformedHistoryEntry(line) {
  if (!line) return false;
  try {
    let entry = jsonParseRaw(line);
    if (typeof entry !== "object" || entry === null) return true;
    if (!("timestamp" in entry)) return true;
    let { timestamp } = entry;
    return typeof timestamp !== "number" || !Number.isFinite(timestamp);
  } catch {
    return true;
  }
}
//@ chunk-pc3x100t.js:19312-19509 layout
function isHistoryEntryOlderThan(line, cutoffMs) {
  if (!line) return false;
  try {
    let entry = jsonParseRaw(line);
    if (typeof entry !== "object" || entry === null || !("timestamp" in entry)) return false;
    let { timestamp } = entry;
    return typeof timestamp === "number" && Number.isFinite(timestamp) && timestamp < cutoffMs;
  } catch {
    return false;
  }
}
//@ chunk-pc3x100t.js:19509-19834 layout
/**
 * 删除配置目录中早于截止时间的自有临时文件（history.jsonl、远程设置同意文件等的临时副本）；缓存文件改为检查权限而不删除。
 */
async function cleanupStaleConfigTempFiles(claudeConfigDir, cutoffDate) {
  let entries;
  try {
    entries = await fsPromisesModule.readdir(claudeConfigDir);
  } catch {
    return;
  }
  let time = cutoffDate.getTime();
  await Promise.all(
    entries
      .filter(
        (fileName) =>
          isOwnTempName(fileName, "history.jsonl") ||
          isHashTempFile(fileName) ||
          isOwnTempName(fileName, REMOTE_SETTINGS_CONSENT_FILE) ||
          mapped.some((mappedName) => fileName === mappedName || isOwnTempName(fileName, mappedName)),
      )
      .map(async (fileName) => {
        let filePath = join(claudeConfigDir, fileName);
        try {
          let stats = await fsPromisesModule.lstat(filePath);
          if (stats.isFile() && stats.mtimeMs < time)
            await (mapped.includes(fileName)
              ? checkCacheFilePermissions(filePath)
              : fsPromisesModule.unlink(filePath));
        } catch {}
      }),
  );
}
//@ chunk-pc3x100t.js:19834-21761 layout
/**
 * 按保留期裁剪 history.jsonl：先无锁扫描去掉过期/格式错误的条目，加锁后核对文件身份与大小、扫描新增尾部，原子重写；文件在扫描期间变化则推迟，锁被破坏时放弃。
 */
async function pruneHistoryFile(cutoff) {
  let historyPath = join(getClaudeConfigDir(), "history.jsonl");
  let cutoffMs = cutoff.getTime();
  let shouldDrop = (line) => isHistoryEntryOlderThan(line, cutoffMs) || isMalformedHistoryEntry(line);
  let stats;
  let headScan;
  try {
    stats = await fsPromisesModule.lstat(historyPath);
    if (!stats.isFile()) {
      logForDebugging("History retention prune skipped: history.jsonl is not a regular file", {
        level: "error",
      });
      return {
        entriesPruned: 0,
        errors: 1,
      };
    }
    headScan = await openHistoryFile(historyPath, shouldDrop, {
      start: 0,
      end: stats.size,
      tail: "defer",
      expect: {
        ino: stats.ino,
        birthtimeMs: stats.birthtimeMs,
      },
    });
  } catch (error) {
    if (isENOENT(error))
      return {
        entriesPruned: 0,
        errors: 0,
      };
    if (error instanceof HistoryFileError) {
      logForDebugging("History retention prune deferred: history.jsonl changed under the scan");
      return {
        entriesPruned: 0,
        errors: 0,
      };
    }
    logForDebugging(`History retention prune failed: ${error}`, {
      level: "error",
    });
    return {
      entriesPruned: 0,
      errors: 1,
    };
  }
  if (headScan.dropped === 0 && headScan.consumed === stats.size)
    return {
      entriesPruned: 0,
      errors: 0,
    };
  let release;
  let lockCompromised = false;
  try {
    release = await lock(historyPath, {
      ...HISTORY_FILE_RETRY_OPTIONS,
      onCompromised: (error) => {
        lockCompromised = true;
        logForDebugging(`History retention lock compromised: ${error}`, {
          level: "error",
        });
      },
    });
  } catch (error) {
    if (isENOENT(error))
      return {
        entriesPruned: 0,
        errors: 0,
      };
    logForDebugging(`History retention prune failed: ${error}`, {
      level: "error",
    });
    return {
      entriesPruned: 0,
      errors: 1,
    };
  }
  try {
    let stats_2 = await fsPromisesModule.lstat(historyPath);
    if (
      !stats_2.isFile() ||
      stats_2.size < headScan.consumed ||
      (stats.ino !== 0 && stats_2.ino !== stats.ino) ||
      stats_2.birthtimeMs !== stats.birthtimeMs
    ) {
      logForDebugging("History retention prune deferred: history.jsonl changed under the scan");
      return {
        entriesPruned: 0,
        errors: 0,
      };
    }
    let tailScan = await openHistoryFile(historyPath, shouldDrop, {
      start: headScan.consumed,
      end: stats_2.size,
      tail: "judge",
      expect: {
        ino: stats_2.ino,
        birthtimeMs: stats_2.birthtimeMs,
      },
      verifiedHead: {
        bytes: headScan.consumed,
        digest: headScan.digest,
      },
      residueBytes: stats.size - headScan.consumed,
    });
    let entriesPruned = headScan.dropped + tailScan.dropped;
    if (lockCompromised) throw Error("history lock compromised before the rewrite");
    if (entriesPruned === 0 && tailScan.terminated && !tailScan.split)
      return {
        entriesPruned: 0,
        errors: 0,
      };
    let combined = headScan.kept.concat(tailScan.kept);
    await filePath(
      historyPath,
      combined.length
        ? `${combined.join(`
`)}
`
        : "",
      {
        exactMode: stats_2.mode & 511,
      },
    );
    return {
      entriesPruned,
      errors: 0,
    };
  } catch (error) {
    if (error instanceof HistoryFileError) {
      logForDebugging("History retention prune deferred: history.jsonl changed under the scan");
      return {
        entriesPruned: 0,
        errors: 0,
      };
    }
    logForDebugging(`History retention prune failed: ${error}`, {
      level: "error",
    });
    return {
      entriesPruned: 0,
      errors: 1,
    };
  } finally {
    await releaseLockQuietly(release, "history retention");
  }
}
//@ chunk-pc3x100t.js:21761-22163 layout
async function cleanupMcpDiscoveryCache() {
  let cacheDir = join(getClaudeConfigDir(), "mcp-discovery-cache");
  let result = await cleanupOldFilesMatching(
    cacheDir,
    (fileName) => fileName.endsWith(".json") || fileName.includes(".json.tmp."),
    false,
  );
  let cutoffDate = getCutoffDate();
  if (cutoffDate === null) return result;
  let fsImplementation = getFsImplementation();
  let entries;
  try {
    entries = await fsImplementation.readdir(cacheDir);
  } catch {
    return result;
  }
  for (let entry of entries) {
    if (!entry.isDirectory() || !entry.name.endsWith(".json.lock")) continue;
    let lockDirPath = join(cacheDir, entry.name);
    try {
      if ((await fsImplementation.stat(lockDirPath)).mtime < cutoffDate) {
        await fsImplementation.rmdir(lockDirPath);
        result.messages++;
      }
    } catch {
      result.errors++;
    }
  }
  await tryRmdir(cacheDir, fsImplementation);
  return result;
}
//@ chunk-pc3x100t.js:22163-22346 fingerprint (2.1.88 match: cleanupOldPlanFiles, 0.743)
async function cleanupOldPlanFiles(baseDir) {
  if (isDiskless()) return emptyCleanupResult();
  let plansDir = join(getClaudeConfigDir(), "plans");
  try {
    if (baseDir !== undefined)
      return await cleanupOldFilesMatching(
        plansDir,
        (fileName) => fileName.endsWith(".md") || fileName.includes(".md.tmp."),
      );
    return await cleanupOldFilesMatching(plansDir, ".md");
  } finally {
    resetPlanFileCacheToUnknown();
  }
}
//@ chunk-pc3x100t.js:22346-22943 placement (2.1.88 match: getSessionId, 0)
async function cleanupOldFilesInDirectory(
  subdirName,
  {
    exclude,
    skipIf,
    refuseRedirectedRoot = false,
    removeEmptyBaseDir = true,
    maxAgeDays,
    baseDir,
    storageV5,
  } = {},
) {
  let cutoffDate = getCutoffDate(maxAgeDays);
  let result = emptyCleanupResult();
  if (cutoffDate === null) return result;
  let fsImplementation = getFsImplementation();
  let claudeConfigDir = getClaudeConfigDir();
  let rootDir = baseDir ?? join(claudeConfigDir, subdirName);
  if (refuseRedirectedRoot) {
    if (
      (await verifySyncRoot(
        rootDir,
        claudeConfigDir,
        {
          event: "cleanup_sweep_root_refused",
          phase: "sweep",
          rootLabel: subdirName,
        },
        {
          storageV5,
        },
      )) !== "real"
    )
      return result;
  }
  let entries;
  try {
    entries = await fsImplementation.readdir(rootDir);
  } catch {
    return result;
  }
  for (let entry of entries) {
    if (!entry.isDirectory() || exclude?.has(entry.name)) continue;
    let entryPath = join(rootDir, entry.name);
    try {
      if ((await fsImplementation.stat(entryPath)).mtime < cutoffDate) {
        if (await skipIf?.(entryPath)) continue;
        await fsImplementation.rm(entryPath, {
          recursive: true,
          force: true,
        });
        result.messages++;
      }
    } catch {
      result.errors++;
    }
  }
  if (removeEmptyBaseDir) await tryRmdir(rootDir, fsImplementation);
  return result;
}
//@ chunk-pc3x100t.js:22943-22982 affinity (2.1.88 match: resolveBackupPath, 1)
/**
 * 取会话的 file-history 目录（误配名 resolveBackupPath）。
 */
function resolveBackupPath() {
  return cleanupOldFilesInDirectory("file-history");
}
//@ chunk-pc3x100t.js:23020-23052 placement (2.1.88 match: getTaskOutputDir, 1)
function getTaskOutputDir() {
  return cleanupOldFilesInDirectory("tasks");
}
//@ chunk-pc3x100t.js:23052-23086 layout (2.1.88 match: uploadsDir, 1)
function uploadsDir() {
  return cleanupOldFilesInDirectory("uploads");
}
//@ chunk-pc3x100t.js:23086-23246 layout
function cleanupDevMods() {
  let folder = skillWatchStateByHost.get()?.folder;
  let options = getCutoffDate();
  return cleanupOldFilesInDirectory("dev-mods", {
    exclude: new Set([getSessionId(), ...(folder === undefined ? [] : [basename(folder)])]),
    skipIf: (dirPath) => scanAllSessions(dirPath, options, SCAN_SESSIONS_MAX),
    removeEmptyBaseDir: false,
  });
}
//@ chunk-pc3x100t.js:23246-23260 layout
/**
 * 扫描会话时的最大数量参数（3）。
 */
var SCAN_SESSIONS_MAX = 3;
var PEER_SPOOL_MAX_AGE_DAYS = 2;
//@ chunk-pc3x100t.js:23260-23435 layout
async function cleanupBashEditDiffs() {
  let bashEditDiffDir = getBashEditDiffDir();
  let dirIdentity = await statOwnedPrivateDir(bashEditDiffDir).catch(() => null);
  if (!dirIdentity) return emptyCleanupResult();
  return cleanupOldFilesInDirectory(BASH_EDIT_DIFF, {
    removeEmptyBaseDir: false,
    maxAgeDays: PEER_SPOOL_MAX_AGE_DAYS,
    baseDir: bashEditDiffDir,
    skipIf: async (dirPath) => !(await getFileIdentity(dirPath, dirIdentity)),
  });
}
//@ chunk-pc3x100t.js:23435-23632 layout
async function sweepSeedAdminSafely() {
  try {
    return await sweepSeedAdmin();
  } catch (error) {
    if (isCleanupQuietFsErrno(error))
      logForDebugging(`[cleanup] the sweep of seed-admin did not run: ${error.code}`, {
        level: "warn",
      });
    else logError(error);
    return {
      removed: 0,
      errors: 1,
      held: 0,
      refused: "no",
    };
  }
}
//@ chunk-pc3x100t.js:23632-24000 layout
/**
 * 清理过期的 bridge-spawn 目录：v5 存储可用时先按作用域删除；否则在自有私有目录中删除过期子目录，并核对目录身份与真实路径防止被重定向。
 */
async function cleanupBridgeSpawnDirs(scopeBackend) {
  if (isStorageV5Enabled() && scopeBackend !== undefined) {
    let scopeResult = await cleanupBridgeSpawnScope(scopeBackend);
    if (scopeResult !== "unaddressed") return scopeResult;
  }
  let spawnDir = bridgeSpawnDir();
  let dirIdentity = await statOwnedPrivateDir(spawnDir).catch(() => null);
  if (!dirIdentity) return emptyCleanupResult();
  return cleanupOldFilesInDirectory(BRIDGE_SPAWN, {
    removeEmptyBaseDir: false,
    maxAgeDays: CEL_MAX_PATTERN_LENGTH,
    baseDir: spawnDir,
    skipIf: async (dirPath) => {
      let currentIdentity = await statOwnedPrivateDir(spawnDir);
      return (
        currentIdentity?.ino !== dirIdentity.ino ||
        currentIdentity.dev !== dirIdentity.dev ||
        (await statOwnedPrivateDir(dirPath)) === null ||
        (await fsPromisesModule.realpath(dirPath)) !==
          join(await fsPromisesModule.realpath(dirname(spawnDir)), BRIDGE_SPAWN, basename(dirPath))
      );
    },
  });
}
//@ chunk-pc3x100t.js:24000-24412 layout
/**
 * 通过 v5 存储删除 bridge-spawn 作用域中早于保留期的对象；作用域无法寻址时返回 unaddressed 让调用方回退到文件系统清理。
 */
async function cleanupBridgeSpawnScope(scopeBackend) {
  let result = emptyCleanupResult();
  let scope = bridgeSpawnScope();
  let scopeInfo = await scopeBackend.scopeKind(scope);
  if (!scopeInfo.ok) return scopeInfo.error.code === "InvalidArgument" ? "unaddressed" : result;
  if (
    scopeInfo.value.kind !== "directory" ||
    scopeInfo.value.object === undefined ||
    scopeInfo.value.owner === "other"
  )
    return result;
  let cutoffDate = getCutoffDate(CEL_MAX_PATTERN_LENGTH);
  if (cutoffDate === null) return result;
  let deleteResult = await scopeBackend.deleteScope(scope, {
    olderThanMs: Math.max(0, Date.now() - cutoffDate.getTime()),
  });
  if (!deleteResult.ok) return result;
  result.messages += deleteResult.value.deleted;
  result.errors += deleteResult.value.failed ?? 0;
  return result;
}
//@ chunk-pc3x100t.js:24412-24452 layout
/**
 * 清理 peer 文件传输的暂存目录。
 */
function cleanupPeerTransferSpool() {
  return cleanupOldFilesMatching(peerTransferSpoolDir(), "", false, PEER_TRANSFER_VERSION);
}
//@ chunk-pc3x100t.js:24452-24603 layout
async function cleanupSkillsSyncDirs(storageV5) {
  return addCleanupResults(
    addCleanupResults(
      await cleanupOldFilesInDirectory(SKILLS_TRASH_DIR, {
        refuseRedirectedRoot: true,
        storageV5,
      }),
      await cleanupOldFilesInDirectory(SKILLS_STAGING_DIR, {
        refuseRedirectedRoot: true,
        storageV5,
      }),
    ),
    await cleanupPerAccountSyncDirs(SKILLS_SYNC_DIR_2, storageV5),
  );
}
//@ chunk-pc3x100t.js:24603-25000 layout
/**
 * 在配置目录下指定根（拒绝被重定向的根）中，对每个合法账号子目录清理其同步子目录中的过期文件，合并结果。
 */
async function cleanupPerAccountSyncDirs(syncDirName, storageV5) {
  let result = emptyCleanupResult();
  if (getCutoffDate() === null) return result;
  let claudeConfigDir = getClaudeConfigDir();
  let rootDir = join(claudeConfigDir, syncDirName);
  if (
    (await verifySyncRoot(
      rootDir,
      claudeConfigDir,
      {
        event: "cleanup_sweep_root_refused",
        phase: "sweep",
        rootLabel: syncDirName,
      },
      {
        storageV5,
      },
    )) !== "real"
  )
    return result;
  let entries;
  try {
    entries = await getFsImplementation().readdir(rootDir);
  } catch {
    return result;
  }
  for (let entry of entries) {
    if (!entry.isDirectory() || !isSyncBucketName(entry.name)) continue;
    result = addCleanupResults(
      result,
      await cleanupOldFilesInDirectory(join(syncDirName, "*", TRASH_SUBDIR), {
        baseDir: join(rootDir, entry.name, TRASH_SUBDIR),
        refuseRedirectedRoot: true,
        storageV5,
      }),
    );
  }
  return result;
}
//@ chunk-pc3x100t.js:25000-25258 layout
async function cleanupTrashRoots(storageV5) {
  let result = emptyCleanupResult();
  let claudeConfigDir = getClaudeConfigDir();
  for (let syncDirName of [SKILLS_SYNC_DIR, PLUGINS_SYNC_DIR]) {
    let rootDir = join(claudeConfigDir, syncDirName);
    if (
      (await verifySyncRoot(
        rootDir,
        claudeConfigDir,
        {
          event: "cleanup_sweep_root_refused",
          phase: "sweep",
          rootLabel: syncDirName,
        },
        {
          storageV5,
        },
      )) === "real"
    ) {
      let trimResult = await queueSyncTrashTrim(rootDir);
      result = addCleanupResults(result, {
        ...emptyCleanupResult(),
        messages: trimResult.removed,
        errors: trimResult.errors,
      });
    }
  }
  return result;
}
//@ chunk-pc3x100t.js:25258-25325 layout
/**
 * 清理同步根下过期的账号目录（跳过当前账号与未标记目录）。
 */
function cleanupAccountSyncDirs(storageV5) {
  return cleanupOldFilesInDirectory(SKILLS_SYNC_DIR, {
    refuseRedirectedRoot: true,
    storageV5,
  });
}
//@ chunk-pc3x100t.js:25325-26063 layout
/**
 * 清理同步根目录下过期的账号目录：跳过当前账号与未标记目录，按清单文件或目录 mtime 判断是否过期，核对同步根后移到回收位置并计数。
 */
async function cleanupStaleSyncRoots(rootLabel, trashLabel, failureEvent, storageV5) {
  let result = emptyCleanupResult();
  let cutoff = getCutoffDate();
  if (cutoff === null) return result;
  let currentAccountId = await getSyncBucket().catch((error) => {
    logError(error);
    return;
  });
  if (currentAccountId === undefined) return result;
  let activeId = currentAccountId ?? getStoredAccountBucket();
  let configDir = getClaudeConfigDir();
  let rootDir = join(configDir, rootLabel);
  if (
    (await verifySyncRoot(
      rootDir,
      configDir,
      {
        event: "cleanup_sweep_root_refused",
        phase: "sweep",
        rootLabel,
      },
      {
        storageV5,
      },
    )) !== "real"
  )
    return result;
  let fs = getFsImplementation();
  let entries;
  try {
    entries = await fs.readdir(rootDir);
  } catch {
    return result;
  }
  for (let entry of entries) {
    if (
      !entry.isDirectory() ||
      !isSyncBucketName(entry.name) ||
      entry.name === activeId ||
      (await readSyncMarker(rootDir, entry.name)) === "unmarked"
    )
      continue;
    let entryDir = join(rootDir, entry.name);
    let mtime;
    try {
      mtime = (await fs.lstat(join(entryDir, SYNCED_MANIFEST_FILE)).catch(() => fs.lstat(entryDir))).mtime;
    } catch {
      continue;
    }
    if (mtime >= cutoff) {
      result.filesRetainedFresh++;
      continue;
    }
    result.filesPastCutoff++;
    if (
      await moveRootToTrashOk({
        dir: entryDir,
        trashRoot: join(configDir, trashLabel),
        configHome: configDir,
        failureEvent,
        storageV5,
      })
    ) {
      await removeSyncedSkillDir(rootDir, entry.name).catch(() => {});
      result.messages++;
    } else result.errors++;
  }
  return result;
}
//@ chunk-pc3x100t.js:26063-26131 layout
/**
 * 清理插件同步的回收根目录。
 */
function cleanupPluginsSyncTrashRoots(storageV5) {
  return cleanupStaleSyncRoots(
    SKILLS_SYNCED_STAGING,
    PLUGINS_SYNC_DIR,
    "plugins_sync_trash_move_failed",
    storageV5,
  );
}
//@ chunk-pc3x100t.js:26131-26198 layout
/**
 * 清理技能同步的回收根目录。
 */
function cleanupSkillsSyncTrashRoots(storageV5) {
  return cleanupStaleSyncRoots(
    SKILLS_SYNC_DIR_2,
    SKILLS_SYNC_DIR,
    "skills_sync_trash_move_failed",
    storageV5,
  );
}
//@ chunk-pc3x100t.js:26198-26265 layout
/**
 * 清理插件同步根下的过期条目。
 */
function cleanupPluginsSyncRootEntries(storageV5) {
  return cleanupOldFilesInDirectory(PLUGINS_SYNC_DIR, {
    refuseRedirectedRoot: true,
    storageV5,
  });
}
//@ chunk-pc3x100t.js:26265-26362 layout
/**
 * 清理自有同步根与按账号同步目录。
 */
async function cleanupOwnedSyncRoots(storageV5) {
  return addCleanupResults(
    await cleanupOldFilesInDirectory(PLUGINS_STAGING_DIR, {
      refuseRedirectedRoot: true,
      storageV5,
    }),
    await cleanupPerAccountSyncDirs(SKILLS_SYNCED_STAGING, storageV5),
  );
}
//@ chunk-pc3x100t.js:26362-26520 layout
async function cleanupPluginStore() {
  let storeDir = join(getPluginsDirectory(), "store");
  let result = await cleanupOldFilesMatching(
    storeDir,
    (fileName) => fileName.endsWith(".json") || fileName.includes(".json.tmp."),
    false,
  );
  let cutoffDate = getCutoffDate();
  if (cutoffDate !== null) await cleanupDirFiles(storeDir, cutoffDate, getFsImplementation(), result);
  return result;
}
//@ chunk-pc3x100t.js:26520-26572 layout
/**
 * 清理已移出或不可读的插件文件。
 */
function cleanupRemovedPluginFiles() {
  return cleanupOldFilesMatching(
    getPluginsDirectory(),
    (fileName) => isSetAsideFileName(fileName) || isUnreadableKeptFileName(fileName),
    false,
  );
}
//@ chunk-pc3x100t.js:26572-27145 fingerprint (2.1.88 match: cleanupOldSessionEnvDirs, 0.761)
async function cleanupOldSessionEnvDirs() {
  let cutoffDate = getCutoffDate();
  let result = emptyCleanupResult();
  if (cutoffDate === null) return result;
  let fsImpl = getFsImplementation();
  let archivesDir = join(getClaudeConfigDir(), MCP_SKILL_ARCHIVES);
  let dirents;
  try {
    dirents = await fsImpl.readdir(archivesDir);
  } catch {
    return result;
  }
  for (let dirent of dirents) {
    if (!dirent.isDirectory()) continue;
    let archiveDir = join(archivesDir, dirent.name);
    let cacheKey = (await readAssetMetaOrNull(archiveDir))?.cacheKey ?? null;
    let sessionEnvDirs;
    try {
      sessionEnvDirs = await fsImpl.readdir(archiveDir);
    } catch {
      result.errors++;
      continue;
    }
    for (let sessionEnvDir of sessionEnvDirs) {
      if (!sessionEnvDir.isDirectory() || sessionEnvDir.name === cacheKey) continue;
      let sessionEnvDirPath = join(archiveDir, sessionEnvDir.name);
      try {
        if ((await fsImpl.stat(sessionEnvDirPath)).mtime < cutoffDate) {
          await fsImpl.rm(sessionEnvDirPath, {
            recursive: true,
            force: true,
          });
          result.messages++;
        }
      } catch {
        result.errors++;
      }
    }
    try {
      if ((await fsImpl.stat(archiveDir)).mtime < cutoffDate) {
        await fsImpl.rm(archiveDir, {
          recursive: true,
          force: true,
        });
        result.messages++;
      }
    } catch {
      result.errors++;
    }
  }
  await tryRmdir(archivesDir, fsImpl);
  return result;
}
//@ chunk-pc3x100t.js:27145-27434 layout
async function cleanupUsageData() {
  let usageDir = join(getClaudeConfigDir(), "usage-data");
  let result = await cleanupOldFilesMatching(
    join(usageDir, "facets"),
    (fileName) => fileName.endsWith(".json") || fileName.includes(".json.tmp."),
  );
  result = addCleanupResults(
    result,
    await cleanupOldFilesMatching(
      join(usageDir, "session-meta"),
      (fileName) => fileName.endsWith(".json") || fileName.includes(".json.tmp."),
    ),
  );
  result = addCleanupResults(
    result,
    await cleanupOldFilesMatching(
      usageDir,
      (fileName) => fileName.endsWith(".html") || isTempFileName_2(fileName),
      false,
    ),
  );
  await tryRmdir(usageDir, getFsImplementation());
  return result;
}
//@ chunk-pc3x100t.js:27434-27907 layout
async function cleanupTempTranscripts() {
  let cutoffDate = getCutoffDate();
  let result = emptyCleanupResult();
  if (cutoffDate === null) return result;
  let fsImplementation = getFsImplementation();
  let tempDir;
  try {
    tempDir = claudeTempDir();
  } catch {
    return result;
  }
  let entries;
  try {
    entries = await fsImplementation.readdir(tempDir);
  } catch {
    return result;
  }
  for (let entry of entries) {
    let isTranscriptFile = entry.name.startsWith("cc-transcript-") && entry.name.endsWith(".txt");
    let isAutoModeFile = entry.name.startsWith(AUTO_MODE_BUILTINS) && entry.name.endsWith(".md");
    let isCacheBreakFile =
      entry.name.startsWith(cacheBreakStatePrefix) &&
      (entry.name.endsWith(".json") || entry.name.endsWith(".diff"));
    let unused = false;
    if (!entry.isFile() || (!isTranscriptFile && !isAutoModeFile && !isCacheBreakFile && true)) continue;
    try {
      if (await unlinkIfOld(join(tempDir, entry.name), cutoffDate, fsImplementation, result))
        result.messages++;
    } catch {
      result.errors++;
    }
  }
  return result;
}
//@ chunk-pc3x100t.js:27907-28316 placement (2.1.88 match: getOverlayPath, 0.437)
/**
 * 清理过期的 speculation 目录（utils/cleanup 的一部分）。旧版名 getOverlayPath 为错配。
 */
async function cleanupOldSpeculationDir() {
  let result = emptyCleanupResult();
  let cutoffDate = getCutoffDate(CEL_MAX_PATTERNS);
  if (cutoffDate === null) return result;
  let fsImplementation = getFsImplementation();
  let tempDir;
  try {
    tempDir = claudeTempDir();
    if (!(await fsImplementation.lstat(tempDir)).isDirectory()) return result;
  } catch {
    return result;
  }
  let speculationDir = join(tempDir, "speculation");
  let dirStats;
  try {
    dirStats = await fsImplementation.lstat(speculationDir);
  } catch {
    return result;
  }
  if (!dirStats.isDirectory()) return result;
  try {
    if (
      ((await scanDirectoryForPaths(speculationDir, fsImplementation, {
        requireCompleteWalk: true,
      })) ?? dirStats.mtimeMs) < cutoffDate.getTime()
    ) {
      await fsImplementation.rm(speculationDir, {
        recursive: true,
        force: true,
      });
      result.messages++;
      return result;
    }
  } catch {
    result.errors++;
  }
  await tryRmdir(speculationDir, fsImplementation);
  return result;
}
//@ chunk-pc3x100t.js:28316-28482 affinity
async function cleanupShares() {
  let sharesDir = join(getClaudeConfigDir(), "shares");
  let result = await cleanupOldFilesInDirectory("shares");
  result = addCleanupResults(
    result,
    await cleanupOldFilesMatching(
      sharesDir,
      (fileName) => fileName.endsWith(".zip") || (fileName.includes(".zip.tmp.") && isTempFileName(fileName)),
      false,
    ),
  );
  await tryRmdir(sharesDir, getFsImplementation());
  return result;
}
//@ chunk-pc3x100t.js:28482-28718 affinity
async function cleanupTelemetry() {
  let telemetryDir = join(getClaudeConfigDir(), "telemetry");
  let result = await cleanupOldFilesMatching(telemetryDir, ".json", false);
  let cutoffDate = getCutoffDate();
  if (cutoffDate === null) return result;
  let runsDir = join(telemetryDir, "runs");
  let fsImplementation = getFsImplementation();
  if ((await isDirectory(telemetryDir, fsImplementation)) && (await isDirectory(runsDir, fsImplementation)))
    await cleanupTreeRecursive(runsDir, cutoffDate, fsImplementation, result, {
      entryMatcher: (fileName) => fileName.endsWith(".json"),
    });
  await tryRmdir(telemetryDir, getFsImplementation());
  return result;
}
//@ chunk-pc3x100t.js:28781-28840 placement
/**
 * 清理 shell-snapshots 目录下过期的快照文件。
 */
function cleanupShellSnapshots() {
  return cleanupOldFilesMatching(join(getClaudeConfigDir(), "shell-snapshots"), ".sh", false);
}
//@ chunk-pc3x100t.js:28840-28902 layout
var DELETED_FILE_SUFFIX_RE = /\.deleted-[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
//@ chunk-pc3x100t.js:28902-29419 placement
/**
 * 清理团队目录下各 inboxes 中过期的消息 JSON 文件，并删除空目录。
 */
async function cleanupTeamInboxes() {
  let cutoffDate = getCutoffDate();
  let result = emptyCleanupResult();
  if (cutoffDate === null) return result;
  let fsImplementation = getFsImplementation();
  let teamsDir = getTeamsDir();
  for (let teamEntry of await fsImplementation.readdir(teamsDir).catch(() => [])) {
    if (!teamEntry.isDirectory()) continue;
    if (DELETED_FILE_SUFFIX_RE.test(teamEntry.name)) {
      try {
        await fsImplementation.rm(join(teamsDir, teamEntry.name), {
          recursive: true,
          force: true,
        });
        result.messages++;
      } catch {
        result.errors++;
      }
      continue;
    }
    let inboxesDir = join(teamsDir, teamEntry.name, "inboxes");
    if (await isDirectory(inboxesDir, fsImplementation)) {
      for (let inboxEntry of await fsImplementation.readdir(inboxesDir).catch(() => [])) {
        if (!inboxEntry.isFile() || !inboxEntry.name.endsWith(".json")) continue;
        try {
          if (await unlinkIfOld(join(inboxesDir, inboxEntry.name), cutoffDate, fsImplementation, result))
            result.messages++;
        } catch {
          result.errors++;
        }
      }
      await tryRmdir(inboxesDir, fsImplementation);
    }
    await tryRmdir(join(teamsDir, teamEntry.name), fsImplementation);
  }
  return result;
}
//@ chunk-pc3x100t.js:29419-30180 placement
/**
 * 清理临时目录中他人遗留、只含过期 stderr.log 的 cc-daemon-* 私有目录（确认归属与 inode 未变后删除）。
 */
async function cleanupDaemonStderrDirs(cutoff, tmpDir = tmpdir_2()) {
  let result = emptyCleanupResult();
  let fs = getFsImplementation();
  let uid = process.getuid?.();
  let entries;
  try {
    entries = await fs.readdir(tmpDir);
  } catch (error) {
    if (!isENOENT(error)) result.errors++;
    return result;
  }
  for (let entry of entries) {
    if (!entry.name.startsWith("cc-daemon-")) continue;
    let sliced = entry.name.slice(10);
    if (
      /^\d+$/.test(sliced) ||
      (uid !== undefined && sliced === String(uid)) ||
      /^[0-9a-f]{16}$/.test(sliced)
    )
      continue;
    let dirPath = join(tmpDir, entry.name);
    try {
      let dirIdentity = await statOwnedPrivateDir(dirPath);
      if (dirIdentity === null) continue;
      let entries = await fs.readdir(dirPath);
      if (entries.length !== 1 || entries[0].name !== "stderr.log") continue;
      let stderrPath = join(dirPath, "stderr.log");
      let stats = await fs.lstat(stderrPath);
      if (!stats.isFile()) continue;
      if (!(stats.mtime < cutoff)) {
        result.filesRetainedFresh++;
        continue;
      }
      let currentIdentity = await statOwnedPrivateDir(dirPath);
      if (
        currentIdentity === null ||
        currentIdentity.dev !== dirIdentity.dev ||
        currentIdentity.ino !== dirIdentity.ino
      )
        continue;
      try {
        await fs.unlink(stderrPath);
      } catch (error) {
        if (isENOENT(error)) continue;
        result.filesPastCutoff++;
        throw error;
      }
      result.messages++;
      await tryRmdir(dirPath, fs);
    } catch (error) {
      if (!isENOENT(error)) result.errors++;
    }
  }
  return result;
}
//@ chunk-pc3x100t.js:30180-30224 placement
var regExp; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-pc3x100t.js:30180", () => {
  regExp = new RegExp(`^${PDF_SCRATCH_DIR_PREFIX}[A-Za-z0-9]{6}$`);
});
//@ chunk-pc3x100t.js:30224-30268 placement
var regExp_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-pc3x100t.js:30224", () => {
  regExp_2 = new RegExp(`^${PREVIEW_COPY_DIR_PREFIX}[A-Za-z0-9]{6}$`);
});
//@ chunk-pc3x100t.js:30268-30777 placement
/**
 * 清理临时目录中匹配模式的过期私有目录（整棵树都早于截止时间时递归删除）。
 */
async function cleanupOldTempDirs(cutoff = getCutoffDate(), tmpDir = tmpdir()) {
  let result = emptyCleanupResult();
  if (cutoff === null) return result;
  let fs = getFsImplementation();
  let entries;
  try {
    entries = await fs.readdir(tmpDir);
  } catch (error) {
    if (!isENOENT(error)) result.errors++;
    return result;
  }
  for (let entry of entries) {
    if (!regExp_2.test(entry.name)) continue;
    let dirPath = join(tmpDir, entry.name);
    try {
      let dirIdentity = await statOwnedPrivateDir(dirPath);
      if (dirIdentity === null) continue;
      if (
        !(
          ((await scanDirectoryForPaths(dirPath, fs, {
            requireCompleteWalk: true,
          })) ?? dirIdentity.mtimeMs) < cutoff.getTime()
        )
      ) {
        result.filesRetainedFresh++;
        continue;
      }
      let currentIdentity = await statOwnedPrivateDir(dirPath);
      if (
        currentIdentity === null ||
        currentIdentity.dev !== dirIdentity.dev ||
        currentIdentity.ino !== dirIdentity.ino
      )
        continue;
      await fs.rm(dirPath, {
        recursive: true,
        force: true,
      });
      result.messages++;
    } catch (error) {
      if (!isENOENT(error)) result.errors++;
    }
  }
  return result;
}
//@ chunk-pc3x100t.js:30777-32869 placement
/**
 * 清理后台守护相关的旧文件：已结算作业与派发记录、无对应作业的 host-managed 文件、过期作业目录（排除固定作业与名册中存活 worker 的作业，必要时回收作业工作树）、daemon 临时 stderr、daemon.log、过期名册与损坏名册备份，以及作业草稿。
 */
async function cleanupDaemonFiles(storageV5, storageBackend) {
  let configDir = getClaudeConfigDir();
  let result = await cleanupOldFilesMatching(join(configDir, "jobs", "settled"), ".json");
  result = addCleanupResults(
    result,
    await cleanupOldFilesMatching(join(configDir, "daemon", "dispatch", "rejected"), ".json"),
  );
  result = addCleanupResults(
    result,
    await cleanupOldFilesMatching(join(configDir, "daemon", "dispatch"), ".json", false),
  );
  result = addCleanupResults(
    result,
    await cleanupOldFilesMatching(join(configDir, "daemon", "auth"), ".json"),
  );
  try {
    let hostManagedDir = join(configDir, "daemon", "host-managed");
    let fsImplementation = getFsImplementation();
    let cutoffDate = getCutoffDate();
    if (cutoffDate)
      for (let entry of await fsImplementation.readdir(hostManagedDir)) {
        if (!entry.isFile()) continue;
        try {
          await fsImplementation.lstat(join(configDir, "jobs", entry.name));
        } catch (error) {
          if (!isENOENT(error)) {
            result.errors++;
            continue;
          }
          try {
            if (await unlinkIfOld(join(hostManagedDir, entry.name), cutoffDate, fsImplementation, result))
              result.messages++;
          } catch (error) {
            if (!isENOENT(error)) result.errors++;
          }
        }
      }
  } catch (error) {
    if (!isENOENT(error)) result.errors++;
  }
  let retentionExemptOff = isRetentionExemptionDisabled();
  let cutoff = getCutoffDate();
  let keepJobIds = new Set();
  if (!retentionExemptOff)
    for (let pinnedJobId of await readPinnedJobIds(storageV5)) keepJobIds.add(pinnedJobId);
  let rosterRead = false;
  let rosterHasLiveWorker = false;
  try {
    let rosterPath = join(configDir, "daemon", "roster.json");
    let stats = await getFsImplementation().lstat(rosterPath);
    if (!stats.isFile() || stats.size > 8388608) throw Error("not a regular file");
    let content = await getFsImplementation().readFile(rosterPath, {
      encoding: "utf-8",
    });
    let roster = jsonParse(content);
    if (roster !== null && typeof roster === "object" && "workers" in roster) {
      let workers = roster.workers;
      if (workers !== null && typeof workers === "object") {
        rosterRead = true;
        for (let [key, value] of Object.entries(workers))
          if (
            value !== null &&
            typeof value === "object" &&
            "pid" in value &&
            typeof value.pid === "number" &&
            isProcessRunning(value.pid) &&
            (await isSameProcessAsync(
              value.pid,
              "procStart" in value && typeof value.procStart === "string" ? value.procStart : undefined,
            ))
          ) {
            keepJobIds.add(key);
            rosterHasLiveWorker = true;
          }
      }
    }
  } catch {}
  result = addCleanupResults(
    result,
    await cleanupOldFilesInDirectory("jobs", {
      exclude: keepJobIds,
      skipIf: async (jobDirPath) => {
        let jobState;
        try {
          jobState = await readJobStateFreshOrNull(jobDirPath, storageV5);
        } catch (error) {
          logError(error);
          logForDebugging(
            `[cleanup] jobs/${basename(jobDirPath)}: job state read threw \u2014 keeping the folder (${errorMessage(error)})`,
            {
              level: "error",
            },
          );
          throw error;
        }
        if (!retentionExemptOff && (jobState === null || !isSettled(jobState))) return true;
        if (jobState?.worktreePath && isSettled(jobState) && cutoff) {
          let reapResult = await reapJobWorktreeIfSafe({
            worktreePath: jobState.worktreePath,
            worktreeBranch: jobState.worktreeBranch,
            originCwd: jobState.originCwd,
            hookBased: jobState.worktreeHookBased,
            cutoff,
            ...{},
          }).catch((error) => {
            logError(error);
            return false;
          });
        }
        return false;
      },
    }),
  );
  if (cutoff !== null) {
    result = addCleanupResults(result, await cleanupDaemonStderrDirs(cutoff));
    let fsImplementation = getFsImplementation();
    for (let logPath of [join(configDir, "daemon.log"), join(configDir, "daemon.log.1")])
      try {
        if (await unlinkIfOld(logPath, cutoff, fsImplementation, result)) result.messages++;
      } catch (error) {
        if (!isENOENT(error)) result.errors++;
      }
    let rosterPath = join(configDir, "daemon", "roster.json");
    try {
      if (
        (await fsImplementation.lstat(rosterPath)).mtime < cutoff &&
        !rosterHasLiveWorker &&
        (rosterRead || retentionExemptOff)
      ) {
        await fsImplementation.unlink(rosterPath);
        result.messages++;
      }
    } catch (error) {
      if (!isENOENT(error)) result.errors++;
    }
    for (let entry of await fsImplementation.readdir(join(configDir, "daemon")).catch(() => [])) {
      if (!entry.isFile() || !entry.name.startsWith("roster.json.corrupt.")) continue;
      try {
        if (await unlinkIfOld(join(configDir, "daemon", entry.name), cutoff, fsImplementation, result))
          result.messages++;
      } catch {
        result.errors++;
      }
    }
  }
  await sweepJobDrafts();
  return result;
}
//@ chunk-pc3x100t.js:32869-32968 layout (2.1.88 match: getConfigBackupDir, 1)
async function getConfigBackupDir() {
  let config = getCutoffDate();
  if (config !== null) await renewGlobalConfigBackup(config);
  return cleanupOldFilesMatching(join(getClaudeConfigDir(), "backups"), "", false, undefined, config);
}
//@ chunk-pc3x100t.js:32968-33230 fingerprint (2.1.88 match: cleanupOldDebugLogs, 0.819)
async function cleanupOldDebugLogs() {
  let cutoffDate = getCutoffDate();
  let result = emptyCleanupResult();
  if (cutoffDate === null) return result;
  let fsImpl = getFsImplementation();
  let debugDir = join(getClaudeConfigDir(), "debug");
  let dirents;
  try {
    dirents = await fsImpl.readdir(debugDir);
  } catch {
    return result;
  }
  for (let dirent of dirents) {
    if (dirent.name === "latest" || !dirent.isFile()) continue;
    try {
      if (await unlinkIfOld(join(debugDir, dirent.name), cutoffDate, fsImpl, result)) result.messages++;
    } catch {
      result.errors++;
    }
  }
  return result;
}
//@ chunk-pc3x100t.js:33230-33294 layout
async function cleanupFeedbackBundles() {
  return cleanupOldFilesMatching(join(getClaudeConfigDir(), "feedback-bundles"), ".zip");
}
//@ chunk-pc3x100t.js:33294-33409 layout
async function cleanupFeedbackDrafts() {
  return cleanupOldFilesMatching(
    join(getClaudeConfigDir(), "feedback", "drafts"),
    (fileName) => fileName.endsWith(".json") || fileName.includes(".json.tmp."),
    true,
    30,
  );
}
//@ chunk-pc3x100t.js:33409-33741 layout
async function cleanupRemoteControlForkSeeds() {
  let forkSeedsDir = join(getClaudeConfigDir(), "remote-control", "fork-seeds");
  let result = await cleanupOldFilesMatching(
    forkSeedsDir,
    (fileName) => fileName.endsWith(".json") || fileName.includes(".json.tmp."),
  );
  if (getCutoffDate() === null) return result;
  let date = new Date();
  let fsImplementation = getFsImplementation();
  for (let entry of await fsImplementation.readdir(forkSeedsDir).catch(() => []))
    try {
      let entryPath = join(forkSeedsDir, entry.name);
      if (entry.isFile() && (await fsImplementation.stat(entryPath)).mtime > date)
        await fsPromisesModule.lutimes(entryPath, date, date);
    } catch {
      result.errors++;
    }
  return result;
}
//@ chunk-pc3x100t.js:33741-33903 layout
async function cleanupTracesAndStartupPerf() {
  let result = await cleanupOldFilesMatching(join(getClaudeConfigDir(), "traces"), ".json");
  let perfResult = await cleanupOldFilesMatching(join(getClaudeConfigDir(), "startup-perf"), ".txt");
  let perfJsonResult = await cleanupOldFilesMatching(join(getClaudeConfigDir(), "startup-perf"), ".json");
  return addCleanupResults(addCleanupResults(result, perfResult), perfJsonResult);
}
//@ chunk-pc3x100t.js:33903-33926 layout
var ONE_DAY_MS; // deferred: uses NON_REGULAR_ERRORS (../services/memorySync/pathScrub.js) of its import cycle while loading; runs once the cycle is complete
var QUIET_FS_ERRNOS;
deferInit("chunk-pc3x100t.js:33903", () => {
  ONE_DAY_MS = 86400000;
  QUIET_FS_ERRNOS = nonRegularErrorSet;
});
//@ chunk-pc3x100t.js:33926-34070 layout
function errnoTelemetryValue(code) {
  if (code === undefined) return lit("none");
  if (!QUIET_FS_ERRNOS.has(code)) return lit("other");
  return code === "ELOOP" ? lit("ELOOP") : code === "EISDIR" ? lit("EISDIR") : lit("ENXIO");
}
//@ chunk-pc3x100t.js:34070-34161 layout
function isQuietFsFailure(error) {
  return (
    error.code === "Failed" && error.telemetryCode !== undefined && QUIET_FS_ERRNOS.has(error.telemetryCode)
  );
}
//@ chunk-pc3x100t.js:34161-34425 layout
function describeMarkerRemoval(removal) {
  if (removal.ok) return "removed it";
  return ("telemetryCode" in removal.error ? removal.error.telemetryCode : undefined) === "EISDIR"
    ? "could not remove it (EISDIR): a directory at the marker path stays and the marker write will keep failing"
    : `could not remove it (${removal.error.code})`;
}
//@ chunk-pc3x100t.js:34425-34888 facade-majority
/**
 * .last-cleanup 标记不是普通文件时尝试修复并上报 tengu_cleanup_throttle_marker。
 */
async function healRefusedSentinelLeaf(storageV5) {
  let statResult = await storageV5.statMeta(STORAGE_SPACES.state("last-cleanup"));
  if (statResult.ok || statResult.error.code === "NotFound" || !isQuietFsFailure(statResult.error)) return;
  logEvent("tengu_cleanup_throttle_marker", {
    marker: lit("last-cleanup"),
    verdict: lit("not_regular_rerun"),
    code: fromEnum(statResult.error.code),
    errno: errnoTelemetryValue(
      "telemetryCode" in statResult.error ? statResult.error.telemetryCode : undefined,
    ),
  });
  let deleteResult = await storageV5.delete(STORAGE_SPACES.state("last-cleanup"));
  logForDebugging(
    `.last-cleanup: sentinel is not a regular file (${formatStorageError(statResult.error)}) \u2014 ${describeMarkerRemoval(deleteResult)}; rewriting`,
    {
      level: "warn",
    },
  );
}
//@ chunk-pc3x100t.js:34888-34982 layout
var STAGING_MARKER_FILES = [
  ".npm-cache-cleanup",
  ".version-cleanup",
  ".last-cleanup",
  ".deep-link-register-failed",
];
//@ chunk-pc3x100t.js:34982-35268 facade-majority (2.1.88 match: cleanupOldFilesInDirectory, 0.454)
/**
 * 删除配置目录下过期（1 天）的 staging 标记文件（.npm-cache-cleanup、.version-cleanup 等），每进程一次。
 */
async function reapStaleHousekeepingStagingFiles(claudeConfigDir, backgroundHousekeeping) {
  if (!backgroundHousekeeping.claimStagingReap()) return;
  let entries;
  try {
    entries = await fsPromisesModule.readdir(claudeConfigDir);
  } catch {
    return;
  }
  let staleBeforeMs = Date.now() - ONE_DAY_MS;
  await Promise.all(
    entries
      .filter((fileName) => STAGING_MARKER_FILES.some((markerName) => isOwnTempName(fileName, markerName)))
      .map(async (fileName) => {
        let filePath = join(claudeConfigDir, fileName);
        try {
          let stats = await fsPromisesModule.lstat(filePath);
          if (stats.isFile() && stats.mtimeMs < staleBeforeMs) await fsPromisesModule.unlink(filePath);
        } catch {}
      }),
  );
}
//@ chunk-pc3x100t.js:35268-35859 callgraph-witnessed (2.1.88 match: cleanupOldFileHistoryBackups, 0.644)
async function cleanupOldFileHistoryBackups() {
  let cutoffDate = getCutoffDate();
  let fsImpl = emptyCleanupResult();
  if (cutoffDate === null) return fsImpl;
  let configDir = getFsImplementation();
  for (let configDir_2 of HOST_FUNCTION_CATEGORIES) {
    let fileHistoryStorageDir = join(getClaudeConfigDir(), configDir_2);
    let dirStats = await configDir.lstat(fileHistoryStorageDir).catch((error) => {
      if (!isENOENT(error)) fsImpl.errors++;
      return null;
    });
    if (dirStats === null || !dirStats.isDirectory()) continue;
    let dirents;
    try {
      dirents = await configDir.readdir(fileHistoryStorageDir);
    } catch {
      continue;
    }
    let dirChanged = false;
    for (let dirent of dirents) {
      let entryPath = join(fileHistoryStorageDir, dirent.name);
      try {
        if (!((await configDir.stat(entryPath)).mtime < cutoffDate)) continue;
        let currentStats = await configDir.lstat(fileHistoryStorageDir).catch(() => null);
        if (
          currentStats === null ||
          !currentStats.isDirectory() ||
          currentStats.dev !== dirStats.dev ||
          currentStats.ino !== dirStats.ino
        ) {
          dirChanged = true;
          break;
        }
        if (dirent.isDirectory())
          await configDir.rm(entryPath, {
            recursive: true,
            force: true,
          });
        else await configDir.unlink(entryPath);
        fsImpl.messages++;
      } catch {
        fsImpl.errors++;
      }
    }
    if (!dirChanged) await tryRmdir(fileHistoryStorageDir, configDir);
  }
  return fsImpl;
}
//@ chunk-pc3x100t.js:35859-36360 affinity
async function cleanupTinyMemoryFiles() {
  let result = emptyCleanupResult();
  let cutoffDate = getCutoffDate();
  if (cutoffDate === null) return result;
  let projectsDir = join(getMemoryBaseDir(), "projects");
  let fsImplementation = getFsImplementation();
  let dirStats = await fsImplementation.lstat(projectsDir).catch((error) => {
    if (!isENOENT(error)) result.errors++;
    return null;
  });
  if (dirStats === null || !dirStats.isDirectory()) return result;
  let projectEntries = await fsImplementation.readdir(projectsDir).catch((error) => {
    if (!isENOENT(error)) result.errors++;
    return [];
  });
  for (let projectEntry of projectEntries) {
    if (!projectEntry.isDirectory()) continue;
    let tinyMemoryDir = join(projectsDir, projectEntry.name, "tiny_memory");
    let tinyMemoryStats = await fsImplementation.lstat(tinyMemoryDir).catch((error) => {
      if (!isENOENT(error)) result.errors++;
      return null;
    });
    if (tinyMemoryStats === null || !tinyMemoryStats.isDirectory()) continue;
    await cleanupTreeRecursive(tinyMemoryDir, cutoffDate, fsImplementation, result, {
      countEnumerationFailures: true,
    });
  }
  return result;
}
//@ chunk-pc3x100t.js:36360-36631 sole-consumer
async function cleanupMemoryProposals() {
  let result = emptyCleanupResult();
  let cutoffDate = getCutoffDate();
  if (cutoffDate === null) return result;
  let projectsDir = join(getMemoryBaseDir(), "projects");
  let fsImplementation = getFsImplementation();
  let projectEntries = await fsImplementation.readdir(projectsDir).catch(() => []);
  for (let projectEntry of projectEntries) {
    if (!projectEntry.isDirectory()) continue;
    result = addCleanupResults(
      result,
      await findModifiedFiles(
        join(projectsDir, projectEntry.name, "memory", "proposals"),
        cutoffDate,
        fsImplementation,
      ),
    );
  }
  return addCleanupResults(
    result,
    await findModifiedFiles(join(getAutoMemPath(), "proposals"), cutoffDate, fsImplementation),
  );
}
//@ chunk-pc3x100t.js:37170-39858 facade-majority (2.1.88 match: cleanupOldMessageFilesInBackground, 0.123)
/**
 * 后台保留期清理（cleanupPeriodDays，默认 30 天）：错误日志、会话、计划、文件历史、调试日志、反馈包、MCP 缓存、worktree 等数十类数据，结果上报 tengu_retention_sweep。
 */
async function cleanupOldMessageFilesInBackground(storageV5) {
  await cleanupOldImageCaches();
  let seedAdminSweep = await sweepSeedAdminSafely();
  let seedAdminFacts = {
    seedAdminRemoved: seedAdminSweep.removed,
    seedAdminErrors: seedAdminSweep.errors,
    seedAdminHeld: seedAdminSweep.held,
    seedAdminRefused: fromEnum(seedAdminSweep.refused),
  };
  let retentionSweep = await startRetentionSweep();
  let hookFacts =
    retentionSweep === "asked"
      ? {}
      : {
          hooksUnasked: fromEnum(retentionSweep),
        };
  let skipReason = await retentionCleanupSkipReason(storageV5);
  let cleanupPeriodDays = getSettings_DEPRECATED()?.cleanupPeriodDays;
  if (skipReason !== null) {
    logEvent("tengu_retention_sweep", {
      skipped: true,
      skipReason: fromEnum(skipReason),
      ...seedAdminFacts,
      ...hookFacts,
    });
    logRetentionSweep({
      result: "skipped",
      skipReason,
      periodDays: cleanupPeriodDays ?? CEL_MAX_ITEMS,
      usedDefault: cleanupPeriodDays === undefined,
    });
    if (skipReason !== "diskless") await cleanupTrashRoots(storageV5);
    return skipReason;
  }
  logEvent("tengu_retention_sweep", {
    phase: lit("start"),
    ...seedAdminFacts,
    ...hookFacts,
  });
  let sharedCutoffDate = undefined;
  let sessionCleanupPromise;
  let runSessionCleanup = () => (sessionCleanupPromise ??= cleanupOldSessionFiles(sharedCutoffDate));
  await using sessionCleanupResource = {
    [Symbol.asyncDispose]: () =>
      runSessionCleanup().then(
        () => {},
        () => {},
      ),
  };
  await cleanupOldMessageFiles();
  let transcriptResult = await cleanupOldTranscripts();
  let results = [transcriptResult];
  results.push(await cleanupOldPlanFiles(storageV5));
  results.push(await resolveBackupPath());
  results.push(await getSessionEnvDirPath());
  results.push(await getTaskOutputDir());
  results.push(await uploadsDir());
  results.push(await cleanupDevMods());
  results.push(await cleanupBridgeSpawnDirs(storageV5));
  results.push(await cleanupBashEditDiffs());
  results.push(await cleanupPeerTransferSpool());
  results.push(await cleanupUsageData());
  results.push(await cleanupSkillsSyncDirs(storageV5));
  results.push(await cleanupOwnedSyncRoots(storageV5));
  results.push(await cleanupSkillsSyncTrashRoots(storageV5));
  results.push(await cleanupPluginsSyncTrashRoots(storageV5));
  results.push(await cleanupAccountSyncDirs(storageV5));
  results.push(await cleanupPluginsSyncRootEntries(storageV5));
  results.push(await cleanupPluginStore());
  results.push(await cleanupRemovedPluginFiles());
  results.push(await cleanupOldSessionEnvDirs());
  results.push(await cleanupTempTranscripts());
  results.push(await cleanupOldTempDirs());
  results.push(await cleanupOldSpeculationDir());
  results.push(await cleanupShares());
  results.push(await cleanupTelemetry());
  results.push(await cleanupOldDebugLogs());
  results.push(await cleanupFeedbackBundles());
  results.push(await cleanupFeedbackDrafts());
  results.push(await cleanupRemoteControlForkSeeds());
  results.push(await cleanupTracesAndStartupPerf());
  results.push(await getDumpPromptsPath());
  results.push(await cleanupShellSnapshots());
  results.push(await cleanupTeamInboxes());
  results.push(await cleanupDaemonFiles(storageV5, sharedCutoffDate));
  results.push(await getConfigBackupDir());
  results.push(await cleanupHfiAuthFile());
  results.push(await cleanupMcpAuthCache());
  results.push(await cleanupDeviceUnboundCreates());
  results.push(await cleanupMcpDiscoverVerdicts());
  results.push(await cleanupDeviceMcpNotNow());
  results.push(await cleanupServedCalls());
  results.push(await cleanupUnattendedServingRuns());
  results.push(await cleanupSettingsReviewStore());
  results.push(await cleanupMcpDiscoveryCache());
  results.push(await cleanupTeamDiscoveryCache());
  results.push(await cleanupModelAccessMemory());
  results.push(await cleanupModelCatalogCache());
  results.push(await cleanupOldFileHistoryBackups());
  results.push(await cleanupTinyMemoryFiles());
  results.push(await cleanupMemoryProposals());
  let historyPrune = {
    entriesPruned: 0,
    errors: 0,
  };
  let cutoffDate = getCutoffDate();
  if (cutoffDate !== null) {
    await cleanupOldPastes(cutoffDate, storageV5);
    let removedWorktrees = await cleanupSessionImageDirs(cutoffDate);
    results.push({
      ...emptyCleanupResult(),
      messages: removedWorktrees.removed,
      errors: removedWorktrees.errors,
    });
    let worktreesRemoved = await cleanupStaleAgentWorktrees(cutoffDate, sharedCutoffDate, false);
    if (worktreesRemoved > 0)
      logEvent("tengu_worktree_cleanup", {
        removed: worktreesRemoved,
      });
    await cleanupStaleConfigTempFiles(getClaudeConfigDir(), cutoffDate);
    if (
      hasComplianceTaint("hipaa") &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_hipaa_history_retention_prune", true)
    ) {
      historyPrune = await pruneHistoryFile(cutoffDate);
      results.push({
        ...emptyCleanupResult(),
        errors: historyPrune.errors,
      });
    }
  }
  results.push(await cleanupTrashRoots(storageV5));
  results.push(await runSessionCleanup());
  let reduced = results.reduce(addCleanupResults, emptyCleanupResult());
  logEvent("tengu_retention_sweep", {
    phase: lit("complete"),
    skipped: false,
    transcriptsDeleted: transcriptResult.transcripts,
    transcriptsExemptedDesktop: transcriptResult.transcriptsExemptedDesktop,
    sessionFilesDeleted: transcriptResult.messages,
    artifactsDeleted: reduced.messages,
    filesRetainedFresh: reduced.filesRetainedFresh,
    filesPastCutoff: reduced.filesPastCutoff,
    errors: reduced.errors,
    historyEntriesPruned: historyPrune.entriesPruned,
    periodDays: cleanupPeriodDays ?? CEL_MAX_ITEMS,
    usedDefault: cleanupPeriodDays === undefined,
  });
  logRetentionSweep({
    result: "complete",
    periodDays: cleanupPeriodDays ?? CEL_MAX_ITEMS,
    usedDefault: cleanupPeriodDays === undefined,
    transcriptsDeleted: transcriptResult.transcripts,
    transcriptsExemptedDesktop: transcriptResult.transcriptsExemptedDesktop,
    sessionFilesDeleted: transcriptResult.messages,
    artifactsDeleted: reduced.messages,
    filesRetainedFresh: reduced.filesRetainedFresh,
    filesPastCutoff: reduced.filesPastCutoff,
    errorCount: reduced.errors,
    historyEntriesPruned: historyPrune.entriesPruned,
  });
}
//@ chunk-2zeqrfs5.js:7772-8029 fingerprint (2.1.88 match: cleanupSingleDirectory, 0.408)
async function cleanupSingleDirectory(dirPath, cutoffDate) {
  let mtimeMs = (await dirPath.fs.lstat(cutoffDate)).mtimeMs;
  let entries = await dirPath.fs.readdir(cutoffDate);
  for (let dirent of entries) {
    let cutoffDate_2 = dirPath.path.join(cutoffDate, dirent);
    try {
      let stats = await dirPath.fs.lstat(cutoffDate_2);
      mtimeMs = Math.max(mtimeMs, stats.mtimeMs);
      if (stats.isDirectory())
        mtimeMs = Math.max(mtimeMs, await cleanupSingleDirectory(dirPath, cutoffDate_2));
    } catch (error) {
      if (!isENOENT(error)) throw error;
    }
  }
  return mtimeMs;
}
export {
  IMAGES,
  IMAGE_FILE_NAME_RE,
  cleanupSingleDirectory,
  retentionCleanupSkipReason,
  cleanupOldFilesMatching,
  emptyCleanupResult,
  tryRmdir,
  cleanupOldMessageFilesInBackground,
  reapStaleHousekeepingStagingFiles,
  healRefusedSentinelLeaf,
  isCleanupQuietFsErrno,
  entryKind,
  isRetentionCleanupSafe,
  getCutoffDate,
  cleanupOldFilesInDirectory,
  isRetentionExemptionDisabled,
};
