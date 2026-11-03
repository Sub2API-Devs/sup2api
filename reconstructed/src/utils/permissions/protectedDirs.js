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
import { Rke } from "../fsJunctions.js";
import { Qn } from "../pathClassification.js";

//@ chunk-aat7wt0p.js:12312-12352 placement
function e9(t) {
  return Rke(t).real ?? null;
}
//@ chunk-aat7wt0p.js:12352-12608 placement
function classifyProtectedDir(t, n) {
  let lower = resolve(n).toLowerCase(),
    lower_2 = dirname(resolve(t)).toLowerCase();
  if (lower_2 === lower || it(lower_2, lower) || isInWindowsAppsAliasDir(lower_2, lower, "lexical"))
    return !0;
  let o = e9(n)?.toLowerCase();
  if (o == null) return !1;
  let i = e9(dirname(resolve(t)))?.toLowerCase();
  if (i == null) return !0;
  return i === o || it(i, o) || isInWindowsAppsAliasDir(i, o, "canonical");
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
function it(t, n) {
  if (!t.startsWith(L(n) + sep)) return !1;
  return t.split(sep).some((e) => DEPENDENCY_DIR_NAMES.has(e));
}
//@ chunk-aat7wt0p.js:12813-12864 placement
function L(t) {
  return t.endsWith(sep) ? t.slice(0, -1) : t;
}
//@ chunk-aat7wt0p.js:12864-12870 placement
var H;
/**
 * 判断路径是否在 WindowsApps 应用执行别名目录下（lexical 模式只做字面比较，否则解析真实路径并缓存）。
 */
//@ chunk-aat7wt0p.js:12870-13242 placement
function isInWindowsAppsAliasDir(t, n, e) {
  let r = homedir(),
    trimmed = (process.env.LOCALAPPDATA ?? "").trim();
  if (e === "lexical")
    return isUnderAliasDir(
      getWindowsAppsDirs(r, trimmed, (a) => resolve(a).toLowerCase()),
      t,
      n,
    );
  let i = r + "\x00" + trimmed;
  if (H?.key === i) return isUnderAliasDir(H.aliasDirs, t, n);
  let s = !0,
    u = getWindowsAppsDirs(r, trimmed, (a) => {
      if (!Dt(a)) return resolve(a).toLowerCase();
      let l = e9(a)?.toLowerCase();
      if (l == null) return ((s = !1), resolve(a).toLowerCase());
      return l;
    });
  if (s) H = { key: i, aliasDirs: u };
  return isUnderAliasDir(u, t, n);
}
//@ chunk-aat7wt0p.js:13242-13442 placement
function getWindowsAppsDirs(t, n, e) {
  let r = [];
  if (t) r.push(L(e(t)) + sep + ["appdata", "local", "microsoft", "windowsapps"].join(sep));
  if (n) {
    let o = L(e(n)) + sep + ["microsoft", "windowsapps"].join(sep);
    if (!r.includes(o)) r.push(o);
  }
  return r;
}
//@ chunk-aat7wt0p.js:13442-13490 placement
function Dt(t) {
  return t.startsWith("/") && !Qn(t);
}
//@ chunk-aat7wt0p.js:13490-13621 placement
function isUnderAliasDir(t, n, e) {
  let r = L(e);
  for (let o of t) {
    if (!(o === r || o.startsWith(r + sep))) continue;
    if (n === o || n.startsWith(o + sep)) return !0;
  }
  return !1;
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
    y(parts[1] ?? "") !== "system" ||
    y(parts[2] ?? "") !== "volumes" ||
    y(parts[3] ?? "") !== "data"
  )
    return t;
  let sliced = parts.slice(4);
  for (let r of SYSTEM_ROOT_SUBDIRS) {
    let parts = r.split("/");
    if (sliced.length < parts.length) continue;
    if (parts.every((i, s) => y(sliced[s] ?? "") === y(i))) return "/" + sliced.join("/");
  }
  return t;
}
//@ chunk-aat7wt0p.js:14084-14135 placement
function y(t) {
  return t.toUpperCase().toLowerCase();
}
//@ chunk-aat7wt0p.js:14135-14220 placement = isDangerousFilePathToAutoEdit (1)
function getRepoRootForWorktreePath(path) {
  return basename(dirname(path)) === "worktrees" && basename(dirname(dirname(path))) === ".claude"
    ? dirname(dirname(dirname(path)))
    : null;
}

export { isSystemVolumePath, e9, getRepoRootForWorktreePath, classifyProtectedDir };
