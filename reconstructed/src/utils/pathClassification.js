/**
 * utils/pathClassification.ts
 *
 * 路径基础判断（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aat7wt0p.js (16)
 * attribution: placement 16
 */
import { hasWin32DevicePrefixSpelling } from "./fsJunctions.js";
import { launchedCwd } from "./cwd.js";

//@ chunk-aat7wt0p.js:3049-3258 placement
/**
 * 把 \\\\?\\C: 或 \\\\localhost\\C$ 形式转为盘符路径。
 */
function normalizeDosDevicePath(t) {
  let match =
    /^[\\/]{2}(?:[?.][\\/]([A-Za-z]):|(?:localhost|127\.0\.0\.1)[\\/]([A-Za-z])\$)(?=$|[\\/])/i.exec(t);
  if (match === null) return t;
  let sliced = t.slice(match[0].length);
  return `${match[1] ?? match[2]}:${sliced === "" ? "\\" : sliced}`;
}
//@ chunk-aat7wt0p.js:3428-3452 placement
/**
 * 恒等函数（路径不变换）。
 */
function identity(t) {
  return t;
}
//@ chunk-aat7wt0p.js:3452-3500 placement
/**
 * 判断路径是否为 UNC 或设备路径。
 */
function isUncOrDevicePath(t) {
  return /^[\\/]{2}/.test(t) || hasWin32DevicePrefixSpelling(t);
}
//@ chunk-aat7wt0p.js:3500-3554 placement
/**
 * 判断路径是否含 .. 段。
 */
function hasDotDotSegment(t) {
  return /(^|[\\/])\.\.([\\/]|$)/.test(t);
}
//@ chunk-aat7wt0p.js:3554-3593 placement
/**
 * 判断字符串是否含反斜杠。
 */
function hasBackslash(t) {
  return t.includes("\\");
}
//@ chunk-aat7wt0p.js:3593-3627 placement
/**
 * 判断当前工作目录是否含反斜杠。
 */
function cwdHasBackslash() {
  return hasBackslash(launchedCwd ?? "");
}
//@ chunk-aat7wt0p.js:3627-3674 placement
/**
 * 判断路径是否以 \\?\ 设备前缀开头。
 */
function isDevicePrefixPath(t) {
  return /^[\\/]\?\?[\\/]/.test(t);
}
//@ chunk-aat7wt0p.js:3674-3857 placement
/**
 * UNC 路径主机（小写）。
 */
function uncHostOf(t) {
  if (/^[\\/]{2}[?.][\\/](?!unc[\\/])/i.test(t)) return null;
  return (
    t.match(/^[\\/]{2}(?:[?.][\\/]unc[\\/])?([^\\/]+)/i)?.[1]?.replace(/[A-Z]/g, (n) => n.toLowerCase()) ??
    null
  );
}
//@ chunk-aat7wt0p.js:3857-3919 placement
/**
 * 判断路径是否含 . 或 .. 段（允许尾随点/空格）。
 */
function hasDotSegment(t) {
  return /(^|[\\/])\.{1,2}[. ]*([\\/]|$)/.test(t);
}
//@ chunk-aat7wt0p.js:3919-3993 placement
/**
 * 判断路径是否有 ".. " 这类带空格的上级段。
 */
function hasDotDotWithSpaceSegment(t) {
  return t.split(/[/\\]/).some((n) => /^\.\. [ .]*$/.test(n));
}
//@ chunk-aat7wt0p.js:3993-4104 placement
/**
 * 路径含 . 或 .. 段。
 */
function hasDotSegment_2(t, n = "linux") {
  return n === "win32" ? /(^|[\\/])\.{1,2}([\\/]|$)/.test(t) : /(^|\/)\.{1,2}(\/|$)/.test(t);
}
//@ chunk-aat7wt0p.js:4104-4133 placement
/**
 * hasDotSegment 的别名。
 */
function hasDotSegmentAlias(t) {
  return hasDotSegment_2(t);
}
//@ chunk-aat7wt0p.js:4133-4183 placement
/**
 * 判断路径是否为设备命名空间形式（//?/）。
 */
function isDeviceNamespacePath(t) {
  return /^[\\/]{2}[?.][\\/]/.test(t);
}
//@ chunk-aat7wt0p.js:4183-4479 placement
/**
 * macOS /.vol、/.file 等特殊路径。
 */
function isMacSpecialPath(t) {
  if (!/\/\.(?:vol|file|nofollow|resolve)(?:\/|$)/i.test(t)) return false;
  if (!t.startsWith("/")) return false;
  let n = [];
  for (let e of t.split("/")) {
    if (e === "" || e === ".") continue;
    if (e === "..") {
      n.pop();
      continue;
    }
    n.push(e);
    if (n.length === 1 && /^\.(?:vol|file|nofollow|resolve)$/i.test(e)) return true;
  }
  return false;
}
//@ chunk-aat7wt0p.js:4479-4565 placement
/**
 * 判断路径是否为 DosDevices/GLOBALROOT/Device 等设备路径。
 */
function isDosDevicePath(t) {
  return /^[\\/](GLOBAL\?\?|GLOBALROOT|DosDevices|Device)[\\/]/i.test(t);
}
//@ chunk-aat7wt0p.js:4565-4683 placement
/**
 * 网络路径且主机与参考路径不同。
 */
function isForeignNetworkPath(t, n) {
  if (!isUncOrDevicePath(t)) return false;
  if (isDeviceNamespacePath(t) || hasWin32DevicePrefixSpelling(t)) return true;
  if (hasDotSegment(t)) return true;
  let e = uncHostOf(t);
  return e === null || e !== uncHostOf(n);
}
export {
  identity,
  isUncOrDevicePath,
  isDevicePrefixPath,
  hasDotSegment,
  hasDotDotSegment,
  uncHostOf,
  isDeviceNamespacePath,
  normalizeDosDevicePath,
  isMacSpecialPath,
  hasDotSegmentAlias,
  isForeignNetworkPath,
  hasBackslash,
  hasDotDotWithSpaceSegment,
  isDosDevicePath,
  hasDotSegment_2,
  cwdHasBackslash,
};
