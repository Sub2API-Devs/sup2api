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
import { win32, posix } from "path";
import { uniq } from "../../utils/collections.js";
import { getUnameSR, resolveRemotePath, normalizeWin32DrivePath, driveLetterOf } from "./pathMapping.js";
import {
  getCanonicalPathVariants,
  abbreviatePathForDisplay,
  isLongPosixPath,
} from "../../utils/displayPath.js";
import { foldCase_2 } from "../../utils/networkPaths.js";
import { hasWin32DevicePrefixSpelling } from "../../utils/fsJunctions.js";
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
function usrMergeAliasesFor(n, e, r) {
  return n === e || n.startsWith(`${e}/`) ? [`${r}${n.slice(e.length)}`] : [];
}
//@ chunk-gqez588q.js:6157-6224 placement
function usrMergeAliasSpellings(n) {
  return USR_MERGE_ALIASES.flatMap(([e, r]) => [
    ...usrMergeAliasesFor(n, e, r),
    ...usrMergeAliasesFor(n, r, e),
  ]);
}
//@ chunk-gqez588q.js:6224-6387 placement
function platformPathAliases(n, platform) {
  return platform === "darwin"
    ? [n.replace(/^\/private(?=\/(?:tmp|var|etc)(?:\/|$))/i, "")].filter((r) => r !== n)
    : platform === "linux"
      ? uniq(usrMergeAliasSpellings(n).flatMap((r) => [r, ...usrMergeAliasSpellings(r)]))
      : [];
}
//@ chunk-gqez588q.js:6387-6941 placement
/**
 * 列出远程路径的所有等价写法（规范化变体、平台别名如 /private 与 usr-merge、缩写显示形式、大小写/NFC/NFD 变体，以及副本目录中的对应路径），用于匹配权限规则。
 */
function remotePathSpellings(path, dirFacts) {
  let unameSR = getUnameSR(dirFacts.platform);
  let remotePath = resolveRemotePath(path, dirFacts);
  if (remotePath === undefined || !unameSR.isAbsolute(remotePath)) return [];
  let flattened = getCanonicalPathVariants(remotePath, dirFacts, unameSR).flatMap((o) => [
    o,
    ...platformPathAliases(o, dirFacts.platform),
  ]);
  let a = pathCaseFolder(dirFacts.platform);
  let normalized = unameSR.normalize(normalizeWin32DrivePath(path.trim(), unameSR));
  let flattened_2 = flattened.flatMap((o) => abbreviatePathForDisplay(o, dirFacts, unameSR));
  let copyOf = dirFacts.copyOf;
  return uniq([
    ...[...flattened_2, ...(unameSR === win32 ? [] : flattened)]
      .flatMap((o) =>
        [o, a(o)].flatMap((l) =>
          dirFacts.platform === "darwin" ? [l, l.normalize("NFC"), l.normalize("NFD")] : [l],
        ),
      )
      .filter((o) => o !== normalized),
    ...(copyOf === undefined
      ? []
      : flattened
          .flatMap((o) =>
            abbreviatePathForDisplay(
              o,
              {
                ...dirFacts,
                mirroredDir: dirFacts.workingDir,
                homeDir: undefined,
              },
              unameSR,
            ),
          )
          .map((o) => getUnameSR(copyOf.platform).join(copyOf.workingDir, o.slice(2)))
          .flatMap((o) => [o, ...remotePathSpellings(o, copyOf)])),
  ]);
}
//@ chunk-gqez588q.js:6941-7399 placement
/**
 * 把绝对的 glob 路径拆分为不含通配的根目录和剩余模式（处理 Windows 长路径与 UNC 前缀）。
 */
function splitGlobRoot(pattern, e) {
  let unameSR = getUnameSR(e.platform);
  let i = normalizeWin32DrivePath(pattern.trim(), unameSR);
  if (!unameSR.isAbsolute(i)) return;
  let t =
    unameSR === win32
      ? i.replace(/^[\\/]{2}[?.][\\/]UNC[\\/]/i, "\\\\").replace(/^[\\/]{2}[?.][\\/](?=[a-z]:)/i, "")
      : i;
  let parts = t.split(unameSR === win32 ? /[\\/]/ : "/");
  let c = unameSR === win32 && /^[\\/]{2}[?.][\\/]/.test(t) ? 3 : 0;
  let index = parts.slice(c).findIndex((A) => /[*?[{]/.test(A));
  let s = index === -1 ? -1 : index + c;
  let l = (s === -1 ? parts : parts.slice(0, s)).join(unameSR.sep) || unameSR.sep;
  return {
    root: unameSR === win32 && /^[a-z]:$/i.test(l) ? `${l}${unameSR.sep}` : l,
    rest: s === -1 ? "" : parts.slice(s).join("/"),
  };
}
//@ chunk-gqez588q.js:7399-7515 placement
function pathCaseFolder(platform) {
  return platform === "win32"
    ? (e) => e.toUpperCase().toLowerCase()
    : platform === "darwin"
      ? (e) => foldCase_2(e.normalize("NFC"))
      : (e) => e;
}
//@ chunk-gqez588q.js:7515-7659 placement
var DEV_FD_PATTERN = /^\/dev\/(?:fd|stdin|stdout|stderr)(?=\/|$)/;
var PROC_LINK_PATTERN =
  /^\/proc\/(?:self|thread-self|\d+)\/(?:task\/\d+\/)?(?:cwd|root|fd|exe|map_files)(?=\/|$)/;
//@ chunk-gqez588q.js:7659-8721 placement
function checkWindowsPathSafety(path, dirFacts) {
  let remotePath = resolveRemotePath(path, dirFacts);
  if (dirFacts.platform !== "win32") {
    if (remotePath === undefined) return "home_unknown";
    if (isLongPosixPath(remotePath, posix)) return "too_long";
    return getCanonicalPathVariants(remotePath, dirFacts, posix).some(
      (l) => DEV_FD_PATTERN.test(l) || (dirFacts.platform !== "darwin" && PROC_LINK_PATTERN.test(l)),
    )
      ? "magic_link"
      : undefined;
  }
  let i = normalizeWin32DrivePath(path.trim(), win32);
  let t = driveLetterOf(i);
  if (!win32.isAbsolute(i) && t !== undefined && t !== driveLetterOf(dirFacts.workingDir))
    return "other_drive_relative";
  if (remotePath === undefined) return "home_unknown";
  let normalized = win32.normalize(i);
  if (/^\\\\[?.]\\(?![a-z]:\\|UNC\\)/i.test(normalized) || hasWin32DevicePrefixSpelling(normalized))
    return "nt_device_namespace";
  let replaced = normalized.replace(/^\\\\[?.]\\UNC\\/i, "\\\\").replace(/^\\\\[?.]\\(?=[a-z]:)/i, "");
  let d = /^\\\\[^\\]+\\[^\\]+\$(?=\\|$)/.exec(replaced)?.[0];
  if (
    d !== undefined &&
    ![dirFacts.workingDir, dirFacts.homeDir].some(
      (l) =>
        l !== undefined &&
        normalizeCaseForComparison(win32.normalize(l)).startsWith(`${normalizeCaseForComparison(d)}\\`),
    )
  )
    return "administrative_share";
  let replaced_2 = replaced.replace(/^\\\\/, "");
  if (replaced_2.includes(":", /^[a-z]:/i.test(replaced_2) ? 2 : 0)) return "colon_past_drive_position";
  if (replaced_2.split("\\").some((l) => isReservedDeviceName(l) && !/^[^. ]+\./.test(l)))
    return "dos_device_name";
  let o = classifySuspiciousWindowsPathPattern(replaced_2.replace(/~(?=\d)/g, "-"));
  return o === undefined ||
    o === "device_path_prefix" ||
    o === "unc_or_webdav_form" ||
    o === "tilde_digit" ||
    o === "dos_device_suffix"
    ? undefined
    : o;
}
//@ chunk-gqez588q.js:8721-9403 placement
/**
 * 远程路径不安全原因的说明文字表（设备命名空间、备用数据流、尾随点、DOS 设备名、/proc 链接、过长、主目录未知等）。
 */
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
