/**
 * services/projects/repoContext.ts
 *
 * 2.1.316 新增：仓库上下文
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-jndyh8cy.js (13)
 * attribution: placement 13
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-jndyh8cy.js:12826-13193 placement
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
  let notBridge = (selectedTarget) => selectedTarget.kind !== "bridge";
  let target =
    environmentsAndPools.selectedTarget !== null && notBridge(environmentsAndPools.selectedTarget)
      ? environmentsAndPools.selectedTarget
      : (findFirst(environmentsAndPools.availableTargets, notBridge) ?? null);
  if (target === null) return null;
  return {
    id: isSelfHostedPool(target),
    name: printableName(target.name, 60),
    kind: target.kind,
  };
}
//@ chunk-jndyh8cy.js:13193-13281 placement
/**
 * 取仓库标识，非字符串时为空串。
 */
function repoSlugOrEmpty(repo, repoText) {
  return repo.kind === "github" && (!isRepoAccessUnverified(repo) || isAnthropicRepoText(repoText))
    ? `${repo.owner}/${repo.name}`
    : "";
}
//@ chunk-jndyh8cy.js:13281-13306 placement
/**
 * 判断仓库访问权限是否尚未确认。
 */
function isRepoAccessUnverified(repo) {
  return false;
}
//@ chunk-jndyh8cy.js:13306-13562 placement
var DOC_NAME_REGEX =
  /^(readme(\.[a-z]+)?|claude\.md|agents\.md|plan\.md|todo\.md|roadmap\.md|design\.md|notes\.md|spec\.md|architecture\.md|changelog\.md|docs|doc|design|notes|specs|rfcs?)$/i;
var MAX_TOP_LEVEL_ENTRIES = 60;
var GITHUB_OWNER_REGEX = /^[A-Za-z0-9](?:[A-Za-z0-9_-]{0,38})$/;
var GITHUB_REPO_REGEX = /^[A-Za-z0-9._-]{1,100}$/;
//@ chunk-jndyh8cy.js:13562-13595 placement
function isValidGithubOwner(owner) {
  return GITHUB_OWNER_REGEX.test(owner);
}
//@ chunk-jndyh8cy.js:13595-13647 placement
function isValidGithubRepo(name) {
  return GITHUB_REPO_REGEX.test(name) && name !== "." && name !== "..";
}
//@ chunk-jndyh8cy.js:13647-13701 placement
function githubRepoUrl(owner, name) {
  return `https://github.com/${owner}/${name}`;
}
//@ chunk-jndyh8cy.js:13701-13885 placement
async function hasUnpushedCommits(cwd) {
  let result = await execFileNoThrowWithCwd(
    gitExe(),
    [...GIT_SAFE_GLOBAL_ARGS, "rev-list", "--max-count=1", "HEAD", "--not", "--remotes=origin"],
    {
      cwd,
      preserveOutputOnError: false,
    },
  );
  return result.code === 0 && result.stdout.trim() !== "";
}
//@ chunk-jndyh8cy.js:13885-14290 placement
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
  let remote = remoteUrlForDir === null ? null : parseGitRemote(remoteUrlForDir);
  if (
    remote === null ||
    !isGithubDotCom(remote.host) ||
    !isValidGithubOwner(remote.owner) ||
    !isValidGithubRepo(remote.name)
  )
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
      owner: remote.owner,
      name: remote.name,
      access: checkAccess ? await checkGithubRepoAccess(remote.owner, remote.name, signal) : null,
    },
    hasOrigin,
  };
}
//@ chunk-jndyh8cy.js:14290-14573 placement
/**
 * 检查 GitHub 仓库的访问情况：是否可访问、是否安装了 App、默认分支、是否暂时无法判断、GitHub 是否未关联。
 */
async function checkGithubRepoAccess(owner, name, signal) {
  let appCheck = await checkGithubAppInstalled(owner, name, signal);
  return {
    accessible:
      appCheck.linkedAccountAccess === "ok" || appCheck.defaultBranch !== null || appCheck.appInstalled,
    appInstalled: appCheck.appInstalled,
    defaultBranch: appCheck.defaultBranch,
    transient: appCheck.transient,
    githubNotConnected: appCheck.linkedAccountAccess === "github_not_connected",
  };
}
//@ chunk-jndyh8cy.js:14573-14613 placement
function isSamePath(firstPath, secondPath) {
  return samePath(resolve(firstPath), resolve(secondPath));
}
//@ chunk-jndyh8cy.js:14613-14862 placement
function isSameRepoPath(projectPath, worktreePath, candidateRoots) {
  if (isSamePath(projectPath, worktreePath)) return true;
  let isUnder = (root) => {
    let relativePath = relative(resolve(root), resolve(worktreePath));
    return (
      relativePath === "" ||
      (relativePath !== ".." && !relativePath.startsWith(".." + sep) && !isAbsolute(relativePath))
    );
  };
  let bestRoot = candidateRoots.filter(isUnder).sort((a, b) => b.length - a.length)[0];
  if (bestRoot === undefined) return false;
  let relativePath = relative(bestRoot, worktreePath);
  return candidateRoots.some((root) => isSamePath(join(root, relativePath), projectPath));
}
//@ chunk-jndyh8cy.js:14862-15215 placement
/**
 * 列出与当前仓库属于同一 git 公共目录的工作树路径（排除不安全或无法解析的路径）。
 */
async function sameRepoWorktrees(cwd) {
  let worktreePaths = await getWorktreePaths(cwd);
  let gitDir = await resolveGitDir(cwd);
  let commonDir = gitDir === null ? null : ((await getCommonDir(gitDir)) ?? gitDir);
  let results = await Promise.all(
    worktreePaths.map(async (worktreePath) => {
      if (!isAbsolute(worktreePath) || hasDotSegment(worktreePath)) return false;
      if (isSamePath(worktreePath, cwd)) return true;
      if (
        commonDir === null ||
        isNetworkMountRoot(worktreePath) ||
        isOnForeignMount(worktreePath, cwd) ||
        rawPointerPathIsUnsafe(worktreePath, cwd)
      )
        return false;
      let thisGitDir = await resolveGitDir(worktreePath).catch(() => null);
      if (thisGitDir === null) return false;
      let thisCommonDir = (await getCommonDir(thisGitDir).catch(() => null)) ?? thisGitDir;
      return isSamePath(thisCommonDir, commonDir);
    }),
  );
  return worktreePaths.filter((worktreePath, index) => results[index]);
}
export {
  sameRepoWorktrees,
  isSameRepoPath,
  checkGithubRepoAccess,
  isRepoAccessUnverified,
  repoSlugOrEmpty,
  defaultCloudEnvironment,
  DOC_NAME_REGEX,
  MAX_TOP_LEVEL_ENTRIES,
  resolveRepoFact,
  hasUnpushedCommits,
  githubRepoUrl,
};
