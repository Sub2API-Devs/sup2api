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
import { join, relative, sep, dirname, isAbsolute, resolve as resolve_2, parse } from "path";
import { randomBytes } from "crypto";
import { mkdir, writeFile, lstat, unlink, readdir, rm as rm_2, open } from "fs/promises";
import { realpathSync, constants } from "fs";
import { SPLIT_MAX_LEN, splitCommand, getCommandArgv } from "../../../utils/bash/commands.js";
import { getParserModule } from "../../../utils/bash/bashParser.js";
import { parseForSecurityFromAst } from "../../../utils/bash/ast.js";
import { getGitSubcommand } from "../commandSemantics.js";
import { logForDebugging } from "../../../utils/debug.js";
import { identity as identity_2 } from "../../../utils/identity.js";
import {
  MAX_SNAPSHOT_FAILURES,
  SHARED_READ_SPACING_MS_2,
  SHARED_READ_SPACING_MS,
  GIT_STEP_TIMEOUT_MS,
  MAX_DIFF_FILES,
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
import { unquoteGitPathBytes, parseGitDiff, MAX_HUNK_LINE_COUNT } from "../../../utils/gitDiff.js";
import { isCleanupStarted, registerCleanup } from "../../../utils/cleanupRegistry.js";
import { getCommonDir, rawPointerPathIsUnsafe } from "../../../utils/git/gitFilesystem.js";
import {
  ensurePrivateTempRoot,
  getFileIdentity as getFileIdentity_9,
} from "../../../utils/sandbox/userTempRoot.js";
import { bunHashOf } from "../../../utils/pastedContent.js";
import { getSessionId } from "../../../bootstrap/state.js";
import { writeFileAtomically, copyFileNoFollow } from "../../../utils/plugins/safeCopy.js";
import { isOnForeignMount } from "../../../utils/networkPaths.js";
import { getRemoteHostSessionCount } from "../../../commands/insights.js";
import { execFileNoThrowWithCwd } from "../../../utils/execFileNoThrow.js";
import { getPlatform } from "../../../utils/platform.js";
import { countCharInString } from "../../../utils/stringUtils.js";
import { GIT_SAFE_GLOBAL_ARGS, GIT_ALLOW_PROTOCOL_VALUE } from "../../../utils/git/gitSafeEnv.js";
import { GIT_FILES_REF_BACKEND_ENV } from "../../../utils/git/gitLanes.js";
import { stopAllWriteObservers } from "../writeObserver.js";

//@ chunk-e6aww6q8.js:4773548-4773795 placement
/**
 * 会移动工作树的 git 子命令列表（checkout/switch/stash/pull/merge/rebase/reset 等）及匹配"只运行这类 git 命令"的正则。
 */
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
];
var TREE_MOVING_GIT_COMMAND_RE = new RegExp(
  String.raw`^[ \t]*(?:sudo[ \t]+)?git[ \t]+(?:${TREE_MOVING_GIT_SUBCOMMANDS.join("|")})(?:[ \t]+[A-Za-z0-9._/@~^][A-Za-z0-9._/@~^-]*){0,16}\s*$`,
);
//@ chunk-e6aww6q8.js:4773795-4773830 placement
/**
 * 判断命令是否含会移动工作树的 git 子命令（checkout/switch/reset 等），这种命令之后不能复用旧快照。
 */
function commandMovesWorkTree(command) {
  return TREE_MOVING_GIT_COMMAND_RE.test(command);
}
//@ chunk-e6aww6q8.js:4773830-4774111 placement
/**
 * 判断命令中是否有会移动工作树的 git 子命令（如 checkout、switch、reset 等）。
 */
function commandMovesWorkTree_2(command) {
  try {
    let n = command.length > SPLIT_MAX_LEN ? null : getParserModule()?.parse(command);
    let r = n ? parseForSecurityFromAst(command, n) : undefined;
    return (
      r?.kind === "simple"
        ? r.commands.map((command) => command.argv)
        : splitCommand(command).map(getCommandArgv)
    ).some((h) =>
      TREE_MOVING_GIT_SUBCOMMANDS.includes(getGitSubcommand(h[0] === "sudo" ? h.slice(1) : h) ?? ""),
    );
  } catch (error) {
    logForDebugging(`bashEditDiff: command parse failed: ${String(error)}`);
    return false;
  }
}
//@ chunk-e6aww6q8.js:4774111-4774298 placement
/**
 * bashEditDiff 的模块级缓存：按仓库的失败计数、共享快照仓库、各 git 目录的状态（预读、超大变更、对象目录、私有目录身份、期望文件）、串行链、共享读、读间隔、转换文件记录。
 */
var snapshotFailureCounts = new Map();
var sharedRepoByRoot = new Map();
var prefetchedTrees = new Map();
var oversizedByGitDir = new Map();
var objectsDirByGitDir = new Map();
var privateDirIdentity = new Map();
var expectedFilesByGitDir = new Map();
var serialChainByRepo = new Map();
var sharedReadsInFlight = identity_2(new Map(), (e) => e.clear());
var nextReadAtByRepo = identity_2(new Map(), (e) => e.clear());
var convertedFilesByGitDir = identity_2(new Map(), (e) => e.clear());
//@ chunk-e6aww6q8.js:4774298-4774340 placement
/**
 * 仓库快照失败次数超过上限（MAX_SNAPSHOT_FAILURES）时，该仓库放弃拍快照。
 */
function isRepoSnapshotGivenUp(e) {
  return (snapshotFailureCounts.get(e) ?? 0) >= MAX_SNAPSHOT_FAILURES;
}
//@ chunk-e6aww6q8.js:4774340-4774389 placement
/**
 * 读取 tengu_lovely_locket 开关：拍工作树快照时是否走共享模式（合并并发读取）。
 */
function isSharedSnapshotEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_lovely_locket", false);
}
//@ chunk-e6aww6q8.js:4774389-4774582 placement
/**
 * 命令执行前给所在 git 仓库拍工作树快照（共享模式下合并并发读取，否则按仓库串行）；仓库已放弃或无仓库返回 null，失败返回 unavailable。
 */
async function takeBashSnapshot(e) {
  try {
    let gitRootRecheckingNegative = findGitRootRecheckingNegative(e);
    if (!gitRootRecheckingNegative || isRepoSnapshotGivenUp(gitRootRecheckingNegative)) return null;
    return await (isSharedSnapshotEnabled()
      ? snapshotRepo(gitRootRecheckingNegative, true)
      : runSerialForRepo(gitRootRecheckingNegative, () => snapshotRepo(gitRootRecheckingNegative, false)));
  } catch (error) {
    logForDebugging(`bashEditDiff: snapshot failed: ${String(error)}`);
    return "unavailable";
  }
}
//@ chunk-e6aww6q8.js:4774582-4774810 placement
/**
 * 记录编辑差异等待时长遥测（超过 10 秒/60 秒/300 秒分档，区分共享等待）。
 */
function logEditDiffWait(e, n) {
  let r = e >= 300000 ? "wait_over_300s" : e >= 60000 ? "wait_over_60s" : e >= 1e4 ? "wait_over_10s" : null;
  if (r) logFeatureSad(n ? "bash_edit_diff_shared_wait" : "bash_edit_diff_wait", r);
  else logFeatureOk(n ? "bash_edit_diff_shared_wait" : "bash_edit_diff_wait");
}
//@ chunk-e6aww6q8.js:4774810-4775041 placement
async function snapshotRepo(gitRootRecheckingNegative, n) {
  let sharedSnapshotRepo = await getSharedSnapshotRepo(gitRootRecheckingNegative);
  if (!sharedSnapshotRepo) return "unavailable";
  let s = await (n
    ? readSharedTree(gitRootRecheckingNegative, sharedSnapshotRepo)
    : readTreeState(gitRootRecheckingNegative, sharedSnapshotRepo, false));
  return s
    ? {
        repoRoot: gitRootRecheckingNegative,
        gitDirectory: s.gitDirectory,
        tree: s.tree,
        convertedFound: s.convertedFound,
        sharesTreeReads: n,
      }
    : "unavailable";
}
//@ chunk-e6aww6q8.js:4775041-4775799 placement
/**
 * 命令结束后再拍快照并与命令前对比，生成文件 diff；共享读模式下按前后状态缓存 diff 并在多个调用者间错开间隔；出错时返回 unavailable。
 */
async function diffAfterCommand(before, onRead, options) {
  try {
    if (!before.sharesTreeReads)
      return await runSerialForRepo(before.repoRoot, async () => {
        let treeState = await readTreeState(before.repoRoot, before.gitDirectory, true);
        if (!treeState)
          return {
            files: [],
            moreFiles: 0,
            unavailable: true,
          };
        return treeState.tree === before.tree
          ? oversizedOnlyResult(before.repoRoot, treeState)
          : diffSnapshotTrees(before, treeState);
      });
    let after = await readSharedTree(before.repoRoot, before.gitDirectory);
    if (after?.gitDirectory !== before.gitDirectory) {
      options?.onReadFailed?.();
      await spaceSharedReads(before.repoRoot, options);
      return {
        files: [],
        moreFiles: 0,
        unavailable: true,
      };
    }
    onRead?.();
    let result;
    if (after.tree === before.tree) result = oversizedOnlyResult(before.repoRoot, after);
    else {
      let y = `${before.tree} ${before.convertedFound}`;
      let S = after.diffByBeforeState.get(y);
      if (!S) {
        S = runSerialForRepo(diffSerialKey(before.repoRoot), () => diffSnapshotTrees(before, after));
        after.diffByBeforeState.set(y, S);
      }
      result = await S;
    }
    if (after.callers > 1) await spaceSharedReads(before.repoRoot, options);
    return result;
  } catch (error) {
    logForDebugging(`bashEditDiff: diff failed: ${String(error)}`);
    return {
      files: [],
      moreFiles: 0,
      unavailable: true,
    };
  }
}
//@ chunk-e6aww6q8.js:4775799-4775934 placement
async function spaceSharedReads(repoRoot, options) {
  if (!options) return;
  let startTime = performance.now();
  let max = Math.max(startTime, nextReadAtByRepo.get(repoRoot) ?? 0);
  nextReadAtByRepo.set(repoRoot, max + SHARED_READ_SPACING_MS_2);
  if (max > startTime) await sleep(max - startTime, options.signal);
}
//@ chunk-e6aww6q8.js:4775934-4776087 placement
function oversizedOnlyResult(repoRoot, n) {
  return n.oversized > 0
    ? {
        files: [],
        moreFiles: n.oversized,
        changedFiles: n.oversizedPaths
          .slice(0, SHARED_READ_SPACING_MS)
          .map((oversizedPath) => join(repoRoot, oversizedPath)),
        unavailable: true,
      }
    : null;
}
//@ chunk-e6aww6q8.js:4776087-4776302 placement
async function isPrivateDirIntact({ gitDirectory, sharesTreeReads }, r) {
  if (!sharesTreeReads) return true;
  let s = objectsDirByGitDir.get(gitDirectory);
  if (s && (await verifyPrivateGitDir(gitDirectory, s, r.expectedFiles))) return true;
  logForDebugging("bashEditDiff: private directory changed or gone; git step skipped");
  return false;
}
//@ chunk-e6aww6q8.js:4776302-4776549 placement
function runDiffTree(e, tree, r, s = []) {
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
      tree,
      ...(s.length > 0 ? ["--", ...s] : []),
    ],
    {
      timeout: GIT_STEP_TIMEOUT_MS,
      ...(e.sharesTreeReads && {
        env: {
          GIT_INDEX_FILE: join(e.gitDirectory, "no-index"),
        },
      }),
    },
  );
}
//@ chunk-e6aww6q8.js:4776549-4776858 placement
/**
 * 解析 git diff-tree --raw 输出，得到 路径 → 状态（A/D/M…）表，以及新建或删除的空文件集合。
 */
function parseRawDiffStatus(stdout) {
  let n = new Map();
  let r = new Set();
  for (let s of stdout.matchAll(/^:\d{6} \d{6} (\S+) (\S+) ([A-Z])\t(.+)$/gm)) {
    let h = s[4];
    let y = h.startsWith('"') && h.endsWith('"') ? unquoteGitPathBytes(h.slice(1, -1)) : h;
    if (!isSafeRepoPath(y)) continue;
    let S = s[3];
    n.set(y, S);
    if ((S === "A" && isEmptyBlobId(s[2])) || (S === "D" && isEmptyBlobId(s[1]))) r.add(y);
  }
  return {
    statusByPath: n,
    emptyByPath: r,
  };
}
//@ chunk-e6aww6q8.js:4776858-4777177 placement
/**
 * 对比快照时去掉只有 CRLF 行尾差异的文件（git diff --ignore-cr-at-eol 无变化者）。
 */
async function dropCrlfOnlyChanges(e, n, r, statusByPath, hunks) {
  for (let y of batchPathsForArgv([...statusByPath.keys()].filter((key) => r.get(key)))) {
    if (!(await isPrivateDirIntact(e, n))) return;
    let S = await runDiffTree(e, n.tree, ["-z", "--numstat", "--ignore-cr-at-eol"], y);
    if (S.code !== 0) return;
    let w = new Set(S.stdout.split("\x00").map((L) => L.split("\t")[2]));
    for (let L of y)
      if (!w.has(L)) {
        hunks?.delete(L);
        statusByPath.delete(L);
      }
  }
}
//@ chunk-e6aww6q8.js:4777177-4779054 placement
/**
 * 对比命令前后的快照树，列出改动文件；超时或超出输出上限时只列路径。
 */
async function diffSnapshotTrees(before, n) {
  let { repoRoot, gitDirectory } = before;
  let h = {
    files: [],
    moreFiles: 0,
    unavailable: true,
  };
  if (!(await isPrivateDirIntact(before, n))) return h;
  let { tree, oversized, oversizedPaths } = n;
  let L = new Map();
  for (let { path, sameSize, changedAgain } of convertedFilesByGitDir
    .get(gitDirectory)
    ?.slice(before.sharesTreeReads ? before.convertedFound : n.convertedBefore, n.convertedFound) ?? [])
    if (!changedAgain || L.has(path)) L.set(path, sameSize);
  let G = await runDiffTree(before, tree, ["--raw", "-p"]);
  let { stdout, code } = G;
  if (code !== 0) {
    if (!before.sharesTreeReads) return h;
    let Ie = G.timedOut ? "timed out" : G.maxBufferExceeded ? "passed the output cap" : `exit ${code}`;
    logForDebugging(`bashEditDiff: diff-tree ${Ie}; listing paths only`);
    if (!(await isPrivateDirIntact(before, n))) return h;
    let Me = await runDiffTree(before, tree, ["--raw"]);
    if (Me.code !== 0) {
      logForDebugging(`bashEditDiff: path listing failed too, exit ${Me.code}`);
      return oversizedOnlyResult(repoRoot, n) ?? h;
    }
    let { statusByPath } = parseRawDiffStatus(Me.stdout);
    await dropCrlfOnlyChanges(before, n, L, statusByPath);
    if (statusByPath.size === 0) return oversizedOnlyResult(repoRoot, n);
    return {
      files: [],
      moreFiles: statusByPath.size + oversized,
      changedFiles: [...statusByPath.keys(), ...oversizedPaths]
        .slice(0, SHARED_READ_SPACING_MS)
        .map((ze) => join(repoRoot, ze)),
      unavailable: true,
    };
  }
  let { statusByPath, emptyByPath } = parseRawDiffStatus(stdout);
  let { hunks } = parseGitDiff(stdout);
  await dropCrlfOnlyChanges(before, n, L, statusByPath, hunks);
  for (let Ie of batchPathsForArgv([...statusByPath.keys()].filter((key) => L.has(key)))) {
    if (!(await isPrivateDirIntact(before, n))) break;
    let Me = await runDiffTree(before, tree, ["-p", "--ignore-cr-at-eol"], Ie);
    if (Me.code === 0) for (let [We, ze] of parseGitDiff(Me.stdout).hunks) hunks.set(We, ze);
  }
  let size = statusByPath.size;
  if (size === 0 && hunks.size === 0) return oversizedOnlyResult(repoRoot, n);
  let Ae = [];
  for (let Ie of emptyByPath) {
    if (Ae.length >= MAX_DIFF_FILES) break;
    Ae.push({
      filePath: join(repoRoot, Ie),
      hunks: [],
      ...(statusByPath.get(Ie) === "A"
        ? {
            created: true,
          }
        : {
            deleted: true,
          }),
    });
  }
  for (let [Ie, Me] of hunks) {
    if (Ae.length >= MAX_DIFF_FILES) break;
    if (!isDiffSmallEnough(Me) || Me.reduce((acc, lt) => acc + lt.lines.length, 0) >= MAX_HUNK_LINE_COUNT)
      continue;
    let We = statusByPath.get(Ie);
    if (We === undefined) continue;
    Ae.push({
      filePath: join(repoRoot, Ie),
      hunks: Me.map((ze) => ({
        ...ze,
        lines: ze.lines.filter((line) => line !== ""),
      })),
      ...(We === "A" && {
        created: true,
      }),
      ...(We === "D" && {
        deleted: true,
      }),
    });
  }
  return {
    files: Ae,
    moreFiles: Math.max(size, hunks.size) - Ae.length + oversized,
    changedFiles: [...statusByPath.keys(), ...oversizedPaths]
      .slice(0, SHARED_READ_SPACING_MS)
      .map((Ie) => join(repoRoot, Ie)),
    ...(oversized > 0 && {
      unavailable: true,
    }),
  };
}
//@ chunk-e6aww6q8.js:4779054-4779086 placement
/**
 * 记录各仓库上正在运行的命令，同一仓库有多个命令时把它们都标记为并发。
 */
var commandsByRepo = new Map();
var weakSet_9 = new WeakSet();
//@ chunk-e6aww6q8.js:4779086-4779209 placement
/**
 * 登记某仓库上正在运行的命令；同一仓库有多个时把它们都标记为并发。
 */
function registerConcurrentCommand(e) {
  let n = {};
  let r = commandsByRepo.get(e);
  if (!r) {
    r = new Set();
    commandsByRepo.set(e, r);
  }
  r.add(n);
  if (r.size > 1) for (let s of r) weakSet_9.add(s);
  return n;
}
//@ chunk-e6aww6q8.js:4779209-4779304 placement
/**
 * 从仓库的命令集合里注销某命令，返回它此前是否被标记为并发。
 */
function unregisterConcurrentCommand(e, n) {
  let r = commandsByRepo.get(e);
  r?.delete(n);
  if (r?.size === 0) commandsByRepo.delete(e);
  return weakSet_9.has(n);
}
//@ chunk-e6aww6q8.js:4779304-4779341 placement
/**
 * 生成仓库的差异串行队列键，让差异计算与快照操作在同仓库不同队列上排队。
 */
function diffSerialKey(e) {
  return `${e}\x00diff`;
}
//@ chunk-e6aww6q8.js:4779341-4779449 placement
function runSerialForRepo(e, n) {
  let s = (serialChainByRepo.get(e) ?? Promise.resolve()).then(n, n);
  serialChainByRepo.set(
    e,
    s.catch(() => {
      return;
    }),
  );
  return s;
}
//@ chunk-e6aww6q8.js:4779449-4779706 placement
/**
 * 共享读取工作树快照：同一 git 目录并发的读取合并为一次，记录调用者数量。
 */
function readSharedTree(e, n) {
  let r = sharedReadsInFlight.get(n);
  if (r) {
    r.callers++;
    return r.read;
  }
  let s = {
    callers: 1,
    read: runSerialForRepo(e, async () => {
      let { callers } = s;
      sharedReadsInFlight.delete(n);
      let y = expectedFilesByGitDir.has(n) || isRepoSnapshotGivenUp(e) ? n : await getSharedSnapshotRepo(e);
      let S = y ? await readTreeState(e, y, true) : null;
      return (
        S && {
          ...S,
          callers,
        }
      );
    }),
  };
  sharedReadsInFlight.set(n, s);
  return s.read;
}
//@ chunk-e6aww6q8.js:4779706-4780015 placement
/**
 * 为 git 目录生成工作树快照状态：快照树、超大文件统计、期望文件与转换计数。
 */
async function readTreeState(e, n, r) {
  let convertedBefore = convertedFilesByGitDir.get(n)?.length ?? 0;
  let h = await snapshotWorkingTree(e, n, r);
  if (!h) return null;
  let y = oversizedByGitDir.get(n);
  return {
    callers: 1,
    convertedBefore,
    gitDirectory: n,
    tree: h,
    oversized: y?.changed ?? 0,
    oversizedPaths: y?.changedPaths ?? [],
    diffByBeforeState: new Map(),
    expectedFiles: expectedFilesByGitDir.get(n),
    convertedFound: convertedFilesByGitDir.get(n)?.length ?? 0,
  };
}
//@ chunk-e6aww6q8.js:4780015-4780414 placement
/**
 * 用 git check-ignore 判断某目录是否被忽略（路径须在仓库内、仓库已被观察且有效）；无法判断返回 null。
 */
async function isDirectoryIgnored(root, n) {
  let joined = relative(root, n).split(sep).join("/");
  if (
    joined === "" ||
    joined.startsWith("..") ||
    joined.startsWith(":") ||
    /[\0\r\n]/.test(joined) ||
    isRepoSnapshotGivenUp(root)
  )
    return null;
  let sharedSnapshotRepo = await getSharedSnapshotRepo(root);
  if (!sharedSnapshotRepo) return null;
  if (!expectedFilesByGitDir.has(sharedSnapshotRepo)) return null;
  let h = objectsDirByGitDir.get(sharedSnapshotRepo);
  if (!h || !(await verifyPrivateGitDir(sharedSnapshotRepo, h))) return null;
  let { code } = await runSnapshotGit(
    root,
    sharedSnapshotRepo,
    ["check-ignore", "-q", "--no-index", "--", `${joined}/`],
    {
      timeout: GIT_STEP_TIMEOUT_MS,
      literalPathspecs: false,
    },
  );
  return code === 0 ? true : code === 1 ? false : null;
}
//@ chunk-e6aww6q8.js:4780414-4780943 placement
async function listIgnoredFiles(e) {
  let n = new Set();
  if (isRepoSnapshotGivenUp(e)) return n;
  let sharedSnapshotRepo = await getSharedSnapshotRepo(e);
  if (!sharedSnapshotRepo) return n;
  if (isSharedSnapshotEnabled() && !prefetchedTrees.has(sharedSnapshotRepo))
    await readSharedTree(e, sharedSnapshotRepo).catch(() => null);
  return runSerialForRepo(e, async () => {
    let s = objectsDirByGitDir.get(sharedSnapshotRepo);
    if (!s || !(await verifyPrivateGitDir(sharedSnapshotRepo, s))) {
      abandonSharedRepo(e, sharedSnapshotRepo, "ignored");
      return n;
    }
    let h = await runSnapshotGitStep(
      e,
      sharedSnapshotRepo,
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
        n.add(join(e, y.slice(2, -1)));
    return n;
  });
}
//@ chunk-e6aww6q8.js:4780943-4781127 placement
function getSharedSnapshotRepo(e) {
  if (isCleanupStarted()) return Promise.resolve(null);
  let n = sharedRepoByRoot.get(e);
  if (!n) {
    n = createSharedSnapshotRepo(e).then(
      (sharedSnapshotRepo) => {
        if (!sharedSnapshotRepo) {
          sharedRepoByRoot.delete(e);
          recordSnapshotFailure(e);
        }
        return sharedSnapshotRepo;
      },
      () => {
        sharedRepoByRoot.delete(e);
        recordSnapshotFailure(e);
        return null;
      },
    );
    sharedRepoByRoot.set(e, n);
  }
  return n;
}
//@ chunk-e6aww6q8.js:4781127-4781314 placement
function recordSnapshotFailure(e) {
  let n = (snapshotFailureCounts.get(e) ?? 0) + 1;
  snapshotFailureCounts.set(e, n);
  if (n === MAX_SNAPSHOT_FAILURES) {
    logForDebugging(`bashEditDiff: giving up on ${e} for this session`);
    logFeatureBad(
      isSharedSnapshotEnabled() ? "bash_edit_diff_shared" : "bash_edit_diff",
      "snapshot_given_up",
    );
  }
}
//@ chunk-e6aww6q8.js:4781314-4782991 placement
/**
 * 为多个命令共享的快照创建私有 git 仓库（支持 sha256 对象格式）。
 */
async function createSharedSnapshotRepo(e) {
  let gitDir = await getGitDir(e);
  if (!gitDir) return null;
  let throughRoot = resolveThroughRoot(e, join((await getCommonDir(gitDir)) ?? gitDir, "objects"));
  if (!(await isSafeGitObjectsDir(throughRoot, e))) return null;
  let privateTempRoot = await ensurePrivateTempRoot();
  if (privateTempRoot === null) return null;
  let h = join(
    privateTempRoot.root,
    `${bunHashOf(getSessionId())}-${bunHashOf(e)}-${randomBytes(8).toString("hex")}`,
  );
  await mkdir(h, {
    mode: 448,
  });
  logForDebugging(`bashEditDiff: commands share snapshots: ${isSharedSnapshotEnabled()}`);
  objectsDirByGitDir.set(h, throughRoot);
  privateDirIdentity.set(h, privateTempRoot.identity);
  let y = false;
  try {
    registerCleanup(cleanupSnapshotRepos);
    await mkdir(join(h, "objects", "info"), {
      recursive: true,
      mode: 448,
    });
    await mkdir(join(h, "refs", "heads"), {
      recursive: true,
      mode: 448,
    });
    await mkdir(join(h, "info"), {
      mode: 448,
    });
    let S = await usesSha256Objects(throughRoot, gitDir);
    let w = {
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
      "objects/info/alternates": `${throughRoot}
`,
      "info/attributes": `* -filter -working-tree-encoding -text -eol -ident !diff
`,
      "info/exclude":
        (await writeFileAtomically(
          join(dirname(throughRoot), "info", "exclude"),
          SNAPSHOT_EXCLUDE_CONTENT,
        )) ?? "",
    };
    for (let [key, value] of Object.entries(w))
      await writeFile(join(h, key), value, {
        flag: "wx",
      });
    let excludesFile = await readExcludesFile(h);
    let G =
      excludesFile !== null && isAbsolute(excludesFile) && !isOnForeignMount(excludesFile, h)
        ? `[core]
	excludesFile = ${quoteGitPath(excludesFile)}
`
        : "";
    await writeFile(join(h, "config.global"), G, {
      flag: "wx",
    });
    expectedFilesByGitDir.set(h, {
      ...w,
      "config.global": G,
    });
    let q = join(gitDir, "index");
    let Z = await lstat(q).catch(() => null);
    if (Z?.isFile() && Z.size <= MAX_INDEX_BYTES) {
      await copyFileNoFollow(q, join(h, "index"), {
        exclusive: true,
        nonBlocking: true,
      }).catch(() => {
        return;
      });
      let ke = await runSnapshotGit(e, h, ["ls-files", "-z", "--stage"], {
        timeout: GIT_INDEX_TIMEOUT_MS,
        maxBuffer: MAX_INDEX_BYTES * 2,
      });
      if (!(ke.code === 0 && isStageZeroListing(ke.stdout)))
        await unlink(join(h, "index")).catch(() => {
          return;
        });
    }
    await runSnapshotGitStep(e, h, ["update-index", "--untracked-cache"], GIT_INDEX_TIMEOUT_MS);
    let Se = await runSnapshotGitStep(e, h, ["write-tree"], GIT_INDEX_TIMEOUT_MS);
    if (Se.code !== 0 || !(await commitSnapshotTree(e, h, Se.stdout.trim(), GIT_INDEX_TIMEOUT_MS)))
      return null;
    y = true;
    return h;
  } finally {
    if (!y) {
      expectedFilesByGitDir.delete(h);
      await removePrivateGitDir(h);
    }
  }
}
//@ chunk-e6aww6q8.js:4782991-4783054 placement
/**
 * 给 git 配置值加双引号并转义反斜杠与引号，用于 core.excludesFile 之类的路径。
 */
function quoteGitPath(excludesFile) {
  return `"${excludesFile.replace(/["\\]/g, (n) => `\\${n}`)}"`;
}
//@ chunk-e6aww6q8.js:4783054-4783367 placement
/**
 * 读取仓库 core.excludesFile 配置（在受控 git 环境中执行），返回路径或 null。
 */
async function readExcludesFile(e) {
  let snapshotGitEnv = await buildSnapshotGitEnv(
    [gitExe(), "config", "--get", "--path", "core.excludesFile"],
    getRemoteHostSessionCount({
      GIT_DIR: e,
    }),
    e,
  );
  if (snapshotGitEnv === null) return null;
  try {
    let { stdout, code } = await execFileNoThrowWithCwd(snapshotGitEnv.file, snapshotGitEnv.args, {
      cwd: e,
      timeout: GIT_STEP_TIMEOUT_MS,
      preserveOutputOnError: false,
      env: snapshotGitEnv.env,
    });
    let trimmed = stdout.trim();
    return code === 0 && trimmed !== "" && !/[\0\r\n]/.test(trimmed) ? trimmed : null;
  } finally {
    cleanupSandboxAfterGit(snapshotGitEnv);
  }
}
//@ chunk-e6aww6q8.js:4783367-4783514 placement
async function usesSha256Objects(throughRoot, gitDir) {
  let r = await writeFileAtomically(join(throughRoot, "..", "config"), 1e6);
  let s = await writeFileAtomically(join(gitDir, "config"), 1e6);
  return /objectformat\s*=\s*sha256/i.test(r ?? s ?? "");
}
//@ chunk-e6aww6q8.js:4783514-4783689 placement
/**
 * 把根目录内的路径通过根目录的真实路径解析（根目录不安全或不在其中时原样返回）。
 */
function resolveThroughRoot(e, n) {
  let r = resolve_2(e);
  let s = resolve_2(n);
  if (s !== r && !s.startsWith(r + sep)) return s;
  if (rawPointerPathIsUnsafe(r, r)) return s;
  let h;
  try {
    h = realpathSync(r);
  } catch {
    return s;
  }
  return isOnForeignMount(h, r) ? s : join(h, s.slice(r.length));
}
//@ chunk-e6aww6q8.js:4783689-4784244 placement = writeRemoteEntriesToLocal (0.346)
async function isSafeGitObjectsDir(e, n, r = 0, s = new Set()) {
  if (r > MAX_ALTERNATE_DEPTH || s.has(e)) return false;
  s.add(e);
  if (
    !(await isRealDirectoryChain_2(e)) ||
    !(await isDirFreeOfSymlinks(e)) ||
    !(await isDirFreeOfSymlinks(join(e, "pack")))
  )
    return false;
  let h = join(e, "info", "alternates");
  let y = await writeFileAtomically(h, SNAPSHOT_EXCLUDE_CONTENT);
  if (y === null)
    return lstat(h).then(
      () => false,
      (error) =>
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error.code === "ENOENT" || error.code === "ENOTDIR"),
    );
  for (let S of y
    .split(
      `
`,
    )
    .map((line) => line.trim())) {
    if (S === "" || S.startsWith("#")) continue;
    if (isOnForeignMount(S, e)) return false;
    let root = isAbsolute(S) ? parse(S).root : null;
    let dirNoLinks = await resolveDirNoLinks(root ?? e, root === null ? S : S.slice(root.length));
    if (dirNoLinks === null || !(await isSafeGitObjectsDir(dirNoLinks, n, r + 1, s))) return false;
  }
  return true;
}
//@ chunk-e6aww6q8.js:4784244-4784577 placement = isErrnoException (0.582)
async function isDirFreeOfSymlinks(e) {
  let n;
  try {
    n = await readdir(e);
  } catch (error) {
    let code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
    return code === "ENOENT" || code === "ENOTDIR";
  }
  for (let r of n) {
    let s = await lstat(join(e, r)).catch((error) =>
      typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT"
        ? null
        : undefined,
    );
    if (s === undefined || s?.isSymbolicLink()) return false;
  }
  return true;
}
//@ chunk-e6aww6q8.js:4784577-4784814 placement
async function resolveDirNoLinks(e, n) {
  let r = e;
  for (let s of n.split(/[\\/]/)) {
    if (s === "" || s === ".") continue;
    if (s === "..") {
      r = dirname(r);
      continue;
    }
    r = join(r, s);
    let h = await lstat(r).catch(() => null);
    if (h === null || h.isSymbolicLink() || !h.isDirectory()) return null;
  }
  return r;
}
//@ chunk-e6aww6q8.js:4784814-4784972 placement
function isStageZeroListing(stdout) {
  let n = 0;
  while (n < stdout.length) {
    let index = stdout.indexOf("\x00", n);
    let sliced = stdout.slice(n, index === -1 ? stdout.length : index);
    if (sliced !== "" && !isStageZeroEntry(sliced)) return false;
    if (index === -1) break;
    n = index + 1;
  }
  return true;
}
//@ chunk-e6aww6q8.js:4784972-4785097 placement
function isStageZeroEntry(e) {
  let index = e.indexOf("\t");
  let r = index === -1 ? "" : e.slice(index + 1);
  return (index === -1 ? "" : e.slice(0, index).split(" ").at(-1)) === "0" && isSafeRepoPath(r);
}
//@ chunk-e6aww6q8.js:4785097-4785166 placement
/**
 * 按平台拆仓库内相对路径：Windows 上 \ 与 / 都是分隔符。
 */
function splitRepoPath(e) {
  return getPlatform() === "windows" ? e.split(/[\\/]/) : e.split("/");
}
//@ chunk-e6aww6q8.js:4785166-4785349 placement
/**
 * 判断仓库内相对路径安全：非空、非绝对、无控制字符、Windows 下不含冒号，且各段不为空、. 或 ..，也不是保留名。
 */
function isSafeRepoPath(e) {
  return (
    e !== "" &&
    !e.startsWith("/") &&
    !/[\0-\x1f\x7f-\x9f\u2028\u2029]/.test(e) &&
    (getPlatform() !== "windows" || !e.includes(":")) &&
    !splitRepoPath(e).some((n) => n === "" || n === "." || n === ".." || isReservedGitPathSegment(n))
  );
}
//@ chunk-e6aww6q8.js:4785349-4785447 placement
/**
 * 判断路径段是否是 git 保留名（.git、git~1 之类）。
 */
function isReservedGitPathSegment(e) {
  let replaced = e.toLowerCase().replace(/[. ]+$/, "");
  return replaced === ".git" || /^git~\d+$/.test(replaced);
}
//@ chunk-e6aww6q8.js:4785447-4785679 placement
async function isRealDirectoryChain_2(e) {
  let n = resolve_2(e);
  let root = parse(n).root;
  let filtered = n
    .slice(root.length)
    .split(sep)
    .filter((y) => y !== "");
  let h = root;
  for (let y of filtered) {
    h = join(h, y);
    let S = await lstat(h).catch(() => null);
    if (S === null || S.isSymbolicLink() || !S.isDirectory()) return false;
  }
  return true;
}
//@ chunk-e6aww6q8.js:4785679-4785900 placement
async function verifyPrivateGitDir(e, n, expectedFiles = expectedFilesByGitDir.get(e)) {
  if (!expectedFiles) return false;
  for (let [key, value] of Object.entries(expectedFiles))
    if ((await writeFileAtomically(join(e, key), SNAPSHOT_EXCLUDE_CONTENT)) !== value) return false;
  let s = await readdir(e).catch(() => null);
  if (s === null || s.some((h) => !PRIVATE_GIT_DIR_ENTRIES.has(h))) return false;
  return isSafeGitObjectsDir(n, e);
}
//@ chunk-e6aww6q8.js:4785900-4785996 placement
/**
 * 私有 git 目录允许出现的顶层条目（HEAD、config、index、objects、refs 等）。
 */
var PRIVATE_GIT_DIR_ENTRIES = new Set([
  "HEAD",
  "config",
  "config.global",
  "index",
  "index.lock",
  "info",
  "objects",
  "refs",
]);
//@ chunk-e6aww6q8.js:4785996-4786092 placement
/**
 * 已知仓库的私有对象目录时按其记录校验（.git 未被替换），否则返回 false。
 */
function verifyKnownPrivateGitDir(base) {
  let n = objectsDirByGitDir.get(base.gitDirectory);
  return n ? verifyPrivateGitDir(base.gitDirectory, n) : Promise.resolve(false);
}
//@ chunk-e6aww6q8.js:4786092-4788314 placement
/**
 * 为工作区做快照：用 git status 收集改动与未跟踪文件。
 */
async function snapshotWorkingTree(e, n, r) {
  let s = prefetchedTrees.has(n) ? GIT_STEP_TIMEOUT_MS : GIT_INDEX_TIMEOUT_MS;
  let h = objectsDirByGitDir.get(n);
  if (!h || !(await verifyPrivateGitDir(n, h))) return abandonSharedRepo(e, n, "alternates");
  await unlink(join(n, "index.lock")).catch(() => {
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
    {
      timeout: s,
      env: {
        GIT_OPTIONAL_LOCKS: "1",
      },
    },
  );
  if (y.code !== 0) return abandonSharedRepo(e, n, `status exit ${y.code}`);
  let { changed, deleted, untrackedDirectories } = parsePorcelainStatus(y.stdout);
  let G = prefetchedTrees.get(n);
  if (changed.length === 0 && deleted.length === 0 && untrackedDirectories.length === 0 && G) {
    oversizedByGitDir.delete(n);
    return G;
  }
  let q = [...untrackedDirectories];
  let Z = new Map();
  for (let nt of deleted) {
    if (!(await parentDirsExist(e, nt, Z))) continue;
    if ((await lstat(join(e, nt)).catch(() => null))?.isDirectory()) q.push(`${nt}/`);
  }
  for (let nt of batchPathsForArgv(q)) {
    let pt = await runSnapshotGitStep(
      e,
      n,
      ["ls-files", "-z", "--others", "--exclude-standard", "--", ...nt],
      s,
    );
    if (pt.code !== 0) return abandonSharedRepo(e, n, `ls-files exit ${pt.code}`);
    changed.push(...pt.stdout.split("\x00").filter((Et) => !Et.endsWith("/") && isSafeRepoPath(Et)));
  }
  if (q.length > 0 && changed.length === 0 && deleted.length === 0 && G) {
    oversizedByGitDir.delete(n);
    return G;
  }
  let Se = [];
  let files = oversizedByGitDir.get(n)?.files;
  let we = new Map();
  let Ee = 0;
  let Ae = [];
  let Ie = new Map();
  for (let nt of changed) {
    if (!(await parentDirsExist(e, nt, Z))) continue;
    let pt = await statNoFollow(join(e, nt));
    if (pt === "unreadable" || (typeof pt === "object" && pt.size > MAX_SNAPSHOT_FILE_BYTES)) {
      let Et = typeof pt === "object" ? `${pt.size} ${pt.mtimeMs}` : "unreadable";
      we.set(nt, Et);
      if (files?.get(nt) !== Et) {
        Ee++;
        Ae.push(nt);
      }
    } else if (pt !== "other") {
      Se.push(nt);
      if (typeof pt === "object") Ie.set(nt, pt.size);
    }
  }
  oversizedByGitDir.set(n, {
    files: we,
    changed: Ee,
    changedPaths: Ae,
  });
  changed.splice(0, changed.length, ...Se);
  let Me = r ? await findConvertedFiles(e, n, changed) : new Map();
  let We = convertedFilesByGitDir.get(n) ?? [];
  let ze = new Map(We.map((nt) => [nt.path, nt.sameSize]));
  for (let nt of changed) {
    let pt = Me.get(nt);
    if (pt !== undefined)
      We.push({
        path: nt,
        sameSize: Ie.get(nt) === pt,
      });
    else if (ze.get(nt))
      We.push({
        path: nt,
        sameSize: false,
        changedAgain: true,
      });
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
  let lt = await runSnapshotGitStep(e, n, ["write-tree"], s);
  let trimmed = lt.stdout.trim();
  if (lt.code !== 0 || !/^[0-9a-f]{40,64}$/.test(trimmed))
    return abandonSharedRepo(e, n, `write-tree exit ${lt.code}`);
  if (trimmed !== G && !(await commitSnapshotTree(e, n, trimmed)))
    return abandonSharedRepo(e, n, "commit-tree");
  prefetchedTrees.set(n, trimmed);
  snapshotFailureCounts.delete(e);
  return trimmed;
}
//@ chunk-e6aww6q8.js:4788314-4789018 placement
/**
 * 找出索引中经换行/过滤转换后大小与对象大小不同的文件：ls-files --debug 取大小，cat-file --batch-check 对比 blob 大小。
 */
async function findConvertedFiles(e, n, r) {
  let s = new Map();
  let [h = []] = batchPathsForArgv(r);
  if (h.length === 0) return s;
  let y = await runSnapshotGitStep(e, n, ["ls-files", "-z", "--stage", "--debug", "--", ...h]);
  if (y.code !== 0) {
    logForDebugging(`bashEditDiff: converted-file check: ls-files exit ${y.code}`);
    return s;
  }
  let S = [...y.stdout.matchAll(/^\d{6} ([0-9a-f]{40,64}) 0\t([^\0]+)\0[^]*?\n {2}size: (\d+)\t/gm)];
  if (S.length === 0) return s;
  let w = await runSnapshotGit(e, n, ["cat-file", "--batch-check"], {
    timeout: GIT_STEP_TIMEOUT_MS,
    input: `${S.map((G) => G[1]).join(`
`)}
`,
  });
  if (w.code !== 0) {
    logForDebugging(`bashEditDiff: converted-file check: cat-file exit ${w.code}`);
    return s;
  }
  let lines = w.stdout.split(`
`);
  for (let [G, q] of S.entries()) {
    let [, Z, Se] = (lines[G] ?? "").split(" ");
    if (Z === "blob" && q[3] !== "0" && Se !== q[3]) s.set(q[2], Number(q[3]));
  }
  return s;
}
//@ chunk-e6aww6q8.js:4789018-4789190 placement
function* batchPathsForArgv(e) {
  let n = [];
  let r = 0;
  for (let s of e) {
    let h = Buffer.byteLength(s) + 3 + countCharInString(s, '"') + countCharInString(s, "\\");
    if (n.length > 0 && r + h > MAX_PATHS_BATCH_CHARS) {
      yield n;
      n = [];
      r = 0;
    }
    n.push(s);
    r += h;
  }
  if (n.length > 0) yield n;
}
//@ chunk-e6aww6q8.js:4789190-4789389 placement
function abandonSharedRepo(e, n, r) {
  logForDebugging(`bashEditDiff: ${r}`);
  if (!expectedFilesByGitDir.has(n)) return null;
  sharedRepoByRoot.delete(e);
  prefetchedTrees.delete(n);
  oversizedByGitDir.delete(n);
  expectedFilesByGitDir.delete(n);
  recordSnapshotFailure(e);
  Promise.all([serialChainByRepo.get(e), serialChainByRepo.get(diffSerialKey(e))]).then(() =>
    removePrivateGitDir(n),
  );
  return null;
}
//@ chunk-e6aww6q8.js:4789389-4789621 placement
async function removePrivateGitDir(e) {
  try {
    let n = privateDirIdentity.get(e);
    if (n === undefined) return;
    if (await getFileIdentity_9(e, n))
      await rm_2(e, {
        recursive: true,
        force: true,
      });
    objectsDirByGitDir.delete(e);
    privateDirIdentity.delete(e);
    convertedFilesByGitDir.delete(e);
  } catch (error) {
    logForDebugging(`bashEditDiff: private directory not removed: ${String(error)}`);
  }
}
//@ chunk-e6aww6q8.js:4789621-4789633 placement
/**
 * 清理私有 git 目录的整体超时（300 毫秒）。
 */
var PRIVATE_GIT_DIR_REMOVE_TIMEOUT_MS = 300;
//@ chunk-e6aww6q8.js:4789633-4789751 placement
async function cleanupSnapshotRepos() {
  sharedRepoByRoot.clear();
  prefetchedTrees.clear();
  oversizedByGitDir.clear();
  expectedFilesByGitDir.clear();
  await withDeadline(
    Promise.all(Array.from(objectsDirByGitDir.keys(), removePrivateGitDir)),
    PRIVATE_GIT_DIR_REMOVE_TIMEOUT_MS,
  );
}
//@ chunk-e6aww6q8.js:4789751-4790168 placement
/**
 * 以 O_NOFOLLOW 打开文件获取大小与 mtime；符号链接、缺失、不可读或非普通文件分别返回对应标记。
 */
async function statNoFollow(e) {
  let n;
  try {
    n = await open(
      e,
      constants.O_RDONLY | (getPlatform() === "windows" ? 0 : constants.O_NOFOLLOW | constants.O_NONBLOCK),
    );
  } catch (error) {
    let code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
    return code === "ELOOP"
      ? "link"
      : code === "ENOENT" || code === "ENOTDIR"
        ? "missing"
        : code === "EACCES" || code === "EPERM"
          ? "unreadable"
          : "other";
  }
  try {
    let stats = await n.stat();
    return stats.isFile()
      ? {
          size: stats.size,
          mtimeMs: stats.mtimeMs,
        }
      : "other";
  } catch {
    return "other";
  } finally {
    await n.close();
  }
}
//@ chunk-e6aww6q8.js:4790168-4790376 placement
async function parentDirsExist(e, n, r) {
  let s = splitRepoPath(n);
  let h = e;
  for (let y of s.slice(0, -1)) {
    h = join(h, y);
    let S = r.get(h);
    if (S === undefined) {
      let w = await lstat(h).catch(() => null);
      S = w !== null && w.isDirectory();
      r.set(h, S);
    }
    if (!S) return false;
  }
  return true;
}
//@ chunk-e6aww6q8.js:4790376-4790537 placement
function isEmptyBlobId(e) {
  return (
    "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391".startsWith(e) ||
    "473a0f4c3be8a93681a267e3b1e9a7dcda1185436fe141f7749120a303721813".startsWith(e)
  );
}
//@ chunk-e6aww6q8.js:4790537-4790958 placement
/**
 * 解析 git status --porcelain=v2 -z 输出：变更/未跟踪文件、已删除文件、未跟踪目录（只保留安全路径）。
 */
function parsePorcelainStatus(stdout) {
  let n = [];
  let r = [];
  let s = [];
  for (let h of stdout.split("\x00"))
    if (h.startsWith("? ")) {
      let y = h.endsWith("/");
      let S = y ? h.slice(2, -1) : h.slice(2);
      if (isSafeRepoPath(S)) (y ? s : n).push(h.slice(2));
    } else if (h.startsWith("1 ") || h.startsWith("u ")) {
      let y = h.startsWith("1 ") ? 9 : 11;
      let S = 0;
      for (let idx = 0; idx < y - 1; idx++) S = h.indexOf(" ", S) + 1;
      let sliced = h.slice(S);
      if (h[3] === "." || !isSafeRepoPath(sliced)) continue;
      (h[3] === "D" ? r : n).push(sliced);
    }
  return {
    changed: n,
    deleted: r,
    untrackedDirectories: s,
  };
}
//@ chunk-e6aww6q8.js:4790958-4791546 placement
async function commitSnapshotTree(e, n, r, timeout = GIT_STEP_TIMEOUT_MS) {
  let h = await runSnapshotGit(e, n, ["commit-tree", r, "-m", "snapshot"], {
    timeout,
    env: {
      GIT_AUTHOR_NAME: "bash-edit-diff",
      GIT_AUTHOR_EMAIL: "bash-edit-diff@localhost",
      GIT_AUTHOR_DATE: "1000000000 +0000",
      GIT_COMMITTER_NAME: "bash-edit-diff",
      GIT_COMMITTER_EMAIL: "bash-edit-diff@localhost",
      GIT_COMMITTER_DATE: "1000000000 +0000",
    },
  });
  let trimmed = h.stdout.trim();
  if (h.code !== 0 || !/^[0-9a-f]{40,64}$/.test(trimmed)) return false;
  try {
    let S = await open(
      join(n, "refs", "heads", "main"),
      constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | constants.O_NOFOLLOW,
      384,
    );
    try {
      await S.writeFile(`${trimmed}
`);
    } finally {
      await S.close();
    }
    return true;
  } catch {
    return false;
  }
}
//@ chunk-e6aww6q8.js:4791546-4791599 placement
/**
 * 用默认步骤超时在快照私有 git 目录上执行 git 命令的封装。
 */
function runSnapshotGitStep(e, n, r, timeout = GIT_STEP_TIMEOUT_MS) {
  return runSnapshotGit(e, n, r, {
    timeout,
  });
}
//@ chunk-e6aww6q8.js:4791599-4792262 placement
/**
 * 在快照私有 git 目录上运行 git：加安全参数与隔离环境，共享模式下用延迟多次的 setImmediate 实现超时中止，返回执行结果（超时时 timedOut）。
 */
async function runSnapshotGit(repoRoot, gitDir, args, options) {
  let snapshotGitEnv = await buildSnapshotGitEnv(
    [
      gitExe(),
      ...getSnapshotGitArgs().filter(
        (Z) => options.literalPathspecs !== false || Z !== "--literal-pathspecs",
      ),
      ...args,
    ],
    {
      ...getSnapshotGitEnv(gitDir, repoRoot),
      ...options.env,
    },
    gitDir,
  );
  if (snapshotGitEnv === null)
    return {
      stdout: "",
      code: -1,
    };
  let y = isSharedSnapshotEnabled();
  let abortController = new AbortController();
  let w = DIFF_RETRY_COUNT;
  let L;
  let G = () => {
    if (w-- > 0) L = setImmediate(G);
    else abortController.abort();
  };
  let q = y ? setTimeout(G, options.timeout) : undefined;
  try {
    let Z = await execFileNoThrowWithCwd(snapshotGitEnv.file, snapshotGitEnv.args, {
      cwd: repoRoot,
      ...(y
        ? {
            abortSignal: abortController.signal,
          }
        : {
            timeout: options.timeout,
          }),
      preserveOutputOnError: false,
      maxBuffer: options.maxBuffer ?? DEFAULT_GIT_MAX_BUFFER,
      ...(options.input !== undefined && {
        input: options.input,
      }),
      env: snapshotGitEnv.env,
    });
    let Se = abortController.signal.aborted && Z.exitCode === undefined;
    if (Z.maxBufferExceeded) abortController.abort();
    return Se
      ? {
          ...Z,
          timedOut: true,
        }
      : Z;
  } finally {
    clearTimeout(q);
    clearImmediate(L);
    cleanupSandboxAfterGit(snapshotGitEnv);
  }
}
//@ chunk-e6aww6q8.js:4792262-4792389 placement
/**
 * 快照 git 命令的通用参数：字面路径规格、安全配置、禁用 askPass 与路径转义等。
 */
function getSnapshotGitArgs() {
  return [
    "--literal-pathspecs",
    ...GIT_SAFE_GLOBAL_ARGS,
    "-c",
    "core.askPass=",
    "-c",
    "core.quotePath=false",
    "-c",
    "core.safecrlf=false",
  ];
}
//@ chunk-e6aww6q8.js:4792389-4792772 placement
/**
 * 构建快照用的隔离 git 环境：独立 GIT_DIR/工作树与全局配置，禁用系统配置、懒获取、替换对象、可选锁与终端提示，清除路径规格相关变量。
 */
function getSnapshotGitEnv(e, repoRoot) {
  return {
    ...getRemoteHostSessionCount({
      GIT_DIR: e,
      GIT_WORK_TREE: repoRoot,
      GIT_CONFIG_GLOBAL: join(e, "config.global"),
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_ATTR_NOSYSTEM: "1",
      GIT_NO_LAZY_FETCH: "1",
      GIT_NO_REPLACE_OBJECTS: "1",
      GIT_OPTIONAL_LOCKS: "0",
      GIT_ALLOW_PROTOCOL: GIT_ALLOW_PROTOCOL_VALUE,
      GIT_TERMINAL_PROMPT: "0",
      ...GIT_FILES_REF_BACKEND_ENV,
    }),
    GIT_LITERAL_PATHSPECS: undefined,
    GIT_GLOB_PATHSPECS: undefined,
    GIT_NOGLOB_PATHSPECS: undefined,
    GIT_ICASE_PATHSPECS: undefined,
  };
}
//@ chunk-e6aww6q8.js:4793271-4793443 placement
/**
 * 写入观察器常量与模块状态：路径/仓库/忽略检查/外部写入/并发查找/保留文件/监视器数量上限，节流与等待时间，以及监视器表、仓库表、共享 inotify 监视器等。
 */
var MAX_OBSERVED_PATHS = 5000;
var MAX_OBSERVED_REPOS = 64;
var IGNORE_CHECKS_PER_REPO = 256;
var MAX_OUTSIDE_WRITES = 1000;
var MAX_CONCURRENT_IGNORE_LOOKUPS = 8;
var MAX_HELD_FILES = 20000;
var MAX_WATCHERS = 30000;
var YIELD_EVERY = 200;
var SETTLE_WAIT_MS = 250;
var QUIET_WINDOWS_MS = {
  grace: 30,
  quiet: 60,
};
var MAX_SETTLE_MS = 300;
var observersByRoot = identity_2(new Map(), () => {
  stopAllWriteObservers();
});
var observedRepos = new Map();
var sharedWatcher = null;
var sharedWatcherReady = null;
var exitHookInstalled = false;
export {
  commandMovesWorkTree,
  isRepoSnapshotGivenUp,
  takeBashSnapshot,
  isSharedSnapshotEnabled,
  registerConcurrentCommand,
  unregisterConcurrentCommand,
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
  verifyKnownPrivateGitDir,
  isSafeRepoPath,
  findConvertedFiles,
  runSnapshotGit,
  getSnapshotGitArgs,
  getSnapshotGitEnv,
  commandMovesWorkTree_2,
};
