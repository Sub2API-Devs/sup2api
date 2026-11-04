/**
 * services/remoteTools/remoteDirectoryList.ts
 *
 * 2.1.316 新增。为远端列目录：逐段打开、不跟随符号链接、按读权限规则过滤。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-htc3qf7e.js (9)
 * attribution: placement 9
 */
import { win32, isAbsolute, resolve, join, sep } from "path";
import { readlink, open, lstat, opendir } from "fs/promises";
import { constants } from "fs";
import { isWellFormedString } from "../../utils/stringUtils.js";
import { containsPathTraversal } from "../../utils/path.js";
import { repoRootError, repoRootErrorClass } from "../repoRoots/repoRootErrors.js";
import { getPlatform } from "../../utils/platform.js";
import { isSubpathOf } from "../../utils/pathPrefix.js";
import { pathVettingReason } from "../../utils/permissions/pathVetting.js";
import { getErrnoCode, sanitizedErrCodeForTelemetry } from "../../utils/errors.js";
import { runInRemoteCallFrameMain } from "../../remote/remoteMode.js";
import { O_NOFOLLOW_ANY, READ_LIMITS } from "../../utils/fsBoundRead.js";
import { count } from "../../utils/collections.js";
import { getFileKind } from "../../utils/fileKind.js";
import {
  layeredReadVerdictForPaths,
  matchingDenyRuleForDirectoryContents,
  matchingRuleForInput,
} from "../../utils/permissions/filesystem.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-htc3qf7e.js:854-883 placement
/**
 * 远端目录列表的条目上限与路径长度上限。
 */
var REMOTE_LIST_DIRECTORY_MAX_ENTRIES = 5000;
var MAX_LISTED_ENTRIES_RAW = 10 * REMOTE_LIST_DIRECTORY_MAX_ENTRIES;
var MAX_REMOTE_PATH_CHARS = 1024;
//@ chunk-htc3qf7e.js:883-2033 placement
/**
 * 为远端列目录：逐段打开、不跟随符号链接、按读权限规则过滤。
 */
async function listDirectoryForRemote(path, projectRoot, getPermissions, isWorkspaceMoved) {
  try {
    if (
      typeof path !== "string" ||
      path.length > MAX_REMOTE_PATH_CHARS ||
      path.includes("\x00") ||
      path.includes("\\") ||
      !isWellFormedString(path) ||
      win32.parse(path).root !== "" ||
      containsPathTraversal(path)
    )
      throw repoRootError("invalid_path");
    if (!isAbsolute(projectRoot) || getPlatform() !== "linux") throw repoRootError("unexpected_error");
    let absPath = resolve(projectRoot, path);
    if (!isSubpathOf(projectRoot, absPath, true)) throw repoRootError("invalid_path");
    let permissions = getPermissions();
    if (pathVettingReason(absPath, permissions.trustedNetworkDirectories) !== undefined)
      throw repoRootError("unsupported_name");
    if (isListingDenied(projectRoot, absPath, permissions)) throw repoRootError("read_rule");
    await using directoryNoFollow = await openDirectoryNoFollow(projectRoot, absPath);
    if (
      !(
        await readlink(`/proc/self/fd/${directoryNoFollow.fd}`, {
          encoding: "buffer",
        }).catch((error) => {
          throw getErrnoCode(error) === "ENOENT" ? repoRootError("unexpected_error") : error;
        })
      ).equals(Buffer.from(absPath))
    )
      throw repoRootError("path_not_canonical");
    let dirEntriesBounded = await readDirEntriesBounded(directoryNoFollow);
    if (isWorkspaceMoved()) throw repoRootError("workspace_moved");
    let latestPermissions = getPermissions();
    if (latestPermissions !== permissions && isListingDenied(projectRoot, absPath, latestPermissions))
      throw repoRootError("read_rule");
    let hitRawLimit = dirEntriesBounded.length > MAX_LISTED_ENTRIES_RAW;
    dirEntriesBounded.length = Math.min(dirEntriesBounded.length, MAX_LISTED_ENTRIES_RAW);
    dirEntriesBounded.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    let allowedEntries = [];
    let hitEntryLimit = runInRemoteCallFrameMain(projectRoot, () => {
      for (let entry of dirEntriesBounded) {
        let entryPath = join(absPath, entry.name);
        if (isFileReadDenied(entryPath, latestPermissions, !entry.isFile())) continue;
        if (
          entry.name.trimEnd() !== entry.name &&
          isFileReadDenied(`${entryPath}${sep}`, latestPermissions, !entry.isFile())
        )
          continue;
        if (allowedEntries.length === REMOTE_LIST_DIRECTORY_MAX_ENTRIES) return true;
        allowedEntries.push(entry);
      }
      return false;
    });
    let results = await Promise.all(
      allowedEntries.map((entry) => describeDirEntry(directoryNoFollow, entry)),
    );
    return {
      absPath,
      entries: results.filter((described) => described !== null),
      truncated: hitEntryLimit || (hitRawLimit && allowedEntries.length > 0),
    };
  } catch (error) {
    throw repoRootErrorClass(error) !== undefined ? error : listErrorFromErrno(error);
  }
}
//@ chunk-htc3qf7e.js:2033-2072 placement
var DIRECTORY_OPEN_FLAGS = O_NOFOLLOW_ANY | constants.O_DIRECTORY | constants.O_NOFOLLOW | READ_LIMITS;
//@ chunk-htc3qf7e.js:2072-2512 placement
/**
 * 逐段打开目录，不跟随符号链接
 */
async function openDirectoryNoFollow(projectRoot, targetPath) {
  let filtered = targetPath.split(sep).filter((segment) => segment !== "");
  let rootDepth = count(resolve(projectRoot).split(sep), (segment) => segment !== "") - 1;
  let dirHandle = await open(sep, DIRECTORY_OPEN_FLAGS);
  for (let [index, segment] of filtered.entries()) {
    await using parentHandle = dirHandle;
    let childPath = `/proc/self/fd/${parentHandle.fd}/${segment}`;
    dirHandle = await open(childPath, DIRECTORY_OPEN_FLAGS).catch(async (error) => {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ENOENT")
        await lstat(`/proc/self/fd/${parentHandle.fd}`).catch(() => {
          throw repoRootError("unexpected_error");
        });
      if (errnoCode === "ENOTDIR" && (await lstat(childPath)).isSymbolicLink())
        throw repoRootError(index < rootDepth ? "path_not_canonical" : "symlink_in_path");
      throw error;
    });
  }
  return dirHandle;
}
//@ chunk-htc3qf7e.js:2512-2697 placement
/**
 * 有界读取目录条目
 */
async function readDirEntriesBounded(directoryNoFollow) {
  let dir = await opendir(`/proc/self/fd/${directoryNoFollow.fd}`).catch((error) => {
    throw getErrnoCode(error) === "ENOENT" ? repoRootError("unexpected_error") : error;
  });
  let entries = [];
  for await (let entry of dir) {
    entries.push(entry);
    if (entries.length > MAX_LISTED_ENTRIES_RAW) break;
  }
  return entries;
}
//@ chunk-htc3qf7e.js:2697-2980 placement
/**
 * 描述目录条目
 */
async function describeDirEntry(directoryNoFollow, entry) {
  let fileKind = await getFileKind(entry, `/proc/self/fd/${directoryNoFollow.fd}/${entry.name}`, "unknown");
  if (fileKind === "unknown") return null;
  if (fileKind === "symlink")
    return {
      name: entry.name,
      isDirectory: false,
      isSymlink: true,
    };
  if (fileKind === "other")
    return {
      name: entry.name,
      isDirectory: false,
      isSpecial: true,
    };
  return {
    name: entry.name,
    isDirectory: fileKind === "dir",
  };
}
//@ chunk-htc3qf7e.js:2980-3104 placement
function isListingDenied(projectRoot, absPath, permissions) {
  return (
    layeredReadVerdictForPaths([], permissions).layer !== "allow" ||
    runInRemoteCallFrameMain(
      projectRoot,
      () =>
        isFileReadDenied(absPath, permissions, true) ||
        ["deny", "ask"].some(
          (behavior) => matchingDenyRuleForDirectoryContents(absPath, permissions, "read", behavior) !== null,
        ),
    )
  );
}
//@ chunk-htc3qf7e.js:3104-3222 placement = isFileReadDenied (1)
function isFileReadDenied(absPath, permissions, alsoAsDir) {
  return (
    alsoAsDir
      ? [
          {},
          {
            isDirectory: true,
          },
        ]
      : [{}]
  ).some((extra) =>
    ["deny", "ask"].some(
      (behavior) => matchingRuleForInput(absPath, permissions, "read", behavior, extra) !== null,
    ),
  );
}
//@ chunk-htc3qf7e.js:3222-3601 placement
/**
 * errno 转目录列举错误
 */
function listErrorFromErrno(error) {
  switch (getErrnoCode(error)) {
    case "ENOENT":
      return repoRootError("not_found");
    case "ENOTDIR":
      return repoRootError("not_a_directory");
    case "ELOOP":
      return repoRootError("symlink_in_path");
    case "ENAMETOOLONG":
      return repoRootError("invalid_path");
    case "EACCES":
    case "EPERM":
      return repoRootError("os_permission_denied");
    default:
      let message = `list_directory failed: ${sanitizedErrCodeForTelemetry(error) ?? "not a filesystem error"}`;
      logForDebugging(message, {
        level: "error",
      });
      return repoRootError("unexpected_error", message);
  }
}
export { REMOTE_LIST_DIRECTORY_MAX_ENTRIES, listDirectoryForRemote };
