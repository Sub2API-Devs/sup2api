/**
 * utils/pathClassification.ts
 *
 * 路径基础判断（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-za46rn2f.js (16)
 * attribution: placement 16
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { hasWin32DevicePrefixSpelling } from "./fsJunctions.js";
import { launchedCwd } from "./cwd.js";

//@ chunk-za46rn2f.js:3049-3258 placement
/**
 * 把 \\\\?\\C: 或 \\\\localhost\\C$ 形式转为盘符路径。
 */
function normalizeDosDevicePath(inputPath) {
  let match =
    /^[\\/]{2}(?:[?.][\\/]([A-Za-z]):|(?:localhost|127\.0\.0\.1)[\\/]([A-Za-z])\$)(?=$|[\\/])/i.exec(
      inputPath,
    );
  if (match === null) return inputPath;
  let sliced = inputPath.slice(match[0].length);
  return `${match[1] ?? match[2]}:${sliced === "" ? "\\" : sliced}`;
}
//@ chunk-za46rn2f.js:3428-3452 placement
/**
 * 恒等函数（路径不变换）。
 */
function identity(value) {
  return value;
}
//@ chunk-za46rn2f.js:3452-3500 placement
/**
 * 判断路径是否为 UNC 或设备路径。
 */
function isUncOrDevicePath(inputPath) {
  return /^[\\/]{2}/.test(inputPath) || hasWin32DevicePrefixSpelling(inputPath);
}
//@ chunk-za46rn2f.js:3500-3554 placement
/**
 * 判断路径是否含 .. 段。
 */
function hasDotDotSegment(inputPath) {
  return /(^|[\\/])\.\.([\\/]|$)/.test(inputPath);
}
//@ chunk-za46rn2f.js:3554-3593 placement
/**
 * 判断字符串是否含反斜杠。
 */
function hasBackslash(inputPath) {
  return inputPath.includes("\\");
}
//@ chunk-za46rn2f.js:3593-3627 placement
/**
 * 判断当前工作目录是否含反斜杠。
 */
function cwdHasBackslash() {
  return hasBackslash(launchedCwd ?? "");
}
//@ chunk-za46rn2f.js:3627-3674 placement
/**
 * 判断路径是否以 \\?\ 设备前缀开头。
 */
function isDevicePrefixPath(inputPath) {
  return /^[\\/]\?\?[\\/]/.test(inputPath);
}
//@ chunk-za46rn2f.js:3674-3857 placement
/**
 * UNC 路径主机（小写）。
 */
function uncHostOf(inputPath) {
  if (/^[\\/]{2}[?.][\\/](?!unc[\\/])/i.test(inputPath)) return null;
  return (
    inputPath
      .match(/^[\\/]{2}(?:[?.][\\/]unc[\\/])?([^\\/]+)/i)?.[1]
      ?.replace(/[A-Z]/g, (upper) => upper.toLowerCase()) ?? null
  );
}
//@ chunk-za46rn2f.js:3857-3919 placement
/**
 * 判断路径是否含 . 或 .. 段（允许尾随点/空格）。
 */
function hasDotSegment(inputPath) {
  return /(^|[\\/])\.{1,2}[. ]*([\\/]|$)/.test(inputPath);
}
//@ chunk-za46rn2f.js:3919-3993 placement
/**
 * 判断路径是否有 ".. " 这类带空格的上级段。
 */
function hasDotDotWithSpaceSegment(inputPath) {
  return inputPath.split(/[/\\]/).some((segment) => /^\.\. [ .]*$/.test(segment));
}
//@ chunk-za46rn2f.js:3993-4104 placement
/**
 * 路径含 . 或 .. 段。
 */
function hasDotSegment_2(inputPath, platform = "linux") {
  return platform === "win32"
    ? /(^|[\\/])\.{1,2}([\\/]|$)/.test(inputPath)
    : /(^|\/)\.{1,2}(\/|$)/.test(inputPath);
}
//@ chunk-za46rn2f.js:4104-4133 placement
/**
 * hasDotSegment 的别名。
 */
function hasDotSegmentAlias(inputPath) {
  return hasDotSegment_2(inputPath);
}
//@ chunk-za46rn2f.js:4133-4183 placement
/**
 * 判断路径是否为设备命名空间形式（//?/）。
 */
function isDeviceNamespacePath(inputPath) {
  return /^[\\/]{2}[?.][\\/]/.test(inputPath);
}
//@ chunk-za46rn2f.js:4183-4479 placement
/**
 * macOS /.vol、/.file 等特殊路径。
 */
function isMacSpecialPath(inputPath) {
  if (!/\/\.(?:vol|file|nofollow|resolve)(?:\/|$)/i.test(inputPath)) return false;
  if (!inputPath.startsWith("/")) return false;
  let segments = [];
  for (let segment of inputPath.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      segments.pop();
      continue;
    }
    segments.push(segment);
    if (segments.length === 1 && /^\.(?:vol|file|nofollow|resolve)$/i.test(segment)) return true;
  }
  return false;
}
//@ chunk-za46rn2f.js:4479-4565 placement
/**
 * 判断路径是否为 DosDevices/GLOBALROOT/Device 等设备路径。
 */
function isDosDevicePath(inputPath) {
  return /^[\\/](GLOBAL\?\?|GLOBALROOT|DosDevices|Device)[\\/]/i.test(inputPath);
}
//@ chunk-za46rn2f.js:4565-4683 placement
/**
 * 网络路径且主机与参考路径不同。
 */
function isForeignNetworkPath(inputPath, referencePath) {
  if (!isUncOrDevicePath(inputPath)) return false;
  if (isDeviceNamespacePath(inputPath) || hasWin32DevicePrefixSpelling(inputPath)) return true;
  if (hasDotSegment(inputPath)) return true;
  let host = uncHostOf(inputPath);
  return host === null || host !== uncHostOf(referencePath);
}
export {
  isUncOrDevicePath,
  identity,
  hasDotDotSegment,
  hasDotSegment_2,
  hasDotDotWithSpaceSegment,
  hasDotSegmentAlias,
  uncHostOf,
  isDeviceNamespacePath,
  isDevicePrefixPath,
  normalizeDosDevicePath,
  hasDotSegment,
  isMacSpecialPath,
  isForeignNetworkPath,
  hasBackslash,
  isDosDevicePath,
  cwdHasBackslash,
};
