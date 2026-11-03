/**
 * services/projects/repoContext.ts
 *
 * 2.1.316 新增：仓库上下文
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dz3q485w.js (13)
 * attribution: placement 13
 */
import { resolve, relative, sep, isAbsolute, join } from "path";
import { fetchEnvironmentsAndPools } from "../../utils/teleport/selfHostedPool.js";
import { ChannelApiError } from "./channelApi.js";
import { printableName, stripAnsiAndControls } from "../../utils/printableName.js";
import { findFirst, isSelfHostedPool } from "../../utils/teleport/environmentSelection.js";
import { isAnthropicRepoText } from "../../utils/github/anthropicRepos.js";
import { execFileNoThrowWithCwd } from "../../utils/execFileNoThrow.js";
import { gitExe, getBranch } from "../../utils/git.js";
import { GIT_SAFE_GLOBAL_ARGS } from "../../utils/git/gitSafeEnv.js";
import {
  getRemoteUrlForDir,
  resolveGitDir,
  getCommonDir,
  rawPointerPathIsUnsafe,
} from "../../utils/git/gitFilesystem.js";
import { parseGitRemote } from "../../utils/detectRepository.js";
import { isGithubDotCom } from "../../utils/git/githubUrl.js";
import { checkGithubAppInstalled } from "../../utils/background/remote/preconditions.js";
import { samePath } from "../../utils/file.js";
import { getWorktreePaths } from "../../utils/getWorktreePaths.js";
import { hasDotSegment } from "../../utils/pathClassification.js";
import { isNetworkMountRoot, isOnForeignMount } from "../../utils/networkPaths.js";

//@ chunk-dz3q485w.js:12729-13096 placement
/**
 * 选出默认云环境：优先当前选中的非 bridge 环境，否则取第一个可用的非 bridge 环境；列出环境失败时抛错。
 */
async function defaultCloudEnvironment(storageV5, credentials) {
  let environmentsAndPools = await fetchEnvironmentsAndPools(storageV5, credentials);
  if (environmentsAndPools.environmentsError !== null)
    throw new ChannelApiError(
      "list your cloud environments",
      null,
      printableName(environmentsAndPools.environmentsError, 200),
      "request_failed",
    );
  let r = (selectedTarget) => selectedTarget.kind !== "bridge";
  let a =
    environmentsAndPools.selectedTarget !== null && r(environmentsAndPools.selectedTarget)
      ? environmentsAndPools.selectedTarget
      : (findFirst(environmentsAndPools.availableTargets, r) ?? null);
  if (a === null) return null;
  return {
    id: isSelfHostedPool(a),
    name: printableName(a.name, 60),
    kind: a.kind,
  };
}
//@ chunk-dz3q485w.js:13096-13184 placement
/**
 * 取仓库标识，非字符串时为空串。
 */
function repoSlugOrEmpty(repo, n) {
  return repo.kind === "github" && (!isRepoAccessUnverified(repo) || isAnthropicRepoText(n))
    ? `${repo.owner}/${repo.name}`
    : "";
}
//@ chunk-dz3q485w.js:13184-13209 placement
/**
 * 判断仓库访问权限是否尚未确认。
 */
function isRepoAccessUnverified(repo) {
  return false;
}
//@ chunk-dz3q485w.js:13209-13465 placement
var DOC_NAME_REGEX =
  /^(readme(\.[a-z]+)?|claude\.md|agents\.md|plan\.md|todo\.md|roadmap\.md|design\.md|notes\.md|spec\.md|architecture\.md|changelog\.md|docs|doc|design|notes|specs|rfcs?)$/i;
var MAX_TOP_LEVEL_ENTRIES = 60;
var GITHUB_OWNER_REGEX = /^[A-Za-z0-9](?:[A-Za-z0-9_-]{0,38})$/;
var GITHUB_REPO_REGEX = /^[A-Za-z0-9._-]{1,100}$/;
//@ chunk-dz3q485w.js:13465-13498 placement
function isValidGithubOwner(owner) {
  return GITHUB_OWNER_REGEX.test(owner);
}
//@ chunk-dz3q485w.js:13498-13550 placement
function isValidGithubRepo(name) {
  return GITHUB_REPO_REGEX.test(name) && name !== "." && name !== "..";
}
//@ chunk-dz3q485w.js:13550-13604 placement
function githubRepoUrl(owner, name) {
  return `https://github.com/${owner}/${name}`;
}
//@ chunk-dz3q485w.js:13604-13788 placement
async function hasUnpushedCommits(cwd) {
  let n = await execFileNoThrowWithCwd(
    gitExe(),
    [...GIT_SAFE_GLOBAL_ARGS, "rev-list", "--max-count=1", "HEAD", "--not", "--remotes=origin"],
    {
      cwd,
      preserveOutputOnError: false,
    },
  );
  return n.code === 0 && n.stdout.trim() !== "";
}
//@ chunk-dz3q485w.js:13788-14193 placement
/**
 * 解析目录的仓库事实：非 git、origin 非 GitHub，或 GitHub 仓库（分支、owner/name，需要时检查访问权限），并给出是否有 origin。
 */
async function resolveRepoFact(gitRoot, checkAccess, signal) {
  if (gitRoot === null)
    return {
      repo: {
        kind: "no-git",
      },
      hasOrigin: false,
    };
  let [branch, remoteUrlForDir] = await Promise.all([getBranch(gitRoot), getRemoteUrlForDir(gitRoot)]);
  let branch_2 = stripAnsiAndControls(branch);
  let hasOrigin = remoteUrlForDir !== null;
  let h = remoteUrlForDir === null ? null : parseGitRemote(remoteUrlForDir);
  if (h === null || !isGithubDotCom(h.host) || !isValidGithubOwner(h.owner) || !isValidGithubRepo(h.name))
    return {
      repo: {
        kind: "no-github-remote",
        branch: branch_2,
        hasOrigin,
      },
      hasOrigin,
    };
  return {
    repo: {
      kind: "github",
      branch: branch_2,
      owner: h.owner,
      name: h.name,
      access: checkAccess ? await checkGithubRepoAccess(h.owner, h.name, signal) : null,
    },
    hasOrigin,
  };
}
//@ chunk-dz3q485w.js:14193-14476 placement
/**
 * 检查 GitHub 仓库的访问情况：是否可访问、是否安装了 App、默认分支、是否暂时无法判断、GitHub 是否未关联。
 */
async function checkGithubRepoAccess(owner, name, s) {
  let r = await checkGithubAppInstalled(owner, name, s);
  return {
    accessible: r.linkedAccountAccess === "ok" || r.defaultBranch !== null || r.appInstalled,
    appInstalled: r.appInstalled,
    defaultBranch: r.defaultBranch,
    transient: r.transient,
    githubNotConnected: r.linkedAccountAccess === "github_not_connected",
  };
}
//@ chunk-dz3q485w.js:14476-14516 placement
function isSamePath(e, n) {
  return samePath(resolve(e), resolve(n));
}
//@ chunk-dz3q485w.js:14516-14765 placement
function isSameRepoPath(projectPath, n, s) {
  if (isSamePath(projectPath, n)) return true;
  let r = (c) => {
    let h = relative(resolve(c), resolve(n));
    return h === "" || (h !== ".." && !h.startsWith(".." + sep) && !isAbsolute(h));
  };
  let a = s.filter(r).sort((c, h) => h.length - c.length)[0];
  if (a === undefined) return false;
  let l = relative(a, n);
  return s.some((c) => isSamePath(join(c, l), projectPath));
}
//@ chunk-dz3q485w.js:14765-15117 placement
/**
 * 列出与当前仓库属于同一 git 公共目录的工作树路径（排除不安全或无法解析的路径）。
 */
async function sameRepoWorktrees(e) {
  let worktreePaths = await getWorktreePaths(e);
  let gitDir = await resolveGitDir(e);
  let r = gitDir === null ? null : ((await getCommonDir(gitDir)) ?? gitDir);
  let results = await Promise.all(
    worktreePaths.map(async (worktreePath) => {
      if (!isAbsolute(worktreePath) || hasDotSegment(worktreePath)) return false;
      if (isSamePath(worktreePath, e)) return true;
      if (
        r === null ||
        isNetworkMountRoot(worktreePath) ||
        isOnForeignMount(worktreePath, e) ||
        rawPointerPathIsUnsafe(worktreePath, e)
      )
        return false;
      let c = await resolveGitDir(worktreePath).catch(() => null);
      if (c === null) return false;
      let h = (await getCommonDir(c).catch(() => null)) ?? c;
      return isSamePath(h, r);
    }),
  );
  return worktreePaths.filter((worktreePath, c) => results[c]);
}
export {
  sameRepoWorktrees,
  isSameRepoPath,
  isRepoAccessUnverified,
  repoSlugOrEmpty,
  defaultCloudEnvironment,
  checkGithubRepoAccess,
  DOC_NAME_REGEX,
  MAX_TOP_LEVEL_ENTRIES,
  resolveRepoFact,
  hasUnpushedCommits,
  githubRepoUrl,
};
