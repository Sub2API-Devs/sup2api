/**
 * utils/fsJunctions.ts
 *
 * Windows junction 处理（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aat7wt0p.js (24)
 * attribution: placement 24
 */
import { realpathSync, realpath, readlinkSync } from "fs";
import { readlink } from "fs/promises";
import * as pathModule from "path";
import { resolve, isAbsolute, dirname, basename, relative, sep } from "path";
import { toUncLongPath, MAX_REALPATH_DEPTH, nativeRealpathLong } from "./windowsUncPaths.js";
import { isNetworkMountRoot } from "./networkPaths.js";
import { hasDotSegment, identity, isUncOrDevicePath } from "./pathClassification.js";
import { isReservedDeviceName } from "./windowsProfileFolders.js";
import { passThroughPath, traversesOrResolvesUntrustedLink } from "./pathResolution.js";

//@ chunk-aat7wt0p.js:17231-17309 placement
/**
 * 同步求真实路径（转 UNC 长路径），返回 {real, code}。
 */
function realpathNativeLongSync(path) {
  let result = captureSyncResult(() => toUncLongPath(realpathSync.native(path)));
  return {
    real: result.value,
    code: result.code,
  };
}
//@ chunk-aat7wt0p.js:17309-17452 placement
async function realpathNativeLong(path) {
  let result = await captureErrnoAsync(
    () =>
      new Promise((resolve, reject) => {
        realpath.native(path, (error, resolvedPath) => {
          if (error) reject(error);
          else resolve(toUncLongPath(resolvedPath));
        });
      }),
  );
  return {
    real: result.value,
    code: result.code,
  };
}
//@ chunk-aat7wt0p.js:17452-17554 placement = isConnectionError (1)
function getErrnoCode_2(err) {
  return err != null && typeof err === "object" && "code" in err && typeof err.code === "string"
    ? err.code
    : undefined;
}
//@ chunk-aat7wt0p.js:17554-17620 placement
/**
 * 执行同步函数并捕获 errno，返回 {value} 或 {code}。
 */
function captureSyncResult(fn) {
  try {
    return {
      value: attemptSyncOnce(fn),
    };
  } catch (error) {
    return {
      code: getErrnoCode_2(error),
    };
  }
}
//@ chunk-aat7wt0p.js:17620-17655 placement
function attemptSyncOnce(fn) {
  return attemptSync(fn, () => true);
}
//@ chunk-aat7wt0p.js:17655-17735 placement
/**
 * 返回一个带字节预算的重试判定函数（超过预算后不再重试）。
 */
function byteBudgetedRetry(budget) {
  let spent = 0;
  return (fn) =>
    attemptSync(fn, () => {
      if (spent + MAX_REALPATH_DEPTH > budget) return false;
      spent += MAX_REALPATH_DEPTH;
      return true;
    });
}
//@ chunk-aat7wt0p.js:17735-17813 placement
function attemptSync(fn, shouldRetry) {
  for (let i = 0; ; i++)
    try {
      return fn();
    } catch (error) {
      let errnoCode_2 = getErrnoCode_2(error);
      throw error;
    }
}
//@ chunk-aat7wt0p.js:17813-17937 placement
function classifyReadlinkError(error) {
  let errnoCode_2 = getErrnoCode_2(error);
  return errnoCode_2 === "EINVAL"
    ? {
        kind: "directory",
      }
    : errnoCode_2 === "ENOENT"
      ? {
          kind: "absent",
        }
      : {
          kind: "error",
          code: errnoCode_2,
          error,
        };
}
//@ chunk-aat7wt0p.js:17937-18071 placement
function readJunctionSync(dirPath) {
  let caughtError;
  let result = captureSyncResult(() => {
    try {
      return readlinkSync(dirPath);
    } catch (error) {
      caughtError = error;
      throw error;
    }
  });
  return result.value !== undefined
    ? {
        kind: "junction",
        target: result.value,
      }
    : classifyReadlinkError(caughtError);
}
//@ chunk-aat7wt0p.js:18071-18229 placement
async function readJunction(dirPath) {
  let caughtError;
  let result = await captureErrnoAsync(async () => {
    try {
      return await readlink(dirPath);
    } catch (error) {
      caughtError = error;
      throw error;
    }
  });
  return result.value !== undefined
    ? {
        kind: "junction",
        target: result.value,
      }
    : classifyReadlinkError(caughtError);
}
//@ chunk-aat7wt0p.js:18229-18331 placement
async function captureErrnoAsync(fn) {
  for (let i = 0; ; i++)
    try {
      return {
        value: await fn(),
      };
    } catch (error) {
      let code = getErrnoCode_2(error);
      return {
        code,
      };
    }
}
//@ chunk-aat7wt0p.js:18331-18367 placement
/**
 * 判断路径是否为网络路径或设备/UNC 拼写。
 */
function isNetworkOrDevicePath(path) {
  return isUncOrDeviceSpelling(path) || isNetworkMountRoot(path);
}
//@ chunk-aat7wt0p.js:18367-18501 placement
function hasAmbiguousWindowsPathSpelling(path) {
  return (
    hasDotSegment(path) ||
    /[. :](?=[\\/]|$)/.test(path) ||
    path
      .split(/[\\/]/)
      .some(
        (segment) =>
          isReservedDeviceName(segment) ||
          isReservedDeviceName(segment.slice(0, Math.max(0, segment.indexOf(":")))),
      )
  );
}
//@ chunk-aat7wt0p.js:18501-18686 placement
function stripWin32DevicePrefix(path) {
  let match = /^(?:\\\\[?.]\\|\\\?\?\\)(?=[A-Za-z]:[\\/])/.exec(path);
  if (!match) return path;
  let sliced = path.slice(match[0].length);
  let path_2 = sliced.slice(2);
  return (match[0].includes("\\") && path_2.includes("/")) || hasAmbiguousWindowsPathSpelling(path_2)
    ? path
    : sliced;
}
//@ chunk-aat7wt0p.js:18686-19084 placement
/**
 * 把路径转成可比较形式：去掉 Win32 设备前缀；UNC/设备路径或可疑路径只做 resolve；否则对最深已存在祖先求 realpath 后拼回剩余部分，NFC 规范化，foldCase 时转小写。
 */
function toComparablePath(path, { foldCase, knownNotSuspect = false } = {}) {
  foldCase ??= false;
  path = stripWin32DevicePrefix(path);
  if (isUncOrDeviceSpelling(path) || isNetworkMountRoot(path)) {
    let normalized = passThroughPath(resolve(passThroughPath(path))).normalize("NFC");
    return foldCase ? normalized.toLowerCase() : normalized;
  }
  if (!knownNotSuspect && traversesOrResolvesUntrustedLink(isAbsolute(path) ? path : resolve(path))) {
    let normalized = resolve(path).normalize("NFC");
    return foldCase ? normalized.toLowerCase() : normalized;
  }
  let currentPath = resolve(path);
  let missingParts = [];
  let realPath = nativeRealpathLong(currentPath);
  while (realPath === null && dirname(currentPath) !== currentPath) {
    missingParts.unshift(basename(currentPath));
    currentPath = dirname(currentPath);
    realPath = nativeRealpathLong(currentPath);
  }
  realPath =
    missingParts.length > 0 ? resolve(realPath ?? currentPath, ...missingParts) : (realPath ?? currentPath);
  let normalized = passThroughPath(realPath).normalize("NFC");
  return foldCase ? normalized.toLowerCase() : normalized;
}
//@ chunk-aat7wt0p.js:19084-19251 placement
/**
 * 判断路径 t 是否等于或位于 n 之下（两者先转为可比较形式，除非 alreadyComparable），用 relative 结果判定，不受 .. 前缀误判。
 */
function isPathWithin(parentPath, childPath, { alreadyComparable = false, foldCase } = {}) {
  let relPath = relative(
    alreadyComparable
      ? parentPath
      : toComparablePath(parentPath, {
          foldCase,
        }),
    alreadyComparable
      ? childPath
      : toComparablePath(childPath, {
          foldCase,
        }),
  );
  return relPath === "" || (!isAbsolute(relPath) && relPath !== ".." && !relPath.startsWith(`..${sep}`));
}
//@ chunk-aat7wt0p.js:19251-19328 placement
/**
 * 判断两个路径的 realpath 是否相同（都解析成功且可比较形式相等）。
 */
function isSameRealPath(leftPath, rightPath) {
  let leftReal = nativeRealpathLong(leftPath);
  let rightReal = nativeRealpathLong(rightPath);
  return (
    leftReal !== null && rightReal !== null && canonicalPathKey(leftReal) === canonicalPathKey(rightReal)
  );
}
//@ chunk-aat7wt0p.js:19328-19412 placement
/**
 * 判断两个路径的 realpath 是否构成前缀关系。
 */
function isRealPathSegmentPrefix(prefixPath, fullPath) {
  let prefixReal = nativeRealpathLong(prefixPath);
  let fullReal = nativeRealpathLong(fullPath);
  return (
    prefixReal !== null &&
    fullReal !== null &&
    isSegmentPrefix(canonicalPathKey(prefixReal), canonicalPathKey(fullReal), /\//)
  );
}
//@ chunk-aat7wt0p.js:19412-19575 placement
function isSegmentPrefix(prefix, full, sepPattern) {
  let regExp = new RegExp(`(?:${sepPattern.source})+$`);
  let parts = prefix.replace(regExp, "").split(sepPattern);
  let parts_2 = full.replace(regExp, "").split(sepPattern);
  return parts.length <= parts_2.length && parts.every((prefixPart, index) => prefixPart === parts_2[index]);
}
//@ chunk-aat7wt0p.js:19575-19607 placement
function canonicalPathKey(path) {
  return identity(passThroughPath(path));
}
//@ chunk-aat7wt0p.js:19607-19635 placement
/**
 * 判断路径是否为 UNC 或设备路径拼写。
 */
function isUncOrDeviceSpelling(path) {
  return isUncOrDevicePath(path);
}
//@ chunk-aat7wt0p.js:19635-19702 placement
/**
 * 判断路径是否带 Win32 设备前缀（\\?\ 或 /\?\?/）。
 */
function hasWin32DevicePrefixSpelling(path) {
  return (
    WIN32_DEVICE_PREFIX_RE.test(path) ||
    (path.includes("??") && WIN32_DEVICE_PREFIX_RE.test(normalizeWin32Path(path)))
  );
}
//@ chunk-aat7wt0p.js:19702-19727 placement
var WIN32_DEVICE_PREFIX_RE = /^[\\/]\?\?[\\/]/;
//@ chunk-aat7wt0p.js:19727-19780 placement
/**
 * 在 win32 语义下规范化路径。
 */
function normalizeWin32Path(path) {
  return pathModule.win32 ? pathModule.win32.normalize(path) : path;
}
export {
  isPathWithin,
  hasWin32DevicePrefixSpelling,
  isUncOrDeviceSpelling,
  realpathNativeLongSync,
  isSameRealPath,
  stripWin32DevicePrefix,
  realpathNativeLong,
  toComparablePath,
  captureSyncResult,
  normalizeWin32Path,
  isNetworkOrDevicePath,
  isRealPathSegmentPrefix,
  readJunction,
  readJunctionSync,
  byteBudgetedRetry,
};
