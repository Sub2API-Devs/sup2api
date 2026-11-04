/**
 * utils/windowsPathNames.ts
 *
 * Windows 路径名（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tjb2h3gm.js (11)
 * attribution: placement 11
 */
import { trimEndChars, firstLineOf } from "./stringUtils.js";
import { isReservedDeviceName } from "./windowsProfileFolders.js";

//@ chunk-tjb2h3gm.js:267-366 placement
/**
 * 出生时间（与 ctime 不同且大于 0）作为身份盐。
 */
function birthTimeSalt(stats) {
  return stats.birthtimeNs > 0n && stats.birthtimeNs !== stats.ctimeNs
    ? stats.birthtimeNs.toString()
    : undefined;
}
//@ chunk-tjb2h3gm.js:366-420 placement
function normalizeTimestamp(value) {
  return value >= -(2n ** 63n) && value < -1n ? value + 2n ** 64n : value;
}
//@ chunk-tjb2h3gm.js:420-457 placement
/**
 * 两个大整数时间戳（按无符号归一）是否相同。
 */
function sameTimestamp(a, b) {
  return normalizeTimestamp(a) === normalizeTimestamp(b);
}
//@ chunk-tjb2h3gm.js:457-497 placement
function normalizedName(name) {
  return trimEndChars(firstLineOf(name, "."), " ");
}
//@ chunk-tjb2h3gm.js:497-549 placement
/**
 * 是否是 CONIN$/CONOUT$ 设备名。
 */
function isConDeviceName(name) {
  return /^con(in|out)\$$/i.test(normalizedName(name));
}
//@ chunk-tjb2h3gm.js:549-577 placement
var WINDOWS_UNSAFE_CHAR_RE = /[<>"|?*\\\x00-\x1f]/;
//@ chunk-tjb2h3gm.js:577-634 placement
/**
 * 路径是否含 Windows 非法字符段。
 */
function hasUnsafeCharSegment(path) {
  return path.split("/").some((segment) => WINDOWS_UNSAFE_CHAR_RE.test(segment));
}
//@ chunk-tjb2h3gm.js:634-771 placement
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
//@ chunk-tjb2h3gm.js:771-809 placement
var DOS_SHORT_NAME_RE = /^[^.]{1,6}~\d+(\.[^.]{1,3})?$/;
//@ chunk-tjb2h3gm.js:809-850 placement
function normalizedBeforeColon(name) {
  return trimEndChars(firstLineOf(name, ":"), ". ");
}
//@ chunk-tjb2h3gm.js:850-910 placement
/**
 * 路径里是否有 DOS 短名段。
 */
function hasDosShortNameSegment(path) {
  return path.split("/").some((segment) => DOS_SHORT_NAME_RE.test(normalizedBeforeColon(segment)));
}
export {
  sameTimestamp,
  hasWindowsUnsafeSegment,
  hasDosShortNameSegment,
  hasUnsafeCharSegment,
  birthTimeSalt,
  isConDeviceName,
};
