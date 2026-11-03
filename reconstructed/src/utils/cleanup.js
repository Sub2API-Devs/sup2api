/**
 * utils/cleanup.ts
 *
 * 并入旧版已有路径：清理（转录保留期清理）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/cleanup.ts
 * pieces: chunk-23fm9f0d.js (107), chunk-4nhpaxz9.js (1), chunk-kqn19nw9.js (3)
 * attribution: placement 35, facade-majority 8, layout 21, fingerprint 8, file-local 1, callgraph-witnessed 2, affinity 8, sole-consumer 28
 */
import { join, basename, dirname } from "path";
import { homedir, tmpdir as tmpdir_2 } from "os";
import * as fsPromisesModule from "fs/promises";
import { lstat, readdir, unlink, rmdir } from "fs/promises";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, string, E } from "../../vendor/zod/v4/classic/schemas.js";
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
import { isOwnTempName, publishWriteAtomic, isTempFileName } from "./atomicPublishWrite.js";
import { isDiskless, getSessionId } from "../bootstrap/state.js";
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
import { isFsInaccessible, isEnvFsErrno, isENOENT, errorMessage, getErrnoCode } from "./errors.js";
import { getFsImplementation } from "./fsOperations.js";
import { logError } from "./log.js";
import { CACHE_PATHS } from "./cachePaths.js";
import { scanDirectoryForPaths } from "./suggestions/directoryCompletion.js";
import { getProjectsDir } from "./sessionStorage.js";
import { claudeTempDir, PDF_SCRATCH_DIR_PREFIX, PREVIEW_COPY_DIR_PREFIX, tmpdir } from "./tempDir.js";
import {
  LITE_READ_BUF_SIZE,
  readHeadAndTail,
  anchorOffsetTail,
  extractFieldFromFirstEntryStrict,
  extractFieldFromLastEntryStrict,
} from "./sessionStoragePortable.js";
import { isHostEntrypointName } from "./entrypointKinds.js";
import { TOOL_RESULTS_SUBDIR } from "./toolResultStorage.js";
import { getClaudeConfigDir, getClaudeConfigDirOrNull, getTeamsDir } from "./envUtils.js";
import { accessMemoryPath, providerProbeVerdictsPath } from "./model/thirdPartyModelAccess.js";
import { modelCatalogCacheDir, MASKED_IDS_JSON_2 } from "./model/modelCatalog/maskedIds.js";
import { PUBLISHED_FLOOR_JSON } from "./model/modelCatalog/publishedCatalogFloor.js";
import { isProcessRunning } from "./genericProcessUtils.js";
import { pruneReviewEntriesBefore } from "./settings/settingsReview.js";
import { isHashTempFile } from "../services/memorySync/syncFiles.js";
import { REMOTE_SETTINGS_CONSENT_FILE } from "../services/remoteManagedSettings/consentRecords.js";
import { mapped, checkCacheFilePermissions } from "./settings/policyCertificates.js";
import { openHistoryFile, HistoryFileError, HISTORY_FILE_RETRY_OPTIONS } from "./historyFile.js";
import { lock, releaseLockQuietly } from "./lockfile.js";
import { resetPlanFileCacheToUnknown } from "./plans.js";
import { verifySyncRoot, readSyncMarker, checkSyncRoots } from "./claudeAiSync/syncOwnedRoot.js";
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
import { getCacheBreakDiffPath } from "../services/api/promptCacheBreakDetection.js";
import { readPinnedJobIds, readJobStateFreshOrNull, isSettled } from "../services/daemon/jobState.js";
import { isSameProcessAsync } from "./processIdentity.js";
import { reapJobWorktreeIfSafe, cleanupStaleAgentWorktrees } from "./worktree.js";
import { sweepJobDrafts } from "../daemon/jobs/draftSweep.js";
import { nonRegularErrorSet } from "../services/memorySync/pathScrub.js";
import { lit, fromEnum } from "../services/analytics/safeMetadata.js";
import { logEvent } from "../services/analytics/index.js";
import { formatStorageError } from "./storage/storageErrors.js";
import { getMemoryBaseDir, getAutoMemPath } from "../memdir/paths.js";
import { findModifiedFiles } from "./filePersistence/outputsScanner.js";
import { cleanupOldImageCaches } from "./imageStore.js";
import { logRetentionSweep } from "./telemetry/thirdPartyEventRecords.js";
import { resolveBackupPath } from "./fileHistory.js";
import { getSessionEnvDirPath } from "./sessionEnvironment.js";
import { uploadsDir } from "../bridge/inboundAttachments.js";
import { getDumpPromptsPath } from "../services/api/dumpPrompts.js";
import { getConfigBackupDir } from "./config.js";
import { getMcpAuthCachePath } from "../services/mcp/client.js";
import { cleanupOldPastes } from "./pasteStore.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { normalizeUuidOrNull } from "./agentId.js";
import { pinWriteTarget } from "./fsSafety/pathRevalidation.js";

//@ chunk-23fm9f0d.js:2482-2525 placement
var MCP_SKILL_ARCHIVES = "mcp-skill-archives";
var META_JSON = "meta.json";
//@ chunk-23fm9f0d.js:2525-2590 placement
/**
 * 资源元数据（uri、cacheKey、fetchedAt）的 schema。
 */
var assetMetaSchema = DoctorLazy(() =>
  u({
    uri: string().optional(),
    cacheKey: string(),
    fetchedAt: E(),
  }),
);
//@ chunk-23fm9f0d.js:2590-2679 placement
/**
 * 某目录下的资源元数据 JSON 存储。
 */
function assetMetaStore(e) {
  return createJsonStore(join(e, META_JSON), () => assetMetaSchema().nullable(), {
    defaultValue: null,
    ensureDir: true,
  });
}
//@ chunk-23fm9f0d.js:2679-2711 placement
/**
 * 内容哈希的十六进制长度（64）。
 */
var HASH_HEX_CHARS = 64;
var HASH_PREFIX_CHARS = 16;
var CONTENT_ADDRESSED_NAME_CHARS = HASH_HEX_CHARS + 2 + HASH_HEX_CHARS + 2 + HASH_PREFIX_CHARS;
//@ chunk-23fm9f0d.js:2711-2781 placement
/**
 * 读取资源元数据，失败返回 null。
 */
async function readAssetMetaOrNull(e) {
  try {
    return await assetMetaStore(e).read();
  } catch {
    return null;
  }
}
//@ chunk-23fm9f0d.js:3149-3210 placement
var cacheIndexEntrySchema = DoctorLazy(() =>
  u({
    key: string(),
    integrity: string().nullable(),
    time: E(),
  }),
);
//@ chunk-23fm9f0d.js:3210-3995 placement
async function startRetentionSweep(e = REREAD_INITIAL_DELAY_MS) {
  let pluginRegistry = getPluginRegistry();
  let s = {
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
              s.end = pluginRegistry.hookRegistrationEnded.subscribe(resolve);
            });
            s.end();
          }
          if (abortController.signal.aborted) return false;
          await queueHookedSettingsMerge("a retention sweep starts");
          return true;
        }),
      sleep(e, abortController.signal).then(() => false),
    ]).finally(() => abortController.abort())
  )
    return pluginRegistry.hooksUnknownCause === undefined ? "asked" : "load_failed";
  s.end();
  let m = pluginRegistry.hookRegistrationInFlight !== undefined ? "load_running" : "unanswered";
  let g = pluginRegistry.hookRegistrationOwed ? "load_owed" : m;
  logForDebugging(
    `Retention cleanup: the settings.read hooks were not asked within ${e} ms (${g}); the sweep begins on the merge as last held.`,
  );
  return g;
}
//@ chunk-23fm9f0d.js:3995-4085 placement
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
//@ chunk-23fm9f0d.js:4085-4172 placement
/**
 * 判断文件名是否为规范的会话名（单拼写且小写）。
 */
function isCanonicalSessionName(e) {
  let r = storageNameSpellings(e);
  return isValidKeySegment(e) && r.length === 1 && r[0] === e.toLowerCase() && isNameableSessionId(e);
}
//@ chunk-23fm9f0d.js:4172-4329 placement
function isAutoModeStateFile(name) {
  return (
    DESKTOP_SIDE_FILES.some((r) => name === r || isOwnTempName(name, r)) ||
    (name.startsWith(AUTO_MODE_DUMP) && (name.endsWith(".json") || name.includes(".json.tmp."))) ||
    (name.startsWith(AUTO_MODE_ENV_EDIT) && name.endsWith(".md"))
  );
}
//@ chunk-23fm9f0d.js:4329-5677 facade-majority
async function retentionCleanupSkipReason(e) {
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
    for (let s of RETENTION_POLICY_KEYS) {
      let n = await rawSettingsKeyPresence(
        s,
        e,
        s === "desktopSessionCleanupPeriodDays"
          ? {
              presenceSources: ["userSettings", "flagSettings"],
            }
          : undefined,
      );
      if (n === "unknowable") {
        logForDebugging(
          `Skipping cleanup: a settings file could not be read or parsed, so ${s} may be set to a value that cannot be seen. Fix the settings file (see /doctor) to re-enable cleanup.`,
        );
        return "settings_unknowable";
      }
      if (n === "present") {
        logForDebugging(
          `Skipping cleanup: settings have validation errors but ${s} was explicitly set. Fix settings errors to enable cleanup.`,
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
//@ chunk-23fm9f0d.js:5677-5740 facade-majority
async function isRetentionCleanupSafe(e, r) {
  await startRetentionSweep(r);
  return (await retentionCleanupSkipReason(e)) === null;
}
//@ chunk-23fm9f0d.js:5740-5838 layout
/**
 * 由天数算出清理截止日期（非法日期返回 null）。
 */
function cutoffDateFromDays(e) {
  let date = new Date(Date.now() - e * 24 * 60 * 60 * 1000);
  return Number.isNaN(date.getTime()) ? null : date;
}
//@ chunk-23fm9f0d.js:5838-5950 facade-majority = getCutoffDate (1)
/**
 * 计算清理截止日期；cleanupPeriodDays=0 时返回 null（不清理）。
 */
function getCutoffDate(e) {
  let cleanupPeriodDays = (getSettings_DEPRECATED() || {}).cleanupPeriodDays ?? CEL_MAX_ITEMS;
  if (cleanupPeriodDays === 0) return null;
  if (e !== undefined && e < cleanupPeriodDays) cleanupPeriodDays = e;
  return cutoffDateFromDays(cleanupPeriodDays);
}
//@ chunk-23fm9f0d.js:5950-5989 placement
/**
 * 桌面会话“已释放”标记文件的后缀。
 */
var DESKTOP_RELEASED_SUFFIX = ".desktop-released.json";
var MAX_RELEASE_STATE_BYTES = 4096;
//@ chunk-23fm9f0d.js:5989-6027 placement
/**
 * 由会话文件路径推出其释放状态文件路径。
 */
function releasedStatePath(e) {
  return e.slice(0, -6) + DESKTOP_RELEASED_SUFFIX;
}
//@ chunk-23fm9f0d.js:6027-6068 placement
/**
 * 释放状态文件的 schema。
 */
var releaseStateSchema = DoctorLazy(() =>
  u({
    reason: string().optional(),
  }),
);
//@ chunk-23fm9f0d.js:6068-6363 placement
async function getDumpReleaseState(e, fsImplementation, cutoffDate) {
  let fileFdGated = await fsImplementation.readFileFdGated(e, MAX_RELEASE_STATE_BYTES);
  if (fileFdGated === null) return "none";
  let f;
  try {
    let i = releaseStateSchema().safeParse(jsonParse(fileFdGated.content));
    f = i.success ? i.data.reason : undefined;
  } catch {
    return "none";
  }
  if (f === "delete") return "release-now";
  if (f === "archive") return fileFdGated.stats.mtime < cutoffDate ? "release-now" : "grace";
  return "none";
}
//@ chunk-23fm9f0d.js:6363-6416 placement
/**
 * 判断释放状态对应的会话 id 是否合法。
 */
function isValidReleaseSessionId(e) {
  return /^[0-9A-Za-z_-]{1,64}$/.test(e);
}
//@ chunk-23fm9f0d.js:6416-6478 layout
/**
 * 取桌面会话清理的截止日期。
 */
function desktopCleanupCutoff() {
  return getRetentionCutoff("desktopSessionCleanupPeriodDays", DEFAULT_DESKTOP_CLEANUP_DAYS);
}
//@ chunk-23fm9f0d.js:6478-6600 placement = _temp5 (1)
function getRetentionCutoff(e, r) {
  let s = getSettingsForSourceTightenOnly("userSettings")?.[e];
  let n = getSecuritySensitiveSetting(e)[0] ?? (s !== undefined && r !== 0 && s > r ? s : r);
  if (n === 0) return null;
  return cutoffDateFromDays(n);
}
//@ chunk-23fm9f0d.js:6600-6782 layout
function isRetentionPolicyManaged() {
  if (getSettingsForSource("policySettings")?.cleanupPeriodDays !== undefined) return true;
  if (anyAdminPolicyTierGovernsRetention()) return true;
  return getPolicySettingsLoadErrors().some(
    (e) =>
      e.file !== PARENT_MANAGED_SETTINGS_SOURCE_LABEL &&
      (RETENTION_POLICY_KEYS.some((r) => r === e.path) || e.severity !== "warning"),
  );
}
//@ chunk-23fm9f0d.js:6782-6833 facade-majority
function isRetentionExemptionDisabled() {
  return isRetentionPolicyManaged() || hasComplianceTaint("hipaa") || hasComplianceTaint("zdr");
}
//@ chunk-23fm9f0d.js:6833-6913 layout
function emptyCleanupResult() {
  return {
    messages: 0,
    errors: 0,
    filesRetainedFresh: 0,
    filesPastCutoff: 0,
  };
}
//@ chunk-23fm9f0d.js:6913-7106 layout
function addCleanupResults(e, r) {
  return {
    messages: e.messages + r.messages,
    errors: e.errors + r.errors,
    filesRetainedFresh: e.filesRetainedFresh + r.filesRetainedFresh,
    filesPastCutoff: e.filesPastCutoff + r.filesPastCutoff,
  };
}
//@ chunk-23fm9f0d.js:7106-7217 fingerprint = convertFileNameToDate (1)
function convertFileNameToDate(filename) {
  let isoStr = firstLineOf(filename, ".").replace(/T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z/, "T$1:$2:$3.$4Z");
  return new Date(isoStr);
}
//@ chunk-23fm9f0d.js:7217-7253 facade-majority
/**
 * 清理时可静默忽略的文件系统错误（不存在/已删除等）。
 */
function isCleanupQuietFsErrno(error) {
  return isFsInaccessible(error) || isEnvFsErrno(error);
}
//@ chunk-23fm9f0d.js:7253-7611 layout
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
//@ chunk-23fm9f0d.js:7611-8033 fingerprint = cleanupOldMessageFiles (0.7)
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
//@ chunk-23fm9f0d.js:8033-8321 fingerprint = unlinkIfOld (0.686)
async function unlinkIfOld(e, cutoffDate, fsImplementation, n, f = cutoffDate, i) {
  let m;
  try {
    m = await fsImplementation.stat(e);
  } catch (error) {
    if (isENOENT(error)) return false;
    throw error;
  }
  if (!(m.mtime < cutoffDate)) {
    n.filesRetainedFresh++;
    return false;
  }
  if (i !== undefined && (await i(e, m))) return false;
  try {
    await fsImplementation.unlink(e);
  } catch (error) {
    if (isENOENT(error)) return false;
    if (f !== null && m.mtime < f) n.filesPastCutoff++;
    throw error;
  }
  return true;
}
//@ chunk-23fm9f0d.js:8321-8396 fingerprint = tryRmdir (1)
async function tryRmdir(dirPath, fsImpl) {
  if (!(await isDirectory(dirPath, fsImpl))) return;
  try {
    await fsImpl.rmdir(dirPath);
  } catch {}
}
//@ chunk-23fm9f0d.js:8396-8413 layout
var SESSION_SUBDIR_NAMES = [ARCHIVE_SYNC, FOLDER_SYNC];
//@ chunk-23fm9f0d.js:8413-9470 layout
async function cleanupSessionDir(sessionDir, cutoffDate, fsImpl, n) {
  try {
    for (let k of SESSION_SUBDIR_NAMES) await cleanupDirFiles(join(sessionDir, k), cutoffDate, fsImpl, n);
    let f = false;
    try {
      let { sweepCheckoutSessionTrash } = await import("./chunk-4nhpaxz9.js");
      let S = await sweepCheckoutSessionTrash(sessionDir, cutoffDate.getTime());
      n.messages += S.removed;
      n.errors += S.errors;
      f = S.newestKeptMs !== null;
    } catch {
      n.errors++;
      f = true;
    }
    let filtered = (await fsImpl.readdir(sessionDir)).filter((k) => !SESSION_SUBDIR_NAMES.includes(k.name));
    let m = null;
    for (let k of filtered) {
      let S = join(sessionDir, k.name);
      let w =
        (await entryKind(k, S, fsImpl)) === "directory"
          ? await scanDirectoryForPaths(S, fsImpl, {
              requireCompleteWalk: true,
            })
          : (await fsImpl.lstat(S)).mtimeMs;
      if (w !== null) m = Math.max(m ?? -1 / 0, w);
    }
    if (!((m ?? (await cleanupOldVersionsThrottled(sessionDir, fsImpl))) < cutoffDate.getTime())) return;
    let included = (
      await Promise.all(
        SESSION_SUBDIR_NAMES.map((k) =>
          fsImpl.lstat(join(sessionDir, k)).then(
            (S) => S.isDirectory(),
            (error) => {
              if (isENOENT(error)) return false;
              throw error;
            },
          ),
        ),
      )
    ).includes(true);
    let D = filtered.toSorted(
      (k, S) => Number(k.name === STEPS_UNDER_WAY_DIR) - Number(S.name === STEPS_UNDER_WAY_DIR),
    );
    if (included || f) {
      let k = false;
      for (let S of D) {
        if (f && S.name === SIDE_GIT) {
          k = (await removeGitObjectsDir(join(sessionDir, S.name), fsImpl)) || k;
          continue;
        }
        await fsImpl.rm(join(sessionDir, S.name), {
          recursive: true,
          force: true,
        });
        k = true;
      }
      if (k) n.messages++;
      return;
    }
    for (let k of D.slice(0, -1))
      await fsImpl.rm(join(sessionDir, k.name), {
        recursive: true,
        force: true,
      });
    await fsImpl.rm(sessionDir, {
      recursive: true,
      force: true,
    });
    n.messages++;
  } catch (error) {
    if (!isENOENT(error)) n.errors++;
  }
}
//@ chunk-23fm9f0d.js:9470-9957 layout
async function cleanupDirFiles(e, r, s, n) {
  if (!(await isDirectory(e, s))) return;
  let f = await s.readdir(e).catch(() => []);
  for (let i of f) {
    let m = await entryKind(i, join(e, i.name), s).catch((error) => {
      if (!isENOENT(error)) n.errors++;
      return "other";
    });
    if (m === "file") {
      try {
        if (await unlinkIfOld(join(e, i.name), r, s, n)) n.messages++;
      } catch {
        n.errors++;
      }
      continue;
    }
    if (m !== "directory") continue;
    let g = join(e, i.name);
    try {
      if (
        ((await scanDirectoryForPaths(g, s, {
          requireCompleteWalk: true,
        })) ?? (await cleanupOldVersionsThrottled(g, s))) < r.getTime()
      ) {
        await s.rm(g, {
          recursive: true,
          force: true,
        });
        n.messages++;
      }
    } catch (error) {
      if (!isENOENT(error)) n.errors++;
    }
  }
  await tryRmdir(e, s);
}
//@ chunk-23fm9f0d.js:9957-10234 layout
async function entryKind(e, r, s) {
  if (e.isDirectory()) return "directory";
  if (e.isFile()) return "file";
  if (e.isSymbolicLink() || e.isFIFO() || e.isSocket() || e.isBlockDevice() || e.isCharacterDevice())
    return "other";
  let stats = await s.lstat(r);
  return stats.isDirectory() ? "directory" : stats.isFile() ? "file" : "other";
}
//@ chunk-23fm9f0d.js:10234-10289 file-local
async function cleanupOldVersionsThrottled(e, fsImplementation) {
  return (await fsImplementation.lstat(e)).mtimeMs;
}
//@ chunk-23fm9f0d.js:10289-10515 callgraph-witnessed = cleanupOldSessionFiles (0.308)
async function cleanupOldSessionFiles(e) {
  let cutoffDate = getCutoffDate();
  let s = emptyCleanupResult();
  if (cutoffDate === null) return s;
  let projectsDir = getProjectsDir();
  let fsImpl = getFsImplementation();
  for (let i of await fsImpl.readdir(projectsDir).catch(() => [])) {
    let projectDir = join(projectsDir, i.name);
    let sessionDir = join(projectDir, CLOUD_SNAPSHOTS_DIR);
    if (i.isDirectory() && (await isDirectory(sessionDir, fsImpl))) {
      await cleanupSessionDir(sessionDir, cutoffDate, fsImpl, s);
      await tryRmdir(projectDir, fsImpl);
    }
  }
  return s;
}
//@ chunk-23fm9f0d.js:10515-10798 affinity
async function removeGitObjectsDir(e, r) {
  let s = e;
  let n = false;
  for (let f of ["objects", "info", "alternates"]) {
    if (!(await r.lstat(s)).isDirectory()) {
      await r.rm(s, {
        recursive: true,
        force: true,
      });
      return true;
    }
    for (let i of await r.readdir(s))
      if (i.name !== f) {
        await r.rm(join(s, i.name), {
          recursive: true,
          force: true,
        });
        n = true;
      }
    s = join(s, f);
  }
  return n;
}
//@ chunk-23fm9f0d.js:10798-10879 affinity
async function isDirectory(e, fsImplementation) {
  try {
    return (await fsImplementation.lstat(e)).isDirectory();
  } catch {
    return false;
  }
}
//@ chunk-23fm9f0d.js:10879-11309 affinity
async function cleanupTreeRecursive(e, cutoffDate, fsImplementation, n, f = {}) {
  let { entryMatcher } = f;
  let m = await fsImplementation.readdir(e).catch((error) => {
    if (f.countEnumerationFailures === true && !isENOENT(error)) n.errors++;
    return [];
  });
  for (let g of m) {
    let y = join(e, g.name);
    if (g.isDirectory()) await cleanupTreeRecursive(y, cutoffDate, fsImplementation, n, f);
    else if (entryMatcher !== undefined && !entryMatcher(g.name));
    else if (g.isFile())
      try {
        if (await unlinkIfOld(y, cutoffDate, fsImplementation, n)) n.messages++;
      } catch {
        n.errors++;
      }
    else
      try {
        if ((await fsImplementation.lstat(y)).mtime < cutoffDate) {
          await fsImplementation.unlink(y);
          n.messages++;
        }
      } catch {
        n.errors++;
      }
  }
  await tryRmdir(e, fsImplementation);
}
//@ chunk-23fm9f0d.js:11802-16138 placement
/**
 * 按保留期清理旧会话转录（hipaa/zdr/桌面端等情况豁免）。
 */
async function cleanupOldTranscripts() {
  let cutoffDate = getCutoffDate();
  let r = {
    ...emptyCleanupResult(),
    transcripts: 0,
    transcriptsExemptedDesktop: 0,
  };
  if (cutoffDate === null) return r;
  let projectsDir = getProjectsDir();
  let fsImplementation = getFsImplementation();
  let f;
  try {
    f = await fsImplementation.readdir(projectsDir);
  } catch {
    return r;
  }
  let i;
  try {
    i = claudeTempDir();
    if (!(await fsImplementation.lstat(i)).isDirectory()) i = null;
  } catch {
    i = null;
  }
  let m = isRetentionExemptionDisabled();
  let g = desktopCleanupCutoff();
  let buf = null;
  let D = m
    ? undefined
    : async (k, S) => {
        if (hasComplianceTaint("hipaa") || hasComplianceTaint("zdr")) return false;
        if (g !== null && S.mtime < g) return false;
        let dumpReleaseState = await getDumpReleaseState(releasedStatePath(k), fsImplementation, cutoffDate);
        if (dumpReleaseState === "release-now") return false;
        if (dumpReleaseState === "grace") {
          r.transcriptsExemptedDesktop++;
          return true;
        }
        if (S.size === 0) {
          if (
            !(await fsImplementation.stat(k.slice(0, -6)).then(
              (F) => F.isDirectory(),
              () => false,
            ))
          ) {
            r.transcriptsExemptedDesktop++;
            return true;
          }
        }
        buf ??= Buffer.allocUnsafe(LITE_READ_BUF_SIZE);
        let { head, tail } = await readHeadAndTail(k, S.size, buf);
        if (head === "" && S.size > 0) {
          await fsImplementation.stat(k);
          throw Error(
            "transient read failure while classifying a transcript for the desktop retention exemption",
          );
        }
        let C = S.size > LITE_READ_BUF_SIZE ? anchorOffsetTail(tail) : tail;
        let fieldFromFirstEntryStrict = extractFieldFromFirstEntryStrict(head, "entrypoint");
        let fieldFromLastEntryStrict = extractFieldFromLastEntryStrict(C, "entrypoint");
        if (!(
          (fieldFromFirstEntryStrict !== undefined && isHostEntrypointName(fieldFromFirstEntryStrict)) ||
          (fieldFromLastEntryStrict !== undefined && isHostEntrypointName(fieldFromLastEntryStrict))
        ))
          return false;
        let H = basename(k).startsWith("agent-")
          ? (extractFieldFromFirstEntryStrict(head, "sessionId") ??
            extractFieldFromLastEntryStrict(C, "sessionId"))
          : undefined;
        if (H !== undefined && isValidReleaseSessionId(H)) {
          let B = join(dirname(k), `${H}${DESKTOP_RELEASED_SUFFIX}`);
          if (B !== releasedStatePath(k)) {
            if ((await getDumpReleaseState(B, fsImplementation, cutoffDate)) === "release-now") return false;
          }
        }
        r.transcriptsExemptedDesktop++;
        return true;
      };
  for (let k of f) {
    if (!k.isDirectory()) continue;
    let S = join(projectsDir, k.name);
    let w;
    try {
      w = await fsImplementation.readdir(S);
    } catch {
      r.errors++;
      continue;
    }
    w.sort((R, A) => Number(A.isDirectory()) - Number(R.isDirectory()));
    let P = [];
    let O = null;
    let C = new Set(w.filter((R) => R.isFile() && R.name.endsWith(".jsonl")).map((R) => R.name.slice(0, -6)));
    for (let R of w) {
      if (O === null && !R.isDirectory()) O = r.errors;
      if (R.isFile()) {
        if (
          R.name.endsWith(DESKTOP_RELEASED_SUFFIX) &&
          C.has(R.name.slice(0, -DESKTOP_RELEASED_SUFFIX.length))
        )
          continue;
        if (
          !R.name.endsWith(".jsonl") &&
          !R.name.endsWith(".cast") &&
          !R.name.endsWith(".ccr-tip.json") &&
          !R.name.endsWith(".precompact.json") &&
          !R.name.endsWith(DESKTOP_RELEASED_SUFFIX) &&
          !R.name.includes(".desktop-released.json.tmp") &&
          !R.name.endsWith(".dir-sync.json") &&
          !R.name.endsWith(".dir-sync-empty.json") &&
          !R.name.endsWith(".cloud-worktrees.json") &&
          !R.name.includes(".ccr-tip.json.tmp.") &&
          !R.name.includes(".precompact.json.tmp.") &&
          !R.name.includes(".dir-sync.json.tmp.") &&
          !R.name.includes(".dir-sync-empty.json.tmp.") &&
          !R.name.includes(".cloud-worktrees.json.tmp.") &&
          !R.name.includes(".jsonl.compact.tmp.") &&
          !R.name.includes(".jsonl.superseded-")
        )
          continue;
        let A = join(S, R.name);
        try {
          if (
            await unlinkIfOld(
              A,
              cutoffDate,
              fsImplementation,
              r,
              undefined,
              R.name.endsWith(".jsonl") ? D : undefined,
            )
          ) {
            r.messages++;
            if (R.name.endsWith(".jsonl")) {
              r.transcripts++;
              let sliced = R.name.slice(0, -6);
              if (isCanonicalSessionName(sliced)) {
                await fsImplementation.unlink(join(S, `${sliced}.ccr-tip.json`)).catch(() => {});
                await fsImplementation.unlink(join(S, `${sliced}.precompact.json`)).catch(() => {});
                P.push(releasedStatePath(A));
                await fsImplementation
                  .rm(join(S, sliced), {
                    recursive: true,
                    force: true,
                  })
                  .catch(() => {
                    r.errors++;
                  });
                if (i !== null) {
                  let H = join(i, k.name);
                  let B = await fsImplementation.lstat(H).catch(() => null);
                  if (B?.isDirectory()) {
                    await fsImplementation
                      .rm(join(H, sliced), {
                        recursive: true,
                        force: true,
                      })
                      .catch(() => {
                        r.errors++;
                      });
                    if (B.mtime < cutoffDate) await tryRmdir(H, fsImplementation);
                  }
                }
              }
            }
          }
        } catch (error) {
          if (!isENOENT(error)) r.errors++;
        }
      } else if (R.isDirectory()) {
        let A = join(S, R.name);
        if (R.name === "bagel") {
          let F = await scanDirectoryForPaths(A, fsImplementation);
          if (F !== null && F < cutoffDate.getTime())
            try {
              await fsImplementation.rm(A, {
                recursive: true,
                force: true,
              });
              r.messages++;
            } catch {
              r.errors++;
            }
          continue;
        }
        if (R.name === CLOUD_SNAPSHOTS_DIR) continue;
        if (!isCanonicalSessionName(R.name)) {
          let F = await fsImplementation.lstat(A).catch(() => null);
          if (F !== null && F.mtime < cutoffDate) await tryRmdir(A, fsImplementation);
          continue;
        }
        let j = join(A, TOOL_RESULTS_SUBDIR);
        if (await isDirectory(j, fsImplementation)) {
          let F = await fsImplementation.readdir(j).catch(() => []);
          for (let W of F)
            if (W.isFile())
              try {
                if (await unlinkIfOld(join(j, W.name), cutoffDate, fsImplementation, r)) r.messages++;
              } catch {
                r.errors++;
              }
            else if (W.isDirectory()) {
              let Q = join(j, W.name);
              let ne;
              try {
                ne = await fsImplementation.readdir(Q);
              } catch {
                continue;
              }
              for (let ue of ne) {
                if (!ue.isFile()) continue;
                try {
                  if (await unlinkIfOld(join(Q, ue.name), cutoffDate, fsImplementation, r)) r.messages++;
                } catch {
                  r.errors++;
                }
              }
              if (
                ne.length > 0 ||
                (await cleanupOldVersionsThrottled(Q, fsImplementation).catch(() => 1 / 0)) <
                  cutoffDate.getTime()
              )
                await tryRmdir(Q, fsImplementation);
            }
          if (
            F.length > 0 ||
            (await cleanupOldVersionsThrottled(j, fsImplementation).catch(() => 1 / 0)) < cutoffDate.getTime()
          )
            await tryRmdir(j, fsImplementation);
        }
        let H = await fsImplementation.readdir(A).catch(() => []);
        for (let F of H) {
          if (
            !F.isFile() ||
            !(isAutoModeStateFile(F.name) || recordingStampOfStreamName(F.name) !== undefined)
          )
            continue;
          if (F.name === "custom-title.json" && C.has(R.name)) continue;
          try {
            if (await unlinkIfOld(join(A, F.name), cutoffDate, fsImplementation, r)) r.messages++;
          } catch {
            r.errors++;
          }
        }
        let B = join(A, "mcp-tasks");
        if (await isDirectory(B, fsImplementation)) {
          for (let F of await fsImplementation.readdir(B).catch(() => [])) {
            let W = F.name.endsWith(".json") || F.name.includes(".json.tmp.");
            if (!F.isFile() || !W) continue;
            try {
              if (await unlinkIfOld(join(B, F.name), cutoffDate, fsImplementation, r)) r.messages++;
            } catch {
              r.errors++;
            }
          }
          await tryRmdir(B, fsImplementation);
        }
        if (!C.has(R.name))
          for (let F of ["subagents", "workflows", "remote-agents"]) {
            let W = join(A, F);
            if (await isDirectory(W, fsImplementation))
              await cleanupTreeRecursive(W, cutoffDate, fsImplementation, r);
          }
        await tryRmdir(A, fsImplementation);
      }
    }
    if (O !== null && r.errors > O) P.length = 0;
    for (let R of P) await fsImplementation.unlink(R).catch(() => {});
    await tryRmdir(S, fsImplementation);
  }
  return r;
}
//@ chunk-23fm9f0d.js:16138-16495 placement
/**
 * 删除目录中名字匹配（后缀或谓词）且早于保留期截止时间的文件，统计删除数与错误数，可选在清空后删除目录。
 */
async function cleanupOldFilesMatching(e, r, s = true, n, retentionCutoff) {
  let i = retentionCutoff === undefined ? getCutoffDate(n) : retentionCutoff;
  let m = emptyCleanupResult();
  if (i === null) return m;
  let g = retentionCutoff !== undefined || n === undefined ? i : getCutoffDate();
  let y = typeof r === "string" ? (S) => S.endsWith(r) : r;
  let fsImplementation = getFsImplementation();
  let k;
  try {
    k = await fsImplementation.readdir(e);
  } catch {
    return m;
  }
  for (let S of k) {
    if (!S.isFile() || !y(S.name)) continue;
    try {
      if (await unlinkIfOld(join(e, S.name), i, fsImplementation, m, g)) m.messages++;
    } catch {
      m.errors++;
    }
  }
  if (s) await tryRmdir(e, fsImplementation);
  return m;
}
//@ chunk-23fm9f0d.js:16495-16721 placement
async function cleanupHfiAuthFile() {
  let e = emptyCleanupResult();
  let cutoffDate = getCutoffDate();
  if (cutoffDate === null) return e;
  let s = join(getClaudeConfigDir(), "hfi-auth.json");
  try {
    if (await unlinkIfOld(s, cutoffDate, getFsImplementation(), e)) e.messages++;
  } catch (error) {
    if (!isENOENT(error)) {
      logForDebugging(`Failed to clean up HFI auth file: ${error}`, {
        level: "error",
      });
      e.errors++;
    }
  }
  return e;
}
//@ chunk-23fm9f0d.js:16721-16989 placement
async function cleanupTeamDiscoveryCache() {
  let e = emptyCleanupResult();
  let cutoffDate = getCutoffDate();
  if (cutoffDate === null) return e;
  let s = join(getClaudeConfigDir(), "cache", "team-discovery.json");
  try {
    if (await unlinkIfOld(s, cutoffDate, getFsImplementation(), e)) e.messages++;
  } catch (error) {
    if (!isENOENT(error)) {
      e.errors++;
      if (isCleanupQuietFsErrno(error))
        logForDebugging(`cleanup team-discovery-cache failed: ${error.code}`, {
          level: "error",
        });
      else logError(error);
    }
  }
  return e;
}
//@ chunk-23fm9f0d.js:16989-17238 placement
async function cleanupModelAccessMemory() {
  let e = emptyCleanupResult();
  let cutoffDate = getCutoffDate();
  if (cutoffDate === null) return e;
  for (let s of [accessMemoryPath(), providerProbeVerdictsPath()])
    try {
      if (await unlinkIfOld(s, cutoffDate, getFsImplementation(), e)) e.messages++;
    } catch (error) {
      if (!isENOENT(error)) {
        e.errors++;
        if (isCleanupQuietFsErrno(error))
          logForDebugging(`cleanup model-access memory failed: ${error.code}`, {
            level: "error",
          });
        else logError(error);
      }
    }
  return e;
}
//@ chunk-23fm9f0d.js:17238-17344 placement
async function cleanupModelCatalogCache() {
  return cleanupOldFilesMatching(
    modelCatalogCacheDir(),
    (e) =>
      e !== MASKED_IDS_JSON_2 &&
      e !== PUBLISHED_FLOOR_JSON &&
      (e.endsWith(".json") || e.includes(".json.tmp.")),
  );
}
//@ chunk-23fm9f0d.js:17604-17882 sole-consumer
async function cleanupDeviceUnboundCreates() {
  let e = emptyCleanupResult();
  let cutoffDate = getCutoffDate();
  if (cutoffDate === null) return e;
  let s = join(getClaudeConfigDir(), "state", "device-unbound-creates.json");
  try {
    if (await unlinkIfOld(s, cutoffDate, getFsImplementation(), e)) e.messages++;
  } catch (error) {
    if (!isENOENT(error)) {
      e.errors++;
      if (isCleanupQuietFsErrno(error))
        logForDebugging(`cleanup device-unbound-creates failed: ${error.code}`, {
          level: "error",
        });
      else logError(error);
    }
  }
  return e;
}
//@ chunk-23fm9f0d.js:17882-18158 sole-consumer
async function cleanupMcpDiscoverVerdicts() {
  let e = emptyCleanupResult();
  let cutoffDate = getCutoffDate();
  if (cutoffDate === null) return e;
  let s = join(getClaudeConfigDir(), "state", "mcp-discover-verdicts.json");
  try {
    if (await unlinkIfOld(s, cutoffDate, getFsImplementation(), e)) e.messages++;
  } catch (error) {
    if (!isENOENT(error)) {
      e.errors++;
      if (isCleanupQuietFsErrno(error))
        logForDebugging(`cleanup mcp-discover-verdicts failed: ${error.code}`, {
          level: "error",
        });
      else logError(error);
    }
  }
  return e;
}
//@ chunk-23fm9f0d.js:18158-18450 sole-consumer
async function cleanupDeviceMcpNotNow() {
  let e = emptyCleanupResult();
  let cutoffDate = getCutoffDate();
  let claudeConfigDirOrNull = getClaudeConfigDirOrNull();
  if (cutoffDate === null || claudeConfigDirOrNull === null) return e;
  let n = join(claudeConfigDirOrNull, "state", "device-mcp-consent-not-now.json");
  try {
    if (await unlinkIfOld(n, cutoffDate, getFsImplementation(), e)) e.messages++;
  } catch (error) {
    if (!isENOENT(error)) {
      e.errors++;
      if (isCleanupQuietFsErrno(error))
        logForDebugging(`cleanup device-mcp-not-now failed: ${error.code}`, {
          level: "error",
        });
      else logError(error);
    }
  }
  return e;
}
//@ chunk-23fm9f0d.js:18450-18615 sole-consumer
async function cleanupServedCalls(e = join(homedir(), ".claude", "state", "served-calls")) {
  return cleanupOldFilesMatching(
    e,
    (r) => r.endsWith(".jsonl") || r.includes(".jsonl.tmp."),
    true,
    undefined,
    getRetentionCutoff("cleanupPeriodDays", CEL_MAX_ITEMS),
  );
}
//@ chunk-23fm9f0d.js:18615-18850 sole-consumer
async function cleanupUnattendedServingRuns(
  e = join(homedir(), ".claude", "state", "unattended-serving-runs"),
) {
  return cleanupOldFilesMatching(
    e,
    (r) => {
      let s = /^([1-9][0-9]{0,9})\.json$/.exec(r)?.[1];
      return s === undefined ? r.includes(".json.tmp.") : !isProcessRunning(Number(s));
    },
    true,
    undefined,
    getRetentionCutoff("cleanupPeriodDays", CEL_MAX_ITEMS),
  );
}
//@ chunk-23fm9f0d.js:18850-19058 sole-consumer
async function cleanupSettingsReviewStore(e) {
  let r = emptyCleanupResult();
  let cutoffDate = getCutoffDate();
  if (cutoffDate === null) return r;
  try {
    r.messages += await pruneReviewEntriesBefore(cutoffDate, e);
  } catch (error) {
    r.errors++;
    if (isCleanupQuietFsErrno(error))
      logForDebugging(`cleanup settings-review store failed: ${error.code}`, {
        level: "error",
      });
    else logError(error);
  }
  return r;
}
//@ chunk-23fm9f0d.js:19058-19260 sole-consumer
function isMalformedHistoryEntry(e) {
  if (!e) return false;
  try {
    let r = jsonParseRaw(e);
    if (typeof r !== "object" || r === null) return true;
    if (!("timestamp" in r)) return true;
    let { timestamp } = r;
    return typeof timestamp !== "number" || !Number.isFinite(timestamp);
  } catch {
    return true;
  }
}
//@ chunk-23fm9f0d.js:19260-19457 sole-consumer
function isHistoryEntryOlderThan(e, cutoffMs) {
  if (!e) return false;
  try {
    let s = jsonParseRaw(e);
    if (typeof s !== "object" || s === null || !("timestamp" in s)) return false;
    let { timestamp } = s;
    return typeof timestamp === "number" && Number.isFinite(timestamp) && timestamp < cutoffMs;
  } catch {
    return false;
  }
}
//@ chunk-23fm9f0d.js:19457-19782 sole-consumer
/**
 * 删除配置目录中早于截止时间的自有临时文件（history.jsonl、远程设置同意文件等的临时副本）；缓存文件改为检查权限而不删除。
 */
async function cleanupStaleConfigTempFiles(claudeConfigDir, cutoffDate) {
  let s;
  try {
    s = await fsPromisesModule.readdir(claudeConfigDir);
  } catch {
    return;
  }
  let time = cutoffDate.getTime();
  await Promise.all(
    s
      .filter(
        (f) =>
          isOwnTempName(f, "history.jsonl") ||
          isHashTempFile(f) ||
          isOwnTempName(f, REMOTE_SETTINGS_CONSENT_FILE) ||
          mapped.some((i) => f === i || isOwnTempName(f, i)),
      )
      .map(async (f) => {
        let i = join(claudeConfigDir, f);
        try {
          let stats = await fsPromisesModule.lstat(i);
          if (stats.isFile() && stats.mtimeMs < time)
            await (mapped.includes(f) ? checkCacheFilePermissions(i) : fsPromisesModule.unlink(i));
        } catch {}
      }),
  );
}
//@ chunk-23fm9f0d.js:19782-21710 sole-consumer
/**
 * 按保留期裁剪 history.jsonl：先无锁扫描去掉过期/格式错误的条目，加锁后核对文件身份与大小、扫描新增尾部，原子重写；文件在扫描期间变化则推迟，锁被破坏时放弃。
 */
async function pruneHistoryFile(cutoff) {
  let historyPath = join(getClaudeConfigDir(), "history.jsonl");
  let cutoffMs = cutoff.getTime();
  let shouldDrop = (y) => isHistoryEntryOlderThan(y, cutoffMs) || isMalformedHistoryEntry(y);
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
      onCompromised: (y) => {
        lockCompromised = true;
        logForDebugging(`History retention lock compromised: ${y}`, {
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
    await publishWriteAtomic(
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
//@ chunk-23fm9f0d.js:21710-22112 affinity
async function cleanupMcpDiscoveryCache() {
  let e = join(getClaudeConfigDir(), "mcp-discovery-cache");
  let r = await cleanupOldFilesMatching(e, (i) => i.endsWith(".json") || i.includes(".json.tmp."), false);
  let cutoffDate = getCutoffDate();
  if (cutoffDate === null) return r;
  let fsImplementation = getFsImplementation();
  let f;
  try {
    f = await fsImplementation.readdir(e);
  } catch {
    return r;
  }
  for (let i of f) {
    if (!i.isDirectory() || !i.name.endsWith(".json.lock")) continue;
    let m = join(e, i.name);
    try {
      if ((await fsImplementation.stat(m)).mtime < cutoffDate) {
        await fsImplementation.rmdir(m);
        r.messages++;
      }
    } catch {
      r.errors++;
    }
  }
  await tryRmdir(e, fsImplementation);
  return r;
}
//@ chunk-23fm9f0d.js:22112-22295 fingerprint = cleanupOldPlanFiles (0.745)
async function cleanupOldPlanFiles(e) {
  if (isDiskless()) return emptyCleanupResult();
  let plansDir = join(getClaudeConfigDir(), "plans");
  try {
    if (e !== undefined)
      return await cleanupOldFilesMatching(plansDir, (s) => s.endsWith(".md") || s.includes(".md.tmp."));
    return await cleanupOldFilesMatching(plansDir, ".md");
  } finally {
    resetPlanFileCacheToUnknown();
  }
}
//@ chunk-23fm9f0d.js:22295-22892 placement = getSessionId (0)
async function cleanupOldFilesInDirectory(
  e,
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
  let D = emptyCleanupResult();
  if (cutoffDate === null) return D;
  let fsImplementation = getFsImplementation();
  let claudeConfigDir = getClaudeConfigDir();
  let w = baseDir ?? join(claudeConfigDir, e);
  if (refuseRedirectedRoot) {
    if (
      (await verifySyncRoot(
        w,
        claudeConfigDir,
        {
          event: "cleanup_sweep_root_refused",
          phase: "sweep",
          rootLabel: e,
        },
        {
          storageV5,
        },
      )) !== "real"
    )
      return D;
  }
  let P;
  try {
    P = await fsImplementation.readdir(w);
  } catch {
    return D;
  }
  for (let O of P) {
    if (!O.isDirectory() || exclude?.has(O.name)) continue;
    let C = join(w, O.name);
    try {
      if ((await fsImplementation.stat(C)).mtime < cutoffDate) {
        if (await skipIf?.(C)) continue;
        await fsImplementation.rm(C, {
          recursive: true,
          force: true,
        });
        D.messages++;
      }
    } catch {
      D.errors++;
    }
  }
  if (removeEmptyBaseDir) await tryRmdir(w, fsImplementation);
  return D;
}
//@ chunk-23fm9f0d.js:22969-23001 placement = getTaskOutputDir (1)
function getTaskOutputDir() {
  return cleanupOldFilesInDirectory("tasks");
}
//@ chunk-23fm9f0d.js:23035-23195 sole-consumer
function cleanupDevMods() {
  let folder = skillWatchStateByHost.get()?.folder;
  let cutoffDate = getCutoffDate();
  return cleanupOldFilesInDirectory("dev-mods", {
    exclude: new Set([getSessionId(), ...(folder === undefined ? [] : [basename(folder)])]),
    skipIf: (s) => scanAllSessions(s, cutoffDate, SCAN_SESSIONS_MAX),
    removeEmptyBaseDir: false,
  });
}
//@ chunk-23fm9f0d.js:23195-23209 sole-consumer
/**
 * 扫描会话时的最大数量参数（3）。
 */
var SCAN_SESSIONS_MAX = 3;
var PEER_SPOOL_MAX_AGE_DAYS = 2;
//@ chunk-23fm9f0d.js:23209-23384 sole-consumer
async function cleanupBashEditDiffs() {
  let bashEditDiffDir = getBashEditDiffDir();
  let r = await statOwnedPrivateDir(bashEditDiffDir).catch(() => null);
  if (!r) return emptyCleanupResult();
  return cleanupOldFilesInDirectory(BASH_EDIT_DIFF, {
    removeEmptyBaseDir: false,
    maxAgeDays: PEER_SPOOL_MAX_AGE_DAYS,
    baseDir: bashEditDiffDir,
    skipIf: async (s) => !(await getFileIdentity(s, r)),
  });
}
//@ chunk-23fm9f0d.js:23384-23581 sole-consumer
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
//@ chunk-23fm9f0d.js:23581-23949 sole-consumer
/**
 * 清理过期的 bridge-spawn 目录：v5 存储可用时先按作用域删除；否则在自有私有目录中删除过期子目录，并核对目录身份与真实路径防止被重定向。
 */
async function cleanupBridgeSpawnDirs(e) {
  if (isStorageV5Enabled() && e !== undefined) {
    let n = await cleanupBridgeSpawnScope(e);
    if (n !== "unaddressed") return n;
  }
  let r = bridgeSpawnDir();
  let s = await statOwnedPrivateDir(r).catch(() => null);
  if (!s) return emptyCleanupResult();
  return cleanupOldFilesInDirectory(BRIDGE_SPAWN, {
    removeEmptyBaseDir: false,
    maxAgeDays: CEL_MAX_PATTERN_LENGTH,
    baseDir: r,
    skipIf: async (n) => {
      let f = await statOwnedPrivateDir(r);
      return (
        f?.ino !== s.ino ||
        f.dev !== s.dev ||
        (await statOwnedPrivateDir(n)) === null ||
        (await fsPromisesModule.realpath(n)) !==
          join(await fsPromisesModule.realpath(dirname(r)), BRIDGE_SPAWN, basename(n))
      );
    },
  });
}
//@ chunk-23fm9f0d.js:23949-24361 sole-consumer
/**
 * 通过 v5 存储删除 bridge-spawn 作用域中早于保留期的对象；作用域无法寻址时返回 unaddressed 让调用方回退到文件系统清理。
 */
async function cleanupBridgeSpawnScope(e) {
  let r = emptyCleanupResult();
  let s = bridgeSpawnScope();
  let n = await e.scopeKind(s);
  if (!n.ok) return n.error.code === "InvalidArgument" ? "unaddressed" : r;
  if (n.value.kind !== "directory" || n.value.object === undefined || n.value.owner === "other") return r;
  let cutoffDate = getCutoffDate(CEL_MAX_PATTERN_LENGTH);
  if (cutoffDate === null) return r;
  let i = await e.deleteScope(s, {
    olderThanMs: Math.max(0, Date.now() - cutoffDate.getTime()),
  });
  if (!i.ok) return r;
  r.messages += i.value.deleted;
  r.errors += i.value.failed ?? 0;
  return r;
}
//@ chunk-23fm9f0d.js:24361-24401 sole-consumer
/**
 * 清理 peer 文件传输的暂存目录。
 */
function cleanupPeerTransferSpool() {
  return cleanupOldFilesMatching(peerTransferSpoolDir(), "", false, PEER_TRANSFER_VERSION);
}
//@ chunk-23fm9f0d.js:24401-24552 sole-consumer
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
//@ chunk-23fm9f0d.js:24552-24949 sole-consumer
/**
 * 在配置目录下指定根（拒绝被重定向的根）中，对每个合法账号子目录清理其同步子目录中的过期文件，合并结果。
 */
async function cleanupPerAccountSyncDirs(e, storageV5) {
  let s = emptyCleanupResult();
  if (getCutoffDate() === null) return s;
  let claudeConfigDir = getClaudeConfigDir();
  let f = join(claudeConfigDir, e);
  if (
    (await verifySyncRoot(
      f,
      claudeConfigDir,
      {
        event: "cleanup_sweep_root_refused",
        phase: "sweep",
        rootLabel: e,
      },
      {
        storageV5,
      },
    )) !== "real"
  )
    return s;
  let m;
  try {
    m = await getFsImplementation().readdir(f);
  } catch {
    return s;
  }
  for (let g of m) {
    if (!g.isDirectory() || !isSyncBucketName(g.name)) continue;
    s = addCleanupResults(
      s,
      await cleanupOldFilesInDirectory(join(e, "*", TRASH_SUBDIR), {
        baseDir: join(f, g.name, TRASH_SUBDIR),
        refuseRedirectedRoot: true,
        storageV5,
      }),
    );
  }
  return s;
}
//@ chunk-23fm9f0d.js:24949-25207 sole-consumer
async function cleanupTrashRoots(storageV5) {
  let r = emptyCleanupResult();
  let claudeConfigDir = getClaudeConfigDir();
  for (let n of [SKILLS_SYNC_DIR, PLUGINS_SYNC_DIR]) {
    let f = join(claudeConfigDir, n);
    if (
      (await verifySyncRoot(
        f,
        claudeConfigDir,
        {
          event: "cleanup_sweep_root_refused",
          phase: "sweep",
          rootLabel: n,
        },
        {
          storageV5,
        },
      )) === "real"
    ) {
      let m = await queueSyncTrashTrim(f);
      r = addCleanupResults(r, {
        ...emptyCleanupResult(),
        messages: m.removed,
        errors: m.errors,
      });
    }
  }
  return r;
}
//@ chunk-23fm9f0d.js:25207-25274 sole-consumer
/**
 * 清理同步根下过期的账号目录（跳过当前账号与未标记目录）。
 */
function cleanupAccountSyncDirs(storageV5) {
  return cleanupOldFilesInDirectory(SKILLS_SYNC_DIR, {
    refuseRedirectedRoot: true,
    storageV5,
  });
}
//@ chunk-23fm9f0d.js:25274-26012 sole-consumer
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
      await checkSyncRoots({
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
//@ chunk-23fm9f0d.js:26012-26080 sole-consumer
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
//@ chunk-23fm9f0d.js:26080-26147 sole-consumer
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
//@ chunk-23fm9f0d.js:26147-26214 sole-consumer
/**
 * 清理插件同步根下的过期条目。
 */
function cleanupPluginsSyncRootEntries(storageV5) {
  return cleanupOldFilesInDirectory(PLUGINS_SYNC_DIR, {
    refuseRedirectedRoot: true,
    storageV5,
  });
}
//@ chunk-23fm9f0d.js:26214-26311 sole-consumer
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
//@ chunk-23fm9f0d.js:26311-26469 sole-consumer
async function cleanupPluginStore() {
  let e = join(getPluginsDirectory(), "store");
  let r = await cleanupOldFilesMatching(e, (n) => n.endsWith(".json") || n.includes(".json.tmp."), false);
  let cutoffDate = getCutoffDate();
  if (cutoffDate !== null) await cleanupDirFiles(e, cutoffDate, getFsImplementation(), r);
  return r;
}
//@ chunk-23fm9f0d.js:26469-26521 affinity
/**
 * 清理已移出或不可读的插件文件。
 */
function cleanupRemovedPluginFiles() {
  return cleanupOldFilesMatching(
    getPluginsDirectory(),
    (e) => isSetAsideFileName(e) || isUnreadableKeptFileName(e),
    false,
  );
}
//@ chunk-23fm9f0d.js:26521-27094 fingerprint = cleanupOldSessionEnvDirs (0.762)
async function cleanupOldSessionEnvDirs() {
  let cutoffDate = getCutoffDate();
  let result = emptyCleanupResult();
  if (cutoffDate === null) return result;
  let fsImpl = getFsImplementation();
  let n = join(getClaudeConfigDir(), MCP_SKILL_ARCHIVES);
  let dirents;
  try {
    dirents = await fsImpl.readdir(n);
  } catch {
    return result;
  }
  for (let dirent of dirents) {
    if (!dirent.isDirectory()) continue;
    let m = join(n, dirent.name);
    let cacheKey = (await readAssetMetaOrNull(m))?.cacheKey ?? null;
    let y;
    try {
      y = await fsImpl.readdir(m);
    } catch {
      result.errors++;
      continue;
    }
    for (let sessionEnvDir of y) {
      if (!sessionEnvDir.isDirectory() || sessionEnvDir.name === cacheKey) continue;
      let k = join(m, sessionEnvDir.name);
      try {
        if ((await fsImpl.stat(k)).mtime < cutoffDate) {
          await fsImpl.rm(k, {
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
      if ((await fsImpl.stat(m)).mtime < cutoffDate) {
        await fsImpl.rm(m, {
          recursive: true,
          force: true,
        });
        result.messages++;
      }
    } catch {
      result.errors++;
    }
  }
  await tryRmdir(n, fsImpl);
  return result;
}
//@ chunk-23fm9f0d.js:27094-27383 layout
async function cleanupUsageData() {
  let e = join(getClaudeConfigDir(), "usage-data");
  let r = await cleanupOldFilesMatching(
    join(e, "facets"),
    (s) => s.endsWith(".json") || s.includes(".json.tmp."),
  );
  r = addCleanupResults(
    r,
    await cleanupOldFilesMatching(
      join(e, "session-meta"),
      (s) => s.endsWith(".json") || s.includes(".json.tmp."),
    ),
  );
  r = addCleanupResults(
    r,
    await cleanupOldFilesMatching(e, (s) => s.endsWith(".html") || isTempFileName_2(s), false),
  );
  await tryRmdir(e, getFsImplementation());
  return r;
}
//@ chunk-23fm9f0d.js:27383-27856 layout
async function cleanupTempTranscripts() {
  let cutoffDate = getCutoffDate();
  let r = emptyCleanupResult();
  if (cutoffDate === null) return r;
  let fsImplementation = getFsImplementation();
  let n;
  try {
    n = claudeTempDir();
  } catch {
    return r;
  }
  let f;
  try {
    f = await fsImplementation.readdir(n);
  } catch {
    return r;
  }
  for (let i of f) {
    let m = i.name.startsWith("cc-transcript-") && i.name.endsWith(".txt");
    let g = i.name.startsWith(AUTO_MODE_BUILTINS) && i.name.endsWith(".md");
    let y =
      i.name.startsWith(getCacheBreakDiffPath) && (i.name.endsWith(".json") || i.name.endsWith(".diff"));
    let D = false;
    if (!i.isFile() || (!m && !g && !y && true)) continue;
    try {
      if (await unlinkIfOld(join(n, i.name), cutoffDate, fsImplementation, r)) r.messages++;
    } catch {
      r.errors++;
    }
  }
  return r;
}
//@ chunk-23fm9f0d.js:27856-28265 placement = getOverlayPath (0.436)
/**
 * 清理过期的 speculation 目录（utils/cleanup 的一部分）。旧版名 getOverlayPath 为错配。
 */
async function cleanupOldSpeculationDir() {
  let e = emptyCleanupResult();
  let cutoffDate = getCutoffDate(CEL_MAX_PATTERNS);
  if (cutoffDate === null) return e;
  let fsImplementation = getFsImplementation();
  let n;
  try {
    n = claudeTempDir();
    if (!(await fsImplementation.lstat(n)).isDirectory()) return e;
  } catch {
    return e;
  }
  let f = join(n, "speculation");
  let i;
  try {
    i = await fsImplementation.lstat(f);
  } catch {
    return e;
  }
  if (!i.isDirectory()) return e;
  try {
    if (
      ((await scanDirectoryForPaths(f, fsImplementation, {
        requireCompleteWalk: true,
      })) ?? i.mtimeMs) < cutoffDate.getTime()
    ) {
      await fsImplementation.rm(f, {
        recursive: true,
        force: true,
      });
      e.messages++;
      return e;
    }
  } catch {
    e.errors++;
  }
  await tryRmdir(f, fsImplementation);
  return e;
}
//@ chunk-23fm9f0d.js:28265-28431 affinity
async function cleanupShares() {
  let e = join(getClaudeConfigDir(), "shares");
  let r = await cleanupOldFilesInDirectory("shares");
  r = addCleanupResults(
    r,
    await cleanupOldFilesMatching(
      e,
      (s) => s.endsWith(".zip") || (s.includes(".zip.tmp.") && isTempFileName(s)),
      false,
    ),
  );
  await tryRmdir(e, getFsImplementation());
  return r;
}
//@ chunk-23fm9f0d.js:28431-28667 affinity
async function cleanupTelemetry() {
  let e = join(getClaudeConfigDir(), "telemetry");
  let r = await cleanupOldFilesMatching(e, ".json", false);
  let cutoffDate = getCutoffDate();
  if (cutoffDate === null) return r;
  let n = join(e, "runs");
  let fsImplementation = getFsImplementation();
  if ((await isDirectory(e, fsImplementation)) && (await isDirectory(n, fsImplementation)))
    await cleanupTreeRecursive(n, cutoffDate, fsImplementation, r, {
      entryMatcher: (i) => i.endsWith(".json"),
    });
  await tryRmdir(e, getFsImplementation());
  return r;
}
//@ chunk-23fm9f0d.js:28730-28789 placement
/**
 * 清理 shell-snapshots 目录下过期的快照文件。
 */
function cleanupShellSnapshots() {
  return cleanupOldFilesMatching(join(getClaudeConfigDir(), "shell-snapshots"), ".sh", false);
}
//@ chunk-23fm9f0d.js:28789-29195 placement
/**
 * 清理团队目录下各 inboxes 中过期的消息 JSON 文件，并删除空目录。
 */
async function cleanupTeamInboxes() {
  let cutoffDate = getCutoffDate();
  let r = emptyCleanupResult();
  if (cutoffDate === null) return r;
  let fsImplementation = getFsImplementation();
  let teamsDir = getTeamsDir();
  for (let f of await fsImplementation.readdir(teamsDir).catch(() => [])) {
    if (!f.isDirectory()) continue;
    let i = join(teamsDir, f.name, "inboxes");
    if (await isDirectory(i, fsImplementation)) {
      for (let m of await fsImplementation.readdir(i).catch(() => [])) {
        if (!m.isFile() || !m.name.endsWith(".json")) continue;
        try {
          if (await unlinkIfOld(join(i, m.name), cutoffDate, fsImplementation, r)) r.messages++;
        } catch {
          r.errors++;
        }
      }
      await tryRmdir(i, fsImplementation);
    }
    await tryRmdir(join(teamsDir, f.name), fsImplementation);
  }
  return r;
}
//@ chunk-23fm9f0d.js:29195-29956 placement
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
    let y = join(tmpDir, entry.name);
    try {
      let D = await statOwnedPrivateDir(y);
      if (D === null) continue;
      let entries = await fs.readdir(y);
      if (entries.length !== 1 || entries[0].name !== "stderr.log") continue;
      let S = join(y, "stderr.log");
      let stats = await fs.lstat(S);
      if (!stats.isFile()) continue;
      if (!(stats.mtime < cutoff)) {
        result.filesRetainedFresh++;
        continue;
      }
      let P = await statOwnedPrivateDir(y);
      if (P === null || P.dev !== D.dev || P.ino !== D.ino) continue;
      try {
        await fs.unlink(S);
      } catch (error) {
        if (isENOENT(error)) continue;
        result.filesPastCutoff++;
        throw error;
      }
      result.messages++;
      await tryRmdir(y, fs);
    } catch (error) {
      if (!isENOENT(error)) result.errors++;
    }
  }
  return result;
}
//@ chunk-23fm9f0d.js:29956-30000 placement
var regExp = new RegExp(`^${PDF_SCRATCH_DIR_PREFIX}[A-Za-z0-9]{6}$`);
//@ chunk-23fm9f0d.js:30000-30044 placement
var regExp_2 = new RegExp(`^${PREVIEW_COPY_DIR_PREFIX}[A-Za-z0-9]{6}$`);
//@ chunk-23fm9f0d.js:30044-30553 placement
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
    let m = join(tmpDir, entry.name);
    try {
      let g = await statOwnedPrivateDir(m);
      if (g === null) continue;
      if (
        !(
          ((await scanDirectoryForPaths(m, fs, {
            requireCompleteWalk: true,
          })) ?? g.mtimeMs) < cutoff.getTime()
        )
      ) {
        result.filesRetainedFresh++;
        continue;
      }
      let D = await statOwnedPrivateDir(m);
      if (D === null || D.dev !== g.dev || D.ino !== g.ino) continue;
      await fs.rm(m, {
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
//@ chunk-23fm9f0d.js:30553-32645 placement
/**
 * 清理后台守护相关的旧文件：已结算作业与派发记录、无对应作业的 host-managed 文件、过期作业目录（排除固定作业与名册中存活 worker 的作业，必要时回收作业工作树）、daemon 临时 stderr、daemon.log、过期名册与损坏名册备份，以及作业草稿。
 */
async function cleanupDaemonFiles(storageV5, r) {
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
    let D = join(configDir, "daemon", "host-managed");
    let fsImplementation = getFsImplementation();
    let cutoffDate = getCutoffDate();
    if (cutoffDate)
      for (let w of await fsImplementation.readdir(D)) {
        if (!w.isFile()) continue;
        try {
          await fsImplementation.lstat(join(configDir, "jobs", w.name));
        } catch (error) {
          if (!isENOENT(error)) {
            result.errors++;
            continue;
          }
          try {
            if (await unlinkIfOld(join(D, w.name), cutoffDate, fsImplementation, result)) result.messages++;
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
  if (!retentionExemptOff) for (let D of await readPinnedJobIds(storageV5)) keepJobIds.add(D);
  let rosterRead = false;
  let rosterHasLiveWorker = false;
  try {
    let D = join(configDir, "daemon", "roster.json");
    let stats = await getFsImplementation().lstat(D);
    if (!stats.isFile() || stats.size > 8388608) throw Error("not a regular file");
    let content = await getFsImplementation().readFile(D, {
      encoding: "utf-8",
    });
    let w = jsonParse(content);
    if (w !== null && typeof w === "object" && "workers" in w) {
      let workers = w.workers;
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
      skipIf: async (D) => {
        let k;
        try {
          k = await readJobStateFreshOrNull(D, storageV5);
        } catch (error) {
          logError(error);
          logForDebugging(
            `[cleanup] jobs/${basename(D)}: job state read threw \u2014 keeping the folder (${errorMessage(error)})`,
            {
              level: "error",
            },
          );
          throw error;
        }
        if (!retentionExemptOff && (k === null || !isSettled(k))) return true;
        if (k?.worktreePath && isSettled(k) && cutoff) {
          let S = await reapJobWorktreeIfSafe({
            worktreePath: k.worktreePath,
            worktreeBranch: k.worktreeBranch,
            originCwd: k.originCwd,
            hookBased: k.worktreeHookBased,
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
    for (let S of [join(configDir, "daemon.log"), join(configDir, "daemon.log.1")])
      try {
        if (await unlinkIfOld(S, cutoff, fsImplementation, result)) result.messages++;
      } catch (error) {
        if (!isENOENT(error)) result.errors++;
      }
    let k = join(configDir, "daemon", "roster.json");
    try {
      if (
        (await fsImplementation.lstat(k)).mtime < cutoff &&
        !rosterHasLiveWorker &&
        (rosterRead || retentionExemptOff)
      ) {
        await fsImplementation.unlink(k);
        result.messages++;
      }
    } catch (error) {
      if (!isENOENT(error)) result.errors++;
    }
    for (let S of await fsImplementation.readdir(join(configDir, "daemon")).catch(() => [])) {
      if (!S.isFile() || !S.name.startsWith("roster.json.corrupt.")) continue;
      try {
        if (await unlinkIfOld(join(configDir, "daemon", S.name), cutoff, fsImplementation, result))
          result.messages++;
      } catch {
        result.errors++;
      }
    }
  }
  await sweepJobDrafts();
  return result;
}
//@ chunk-23fm9f0d.js:32693-32955 fingerprint = cleanupOldDebugLogs (0.819)
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
//@ chunk-23fm9f0d.js:32955-33019 layout
async function cleanupFeedbackBundles() {
  return cleanupOldFilesMatching(join(getClaudeConfigDir(), "feedback-bundles"), ".zip");
}
//@ chunk-23fm9f0d.js:33019-33134 layout
async function cleanupFeedbackDrafts() {
  return cleanupOldFilesMatching(
    join(getClaudeConfigDir(), "feedback", "drafts"),
    (e) => e.endsWith(".json") || e.includes(".json.tmp."),
    true,
    30,
  );
}
//@ chunk-23fm9f0d.js:33134-33466 layout
async function cleanupRemoteControlForkSeeds() {
  let e = join(getClaudeConfigDir(), "remote-control", "fork-seeds");
  let r = await cleanupOldFilesMatching(e, (f) => f.endsWith(".json") || f.includes(".json.tmp."));
  if (getCutoffDate() === null) return r;
  let date = new Date();
  let fsImplementation = getFsImplementation();
  for (let f of await fsImplementation.readdir(e).catch(() => []))
    try {
      let i = join(e, f.name);
      if (f.isFile() && (await fsImplementation.stat(i)).mtime > date)
        await fsPromisesModule.lutimes(i, date, date);
    } catch {
      r.errors++;
    }
  return r;
}
//@ chunk-23fm9f0d.js:33466-33628 layout
async function cleanupTracesAndStartupPerf() {
  let e = await cleanupOldFilesMatching(join(getClaudeConfigDir(), "traces"), ".json");
  let r = await cleanupOldFilesMatching(join(getClaudeConfigDir(), "startup-perf"), ".txt");
  let s = await cleanupOldFilesMatching(join(getClaudeConfigDir(), "startup-perf"), ".json");
  return addCleanupResults(addCleanupResults(e, r), s);
}
//@ chunk-23fm9f0d.js:33628-33651 layout
var ONE_DAY_MS = 86400000;
var QUIET_FS_ERRNOS = nonRegularErrorSet;
//@ chunk-23fm9f0d.js:33651-33795 layout
function errnoTelemetryValue(e) {
  if (e === undefined) return lit("none");
  if (!QUIET_FS_ERRNOS.has(e)) return lit("other");
  return e === "ELOOP" ? lit("ELOOP") : e === "EISDIR" ? lit("EISDIR") : lit("ENXIO");
}
//@ chunk-23fm9f0d.js:33795-33886 layout
function isQuietFsFailure(error) {
  return (
    error.code === "Failed" && error.telemetryCode !== undefined && QUIET_FS_ERRNOS.has(error.telemetryCode)
  );
}
//@ chunk-23fm9f0d.js:33886-34150 layout
function describeMarkerRemoval(e) {
  if (e.ok) return "removed it";
  return ("telemetryCode" in e.error ? e.error.telemetryCode : undefined) === "EISDIR"
    ? "could not remove it (EISDIR): a directory at the marker path stays and the marker write will keep failing"
    : `could not remove it (${e.error.code})`;
}
//@ chunk-23fm9f0d.js:34150-34613 facade-majority
/**
 * .last-cleanup 标记不是普通文件时尝试修复并上报 tengu_cleanup_throttle_marker。
 */
async function healRefusedSentinelLeaf(storageV5) {
  let r = await storageV5.statMeta(STORAGE_SPACES.state("last-cleanup"));
  if (r.ok || r.error.code === "NotFound" || !isQuietFsFailure(r.error)) return;
  logEvent("tengu_cleanup_throttle_marker", {
    marker: lit("last-cleanup"),
    verdict: lit("not_regular_rerun"),
    code: fromEnum(r.error.code),
    errno: errnoTelemetryValue("telemetryCode" in r.error ? r.error.telemetryCode : undefined),
  });
  let s = await storageV5.delete(STORAGE_SPACES.state("last-cleanup"));
  logForDebugging(
    `.last-cleanup: sentinel is not a regular file (${formatStorageError(r.error)}) \u2014 ${describeMarkerRemoval(s)}; rewriting`,
    {
      level: "warn",
    },
  );
}
//@ chunk-23fm9f0d.js:34613-34707 layout
var STAGING_MARKER_FILES = [
  ".npm-cache-cleanup",
  ".version-cleanup",
  ".last-cleanup",
  ".deep-link-register-failed",
];
//@ chunk-23fm9f0d.js:34707-34993 facade-majority = cleanupOldFilesInDirectory (0.455)
/**
 * 删除配置目录下过期（1 天）的 staging 标记文件（.npm-cache-cleanup、.version-cleanup 等），每进程一次。
 */
async function reapStaleHousekeepingStagingFiles(claudeConfigDir, backgroundHousekeeping) {
  if (!backgroundHousekeeping.claimStagingReap()) return;
  let s;
  try {
    s = await fsPromisesModule.readdir(claudeConfigDir);
  } catch {
    return;
  }
  let n = Date.now() - ONE_DAY_MS;
  await Promise.all(
    s
      .filter((f) => STAGING_MARKER_FILES.some((i) => isOwnTempName(f, i)))
      .map(async (f) => {
        let i = join(claudeConfigDir, f);
        try {
          let stats = await fsPromisesModule.lstat(i);
          if (stats.isFile() && stats.mtimeMs < n) await fsPromisesModule.unlink(i);
        } catch {}
      }),
  );
}
//@ chunk-23fm9f0d.js:34993-35584 callgraph-witnessed = cleanupOldFileHistoryBackups (0.645)
async function cleanupOldFileHistoryBackups() {
  let cutoffDate = getCutoffDate();
  let fsImpl = emptyCleanupResult();
  if (cutoffDate === null) return fsImpl;
  let configDir = getFsImplementation();
  for (let configDir_2 of HOST_FUNCTION_CATEGORIES) {
    let fileHistoryStorageDir = join(getClaudeConfigDir(), configDir_2);
    let i = await configDir.lstat(fileHistoryStorageDir).catch((error) => {
      if (!isENOENT(error)) fsImpl.errors++;
      return null;
    });
    if (i === null || !i.isDirectory()) continue;
    let dirents;
    try {
      dirents = await configDir.readdir(fileHistoryStorageDir);
    } catch {
      continue;
    }
    let g = false;
    for (let dirent of dirents) {
      let D = join(fileHistoryStorageDir, dirent.name);
      try {
        if (!((await configDir.stat(D)).mtime < cutoffDate)) continue;
        let S = await configDir.lstat(fileHistoryStorageDir).catch(() => null);
        if (S === null || !S.isDirectory() || S.dev !== i.dev || S.ino !== i.ino) {
          g = true;
          break;
        }
        if (dirent.isDirectory())
          await configDir.rm(D, {
            recursive: true,
            force: true,
          });
        else await configDir.unlink(D);
        fsImpl.messages++;
      } catch {
        fsImpl.errors++;
      }
    }
    if (!g) await tryRmdir(fileHistoryStorageDir, configDir);
  }
  return fsImpl;
}
//@ chunk-23fm9f0d.js:35584-36085 affinity
async function cleanupTinyMemoryFiles() {
  let e = emptyCleanupResult();
  let cutoffDate = getCutoffDate();
  if (cutoffDate === null) return e;
  let s = join(getMemoryBaseDir(), "projects");
  let fsImplementation = getFsImplementation();
  let f = await fsImplementation.lstat(s).catch((error) => {
    if (!isENOENT(error)) e.errors++;
    return null;
  });
  if (f === null || !f.isDirectory()) return e;
  let i = await fsImplementation.readdir(s).catch((error) => {
    if (!isENOENT(error)) e.errors++;
    return [];
  });
  for (let m of i) {
    if (!m.isDirectory()) continue;
    let g = join(s, m.name, "tiny_memory");
    let y = await fsImplementation.lstat(g).catch((error) => {
      if (!isENOENT(error)) e.errors++;
      return null;
    });
    if (y === null || !y.isDirectory()) continue;
    await cleanupTreeRecursive(g, cutoffDate, fsImplementation, e, {
      countEnumerationFailures: true,
    });
  }
  return e;
}
//@ chunk-23fm9f0d.js:36085-36356 sole-consumer
async function cleanupMemoryProposals() {
  let r = emptyCleanupResult();
  let cutoffDate = getCutoffDate();
  if (cutoffDate === null) return r;
  let n = join(getMemoryBaseDir(), "projects");
  let fsImplementation = getFsImplementation();
  let i = await fsImplementation.readdir(n).catch(() => []);
  for (let m of i) {
    if (!m.isDirectory()) continue;
    r = addCleanupResults(
      r,
      await findModifiedFiles(join(n, m.name, "memory", "proposals"), cutoffDate, fsImplementation),
    );
  }
  return addCleanupResults(
    r,
    await findModifiedFiles(join(getAutoMemPath(), "proposals"), cutoffDate, fsImplementation),
  );
}
//@ chunk-23fm9f0d.js:36895-39583 facade-majority = cleanupOldMessageFilesInBackground (0.123)
/**
 * 后台保留期清理（cleanupPeriodDays，默认 30 天）：错误日志、会话、计划、文件历史、调试日志、反馈包、MCP 缓存、worktree 等数十类数据，结果上报 tengu_retention_sweep。
 */
async function cleanupOldMessageFilesInBackground(storageV5) {
  await cleanupOldImageCaches();
  let r = await sweepSeedAdminSafely();
  let s = {
    seedAdminRemoved: r.removed,
    seedAdminErrors: r.errors,
    seedAdminHeld: r.held,
    seedAdminRefused: fromEnum(r.refused),
  };
  let retentionSweep = await startRetentionSweep();
  let f =
    retentionSweep === "asked"
      ? {}
      : {
          hooksUnasked: fromEnum(retentionSweep),
        };
  let i = await retentionCleanupSkipReason(storageV5);
  let cleanupPeriodDays = getSettings_DEPRECATED()?.cleanupPeriodDays;
  if (i !== null) {
    logEvent("tengu_retention_sweep", {
      skipped: true,
      skipReason: fromEnum(i),
      ...s,
      ...f,
    });
    logRetentionSweep({
      result: "skipped",
      skipReason: i,
      periodDays: cleanupPeriodDays ?? CEL_MAX_ITEMS,
      usedDefault: cleanupPeriodDays === undefined,
    });
    if (i !== "diskless") await cleanupTrashRoots(storageV5);
    return i;
  }
  logEvent("tengu_retention_sweep", {
    phase: lit("start"),
    ...s,
    ...f,
  });
  let g = undefined;
  let y;
  let D = () => (y ??= cleanupOldSessionFiles(g));
  await using k = {
    [Symbol.asyncDispose]: () =>
      D().then(
        () => {},
        () => {},
      ),
  };
  await cleanupOldMessageFiles();
  let S = await cleanupOldTranscripts();
  let w = [S];
  w.push(await cleanupOldPlanFiles(storageV5));
  w.push(await resolveBackupPath());
  w.push(await getSessionEnvDirPath());
  w.push(await getTaskOutputDir());
  w.push(await uploadsDir());
  w.push(await cleanupDevMods());
  w.push(await cleanupBridgeSpawnDirs(storageV5));
  w.push(await cleanupBashEditDiffs());
  w.push(await cleanupPeerTransferSpool());
  w.push(await cleanupUsageData());
  w.push(await cleanupSkillsSyncDirs(storageV5));
  w.push(await cleanupOwnedSyncRoots(storageV5));
  w.push(await cleanupSkillsSyncTrashRoots(storageV5));
  w.push(await cleanupPluginsSyncTrashRoots(storageV5));
  w.push(await cleanupAccountSyncDirs(storageV5));
  w.push(await cleanupPluginsSyncRootEntries(storageV5));
  w.push(await cleanupPluginStore());
  w.push(await cleanupRemovedPluginFiles());
  w.push(await cleanupOldSessionEnvDirs());
  w.push(await cleanupTempTranscripts());
  w.push(await cleanupOldTempDirs());
  w.push(await cleanupOldSpeculationDir());
  w.push(await cleanupShares());
  w.push(await cleanupTelemetry());
  w.push(await cleanupOldDebugLogs());
  w.push(await cleanupFeedbackBundles());
  w.push(await cleanupFeedbackDrafts());
  w.push(await cleanupRemoteControlForkSeeds());
  w.push(await cleanupTracesAndStartupPerf());
  w.push(await getDumpPromptsPath());
  w.push(await cleanupShellSnapshots());
  w.push(await cleanupTeamInboxes());
  w.push(await cleanupDaemonFiles(storageV5, g));
  w.push(await getConfigBackupDir());
  w.push(await cleanupHfiAuthFile());
  w.push(await getMcpAuthCachePath());
  w.push(await cleanupDeviceUnboundCreates());
  w.push(await cleanupMcpDiscoverVerdicts());
  w.push(await cleanupDeviceMcpNotNow());
  w.push(await cleanupServedCalls());
  w.push(await cleanupUnattendedServingRuns());
  w.push(await cleanupSettingsReviewStore());
  w.push(await cleanupMcpDiscoveryCache());
  w.push(await cleanupTeamDiscoveryCache());
  w.push(await cleanupModelAccessMemory());
  w.push(await cleanupModelCatalogCache());
  w.push(await cleanupOldFileHistoryBackups());
  w.push(await cleanupTinyMemoryFiles());
  w.push(await cleanupMemoryProposals());
  let P = {
    entriesPruned: 0,
    errors: 0,
  };
  let cutoffDate = getCutoffDate();
  if (cutoffDate !== null) {
    await cleanupOldPastes(cutoffDate, storageV5);
    let removedWorktrees = await cleanupSessionImageDirs(cutoffDate);
    w.push({
      ...emptyCleanupResult(),
      messages: removedWorktrees.removed,
      errors: removedWorktrees.errors,
    });
    let A = await cleanupStaleAgentWorktrees(cutoffDate, g, false);
    if (A > 0)
      logEvent("tengu_worktree_cleanup", {
        removed: A,
      });
    await cleanupStaleConfigTempFiles(getClaudeConfigDir(), cutoffDate);
    if (
      hasComplianceTaint("hipaa") &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_hipaa_history_retention_prune", true)
    ) {
      P = await pruneHistoryFile(cutoffDate);
      w.push({
        ...emptyCleanupResult(),
        errors: P.errors,
      });
    }
  }
  w.push(await cleanupTrashRoots(storageV5));
  w.push(await D());
  let reduced = w.reduce(addCleanupResults, emptyCleanupResult());
  logEvent("tengu_retention_sweep", {
    phase: lit("complete"),
    skipped: false,
    transcriptsDeleted: S.transcripts,
    transcriptsExemptedDesktop: S.transcriptsExemptedDesktop,
    sessionFilesDeleted: S.messages,
    artifactsDeleted: reduced.messages,
    filesRetainedFresh: reduced.filesRetainedFresh,
    filesPastCutoff: reduced.filesPastCutoff,
    errors: reduced.errors,
    historyEntriesPruned: P.entriesPruned,
    periodDays: cleanupPeriodDays ?? CEL_MAX_ITEMS,
    usedDefault: cleanupPeriodDays === undefined,
  });
  logRetentionSweep({
    result: "complete",
    periodDays: cleanupPeriodDays ?? CEL_MAX_ITEMS,
    usedDefault: cleanupPeriodDays === undefined,
    transcriptsDeleted: S.transcripts,
    transcriptsExemptedDesktop: S.transcriptsExemptedDesktop,
    sessionFilesDeleted: S.messages,
    artifactsDeleted: reduced.messages,
    filesRetainedFresh: reduced.filesRetainedFresh,
    filesPastCutoff: reduced.filesPastCutoff,
    errorCount: reduced.errors,
    historyEntriesPruned: P.entriesPruned,
  });
}
//@ chunk-kqn19nw9.js:557-596 placement
/**
 * 匹配 “数字.扩展名” 的图片文件名。
 */
var IMAGES = "images";
var IMAGE_FILE_NAME_RE = /^(\d+)\.[a-z]+$/;
//@ chunk-kqn19nw9.js:596-1076 placement
/**
 * 遍历临时目录中各项目下的会话目录（跳过当前会话），删除早于截止时间的 images 子目录，统计删除数与错误数。
 */
async function cleanupSessionImageDirs(cutoffDate, p) {
  let e = {
    removed: 0,
    errors: 0,
  };
  let fsImplementation = getFsImplementation();
  let n;
  let i;
  try {
    n = await fsImplementation.realpath(p ?? claudeTempDir());
    i = await fsImplementation.readdir(n);
  } catch {
    return e;
  }
  let sessionId = getSessionId();
  for (let t of i) {
    if (!t.isDirectory()) continue;
    let s = join(n, t.name);
    let c;
    try {
      c = await fsImplementation.readdir(s);
    } catch {
      continue;
    }
    for (let m of c) {
      if (!m.isDirectory() || m.name === sessionId || normalizeUuidOrNull(m.name) === null) continue;
      let d = join(s, m.name, IMAGES);
      try {
        let stats = await fsImplementation.lstat(d);
        if (!stats.isDirectory() || stats.mtime >= cutoffDate) continue;
        if (await removeStaleImagesDir(d, cutoffDate)) e.removed++;
      } catch (error) {
        if (!isFsInaccessible(error)) e.errors++;
      }
    }
  }
  return e;
}
//@ chunk-kqn19nw9.js:1076-1698 placement
/**
 * 删除过期的 images 子目录（变新则中止）。
 */
async function removeStaleImagesDir(a, p) {
  let e = await pinWriteTarget(a, [a], {
    leaf: "replace",
  });
  try {
    await e.recheckBeforeWrite();
    let r = await lstat(e.ioPath);
    if (!r.isDirectory() || r.mtime >= p) return false;
    let n = join(a, "any");
    let i = await pinWriteTarget(n, [n], {
      leaf: "replace",
    });
    try {
      let o = dirname(i.ioPath);
      await i.recheckBeforeWrite();
      for (let t of await readdir(o)) {
        let index = t.lastIndexOf(".tmp.");
        let c = index === -1 ? t : t.slice(0, index);
        if (!IMAGE_FILE_NAME_RE.test(c) || (index !== -1 && !isOwnTempName(t, c))) continue;
        await i.recheckBeforeWrite();
        await unlink(join(o, t)).catch(() => {});
      }
    } finally {
      await i.close();
    }
    await e.recheckBeforeWrite();
    try {
      await rmdir(e.ioPath);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ENOTEMPTY" || errnoCode === "EEXIST") return false;
      throw error;
    }
    return true;
  } finally {
    await e.close();
  }
}
//@ chunk-4nhpaxz9.js:7688-7945 fingerprint = cleanupSingleDirectory (0.409)
async function cleanupSingleDirectory(e, n) {
  let mtimeMs = (await e.fs.lstat(n)).mtimeMs;
  let entries = await e.fs.readdir(n);
  for (let dirent of entries) {
    let joined = e.path.join(n, dirent);
    try {
      let stats = await e.fs.lstat(joined);
      mtimeMs = Math.max(mtimeMs, stats.mtimeMs);
      if (stats.isDirectory()) mtimeMs = Math.max(mtimeMs, await cleanupSingleDirectory(e, joined));
    } catch (error) {
      if (!isENOENT(error)) throw error;
    }
  }
  return mtimeMs;
}
export {
  retentionCleanupSkipReason,
  IMAGES,
  IMAGE_FILE_NAME_RE,
  cleanupOldFilesMatching,
  cleanupOldMessageFilesInBackground,
  reapStaleHousekeepingStagingFiles,
  healRefusedSentinelLeaf,
  isCleanupQuietFsErrno,
  entryKind,
  emptyCleanupResult,
  getCutoffDate,
  unlinkIfOld,
  cleanupOldFilesInDirectory,
  tryRmdir,
  cleanupSingleDirectory,
  isRetentionCleanupSafe,
};
