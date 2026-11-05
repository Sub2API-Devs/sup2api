/**
 * services/remoteTools/windowsPathSafety.ts
 *
 * 2.1.316 新增。Windows 路径安全检查。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-yrtkt28g.js (10)
 * attribution: placement 10
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { win32, posix } from "path";
import {
  normalizeCaseForComparison_2,
  normalizeCaseForComparison,
  classifySuspiciousWindowsPathPattern,
} from "../../utils/permissions/filesystem.js";
import { getUnameSR, resolveRemotePath, normalizeWin32DrivePath, driveLetterOf } from "./pathMapping.js";
import {
  getCanonicalPathVariants,
  abbreviatePathForDisplay,
  isLongPosixPath,
} from "../../utils/displayPath.js";
import { foldCase_2 } from "../../utils/networkPaths.js";
import { hasWin32DevicePrefixSpelling } from "../../utils/fsJunctions.js";
import { isReservedDeviceName } from "../../utils/windowsProfileFolders.js";

//@ chunk-yrtkt28g.js:5914-6104 placement
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
//@ chunk-yrtkt28g.js:6104-6190 placement
function usrMergeAliasesFor(path, from, to) {
  return path === from || path.startsWith(`${from}/`) ? [`${to}${path.slice(from.length)}`] : [];
}
//@ chunk-yrtkt28g.js:6190-6257 placement
function usrMergeAliasSpellings(path) {
  return USR_MERGE_ALIASES.flatMap(([from, to]) => [
    ...usrMergeAliasesFor(path, from, to),
    ...usrMergeAliasesFor(path, to, from),
  ]);
}
//@ chunk-yrtkt28g.js:6257-6420 placement
function platformPathAliases(path, platform) {
  return platform === "darwin"
    ? [path.replace(/^\/private(?=\/(?:tmp|var|etc)(?:\/|$))/i, "")].filter((alias) => alias !== path)
    : platform === "linux"
      ? normalizeCaseForComparison_2(
          usrMergeAliasSpellings(path).flatMap((alias) => [alias, ...usrMergeAliasSpellings(alias)]),
        )
      : [];
}
//@ chunk-yrtkt28g.js:6420-6974 placement
/**
 * 列出远程路径的所有等价写法（规范化变体、平台别名如 /private 与 usr-merge、缩写显示形式、大小写/NFC/NFD 变体，以及副本目录中的对应路径），用于匹配权限规则。
 */
function remotePathSpellings(path, dirFacts) {
  let unameSR = getUnameSR(dirFacts.platform);
  let remotePath = resolveRemotePath(path, dirFacts);
  if (remotePath === undefined || !unameSR.isAbsolute(remotePath)) return [];
  let flattened = getCanonicalPathVariants(remotePath, dirFacts, unameSR).flatMap((variant) => [
    variant,
    ...platformPathAliases(variant, dirFacts.platform),
  ]);
  let foldCase = pathCaseFolder(dirFacts.platform);
  let normalized = unameSR.normalize(normalizeWin32DrivePath(path.trim(), unameSR));
  let flattened_2 = flattened.flatMap((variant) => abbreviatePathForDisplay(variant, dirFacts, unameSR));
  let copyOf = dirFacts.copyOf;
  return normalizeCaseForComparison_2([
    ...[...flattened_2, ...(unameSR === win32 ? [] : flattened)]
      .flatMap((spelling) =>
        [spelling, foldCase(spelling)].flatMap((folded) =>
          dirFacts.platform === "darwin"
            ? [folded, folded.normalize("NFC"), folded.normalize("NFD")]
            : [folded],
        ),
      )
      .filter((spelling) => spelling !== normalized),
    ...(copyOf === undefined
      ? []
      : flattened
          .flatMap((variant) =>
            abbreviatePathForDisplay(
              variant,
              {
                ...dirFacts,
                mirroredDir: dirFacts.workingDir,
                homeDir: undefined,
              },
              unameSR,
            ),
          )
          .map((display) => getUnameSR(copyOf.platform).join(copyOf.workingDir, display.slice(2)))
          .flatMap((joined) => [joined, ...remotePathSpellings(joined, copyOf)])),
  ]);
}
//@ chunk-yrtkt28g.js:6974-7432 placement
/**
 * 把绝对的 glob 路径拆分为不含通配的根目录和剩余模式（处理 Windows 长路径与 UNC 前缀）。
 */
function splitGlobRoot(pattern, dirFacts) {
  let unameSR = getUnameSR(dirFacts.platform);
  let normalized = normalizeWin32DrivePath(pattern.trim(), unameSR);
  if (!unameSR.isAbsolute(normalized)) return;
  let stripped =
    unameSR === win32
      ? normalized.replace(/^[\\/]{2}[?.][\\/]UNC[\\/]/i, "\\\\").replace(/^[\\/]{2}[?.][\\/](?=[a-z]:)/i, "")
      : normalized;
  let parts = stripped.split(unameSR === win32 ? /[\\/]/ : "/");
  let skipParts = unameSR === win32 && /^[\\/]{2}[?.][\\/]/.test(stripped) ? 3 : 0;
  let index = parts.slice(skipParts).findIndex((part) => /[*?[{]/.test(part));
  let globIndex = index === -1 ? -1 : index + skipParts;
  let root = (globIndex === -1 ? parts : parts.slice(0, globIndex)).join(unameSR.sep) || unameSR.sep;
  return {
    root: unameSR === win32 && /^[a-z]:$/i.test(root) ? `${root}${unameSR.sep}` : root,
    rest: globIndex === -1 ? "" : parts.slice(globIndex).join("/"),
  };
}
//@ chunk-yrtkt28g.js:7432-7548 placement
function pathCaseFolder(platform) {
  return platform === "win32"
    ? (path) => path.toUpperCase().toLowerCase()
    : platform === "darwin"
      ? (path) => foldCase_2(path.normalize("NFC"))
      : (path) => path;
}
//@ chunk-yrtkt28g.js:7548-7692 placement
var DEV_FD_PATTERN = /^\/dev\/(?:fd|stdin|stdout|stderr)(?=\/|$)/;
var PROC_LINK_PATTERN =
  /^\/proc\/(?:self|thread-self|\d+)\/(?:task\/\d+\/)?(?:cwd|root|fd|exe|map_files)(?=\/|$)/;
//@ chunk-yrtkt28g.js:7692-8754 placement
function checkWindowsPathSafety(path, dirFacts) {
  let path_2 = resolveRemotePath(path, dirFacts);
  if (dirFacts.platform !== "win32") {
    if (path_2 === undefined) return "home_unknown";
    if (isLongPosixPath(path_2, posix)) return "too_long";
    return getCanonicalPathVariants(path_2, dirFacts, posix).some(
      (variant) =>
        DEV_FD_PATTERN.test(variant) || (dirFacts.platform !== "darwin" && PROC_LINK_PATTERN.test(variant)),
    )
      ? "magic_link"
      : undefined;
  }
  let winPath = normalizeWin32DrivePath(path.trim(), win32);
  let driveLetter = driveLetterOf(winPath);
  if (
    !win32.isAbsolute(winPath) &&
    driveLetter !== undefined &&
    driveLetter !== driveLetterOf(dirFacts.workingDir)
  )
    return "other_drive_relative";
  if (path_2 === undefined) return "home_unknown";
  let normalized = win32.normalize(winPath);
  if (/^\\\\[?.]\\(?![a-z]:\\|UNC\\)/i.test(normalized) || hasWin32DevicePrefixSpelling(normalized))
    return "nt_device_namespace";
  let replaced = normalized.replace(/^\\\\[?.]\\UNC\\/i, "\\\\").replace(/^\\\\[?.]\\(?=[a-z]:)/i, "");
  let adminShare = /^\\\\[^\\]+\\[^\\]+\$(?=\\|$)/.exec(replaced)?.[0];
  if (
    adminShare !== undefined &&
    ![dirFacts.workingDir, dirFacts.homeDir].some(
      (root) =>
        root !== undefined &&
        normalizeCaseForComparison(win32.normalize(root)).startsWith(
          `${normalizeCaseForComparison(adminShare)}\\`,
        ),
    )
  )
    return "administrative_share";
  let replaced_2 = replaced.replace(/^\\\\/, "");
  if (replaced_2.includes(":", /^[a-z]:/i.test(replaced_2) ? 2 : 0)) return "colon_past_drive_position";
  if (replaced_2.split("\\").some((segment) => isReservedDeviceName(segment) && !/^[^. ]+\./.test(segment)))
    return "dos_device_name";
  let suspicion = classifySuspiciousWindowsPathPattern(replaced_2.replace(/~(?=\d)/g, "-"));
  return suspicion === undefined ||
    suspicion === "device_path_prefix" ||
    suspicion === "unc_or_webdav_form" ||
    suspicion === "tilde_digit" ||
    suspicion === "dos_device_suffix"
    ? undefined
    : suspicion;
}
//@ chunk-yrtkt28g.js:8754-9436 placement
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
  pathCaseFolder,
  splitGlobRoot,
  remotePathSpellings,
  checkWindowsPathSafety,
  UNSAFE_PATH_REASON_TEXT,
};
