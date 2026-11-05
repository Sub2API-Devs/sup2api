/**
 * utils/windowsPathNames.ts
 *
 * Windows 路径名（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-20pzh3fp.js (3), chunk-eannrp4k.js (8)
 * attribution: placement 11
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { trimEndChars, firstLineOf } from "./stringUtils.js";
import { isReservedDeviceName } from "./windowsProfileFolders.js";

//@ chunk-20pzh3fp.js:191-290 placement
/**
 * 出生时间（与 ctime 不同且大于 0）作为身份盐。
 */
function birthTimeSalt(stats) {
  return stats.birthtimeNs > 0n && stats.birthtimeNs !== stats.ctimeNs
    ? stats.birthtimeNs.toString()
    : undefined;
}
//@ chunk-20pzh3fp.js:290-344 placement
function normalizeTimestamp(value) {
  return value >= -(2n ** 63n) && value < -1n ? value + 2n ** 64n : value;
}
//@ chunk-20pzh3fp.js:344-381 placement
/**
 * 两个大整数时间戳（按无符号归一）是否相同。
 */
function sameTimestamp(a, b) {
  return normalizeTimestamp(a) === normalizeTimestamp(b);
}
//@ chunk-eannrp4k.js:266-305 placement
function normalizedName(name) {
  return trimEndChars(firstLineOf(name, "."), " ");
}
//@ chunk-eannrp4k.js:305-357 placement
/**
 * 是否是 CONIN$/CONOUT$ 设备名。
 */
function isConDeviceName(name) {
  return /^con(in|out)\$$/i.test(normalizedName(name));
}
//@ chunk-eannrp4k.js:357-385 placement
var WINDOWS_UNSAFE_CHAR_RE = /[<>"|?*\\\x00-\x1f]/;
//@ chunk-eannrp4k.js:385-442 placement
/**
 * 路径是否含 Windows 非法字符段。
 */
function hasUnsafeCharSegment(path) {
  return path.split("/").some((segment) => WINDOWS_UNSAFE_CHAR_RE.test(segment));
}
//@ chunk-eannrp4k.js:442-579 placement
/**
 * 判断路径中是否有在 Windows 上不安全的段：含冒号、以点或空格结尾、保留设备名等。
 */
function hasWindowsUnsafeSegment(path) {
  return path
    .split("/")
    .some(
      (segment) =>
        segment.includes(":") ||
        segment.endsWith(".") ||
        segment.endsWith(" ") ||
        isReservedDeviceName(normalizedName(segment).replace(/ {2,}/g, " ")) ||
        isConDeviceName(segment),
    );
}
//@ chunk-eannrp4k.js:579-617 placement
var DOS_SHORT_NAME_RE = /^[^.]{1,6}~\d+(\.[^.]{1,3})?$/;
//@ chunk-eannrp4k.js:617-657 placement
function normalizedBeforeColon(name) {
  return trimEndChars(firstLineOf(name, ":"), ". ");
}
//@ chunk-eannrp4k.js:657-717 placement
/**
 * 路径里是否有 DOS 短名段。
 */
function hasDosShortNameSegment(path) {
  return path.split("/").some((segment) => DOS_SHORT_NAME_RE.test(normalizedBeforeColon(segment)));
}
export {
  sameTimestamp,
  hasDosShortNameSegment,
  hasWindowsUnsafeSegment,
  isConDeviceName,
  birthTimeSalt,
  hasUnsafeCharSegment,
};
