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
import { hasDotSegmentAlias } from "./pathClassification.js";
import { getErrnoCode, isENOENT } from "./errors.js";
import { logForDebugging } from "./debug.js";

//@ chunk-b00ssqeq.js:529-613 placement
/**
 * foldCaseBasic：大小写折叠的底层实现（ı→i、ſ→s），供 foldCaseForCompare 等使用。
 */
function foldCaseBasic(text) {
  return text
    .toLowerCase()
    .replace(/\u0131/g, "i")
    .replace(/\u017F/g, "s");
}
//@ chunk-b00ssqeq.js:613-713 placement
/**
 * 逐字符转小写后再做 Unicode 规范化，并把词尾 sigma（ς）统一为 σ，用于大小写不敏感的路径比较。
 */
function foldCaseForCompare(text) {
  let folded = "";
  for (let character of text) folded += character.toLowerCase();
  return foldCaseBasic(folded).replace(/\u03C2/g, "\u03C3");
}
//@ chunk-b00ssqeq.js:713-781 placement (2.1.88 match: getReservedShortcuts, 1)
function normalizeCaseForPlatform(text) {
  let platform = getPlatform();
  return platform === "windows" || platform === "macos" ? foldCaseBasic(text) : text;
}
//@ chunk-b00ssqeq.js:781-1151 placement
/**
 * 解析 git worktree list --porcelain -z 输出，找出检出指定分支的唯一 worktree 路径；路径不安全、多个 worktree 检出该分支或路径键重复时返回 null。
 */
function findUniqueWorktreeForBranch(stdout, branch) {
  let match = null;
  let matchCount = 0;
  let pathKeys = [];
  for (let record of stdout.split("\x00\x00")) {
    let fields = record.split("\x00");
    let worktreeLine = fields.find((field) => field.startsWith("worktree "));
    if (worktreeLine === undefined) continue;
    let rawPath = worktreeLine.slice(9);
    if (!isSafeAbsoluteWorktreePath(rawPath)) return null;
    let normalizedPath = normalize(rawPath);
    pathKeys.push(normalizePathKey(normalizedPath));
    if (fields.includes(`branch refs/heads/${branch}`)) {
      matchCount++;
      match ??= normalizedPath;
    }
  }
  if (match === null || matchCount !== 1) return null;
  let matchKey = normalizePathKey(match);
  let keyCount = 0;
  for (let pathKey of pathKeys) if (pathKey === matchKey) keyCount++;
  return keyCount === 1 ? match : null;
}
//@ chunk-b00ssqeq.js:1151-1215 placement
/**
 * toForwardSlashesOnWindows：仅 Windows 下把反斜杠换成正斜杠。
 */
function toForwardSlashesOnWindows(inputPath) {
  return getPlatform() === "windows" ? inputPath.replaceAll("\\", "/") : inputPath;
}
//@ chunk-b00ssqeq.js:1215-1301 placement
/**
 * stripTrailingSeparators：去掉路径末尾的分隔符（Windows 同时认 / 与 \），全为分隔符时原样返回。
 */
function stripTrailingSeparators(inputPath) {
  let replaced = inputPath.replace(getPlatform() === "windows" ? /[\\/]+$/ : /\/+$/, "");
  return replaced === "" ? inputPath : replaced;
}
//@ chunk-b00ssqeq.js:1301-1376 placement (2.1.88 match: setCwdState, 0.757)
function normalizePathKey(cwd) {
  let inputPath = stripTrailingSeparators(cwd);
  return normalizeCaseForPlatform(getPlatform() === "macos" ? inputPath.normalize("NFC") : inputPath);
}
//@ chunk-b00ssqeq.js:1376-1437 placement
function containsSamePath(cwd, candidates) {
  let normalizedCwd = nfcOnMacos(cwd);
  return candidates.some((candidate) => nfcOnMacos(normalize(candidate)) === normalizedCwd);
}
//@ chunk-b00ssqeq.js:1437-1508 placement
function findSamePath(cwd, candidates) {
  let cwdKey = normalizePathKey(cwd);
  return candidates.find((candidate) => normalizePathKey(normalize(candidate)) === cwdKey) ?? null;
}
//@ chunk-b00ssqeq.js:1508-1576 placement (2.1.88 match: setCwdState, 0.757)
function nfcOnMacos(cwd) {
  let inputPath = stripTrailingSeparators(cwd);
  return getPlatform() === "macos" ? inputPath.normalize("NFC") : inputPath;
}
//@ chunk-b00ssqeq.js:1576-1592 placement
var CONTROL_CHAR_PATTERN = /\p{Cc}/u;
//@ chunk-b00ssqeq.js:1592-1707 placement
/**
 * 判断 worktree 路径是否可用：不含控制字符、是绝对路径且不是 UNC 等危险形式；Windows 下还要求盘符或双斜杠开头。
 */
function isSafeAbsoluteWorktreePath(inputPath) {
  if (CONTROL_CHAR_PATTERN.test(inputPath) || !isAbsolute(inputPath) || hasDotSegmentAlias(inputPath))
    return false;
  return getPlatform() !== "windows" || /^(?:[A-Za-z]:[\\/]|[\\/]{2})/.test(inputPath);
}
//@ chunk-b00ssqeq.js:1707-1981 placement
/**
 * 检查 porcelain 输出中所有 worktree 路径都安全且互不重复（macOS 先做 NFC 规范化）。
 */
function hasDistinctWorktreePaths(stdout) {
  let seenKeys = new Set();
  for (let record of stdout.split("\x00\x00")) {
    let worktreeLine = record.split("\x00").find((field) => field.startsWith("worktree "));
    if (worktreeLine === undefined) continue;
    let rawPath = worktreeLine.slice(9);
    if (!isSafeAbsoluteWorktreePath(rawPath)) return false;
    let normalizedPath = normalize(rawPath);
    let pathKey = stripTrailingSeparators(
      getPlatform() === "macos" ? normalizedPath.normalize("NFC") : normalizedPath,
    );
    if (seenKeys.has(pathKey)) return false;
    seenKeys.add(pathKey);
  }
  return true;
}
//@ chunk-b00ssqeq.js:1981-2295 placement
/**
 * 在 worktree 列表中找第一个与给定路径之一相同的 worktree（macOS 按 NFC 比较）；路径有重复或不安全时返回 null。
 */
function findWorktreeMatchingPaths(stdout, paths) {
  if (!hasDistinctWorktreePaths(stdout)) return null;
  let samePath = (leftPath, rightPath) =>
    getPlatform() === "macos"
      ? leftPath.normalize("NFC") === rightPath.normalize("NFC")
      : leftPath === rightPath;
  let match = null;
  for (let record of stdout.split("\x00\x00")) {
    let worktreeLine = record.split("\x00").find((field) => field.startsWith("worktree "));
    if (worktreeLine === undefined) continue;
    let worktreePath = normalize(worktreeLine.slice(9));
    if (
      match === null &&
      paths.some((candidate) =>
        samePath(stripTrailingSeparators(worktreePath), stripTrailingSeparators(normalize(candidate))),
      )
    )
      match = worktreePath;
  }
  return match;
}
//@ chunk-b00ssqeq.js:2295-2349 placement
/**
 * symlinkVerdictForPath：逐级检查路径的符号链接状态并返回 verdict。
 */
async function symlinkVerdictForPath(targetPath, stopAt) {
  return (await checkPathForSymlinks(targetPath, stopAt)).verdict;
}
//@ chunk-b00ssqeq.js:2349-3057 placement
/**
 * 从根到目标逐级检查路径中是否有符号链接（readlink）：返回 verdict（link/clear/unknown）与出问题的位置；Windows 下还用 realpath 比对大小写确认目录未被重定向。
 */
async function checkPathForSymlinks(targetPath, stopAt) {
  let ancestors = [];
  for (
    let ancestor = stripTrailingSeparators(targetPath);
    dirname(ancestor) !== ancestor && ancestor !== stopAt;
    ancestor = dirname(ancestor)
  )
    ancestors.push(ancestor);
  if (ancestors.length === 0)
    return {
      verdict: "unknown",
    };
  let isWindows = getPlatform() === "windows";
  let resolvedParent = null;
  for (let ancestor of ancestors.reverse()) {
    let resolvedAncestor = stripTrailingSeparators(ancestor);
    let linkState = await readlink(resolvedAncestor).then(
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
        let stats = await lstat(resolvedAncestor).catch(() => null);
        if (stats === null || !stats.isDirectory())
          return {
            verdict: "unknown",
            at: resolvedAncestor,
          };
        let parentRealPath = resolvedParent ?? (await realpath(dirname(resolvedAncestor)).catch(() => null));
        let selfReal = await realpath(resolvedAncestor).catch(() => null);
        if (
          parentRealPath === null ||
          selfReal === null ||
          foldCaseForCompare(stripTrailingSeparators(selfReal)) !==
            foldCaseForCompare(join(stripTrailingSeparators(parentRealPath), basename(resolvedAncestor)))
        )
          return {
            verdict: "unknown",
            at: resolvedAncestor,
          };
        resolvedParent = selfReal;
      }
      continue;
    }
    if (linkState === "missing" && !(await isWindowsShortcutAbsent(resolvedAncestor)))
      return {
        verdict: "unknown",
        at: resolvedAncestor,
      };
    return {
      verdict: linkState,
      at: resolvedAncestor,
    };
  }
  return {
    verdict: "clear",
  };
}
//@ chunk-b00ssqeq.js:3057-3151 placement
/**
 * isWindowsShortcutAbsent：Windows 下判断 <path>.lnk 不存在（非 Windows 恒为真）。
 */
async function isWindowsShortcutAbsent(inputPath) {
  if (getPlatform() !== "windows") return true;
  return lstat(`${inputPath}.lnk`).then(
    () => false,
    (error) => isENOENT(error),
  );
}
//@ chunk-b00ssqeq.js:3151-3206 placement
/**
 * isPathSymlinkClear：路径逐级检查结果为 clear 时返回 true。
 */
async function isPathSymlinkClear(inputPath, stopAt) {
  return (await symlinkVerdictForPath(inputPath, stopAt)) === "clear";
}
//@ chunk-b00ssqeq.js:3206-3417 placement
/**
 * 判断路径可以安全删除为 worktree 目录：通过前置检查、realpath 与期望路径一致、确实是目录，且（Windows）其中没有无法移除的重解析点。
 */
async function isRemovableWorktreeDir(dirPath, expectedRealPath, options) {
  if (!(await isPathSymlinkClear(dirPath, options))) return false;
  let realPath = await realpath(dirPath).catch(() => null);
  if (realPath === null || nfcOnMacos(realPath) !== nfcOnMacos(expectedRealPath)) return false;
  let stats = await lstat(stripTrailingSeparators(dirPath)).catch(() => null);
  if (stats === null || !stats.isDirectory()) return false;
  return clearReparsePoints(dirPath);
}
//@ chunk-b00ssqeq.js:3417-3548 placement
/**
 * 非 Windows 直接返回 true；Windows 下先移除目录内的重解析点/链接，全部清理成功才返回 true。
 */
async function clearReparsePoints(entryPath) {
  if (getPlatform() !== "windows") return true;
  let parentReal = await realpath(dirname(entryPath)).catch(() => null);
  return !(await removeReparsePointsUnder(
    entryPath,
    parentReal == null ? null : foldCaseBasic(join(parentReal, basename(entryPath))),
  ));
}
//@ chunk-b00ssqeq.js:3548-4377 placement
/**
 * 递归移除路径下的重解析点与空目录（先尝试 unlink、rmdir）；遇到指向允许根以外或无法枚举的条目时返回 true 表示仍有残留。
 */
async function removeReparsePointsUnder(entryPath, allowedRoot) {
  try {
    await unlink(entryPath);
    logForDebugging(`[worktree] unlinked reparse point before removal: ${entryPath}`);
    return false;
  } catch {}
  try {
    await rmdir(entryPath);
    logForDebugging(`[worktree] removed reparse point or empty directory before removal: ${entryPath}`);
    return false;
  } catch (entry) {
    if (isENOENT(entry)) return false;
    if (getErrnoCode(entry) !== "ENOTEMPTY") {
      let linkTarget =
        (await readlink(entryPath).then(
          () => "link",
          (error) => (getErrnoCode(error) === "EINVAL" || isENOENT(error) ? "not-link" : "unknown"),
        )) !== "not-link" || allowedRoot == null
          ? null
          : await realpath(entryPath)
              .then((resolvedTarget) => foldCaseBasic(resolvedTarget))
              .catch(() => null);
      if (linkTarget == null || (linkTarget !== allowedRoot && !linkTarget.startsWith(allowedRoot + sep))) {
        logForDebugging(`[worktree] refusing to enumerate unremovable entry before removal: ${entryPath}`, {
          level: "warn",
        });
        return true;
      }
    }
  }
  let entries = await readdir(entryPath, {
    withFileTypes: true,
  }).catch((error) => (isENOENT(error) ? [] : null));
  if (entries == null) {
    logForDebugging(`[worktree] could not enumerate ${entryPath} before removal; not certifying`, {
      level: "warn",
    });
    return true;
  }
  let hasLeftover = false;
  for (let entry of entries)
    if (entry.isSymbolicLink() || entry.isDirectory())
      hasLeftover = (await removeReparsePointsUnder(join(entryPath, entry.name), allowedRoot)) || hasLeftover;
  return hasLeftover;
}
export {
  isWindowsShortcutAbsent,
  symlinkVerdictForPath,
  stripTrailingSeparators,
  isSafeAbsoluteWorktreePath,
  normalizePathKey,
  checkPathForSymlinks,
  containsSamePath,
  foldCaseBasic,
  normalizeCaseForPlatform,
  findSamePath,
  foldCaseForCompare,
  isPathSymlinkClear,
  findWorktreeMatchingPaths,
  findUniqueWorktreeForBranch,
  isRemovableWorktreeDir,
  toForwardSlashesOnWindows,
  clearReparsePoints,
  hasDistinctWorktreePaths,
};
