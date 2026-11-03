/**
 * utils/pathResolution.ts
 *
 * 路径解析（允许缺失、WSL）（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aat7wt0p.js (18)
 * attribution: placement 18
 */
import { isAbsolute, resolve, dirname, parse, join, relative } from "path";
import { readlinkSync } from "fs";
import {
  stripWin32DevicePrefix,
  realpathNativeLongSync,
  isNetworkOrDevicePath,
  captureSyncResult,
} from "./fsJunctions.js";
import { hasDotSegment_2, hasDotSegment, isDosDevicePath } from "./pathClassification.js";
import { wslLocalhostParts, isNetworkRelatedPath } from "./networkPaths.js";
import { pathTraversesUntrustedLink } from "./settings/settings.js";

//@ chunk-aat7wt0p.js:14220-14548 placement
function realpathAllowMissing(t, { allowLocalWsl: n = false } = {}) {
  let e = (i) => n && neverAllowsLocalWsl(i);
  if (e(t)) return false;
  if (isUntrustedLinkPath(t)) return true;
  let r = stripWin32DevicePrefix(t);
  if (!isAbsolute(r)) return true;
  if (
    traversesOrResolvesUntrustedLink(r, {
      allowLocalWsl: n,
    })
  )
    return true;
  let o = resolve(r);
  for (;;) {
    let i = realpathNativeLongSync(o);
    if (i.real !== undefined) return isUntrustedLinkPath(i.real) && !e(i.real);
    if (i.code !== "ENOENT" && i.code !== "ENOTDIR") return true;
    let s = dirname(o);
    if (s === o) return false;
    o = s;
  }
}
//@ chunk-aat7wt0p.js:14548-14573 placement
/**
 * neverAllowsLocalWsl：编译期开关 stub：永远不认为本地 WSL 路径可信。
 */
function neverAllowsLocalWsl(t) {
  return false;
}
//@ chunk-aat7wt0p.js:14573-14598 placement
/**
 * passThroughPath：恒等函数，用于跨平台路径预处理。
 */
function passThroughPath(t) {
  return t;
}
//@ chunk-aat7wt0p.js:14598-14630 placement
var WSL_MOUNT_PATTERN = /^\/mnt\/[a-z](?:\/|$)/i;
//@ chunk-aat7wt0p.js:14630-14841 placement = chordToDisplayString (1)
function toWindowsPathFromWsl(t, n, distroDir = "") {
  if (!t.startsWith("/") || WSL_MOUNT_PATTERN.test(t) || hasDotSegment_2(t, "linux")) return;
  let r = distroDir === "" ? t : t.startsWith(distroDir + "/") ? t.slice(distroDir.length) : undefined;
  return r === undefined ? undefined : n.replace(/[\\/]+$/, "") + r.replace(/\//g, "\\");
}
//@ chunk-aat7wt0p.js:14841-14884 placement
/**
 * toWslPathNoop：WSL 路径转换的禁用版 stub，恒返回 undefined。
 */
function toWslPathNoop(t, { exactDots: n = false } = {}) {
  return;
}
//@ chunk-aat7wt0p.js:14884-15188 placement
function toWslPath(t, { exactDots: n = false } = {}) {
  let e = stripWin32DevicePrefix(t);
  if (n ? hasDotSegment_2(e, "win32") : hasDotSegment(e)) return;
  let match = /^([A-Za-z]):[\\/]+(.*)$/.exec(e);
  let replaced = wslLocalhostParts(e)?.rest.replace(/^[\\/]+/, "");
  let replaced_2 = (match?.[2] ?? replaced ?? "").replace(/\\/g, "/").replace(/\/+$/, "");
  if (replaced_2 === "") return;
  let s = match ? `/mnt/${match[1].toLowerCase()}/${replaced_2}` : `/${replaced_2}`;
  return isUntrustedLinkPath(s) ? undefined : s;
}
//@ chunk-aat7wt0p.js:15188-15226 placement
/**
 * isTrustedLocalWindowsPath：路径不在可疑拼写中即视为可信本地路径（Windows 分支）。
 */
function isTrustedLocalWindowsPath(pluginsDirectory) {
  return isUntrustedLinkPath(pluginsDirectory) && !neverAllowsLocalWsl(pluginsDirectory);
}
//@ chunk-aat7wt0p.js:15226-15283 placement
/**
 * isUntrustedLinkPath：去掉 Win32 设备前缀后判断是否为交接点/网络/设备路径。
 */
function isUntrustedLinkPath(t) {
  let n = stripWin32DevicePrefix(t);
  return isNetworkOrDevicePath(n) || isNetworkRelatedPath(n) || isDosDevicePath(n);
}
//@ chunk-aat7wt0p.js:15283-15447 placement
/**
 * 判断路径是否经过不可信链接（非绝对路径视为是）。
 */
function traversesUntrustedLink(t, { allowLocalWsl: n = false, eisdirIsFolder: e = false } = {}) {
  let r = stripWin32DevicePrefix(t);
  if (!isAbsolute(r)) return true;
  let { root } = parse(r);
  return pathTraversesUntrustedLink(root, splitPathSegments(r.slice(root.length)), 0, n, {
    eisdirIsFolder: e,
  });
}
//@ chunk-aat7wt0p.js:15447-15519 placement
/**
 * pathTraversesFromTrustedRoot：以给定根为可信起点检查剩余路径成分是否经过不可信链接。
 */
function pathTraversesFromTrustedRoot(t, n) {
  return pathTraversesUntrustedLink(t, splitPathSegments(n), 0, false, {
    trustedStart: true,
    trustedRoot: t,
  });
}
//@ chunk-aat7wt0p.js:15519-15967 placement
function resolvePathChain(t, n = dirname(t)) {
  let e = captureSyncResult(() => readlinkSync(t));
  if (e.value === undefined) return e.code !== "ENOENT" && e.code !== "EINVAL";
  let replaced = e.value.replace(/^\/{2,}/, "/");
  if (alwaysFalse(replaced)) return true;
  let o = false;
  if (o && hasDotSegment(replaced)) return true;
  let i = o ? join(parse(n).root, replaced) : replaced;
  let s = {
    trustedStart: true,
    trustedRoot: n,
  };
  if (isAbsolute(i)) {
    let l = relative(n, i);
    if (!hasDotSegment(i) && l !== "" && !isParentDirSegment(l) && !isAbsolute(l))
      return pathTraversesUntrustedLink(n, splitPathSegments(l), 1, false, s);
    return isUntrustedLinkPath(i) || traversesOrResolvesUntrustedLink(i);
  }
  if (isUntrustedLinkPath(i)) return true;
  let u = relative(n, dirname(t));
  let a = !isParentDirSegment(u) && !isAbsolute(u);
  return pathTraversesUntrustedLink(
    a ? n : dirname(t),
    [...(a ? splitPathSegments(u) : []), ...splitPathSegments(i)],
    1,
    false,
    s,
  );
}
//@ chunk-aat7wt0p.js:15967-16024 placement
/**
 * traversesOrResolvesUntrustedLink：直接路径或（Windows 本地路径）resolve 后任一经过不可信链接即为真。
 */
function traversesOrResolvesUntrustedLink(t, n = {}) {
  return traversesUntrustedLink(t, n) || (hasDotSegment(t) && traversesUntrustedLink(resolve(t), n));
}
//@ chunk-aat7wt0p.js:16024-16034 placement
/**
 * MAX_UNTRUSTED_PATH_DEPTH：路径成分遍历的深度上限（导出，供调用方复用）。
 */
var MAX_UNTRUSTED_PATH_DEPTH = 40;
//@ chunk-aat7wt0p.js:16034-16086 placement
/**
 * splitPathSegments：按 / 切分路径成分并丢弃空段。
 */
function splitPathSegments(t) {
  return t.split(/\/+/).filter(Boolean);
}
//@ chunk-aat7wt0p.js:16086-16129 placement
/**
 * isUntrustedLinkPathStrict：与 isUntrustedLinkPath 相同但可选参数为假时仍判可疑。
 */
function isUntrustedLinkPathStrict(t, n) {
  return isUntrustedLinkPath(t) && !(n && neverAllowsLocalWsl(t));
}
//@ chunk-aat7wt0p.js:16129-16182 placement
function isParentDirSegment(t) {
  return t === ".." || /^\.\.[\\/]/.test(t);
}
//@ chunk-aat7wt0p.js:16182-16206 placement
function alwaysFalse(t) {
  return false;
}
export {
  realpathAllowMissing,
  isTrustedLocalWindowsPath,
  isUntrustedLinkPath,
  traversesOrResolvesUntrustedLink,
  resolvePathChain,
  traversesUntrustedLink,
  isUntrustedLinkPathStrict,
  MAX_UNTRUSTED_PATH_DEPTH,
  alwaysFalse,
  splitPathSegments,
  passThroughPath,
  pathTraversesFromTrustedRoot,
  toWslPath,
  toWslPathNoop,
  toWindowsPathFromWsl,
  neverAllowsLocalWsl,
};
