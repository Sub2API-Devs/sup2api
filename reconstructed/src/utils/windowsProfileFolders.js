/**
 * utils/windowsProfileFolders.ts
 *
 * Windows 用户目录名（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aat7wt0p.js (20)
 * attribution: placement 20
 */
import { normalizeDosDevicePath } from "./pathClassification.js";

//@ chunk-aat7wt0p.js:489-563 placement
var zje = /[.\s]+$/,
  iks = /\.(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i,
  VEr = /~\d/;
/**
 * 是否为 Windows 保留设备名（CON/PRN/AUX/NUL/COMn/LPTn）。
 */
//@ chunk-aat7wt0p.js:563-734 placement
function isReservedDeviceName(t) {
  let index = t.indexOf("."),
    replaced = (index === -1 ? t : t.slice(0, index)).replace(/ +$/, "");
  return /^(con|prn|aux|nul|com[0-9\u00B9\u00B2\u00B3]|lpt[0-9\u00B9\u00B2\u00B3])$/i.test(replaced);
}
//@ chunk-aat7wt0p.js:734-782 placement
function qEr(t) {
  return zje.test(t) || iks.test(t);
}
//@ chunk-aat7wt0p.js:782-874 placement
function EHn(t) {
  return /^(?=[^.]{3,8}(?:\.|$))[^.]{1,6}~[0-9]{1,6}(?:\.[^.]{1,3})?$/.test(t);
}
//@ chunk-aat7wt0p.js:874-926 placement
function YEr(t) {
  return EHn(t.replace(/\u0307/g, ""));
}
/**
 * 按单字符大写映射折叠大小写。
 */
//@ chunk-aat7wt0p.js:926-1043 placement
function foldCaseSimple(t) {
  return Array.from(t, (n) => {
    let upper = n.toUpperCase();
    return [...upper].length === 1 ? upper : n;
  })
    .join("")
    .toLowerCase();
}
//@ chunk-aat7wt0p.js:1043-1186 placement
function WINDOWS_PROFILE_FOLDER_NAMES(t) {
  let n = foldCaseSimple(t);
  return (
    n === "users" ||
    n === "documents and settings" ||
    n === "dokumente und einstellungen" ||
    /^do[ck]ume~[0-9]+$/.test(n)
  );
}
/**
 * 把旧版个人目录名（My Documents 等）展开为新路径段。
 */
//@ chunk-aat7wt0p.js:1186-1350 placement
function expandLegacyProfileFolder(t) {
  if (t.length < 3 || !WINDOWS_PROFILE_FOLDER_NAMES(t[0])) return;
  let n = LEGACY_PROFILE_FOLDERS.get(t[2]) ?? SHORT_PROFILE_FOLDERS.find(([e]) => e.test(t[2]))?.[1];
  return n === void 0 ? void 0 : [...t.slice(0, 2), ...n, ...t.slice(3)];
}
//@ chunk-aat7wt0p.js:1350-1407 placement
function XEr(t) {
  return foldCaseSimple(t).split("/").filter(Boolean);
}
//@ chunk-aat7wt0p.js:1407-1472 placement
function Ruo(t) {
  let n = XEr(t),
    e = expandLegacyProfileFolder(n);
  return e === void 0 ? [n] : [n, e];
}
/**
 * 一个路径在另一路径各拼写下的剩余部分。
 */
//@ chunk-aat7wt0p.js:1472-1619 placement
function profileRelativeRemainders(t, n) {
  let e = Ruo(n);
  return Ruo(t).flatMap((r) =>
    e.flatMap((o) => (r.length <= o.length && r.every((i, s) => yt(s, i, o[s])) ? [o.slice(r.length)] : [])),
  );
}
/**
 * 旧版个人目录名及 8.3 短名映射。
 */
//@ chunk-aat7wt0p.js:1619-1871 placement
var LEGACY_PROFILE_FOLDERS = new Map([
    ["my documents", ["documents"]],
    ["application data", ["appdata", "roaming"]],
    ["local settings", ["appdata", "local"]],
  ]),
  SHORT_PROFILE_FOLDERS = [
    [/^mydocu~[0-9]+$/, ["documents"]],
    [/^applic~[0-9]+$/, ["appdata", "roaming"]],
    [/^locals~[0-9]+$/, ["appdata", "local"]],
  ];
//@ chunk-aat7wt0p.js:1871-1929 placement
function yt(t, n, e) {
  return xuo(n, e) || (t === 0 && WINDOWS_PROFILE_FOLDER_NAMES(n) && WINDOWS_PROFILE_FOLDER_NAMES(e));
}
//@ chunk-aat7wt0p.js:1929-1976 placement
function xuo(t, n) {
  return t === n || YEr(t) || YEr(n);
}
/**
 * 规范 \?\、\.\、UNC 设备路径前缀与分隔符。
 */
//@ chunk-aat7wt0p.js:1976-2211 placement
function normalizeWindowsDevicePath(t) {
  let replaced = t
    .replace(/(?!^)[\\/]+/g, "\\")
    .replace(/^[\\/]\?\?(?=[\\/])/, "\\\\?")
    .replace(/^[\\/]{2}[?.][\\/]UNC(?=[\\/])/i, "\\");
  return t.startsWith("\\\\?\\")
    ? replaced
    : replaced.replace(/^([\\/]{2}[?.][\\/][a-z]:)[. ]+(?=[\\/]|$)/i, "$1");
}
/**
 * WSL /mnt/<盘> 与管理共享 <盘>$ 的 UNC 正则。
 */
//@ chunk-aat7wt0p.js:2211-2352 placement
var WSL_MNT_UNC_RE = /^[\\/]{2}(?:wsl\.localhost|wsl\$)[\\/][^\\/]+[\\/]mnt[\\/]([a-z])(?=$|[\\/])/i,
  ADMIN_SHARE_UNC_RE = /^[\\/]{2}[^\\/]+[\\/]([a-z])\$[. ]*(?=$|[\\/])/i;
/**
 * 把指向本地盘的 UNC 路径转为盘符路径。
 */
//@ chunk-aat7wt0p.js:2352-2542 placement
function uncToDrivePath(t) {
  if (!/^[\\/](?:[\\/]|\?\?[\\/])/.test(t)) return t;
  let n = normalizeWindowsDevicePath(t),
    e = ADMIN_SHARE_UNC_RE.exec(n) ?? WSL_MNT_UNC_RE.exec(n);
  if (e === null) return normalizeDosDevicePath(n);
  let sliced = n.slice(e[0].length);
  return `${e[1]}:${sliced === "" ? "\\" : sliced}`;
}
//@ chunk-aat7wt0p.js:2542-2555 placement
var Et = 32767;
/**
 * 路径前缀类别（named/current/unknown）。
 */
//@ chunk-aat7wt0p.js:2555-2819 placement
function classifyWindowsPathPrefix(t) {
  if (t.length > Et) return "named";
  if (/^[\\/](?![\\/]|\?\?[\\/])/.test(t)) return "current";
  return /^[\\/]{2}(?:[?.][\\/](?!(?:[a-z]:[. ]*|UNC)(?:[\\/]|$))|;)/i.test(t) ||
    /^(?!\\\\\?\\)[\\/]{2}[?.][\\/].*[\\/]\.\.[. ]*(?:[\\/]|$)/s.test(t)
    ? "unknown"
    : "named";
}
/**
 * 在 token 序列中查找与模式序列匹配的位置（允许首字母、前缀与正则匹配），返回匹配结束位置。用途未确认。
 */
//@ chunk-aat7wt0p.js:2819-3049 placement = companionIntroText (1)
function findTokenSequenceMatches(t, n, e, r, o) {
  return (o === "unknown" ? [...t.keys()] : [0])
    .filter((i) =>
      n.every(
        (s, u) =>
          t[u + i] === s ||
          (o !== "named" && u === 0 && /^[a-z]$/.test(s)) ||
          (u < n.length - 1 && xuo(t[u + i] ?? "", s)) ||
          (s === e && r?.test(t[u + i] ?? "") === !0),
      ),
    )
    .map((i) => n.length + i);
}

export {
  isReservedDeviceName,
  classifyWindowsPathPrefix,
  findTokenSequenceMatches,
  uncToDrivePath,
  VEr,
  zje,
  iks,
  profileRelativeRemainders,
  foldCaseSimple,
  YEr,
  xuo,
  WINDOWS_PROFILE_FOLDER_NAMES,
  Ruo,
  XEr,
  EHn,
  qEr,
  normalizeWindowsDevicePath,
  WSL_MNT_UNC_RE,
};
