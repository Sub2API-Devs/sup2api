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
import { iM } from "./fsJunctions.js";
import { oZt } from "./cwd.js";

/**
 * 把 \\\\?\\C: 或 \\\\localhost\\C$ 形式转为盘符路径。
 */
//@ chunk-aat7wt0p.js:3049-3258 placement
function normalizeDosDevicePath(t) {
  let match =
    /^[\\/]{2}(?:[?.][\\/]([A-Za-z]):|(?:localhost|127\.0\.0\.1)[\\/]([A-Za-z])\$)(?=$|[\\/])/i.exec(t);
  if (match === null) return t;
  let sliced = t.slice(match[0].length);
  return `${match[1] ?? match[2]}:${sliced === "" ? "\\" : sliced}`;
}
//@ chunk-aat7wt0p.js:3428-3452 placement
function Mn(t) {
  return t;
}
//@ chunk-aat7wt0p.js:3452-3500 placement
function Qn(t) {
  return /^[\\/]{2}/.test(t) || iM(t);
}
//@ chunk-aat7wt0p.js:3500-3554 placement
function Eh(t) {
  return /(^|[\\/])\.\.([\\/]|$)/.test(t);
}
//@ chunk-aat7wt0p.js:3554-3593 placement
function rc(t) {
  return t.includes("\\");
}
//@ chunk-aat7wt0p.js:3593-3627 placement
function ZEr() {
  return rc(oZt ?? "");
}
//@ chunk-aat7wt0p.js:3627-3674 placement
function gb(t) {
  return /^[\\/]\?\?[\\/]/.test(t);
}
/**
 * UNC 路径主机（小写）。
 */
//@ chunk-aat7wt0p.js:3674-3857 placement
function uncHostOf(t) {
  if (/^[\\/]{2}[?.][\\/](?!unc[\\/])/i.test(t)) return null;
  return (
    t.match(/^[\\/]{2}(?:[?.][\\/]unc[\\/])?([^\\/]+)/i)?.[1]?.replace(/[A-Z]/g, (n) => n.toLowerCase()) ??
    null
  );
}
//@ chunk-aat7wt0p.js:3857-3919 placement
function cl(t) {
  return /(^|[\\/])\.{1,2}[. ]*([\\/]|$)/.test(t);
}
//@ chunk-aat7wt0p.js:3919-3993 placement
function W9e(t) {
  return t.split(/[/\\]/).some((n) => /^\.\. [ .]*$/.test(n));
}
/**
 * 路径含 . 或 .. 段。
 */
//@ chunk-aat7wt0p.js:3993-4104 placement
function hasDotSegment(t, n = "linux") {
  return n === "win32" ? /(^|[\\/])\.{1,2}([\\/]|$)/.test(t) : /(^|\/)\.{1,2}(\/|$)/.test(t);
}
//@ chunk-aat7wt0p.js:4104-4133 placement
function $j(t) {
  return hasDotSegment(t);
}
//@ chunk-aat7wt0p.js:4133-4183 placement
function uT(t) {
  return /^[\\/]{2}[?.][\\/]/.test(t);
}
/**
 * macOS /.vol、/.file 等特殊路径。
 */
//@ chunk-aat7wt0p.js:4183-4479 placement
function isMacSpecialPath(t) {
  if (!/\/\.(?:vol|file|nofollow|resolve)(?:\/|$)/i.test(t)) return !1;
  if (!t.startsWith("/")) return !1;
  let n = [];
  for (let e of t.split("/")) {
    if (e === "" || e === ".") continue;
    if (e === "..") {
      n.pop();
      continue;
    }
    if ((n.push(e), n.length === 1 && /^\.(?:vol|file|nofollow|resolve)$/i.test(e))) return !0;
  }
  return !1;
}
//@ chunk-aat7wt0p.js:4479-4565 placement
function Puo(t) {
  return /^[\\/](GLOBAL\?\?|GLOBALROOT|DosDevices|Device)[\\/]/i.test(t);
}
/**
 * 网络路径且主机与参考路径不同。
 */
//@ chunk-aat7wt0p.js:4565-4683 placement
function isForeignNetworkPath(t, n) {
  if (!Qn(t)) return !1;
  if (uT(t) || iM(t)) return !0;
  if (cl(t)) return !0;
  let e = uncHostOf(t);
  return e === null || e !== uncHostOf(n);
}

export {
  Mn,
  Qn,
  gb,
  cl,
  Eh,
  uncHostOf,
  uT,
  normalizeDosDevicePath,
  isMacSpecialPath,
  $j,
  isForeignNetworkPath,
  rc,
  W9e,
  Puo,
  hasDotSegment,
  ZEr,
};
