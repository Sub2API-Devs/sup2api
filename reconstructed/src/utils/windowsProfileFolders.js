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
/**
 * 以点/空格结尾与保留设备名后缀的模式，及 DOS 波浪号模式。
 */
var TRAILING_DOTS_OR_SPACES_RE = /[.\s]+$/;
var RESERVED_NAME_SUFFIX_RE = /\.(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
var DOS_TILDE_RE = /~\d/;
//@ chunk-aat7wt0p.js:563-734 placement
/**
 * 是否为 Windows 保留设备名（CON/PRN/AUX/NUL/COMn/LPTn）。
 */
function isReservedDeviceName(t) {
  let index = t.indexOf(".");
  let replaced = (index === -1 ? t : t.slice(0, index)).replace(/ +$/, "");
  return /^(con|prn|aux|nul|com[0-9\u00B9\u00B2\u00B3]|lpt[0-9\u00B9\u00B2\u00B3])$/i.test(replaced);
}
//@ chunk-aat7wt0p.js:734-782 placement
/**
 * 是否以点/空格结尾或是保留设备名后缀。
 */
function hasTrailingOrReservedName(t) {
  return TRAILING_DOTS_OR_SPACES_RE.test(t) || RESERVED_NAME_SUFFIX_RE.test(t);
}
//@ chunk-aat7wt0p.js:782-874 placement
/**
 * 是否是 DOS 短名（1~6 字符 + ~数字）。
 */
function isDosShortName(t) {
  return /^(?=[^.]{3,8}(?:\.|$))[^.]{1,6}~[0-9]{1,6}(?:\.[^.]{1,3})?$/.test(t);
}
//@ chunk-aat7wt0p.js:874-926 placement
/**
 * 去掉组合点后判断 DOS 短名。
 */
function isDosShortNameFolded(t) {
  return isDosShortName(t.replace(/\u0307/g, ""));
}
//@ chunk-aat7wt0p.js:926-1043 placement
/**
 * 按单字符大写映射折叠大小写。
 */
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
//@ chunk-aat7wt0p.js:1186-1350 placement
/**
 * 把旧版个人目录名（My Documents 等）展开为新路径段。
 */
function expandLegacyProfileFolder(t) {
  if (t.length < 3 || !WINDOWS_PROFILE_FOLDER_NAMES(t[0])) return;
  let n = LEGACY_PROFILE_FOLDERS.get(t[2]) ?? SHORT_PROFILE_FOLDERS.find(([e]) => e.test(t[2]))?.[1];
  return n === undefined ? undefined : [...t.slice(0, 2), ...n, ...t.slice(3)];
}
//@ chunk-aat7wt0p.js:1350-1407 placement
/**
 * 折叠大小写后的路径分段。
 */
function foldedPathSegments(t) {
  return foldCaseSimple(t).split("/").filter(Boolean);
}
//@ chunk-aat7wt0p.js:1407-1472 placement
/**
 * 路径本身的拼写与其旧式档案目录展开。
 */
function profileSpellings(t) {
  let n = foldedPathSegments(t);
  let e = expandLegacyProfileFolder(n);
  return e === undefined ? [n] : [n, e];
}
//@ chunk-aat7wt0p.js:1472-1619 placement
/**
 * 一个路径在另一路径各拼写下的剩余部分。
 */
function profileRelativeRemainders(t, n) {
  let e = profileSpellings(n);
  return profileSpellings(t).flatMap((r) =>
    e.flatMap((o) =>
      r.length <= o.length && r.every((i, s) => segmentMatchesProfile(s, i, o[s])) ? [o.slice(r.length)] : [],
    ),
  );
}
//@ chunk-aat7wt0p.js:1619-1871 placement
/**
 * 旧版个人目录名及 8.3 短名映射。
 */
var LEGACY_PROFILE_FOLDERS = new Map([
  ["my documents", ["documents"]],
  ["application data", ["appdata", "roaming"]],
  ["local settings", ["appdata", "local"]],
]);
var SHORT_PROFILE_FOLDERS = [
  [/^mydocu~[0-9]+$/, ["documents"]],
  [/^applic~[0-9]+$/, ["appdata", "roaming"]],
  [/^locals~[0-9]+$/, ["appdata", "local"]],
];
//@ chunk-aat7wt0p.js:1871-1929 placement
function segmentMatchesProfile(t, n, e) {
  return (
    segmentsMatchCaseInsensitive(n, e) ||
    (t === 0 && WINDOWS_PROFILE_FOLDER_NAMES(n) && WINDOWS_PROFILE_FOLDER_NAMES(e))
  );
}
//@ chunk-aat7wt0p.js:1929-1976 placement
/**
 * 两个段是否相等（含 DOS 短名等价）。
 */
function segmentsMatchCaseInsensitive(t, n) {
  return t === n || isDosShortNameFolded(t) || isDosShortNameFolded(n);
}
//@ chunk-aat7wt0p.js:1976-2211 placement
/**
 * 规范 \?\、\.\、UNC 设备路径前缀与分隔符。
 */
function normalizeWindowsDevicePath(t) {
  let replaced = t
    .replace(/(?!^)[\\/]+/g, "\\")
    .replace(/^[\\/]\?\?(?=[\\/])/, "\\\\?")
    .replace(/^[\\/]{2}[?.][\\/]UNC(?=[\\/])/i, "\\");
  return t.startsWith("\\\\?\\")
    ? replaced
    : replaced.replace(/^([\\/]{2}[?.][\\/][a-z]:)[. ]+(?=[\\/]|$)/i, "$1");
}
//@ chunk-aat7wt0p.js:2211-2352 placement
/**
 * WSL /mnt/<盘> 与管理共享 <盘>$ 的 UNC 正则。
 */
var WSL_MNT_UNC_RE = /^[\\/]{2}(?:wsl\.localhost|wsl\$)[\\/][^\\/]+[\\/]mnt[\\/]([a-z])(?=$|[\\/])/i;
var ADMIN_SHARE_UNC_RE = /^[\\/]{2}[^\\/]+[\\/]([a-z])\$[. ]*(?=$|[\\/])/i;
//@ chunk-aat7wt0p.js:2352-2542 placement
/**
 * 把指向本地盘的 UNC 路径转为盘符路径。
 */
function uncToDrivePath(t) {
  if (!/^[\\/](?:[\\/]|\?\?[\\/])/.test(t)) return t;
  let n = normalizeWindowsDevicePath(t);
  let e = ADMIN_SHARE_UNC_RE.exec(n) ?? WSL_MNT_UNC_RE.exec(n);
  if (e === null) return normalizeDosDevicePath(n);
  let sliced = n.slice(e[0].length);
  return `${e[1]}:${sliced === "" ? "\\" : sliced}`;
}
//@ chunk-aat7wt0p.js:2542-2555 placement
var MAX_WINDOWS_PATH_CHARS = 32767;
//@ chunk-aat7wt0p.js:2555-2819 placement
/**
 * 路径前缀类别（named/current/unknown）。
 */
function classifyWindowsPathPrefix(t) {
  if (t.length > MAX_WINDOWS_PATH_CHARS) return "named";
  if (/^[\\/](?![\\/]|\?\?[\\/])/.test(t)) return "current";
  return /^[\\/]{2}(?:[?.][\\/](?!(?:[a-z]:[. ]*|UNC)(?:[\\/]|$))|;)/i.test(t) ||
    /^(?!\\\\\?\\)[\\/]{2}[?.][\\/].*[\\/]\.\.[. ]*(?:[\\/]|$)/s.test(t)
    ? "unknown"
    : "named";
}
//@ chunk-aat7wt0p.js:2819-3049 placement = companionIntroText (1)
/**
 * 在 token 序列中查找与模式序列匹配的位置（允许首字母、前缀与正则匹配），返回匹配结束位置。用途未确认。
 */
function findTokenSequenceMatches(t, n, entryName, shortNameRe, o) {
  return (o === "unknown" ? [...t.keys()] : [0])
    .filter((i) =>
      n.every(
        (s, u) =>
          t[u + i] === s ||
          (o !== "named" && u === 0 && /^[a-z]$/.test(s)) ||
          (u < n.length - 1 && segmentsMatchCaseInsensitive(t[u + i] ?? "", s)) ||
          (s === entryName && shortNameRe?.test(t[u + i] ?? "") === true),
      ),
    )
    .map((i) => n.length + i);
}
export {
  isReservedDeviceName,
  classifyWindowsPathPrefix,
  findTokenSequenceMatches,
  uncToDrivePath,
  DOS_TILDE_RE,
  TRAILING_DOTS_OR_SPACES_RE,
  RESERVED_NAME_SUFFIX_RE,
  profileRelativeRemainders,
  foldCaseSimple,
  isDosShortNameFolded,
  segmentsMatchCaseInsensitive,
  WINDOWS_PROFILE_FOLDER_NAMES,
  profileSpellings,
  foldedPathSegments,
  isDosShortName,
  hasTrailingOrReservedName,
  normalizeWindowsDevicePath,
  WSL_MNT_UNC_RE,
};
