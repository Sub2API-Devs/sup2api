/**
 * utils/windowsProfileFolders.ts
 *
 * Windows 用户目录名（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-za46rn2f.js (20)
 * attribution: placement 20
 */
import { normalizeDosDevicePath } from "./pathClassification.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-za46rn2f.js:489-563 placement
/**
 * 以点/空格结尾与保留设备名后缀的模式，及 DOS 波浪号模式。
 */
var TRAILING_DOTS_OR_SPACES_RE = /[.\s]+$/;
var RESERVED_NAME_SUFFIX_RE = /\.(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
var DOS_TILDE_RE = /~\d/;
//@ chunk-za46rn2f.js:563-734 placement
/**
 * 是否为 Windows 保留设备名（CON/PRN/AUX/NUL/COMn/LPTn）。
 */
function isReservedDeviceName(name) {
  let index = name.indexOf(".");
  let replaced = (index === -1 ? name : name.slice(0, index)).replace(/ +$/, "");
  return /^(con|prn|aux|nul|com[0-9\u00B9\u00B2\u00B3]|lpt[0-9\u00B9\u00B2\u00B3])$/i.test(replaced);
}
//@ chunk-za46rn2f.js:734-782 placement
/**
 * 是否以点/空格结尾或是保留设备名后缀。
 */
function hasTrailingOrReservedName(name) {
  return TRAILING_DOTS_OR_SPACES_RE.test(name) || RESERVED_NAME_SUFFIX_RE.test(name);
}
//@ chunk-za46rn2f.js:782-874 placement
/**
 * 是否是 DOS 短名（1~6 字符 + ~数字）。
 */
function isDosShortName(name) {
  return /^(?=[^.]{3,8}(?:\.|$))[^.]{1,6}~[0-9]{1,6}(?:\.[^.]{1,3})?$/.test(name);
}
//@ chunk-za46rn2f.js:874-926 placement
/**
 * 去掉组合点后判断 DOS 短名。
 */
function isDosShortNameFolded(name) {
  return isDosShortName(name.replace(/\u0307/g, ""));
}
//@ chunk-za46rn2f.js:926-1043 placement
/**
 * 按单字符大写映射折叠大小写。
 */
function foldCaseSimple(text) {
  return Array.from(text, (char) => {
    let upper = char.toUpperCase();
    return [...upper].length === 1 ? upper : char;
  })
    .join("")
    .toLowerCase();
}
//@ chunk-za46rn2f.js:1043-1186 placement
function WINDOWS_PROFILE_FOLDER_NAMES(segment) {
  let folded = foldCaseSimple(segment);
  return (
    folded === "users" ||
    folded === "documents and settings" ||
    folded === "dokumente und einstellungen" ||
    /^do[ck]ume~[0-9]+$/.test(folded)
  );
}
//@ chunk-za46rn2f.js:1186-1350 placement
/**
 * 把旧版个人目录名（My Documents 等）展开为新路径段。
 */
function expandLegacyProfileFolder(segments) {
  if (segments.length < 3 || !WINDOWS_PROFILE_FOLDER_NAMES(segments[0])) return;
  let expansion =
    LEGACY_PROFILE_FOLDERS.get(segments[2]) ??
    SHORT_PROFILE_FOLDERS.find(([shortNamePattern]) => shortNamePattern.test(segments[2]))?.[1];
  return expansion === undefined ? undefined : [...segments.slice(0, 2), ...expansion, ...segments.slice(3)];
}
//@ chunk-za46rn2f.js:1350-1407 placement
/**
 * 折叠大小写后的路径分段。
 */
function foldedPathSegments(path) {
  return foldCaseSimple(path).split("/").filter(Boolean);
}
//@ chunk-za46rn2f.js:1407-1472 placement
/**
 * 路径本身的拼写与其旧式档案目录展开。
 */
function profileSpellings(path) {
  let segments = foldedPathSegments(path);
  let expanded = expandLegacyProfileFolder(segments);
  return expanded === undefined ? [segments] : [segments, expanded];
}
//@ chunk-za46rn2f.js:1472-1619 placement
/**
 * 一个路径在另一路径各拼写下的剩余部分。
 */
function profileRelativeRemainders(path, profilePath) {
  let remainder = profileSpellings(profilePath);
  return profileSpellings(path).flatMap((pathSpelling) =>
    remainder.flatMap((profileSpelling) =>
      pathSpelling.length <= profileSpelling.length &&
      pathSpelling.every((segmentName, segmentIndex) =>
        segmentMatchesProfile(segmentIndex, segmentName, profileSpelling[segmentIndex]),
      )
        ? [profileSpelling.slice(pathSpelling.length)]
        : [],
    ),
  );
}
//@ chunk-za46rn2f.js:1619-1871 placement
/**
 * 旧版个人目录名及 8.3 短名映射。
 */
var LEGACY_PROFILE_FOLDERS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SHORT_PROFILE_FOLDERS;
deferInit("chunk-za46rn2f.js:1619", () => {
  LEGACY_PROFILE_FOLDERS = new Map([
    ["my documents", ["documents"]],
    ["application data", ["appdata", "roaming"]],
    ["local settings", ["appdata", "local"]],
  ]);
  SHORT_PROFILE_FOLDERS = [
    [/^mydocu~[0-9]+$/, ["documents"]],
    [/^applic~[0-9]+$/, ["appdata", "roaming"]],
    [/^locals~[0-9]+$/, ["appdata", "local"]],
  ];
});
//@ chunk-za46rn2f.js:1871-1929 placement
function segmentMatchesProfile(segment, leftSegment, rightSegment) {
  return (
    segmentsMatchCaseInsensitive(leftSegment, rightSegment) ||
    (segment === 0 && WINDOWS_PROFILE_FOLDER_NAMES(leftSegment) && WINDOWS_PROFILE_FOLDER_NAMES(rightSegment))
  );
}
//@ chunk-za46rn2f.js:1929-1976 placement
/**
 * 两个段是否相等（含 DOS 短名等价）。
 */
function segmentsMatchCaseInsensitive(segment, expected) {
  return segment === expected || isDosShortNameFolded(segment) || isDosShortNameFolded(expected);
}
//@ chunk-za46rn2f.js:1976-2211 placement
/**
 * 规范 \?\、\.\、UNC 设备路径前缀与分隔符。
 */
function normalizeWindowsDevicePath(path) {
  let replaced = path
    .replace(/(?!^)[\\/]+/g, "\\")
    .replace(/^[\\/]\?\?(?=[\\/])/, "\\\\?")
    .replace(/^[\\/]{2}[?.][\\/]UNC(?=[\\/])/i, "\\");
  return path.startsWith("\\\\?\\")
    ? replaced
    : replaced.replace(/^([\\/]{2}[?.][\\/][a-z]:)[. ]+(?=[\\/]|$)/i, "$1");
}
//@ chunk-za46rn2f.js:2211-2352 placement
/**
 * WSL /mnt/<盘> 与管理共享 <盘>$ 的 UNC 正则。
 */
var WSL_MNT_UNC_RE = /^[\\/]{2}(?:wsl\.localhost|wsl\$)[\\/][^\\/]+[\\/]mnt[\\/]([a-z])(?=$|[\\/])/i;
var ADMIN_SHARE_UNC_RE = /^[\\/]{2}[^\\/]+[\\/]([a-z])\$[. ]*(?=$|[\\/])/i;
//@ chunk-za46rn2f.js:2352-2542 placement
/**
 * 把指向本地盘的 UNC 路径转为盘符路径。
 */
function uncToDrivePath(path) {
  if (!/^[\\/](?:[\\/]|\?\?[\\/])/.test(path)) return path;
  let normalized = normalizeWindowsDevicePath(path);
  let shareMatch = ADMIN_SHARE_UNC_RE.exec(normalized) ?? WSL_MNT_UNC_RE.exec(normalized);
  if (shareMatch === null) return normalizeDosDevicePath(normalized);
  let sliced = normalized.slice(shareMatch[0].length);
  return `${shareMatch[1]}:${sliced === "" ? "\\" : sliced}`;
}
//@ chunk-za46rn2f.js:2542-2555 placement
var MAX_WINDOWS_PATH_CHARS = 32767;
//@ chunk-za46rn2f.js:2555-2819 placement
/**
 * 路径前缀类别（named/current/unknown）。
 */
function classifyWindowsPathPrefix(path) {
  if (path.length > MAX_WINDOWS_PATH_CHARS) return "named";
  if (/^[\\/](?![\\/]|\?\?[\\/])/.test(path)) return "current";
  return /^[\\/]{2}(?:[?.][\\/](?!(?:[a-z]:[. ]*|UNC)(?:[\\/]|$))|;)/i.test(path) ||
    /^(?!\\\\\?\\)[\\/]{2}[?.][\\/].*[\\/]\.\.[. ]*(?:[\\/]|$)/s.test(path)
    ? "unknown"
    : "named";
}
//@ chunk-za46rn2f.js:2819-3049 placement (2.1.88 match: companionIntroText, 1)
/**
 * 在 token 序列中查找与模式序列匹配的位置（允许首字母、前缀与正则匹配），返回匹配结束位置。用途未确认。
 */
function findTokenSequenceMatches(pathSegments, targetSegments, entryName, shortNameRe, profileKind) {
  return (profileKind === "unknown" ? [...pathSegments.keys()] : [0])
    .filter((startIndex) =>
      targetSegments.every(
        (targetSegment, segmentIndex) =>
          pathSegments[segmentIndex + startIndex] === targetSegment ||
          (profileKind !== "named" && segmentIndex === 0 && /^[a-z]$/.test(targetSegment)) ||
          (segmentIndex < targetSegments.length - 1 &&
            segmentsMatchCaseInsensitive(pathSegments[segmentIndex + startIndex] ?? "", targetSegment)) ||
          (targetSegment === entryName &&
            shortNameRe?.test(pathSegments[segmentIndex + startIndex] ?? "") === true),
      ),
    )
    .map((startIndex) => targetSegments.length + startIndex);
}
export {
  isReservedDeviceName,
  normalizeWindowsDevicePath,
  profileRelativeRemainders,
  WSL_MNT_UNC_RE,
  classifyWindowsPathPrefix,
  findTokenSequenceMatches,
  uncToDrivePath,
  DOS_TILDE_RE,
  TRAILING_DOTS_OR_SPACES_RE,
  RESERVED_NAME_SUFFIX_RE,
  WINDOWS_PROFILE_FOLDER_NAMES,
  foldCaseSimple,
  profileSpellings,
  foldedPathSegments,
  isDosShortName,
  hasTrailingOrReservedName,
  isDosShortNameFolded,
  segmentsMatchCaseInsensitive,
};
