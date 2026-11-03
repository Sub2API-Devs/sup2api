/**
 * utils/workspaceDiff.ts
 *
 * 工作区差异（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1r5nz6dk.js (9)
 * attribution: placement 9
 */
import { realpath, opendir, lstat } from "fs/promises";
import { join, sep } from "path";
import { getRepoTopLevel, getDiffCwd, isDiffCwdInRepoCached } from "./gitDiff.js";
import { HostScoped } from "./hostScoped.js";
import { GIi, ere, mn, kMt, resolveNetworkShareCached, rQt } from "./remoteEnvironment.js";
import { onProcessRootHost } from "../bootstrap/state.js";
import { SandboxManager } from "./sandbox/sandbox-adapter.js";
import { normalizePathForCompare } from "./file.js";
import { Mn } from "./pathClassification.js";
import { logForDebugging } from "./debug.js";
import { findGitRootRecheckingNegative } from "./git.js";
import { getCwd } from "./cwd.js";
import { checkoutNameForPath, getDeclaredRepoCheckouts } from "./git/repoCheckouts.js";
import { resolveDiffWorkTree } from "./_new/resolveDiffWorkTree.js";
import { isSadFsErrno, errorMessage, getErrnoCode } from "./errors.js";
import { logError } from "./log.js";
import { linkChainIsUnsafeToFollow } from "./git/gitFilesystem.js";

/**
 * 确定工作区差异的根：单仓库时为仓库顶层，否则计算多仓库工作区差异。
 */
//@ chunk-1r5nz6dk.js:806-961 placement
async function getWorkspaceDiffRoot() {
  let e = shouldUseMultiRepoDiff() ? null : await getRepoTopLevel();
  if (e !== null) return { root: e, nested: !1, followsShell: !1 };
  let r = await computeWorkspaceDiff();
  return r === null ? null : { ...r, nested: !0 };
}
//@ chunk-1r5nz6dk.js:961-986 placement
var N = new HostScoped(() => new Set());
//@ chunk-1r5nz6dk.js:986-1102 placement
function shouldUseMultiRepoDiff() {
  if (GIi()) return !0;
  if (!ere()) return !1;
  let e = onProcessRootHost(N),
    r = getDiffCwd();
  if (!e.has(r) && !isDiffCwdInRepoCached()) e.add(r);
  return e.has(r);
}
//@ chunk-1r5nz6dk.js:1102-1112 placement
var E = 256;
//@ chunk-1r5nz6dk.js:1112-2281 placement
async function computeWorkspaceDiff() {
  try {
    if (!(mn() || ere()) || SandboxManager.isSandboxingEnabled()) return null;
    let e = getDiffCwd(),
      r = mn() ? null : normalizePathForCompare(await realpath(e));
    if (
      r !== null &&
      ![kMt(), resolveNetworkShareCached(kMt())].some((i) => Mn(r) === normalizePathForCompare(i))
    )
      return (
        logForDebugging(
          "workspace diff: the process has left the directory in which it was started, so no nested repository is looked for",
          { level: "warn" },
        ),
        null
      );
    if (findGitRootRecheckingNegative(e) !== null) return null;
    let n = getCwd(),
      o = await resolveDeclaredCheckouts(r, e);
    if (o.size > 1) {
      let i = checkoutNameForPath(n),
        s = i === void 0 ? void 0 : o.get(i),
        R = s !== void 0 && (await getGitDirKind(s)) === "directory" ? await resolveDiffWorkTree(s, r) : null;
      return R === null ? null : { root: R, followsShell: !0 };
    }
    let [a] = o.values();
    if (a !== void 0) {
      let i = await getGitDirKind(a);
      if (i === "directory") {
        let s = await resolveDiffWorkTree(a, r);
        return s === null ? null : { root: s, followsShell: !1 };
      }
      if (i === "other") return null;
    }
    let u = [],
      c = 0;
    for await (let i of await opendir(e)) {
      if (++c > E) return null;
      if (!i.isDirectory() || i.name.startsWith(".")) continue;
      let s = join(e, i.name);
      if ((await getGitDirKind(s)) !== "absent") u.push(s);
    }
    let p = normalizePathForCompare(n),
      w =
        u.find((i) => {
          let s = normalizePathForCompare(i);
          return p === s || p.startsWith(s + sep);
        }) ?? (u.length === 1 ? u[0] : void 0),
      y = w === void 0 ? null : await resolveDiffWorkTree(w, r);
    return y === null ? null : { root: y, followsShell: u.length > 1 };
  } catch (error) {
    if (isSadFsErrno(error))
      logForDebugging(`workspace diff: nested repository scan failed: ${errorMessage(error)}`, {
        level: "warn",
      });
    else logError(error);
    return null;
  }
}
/**
 * 取声明的仓库检出目录，若有启动目录则只保留能解析且位于其下的检出，忽略的数量记录警告。
 */
//@ chunk-1r5nz6dk.js:2281-2582 placement
async function resolveDeclaredCheckouts(e, r) {
  let n = getDeclaredRepoCheckouts();
  if (e === null) return n;
  let o = new Map();
  for (let [a, u] of n) {
    let c = await S(u, r);
    if (c !== null && C(c, e)) o.set(a, c);
  }
  if (o.size < n.size)
    logForDebugging(
      `workspace diff: ignored ${n.size - o.size} declared checkout(s) that do not resolve or lie outside the launch directory`,
      { level: "warn" },
    );
  return o;
}
//@ chunk-1r5nz6dk.js:2582-2642 placement
function C(e, r) {
  let n = normalizePathForCompare(e);
  return n === r || n.startsWith(r + sep);
}
//@ chunk-1r5nz6dk.js:2642-2740 placement
async function S(e, r) {
  if (!rQt(e, r) || linkChainIsUnsafeToFollow(e, r)) return null;
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
    let n = getErrnoCode(error);
    if (n === "ENOENT" || n === "ENOTDIR") return "absent";
    throw error;
  }
}

export { S, C, getWorkspaceDiffRoot };
