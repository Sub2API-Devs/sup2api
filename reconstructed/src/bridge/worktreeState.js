/**
 * bridge/worktreeState.ts
 *
 * 2.1.316 新增。在超时内收集工作树状态（分支、未推送提交、改动、进行中操作、子模块），供 teleport 到云端前检查。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8hayd0gw.js (13)
 * attribution: placement 13
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
import { inspectSubmodules } from "../utils/git/submoduleInspection.js";

//@ chunk-8hayd0gw.js:661-679 placement
var WORKTREE_COLLECT_TIMEOUT_MS = 1e4;
var SUBMODULE_CHECK_RESERVE_MS = 500;
//@ chunk-8hayd0gw.js:679-853 placement
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
//@ chunk-8hayd0gw.js:853-1203 placement
/**
 * 在超时内收集工作树状态（分支、未推送提交、改动、进行中操作、子模块），供 teleport 到云端前检查。
 */
async function collectWorktreeState(originalCwd, branch, timeoutMs = WORKTREE_COLLECT_TIMEOUT_MS) {
  let gitRootRecheckingNegative = findGitRootRecheckingNegative(originalCwd);
  if (!gitRootRecheckingNegative) return null;
  try {
    let state = await withCollectTimeout(
      collectWorktreeStateUnbounded(gitRootRecheckingNegative, branch, Date.now() + timeoutMs),
      timeoutMs,
    );
    if (state.submodules_unverified) logFeatureSad("bridge_worktree_state", "submodules_unverifiable");
    else logFeatureOk("bridge_worktree_state");
    return state;
  } catch (error) {
    logFeatureBad("bridge_worktree_state", "collect_failed");
    logForDebugging(`[bridge:worktree] collectWorktreeState failed: ${errorMessage(error)}`);
    return null;
  }
}
//@ chunk-8hayd0gw.js:1203-1693 placement
/**
 * 并行收集分支、未推送、改动、进行中操作、子模块状态
 */
async function collectWorktreeStateUnbounded(cwd, branch, deadlineMs) {
  let gitDir = await getGitDir(cwd);
  if (!gitDir) {
    getGitRepoCache().gitDirByCwd.delete(resolve(cwd));
    gitDir = await getGitDir(cwd);
  }
  if (!gitDir) throw Error("getGitDir returned null \u2014 cannot verify worktree state");
  let [headCommit, unpushed, worktreeStatus, inProgressOperation, hasSubmodules, hasLfs] = await Promise.all([
    readHeadCommit(cwd),
    countUnpushedCommits(cwd, branch),
    readWorktreeStatus(cwd, deadlineMs),
    detectInProgressOperation(cwd, gitDir),
    pathExistsAsFileOrDir(join(cwd, ".gitmodules")),
    hasFilterAttributes(cwd),
  ]);
  return {
    branch,
    head_sha: headCommit,
    unpushed_count: unpushed.count,
    is_dirty: worktreeStatus.dirty,
    upstream_exists: unpushed.upstreamExists,
    mid_operation: inProgressOperation,
    has_submodules: hasSubmodules,
    submodules_unverified: worktreeStatus.submodulesUnverified,
    has_lfs: hasLfs,
    reported_at: new Date().toISOString(),
  };
}
//@ chunk-8hayd0gw.js:1693-1707 placement
var WORKTREE_GIT_MAX_BUFFER = 4194304;
//@ chunk-8hayd0gw.js:1707-1859 placement
/**
 * 在工作树里运行 git（安全环境、超时）
 */
function runWorktreeGit(cwd, args, { userLocale } = {}) {
  return execFileNoThrowWithCwd(gitExe(), [...GIT_SAFE_GLOBAL_ARGS, ...args], {
    cwd,
    env: buildGitEnvForRepo(cwd, undefined, {
      userLocale,
    }),
    preserveOutputOnError: false,
    maxBuffer: WORKTREE_GIT_MAX_BUFFER,
    timeout: 1e4,
  });
}
//@ chunk-8hayd0gw.js:1859-1959 placement
async function readHeadCommit(cwd) {
  let { code, stdout } = await runWorktreeGit(cwd, ["rev-parse", "HEAD"]);
  return code === 0 ? stdout.trim() : null;
}
//@ chunk-8hayd0gw.js:1959-2390 placement
/**
 * 统计相对 origin/<branch> 未推送的提交数
 */
async function countUnpushedCommits(cwd, branch) {
  if (!branch)
    return {
      count: null,
      upstreamExists: false,
    };
  let upstreamRef = `refs/remotes/origin/${branch}`;
  let verifyResult = await runWorktreeGit(cwd, [
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
  let { code, stdout } = await runWorktreeGit(cwd, ["rev-list", "--count", `${upstreamRef}..HEAD`]);
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
//@ chunk-8hayd0gw.js:2390-3323 placement
/**
 * git status --porcelain 读取工作树改动
 */
async function readWorktreeStatus(cwd, deadlineMs) {
  let filterNeutralizingArgs = await buildFilterNeutralizingArgs(cwd);
  if (!filterNeutralizingArgs.ok) throw Error("repository config could not be vetted");
  let { code, stdout } = await runWorktreeGit(
    cwd,
    [
      ...filterNeutralizingArgs.args,
      "--no-optional-locks",
      "status",
      "--porcelain",
      "-unormal",
      IGNORE_SUBMODULES_DIRTY_FLAG,
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
  let submodules = await inspectSubmodules(cwd, {
    deadlineMs: Math.max(0, deadlineMs - Date.now() - SUBMODULE_CHECK_RESERVE_MS),
  });
  if (submodules.kind === "verified")
    return {
      dirty: submodules.withTrackedChanges.length + submodules.withUntrackedFiles.length > 0,
      submodulesUnverified: false,
    };
  switch (submodules.reason) {
    case "unreadable":
      throw Error("submodule state unreadable \u2014 cannot verify worktree is clean");
    case "nested_submodules":
    case "too_many":
    case "nested_repository":
    case "unconfigured_gitlink":
    case "gitdir_outside_modules":
    case "timeout":
      logForDebugging(
        `[bridge:worktree] submodules could not be inspected (${submodules.reason}); reporting is_dirty=true, submodules_unverified=true`,
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
//@ chunk-8hayd0gw.js:3323-3434 placement
async function pathExistsAsFileOrDir(path) {
  try {
    let stats = await lstat(path);
    return stats.isFile() || stats.isDirectory();
  } catch (error) {
    if (isENOENT(error)) return false;
    throw error;
  }
}
//@ chunk-8hayd0gw.js:3434-3629 placement
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
//@ chunk-8hayd0gw.js:3629-3970 placement
/**
 * 检测进行中的 rebase/merge/cherry-pick 等
 */
async function detectInProgressOperation(cwd, cwd_2) {
  let index = (
    await Promise.all(
      IN_PROGRESS_STATE_FILES.map(([fileName]) => pathExistsAsFileOrDir(join(cwd_2, fileName))),
    )
  ).indexOf(true);
  if (index !== -1) return IN_PROGRESS_STATE_FILES[index][1];
  let existingRefs = await findExistingRefs(
    cwd_2,
    SEQUENCER_STATE_FILES,
    async (args) => (await runWorktreeGit(cwd, args)).exitCode,
  );
  if (existingRefs === null) throw Error("git could not say whether a cherry-pick or revert is in progress");
  return existingRefs.has("CHERRY_PICK_HEAD")
    ? "cherry-pick"
    : existingRefs.has("REVERT_HEAD")
      ? "revert"
      : null;
}
//@ chunk-8hayd0gw.js:3970-4301 placement
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
export { collectWorktreeState, withCollectTimeout, WORKTREE_COLLECT_TIMEOUT_MS };
