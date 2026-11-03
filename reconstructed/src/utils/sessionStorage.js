/**
 * utils/sessionStorage.ts
 *
 * 会话转录存储核心：projects/<清洗cwd>/<sessionId>.jsonl 的写入队列（Project 类）、记录类型策略、元数据记录、加载/建链、日志列表与 resume 查找、子代理转录与侧车、远程水合与迁移。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/sessionStorage.ts
 * pieces: chunk-0j11jfmy.js (1), chunk-18hwfzwa.js (2), chunk-63641kq7.js (3), chunk-7dqf31r1.js (2), chunk-89ebz077.js (1), chunk-ad2e1aj6.js (1), chunk-bss4k1z9.js (1), chunk-cg2r2hy6.js (2), chunk-cgs3vg0v.js (1), chunk-dz3q485w.js (1), chunk-e6aww6q8.js (505), chunk-qzv7ezvq.js (19), chunk-rds552kq.js (1), chunk-wd9kxbpn.js (1), chunk-x753sk9t.js (8)
 * attribution: fingerprint 34, callgraph-fingerprint 6, placement 29, affinity 1, sole-consumer 1, layout 163, facade-majority 292, callgraph-witnessed 3, file-local 4, facade-exports 16
 */
import {
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
  normalize,
  normalize as normalize_2,
  normalize as normalize_3,
  normalize as normalize_4,
  normalize as normalize_5,
  normalize as normalize_6,
  normalize as normalize_7,
  normalize as normalize_8,
  normalize as normalize_9,
  sep,
  sep as sep_2,
  isAbsolute,
  isAbsolute as isAbsolute_2,
  relative,
} from "path";
import {
  readFile,
  readFile as readFile_2,
  readFile as readFile_3,
  readFile as readFile_4,
  readFile as readFile_5,
  readFile as readFile_6,
  readFile as readFile_7,
  readFile as readFile_8,
  readFile as readFile_9,
  readFile as readFile_10,
  readFile as readFile_11,
  readFile as readFile_12,
  readFile as readFile_13,
  readFile as readFile_14,
  readFile as readFile_15,
  readFile as readFile_16,
  readFile as readFile_17,
  readFile as readFile_18,
  readFile as readFile_19,
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
  readdir,
  readdir as readdir_2,
  readdir as readdir_3,
  readdir as readdir_4,
  readdir as readdir_5,
  readdir as readdir_6,
  readdir as readdir_7,
  readdir as readdir_8,
  readdir as readdir_9,
  readdir as readdir_10,
  readdir as readdir_11,
  readdir as readdir_12,
  readdir as readdir_13,
  readdir as readdir_14,
  readdir as readdir_15,
  readdir as readdir_16,
  readdir as readdir_17,
  readdir as readdir_18,
  readdir as readdir_19,
  readdir as readdir_20,
  readdir as readdir_21,
  readdir as readdir_22,
  readdir as readdir_23,
  readdir as readdir_24,
  readdir as readdir_25,
  readdir as readdir_26,
  readdir as readdir_27,
  readdir as readdir_28,
  readdir as readdir_29,
  readdir as readdir_30,
  readdir as readdir_31,
  readdir as readdir_32,
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
  appendFile,
  appendFile as appendFile_2,
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
  utimes,
  utimes as utimes_2,
  utimes as utimes_3,
  rename,
  rename as rename_2,
  rename as rename_3,
  rename as rename_4,
  rename as rename_5,
  rename as rename_6,
  rename as rename_7,
  lutimes,
  lutimes as lutimes_2,
  lutimes as lutimes_3,
  lutimes as lutimes_4,
  lutimes as lutimes_5,
  lutimes as lutimes_6,
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
  rm as rm_2,
  rm as rm_2_2,
  rm as rm_3,
  rm as rm_4,
  rm as rm_5,
  rm as rm_6,
  rm as rm_7,
  rm as rm_8,
  rm as rm_9,
  rm as rm_10,
  rm as rm_11,
  rm as rm_12,
  rm as rm_13,
  rm as rm_14,
  rm as rm_15,
  rm as rm_16,
  rm as rm_17,
  rm as rm_18,
  rm as rm_19,
  rm as rm_20,
  rm as rm_21,
  rm as rm_22,
  rm as rm_23,
  rm as rm_24,
  rm as rm_25,
  rm as rm_26,
  rm as rm_27,
  link,
  link as link_2,
  link as link_3,
} from "fs/promises";
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
  createReadStream,
  createReadStream as createReadStream_2,
  openSync,
  openSync as openSync_2,
  fstatSync,
  fstatSync as fstatSync_2,
  writeSync,
  writeSync as writeSync_2,
  writeSync as writeSync_3,
  closeSync,
  closeSync as closeSync_2,
  closeSync as closeSync_3,
  readSync,
  readSync as readSync_2,
  constants as constants_2,
} from "fs";
import {
  randomBytes,
  randomBytes as randomBytes_2,
  randomBytes as randomBytes_3,
  randomBytes as randomBytes_4,
  randomBytes as randomBytes_5,
  randomBytes as randomBytes_6,
  randomBytes as randomBytes_7,
  randomBytes as randomBytes_8,
  randomBytes as randomBytes_9,
  randomBytes as randomBytes_10,
  randomBytes as randomBytes_11,
  randomBytes as randomBytes_12,
  randomBytes as randomBytes_13,
  randomBytes as randomBytes_14,
} from "crypto";
import { constants as constants_2_2, constants as constants_8 } from "os";
import { StringDecoder } from "string_decoder";
import { isAscii } from "buffer";
import { Ws } from "../services/api/streamFallbackWarning.js";
import { isUnavailableErrorCode, isUnavailableError } from "./settings/managedEnvKeys.js";
import {
  getErrnoCode,
  isFsInaccessible,
  isPathAbsent,
  isENOENT,
  errorMessage,
  isSyscallError,
  AbortError as AbortError_2,
  sanitizedErrnoLowerForTelemetry,
  withTelemetryMessage,
  isAbortError,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  isSadFsErrno,
  isEnvFsErrno,
  isWin32ReadEbadf,
  errnoShapedCode,
} from "./errors.js";
import {
  isStoreError,
  wft,
  formatStorageError,
  kDt,
  d7t,
  wbs,
  storageErrorCode,
} from "./storage/storageErrors.js";
import {
  stopSiblingExists,
  T9,
  stopSiblingCache,
  w9,
  removeStopSibling,
  persistSubagentStop,
} from "./agentStopSiblings.js";
import { runWithFileWriteContext } from "./file.js";
import {
  isDiskless,
  getRootSession,
  getSessionId,
  isSessionPersistenceDisabled,
  getConversationAtisLatch,
  getConversationToolsUsed,
  getPromptId as getPromptId_2,
  getPlanSlugCache,
  registerCostStateRecorder,
  getOriginalCwd,
  switchSession,
  setConversationAtisLatch,
  getRestoredMemoryPause,
  setRestoredMemoryPause,
  setMemoryToggledOff,
  getRestoredAutoMemoryOff,
  setRestoredAutoMemoryOff,
  setAutoMemoryOffThisSession,
  getSessionProjectDir,
  getOriginalCwdOrNull,
} from "../bootstrap/state.js";
import { gte } from "../plugins/functionHooks/devModsName.js";
import { isPlainObject as isPlainObject_4 } from "./isPlainObject.js";
import { formatDurationCoarse, formatFileSize } from "./format.js";
import { WDn, sortLogs } from "../types/logs.js";
import { defineOwnProperty } from "./objectSafety.js";
import { createStore } from "../state/store.js";
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";
import {
  isTranscriptMessage as isTranscriptMessage_3,
  fillMissingTranscriptFields,
  findResumedThinkingRanges,
} from "../cli/transports/ccrMessageMapping.js";
import {
  isCompactBoundaryOrSummary,
  dropLargeOriginalFile,
  OB,
  extractTag,
  rememberMovedRow,
  isInterruptionOnlyMessage,
  isToolResultMessage,
  isHarnessMetaMessage,
  isShutdownInterrupted,
} from "./messages.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum, lit as lit_2, fromEnumOpt } from "../services/analytics/safeMetadata.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import {
  keyFromMetaPath,
  validateStorageKey,
  validateStorageScope,
  pathToSessionSideKey,
} from "./storage/storageKeys.js";
import {
  jsonParse,
  jsonStringify,
  toJsonLine,
  jsonlJoin,
  jsonParseRaw,
  clone,
  slowLogging,
} from "./slowOperations.js";
import {
  writeFileAtomic as writeFileAtomic_2,
  retryFsOp,
  O_NONBLOCK as O_NONBLOCK_2,
  writeIfMissing,
  assertPathSafeAsync,
  writeNewFile,
} from "./atomicPublishWrite.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { logError } from "./log.js";
import { logForDebugging } from "./debug.js";
import { warnDisklessSettingsWrite } from "./settings/settingsStorage.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import {
  create,
  create_2,
  create_3,
  create_6,
  create_20,
  create_12,
  create_25,
} from "../../vendor/zod/lib/index.mjs";
import { readAllPages } from "./pagedRead.js";
import {
  getFsImplementation,
  tailFile,
  FileChangedDuringReadError,
  readLinesReverse,
  hasUntouchableRecordSpellingAsync,
} from "./fsOperations.js";
import { env } from "./env.js";
import { isNestedInteractiveClaudeSession, isTeammate } from "./teammate.js";
import {
  envSessionKind,
  getRegisteredSessionName,
  isUnattendedInteractiveSession,
} from "./concurrentSessions.js";
import { gl } from "./cwd.js";
import { getBranch } from "./git.js";
import {
  PROGRAMMATIC_ENTRYPOINTS,
  LITE_READ_BUF_SIZE,
  extractLastJsonStringField,
  extractFieldFromLastEntryOfTypeStrict,
  buildHistorySuppressionEntry,
  canonicalizePath,
  transcriptMessagesStateV5,
  writeEntriesToJsonlFile,
  appendEntriesToJsonlFile,
  findProjectDir,
  hasPrefix,
  isUuidShaped,
  SKIP_PRECOMPACT_THRESHOLD,
  getProjectKey,
  legacyDerivedProjectKey,
  MAX_SANITIZED_LENGTH,
  MAX_LISTING_PAGES,
  dirBelongsToProject,
  findProjectDirs,
  listedProjectKey,
  sanitizePath,
  normalizePathForCwdCompare,
  recordedCwdIsWithinOwnWorktrees,
  slugCollisionGuardFoldsCase,
  recordedCwdCollidesWithProjectResolved,
  readHeadAndTail as readHeadAndTail_2,
  extractJsonStringField,
  extractFieldFromFirstEntryStrict,
  getPinnedProjectDir,
  getProjectsDir as getProjectsDir_3,
  readSessionLite,
  getProjectsDir as getProjectsDir_4,
  resolveSessionFilePath_2,
} from "./sessionStoragePortable.js";
import { STORAGE_SPACES, isValidKeySegment, uA } from "./storage/storageSpaces.js";
import { Mn } from "./pathClassification.js";
import { uniq, count } from "./collections.js";
import { createSignal } from "./signal.js";
import { io } from "../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import {
  createToolResultSlimmer_2,
  writeTranscriptFile,
  reportTranscriptWriteFailure,
  noteTranscriptWriteOk,
  bPt,
} from "./transcript/transcriptWriter.js";
import { HostScoped } from "./hostScoped.js";
import { isDiagLogging, isInDiagScope, logForDiagnosticsNoPII } from "./diagLogs.js";
import { withDeadline, raceWithAbortSignal } from "./sleep.js";
import { registerCleanup } from "./cleanupRegistry.js";
import {
  RequestBlobStore,
  b9,
  isRequestBlobStoreEnabled,
  stripCacheControl as stripCacheControl_4,
  getToolResultDigests,
  fRt,
} from "./transcriptRequestBlobs.js";
import { READ_LIMITS } from "./fsBoundRead.js";
import {
  getFirstLine,
  truncateToLength,
  sanitizeSessionTitle,
  repairMalformedStringsDeep,
} from "./stringUtils.js";
import {
  transcriptLines,
  tryAppendToTranscript,
  findContinuedInSessionId,
} from "./backgroundSessionResume.js";
import {
  ice,
  deleteSessionTitleSidecar,
  transcriptStorageKeyForPath,
  removeTombstones,
  scanCompactBoundaries,
  makeLineEmitter,
  wG,
  transcriptScopeForDir,
  _D,
  isAuxiliaryEntry,
  lR,
  vG,
  buildChildrenIndex,
  collectLinearChain,
  writeSessionTitleSidecar,
  openTranscriptStream,
  Qoe,
  collectLeafUuids,
  isWin32TranscriptEbadf,
  WIN32_EBADF_TELEMETRY_MESSAGE,
  e0,
  findLastMessageTimestamp,
} from "./transcript/transcriptFiles.js";
import { isCompactBoundaryMessage as isCompactBoundaryMessage_3 } from "../services/projects/threadRows.js";
import { isShuttingDown, gracefulShutdownSync } from "./gracefulShutdown.js";
import { createKeyedQueue } from "./promiseQueue.js";
import { isSillyShoreGateOn, tagUntrustedArtifactContent } from "./messages/untrustedArtifactContent.js";
import {
  readTranscriptEntries,
  yG,
  readEnvelopeSessionId,
  ArtifactLedgerCollector,
  CostStateEntrySchema,
  resetArtifactLedgerState,
  isLaptopMemoryAttachment,
} from "./transcript/entryTypes.js";
import { writeFully, A7s } from "../services/memorySync/syncFiles.js";
import { AI } from "./plugins/safeCopy.js";
import { refreshCheckoutMetadata } from "./git/repoCheckouts.js";
import { Vt, G$, isSafeIdSegment, LE, Mr } from "./agentId.js";
import { isEnvTruthy, getProjectDirNameOverride, getClaudeConfigDir } from "./envUtils.js";
import { appendSessionLog, getSessionLogs } from "../services/api/sessionIngress.js";
import { ws } from "./fsFlags.js";
import { parseJSONL, bunJSONLParse } from "./json.js";
import { Bxt, DHe, F9, zxt, createRewindTracker, Hxt, Uxt } from "./transcript/resumeLoadReport.js";
import { validateAgentMetadata, UC } from "./agentMetadata.js";
import { Br, iyi, syi } from "./startupTiming.js";
import { mn, uC } from "./remoteEnvironment.js";
import { gn } from "./shortHash.js";
import { t7 } from "./messages/pluginPrompts.js";
import { flattenPastedBlocks } from "./pastedContent.js";
import { COMMAND_NAME, TICK } from "../constants/xml.js";
import { B6e } from "./messageKinds.js";
import { readSessionStartDate } from "./stats.js";
import { isFoamySpringEnabled, isSideMessagesEnabled, Zos } from "../services/analytics/growthbookGates.js";
import { announceFirstTurnOnce } from "./transcript/resumeAnnouncements.js";
import { hasEmbeddedSearchTools_2 } from "./embeddedTools.js";
import { collectBlockFieldsByType, getToolResultIds } from "../services/api/claude.js";
import { withEndedByModel, getEndedByModel, $nr } from "../tasks/endedByModel.js";
import { slugifySessionName } from "./sessionAddresses.js";
import { settledYieldFor } from "./sessionNameUniqueness.js";
import { getWorktreePaths } from "./getWorktreePaths.js";
import { createRowRepairer } from "./transcript/transcriptRepair.js";
import { countToolCallsSince_2, restoreWireInputStamps } from "./wireToolInputEcho.js";
import { sanitizeStringList } from "../bridge/controlRequests.js";
import { limitConcurrency } from "./concurrencyLimit.js";
import { S4 } from "../tools/REPLTool/constants.js";
import { resolveMessageAlias } from "./pollEvents/fold.js";
import { readCustomTitle } from "../cli/toolPermissionStream.js";
import { getPluginsDirectory } from "./plugins/pluginDirectories.js";
import { PathSpace } from "./resultError.js";
import { ce } from "../../vendor/react/cjs/react.production.js";
import { JM } from "../components/FeedbackSurvey/SurveyHost.js";
import { useStoreSelector } from "../hooks/useStoreSelector.js";
import { getPlatform } from "./platform.js";
import { FTt, NTt } from "./sandbox/userNamespace.js";
import { R7e } from "../tasks/taskState.js";
import { sameRepoWorktrees, isSameRepoPath } from "../services/projects/repoContext.js";
import { getJobDir, readJobState } from "../services/daemon/jobState.js";
import { pickWorktreeFields } from "../services/agentStatus/jobClassifier.js";
import { q } from "../services/agentStatus/jobState.js";

//@ chunk-e6aww6q8.js:215483-215536 placement
function BVs() {
  Ws().lastIngressUuidBySession.clear();
}
//@ chunk-e6aww6q8.js:220628-220716 placement
function jVs(e) {
  let n = e instanceof Error ? e.cause : void 0;
  return isUnavailableErrorCode(getErrnoCode(e)) || (isStoreError(n) && isUnavailableError(n));
}
//@ chunk-e6aww6q8.js:220716-220758 placement
function ARt(e, n, r) {
  return stopSiblingExists(T9(e, n), r);
}
//@ chunk-e6aww6q8.js:220758-220842 placement
async function setAgentTranscriptSubdir_2(e, n, r) {
  let s = T9(e, n);
  (stopSiblingCache.set(s, w9(s) + 1), await runWithFileWriteContext(e, () => removeStopSibling(s, r)));
}
//@ chunk-e6aww6q8.js:220887-220972 placement
function sjt(e, n) {
  return !isDiskless() && /^[A-Za-z0-9_-]+$/.test(n) && resolve_2(e) === resolve_2(join_4(gte(), n));
}
//@ chunk-e6aww6q8.js:220972-221079 placement
var DISK_TRANSCRIPT_LAG_PREFIX =
  "When this session resumed, the copy of this conversation on the container's disk lacked at least";
//@ chunk-e6aww6q8.js:221079-221757 placement
function findUnresolvedToolUse_2(e, n, r) {
  let lastIndex = e.findLastIndex((w) =>
    [w.event_id, w.payload.uuid].some((L) => typeof L === "string" && n.has(L)),
  );
  if (lastIndex === -1 && !r) return;
  let h = new Set(),
    y,
    sliced = e.slice(lastIndex + 1);
  for (let { payload: payload } of sliced) {
    let message = payload.message,
      G = isPlainObject_4(message) ? message.content : void 0,
      q = Array.isArray(G) ? G : [];
    for (let message of q.filter(isPlainObject_4)) {
      let Se =
        message.type === "tool_use"
          ? message.id
          : message.type === "tool_result"
            ? message.tool_use_id
            : void 0;
      if (typeof Se === "string") {
        if (h.size === 0 && typeof payload.timestamp === "string") y = payload.timestamp;
        h.add(Se);
      }
    }
  }
  return {
    rows: sliced.length,
    toolCalls: h.size,
    oldestToolRowAt: y,
    remindedBefore: sliced.some(({ payload: payload }) => {
      let attachment = payload.attachment,
        G =
          isPlainObject_4(attachment) && attachment.type === "critical_system_reminder"
            ? attachment.content
            : void 0;
      return typeof G === "string" && G.startsWith(DISK_TRANSCRIPT_LAG_PREFIX);
    }),
  };
}
//@ chunk-e6aww6q8.js:221757-222475 placement
function describeDiskTranscriptLag(e, n) {
  let parse = Date.parse(e.oldestToolRowAt ?? ""),
    s =
      parse <= n
        ? ` The oldest call or result that the disk's copy lacked is from ${new Date(parse).toISOString().slice(0, 16).replace("T", " ")} UTC, about ${formatDurationCoarse(n - parse)} before this session resumed.`
        : "",
    h = e.remindedBefore
      ? " The disk has been behind like this before in this conversation. Changes that you make on this disk may be lost again. Tell the user this."
      : "";
  return `${DISK_TRANSCRIPT_LAG_PREFIX} ${e.toolCalls} of your recent tool calls, so the disk may be older than the conversation.${s} Files that those calls created or changed may be missing or out of date, and installed packages may be gone. Check the files that you need before you rely on them, and tell the user if work was lost.${h}`;
}
/**
 * 按转录消息顺序把文件历史快照与增量合成快照列表：同一消息的更新替换、增量合并或合成新快照，只保留最近若干个，被裁掉的部分折叠为基准状态。
 */
//@ chunk-e6aww6q8.js:222475-223602 placement
function buildFileHistorySnapshots(e, n, r) {
  let ops = [],
    indexByMessageId = new Map(),
    nextIndex = 0;
  for (let q of r) {
    let Z = e.get(q.uuid);
    if (Z) {
      let { snapshot: snapshot, isSnapshotUpdate: isSnapshotUpdate } = Z,
        we = isSnapshotUpdate ? indexByMessageId.get(snapshot.messageId) : void 0;
      if (we === void 0)
        (indexByMessageId.set(snapshot.messageId, nextIndex),
          ops.push({ kind: "append", index: nextIndex++, snapshot: snapshot }));
      else ops.push({ kind: "replace", index: we, snapshot: snapshot });
    }
    for (let Se of n.get(q.uuid) ?? []) {
      let ke = indexByMessageId.get(Se.snapshotMessageId);
      if (ke === void 0)
        (indexByMessageId.set(Se.snapshotMessageId, nextIndex),
          ops.push({ kind: "synthesize", index: nextIndex++, delta: Se }));
      else ops.push({ kind: "merge", index: ke, delta: Se });
    }
  }
  let max = Math.max(0, nextIndex - WDn),
    snapshots = [],
    ownedIndexes = new Set(),
    baseState;
  for (let q of ops) {
    if (q.index < max) {
      baseState = foldSnapshotBase(baseState, q);
      continue;
    }
    let Z = q.index - max;
    switch (q.kind) {
      case "append":
        snapshots.push(q.snapshot);
        break;
      case "replace":
        ((snapshots[Z] = q.snapshot), ownedIndexes.delete(Z));
        break;
      case "synthesize":
        (ownedIndexes.add(Z),
          snapshots.push({
            messageId: q.delta.snapshotMessageId,
            trackedFileBackups: {
              ...(Z > 0 ? snapshots[Z - 1].trackedFileBackups : baseState?.trackedFileBackups),
              [q.delta.trackingPath]: q.delta.backup,
            },
            timestamp: new Date(q.delta.timestamp),
          }));
        break;
      case "merge": {
        let Se = snapshots[Z];
        if (!ownedIndexes.has(Z))
          ((Se = { ...Se, trackedFileBackups: { ...Se.trackedFileBackups } }),
            (snapshots[Z] = Se),
            ownedIndexes.add(Z));
        defineOwnProperty(Se.trackedFileBackups, q.delta.trackingPath, q.delta.backup);
        break;
      }
    }
  }
  return snapshots;
}
/**
 * 把被裁掉的文件历史快照操作折叠进基准状态（追加/替换取快照，合成/合并累加增量）。
 */
//@ chunk-e6aww6q8.js:223602-224004 placement
function foldSnapshotBase(e, n) {
  if ((n.kind === "replace" || n.kind === "merge") && n.index !== e?.index) return e;
  switch (n.kind) {
    case "append":
    case "replace":
      return { index: n.index, trackedFileBackups: n.snapshot.trackedFileBackups, owned: !1 };
    case "synthesize":
    case "merge": {
      let r = e?.owned ? e.trackedFileBackups : { ...e?.trackedFileBackups };
      return (
        defineOwnProperty(r, n.delta.trackingPath, n.delta.backup),
        { index: n.index, trackedFileBackups: r, owned: !0 }
      );
    }
  }
}
//@ chunk-e6aww6q8.js:338564-338771 placement
class TranscriptWriterHealth {
  failuresByFile = new Map();
  failureSeq = 0;
  abandonedPaths = new Set();
  abandonedPrefixes = new Set();
  abandonedPendingPaths = new Set();
  latchingEnabled = !0;
  firstWriteOkEmitted = !1;
  liveServing = null;
  degradedStore = createStore(null);
}
//@ chunk-e6aww6q8.js:338771-338796 placement
var ZPt = new SessionRootSlot(() => ({}));
//@ chunk-e6aww6q8.js:338796-338831 placement
function eMt(e) {
  ZPt.of(getRootSession()).port = e;
}
//@ chunk-e6aww6q8.js:338831-338873 placement
function sfn() {
  return ZPt.peek(getRootSession())?.port;
}
/**
 * 会话存储常量：CLI 版本、各种大小上限、合成用户文本（中断提示、标签开头）的正则。
 */
//@ chunk-e6aww6q8.js:338873-340008 layout
var CLI_VERSION =
    typeof {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.316",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-10-30T23:28:13Z",
      GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    } < "u"
      ? {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.316",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-10-30T23:28:13Z",
          GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.VERSION
      : "unknown",
  KHe = 52428800,
  mpo = 2000000,
  gpo = 52428800,
  hpo = 4096,
  aMt = 1048576,
  ypo = 4194304,
  SYNTHETIC_USER_TEXT_PATTERN = /^(?:\s*<[a-z][\w-]*[\s>]|\[Request interrupted by user[^\]]*\])/;
/**
 * 是否为转录消息类型（user/assistant/attachment/system，排除 fork_briefing 附件）。
 */
//@ chunk-e6aww6q8.js:340008-340037 facade-majority
function isTranscriptMessage(e) {
  return isTranscriptMessage_3(e);
}
//@ chunk-e6aww6q8.js:340037-340075 layout
function VHe(e) {
  return isCompactBoundaryOrSummary(e) || tBe(e);
}
//@ chunk-e6aww6q8.js:340075-340113 layout
function tBe(e) {
  return cOt(e) || _po(e);
}
//@ chunk-e6aww6q8.js:340113-340202 layout
function cOt(e) {
  return e.type === "attachment" && e.attachment?.type === "projects_thread_ask";
}
//@ chunk-e6aww6q8.js:340202-340290 layout
function _po(e) {
  return e.type === "attachment" && e.attachment?.type === "session_cron_carry";
}
//@ chunk-e6aww6q8.js:340290-340400 facade-majority = isLegacyProgressEntry (0.8)
function isSyncedTranscriptEntry(entry) {
  return (
    typeof entry === "object" &&
    entry !== null &&
    "type" in entry &&
    "uuid" in entry &&
    typeof entry.uuid === "string" &&
    isTranscriptMessage(entry)
  );
}
//@ chunk-e6aww6q8.js:340400-340428 layout
function isPlainObject_2(e) {
  return isPlainObject_4(e);
}
/**
 * 记录类型写入策略表：user/assistant/attachment/system/progress 为 dedup-transcript（按 uuid 去重，子代理写入自己的转录）；summary、custom-title、tag、last-prompt、file-history-snapshot 等元数据为 always；content-replacement、api-request*、fork-context-ref、observer-ref 为 route-by-agent（有 agentId 时写入子代理文件）。
 */
//@ chunk-e6aww6q8.js:340428-341559 facade-majority
var ENTRY_APPEND_POLICY = {
    user: "dedup-transcript",
    assistant: "dedup-transcript",
    attachment: "dedup-transcript",
    system: "dedup-transcript",
    progress: "dedup-transcript",
    summary: "always",
    "custom-title": "always",
    "ended-by-model": "always",
    "continued-in": "always",
    "ai-title": "always",
    "last-prompt": "always",
    tag: "always",
    relocated: "always",
    "agent-name": "always",
    "agent-color": "always",
    "agent-setting": "always",
    "pr-link": "always",
    "frame-link": "always",
    "artifact-comment-monitor": "always",
    "artifact-autoreact-ledger": "always",
    "bridge-session": "always",
    "history-suppression": "always",
    "file-history-snapshot": "always",
    "file-history-delta": "always",
    "attribution-snapshot": "always",
    mode: "always",
    "permission-mode": "always",
    "isolation-latch": "always",
    "dev-mods": "always",
    "memory-mode": "always",
    "atis-latch": "always",
    "tools-used": "always",
    "worktree-state": "always",
    "cost-state": "always",
    "queue-operation": "always",
    "content-replacement": "route-by-agent",
    "api-request-shape": "route-by-agent",
    "api-request-blob": "route-by-agent",
    "api-request": "route-by-agent",
    "fork-context-ref": "route-by-agent",
    "observer-ref": "route-by-agent",
  },
  COMPACT_MIN_FILE_BYTES = 5242880,
  LG = 20971520,
  Spo = 8 * LG,
  kpo = 0.1;
//@ chunk-e6aww6q8.js:341559-341607 layout
function forceGcIfBun(e) {
  if (e && typeof Bun < "u") Bun.gc(!0);
}
//@ chunk-e6aww6q8.js:341607-341640 layout
function isLowYieldCompaction(e, n) {
  return n < e * kpo;
}
//@ chunk-e6aww6q8.js:341640-341690 facade-majority
function setLowYieldCompactSkipForTesting(e) {
  su().lowYieldCompactSkipEnabled = e;
}
//@ chunk-e6aww6q8.js:341690-341732 facade-majority
function setTranscriptLocalGcEnabled(e) {
  su().setLocalGcEnabled(e);
}
//@ chunk-e6aww6q8.js:341732-341782 facade-majority
function setToolResultCopiesOnDisk(e) {
  su().setToolResultCopiesOnDisk(e);
}
//@ chunk-e6aww6q8.js:341782-341830 facade-majority
function getSessionRowsOffDisk() {
  return getProject().sessionRowsOffDisk();
}
//@ chunk-e6aww6q8.js:341830-341882 facade-majority
function setKeepSessionMessagesCache(e) {
  su().setKeepSessionMessagesCache(e);
}
//@ chunk-e6aww6q8.js:341882-341924 facade-majority = countUnseenAssistantTurns (1)
function isChainParticipant(e) {
  return e.type !== "progress";
}
//@ chunk-e6aww6q8.js:341924-342084 facade-majority
function transcriptCursorEnd(e, n, r) {
  if (!r) return e.length;
  for (let s = n; s < e.length; s++) {
    let h = e[s];
    if (h.type === "assistant" && h.message.stop_reason === null) return s;
  }
  return e.length;
}
//@ chunk-e6aww6q8.js:342084-342203 layout
function logLegacyProgressProbe(e) {
  if (!su().claimLegacyProgressProbe(e)) return;
  logEvent("tengu_dead_probe_legacy_progress_bridge", { signal: fromEnum(e) });
}
//@ chunk-e6aww6q8.js:342203-342327 fingerprint = isLegacyProgressEntry (1)
function isLegacyProgressEntry(entry) {
  return (
    typeof entry === "object" &&
    entry !== null &&
    "type" in entry &&
    entry.type === "progress" &&
    "uuid" in entry &&
    typeof entry.uuid === "string"
  );
}
//@ chunk-e6aww6q8.js:342327-342471 fingerprint = EPHEMERAL_PROGRESS_TYPES (0.656)
var EPHEMERAL_PROGRESS_TYPES = new Set([
  "bash_progress",
  "powershell_progress",
  "mcp_progress",
  ...[],
  "tool_heartbeat",
  "agent_api_retry",
  "artifact_publish_retry",
  ...[],
]);
//@ chunk-e6aww6q8.js:342471-342532 facade-majority
function isEphemeralToolProgress(dataType) {
  return typeof dataType === "string" && (EPHEMERAL_PROGRESS_TYPES.has(dataType) || !1);
}
//@ chunk-e6aww6q8.js:342532-342589 facade-majority
function getMaterializedSessionFile() {
  return su().project?.sessionFilePath ?? null;
}
//@ chunk-e6aww6q8.js:342589-342616 facade-majority
function locateMaterializedSessionFile() {
  return getMaterializedSessionFile();
}
//@ chunk-e6aww6q8.js:342616-342650 facade-majority
function hasMaterializedSessionFile() {
  return getMaterializedSessionFile() !== null;
}
//@ chunk-e6aww6q8.js:342650-342720 facade-majority
function hasRecordedUserPrompt() {
  return su().project?.currentSessionLastPrompt !== void 0;
}
/**
 * 某会话的转录路径：当前会话返回已绑定的会话文件，否则 <当前项目目录>/<sessionId>.jsonl。
 */
//@ chunk-e6aww6q8.js:342720-342802 facade-majority = getErrorsPath (1)
function getTranscriptPathForSession(e) {
  if (e === getSessionId()) return getMaterializedSessionFile() ?? getTranscriptPath();
  let n = resolveProjectDir();
  return join_3(n, `${e}.jsonl`);
}
//@ chunk-e6aww6q8.js:342802-342831 facade-majority
function locateTranscriptForSession(e) {
  return getTranscriptPathForSession(e);
}
//@ chunk-e6aww6q8.js:342831-342881 facade-majority
var MAX_TRANSCRIPT_READ_BYTES = 52428800,
  INDEX_HEAD_SCAN_BYTES = 256,
  INDEX_BOUNDARY_SCAN_BYTES = 4096,
  INDEX_LAST_PROMPT_SCAN_BYTES = 1024,
  LAST_PROMPT_PREFIX_SCAN_BYTES = 64;
//@ chunk-e6aww6q8.js:342881-342943 facade-majority = getAgentMetadataPath (1)
function getAgentMetadataPath(agentId) {
  return getAgentTranscriptPath(agentId).replace(/\.jsonl$/, ".meta.json");
}
//@ chunk-e6aww6q8.js:342943-343074 facade-majority
var RESERVED_AGENT_METADATA_FIELDS = [
    "isObserver",
    "observerStopped",
    "observerTaskId",
    "armingPermissionMode",
    "revivedAt",
  ],
  fMt = [...RESERVED_AGENT_METADATA_FIELDS, "restartResumes", "model"];
//@ chunk-e6aww6q8.js:343074-343475 facade-majority = readAgentMetadata (0.393)
async function readAgentMetadataAtPath(e, n, r = isFsInaccessible) {
  if (isStorageV5Enabled() && n !== void 0) {
    let path = keyFromMetaPath(e);
    if (path !== void 0) {
      let read = await n.read([path]);
      if (!read.ok) throw Error("readAgentMetadataAtPath: storage read failed", { cause: read.error });
      let [S] = read.value.items;
      if (!S.found) return null;
      return jsonParse(Buffer.from(S.value).toString("utf-8"));
    }
  }
  let s = yH(e);
  if (s === void 0) return null;
  try {
    let raw = await readFile(s, "utf-8");
    return jsonParse(raw);
  } catch (error) {
    if (r(error)) return null;
    throw error;
  }
}
/**
 * 写子代理元数据侧车 agent-<id>.meta.json（agentType、observer 状态等），已有内容时合并。
 */
//@ chunk-e6aww6q8.js:343475-345781 layout
async function persistAgentMetadata(e, n, r, s, h = !1) {
  let y = n,
    all = RESERVED_AGENT_METADATA_FIELDS.every((Se) => n[Se] !== void 0),
    w = null;
  try {
    w = await readAgentMetadataAtPath(e, s);
  } catch (error) {
    if (!all || h) throw error;
  }
  if (w) {
    if (h) return;
    for (let Se of fMt) if (n[Se] === void 0 && w[Se] !== void 0) y = { ...y, [Se]: w[Se] };
    if (w.pluginSteered === !0) y = { ...y, pluginSteered: !0 };
  }
  let L = isStorageV5Enabled() && s !== void 0 ? keyFromMetaPath(e) : void 0;
  if (s !== void 0 && L !== void 0) {
    let write = await s.write(L, jsonStringify(y), { mode: 438 & ~process.umask() });
    if (!write.ok) throw Error("persistAgentMetadata: storage write failed", { cause: write.error });
  } else
    (assertDiskWritable("agent_metadata", e),
      await mkdir(dirname(e), { recursive: !0 }),
      await writeFileAtomic_2(e, jsonStringify(y)));
  let replaced = e.replace(/\.meta\.json$/, ".jsonl");
  getProject().fireMirror(replaced, [
    {
      type: "agent_metadata",
      agentType: y.agentType,
      ...(y.isFork !== void 0 && { isFork: y.isFork }),
      ...(y.isBuiltIn !== void 0 && { isBuiltIn: y.isBuiltIn }),
      ...(y.worktreePath && { worktreePath: y.worktreePath }),
      ...(y.worktreeBranch && { worktreeBranch: y.worktreeBranch }),
      ...(y.cwd && { cwd: y.cwd }),
      ...(y.spawnMode && { spawnMode: y.spawnMode }),
      ...(y.description && { description: y.description }),
      ...(y.workflowPhase && { workflowPhase: y.workflowPhase }),
      ...(y.name && { name: y.name }),
      ...(y.toolUseId && { toolUseId: y.toolUseId }),
      ...!1,
      ...(y.parentAgentId && { parentAgentId: y.parentAgentId }),
      ...(y.stoppedByUser && { stoppedByUser: !0 }),
      ...(y.finished && { finished: !0 }),
      ...(y.spawnDepth !== void 0 && { spawnDepth: y.spawnDepth }),
      ...(y.requestShape && { requestShape: y.requestShape }),
      ...(y.requestNonInteractive !== void 0 && { requestNonInteractive: y.requestNonInteractive }),
      ...(y.taskKind && { taskKind: y.taskKind }),
      ...(y.teamName && { teamName: y.teamName }),
      ...(y.color && { color: y.color }),
      ...(y.planModeRequired !== void 0 && { planModeRequired: y.planModeRequired }),
      ...(y.customAgentType && { customAgentType: y.customAgentType }),
      ...(y.spawnedAgentType && { spawnedAgentType: y.spawnedAgentType }),
      ...(y.effort && { effort: y.effort }),
      ...(y.permissionMode && { permissionMode: y.permissionMode }),
      ...(y.launchedWithDefaults === !0 && { launchedWithDefaults: !0 }),
      ...Object.fromEntries(fMt.filter((Se) => y[Se] !== void 0).map((Se) => [Se, y[Se]])),
      ...(y.pluginSteered === !0 && { pluginSteered: !0 }),
    },
  ]);
  let q = getProject(),
    Z = /^agent-(.+)\.meta\.json$/.exec(basename_2(e))?.[1];
  if (Z !== void 0 && !h && q.keepsAgentMetadataInStream())
    q.mirrorWorkerEvent(
      "agent_metadata",
      { ...y, type: "agent_metadata" },
      { sessionId: r, agentId: Z },
    ).then(
      (Se) => {
        if (Se) logFeatureOk("subagent_sidecar_to_stream");
        else logFeatureSad("subagent_sidecar_to_stream", "withheld");
      },
      (Se) => {
        (logFeatureBad("subagent_sidecar_to_stream", "send_failed"), logError(Se));
      },
    );
}
//@ chunk-e6aww6q8.js:345781-345866 facade-majority
async function writeAgentMetadata(e, n, r, s = !1) {
  let h = pinSessionId(getSessionId()),
    y = getAgentMetadataPath(e);
  await runWithFileWriteContext(y, () => persistAgentMetadata(y, n, h, r, s));
}
//@ chunk-e6aww6q8.js:345866-345947 facade-majority
async function updateAgentMetadata(e, n, r, s) {
  let h = pinSessionId(getSessionId()),
    y = getAgentMetadataPath(e);
  await runWithFileWriteContext(y, () => mergeAgentMetadataUnderLock(y, n, h, r, s));
}
//@ chunk-e6aww6q8.js:345947-346187 facade-majority
async function mergeAgentMetadataUnderLock(e, n, r, s, h, y) {
  let S = (await readAgentMetadataAtPath(e, s, h)) ?? y;
  if (!S && n.agentType === void 0)
    return (
      logForDebugging(
        `[updateAgentMetadata] dropped patch for ${e}: no existing sidecar and patch lacks agentType`,
      ),
      !1
    );
  let w = { ...S, ...n };
  return (await persistAgentMetadata(e, w, r, s), !0);
}
//@ chunk-e6aww6q8.js:346187-346250 layout
function canPersistAgentMetadata(e, n) {
  return !isDiskless() || (isStorageV5Enabled() && n !== void 0 && keyFromMetaPath(e) !== void 0);
}
//@ chunk-e6aww6q8.js:346250-346497 facade-majority
function landAgentStop(e, n, r, s, h) {
  return (async () => {
    let y = pinSessionId(getSessionId()),
      S = getAgentMetadataPath(e);
    if (!canPersistAgentMetadata(S, s)) {
      (logForDebugging(`[agent stop] ${n} not kept for ${e}: diskless, and no store for its sidecar`),
        warnDisklessSettingsWrite("agent_metadata", S));
      return;
    }
    await persistSubagentStop(S, n, r, () => mergeAgentMetadataUnderLock(S, { [n]: !0 }, y, s), s, h);
  })().catch(logError);
}
//@ chunk-e6aww6q8.js:346497-346646 facade-majority
function landStoppedByUser(e, n, r) {
  return landAgentStop(
    e,
    "stoppedByUser",
    async () => {
      let s = pinSessionId(getSessionId()),
        h = getAgentMetadataPath(e);
      await runWithFileWriteContext(h, () =>
        mergeAgentMetadataUnderLock(h, { stoppedByUser: !0 }, s, r, isPathAbsent, { agentType: n }),
      );
    },
    r,
  );
}
//@ chunk-e6aww6q8.js:346646-346695 facade-majority
async function hasAgentStopSibling(e, n, r) {
  return ARt(getAgentMetadataPath(e), n, r);
}
//@ chunk-e6aww6q8.js:346695-346743 facade-majority
async function clearAgentStopSibling(e, n, r) {
  await setAgentTranscriptSubdir_2(getAgentMetadataPath(e), n, r);
}
//@ chunk-e6aww6q8.js:346743-346791 facade-majority
async function readAgentMetadata(e, n, r) {
  return readAgentMetadataAtPath(getAgentMetadataPath(e), n, r);
}
//@ chunk-e6aww6q8.js:346791-347245 layout
var REMOTE_TASK_ID_PATTERN = /^r[0-9a-z]{8}$/,
  vpo = /^(?!\.\.?$)[^\\/?#%\x00-\x20\x7f]+$/,
  yOt = DoctorLazy(() =>
    create({
      taskId: create_2().regex(REMOTE_TASK_ID_PATTERN),
      remoteTaskType: create_2(),
      sessionId: create_2().regex(vpo),
      title: create_2(),
      command: create_2(),
      spawnedAt: create_3(),
      toolUseId: create_2().optional(),
      runId: create_2().optional(),
      isLongRunning: create_6().optional(),
      isUltraplan: create_6().optional(),
      isRemoteReview: create_6().optional(),
      applyFixesOnComplete: create_6().optional(),
      reviewInstructions: create_2().optional(),
      remoteTaskMetadata: create_20(create_12()).optional(),
    }).passthrough(),
  );
//@ chunk-e6aww6q8.js:347245-347304 fingerprint = getRemoteAgentsDir (1)
function getRemoteAgentsDir() {
  let e = resolveSessionProjectDir();
  return join_3(e, getSessionId(), "remote-agents");
}
//@ chunk-e6aww6q8.js:347304-347367 fingerprint = getRemoteAgentMetadataPath (1)
function getRemoteAgentMetadataPath(taskId) {
  return join_3(getRemoteAgentsDir(), `remote-agent-${taskId}.meta.json`);
}
//@ chunk-e6aww6q8.js:347367-347694 facade-majority = writeRemoteAgentMetadata (0.137)
async function writeRemoteAgentMetadata(e, n, r) {
  let path = getRemoteAgentMetadataPath(e);
  if (!isDiskless()) await mkdir(dirname(path), { recursive: !0 });
  if (isStorageV5Enabled() && r !== void 0) {
    let h = keyFromMetaPath(path);
    if (h !== void 0) {
      let write = await r.write(h, jsonStringify(n), { publishDiscipline: "inPlace" });
      if (!write.ok) throw Error("writeRemoteAgentMetadata: storage write failed", { cause: write.error });
      return;
    }
  }
  (assertDiskWritable("remote_agent_metadata", path), await writeFile(path, jsonStringify(n)));
}
//@ chunk-e6aww6q8.js:347694-347984 facade-majority
async function deleteRemoteAgentMetadata(e, n) {
  let r = getRemoteAgentMetadataPath(e);
  if (isStorageV5Enabled() && n !== void 0) {
    let h = keyFromMetaPath(r);
    if (h !== void 0) {
      let y = await n.delete(h);
      if (!y.ok) throw Error("deleteRemoteAgentMetadata: storage delete failed", { cause: y.error });
      return;
    }
  }
  let s = yH(r);
  if (s === void 0) return;
  try {
    await unlink(s);
  } catch (error) {
    if (isFsInaccessible(error)) return;
    throw error;
  }
}
/**
 * 删除远程代理任务的本地元数据（失败只记日志）。
 */
//@ chunk-e6aww6q8.js:347984-348089 facade-majority = removeRemoteAgentMetadata (1)
async function removeRemoteAgentMetadata(taskId, storageV5) {
  try {
    await deleteRemoteAgentMetadata(taskId, storageV5);
  } catch (error) {
    logForDebugging(`removeRemoteAgentMetadata failed: ${String(error)}`);
  }
}
//@ chunk-e6aww6q8.js:348089-348779 facade-majority = listRemoteAgentMetadata (0.645)
async function listRemoteAgentMetadata(e) {
  let dir = getRemoteAgentsDir();
  if (isStorageV5Enabled() && e !== void 0) {
    let y = keyFromMetaPath(join_3(dir, "probe.meta.json"));
    if (y !== void 0 && y.namespace === "sidecar")
      return listRemoteAgentMetadataViaStorage(e, {
        namespace: "sidecar",
        projectKey: y.projectKey,
        sessionId: y.sessionId,
        relPath: y.relPath.slice(0, -1),
      });
  }
  let r = yH(dir);
  if (r === void 0) return [];
  let entries;
  try {
    entries = await readdir(r, { withFileTypes: !0 });
  } catch (error) {
    if (isFsInaccessible(error)) return [];
    throw error;
  }
  let results = [];
  for (let entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".meta.json")) continue;
    try {
      let raw = await readFile(join_3(r, entry.name), "utf-8"),
        safeParse = yOt().safeParse(jsonParse(raw));
      if (!safeParse.success) {
        logForDebugging(`listRemoteAgentMetadata: skipping ${entry.name}: ${String(safeParse.error)}`);
        continue;
      }
      results.push(safeParse.data);
    } catch (error) {
      logForDebugging(`listRemoteAgentMetadata: skipping ${entry.name}: ${String(error)}`);
    }
  }
  return results;
}
//@ chunk-e6aww6q8.js:348779-349705 layout
async function listRemoteAgentMetadataViaStorage(e, n) {
  let r = [],
    s = await readAllPages(
      (S) => e.listEntries(n, { skipKeyStats: !0, skipScopeStats: !0, ...(S !== void 0 && { cursor: S }) }),
      (S) => {
        for (let w of S)
          if (
            w.kind === "key" &&
            w.key.namespace === "sidecar" &&
            w.key.relPath.length === n.relPath.length + 1 &&
            w.key.relPath[n.relPath.length].endsWith(".meta.json")
          )
            r.push(w.key);
      },
    );
  if (s.status !== "done") {
    if (s.status === "error")
      logForDebugging(
        `listRemoteAgentMetadata: listing failed via storage (${s.error.code}) \u2014 empty restore`,
      );
    return [];
  }
  if (r.length === 0) return [];
  let text = await e.readText(r);
  if (!text.ok)
    return (
      logForDebugging(
        `listRemoteAgentMetadata: read failed via storage (${text.error.code}) \u2014 empty restore`,
      ),
      []
    );
  let y = [];
  return (
    text.value.items.forEach((item, w) => {
      let at = r[w].relPath.at(-1);
      if (!item.found) return;
      try {
        let safeParse = yOt().safeParse(jsonParse(item.value));
        if (!safeParse.success) {
          logForDebugging(`listRemoteAgentMetadata: skipping ${at}: ${String(safeParse.error)}`);
          return;
        }
        y.push(safeParse.data);
      } catch (error) {
        logForDebugging(`listRemoteAgentMetadata: skipping ${at}: ${String(error)}`);
      }
    }),
    y
  );
}
/**
 * 当前项目目录下是否存在 <sessionId>.jsonl。
 */
//@ chunk-e6aww6q8.js:349705-349820 facade-majority = sessionIdExists (1)
function sessionIdExists(sessionId) {
  if (isDiskless()) return !1;
  let n = resolveSessionProjectDir(),
    sessionFile = join_3(n, `${sessionId}.jsonl`),
    fs = getFsImplementation();
  try {
    return (fs.statSync(sessionFile), !0);
  } catch {
    return !1;
  }
}
//@ chunk-e6aww6q8.js:349820-349854 facade-majority = getEnvironmentForGrowthBook (1)
function getNodeEnv() {
  return "production";
}
//@ chunk-e6aww6q8.js:349854-349888 facade-majority
function isTranscriptPersistenceDisabled() {
  return getPersistenceSuppressionCause() !== null;
}
//@ chunk-e6aww6q8.js:349888-350115 facade-majority
function getPersistenceSuppressionCause() {
  if (getNodeEnv() === "test" && !env.TEST_ENABLE_SESSION_PERSISTENCE) return "test_env";
  if (isSessionPersistenceDisabled()) return "explicit_disable";
  if (env.CLAUDE_CODE_SKIP_PROMPT_HISTORY) return "skip_prompt_history";
  if (isNestedInteractiveClaudeSession()) return "nested_marker";
  return null;
}
//@ chunk-e6aww6q8.js:350115-350229 facade-majority
function transcriptStamp(e) {
  return {
    sessionKind: envSessionKind(),
    userType: getUserType(),
    entrypoint: hBe(),
    cwd: gl() ?? void 0,
    sessionId: e,
    version: CLI_VERSION,
  };
}
//@ chunk-e6aww6q8.js:350229-350311 layout
function TOt(e) {
  return "version" in e && typeof e.version === "string" ? e.version : void 0;
}
//@ chunk-e6aww6q8.js:350311-350371 layout
function vOt(e) {
  return TOt(e) ?? ("sessionId" in e ? void 0 : CLI_VERSION);
}
//@ chunk-e6aww6q8.js:350371-350415 facade-majority
function withVersionToRecord(e) {
  return { ...e, version: vOt(e) };
}
//@ chunk-e6aww6q8.js:350415-350447 facade-majority
function getUserType() {
  return "external";
}
//@ chunk-e6aww6q8.js:350447-350504 layout
function hBe() {
  return process.env.CLAUDE_CODE_ENTRYPOINT;
}
//@ chunk-e6aww6q8.js:350504-350646 layout
async function transcriptContextFields() {
  let e = hBe();
  return {
    cwd: gl() ?? void 0,
    gitBranch: await getBranch().catch(() => {
      return;
    }),
    entrypoint: e !== void 0 && PROGRAMMATIC_ENTRYPOINTS.has(e) ? void 0 : e,
  };
}
//@ chunk-e6aww6q8.js:350646-350670 facade-majority
function isCustomTitleEnabled() {
  return !0;
}
//@ chunk-e6aww6q8.js:350670-350697 layout
var yBe = ".session-aliases";
//@ chunk-e6aww6q8.js:350697-350904 layout
function sessionAliasStorageTarget(e, n) {
  if (!isStorageV5Enabled() || n === void 0 || dirname(e) !== getProjectsDir_2()) return;
  let r = basename_2(e),
    sessionAliases = STORAGE_SPACES.sessionAliases(r),
    h = { namespace: "transcript", projectKey: r };
  return validateStorageKey(sessionAliases) === void 0 && validateStorageScope(h) === void 0
    ? { backend: n, key: sessionAliases, folder: h }
    : void 0;
}
/**
 * 经存储后端把会话别名追加到别名记录（已存在则跳过）；目录不存在时先建作用域再重试，失败只记日志。
 */
//@ chunk-e6aww6q8.js:350904-351398 layout
async function appendSessionAliasViaStorage(e, n, r) {
  let s = () =>
      e.backend.updateText(
        e.key,
        (y) =>
          y !== void 0 &&
          y.value
            .split(
              `
`,
            )
            .includes(n)
            ? { skip: !0 }
            : {
                write:
                  (y?.value ?? "") +
                  n +
                  `
`,
              },
        { publishDiscipline: "inPlace", mode: 384 },
      ),
    h = await s();
  if (!h.ok && wft(h.error)) {
    let ensureScope = await e.backend.ensureScope(e.folder);
    if (!ensureScope.ok) {
      let S = transcriptMkdirFailedError(ensureScope.error);
      if (isFsInaccessible(S)) {
        logForDebugging(`recordSessionAlias: mkdir failed for ${join_3(r, yBe)}: ${S}`);
        return;
      }
      logError(S);
      return;
    }
    h = await s();
  }
  if (!h.ok)
    logForDebugging(`recordSessionAlias: update failed via storage (${formatStorageError(h.error)})`, {
      level: "error",
    });
}
//@ chunk-e6aww6q8.js:351398-352397 facade-majority
async function recordSessionAlias(e, n) {
  if (isTranscriptPersistenceDisabled()) return;
  let r = e;
  try {
    if (isStorageV5Enabled() && n !== void 0) {
      let w = await makeWorkspaceRealPath(n)(e);
      if (w.ok && w.value.found) r = Mn(w.value.path);
      else if (!w.ok)
        logForDebugging(`recordSessionAlias: realpath failed for ${e}: ${formatStorageError(w.error)}`, {
          level: kDt(w.error) ? "debug" : "error",
        });
    } else if (!isDiskless()) r = Mn(await realpath(e));
  } catch (error) {
    if (!isENOENT(error))
      logForDebugging(`recordSessionAlias: realpath failed for ${e}: ${error}`, { level: "error" });
  }
  let s = resolveSessionProjectDir(),
    h = getProjectDir_2(r);
  if (h === s) return;
  let y = sessionAliasStorageTarget(h, n);
  if (y !== void 0) {
    try {
      await appendSessionAliasViaStorage(y, s, h);
    } catch (error) {
      logForDebugging(`recordSessionAlias: update threw via storage: ${error}`);
    }
    return;
  }
  let S = join_3(h, yBe);
  if (isDiskless()) {
    warnDisklessSettingsWrite("session_alias", S);
    return;
  }
  try {
    if (
      (await readFile(S, "utf8"))
        .split(
          `
`,
        )
        .includes(s)
    )
      return;
  } catch (error) {
    if (!isENOENT(error)) {
      if (isFsInaccessible(error)) {
        logForDebugging(`recordSessionAlias: read failed for ${S}: ${error}`);
        return;
      }
      logError(error);
      return;
    }
    try {
      await mkdir(dirname(S), { recursive: !0, mode: 448 });
    } catch (error) {
      if (isFsInaccessible(error)) {
        logForDebugging(`recordSessionAlias: mkdir failed for ${S}: ${error}`);
        return;
      }
      logError(error);
      return;
    }
  }
  try {
    await appendFile(
      S,
      s +
        `
`,
      { mode: 384 },
    );
  } catch (error) {
    if (isFsInaccessible(error)) {
      logForDebugging(`recordSessionAlias: append failed for ${S}: ${error}`);
      return;
    }
    logError(error);
  }
}
/**
 * 读取项目目录下的会话别名列表：优先经存储后端，否则读本地文件，去重并忽略空行；读失败返回空列表。
 */
//@ chunk-e6aww6q8.js:352397-352965 layout
async function readSessionAliases(e, n) {
  let storageTarget = sessionAliasStorageTarget(getProjectDir_2(e), n);
  if (storageTarget !== void 0)
    try {
      let text = await storageTarget.backend.readText([storageTarget.key]);
      if (!text.ok)
        return (
          logForDebugging(`readSessionAliases: read failed via storage (${formatStorageError(text.error)})`),
          []
        );
      let y = text.value.items[0];
      return y.found
        ? uniq(
            y.value
              .split(
                `
`,
              )
              .filter((S) => S.length > 0),
          )
        : [];
    } catch (error) {
      return (logForDebugging(`readSessionAliases: read threw via storage: ${error}`), []);
    }
  let aliasesPath = yH(join_3(getProjectDir_2(e), yBe));
  if (aliasesPath === void 0) return [];
  try {
    let h = await readFile(aliasesPath, "utf8");
    return uniq(
      h
        .split(
          `
`,
        )
        .filter((y) => y.length > 0),
    );
  } catch (error) {
    if (!isENOENT(error))
      if (isFsInaccessible(error))
        logForDebugging(`readSessionAliases: read failed for ${aliasesPath}: ${error}`);
      else logError(error);
    return [];
  }
}
/**
 * 会话转录存储的进程级状态：当前 Project、写入健康、退出重盖章、本地清理开关、工具结果副本方式、会话消息 uuid 缓存（含无文件恢复的预置）、迁移期间暂存的追加，以及各种信号。
 */
//@ chunk-e6aww6q8.js:352965-355234 layout
class TranscriptStore {
  getSessionId;
  project = null;
  exitReStampRan = !1;
  localGcEnabled = !1;
  lowYieldCompactSkipEnabled = !0;
  toolResultCopiesOnDisk = "whole";
  slimAppendedRow = void 0;
  keepSessionMessagesCache = !1;
  hasFailedWrite = !1;
  forkContextHydrationCache = new Map();
  forkContextHydrationsInFlight = new Map();
  warnedUnchainedSessions = new Set();
  legacyProgressProbeFired = new Set();
  relocationParkedAppends = null;
  relocationParkedPath = null;
  liveSuppressionProbe = void 0;
  writerHealth = new TranscriptWriterHealth();
  exitReStampProviders = new Set();
  foreignExitReStampProviders = new Set();
  takenForeignExitLines = new Set();
  replaySeedStarts = new Map();
  exitDrains = new Set();
  sessionAgentNameChanged = createSignal();
  sessionTitleChanged = createSignal();
  sessionFileMaterialized = createSignal();
  filelessResumeUuids = void 0;
  sessionMessages = io(
    async (e, n) => {
      let r = [];
      try {
        let { messages: messages } = await loadSessionTranscript(
          e,
          e === this.getSessionId() ? void 0 : this.project?.recordedSessionFile(e),
          n,
        );
        r = messages.keys();
      } catch (error) {
        logForDebugging(
          `getSessionMessages: loadSessionFile failed: ${error instanceof Error ? error.message : String(error)}`,
          { level: "error" },
        );
      }
      let filelessResumeUuids = this.filelessResumeUuids,
        h = new Set(filelessResumeUuids?.sessionId === e ? filelessResumeUuids.uuids : void 0);
      for (let y of r) h.add(y);
      return h;
    },
    (e) => e,
  );
  constructor(e) {
    this.getSessionId = e;
  }
  setLocalGcEnabled(e) {
    this.localGcEnabled = e;
  }
  setKeepSessionMessagesCache(e) {
    this.keepSessionMessagesCache = e;
  }
  setToolResultCopiesOnDisk(e) {
    ((this.toolResultCopiesOnDisk = e),
      (this.slimAppendedRow = e === "slim" ? createToolResultSlimmer_2() : void 0));
  }
  claimExitReStamp() {
    if (this.exitReStampRan) return !1;
    return ((this.exitReStampRan = !0), !0);
  }
  exitReStampDone() {
    return this.exitReStampRan;
  }
  claimLegacyProgressProbe(e) {
    if (this.legacyProgressProbeFired.has(e)) return !1;
    return (this.legacyProgressProbeFired.add(e), !0);
  }
  openAppendRelocationBracket(e) {
    ((this.relocationParkedAppends ??= []), (this.relocationParkedPath = e));
  }
  closeAppendRelocationBracket() {
    let relocationParkedAppends = this.relocationParkedAppends;
    return (
      (this.relocationParkedAppends = null),
      (this.relocationParkedPath = null),
      relocationParkedAppends
    );
  }
  setLiveSuppressionProbe(e) {
    this.liveSuppressionProbe = e;
  }
  clearSessionMessagesCache() {
    if (this.keepSessionMessagesCache) return;
    this.sessionMessages.cache.clear?.();
  }
  primeSessionMessagesCache(e, n) {
    let cache = this.sessionMessages.cache,
      s = cache.get(e);
    if (s === void 0) {
      cache.set(e, Promise.resolve(new Set(n)));
      return;
    }
    s.then((h) => {
      for (let y of n) h.add(y);
    });
  }
  primeFilelessResume(e, n) {
    let r = new Set(n);
    ((this.filelessResumeUuids = { sessionId: e, uuids: r }), this.primeSessionMessagesCache(e, r));
  }
}
//@ chunk-e6aww6q8.js:355234-355283 facade-majority
var transcriptStores = new SessionRootSlot(() => ({ current: new TranscriptStore(() => getSessionId()) }));
//@ chunk-e6aww6q8.js:355283-355324 layout
function su() {
  return transcriptStores.of(getRootSession()).current;
}
//@ chunk-e6aww6q8.js:355324-355411 layout
class COt {
  installed = !1;
  claim() {
    if (this.installed) return !1;
    return ((this.installed = !0), !0);
  }
}
//@ chunk-e6aww6q8.js:355411-355438 facade-majority
var transcriptExitHooksLatches = new HostScoped(() => new COt());
//@ chunk-e6aww6q8.js:355438-355478 facade-majority
function getTranscriptWriterHealth() {
  return su().writerHealth;
}
//@ chunk-e6aww6q8.js:355478-355528 facade-majority
function getTranscriptWriteFailureSeq() {
  return su().writerHealth.failureSeq;
}
//@ chunk-e6aww6q8.js:355528-355593 facade-majority
function getTranscriptWriterDegraded() {
  return su().writerHealth.degradedStore.getState();
}
//@ chunk-e6aww6q8.js:355593-356221 facade-majority
function reAppendSessionMetadataAtExit() {
  if (isDiagLogging() && !isInDiagScope()) return;
  if (isDiskless()) return;
  let e = su();
  if (!e.claimExitReStamp()) return;
  try {
    e.project?.reAppendSessionMetadata(!1, !1, !0);
  } catch {}
  let n = isStorageV5Enabled() && e.takenForeignExitLines.size > 0 ? e.takenForeignExitLines : void 0,
    r = n !== void 0 ? new Set() : void 0;
  for (let foreignExitReStampProvider of e.foreignExitReStampProviders)
    try {
      for (let { path: path, entry: entry, tornTailEntry: tornTailEntry } of foreignExitReStampProvider())
        try {
          (appendEntrySync(path, entry, tornTailEntry), r?.add(entryDedupKey(path, entry)));
        } catch {}
    } catch {}
  if (n !== void 0) {
    for (let { path: path, entry: entry, tornTailEntry: tornTailEntry } of n) {
      if (r?.has(entryDedupKey(path, entry)) === !0) continue;
      try {
        appendEntrySync(path, entry, tornTailEntry);
      } catch {}
    }
    n.clear();
  }
  for (let exitReStampProvider of e.exitReStampProviders)
    try {
      let h = exitReStampProvider();
      if (h !== void 0) e.project?.appendOwedEntryAtExit(h);
    } catch {}
}
//@ chunk-e6aww6q8.js:356221-356319 facade-majority
function registerTranscriptExitReStamp(e) {
  return (
    su().exitReStampProviders.add(e),
    () => {
      su().exitReStampProviders.delete(e);
    }
  );
}
//@ chunk-e6aww6q8.js:356319-356397 facade-majority
function registerTranscriptExitDrain(e) {
  return (
    su().exitDrains.add(e),
    () => {
      su().exitDrains.delete(e);
    }
  );
}
//@ chunk-e6aww6q8.js:356397-356509 facade-majority
function registerForeignTranscriptExitReStamp(e) {
  return (
    su().foreignExitReStampProviders.add(e),
    () => {
      su().foreignExitReStampProviders.delete(e);
    }
  );
}
//@ chunk-e6aww6q8.js:356509-356527 layout
var mMt = 500,
  Cpo = 3;
//@ chunk-e6aww6q8.js:356527-357248 facade-majority
async function flushSessionStorageAtExit() {
  if (isDiagLogging() && !isInDiagScope()) return;
  let e = su();
  try {
    await withDeadline(Promise.allSettled([...e.exitDrains].map((s) => Promise.resolve().then(s))), 500);
    try {
      await e.project?.flush();
    } finally {
      e.project?.settleHeldReplayRecords();
    }
    await flushAppendEntryQueues();
    let project = e.project,
      r = project?.exitReStampSource();
    if (isStorageV5Enabled() && project !== null && r !== void 0) {
      if (
        (await withDeadline(
          project.reStampAtExitAsync(r).then(() => !0),
          mMt,
        )) !== !0
      )
        logForDebugging(
          `Exit re-stamp through the storage backend did not finish within ${mMt} ms; the synchronous re-stamp runs instead`,
          { level: "warn" },
        );
    }
  } catch {
  } finally {
    reAppendSessionMetadataAtExit();
    let n = getTranscriptWriterDegraded();
    if (n !== null)
      logForDebugging(
        `flushSessionStorageAtExit: transcript writer degraded (${n.code} at ${n.source}) \u2014 entries since the failure window may be missing from the transcript`,
        { level: "error" },
      );
  }
}
/**
 * 取当前宿主的会话存储单例 Project；首次创建时注册退出钩子，进程退出前把写队列刷到磁盘。
 */
//@ chunk-e6aww6q8.js:357248-357431 callgraph-witnessed = getProject (0)
function getProject() {
  let e = su();
  if (!e.project) {
    if (((e.project = new Project(e)), transcriptExitHooksLatches.of(getRootSession().host).claim())) {
      if (
        (registerCleanup(flushSessionStorageAtExit),
        !process.listeners("exit").includes(reAppendSessionMetadataAtExit))
      )
        process.on("exit", reAppendSessionMetadataAtExit);
    }
  }
  return e.project;
}
//@ chunk-e6aww6q8.js:357431-357479 facade-majority = resetProjectFlushStateForTesting (0.771)
function resetProjectFlushStateForTesting() {
  su().project?._resetFlushState();
}
//@ chunk-e6aww6q8.js:357479-357531 facade-majority
function resetProjectForTesting() {
  transcriptStores.of(getRootSession()).current = new TranscriptStore(() => getSessionId());
}
//@ chunk-e6aww6q8.js:357531-357603 facade-majority
function compactTranscriptForTesting(e, n, r, s, h) {
  return getProject().performCompactTranscript(e, n, r, s, h);
}
//@ chunk-e6aww6q8.js:357603-357652 facade-majority
function requestCompactForTesting(e) {
  getProject().requestCompact(e, void 0, !0);
}
//@ chunk-e6aww6q8.js:357652-357691 facade-majority
function setSessionFileForTesting(e) {
  getProject().setSessionFile(e);
}
//@ chunk-e6aww6q8.js:357691-357729 facade-majority
function transcriptTailForHydrateForTesting(e, n, r) {
  return readHydrateTail(e, n, r);
}
//@ chunk-e6aww6q8.js:357729-357763 facade-majority
function readSessionAliasesForTesting(e, n) {
  return readSessionAliases(e, n);
}
//@ chunk-e6aww6q8.js:357763-357838 facade-majority
async function reAppendSessionMetadataAsyncForTesting(e = !0, n) {
  await getProject().reAppendSessionMetadataAsync(!1, e, n);
}
//@ chunk-e6aww6q8.js:357838-357901 facade-majority = recordContextCollapseCommit (1)
async function appendEntryToSessionForTesting(e, n, r) {
  await getProject().appendEntry(e, n, void 0, r);
}
//@ chunk-e6aww6q8.js:357901-357944 facade-majority
function getCurrentSessionFile() {
  return getProject().sessionFilePath;
}
//@ chunk-e6aww6q8.js:357944-357972 facade-majority
function locateCurrentSessionFile() {
  return getCurrentSessionFile();
}
//@ chunk-e6aww6q8.js:357972-358023 facade-majority
function currentSessionFileIsFor(e) {
  return isOwnTranscriptFile(e, getProject().sessionFilePath);
}
//@ chunk-e6aww6q8.js:358023-358088 facade-majority
function onSessionFileMaterialized(e) {
  return su().sessionFileMaterialized.subscribe(e);
}
//@ chunk-e6aww6q8.js:358088-358139 facade-majority
function emitSessionFileMaterializedForTesting() {
  su().sessionFileMaterialized.emit();
}
//@ chunk-e6aww6q8.js:358139-358196 facade-majority = setInternalEventWriter (1)
function setInternalEventWriter(e, n) {
  (getProject().setInternalEventWriter(e, n), registerWorkerEventMirror());
}
//@ chunk-e6aww6q8.js:358196-358307 layout
function registerWorkerEventMirror() {
  eMt({
    mirror: (e, n, { sessionId: sessionId, agentId: agentId }) =>
      mirrorWorkerEventToRemote(e, n, { sessionId: pinSessionId(sessionId), agentId: agentId }),
    readAgent: readAgentWorkerEvents,
  });
}
//@ chunk-e6aww6q8.js:358307-358354 facade-majority
function clearInternalEventWriter() {
  getProject().clearInternalEventWriter();
}
//@ chunk-e6aww6q8.js:358354-358399 facade-majority
function sealTranscriptAppendsForShutdown() {
  getProject().sealAppendsForShutdown();
}
//@ chunk-e6aww6q8.js:358399-358433 facade-majority
function addSessionMirror(e) {
  getProject().addMirror(e);
}
//@ chunk-e6aww6q8.js:358433-358472 facade-majority
function hasSessionMirror() {
  return getProject().hasMirror();
}
//@ chunk-e6aww6q8.js:358472-358511 facade-majority
function fireSessionMirror(e, n) {
  getProject().fireMirror(e, n);
}
//@ chunk-e6aww6q8.js:358511-358689 facade-majority = setInternalEventReader (0.674)
function setInternalEventReader(e, n, r) {
  (getProject().setInternalEventReader(e),
    getProject().setInternalSubagentEventReader(n),
    getProject().setInternalAgentEventReader(r ?? null),
    getProject().setAgentWorkerEventReader(r ?? null),
    registerWorkerEventMirror());
}
//@ chunk-e6aww6q8.js:358689-359050 facade-majority
async function readAgentWorkerEvents(e, n) {
  let r = getProject(),
    agentWorkerEventReader = r.getAgentWorkerEventReader();
  if (agentWorkerEventReader === null) return;
  if (r.isAgentOverBound(e)) return null;
  let h = await agentWorkerEventReader(e, n);
  if (h?.overBound) r.noteAgentOverBound(e);
  if (h === null || h.overBound || h.encodedBody) return null;
  let filtered = h.events.filter((event) => event.session_agent_id === e);
  if (filtered.length === 0 && h.events.length > 0) return null;
  return filtered.map((S) => S.payload);
}
//@ chunk-e6aww6q8.js:359050-359100 facade-majority
function setAgentMetadataInStreamGate(e) {
  getProject().keepsAgentMetadataInStream = e;
}
//@ chunk-e6aww6q8.js:359100-359156 facade-majority
function keepsAgentMetadataInStream() {
  return getProject().keepsAgentMetadataInStream();
}
//@ chunk-e6aww6q8.js:359156-359210 facade-majority
function hasWrittenAgentTranscript(e) {
  return getProject().hasWrittenAgentLocally(e);
}
//@ chunk-e6aww6q8.js:359210-359258 facade-majority
function isAgentTranscriptOverBound(e) {
  return getProject().isAgentOverBound(e);
}
//@ chunk-e6aww6q8.js:359258-359302 facade-majority = setRemoteIngressUrlForTesting (1)
function setRemoteIngressUrlForTesting(url) {
  getProject().setRemoteIngressUrl(url);
}
//@ chunk-e6aww6q8.js:359302-359313 layout
var REPLAY_INDEX_SCAN_LIMIT = 10;
//@ chunk-e6aww6q8.js:359313-360206 facade-majority
async function seedReplayIndex(e, n) {
  let r = new RequestBlobStore();
  if (isDiskless()) return { index: r, fileExisted: !1 };
  let s;
  try {
    let h = await open(e, constants.O_RDONLY | READ_LIMITS);
    s = h;
    let { size: size } = await h.stat();
    if (size === 0) return { index: r, fileExisted: !0 };
    let max = Math.max(0, size - gpo),
      w = n !== void 0 && n.start < n.fileSize && n.fileSize <= size ? Math.max(max, n.start) : max;
    if (w > 0) {
      r.startMidFile();
      let alloc = Buffer.alloc(hpo),
        { bytesRead: bytesRead } = await h.read(alloc, 0, alloc.length, 0),
        Z = getFirstLine(alloc.toString("utf8", 0, bytesRead));
      try {
        if (jsonParse(Z)?.type === "fork-context-ref") r.hasForkContextRef = !0;
      } catch {}
    }
    let L = transcriptLines(h.createReadStream({ encoding: "utf8", start: w, end: size - 1, autoClose: !0 }));
    for await (let G of L) {
      if (G.length === 0) continue;
      let q = ice(G);
      try {
        let Z = jsonParse(q);
        if (q === G || isCompactBoundaryMessage_3(Z)) r.noteLine(Z);
        else if (Z?.type === "user" || Z?.type === "assistant") r = r.successor(!0);
      } catch {}
    }
    return { index: r, fileExisted: !0 };
  } catch (error) {
    if (!isENOENT(error)) logError(error);
    return { index: s === void 0 ? r : r.successor(!1), fileExisted: s !== void 0 };
  } finally {
    await s?.close().catch(() => {});
  }
}
//@ chunk-e6aww6q8.js:360206-360284 layout
function Apo(e) {
  return Array.isArray(e) && e.some((n) => n?.type === "tool_result");
}
/**
 * 会话转录写入器：按目标文件维护写队列，每 100ms（FLUSH_INTERVAL_MS）批量 flush，单块不超过 100MB；会话文件在第一条 user/assistant/system 消息时才创建；同时管理标题、tag、agent 名等会话元数据并在尾部重写（reAppendSessionMetadata），支持远程镜像、storage v5 后端与转录迁移。
 */
//@ chunk-e6aww6q8.js:360284-407532 fingerprint = Project (0.319)
class Project {
  store;
  currentSessionTag;
  currentSessionRelocatedCwd;
  currentSessionTitle;
  currentSessionAiTitle;
  currentSessionAgentName;
  currentSessionAgentColor;
  currentSessionLastPrompt;
  currentSessionLeafUuid;
  currentSessionLeafTs;
  currentSessionAgentSetting;
  currentSessionMode;
  currentSessionPermissionMode;
  currentSessionIsolationLatch;
  currentSessionDevModsFolder;
  currentSessionMemoryModeStamps = [];
  atisLatchStamp;
  toolsUsedStamp;
  currentSessionWorktree;
  resumedArtifactCommentMonitor;
  currentSessionPrNumber;
  currentSessionPrUrl;
  currentSessionPrRepository;
  currentSessionArtifactCount;
  resumedArtifactAutoReactLedger;
  currentSessionBridgeId;
  currentSessionBridgeSeq;
  currentSessionBridgeDialogKinds;
  currentSessionBridgeGroupingId;
  currentSessionBridgeNoBackfill;
  currentSessionBridgeOwnerAccountUuid;
  currentSessionBridgeOwnerOrganizationUuid;
  currentSessionHistorySuppressed;
  currentSessionPrecautionarySuppression;
  clearResilientPrecautionSids;
  scanUncertaintyHoldSids;
  knownTaintedSessionIds;
  sessionFile = null;
  get sessionFilePath() {
    return this.sessionFile;
  }
  setSessionFile(e) {
    if (
      (writeTranscriptFile(
        this.store.writerHealth,
        this.sessionFile,
        e,
        void 0,
        e === null ? Array.from(this.writeQueues.keys()) : [],
      ),
      this.compactAwaitingSummary?.filePath !== e)
    )
      this.compactAwaitingSummary = void 0;
    if (((this.sessionFile = e), e !== null)) this.existingSessionFiles.set(this.store.getSessionId(), e);
  }
  pendingEntries = [];
  heldReplayRecords = [];
  awaitingFirstUserRow = !1;
  relocationBuffer = null;
  remoteIngressUrl = null;
  internalEventWriter = null;
  internalEventWriterSessionId = void 0;
  internalEventReader = null;
  internalSubagentEventReader = null;
  internalAgentEventReader = null;
  agentWorkerEventReader = null;
  keepsAgentMetadataInStream = () => !1;
  agentIdsWrittenLocally = new Set();
  agentIdsFetched = new Set();
  agentIdsOverBound = new Set();
  verifiesAgentTranscripts = !1;
  agentTranscriptFetches = new Map();
  mirrors = [];
  pendingWriteCount = 0;
  flushResolvers = [];
  lastWriteInCallOrder = void 0;
  shutdownSeen = createSignal();
  writeQueues = new Map();
  flushTimer = null;
  activeDrain = null;
  storeFence = void 0;
  queueOperationsRaisedElsewhere = Promise.resolve();
  drainChain = Promise.resolve();
  FLUSH_INTERVAL_MS = 100;
  MAX_CHUNK_BYTES = 104857600;
  bytesSinceMetadataReAppend = 0;
  sessionFileAppendSource = void 0;
  tornTailToSeal = null;
  bytesSinceCompact = 0;
  backstopThresholdBytes = LG;
  compactAwaitingSummary = void 0;
  sessionRewritesPending = new Set();
  sessionRowsDeleted = new Set();
  sessionLastBoundaryUuid = void 0;
  constructor(e) {
    this.store = e;
  }
  _resetFlushState() {
    if (
      ((this.pendingWriteCount = 0),
      (this.lastWriteInCallOrder = void 0),
      this.shutdownSeen.clear(),
      this.transcriptBatches.clearForTest(),
      (this.storeFence = void 0),
      (this.bytesSinceMetadataReAppend = 0),
      (this.sessionFileAppendSource = void 0),
      (this.tornTailToSeal = null),
      (this.bytesSinceCompact = 0),
      (this.compactAwaitingSummary = void 0),
      this.sessionRewritesPending.clear(),
      this.sessionRowsDeleted.clear(),
      (this.sessionLastBoundaryUuid = void 0),
      (this.flushResolvers = []),
      this.flushTimer)
    )
      clearTimeout(this.flushTimer);
    ((this.flushTimer = null),
      (this.activeDrain = null),
      (this.drainChain = Promise.resolve()),
      (this.writeQueues = new Map()),
      (this.mirrors = []));
  }
  addMirror(e) {
    this.mirrors.push(e);
  }
  hasMirror() {
    return this.mirrors.length > 0;
  }
  fireMirror(e, n) {
    for (let mirror of this.mirrors)
      try {
        mirror(e, n);
      } catch (error) {
        logForDebugging(`[SessionMirror] mirror failed for ${e}: ${error}`, { level: "error" });
      }
  }
  incrementPendingWrites() {
    this.pendingWriteCount++;
  }
  decrementPendingWrites() {
    if ((this.pendingWriteCount--, this.pendingWriteCount === 0)) {
      for (let flushResolver of this.flushResolvers) flushResolver();
      this.flushResolvers = [];
    }
  }
  async trackWrite(e) {
    this.incrementPendingWrites();
    try {
      return await e();
    } finally {
      this.decrementPendingWrites();
    }
  }
  inCallOrder(e) {
    this.releaseWaitsForUploads();
    let lastWriteInCallOrder = this.lastWriteInCallOrder,
      { promise: promise, resolve: resolve } = Promise.withResolvers();
    return (
      (this.lastWriteInCallOrder = promise),
      this.trackWrite(async () => {
        try {
          if (lastWriteInCallOrder !== void 0) await lastWriteInCallOrder;
          return await e();
        } finally {
          if (this.lastWriteInCallOrder === promise) this.lastWriteInCallOrder = void 0;
          resolve();
        }
      })
    );
  }
  untilUploadedOrShutdown(e) {
    return new Promise((n, r) => {
      let subscribe = this.shutdownSeen.subscribe(() => {
        (subscribe(), this.trackWrite(() => e.catch(logError)), n());
      });
      e.then(
        () => {
          (subscribe(), n());
        },
        (h) => {
          (subscribe(), r(h));
        },
      );
    });
  }
  releaseWaitsForUploads() {
    if (isShuttingDown()) this.shutdownSeen.emit();
  }
  transcriptBatches = createKeyedQueue();
  recordInTurn(e, n, r) {
    return (
      this.releaseWaitsForUploads(),
      this.trackWrite(() =>
        this.transcriptBatches.run(
          `${e}
${n ?? ""}`,
          r,
        ),
      )
    );
  }
  pushQueueItem(e, n) {
    let r = this.writeQueues.get(e);
    if (!r) ((r = []), this.writeQueues.set(e, r));
    (r.push(n), this.scheduleDrain());
  }
  enqueueWrite(e, n, r) {
    if (this.appendsSealedForShutdown) return Promise.resolve();
    if (isDiskless() && r === void 0) {
      let s = Error("diskless session: transcript entry queued with no storage backend; entry dropped");
      return (
        logError(s),
        warnDisklessSettingsWrite("transcript_lines", e),
        reportTranscriptWriteFailure(this.store.writerHealth, "enqueue", s, e),
        this.forgetLinesThatNeverLanded(e),
        Promise.resolve()
      );
    }
    return new Promise((s) => {
      this.pushQueueItem(e, { entry: n, resolve: s, storageV5: r });
    });
  }
  forgetLinesThatNeverLanded(e) {
    if (this.replaySources.has(e)) (this.restartReplayIndex(e), b9());
    this.queuedToolResults.clear();
  }
  enqueueRemove(e, n, r) {
    return new Promise((s) => {
      this.pushQueueItem(e, { removeUuid: n, resolve: s, storageV5: r });
    });
  }
  enqueueCompact(e, n, r) {
    return new Promise((s) => {
      this.pushQueueItem(e, { compact: !0, afterCompaction: r, resolve: s, storageV5: n });
    });
  }
  queueLeafCheckpointWithdrawal(e) {
    if (this.sessionFile === null || this.relocationBuffer !== null || this.shouldSkipPersistence()) return;
    this.pushQueueItem(this.sessionFile, {
      withdrawal: e,
      resolve: () => {},
      storageV5: this.exitReStampSource(),
    });
  }
  async performLeafCheckpointWithdrawal(e, n, r) {
    let any = (await readFileRange(e, r))
        .split(
          `
`,
        )
        .some(isLastPromptLine),
      y;
    if (!any)
      try {
        for await (let S of transcriptLines(createReadStream(e, { encoding: "utf8" })))
          if (isLastPromptLine(S)) {
            any = !0;
            break;
          }
      } catch (error) {
        y = `(${getErrnoCode(error)}): ${errorMessage(error)}`;
      }
    if (!any && y !== void 0) {
      logForDebugging(
        `/clear: could not read the transcript it left, so any resume checkpoint in it is not withdrawn: ${e} ${y}`,
        { level: "warn" },
      );
      return;
    }
    if (!any) {
      logForDebugging(`/clear: no resume checkpoint in the transcript it left, so none withdrawn: ${e}`);
      return;
    }
    (await this.appendToFile(e, toJsonLine(n), r),
      this.fireMirror(e, [n]),
      logForDebugging(`/clear: withdrew the resume checkpoint in the transcript it left: ${e}`));
  }
  requestCompact(e, n, r = !1) {
    if (!this.store.localGcEnabled) return;
    (this.restartReplayIndex(e), b9(), this.queuedToolResults.clear());
    let enqueueCompact = this.enqueueCompact(e, n, r);
    (e === this.sessionFile && this.trackSessionRewrite(enqueueCompact), this.scheduleDrain());
  }
  trackSessionRewrite(e) {
    let n = {};
    return (
      this.sessionRewritesPending.add(n),
      e.finally(() => {
        this.sessionRewritesPending.delete(n);
      })
    );
  }
  sessionRowsOffDisk() {
    if (this.sessionRowsDeleted.size === 0 && this.sessionRewritesPending.size === 0) return;
    return {
      deleted: this.sessionRowsDeleted,
      rewriting: this.sessionRewritesPending.size > 0,
      lastBoundary: this.sessionLastBoundaryUuid,
    };
  }
  scheduleDrain() {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(async () => {
      if (
        ((this.flushTimer = null),
        (this.activeDrain = this.drainWriteQueue()),
        await this.activeDrain,
        (this.activeDrain = null),
        this.writeQueues.size > 0)
      )
        this.scheduleDrain();
    }, this.FLUSH_INTERVAL_MS);
  }
  sealTornTailOnNextAppend(e) {
    this.tornTailToSeal = e;
  }
  sealTornTailSync(e) {
    if (this.tornTailToSeal !== e || isDiskless()) return;
    if (isTranscriptPersistenceDisabled()) return;
    let n;
    try {
      n = openSync(e, constants.O_WRONLY | constants.O_APPEND);
    } catch {
      return;
    }
    try {
      let { size: size } = fstatSync(n);
      if (size > 0)
        writeSync(
          n,
          `
`,
          void 0,
        );
    } finally {
      closeSync(n);
    }
    this.tornTailToSeal = null;
  }
  tornTailSealPending(e) {
    return this.tornTailToSeal === e;
  }
  tornTailSealLanded(e) {
    if (this.tornTailToSeal === e) this.tornTailToSeal = null;
  }
  async appendToFile(e, n, r) {
    if (this.storeFence !== void 0) throw this.storeFence;
    this.directAppendsInFlight++;
    let s;
    try {
      s = (await appendToTranscriptFile(e, n, r)) === "backend";
    } finally {
      this.directAppendsInFlight--;
    }
    if (
      (noteTranscriptWriteOk(this.store.writerHealth, e),
      this.sessionFilesNotYetWritten.delete(e),
      e === this.sessionFile)
    ) {
      let byteLength = Buffer.byteLength(n, "utf8");
      ((this.bytesSinceMetadataReAppend += byteLength),
        (this.bytesSinceCompact += byteLength),
        (this.sessionFileAppendSource = s ? r : void 0));
    }
  }
  drainsInFlight = 0;
  directAppendsInFlight = 0;
  appendInFlight() {
    return this.drainsInFlight > 0 || this.directAppendsInFlight > 0;
  }
  drainWriteQueue() {
    this.drainsInFlight++;
    let e = this.drainChain.then(() => this.drainQueuesOnce());
    return (
      (this.drainChain = e
        .catch(() => {})
        .finally(() => {
          this.drainsInFlight--;
        })),
      e
    );
  }
  async drainQueuesOnce() {
    for (let [e, n] of this.writeQueues) {
      if (n.length === 0) continue;
      let splice = n.splice(0),
        s = 0;
      try {
        let h = "",
          y = 0,
          S,
          L = this.mirrors.length > 0 ? [] : void 0;
        for (let G = 0; G < splice.length; G++) {
          let q = splice[G];
          if (!("entry" in q)) {
            if (h.length > 0) {
              if ((await this.appendToFile(e, h, S), L && L.length > 0))
                (this.fireMirror(e, L.slice()), (L.length = 0));
              for (let ke = y; ke < G; ke++) splice[ke].resolve();
              ((s = G), (h = ""));
            }
            if (this.storeFence !== void 0) throw this.storeFence;
            if ("removeUuid" in q) await this.performRemoveByUuid(e, q.removeUuid, q.storageV5);
            else if ("compact" in q)
              await this.performCompactTranscript(e, void 0, void 0, q.storageV5, q.afterCompaction);
            else await this.performLeafCheckpointWithdrawal(e, q.withdrawal, q.storageV5);
            (q.resolve(), (s = G + 1), (y = G + 1));
            continue;
          }
          let { entry: entry } = q,
            Se = toJsonLine(entry);
          if (h.length + Se.length >= this.MAX_CHUNK_BYTES || (q.storageV5 !== S && h.length > 0)) {
            if ((await this.appendToFile(e, h, S), L && L.length > 0))
              (this.fireMirror(e, L.slice()), (L.length = 0));
            for (let ke = y; ke < G; ke++) splice[ke].resolve();
            ((s = G), (y = G), (h = ""));
          }
          if (((S = q.storageV5), (h += Se), !entry.type.startsWith("api-request"))) L?.push(entry);
        }
        if (h.length > 0) {
          if ((await this.appendToFile(e, h, S), L && L.length > 0)) this.fireMirror(e, L);
          for (let G = y; G < splice.length; G++) splice[G].resolve();
          s = splice.length;
        }
      } catch (error) {
        if (error !== this.storeFence) {
          let y = getErrnoCode(error);
          if (isSyscallError(error))
            logForDebugging(`Transcript write failed (${y}): ${errorMessage(error)}`, { level: "error" });
          else logError(error);
          if (
            (reportTranscriptWriteFailure(this.store.writerHealth, "drain", error, e),
            this.forgetLinesThatNeverLanded(e),
            error instanceof Error && getStorageErrorCause(error) !== void 0)
          )
            this.storeFence = error;
        }
        this.store.hasFailedWrite = !0;
        for (let y = s; y < splice.length; y++) splice[y].resolve();
      }
    }
    for (let [e, n] of this.writeQueues) if (n.length === 0) this.writeQueues.delete(e);
    if (
      this.store.localGcEnabled &&
      this.sessionFile &&
      this.storeFence === void 0 &&
      this.compactAwaitingSummary === void 0 &&
      this.bytesSinceCompact >= this.backstopThresholdBytes
    )
      ((this.bytesSinceCompact = 0),
        await this.trackSessionRewrite(
          this.performCompactTranscript(this.sessionFile, void 0, void 0, this.sessionFileAppendSource),
        ));
    if (this.bytesSinceMetadataReAppend >= LITE_READ_BUF_SIZE / 2)
      try {
        await this.reAppendSessionMetadataAsync(!1, !0, this.sessionFileAppendSource);
      } catch (error) {
        if (isSyscallError(error))
          logForDebugging(`Metadata re-append failed (${getErrnoCode(error)}): ${errorMessage(error)}`, {
            level: "error",
          });
        else logError(error);
      }
  }
  resetSessionFile() {
    for (let { target: target } of this.heldReplayRecords.map((heldReplayRecord) => heldReplayRecord.records))
      if (
        target.sessionId !== getSessionId() &&
        getTranscriptPathForSession(target.sessionId) === this.sessionFile
      )
        this.existingSessionFiles.set(target.sessionId, this.sessionFile);
    if (
      (this.setSessionFile(null),
      (this.pendingEntries = []),
      (this.awaitingFirstUserRow = !1),
      this.heldReplayRecords.length > 0)
    )
      this.releaseHeldReplayRecords();
    ((this.bytesSinceMetadataReAppend = 0),
      (this.sessionFileAppendSource = void 0),
      (this.bytesSinceCompact = 0),
      (this.backstopThresholdBytes = LG),
      this.sessionRowsDeleted.clear(),
      (this.sessionLastBoundaryUuid = void 0));
  }
  reAppendSessionMetadata(e = !1, n = !1, r = !1, s = !1) {
    if (!this.sessionFile) return;
    this.bytesSinceMetadataReAppend = 0;
    let h = readTranscriptTail(this.sessionFile);
    if (
      s &&
      h !== "" &&
      !h.endsWith(`
`)
    )
      this.sealTornTailOnNextAppend(this.sessionFile);
    let planReAppendSessionMetadata = this.planReAppendSessionMetadata(h, e, n, void 0, r);
    if (!planReAppendSessionMetadata) return;
    try {
      if (planReAppendSessionMetadata.entries.length > 0)
        this.sealTornTailSync(planReAppendSessionMetadata.sessionFile);
      for (let entry of planReAppendSessionMetadata.entries)
        writeTranscriptMetadataSync(planReAppendSessionMetadata.sessionFile, entry);
    } catch (error) {
      for (let stamp of planReAppendSessionMetadata.stamps) stamp.inFlight = !1;
      throw error;
    }
    for (let stamp of planReAppendSessionMetadata.stamps) ((stamp.written = !0), (stamp.inFlight = !1));
  }
  appendOwedEntryAtExit(e) {
    if (!this.sessionFile) return;
    (this.sealTornTailSync(this.sessionFile), writeTranscriptMetadataSync(this.sessionFile, e));
  }
  exitReStampSource() {
    return this.sessionFileAppendSource;
  }
  adoptAppendSource(e) {
    let sessionFile = this.sessionFile;
    this.sessionFileAppendSource =
      sessionFile === null ? void 0 : getStorageTargetForPath(sessionFile, e)?.backend;
  }
  async reStampAtExitAsync(e) {
    let sessionFile = this.sessionFile;
    if (!sessionFile || this.store.exitReStampDone()) return;
    if (isTranscriptPersistenceDisabled()) {
      this.store.claimExitReStamp();
      return;
    }
    try {
      await this.reAppendSessionMetadataAsync(!1, !1, e, !1);
    } catch (error) {
      logReStampFailure("Exit re-stamp through the storage backend failed", error);
      return;
    }
    let r = !0,
      s = new Set();
    for (let h = 0; ; h++) {
      if (this.store.exitReStampDone()) return;
      let { lines: lines, clean: clean } = this.takeForeignExitLines(s);
      if (((r &&= clean), h > 0 && lines.length === 0)) break;
      if (h === Cpo) {
        r = !1;
        break;
      }
      for (let w of lines) {
        if (this.store.exitReStampDone()) return;
        try {
          (await appendEntryToFileAsync(w.path, w.entry, e, {
            onlyIfExists: !0,
            tornTailEntry: w.tornTailEntry,
          }),
            this.store.takenForeignExitLines.delete(w));
        } catch (error) {
          (logReStampFailure(
            "Exit line owed to another session's transcript was not appended through the storage backend",
            error,
          ),
            (r = !1));
        }
      }
      if (h > 0) continue;
      for (let exitReStampProvider of this.store.exitReStampProviders) {
        if (this.store.exitReStampDone()) return;
        if (this.sessionFile !== sessionFile) {
          r = !1;
          break;
        }
        try {
          let L = exitReStampProvider();
          if (L !== void 0)
            (await appendToTranscriptFile(
              sessionFile,
              jsonStringify(L) +
                `
`,
              e,
            ),
              this.fireMirror(sessionFile, [L]));
        } catch (error) {
          if (
            (logReStampFailure(
              "Exit line owed to the transcript was not appended through the storage backend",
              error,
            ),
            (r = !1),
            error instanceof Error && getStorageErrorCause(error) !== void 0)
          ) {
            this.storeFence = error;
            break;
          }
        }
      }
    }
    if (r && this.sessionFile === sessionFile) this.store.claimExitReStamp();
  }
  takeForeignExitLines(e) {
    let n = [],
      r = !0;
    for (let foreignExitReStampProvider of this.store.foreignExitReStampProviders)
      try {
        for (let h of foreignExitReStampProvider()) {
          let y =
            h.path +
            `
` +
            jsonStringify(h.entry);
          if (e.has(y)) continue;
          (e.add(y), this.store.takenForeignExitLines.add(h), n.push(h));
        }
      } catch (error) {
        (logReStampFailure("Exit lines owed to other sessions' transcripts could not be listed", error),
          (r = !1));
      }
    return { lines: n, clean: r };
  }
  async reAppendSessionMetadataAsync(e = !1, n = !1, r, s = !1) {
    let sessionFile = this.sessionFile;
    if (!sessionFile || this.storeFence !== void 0) return;
    let sessionId = this.store.getSessionId();
    ((this.bytesSinceMetadataReAppend = 0), await flushAppendEntryQueues());
    let S = await readFileRange(sessionFile, r);
    if (s && r !== void 0 && (this.sessionFile !== sessionFile || this.store.getSessionId() !== sessionId))
      return;
    let planReAppendSessionMetadata = this.planReAppendSessionMetadata(S, e, n, r);
    if (!planReAppendSessionMetadata || planReAppendSessionMetadata.entries.length === 0) return;
    this.directAppendsInFlight++;
    try {
      await appendToTranscriptFile(
        planReAppendSessionMetadata.sessionFile,
        jsonlJoin(planReAppendSessionMetadata.entries),
        r,
      );
    } catch (error) {
      if (error instanceof Error && getStorageErrorCause(error) !== void 0) this.storeFence = error;
      for (let stamp of planReAppendSessionMetadata.stamps) stamp.inFlight = !1;
      throw error;
    } finally {
      this.directAppendsInFlight--;
    }
    for (let stamp of planReAppendSessionMetadata.stamps) ((stamp.written = !0), (stamp.inFlight = !1));
    this.fireMirror(planReAppendSessionMetadata.sessionFile, planReAppendSessionMetadata.entries);
  }
  normalizeLastPrompt(e) {
    let trimmed = e
      .replaceAll(
        `
`,
        " ",
      )
      .trim();
    return trimmed.length > 200 ? truncateToLength(trimmed, 200).trim() + "\u2026" : trimmed;
  }
  planReAppendSessionMetadata(e, n, r, s, h = !1) {
    if (!this.sessionFile) return null;
    let sessionId = this.store.getSessionId();
    if (!sessionId) return null;
    let sessionFile = this.sessionFile,
      parts = e.split(`
`);
    if (!n) {
      let We = !1,
        last = parts.findLast((Je) => Je.includes('"type":"custom-title"') && Je.includes('"customTitle":"'));
      if (last) {
        let Je = extractLastJsonStringField(last, "customTitle");
        if (Je !== void 0) {
          if (
            ((We ||= this.currentSessionTitle !== (Je || void 0)),
            (this.currentSessionTitle = Je || void 0),
            !Je)
          )
            deleteSessionTitleSidecar(sessionFile, sessionId, s);
        }
      }
      let last_2 = parts.findLast((Je) => Je.includes('"type":"ai-title"') && Je.includes('"aiTitle":"'));
      if (last_2) {
        let Je = extractLastJsonStringField(last_2, "aiTitle");
        if (Je !== void 0)
          ((We ||= this.currentSessionAiTitle !== (Je || void 0)),
            (this.currentSessionAiTitle = Je || void 0));
      }
      if (We) this.store.sessionTitleChanged.emit();
    }
    let last = parts.findLast((We) => We.includes('"type":"tag"') && We.includes('"tag":"'));
    if (last) {
      let We = extractLastJsonStringField(last, "tag");
      if (We !== void 0) this.currentSessionTag = We || void 0;
    }
    let G = extractFieldFromLastEntryOfTypeStrict(e, "relocated", "relocatedCwd");
    if (G) this.currentSessionRelocatedCwd ??= G;
    if (this.currentSessionLeafUuid !== void 0) {
      let We = extractFieldFromLastEntryOfTypeStrict(e, "last-prompt", "lastPrompt");
      if (We) this.currentSessionLastPrompt ??= this.normalizeLastPrompt(We);
    }
    {
      let We = countFrameLinks(e);
      if (We !== void 0)
        this.currentSessionArtifactCount = Math.max(this.currentSessionArtifactCount ?? 0, We);
    }
    let q = [];
    if (this.currentSessionLastPrompt !== void 0 || this.currentSessionLeafUuid !== void 0)
      q.push({
        type: "last-prompt",
        ...(this.currentSessionLastPrompt && { lastPrompt: this.currentSessionLastPrompt }),
        ...(this.currentSessionLeafUuid && { leafUuid: this.currentSessionLeafUuid }),
        sessionId: sessionId,
      });
    if (this.currentSessionTitle)
      q.push({ type: "custom-title", customTitle: this.currentSessionTitle, sessionId: sessionId });
    if (this.currentSessionAiTitle)
      q.push({ type: "ai-title", aiTitle: this.currentSessionAiTitle, sessionId: sessionId });
    if (this.currentSessionTag) q.push({ type: "tag", tag: this.currentSessionTag, sessionId: sessionId });
    if (this.currentSessionRelocatedCwd && e !== "")
      q.push({ type: "relocated", relocatedCwd: this.currentSessionRelocatedCwd, sessionId: sessionId });
    if (this.currentSessionAgentName)
      q.push({ type: "agent-name", agentName: this.currentSessionAgentName, sessionId: sessionId });
    if (this.currentSessionAgentColor)
      q.push({ type: "agent-color", agentColor: this.currentSessionAgentColor, sessionId: sessionId });
    if (this.currentSessionAgentSetting)
      q.push({ type: "agent-setting", agentSetting: this.currentSessionAgentSetting, sessionId: sessionId });
    if (this.currentSessionMode)
      q.push({ type: "mode", mode: this.currentSessionMode, sessionId: sessionId });
    if (this.currentSessionPermissionMode)
      q.push({
        type: "permission-mode",
        permissionMode: this.currentSessionPermissionMode,
        sessionId: sessionId,
      });
    if (this.currentSessionIsolationLatch)
      q.push({ type: "isolation-latch", side: this.currentSessionIsolationLatch, sessionId: sessionId });
    if (this.currentSessionDevModsFolder)
      q.push({ type: "dev-mods", folder: this.currentSessionDevModsFolder, sessionId: sessionId });
    let index = this.currentSessionMemoryModeStamps.findIndex(
        (currentSessionMemoryModeStamp) => !currentSessionMemoryModeStamp.written,
      ),
      Se = [];
    if (
      index !== -1 &&
      (h ||
        !this.currentSessionMemoryModeStamps.some(
          (currentSessionMemoryModeStamp) => currentSessionMemoryModeStamp.inFlight,
        ))
    )
      for (let We of this.currentSessionMemoryModeStamps.slice(index))
        ((We.inFlight = !0),
          Se.push(We),
          q.push({
            type: "memory-mode",
            mode: We.mode,
            afterUuid: We.afterUuid,
            timestamp: We.timestamp,
            ...(We.reason !== void 0 && { reason: We.reason }),
            ...(We.account !== void 0 && { account: We.account }),
            ...(We.accountChoice !== void 0 && { accountChoice: We.accountChoice }),
            sessionId: sessionId,
          }));
    let ke = getConversationAtisLatch();
    if (ke !== void 0)
      (q.push({ type: "atis-latch", atis: ke, sessionId: sessionId }),
        (this.atisLatchStamp = `${sessionFile}
${ke}`));
    let we = getConversationToolsUsed();
    if (
      isSillyShoreGateOn() &&
      we.size() > 0 &&
      this.toolsUsedStamp !==
        `${sessionFile}
${we.generation()}`
    )
      (q.push({ type: "tools-used", tools: we.names(), sessionId: sessionId }),
        (this.toolsUsedStamp = `${sessionFile}
${we.generation()}`));
    if (this.currentSessionWorktree !== void 0)
      q.push({ type: "worktree-state", worktreeSession: this.currentSessionWorktree, sessionId: sessionId });
    if (this.currentSessionPrNumber !== void 0 && this.currentSessionPrUrl && this.currentSessionPrRepository)
      q.push({
        type: "pr-link",
        sessionId: sessionId,
        prNumber: this.currentSessionPrNumber,
        prUrl: this.currentSessionPrUrl,
        prRepository: this.currentSessionPrRepository,
        timestamp: new Date().toISOString(),
      });
    if (this.currentSessionArtifactCount && e !== "")
      q.push({
        type: "frame-link",
        artifactCount: this.currentSessionArtifactCount,
        sessionId: sessionId,
        timestamp: new Date().toISOString(),
      });
    if (this.currentSessionHistorySuppressed) q.push(buildHistorySuppressionEntry(sessionId, "migration"));
    if (this.currentSessionBridgeId)
      q.push({
        type: "bridge-session",
        sessionId: sessionId,
        bridgeSessionId: this.currentSessionBridgeId,
        lastSequenceNum: this.currentSessionBridgeSeq ?? 0,
        ...(this.currentSessionBridgeDialogKinds?.length && {
          declaredDialogKinds: this.currentSessionBridgeDialogKinds,
        }),
        ...(this.currentSessionBridgeGroupingId && {
          sessionGroupingId: this.currentSessionBridgeGroupingId,
        }),
        ...(this.currentSessionBridgeNoBackfill && { noHistoryBackfill: !0 }),
        ...(this.currentSessionBridgeOwnerAccountUuid && {
          ownerAccountUuid: this.currentSessionBridgeOwnerAccountUuid,
        }),
        ...(this.currentSessionBridgeOwnerOrganizationUuid && {
          ownerOrganizationUuid: this.currentSessionBridgeOwnerOrganizationUuid,
        }),
      });
    if (r || q.length === 0) return { sessionFile: sessionFile, entries: q, stamps: Se };
    let Ee = new Set(q.map((We) => We.type)),
      Ae = new Map(),
      Ie = 0;
    for (let We = parts.length - 1; We >= 0; We--) {
      if (Ae.size === Ee.size) break;
      let ze = parts[We] ?? "";
      if (((Ie += Buffer.byteLength(ze, "utf8") + 1), Ie > LITE_READ_BUF_SIZE / 2)) break;
      if (!ze) continue;
      let lt;
      for (let Je of Ee)
        if (!Ae.has(Je) && ze.includes(`"type":"${Je}"`)) {
          lt = Je;
          break;
        }
      if (!lt) continue;
      try {
        let Je = jsonParseRaw(ze);
        if (Je.type === lt) Ae.set(lt, Je);
      } catch {}
    }
    let Me = (We) => {
      if (We.type === "history-suppression") return jsonStringify({ type: We.type, sessionId: We.sessionId });
      let { timestamp: timestamp, ts: ts, ...Je } = We;
      return jsonStringify(Je);
    };
    return {
      sessionFile: sessionFile,
      entries: q.filter((We) => {
        if (We.type === "memory-mode") return !0;
        let ze = Ae.get(We.type);
        return !ze || Me(We) !== Me(ze);
      }),
      stamps: Se,
    };
  }
  async flush() {
    if ((this.releaseWaitsForUploads(), this.flushTimer))
      (clearTimeout(this.flushTimer), (this.flushTimer = null));
    if (this.activeDrain) await this.activeDrain;
    await this.drainWriteQueue();
    while (this.pendingWriteCount > 0)
      (await new Promise((e) => {
        this.flushResolvers.push(e);
      }),
        await this.drainWriteQueue());
    if (this.sessionFile !== null && this.heldReplayRecords.length > 0) await this.releaseHeldReplayRecords();
    if (this.writeQueues.size > 0) await this.drainWriteQueue();
    if (this.storeFence !== void 0) throw this.storeFence;
  }
  drainQueuedRows(e, n, r) {
    if (!this.writeQueues.has(e)) return;
    this.drainWriteQueue();
    let s = withDeadline(
      this.drainChain.then(() => "drained"),
      n,
    ).then((h) => h ?? "timed_out");
    return r === void 0 ? s : raceWithAbortSignal(s, r, () => new AbortError_2());
  }
  async removeMessageByUuid(e, n, r) {
    return this.trackWrite(async () => {
      let s = n === this.store.getSessionId() ? this.sessionFile : await this.getExistingSessionFile(n, r);
      if (!s) return { drained: Promise.resolve() };
      (this.restartReplayIndex(s, !0), this.queuedToolResults.clear());
      let enqueueRemove = this.enqueueRemove(s, e, r);
      return (this.trackWrite(() => enqueueRemove), { drained: enqueueRemove });
    });
  }
  async performRemoveByUuid(e, n, r) {
    let s = r !== void 0 ? transcriptStorageKeyForPath(e) : void 0;
    if (isStorageV5Enabled() && r !== void 0 && s !== void 0) return this.removeByUuidV5(r, s, n);
    if (isDiskless()) return;
    let h = !1;
    try {
      let y = 0,
        S = await open(e, "r+");
      try {
        let { size: size } = await S.stat();
        if (((y = size), size === 0)) return;
        let min = Math.min(size, LITE_READ_BUF_SIZE),
          Se = size - min,
          allocUnsafe = Buffer.allocUnsafe(min),
          { bytesRead: bytesRead } = await S.read(allocUnsafe, 0, min, Se),
          chunk = allocUnsafe.subarray(0, bytesRead),
          Ae = `"uuid":"${n}"`,
          index = chunk.lastIndexOf(Ae);
        if (index >= 0) {
          let index_2 = chunk.lastIndexOf(10, index);
          if (index_2 >= 0 || Se === 0) {
            let We = index_2 + 1,
              index_3 = chunk.indexOf(10, index + Ae.length),
              lt = index_3 >= 0 ? index_3 + 1 : bytesRead,
              Je = Se + We,
              nt = bytesRead - lt;
            if (((h = !0), await S.truncate(Je), nt > 0)) {
              let { bytesWritten: bytesWritten } = await S.write(chunk, lt, nt, Je);
              if (bytesWritten < nt) throw Error("performRemoveByUuid: short write");
            }
            return;
          }
        }
      } finally {
        await S.close();
      }
      if (y > KHe) {
        logForDebugging(`Skipping tombstone removal: session file too large (${formatFileSize(y)})`, {
          level: "warn",
        });
        return;
      }
      let parts = (await readFile(e, { encoding: "utf-8" })).split(`
`),
        filtered = parts.filter((q) => {
          if (!q.trim()) return !0;
          try {
            return jsonParse(q).uuid !== n;
          } catch {
            return !0;
          }
        });
      if (filtered.length === parts.length) return;
      ((h = !0),
        await writeFile(
          e,
          filtered.join(`
`),
          { encoding: "utf8" },
        ));
    } catch {
      if (h && this.replaySources.has(e)) (this.restartReplayIndex(e), b9(), this.queuedToolResults.clear());
    }
  }
  async removeByUuidV5(e, n, r) {
    try {
      let buffer = Buffer.from(`"uuid":"${r}"`);
      for (let h = 1; h <= 3; h++) {
        let read = await e.read([{ key: n, tail: LITE_READ_BUF_SIZE }]);
        if (!read.ok) {
          if (d7t(read.error))
            return await removeTombstones(e, n, r, {
              windowBytes: LITE_READ_BUF_SIZE,
              pageBytes: aMt,
              maxReadBytes: KHe,
            });
          logForDebugging(`Tombstone removal abandoned: tail read failed (${read.error.code})`, {
            level: "warn",
          });
          return;
        }
        let [S] = read.value.items;
        if (!S.found) return;
        let buffer_2 = Buffer.from(S.value.buffer, S.value.byteOffset, S.value.byteLength);
        if (buffer_2.length === 0) return;
        let L = S.totalBytes - buffer_2.length,
          index = buffer_2.lastIndexOf(buffer),
          q = index < 0 ? -1 : buffer_2.lastIndexOf(10, index);
        if (index < 0 || (q < 0 && L > 0))
          return await this.removeByUuidSlowV5(e, n, r, S.totalBytes, S.version);
        let index_2 = buffer_2.indexOf(10, index + buffer.length);
        if (index_2 < 0) return;
        let replaceRecords = await e.replaceRecords(n, [], {
          keepBefore: L + q + 1,
          preserveFrom: L + index_2 + 1,
          publishDiscipline: "inPlace",
          precondition: S.version !== void 0 ? { type: "ifMatch", version: S.version } : { type: "none" },
        });
        if (replaceRecords.ok || replaceRecords.error.code === "NotFound") return;
        if (
          !(
            replaceRecords.error.code === "PreconditionFailed" || replaceRecords.error.code === "Unavailable"
          ) ||
          h === 3
        ) {
          logForDebugging(
            `Tombstone removal abandoned after ${h} attempt(s) (${replaceRecords.error.code})`,
            { level: "warn" },
          );
          return;
        }
      }
    } catch (error) {
      logForDebugging(`Tombstone removal abandoned: ${errorMessage(error)}`, { level: "warn" });
    }
  }
  async removeByUuidSlowV5(e, n, r, s, h) {
    let y = h;
    if (y === void 0) {
      let stats = await e.stat(n);
      if (!stats.ok) {
        if (stats.error.code !== "NotFound")
          logForDebugging(`Tombstone removal abandoned: stat failed (${stats.error.code})`, {
            level: "warn",
          });
        return;
      }
      ((s = stats.value.size), (y = stats.value.version));
    }
    if (s > KHe) {
      logForDebugging(`Skipping tombstone removal: session file too large (${formatFileSize(s)})`, {
        level: "warn",
      });
      return;
    }
    let S,
      w = [],
      L;
    for (;;) {
      let records = await e.readRecords(n, {
        order: "forward",
        ...(L !== void 0 && { fromSeq: L }),
        maxBytes: aMt,
      });
      if (!records.ok) {
        logForDebugging(`Tombstone removal abandoned: paging failed (${records.error.code})`, {
          level: "warn",
        });
        return;
      }
      let Z = !1;
      for (let item of records.value.items) {
        if (item.seq >= s) {
          Z = !0;
          break;
        }
        let str = Buffer.from(item.data.buffer, item.data.byteOffset, item.data.byteLength).toString("utf8"),
          sliced = str.slice(0, -1),
          Ae = !1;
        if (sliced.trim())
          try {
            Ae = jsonParseRaw(sliced).uuid === r;
          } catch {}
        if (Ae) {
          S ??= item.seq;
          continue;
        }
        if (S !== void 0) w.push({ data: str });
      }
      let nextSeq = records.value.nextSeq;
      if (Z || nextSeq === void 0 || nextSeq >= s) break;
      L = nextSeq;
    }
    if (S === void 0) return;
    let replaceRecords = await e.replaceRecords(n, w, {
      keepBefore: S,
      preserveFrom: s,
      publishDiscipline: "inPlace",
      precondition: y !== void 0 ? { type: "ifMatch", version: y } : { type: "none" },
    });
    if (!replaceRecords.ok && replaceRecords.error.code !== "NotFound")
      logForDebugging(`Tombstone removal abandoned on the paged path (${replaceRecords.error.code})`, {
        level: "warn",
      });
  }
  async performCompactTranscript(e, n, r, s, h = !1) {
    let y = s !== void 0 ? transcriptStorageKeyForPath(e) : void 0;
    if (isStorageV5Enabled() && s !== void 0 && y !== void 0)
      return this.performCompactTranscriptV5(s, y, e, h);
    if (isDiskless()) return;
    let S = `${e}.compact.tmp.${randomBytes(4).toString("hex")}`,
      w = !1,
      L = !1;
    try {
      let G = await stat(e);
      if (G.size < COMPACT_MIN_FILE_BYTES) return;
      let q = 4096,
        Z = [
          [0, Math.min(q, G.size)],
          [Math.max(0, Math.floor(G.size / 2) - q / 2), Math.min(q, G.size)],
          [Math.max(0, G.size - q), Math.min(q, G.size)],
        ],
        Se = async () => {
          let Et = await open(e, "r");
          try {
            let yt = [];
            for (let [gt, At] of Z) {
              let alloc = Buffer.alloc(At),
                Yt = 0;
              while (Yt < At) {
                let { bytesRead: bytesRead } = await Et.read(alloc, Yt, At - Yt, gt + Yt);
                if (bytesRead <= 0) break;
                Yt += bytesRead;
              }
              yt.push(alloc.subarray(0, Yt));
            }
            return yt;
          } finally {
            await Et.close().catch(() => {});
          }
        },
        ke = await Se(),
        we = async () => {
          let Et = await Se();
          return ke.some((yt, gt) => !Et[gt] || !yt.equals(Et[gt]));
        };
      {
        let Et = ke[2];
        if (!Et || Et.length === 0 || Et.at(-1) !== 10) {
          logEvent("tengu_transcript_compact_failed", { reason: lit_2("snapshot_mid_line") });
          return;
        }
      }
      let Ee = await scanCompactBoundaries(e, G.size);
      if (Ee === 0 || this.skipLowYieldCompact(e, G.size, Ee, !0)) return;
      let Ae = () => transcriptLines(createReadStream(e, { encoding: "utf8", end: G.size - 1 }));
      forceGcIfBun(h);
      let Ie = await readTranscriptEntries(Ae());
      if (Ie.kind === "skip") return;
      if (Ie.kind === "abort") {
        logEvent("tengu_transcript_compact_failed", { reason: fromEnum(Ie.reason) });
        return;
      }
      if (this.skipLowYieldCompact(e, G.size, Ie.reclaimableBytes)) return;
      let Me = makeLineEmitter(Ie.plan),
        We = await open(S, "w", 384),
        ze = "",
        lt = 0,
        Je = async (Et) => {
          (await writeFully(We, Et, null), (lt += Et.length));
        },
        nt = !1,
        pt = async (Et) => {
          if (
            ((ze +=
              ice(Et) +
              `
`),
            ze.length >= LITE_READ_BUF_SIZE)
          )
            (await Je(Buffer.from(ze, "utf8")), (ze = ""));
        };
      try {
        let Et = 0;
        for await (let At of Ae()) {
          for (let It of Me(Et, At)) await pt(It);
          Et++;
        }
        (await Je(Buffer.from(ze, "utf8")), n?.());
        let yt = await stat(e);
        if (yt.ino !== G.ino || yt.size < G.size || (await we())) {
          logEvent("tengu_transcript_compact_failed", { reason: lit_2("source_changed") });
          return;
        }
        if (yt.size > G.size) {
          let alloc = Buffer.alloc(yt.size - G.size),
            It = await open(e, "r"),
            Yt = 0;
          try {
            while (Yt < alloc.length) {
              let { bytesRead: bytesRead } = await It.read(alloc, Yt, alloc.length - Yt, G.size + Yt);
              if (bytesRead <= 0) break;
              Yt += bytesRead;
            }
          } finally {
            await It.close().catch(() => {});
          }
          if (Yt < alloc.length) {
            logEvent("tengu_transcript_compact_failed", { reason: lit_2("appended_rows_unread") });
            return;
          }
          while (Yt > 0 && alloc[Yt - 1] !== 10) Yt--;
          await Je(alloc.subarray(0, Yt));
        }
        await We.sync();
        let size = (await We.stat()).size;
        if (size !== lt) {
          logEvent("tengu_transcript_compact_failed", {
            reason: lit_2("staged_size_mismatch"),
            staged_bytes: size,
            written_bytes: lt,
          });
          return;
        }
        if ((r?.(), (await stat(e)).ino !== G.ino || (await we()))) {
          logEvent("tengu_transcript_compact_failed", { reason: lit_2("source_changed") });
          return;
        }
        ((nt = !0), await We.close());
      } finally {
        if (!nt) await We.close().catch(() => {});
      }
      if (((L = !0), await retryFsOp(S, e), (w = !0), e === this.sessionFile))
        for (let deletedUuid of Ie.plan.deletedUuids) this.sessionRowsDeleted.add(deletedUuid);
      if (
        (this.queuedToolResults.clear(),
        this.recordCompactYield(e, G.size, Ie.reclaimableBytes),
        e === this.sessionFile)
      )
        await this.reAppendSessionMetadataAsync(!1, !0).catch(() => {});
      logEvent("tengu_transcript_compact", { bytesBefore: G.size, bytesAfter: lt });
    } catch (error) {
      let q = getErrnoCode(error);
      (logEvent("tengu_transcript_compact_failed", {
        reason: L && q !== void 0 && AI.has(q) ? lit_2("rename_fallback") : lit_2("io"),
        error_code: sanitizedErrnoLowerForTelemetry(error),
      }),
        logForDebugging(`Transcript compact failed (${getErrnoCode(error)}): ${errorMessage(error)}`, {
          level: "warn",
        }));
    } finally {
      if (!w) await unlink(S).catch(() => {});
    }
  }
  async performCompactTranscriptV5(e, n, r, s) {
    let h = (y, S) => {
      logEvent("tengu_transcript_compact_failed", {
        reason: fromEnum(y),
        ...((y === "io" || y === "rename_fallback") && { error_code: sanitizedErrnoLowerForTelemetry(S) }),
      });
    };
    try {
      let stats = await e.stat(n, { witness: !0 });
      if (!stats.ok) {
        (h("io"),
          logForDebugging(
            `Transcript compact failed (${stats.error.code}): ${formatStorageError(stats.error)}`,
            { level: "warn" },
          ));
        return;
      }
      let size = stats.value.size,
        w = stats.value.tornTailBytes ?? 0;
      if (size + w < COMPACT_MIN_FILE_BYTES) return;
      if (w > 0) {
        h("snapshot_mid_line");
        return;
      }
      let L = -1,
        G = async function* () {
          let Ee;
          for (;;) {
            let records = await e.readRecords(n, {
              order: "forward",
              ...(Ee !== void 0 && { fromSeq: Ee }),
              maxBytes: ypo,
            });
            if (!records.ok)
              throw (
                logForDebugging(
                  `Transcript compact: storage read failed (${records.error.code}): ${formatStorageError(records.error)}`,
                  { level: "warn" },
                ),
                Error("transcript storage read failed", { cause: records.error })
              );
            for (let item of records.value.items) {
              if (item.seq >= size) return;
              L = item.seq;
              let str = Buffer.from(item.data.buffer, item.data.byteOffset, item.data.byteLength).toString(
                "utf8",
              );
              if (
                str.endsWith(`
`)
              )
                str = str.slice(0, -1);
              if (str.endsWith("\r")) str = str.slice(0, -1);
              yield str;
            }
            let nextSeq = records.value.nextSeq;
            if (nextSeq === void 0 || nextSeq >= size) return;
            Ee = nextSeq;
          }
        };
      forceGcIfBun(s);
      let q = await readTranscriptEntries(G());
      if (q.kind === "skip") return;
      if (q.kind === "abort") {
        h(q.reason);
        return;
      }
      if (this.skipLowYieldCompact(r, size, q.reclaimableBytes)) return;
      let Z = makeLineEmitter(q.plan),
        Se = async function* () {
          let Ee = 0;
          for await (let Ae of G()) {
            for (let Ie of Z(Ee, Ae))
              yield {
                data:
                  ice(Ie) +
                  `
`,
              };
            Ee++;
          }
        },
        replaceRecords = await e.replaceRecords(n, Se(), {
          preserveFrom: size,
          precondition: { type: "ifUnchangedThrough", seq: L, version: stats.value.version },
          publishDiscipline: "atomic",
          mode: 384,
          parent: "mustExist",
        });
      if (!replaceRecords.ok) {
        let error = replaceRecords.error;
        if (error.code === "PreconditionFailed") {
          h("source_changed");
          return;
        }
        let Ae = error.code === "Failed" || error.code === "Unavailable" ? error.telemetryCode : void 0;
        if (error.code === "InvalidArgument") {
          (h(error.argument.startsWith("opts.precondition") ? "invalid_token" : "invalid_argument"),
            logForDebugging(`Transcript compact skipped (${error.code}): ${formatStorageError(error)}`, {
              level: "warn",
            }));
          return;
        }
        let Ie =
          (error.code === "Failed" || error.code === "Unavailable") &&
          error.phase === "publish" &&
          Ae !== void 0 &&
          AI.has(Ae);
        (h(Ie ? "rename_fallback" : "io", { code: Ae }),
          logForDebugging(`Transcript compact failed (${Ae ?? error.code}): ${formatStorageError(error)}`, {
            level: "warn",
          }));
        return;
      }
      if (r === this.sessionFile)
        for (let deletedUuid of q.plan.deletedUuids) this.sessionRowsDeleted.add(deletedUuid);
      this.recordCompactYield(r, size, q.reclaimableBytes);
      let sizeAfter = replaceRecords.value.sizeAfter;
      if (r === this.sessionFile) await this.reAppendSessionMetadataAsync(!1, !0, e, !0).catch(() => {});
      logEvent("tengu_transcript_compact", { bytesBefore: size, bytesAfter: sizeAfter });
    } catch (error) {
      (h("io", error),
        logForDebugging(`Transcript compact failed (${getErrnoCode(error)}): ${errorMessage(error)}`, {
          level: "warn",
        }));
    }
  }
  skipLowYieldCompact(e, n, r, s = !1) {
    if (!this.store.lowYieldCompactSkipEnabled || !isLowYieldCompaction(n, r)) return !1;
    return (
      this.recordCompactYield(e, n, r),
      logEvent("tengu_transcript_compact_skipped", {
        bytesBefore: n,
        reclaimableBytes: r,
        ...(s && { reclaimableBytesIsUpperBound: !0 }),
      }),
      !0
    );
  }
  recordCompactYield(e, n, r) {
    if (((this.bytesSinceCompact = 0), e === this.sessionFile))
      this.backstopThresholdBytes = isLowYieldCompaction(n, r)
        ? Math.min(this.backstopThresholdBytes * 2, Spo)
        : LG;
  }
  shouldSkipPersistence() {
    return isTranscriptPersistenceDisabled() || this.appendsSealedForShutdown;
  }
  appendsSealedForShutdown = !1;
  sealAppendsForShutdown() {
    this.appendsSealedForShutdown = !0;
  }
  async materializeSessionFile(e) {
    if (this.shouldSkipPersistence()) return;
    try {
      this.ensureCurrentSessionFile();
      try {
        await this.reAppendSessionMetadataAsync(!1, !1, e);
      } catch (error) {
        swallowRefusedDirectWrite(error);
      }
      if (this.pendingEntries.length > 0) {
        let pendingEntries = this.pendingEntries;
        this.pendingEntries = [];
        for (let { entry: entry, storageV5: storageV5 } of pendingEntries)
          await this.appendEntry(entry, void 0, void 0, storageV5);
        if (this.currentSessionRelocatedCwd) await this.reAppendSessionMetadataAsync(!0, !1, e);
      }
    } catch (error) {
      let r = getErrnoCode(error);
      if (isSyscallError(error))
        logForDebugging(`Session file materialize failed (${r}): ${errorMessage(error)}`, { level: "error" });
      else logError(error);
      reportTranscriptWriteFailure(this.store.writerHealth, "materialize", error, this.sessionFile);
    }
    try {
      this.store.sessionFileMaterialized.emit();
    } catch (error) {
      if (isSyscallError(error))
        logForDebugging(
          `Session file materialize listener failed (${getErrnoCode(error)}): ${errorMessage(error)}`,
          { level: "error" },
        );
      else logError(error);
    }
  }
  releaseHeldReplayRecords() {
    let heldReplayRecords = this.heldReplayRecords;
    return (
      (this.heldReplayRecords = []),
      this.trackWrite(async () => {
        for (let { records: records, resolve: resolve, reject: reject } of heldReplayRecords)
          await this.writeRequestReplayRecords(records).then(resolve, reject);
      })
    );
  }
  settleHeldReplayRecords() {
    for (let { resolve: resolve } of this.heldReplayRecords) resolve("no_transcript");
    this.heldReplayRecords = [];
  }
  async insertMessageChain(e, n = !1, r, s, h, y, S, w, L, G, q) {
    let Z = y ?? getSessionId(),
      Se = S ?? isForeignToBinding(pinSessionId(Z)),
      ke = L === void 0 ? (bridgeSessionForPulledWindow(pinSessionId(Z)) ?? null) : L,
      we = G ?? K9(),
      Ee = q === void 0 ? getPromptId_2() : q;
    return this.trackWrite(async () => {
      let Ae = s ?? null,
        Ie;
      if (
        this.sessionFile === null &&
        Z === getSessionId() &&
        e.some((nt) => nt.type === "user" || nt.type === "assistant" || nt.type === "system")
      )
        ((this.awaitingFirstUserRow = !0), await this.materializeSessionFile(w));
      let Me;
      try {
        Me = await getBranch();
      } catch {
        Me = void 0;
      }
      refreshCheckoutMetadata();
      let We = Z,
        ze = getPlanSlugCache().get(We),
        lt = n || this.shouldSkipPersistence() ? null : await this.store.sessionMessages(We, w);
      if (!n && !Se && this.sessionFile !== null && Z === getSessionId()) {
        let nt = getConversationAtisLatch();
        if (
          nt !== void 0 &&
          this.atisLatchStamp !==
            `${this.sessionFile}
${nt}`
        )
          ((this.atisLatchStamp = `${this.sessionFile}
${nt}`),
            await this.appendEntry({ type: "atis-latch", atis: nt, sessionId: We }, We, void 0, w));
      }
      if (!Se && this.sessionFile !== null && Z === getSessionId()) {
        let nt = getConversationToolsUsed(),
          pt = `${this.sessionFile}
${nt.generation()}`;
        if (isSillyShoreGateOn() && nt.size() > 0 && this.toolsUsedStamp !== pt)
          (await this.appendEntry({ type: "tools-used", tools: nt.names(), sessionId: We }, We, void 0, w),
            (this.toolsUsedStamp = pt));
      }
      let Je = !1;
      for (let nt of e) {
        let pt = isCompactBoundaryMessage_3(nt),
          Et = !n && Z === getSessionId() ? this.sessionFile : null;
        if (pt && Et)
          ((this.compactAwaitingSummary = { filePath: Et, storageV5: w }),
            (this.sessionLastBoundaryUuid = nt.uuid),
            (Je = !1));
        let yt = Ae;
        if (nt.type === "user" && "sourceToolAssistantUUID" in nt && nt.sourceToolAssistantUUID) {
          let sourceToolAssistantUUID = nt.sourceToolAssistantUUID;
          if (lt === null || lt.has(sourceToolAssistantUUID)) yt = sourceToolAssistantUUID;
          else logEvent("tengu_phantom_parent_write", {});
        }
        if (yt === nt.uuid) logEvent("tengu_chain_self_reference_write", {});
        let gt = {
          parentUuid: pt ? null : yt,
          logicalParentUuid: pt ? Ae : void 0,
          isSidechain: n,
          teamName: h?.teamName,
          agentName: h?.agentName,
          promptId: nt.type === "user" ? (Ee ?? void 0) : void 0,
          agentId: r,
          ...withTaskProducerMarkRecorded(nt),
          ...transcriptStamp(We),
          version: vOt(nt),
          gitBranch: Me,
          slug: ze,
        };
        if (((gt.isSidechain = n), n)) gt.agentId = r;
        if (gt.type === "user" && gt.toolUseResult != null)
          gt.toolUseResult = dropLargeOriginalFile(gt.toolUseResult);
        if (
          (await this.appendEntry(gt, Z, Se, w, ke, we),
          this.awaitingFirstUserRow &&
            !n &&
            Z === getSessionId() &&
            nt.type === "user" &&
            !Apo(nt.message.content))
        )
          this.awaitingFirstUserRow = !1;
        if (pt && Et) this.backstopThresholdBytes = LG;
        if (Et && (nt.type === "user" || nt.type === "assistant")) Je = !0;
        if (isChainParticipant(nt)) ((Ae = nt.uuid), (Ie = nt.timestamp));
      }
      if (Je && this.compactAwaitingSummary) {
        let { filePath: filePath, storageV5: storageV5 } = this.compactAwaitingSummary;
        if (((this.compactAwaitingSummary = void 0), filePath === this.sessionFile))
          this.requestCompact(filePath, storageV5, !0);
      }
      if (!n && Z === getSessionId()) {
        if (Ae && Ie && (!this.currentSessionLeafTs || Ie >= this.currentSessionLeafTs))
          ((this.currentSessionLeafUuid = Ae), (this.currentSessionLeafTs = Ie));
        let nt = getFirstMeaningfulUserMessageTextContent(e);
        if (nt) this.currentSessionLastPrompt = this.normalizeLastPrompt(nt);
      }
      if (!this.awaitingFirstUserRow && this.sessionFile !== null && this.heldReplayRecords.length > 0)
        await this.releaseHeldReplayRecords();
    });
  }
  async insertFileHistorySnapshot(e, n, r, s) {
    return this.trackWrite(async () => {
      let h = { type: "file-history-snapshot", messageId: e, snapshot: n, isSnapshotUpdate: r };
      await this.appendEntry(h, void 0, void 0, s);
    });
  }
  async insertFileHistoryDelta(e, n) {
    return this.trackWrite(async () => {
      await this.appendEntry(e, void 0, void 0, n);
    });
  }
  async insertQueueOperation(e, n) {
    return this.trackWrite(async () => {
      let r = Vt(e.sessionId);
      if (r === null || r === this.store.getSessionId()) {
        await this.appendEntry(e, void 0, void 0, n);
        return;
      }
      let s = this.queueOperationsRaisedElsewhere.then(async () => {
        if ((await this.getExistingSessionFile(r, n)) !== null) await this.appendEntry(e, r, void 0, n);
      });
      ((this.queueOperationsRaisedElsewhere = s.catch(() => {})), await s);
    });
  }
  async insertAttributionSnapshot(e, n) {
    return this.trackWrite(async () => {
      await this.appendEntry(e, void 0, void 0, n);
    });
  }
  async insertContentReplacement(e, n, r) {
    return this.trackWrite(async () => {
      let s = {
        type: "content-replacement",
        sessionId: this.store.getSessionId(),
        agentId: n,
        replacements: e,
      };
      await this.appendEntry(s, void 0, void 0, r);
    });
  }
  replaySources = new Map();
  queuedToolResults = new Map();
  oversizeReplayShapes = new Set();
  queuedToolResultDigest(e, n) {
    if (e.storageV5 !== void 0 || e.sessionId !== this.store.getSessionId()) return;
    let r = e.agentId ? agentTranscriptPathOfEntry(e.agentId) : this.sessionFile;
    return r
      ? this.queuedToolResults.get(`${r}
${n}`)
      : void 0;
  }
  restartReplayIndex(e, n = !1) {
    if ((this.store.replaySeedStarts.delete(normalize(e)), !isRequestBlobStoreEnabled())) return;
    let r = (h) => ({ index: (h?.index ?? new RequestBlobStore()).successor(n), fileExisted: !0 }),
      s = this.replaySources.get(e);
    this.replaySources.set(e, s === void 0 ? Promise.resolve(r()) : s.then(r));
  }
  replayIndexFor(e) {
    let n = this.replaySources.get(e);
    if (n === void 0) {
      let r = normalize(e);
      ((n = seedReplayIndex(e, this.store.replaySeedStarts.get(r))),
        this.store.replaySeedStarts.delete(r),
        this.replaySources.set(e, n));
    }
    return n;
  }
  async replayTargetFile(e) {
    let n =
      e.sessionId === this.store.getSessionId()
        ? this.sessionFile
        : await this.getExistingSessionFile(e.sessionId, e.storageV5);
    if (n === null || n === void 0) return;
    return e.agentId ? agentTranscriptPathOfEntry(e.agentId) : n;
  }
  isRemotelyMirrored() {
    return this.internalEventWriter !== null || (isEnvTruthy("true") && Boolean(this.remoteIngressUrl));
  }
  async appendRequestReplayRecords(e) {
    if (!e.target.agentId && (this.sessionFile === null || this.awaitingFirstUserRow)) {
      let n = stripCacheControl_4(e.shape),
        r = clone(e.request.cacheControl),
        s = { ...e.request, cacheControl: r };
      return new Promise((h, y) => {
        this.heldReplayRecords.push({ records: { ...e, shape: n, request: s }, resolve: h, reject: y });
      });
    }
    return this.writeRequestReplayRecords(e);
  }
  async writeRequestReplayRecords(e) {
    return this.trackWrite(async () => {
      let { target: target, request: request } = e;
      if (this.shouldSkipPersistence()) return "no_transcript";
      if (this.oversizeReplayShapes.has(e.shapeHash)) return "shape_too_large";
      let replayTargetFile = await this.replayTargetFile(target);
      if (replayTargetFile === void 0) return "no_transcript";
      let { index: index, fileExisted: fileExisted } = await this.replayIndexFor(replayTargetFile);
      if ((!fileExisted && !index.hasLines) || index.hasForkContextRef) return "no_transcript";
      let S = [];
      if (!index.has(e.shapeHash)) {
        let w = {
          type: "api-request-shape",
          sessionId: request.sessionId,
          ...(request.agentId !== void 0 && { agentId: request.agentId }),
          shapeHash: e.shapeHash,
          timestamp: request.timestamp,
          version: request.version,
          shape: stripCacheControl_4(e.shape),
        };
        if (Buffer.byteLength(jsonStringify(w)) > mpo)
          return (
            this.oversizeReplayShapes.add(e.shapeHash),
            logError(
              Error(
                "request-replay: system+tools over the record size cap; not recording requests that use them",
              ),
            ),
            "shape_too_large"
          );
        (S.push(w), index.noteLine(w));
      }
      for (let { hash: hash, message: message } of e.blobCandidates)
        if (!index.has(hash)) {
          let G = {
            type: "api-request-blob",
            sessionId: request.sessionId,
            ...(request.agentId !== void 0 && { agentId: request.agentId }),
            hash: hash,
            message: message,
          };
          (S.push(G), index.noteLine(G));
        }
      return (
        await Promise.all(
          [...S, request].map((w) => this.appendEntry(w, target.sessionId, void 0, target.storageV5)),
        ),
        "written"
      );
    });
  }
  async appendEntry(e, n = this.store.getSessionId(), r, s, h, y) {
    if ("agentId" in e && e.agentId) this.noteAgentWrittenLocally(e.agentId);
    if (this.shouldSkipPersistence()) return;
    if (isTranscriptMessage(e) && VHe(e) && (r === !0 || isForeignToBinding(pinSessionId(n))))
      this.foreignWithheldEntryUuids.add(e.uuid);
    if (isTranscriptMessage(e) && !e.isSidechain) {
      let G = imo((y ?? K9())?.get(e.uuid)),
        q = G ?? (VHe(e) ? (h === void 0 ? bridgeSessionForPulledWindow(pinSessionId(n)) : h) : void 0);
      if (q !== void 0 && q !== null) {
        if (G !== void 0) this.windowNoteEntryUuids.delete(e.uuid);
        else if (e.foreignToBridgeSession === void 0 && tBe(e)) this.windowNoteEntryUuids.add(e.uuid);
        e.foreignToBridgeSession = q;
      }
    }
    if (this.relocationBuffer) {
      this.relocationBuffer.push({
        entry: e,
        sessionId: n,
        storageV5: s,
        foreignAtEntry: r,
        pulledAtEntry: h,
        pulledRowsAtEntry: y,
      });
      return;
    }
    let sessionId = this.store.getSessionId(),
      w = n === sessionId,
      L;
    if (w) {
      if (this.sessionFile === null) {
        this.pendingEntries.push({ entry: e, storageV5: s });
        return;
      }
      L = this.sessionFile;
    } else {
      let existingSessionFile = await this.getExistingSessionFile(n, s);
      if (!existingSessionFile) {
        logError(
          withTelemetryMessage(
            Error(`appendEntry: session file not found for other session ${n}`),
            "appendEntry: session file not found for other session (id not reported); entry not written",
          ),
        );
        return;
      }
      L = existingSessionFile;
    }
    switch (ENTRY_APPEND_POLICY[e.type]) {
      case "always": {
        this.enqueueWrite(L, e, s);
        return;
      }
      case "route-by-agent": {
        let G =
          (e.type === "content-replacement" ||
            e.type === "api-request-shape" ||
            e.type === "api-request-blob" ||
            e.type === "api-request" ||
            e.type === "fork-context-ref" ||
            e.type === "observer-ref") &&
          e.agentId
            ? agentTranscriptPathOfEntry(e.agentId)
            : L;
        if (G === void 0) {
          logError(Error("appendEntry invariant: agentId cannot name a transcript file; entry dropped"));
          return;
        }
        if ((this.enqueueWrite(G, e, s), e.type === "fork-context-ref" && isRequestBlobStoreEnabled()))
          this.replayIndexFor(G).then(({ index: index }) => index.noteLine(e));
        return;
      }
      case "dedup-transcript": {
        if (e.type !== "progress" && !isTranscriptMessage(e)) {
          logError(
            Error(`appendEntry invariant: dedup-transcript policy on non-transcript type '${e.type}'`),
          );
          return;
        }
        let sessionMessages = await this.store.sessionMessages(n, s),
          q = e.isSidechain && e.agentId !== void 0,
          Z = q ? agentTranscriptPathOfEntry(e.agentId) : L;
        if (Z === void 0) {
          logError(Error("appendEntry invariant: agentId cannot name a transcript file; entry dropped"));
          return;
        }
        let Se;
        if (!this.appendsSealedForShutdown && isRequestBlobStoreEnabled())
          try {
            Se = (await this.replayIndexFor(Z)).index;
          } catch (error) {
            logError(error);
          }
        let ke = !sessionMessages.has(e.uuid);
        if (q || ke) {
          this.enqueueWrite(Z, q || s !== void 0 ? e : (this.store.slimAppendedRow?.(e) ?? e), s);
          try {
            if (Se !== void 0) {
              if ((Se.noteLine(e), isCompactBoundaryMessage_3(e))) b9();
              for (let [we, Ee] of getToolResultDigests(e))
                this.queuedToolResults.set(
                  `${Z}
${we}`,
                  Ee,
                );
            }
          } catch (error) {
            logError(error);
          }
          if (!q) {
            if ((sessionMessages.add(e.uuid), isTranscriptMessage(e)))
              if (this.internalEventWriter && isShuttingDown())
                (this.releaseWaitsForUploads(), this.persistToRemote(n, e));
              else await this.untilUploadedOrShutdown(this.persistToRemote(n, e));
          } else if (this.internalEventWriter && isTranscriptMessage(e)) this.persistToRemote(n, e);
        }
        return;
      }
    }
  }
  beginTranscriptRelocation() {
    this.relocationBuffer ??= [];
  }
  isTranscriptRelocationInProgress() {
    return this.relocationBuffer !== null;
  }
  async endTranscriptRelocation() {
    let relocationBuffer = this.relocationBuffer;
    if (((this.relocationBuffer = null), !relocationBuffer)) return;
    for (let {
      entry: entry,
      sessionId: sessionId,
      storageV5: storageV5,
      foreignAtEntry: foreignAtEntry,
      pulledAtEntry: pulledAtEntry,
      pulledRowsAtEntry: pulledRowsAtEntry,
    } of relocationBuffer)
      await this.appendEntry(entry, sessionId, foreignAtEntry, storageV5, pulledAtEntry, pulledRowsAtEntry);
  }
  ensureCurrentSessionFile() {
    if (this.sessionFile === null) {
      let e = getTranscriptPath();
      return (this.setSessionFile(e), this.sessionFilesNotYetWritten.add(e), e);
    }
    return this.sessionFile;
  }
  noteSessionFileMoving(e, n) {
    if (this.sessionFilesNotYetWritten.delete(e)) this.sessionFilesNotYetWritten.add(n);
  }
  existingSessionFiles = new Map();
  sessionFilesNotYetWritten = new Set();
  foreignWithheldEntryUuids = new Set();
  windowNoteEntryUuids = new Set();
  recordedSessionFile(e) {
    return this.existingSessionFiles.get(e);
  }
  async getExistingSessionFile(e, n) {
    let r = this.existingSessionFiles.get(e);
    if (r) {
      if (this.sessionFilesNotYetWritten.has(r)) return r;
      return (await this.probeTranscript(r, n).catch(() => "unknown")) === "absent" ? null : r;
    }
    let s = getTranscriptPathForSession(e);
    if ((await this.probeTranscript(s, n)) === "present") return (this.existingSessionFiles.set(e, s), s);
    return null;
  }
  async probeTranscript(e, n) {
    let r = n !== void 0 ? transcriptStorageKeyForPath(e) : void 0;
    if (isStorageV5Enabled() && n !== void 0 && r !== void 0)
      try {
        let statMeta = await n.statMeta(r);
        if (statMeta.ok) return "present";
        if (statMeta.error.code === "NotFound") return "absent";
      } catch {}
    if (isDiskless()) return "unknown";
    try {
      return (await stat(e), "present");
    } catch (error) {
      let h = getErrnoCode(error);
      if (h === "ENOENT" || h === "ENOTDIR") return "absent";
      if (isFsInaccessible(error)) return "unknown";
      throw error;
    }
  }
  async persistToRemote(e, n) {
    if (this.appendsSealedForShutdown) return;
    if (isShuttingDown() && !this.internalEventWriter) return;
    let r = isRowForeignToBridgeSession(n, this.internalEventWriterSessionId);
    if (r && !this.windowNoteEntryUuids.delete(n.uuid)) {
      logForDebugging("[persist-remote] Skipping upload: the row is the /teleport-pulled conversation's");
      return;
    }
    if (
      VHe(n) &&
      (r || this.foreignWithheldEntryUuids.delete(n.uuid) || isRemoteEgressSuppressedFor(pinSessionId(e)))
    ) {
      if (!tBe(n)) {
        logForDebugging(
          "[persist-remote] Skipping compact-pair upload: conversation carries a history-suppression taint",
        );
        return;
      }
      (logForDebugging(
        "[persist-remote] Emptying a carried note for upload: its conversation is withheld from this session",
      ),
        (n = {
          ...n,
          attachment: cOt(n)
            ? { type: "projects_thread_ask", call: null }
            : { type: "session_cron_carry", tasks: [] },
        }));
    }
    if (this.internalEventWriter) {
      try {
        await this.internalEventWriter("transcript", n, {
          ...(isCompactBoundaryMessage_3(n) && {
            isCompaction: !0,
            preservedEventIds: n.compactMetadata?.preservedMessages?.uuids,
          }),
          ...(n.agentId && { agentId: n.agentId }),
        });
      } catch {
        (logEvent("tengu_session_persistence_failed", {}),
          logForDebugging("Failed to write transcript as internal event"));
      }
      return;
    }
    if (!isEnvTruthy("true") || !this.remoteIngressUrl) return;
    if (!(await appendSessionLog(e, n, this.remoteIngressUrl)))
      (logEvent("tengu_session_persistence_failed", {}), gracefulShutdownSync(1, "other"));
  }
  async mirrorInternalEntry(e) {
    if (isRemoteEgressSuppressedFor(pinSessionId(this.store.getSessionId()))) {
      let n = e;
      if (n.type !== "last-prompt" || n.explicit !== !0) return !1;
      let { lastPrompt: lastPrompt, ...s } = e;
      e = s;
    }
    if (!this.internalEventWriter || isShuttingDown()) return !1;
    try {
      await this.internalEventWriter(e.type, e, {});
    } catch (error) {
      throw (
        logEvent("tengu_session_persistence_failed", {}),
        logForDebugging("Failed to mirror internal entry to CCR"),
        error
      );
    }
    return !0;
  }
  hasInternalEventWriter() {
    return this.internalEventWriter !== null;
  }
  async mirrorWorkerEvent(e, n, { sessionId: r, agentId: s }) {
    if (this.shouldSkipPersistence() || isRemoteEgressSuppressedFor(r)) return !1;
    if (!this.internalEventWriter || isShuttingDown()) return !1;
    return (await this.internalEventWriter(e, n, { agentId: s }), !0);
  }
  setRemoteIngressUrl(e) {
    if (((this.remoteIngressUrl = e), logForDebugging(`Remote persistence enabled with URL: ${e}`), e))
      this.FLUSH_INTERVAL_MS = REPLAY_INDEX_SCAN_LIMIT;
  }
  setInternalEventWriter(e, n) {
    ((this.internalEventWriter = e),
      (this.internalEventWriterSessionId = n),
      logForDebugging("CCR v2 internal event writer registered for transcript persistence"),
      (this.FLUSH_INTERVAL_MS = REPLAY_INDEX_SCAN_LIMIT));
  }
  clearInternalEventWriter() {
    if (!this.internalEventWriter) return;
    ((this.internalEventWriter = null), logForDebugging("CCR v2 internal event writer cleared"));
  }
  setInternalEventReader(e) {
    ((this.internalEventReader = e),
      logForDebugging("CCR v2 internal event reader registered for session resume"));
  }
  setInternalSubagentEventReader(e) {
    ((this.internalSubagentEventReader = e),
      logForDebugging("CCR v2 subagent event reader registered for session resume"));
  }
  getInternalEventReader() {
    return this.internalEventReader;
  }
  getInternalSubagentEventReader() {
    return this.internalSubagentEventReader;
  }
  setInternalAgentEventReader(e) {
    this.internalAgentEventReader = e;
  }
  setAgentWorkerEventReader(e) {
    this.agentWorkerEventReader = e;
  }
  getAgentWorkerEventReader() {
    return this.agentWorkerEventReader;
  }
  hasInternalAgentEventReader() {
    return this.internalAgentEventReader !== null;
  }
  noteAgentWrittenLocally(e) {
    if (this.internalAgentEventReader !== null) this.agentIdsWrittenLocally.add(e);
  }
  hasWrittenAgentLocally(e) {
    return this.agentIdsWrittenLocally.has(e);
  }
  setVerifiesAgentTranscripts(e) {
    this.verifiesAgentTranscripts = e;
  }
  mustVerifyAgentTranscript(e) {
    return this.verifiesAgentTranscripts && !this.agentIdsWrittenLocally.has(e);
  }
  noteAgentOverBound(e) {
    this.agentIdsOverBound.add(e);
  }
  isAgentOverBound(e) {
    return this.agentIdsOverBound.has(e);
  }
  async hydrateAgentTranscriptOnDemand(e, n, r, s = !1) {
    let internalAgentEventReader = this.internalAgentEventReader;
    if (internalAgentEventReader === null) return "no_reader";
    if (!G$(e)) return "unsafe_id";
    if (this.agentIdsOverBound.has(e)) throw new AgentTranscriptFetchError("over_bound");
    if (this.agentIdsFetched.has(e)) return "already_fetched";
    let y = this.agentIdsWrittenLocally.has(e),
      S = this.agentTranscriptFetches.get(e);
    if (S)
      try {
        return await S;
      } catch (error) {
        if (!isAbortError(error) || r?.aborted) throw error;
      }
    let agentTranscriptOnce = this.fetchAgentTranscriptOnce(internalAgentEventReader, e, n, r, y, s);
    this.agentTranscriptFetches.set(e, agentTranscriptOnce);
    try {
      return await agentTranscriptOnce;
    } finally {
      if (this.agentTranscriptFetches.get(e) === agentTranscriptOnce) this.agentTranscriptFetches.delete(e);
    }
  }
  async fetchAgentTranscriptOnce(e, n, r, s, h, y) {
    if (h && wrapStorageSource(getStorageTargetForPath(getAgentTranscriptPath(n), r)))
      return (
        this.agentIdsFetched.add(n),
        logForDiagnosticsNoPII("info", "subagent_lazy_fetch", {
          outcome: "backend_no_create",
          written_locally: !0,
        }),
        "backend_no_create"
      );
    let now = Date.now(),
      w = "read_fail",
      L,
      G,
      q,
      Z;
    try {
      let Se;
      if (y && (await readAgentMetadata(n, r).catch(() => null)) !== null) {
        let Me = await openRegularFile(getAgentTranscriptPath(n)).catch(() => null),
          We = Me && (await tailFile(Me, 65536).catch(() => null));
        await Me?.close().catch(() => {});
        let ze = We?.content
          .split(
            `
`,
          )
          .findLast(isConversationLine);
        Se = ze && extractLastSyncedEventUuid(ze);
      }
      let ke = null;
      if (Se !== void 0)
        if (((ke = await e(n, s, Se).catch((Me) => (logError(Me), null))), ke === null))
          Z = s?.aborted ? "aborted" : "failed";
        else if (ke.anchorFallback) Z = `anchor-${ke.anchorFallback}`;
        else
          Z =
            ke.overBound ||
            ke.encodedBody ||
            ke.events.some(
              (event) => isConversationEntry(event.payload) || event.payload?.subtype === "compact_boundary",
            )
              ? "not-current"
              : "current";
      if (Z !== "current" && !ke?.anchorFallback) ke = await e(n, s).catch((Me) => (logError(Me), null));
      if (ke === null) {
        if (s?.aborted) throw ((w = "aborted"), new AbortError_2());
        throw new AgentTranscriptFetchError("read_fail");
      }
      if (((L = ke.stats?.pageCount), ke.overBound))
        throw (
          (w = "over_bound"),
          this.agentIdsOverBound.add(n),
          new AgentTranscriptFetchError("over_bound")
        );
      if (ke.encodedBody) throw ((w = "body_encoded"), new AgentTranscriptFetchError("body_encoded"));
      let we = await transcriptContextFields(),
        mapped = ke.events
          .filter((event) => event.session_agent_id === n)
          .map((Me) => fillMissingTranscriptFields(Me.payload, we));
      if (((G = mapped.length), mapped.length === 0 && ke.events.length > 0))
        throw ((w = "unfiltered"), new AgentTranscriptFetchError("unfiltered"));
      let last = mapped.findLast(isConversationEntry),
        Ie = new Set();
      if (y && last !== void 0)
        await someLineMatches(getAgentTranscriptPath(n), (Me) => {
          for (let We of collectTailUuids(Me)) Ie.add(We);
          return !1;
        }).catch((Me) => {
          throw (
            (w = "local_read_fail"),
            (q = sanitizedErrnoLowerForTelemetry(Me)),
            new AgentTranscriptFetchError(w, { cause: Me })
          );
        });
      if (!h && this.agentIdsWrittenLocally.has(n)) return ((w = "superseded"), w);
      if (y) {
        let Me =
          last === void 0 || Ie.has(last.uuid)
            ? []
            : mapped.filter((lt) => lt.type !== "agent_metadata" && !Ie.has(lt.uuid));
        if (
          ((w = "write_fail"),
          (await appendToTranscriptFile(getAgentTranscriptPath(n), jsonlJoin(Me), r, !0).catch((lt) => {
            throw (
              (q = sanitizedErrnoLowerForTelemetry(lt)),
              new AgentTranscriptFetchError("write_fail", { cause: lt })
            );
          })) === "skipped")
        )
          throw new AgentTranscriptFetchError("write_fail");
        let last_2 = mapped.findLast((lt) => lt.type === "agent_metadata");
        if (last_2 !== void 0 && this.keepsAgentMetadataInStream())
          await restoreAgentSidecarFromStream(n, last_2, r);
        w = Me.length > 0 ? "hit" : last === void 0 && Z !== "current" ? "empty" : "local_current";
      } else if (mapped.some(isConversationEntry))
        ((w = "write_fail"),
          (w =
            (await writeHydratedAgentTranscript(n, mapped, r, { createOnly: h }).catch((We) => {
              throw new AgentTranscriptFetchError("write_fail", { cause: We });
            })) === "exists"
              ? "superseded"
              : "hit"));
      else w = "empty";
      return (this.agentIdsFetched.add(n), w);
    } finally {
      if (w === "hit" || w === "empty" || w === "local_current" || w === "superseded")
        logFeatureOk("ccr_subagent_lazy_fetch");
      else if (w !== "aborted") logFeatureBad("ccr_subagent_lazy_fetch", w);
      logForDiagnosticsNoPII("info", "subagent_lazy_fetch", {
        outcome: w,
        written_locally: h,
        verify_local: y,
        probe: Z,
        errno: q,
        page_count: L,
        event_count: G,
        duration_ms: Date.now() - now,
      });
    }
  }
}
//@ chunk-e6aww6q8.js:407532-407706 facade-majority
function readAtTranscriptEntry(e, n) {
  let r = getSessionId();
  return {
    cleanedMessages: cleanMessagesForLogging(e, n),
    sessionId: r,
    foreignAtEntry: isForeignToBinding(pinSessionId(r)),
    pulledAtEntry: bridgeSessionForPulledWindow(pinSessionId(r)) ?? null,
    pulledRowsAtEntry: K9(),
    promptIdAtEntry: getPromptId_2(),
  };
}
/**
 * 记录一组消息到当前会话转录：清理消息后交给 Project.insertMessageChain，建立 parentUuid 链（压缩边界的 parentUuid 置空并记 logicalParentUuid），检测幻影父节点（tengu_phantom_parent_hint）。
 */
//@ chunk-e6aww6q8.js:407706-408232 facade-majority = recordTranscript (0.261)
async function recordTranscript(
  e,
  n,
  r,
  s,
  h,
  {
    cleanedMessages: y,
    sessionId: S,
    foreignAtEntry: w,
    pulledAtEntry: L,
    pulledRowsAtEntry: G,
    promptIdAtEntry: q,
  } = readAtTranscriptEntry(e, s),
) {
  let sessionId = getProject();
  return sessionId.recordInTurn(S, void 0, async () => {
    let sessionMessages = await su().sessionMessages(S, h),
      newMessages = [],
      startingParentUuid = r;
    if (startingParentUuid && !isTranscriptPersistenceDisabled() && !sessionMessages.has(startingParentUuid))
      logEvent("tengu_phantom_parent_hint", {});
    let Ee = !1;
    for (let Ie of y)
      if (sessionMessages.has(Ie.uuid)) {
        if (!Ee && isChainParticipant(Ie) && !OB(Ie.uuid)) startingParentUuid = Ie.uuid;
      } else (newMessages.push(Ie), (Ee = !0));
    if (newMessages.length > 0)
      await sessionId.insertMessageChain(newMessages, !1, void 0, startingParentUuid, n, S, w, h, L, G, q);
    return newMessages.findLast(isChainParticipant)?.uuid ?? startingParentUuid ?? null;
  });
}
/**
 * 追加 last-prompt 记录：叶子 uuid 与最后一条提示，用于 resume 选取叶子与列表显示。
 */
//@ chunk-e6aww6q8.js:408232-408523 facade-majority
async function persistLeafCheckpoint(e, n, r) {
  let s = getProject();
  ((s.currentSessionLeafUuid = e ?? void 0),
    (s.currentSessionLeafTs = new Date().toISOString()),
    await s.appendEntry(
      {
        type: "last-prompt",
        ...(s.currentSessionLastPrompt && { lastPrompt: s.currentSessionLastPrompt }),
        leafUuid: e,
        explicit: !0,
        ...n,
        sessionId: getSessionId(),
      },
      void 0,
      void 0,
      r,
    ));
}
//@ chunk-e6aww6q8.js:408523-408635 facade-majority
function queueLeafCheckpointWithdrawal() {
  getProject().queueLeafCheckpointWithdrawal({
    type: "last-prompt",
    leafUuid: null,
    explicit: !0,
    sessionId: getSessionId(),
  });
}
//@ chunk-e6aww6q8.js:408635-408833 facade-majority
async function mirrorLeafCheckpointToRemote(e, n) {
  let r = getProject();
  await r.mirrorInternalEntry({
    type: "last-prompt",
    ...(r.currentSessionLastPrompt && { lastPrompt: r.currentSessionLastPrompt }),
    leafUuid: e,
    explicit: !0,
    ...n,
    sessionId: getSessionId(),
  });
}
//@ chunk-e6aww6q8.js:408833-408932 facade-majority
function mirrorCustomTitleToRemote(e, n) {
  return getProject().mirrorInternalEntry({ type: "custom-title", customTitle: n, sessionId: e });
}
//@ chunk-e6aww6q8.js:408932-408984 facade-majority
function hasRemoteWorkerEventLog() {
  return getProject().hasInternalEventWriter();
}
//@ chunk-e6aww6q8.js:408984-409041 facade-majority
function mirrorWorkerEventToRemote(e, n, r) {
  return getProject().mirrorWorkerEvent(e, n, r);
}
/**
 * 记录子代理（sidechain）消息：isSidechain=true、带 agentId，写入 subagents/agent-<id>.jsonl。
 */
//@ chunk-e6aww6q8.js:409041-409221 facade-majority = recordSidechainTranscript (0.678)
async function recordSidechainTranscript(e, n, r, s) {
  let h = getSessionId(),
    y = isForeignToBinding(pinSessionId(h)),
    S = bridgeSessionForPulledWindow(pinSessionId(h)) ?? null,
    w = K9(),
    L = getPromptId_2(),
    G = cleanMessagesForLogging(e),
    q = getProject();
  await q.recordInTurn(h, n, () => q.insertMessageChain(G, !0, n, r, void 0, h, y, s, S, w, L));
}
//@ chunk-e6aww6q8.js:409221-409316 facade-majority = recordContextCollapseSnapshot (0.517)
async function recordForkContextRef(e, n) {
  await getProject().appendEntry({ type: "fork-context-ref", ...e }, void 0, void 0, n);
}
//@ chunk-e6aww6q8.js:409316-409387 facade-majority = recordContextCollapseCommit (1)
async function recordArtifactAutoReactLedger(e, n) {
  await getProject().appendEntry(e, e.sessionId, void 0, n);
}
//@ chunk-e6aww6q8.js:409387-409455 facade-majority = recordContextCollapseCommit (1)
function recordCostState(e, n) {
  getProject()
    .appendEntry(e, e.sessionId, void 0, n)
    .catch(logError);
}
//@ chunk-e6aww6q8.js:409455-409464 layout
registerCostStateRecorder(recordCostState);
/**
 * 记录任务摘要（observer-ref 相关），供后台会话列表显示。
 */
//@ chunk-e6aww6q8.js:409464-409590 facade-majority
async function recordObserverRef(sessionId, summary) {
  await getProject().appendEntry(
    { type: "observer-ref", ...sessionId, timestamp: new Date().toISOString() },
    void 0,
    void 0,
    summary,
  );
}
//@ chunk-e6aww6q8.js:409590-409790 facade-majority
async function agentTranscriptExists(e, n) {
  if (isStorageV5Enabled() && n !== void 0)
    try {
      let r = locateAgentTranscript(e),
        s = r === void 0 ? void 0 : wG(r);
      if (s !== void 0 && (await n.stat(s)).ok) return !0;
    } catch {}
  if (isDiskless()) return !1;
  try {
    return (await stat(getAgentTranscriptPath(e)), !0);
  } catch {
    return !1;
  }
}
//@ chunk-e6aww6q8.js:409790-409923 layout
function splitJsonlLines(e) {
  let n = [],
    r = 0;
  while (r < e.length) {
    let index = e.indexOf(
        `
`,
        r,
      ),
      h = index === -1 ? e.length : index + 1;
    (n.push({ data: e.slice(r, h) }), (r = h));
  }
  return n;
}
//@ chunk-e6aww6q8.js:409923-410098 layout
function getSessionScopeOfKey(e) {
  if (e.namespace !== "transcript") throw Error("sessionScopeOf: not a transcript key");
  return { namespace: "transcript", projectKey: e.projectKey, sessionId: e.sessionId };
}
//@ chunk-e6aww6q8.js:410098-410185 layout
function getStorageErrorCause(e) {
  let n = e instanceof Error ? e.cause : void 0;
  return isStoreError(n) && wbs(n) ? n : void 0;
}
//@ chunk-e6aww6q8.js:410185-410360 layout
function transcriptAppendFailedError(e) {
  let n = () =>
    Object.assign(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `transcript storage append failed (${formatStorageErrorCode(e)})`,
        "transcript storage append failed",
      ),
      { cause: e },
    );
  return wbs(e) ? n() : withErrnoFromStorageError(e, n, "write");
}
//@ chunk-e6aww6q8.js:410360-410481 layout
function logReStampFailure(e, n) {
  if (isSyscallError(n))
    logForDebugging(`${e} (${getErrnoCode(n)}): ${errorMessage(n)}; the synchronous re-stamp runs instead`, {
      level: "error",
    });
  else logError(n);
}
//@ chunk-e6aww6q8.js:410481-410576 layout
function entryDedupKey(e, n) {
  let r = "sessionId" in n ? n.sessionId : void 0;
  return `${e}
${n.type}
${String(r)}`;
}
//@ chunk-e6aww6q8.js:410576-410822 layout
function getAsideStrandedLeftover(e) {
  if (e.code !== "Failed" || e.telemetryCode !== "AsideStranded") return;
  let n = "cause" in e ? e.cause : void 0;
  if (typeof n !== "object" || n === null || "moveError" in n) return;
  let r = "path" in n ? n.path : void 0;
  return { leftover: typeof r === "string" ? r : void 0 };
}
//@ chunk-e6aww6q8.js:410822-410975 layout
function transcriptMoveFailedError(e) {
  return withErrnoFromStorageError(
    e,
    () =>
      Object.assign(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `transcript storage move failed (${formatStorageErrorCode(e)})`,
          "transcript storage move failed",
        ),
        { cause: e },
      ),
    "rename",
  );
}
//@ chunk-e6aww6q8.js:410975-411149 layout
function transcriptMkdirFailedError(e) {
  return withErrnoFromStorageError(
    e,
    () =>
      Object.assign(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `transcript storage folder creation failed (${formatStorageErrorCode(e)})`,
          "transcript storage folder creation failed",
        ),
        { cause: e },
      ),
    "mkdir",
  );
}
//@ chunk-e6aww6q8.js:411149-411246 layout
function formatStorageErrorCode(e) {
  return "telemetryCode" in e && e.telemetryCode ? `${e.code} ${e.telemetryCode}` : e.code;
}
//@ chunk-e6aww6q8.js:411246-411437 layout
function withErrnoFromStorageError(e, n, r) {
  let s = "cause" in e ? e.cause : void 0;
  if (isSyscallError(s)) return s;
  let h = n(),
    y = storageErrorToErrno(e, s);
  if (y === void 0) return h;
  let errno = constants_2_2.errno;
  return Object.assign(h, { code: y, errno: -(errno[y] ?? 0), syscall: r });
}
//@ chunk-e6aww6q8.js:411437-411610 layout
function storageErrorToErrno(e, n) {
  let r = storageErrorCode(e);
  if (isErrnoCode(r)) return r;
  let s = getErrnoCode(n);
  if (isErrnoCode(s)) return s;
  switch (e.code) {
    case "NotFound":
      return "ENOENT";
    case "Unavailable":
      return "EAGAIN";
    default:
      return;
  }
}
//@ chunk-e6aww6q8.js:411610-411668 layout
function isErrnoCode(e) {
  return e !== void 0 && /^E[A-Z0-9]+$/.test(e);
}
//@ chunk-e6aww6q8.js:411668-411873 facade-majority
class RefusedDirectWriteError extends Error {
  writer;
  name = "RefusedDirectWriteError";
  constructor(e) {
    super(
      "diskless session: refused a direct write of a session file (no storage backend, or no key for the path)",
    );
    this.writer = e;
  }
}
//@ chunk-e6aww6q8.js:411873-411922 layout
function assertDiskWritable(e, n) {
  if (isDiskless()) throw (warnDisklessSettingsWrite(e, n), new RefusedDirectWriteError(e));
}
//@ chunk-e6aww6q8.js:411922-411974 layout
function swallowRefusedDirectWrite(e) {
  if (!(e instanceof RefusedDirectWriteError)) throw e;
  logError(e);
}
//@ chunk-e6aww6q8.js:411974-412062 layout
function getHydratedTranscriptTarget(e, n) {
  let r = wrapStorageSource(getStorageTargetForPath(e, n));
  if (r === void 0) assertDiskWritable("hydrated_transcript", e);
  return r;
}
/**
 * 把一段 jsonl 文本追加到转录：文件以 O_APPEND 打开（必要时先补换行封闭撕裂的尾行），storage v5 后端时写记录。
 */
//@ chunk-e6aww6q8.js:412062-413115 layout
async function appendToTranscriptFile(e, n, r, s, h) {
  let y = su(),
    S = s !== !0 && y.project?.tornTailSealPending(e) === !0;
  if (S)
    n =
      `
` + n;
  let w = !1,
    L = r !== void 0 ? transcriptStorageKeyForPath(e) : void 0;
  if (isStorageV5Enabled() && r !== void 0 && L !== void 0) {
    if (s === !0) {
      let stats = await r.stat(L);
      if (!stats.ok) {
        if (stats.error.code === "NotFound") return "skipped";
        let error = stats.error;
        throw withErrnoFromStorageError(
          error,
          () =>
            Object.assign(
              new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                `onlyIfExists stat failed (${formatStorageErrorCode(error)}) \u2014 append withheld`,
                "onlyIfExists stat failed \u2014 append withheld",
              ),
              { cause: error },
            ),
          "write",
        );
      }
      if ((stats.value.storedBytes ?? stats.value.size) === 0) return "skipped";
      if ((stats.value.tornTailBytes ?? 0) > 0)
        ((n =
          `
` + (h ?? n)),
          (w = !0));
    }
    let append = await r.append(
      L,
      splitJsonlLines(n),
      s === !0 ? { precondition: { type: "ifExists" } } : void 0,
    );
    if (!append.ok) {
      if (s === !0 && append.error.code === "NotFound") return "skipped";
      throw transcriptAppendFailedError(append.error);
    }
    if (S) y.project?.tornTailSealLanded(e);
    return w ? "backend-torn" : "backend";
  }
  if ((assertDiskWritable("transcript_lines", e), s === !0)) {
    let G = await appendToExistingTranscript(e, n, h);
    return G === !1 ? "skipped" : G === "torn" ? "direct-torn" : "direct";
  }
  try {
    await appendFile(e, n, { mode: 384 });
  } catch {
    (await mkdir(dirname(e), { recursive: !0, mode: 448 }), await appendFile(e, n, { mode: 384 }));
  }
  if (S) y.project?.tornTailSealLanded(e);
  return "direct";
}
//@ chunk-e6aww6q8.js:413115-413637 layout
async function appendToExistingTranscript(e, n, r) {
  let s;
  try {
    s = await open(e, constants.O_RDWR | constants.O_APPEND | ws);
  } catch (error) {
    let y = getErrnoCode(error);
    if (y === "ENOENT" || y === "ENOTDIR") return !1;
    throw error;
  }
  try {
    let { size: size } = await s.stat();
    if (size === 0) return !1;
    let alloc = Buffer.alloc(1),
      { bytesRead: bytesRead } = await s.read(alloc, 0, 1, size - 1),
      w = bytesRead === 1 && alloc[0] === 10,
      buffer = Buffer.from(
        w
          ? n
          : `
` + (r ?? n),
        "utf8",
      ),
      G = void 0,
      q = 0;
    while (q < buffer.length) {
      let { bytesWritten: bytesWritten } = await s.write(buffer, q, buffer.length - q, G);
      if (bytesWritten <= 0) throw Error("appendToExistingTranscript: short write");
      if (((q += bytesWritten), G !== void 0)) G += bytesWritten;
    }
    return w ? !0 : "torn";
  } finally {
    await s.close();
  }
}
//@ chunk-e6aww6q8.js:413637-413653 facade-majority
var OBSERVER_REF_TAIL_SCAN_BYTES = 1048576;
//@ chunk-e6aww6q8.js:413653-413811 layout
async function readTranscriptTailViaStorage(e, n, r) {
  let s = wG(e);
  if (s === void 0) return;
  let h = await readTranscriptTailV5(s, n, r);
  if (h === null) return null;
  if (!h.ok) return;
  return { content: h.content, cut: h.cut };
}
//@ chunk-e6aww6q8.js:413811-414178 facade-majority
function readTranscriptTailV5(e, n, r) {
  return r.read([{ key: e, tail: n }]).then((s) => {
    if (!s.ok) return d7t(s.error) ? readStorageTailByRecords(e, n, r) : { ok: !1, error: s.error };
    let [h] = s.value.items;
    if (!h.found) return null;
    return {
      ok: !0,
      content: Buffer.from(h.value.buffer, h.value.byteOffset, h.value.byteLength).toString("utf8"),
      totalBytes: h.totalBytes,
      byteLength: h.value.byteLength,
      cut: h.totalBytes > h.value.byteLength,
    };
  });
}
//@ chunk-e6aww6q8.js:414178-414267 layout
function isStorageTooLargeError(e) {
  return e.code === "Failed" && "telemetryCode" in e && e.telemetryCode === "EFBIG";
}
//@ chunk-e6aww6q8.js:414267-414290 layout
var PAGED_TRANSCRIPT_PAGE_BYTES = 4194304,
  G9 = A7s;
//@ chunk-e6aww6q8.js:414290-414405 layout
function pagedTranscriptTooLargeError() {
  return Object.assign(Error("loadTranscriptFile: the paged transcript is too large"), { code: "EFBIG" });
}
//@ chunk-e6aww6q8.js:414405-415433 layout
async function readPagedTranscript(e, n, r) {
  let s;
  try {
    s = await e.stat(n);
  } catch (error) {
    if (r !== void 0) return;
    throw error;
  }
  if (!s.ok) {
    if (s.error.code === "NotFound") return null;
    if (r !== void 0) return;
    return { failure: s.error };
  }
  if (r !== void 0 && s.value.size > r) return;
  if (s.value.size > G9) throw pagedTranscriptTooLargeError();
  let allocUnsafe = Buffer.allocUnsafe(Math.min(s.value.size, G9)),
    y = 0,
    S = 0,
    w;
  for (;;) {
    let records = await e.readRecords(n, {
      order: "forward",
      maxBytes: PAGED_TRANSCRIPT_PAGE_BYTES,
      ...(w !== void 0 && { fromSeq: w }),
    });
    if (!records.ok) {
      if (records.error.code === "NotFound" && w === void 0) return null;
      return { failure: records.error };
    }
    for (let item of records.value.items) {
      let Z = y + item.data.byteLength;
      if (Z > G9) throw pagedTranscriptTooLargeError();
      if (Z > allocUnsafe.length) {
        let allocUnsafe_2 = Buffer.allocUnsafe(Math.min(Math.max(Z, allocUnsafe.length * 2), G9));
        (allocUnsafe.copy(allocUnsafe_2, 0, 0, y), (allocUnsafe = allocUnsafe_2));
      }
      (allocUnsafe.set(item.data, y), (y = Z), S++);
    }
    let nextSeq = records.value.nextSeq;
    if (nextSeq === void 0) break;
    if (w !== void 0 && nextSeq <= w) throw Error("loadTranscriptFile: the record cursor did not advance");
    w = nextSeq;
  }
  return (
    logForDebugging(`loadTranscriptFile: read ${S} records (${y} bytes) by page`),
    {
      bytes: allocUnsafe.subarray(0, y),
      mtimeMs: s.value.mtimeMs,
      storedBytes: Math.max(s.value.size, y),
      tornTailBytes: s.value.tornTailBytes ?? 0,
    }
  );
}
//@ chunk-e6aww6q8.js:415433-415739 layout
async function readStorageTailByRecords(e, n, r) {
  let records = await r.readRecords(e, { order: "backward", maxBytes: n });
  if (!records.ok) return records.error.code === "NotFound" ? null : { ok: !1, error: records.error };
  let buffer = Buffer.concat(records.value.items.map((item) => item.data).reverse());
  return {
    ok: !0,
    content: buffer.toString("utf8"),
    totalBytes: void 0,
    byteLength: buffer.byteLength,
    cut: !1,
  };
}
//@ chunk-e6aww6q8.js:415739-416177 facade-majority
async function readLastObserverRef(e, n) {
  let r = e ? getAgentTranscriptPath(e) : getTranscriptPath(),
    s =
      !isStorageV5Enabled() || n === void 0
        ? void 0
        : await readTranscriptTailViaStorage(r, OBSERVER_REF_TAIL_SCAN_BYTES, n).catch(() => {
            return;
          });
  if (s === null || (s === void 0 && isDiskless())) return null;
  let h =
    s !== void 0
      ? s
      : await tailFile(r, OBSERVER_REF_TAIL_SCAN_BYTES).catch((S) => {
          if (isFsInaccessible(S)) return null;
          throw S;
        });
  if (h == null) return null;
  let parts = h.content.split(`
`);
  for (let S = parts.length - 1; S >= 0; S--) {
    let w = parts[S];
    if (!w || !w.includes('"observer-ref"')) continue;
    try {
      let L = jsonParse(w);
      if (L?.type === "observer-ref") return L;
    } catch {}
  }
  return null;
}
//@ chunk-e6aww6q8.js:416177-416200 layout
var FORK_CONTEXT_MAX_DEPTH = 4,
  $po = 16777216;
/**
 * 解析 fork-context-ref：加载父会话到 parentLastUuid 为止的前缀消息，带缓存与并发去重。
 */
//@ chunk-e6aww6q8.js:416200-416535 facade-majority
async function hydrateForkContext(e, n = $po, r) {
  let {
      forkContextHydrationCache: forkContextHydrationCache,
      forkContextHydrationsInFlight: forkContextHydrationsInFlight,
    } = su(),
    y = forkContextHydrationCache.get(e.parentLastUuid);
  if (y)
    return (
      forkContextHydrationCache.delete(e.parentLastUuid),
      forkContextHydrationCache.set(e.parentLastUuid, y),
      y.slice
    );
  let S = forkContextHydrationsInFlight.get(e.parentLastUuid);
  if (S) return S;
  let w = loadForkContextPrefix(e, n, r).finally(() =>
    forkContextHydrationsInFlight.delete(e.parentLastUuid),
  );
  return (forkContextHydrationsInFlight.set(e.parentLastUuid, w), w);
}
//@ chunk-e6aww6q8.js:416535-417329 layout
async function loadForkContextPrefix(e, n, r) {
  let { forkContextHydrationCache: forkContextHydrationCache } = su();
  if (!isSafeIdSegment(e.parentSessionId))
    return (
      logForDebugging(
        "[fork-context-ref] parent session id cannot name a transcript file; returning empty prefix",
        { level: "warn" },
      ),
      []
    );
  let h = getTranscriptPathForSession(e.parentSessionId),
    y = getTranscriptStorageKey(h, r),
    { messages: messages } = await loadTranscriptFile(h, y && { storageV5: y }),
    w = messages.get(e.parentLastUuid);
  if (!w)
    return (
      logForDebugging(
        `[fork-context-ref] parent uuid ${e.parentLastUuid} not found in ${h}; returning empty prefix`,
        { level: "warn" },
      ),
      []
    );
  let mapped = buildConversationChain(messages, w)
      .filter((Z) => !Z.isSidechain)
      .map(({ isSidechain: isSidechain, parentUuid: parentUuid, promptId: promptId, ...we }) =>
        withoutTaskProducerMark(we),
      ),
    reduced = mapped.reduce((Z, Se) => Z + toJsonLine(Se).length, 0);
  (forkContextHydrationCache.delete(e.parentLastUuid),
    forkContextHydrationCache.set(e.parentLastUuid, { slice: mapped, bytes: reduced }));
  let q = 0;
  for (let Z of forkContextHydrationCache.values()) q += Z.bytes;
  for (let [Z, Se] of forkContextHydrationCache) {
    if (
      forkContextHydrationCache.size <= 1 ||
      (forkContextHydrationCache.size <= FORK_CONTEXT_MAX_DEPTH && q <= n)
    )
      break;
    ((q -= Se.bytes), forkContextHydrationCache.delete(Z));
  }
  return mapped;
}
/**
 * 追加 queue-operation 记录（排队命令的入队/出队），可写入其他会话的文件。
 */
//@ chunk-e6aww6q8.js:417329-417390 facade-majority = recordQueueOperation (1)
async function recordQueueOperation(e, n) {
  await getProject().insertQueueOperation(e, n);
}
/**
 * 从转录中删除指定 uuid 的消息（排入写队列，执行时重写文件）。
 */
//@ chunk-e6aww6q8.js:417390-417547 facade-majority = removeTranscriptMessage (0.515)
async function removeTranscriptMessage(e, n, r) {
  let s = isStorageV5Enabled() && n !== void 0 ? n : void 0,
    h = r ?? getSessionId(),
    y = getProject(),
    { drained: drained } = await y.recordInTurn(h, void 0, () => y.removeMessageByUuid(e, h, s));
  await drained;
}
//@ chunk-e6aww6q8.js:417547-417773 facade-majority
async function removeTranscriptMessageIfPersisted(e, n) {
  let r = isStorageV5Enabled() && n !== void 0 ? n : void 0,
    s = getSessionId(),
    h = getProject(),
    { drained: drained } = await h.recordInTurn(s, void 0, async () =>
      (await su().sessionMessages(s, r)).has(e)
        ? h.removeMessageByUuid(e, s, r)
        : { drained: Promise.resolve() },
    );
  await drained;
}
/**
 * 追加 file-history-snapshot 记录（文件检查点，供 /rewind 回滚文件）。
 */
//@ chunk-e6aww6q8.js:417773-417847 facade-majority = recordFileHistorySnapshot (1)
async function recordFileHistorySnapshot(e, n, r, s) {
  await getProject().insertFileHistorySnapshot(e, n, r, s);
}
//@ chunk-e6aww6q8.js:417847-418033 facade-majority
async function recordFileHistoryDelta(e, n, r, s, h) {
  await getProject().insertFileHistoryDelta(
    {
      type: "file-history-delta",
      messageId: e,
      snapshotMessageId: n,
      trackingPath: r,
      backup: s,
      timestamp: new Date().toISOString(),
    },
    h,
  );
}
/**
 * 追加 attribution-snapshot 记录（提交署名统计快照）。
 */
//@ chunk-e6aww6q8.js:418033-418099 facade-majority = recordAttributionSnapshot (1)
async function recordAttributionSnapshot(e, n) {
  await getProject().insertAttributionSnapshot(e, n);
}
/**
 * 追加 content-replacement 记录（大工具结果替换为引用），有 agentId 时写入子代理转录。
 */
//@ chunk-e6aww6q8.js:418099-418168 facade-majority = recordContentReplacement (1)
async function recordContentReplacement(e, n, r) {
  await getProject().insertContentReplacement(e, n, r);
}
//@ chunk-e6aww6q8.js:418168-418333 layout
fRt({
  canRecord: () => !isTranscriptPersistenceDisabled() && !getProject().isRemotelyMirrored(),
  append: (e) => getProject().appendRequestReplayRecords(e),
  storedToolResultDigest: (e, n) => getProject().queuedToolResultDigest(e, n),
});
/**
 * 重置会话文件指针（新 sessionId 时下次写入重新创建文件）。
 */
//@ chunk-e6aww6q8.js:418333-418378 facade-majority = resetSessionFilePointer (1)
async function resetSessionFilePointer() {
  getProject().resetSessionFile();
}
/**
 * resume 同一会话时把会话文件指针指向被恢复的转录文件，并重写元数据。
 */
//@ chunk-e6aww6q8.js:418378-418687 facade-majority = adoptResumedSessionFile (0.214)
function adoptResumedSessionFile() {
  let project = getProject(),
    n = getTranscriptPath();
  project.setSessionFile(n);
  let date = new Date(),
    s = yH(n);
  if (s !== void 0) utimes(s, date, date).catch(() => {});
  try {
    project.reAppendSessionMetadata(!0, !1, !1, !0);
  } catch (error) {
    let y = getErrnoCode(error);
    if (isSyscallError(error))
      logForDebugging(`Resume re-append failed (${y}): ${errorMessage(error)}`, { level: "error" });
    else logError(error);
    reportTranscriptWriteFailure(su().writerHealth, "adopt", error, project.sessionFilePath);
  }
}
//@ chunk-e6aww6q8.js:418687-418982 facade-majority
async function adoptResumedSessionFileAsync(e) {
  let n = getProject(),
    r = getTranscriptPath();
  if ((n.setSessionFile(r), n.adoptAppendSource(e), touchTranscript(r, e), isTranscriptPersistenceDisabled()))
    return;
  try {
    await n.reAppendSessionMetadataAsync(!0, !1, e, !0);
  } catch (error) {
    let h = getErrnoCode(error);
    if (isSyscallError(error))
      logForDebugging(`Resume re-append failed (${h}): ${errorMessage(error)}`, { level: "error" });
    else logError(error);
    reportTranscriptWriteFailure(su().writerHealth, "adopt", error, r);
  }
}
//@ chunk-e6aww6q8.js:418982-419053 facade-majority
function touchSessionTranscript(e) {
  let sessionFilePath = getProject().sessionFilePath;
  if (sessionFilePath === null) return;
  touchTranscript(sessionFilePath, e);
}
//@ chunk-e6aww6q8.js:419053-419235 layout
function touchTranscript(e, n) {
  if (isStorageV5Enabled() && n !== void 0) {
    let h = wG(e);
    if (h !== void 0) {
      try {
        n.touch(h).catch(() => {});
      } catch {}
      return;
    }
  }
  let r = yH(e);
  if (r === void 0) return;
  let date = new Date();
  utimes(r, date, date).catch(() => {});
}
/**
 * cwd 改变（如进入 worktree）后把当前会话转录从旧项目目录迁到新项目目录，迁移期间新写入先缓存在 relocationBuffer。
 */
//@ chunk-e6aww6q8.js:419235-421372 facade-majority
async function relocateSessionTranscript(e) {
  if (isDiskless()) throw Error("A diskless session moves no transcript between project folders on disk");
  let n = isStorageV5Enabled() && e !== void 0 ? e : void 0,
    r = getSessionId(),
    s = getProjectDir_2(getOriginalCwd()),
    h = getProject(),
    sessionFilePath = h.sessionFilePath;
  if (sessionFilePath === null || isTranscriptPersistenceDisabled()) {
    ((h.currentSessionRelocatedCwd = getOriginalCwd()), switchSession(r, "cd", s));
    return;
  }
  let S = join_3(s, `${r}.jsonl`);
  if (sessionFilePath === S) {
    switchSession(r, "cd", s);
    let w = getOriginalCwd();
    if (h.currentSessionRelocatedCwd !== w) {
      h.currentSessionRelocatedCwd = w;
      let L = { type: "relocated", sessionId: r, relocatedCwd: w };
      (h.beginTranscriptRelocation(), OMt(sessionFilePath));
      try {
        if (
          (await h.flush(),
          await flushAppendEntryQueues(),
          await tryAppendToTranscript(
            sessionFilePath,
            jsonStringify(L) +
              `
`,
            getStorageTargetForPath(sessionFilePath, n),
          ))
        )
          h.fireMirror(sessionFilePath, [L]);
      } catch (error) {
        logForDebugging(`relocateSessionTranscript: same-target relocated stamp failed: ${error}`);
      } finally {
        (flushParkedAppends(sessionFilePath), await h.endTranscriptRelocation());
      }
    }
    return;
  }
  (h.beginTranscriptRelocation(), OMt(sessionFilePath));
  try {
    (await h.flush(), await flushAppendEntryQueues(), await mkdir(s, { recursive: !0, mode: 448 }));
    let w = getRealPathOptions(e),
      L = (await canonicalizePath(dirname(sessionFilePath), w)) === (await canonicalizePath(s, w));
    if (!L)
      try {
        let [Ie, Me] = await Promise.all([
          stat(dirname(sessionFilePath), { bigint: !0 }),
          stat(s, { bigint: !0 }),
        ]);
        L = Ie.dev === Me.dev && Ie.ino === Me.ino;
      } catch (error) {
        if (!isENOENT(error)) throw error;
      }
    let G;
    if (!L) G = await supersedeTranscriptFile(S);
    let q = n && transcriptStorageKeyForPath(sessionFilePath),
      Z = n && transcriptStorageKeyForPath(S),
      Se = n !== void 0 && q !== void 0 && Z !== void 0,
      ke = !0;
    try {
      await moveTranscript(sessionFilePath, S, n, Se ? { from: q, to: Z } : void 0);
    } catch (error) {
      if (isENOENT(error)) {
        if (G !== void 0)
          throw (
            await rename(G, S).catch((Me) => {
              logForDebugging(
                `relocateSessionTranscript: could not restore set-aside destination after ENOENT move: ${Me}`,
                { level: "warn" },
              );
            }),
            error
          );
        (logForDebugging(`relocateSessionTranscript: old file missing: ${error}`), (ke = !1));
      } else {
        if (G !== void 0)
          await rename(G, S).catch((Me) => {
            logForDebugging(
              `relocateSessionTranscript: could not restore set-aside destination after failed move: ${Me}`,
              { level: "warn" },
            );
          });
        throw error;
      }
    }
    let we = join_3(dirname(sessionFilePath), r),
      Ee = join_3(s, r),
      Ae = !0;
    try {
      await moveTranscript(
        we,
        Ee,
        n,
        Se ? { fromScope: getSessionScopeOfKey(q), toScope: getSessionScopeOfKey(Z) } : void 0,
      );
    } catch (error) {
      if (((Ae = !1), !isENOENT(error))) logError(error);
    }
    if (
      (h.noteSessionFileMoving(sessionFilePath, S),
      h.setSessionFile(S),
      switchSession(r, "cd", s),
      (h.currentSessionRelocatedCwd = getOriginalCwd()),
      ke)
    )
      try {
        await appendEntryToFileAsync(
          S,
          { type: "relocated", sessionId: r, relocatedCwd: h.currentSessionRelocatedCwd },
          n,
        );
      } catch (error) {
        logForDebugging(`relocateSessionTranscript: relocated stamp failed: ${error}`);
      }
    if (Ae)
      try {
        let Ie = require("./chunk-xr4q1qwc.js");
        await Ie.repointTaskOutputSymlinks(we, Ee);
      } catch (error) {
        logError(error);
      }
  } finally {
    (flushParkedAppends(h.sessionFilePath ?? sessionFilePath), await h.endTranscriptRelocation());
  }
}
//@ chunk-e6aww6q8.js:421372-421526 facade-majority
function reportRelocateSessionTranscriptFailure(e, n) {
  if (isSadFsErrno(e) || isEnvFsErrno(e))
    logForDebugging(`${n}: transcript relocation failed (${getErrnoCode(e)}): ${errorMessage(e)}`, {
      level: "error",
    });
  else logError(e);
  reportTranscriptWriteFailure(su().writerHealth, "relocate", e);
}
//@ chunk-e6aww6q8.js:421526-421574 facade-majority
function beginTranscriptRelocationForTesting() {
  getProject().beginTranscriptRelocation();
}
//@ chunk-e6aww6q8.js:421574-421632 facade-majority
async function endTranscriptRelocationForTesting() {
  await getProject().endTranscriptRelocation();
}
//@ chunk-e6aww6q8.js:421632-422089 layout
async function supersedeTranscriptFile(e) {
  let n = `${e}.superseded-${Date.now()}`;
  try {
    await rename(e, n);
  } catch (error) {
    if (isENOENT(error)) return;
    throw error;
  }
  let { isRetentionExemptionDisabled: isRetentionExemptionDisabled } = require("./chunk-xdz4h5jb.js");
  if (!isRetentionExemptionDisabled()) {
    let date = new Date();
    await lutimes(n, date, date).catch((h) => {
      logForDebugging(
        `relocateSessionTranscript: could not refresh the set-aside's mtime at ${n} (it ages from its old clock): ${h}`,
        { level: "warn" },
      );
    });
  }
  return (
    logForDebugging(`relocateSessionTranscript: existing destination set aside at ${n}`, { level: "warn" }),
    n
  );
}
//@ chunk-e6aww6q8.js:422089-422775 layout
async function moveStorageScope(e, n, r) {
  let moveScope = await e.moveScope(n, r);
  if (!moveScope.ok || moveScope.value.published) return moveScope;
  function h() {
    return Object.assign(Error("an occupant blocks the destination scope and could not be set aside"), {
      code: "EEXIST",
    });
  }
  let y =
    r.namespace === "transcript" && r.sessionId !== void 0
      ? { ...r, sessionId: `${r.sessionId}.superseded-${Date.now()}` }
      : void 0;
  if (y === void 0) throw h();
  let moveScope_2 = await e.moveScope(r, y);
  if (!moveScope_2.ok) throw transcriptMoveFailedError(moveScope_2.error);
  if (!moveScope_2.value.published) throw h();
  logForDebugging(`renameWithFallbacks: existing destination scope set aside at ${y.sessionId}`, {
    level: "warn",
  });
  let moveScope_3 = await e.moveScope(n, r);
  if (moveScope_3.ok && moveScope_3.value.published) return moveScope_3;
  if (
    (await e.moveScope(y, r).catch(() => {
      return;
    }),
    !moveScope_3.ok)
  )
    return moveScope_3;
  throw h();
}
//@ chunk-e6aww6q8.js:422775-424251 layout
async function moveTranscript(e, n, r, s) {
  if (isStorageV5Enabled() && r !== void 0 && s !== void 0) {
    let y = "fromScope" in s ? await moveStorageScope(r, s.fromScope, s.toScope) : await r.move(s.from, s.to);
    if (y.ok) return;
    if (y.error.code === "NotFound" || y.error.code === "ScopeNotFound")
      throw Object.assign(Error("nothing to move at the old home"), { code: "ENOENT" });
    if (y.error.code === "Failed" && y.error.telemetryCode === "SameEntry") return;
    let S = "fromScope" in s ? getAsideStrandedLeftover(y.error) : void 0;
    if (S !== void 0) {
      if (
        (logForDebugging(
          `renameWithFallbacks: a scope move stood with its set-aside leftover stranded; left in place at ${S.leftover ?? "(unnamed)"}`,
          { level: "warn" },
        ),
        (await lstat(e).catch(() => {
          return;
        })) !== void 0)
      )
        logForDebugging(`renameWithFallbacks: the session folder may also remain at ${e}; left in place`, {
          level: "warn",
        });
      return;
    }
    throw transcriptMoveFailedError(y.error);
  }
  async function h(y, S) {
    await mkdir(S, { recursive: !0, mode: 448 });
    for (let w of await readdir(y, { withFileTypes: !0 }))
      if (w.isDirectory()) await h(join_3(y, w.name), join_3(S, w.name));
      else await copyFile(join_3(y, w.name), join_3(S, w.name));
  }
  try {
    await rename(e, n);
    return;
  } catch (error) {
    let S = getErrnoCode(error);
    if (S === "EEXIST" || S === "EPERM" || S === "EBUSY" || S === "ENOTEMPTY") {
      let w = await supersedeTranscriptFile(n).catch(() => {
        return;
      });
      try {
        await rename(e, n);
      } catch (error) {
        if (w !== void 0) await rename(w, n).catch(() => {});
        throw error;
      }
      return;
    }
    if (S === "EXDEV") {
      try {
        await copyFile(e, n);
      } catch (error) {
        let L = getErrnoCode(error);
        if (L === "EISDIR" || L === "ENOTSUP" || L === "EPERM") {
          let G = await supersedeTranscriptFile(n);
          try {
            await h(e, n);
          } catch (error) {
            if (G !== void 0)
              (await rm_2(n, { recursive: !0, force: !0 }).catch(() => {}),
                await rename(G, n).catch(() => {}));
            throw error;
          }
        } else throw error;
      }
      await rm_2(e, { recursive: !0, force: !0 });
      return;
    }
    throw error;
  }
}
/**
 * 等待会话存储所有排队写入落盘。
 */
//@ chunk-e6aww6q8.js:424251-424290 facade-majority = flushSessionStorage (1)
async function flushSessionStorage() {
  await getProject().flush();
}
//@ chunk-e6aww6q8.js:424290-424345 facade-majority
async function inTranscriptCallOrder(e) {
  return await getProject().inCallOrder(e);
}
//@ chunk-e6aww6q8.js:424345-424474 facade-majority
function appendEntryToCurrentTranscriptNow(e, n, r) {
  let s = getProject(),
    h = n ?? s.sessionFilePath;
  if (!h || isTranscriptPersistenceDisabled()) return;
  try {
    (s.sealTornTailSync(h), appendEntrySync(h, e, r));
  } catch (error) {
    reportStopNowAppendFailure(error, h);
  }
}
//@ chunk-e6aww6q8.js:424474-424626 layout
function reportStopNowAppendFailure(e, n) {
  if (isSyscallError(e))
    logForDebugging(`Stop-gesture transcript append failed (${getErrnoCode(e)}): ${errorMessage(e)}`, {
      level: "error",
    });
  else logError(e);
  reportTranscriptWriteFailure(su().writerHealth, "stop_now", e, n);
}
//@ chunk-e6aww6q8.js:424626-424684 facade-majority
function sealTornTranscriptTail(e) {
  getProject().sealTornTailOnNextAppend(e ?? getTranscriptPathForSession(getSessionId()));
}
//@ chunk-e6aww6q8.js:424684-424789 layout
function isConversationEntry(e) {
  if (typeof e !== "object" || e === null) return !1;
  let n = e.type;
  return n === "user" || n === "assistant";
}
//@ chunk-e6aww6q8.js:424789-424995 layout
async function openRegularFile(e) {
  if (isDiskless()) return null;
  let n = await open(e, constants.O_RDONLY | O_NONBLOCK_2);
  try {
    if ((await n.stat()).isFile()) return n;
  } catch (error) {
    throw (await n.close().catch(() => {}), error);
  }
  return (await n.close().catch(() => {}), null);
}
//@ chunk-e6aww6q8.js:424995-425085 facade-majority
async function transcriptFileHasContentEntry(e, n) {
  if (isStorageV5Enabled() && n !== void 0) return storedTranscriptHasContent(e, n);
  return someLineMatches(e, isConversationLine).catch(() => !1);
}
/**
 * 逐块读取文件并按行调用判断函数，任一行命中即返回 true。
 */
//@ chunk-e6aww6q8.js:425085-425476 layout
async function someLineMatches(e, n) {
  let s = null;
  try {
    if (((s = await openRegularFile(e)), s === null)) throw Error("not a regular file");
    let allocUnsafe = Buffer.allocUnsafe(65536),
      y = new StringDecoder("utf8"),
      S = "";
    for (;;) {
      let { bytesRead: bytesRead } = await s.read(allocUnsafe, 0, 65536, null);
      if (bytesRead <= 0) break;
      let parts = y.write(allocUnsafe.subarray(0, bytesRead)).split(`
`);
      ((parts[0] = S + (parts[0] ?? "")), (S = parts.pop() ?? ""));
      for (let G of parts) if (n(G)) return !0;
    }
    return n(S + y.end());
  } finally {
    if (s)
      try {
        await s.close();
      } catch {}
  }
}
//@ chunk-e6aww6q8.js:425476-425490 layout
var jpo = 65536;
/**
 * 判断转录是否含对话消息：无存储键时查本地文件；无盘模式读存储直到判定；否则先读存储记录前段，未截断时续读本地文件。
 */
//@ chunk-e6aww6q8.js:425490-426134 layout
async function storedTranscriptHasContent(transcriptPath, backend) {
  let storageKey = transcriptStorageKeyForPath(transcriptPath);
  if (storageKey === void 0) return transcriptFileHasContentEntry(transcriptPath);
  if (isDiskless()) {
    let state = await transcriptMessagesStateV5({ backend: backend, key: storageKey }, (h) =>
      isConversationLine(h.toString("utf8")),
    );
    if (state === "unknown")
      (logForDebugging(
        "transcriptFileHasContentEntry: could not read the stored transcript to its end; keeping it as if it holds a conversation",
        { level: "warn" },
      ),
        logFeatureSad("transcript_content_probe", "undecided"));
    return state !== "none";
  }
  try {
    let records = await backend.readRecords(storageKey, { order: "forward", maxBytes: jpo });
    if (records.ok) {
      let textDecoder = new TextDecoder("utf-8", { ignoreBOM: !0 }),
        bytesRead = 0,
        complete = !0;
      for (let item of records.value.items) {
        if (item.truncated === !0) {
          complete = !1;
          break;
        }
        if (isConversationLine(textDecoder.decode(item.data))) return !0;
        bytesRead += item.data.byteLength;
      }
      if (complete) return await readJSONLFile(transcriptPath, bytesRead);
    }
  } catch {}
  return transcriptFileHasContentEntry(transcriptPath);
}
//@ chunk-e6aww6q8.js:426134-426509 layout = readJSONLFile (0.869)
async function readJSONLFile(e, n) {
  let s = null;
  try {
    if (((s = await openRegularFile(e)), s === null)) return !1;
    let buf = Buffer.allocUnsafe(65536),
      y = new StringDecoder("utf8"),
      S = "",
      w = n;
    for (;;) {
      let { bytesRead: bytesRead } = await s.read(buf, 0, 65536, w);
      if (bytesRead <= 0) break;
      w += bytesRead;
      let parts = (S + y.write(buf.subarray(0, bytesRead))).split(`
`);
      S = parts.pop() ?? "";
      for (let Z of parts) if (isConversationLine(Z)) return !0;
    }
    return isConversationLine(S + y.end());
  } catch {
    return !1;
  } finally {
    if (s)
      try {
        await s.close();
      } catch {}
  }
}
//@ chunk-e6aww6q8.js:426509-426704 layout
function isConversationLine(e) {
  if (
    !e.includes('"type":"user"') &&
    !e.includes('"type": "user"') &&
    !e.includes('"type":"assistant"') &&
    !e.includes('"type": "assistant"')
  )
    return !1;
  try {
    return isConversationEntry(jsonParseRaw(e));
  } catch {
    return !1;
  }
}
//@ chunk-e6aww6q8.js:426704-426729 facade-majority
function withoutFetchedCodeModeRecords(e) {
  return e;
}
/**
 * 远程会话（CCR）恢复：从服务器拉取会话条目写回本地转录。
 */
//@ chunk-e6aww6q8.js:426729-427354 facade-majority = hydrateRemoteSession (0.588)
async function hydrateRemoteSession(e, n, r) {
  switchSession(LE(e), "hydrate");
  let project = getProject();
  try {
    let remoteLogs = (await getSessionLogs(e, n)) || [],
      y = resolveProjectDir();
    await ensureTranscriptDir(y, r);
    let projectDir = getTranscriptPathForSession(e);
    if (!remoteLogs.some(isConversationEntry) && (await transcriptFileHasContentEntry(projectDir, r)))
      return (
        logForDebugging(
          `Skipping remote hydration: server set of ${remoteLogs.length} entries has no content-bearing entries but the local transcript does`,
        ),
        logForDiagnosticsNoPII("info", "hydrate_skip_zero_content_replace", {
          path: "v1_session_ingress",
          server_entry_count: remoteLogs.length,
        }),
        !0
      );
    return (
      await writeEntriesToJsonlFile(
        projectDir,
        withoutFetchedCodeModeRecords(remoteLogs),
        getHydratedTranscriptTarget(projectDir, r),
      ),
      logForDebugging(`Hydrated ${remoteLogs.length} entries from remote`),
      remoteLogs.length > 0
    );
  } catch (error) {
    return (
      logForDebugging(`Error hydrating session from remote: ${error}`),
      logForDiagnosticsNoPII("error", "hydrate_remote_session_fail"),
      !1
    );
  } finally {
    project.setRemoteIngressUrl(n);
  }
}
//@ chunk-e6aww6q8.js:427354-427728 layout
async function readHydrateTail(e, n, r) {
  let s =
    isStorageV5Enabled() && r !== void 0
      ? await readHydrateTailViaStorage(e, n, r).catch((S) => {
          logForDebugging(`hydrate tail: backend tail read threw, using the raw tail: ${errorMessage(S)}`, {
            level: "warn",
          });
          return;
        })
      : void 0;
  if (s !== void 0) return s;
  let h = yH(e);
  if (h === void 0) return null;
  let y = await tailFile(h, n).catch(() => null);
  return (
    y && {
      content: y.content,
      bytesTotal: y.bytesTotal,
      endsOnLineBoundary: y.content.endsWith(`
`),
    }
  );
}
//@ chunk-e6aww6q8.js:427728-428352 layout
async function readHydrateTailViaStorage(e, n, r) {
  let s = wG(e);
  if (s === void 0) return;
  let [h, y] = await Promise.all([readTranscriptTailV5(s, n, r), r.stat(s)]);
  if (h === null) return null;
  if (!h.ok) {
    logForDebugging(`hydrate tail: backend tail read failed (${h.error.code}), using the raw tail`, {
      level: "warn",
    });
    return;
  }
  if (!y.ok) {
    if (h.totalBytes === void 0)
      return {
        content: h.content,
        bytesTotal: h.byteLength,
        endsOnLineBoundary: h.content.endsWith(`
`),
      };
    logForDebugging(`hydrate tail: backend stat failed (${y.error.code}), using the raw tail`, {
      level: "warn",
    });
    return;
  }
  let S = y.value.tornTailBytes ?? 0;
  return {
    content: h.content,
    bytesTotal: (h.totalBytes ?? y.value.size) + S,
    endsOnLineBoundary:
      S === 0 &&
      h.content.endsWith(`
`),
  };
}
//@ chunk-e6aww6q8.js:428352-428553 layout
async function ensureTranscriptDir(e, n) {
  if (isStorageV5Enabled() && n !== void 0) {
    let r = transcriptScopeForDir(e);
    if (r !== void 0) {
      let ensureScope = await n.ensureScope(r);
      if (!ensureScope.ok) throw transcriptMkdirFailedError(ensureScope.error);
      return;
    }
  }
  (assertDiskWritable("hydrated_transcript", e), await mkdir(e, { recursive: !0, mode: 448 }));
}
//@ chunk-e6aww6q8.js:428553-428653 layout
function getStorageTargetForPath(e, n) {
  if (!isStorageV5Enabled() || n === void 0) return;
  let r = transcriptStorageKeyForPath(e);
  return r === void 0 ? void 0 : { backend: n, key: r };
}
//@ chunk-e6aww6q8.js:428653-428692 facade-majority
function getSessionSidecarDir(e) {
  return join_3(dirname(getTranscriptPathForSession(e)), e);
}
//@ chunk-e6aww6q8.js:428692-428733 facade-majority
function locateSidecarFile(e, n) {
  return join_3(getSessionSidecarDir(e), ...n);
}
//@ chunk-e6aww6q8.js:428733-428864 facade-majority
async function ensureSidecarDirFor(e) {
  if (isDiskless()) throw Error("A diskless session writes no side file to disk");
  await mkdir(dirname(e), { recursive: !0, mode: 448 });
}
//@ chunk-e6aww6q8.js:428864-428913 layout
function getCcrTipPath(e) {
  return join_3(getSessionSidecarDir(e), "ccr-tip.json");
}
//@ chunk-e6aww6q8.js:428913-428959 layout
function getLegacyCcrTipPath(e) {
  return getSessionSidecarDir(e) + ".ccr-tip.json";
}
//@ chunk-e6aww6q8.js:428959-429070 facade-majority
async function readCCRTip(e, n) {
  for (let r of [getCcrTipPath(e), getLegacyCcrTipPath(e)]) {
    let s = await readRemoteAgentMetadata(r, n);
    if (s !== "absent") return s;
  }
  return null;
}
//@ chunk-e6aww6q8.js:429070-429529 file-local
async function readRemoteAgentMetadata(e, n) {
  let r = n !== void 0 ? pathToSessionSideKey(e) : void 0,
    s;
  if (isStorageV5Enabled() && n !== void 0 && r !== void 0)
    try {
      let text = await n.readText([r]);
      if (!text.ok) return null;
      let y = text.value.items[0];
      if (!y.found) return "absent";
      s = y.value;
    } catch {
      return null;
    }
  else {
    let path = yH(e);
    if (path === void 0) return "absent";
    try {
      s = await readFile(path, "utf-8");
    } catch (error) {
      return isENOENT(error) ? "absent" : null;
    }
  }
  try {
    let h = jsonParse(s);
    if (typeof h === "object" && h !== null && "eventId" in h && typeof h.eventId === "string") return h;
    return null;
  } catch {
    return null;
  }
}
/**
 * 远程水合时查找未解决的 tool_use：收集本会话及来源会话在各项目目录下的 ccr-tip 记录，结合已解决事件找到未完成的工具调用，并定位其所在目录与会话。
 */
//@ chunk-e6aww6q8.js:429529-430152 layout
async function findUnresolvedToolUseTip(sessionId, folder, events, resolvedIds, h, storage) {
  let sessionIds = new Set([sessionId]);
  for (let { payload: payload } of events) {
    let Ee = Vt(payload.sessionId);
    if (Ee !== null) sessionIds.add(Ee);
  }
  let folders = await readdir(getProjectsDir_2()).catch((we) => {
      if (isPathAbsent(we)) return [];
      throw we;
    }),
    resolvedEventIds = new Set(resolvedIds),
    tips = [];
  for (let we of folders)
    for (let Ee of sessionIds) {
      let tip = await readRemoteAgentMetadata(join_3(getProjectsDir_2(), we, Ee, "ccr-tip.json"), storage);
      if (tip !== null && tip !== "absent")
        (resolvedEventIds.add(tip.eventId),
          tips.push({ eventId: tip.eventId, place: { folder: we, sessionId: Ee } }));
    }
  let unresolved = findUnresolvedToolUse_2(events, resolvedEventIds, h);
  if (unresolved === void 0) return;
  let at = events.at(-unresolved.rows - 1),
    mapped = tips.filter((we) => [at?.event_id, at?.payload.uuid].includes(we.eventId)).map((we) => we.place),
    found = mapped.find((we) => we.folder === folder && we.sessionId === sessionId);
  return { ...unresolved, tipAt: found ?? mapped[0] };
}
//@ chunk-e6aww6q8.js:430152-430517 layout
async function writeCcrTip(e, n, r) {
  let s = { eventId: n, updatedAt: new Date().toISOString() };
  try {
    let h = getCcrTipPath(e),
      y = r !== void 0 ? pathToSessionSideKey(h) : void 0;
    if (isStorageV5Enabled() && r !== void 0 && y !== void 0) {
      let write = await r.write(y, jsonStringify(s), { mode: 384 });
      if (!write.ok) logForDebugging(`Failed to write CCR tip sidecar: ${formatStorageError(write.error)}`);
      return;
    }
    (assertDiskWritable("ccr_tip", h),
      await ensureSidecarDirFor(h),
      await writeFileAtomic_2(h, jsonStringify(s), 384));
  } catch (error) {
    logForDebugging(`Failed to write CCR tip sidecar: ${error}`);
  }
}
//@ chunk-e6aww6q8.js:430517-430678 facade-majority
async function updateCCRTipFromAckedBatch(e, n) {
  for (let r = e.length - 1; r >= 0; r--) {
    let s = e[r];
    if (!s || s.session_agent_id) continue;
    if (isSyncedTranscriptEntry(s.payload)) {
      await writeCcrTip(getSessionId(), s.payload.uuid, n);
      return;
    }
  }
}
//@ chunk-e6aww6q8.js:430678-430825 facade-majority
function collectTailUuids(e) {
  let n = new Set();
  for (let r of parseJSONL(e)) {
    if (typeof r !== "object" || r === null) continue;
    let uuid = r.uuid;
    if (typeof uuid === "string") n.add(uuid);
  }
  return n;
}
//@ chunk-e6aww6q8.js:430825-431087 facade-majority
async function getValidatedCCRTip(e, n, r) {
  let [s, h] = await Promise.all([readCCRTip(e, r), n !== void 0 ? n : readTranscriptTailForTip(e, r)]);
  if (!s) return { fallbackReason: "no-sidecar" };
  if (!h || !collectTailUuids(h.content).has(s.eventId)) return { fallbackReason: "tip-not-in-tail" };
  let y = { eventId: s.eventId };
  return (Bxt(y, s.updatedAt), y);
}
//@ chunk-e6aww6q8.js:431087-431276 facade-majority
async function readTranscriptTailForTip(e, n) {
  let r = getTranscriptPathForSession(e);
  if (isStorageV5Enabled() && n !== void 0) {
    let h = await readTranscriptTailViaStorage(r, 65536, n).catch(() => {
      return;
    });
    if (h !== void 0) return h;
  }
  let s = yH(r);
  return s === void 0 ? null : tailFile(s, 65536).catch(() => null);
}
//@ chunk-e6aww6q8.js:431276-431328 facade-majority
function extractLastSyncedEventUuid(e) {
  for (let n of iterateUuidsBackward(e)) return n;
  return;
}
//@ chunk-e6aww6q8.js:431328-431477 layout
function* iterateUuidsBackward(e) {
  let parts = e.split(`
`);
  for (let r = parts.length - 1; r >= 0; r--) {
    let s = parts[r];
    if (!s) continue;
    let h;
    try {
      h = jsonParseRaw(s);
    } catch {
      continue;
    }
    if (isSyncedTranscriptEntry(h)) yield h.uuid;
  }
}
//@ chunk-e6aww6q8.js:431477-431573 facade-majority
function extractLatestIntersectingSyncedUuid(e, n) {
  let r = 0;
  for (let s of iterateUuidsBackward(e)) {
    if (n.has(s)) return { uuid: s, walkback: r };
    r++;
  }
  return;
}
//@ chunk-e6aww6q8.js:431573-431922 facade-majority
async function restoreAgentSidecarFromStream(e, n, r) {
  try {
    let s = validateAgentMetadata(n);
    if (s === void 0) return (logFeatureSad("subagent_sidecar_from_stream", "entry_refused"), "refused");
    return (await writeAgentMetadata(e, s, r, !0), logFeatureOk("subagent_sidecar_from_stream"), "restored");
  } catch (error) {
    return (
      logForDebugging(`Sidecar of an agent not written from its stream: ${UC(error)}`, { level: "error" }),
      logFeatureSad("subagent_sidecar_from_stream", "not_written"),
      "failed"
    );
  }
}
//@ chunk-e6aww6q8.js:431922-433001 facade-majority
async function writeHydratedAgentTranscript(e, n, r, s) {
  let filtered = n.filter((w) => w.type !== "agent_metadata"),
    last = n.findLast((w) => w.type === "agent_metadata");
  if (!G$(e))
    return (
      logForDiagnosticsNoPII("warn", "subagent_transcript_write_rejected", {
        reason: "unsafe_id",
        server_entry_count: filtered.length,
      }),
      "skipped"
    );
  if (!filtered.some(isConversationEntry))
    return (
      logForDiagnosticsNoPII("info", "hydrate_skip_zero_content_replace", {
        path: "v2_subagent",
        server_entry_count: filtered.length,
      }),
      "skipped"
    );
  if (last !== void 0 && getProject().keepsAgentMetadataInStream())
    await restoreAgentSidecarFromStream(Mr(e), last, r);
  let S = getAgentTranscriptPath(Mr(e));
  try {
    let w = getHydratedTranscriptTarget(S, r);
    if ((await ensureTranscriptDir(dirname(S), r), s?.createOnly)) {
      if (w) return "exists";
      let L = await writeIfMissing(S, jsonlJoin(filtered), 384);
      try {
        (await assertPathSafeAsync(S),
          await link(L, S).catch(async (G) => {
            let q = getErrnoCode(G);
            if (q !== "EPERM" && q !== "ENOSYS" && q !== "EOPNOTSUPP") throw G;
            await writeNewFile(S, jsonlJoin(filtered), 384);
          }));
      } catch (error) {
        if (getErrnoCode(error) === "EEXIST") return "exists";
        throw error;
      } finally {
        await unlink(L).catch(() => {});
      }
    } else if (w) await writeEntriesToJsonlFile(S, filtered, w);
    else await writeFileAtomic_2(S, jsonlJoin(filtered), 384);
    return "written";
  } catch (error) {
    if (isSyscallError(error))
      logForDebugging(`Subagent transcript write failed (${getErrnoCode(error)}): ${errorMessage(error)}`, {
        level: "error",
      });
    else logError(error);
    throw (
      logForDiagnosticsNoPII("warn", "subagent_transcript_write_rejected", {
        reason: "write_failed",
        server_entry_count: filtered.length,
        errno: sanitizedErrnoLowerForTelemetry(error),
      }),
      error
    );
  }
}
//@ chunk-e6aww6q8.js:433001-433058 facade-majority
function canFetchAgentTranscriptsOnDemand() {
  return getProject().hasInternalAgentEventReader();
}
//@ chunk-e6aww6q8.js:433058-433242 facade-majority
class AgentTranscriptFetchError extends Error {
  outcome;
  constructor(e = "read_fail", n) {
    super("could not load this agent's earlier transcript; try again", n);
    this.outcome = e;
    this.name = "AgentTranscriptFetchError";
  }
}
//@ chunk-e6aww6q8.js:433242-433331 layout
function slimToolResultsIfConfigured(e, n) {
  return su().toolResultCopiesOnDisk === "slim" && n === void 0 ? e.map(createToolResultSlimmer_2()) : e;
}
/**
 * 从 CCR v2 内部事件流重建本地转录（主会话与子代理）。
 */
//@ chunk-e6aww6q8.js:433331-438546 facade-majority = hydrateFromCCRv2InternalEvents (0.34)
async function hydrateFromCCRv2InternalEvents(e, n, r = !1, s, h, y = !1) {
  let startMs = Date.now();
  switchSession(LE(e), "hydrate");
  let project = getProject(),
    L = y && s === void 0;
  project.setVerifiesAgentTranscripts(L);
  let reader = project.getInternalEventReader();
  if (!reader) return (logForDebugging("No internal event reader registered for CCR v2 resume"), "no_reader");
  let q,
    Z = !1;
  try {
    let Se = getTranscriptPathForSession(e),
      ke = readHydrateTail(Se, 65536, s),
      we,
      Ee,
      Ae,
      Ie;
    if (n) ((we = n[0]), (Ee = n[2]?.eventId), (Ie = DHe(n[2])), (Ae = n[2]?.fallbackReason));
    else {
      let un = await getValidatedCCRTip(e, await ke, s);
      ((Ee = un.eventId), (Ie = DHe(un)), (Ae = un.fallbackReason));
      let startTime = performance.now();
      ((Z = !0),
        (we = await reader(Ee)),
        (Z = !1),
        Br("resume_hydrate_fetch_ms", performance.now() - startTime, startTime));
    }
    if (!we)
      return (
        logForDebugging("Failed to read internal events for resume"),
        F9(project, e, { outcome: "read_fail" }),
        logForDiagnosticsNoPII("error", "hydrate_ccr_v2_read_fail"),
        "read_failed"
      );
    let { events: events, stats: stats } = we,
      ze = resolveProjectDir();
    await ensureTranscriptDir(ze, s);
    let lt = await ke,
      Je = lt?.bytesTotal ?? 0,
      nt,
      pt,
      Et;
    if (lt) {
      if (((nt = extractLastSyncedEventUuid(lt.content)), Ee === void 0)) {
        let un = new Map();
        for (let ao = 0; ao < events.length; ao++) {
          let $o = events[ao]?.payload.uuid;
          if (typeof $o === "string") un.set($o, ao);
        }
        ((pt = extractLatestIntersectingSyncedUuid(lt.content, un)),
          (Et = pt === void 0 ? void 0 : un.get(pt.uuid)));
      }
    }
    let yt = Et === void 0 ? events.length : events.length - 1 - Et;
    iyi(Je, stats?.bytesReceived ?? null, events.length, yt, Ee !== void 0, pt?.walkback);
    let gt = !1,
      At = 0,
      It = we.anchorFallback !== void 0,
      Yt =
        Ee !== void 0 &&
        !It &&
        events.some((un) => (un.event_id !== void 0 ? un.event_id === Ee : un.payload.uuid === Ee)),
      qt = Ee !== void 0 && lt ? collectTailUuids(lt.content) : null,
      Zt = Ee !== void 0 && lt !== null && qt !== null && qt.has(Ee) && lt.endsOnLineBoundary,
      rn = events;
    if (Ee && !It && !Yt) {
      if (!Zt) {
        ((Ae = "tail-incoherent"), (Z = !0));
        let events = await reader();
        if (((Z = !1), !events))
          return (
            logForDebugging("Failed to refetch full read after incoherent local tail"),
            F9(project, e, { outcome: "read_fail" }),
            logForDiagnosticsNoPII("error", "hydrate_ccr_v2_read_fail"),
            "read_failed"
          );
        rn = events.events;
      }
    }
    let pn = await transcriptContextFields(),
      no = !1;
    if (Ee && !It && !Yt && Zt) {
      let un = slimToolResultsIfConfigured(
          events.map(($o) => fillMissingTranscriptFields($o.payload, pn)),
          s,
        ),
        filtered = withoutFetchedCodeModeRecords(un).filter(($o) => {
          let uuid = $o.uuid;
          return typeof uuid !== "string" || !qt.has(uuid);
        });
      if (filtered.length > 0)
        await appendEntriesToJsonlFile(Se, filtered, getHydratedTranscriptTarget(Se, s));
      if (((gt = !0), (At = filtered.length), (no = !0), su().localGcEnabled)) {
        let $o = 0;
        for (let yo of filtered) $o += Buffer.byteLength(toJsonLine(yo), "utf8");
        if (Je + $o > LG) getProject().requestCompact(Se, s);
      }
      logForDebugging(
        `Hydrated delta: appended ${filtered.length}/${events.length} foreground entries from CCR v2 internal events`,
      );
    } else {
      if (Ee && Ae !== "tail-incoherent")
        Ae =
          we.anchorFallback === "rejected"
            ? "anchor-rejected"
            : we.anchorFallback === "not-found"
              ? "anchor-not-found"
              : "anchor-in-response";
      if (!rn.some((ao) => isConversationEntry(ao.payload)) && (await transcriptFileHasContentEntry(Se, s)))
        (logForDebugging(
          `Skipping CCR v2 foreground hydration: fetched set of ${rn.length} events has no content-bearing entries but the local transcript does`,
        ),
          logForDiagnosticsNoPII("info", "hydrate_skip_zero_content_replace", {
            path: "v2_foreground",
            server_entry_count: rn.length,
          }));
      else {
        let ao = slimToolResultsIfConfigured(
          rn.map(($o) => fillMissingTranscriptFields($o.payload, pn)),
          s,
        );
        (await writeEntriesToJsonlFile(
          Se,
          withoutFetchedCodeModeRecords(ao),
          getHydratedTranscriptTarget(Se, s),
        ),
          (no = !0),
          logForDebugging(`Hydrated ${rn.length} foreground entries from CCR v2 internal events`));
      }
    }
    let hn = gt ? events : rn;
    q = hn.length > 0 ? "rows" : "no_rows";
    let ho = mn(),
      projectDir = basename_2(dirname(Se)),
      Kn =
        (gt ? At : yt) > 0 && ho
          ? await findUnresolvedToolUseTip(
              e,
              projectDir,
              hn,
              qt ?? (pt === void 0 ? [] : [pt.uuid]),
              gt,
              s,
            ).catch((un) => {
              logError(un);
              return;
            })
          : void 0;
    if (Kn !== void 0 && Kn.toolCalls > 0) h?.(Kn);
    if (no)
      for (let un = hn.length - 1; un >= 0; un--) {
        let ao = hn[un];
        if (ao && isSyncedTranscriptEntry(ao.payload)) {
          await writeCcrTip(e, ao.event_id ?? ao.payload.uuid, s);
          break;
        }
      }
    let Xn = 0,
      fo,
      To = "none",
      vn = !(!n || n[1] === void 0)
        ? "eager"
        : project.hasInternalAgentEventReader() && (gt || lt === null || L)
          ? "lazy"
          : r && gt
            ? "skipped_delta"
            : "eager",
      subagentReader = project.getInternalSubagentEventReader();
    if (subagentReader && vn === "eager") {
      let un = n && n[1] !== void 0 ? n[1] : await subagentReader();
      ((fo = un?.stats), (To = n && n[1] !== void 0 ? "prefetched" : "inline"));
      let ao = un !== null,
        $o = un?.events;
      if ($o && $o.length > 0) {
        Xn = $o.length;
        let byAgent = new Map();
        for (let Ho of $o) {
          let rr = Ho.session_agent_id || "";
          if (!rr) continue;
          let list = byAgent.get(rr);
          if (!list) ((list = []), byAgent.set(rr, list));
          list.push(fillMissingTranscriptFields(Ho.payload, pn));
        }
        for (let [Ho, rr] of byAgent)
          await writeHydratedAgentTranscript(Ho, rr, s).catch(() => {
            ao = !1;
          });
        logForDebugging(`Hydrated ${$o.length} subagent entries across ${byAgent.size} agents`);
      }
      if (ao) project.setInternalAgentEventReader(null);
    }
    let parse = Date.parse(Ie ?? ""),
      ko = Number.isFinite(parse) ? Math.round((startMs - parse) / 1000) : void 0;
    return (
      F9(project, e, {
        outcome: "ok",
        deltaApplied: gt,
        deltaEvents: yt,
        deltaAppended: At,
        fallbackReason: Ae,
        wroteFile: no,
        onDiskBytes: Je,
        tipAgeSeconds: ko,
      }),
      logForDiagnosticsNoPII("info", "hydrate_ccr_v2_completed", {
        duration_ms: Date.now() - startMs,
        event_count: hn.length,
        subagent_event_count: Xn,
        page_count: stats?.pageCount,
        bytes_received: stats?.bytesReceived,
        content_encoding: stats?.contentEncoding,
        subagent_page_count: fo?.pageCount,
        subagent_read: To,
        subagent_bytes_received: fo?.bytesReceived,
        prefetched: n?.[0] != null,
        on_disk_bytes: Je,
        project_folder_hash: ho ? gn(projectDir) : void 0,
        local_session_id_hash: ho ? gn(e) : void 0,
        behind_tip_folder_hash: Kn?.tipAt && gn(Kn.tipAt.folder),
        behind_tip_session_id_hash: Kn?.tipAt && gn(Kn.tipAt.sessionId),
        delta_events: yt,
        delta_fetch_attempted: Ee !== void 0,
        delta_fetch_applied: gt,
        delta_appended: At,
        behind_rows: Kn?.rows,
        behind_tool_calls: Kn?.toolCalls,
        tip_age_s: ko,
        subagent_skipped_local_reuse: vn === "skipped_delta",
        subagent_hydrate: vn,
        ...(Ae && { delta_fallback_reason: Ae }),
        delta_anchor: pt !== void 0 && pt.walkback > 0 ? "intersected" : "synced",
        on_disk_last_uuid: nt,
        anchor_uuid: pt?.uuid,
        anchor_walkback: pt?.walkback,
        ccr_last_uuid: hn.at(-1)?.payload.uuid,
      }),
      q
    );
  } catch (error) {
    if (error instanceof Error && error.message === "CCRClient: Epoch mismatch (409)") throw error;
    return (
      logForDebugging(`Error hydrating session from CCR v2: ${error}`),
      F9(project, e, { outcome: "threw" }),
      logForDiagnosticsNoPII("error", "hydrate_ccr_v2_fail", {
        settled: q !== void 0,
        errno: sanitizedErrnoLowerForTelemetry(error),
      }),
      q ?? (Z ? "read_failed" : "apply_failed")
    );
  }
}
//@ chunk-e6aww6q8.js:438546-438675 layout
function getFirstPromptInfo(e) {
  let n = getFirstPromptPreview(e, "stored"),
    r = n === extractFirstPrompt ? n : getFirstPromptPreview(e, "shown");
  return r === n ? { firstPrompt: n } : { firstPrompt: n, firstPromptShown: r };
}
//@ chunk-e6aww6q8.js:438675-438695 fingerprint = extractFirstPrompt (1)
var extractFirstPrompt = "No prompt";
//@ chunk-e6aww6q8.js:438695-438833 layout
function getFirstPromptPreview(e, n) {
  let r = getFirstMeaningfulUserMessageTextContent(e, n);
  if (r) {
    let trimmed = r
      .replaceAll(
        `
`,
        " ",
      )
      .trim();
    if (trimmed.length > 200) trimmed = truncateToLength(trimmed, 200).trim() + "\u2026";
    return trimmed;
  }
  return extractFirstPrompt;
}
/**
 * 取第一条有意义的用户文本（跳过 meta、压缩摘要、命令输出），用于会话列表首条提示。
 */
//@ chunk-e6aww6q8.js:438833-439536 facade-majority = getFirstMeaningfulUserMessageTextContent (0.673)
function getFirstMeaningfulUserMessageTextContent(e, n = "stored") {
  for (let msg of e) {
    if (msg.type !== "user" || msg.isMeta) continue;
    if ("isCompactSummary" in msg && msg.isCompactSummary) continue;
    let content = msg.message?.content;
    if (!content) continue;
    let h = n === "shown" && typeof content === "string" ? t7(content, msg.pluginPrompt) : content,
      y = h !== content,
      texts = [];
    if (typeof h === "string") texts.push(h);
    else if (Array.isArray(content)) {
      for (let block of content) if (block.type === "text" && block.text) texts.push(block.text);
    }
    for (let textContent of texts) {
      if (!textContent) continue;
      let L = flattenPastedBlocks(textContent),
        G = y ? null : extractTag(L, COMMAND_NAME);
      if (G) {
        let commandName = G.replace(/^\//, "");
        if (require("./chunk-mvgsex7x.js").builtInCommandNames().has(commandName)) continue;
        else {
          let commandArgs = extractTag(L, "command-args")?.trim();
          if (!commandArgs) continue;
          return `${G} ${commandArgs}`;
        }
      }
      let q = y ? null : extractTag(L, "bash-input");
      if (q) return `! ${q}`;
      if (SYNTHETIC_USER_TEXT_PATTERN.test(L)) continue;
      return L;
    }
  }
  return;
}
//@ chunk-e6aww6q8.js:439536-439637 facade-majority = removeExtraFields (0.786)
function removeExtraFields(transcript) {
  return transcript.map((n) => {
    let { isSidechain: isSidechain, parentUuid: parentUuid, promptId: promptId, ...y } = n;
    return withoutTaskProducerMark(y);
  });
}
//@ chunk-e6aww6q8.js:439637-440004 facade-majority
function withoutTaskProducerMark(e) {
  if (e.type === "attachment" && e.attachment?.type === "queued_command") {
    let s = stripTaskProducer(e.attachment.origin);
    return s === e.attachment.origin ? e : { ...e, attachment: { ...e.attachment, origin: s, [B6e]: !0 } };
  }
  if (e.type !== "user") return e;
  let n = stripTaskProducer(e.origin),
    r = stripTaskProducer(e.queueOrigin);
  return n === e.origin && r === e.queueOrigin
    ? e
    : { ...e, origin: n, queueOrigin: r, ...(n !== e.origin && { [B6e]: !0 }) };
}
/**
 * 对带内部标记（B6e）的 user 消息或 queued_command 附件，复制一份并把 task-notification 类 origin 的 producer 改成 "session-task"；其他消息原样返回。
 */
//@ chunk-e6aww6q8.js:440004-440256 facade-majority = buildTranscriptEntries (0.777)
function withTaskProducerMarkRecorded(message) {
  if (
    message.type === "attachment" &&
    message.attachment.type === "queued_command" &&
    message.attachment[B6e] === !0
  )
    return {
      ...message,
      attachment: { ...message.attachment, origin: markSessionTaskProducer(message.attachment.origin) },
    };
  if (message.type === "user" && message[B6e] === !0)
    return { ...message, origin: markSessionTaskProducer(message.origin) };
  return message;
}
//@ chunk-e6aww6q8.js:440256-440342 layout
function markSessionTaskProducer(origin) {
  return origin?.kind === "task-notification" ? { ...origin, producer: "session-task" } : origin;
}
//@ chunk-e6aww6q8.js:440342-440453 layout
function stripTaskProducer(e) {
  if (e?.kind !== "task-notification" || e.producer === void 0) return e;
  let { producer: producer, ...r } = e;
  return r;
}
/**
 * 加载转录时应用压缩保留段：最后一个压缩边界带保留信息时，重新链接保留消息到锚点后、清零其用量，删除边界前其他消息并把孤立子节点接到保留段末尾，返回末条保留消息 uuid。
 */
//@ chunk-e6aww6q8.js:440453-441757 layout
function applyPreservedSegmentOnLoad(e) {
  let preservedMeta,
    preservedIndex = -1,
    lastBoundaryIndex = -1,
    indexByUuid = new Map(),
    position = 0;
  for (let Se of e.values()) {
    if ((indexByUuid.set(Se.uuid, position), isCompactBoundaryMessage_3(Se))) {
      lastBoundaryIndex = position;
      let compactMetadata = Se.compactMetadata;
      if (compactMetadata?.preservedMessages || compactMetadata?.preservedSegment)
        ((preservedMeta = compactMetadata), (preservedIndex = position));
    }
    position++;
  }
  if (!preservedMeta) return;
  let isLastBoundary = preservedIndex === lastBoundaryIndex,
    relink = isLastBoundary ? applyPreservedSegmentRelinks(preservedMeta, e) : void 0;
  if (isLastBoundary && !relink) return;
  let preserved = relink && relink.preserved.uuids.length > 0 ? relink.preserved : void 0;
  if (preserved?.uuids.some((Se) => !e.has(Se))) {
    logEvent("tengu_relink_walk_broken", {
      source: fromEnumOpt(relink?.source),
      listed: preserved.uuids.length,
      present: count(preserved.uuids, (Se) => e.has(Se)),
      anchorInTranscript: e.has(preserved.anchorUuid),
      transcriptSize: e.size,
    });
    return;
  }
  let preservedUuids = preserved?.uuids ?? [],
    preservedSet = new Set(preservedUuids);
  if (preserved) {
    let at = preservedUuids.at(-1),
      anchorUuid = preserved.anchorUuid;
    for (let we of preservedUuids) {
      let Ee = e.get(we);
      (e.set(we, { ...Ee, parentUuid: anchorUuid }), (anchorUuid = we));
    }
    for (let [we, Ee] of e)
      if (Ee.parentUuid === preserved.anchorUuid && we !== preservedUuids[0])
        e.set(we, { ...Ee, parentUuid: at });
    for (let we of preservedUuids) {
      let Ee = e.get(we);
      if (Ee?.type !== "assistant") continue;
      e.set(we, {
        ...Ee,
        message: {
          ...Ee.message,
          usage: {
            ...Ee.message.usage,
            input_tokens: 0,
            output_tokens: 0,
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: 0,
          },
        },
      });
    }
  }
  let removed = [];
  for (let [Se] of e) {
    let ke = indexByUuid.get(Se);
    if (ke !== void 0 && ke < lastBoundaryIndex && !preservedSet.has(Se)) removed.push(Se);
  }
  for (let Se of removed) e.delete(Se);
  if (preserved && removed.length > 0) {
    let at = preservedUuids.at(-1),
      ke = new Set(removed);
    for (let [we, Ee] of e)
      if ((Ee.type === "user" || Ee.type === "assistant") && Ee.parentUuid !== null && ke.has(Ee.parentUuid))
        e.set(we, { ...Ee, parentUuid: at });
  }
  return preservedUuids.at(-1);
}
//@ chunk-e6aww6q8.js:441757-442329 fingerprint = applyPreservedSegmentRelinks (0.702)
function applyPreservedSegmentRelinks(e, n) {
  if (e.preservedMessages) return { preserved: e.preservedMessages, source: "list" };
  let preservedSegment = e.preservedSegment;
  if (!preservedSegment) return;
  let entryIndex = new Set(),
    toDelete = [],
    idx = n.get(preservedSegment.tailUuid);
  while (idx && !entryIndex.has(idx.uuid)) {
    if ((entryIndex.add(idx.uuid), toDelete.push(idx.uuid), idx.uuid === preservedSegment.headUuid))
      return (
        toDelete.reverse(),
        { preserved: { anchorUuid: preservedSegment.anchorUuid, uuids: toDelete }, source: "walk" }
      );
    idx = idx.parentUuid ? n.get(idx.parentUuid) : void 0;
  }
  logEvent("tengu_relink_walk_broken", {
    source: lit_2("walk"),
    tailInTranscript: n.has(preservedSegment.tailUuid),
    headInTranscript: n.has(preservedSegment.headUuid),
    anchorInTranscript: n.has(preservedSegment.anchorUuid),
    walkSteps: entryIndex.size,
    transcriptSize: n.size,
  });
  return;
}
//@ chunk-e6aww6q8.js:442329-442447 callgraph-witnessed = findLatestMessage (1)
function findLatestMessage(messages, predicate) {
  let latest,
    s = -1 / 0;
  for (let h of messages) {
    if (!predicate(h)) continue;
    let parse = Date.parse(h.timestamp);
    if (parse > s) ((s = parse), (latest = h));
  }
  return latest;
}
/**
 * 从叶子消息沿 parentUuid 回溯到根，反转得到对话链；检测环（tengu_chain_parent_cycle），断链时按时间戳回退，最后补回孤立的并行工具结果。
 */
//@ chunk-e6aww6q8.js:442447-442965 facade-majority = buildConversationChain (0.785)
function buildConversationChain(e, n, r) {
  let transcript = [],
    seen = new Set(),
    y = { entriesBySide: void 0, timedSides: new Map() },
    currentMsg = n;
  while (currentMsg) {
    if (seen.has(currentMsg.uuid)) {
      (logError(
        Error(
          `Cycle detected in parentUuid chain at message ${currentMsg.uuid}. Returning partial transcript.`,
        ),
      ),
        logEvent("tengu_chain_parent_cycle", {}));
      break;
    }
    (seen.add(currentMsg.uuid), transcript.push(currentMsg));
    let parentUuid = currentMsg.parentUuid;
    if (!parentUuid) break;
    let G = e.get(parentUuid);
    if (!G || seen.has(G.uuid)) {
      if (((G = readSessionStartDate(y, e, currentMsg, seen)), G))
        logEvent("tengu_chain_timestamp_fallback", {});
    }
    currentMsg = G;
  }
  if ((transcript.reverse(), isFoamySpringEnabled())) for (let L of zxt(e) ?? []) seen.add(L);
  let w = recoverOrphanedParallelToolResults(e, transcript, seen);
  return (
    attachSideMessages(n, w, seen, r ?? groupNonChainChildrenByParent(e)),
    announceFirstTurnOnce(e, w, seen),
    w
  );
}
//@ chunk-e6aww6q8.js:442965-443830 facade-majority
function warnIfTranscriptUnchained(e, n, r) {
  let s = 0;
  for (let w of e.values()) {
    if (w.type !== "user" && w.type !== "assistant") continue;
    if (w.parentUuid) return;
    s++;
  }
  if (s <= 1) return;
  let h = r && Vt(r) !== null ? r : void 0;
  if (h) {
    let { warnedUnchainedSessions: warnedUnchainedSessions } = su();
    if (warnedUnchainedSessions.has(h)) return;
    warnedUnchainedSessions.add(h);
  }
  let y = count(n, (w) => w.type === "user" || w.type === "assistant"),
    S = `Resume transcript${h ? ` (session ${h})` : ""} has ${s} user/assistant records but none carry parentUuid links; only ${y} reached the resumed conversation. Conversation reconstruction walks parentUuid from the last record, so unlinked records are dropped \u2014 the file's producer must chain records (parentUuid null on the first, the previous record's uuid on each subsequent one).`;
  if (
    (logEvent("tengu_resume_unchained_transcript", { conversational_records: s, survived: y }),
    logForDebugging(S, { level: "error" }),
    hasEmbeddedSearchTools_2() || env.CLAUDE_CODE_ENTRYPOINT === "bench")
  )
    process.stderr.write(`Warning: ${S}
`);
}
//@ chunk-e6aww6q8.js:443830-443948 layout
function getFileSnapshotMessages(e) {
  let n = [];
  for (let r of e.values()) if (r.type === "system" && r.subtype === "file_snapshot") n.push(r);
  return n;
}
//@ chunk-e6aww6q8.js:443948-444137 layout
function groupNonChainChildrenByParent(e) {
  let n = new Map();
  for (let r of e.values())
    if (r.parentUuid && r.type !== "user" && r.type !== "assistant") {
      let s = n.get(r.parentUuid);
      if (s) s.push(r);
      else n.set(r.parentUuid, [r]);
    }
  return n;
}
//@ chunk-e6aww6q8.js:444137-444704 layout
function attachSideMessages(e, n, r, s) {
  if (isSideMessagesEnabled()) {
    let S = (L, G) => (L.timestamp < G.timestamp ? -1 : L.timestamp > G.timestamp ? 1 : 0),
      w = [e];
    while (w.length > 0) {
      let L = w.pop();
      if (L !== e) {
        if (r.has(L.uuid)) continue;
        (r.add(L.uuid), n.push(L));
      }
      let G = s.get(L.uuid) ?? [],
        q = G.length > 1 ? [...G].sort(S) : G;
      for (let Z = q.length - 1; Z >= 0; Z--) if (!r.has(q[Z].uuid)) w.push(q[Z]);
    }
    return;
  }
  let h = [],
    y = [e.uuid];
  while (y.length > 0) {
    let S = y.shift();
    for (let w of s.get(S) ?? []) {
      if (r.has(w.uuid)) continue;
      (r.add(w.uuid), h.push(w), y.push(w.uuid));
    }
  }
  if (h.length > 1) h.sort((S, w) => (S.timestamp < w.timestamp ? -1 : S.timestamp > w.timestamp ? 1 : 0));
  n.push(...h);
}
//@ chunk-e6aww6q8.js:444704-444757 layout
var TENGU_CCR_STORED_GAP_BRIDGE_ENABLED = "tengu_ccr_stored_gap_bridge_enabled",
  Jpo = 16;
//@ chunk-e6aww6q8.js:444757-445149 callgraph-fingerprint = applySnipRemovals (0.189)
function applySnipRemovals(e, n) {
  if (!uC() || !isFoamySpringEnabled() || !Zos(TENGU_CCR_STORED_GAP_BRIDGE_ENABLED)) return;
  let toDelete = new Set(),
    s = 0,
    h = 0,
    y = n ? e.get(n) : void 0;
  while (y?.parentUuid && !toDelete.has(y.uuid)) {
    toDelete.add(y.uuid);
    let entry = e.get(y.parentUuid);
    if (!entry && s < Jpo) {
      if (((entry = removeExtraFields_2(e, y, toDelete)), entry))
        (e.set(y.uuid, { ...y, parentUuid: entry.uuid }),
          (h ||= Date.parse(y.timestamp) - Date.parse(entry.timestamp)),
          s++);
    }
    y = entry;
  }
  if (s > 0)
    logEvent("tengu_ccr_stored_gap_bridged", { bridges: s, newest_gap_ms: h, message_count: e.size });
}
//@ chunk-e6aww6q8.js:445149-445455 fingerprint = removeExtraFields (0.847)
function removeExtraFields_2(e, n, r) {
  let s = [];
  for (let S of e.values()) {
    if (S.uuid === n.uuid) break;
    if (!S.isSidechain && S.timestamp <= n.timestamp) s.push(S);
  }
  let h = new Set(s.map((S) => S.parentUuid)),
    y;
  for (let S of s)
    if (
      !r.has(S.uuid) &&
      !h.has(S.uuid) &&
      !(S.type === "system" && !S.parentUuid) &&
      (!y || S.timestamp >= y.timestamp)
    )
      y = S;
  return y;
}
//@ chunk-e6aww6q8.js:445455-445534 placement = countToolCallsSince (1)
function countToolCallsSince_5(e) {
  return e.type === "assistant" && _D(e.message?.content, "tool_use");
}
//@ chunk-e6aww6q8.js:445534-445621 placement = countToolCallsSince (1)
function hasToolUseBlock(e) {
  return e.type === "assistant" ? collectBlockFieldsByType(e.message?.content, "tool_use", "id") : [];
}
//@ chunk-e6aww6q8.js:445862-446111 placement
function countVisibleMessages_2(e, n) {
  switch (e.type) {
    case "assistant":
      return n !== null && e.message?.id === n;
    case "user":
      return e.isMeta === !0 || _D(e.message?.content, "tool_result");
    case "attachment":
      return !0;
    case "system":
      return e.subtype !== "compact_boundary";
    default:
      return !1;
  }
}
//@ chunk-e6aww6q8.js:446111-446162 layout
function isAssistantTranscriptEntry(e) {
  return isTranscriptMessage(e) && e.type === "assistant";
}
//@ chunk-e6aww6q8.js:446162-446211 layout
function isChainLinkCandidate(e, n) {
  return isLegacyProgressEntry(e) || (isTranscriptMessage(e) && countVisibleMessages_2(e, n));
}
//@ chunk-e6aww6q8.js:446211-446265 layout
function getAssistantMessageId(e, n) {
  return isAssistantTranscriptEntry(e) ? (e.message?.id ?? null) : n;
}
//@ chunk-e6aww6q8.js:446265-446309 layout
function isProgressOrHiddenEntry(e) {
  return isLegacyProgressEntry(e) || (isTranscriptMessage(e) && isAuxiliaryEntry(e));
}
//@ chunk-e6aww6q8.js:446309-446394 layout
function hasMalformedMessage(e) {
  return (
    isTranscriptMessage(e) && (e.type === "user" || e.type === "assistant") && !isPlainObject_4(e.message)
  );
}
/**
 * 并行工具调用时多个 tool_result 只有一个在主链上，把同一 assistant 消息的其余 tool_result 找回插入链中。
 */
//@ chunk-e6aww6q8.js:446394-450439 fingerprint = recoverOrphanedParallelToolResults (0.451)
function recoverOrphanedParallelToolResults(messages, chain, seen) {
  let chainAssistants = chain.filter((It) => It.type === "assistant");
  if (chainAssistants.length === 0) return chain;
  let h = isFoamySpringEnabled(),
    anchorByMsgId = new Map(),
    S = new Map(),
    w = [];
  for (let It of messages.values())
    if (It.type === "assistant" && It.message.id) {
      let Yt = anchorByMsgId.get(It.message.id);
      if (Yt) Yt.push(It);
      else anchorByMsgId.set(It.message.id, [It]);
    } else if (It.type === "user" && _D(It.message?.content, "tool_result")) w.push(It);
  let L = new Set(),
    G = (It, Yt) => {
      if (
        L.has(
          It +
            `
` +
            Yt.uuid,
        )
      )
        return;
      L.add(
        It +
          `
` +
          Yt.uuid,
      );
      let qt = S.get(It);
      if (qt) qt.push(Yt);
      else S.set(It, [Yt]);
    },
    q = (It, Yt) => (It.isSidechain ?? !1) === (Yt.isSidechain ?? !1) && It.agentId === Yt.agentId,
    Z = [];
  for (let It of w) {
    if (It.parentUuid) G(It.parentUuid, It);
    if (!h) continue;
    let Yt = It.parentUuid ? messages.get(It.parentUuid) : void 0,
      qt = new Set(Yt ? hasToolUseBlock(Yt) : []),
      Zt = getToolResultIds(It);
    if (Zt.length > 0 && Zt.every((rn) => qt.has(rn))) continue;
    Z.push(It);
  }
  let siblingsByMsgId = new Map();
  if (Z.length > 0)
    for (let It of anchorByMsgId.values())
      for (let Yt of It) {
        if (Yt.type !== "assistant") continue;
        for (let qt of hasToolUseBlock(Yt)) {
          let group = siblingsByMsgId.get(qt);
          siblingsByMsgId.set(qt, group === void 0 || group?.message.id === Yt.message.id ? Yt : null);
        }
      }
  for (let It of Z) {
    let Yt = "sourceToolAssistantUUID" in It ? It.sourceToolAssistantUUID : void 0,
      qt = typeof Yt === "string" && Yt !== It.parentUuid ? messages.get(Yt) : void 0;
    if (qt && q(It, qt)) G(qt.uuid, It);
    for (let Zt of getToolResultIds(It)) {
      let group = siblingsByMsgId.get(Zt);
      if (group && group.uuid !== It.parentUuid && q(It, group)) G(group.uuid, It);
    }
  }
  let ke,
    we = () => {
      if (ke === void 0) {
        ke = new Set();
        for (let It of chain) for (let Yt of getToolResultIds(It)) ke.add(Yt);
      }
      return ke;
    },
    processedGroups = new Map();
  for (let It = 0; It < chain.length; It++) processedGroups.set(chain[It].uuid, It);
  let inserts = new Set(),
    Ie = [],
    Me = 0,
    We = 0,
    ze = 0,
    lt,
    Je,
    nt = new Map(),
    pt = (It) => nt.get(It.uuid) ?? lR(Je, It),
    Et = (It, Yt) => pt(It) - pt(Yt) || lR(Je, It) - lR(Je, Yt);
  for (let asst of chainAssistants) {
    let msgId = asst.message.id;
    if (!msgId || inserts.has(msgId)) continue;
    inserts.add(msgId);
    let group = anchorByMsgId.get(msgId) ?? [asst],
      Zt = (fo) => !!fo && group.some((To) => To.uuid === fo),
      orphanedSiblings = group.filter((fo) => !seen.has(fo.uuid)),
      pn = [],
      no = [],
      hn = new Set();
    for (let member of group)
      for (let To of S.get(member.uuid) ?? []) {
        if (seen.has(To.uuid) || hn.has(To.uuid)) continue;
        if ((hn.add(To.uuid), Zt(To.parentUuid))) pn.push(To);
        else no.push(To);
      }
    if (no.length > 0) {
      Je ??= vG(messages);
      let fo = new Set(we());
      for (let bo of pn) for (let vn of getToolResultIds(bo)) fo.add(vn);
      no.sort(Et);
      let max = Math.max(...group.map((bo) => lR(Je, bo)));
      for (let bo of no) {
        let vn = getToolResultIds(bo);
        if (
          !vn.some((So) => {
            let trs = siblingsByMsgId.get(So);
            return !fo.has(So) && !!trs && Zt(trs.uuid);
          })
        )
          continue;
        for (let tr of vn) fo.add(tr);
        (nt.set(bo.uuid, Math.max(lR(Je, bo), max + 0.5)), rememberMovedRow(bo.uuid), pn.push(bo), ze++);
      }
    }
    let ho = [...orphanedSiblings, ...pn];
    for (let fo of ho) seen.add(fo.uuid);
    let yn = processedGroups.get(asst.uuid),
      Kn = yn + 1;
    for (let fo of group) {
      let To = processedGroups.get(fo.uuid);
      if (To !== void 0 && To >= Kn) Kn = To + 1;
    }
    while (Kn < chain.length && countVisibleMessages_2(chain[Kn], msgId)) Kn++;
    let Xn = new Map();
    if (group.some(countToolCallsSince_5)) {
      lt ??= buildChildrenIndex(messages);
      let fo = lt,
        To = [...group],
        bo = new Set(group.map((co) => co.uuid));
      for (let co of group)
        for (let So of S.get(co.uuid) ?? [])
          if (seen.has(So.uuid) && !bo.has(So.uuid)) (bo.add(So.uuid), To.push(So));
      let vn = (co, So) => {
        let ko = nt.get(co.uuid);
        for (let un of fo.get(co.uuid) ?? []) {
          let ao = collectLinearChain(un, co, fo, seen);
          for (let $o of ao)
            if ((seen.add($o.uuid), So.push($o), ko !== void 0))
              ((Je ??= vG(messages)), nt.set($o.uuid, Math.max(lR(Je, $o), ko)), rememberMovedRow($o.uuid));
          We += ao.length;
        }
      };
      for (let co of To) vn(co, ho);
      for (let co of chain.slice(yn + 1, Kn)) {
        if (!isAuxiliaryEntry(co)) continue;
        let So = [];
        if ((vn(co, So), So.length > 0)) Xn.set(co.uuid, So);
      }
    }
    if (ho.length === 0 && Xn.size === 0) continue;
    ((Me += orphanedSiblings.length + pn.length),
      (Je ??= vG(messages)),
      ho.sort(Et),
      Ie.push({ start: yn, end: Kn, recovered: ho, anchored: Xn }));
  }
  if (Ie.length === 0) return chain;
  if (
    (logEvent("tengu_chain_parallel_tr_recovered", { recovered_count: Me, recovered_tail_count: We }), ze > 0)
  )
    logEvent("tengu_chain_tool_result_recovered_by_call_id", { recovered_count: ze });
  Ie.sort((It, Yt) => It.start - Yt.start);
  let yt = [];
  for (let It of Ie) {
    let at = yt.at(-1);
    if (at !== void 0 && It.start < at.end) {
      ((at.end = Math.max(at.end, It.end)), (at.recovered = [...at.recovered, ...It.recovered].sort(Et)));
      for (let [qt, Zt] of It.anchored) at.anchored.set(qt, [...(at.anchored.get(qt) ?? []), ...Zt]);
    } else yt.push(It);
  }
  let gt = [],
    At = 0;
  for (let { start: start, end: end, recovered: recovered, anchored: anchored } of yt) {
    gt.push(...chain.slice(At, start + 1));
    let rn = 0;
    for (let pn = start + 1; pn < end; pn++) {
      let no = chain[pn],
        hn = lR(Je, no);
      while (rn < recovered.length && pt(recovered[rn]) < hn) gt.push(recovered[rn++]);
      (gt.push(no), gt.push(...(anchored.get(no.uuid) ?? [])));
    }
    while (rn < recovered.length) gt.push(recovered[rn++]);
    At = end;
  }
  return (gt.push(...chain.slice(At)), gt);
}
/**
 * 检查恢复的消息链与记录的轮次统计是否一致，偏差时打 tengu_resume_consistency_delta。
 */
//@ chunk-e6aww6q8.js:450439-450740 facade-majority = checkResumeConsistency (1)
function checkResumeConsistency(chain) {
  for (let n = chain.length - 1; n >= 0; n--) {
    let r = chain[n];
    if (r.type !== "system" || r.subtype !== "turn_duration") continue;
    let expected = r.messageCount;
    if (expected === void 0) return;
    let actual = n;
    logEvent("tengu_resume_consistency_delta", {
      expected: expected,
      actual: actual,
      delta: actual - expected,
      chain_length: chain.length,
      checkpoint_age_entries: chain.length - 1 - n,
    });
    return;
  }
}
//@ chunk-e6aww6q8.js:450740-450788 file-local
function buildAttributionSnapshotChain(attributionSnapshots, _conversation) {
  return Array.from(attributionSnapshots.values());
}
//@ chunk-e6aww6q8.js:450788-450856 facade-majority
class TranscriptFileFormatError extends Error {
  code;
  constructor(e, n) {
    super(e);
    this.code = n;
  }
}
//@ chunk-e6aww6q8.js:450856-452382 layout
function buildLiteLogFromMessages(e, n, r) {
  let s = findLatestMessage(e.messages.values(), () => !0)?.sessionId ?? r;
  return {
    ...n,
    messages: [],
    value: n.value ?? 0,
    firstPrompt: "",
    messageCount: 0,
    isSidechain: !1,
    sessionId: s,
    customTitle: e.customTitles.get(s) ?? n.customTitle,
    aiTitle: e.aiTitles.get(s) ?? n.aiTitle,
    tag: e.tags.get(s) ?? n.tag,
    agentName: e.agentNames.get(s) ?? n.agentName,
    agentColor: e.agentColors.get(s),
    agentSetting: e.agentSettings.get(s) ?? n.agentSetting,
    mode: e.modes.get(s),
    permissionMode: e.permissionModes.get(s),
    isolationLatch: e.isolationLatches.get(s),
    devModsFolder: e.devModsFolders?.get(s),
    memoryModeStamps: e.memoryModeStamps.get(s) ?? [],
    atisLatch: e.atisLatches.get(s),
    toolsUsed: e.toolsUsedLists?.get(s),
    prNumber: e.prNumbers.get(s) ?? n.prNumber,
    prUrl: e.prUrls.get(s) ?? n.prUrl,
    prRepository: e.prRepositories.get(s) ?? n.prRepository,
    bridgeSessionId: e.bridgeSessionIds.get(s),
    bridgeLastSeq: e.bridgeLastSeqs.get(s),
    bridgeDialogKinds: e.bridgeDialogKindsBySession.get(s),
    bridgeSessionGroupingId: e.bridgeSessionGroupingIds.get(s),
    bridgeNoHistoryBackfill: e.bridgeNoBackfill.get(s),
    bridgeOwnerAccountUuid: e.bridgeOwnerAccountUuids.get(s),
    bridgeOwnerOrganizationUuid: e.bridgeOwnerOrganizationUuids.get(s),
    sessionHistorySuppressed: e.historySuppressed.has(s) ? !0 : void 0,
    worktreeSession: e.worktreeStates.has(s) ? e.worktreeStates.get(s) : n.worktreeSession,
    artifactCommentMonitor: e.artifactCommentMonitors.get(s),
    artifactAutoReactLedger: e.artifactAutoReactLedgers.get(s),
    costState: e.costStates.get(s),
    contentReplacements: e.contentReplacements.get(s) ?? [],
    rewindAnchorUuid: e.rewindAnchorUuid,
  };
}
/**
 * 读取指定 jsonl 文件并构造日志对象（No messages found in JSONL file 时报错），用于 --resume <path>.jsonl。
 */
//@ chunk-e6aww6q8.js:452382-455102 facade-majority = loadTranscriptFromFile (0.439)
async function loadTranscriptFromFile(e, n) {
  let r = isStorageV5Enabled() && n !== void 0 ? getTranscriptStorageKey(e, n) : void 0;
  if (r === void 0 && isDiskless()) throw makeEnoentError(e);
  if (e.endsWith(".jsonl")) {
    let w = r ? void 0 : await stat(e),
      L = await loadTranscriptFile(e, r && { storageV5: r });
    if (L.servedBy === "absent") throw makeEnoentError(e);
    let {
      messages: messages,
      summaries: summaries,
      customTitles: customTitles,
      endedSessions: endedSessions,
      aiTitles: aiTitles,
      tags: tags,
      relocatedCwds: relocatedCwds,
      fileHistorySnapshots: fileHistorySnapshots,
      fileHistoryDeltas: fileHistoryDeltas,
      attributionSnapshots: attributionSnapshots,
      leafUuids: leafUuids,
      contentReplacements: contentReplacements,
      worktreeStates: worktreeStates,
      artifactCommentMonitors: artifactCommentMonitors,
      artifactAutoReactLedgers: artifactAutoReactLedgers,
      costStates: costStates,
      isolationLatches: isolationLatches,
      devModsFolders: devModsFolders,
      memoryModeStamps: memoryModeStamps,
      atisLatches: atisLatches,
      toolsUsedLists: toolsUsedLists,
      bridgeSessionIds: bridgeSessionIds,
      bridgeLastSeqs: bridgeLastSeqs,
      bridgeDialogKindsBySession: bridgeDialogKindsBySession,
      bridgeSessionGroupingIds: bridgeSessionGroupingIds,
      bridgeNoBackfill: bridgeNoBackfill,
      bridgeOwnerAccountUuids: bridgeOwnerAccountUuids,
      bridgeOwnerOrganizationUuids: bridgeOwnerOrganizationUuids,
      historySuppressed: historySuppressed,
      clearedToEmpty: clearedToEmpty,
    } = L;
    if (messages.size === 0)
      throw new TranscriptFileFormatError("No messages found in JSONL file", "no_messages");
    let Kn =
      findLatestMessage(messages.values(), (So) => leafUuids.has(So.uuid)) ??
      (leafUuids.size === 0 && !clearedToEmpty
        ? findLatestMessage(messages.values(), (msg) => !msg.isSidechain)
        : void 0);
    if (!Kn) {
      if (clearedToEmpty) {
        let So = w?.mtime ?? new Date(L.v5Read?.mtimeMs ?? 0);
        return buildLiteLogFromMessages(L, {
          date: So.toISOString(),
          fullPath: e,
          created: So,
          modified: So,
        });
      }
      throw new TranscriptFileFormatError("No valid conversation chain found in JSONL file", "no_chain");
    }
    let transcript = buildConversationChain(messages, Kn);
    warnIfTranscriptUnchained(messages, transcript, Kn.sessionId);
    let summary = summaries.get(Kn.uuid),
      customTitle = customTitles.get(Kn.sessionId),
      tag = tags.get(Kn.sessionId),
      sessionId = Kn.sessionId;
    return {
      ...convertToLogOption(
        transcript,
        0,
        summary,
        customTitle,
        buildFileHistorySnapshots(fileHistorySnapshots, fileHistoryDeltas, transcript),
        tag,
        e,
        buildAttributionSnapshotChain(attributionSnapshots, transcript),
        void 0,
        contentReplacements.get(sessionId) ?? [],
      ),
      rewindAnchorUuid: L.rewindAnchorUuid,
      aiTitle: aiTitles.get(sessionId),
      relocatedCwd: relocatedCwds.get(sessionId),
      ...withEndedByModel({}, endedSessions.has(sessionId)),
      worktreeSession: worktreeStates.has(sessionId) ? worktreeStates.get(sessionId) : void 0,
      artifactCommentMonitor: artifactCommentMonitors.get(sessionId),
      artifactAutoReactLedger: artifactAutoReactLedgers.get(sessionId),
      costState: costStates.get(sessionId),
      isolationLatch: isolationLatches.get(sessionId),
      devModsFolder: devModsFolders?.get(sessionId),
      memoryModeStamps: memoryModeStamps.get(sessionId) ?? [],
      atisLatch: getOrEmptyString(atisLatches, sessionId),
      toolsUsed: toolsUsedLists?.get(sessionId),
      bridgeSessionId: bridgeSessionIds.get(sessionId),
      bridgeLastSeq: bridgeLastSeqs.get(sessionId),
      bridgeDialogKinds: bridgeDialogKindsBySession.get(sessionId),
      bridgeSessionGroupingId: bridgeSessionGroupingIds.get(sessionId),
      bridgeNoHistoryBackfill: bridgeNoBackfill.get(sessionId),
      bridgeOwnerAccountUuid: bridgeOwnerAccountUuids.get(sessionId),
      bridgeOwnerOrganizationUuid: bridgeOwnerOrganizationUuids.get(sessionId),
      sessionHistorySuppressed: historySuppressed.has(sessionId) ? !0 : void 0,
    };
  }
  let s = await stat(e);
  if (s.size > 268435456)
    throw new TranscriptFileFormatError(
      `Transcript file too large to load as JSON (${s.size} bytes)`,
      "too_large",
    );
  let content = await readFile(e, { encoding: "utf-8" }),
    y;
  try {
    y = jsonParse(content);
  } catch (error) {
    throw new TranscriptFileFormatError(`Invalid JSON in transcript file: ${error}`, "invalid_json");
  }
  let S;
  if (Array.isArray(y)) S = y;
  else if (y && typeof y === "object" && "messages" in y) {
    if (!Array.isArray(y.messages))
      throw new TranscriptFileFormatError("Transcript messages must be an array", "bad_shape");
    S = y.messages;
  } else
    throw new TranscriptFileFormatError(
      "Transcript must be an array of messages or an object with a messages array",
      "bad_shape",
    );
  if (S.length === 0) throw new TranscriptFileFormatError("No messages found in JSON file", "no_messages");
  return convertToLogOption(S, 0, void 0, void 0, void 0, void 0, e);
}
//@ chunk-e6aww6q8.js:455102-455270 layout
function makeEnoentError(e) {
  return Object.assign(
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `ENOENT: no such file or directory, stat '${e}'`,
      "ENOENT: no such file or directory",
    ),
    { code: "ENOENT", syscall: "stat", path: e },
  );
}
//@ chunk-e6aww6q8.js:455270-455527 fingerprint = hasVisibleUserContent (1)
function hasVisibleUserContent(message) {
  if (message.type !== "user") return !1;
  if (message.isMeta) return !1;
  let content = message.message?.content;
  if (!content) return !1;
  if (typeof content === "string") return content.trim().length > 0;
  if (Array.isArray(content))
    return content.some(
      (block) => block.type === "text" || block.type === "image" || block.type === "document",
    );
  return !1;
}
/**
 * assistant 消息含非空 text 块。旧版名 getAssistantMessageText 不准确。
 */
//@ chunk-e6aww6q8.js:455527-455721 file-local
function hasNonEmptyAssistantText(message) {
  if (message.type !== "assistant") return !1;
  let content = message.message?.content;
  if (!content || !Array.isArray(content)) return !1;
  return content.some(
    (block) => block.type === "text" && typeof block.text === "string" && block.text.trim().length > 0,
  );
}
/**
 * 统计含可见内容的 user/assistant 消息数（会话列表用）。旧版名 isSyntheticMessage 为错配。
 */
//@ chunk-e6aww6q8.js:455721-455902 placement = isSyntheticMessage (1)
function countVisibleMessages(message) {
  let n = 0;
  for (let r of message)
    switch (r.type) {
      case "user":
        if (hasVisibleUserContent(r)) n++;
        break;
      case "assistant":
        if (hasNonEmptyAssistantText(r)) n++;
        break;
      case "attachment":
      case "system":
      case "progress":
        break;
    }
  return n;
}
//@ chunk-e6aww6q8.js:455902-456426 fingerprint = convertToLogOption (0.925)
function convertToLogOption(
  transcript,
  value = 0,
  summary,
  customTitle,
  fileHistorySnapshots,
  tag,
  fullPath,
  attributionSnapshots,
  agentSetting,
  contentReplacements,
) {
  let lastMessage = transcript.at(-1),
    firstMessage = transcript[0],
    firstPrompt = getFirstPromptInfo(transcript),
    created = new Date(firstMessage.timestamp),
    modified = new Date(lastMessage.timestamp);
  return {
    date: lastMessage.timestamp,
    messages: removeExtraFields(transcript),
    fullPath: fullPath,
    value: value,
    created: created,
    modified: modified,
    ...firstPrompt,
    messageCount: countVisibleMessages(transcript),
    isSidechain: firstMessage.isSidechain,
    teamName: firstMessage.teamName,
    sessionKind: firstMessage.sessionKind,
    agentName: firstMessage.agentName,
    agentSetting: agentSetting,
    leafUuid: (transcript.findLast((Ee) => !OB(Ee.uuid)) ?? lastMessage).uuid,
    summary: summary,
    customTitle: customTitle,
    tag: tag,
    fileHistorySnapshots: fileHistorySnapshots,
    attributionSnapshots: attributionSnapshots,
    contentReplacements: contentReplacements,
    gitBranch: lastMessage.gitBranch,
    projectPath: firstMessage.cwd,
  };
}
/**
 * 统计会话分叉（同一会话多叶子），打 tengu_session_forked_branches_fetched。
 */
//@ chunk-e6aww6q8.js:456426-456852 fingerprint = trackSessionBranchingAnalytics (1)
async function trackSessionBranchingAnalytics(logs) {
  let sessionIdCounts = new Map(),
    maxCount = 0;
  for (let log of logs) {
    let sessionId = getSessionIdFromLog(log);
    if (sessionId) {
      let newCount = (sessionIdCounts.get(sessionId) || 0) + 1;
      (sessionIdCounts.set(sessionId, newCount), (maxCount = Math.max(newCount, maxCount)));
    }
  }
  if (maxCount <= 1) return;
  let branchCounts = Array.from(sessionIdCounts.values()).filter((S) => S > 1),
    sessionsWithBranches = branchCounts.length,
    totalBranches = branchCounts.reduce((sum, count) => sum + count, 0);
  logEvent("tengu_session_forked_branches_fetched", {
    total_sessions: sessionIdCounts.size,
    sessions_with_branches: sessionsWithBranches,
    max_branches_per_session: Math.max(...branchCounts),
    avg_branches_per_session: Math.round(totalBranches / sessionsWithBranches),
    total_transcript_count: logs.length,
  });
}
/**
 * 列出当前项目（及 worktree）的会话日志（lite），供 /resume 与 --continue 使用。
 */
//@ chunk-e6aww6q8.js:456852-457422 facade-majority = fetchLogs (0)
async function fetchLogs(e, n) {
  if (isDiskless() && getTranscriptStorageContext(n) === void 0) return [];
  let r = getOriginalCwd(),
    s = (await findProjectDir(r, wrapStorageSource(getTranscriptStorageContext(n)))) ?? getProjectDir_2(r),
    [h, y] = await Promise.all([getSessionFilesLite(s, e, r, n), readSessionAliases(r, n)]),
    S = h;
  if (e !== void 0 && h.length === e && (await allLogsShareCwd(h, r, n))) {
    let w = await getSessionFilesLite(s, void 0, r, n),
      alloc = Buffer.alloc(LITE_READ_BUF_SIZE),
      G = [];
    for (let q of w)
      if (!(await logCwdMatches(q, r, alloc, n))) {
        if ((G.push(q), G.length === e)) break;
      }
    S = G;
  }
  if (UNSAFE_PATH_CHAR_PATTERN.test(r) && (await allLogsShareCwd(S, r, n)))
    S = await getSessionFilesLite_2(r, s, e, !1, void 0, n);
  if (y.length > 0) {
    let mapped = (await Promise.all(y.map((L) => getSessionFilesLite(L, e, void 0, n))))
      .flat()
      .map((L) => ({ ...L, isAlias: !0 }));
    if (((S = latestLogPerSession(S.concat(mapped))), e !== void 0)) S = S.slice(0, e);
  }
  return (await trackSessionBranchingAnalytics(S), S);
}
//@ chunk-e6aww6q8.js:457422-457634 layout
function writeTranscriptMetadataSync(e, n) {
  if (isTranscriptPersistenceDisabled()) return;
  assertDiskWritable("transcript_metadata", e);
  let r = getFsImplementation(),
    s =
      jsonStringify(n) +
      `
`;
  try {
    r.appendFileSync(e, s, { mode: 384 });
  } catch {
    (r.mkdirSync(dirname(e), { mode: 448 }), r.appendFileSync(e, s, { mode: 384 }));
  }
  getProject().fireMirror(e, [n]);
}
/**
 * 同步向已存在的转录文件追加一条记录（文件末尾无换行时先补换行、可换用替代记录），完整写入后触发镜像；文件不存在或为空时跳过。
 */
//@ chunk-e6aww6q8.js:457634-458137 layout
function appendEntrySync(e, n, r) {
  if (isTranscriptPersistenceDisabled()) return;
  if (isDiskless()) {
    warnDisklessSettingsWrite("transcript_stop_now", e);
    return;
  }
  let line =
      jsonStringify(n) +
      `
`,
    fd;
  try {
    fd = openSync(e, constants.O_RDWR | constants.O_APPEND);
  } catch (error) {
    let S = getErrnoCode(error);
    if (S === "ENOENT" || S === "ENOTDIR") return;
    throw error;
  }
  try {
    let { size: size } = fstatSync(fd);
    if (size === 0) return;
    let S = !endsWithNewlineSync(fd, size);
    if (S && r !== void 0) n = r;
    let buffer = Buffer.from(
        S
          ? `
` +
              jsonStringify(n) +
              `
`
          : line,
        "utf8",
      ),
      L = void 0,
      G = 0;
    while (G < buffer.length) {
      let q = writeSync(fd, buffer, G, buffer.length - G, L);
      if (q <= 0) throw Error("appendEntryToExistingFileSync: short write");
      if (((G += q), L !== void 0)) L += q;
    }
  } finally {
    closeSync(fd);
  }
  getProject().fireMirror(e, [n]);
}
//@ chunk-e6aww6q8.js:458137-458381 layout
function readTranscriptTail(e) {
  if (isDiskless()) return "";
  let n;
  try {
    n = openSync(e, "r");
    let r = fstatSync(n),
      max = Math.max(0, r.size - LITE_READ_BUF_SIZE),
      allocUnsafe = Buffer.allocUnsafe(Math.min(LITE_READ_BUF_SIZE, r.size - max)),
      y = readSync(n, allocUnsafe, 0, allocUnsafe.length, max);
    return allocUnsafe.toString("utf8", 0, y);
  } catch {
    return "";
  } finally {
    if (n !== void 0)
      try {
        closeSync(n);
      } catch {}
  }
}
//@ chunk-e6aww6q8.js:458381-458394 layout
var sIt = createKeyedQueue();
//@ chunk-e6aww6q8.js:458394-458446 layout
function OMt(e) {
  su().openAppendRelocationBracket(e);
}
//@ chunk-e6aww6q8.js:458446-458598 layout
function flushParkedAppends(e) {
  let closeAppendRelocationBracket = su().closeAppendRelocationBracket();
  if (!closeAppendRelocationBracket) return;
  for (let {
    entry: entry,
    storageV5: storageV5,
    opts: opts,
    resolve: resolve,
    reject: reject,
  } of closeAppendRelocationBracket)
    appendEntryToFileAsync(e, entry, storageV5, opts).then(resolve, reject);
}
//@ chunk-e6aww6q8.js:458598-459186 facade-majority
function appendEntryToFileAsync(e, n, r, s) {
  if (isTranscriptPersistenceDisabled()) return Promise.resolve();
  let { relocationParkedAppends: relocationParkedAppends, relocationParkedPath: relocationParkedPath } = su();
  if (relocationParkedAppends !== null && e === relocationParkedPath)
    return new Promise((G, q) => {
      relocationParkedAppends.push({ entry: n, storageV5: r, opts: s, resolve: G, reject: q });
    });
  let S =
      jsonStringify(n) +
      `
`,
    w =
      s?.tornTailEntry !== void 0
        ? jsonStringify(s.tornTailEntry) +
          `
`
        : void 0,
    run = sIt.run(e, async () => {
      let G = await appendToTranscriptFile(e, S, r, s?.onlyIfExists, w);
      if (G !== "skipped") {
        let q =
          (G === "direct-torn" || G === "backend-torn") && s?.tornTailEntry !== void 0 ? s.tornTailEntry : n;
        getProject().fireMirror(e, [q]);
      }
    });
  return (
    run.catch((G) => {
      logForDebugging(`appendEntryToFileAsync: append to ${e} failed: ${errorMessage(G)}`, {
        level: "error",
      });
    }),
    run
  );
}
//@ chunk-e6aww6q8.js:459186-459226 facade-majority
async function flushAppendEntryQueues() {
  await sIt.settle();
}
//@ chunk-e6aww6q8.js:459226-459401 layout
function isLastPromptLine(e) {
  if (!e.includes('"type":"last-prompt"') || !e.includes('"leafUuid":')) return !1;
  try {
    let n = jsonParseRaw(e);
    return n.type === "last-prompt" && n.leafUuid !== void 0;
  } catch {
    return !1;
  }
}
//@ chunk-e6aww6q8.js:459401-459819 layout = readFileRange (0.819)
async function readFileRange(e, n) {
  if (isStorageV5Enabled() && n !== void 0 && wG(e) !== void 0)
    return (
      (
        await readTranscriptTailViaStorage(e, LITE_READ_BUF_SIZE, n).catch(() => {
          return;
        })
      )?.content ?? ""
    );
  let r = yH(e);
  if (r === void 0) return "";
  let s;
  try {
    s = await open(r, "r");
    let stats = await s.stat(),
      max = Math.max(0, stats.size - LITE_READ_BUF_SIZE),
      bytesToRead = Math.min(LITE_READ_BUF_SIZE, stats.size - max);
    if (bytesToRead <= 0) return "";
    let buffer = Buffer.allocUnsafe(bytesToRead),
      { bytesRead: bytesRead } = await s.read(buffer, 0, bytesToRead, max);
    return buffer.toString("utf8", 0, bytesRead);
  } catch {
    return "";
  } finally {
    if (s)
      try {
        await s.close();
      } catch {}
  }
}
//@ chunk-e6aww6q8.js:459819-460025 facade-majority
async function markSessionEndedByModel(e, n) {
  if (isTranscriptPersistenceDisabled()) return;
  await appendEntryToFileAsync(
    getTranscriptPathForSession(e),
    { type: "ended-by-model", timestamp: new Date().toISOString(), sessionId: e },
    n,
  ).catch((r) => {
    logForDebugging(`markSessionEndedByModel: transcript append failed: ${errorMessage(r)}`);
  });
}
//@ chunk-e6aww6q8.js:460025-460111 facade-majority
function applyEndedByModelOnResume(e, n) {
  let r = Boolean(e);
  n((s) => (s.endedByModel === r ? s : { ...s, endedByModel: r }));
}
/**
 * 追加 custom-title 记录（/rename 等），更新内存中的会话标题并发出标题变更事件。
 */
//@ chunk-e6aww6q8.js:460111-460503 facade-majority = saveCustomTitle (0.756)
async function saveCustomTitle(e, n, r, s = "user", h) {
  let resolvedPath = r ?? getTranscriptPathForSession(e);
  try {
    await appendEntryToFileAsync(resolvedPath, { type: "custom-title", customTitle: n, sessionId: e }, h);
  } catch (error) {
    if (isSyscallError(error))
      logForDebugging(
        `saveCustomTitle: transcript append failed (${getErrnoCode(error)}): ${errorMessage(error)}`,
        { level: "error" },
      );
    else throw error;
  }
  if (!isTranscriptPersistenceDisabled()) {
    let S = e === getSessionId() ? getTranscriptPathForSession(e) : resolvedPath;
    await writeSessionTitleSidecar(S, e, n, h);
  }
  if (e === getSessionId()) ((getProject().currentSessionTitle = n), su().sessionTitleChanged.emit());
  logEvent("tengu_session_renamed", { source: fromEnum(s) });
}
/**
 * 追加 ai-title 记录（自动生成的会话标题）。
 */
//@ chunk-e6aww6q8.js:460503-460722 facade-majority = saveAiGeneratedTitle (0.539)
function saveAiGeneratedTitle(e, n, r) {
  if (
    (appendEntryToFileAsync(
      getTranscriptPathForSession(e),
      { type: "ai-title", aiTitle: n, sessionId: e },
      r,
    ).catch((s) => {
      logForDebugging(`saveAiGeneratedTitle: transcript append failed: ${errorMessage(s)}`);
    }),
    e === getSessionId())
  )
    ((getProject().currentSessionAiTitle = n), su().sessionTitleChanged.emit());
}
/**
 * 追加 pr-link 记录（PR 编号、URL、仓库），打 tengu_session_linked_to_pr。
 */
//@ chunk-e6aww6q8.js:460722-461204 facade-majority = linkSessionToPR (0.804)
async function linkSessionToPR(e, n, r, s, h, y) {
  let resolvedPath = h ?? getTranscriptPathForSession(e);
  try {
    (await appendEntryToFileAsync(
      resolvedPath,
      {
        type: "pr-link",
        sessionId: e,
        prNumber: n,
        prUrl: r,
        prRepository: s,
        timestamp: new Date().toISOString(),
      },
      y,
    ),
      logEvent("tengu_session_linked_to_pr", { prNumber: n }));
  } catch (error) {
    let L = getErrnoCode(error);
    if (isSyscallError(error))
      logForDebugging(
        `linkSessionToPR: failed to append pr-link entry to ${resolvedPath} (${L}): ${errorMessage(error)}`,
        { level: "error" },
      );
    else logError(error);
    reportTranscriptWriteFailure(su().writerHealth, "pr_link", error, resolvedPath);
  }
  if (e === getSessionId()) {
    let project = getProject();
    ((project.currentSessionPrNumber = n),
      (project.currentSessionPrUrl = r),
      (project.currentSessionPrRepository = s));
  }
}
//@ chunk-e6aww6q8.js:461204-461292 layout
function iIt(e, n, r) {
  return Boolean(e.sessionFilePath) || (r?.targetExists === !0 && n !== void 0);
}
//@ chunk-e6aww6q8.js:461292-462041 facade-majority
function saveBridgeSession(e, n, r, s, h, y, S, w, L, G) {
  let q = getProject();
  if (iIt(q, s, L))
    appendEntryToFileAsync(
      s ?? getTranscriptPathForSession(e),
      {
        type: "bridge-session",
        sessionId: e,
        bridgeSessionId: n,
        lastSequenceNum: r,
        ...(h?.length && { declaredDialogKinds: h }),
        ...(y && { sessionGroupingId: y }),
        ...(S && { noHistoryBackfill: !0 }),
        ...(w?.accountUuid && { ownerAccountUuid: w.accountUuid }),
        ...(w?.organizationUuid && { ownerOrganizationUuid: w.organizationUuid }),
      },
      G,
    ).catch((Z) => {
      logForDebugging(`saveBridgeSession: transcript append failed: ${errorMessage(Z)}`);
    });
  if (e === getSessionId())
    ((q.currentSessionBridgeId = n),
      (q.currentSessionBridgeSeq = r),
      (q.currentSessionBridgeDialogKinds = h?.length ? h : void 0),
      (q.currentSessionBridgeGroupingId = y),
      (q.currentSessionBridgeNoBackfill = S ? !0 : void 0),
      (q.currentSessionBridgeOwnerAccountUuid = w?.accountUuid),
      (q.currentSessionBridgeOwnerOrganizationUuid = w?.organizationUuid));
}
//@ chunk-e6aww6q8.js:462041-462279 facade-majority
function writeHistorySuppression(e, n, r, s, h) {
  let y = e ?? getSessionId();
  if (!y) return;
  let S;
  if (!isTranscriptPersistenceDisabled())
    S = appendEntryToFileAsync(
      n ?? getTranscriptPathForSession(y),
      buildHistorySuppressionEntry(y, r, s),
      h,
    ).catch((w) => {
      logForDebugging(`writeHistorySuppression: transcript append failed: ${errorMessage(w)}`);
    });
  if ((markSessionHistorySuppressedFor(y), y === getSessionId()))
    getProject().currentSessionHistorySuppressed = !0;
  return S;
}
//@ chunk-e6aww6q8.js:462279-462343 facade-majority
function isSessionHistorySuppressed() {
  return getProject().currentSessionHistorySuppressed === !0;
}
//@ chunk-e6aww6q8.js:462343-462597 facade-majority
async function readHistorySuppressionFromDisk(e) {
  let n = getSessionId(),
    r = getMaterializedSessionFile(),
    s = Boolean(n) && r !== null && !isOwnTranscriptFile(n, r);
  try {
    let h = s ? getDerivedTranscriptPathForSession(n) : (r ?? getTranscriptPath()),
      y = await scanTranscriptForSuppression(h, { sid: n || void 0 }, e);
    return s && y === "clean" ? "torn" : y;
  } catch (error) {
    if (isENOENT(error)) {
      if (s) return "torn";
      return isTranscriptRelocationInProgress() ? "read-error" : "clean";
    }
    return "read-error";
  }
}
//@ chunk-e6aww6q8.js:462597-462659 facade-majority
function isTranscriptRelocationInProgress() {
  return getProject().isTranscriptRelocationInProgress();
}
//@ chunk-e6aww6q8.js:462659-462710 facade-majority
function mirrorInternalEntryForTesting(e) {
  return getProject().mirrorInternalEntry(e);
}
//@ chunk-e6aww6q8.js:462710-462745 facade-majority
var SUPPRESSION_SCAN_MAX_LINES = 1e5,
  SUPPRESSION_SCAN_MAX_LINES_ANT = 1e6,
  SUPPRESSION_SCAN_MAX_BYTES_ANT = 4294967296;
//@ chunk-e6aww6q8.js:462745-462989 facade-majority
class SuppressionScanBudget {
  maxLines;
  maxBytes;
  lines = 0;
  chars = 0;
  constructor(e = SUPPRESSION_SCAN_MAX_LINES, n = 1 / 0) {
    this.maxLines = e;
    this.maxBytes = n;
  }
  static forBackendRead() {
    return new SuppressionScanBudget(SUPPRESSION_SCAN_MAX_LINES, 1 / 0);
  }
  spend(e) {
    return ((this.chars += e.length + 1), ++this.lines >= this.maxLines || this.chars >= this.maxBytes);
  }
}
//@ chunk-e6aww6q8.js:462989-463004 facade-majority
var SUPPRESSION_SCAN_CHUNK_BYTES = 262144;
//@ chunk-e6aww6q8.js:463004-463134 facade-majority
function suppressionScanFailure(e) {
  if (isENOENT(e)) return "no-file";
  if (e instanceof FileChangedDuringReadError) return e.partialRead ? "partial-read" : "file-changed";
  return "read-error";
}
//@ chunk-e6aww6q8.js:463134-463151 facade-majority
function logSuppressionScan(e) {}
//@ chunk-e6aww6q8.js:463151-463643 facade-majority
async function scanTranscriptForSuppression(e, n, r) {
  let s = isStorageV5Enabled() && r !== void 0 ? getTranscriptStorageKey(e, r) : void 0,
    h = n.budget ?? (s !== void 0 ? SuppressionScanBudget.forBackendRead() : new SuppressionScanBudget()),
    now = Date.now(),
    S,
    w =
      s !== void 0
        ? openTranscriptStream(s.backend, s.key)
        : readLinesReverse(e, SUPPRESSION_SCAN_CHUNK_BYTES, {
            onOpen: (q) => {
              S = q;
            },
          }),
    L = "clean",
    G;
  try {
    for await (let q of w) {
      G ??= q;
      let spend = h.spend(q);
      if (matchesHistorySuppressionLine(q, n)) return ((L = "found"), L);
      if (spend) return ((L = "budget-exhausted"), L);
    }
    return "clean";
  } catch (error) {
    throw ((L = suppressionScanFailure(error)), error);
  } finally {
    logSuppressionScan({
      leg: "transcript-scan",
      throughBackend: s !== void 0,
      outcome: L,
      lines: h.lines,
      charsRead: h.chars,
      fileBytes: S,
      startMs: now,
    });
  }
}
//@ chunk-e6aww6q8.js:463643-464057 facade-majority
async function scanAppendedForSuppression(e, n, r, s) {
  for (;;) {
    let h = 0,
      y = 0,
      S,
      w = !1;
    try {
      for await (let L of readLinesReverse(e, SUPPRESSION_SCAN_CHUNK_BYTES, {
        onOpen: (G) => {
          h = G;
        },
      })) {
        if (h < n.size) break;
        if (L === n.lastLine && y === h - n.size) {
          w = !0;
          break;
        }
        S ??= L;
        let spend = s.spend(L);
        if (matchesHistorySuppressionLine(L, r)) return "found";
        if (spend) return "budget-exhausted";
        y += Buffer.byteLength(L) + 1;
      }
    } catch (error) {
      throw isENOENT(error) ? new FileChangedDuringReadError() : error;
    }
    if (h < n.size) throw new FileChangedDuringReadError();
    if (h === n.size && (w || S === void 0)) return "clean";
    n = { size: h, lastLine: S ?? n.lastLine };
  }
}
//@ chunk-e6aww6q8.js:464057-464124 facade-majority = getErrorsPath (1)
function isOwnTranscriptFile(e, n) {
  return e !== void 0 && n != null && basename_2(n) === `${e}.jsonl`;
}
//@ chunk-e6aww6q8.js:464124-464178 facade-majority = getErrorsPath (1)
function getDerivedTranscriptPathForSession(e) {
  let n = resolveProjectDir();
  return join_3(n, `${e}.jsonl`);
}
//@ chunk-e6aww6q8.js:464178-464357 facade-majority
function matchesHistorySuppressionLine(e, n = {}) {
  if (!e.includes('"history-suppression"')) return !1;
  try {
    let r = jsonParse(e);
    return r.type === "history-suppression" && (n.sid === void 0 || r.sessionId === n.sid);
  } catch {
    return !1;
  }
}
//@ chunk-e6aww6q8.js:464357-464879 facade-majority
function buildForkAdoptionMeta(e, n = {}) {
  return {
    ...e,
    ...(n.stripWorktreeSession && { worktreeSession: void 0 }),
    ...(n.stripRelocatedCwd && { relocatedCwd: void 0 }),
    memoryModeStamps: e.memoryModeStamps?.map((r) => ({
      ...r,
      written: e.forkedFromSessionId !== void 0 ? (r.written ?? !0) : !1,
    })),
    devModsFolder: void 0,
    artifactCommentMonitor: void 0,
    artifactAutoReactLedger: void 0,
    bridgeSessionId: void 0,
    bridgeLastSeq: void 0,
    bridgeDialogKinds: void 0,
    bridgeSessionGroupingId: void 0,
    bridgeNoHistoryBackfill: void 0,
    bridgeOwnerAccountUuid: void 0,
    bridgeOwnerOrganizationUuid: void 0,
  };
}
//@ chunk-e6aww6q8.js:464879-465180 facade-majority
async function adoptForkSessionMetadata(e, n) {
  let r = n.destSid ?? pinSessionId(getSessionId()),
    s = e.sessionHistorySuppressed === !0 || isSessionHistorySuppressedFor(pinSessionId(e.sessionId));
  if (s) await writeHistorySuppression(r, void 0, "fork_inherit", void 0, n.storageV5);
  (restoreSessionMetadata(
    buildForkAdoptionMeta(s && !e.sessionHistorySuppressed ? { ...e, sessionHistorySuppressed: !0 } : e, n),
    { taintSid: r, storageV5: n.storageV5 },
  ),
    copyPrecautionarySuppressionTo(r, pinSessionId(e.sessionId)));
}
//@ chunk-e6aww6q8.js:465180-465235 facade-majority
function holdSessionHistorySuppression() {
  getProject().currentSessionHistorySuppressed = !0;
}
//@ chunk-e6aww6q8.js:465235-465321 facade-majority
function holdSessionHistorySuppressionFor(e) {
  if ((markSessionHistorySuppressedFor(e), e !== void 0 && e === getSessionId()))
    getProject().currentSessionHistorySuppressed = !0;
}
//@ chunk-e6aww6q8.js:465321-465436 facade-majority
function markSessionHistorySuppressedFor(e) {
  if (e === void 0) return;
  let n = getProject();
  ((n.knownTaintedSessionIds ??= new Set()), n.knownTaintedSessionIds.add(e));
}
//@ chunk-e6aww6q8.js:465436-465512 facade-majority
function isSessionHistorySuppressedFor(e) {
  return e !== void 0 && getProject().knownTaintedSessionIds?.has(e) === !0;
}
//@ chunk-e6aww6q8.js:465512-465571 facade-majority
function dropSessionHistorySuppression() {
  getProject().currentSessionHistorySuppressed = void 0;
}
//@ chunk-e6aww6q8.js:465571-465595 facade-majority
function pinSessionId(e) {
  return e;
}
//@ chunk-e6aww6q8.js:465595-465734 facade-majority
function holdPrecautionarySuppressionFor(e) {
  if (!e) return;
  let n = getProject();
  ((n.currentSessionPrecautionarySuppression ??= new Set()), n.currentSessionPrecautionarySuppression.add(e));
}
//@ chunk-e6aww6q8.js:465734-465877 facade-majority
function dropPrecautionarySuppressionForTesting() {
  ((getProject().currentSessionPrecautionarySuppression = void 0),
    (getProject().clearResilientPrecautionSids = void 0),
    (getProject().scanUncertaintyHoldSids = void 0));
}
//@ chunk-e6aww6q8.js:465877-466002 facade-majority
function releasePrecautionarySuppressionFor(e) {
  let n = getProject();
  if (e && !n.clearResilientPrecautionSids?.has(e)) n.currentSessionPrecautionarySuppression?.delete(e);
}
//@ chunk-e6aww6q8.js:466002-466129 facade-majority
function markPrecautionClearResilientFor(e) {
  if (e === void 0) return;
  let n = getProject();
  ((n.clearResilientPrecautionSids ??= new Set()), n.clearResilientPrecautionSids.add(e));
}
//@ chunk-e6aww6q8.js:466129-466246 facade-majority
function markScanUncertaintyHoldFor(e) {
  if (e === void 0) return;
  let n = getProject();
  ((n.scanUncertaintyHoldSids ??= new Set()), n.scanUncertaintyHoldSids.add(e));
}
//@ chunk-e6aww6q8.js:466246-466323 facade-majority
function isScanUncertaintyHoldFor(e) {
  return e !== void 0 && getProject().scanUncertaintyHoldSids?.has(e) === !0;
}
//@ chunk-e6aww6q8.js:466323-466400 facade-majority
function claimPrecautionHoldForObservedCause(e) {
  if (e === void 0) return;
  getProject().scanUncertaintyHoldSids?.delete(e);
}
//@ chunk-e6aww6q8.js:466400-466623 facade-majority
function releaseScanUncertaintyHoldFor(e) {
  if (e === void 0) return;
  let n = getProject();
  if (!n.scanUncertaintyHoldSids?.has(e)) return;
  (n.scanUncertaintyHoldSids.delete(e),
    n.clearResilientPrecautionSids?.delete(e),
    n.currentSessionPrecautionarySuppression?.delete(e));
}
//@ chunk-e6aww6q8.js:466623-466658 facade-majority
function isPrecautionarySuppressionHeld() {
  return isPrecautionarySuppressionHeldFor(pinSessionId(getSessionId()));
}
//@ chunk-e6aww6q8.js:466658-466750 facade-majority
function isPrecautionarySuppressionHeldFor(e) {
  return e !== void 0 && getProject().currentSessionPrecautionarySuppression?.has(e) === !0;
}
//@ chunk-e6aww6q8.js:466750-466943 facade-majority
function copyPrecautionarySuppressionTo(e, n) {
  if (!e || !n) return;
  let r = getProject(),
    currentSessionPrecautionarySuppression = r.currentSessionPrecautionarySuppression;
  if (currentSessionPrecautionarySuppression?.has(n)) {
    if ((currentSessionPrecautionarySuppression.add(e), r.clearResilientPrecautionSids?.has(n)))
      r.clearResilientPrecautionSids.add(e);
  }
}
//@ chunk-e6aww6q8.js:466943-466991 facade-majority
function registerLiveSuppressionProbe(e) {
  su().setLiveSuppressionProbe(e);
}
//@ chunk-e6aww6q8.js:466991-467048 facade-majority
function isLiveBridgeSuppressed() {
  return su().liveSuppressionProbe?.() === !0;
}
//@ chunk-e6aww6q8.js:467048-467069 facade-majority = orgStatus (1)
var PENDING_BRIDGE_SESSION = "pending",
  FG;
//@ chunk-e6aww6q8.js:467069-467090 facade-majority
function registerForeignConversationProbe(e) {
  FG = e;
}
//@ chunk-e6aww6q8.js:467090-467126 facade-majority
function bridgeSessionsForPulledRow(e) {
  return K9()?.get(e);
}
//@ chunk-e6aww6q8.js:467126-467209 layout
function imo(e) {
  if (e === void 0) return;
  for (let n of e) if (n !== PENDING_BRIDGE_SESSION) return n;
  return PENDING_BRIDGE_SESSION;
}
//@ chunk-e6aww6q8.js:467209-467248 layout
function K9() {
  return FG?.().pulledRows;
}
//@ chunk-e6aww6q8.js:467248-467422 facade-majority
function isRowForeignToBridgeSession(e, n) {
  if (n === void 0) return !1;
  if (e.foreignToBridgeSession === n || e.foreignToBridgeSession === PENDING_BRIDGE_SESSION) return !0;
  let r = bridgeSessionsForPulledRow(e.uuid);
  return r !== void 0 && (r.has(n) || r.has(PENDING_BRIDGE_SESSION));
}
//@ chunk-e6aww6q8.js:467422-467463 facade-majority
function isBridgeBindingForeign() {
  return FG?.().foreign === !0;
}
//@ chunk-e6aww6q8.js:467463-467570 facade-majority
function isForeignToBinding(e) {
  let n = FG?.();
  if (n?.foreign !== !0) return !1;
  if (!e || !n.boundSid) return !0;
  return e !== n.boundSid;
}
//@ chunk-e6aww6q8.js:467570-467682 facade-majority
function bridgeSessionForPulledWindow(e) {
  let n = FG?.().pulledWindow;
  return n !== void 0 && e !== void 0 && n.sids.has(e) ? n.bridgeSessionId : void 0;
}
//@ chunk-e6aww6q8.js:467682-467720 facade-majority
function getBridgeBoundConversationSid() {
  return FG?.().boundSid;
}
//@ chunk-e6aww6q8.js:467720-467792 facade-majority
function isCompactPairWithheldFromRemote() {
  return (
    isSessionHistorySuppressed() ||
    getCurrentSessionBridge()?.noHistoryBackfill === !0 ||
    isLiveBridgeSuppressed() ||
    isPrecautionarySuppressionHeld()
  );
}
//@ chunk-e6aww6q8.js:467792-467844 facade-majority
function isRemoteEgressSuppressedFor(e) {
  return (
    isForeignToBinding(e) ||
    isCompactPairWithheldFromRemote() ||
    isPrecautionarySuppressionHeldFor(e) ||
    isSessionHistorySuppressedFor(e)
  );
}
//@ chunk-e6aww6q8.js:467844-467889 facade-majority
function isConversationEgressTainted(e) {
  return (
    isCompactPairWithheldFromRemote() ||
    isPrecautionarySuppressionHeldFor(e) ||
    isSessionHistorySuppressedFor(e)
  );
}
//@ chunk-e6aww6q8.js:467889-467914 facade-majority
function clearBridgeSessionCache() {
  clearBridgeSessionFields(getProject());
}
//@ chunk-e6aww6q8.js:467914-468213 layout
function clearBridgeSessionFields(e) {
  ((e.currentSessionBridgeId = void 0),
    (e.currentSessionBridgeSeq = void 0),
    (e.currentSessionBridgeDialogKinds = void 0),
    (e.currentSessionBridgeGroupingId = void 0),
    (e.currentSessionBridgeNoBackfill = void 0),
    (e.currentSessionBridgeOwnerAccountUuid = void 0),
    (e.currentSessionBridgeOwnerOrganizationUuid = void 0));
}
//@ chunk-e6aww6q8.js:468213-468448 facade-majority
function clearBridgeSession(e, n, r, s) {
  let h = e ?? getSessionId(),
    y = getProject();
  if (iIt(y, n, r))
    appendEntryToFileAsync(
      n ?? getTranscriptPathForSession(h),
      { type: "bridge-session", sessionId: h, bridgeSessionId: "", lastSequenceNum: 0 },
      s,
    ).catch((S) => {
      logForDebugging(`clearBridgeSession: transcript append failed: ${errorMessage(S)}`);
    });
  if (h === getSessionId()) clearBridgeSessionFields(y);
}
//@ chunk-e6aww6q8.js:468448-468846 facade-majority
function getCurrentSessionBridge() {
  let e = getProject();
  return e.currentSessionBridgeId
    ? {
        id: e.currentSessionBridgeId,
        seq: e.currentSessionBridgeSeq ?? 0,
        declaredDialogKinds: e.currentSessionBridgeDialogKinds,
        groupingId: e.currentSessionBridgeGroupingId,
        noHistoryBackfill: e.currentSessionBridgeNoBackfill,
        ownerAccountUuid: e.currentSessionBridgeOwnerAccountUuid,
        ownerOrganizationUuid: e.currentSessionBridgeOwnerOrganizationUuid,
      }
    : void 0;
}
/**
 * 当前（或指定）会话的自定义标题。
 */
//@ chunk-e6aww6q8.js:468846-468911 facade-majority = getCurrentSessionTitle (1)
function getCurrentSessionTitle(sessionId) {
  if (sessionId === getSessionId()) return getProject().currentSessionTitle;
  return;
}
//@ chunk-e6aww6q8.js:468911-468979 facade-majority
function getCurrentSessionAiTitle(e) {
  if (e === getSessionId()) return getProject().currentSessionAiTitle;
  return;
}
/**
 * 会话标题：自定义标题优先，否则 AI 生成标题。
 */
//@ chunk-e6aww6q8.js:468979-469015 facade-majority
function getCurrentSessionDisplayTitle(e) {
  return getCurrentSessionTitle(e) ?? getCurrentSessionAiTitle(e);
}
//@ chunk-e6aww6q8.js:469015-469057 facade-majority
function getCurrentSessionPeerName() {
  return getRegisteredSessionName()?.name ?? getCurrentSessionDisplayTitle(getSessionId());
}
//@ chunk-e6aww6q8.js:469057-469147 facade-majority
function getCurrentSessionOffBoxPeerName() {
  let e = getRegisteredSessionName();
  return (
    (e !== void 0 && e.source !== "derived" ? e.name : void 0) ??
    getCurrentSessionDisplayTitle(getSessionId())
  );
}
//@ chunk-e6aww6q8.js:469147-469195 facade-majority
function getCurrentSessionPeerNameFor(e) {
  return e === "bridge" ? getCurrentSessionOffBoxPeerName() : getCurrentSessionPeerName();
}
//@ chunk-e6aww6q8.js:469195-469247 facade-majority = getCurrentSessionAgentColor (1)
function getCurrentSessionAgentColor() {
  return getProject().currentSessionAgentColor;
}
//@ chunk-e6aww6q8.js:469247-469298 facade-majority
function getCurrentSessionAgentName() {
  return getProject().currentSessionAgentName;
}
//@ chunk-e6aww6q8.js:469298-469373 facade-majority
function restoreConversationToolsUsed(e, n) {
  let r = getConversationToolsUsed();
  (r.record(e ?? []), r.record(tagUntrustedArtifactContent(n ?? [], void 0, !1)));
}
//@ chunk-e6aww6q8.js:469373-469456 facade-majority = setSessionFileForTesting (0.526)
function markToolsUsedWritten() {
  let e = getProject();
  e.toolsUsedStamp = `${e.sessionFile}
${getConversationToolsUsed().generation()}`;
}
/**
 * resume 时把日志中的会话元数据（标题、AI 标题、tag、cwd 迁移、代理名/颜色/设置、模式、PR、worktree 等）装回 Project 当前会话字段。
 */
//@ chunk-e6aww6q8.js:469456-472098 facade-majority
function restoreSessionMetadata(e, n) {
  let r = getProject();
  if (e.customTitle) r.currentSessionTitle ??= e.customTitle;
  if (e.aiTitle) r.currentSessionAiTitle ??= e.aiTitle;
  if (e.customTitle || e.aiTitle) su().sessionTitleChanged.emit();
  if (e.tag !== void 0) r.currentSessionTag = e.tag || void 0;
  if (e.relocatedCwd) r.currentSessionRelocatedCwd ??= e.relocatedCwd;
  if (e.agentName) r.currentSessionAgentName ??= e.agentName;
  if (e.agentColor) r.currentSessionAgentColor ??= e.agentColor;
  if (e.agentSetting) r.currentSessionAgentSetting = e.agentSetting;
  if (e.mode) r.currentSessionMode = e.mode;
  if (e.permissionMode) r.currentSessionPermissionMode = e.permissionMode;
  if (e.isolationLatch) r.currentSessionIsolationLatch = e.isolationLatch;
  if (e.devModsFolder)
    if (sjt(e.devModsFolder, getSessionId())) r.currentSessionDevModsFolder = e.devModsFolder;
    else logForDebugging("dev mods: dropped a restored dev-mods folder not this session's");
  if (e.memoryModeStamps) {
    r.currentSessionMemoryModeStamps = e.memoryModeStamps.map((memoryModeStamp) => ({
      ...memoryModeStamp,
      written: memoryModeStamp.written ?? !0,
    }));
    let at = e.memoryModeStamps.at(-1);
    resetAgentLatches();
  }
  if (e.atisLatch !== void 0) setConversationAtisLatch(e.atisLatch);
  if (e.toolsUsed !== void 0 || e.messages !== void 0) restoreConversationToolsUsed(e.toolsUsed, e.messages);
  if (e.worktreeSession !== void 0) r.currentSessionWorktree = e.worktreeSession;
  if (e.artifactCommentMonitor !== void 0) r.resumedArtifactCommentMonitor = e.artifactCommentMonitor;
  if (e.artifactAutoReactLedger !== void 0) r.resumedArtifactAutoReactLedger = e.artifactAutoReactLedger;
  if (e.prNumber !== void 0) r.currentSessionPrNumber = e.prNumber;
  if (e.prUrl) r.currentSessionPrUrl = e.prUrl;
  if (e.prRepository) r.currentSessionPrRepository = e.prRepository;
  if (e.artifactCount !== void 0) r.currentSessionArtifactCount = e.artifactCount;
  if (e.bridgeSessionId)
    ((r.currentSessionBridgeId = e.bridgeSessionId),
      (r.currentSessionBridgeSeq = e.bridgeLastSeq),
      (r.currentSessionBridgeDialogKinds = e.bridgeDialogKinds?.length ? e.bridgeDialogKinds : void 0),
      (r.currentSessionBridgeGroupingId = e.bridgeSessionGroupingId),
      (r.currentSessionBridgeNoBackfill = e.bridgeNoHistoryBackfill ? !0 : void 0),
      (r.currentSessionBridgeOwnerAccountUuid = e.bridgeOwnerAccountUuid),
      (r.currentSessionBridgeOwnerOrganizationUuid = e.bridgeOwnerOrganizationUuid));
  if (e.sessionHistorySuppressed) {
    let s = n?.taintSid ?? pinSessionId(getSessionId()),
      h = s !== void 0 && s === getSessionId(),
      y = h && !r.currentSessionHistorySuppressed;
    if (h) r.currentSessionHistorySuppressed = !0;
    if ((markSessionHistorySuppressedFor(s), y && s !== void 0)) {
      let S = getMaterializedSessionFile();
      if (!(S !== null && !isOwnTranscriptFile(s, S))) {
        let L = S ?? getTranscriptPathForSession(s),
          G = n?.storageV5;
        (async () => {
          if ((await scanTranscriptForSuppression(L, { sid: s }, G)) === "clean")
            await writeHistorySuppression(s, L, "meta_seed", void 0, G);
        })().catch((q) => {
          logForDebugging(`restoreSessionMetadata meta_seed failed: ${errorMessage(q)}`);
        });
      }
    }
  }
  if (e.lastPrompt !== void 0) r.currentSessionLastPrompt = e.lastPrompt;
  if (e.leafUuid !== void 0) r.currentSessionLeafUuid = e.leafUuid;
  if (e.leafTs !== void 0) r.currentSessionLeafTs = e.leafTs;
}
//@ chunk-e6aww6q8.js:472098-473538 facade-majority = restoreSessionMetadata (0.453)
function snapshotSessionMetadata() {
  let project = getProject();
  return {
    customTitle: project.currentSessionTitle,
    aiTitle: project.currentSessionAiTitle,
    tag: project.currentSessionTag,
    relocatedCwd: project.currentSessionRelocatedCwd,
    agentName: project.currentSessionAgentName,
    agentColor: project.currentSessionAgentColor,
    agentSetting: project.currentSessionAgentSetting,
    mode: project.currentSessionMode,
    permissionMode: project.currentSessionPermissionMode,
    isolationLatch: project.currentSessionIsolationLatch,
    devModsFolder: project.currentSessionDevModsFolder,
    memoryModeStamps: project.currentSessionMemoryModeStamps.map(({ inFlight: inFlight, ...s }) => s),
    restoredMemoryPause: getRestoredMemoryPause(),
    atisLatch: getConversationAtisLatch(),
    toolsUsed: getConversationToolsUsed().names(),
    worktreeSession: project.currentSessionWorktree,
    artifactCommentMonitor: project.resumedArtifactCommentMonitor,
    artifactAutoReactLedger: project.resumedArtifactAutoReactLedger,
    prNumber: project.currentSessionPrNumber,
    prUrl: project.currentSessionPrUrl,
    prRepository: project.currentSessionPrRepository,
    artifactCount: project.currentSessionArtifactCount,
    bridgeSessionId: project.currentSessionBridgeId,
    bridgeLastSeq: project.currentSessionBridgeSeq,
    bridgeDialogKinds: project.currentSessionBridgeDialogKinds,
    bridgeSessionGroupingId: project.currentSessionBridgeGroupingId,
    bridgeNoHistoryBackfill: project.currentSessionBridgeNoBackfill,
    bridgeOwnerAccountUuid: project.currentSessionBridgeOwnerAccountUuid,
    bridgeOwnerOrganizationUuid: project.currentSessionBridgeOwnerOrganizationUuid,
    sessionHistorySuppressed: project.currentSessionHistorySuppressed ? !0 : void 0,
    lastPrompt: project.currentSessionLastPrompt,
    leafUuid: project.currentSessionLeafUuid,
    leafTs: project.currentSessionLeafTs,
  };
}
/**
 * 清空 Project 中当前会话的全部元数据字段（/clear、新会话时）。
 */
//@ chunk-e6aww6q8.js:473538-474497 facade-majority = clearSessionMetadata (0.62)
function clearSessionMetadata() {
  let project = getProject(),
    n = project.currentSessionTitle !== void 0 || project.currentSessionAiTitle !== void 0;
  if (
    ((project.currentSessionTitle = void 0),
    (project.currentSessionAiTitle = void 0),
    (project.currentSessionTag = void 0),
    (project.currentSessionRelocatedCwd = void 0),
    (project.currentSessionAgentName = void 0),
    (project.currentSessionAgentColor = void 0),
    (project.currentSessionLastPrompt = void 0),
    (project.currentSessionLeafUuid = void 0),
    (project.currentSessionLeafTs = void 0),
    (project.currentSessionAgentSetting = void 0),
    (project.currentSessionMode = void 0),
    (project.currentSessionPermissionMode = void 0),
    (project.currentSessionIsolationLatch = void 0),
    (project.currentSessionDevModsFolder = void 0),
    (project.currentSessionMemoryModeStamps = []),
    resetAgentLatches(),
    resetAtisLatches(),
    setConversationAtisLatch(void 0),
    getConversationToolsUsed().clear(),
    (project.currentSessionWorktree = void 0),
    (project.resumedArtifactCommentMonitor = void 0),
    (project.resumedArtifactAutoReactLedger = void 0),
    (project.currentSessionPrNumber = void 0),
    (project.currentSessionPrUrl = void 0),
    (project.currentSessionPrRepository = void 0),
    (project.currentSessionArtifactCount = void 0),
    clearBridgeSessionFields(project),
    (project.currentSessionHistorySuppressed = void 0),
    n)
  )
    su().sessionTitleChanged.emit();
}
/**
 * 把当前会话元数据（标题、tag、last-prompt 等）重新追加到转录尾部，使 lite 读取（只读头尾）也能拿到最新元数据。
 */
//@ chunk-e6aww6q8.js:474497-474548 facade-majority = reAppendSessionMetadata (1)
function reAppendSessionMetadata() {
  getProject().reAppendSessionMetadata(!1, !0);
}
//@ chunk-e6aww6q8.js:474548-474703 facade-majority
async function reAppendSessionMetadataAfterCompaction(e) {
  try {
    if (isStorageV5Enabled() && e !== void 0) {
      if (isTranscriptPersistenceDisabled()) return;
      await getProject().reAppendSessionMetadataAsync(!1, !0, e, !0);
      return;
    }
    (await flushAppendEntryQueues(), reAppendSessionMetadata());
  } catch (error) {
    swallowRefusedDirectWrite(error);
  }
}
//@ chunk-e6aww6q8.js:474703-474768 facade-majority
function subscribeSessionAgentNameChanged(e) {
  return su().sessionAgentNameChanged.subscribe(e);
}
/**
 * 追加 agent-name 记录并更新当前会话代理名。
 */
//@ chunk-e6aww6q8.js:474768-475111 facade-majority = saveAgentName (0.752)
async function saveAgentName(e, n, r, s = "user", h) {
  let resolvedPath = r ?? getTranscriptPathForSession(e);
  try {
    await appendEntryToFileAsync(resolvedPath, { type: "agent-name", agentName: n, sessionId: e }, h);
  } catch (error) {
    if (isSyscallError(error))
      logForDebugging(
        `saveAgentName: transcript append failed (${getErrnoCode(error)}): ${errorMessage(error)}`,
        { level: "error" },
      );
    else throw error;
  }
  if (e === getSessionId()) ((getProject().currentSessionAgentName = n), su().sessionAgentNameChanged.emit());
  logEvent("tengu_agent_name_set", { source: fromEnum(s) });
}
/**
 * 追加 agent-color 记录，打 tengu_agent_color_set。
 */
//@ chunk-e6aww6q8.js:475111-475403 facade-majority = saveAgentColor (0.845)
async function saveAgentColor(e, n, r, s) {
  let resolvedPath = r ?? getTranscriptPathForSession(e);
  try {
    await appendEntryToFileAsync(resolvedPath, { type: "agent-color", agentColor: n, sessionId: e }, s);
  } catch (error) {
    if (isSyscallError(error))
      logForDebugging(
        `saveAgentColor: transcript append failed (${getErrnoCode(error)}): ${errorMessage(error)}`,
        { level: "error" },
      );
    else throw error;
  }
  if (e === getSessionId()) getProject().currentSessionAgentColor = n;
  logEvent("tengu_agent_color_set", {});
}
//@ chunk-e6aww6q8.js:475403-475453 facade-majority = saveAgentSetting (1)
function saveAgentSetting(agentSetting) {
  getProject().currentSessionAgentSetting = agentSetting;
}
//@ chunk-e6aww6q8.js:475453-475514 facade-majority
function subscribeSessionTitleChanged(e) {
  return su().sessionTitleChanged.subscribe(e);
}
//@ chunk-e6aww6q8.js:475514-475588 facade-majority = cacheSessionTitle (0.562)
function cacheSessionTitle(customTitle) {
  ((getProject().currentSessionTitle = customTitle), su().sessionTitleChanged.emit());
}
//@ chunk-e6aww6q8.js:475588-475665 facade-majority
function cacheAiTitle(e) {
  ((getProject().currentSessionAiTitle = e), su().sessionTitleChanged.emit());
}
//@ chunk-e6aww6q8.js:475665-475748 facade-majority
function cacheAgentName(e) {
  ((getProject().currentSessionAgentName = e), su().sessionAgentNameChanged.emit());
}
//@ chunk-e6aww6q8.js:475748-475858 facade-majority
function titleCacheStillOn(e, n, r) {
  let s = getCurrentSessionTitle(e),
    h = s && sanitizeSessionTitle(s);
  if (!h) return !0;
  let y = slugifySessionName(h);
  return y === slugifySessionName(n) || (r !== void 0 && y === slugifySessionName(r));
}
//@ chunk-e6aww6q8.js:475858-476066 facade-majority
function cacheHookSessionTitle(e) {
  if (isTeammate()) return !1;
  let n = sanitizeSessionTitle(e);
  if (!n) return !1;
  let r = getCurrentSessionTitle(getSessionId()),
    s = r && sanitizeSessionTitle(r);
  if (n === s || settledYieldFor(n, s || void 0) !== void 0) return !1;
  return (
    logForDebugging(`Hook sessionTitle cached (${[...n].length} chars)`),
    cacheSessionTitle(n),
    cacheAgentName(n),
    !0
  );
}
//@ chunk-e6aww6q8.js:476066-476358 facade-majority
async function applyResumeHookSessionTitle(e, n, r) {
  if (!cacheHookSessionTitle(e) || !currentSessionFileIsFor(n)) return;
  if (isTranscriptPersistenceDisabled()) return;
  let s = getProject();
  try {
    await s.reAppendSessionMetadataAsync(!0, !1, r, isStorageV5Enabled() && r !== void 0);
  } catch (error) {
    if (isSyscallError(error))
      logForDebugging(`Hook title re-append failed (${getErrnoCode(error)}): ${errorMessage(error)}`, {
        level: "error",
      });
    else logError(error);
    reportTranscriptWriteFailure(su().writerHealth, "adopt", error, s.sessionFilePath);
  }
}
/**
 * 记录会话模式（mode 记录）。
 */
//@ chunk-e6aww6q8.js:476358-476399 facade-majority = saveMode (1)
function saveMode(mode) {
  getProject().currentSessionMode = mode;
}
//@ chunk-e6aww6q8.js:476399-476451 facade-majority
function savePermissionMode(e) {
  getProject().currentSessionPermissionMode = e;
}
//@ chunk-e6aww6q8.js:476451-476468 facade-majority
function saveAutoMemorySessionSwitch(e) {}
//@ chunk-e6aww6q8.js:476468-476578 facade-majority
function queueSessionMetadataEntry(e) {
  let n = getProject();
  if (n.sessionFilePath) n.appendEntry(e, void 0, void 0, n.exitReStampSource()).catch(logError);
}
//@ chunk-e6aww6q8.js:476578-476978 facade-majority
function saveIsolationLatch(e, n) {
  let r = getProject();
  if (r.currentSessionIsolationLatch === e) return;
  if (((r.currentSessionIsolationLatch = e), r.sessionFilePath)) {
    let sessionFilePath = r.sessionFilePath;
    appendEntryToFileAsync(
      sessionFilePath,
      { type: "isolation-latch", side: e, sessionId: getSessionId() },
      n,
    ).catch((h) => {
      let y = getErrnoCode(h);
      if (isSyscallError(h))
        logForDebugging(
          `saveIsolationLatch: failed to append isolation-latch entry to ${sessionFilePath} (${y}): ${errorMessage(h)}`,
          { level: "error" },
        );
      else logError(h);
      reportTranscriptWriteFailure(su().writerHealth, "isolation_latch", h, sessionFilePath);
    });
  }
}
//@ chunk-e6aww6q8.js:476978-477034 facade-majority
function getCurrentSessionIsolationLatch() {
  return getProject().currentSessionIsolationLatch;
}
//@ chunk-e6aww6q8.js:477034-477404 facade-majority
function saveDevModsFolder(e, n) {
  let r = getProject();
  if (r.currentSessionDevModsFolder === e) return;
  if (((r.currentSessionDevModsFolder = e), r.sessionFilePath)) {
    let sessionFilePath = r.sessionFilePath;
    appendEntryToFileAsync(
      sessionFilePath,
      { type: "dev-mods", folder: e, sessionId: getSessionId() },
      n,
    ).catch((h) => {
      if (isSyscallError(h))
        logForDebugging(
          `saveDevModsFolder: failed to append dev-mods entry to ${sessionFilePath} (${getErrnoCode(h)}): ${errorMessage(h)}`,
          { level: "error" },
        );
      else logError(h);
      reportTranscriptWriteFailure(su().writerHealth, "dev_mods", h, sessionFilePath);
    });
  }
}
//@ chunk-e6aww6q8.js:477404-477459 facade-majority
function getCurrentSessionDevModsFolder() {
  return getProject().currentSessionDevModsFolder;
}
//@ chunk-e6aww6q8.js:477459-478175 facade-majority
function saveMemoryMode(
  {
    mode: mode,
    afterUuid: afterUuid,
    reason: reason,
    account: account,
    accountChoice: accountChoice,
    timestamp: timestamp,
  },
  S,
) {
  let w = getProject(),
    L = {
      mode: mode,
      afterUuid: afterUuid,
      timestamp: timestamp ?? new Date().toISOString(),
      ...(reason !== void 0 && { reason: reason }),
      ...(account !== void 0 && { account: account }),
      ...(accountChoice !== void 0 && { accountChoice: accountChoice }),
      written: !1,
    };
  if ((w.currentSessionMemoryModeStamps.push(L), w.sessionFilePath)) {
    let sessionFilePath = w.sessionFilePath;
    appendEntryToFileAsync(
      sessionFilePath,
      {
        type: "memory-mode",
        mode: mode,
        afterUuid: afterUuid,
        timestamp: L.timestamp,
        ...(reason !== void 0 && { reason: reason }),
        ...(account !== void 0 && { account: account }),
        ...(accountChoice !== void 0 && { accountChoice: accountChoice }),
        sessionId: getSessionId(),
      },
      S,
    )
      .then(() => {
        L.written = !0;
      })
      .catch((q) => {
        let Z = getErrnoCode(q);
        if (isSyscallError(q))
          logForDebugging(
            `saveMemoryMode: failed to append memory-mode entry to ${sessionFilePath} (${Z}): ${errorMessage(q)}`,
            { level: "error" },
          );
        else logError(q);
        reportTranscriptWriteFailure(su().writerHealth, "memory_mode", q, sessionFilePath);
      });
  }
}
//@ chunk-e6aww6q8.js:478175-478233 facade-majority
function getCurrentSessionMemoryModeStamps() {
  return getProject().currentSessionMemoryModeStamps;
}
//@ chunk-e6aww6q8.js:478233-478273 layout
function resetAgentLatches() {
  if (getRestoredMemoryPause()) (setRestoredMemoryPause(!1), setMemoryToggledOff(!1));
}
//@ chunk-e6aww6q8.js:478273-478313 layout
function resetAtisLatches() {
  if (getRestoredAutoMemoryOff()) (setRestoredAutoMemoryOff(!1), setAutoMemoryOffThisSession(!1));
}
//@ chunk-e6aww6q8.js:478313-478336 facade-majority
function memoryPauseToggledByPerson() {
  setRestoredMemoryPause(!1);
}
//@ chunk-e6aww6q8.js:478336-478402 facade-majority = recordContextCollapseCommit (1)
async function recordArtifactCommentMonitor(e, n) {
  await getProject().appendEntry(e, void 0, void 0, n);
}
//@ chunk-e6aww6q8.js:478402-478510 facade-majority
function takeResumedArtifactCommentMonitor() {
  let e = getProject(),
    resumedArtifactCommentMonitor = e.resumedArtifactCommentMonitor;
  return ((e.resumedArtifactCommentMonitor = void 0), resumedArtifactCommentMonitor);
}
//@ chunk-e6aww6q8.js:478510-478620 facade-majority
function takeResumedArtifactAutoReactLedger() {
  let e = getProject(),
    resumedArtifactAutoReactLedger = e.resumedArtifactAutoReactLedger;
  return ((e.resumedArtifactAutoReactLedger = void 0), resumedArtifactAutoReactLedger);
}
//@ chunk-e6aww6q8.js:478620-478678 facade-majority
function peekResumedArtifactAutoReactLedger() {
  return getProject().resumedArtifactAutoReactLedger;
}
//@ chunk-e6aww6q8.js:478678-478689 facade-majority
var UNLATCHED_RESUMED_ATIS = "";
//@ chunk-e6aww6q8.js:478689-478728 layout
function getOrEmptyString(e, n) {
  return e.get(n) ?? UNLATCHED_RESUMED_ATIS;
}
//@ chunk-e6aww6q8.js:478728-478752 facade-majority
var worktreeStateSignals = new HostScoped(() => createSignal());
/**
 * 追加 worktree-state 记录（会话所在 worktree），resume 时据此恢复或退出 worktree。
 */
//@ chunk-e6aww6q8.js:478752-479396 facade-majority = saveWorktreeState (0.741)
function saveWorktreeState(e, n) {
  let stripped = e
      ? {
          originalCwd: e.originalCwd,
          preEnterOriginalCwd: e.preEnterOriginalCwd,
          worktreePath: e.worktreePath,
          worktreeName: e.worktreeName,
          worktreeBranch: e.worktreeBranch,
          originalBranch: e.originalBranch,
          originalHeadCommit: e.originalHeadCommit,
          sessionId: e.sessionId,
          tmuxSessionName: e.tmuxSessionName,
          hookBased: e.hookBased,
          enteredExisting: e.enteredExisting,
          madeElsewhere: e.madeElsewhere,
        }
      : null,
    project = getProject();
  if (
    ((project.currentSessionWorktree = stripped),
    worktreeStateSignals.of(getRootSession().host).emit(stripped),
    project.sessionFilePath)
  ) {
    let sessionFilePath = project.sessionFilePath;
    appendEntryToFileAsync(
      sessionFilePath,
      { type: "worktree-state", worktreeSession: stripped, sessionId: getSessionId() },
      n,
    ).catch((y) => {
      logForDebugging(`saveWorktreeState: transcript append failed: ${errorMessage(y)}`);
    });
  }
}
/**
 * 从日志对象取 sessionId（最后一条消息的 sessionId 或日志自身）。
 */
//@ chunk-e6aww6q8.js:479396-479477 facade-majority = getSessionIdFromLog (0)
function getSessionIdFromLog(log) {
  if (log.sessionId) return log.sessionId;
  return log.messages[0]?.sessionId;
}
//@ chunk-e6aww6q8.js:479477-479544 facade-majority
function isLiteLog(log) {
  return log.messages.length === 0 && log.sessionId !== void 0;
}
/**
 * 把 lite 日志（只读了头尾元数据）补全为完整日志：读取整份转录并建对话链。
 */
//@ chunk-e6aww6q8.js:479544-482685 facade-majority = loadFullLog (0.543)
async function loadFullLog(e, n) {
  if (!isLiteLog(e)) return e;
  let sessionFile = e.fullPath;
  if (!sessionFile) return e;
  try {
    let s = getTranscriptStorageKey(sessionFile, n?.storageV5),
      h = await loadTranscriptFile(sessionFile, s && { storageV5: s }),
      {
        messages: messages,
        summaries: summaries,
        customTitles: customTitles,
        endedSessions: endedSessions,
        aiTitles: aiTitles,
        tags: tags,
        relocatedCwds: relocatedCwds,
        agentNames: agentNames,
        agentColors: agentColors,
        agentSettings: agentSettings,
        prNumbers: prNumbers,
        prUrls: prUrls,
        prRepositories: prRepositories,
        bridgeSessionIds: bridgeSessionIds,
        bridgeLastSeqs: bridgeLastSeqs,
        bridgeDialogKindsBySession: bridgeDialogKindsBySession,
        bridgeSessionGroupingIds: bridgeSessionGroupingIds,
        bridgeNoBackfill: bridgeNoBackfill,
        bridgeOwnerAccountUuids: bridgeOwnerAccountUuids,
        bridgeOwnerOrganizationUuids: bridgeOwnerOrganizationUuids,
        historySuppressed: historySuppressed,
        modes: modes,
        permissionModes: permissionModes,
        isolationLatches: isolationLatches,
        devModsFolders: devModsFolders,
        memoryModeStamps: memoryModeStamps,
        atisLatches: atisLatches,
        toolsUsedLists: toolsUsedLists,
        worktreeStates: worktreeStates,
        artifactCommentMonitors: artifactCommentMonitors,
        artifactAutoReactLedgers: artifactAutoReactLedgers,
        costStates: costStates,
        fileHistorySnapshots: fileHistorySnapshots,
        fileHistoryDeltas: fileHistoryDeltas,
        attributionSnapshots: attributionSnapshots,
        contentReplacements: contentReplacements,
        leafUuids: leafUuids,
        clearedToEmpty: clearedToEmpty,
      } = h;
    if (messages.size === 0) return e;
    if (e.sessionId !== void 0) primeSessionMessagesCache(e.sessionId, messages.keys());
    let mostRecentLeaf = findLatestMessage(
      messages.values(),
      (msg) => leafUuids.has(msg.uuid) && (msg.type === "user" || msg.type === "assistant"),
    );
    if (!mostRecentLeaf) {
      if (clearedToEmpty) return buildLiteLogFromMessages(h, e, e.sessionId);
      return e;
    }
    let transcript = buildConversationChain(messages, mostRecentLeaf);
    warnIfTranscriptUnchained(messages, transcript, mostRecentLeaf.sessionId);
    let sessionId = mostRecentLeaf.sessionId;
    return {
      ...e,
      rewindAnchorUuid: h.rewindAnchorUuid,
      messages: removeExtraFields(transcript),
      firstPromptShown: void 0,
      ...getFirstPromptInfo(transcript),
      messageCount: countVisibleMessages(transcript),
      summary: mostRecentLeaf ? summaries.get(mostRecentLeaf.uuid) : e.summary,
      customTitle: sessionId ? customTitles.get(sessionId) : e.customTitle,
      ...withEndedByModel({}, sessionId ? endedSessions.has(sessionId) : getEndedByModel(e)),
      aiTitle: sessionId ? aiTitles.get(sessionId) : e.aiTitle,
      tag: sessionId ? tags.get(sessionId) : e.tag,
      relocatedCwd: sessionId ? relocatedCwds.get(sessionId) : e.relocatedCwd,
      agentName: sessionId ? agentNames.get(sessionId) : e.agentName,
      agentColor: sessionId ? agentColors.get(sessionId) : e.agentColor,
      agentSetting: sessionId ? agentSettings.get(sessionId) : e.agentSetting,
      mode: sessionId ? modes.get(sessionId) : e.mode,
      permissionMode: sessionId ? permissionModes.get(sessionId) : e.permissionMode,
      isolationLatch: sessionId ? isolationLatches.get(sessionId) : e.isolationLatch,
      devModsFolder: sessionId ? devModsFolders?.get(sessionId) : e.devModsFolder,
      memoryModeStamps: sessionId ? (memoryModeStamps.get(sessionId) ?? []) : e.memoryModeStamps,
      atisLatch: sessionId ? getOrEmptyString(atisLatches, sessionId) : e.atisLatch,
      toolsUsed: sessionId ? toolsUsedLists?.get(sessionId) : e.toolsUsed,
      worktreeSession:
        sessionId && worktreeStates.has(sessionId) ? worktreeStates.get(sessionId) : e.worktreeSession,
      artifactCommentMonitor: sessionId ? artifactCommentMonitors.get(sessionId) : e.artifactCommentMonitor,
      artifactAutoReactLedger: sessionId
        ? artifactAutoReactLedgers.get(sessionId)
        : e.artifactAutoReactLedger,
      costState: sessionId ? costStates.get(sessionId) : e.costState,
      prNumber: sessionId ? prNumbers.get(sessionId) : e.prNumber,
      prUrl: sessionId ? prUrls.get(sessionId) : e.prUrl,
      prRepository: sessionId ? prRepositories.get(sessionId) : e.prRepository,
      bridgeSessionId: sessionId ? bridgeSessionIds.get(sessionId) : e.bridgeSessionId,
      bridgeLastSeq: sessionId ? bridgeLastSeqs.get(sessionId) : e.bridgeLastSeq,
      bridgeDialogKinds: sessionId ? bridgeDialogKindsBySession.get(sessionId) : e.bridgeDialogKinds,
      bridgeSessionGroupingId: sessionId
        ? bridgeSessionGroupingIds.get(sessionId)
        : e.bridgeSessionGroupingId,
      bridgeNoHistoryBackfill: sessionId ? bridgeNoBackfill.get(sessionId) : e.bridgeNoHistoryBackfill,
      bridgeOwnerAccountUuid: sessionId ? bridgeOwnerAccountUuids.get(sessionId) : e.bridgeOwnerAccountUuid,
      bridgeOwnerOrganizationUuid: sessionId
        ? bridgeOwnerOrganizationUuids.get(sessionId)
        : e.bridgeOwnerOrganizationUuid,
      sessionHistorySuppressed: sessionId
        ? historySuppressed.has(sessionId)
          ? !0
          : void 0
        : e.sessionHistorySuppressed,
      gitBranch: mostRecentLeaf?.gitBranch ?? e.gitBranch,
      isSidechain: transcript[0]?.isSidechain ?? e.isSidechain,
      teamName: transcript[0]?.teamName ?? e.teamName,
      sessionKind: transcript[0]?.sessionKind ?? e.sessionKind,
      leafUuid: mostRecentLeaf?.uuid ?? e.leafUuid,
      fileHistorySnapshots: buildFileHistorySnapshots(fileHistorySnapshots, fileHistoryDeltas, transcript),
      attributionSnapshots: buildAttributionSnapshotChain(attributionSnapshots, transcript),
      contentReplacements: sessionId ? (contentReplacements.get(sessionId) ?? []) : e.contentReplacements,
      fileSnapshots: getFileSnapshotMessages(messages),
    };
  } catch (error) {
    if (Qoe(error))
      (logForDebugging(
        `loadFullLog: transcript unreadable (${getErrnoCode(error)}): ${errorMessage(error)}`,
        { level: "error" },
      ),
        n?.onTranscriptUnreadable?.(sanitizedErrnoLowerForTelemetry(error)));
    else logError(error);
    return e;
  }
}
/**
 * 按自定义标题搜索会话（--resume <标题>）。
 */
//@ chunk-e6aww6q8.js:482685-483199 facade-majority = searchSessionsByCustomTitle (0.913)
async function searchSessionsByCustomTitle(e, n, r) {
  let { limit: limit, exact: exact } = n || {},
    worktreePaths = await getWorktreePaths(getOriginalCwd()),
    S = await getStatOnlyLogsForWorktrees(worktreePaths, void 0, r),
    { logs: logs } = await enrichLogs(S, 0, S.length, r),
    normalizedQuery = e.toLowerCase().trim(),
    matchingLogs = logs.filter((log) => {
      let title = (log.customTitle ?? log.aiTitle)?.toLowerCase().trim();
      if (!title) return !1;
      return exact ? title === normalizedQuery : title.includes(normalizedQuery);
    }),
    sessionIdToLog = new Map();
  for (let log of matchingLogs) {
    let sessionId = getSessionIdFromLog(log);
    if (sessionId) {
      let existing = sessionIdToLog.get(sessionId);
      if (!existing || log.modified > existing.modified) sessionIdToLog.set(sessionId, log);
    }
  }
  let deduplicated = Array.from(sessionIdToLog.values());
  if ((deduplicated.sort((Se, ke) => ke.modified.getTime() - Se.modified.getTime()), limit))
    return deduplicated.slice(0, limit);
  return deduplicated;
}
//@ chunk-e6aww6q8.js:483199-483503 layout = hasPrefix (1)
function hasPrefix_2(src, prefix, at, end) {
  let L = end[0],
    G = end.length,
    q = 0,
    Z = !1,
    Se = !1;
  for (let ke = prefix; ke < at; ke++) {
    let we = src[ke];
    if (Se) {
      Se = !1;
      continue;
    }
    if (Z) {
      if (we === 92) Se = !0;
      else if (we === 34) Z = !1;
      continue;
    }
    if (q === 1 && we === L && ke + G <= at && src.compare(end, 0, G, ke, ke + G) === 0) return ke;
    if (we === 34) Z = !0;
    else if (we === 123) q++;
    else if (we === 125) q--;
  }
  return -1;
}
//@ chunk-e6aww6q8.js:483503-483764 file-local
function pickDepthOneUuidCandidate(buf, lineStart, candidates) {
  let w = 0,
    L = !1,
    G = !1,
    q = 0;
  for (let Z = lineStart; q < candidates.length; Z++) {
    if (Z === candidates[q]) {
      if (w === 1 && !L) return candidates[q];
      q++;
    }
    let Se = buf[Z];
    if (G) G = !1;
    else if (L) {
      if (Se === 92) G = !0;
      else if (Se === 34) L = !1;
    } else if (Se === 34) L = !0;
    else if (Se === 123) w++;
    else if (Se === 125) w--;
  }
  return candidates.at(-1);
}
/**
 * 不解析 JSON，直接在字节缓冲中按 "parentUuid"/"uuid" 前缀走链，快速定位主链所需行。
 */
//@ chunk-e6aww6q8.js:483764-485959 fingerprint = walkChainBeforeParse (0.912)
function walkChainBeforeParse(buf) {
  let PARENT_PREFIX = Buffer.from('{"parentUuid":'),
    UUID_KEY = Buffer.from('"uuid":"'),
    SIDECHAIN_TRUE = Buffer.from('"isSidechain":true'),
    UUID_LEN = 36,
    TS_SUFFIX = Buffer.from('","timestamp":"'),
    TS_SUFFIX_LEN = TS_SUFFIX.length,
    PREFIX_LEN = PARENT_PREFIX.length,
    KEY_LEN = UUID_KEY.length,
    Se = [],
    ke = [],
    uuidToSlot = new Map(),
    Ee = 0,
    len = buf.length;
  while (Ee < len) {
    let nl = buf.indexOf(10, Ee),
      qt = nl === -1 ? len : nl + 1;
    if (
      qt - Ee > PREFIX_LEN &&
      buf[Ee] === 123 &&
      buf.compare(PARENT_PREFIX, 0, PREFIX_LEN, Ee, Ee + PREFIX_LEN) === 0
    ) {
      let Zt = buf[Ee + PREFIX_LEN] === 34 ? Ee + PREFIX_LEN + 1 : -1,
        firstAny = -1,
        suffix0 = -1,
        suffixN,
        hn = Ee;
      for (;;) {
        let next = buf.indexOf(UUID_KEY, hn);
        if (next < 0 || next >= qt) break;
        if (firstAny < 0) firstAny = next;
        let Kn = next + KEY_LEN + 36;
        if (
          Kn + TS_SUFFIX_LEN <= qt &&
          buf.compare(TS_SUFFIX, 0, TS_SUFFIX_LEN, Kn, Kn + TS_SUFFIX_LEN) === 0
        )
          if (suffix0 < 0) suffix0 = next;
          else (suffixN ??= [suffix0]).push(next);
        hn = next + KEY_LEN;
      }
      let ho = suffixN ? pickDepthOneUuidCandidate(buf, Ee, suffixN) : suffix0 >= 0 ? suffix0 : firstAny;
      if (ho >= 0) {
        let yn = ho + KEY_LEN,
          uuid = buf.toString("latin1", yn, yn + 36);
        (uuidToSlot.set(uuid, Se.length), Se.push(Ee, qt, Zt));
      } else ke.push(Ee, qt);
    } else ke.push(Ee, qt);
    Ee = qt;
  }
  let leafSlot = -1;
  for (let Yt = Se.length - 3; Yt >= 0; Yt -= 3) {
    let sc = buf.indexOf(SIDECHAIN_TRUE, Se[Yt]);
    if (sc === -1 || sc >= Se[Yt + 1]) {
      leafSlot = Yt;
      break;
    }
  }
  if (leafSlot < 0) return buf;
  function Me(Yt) {
    let qt = Se[Yt + 2];
    return qt < 0 ? void 0 : uuidToSlot.get(buf.toString("latin1", qt, qt + 36));
  }
  let seen = new Set(),
    ze = 0,
    lt = leafSlot;
  while (lt !== void 0) {
    if (seen.has(lt)) break;
    (seen.add(lt), (ze += Se[lt + 1] - Se[lt]), (lt = Me(lt)));
  }
  if (len - ze < len >> 1) return buf;
  let chain = new Map(),
    nt = new Map();
  function pt(Yt) {
    try {
      let qt = jsonParseRaw(buf.toString("utf8", Se[Yt], Se[Yt + 1]));
      return isPlainObject_2(qt) ? qt : null;
    } catch {
      return null;
    }
  }
  function Et(Yt) {
    if (Yt !== null && isAssistantTranscriptEntry(Yt))
      return { kind: "assistant", id: getAssistantMessageId(Yt, null) };
    if (Yt !== null && isProgressOrHiddenEntry(Yt)) return { kind: "runLink", id: null };
    return { kind: "other", id: null };
  }
  function yt(Yt) {
    let qt = chain.get(Yt);
    if (qt === void 0) ((qt = Et(pt(Yt))), chain.set(Yt, qt));
    return qt;
  }
  function gt(Yt) {
    let qt = new Set(),
      Zt = null,
      rn = Yt;
    while (rn !== void 0 && !qt.has(rn)) {
      let pn = nt.get(rn);
      if (pn !== void 0) {
        Zt = pn;
        break;
      }
      qt.add(rn);
      let no = yt(rn);
      if (no.kind === "assistant") {
        Zt = no.id;
        break;
      }
      rn = Me(rn);
    }
    for (let pn of qt) nt.set(pn, Zt);
    return Zt;
  }
  let At = [],
    It = 0;
  for (let Yt = 0; Yt < Se.length; Yt += 3) {
    let qt = Se[Yt];
    while (It < ke.length && ke[It] < qt) (At.push(buf.subarray(ke[It], ke[It + 1])), (It += 2));
    if (!seen.has(Yt)) {
      let Zt = Me(Yt);
      if (Zt === void 0 || !seen.has(Zt)) continue;
      let rn = pt(Yt);
      if (rn === null || hasMalformedMessage(rn)) continue;
      let pn = Et(rn);
      if ((chain.set(Yt, pn), isChainLinkCandidate(rn, pn.kind === "assistant" ? gt(Zt) : null)))
        seen.add(Yt);
      else if (yt(Zt).kind !== "runLink") continue;
    }
    At.push(buf.subarray(qt, Se[Yt + 1]));
  }
  while (It < ke.length) (At.push(buf.subarray(ke[It], ke[It + 1])), (It += 2));
  return Buffer.concat(At);
}
//@ chunk-e6aww6q8.js:485959-486712 layout
function createFileChunkReader(e, n) {
  let allocUnsafe = Buffer.allocUnsafe(1048576),
    y = openSync(e, "r");
  function S(q, Z, Se) {
    let ke = 0;
    while (ke < Z) {
      let we = readSync(y, q, ke, Z - ke, Se + ke);
      if (we === 0) break;
      ke += we;
    }
    return ke;
  }
  let allocUnsafe_2 = Buffer.allocUnsafe(65536);
  function L(q) {
    let Z = -1,
      Se = 0;
    while (Se < n) {
      let ke = readSync(y, allocUnsafe, 0, Math.min(1048576, n - Se), Se);
      if (ke === 0) break;
      let we = 0;
      while (we < ke) {
        let index = allocUnsafe.indexOf(10, we);
        if (index < 0 || index >= ke) break;
        if (Z >= 0) {
          let Ae = Se + index - Z;
          if (Ae > allocUnsafe_2.length) allocUnsafe_2 = Buffer.allocUnsafe(Ae);
          (S(allocUnsafe_2, Ae, Z), q(allocUnsafe_2, 0, Ae, Z), (Z = -1));
        } else if (index > we) q(allocUnsafe, we, index - we, Se + we);
        we = index + 1;
      }
      if (we < ke && Z < 0) Z = Se + we;
      Se += ke;
    }
    if (Z >= 0) {
      let ke = n - Z;
      if (ke > allocUnsafe_2.length) allocUnsafe_2 = Buffer.allocUnsafe(ke);
      (S(allocUnsafe_2, ke, Z), q(allocUnsafe_2, 0, ke, Z));
    }
  }
  function G(q, Z) {
    if (Z > allocUnsafe_2.length) allocUnsafe_2 = Buffer.allocUnsafe(Math.max(Z, allocUnsafe_2.length * 2));
    return allocUnsafe_2.subarray(0, S(allocUnsafe_2, Z, q));
  }
  return { scan: L, read: G, close: () => closeSync(y) };
}
//@ chunk-e6aww6q8.js:486712-486884 layout
function createBufferLineScanner(e) {
  return {
    scan(n) {
      let r = 0;
      while (r < e.length) {
        let index = e.indexOf(10, r);
        if (index < 0) index = e.length;
        if (index > r) n(e, r, index - r, r);
        r = index + 1;
      }
    },
    read(n, r) {
      return e.subarray(n, n + r);
    },
    close() {},
  };
}
//@ chunk-e6aww6q8.js:486884-487075 layout
function reportUnparsableLines(e) {
  if (e <= 0) return;
  (logForDebugging(
    `transcript load: skipped ${e} line(s) that did not parse as JSON (e.g. a torn or corrupt write)`,
  ),
    logFeatureSad("transcript_unparsable_lines", "lines_skipped", { lines: e }));
}
//@ chunk-e6aww6q8.js:487075-487102 layout
var WHITESPACE_BYTES = new Set([32, 9, 13]);
//@ chunk-e6aww6q8.js:487102-487279 layout
function countJsonlLines(e) {
  let n = parseJSONL(e),
    r = 0;
  for (let s = 0; s < e.length;) {
    let index = e.indexOf(10, s),
      y = index === -1 ? e.length : index;
    if (e.subarray(s, y).some((S) => !WHITESPACE_BYTES.has(S))) r++;
    s = y + 1;
  }
  return (reportUnparsableLines(r - n.length), n);
}
//@ chunk-e6aww6q8.js:487279-497626 layout
function scanTranscriptBuffer(e, n, r, s) {
  let buffer = Buffer.from('{"type":"attribution-snapshot"'),
    buffer_2 = Buffer.from('{"parentUuid":'),
    buffer_3 = Buffer.from('"parentUuid":'),
    buffer_4 = Buffer.from('"uuid":"'),
    buffer_5 = Buffer.from('","timestamp":"'),
    buffer_6 = Buffer.from('"isSidechain":true'),
    buffer_7 = Buffer.from('"compact_boundary"'),
    buffer_8 = Buffer.from('"compactMetadata":'),
    buffer_9 = Buffer.from('"type":"last-prompt"'),
    buffer_10 = Buffer.from('{"type":"last-prompt"'),
    buffer_11 = Buffer.from('"leafUuid":'),
    buffer_12 = Buffer.from("\\ud"),
    buffer_13 = Buffer.from("\\uD"),
    buffer_14 = Buffer.from("null"),
    We = 36,
    ze = buffer_2.length,
    lt = buffer_4.length,
    Je = buffer_5.length,
    nt = buffer_14.length,
    pt = "parentUuid is neither a string nor null",
    Et = [],
    yt = [],
    gt = [],
    At = [],
    It = new Map(),
    Yt = [],
    qt = [],
    Zt = [],
    rn = [],
    pn = [],
    no = -1,
    hn = -1,
    ho = !1,
    yn = 1 / 0,
    Kn = [],
    Xn = 0,
    fo = !1,
    To = -1,
    bo = new Set(),
    vn = !1,
    co,
    So,
    ko,
    un = !1,
    ao = -1,
    $o = 0,
    yo = [],
    Ho = { offset: -1, length: 0 },
    rr,
    br = INDEX_HEAD_SCAN_BYTES,
    Hr = INDEX_BOUNDARY_SCAN_BYTES,
    Fr = INDEX_LAST_PROMPT_SCAN_BYTES;
  function cs(Es, Nr) {
    let Is = -1,
      fs = -1,
      as,
      Vi = 0;
    for (;;) {
      let index = Es.indexOf(buffer_4, Vi);
      if (index < 0) break;
      if (Is < 0) Is = index;
      let Wi = index + lt + 36;
      if (Wi + Je <= Nr && Es.compare(buffer_5, 0, Je, Wi, Wi + Je) === 0)
        if (fs < 0) fs = index;
        else (as ??= [fs]).push(index);
      Vi = index + lt;
    }
    return as ? pickDepthOneUuidCandidate(Es, 0, as) : fs >= 0 ? fs : Is;
  }
  function _r(Es, Nr, Is, fs) {
    let chunk = Es.subarray(Nr, Nr + Is);
    if (
      ((Ho.offset = fs),
      (Ho.length = Is),
      Is >= buffer.length && chunk.compare(buffer, 0, buffer.length, 0, buffer.length) === 0)
    ) {
      ((ao = fs), ($o = Is));
      return;
    }
    if (hasPrefix(chunk, 0, Is)) {
      yo.push({ offset: fs, length: Is });
      return;
    }
    if (
      Is < Fr &&
      Is > buffer_10.length &&
      chunk.compare(buffer_10, 0, buffer_10.length, 0, buffer_10.length) === 0
    ) {
      (Zt.push(fs), rn.push(Is), pn.push(chunk.includes(buffer_11)));
      return;
    }
    if (Is < Fr && chunk.subarray(0, Math.min(Is, LAST_PROMPT_PREFIX_SCAN_BYTES)).includes(buffer_9)) {
      let ii;
      try {
        ii = jsonParse(chunk.toString("utf8", 0, Is));
      } catch {
        return;
      }
      if (ii?.type === "last-prompt") {
        if (ii.leafUuid) ((rr = ii.leafUuid), (To = fs));
        (Yt.push(fs), qt.push(Is));
        return;
      }
    }
    let Vi = yG(chunk, 0, Is),
      chunk_2 = chunk.subarray(Vi, Math.min(Is, Vi + Hr));
    if (chunk_2.includes(buffer_7) || (chunk_2.includes(buffer_8) && chunk.includes(buffer_7, Vi))) {
      let ii;
      try {
        ii = jsonParse(chunk.toString("utf8", Vi, Is));
      } catch {
        ii = null;
      }
      if (ii?.type === "system" && ii.subtype === "compact_boundary") {
        hn = fs;
        let wa = ii.compactMetadata?.preservedMessages;
        if (wa || ii.compactMetadata?.preservedSegment)
          if (
            ((vn = !0),
            wa &&
              typeof wa.anchorUuid === "string" &&
              Array.isArray(wa.uuids) &&
              wa.uuids.length > 0 &&
              wa.uuids.every((uuid) => typeof uuid === "string"))
          ) {
            if (((co = wa.uuids), (So = wa.anchorUuid), (ko = fs), !ho))
              ((ho = !0), (yn = Math.min(yn, Et.length + 1)));
          } else ((co = void 0), (So = void 0), (ko = void 0));
        else {
          if (
            (bo.add(fs),
            (Et.length = 0),
            (yt.length = 0),
            (gt.length = 0),
            (At.length = 0),
            (Kn.length = 0),
            It.clear(),
            (vn = !1),
            (co = void 0),
            (So = void 0),
            (ko = void 0),
            (un = !1),
            (ao = -1),
            ($o = 0),
            (rr = void 0),
            (To = -1),
            (no = fs),
            !ho)
          )
            ho = !0;
          yn = 1;
        }
      }
    }
    let Wi;
    if (Is > ze && chunk.compare(buffer_2, 0, ze, 0, ze) === 0) {
      if (((Wi = ze), ho && Et.length >= yn)) {
        (Et.push(fs), yt.push(Is), gt.push(null), At.push(!1), Kn.push(!0));
        return;
      }
    } else {
      if (((Wi = hasPrefix_2(chunk, 0, Is, buffer_3)), Wi < 0)) {
        (Yt.push(fs), qt.push(Is));
        return;
      }
      Wi += buffer_3.length;
    }
    Cr(chunk, Is, fs, Wi, Et.length);
  }
  function Cr(Es, Nr, Is, fs, as) {
    let Vi =
        Es[fs] === 34
          ? Es.toString("latin1", fs + 1, fs + 1 + 36)
          : fs + nt <= Nr && Es.compare(buffer_14, 0, nt, fs, fs + nt) === 0
            ? null
            : "parentUuid is neither a string nor null",
      ji = cs(Es, Nr);
    if (ji < 0) {
      if ((Yt.push(Is), qt.push(Nr), as < Et.length)) ((yt[as] = -1), (Kn[as] = !1));
      return;
    }
    let str = Es.toString("latin1", ji + lt, ji + lt + 36),
      included = (Nr <= br ? Es : Es.subarray(0, br)).includes(buffer_6);
    if (It.has(str)) un = !0;
    if (as === Et.length)
      (It.set(str, as), Et.push(Is), yt.push(Nr), gt.push(Vi), At.push(included), Kn.push(!1));
    else {
      Kn[as] = !1;
      let hr = It.get(str);
      if (hr === void 0 || hr < as) It.set(str, as);
      ((gt[as] = Vi), (At[as] = included));
    }
  }
  function Vr(Es, Nr) {
    let max = Math.max(Es, 0);
    while (max < Nr) {
      if (!Kn[max]) {
        max++;
        continue;
      }
      let as = Et[max],
        Vi = as + yt[max],
        ji = max + 1;
      while (ji < Nr && Kn[ji] && Et[ji] === Vi + 1 && Et[ji] + yt[ji] - as <= 1048576)
        ((Vi = Et[ji] + yt[ji]), ji++);
      let read = e.read(as, Vi - as);
      for (let ii = max; ii < ji; ii++) {
        let wa = Et[ii] - as;
        if (wa + yt[ii] > read.length) {
          ((yt[ii] = -1), (Kn[ii] = !1));
          continue;
        }
        let chunk = read.subarray(wa, wa + yt[ii]);
        Cr(chunk, yt[ii], Et[ii], ze, ii);
      }
      max = ji;
    }
  }
  let startTime = performance.now(),
    jr = 0,
    Or = !1,
    Io;
  try {
    let Di = function (ga) {
        while (Ja < Et.length && Et[Ja] < ga) Ja++;
        return Ja < Et.length && Et[Ja] === ga && yt[Ja] >= 0 ? Ja : -1;
      },
      yr = function (ga) {
        let Hl = _i[ga];
        return Hl < 0 ? void 0 : Hl;
      },
      Kr = function (ga, Hl, hd) {
        if (((Ti[ga] = Hl), hd)) Vs[ga] = 1;
        for (let Sd = jo[ga]; Sd !== -1; Sd = Qr[Sd]) {
          if (Sd < ga || yt[Sd] < 0 || as.has(Et[Sd])) continue;
          let Ld = fi.length;
          while (Ld > Ri && fi[Ld - 1] > Sd) Ld--;
          fi.splice(Ld, 0, Sd);
        }
      };
    if ((e.scan(_r), (jr = performance.now() - startTime), ho && yn < Et.length && !s)) {
      let ga = 0;
      if (vn && co && ko !== void 0) {
        let Hl = 0,
          hd = Et.length - 1,
          Sd = -1;
        while (Hl <= hd) {
          let Ld = (Hl + hd) >> 1,
            vs = Et[Ld];
          if (vs === ko) {
            Sd = Ld;
            break;
          }
          if (vs < ko) Hl = Ld + 1;
          else hd = Ld - 1;
        }
        if (((ga = Sd < 0 ? 0 : Sd), Vr(Math.max(ga, yn), Et.length), Sd >= 0)) {
          let vs = Math.min(Sd, Et.length) - 1,
            ol = 0,
            gd = () => co.some((Eu) => !It.has(Eu)) || !It.has(So);
          while (vs >= yn && ol < 2048 && gd()) {
            let max = Math.max(yn, vs - 63);
            (Vr(max, vs + 1), (ol += vs + 1 - max), (vs = max - 1));
          }
          Xn = ol;
          let Su = gd();
          if (!Su) {
            let Eu = new Set();
            for (let Kc of co) {
              let _s = It.get(Kc);
              if (_s !== void 0) Eu.add(_s);
            }
            let Uc = new Set();
            for (let Kc = Sd; Kc < Et.length && !Su; Kc++) {
              if (yt[Kc] < 0) continue;
              let _s = gt[Kc];
              while (_s != null) {
                let Qm = It.get(_s);
                if (Qm === void 0) {
                  Su = vs >= yn;
                  break;
                }
                if (Qm >= Sd || Eu.has(Qm) || Uc.has(Qm)) break;
                (Uc.add(Qm), (_s = gt[Qm]));
              }
            }
          }
          if (Su && vs >= yn) ((fo = !0), Vr(yn, vs + 1));
        }
      } else if (!vn) Vr(yn, Et.length);
    }
    let Es = bunJSONLParse(),
      Nr = Es && Es(Buffer.from('{"a":1}')).values.length === 1 ? Es : void 0,
      Is = (ga) => ga.length >= 3 && ga[0] === 239 && ga[1] === 187 && ga[2] === 191,
      fs = (ga) => {
        if (Nr) {
          if (Is(ga)) throw SyntaxError("byte-order mark before the JSON value");
          let Hl = Nr(ga);
          if (Hl.values.length < 1) throw SyntaxError("no JSON value on line");
          return Hl.values[0];
        }
        return jsonParse(ga.toString("utf8"));
      };
    for (let ga = Zt.length - 1; ga >= 0; ga--) {
      let Hl = Zt[ga];
      if (Hl < no || Hl < To) break;
      let read = e.read(Hl, rn[ga]),
        Sd;
      try {
        Sd = fs(read);
      } catch {
        continue;
      }
      if (Sd?.leafUuid) {
        rr = Sd.leafUuid;
        break;
      }
    }
    let as = null,
      Vi = null,
      ji,
      Wi;
    if (vn && co && ko !== void 0) {
      let ga = 0,
        Hl = Et.length - 1;
      while (ga <= Hl) {
        let hd = (ga + Hl) >> 1,
          Sd = Et[hd];
        if (Sd === ko) {
          ji = hd;
          break;
        }
        if (Sd < ko) ga = hd + 1;
        else Hl = hd - 1;
      }
      if (ji !== void 0) {
        Wi = [];
        for (let hd of co) {
          let Sd = It.get(hd);
          if (Sd === void 0) {
            Wi = void 0;
            break;
          }
          Wi.push(Sd);
        }
      }
    }
    let ii = ji !== void 0 && !Wi,
      wa = !1;
    if (Wi && ji !== void 0 && So) {
      let ga = It.get(So);
      if (ga !== void 0 && ga < ji && !Wi.includes(ga)) ((wa = !0), (Wi = void 0));
    }
    if (un) Wi = void 0;
    if (!s && vn && !Wi)
      ((Or = !0),
        logEvent("tengu_transcript_preserved_dispatch", {
          mode: lit_2("fallback_all"),
          indexed_slots: Et.length,
          reason: !co
            ? lit_2("no_list")
            : ji === void 0
              ? lit_2("boundary_unindexed")
              : ii
                ? lit_2("uuid_missing")
                : wa
                  ? lit_2("anchor_before_boundary")
                  : lit_2("duplicate_uuid"),
        }));
    if (!s && vn && Wi && ji !== void 0) {
      ((as = new Set()), (Vi = []));
      let ga = new Set(),
        Hl = (Ld) => {
          if ((ga.add(Ld), yt[Ld] < 0)) return;
          (as.add(Et[Ld]), Vi.push([Et[Ld], yt[Ld]]));
        },
        hd = new Set(Wi);
      if (Et.length > 0 && bo.has(Et[0])) Hl(0);
      for (let Ld of Wi) if (!ga.has(Ld)) Hl(Ld);
      let Sd = 0;
      for (let Ld = ji; Ld < Et.length; Ld++) {
        if (!ga.has(Ld)) Hl(Ld);
        let vs = gt[Ld],
          ol = vs == null ? void 0 : It.get(vs);
        while (ol !== void 0 && ol < ji && !hd.has(ol) && !ga.has(ol)) {
          (Hl(ol), Sd++);
          let gd = gt[ol];
          ol = gd == null ? void 0 : It.get(gd);
        }
      }
      logEvent("tengu_transcript_preserved_dispatch", {
        mode: lit_2("list"),
        indexed_slots: Et.length,
        dispatched_slots: ga.size,
        preserved: Wi.length,
        straggler_ancestors: Sd,
        lazy_unindexed_slots: ho ? count(Kn, (Ld) => Ld) : 0,
        lazy_backscanned_lines: Xn,
        lazy_backfilled_all: fo,
      });
    }
    let hr = -1;
    if (!s && !vn) {
      for (let ga = Et.length - 1; ga >= 0; ga--)
        if (!At[ga] && yt[ga] >= 0) {
          hr = ga;
          break;
        }
    }
    if (hr >= 0) {
      ((as = new Set()), (Vi = []));
      let ga = new Set(),
        Hl,
        hd = (Ld) => {
          let vs = Ld,
            ol = new Set();
          while (vs !== void 0 && !ga.has(vs)) {
            (ga.add(vs), ol.add(vs), as.add(Et[vs]), Vi.push([Et[vs], yt[vs]]));
            let gd = gt[vs];
            if (gd == null) {
              vs = void 0;
              break;
            }
            if (gd === "parentUuid is neither a string nor null") {
              Hl ??= "non_string_parent";
              break;
            }
            let Su = It.get(gd);
            if (Su === void 0 || ol.has(Su)) {
              Hl ??= Su === void 0 ? "unknown_parent" : "parent_cycle";
              break;
            }
            vs = Su;
          }
        };
      hd(hr);
      let Sd = rr ? It.get(rr) : void 0;
      if ((hd(Sd), Hl !== void 0)) {
        let Ld = Hl;
        (logEvent("tengu_transcript_phantom_parent", {
          total_offsets: Et.length,
          walked_slots: as.size,
          reason: fromEnum(Ld),
        }),
          (as = null),
          (Vi = null));
      }
    }
    let mi = 1048576,
      Ha = Vi ?? [];
    if (!Vi) {
      for (let ga = 0; ga < Et.length; ga++) if (yt[ga] >= 0) Ha.push([Et[ga], yt[ga]]);
    }
    for (let ga = 0; ga < Yt.length; ga++) Ha.push([Yt[ga], qt[ga]]);
    let $a = -1;
    if (Et.length > 0 && bo.has(Et[0]) && !At[0]) $a = Et[0];
    if (ji !== void 0 && Wi && !s && !At[ji] && Et[ji] > $a) $a = Et[ji];
    for (let ga = 0; ga < Zt.length; ga++) if (Zt[ga] >= $a) Ha.push([Zt[ga], rn[ga]]);
    for (let ga = Zt.length - 1; ga >= 0; ga--) {
      let Hl = Zt[ga];
      if (Hl >= $a || !pn[ga]) continue;
      let read = e.read(Hl, rn[ga]),
        Sd;
      try {
        Sd = fs(read);
      } catch {
        continue;
      }
      if (Sd?.leafUuid === void 0) continue;
      Ha.push([Hl, rn[ga]]);
      break;
    }
    Ha.sort((ga, Hl) => ga[0] - Hl[0]);
    let nr = as !== null,
      Ti = [],
      Vs = nr ? new Uint8Array(Et.length) : void 0,
      _i = nr ? new Int32Array(Et.length).fill(-1) : void 0,
      jo = nr ? new Int32Array(Et.length).fill(-1) : void 0,
      Qr = nr ? new Int32Array(Et.length).fill(-1) : void 0;
    if (_i && jo && Qr)
      for (let ga = Et.length - 1; ga >= 0; ga--) {
        let Hl = gt[ga],
          hd = Hl == null ? void 0 : It.get(Hl);
        if (hd === void 0) continue;
        if (((_i[ga] = hd), hd === ga)) continue;
        ((Qr[ga] = jo[hd]), (jo[hd] = ga));
      }
    let fi = [],
      Ri = 0,
      Ja = 0;
    using Li = slowLogging`transcript load pass2 (${Ha.length} lines to parse)`;
    let Qs = (ga) => ga.includes(buffer_12) || ga.includes(buffer_13),
      Hi = (ga, Hl, hd) => {
        if (nr) {
          let Sd = Di(hd);
          if (Sd >= 0) {
            let Ld = yr(Sd),
              vs = Ld === void 0 ? null : (Ti[Ld] ?? null),
              ol = as.has(hd);
            if (!ga) {
              if (ol) Kr(Sd, vs, !1);
              return;
            }
            if (!ol) {
              if (hasMalformedMessage(ga)) return;
              if (!isChainLinkCandidate(ga, vs)) {
                if (Ld !== void 0 && Vs[Ld]) n(ga, Qs(Hl));
                return;
              }
            }
            Kr(Sd, getAssistantMessageId(ga, vs), isProgressOrHiddenEntry(ga));
          }
        }
        if (ga) n(ga, Qs(Hl));
      },
      Xa = 0,
      ta = (ga, Hl, hd, Sd) => {
        if (bo.has(Sd)) r();
        let Ld = Hl,
          vs = Hl + hd;
        while (Ld < vs && ga[Ld] === 0) Ld++;
        if (Ld === vs) return;
        let chunk = ga.subarray(Ld, vs),
          gd;
        if (Nr) {
          let Su;
          try {
            Su = Nr(chunk);
          } catch {
            (Xa++, Hi(null, chunk, Sd));
            return;
          }
          if (Su.values.length < 1 || Is(chunk)) {
            (Xa++, Hi(null, chunk, Sd));
            return;
          }
          gd = Su.values[0];
        } else
          try {
            gd = jsonParseRaw(ga.toString("utf8", Ld, vs));
          } catch {
            (Xa++, Hi(null, chunk, Sd));
            return;
          }
        Hi(gd, chunk, Sd);
      },
      Bs = 0,
      Ca = () => {
        let ga = Bs < Ha.length ? Ha[Bs] : void 0;
        if (Ri < fi.length) {
          let Hl = fi[Ri];
          if (ga === void 0 || Et[Hl] < ga[0]) return [Et[Hl], yt[Hl]];
        }
        return ga;
      },
      tu = () => {
        if (Ri < fi.length && (Bs >= Ha.length || Et[fi[Ri]] < Ha[Bs][0])) Ri++;
        else Bs++;
      },
      pd = [];
    for (let ga = Ca(); ga !== void 0; ga = Ca()) {
      ((pd.length = 0), pd.push(ga), tu());
      let Hl = ga[0],
        hd = Hl + ga[1];
      for (let vs = Ca(); vs !== void 0 && vs[0] === hd + 1 && vs[0] + vs[1] - Hl <= mi; vs = Ca())
        (pd.push(vs), tu(), (hd = vs[0] + vs[1]));
      let read = e.read(Hl, hd - Hl),
        Ld;
      if (Nr && pd.length > 1) {
        let vs = read.length === hd - Hl;
        for (let ol = 0; vs && ol < pd.length; ol++) vs = pd[ol][1] >= 2 && read[pd[ol][0] - Hl] === 123;
        if (vs && isAscii(read))
          try {
            let ol = Nr(read);
            if (
              !ol.error &&
              ol.values.length === pd.length &&
              (ol.read === read.length || (ol.read === read.length - 1 && read.at(-1) === 13))
            )
              Ld = ol.values;
          } catch {
            Ld = void 0;
          }
      }
      if (Ld)
        for (let vs = 0; vs < pd.length; vs++) {
          let ol = pd[vs][0];
          if (bo.has(ol)) r();
          let gd = ol - Hl;
          Hi(Ld[vs], read.subarray(gd, gd + pd[vs][1]), ol);
        }
      else for (let vs = 0; vs < pd.length; vs++) ta(read, pd[vs][0] - Hl, pd[vs][1], pd[vs][0]);
    }
    reportUnparsableLines(Xa);
  } catch (error) {
    throw ((Io = { error: error }), error);
  } finally {
    closeAfterRead(() => e.close(), Io);
  }
  let zo = (Or ? void 0 : ko) ?? Math.max(no, 0),
    rs = 0;
  for (let Es = 0; Es < Yt.length; Es++) if (Yt[Es] < zo) rs += qt[Es];
  return {
    lastAttributionOffset: ao,
    lastAttributionLength: $o,
    ledgerLines: yo,
    finalLine: Ho,
    scan: {
      boundary: !vn ? (no >= 0 ? "plain" : "none") : Or ? "preserved_all_rows" : "preserved",
      keptFrom: zo,
      seedFrom: Math.max(hn, 0),
      earlierMetadataBytes: rs,
      scanMs: jr,
      scanStartMs: startTime,
    },
  };
}
//@ chunk-e6aww6q8.js:497626-497677 layout
function scanTranscriptFile(e, n, r, s, h) {
  return scanTranscriptBuffer(createFileChunkReader(e, n), r, s, h);
}
//@ chunk-e6aww6q8.js:497677-497755 layout
function endsWithNewlineSync(e, n) {
  let alloc = Buffer.alloc(1);
  return readSync(e, alloc, 0, 1, n - 1) === 1 && alloc[0] === 10;
}
//@ chunk-e6aww6q8.js:497755-497974 layout
async function endsWithNewline(e, n) {
  if (n === 0) return !0;
  let r = await open(e, "r"),
    s;
  try {
    let alloc = Buffer.alloc(1),
      { bytesRead: bytesRead } = await r.read(alloc, 0, 1, n - 1);
    return bytesRead === 1 && alloc[0] === 10;
  } catch (error) {
    throw ((s = { error: error }), error);
  } finally {
    await closeAfterReadAsync(() => r.close(), s);
  }
}
//@ chunk-e6aww6q8.js:497974-498012 layout
function gmo(e, n, r) {
  return readJsonAtOffsetSync(e, n, r);
}
//@ chunk-e6aww6q8.js:498012-498107 layout
function readJsonAtOffsetSync(e, n, r) {
  if (n < 0 || r <= 0) return null;
  let [s] = readFileTailSync(e, [{ offset: n, length: r }]);
  return parseJsonBuffer(s);
}
//@ chunk-e6aww6q8.js:498107-498194 layout
function parseJsonBuffer(e) {
  if (!e) return null;
  try {
    return jsonParse(e.toString("utf8"));
  } catch {
    return null;
  }
}
//@ chunk-e6aww6q8.js:498194-498269 layout
function readJsonAtOffset(e, n, r) {
  if (n < 0 || r <= 0) return null;
  return parseJsonBuffer(e.subarray(n, n + r));
}
//@ chunk-e6aww6q8.js:498269-498511 fingerprint = readFileTailSync (0.701)
function readFileTailSync(e, n) {
  if (n.length === 0) return [];
  let r = openSync(e, "r"),
    fd;
  try {
    return n.map(({ offset: offset, length: y }) => {
      if (offset < 0 || y <= 0) return null;
      let buf = Buffer.allocUnsafe(y);
      return readSync(r, buf, 0, y, offset) < y ? null : buf;
    });
  } catch (error) {
    throw ((fd = { error: error }), error);
  } finally {
    closeAfterRead(() => closeSync(r), fd);
  }
}
//@ chunk-e6aww6q8.js:498511-498604 facade-majority
var TRANSCRIPT_CLOSE_FAILED_REPORT =
  "loadTranscriptFile: transcript close failed while an earlier error was propagating";
//@ chunk-e6aww6q8.js:498604-498677 facade-majority
function closeAfterRead(e, n) {
  try {
    e();
  } catch (error) {
    if (n === void 0) throw error;
    reportTranscriptCloseFailure(error, n.error);
  }
}
//@ chunk-e6aww6q8.js:498677-498762 facade-majority
async function closeAfterReadAsync(e, n) {
  try {
    await e();
  } catch (error) {
    if (n === void 0) throw error;
    reportTranscriptCloseFailure(error, n.error);
  }
}
//@ chunk-e6aww6q8.js:498762-498904 layout
function reportTranscriptCloseFailure(e, n) {
  if (isWin32ReadEbadf(n)) {
    logForDebugging(`transcript close failed while an earlier error was propagating (${getErrnoCode(e)})`, {
      level: "warn",
    });
    return;
  }
  logError(withTelemetryMessage(e, TRANSCRIPT_CLOSE_FAILED_REPORT));
}
//@ chunk-e6aww6q8.js:498904-499117 layout
function addTranscriptLine(e, n, r) {
  let s = n === null ? null : n.subarray(yG(n, 0, n.length)),
    h = null;
  if (s !== null)
    try {
      h = jsonParse(s.toString("utf8"));
    } catch {
      h = null;
    }
  if (h !== null && typeof h === "object") {
    e.add(h, r);
    return;
  }
  e.torn(s === null ? null : readEnvelopeSessionId(s), r);
}
//@ chunk-e6aww6q8.js:499117-499231 layout
function rebuildFromLines(e, n, r) {
  let s = new ArtifactLedgerCollector(),
    h = 0;
  for (let y of e) addTranscriptLine(s, y, h++);
  n.clear();
  for (let [y, S] of s.finish(r)) n.set(y, S);
}
//@ chunk-e6aww6q8.js:499231-499389 layout
function isTornLine(e) {
  if (e === null) return !0;
  if (hasPrefix(e)) return !1;
  try {
    let n = jsonParse(e.toString("utf8", yG(e, 0, e.length)));
    return n === null || typeof n !== "object";
  } catch {
    return !0;
  }
}
//@ chunk-e6aww6q8.js:499389-499508 layout
function lastLineOf(e) {
  let n = e.length;
  while (n > 0 && e[n - 1] === 10) n--;
  let r = n === 0 ? 0 : e.lastIndexOf(10, n - 1) + 1;
  return e.subarray(r, n);
}
//@ chunk-e6aww6q8.js:499508-499640 layout
function* iterateEntryLines(e) {
  let n = 0;
  while (n < e.length) {
    let index = e.indexOf(10, n);
    if (index === -1) index = e.length;
    if (index > n && hasPrefix(e, n, index)) yield e.subarray(n, index);
    n = index + 1;
  }
}
//@ chunk-e6aww6q8.js:499640-499693 layout
function qMt(e) {
  return typeof e === "object" && e !== null;
}
//@ chunk-e6aww6q8.js:499693-499819 layout
function writtenAtOrLatest(e) {
  return typeof e.writtenAtMs === "number" && Number.isFinite(e.writtenAtMs)
    ? e.writtenAtMs
    : Number.POSITIVE_INFINITY;
}
//@ chunk-e6aww6q8.js:499819-499944 layout
function writtenAtOrEarliest(e) {
  return typeof e.writtenAtMs === "number" && Number.isFinite(e.writtenAtMs)
    ? e.writtenAtMs
    : Number.NEGATIVE_INFINITY;
}
//@ chunk-e6aww6q8.js:499944-501228 facade-majority
function mergeArtifactCommentMonitorEntries(e, n) {
  let artifacts = n.artifacts,
    artifacts_2 = e.artifacts;
  if (typeof artifacts !== "object" || artifacts === null)
    return typeof artifacts_2 === "object" && artifacts_2 !== null
      ? e.crossLineMerged === !0
        ? e
        : { ...e, crossLineMerged: !0 }
      : n;
  let h = new Map(Object.entries(artifacts));
  if (typeof artifacts_2 === "object" && artifacts_2 !== null)
    for (let [w, L] of Object.entries(artifacts_2)) {
      if (!qMt(L)) continue;
      let G = h.get(w),
        q = qMt(G);
      if (L.state !== "stopped") {
        if (
          L.state === "armed" &&
          L.holder !== void 0 &&
          q &&
          G.state === "armed" &&
          (G.holder === void 0
            ? writtenAtOrEarliest(G) <= writtenAtOrEarliest(L)
            : writtenAtOrEarliest(G) < writtenAtOrEarliest(L))
        ) {
          let {
            holderPid: holderPid,
            holderProcStart: holderProcStart,
            holderProcStartFt: holderProcStartFt,
            holderJob: holderJob,
            holderPidSpace: holderPidSpace,
            ...Me
          } = G;
          h.set(w, {
            ...Me,
            writtenAtMs: L.writtenAtMs,
            holder: L.holder,
            ...(L.holderPid !== void 0 && { holderPid: L.holderPid }),
            ...(L.holderProcStart !== void 0 && { holderProcStart: L.holderProcStart }),
            ...(L.holderProcStartFt !== void 0 && { holderProcStartFt: L.holderProcStartFt }),
            ...(L.holderJob !== void 0 && { holderJob: L.holderJob }),
            ...(L.holderPidSpace !== void 0 && { holderPidSpace: L.holderPidSpace }),
          });
        }
        continue;
      }
      let Z = writtenAtOrLatest(L);
      if (!h.has(w) || !q) {
        h.set(w, L);
        continue;
      }
      let Se =
        G.state === "stopped"
          ? writtenAtOrLatest(G)
          : G.state === "armed"
            ? writtenAtOrEarliest(G)
            : Number.NEGATIVE_INFINITY;
      if (G.state === "stopped" ? Z > Se : Z >= Se) h.set(w, L);
    }
  let keys = Object.keys(artifacts),
    S = h.size === keys.length && keys.every((w) => h.get(w) === artifacts[w]);
  if (S && n.crossLineMerged === void 0) return n;
  return { ...n, ...(S ? {} : { crossLineMerged: !0 }), artifacts: Object.fromEntries(h) };
}
//@ chunk-e6aww6q8.js:501228-502443 placement = shouldExtractMemory (0)
function findToolUseSiblings(e, n, r, { direct: direct, throughBatch: throughBatch }) {
  let y,
    S = [],
    w = !1;
  if (throughBatch) {
    let Ee = new Set(),
      Ae,
      Ie = e.get(r);
    while (Ie && isAuxiliaryEntry(Ie) && !Ee.has(Ie.uuid))
      (Ee.add(Ie.uuid), (Ae = Ie), (Ie = Ie.parentUuid ? e.get(Ie.parentUuid) : void 0));
    if (Ie?.type === "user" && _D(Ie.message?.content, "tool_result"))
      ((S = getToolResultIds(Ie)), (y = Ie.parentUuid ? e.get(Ie.parentUuid) : void 0));
    else if (Ae) {
      let Me =
          Ae.type === "attachment" && isPlainObject_4(Ae.attachment) && "toolUseID" in Ae.attachment
            ? Ae.attachment.toolUseID
            : void 0,
        We = Ie?.type === "assistant" ? Ie.message?.id : void 0;
      ((y =
        Ie && We && typeof Me === "string"
          ? [Ie, ...collectSameMessageSiblings(e, Ie, We)].find((ze) => hasToolUseBlock(ze).includes(Me))
          : void 0),
        (S = y && typeof Me === "string" ? [Me] : []),
        (w = S.length > 0));
    } else y = Ie;
  }
  let L = y ? hasToolUseBlock(y) : [],
    G = y?.type === "assistant" && L.length > 0 && y.message?.id ? y.message.id : void 0,
    q = new Set(y && G ? collectSameMessageSiblings(e, y, G).map((Ee) => Ee.uuid) : []),
    Z = new Set(),
    Se,
    ke = !1,
    we = n;
  while (we && !Z.has(we)) {
    if (direct && we === r) return !0;
    Z.add(we);
    let Ee = e.get(we);
    if (y && G && Ee) {
      if (ke && Ee.uuid === y.uuid) return !0;
      if (
        Ee.type === "assistant" &&
        Ee.uuid !== y.uuid &&
        Ee.message?.id === G &&
        countToolCallsSince_5(Ee)
      ) {
        if (q.has(Ee.uuid)) return !0;
        ke = !0;
      } else if (!countVisibleMessages_2(Ee, G)) ke = !1;
    }
    if (
      y &&
      Ee?.uuid === y.uuid &&
      Se &&
      S.some((Ae) => L.includes(Ae)) &&
      getToolResultIds(Se).some((Ae) => L.includes(Ae) && (w ? L.length > 1 : !S.includes(Ae)))
    )
      return !0;
    ((Se = Ee), (we = Ee?.parentUuid ?? void 0));
  }
  return !1;
}
//@ chunk-e6aww6q8.js:502443-502643 placement
function collectSameMessageSiblings(e, n, r) {
  let s = [],
    h = new Set([n.uuid]),
    y = n.parentUuid ? e.get(n.parentUuid) : void 0;
  while (y && !h.has(y.uuid) && countVisibleMessages_2(y, r))
    (h.add(y.uuid), s.push(y), (y = y.parentUuid ? e.get(y.parentUuid) : void 0));
  return s;
}
/**
 * 构造转录加载器：逐条处理 jsonl 记录，按 uuid 收集消息，按类型收集 summary、custom-title、tag、ai-title、file-history、attribution、content-replacement、worktree-state 等元数据，并找出叶子节点。
 */
//@ chunk-e6aww6q8.js:502643-511663 fingerprint = loadTranscriptFile (0.424)
function loadTranscriptFile_2(e) {
  let messages = new Map(),
    summaries = new Map(),
    customTitles = new Map(),
    tags = new Set(),
    agentNames = new Map(),
    agentColors = new Map(),
    agentSettings = new Map(),
    prNumbers = new Map(),
    prUrls = new Map(),
    prRepositories = new Map(),
    modes = new Map(),
    worktreeStates = new Map(),
    fileHistorySnapshots = new Map(),
    attributionSnapshots = new Map(),
    contentReplacements = new Map(),
    agentContentReplacements = new Map(),
    Ie = new Map(),
    Me = new Map(),
    We = new Map(),
    ze = new Map(),
    lt = new Set(),
    Je = new Map(),
    nt = new Map(),
    pt = new Map(),
    Et = new Map(),
    yt = new Map(),
    gt = new Map(),
    At = new Map(),
    It = new Map(),
    Yt = new Map(),
    qt = new Map(),
    Zt = new Map(),
    rn = new Map(),
    pn = new Map(),
    no = new Map(),
    hn = new Map(),
    ho = new Map(),
    yn = new Map(),
    Kn = !1,
    Xn,
    fo,
    To = "",
    bo,
    vn = !1,
    co = !1,
    So = !1,
    ko = !1,
    un = !1,
    ao = 0,
    $o = "leaf_scan",
    yo = !1,
    Ho,
    rr = new Map(),
    br = createRowRepairer(),
    Hr = createRewindTracker(messages),
    Fr = (Cr, Vr = !0) => {
      if (!isPlainObject_2(Cr)) return;
      let Oo = Cr;
      if (isLegacyProgressEntry(Oo)) {
        logLegacyProgressProbe("seen");
        let parentUuid = Oo.parentUuid;
        rr.set(Oo.uuid, parentUuid && rr.has(parentUuid) ? (rr.get(parentUuid) ?? null) : parentUuid);
        return;
      }
      if (isTranscriptMessage(Oo)) {
        if (Oo.parentUuid && rr.has(Oo.parentUuid))
          (logLegacyProgressProbe("rewrote"), (Oo.parentUuid = rr.get(Oo.parentUuid) ?? null));
        if (Ho !== void 0 && !Oo.isSidechain) {
          if (Oo.parentUuid === null && !isCompactBoundaryMessage_3(Oo)) Oo.parentUuid = Ho;
          Ho = void 0;
        }
        if (!br.admit(Oo, messages)) return;
        if (Vr) repairMalformedStringsDeep(Oo);
        if (Oo.type === "assistant" && Oo.wireToolInputs !== void 0) {
          let jr = countToolCallsSince_2(Oo.wireToolInputs, Oo.message?.content, Oo.batchToolUses);
          if (jr === void 0) delete Oo.wireToolInputs;
          else Oo.wireToolInputs = jr;
        }
        if (Oo.type === "assistant" && (Oo.wireToolInputs !== void 0 || Oo.wireIngestContext !== void 0)) {
          let jr = restoreWireInputStamps(Oo.wireIngestContext, Oo.wireToolInputs, Oo.message?.content);
          if (jr === void 0) delete Oo.wireIngestContext;
          else Oo.wireIngestContext = jr;
        }
        if ((messages.set(Oo.uuid, Oo), !Oo.isSidechain && !isTranscriptMessage_2(Oo))) {
          if ((Hr.noteRow(Oo), (Xn = Oo.uuid), ao++, typeof Oo.timestamp === "string" && Oo.timestamp > To))
            ((fo = Oo.uuid), (To = Oo.timestamp));
          ((vn = !1), (So = !1), (ko = !1));
        }
        if (isCompactBoundaryMessage_3(Oo)) ((bo = void 0), (vn = !1), (co = !1), Hr.noteCompactBoundary());
      } else if (Oo.type === "summary" && Oo.leafUuid) summaries.set(Oo.leafUuid, Oo.summary);
      else if (Oo.type === "last-prompt") {
        if ((Hr.noteCheckpoint(Oo), Oo.leafUuid !== void 0)) un = !0;
        if (Oo.leafUuid)
          ((vn = Oo.explicit === !0 || (vn && Oo.leafUuid === bo)),
            (co = Oo.explicit === !0 || (co && Oo.leafUuid === bo)),
            (ko = Oo.rewound === !0 || (ko && Oo.leafUuid === bo)),
            (bo = Oo.leafUuid),
            (ao = 0),
            (So = !1));
        else if (Oo.leafUuid === null && Oo.explicit === !0)
          ((So = !0), (bo = void 0), (vn = !1), (co = !1), (ko = !1), (Ho = void 0));
      } else if (Oo.type === "custom-title" && Oo.sessionId) customTitles.set(Oo.sessionId, Oo.customTitle);
      else if (Oo.type === "ended-by-model" && Oo.sessionId && !$nr()) tags.add(Oo.sessionId);
      else if (Oo.type === "ai-title" && Oo.sessionId) agentNames.set(Oo.sessionId, Oo.aiTitle);
      else if (Oo.type === "tag" && Oo.sessionId) agentColors.set(Oo.sessionId, Oo.tag);
      else if (Oo.type === "relocated" && Oo.sessionId) agentSettings.set(Oo.sessionId, Oo.relocatedCwd);
      else if (Oo.type === "agent-name" && Oo.sessionId) prNumbers.set(Oo.sessionId, Oo.agentName);
      else if (Oo.type === "agent-color" && Oo.sessionId) prUrls.set(Oo.sessionId, Oo.agentColor);
      else if (Oo.type === "agent-setting" && Oo.sessionId) prRepositories.set(Oo.sessionId, Oo.agentSetting);
      else if (Oo.type === "mode" && Oo.sessionId) Je.set(Oo.sessionId, Oo.mode);
      else if (Oo.type === "permission-mode" && Oo.sessionId) nt.set(Oo.sessionId, Oo.permissionMode);
      else if (Oo.type === "isolation-latch" && Oo.sessionId) pt.set(Oo.sessionId, Oo.side);
      else if (Oo.type === "dev-mods" && Oo.sessionId)
        if (typeof Oo.folder === "string" && sjt(Oo.folder, Oo.sessionId)) Et.set(Oo.sessionId, Oo.folder);
        else logForDebugging("dev mods: dropped a dev-mods entry naming a folder not its own");
      else if (
        Oo.type === "memory-mode" &&
        Oo.sessionId &&
        (Oo.mode === "on" || Oo.mode === "off") &&
        (typeof Oo.afterUuid === "string" || Oo.afterUuid === null) &&
        typeof Oo.timestamp === "string"
      ) {
        let jr = yt.get(Oo.sessionId) ?? [];
        (yt.set(Oo.sessionId, jr),
          jr.push({
            mode: Oo.mode,
            afterUuid: Oo.afterUuid,
            timestamp: Oo.timestamp,
            ...((Oo.reason === "paused" ||
              Oo.reason === "account_off" ||
              Oo.reason === "account_read_only" ||
              Oo.reason === "session_shape" ||
              Oo.reason === "server_off") && { reason: Oo.reason }),
            ...(typeof Oo.account === "string" && { account: Oo.account }),
            ...((Oo.accountChoice === "on" ||
              Oo.accountChoice === "read_only" ||
              Oo.accountChoice === "off") && { accountChoice: Oo.accountChoice }),
          }));
      } else if (Oo.type === "atis-latch" && Oo.sessionId) {
        if (typeof Oo.atis === "string" && /^[\x21-\x7e]*$/.test(Oo.atis)) gt.set(Oo.sessionId, Oo.atis);
      } else if (Oo.type === "tools-used" && Oo.sessionId) {
        if (Array.isArray(Oo.tools))
          At.set(
            Oo.sessionId,
            Oo.tools.filter((tool) => typeof tool === "string" && tool !== ""),
          );
      } else if (Oo.type === "worktree-state" && Oo.sessionId) It.set(Oo.sessionId, Oo.worktreeSession);
      else if (Oo.type === "artifact-comment-monitor" && Oo.sessionId) {
        let jr = Yt.get(Oo.sessionId);
        Yt.set(Oo.sessionId, jr === void 0 ? Oo : mergeArtifactCommentMonitorEntries(jr, Oo));
      } else if (Oo.type === "artifact-autoreact-ledger" && Oo.sessionId) qt.set(Oo.sessionId, Oo);
      else if (Oo.type === "cost-state" && Oo.sessionId) {
        let safeParse = CostStateEntrySchema().safeParse(Oo);
        if (safeParse.success) Zt.set(Oo.sessionId, { ...safeParse.data, sessionId: Oo.sessionId });
      } else if (Oo.type === "pr-link" && Oo.sessionId)
        (modes.set(Oo.sessionId, Oo.prNumber),
          worktreeStates.set(Oo.sessionId, Oo.prUrl),
          fileHistorySnapshots.set(Oo.sessionId, Oo.prRepository));
      else if (Oo.type === "bridge-session" && Oo.sessionId) {
        if (
          (attributionSnapshots.set(Oo.sessionId, Oo.bridgeSessionId),
          contentReplacements.set(Oo.sessionId, Oo.lastSequenceNum),
          Oo.sessionGroupingId)
        )
          Ie.set(Oo.sessionId, Oo.sessionGroupingId);
        else Ie.delete(Oo.sessionId);
        if (Oo.noHistoryBackfill) Me.set(Oo.sessionId, !0);
        else Me.delete(Oo.sessionId);
        {
          let { ownerAccountUuid: ownerAccountUuid, ownerOrganizationUuid: ownerOrganizationUuid } = Oo,
            zo =
              (ownerAccountUuid !== void 0 && !isUuidShaped(ownerAccountUuid)) ||
              (ownerOrganizationUuid !== void 0 && !isUuidShaped(ownerOrganizationUuid));
          if (!zo && ownerAccountUuid) We.set(Oo.sessionId, ownerAccountUuid);
          else We.delete(Oo.sessionId);
          if (!zo && ownerOrganizationUuid) ze.set(Oo.sessionId, ownerOrganizationUuid);
          else ze.delete(Oo.sessionId);
        }
        let metaEntries = sanitizeStringList(Oo.declaredDialogKinds);
        if (metaEntries.length > 0) agentContentReplacements.set(Oo.sessionId, metaEntries);
        else agentContentReplacements.delete(Oo.sessionId);
      } else if (Oo.type === "history-suppression" && Oo.sessionId) lt.add(Oo.sessionId);
      else if (Oo.type === "file-history-snapshot") rn.set(Oo.messageId, Oo);
      else if (Oo.type === "file-history-delta") {
        let jr = pn.get(Oo.messageId);
        if (jr) jr.push(Oo);
        else pn.set(Oo.messageId, [Oo]);
      } else if (Oo.type === "attribution-snapshot") (no.clear(), no.set(Oo.messageId, Oo));
      else if (Oo.type === "content-replacement")
        if (Oo.agentId) {
          let jr = ho.get(Oo.agentId) ?? [];
          (ho.set(Oo.agentId, jr), jr.push(...Oo.replacements));
        } else {
          let jr = hn.get(Oo.sessionId) ?? [];
          (hn.set(Oo.sessionId, jr), jr.push(...Oo.replacements));
        }
      else if (Oo.type === "fork-context-ref") yn.set(Oo.agentId, Oo);
    };
  return {
    processEntry: Fr,
    precede: (Cr) => {
      for (let entry of Cr) Fr(entry);
      Ho = Cr.findLast((Vr) => isChainParticipant(Vr) && messages.has(Vr.uuid))?.uuid;
    },
    dropPreBoundaryEntries: () => {
      (messages.clear(), rn.clear(), pn.clear(), rr.clear());
    },
    messages: messages,
    attributionSnapshots: no,
    artifactCommentMonitors: Yt,
    artifactAutoReactLedgers: qt,
    markPrunedBeforeFold: () => {
      yo = !0;
    },
    setTailTorn: (Cr) => {
      Kn = Cr;
    },
    finish: () => {
      (br.finish(messages), Hr.publish());
      let entries = applyPreservedSegmentOnLoad(messages);
      if (!e) applySnipRemovals(messages, fo);
      return cs(entries);
    },
  };
  function cs(Cr) {
    if (Kn) for (let [Nr, Is] of Yt) Yt.set(Nr, { ...Is, tailTorn: !0 });
    if (!e && So) return _r(new Set());
    let progressBridge = new Set(),
      Oo = vn && bo && messages.has(bo) && !messages.get(bo)?.isSidechain,
      jr = (Nr) => {
        let parentUuids = new Map([[Nr, !0]]),
          fs = (msg) => {
            let Wi = [],
              ii = !1,
              wa = msg;
            while (wa) {
              let hr = parentUuids.get(wa);
              if (hr !== void 0) {
                ii = hr;
                break;
              }
              (parentUuids.set(wa, !1), Wi.push(wa), (wa = messages.get(wa)?.parentUuid ?? void 0));
            }
            for (let hr of Wi) parentUuids.set(hr, ii);
            return ii;
          },
          as = Nr,
          Vi = "";
        for (let ji of messages.values())
          if (
            !ji.isSidechain &&
            ji.uuid !== Nr &&
            typeof ji.timestamp === "string" &&
            ji.timestamp >= Vi &&
            fs(ji.uuid)
          )
            ((as = ji.uuid), (Vi = ji.timestamp));
        return as;
      },
      Or = Xn;
    if (!e && !un && Or && fo && fo !== Or) Or = jr(Or);
    if (!e && (!Cr || Oo)) {
      let Nr = bo && messages.has(bo) ? bo : void 0;
      if (
        Nr &&
        !vn &&
        Xn &&
        messages.has(Xn) &&
        Xn !== Nr &&
        findToolUseSiblings(messages, Xn, Nr, { direct: !0, throughBatch: !co })
      )
        Nr = Xn;
      if (!Cr) Nr ??= Or;
      if (Nr && messages.has(Nr)) {
        let leafUuids = new Set(),
          fs = messages.get(Nr);
        while (fs) {
          if (leafUuids.has(fs.uuid)) {
            logEvent("tengu_transcript_parent_cycle", {});
            break;
          }
          if ((leafUuids.add(fs.uuid), fs.type === "user" || fs.type === "assistant")) {
            progressBridge.add(fs.uuid);
            break;
          }
          fs = fs.parentUuid ? messages.get(fs.parentUuid) : void 0;
        }
        if (progressBridge.size === 1)
          return (($o = Nr === bo ? "checkpoint" : Nr === Xn ? "last_row" : "inferred"), _r(progressBridge));
      }
    }
    let hasUserAssistantChild = new Set(),
      seen = new Set();
    for (let Nr of messages.values())
      if (Nr.parentUuid !== null) {
        if ((hasUserAssistantChild.add(Nr.parentUuid), Nr.type === "user" || Nr.type === "assistant"))
          seen.add(Nr.parentUuid);
      }
    let rs = [];
    for (let Nr of messages.values()) if (!hasUserAssistantChild.has(Nr.uuid)) rs.push(Nr);
    if (
      collectLeafUuids({
        messages: messages,
        terminalMessages: rs,
        hasUserAssistantChild: seen,
        leafUuids: progressBridge,
      })
    )
      logEvent("tengu_transcript_parent_cycle", {});
    if (!e && progressBridge.size > 1) {
      let Nr =
        bo &&
        progressBridge.has(bo) &&
        (vn || !Xn || !findToolUseSiblings(messages, Xn, bo, { direct: !1, throughBatch: !co }))
          ? bo
          : Xn;
      if (!Nr || !messages.has(Nr)) return _r(progressBridge);
      let seen = new Set(),
        fs = messages.get(Nr);
      while (fs) {
        if (seen.has(fs.uuid)) break;
        if ((seen.add(fs.uuid), fs.type === "user" || fs.type === "assistant")) {
          (progressBridge.clear(),
            progressBridge.add(fs.uuid),
            ($o = Nr === bo ? "checkpoint_pruned" : "last_row_pruned"));
          break;
        }
        fs = fs.parentUuid ? messages.get(fs.parentUuid) : void 0;
      }
    }
    return _r(progressBridge);
  }
  function _r(Cr) {
    return (
      Hxt(messages, {
        chose: $o,
        checkpoint: bo,
        checkpointEverExplicit: co,
        lastRow: Xn,
        newestRow: fo,
        rowsAfterLastCheckpoint: ao,
        prunedBeforeFold: yo,
      }),
      {
        messages: messages,
        summaries: summaries,
        customTitles: customTitles,
        endedSessions: tags,
        aiTitles: agentNames,
        tags: agentColors,
        relocatedCwds: agentSettings,
        agentNames: prNumbers,
        agentColors: prUrls,
        agentSettings: prRepositories,
        prNumbers: modes,
        prUrls: worktreeStates,
        prRepositories: fileHistorySnapshots,
        bridgeSessionIds: attributionSnapshots,
        bridgeLastSeqs: contentReplacements,
        bridgeDialogKindsBySession: agentContentReplacements,
        bridgeSessionGroupingIds: Ie,
        bridgeNoBackfill: Me,
        bridgeOwnerAccountUuids: We,
        bridgeOwnerOrganizationUuids: ze,
        historySuppressed: lt,
        modes: Je,
        permissionModes: nt,
        isolationLatches: pt,
        ...(Et.size > 0 && { devModsFolders: Et }),
        memoryModeStamps: yt,
        atisLatches: gt,
        ...(At.size > 0 && { toolsUsedLists: At }),
        worktreeStates: It,
        artifactCommentMonitors: Yt,
        artifactAutoReactLedgers: qt,
        costStates: Zt,
        fileHistorySnapshots: rn,
        fileHistoryDeltas: pn,
        attributionSnapshots: no,
        contentReplacements: hn,
        agentContentReplacements: ho,
        forkContextRefs: yn,
        leafUuids: Cr,
        clearedToEmpty: !e && So,
        rewindAnchorUuid: ko ? bo : void 0,
      }
    );
  }
}
//@ chunk-e6aww6q8.js:511663-511764 facade-majority
function loadTranscriptFromEntries(e, n) {
  let r = loadTranscriptFile_2(n?.keepAllLeaves ?? !1);
  for (let s of e) r.processEntry(s);
  return r.finish();
}
/**
 * 加载一份转录文件（或 storage 记录）：逐条解析，交给 loadTranscriptFile 处理器，跳过无法解析的行并统计。
 */
//@ chunk-e6aww6q8.js:511764-515250 facade-majority
async function loadTranscriptFile(e, n) {
  let r = loadTranscriptFile_2(n?.keepAllLeaves ?? !1),
    {
      processEntry: processEntry,
      artifactCommentMonitors: artifactCommentMonitors,
      artifactAutoReactLedgers: artifactAutoReactLedgers,
    } = r;
  r.precede(n?.precedingEntries ?? []);
  let S = isEnvTruthy(process.env.CLAUDE_CODE_DISABLE_PRECOMPACT_SKIP);
  if (isStorageV5Enabled() && n?.storageV5) {
    let { backend: backend, key: key } = n.storageV5,
      read = await backend.read([key]),
      q = read.ok
        ? void 0
        : d7t(read.error)
          ? await readPagedTranscript(backend, key)
          : isStorageTooLargeError(read.error)
            ? await readPagedTranscript(backend, key, G9)
            : void 0,
      Z = read.ok ? void 0 : q === void 0 ? read.error : q !== null && "failure" in q ? q.failure : void 0;
    if (Z !== void 0) {
      if (Z.code === "Failed" && Z.failureClass === "permission")
        return (
          logForDebugging("loadTranscriptFile: v5 read inaccessible (permission) \u2014 empty result"),
          Object.assign(r.finish(), { servedBy: "inaccessible" })
        );
      logForDebugging(`loadTranscriptFile: v5 read failed (${Z.code})`, { level: "error" });
      let Ie = errnoShapedCode("telemetryCode" in Z ? Z.telemetryCode : void 0),
        merged = Object.assign(
          Error("loadTranscriptFile: transcript unreadable via storage backend", { cause: Z }),
          Ie === void 0 ? {} : { code: Ie },
        );
      if (isWin32TranscriptEbadf(merged))
        logError(withTelemetryMessage(merged, WIN32_EBADF_TELEMETRY_MESSAGE));
      throw merged;
    }
    let Se = read.ok ? read.value.items[0] : void 0,
      ke = q !== void 0 && q !== null && "bytes" in q ? q : void 0,
      we = Se?.found
        ? { servedBy: "v5", v5Read: { mtimeMs: Se.mtimeMs } }
        : ke
          ? { servedBy: "v5-records", v5Read: { mtimeMs: ke.mtimeMs } }
          : { servedBy: "absent" },
      Ee = Se?.found ? Se.value : ke?.bytes,
      Ae = Se?.found ? Se.storedBytes : ke?.storedBytes;
    if (Ee !== void 0) {
      let buffer = Buffer.from(Ee.buffer, Ee.byteOffset, Ee.byteLength),
        Me = async () => {
          if (ke !== void 0) return ke.tornTailBytes > 0;
          let stats = await backend.stat(key);
          return stats.ok && (stats.value.tornTailBytes ?? 0) > 0;
        };
      if (!S && (Ae ?? buffer.length) > SKIP_PRECOMPACT_THRESHOLD) {
        let ze = scanTranscriptBuffer(
            createBufferLineScanner(buffer),
            processEntry,
            r.dropPreBoundaryEntries,
            n?.keepAllLeaves ?? !1,
          ),
          lt = readJsonAtOffset(buffer, ze.lastAttributionOffset, ze.lastAttributionLength);
        if (lt) r.attributionSnapshots.set(lt.messageId, lt);
        r.markPrunedBeforeFold();
        let Je =
            ze.finalLine.offset >= 0 &&
            ze.ledgerLines.at(-1)?.offset !== ze.finalLine.offset &&
            (ze.ledgerLines.length > 0 || artifactAutoReactLedgers.size > 0),
          mapped = (Je ? [...ze.ledgerLines, ze.finalLine] : ze.ledgerLines).map(
            ({ offset: offset, length: yt }) => buffer.subarray(offset, offset + yt),
          ),
          pt = Je && isTornLine(mapped.pop() ?? null);
        if (
          (rebuildFromLines(mapped, artifactAutoReactLedgers, pt),
          artifactCommentMonitors.size > 0 || artifactAutoReactLedgers.size > 0)
        ) {
          let Et = await Me();
          if ((r.setTailTorn(Et), Et))
            for (let [yt, gt] of artifactAutoReactLedgers)
              artifactAutoReactLedgers.set(yt, resetArtifactLedgerState(gt, !1));
        }
        return Object.assign(r.finish(), we);
      }
      let We = isTornLine(lastLineOf(buffer));
      if (!n?.keepAllLeaves && buffer.length > SKIP_PRECOMPACT_THRESHOLD)
        ((buffer = walkChainBeforeParse(buffer)), r.markPrunedBeforeFold());
      for (let ze of countJsonlLines(buffer)) processEntry(ze);
      if (
        (rebuildFromLines(iterateEntryLines(buffer), artifactAutoReactLedgers, We),
        artifactCommentMonitors.size > 0 || artifactAutoReactLedgers.size > 0)
      ) {
        let ze = await Me();
        if ((r.setTailTorn(ze), ze))
          for (let [lt, Je] of artifactAutoReactLedgers)
            artifactAutoReactLedgers.set(lt, resetArtifactLedgerState(Je, !1));
      }
    }
    return Object.assign(r.finish(), we);
  }
  if (isDiskless()) return r.finish();
  try {
    if (!S) {
      let { size: size } = await stat(e);
      if (size > SKIP_PRECOMPACT_THRESHOLD) {
        let q = scanTranscriptFile(e, size, processEntry, r.dropPreBoundaryEntries, n?.keepAllLeaves ?? !1);
        if (!n?.keepAllLeaves) {
          let { keptFrom: keptFrom, seedFrom: seedFrom, ...Ie } = q.scan;
          (syi({
            ...Ie,
            bytes: size,
            keptBytes: size - keptFrom,
            toolCopyChars: su().toolResultCopiesOnDisk === "whole" ? void 0 : bPt(r.messages.values()),
          }),
            su().replaySeedStarts.set(normalize(e), { start: seedFrom, fileSize: size }));
        }
        let Z = gmo(e, q.lastAttributionOffset, q.lastAttributionLength);
        if (Z) r.attributionSnapshots.set(Z.messageId, Z);
        r.markPrunedBeforeFold();
        let Se =
            q.finalLine.offset >= 0 &&
            q.ledgerLines.at(-1)?.offset !== q.finalLine.offset &&
            (q.ledgerLines.length > 0 || artifactAutoReactLedgers.size > 0),
          ke = readFileTailSync(e, Se ? [...q.ledgerLines, q.finalLine] : q.ledgerLines),
          we = Se && isTornLine(ke.pop() ?? null);
        if ((rebuildFromLines(ke, artifactAutoReactLedgers, we), artifactCommentMonitors.size > 0))
          r.setTailTorn(!(await endsWithNewline(e, size)));
        return r.finish();
      }
    }
    let w = await readFile(e),
      L = isTornLine(lastLineOf(w));
    if (
      (r.setTailTorn(w.length > 0 && w.at(-1) !== 10),
      !n?.keepAllLeaves && w.length > SKIP_PRECOMPACT_THRESHOLD)
    )
      ((w = walkChainBeforeParse(w)), r.markPrunedBeforeFold());
    for (let G of countJsonlLines(w)) processEntry(G);
    rebuildFromLines(iterateEntryLines(w), artifactAutoReactLedgers, L);
  } catch (error) {
    if (!isFsInaccessible(error)) {
      if (isWin32ReadEbadf(error)) logError(withTelemetryMessage(error, WIN32_EBADF_TELEMETRY_MESSAGE));
      else if (Qoe(error))
        logForDebugging(
          `loadTranscriptFile: transcript unreadable (${getErrnoCode(error)}): ${errorMessage(error)}`,
          { level: "error" },
        );
      else logError(error);
      throw error;
    }
  }
  return r.finish();
}
/**
 * 按 sessionId 或显式路径加载会话转录，返回加载结果与会话文件路径。
 */
//@ chunk-e6aww6q8.js:515250-515696 layout
async function loadSessionTranscript(e, n, r, s) {
  if (isStorageV5Enabled() && r !== void 0)
    if (n === void 0) {
      let S = await loadSessionFile(e, r);
      if (S !== void 0) {
        let w = await loadTranscriptFile(S.path, {
          storageV5: { backend: r, key: S.key },
          precedingEntries: s,
        });
        return Object.assign(w, { sessionFile: S.path });
      }
    } else {
      let S = getTranscriptStorageKey(n, r);
      if (S !== void 0) {
        let w = await loadTranscriptFile(n, { storageV5: S, precedingEntries: s });
        return Object.assign(w, { sessionFile: n });
      }
    }
  let h = n ?? (await getErrorsPath(e)),
    y = await loadTranscriptFile(h, { precedingEntries: s });
  return Object.assign(y, { sessionFile: h });
}
/**
 * 按 sessionId 定位会话文件：先看会话记录的 projectDir，再看当前项目目录与清洗名截断冲突的兄弟目录。
 */
//@ chunk-e6aww6q8.js:515696-516929 callgraph-fingerprint = loadSessionFile (0.183)
async function loadSessionFile(e, n) {
  if (!isValidKeySegment(e)) return;
  let r = getSessionProjectDir();
  if (r !== null) {
    let L = basename_2(r);
    if (dirname(r) !== getProjectsDir_2() || !isValidKeySegment(L)) return;
    let G = e0(STORAGE_SPACES.transcript(L, e));
    if (G === void 0) return;
    return { key: G, path: join_3(r, `${e}.jsonl`) };
  }
  let s = getOriginalCwdOrNull(),
    h = getProjectDirNameOverride() ?? getProjectKey(getOriginalCwd()),
    y = [h],
    S = s === null ? void 0 : legacyDerivedProjectKey(s);
  if (S !== void 0) y.push(S);
  else if (s !== null && h.length > MAX_SANITIZED_LENGTH) {
    let G = (Ie) => Ie,
      q = G(h.slice(0, MAX_SANITIZED_LENGTH) + "-"),
      Z = G(h),
      Se = new Set(),
      ke = [],
      we,
      Ee = 0;
    try {
      do {
        let listEntries = await n.listEntries(
          { namespace: "transcript" },
          { skipScopeStats: !0, ...(we !== void 0 && { cursor: we }) },
        );
        if (!listEntries.ok) break;
        for (let item of listEntries.value.items)
          if (
            item.kind === "scope" &&
            item.scope.namespace === "transcript" &&
            item.scope.projectKey !== void 0 &&
            G(item.scope.projectKey).startsWith(q) &&
            G(item.scope.projectKey) !== Z &&
            isValidKeySegment(item.scope.projectKey) &&
            !Se.has(G(item.scope.projectKey))
          )
            (Se.add(G(item.scope.projectKey)), ke.push(item.scope.projectKey));
        we = listEntries.value.cursor;
      } while (we && ++Ee < MAX_LISTING_PAGES);
    } catch {}
    let Ae = {
      backend: n,
      transcriptKey: STORAGE_SPACES.transcript,
      isKeySegment: isValidKeySegment,
      realWorkspacePath: makeWorkspaceRealPath(n),
    };
    for (let Ie of ke)
      if (await dirBelongsToProject(join_3(getProjectsDir_2(), Ie), s, !1, wrapStorageSource(Ae))) y.push(Ie);
  }
  for (let L of y) {
    let G = e0(STORAGE_SPACES.transcript(L, e));
    if (G === void 0) continue;
    if ((await n.stat(G)).ok) return { key: G, path: join_3(getProjectsDir_2(), L, `${e}.jsonl`) };
  }
  let w = e0(STORAGE_SPACES.transcript(h, e));
  return w === void 0 ? void 0 : { key: w, path: join_3(getProjectsDir_2(), h, `${e}.jsonl`) };
}
//@ chunk-e6aww6q8.js:516929-517106 layout = getErrorsPath (1)
async function getErrorsPath(e) {
  let n = getSessionProjectDir(),
    r = getOriginalCwd(),
    s = `${e}.jsonl`,
    h = join_3(n ?? getProjectDir_2(r), s);
  if (n !== null) return h;
  for (let y of await findProjectDirs(r)) {
    let S = join_3(y, s);
    try {
      return (await stat(S), S);
    } catch {}
  }
  return h;
}
//@ chunk-e6aww6q8.js:517106-517154 facade-majority
function clearSessionMessagesCache() {
  su().clearSessionMessagesCache();
}
//@ chunk-e6aww6q8.js:517154-517228 facade-majority
function consumeFailedTranscriptWrite() {
  let e = su(),
    hasFailedWrite = e.hasFailedWrite;
  return ((e.hasFailedWrite = !1), hasFailedWrite);
}
//@ chunk-e6aww6q8.js:517228-517282 facade-majority
function primeSessionMessagesCache(e, n) {
  su().primeSessionMessagesCache(e, n);
}
//@ chunk-e6aww6q8.js:517282-517355 facade-majority
async function doesMessageExistInSession(e, n, r) {
  return (await su().sessionMessages(e, r)).has(n);
}
//@ chunk-e6aww6q8.js:517355-517585 facade-majority
async function isMessageTurnUnanswered(e, n, r) {
  try {
    let { messages: messages } = await loadSessionTranscript(e, void 0, r);
    return isTurnUnanswered([...messages.values()], n);
  } catch (error) {
    return (
      logForDebugging(
        `isMessageTurnUnanswered: loadSessionFile failed: ${error instanceof Error ? error.message : String(error)}`,
        { level: "error" },
      ),
      !1
    );
  }
}
//@ chunk-e6aww6q8.js:517585-518079 facade-majority
function isTurnUnanswered(e, n) {
  let index = e.findIndex((y) => y.uuid === n);
  if (index === -1) return !1;
  let s = [];
  for (let y = index + 1; y < e.length; y++) {
    let S = e[y];
    if ((S.type === "user" || S.type === "assistant") && !("isSidechain" in S && S.isSidechain === !0))
      s.push(S);
  }
  if (s.length === 0) return !0;
  let at = s.at(-1);
  if (!(at.type === "user" && at.interruptedByShutdown === !0)) return !1;
  for (let y = s.length - 2; y >= 0; y--) {
    let S = s[y];
    if (S.type === "assistant") continue;
    if (
      ("isCompactSummary" in S && S.isCompactSummary === !0) ||
      isInterruptionOnlyMessage(S) ||
      isToolResultMessage(S) ||
      isHarnessMetaMessage(S)
    )
      continue;
    return !1;
  }
  return !0;
}
//@ chunk-e6aww6q8.js:518335-520628 facade-majority = getLastSessionLog (0.235)
async function sessionLogFromTranscriptLoad(e, n, r) {
  let {
    messages: messages,
    summaries: summaries,
    customTitles: customTitles,
    endedSessions: endedSessions,
    aiTitles: aiTitles,
    tags: tags,
    relocatedCwds: relocatedCwds,
    agentNames: agentNames,
    agentColors: agentColors,
    agentSettings: agentSettings,
    prNumbers: prNumbers,
    prUrls: prUrls,
    prRepositories: prRepositories,
    bridgeSessionIds: bridgeSessionIds,
    bridgeLastSeqs: bridgeLastSeqs,
    bridgeDialogKindsBySession: bridgeDialogKindsBySession,
    bridgeSessionGroupingIds: bridgeSessionGroupingIds,
    bridgeNoBackfill: bridgeNoBackfill,
    bridgeOwnerAccountUuids: bridgeOwnerAccountUuids,
    bridgeOwnerOrganizationUuids: bridgeOwnerOrganizationUuids,
    historySuppressed: historySuppressed,
    modes: modes,
    permissionModes: permissionModes,
    isolationLatches: isolationLatches,
    devModsFolders: devModsFolders,
    memoryModeStamps: memoryModeStamps,
    atisLatches: atisLatches,
    toolsUsedLists: toolsUsedLists,
    worktreeStates: worktreeStates,
    artifactCommentMonitors: artifactCommentMonitors,
    artifactAutoReactLedgers: artifactAutoReactLedgers,
    costStates: costStates,
    fileHistorySnapshots: fileHistorySnapshots,
    fileHistoryDeltas: fileHistoryDeltas,
    attributionSnapshots: attributionSnapshots,
    contentReplacements: contentReplacements,
    leafUuids: leafUuids,
    clearedToEmpty: clearedToEmpty,
  } = n;
  if (messages.size === 0) return null;
  if (r === void 0) su().primeFilelessResume(e, messages.keys());
  else primeSessionMessagesCache(e, messages.keys());
  let fo =
    findLatestMessage(
      messages.values(),
      (yo) => leafUuids.has(yo.uuid) && !yo.isSidechain && (yo.type === "user" || yo.type === "assistant"),
    ) ??
    (leafUuids.size === 0 && !clearedToEmpty
      ? findLatestMessage(messages.values(), (yo) => !yo.isSidechain)
      : void 0);
  if (!fo) {
    if (clearedToEmpty && r !== void 0) {
      let modifiedAt = await r.modifiedAt();
      return buildLiteLogFromMessages(
        n,
        { date: modifiedAt.toISOString(), fullPath: r.path, created: modifiedAt, modified: modifiedAt },
        e,
      );
    }
    return null;
  }
  let transcript = buildConversationChain(messages, fo);
  warnIfTranscriptUnchained(messages, transcript, fo.sessionId);
  let sessionId = fo.sessionId,
    summary = summaries.get(fo.uuid),
    customTitle = customTitles.get(sessionId),
    tag = tags.get(sessionId),
    agentSetting = agentSettings.get(sessionId),
    un = convertToLogOption(
      transcript,
      0,
      summary,
      customTitle,
      buildFileHistorySnapshots(fileHistorySnapshots, fileHistoryDeltas, transcript),
      tag,
      r?.path,
      buildAttributionSnapshotChain(attributionSnapshots, transcript),
      agentSetting,
      contentReplacements.get(sessionId) ?? [],
    ),
    ao = relocatedCwds.get(sessionId),
    $o = {
      ...un,
      ...(r === void 0 && { sessionId: e }),
      fileSnapshots: getFileSnapshotMessages(messages),
      projectPath: ao ?? un.projectPath,
      rewindAnchorUuid: n.rewindAnchorUuid,
      aiTitle: aiTitles.get(sessionId),
      relocatedCwd: ao,
      ...withEndedByModel({}, endedSessions.has(sessionId)),
      agentName: agentNames.get(sessionId) ?? un.agentName,
      agentColor: agentColors.get(sessionId),
      mode: modes.get(sessionId),
      permissionMode: permissionModes.get(sessionId),
      isolationLatch: isolationLatches.get(sessionId),
      devModsFolder: devModsFolders?.get(sessionId),
      memoryModeStamps: memoryModeStamps.get(sessionId) ?? [],
      atisLatch: getOrEmptyString(atisLatches, sessionId),
      toolsUsed: toolsUsedLists?.get(sessionId),
      prNumber: prNumbers.get(sessionId),
      prUrl: prUrls.get(sessionId),
      prRepository: prRepositories.get(sessionId),
      bridgeSessionId: bridgeSessionIds.get(sessionId),
      bridgeLastSeq: bridgeLastSeqs.get(sessionId),
      bridgeDialogKinds: bridgeDialogKindsBySession.get(sessionId),
      bridgeSessionGroupingId: bridgeSessionGroupingIds.get(sessionId),
      bridgeNoHistoryBackfill: bridgeNoBackfill.get(sessionId),
      bridgeOwnerAccountUuid: bridgeOwnerAccountUuids.get(sessionId),
      bridgeOwnerOrganizationUuid: bridgeOwnerOrganizationUuids.get(sessionId),
      sessionHistorySuppressed: historySuppressed.has(sessionId) ? !0 : void 0,
      worktreeSession: worktreeStates.get(sessionId),
      artifactCommentMonitor: artifactCommentMonitors.get(sessionId),
      artifactAutoReactLedger: artifactAutoReactLedgers.get(sessionId),
      costState: costStates.get(sessionId),
    };
  if (r !== void 0) {
    let project = su().project;
    Uxt($o, messages, transcript, project ? { writer: project, sessionId: e } : void 0);
  }
  return $o;
}
/**
 * 加载当前项目的会话日志列表并富化。
 */
//@ chunk-e6aww6q8.js:520628-520756 facade-majority = loadMessageLogs (1)
async function loadMessageLogs(e, n) {
  let r = await fetchLogs(e, n),
    { logs: logs } = await enrichLogs(r, 0, r.length, n),
    sorted = sortLogs(logs);
  return (
    sorted.forEach((log, S) => {
      log.value = S;
    }),
    sorted
  );
}
//@ chunk-e6aww6q8.js:520756-520922 facade-majority
async function findFirstMessageLog(e, n, r) {
  let alloc = Buffer.alloc(LITE_READ_BUF_SIZE);
  for (let h of e) {
    let y = await enrichLog(h, alloc, r);
    if (!y) continue;
    let S = n(y);
    if (S === "stop") return null;
    if (S) return y;
  }
  return null;
}
/**
 * 加载所有项目的会话日志（/resume 全部项目视图）。
 */
//@ chunk-e6aww6q8.js:520922-521054 facade-majority = loadAllProjectsMessageLogs (1)
async function loadAllProjectsMessageLogs(limit, options) {
  if (options?.skipIndex) return loadAllProjectsMessageLogsFull(limit, options.storageV5);
  return (
    await loadAllProjectsMessageLogsProgressive(
      limit,
      options?.initialEnrichCount ?? DEFAULT_LOG_PAGE_SIZE,
      options?.storageV5,
    )
  ).logs;
}
//@ chunk-e6aww6q8.js:521054-521065 layout
var LOG_LIST_CONCURRENCY = 64;
//@ chunk-e6aww6q8.js:521065-521368 layout
async function listTranscriptProjectKeys(e) {
  let n = new Set(),
    r,
    s = 0;
  try {
    do {
      let listEntries = await e.listEntries(
        { namespace: "transcript" },
        { skipScopeStats: !0, ...(r !== void 0 && { cursor: r }) },
      );
      if (!listEntries.ok) return;
      for (let item of listEntries.value.items) {
        let S = listedProjectKey(item, isValidKeySegment);
        if (S !== void 0) n.add(S);
      }
      r = listEntries.value.cursor;
    } while (r && ++s < LOG_LIST_CONCURRENCY);
    if (r) return;
  } catch {
    return;
  }
  return [...n];
}
//@ chunk-e6aww6q8.js:521368-522159 fingerprint = loadAllProjectsMessageLogsFull (0.838)
async function loadAllProjectsMessageLogsFull(e, n) {
  let projectsDir = getProjectsDir_2(),
    s = isStorageV5Enabled() && n ? await listTranscriptProjectKeys(n) : void 0;
  if (n && s !== void 0) {
    let results = await Promise.all(
        s.map((ke) => getLogsWithoutIndex(join_3(projectsDir, ke), e, { backend: n, projectKey: ke })),
      ),
      Z = new Map();
    for (let ke of results.flat()) {
      let we = `${ke.sessionId ?? ""}:${ke.leafUuid ?? ""}`,
        Ee = Z.get(we);
      if (!Ee || ke.modified.getTime() > Ee.modified.getTime()) Z.set(we, ke);
    }
    let Se = sortLogs([...Z.values()]);
    return (
      Se.forEach((ke, we) => {
        ke.value = we;
      }),
      Se
    );
  }
  if (isDiskless()) return [];
  let dirents;
  try {
    dirents = await readdir(projectsDir, { withFileTypes: !0 });
  } catch {
    return [];
  }
  let projectDirs = dirents
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => join_3(projectsDir, dirent.name)),
    flat = (await Promise.all(projectDirs.map((projectDir) => getLogsWithoutIndex(projectDir, e)))).flat(),
    deduped = new Map();
  for (let log of flat) {
    let key = `${log.sessionId ?? ""}:${log.leafUuid ?? ""}`,
      existing = deduped.get(key);
    if (!existing || log.modified.getTime() > existing.modified.getTime()) deduped.set(key, log);
  }
  let sorted = sortLogs([...deduped.values()]);
  return (
    sorted.forEach((log, Z) => {
      log.value = Z;
    }),
    sorted
  );
}
/**
 * 分批渐进加载所有项目的会话日志，默认每批 50。
 */
//@ chunk-e6aww6q8.js:522159-522662 facade-majority = loadAllProjectsMessageLogsProgressive (0.915)
async function loadAllProjectsMessageLogsProgressive(e, n = DEFAULT_LOG_PAGE_SIZE, r) {
  let projectsDir = getProjectsDir_2(),
    h = isStorageV5Enabled() && r ? await listTranscriptProjectKeys(r) : void 0,
    y;
  if (h !== void 0) y = h.map((q) => join_3(projectsDir, q));
  else if (isDiskless()) return { logs: [], allStatLogs: [], nextIndex: 0 };
  else {
    let q;
    try {
      q = await readdir(projectsDir, { withFileTypes: !0 });
    } catch {
      return { logs: [], allStatLogs: [], nextIndex: 0 };
    }
    y = q.filter((Z) => Z.isDirectory()).map((dirent) => join_3(projectsDir, dirent.name));
  }
  let results = await Promise.all(y.map((dirent) => getSessionFilesLite(dirent, e, void 0, r))),
    sorted = latestLogPerSession(results.flat()),
    { logs: logs, nextIndex: nextIndex } = await enrichLogs(sorted, 0, n, r);
  return (
    sortLogs(logs).forEach((log, Z) => {
      log.value = Z;
    }),
    { logs: logs, allStatLogs: sorted, nextIndex: nextIndex }
  );
}
//@ chunk-e6aww6q8.js:522662-522726 facade-majority = loadMessageLogs (1)
async function loadSameRepoMessageLogs(e, n, r = DEFAULT_LOG_PAGE_SIZE, s) {
  return (await loadSameRepoMessageLogsProgressive(e, n, r, s)).logs;
}
/**
 * 渐进加载同一仓库（含其 worktree）的会话日志。
 */
//@ chunk-e6aww6q8.js:522726-523031 facade-majority = loadSameRepoMessageLogsProgressive (1)
async function loadSameRepoMessageLogsProgressive(e, n, r = DEFAULT_LOG_PAGE_SIZE, s) {
  logForDebugging(`/resume: loading sessions for cwd=${getOriginalCwd()}, worktrees=[${e.join(", ")}]`);
  let h = await getStatOnlyLogsForWorktrees(e, n, s);
  logForDebugging(`/resume: found ${h.length} session files on disk`);
  let { logs: logs, nextIndex: nextIndex } = await enrichLogs(h, 0, r, s);
  return (
    sortLogs(logs).forEach((log, L) => {
      log.value = L;
    }),
    { logs: logs, allStatLogs: h, nextIndex: nextIndex }
  );
}
/**
 * 为各 worktree 对应的项目目录列出会话文件（只 stat 不读内容）。
 */
//@ chunk-e6aww6q8.js:523031-525836 fingerprint = getStatOnlyLogsForWorktrees (0.327)
async function getStatOnlyLogsForWorktrees(e, n, r) {
  let projectsDir = getProjectsDir_2(),
    cwd = getOriginalCwd(),
    y,
    S = (Et) => (y ??= listTranscriptProjectKeys(Et)),
    w = normalizeSlashesForCompare,
    projectDir = w(cwd),
    G = e
      .filter((Et) => {
        let yt = w(Et);
        return projectDir === yt || projectDir.startsWith(yt + "/");
      })
      .sort((Et, yt) => yt.length - Et.length)[0],
    Z = uniq(
      (await Promise.all((G && G !== cwd ? [cwd, G] : [cwd]).map((Et) => readSessionAliases(Et, r)))).flat(),
    ),
    Se =
      Z.length > 0
        ? (await Promise.all(Z.map((Et) => getSessionFilesLite(Et, n, void 0, r))))
            .flat()
            .map((Et) => ({ ...Et, isAlias: !0 }))
        : [];
  if (e.length <= 1) {
    let Et = getProjectDir_2(cwd),
      yt = await getSessionFilesLite(Et, void 0, cwd, r),
      gt =
        UNSAFE_PATH_CHAR_PATTERN.test(cwd) && (await allLogsShareCwd(yt, cwd, r))
          ? await getSessionFilesLite_2(cwd, Et, n, !1, void 0, r, S)
          : [],
      At = G ?? cwd,
      It = !1,
      qt = `${sanitizePath(At)}--claude-worktrees-`,
      Zt = [],
      rn = isStorageV5Enabled() && r ? await S(r) : void 0;
    if (rn !== void 0)
      Zt = (
        await Promise.all(
          rn
            .filter((pn) => pn.startsWith(qt))
            .map((pn) => getSessionFilesLite(join_3(projectsDir, pn), n, void 0, r)),
        )
      ).flat();
    else if (!isDiskless())
      try {
        let pn = await readdir(projectsDir, { withFileTypes: !0 });
        Zt = (
          await Promise.all(
            pn
              .filter((no) => no.isDirectory() && no.name.startsWith(qt))
              .map((no) => getSessionFilesLite(join_3(projectsDir, no.name), n, void 0, r)),
          )
        ).flat();
      } catch (error) {
        logForDebugging(`Failed to sweep .claude/worktrees project dirs under ${projectsDir}: ${error}`);
      }
    if (Se.length > 0 || gt.length > 0 || Zt.length > 0)
      return latestLogPerSession([...yt, ...gt, ...Zt, ...Se]);
    return yt;
  }
  let ke = !1,
    indexed = e.map((wt) => {
      let sanitized = getProjectKey(wt),
        gt = ke ? sanitized.toLowerCase() : sanitized;
      return {
        path: wt,
        exactName: gt,
        truncatedPrefix: sanitized.length > MAX_SANITIZED_LENGTH ? gt.slice(0, MAX_SANITIZED_LENGTH) : void 0,
      };
    });
  indexed.sort((Et, yt) => yt.exactName.length - Et.exactName.length);
  let seenDirs = new Set(),
    Ae,
    Ie = isStorageV5Enabled() && r ? await S(r) : void 0;
  if (Ie !== void 0) Ae = Ie;
  else {
    let Et;
    try {
      if (isDiskless()) throw Error("not read in a diskless session");
      Et = await readdir(projectsDir, { withFileTypes: !0 });
    } catch (error) {
      logForDebugging(
        `Failed to read projects dir ${projectsDir}, falling back to current project: ${error}`,
      );
      let projectDir = getProjectDir_2(getOriginalCwd()),
        At = await getSessionFilesLite(projectDir, n, getOriginalCwd(), r);
      return Se.length > 0 ? latestLogPerSession(At.concat(Se)) : At;
    }
    Ae = Et.filter((yt) => yt.isDirectory()).map((yt) => yt.name);
  }
  let Me = G === void 0 ? [cwd, ...e] : e,
    We = [];
  if (G === void 0) {
    let Et = getProjectDir_2(cwd),
      yt = basename_2(Et);
    (seenDirs.add(ke ? yt.toLowerCase() : yt), We.push({ projectDir: Et, wtPath: cwd }));
  }
  for (let dirent of Ae) {
    let yt = ke ? dirent.toLowerCase() : dirent;
    if (seenDirs.has(yt)) continue;
    for (let { path: wtPath, exactName: exactName, truncatedPrefix: truncatedPrefix } of indexed)
      if (
        yt === exactName ||
        (truncatedPrefix !== void 0
          ? yt.startsWith(truncatedPrefix + "-") &&
            (await dirBelongsToProject(
              join_3(projectsDir, dirent),
              wtPath,
              ke,
              wrapStorageSource(getTranscriptStorageContext(r)),
            ))
          : exactName.length < MAX_SANITIZED_LENGTH && yt.startsWith(exactName + "-"))
      ) {
        (seenDirs.add(yt), We.push({ projectDir: join_3(projectsDir, dirent), wtPath: wtPath }));
        break;
      }
  }
  let results = await Promise.all(
      We.map(({ projectDir: projectDir, wtPath: wtPath }) =>
        getSessionFilesLite(projectDir, void 0, wtPath, r, Me),
      ),
    ),
    lt = new Map();
  for (let Et = 0; Et < We.length; Et++) {
    let wtPath = We[Et].wtPath,
      gt = lt.get(wtPath) ?? [];
    (gt.push(...results[Et]), lt.set(wtPath, gt));
  }
  let Je = [];
  for (let Et of Me)
    if (UNSAFE_PATH_CHAR_PATTERN.test(Et) && (await allLogsShareCwd(lt.get(Et) ?? [], Et, r, Me)))
      Je.push(Et);
  let nt = Je.length > 0 ? await listProjectDirs(r, S) : [],
    results_2 = await Promise.all(
      Je.map(async (Et) => {
        let yt = Et;
        try {
          if (isStorageV5Enabled() && r !== void 0) {
            let gt = await makeWorkspaceRealPath(r)(Et);
            if (gt.ok && gt.value.found) yt = Mn(gt.value.path);
            else if (!gt.ok)
              logForDebugging(
                `/resume: worktree path not resolved through the storage backend (${formatStorageError(gt.error)}); using it as registered`,
              );
          } else yt = Mn(await realpath(Et));
        } catch {}
        return getSessionFilesLite_2(yt, getProjectDir_2(Et), n, !0, nt, r);
      }),
    );
  return latestLogPerSession(results.flat().concat(results_2.flat(), Se));
}
//@ chunk-e6aww6q8.js:525836-525869 layout
function normalizeSlashesForCompare(e) {
  return normalizePathForCwdCompare(e, !1);
}
//@ chunk-e6aww6q8.js:525869-525897 layout
var UNSAFE_PATH_CHAR_PATTERN = /[^a-zA-Z0-9/\\:-]/;
//@ chunk-e6aww6q8.js:525897-526006 layout
async function allLogsShareCwd(e, n, r, s) {
  let alloc = Buffer.alloc(LITE_READ_BUF_SIZE);
  for (let y of e) if (!(await logCwdMatches(y, n, alloc, r, s))) return !1;
  return !0;
}
//@ chunk-e6aww6q8.js:526006-526222 layout
async function logCwdMatches(e, n, r, s, h) {
  if (!e.fullPath) return !1;
  let y = await readLiteMetadata(e.fullPath, e.fileSize ?? 0, r, s),
    S = y.relocatedCwd ?? y.headCwdStrict;
  if (S === void 0) return !1;
  if (recordedCwdIsWithinOwnWorktrees(S, h, slugCollisionGuardFoldsCase())) return !1;
  return recordedCwdCollidesWithProjectResolved(
    S,
    n,
    slugCollisionGuardFoldsCase(),
    hasUntouchableRecordSpellingAsync,
    getRealPathOptions(s),
  );
}
//@ chunk-e6aww6q8.js:526222-526233 layout
var PROJECT_SCAN_CONCURRENCY = 32;
//@ chunk-e6aww6q8.js:526233-526820 layout
async function listProjectDirs(e, n) {
  let r = getProjectsDir_2(),
    s,
    h = isStorageV5Enabled() && e ? await (n ?? listTranscriptProjectKeys)(e) : void 0;
  if (h !== void 0) s = h;
  else if (isDiskless()) return [];
  else {
    let w;
    try {
      w = await readdir(r, { withFileTypes: !0 });
    } catch {
      return [];
    }
    s = w.filter((L) => L.isDirectory()).map((L) => L.name);
  }
  let y = limitConcurrency(PROJECT_SCAN_CONCURRENCY, async (w) => {
    let L = join_3(r, w),
      q = [...(await getSessionFilesWithMtime(L, e)).values()].sort((Se, ke) => ke.mtime - Se.mtime)[0];
    if (!q) return null;
    let allocUnsafe = Buffer.allocUnsafe(LITE_READ_BUF_SIZE);
    try {
      let Se = await readLiteMetadata(q.path, q.size, allocUnsafe, e),
        ke = Se.relocatedCwd ?? Se.headCwdStrict;
      if (ke) return { projectDir: L, recordedCwd: normalizeSlashesForCompare(ke) };
    } catch {}
    return null;
  });
  return (await Promise.all(s.map((w) => y(w)))).filter((w) => w !== null);
}
/**
 * 读取会话文件头尾得到 lite 日志（首条提示、标题、分支、cwd 等），不解析整份文件。
 */
//@ chunk-e6aww6q8.js:526820-527428 layout = getSessionFilesLite (0.917)
async function getSessionFilesLite_2(e, n, r, s = !1, h, y, S) {
  let w = h ?? (await listProjectDirs(y, S)),
    L = normalizeSlashesForCompare(e),
    G = [];
  for (let { projectDir: projectDir, recordedCwd: recordedCwd } of w) {
    if (projectDir === n) continue;
    if (recordedCwd !== L && !(s && recordedCwd.startsWith(L + "/"))) continue;
    let entries = [...(await getSessionFilesWithMtime(projectDir, y)).entries()].sort(
      (Ee, Ae) => Ae[1].mtime - Ee[1].mtime,
    );
    if (r && entries.length > r) entries = entries.slice(0, r);
    for (let [Ee, Ae] of entries)
      G.push({
        date: new Date(Ae.mtime).toISOString(),
        messages: [],
        isLite: !0,
        fullPath: Ae.path,
        value: 0,
        created: new Date(Ae.ctime),
        modified: new Date(Ae.mtime),
        firstPrompt: "",
        messageCount: 0,
        fileSize: Ae.size,
        isSidechain: !1,
        sessionId: Ee,
        projectPath: e,
      });
  }
  let sorted = sortLogs(G);
  return (
    sorted.forEach((log, Se) => {
      log.value = Se;
    }),
    sorted
  );
}
//@ chunk-e6aww6q8.js:527428-527441 facade-majority
var QUEUED_ROWS_WAIT_MS = 2000;
//@ chunk-e6aww6q8.js:527441-527861 layout
function drainQueuedAgentRows(e, n) {
  let { project: project, writerHealth: writerHealth } = su(),
    startTime = performance.now(),
    failureSeq = writerHealth.failureSeq;
  return e
    .reduce(
      (w, L) => w ?? project?.drainQueuedRows(getAgentTranscriptPath(L), QUEUED_ROWS_WAIT_MS, n),
      void 0,
    )
    ?.then((w) => {
      let rounded = Math.round(performance.now() - startTime);
      if (w === "timed_out") logFeatureSad("transcript_queued_agent_rows", "timed_out", { wait_ms: rounded });
      else if (writerHealth.failureSeq !== failureSeq)
        logFeatureSad("transcript_queued_agent_rows", "write_failed", { wait_ms: rounded });
      else logFeatureOk("transcript_queued_agent_rows", { wait_ms: rounded });
    });
}
/**
 * 读取子代理转录，校验路径在项目目录内，返回消息与状态。
 */
//@ chunk-e6aww6q8.js:527861-528776 facade-majority
async function getAgentTranscript(e, n, r) {
  let s = r?.alreadyWaited ? void 0 : drainQueuedAgentRows([e], r?.signal);
  if (s !== void 0) await s;
  let h = await getAgentTranscript_2(e, n),
    y = getProject();
  if (h.transcript) {
    if (r?.trustLocal || !y.mustVerifyAgentTranscript(e)) return h.transcript;
    let hydrateAgentTranscriptOnDemand = await y.hydrateAgentTranscriptOnDemand(e, n, r?.signal, !0);
    if (hydrateAgentTranscriptOnDemand !== "hit") return h.transcript;
    let q = await getAgentTranscript_2(e, n);
    if (!q.transcript)
      logForDiagnosticsNoPII("warn", "agent_transcript_unresumable", {
        reason: q.miss,
        fetch: hydrateAgentTranscriptOnDemand,
      });
    return q.transcript;
  }
  if (!y.hasInternalAgentEventReader()) return null;
  let S =
      h.miss === "absent" ||
      h.miss === "inaccessible" ||
      (h.miss !== "load_threw" &&
        !h.hasContent &&
        !(await transcriptFileHasContentEntry(getAgentTranscriptPath(e), n))),
    w = "skipped",
    miss = h.miss;
  if (S) {
    try {
      w = await y.hydrateAgentTranscriptOnDemand(e, n, r?.signal);
    } catch (error) {
      if (!(error instanceof AgentTranscriptFetchError) || !y.hasWrittenAgentLocally(e)) throw error;
      w = error.outcome;
    }
    if (w !== "unsafe_id") {
      let G = await getAgentTranscript_2(e, n);
      if (G.transcript) return G.transcript;
      miss = G.miss;
    }
  }
  return (logForDiagnosticsNoPII("warn", "agent_transcript_unresumable", { reason: miss, fetch: w }), null);
}
//@ chunk-e6aww6q8.js:528776-530489 callgraph-fingerprint = getAgentTranscript (0.182)
async function getAgentTranscript_2(e, n) {
  let r = !1,
    s = (w) => ({ transcript: null, miss: w, hasContent: r }),
    agentFile = getAgentTranscriptPath(e),
    y = n === void 0 ? void 0 : transcriptStorageKeyForPath(agentFile),
    S =
      !isStorageV5Enabled() || n === void 0 || y === void 0 ? void 0 : { storageV5: { backend: n, key: y } };
  if (isStorageV5Enabled() && n !== void 0 && S === void 0)
    logForDebugging(
      "getAgentTranscript: agent transcript path is outside the storage keyspace; reading it raw",
    );
  try {
    let w = await loadTranscriptFile(agentFile, S);
    if (w.servedBy === "absent")
      return (
        logForDebugging("getAgentTranscript: the storage backend does not hold this agent transcript"),
        s("absent")
      );
    if (w.servedBy === "inaccessible")
      return (
        logForDebugging(
          "getAgentTranscript: the storage backend cannot serve this agent transcript (permission); not resumable",
        ),
        s("inaccessible")
      );
    let {
      messages: messages,
      agentContentReplacements: agentContentReplacements,
      forkContextRefs: forkContextRefs,
    } = w;
    for (let We of messages.values())
      if (isConversationEntry(We)) {
        r = !0;
        break;
      }
    let agentMessages = Array.from(messages.values()).filter((msg) => msg.agentId === e && msg.isSidechain);
    if (agentMessages.length === 0)
      return s(w.servedBy === void 0 && messages.size === 0 ? "absent" : "no_agent_messages");
    let parentUuids = new Set(agentMessages.map((msg) => msg.parentUuid)),
      leafMessage = findLatestMessage(
        agentMessages,
        (msg) =>
          !parentUuids.has(msg.uuid) &&
          !(msg.type === "system" && "subtype" in msg && msg.subtype === "compact_boundary"),
      );
    if (!leafMessage) return s("no_leaf");
    let mapped = buildConversationChain(messages, leafMessage)
        .filter((We) => We.agentId === e)
        .map(({ isSidechain: isSidechain, parentUuid: parentUuid, promptId: promptId, ...Je }) =>
          withoutTaskProducerMark(Je),
        ),
      Ie = forkContextRefs.get(e);
    return {
      transcript: {
        messages: Ie === void 0 ? mapped : (await hydrateForkContext(Ie, void 0, n)).concat(mapped),
        contentReplacements: agentContentReplacements.get(e) ?? [],
      },
    };
  } catch (error) {
    if (S !== void 0) {
      let L =
        error instanceof Error && typeof error.cause === "object" && error.cause !== null ? error.cause : {};
      logForDebugging(
        L.failureClass === void 0
          ? "getAgentTranscript: cannot resume this agent transcript flag-on (thrown while loading)"
          : `getAgentTranscript: the storage backend cannot serve this agent transcript (${[L.failureClass, L.telemetryCode].filter((msg) => msg !== void 0).join("/")}); not resumable`,
      );
    }
    return s("load_threw");
  }
}
//@ chunk-e6aww6q8.js:530489-530758 facade-majority = extractAgentIdsFromMessages (1)
function extractAgentIdsFromMessages(messages) {
  let agentIds = [];
  for (let message of messages)
    if (
      message.type === "progress" &&
      message.data &&
      typeof message.data === "object" &&
      "type" in message.data &&
      (message.data.type === "agent_progress" || message.data.type === "skill_progress") &&
      "agentId" in message.data &&
      typeof message.data.agentId === "string"
    )
      agentIds.push(message.data.agentId);
  return uniq(agentIds);
}
//@ chunk-e6aww6q8.js:530758-531129 facade-majority
async function loadSubagentTranscripts(e, n) {
  let filtered = e.filter(G$),
    s = drainQueuedAgentRows(filtered.map(Mr));
  if (s !== void 0) await s;
  let results = await Promise.all(
    filtered.map(async (y) => {
      try {
        let S = await getAgentTranscript(Mr(y), n, { alreadyWaited: !0, trustLocal: !0 });
        if (S && S.messages.length > 0) return { agentId: y, transcript: S.messages };
        return null;
      } catch {
        return null;
      }
    }),
  );
  return Object.fromEntries(results.filter((y) => y !== null).map((y) => [y.agentId, y.transcript]));
}
//@ chunk-e6aww6q8.js:531129-531201 facade-majority
async function loadAllSubagentTranscriptsFromDisk(e) {
  return loadSubagentTranscripts(
    await listSubagentIdsFromDisk(isStorageV5Enabled() && e !== void 0 ? e : void 0),
    e,
  );
}
//@ chunk-e6aww6q8.js:531201-531221 layout
var EMPTY_SET = new Set([]);
//@ chunk-e6aww6q8.js:531221-531304 callgraph-fingerprint = isTranscriptMessage (0.461)
function isTranscriptMessage_2(entry) {
  return entry.type === "attachment" && entry.attachment?.type === "fork_briefing";
}
/**
 * 该消息是否应写入转录（过滤 progress、部分 attachment 与 hook 系统消息）。
 */
//@ chunk-e6aww6q8.js:531304-531699 facade-majority = isLoggableMessage (0.611)
function isLoggableMessage(m) {
  if (m.type === "progress") return !1;
  if (
    m.type === "attachment" &&
    m.attachment.type === "hook_success" &&
    !m.attachment.content &&
    !m.attachment.stdout?.trim() &&
    !m.attachment.stderr?.trim()
  )
    return !1;
  if (m.type === "attachment" && getUserType() !== "ant" && EMPTY_SET.has(m.attachment.type)) return !1;
  if (isLaptopMemoryAttachment(m) && m.attachment.content !== null) return !1;
  if (m.type === "system" && "persist" in m && m.persist === !1) return !1;
  return !0;
}
//@ chunk-e6aww6q8.js:531699-531886 facade-majority = countToolCallsSince (1)
function collectReplIds(messages, sinceUuid = new Set()) {
  for (let message of messages)
    if (message.type === "assistant" && Array.isArray(message.message.content)) {
      for (let s of message.message.content) if (s.type === "tool_use" && S4(s.name)) sinceUuid.add(s.id);
    }
  return sinceUuid;
}
//@ chunk-e6aww6q8.js:531886-533052 fingerprint = transformMessagesForExternalTranscript (0.544)
function transformMessagesForExternalTranscript(messages, replIds) {
  let r = new Set();
  if (messages.some((s) => s.type === "assistant" && s.resumedFromIncompleteThinking === !0))
    for (let { fromIdx: fromIdx, toIdx: toIdx } of findResumedThinkingRanges(messages))
      for (let y = fromIdx; y <= toIdx; y++) r.add(y);
  return messages.flatMap((s, h) => {
    if (s.type === "assistant" && Array.isArray(s.message.content)) {
      let content = s.message.content,
        w = content.some((L) => L.type === "tool_use" && S4(L.name))
          ? content.filter((L) => !(L.type === "tool_use" && S4(L.name)))
          : content;
      if (w.length === 0) return [];
      if (s.isVirtual && !r.has(h) && s.virtualInResumeRun !== !0) {
        let { isVirtual: isVirtual, ...G } = s;
        return [{ ...G, message: { ...s.message, content: w } }];
      }
      if (w !== content) return [{ ...s, message: { ...s.message, content: w } }];
      return [s];
    }
    if (s.type === "user" && Array.isArray(s.message.content)) {
      let content = s.message.content,
        w = content.some((L) => L.type === "tool_result" && replIds.has(L.tool_use_id))
          ? content.filter((L) => !(L.type === "tool_result" && replIds.has(L.tool_use_id)))
          : content;
      if (w.length === 0) return [];
      if (s.isVirtual && !r.has(h) && s.virtualInResumeRun !== !0) {
        let { isVirtual: isVirtual, ...G } = s;
        return [{ ...G, message: { ...s.message, content: w } }];
      }
      if (w !== content) return [{ ...s, message: { ...s.message, content: w } }];
      return [s];
    }
    if (
      "isVirtual" in s &&
      s.isVirtual &&
      !r.has(h) &&
      ("virtualInResumeRun" in s ? s.virtualInResumeRun !== !0 : !0)
    ) {
      let { isVirtual: isVirtual, ...S } = s;
      return [S];
    }
    return [s];
  });
}
//@ chunk-e6aww6q8.js:533052-533264 facade-majority = loadMessagesFromJsonlPath (0.447)
function toTranscriptEntries(e, n) {
  let tip = null;
  return cleanMessagesForLogging(e.slice()).map((s) => {
    let h = {
      ...s,
      cwd: gl() ?? void 0,
      userType: getUserType(),
      sessionId: n,
      timestamp: s.timestamp,
      version: TOt(s),
      parentUuid: tip,
      isSidechain: !1,
    };
    if (isChainParticipant(s)) tip = s.uuid;
    return h;
  });
}
//@ chunk-e6aww6q8.js:533264-533420 facade-majority = cleanMessagesForLogging (1)
function cleanMessagesForLogging(messages, allMessages = messages) {
  let mapped = messages.filter(isLoggableMessage).map((h) => resolveMessageAlias(h));
  if (getUserType() === "ant") return mapped;
  let s =
    allMessages instanceof Set
      ? allMessages
      : typeof allMessages === "function"
        ? allMessages()
        : collectReplIds(allMessages);
  return transformMessagesForExternalTranscript(mapped, s);
}
//@ chunk-e6aww6q8.js:533420-533481 facade-majority
async function getLogByIndex(e, n) {
  return (await loadMessageLogs(void 0, n))[e] || null;
}
//@ chunk-e6aww6q8.js:533481-533530 facade-majority
function findUnresolvedToolUseInTranscript(e, n) {
  return findUnresolvedToolUsesInTranscript(e, [n]).get(n) ?? null;
}
//@ chunk-e6aww6q8.js:533530-533936 facade-majority = countToolCallsSince (1)
function findUnresolvedToolUsesInTranscript(messages, sinceUuid) {
  let r = new Set(sinceUuid),
    s = new Map();
  for (let h of messages)
    if (h.type === "assistant") {
      let content = h.message.content;
      if (Array.isArray(content)) {
        for (let message of content)
          if (message.type === "tool_use" && r.has(message.id)) s.set(message.id, h);
      }
    } else if (h.type === "user") {
      if (isShutdownInterrupted(h)) continue;
      let content = h.message.content;
      if (Array.isArray(content)) {
        for (let S of content)
          if (S.type === "tool_result" && r.has(S.tool_use_id))
            (r.delete(S.tool_use_id), s.delete(S.tool_use_id));
      }
    }
  return s;
}
//@ chunk-e6aww6q8.js:533936-533998 facade-majority
async function findUnresolvedToolUse(e, n) {
  return (await findUnresolvedToolUses([e], n)).get(e) ?? null;
}
//@ chunk-e6aww6q8.js:533998-534092 facade-majority
async function findUnresolvedToolUses(e, n) {
  if (e.length === 0) return new Map();
  return (await findUnresolvedToolUsesInTranscript_2(e, n))?.found ?? new Map();
}
//@ chunk-e6aww6q8.js:534092-534426 facade-majority
async function findUnresolvedToolUseMessageRows(e, n) {
  let r = await findUnresolvedToolUsesInTranscript_2([e], n),
    s = r?.found.get(e);
  if (r === null || s === void 0) return null;
  try {
    return { holder: s, messageRows: assistantMessageRowsInTranscript(r.messages, s) };
  } catch (error) {
    return (
      logForDebugging(
        `findUnresolvedToolUseMessageRows: could not group the rows of tool_use ${e}'s message, restoring the call alone: ${error}`,
        { level: "warn" },
      ),
      { holder: s, messageRows: [s] }
    );
  }
}
//@ chunk-e6aww6q8.js:534426-535060 facade-majority
function assistantMessageRowsInTranscript(e, n) {
  let id = n.message.id,
    s = e.get(n.uuid);
  if (!id || s === void 0) return [n];
  let h = new Set([s]);
  for (let L = s.parentUuid && e.get(s.parentUuid); L && !h.has(L); L = L.parentUuid && e.get(L.parentUuid))
    if ((h.add(L), !isAssistantWithMessageId(L, id) && isUserOrAssistant(L))) break;
  let y = new Map();
  for (let L of e.values())
    if (L.parentUuid) {
      let G = y.get(L.parentUuid);
      if (G) G.push(L);
      else y.set(L.parentUuid, [L]);
    }
  let S = [s];
  while (S.length > 0) {
    let L = [];
    for (let G of S)
      for (let q of y.get(G.uuid) ?? []) {
        if (h.has(q)) continue;
        if ((h.add(q), isAssistantWithMessageId(q, id) || !isUserOrAssistant(q))) L.push(q);
      }
    S = L;
  }
  let w = [];
  for (let L of e.values())
    if (
      L.type === "assistant" &&
      L.message.id === id &&
      (h.has(L) || (L.uuid !== n.uuid && getAssistantToolUseIds(L)))
    )
      w.push(L);
  return w;
}
//@ chunk-e6aww6q8.js:535060-535166 layout = countToolCallsSince (1)
function getAssistantToolUseIds(e) {
  return Array.isArray(e.message.content) && e.message.content.some((block) => block.type === "tool_use");
}
//@ chunk-e6aww6q8.js:535166-535230 layout
function isAssistantWithMessageId(e, n) {
  return e.type === "assistant" && e.message.id === n;
}
//@ chunk-e6aww6q8.js:535230-535291 layout
function isUserOrAssistant(e) {
  return e.type === "user" || e.type === "assistant";
}
/**
 * 读取当前转录并找出给定 tool_use id 中尚未有结果的那些，未找到的记调试日志；读取失败返回 null。
 */
//@ chunk-e6aww6q8.js:535291-535795 layout
async function findUnresolvedToolUsesInTranscript_2(e, n) {
  let transcriptPath;
  try {
    transcriptPath = getTranscriptPath();
    let s = getTranscriptStorageKey(transcriptPath, n),
      { messages: messages } = await loadTranscriptFile(transcriptPath, s && { storageV5: s }),
      found = findUnresolvedToolUsesInTranscript(messages.values(), e),
      filtered = e.filter((w) => !found.has(w));
    if (filtered.length > 0)
      logForDebugging(
        `findUnresolvedToolUse: no unresolved tool_use ${filtered.join(", ")} \u2014 not found in transcript or already resolved by a tool_result (${transcriptPath}, ${messages.size} messages)`,
        { level: "warn" },
      );
    return { found: found, messages: messages };
  } catch (error) {
    return (
      logForDebugging(
        `findUnresolvedToolUse: failed to read transcript${transcriptPath ? ` ${transcriptPath}` : ""} for tool_use ${e.join(", ")}: ${error}`,
        { level: "warn" },
      ),
      null
    );
  }
}
//@ chunk-e6aww6q8.js:535795-536485 facade-majority
async function findDeferredToolMarkerInTranscript(e, n) {
  try {
    let r =
      !isStorageV5Enabled() || n === void 0
        ? void 0
        : await readTranscriptTailViaStorage(e, 1048576, n).catch(() => {
            return;
          });
    if (r === null) return null;
    let s;
    if (r !== void 0) {
      if (
        ((s = r.content.split(`
`)),
        r.cut)
      )
        s.shift();
    } else {
      let w = yH(e);
      if (w === void 0) return null;
      let { content: content, bytesRead: bytesRead, bytesTotal: bytesTotal } = await tailFile(w, 1048576);
      if (
        ((s = content.split(`
`)),
        bytesRead < bytesTotal)
      )
        s.shift();
    }
    let h = null,
      y = -1;
    for (let w = s.length - 1; w >= 0; w--) {
      let trimmed = s[w].trim();
      if (!trimmed.includes('"hook_deferred_tool"')) continue;
      let G = jsonParse(trimmed);
      if (G?.type === "attachment" && G.attachment?.type === "hook_deferred_tool") {
        ((h = G.attachment), (y = w));
        break;
      }
    }
    if (!h) return null;
    let S = `"tool_use_id":"${h.toolUseID}"`;
    for (let w = y + 1; w < s.length; w++) if (s[w].includes(S)) return null;
    return h;
  } catch {
    return null;
  }
}
//@ chunk-e6aww6q8.js:536485-537059 layout
async function listSessionFilesViaStorage(e, n) {
  let r = new Map();
  try {
    return (
      await readAllPages(
        (h) =>
          e.listEntries(
            { namespace: "transcript", projectKey: n },
            { skipScopeStats: !0, ...(h !== void 0 && { cursor: h }) },
          ),
        (h) => {
          for (let y of h) {
            if (
              y.kind !== "key" ||
              y.key.namespace !== "transcript" ||
              y.key.projectKey !== n ||
              y.key.agentId !== void 0 ||
              y.key.agentRelPath !== void 0 ||
              y.mtimeMs === void 0
            )
              continue;
            let S = Vt(y.key.sessionId);
            if (S === null || r.has(S)) continue;
            let w = e0(STORAGE_SPACES.transcript(n, S));
            if (w === void 0) continue;
            r.set(S, { key: w, mtimeMs: y.mtimeMs, createdMs: y.createdMs, size: y.size });
          }
        },
        { maxPages: LOG_LIST_CONCURRENCY },
      )
    ).status === "done"
      ? r
      : void 0;
  } catch {
    return;
  }
}
//@ chunk-e6aww6q8.js:537059-537303 layout
async function getSessionFilesViaStorage(e, n) {
  let r = basename_2(e);
  if (dirname(e) !== getProjectsDir_2() || !isValidKeySegment(r)) return;
  let s = await listSessionFilesViaStorage(n, r);
  if (s === void 0) return;
  let h = new Map();
  for (let [y, S] of s)
    h.set(y, {
      path: join_3(e, `${y}.jsonl`),
      mtime: S.mtimeMs,
      ctime: S.createdMs ?? S.mtimeMs,
      size: S.size ?? 0,
    });
  return h;
}
/**
 * 列出项目目录中的 .jsonl 会话文件及 mtime。
 */
//@ chunk-e6aww6q8.js:537303-537861 facade-majority = getSessionFilesWithMtime (1)
async function getSessionFilesWithMtime(e, n) {
  let r = isStorageV5Enabled() && n ? await getSessionFilesViaStorage(e, n) : void 0;
  if (r !== void 0) return r;
  if (isDiskless()) return new Map();
  let sessionFilesMap = new Map(),
    dirents;
  try {
    dirents = await readdir(e, { withFileTypes: !0 });
  } catch {
    return sessionFilesMap;
  }
  let candidates = [];
  for (let dirent of dirents) {
    if (!dirent.isFile() || !dirent.name.endsWith(".jsonl")) continue;
    let sessionId = Vt(basename_2(dirent.name, ".jsonl"));
    if (!sessionId) continue;
    candidates.push({ sessionId: sessionId, filePath: join_3(e, dirent.name) });
  }
  return (
    await Promise.all(
      candidates.map(async ({ sessionId: sessionId, filePath: filePath }) => {
        try {
          let st = await stat(filePath);
          sessionFilesMap.set(sessionId, {
            path: filePath,
            mtime: st.mtime.getTime(),
            ctime: st.birthtime.getTime(),
            size: st.size,
          });
        } catch {
          logForDebugging(`Failed to stat session file: ${filePath}`);
        }
      }),
    ),
    sessionFilesMap
  );
}
//@ chunk-e6aww6q8.js:537861-537872 layout
var DEFAULT_LOG_PAGE_SIZE = 50;
//@ chunk-e6aww6q8.js:537872-539365 facade-majority = loadAllLogsFromSessionFile (0.77)
async function loadAllLogsFromSessionFile(e, n, r) {
  let {
    messages: messages,
    summaries: summaries,
    customTitles: customTitles,
    endedSessions: endedSessions,
    aiTitles: aiTitles,
    tags: tags,
    relocatedCwds: relocatedCwds,
    agentNames: agentNames,
    agentColors: agentColors,
    agentSettings: agentSettings,
    prNumbers: prNumbers,
    prUrls: prUrls,
    prRepositories: prRepositories,
    modes: modes,
    permissionModes: permissionModes,
    isolationLatches: isolationLatches,
    devModsFolders: devModsFolders,
    memoryModeStamps: memoryModeStamps,
    atisLatches: atisLatches,
    toolsUsedLists: toolsUsedLists,
    fileHistorySnapshots: fileHistorySnapshots,
    fileHistoryDeltas: fileHistoryDeltas,
    attributionSnapshots: attributionSnapshots,
    contentReplacements: contentReplacements,
    leafUuids: leafUuids,
  } = await loadTranscriptFile(
    e,
    isStorageV5Enabled() && r ? { keepAllLeaves: !0, storageV5: r } : { keepAllLeaves: !0 },
  );
  if (messages.size === 0) return [];
  let At = [];
  for (let msg of messages.values()) if (leafUuids.has(msg.uuid)) At.push(msg);
  let It = groupNonChainChildrenByParent(messages),
    Yt = [];
  for (let leafMessage of At) {
    let Zt = buildConversationChain(messages, leafMessage, It);
    if (Zt.length === 0) continue;
    let firstMessage = Zt[0],
      sessionId = leafMessage.sessionId;
    Yt.push({
      date: leafMessage.timestamp,
      messages: removeExtraFields(Zt),
      fullPath: e,
      value: 0,
      created: new Date(firstMessage.timestamp),
      modified: new Date(leafMessage.timestamp),
      ...getFirstPromptInfo(Zt),
      messageCount: countVisibleMessages(Zt),
      isSidechain: firstMessage.isSidechain ?? !1,
      sessionId: sessionId,
      leafUuid: leafMessage.uuid,
      summary: summaries.get(leafMessage.uuid),
      customTitle: customTitles.get(sessionId),
      ...withEndedByModel({}, endedSessions.has(sessionId)),
      aiTitle: aiTitles.get(sessionId),
      tag: tags.get(sessionId),
      relocatedCwd: relocatedCwds.get(sessionId),
      agentName: agentNames.get(sessionId),
      agentColor: agentColors.get(sessionId),
      agentSetting: agentSettings.get(sessionId),
      mode: modes.get(sessionId),
      permissionMode: permissionModes.get(sessionId),
      isolationLatch: isolationLatches.get(sessionId),
      devModsFolder: devModsFolders?.get(sessionId),
      memoryModeStamps: memoryModeStamps.get(sessionId) ?? [],
      atisLatch: getOrEmptyString(atisLatches, sessionId),
      toolsUsed: toolsUsedLists?.get(sessionId),
      prNumber: prNumbers.get(sessionId),
      prUrl: prUrls.get(sessionId),
      prRepository: prRepositories.get(sessionId),
      gitBranch: leafMessage.gitBranch,
      projectPath: n ?? firstMessage.cwd,
      fileHistorySnapshots: buildFileHistorySnapshots(fileHistorySnapshots, fileHistoryDeltas, Zt),
      attributionSnapshots: buildAttributionSnapshotChain(attributionSnapshots, Zt),
      contentReplacements: contentReplacements.get(sessionId) ?? [],
    });
  }
  return Yt;
}
//@ chunk-e6aww6q8.js:539365-539514 layout
async function getSessionFileEntriesViaStorage(e, n, r) {
  let s = await listSessionFilesViaStorage(n, r);
  return s === void 0
    ? void 0
    : Array.from(s, ([h, y]) => ({ path: join_3(e, `${h}.jsonl`), mtime: y.mtimeMs, key: y.key }));
}
//@ chunk-e6aww6q8.js:539514-540131 fingerprint = getLogsWithoutIndex (0.804)
async function getLogsWithoutIndex(e, n, r) {
  if (isStorageV5Enabled() && r) {
    let { backend: backend, projectKey: projectKey } = r,
      L = await getSessionFileEntriesViaStorage(e, backend, projectKey);
    if (L !== void 0) {
      if (L.length === 0) return [];
      let G = n && L.length > n ? [...L].sort((Z, Se) => Se.mtime - Z.mtime).slice(0, n) : L,
        q = [];
      for (let Z of G)
        try {
          let Se = await loadAllLogsFromSessionFile(Z.path, void 0, { backend: backend, key: Z.key });
          q.push(...Se);
        } catch {
          logForDebugging(`Failed to load session file: ${Z.path}`);
        }
      return q;
    }
  }
  let sessionFilesMap = await getSessionFilesWithMtime(e);
  if (sessionFilesMap.size === 0) return [];
  let filesToProcess;
  if (n && sessionFilesMap.size > n)
    filesToProcess = [...sessionFilesMap.values()].sort((S, w) => w.mtime - S.mtime).slice(0, n);
  else filesToProcess = [...sessionFilesMap.values()];
  let y = [];
  for (let fileInfo of filesToProcess)
    try {
      let fileLogOptions = await loadAllLogsFromSessionFile(fileInfo.path);
      y.push(...fileLogOptions);
    } catch {
      logForDebugging(`Failed to load session file: ${fileInfo.path}`);
    }
  return y;
}
/**
 * 从文件头尾字节中抽取 lite 元数据：isSidechain、teamName、cwd、首条提示、custom-title、tag 等。
 */
//@ chunk-e6aww6q8.js:540131-541827 fingerprint = readLiteMetadata (0.723)
async function readLiteMetadata(e, n, r, s) {
  let h = getTranscriptStorageKey(e, s),
    { head: head, tail: tail } =
      h === void 0 && isDiskless()
        ? { head: "", tail: "" }
        : await readHeadAndTail_2(e, n, r, wrapStorageSource(h));
  if (!head) return { firstPrompt: "", isSidechain: !1, bookkeepingOnly: !1 };
  let w = head.includes('"isSidechain":true') || head.includes('"isSidechain": true'),
    projectPath = extractJsonStringField(head, "cwd"),
    G = extractFieldFromFirstEntryStrict(head, "cwd"),
    teamName = extractJsonStringField(head, "teamName"),
    Z =
      head
        .split(
          `
`,
        )
        .find((hn) => hn.includes('"parentUuid":')) ?? head,
    Se = extractJsonStringField(Z, "sessionKind"),
    ke = Se === "bg" || Se === "daemon" || Se === "daemon-worker" ? Se : void 0,
    agentSetting = extractJsonStringField(head, "agentSetting"),
    Ee = extractJsonStringField(head, "entrypoint") ?? extractLastJsonStringField(tail, "entrypoint"),
    Ae = isLoopCommandSession(head),
    Ie = !(await transcriptMayContainMarker(e, head, tail, n, s)),
    Me = extractLastJsonStringField(tail, "lastPrompt"),
    We =
      Me ||
      extractFirstPromptFromChunk(head, "stored") ||
      (tail === head ? "" : extractFirstPromptFromChunk(tail, "stored")) ||
      "",
    found = [
      ...(Me && tail.includes('"pluginPrompt"')
        ? tail
            .split(
              `
`,
            )
            .filter((hn) => hn.includes('"pluginPrompt"'))
            .reverse()
        : []),
      head.includes('"pluginPrompt"') ? head : "",
    ].find((hn) => hn !== "" && extractFirstPromptFromChunk(hn, "stored") === We),
    lt = found === void 0 ? We : extractFirstPromptFromChunk(found, "shown"),
    Je = extractLastJsonStringField(tail, "customTitle"),
    nt = Je ?? extractLastJsonStringField(head, "customTitle"),
    pt = extractLastJsonStringField(tail, "aiTitle") ?? extractLastJsonStringField(head, "aiTitle"),
    Et = findLastFieldInType(tail, "summary", "summary"),
    tag = extractLastJsonStringField(tail, "tag"),
    gt = extractFieldFromLastEntryOfTypeStrict(tail, "relocated", "relocatedCwd"),
    At = extractLastJsonStringField(tail, "gitBranch") ?? extractJsonStringField(head, "gitBranch"),
    prUrl = extractLastJsonStringField(tail, "prUrl"),
    prRepository = extractLastJsonStringField(tail, "prRepository"),
    prNumber,
    prNumStr = extractLastJsonStringField(tail, "prNumber");
  if (prNumStr) prNumber = parseInt(prNumStr, 10) || void 0;
  if (!prNumber) {
    let prNumMatch = tail.lastIndexOf('"prNumber":');
    if (prNumMatch >= 0) {
      let afterColon = tail.slice(prNumMatch + 11, prNumMatch + 25),
        num = parseInt(afterColon.trim(), 10);
      if (num > 0) prNumber = num;
    }
  }
  let rn = countFrameLinks(tail),
    pn = findLastMessageTimestamp(tail),
    no = findContinuedInSessionId(tail);
  return {
    firstPrompt: We,
    ...(lt !== We && { firstPromptShown: lt }),
    gitBranch: At,
    isSidechain: w,
    projectPath: projectPath,
    headCwdStrict: G,
    relocatedCwd: gt,
    teamName: teamName,
    sessionKind: ke,
    isLoopSession: Ae,
    customTitle: nt,
    customTitleFromTail: Je,
    aiTitle: pt,
    summary: Et,
    tag: tag,
    agentSetting: agentSetting,
    entrypoint: Ee,
    prNumber: prNumber,
    prUrl: prUrl,
    prRepository: prRepository,
    artifactCount: rn,
    lastMessageAtMs: pn,
    continuedInSessionId: no,
    bookkeepingOnly: Ie,
  };
}
//@ chunk-e6aww6q8.js:541827-541970 layout
var FrameLinkEntrySchema = DoctorLazy(() =>
  create({
    type: create_25("frame-link"),
    frameUrl: create_2()
      .optional()
      .catch(void 0),
    artifactCount: create_3()
      .int()
      .positive()
      .optional()
      .catch(void 0),
  }),
);
//@ chunk-e6aww6q8.js:541970-542380 layout
function countFrameLinks(e) {
  if (!e.includes('"type":"frame-link"')) return;
  let n = 0,
    r = new Set();
  for (let h of e.split(`
`)) {
    if (!h.includes('"type":"frame-link"')) continue;
    let y;
    try {
      y = jsonParseRaw(h);
    } catch {
      continue;
    }
    let safeParse = FrameLinkEntrySchema().safeParse(y);
    if (!safeParse.success) continue;
    if (safeParse.data.artifactCount !== void 0 && safeParse.data.artifactCount > n)
      n = safeParse.data.artifactCount;
    if (safeParse.data.frameUrl !== void 0) r.add(safeParse.data.frameUrl);
  }
  let max = Math.max(n, r.size);
  return max > 0 ? max : void 0;
}
//@ chunk-e6aww6q8.js:542380-543149 layout
function isLoopCommandSession(e) {
  let r = 0;
  while (r < e.length) {
    let index = e.indexOf(
        `
`,
        r,
      ),
      h = index >= 0 ? e.slice(r, index) : e.slice(r),
      y = index < 0;
    if (
      ((r = index >= 0 ? index + 1 : e.length), !h.includes('"type":"user"') && !h.includes('"type": "user"'))
    )
      continue;
    if (h.includes('"tool_result"')) continue;
    let S;
    try {
      S = jsonParse(h);
    } catch {
      if (y) return h.includes("<command-name>/loop</command-name>");
      continue;
    }
    if (S.type !== "user") continue;
    if (S.isMeta === !0 || S.isCompactSummary === !0) continue;
    let message = S.message;
    if (!message) continue;
    let content = message.content,
      G = [];
    if (typeof content === "string") G.push(content);
    else if (Array.isArray(content)) {
      let q = !1;
      for (let Z of content) {
        if (!Z || typeof Z !== "object") continue;
        if (Z.type === "tool_result") {
          q = !0;
          break;
        }
        if (Z.type === "text" && typeof Z.text === "string") G.push(Z.text);
      }
      if (q) continue;
    }
    return G.some((q) => q.includes("<command-name>/loop</command-name>"));
  }
  return !1;
}
//@ chunk-e6aww6q8.js:543149-544523 fingerprint = extractFirstPromptFromChunk (0.719)
function extractFirstPromptFromChunk(e, n) {
  let start = 0,
    s = !1,
    h = "",
    firstCommandFallback = "";
  while (start < e.length) {
    let index = e.indexOf(
        `
`,
        start,
      ),
      w = index >= 0 ? e.slice(start, index) : e.slice(start);
    if (
      ((start = index >= 0 ? index + 1 : e.length),
      !w.includes('"type":"user"') && !w.includes('"type": "user"'))
    )
      continue;
    if (w.includes('"tool_result"')) continue;
    if (w.includes('"isMeta":true') || w.includes('"isMeta": true')) continue;
    if (w.includes('"isCompactSummary":true') || w.includes('"isCompactSummary": true')) continue;
    try {
      let entry = jsonParse(w);
      if (entry.type !== "user") continue;
      if (entry.isMeta === !0 || entry.isCompactSummary === !0) continue;
      let message = entry.message;
      if (!message) continue;
      let content = message.content,
        Z = n === "shown" && typeof content === "string" ? t7(content, entry.pluginPrompt) : content,
        Se = Z !== content,
        texts = [];
      if (typeof Z === "string") texts.push(Z);
      else if (Array.isArray(content))
        for (let block of content) {
          let Ee = block;
          if (Ee.type === "text" && typeof Ee.text === "string") texts.push(Ee.text);
        }
      for (let text of texts) {
        if (!text) continue;
        let result = flattenPastedBlocks(text)
            .replaceAll(
              `
`,
              " ",
            )
            .trim(),
          Ae = Se ? null : extractTag(result, COMMAND_NAME);
        if (Ae) {
          let name = Ae.replace(/^\//, ""),
            We = extractTag(result, "command-args")?.trim() || "";
          if (require("./chunk-mvgsex7x.js").builtInCommandNames().has(name) || !We) {
            if (!h) h = Ae;
            continue;
          }
          return We ? `${Ae} ${We}` : Ae;
        }
        let Ie = Se ? null : extractTag(result, "bash-input");
        if (Ie) return `! ${Ie}`;
        if (SYNTHETIC_USER_TEXT_PATTERN.test(result)) {
          if (result.startsWith(`<${TICK}>`)) s = !0;
          continue;
        }
        if (result.length > 200) result = truncateToLength(result, 200).trim() + "\u2026";
        return result;
      }
    } catch {
      if (index < 0) {
        let L =
          extractJsonStringFieldPrefix(w, "content", 200) || extractJsonStringFieldPrefix(w, "text", 200);
        if (!SYNTHETIC_USER_TEXT_PATTERN.test(L)) firstCommandFallback = L;
      }
      continue;
    }
  }
  if (h) return h;
  if (s) return "Proactive session";
  return firstCommandFallback;
}
//@ chunk-e6aww6q8.js:544523-544740 layout
function findLastFieldInType(e, n, r) {
  let s = `"type":"${n}"`,
    h = `"${r}":`,
    y = e.length;
  while (y > 0) {
    let index = e.lastIndexOf(
        `
`,
        y - 1,
      ),
      sliced = e.slice(index + 1, y);
    if (((y = index), sliced.includes(s) && sliced.includes(h))) {
      let L = extractJsonStringField(sliced, r);
      if (L !== void 0) return L;
    }
    if (index < 0) break;
  }
  return;
}
//@ chunk-e6aww6q8.js:544740-545032 fingerprint = extractJsonStringFieldPrefix (1)
function extractJsonStringFieldPrefix(text, key, maxLen) {
  let patterns = [`"${key}":"`, `"${key}": "`];
  for (let pattern of patterns) {
    let idx = text.indexOf(pattern);
    if (idx < 0) continue;
    let valueStart = idx + pattern.length,
      w = valueStart,
      collected = 0;
    while (w < text.length && collected < maxLen) {
      if (text[w] === "\\") {
        ((w += 2), collected++);
        continue;
      }
      if (text[w] === '"') break;
      (w++, collected++);
    }
    return text.slice(valueStart, w).replaceAll("\\n", " ").replaceAll("\\t", " ").trim();
  }
  return "";
}
//@ chunk-e6aww6q8.js:545032-545254 layout = groupLogsBySessionId (1)
function latestLogPerSession(filteredLogs) {
  let groups = new Map();
  for (let log of filteredLogs) {
    if (!log.sessionId) continue;
    let existing = groups.get(log.sessionId);
    if (!existing || log.modified.getTime() > existing.modified.getTime()) groups.set(log.sessionId, log);
  }
  return sortLogs([...groups.values()]).map((r, s) => ({ ...r, value: s }));
}
//@ chunk-e6aww6q8.js:545254-545715 facade-majority = getSessionFilesLite (0.952)
async function getSessionFilesLite(e, n, r, s, h) {
  let entries = [...(await getSessionFilesWithMtime(e, s)).entries()].sort((G, q) => q[1].mtime - G[1].mtime);
  if (n && entries.length > n) entries = entries.slice(0, n);
  let logs = [];
  for (let [G, q] of entries)
    logs.push({
      date: new Date(q.mtime).toISOString(),
      messages: [],
      isLite: !0,
      fullPath: q.path,
      value: 0,
      created: new Date(q.ctime),
      modified: new Date(q.mtime),
      firstPrompt: "",
      messageCount: 0,
      fileSize: q.size,
      isSidechain: !1,
      sessionId: G,
      projectPath: r,
      ownWorktrees: h,
    });
  let sorted = sortLogs(logs);
  return (
    sorted.forEach((log, q) => {
      log.value = q;
    }),
    sorted
  );
}
/**
 * 富化单个 lite 日志并过滤：cwd 不同、sidechain、无内容等不显示在 /resume。
 */
//@ chunk-e6aww6q8.js:545715-547898 fingerprint = enrichLog (0.575)
async function enrichLog(e, n, r) {
  if (!e.isLite || !e.fullPath) return e;
  let s = await readLiteMetadata(e.fullPath, e.fileSize ?? 0, n, r),
    h = s.relocatedCwd ?? s.headCwdStrict;
  if (
    e.projectPath !== void 0 &&
    h !== void 0 &&
    !recordedCwdIsWithinOwnWorktrees(h, e.ownWorktrees, slugCollisionGuardFoldsCase()) &&
    (await recordedCwdCollidesWithProjectResolved(
      h,
      e.projectPath,
      slugCollisionGuardFoldsCase(),
      hasUntouchableRecordSpellingAsync,
      getRealPathOptions(r),
    ))
  )
    return (
      logForDebugging(
        `Session ${e.sessionId} filtered from /resume: recorded cwd is a different directory with the same project slug`,
      ),
      null
    );
  let y = (Se) => Se,
    S = s.projectPath !== void 0 && y(dirname(e.fullPath)) === y(getProjectDir_2(s.projectPath)),
    w = s.relocatedCwd ?? (S || e.projectPath === void 0 ? (s.projectPath ?? e.projectPath) : e.projectPath),
    customTitleFromTail = s.customTitleFromTail;
  if (customTitleFromTail === void 0)
    customTitleFromTail =
      (e.sessionId !== void 0 ? await readCustomTitle(e.fullPath, e.sessionId, r) : void 0) ?? s.customTitle;
  let G = s.lastMessageAtMs !== void 0 ? new Date(Math.min(s.lastMessageAtMs, e.modified.getTime())) : void 0,
    q = {
      ...e,
      ...(G !== void 0 && { date: G.toISOString(), modified: G }),
      isLite: !1,
      firstPrompt: s.firstPrompt,
      ...(s.firstPromptShown !== void 0 && { firstPromptShown: s.firstPromptShown }),
      gitBranch: s.gitBranch,
      isSidechain: s.isSidechain,
      teamName: s.teamName,
      sessionKind: s.sessionKind,
      customTitle: customTitleFromTail,
      aiTitle: s.aiTitle,
      summary: s.summary,
      tag: s.tag,
      agentSetting: s.agentSetting,
      prNumber: s.prNumber,
      prUrl: s.prUrl,
      prRepository: s.prRepository,
      artifactCount: s.artifactCount,
      projectPath: w,
    };
  if (!q.firstPrompt && !q.customTitle && !q.aiTitle) q.firstPrompt = "(session)";
  if (q.isSidechain)
    return (logForDebugging(`Session ${e.sessionId} filtered from /resume: isSidechain=true`), null);
  if (q.teamName)
    return (logForDebugging(`Session ${e.sessionId} filtered from /resume: teamName=${q.teamName}`), null);
  if (s.continuedInSessionId !== void 0) {
    if (
      ((q.continuedInSessionId = s.continuedInSessionId),
      await getTranscriptPathForSession_2(e.fullPath, s.continuedInSessionId, r))
    )
      (logForDebugging(
        `Session ${e.sessionId} filtered from /resume: continued in ${s.continuedInSessionId}`,
      ),
        (q.superseded = !0));
  }
  if (s.bookkeepingOnly) q.bookkeepingOnly = !0;
  if (q.sessionKind === "daemon" || q.sessionKind === "daemon-worker")
    return (
      logForDebugging(`Session ${e.sessionId} filtered from /resume: sessionKind=${q.sessionKind}`),
      null
    );
  let Z = PROGRAMMATIC_ENTRYPOINTS.has(hBe() ?? "");
  if (!Z && PROGRAMMATIC_ENTRYPOINTS.has(s.entrypoint ?? ""))
    return (
      logForDebugging(`Session ${e.sessionId} filtered from /resume: entrypoint=${s.entrypoint}`),
      null
    );
  if (!Z && s.isLoopSession)
    return (logForDebugging(`Session ${e.sessionId} filtered from /resume: /loop session`), null);
  return q;
}
/**
 * 批量富化 lite 日志，记录过滤计数（/resume: enriched … filtered out … visible）。
 */
//@ chunk-e6aww6q8.js:547898-548224 facade-majority = enrichLogs (0.969)
async function enrichLogs(e, n, r, s) {
  let result = [],
    readBuf = Buffer.alloc(LITE_READ_BUF_SIZE),
    S = n;
  while (S < e.length && result.length < r) {
    let log = e[S];
    S++;
    let q = await enrichLog(log, readBuf, s);
    if (q && !q.superseded) result.push(q);
  }
  let w = S - n,
    L = w - result.length;
  if (L > 0)
    logForDebugging(
      `/resume: enriched ${w} sessions, ${L} filtered out, ${result.length} visible (${e.length - S} remaining on disk)`,
    );
  return { logs: result, nextIndex: S };
}
//@ chunk-e6aww6q8.js:1737819-1738199 fingerprint = METADATA_TYPE_MARKERS (0.44)
var MAX_METADATA_SCAN_BYTES = 52428800,
  J9o = 200,
  Den = 60,
  Z9o = /<command-name>\/([\w:-]+)<\/command-name>/g,
  n8o = /"name":"mcp__([^"]+?)__([^"]+)"/g,
  Len = '"content":"<command-name>/',
  o8o = '"content":"<command-message>',
  r8o = '"type":"tool_use"',
  s8o = '"type":"custom-title"',
  i8o = '"type":"pr-link"',
  a8o = '"role":"user"',
  l8o = /"customTitle":"([^"]+)"/,
  d8o = /"prNumber":(\d+)/,
  u8o = /"role":"user"[^}]*"content":"([^"]+)"/;
//@ chunk-e6aww6q8.js:4338628-4338664 fingerprint = appendEntryToFile (0.638)
function appendEntryToFile() {
  getFsImplementation().mkdirSync(getPluginsDirectory());
}
/**
 * <配置目录>/projects：所有项目转录目录的父目录。
 */
//@ chunk-qzv7ezvq.js:590-630 facade-exports = getProjectsDir (1)
function getProjectsDir() {
  return join(getClaudeConfigDir(), "projects");
}
//@ chunk-qzv7ezvq.js:630-676 facade-exports
function getProjectKeyIfRepresentable(t) {
  return dirname(t) === getProjectsDir() ? basename(t) : void 0;
}
//@ chunk-qzv7ezvq.js:676-819 facade-exports
function projectKeyOf(t) {
  if (typeof t === "string") return getProjectKeyIfRepresentable(t);
  let { scope: scope } = t;
  return scope.namespace === "transcript" && scope.sessionId === void 0 ? scope.projectKey : void 0;
}
//@ chunk-qzv7ezvq.js:819-1121 layout
class ProjectDirCacheState {
  projectDirCache = new Map();
  agentTranscriptSubdirs = new Map();
  cacheProjectDir(t, e) {
    this.projectDirCache.set(t, e);
  }
  clearProjectDirCache() {
    this.projectDirCache.clear();
  }
  setAgentTranscriptSubdir(t, e) {
    this.agentTranscriptSubdirs.set(t, e);
  }
  clearAgentTranscriptSubdir(t) {
    this.agentTranscriptSubdirs.delete(t);
  }
}
//@ chunk-qzv7ezvq.js:1121-1144 layout
var projectDirCacheByHost = new HostScoped(() => new ProjectDirCacheState());
/**
 * 项目目录：<配置目录>/projects/<cwd 清洗名>，cwd 中非字母数字字符换成 '-'，超过 200 字符截断并加 hash 后缀；按 cwd 缓存。
 */
//@ chunk-qzv7ezvq.js:1144-1282 facade-exports
function getProjectDir(t) {
  let of = projectDirCacheByHost.of(getRootSession().host),
    n = of.projectDirCache.get(t);
  if (n !== void 0) return n;
  let r = join(getProjectsDir(), getProjectKey(t));
  return (of.cacheProjectDir(t, r), r);
}
//@ chunk-qzv7ezvq.js:1282-1356 facade-exports
function resolveProjectDir() {
  let t = getOriginalCwdOrNull();
  if (t !== null) return getProjectDir(t);
  return getPinnedProjectDir() ?? getProjectDir(getOriginalCwd());
}
//@ chunk-qzv7ezvq.js:1356-1390 facade-exports
function resolveSessionProjectDir() {
  return getSessionProjectDir() ?? resolveProjectDir();
}
/**
 * 当前会话主转录路径：<项目目录>/<sessionId>.jsonl。
 */
//@ chunk-qzv7ezvq.js:1390-1434 facade-exports = getErrorsPath (1)
function getTranscriptPath() {
  return join(resolveSessionProjectDir(), `${getSessionId()}.jsonl`);
}
//@ chunk-qzv7ezvq.js:1434-1461 facade-exports
function locateSessionProjectDir() {
  return resolveSessionProjectDir();
}
//@ chunk-qzv7ezvq.js:1461-1524 facade-exports
function setAgentTranscriptSubdir(t, e) {
  projectDirCacheByHost.of(getRootSession().host).setAgentTranscriptSubdir(t, e);
}
//@ chunk-qzv7ezvq.js:1524-1585 facade-exports
function clearAgentTranscriptSubdir(t) {
  projectDirCacheByHost.of(getRootSession().host).clearAgentTranscriptSubdir(t);
}
//@ chunk-qzv7ezvq.js:1585-1631 facade-exports
function getSessionSubagentsDir() {
  return join(resolveSessionProjectDir(), getSessionId(), "subagents");
}
//@ chunk-qzv7ezvq.js:1631-1660 facade-exports
function locateAgentTranscript(t) {
  return getAgentTranscriptPath(t);
}
/**
 * 子代理转录路径：<项目目录>/<sessionId>/subagents/[子目录/]agent-<agentId>.jsonl。
 */
//@ chunk-qzv7ezvq.js:1660-1778 facade-exports
function getAgentTranscriptPath(t) {
  let e = projectDirCacheByHost.of(getRootSession().host).agentTranscriptSubdirs.get(t),
    n = e ? join(getSessionSubagentsDir(), e) : getSessionSubagentsDir();
  return join(n, `agent-${t}.jsonl`);
}
//@ chunk-qzv7ezvq.js:1778-1824 facade-exports
function agentTranscriptPathOfEntry(t) {
  return G$(t) ? getAgentTranscriptPath(Mr(t)) : void 0;
}
//@ chunk-qzv7ezvq.js:1824-2105 facade-exports = loadAllSubagentTranscriptsFromDisk (0.818)
async function listSubagentIdsFromDisk(t) {
  let e = getProjectKeyIfRepresentable(resolveSessionProjectDir());
  if (isStorageV5Enabled() && t !== void 0 && e !== void 0) return f_qzv7(t, e, getSessionId());
  if (isDiskless()) return [];
  let entries;
  try {
    entries = await readdir(getSessionSubagentsDir(), { withFileTypes: !0 });
  } catch {
    return [];
  }
  return entries
    .filter((r) => r.isFile() && r.name.startsWith("agent-") && r.name.endsWith(".jsonl"))
    .map((r) => r.name.slice(6, -6));
}
//@ chunk-qzv7ezvq.js:2105-2495 layout
async function f_qzv7(t, e, n) {
  let r = [];
  try {
    return (
      await readAllPages(
        (a) =>
          t.listEntries(
            { namespace: "transcript", projectKey: e, sessionId: n },
            { skipKeyStats: !0, skipScopeStats: !0, ...(a !== void 0 && { cursor: a }) },
          ),
        (a) => {
          for (let s of a)
            if (
              s.kind === "key" &&
              s.key.namespace === "transcript" &&
              s.key.agentId !== void 0 &&
              s.key.agentRelPath === void 0 &&
              isValidKeySegment(s.key.agentId)
            )
              r.push(s.key.agentId);
        },
      )
    ).status === "done"
      ? r
      : [];
  } catch {
    return [];
  }
}
//@ chunk-qzv7ezvq.js:2495-2680 facade-exports = extractTeammateTranscriptsFromTasks (1)
function extractTeammateTranscriptsFromTasks(t, e) {
  let transcripts = {};
  for (let task of Object.values(t)) {
    let o = e[task.id]?.messages;
    if (task.type === "in_process_teammate" && task.identity?.agentId && o && o.length > 0)
      transcripts[task.identity.agentId] = o;
  }
  return transcripts;
}
//@ chunk-x753sk9t.js:513-578 placement
function resolveAgainstProcessCwd(e) {
  let cwd = process.cwd();
  return cwd.endsWith(sep_2) ? cwd + e : cwd + sep_2 + e;
}
//@ chunk-x753sk9t.js:578-673 placement
function makeWorkspaceRealPath(e) {
  return (n) =>
    e.hostFiles.realPath(PathSpace.workspace(n === "" || isAbsolute_2(n) ? n : resolveAgainstProcessCwd(n)), {
      native: !0,
    });
}
//@ chunk-x753sk9t.js:673-747 placement
function getRealPathOptions(e) {
  return e === void 0 ? void 0 : { hoverRestOn: isStorageV5Enabled(), realPath: makeWorkspaceRealPath(e) };
}
//@ chunk-x753sk9t.js:747-865 layout
function getAgentIdFromTranscriptKey(e) {
  return e.namespace !== "transcript" || e.journal !== void 0 || e.sessionJournal !== void 0
    ? void 0
    : (e.agentId ?? null);
}
/**
 * storage v5 后端下把 <配置目录>/projects/<项目>/<session>.jsonl 形式的路径映射为转录存储 key；不在 projects 目录下或无后端时返回 undefined。
 */
//@ chunk-x753sk9t.js:865-1185 callgraph-witnessed = getTranscriptPath (0.658)
function getTranscriptStorageKey(e, n) {
  if (!isStorageV5Enabled() || n === void 0) return;
  if (typeof e !== "string")
    return getAgentIdFromTranscriptKey(e.key) === null ? { backend: n, key: e.key } : void 0;
  if (!e.endsWith(".jsonl")) return;
  let t = dirname(e);
  if (dirname(t) !== getProjectsDir_3()) return;
  let r = basename(t),
    o = basename(e, ".jsonl");
  if (e !== join(getProjectsDir_3(), r, `${o}.jsonl`)) return;
  let transcript = STORAGE_SPACES.transcript(r, o);
  return validateStorageKey(transcript) === void 0 ? { backend: n, key: transcript } : void 0;
}
//@ chunk-x753sk9t.js:1185-1734 layout = getAgentTranscriptPath (0.867)
function getAgentTranscriptStorageKey(e, n) {
  if (!isStorageV5Enabled() || n === void 0) return;
  if (typeof e !== "string")
    return typeof getAgentIdFromTranscriptKey(e.key) === "string" ? { backend: n, key: e.key } : void 0;
  let t = relative(getProjectsDir_3(), e);
  if (t === "" || t === ".." || t.startsWith(`..${sep}`) || isAbsolute(t)) return;
  let parts = t.split(sep);
  if (e !== join(getProjectsDir_3(), ...parts)) return;
  let at = parts.at(-1);
  if (
    parts.length < 4 ||
    parts[2] !== "subagents" ||
    at === void 0 ||
    !at.startsWith("agent-") ||
    !at.endsWith(".jsonl")
  )
    return;
  let sliced = at.slice(6, -6),
    sliced_2 = parts.slice(3, -1);
  if (!uA([parts[0], parts[1], sliced]) || (sliced_2.length > 0 && !uA(sliced_2))) return;
  let transcript = STORAGE_SPACES.transcript(
    parts[0],
    parts[1],
    sliced,
    sliced_2.length > 0 ? sliced_2 : void 0,
  );
  return validateStorageKey(transcript) === void 0 ? { backend: n, key: transcript } : void 0;
}
//@ chunk-x753sk9t.js:1734-1863 placement
function getTranscriptStorageContext(e) {
  if (!isStorageV5Enabled() || e === void 0) return;
  return {
    backend: e,
    transcriptKey: STORAGE_SPACES.transcript,
    isKeySegment: isValidKeySegment,
    realWorkspacePath: makeWorkspaceRealPath(e),
  };
}
//@ chunk-x753sk9t.js:1863-1930 placement
function wrapStorageSource(e) {
  return e === void 0 ? void 0 : { source: e, hoverRestOn: isStorageV5Enabled() };
}
//@ chunk-63641kq7.js:4535-4668 callgraph-fingerprint = getTranscriptPathForSession (0.661)
async function getTranscriptPathForSession_2(e, n, r) {
  let t = join(dirname(e), `${n}.jsonl`),
    i = await readSessionLite(t, wrapStorageSource(getTranscriptStorageKey(t, r)));
  return i !== null && (await transcriptMayContainMarker(t, i.head, i.tail, i.size, r));
}
//@ chunk-63641kq7.js:4668-4711 placement
var f = '"parentUuid":',
  A = 16777216,
  E = 1048576;
/**
 * 判断转录头尾或全文是否含有某标记：头尾已命中返回 true，文件较小返回 false，存储模式保守返回 true，否则分块扫描文件直到上限。
 */
//@ chunk-63641kq7.js:4711-5193 placement
async function transcriptMayContainMarker(e, n, r, t, i) {
  if (n.includes(f) || r.includes(f)) return !0;
  if (t <= LITE_READ_BUF_SIZE) return !1;
  if (getTranscriptStorageKey(e, i) !== void 0) return !0;
  try {
    let d = await open_2(e, constants_2.O_RDONLY | constants_2.O_NOFOLLOW | constants_2.O_NONBLOCK);
    try {
      if (!(await d.stat()).isFile()) return !1;
      let allocUnsafe = Buffer.allocUnsafe(E + f.length),
        c = 0,
        m = 0;
      while (m < A) {
        let { bytesRead: bytesRead } = await d.read(allocUnsafe, c, E, m);
        if (bytesRead === 0) return !1;
        let l = c + bytesRead;
        if (allocUnsafe.subarray(0, l).includes(f)) return !0;
        ((c = Math.min(f.length, l)), allocUnsafe.copyWithin(0, l - c, l), (m += bytesRead));
      }
      return !0;
    } finally {
      await d.close();
    }
  } catch {
    return !1;
  }
}
//@ chunk-18hwfzwa.js:441822-441905 fingerprint = extractTeammateTranscriptsFromTasks (1)
function extractTeammateTranscriptsFromTasks_2(tasks) {
  return tasks.type === "in_process_teammate" ? tasks.identity.agentId : tasks.agentId;
}
//@ chunk-18hwfzwa.js:1084489-1084597 fingerprint = loadSubagentTranscripts (0.658)
function loadSubagentTranscripts_2({ isLoading: isLoading, transcript: transcript }) {
  let D = ce((agentId) => !isLoading && JM(agentId), [isLoading]),
    L = useStoreSelector(transcript, D),
    ee = !isUnattendedInteractiveSession();
  return !isLoading && !L && ee;
}
//@ chunk-7dqf31r1.js:4170-4264 affinity
var REMOTE_ENTRYPOINTS_2 = new Set([
  "remote",
  "remote_desktop",
  "remote_mobile",
  "remote_projects",
  "remote_trigger",
]);
//@ chunk-7dqf31r1.js:4264-4369 fingerprint = getEntrypoint (0.699)
function getEntrypoint() {
  let CLAUDE_CODE_ENTRYPOINT = env.CLAUDE_CODE_ENTRYPOINT;
  return (
    Boolean(env.CLAUDE_CODE_REMOTE) &&
    CLAUDE_CODE_ENTRYPOINT !== void 0 &&
    REMOTE_ENTRYPOINTS_2.has(CLAUDE_CODE_ENTRYPOINT)
  );
}
//@ chunk-cg2r2hy6.js:24194-24674 fingerprint = getAgentTranscriptPath (0.928)
function getAgentTranscriptPath_2(agentId) {
  let u = getProjectsDir_4() + sep;
  if (!agentId.startsWith(u)) return null;
  let parts = agentId.slice(u.length).split(sep);
  if (parts.length === 2 && parts[1].endsWith(".jsonl")) {
    let o = parts[0],
      sliced = parts[1].slice(0, -6);
    return isValidKeySegment(o) && isValidKeySegment(sliced)
      ? pathIfNotStorageBacked(STORAGE_SPACES.transcript(o, sliced))
      : null;
  }
  if (
    parts.length >= 4 &&
    parts[2] === "subagents" &&
    parts.at(-1).startsWith("agent-") &&
    parts.at(-1).endsWith(".jsonl")
  ) {
    let o = parts[0],
      y = parts[1],
      sliced = parts.slice(3, -1),
      sliced_2 = parts.at(-1).slice(6, -6);
    return isValidKeySegment(o) &&
      isValidKeySegment(y) &&
      isValidKeySegment(sliced_2) &&
      (sliced.length === 0 || uA(sliced))
      ? pathIfNotStorageBacked(STORAGE_SPACES.transcript(o, y, sliced_2, sliced.length > 0 ? sliced : void 0))
      : null;
  }
  return null;
}
//@ chunk-cg2r2hy6.js:24674-24718 sole-consumer
function pathIfNotStorageBacked(s) {
  return validateStorageKey(s) === void 0 ? s : null;
}
//@ chunk-0j11jfmy.js:6045-6057 fingerprint = cleanMessagesForLogging (1)
var cleanMessagesForLogging_2 = "ant";
//@ chunk-89ebz077.js:16227-16458 fingerprint = writeAgentMetadata (0.515)
async function writeAgentMetadata_2(agentId, metadata) {
  if (getPlatform() === "windows") return;
  let path = FTt(agentId);
  try {
    return (
      await mkdir_2(NTt(), { recursive: !0, mode: 448 }),
      await writeFile(path, JSON.stringify(metadata), { mode: 384 }),
      path
    );
  } catch (error) {
    logForDebugging(`writeSocketTokensFile failed: ${errorMessage(error)}`, { level: "warn" });
    return;
  }
}
//@ chunk-ad2e1aj6.js:22307-22511 fingerprint = scanPreBoundaryMetadata (0.481)
function scanPreBoundaryMetadata(e, n, s) {
  if (Buffer.byteLength(e) <= n) return { text: e, truncated: !1 };
  return {
    text: `${new TextDecoder("utf-8", { fatal: !1 }).decode(Buffer.from(e).subarray(0, n)).replace(/\uFFFD$/, "")}${s}`,
    truncated: !0,
  };
}
//@ chunk-bss4k1z9.js:33929-33956 fingerprint = getUserType (0.74)
var getUserType_2 = (e) => e === "external";
//@ chunk-cgs3vg0v.js:1502-1585 fingerprint = buildFileHistorySnapshotChain (0.456)
function buildFileHistorySnapshotChain(e) {
  if (!e) return;
  try {
    return R7e.of(e).snapshot();
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-dz3q485w.js:15191-15469 callgraph-fingerprint = loadSameRepoMessageLogs (0.229)
async function loadSameRepoMessageLogs_2(e, n) {
  let s = await sameRepoWorktrees(e),
    r = await loadSameRepoMessageLogsProgressive(s, void 0, void 0, n),
    a = getSessionId(),
    l = (b) =>
      !b.isSidechain &&
      b.isAlias !== !0 &&
      b.sessionId !== a &&
      (b.projectPath === void 0 || isSameRepoPath(b.projectPath, e, s)),
    filtered = r.logs.filter(l),
    h = count(r.allStatLogs.slice(r.nextIndex), resolveSessionFilePath_2);
  return { logs: filtered, totalCount: count(filtered, resolveSessionFilePath_2) + h };
}
//@ chunk-rds552kq.js:226-282 placement
function yH(e) {
  return typeof e !== "string" || isDiskless() ? void 0 : e;
}
/**
 * 根据进度消息里的 worktree 信息更新已保存的会话元数据（路径/分支/hook 标记变化时写回）。
 */
//@ chunk-wd9kxbpn.js:18162-18427 placement = renderToolResultMessage (0.52)
async function renderToolResultMessage(output, _progressMessagesForMessage, _options) {
  let u = getJobDir(output),
    o = await readJobState(u, _options);
  if (!o) return;
  let d = pickWorktreeFields(_progressMessagesForMessage, o);
  if (
    d.worktreePath === o.worktreePath &&
    d.worktreeBranch === o.worktreeBranch &&
    d.worktreeHookBased === o.worktreeHookBased
  )
    return;
  await q(u, { ...o, ...d, updatedAt: new Date().toISOString() }, {}, _options);
}
const getProjectsDir_2 = getProjectsDir; //@ cross-chunk alias
const getProjectDir_2 = getProjectDir; //@ cross-chunk alias

export {
  getEntrypoint,
  getSessionIdFromLog,
  getProjectsDir,
  getSessionFilesWithMtime,
  loadAllLogsFromSessionFile,
  getProjectKeyIfRepresentable,
  isTranscriptPersistenceDisabled,
  getTranscriptPathForSession,
  saveWorktreeState,
  resetSessionFilePointer,
  adoptForkSessionMetadata,
  recordContentReplacement,
  restoreSessionMetadata,
  adoptResumedSessionFileAsync,
  adoptResumedSessionFile,
  saveMode,
  pinSessionId,
  recordTranscript,
  doesMessageExistInSession,
  isChainParticipant,
  updateAgentMetadata,
  yH,
  getAgentTranscriptPath,
  locateAgentTranscript,
  readAgentMetadata,
  writeAgentMetadata,
  setAgentTranscriptSubdir,
  isLoggableMessage,
  clearAgentTranscriptSubdir,
  recordForkContextRef,
  recordSidechainTranscript,
  registerTranscriptExitDrain,
  transcriptCursorEnd,
  loadSessionTranscript,
  sessionLogFromTranscriptLoad,
  su,
  fetchLogs,
  findFirstMessageLog,
  toTranscriptEntries,
  isLiteLog,
  loadFullLog,
  checkResumeConsistency,
  findDeferredToolMarkerInTranscript,
  getCurrentSessionTitle,
  applyResumeHookSessionTitle,
  wrapStorageSource,
  getTranscriptStorageContext,
  cleanMessagesForLogging_2,
  AgentTranscriptFetchError,
  isAgentTranscriptOverBound,
  jVs,
  hasAgentStopSibling,
  flushSessionStorage,
  getAgentTranscript,
  canFetchAgentTranscriptsOnDemand,
  readAgentWorkerEvents,
  hasWrittenAgentTranscript,
  keepsAgentMetadataInStream,
  clearAgentStopSibling,
  landStoppedByUser,
  touchSessionTranscript,
  isCompactPairWithheldFromRemote,
  isBridgeBindingForeign,
  recordQueueOperation,
  isTranscriptRelocationInProgress,
  getTranscriptWriteFailureSeq,
  getMaterializedSessionFile,
  getAgentTranscriptStorageKey,
  removeRemoteAgentMetadata,
  writeRemoteAgentMetadata,
  listRemoteAgentMetadata,
  isRemoteEgressSuppressedFor,
  mergeArtifactCommentMonitorEntries,
  loadTranscriptFromFile,
  listSubagentIdsFromDisk,
  searchSessionsByCustomTitle,
  TranscriptFileFormatError,
  getProjectDir,
  getCurrentSessionFile,
  transcriptStamp,
  appendEntryToFileAsync,
  getTranscriptStorageKey,
  getCurrentSessionAiTitle,
  getCurrentSessionAgentColor,
  getCurrentSessionBridge,
  extractTeammateTranscriptsFromTasks_2,
  subscribeSessionTitleChanged,
  saveIsolationLatch,
  savePermissionMode,
  readAgentMetadataAtPath,
  getCurrentSessionDisplayTitle,
  applyEndedByModelOnResume,
  clearSessionMetadata,
  buildForkAdoptionMeta,
  holdPrecautionarySuppressionFor,
  markPrecautionClearResilientFor,
  copyPrecautionarySuppressionTo,
  cacheHookSessionTitle,
  subscribeSessionAgentNameChanged,
  getCurrentSessionAgentName,
  getCurrentSessionIsolationLatch,
  readTranscriptTailForTip,
  extractLastSyncedEventUuid,
  bridgeSessionForPulledWindow,
  titleCacheStillOn,
  cacheSessionTitle,
  cacheAgentName,
  getFirstMeaningfulUserMessageTextContent,
  saveCustomTitle,
  isCustomTitleEnabled,
  loadSameRepoMessageLogsProgressive,
  enrichLogs,
  loadAllProjectsMessageLogsProgressive,
  getTranscriptPath,
  getAgentMetadataPath,
  getSessionSubagentsDir,
  saveAutoMemorySessionSwitch,
  getPersistenceSuppressionCause,
  getTranscriptWriterHealth,
  saveAgentSetting,
  describeDiskTranscriptLag,
  findUnresolvedToolUses,
  addSessionMirror,
  registerLiveSuppressionProbe,
  buildFileHistorySnapshotChain,
  getSessionRowsOffDisk,
  mirrorLeafCheckpointToRemote,
  persistLeafCheckpoint,
  registerTranscriptExitReStamp,
  setTranscriptLocalGcEnabled,
  hydrateFromCCRv2InternalEvents,
  hydrateRemoteSession,
  loadSubagentTranscripts_2,
  extractAgentIdsFromMessages,
  loadSubagentTranscripts,
  saveAiGeneratedTitle,
  saveAgentName,
  isTranscriptMessage,
  queueSessionMetadataEntry,
  hasRemoteWorkerEventLog,
  readAtTranscriptEntry,
  inTranscriptCallOrder,
  collectReplIds,
  hasSessionMirror,
  removeTranscriptMessage,
  isEphemeralToolProgress,
  removeTranscriptMessageIfPersisted,
  readHistorySuppressionFromDisk,
  PENDING_BRIDGE_SESSION,
  registerForeignConversationProbe,
  clearBridgeSession,
  clearBridgeSessionCache,
  saveBridgeSession,
  isOwnTranscriptFile,
  claimPrecautionHoldForObservedCause,
  writeHistorySuppression,
  saveAgentColor,
  cleanMessagesForLogging,
  getCurrentSessionPeerNameFor,
  getCurrentSessionPeerName,
  getCurrentSessionOffBoxPeerName,
  transcriptMayContainMarker,
  sessionIdExists,
  relocateSessionTranscript,
  isConversationEgressTainted,
  isSessionHistorySuppressed,
  getCurrentSessionMemoryModeStamps,
  holdSessionHistorySuppression,
  markToolsUsedWritten,
  queueLeafCheckpointWithdrawal,
  saveMemoryMode,
  dropSessionHistorySuppression,
  releasePrecautionarySuppressionFor,
  recordFileHistoryDelta,
  recordFileHistorySnapshot,
  getSessionSidecarDir,
  ensureSidecarDirFor,
  resolveSessionProjectDir,
  setToolResultCopiesOnDisk,
  resolveProjectDir,
  sfn,
  getRealPathOptions,
  loadSameRepoMessageLogs,
  BVs,
  writeAgentMetadata_2,
  peekResumedArtifactAutoReactLedger,
  takeResumedArtifactAutoReactLedger,
  recordArtifactAutoReactLedger,
  scanPreBoundaryMetadata,
  deleteRemoteAgentMetadata,
  reAppendSessionMetadataAfterCompaction,
  getUserType_2,
  getDerivedTranscriptPathForSession,
  isPrecautionarySuppressionHeldFor,
  markScanUncertaintyHoldFor,
  holdSessionHistorySuppressionFor,
  isScanUncertaintyHoldFor,
  getAgentTranscriptPath_2,
  SuppressionScanBudget,
  SUPPRESSION_SCAN_CHUNK_BYTES,
  matchesHistorySuppressionLine,
  isSyncedTranscriptEntry,
  isRowForeignToBridgeSession,
  SUPPRESSION_SCAN_MAX_LINES,
  suppressionScanFailure,
  logSuppressionScan,
  isSessionHistorySuppressedFor,
  setInternalEventWriter,
  setInternalEventReader,
  clearInternalEventWriter,
  releaseScanUncertaintyHoldFor,
  getBridgeBoundConversationSid,
  loadSameRepoMessageLogs_2,
  scanTranscriptForSuppression,
  MAX_METADATA_SCAN_BYTES,
  Len,
  o8o,
  Z9o,
  r8o,
  n8o,
  s8o,
  l8o,
  i8o,
  d8o,
  a8o,
  u8o,
  J9o,
  Den,
  consumeFailedTranscriptWrite,
  clearSessionMessagesCache,
  sjt,
  appendEntryToFile,
  projectKeyOf,
  hasRecordedUserPrompt,
  locateSessionProjectDir,
  primeSessionMessagesCache,
  landAgentStop,
  reportRelocateSessionTranscriptFailure,
  cacheAiTitle,
  readTranscriptTailV5,
  markSessionEndedByModel,
  isTurnUnanswered,
  loadTranscriptFile,
  MAX_TRANSCRIPT_READ_BYTES,
  isMessageTurnUnanswered,
  findUnresolvedToolUsesInTranscript,
  findUnresolvedToolUseMessageRows,
  findUnresolvedToolUse,
  assistantMessageRowsInTranscript,
  withVersionToRecord,
  currentSessionFileIsFor,
  registerForeignTranscriptExitReStamp,
  appendEntryToCurrentTranscriptNow,
  onSessionFileMaterialized,
  takeResumedArtifactCommentMonitor,
  sealTornTranscriptTail,
  recordArtifactCommentMonitor,
  worktreeStateSignals,
  renderToolResultMessage,
  readLastObserverRef,
  agentTranscriptExists,
  recordObserverRef,
  recordSessionAlias,
  extractTeammateTranscriptsFromTasks,
  loadAllSubagentTranscriptsFromDisk,
  restoreAgentSidecarFromStream,
  setAgentMetadataInStreamGate,
  updateCCRTipFromAckedBatch,
  sealTranscriptAppendsForShutdown,
  getValidatedCCRTip,
  saveDevModsFolder,
  getCurrentSessionDevModsFolder,
};
