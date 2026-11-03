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
import { freeze, lb } from "../utils/git/gitSafeEnv.js";
import { buildGitEnvForRepo } from "../utils/git/gitDirResolution.js";
import { buildFilterNeutralizingArgs, findExistingRefs, qot } from "../utils/git/gitConfigFilters.js";
import { inspectSubmodules } from "../utils/git/submoduleInspection.js";

//@ chunk-8hayd0gw.js:661-679 placement
var WORKTREE_COLLECT_TIMEOUT_MS = 1e4,
  v = 500;
//@ chunk-8hayd0gw.js:679-853 placement
async function withCollectTimeout(e, r = WORKTREE_COLLECT_TIMEOUT_MS) {
  let abortController = new AbortController();
  try {
    return await Promise.race([
      e,
      sleep(r, abortController.signal).then(() => {
        throw Error("worktree probe timed out");
      }),
    ]);
  } finally {
    abortController.abort();
  }
}
/**
 * 在超时内收集工作树状态（分支、未推送提交、改动、进行中操作、子模块），供 teleport 到云端前检查。
 */
//@ chunk-8hayd0gw.js:853-1203 placement
async function collectWorktreeState(e, r, s = WORKTREE_COLLECT_TIMEOUT_MS) {
  let i = findGitRootRecheckingNegative(e);
  if (!i) return null;
  try {
    let n = await withCollectTimeout(collectWorktreeStateUnbounded(i, r, Date.now() + s), s);
    if (n.submodules_unverified) logFeatureSad("bridge_worktree_state", "submodules_unverifiable");
    else logFeatureOk("bridge_worktree_state");
    return n;
  } catch (error) {
    return (
      logFeatureBad("bridge_worktree_state", "collect_failed"),
      logForDebugging(`[bridge:worktree] collectWorktreeState failed: ${errorMessage(error)}`),
      null
    );
  }
}
/**
 * 并行收集分支、未推送、改动、进行中操作、子模块状态
 */
//@ chunk-8hayd0gw.js:1203-1693 placement
async function collectWorktreeStateUnbounded(e, r, s) {
  let i = await getGitDir(e);
  if (!i) (getGitRepoCache().gitDirByCwd.delete(resolve(e)), (i = await getGitDir(e)));
  if (!i) throw Error("getGitDir returned null \u2014 cannot verify worktree state");
  let [n, o, a, b, h, w] = await Promise.all([
    readHeadCommit(e),
    countUnpushedCommits(e, r),
    readWorktreeStatus(e, s),
    detectInProgressOperation(e, i),
    pathExistsAsFileOrDir(join(e, ".gitmodules")),
    hasFilterAttributes(e),
  ]);
  return {
    branch: r,
    head_sha: n,
    unpushed_count: o.count,
    is_dirty: a.dirty,
    upstream_exists: o.upstreamExists,
    mid_operation: b,
    has_submodules: h,
    submodules_unverified: a.submodulesUnverified,
    has_lfs: w,
    reported_at: new Date().toISOString(),
  };
}
//@ chunk-8hayd0gw.js:1693-1707 placement
var T = 4194304;
/**
 * 在工作树里运行 git（安全环境、超时）
 */
//@ chunk-8hayd0gw.js:1707-1859 placement
function runWorktreeGit(e, r, { userLocale: s } = {}) {
  return execFileNoThrowWithCwd(gitExe(), [...freeze, ...r], {
    cwd: e,
    env: buildGitEnvForRepo(e, void 0, { userLocale: s }),
    preserveOutputOnError: !1,
    maxBuffer: T,
    timeout: 1e4,
  });
}
//@ chunk-8hayd0gw.js:1859-1959 placement
async function readHeadCommit(cwd) {
  let { code: code, stdout: stdout } = await runWorktreeGit(cwd, ["rev-parse", "HEAD"]);
  return code === 0 ? stdout.trim() : null;
}
/**
 * 统计相对 origin/<branch> 未推送的提交数
 */
//@ chunk-8hayd0gw.js:1959-2390 placement
async function countUnpushedCommits(e, r) {
  if (!r) return { count: null, upstreamExists: !1 };
  let s = `refs/remotes/origin/${r}`,
    i = await runWorktreeGit(e, ["rev-parse", "--verify", "--quiet", `${s}^{commit}`]);
  if (i.code !== 0 || !i.stdout.trim()) return { count: null, upstreamExists: !1 };
  let { code: code, stdout: stdout } = await runWorktreeGit(e, ["rev-list", "--count", `${s}..HEAD`]);
  if (code !== 0) return { count: null, upstreamExists: !1 };
  let a = parseInt(stdout.trim(), 10);
  return { count: Number.isFinite(a) ? a : null, upstreamExists: !0 };
}
/**
 * git status --porcelain 读取工作树改动
 */
//@ chunk-8hayd0gw.js:2390-3323 placement
async function readWorktreeStatus(e, r) {
  let s = await buildFilterNeutralizingArgs(e);
  if (!s.ok) throw Error("repository config could not be vetted");
  let { code: code, stdout: stdout } = await runWorktreeGit(
    e,
    [...s.args, "--no-optional-locks", "status", "--porcelain", "-unormal", lb],
    { userLocale: !0 },
  );
  if (code !== 0) throw Error("git status failed");
  if (stdout.trim().length > 0) return { dirty: !0, submodulesUnverified: !1 };
  let o = await inspectSubmodules(e, { deadlineMs: Math.max(0, r - Date.now() - v) });
  if (o.kind === "verified")
    return { dirty: o.withTrackedChanges.length + o.withUntrackedFiles.length > 0, submodulesUnverified: !1 };
  switch (o.reason) {
    case "unreadable":
      throw Error("submodule state unreadable \u2014 cannot verify worktree is clean");
    case "nested_submodules":
    case "too_many":
    case "nested_repository":
    case "unconfigured_gitlink":
    case "gitdir_outside_modules":
    case "timeout":
      return (
        logForDebugging(
          `[bridge:worktree] submodules could not be inspected (${o.reason}); reporting is_dirty=true, submodules_unverified=true`,
          { level: "warn" },
        ),
        { dirty: !0, submodulesUnverified: !0 }
      );
  }
}
//@ chunk-8hayd0gw.js:3323-3434 placement
async function pathExistsAsFileOrDir(path) {
  try {
    let r = await lstat(path);
    return r.isFile() || r.isDirectory();
  } catch (error) {
    if (isENOENT(error)) return !1;
    throw error;
  }
}
/**
 * rebase/merge/cherry-pick 等进行中状态文件表
 */
//@ chunk-8hayd0gw.js:3434-3629 placement
var IN_PROGRESS_STATE_FILES = [
  ["rebase-merge", "rebase"],
  ["rebase-apply", "rebase"],
  ["MERGE_HEAD", "merge"],
  ["CHERRY_PICK_HEAD", "cherry-pick"],
  ["REVERT_HEAD", "revert"],
  ["BISECT_LOG", "bisect"],
  ["sequencer", "cherry-pick"],
];
/**
 * 检测进行中的 rebase/merge/cherry-pick 等
 */
//@ chunk-8hayd0gw.js:3629-3970 placement
async function detectInProgressOperation(e, r) {
  let index = (
    await Promise.all(IN_PROGRESS_STATE_FILES.map(([o]) => pathExistsAsFileOrDir(join(r, o))))
  ).indexOf(!0);
  if (index !== -1) return IN_PROGRESS_STATE_FILES[index][1];
  let n = await findExistingRefs(r, qot, async (o) => (await runWorktreeGit(e, o)).exitCode);
  if (n === null) throw Error("git could not say whether a cherry-pick or revert is in progress");
  return n.has("CHERRY_PICK_HEAD") ? "cherry-pick" : n.has("REVERT_HEAD") ? "revert" : null;
}
/**
 * .gitattributes 是否声明 filter
 */
//@ chunk-8hayd0gw.js:3970-4301 placement
async function hasFilterAttributes(e) {
  let r = join(e, ".gitattributes");
  try {
    if (!(await lstat(r)).isFile()) return !1;
  } catch (error) {
    if (isENOENT(error)) return !1;
    throw error;
  }
  let s;
  try {
    s = await open(r, "r");
    let { buffer: buffer, bytesRead: bytesRead } = await s.read(Buffer.alloc(65536), 0, 65536, 0);
    return buffer.toString("utf8", 0, bytesRead).includes("filter=lfs");
  } catch (error) {
    if (isENOENT(error)) return !1;
    throw error;
  } finally {
    await s?.close();
  }
}

export { collectWorktreeState, withCollectTimeout };
