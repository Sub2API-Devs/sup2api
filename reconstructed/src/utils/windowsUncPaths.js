/**
 * utils/windowsUncPaths.ts
 *
 * Windows UNC 长路径（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aat7wt0p.js (11)
 * attribution: placement 11
 */
import { realpathSync, realpath } from "fs";
import { hasWin32DevicePrefixSpelling, normalizeWin32Path } from "./fsJunctions.js";
import { isUncOrDevicePath, hasDotSegment } from "./pathClassification.js";
import { isWslUncPath } from "./networkPaths.js";

//@ chunk-aat7wt0p.js:11254-11391 placement
/**
 * 返回路径中第一个通配字符（*、?、成对的 [）的位置，没有则为 -1。
 */
function firstGlobCharIndex(t) {
  for (let i = 0; i < t.length; i++) {
    let e = t[i];
    if (e === "*" || e === "?") return i;
    if (e === "[" && t.indexOf("]", i + 1) !== -1) return i;
  }
  return -1;
}
//@ chunk-aat7wt0p.js:11391-11541 placement
function toUncLongPath(t) {
  if (t.startsWith("\\\\?\\UNC\\")) return "\\\\" + t.slice(8);
  if (t.startsWith("\\\\?\\") && t.length >= 7 && t[5] === ":") return t.slice(4);
  return t;
}
//@ chunk-aat7wt0p.js:11541-11834 placement
/**
 * 对 Windows 设备/长路径形式反复去掉 \\?\ 等前缀并合并开头的重复分隔符，得到普通路径。
 */
function stripLongPathPrefixes(t) {
  if (isWindowsDevicePath(t)) {
    let replaced = toUncLongPath(t).replace(/^([\\/])[\\/]+/, "$1");
    for (let i = 0; i < MAX_PREFIX_STRIPS && hasWin32DevicePrefixSpelling(replaced); i++) {
      replaced = normalizeWin32Path(replaced).replace(/^([\\/])[\\/]+/, "$1");
      let r = 1;
      while (
        replaced[r] === "?" &&
        replaced[r + 1] === "?" &&
        (r + 2 === replaced.length || isPathSeparator(replaced[r + 2]))
      ) {
        r += 3;
        while (isPathSeparator(replaced[r])) r++;
      }
      replaced = replaced.slice(0, 1) + replaced.slice(r);
    }
    return hasWin32DevicePrefixSpelling(replaced) ? replaced.slice(0, 1) : replaced;
  }
  return t;
}
//@ chunk-aat7wt0p.js:11834-11843 placement
var MAX_PREFIX_STRIPS = 4;
//@ chunk-aat7wt0p.js:11843-11883 placement
function isPathSeparator(t) {
  return t === "\\" || t === "/";
}
//@ chunk-aat7wt0p.js:11883-12019 placement
/**
 * 判断路径是否为 Windows 设备命名空间形式（卷 GUID、\\?\ 或 \\.\ 前缀等）。
 */
function isWindowsDevicePath(t) {
  if (/^\\\\\?\\volume\{/i.test(t)) return containsDotSegmentOrSlash(t);
  if (hasWin32DevicePrefixSpelling(t)) return true;
  let uncLongPath = toUncLongPath(t);
  if (uncLongPath !== t && containsDotSegmentOrSlash(uncLongPath)) return true;
  return isUncOrDevicePath(uncLongPath) && !isWslUncPath(uncLongPath);
}
//@ chunk-aat7wt0p.js:12019-12064 placement
function containsDotSegmentOrSlash(t) {
  return hasDotSegment(t) || t.includes("/");
}
//@ chunk-aat7wt0p.js:12064-12125 placement
/**
 * 原生 realpath 转长路径形式，失败返回 null。
 */
function nativeRealpathLong(t) {
  try {
    return toUncLongPath(realpathSync.native(t));
  } catch {
    return null;
  }
}
//@ chunk-aat7wt0p.js:12125-12231 placement
/**
 * 异步取原生 realpath 并转为长路径形式，失败返回 null。
 */
async function realpathNativeAsync(t) {
  return new Promise((resolve) => {
    try {
      realpath.native(t, (e, r) => {
        resolve(e ? null : toUncLongPath(r));
      });
    } catch {
      resolve(null);
    }
  });
}
//@ chunk-aat7wt0p.js:12231-12282 placement
/**
 * 原生 realpath，失败返回 null。
 */
function nativeRealpathOrNull(t) {
  try {
    return realpathSync(t);
  } catch {
    return null;
  }
}
//@ chunk-aat7wt0p.js:12282-12312 placement
var MAX_SYMLINK_HOPS = 4;
var MAX_REALPATH_DEPTH = 50;
var MAX_REALPATH_WORK = MAX_REALPATH_DEPTH * (MAX_SYMLINK_HOPS - 1);
var realpathCacheSlot;
export {
  nativeRealpathLong,
  toUncLongPath,
  realpathNativeAsync,
  isWindowsDevicePath,
  firstGlobCharIndex,
  stripLongPathPrefixes,
  MAX_REALPATH_DEPTH,
  nativeRealpathOrNull,
  MAX_REALPATH_WORK,
};
