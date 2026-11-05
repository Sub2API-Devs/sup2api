/**
 * utils/permissions/protectedDirs.ts
 *
 * 受保护目录判断（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-xjnnz630.js (1), chunk-za46rn2f.js (14)
 * attribution: placement 15
 */
import { resolve, dirname, sep, basename } from "path";
import { homedir } from "os";
import { realpathNativeLongSync } from "../fsJunctions.js";
import { isUncOrDevicePath } from "../pathClassification.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-za46rn2f.js:12312-12352 placement
/**
 * realpathCacheEntry：realpath 缓存条目。
 */
function realpathCacheEntry(inputPath) {
  return realpathNativeLongSync(inputPath).real ?? null;
}
//@ chunk-za46rn2f.js:12352-12608 placement
function classifyProtectedDir(inputPath, protectedDir) {
  let lower = resolve(protectedDir).toLowerCase();
  let lower_2 = dirname(resolve(inputPath)).toLowerCase();
  if (
    lower_2 === lower ||
    isUnderDependencyDir(lower_2, lower) ||
    isInWindowsAppsAliasDir(lower_2, lower, "lexical")
  )
    return true;
  let lower_3 = realpathCacheEntry(protectedDir)?.toLowerCase();
  if (lower_3 == null) return false;
  let lower_4 = realpathCacheEntry(dirname(resolve(inputPath)))?.toLowerCase();
  if (lower_4 == null) return true;
  return (
    lower_4 === lower_3 ||
    isUnderDependencyDir(lower_4, lower_3) ||
    isInWindowsAppsAliasDir(lower_4, lower_3, "canonical")
  );
}
//@ chunk-za46rn2f.js:12608-12723 placement
var DEPENDENCY_DIR_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-za46rn2f.js:12608", () => {
  DEPENDENCY_DIR_NAMES = new Set([
    "node_modules",
    ".venv",
    "venv",
    "env",
    ".env",
    "virtualenv",
    ".tox",
    ".nox",
    ".direnv",
    "__pypackages__",
  ]);
});
//@ chunk-za46rn2f.js:12723-12813 placement
function isUnderDependencyDir(parentDir, rootDir) {
  if (!parentDir.startsWith(stripTrailingSep(rootDir) + sep)) return false;
  return parentDir.split(sep).some((segment) => DEPENDENCY_DIR_NAMES.has(segment));
}
//@ chunk-za46rn2f.js:12813-12864 placement
function stripTrailingSep(text) {
  return text.endsWith(sep) ? text.slice(0, -1) : text;
}
//@ chunk-za46rn2f.js:12864-12870 placement
var windowsAppsAliasCache;
//@ chunk-za46rn2f.js:12870-13242 placement
/**
 * 判断路径是否在 WindowsApps 应用执行别名目录下（lexical 模式只做字面比较，否则解析真实路径并缓存）。
 */
function isInWindowsAppsAliasDir(inputPath, aliasDir, mode) {
  let homeDir = homedir();
  let localAppData = (process.env.LOCALAPPDATA ?? "").trim();
  if (mode === "lexical")
    return isUnderAliasDir(
      getWindowsAppsDirs(homeDir, localAppData, (dir) => resolve(dir).toLowerCase()),
      inputPath,
      aliasDir,
    );
  let cacheKey = homeDir + "\x00" + localAppData;
  if (windowsAppsAliasCache?.key === cacheKey)
    return isUnderAliasDir(windowsAppsAliasCache.aliasDirs, inputPath, aliasDir);
  let allResolved = true;
  let dirs = getWindowsAppsDirs(homeDir, localAppData, (dir) => {
    if (!isPosixAbsoluteLocal(dir)) return resolve(dir).toLowerCase();
    let lower = realpathCacheEntry(dir)?.toLowerCase();
    if (lower == null) {
      allResolved = false;
      return resolve(dir).toLowerCase();
    }
    return lower;
  });
  if (allResolved)
    windowsAppsAliasCache = {
      key: cacheKey,
      aliasDirs: dirs,
    };
  return isUnderAliasDir(dirs, inputPath, aliasDir);
}
//@ chunk-za46rn2f.js:13242-13442 placement
function getWindowsAppsDirs(homeDir, localAppData, normalizeDir) {
  let dirs = [];
  if (homeDir)
    dirs.push(
      stripTrailingSep(normalizeDir(homeDir)) +
        sep +
        ["appdata", "local", "microsoft", "windowsapps"].join(sep),
    );
  if (localAppData) {
    let localAppsDir =
      stripTrailingSep(normalizeDir(localAppData)) + sep + ["microsoft", "windowsapps"].join(sep);
    if (!dirs.includes(localAppsDir)) dirs.push(localAppsDir);
  }
  return dirs;
}
//@ chunk-za46rn2f.js:13442-13490 placement
function isPosixAbsoluteLocal(inputPath) {
  return inputPath.startsWith("/") && !isUncOrDevicePath(inputPath);
}
//@ chunk-za46rn2f.js:13490-13621 placement
function isUnderAliasDir(dirs, inputPath, aliasDir) {
  let normalizedAlias = stripTrailingSep(aliasDir);
  for (let dir of dirs) {
    if (!(dir === normalizedAlias || dir.startsWith(normalizedAlias + sep))) continue;
    if (inputPath === dir || inputPath.startsWith(dir + sep)) return true;
  }
  return false;
}
//@ chunk-za46rn2f.js:13621-13793 placement
var SYSTEM_ROOT_SUBDIRS = [
  "usr/local",
  "usr/libexec/cups",
  "usr/share/snmp",
  "AppleInternal",
  "Applications",
  "Library",
  "Users",
  "Volumes",
  "cores",
  "home",
  "media",
  "mnt",
  "opt",
  "pkg",
  "private",
  "sw",
];
//@ chunk-za46rn2f.js:13793-14084 placement
function isSystemVolumePath(inputPath) {
  let parts = inputPath.split("/");
  if (
    parts.length < 5 ||
    parts[0] !== "" ||
    foldCasePair(parts[1] ?? "") !== "system" ||
    foldCasePair(parts[2] ?? "") !== "volumes" ||
    foldCasePair(parts[3] ?? "") !== "data"
  )
    return inputPath;
  let sliced = parts.slice(4);
  for (let subdir of SYSTEM_ROOT_SUBDIRS) {
    let parts = subdir.split("/");
    if (sliced.length < parts.length) continue;
    if (parts.every((segment, index) => foldCasePair(sliced[index] ?? "") === foldCasePair(segment)))
      return "/" + sliced.join("/");
  }
  return inputPath;
}
//@ chunk-za46rn2f.js:14084-14135 placement
function foldCasePair(value) {
  return value.toUpperCase().toLowerCase();
}
//@ chunk-za46rn2f.js:14135-14220 placement (2.1.88 match: isDangerousFilePathToAutoEdit, 1)
function getRepoRootForWorktreePath(path) {
  return basename(dirname(path)) === "worktrees" && basename(dirname(dirname(path))) === ".claude"
    ? dirname(dirname(dirname(path)))
    : null;
}
//@ chunk-xjnnz630.js:50873-50940 placement
/**
 * 从目录列表中过滤掉受保护的目录（当前无引用）。
 */
function filterUnprotectedDirs(dirPaths) {
  let cwd = process.cwd();
  return dirPaths.filter((dirPath) => !classifyProtectedDir(dirPath, cwd));
}
export { realpathCacheEntry, isSystemVolumePath, getRepoRootForWorktreePath, classifyProtectedDir };
