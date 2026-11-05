/**
 * services/selfHostedRunner/workLook.ts
 *
 * self-hosted runner 的“工作区是否值得保留”检查：核对 git 未提交改动、未推送提交、stash、子模块、超时与工作树，汇总为可读原因（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-f4vx46x7.js (12)
 * attribution: placement 12
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join, dirname } from "path";
import { realpath, opendir } from "fs/promises";
import { ATOMIC_WRITE_DIRNAME } from "../../utils/plugins/safeCopy.js";
import { describeGitBinaryFile } from "../../utils/teleport/screenedGit.js";
import { ISOLATED_GIT_CONFIG_ENV } from "../../utils/git/gitIndexReader.js";
import { getEnvCaseInsensitive } from "../../utils/plugins/securityDefaultPlugin.js";
import { buildGitEnv } from "../../utils/git/builderGit/gitEnv.js";
import { childScrubbedCredentialKeys } from "../../utils/subprocessEnv.js";
import { CREDENTIAL_SCRUB_VARS_WITH_INPUT } from "../../utils/settings/policyHelper/helperExec.js";
import { findGitRootRecheckingNegative } from "../../utils/git.js";
import { resolveGitDirsOrPlaceholder, readWorktreeGitdirFile } from "../../utils/git/gitDirResolution.js";
import { runGit, UnseenBehindIndexBitError, collectWorktreeStateAt } from "../../bridge/worktreeState.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage, isENOENT } from "../../utils/errors.js";
import { checkBranchPushed } from "../../utils/teleport/branchStatus.js";
import { readPositionIsUnsafe, linkChainIsUnsafeToFollow } from "../../utils/git/gitFilesystem.js";
import { isSubpathOf } from "../../utils/pathPrefix.js";
import { knownReasonCodesIn, WORK_LOOK_ANSWER_PREFIX } from "./releaseReasons.js";
import { GIT_SHA_RE } from "../../remote/tools/servedOwnerSettings.js";
import { isSafeRefName } from "../../utils/git/safeRefName.js";
import { safeParseJSON } from "../../utils/json.js";
import { jsonStringify } from "../../utils/slowOperations.js";

//@ chunk-f4vx46x7.js:6830-6891 placement
var MAX_AHEAD_COMMITS = 1000;
var STATUS_EXCLUDES = [".claude/settings.local.json", `.claude/${ATOMIC_WRITE_DIRNAME}`];
//@ chunk-f4vx46x7.js:6891-7137 placement
function buildCleanGitEnv() {
  return {
    git: describeGitBinaryFile(undefined).file,
    gitEnvPins: {
      ...ISOLATED_GIT_CONFIG_ENV,
      HOME: "/dev/null",
      XDG_CONFIG_HOME: "/dev/null",
      PATH: getEnvCaseInsensitive(buildGitEnv(undefined), "PATH") ?? "",
    },
    unsetInGitChildren: [
      ...childScrubbedCredentialKeys(),
      ...CREDENTIAL_SCRUB_VARS_WITH_INPUT,
      "CLAUDE_CODE_SESSION_ACCESS_TOKEN",
      "CLAUDE_SESSION_INGRESS_TOKEN_FILE",
    ],
  };
}
//@ chunk-f4vx46x7.js:7137-7878 placement
/**
 * 采集一个 checkout 的“是否值得保留”事实：git 工作区状态、是否有未推送提交与 stash，带超时。
 */
async function lookAtWorktree(cwd, deadlineMs) {
  let gitRoot = findGitRootRecheckingNegative(cwd);
  if (!gitRoot)
    return {
      tree: "no_repository",
    };
  let gitEnv = buildCleanGitEnv();
  let { gitDir, commonDir } = resolveGitDirsOrPlaceholder(gitRoot);
  let startTime = performance.now();
  let [[state, stateMs], commits, stashRef] = await Promise.all([
    collectIdleTreeState(gitRoot, deadlineMs, gitEnv).then((collected) => [
      collected,
      performance.now() - startTime,
    ]),
    checkAheadOfOrigin(gitRoot, deadlineMs, {
      ...gitEnv,
      gitEnvPins: {
        ...gitEnv.gitEnvPins,
        GIT_DIR: gitDir,
        GIT_WORK_TREE: gitRoot,
        GIT_COMMON_DIR: commonDir,
      },
    }),
    runGit(gitEnv, gitRoot, ["rev-parse", "--verify", "--quiet", "refs/stash"]),
  ]);
  if (state === null)
    return {
      tree: "unknown",
      cause: stateMs >= deadlineMs ? "timed_out" : "failed",
      commits,
    };
  if (state instanceof UnseenBehindIndexBitError)
    return {
      tree: "unknown",
      cause: state.bit,
      commits,
    };
  if (state.submodules_unverified)
    return {
      tree: "unknown",
      cause: "submodules",
      commits,
    };
  return {
    tree: state.is_dirty ? "uncommitted" : "clean",
    midOperation: state.mid_operation !== null,
    hasLfs: state.has_lfs,
    ...((stashRef.exitCode === 0 || stashRef.exitCode === 1) && {
      hasStash: stashRef.exitCode === 0,
    }),
    commits,
  };
}
//@ chunk-f4vx46x7.js:7878-8135 placement
async function collectIdleTreeState(gitRoot, deadlineMs, gitEnv) {
  try {
    return await collectWorktreeStateAt(gitRoot, null, deadlineMs, {
      ...gitEnv,
      entersSubmodules: false,
      statusLeavesOut: STATUS_EXCLUDES,
      ignoresByTheTreeAlone: true,
      looksBehindIndexBits: true,
    });
  } catch (error) {
    if (error instanceof UnseenBehindIndexBitError) return error;
    logForDebugging(`idle work look: the tree could not be read: ${errorMessage(error)}`);
    return null;
  }
}
//@ chunk-f4vx46x7.js:8135-8632 placement
/**
 * 检查 origin 的已推送祖先，返回超前提交数或失败原因。
 */
async function checkAheadOfOrigin(gitRoot, deadlineMs, { gitEnvPins, unsetInGitChildren }) {
  let pushed = await checkBranchPushed({
    gitRoot,
    remoteName: "origin",
    branch: "HEAD",
    sessionRoot: undefined,
    gitEnvPins,
    unsetInGitChildren,
    deadlineMs,
  });
  switch (pushed.kind) {
    case "pushed_ancestor":
      return {
        known: true,
        count: Math.min(pushed.aheadCount, MAX_AHEAD_COMMITS),
      };
    case "none":
      return {
        known: false,
        cause: "no_pushed_history",
      };
    case "unknown":
      return {
        known: false,
        cause: pushed.cause === "refspec_not_covering" ? "refspec_not_covering" : "failed",
      };
    case "on_remote":
    case "not_on_remote":
      return {
        known: false,
        cause: "failed",
      };
  }
}
//@ chunk-f4vx46x7.js:8632-8647 placement
var LOOK_DEADLINE_MS = 1e4;
var MAX_WORKTREES = 50;
//@ chunk-f4vx46x7.js:8647-9153 placement
/**
 * 把工作区事实映射成 release 原因代码。
 */
function classifyTreeState(state) {
  switch (state.tree) {
    case "uncommitted":
      return "uncommitted_changes";
    case "no_repository":
      return "unreadable";
    case "unknown":
      return state.cause === "submodules"
        ? "submodules"
        : state.cause === "timed_out"
          ? "too_slow"
          : state.cause === "failed"
            ? "unreadable"
            : "hidden_files";
    case "clean":
  }
  if (state.midOperation) return "unfinished_operation";
  if (!state.commits.known) return state.commits.cause === "failed" ? "unreadable" : "pushed_unknown";
  if (state.commits.count > 0) return "unpushed_commits";
  if (state.hasStash !== false) return state.hasStash ? "stash" : "unreadable";
  return;
}
//@ chunk-f4vx46x7.js:9153-9689 placement (2.1.88 match: isDangerousFilePathToAutoEdit, 0.788)
/**
 * 列出可一起检查的 worktree 路径，过多时返回 undefined。
 */
async function isDangerousFilePathToAutoEdit(path) {
  let { commonDir } = resolveGitDirsOrPlaceholder(path);
  let worktreesDir = join(commonDir, "worktrees");
  let mapped = [dirname(commonDir), commonDir].map((base) => join(base, ".claude", "worktrees"));
  if (
    readPositionIsUnsafe(worktreesDir, commonDir) ||
    mapped.some((linkPath) => linkChainIsUnsafeToFollow(linkPath, path))
  )
    return;
  let entries;
  try {
    entries = await listDirNames(worktreesDir, 20 * MAX_WORKTREES);
  } catch (error) {
    return isENOENT(error) ? [] : undefined;
  }
  let resolved = [];
  try {
    let bases = [path];
    for (let linkDir of mapped) {
      let realLinkDir = await realpath(linkDir).catch((error) =>
        isENOENT(error) ? undefined : Promise.reject(error),
      );
      if (realLinkDir !== undefined) bases.push(realLinkDir);
    }
    for (let dir of entries) {
      let worktreeGitdirFile = readWorktreeGitdirFile(join(worktreesDir, dir), path);
      if (worktreeGitdirFile === null) return;
      let realWorktreePath = await realpath(worktreeGitdirFile).catch((error) =>
        isENOENT(error) ? undefined : Promise.reject(error),
      );
      if (
        realWorktreePath !== undefined &&
        bases.some((dangerousFile) => isSubpathOf(dangerousFile, realWorktreePath, false))
      )
        resolved.push(realWorktreePath);
    }
  } catch {
    return;
  }
  return resolved.length > MAX_WORKTREES ? undefined : resolved;
}
//@ chunk-f4vx46x7.js:9689-9811 placement
async function listDirNames(dir, limit) {
  let names = [];
  for await (let entry of await opendir(dir))
    if (names.push(entry.name) > limit) throw Error("too many entries");
  return names;
}
//@ chunk-f4vx46x7.js:9811-10089 placement
async function lookAtPath(path) {
  try {
    let path_2 = await realpath(path);
    let gitRootRecheckingNegative = findGitRootRecheckingNegative(path_2);
    if (gitRootRecheckingNegative === null || (await realpath(gitRootRecheckingNegative)) !== path_2)
      return "unreadable";
    let linkedWorktrees = await isDangerousFilePathToAutoEdit(path_2);
    if (linkedWorktrees === undefined) return "unreadable";
    let results = await Promise.all(
      [path_2, ...linkedWorktrees].map(async (target) =>
        classifyTreeState(await lookAtWorktree(target, LOOK_DEADLINE_MS)),
      ),
    );
    return knownReasonCodesIn(results.filter((state) => state !== undefined))[0];
  } catch {
    return "unreadable";
  }
}
//@ chunk-f4vx46x7.js:10089-10533 placement
/**
 * 判定 checkout 是否仍停在给定 commit/分支上。
 */
async function checkStartCommit(path, { commit, branch }) {
  if (commit === undefined || !GIT_SHA_RE.test(commit)) return "start_unknown";
  if (branch !== undefined && !isSafeRefName(branch)) return "unreadable";
  try {
    let gitEnv = buildCleanGitEnv();
    let results = await Promise.all(
      ["HEAD", ...(branch === undefined ? [] : [`refs/heads/${branch}`])].map((ref) =>
        runGit(gitEnv, path, ["rev-parse", "--verify", "--quiet", ref]),
      ),
    );
    if (results.some((out) => out.exitCode !== 0 && out.exitCode !== 1)) return "unreadable";
    return results.every((out) => out.exitCode === 0 && out.stdout.trim() === commit)
      ? undefined
      : "moved_since_start";
  } catch {
    return "unreadable";
  }
}
//@ chunk-f4vx46x7.js:10533-11028 placement
/**
 * self-hosted-runner work-look 子命令入口：读 stdin 的路径列表，输出每个路径的原因 JSON 行。
 */
async function runFromStdin(argv) {
  let items = safeParseJSON(argv[0] ?? "", false);
  if (
    !Array.isArray(items) ||
    !items.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        "path" in item &&
        typeof item.path === "string" &&
        (!("commit" in item) || typeof item.commit === "string") &&
        (!("branch" in item) || typeof item.branch === "string"),
    )
  ) {
    process.exitCode = 2;
    return;
  }
  let results = await Promise.all(
    items.map(async ({ path, commit, branch }) => {
      let results = await Promise.all([
        lookAtPath(path),
        checkStartCommit(path, {
          commit,
          branch,
        }),
      ]);
      return knownReasonCodesIn(results.filter((reason) => reason !== undefined))[0];
    }),
  );
  process.stdout.write(`${WORK_LOOK_ANSWER_PREFIX}${jsonStringify(results.map((reason) => reason ?? null))}
`);
}
export { runFromStdin };
