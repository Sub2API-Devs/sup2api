/**
 * bridge/worktreeState.ts
 *
 * 2.1.316 新增。在超时内收集工作树状态（分支、未推送提交、改动、进行中操作、子模块），供 teleport 到云端前检查。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-tmkr83ys.js (18)
 * attribution: placement 14, layout 3, sole-consumer 1
 */
import { resolve, join } from "path";
import { lstat, open } from "fs/promises";
import { sleep } from "../utils/sleep.js";
import { findGitRootRecheckingNegative, getGitDir, gitExe } from "../utils/git.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { logForDebugging } from "../utils/debug.js";
import { errorMessage, isENOENT } from "../utils/errors.js";
import { getGitRepoCache } from "../utils/git/gitRepoCache.js";
import { execFileNoThrowWithCwd } from "../utils/execFileNoThrow.js";
import { GIT_SAFE_GLOBAL_ARGS, IGNORE_SUBMODULES_DIRTY_FLAG } from "../utils/git/gitSafeEnv.js";
import { buildGitEnvForRepo } from "../utils/git/gitDirResolution.js";
import {
  buildFilterNeutralizingArgs,
  findExistingRefs,
  SEQUENCER_STATE_FILES,
} from "../utils/git/gitConfigFilters.js";
import { listGitlinkEntries, inspectSubmodules } from "../utils/git/submoduleInspection.js";
import { reconcileSparseCheckout } from "../utils/plugins/marketplaceManager.js";

//@ chunk-tmkr83ys.js:674-692 placement
var WORKTREE_COLLECT_TIMEOUT_MS = 1e4;
var SUBMODULE_CHECK_RESERVE_MS = 500;
//@ chunk-tmkr83ys.js:692-866 placement
async function withCollectTimeout(promise, timeoutMs = WORKTREE_COLLECT_TIMEOUT_MS) {
  let abortController = new AbortController();
  try {
    return await Promise.race([
      promise,
      sleep(timeoutMs, abortController.signal).then(() => {
        throw Error("worktree probe timed out");
      }),
    ]);
  } finally {
    abortController.abort();
  }
}
//@ chunk-tmkr83ys.js:866-969 placement
/**
 * “索引把某文件从 git status 里藏起来”的错误类型（带 bit）。
 */
class UnseenBehindIndexBitError extends Error {
  bit;
  constructor(bit) {
    super("the index hides a file from git status");
    this.bit = bit;
  }
}
//@ chunk-tmkr83ys.js:969-1306 placement
/**
 * 在超时内收集工作树状态（分支、未推送提交、改动、进行中操作、子模块），供 teleport 到云端前检查。
 */
async function collectWorktreeState(originalCwd, branch, timeoutMs = WORKTREE_COLLECT_TIMEOUT_MS) {
  let worktreePath = findGitRootRecheckingNegative(originalCwd);
  if (!worktreePath) return null;
  try {
    let state = await collectWorktreeStateAt(worktreePath, branch, timeoutMs, {});
    if (state.submodules_unverified) logFeatureSad("bridge_worktree_state", "submodules_unverifiable");
    else logFeatureOk("bridge_worktree_state");
    return state;
  } catch (error) {
    logFeatureBad("bridge_worktree_state", "collect_failed");
    logForDebugging(`[bridge:worktree] collectWorktreeState failed: ${errorMessage(error)}`);
    return null;
  }
}
//@ chunk-tmkr83ys.js:1306-1364 placement
/**
 * 收集工作树状态并附超时截止时间。
 */
function collectWorktreeStateAt(worktreePath, branch, timeoutMs, deps) {
  return withCollectTimeout(
    collectWorktreeStateUnbounded(worktreePath, branch, Date.now() + timeoutMs, deps),
    timeoutMs,
  );
}
//@ chunk-tmkr83ys.js:1364-1866 placement
/**
 * 并行收集分支、未推送、改动、进行中操作、子模块状态
 */
async function collectWorktreeStateUnbounded(cwd, branch, deadlineMs, signal) {
  let gitDir = await getGitDir(cwd);
  if (!gitDir) {
    getGitRepoCache().gitDirByCwd.delete(resolve(cwd));
    gitDir = await getGitDir(cwd);
  }
  if (!gitDir) throw Error("getGitDir returned null \u2014 cannot verify worktree state");
  let [headCommit, unpushed, dirtyState, inProgressOperation, hasSubmodules, hasLfs] = await Promise.all([
    readHeadCommit(cwd, signal),
    countUnpushedCommits(cwd, branch, signal),
    detectDirtyState(cwd, deadlineMs, signal),
    detectInProgressOperation(cwd, gitDir, signal),
    pathExistsAsFileOrDir(join(cwd, ".gitmodules")),
    hasFilterAttributes(cwd),
  ]);
  return {
    branch,
    head_sha: headCommit,
    unpushed_count: unpushed.count,
    is_dirty: dirtyState.dirty,
    upstream_exists: unpushed.upstreamExists,
    mid_operation: inProgressOperation,
    has_submodules: hasSubmodules,
    submodules_unverified: dirtyState.submodulesUnverified,
    has_lfs: hasLfs,
    reported_at: new Date().toISOString(),
  };
}
//@ chunk-tmkr83ys.js:1866-1880 placement
var WORKTREE_GIT_MAX_BUFFER = 4194304;
//@ chunk-tmkr83ys.js:1880-2062 placement
/**
 * 在工作树里运行 git（安全环境、超时）
 */
function runGit(ctx, cwd, args, { userLocale } = {}) {
  return execFileNoThrowWithCwd(ctx.git ?? gitExe(), [...GIT_SAFE_GLOBAL_ARGS, ...args], {
    cwd,
    env: {
      ...buildGitEnvForRepo(cwd, ctx.gitEnvPins, {
        userLocale,
      }),
      ..._(ctx),
    },
    preserveOutputOnError: false,
    maxBuffer: WORKTREE_GIT_MAX_BUFFER,
    timeout: 1e4,
  });
}
//@ chunk-tmkr83ys.js:2062-2213 layout
var SPARSE_CHECKOUT_CONFIG_ARGS = [
  "-c",
  "core.sparseCheckout=true",
  "-c",
  "sparse.expectFilesOutsideOfPatterns=false",
];
var STAT_CACHE_CONFIG_ARGS = ["-c", "core.trustctime=true", "-c", "core.checkStat=default"];
//@ chunk-tmkr83ys.js:2213-2322 layout
function buildExcludePathspecs({ statusLeavesOut: worktreeInfo = [] }) {
  return worktreeInfo.length === 0
    ? []
    : ["--", ".", ...worktreeInfo.map((excludedPath) => `:(exclude,literal)${excludedPath}`)];
}
//@ chunk-tmkr83ys.js:2322-2410 layout
function _({ unsetInGitChildren = [] }) {
  return Object.fromEntries(unsetInGitChildren.map((unsetInGitChild) => [unsetInGitChild, undefined]));
}
//@ chunk-tmkr83ys.js:2410-2516 placement
async function readHeadCommit(cwd, gitContext) {
  let { code, stdout } = await runGit(gitContext, cwd, ["rev-parse", "HEAD"]);
  return code === 0 ? stdout.trim() : null;
}
//@ chunk-tmkr83ys.js:2516-2957 placement
/**
 * 统计相对 origin/<branch> 未推送的提交数
 */
async function countUnpushedCommits(cwd, branch, gitContext) {
  if (!branch)
    return {
      count: null,
      upstreamExists: false,
    };
  let upstreamRef = `refs/remotes/origin/${branch}`;
  let verifyResult = await runGit(gitContext, cwd, [
    "rev-parse",
    "--verify",
    "--quiet",
    `${upstreamRef}^{commit}`,
  ]);
  if (verifyResult.code !== 0 || !verifyResult.stdout.trim())
    return {
      count: null,
      upstreamExists: false,
    };
  let { code, stdout } = await runGit(gitContext, cwd, ["rev-list", "--count", `${upstreamRef}..HEAD`]);
  if (code !== 0)
    return {
      count: null,
      upstreamExists: false,
    };
  let count = parseInt(stdout.trim(), 10);
  return {
    count: Number.isFinite(count) ? count : null,
    upstreamExists: true,
  };
}
//@ chunk-tmkr83ys.js:2957-4813 sole-consumer
async function detectDirtyState(cwd, deadlineMs, sparsePaths) {
  let filterNeutralizingArgs = await buildFilterNeutralizingArgs(cwd, {
    envPins: sparsePaths.gitEnvPins,
    run: (args, execOptions) =>
      execFileNoThrowWithCwd(sparsePaths.git ?? gitExe(), args, {
        ...execOptions,
        env: {
          ...execOptions.env,
          ..._(sparsePaths),
        },
        stdin: "ignore",
      }),
  });
  if (!filterNeutralizingArgs.ok) throw Error("repository config could not be vetted");
  let sparseConfigArgs = sparsePaths.looksBehindIndexBits === true ? SPARSE_CHECKOUT_CONFIG_ARGS : [];
  let { code, stdout } = await runGit(
    sparsePaths,
    cwd,
    [
      ...filterNeutralizingArgs.args,
      ...sparseConfigArgs,
      ...(sparsePaths.looksBehindIndexBits === true ? STAT_CACHE_CONFIG_ARGS : []),
      "--no-optional-locks",
      "status",
      "--porcelain",
      "-unormal",
      IGNORE_SUBMODULES_DIRTY_FLAG,
      ...buildExcludePathspecs(sparsePaths),
    ],
    {
      userLocale: true,
    },
  );
  if (code !== 0) throw Error("git status failed");
  if (stdout.trim().length > 0)
    return {
      dirty: true,
      submodulesUnverified: false,
    };
  if (sparsePaths.ignoresByTheTreeAlone === true) {
    let untrackedResult = await runGit(sparsePaths, cwd, [
      "ls-files",
      "--others",
      "--exclude-per-directory=.gitignore",
      "--directory",
      "--no-empty-directory",
      ...buildExcludePathspecs(sparsePaths),
    ]);
    if (untrackedResult.code !== 0) throw Error("git ls-files failed");
    if (untrackedResult.stdout.trim().length > 0)
      return {
        dirty: true,
        submodulesUnverified: false,
      };
  }
  if (sparsePaths.entersSubmodules === false) {
    let gitlinkOptions =
      sparsePaths.looksBehindIndexBits === true
        ? {
            assumeUnchanged: false,
            skipWorktree: false,
          }
        : undefined;
    let gitlinkEntries = await listGitlinkEntries(
      cwd,
      {
        git: sparsePaths.git,
        repository: sparseConfigArgs,
        env: {
          ...buildGitEnvForRepo(cwd, sparsePaths.gitEnvPins),
          ..._(sparsePaths),
        },
        deadlineMs: Math.max(1, deadlineMs - Date.now()),
      },
      gitlinkOptions,
    );
    if (gitlinkOptions?.assumeUnchanged === true) throw new UnseenBehindIndexBitError("assume_unchanged");
    if (gitlinkOptions?.skipWorktree === true && !(await reconcileSparseCheckout(cwd, sparsePaths)))
      throw new UnseenBehindIndexBitError("skip_worktree");
    let isDirty =
      typeof gitlinkEntries === "string" ||
      gitlinkEntries.length > 0 ||
      (await pathExistsAsFileOrDir(join(cwd, ".gitmodules")));
    return {
      dirty: isDirty,
      submodulesUnverified: isDirty,
    };
  }
  let submoduleReport = await inspectSubmodules(cwd, {
    deadlineMs: Math.max(0, deadlineMs - Date.now() - SUBMODULE_CHECK_RESERVE_MS),
  });
  if (submoduleReport.kind === "verified")
    return {
      dirty: submoduleReport.withTrackedChanges.length + submoduleReport.withUntrackedFiles.length > 0,
      submodulesUnverified: false,
    };
  switch (submoduleReport.reason) {
    case "unreadable":
      throw Error("submodule state unreadable \u2014 cannot verify worktree is clean");
    case "nested_submodules":
    case "too_many":
    case "nested_repository":
    case "unconfigured_gitlink":
    case "gitdir_outside_modules":
    case "timeout":
      logForDebugging(
        `[bridge:worktree] submodules could not be inspected (${submoduleReport.reason}); reporting is_dirty=true, submodules_unverified=true`,
        {
          level: "warn",
        },
      );
      return {
        dirty: true,
        submodulesUnverified: true,
      };
  }
}
//@ chunk-tmkr83ys.js:5026-5137 placement
async function pathExistsAsFileOrDir(path) {
  try {
    let stats = await lstat(path);
    return stats.isFile() || stats.isDirectory();
  } catch (error) {
    if (isENOENT(error)) return false;
    throw error;
  }
}
//@ chunk-tmkr83ys.js:5137-5332 placement
/**
 * rebase/merge/cherry-pick 等进行中状态文件表
 */
var IN_PROGRESS_STATE_FILES = [
  ["rebase-merge", "rebase"],
  ["rebase-apply", "rebase"],
  ["MERGE_HEAD", "merge"],
  ["CHERRY_PICK_HEAD", "cherry-pick"],
  ["REVERT_HEAD", "revert"],
  ["BISECT_LOG", "bisect"],
  ["sequencer", "cherry-pick"],
];
//@ chunk-tmkr83ys.js:5332-5679 placement
/**
 * 检测进行中的 rebase/merge/cherry-pick 等
 */
async function detectInProgressOperation(cwd, gitDir, gitContext) {
  let foundIndex = (
    await Promise.all(
      IN_PROGRESS_STATE_FILES.map(([fileName]) => pathExistsAsFileOrDir(join(gitDir, fileName))),
    )
  ).indexOf(true);
  if (foundIndex !== -1) return IN_PROGRESS_STATE_FILES[foundIndex][1];
  let existingRefs = await findExistingRefs(
    gitDir,
    SEQUENCER_STATE_FILES,
    async (args) => (await runGit(gitContext, cwd, args)).exitCode,
  );
  if (existingRefs === null) throw Error("git could not say whether a cherry-pick or revert is in progress");
  return existingRefs.has("CHERRY_PICK_HEAD")
    ? "cherry-pick"
    : existingRefs.has("REVERT_HEAD")
      ? "revert"
      : null;
}
//@ chunk-tmkr83ys.js:5679-6010 placement
/**
 * .gitattributes 是否声明 filter
 */
async function hasFilterAttributes(cwd) {
  let path = join(cwd, ".gitattributes");
  try {
    if (!(await lstat(path)).isFile()) return false;
  } catch (error) {
    if (isENOENT(error)) return false;
    throw error;
  }
  let handle;
  try {
    handle = await open(path, "r");
    let { buffer, bytesRead } = await handle.read(Buffer.alloc(65536), 0, 65536, 0);
    return buffer.toString("utf8", 0, bytesRead).includes("filter=lfs");
  } catch (error) {
    if (isENOENT(error)) return false;
    throw error;
  } finally {
    await handle?.close();
  }
}
export {
  runGit,
  collectWorktreeState,
  withCollectTimeout,
  UnseenBehindIndexBitError,
  collectWorktreeStateAt,
  WORKTREE_COLLECT_TIMEOUT_MS,
};
