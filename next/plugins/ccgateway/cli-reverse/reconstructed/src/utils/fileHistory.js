/**
 * utils/fileHistory.ts
 *
 * 文件检查点（rewind）：编辑前备份、按消息快照、回退、差异统计、resume 时迁移备份
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/fileHistory.ts
 * pieces: chunk-23fm9f0d.js (1), chunk-e6aww6q8.js (53)
 * attribution: fingerprint 7, facade-exports 12, layout 22, file-local 3, callgraph-fingerprint 2, affinity 1, sole-consumer 6, callgraph-witnessed 1
 */
import { unlink, stat, lstat, copyFile, mkdir, chmod, realpath, open, readlink, link } from "fs/promises";
import { createHash } from "crypto";
import { join, dirname, relative, basename, isAbsolute } from "path";
import { constants } from "fs";
import { inspect } from "util";
import { getOwn, defineOwnProperty } from "./objectSafety.js";
import { recordFileHistoryDelta, recordFileHistorySnapshot } from "./sessionStorage.js";
import { logError } from "./log.js";
import { logEvent } from "../services/analytics/index.js";
import { logForDebugging } from "./debug.js";
import { MAX_LOGS } from "../types/logs.js";
import { getSessionId, isDiskless, getIsNonInteractiveSession, getOriginalCwd } from "../bootstrap/state.js";
import {
  isENOENT,
  isENOENT_2,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errorMessage,
  getErrnoCode,
  isSadFsErrno,
  isEnvFsErrno,
  sanitizeErrnoForTelemetry,
  sanitizedErrnoLowerForTelemetry,
  sanitizedErrCodeForTelemetry,
  withTelemetryFacts,
  isPathAbsent,
} from "./errors.js";
import { isRemoteSessionAvailable } from "../remote/remoteMode.js";
import { resolveSetting } from "./settings/userIntentSettings.js";
import { env } from "./env.js";
import { BACKUP_FILE_NAME_PATTERN_WITH_LEGACY } from "./sessionStoragePortable.js";
import { plural } from "./stringUtils.js";
import { pathExists } from "./fsSafety/atomicWriteStaging.js";
import { isNonWslUncPath, isNetworkOrSpecialPath } from "./networkPaths.js";
import { yieldToEventLoop } from "../native-ts/file-index/index.js";
import { diffLines } from "../../vendor/diff/libesm/diff/line.js";
import { resetPlanFileCacheToUnknown } from "./plans.js";
import { isSafeIdSegment_2 } from "./agentId.js";
import { getClaudeConfigDir } from "./envUtils.js";
import { STORAGE_SPACES } from "./storage/storageSpaces.js";
import { readFlagWithOverride } from "../services/analytics/flagOverrides.js";
import { getPlatform } from "./platform.js";
import { O_NOFOLLOW_ANY, READ_LIMITS } from "./fsBoundRead.js";
import { retryFsOp, makeTempSiblingPath, assertPathSafeAsync, retryTransient } from "./atomicPublishWrite.js";
import { TRANSIENT_FS_ERRORS as TRANSIENT_FS_ERRORS_2 } from "./plugins/safeCopy.js";
import { sleep } from "./sleep.js";
import { count, uniq } from "./collections.js";
import { concatSafe, lit as lit_2, fromNumber, joinSafe } from "../services/analytics/safeMetadata.js";
import { pMap } from "../../vendor/p-map/index.js";
import { lintMemoryWrite } from "../memdir/memoryWriteLint.js";
import { cleanupOldFilesInDirectory } from "./cleanup.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:1372980-1374895 facade-exports (2.1.88 match: fileHistoryMakeSnapshot, 0.556)
/**
 * fileHistory 状态归约：track（把首个备份记入最近快照并记 delta）、snapshot（追加快照，超过上限淘汰旧快照并删除不再引用的备份、记录到会话日志、通知 VS Code）、touch（只增序号）。
 */
function reduceFileHistoryState(fileHistory, action, storageV5) {
  switch (action.kind) {
    case "track":
      try {
        let mostRecentSnapshot = fileHistory.snapshots.at(-1);
        if (!mostRecentSnapshot) return fileHistory;
        let trackSequence = (fileHistory.trackSequence ?? 0) + 1;
        if (getOwn(mostRecentSnapshot.trackedFileBackups, action.trackingPath))
          return {
            ...fileHistory,
            trackSequence,
          };
        let trackedFiles = fileHistory.trackedFiles.has(action.trackingPath)
          ? fileHistory.trackedFiles
          : new Set(fileHistory.trackedFiles).add(action.trackingPath);
        let nextState = {
          ...mostRecentSnapshot,
          trackedFileBackups: {
            ...mostRecentSnapshot.trackedFileBackups,
            [action.trackingPath]: action.backup,
          },
        };
        let state = {
          ...fileHistory,
          snapshots: (() => {
            let copy = fileHistory.snapshots.slice();
            copy[copy.length - 1] = nextState;
            return copy;
          })(),
          trackedFiles,
          trackSequence,
        };
        maybeDumpStateForDebug(state);
        recordFileHistoryDelta(
          action.messageId,
          mostRecentSnapshot.messageId,
          action.trackingPath,
          action.backup,
          storageV5,
        ).catch((trackingPath) => {
          logError(Error(`FileHistory: Failed to record delta: ${trackingPath}`));
        });
        logEvent("tengu_file_history_track_edit_success", {
          isNewFile: action.isAddingFile,
          version: action.backup.version,
        });
        logForDebugging(`FileHistory: Tracked file modification for ${action.filePath}`);
        return state;
      } catch (error) {
        logError(error);
        logEvent("tengu_file_history_track_edit_failed", {});
        return fileHistory;
      }
    case "snapshot":
      try {
        let backups = {
          ...action.trackedFileBackups,
        };
        let lastSnapshot = fileHistory.snapshots.at(-1);
        if (lastSnapshot)
          for (let trackingPath of fileHistory.trackedFiles) {
            if (Object.hasOwn(backups, trackingPath)) continue;
            let inherited = getOwn(lastSnapshot.trackedFileBackups, trackingPath);
            if (inherited) defineOwnProperty(backups, trackingPath, inherited);
          }
        let now = new Date();
        let snapshot = {
          messageId: action.messageId,
          trackedFileBackups: backups,
          timestamp: now,
          ...(action.preCheckpoint && {
            preCheckpoint: true,
          }),
        };
        let allSnapshots = [
          ...(action.preCheckpoint
            ? fileHistory.snapshots.map((snapshot) => {
                if (snapshot.messageId !== action.messageId || !snapshot.preCheckpoint) return snapshot;
                let { preCheckpoint, ...restSnapshot } = snapshot;
                return restSnapshot;
              })
            : fileHistory.snapshots),
          snapshot,
        ];
        let allSnapshots_2 = allSnapshots;
        if (allSnapshots.length > MAX_LOGS) {
          allSnapshots_2 = allSnapshots.slice(-MAX_LOGS);
          deleteEvictedBackups(
            allSnapshots.slice(0, allSnapshots.length - MAX_LOGS),
            allSnapshots_2,
            storageV5,
          ).catch(logError);
        }
        let updatedState = {
          ...fileHistory,
          snapshots: allSnapshots_2,
          snapshotSequence: (fileHistory.snapshotSequence ?? 0) + 1,
        };
        maybeDumpStateForDebug(updatedState);
        notifyVscodeSnapshotFilesUpdated(fileHistory, updatedState).catch(logError);
        recordFileHistorySnapshot(action.messageId, snapshot, false, storageV5).catch((error) => {
          logError(Error(`FileHistory: Failed to record snapshot: ${error}`));
        });
        logForDebugging(
          `FileHistory: Added snapshot for ${action.messageId}, tracking ${fileHistory.trackedFiles.size} files`,
        );
        logEvent("tengu_file_history_snapshot_success", {
          trackedFilesCount: fileHistory.trackedFiles.size,
          snapshotCount: updatedState.snapshots.length,
        });
        return updatedState;
      } catch (error) {
        logError(error);
        logEvent("tengu_file_history_snapshot_failed", {});
        return fileHistory;
      }
    case "touch":
      return {
        ...fileHistory,
        trackSequence: (fileHistory.trackSequence ?? 0) + 1,
      };
  }
}
//@ chunk-e6aww6q8.js:1374895-1375526 layout
/**
 * 删除被淘汰快照中不再被保留快照引用的备份文件（v1 首备份不删）。
 */
async function deleteEvictedBackups(firstList, secondList, storageV5) {
  let sessionId = getSessionId();
  let kept = new Set();
  for (let entry of secondList)
    for (let trackedFileBackup of Object.values(entry.trackedFileBackups))
      if (trackedFileBackup.backupFileName !== null) kept.add(trackedFileBackup.backupFileName);
  let evicted = new Set();
  for (let entry of firstList)
    for (let trackedFileBackup of Object.values(entry.trackedFileBackups))
      if (
        trackedFileBackup.backupFileName !== null &&
        !kept.has(trackedFileBackup.backupFileName) &&
        trackedFileBackup.version !== 1 &&
        BACKUP_FILE_NAME_RE.test(trackedFileBackup.backupFileName)
      )
        evicted.add(trackedFileBackup.backupFileName);
  for (let key of evicted)
    try {
      if (storageV5) {
        let deleteResult = await storageV5.delete(resolveBackupStorageKey(key, sessionId));
        if (!deleteResult.ok)
          logForDebugging(`FileHistory: failed to delete evicted backup ${key}: ${deleteResult.error.code}`, {
            level: "error",
          });
      } else await unlink(resolveBackupPath_2(key, sessionId));
    } catch (error) {
      if (!isENOENT(error))
        logForDebugging(`FileHistory: failed to delete evicted backup ${key}: ${error}`, {
          level: "error",
        });
    }
}
//@ chunk-e6aww6q8.js:1375526-1375684 facade-exports (2.1.88 match: fileHistoryEnabled, 0.415)
/**
 * 是否启用文件检查点：非云端/非 diskless；非交互会话需 CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING；交互会话看设置 fileCheckpointingEnabled（默认 true）且未设 CLAUDE_CODE_DISABLE_FILE_CHECKPOINTING。
 */
function fileHistoryEnabled() {
  if (isRemoteSessionAvailable()) return false;
  if (isDiskless()) return false;
  if (getIsNonInteractiveSession()) return fileHistoryEnabledSdk();
  return (
    resolveSetting("fileCheckpointingEnabled", true).value && !env.CLAUDE_CODE_DISABLE_FILE_CHECKPOINTING
  );
}
//@ chunk-e6aww6q8.js:1375684-1375793 fingerprint (2.1.88 match: fileHistoryEnabledSdk, 1)
/**
 * SDK 模式是否启用文件检查点（ENABLE_SDK_FILE_CHECKPOINTING 且未 DISABLE）。
 */
function fileHistoryEnabledSdk() {
  return env.CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING && !env.CLAUDE_CODE_DISABLE_FILE_CHECKPOINTING;
}
//@ chunk-e6aww6q8.js:1375793-1376525 facade-exports (2.1.88 match: fileHistoryTrackEdit, 0.43)
/**
 * 编辑前跟踪文件：未启用或已跟踪时只 touch；否则为文件创建 v1 备份（新文件 backupFileName 为 null）并派发 track 操作。Edit/Write/NotebookEdit 在写入前调用。
 */
async function fileHistoryTrackEdit(getFileHistoryState, applyFileHistoryOp, filePath, messageId) {
  if (!fileHistoryEnabled()) {
    applyFileHistoryOp({
      kind: "touch",
    });
    return;
  }
  let trackingPath = maybeShortenFilePath(filePath);
  let state = getFileHistoryState();
  if (!state) {
    applyFileHistoryOp({
      kind: "touch",
    });
    return;
  }
  let mostRecent = state.snapshots.at(-1);
  if (!mostRecent) {
    logForDebugging("FileHistory: Missing most recent snapshot", {
      level: "error",
    });
    logEvent("tengu_file_history_track_edit_failed", {});
    applyFileHistoryOp({
      kind: "touch",
    });
    return;
  }
  if (getOwn(mostRecent.trackedFileBackups, trackingPath)) {
    applyFileHistoryOp({
      kind: "touch",
    });
    return;
  }
  for (let snapshot of state.snapshots)
    if (getOwn(snapshot.trackedFileBackups, trackingPath)) {
      applyFileHistoryOp({
        kind: "touch",
      });
      return;
    }
  let snapshot;
  try {
    snapshot = await createBackup(filePath, 1);
  } catch (error) {
    logForDebugging(
      `FileHistory: failed to back up ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
      {
        level: "error",
      },
    );
    logEvent("tengu_file_history_track_edit_failed", {});
    applyFileHistoryOp({
      kind: "touch",
    });
    return;
  }
  let isAddingFile = snapshot.backupFileName === null;
  applyFileHistoryOp({
    kind: "track",
    trackingPath,
    filePath,
    backup: snapshot,
    messageId,
    isAddingFile,
  });
}
//@ chunk-e6aww6q8.js:1376525-1377957 facade-exports
/**
 * 为一条消息生成快照：对每个已跟踪文件，未变则复用上个备份，删除则记 null，否则创建新版本备份；最后派发 snapshot 操作（支持 preCheckpoint）。
 */
async function fileHistoryMakeSnapshot(getState, sessionId, messageId, options) {
  if (!fileHistoryEnabled()) return;
  let state = getState();
  if (!state) return;
  if (
    !options?.preCheckpoint &&
    state.snapshots.some((snapshot) => snapshot.messageId === messageId && snapshot.preCheckpoint)
  )
    return;
  let backups = {};
  let last = state.snapshots.at(-1);
  if (last) {
    logForDebugging(`FileHistory: Making snapshot for message ${messageId}`);
    await Promise.all(
      Array.from(state.trackedFiles, async (trackingPath) => {
        try {
          let expandedPath = expandTrackingPath(trackingPath);
          let prevBackup = getOwn(last.trackedFileBackups, trackingPath);
          let backupVersion = parseBackupVersion(prevBackup?.backupFileName);
          let maxVersion = 0;
          for (let snapshot of state.snapshots) {
            let oldBackup = getOwn(snapshot.trackedFileBackups, trackingPath);
            if (oldBackup && isUsableBackupVersion(oldBackup.version))
              maxVersion = Math.max(maxVersion, oldBackup.version);
            let backupVersion = parseBackupVersion(oldBackup?.backupFileName);
            if (backupVersion !== undefined) maxVersion = Math.max(maxVersion, backupVersion);
          }
          let version = maxVersion + 1;
          if (!isUsableBackupVersion(version)) throw Error("FileHistory: no usable next version");
          let originalStatsHint;
          try {
            originalStatsHint = await stat(expandedPath);
          } catch (error) {
            if (!isENOENT(error)) throw error;
          }
          if (!originalStatsHint) {
            defineOwnProperty(backups, trackingPath, {
              backupFileName: null,
              version,
              backupTime: new Date(),
              realParentDir: await isENOENT_2(expandedPath),
            });
            logEvent("tengu_file_history_backup_deleted_file", {
              version,
            });
            logForDebugging(`FileHistory: Missing tracked file: ${trackingPath}`);
            return;
          }
          let reusedVersion =
            backupVersion !== undefined
              ? backupVersion
              : prevBackup && isUsableBackupVersion(prevBackup.version)
                ? prevBackup.version
                : undefined;
          if (
            prevBackup &&
            typeof prevBackup.backupFileName === "string" &&
            BACKUP_FILE_NAME_PATTERN_WITH_LEGACY.test(prevBackup.backupFileName) &&
            reusedVersion !== undefined &&
            !(await hasFileChangedSinceBackup(expandedPath, prevBackup.backupFileName, originalStatsHint))
          ) {
            defineOwnProperty(
              backups,
              trackingPath,
              prevBackup.realParentDir !== undefined && reusedVersion === prevBackup.version
                ? prevBackup
                : {
                    ...prevBackup,
                    version: reusedVersion,
                    realParentDir:
                      prevBackup.realParentDir !== undefined
                        ? prevBackup.realParentDir
                        : await isENOENT_2(expandedPath),
                  },
            );
            return;
          }
          defineOwnProperty(backups, trackingPath, await createBackup(expandedPath, version));
        } catch (error) {
          logForDebugging(`FileHistory: Failed to back up ${trackingPath}: ${error}`, {
            level: "error",
          });
          logEvent("tengu_file_history_backup_file_failed", {});
        }
      }),
    );
  }
  sessionId({
    kind: "snapshot",
    messageId,
    trackedFileBackups: backups,
    ...(options?.preCheckpoint && {
      preCheckpoint: true,
    }),
  });
}
//@ chunk-e6aww6q8.js:1377957-1377978 facade-exports
/**
 * rewind 时所有有差异的文件都恢复失败抛出的错误类型。
 */
let RewindNoFilesRestoredError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (./errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:1377957", () => {
  RewindNoFilesRestoredError = class RewindNoFilesRestoredError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {};
});
//@ chunk-e6aww6q8.js:1377978-1379208 facade-exports (2.1.88 match: fileHistoryRewind, 0.674)
/**
 * 回退到某消息的快照：applySnapshot 恢复所有已跟踪文件；全部失败时抛 NoFilesRestoredError；返回跳过的链接数。
 */
async function fileHistoryRewind(updateFileHistoryState, messageId) {
  if (!fileHistoryEnabled()) return;
  let captured = updateFileHistoryState();
  if (!captured) return;
  let targetSnapshot = captured.snapshots.findLast((snapshot) => snapshot.messageId === messageId);
  if (!targetSnapshot) {
    logError(Error(`FileHistory: Snapshot for ${messageId} not found`));
    logEvent("tengu_file_history_rewind_failed", {
      trackedFilesCount: captured.trackedFiles.size,
      snapshotFound: false,
    });
    throw Error("The selected snapshot was not found");
  }
  let before;
  let after;
  let counts;
  try {
    logForDebugging(`FileHistory: [Rewind] Rewinding to snapshot for ${messageId}`);
    ({
      filesChanged: before,
      filesFailed: after,
      skippedLinks: counts,
    } = await applySnapshot(captured, targetSnapshot));
  } catch (error) {
    logError(error);
    logEvent("tengu_file_history_rewind_failed", {
      trackedFilesCount: captured.trackedFiles.size,
      snapshotFound: true,
    });
    throw error;
  }
  if (after.length > 0 && before.length === 0) {
    logEvent("tengu_file_history_rewind_failed", {
      trackedFilesCount: captured.trackedFiles.size,
      snapshotFound: true,
      filesFailedCount: after.length,
      skippedLinksCount: counts,
    });
    throw new RewindNoFilesRestoredError(
      `No files were restored: ${after.length} ${plural(after.length, "file")} failed (backup missing, or the file could not be updated)${counts > 0 ? `, and ${counts} ${plural(counts, "path was", "paths were")} skipped for link safety` : ""}`,
      "No files were restored: all differing files failed",
    );
  }
  logForDebugging(`FileHistory: [Rewind] Finished rewinding to ${messageId}`);
  logEvent("tengu_file_history_rewind_success", {
    trackedFilesCount: captured.trackedFiles.size,
    filesChangedCount: before.length,
    filesFailedCount: after.length,
    skippedLinksCount: counts,
  });
  return {
    skippedLinks: counts,
  };
}
//@ chunk-e6aww6q8.js:1379208-1379290 facade-exports (2.1.88 match: fileHistoryCanRestore, 1)
/**
 * 是否存在该消息的快照（可回退）。
 */
function fileHistoryCanRestore(state, messageId) {
  if (!fileHistoryEnabled()) return false;
  return state.snapshots.some((snapshot) => snapshot.messageId === messageId);
}
//@ chunk-e6aww6q8.js:1379290-1380120 facade-exports (2.1.88 match: fileHistoryGetDiffStats, 1)
/**
 * 计算回退到某快照会改动哪些文件及增删行数（dry run）。
 */
async function fileHistoryGetDiffStats(state, messageId) {
  if (!fileHistoryEnabled()) return;
  let targetSnapshot = state.snapshots.findLast((snapshot) => snapshot.messageId === messageId);
  if (!targetSnapshot) return;
  let results = await Promise.all(
    Array.from(state.trackedFiles, async (trackingPath) => {
      try {
        let filePath = expandTrackingPath(trackingPath);
        let targetBackup = getOwn(targetSnapshot.trackedFileBackups, trackingPath);
        let backupFileName = targetBackup
          ? targetBackup.backupFileName
          : getBackupFileNameFirstVersion(trackingPath, state)?.backupFileName;
        if (backupFileName === undefined) {
          logForDebugging("FileHistory: Error finding the backup file to apply", {
            level: "error",
          });
          logEvent("tengu_file_history_rewind_restore_file_failed", {
            dryRun: true,
          });
          return null;
        }
        let stats = await computeDiffStatsForFile(
          filePath,
          backupFileName === null ? undefined : backupFileName,
        );
        if (stats?.insertions || stats?.deletions)
          return {
            filePath,
            stats,
          };
        if (backupFileName === null && (await pathExists(filePath)))
          return {
            filePath,
            stats,
          };
        return null;
      } catch (error) {
        logError(error);
        logEvent("tengu_file_history_rewind_restore_file_failed", {
          dryRun: true,
        });
        return null;
      }
    }),
  );
  let filesChanged = [];
  let insertions = 0;
  let deletions = 0;
  for (let result of results) {
    if (!result) continue;
    filesChanged.push(result.filePath);
    insertions += result.stats?.insertions || 0;
    deletions += result.stats?.deletions || 0;
  }
  return {
    filesChanged,
    insertions,
    deletions,
  };
}
//@ chunk-e6aww6q8.js:1380120-1380162 facade-exports
/**
 * fileHistory 常量：差异统计读文件上限 1MB、行 diff maxEditLength 500、消息选择器统计时限 1000ms、mtime 近期窗口 2000ms。
 */
var TURN_DIFF_MAX_BYTES = 1048576;
var DIFF_MAX_EDIT_LENGTH = 500;
var TURN_DIFF_COUNTING_MS = 1000;
var RECENT_MTIME_WINDOW_MS = 2000;
//@ chunk-e6aww6q8.js:1380162-1381968 facade-exports (2.1.88 match: fileHistoryHasAnyChanges, 0.345)
/**
 * 统计两个快照之间（或快照到当前磁盘）每个文件的增删行，用于消息选择器显示每轮改动。
 */
async function fileHistoryGetTurnDiffStats(fileHistory, uuid, previousMessageId, options) {
  if (!fileHistoryEnabled()) return;
  let targetSnapshot = fileHistory.snapshots.findLast((snapshot) => snapshot.messageId === uuid);
  if (!targetSnapshot) return;
  let previousSnapshot =
    previousMessageId === undefined
      ? undefined
      : fileHistory.snapshots.findLast((snapshot) => snapshot.messageId === previousMessageId);
  let files = [];
  for (let trackingPath of fileHistory.trackedFiles)
    try {
      let afterBackup = getOwn(targetSnapshot.trackedFileBackups, trackingPath);
      let beforeBackup = previousSnapshot && getOwn(previousSnapshot.trackedFileBackups, trackingPath);
      if (previousSnapshot && !afterBackup && !beforeBackup) continue;
      let afterRef = afterBackup ?? getBackupFileNameFirstVersion(trackingPath, fileHistory);
      let backupFileName = afterRef?.backupFileName;
      let backupFileName_2 = previousSnapshot
        ? (beforeBackup ?? getBackupFileNameFirstVersion(trackingPath, fileHistory))?.backupFileName
        : undefined;
      if (
        backupFileName === undefined ||
        (previousSnapshot && (backupFileName_2 === undefined || backupFileName_2 === backupFileName))
      )
        continue;
      files.push({
        trackingPath,
        before: backupFileName,
        beforeTakenAt: new Date(afterRef?.backupTime ?? Number.NaN).getTime(),
        beforeRealParentDir: afterRef?.realParentDir,
        after: backupFileName_2,
      });
    } catch (error) {
      logForDebugging(`FileHistory: skipping turn diff stats for ${trackingPath}: ${errorMessage(error)}`, {
        level: "error",
      });
    }
  let changedFiles = [];
  let insertions = 0;
  let deletions = 0;
  let isComplete = true;
  for (let { trackingPath, before, beforeTakenAt, beforeRealParentDir, after } of files) {
    if (options.signal.aborted) return;
    try {
      let filePath = expandTrackingPath(trackingPath);
      let pastDeadline = performance.now() >= options.countUntil;
      let lineCounts;
      if (
        after === undefined &&
        ([trackingPath, filePath].some((path) => isNonWslUncPath(path) || isNetworkOrSpecialPath(path)) ||
          (await checkRestoreDestination(filePath, beforeRealParentDir).then(
            (verdict) => verdict.verdict === "refused",
            () => true,
          )))
      )
        lineCounts = null;
      else if (after === undefined) {
        let maxBytes = pastDeadline ? -1 : TURN_DIFF_MAX_BYTES;
        let [backupForDiff, beforeDiff] = await Promise.all([
          readBackupForDiff(before, maxBytes),
          checkOriginFileChanged(filePath, {
            noFollow: true,
            maxBytes,
          }),
        ]);
        if (hasTextOrAbsent(backupForDiff) && hasTextOrAbsent(beforeDiff))
          lineCounts = countLineChanges(backupForDiff.text, beforeDiff.text);
        else if (backupForDiff.stats === undefined || beforeDiff.stats === undefined) lineCounts = null;
        else {
          let mtimeMs = backupForDiff.stats?.mtimeMs ?? 0;
          let recentBefore =
            beforeDiff.stats?.mtimeMs !== mtimeMs || beforeTakenAt - mtimeMs <= RECENT_MTIME_WINDOW_MS;
          if (compareStatsAndContent(beforeDiff.stats, backupForDiff.stats, () => recentBefore))
            lineCounts = null;
        }
      } else {
        let pairKey = `${before}:${after}`;
        lineCounts = options.pairCounts.get(pairKey);
        if (!lineCounts && pastDeadline) lineCounts = null;
        else if (!lineCounts) {
          let [backupForDiff, backupForDiff_2] = await Promise.all([
            readBackupForDiff(before, TURN_DIFF_MAX_BYTES),
            readBackupForDiff(after, TURN_DIFF_MAX_BYTES),
          ]);
          lineCounts =
            hasTextOrAbsent(backupForDiff) && hasTextOrAbsent(backupForDiff_2)
              ? countLineChanges(backupForDiff.text, backupForDiff_2.text)
              : null;
          if (lineCounts) options.pairCounts.set(pairKey, lineCounts);
        }
      }
      if (lineCounts === undefined) continue;
      changedFiles.push(filePath);
      if (lineCounts === null) {
        isComplete = false;
        continue;
      }
      insertions += lineCounts.insertions;
      deletions += lineCounts.deletions;
      await yieldToEventLoop();
    } catch (error) {
      logForDebugging(`FileHistory: skipping turn diff stats for ${trackingPath}: ${errorMessage(error)}`, {
        level: "error",
      });
    }
  }
  return isComplete
    ? {
        filesChanged: changedFiles,
        insertions,
        deletions,
      }
    : {
        filesChanged: changedFiles,
        insertions: 0,
        deletions: 0,
      };
}
//@ chunk-e6aww6q8.js:1381968-1382110 layout
async function readBackupForDiff(backupKey, maxBytes) {
  if (backupKey === null)
    return {
      stats: null,
    };
  let originState = await checkOriginFileChanged(resolveBackupPath_2(backupKey), {
    noFollow: true,
    maxBytes,
  });
  return originState.stats === null
    ? {
        stats: undefined,
      }
    : originState;
}
//@ chunk-e6aww6q8.js:1382110-1382165 layout
function hasTextOrAbsent(backupForDiff) {
  return backupForDiff.text !== undefined || backupForDiff.stats === null;
}
//@ chunk-e6aww6q8.js:1382165-1382637 layout
function countLineChanges(text, text_2) {
  if (text === text_2) return;
  let beforeText = text ?? "";
  let afterText = text_2 ?? "";
  if (beforeText === "" || afterText === "")
    return {
      insertions: splitLinesDroppingTrailing(afterText).length,
      deletions: splitLinesDroppingTrailing(beforeText).length,
    };
  let changes = diffLines(beforeText, afterText, {
    maxEditLength: DIFF_MAX_EDIT_LENGTH,
  });
  if (changes) {
    let insertions = 0;
    let deletions = 0;
    for (let change of changes)
      if (change.added) insertions += change.count;
      else if (change.removed) deletions += change.count;
    return {
      insertions,
      deletions,
    };
  }
  let beforeLines = splitLinesDroppingTrailing(beforeText);
  let afterLines = splitLinesDroppingTrailing(afterText);
  let beforeCounts = new Map();
  for (let line of beforeLines) beforeCounts.set(line, (beforeCounts.get(line) ?? 0) + 1);
  let insertions = 0;
  for (let line of afterLines) {
    let remaining = beforeCounts.get(line);
    if (remaining) beforeCounts.set(line, remaining - 1);
    else insertions++;
  }
  return {
    insertions,
    deletions: beforeLines.length - (afterLines.length - insertions),
  };
}
//@ chunk-e6aww6q8.js:1382637-1382706 layout
function splitLinesDroppingTrailing(text) {
  let lines = text.split(`
`);
  if (lines.at(-1) === "") lines.pop();
  return lines;
}
//@ chunk-e6aww6q8.js:1382706-1384588 fingerprint (2.1.88 match: applySnapshot, 0.515)
/**
 * 把所有已跟踪文件恢复到目标快照的版本：备份为 null 则删除文件，否则校验目标安全后从备份恢复；返回改动/失败列表与跳过的链接数。
 */
async function applySnapshot(state, targetSnapshot) {
  let changedFiles = [];
  let failedFiles = [];
  let skippedLinks = 0;
  for (let trackingPath of state.trackedFiles) {
    let filePath = expandTrackingPath(trackingPath);
    try {
      let backup =
        getOwn(targetSnapshot.trackedFileBackups, trackingPath) ??
        getBackupFileNameFirstVersion(trackingPath, state);
      let backupFileName = backup?.backupFileName;
      if (backupFileName === undefined) {
        logForDebugging("FileHistory: Error finding the backup file to apply", {
          level: "error",
        });
        logEvent("tengu_file_history_rewind_restore_file_failed", {
          dryRun: false,
        });
        continue;
      }
      let destCheck = await checkRestoreDestination(filePath, backup?.realParentDir);
      if (destCheck.verdict === "refused") {
        skippedLinks++;
        logEvent("tengu_file_history_rewind_restore_file_failed", {
          dryRun: false,
        });
        logForDebugging(`FileHistory: [Rewind] Refusing to touch ${filePath}: ${destCheck.detail}`, {
          level: "error",
        });
        continue;
      }
      if (backupFileName === null) {
        try {
          let parentCheck = await checkRestoreParentDir(filePath, backup?.realParentDir);
          switch (parentCheck.verdict) {
            case "refused":
              skippedLinks++;
              logEvent("tengu_file_history_rewind_restore_file_failed", {
                dryRun: false,
              });
              logForDebugging(`FileHistory: [Rewind] Refusing to delete ${filePath}: ${parentCheck.detail}`, {
                level: "error",
              });
              continue;
            case "absent":
              continue;
            case "unbound":
              await unlink(filePath);
              break;
            case "deleted":
              break;
          }
          logForDebugging(`FileHistory: [Rewind] Deleted ${filePath}`);
          changedFiles.push(filePath);
        } catch (error) {
          let errnoCode = getErrnoCode(error);
          if (errnoCode === "ENOTDIR" || errnoCode === "ELOOP" || errnoCode === "EISDIR") {
            skippedLinks++;
            logEvent("tengu_file_history_rewind_restore_file_failed", {
              dryRun: false,
            });
            logForDebugging(
              `FileHistory: [Rewind] Refusing to delete ${filePath}: path does not resolve or is not a regular file (${errnoCode})`,
              {
                level: "error",
              },
            );
            continue;
          }
          if (errnoCode === "EPERM") {
            let stats = await lstat(filePath).catch(() => {
              return;
            });
            if (stats !== undefined && !stats.isFile()) {
              skippedLinks++;
              logEvent("tengu_file_history_rewind_restore_file_failed", {
                dryRun: false,
              });
              logForDebugging(
                `FileHistory: [Rewind] Refusing to delete ${filePath}: destination is not a regular file (EPERM)`,
                {
                  level: "error",
                },
              );
              continue;
            }
          }
          if (!isENOENT(error)) throw error;
        }
        continue;
      }
      if (await hasFileChangedSinceBackup(filePath, backupFileName)) {
        let outcome = await restoreBackup(filePath, backupFileName, backup?.realParentDir);
        if (outcome === "restored") {
          logForDebugging(`FileHistory: [Rewind] Restored ${filePath} from ${backupFileName}`);
          changedFiles.push(filePath);
        } else if (outcome === "refused") skippedLinks++;
        else failedFiles.push(filePath);
      }
    } catch (error) {
      logForDebugging(
        `FileHistory: [Rewind] Failed to restore ${trackingPath}: ${error instanceof Error ? error.message : String(error)}`,
        {
          level: "error",
        },
      );
      logEvent("tengu_file_history_rewind_restore_file_failed", {
        dryRun: false,
      });
      failedFiles.push(filePath);
    }
  }
  resetPlanFileCacheToUnknown();
  return {
    filesChanged: changedFiles,
    filesFailed: failedFiles,
    skippedLinks,
  };
}
//@ chunk-e6aww6q8.js:1384588-1384870 layout
async function hasFileChangedSinceBackup(originalFile, backupFileName, originalStatsHint) {
  let backupPath = resolveBackupPath_2(backupFileName);
  let originalStats = originalStatsHint ?? null;
  if (!originalStats)
    try {
      originalStats = await stat(originalFile);
    } catch (e) {
      if (!isENOENT(e)) return true;
    }
  let backupStats = null;
  try {
    backupStats = await stat(backupPath);
  } catch (e) {
    if (!isENOENT(e)) return true;
  }
  return compareStatsAndContent(originalStats, backupStats, async () => {
    let [originalContent, backupContent] = await Promise.all([
      readFileTextNoFollow(originalFile),
      readFileTextNoFollow(backupPath, {
        noFollow: true,
      }),
    ]);
    if (originalContent === null || backupContent === null) return true;
    return originalContent !== backupContent;
  });
}
//@ chunk-e6aww6q8.js:1384870-1385080 file-local
function compareStatsAndContent(originalStats, backupStats, compareContent) {
  if ((originalStats === null) !== (backupStats === null)) return true;
  if (originalStats === null || backupStats === null) return false;
  if (!originalStats.isFile() || !backupStats.isFile()) return true;
  if (originalStats.mode !== backupStats.mode || originalStats.size !== backupStats.size) return true;
  if (originalStats.mtimeMs < backupStats.mtimeMs) return false;
  return compareContent();
}
//@ chunk-e6aww6q8.js:1385080-1385486 fingerprint (2.1.88 match: computeDiffStatsForFile, 0.941)
async function computeDiffStatsForFile(originalFile, backupFileName) {
  let filesChanged = [];
  let insertions = 0;
  let deletions = 0;
  try {
    let backupPath = backupFileName ? resolveBackupPath_2(backupFileName) : undefined;
    let [originalContent, backupContent] = await Promise.all([
      readFileTextNoFollow(originalFile),
      backupPath
        ? readFileTextNoFollow(backupPath, {
            noFollow: true,
          })
        : null,
    ]);
    if (originalContent === null && backupContent === null)
      return {
        filesChanged,
        insertions,
        deletions,
      };
    filesChanged.push(originalFile);
    diffLines(originalContent ?? "", backupContent ?? "").forEach((change) => {
      if (change.added) insertions += change.count || 0;
      if (change.removed) deletions += change.count || 0;
    });
  } catch (error) {
    logError(Error(`FileHistory: Error generating diffStats: ${error}`));
  }
  return {
    filesChanged,
    insertions,
    deletions,
  };
}
//@ chunk-e6aww6q8.js:1385486-1385571 callgraph-fingerprint (2.1.88 match: getBackupFileName, 1)
/**
 * 备份文件名：路径哈希前 16 位 + "@v" + 版本。
 */
function getBackupFileName(filePath, version) {
  return `${createHash("sha256").update(filePath).digest("hex").slice(0, 16)}@v${version}`;
}
//@ chunk-e6aww6q8.js:1385571-1385601 affinity
var BACKUP_FILE_NAME_RE = /^[0-9a-f]{16}@v\d+$/;
//@ chunk-e6aww6q8.js:1385601-1385675 sole-consumer
function isPositiveSafeInteger(value) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 1;
}
//@ chunk-e6aww6q8.js:1385675-1385715 sole-consumer
function isUsableBackupVersion(version) {
  return isPositiveSafeInteger(version) && isPositiveSafeInteger(version + 1);
}
//@ chunk-e6aww6q8.js:1385715-1385846 sole-consumer
function parseBackupVersion(backupFileName) {
  if (typeof backupFileName !== "string") return;
  let match = backupFileName.match(/@v(\d+)$/);
  let version = match ? Number(match[1]) : undefined;
  return version !== undefined && isUsableBackupVersion(version) ? version : undefined;
}
//@ chunk-e6aww6q8.js:1385846-1386014 sole-consumer
function assertValidBackupFileNameAndSession(backupFileName, sessionId) {
  if (typeof backupFileName !== "string" || !BACKUP_FILE_NAME_PATTERN_WITH_LEGACY.test(backupFileName))
    throw Error("FileHistory: invalid backup file name");
  if (sessionId && !isSafeIdSegment_2(sessionId)) throw Error("FileHistory: invalid session id");
}
//@ chunk-e6aww6q8.js:1386014-1386088 sole-consumer (2.1.88 match: resolveBackupPath, 1)
/**
 * 备份文件的绝对路径（配置目录/file-history/<sessionId>/<name>），先校验名字与会话 id。
 */
function resolveBackupPath_2(backupFileName, sessionId) {
  assertValidBackupFileNameAndSession(backupFileName, sessionId);
  let configDir = getClaudeConfigDir();
  return join(configDir, "file-history", sessionId || getSessionId(), backupFileName);
}
//@ chunk-e6aww6q8.js:1386088-1386147 sole-consumer
function resolveBackupStorageKey(backupName, sessionId) {
  assertValidBackupFileNameAndSession(backupName, sessionId);
  return STORAGE_SPACES.fileHistory(sessionId || getSessionId(), backupName);
}
//@ chunk-e6aww6q8.js:1386405-1386976 fingerprint (2.1.88 match: createBackup, 0.778)
/**
 * 为文件创建指定版本的备份（file-history/<session>/<hash>@v<n>）；文件不存在时返回 backupFileName null。
 */
async function createBackup(filePath, version) {
  let backupFileName = getBackupFileName(filePath, version);
  let backupPath = resolveBackupPath_2(backupFileName);
  let srcStats;
  try {
    srcStats = await stat(filePath);
  } catch (e) {
    if (isENOENT(e))
      return {
        backupFileName: null,
        version,
        backupTime: new Date(),
        realParentDir: await isENOENT_2(filePath),
      };
    throw e;
  }
  if (!srcStats.isFile()) throw Error("FileHistory: tracked path is not a regular file");
  await unlink(backupPath).catch((error) => {
    if (!isENOENT(error)) throw error;
  });
  try {
    await copyFile(filePath, backupPath);
  } catch (e) {
    if (!isENOENT(e)) throw e;
    await mkdir(dirname(backupPath), {
      recursive: true,
    });
    await copyFile(filePath, backupPath);
  }
  await chmod(backupPath, srcStats.mode);
  let realParentDir = await isENOENT_2(filePath);
  logEvent("tengu_file_history_backup_file_created", {
    version,
    fileSize: srcStats.size,
  });
  return {
    backupFileName,
    version,
    backupTime: new Date(),
    realParentDir,
  };
}
//@ chunk-e6aww6q8.js:1386976-1388046 layout
async function checkRestoreDestination(filePath, realParentDir) {
  let refuse = (detail) => ({
    verdict: "refused",
    detail,
  });
  try {
    let stats = await lstat(filePath);
    if (stats.isSymbolicLink()) return refuse("destination is a symlink");
    if (!stats.isFile()) return refuse("destination is not a regular file");
    if (stats.nlink > 1) return refuse(`destination is hard-linked (nlink=${stats.nlink})`);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ELOOP" || errnoCode === "ENOTDIR")
      return refuse(`destination path does not resolve (${errnoCode})`);
    if (!isENOENT(error)) throw error;
  }
  if (realParentDir !== undefined) {
    let parentDir = dirname(filePath);
    let resolvedParent;
    try {
      resolvedParent = await realpath(parentDir);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ELOOP" || errnoCode === "ENOTDIR")
        return refuse(`parent path does not resolve (${errnoCode})`);
      if (!isENOENT(error)) throw error;
      try {
        if ((await lstat(parentDir)).isSymbolicLink())
          return refuse("parent directory is a dangling symlink");
      } catch (error) {
        if (!isENOENT(error)) throw error;
      }
      let currentDir = parentDir;
      for (;;) {
        let parentOfCurrent = dirname(currentDir);
        if (parentOfCurrent === currentDir) break;
        currentDir = parentOfCurrent;
        try {
          await lstat(currentDir);
        } catch (error) {
          if (!isENOENT(error)) throw error;
          continue;
        }
        resolvedParent = await realpath(currentDir)
          .then((resolvedDir) => join(resolvedDir, relative(currentDir, parentDir)))
          .catch((error) => {
            if (isENOENT(error)) return;
            throw error;
          });
        break;
      }
    }
    if (resolvedParent !== realParentDir)
      return refuse(`parent directory moved (${resolvedParent} != ${realParentDir})`);
    let parentStats = await stat(parentDir).catch((error) => {
      if (isENOENT(error)) return;
      throw error;
    });
    if (parentStats !== undefined && !parentStats.isDirectory())
      return refuse("parent path is not a directory");
  }
  return {
    verdict: "safe",
  };
}
//@ chunk-e6aww6q8.js:1388046-1388676 layout
async function checkRestoreParentDir(filePath, realParentDir) {
  if (
    realParentDir === undefined ||
    !readFlagWithOverride("tengu_lucky_finch", {
      safe: true,
    })
  )
    return {
      verdict: "unbound",
    };
  let fileName = basename(filePath);
  let platform = getPlatform();
  if (platform === "linux" || platform === "wsl") {
    let dirHandle;
    try {
      dirHandle = await open(
        realParentDir,
        O_NOFOLLOW_ANY | constants.O_DIRECTORY | constants.O_NOFOLLOW | READ_LIMITS,
      );
    } catch (error) {
      return parentDirOpenErrorVerdict(error);
    }
    try {
      let resolvedDir = await readlink(`/proc/self/fd/${dirHandle.fd}`).catch((error) => {
        if (isENOENT(error)) return null;
        throw error;
      });
      if (resolvedDir === null)
        return {
          verdict: "unbound",
        };
      if (resolvedDir !== realParentDir) {
        if (resolvedDir.endsWith(" (deleted)"))
          return {
            verdict: "absent",
          };
        return {
          verdict: "refused",
          detail: `its directory moved since the checkpoint (now ${resolvedDir}, was ${realParentDir})`,
        };
      }
      await unlink(`/proc/self/fd/${dirHandle.fd}/${fileName}`);
      return {
        verdict: "deleted",
      };
    } finally {
      await dirHandle.close();
    }
  }
  return {
    verdict: "unbound",
  };
}
//@ chunk-e6aww6q8.js:1388676-1388901 layout
function parentDirOpenErrorVerdict(error) {
  let errnoCode = getErrnoCode(error);
  if (errnoCode === "ENOENT")
    return {
      verdict: "absent",
    };
  if (errnoCode === "ELOOP" || errnoCode === "ENOTDIR")
    return {
      verdict: "refused",
      detail: `its directory was replaced by a link or a non-directory since the checkpoint (${errnoCode})`,
    };
  throw error;
}
//@ chunk-e6aww6q8.js:1388901-1391864 callgraph-witnessed (2.1.88 match: restoreBackup, 0.14)
/**
 * 从备份文件恢复单个文件（检查目标不是符号链接/硬链接、父目录未被替换，写临时文件后 rename）。
 */
async function restoreBackup(filePath, backupFileName, realParentDir) {
  let backupPath = resolveBackupPath_2(backupFileName);
  let refuse = (detail) => {
    logEvent("tengu_file_history_rewind_restore_file_failed", {
      dryRun: false,
    });
    logForDebugging(`FileHistory: [Rewind] Refusing to restore ${filePath}: ${detail}`, {
      level: "error",
    });
    return "refused";
  };
  let backupStats;
  try {
    backupStats = await stat(backupPath);
  } catch (error) {
    if (isENOENT(error)) {
      logEvent("tengu_file_history_rewind_restore_file_failed", {
        dryRun: false,
      });
      logForDebugging(`FileHistory: [Rewind] Backup file not found: ${backupPath}`, {
        level: "error",
      });
      return "backup-missing";
    }
    throw error;
  }
  if (!backupStats.isFile()) return refuse("backup source is not a regular file");
  let O_NONBLOCK = constants.O_NONBLOCK ?? 0;
  let O_NOFOLLOW = constants.O_NOFOLLOW ?? 0;
  let sourceHandle;
  try {
    sourceHandle = await open(backupPath, constants.O_RDONLY | O_NONBLOCK | O_NOFOLLOW);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ELOOP" || errnoCode === "EMLINK")
      return refuse("backup source became a symlink (O_NOFOLLOW)");
    throw error;
  }
  try {
    if (!(await sourceHandle.stat()).isFile()) return refuse("backup source is not a regular file");
    let O_NOFOLLOW = constants.O_NOFOLLOW ?? 0;
    let O_NONBLOCK = constants.O_NONBLOCK ?? 0;
    let openFlags = constants.O_WRONLY | constants.O_CREAT | O_NOFOLLOW | O_NONBLOCK;
    let isSymlinkError = (error) => {
      let errnoCode = getErrnoCode(error);
      return errnoCode === "ELOOP" || errnoCode === "EMLINK";
    };
    let isFifoError = (error) => getErrnoCode(error) === "ENXIO";
    let isPathChangedError = (error) => {
      let errnoCode = getErrnoCode(error);
      return errnoCode === "EISDIR" || errnoCode === "ENOTDIR";
    };
    let mode = backupStats.mode & 511;
    let destHandle;
    try {
      destHandle = await open(filePath, openFlags, mode);
    } catch (error) {
      if (isSymlinkError(error)) return refuse("destination became a symlink (O_NOFOLLOW)");
      if (isFifoError(error)) return refuse("destination became a FIFO (ENXIO)");
      if (isPathChangedError(error))
        return refuse(`destination path was changed during restore (${getErrnoCode(error)})`);
      if (!isENOENT(error)) throw error;
      if (realParentDir !== undefined) {
        if (
          (await isENOENT_2(filePath).catch(() => {
            return;
          })) !== realParentDir
        )
          return refuse("parent chain changed before directory creation");
      }
      try {
        await mkdir(dirname(filePath), {
          recursive: true,
        });
      } catch (error) {
        if (isPathChangedError(error) || getErrnoCode(error) === "EEXIST")
          return refuse(`destination path was changed during restore (${getErrnoCode(error)})`);
        throw error;
      }
      try {
        destHandle = await open(filePath, openFlags, mode);
      } catch (error) {
        if (isSymlinkError(error)) return refuse("destination became a symlink (O_NOFOLLOW)");
        if (isFifoError(error)) return refuse("destination became a FIFO (ENXIO)");
        if (isPathChangedError(error))
          return refuse(`destination path was changed during restore (${getErrnoCode(error)})`);
        throw error;
      }
    }
    try {
      let stats = await destHandle.stat({
        bigint: true,
      });
      if (!stats.isFile()) return refuse("destination is not a regular file");
      if (stats.nlink > 1) return refuse(`destination is hard-linked (nlink=${stats.nlink})`);
      if (realParentDir !== undefined) {
        if (
          (await realpath(dirname(filePath)).catch(() => {
            return;
          })) !== realParentDir
        )
          return refuse("parent directory changed during restore");
      }
      if (realParentDir !== undefined) {
        let resolvedDest = await realpath(`/proc/self/fd/${destHandle.fd}`).catch(() => null);
        if (resolvedDest !== null && dirname(resolvedDest) !== realParentDir)
          return refuse("destination moved during restore (fd path re-check)");
      }
      let pathStats = await lstat(filePath, {
        bigint: true,
      }).catch(() => {
        return;
      });
      if (
        pathStats === undefined ||
        !pathStats.isFile() ||
        pathStats.dev !== stats.dev ||
        (stats.ino !== 0n && pathStats.ino !== stats.ino)
      )
        return refuse("destination changed identity during restore (fd/path mismatch)");
      await destHandle.truncate(0);
      let buffer = Buffer.allocUnsafe(65536);
      for (;;) {
        let { bytesRead } = await sourceHandle.read(buffer, 0, buffer.length, null);
        if (bytesRead === 0) break;
        let writtenOffset = 0;
        while (writtenOffset < bytesRead) {
          let { bytesWritten } = await destHandle.write(buffer, writtenOffset, bytesRead - writtenOffset);
          if (bytesWritten === 0) throw Error("write returned 0 bytes with data remaining");
          writtenOffset += bytesWritten;
        }
      }
      try {
        await destHandle.chmod(backupStats.mode);
      } catch (error) {
        logForDebugging(
          `FileHistory: [Rewind] chmod failed after content restore of ${filePath}: ${errorMessage(error)}`,
          {
            level: "error",
          },
        );
      }
    } finally {
      await destHandle.close();
    }
  } finally {
    try {
      await sourceHandle.close();
    } catch (error) {
      logForDebugging(
        `FileHistory: [Rewind] backup handle close failed after restore of ${filePath}: ${errorMessage(error)}`,
        {
          level: "error",
        },
      );
    }
  }
  return "restored";
}
//@ chunk-e6aww6q8.js:1391864-1391986 fingerprint (2.1.88 match: getBackupFileNameFirstVersion, 0.799)
/**
 * 取某文件在所有快照中的第一个备份。
 */
function getBackupFileNameFirstVersion(trackingPath, state) {
  for (let snapshot of state.snapshots) {
    let backup = getOwn(snapshot.trackedFileBackups, trackingPath);
    if (backup !== undefined && backup.version === 1) return backup;
  }
  return;
}
//@ chunk-e6aww6q8.js:1391986-1392077 file-local
/**
 * cwd 内的路径存为相对路径（trackingPath），其余保持绝对。
 */
function maybeShortenFilePath(filePath) {
  if (!isAbsolute(filePath)) return filePath;
  let cwd = getOriginalCwd();
  if (filePath.startsWith(cwd)) return relative(cwd, filePath);
  return filePath;
}
//@ chunk-e6aww6q8.js:1392077-1392129 layout
function expandTrackingPath(trackingPath) {
  if (isAbsolute(trackingPath)) return trackingPath;
  return join(getOriginalCwd(), trackingPath);
}
//@ chunk-e6aww6q8.js:1392129-1392391 facade-exports (2.1.88 match: fileHistoryRestoreStateFromLog, 1)
/**
 * 从会话日志里的 fileHistorySnapshots 重建 fileHistory 状态（resume 用）。
 */
function fileHistoryRestoreStateFromLog(fileHistorySnapshots, onUpdateState) {
  if (!fileHistoryEnabled()) return;
  let snapshots = [];
  let trackedFiles = new Set();
  for (let snapshot of fileHistorySnapshots) {
    let trackedFileBackups = {};
    for (let [path, backup] of Object.entries(snapshot.trackedFileBackups ?? {})) {
      let trackingPath = maybeShortenFilePath(path);
      trackedFiles.add(trackingPath);
      defineOwnProperty(trackedFileBackups, trackingPath, backup);
    }
    snapshots.push({
      ...snapshot,
      trackedFileBackups,
    });
  }
  onUpdateState({
    snapshots,
    trackedFiles,
    snapshotSequence: snapshots.length,
  });
}
//@ chunk-e6aww6q8.js:1392391-1392417 layout
var RENAME_RETRY_DELAYS_MS = [100, 200, 400, 800];
//@ chunk-e6aww6q8.js:1392417-1392571 layout
async function renameWithRetry(fromPath, toPath, delays = RENAME_RETRY_DELAYS_MS) {
  try {
    await retryFsOp(fromPath, toPath);
  } catch (error) {
    let [delayMs, ...restDelays] = delays;
    let errnoCode = getErrnoCode(error);
    if (delayMs === undefined || errnoCode === undefined || !TRANSIENT_FS_ERRORS_2.has(errnoCode))
      throw error;
    await sleep(delayMs);
    return renameWithRetry(fromPath, toPath, restDelays);
  }
}
//@ chunk-e6aww6q8.js:1392571-1392582 layout
var BACKUP_MIGRATION_CONCURRENCY = 16;
//@ chunk-e6aww6q8.js:1392582-1392639 layout
class IncompleteBackupCopyError extends Error {
  name = "IncompleteBackupCopyError";
}
//@ chunk-e6aww6q8.js:1392639-1394533 layout
async function migrateBackupForResume(backupName, previousSessionId, newBackupDir, newSessionId) {
  let sourcePath;
  try {
    sourcePath = resolveBackupPath_2(backupName, previousSessionId);
  } catch (error) {
    return {
      outcome: "failed",
      stage: "refused",
      error,
    };
  }
  let targetPath = join(newBackupDir, backupName);
  let sourceStats;
  try {
    sourceStats = await lstat(sourcePath);
  } catch (error) {
    logForDebugging(
      isENOENT(error)
        ? `FileHistory: Failed to copy backup ${backupName} on restore (backup file does not exist in ${previousSessionId})`
        : `FileHistory: cannot read backup ${backupName} in ${previousSessionId}: ${errorMessage(error)}`,
      {
        level: "error",
      },
    );
    return {
      outcome: "failed",
      stage: "source",
      error,
    };
  }
  if (!sourceStats.isFile())
    return {
      outcome: "failed",
      stage: "refused",
      error: Error("FileHistory: backup source is not a regular file"),
    };
  try {
    await link(sourcePath, targetPath);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "EEXIST")
      return {
        outcome: "already_present",
      };
    if (errnoCode === "ENOENT") {
      logForDebugging(
        `FileHistory: Failed to copy backup ${backupName} on restore (backup file does not exist in ${previousSessionId})`,
        {
          level: "error",
        },
      );
      return {
        outcome: "failed",
        stage: "link",
        error,
      };
    }
    logForDebugging(
      `FileHistory: hard link failed (${errnoCode ?? errorMessage(error)}), falling back to copy: ${sourcePath} -> ${targetPath}`,
      {
        level: "error",
      },
    );
    let fromPath = makeTempSiblingPath(targetPath);
    try {
      try {
        await assertPathSafeAsync(fromPath);
        await copyFile(sourcePath, fromPath, constants.COPYFILE_EXCL);
        let { size } = await lstat(fromPath);
        if (size !== sourceStats.size)
          throw new IncompleteBackupCopyError("FileHistory: backup copy is incomplete");
      } catch (error_2) {
        logForDebugging(
          `FileHistory: copying backup ${backupName} failed: ${errorMessage(error_2)}; backup not migrated, a rewind to this checkpoint will report it missing`,
          {
            level: "error",
          },
        );
        return {
          outcome: "failed",
          stage: "copy",
          linkError: error,
          error: error_2,
        };
      }
      try {
        await renameWithRetry(fromPath, targetPath);
      } catch (error_2) {
        let errnoCode = getErrnoCode(error_2);
        if (errnoCode === "EEXIST")
          return {
            outcome: "already_present",
          };
        logForDebugging(
          `FileHistory: could not move the copied backup ${backupName} into place \u2014 ${errnoCode !== undefined && TRANSIENT_FS_ERRORS_2.has(errnoCode) ? `rename still refused (${errnoCode}) after its retries (usually a scanner or sync tool still holding the just-written copy, or a mount that allows creating files but not renaming them)` : `rename failed: ${errorMessage(error_2)}`}; backup not migrated, a rewind to this checkpoint will report it missing`,
          {
            level: "error",
          },
        );
        return {
          outcome: "failed",
          stage: "rename",
          linkError: error,
          error: error_2,
        };
      }
    } finally {
      await retryTransient(() => unlink(fromPath)).catch(() => {});
    }
  }
  logForDebugging(
    `FileHistory: Copied backup ${backupName} from session ${previousSessionId} to ${newSessionId}`,
  );
  return {
    outcome: "migrated",
  };
}
//@ chunk-e6aww6q8.js:1394533-1395790 layout
function summarizeBackupMigrationFailures(failures, totalBackups) {
  let flattened = failures.flatMap((failure) =>
    failure.stage === "copy" || failure.stage === "rename" ? [failure] : [],
  );
  let filtered = flattened.filter(({ stage }) => stage === "copy");
  let filtered_2 = flattened.filter(({ stage }) => stage === "rename");
  let filtered_3 = failures.filter(
    ({ stage, error }) =>
      stage === "escaped" ||
      (stage !== "refused" &&
        !isSadFsErrno(error) &&
        !isEnvFsErrno(error) &&
        !TRANSIENT_FS_ERRORS_2.has(getErrnoCode(error) ?? "")),
  );
  let refusedCount = count(failures, ({ stage }) => stage === "refused");
  let parts = [
    ...(refusedCount > 0 ? [concatSafe(lit_2("refused as unsafe: "), fromNumber(refusedCount))] : []),
    ...formatGroupedCounts(
      lit_2("source backup unreadable: "),
      failures.filter(({ stage }) => stage === "source").map(({ error }) => classifyErrnoForTelemetry(error)),
    ),
    ...formatGroupedCounts(
      lit_2("hard link failed: "),
      failures.filter(({ stage }) => stage === "link").map(({ error }) => classifyErrnoForTelemetry(error)),
    ),
    ...formatGroupedCounts(
      lit_2("copy fallback (link errno->copy errno): "),
      filtered.map(({ linkError, error }) =>
        concatSafe(classifyErrnoForTelemetry(linkError), lit_2("->"), classifyErrnoForTelemetry(error)),
      ),
    ),
    ...formatGroupedCounts(
      lit_2("copied but not renamed into place (link errno->rename errno): "),
      filtered_2.map(({ linkError, error }) =>
        concatSafe(classifyErrnoForTelemetry(linkError), lit_2("->"), classifyErrnoForTelemetry(error)),
      ),
    ),
    ...formatGroupedCounts(
      lit_2("threw outside the fs calls: "),
      failures
        .filter(({ stage }) => stage === "escaped")
        .map(({ error }) => classifyErrnoForTelemetry(error)),
    ),
  ];
  return {
    message: concatSafe(
      lit_2("FileHistory: backup migration on resume left "),
      fromNumber(failures.length),
      lit_2(" of "),
      fromNumber(totalBackups),
      lit_2(" backups unmigrated; "),
      joinSafe(parts, "; "),
    ),
    hasUnexpectedFailure: filtered_3.length > 0,
    unexpectedErrnoCode: mostCommon(
      filtered_3.flatMap(({ error }) => {
        let errno = sanitizeErrnoForTelemetry(error);
        return errno === undefined ? [] : [errno];
      }),
    ),
    linkErrno: mostCommon(flattened.map(({ linkError }) => sanitizedErrnoLowerForTelemetry(linkError))),
    copyErrno: mostCommon(filtered.map(({ error }) => sanitizedErrnoLowerForTelemetry(error))),
    renameErrno: mostCommon(filtered_2.map(({ error }) => sanitizedErrnoLowerForTelemetry(error))),
  };
}
//@ chunk-e6aww6q8.js:1395790-1395891 layout
function classifyErrnoForTelemetry(error) {
  return getErrnoCode(error)?.startsWith("Unknown system error")
    ? lit_2("UNKNOWN")
    : (sanitizedErrCodeForTelemetry(error) ?? lit_2("unclassified"));
}
//@ chunk-e6aww6q8.js:1395891-1395995 layout
function formatGroupedCounts(values, items) {
  return items.length === 0
    ? []
    : [
        concatSafe(
          values,
          joinSafe(
            countOccurrencesSorted(items).map(([value, count]) =>
              count > 1 ? concatSafe(value, lit_2(" x"), fromNumber(count)) : value,
            ),
            ", ",
          ),
        ),
      ];
}
//@ chunk-e6aww6q8.js:1395995-1396033 layout
function mostCommon(items) {
  return countOccurrencesSorted(items)[0]?.[0];
}
//@ chunk-e6aww6q8.js:1396033-1396146 layout
function countOccurrencesSorted(items) {
  return [...Map.groupBy(items, (item) => item)]
    .map(([value, group]) => [value, group.length])
    .sort(([valueA, countA], [valueB, countB]) => countB - countA || (valueA < valueB ? -1 : 1));
}
//@ chunk-e6aww6q8.js:1396146-1398175 facade-exports (2.1.88 match: copyFileHistoryForResume, 0.453)
/**
 * resume 时把旧会话的备份迁移到新会话目录（硬链接，失败则复制再 rename，并发 16），汇总失败原因记日志。
 */
async function copyFileHistoryForResume(log, newSessionId, storageV5) {
  if (!fileHistoryEnabled()) return;
  let fileHistorySnapshots = log.fileHistorySnapshots;
  if (!fileHistorySnapshots || log.messages.length === 0) return;
  let previousSessionId = log.messages.at(-1)?.sessionId;
  if (!previousSessionId) {
    logError(Error("FileHistory: Failed to copy backups on restore (no previous session id)"));
    return;
  }
  let targetSessionId = newSessionId ?? getSessionId();
  if (previousSessionId === targetSessionId) {
    logForDebugging(
      `FileHistory: No need to copy file history for resuming with same session id: ${targetSessionId}`,
    );
    return;
  }
  if (!isSafeIdSegment_2(targetSessionId)) {
    logForDebugging("FileHistory: refusing to copy backups on restore (invalid target session id)", {
      level: "warn",
    });
    return;
  }
  try {
    let newBackupDir = join(getClaudeConfigDir(), "file-history", targetSessionId);
    await mkdir(newBackupDir, {
      recursive: true,
    });
    let mapped = fileHistorySnapshots
      .filter(
        (fileHistorySnapshot) =>
          typeof fileHistorySnapshot === "object" &&
          fileHistorySnapshot !== null &&
          typeof fileHistorySnapshot.trackedFileBackups === "object" &&
          fileHistorySnapshot.trackedFileBackups !== null &&
          Object.values(fileHistorySnapshot.trackedFileBackups).every(
            (trackedFileBackup) => typeof trackedFileBackup === "object" && trackedFileBackup !== null,
          ),
      )
      .map((fileHistorySnapshot) => ({
        snapshot: fileHistorySnapshot,
        backupFileNames: Object.values(fileHistorySnapshot.trackedFileBackups)
          .map((trackedFileBackup) => trackedFileBackup.backupFileName)
          .filter((entry) => entry !== null),
      }));
    let backupFileNames = uniq(mapped.flatMap(({ backupFileNames }) => backupFileNames));
    let byName = new Map(
      await pMap(
        backupFileNames,
        async (result) => [
          result,
          await migrateBackupForResume(result, previousSessionId, newBackupDir, targetSessionId).catch(
            (snapshot) => {
              logForDebugging(
                `FileHistory: unexpected error while migrating backup ${result}: ${errorMessage(snapshot)}; backup not migrated`,
                {
                  level: "error",
                },
              );
              return {
                outcome: "failed",
                stage: "escaped",
                error: snapshot,
              };
            },
          ),
        ],
        {
          concurrency: BACKUP_MIGRATION_CONCURRENCY,
        },
      ),
    );
    let backupEntries = mapped.filter(({ backupFileNames }) =>
      backupFileNames.every((backup) => {
        let outcome = byName.get(backup)?.outcome;
        return outcome === "migrated" || outcome === "already_present";
      }),
    );
    backupEntries.forEach(({ snapshot }) => {
      recordFileHistorySnapshot(snapshot.messageId, snapshot, false, storageV5).catch((error) => {
        logError(Error("FileHistory: Failed to record copy backup snapshot"));
      });
    });
    let skippedCount = mapped.length - backupEntries.length;
    if (skippedCount > 0) {
      let failures = [...byName.values()].filter((failed) => failed.outcome === "failed");
      let summary = summarizeBackupMigrationFailures(failures, backupFileNames.length);
      if (summary.hasUnexpectedFailure)
        logError(
          withTelemetryFacts(Error(summary.message), {
            telemetryMessage: summary.message,
            code: summary.unexpectedErrnoCode,
          }),
        );
      else
        logForDebugging(`${summary.message}; session ${targetSessionId}`, {
          level: "error",
        });
      logEvent("tengu_file_history_resume_copy_failed", {
        numSnapshots: fileHistorySnapshots.length,
        failedSnapshots: skippedCount,
        numBackups: backupFileNames.length,
        failedBackups: failures.length,
        linkErrno: summary.linkErrno,
        copyErrno: summary.copyErrno,
        renameErrno: summary.renameErrno,
      });
    }
  } catch (error) {
    if (isSadFsErrno(error) || isEnvFsErrno(error)) {
      logForDebugging(`FileHistory: backup-dir mkdir failed for session ${targetSessionId}: ${error}`, {
        level: "error",
      });
      return;
    }
    logError(error);
  }
}
//@ chunk-e6aww6q8.js:1398175-1398816 fingerprint (2.1.88 match: notifyVscodeSnapshotFilesUpdated, 0.586)
/**
 * 快照文件集合变化时通知 VS Code 扩展。
 */
async function notifyVscodeSnapshotFilesUpdated(oldState, newState) {
  let oldSnapshot = oldState.snapshots.at(-1);
  let newSnapshot = newState.snapshots.at(-1);
  if (!newSnapshot) return;
  for (let trackingPath of newState.trackedFiles)
    try {
      let filePath = expandTrackingPath(trackingPath);
      let oldBackup = oldSnapshot ? getOwn(oldSnapshot.trackedFileBackups, trackingPath) : undefined;
      let newBackup = getOwn(newSnapshot.trackedFileBackups, trackingPath);
      if (
        oldBackup?.backupFileName === newBackup?.backupFileName &&
        oldBackup?.version === newBackup?.version
      )
        continue;
      let oldContent = null;
      if (oldBackup?.backupFileName) {
        let backupPath = resolveBackupPath_2(oldBackup.backupFileName);
        oldContent = await readFileTextNoFollow(backupPath, {
          noFollow: true,
        });
      }
      let newContent = null;
      if (newBackup?.backupFileName) {
        let backupPath = resolveBackupPath_2(newBackup.backupFileName);
        newContent = await readFileTextNoFollow(backupPath, {
          noFollow: true,
        });
      }
      if (oldContent !== newContent) lintMemoryWrite(filePath, oldContent, newContent);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("FileHistory: invalid"))
        logForDebugging(`FileHistory: skipping snapshot notification for ${trackingPath}: ${error.message}`, {
          level: "error",
        });
      else logError(error);
    }
}
//@ chunk-e6aww6q8.js:1398816-1398873 layout
async function readFileTextNoFollow(filePath, options) {
  return (await checkOriginFileChanged(filePath, options)).text ?? null;
}
//@ chunk-e6aww6q8.js:1398873-1399423 callgraph-fingerprint (2.1.88 match: checkOriginFileChanged, 0.222)
/**
 * 以 O_NONBLOCK（可选 O_NOFOLLOW）打开并读取文件文本与 stats，可限制最大字节；用于比较备份与当前文件。
 */
async function checkOriginFileChanged(filePath, options) {
  try {
    let originalStats = constants.O_NONBLOCK ?? 0;
    let extraFlags = options?.noFollow ? (constants.O_NOFOLLOW ?? 0) : 0;
    let handle = await open(filePath, constants.O_RDONLY | originalStats | extraFlags);
    try {
      let stats = await handle.stat();
      if (!stats.isFile() || (options?.maxBytes !== undefined && stats.size > options.maxBytes))
        return {
          stats,
        };
      if (options?.maxBytes === undefined)
        return {
          stats,
          text: await handle.readFile({
            encoding: "utf-8",
          }),
        };
      let buffer = Buffer.allocUnsafe(stats.size + 1);
      let totalRead = 0;
      while (totalRead < buffer.length) {
        let { bytesRead } = await handle.read(buffer, totalRead, buffer.length - totalRead, totalRead);
        if (bytesRead === 0) break;
        totalRead += bytesRead;
      }
      return totalRead > stats.size
        ? {
            stats,
          }
        : {
            stats,
            text: buffer.toString("utf-8", 0, totalRead),
          };
    } finally {
      await handle.close();
    }
  } catch (error) {
    return {
      stats: isPathAbsent(error) ? null : undefined,
    };
  }
}
//@ chunk-e6aww6q8.js:1399423-1399434 layout
var DEBUG_STATE_DUMP = false;
//@ chunk-e6aww6q8.js:1399434-1399484 file-local
function maybeDumpStateForDebug(state) {
  if (DEBUG_STATE_DUMP) console.error(inspect(state, false, 5));
}
//@ chunk-23fm9f0d.js:22892-22931 fingerprint (2.1.88 match: resolveBackupPath, 1)
/**
 * 取会话的 file-history 目录（误配名 resolveBackupPath）。
 */
function resolveBackupPath() {
  return cleanupOldFilesInDirectory("file-history");
}
export {
  fileHistoryRestoreStateFromLog,
  copyFileHistoryForResume,
  TURN_DIFF_COUNTING_MS,
  fileHistoryEnabled,
  fileHistoryGetDiffStats,
  RewindNoFilesRestoredError,
  fileHistoryCanRestore,
  fileHistoryGetTurnDiffStats,
  fileHistoryRewind,
  reduceFileHistoryState,
  fileHistoryMakeSnapshot,
  resolveBackupPath,
  fileHistoryTrackEdit,
};
