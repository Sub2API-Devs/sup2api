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
import { hm } from "../../utils/pathPrefix.js";
import { cH } from "../../utils/permissions/pathVetting.js";
import { getErrnoCode, sanitizedErrCodeForTelemetry } from "../../utils/errors.js";
import { Yg } from "../../remote/remoteMode.js";
import { tz, READ_LIMITS } from "../../utils/fsBoundRead.js";
import { count } from "../../utils/collections.js";
import { getFileKind } from "../../utils/fileKind.js";
import {
  layeredReadVerdictForPaths,
  matchingDenyRuleForDirectoryContents,
  matchingRuleForInput,
} from "../../utils/permissions/filesystem.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-htc3qf7e.js:854-883 placement
var REMOTE_LIST_DIRECTORY_MAX_ENTRIES = 5000,
  h = 10 * REMOTE_LIST_DIRECTORY_MAX_ENTRIES,
  P = 1024;
/**
 * 为远端列目录：逐段打开、不跟随符号链接、按读权限规则过滤。
 */
//@ chunk-htc3qf7e.js:883-2033 placement
async function listDirectoryForRemote(n, e, r, s) {
  try {
    if (
      typeof n !== "string" ||
      n.length > P ||
      n.includes("\x00") ||
      n.includes("\\") ||
      !isWellFormedString(n) ||
      win32.parse(n).root !== "" ||
      containsPathTraversal(n)
    )
      throw repoRootError("invalid_path");
    if (!isAbsolute(e) || getPlatform() !== "linux") throw repoRootError("unexpected_error");
    let o = resolve(e, n);
    if (!hm(e, o, !0)) throw repoRootError("invalid_path");
    let a = r();
    if (cH(o, a.trustedNetworkDirectories) !== void 0) throw repoRootError("unsupported_name");
    if (isListingDenied(e, o, a)) throw repoRootError("read_rule");
    await using m = await openDirectoryNoFollow(e, o);
    if (
      !(
        await readlink(`/proc/self/fd/${m.fd}`, { encoding: "buffer" }).catch((i) => {
          throw getErrnoCode(i) === "ENOENT" ? repoRootError("unexpected_error") : i;
        })
      ).equals(Buffer.from(o))
    )
      throw repoRootError("path_not_canonical");
    let l = await readDirEntriesBounded(m);
    if (s()) throw repoRootError("workspace_moved");
    let c = r();
    if (c !== a && isListingDenied(e, o, c)) throw repoRootError("read_rule");
    let d = l.length > h;
    ((l.length = Math.min(l.length, h)), l.sort((i, f) => (i.name < f.name ? -1 : i.name > f.name ? 1 : 0)));
    let u = [],
      T = Yg(e, () => {
        for (let i of l) {
          let f = join(o, i.name);
          if (isFileReadDenied(f, c, !i.isFile())) continue;
          if (i.name.trimEnd() !== i.name && isFileReadDenied(`${f}${sep}`, c, !i.isFile())) continue;
          if (u.length === REMOTE_LIST_DIRECTORY_MAX_ENTRIES) return !0;
          u.push(i);
        }
        return !1;
      }),
      results = await Promise.all(u.map((i) => describeDirEntry(m, i)));
    return { absPath: o, entries: results.filter((i) => i !== null), truncated: T || (d && u.length > 0) };
  } catch (error) {
    throw repoRootErrorClass(error) !== void 0 ? error : listErrorFromErrno(error);
  }
}
//@ chunk-htc3qf7e.js:2033-2072 placement
var D = tz | constants.O_DIRECTORY | constants.O_NOFOLLOW | READ_LIMITS;
/**
 * 逐段打开目录，不跟随符号链接
 */
//@ chunk-htc3qf7e.js:2072-2512 placement
async function openDirectoryNoFollow(n, e) {
  let filtered = e.split(sep).filter((a) => a !== ""),
    s = count(resolve(n).split(sep), (a) => a !== "") - 1,
    o = await open(sep, D);
  for (let [a, m] of filtered.entries()) {
    await using y = o;
    let l = `/proc/self/fd/${y.fd}/${m}`;
    o = await open(l, D).catch(async (c) => {
      let d = getErrnoCode(c);
      if (d === "ENOENT")
        await lstat(`/proc/self/fd/${y.fd}`).catch(() => {
          throw repoRootError("unexpected_error");
        });
      if (d === "ENOTDIR" && (await lstat(l)).isSymbolicLink())
        throw repoRootError(a < s ? "path_not_canonical" : "symlink_in_path");
      throw c;
    });
  }
  return o;
}
/**
 * 有界读取目录条目
 */
//@ chunk-htc3qf7e.js:2512-2697 placement
async function readDirEntriesBounded(n) {
  let e = await opendir(`/proc/self/fd/${n.fd}`).catch((s) => {
      throw getErrnoCode(s) === "ENOENT" ? repoRootError("unexpected_error") : s;
    }),
    r = [];
  for await (let s of e) if ((r.push(s), r.length > h)) break;
  return r;
}
/**
 * 描述目录条目
 */
//@ chunk-htc3qf7e.js:2697-2980 placement
async function describeDirEntry(n, e) {
  let r = await getFileKind(e, `/proc/self/fd/${n.fd}/${e.name}`, "unknown");
  if (r === "unknown") return null;
  if (r === "symlink") return { name: e.name, isDirectory: !1, isSymlink: !0 };
  if (r === "other") return { name: e.name, isDirectory: !1, isSpecial: !0 };
  return { name: e.name, isDirectory: r === "dir" };
}
//@ chunk-htc3qf7e.js:2980-3104 placement
function isListingDenied(n, e, r) {
  return (
    layeredReadVerdictForPaths([], r).layer !== "allow" ||
    Yg(
      n,
      () =>
        isFileReadDenied(e, r, !0) ||
        ["deny", "ask"].some((s) => matchingDenyRuleForDirectoryContents(e, r, "read", s) !== null),
    )
  );
}
//@ chunk-htc3qf7e.js:3104-3222 placement = isFileReadDenied (1)
function isFileReadDenied(n, e, r) {
  return (r ? [{}, { isDirectory: !0 }] : [{}]).some((o) =>
    ["deny", "ask"].some((a) => matchingRuleForInput(n, e, "read", a, o) !== null),
  );
}
/**
 * errno 转目录列举错误
 */
//@ chunk-htc3qf7e.js:3222-3601 placement
function listErrorFromErrno(n) {
  switch (getErrnoCode(n)) {
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
      let e = `list_directory failed: ${sanitizedErrCodeForTelemetry(n) ?? "not a filesystem error"}`;
      return (logForDebugging(e, { level: "error" }), repoRootError("unexpected_error", e));
  }
}

export { REMOTE_LIST_DIRECTORY_MAX_ENTRIES, listDirectoryForRemote };
