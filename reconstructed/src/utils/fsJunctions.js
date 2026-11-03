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
function realpathNativeLongSync(t) {
  let n = captureSyncResult(() => toUncLongPath(realpathSync.native(t)));
  return {
    real: n.value,
    code: n.code,
  };
}
//@ chunk-aat7wt0p.js:17309-17452 placement
async function realpathNativeLong(t) {
  let n = await captureErrnoAsync(
    () =>
      new Promise((resolve, reject) => {
        realpath.native(t, (o, i) => {
          if (o) reject(o);
          else resolve(toUncLongPath(i));
        });
      }),
  );
  return {
    real: n.value,
    code: n.code,
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
function captureSyncResult(t) {
  try {
    return {
      value: attemptSyncOnce(t),
    };
  } catch (error) {
    return {
      code: getErrnoCode_2(error),
    };
  }
}
//@ chunk-aat7wt0p.js:17620-17655 placement
function attemptSyncOnce(t) {
  return attemptSync(t, () => true);
}
//@ chunk-aat7wt0p.js:17655-17735 placement
/**
 * 返回一个带字节预算的重试判定函数（超过预算后不再重试）。
 */
function byteBudgetedRetry(t) {
  let n = 0;
  return (e) =>
    attemptSync(e, () => {
      if (n + MAX_REALPATH_DEPTH > t) return false;
      n += MAX_REALPATH_DEPTH;
      return true;
    });
}
//@ chunk-aat7wt0p.js:17735-17813 placement
function attemptSync(t, n) {
  for (let i = 0; ; i++)
    try {
      return t();
    } catch (error) {
      let errnoCode_2 = getErrnoCode_2(error);
      throw error;
    }
}
//@ chunk-aat7wt0p.js:17813-17937 placement
function classifyReadlinkError(t) {
  let errnoCode_2 = getErrnoCode_2(t);
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
          error: t,
        };
}
//@ chunk-aat7wt0p.js:17937-18071 placement
function readJunctionSync(dirPath) {
  let n;
  let e = captureSyncResult(() => {
    try {
      return readlinkSync(dirPath);
    } catch (error) {
      n = error;
      throw error;
    }
  });
  return e.value !== undefined
    ? {
        kind: "junction",
        target: e.value,
      }
    : classifyReadlinkError(n);
}
//@ chunk-aat7wt0p.js:18071-18229 placement
async function readJunction(t) {
  let n;
  let e = await captureErrnoAsync(async () => {
    try {
      return await readlink(t);
    } catch (error) {
      n = error;
      throw error;
    }
  });
  return e.value !== undefined
    ? {
        kind: "junction",
        target: e.value,
      }
    : classifyReadlinkError(n);
}
//@ chunk-aat7wt0p.js:18229-18331 placement
async function captureErrnoAsync(t) {
  for (let i = 0; ; i++)
    try {
      return {
        value: await t(),
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
function isNetworkOrDevicePath(t) {
  return isUncOrDeviceSpelling(t) || isNetworkMountRoot(t);
}
//@ chunk-aat7wt0p.js:18367-18501 placement
function hasAmbiguousWindowsPathSpelling(t) {
  return (
    hasDotSegment(t) ||
    /[. :](?=[\\/]|$)/.test(t) ||
    t
      .split(/[\\/]/)
      .some((n) => isReservedDeviceName(n) || isReservedDeviceName(n.slice(0, Math.max(0, n.indexOf(":")))))
  );
}
//@ chunk-aat7wt0p.js:18501-18686 placement
function stripWin32DevicePrefix(t) {
  let match = /^(?:\\\\[?.]\\|\\\?\?\\)(?=[A-Za-z]:[\\/])/.exec(t);
  if (!match) return t;
  let sliced = t.slice(match[0].length);
  let sliced_2 = sliced.slice(2);
  return (match[0].includes("\\") && sliced_2.includes("/")) || hasAmbiguousWindowsPathSpelling(sliced_2)
    ? t
    : sliced;
}
//@ chunk-aat7wt0p.js:18686-19084 placement
/**
 * 把路径转成可比较形式：去掉 Win32 设备前缀；UNC/设备路径或可疑路径只做 resolve；否则对最深已存在祖先求 realpath 后拼回剩余部分，NFC 规范化，foldCase 时转小写。
 */
function toComparablePath(t, { foldCase: n, knownNotSuspect: e = false } = {}) {
  n ??= false;
  t = stripWin32DevicePrefix(t);
  if (isUncOrDeviceSpelling(t) || isNetworkMountRoot(t)) {
    let normalized = passThroughPath(resolve(passThroughPath(t))).normalize("NFC");
    return n ? normalized.toLowerCase() : normalized;
  }
  if (!e && traversesOrResolvesUntrustedLink(isAbsolute(t) ? t : resolve(t))) {
    let normalized = resolve(t).normalize("NFC");
    return n ? normalized.toLowerCase() : normalized;
  }
  let r = resolve(t);
  let o = [];
  let i = nativeRealpathLong(r);
  while (i === null && dirname(r) !== r) {
    o.unshift(basename(r));
    r = dirname(r);
    i = nativeRealpathLong(r);
  }
  i = o.length > 0 ? resolve(i ?? r, ...o) : (i ?? r);
  let normalized = passThroughPath(i).normalize("NFC");
  return n ? normalized.toLowerCase() : normalized;
}
//@ chunk-aat7wt0p.js:19084-19251 placement
/**
 * 判断路径 t 是否等于或位于 n 之下（两者先转为可比较形式，除非 alreadyComparable），用 relative 结果判定，不受 .. 前缀误判。
 */
function isPathWithin(t, n, { alreadyComparable: e = false, foldCase: r } = {}) {
  let o = relative(
    e
      ? t
      : toComparablePath(t, {
          foldCase: r,
        }),
    e
      ? n
      : toComparablePath(n, {
          foldCase: r,
        }),
  );
  return o === "" || (!isAbsolute(o) && o !== ".." && !o.startsWith(`..${sep}`));
}
//@ chunk-aat7wt0p.js:19251-19328 placement
/**
 * 判断两个路径的 realpath 是否相同（都解析成功且可比较形式相等）。
 */
function isSameRealPath(t, n) {
  let e = nativeRealpathLong(t);
  let r = nativeRealpathLong(n);
  return e !== null && r !== null && canonicalPathKey(e) === canonicalPathKey(r);
}
//@ chunk-aat7wt0p.js:19328-19412 placement
/**
 * 判断两个路径的 realpath 是否构成前缀关系。
 */
function isRealPathSegmentPrefix(t, n) {
  let e = nativeRealpathLong(t);
  let r = nativeRealpathLong(n);
  return e !== null && r !== null && isSegmentPrefix(canonicalPathKey(e), canonicalPathKey(r), /\//);
}
//@ chunk-aat7wt0p.js:19412-19575 placement
function isSegmentPrefix(t, n, e) {
  let regExp = new RegExp(`(?:${e.source})+$`);
  let parts = t.replace(regExp, "").split(e);
  let parts_2 = n.replace(regExp, "").split(e);
  return parts.length <= parts_2.length && parts.every((s, u) => s === parts_2[u]);
}
//@ chunk-aat7wt0p.js:19575-19607 placement
function canonicalPathKey(t) {
  return identity(passThroughPath(t));
}
//@ chunk-aat7wt0p.js:19607-19635 placement
/**
 * 判断路径是否为 UNC 或设备路径拼写。
 */
function isUncOrDeviceSpelling(t) {
  return isUncOrDevicePath(t);
}
//@ chunk-aat7wt0p.js:19635-19702 placement
/**
 * 判断路径是否带 Win32 设备前缀（\\?\ 或 /\?\?/）。
 */
function hasWin32DevicePrefixSpelling(t) {
  return (
    WIN32_DEVICE_PREFIX_RE.test(t) || (t.includes("??") && WIN32_DEVICE_PREFIX_RE.test(normalizeWin32Path(t)))
  );
}
//@ chunk-aat7wt0p.js:19702-19727 placement
var WIN32_DEVICE_PREFIX_RE = /^[\\/]\?\?[\\/]/;
//@ chunk-aat7wt0p.js:19727-19780 placement
/**
 * 在 win32 语义下规范化路径。
 */
function normalizeWin32Path(t) {
  return pathModule.win32 ? pathModule.win32.normalize(t) : t;
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
