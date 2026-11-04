/**
 * tools/BashTool/bashEditDiff/snapshot.ts
 *
 * 2.1.316 新增：bashEditDiff：命令前后工作区快照与 diff
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (61)
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
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:4773548-4773795 placement
/**
 * 会移动工作树的 git 子命令列表（checkout/switch/stash/pull/merge/rebase/reset 等）及匹配"只运行这类 git 命令"的正则。
 */
var TREE_MOVING_GIT_SUBCOMMANDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var TREE_MOVING_GIT_COMMAND_RE;
deferInit("chunk-e6aww6q8.js:4773548", () => {
  TREE_MOVING_GIT_SUBCOMMANDS = [
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
  TREE_MOVING_GIT_COMMAND_RE = new RegExp(
    String.raw`^[ \t]*(?:sudo[ \t]+)?git[ \t]+(?:${TREE_MOVING_GIT_SUBCOMMANDS.join("|")})(?:[ \t]+[A-Za-z0-9._/@~^][A-Za-z0-9._/@~^-]*){0,16}\s*$`,
  );
});
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
    let syntaxTree = command.length > SPLIT_MAX_LEN ? null : getParserModule()?.parse(command);
    let parsed = syntaxTree ? parseForSecurityFromAst(command, syntaxTree) : undefined;
    return (
      parsed?.kind === "simple"
        ? parsed.commands.map((command) => command.argv)
        : splitCommand(command).map(getCommandArgv)
    ).some((argv) =>
      TREE_MOVING_GIT_SUBCOMMANDS.includes(getGitSubcommand(argv[0] === "sudo" ? argv.slice(1) : argv) ?? ""),
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
var snapshotFailureCounts; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var sharedRepoByRoot;
var prefetchedTrees;
var oversizedByGitDir;
var objectsDirByGitDir;
var privateDirIdentity;
var expectedFilesByGitDir;
var serialChainByRepo;
var sharedReadsInFlight;
var nextReadAtByRepo;
var convertedFilesByGitDir;
deferInit("chunk-e6aww6q8.js:4774111", () => {
  snapshotFailureCounts = new Map();
  sharedRepoByRoot = new Map();
  prefetchedTrees = new Map();
  oversizedByGitDir = new Map();
  objectsDirByGitDir = new Map();
  privateDirIdentity = new Map();
  expectedFilesByGitDir = new Map();
  serialChainByRepo = new Map();
  sharedReadsInFlight = identity_2(new Map(), (map) => map.clear());
  nextReadAtByRepo = identity_2(new Map(), (map) => map.clear());
  convertedFilesByGitDir = identity_2(new Map(), (map) => map.clear());
});
//@ chunk-e6aww6q8.js:4774298-4774340 placement
/**
 * 仓库快照失败次数超过上限（MAX_SNAPSHOT_FAILURES）时，该仓库放弃拍快照。
 */
function isRepoSnapshotGivenUp(gitRoot) {
  return (snapshotFailureCounts.get(gitRoot) ?? 0) >= MAX_SNAPSHOT_FAILURES;
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
async function takeBashSnapshot(cwd) {
  try {
    let gitRootRecheckingNegative = findGitRootRecheckingNegative(cwd);
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
function logEditDiffWait(waitMs, isSharedWait) {
  let waitBucket =
    waitMs >= 300000
      ? "wait_over_300s"
      : waitMs >= 60000
        ? "wait_over_60s"
        : waitMs >= 1e4
          ? "wait_over_10s"
          : null;
  if (waitBucket)
    logFeatureSad(isSharedWait ? "bash_edit_diff_shared_wait" : "bash_edit_diff_wait", waitBucket);
  else logFeatureOk(isSharedWait ? "bash_edit_diff_shared_wait" : "bash_edit_diff_wait");
}
//@ chunk-e6aww6q8.js:4774810-4775041 placement
async function snapshotRepo(repoRoot, useSharedReads) {
  let gitDirectory = await getSharedSnapshotRepo(repoRoot);
  if (!gitDirectory) return "unavailable";
  let treeState = await (useSharedReads
    ? readSharedTree(repoRoot, gitDirectory)
    : readTreeState(repoRoot, gitDirectory, false));
  return treeState
    ? {
        repoRoot,
        gitDirectory: treeState.gitDirectory,
        tree: treeState.tree,
        convertedFound: treeState.convertedFound,
        sharesTreeReads: useSharedReads,
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
        let after = await readTreeState(before.repoRoot, before.gitDirectory, true);
        if (!after)
          return {
            files: [],
            moreFiles: 0,
            unavailable: true,
          };
        return after.tree === before.tree
          ? oversizedOnlyResult(before.repoRoot, after)
          : diffSnapshotTrees(before, after);
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
      let beforeKey = `${before.tree} ${before.convertedFound}`;
      let diffPromise = after.diffByBeforeState.get(beforeKey);
      if (!diffPromise) {
        diffPromise = runSerialForRepo(diffSerialKey(before.repoRoot), () =>
          diffSnapshotTrees(before, after),
        );
        after.diffByBeforeState.set(beforeKey, diffPromise);
      }
      result = await diffPromise;
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
function oversizedOnlyResult(repoRoot, after) {
  return after.oversized > 0
    ? {
        files: [],
        moreFiles: after.oversized,
        changedFiles: after.oversizedPaths
          .slice(0, SHARED_READ_SPACING_MS)
          .map((oversizedPath) => join(repoRoot, oversizedPath)),
        unavailable: true,
      }
    : null;
}
//@ chunk-e6aww6q8.js:4776087-4776302 placement
async function isPrivateDirIntact({ gitDirectory, sharesTreeReads }, options) {
  if (!sharesTreeReads) return true;
  let expectedObjectFiles = objectsDirByGitDir.get(gitDirectory);
  if (
    expectedObjectFiles &&
    (await verifyPrivateGitDir(gitDirectory, expectedObjectFiles, options.expectedFiles))
  )
    return true;
  logForDebugging("bashEditDiff: private directory changed or gone; git step skipped");
  return false;
}
//@ chunk-e6aww6q8.js:4776302-4776549 placement
function runDiffTree(before, tree, extraArgs, paths = []) {
  return runSnapshotGit(
    before.repoRoot,
    before.gitDirectory,
    [
      "diff-tree",
      "-r",
      ...extraArgs,
      "--no-color",
      "--no-renames",
      ...RAW_BLOB_DIFF_FLAGS,
      before.tree,
      tree,
      ...(paths.length > 0 ? ["--", ...paths] : []),
    ],
    {
      timeout: GIT_STEP_TIMEOUT_MS,
      ...(before.sharesTreeReads && {
        env: {
          GIT_INDEX_FILE: join(before.gitDirectory, "no-index"),
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
  let statusByPath = new Map();
  let emptyByPath = new Set();
  for (let match of stdout.matchAll(/^:\d{6} \d{6} (\S+) (\S+) ([A-Z])\t(.+)$/gm)) {
    let rawPath = match[4];
    let path =
      rawPath.startsWith('"') && rawPath.endsWith('"') ? unquoteGitPathBytes(rawPath.slice(1, -1)) : rawPath;
    if (!isSafeRepoPath(path)) continue;
    let status = match[3];
    statusByPath.set(path, status);
    if ((status === "A" && isEmptyBlobId(match[2])) || (status === "D" && isEmptyBlobId(match[1])))
      emptyByPath.add(path);
  }
  return {
    statusByPath,
    emptyByPath,
  };
}
//@ chunk-e6aww6q8.js:4776858-4777177 placement
/**
 * 对比快照时去掉只有 CRLF 行尾差异的文件（git diff --ignore-cr-at-eol 无变化者）。
 */
async function dropCrlfOnlyChanges(before, after, sameSizeByPath, statusByPath, hunks) {
  for (let pathBatch of batchPathsForArgv(
    [...statusByPath.keys()].filter((key) => sameSizeByPath.get(key)),
  )) {
    if (!(await isPrivateDirIntact(before, after))) return;
    let result = await runDiffTree(before, after.tree, ["-z", "--numstat", "--ignore-cr-at-eol"], pathBatch);
    if (result.code !== 0) return;
    let changedPaths = new Set(result.stdout.split("\x00").map((line) => line.split("\t")[2]));
    for (let path of pathBatch)
      if (!changedPaths.has(path)) {
        hunks?.delete(path);
        statusByPath.delete(path);
      }
  }
}
//@ chunk-e6aww6q8.js:4777177-4779054 placement
/**
 * 对比命令前后的快照树，列出改动文件；超时或超出输出上限时只列路径。
 */
async function diffSnapshotTrees(before, after) {
  let { repoRoot, gitDirectory } = before;
  let unavailableResult = {
    files: [],
    moreFiles: 0,
    unavailable: true,
  };
  if (!(await isPrivateDirIntact(before, after))) return unavailableResult;
  let { tree, oversized, oversizedPaths } = after;
  let sameSizeByPath = new Map();
  for (let { path, sameSize, changedAgain } of convertedFilesByGitDir
    .get(gitDirectory)
    ?.slice(before.sharesTreeReads ? before.convertedFound : after.convertedBefore, after.convertedFound) ??
    [])
    if (!changedAgain || sameSizeByPath.has(path)) sameSizeByPath.set(path, sameSize);
  let diffResult = await runDiffTree(before, tree, ["--raw", "-p"]);
  let { stdout, code } = diffResult;
  if (code !== 0) {
    if (!before.sharesTreeReads) return unavailableResult;
    let failureText = diffResult.timedOut
      ? "timed out"
      : diffResult.maxBufferExceeded
        ? "passed the output cap"
        : `exit ${code}`;
    logForDebugging(`bashEditDiff: diff-tree ${failureText}; listing paths only`);
    if (!(await isPrivateDirIntact(before, after))) return unavailableResult;
    let rawResult = await runDiffTree(before, tree, ["--raw"]);
    if (rawResult.code !== 0) {
      logForDebugging(`bashEditDiff: path listing failed too, exit ${rawResult.code}`);
      return oversizedOnlyResult(repoRoot, after) ?? unavailableResult;
    }
    let { statusByPath } = parseRawDiffStatus(rawResult.stdout);
    await dropCrlfOnlyChanges(before, after, sameSizeByPath, statusByPath);
    if (statusByPath.size === 0) return oversizedOnlyResult(repoRoot, after);
    return {
      files: [],
      moreFiles: statusByPath.size + oversized,
      changedFiles: [...statusByPath.keys(), ...oversizedPaths]
        .slice(0, SHARED_READ_SPACING_MS)
        .map((path) => join(repoRoot, path)),
      unavailable: true,
    };
  }
  let { statusByPath, emptyByPath } = parseRawDiffStatus(stdout);
  let { hunks } = parseGitDiff(stdout);
  await dropCrlfOnlyChanges(before, after, sameSizeByPath, statusByPath, hunks);
  for (let pathBatch of batchPathsForArgv(
    [...statusByPath.keys()].filter((key) => sameSizeByPath.has(key)),
  )) {
    if (!(await isPrivateDirIntact(before, after))) break;
    let result = await runDiffTree(before, tree, ["-p", "--ignore-cr-at-eol"], pathBatch);
    if (result.code === 0)
      for (let [path, fileHunks] of parseGitDiff(result.stdout).hunks) hunks.set(path, fileHunks);
  }
  let size = statusByPath.size;
  if (size === 0 && hunks.size === 0) return oversizedOnlyResult(repoRoot, after);
  let files = [];
  for (let path of emptyByPath) {
    if (files.length >= MAX_DIFF_FILES) break;
    files.push({
      filePath: join(repoRoot, path),
      hunks: [],
      ...(statusByPath.get(path) === "A"
        ? {
            created: true,
          }
        : {
            deleted: true,
          }),
    });
  }
  for (let [path, fileHunks] of hunks) {
    if (files.length >= MAX_DIFF_FILES) break;
    if (
      !isDiffSmallEnough(fileHunks) ||
      fileHunks.reduce((acc, hunk) => acc + hunk.lines.length, 0) >= MAX_HUNK_LINE_COUNT
    )
      continue;
    let status = statusByPath.get(path);
    if (status === undefined) continue;
    files.push({
      filePath: join(repoRoot, path),
      hunks: fileHunks.map((hunk) => ({
        ...hunk,
        lines: hunk.lines.filter((line) => line !== ""),
      })),
      ...(status === "A" && {
        created: true,
      }),
      ...(status === "D" && {
        deleted: true,
      }),
    });
  }
  return {
    files,
    moreFiles: Math.max(size, hunks.size) - files.length + oversized,
    changedFiles: [...statusByPath.keys(), ...oversizedPaths]
      .slice(0, SHARED_READ_SPACING_MS)
      .map((path) => join(repoRoot, path)),
    ...(oversized > 0 && {
      unavailable: true,
    }),
  };
}
//@ chunk-e6aww6q8.js:4779054-4779086 placement
/**
 * 记录各仓库上正在运行的命令，同一仓库有多个命令时把它们都标记为并发。
 */
var commandsByRepo; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var weakSet_9;
deferInit("chunk-e6aww6q8.js:4779054", () => {
  commandsByRepo = new Map();
  weakSet_9 = new WeakSet();
});
//@ chunk-e6aww6q8.js:4779086-4779209 placement
/**
 * 登记某仓库上正在运行的命令；同一仓库有多个时把它们都标记为并发。
 */
function registerConcurrentCommand(repoRoot) {
  let token = {};
  let tokens = commandsByRepo.get(repoRoot);
  if (!tokens) {
    tokens = new Set();
    commandsByRepo.set(repoRoot, tokens);
  }
  tokens.add(token);
  if (tokens.size > 1) for (let token of tokens) weakSet_9.add(token);
  return token;
}
//@ chunk-e6aww6q8.js:4779209-4779304 placement
/**
 * 从仓库的命令集合里注销某命令，返回它此前是否被标记为并发。
 */
function unregisterConcurrentCommand(repoRoot, token) {
  let tokens = commandsByRepo.get(repoRoot);
  tokens?.delete(token);
  if (tokens?.size === 0) commandsByRepo.delete(repoRoot);
  return weakSet_9.has(token);
}
//@ chunk-e6aww6q8.js:4779304-4779341 placement
/**
 * 生成仓库的差异串行队列键，让差异计算与快照操作在同仓库不同队列上排队。
 */
function diffSerialKey(repoRoot) {
  return `${repoRoot}\x00diff`;
}
//@ chunk-e6aww6q8.js:4779341-4779449 placement
function runSerialForRepo(repoRoot, task) {
  let chained = (serialChainByRepo.get(repoRoot) ?? Promise.resolve()).then(task, task);
  serialChainByRepo.set(
    repoRoot,
    chained.catch(() => {
      return;
    }),
  );
  return chained;
}
//@ chunk-e6aww6q8.js:4779449-4779706 placement
/**
 * 共享读取工作树快照：同一 git 目录并发的读取合并为一次，记录调用者数量。
 */
function readSharedTree(repoRoot, gitDirectory) {
  let inFlight = sharedReadsInFlight.get(gitDirectory);
  if (inFlight) {
    inFlight.callers++;
    return inFlight.read;
  }
  let sharedRead = {
    callers: 1,
    read: runSerialForRepo(repoRoot, async () => {
      let { callers } = sharedRead;
      sharedReadsInFlight.delete(gitDirectory);
      let sharedSnapshotRepo =
        expectedFilesByGitDir.has(gitDirectory) || isRepoSnapshotGivenUp(repoRoot)
          ? gitDirectory
          : await getSharedSnapshotRepo(repoRoot);
      let treeState = sharedSnapshotRepo ? await readTreeState(repoRoot, sharedSnapshotRepo, true) : null;
      return (
        treeState && {
          ...treeState,
          callers,
        }
      );
    }),
  };
  sharedReadsInFlight.set(gitDirectory, sharedRead);
  return sharedRead.read;
}
//@ chunk-e6aww6q8.js:4779706-4780015 placement
/**
 * 为 git 目录生成工作树快照状态：快照树、超大文件统计、期望文件与转换计数。
 */
async function readTreeState(repoRoot, gitDirectory, useSharedReads) {
  let convertedBefore = convertedFilesByGitDir.get(gitDirectory)?.length ?? 0;
  let tree = await snapshotWorkingTree(repoRoot, gitDirectory, useSharedReads);
  if (!tree) return null;
  let oversized = oversizedByGitDir.get(gitDirectory);
  return {
    callers: 1,
    convertedBefore,
    gitDirectory,
    tree,
    oversized: oversized?.changed ?? 0,
    oversizedPaths: oversized?.changedPaths ?? [],
    diffByBeforeState: new Map(),
    expectedFiles: expectedFilesByGitDir.get(gitDirectory),
    convertedFound: convertedFilesByGitDir.get(gitDirectory)?.length ?? 0,
  };
}
//@ chunk-e6aww6q8.js:4780015-4780414 placement
/**
 * 用 git check-ignore 判断某目录是否被忽略（路径须在仓库内、仓库已被观察且有效）；无法判断返回 null。
 */
async function isDirectoryIgnored(root, directory) {
  let joined = relative(root, directory).split(sep).join("/");
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
  let expectedObjectFiles = objectsDirByGitDir.get(sharedSnapshotRepo);
  if (!expectedObjectFiles || !(await verifyPrivateGitDir(sharedSnapshotRepo, expectedObjectFiles)))
    return null;
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
async function listIgnoredFiles(repoRoot) {
  let ignoredFiles = new Set();
  if (isRepoSnapshotGivenUp(repoRoot)) return ignoredFiles;
  let gitDirectory = await getSharedSnapshotRepo(repoRoot);
  if (!gitDirectory) return ignoredFiles;
  if (isSharedSnapshotEnabled() && !prefetchedTrees.has(gitDirectory))
    await readSharedTree(repoRoot, gitDirectory).catch(() => null);
  return runSerialForRepo(repoRoot, async () => {
    let expectedObjectFiles = objectsDirByGitDir.get(gitDirectory);
    if (!expectedObjectFiles || !(await verifyPrivateGitDir(gitDirectory, expectedObjectFiles))) {
      abandonSharedRepo(repoRoot, gitDirectory, "ignored");
      return ignoredFiles;
    }
    let result = await runSnapshotGitStep(
      repoRoot,
      gitDirectory,
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
    if (result.code !== 0) return ignoredFiles;
    for (let entry of result.stdout.split("\x00"))
      if (entry.startsWith("! ") && entry.endsWith("/") && isSafeRepoPath(entry.slice(2, -1)))
        ignoredFiles.add(join(repoRoot, entry.slice(2, -1)));
    return ignoredFiles;
  });
}
//@ chunk-e6aww6q8.js:4780943-4781127 placement
function getSharedSnapshotRepo(repoRoot) {
  if (isCleanupStarted()) return Promise.resolve(null);
  let sharedRepo = sharedRepoByRoot.get(repoRoot);
  if (!sharedRepo) {
    sharedRepo = createSharedSnapshotRepo(repoRoot).then(
      (sharedSnapshotRepo) => {
        if (!sharedSnapshotRepo) {
          sharedRepoByRoot.delete(repoRoot);
          recordSnapshotFailure(repoRoot);
        }
        return sharedSnapshotRepo;
      },
      () => {
        sharedRepoByRoot.delete(repoRoot);
        recordSnapshotFailure(repoRoot);
        return null;
      },
    );
    sharedRepoByRoot.set(repoRoot, sharedRepo);
  }
  return sharedRepo;
}
//@ chunk-e6aww6q8.js:4781127-4781314 placement
function recordSnapshotFailure(repoRoot) {
  let failureCount = (snapshotFailureCounts.get(repoRoot) ?? 0) + 1;
  snapshotFailureCounts.set(repoRoot, failureCount);
  if (failureCount === MAX_SNAPSHOT_FAILURES) {
    logForDebugging(`bashEditDiff: giving up on ${repoRoot} for this session`);
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
async function createSharedSnapshotRepo(repoRoot) {
  let gitDir = await getGitDir(repoRoot);
  if (!gitDir) return null;
  let objectsDir = resolveThroughRoot(repoRoot, join((await getCommonDir(gitDir)) ?? gitDir, "objects"));
  if (!(await isSafeGitObjectsDir(objectsDir, repoRoot))) return null;
  let privateTempRoot = await ensurePrivateTempRoot();
  if (privateTempRoot === null) return null;
  let snapshotDir = join(
    privateTempRoot.root,
    `${bunHashOf(getSessionId())}-${bunHashOf(repoRoot)}-${randomBytes(8).toString("hex")}`,
  );
  await mkdir(snapshotDir, {
    mode: 448,
  });
  logForDebugging(`bashEditDiff: commands share snapshots: ${isSharedSnapshotEnabled()}`);
  objectsDirByGitDir.set(snapshotDir, objectsDir);
  privateDirIdentity.set(snapshotDir, privateTempRoot.identity);
  let isComplete = false;
  try {
    registerCleanup(cleanupSnapshotRepos);
    await mkdir(join(snapshotDir, "objects", "info"), {
      recursive: true,
      mode: 448,
    });
    await mkdir(join(snapshotDir, "refs", "heads"), {
      recursive: true,
      mode: 448,
    });
    await mkdir(join(snapshotDir, "info"), {
      mode: 448,
    });
    let isSha256 = await usesSha256Objects(objectsDir, gitDir);
    let files = {
      HEAD: `ref: refs/heads/main
`,
      config: `[core]
	repositoryformatversion = ${isSha256 ? 1 : 0}
	bare = false
	logallrefupdates = false
	untrackedCache = true
${
  isSha256
    ? `[extensions]
	objectformat = sha256
`
    : ""
}`,
      "objects/info/alternates": `${objectsDir}
`,
      "info/attributes": `* -filter -working-tree-encoding -text -eol -ident !diff
`,
      "info/exclude":
        (await writeFileAtomically(join(dirname(objectsDir), "info", "exclude"), SNAPSHOT_EXCLUDE_CONTENT)) ??
        "",
    };
    for (let [key, value] of Object.entries(files))
      await writeFile(join(snapshotDir, key), value, {
        flag: "wx",
      });
    let excludesFile = await readExcludesFile(snapshotDir);
    let configGlobal =
      excludesFile !== null && isAbsolute(excludesFile) && !isOnForeignMount(excludesFile, snapshotDir)
        ? `[core]
	excludesFile = ${quoteGitPath(excludesFile)}
`
        : "";
    await writeFile(join(snapshotDir, "config.global"), configGlobal, {
      flag: "wx",
    });
    expectedFilesByGitDir.set(snapshotDir, {
      ...files,
      "config.global": configGlobal,
    });
    let indexPath = join(gitDir, "index");
    let indexStat = await lstat(indexPath).catch(() => null);
    if (indexStat?.isFile() && indexStat.size <= MAX_INDEX_BYTES) {
      await copyFileNoFollow(indexPath, join(snapshotDir, "index"), {
        exclusive: true,
        nonBlocking: true,
      }).catch(() => {
        return;
      });
      let result = await runSnapshotGit(repoRoot, snapshotDir, ["ls-files", "-z", "--stage"], {
        timeout: GIT_INDEX_TIMEOUT_MS,
        maxBuffer: MAX_INDEX_BYTES * 2,
      });
      if (!(result.code === 0 && isStageZeroListing(result.stdout)))
        await unlink(join(snapshotDir, "index")).catch(() => {
          return;
        });
    }
    await runSnapshotGitStep(
      repoRoot,
      snapshotDir,
      ["update-index", "--untracked-cache"],
      GIT_INDEX_TIMEOUT_MS,
    );
    let result = await runSnapshotGitStep(repoRoot, snapshotDir, ["write-tree"], GIT_INDEX_TIMEOUT_MS);
    if (
      result.code !== 0 ||
      !(await commitSnapshotTree(repoRoot, snapshotDir, result.stdout.trim(), GIT_INDEX_TIMEOUT_MS))
    )
      return null;
    isComplete = true;
    return snapshotDir;
  } finally {
    if (!isComplete) {
      expectedFilesByGitDir.delete(snapshotDir);
      await removePrivateGitDir(snapshotDir);
    }
  }
}
//@ chunk-e6aww6q8.js:4782991-4783054 placement
/**
 * 给 git 配置值加双引号并转义反斜杠与引号，用于 core.excludesFile 之类的路径。
 */
function quoteGitPath(excludesFile) {
  return `"${excludesFile.replace(/["\\]/g, (char) => `\\${char}`)}"`;
}
//@ chunk-e6aww6q8.js:4783054-4783367 placement
/**
 * 读取仓库 core.excludesFile 配置（在受控 git 环境中执行），返回路径或 null。
 */
async function readExcludesFile(snapshotDir) {
  let snapshotGitEnv = await buildSnapshotGitEnv(
    [gitExe(), "config", "--get", "--path", "core.excludesFile"],
    getRemoteHostSessionCount({
      GIT_DIR: snapshotDir,
    }),
    snapshotDir,
  );
  if (snapshotGitEnv === null) return null;
  try {
    let { stdout, code } = await execFileNoThrowWithCwd(snapshotGitEnv.file, snapshotGitEnv.args, {
      cwd: snapshotDir,
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
async function usesSha256Objects(objectsDir, gitDir) {
  let commonConfig = await writeFileAtomically(join(objectsDir, "..", "config"), 1e6);
  let repoConfig = await writeFileAtomically(join(gitDir, "config"), 1e6);
  return /objectformat\s*=\s*sha256/i.test(commonConfig ?? repoConfig ?? "");
}
//@ chunk-e6aww6q8.js:4783514-4783689 placement
/**
 * 把根目录内的路径通过根目录的真实路径解析（根目录不安全或不在其中时原样返回）。
 */
function resolveThroughRoot(repoRoot, targetPath) {
  let resolvedRoot = resolve_2(repoRoot);
  let resolvedTarget = resolve_2(targetPath);
  if (resolvedTarget !== resolvedRoot && !resolvedTarget.startsWith(resolvedRoot + sep))
    return resolvedTarget;
  if (rawPointerPathIsUnsafe(resolvedRoot, resolvedRoot)) return resolvedTarget;
  let realRoot;
  try {
    realRoot = realpathSync(resolvedRoot);
  } catch {
    return resolvedTarget;
  }
  return isOnForeignMount(realRoot, resolvedRoot)
    ? resolvedTarget
    : join(realRoot, resolvedTarget.slice(resolvedRoot.length));
}
//@ chunk-e6aww6q8.js:4783689-4784244 placement (2.1.88 match: writeRemoteEntriesToLocal, 0.346)
async function isSafeGitObjectsDir(objectsDir, repoRoot, depth = 0, visited = new Set()) {
  if (depth > MAX_ALTERNATE_DEPTH || visited.has(objectsDir)) return false;
  visited.add(objectsDir);
  if (
    !(await isRealDirectoryChain_2(objectsDir)) ||
    !(await isDirFreeOfSymlinks(objectsDir)) ||
    !(await isDirFreeOfSymlinks(join(objectsDir, "pack")))
  )
    return false;
  let alternatesPath = join(objectsDir, "info", "alternates");
  let alternatesContent = await writeFileAtomically(alternatesPath, SNAPSHOT_EXCLUDE_CONTENT);
  if (alternatesContent === null)
    return lstat(alternatesPath).then(
      () => false,
      (error) =>
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error.code === "ENOENT" || error.code === "ENOTDIR"),
    );
  for (let line of alternatesContent
    .split(
      `
`,
    )
    .map((line) => line.trim())) {
    if (line === "" || line.startsWith("#")) continue;
    if (isOnForeignMount(line, objectsDir)) return false;
    let root = isAbsolute(line) ? parse(line).root : null;
    let objectsDir_2 = await resolveDirNoLinks(
      root ?? objectsDir,
      root === null ? line : line.slice(root.length),
    );
    if (objectsDir_2 === null || !(await isSafeGitObjectsDir(objectsDir_2, repoRoot, depth + 1, visited)))
      return false;
  }
  return true;
}
//@ chunk-e6aww6q8.js:4784244-4784577 placement (2.1.88 match: isErrnoException, 0.582)
async function isDirFreeOfSymlinks(dirPath) {
  let entries;
  try {
    entries = await readdir(dirPath);
  } catch (error) {
    let code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
    return code === "ENOENT" || code === "ENOTDIR";
  }
  for (let entry of entries) {
    let stat = await lstat(join(dirPath, entry)).catch((error) =>
      typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT"
        ? null
        : undefined,
    );
    if (stat === undefined || stat?.isSymbolicLink()) return false;
  }
  return true;
}
//@ chunk-e6aww6q8.js:4784577-4784814 placement
async function resolveDirNoLinks(rootDir, relativePath) {
  let currentDir = rootDir;
  for (let segment of relativePath.split(/[\\/]/)) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      currentDir = dirname(currentDir);
      continue;
    }
    currentDir = join(currentDir, segment);
    let stat = await lstat(currentDir).catch(() => null);
    if (stat === null || stat.isSymbolicLink() || !stat.isDirectory()) return null;
  }
  return currentDir;
}
//@ chunk-e6aww6q8.js:4784814-4784972 placement
function isStageZeroListing(stdout) {
  let pos = 0;
  while (pos < stdout.length) {
    let index = stdout.indexOf("\x00", pos);
    let line = stdout.slice(pos, index === -1 ? stdout.length : index);
    if (line !== "" && !isStageZeroEntry(line)) return false;
    if (index === -1) break;
    pos = index + 1;
  }
  return true;
}
//@ chunk-e6aww6q8.js:4784972-4785097 placement
function isStageZeroEntry(line) {
  let index = line.indexOf("\t");
  let path = index === -1 ? "" : line.slice(index + 1);
  return (index === -1 ? "" : line.slice(0, index).split(" ").at(-1)) === "0" && isSafeRepoPath(path);
}
//@ chunk-e6aww6q8.js:4785097-4785166 placement
/**
 * 按平台拆仓库内相对路径：Windows 上 \ 与 / 都是分隔符。
 */
function splitRepoPath(path) {
  return getPlatform() === "windows" ? path.split(/[\\/]/) : path.split("/");
}
//@ chunk-e6aww6q8.js:4785166-4785349 placement
/**
 * 判断仓库内相对路径安全：非空、非绝对、无控制字符、Windows 下不含冒号，且各段不为空、. 或 ..，也不是保留名。
 */
function isSafeRepoPath(path) {
  return (
    path !== "" &&
    !path.startsWith("/") &&
    !/[\0-\x1f\x7f-\x9f\u2028\u2029]/.test(path) &&
    (getPlatform() !== "windows" || !path.includes(":")) &&
    !splitRepoPath(path).some(
      (segment) => segment === "" || segment === "." || segment === ".." || isReservedGitPathSegment(segment),
    )
  );
}
//@ chunk-e6aww6q8.js:4785349-4785447 placement
/**
 * 判断路径段是否是 git 保留名（.git、git~1 之类）。
 */
function isReservedGitPathSegment(segment) {
  let replaced = segment.toLowerCase().replace(/[. ]+$/, "");
  return replaced === ".git" || /^git~\d+$/.test(replaced);
}
//@ chunk-e6aww6q8.js:4785447-4785679 placement
async function isRealDirectoryChain_2(dir) {
  let resolved = resolve_2(dir);
  let root = parse(resolved).root;
  let filtered = resolved
    .slice(root.length)
    .split(sep)
    .filter((segment) => segment !== "");
  let currentDir = root;
  for (let segment of filtered) {
    currentDir = join(currentDir, segment);
    let stat = await lstat(currentDir).catch(() => null);
    if (stat === null || stat.isSymbolicLink() || !stat.isDirectory()) return false;
  }
  return true;
}
//@ chunk-e6aww6q8.js:4785679-4785900 placement
async function verifyPrivateGitDir(gitDir, repoRoot, expectedFiles = expectedFilesByGitDir.get(gitDir)) {
  if (!expectedFiles) return false;
  for (let [key, value] of Object.entries(expectedFiles))
    if ((await writeFileAtomically(join(gitDir, key), SNAPSHOT_EXCLUDE_CONTENT)) !== value) return false;
  let entries = await readdir(gitDir).catch(() => null);
  if (entries === null || entries.some((entry) => !PRIVATE_GIT_DIR_ENTRIES.has(entry))) return false;
  return isSafeGitObjectsDir(repoRoot, gitDir);
}
//@ chunk-e6aww6q8.js:4785900-4785996 placement
/**
 * 私有 git 目录允许出现的顶层条目（HEAD、config、index、objects、refs 等）。
 */
var PRIVATE_GIT_DIR_ENTRIES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:4785900", () => {
  PRIVATE_GIT_DIR_ENTRIES = new Set([
    "HEAD",
    "config",
    "config.global",
    "index",
    "index.lock",
    "info",
    "objects",
    "refs",
  ]);
});
//@ chunk-e6aww6q8.js:4785996-4786092 placement
/**
 * 已知仓库的私有对象目录时按其记录校验（.git 未被替换），否则返回 false。
 */
function verifyKnownPrivateGitDir(base) {
  let expectedObjectFiles = objectsDirByGitDir.get(base.gitDirectory);
  return expectedObjectFiles
    ? verifyPrivateGitDir(base.gitDirectory, expectedObjectFiles)
    : Promise.resolve(false);
}
//@ chunk-e6aww6q8.js:4786092-4788314 placement
/**
 * 为工作区做快照：用 git status 收集改动与未跟踪文件。
 */
async function snapshotWorkingTree(repoRoot, gitDirectory, findConverted) {
  let stepTimeout = prefetchedTrees.has(gitDirectory) ? GIT_STEP_TIMEOUT_MS : GIT_INDEX_TIMEOUT_MS;
  let expectedObjectFiles = objectsDirByGitDir.get(gitDirectory);
  if (!expectedObjectFiles || !(await verifyPrivateGitDir(gitDirectory, expectedObjectFiles)))
    return abandonSharedRepo(repoRoot, gitDirectory, "alternates");
  await unlink(join(gitDirectory, "index.lock")).catch(() => {
    return;
  });
  let statusResult = await runSnapshotGit(
    repoRoot,
    gitDirectory,
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
      timeout: stepTimeout,
      env: {
        GIT_OPTIONAL_LOCKS: "1",
      },
    },
  );
  if (statusResult.code !== 0)
    return abandonSharedRepo(repoRoot, gitDirectory, `status exit ${statusResult.code}`);
  let { changed, deleted, untrackedDirectories } = parsePorcelainStatus(statusResult.stdout);
  let prefetchedTree = prefetchedTrees.get(gitDirectory);
  if (changed.length === 0 && deleted.length === 0 && untrackedDirectories.length === 0 && prefetchedTree) {
    oversizedByGitDir.delete(gitDirectory);
    return prefetchedTree;
  }
  let candidateDirs = [...untrackedDirectories];
  let parentDirCache = new Map();
  for (let deletedPath of deleted) {
    if (!(await parentDirsExist(repoRoot, deletedPath, parentDirCache))) continue;
    if ((await lstat(join(repoRoot, deletedPath)).catch(() => null))?.isDirectory())
      candidateDirs.push(`${deletedPath}/`);
  }
  for (let pathBatch of batchPathsForArgv(candidateDirs)) {
    let result = await runSnapshotGitStep(
      repoRoot,
      gitDirectory,
      ["ls-files", "-z", "--others", "--exclude-standard", "--", ...pathBatch],
      stepTimeout,
    );
    if (result.code !== 0) return abandonSharedRepo(repoRoot, gitDirectory, `ls-files exit ${result.code}`);
    changed.push(
      ...result.stdout.split("\x00").filter((path) => !path.endsWith("/") && isSafeRepoPath(path)),
    );
  }
  if (candidateDirs.length > 0 && changed.length === 0 && deleted.length === 0 && prefetchedTree) {
    oversizedByGitDir.delete(gitDirectory);
    return prefetchedTree;
  }
  let snapshottedPaths = [];
  let files = oversizedByGitDir.get(gitDirectory)?.files;
  let oversizedFiles = new Map();
  let changedOversizedCount = 0;
  let changedOversizedPaths = [];
  let sizeByPath = new Map();
  for (let changedPath of changed) {
    if (!(await parentDirsExist(repoRoot, changedPath, parentDirCache))) continue;
    let stat = await statNoFollow(join(repoRoot, changedPath));
    if (stat === "unreadable" || (typeof stat === "object" && stat.size > MAX_SNAPSHOT_FILE_BYTES)) {
      let fingerprint = typeof stat === "object" ? `${stat.size} ${stat.mtimeMs}` : "unreadable";
      oversizedFiles.set(changedPath, fingerprint);
      if (files?.get(changedPath) !== fingerprint) {
        changedOversizedCount++;
        changedOversizedPaths.push(changedPath);
      }
    } else if (stat !== "other") {
      snapshottedPaths.push(changedPath);
      if (typeof stat === "object") sizeByPath.set(changedPath, stat.size);
    }
  }
  oversizedByGitDir.set(gitDirectory, {
    files: oversizedFiles,
    changed: changedOversizedCount,
    changedPaths: changedOversizedPaths,
  });
  changed.splice(0, changed.length, ...snapshottedPaths);
  let convertedByPath = findConverted ? await findConvertedFiles(repoRoot, gitDirectory, changed) : new Map();
  let convertedFiles = convertedFilesByGitDir.get(gitDirectory) ?? [];
  let sameSizeByPath = new Map(
    convertedFiles.map((convertedFile) => [convertedFile.path, convertedFile.sameSize]),
  );
  for (let changedPath of changed) {
    let convertedSize = convertedByPath.get(changedPath);
    if (convertedSize !== undefined)
      convertedFiles.push({
        path: changedPath,
        sameSize: sizeByPath.get(changedPath) === convertedSize,
      });
    else if (sameSizeByPath.get(changedPath))
      convertedFiles.push({
        path: changedPath,
        sameSize: false,
        changedAgain: true,
      });
  }
  convertedFilesByGitDir.set(gitDirectory, convertedFiles);
  for (let [paths, updateArgs] of [
    [deleted, ["--force-remove"]],
    [changed, ["--add", "--remove"]],
  ]) {
    if (paths.length === 0) continue;
    let result = await runSnapshotGit(
      repoRoot,
      gitDirectory,
      ["update-index", ...updateArgs, "-z", "--stdin"],
      {
        timeout: stepTimeout,
        input: `${paths.join("\x00")}\x00`,
      },
    );
    if (result.code !== 0)
      return abandonSharedRepo(repoRoot, gitDirectory, `update-index exit ${result.code}`);
  }
  let result = await runSnapshotGitStep(repoRoot, gitDirectory, ["write-tree"], stepTimeout);
  let tree = result.stdout.trim();
  if (result.code !== 0 || !/^[0-9a-f]{40,64}$/.test(tree))
    return abandonSharedRepo(repoRoot, gitDirectory, `write-tree exit ${result.code}`);
  if (tree !== prefetchedTree && !(await commitSnapshotTree(repoRoot, gitDirectory, tree)))
    return abandonSharedRepo(repoRoot, gitDirectory, "commit-tree");
  prefetchedTrees.set(gitDirectory, tree);
  snapshotFailureCounts.delete(repoRoot);
  return tree;
}
//@ chunk-e6aww6q8.js:4788314-4789018 placement
/**
 * 找出索引中经换行/过滤转换后大小与对象大小不同的文件：ls-files --debug 取大小，cat-file --batch-check 对比 blob 大小。
 */
async function findConvertedFiles(repoRoot, gitDirectory, paths) {
  let sizeByPath = new Map();
  let [pathBatch = []] = batchPathsForArgv(paths);
  if (pathBatch.length === 0) return sizeByPath;
  let result = await runSnapshotGitStep(repoRoot, gitDirectory, [
    "ls-files",
    "-z",
    "--stage",
    "--debug",
    "--",
    ...pathBatch,
  ]);
  if (result.code !== 0) {
    logForDebugging(`bashEditDiff: converted-file check: ls-files exit ${result.code}`);
    return sizeByPath;
  }
  let stageEntries = [
    ...result.stdout.matchAll(/^\d{6} ([0-9a-f]{40,64}) 0\t([^\0]+)\0[^]*?\n {2}size: (\d+)\t/gm),
  ];
  if (stageEntries.length === 0) return sizeByPath;
  let catFileResult = await runSnapshotGit(repoRoot, gitDirectory, ["cat-file", "--batch-check"], {
    timeout: GIT_STEP_TIMEOUT_MS,
    input: `${stageEntries.map((stageEntry) => stageEntry[1]).join(`
`)}
`,
  });
  if (catFileResult.code !== 0) {
    logForDebugging(`bashEditDiff: converted-file check: cat-file exit ${catFileResult.code}`);
    return sizeByPath;
  }
  let lines = catFileResult.stdout.split(`
`);
  for (let [idx, stageEntry] of stageEntries.entries()) {
    let [, objectType, objectSize] = (lines[idx] ?? "").split(" ");
    if (objectType === "blob" && stageEntry[3] !== "0" && objectSize !== stageEntry[3])
      sizeByPath.set(stageEntry[2], Number(stageEntry[3]));
  }
  return sizeByPath;
}
//@ chunk-e6aww6q8.js:4789018-4789190 placement
function* batchPathsForArgv(paths) {
  let batch = [];
  let batchChars = 0;
  for (let path of paths) {
    let pathChars =
      Buffer.byteLength(path) + 3 + countCharInString(path, '"') + countCharInString(path, "\\");
    if (batch.length > 0 && batchChars + pathChars > MAX_PATHS_BATCH_CHARS) {
      yield batch;
      batch = [];
      batchChars = 0;
    }
    batch.push(path);
    batchChars += pathChars;
  }
  if (batch.length > 0) yield batch;
}
//@ chunk-e6aww6q8.js:4789190-4789389 placement
function abandonSharedRepo(repoRoot, gitDirectory, reason) {
  logForDebugging(`bashEditDiff: ${reason}`);
  if (!expectedFilesByGitDir.has(gitDirectory)) return null;
  sharedRepoByRoot.delete(repoRoot);
  prefetchedTrees.delete(gitDirectory);
  oversizedByGitDir.delete(gitDirectory);
  expectedFilesByGitDir.delete(gitDirectory);
  recordSnapshotFailure(repoRoot);
  Promise.all([serialChainByRepo.get(repoRoot), serialChainByRepo.get(diffSerialKey(repoRoot))]).then(() =>
    removePrivateGitDir(gitDirectory),
  );
  return null;
}
//@ chunk-e6aww6q8.js:4789389-4789621 placement
async function removePrivateGitDir(gitDirectory) {
  try {
    let identity = privateDirIdentity.get(gitDirectory);
    if (identity === undefined) return;
    if (await getFileIdentity_9(gitDirectory, identity))
      await rm_2(gitDirectory, {
        recursive: true,
        force: true,
      });
    objectsDirByGitDir.delete(gitDirectory);
    privateDirIdentity.delete(gitDirectory);
    convertedFilesByGitDir.delete(gitDirectory);
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
async function statNoFollow(path) {
  let handle;
  try {
    handle = await open(
      path,
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
    let stats = await handle.stat();
    return stats.isFile()
      ? {
          size: stats.size,
          mtimeMs: stats.mtimeMs,
        }
      : "other";
  } catch {
    return "other";
  } finally {
    await handle.close();
  }
}
//@ chunk-e6aww6q8.js:4790168-4790376 placement
async function parentDirsExist(repoRoot, path, existsCache) {
  let segments = splitRepoPath(path);
  let currentDir = repoRoot;
  for (let segment of segments.slice(0, -1)) {
    currentDir = join(currentDir, segment);
    let exists = existsCache.get(currentDir);
    if (exists === undefined) {
      let stat = await lstat(currentDir).catch(() => null);
      exists = stat !== null && stat.isDirectory();
      existsCache.set(currentDir, exists);
    }
    if (!exists) return false;
  }
  return true;
}
//@ chunk-e6aww6q8.js:4790376-4790537 placement
function isEmptyBlobId(blobId) {
  return (
    "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391".startsWith(blobId) ||
    "473a0f4c3be8a93681a267e3b1e9a7dcda1185436fe141f7749120a303721813".startsWith(blobId)
  );
}
//@ chunk-e6aww6q8.js:4790537-4790958 placement
/**
 * 解析 git status --porcelain=v2 -z 输出：变更/未跟踪文件、已删除文件、未跟踪目录（只保留安全路径）。
 */
function parsePorcelainStatus(stdout) {
  let changed = [];
  let deleted = [];
  let untrackedDirectories = [];
  for (let entry of stdout.split("\x00"))
    if (entry.startsWith("? ")) {
      let isDirectory = entry.endsWith("/");
      let path = isDirectory ? entry.slice(2, -1) : entry.slice(2);
      if (isSafeRepoPath(path)) (isDirectory ? untrackedDirectories : changed).push(entry.slice(2));
    } else if (entry.startsWith("1 ") || entry.startsWith("u ")) {
      let fieldCount = entry.startsWith("1 ") ? 9 : 11;
      let pathStart = 0;
      for (let idx = 0; idx < fieldCount - 1; idx++) pathStart = entry.indexOf(" ", pathStart) + 1;
      let sliced = entry.slice(pathStart);
      if (entry[3] === "." || !isSafeRepoPath(sliced)) continue;
      (entry[3] === "D" ? deleted : changed).push(sliced);
    }
  return {
    changed,
    deleted,
    untrackedDirectories,
  };
}
//@ chunk-e6aww6q8.js:4790958-4791546 placement
async function commitSnapshotTree(repoRoot, gitDirectory, tree, timeout = GIT_STEP_TIMEOUT_MS) {
  let result = await runSnapshotGit(repoRoot, gitDirectory, ["commit-tree", tree, "-m", "snapshot"], {
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
  let trimmed = result.stdout.trim();
  if (result.code !== 0 || !/^[0-9a-f]{40,64}$/.test(trimmed)) return false;
  try {
    let refHandle = await open(
      join(gitDirectory, "refs", "heads", "main"),
      constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | constants.O_NOFOLLOW,
      384,
    );
    try {
      await refHandle.writeFile(`${trimmed}
`);
    } finally {
      await refHandle.close();
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
function runSnapshotGitStep(repoRoot, gitDirectory, args, timeout = GIT_STEP_TIMEOUT_MS) {
  return runSnapshotGit(repoRoot, gitDirectory, args, {
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
        (arg) => options.literalPathspecs !== false || arg !== "--literal-pathspecs",
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
  let isShared = isSharedSnapshotEnabled();
  let abortController = new AbortController();
  let retriesLeft = DIFF_RETRY_COUNT;
  let retryTimer;
  let armRetry = () => {
    if (retriesLeft-- > 0) retryTimer = setImmediate(armRetry);
    else abortController.abort();
  };
  let startTimer = isShared ? setTimeout(armRetry, options.timeout) : undefined;
  try {
    let result = await execFileNoThrowWithCwd(snapshotGitEnv.file, snapshotGitEnv.args, {
      cwd: repoRoot,
      ...(isShared
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
    let isTimedOut = abortController.signal.aborted && result.exitCode === undefined;
    if (result.maxBufferExceeded) abortController.abort();
    return isTimedOut
      ? {
          ...result,
          timedOut: true,
        }
      : result;
  } finally {
    clearTimeout(startTimer);
    clearImmediate(retryTimer);
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
function getSnapshotGitEnv(gitDirectory, repoRoot) {
  return {
    ...getRemoteHostSessionCount({
      GIT_DIR: gitDirectory,
      GIT_WORK_TREE: repoRoot,
      GIT_CONFIG_GLOBAL: join(gitDirectory, "config.global"),
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
export {
  commandMovesWorkTree,
  isRepoSnapshotGivenUp,
  takeBashSnapshot,
  isSharedSnapshotEnabled,
  registerConcurrentCommand,
  unregisterConcurrentCommand,
  diffAfterCommand,
  logEditDiffWait,
  listIgnoredFiles,
  resolveThroughRoot,
  isDirectoryIgnored,
  verifyKnownPrivateGitDir,
  isSafeRepoPath,
  findConvertedFiles,
  runSnapshotGit,
  getSnapshotGitArgs,
  getSnapshotGitEnv,
  commandMovesWorkTree_2,
};
