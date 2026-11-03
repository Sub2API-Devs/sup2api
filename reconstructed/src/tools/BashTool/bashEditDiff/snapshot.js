/**
 * tools/BashTool/bashEditDiff/snapshot.ts
 *
 * 2.1.316 新增：bashEditDiff：命令前后工作区快照与 diff
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (62)
 * attribution: placement 62
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
  parse,
  parse as parse_2,
  parse as parse_3,
  parse as parse_4,
  parse as parse_5,
  parse as parse_6,
  parse as parse_7,
  parse as parse_8,
  parse as parse_9,
  parse as parse_10,
  parse as parse_11,
  parse as parse_12,
  parse as parse_13,
  parse as parse_14,
} from "path";
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
import {
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
} from "fs/promises";
import {
  realpathSync,
  realpathSync as realpathSync_2,
  realpathSync as realpathSync_3,
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
import { SPLIT_MAX_LEN, splitCommand, getCommandArgv } from "../../../utils/bash/commands.js";
import { getParserModule } from "../../../utils/bash/bashParser.js";
import { parseForSecurityFromAst } from "../../../utils/bash/ast.js";
import { getGitSubcommand } from "../commandSemantics.js";
import { logForDebugging } from "../../../utils/debug.js";
import { ge } from "../../../utils/identity.js";
import {
  MAX_SNAPSHOT_FAILURES,
  SHARED_READ_SPACING_MS,
  jie,
  GIT_STEP_TIMEOUT_MS,
  zDe,
  isDiffSmallEnough,
  DIFF_TIMEOUT_MS,
  SNAPSHOT_EXCLUDE_CONTENT,
  MAX_INDEX_BYTES,
  GIT_INDEX_TIMEOUT_MS,
  buildSnapshotGitEnv,
  cleanupSandboxAfterGit,
  MAX_ALTERNATE_DEPTH,
  MAX_SNAPSHOT_FILE_BYTES,
  MAX_PATHS_BATCH_CHARS,
  DIFF_RETRY_COUNT,
  DEFAULT_GIT_MAX_BUFFER,
} from "./gitEnv.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../../services/analytics/growthbook.js";
import { findGitRootRecheckingNegative, RAW_BLOB_DIFF_FLAGS, getGitDir, gitExe } from "../../../utils/git.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../../services/analytics/featureTelemetry.js";
import { sleep, withDeadline } from "../../../utils/sleep.js";
import { unquoteGitPathBytes, parseGitDiff, $hn } from "../../../utils/gitDiff.js";
import { isCleanupStarted, registerCleanup } from "../../../utils/cleanupRegistry.js";
import { getCommonDir, rawPointerPathIsUnsafe } from "../../../utils/git/gitFilesystem.js";
import {
  ensurePrivateTempRoot,
  getFileIdentity as getFileIdentity_9,
} from "../../../utils/sandbox/userTempRoot.js";
import { sT } from "../../../utils/pastedContent.js";
import { getSessionId } from "../../../bootstrap/state.js";
import { writeFileAtomically, copyFileNoFollow } from "../../../utils/plugins/safeCopy.js";
import { isOnForeignMount } from "../../../utils/networkPaths.js";
import { getRemoteHostSessionCount } from "../../../commands/insights.js";
import { execFileNoThrowWithCwd } from "../../../utils/execFileNoThrow.js";
import { getPlatform } from "../../../utils/platform.js";
import { countCharInString } from "../../../utils/stringUtils.js";
import { freeze as freeze_23, kMe } from "../../../utils/git/gitSafeEnv.js";
import { GIT_FILES_REF_BACKEND_ENV } from "../../../utils/git/gitLanes.js";
import { RCs } from "../writeObserver.js";

/**
 * 会移动工作树的 git 子命令列表（checkout/switch/stash/pull/merge/rebase/reset 等）及匹配"只运行这类 git 命令"的正则。
 */
//@ chunk-e6aww6q8.js:4773548-4773795 placement
var TREE_MOVING_GIT_SUBCOMMANDS = [
    "checkout",
    "switch",
    "stash",
    "pull",
    "merge",
    "rebase",
    "reset",
    "restore",
    "clean",
    "cherry-pick",
    "revert",
  ],
  TREE_MOVING_GIT_COMMAND_RE = new RegExp(
    String.raw`^[ \t]*(?:sudo[ \t]+)?git[ \t]+(?:${TREE_MOVING_GIT_SUBCOMMANDS.join("|")})(?:[ \t]+[A-Za-z0-9._/@~^][A-Za-z0-9._/@~^-]*){0,16}\s*$`,
  );
//@ chunk-e6aww6q8.js:4773795-4773830 placement
function dYn(e) {
  return TREE_MOVING_GIT_COMMAND_RE.test(e);
}
/**
 * 判断命令中是否有会移动工作树的 git 子命令（如 checkout、switch、reset 等）。
 */
//@ chunk-e6aww6q8.js:4773830-4774111 placement
function commandMovesWorkTree(e) {
  try {
    let n = e.length > SPLIT_MAX_LEN ? null : getParserModule()?.parse(e),
      r = n ? parseForSecurityFromAst(e, n) : void 0;
    return (
      r?.kind === "simple" ? r.commands.map((command) => command.argv) : splitCommand(e).map(getCommandArgv)
    ).some((h) =>
      TREE_MOVING_GIT_SUBCOMMANDS.includes(getGitSubcommand(h[0] === "sudo" ? h.slice(1) : h) ?? ""),
    );
  } catch (error) {
    return (logForDebugging(`bashEditDiff: command parse failed: ${String(error)}`), !1);
  }
}
/**
 * bashEditDiff 的模块级缓存：按仓库的失败计数、共享快照仓库、各 git 目录的状态（预读、超大变更、对象目录、私有目录身份、期望文件）、串行链、共享读、读间隔、转换文件记录。
 */
//@ chunk-e6aww6q8.js:4774111-4774298 placement
var snapshotFailureCounts = new Map(),
  sharedRepoByRoot = new Map(),
  prefetchedTrees = new Map(),
  oversizedByGitDir = new Map(),
  objectsDirByGitDir = new Map(),
  privateDirIdentity = new Map(),
  expectedFilesByGitDir = new Map(),
  serialChainByRepo = new Map(),
  sharedReadsInFlight = ge(new Map(), (e) => e.clear()),
  nextReadAtByRepo = ge(new Map(), (e) => e.clear()),
  convertedFilesByGitDir = ge(new Map(), (e) => e.clear());
//@ chunk-e6aww6q8.js:4774298-4774340 placement
function h5(e) {
  return (snapshotFailureCounts.get(e) ?? 0) >= MAX_SNAPSHOT_FAILURES;
}
//@ chunk-e6aww6q8.js:4774340-4774389 placement
function cW() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_lovely_locket", !1);
}
/**
 * 命令执行前给所在 git 仓库拍工作树快照（共享模式下合并并发读取，否则按仓库串行）；仓库已放弃或无仓库返回 null，失败返回 unavailable。
 */
//@ chunk-e6aww6q8.js:4774389-4774582 placement
async function takeBashSnapshot(e) {
  try {
    let n = findGitRootRecheckingNegative(e);
    if (!n || h5(n)) return null;
    return await (cW() ? snapshotRepo(n, !0) : runSerialForRepo(n, () => snapshotRepo(n, !1)));
  } catch (error) {
    return (logForDebugging(`bashEditDiff: snapshot failed: ${String(error)}`), "unavailable");
  }
}
/**
 * 记录编辑差异等待时长遥测（超过 10 秒/60 秒/300 秒分档，区分共享等待）。
 */
//@ chunk-e6aww6q8.js:4774582-4774810 placement
function logEditDiffWait(e, n) {
  let r = e >= 300000 ? "wait_over_300s" : e >= 60000 ? "wait_over_60s" : e >= 1e4 ? "wait_over_10s" : null;
  if (r) logFeatureSad(n ? "bash_edit_diff_shared_wait" : "bash_edit_diff_wait", r);
  else logFeatureOk(n ? "bash_edit_diff_shared_wait" : "bash_edit_diff_wait");
}
//@ chunk-e6aww6q8.js:4774810-4775041 placement
async function snapshotRepo(e, n) {
  let r = await getSharedSnapshotRepo(e);
  if (!r) return "unavailable";
  let s = await (n ? readSharedTree(e, r) : readTreeState(e, r, !1));
  return s
    ? {
        repoRoot: e,
        gitDirectory: s.gitDirectory,
        tree: s.tree,
        convertedFound: s.convertedFound,
        sharesTreeReads: n,
      }
    : "unavailable";
}
/**
 * 命令结束后再拍快照并与命令前对比，生成文件 diff；共享读模式下按前后状态缓存 diff 并在多个调用者间错开间隔；出错时返回 unavailable。
 */
//@ chunk-e6aww6q8.js:4775041-4775799 placement
async function diffAfterCommand(before, onRead, options) {
  try {
    if (!before.sharesTreeReads)
      return await runSerialForRepo(before.repoRoot, async () => {
        let y = await readTreeState(before.repoRoot, before.gitDirectory, !0);
        if (!y) return { files: [], moreFiles: 0, unavailable: !0 };
        return y.tree === before.tree
          ? oversizedOnlyResult(before.repoRoot, y)
          : diffSnapshotTrees(before, y);
      });
    let after = await readSharedTree(before.repoRoot, before.gitDirectory);
    if (after?.gitDirectory !== before.gitDirectory)
      return (
        options?.onReadFailed?.(),
        await spaceSharedReads(before.repoRoot, options),
        { files: [], moreFiles: 0, unavailable: !0 }
      );
    onRead?.();
    let result;
    if (after.tree === before.tree) result = oversizedOnlyResult(before.repoRoot, after);
    else {
      let y = `${before.tree} ${before.convertedFound}`,
        S = after.diffByBeforeState.get(y);
      if (!S)
        ((S = runSerialForRepo(mYn(before.repoRoot), () => diffSnapshotTrees(before, after))),
          after.diffByBeforeState.set(y, S));
      result = await S;
    }
    if (after.callers > 1) await spaceSharedReads(before.repoRoot, options);
    return result;
  } catch (error) {
    return (
      logForDebugging(`bashEditDiff: diff failed: ${String(error)}`),
      { files: [], moreFiles: 0, unavailable: !0 }
    );
  }
}
//@ chunk-e6aww6q8.js:4775799-4775934 placement
async function spaceSharedReads(e, n) {
  if (!n) return;
  let startTime = performance.now(),
    max = Math.max(startTime, nextReadAtByRepo.get(e) ?? 0);
  if ((nextReadAtByRepo.set(e, max + SHARED_READ_SPACING_MS), max > startTime))
    await sleep(max - startTime, n.signal);
}
//@ chunk-e6aww6q8.js:4775934-4776087 placement
function oversizedOnlyResult(e, n) {
  return n.oversized > 0
    ? {
        files: [],
        moreFiles: n.oversized,
        changedFiles: n.oversizedPaths.slice(0, jie).map((r) => join_127(e, r)),
        unavailable: !0,
      }
    : null;
}
//@ chunk-e6aww6q8.js:4776087-4776302 placement
async function isPrivateDirIntact({ gitDirectory: gitDirectory, sharesTreeReads: sharesTreeReads }, r) {
  if (!sharesTreeReads) return !0;
  let s = objectsDirByGitDir.get(gitDirectory);
  if (s && (await verifyPrivateGitDir(gitDirectory, s, r.expectedFiles))) return !0;
  return (logForDebugging("bashEditDiff: private directory changed or gone; git step skipped"), !1);
}
//@ chunk-e6aww6q8.js:4776302-4776549 placement
function runDiffTree(e, n, r, s = []) {
  return runSnapshotGit(
    e.repoRoot,
    e.gitDirectory,
    [
      "diff-tree",
      "-r",
      ...r,
      "--no-color",
      "--no-renames",
      ...RAW_BLOB_DIFF_FLAGS,
      e.tree,
      n,
      ...(s.length > 0 ? ["--", ...s] : []),
    ],
    {
      timeout: GIT_STEP_TIMEOUT_MS,
      ...(e.sharesTreeReads && { env: { GIT_INDEX_FILE: join_127(e.gitDirectory, "no-index") } }),
    },
  );
}
/**
 * 解析 git diff-tree --raw 输出，得到 路径 → 状态（A/D/M…）表，以及新建或删除的空文件集合。
 */
//@ chunk-e6aww6q8.js:4776549-4776858 placement
function parseRawDiffStatus(e) {
  let n = new Map(),
    r = new Set();
  for (let s of e.matchAll(/^:\d{6} \d{6} (\S+) (\S+) ([A-Z])\t(.+)$/gm)) {
    let h = s[4],
      y = h.startsWith('"') && h.endsWith('"') ? unquoteGitPathBytes(h.slice(1, -1)) : h;
    if (!isSafeRepoPath(y)) continue;
    let S = s[3];
    if ((n.set(y, S), (S === "A" && isEmptyBlobId(s[2])) || (S === "D" && isEmptyBlobId(s[1])))) r.add(y);
  }
  return { statusByPath: n, emptyByPath: r };
}
/**
 * 对比快照时去掉只有 CRLF 行尾差异的文件（git diff --ignore-cr-at-eol 无变化者）。
 */
//@ chunk-e6aww6q8.js:4776858-4777177 placement
async function dropCrlfOnlyChanges(e, n, r, s, h) {
  for (let y of batchPathsForArgv([...s.keys()].filter((S) => r.get(S)))) {
    if (!(await isPrivateDirIntact(e, n))) return;
    let S = await runDiffTree(e, n.tree, ["-z", "--numstat", "--ignore-cr-at-eol"], y);
    if (S.code !== 0) return;
    let w = new Set(S.stdout.split("\x00").map((L) => L.split("\t")[2]));
    for (let L of y) if (!w.has(L)) (h?.delete(L), s.delete(L));
  }
}
/**
 * 对比命令前后的快照树，列出改动文件；超时或超出输出上限时只列路径。
 */
//@ chunk-e6aww6q8.js:4777177-4779054 placement
async function diffSnapshotTrees(e, n) {
  let { repoRoot: repoRoot, gitDirectory: gitDirectory } = e,
    h = { files: [], moreFiles: 0, unavailable: !0 };
  if (!(await isPrivateDirIntact(e, n))) return h;
  let { tree: tree, oversized: oversized, oversizedPaths: oversizedPaths } = n,
    L = new Map();
  for (let { path: path, sameSize: sameSize, changedAgain: changedAgain } of convertedFilesByGitDir
    .get(gitDirectory)
    ?.slice(e.sharesTreeReads ? e.convertedFound : n.convertedBefore, n.convertedFound) ?? [])
    if (!changedAgain || L.has(path)) L.set(path, sameSize);
  let G = await runDiffTree(e, tree, ["--raw", "-p"]),
    { stdout: stdout, code: code } = G;
  if (code !== 0) {
    if (!e.sharesTreeReads) return h;
    let Ie = G.timedOut ? "timed out" : G.maxBufferExceeded ? "passed the output cap" : `exit ${code}`;
    if (
      (logForDebugging(`bashEditDiff: diff-tree ${Ie}; listing paths only`),
      !(await isPrivateDirIntact(e, n)))
    )
      return h;
    let Me = await runDiffTree(e, tree, ["--raw"]);
    if (Me.code !== 0)
      return (
        logForDebugging(`bashEditDiff: path listing failed too, exit ${Me.code}`),
        oversizedOnlyResult(repoRoot, n) ?? h
      );
    let { statusByPath: statusByPath } = parseRawDiffStatus(Me.stdout);
    if ((await dropCrlfOnlyChanges(e, n, L, statusByPath), statusByPath.size === 0))
      return oversizedOnlyResult(repoRoot, n);
    return {
      files: [],
      moreFiles: statusByPath.size + oversized,
      changedFiles: [...statusByPath.keys(), ...oversizedPaths]
        .slice(0, jie)
        .map((ze) => join_127(repoRoot, ze)),
      unavailable: !0,
    };
  }
  let { statusByPath: statusByPath, emptyByPath: emptyByPath } = parseRawDiffStatus(stdout),
    { hunks: hunks } = parseGitDiff(stdout);
  await dropCrlfOnlyChanges(e, n, L, statusByPath, hunks);
  for (let Ie of batchPathsForArgv([...statusByPath.keys()].filter((Me) => L.has(Me)))) {
    if (!(await isPrivateDirIntact(e, n))) break;
    let Me = await runDiffTree(e, tree, ["-p", "--ignore-cr-at-eol"], Ie);
    if (Me.code === 0) for (let [We, ze] of parseGitDiff(Me.stdout).hunks) hunks.set(We, ze);
  }
  let size = statusByPath.size;
  if (size === 0 && hunks.size === 0) return oversizedOnlyResult(repoRoot, n);
  let Ae = [];
  for (let Ie of emptyByPath) {
    if (Ae.length >= zDe) break;
    Ae.push({
      filePath: join_127(repoRoot, Ie),
      hunks: [],
      ...(statusByPath.get(Ie) === "A" ? { created: !0 } : { deleted: !0 }),
    });
  }
  for (let [Ie, Me] of hunks) {
    if (Ae.length >= zDe) break;
    if (!isDiffSmallEnough(Me) || Me.reduce((ze, lt) => ze + lt.lines.length, 0) >= $hn) continue;
    let We = statusByPath.get(Ie);
    if (We === void 0) continue;
    Ae.push({
      filePath: join_127(repoRoot, Ie),
      hunks: Me.map((ze) => ({ ...ze, lines: ze.lines.filter((line) => line !== "") })),
      ...(We === "A" && { created: !0 }),
      ...(We === "D" && { deleted: !0 }),
    });
  }
  return {
    files: Ae,
    moreFiles: Math.max(size, hunks.size) - Ae.length + oversized,
    changedFiles: [...statusByPath.keys(), ...oversizedPaths]
      .slice(0, jie)
      .map((Ie) => join_127(repoRoot, Ie)),
    ...(oversized > 0 && { unavailable: !0 }),
  };
}
//@ chunk-e6aww6q8.js:4779054-4779086 placement
var VDe = new Map(),
  weakSet_9 = new WeakSet();
/**
 * 登记某仓库上正在运行的命令；同一仓库有多个时把它们都标记为并发。
 */
//@ chunk-e6aww6q8.js:4779086-4779209 placement
function registerConcurrentCommand(e) {
  let n = {},
    r = VDe.get(e);
  if (!r) ((r = new Set()), VDe.set(e, r));
  if ((r.add(n), r.size > 1)) for (let s of r) weakSet_9.add(s);
  return n;
}
//@ chunk-e6aww6q8.js:4779209-4779304 placement
function fmt(e, n) {
  let r = VDe.get(e);
  if ((r?.delete(n), r?.size === 0)) VDe.delete(e);
  return weakSet_9.has(n);
}
//@ chunk-e6aww6q8.js:4779304-4779341 placement
function mYn(e) {
  return `${e}\x00diff`;
}
//@ chunk-e6aww6q8.js:4779341-4779449 placement
function runSerialForRepo(e, n) {
  let s = (serialChainByRepo.get(e) ?? Promise.resolve()).then(n, n);
  return (
    serialChainByRepo.set(
      e,
      s.catch(() => {
        return;
      }),
    ),
    s
  );
}
/**
 * 共享读取工作树快照：同一 git 目录并发的读取合并为一次，记录调用者数量。
 */
//@ chunk-e6aww6q8.js:4779449-4779706 placement
function readSharedTree(e, n) {
  let r = sharedReadsInFlight.get(n);
  if (r) return (r.callers++, r.read);
  let s = {
    callers: 1,
    read: runSerialForRepo(e, async () => {
      let { callers: callers } = s;
      sharedReadsInFlight.delete(n);
      let y = expectedFilesByGitDir.has(n) || h5(e) ? n : await getSharedSnapshotRepo(e),
        S = y ? await readTreeState(e, y, !0) : null;
      return S && { ...S, callers: callers };
    }),
  };
  return (sharedReadsInFlight.set(n, s), s.read);
}
/**
 * 为 git 目录生成工作树快照状态：快照树、超大文件统计、期望文件与转换计数。
 */
//@ chunk-e6aww6q8.js:4779706-4780015 placement
async function readTreeState(e, n, r) {
  let s = convertedFilesByGitDir.get(n)?.length ?? 0,
    h = await snapshotWorkingTree(e, n, r);
  if (!h) return null;
  let y = oversizedByGitDir.get(n);
  return {
    callers: 1,
    convertedBefore: s,
    gitDirectory: n,
    tree: h,
    oversized: y?.changed ?? 0,
    oversizedPaths: y?.changedPaths ?? [],
    diffByBeforeState: new Map(),
    expectedFiles: expectedFilesByGitDir.get(n),
    convertedFound: convertedFilesByGitDir.get(n)?.length ?? 0,
  };
}
/**
 * 用 git check-ignore 判断某目录是否被忽略（路径须在仓库内、仓库已被观察且有效）；无法判断返回 null。
 */
//@ chunk-e6aww6q8.js:4780015-4780414 placement
async function isDirectoryIgnored(e, n) {
  let joined = relative_47(e, n).split(sep_70).join("/");
  if (joined === "" || joined.startsWith("..") || joined.startsWith(":") || /[\0\r\n]/.test(joined) || h5(e))
    return null;
  let s = await getSharedSnapshotRepo(e);
  if (!s) return null;
  if (!expectedFilesByGitDir.has(s)) return null;
  let h = objectsDirByGitDir.get(s);
  if (!h || !(await verifyPrivateGitDir(s, h))) return null;
  let { code: code } = await runSnapshotGit(e, s, ["check-ignore", "-q", "--no-index", "--", `${joined}/`], {
    timeout: GIT_STEP_TIMEOUT_MS,
    literalPathspecs: !1,
  });
  return code === 0 ? !0 : code === 1 ? !1 : null;
}
//@ chunk-e6aww6q8.js:4780414-4780943 placement
async function listIgnoredFiles(e) {
  let n = new Set();
  if (h5(e)) return n;
  let r = await getSharedSnapshotRepo(e);
  if (!r) return n;
  if (cW() && !prefetchedTrees.has(r)) await readSharedTree(e, r).catch(() => null);
  return runSerialForRepo(e, async () => {
    let s = objectsDirByGitDir.get(r);
    if (!s || !(await verifyPrivateGitDir(r, s))) return (abandonSharedRepo(e, r, "ignored"), n);
    let h = await g5(
      e,
      r,
      [
        "status",
        "--porcelain=v2",
        "-z",
        "--untracked-files=normal",
        "--ignored=matching",
        "--no-renames",
        "--ignore-submodules=all",
      ],
      DIFF_TIMEOUT_MS,
    );
    if (h.code !== 0) return n;
    for (let y of h.stdout.split("\x00"))
      if (y.startsWith("! ") && y.endsWith("/") && isSafeRepoPath(y.slice(2, -1)))
        n.add(join_127(e, y.slice(2, -1)));
    return n;
  });
}
//@ chunk-e6aww6q8.js:4780943-4781127 placement
function getSharedSnapshotRepo(e) {
  if (isCleanupStarted()) return Promise.resolve(null);
  let n = sharedRepoByRoot.get(e);
  if (!n)
    ((n = createSharedSnapshotRepo(e).then(
      (r) => {
        if (!r) (sharedRepoByRoot.delete(e), recordSnapshotFailure(e));
        return r;
      },
      () => (sharedRepoByRoot.delete(e), recordSnapshotFailure(e), null),
    )),
      sharedRepoByRoot.set(e, n));
  return n;
}
//@ chunk-e6aww6q8.js:4781127-4781314 placement
function recordSnapshotFailure(e) {
  let n = (snapshotFailureCounts.get(e) ?? 0) + 1;
  if ((snapshotFailureCounts.set(e, n), n === MAX_SNAPSHOT_FAILURES))
    (logForDebugging(`bashEditDiff: giving up on ${e} for this session`),
      logFeatureBad(cW() ? "bash_edit_diff_shared" : "bash_edit_diff", "snapshot_given_up"));
}
/**
 * 为多个命令共享的快照创建私有 git 仓库（支持 sha256 对象格式）。
 */
//@ chunk-e6aww6q8.js:4781314-4782991 placement
async function createSharedSnapshotRepo(e) {
  let n = await getGitDir(e);
  if (!n) return null;
  let r = resolveThroughRoot(e, join_127((await getCommonDir(n)) ?? n, "objects"));
  if (!(await isSafeGitObjectsDir(r, e))) return null;
  let s = await ensurePrivateTempRoot();
  if (s === null) return null;
  let h = join_127(s.root, `${sT(getSessionId())}-${sT(e)}-${randomBytes_13(8).toString("hex")}`);
  (await mkdir_25(h, { mode: 448 }),
    logForDebugging(`bashEditDiff: commands share snapshots: ${cW()}`),
    objectsDirByGitDir.set(h, r),
    privateDirIdentity.set(h, s.identity));
  let y = !1;
  try {
    (registerCleanup(cleanupSnapshotRepos),
      await mkdir_25(join_127(h, "objects", "info"), { recursive: !0, mode: 448 }),
      await mkdir_25(join_127(h, "refs", "heads"), { recursive: !0, mode: 448 }),
      await mkdir_25(join_127(h, "info"), { mode: 448 }));
    let S = await usesSha256Objects(r, n),
      w = {
        HEAD: `ref: refs/heads/main
`,
        config: `[core]
	repositoryformatversion = ${S ? 1 : 0}
	bare = false
	logallrefupdates = false
	untrackedCache = true
${
  S
    ? `[extensions]
	objectformat = sha256
`
    : ""
}`,
        "objects/info/alternates": `${r}
`,
        "info/attributes": `* -filter -working-tree-encoding -text -eol -ident !diff
`,
        "info/exclude":
          (await writeFileAtomically(join_127(dirname_75(r), "info", "exclude"), SNAPSHOT_EXCLUDE_CONTENT)) ??
          "",
      };
    for (let [ke, we] of Object.entries(w)) await writeFile_17(join_127(h, ke), we, { flag: "wx" });
    let L = await readExcludesFile(h),
      G =
        L !== null && isAbsolute_55(L) && !isOnForeignMount(L, h)
          ? `[core]
	excludesFile = ${eCs(L)}
`
          : "";
    (await writeFile_17(join_127(h, "config.global"), G, { flag: "wx" }),
      expectedFilesByGitDir.set(h, { ...w, "config.global": G }));
    let q = join_127(n, "index"),
      Z = await lstat_41(q).catch(() => null);
    if (Z?.isFile() && Z.size <= MAX_INDEX_BYTES) {
      await copyFileNoFollow(q, join_127(h, "index"), { exclusive: !0, nonBlocking: !0 }).catch(() => {
        return;
      });
      let ke = await runSnapshotGit(e, h, ["ls-files", "-z", "--stage"], {
        timeout: GIT_INDEX_TIMEOUT_MS,
        maxBuffer: MAX_INDEX_BYTES * 2,
      });
      if (!(ke.code === 0 && isStageZeroListing(ke.stdout)))
        await unlink_12(join_127(h, "index")).catch(() => {
          return;
        });
    }
    await g5(e, h, ["update-index", "--untracked-cache"], GIT_INDEX_TIMEOUT_MS);
    let Se = await g5(e, h, ["write-tree"], GIT_INDEX_TIMEOUT_MS);
    if (Se.code !== 0 || !(await commitSnapshotTree(e, h, Se.stdout.trim(), GIT_INDEX_TIMEOUT_MS)))
      return null;
    return ((y = !0), h);
  } finally {
    if (!y) (expectedFilesByGitDir.delete(h), await removePrivateGitDir(h));
  }
}
//@ chunk-e6aww6q8.js:4782991-4783054 placement
function eCs(e) {
  return `"${e.replace(/["\\]/g, (n) => `\\${n}`)}"`;
}
/**
 * 读取仓库 core.excludesFile 配置（在受控 git 环境中执行），返回路径或 null。
 */
//@ chunk-e6aww6q8.js:4783054-4783367 placement
async function readExcludesFile(e) {
  let n = await buildSnapshotGitEnv(
    [gitExe(), "config", "--get", "--path", "core.excludesFile"],
    getRemoteHostSessionCount({ GIT_DIR: e }),
    e,
  );
  if (n === null) return null;
  try {
    let { stdout: stdout, code: code } = await execFileNoThrowWithCwd(n.file, n.args, {
        cwd: e,
        timeout: GIT_STEP_TIMEOUT_MS,
        preserveOutputOnError: !1,
        env: n.env,
      }),
      trimmed = stdout.trim();
    return code === 0 && trimmed !== "" && !/[\0\r\n]/.test(trimmed) ? trimmed : null;
  } finally {
    cleanupSandboxAfterGit(n);
  }
}
//@ chunk-e6aww6q8.js:4783367-4783514 placement
async function usesSha256Objects(e, n) {
  let r = await writeFileAtomically(join_127(e, "..", "config"), 1e6),
    s = await writeFileAtomically(join_127(n, "config"), 1e6);
  return /objectformat\s*=\s*sha256/i.test(r ?? s ?? "");
}
/**
 * 把根目录内的路径通过根目录的真实路径解析（根目录不安全或不在其中时原样返回）。
 */
//@ chunk-e6aww6q8.js:4783514-4783689 placement
function resolveThroughRoot(e, n) {
  let r = resolve_59(e),
    s = resolve_59(n);
  if (s !== r && !s.startsWith(r + sep_70)) return s;
  if (rawPointerPathIsUnsafe(r, r)) return s;
  let h;
  try {
    h = realpathSync_3(r);
  } catch {
    return s;
  }
  return isOnForeignMount(h, r) ? s : join_127(h, s.slice(r.length));
}
//@ chunk-e6aww6q8.js:4783689-4784244 placement = writeRemoteEntriesToLocal (0.346)
async function isSafeGitObjectsDir(e, n, r = 0, s = new Set()) {
  if (r > MAX_ALTERNATE_DEPTH || s.has(e)) return !1;
  if (
    (s.add(e),
    !(await isRealDirectoryChain_2(e)) ||
      !(await isDirFreeOfSymlinks(e)) ||
      !(await isDirFreeOfSymlinks(join_127(e, "pack"))))
  )
    return !1;
  let h = join_127(e, "info", "alternates"),
    y = await writeFileAtomically(h, SNAPSHOT_EXCLUDE_CONTENT);
  if (y === null)
    return lstat_41(h).then(
      () => !1,
      (S) =>
        typeof S === "object" && S !== null && "code" in S && (S.code === "ENOENT" || S.code === "ENOTDIR"),
    );
  for (let S of y
    .split(
      `
`,
    )
    .map((w) => w.trim())) {
    if (S === "" || S.startsWith("#")) continue;
    if (isOnForeignMount(S, e)) return !1;
    let w = isAbsolute_55(S) ? parse_14(S).root : null,
      L = await resolveDirNoLinks(w ?? e, w === null ? S : S.slice(w.length));
    if (L === null || !(await isSafeGitObjectsDir(L, n, r + 1, s))) return !1;
  }
  return !0;
}
//@ chunk-e6aww6q8.js:4784244-4784577 placement = isErrnoException (0.582)
async function isDirFreeOfSymlinks(e) {
  let n;
  try {
    n = await readdir_31(e);
  } catch (error) {
    let s = typeof error === "object" && error !== null && "code" in error ? error.code : void 0;
    return s === "ENOENT" || s === "ENOTDIR";
  }
  for (let r of n) {
    let s = await lstat_41(join_127(e, r)).catch((h) =>
      typeof h === "object" && h !== null && "code" in h && h.code === "ENOENT" ? null : void 0,
    );
    if (s === void 0 || s?.isSymbolicLink()) return !1;
  }
  return !0;
}
//@ chunk-e6aww6q8.js:4784577-4784814 placement
async function resolveDirNoLinks(e, n) {
  let r = e;
  for (let s of n.split(/[\\/]/)) {
    if (s === "" || s === ".") continue;
    if (s === "..") {
      r = dirname_75(r);
      continue;
    }
    r = join_127(r, s);
    let h = await lstat_41(r).catch(() => null);
    if (h === null || h.isSymbolicLink() || !h.isDirectory()) return null;
  }
  return r;
}
//@ chunk-e6aww6q8.js:4784814-4784972 placement
function isStageZeroListing(e) {
  let n = 0;
  while (n < e.length) {
    let index = e.indexOf("\x00", n),
      sliced = e.slice(n, index === -1 ? e.length : index);
    if (sliced !== "" && !isStageZeroEntry(sliced)) return !1;
    if (index === -1) break;
    n = index + 1;
  }
  return !0;
}
//@ chunk-e6aww6q8.js:4784972-4785097 placement
function isStageZeroEntry(e) {
  let index = e.indexOf("\t"),
    r = index === -1 ? "" : e.slice(index + 1);
  return (index === -1 ? "" : e.slice(0, index).split(" ").at(-1)) === "0" && isSafeRepoPath(r);
}
//@ chunk-e6aww6q8.js:4785097-4785166 placement
function yYn(e) {
  return getPlatform() === "windows" ? e.split(/[\\/]/) : e.split("/");
}
/**
 * 判断仓库内相对路径安全：非空、非绝对、无控制字符、Windows 下不含冒号，且各段不为空、. 或 ..，也不是保留名。
 */
//@ chunk-e6aww6q8.js:4785166-4785349 placement
function isSafeRepoPath(e) {
  return (
    e !== "" &&
    !e.startsWith("/") &&
    !/[\0-\x1f\x7f-\x9f\u2028\u2029]/.test(e) &&
    (getPlatform() !== "windows" || !e.includes(":")) &&
    !yYn(e).some((n) => n === "" || n === "." || n === ".." || iCs(n))
  );
}
//@ chunk-e6aww6q8.js:4785349-4785447 placement
function iCs(e) {
  let replaced = e.toLowerCase().replace(/[. ]+$/, "");
  return replaced === ".git" || /^git~\d+$/.test(replaced);
}
//@ chunk-e6aww6q8.js:4785447-4785679 placement
async function isRealDirectoryChain_2(e) {
  let n = resolve_59(e),
    root = parse_14(n).root,
    filtered = n
      .slice(root.length)
      .split(sep_70)
      .filter((y) => y !== ""),
    h = root;
  for (let y of filtered) {
    h = join_127(h, y);
    let S = await lstat_41(h).catch(() => null);
    if (S === null || S.isSymbolicLink() || !S.isDirectory()) return !1;
  }
  return !0;
}
//@ chunk-e6aww6q8.js:4785679-4785900 placement
async function verifyPrivateGitDir(e, n, r = expectedFilesByGitDir.get(e)) {
  if (!r) return !1;
  for (let [h, y] of Object.entries(r))
    if ((await writeFileAtomically(join_127(e, h), SNAPSHOT_EXCLUDE_CONTENT)) !== y) return !1;
  let s = await readdir_31(e).catch(() => null);
  if (s === null || s.some((h) => !lCs.has(h))) return !1;
  return isSafeGitObjectsDir(n, e);
}
//@ chunk-e6aww6q8.js:4785900-4785996 placement
var lCs = new Set(["HEAD", "config", "config.global", "index", "index.lock", "info", "objects", "refs"]);
//@ chunk-e6aww6q8.js:4785996-4786092 placement
function XDe(e) {
  let n = objectsDirByGitDir.get(e.gitDirectory);
  return n ? verifyPrivateGitDir(e.gitDirectory, n) : Promise.resolve(!1);
}
/**
 * 为工作区做快照：用 git status 收集改动与未跟踪文件。
 */
//@ chunk-e6aww6q8.js:4786092-4788314 placement
async function snapshotWorkingTree(e, n, r) {
  let s = prefetchedTrees.has(n) ? GIT_STEP_TIMEOUT_MS : GIT_INDEX_TIMEOUT_MS,
    h = objectsDirByGitDir.get(n);
  if (!h || !(await verifyPrivateGitDir(n, h))) return abandonSharedRepo(e, n, "alternates");
  await unlink_12(join_127(n, "index.lock")).catch(() => {
    return;
  });
  let y = await runSnapshotGit(
    e,
    n,
    [
      "status",
      "--porcelain=v2",
      "-z",
      "--untracked-files=normal",
      "--ignored=no",
      "--no-renames",
      "--ignore-submodules=all",
    ],
    { timeout: s, env: { GIT_OPTIONAL_LOCKS: "1" } },
  );
  if (y.code !== 0) return abandonSharedRepo(e, n, `status exit ${y.code}`);
  let {
      changed: changed,
      deleted: deleted,
      untrackedDirectories: untrackedDirectories,
    } = parsePorcelainStatus(y.stdout),
    G = prefetchedTrees.get(n);
  if (changed.length === 0 && deleted.length === 0 && untrackedDirectories.length === 0 && G)
    return (oversizedByGitDir.delete(n), G);
  let q = [...untrackedDirectories],
    Z = new Map();
  for (let nt of deleted) {
    if (!(await parentDirsExist(e, nt, Z))) continue;
    if ((await lstat_41(join_127(e, nt)).catch(() => null))?.isDirectory()) q.push(`${nt}/`);
  }
  for (let nt of batchPathsForArgv(q)) {
    let pt = await g5(e, n, ["ls-files", "-z", "--others", "--exclude-standard", "--", ...nt], s);
    if (pt.code !== 0) return abandonSharedRepo(e, n, `ls-files exit ${pt.code}`);
    changed.push(...pt.stdout.split("\x00").filter((Et) => !Et.endsWith("/") && isSafeRepoPath(Et)));
  }
  if (q.length > 0 && changed.length === 0 && deleted.length === 0 && G)
    return (oversizedByGitDir.delete(n), G);
  let Se = [],
    ke = oversizedByGitDir.get(n)?.files,
    we = new Map(),
    Ee = 0,
    Ae = [],
    Ie = new Map();
  for (let nt of changed) {
    if (!(await parentDirsExist(e, nt, Z))) continue;
    let pt = await statNoFollow(join_127(e, nt));
    if (pt === "unreadable" || (typeof pt === "object" && pt.size > MAX_SNAPSHOT_FILE_BYTES)) {
      let Et = typeof pt === "object" ? `${pt.size} ${pt.mtimeMs}` : "unreadable";
      if ((we.set(nt, Et), ke?.get(nt) !== Et)) (Ee++, Ae.push(nt));
    } else if (pt !== "other") {
      if ((Se.push(nt), typeof pt === "object")) Ie.set(nt, pt.size);
    }
  }
  (oversizedByGitDir.set(n, { files: we, changed: Ee, changedPaths: Ae }),
    changed.splice(0, changed.length, ...Se));
  let Me = r ? await findConvertedFiles(e, n, changed) : new Map(),
    We = convertedFilesByGitDir.get(n) ?? [],
    ze = new Map(We.map((nt) => [nt.path, nt.sameSize]));
  for (let nt of changed) {
    let pt = Me.get(nt);
    if (pt !== void 0) We.push({ path: nt, sameSize: Ie.get(nt) === pt });
    else if (ze.get(nt)) We.push({ path: nt, sameSize: !1, changedAgain: !0 });
  }
  convertedFilesByGitDir.set(n, We);
  for (let [nt, pt] of [
    [deleted, ["--force-remove"]],
    [changed, ["--add", "--remove"]],
  ]) {
    if (nt.length === 0) continue;
    let Et = await runSnapshotGit(e, n, ["update-index", ...pt, "-z", "--stdin"], {
      timeout: s,
      input: `${nt.join("\x00")}\x00`,
    });
    if (Et.code !== 0) return abandonSharedRepo(e, n, `update-index exit ${Et.code}`);
  }
  let lt = await g5(e, n, ["write-tree"], s),
    trimmed = lt.stdout.trim();
  if (lt.code !== 0 || !/^[0-9a-f]{40,64}$/.test(trimmed))
    return abandonSharedRepo(e, n, `write-tree exit ${lt.code}`);
  if (trimmed !== G && !(await commitSnapshotTree(e, n, trimmed)))
    return abandonSharedRepo(e, n, "commit-tree");
  return (prefetchedTrees.set(n, trimmed), snapshotFailureCounts.delete(e), trimmed);
}
/**
 * 找出索引中经换行/过滤转换后大小与对象大小不同的文件：ls-files --debug 取大小，cat-file --batch-check 对比 blob 大小。
 */
//@ chunk-e6aww6q8.js:4788314-4789018 placement
async function findConvertedFiles(e, n, r) {
  let s = new Map(),
    [h = []] = batchPathsForArgv(r);
  if (h.length === 0) return s;
  let y = await g5(e, n, ["ls-files", "-z", "--stage", "--debug", "--", ...h]);
  if (y.code !== 0)
    return (logForDebugging(`bashEditDiff: converted-file check: ls-files exit ${y.code}`), s);
  let S = [...y.stdout.matchAll(/^\d{6} ([0-9a-f]{40,64}) 0\t([^\0]+)\0[^]*?\n {2}size: (\d+)\t/gm)];
  if (S.length === 0) return s;
  let w = await runSnapshotGit(e, n, ["cat-file", "--batch-check"], {
    timeout: GIT_STEP_TIMEOUT_MS,
    input: `${S.map((G) => G[1]).join(`
`)}
`,
  });
  if (w.code !== 0)
    return (logForDebugging(`bashEditDiff: converted-file check: cat-file exit ${w.code}`), s);
  let parts = w.stdout.split(`
`);
  for (let [G, q] of S.entries()) {
    let [, Z, Se] = (parts[G] ?? "").split(" ");
    if (Z === "blob" && q[3] !== "0" && Se !== q[3]) s.set(q[2], Number(q[3]));
  }
  return s;
}
//@ chunk-e6aww6q8.js:4789018-4789190 placement
function* batchPathsForArgv(e) {
  let n = [],
    r = 0;
  for (let s of e) {
    let h = Buffer.byteLength(s) + 3 + countCharInString(s, '"') + countCharInString(s, "\\");
    if (n.length > 0 && r + h > MAX_PATHS_BATCH_CHARS) (yield n, (n = []), (r = 0));
    (n.push(s), (r += h));
  }
  if (n.length > 0) yield n;
}
//@ chunk-e6aww6q8.js:4789190-4789389 placement
function abandonSharedRepo(e, n, r) {
  if ((logForDebugging(`bashEditDiff: ${r}`), !expectedFilesByGitDir.has(n))) return null;
  return (
    sharedRepoByRoot.delete(e),
    prefetchedTrees.delete(n),
    oversizedByGitDir.delete(n),
    expectedFilesByGitDir.delete(n),
    recordSnapshotFailure(e),
    Promise.all([serialChainByRepo.get(e), serialChainByRepo.get(mYn(e))]).then(() => removePrivateGitDir(n)),
    null
  );
}
//@ chunk-e6aww6q8.js:4789389-4789621 placement
async function removePrivateGitDir(e) {
  try {
    let n = privateDirIdentity.get(e);
    if (n === void 0) return;
    if (await getFileIdentity_9(e, n)) await rm_27(e, { recursive: !0, force: !0 });
    (objectsDirByGitDir.delete(e), privateDirIdentity.delete(e), convertedFilesByGitDir.delete(e));
  } catch (error) {
    logForDebugging(`bashEditDiff: private directory not removed: ${String(error)}`);
  }
}
//@ chunk-e6aww6q8.js:4789621-4789633 placement
var uCs = 300;
//@ chunk-e6aww6q8.js:4789633-4789751 placement
async function cleanupSnapshotRepos() {
  (sharedRepoByRoot.clear(),
    prefetchedTrees.clear(),
    oversizedByGitDir.clear(),
    expectedFilesByGitDir.clear(),
    await withDeadline(Promise.all(Array.from(objectsDirByGitDir.keys(), removePrivateGitDir)), uCs));
}
/**
 * 以 O_NOFOLLOW 打开文件获取大小与 mtime；符号链接、缺失、不可读或非普通文件分别返回对应标记。
 */
//@ chunk-e6aww6q8.js:4789751-4790168 placement
async function statNoFollow(e) {
  let n;
  try {
    n = await open_26(
      e,
      constants_26.O_RDONLY |
        (getPlatform() === "windows" ? 0 : constants_26.O_NOFOLLOW | constants_26.O_NONBLOCK),
    );
  } catch (error) {
    let s = typeof error === "object" && error !== null && "code" in error ? error.code : void 0;
    return s === "ELOOP"
      ? "link"
      : s === "ENOENT" || s === "ENOTDIR"
        ? "missing"
        : s === "EACCES" || s === "EPERM"
          ? "unreadable"
          : "other";
  }
  try {
    let stats = await n.stat();
    return stats.isFile() ? { size: stats.size, mtimeMs: stats.mtimeMs } : "other";
  } catch {
    return "other";
  } finally {
    await n.close();
  }
}
//@ chunk-e6aww6q8.js:4790168-4790376 placement
async function parentDirsExist(e, n, r) {
  let s = yYn(n),
    h = e;
  for (let y of s.slice(0, -1)) {
    h = join_127(h, y);
    let S = r.get(h);
    if (S === void 0) {
      let w = await lstat_41(h).catch(() => null);
      ((S = w !== null && w.isDirectory()), r.set(h, S));
    }
    if (!S) return !1;
  }
  return !0;
}
//@ chunk-e6aww6q8.js:4790376-4790537 placement
function isEmptyBlobId(e) {
  return (
    "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391".startsWith(e) ||
    "473a0f4c3be8a93681a267e3b1e9a7dcda1185436fe141f7749120a303721813".startsWith(e)
  );
}
/**
 * 解析 git status --porcelain=v2 -z 输出：变更/未跟踪文件、已删除文件、未跟踪目录（只保留安全路径）。
 */
//@ chunk-e6aww6q8.js:4790537-4790958 placement
function parsePorcelainStatus(e) {
  let n = [],
    r = [],
    s = [];
  for (let h of e.split("\x00"))
    if (h.startsWith("? ")) {
      let endsWith = h.endsWith("/"),
        S = endsWith ? h.slice(2, -1) : h.slice(2);
      if (isSafeRepoPath(S)) (endsWith ? s : n).push(h.slice(2));
    } else if (h.startsWith("1 ") || h.startsWith("u ")) {
      let y = h.startsWith("1 ") ? 9 : 11,
        S = 0;
      for (let L = 0; L < y - 1; L++) S = h.indexOf(" ", S) + 1;
      let sliced = h.slice(S);
      if (h[3] === "." || !isSafeRepoPath(sliced)) continue;
      (h[3] === "D" ? r : n).push(sliced);
    }
  return { changed: n, deleted: r, untrackedDirectories: s };
}
//@ chunk-e6aww6q8.js:4790958-4791546 placement
async function commitSnapshotTree(e, n, r, s = GIT_STEP_TIMEOUT_MS) {
  let h = await runSnapshotGit(e, n, ["commit-tree", r, "-m", "snapshot"], {
      timeout: s,
      env: {
        GIT_AUTHOR_NAME: "bash-edit-diff",
        GIT_AUTHOR_EMAIL: "bash-edit-diff@localhost",
        GIT_AUTHOR_DATE: "1000000000 +0000",
        GIT_COMMITTER_NAME: "bash-edit-diff",
        GIT_COMMITTER_EMAIL: "bash-edit-diff@localhost",
        GIT_COMMITTER_DATE: "1000000000 +0000",
      },
    }),
    trimmed = h.stdout.trim();
  if (h.code !== 0 || !/^[0-9a-f]{40,64}$/.test(trimmed)) return !1;
  try {
    let S = await open_26(
      join_127(n, "refs", "heads", "main"),
      constants_26.O_WRONLY | constants_26.O_CREAT | constants_26.O_TRUNC | constants_26.O_NOFOLLOW,
      384,
    );
    try {
      await S.writeFile(`${trimmed}
`);
    } finally {
      await S.close();
    }
    return !0;
  } catch {
    return !1;
  }
}
//@ chunk-e6aww6q8.js:4791546-4791599 placement
function g5(e, n, r, s = GIT_STEP_TIMEOUT_MS) {
  return runSnapshotGit(e, n, r, { timeout: s });
}
/**
 * 在快照私有 git 目录上运行 git：加安全参数与隔离环境，共享模式下用延迟多次的 setImmediate 实现超时中止，返回执行结果（超时时 timedOut）。
 */
//@ chunk-e6aww6q8.js:4791599-4792262 placement
async function runSnapshotGit(repoRoot, gitDir, args, options) {
  let h = await buildSnapshotGitEnv(
    [
      gitExe(),
      ...getSnapshotGitArgs().filter((Z) => options.literalPathspecs !== !1 || Z !== "--literal-pathspecs"),
      ...args,
    ],
    { ...getSnapshotGitEnv(gitDir, repoRoot), ...options.env },
    gitDir,
  );
  if (h === null) return { stdout: "", code: -1 };
  let y = cW(),
    abortController = new AbortController(),
    w = DIFF_RETRY_COUNT,
    L,
    G = () => {
      if (w-- > 0) L = setImmediate(G);
      else abortController.abort();
    },
    q = y ? setTimeout(G, options.timeout) : void 0;
  try {
    let Z = await execFileNoThrowWithCwd(h.file, h.args, {
        cwd: repoRoot,
        ...(y ? { abortSignal: abortController.signal } : { timeout: options.timeout }),
        preserveOutputOnError: !1,
        maxBuffer: options.maxBuffer ?? DEFAULT_GIT_MAX_BUFFER,
        ...(options.input !== void 0 && { input: options.input }),
        env: h.env,
      }),
      Se = abortController.signal.aborted && Z.exitCode === void 0;
    if (Z.maxBufferExceeded) abortController.abort();
    return Se ? { ...Z, timedOut: !0 } : Z;
  } finally {
    (clearTimeout(q), clearImmediate(L), cleanupSandboxAfterGit(h));
  }
}
/**
 * 快照 git 命令的通用参数：字面路径规格、安全配置、禁用 askPass 与路径转义等。
 */
//@ chunk-e6aww6q8.js:4792262-4792389 placement
function getSnapshotGitArgs() {
  return [
    "--literal-pathspecs",
    ...freeze_23,
    "-c",
    "core.askPass=",
    "-c",
    "core.quotePath=false",
    "-c",
    "core.safecrlf=false",
  ];
}
/**
 * 构建快照用的隔离 git 环境：独立 GIT_DIR/工作树与全局配置，禁用系统配置、懒获取、替换对象、可选锁与终端提示，清除路径规格相关变量。
 */
//@ chunk-e6aww6q8.js:4792389-4792772 placement
function getSnapshotGitEnv(e, n) {
  return {
    ...getRemoteHostSessionCount({
      GIT_DIR: e,
      GIT_WORK_TREE: n,
      GIT_CONFIG_GLOBAL: join_127(e, "config.global"),
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_ATTR_NOSYSTEM: "1",
      GIT_NO_LAZY_FETCH: "1",
      GIT_NO_REPLACE_OBJECTS: "1",
      GIT_OPTIONAL_LOCKS: "0",
      GIT_ALLOW_PROTOCOL: kMe,
      GIT_TERMINAL_PROMPT: "0",
      ...GIT_FILES_REF_BACKEND_ENV,
    }),
    GIT_LITERAL_PATHSPECS: void 0,
    GIT_GLOB_PATHSPECS: void 0,
    GIT_NOGLOB_PATHSPECS: void 0,
    GIT_ICASE_PATHSPECS: void 0,
  };
}
/**
 * 写入观察器常量与模块状态：路径/仓库/忽略检查/外部写入/并发查找/保留文件/监视器数量上限，节流与等待时间，以及监视器表、仓库表、共享 inotify 监视器等。
 */
//@ chunk-e6aww6q8.js:4793271-4793443 placement
var MAX_OBSERVED_PATHS = 5000,
  MAX_OBSERVED_REPOS = 64,
  IGNORE_CHECKS_PER_REPO = 256,
  MAX_OUTSIDE_WRITES = 1000,
  MAX_CONCURRENT_IGNORE_LOOKUPS = 8,
  MAX_HELD_FILES = 20000,
  MAX_WATCHERS = 30000,
  YIELD_EVERY = 200,
  SETTLE_WAIT_MS = 250,
  QUIET_WINDOWS_MS = { grace: 30, quiet: 60 },
  MAX_SETTLE_MS = 300,
  observersByRoot = ge(new Map(), () => {
    RCs();
  }),
  observedRepos = new Map(),
  sharedWatcher = null,
  sharedWatcherReady = null,
  exitHookInstalled = !1;

export {
  dYn,
  h5,
  takeBashSnapshot,
  cW,
  registerConcurrentCommand,
  fmt,
  diffAfterCommand,
  logEditDiffWait,
  observersByRoot,
  IGNORE_CHECKS_PER_REPO,
  listIgnoredFiles,
  observedRepos,
  sharedWatcher,
  sharedWatcherReady,
  MAX_OBSERVED_REPOS,
  MAX_OBSERVED_PATHS,
  SETTLE_WAIT_MS,
  QUIET_WINDOWS_MS,
  MAX_SETTLE_MS,
  exitHookInstalled,
  resolveThroughRoot,
  MAX_WATCHERS,
  YIELD_EVERY,
  MAX_CONCURRENT_IGNORE_LOOKUPS,
  isDirectoryIgnored,
  MAX_HELD_FILES,
  MAX_OUTSIDE_WRITES,
  XDe,
  isSafeRepoPath,
  findConvertedFiles,
  runSnapshotGit,
  getSnapshotGitArgs,
  getSnapshotGitEnv,
  commandMovesWorkTree,
};
