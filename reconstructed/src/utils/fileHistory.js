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
import {
  unlink,
  unlink as unlink_2,
  unlink as unlink_3,
  unlink as unlink_4,
  unlink as unlink_5,
  unlink as unlink_6,
  unlink as unlink_7,
  unlink as unlink_8,
  unlink as unlink_9,
  unlink as unlink_10,
  unlink as unlink_11,
  unlink as unlink_12,
  unlink as unlink_13,
  stat,
  stat as stat_2,
  stat as stat_3,
  stat as stat_4,
  stat as stat_5,
  stat as stat_6,
  stat as stat_7,
  stat as stat_8,
  stat as stat_9,
  stat as stat_10,
  stat as stat_11,
  stat as stat_12,
  stat as stat_13,
  stat as stat_14,
  stat as stat_15,
  stat as stat_16,
  stat as stat_17,
  stat as stat_18,
  stat as stat_19,
  stat as stat_20,
  stat as stat_21,
  stat as stat_22,
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  lstat as lstat_5,
  lstat as lstat_6,
  lstat as lstat_7,
  lstat as lstat_8,
  lstat as lstat_9,
  lstat as lstat_10,
  lstat as lstat_11,
  lstat as lstat_12,
  lstat as lstat_13,
  lstat as lstat_14,
  lstat as lstat_15,
  lstat as lstat_16,
  lstat as lstat_17,
  lstat as lstat_18,
  lstat as lstat_19,
  lstat as lstat_20,
  lstat as lstat_21,
  lstat as lstat_22,
  lstat as lstat_23,
  lstat as lstat_24,
  lstat as lstat_25,
  lstat as lstat_26,
  lstat as lstat_27,
  lstat as lstat_28,
  lstat as lstat_29,
  lstat as lstat_30,
  lstat as lstat_31,
  lstat as lstat_32,
  lstat as lstat_33,
  lstat as lstat_34,
  lstat as lstat_35,
  lstat as lstat_36,
  lstat as lstat_37,
  lstat as lstat_38,
  lstat as lstat_39,
  lstat as lstat_40,
  lstat as lstat_41,
  lstat as lstat_42,
  lstat as lstat_43,
  copyFile,
  copyFile as copyFile_2,
  copyFile as copyFile_3,
  copyFile as copyFile_4,
  copyFile as copyFile_5,
  mkdir,
  mkdir as mkdir_2,
  mkdir as mkdir_3,
  mkdir as mkdir_4,
  mkdir as mkdir_5,
  mkdir as mkdir_6,
  mkdir as mkdir_7,
  mkdir as mkdir_8,
  mkdir as mkdir_9,
  mkdir as mkdir_10,
  mkdir as mkdir_11,
  mkdir as mkdir_12,
  mkdir as mkdir_13,
  mkdir as mkdir_14,
  mkdir as mkdir_15,
  mkdir as mkdir_16,
  mkdir as mkdir_17,
  mkdir as mkdir_18,
  mkdir as mkdir_19,
  mkdir as mkdir_20,
  mkdir as mkdir_21,
  mkdir as mkdir_22,
  mkdir as mkdir_23,
  mkdir as mkdir_24,
  mkdir as mkdir_25,
  mkdir as mkdir_26,
  chmod,
  chmod as chmod_2,
  chmod as chmod_3,
  chmod as chmod_4,
  chmod as chmod_5,
  realpath,
  realpath as realpath_2,
  realpath as realpath_3,
  realpath as realpath_4,
  realpath as realpath_5,
  realpath as realpath_6,
  realpath as realpath_7,
  realpath as realpath_8,
  realpath as realpath_9,
  realpath as realpath_10,
  realpath as realpath_11,
  realpath as realpath_12,
  realpath as realpath_13,
  realpath as realpath_14,
  realpath as realpath_15,
  realpath as realpath_16,
  realpath as realpath_17,
  realpath as realpath_18,
  realpath as realpath_19,
  realpath as realpath_20,
  realpath as realpath_21,
  realpath as realpath_22,
  realpath as realpath_23,
  realpath as realpath_24,
  realpath as realpath_25,
  realpath as realpath_26,
  realpath as realpath_27,
  realpath as realpath_28,
  realpath as realpath_29,
  realpath as realpath_30,
  realpath as realpath_31,
  realpath as realpath_32,
  realpath as realpath_33,
  realpath as realpath_34,
  realpath as realpath_35,
  realpath as realpath_36,
  realpath as realpath_37,
  realpath as realpath_38,
  open,
  open as open_2,
  open as open_3,
  open as open_4,
  open as open_5,
  open as open_6,
  open as open_7,
  open as open_8,
  open as open_9,
  open as open_10,
  open as open_11,
  open as open_12,
  open as open_13,
  open as open_14,
  open as open_15,
  open as open_16,
  open as open_17,
  open as open_18,
  open as open_19,
  open as open_20,
  open as open_21,
  open as open_22,
  open as open_23,
  open as open_24,
  open as open_25,
  open as open_26,
  open as open_27,
  readlink,
  readlink as readlink_2,
  readlink as readlink_3,
  readlink as readlink_4,
  readlink as readlink_5,
  readlink as readlink_6,
  readlink as readlink_7,
  readlink as readlink_8,
  readlink as readlink_9,
  readlink as readlink_10,
  readlink as readlink_11,
  readlink as readlink_12,
  link,
  link as link_2,
  link as link_3,
} from "fs/promises";
import {
  createHash,
  createHash as createHash_2,
  createHash as createHash_3,
  createHash as createHash_4,
  createHash as createHash_5,
  createHash as createHash_6,
  createHash as createHash_7,
  createHash as createHash_8,
  createHash as createHash_9,
  createHash as createHash_10,
  createHash as createHash_11,
  createHash as createHash_12,
  createHash as createHash_13,
  createHash as createHash_14,
  createHash as createHash_15,
  createHash as createHash_16,
  createHash as createHash_17,
  createHash as createHash_18,
  createHash as createHash_19,
  createHash as createHash_20,
  createHash as createHash_21,
  createHash as createHash_22,
  createHash as createHash_23,
  createHash as createHash_24,
} from "crypto";
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
  relative,
  relative as relative_2,
  relative as relative_3,
  relative as relative_4,
  relative as relative_5,
  relative as relative_6,
  relative as relative_7,
  relative as relative_8,
  relative as relative_9,
  relative as relative_10,
  relative as relative_11,
  relative as relative_12,
  relative as relative_13,
  relative as relative_14,
  relative as relative_15,
  relative as relative_16,
  relative as relative_17,
  relative as relative_18,
  relative as relative_19,
  relative as relative_20,
  relative as relative_21,
  relative as relative_22,
  relative as relative_23,
  relative as relative_24,
  relative as relative_25,
  relative as relative_26,
  relative as relative_27,
  relative as relative_28,
  relative as relative_29,
  relative as relative_30,
  relative as relative_31,
  relative as relative_32,
  relative as relative_33,
  relative as relative_34,
  relative as relative_35,
  relative as relative_36,
  relative as relative_37,
  relative as relative_38,
  relative as relative_39,
  relative as relative_40,
  relative as relative_41,
  relative as relative_42,
  relative as relative_43,
  relative as relative_44,
  relative as relative_45,
  relative as relative_46,
  relative as relative_47,
  relative as relative_48,
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
  constants,
  constants as constants_3,
  constants as constants_4,
  constants as constants_5,
  constants as constants_6,
  constants as constants_7,
  constants as constants_9,
  constants as constants_10,
  constants as constants_12,
  constants as constants_13,
  constants as constants_14,
  constants as constants_15,
  constants as constants_16,
  constants as constants_17,
  constants as constants_18,
  constants as constants_19,
  constants as constants_20,
  constants as constants_21,
  constants as constants_22,
  constants as constants_23,
  constants as constants_24,
  constants as constants_25,
  constants as constants_26,
  constants as constants_27,
} from "fs";
import { inspect } from "util";
import { getOwn, defineOwnProperty } from "./objectSafety.js";
import { recordFileHistoryDelta, recordFileHistorySnapshot } from "./sessionStorage.js";
import { logError } from "./log.js";
import { logEvent } from "../services/analytics/index.js";
import { logForDebugging } from "./debug.js";
import { WDn } from "../types/logs.js";
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
import { wt } from "../remote/remoteMode.js";
import { resolveSetting } from "./settings/userIntentSettings.js";
import { env } from "./env.js";
import { BACKUP_FILE_NAME_PATTERN_WITH_LEGACY } from "./sessionStoragePortable.js";
import { plural } from "./stringUtils.js";
import { pathExists } from "./fsSafety/atomicWriteStaging.js";
import { ai, n_ } from "./networkPaths.js";
import { yieldToEventLoop } from "../native-ts/file-index/index.js";
import { Y5e } from "../../vendor/diff/libesm/diff/line.js";
import { resetPlanFileCacheToUnknown } from "./plans.js";
import { isSafeIdSegment } from "./agentId.js";
import { getClaudeConfigDir } from "./envUtils.js";
import { STORAGE_SPACES } from "./storage/storageSpaces.js";
import { readFlagWithOverride } from "../services/analytics/flagOverrides.js";
import { getPlatform } from "./platform.js";
import { tz, READ_LIMITS } from "./fsBoundRead.js";
import { retryFsOp, makeTempSiblingPath, assertPathSafeAsync, retryTransient } from "./atomicPublishWrite.js";
import { TRANSIENT_FS_ERRORS as TRANSIENT_FS_ERRORS_2 } from "./plugins/safeCopy.js";
import { sleep } from "./sleep.js";
import { count, uniq } from "./collections.js";
import { concatSafe, lit as lit_2, fromNumber, joinSafe } from "../services/analytics/safeMetadata.js";
import { pMap } from "../../vendor/p-map/index.js";
import { wSt } from "../memdir/memoryWriteLint.js";
import { cleanupOldFilesInDirectory } from "./cleanup.js";

/**
 * fileHistory 状态归约：track（把首个备份记入最近快照并记 delta）、snapshot（追加快照，超过上限淘汰旧快照并删除不再引用的备份、记录到会话日志、通知 VS Code）、touch（只增序号）。
 */
//@ chunk-e6aww6q8.js:1372980-1374895 facade-exports = fileHistoryMakeSnapshot (0.556)
function reduceFileHistoryState(e, n, r) {
  switch (n.kind) {
    case "track":
      try {
        let mostRecentSnapshot = e.snapshots.at(-1);
        if (!mostRecentSnapshot) return e;
        let h = (e.trackSequence ?? 0) + 1;
        if (getOwn(mostRecentSnapshot.trackedFileBackups, n.trackingPath)) return { ...e, trackSequence: h };
        let y = e.trackedFiles.has(n.trackingPath)
            ? e.trackedFiles
            : new Set(e.trackedFiles).add(n.trackingPath),
          S = {
            ...mostRecentSnapshot,
            trackedFileBackups: { ...mostRecentSnapshot.trackedFileBackups, [n.trackingPath]: n.backup },
          },
          w = {
            ...e,
            snapshots: (() => {
              let sliced = e.snapshots.slice();
              return ((sliced[sliced.length - 1] = S), sliced);
            })(),
            trackedFiles: y,
            trackSequence: h,
          };
        return (
          maybeDumpStateForDebug(w),
          recordFileHistoryDelta(
            n.messageId,
            mostRecentSnapshot.messageId,
            n.trackingPath,
            n.backup,
            r,
          ).catch((trackingPath) => {
            logError(Error(`FileHistory: Failed to record delta: ${trackingPath}`));
          }),
          logEvent("tengu_file_history_track_edit_success", {
            isNewFile: n.isAddingFile,
            version: n.backup.version,
          }),
          logForDebugging(`FileHistory: Tracked file modification for ${n.filePath}`),
          w
        );
      } catch (error) {
        return (logError(error), logEvent("tengu_file_history_track_edit_failed", {}), e);
      }
    case "snapshot":
      try {
        let s = { ...n.trackedFileBackups },
          lastSnapshot = e.snapshots.at(-1);
        if (lastSnapshot)
          for (let trackingPath of e.trackedFiles) {
            if (Object.hasOwn(s, trackingPath)) continue;
            let Se = getOwn(lastSnapshot.trackedFileBackups, trackingPath);
            if (Se) defineOwnProperty(s, trackingPath, Se);
          }
        let now = new Date(),
          S = {
            messageId: n.messageId,
            trackedFileBackups: s,
            timestamp: now,
            ...(n.preCheckpoint && { preCheckpoint: !0 }),
          },
          allSnapshots = [
            ...(n.preCheckpoint
              ? e.snapshots.map((snapshot) => {
                  if (snapshot.messageId !== n.messageId || !snapshot.preCheckpoint) return snapshot;
                  let { preCheckpoint: preCheckpoint, ...ke } = snapshot;
                  return ke;
                })
              : e.snapshots),
            S,
          ],
          G = allSnapshots;
        if (allSnapshots.length > WDn)
          ((G = allSnapshots.slice(-WDn)),
            deleteEvictedBackups(allSnapshots.slice(0, allSnapshots.length - WDn), G, r).catch(logError));
        let updatedState = { ...e, snapshots: G, snapshotSequence: (e.snapshotSequence ?? 0) + 1 };
        return (
          maybeDumpStateForDebug(updatedState),
          notifyVscodeSnapshotFilesUpdated(e, updatedState).catch(logError),
          recordFileHistorySnapshot(n.messageId, S, !1, r).catch((error) => {
            logError(Error(`FileHistory: Failed to record snapshot: ${error}`));
          }),
          logForDebugging(
            `FileHistory: Added snapshot for ${n.messageId}, tracking ${e.trackedFiles.size} files`,
          ),
          logEvent("tengu_file_history_snapshot_success", {
            trackedFilesCount: e.trackedFiles.size,
            snapshotCount: updatedState.snapshots.length,
          }),
          updatedState
        );
      } catch (error) {
        return (logError(error), logEvent("tengu_file_history_snapshot_failed", {}), e);
      }
    case "touch":
      return { ...e, trackSequence: (e.trackSequence ?? 0) + 1 };
  }
}
/**
 * 删除被淘汰快照中不再被保留快照引用的备份文件（v1 首备份不删）。
 */
//@ chunk-e6aww6q8.js:1374895-1375526 layout
async function deleteEvictedBackups(e, n, r) {
  let s = getSessionId(),
    h = new Set();
  for (let S of n)
    for (let w of Object.values(S.trackedFileBackups)) if (w.backupFileName !== null) h.add(w.backupFileName);
  let y = new Set();
  for (let S of e)
    for (let w of Object.values(S.trackedFileBackups))
      if (
        w.backupFileName !== null &&
        !h.has(w.backupFileName) &&
        w.version !== 1 &&
        BACKUP_FILE_NAME_RE.test(w.backupFileName)
      )
        y.add(w.backupFileName);
  for (let S of y)
    try {
      if (r) {
        let w = await r.delete(resolveBackupStorageKey(S, s));
        if (!w.ok)
          logForDebugging(`FileHistory: failed to delete evicted backup ${S}: ${w.error.code}`, {
            level: "error",
          });
      } else await unlink_8(resolveBackupPath_2(S, s));
    } catch (error) {
      if (!isENOENT(error))
        logForDebugging(`FileHistory: failed to delete evicted backup ${S}: ${error}`, { level: "error" });
    }
}
/**
 * 是否启用文件检查点：非云端/非 diskless；非交互会话需 CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING；交互会话看设置 fileCheckpointingEnabled（默认 true）且未设 CLAUDE_CODE_DISABLE_FILE_CHECKPOINTING。
 */
//@ chunk-e6aww6q8.js:1375526-1375684 facade-exports = fileHistoryEnabled (0.415)
function fileHistoryEnabled() {
  if (wt()) return !1;
  if (isDiskless()) return !1;
  if (getIsNonInteractiveSession()) return fileHistoryEnabledSdk();
  return resolveSetting("fileCheckpointingEnabled", !0).value && !env.CLAUDE_CODE_DISABLE_FILE_CHECKPOINTING;
}
/**
 * SDK 模式是否启用文件检查点（ENABLE_SDK_FILE_CHECKPOINTING 且未 DISABLE）。
 */
//@ chunk-e6aww6q8.js:1375684-1375793 fingerprint = fileHistoryEnabledSdk (1)
function fileHistoryEnabledSdk() {
  return env.CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING && !env.CLAUDE_CODE_DISABLE_FILE_CHECKPOINTING;
}
/**
 * 编辑前跟踪文件：未启用或已跟踪时只 touch；否则为文件创建 v1 备份（新文件 backupFileName 为 null）并派发 track 操作。Edit/Write/NotebookEdit 在写入前调用。
 */
//@ chunk-e6aww6q8.js:1375793-1376525 facade-exports = fileHistoryTrackEdit (0.43)
async function fileHistoryTrackEdit(e, n, r, s) {
  if (!fileHistoryEnabled()) {
    n({ kind: "touch" });
    return;
  }
  let trackingPath = maybeShortenFilePath(r),
    y = e();
  if (!y) {
    n({ kind: "touch" });
    return;
  }
  let mostRecent = y.snapshots.at(-1);
  if (!mostRecent) {
    (logForDebugging("FileHistory: Missing most recent snapshot", { level: "error" }),
      logEvent("tengu_file_history_track_edit_failed", {}),
      n({ kind: "touch" }));
    return;
  }
  if (getOwn(mostRecent.trackedFileBackups, trackingPath)) {
    n({ kind: "touch" });
    return;
  }
  for (let snapshot of y.snapshots)
    if (getOwn(snapshot.trackedFileBackups, trackingPath)) {
      n({ kind: "touch" });
      return;
    }
  let w;
  try {
    w = await createBackup(r, 1);
  } catch (error) {
    (logForDebugging(
      `FileHistory: failed to back up ${r}: ${error instanceof Error ? error.message : String(error)}`,
      { level: "error" },
    ),
      logEvent("tengu_file_history_track_edit_failed", {}),
      n({ kind: "touch" }));
    return;
  }
  let isAddingFile = w.backupFileName === null;
  n({
    kind: "track",
    trackingPath: trackingPath,
    filePath: r,
    backup: w,
    messageId: s,
    isAddingFile: isAddingFile,
  });
}
/**
 * 为一条消息生成快照：对每个已跟踪文件，未变则复用上个备份，删除则记 null，否则创建新版本备份；最后派发 snapshot 操作（支持 preCheckpoint）。
 */
//@ chunk-e6aww6q8.js:1376525-1377957 facade-exports
async function fileHistoryMakeSnapshot(e, n, r, s) {
  if (!fileHistoryEnabled()) return;
  let h = e();
  if (!h) return;
  if (!s?.preCheckpoint && h.snapshots.some((snapshot) => snapshot.messageId === r && snapshot.preCheckpoint))
    return;
  let y = {},
    at = h.snapshots.at(-1);
  if (at)
    (logForDebugging(`FileHistory: Making snapshot for message ${r}`),
      await Promise.all(
        Array.from(h.trackedFiles, async (w) => {
          try {
            let L = expandTrackingPath(w),
              G = getOwn(at.trackedFileBackups, w),
              q = parseBackupVersion(G?.backupFileName),
              Z = 0;
            for (let snapshot of h.snapshots) {
              let Ae = getOwn(snapshot.trackedFileBackups, w);
              if (Ae && isUsableBackupVersion(Ae.version)) Z = Math.max(Z, Ae.version);
              let Ie = parseBackupVersion(Ae?.backupFileName);
              if (Ie !== void 0) Z = Math.max(Z, Ie);
            }
            let Se = Z + 1;
            if (!isUsableBackupVersion(Se)) throw Error("FileHistory: no usable next version");
            let ke;
            try {
              ke = await stat_11(L);
            } catch (error) {
              if (!isENOENT(error)) throw error;
            }
            if (!ke) {
              (defineOwnProperty(y, w, {
                backupFileName: null,
                version: Se,
                backupTime: new Date(),
                realParentDir: await isENOENT_2(L),
              }),
                logEvent("tengu_file_history_backup_deleted_file", { version: Se }),
                logForDebugging(`FileHistory: Missing tracked file: ${w}`));
              return;
            }
            let we = q !== void 0 ? q : G && isUsableBackupVersion(G.version) ? G.version : void 0;
            if (
              G &&
              typeof G.backupFileName === "string" &&
              BACKUP_FILE_NAME_PATTERN_WITH_LEGACY.test(G.backupFileName) &&
              we !== void 0 &&
              !(await hasFileChangedSinceBackup(L, G.backupFileName, ke))
            ) {
              defineOwnProperty(
                y,
                w,
                G.realParentDir !== void 0 && we === G.version
                  ? G
                  : {
                      ...G,
                      version: we,
                      realParentDir: G.realParentDir !== void 0 ? G.realParentDir : await isENOENT_2(L),
                    },
              );
              return;
            }
            defineOwnProperty(y, w, await createBackup(L, Se));
          } catch (error) {
            (logForDebugging(`FileHistory: Failed to back up ${w}: ${error}`, { level: "error" }),
              logEvent("tengu_file_history_backup_file_failed", {}));
          }
        }),
      ));
  n({
    kind: "snapshot",
    messageId: r,
    trackedFileBackups: y,
    ...(s?.preCheckpoint && { preCheckpoint: !0 }),
  });
}
/**
 * rewind 时所有有差异的文件都恢复失败抛出的错误类型。
 */
//@ chunk-e6aww6q8.js:1377957-1377978 facade-exports
class RewindNoFilesRestoredError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {}
/**
 * 回退到某消息的快照：applySnapshot 恢复所有已跟踪文件；全部失败时抛 NoFilesRestoredError；返回跳过的链接数。
 */
//@ chunk-e6aww6q8.js:1377978-1379208 facade-exports = fileHistoryRewind (0.674)
async function fileHistoryRewind(updateFileHistoryState, messageId) {
  if (!fileHistoryEnabled()) return;
  let r = updateFileHistoryState();
  if (!r) return;
  let targetSnapshot = r.snapshots.findLast((snapshot) => snapshot.messageId === messageId);
  if (!targetSnapshot)
    throw (
      logError(Error(`FileHistory: Snapshot for ${messageId} not found`)),
      logEvent("tengu_file_history_rewind_failed", {
        trackedFilesCount: r.trackedFiles.size,
        snapshotFound: !1,
      }),
      Error("The selected snapshot was not found")
    );
  let h, y, S;
  try {
    (logForDebugging(`FileHistory: [Rewind] Rewinding to snapshot for ${messageId}`),
      ({ filesChanged: h, filesFailed: y, skippedLinks: S } = await applySnapshot(r, targetSnapshot)));
  } catch (error) {
    throw (
      logError(error),
      logEvent("tengu_file_history_rewind_failed", {
        trackedFilesCount: r.trackedFiles.size,
        snapshotFound: !0,
      }),
      error
    );
  }
  if (y.length > 0 && h.length === 0)
    throw (
      logEvent("tengu_file_history_rewind_failed", {
        trackedFilesCount: r.trackedFiles.size,
        snapshotFound: !0,
        filesFailedCount: y.length,
        skippedLinksCount: S,
      }),
      new RewindNoFilesRestoredError(
        `No files were restored: ${y.length} ${plural(y.length, "file")} failed (backup missing, or the file could not be updated)${S > 0 ? `, and ${S} ${plural(S, "path was", "paths were")} skipped for link safety` : ""}`,
        "No files were restored: all differing files failed",
      )
    );
  return (
    logForDebugging(`FileHistory: [Rewind] Finished rewinding to ${messageId}`),
    logEvent("tengu_file_history_rewind_success", {
      trackedFilesCount: r.trackedFiles.size,
      filesChangedCount: h.length,
      filesFailedCount: y.length,
      skippedLinksCount: S,
    }),
    { skippedLinks: S }
  );
}
/**
 * 是否存在该消息的快照（可回退）。
 */
//@ chunk-e6aww6q8.js:1379208-1379290 facade-exports = fileHistoryCanRestore (1)
function fileHistoryCanRestore(state, messageId) {
  if (!fileHistoryEnabled()) return !1;
  return state.snapshots.some((snapshot) => snapshot.messageId === messageId);
}
/**
 * 计算回退到某快照会改动哪些文件及增删行数（dry run）。
 */
//@ chunk-e6aww6q8.js:1379290-1380120 facade-exports = fileHistoryGetDiffStats (1)
async function fileHistoryGetDiffStats(state, messageId) {
  if (!fileHistoryEnabled()) return;
  let targetSnapshot = state.snapshots.findLast((snapshot) => snapshot.messageId === messageId);
  if (!targetSnapshot) return;
  let results = await Promise.all(
      Array.from(state.trackedFiles, async (trackingPath) => {
        try {
          let filePath = expandTrackingPath(trackingPath),
            G = getOwn(targetSnapshot.trackedFileBackups, trackingPath),
            backupFileName = G
              ? G.backupFileName
              : getBackupFileNameFirstVersion(trackingPath, state)?.backupFileName;
          if (backupFileName === void 0)
            return (
              logForDebugging("FileHistory: Error finding the backup file to apply", { level: "error" }),
              logEvent("tengu_file_history_rewind_restore_file_failed", { dryRun: !0 }),
              null
            );
          let stats = await computeDiffStatsForFile(
            filePath,
            backupFileName === null ? void 0 : backupFileName,
          );
          if (stats?.insertions || stats?.deletions) return { filePath: filePath, stats: stats };
          if (backupFileName === null && (await pathExists(filePath)))
            return { filePath: filePath, stats: stats };
          return null;
        } catch (error) {
          return (
            logError(error),
            logEvent("tengu_file_history_rewind_restore_file_failed", { dryRun: !0 }),
            null
          );
        }
      }),
    ),
    filesChanged = [],
    y = 0,
    S = 0;
  for (let w of results) {
    if (!w) continue;
    (filesChanged.push(w.filePath), (y += w.stats?.insertions || 0), (S += w.stats?.deletions || 0));
  }
  return { filesChanged: filesChanged, insertions: y, deletions: S };
}
/**
 * fileHistory 常量：差异统计读文件上限 1MB、行 diff maxEditLength 500、消息选择器统计时限 1000ms、mtime 近期窗口 2000ms。
 */
//@ chunk-e6aww6q8.js:1380120-1380162 facade-exports
var TURN_DIFF_MAX_BYTES = 1048576,
  DIFF_MAX_EDIT_LENGTH = 500,
  TURN_DIFF_COUNTING_MS = 1000,
  Fqo = 2000;
/**
 * 统计两个快照之间（或快照到当前磁盘）每个文件的增删行，用于消息选择器显示每轮改动。
 */
//@ chunk-e6aww6q8.js:1380162-1381968 facade-exports = fileHistoryHasAnyChanges (0.345)
async function fileHistoryGetTurnDiffStats(e, n, r, s) {
  if (!fileHistoryEnabled()) return;
  let targetSnapshot = e.snapshots.findLast((snapshot) => snapshot.messageId === n);
  if (!targetSnapshot) return;
  let y = r === void 0 ? void 0 : e.snapshots.findLast((Z) => Z.messageId === r),
    S = [];
  for (let trackingPath of e.trackedFiles)
    try {
      let Se = getOwn(targetSnapshot.trackedFileBackups, trackingPath),
        ke = y && getOwn(y.trackedFileBackups, trackingPath);
      if (y && !Se && !ke) continue;
      let we = Se ?? getBackupFileNameFirstVersion(trackingPath, e),
        Ee = we?.backupFileName,
        Ae = y ? (ke ?? getBackupFileNameFirstVersion(trackingPath, e))?.backupFileName : void 0;
      if (Ee === void 0 || (y && (Ae === void 0 || Ae === Ee))) continue;
      S.push({
        trackingPath: trackingPath,
        before: Ee,
        beforeTakenAt: new Date(we?.backupTime ?? Number.NaN).getTime(),
        beforeRealParentDir: we?.realParentDir,
        after: Ae,
      });
    } catch (error) {
      logForDebugging(`FileHistory: skipping turn diff stats for ${trackingPath}: ${errorMessage(error)}`, {
        level: "error",
      });
    }
  let w = [],
    L = 0,
    G = 0,
    q = !0;
  for (let {
    trackingPath: trackingPath,
    before: before,
    beforeTakenAt: beforeTakenAt,
    beforeRealParentDir: beforeRealParentDir,
    after: after,
  } of S) {
    if (s.signal.aborted) return;
    try {
      let filePath = expandTrackingPath(trackingPath),
        Ie = performance.now() >= s.countUntil,
        Me;
      if (
        after === void 0 &&
        ([trackingPath, filePath].some((ze) => ai(ze) || n_(ze)) ||
          (await checkRestoreDestination(filePath, beforeRealParentDir).then(
            (ze) => ze.verdict === "refused",
            () => !0,
          )))
      )
        Me = null;
      else if (after === void 0) {
        let ze = Ie ? -1 : TURN_DIFF_MAX_BYTES,
          [lt, Je] = await Promise.all([
            readBackupForDiff(before, ze),
            checkOriginFileChanged(filePath, { noFollow: !0, maxBytes: ze }),
          ]);
        if (hasTextOrAbsent(lt) && hasTextOrAbsent(Je)) Me = countLineChanges(lt.text, Je.text);
        else if (lt.stats === void 0 || Je.stats === void 0) Me = null;
        else {
          let nt = lt.stats?.mtimeMs ?? 0,
            pt = Je.stats?.mtimeMs !== nt || beforeTakenAt - nt <= Fqo;
          if (compareStatsAndContent(Je.stats, lt.stats, () => pt)) Me = null;
        }
      } else {
        let ze = `${before}:${after}`;
        if (((Me = s.pairCounts.get(ze)), !Me && Ie)) Me = null;
        else if (!Me) {
          let [lt, Je] = await Promise.all([
            readBackupForDiff(before, TURN_DIFF_MAX_BYTES),
            readBackupForDiff(after, TURN_DIFF_MAX_BYTES),
          ]);
          if (
            ((Me = hasTextOrAbsent(lt) && hasTextOrAbsent(Je) ? countLineChanges(lt.text, Je.text) : null),
            Me)
          )
            s.pairCounts.set(ze, Me);
        }
      }
      if (Me === void 0) continue;
      if ((w.push(filePath), Me === null)) {
        q = !1;
        continue;
      }
      ((L += Me.insertions), (G += Me.deletions), await yieldToEventLoop());
    } catch (error) {
      logForDebugging(`FileHistory: skipping turn diff stats for ${trackingPath}: ${errorMessage(error)}`, {
        level: "error",
      });
    }
  }
  return q
    ? { filesChanged: w, insertions: L, deletions: G }
    : { filesChanged: w, insertions: 0, deletions: 0 };
}
//@ chunk-e6aww6q8.js:1381968-1382110 layout
async function readBackupForDiff(e, n) {
  if (e === null) return { stats: null };
  let r = await checkOriginFileChanged(resolveBackupPath_2(e), { noFollow: !0, maxBytes: n });
  return r.stats === null ? { stats: void 0 } : r;
}
//@ chunk-e6aww6q8.js:1382110-1382165 layout
function hasTextOrAbsent(e) {
  return e.text !== void 0 || e.stats === null;
}
//@ chunk-e6aww6q8.js:1382165-1382637 layout
function countLineChanges(e, n) {
  if (e === n) return;
  let r = e ?? "",
    s = n ?? "";
  if (r === "" || s === "")
    return {
      insertions: splitLinesDroppingTrailing(s).length,
      deletions: splitLinesDroppingTrailing(r).length,
    };
  let h = Y5e(r, s, { maxEditLength: DIFF_MAX_EDIT_LENGTH });
  if (h) {
    let G = 0,
      q = 0;
    for (let Z of h)
      if (Z.added) G += Z.count;
      else if (Z.removed) q += Z.count;
    return { insertions: G, deletions: q };
  }
  let y = splitLinesDroppingTrailing(r),
    S = splitLinesDroppingTrailing(s),
    w = new Map();
  for (let G of y) w.set(G, (w.get(G) ?? 0) + 1);
  let L = 0;
  for (let G of S) {
    let q = w.get(G);
    if (q) w.set(G, q - 1);
    else L++;
  }
  return { insertions: L, deletions: y.length - (S.length - L) };
}
//@ chunk-e6aww6q8.js:1382637-1382706 layout
function splitLinesDroppingTrailing(e) {
  let parts = e.split(`
`);
  if (parts.at(-1) === "") parts.pop();
  return parts;
}
/**
 * 把所有已跟踪文件恢复到目标快照的版本：备份为 null 则删除文件，否则校验目标安全后从备份恢复；返回改动/失败列表与跳过的链接数。
 */
//@ chunk-e6aww6q8.js:1382706-1384588 fingerprint = applySnapshot (0.515)
async function applySnapshot(state, targetSnapshot) {
  let r = [],
    s = [],
    h = 0;
  for (let trackingPath of state.trackedFiles) {
    let filePath = expandTrackingPath(trackingPath);
    try {
      let w =
          getOwn(targetSnapshot.trackedFileBackups, trackingPath) ??
          getBackupFileNameFirstVersion(trackingPath, state),
        L = w?.backupFileName;
      if (L === void 0) {
        (logForDebugging("FileHistory: Error finding the backup file to apply", { level: "error" }),
          logEvent("tengu_file_history_rewind_restore_file_failed", { dryRun: !1 }));
        continue;
      }
      let G = await checkRestoreDestination(filePath, w?.realParentDir);
      if (G.verdict === "refused") {
        (h++,
          logEvent("tengu_file_history_rewind_restore_file_failed", { dryRun: !1 }),
          logForDebugging(`FileHistory: [Rewind] Refusing to touch ${filePath}: ${G.detail}`, {
            level: "error",
          }));
        continue;
      }
      if (L === null) {
        try {
          let q = await checkRestoreParentDir(filePath, w?.realParentDir);
          switch (q.verdict) {
            case "refused":
              (h++,
                logEvent("tengu_file_history_rewind_restore_file_failed", { dryRun: !1 }),
                logForDebugging(`FileHistory: [Rewind] Refusing to delete ${filePath}: ${q.detail}`, {
                  level: "error",
                }));
              continue;
            case "absent":
              continue;
            case "unbound":
              await unlink_8(filePath);
              break;
            case "deleted":
              break;
          }
          (logForDebugging(`FileHistory: [Rewind] Deleted ${filePath}`), r.push(filePath));
        } catch (error) {
          let Z = getErrnoCode(error);
          if (Z === "ENOTDIR" || Z === "ELOOP" || Z === "EISDIR") {
            (h++,
              logEvent("tengu_file_history_rewind_restore_file_failed", { dryRun: !1 }),
              logForDebugging(
                `FileHistory: [Rewind] Refusing to delete ${filePath}: path does not resolve or is not a regular file (${Z})`,
                { level: "error" },
              ));
            continue;
          }
          if (Z === "EPERM") {
            let Se = await lstat_24(filePath).catch(() => {
              return;
            });
            if (Se !== void 0 && !Se.isFile()) {
              (h++,
                logEvent("tengu_file_history_rewind_restore_file_failed", { dryRun: !1 }),
                logForDebugging(
                  `FileHistory: [Rewind] Refusing to delete ${filePath}: destination is not a regular file (EPERM)`,
                  { level: "error" },
                ));
              continue;
            }
          }
          if (!isENOENT(error)) throw error;
        }
        continue;
      }
      if (await hasFileChangedSinceBackup(filePath, L)) {
        let q = await restoreBackup(filePath, L, w?.realParentDir);
        if (q === "restored")
          (logForDebugging(`FileHistory: [Rewind] Restored ${filePath} from ${L}`), r.push(filePath));
        else if (q === "refused") h++;
        else s.push(filePath);
      }
    } catch (error) {
      (logForDebugging(
        `FileHistory: [Rewind] Failed to restore ${trackingPath}: ${error instanceof Error ? error.message : String(error)}`,
        { level: "error" },
      ),
        logEvent("tengu_file_history_rewind_restore_file_failed", { dryRun: !1 }),
        s.push(filePath));
    }
  }
  return (resetPlanFileCacheToUnknown(), { filesChanged: r, filesFailed: s, skippedLinks: h });
}
//@ chunk-e6aww6q8.js:1384588-1384870 layout
async function hasFileChangedSinceBackup(e, n, r) {
  let s = resolveBackupPath_2(n),
    h = r ?? null;
  if (!h)
    try {
      h = await stat_11(e);
    } catch (error) {
      if (!isENOENT(error)) return !0;
    }
  let y = null;
  try {
    y = await stat_11(s);
  } catch (error) {
    if (!isENOENT(error)) return !0;
  }
  return compareStatsAndContent(h, y, async () => {
    let [S, w] = await Promise.all([readFileTextNoFollow(e), readFileTextNoFollow(s, { noFollow: !0 })]);
    if (S === null || w === null) return !0;
    return S !== w;
  });
}
//@ chunk-e6aww6q8.js:1384870-1385080 file-local
function compareStatsAndContent(originalStats, backupStats, compareContent) {
  if ((originalStats === null) !== (backupStats === null)) return !0;
  if (originalStats === null || backupStats === null) return !1;
  if (!originalStats.isFile() || !backupStats.isFile()) return !0;
  if (originalStats.mode !== backupStats.mode || originalStats.size !== backupStats.size) return !0;
  if (originalStats.mtimeMs < backupStats.mtimeMs) return !1;
  return compareContent();
}
//@ chunk-e6aww6q8.js:1385080-1385486 fingerprint = computeDiffStatsForFile (0.941)
async function computeDiffStatsForFile(originalFile, backupFileName) {
  let filesChanged = [],
    s = 0,
    h = 0;
  try {
    let backupPath = backupFileName ? resolveBackupPath_2(backupFileName) : void 0,
      [S, w] = await Promise.all([
        readFileTextNoFollow(originalFile),
        backupPath ? readFileTextNoFollow(backupPath, { noFollow: !0 }) : null,
      ]);
    if (S === null && w === null) return { filesChanged: filesChanged, insertions: s, deletions: h };
    (filesChanged.push(originalFile),
      Y5e(S ?? "", w ?? "").forEach((G) => {
        if (G.added) s += G.count || 0;
        if (G.removed) h += G.count || 0;
      }));
  } catch (error) {
    logError(Error(`FileHistory: Error generating diffStats: ${error}`));
  }
  return { filesChanged: filesChanged, insertions: s, deletions: h };
}
/**
 * 备份文件名：路径哈希前 16 位 + "@v" + 版本。
 */
//@ chunk-e6aww6q8.js:1385486-1385571 callgraph-fingerprint = getBackupFileName (1)
function getBackupFileName(filePath, version) {
  return `${createHash_10("sha256").update(filePath).digest("hex").slice(0, 16)}@v${version}`;
}
//@ chunk-e6aww6q8.js:1385571-1385601 affinity
var BACKUP_FILE_NAME_RE = /^[0-9a-f]{16}@v\d+$/;
//@ chunk-e6aww6q8.js:1385601-1385675 sole-consumer
function isPositiveSafeInteger(e) {
  return typeof e === "number" && Number.isSafeInteger(e) && e >= 1;
}
//@ chunk-e6aww6q8.js:1385675-1385715 sole-consumer
function isUsableBackupVersion(e) {
  return isPositiveSafeInteger(e) && isPositiveSafeInteger(e + 1);
}
//@ chunk-e6aww6q8.js:1385715-1385846 sole-consumer
function parseBackupVersion(e) {
  if (typeof e !== "string") return;
  let match = e.match(/@v(\d+)$/),
    r = match ? Number(match[1]) : void 0;
  return r !== void 0 && isUsableBackupVersion(r) ? r : void 0;
}
//@ chunk-e6aww6q8.js:1385846-1386014 sole-consumer
function assertValidBackupFileNameAndSession(e, n) {
  if (typeof e !== "string" || !BACKUP_FILE_NAME_PATTERN_WITH_LEGACY.test(e))
    throw Error("FileHistory: invalid backup file name");
  if (n && !isSafeIdSegment(n)) throw Error("FileHistory: invalid session id");
}
/**
 * 备份文件的绝对路径（配置目录/file-history/<sessionId>/<name>），先校验名字与会话 id。
 */
//@ chunk-e6aww6q8.js:1386014-1386088 sole-consumer = resolveBackupPath (1)
function resolveBackupPath_2(backupFileName, sessionId) {
  assertValidBackupFileNameAndSession(backupFileName, sessionId);
  let configDir = getClaudeConfigDir();
  return join_60(configDir, "file-history", sessionId || getSessionId(), backupFileName);
}
//@ chunk-e6aww6q8.js:1386088-1386147 sole-consumer
function resolveBackupStorageKey(e, n) {
  return (assertValidBackupFileNameAndSession(e, n), STORAGE_SPACES.fileHistory(n || getSessionId(), e));
}
/**
 * 为文件创建指定版本的备份（file-history/<session>/<hash>@v<n>）；文件不存在时返回 backupFileName null。
 */
//@ chunk-e6aww6q8.js:1386405-1386976 fingerprint = createBackup (0.778)
async function createBackup(filePath, version) {
  let backupFileName = getBackupFileName(filePath, version),
    backupPath = resolveBackupPath_2(backupFileName),
    srcStats;
  try {
    srcStats = await stat_11(filePath);
  } catch (error) {
    if (isENOENT(error))
      return {
        backupFileName: null,
        version: version,
        backupTime: new Date(),
        realParentDir: await isENOENT_2(filePath),
      };
    throw error;
  }
  if (!srcStats.isFile()) throw Error("FileHistory: tracked path is not a regular file");
  await unlink_8(backupPath).catch((S) => {
    if (!isENOENT(S)) throw S;
  });
  try {
    await copyFile_3(filePath, backupPath);
  } catch (error) {
    if (!isENOENT(error)) throw error;
    (await mkdir_13(dirname_34(backupPath), { recursive: !0 }), await copyFile_3(filePath, backupPath));
  }
  await chmod_3(backupPath, srcStats.mode);
  let y = await isENOENT_2(filePath);
  return (
    logEvent("tengu_file_history_backup_file_created", { version: version, fileSize: srcStats.size }),
    { backupFileName: backupFileName, version: version, backupTime: new Date(), realParentDir: y }
  );
}
//@ chunk-e6aww6q8.js:1386976-1388046 layout
async function checkRestoreDestination(e, n) {
  let r = (s) => ({ verdict: "refused", detail: s });
  try {
    let s = await lstat_24(e);
    if (s.isSymbolicLink()) return r("destination is a symlink");
    if (!s.isFile()) return r("destination is not a regular file");
    if (s.nlink > 1) return r(`destination is hard-linked (nlink=${s.nlink})`);
  } catch (error) {
    let h = getErrnoCode(error);
    if (h === "ELOOP" || h === "ENOTDIR") return r(`destination path does not resolve (${h})`);
    if (!isENOENT(error)) throw error;
  }
  if (n !== void 0) {
    let s = dirname_34(e),
      h;
    try {
      h = await realpath_18(s);
    } catch (error) {
      let w = getErrnoCode(error);
      if (w === "ELOOP" || w === "ENOTDIR") return r(`parent path does not resolve (${w})`);
      if (!isENOENT(error)) throw error;
      try {
        if ((await lstat_24(s)).isSymbolicLink()) return r("parent directory is a dangling symlink");
      } catch (error) {
        if (!isENOENT(error)) throw error;
      }
      let L = s;
      for (;;) {
        let G = dirname_34(L);
        if (G === L) break;
        L = G;
        try {
          await lstat_24(L);
        } catch (error) {
          if (!isENOENT(error)) throw error;
          continue;
        }
        h = await realpath_18(L)
          .then((q) => join_60(q, relative_20(L, s)))
          .catch((q) => {
            if (isENOENT(q)) return;
            throw q;
          });
        break;
      }
    }
    if (h !== n) return r(`parent directory moved (${h} != ${n})`);
    let y = await stat_11(s).catch((S) => {
      if (isENOENT(S)) return;
      throw S;
    });
    if (y !== void 0 && !y.isDirectory()) return r("parent path is not a directory");
  }
  return { verdict: "safe" };
}
//@ chunk-e6aww6q8.js:1388046-1388676 layout
async function checkRestoreParentDir(e, n) {
  if (n === void 0 || !readFlagWithOverride("tengu_lucky_finch", { safe: !0 })) return { verdict: "unbound" };
  let r = basename_29(e),
    s = getPlatform();
  if (s === "linux" || s === "wsl") {
    let h;
    try {
      h = await open_14(n, tz | constants_17.O_DIRECTORY | constants_17.O_NOFOLLOW | READ_LIMITS);
    } catch (error) {
      return parentDirOpenErrorVerdict(error);
    }
    try {
      let y = await readlink_4(`/proc/self/fd/${h.fd}`).catch((S) => {
        if (isENOENT(S)) return null;
        throw S;
      });
      if (y === null) return { verdict: "unbound" };
      if (y !== n) {
        if (y.endsWith(" (deleted)")) return { verdict: "absent" };
        return {
          verdict: "refused",
          detail: `its directory moved since the checkpoint (now ${y}, was ${n})`,
        };
      }
      return (await unlink_8(`/proc/self/fd/${h.fd}/${r}`), { verdict: "deleted" });
    } finally {
      await h.close();
    }
  }
  return { verdict: "unbound" };
}
//@ chunk-e6aww6q8.js:1388676-1388901 layout
function parentDirOpenErrorVerdict(e) {
  let n = getErrnoCode(e);
  if (n === "ENOENT") return { verdict: "absent" };
  if (n === "ELOOP" || n === "ENOTDIR")
    return {
      verdict: "refused",
      detail: `its directory was replaced by a link or a non-directory since the checkpoint (${n})`,
    };
  throw e;
}
/**
 * 从备份文件恢复单个文件（检查目标不是符号链接/硬链接、父目录未被替换，写临时文件后 rename）。
 */
//@ chunk-e6aww6q8.js:1388901-1391864 callgraph-witnessed = restoreBackup (0.14)
async function restoreBackup(e, n, r) {
  let backupPath = resolveBackupPath_2(n),
    h = (G) => (
      logEvent("tengu_file_history_rewind_restore_file_failed", { dryRun: !1 }),
      logForDebugging(`FileHistory: [Rewind] Refusing to restore ${e}: ${G}`, { level: "error" }),
      "refused"
    ),
    y;
  try {
    y = await stat_11(backupPath);
  } catch (error) {
    if (isENOENT(error))
      return (
        logEvent("tengu_file_history_rewind_restore_file_failed", { dryRun: !1 }),
        logForDebugging(`FileHistory: [Rewind] Backup file not found: ${backupPath}`, { level: "error" }),
        "backup-missing"
      );
    throw error;
  }
  if (!y.isFile()) return h("backup source is not a regular file");
  let S = constants_17.O_NONBLOCK ?? 0,
    w = constants_17.O_NOFOLLOW ?? 0,
    L;
  try {
    L = await open_14(backupPath, constants_17.O_RDONLY | S | w);
  } catch (error) {
    let q = getErrnoCode(error);
    if (q === "ELOOP" || q === "EMLINK") return h("backup source became a symlink (O_NOFOLLOW)");
    throw error;
  }
  try {
    if (!(await L.stat()).isFile()) return h("backup source is not a regular file");
    let q = constants_17.O_NOFOLLOW ?? 0,
      Z = constants_17.O_NONBLOCK ?? 0,
      Se = constants_17.O_WRONLY | constants_17.O_CREAT | q | Z,
      ke = (Me) => {
        let We = getErrnoCode(Me);
        return We === "ELOOP" || We === "EMLINK";
      },
      we = (Me) => getErrnoCode(Me) === "ENXIO",
      Ee = (Me) => {
        let We = getErrnoCode(Me);
        return We === "EISDIR" || We === "ENOTDIR";
      },
      Ae = y.mode & 511,
      Ie;
    try {
      Ie = await open_14(e, Se, Ae);
    } catch (error) {
      if (ke(error)) return h("destination became a symlink (O_NOFOLLOW)");
      if (we(error)) return h("destination became a FIFO (ENXIO)");
      if (Ee(error)) return h(`destination path was changed during restore (${getErrnoCode(error)})`);
      if (!isENOENT(error)) throw error;
      if (r !== void 0) {
        if (
          (await isENOENT_2(e).catch(() => {
            return;
          })) !== r
        )
          return h("parent chain changed before directory creation");
      }
      try {
        await mkdir_13(dirname_34(e), { recursive: !0 });
      } catch (error) {
        if (Ee(error) || getErrnoCode(error) === "EEXIST")
          return h(`destination path was changed during restore (${getErrnoCode(error)})`);
        throw error;
      }
      try {
        Ie = await open_14(e, Se, Ae);
      } catch (error) {
        if (ke(error)) return h("destination became a symlink (O_NOFOLLOW)");
        if (we(error)) return h("destination became a FIFO (ENXIO)");
        if (Ee(error)) return h(`destination path was changed during restore (${getErrnoCode(error)})`);
        throw error;
      }
    }
    try {
      let stats = await Ie.stat({ bigint: !0 });
      if (!stats.isFile()) return h("destination is not a regular file");
      if (stats.nlink > 1) return h(`destination is hard-linked (nlink=${stats.nlink})`);
      if (r !== void 0) {
        if (
          (await realpath_18(dirname_34(e)).catch(() => {
            return;
          })) !== r
        )
          return h("parent directory changed during restore");
      }
      if (r !== void 0) {
        let lt = await realpath_18(`/proc/self/fd/${Ie.fd}`).catch(() => null);
        if (lt !== null && dirname_34(lt) !== r)
          return h("destination moved during restore (fd path re-check)");
      }
      let We = await lstat_24(e, { bigint: !0 }).catch(() => {
        return;
      });
      if (We === void 0 || !We.isFile() || We.dev !== stats.dev || (stats.ino !== 0n && We.ino !== stats.ino))
        return h("destination changed identity during restore (fd/path mismatch)");
      await Ie.truncate(0);
      let allocUnsafe = Buffer.allocUnsafe(65536);
      for (;;) {
        let { bytesRead: bytesRead } = await L.read(allocUnsafe, 0, allocUnsafe.length, null);
        if (bytesRead === 0) break;
        let Je = 0;
        while (Je < bytesRead) {
          let { bytesWritten: bytesWritten } = await Ie.write(allocUnsafe, Je, bytesRead - Je);
          if (bytesWritten === 0) throw Error("write returned 0 bytes with data remaining");
          Je += bytesWritten;
        }
      }
      try {
        await Ie.chmod(y.mode);
      } catch (error) {
        logForDebugging(
          `FileHistory: [Rewind] chmod failed after content restore of ${e}: ${errorMessage(error)}`,
          { level: "error" },
        );
      }
    } finally {
      await Ie.close();
    }
  } finally {
    try {
      await L.close();
    } catch (error) {
      logForDebugging(
        `FileHistory: [Rewind] backup handle close failed after restore of ${e}: ${errorMessage(error)}`,
        { level: "error" },
      );
    }
  }
  return "restored";
}
/**
 * 取某文件在所有快照中的第一个备份。
 */
//@ chunk-e6aww6q8.js:1391864-1391986 fingerprint = getBackupFileNameFirstVersion (0.799)
function getBackupFileNameFirstVersion(trackingPath, state) {
  for (let snapshot of state.snapshots) {
    let s = getOwn(snapshot.trackedFileBackups, trackingPath);
    if (s !== void 0 && s.version === 1) return s;
  }
  return;
}
/**
 * cwd 内的路径存为相对路径（trackingPath），其余保持绝对。
 */
//@ chunk-e6aww6q8.js:1391986-1392077 file-local
function maybeShortenFilePath(filePath) {
  if (!isAbsolute_28(filePath)) return filePath;
  let cwd = getOriginalCwd();
  if (filePath.startsWith(cwd)) return relative_20(cwd, filePath);
  return filePath;
}
//@ chunk-e6aww6q8.js:1392077-1392129 layout
function expandTrackingPath(e) {
  if (isAbsolute_28(e)) return e;
  return join_60(getOriginalCwd(), e);
}
/**
 * 从会话日志里的 fileHistorySnapshots 重建 fileHistory 状态（resume 用）。
 */
//@ chunk-e6aww6q8.js:1392129-1392391 facade-exports = fileHistoryRestoreStateFromLog (1)
function fileHistoryRestoreStateFromLog(fileHistorySnapshots, onUpdateState) {
  if (!fileHistoryEnabled()) return;
  let snapshots = [],
    trackedFiles = new Set();
  for (let snapshot of fileHistorySnapshots) {
    let trackedFileBackups = {};
    for (let [S, w] of Object.entries(snapshot.trackedFileBackups ?? {})) {
      let trackingPath = maybeShortenFilePath(S);
      (trackedFiles.add(trackingPath), defineOwnProperty(trackedFileBackups, trackingPath, w));
    }
    snapshots.push({ ...snapshot, trackedFileBackups: trackedFileBackups });
  }
  onUpdateState({ snapshots: snapshots, trackedFiles: trackedFiles, snapshotSequence: snapshots.length });
}
//@ chunk-e6aww6q8.js:1392391-1392417 layout
var RENAME_RETRY_DELAYS_MS = [100, 200, 400, 800];
//@ chunk-e6aww6q8.js:1392417-1392571 layout
async function renameWithRetry(e, n, r = RENAME_RETRY_DELAYS_MS) {
  try {
    await retryFsOp(e, n);
  } catch (error) {
    let [h, ...y] = r,
      S = getErrnoCode(error);
    if (h === void 0 || S === void 0 || !TRANSIENT_FS_ERRORS_2.has(S)) throw error;
    return (await sleep(h), renameWithRetry(e, n, y));
  }
}
//@ chunk-e6aww6q8.js:1392571-1392582 layout
var BACKUP_MIGRATION_CONCURRENCY = 16;
//@ chunk-e6aww6q8.js:1392582-1392639 layout
class IncompleteBackupCopyError extends Error {
  name = "IncompleteBackupCopyError";
}
//@ chunk-e6aww6q8.js:1392639-1394533 layout
async function migrateBackupForResume(e, n, r, s) {
  let h;
  try {
    h = resolveBackupPath_2(e, n);
  } catch (error) {
    return { outcome: "failed", stage: "refused", error: error };
  }
  let y = join_60(r, e),
    S;
  try {
    S = await lstat_24(h);
  } catch (error) {
    return (
      logForDebugging(
        isENOENT(error)
          ? `FileHistory: Failed to copy backup ${e} on restore (backup file does not exist in ${n})`
          : `FileHistory: cannot read backup ${e} in ${n}: ${errorMessage(error)}`,
        { level: "error" },
      ),
      { outcome: "failed", stage: "source", error: error }
    );
  }
  if (!S.isFile())
    return {
      outcome: "failed",
      stage: "refused",
      error: Error("FileHistory: backup source is not a regular file"),
    };
  try {
    await link_2(h, y);
  } catch (error) {
    let L = getErrnoCode(error);
    if (L === "EEXIST") return { outcome: "already_present" };
    if (L === "ENOENT")
      return (
        logForDebugging(
          `FileHistory: Failed to copy backup ${e} on restore (backup file does not exist in ${n})`,
          { level: "error" },
        ),
        { outcome: "failed", stage: "link", error: error }
      );
    logForDebugging(
      `FileHistory: hard link failed (${L ?? errorMessage(error)}), falling back to copy: ${h} -> ${y}`,
      { level: "error" },
    );
    let G = makeTempSiblingPath(y);
    try {
      try {
        (await assertPathSafeAsync(G), await copyFile_3(h, G, constants_17.COPYFILE_EXCL));
        let { size: size } = await lstat_24(G);
        if (size !== S.size) throw new IncompleteBackupCopyError("FileHistory: backup copy is incomplete");
      } catch (error_2) {
        return (
          logForDebugging(
            `FileHistory: copying backup ${e} failed: ${errorMessage(error_2)}; backup not migrated, a rewind to this checkpoint will report it missing`,
            { level: "error" },
          ),
          { outcome: "failed", stage: "copy", linkError: error, error: error_2 }
        );
      }
      try {
        await renameWithRetry(G, y);
      } catch (error_2) {
        let Z = getErrnoCode(error_2);
        if (Z === "EEXIST") return { outcome: "already_present" };
        return (
          logForDebugging(
            `FileHistory: could not move the copied backup ${e} into place \u2014 ${Z !== void 0 && TRANSIENT_FS_ERRORS_2.has(Z) ? `rename still refused (${Z}) after its retries (usually a scanner or sync tool still holding the just-written copy, or a mount that allows creating files but not renaming them)` : `rename failed: ${errorMessage(error_2)}`}; backup not migrated, a rewind to this checkpoint will report it missing`,
            { level: "error" },
          ),
          { outcome: "failed", stage: "rename", linkError: error, error: error_2 }
        );
      }
    } finally {
      await retryTransient(() => unlink_8(G)).catch(() => {});
    }
  }
  return (
    logForDebugging(`FileHistory: Copied backup ${e} from session ${n} to ${s}`),
    { outcome: "migrated" }
  );
}
//@ chunk-e6aww6q8.js:1394533-1395790 layout
function summarizeBackupMigrationFailures(e, n) {
  let flattened = e.flatMap((L) => (L.stage === "copy" || L.stage === "rename" ? [L] : [])),
    filtered = flattened.filter(({ stage: stage }) => stage === "copy"),
    filtered_2 = flattened.filter(({ stage: stage }) => stage === "rename"),
    filtered_3 = e.filter(
      ({ stage: stage, error: error }) =>
        stage === "escaped" ||
        (stage !== "refused" &&
          !isSadFsErrno(error) &&
          !isEnvFsErrno(error) &&
          !TRANSIENT_FS_ERRORS_2.has(getErrnoCode(error) ?? "")),
    ),
    S = count(e, ({ stage: stage }) => stage === "refused"),
    w = [
      ...(S > 0 ? [concatSafe(lit_2("refused as unsafe: "), fromNumber(S))] : []),
      ...formatGroupedCounts(
        lit_2("source backup unreadable: "),
        e
          .filter(({ stage: stage }) => stage === "source")
          .map(({ error: error }) => classifyErrnoForTelemetry(error)),
      ),
      ...formatGroupedCounts(
        lit_2("hard link failed: "),
        e
          .filter(({ stage: stage }) => stage === "link")
          .map(({ error: error }) => classifyErrnoForTelemetry(error)),
      ),
      ...formatGroupedCounts(
        lit_2("copy fallback (link errno->copy errno): "),
        filtered.map(({ linkError: linkError, error: error }) =>
          concatSafe(classifyErrnoForTelemetry(linkError), lit_2("->"), classifyErrnoForTelemetry(error)),
        ),
      ),
      ...formatGroupedCounts(
        lit_2("copied but not renamed into place (link errno->rename errno): "),
        filtered_2.map(({ linkError: linkError, error: error }) =>
          concatSafe(classifyErrnoForTelemetry(linkError), lit_2("->"), classifyErrnoForTelemetry(error)),
        ),
      ),
      ...formatGroupedCounts(
        lit_2("threw outside the fs calls: "),
        e
          .filter(({ stage: stage }) => stage === "escaped")
          .map(({ error: error }) => classifyErrnoForTelemetry(error)),
      ),
    ];
  return {
    message: concatSafe(
      lit_2("FileHistory: backup migration on resume left "),
      fromNumber(e.length),
      lit_2(" of "),
      fromNumber(n),
      lit_2(" backups unmigrated; "),
      joinSafe(w, "; "),
    ),
    hasUnexpectedFailure: filtered_3.length > 0,
    unexpectedErrnoCode: mostCommon(
      filtered_3.flatMap(({ error: error }) => {
        let G = sanitizeErrnoForTelemetry(error);
        return G === void 0 ? [] : [G];
      }),
    ),
    linkErrno: mostCommon(
      flattened.map(({ linkError: linkError }) => sanitizedErrnoLowerForTelemetry(linkError)),
    ),
    copyErrno: mostCommon(filtered.map(({ error: error }) => sanitizedErrnoLowerForTelemetry(error))),
    renameErrno: mostCommon(filtered_2.map(({ error: error }) => sanitizedErrnoLowerForTelemetry(error))),
  };
}
//@ chunk-e6aww6q8.js:1395790-1395891 layout
function classifyErrnoForTelemetry(e) {
  return getErrnoCode(e)?.startsWith("Unknown system error")
    ? lit_2("UNKNOWN")
    : (sanitizedErrCodeForTelemetry(e) ?? lit_2("unclassified"));
}
//@ chunk-e6aww6q8.js:1395891-1395995 layout
function formatGroupedCounts(e, n) {
  return n.length === 0
    ? []
    : [
        concatSafe(
          e,
          joinSafe(
            countOccurrencesSorted(n).map(([r, s]) =>
              s > 1 ? concatSafe(r, lit_2(" x"), fromNumber(s)) : r,
            ),
            ", ",
          ),
        ),
      ];
}
//@ chunk-e6aww6q8.js:1395995-1396033 layout
function mostCommon(e) {
  return countOccurrencesSorted(e)[0]?.[0];
}
//@ chunk-e6aww6q8.js:1396033-1396146 layout
function countOccurrencesSorted(e) {
  return [...Map.groupBy(e, (n) => n)]
    .map(([n, r]) => [n, r.length])
    .sort(([n, r], [s, h]) => h - r || (n < s ? -1 : 1));
}
/**
 * resume 时把旧会话的备份迁移到新会话目录（硬链接，失败则复制再 rename，并发 16），汇总失败原因记日志。
 */
//@ chunk-e6aww6q8.js:1396146-1398175 facade-exports = copyFileHistoryForResume (0.453)
async function copyFileHistoryForResume(e, n, r) {
  if (!fileHistoryEnabled()) return;
  let fileHistorySnapshots = e.fileHistorySnapshots;
  if (!fileHistorySnapshots || e.messages.length === 0) return;
  let previousSessionId = e.messages.at(-1)?.sessionId;
  if (!previousSessionId) {
    logError(Error("FileHistory: Failed to copy backups on restore (no previous session id)"));
    return;
  }
  let S = n ?? getSessionId();
  if (previousSessionId === S) {
    logForDebugging(`FileHistory: No need to copy file history for resuming with same session id: ${S}`);
    return;
  }
  if (!isSafeIdSegment(S)) {
    logForDebugging("FileHistory: refusing to copy backups on restore (invalid target session id)", {
      level: "warn",
    });
    return;
  }
  try {
    let newBackupDir = join_60(getClaudeConfigDir(), "file-history", S);
    await mkdir_13(newBackupDir, { recursive: !0 });
    let mapped = fileHistorySnapshots
        .filter(
          (ke) =>
            typeof ke === "object" &&
            ke !== null &&
            typeof ke.trackedFileBackups === "object" &&
            ke.trackedFileBackups !== null &&
            Object.values(ke.trackedFileBackups).every((we) => typeof we === "object" && we !== null),
        )
        .map((ke) => ({
          snapshot: ke,
          backupFileNames: Object.values(ke.trackedFileBackups)
            .map((we) => we.backupFileName)
            .filter((we) => we !== null),
        })),
      G = uniq(mapped.flatMap(({ backupFileNames: backupFileNames }) => backupFileNames)),
      q = new Map(
        await pMap(
          G,
          async (ke) => [
            ke,
            await migrateBackupForResume(ke, previousSessionId, newBackupDir, S).catch(
              (snapshot) => (
                logForDebugging(
                  `FileHistory: unexpected error while migrating backup ${ke}: ${errorMessage(snapshot)}; backup not migrated`,
                  { level: "error" },
                ),
                { outcome: "failed", stage: "escaped", error: snapshot }
              ),
            ),
          ],
          { concurrency: BACKUP_MIGRATION_CONCURRENCY },
        ),
      ),
      backupEntries = mapped.filter(({ backupFileNames: backupFileNames }) =>
        backupFileNames.every((backup) => {
          let Ee = q.get(backup)?.outcome;
          return Ee === "migrated" || Ee === "already_present";
        }),
      );
    backupEntries.forEach(({ snapshot: snapshot }) => {
      recordFileHistorySnapshot(snapshot.messageId, snapshot, !1, r).catch((we) => {
        logError(Error("FileHistory: Failed to record copy backup snapshot"));
      });
    });
    let Se = mapped.length - backupEntries.length;
    if (Se > 0) {
      let filtered = [...q.values()].filter((Ee) => Ee.outcome === "failed"),
        we = summarizeBackupMigrationFailures(filtered, G.length);
      if (we.hasUnexpectedFailure)
        logError(
          withTelemetryFacts(Error(we.message), {
            telemetryMessage: we.message,
            code: we.unexpectedErrnoCode,
          }),
        );
      else logForDebugging(`${we.message}; session ${S}`, { level: "error" });
      logEvent("tengu_file_history_resume_copy_failed", {
        numSnapshots: fileHistorySnapshots.length,
        failedSnapshots: Se,
        numBackups: G.length,
        failedBackups: filtered.length,
        linkErrno: we.linkErrno,
        copyErrno: we.copyErrno,
        renameErrno: we.renameErrno,
      });
    }
  } catch (error) {
    if (isSadFsErrno(error) || isEnvFsErrno(error)) {
      logForDebugging(`FileHistory: backup-dir mkdir failed for session ${S}: ${error}`, { level: "error" });
      return;
    }
    logError(error);
  }
}
/**
 * 快照文件集合变化时通知 VS Code 扩展。
 */
//@ chunk-e6aww6q8.js:1398175-1398816 fingerprint = notifyVscodeSnapshotFilesUpdated (0.586)
async function notifyVscodeSnapshotFilesUpdated(oldState, newState) {
  let oldSnapshot = oldState.snapshots.at(-1),
    newSnapshot = newState.snapshots.at(-1);
  if (!newSnapshot) return;
  for (let trackingPath of newState.trackedFiles)
    try {
      let filePath = expandTrackingPath(trackingPath),
        S = oldSnapshot ? getOwn(oldSnapshot.trackedFileBackups, trackingPath) : void 0,
        w = getOwn(newSnapshot.trackedFileBackups, trackingPath);
      if (S?.backupFileName === w?.backupFileName && S?.version === w?.version) continue;
      let oldContent = null;
      if (S?.backupFileName) {
        let backupPath = resolveBackupPath_2(S.backupFileName);
        oldContent = await readFileTextNoFollow(backupPath, { noFollow: !0 });
      }
      let newContent = null;
      if (w?.backupFileName) {
        let backupPath = resolveBackupPath_2(w.backupFileName);
        newContent = await readFileTextNoFollow(backupPath, { noFollow: !0 });
      }
      if (oldContent !== newContent) wSt(filePath, oldContent, newContent);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("FileHistory: invalid"))
        logForDebugging(`FileHistory: skipping snapshot notification for ${trackingPath}: ${error.message}`, {
          level: "error",
        });
      else logError(error);
    }
}
//@ chunk-e6aww6q8.js:1398816-1398873 layout
async function readFileTextNoFollow(e, n) {
  return (await checkOriginFileChanged(e, n)).text ?? null;
}
/**
 * 以 O_NONBLOCK（可选 O_NOFOLLOW）打开并读取文件文本与 stats，可限制最大字节；用于比较备份与当前文件。
 */
//@ chunk-e6aww6q8.js:1398873-1399423 callgraph-fingerprint = checkOriginFileChanged (0.222)
async function checkOriginFileChanged(e, n) {
  try {
    let originalStats = constants_17.O_NONBLOCK ?? 0,
      s = n?.noFollow ? (constants_17.O_NOFOLLOW ?? 0) : 0,
      h = await open_14(e, constants_17.O_RDONLY | originalStats | s);
    try {
      let stats = await h.stat();
      if (!stats.isFile() || (n?.maxBytes !== void 0 && stats.size > n.maxBytes)) return { stats: stats };
      if (n?.maxBytes === void 0) return { stats: stats, text: await h.readFile({ encoding: "utf-8" }) };
      let allocUnsafe = Buffer.allocUnsafe(stats.size + 1),
        w = 0;
      while (w < allocUnsafe.length) {
        let { bytesRead: bytesRead } = await h.read(allocUnsafe, w, allocUnsafe.length - w, w);
        if (bytesRead === 0) break;
        w += bytesRead;
      }
      return w > stats.size ? { stats: stats } : { stats: stats, text: allocUnsafe.toString("utf-8", 0, w) };
    } finally {
      await h.close();
    }
  } catch (error) {
    return { stats: isPathAbsent(error) ? null : void 0 };
  }
}
//@ chunk-e6aww6q8.js:1399423-1399434 layout
var lKo = !1;
//@ chunk-e6aww6q8.js:1399434-1399484 file-local
function maybeDumpStateForDebug(state) {
  if (lKo) console.error(inspect(state, !1, 5));
}
/**
 * 取会话的 file-history 目录（误配名 resolveBackupPath）。
 */
//@ chunk-23fm9f0d.js:22892-22931 fingerprint = resolveBackupPath (1)
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
