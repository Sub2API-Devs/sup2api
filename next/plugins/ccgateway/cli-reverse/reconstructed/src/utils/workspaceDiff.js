/**
 * utils/workspaceDiff.ts
 *
 * 工作区差异（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1r5nz6dk.js (10)
 * attribution: placement 10
 */
import { realpath, opendir, lstat } from "fs/promises";
import { join, sep } from "path";
import { getRepoTopLevel, getDiffCwd, isDiffCwdInRepoCached, standardRepoLayout } from "./gitDiff.js";
import { HostScoped } from "./hostScoped.js";
import {
  runnerDeclaredNoRepo,
  hasRunnerDeclaredNestedRepoDiff,
  isRemoteManagedEnvironment,
  initialCwdKey,
  resolveNetworkShareCached,
  isLocalAbsolutePath,
} from "./remoteEnvironment.js";
import { onProcessRootHost } from "../bootstrap/state.js";
import { SandboxManager } from "./sandbox/sandbox-adapter.js";
import { normalizePathForCompare } from "./file.js";
import { identity } from "./pathClassification.js";
import { logForDebugging } from "./debug.js";
import { findGitRootRecheckingNegative, isCurrentDirectoryBareGitRepo_2 } from "./git.js";
import { getCwd } from "./cwd.js";
import { checkoutNameForPath, getDeclaredRepoCheckouts } from "./git/repoCheckouts.js";
import { isSadFsErrno, errorMessage, getErrnoCode } from "./errors.js";
import { logError } from "./log.js";
import { linkChainIsUnsafeToFollow } from "./git/gitFilesystem.js";
import { readGitConfigTexts } from "./git/gitDirResolution.js";

//@ chunk-1r5nz6dk.js:806-961 placement
/**
 * 确定工作区差异的根：单仓库时为仓库顶层，否则计算多仓库工作区差异。
 */
async function getWorkspaceDiffRoot() {
  let root = shouldUseMultiRepoDiff() ? null : await getRepoTopLevel();
  if (root !== null)
    return {
      root,
      nested: false,
      followsShell: false,
    };
  let workspaceDiff = await computeWorkspaceDiff();
  return workspaceDiff === null
    ? null
    : {
        ...workspaceDiff,
        nested: true,
      };
}
//@ chunk-1r5nz6dk.js:961-986 placement
var multiRepoDiffRoots = new HostScoped(() => new Set());
//@ chunk-1r5nz6dk.js:986-1102 placement
function shouldUseMultiRepoDiff() {
  if (runnerDeclaredNoRepo()) return true;
  if (!hasRunnerDeclaredNestedRepoDiff()) return false;
  let diffRoots = onProcessRootHost(multiRepoDiffRoots);
  let diffCwd = getDiffCwd();
  if (!diffRoots.has(diffCwd) && !isDiffCwdInRepoCached()) diffRoots.add(diffCwd);
  return diffRoots.has(diffCwd);
}
//@ chunk-1r5nz6dk.js:1102-1112 placement
var MAX_DIFF_ATTEMPTS = 256;
//@ chunk-1r5nz6dk.js:1112-2281 placement
async function computeWorkspaceDiff() {
  try {
    if (
      !(isRemoteManagedEnvironment() || hasRunnerDeclaredNestedRepoDiff()) ||
      SandboxManager.isSandboxingEnabled()
    )
      return null;
    let diffCwd = getDiffCwd();
    let launchDirRealPath = isRemoteManagedEnvironment()
      ? null
      : normalizePathForCompare(await realpath(diffCwd));
    if (
      launchDirRealPath !== null &&
      ![initialCwdKey(), resolveNetworkShareCached(initialCwdKey())].some(
        (expectedDir) => identity(launchDirRealPath) === normalizePathForCompare(expectedDir),
      )
    ) {
      logForDebugging(
        "workspace diff: the process has left the directory in which it was started, so no nested repository is looked for",
        {
          level: "warn",
        },
      );
      return null;
    }
    if (findGitRootRecheckingNegative(diffCwd) !== null) return null;
    let path = getCwd();
    let declaredCheckouts = await resolveDeclaredCheckouts(launchDirRealPath, diffCwd);
    if (declaredCheckouts.size > 1) {
      let checkoutName = checkoutNameForPath(path);
      let checkoutPath = checkoutName === undefined ? undefined : declaredCheckouts.get(checkoutName);
      let root =
        checkoutPath !== undefined && (await getGitDirKind(checkoutPath)) === "directory"
          ? await resolveDiffWorkTree(checkoutPath, launchDirRealPath)
          : null;
      return root === null
        ? null
        : {
            root,
            followsShell: true,
          };
    }
    let [checkoutPath] = declaredCheckouts.values();
    if (checkoutPath !== undefined) {
      let gitDirKind = await getGitDirKind(checkoutPath);
      if (gitDirKind === "directory") {
        let diffWorkTree = await resolveDiffWorkTree(checkoutPath, launchDirRealPath);
        return diffWorkTree === null
          ? null
          : {
              root: diffWorkTree,
              followsShell: false,
            };
      }
      if (gitDirKind === "other") return null;
    }
    let repoDirs = [];
    let scannedCount = 0;
    for await (let entry of await opendir(diffCwd)) {
      if (++scannedCount > MAX_DIFF_ATTEMPTS) return null;
      if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
      let childDir = join(diffCwd, entry.name);
      if ((await getGitDirKind(childDir)) !== "absent") repoDirs.push(childDir);
    }
    let normalizedCwd = normalizePathForCompare(path);
    let matchingDir =
      repoDirs.find((dir) => {
        let normalizedDir = normalizePathForCompare(dir);
        return normalizedCwd === normalizedDir || normalizedCwd.startsWith(normalizedDir + sep);
      }) ?? (repoDirs.length === 1 ? repoDirs[0] : undefined);
    let diffRoot =
      matchingDir === undefined ? null : await resolveDiffWorkTree(matchingDir, launchDirRealPath);
    return diffRoot === null
      ? null
      : {
          root: diffRoot,
          followsShell: repoDirs.length > 1,
        };
  } catch (error) {
    if (isSadFsErrno(error))
      logForDebugging(`workspace diff: nested repository scan failed: ${errorMessage(error)}`, {
        level: "warn",
      });
    else logError(error);
    return null;
  }
}
//@ chunk-1r5nz6dk.js:2281-2582 placement
/**
 * 取声明的仓库检出目录，若有启动目录则只保留能解析且位于其下的检出，忽略的数量记录警告。
 */
async function resolveDeclaredCheckouts(checkouts, baseDir) {
  let declaredRepoCheckouts = getDeclaredRepoCheckouts();
  if (checkouts === null) return declaredRepoCheckouts;
  let resolvedCheckouts = new Map();
  for (let [checkoutName, checkoutPath] of declaredRepoCheckouts) {
    let realPath = await safeRealpath(checkoutPath, baseDir);
    if (realPath !== null && isPathUnder(realPath, checkouts)) resolvedCheckouts.set(checkoutName, realPath);
  }
  if (resolvedCheckouts.size < declaredRepoCheckouts.size)
    logForDebugging(
      `workspace diff: ignored ${declaredRepoCheckouts.size - resolvedCheckouts.size} declared checkout(s) that do not resolve or lie outside the launch directory`,
      {
        level: "warn",
      },
    );
  return resolvedCheckouts;
}
//@ chunk-1r5nz6dk.js:2582-2642 placement
function isPathUnder(path, prefix) {
  let normalized = normalizePathForCompare(path);
  return normalized === prefix || normalized.startsWith(prefix + sep);
}
//@ chunk-1r5nz6dk.js:2642-2740 placement
async function safeRealpath(path, baseDir) {
  if (!isLocalAbsolutePath(path, baseDir) || linkChainIsUnsafeToFollow(path, baseDir)) return null;
  try {
    return await realpath(path);
  } catch {
    return null;
  }
}
//@ chunk-1r5nz6dk.js:2740-2902 placement
async function getGitDirKind(dir) {
  try {
    return (await lstat(join(dir, ".git"))).isDirectory() ? "directory" : "other";
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return "absent";
    throw error;
  }
}
//@ chunk-1r5nz6dk.js:3074-3350 placement
async function resolveDiffWorkTree(dir, launchDir) {
  let layout = standardRepoLayout(dir);
  if (layout === null) return null;
  if (launchDir !== null) {
    if (readGitConfigTexts(layout.gitDir) !== false) return null;
    if (!(await isCurrentDirectoryBareGitRepo_2(layout.gitDir))) return null;
  }
  let workTree = launchDir === null ? await getRepoTopLevel(undefined, dir) : layout.workTree;
  if (workTree === null || launchDir === null) return workTree;
  let realWorkTree = await safeRealpath(workTree, resolveNetworkShareCached(initialCwdKey()));
  return realWorkTree !== null && isPathUnder(realWorkTree, launchDir) ? realWorkTree : null;
}
export { getWorkspaceDiffRoot };
