/**
 * utils/pathIdentity.ts
 *
 * 2.1.316 新增：路径身份比较
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-b00ssqeq.js (21)
 * attribution: placement 21
 */
import { normalize, isAbsolute, dirname, join, basename, sep } from "path";
import { readlink, lstat, realpath, unlink, rmdir, readdir } from "fs/promises";
import { getPlatform } from "./platform.js";
import { $j } from "./pathClassification.js";
import { getErrnoCode, isENOENT } from "./errors.js";
import { logForDebugging } from "./debug.js";

//@ chunk-b00ssqeq.js:529-613 placement
function Cp(n) {
  return n
    .toLowerCase()
    .replace(/\u0131/g, "i")
    .replace(/\u017F/g, "s");
}
/**
 * 逐字符转小写后再做 Unicode 规范化，并把词尾 sigma（ς）统一为 σ，用于大小写不敏感的路径比较。
 */
//@ chunk-b00ssqeq.js:613-713 placement
function foldCaseForCompare(n) {
  let e = "";
  for (let o of n) e += o.toLowerCase();
  return Cp(e).replace(/\u03C2/g, "\u03C3");
}
//@ chunk-b00ssqeq.js:713-781 placement = getReservedShortcuts (1)
function normalizeCaseForPlatform(n) {
  let platform = getPlatform();
  return platform === "windows" || platform === "macos" ? Cp(n) : n;
}
/**
 * 解析 git worktree list --porcelain -z 输出，找出检出指定分支的唯一 worktree 路径；路径不安全、多个 worktree 检出该分支或路径键重复时返回 null。
 */
//@ chunk-b00ssqeq.js:781-1151 placement
function findUniqueWorktreeForBranch(n, e) {
  let match = null,
    matchCount = 0,
    pathKeys = [];
  for (let a of n.split("\x00\x00")) {
    let fields = a.split("\x00"),
      worktreeLine = fields.find((C) => C.startsWith("worktree "));
    if (worktreeLine === void 0) continue;
    let rawPath = worktreeLine.slice(9);
    if (!isSafeAbsoluteWorktreePath(rawPath)) return null;
    let normalizedPath = normalize(rawPath);
    if ((pathKeys.push(normalizePathKey(normalizedPath)), fields.includes(`branch refs/heads/${e}`)))
      (matchCount++, (match ??= normalizedPath));
  }
  if (match === null || matchCount !== 1) return null;
  let matchKey = normalizePathKey(match),
    keyCount = 0;
  for (let a of pathKeys) if (a === matchKey) keyCount++;
  return keyCount === 1 ? match : null;
}
//@ chunk-b00ssqeq.js:1151-1215 placement
function KJr(n) {
  return getPlatform() === "windows" ? n.replaceAll("\\", "/") : n;
}
//@ chunk-b00ssqeq.js:1215-1301 placement
function Tc(n) {
  let replaced = n.replace(getPlatform() === "windows" ? /[\\/]+$/ : /\/+$/, "");
  return replaced === "" ? n : replaced;
}
//@ chunk-b00ssqeq.js:1301-1376 placement = setCwdState (0.757)
function normalizePathKey(cwd) {
  let e = Tc(cwd);
  return normalizeCaseForPlatform(getPlatform() === "macos" ? e.normalize("NFC") : e);
}
//@ chunk-b00ssqeq.js:1376-1437 placement
function containsSamePath(n, e) {
  let o = nfcOnMacos(n);
  return e.some((s) => nfcOnMacos(normalize(s)) === o);
}
//@ chunk-b00ssqeq.js:1437-1508 placement
function findSamePath(n, e) {
  let o = normalizePathKey(n);
  return e.find((s) => normalizePathKey(normalize(s)) === o) ?? null;
}
//@ chunk-b00ssqeq.js:1508-1576 placement = setCwdState (0.757)
function nfcOnMacos(cwd) {
  let e = Tc(cwd);
  return getPlatform() === "macos" ? e.normalize("NFC") : e;
}
//@ chunk-b00ssqeq.js:1576-1592 placement
var L = /\p{Cc}/u;
/**
 * 判断 worktree 路径是否可用：不含控制字符、是绝对路径且不是 UNC 等危险形式；Windows 下还要求盘符或双斜杠开头。
 */
//@ chunk-b00ssqeq.js:1592-1707 placement
function isSafeAbsoluteWorktreePath(n) {
  if (L.test(n) || !isAbsolute(n) || $j(n)) return !1;
  return getPlatform() !== "windows" || /^(?:[A-Za-z]:[\\/]|[\\/]{2})/.test(n);
}
/**
 * 检查 porcelain 输出中所有 worktree 路径都安全且互不重复（macOS 先做 NFC 规范化）。
 */
//@ chunk-b00ssqeq.js:1707-1981 placement
function hasDistinctWorktreePaths(n) {
  let seenKeys = new Set();
  for (let o of n.split("\x00\x00")) {
    let worktreeLine = o.split("\x00").find((a) => a.startsWith("worktree "));
    if (worktreeLine === void 0) continue;
    let rawPath = worktreeLine.slice(9);
    if (!isSafeAbsoluteWorktreePath(rawPath)) return !1;
    let normalizedPath = normalize(rawPath),
      pathKey = Tc(getPlatform() === "macos" ? normalizedPath.normalize("NFC") : normalizedPath);
    if (seenKeys.has(pathKey)) return !1;
    seenKeys.add(pathKey);
  }
  return !0;
}
/**
 * 在 worktree 列表中找第一个与给定路径之一相同的 worktree（macOS 按 NFC 比较）；路径有重复或不安全时返回 null。
 */
//@ chunk-b00ssqeq.js:1981-2295 placement
function findWorktreeMatchingPaths(n, e) {
  if (!hasDistinctWorktreePaths(n)) return null;
  let samePath = (r, l) => (getPlatform() === "macos" ? r.normalize("NFC") === l.normalize("NFC") : r === l),
    match = null;
  for (let r of n.split("\x00\x00")) {
    let worktreeLine = r.split("\x00").find((a) => a.startsWith("worktree "));
    if (worktreeLine === void 0) continue;
    let worktreePath = normalize(worktreeLine.slice(9));
    if (match === null && e.some((a) => samePath(Tc(worktreePath), Tc(normalize(a))))) match = worktreePath;
  }
  return match;
}
//@ chunk-b00ssqeq.js:2295-2349 placement
async function P1(n, e) {
  return (await checkPathForSymlinks(n, e)).verdict;
}
/**
 * 从根到目标逐级检查路径中是否有符号链接（readlink）：返回 verdict（link/clear/unknown）与出问题的位置；Windows 下还用 realpath 比对大小写确认目录未被重定向。
 */
//@ chunk-b00ssqeq.js:2349-3057 placement
async function checkPathForSymlinks(targetPath, stopAt) {
  let ancestors = [];
  for (
    let ancestor = Tc(targetPath);
    dirname(ancestor) !== ancestor && ancestor !== stopAt;
    ancestor = dirname(ancestor)
  )
    ancestors.push(ancestor);
  if (ancestors.length === 0) return { verdict: "unknown" };
  let isWindows = getPlatform() === "windows",
    resolvedParent = null;
  for (let l of ancestors.reverse()) {
    let resolvedAncestor = Tc(l),
      linkState = await readlink(resolvedAncestor).then(
        () => "link",
        (error) => {
          let parentReal = getErrnoCode(error);
          return parentReal === "EINVAL"
            ? "clear"
            : parentReal === "ENOENT" || parentReal === "ENOTDIR"
              ? "missing"
              : "unknown";
        },
      );
    if (linkState === "clear") {
      if (isWindows) {
        let u = await lstat(resolvedAncestor).catch(() => null);
        if (u === null || !u.isDirectory()) return { verdict: "unknown", at: resolvedAncestor };
        let c = resolvedParent ?? (await realpath(dirname(resolvedAncestor)).catch(() => null)),
          selfReal = await realpath(resolvedAncestor).catch(() => null);
        if (
          c === null ||
          selfReal === null ||
          foldCaseForCompare(Tc(selfReal)) !== foldCaseForCompare(join(Tc(c), basename(resolvedAncestor)))
        )
          return { verdict: "unknown", at: resolvedAncestor };
        resolvedParent = selfReal;
      }
      continue;
    }
    if (linkState === "missing" && !(await vZo(resolvedAncestor)))
      return { verdict: "unknown", at: resolvedAncestor };
    return { verdict: linkState, at: resolvedAncestor };
  }
  return { verdict: "clear" };
}
//@ chunk-b00ssqeq.js:3057-3151 placement
async function vZo(n) {
  if (getPlatform() !== "windows") return !0;
  return lstat(`${n}.lnk`).then(
    () => !1,
    (e) => isENOENT(e),
  );
}
//@ chunk-b00ssqeq.js:3151-3206 placement
async function Ldr(n, e) {
  return (await P1(n, e)) === "clear";
}
/**
 * 判断路径可以安全删除为 worktree 目录：通过前置检查、realpath 与期望路径一致、确实是目录，且（Windows）其中没有无法移除的重解析点。
 */
//@ chunk-b00ssqeq.js:3206-3417 placement
async function isRemovableWorktreeDir(dirPath, expectedRealPath, options) {
  if (!(await Ldr(dirPath, options))) return !1;
  let realPath = await realpath(dirPath).catch(() => null);
  if (realPath === null || nfcOnMacos(realPath) !== nfcOnMacos(expectedRealPath)) return !1;
  let stats = await lstat(Tc(dirPath)).catch(() => null);
  if (stats === null || !stats.isDirectory()) return !1;
  return clearReparsePoints(dirPath);
}
/**
 * 非 Windows 直接返回 true；Windows 下先移除目录内的重解析点/链接，全部清理成功才返回 true。
 */
//@ chunk-b00ssqeq.js:3417-3548 placement
async function clearReparsePoints(n) {
  if (getPlatform() !== "windows") return !0;
  let parentReal = await realpath(dirname(n)).catch(() => null);
  return !(await removeReparsePointsUnder(n, parentReal == null ? null : Cp(join(parentReal, basename(n)))));
}
/**
 * 递归移除路径下的重解析点与空目录（先尝试 unlink、rmdir）；遇到指向允许根以外或无法枚举的条目时返回 true 表示仍有残留。
 */
//@ chunk-b00ssqeq.js:3548-4377 placement
async function removeReparsePointsUnder(entryPath, allowedRoot) {
  try {
    return (
      await unlink(entryPath),
      logForDebugging(`[worktree] unlinked reparse point before removal: ${entryPath}`),
      !1
    );
  } catch {}
  try {
    return (
      await rmdir(entryPath),
      logForDebugging(`[worktree] removed reparse point or empty directory before removal: ${entryPath}`),
      !1
    );
  } catch (entry) {
    if (isENOENT(entry)) return !1;
    if (getErrnoCode(entry) !== "ENOTEMPTY") {
      let linkTarget =
        (await readlink(entryPath).then(
          () => "link",
          (a) => (getErrnoCode(a) === "EINVAL" || isENOENT(a) ? "not-link" : "unknown"),
        )) !== "not-link" || allowedRoot == null
          ? null
          : await realpath(entryPath)
              .then((a) => Cp(a))
              .catch(() => null);
      if (linkTarget == null || (linkTarget !== allowedRoot && !linkTarget.startsWith(allowedRoot + sep)))
        return (
          logForDebugging(`[worktree] refusing to enumerate unremovable entry before removal: ${entryPath}`, {
            level: "warn",
          }),
          !0
        );
    }
  }
  let entries = await readdir(entryPath, { withFileTypes: !0 }).catch((r) => (isENOENT(r) ? [] : null));
  if (entries == null)
    return (
      logForDebugging(`[worktree] could not enumerate ${entryPath} before removal; not certifying`, {
        level: "warn",
      }),
      !0
    );
  let hasLeftover = !1;
  for (let r of entries)
    if (r.isSymbolicLink() || r.isDirectory())
      hasLeftover = (await removeReparsePointsUnder(join(entryPath, r.name), allowedRoot)) || hasLeftover;
  return hasLeftover;
}

export {
  vZo,
  P1,
  Tc,
  isSafeAbsoluteWorktreePath,
  normalizePathKey,
  checkPathForSymlinks,
  containsSamePath,
  Cp,
  normalizeCaseForPlatform,
  findSamePath,
  foldCaseForCompare,
  Ldr,
  findWorktreeMatchingPaths,
  findUniqueWorktreeForBranch,
  isRemovableWorktreeDir,
  KJr,
  clearReparsePoints,
  hasDistinctWorktreePaths,
};
