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
  let e = shouldUseMultiRepoDiff() ? null : await getRepoTopLevel();
  if (e !== null)
    return {
      root: e,
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
  let e = onProcessRootHost(multiRepoDiffRoots);
  let diffCwd = getDiffCwd();
  if (!e.has(diffCwd) && !isDiffCwdInRepoCached()) e.add(diffCwd);
  return e.has(diffCwd);
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
    let r = isRemoteManagedEnvironment() ? null : normalizePathForCompare(await realpath(diffCwd));
    if (
      r !== null &&
      ![initialCwdKey(), resolveNetworkShareCached(initialCwdKey())].some(
        (i) => identity(r) === normalizePathForCompare(i),
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
    let cwd = getCwd();
    let declaredCheckouts = await resolveDeclaredCheckouts(r, diffCwd);
    if (declaredCheckouts.size > 1) {
      let i = checkoutNameForPath(cwd);
      let s = i === undefined ? undefined : declaredCheckouts.get(i);
      let R =
        s !== undefined && (await getGitDirKind(s)) === "directory" ? await resolveDiffWorkTree(s, r) : null;
      return R === null
        ? null
        : {
            root: R,
            followsShell: true,
          };
    }
    let [a] = declaredCheckouts.values();
    if (a !== undefined) {
      let gitDirKind = await getGitDirKind(a);
      if (gitDirKind === "directory") {
        let diffWorkTree = await resolveDiffWorkTree(a, r);
        return diffWorkTree === null
          ? null
          : {
              root: diffWorkTree,
              followsShell: false,
            };
      }
      if (gitDirKind === "other") return null;
    }
    let u = [];
    let c = 0;
    for await (let i of await opendir(diffCwd)) {
      if (++c > MAX_DIFF_ATTEMPTS) return null;
      if (!i.isDirectory() || i.name.startsWith(".")) continue;
      let s = join(diffCwd, i.name);
      if ((await getGitDirKind(s)) !== "absent") u.push(s);
    }
    let p = normalizePathForCompare(cwd);
    let w =
      u.find((i) => {
        let s = normalizePathForCompare(i);
        return p === s || p.startsWith(s + sep);
      }) ?? (u.length === 1 ? u[0] : undefined);
    let y = w === undefined ? null : await resolveDiffWorkTree(w, r);
    return y === null
      ? null
      : {
          root: y,
          followsShell: u.length > 1,
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
async function resolveDeclaredCheckouts(e, diffCwd) {
  let declaredRepoCheckouts = getDeclaredRepoCheckouts();
  if (e === null) return declaredRepoCheckouts;
  let o = new Map();
  for (let [a, u] of declaredRepoCheckouts) {
    let c = await safeRealpath(u, diffCwd);
    if (c !== null && isPathUnder(c, e)) o.set(a, c);
  }
  if (o.size < declaredRepoCheckouts.size)
    logForDebugging(
      `workspace diff: ignored ${declaredRepoCheckouts.size - o.size} declared checkout(s) that do not resolve or lie outside the launch directory`,
      {
        level: "warn",
      },
    );
  return o;
}
//@ chunk-1r5nz6dk.js:2582-2642 placement
function isPathUnder(e, r) {
  let n = normalizePathForCompare(e);
  return n === r || n.startsWith(r + sep);
}
//@ chunk-1r5nz6dk.js:2642-2740 placement
async function safeRealpath(e, r) {
  if (!isLocalAbsolutePath(e, r) || linkChainIsUnsafeToFollow(e, r)) return null;
  try {
    return await realpath(e);
  } catch {
    return null;
  }
}
//@ chunk-1r5nz6dk.js:2740-2902 placement
async function getGitDirKind(e) {
  try {
    return (await lstat(join(e, ".git"))).isDirectory() ? "directory" : "other";
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return "absent";
    throw error;
  }
}
//@ chunk-1r5nz6dk.js:3074-3350 placement
async function resolveDiffWorkTree(e, r) {
  let n = standardRepoLayout(e);
  if (n === null) return null;
  if (r !== null) {
    if (readGitConfigTexts(n.gitDir) !== false) return null;
    if (!(await isCurrentDirectoryBareGitRepo_2(n.gitDir))) return null;
  }
  let o = r === null ? await getRepoTopLevel(undefined, e) : n.workTree;
  if (o === null || r === null) return o;
  let a = await safeRealpath(o, resolveNetworkShareCached(initialCwdKey()));
  return a !== null && isPathUnder(a, r) ? a : null;
}
export { getWorkspaceDiffRoot };
