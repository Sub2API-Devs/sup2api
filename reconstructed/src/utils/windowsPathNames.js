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
function u6o(n) {
  return n.birthtimeNs > 0n && n.birthtimeNs !== n.ctimeNs ? n.birthtimeNs.toString() : void 0;
}
//@ chunk-tjb2h3gm.js:366-420 placement
function i(n) {
  return n >= -(2n ** 63n) && n < -1n ? n + 2n ** 64n : n;
}
//@ chunk-tjb2h3gm.js:420-457 placement
function fSn(n, t) {
  return i(n) === i(t);
}
//@ chunk-tjb2h3gm.js:457-497 placement
function e(n) {
  return trimEndChars(firstLineOf(n, "."), " ");
}
//@ chunk-tjb2h3gm.js:497-549 placement
function f6o(n) {
  return /^con(in|out)\$$/i.test(e(n));
}
//@ chunk-tjb2h3gm.js:549-577 placement
var o = /[<>"|?*\\\x00-\x1f]/;
//@ chunk-tjb2h3gm.js:577-634 placement
function Rii(n) {
  return n.split("/").some((t) => o.test(t));
}
/**
 * 判断路径中是否有在 Windows 上不安全的段：含冒号、以点或空格结尾、保留设备名等。
 */
//@ chunk-tjb2h3gm.js:634-771 placement
function hasWindowsUnsafeSegment(n) {
  return n
    .split("/")
    .some(
      (t) =>
        t.includes(":") ||
        t.endsWith(".") ||
        t.endsWith(" ") ||
        isReservedDeviceName(e(t).replace(/ {2,}/g, " ")) ||
        f6o(t),
    );
}
//@ chunk-tjb2h3gm.js:771-809 placement
var r = /^[^.]{1,6}~\d+(\.[^.]{1,3})?$/;
//@ chunk-tjb2h3gm.js:809-850 placement
function s(n) {
  return trimEndChars(firstLineOf(n, ":"), ". ");
}
//@ chunk-tjb2h3gm.js:850-910 placement
function pSn(n) {
  return n.split("/").some((t) => r.test(s(t)));
}

export { fSn, hasWindowsUnsafeSegment, pSn, Rii, u6o, f6o };
