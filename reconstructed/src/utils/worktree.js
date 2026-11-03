/**
 * utils/worktree.ts
 *
 * worktree 生命周期：在 .claude/worktrees/<slug> 创建（git worktree add 或 WorktreeCreate hook）、加锁（pid 锁原因）、.worktreeinclude 复制、进入/退出校验、清理陈旧 worktree 与锁、tmux 会话
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/worktree.ts
 * pieces: chunk-aepeg2w5.js (7), chunk-dcmhvw5a.js (6), chunk-e6aww6q8.js (125)
 * attribution: placement 12, facade-exports 49, affinity 9, sole-consumer 14, fingerprint 4, layout 48, file-local 1, callgraph-witnessed 1
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
  normalize,
  normalize as normalize_2,
  normalize as normalize_3,
  normalize as normalize_4,
  normalize as normalize_5,
  normalize as normalize_6,
  normalize as normalize_7,
  normalize as normalize_8,
  normalize as normalize_9,
  win32,
  win32 as win32_2,
  win32 as win32_3,
  win32 as win32_4,
  win32 as win32_5,
  win32 as win32_6,
  win32 as win32_7,
  win32 as win32_8,
} from "path";
import {
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
  symlink,
  symlink as symlink_2,
  symlink as symlink_3,
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
  copyFile,
  copyFile as copyFile_2,
  copyFile as copyFile_3,
  copyFile as copyFile_4,
  copyFile as copyFile_5,
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
} from "fs/promises";
import {
  availableParallelism,
  availableParallelism as availableParallelism_2,
  homedir,
  homedir as homedir_2,
  homedir as homedir_3,
  homedir as homedir_4,
  homedir as homedir_5,
  homedir as homedir_6,
  homedir as homedir_7,
  homedir as homedir_8,
  homedir as homedir_9,
  homedir as homedir_10,
  homedir as homedir_11,
  homedir as homedir_12,
} from "os";
import {
  parseSettingsFileUncached,
  getInitialSettings_2,
  getRelativeSettingsFilePathForSource,
} from "./settings/settings.js";
import { saveCurrentProjectConfig, checkHasTrustDialogAccepted } from "./config.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { env } from "./env.js";
import {
  isDiskless,
  getOriginalCwd,
  getSessionId,
  getProjectRoot,
  onProcessRootHost,
} from "../bootstrap/state.js";
import { containsPathTraversal } from "./path.js";
import { getErrnoCode, errorMessage, isENOENT, withTelemetryMessage } from "./errors.js";
import { logForDebugging } from "./debug.js";
import {
  findCanonicalGitRoot,
  gitExe,
  getDefaultBranch,
  findGitRoot,
  getGitSshEnv,
  getBranch,
  isLinkedWorktree,
  hasUnpushedCommits_2,
  findGitRootUncached,
  findCanonicalGitRootUncached,
  findGitRootVerifyingPositive,
} from "./git.js";
import {
  getClaudeWorktreesDir,
  checkWorktreePath,
  Xyn,
  s4r,
  checkWorktreeIsolation,
  gitRootsForPath,
  parseWorktreeAddError,
  describeRepoRelativeLocation,
  i4r,
  lei,
  o4r,
  rie,
  getWorktreesDirSpec,
} from "./worktreeIsolation.js";
import {
  readWorktreeHeadSha,
  resolveGitDir,
  resolveRef,
  resolveGitDir_2,
  isValidGitSha,
  getCommonDir,
  pointerFileIsSuspect,
  rawPointerPathIsUnsafe,
} from "./git/gitFilesystem.js";
import { cl, Mn, uncHostOf } from "./pathClassification.js";
import {
  Tc,
  findSamePath,
  P1,
  foldCaseForCompare as foldCaseForCompare_2,
  Ldr,
  findWorktreeMatchingPaths,
  findUniqueWorktreeForBranch,
  containsSamePath,
  isRemovableWorktreeDir,
  KJr,
  normalizePathKey,
  clearReparsePoints,
  Cp,
} from "./pathIdentity.js";
import {
  writeIfMissing,
  retryFsOp,
  copyIntoTemp,
  assertSafeThenWrite,
  writeNewFile,
} from "./atomicPublishWrite.js";
import { getPlatform } from "./platform.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { TRANSIENT_FS_ERRORS as TRANSIENT_FS_ERRORS_2 } from "./plugins/safeCopy.js";
import {
  mXn,
  vetWorktreeRegistration,
  verifyPinnedGitDir,
  stripProgressLines,
  pMn,
  pruneWorktreeRegistrations,
  HPn,
} from "./worktree/worktreeRegistrations.js";
import { execFileNoThrowWithCwd, execFileNoThrow } from "./execFileNoThrow.js";
import { freeze as freeze_23, freeze_2 as freeze_2_2 } from "./git/gitSafeEnv.js";
import {
  buildGitEnvForRepo,
  resolveGitDirsOrPlaceholder,
  NOT_A_GIT_REPO_PATH,
  resolveGitDirs,
  resolveGitDir as resolveGitDir_3,
} from "./git/gitDirResolution.js";
import {
  rMn,
  readSparseCheckoutConfig,
  hasMissingSparseObjects,
  minimalSparseDirs,
} from "./worktree/sparseCheckout.js";
import {
  inspectPartialClone,
  explainPartialCloneFailure,
  doe,
  gitSupportsPartialCloneFetch,
  explainOnDemandFetchOff,
} from "./worktree/partialClone.js";
import { inspectSubmodules, submoduleChanges, describeSubmoduleChanges } from "./git/submoduleInspection.js";
import { withSafeGitConfig } from "./git/gitLanes.js";
import { hideUnsafePath, hideUnsafeText, Lee } from "./unsafePathGlyphs.js";
import { printableLabel, printableNameOrPlaceholder } from "./printableName.js";
import { getFirstLine, truncateToLength, firstLineOf, countCharInString } from "./stringUtils.js";
import { isOnForeignMount, Ya, isForeignMountPath } from "./networkPaths.js";
import { isSentinelInode } from "./slowOperations.js";
import { isSameRepository, vetRepoForWorktrees } from "./git/worktreeVetting.js";
import { deregisterWorktree, pruneWorktreeRegistration } from "./git/worktreeRegistrations.js";
import { removeWorktreeSafely, worktreeRemovalText } from "./git/worktreeRemoval.js";
import { ENTER_WORKTREE_TOOL_NAME } from "../tools/EnterWorktreeTool/constants.js";
import { resolveRemoteUrl } from "./detectRepository.js";
import { ghIsDangerousCallback as ghIsDangerousCallback_2, getGitHostKind } from "./gitHosts.js";
import { SAFE_UPLOAD_PACK_ARG } from "./gitSafeExec.js";
import { truncateMiddle as truncateMiddle_2 } from "../memdir/memoryTool.js";
import { xst, wAt } from "./ignorePatterns.js";
import { resolveLocalSettingsStoreRoot } from "./settings/settingsFileParsing.js";
import { GD } from "./settings/settingsStorage.js";
import { IMn } from "./git/gitConfigParser.js";
import { getPreSettingsEnvHonoringLiveDeletions } from "./managedEnvApply.js";
import { isProcessRunning as isProcessRunning_2 } from "./genericProcessUtils.js";
import {
  isSameProcessAsync,
  procIdentityFields,
  ownProcStartAsync,
  isProcessProvablyGone,
} from "./processIdentity.js";
import { readFlagWithOverride } from "../services/analytics/flagOverrides.js";
import { getCwd } from "./cwd.js";
import { dispatchesWorktreeCreate, executeWorktreeCreateHook, executeWorktreeRemoveHook } from "./hooks.js";
import { lTi, clearResumeHintWorktree } from "./concurrentSessions.js";
import { containsVulnerableUncPath } from "./shell/readOnlyCommandValidation.js";
import {
  hasUntouchableRecordSpelling,
  processChdir,
  resolveDeepestExistingAncestorSync,
  getFsImplementation,
  UNVERIFIED_ANCESTRY,
} from "./fsOperations.js";
import { getRepoRootForWorktreePath } from "./permissions/protectedDirs.js";
import { sleep } from "./sleep.js";
import { getRemoteHostSessionCount } from "../commands/insights.js";
import {
  fromEntries as fromEntries_2,
  buildFilterNeutralizingArgs,
  describeGitConfigUnreadable,
} from "./git/gitConfigFilters.js";
import { foldPathCase } from "./pathCaseFolding.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { isDirectlyUnderClaudeWorktreesDir } from "../daemon/jobs/killJob.js";
import { hasInode } from "./fsSafety/hardenedRead.js";
import { IMe } from "../remote/remoteMode.js";
import { VARIADIC_VALUE_FLAGS, lastValueSlot, looksLikeOption } from "./cliArgs.js";
import { ors } from "../cli/earlyArgs.js";
import { isPersonalConfigRestricted, getPersonalConfigFixHint } from "./personalConfigRestriction.js";
import { isRestrictedMode } from "./envUtils.js";
import { isInITerm2 } from "./swarm/backends/detection.js";
import { sequential } from "./sequential.js";
import { safeExecFile } from "./safeSpawn.js";
import { HostScoped } from "./hostScoped.js";

//@ chunk-e6aww6q8.js:3594932-3595112 placement = isClaudeSettingsPath (0.871)
function hasSandboxEnabledInProjectSettings(dir) {
  return ["settings.json", "settings.local.json"].some((n) => {
    let expandedPath = parseSettingsFileUncached(join_94(dir, ".claude", n));
    return expandedPath.settings === null
      ? expandedPath.errors.length > 0
      : expandedPath.settings.sandbox?.enabled === !0;
  });
}
//@ chunk-e6aww6q8.js:3595112-3595272 facade-exports
function persistWorktreeSession(e, n) {
  G8t(e);
  let r =
    e !== null
      ? (() => {
          let { liveLaunchAnchor: liveLaunchAnchor, originalChangeset: originalChangeset, ...y } = e;
          return y;
        })()
      : void 0;
  saveCurrentProjectConfig((s) => ({ ...s, activeWorktreeSession: r }), n);
}
//@ chunk-e6aww6q8.js:3595272-3595355 facade-exports
class WorktreeIsolationError extends Error {
  constructor(e) {
    super(e);
    this.name = "WorktreeIsolationError";
  }
}
//@ chunk-e6aww6q8.js:3595355-3595657 facade-exports
function throwAgentWorktreeNotGitRefusal() {
  throw (
    logFeatureBad("git_worktree_create", "git_worktree_create_not_git_repo"),
    new WorktreeIsolationError(
      "Cannot create agent worktree: not in a git repository and no WorktreeCreate hooks are configured. Configure WorktreeCreate/WorktreeRemove hooks in settings.json to use worktree isolation with other VCS systems.",
    )
  );
}
//@ chunk-e6aww6q8.js:3595657-3596040 facade-exports
function refuseUnavailableWorktree(e) {
  if (env.CLAUDE_CODE_EVAL_CONFINED)
    throw (
      logFeatureBad("git_worktree_create", "git_worktree_create_eval_confined"),
      new WorktreeIsolationError(
        `Cannot create ${e}: worktree isolation is unavailable in this session (plugin evaluation harness)`,
      )
    );
  if (isDiskless())
    throw (
      logFeatureBad("git_worktree_create", "git_worktree_create_diskless"),
      new WorktreeIsolationError(
        `Cannot create ${e}: worktree isolation is unavailable in a session without a disk`,
      )
    );
}
//@ chunk-e6aww6q8.js:3596040-3596127 layout
class WorktreeGitTransientError extends Error {
  constructor(e) {
    super(e);
    this.name = "WorktreeGitTransientError";
  }
}
//@ chunk-e6aww6q8.js:3596127-3596185 facade-exports
function validateWorktreeSlug(e) {
  let n = validateWorktreeSlug_2(e);
  if (n !== void 0) throw Error(n);
}
//@ chunk-e6aww6q8.js:3596185-3596273 layout
function isUnsafeWorktreeSlugPath(e) {
  return containsPathTraversal(e) || isAbsolute_46(e) || e.split(/[/\\]/).some((n) => /^\.\.[ .]*$/.test(n));
}
//@ chunk-e6aww6q8.js:3596273-3596601 layout
async function hasUnsafeAncestor(e, n) {
  let r = dirname_51(e);
  for (;;)
    try {
      let s = await realpath_28(r);
      if (!(await isPathUnderIdentity(n, s))) return !0;
      break;
    } catch (error) {
      if (getErrnoCode(error) !== "ENOENT") return !0;
      if ((await lstat_31(r).catch((S) => (getErrnoCode(S) === "ENOENT" ? null : S))) != null) return !0;
      let y = dirname_51(r);
      if (y === r) return !0;
      r = y;
    }
  try {
    if ((await lstat_31(e)).isSymbolicLink()) return !0;
  } catch (error) {
    if (getErrnoCode(error) !== "ENOENT") return !0;
  }
  return !1;
}
/**
 * 把仓库中的指定目录（如 node_modules）以符号链接方式挂到 worktree，避免重复安装。
 */
//@ chunk-e6aww6q8.js:3596601-3597450 fingerprint = symlinkDirectories (0.642)
async function symlinkDirectories(repoRootPath, worktreePath, dirsToSymlink) {
  let s;
  try {
    s = await realpath_28(worktreePath);
  } catch (error) {
    logForDebugging(`Skipping symlinkDirectories: realpath(${worktreePath}) failed: ${errorMessage(error)}`, {
      level: "warn",
    });
    return;
  }
  for (let dir of dirsToSymlink) {
    if (isUnsafeWorktreeSlugPath(dir)) {
      logForDebugging(`Skipping symlink for "${dir}": path traversal or absolute path`, { level: "warn" });
      continue;
    }
    let sourcePath = join_91(repoRootPath, dir),
      destPath = join_91(worktreePath, dir);
    if (await hasUnsafeAncestor(destPath, s)) {
      logForDebugging(`Skipping symlink for "${dir}": destination escapes worktree via committed symlink`, {
        level: "warn",
      });
      continue;
    }
    try {
      await lstat_31(sourcePath);
    } catch (error) {
      if (isENOENT(error))
        logForDebugging(`Skipping symlink for "${dir}": source does not exist in main repository`);
      else
        logForDebugging(
          `Skipping symlink for "${dir}": lstat failed (${getErrnoCode(error) ?? "unknown"}): ${errorMessage(error)}`,
          { level: "warn" },
        );
      continue;
    }
    try {
      (await symlink_2(sourcePath, destPath, "dir"),
        logForDebugging(`Symlinked ${dir} from main repository to worktree to avoid disk bloat`));
    } catch (error) {
      let code = getErrnoCode(error);
      if (code !== "ENOENT" && code !== "EEXIST")
        logForDebugging(`Failed to symlink ${dir} (${code ?? "unknown"}): ${errorMessage(error)}`, {
          level: "warn",
        });
    }
  }
}
//@ chunk-e6aww6q8.js:3597450-3597473 facade-exports
function restoreWorktreeSession(e) {
  G8t(e);
}
//@ chunk-e6aww6q8.js:3597473-3597534 facade-exports
function generateTmuxSessionName(repoPath, branch) {
  return `${basename_51(repoPath)}_${branch}`.replace(/[/.]/g, "_");
}
//@ chunk-e6aww6q8.js:3597534-3597612 facade-exports
function resolveWorktreeCleanupRoot(e, n) {
  let r = findCanonicalGitRoot(e);
  if (r && isAgentWorktreeOf(e, r)) return r;
  return (n ? findCanonicalGitRoot(n) : null) ?? r;
}
//@ chunk-e6aww6q8.js:3597612-3597660 facade-exports
function isAgentWorktreeOf(e, n) {
  return resolve_37(dirname_51(e)) === resolve_37(getClaudeWorktreesDir(n));
}
//@ chunk-e6aww6q8.js:3597660-3597705 file-local
function flattenSlug(slug) {
  return slug.replaceAll("/", "+");
}
//@ chunk-e6aww6q8.js:3597705-3597748 facade-exports = worktreeBranchName (1)
function worktreeBranchName(slug) {
  return `worktree-${flattenSlug(slug)}`;
}
//@ chunk-e6aww6q8.js:3597748-3597790 affinity
function getWorktreePathForSlug(e, n) {
  return join_91(e.dir, flattenSlug(n));
}
//@ chunk-e6aww6q8.js:3597790-3597994 affinity
async function assertWorktreeDirNotSymlink(e, n) {
  let r = await checkWorktreePath(e, n);
  if (r.ok) return;
  throw (
    logFeatureBad(
      "git_worktree_create",
      r.reason === "symlink" ? "git_worktree_create_symlink_rejected" : "git_worktree_create_lstat_failed",
    ),
    new WorktreeIsolationError(r.message)
  );
}
//@ chunk-e6aww6q8.js:3597994-3598005 affinity
var MAX_WORKTREE_SLUG_RETRIES = 20;
//@ chunk-e6aww6q8.js:3598005-3598575 affinity
async function allocateWorktreeSlug(e, n, { isGiven: isGiven, hasSessionHad: hasSessionHad }) {
  let h = Xyn(e);
  for (let L of h) await assertWorktreeDirNotSymlink(L, getWorktreePathForSlug(L, n));
  if (
    isGiven &&
    (!hasSessionHad(n) ||
      (await Promise.all(h.map((L) => readWorktreeHeadSha(getWorktreePathForSlug(L, n))))).some(
        (L) => L !== null,
      ))
  )
    return { slug: n, number: 1 };
  let y = new Set(
      (
        await Promise.all(
          h.map((L) =>
            readdir_25(L.dir).then(
              (G) => G.map((q) => q.toLowerCase()),
              (G) => {
                if (isENOENT(G)) return [];
                throw G;
              },
            ),
          ),
        )
      ).flat(),
    ),
    S = await resolveGitDir(e),
    w = isEphemeralWorktreeSlug(n);
  for (let L = 1; L <= MAX_WORKTREE_SLUG_RETRIES; L++) {
    let G = L === 1 ? n : suffixWorktreeSlug(n, L);
    if (
      !hasSessionHad(G) &&
      (w || !isEphemeralWorktreeSlug(G)) &&
      !y.has(flattenSlug(G).toLowerCase()) &&
      (S === null || (await resolveRef(S, `refs/heads/${worktreeBranchName(G)}`)) === null)
    )
      return { slug: G, number: L };
  }
  return { slug: n, number: 0 };
}
/**
 * 检查 worktree 路径相对仓库根的每一段是否为符号链接或无法验证，防止仓库内提交的符号链接把 worktree 引到仓库外。
 */
//@ chunk-e6aww6q8.js:3598575-3599093 affinity
async function findSymlinkInWorktreeAncestry(e, n) {
  if (cl(e) || cl(n)) return { component: e, kind: "unverifiable" };
  ((e = Mn(e)), (n = Mn(n)));
  let r = (y) => !y || y === ".." || y.startsWith(`..${sep_53}`) || isAbsolute_46(y),
    s = relative_34(n, e);
  if (r(s)) {
    let y = relative_34(ux(n, "foldingPlatforms"), ux(e, "foldingPlatforms"));
    if (r(y)) return null;
    s = Tc(normalize_7(e)).split(sep_53).slice(-y.split(sep_53).length).join(sep_53);
  }
  let h = n;
  for (let y of s.split(sep_53)) {
    h = join_91(h, y);
    let S;
    try {
      S = await lstat_31(h);
    } catch (error) {
      if (isENOENT(error)) return null;
      return { component: h, kind: "unverifiable" };
    }
    if (S.isSymbolicLink()) return { component: h, kind: "symlink" };
  }
  return null;
}
//@ chunk-e6aww6q8.js:3599093-3599115 affinity
var CLAUDE_BASE_ENV = "CLAUDE_BASE";
/**
 * 移除 agent worktree 时把 .git 指针文件（gitdir: …）写回目录；目录已不存在或 inode/dev 与核验时不一致则不写。EEXIST/ENOENT 之外的失败记 warn。
 */
//@ chunk-e6aww6q8.js:3599365-3599839 sole-consumer
async function restoreWorktreeGitPointer(e, n, r) {
  let s = await lstat_31(e).catch(() => null);
  if (s === null || !s.isDirectory() || s.ino !== r.ino || s.dev !== r.dev) {
    logForDebugging(
      `removeAgentWorktree: not restoring the .git pointer of ${e} \u2014 the directory is gone or no longer the one that was vetted`,
      { level: "warn" },
    );
    return;
  }
  await writeFile_11(
    join_91(e, ".git"),
    `gitdir: ${n}
`,
    { flag: "wx" },
  ).catch((h) => {
    let y = getErrnoCode(h);
    if (y !== "EEXIST" && y !== "ENOENT")
      logForDebugging(`removeAgentWorktree: could not restore the .git pointer of ${e}: ${errorMessage(h)}`, {
        level: "warn",
      });
  });
}
/**
 * 把 worktree 的基准提交写到 gitdir 下的 CLAUDE_BASE 文件（先写临时文件再独占创建）；原文件不是普通文件或有多个硬链接时记埋点并替换。
 */
//@ chunk-e6aww6q8.js:3599839-3600295 sole-consumer
async function writeWorktreeBaseline(e, n) {
  let r = await resolveGitDir_2(e);
  if (!r) {
    logForDebugging(`[worktree] cannot write baseline: gitdir unresolvable for ${e}`);
    return;
  }
  let s = join_91(r, CLAUDE_BASE_ENV);
  try {
    let h = !1;
    try {
      let S = await lstat_31(s);
      h = !S.isFile() || S.nlink !== 1;
    } catch {}
    let y = await writeIfMissing(s, n);
    if ((await tryCreateExclusive(y, s), h))
      (logFeatureSad("git_worktree_create", "git_worktree_baseline_plant_replaced"),
        logForDebugging(`[worktree] replaced a non-regular or multi-link CLAUDE_BASE leaf at ${s}`));
  } catch (error) {
    logForDebugging(`[worktree] failed to write baseline to ${r}: ${error}`);
  }
}
//@ chunk-e6aww6q8.js:3600295-3600472 sole-consumer = tryCreateExclusive (0.782)
async function tryCreateExclusive(e, n) {
  try {
    try {
      await retryFsOp(e, n);
    } catch (error) {
      if (getPlatform() === "windows" && getErrnoCode(error) === "EEXIST")
        (await unlink_10(n), await retryFsOp(e, n));
      else throw error;
    }
  } catch (error) {
    throw (await unlink_10(e).catch(() => {}), error);
  }
}
/**
 * 复制 .worktreeinclude 文件：开关 tengu_squishy_spring 关闭时直接 copyFile；否则复制到临时文件再独占改名，遇到瞬时 FS 错误退回为独占创建。
 */
//@ chunk-e6aww6q8.js:3600472-3600825 sole-consumer
async function copyIncludedFileSafely(e, n) {
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_squishy_spring", !0)) {
    await copyFile_4(e, n);
    return;
  }
  let r = await copyIntoTemp(e, n);
  try {
    await tryCreateExclusive(r, n);
  } catch (error) {
    let h = getErrnoCode(error);
    if (h !== void 0 && TRANSIENT_FS_ERRORS_2.has(h)) {
      logForDebugging(
        `[worktree] rename of the staged copy onto ${n} failed (${errorMessage(error)}); creating it exclusively instead`,
        { level: "warn" },
      );
      try {
        await assertSafeThenWrite(e, n);
      } finally {
        await unlink_10(r).catch(() => {});
      }
      return;
    }
    throw error;
  }
}
//@ chunk-e6aww6q8.js:3600825-3601052 affinity
async function readWorktreeBaseline_2(e) {
  let n = await resolveGitDir_2(e);
  if (!n) return { kind: "unreadable" };
  try {
    let trimmed = (await readFile_15(join_91(n, CLAUDE_BASE_ENV), "utf-8")).trim();
    return isValidGitSha(trimmed) ? { kind: "recorded", sha: trimmed } : { kind: "unreadable" };
  } catch (error) {
    return { kind: isENOENT(error) ? "absent" : "unreadable" };
  }
}
//@ chunk-e6aww6q8.js:3601052-3601119 facade-exports
async function isWorktreeMadeElsewhere(e) {
  return mXn() && (await readWorktreeBaseline_2(e)).kind === "absent";
}
//@ chunk-e6aww6q8.js:3601119-3601198 facade-exports
async function readWorktreeBaseline(e) {
  let n = await readWorktreeBaseline_2(e);
  return n.kind === "recorded" ? n.sha : null;
}
//@ chunk-e6aww6q8.js:3601198-3601314 layout
var WORKTREE_STALE_AGE_MS = 86400000,
  WORKTREE_GIT_TIMEOUT_MS = 5000,
  WORKTREE_FETCH_TIMEOUT_MS = 120000,
  MISSING_REMOTE_REF_RE = /^fatal: couldn't find remote ref /im,
  FETCH_FROM_LINE_RE = /(?:^|\n)From ([^\r\n]+)/,
  MAX_CHECKOUT_WORKERS = 16;
//@ chunk-e6aww6q8.js:3601314-3601507 layout
async function checkoutWorkersArgs(e) {
  if (
    (
      await execFileNoThrowWithCwd(gitExe(), [...freeze_23, "config", "--get-all", "checkout.workers"], {
        cwd: e,
        env: buildGitEnvForRepo(e),
      })
    ).code === 0
  )
    return [];
  return ["-c", `checkout.workers=${Math.min(MAX_CHECKOUT_WORKERS, Math.max(1, availableParallelism_2()))}`];
}
//@ chunk-e6aww6q8.js:3601507-3601783 layout = isRealPathWithinTeamDir (0.762)
async function isNotFoundErrno_2(e, n, r) {
  if (
    rMn() ||
    hasSandboxEnabledInProjectSettings(e) ||
    (n !== null && hasSandboxEnabledInProjectSettings(n)) ||
    (r !== null && hasSandboxEnabledInProjectSettings(r))
  )
    return !0;
  for (let { dir: dir } of Xyn(e))
    try {
      if (
        (await readdir_25(dir, { withFileTypes: !0 })).some(
          (h) => h.isDirectory() && hasSandboxEnabledInProjectSettings(join_91(dir, h.name)),
        )
      )
        return !0;
    } catch (error) {
      let code = getErrnoCode(error);
      if (code !== "ENOENT" && code !== "ENOTDIR") return !0;
    }
  return !1;
}
//@ chunk-e6aww6q8.js:3601783-3601831 layout
function kMn(e, n) {
  return inspectPartialClone(e, (r) => isNotFoundErrno_2(e, n, r));
}
//@ chunk-e6aww6q8.js:3601831-3601841 layout
var YIr = 2;
/**
 * 重新核验 worktree：状态干净、HEAD 仍是 s、分支仍是 refs/heads/r，且锁不被另一个同启动时间的存活进程持有。
 */
//@ chunk-e6aww6q8.js:3601841-3602246 layout
async function isWorktreeCleanOnBranch(e, n, r, s) {
  let h = await getFilterNeutralizingArgs(e);
  if (h === null) return !1;
  let [y, S] = await Promise.all([
    execFileNoThrowWithCwd(gitExe(), [...h, ...freeze_23, "--no-optional-locks", ...freeze_2_2], {
      cwd: e,
      env: buildGitEnvForRepo(e),
    }),
    execFileNoThrowWithCwd(gitExe(), [...freeze_23, "rev-parse", "HEAD", "--symbolic-full-name", "HEAD"], {
      cwd: e,
      env: buildGitEnvForRepo(e),
    }),
  ]);
  if (
    y.code !== 0 ||
    y.stdout.trim().length > 0 ||
    S.code !== 0 ||
    S.stdout.trim() !==
      `${s}
refs/heads/${r}`
  )
    return !1;
  try {
    return !(await isLockHeldByLiveSameStartProcess(await readWorktreeLockReason(e, n)));
  } catch {
    return !1;
  }
}
/**
 * 恢复已有 worktree 时尝试把它快进重置到 origin 默认分支的新基准：要求分支未变、工作区干净、子模块无改动、上游已 gone 且无独有提交、无他人持锁，
 * 必要时先补取部分克隆缺的对象，再 reset。任何前提不满足都返回 null（保留旧基准）。
 */
//@ chunk-e6aww6q8.js:3602246-3604218 layout
async function fastResumeResetToNewBase(repoRoot, worktreePath, branch, headSha, baselineSha) {
  let [y, S] = await Promise.all([getDefaultBranch(), resolveGitDir(repoRoot)]),
    w = y && !y.startsWith("-") ? y : null,
    L = w && S ? await resolveRef(S, `refs/remotes/origin/${w}`) : null;
  if (!L || L === headSha) return null;
  let G = await execFileNoThrowWithCwd(gitExe(), [...freeze_23, "symbolic-ref", "--short", "-q", "HEAD"], {
    cwd: worktreePath,
    env: buildGitEnvForRepo(worktreePath),
  });
  if (G.code !== 0 || G.stdout.trim() !== branch) return null;
  let q = await getFilterNeutralizingArgs(worktreePath);
  if (q === null) return null;
  let Z = await execFileNoThrowWithCwd(gitExe(), [...q, ...freeze_23, ...freeze_2_2], {
    cwd: worktreePath,
    env: buildGitEnvForRepo(worktreePath, void 0, { userLocale: !0 }),
  });
  if (Z.code !== 0 || Z.stdout.trim().length > 0)
    return (
      logForDebugging(
        `[worktree] fast-resume reset skipped for ${worktreePath}: ` +
          (Z.code !== 0 ? `status failed (code ${Z.code})` : "tree read dirty under filter-driver-off pins"),
      ),
      null
    );
  let Se = await inspectSubmodules(worktreePath);
  if (Se.kind !== "verified" || submoduleChanges(Se) !== void 0) return null;
  if (!(baselineSha !== null && headSha === baselineSha)) {
    let We = await getDefaultRemoteRef(repoRoot);
    if (We === null || !(await isUpstreamGoneAndMerged(worktreePath, We))) return null;
  }
  try {
    if (await isLockHeldByLiveSameStartProcess(await readWorktreeLockReason(worktreePath, repoRoot)))
      return null;
  } catch {
    return null;
  }
  let we = await kMn(repoRoot, worktreePath),
    Ee = await explainPartialCloneFailure(
      repoRoot,
      L,
      we,
      () => readSparseCheckoutConfig(worktreePath),
      YIr,
    ).catch((We) => ({ failure: errorMessage(We), fetches: 0 }));
  if (Ee.failure !== null)
    return (
      logForDebugging(
        `[worktree] resumed worktree ${worktreePath} keeps its old base; the objects its new base ${L} needs were not fetched: ${Ee.failure}`,
      ),
      null
    );
  if (
    we.inForce &&
    (await readSparseCheckoutConfig(worktreePath)
      .then((We) => hasMissingSparseObjects(repoRoot, L, We))
      .catch(() => !0))
  )
    return (
      logForDebugging(
        `[worktree] resumed worktree ${worktreePath} keeps its old base: moving it to ${L} needs objects this repository does not have (or they could not be listed)`,
      ),
      null
    );
  let Ae = await checkoutWorkersArgs(worktreePath);
  if (we.inForce && !(await isWorktreeCleanOnBranch(worktreePath, repoRoot, branch, headSha)))
    return (
      logForDebugging(
        `[worktree] fast-resume reset skipped for ${worktreePath}: after listing or fetching the objects for ${L}, a re-check found the worktree dirty, off its commit or branch, claimed by another session, or unreadable`,
      ),
      null
    );
  let Ie = await getFilterNeutralizingArgs(worktreePath);
  if (Ie === null) return null;
  if (
    (
      await execFileNoThrowWithCwd(gitExe(), [...Ie, ...freeze_23, ...Ae, "reset", "--hard", L, "--"], {
        cwd: worktreePath,
        env: withSafeGitConfig(worktreePath, doe(we)),
      })
    ).code !== 0
  )
    return (
      logForDebugging(
        `[worktree] could not reset resumed worktree ${worktreePath} to ${L}; resuming it unchanged`,
      ),
      null
    );
  return (
    await writeWorktreeBaseline(worktreePath, L),
    logForDebugging(
      `[worktree] reset resumed worktree ${worktreePath} to ${L} \u2014 its previous work was fully upstream`,
    ),
    L
  );
}
/**
 * 目录存在但 gitdir 已不存在的孤儿 worktree：确认 .git 指向本仓库的 worktrees 目录、分支没有未推送提交后删除该目录；任一 git 命令失败都拒绝自愈并抛错。
 */
//@ chunk-e6aww6q8.js:3604218-3606147 layout
async function selfHealOrphanedWorktreeDir(repoRoot, worktreesDir, worktreePath, branch) {
  let h = await resolveGitDir_2(worktreePath);
  if (!h) return;
  let y = !1;
  try {
    await readdir_25(h);
  } catch (error) {
    y = isENOENT(error);
  }
  if (!y) return;
  let S = await resolveGitDir(repoRoot);
  if (S) {
    let G = Mn(resolve_37(dirname_51(h))),
      q = Mn(resolve_37(join_91(S, "worktrees"))),
      Z = await realpath_28(S).then(
        (Se) => Mn(join_91(Se, "worktrees")),
        () => null,
      );
    if (G !== q && G !== Z)
      throw new WorktreeIsolationError(
        `The folder ${hideUnsafePath(worktreePath)} is a leftover worktree whose .git file points to another location, so it was left as is. Remove it if it has no work to keep, or choose a different worktree name.`,
      );
  }
  let w = await execFileNoThrowWithCwd(gitExe(), [...freeze_23, "remote"], {
    cwd: repoRoot,
    env: buildGitEnvForRepo(repoRoot),
  });
  if (w.code !== 0)
    throw Error(
      `Orphaned worktree dir at ${hideUnsafePath(worktreePath)} but \`git remote\` failed (git said ${printableLabel(getFirstLine(w.stderr.trim()), { head: 60, tail: 120 }) || "nothing"}) \u2014 refusing to self-heal. Remove ${hideUnsafePath(worktreePath)} manually if it has no work to keep.`,
    );
  let L = await execFileNoThrowWithCwd(gitExe(), [...freeze_23, "rev-parse", "--verify", "--quiet", branch], {
    cwd: repoRoot,
    env: buildGitEnvForRepo(repoRoot),
  });
  if (L.code !== 0 && L.stderr.trim().length > 0)
    throw Error(
      `Orphaned worktree dir at ${hideUnsafePath(worktreePath)} but rev-parse on ${branch} failed (git said ${printableLabel(getFirstLine(L.stderr.trim()), { head: 60, tail: 120 }) || "nothing"}) \u2014 refusing to self-heal. Remove ${hideUnsafePath(worktreePath)} manually if it has no work to keep.`,
    );
  if (w.stdout.trim().length > 0 && L.code === 0) {
    let G = await execFileNoThrowWithCwd(
      gitExe(),
      [...freeze_23, "rev-list", "--max-count=1", branch, "--not", "--remotes"],
      { cwd: repoRoot, env: buildGitEnvForRepo(repoRoot) },
    );
    if (G.code !== 0)
      throw Error(
        `Orphaned worktree dir at ${hideUnsafePath(worktreePath)} but rev-list on ${branch} failed (git said ${printableLabel(getFirstLine(G.stderr.trim()), { head: 60, tail: 120 }) || "nothing"}) \u2014 refusing to self-heal. Remove ${hideUnsafePath(worktreePath)} manually if it has no work to keep.`,
      );
    if (G.stdout.trim().length > 0)
      throw Error(
        `Orphaned worktree dir at ${hideUnsafePath(worktreePath)} but branch ${branch} has unpushed commits \u2014 refusing to self-heal. Push or delete the branch, then retry.`,
      );
  }
  await assertWorktreeDirNotSymlink(worktreesDir, worktreePath);
  try {
    (await rm_19(worktreePath, { recursive: !0, force: !0 }),
      logForDebugging(`[worktree] removed orphaned worktree directory at ${worktreePath}`));
  } catch (error) {
    throw Error(
      `Cannot self-heal orphaned worktree at ${hideUnsafePath(worktreePath)}: it could not be removed${getErrnoCode(error) ? ` (${getErrnoCode(error)})` : ""}. Remove manually to proceed.`,
    );
  }
}
//@ chunk-e6aww6q8.js:3606147-3606276 layout
async function candidateWorktreePaths(e, n) {
  let r = await realpath_28(e.anchor).catch(() => null);
  return [join_91(e.dir, basename_51(n)), ...(r === null ? [] : [join_91(s4r(e, r).dir, basename_51(n))])];
}
//@ chunk-e6aww6q8.js:3606276-3606391 layout
async function isSameRegisteredPath(e, n, r) {
  let s = findSamePath(e, n);
  if (s === null) return !1;
  if (isOnForeignMount(e, s)) return !1;
  return (await comparePathIdentity(e, s, r)) === "same";
}
/**
 * 比较两个路径是否指向同一目录/文件：两侧祖先都无链接（P1 为 clear）后用 bigint lstat 比较 dev/ino，前后两次检查防竞态；
 * 返回 same / different / unknown / unreadable / untrusted（inode 不可信）。
 */
//@ chunk-e6aww6q8.js:3606391-3607352 layout
async function comparePathIdentity(pathA, pathB, above, kind = "directory") {
  let h = Tc(normalize_7(pathA)),
    y = Tc(normalize_7(pathB)),
    [S, w] = await Promise.all([
      P1(kind === "file" ? dirname_51(h) : h, above),
      P1(kind === "file" ? dirname_51(y) : y, above),
    ]);
  if (S === "unknown" || w === "unknown") return "unknown";
  if (S !== "clear" || w !== "clear") return "different";
  let [L, G] = await Promise.all([
    lstat_31(h, { bigint: !0 }).catch(() => null),
    lstat_31(y, { bigint: !0 }).catch(() => null),
  ]);
  if (L === null || G === null) return "unreadable";
  let [q, Z] = await Promise.all([
    P1(kind === "file" ? dirname_51(h) : h, above),
    P1(kind === "file" ? dirname_51(y) : y, above),
  ]);
  if (q !== "clear" || Z !== "clear") return q === "unknown" || Z === "unknown" ? "unknown" : "different";
  if (!(kind === "file" ? L.isFile() && G.isFile() : L.isDirectory() && G.isDirectory())) return "different";
  if (isSentinelInode(L.ino) !== isSentinelInode(G.ino)) return "different";
  if (L.dev !== 0n && G.dev !== 0n && L.dev !== G.dev) return "different";
  if (isSentinelInode(L.ino) || L.dev === 0n || G.dev === 0n) return "untrusted";
  let ke = await lstat_31(dirname_51(h), { bigint: !0 }).catch(() => null);
  if (ke !== null && L.dev === ke.dev && L.ino === ke.ino) return "untrusted";
  return L.dev === G.dev && L.ino === G.ino ? "same" : "different";
}
//@ chunk-e6aww6q8.js:3607352-3607411 layout = getReservedShortcuts (1)
function isCaseInsensitivePlatform() {
  let platform = getPlatform();
  return platform === "windows" || platform === "macos";
}
//@ chunk-e6aww6q8.js:3607411-3607487 layout
function ux(e, n) {
  let r = Tc(Mn(e));
  return n === "everyPlatform" || isCaseInsensitivePlatform() ? foldCaseForCompare_2(r) : r;
}
//@ chunk-e6aww6q8.js:3607487-3607591 layout
function isIdentityMatch(e, n, r, s) {
  return (
    e === "same" ||
    (e === "untrusted" &&
      (n === "everyPlatform" || isCaseInsensitivePlatform()) &&
      foldCaseForCompare(r) === foldCaseForCompare(s))
  );
}
//@ chunk-e6aww6q8.js:3607591-3607727 layout
function foldCaseForCompare(e) {
  return Tc(Mn(e)).replace(/\p{Lu}/gu, (n) => {
    if (n.length > 1) return n;
    let lower = n.toLowerCase();
    return lower.toUpperCase() === n ? lower : n;
  });
}
//@ chunk-e6aww6q8.js:3607727-3607891 layout
async function isSamePathIdentity(e, n, r = {}) {
  if (Tc(normalize_7(e)) === Tc(normalize_7(n))) return !0;
  let s = r.foldOn ?? "foldingPlatforms";
  return ux(e, s) === ux(n, s) && isIdentityMatch(await comparePathIdentity(e, n, r.above, r.kind), s, e, n);
}
/**
 * 判断 n 是否在 e 之下（strictly 时不含相等）：先按规范化字符串，再在大小写折叠平台上按前缀段的 inode 身份比较。
 */
//@ chunk-e6aww6q8.js:3607891-3608241 layout
async function isPathUnderIdentity(e, n, r = {}) {
  let s = r.strictly ?? !1,
    h = Tc(normalize_7(e)),
    y = Tc(normalize_7(n));
  if (y.startsWith(h + sep_53)) return !0;
  if (y === h) return !s;
  let S = r.foldOn ?? "foldingPlatforms",
    w = ux(h, S),
    L = ux(y, S),
    G = h.split(sep_53).length,
    parts = y.split(sep_53);
  if (parts.length < G || (s && parts.length === G) || (L !== w && !L.startsWith(w + sep_53))) return !1;
  let joined = parts.slice(0, G).join(sep_53);
  return isIdentityMatch(await comparePathIdentity(joined, h, r.above), S, joined, h);
}
/**
 * 撤销一次 worktree add 的结果：核验注册信息与仓库一致、从 git worktree list 找到该分支（或按 byPathIn 路径）的 worktree，
 * 排除主 worktree、他机、含链接或不完整的路径后安全删除；不能删除时视情况删掉 .git 指针并记 "Kept worktree registration"。返回是否已删除。
 */
//@ chunk-e6aww6q8.js:3608241-3611558 layout
async function removeWorktreeRegistration(repoRoot, branch, worktreePath, options = {}) {
  let h = options.onlyIfRegisteredAt === void 0,
    y = await realpath_28(repoRoot).catch(() => null),
    S = async (
      we,
      { deregister: Ee = options.deregisterOnKeep === "ifOwned" ? h : (options.deregisterOnKeep ?? !0) } = {},
    ) => {
      if (
        (logForDebugging(`Kept worktree registration for ${branch}: ${we}`, { level: "warn" }),
        Ee &&
          (await Ldr(worktreePath, repoRoot)) &&
          (await readlink_5(worktreePath).then(
            () => !1,
            (Ae) => getErrnoCode(Ae) === "EINVAL",
          )))
      )
        await unlink_10(join_91(worktreePath, ".git")).catch(() => {});
      return !1;
    },
    w = await vetWorktreeRegistration(repoRoot);
  if (!w.ok) return S(w.reason, { ...(w.outcome === "unlisted" && { deregister: !1 }) });
  let L = await isSameRepository(w.root, w.gitDir);
  if ("refused" in L) return S(L.refused, { deregister: !1 });
  let G = ["--git-dir", w.gitDir],
    q = async (we) => {
      let Ee = await verifyPinnedGitDir(w, resolveGitDirsOrPlaceholder(repoRoot));
      return "refused" in Ee
        ? Ee
        : execFileNoThrowWithCwd(gitExe(), [...freeze_23, ...G, ...we], { cwd: repoRoot, env: Ee.env });
    },
    Z = await q(["worktree", "list", "--porcelain", "-z"]);
  if ("refused" in Z) return S(Z.reason, { deregister: !1 });
  let Se;
  if (Z.code === 0) {
    let we;
    if (options.byPathIn) {
      let byPathIn = options.byPathIn,
        Me = basename_51(worktreePath),
        We = byPathIn.anchor === repoRoot ? y : await realpath_28(byPathIn.anchor).catch(() => null),
        ze = [...(We === null ? [] : [join_91(s4r(byPathIn, We).dir, Me)]), join_91(byPathIn.dir, Me)];
      if (((we = findWorktreeMatchingPaths(Z.stdout, ze)), we === null))
        return S(`git lists no worktree at ${ze.join(" or ")}`);
    } else if (((we = findUniqueWorktreeForBranch(Z.stdout, branch)), we === null))
      return S("git lists no worktree checked out on it");
    if (
      options.onlyIfRegisteredAt !== void 0 &&
      !containsSamePath(we, options.onlyIfRegisteredAt) &&
      !(await isSameRegisteredPath(we, options.onlyIfRegisteredAt, repoRoot))
    )
      return (
        logForDebugging(
          `Kept worktree registration for ${branch}: ${we} is not at ${options.onlyIfRegisteredAt.join(" or ")}, so this add did not create it`,
          { level: "warn" },
        ),
        !1
      );
    if (((h = !0), findSamePath(we, [repoRoot, ...(y === null ? [] : [y])]) !== null))
      return (
        logForDebugging(`Kept worktree registration for ${branch}: it names the main worktree`, {
          level: "warn",
        }),
        !1
      );
    if (isOnForeignMount(we, repoRoot))
      return (
        logForDebugging(`Kept worktree registration for ${branch}: ${we} is on another host`, {
          level: "warn",
        }),
        !1
      );
    let Ee = await P1(we, repoRoot);
    if (Ee === "missing") {
      let Ie = await isSameRepository(w.root, w.gitDir);
      if ("refused" in Ie)
        logForDebugging(`Kept worktree registration for ${branch}: ${Ie.refused}`, { level: "warn" });
      return (
        ("refused" in Ie
          ? { outcome: "kept", reason: Ie.refused }
          : await deregisterWorktree(Ie.gitDir, { worktreePath: we, repoSpelled: w.root }, { locked: "keep" })
        ).outcome === "dropped"
      );
    }
    if (Ee !== "clear") return S(`${we} has a link in a component, or one that cannot be probed`);
    let Ae = await realpath_28(we).catch(() => null);
    if (Ae === null) return S(`${we} does not resolve`);
    if (y !== null && Tc(Ae) === Tc(y))
      return (
        logForDebugging(`Kept worktree registration for ${branch}: it resolves to the main worktree`, {
          level: "warn",
        }),
        !1
      );
    if (!(await isRemovableWorktreeDir(we, Ae, repoRoot)))
      return S(`${we} is not intact (a link may have been introduced)`);
    Se = KJr(we);
  } else if (await gitSupportsPartialCloneFetch(repoRoot))
    return S("could not read git's worktree list", { deregister: !1 });
  else {
    if (!(await Ldr(worktreePath, repoRoot))) return S(`${worktreePath} has a link in a component`);
    let we = await realpath_28(worktreePath).catch(() => null);
    if (we === null || !(await isRemovableWorktreeDir(worktreePath, we, repoRoot)))
      return S(`${worktreePath} is not intact`);
    Se = worktreePath;
  }
  let ke = await removeWorktreeSafely(repoRoot, Se, {
    git: { dir: L.gitDir, root: w.root },
    deregisterIfStopped: options.dropIfStopped === !0,
  });
  if (ke.outcome === "unanchored") {
    let we = await q(["worktree", "remove", "--force", Se]);
    if ("refused" in we) return S(we.reason, { deregister: !1 });
    if (we.code !== 0)
      logForDebugging(`Kept worktree registration for ${branch}: git could not remove ${Se}`, {
        level: "warn",
      });
    return we.code === 0;
  }
  if (ke.outcome === "delete_failed") {
    if (ke.deregistered)
      return (
        logForDebugging(
          `Worktree for ${branch} not fully deleted, its registration dropped: ${worktreeRemovalText(ke)}`,
          { level: "warn" },
        ),
        !1
      );
    return S(worktreeRemovalText(ke), ke.started ? { deregister: !0 } : {});
  }
  if (ke.outcome !== "removed")
    logForDebugging(
      `Removing the worktree for ${branch} at ${Se} did not finish: ${worktreeRemovalText(ke)}`,
      { level: "warn" },
    );
  return ke.outcome === "removed";
}
/**
 * 用 git rev-parse（或 exactRef 时 show-ref）解析 worktree 的基准提交；失败时按退出码/超时/输出分类原因、记埋点，并抛出带诊断建议的错误。
 */
//@ chunk-e6aww6q8.js:3611558-3614484 layout
async function resolveWorktreeBaseSha({
  base: base,
  kind: kind,
  failure: failure,
  cwd: cwd,
  root: root,
  exactRef: exactRef,
}) {
  let S = buildGitEnvForRepo(root),
    w = exactRef === !0 ? "show-ref" : "rev-parse",
    {
      stdout: stdout,
      stderr: stderr,
      code: code,
      exitCode: exitCode,
      timedOut: timedOut,
    } = await execFileNoThrowWithCwd(
      gitExe(),
      exactRef === !0
        ? [...freeze_23, "show-ref", "--verify", "--hash", base]
        : [...freeze_23, "rev-parse", "--verify", "--quiet", base],
      { cwd: cwd, env: S },
    ),
    trimmed = stdout.trim();
  if (code === 0 && trimmed !== "") return trimmed;
  logFeatureBad("git_worktree_create", "git_worktree_create_revparse_failed");
  let trimmed_2 = stderr.trim(),
    Ee = exactRef === !0 && exitCode === 128 && trimmed_2 === `fatal: '${base}' - not a valid ref`,
    Ae =
      code === 0
        ? "empty_answer"
        : timedOut
          ? "timed_out"
          : exitCode === void 0
            ? "not_completed"
            : exitCode === 1
              ? trimmed_2 === "" && trimmed === ""
                ? "name_missing"
                : "exit_1_with_output"
              : Ee
                ? "name_missing"
                : exitCode === 128
                  ? "git_refused"
                  : "other_exit",
    Ie = S.GIT_DIR === NOT_A_GIT_REPO_PATH ? "no" : "yes",
    mapped = truncateToLength(trimmed_2, 65536)
      .split(
        `
`,
      )
      .map((yt) => truncateToLength(yt, 4096)),
    We =
      mapped.find((yt) => /^(fatal|error):/.test(yt)) ??
      mapped.find((yt) => yt.startsWith("warning:")) ??
      mapped.find((yt) => printableLabel(yt) !== "") ??
      "",
    ze = `git ${w} failed, and its output is not shown.`,
    lt = "the git that Claude Code runs (which may not be the one in your shell)",
    Je = `or that ${lt} is not working. Running git status in this repository may show which.`,
    nt = `It may also be that ${lt} is not working. Running git status in this repository may show more.`,
    pt =
      'To start worktrees from your current HEAD instead, set worktree.baseRef to "head" in Claude Code settings.',
    Et =
      Ae === "empty_answer"
        ? `git ${w} succeeded but printed no commit id.`
        : Ae === "timed_out"
          ? `git ${w} timed out.`
          : Ae === "not_completed"
            ? "git failed to start, or was stopped before it finished."
            : Ie === "no"
              ? "Claude Code could not confirm that this repository's .git entry belongs to the folder it is in (for example a symlinked .git, or a .git file that points elsewhere), so no worktree can be made from it."
              : Ae === "exit_1_with_output"
                ? kind === "origin_default"
                  ? `${ze} The fetch from origin succeeded, so it may be that this repository has no such ref afterwards (for example a single-branch clone of another branch, or a bare clone without a fetch refspec), ${Je} ${pt}`
                  : kind === "fetch_head"
                    ? `${ze} The fetch of the PR/MR succeeded, so it may be that FETCH_HEAD names no commit afterwards, ${Je}`
                    : `${ze} It may be that HEAD does not point to a commit (for example a new repository, or a branch without a commit yet), ${Je}`
                : Ae !== "name_missing"
                  ? `git ${w} failed (git said ${printableLabel(We, { head: 60, tail: 120 }) || (trimmed_2 === "" && trimmed === "" ? "nothing" : "nothing that can be shown here")}).`
                  : kind === "origin_default"
                    ? `the fetch from origin succeeded, but git ${w} found no such ref afterwards (for example in a single-branch clone of another branch, or a bare clone without a fetch refspec). ${pt} ${nt}`
                    : kind === "fetch_head"
                      ? `the fetch of the PR/MR succeeded, but git rev-parse returned no commit for FETCH_HEAD afterwards. ${nt}`
                      : `git rev-parse returned no commit for HEAD (for example in a new repository, or on a branch without a commit yet), so Claude Code has nothing to base a worktree on. ${nt}`;
  throw withTelemetryMessage(
    Error(`${failure}: ${Et}`),
    `worktree base not resolved (base=${kind}, cause=${Ae}, repo_confirmed=${Ie})`,
  );
}
//@ chunk-e6aww6q8.js:3614484-3614710 layout
function resolveHeadAsBase({ repoRoot: repoRoot, fromCwd: fromCwd, kind: kind }) {
  let s = fromCwd ?? repoRoot;
  return resolveWorktreeBaseSha({
    base: "HEAD",
    kind: kind,
    failure:
      kind === "head_requested"
        ? `Failed to resolve HEAD in ${hideUnsafePath(s)}`
        : 'Failed to resolve base branch "HEAD"',
    cwd: s,
    root: fromCwd === void 0 ? repoRoot : (findGitRoot(fromCwd) ?? fromCwd),
  });
}
//@ chunk-e6aww6q8.js:3614710-3615195 layout
async function readFetchHeadForRef(e, n, r) {
  let s;
  try {
    s = await readFile_15(join_91(e, "FETCH_HEAD"), "utf-8");
  } catch {
    return null;
  }
  let h = new Set([
      `'refs/${n}' of ${r}`,
      `tag '${n}' of ${r}`,
      `branch '${n}' of ${r}`,
      `remote-tracking branch '${n}' of ${r}`,
      `remote-tracking branch '${n}/HEAD' of ${r}`,
    ]),
    y,
    S = !1;
  for (let w of s.split(/\r?\n/)) {
    let [L = "", , G = ""] = w.split("\t");
    if (!isValidGitSha(L)) continue;
    if (G === `'${n}' of ${r}`) {
      if (y !== void 0 && y !== L) return null;
      y = L;
    } else if (h.has(G)) S = !0;
  }
  if (y !== void 0) return { sha: y };
  return S ? "absent" : null;
}
/**
 * 创建或复用 <repo>/.claude/worktrees/<slug>（分支 worktree-<slug>）：已存在则校验属于本仓库、未被符号链接重定向并按需刷新到基准；否则清理陈旧锁、按 worktree.baseRef（head 或默认远程分支）git worktree add。
 */
//@ chunk-e6aww6q8.js:3615195-3625933 callgraph-witnessed = getOrCreateWorktree (0.265)
async function getOrCreateWorktree(e, n, r, s) {
  refuseUnavailableWorktree("a worktree");
  let worktreePath = getWorktreePathForSlug(n, r),
    worktreeBranch = worktreeBranchName(r),
    S = s?.fromHead ?? (!s?.prNumber && getInitialSettings_2().worktree?.baseRef === "head");
  await assertWorktreeDirNotSymlink(n, worktreePath);
  let existingHead = await readWorktreeHeadSha(worktreePath);
  if (existingHead && s?.isBranchNew)
    throw (
      logFeatureBad("git_worktree_create", "git_worktree_create_numbered_name_taken"),
      new WorktreeIsolationError(
        `a worktree named "${r}" appeared while Claude Code was about to create it, so it was left as it is. Call ${ENTER_WORKTREE_TOOL_NAME} again, or pass a different name.`,
      )
    );
  if (existingHead) {
    let Je = await resolveGitDir_2(worktreePath),
      nt = await resolveGitDir(e);
    if (Je && nt) {
      let It = join_91(nt, "worktrees"),
        [Yt, qt] = await Promise.all([
          stat_18(dirname_51(Je)).catch(() => null),
          stat_18(It).catch((rn) => (isENOENT(rn) ? "enoent" : null)),
        ]);
      if (Yt !== null && qt !== null && (qt === "enoent" || Yt.dev !== qt.dev || Yt.ino !== qt.ino))
        throw (
          logFeatureBad("git_worktree_create", "git_worktree_resume_foreign_repo"),
          new WorktreeIsolationError(
            `The worktree directory at ${hideUnsafePath(worktreePath)} belongs to a different repository. Remove it if it has no work to keep, or choose a different worktree name.`,
          )
        );
    }
    let pt = await checkWorktreeIsolation(worktreePath, [], gitRootsForPath(getOriginalCwd(), e));
    if (!pt.ok)
      throw (
        logFeatureBad("git_worktree_create", "git_worktree_create_root_rejected"),
        new WorktreeIsolationError(pt.message)
      );
    let Et = await readWorktreeBaseline_2(worktreePath),
      yt = Et.kind === "recorded" ? Et.sha : null,
      gt = Et.kind === "absent" && mXn(),
      date = new Date();
    if (
      (await utimes_2(worktreePath, date, date).catch(() => {}), !S && !s?.prNumber && !s?.resumeAsIs && !gt)
    ) {
      let It = await fastResumeResetToNewBase(e, worktreePath, worktreeBranch, existingHead, yt);
      if (It)
        return {
          worktreePath: worktreePath,
          worktreeBranch: worktreeBranch,
          headCommit: It,
          existed: !0,
          refreshed: !0,
          madeElsewhere: !1,
        };
    }
    return {
      worktreePath: worktreePath,
      worktreeBranch: worktreeBranch,
      headCommit: yt ?? existingHead,
      existed: !0,
      madeElsewhere: gt,
    };
  }
  if (resolveGitDirs(e) === null && resolveGitDir_3(e))
    throw (
      logFeatureBad("git_worktree_create", "git_worktree_create_bare_layout_root"),
      new WorktreeIsolationError(
        `The .git in ${hideUnsafePath(e)} points to a bare repository, so Claude Code can't create a worktree from this directory. Start Claude Code in one of that repository's worktrees instead (git worktree add makes one).`,
      )
    );
  await selfHealOrphanedWorktreeDir(e, n, worktreePath, worktreeBranch);
  let L = await readWorktreeLockReason(worktreePath, e).catch((Je) => {
    logForDebugging(`[worktree] skipped the stale-lock self-heal for ${worktreePath}: ${errorMessage(Je)}`);
    return;
  });
  if (
    L !== void 0 &&
    CLAUDE_WORKTREE_LOCK_REASON_PATTERN.test(L) &&
    (await readdir_25(worktreePath).then(
      (Je) => Je.length === 0,
      (Je) => isENOENT(Je),
    )) &&
    !(await isLockHeldByLiveSameStartProcess(L))
  )
    await pruneWorktreeRegistration(e, worktreePath, {
      locked: {
        unlockIf: (Je) => CLAUDE_WORKTREE_LOCK_REASON_PATTERN.test(Je.trim()) && Je.trim() === L.trim(),
      },
    });
  await mkdir_18(n.dir, { recursive: !0 });
  let G,
    baseSha = null;
  if (S)
    ((baseSha = await resolveHeadAsBase({ repoRoot: e, fromCwd: s?.fromCwd, kind: "head_requested" })),
      (G = `${baseSha}^{commit}`));
  else if (s?.prNumber) {
    let Je = await resolveRemoteUrl(e),
      nt = Je ? ghIsDangerousCallback_2(Je) : null,
      pt = nt ? getGitHostKind(nt) : "other",
      Et = getFeatureValue_CACHED_MAY_BE_STALE("tengu_melodic_octopus", !0),
      yt,
      gt;
    if (Et) {
      let hn = `refs/pull/${s.prNumber}/head`,
        ho = `refs/merge-requests/${s.prNumber}/head`;
      if (pt === "github") yt = [hn];
      else if (pt === "gitlab") yt = [ho];
      else
        ((gt = s.prForge === "gitlab" ? ho : s.prForge === "github" ? hn : void 0),
          (yt = gt === ho ? [ho, hn] : [hn, ho]));
    } else {
      let hn = `pull/${s.prNumber}/head`,
        ho = `merge-requests/${s.prNumber}/head`;
      yt = pt === "gitlab" ? [ho] : pt === "github" ? [hn] : [hn, ho];
    }
    let At = Et ? resolveGitDirsOrPlaceholder(e).gitDir : "",
      It = [],
      Yt,
      qt = 1,
      Zt = "git_worktree_create_pr_fetch_failed",
      rn = "",
      pn = await getGitSshEnv(e);
    for (let hn of yt) {
      let {
        code: prFetchCode,
        stderr: prFetchStderr,
        timedOut: timedOut,
      } = await execFileNoThrowWithCwd(gitExe(), ["fetch", SAFE_UPLOAD_PACK_ARG, "origin", hn], {
        cwd: e,
        stdin: "ignore",
        ...pn,
        env: { ...pn.env, LC_ALL: "C" },
        timeout: WORKTREE_FETCH_TIMEOUT_MS,
      });
      if (((qt = prFetchCode), prFetchCode === 0)) {
        if (!Et) break;
        let Xn = FETCH_FROM_LINE_RE.exec(prFetchStderr)?.[1],
          fo = Xn === void 0 ? null : await readFetchHeadForRef(At, hn, Xn);
        if (fo && fo !== "absent") It.push({ refspec: hn, sha: fo.sha });
        else {
          if (((qt = 1), !gt || hn === gt || !rn))
            ((Zt = "git_worktree_create_pr_ref_unverified"),
              (rn =
                fo === "absent"
                  ? `origin has no ref ${hn}; a branch, tag or other ref named like it was fetched instead, which is not pull or merge request #${s.prNumber}. Check the number, and that origin is the repository #${s.prNumber} belongs to; if both are right, that ref has to be deleted from origin first.`
                  : Xn === void 0
                    ? `the fetch of ${hn} succeeded, but git did not print the "From <url>" line that says where it fetched from, so the result could not be checked. Run the command again.`
                    : `the fetch succeeded, but FETCH_HEAD does not record ${hn} from ${Xn}, most likely because another git fetch in this repository overwrote it at the same moment. Run the command again.`));
          if (fo === null)
            Yt ??= {
              refspec: hn,
              why:
                Xn === void 0
                  ? "git did not print where it fetched from"
                  : "FETCH_HEAD did not record that fetch",
            };
        }
        continue;
      }
      if (!rn) rn = prFetchStderr || (timedOut ? `the fetch of ${hn} timed out` : "");
      if (Et && !Yt && !MISSING_REMOTE_REF_RE.test(prFetchStderr)) {
        let filtered = stripProgressLines(prFetchStderr)
            .split(
              `
`,
            )
            .filter(Boolean),
          replaced = (filtered.find((To) => /^(fatal|error):/i.test(To)) ?? filtered.at(-1) ?? "").replace(
            /^(fatal|error|warning):\s*/i,
            "",
          );
        Yt = {
          refspec: hn,
          why: timedOut
            ? "that fetch timed out"
            : replaced
              ? `that fetch failed: ${replaced}`
              : `that fetch failed with exit status ${prFetchCode}`,
        };
      }
    }
    let no = It[0];
    if (no && gt && no.refspec !== gt) ((qt = 1), (no = void 0));
    else if (no && It[1] && It[1].sha !== no.sha)
      ((qt = 1),
        (Zt = "git_worktree_create_pr_ref_ambiguous"),
        (rn = `origin has both ${no.refspec} and ${It[1].refspec}, at different commits. GitHub and GitHub-compatible servers create only refs/pull/${s.prNumber}/head and GitLab only refs/merge-requests/${s.prNumber}/head, so the other one was pushed to origin, or copied there from another server, and could be mistaken for #${s.prNumber}. Delete from origin the ref your server does not create, then retry.`),
        (no = void 0));
    else if (no && Yt)
      ((qt = 1),
        (Zt = "git_worktree_create_pr_other_ref_unchecked"),
        (rn = `fetched ${no.refspec}, but could not check whether origin also has ${Yt.refspec} (${Yt.why}). Because origin was not recognised as github.com or gitlab.com, both refs are checked before either is used, so that a pushed look-alike cannot be mistaken for #${s.prNumber}. Retry.`),
        (no = void 0));
    if (!no && qt !== 0) {
      logFeatureBad("git_worktree_create", Zt);
      let hn =
        truncateMiddle_2(hideUnsafeText(stripProgressLines(rn.trim()), "git's error")) ||
        'it may not exist, the fetch may have timed out, or the repository may not have a remote named "origin"';
      throw Error(
        Zt === "git_worktree_create_pr_fetch_failed"
          ? `Failed to fetch PR/MR #${s.prNumber}: ${hn}`
          : `Cannot use PR/MR #${s.prNumber}: ${hn}`,
      );
    }
    ((baseSha = no?.sha ?? null), (G = baseSha === null ? "FETCH_HEAD" : `${baseSha}^{commit}`));
  } else {
    let Je = await getDefaultBranch(),
      nt = resolveGitDirs(e)?.gitDir ?? null,
      pt = Je && !Je.startsWith("-") ? Je : "HEAD",
      originRef = `origin/${pt}`,
      yt = nt ? await resolveRef(nt, `refs/remotes/origin/${pt}`) : null;
    if (yt && nt) {
      ((G = originRef), (baseSha = yt));
      let gt = await stat_18(join_91(nt, "FETCH_HEAD")).then(
        (At) => At.mtimeMs,
        () => 0,
      );
      if (Date.now() - gt > WORKTREE_STALE_AGE_MS) {
        await execFileNoThrowWithCwd(gitExe(), ["fetch", SAFE_UPLOAD_PACK_ARG, "origin", pt], {
          cwd: e,
          stdin: "ignore",
          ...(await getGitSshEnv(e)),
          timeout: WORKTREE_GIT_TIMEOUT_MS,
        });
        let At = await resolveRef(nt, `refs/remotes/origin/${pt}`);
        if (At) baseSha = At;
      }
    } else {
      let { code: fetchCode } = await execFileNoThrowWithCwd(
        gitExe(),
        ["fetch", SAFE_UPLOAD_PACK_ARG, "origin", pt],
        { cwd: e, stdin: "ignore", ...(await getGitSshEnv(e)) },
      );
      if (fetchCode === 0)
        ((G = originRef),
          (baseSha = await resolveWorktreeBaseSha({
            base: `refs/remotes/${originRef}`,
            exactRef: !0,
            kind: "origin_default",
            failure: `Failed to resolve base branch "${originRef}"`,
            cwd: e,
            root: e,
          })));
      else
        (logForDebugging(`[worktree] fetch of origin/${pt} failed \u2014 basing worktree on local HEAD`, {
          level: "warn",
        }),
          (baseSha = await resolveHeadAsBase({ repoRoot: e, fromCwd: s?.fromCwd, kind: "head_fallback" })),
          (G = `${baseSha}^{commit}`));
    }
  }
  if (!baseSha)
    baseSha = await resolveWorktreeBaseSha({
      base: G,
      kind: "fetch_head",
      failure: `Failed to resolve base branch "${G}"`,
      cwd: e,
      root: e,
    });
  let sparsePaths = getInitialSettings_2().worktree?.sparsePaths,
    addArgs = ["worktree", "add"];
  if (sparsePaths?.length) addArgs.push("--no-checkout");
  let ke = `${baseSha}^{commit}`;
  addArgs.push("--no-track", s?.isBranchNew ? "-b" : "-B", worktreeBranch, worktreePath, ke);
  let we = await checkoutWorkersArgs(e),
    Ee = await kMn(e, null),
    failure = (
      await explainPartialCloneFailure(e, baseSha, Ee, async () =>
        sparsePaths?.length
          ? minimalSparseDirs(sparsePaths)
          : (await gitSupportsPartialCloneFetch(e))
            ? readSparseCheckoutConfig(e)
            : null,
      )
    ).failure,
    Ie = (Je) =>
      failure !== null
        ? `
${failure}`
        : Ee.inForce
          ? explainOnDemandFetchOff(Je, Ee, baseSha)
          : "";
  await assertWorktreeDirNotSymlink(n, worktreePath);
  let Me = await getFilterNeutralizingArgsOrRefusal(e);
  if ("refusal" in Me) throw new WorktreeIsolationError(Me.refusal);
  let { code: createCode, stderr: createStderr } = await execFileNoThrowWithCwd(
    gitExe(),
    [...Me.args, ...we, ...addArgs],
    { cwd: e, env: withSafeGitConfig(e, { LC_ALL: "C", ...doe(Ee) }) },
  );
  if (createCode !== 0) {
    logFeatureBad("git_worktree_create", "git_worktree_create_add_failed");
    let Je = stripProgressLines(createStderr);
    if (parseWorktreeAddError(createStderr, worktreeBranch))
      throw new WorktreeIsolationError(
        `branch "${worktreeBranch}" for worktree "${r}" is already checked out elsewhere in this repository. Pass a different --worktree name.`,
      );
    if (s?.isBranchNew && /^fatal: a branch named .* already exists/im.test(Je))
      throw new WorktreeIsolationError(
        `branch "${worktreeBranch}" already exists, so the numbered name "${r}" could not be used. The branch was left as it is. Pass a different worktree name.`,
      );
    if (/^fatal: .* already exists/m.test(Je))
      throw new WorktreeIsolationError(
        `worktree "${r}" already exists at ${hideUnsafePath(worktreePath)} but cannot be reused (${truncateMiddle_2(hideUnsafeText(Je, "git's error"))}). Remove that directory (with \`git worktree remove\` if it's a registered worktree, or by deleting it if it's a stray directory) or pass a different --worktree name.`,
      );
    let nt = `Failed to create worktree: ${truncateMiddle_2(hideUnsafeText(Je, "git's error"))}${Ie(Je)}`;
    if (await readWorktreeHeadSha(worktreePath)) {
      if (
        !(await removeWorktreeRegistration(e, worktreeBranch, worktreePath, {
          onlyIfRegisteredAt: await candidateWorktreePaths(n, worktreePath),
          deregisterOnKeep: "ifOwned",
        }))
      )
        throw new WorktreeIsolationError(`${nt} ${worktreeRegistrationKeptMessage(worktreeBranch)}`);
    }
    throw new WorktreeIsolationError(nt);
  }
  let lt = async (Je, nt) => {
    if (nt === "redirected")
      throw (
        logForDebugging(
          `Removed nothing for ${worktreeBranch}: containment failed, so the tree cannot be identified safely`,
          { level: "warn" },
        ),
        new WorktreeIsolationError(
          `${Je} Nothing was removed: the checkout was written wherever the link at that path pointed at the time, so before removing anything, check the sensitive locations it could have reached, such as .git/hooks (a hook checked out there runs on the next git command) and ~/.claude/skills. ` +
            worktreeRegistrationKeptMessage(worktreeBranch),
        )
      );
    let pt = await removeWorktreeRegistration(e, worktreeBranch, worktreePath, {
      onlyIfRegisteredAt: await candidateWorktreePaths(n, worktreePath),
      deregisterOnKeep: "ifOwned",
    });
    throw new WorktreeIsolationError(pt ? Je : `${Je} ${worktreeRegistrationKeptMessage(worktreeBranch)}`);
  };
  try {
    let [Je, nt] = await Promise.all([realpath_28(worktreePath), realpath_28(n.anchor)]),
      pt = join_91(s4r(n, nt).dir, basename_51(worktreePath));
    if (!(await isSamePathIdentity(Je, pt, { above: nt })))
      (logFeatureBad("git_worktree_create", "git_worktree_create_containment_failed"),
        await lt(
          `Cannot create worktree: ${hideUnsafePath(worktreePath)} resolved to ${describeRepoRelativeLocation(Je, nt)}, which is not the expected worktree location ${hideUnsafePath(pt)}.`,
          "redirected",
        ));
  } catch (error) {
    if (error instanceof WorktreeIsolationError) throw error;
    (logFeatureBad("git_worktree_create", "git_worktree_create_realpath_failed"),
      await lt(
        `Cannot create worktree: failed to verify containment of ${hideUnsafePath(worktreePath)}: ${Lee(errorMessage(error)) ? "it could not be resolved" : errorMessage(error)}. The path no longer resolves, so the checkout may have been written ` +
          "through a since-removed link to a location outside the repository \u2014 " +
          "check ~/.claude/skills and other sensitive locations for unexpected content.",
        "unresolved",
      ));
  }
  if (sparsePaths?.length) {
    let tearDown = async (msg) => {
      throw (
        await removeWorktreeRegistration(e, worktreeBranch, worktreePath, {
          onlyIfRegisteredAt: await candidateWorktreePaths(n, worktreePath),
        }),
        await restoreWorktreeConfigExtension(e),
        new WorktreeIsolationError(msg)
      );
    };
    if (
      (
        await execFileNoThrowWithCwd(
          gitExe(),
          [...freeze_23, "config", "--local", "--get", "extensions.worktreeConfig"],
          { cwd: e, env: buildGitEnvForRepo(e) },
        )
      ).exitCode === 1
    )
      await execFileNoThrowWithCwd(gitExe(), [...freeze_23, "config", "--local", UMn, "true"], {
        cwd: e,
        env: buildGitEnvForRepo(e),
      });
    let pt = await getFilterNeutralizingArgsOrRefusal(worktreePath),
      Et = "refusal" in pt ? await tearDown(pt.refusal) : pt.args,
      { code: sparseCode, stderr: sparseErr } = await execFileNoThrowWithCwd(
        gitExe(),
        [...Et, ...freeze_23, "sparse-checkout", "set", "--cone", "--", ...sparsePaths],
        { cwd: worktreePath, env: withSafeGitConfig(worktreePath, doe(Ee)) },
      );
    if (sparseCode !== 0)
      (logFeatureBad("git_worktree_create", "git_worktree_create_sparse_set_failed"),
        await tearDown(
          `Failed to configure sparse-checkout: ${truncateMiddle_2(hideUnsafeText(stripProgressLines(sparseErr), "git's error"))}`,
        ));
    let At = await checkoutWorkersArgs(worktreePath),
      It = await getFilterNeutralizingArgsOrRefusal(worktreePath),
      Yt = "refusal" in It ? await tearDown(It.refusal) : It.args,
      { code: coCode, stderr: coErr } = await execFileNoThrowWithCwd(
        gitExe(),
        [...Yt, ...At, "checkout", "--no-recurse-submodules", "HEAD"],
        {
          cwd: worktreePath,
          env: withSafeGitConfig(worktreePath, { ...(Ee.inForce && { LC_ALL: "C" }), ...doe(Ee) }),
        },
      ),
      rn = Ee.inForce && explainOnDemandFetchOff(coErr, Ee, baseSha) !== "";
    if (coCode !== 0 || rn)
      (logFeatureBad("git_worktree_create", "git_worktree_create_sparse_checkout_failed"),
        await tearDown(
          coCode !== 0
            ? `Failed to checkout sparse worktree: ${truncateMiddle_2(hideUnsafeText(stripProgressLines(coErr), "git's error"))}${Ie(coErr)}`
            : `Failed to checkout sparse worktree: git left out files whose contents it could not read, so the new worktree was removed.${Ie(coErr)}`,
        ));
  }
  return (
    await writeWorktreeBaseline(worktreePath, baseSha),
    {
      worktreePath: worktreePath,
      worktreeBranch: worktreeBranch,
      headCommit: baseSha,
      baseBranch: G,
      existed: !1,
    }
  );
}
/**
 * 按仓库根 .worktreeinclude（gitignore 语法）把被忽略但需要的文件（如 .env）复制到新 worktree。
 */
//@ chunk-e6aww6q8.js:3625933-3627962 fingerprint = copyWorktreeIncludeFiles (0.781)
async function copyWorktreeIncludeFiles(repoRoot, worktreePath) {
  let r;
  try {
    r = await readFile_15(join_91(repoRoot, ".worktreeinclude"), "utf-8");
  } catch {
    return [];
  }
  let patterns = r
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
  if (patterns.length === 0) return [];
  let gitignored = await execFileNoThrowWithCwd(
      gitExe(),
      [...freeze_23, "ls-files", "--others", "--ignored", "--exclude-standard", "--directory"],
      { cwd: repoRoot, env: buildGitEnvForRepo(repoRoot) },
    ),
    y =
      gitignored.code === 0
        ? gitignored.stdout
            .split(
              `
`,
            )
            .filter((Se) => Se !== "")
        : [];
  if (y.length === 0) return [];
  let matcher = pMn.default().add(xst(wAt(r), "worktreeinclude")),
    collapsedDirs = y.filter((Se) => Se.endsWith("/")),
    files = y.filter((Se) => !Se.endsWith("/") && matcher.ignores(Se)),
    dirsToExpand = collapsedDirs.filter((dir) => {
      if (
        patterns.some((ke) => {
          let we = ke.startsWith("/") ? ke.slice(1) : ke;
          if (we.startsWith(dir)) return !0;
          let globIdx = we.search(/[*?[]/);
          if (globIdx > 0) {
            let literalPrefix = we.slice(0, globIdx);
            if (dir.startsWith(literalPrefix)) return !0;
          }
          let Ae = we;
          while (Ae.startsWith("**/")) Ae = Ae.slice(3);
          if (Ae !== we) {
            let Ie = firstLineOf(Ae, "/"),
              search = Ie.search(/[*?[]/),
              lower = (search === -1 ? Ie : Ie.slice(0, search)).replace(/\\/g, "").toLowerCase();
            if (lower.length > 0) {
              let mapped = dir
                .slice(0, -1)
                .split("/")
                .map((Je) => Je.toLowerCase());
              if (search === -1 ? mapped.includes(lower) : mapped.some((Je) => Je.startsWith(lower)))
                return !0;
            }
          }
          return !1;
        })
      )
        return !0;
      if (matcher.ignores(dir.slice(0, -1)) || matcher.ignores(dir)) return !0;
      return !1;
    });
  if (dirsToExpand.length > 0) {
    let expanded = await execFileNoThrowWithCwd(
      gitExe(),
      [...freeze_23, "ls-files", "--others", "--ignored", "--exclude-standard", "--", ...dirsToExpand],
      { cwd: repoRoot, env: buildGitEnvForRepo(repoRoot) },
    );
    if (expanded.code === 0) {
      for (let ke of expanded.stdout
        .split(
          `
`,
        )
        .filter((we) => we !== ""))
        if (matcher.ignores(ke)) files.push(ke);
    }
  }
  let copied = [],
    Z;
  try {
    Z = await realpath_28(worktreePath);
  } catch (error) {
    return (
      logForDebugging(
        `Skipping .worktreeinclude copy: realpath(${worktreePath}) failed: ${errorMessage(error)}`,
        { level: "warn" },
      ),
      copied
    );
  }
  for (let relativePath of files) {
    let srcPath = join_91(repoRoot, relativePath),
      destPath = join_91(worktreePath, relativePath);
    try {
      if ((await lstat_31(srcPath)).isSymbolicLink()) {
        logForDebugging(`Skipping symlink in .worktreeinclude: ${relativePath}`, { level: "warn" });
        continue;
      }
      if (await hasUnsafeAncestor(destPath, Z)) {
        logForDebugging(
          `Skipping .worktreeinclude entry: destination escapes worktree via committed symlink: ${relativePath}`,
          { level: "warn" },
        );
        continue;
      }
      (await mkdir_18(dirname_51(destPath), { recursive: !0 }),
        await copyIncludedFileSafely(srcPath, destPath),
        copied.push(relativePath));
    } catch (error) {
      logForDebugging(`Failed to copy ${relativePath} to worktree: ${errorMessage(error)}`, {
        level: "warn",
      });
    }
  }
  if (copied.length > 0)
    logForDebugging(`Copied ${copied.length} files from .worktreeinclude: ${copied.join(", ")}`);
  return copied;
}
//@ chunk-e6aww6q8.js:3627962-3628683 layout
async function copyLocalSettingsIntoWorktree(e, n, r) {
  if (resolveLocalSettingsStoreRoot(n, GD) !== resolve_37(n)) {
    logForDebugging(
      `Skipping settings.local.json copy into ${n}: it resolves localSettings to the canonical repo root, so a copy would become a stale, revocation-resurrecting legacy overlay`,
    );
    return;
  }
  let s = getRelativeSettingsFilePathForSource("localSettings"),
    h = join_91(e, s);
  try {
    if ((await lstat_31(h)).isSymbolicLink()) {
      logForDebugging(`Skipping symlinked settings.local.json: ${h}`, { level: "warn" });
      return;
    }
    let S = join_91(n, s);
    if (r == null || (await hasUnsafeAncestor(S, r))) {
      logForDebugging(
        "Skipping settings.local.json copy: destination escapes worktree via committed symlink",
        { level: "warn" },
      );
      return;
    }
    (await mkdir_18(dirname_51(S), { recursive: !0 }),
      await copyIncludedFileSafely(h, S),
      logForDebugging(`Copied settings.local.json to worktree: ${S}`));
  } catch (error) {
    if (getErrnoCode(error) !== "ENOENT")
      logForDebugging(`Failed to copy settings.local.json: ${errorMessage(error)}`, { level: "warn" });
  }
}
/**
 * worktree 创建后的设置：复制 settings.local.json、.worktreeinclude 文件、配置的符号链接目录等。
 */
//@ chunk-e6aww6q8.js:3628683-3629223 fingerprint = performPostCreationSetup (0.787)
async function performPostCreationSetup(repoRoot, worktreePath) {
  let r = await realpath_28(worktreePath).catch(() => null);
  await copyLocalSettingsIntoWorktree(repoRoot, worktreePath, r);
  let huskyPath = join_91(repoRoot, ".husky"),
    h = await resolveGitDir(repoRoot),
    y = h ? ((await getCommonDir(h)) ?? h) : null,
    S = y ? await IMn(y, "core", null, "hooksPath") : null,
    w = null;
  if (S) {
    if (((w = isAbsolute_46(S) ? S : resolve_37(repoRoot, S)), S !== w)) {
      let { code: configCode, stderr: configError } = await execFileNoThrowWithCwd(
        gitExe(),
        [...freeze_23, "config", "core.hooksPath", w],
        { cwd: worktreePath, env: buildGitEnvForRepo(worktreePath) },
      );
      if (configCode === 0) logForDebugging(`Configured worktree to use hooks from main repository: ${w}`);
      else logForDebugging(`Failed to configure hooks path: ${configError}`, { level: "error" });
    }
  }
  let dirsToSymlink = getInitialSettings_2().worktree?.symlinkDirectories ?? [];
  if (dirsToSymlink.length > 0) await symlinkDirectories(repoRoot, worktreePath, dirsToSymlink);
  await copyWorktreeIncludeFiles(repoRoot, worktreePath);
}
//@ chunk-e6aww6q8.js:3629223-3629610 facade-exports
function parsePRReference(e) {
  let match = e.match(/^https?:\/\/[^/]+\/[^/]+\/[^/]+\/pull\/(\d+)\/?(?:[?#].*)?$/i);
  if (match?.[1]) return { number: parseInt(match[1], 10), forge: "github" };
  let match_2 = e.match(/^https?:\/\/[^/]+\/[^?#]+\/-\/merge_requests\/(\d+)\/?(?:[?#].*)?$/i);
  if (match_2?.[1]) return { number: parseInt(match_2[1], 10), forge: "gitlab" };
  let match_3 = e.match(/^#(\d+)$/);
  if (match_3?.[1]) return { number: parseInt(match_3[1], 10), forge: null };
  return null;
}
//@ chunk-e6aww6q8.js:3629610-3629656 layout
function getIsolatedGitExecOptions() {
  return { env: getPreSettingsEnvHonoringLiveDeletions(), extendEnv: !1 };
}
/**
 * 检查 tmux 是否可用（tmux -V 退出码 0）。
 */
//@ chunk-e6aww6q8.js:3629656-3629732 facade-exports = TMUX_COMMAND (1)
async function isTmuxAvailable() {
  let { code: code } = await execFileNoThrowWithCwd("tmux", ["-V"], getIsolatedGitExecOptions());
  return code === 0;
}
//@ chunk-e6aww6q8.js:3629732-3630102 facade-exports = getTmuxInstallInstructions (1)
function getTmuxInstallInstructions() {
  switch (getPlatform()) {
    case "macos":
      return "Install tmux with: brew install tmux";
    case "linux":
    case "wsl":
      return "Install tmux with: sudo apt install tmux (Debian/Ubuntu) or sudo dnf install tmux (Fedora/RHEL)";
    case "windows":
      return "tmux is not natively available on Windows. Consider using WSL or Cygwin.";
    default:
      return "Install tmux using your system package manager.";
  }
}
//@ chunk-e6aww6q8.js:3630102-3630288 facade-exports = createTmuxSessionForWorktree (0.91)
async function createTmuxSessionForWorktree(sessionName, worktreePath) {
  let { code: code, stderr: stderr } = await execFileNoThrowWithCwd(
    "tmux",
    ["new-session", "-d", "-s", sessionName, "-c", worktreePath],
    { ...getIsolatedGitExecOptions(), useToolMemoryCgroup: !1 },
  );
  if (code !== 0) return { created: !1, error: stderr };
  return { created: !0 };
}
//@ chunk-e6aww6q8.js:3630288-3630382 facade-exports = killTmuxSession (1)
async function killTmuxSession(sessionName) {
  let { code: code } = await execFileNoThrowWithCwd(
    "tmux",
    ["kill-session", "-t", sessionName],
    getIsolatedGitExecOptions(),
  );
  return code === 0;
}
//@ chunk-e6aww6q8.js:3630382-3630468 layout
var CLAUDE_WORKTREE_LOCK_REASON_PATTERN =
  /^claude (?:agent|session) .{1,255} \(pid (\d{1,10})(?: start (.{1,255}))?\)$/;
//@ chunk-e6aww6q8.js:3630468-3630530 facade-exports
function claudeWorktreeLockPid(input) {
  let n = input?.match(CLAUDE_WORKTREE_LOCK_REASON_PATTERN);
  return n ? Number(n[1]) : null;
}
//@ chunk-e6aww6q8.js:3630530-3630650 layout
async function isLockHeldByLiveOtherProcess(e) {
  let n = e?.match(CLAUDE_WORKTREE_LOCK_REASON_PATTERN);
  if (!n) return !1;
  let r = Number(n[1]);
  if (r === process.pid || !isProcessRunning_2(r)) return !1;
  return !0;
}
//@ chunk-e6aww6q8.js:3630650-3630773 layout
async function isLockHeldByLiveSameStartProcess(e) {
  let n = e?.match(CLAUDE_WORKTREE_LOCK_REASON_PATTERN);
  if (!n) return !1;
  let r = Number(n[1]);
  return r !== process.pid && isProcessRunning_2(r) && (await isSameProcessAsync(r, n[2]));
}
//@ chunk-e6aww6q8.js:3630773-3630862 facade-exports
async function mayReleaseWorktreeLock(e) {
  if (e === void 0) return !0;
  if (!CLAUDE_WORKTREE_LOCK_REASON_PATTERN.test(e)) return !1;
  return !(await isLockHeldByLiveOtherProcess(e));
}
//@ chunk-e6aww6q8.js:3630862-3631053 facade-exports
async function releaseOwnWorktreeLock(e, n) {
  try {
    if (await mayReleaseWorktreeLock(await readWorktreeLockReason(e, n))) await unlockAgentWorktree(e, n);
  } catch (error) {
    logForDebugging(
      `[worktree] left the lock on ${e} \u2014 cannot read the worktree registry to verify ownership (${errorMessage(error)})`,
    );
  }
}
//@ chunk-e6aww6q8.js:3631053-3631345 facade-exports
async function readWorktreeLockReason(e, n) {
  let r = resolve_37(await realpath_28(e).catch(() => e)),
    s = ux(r, "everyPlatform"),
    h;
  for (let y of await listRegisteredWorktrees(n)) {
    let S = resolve_37(await realpath_28(y.worktreePath).catch(() => y.worktreePath));
    if (S === r) return y.lockReason;
    if (h === void 0 && ux(S, "everyPlatform") === s) h = { lockReason: y.lockReason };
  }
  return h?.lockReason;
}
/**
 * 用 git worktree lock --reason 'claude <agent|session> <id> (pid N start T)' 给 worktree 加锁，标明持有进程，供陈旧锁清理判断。
 */
//@ chunk-e6aww6q8.js:3631345-3633066 facade-exports
async function lockClaudeWorktree(e, n, r, s) {
  try {
    let procStart = procIdentityFields(await ownProcStartAsync()).procStart,
      y = procStart
        ? `claude ${s} ${r} (pid ${process.pid} start ${procStart})`
        : `claude ${s} ${r} (pid ${process.pid})`,
      S = async () => {
        if (!readFlagWithOverride("tengu_mighty_sprout", { safe: !0 }))
          return execFileNoThrowWithCwd(gitExe(), [...freeze_23, "worktree", "lock", "--reason", y, e], {
            cwd: n,
            env: buildGitEnvForRepo(n),
          });
        try {
          let q = resolveGitDirs(n),
            Z = resolveGitDirs(e);
          if (
            q === null ||
            Z === null ||
            Z.workTree === null ||
            Z.gitDir === Z.commonDir ||
            Z.commonDir !== q.commonDir
          )
            return (
              logFeatureSad("git_worktree_create", "git_worktree_lock_unvetted"),
              {
                code: 1,
                stderr: `no lock marker written: could not confirm from the .git files of this worktree and ${n} that this is a linked worktree of that repository`,
              }
            );
          return (
            await writeNewFile(
              join_91(q.commonDir, "worktrees", basename_51(Z.gitDir), "locked"),
              `${y}
`,
            ),
            { code: 0, stderr: "" }
          );
        } catch (error) {
          switch (getErrnoCode(error)) {
            case "EEXIST":
              break;
            case "EACCES":
            case "EPERM":
            case "EROFS":
              logFeatureSad("git_worktree_create", "git_worktree_lock_entry_unwritable");
              break;
            default:
              logFeatureSad("git_worktree_create", "git_worktree_lock_create_failed");
          }
          return { code: 1, stderr: errorMessage(error) };
        }
      },
      w = await S();
    if (w.code === 0) return !0;
    let L;
    try {
      L = await readWorktreeLockReason(e, n);
    } catch (error) {
      return (
        logForDebugging(
          `[worktree] failed to lock ${s} worktree ${e} and could not read the registry (${errorMessage(error)}); treating this session as a guest`,
        ),
        !1
      );
    }
    if (L === void 0)
      return (logForDebugging(`[worktree] failed to lock ${s} worktree ${e}: ${w.stderr.trim()}`), !0);
    if (!CLAUDE_WORKTREE_LOCK_REASON_PATTERN.test(L) || (await isLockHeldByLiveOtherProcess(L)))
      return (
        logForDebugging(
          `[worktree] ${e} is already locked (${L || "no reason"}); leaving the existing lock in place \u2014 this session is a guest, not the owner`,
        ),
        !1
      );
    if (Number(L.match(CLAUDE_WORKTREE_LOCK_REASON_PATTERN)?.[1]) === process.pid) return !0;
    await unlockAgentWorktree(e, n);
    let G = await S();
    if (G.code !== 0)
      logForDebugging(
        `[worktree] failed to re-lock ${s} worktree ${e} after clearing a stale lock: ${G.stderr.trim()}`,
      );
    return !0;
  } catch (error) {
    return (logForDebugging(`[worktree] failed to lock ${s} worktree ${e}: ${errorMessage(error)}`), !0);
  }
}
/**
 * --worktree 启动：要求已信任工作区，校验 slug；配置了 WorktreeCreate hook 时用 hook 返回的目录（拒绝点段路径与符号链接祖先），否则 getOrCreateWorktree，随后复制 .worktreeinclude 文件、settings.local.json 并可创建 tmux 会话。
 */
//@ chunk-e6aww6q8.js:3633066-3636445 facade-exports = createWorktreeForSession (0.402)
async function createWorktreeForSession(sessionId, slug, tmuxSessionName, options) {
  if ((refuseUnavailableWorktree("a worktree"), !checkHasTrustDialogAccepted()))
    throw Error(
      "Workspace trust not yet accepted. Run `claude` once in this directory and accept the trust dialog, then retry with --worktree.",
    );
  validateWorktreeSlug(slug);
  let h = options.fromCwd ?? getCwd(),
    originalCwd = getOriginalCwd(),
    S,
    w = dispatchesWorktreeCreate()
      ? await executeWorktreeCreateHook(
          { id: getSessionId(), project: { originalCwd: getOriginalCwd(), projectRoot: getProjectRoot() } },
          slug,
          { storageV5: options.storageV5, credentials: options.credentials },
        ).catch((G) => {
          if (!findGitRoot(h)) (lTi(h), logFeatureBad("git_worktree_create", "hook_failed_not_git_repo"));
          throw G;
        })
      : void 0;
  if (w) {
    {
      if (cl(w.worktreePath))
        throw (
          logFeatureBad("git_worktree_create", "git_worktree_create_hook_ancestry_rejected"),
          new WorktreeIsolationError(
            `Cannot use the WorktreeCreate hook's worktree: the hook emitted a path with dot segments (${w.worktreePath}). The ` +
              "symlink screen cannot verify a dotted spelling \u2014 have the " +
              "hook emit a normalized (dot-free) absolute path and retry.",
          )
        );
      for (let G of new Set([findCanonicalGitRoot(h), findGitRoot(h)].filter((q) => Boolean(q)))) {
        let q = await findSymlinkInWorktreeAncestry(w.worktreePath, G);
        if (q)
          throw (
            logFeatureBad("git_worktree_create", "git_worktree_create_hook_ancestry_rejected"),
            new WorktreeIsolationError(
              `Cannot use the WorktreeCreate hook's worktree: ${q.component} ` +
                (q.kind === "symlink" ? "is a symlink. " : "could not be verified. ") +
                "A repository-committed symlink below the checkout root could redirect the worktree outside the repository. Remove the symlink (or emit a path outside the repository) and retry.",
            )
          );
      }
    }
    (logForDebugging(`Created hook-based worktree at: ${w.worktreePath}`),
      (S = {
        originalCwd: h,
        preEnterOriginalCwd: originalCwd,
        worktreePath: w.worktreePath,
        worktreeName: slug,
        sessionId: sessionId,
        tmuxSessionName: tmuxSessionName,
        hookBased: !0,
      }));
  } else {
    let G = options.repoRoot ?? findCanonicalGitRoot(h);
    if (!G)
      throw (
        logFeatureBad("git_worktree_create", "git_worktree_create_not_git_repo"),
        new WorktreeIsolationError(
          "Cannot create a worktree: not in a git repository and no WorktreeCreate hooks are configured. Configure WorktreeCreate/WorktreeRemove hooks in settings.json to use worktree isolation with other VCS systems.",
        )
      );
    let originalBranch = await getBranch(),
      Z =
        options.slugPick === void 0
          ? { slug: slug, number: void 0 }
          : await allocateWorktreeSlug(G, slug, options.slugPick);
    if ((validateWorktreeSlug(Z.slug), Z.number === 0))
      throw (
        logFeatureBad("git_worktree_create", "git_worktree_create_no_numbered_name"),
        new WorktreeIsolationError(
          `no name from "${slug}" to "${suffixWorktreeSlug(slug, MAX_WORKTREE_SLUG_RETRIES)}" could be used for a new worktree: each is a name this session has already used, is held by a folder or a branch, or is one that Claude Code keeps for itself. Nothing was changed. Pass a different worktree name.`,
        )
      );
    let createStart = Date.now(),
      ke = await getOrCreateWorktree(G, i4r(G), Z.slug, { ...options, isBranchNew: (Z.number ?? 0) >= 2 }),
      {
        worktreePath: worktreePath,
        worktreeBranch: worktreeBranch,
        headCommit: headCommit,
        existed: existed,
      } = ke,
      Me = ke.existed ? ke.refreshed : void 0,
      We;
    if (existed)
      logForDebugging(
        Me
          ? `Reset existing worktree to the current base at: ${worktreePath}`
          : `Resuming existing worktree at: ${worktreePath}`,
      );
    else
      (logForDebugging(`Created worktree at: ${worktreePath} on branch: ${worktreeBranch}`),
        await performPostCreationSetup(G, worktreePath),
        (We = Date.now() - createStart));
    let ze = await lockClaudeWorktree(worktreePath, G, Z.slug, "session"),
      lt = ke.existed && ke.madeElsewhere;
    S = {
      originalCwd: h,
      preEnterOriginalCwd: originalCwd,
      worktreePath: worktreePath,
      worktreeName: Z.slug,
      slugNumber: Z.number,
      worktreeBranch: worktreeBranch,
      originalBranch: originalBranch,
      originalHeadCommit: headCommit,
      sessionId: sessionId,
      tmuxSessionName: tmuxSessionName,
      creationDurationMs: We,
      enteredExisting: ze && !lt ? void 0 : !0,
      madeElsewhere: lt ? "resumedByName" : void 0,
      resumedExisting: existed || void 0,
      resetToFreshBase: Me || void 0,
      usedSparsePaths: (getInitialSettings_2().worktree?.sparsePaths?.length ?? 0) > 0,
    };
  }
  let L = await checkWorktreeIsolation(S.worktreePath, [], gitRootsForPath(h, options.repoRoot));
  if (!L.ok)
    throw (
      logFeatureBad("git_worktree_create", "git_worktree_create_root_rejected"),
      new WorktreeIsolationError(L.message)
    );
  if (S.hookBased) {
    let G = await getHookWorktreeHead(S.worktreePath, h);
    if (G !== void 0) S.originalChangeset = G;
  }
  return (persistWorktreeSession(S, options.storageV5), logFeatureOk("git_worktree_create"), S);
}
/**
 * git worktree list --porcelain 并解析每个 worktree 的路径、分支与锁原因；可要求先确认 git 目录可信。
 */
//@ chunk-e6aww6q8.js:3636445-3637534 facade-exports
async function listRegisteredWorktrees(e, { vetted: n } = {}) {
  let r = async (Se) => {
      let ke =
        n === void 0
          ? { env: buildGitEnvForRepo(e) }
          : await verifyPinnedGitDir(n, resolveGitDirsOrPlaceholder(e));
      if ("refused" in ke)
        throw Error(
          "git was not run: the repository's git directory could not be confirmed as the one whose worktree registrations were checked",
        );
      return execFileNoThrow(
        gitExe(),
        [
          ...freeze_23,
          "-C",
          e,
          ...(n === void 0 ? [] : ["--git-dir", n.gitDir]),
          "worktree",
          "list",
          "--porcelain",
          ...(Se === null ? [] : [Se]),
        ],
        { timeout: 1e4, env: ke.env },
      );
    },
    s = await gitSupportsPartialCloneFetch(e),
    h = await r(s ? "-z" : null),
    y = s
      ? "\x00"
      : `
`,
    { code: code, stdout: stdout, stderr: stderr, error: error } = h;
  if (code !== 0) {
    let trimmed = stderr.trim(),
      ke = `\`git -C ${e} worktree list\` failed: ${trimmed || (error !== void 0 ? errorMessage(error) : "") || `exit ${code}`}`;
    if (trimmed === "" && error !== void 0 && /premature close\s*$/i.test(error))
      throw new WorktreeGitTransientError(ke);
    throw Error(ke);
  }
  let q = [],
    Z = null;
  for (let Se of stdout.split(y))
    if (Se.startsWith("worktree ")) {
      if (Z) q.push(Z);
      Z = { worktreePath: Se.slice(9) };
    } else if (Se.startsWith("branch ") && Z) Z.worktreeBranch = Se.slice(7).replace(/^refs\/heads\//, "");
    else if ((Se === "locked" || Se.startsWith("locked ")) && Z) Z.lockReason = Se.slice(6).trim();
    else if ((Se === "prunable" || Se.startsWith("prunable ")) && Z) Z.prunable = !0;
  if (Z) q.push(Z);
  return q;
}
//@ chunk-e6aww6q8.js:3637534-3637607 layout
function isNetworkOrOutsidePath(e, n) {
  let normalized = win32_7.normalize(e);
  return isWindowsUncPath(normalized) || containsVulnerableUncPath(normalized, !0) || isOnForeignMount(e, n);
}
//@ chunk-e6aww6q8.js:3637607-3637675 layout
function isNetworkOrUnsafePath(e) {
  let normalized = win32_7.normalize(e);
  return isWindowsUncPath(normalized) || containsVulnerableUncPath(normalized, !0) || Ya(e);
}
//@ chunk-e6aww6q8.js:3637675-3638308 facade-exports
async function listRepoWorktrees(e) {
  let n = findCanonicalGitRoot(e);
  if (n === null) return {};
  let r = await listRegisteredWorktrees(n).catch(() => null);
  if (r === null) return null;
  let s;
  try {
    s = Mn(await realpath_28(n));
  } catch {
    return null;
  }
  let h = {};
  for (let y of r.slice(1)) {
    let S = basename_51(y.worktreePath),
      w = y.worktreeBranch ?? "";
    if (
      y.prunable === !0 ||
      !S ||
      /\s/.test(S) ||
      lei.test(y.worktreePath) ||
      o4r.test(S) ||
      o4r.test(w) ||
      isEphemeralWorktreeSlug(S) ||
      isNetworkOrUnsafePath(y.worktreePath) ||
      containsPathTraversal(y.worktreePath) ||
      y.worktreePath.split(/[/\\]/).some((G) => /^\.\.[ .]*$/.test(G)) ||
      h[S] !== void 0
    )
      continue;
    let L;
    try {
      L = Mn(await realpath_28(y.worktreePath));
    } catch {
      continue;
    }
    if (
      isNetworkOrUnsafePath(L) ||
      !(await isPathUnderIdentity(s, L, { strictly: !0 })) ||
      o4r.test(L.slice(s.length))
    )
      continue;
    h[S] = { path: L, branch: w };
  }
  return h;
}
//@ chunk-e6aww6q8.js:3638308-3638367 layout
function isWindowsUncPath(e) {
  return getPlatform() === "windows" && /^[\\/]{2}/.test(e);
}
/**
 * 校验要进入的 worktree 路径：拒绝 UNC/网络自动挂载路径，要求位于本仓库 .claude/worktrees/ 下并属于同一 git 仓库。
 */
//@ chunk-e6aww6q8.js:3638367-3641891 facade-exports
async function resolveExistingWorktreeTarget(
  e,
  { requireManagedLocation: requireManagedLocation, requireCwdInsideRepo: requireCwdInsideRepo = !1 },
) {
  let normalized = win32_7.normalize(e);
  if (isWindowsUncPath(normalized) || containsVulnerableUncPath(normalized, !0))
    throw new WorktreeIsolationError(`Cannot enter worktree: ${e} is a UNC network path.`);
  let h = getCwd();
  if (isForeignMountPath(e, h) || isForeignMountPath(resolve_37(h, e), h))
    throw new WorktreeIsolationError(`Cannot enter worktree: ${e} is a network automount path.`);
  let y = findCanonicalGitRoot(h),
    S = y === null ? getWorkingCopyRootFallback(h) : null,
    w = y ?? S?.workingCopyRoot;
  if (!w)
    throw new WorktreeIsolationError(
      "Cannot enter an existing worktree: the current directory is not in a git repository.",
    );
  let L, G, q;
  try {
    ((L = await realpath_28(resolve_37(h, e))), (G = await realpath_28(w)), (q = await realpath_28(h)));
  } catch (error) {
    throw new WorktreeIsolationError(`Cannot enter worktree: ${e}: ${errorMessage(error)}`);
  }
  let Z = uncHostOf(L);
  if (
    (isWindowsUncPath(L) || containsVulnerableUncPath(L, !0)) &&
    (Z === null || /^[\\/]{2}[?.][\\/]/.test(L) || (Z !== uncHostOf(G) && Z !== uncHostOf(q)))
  )
    throw new WorktreeIsolationError(`Cannot enter worktree: ${e} resolves to a UNC network path (${L}).`);
  if (isForeignMountPath(L, G) && isForeignMountPath(L, q))
    throw new WorktreeIsolationError(
      `Cannot enter worktree: ${e} resolves to a network automount path (${L}).`,
    );
  if (L === G) {
    let Me = `Cannot enter worktree: ${e} is the main working tree, not a linked worktree.`;
    throw new WorktreeIsolationError(Me);
  }
  if (L === q)
    throw new WorktreeIsolationError(`Cannot enter worktree: ${e} is the current working directory.`);
  if (!1) {
    if (S !== null) {
      if (!("wcRoot" in lt))
        switch (lt.refusal) {
          case "session-untrusted":
          case "not-a-working-copy-root":
          case "not-a-worktree":
          case "other-checkout":
          case "no-answer":
        }
    }
  }
  if (requireCwdInsideRepo) {
    let Me = await isPathUnderIdentity(G, q, { foldOn: "everyPlatform", strictly: !0 }),
      We = !Me && (await isSamePathIdentity(q, G, { foldOn: "everyPlatform" }));
    if (!Me)
      throw new WorktreeIsolationError(
        We
          ? `Cannot enter worktree: the current working directory ${h} is the repository root, not an isolated worktree \u2014 switching is only available to sessions whose working directory is inside a worktree of this repository.`
          : `Cannot enter worktree: the current working directory ${h} is not inside the repository at ${w}.`,
      );
  }
  if (requireManagedLocation) {
    let dir = Xyn(G)[0].dir,
      We;
    try {
      We = await realpath_28(dir);
    } catch {
      throw new WorktreeIsolationError(
        `Cannot enter worktree: ${dir} does not exist, so ${e} cannot be a worktree managed by Claude Code.`,
      );
    }
    if (!(await isSamePathIdentity(We, dir)))
      throw new WorktreeIsolationError(
        `Cannot enter worktree: ${dir} resolves to ${We}; the managed worktrees directory must not be a symlink.`,
      );
    if (!(await isPathUnderIdentity(dir, L, { strictly: !0 })))
      throw new WorktreeIsolationError(
        `Cannot enter worktree: ${e} is not under ${dir}. Switching from this session is limited to worktrees managed by Claude Code (created under .claude/worktrees/ of this repository).`,
      );
    let ze = join_91(G, ".git", "worktrees"),
      lt = await resolveGitDir_2(L),
      Je = null,
      nt = null;
    if (lt)
      try {
        if (((Je = await realpath_28(lt)), pointerFileIsSuspect(join_91(Je, "gitdir"), Je)))
          throw Error("gitdir back-link is a symlink");
        let trimmed = (await readFile_15(join_91(Je, "gitdir"), "utf-8")).trim();
        if (!isOnForeignMount(trimmed, L) && !rawPointerPathIsUnsafe(trimmed, Je, L))
          nt = await realpath_28(resolve_37(Je, trimmed));
      } catch {}
    if (
      !Je ||
      !nt ||
      !(await isSamePathIdentity(dirname_51(Je), ze, { foldOn: "everyPlatform" })) ||
      !(await isSamePathIdentity(nt, join_91(L, ".git"), { foldOn: "everyPlatform", kind: "file" }))
    )
      throw new WorktreeIsolationError(`Cannot enter worktree: ${e} is not a linked worktree of ${w}.`);
  }
  let Se = findCanonicalGitRoot(L),
    ke = null;
  if (Se !== null && isLinkedWorktree(L))
    try {
      ke = await realpath_28(Se);
    } catch {}
  let we = ke !== null && ke.startsWith(G + sep_53) ? ke : w,
    Ee = we === w ? G : we,
    Ae = await listRegisteredWorktrees(we),
    Ie;
  for (let Me of Ae)
    try {
      if ((await realpath_28(Me.worktreePath)) === L) {
        Ie = Me;
        break;
      }
    } catch {}
  if (!Ie)
    throw new WorktreeIsolationError(
      `Cannot enter worktree: ${e} is not a registered worktree of ${we}. Run 'git -C ${we} worktree list' to see registered worktrees.`,
    );
  if (Ie.prunable)
    throw new WorktreeIsolationError(
      `Cannot enter worktree: ${e} is marked prunable by git (its directory or administrative files are missing or broken).`,
    );
  if (await isLockHeldByLiveSameStartProcess(Ie.lockReason))
    throw new WorktreeIsolationError(
      `Cannot enter worktree: ${e} belongs to another running Claude Code session (locked: ${printableNameOrPlaceholder(Ie.lockReason ?? "")}). Wait for that session to finish or choose a different worktree.`,
    );
  return { worktreePath: L, worktreeBranch: Ie.worktreeBranch, ownerRepoRoot: Ee };
}
//@ chunk-e6aww6q8.js:3641891-3642776 facade-exports
async function enterExistingWorktreeForSession(e, n, r) {
  let s = getCurrentWorktreeSession(),
    h = s?.originalCwd ?? getCwd(),
    y = s?.preEnterOriginalCwd ?? s?.originalCwd ?? getOriginalCwd(),
    {
      worktreePath: worktreePath,
      worktreeBranch: worktreeBranch,
      ownerRepoRoot: ownerRepoRoot,
    } = await resolveExistingWorktreeTarget(n, {
      requireManagedLocation: r.requireManagedLocation ?? s != null,
    }),
    G = ownerRepoRoot;
  try {
    let we = findCanonicalGitRoot(y);
    if (we !== null && (await realpath_28(we)) === ownerRepoRoot) G = void 0;
  } catch {}
  let q = await checkWorktreeIsolation(worktreePath, [], gitRootsForPath(y, ownerRepoRoot));
  if (!q.ok)
    throw (
      logFeatureBad("git_worktree_create", "git_worktree_create_root_rejected"),
      new WorktreeIsolationError(q.message)
    );
  let Z =
    s && isOwnedWorktreeSession(s) ? await realpath_28(s.worktreePath).catch(() => s.worktreePath) : void 0;
  if (s && Z !== void 0 && worktreePath !== Z)
    await releaseOwnWorktreeLock(s.worktreePath, resolveWorktreeCwdForRemoval(s.originalCwd, s.worktreePath));
  let Se =
      worktreePath === Z && s?.madeElsewhere
        ? s.madeElsewhere
        : (await isWorktreeMadeElsewhere(worktreePath))
          ? "enteredByPath"
          : void 0,
    ke = {
      originalCwd: h,
      preEnterOriginalCwd: y,
      worktreePath: worktreePath,
      worktreeName: basename_51(worktreePath),
      worktreeBranch: worktreeBranch,
      sessionId: e,
      enteredExisting: !0,
      madeElsewhere: Se,
      nestedRepoRoot: G,
      liveLaunchAnchor: s?.liveLaunchAnchor,
    };
  return (persistWorktreeSession(ke, r.storageV5), ke);
}
//@ chunk-e6aww6q8.js:3642776-3643394 facade-exports
async function resolveManagedWorktreePath(e) {
  try {
    let normalized = win32_7.normalize(e);
    if (isWindowsUncPath(normalized) || containsVulnerableUncPath(normalized, !0)) return null;
    let r = getCwd();
    if (isForeignMountPath(e, r) || isForeignMountPath(resolve_37(r, e), r)) return null;
    let s = findCanonicalGitRoot(r),
      y = s ?? null?.workingCopyRoot;
    if (!y) return null;
    let S = await realpath_28(resolve_37(r, e)),
      w = await realpath_28(y),
      L = await realpath_28(r),
      G = uncHostOf(S);
    if (
      (isWindowsUncPath(S) || containsVulnerableUncPath(S, !0)) &&
      (G === null || /^[\\/]{2}[?.][\\/]/.test(S) || (G !== uncHostOf(w) && G !== uncHostOf(L)))
    )
      return null;
    if (isForeignMountPath(S, w) && isForeignMountPath(S, L)) return null;
    if (s === null) return { targetReal: S, managed: !1 };
    for (let { dir: dir } of Xyn(w)) {
      let Z = await realpath_28(dir).catch(() => null);
      if (
        Z !== null &&
        (await isSamePathIdentity(Z, dir)) &&
        (await isPathUnderIdentity(dir, S, { strictly: !0 }))
      )
        return { targetReal: S, managed: !0 };
    }
    return { targetReal: S, managed: !1 };
  } catch {
    return null;
  }
}
//@ chunk-e6aww6q8.js:3643394-3643572 facade-exports
async function isPathUnderManagedWorktreesDir(e) {
  try {
    let n = findCanonicalGitRoot(getCwd());
    if (!n) return !1;
    return Xyn(await realpath_28(n)).some(({ dir: dir }) =>
      ux(e, "foldingPlatforms").startsWith(ux(dir, "foldingPlatforms") + sep_53),
    );
  } catch {
    return !1;
  }
}
//@ chunk-e6aww6q8.js:3643572-3643640 layout
function resolveWorktreeCwdForRemoval(e, n) {
  if (!hasUntouchableRecordSpelling(e)) return e;
  return rie(n)?.checkout ?? homedir_11();
}
/**
 * 保留 worktree（退出时选择保留），解除本进程的锁。
 */
//@ chunk-e6aww6q8.js:3643640-3644074 facade-exports = keepWorktree (0.829)
async function keepWorktree(e) {
  let n = getCurrentWorktreeSession();
  if (!n) return;
  try {
    let { worktreePath: worktreePath, originalCwd: originalCwd, worktreeBranch: worktreeBranch } = n,
      y = resolveWorktreeCwdForRemoval(originalCwd, worktreePath),
      S = findGitRoot(y) ?? y;
    try {
      processChdir(y);
    } catch (error) {
      logForDebugging(`Could not chdir to original directory while keeping worktree: ${error}`);
    }
    if (isOwnedWorktreeSession(n)) await releaseOwnWorktreeLock(worktreePath, S);
    (persistWorktreeSession(null, e),
      logForDebugging(
        `Linked worktree preserved at: ${worktreePath}${worktreeBranch ? ` on branch: ${worktreeBranch}` : ""}`,
      ),
      logForDebugging(`You can continue working there by running: cd ${worktreePath}`));
  } catch (error) {
    logForDebugging(`Error keeping worktree: ${error}`, { level: "error" });
  }
}
/**
 * 退出时清理会话 worktree：无改动则 git worktree remove 并删除分支，有改动保留并提示；hook 创建的走 WorktreeRemove hook。
 */
//@ chunk-e6aww6q8.js:3644074-3647459 facade-exports = cleanupWorktree (0.347)
async function cleanupWorktree(e, n) {
  let r = getCurrentWorktreeSession();
  if (!r) return !0;
  try {
    let {
        worktreePath: worktreePath,
        originalCwd: originalCwd,
        worktreeBranch: worktreeBranch,
        hookBased: hookBased,
      } = r,
      w = resolveWorktreeCwdForRemoval(originalCwd, worktreePath),
      L = findGitRoot(w) ?? w;
    try {
      processChdir(w);
    } catch (error) {
      logForDebugging(`Could not chdir to original directory while cleaning up worktree: ${error}`);
    }
    if (r.enteredExisting) {
      if (isOwnedWorktreeSession(r)) await releaseOwnWorktreeLock(worktreePath, L);
      return (persistWorktreeSession(null, e), !0);
    }
    let G = !1;
    if (hookBased) {
      let q = await executeWorktreeRemoveHook(
        { id: getSessionId(), project: { originalCwd: getOriginalCwd(), projectRoot: getProjectRoot() } },
        worktreePath,
        { storageV5: e, credentials: n },
      );
      switch (q.kind) {
        case "removed":
          ((G = !0), logForDebugging(`Removed hook-based worktree at: ${worktreePath}`));
          break;
        case "not_configured":
          logForDebugging(
            `No WorktreeRemove hook configured; falling back to removing the git worktree at: ${worktreePath}`,
          );
          break;
        case "failed":
          return (
            logForDebugging(`WorktreeRemove hook ${q.summary}; kept worktree at: ${worktreePath}`, {
              level: "warn",
            }),
            clearResumeHintWorktree(),
            persistWorktreeSession(null, e),
            !1
          );
      }
    }
    if (!G) {
      let q;
      try {
        q = await readWorktreeLockReason(worktreePath, L);
      } catch (error) {
        if (
          await lstat_31(worktreePath).then(
            () => !0,
            () => !1,
          )
        )
          return (
            logForDebugging(
              `cleanupWorktree: kept ${worktreePath} \u2014 cannot read the worktree registry to verify lock ownership (${errorMessage(error)})`,
              { level: "warn" },
            ),
            clearResumeHintWorktree(),
            persistWorktreeSession(null, e),
            !1
          );
        logForDebugging(
          `cleanupWorktree: worktree registry unreadable and ${worktreePath} is already gone (${errorMessage(error)}); continuing to the already-removed path`,
        );
      }
      if (!(await mayReleaseWorktreeLock(q)))
        return (
          logForDebugging(
            `cleanupWorktree: kept ${worktreePath} \u2014 locked by another live Claude Code process, or with a reason we did not write (${q || "no reason"})`,
            { level: "warn" },
          ),
          clearResumeHintWorktree(),
          persistWorktreeSession(null, e),
          !1
        );
      await unlockAgentWorktree(worktreePath, L);
      let Z = hookBased ? null : rie(worktreePath),
        Se = Tc(worktreePath),
        ke = getRepoRootForWorktreePath(Se);
      if (Z === null && cl(Se))
        return (
          logForDebugging(`Kept worktree \u2014 ${worktreePath} carries a dot segment`, { level: "warn" }),
          clearResumeHintWorktree(),
          persistWorktreeSession(null, e),
          !1
        );
      let we = normalize_7(Se),
        Ee = Tc(normalize_7(w)),
        Ae = [],
        Ie = findGitRoot(w);
      while (Ie !== null) {
        Ae.push(Ie);
        let gt = dirname_51(Ie),
          At = gt === Ie ? null : findGitRoot(gt);
        Ie =
          At !== null && At.length < Ie.length && Ie.startsWith(At.endsWith(sep_53) ? At : At + sep_53)
            ? At
            : null;
      }
      let sorted = [
          ...new Set(
            [findCanonicalGitRoot(w), ...Ae].filter((gt) => gt !== null).map((gt) => Tc(normalize_7(gt))),
          ),
          Ee,
        ].sort((gt, At) => gt.length - At.length),
        We = ke === null ? null : Tc(normalize_7(ke)),
        any = sorted.some((gt) => normalizePathKey(we).startsWith(normalizePathKey(gt) + sep_53)),
        found = sorted.find((current) => we.startsWith(current + sep_53)),
        Je =
          ke !== null && We !== null && (found === void 0 ? !any : found.startsWith(We + sep_53))
            ? ke
            : found,
        nt =
          Z !== null
            ? "clear"
            : await P1(
                Je === ke ? Se : we,
                Je !== void 0
                  ? Je === ke && found === void 0
                    ? dirname_51(Je)
                    : Je
                  : any
                    ? void 0
                    : dirname_51(we),
              );
      if (nt !== "clear" && nt !== "missing")
        return (
          logForDebugging(`Kept linked worktree \u2014 ${worktreePath} is a link, or cannot be probed`, {
            level: "warn",
          }),
          clearResumeHintWorktree(),
          persistWorktreeSession(null, e),
          !1
        );
      let pt = !1;
      if (hookBased && getPlatform() === "windows") {
        let gt = await listRegisteredWorktrees(L).catch(() => null);
        if (gt != null) {
          pt = !0;
          let At = await realpath_28(worktreePath).catch(() => worktreePath);
          for (let It of gt)
            if (At === (await realpath_28(It.worktreePath).catch(() => It.worktreePath))) {
              pt = !1;
              break;
            }
        }
      }
      let Et,
        yt = "";
      if (Z !== null)
        Et = await removeWorktreeRegistration(
          Z.checkout,
          worktreeBranch ?? basename_51(worktreePath),
          worktreePath,
          { byPathIn: Z.home, deregisterOnKeep: !1, dropIfStopped: !0 },
        );
      else if (nt === "missing")
        Et = (await pruneWorktreeRegistration(findCanonicalGitRoot(L) ?? L, Se)).outcome === "dropped";
      else {
        if (!pt && !(await clearReparsePoints(Se)))
          return (
            logForDebugging(`Kept linked worktree \u2014 unremovable reparse point in ${worktreePath}`, {
              level: "warn",
            }),
            clearResumeHintWorktree(),
            persistWorktreeSession(null, e),
            !1
          );
        let gt = await removeWorktreeSafely(L, Se, { resolveAboveParent: !0 });
        if (gt.outcome === "unanchored") {
          let At = await execFileNoThrowWithCwd(
            gitExe(),
            [...freeze_23, "worktree", "remove", "--force", Se],
            { cwd: L, env: buildGitEnvForRepo(L) },
          );
          ((Et = At.code === 0), (yt = At.stderr));
        } else ((Et = gt.outcome === "removed"), (yt = Et ? "" : worktreeRemovalText(gt)));
      }
      if (
        !Et &&
        (await lstat_31(worktreePath).then(
          () => !0,
          () => !1,
        ))
      )
        return (
          logForDebugging(
            `Failed to remove linked worktree, kept ${worktreePath}${yt.trim() ? `: ${yt.trim()}` : ""}`,
            { level: "warn" },
          ),
          clearResumeHintWorktree(),
          persistWorktreeSession(null, e),
          !1
        );
      (logForDebugging(`Removed linked worktree at: ${worktreePath}`),
        await restoreWorktreeConfigExtension(L));
    }
    if ((clearResumeHintWorktree(), persistWorktreeSession(null, e), !hookBased && worktreeBranch))
      (await sleep(100), await deleteWorktreeBranch(L, worktreeBranch, { logSuccess: !0 }));
    return (logForDebugging("Linked worktree cleaned up completely"), !0);
  } catch (error) {
    return (logForDebugging(`Error cleaning up worktree: ${error}`, { level: "error" }), !1);
  }
}
//@ chunk-e6aww6q8.js:3647459-3647914 layout
async function assertWorktreeDirExists(e, n) {
  let r = !1;
  try {
    r = (await stat_18(e)).isDirectory();
  } catch {}
  if (!r)
    throw (
      logFeatureBad("git_worktree_create", "git_worktree_create_path_missing"),
      new WorktreeIsolationError(
        n
          ? `WorktreeCreate hook returned a path that is not a directory: ${e}. The hook must create the directory before echoing its path.`
          : `Worktree directory does not exist at ${e} after creation. ` +
              "Refusing to launch agent in parent repo \u2014 check for concurrent worktree cleanup or filesystem errors.",
      )
    );
}
/**
 * 为子代理创建隔离 worktree（slug 形如 agent-a<hex>），优先 WorktreeCreate hook，否则在 .claude/worktrees 下创建并加锁。
 */
//@ chunk-e6aww6q8.js:3647914-3650083 facade-exports = createAgentWorktree (0.429)
async function createAgentWorktree(e, n) {
  (validateWorktreeSlug(e), refuseUnavailableWorktree("agent worktree"));
  let r = dispatchesWorktreeCreate()
    ? await executeWorktreeCreateHook(
        { id: getSessionId(), project: { originalCwd: getOriginalCwd(), projectRoot: getProjectRoot() } },
        e,
        { storageV5: n?.storageV5, credentials: n?.credentials },
      )
    : void 0;
  if (r) {
    if (cl(r.worktreePath))
      throw (
        logFeatureBad("git_worktree_create", "git_worktree_create_hook_ancestry_rejected"),
        new WorktreeIsolationError(
          `Cannot use the WorktreeCreate hook's worktree: the hook emitted a path with dot segments (${r.worktreePath}). The ` +
            "symlink screen cannot verify a dotted spelling \u2014 have the " +
            "hook emit a normalized (dot-free) absolute path and retry.",
        )
      );
    let q = n?.fromCwd ?? getCwd();
    for (let Ee of new Set([findCanonicalGitRoot(q), findGitRoot(q)].filter((Ae) => Boolean(Ae)))) {
      let Ae = await findSymlinkInWorktreeAncestry(r.worktreePath, Ee);
      if (Ae)
        throw (
          logFeatureBad("git_worktree_create", "git_worktree_create_hook_ancestry_rejected"),
          new WorktreeIsolationError(
            `Cannot use the WorktreeCreate hook's worktree: ${Ae.component} ` +
              (Ae.kind === "symlink" ? "is a symlink. " : "could not be verified. ") +
              "A repository-committed symlink below the checkout root could redirect the worktree outside the repository. Remove the symlink (or emit a path outside the repository) and retry.",
          )
        );
    }
    (await assertWorktreeDirExists(r.worktreePath, !0),
      logForDebugging(`Created hook-based agent worktree at: ${r.worktreePath}`));
    let Z = await checkWorktreeIsolation(r.worktreePath, [], gitRootsForPath(q));
    if (!Z.ok)
      throw (
        logFeatureBad("git_worktree_create", "git_worktree_create_root_rejected"),
        new WorktreeIsolationError(Z.message)
      );
    let Se = await execFileNoThrowWithCwd(gitExe(), [...freeze_23, "rev-parse", "HEAD"], {
        cwd: r.worktreePath,
        env: buildGitEnvForRepo(r.worktreePath),
      }),
      ke = Se.code === 0 ? Se.stdout.trim() : void 0,
      we = ke === void 0 ? await getHookWorktreeHead(r.worktreePath, q) : void 0;
    return (
      logFeatureOk("git_worktree_create"),
      {
        worktreePath: r.worktreePath,
        hookBased: !0,
        headCommit: ke,
        ...(ke === void 0 && { sessionDir: q }),
        ...(we !== void 0 && { baseChangeset: we }),
      }
    );
  }
  let s = n?.fromCwd ?? getCwd(),
    gitRoot = findCanonicalGitRoot(s);
  if (!gitRoot) throwAgentWorktreeNotGitRefusal();
  let {
    worktreePath: worktreePath,
    worktreeBranch: worktreeBranch,
    headCommit: headCommit,
    existed: existed,
  } = await getOrCreateWorktree(gitRoot, getWorktreesDirSpec(gitRoot), e, {
    fromHead: n?.fromHead,
    fromCwd: s,
  });
  if (!existed)
    (logForDebugging(`Created agent worktree at: ${worktreePath} on branch: ${worktreeBranch}`),
      await performPostCreationSetup(gitRoot, worktreePath));
  else logForDebugging(`Resuming existing agent worktree at: ${worktreePath}`);
  (await lockClaudeWorktree(worktreePath, gitRoot, e, "agent"),
    await assertWorktreeDirExists(worktreePath, !1));
  let G = await checkWorktreeIsolation(worktreePath, [], gitRootsForPath(s, gitRoot));
  if (!G.ok)
    throw (
      logFeatureBad("git_worktree_create", "git_worktree_create_root_rejected"),
      new WorktreeIsolationError(G.message)
    );
  return (
    logFeatureOk("git_worktree_create"),
    { worktreePath: worktreePath, worktreeBranch: worktreeBranch, headCommit: headCommit, gitRoot: gitRoot }
  );
}
//@ chunk-e6aww6q8.js:3650083-3650375 layout
async function isNestedInOtherRepo(e) {
  if (resolveGitDirs(e) !== null) return !1;
  let n = await execFileNoThrowWithCwd(gitExe(), [...freeze_23, "rev-parse", "--show-toplevel"], {
      cwd: e,
      env: getRemoteHostSessionCount(),
    }),
    trimmed = n.stdout.trim();
  if (n.code !== 0 || !trimmed) return !1;
  let s = resolve_37(await realpath_28(trimmed).catch(() => trimmed)),
    h = resolve_37(await realpath_28(e).catch(() => e));
  if (s === h) return !1;
  return getPlatform() === "windows" ? Cp(s) !== Cp(h) : !0;
}
/**
 * worktree 是否 dirty 以及相对创建提交领先的提交数。
 */
//@ chunk-e6aww6q8.js:3650375-3651154 facade-exports = hasWorktreeChanges (0.49)
async function getAgentWorktreeChanges(e, n, r) {
  let s = await getFilterNeutralizingArgs(e);
  if (s === null)
    return { dirty: !0, trackedChanges: !0, commitsAhead: 0, gitError: await isGitDirMissing(e) };
  let h = await execFileNoThrowWithCwd(gitExe(), [...s, ...freeze_23, ...freeze_2_2], {
    cwd: e,
    env: buildGitEnvForRepo(e, void 0, { userLocale: !0 }),
  });
  if (h.code !== 0) return { dirty: !0, trackedChanges: !0, commitsAhead: 0, gitError: !0 };
  let y = await inspectSubmodules(e),
    S = submoduleChanges(y),
    w = h.stdout.trim().length > 0 || S !== void 0,
    L = DMn(h.stdout) || y.kind === "unverifiable" || y.withTrackedChanges.length > 0;
  if (!n) return { dirty: w, trackedChanges: L, commitsAhead: 0, ...(S !== void 0 && { submoduleWork: S }) };
  let G = await execFileNoThrowWithCwd(gitExe(), [...freeze_23, "rev-list", "--count", `${n}..HEAD`], {
    cwd: e,
    env: buildGitEnvForRepo(e),
  });
  if (G.code !== 0) return { dirty: !0, trackedChanges: !0, commitsAhead: 0, gitError: !0 };
  return {
    dirty: w,
    trackedChanges: L,
    commitsAhead: parseInt(G.stdout.trim(), 10) || 0,
    ...(S !== void 0 && { submoduleWork: S }),
  };
}
//@ chunk-e6aww6q8.js:3651154-3651185 layout
async function getHookWorktreeHead(e, n) {
  return;
}
//@ chunk-e6aww6q8.js:3651185-3651213 layout
function getWorkingCopyRootFallback(e) {
  return null;
}
//@ chunk-e6aww6q8.js:3651213-3651253 facade-exports
async function getWorkingCopyWorktreeChanges(e, n, r, s) {
  return null;
}
//@ chunk-e6aww6q8.js:3651253-3651332 layout
function DMn(e) {
  return e
    .split(
      `
`,
    )
    .some((n) => n.length > 0 && !n.startsWith("??"));
}
//@ chunk-e6aww6q8.js:3651332-3651419 facade-exports
async function unlockAgentWorktree(e, n) {
  await execFileNoThrowWithCwd(gitExe(), [...freeze_23, "worktree", "unlock", e], {
    cwd: n,
    env: buildGitEnvForRepo(n),
  });
}
//@ chunk-e6aww6q8.js:3651419-3651488 placement
function runGitInWorktree(e, n) {
  return execFileNoThrowWithCwd(gitExe(), [...freeze_23, ...n], {
    cwd: e,
    env: buildGitEnvForRepo(e, fromEntries_2),
  });
}
//@ chunk-e6aww6q8.js:3651656-3651830 sole-consumer
async function isLocalBranchMissing(e, n) {
  let r = await runGitInWorktree(e, ["for-each-ref", "--count=1", "--format=%(refname)", `refs/heads/${n}`]);
  return r.code === 0 && r.stdout.trim() === "" && r.stderr.trim() === "";
}
/**
 * 判断 worktree 当前 HEAD 状态（its_branch/another_branch/detached/unreadable）及相对创建时提交的新增提交数，退出 worktree 时决定是否提示保留。
 */
//@ chunk-e6aww6q8.js:3651830-3652603 sole-consumer
async function getWorktreeBranchState({
  worktreePath: worktreePath,
  worktreeBranch: worktreeBranch,
  originalHeadCommit: originalHeadCommit,
  hookBased: hookBased,
}) {
  if (hookBased || !worktreeBranch) return null;
  let h = `refs/heads/${worktreeBranch}`,
    y = await runGitInWorktree(worktreePath, ["symbolic-ref", "-q", "HEAD"]),
    [, S] = /^refs\/heads\/(.+)$/.exec(y.stdout.replace(/\r?\n$/, "")) ?? [],
    isDetached = y.exitCode === 1 && y.stdout.trim() === "" && y.stderr.trim() === "";
  if (S === void 0 && !isDetached) return { head: "unreadable", commits: null };
  if (S !== void 0 && S !== worktreeBranch && foldPathCase(S) === foldPathCase(worktreeBranch))
    return { head: "like_its_branch", commits: null };
  let L = originalHeadCommit;
  if (S === worktreeBranch)
    return { head: "its_branch", commits: L ? await hasUnpushedCommits_2(worktreePath, [h], [L]) : null };
  if (S !== void 0) {
    let G = L
      ? ((await hasUnpushedCommits_2(worktreePath, [h], [`refs/heads/${S}`, L])) ??
        ((await isLocalBranchMissing(worktreePath, worktreeBranch)) ? 0 : null))
      : null;
    return { head: "another_branch", branch: S, commits: G };
  }
  return {
    head: "detached",
    commits: L
      ? ((await hasUnpushedCommits_2(worktreePath, [h, "HEAD"], [L])) ??
        ((await isLocalBranchMissing(worktreePath, worktreeBranch))
          ? await hasUnpushedCommits_2(worktreePath, ["HEAD"], [L])
          : null))
      : null,
  };
}
//@ chunk-e6aww6q8.js:3652603-3652841 facade-exports
function describeWhereCommitsAre(e, n, r) {
  switch (e.head) {
    case "another_branch":
    case "like_its_branch":
      return `on ${n} that ${r} doesn't have`;
    case "detached":
      return `on ${n} or at the detached HEAD`;
    case "its_branch":
    case "unreadable":
    case "not_read":
      return `on ${n}`;
  }
}
//@ chunk-e6aww6q8.js:3652841-3653222 facade-exports
async function countCommitsAtStake(e, n) {
  let { worktreePath: worktreePath, originalHeadCommit: originalHeadCommit } = e,
    h = n || readFlagWithOverride("tengu_wary_ladle", { safe: !0 }) ? await getWorktreeBranchState(e) : null;
  if (h === null)
    return {
      head: "not_read",
      commits: originalHeadCommit
        ? await hasUnpushedCommits_2(worktreePath, ["HEAD"], [originalHeadCommit])
        : null,
    };
  if (n || h.head !== "another_branch" || h.commits !== 0) return h;
  let y = originalHeadCommit
    ? await hasUnpushedCommits_2(worktreePath, [`refs/heads/${h.branch}`], [originalHeadCommit])
    : null;
  return y === 0 ? h : { head: h.head, branch: h.branch, commits: 0, onKeptBranch: y };
}
//@ chunk-e6aww6q8.js:3653222-3653505 layout
async function deleteWorktreeBranch(e, n, r) {
  let { code: code, stderr: stderr } = await execFileNoThrowWithCwd(
    gitExe(),
    [...freeze_23, "branch", "-D", "--end-of-options", n],
    { cwd: e, env: buildGitEnvForRepo(e) },
  );
  if (code !== 0)
    return (
      logForDebugging(`${r?.errorLabel ?? "Could not delete worktree branch"}: ${stderr}`, {
        level: "error",
      }),
      !1
    );
  if (r?.logSuccess) logForDebugging(`Deleted worktree branch: ${n}`);
  return !0;
}
/**
 * worktree 已不存在的 git 错误正则，以及 worktree 清理时的几类摘要文案（解析变化、文件未核对、无法删除的重解析点）。
 */
//@ chunk-e6aww6q8.js:3653505-3653770 facade-exports
var WORKTREE_GONE_RE =
    /is not a working tree|validation failed|not a git repository: .*[\\/]\.git[\\/]worktrees[\\/]/,
  IDENTITY_CHANGED_SUMMARY = "resolution changed since ownership verification",
  UNCHECKED_FILES_SUMMARY = "has files that were not checked against a repository",
  UNREMOVABLE_REPARSE_SUMMARY = "unremovable reparse point in the worktree";
//@ chunk-e6aww6q8.js:3653770-3653847 facade-exports
function carriesDiscardConsent(e) {
  return e === "job_delete_force" || e === "job_delete_force_remove";
}
//@ chunk-e6aww6q8.js:3653847-3653976 facade-exports
function repositoryVouchedByWorktree(e) {
  let n = Mn(resolve_37(e)),
    r = findGitRootUncached(e);
  if (r === null || Mn(resolve_37(r)) !== n) return null;
  let s = findCanonicalGitRootUncached(e);
  return s !== null && Mn(resolve_37(s)) !== n ? s : null;
}
//@ chunk-e6aww6q8.js:3653976-3654790 facade-exports
async function worktreeDeregisteredByRemoval(e, n) {
  let r = await resolveGitDir_2(e);
  if (r === null) return !1;
  let s = basename_51(r);
  if (s === "" || s === "." || s === "..") return !1;
  let h = await execFileNoThrowWithCwd(gitExe(), [...freeze_23, "rev-parse", "--git-common-dir"], {
      cwd: n,
      env: buildGitEnvForRepo(n),
    }),
    trimmed = h.stdout.trim();
  if (h.code !== 0 || !trimmed) return !1;
  let S = resolve_37(n, trimmed),
    w = await realpath_28(S).catch(() => S),
    L = (Se, ke) => (getPlatform() === "windows" ? Cp(Se) === Cp(ke) : Se === ke),
    G = dirname_51(r);
  if (!L(G, join_91(S, "worktrees")) && !L(G, join_91(w, "worktrees"))) return !1;
  try {
    return (await lstat_31(join_91(w, "worktrees", s)), !1);
  } catch (error) {
    if (!isENOENT(error) && getErrnoCode(error) !== "ENOTDIR") return !1;
  }
  let q = await vetWorktreeRegistration(n);
  if (!q.ok) return !1;
  let Z = await listRegisteredWorktrees(n, { vetted: q }).catch(() => null);
  if (Z === null) return !1;
  for (let Se of Z) {
    if (L(resolve_37(Se.worktreePath), e)) return !1;
    if (isNetworkOrUnsafePath(Se.worktreePath)) continue;
    let ke;
    try {
      ke = await realpath_28(Se.worktreePath);
    } catch (error) {
      if (!isENOENT(error) && getErrnoCode(error) !== "ENOTDIR") return !1;
      continue;
    }
    if (!isNetworkOrUnsafePath(ke) && L(ke, e)) return !1;
  }
  return !0;
}
/**
 * 不经 git 直接删除 agent worktree 目录（无仓库根 / hook 创建 / 强制删除三条路径）：必须是绝对、本地、无可疑链接、身份未变且直接位于 .claude/worktrees 下；
 * 强制删除时还要核对 .git 形态。记 tengu_worktree_removed 埋点，返回 {outcome, errorSummary?}。
 */
//@ chunk-e6aww6q8.js:3654875-3658413 sole-consumer
async function removeWorktreeDirWithoutGit(
  worktreePath,
  source,
  { vettedReal: r, via: s = "no_root", forced: h = !1, changedFiles: y = 0 } = {},
) {
  let S = (Ie) => (
      logForDebugging(
        `removeAgentWorktree: refused ${h ? "forced" : "no-root"} removal of ${worktreePath} \u2014 ${Ie}`,
        { level: "warn" },
      ),
      { outcome: "failed", errorSummary: Ie }
    ),
    w = (Ie) => (
      logEvent("tengu_worktree_removed", {
        source: fromEnum(source),
        changed_files: Ie === "deleted_forced" ? y : 0,
        commits: 0,
        ...(s === "hook" && { hook_based: !0 }),
        ...((Ie === "deleted_no_root" || (Ie === "already_gone" && s === "no_root")) && { no_root: 1 }),
        ...(Ie === "already_gone" && { already_gone: 1 }),
        ...(Ie === "deleted_forced" && { forced_rm: 1 }),
      }),
      Ie === "deleted_forced" ? { outcome: "removed", forcedDirectoryRemoval: {} } : { outcome: "removed" }
    );
  if (!isAbsolute_46(worktreePath)) return S("path is not absolute");
  let L = getCwd(),
    G = (Ie) => isNetworkOrOutsidePath(Ie, L);
  if (G(worktreePath)) return S("network path (UNC or automount)");
  if (cl(worktreePath)) return S("unverifiable symlinked ancestor");
  let q = resolveDeepestExistingAncestorSync(getFsImplementation(), worktreePath, {
    surfaceNetworkRaw: !0,
    anchor: L,
  });
  if (q === UNVERIFIED_ANCESTRY) return S("unverifiable symlinked ancestor");
  if (q !== void 0 && G(q)) return S("network path (UNC or automount)");
  if (q !== void 0 && cl(q)) return S("unverifiable symlinked ancestor");
  let Z;
  try {
    Z = await lstat_31(worktreePath);
  } catch (error) {
    if (!isENOENT(error) && getErrnoCode(error) !== "ENOTDIR")
      return S(`cannot stat the directory (${getErrnoCode(error) ?? "unknown error"})`);
    return (
      logForDebugging(
        s === "no_root"
          ? `removeAgentWorktree: ${worktreePath} already gone and no git root resolves \u2014 nothing left to remove`
          : `removeAgentWorktree: ${worktreePath} already gone \u2014 nothing left to remove (${s} lane)`,
      ),
      w("already_gone")
    );
  }
  if (!Z.isDirectory()) return S("not a directory");
  let Se = await realpath_28(worktreePath).catch(() => null);
  if (Se === null) return S("could not canonicalize the path");
  if (G(Se)) return S("network path (UNC or automount)");
  if (r !== void 0 && Se !== r) return S(IDENTITY_CHANGED_SUMMARY);
  if (!isDirectlyUnderClaudeWorktreesDir(Se))
    return S("it isn't directly under a .claude/worktrees directory, so it is never deleted automatically");
  if (h) {
    let Ie;
    try {
      let Me = await lstat_31(join_91(Se, ".git"));
      Ie = Me.isDirectory() ? "directory" : Me.isFile() ? "file" : "unverifiable";
    } catch (error) {
      Ie = isENOENT(error) || getErrnoCode(error) === "ENOTDIR" ? "none" : "unverifiable";
    }
    switch (Ie) {
      case "file":
        break;
      case "directory":
        return S(
          "it is a standalone git repository, and deleting it would destroy the only copy of its history",
        );
      case "none":
        return S(
          "it has no .git file of its own linking it to a repository, so it is never deleted by force",
        );
      case "unverifiable":
        return S("its .git entry couldn't be verified");
    }
  } else if ((await findGitRootVerifyingPositive(Se)) !== null) return S("still resolves to a repository");
  let ke = await readdir_25(Se).catch(() => null);
  if (ke === null) return S("unreadable directory");
  if (!h && ke.length > 0 && !carriesDiscardConsent(source))
    return (
      logForDebugging(
        `removeAgentWorktree: kept rootless ${worktreePath} \u2014 ${ke.length} unverifiable file(s); only an explicit discard may remove them`,
        { level: "warn" },
      ),
      logEvent("tengu_worktree_removed", {
        source: fromEnum(source),
        changed_files: 0,
        commits: 0,
        no_root: 1,
        aborted: 1,
      }),
      { outcome: "failed", errorSummary: UNCHECKED_FILES_SUMMARY, needsForce: !0 }
    );
  if ((await realpath_28(Se).catch(() => null)) !== Se) return S(IDENTITY_CHANGED_SUMMARY);
  if (!(await clearReparsePoints(Se)))
    return (
      logForDebugging(
        `removeAgentWorktree: aborted ${source} removal \u2014 unremovable reparse point in ${worktreePath}`,
        { level: "warn" },
      ),
      { outcome: "failed", errorSummary: UNREMOVABLE_REPARSE_SUMMARY }
    );
  if ((await realpath_28(Se).catch((Ie) => (isENOENT(Ie) ? Se : null))) !== Se)
    return S(IDENTITY_CHANGED_SUMMARY);
  let Ae = h ? await resolveGitDir_2(Se) : null;
  try {
    if (h) {
      for (let Ie of ke) if (Ie !== ".git") await rm_19(join_91(Se, Ie), { recursive: !0, force: !0 });
    }
    await rm_19(Se, { recursive: !0, force: !0 });
  } catch (error) {
    if (Ae !== null) await restoreWorktreeGitPointer(Se, Ae, Z);
    return (
      logForDebugging(`removeAgentWorktree: could not delete ${worktreePath}: ${errorMessage(error)}`, {
        level: "warn",
      }),
      {
        outcome: "failed",
        errorSummary: `the directory could not be deleted (${getErrnoCode(error) ?? "unknown error"})`,
        ...(h && { forceRemovable: "rm_failed" }),
      }
    );
  }
  return (
    logForDebugging(
      h
        ? `Removed agent worktree by force (${s} lane) at: ${worktreePath}`
        : `Removed agent worktree with no git root at: ${worktreePath}`,
    ),
    w(h ? "deleted_forced" : "deleted_no_root")
  );
}
//@ chunk-e6aww6q8.js:3658413-3658678 sole-consumer
async function compareInodeIdentity(e, n) {
  let [r, s] = await Promise.all([
    stat_18(e, { bigint: !0 }).catch(() => null),
    stat_18(n, { bigint: !0 }).catch(() => null),
  ]);
  if (r === null || s === null || !hasInode(r.ino) || !hasInode(s.ino) || r.dev === 0n || s.dev === 0n)
    return "unknown";
  return r.dev === s.dev && r.ino === s.ino ? "same" : "different";
}
/**
 * 计算存储路径的真实身份路径：在仓库根下直接拼接；经祖先链接进入时按 inode 找到对应祖先；若从外部链接进入仓库则拒绝（inside_root）。
 */
//@ chunk-e6aww6q8.js:3658678-3659510 sole-consumer
async function resolveWorktreeIdentity(storedPath, repoRoot) {
  let r = Tc(normalize_7(storedPath)),
    s = [];
  for (let y = dirname_51(r); dirname_51(y) !== y; y = dirname_51(y)) s.push(y);
  if (repoRoot !== void 0) {
    let y = Tc(normalize_7(repoRoot)),
      S = await realpath_28(y).catch(() => null);
    if (S === null) return { refused: "unreadable" };
    let w = Tc(S);
    if (r.startsWith(y + sep_53)) return { identity: w + r.slice(y.length) };
    let L = null;
    for (let q of s) {
      let Z = await compareInodeIdentity(q, w);
      if (Z === "unknown") return { refused: "unreadable" };
      if (Z === "same") L = q;
    }
    if (L !== null) return { identity: w + r.slice(L.length) };
    let G = null;
    for (let q of s) {
      let Z = await realpath_28(q).catch(() => null);
      if (Z === null) return { refused: "unreadable" };
      G ??= Z;
      for (let Se = Tc(Z); dirname_51(Se) !== Se; Se = dirname_51(Se)) {
        let ke = await compareInodeIdentity(Se, w);
        if (ke !== "different") return { refused: ke === "same" ? "inside_root" : "unreadable" };
      }
    }
    return G === null ? { refused: "unreadable" } : { identity: join_91(G, basename_51(r)) };
  }
  let h = await realpath_28(dirname_51(r)).catch(() => null);
  return h === null ? { refused: "unreadable" } : { identity: join_91(h, basename_51(r)) };
}
/**
 * 强制删除 agent worktree：身份必须与核验一致、.git 必须链接到该仓库，已跟踪文件需无改动（git status 校验），再删除目录并处理分支。失败返回 {outcome:"failed", errorSummary}。
 */
//@ chunk-e6aww6q8.js:3659510-3662869 sole-consumer
async function forceRemoveAgentWorktree(
  worktreePath,
  vettedIdentity,
  repoRoot,
  { via: via, source: source, changedFiles: changedFiles = 0, keptBranch: keptBranch },
) {
  let w = await resolveWorktreeIdentity(worktreePath, repoRoot);
  if ("refused" in w)
    return (
      logForDebugging(
        `removeAgentWorktree: refused forced removal of ${worktreePath} \u2014 ${w.refused === "inside_root" ? "the stored path reaches into the repository through a link from outside it" : "the directory at the stored path could not be identified"}`,
        { level: "warn" },
      ),
      {
        outcome: "failed",
        errorSummary:
          w.refused === "inside_root"
            ? "the path reaches into the repository through a link from outside it, so nothing was deleted by force; remove the link or the directory by hand"
            : "the directory at this path could not be identified, so nothing was deleted by force; remove it by hand",
      }
    );
  if (vettedIdentity !== w.identity)
    return (
      logForDebugging(
        `removeAgentWorktree: refused forced removal of ${worktreePath} \u2014 the vetted identity is not the stored path's own`,
        { level: "warn" },
      ),
      {
        outcome: "failed",
        errorSummary:
          "the directory that was checked is not the one at this path, so nothing was deleted by force; retry, or remove the link or the directory by hand",
      }
    );
  let L = repositoryVouchedByWorktree(vettedIdentity),
    G =
      repoRoot !== void 0 &&
      L !== null &&
      (await realpath_28(L).catch(() => L)) === (await realpath_28(repoRoot).catch(() => repoRoot));
  if (repoRoot === void 0 || (!G && !(await worktreeDeregisteredByRemoval(vettedIdentity, repoRoot))))
    return (
      logForDebugging(
        `removeAgentWorktree: refused forced removal of ${worktreePath} \u2014 its .git does not link it to ${repoRoot ?? "any repository"}`,
        { level: "warn" },
      ),
      {
        outcome: "failed",
        errorSummary:
          "its own .git doesn't link it to the repository it would be pruned from, so it is never deleted by force",
      }
    );
  let q = keptBranch;
  if (G) {
    let we = await getFilterNeutralizingArgs(vettedIdentity),
      Ee = buildGitEnvForRepo(vettedIdentity, void 0, { userLocale: !0 }),
      Ae = we
        ? await execFileNoThrowWithCwd(gitExe(), [...we, ...freeze_23, ...freeze_2_2], {
            cwd: vettedIdentity,
            env: Ee,
          })
        : null;
    if (Ae === null || Ae.code !== 0)
      return (
        logForDebugging(
          `removeAgentWorktree: refused forced removal of ${worktreePath} \u2014 git status failed, cannot verify tracked files are unchanged`,
          { level: "warn" },
        ),
        {
          outcome: "failed",
          errorSummary:
            "its tracked files couldn't be checked for uncommitted changes (git status failed there)",
        }
      );
    if (DMn(Ae.stdout))
      return (
        logForDebugging(
          `removeAgentWorktree: refused forced removal of ${worktreePath} \u2014 uncommitted changes to tracked files`,
          { level: "warn" },
        ),
        {
          outcome: "failed",
          errorSummary: "it has uncommitted changes to tracked files, so it is never deleted by force",
        }
      );
    let Ie = await inspectSubmodules(vettedIdentity),
      Me =
        Ie.kind === "unverifiable"
          ? Ie
          : Ie.withTrackedChanges.length > 0
            ? { kind: "changes", paths: Ie.withTrackedChanges }
            : void 0;
    if (Me !== void 0)
      return (
        logForDebugging(
          `removeAgentWorktree: refused forced removal of ${worktreePath} \u2014 submodule work unverified or uncommitted`,
          { level: "warn" },
        ),
        {
          outcome: "failed",
          errorSummary: `${Me.kind === "changes" ? "it has uncommitted " : ""}${describeSubmoduleChanges(Me)}, so it is never deleted by force`,
        }
      );
    let We = await execFileNoThrowWithCwd(gitExe(), [...freeze_23, "symbolic-ref", "--short", "-q", "HEAD"], {
      cwd: vettedIdentity,
      env: Ee,
    });
    if (We.code === 0 && We.stdout.trim()) q = We.stdout.trim();
  } else
    logForDebugging(
      `removeAgentWorktree: ${worktreePath} is no longer registered with ${repoRoot} though its own .git still names it \u2014 deleting it as asked, nothing left to verify its contents against`,
      { level: "warn" },
    );
  let Z = await removeWorktreeDirWithoutGit(worktreePath, source, {
    vettedReal: vettedIdentity,
    via: via,
    forced: !0,
    changedFiles: changedFiles,
  });
  if (Z.outcome !== "removed") return Z;
  let Se = await pruneWorktreeRegistration(repoRoot, [worktreePath, vettedIdentity]);
  if (Se.outcome !== "dropped")
    logForDebugging(
      `removeAgentWorktree: the registration of ${worktreePath} in ${repoRoot} was not dropped after the forced removal (${Se.outcome === "kept" ? Se.reason : "no registration names it"})`,
      { level: "warn" },
    );
  return (
    await restoreWorktreeConfigExtension(repoRoot),
    Z.forcedDirectoryRemoval !== void 0 &&
    q !== void 0 &&
    (
      await execFileNoThrowWithCwd(
        gitExe(),
        [...freeze_23, "show-ref", "--verify", "--quiet", `refs/heads/${q}`],
        { cwd: repoRoot, env: buildGitEnvForRepo(repoRoot) },
      )
    ).code === 0
      ? { outcome: "removed", forcedDirectoryRemoval: { keptBranch: q } }
      : Z
  );
}
//@ chunk-e6aww6q8.js:3662869-3670830 facade-exports
async function removeAgentWorktree(
  e,
  n,
  r,
  s,
  h = "unknown",
  y,
  S,
  { storageV5: w, credentials: L, forceRemoveRequested: G = !1, keepsWorktreesInside: q } = {},
) {
  if (s) {
    if (!isAbsolute_46(e) || cl(e) || isNetworkOrOutsidePath(e, getCwd()))
      return removeWorktreeDirWithoutGit(e, h, { vettedReal: y, via: "hook" });
    let gt = e;
    if (y !== void 0) {
      let Yt = getCwd(),
        qt = resolveDeepestExistingAncestorSync(getFsImplementation(), e, {
          surfaceNetworkRaw: !0,
          anchor: Yt,
        });
      if (qt === UNVERIFIED_ANCESTRY || (qt !== void 0 && (isNetworkOrOutsidePath(qt, Yt) || cl(qt))))
        return removeWorktreeDirWithoutGit(e, h, { vettedReal: y, via: "hook" });
      let Zt;
      try {
        Zt = await lstat_31(e);
      } catch (error) {
        if (isENOENT(error) || getErrnoCode(error) === "ENOTDIR")
          return removeWorktreeDirWithoutGit(e, h, { vettedReal: y, via: "hook" });
        return {
          outcome: "failed",
          errorSummary: `cannot stat the worktree path (${getErrnoCode(error) ?? "unknown error"})`,
        };
      }
      if (Zt.isSymbolicLink())
        return (
          logForDebugging(
            `removeAgentWorktree: refused hook removal of ${e} \u2014 stored worktree path is a symlink`,
            { level: "warn" },
          ),
          {
            outcome: "failed",
            errorSummary:
              "the stored worktree path is a symlink \u2014 remove the link itself to clear this session",
          }
        );
      for (let pn of new Set([r, S].filter((no) => Boolean(no)))) {
        let no = await findSymlinkInWorktreeAncestry(e, pn);
        if (no)
          return (
            logForDebugging(
              `removeAgentWorktree: refused hook removal of ${e} \u2014 ${no.kind} at ${no.component}`,
              { level: "warn" },
            ),
            {
              outcome: "failed",
              errorSummary:
                no.kind === "symlink"
                  ? "a component of the stored worktree path is a symlink \u2014 remove the worktree at its resolved location (or the link, if the worktree is already gone), then retry"
                  : "a component of the stored worktree path could not be verified \u2014 check its permissions, then retry",
            }
          );
      }
      if (!carriesDiscardConsent(h)) {
        let pn = await readdir_25(e).catch(() => null);
        if (pn === null) return { outcome: "failed", errorSummary: "unreadable directory" };
        if (pn.length > 0)
          return (
            logForDebugging(
              `removeAgentWorktree: kept hook worktree ${e} \u2014 ${pn.length} unverifiable file(s); only an explicit discard may dispatch the remove hook`,
              { level: "warn" },
            ),
            logEvent("tengu_worktree_removed", {
              source: fromEnum(h),
              changed_files: 0,
              commits: 0,
              hook_based: !0,
              aborted: 1,
            }),
            { outcome: "failed", errorSummary: UNCHECKED_FILES_SUMMARY, needsForce: !0 }
          );
      }
      let rn;
      try {
        rn = await realpath_28(e);
      } catch (error) {
        if (isENOENT(error) || getErrnoCode(error) === "ENOTDIR")
          return removeWorktreeDirWithoutGit(e, h, { vettedReal: y, via: "hook" });
        return {
          outcome: "failed",
          errorSummary: `cannot resolve the worktree path (${getErrnoCode(error) ?? "unknown error"})`,
        };
      }
      if (rn !== y)
        return (
          logForDebugging(
            `removeAgentWorktree: refused hook removal of ${e} \u2014 ${IDENTITY_CHANGED_SUMMARY}`,
            { level: "warn" },
          ),
          { outcome: "failed", errorSummary: IDENTITY_CHANGED_SUMMARY }
        );
      if (isNetworkOrOutsidePath(rn, Yt))
        return removeWorktreeDirWithoutGit(e, h, { vettedReal: y, via: "hook" });
      gt = y;
    }
    let At = await executeWorktreeRemoveHook(
      { id: getSessionId(), project: { originalCwd: getOriginalCwd(), projectRoot: getProjectRoot() } },
      gt,
      { storageV5: w, credentials: L },
    );
    if (At.kind === "removed")
      return (
        logEvent("tengu_worktree_removed", {
          source: fromEnum(h),
          changed_files: 0,
          commits: 0,
          hook_based: !0,
        }),
        logForDebugging(`Removed hook-based agent worktree at: ${e}`),
        { outcome: "removed" }
      );
    let It =
      At.kind === "failed"
        ? `the WorktreeRemove hook ${At.summary}`
        : "no WorktreeRemove hook is enabled here (hooks are disabled, or the repo defines only WorktreeCreate)";
    if (h === "job_delete_force_remove" && y !== void 0)
      return (
        logForDebugging(`removeAgentWorktree: ${It} \u2014 removing ${e} by force`, { level: "warn" }),
        forceRemoveAgentWorktree(e, y, r, { via: "hook", source: h, keptBranch: n })
      );
    return (
      logForDebugging(`removeAgentWorktree: kept hook-based worktree ${e} \u2014 ${It}`, { level: "warn" }),
      {
        outcome: "failed",
        errorSummary: It,
        forceRemovable: At.kind === "failed" ? "hook_failed" : "hook_not_enabled",
      }
    );
  }
  if (!r) return removeWorktreeDirWithoutGit(e, h, { vettedReal: y });
  await unlockAgentWorktree(e, r);
  let Z = await getFilterNeutralizingArgs(e),
    Se = Z
      ? await execFileNoThrowWithCwd(gitExe(), [...Z, ...freeze_23, ...freeze_2_2], {
          cwd: e,
          env: buildGitEnvForRepo(e, void 0, { userLocale: !0 }),
        })
      : null,
    ke = Se?.code !== 0 && !(await isGitDirMissing(e)),
    we =
      Se?.code === 0 && Se.stdout.trim()
        ? countCharInString(
            Se.stdout.trim(),
            `
`,
          ) + 1
        : 0;
  if (Se?.code === 0) {
    let gt = submoduleChanges(await inspectSubmodules(e));
    if (gt !== void 0) we += gt.kind === "changes" ? gt.paths.length : 1;
  }
  if (ke && (await isNestedInOtherRepo(e))) ke = !1;
  if ((we > 0 || ke) && h !== "exit_tool" && h !== "exit_dialog" && !carriesDiscardConsent(h)) {
    let gt = ke
      ? "could not verify the worktree is clean (git status failed or repository git config unpinnable)"
      : `${we} changed file(s) would be lost`;
    return (
      logForDebugging(`removeAgentWorktree: aborted ${h} removal \u2014 ${gt}, kept ${e}`, { level: "warn" }),
      logEvent("tengu_worktree_removed", { source: fromEnum(h), changed_files: we, commits: 0, aborted: 1 }),
      { outcome: "failed", errorSummary: gt }
    );
  }
  let Ae = !1;
  if (y !== void 0) {
    let gt = await realpath_28(e).catch((At) =>
      isENOENT(At) || getErrnoCode(At) === "ENOTDIR" ? null : void 0,
    );
    if (gt === null) Ae = !0;
    else if (gt === void 0 || gt !== y) return { outcome: "failed", errorSummary: IDENTITY_CHANGED_SUMMARY };
  }
  if (!Ae && !(await clearReparsePoints(e)))
    return (
      logForDebugging(`removeAgentWorktree: aborted ${h} removal \u2014 unremovable reparse point in ${e}`, {
        level: "warn",
      }),
      { outcome: "failed", errorSummary: UNREMOVABLE_REPARSE_SUMMARY }
    );
  let Ie = null;
  if (n) {
    let gt = await execFileNoThrowWithCwd(gitExe(), [...freeze_23, "symbolic-ref", "--short", "-q", "HEAD"], {
      cwd: e,
      env: buildGitEnvForRepo(e),
    });
    Ie = gt.code === 0 ? gt.stdout.trim() : null;
  }
  let Me = h === "job_delete_force_remove" && y !== void 0,
    We = y !== void 0 ? await lstat_31(y).catch(() => null) : null,
    ze = We !== null && y !== void 0 ? await resolveGitDir_2(y) : null,
    lt = await pruneWorktreeRegistrations(r, e, {
      forceTwice: Me,
      pinRepository: !0,
      deregisterIfStopped: !0,
    }),
    Je = lt.outcome === "removed" ? 0 : 1,
    nt = lt.outcome === "failed" ? lt.stderr : lt.outcome === "removed" ? "" : lt.reason,
    pt = lt.outcome === "failed" ? lt.checkout : void 0,
    Et =
      lt.outcome === "unregistered" ||
      pt === "not_pointing_back" ||
      (pt === void 0 && (lt.outcome === "failed" || lt.outcome === "unlisted") && WORKTREE_GONE_RE.test(nt)),
    yt = !1;
  if (
    Je !== 0 &&
    (await lstat_31(e).then(
      () => !0,
      () => !1,
    ))
  ) {
    if (lt.outcome === "kept") {
      let qt = await Ldr(e, r);
      if (!Me || !qt)
        return {
          outcome: "failed",
          errorSummary: `refused before anything was deleted (${printableLabel(lt.reason, { head: 60, tail: 120 })})${qt ? "" : "; remove it by hand"}`,
          ...(qt && { forceRemovable: "git_refused" }),
        };
    }
    if (ze !== null && We !== null && y !== void 0) await restoreWorktreeGitPointer(y, ze, We);
    let gt = { via: "git", source: h, changedFiles: we, keptBranch: Ie ?? n };
    if (Me)
      return (
        logForDebugging(
          `removeAgentWorktree: the removal refused or the registration vet kept ${e} (${nt.trim()}) \u2014 deleting the directory`,
          { level: "warn" },
        ),
        forceRemoveAgentWorktree(e, y, r, gt)
      );
    let At = printableLabel(getFirstLine(nt.trim()).replace(/^(fatal|error|warning):\s*/, ""), {
        head: 40,
        tail: 100,
      }),
      It = y !== void 0 && (await worktreeDeregisteredByRemoval(y, r));
    if (Et) {
      if (It || G)
        return (
          logForDebugging(
            `removeAgentWorktree: git's registration no longer matches ${e} (${nt.trim()}) \u2014 ${It ? "its own .git still names the dropped registration" : "a forced retry was asked for"}, kept with its record`,
            { level: "warn" },
          ),
          {
            outcome: "failed",
            errorSummary: It
              ? "git no longer has it registered as a worktree (its own .git still points at that repository, the way a removal that failed partway leaves it), so nothing can check its files any more"
              : pt === "not_pointing_back"
                ? "its .git file is missing or does not point to git's record of it"
                : `git no longer has it registered as a worktree (${At})`,
            forceRemovable: "git_refused",
          }
        );
      let qt = await deregisterWorktreeEntry(r, ze, y === void 0 ? [e] : [e, y]);
      return (
        await restoreWorktreeConfigExtension(r),
        logForDebugging(
          qt
            ? `removeAgentWorktree: git's registration no longer matches ${e} (${nt.trim()}) \u2014 dropped the stale registration, left the directory in place`
            : `removeAgentWorktree: git's registration no longer matches ${e} (${nt.trim()}) \u2014 no stale registration of it was dropped from ${r}, left the directory in place`,
          { level: "warn" },
        ),
        logEvent("tengu_worktree_removed", {
          source: fromEnum(h),
          changed_files: we,
          commits: 0,
          left_in_place: 1,
          ...(qt && { deregistered_stale: 1 }),
        }),
        { outcome: "left_in_place" }
      );
    }
    if (!It || y === void 0 || pt !== void 0)
      return (
        logForDebugging(`removeAgentWorktree: removal failed, kept ${e}: ${nt.trim()}`, { level: "warn" }),
        {
          outcome: "failed",
          errorSummary: `${pt === void 0 ? "git" : "Claude Code"} couldn't remove it${At ? ` (${At})` : ""}`,
          forceRemovable: pt === "delete_failed" ? "rm_failed" : "git_refused",
        }
      );
    logForDebugging(
      `removeAgentWorktree: git worktree remove deregistered ${e} but could not delete it (${nt.trim()}) \u2014 deleting what it left`,
      { level: "warn" },
    );
    let Yt = await forceRemoveAgentWorktree(e, y, r, gt);
    if (Yt.outcome !== "removed")
      return Yt.outcome === "failed" && Yt.forceRemovable === "rm_failed"
        ? {
            outcome: "failed",
            errorSummary: `git gave up its registration but couldn't delete the directory (${At}); Claude Code then tried, and ${Yt.errorSummary ?? "could not either"}`,
            forceRemovable: "rm_failed",
          }
        : Yt;
    yt = !0;
  }
  if (lt.outcome === "kept" || lt.outcome === "unlisted")
    await pruneWorktreeRegistration(r, y === void 0 ? e : [e, y], { locked: Me ? "drop" : "keep" });
  if ((logForDebugging(`Removed agent worktree at: ${e}`), !yt))
    (await restoreWorktreeConfigExtension(r),
      logEvent("tengu_worktree_removed", { source: fromEnum(h), changed_files: we, commits: 0 }));
  if (!n) return { outcome: "removed" };
  if (Ie !== n)
    return (
      logForDebugging(
        `removeAgentWorktree: kept branch ${n} \u2014 not the checked-out branch (${Ie ?? "detached or dir gone"}), so no safety check ever verified it`,
      ),
      { outcome: "removed" }
    );
  return (
    await deleteWorktreeBranch(r, n, { errorLabel: "Could not delete agent worktree branch" }),
    { outcome: "removed" }
  );
}
//@ chunk-e6aww6q8.js:3670830-3670904 layout
var CLAUDE = "claude",
  ENABLEDWORKTREECONFIGEXTENSION = "enabledWorktreeConfigExtension",
  UMn = `${CLAUDE}.${ENABLEDWORKTREECONFIGEXTENSION}`;
/**
 * 删除最后一个 linked worktree 后，若 extensions.worktreeConfig 是 Claude Code 开启的且 config.worktree 为空，则 unset 该扩展与配套键。
 */
//@ chunk-e6aww6q8.js:3670904-3671717 layout
async function restoreWorktreeConfigExtension(e) {
  try {
    let n = await resolveGitDir(e),
      r = n ? ((await getCommonDir(n)) ?? n) : null;
    if (!r || (await IMn(r, CLAUDE, null, ENABLEDWORKTREECONFIGEXTENSION)) === null) return;
    try {
      if ((await lstat_31(join_91(r, "config.worktree"))).size > 0) return;
    } catch (error) {
      if (!isENOENT(error) && getErrnoCode(error) !== "ENOTDIR") return;
    }
    let s = 0;
    for (let y of await listRegisteredWorktrees(e)) {
      if (isNetworkOrUnsafePath(y.worktreePath)) {
        s++;
        continue;
      }
      if (
        (await lstat_31(y.worktreePath).then(
          () => !1,
          (w) => isENOENT(w) || getErrnoCode(w) === "ENOTDIR",
        )) &&
        (await mayReleaseWorktreeLock(y.lockReason))
      )
        continue;
      s++;
    }
    if (s > 1) return;
    let h = await execFileNoThrowWithCwd(
      gitExe(),
      [...freeze_23, "config", "--local", "--unset-all", "extensions.worktreeConfig"],
      { cwd: e, env: buildGitEnvForRepo(e) },
    );
    if (h.exitCode !== 0 && h.exitCode !== 5) return;
    (await execFileNoThrowWithCwd(gitExe(), [...freeze_23, "config", "--local", "--unset-all", UMn], {
      cwd: e,
      env: buildGitEnvForRepo(e),
    }),
      logForDebugging(`Restored extensions.worktreeConfig in ${e} after removing its last linked worktree`));
  } catch (error) {
    logForDebugging(`Could not restore extensions.worktreeConfig for ${e}: ${errorMessage(error)}`, {
      level: "warn",
    });
  }
}
/**
 * 当前分支上游已 gone 且相对 n 没有独有（cherry-pick 后）提交时返回 true。
 */
//@ chunk-e6aww6q8.js:3671717-3672191 layout
async function isUpstreamGoneAndMerged(e, n) {
  let r = await execFileNoThrowWithCwd(gitExe(), [...freeze_23, "symbolic-ref", "-q", "HEAD"], {
      cwd: e,
      env: buildGitEnvForRepo(e),
    }),
    trimmed = r.stdout.trim();
  if (r.code !== 0 || !trimmed) return !1;
  let h = await execFileNoThrowWithCwd(
    gitExe(),
    [...freeze_23, "for-each-ref", "--format=%(upstream:track,nobracket)", trimmed],
    { cwd: e, env: buildGitEnvForRepo(e) },
  );
  if (h.code !== 0 || h.stdout.trim() !== "gone") return !1;
  let y = await execFileNoThrowWithCwd(
    gitExe(),
    [
      ...freeze_23,
      "rev-list",
      "--cherry-pick",
      "--right-only",
      "--no-merges",
      "--max-count=1",
      `${n}...HEAD`,
    ],
    { cwd: e, env: buildGitEnvForRepo(e) },
  );
  return y.code === 0 && y.stdout.trim().length === 0;
}
/**
 * 找远程基准分支：origin/HEAD 指向，否则 origin/main、origin/master。
 */
//@ chunk-e6aww6q8.js:3672191-3672521 facade-exports = findRemoteBase (0.434)
async function getDefaultRemoteRef(e) {
  let n = await execFileNoThrowWithCwd(
    gitExe(),
    [...freeze_23, "symbolic-ref", "-q", "--short", "refs/remotes/origin/HEAD"],
    { cwd: e, env: buildGitEnvForRepo(e) },
  );
  if (n.code === 0 && n.stdout.trim()) return n.stdout.trim();
  for (let r of ["origin/main", "origin/master"])
    if (
      (
        await execFileNoThrowWithCwd(gitExe(), [...freeze_23, "rev-parse", "--verify", "-q", r], {
          cwd: e,
          env: buildGitEnvForRepo(e),
        })
      ).code === 0
    )
      return r;
  return null;
}
/**
 * 清理超过截止时间、无改动、锁持有进程已退出的代理 worktree。
 */
//@ chunk-e6aww6q8.js:3672521-3673044 facade-exports = cleanupStaleAgentWorktrees (0.477)
async function passesCommitSafetyChecks(e, n, { primaryCheckoutVouches: primaryCheckoutVouches }) {
  let s = [...freeze_23, "rev-list", "--max-count=1", "HEAD", "--not", "--remotes"],
    h = await execFileNoThrowWithCwd(gitExe(), s, { cwd: e, env: buildGitEnvForRepo(e) });
  if (h.code !== 0) return !1;
  if (h.stdout.trim().length === 0) return !0;
  if (primaryCheckoutVouches) {
    let L = await getUpstreamBranchRef(e, n);
    if (L) {
      let G = await execFileNoThrowWithCwd(gitExe(), [...s, L, "--"], { cwd: e, env: buildGitEnvForRepo(e) });
      if (G.code === 0 && !G.stdout.trim()) return !0;
    }
  }
  let [y, S] = await Promise.all([
    execFileNoThrowWithCwd(gitExe(), [...freeze_23, "rev-parse", "HEAD"], {
      cwd: e,
      env: buildGitEnvForRepo(e),
    }),
    readWorktreeBaseline(e),
  ]);
  if (y.code === 0 && S !== null && y.stdout.trim() === S) return !0;
  return n !== null && (await isUpstreamGoneAndMerged(e, n));
}
//@ chunk-e6aww6q8.js:3673044-3673758 layout
async function getUpstreamBranchRef(e, n) {
  if (!n?.startsWith("origin/")) return null;
  let r = `refs/heads/${n.slice(7)}`,
    s = await execFileNoThrowWithCwd(
      gitExe(),
      [...freeze_23, "rev-parse", "--git-dir", "--git-common-dir", "--symbolic-full-name", "HEAD"],
      { cwd: e, env: buildGitEnvForRepo(e) },
    ),
    parts = s.stdout.trim().split(`
`),
    [y, S, w] = parts;
  if (
    s.code !== 0 ||
    parts.length !== 3 ||
    !y ||
    !S ||
    !w ||
    parts.some((Z) => Z.startsWith("-")) ||
    (w !== "HEAD" && !w.startsWith("refs/heads/")) ||
    resolve_37(e, y) === resolve_37(e, S)
  )
    return null;
  let [L, G] = await Promise.all([
      execFileNoThrowWithCwd(gitExe(), [...freeze_23, "config", "--bool", "--get", "core.bare"], {
        cwd: e,
        env: buildGitEnvForRepo(e),
      }),
      execFileNoThrowWithCwd(
        gitExe(),
        [...freeze_23, "rev-parse", "--verify", "-q", "--symbolic-full-name", "main-worktree/HEAD"],
        { cwd: e, env: buildGitEnvForRepo(e) },
      ),
    ]),
    trimmed = G.stdout.trim();
  if (L.code !== 0 || L.stdout.trim() !== "false" || G.code !== 0 || trimmed !== r || trimmed === w)
    return null;
  return trimmed;
}
//@ chunk-e6aww6q8.js:3673758-3674063 layout
async function cleanupStaleAgentWorktreesIfClean(e, n) {
  let r = await getFilterNeutralizingArgs(e);
  if (r === null) return !1;
  let s = await execFileNoThrowWithCwd(gitExe(), [...r, ...freeze_23, ...freeze_2_2], {
    cwd: e,
    env: buildGitEnvForRepo(e, void 0, { userLocale: !0 }),
  });
  if (s.code !== 0 || s.stdout.trim().length > 0) return !1;
  let h = await inspectSubmodules(e);
  if (h.kind !== "verified" || submoduleChanges(h) !== void 0) return !1;
  return passesCommitSafetyChecks(e, n, { primaryCheckoutVouches: !1 });
}
//@ chunk-e6aww6q8.js:3674063-3674934 facade-exports
async function cleanupStaleAgentWorktrees(e, n, r = !1) {
  let s = findCanonicalGitRoot(IMe(getCwd(), getOriginalCwd()));
  if (!s) return 0;
  await releaseStaleClaudeWorktreeLocks(s);
  let h = getClaudeWorktreesDir(s),
    y;
  try {
    y = await readdir_25(h);
  } catch {
    return (await restoreWorktreeConfigExtension(s), 0);
  }
  let time = e.getTime(),
    w = getCurrentWorktreeSession()?.worktreePath,
    L = await getDefaultRemoteRef(s),
    G = 0;
  for (let q of y) {
    if (!isEphemeralWorktreeSlug(q)) continue;
    let Z = join_91(h, q);
    if (w === Z) continue;
    let Se;
    try {
      Se = (await stat_18(Z)).mtimeMs;
    } catch {
      continue;
    }
    if (Se >= time) continue;
    if (!(await cleanupStaleAgentWorktreesIfClean(Z, L))) continue;
    try {
      if (!(await mayReleaseWorktreeLock(await readWorktreeLockReason(Z, s)))) {
        logForDebugging(
          `cleanupStaleAgentWorktrees: kept ${Z} \u2014 locked by a live Claude Code process, or with a reason we did not write`,
        );
        continue;
      }
    } catch (error) {
      logForDebugging(
        `cleanupStaleAgentWorktrees: kept ${Z} \u2014 cannot read the worktree registry to verify lock ownership (${errorMessage(error)})`,
      );
      continue;
    }
    if (
      (
        await removeAgentWorktree(Z, worktreeBranchName(q), s, !1, "stale_cleanup", void 0, void 0, {
          keepsWorktreesInside: r,
        })
      ).outcome !== "failed"
    )
      G++;
  }
  if (G > 0) logForDebugging(`cleanupStaleAgentWorktrees: removed ${G} stale worktree(s)`);
  return (await restoreWorktreeConfigExtension(s), G);
}
//@ chunk-e6aww6q8.js:3674934-3675966 facade-exports
async function reapJobWorktreeIfSafe(e) {
  let {
    worktreePath: worktreePath,
    worktreeBranch: worktreeBranch,
    originCwd: originCwd,
    hookBased: hookBased,
    cutoff: cutoff,
  } = e;
  if (hookBased) return !1;
  let S = resolveWorktreeCleanupRoot(worktreePath, originCwd);
  if (!S || !isAgentWorktreeOf(worktreePath, S)) return !1;
  let w;
  try {
    w = (await stat_18(worktreePath)).mtimeMs;
  } catch {
    return !1;
  }
  let L = w >= cutoff.getTime();
  if (L) return !1;
  if ((await readWorktreeBaseline(worktreePath)) === null)
    return (
      logForDebugging(
        `reapJobWorktreeIfSafe: kept ${worktreePath} \u2014 no Claude Code creation marker (${CLAUDE_BASE_ENV}) in its git admin dir, so Claude Code did not create it; not ours to remove`,
        { level: "warn" },
      ),
      !1
    );
  let G = await realpath_28(worktreePath).catch(() => worktreePath),
    q = getCurrentWorktreeSession()?.worktreePath;
  if (q && G === (await realpath_28(q).catch(() => q))) return !1;
  let Z = await listRegisteredWorktrees(S).catch(() => null),
    Se;
  for (let ke of Z ?? [])
    if (G === (await realpath_28(ke.worktreePath).catch(() => ke.worktreePath))) {
      Se = ke;
      break;
    }
  if (!(await mayReleaseWorktreeLock(Se?.lockReason)))
    return (
      logForDebugging(
        `reapJobWorktreeIfSafe: kept ${worktreePath} \u2014 locked by a live Claude Code process, or with a reason we did not write (${Se?.lockReason})`,
      ),
      !1
    );
  if (L) return !1;
  if (!(await cleanupStaleAgentWorktreesIfClean(worktreePath, await getDefaultRemoteRef(S)))) return !1;
  return (
    (
      await removeAgentWorktree(worktreePath, worktreeBranch, S, !1, "job_retention_sweep", void 0, void 0, {
        keepsWorktreesInside: e.keepsWorktreesInside === !0,
      })
    ).outcome !== "failed"
  );
}
//@ chunk-e6aww6q8.js:3675966-3675977 layout
var MAX_STALE_WORKTREE_SWEEP = 50;
//@ chunk-e6aww6q8.js:3675977-3676087 layout
function isClaudeLockFromRunningPid(e) {
  if (e === void 0 || e.length > 512) return !1;
  let match = e.match(CLAUDE_WORKTREE_LOCK_REASON_PATTERN);
  if (!match) return !1;
  return isProcessProvablyGone(Number(match[1]));
}
/**
 * releaseStaleClaudeWorktreeLocks：读 worktree 注册表，解除持有进程已不存在的 Claude 锁（不碰当前会话的 worktree）。
 */
//@ chunk-e6aww6q8.js:3676087-3677257 layout
async function releaseStaleClaudeWorktreeLocks(e) {
  let n = await listRegisteredWorktrees(e).catch(
      (y) => (
        logForDebugging(
          `releaseStaleClaudeWorktreeLocks: skipped \u2014 cannot read the worktree registry for ${e} (${errorMessage(y)})`,
        ),
        []
      ),
    ),
    r = getCurrentWorktreeSession()?.worktreePath,
    s = r === void 0 ? void 0 : Cp(resolve_37(await realpath_28(r).catch(() => r))),
    h = 0;
  for (let y of n) {
    if (s !== void 0 && Cp(resolve_37(y.worktreePath)) === s) continue;
    if (isNetworkOrUnsafePath(y.worktreePath)) continue;
    if (!isClaudeLockFromRunningPid(y.lockReason)) continue;
    if (
      !(await lstat_31(join_91(y.worktreePath, ".git")).then(
        () => !0,
        () => !1,
      ))
    )
      continue;
    if (h >= MAX_STALE_WORKTREE_SWEEP) {
      logForDebugging(
        `releaseStaleClaudeWorktreeLocks: per-sweep cap of ${MAX_STALE_WORKTREE_SWEEP} reached for ${e}; remaining stale locks will be reconciled on later sweeps`,
      );
      break;
    }
    let w;
    try {
      w = await realpath_28(y.worktreePath);
    } catch {
      continue;
    }
    if (isNetworkOrUnsafePath(w)) continue;
    if (s !== void 0 && Cp(resolve_37(w)) === s) continue;
    let found = (
      await listRegisteredWorktrees(e).catch(
        (q) => (
          logForDebugging(
            `releaseStaleClaudeWorktreeLocks: kept ${y.worktreePath} \u2014 cannot re-read the worktree registry at release time (${errorMessage(q)})`,
          ),
          []
        ),
      )
    ).find((q) => q.worktreePath === y.worktreePath);
    if (!isClaudeLockFromRunningPid(found?.lockReason) || !(await mayReleaseWorktreeLock(found?.lockReason)))
      continue;
    (await unlockAgentWorktree(y.worktreePath, e), h++);
  }
  if (h > 0)
    (logForDebugging(
      `releaseStaleClaudeWorktreeLocks: attempted release of ${h} stale liveness lock(s) in ${e}`,
    ),
      logEvent("tengu_worktree_stale_lock_released", { attempted: h }));
  return h;
}
//@ chunk-e6aww6q8.js:3677257-3677338 facade-exports
async function hasWorktreeChanges(e, n) {
  let { dirty: dirty, commitsAhead: commitsAhead } = await getAgentWorktreeChanges(e, n);
  return dirty || commitsAhead > 0;
}
/**
 * 切换到 worktree 重新启动时，把 --settings/--mcp-config/--add-dir/--plugin-dir 等参数中的相对路径改写为基于原 cwd 的绝对路径。
 */
//@ chunk-e6aww6q8.js:3677338-3678494 layout
function rewriteCliPathArgsForWorktree(e, n = (r) => resolve_37(r)) {
  let r = new Map([
      ["--settings", { json: !0 }],
      ["--mcp-config", { json: !0 }],
      ["--agents", { json: !0 }],
      ["--add-dir", { tilde: !0 }],
      ["--plugin-dir", {}],
      ["--plugin-dir-no-mcp", {}],
      ["--system-prompt-file", {}],
      ["--append-system-prompt-file", {}],
      ["--append-subagent-system-prompt-file", {}],
      ["--debug-file", {}],
    ]),
    s = new Set(["--setting-sources", "--managed-settings"]),
    h = [];
  for (let y = 0; y < e.length; y++) {
    let S = e[y];
    if (S === void 0) continue;
    if (S === "--") {
      h.push(...e.slice(y));
      break;
    }
    if (S === "--tmux" || S === "--tmux=classic") continue;
    if (S === "-w" || S === "--worktree") {
      let ke = e[y + 1];
      if (ke !== void 0 && !ke.startsWith("-")) y++;
      continue;
    }
    if (S.startsWith("--worktree=")) continue;
    let index = S.indexOf("="),
      L = index === -1 ? S : S.slice(0, index),
      G = r.get(L),
      q = VARIADIC_VALUE_FLAGS.has(L);
    if (G === void 0 && !q && !s.has(L)) {
      let min = Math.min(lastValueSlot(e, y), e.length - 1);
      (h.push(...e.slice(y, min + 1)), (y = min));
      continue;
    }
    let Z = (ke) =>
      `${L}=${G !== void 0 && ke !== "" && !(G.json && ke.trimStart().startsWith("{")) && !(G.tilde && ors(ke)) ? n(ke) : ke}`;
    if (index !== -1) {
      h.push(Z(S.slice(index + 1)));
      continue;
    }
    let Se = e[y + 1];
    if (Se === void 0 || looksLikeOption(Se)) {
      h.push(S);
      continue;
    }
    (h.push(Z(Se)), y++);
    while (q) {
      let ke = e[y + 1];
      if (ke === void 0 || looksLikeOption(ke)) break;
      (h.push(Z(ke)), y++);
    }
  }
  return h;
}
/**
 * --tmux 模式：创建/附着 tmux 会话并在 worktree 中重新执行 claude。
 */
//@ chunk-e6aww6q8.js:3678494-3683997 facade-exports = execIntoTmuxWorktree (0.795)
async function execIntoTmuxWorktree(e, n, r) {
  if (!checkHasTrustDialogAccepted())
    return {
      handled: !1,
      error:
        "Workspace trust not yet accepted. Run `claude` once in this directory and accept the trust dialog, then retry with --worktree.",
    };
  HPn();
  let env_2 = getIsolatedGitExecOptions().env,
    h = (Zt, rn = {}) => execFileNoThrowWithCwd("tmux", Zt, { ...rn, env: env_2, extendEnv: !1 }),
    y = await h(["-V"]);
  if (y.code !== 0)
    return { handled: !1, error: "Error: tmux is not installed. Install tmux with: sudo apt install tmux" };
  let S,
    w = !1;
  for (let Zt = 0; Zt < e.length; Zt++) {
    let rn = e[Zt];
    if (!rn) continue;
    if (rn === "--") break;
    if (rn === "-w" || rn === "--worktree") {
      let pn = e[Zt + 1];
      if (pn && !pn.startsWith("-")) S = pn;
    } else if (rn.startsWith("--worktree=")) S = rn.slice(11);
    else if (rn === "--tmux=classic") w = !0;
    Zt = lastValueSlot(e, Zt);
  }
  let prNumber = null;
  if (S) {
    if (((prNumber = parsePRReference(S)), prNumber !== null)) S = `pr-${prNumber.number}`;
  }
  if (!S) {
    let adjectives = ["swift", "bright", "calm", "keen", "bold"],
      nouns = ["fox", "owl", "elm", "oak", "ray"],
      pn = adjectives[Math.floor(Math.random() * adjectives.length)],
      no = nouns[Math.floor(Math.random() * nouns.length)],
      suffix = Math.random().toString(36).slice(2, 6);
    S = `${pn}-${no}-${suffix}`;
  }
  try {
    validateWorktreeSlug(S);
  } catch (error) {
    return { handled: !1, error: `Error: ${errorMessage(error)}` };
  }
  let G, q, Z;
  try {
    Z = dispatchesWorktreeCreate()
      ? await executeWorktreeCreateHook(
          { id: getSessionId(), project: { originalCwd: getOriginalCwd(), projectRoot: getProjectRoot() } },
          S,
          { storageV5: n, credentials: r },
        )
      : void 0;
  } catch (error) {
    return { handled: !1, error: `Error: ${errorMessage(error)}` };
  }
  if (Z) {
    try {
      if (cl(Z.worktreePath))
        throw new WorktreeIsolationError(
          `the WorktreeCreate hook emitted a path with dot segments (${Z.worktreePath}) \u2014 the symlink screen cannot ` +
            "verify a dotted spelling; have the hook emit a normalized (dot-free) absolute path",
        );
      let Zt = getCwd();
      for (let rn of new Set([findCanonicalGitRoot(Zt), findGitRoot(Zt)].filter((pn) => Boolean(pn)))) {
        let pn = await findSymlinkInWorktreeAncestry(Z.worktreePath, rn);
        if (pn)
          throw new WorktreeIsolationError(
            `the WorktreeCreate hook's worktree path component ${pn.component} ` +
              (pn.kind === "symlink" ? "is a symlink" : "could not be verified") +
              " \u2014 a repository-committed symlink below the checkout root " +
              "could redirect the worktree outside the repository",
          );
      }
      G = Z.worktreePath;
    } catch (error) {
      return { handled: !1, error: `Error: ${errorMessage(error)}` };
    }
    ((q = basename_51(findCanonicalGitRoot(getCwd()) ?? getCwd())),
      console.log(`Using worktree via hook: ${G}`));
  } else {
    let Zt = getCwd(),
      repoRoot = findCanonicalGitRoot(Zt);
    if (!repoRoot) return { handled: !1, error: "Error: --worktree requires a git repository" };
    q = basename_51(repoRoot);
    try {
      let pn = await getOrCreateWorktree(
        repoRoot,
        i4r(repoRoot),
        S,
        prNumber !== null
          ? { prNumber: prNumber.number, prForge: prNumber.forge, fromCwd: Zt }
          : { fromCwd: Zt },
      );
      if (((G = pn.worktreePath), !pn.existed))
        (console.log(
          `Created worktree: ${G} (based on ${prNumber !== null || pn.baseBranch.endsWith("^{commit}") ? pn.headCommit : pn.baseBranch})`,
        ),
          await performPostCreationSetup(repoRoot, G));
    } catch (error) {
      return { handled: !1, error: `Error: ${errorMessage(error)}` };
    }
  }
  let tmuxSessionName = `${q}_${worktreeBranchName(S)}`.replace(/[/.]/g, "_"),
    ke = isPersonalConfigRestricted()
      ? ["env", "CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG=1", process.execPath]
      : [process.execPath],
    we = [...(isRestrictedMode() ? ["--restricted"] : []), ...[], ...rewriteCliPathArgsForWorktree(e)],
    tmuxPrefix = "C-b",
    Ae = await h(["show-options", "-g", "prefix"]);
  if (Ae.code === 0 && Ae.stdout) {
    let match = Ae.stdout.match(/prefix\s+(\S+)/);
    if (match?.[1]) tmuxPrefix = match[1];
  }
  let prefixConflicts = ["C-b", "C-c", "C-d", "C-t", "C-o", "C-r", "C-s", "C-g", "C-e"].includes(tmuxPrefix),
    We = {
      CLAUDE_CODE_TMUX_SESSION: tmuxSessionName,
      CLAUDE_CODE_TMUX_PREFIX: tmuxPrefix,
      CLAUDE_CODE_TMUX_PREFIX_CONFLICTS: prefixConflicts ? "1" : "",
      ...(isPersonalConfigRestricted() && {
        CLAUDE_CODE_PERSONAL_CONFIG_FIX: getPersonalConfigFixHint() ?? "",
      }),
    },
    match = y.stdout.match(/(\d+)\.(\d+)/),
    lt = match !== null && (Number(match[1]) > 3 || (Number(match[1]) === 3 && Number(match[2]) >= 2)),
    Je = lt
      ? Object.entries(We).flatMap(([Zt, rn]) => [
          "-e",
          `${Zt}=${rn.endsWith(";") ? `${rn.slice(0, -1)}\\;` : rn}`,
        ])
      : [];
  if (!lt) env_2 = { ...env_2, ...We };
  let nt = { stdio: "inherit", env: env_2, extendEnv: !1 },
    Et = (await h(["has-session", "-t", tmuxSessionName])).code === 0,
    isAlreadyInTmux = Boolean(env.TMUX),
    gt = isInITerm2() && !w && !isAlreadyInTmux,
    At = gt ? ["-CC"] : [];
  if (gt && !Et) {
    let yellow = sequential.yellow;
    console.log(`
${yellow("\u256D\u2500 iTerm2 Tip \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u256E")}
${yellow("\u2502")} To open as a tab instead of a new window:                           ${yellow("\u2502")}
${yellow("\u2502")} iTerm2 > Settings > General > tmux > "Tabs in attaching window"     ${yellow("\u2502")}
${yellow("\u2570\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u256F")}
`);
  }
  let It = null,
    Yt = It === null ? null : join_91(G, It),
    qt =
      Yt !== null &&
      (await stat_18(Yt).then(
        (Zt) => Zt.isDirectory(),
        () => !1,
      ))
        ? Yt
        : null;
  if (qt !== null)
    if (
      (await h(["new-session", "-d", "-s", tmuxSessionName, ...Je, "-c", qt, "--", ...ke, ...we], {
        cwd: G,
        useToolMemoryCgroup: !1,
      }),
      await h(["split-window", "-h", "-t", tmuxSessionName, "-c", qt], { cwd: G }),
      await h(["send-keys", "-t", tmuxSessionName, "bun run watch", "Enter"], { cwd: G }),
      await h(["split-window", "-v", "-t", tmuxSessionName, "-c", qt], { cwd: G }),
      await h(["send-keys", "-t", tmuxSessionName, "bun run start"], { cwd: G }),
      await h(["select-pane", "-t", `${tmuxSessionName}:0.0`], { cwd: G }),
      isAlreadyInTmux)
    )
      await safeExecFile("tmux", ["switch-client", "-t", tmuxSessionName], { ...nt, cwd: G, reject: !1 });
    else
      await safeExecFile("tmux", [...At, "attach-session", "-t", tmuxSessionName], {
        ...nt,
        cwd: G,
        reject: !1,
        useToolMemoryCgroup: !1,
      });
  else if (isAlreadyInTmux)
    if (Et)
      await safeExecFile("tmux", ["switch-client", "-t", tmuxSessionName], { ...nt, cwd: G, reject: !1 });
    else
      (await h(["new-session", "-d", "-s", tmuxSessionName, ...Je, "-c", G, "--", ...ke, ...we], {
        cwd: G,
        useToolMemoryCgroup: !1,
      }),
        await safeExecFile("tmux", ["switch-client", "-t", tmuxSessionName], { ...nt, cwd: G, reject: !1 }));
  else {
    let Zt = [...At, "new-session", "-A", "-s", tmuxSessionName, ...Je, "-c", G, "--", ...ke, ...we];
    await safeExecFile("tmux", Zt, { ...nt, cwd: G, reject: !1, useToolMemoryCgroup: !1 });
  }
  return { handled: !0 };
}
//@ chunk-e6aww6q8.js:3683997-3684863 placement
async function getFilterNeutralizingArgsOrRefusal(e) {
  let n = await buildFilterNeutralizingArgs(e);
  if (n.ok) return { args: n.args };
  switch (n.reason) {
    case "config_unreadable":
      return (
        logFeatureBad("git_worktree_create", "git_worktree_create_config_unreadable"),
        { refusal: "Could not read the repository git config to neutralize filter drivers" }
      );
    case "filter_name_unrepresentable":
      return (
        logFeatureBad("git_worktree_create", "git_worktree_create_filter_name_unrepresentable"),
        {
          refusal:
            'The repository git config defines a filter driver whose name cannot be neutralized (contains "=" or a newline)',
        }
      );
    case "conditional_include":
      return (
        logFeatureBad("git_worktree_create", "git_worktree_create_conditional_include"),
        {
          refusal:
            "The repository git config has a conditional include (includeIf), so the filter drivers a checkout would load cannot be determined",
        }
      );
    case "unsafe_key":
      return (
        logFeatureBad("git_worktree_create", "git_worktree_create_unsafe_key"),
        { refusal: `Git was not run: ${describeGitConfigUnreadable(n)}` }
      );
  }
}
//@ chunk-e6aww6q8.js:3684863-3684926 placement
async function getFilterNeutralizingArgs(e) {
  let n = await buildFilterNeutralizingArgs(e);
  return n.ok ? n.args : null;
}
//@ chunk-e6aww6q8.js:3684926-3685211 placement
async function deregisterWorktreeEntry(e, n, r) {
  let s = await vetRepoForWorktrees(e),
    h = (S) => (getPlatform() === "windows" ? S.toLowerCase() : S);
  if (s === null || (n !== null && h(Tc(normalize_7(dirname_51(n)))) !== h(join_91(s, "worktrees"))))
    return !1;
  return (
    (
      await deregisterWorktree(
        s,
        n === null ? { worktreePath: r, repoSpelled: e } : { entryId: basename_51(n), repoSpelled: e },
        { locked: "keep" },
      )
    ).outcome === "dropped"
  );
}
//@ chunk-e6aww6q8.js:3685211-3685337 placement
async function isGitDirMissing(e) {
  let n = await resolveGitDir_2(e);
  try {
    return (await (n ? stat_18(n) : lstat_31(join_91(e, ".git"))), !1);
  } catch (error) {
    return isENOENT(error) || getErrnoCode(error) === "ENOTDIR";
  }
}
//@ chunk-e6aww6q8.js:3685337-3685449 placement
function worktreeRegistrationKeptMessage(e) {
  return `The worktree registration for ${e} was left in place; pass a different --worktree name.`;
}
//@ chunk-aepeg2w5.js:834957-835049 placement
function isOwnedWorktreeSession(e) {
  return !e.hookBased && (!e.enteredExisting || e.madeElsewhere === "resumedByName");
}
/**
 * 代理隔离证据
 */
//@ chunk-aepeg2w5.js:835049-835243 placement
class AgentIsolationEvidence {
  spawned = new Set();
  cleanlyRemoved = new Set();
  recordSpawned(e) {
    this.spawned.add(e);
  }
  recordCleanlyRemoved(e) {
    this.cleanlyRemoved.add(e);
  }
  clear() {
    (this.spawned.clear(), this.cleanlyRemoved.clear());
  }
}
/**
 * worktree 会话状态
 */
//@ chunk-aepeg2w5.js:835243-835866 placement
class WorktreeSessionState {
  currentSession = null;
  resumeHintWorktreeName = null;
  hasBeenInWorktree = !1;
  bgTakeover = null;
  agentIsolationEvidence = new AgentIsolationEvidence();
  isolationUnavailableCwd = null;
  setCurrentSession(e) {
    if (((this.currentSession = e), (this.hasBeenInWorktree ||= e !== null), e && !e.enteredExisting))
      this.resumeHintWorktreeName = e.worktreeName;
  }
  getResumeHintWorktreeName() {
    if (this.currentSession)
      return this.currentSession.enteredExisting ? null : this.currentSession.worktreeName;
    return this.resumeHintWorktreeName;
  }
  clearResumeHintWorktreeName() {
    this.resumeHintWorktreeName = null;
  }
  setBgTakeover(e) {
    this.bgTakeover = e;
  }
  markIsolationUnavailable(e) {
    this.isolationUnavailableCwd = e;
  }
}
//@ chunk-aepeg2w5.js:835866-835891 placement
var worktreeSessionSlot = new HostScoped(() => new WorktreeSessionState());
//@ chunk-aepeg2w5.js:835891-835919 placement
function getWorktreeSessionState() {
  return onProcessRootHost(worktreeSessionSlot);
}
//@ chunk-aepeg2w5.js:835919-835960 facade-exports
function getCurrentWorktreeSession() {
  return getWorktreeSessionState().currentSession;
}
//@ chunk-aepeg2w5.js:835960-836002 affinity
function G8t(e) {
  getWorktreeSessionState().setCurrentSession(e);
}
//@ chunk-dcmhvw5a.js:13922-14013 sole-consumer
var AGENT_WORKTREE_SLUG_PATTERNS = [
  /^agent-a[0-9a-f]{16}$/,
  /^agent-a[0-9a-f]{7}$/,
  /^wf_[0-9a-f]{8}-[0-9a-f]{3}-\d+$/,
];
//@ chunk-dcmhvw5a.js:14013-14162 sole-consumer
var EPHEMERAL_WORKTREE_SLUG_PATTERNS = [
  ...AGENT_WORKTREE_SLUG_PATTERNS,
  /^wf-\d+$/,
  /^bridge-[A-Za-z0-9_]+(-[A-Za-z0-9_]+)*$/,
  /^job-[a-zA-Z0-9._-]{1,55}-[0-9a-f]{8}$/,
  /^bg-[a-zA-Z0-9._-]{1,55}-[0-9a-f]{8}$/,
];
//@ chunk-dcmhvw5a.js:14162-14209 sole-consumer
function isEphemeralWorktreeSlug(e) {
  return EPHEMERAL_WORKTREE_SLUG_PATTERNS.some((n) => n.test(e));
}
//@ chunk-dcmhvw5a.js:14209-14242 sole-consumer
var WORKTREE_SLUG_SEGMENT_PATTERN = /^[a-zA-Z0-9._-]+$/,
  Xo = 64;
//@ chunk-dcmhvw5a.js:14242-14312 affinity
function suffixWorktreeSlug(e, n) {
  let r = `-${n}`;
  return `${e.slice(0, Xo - r.length)}${r}`;
}
/**
 * 校验 worktree slug：每段只允许字母数字 ._-，总长 ≤64，不能含 . 或 .. 段。
 */
//@ chunk-dcmhvw5a.js:14312-14849 fingerprint = validateWorktreeSlug (0.807)
function validateWorktreeSlug_2(slug) {
  if (slug.length > Xo)
    return `Invalid worktree name: must be ${Xo} characters or fewer (got ${slug.length})`;
  for (let segment of slug.split("/")) {
    if (segment === "." || segment === "..")
      return `Invalid worktree name "${slug}": must not contain "." or ".." path segments`;
    if (segment.toLowerCase().replace(/\.+$/, "") === ".git")
      return `Invalid worktree name "${slug}": "${segment}" is a reserved git directory name`;
    if (!WORKTREE_SLUG_SEGMENT_PATTERN.test(segment))
      return `Invalid worktree name "${slug}": each "/"-separated segment must be non-empty and contain only letters, digits, dots, underscores, and dashes`;
  }
  return;
}

export {
  getCurrentWorktreeSession,
  restoreWorktreeSession,
  createAgentWorktree,
  getAgentWorktreeChanges,
  unlockAgentWorktree,
  removeAgentWorktree,
  runGitInWorktree,
  releaseOwnWorktreeLock,
  refuseUnavailableWorktree,
  throwAgentWorktreeNotGitRefusal,
  hasWorktreeChanges,
  isOwnedWorktreeSession,
  G8t,
  killTmuxSession,
  keepWorktree,
  cleanupWorktree,
  getWorkingCopyWorktreeChanges,
  persistWorktreeSession,
  countCommitsAtStake,
  describeWhereCommitsAre,
  parsePRReference,
  isTmuxAvailable,
  getTmuxInstallInstructions,
  cleanupStaleAgentWorktrees,
  reapJobWorktreeIfSafe,
  getWorktreeSessionState,
  listRepoWorktrees,
  validateWorktreeSlug_2,
  resolveWorktreeCleanupRoot,
  listRegisteredWorktrees,
  repositoryVouchedByWorktree,
  worktreeDeregisteredByRemoval,
  carriesDiscardConsent,
  claudeWorktreeLockPid,
  mayReleaseWorktreeLock,
  passesCommitSafetyChecks,
  getDefaultRemoteRef,
  IDENTITY_CHANGED_SUMMARY,
  isAgentWorktreeOf,
  validateWorktreeSlug,
  isWorktreeMadeElsewhere,
  lockClaudeWorktree,
  worktreeBranchName,
  readWorktreeBaseline,
  readWorktreeLockReason,
  generateTmuxSessionName,
  createWorktreeForSession,
  createTmuxSessionForWorktree,
  resolveManagedWorktreePath,
  WorktreeIsolationError,
  resolveExistingWorktreeTarget,
  enterExistingWorktreeForSession,
  isPathUnderManagedWorktreesDir,
};
