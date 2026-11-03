/**
 * services/remoteTools/windowsPathSafety.ts
 *
 * 2.1.316 新增。Windows 路径安全检查。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-gqez588q.js (10)
 * attribution: placement 10
 */
import { win32, win32 as win32_2, posix, posix as posix_2 } from "path";
import { uniq } from "../../utils/collections.js";
import { getUnameSR, resolveRemotePath, p, g } from "./pathMapping.js";
import {
  getCanonicalPathVariants,
  abbreviatePathForDisplay,
  isLongPosixPath,
} from "../../utils/displayPath.js";
import { foldCase } from "../../utils/networkPaths.js";
import { iM } from "../../utils/fsJunctions.js";
import {
  normalizeCaseForComparison,
  classifySuspiciousWindowsPathPattern,
} from "../../utils/permissions/filesystem.js";
import { isReservedDeviceName } from "../../utils/windowsProfileFolders.js";

//@ chunk-gqez588q.js:5881-6071 placement
var USR_MERGE_ALIASES = [
  ["/bin", "/usr/bin"],
  ["/sbin", "/usr/sbin"],
  ["/lib", "/usr/lib"],
  ["/lib32", "/usr/lib32"],
  ["/lib64", "/usr/lib64"],
  ["/libx32", "/usr/libx32"],
  ["/var/run", "/run"],
  ["/var/lock", "/run/lock"],
];
//@ chunk-gqez588q.js:6071-6157 placement
function E(n, e, r) {
  return n === e || n.startsWith(`${e}/`) ? [`${r}${n.slice(e.length)}`] : [];
}
//@ chunk-gqez588q.js:6157-6224 placement
function O(n) {
  return USR_MERGE_ALIASES.flatMap(([e, r]) => [...E(n, e, r), ...E(n, r, e)]);
}
//@ chunk-gqez588q.js:6224-6387 placement
function platformPathAliases(n, e) {
  return e === "darwin"
    ? [n.replace(/^\/private(?=\/(?:tmp|var|etc)(?:\/|$))/i, "")].filter((r) => r !== n)
    : e === "linux"
      ? uniq(O(n).flatMap((r) => [r, ...O(r)]))
      : [];
}
/**
 * 列出远程路径的所有等价写法（规范化变体、平台别名如 /private 与 usr-merge、缩写显示形式、大小写/NFC/NFD 变体，以及副本目录中的对应路径），用于匹配权限规则。
 */
//@ chunk-gqez588q.js:6387-6941 placement
function remotePathSpellings(path, dirFacts) {
  let r = getUnameSR(dirFacts.platform),
    i = resolveRemotePath(path, dirFacts);
  if (i === void 0 || !r.isAbsolute(i)) return [];
  let flattened = getCanonicalPathVariants(i, dirFacts, r).flatMap((o) => [
      o,
      ...platformPathAliases(o, dirFacts.platform),
    ]),
    a = pathCaseFolder(dirFacts.platform),
    normalized = r.normalize(p(path.trim(), r)),
    flattened_2 = flattened.flatMap((o) => abbreviatePathForDisplay(o, dirFacts, r)),
    copyOf = dirFacts.copyOf;
  return uniq([
    ...[...flattened_2, ...(r === win32 ? [] : flattened)]
      .flatMap((o) =>
        [o, a(o)].flatMap((l) =>
          dirFacts.platform === "darwin" ? [l, l.normalize("NFC"), l.normalize("NFD")] : [l],
        ),
      )
      .filter((o) => o !== normalized),
    ...(copyOf === void 0
      ? []
      : flattened
          .flatMap((o) =>
            abbreviatePathForDisplay(
              o,
              { ...dirFacts, mirroredDir: dirFacts.workingDir, homeDir: void 0 },
              r,
            ),
          )
          .map((o) => getUnameSR(copyOf.platform).join(copyOf.workingDir, o.slice(2)))
          .flatMap((o) => [o, ...remotePathSpellings(o, copyOf)])),
  ]);
}
/**
 * 把绝对的 glob 路径拆分为不含通配的根目录和剩余模式（处理 Windows 长路径与 UNC 前缀）。
 */
//@ chunk-gqez588q.js:6941-7399 placement
function splitGlobRoot(n, e) {
  let r = getUnameSR(e.platform),
    i = p(n.trim(), r);
  if (!r.isAbsolute(i)) return;
  let t =
      r === win32
        ? i.replace(/^[\\/]{2}[?.][\\/]UNC[\\/]/i, "\\\\").replace(/^[\\/]{2}[?.][\\/](?=[a-z]:)/i, "")
        : i,
    parts = t.split(r === win32 ? /[\\/]/ : "/"),
    c = r === win32 && /^[\\/]{2}[?.][\\/]/.test(t) ? 3 : 0,
    index = parts.slice(c).findIndex((A) => /[*?[{]/.test(A)),
    s = index === -1 ? -1 : index + c,
    l = (s === -1 ? parts : parts.slice(0, s)).join(r.sep) || r.sep;
  return {
    root: r === win32 && /^[a-z]:$/i.test(l) ? `${l}${r.sep}` : l,
    rest: s === -1 ? "" : parts.slice(s).join("/"),
  };
}
//@ chunk-gqez588q.js:7399-7515 placement
function pathCaseFolder(n) {
  return n === "win32"
    ? (e) => e.toUpperCase().toLowerCase()
    : n === "darwin"
      ? (e) => foldCase(e.normalize("NFC"))
      : (e) => e;
}
//@ chunk-gqez588q.js:7515-7659 placement
var DEV_FD_PATTERN = /^\/dev\/(?:fd|stdin|stdout|stderr)(?=\/|$)/,
  PROC_LINK_PATTERN =
    /^\/proc\/(?:self|thread-self|\d+)\/(?:task\/\d+\/)?(?:cwd|root|fd|exe|map_files)(?=\/|$)/;
//@ chunk-gqez588q.js:7659-8721 placement
function checkWindowsPathSafety(n, e) {
  let r = resolveRemotePath(n, e);
  if (e.platform !== "win32") {
    if (r === void 0) return "home_unknown";
    if (isLongPosixPath(r, posix)) return "too_long";
    return getCanonicalPathVariants(r, e, posix).some(
      (l) => DEV_FD_PATTERN.test(l) || (e.platform !== "darwin" && PROC_LINK_PATTERN.test(l)),
    )
      ? "magic_link"
      : void 0;
  }
  let i = p(n.trim(), win32),
    t = g(i);
  if (!win32.isAbsolute(i) && t !== void 0 && t !== g(e.workingDir)) return "other_drive_relative";
  if (r === void 0) return "home_unknown";
  let normalized = win32.normalize(i);
  if (/^\\\\[?.]\\(?![a-z]:\\|UNC\\)/i.test(normalized) || iM(normalized)) return "nt_device_namespace";
  let replaced = normalized.replace(/^\\\\[?.]\\UNC\\/i, "\\\\").replace(/^\\\\[?.]\\(?=[a-z]:)/i, ""),
    d = /^\\\\[^\\]+\\[^\\]+\$(?=\\|$)/.exec(replaced)?.[0];
  if (
    d !== void 0 &&
    ![e.workingDir, e.homeDir].some(
      (l) =>
        l !== void 0 &&
        normalizeCaseForComparison(win32.normalize(l)).startsWith(`${normalizeCaseForComparison(d)}\\`),
    )
  )
    return "administrative_share";
  let replaced_2 = replaced.replace(/^\\\\/, "");
  if (replaced_2.includes(":", /^[a-z]:/i.test(replaced_2) ? 2 : 0)) return "colon_past_drive_position";
  if (replaced_2.split("\\").some((l) => isReservedDeviceName(l) && !/^[^. ]+\./.test(l)))
    return "dos_device_name";
  let o = classifySuspiciousWindowsPathPattern(replaced_2.replace(/~(?=\d)/g, "-"));
  return o === void 0 ||
    o === "device_path_prefix" ||
    o === "unc_or_webdav_form" ||
    o === "tilde_digit" ||
    o === "dos_device_suffix"
    ? void 0
    : o;
}
/**
 * 远程路径不安全原因的说明文字表（设备命名空间、备用数据流、尾随点、DOS 设备名、/proc 链接、过长、主目录未知等）。
 */
//@ chunk-gqez588q.js:8721-9403 placement
var UNSAFE_PATH_REASON_TEXT = {
  nt_device_namespace: "an NT device-namespace path",
  colon_past_drive_position: "a name with an alternate-data-stream colon",
  trailing_dot_or_whitespace: "a name ending in a dot or whitespace",
  dot_run_segment: "a path with a segment of three or more dots",
  other_drive_relative: "a path relative to another drive's current directory",
  administrative_share: "a path through a hidden or administrative share",
  dos_device_name: "a path that names a DOS device",
  magic_link: "a path through an open file descriptor or a process's /proc link",
  too_long: "a path too long for a Mac or Linux machine to open",
  home_unknown: "a path from the machine's home folder, which this session does not know",
};

export {
  splitGlobRoot,
  remotePathSpellings,
  checkWindowsPathSafety,
  UNSAFE_PATH_REASON_TEXT,
  pathCaseFolder,
};
