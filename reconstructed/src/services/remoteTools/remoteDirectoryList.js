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
async function listDirectoryForRemote(path, projectRoot, r, s) {
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
    let o = resolve(projectRoot, path);
    if (!isSubpathOf(projectRoot, o, true)) throw repoRootError("invalid_path");
    let a = r();
    if (pathVettingReason(o, a.trustedNetworkDirectories) !== undefined)
      throw repoRootError("unsupported_name");
    if (isListingDenied(projectRoot, o, a)) throw repoRootError("read_rule");
    await using directoryNoFollow = await openDirectoryNoFollow(projectRoot, o);
    if (
      !(
        await readlink(`/proc/self/fd/${directoryNoFollow.fd}`, {
          encoding: "buffer",
        }).catch((error) => {
          throw getErrnoCode(error) === "ENOENT" ? repoRootError("unexpected_error") : error;
        })
      ).equals(Buffer.from(o))
    )
      throw repoRootError("path_not_canonical");
    let dirEntriesBounded = await readDirEntriesBounded(directoryNoFollow);
    if (s()) throw repoRootError("workspace_moved");
    let c = r();
    if (c !== a && isListingDenied(projectRoot, o, c)) throw repoRootError("read_rule");
    let d = dirEntriesBounded.length > MAX_LISTED_ENTRIES_RAW;
    dirEntriesBounded.length = Math.min(dirEntriesBounded.length, MAX_LISTED_ENTRIES_RAW);
    dirEntriesBounded.sort((i, f) => (i.name < f.name ? -1 : i.name > f.name ? 1 : 0));
    let u = [];
    let T = runInRemoteCallFrameMain(projectRoot, () => {
      for (let i of dirEntriesBounded) {
        let f = join(o, i.name);
        if (isFileReadDenied(f, c, !i.isFile())) continue;
        if (i.name.trimEnd() !== i.name && isFileReadDenied(`${f}${sep}`, c, !i.isFile())) continue;
        if (u.length === REMOTE_LIST_DIRECTORY_MAX_ENTRIES) return true;
        u.push(i);
      }
      return false;
    });
    let results = await Promise.all(u.map((i) => describeDirEntry(directoryNoFollow, i)));
    return {
      absPath: o,
      entries: results.filter((i) => i !== null),
      truncated: T || (d && u.length > 0),
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
async function openDirectoryNoFollow(n, e) {
  let filtered = e.split(sep).filter((a) => a !== "");
  let s = count(resolve(n).split(sep), (a) => a !== "") - 1;
  let o = await open(sep, DIRECTORY_OPEN_FLAGS);
  for (let [a, m] of filtered.entries()) {
    await using y = o;
    let l = `/proc/self/fd/${y.fd}/${m}`;
    o = await open(l, DIRECTORY_OPEN_FLAGS).catch(async (error) => {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ENOENT")
        await lstat(`/proc/self/fd/${y.fd}`).catch(() => {
          throw repoRootError("unexpected_error");
        });
      if (errnoCode === "ENOTDIR" && (await lstat(l)).isSymbolicLink())
        throw repoRootError(a < s ? "path_not_canonical" : "symlink_in_path");
      throw error;
    });
  }
  return o;
}
//@ chunk-htc3qf7e.js:2512-2697 placement
/**
 * 有界读取目录条目
 */
async function readDirEntriesBounded(directoryNoFollow) {
  let e = await opendir(`/proc/self/fd/${directoryNoFollow.fd}`).catch((error) => {
    throw getErrnoCode(error) === "ENOENT" ? repoRootError("unexpected_error") : error;
  });
  let r = [];
  for await (let s of e) {
    r.push(s);
    if (r.length > MAX_LISTED_ENTRIES_RAW) break;
  }
  return r;
}
//@ chunk-htc3qf7e.js:2697-2980 placement
/**
 * 描述目录条目
 */
async function describeDirEntry(directoryNoFollow, e) {
  let fileKind = await getFileKind(e, `/proc/self/fd/${directoryNoFollow.fd}/${e.name}`, "unknown");
  if (fileKind === "unknown") return null;
  if (fileKind === "symlink")
    return {
      name: e.name,
      isDirectory: false,
      isSymlink: true,
    };
  if (fileKind === "other")
    return {
      name: e.name,
      isDirectory: false,
      isSpecial: true,
    };
  return {
    name: e.name,
    isDirectory: fileKind === "dir",
  };
}
//@ chunk-htc3qf7e.js:2980-3104 placement
function isListingDenied(n, e, r) {
  return (
    layeredReadVerdictForPaths([], r).layer !== "allow" ||
    runInRemoteCallFrameMain(
      n,
      () =>
        isFileReadDenied(e, r, true) ||
        ["deny", "ask"].some((s) => matchingDenyRuleForDirectoryContents(e, r, "read", s) !== null),
    )
  );
}
//@ chunk-htc3qf7e.js:3104-3222 placement = isFileReadDenied (1)
function isFileReadDenied(n, e, r) {
  return (
    r
      ? [
          {},
          {
            isDirectory: true,
          },
        ]
      : [{}]
  ).some((o) => ["deny", "ask"].some((a) => matchingRuleForInput(n, e, "read", a, o) !== null));
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
      let e = `list_directory failed: ${sanitizedErrCodeForTelemetry(error) ?? "not a filesystem error"}`;
      logForDebugging(e, {
        level: "error",
      });
      return repoRootError("unexpected_error", e);
  }
}
export { REMOTE_LIST_DIRECTORY_MAX_ENTRIES, listDirectoryForRemote };
