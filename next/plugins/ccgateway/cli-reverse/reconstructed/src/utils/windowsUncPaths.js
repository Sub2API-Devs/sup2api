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
function firstGlobCharIndex(text) {
  for (let i = 0; i < text.length; i++) {
    let char = text[i];
    if (char === "*" || char === "?") return i;
    if (char === "[" && text.indexOf("]", i + 1) !== -1) return i;
  }
  return -1;
}
//@ chunk-aat7wt0p.js:11391-11541 placement
function toUncLongPath(path) {
  if (path.startsWith("\\\\?\\UNC\\")) return "\\\\" + path.slice(8);
  if (path.startsWith("\\\\?\\") && path.length >= 7 && path[5] === ":") return path.slice(4);
  return path;
}
//@ chunk-aat7wt0p.js:11541-11834 placement
/**
 * 对 Windows 设备/长路径形式反复去掉 \\?\ 等前缀并合并开头的重复分隔符，得到普通路径。
 */
function stripLongPathPrefixes(path) {
  if (isWindowsDevicePath(path)) {
    let path_2 = toUncLongPath(path).replace(/^([\\/])[\\/]+/, "$1");
    for (let i = 0; i < MAX_PREFIX_STRIPS && hasWin32DevicePrefixSpelling(path_2); i++) {
      path_2 = normalizeWin32Path(path_2).replace(/^([\\/])[\\/]+/, "$1");
      let index = 1;
      while (
        path_2[index] === "?" &&
        path_2[index + 1] === "?" &&
        (index + 2 === path_2.length || isPathSeparator(path_2[index + 2]))
      ) {
        index += 3;
        while (isPathSeparator(path_2[index])) index++;
      }
      path_2 = path_2.slice(0, 1) + path_2.slice(index);
    }
    return hasWin32DevicePrefixSpelling(path_2) ? path_2.slice(0, 1) : path_2;
  }
  return path;
}
//@ chunk-aat7wt0p.js:11834-11843 placement
var MAX_PREFIX_STRIPS = 4;
//@ chunk-aat7wt0p.js:11843-11883 placement
function isPathSeparator(char) {
  return char === "\\" || char === "/";
}
//@ chunk-aat7wt0p.js:11883-12019 placement
/**
 * 判断路径是否为 Windows 设备命名空间形式（卷 GUID、\\?\ 或 \\.\ 前缀等）。
 */
function isWindowsDevicePath(path) {
  if (/^\\\\\?\\volume\{/i.test(path)) return containsDotSegmentOrSlash(path);
  if (hasWin32DevicePrefixSpelling(path)) return true;
  let path_2 = toUncLongPath(path);
  if (path_2 !== path && containsDotSegmentOrSlash(path_2)) return true;
  return isUncOrDevicePath(path_2) && !isWslUncPath(path_2);
}
//@ chunk-aat7wt0p.js:12019-12064 placement
function containsDotSegmentOrSlash(path) {
  return hasDotSegment(path) || path.includes("/");
}
//@ chunk-aat7wt0p.js:12064-12125 placement
/**
 * 原生 realpath 转长路径形式，失败返回 null。
 */
function nativeRealpathLong(path) {
  try {
    return toUncLongPath(realpathSync.native(path));
  } catch {
    return null;
  }
}
//@ chunk-aat7wt0p.js:12125-12231 placement
/**
 * 异步取原生 realpath 并转为长路径形式，失败返回 null。
 */
async function realpathNativeAsync(path) {
  return new Promise((resolve) => {
    try {
      realpath.native(path, (error, resolvedPath) => {
        resolve(error ? null : toUncLongPath(resolvedPath));
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
function nativeRealpathOrNull(path) {
  try {
    return realpathSync(path);
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
