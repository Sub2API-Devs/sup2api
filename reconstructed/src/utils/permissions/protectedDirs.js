/**
 * utils/permissions/protectedDirs.ts
 *
 * 受保护目录判断（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aat7wt0p.js (14)
 * attribution: placement 14
 */
import { resolve, dirname, sep, basename } from "path";
import { homedir } from "os";
import { realpathNativeLongSync } from "../fsJunctions.js";
import { isUncOrDevicePath } from "../pathClassification.js";

//@ chunk-aat7wt0p.js:12312-12352 placement
/**
 * realpathCacheEntry：realpath 缓存条目。
 */
function realpathCacheEntry(t) {
  return realpathNativeLongSync(t).real ?? null;
}
//@ chunk-aat7wt0p.js:12352-12608 placement
function classifyProtectedDir(t, n) {
  let lower = resolve(n).toLowerCase();
  let lower_2 = dirname(resolve(t)).toLowerCase();
  if (
    lower_2 === lower ||
    isUnderDependencyDir(lower_2, lower) ||
    isInWindowsAppsAliasDir(lower_2, lower, "lexical")
  )
    return true;
  let lower_3 = realpathCacheEntry(n)?.toLowerCase();
  if (lower_3 == null) return false;
  let lower_4 = realpathCacheEntry(dirname(resolve(t)))?.toLowerCase();
  if (lower_4 == null) return true;
  return (
    lower_4 === lower_3 ||
    isUnderDependencyDir(lower_4, lower_3) ||
    isInWindowsAppsAliasDir(lower_4, lower_3, "canonical")
  );
}
//@ chunk-aat7wt0p.js:12608-12723 placement
var DEPENDENCY_DIR_NAMES = new Set([
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
//@ chunk-aat7wt0p.js:12723-12813 placement
function isUnderDependencyDir(t, n) {
  if (!t.startsWith(stripTrailingSep(n) + sep)) return false;
  return t.split(sep).some((e) => DEPENDENCY_DIR_NAMES.has(e));
}
//@ chunk-aat7wt0p.js:12813-12864 placement
function stripTrailingSep(t) {
  return t.endsWith(sep) ? t.slice(0, -1) : t;
}
//@ chunk-aat7wt0p.js:12864-12870 placement
var windowsAppsAliasCache;
//@ chunk-aat7wt0p.js:12870-13242 placement
/**
 * 判断路径是否在 WindowsApps 应用执行别名目录下（lexical 模式只做字面比较，否则解析真实路径并缓存）。
 */
function isInWindowsAppsAliasDir(t, n, e) {
  let r = homedir();
  let trimmed = (process.env.LOCALAPPDATA ?? "").trim();
  if (e === "lexical")
    return isUnderAliasDir(
      getWindowsAppsDirs(r, trimmed, (a) => resolve(a).toLowerCase()),
      t,
      n,
    );
  let i = r + "\x00" + trimmed;
  if (windowsAppsAliasCache?.key === i) return isUnderAliasDir(windowsAppsAliasCache.aliasDirs, t, n);
  let s = true;
  let windowsAppsDirs = getWindowsAppsDirs(r, trimmed, (a) => {
    if (!isPosixAbsoluteLocal(a)) return resolve(a).toLowerCase();
    let lower = realpathCacheEntry(a)?.toLowerCase();
    if (lower == null) {
      s = false;
      return resolve(a).toLowerCase();
    }
    return lower;
  });
  if (s)
    windowsAppsAliasCache = {
      key: i,
      aliasDirs: windowsAppsDirs,
    };
  return isUnderAliasDir(windowsAppsDirs, t, n);
}
//@ chunk-aat7wt0p.js:13242-13442 placement
function getWindowsAppsDirs(t, n, e) {
  let r = [];
  if (t) r.push(stripTrailingSep(e(t)) + sep + ["appdata", "local", "microsoft", "windowsapps"].join(sep));
  if (n) {
    let o = stripTrailingSep(e(n)) + sep + ["microsoft", "windowsapps"].join(sep);
    if (!r.includes(o)) r.push(o);
  }
  return r;
}
//@ chunk-aat7wt0p.js:13442-13490 placement
function isPosixAbsoluteLocal(t) {
  return t.startsWith("/") && !isUncOrDevicePath(t);
}
//@ chunk-aat7wt0p.js:13490-13621 placement
function isUnderAliasDir(t, n, e) {
  let r = stripTrailingSep(e);
  for (let o of t) {
    if (!(o === r || o.startsWith(r + sep))) continue;
    if (n === o || n.startsWith(o + sep)) return true;
  }
  return false;
}
//@ chunk-aat7wt0p.js:13621-13793 placement
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
//@ chunk-aat7wt0p.js:13793-14084 placement
function isSystemVolumePath(t) {
  let parts = t.split("/");
  if (
    parts.length < 5 ||
    parts[0] !== "" ||
    foldCasePair(parts[1] ?? "") !== "system" ||
    foldCasePair(parts[2] ?? "") !== "volumes" ||
    foldCasePair(parts[3] ?? "") !== "data"
  )
    return t;
  let sliced = parts.slice(4);
  for (let r of SYSTEM_ROOT_SUBDIRS) {
    let parts = r.split("/");
    if (sliced.length < parts.length) continue;
    if (parts.every((i, s) => foldCasePair(sliced[s] ?? "") === foldCasePair(i)))
      return "/" + sliced.join("/");
  }
  return t;
}
//@ chunk-aat7wt0p.js:14084-14135 placement
function foldCasePair(t) {
  return t.toUpperCase().toLowerCase();
}
//@ chunk-aat7wt0p.js:14135-14220 placement = isDangerousFilePathToAutoEdit (1)
function getRepoRootForWorktreePath(path) {
  return basename(dirname(path)) === "worktrees" && basename(dirname(dirname(path))) === ".claude"
    ? dirname(dirname(dirname(path)))
    : null;
}
export { isSystemVolumePath, realpathCacheEntry, getRepoRootForWorktreePath, classifyProtectedDir };
