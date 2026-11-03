/**
 * utils/teleport/wipStash.ts
 *
 * 2.1.316 新增：上传前捕获未提交修改（WIP stash）：安全读取工作树文件、对比索引/HEAD、构造种子树与引用
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-gjx0rh1b.js (108)
 * attribution: placement 108
 */
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  basename,
  basename as basename_2,
  isAbsolute,
  isAbsolute as isAbsolute_2,
} from "path";
import {
  mkdir,
  mkdir as mkdir_2,
  mkdir as mkdir_3,
  mkdir as mkdir_4,
  open,
  open as open_2,
  open as open_3,
  open as open_4,
  open as open_5,
  open as open_6,
  open as open_7,
  unlink,
  unlink as unlink_2,
  unlink as unlink_3,
  unlink as unlink_4,
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  readlink,
  readlink as readlink_2,
  mkdtemp,
  mkdtemp as mkdtemp_2,
  mkdtemp as mkdtemp_3,
  rm,
  rm as rm_2,
  rm as rm_3,
  rm as rm_4,
  rm as rm_5,
  stat,
  stat as stat_2,
  stat as stat_3,
  writeFile,
  writeFile as writeFile_2,
  writeFile as writeFile_3,
  readdir,
  readdir as readdir_2,
  readdir as readdir_3,
  readFile,
  readFile as readFile_2,
} from "fs/promises";
import { constants, constants as constants_2, constants as constants_3 } from "fs";
import {
  createHash,
  createHash as createHash_2,
  createHash as createHash_3,
  createHash as createHash_4,
  randomBytes,
  randomBytes as randomBytes_2,
  randomBytes as randomBytes_3,
} from "crypto";
import { promisify } from "util";
import { deflate } from "zlib";
import { isPlainRelativePath } from "./seedPaths.js";
import { limitConcurrency } from "../concurrencyLimit.js";
import { READ_LIMITS, tz } from "../fsBoundRead.js";
import { getErrnoCode, errorMessage } from "../errors.js";
import { getPlatform } from "../platform.js";
import { listAncestorDirs } from "../path.js";
import { isSafeRepoRelativePath, Ft, hasDosShortNameSegment } from "./gitBundleVerify.js";
import { logEvent } from "../../services/analytics/index.js";
import { uniq, count } from "../collections.js";
import {
  listIndexEntriesNamed,
  Cqr,
  chunkArgsByBytes,
  txe,
  readFileChunks,
  YZn,
  LITERAL_PATHSPEC_ENV,
  Rqr,
} from "../git/builderGit/gitRun.js";
import { parseGitVersion } from "../../remote/tools/servedOwnerSettings.js";
import { yieldToEventLoop } from "../../native-ts/file-index/index.js";
import { HNe } from "../git/builderGit/gitBinary.js";
import { Dnt } from "../git/builderGit/gitDirIdentity.js";
import {
  CREDENTIAL_CONFIG_PATHS,
  v3o,
  _H,
  getPathNormalizationVariants,
  O6r,
  w3o,
  E3o,
  U$e,
  expandNameReadings,
  bor,
} from "../permissions/sensitivePaths.js";
import { resolveTempDir, reachForBoundSession, mee, UVo, Lnt } from "../git/builderGit/gitEnv.js";
import { logForDebugging } from "../debug.js";
import { listGitRefs } from "../git/builderGit/gitConfigAudit.js";
import { splitIndexOffArgs, rKt } from "../git/builderGit/repoCopy.js";
import { Lqr } from "../git/builderGit/sandboxReach.js";
import { Rii } from "../windowsPathNames.js";
import { getFirstLine, truncateCodePoints, firstLineOf } from "../stringUtils.js";
import { $c } from "../platformTargets.js";
import { readJunction } from "../fsJunctions.js";
import { sleep } from "../sleep.js";

//@ chunk-gjx0rh1b.js:14008-14041 placement
var As = 8,
  ln = 1048576,
  Is = 536870912;
/**
 * 读取变更文件内容（只接受 git 会写的路径、累计大小上限、硬链接/变化检测）。
 */
//@ chunk-gjx0rh1b.js:14041-17495 placement
async function readChangedFilesForStash(e, n, r, o, s) {
  let found = r.find((R) => !isPlainRelativePath(R));
  if (found !== void 0) return { refused: `${found}: not a path git writes`, tooLarge: !1, momentary: !1 };
  let h = 0,
    u = null,
    p = missingGitattributesPaths(r),
    w = new Set(r),
    _ = limitConcurrency(As, async (R) => {
      await s.beforeOpen?.(R);
      let B = !1,
        x = await lstatOrAbsent(e, R);
      if (x === "symlink") return { kind: "absent", path: R };
      if (x === "unreadable")
        return { refused: `${R}: a directory above it could not be inspected`, tooLarge: !1, momentary: !0 };
      await s.beforeRead?.(R);
      let S = await readWorktreeFileSafely(e, R, s.ntfsRules),
        z = (Y) => compareFileIdentity(e, R, Y);
      switch (S.kind) {
        case "absent":
          return { kind: "absent", path: R };
        case "refused":
          return w.has(R)
            ? { refused: `${R}: ${S.why}`, tooLarge: !1, momentary: S.momentary }
            : { kind: "absent", path: R };
        case "hardlinked":
          return { kind: "hardlinked", path: R };
        case "moved":
          return { kind: "changed", path: R };
        case "not_read":
          return (S.why === "name_not_plain" || S.why === "beyond_a_link") && !w.has(R)
            ? { kind: "absent", path: R }
            : { kind: "not_read", path: R, why: S.why };
        case "symlink":
          return { kind: "symlink", path: R, target: S.target };
        case "file":
          try {
            if (((h += S.size), u === null || S.size > u.size)) u = { path: R, size: S.size };
            if (h > o)
              return {
                refused: `${u.path} (largest, ${u.size} bytes): ${h} bytes of changed files exceed the ${o}-byte cap`,
                tooLarge: !0,
                momentary: !1,
              };
            let L = join_5(n, R);
            await mkdir_3(dirname_3(L), { recursive: !0 });
            let U;
            try {
              U = await open_6(
                L,
                constants_2.O_WRONLY | constants_2.O_CREAT | constants_2.O_EXCL | READ_LIMITS,
                S.executable ? 493 : 420,
              );
            } catch (error) {
              if (getErrnoCode(error) === "EEXIST")
                return {
                  refused: `${R}: collides with another changed path that differs only in case or normalization`,
                  tooLarge: !1,
                  momentary: !1,
                };
              throw error;
            }
            try {
              let stats = await S.handle.stat({ bigint: !0 });
              if (
                s.notOlderThanNs !== void 0 &&
                stats.ctimeNs >= s.notOlderThanNs &&
                stats.ctimeNs < (BigInt(Date.now()) + 1n) * 1000000n
              )
                return (
                  await U.close(),
                  await unlink_4(L).catch(() => {}),
                  { kind: "changed", path: R, sincePassStart: !0 }
                );
              let pe = createHash_2("sha256"),
                X =
                  s.objectFormat === void 0
                    ? null
                    : createHash_2(s.objectFormat).update(`blob ${stats.size}\x00`),
                Te = 0,
                le = !1,
                allocUnsafe = Buffer.allocUnsafe(Math.min(S.size, ln)),
                ie = 0;
              while (ie < S.size) {
                let { bytesRead: bytesRead } = await S.handle.read(
                  allocUnsafe,
                  0,
                  Math.min(allocUnsafe.length, S.size - ie),
                  ie,
                );
                if (bytesRead === 0) break;
                if ((pe.update(allocUnsafe.subarray(0, bytesRead)), X !== null)) {
                  let chunk = allocUnsafe.subarray(0, bytesRead);
                  (X.update(chunk), (Te += countCrlf(chunk, le)), (le = chunk.at(-1) === 13));
                }
                let $e = 0;
                while ($e < bytesRead) {
                  let { bytesWritten: bytesWritten } = await U.write(allocUnsafe, $e, bytesRead - $e);
                  $e += bytesWritten;
                }
                ie += bytesRead;
              }
              await s.afterRead?.(R);
              let stats_2 = await S.handle.stat({ bigint: !0 }),
                _e = s.objectFormat !== void 0 && Te > 0 ? createLfBlobHasher(s.objectFormat, ie, Te) : null;
              if (
                BigInt(ie) !== stats.size ||
                stats_2.size !== stats.size ||
                stats_2.mtimeNs !== stats.mtimeNs ||
                stats_2.ctimeNs !== stats.ctimeNs ||
                !(await hashFileWithinLimit(S.handle, ie, pe.digest(), _e?.update))
              )
                return (await U.close(), await unlink_4(L).catch(() => {}), { kind: "changed", path: R });
              let Ce = await z(S);
              if (Ce !== "same")
                return (await U.close(), await unlink_4(L).catch(() => {}), { kind: Ce, path: R });
              await U.utimes(S.atime, S.mtime);
              let stats_3 = await U.stat({ bigint: !0 });
              return {
                kind: "file",
                path: R,
                bytes: ie,
                copy: {
                  ino: Number(stats_3.ino),
                  dev: Number(stats_3.dev),
                  ctimeNs: stats_3.ctimeNs,
                  size: Number(stats_3.size),
                  identity: getFileIdentity(stats_3),
                  ...(X !== null && {
                    blobId: X.digest("hex"),
                    ...(_e !== null && { lfBlobId: _e.digest() }),
                  }),
                },
              };
            } finally {
              await U.close().catch(() => {});
            }
          } catch (error) {
            let L = getErrnoCode(error);
            return {
              refused: `${R}: could not be staged (${L ?? errorMessage(error)})`,
              tooLarge: !1,
              momentary: L === void 0 || !qn.has(L),
            };
          } finally {
            await S.handle.close();
          }
      }
    }),
    results = await Promise.all([...r, ...p].map(_)),
    found_2 = results.find((R) => "refused" in R);
  if (found_2 !== void 0) return found_2.tooLarge ? { ...found_2, claimedBytes: h } : found_2;
  let filtered = results.filter((R) => !("refused" in R)),
    flattened = filtered.flatMap((R) => (R.kind === "not_read" ? [R.why] : []));
  return {
    entries: filtered.filter(
      (R) => w.has(R.path) || R.kind === "hardlinked" || R.kind === "changed" || R.kind === "not_read",
    ),
    copies: filtered.flatMap((R) =>
      R.kind === "file" ? [R] : isGitattributesPath(R.path) ? [{ kind: "absent", path: R.path }] : [],
    ),
  };
}
/**
 * 确认暂存副本在 git 读取期间未被改动（比较 inode、大小、ctime 等）。
 */
//@ chunk-gjx0rh1b.js:17495-17950 placement
async function stagedCopiesUnchanged(e, n) {
  return (
    await Promise.all(
      n.map(async (o) => {
        if (o.kind === "absent")
          return lstat_3(join_5(e, o.path)).then(
            () => !1,
            (s) => {
              let l = getErrnoCode(s);
              return l === "ENOENT" || l === "ENOTDIR";
            },
          );
        if (o.kind !== "file") return !0;
        try {
          let s = await lstat_3(join_5(e, o.path), { bigint: !0 });
          return (
            s.isFile() &&
            s.nlink === 1n &&
            Number(s.ino) === o.copy.ino &&
            Number(s.dev) === o.copy.dev &&
            getFileIdentity(s) === o.copy.identity &&
            s.ctimeNs === o.copy.ctimeNs &&
            Number(s.size) === o.copy.size
          );
        } catch {
          return !1;
        }
      }),
    )
  ).every(Boolean);
}
//@ chunk-gjx0rh1b.js:17950-18020 placement = getFileIdentity (0.794)
function getFileIdentity(filePath) {
  return filePath.dev === 0n || filePath.ino === 0n ? null : `${filePath.dev}:${filePath.ino}`;
}
//@ chunk-gjx0rh1b.js:18020-18228 placement
async function compareFileIdentity(e, n, r) {
  let o = await lstat_3(join_5(e, n), { bigint: !0 }).catch(() => null);
  if (o !== null && o.isFile() && o.nlink > 1n) return "hardlinked";
  return o === null || !o.isFile() || o.ino !== r.ino || o.dev !== r.dev ? "changed" : "same";
}
//@ chunk-gjx0rh1b.js:18228-18489 placement
async function hashFileWithinLimit(e, n, r, o) {
  let s = createHash_2("sha256"),
    allocUnsafe = Buffer.allocUnsafe(Math.min(n + 1, ln)),
    h = 0;
  for (;;) {
    let { bytesRead: bytesRead } = await e.read(allocUnsafe, 0, allocUnsafe.length, h);
    if (bytesRead === 0) break;
    if (
      (s.update(allocUnsafe.subarray(0, bytesRead)),
      o?.(allocUnsafe.subarray(0, bytesRead)),
      (h += bytesRead),
      h > n)
    )
      return !1;
  }
  return h === n && s.digest().equals(r);
}
/**
 * 创建计算 blob 哈希的流式哈希器，把 CRLF 转为 LF 计算。
 */
//@ chunk-gjx0rh1b.js:18489-18816 placement
function createLfBlobHasher(e, n, r) {
  let update = createHash_2(e).update(`blob ${n - r}\x00`),
    s = !1;
  return {
    update(l) {
      if (l.length === 0) return;
      if (s && l[0] !== 10) update.update(Buffer.from([13]));
      s = l.at(-1) === 13;
      let h = s ? l.subarray(0, l.length - 1) : l;
      update.update(
        h.toString("latin1").replaceAll(
          `\r
`,
          `
`,
        ),
        "latin1",
      );
    },
    digest() {
      if (s) update.update(Buffer.from([13]));
      return update.digest("hex");
    },
  };
}
//@ chunk-gjx0rh1b.js:18816-18961 placement
function isGitattributesPath(e) {
  let n = getPlatform(),
    r = hi(e).at(-1) ?? "";
  return n === "macos" || n === "windows" || n === "wsl"
    ? r.toLowerCase() === ".gitattributes"
    : r === ".gitattributes";
}
//@ chunk-gjx0rh1b.js:18961-19101 placement
function missingGitattributesPaths(e) {
  let n = new Set(e);
  return (
    e.length === 0 ? [] : [".gitattributes", ...listAncestorDirs(e).map((r) => `${r}/.gitattributes`)]
  ).filter((r) => !n.has(r));
}
//@ chunk-gjx0rh1b.js:19101-19170 placement
var qn = new Set(["ENAMETOOLONG", "ENOTDIR", "EISDIR", "EINVAL", "ELOOP"]);
//@ chunk-gjx0rh1b.js:19170-19186 placement
var $s = 92,
  Ds = 47;
//@ chunk-gjx0rh1b.js:19186-19267 placement
function Ps(e, n = getPlatform()) {
  return n === "windows" ? Buffer.from(e.map((r) => (r === $s ? Ds : r))) : e;
}
//@ chunk-gjx0rh1b.js:19267-19558 placement
async function openViaProcFd(e, n) {
  if (n !== "linux") return readlink_2(e, { encoding: "buffer" });
  let r = await open_6(dirname_3(e), tz | constants_2.O_DIRECTORY | READ_LIMITS);
  try {
    let o = `/proc/self/fd/${r.fd}`,
      s = await readlink_2(o);
    return s === dirname_3(e)
      ? await readlink_2(join_5(o, basename_2(e)), { encoding: "buffer" })
      : s === `${dirname_3(e)} (deleted)`
        ? "moved"
        : "elsewhere";
  } finally {
    await r.close();
  }
}
/**
 * 以不跟随链接方式读取工作树文件，检测被替换、硬链接、变化。
 */
//@ chunk-gjx0rh1b.js:19558-21423 placement
async function readWorktreeFileSafely(e, n, r) {
  if (!isSafeRepoRelativePath(n, r)) return { kind: "refused", why: "not a path git writes", momentary: !1 };
  let o = join_5(e, n),
    s = "linux",
    l =
      constants_2.O_RDONLY |
      (s === "darwin" ? Is : constants_2.O_NOFOLLOW) |
      (constants_2.O_NONBLOCK ?? 0) |
      (constants_2.O_NOCTTY ?? 0),
    h;
  try {
    if (s === "win32") {
      let u = await lstat_3(o);
      if (u.isSymbolicLink()) throw Object.assign(Error("symbolic link"), { code: "ELOOP" });
      if (!u.isFile()) return { kind: "refused", why: "not a regular file", momentary: !1 };
    }
    h = await open_6(o, s === "win32" ? "r" : l);
  } catch (error) {
    let p = getErrnoCode(error);
    if (p === "ENOENT" || p === "ENOTDIR") return { kind: "absent" };
    if (p === "ELOOP" || p === "EMLINK" || p === "EFTYPE")
      try {
        let y = await openViaProcFd(o, s);
        if (y === "moved") return { kind: "moved" };
        let E = await lstatOrAbsent(e, n);
        if (E === "symlink") return { kind: "absent" };
        if (E === "unreadable")
          return { kind: "refused", why: "a directory above it could not be inspected", momentary: !0 };
        if (y !== "elsewhere") return { kind: "symlink", target: Ps(y) };
        return (
          logEvent("tengu_upload_stage_link_read_elsewhere", {}),
          { kind: "refused", why: "resolved outside its directory", momentary: !1 }
        );
      } catch {
        return { kind: "refused", why: "changed while being read", momentary: !0 };
      }
    let w = s === "win32" ? null : await lstat_3(o).catch(() => null),
      _ = w !== null && !w.isFile() && !w.isSymbolicLink();
    return {
      kind: "refused",
      why: `could not be opened (${p ?? "unknown"})`,
      momentary: !_ && (p === void 0 || !qn.has(p)),
    };
  }
  try {
    let stats = await h.stat({ bigint: !0 });
    if (!stats.isFile())
      return (await h.close(), { kind: "refused", why: "not a regular file", momentary: !1 });
    if (stats.nlink > 1n) return (await h.close(), { kind: "hardlinked" });
    if (s === "linux") {
      let p = await readlink_2(`/proc/self/fd/${h.fd}`);
      if (p !== o)
        return (
          await h.close(),
          p === `${o} (deleted)` || dirname_3(p) === dirname_3(o)
            ? { kind: "moved" }
            : { kind: "refused", why: "resolved outside its directory", momentary: !1 }
        );
    }
    return {
      kind: "file",
      handle: h,
      size: Number(stats.size),
      ino: stats.ino,
      dev: stats.dev,
      executable: (stats.mode & 0o111n) !== 0n,
      atime: stats.atime,
      mtime: stats.mtime,
    };
  } catch (error) {
    await h.close().catch(() => {});
    let p = getErrnoCode(error);
    return { kind: "refused", why: errorMessage(error), momentary: p === void 0 || !qn.has(p) };
  }
}
//@ chunk-gjx0rh1b.js:21423-21498 placement
function hi(e) {
  return (getPlatform() === "windows" ? e.replaceAll("\\", "/") : e).split("/");
}
//@ chunk-gjx0rh1b.js:21498-21724 placement
async function lstatOrAbsent(e, n) {
  let r = e;
  for (let o of hi(n).slice(0, -1)) {
    r = join_5(r, o);
    try {
      if ((await lstat_3(r)).isSymbolicLink()) return "symlink";
    } catch (error) {
      let l = getErrnoCode(error);
      if (l === "ENOENT" || l === "ENOTDIR") return "clear";
      return "unreadable";
    }
  }
  return "clear";
}
/**
 * 安全地读取工作树内小文件（确认未被替换、无硬链接），计算它可能对应的 blob id 集合（含 CRLF、ident 变体）。
 */
//@ chunk-gjx0rh1b.js:21724-22254 placement
async function readWorktreeBlobIds(workTree, relPath, oidLength, maxBytes, s) {
  if ((await lstatOrAbsent(workTree, relPath)) !== "clear") return null;
  let opened = await readWorktreeFileSafely(workTree, relPath, s);
  if (opened.kind !== "file") return null;
  try {
    if (opened.size > maxBytes) return null;
    let buffer = Buffer.alloc(opened.size + 1),
      offset = 0;
    while (offset < buffer.length) {
      let { bytesRead: bytesRead } = await opened.handle.read(buffer, offset, buffer.length - offset, offset);
      if (bytesRead === 0) break;
      offset += bytesRead;
    }
    if (offset !== opened.size) return null;
    let p = await lstat_3(join_5(workTree, relPath), { bigint: !0 }).catch(() => null);
    if (p === null || !p.isFile() || p.nlink > 1n || p.ino !== opened.ino || p.dev !== opened.dev)
      return null;
    return candidateBlobIds(buffer.subarray(0, opened.size), oidLength);
  } catch {
    return null;
  } finally {
    await opened.handle.close().catch(() => {});
  }
}
//@ chunk-gjx0rh1b.js:22254-22359 placement
function candidateBlobIds(e, n) {
  let r = n === 64 ? "sha256" : "sha1",
    o = collapseIdentKeywords(e);
  return [e, ...(o === null ? [] : [o])].flatMap((s) => blobIdsForContent(s, r));
}
//@ chunk-gjx0rh1b.js:22359-22575 placement
function blobIdsForContent(e, n) {
  let digest = createHash_2(n).update(`blob ${e.length}\x00`).update(e).digest("hex"),
    o = countCrlf(e, !1);
  if (o === 0) return [digest];
  let s = createLfBlobHasher(n, e.length, o);
  for (let l = 0; l < e.length; l += ln) s.update(e.subarray(l, l + ln));
  return [digest, s.digest()];
}
//@ chunk-gjx0rh1b.js:22575-22631 placement
var Xn = 36,
  buffer_3 = Buffer.from("$Id:"),
  buffer_4 = Buffer.from("$Id$");
/**
 * 把展开的 $Id$ 关键字还原为未展开形式，无变化返回 null。
 */
//@ chunk-gjx0rh1b.js:22631-23004 placement
function collapseIdentKeywords(e) {
  let index = e.indexOf(buffer_3);
  if (index === -1) return null;
  let allocUnsafe = Buffer.allocUnsafe(e.length),
    copy = e.copy(allocUnsafe, 0, 0, index),
    s = index;
  while (s < e.length) {
    let l = -1;
    if (e[s] === Xn && e[s + 1] === buffer_3[1] && e[s + 2] === buffer_3[2] && e[s + 3] === buffer_3[3]) {
      let h = s + buffer_3.length;
      while (h < e.length && e[h] !== Xn && e[h] !== 10) h++;
      l = e[h] === Xn ? h : -1;
    }
    if (l === -1) allocUnsafe[copy++] = e[s++];
    else ((copy += buffer_4.copy(allocUnsafe, copy)), (s = l + 1));
  }
  return copy === e.length ? null : allocUnsafe.subarray(0, copy);
}
//@ chunk-gjx0rh1b.js:23004-23138 placement
function countCrlf(e, n) {
  let r = n && e[0] === 10 ? 1 : 0;
  if (!e.includes(13)) return r;
  for (let o = 1; o < e.length; o++) if (e[o] === 10 && e[o - 1] === 13) r++;
  return r;
}
//@ chunk-gjx0rh1b.js:23576-23731 placement
var SEED_READ_PROBLEMS = { failed: "unreadable" },
  jt = { failed: "tampered" },
  Xs = { failed: "missing" },
  qs = 67108864,
  Vs = 4000000,
  Js = new Set(["100644", "100755", "120000", "40000", "160000"]);
//@ chunk-gjx0rh1b.js:23731-23865 placement
function isTreeReadFailure(e) {
  return (
    typeof e === "object" &&
    e !== null &&
    !Array.isArray(e) &&
    !(e instanceof Map) &&
    "failed" in e &&
    typeof e.failed === "string"
  );
}
//@ chunk-gjx0rh1b.js:23865-23976 placement
var TREE_MODE = "40000",
  GITLINK_MODE = "160000",
  SYMLINK_MODE = "120000",
  padFileMode = (e) => e.padStart(6, "0"),
  entryKindForMode = (e) => (e === GITLINK_MODE ? "gitlink" : e === SYMLINK_MODE ? "link" : "file");
//@ chunk-gjx0rh1b.js:23976-24497 placement
function batchCatFile(e, n) {
  return async (r) => {
    let o = null;
    try {
      o = await mkdtemp_3(join_7(n, "claude-seed-reads-"));
      let s = await open_7(
        join_7(o, "batch"),
        constants_3.O_RDWR | constants_3.O_CREAT | constants_3.O_EXCL | READ_LIMITS,
        384,
      );
      try {
        let l = await e(["cat-file", "--batch"], void 0, r, void 0, s.fd),
          { size: size } = await s.stat();
        if (l.code !== 0 || size > qs) return null;
        let alloc = Buffer.alloc(size);
        for (let p = 0; p < size;) {
          let { bytesRead: bytesRead } = await s.read(alloc, p, size - p, p);
          if (bytesRead === 0) return null;
          p += bytesRead;
        }
        return alloc;
      } finally {
        await s.close().catch(() => {});
      }
    } catch {
      return null;
    } finally {
      if (o !== null) await rm_5(o, { recursive: !0, force: !0 }).catch(() => {});
    }
  };
}
/**
 * 通过 git cat-file 批量读取对象，校验 sha1/sha256 哈希。
 */
//@ chunk-gjx0rh1b.js:24497-26246 placement
class GitObjectReader {
  fetch;
  listings = new Map();
  bodies = new Map();
  algorithm;
  idLength;
  constructor(e, n) {
    this.fetch = e;
    ((this.algorithm = n.length === 64 ? "sha256" : "sha1"), (this.idLength = n.length));
  }
  hashes(e, n, r) {
    return createHash_4(this.algorithm).update(`${e} ${n.length}\x00`).update(n).digest("hex") === r;
  }
  async trees(e) {
    let n = uniq(e.filter((o) => !this.listings.has(o)));
    if (n.length === 0) return !0;
    let read = await this.read("tree", n);
    if (isTreeReadFailure(read)) return read;
    for (let [o, s] of read) {
      let l = parseTreeEntries(s, this.idLength / 2);
      if (l === null) return jt;
      if (l === "malformed") return { failed: "malformed", tree: o };
      this.listings.set(o, l);
    }
    return !0;
  }
  listing(e) {
    return this.listings.get(e);
  }
  async commit(e) {
    let commits = await this.commits([e]);
    return isTreeReadFailure(commits) ? commits : commits.get(e);
  }
  async commits(e) {
    let n = uniq([...e]),
      r = n.length === 0 ? new Map() : await this.read("commit", n);
    if (isTreeReadFailure(r)) return r;
    let o = new Map();
    for (let [s, l] of r) {
      let parts = l
          .subarray(
            0,
            Math.max(
              0,
              l.indexOf(`

`),
            ),
          )
          .toString("latin1").split(`
`),
        u = /^tree ([0-9a-f]{40,64})$/.exec(parts[0] ?? "")?.[1],
        p = [];
      for (let w of parts.slice(1)) {
        let _ = /^parent ([0-9a-f]{40,64})$/.exec(w)?.[1];
        if (_ === void 0) break;
        p.push(_);
      }
      if (u === void 0 || [u, ...p].some((w) => w.length !== this.idLength)) return jt;
      o.set(s, { tree: u, parents: p });
    }
    return o;
  }
  async blobs(e) {
    return e.length === 0 ? new Map() : this.read("blob", uniq([...e]));
  }
  async read(e, n) {
    let response = await this.fetch(
      n
        .map(
          (l) => `${l}
`,
        )
        .join(""),
    );
    if (response === null) return SEED_READ_PROBLEMS;
    if (isTreeReadFailure(response)) return response;
    let o = new Map(),
      s = 0;
    for (let l of n) {
      let index = response.indexOf(10, s);
      if (index === -1) return SEED_READ_PROBLEMS;
      let str = response.subarray(s, index).toString("latin1");
      if (str === `${l} missing`) return Xs;
      let match = /^([0-9a-f]{40,64}) (\w+) (\d+)$/.exec(str);
      if (match === null || match[1] !== l) return SEED_READ_PROBLEMS;
      if (match[2] !== e) return jt;
      let w = Number(match[3]),
        buffer = Buffer.from(response.subarray(index + 1, index + 1 + w));
      if (buffer.length !== w) return SEED_READ_PROBLEMS;
      if (!this.hashes(e, buffer, l)) return jt;
      if (e !== "blob") this.bodies.set(l, buffer);
      (o.set(l, buffer), (s = index + 1 + w + 1));
    }
    return o;
  }
}
//@ chunk-gjx0rh1b.js:26246-26718 placement
function parseTreeEntries(e, n) {
  let r = new Map(),
    o = 0,
    s = null,
    l = !1;
  while (o < e.length) {
    let index = e.indexOf(32, o),
      u = index === -1 ? -1 : e.indexOf(0, index + 1);
    if (index === -1 || u === -1 || u + 1 + n > e.length) return null;
    let chunk = e.subarray(index + 1, u),
      str = e.subarray(o, index).toString("latin1");
    if (!fn(str)) return null;
    let _ = GIT_FILE_MODES(str),
      y = { name: chunk, isTree: _ === TREE_MODE },
      str_2 = chunk.toString("latin1");
    if (!isValidTreeEntryName(chunk) || r.has(str_2)) return null;
    if (!Js.has(_) || (s !== null && compareTreeEntries(s, y) >= 0)) l = !0;
    ((s = y), r.set(str_2, { mode: _, id: e.subarray(u + 1, u + 1 + n).toString("hex") }), (o = u + 1 + n));
  }
  return l ? "malformed" : r;
}
//@ chunk-gjx0rh1b.js:26718-26835 placement
function isValidTreeEntryName(e) {
  return (
    e.length > 0 &&
    !e.includes(47) &&
    !(e.length === 1 && e[0] === 46) &&
    !(e.length === 2 && e[0] === 46 && e[1] === 46)
  );
}
//@ chunk-gjx0rh1b.js:26835-27035 placement
function compareTreeEntries(e, n) {
  let min = Math.min(e.name.length, n.name.length),
    compare = e.name.subarray(0, min).compare(n.name.subarray(0, min));
  if (compare !== 0) return compare;
  let s = (l) => (l.name.length > min ? l.name[min] : l.isTree ? 47 : 0);
  return s(e) - s(n);
}
//@ chunk-gjx0rh1b.js:27035-27075 placement
function fn(e) {
  return /^[0-7]+$/.test(e);
}
//@ chunk-gjx0rh1b.js:27075-27328 placement
function GIT_FILE_MODES(e) {
  let n = fn(e) ? Array.from(e.slice(-11)).reduce((r, o) => ((r << 3) | Number(o)) >>> 0, 0) : 0;
  switch (n & 61440) {
    case 32768:
      return n & 64 ? "100755" : "100644";
    case 40960:
      return "120000";
    case 16384:
      return TREE_MODE;
    case 57344:
      return GITLINK_MODE;
    default:
      return e.replace(/^0+/, "");
  }
}
//@ chunk-gjx0rh1b.js:27328-28517 placement
async function parseIndexEntries(e, n, r) {
  let repeat = "0".repeat(e.idLength),
    s = [],
    l = n === r ? [] : [{ prefix: Buffer.alloc(0), base: n, other: r }],
    h = 0;
  while (l.length > 0) {
    let filtered = l.flatMap(({ base: base, other: other }) => [base, other]).filter((_) => _ !== null),
      trees = await e.trees(filtered);
    if (trees !== !0) {
      if (trees.failed !== "malformed") return trees;
      let found = l.find(({ base: base, other: other }) => base === trees.tree || other === trees.tree);
      return found === void 0 ? trees : { ...trees, dir: found.prefix.toString("utf8").replace(/\/$/, "") };
    }
    let w = [];
    for (let { prefix: prefix, base: base, other: other } of l) {
      let C = base === null ? new Map() : e.listing(base),
        A = other === null ? new Map() : e.listing(other),
        sorted = uniq([...C.keys(), ...A.keys()]).sort();
      if (((h += sorted.length), h > Vs)) return jt;
      for (let B of sorted) {
        let x = C.get(B),
          S = A.get(B);
        if (x !== void 0 && S !== void 0 && x.id === S.id && x.mode === S.mode) continue;
        let buffer = Buffer.concat([prefix, Buffer.from(B, "latin1")]),
          Y = x?.mode === TREE_MODE,
          L = S?.mode === TREE_MODE;
        if (Y || L)
          w.push({
            prefix: Buffer.concat([buffer, Buffer.from("/")]),
            base: Y ? x.id : null,
            other: L ? S.id : null,
          });
        let U = x !== void 0 && !Y ? x : void 0,
          D = S !== void 0 && !L ? S : void 0;
        if (U === void 0 && D === void 0) continue;
        s.push({
          path: buffer.toString("utf8"),
          pathBytes: buffer,
          status:
            U === void 0
              ? "A"
              : D === void 0
                ? "D"
                : entryKindForMode(U.mode) !== entryKindForMode(D.mode)
                  ? "T"
                  : "M",
          oldMode: U === void 0 ? "000000" : padFileMode(U.mode),
          newMode: D === void 0 ? "000000" : padFileMode(D.mode),
          oldId: U?.id ?? repeat,
          newId: D?.id ?? repeat,
        });
      }
    }
    l = w;
  }
  return s;
}
/**
 * 在 git 树中按路径逐段下钻，批量读取树对象，解析出给定路径对应的 blob/树 id 与模式。
 */
//@ chunk-gjx0rh1b.js:28517-29099 placement
async function resolveTreePaths(reader, rootTree, paths) {
  let o = new Map(),
    trees = await reader.trees([rootTree]);
  if (trees !== !0) return trees;
  let mapped = paths.map((h) => ({ name: h, segments: h.split("/"), at: 0, tree: rootTree }));
  while (mapped.length > 0) {
    let trees = await reader.trees(mapped.map(({ tree: tree }) => tree));
    if (trees !== !0) return trees;
    let u = [],
      p = [];
    for (let w of mapped) {
      let _ = reader.listing(w.tree)?.get(Buffer.from(w.segments[w.at], "utf8").toString("latin1"));
      if (_ === void 0) continue;
      let y = w.at === w.segments.length - 1;
      if (_.mode === TREE_MODE)
        if (y) p.push(_.id);
        else u.push({ ...w, at: w.at + 1, tree: _.id });
      else if (y) o.set(w.name, { id: _.id, mode: _.mode });
    }
    if (p.length > 0) {
      let trees = await reader.trees(p);
      if (trees !== !0) return trees;
    }
    mapped = u;
  }
  return o;
}
//@ chunk-gjx0rh1b.js:29099-29147 placement
var gn = { latin1: "\xEF\xBB\xBF", utf8: "\uFEFF" },
  ir;
//@ chunk-gjx0rh1b.js:29147-29612 placement
function writeProbeBlob(e, n) {
  let r = (ir ??= (async () => {
    let buffer = Buffer.from([65, 233, 128, 255, 195, 40, 66]),
      s = await e(["hash-object", "-w", "--stdin"], n, buffer);
    if (s.code !== 0) throw Error("probe blob not written");
    let l = await e(
      ["cat-file", "--batch"],
      n,
      `${s.stdout.trim()}
`,
      "latin1",
    );
    if (l.code !== 0) throw Error("probe blob not read");
    let sliced = l.stdout.slice(
      l.stdout.indexOf(`
`) + 1,
    );
    return Buffer.from(sliced, "latin1").equals(buffer) ? "latin1" : "utf8";
  })());
  return r.catch(() => {
    if (ir === r) ir = void 0;
    return "utf8";
  });
}
//@ chunk-gjx0rh1b.js:29612-29626 placement
var Nu = promisify(deflate);
//@ chunk-gjx0rh1b.js:29626-29676 placement
var oa = ["filter", "working-tree-encoding", "ident"];
/**
 * 用 read-tree/ls-files 读取指定路径在 HEAD 中的条目（老版本 git 兼容）。
 */
//@ chunk-gjx0rh1b.js:29676-31456 placement
async function readTreeForPaths(e, n, r, o, s) {
  if (n.length === 0) return [];
  let l = new Set(n.filter((E) => r.get(E) === null)),
    h = (E) => [E, ...(r.get(E) ?? [])],
    u = (E) =>
      h(E).flatMap((C) => (s.normalizationBlind ? uniq([C, C.normalize("NFC"), C.normalize("NFD")]) : [C])),
    p = uniq(n.flatMap(u));
  if (o?.prepareIndexAndStore !== void 0) {
    let prepareIndexAndStore = await o.prepareIndexAndStore(p, o);
    if (prepareIndexAndStore !== !0) return prepareIndexAndStore;
  } else if (o !== null) {
    if (
      (
        await e(["-c", "core.splitIndex=false", "read-tree", o.commit ?? o.tree], {
          GIT_INDEX_FILE: o.indexPath,
        })
      ).code !== 0
    )
      return null;
    await mkdir_4(o.objectsDir, { recursive: !0, mode: 448 });
    let C = {
        GIT_INDEX_FILE: o.indexPath,
        GIT_OBJECT_DIRECTORY: o.objectsDir,
        GIT_ALTERNATE_OBJECT_DIRECTORIES: "",
      },
      A = await writeProbeBlob(e, C),
      R = await readGitattributesForPaths(e, o, o.indexPath, p, A, o.refusesGitlinkedRules === !0);
    if (R === null || R === "old_git" || R === "tampered") return R;
    for (let { name: B, id: id, text: text, markStripped: markStripped } of R.blobs) {
      let Y = await e(["hash-object", "-w", "--stdin"], C, Buffer.from(text, A)),
        trimmed = Y.stdout.trim();
      if (Y.code !== 0 || (trimmed !== id && !markStripped)) return null;
      if (trimmed !== id) {
        let U = await e(["hash-object", "-w", "--stdin"], C, Buffer.from(gn[A] + text, A));
        if (U.code !== 0 || U.stdout.trim() !== id) return null;
        if (
          (
            await e(
              ["-c", "core.splitIndex=false", "update-index", "--cacheinfo", `100644,${trimmed},${B}`],
              C,
            )
          ).code !== 0
        )
          return null;
      }
    }
  }
  let w = await e(
    [
      ...(s.caseBlind ? ["-c", "core.ignorecase=true"] : []),
      "-c",
      "core.sparseCheckout=false",
      "check-attr",
      ...(o === null ? [] : ["--cached"]),
      "-z",
      "--stdin",
      ...oa,
    ],
    o === null
      ? void 0
      : {
          GIT_INDEX_FILE: o.indexPath,
          GIT_OBJECT_DIRECTORY: o.objectsDir,
          GIT_ALTERNATE_OBJECT_DIRECTORIES: "",
        },
    p.map((E) => `${E}\x00`).join(""),
  );
  if (w.maxBufferExceeded) return "overflow";
  if (w.code !== 0) return null;
  let parts = w.stdout.split("\x00"),
    y = new Set();
  for (let E = 0; E + 2 < parts.length; E += 3) {
    let [C, A] = [parts[E + 1], parts[E + 2]];
    if (!(A === "unspecified" || A === "unset" || (C === "ident" && A === "false"))) y.add(parts[E]);
  }
  return n.filter((E) => l.has(E) || u(E).some((C) => y.has(C)));
}
/**
 * 读取影响变更路径的 .gitattributes（检测篡改、子模块）。
 */
//@ chunk-gjx0rh1b.js:31456-33266 placement
async function readGitattributesForPaths(e, n, r, o, s, l) {
  let h = uniq([
      ...missingGitattributesPaths(o),
      ...o.filter((B) => B.split("/").at(-1) === ".gitattributes"),
    ]),
    u = await listIndexEntriesNamed(e, r, new Set(h), dirname_4(r));
  if (u === null) return null;
  let p = n.commit !== void 0 ? await ca(e, n.commit, h, s) : await buildTreeObject(e, n.tree, h);
  if (p === null || p === "tampered") return p;
  if (l && [...p.values()].some(({ mode: mode }) => mode === "160000")) return null;
  let w = (B) => {
    let x = p.get(B),
      S = u.get(B);
    return x === void 0
      ? S === void 0
      : S !== void 0 && Cqr(S) && S.id === x.id && GIT_FILE_MODES(S.mode) === x.mode;
  };
  if (h.some((B) => !w(B))) return "tampered";
  let _ = [...p],
    reduced = await chunkArgsByBytes(_.map(([B]) => `:0:${B}`)).reduce(async (B, x) => {
      let S = await B;
      if (S === "tampered" || S === null) return S;
      let z = await e(["-c", "core.precomposeUnicode=false", "rev-parse", ...x], { GIT_INDEX_FILE: r });
      return z.code === 0
        ? [
            ...S,
            ...z.stdout
              .split(
                `
`,
              )
              .filter((Y) => Y !== ""),
          ]
        : z.exitCode === 128
          ? "tampered"
          : null;
    }, Promise.resolve([]));
  if (reduced === null) return null;
  if (reduced === "tampered" || reduced.length !== _.length || _.some(([, B], x) => reduced[x] !== B.id))
    return "tampered";
  let E,
    C = new Map(),
    A = async (B) => {
      let x = C.get(B);
      if (x !== void 0) return x;
      let S = await e(
          ["cat-file", "--batch"],
          void 0,
          `${B}
`,
          s === "latin1" ? "latin1" : void 0,
        ),
        index = S.stdout.indexOf(`
`),
        Y = index === -1 ? S.stdout : S.stdout.slice(0, index),
        L = index === -1 ? "" : S.stdout.slice(index + 1),
        U = B.length === 64 ? "sha256" : "sha1",
        D =
          S.code !== 0
            ? null
            : !new RegExp(`^${B} blob [0-9]+$`).test(Y)
              ? /^[0-9a-f]{40,64} [a-z]+ [0-9]+$/.test(Y)
                ? "tampered"
                : null
              : ([L, `${L}\r`].find((pe) => {
                  let buffer = Buffer.from(pe, s);
                  return (
                    createHash_3(U).update(`blob ${buffer.length}\x00`).update(buffer).digest("hex") === B
                  );
                }) ?? (s === "latin1" ? "tampered" : null));
      return (C.set(B, D), D);
    },
    R = [];
  for (let [B, { id: x, mode: S }] of p) {
    let z = await A(x);
    if (z === "tampered") return "tampered";
    let Y = z === null ? null : aa(z, S, s);
    if (Y === null) return null;
    if (Y.isLink) {
      if (((E ??= supportsGit232(e)), !(await E))) return "old_git";
    }
    if (Y.text === null) return null;
    R.push({ name: B, id: x, text: Y.text, markStripped: Y.markStripped });
  }
  return { blobs: R };
}
/**
 * 解码带链接标记的文件内容：判断是否为符号链接并去掉标记前缀。
 */
//@ chunk-gjx0rh1b.js:33266-33607 placement
function aa(e, n, r) {
  if (e.includes("\x00")) return null;
  if (n !== "100644" && n !== "100755" && n !== "120000") return null;
  let startsWith = e.startsWith(gn[r]);
  if (n === "120000") return { isLink: !0, text: startsWith ? null : e, markStripped: !1 };
  if (!startsWith) return { isLink: !1, text: e, markStripped: !1 };
  let sliced = e.slice(gn[r].length);
  return sliced.startsWith(gn[r]) ? null : { isLink: !1, text: sliced, markStripped: !0 };
}
/**
 * 解码 git 加引号的路径（处理八进制与转义字符）。
 */
//@ chunk-gjx0rh1b.js:33607-34032 placement
function unquoteGitPath(e) {
  if (!(e.startsWith('"') && e.endsWith('"'))) return Buffer.from(e, "utf8");
  let n = { a: 7, b: 8, t: 9, n: 10, v: 11, f: 12, r: 13, "\\": 92, '"': 34 },
    sliced = e.slice(1, -1),
    o = [];
  for (let s = 0; s < sliced.length; s += 1) {
    let l = sliced[s] ?? "";
    if (l !== "\\") {
      o.push(...Buffer.from(l, "utf8"));
      continue;
    }
    let h = sliced[s + 1] ?? "";
    if (/^[0-3][0-7]{2}$/.test(sliced.slice(s + 1, s + 4)))
      (o.push(parseInt(sliced.slice(s + 1, s + 4), 8)), (s += 3));
    else (o.push(n[h] ?? h.charCodeAt(0)), (s += 1));
  }
  return Buffer.from(o);
}
//@ chunk-gjx0rh1b.js:34032-34167 placement
async function supportsGit232(e) {
  let n = await e(["version"]),
    r = n.code === 0 ? parseGitVersion(n.stdout) : null;
  return r !== null && (r.major > 2 || (r.major === 2 && r.minor >= 32));
}
/**
 * 用 cat-file --batch 读取探测 blob 并校验其哈希。
 */
//@ chunk-gjx0rh1b.js:34167-34774 placement
async function ua(runGit, oid, r) {
  let o = r ?? (await writeProbeBlob(runGit, {})),
    s = oid.length === 64 ? "sha256" : "sha1",
    l = (_, y, E) => createHash_3(s).update(`${_} ${y.length}\x00`).update(y).digest("hex") === E,
    h = await runGit(
      ["cat-file", "--batch"],
      void 0,
      `${oid}
`,
      o === "latin1" ? "latin1" : void 0,
    );
  if (h.code !== 0) return null;
  let index = h.stdout.indexOf(`
`),
    p = index === -1 ? "" : h.stdout.slice(index + 1);
  if (!h.stdout.startsWith(`${oid} commit `))
    return /^[0-9a-f]{40,64} [a-z]+ /.test(h.stdout) ? "tampered" : null;
  if (![p, `${p}\r`].some((_) => l("commit", Buffer.from(_, o), oid)))
    return o === "latin1" ? "tampered" : null;
  let w = /^tree ([0-9a-f]{40,64})\n/.exec(p)?.[1];
  if (w === void 0) return "tampered";
  return w;
}
//@ chunk-gjx0rh1b.js:34774-34884 placement
async function ca(e, n, r, o = "utf8") {
  let s = await ua(e, n, o);
  if (s === null || s === "tampered") return s;
  return buildTreeObject(e, s, r);
}
//@ chunk-gjx0rh1b.js:34884-34905 placement
var fa = 512,
  ha = 262144;
//@ chunk-gjx0rh1b.js:34905-36996 placement
async function verifyObjectsByHash(e, n) {
  let r = n.length === 64 ? "sha256" : "sha1",
    o = (w, _, y) => createHash_3(r).update(`${w} ${_.length}\x00`).update(_).digest("hex") === y,
    s = new Map(),
    l = (w) => {
      if (!w.every(({ nameBytes: nameBytes }) => isValidTreeEntryName(nameBytes))) return null;
      let _ = new Map(
        w.map(({ nameBytes: nameBytes, mode: mode, id: id }) => [
          nameBytes.toString("latin1"),
          { mode: mode, id: id },
        ]),
      );
      return _.size === w.length ? _ : null;
    },
    h = (await writeProbeBlob(e, {})) === "latin1",
    u = async (w) => {
      let _ = uniq(w.filter((B) => !s.has(B)));
      if (_.length === 0) return !0;
      if (!h) {
        for (let B of _) {
          let x = await p(B);
          if (x === null || x === "tampered") return x;
        }
        return !0;
      }
      let y = await e(
        ["cat-file", "--batch"],
        void 0,
        [..._, _[0]]
          .map(
            (B) => `${B}
`,
          )
          .join(""),
        "latin1",
      );
      if (y.code !== 0) return null;
      let buffer = Buffer.from(y.stdout, "latin1"),
        C = n.length / 2,
        A = 0,
        R = 0;
      for (let [B, x] of _.entries()) {
        if ((B > 0 && B % fa === 0) || R >= ha) (await yieldToEventLoop(), (R = 0));
        let index = buffer.indexOf(10, A);
        if (index === -1) return null;
        let str = buffer.subarray(A, index).toString("latin1"),
          match = /^([0-9a-f]{40,64}) tree (\d+)$/.exec(str);
        if (match === null || match[1] !== x)
          return /^[0-9a-f]{40,64} [a-z]+ \d+$/.test(str) ? "tampered" : null;
        let L = Number(match[2]);
        R += L;
        let chunk = buffer.subarray(index + 1, index + 1 + L);
        if (chunk.length !== L) return null;
        if (!o("tree", chunk, x)) return "tampered";
        A = index + 1 + L + 1;
        let D = [],
          pe = 0;
        while (pe < chunk.length) {
          let index = chunk.indexOf(32, pe),
            index_2 = chunk.indexOf(0, index + 1);
          if (index === -1 || index_2 === -1 || index_2 + 1 + C > chunk.length) return "tampered";
          let str = chunk.subarray(pe, index).toString("latin1");
          if (!fn(str)) return "tampered";
          (D.push({
            mode: GIT_FILE_MODES(str),
            nameBytes: Buffer.from(chunk.subarray(index + 1, index_2)),
            id: chunk.subarray(index_2 + 1, index_2 + 1 + C).toString("hex"),
          }),
            (pe = index_2 + 1 + C));
        }
        let X = l(D);
        if (X === null) return "tampered";
        s.set(x, X);
      }
      return !0;
    },
    p = async (w) => {
      let _ = s.get(w);
      if (_ !== void 0) return _;
      let y = await e(["-c", "core.quotePath=true", "ls-tree", w]);
      if (y.code !== 0) return null;
      let mapped = y.stdout
          .split(
            `
`,
          )
          .filter((R) => R !== "")
          .map((R) => {
            let index = R.indexOf("\t"),
              [x, , S] = R.slice(0, index).split(" "),
              z = unquoteGitPath(R.slice(index + 1));
            return { mode: (x ?? "").replace(/^0+/, ""), id: S ?? "", nameBytes: z };
          }),
        buffer = Buffer.concat(
          mapped.map(({ mode: mode, id: id, nameBytes: nameBytes }) =>
            Buffer.concat([
              Buffer.from(`${mode} `, "utf8"),
              nameBytes,
              Buffer.from([0]),
              Buffer.from(id, "hex"),
            ]),
          ),
        );
      if (!o("tree", buffer, w)) return null;
      let A = l(mapped);
      if (A === null) return "tampered";
      return (s.set(w, A), A);
    };
  return { listingsOf: u, listing: (w) => s.get(w), readsManyTreesInOneRun: h };
}
//@ chunk-gjx0rh1b.js:36996-37651 placement
async function buildTreeObject(e, n, r) {
  let { listingsOf: listingsOf, listing: listing } = await verifyObjectsByHash(e, n),
    l = new Map(),
    h = await listingsOf([n]);
  if (h !== !0) return h;
  let mapped = r.map((p) => ({ name: p, segments: p.split("/"), at: 0, tree: n }));
  while (mapped.length > 0) {
    let p = await listingsOf(mapped.map(({ tree: tree }) => tree));
    if (p !== !0) return p;
    let w = [],
      _ = [];
    for (let y of mapped) {
      let E = listing(y.tree);
      if (E === void 0) return null;
      let C = y.segments[y.at],
        A = E.get(Buffer.from(C, "utf8").toString("latin1"));
      if (A === void 0) continue;
      let R = y.at === y.segments.length - 1;
      if (R && A.mode !== "40000") l.set(y.name, { id: A.id, mode: A.mode });
      else if (A.mode === "40000")
        if (!R) w.push({ ...y, at: y.at + 1, tree: A.id });
        else _.push(A.id);
    }
    if (_.length > 0) {
      let y = await listingsOf(_);
      if (y !== !0) return y;
    }
    mapped = w;
  }
  return l;
}
/**
 * diff --raw 行格式正则及 git 文件模式、空 blob id、上限等常量。
 */
//@ chunk-gjx0rh1b.js:37651-38108 placement
var DIFF_RAW_LINE_RE =
    /^:([0-7]{6}) ([0-7]{6}) ([0-9a-f]{40}(?:[0-9a-f]{24})?) ([0-9a-f]{40}(?:[0-9a-f]{24})?) ([A-Z])[0-9]*$/,
  REGULAR_FILE_MODES = ["100644", "100755"],
  GITLINK_MODE_VALUE = "160000",
  SYMLINK_MODE_VALUE = "120000",
  EMPTY_BLOB_IDS = {
    sha1: "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391",
    sha256: "473a0f4c3be8a93681a267e3b1e9a7dcda1185436fe141f7749120a303721813",
  },
  ZERO_OID_RE = /^0+$/,
  MAX_INFO_ATTRIBUTES_BYTES = 65536,
  GIT_READ_CONCURRENCY = 8,
  GIT_SIGPIPE_EXIT_CODE = 129,
  TREE_READBACK_MISMATCH = "the trees just built could not be read back as what their ids name",
  COMMIT_READBACK_MISMATCH = "a commit just made could not be read back as what its id names";
//@ chunk-gjx0rh1b.js:38108-38196 placement
function Ri(e) {
  return createHash("sha1").update(`blob ${e.length}\x00`).update(e).digest("hex");
}
//@ chunk-gjx0rh1b.js:38196-38421 placement
var MAX_STASH_FILE_BYTES = 1048576,
  Ea = 67108864,
  Si = 536870912,
  Sn = {
    GIT_AUTHOR_NAME: "git stash",
    GIT_AUTHOR_EMAIL: "git@stash",
    GIT_COMMITTER_NAME: "git stash",
    GIT_COMMITTER_EMAIL: "git@stash",
  },
  xi =
    (e) =>
    (n, ...r) =>
      e(["-c", "core.longpaths=true", ...n], ...r);
/**
 * 捕获未提交修改为 stash 提交：读索引与工作树、处理 Windows 不能保存的名字、构造种子引用（约 16 KB）。
 */
//@ chunk-gjx0rh1b.js:38421-54648 placement
async function captureWipStash(e, n, r = {}) {
  let o = r.probes ?? HNe(),
    s = createHardenedGitRunner(e, n, r.signal, void 0, o),
    l = (ee, De, ce, Fe, St) =>
      s(De?.GIT_INDEX_FILE === void 0 ? [...ee] : ["-c", "core.splitIndex=false", ...ee], De, ce, Fe, St),
    h = (ee) => (r.neverRead ?? r.alsoLeaveOut)?.(ee) ?? !1,
    filtered = uniq([Dnt(e), n.workTree]).filter((ee) =>
      CREDENTIAL_CONFIG_PATHS.some(([, De]) => v3o(`${ee}/${De}`)),
    ),
    p = (ee) => filtered.some((De) => v3o(`${De}/${ee}`)),
    w = (ee) => _H(ee) || p(ee) || (r.alsoLeaveOut?.(ee) ?? !1),
    _ = await resolveHeadState(l, n.adminDir ?? resolveTempDir());
  if (_.kind !== "inspected") return _;
  let { gitDir: gitDir, workTree: workTree } = n,
    {
      base: base,
      baseTree: baseTree,
      iTree: iTree,
      reader: reader,
      namesWindowsCannotHold: namesWindowsCannotHold,
    } = _.inspection;
  if (namesWindowsCannotHold > 0)
    (logForDebugging(
      `[wipStash] tracked names that Windows cannot hold, listed as deleted and passed over: ${namesWindowsCannotHold}`,
    ),
      r.onNamesWindowsCannotHold?.(namesWindowsCannotHold));
  let S =
      (n.bound === !0 && getPlatform() === "wsl") ||
      (await Ft(workTree)) ||
      (await Ft(n.adminDir ?? resolveTempDir())),
    z = findSuspiciousChangedPaths(_.inspection, S);
  if (z.length > 0) return { kind: "refused", refused: z, decidedOn: "listing" };
  let Y = r.leaveOutUncommittedCredentialFiles
      ? await classifyIndexEntry(workTree, _.inspection, w, S, h)
      : [],
    L = new Set(Y.map(({ path: path }) => path)),
    U = new Set(_.inspection.staged.map(({ path: path }) => path)),
    D = new Set(
      _.inspection.staged.flatMap(({ path: path, status: status }) => (status === "D" ? [path] : [])),
    ),
    now = Date.now(),
    X = limitConcurrency(GIT_READ_CONCURRENCY, (ee) =>
      r.signal?.aborted === !0 || L.has(ee.path) || U.has(ee.path)
        ? Promise.resolve("changed")
        : compareWorktreeEntry(workTree, ee, S, Ea, r.signal),
    ),
    results = await Promise.all(_.inspection.working.map(X)),
    filtered_2 = _.inspection.working.filter((ee, De) => results[De] !== "unchanged"),
    ve = count(results, (ee) => ee === "open_refused");
  if (ve > 0) r.onOpenRefusedAtTheLook?.(ve);
  let ie = _.inspection.working.length - filtered_2.length;
  if (ie > 0)
    logForDebugging(
      `[wipStash] ${ie} of ${_.inspection.working.length} stat-dirty tracked files were unchanged (${Date.now() - now}ms)`,
    );
  if (filtered_2.length === 0 && iTree === baseTree) return { kind: "none", leftOut: Y };
  if ((await pruneStaleSeedIndexes(gitDir), n.adminDir === void 0))
    await pruneStaleProcessDirs(resolveTempDir());
  let K = join_4(n.adminDir ?? gitDir, `ccr-seed-${process.pid}-${randomBytes_2(6).toString("hex")}.index`),
    _e = null,
    Ce = null,
    ge = null,
    Re = [],
    $e = new Set(),
    W = [],
    ct = new Map(),
    ft = [],
    Qe = new Map(),
    Le = null;
  try {
    let ee = await l(["read-tree", "--no-recurse-submodules", `--index-output=${K}`, "-m", iTree]);
    if (ee.code !== 0) return stepFailure("read-tree", ee.stderr, ee);
    if (n.adminDir === void 0) {
      _e = await mkdtemp_2(join_4(resolveTempDir(), `claude-seed-index-${process.pid}-`));
      let P = join_4(_e, "index"),
        V = await lstatNoFollow(K, P);
      if (V !== null)
        return (
          await unlink_3(K).catch(() => {}),
          stepFailure(V.kind === "disk" ? "scratch-index" : "rewritten", V.detail)
        );
      let se = await unlinkWithRetry(K);
      if (se !== null)
        logForDebugging(
          `[wipStash] the scratch index read-tree wrote could not be removed after it was carried off (${se}); left for the sweep`,
        );
      K = P;
    }
    let De = await listSparseCheckout(l, K, n.adminDir ?? resolveTempDir(), reader, iTree, S);
    if (De.kind === "failed") return De;
    if (De.kind === "differ")
      return stepFailure(
        "read-tree",
        "the index changed while it was read, or its trees do not list what it holds (an object is not what its id names) \u2014 retry",
      );
    let ce = await l(["write-tree", "--ignore-cache-tree"]);
    if (ce.code !== 0) return stepFailure("write-tree", ce.stderr || ce.stdout, ce);
    if (ce.stdout.trim() !== iTree)
      return stepFailure(
        "read-tree",
        "the index changed while the uncommitted changes were being read \u2014 retry",
      );
    let Fe = iTree;
    if (L.size > 0) {
      let P = await restoreIndexEntries(l, reader, K, baseTree, [...L]);
      if (P !== null) return { kind: "failed", ...P };
      let V = await l(["write-tree", "--ignore-cache-tree"], { GIT_INDEX_FILE: K });
      if (V.code !== 0) return stepFailure("write-tree", V.stderr || V.stdout, V);
      Fe = V.stdout.trim();
    }
    let St = r.leaveOutUncommittedCredentialFiles
        ? filtered_2
            .filter(({ status: status, path: path }) => status === "D" && !L.has(path) && w(path))
            .map(({ path: path }) => path)
        : [],
      et = (P) => !L.has(P) && (!r.leaveOutUncommittedCredentialFiles || !w(P)),
      ht = uniq(
        filtered_2.flatMap(({ path: path, status: status, newMode: newMode, newId: newId }) =>
          status === "D" || newMode === GITLINK_MODE_VALUE || !ZERO_OID_RE.test(newId) ? [path] : [],
        ),
      ),
      Nt = new Set(await Pi(workTree, ht)),
      Fn = new Set(ht.filter((P) => !Nt.has(P))),
      filtered = uniq(filtered_2.map(({ path: path }) => path)).filter((P) => !Fn.has(P) && et(P)),
      filtered_3 = [...U].filter(et),
      filtered_4 = _.inspection.staged.filter(({ status: status }) => status !== "D"),
      tt = checkCredentialLikePaths(),
      M =
        filtered_4.length === 0 && !r.leaveOutUncommittedCredentialFiles
          ? { elsewhere: [], withheldTracked: new Map() }
          : await listIndexIds(
              l,
              K,
              new Map(filtered_4.map(({ newId: newId, path: path }) => [newId, path])),
              r.leaveOutUncommittedCredentialFiles ? (P) => tt(P) || p(P) : () => !1,
              n.adminDir ?? resolveTempDir(),
              S,
              r.signal,
            );
    if (M === null)
      return stepFailure(
        "ls-files",
        r.signal?.aborted
          ? "cancelled, or out of time, before the index was listed and its names judged"
          : "could not list the index",
      );
    let { elsewhere: elsewhere, withheldTracked: withheldTracked } = M,
      Ke = uniq([...filtered_2.map(({ path: path }) => path), ...U, ...elsewhere]),
      Xe = new Set(),
      xt = new Set(),
      nt;
    if (Ke.length > 0) {
      ((ge = await mkdtemp_2(join_4(n.adminDir ?? resolveTempDir(), "claude-seed-attrs-"))),
        (nt = await findGitDirCaseVariants(l, workTree)));
      let P = await checkAlternatesFile(ge, {
        caseBlind: nt.caseBlind,
        objectFormat: base.length === 64 ? "sha256" : "sha1",
        objectsDir: join_4(n.commonDir, "objects"),
      });
      if (P !== null) return stepFailure("check-attr", P);
      let V = createHardenedGitRunner(
          e,
          { gitDir: ge, commonDir: ge, workTree: workTree, configPins: n.configPins },
          r.signal,
          reachForBoundSession(n),
          o,
        ),
        se = await readTreeForPaths(
          V,
          Ke,
          new Map(Ke.map((Z) => [Z, getPathNormalizationVariants(Z)])),
          { commit: base, indexPath: join_4(ge, "head.index"), objectsDir: join_4(ge, "verified") },
          nt,
        );
      if (se === "overflow")
        return stepFailure("check-attr", "too many changed files to read the attributes of");
      if (se === "old_git")
        return stepFailure(
          "check-attr",
          "a committed .gitattributes is a symbolic link, which the installed git (older than 2.32, or of a version this build cannot read) follows on disk: update git, then retry",
        );
      if (se === "tampered")
        return stepFailure(
          "verify",
          "HEAD's commit, a tree on the way to a committed .gitattributes, or that file's blob is not the object its id names",
        );
      if (se === null) return stepFailure("check-attr", HEAD_UNVERIFIABLE_TEXT);
      Xe = new Set(se);
      let me = uniq([...Ke.filter((Z) => Xe.has(Z)), ...L]);
      if (me.length > 0 || withheldTracked.size > 0) {
        let Z = await resolveTreePaths(reader, baseTree, me);
        if (isTreeReadFailure(Z))
          return treeReadFailure(
            Z,
            "cat-file",
            "HEAD's trees to the changed files could not be read back as what their ids name",
          );
        xt = new Set(Xe);
        let he = new Set([...Xe, ...L]),
          Ge = limitConcurrency(GIT_READ_CONCURRENCY, async (xe) => {
            let st = await readWorktreeBlobIds(workTree, xe, baseTree.length, MAX_STASH_FILE_BYTES, S),
              Tt = withheldTracked.get(xe);
            return st !== null && (he.has(xe) || !st.includes(Tt ?? "")) ? st : [];
          }),
          flat = (
            await Promise.all(
              uniq([...he, ...withheldTracked.keys()])
                .filter((xe) => !h(xe))
                .map(Ge),
            )
          ).flat(),
          gt = (xe) => xe !== EMPTY_BLOB_IDS.sha1 && xe !== EMPTY_BLOB_IDS.sha256,
          mt = new Set([
            ...[...Z.values()].map(({ id: id }) => id).filter(gt),
            ...filtered_4
              .filter(({ path: path }) => he.has(path))
              .map(({ newId: newId }) => newId)
              .filter(gt),
            ...flat.filter(gt),
          ]);
        (($e = mt),
          filtered_4
            .filter(({ path: path, newId: newId }) => mt.has(newId) && et(path))
            .forEach(({ path: path }) => Xe.add(path)));
      }
      let filtered = filtered_3.filter((Z) => Xe.has(Z));
      if (filtered.length > 0) {
        let Z = await restoreIndexEntries(l, reader, K, baseTree, filtered);
        if (Z !== null) return { kind: "failed", ...Z };
        let he = await l(["write-tree", "--ignore-cache-tree"], { GIT_INDEX_FILE: K });
        if (he.code !== 0) return stepFailure("write-tree", he.stderr || he.stdout, he);
        ((Fe = he.stdout.trim()), Y.push(...filtered.map((Ge) => ({ path: Ge, why: "filtered" }))));
      }
    }
    let ze = new Set(Y.flatMap(({ path: path, why: why }) => (why === "filtered" ? [path] : []))),
      G = new Set(filtered),
      flattened = filtered_4.flatMap(({ path: path, newMode: newMode }) =>
        newMode !== GITLINK_MODE_VALUE && et(path) && !G.has(path) ? [path] : [],
      ),
      te = [...filtered, ...(await Pi(workTree, flattened))];
    if (te.length > 0 || flattened.length > 0) {
      let P = await mkdtemp_2(join_4(n.adminDir ?? resolveTempDir(), "claude-seed-stage-"));
      Ce = P;
      let V = baseTree.length === 64 ? "sha256" : "sha1",
        se = await readChangedFilesForStash(workTree, P, te, r.maxStagedBytes ?? Si, {
          ...r.stageHooks,
          objectFormat: V,
          ntfsRules: S,
        });
      if ("refused" in se) return stepFailure("stage", se.refused);
      let me = await listFilesNoPrecompose(
        l,
        { GIT_INDEX_FILE: K },
        se.entries.flatMap((entry) => (entry.kind === "absent" ? [entry.path] : [])),
      );
      if (me === null) return stepFailure("ls-files", "could not list the index entries");
      let ne = await describeStashEntryChange(
        se,
        new Set(te),
        new Set(
          filtered_2.flatMap(({ path: path, status: status }) =>
            status === "D" || me.unseen.has(path) ? [] : [path],
          ),
        ),
        P,
        (T) =>
          readChangedFilesForStash(workTree, P, T, r.maxStagedBytes ?? Si, {
            ...r.stageHooks,
            objectFormat: V,
            ntfsRules: S,
          }),
      );
      if ("refused" in ne) return stepFailure("stage", ne.refused);
      let found = ne.entries.find(
        (entry) => entry.kind === "changed" && (!te.includes(entry.path) || isGitattributesPath(entry.path)),
      );
      if (found !== void 0) return stepFailure("stage", `${found.path} changed while it was being read`);
      let he = xi(createHardenedGitRunner(e, { ...n, workTree: Ce }, r.signal, reachForBoundSession(n), o)),
        Ge = (T, ye, wt, rn, Dt) =>
          he(ye?.GIT_INDEX_FILE === void 0 ? [...T] : ["-c", "core.splitIndex=false", ...T], ye, wt, rn, Dt),
        Qt = new Set(te),
        gt = uniq([
          ...ne.entries.flatMap((entry) =>
            entry.kind !== "absent" && Qt.has(entry.path) ? [entry.path] : [],
          ),
          ...filtered_4.flatMap(({ path: path, newMode: newMode }) =>
            newMode !== GITLINK_MODE_VALUE && et(path) ? [path] : [],
          ),
        ]),
        mt = await readInfoAttributes(n.commonDir);
      if (mt.kind !== "none")
        return stepFailure(
          "check-attr",
          mt.kind === "touches"
            ? ".git/info/attributes sets or unsets filter attributes (or defines a macro, quotes a pattern, or holds a line of 2,048 bytes or more)"
            : ".git/info/attributes could not be read as a plain file",
        );
      let xe = xi(
          createHardenedGitRunner(
            e,
            { gitDir: ge, commonDir: ge, workTree: Ce, configPins: n.configPins },
            r.signal,
            reachForBoundSession(n),
            o,
          ),
        ),
        st = new Map(gt.map((T) => [T, getPathNormalizationVariants(T)])),
        [Tt, tn] = await Promise.all([
          readTreeForPaths(Ge, gt, st, null, nt),
          readTreeForPaths(xe, gt, st, null, nt),
        ]);
      if (Tt === "overflow" || tn === "overflow")
        return stepFailure("check-attr", "too many changed files to read the attributes of");
      if (Tt === null || !Array.isArray(Tt))
        return stepFailure("check-attr", "could not read the attributes in force");
      if (tn === null || !Array.isArray(tn))
        return stepFailure("check-attr", "could not read the staged .gitattributes on their own");
      let Dr = Tt,
        Pr = tn,
        nn = new Set([...Dr, ...Pr].filter((T) => !xt.has(T))),
        $o = (T) => T !== EMPTY_BLOB_IDS.sha1 && T !== EMPTY_BLOB_IDS.sha256,
        Do = limitConcurrency(GIT_READ_CONCURRENCY, (T) =>
          readWorktreeBlobIds(workTree, T, baseTree.length, MAX_STASH_FILE_BYTES, S),
        ),
        flattened = (await Promise.all([...nn].filter((T) => !h(T)).map(Do))).flatMap((T) => T ?? []),
        Fr = new Set(
          [
            ...filtered_4.filter(({ path: path }) => nn.has(path)).map(({ newId: newId }) => newId),
            ...flattened,
          ].filter($o),
        ),
        mapped = filtered_4
          .filter(
            ({ path: path, newId: newId }) => Fr.has(newId) && et(path) && !nn.has(path) && !Xe.has(path),
          )
          .map(({ path: path }) => path);
      $e = new Set([...$e, ...Fr]);
      let Mr = uniq([
          ...Dr,
          ...Pr,
          ...ne.entries.flatMap((entry) => (Xe.has(entry.path) ? [entry.path] : [])),
          ...mapped,
        ]),
        Fo = await readInfoAttributes(n.commonDir);
      if (!infoAttributesUnchanged(mt, Fo))
        return stepFailure("check-attr", ".git/info/attributes changed while the attributes were read");
      let Gr = uniq([...filtered_3.filter((T) => nn.has(T)), ...mapped]);
      if (Gr.length > 0) {
        let T = await restoreIndexEntries(l, reader, K, baseTree, Gr);
        if (T !== null) return { kind: "failed", ...T };
        let ye = await l(["write-tree", "--ignore-cache-tree"], { GIT_INDEX_FILE: K });
        if (ye.code !== 0) return stepFailure("write-tree", ye.stderr || ye.stdout, ye);
        Fe = ye.stdout.trim();
      }
      let flattened_2 = ne.entries.flatMap((entry) =>
          (entry.kind === "hardlinked" || entry.kind === "changed") &&
          Qt.has(entry.path) &&
          !ze.has(entry.path)
            ? [{ path: entry.path, why: entry.kind === "hardlinked" ? "hardlinked" : "unstable" }]
            : [],
        ),
        Lo = new Set([...ze, ...flattened_2.map(({ path: path }) => path)]),
        Hr = [...flattened_2, ...Mr.filter((T) => !Lo.has(T)).map((T) => ({ path: T, why: "filtered" }))],
        Ln = new Set([...Hr.map(({ path: path }) => path), ...Mr]);
      Y.push(...Hr);
      let flattened_3 = ne.entries.flatMap((entry) =>
          entry.kind === "file" || entry.kind === "symlink" ? [entry.path] : [],
        ),
        Gn = await listFilesNoPrecompose(l, void 0, flattened_3);
      if (Gn === null) return stepFailure("ls-files", "could not list the index entries");
      let filtered = flattened_3.filter((T) => !Ln.has(T)),
        Wr = await listFilesNoPrecompose(l, { GIT_INDEX_FILE: K }, filtered);
      if (Wr === null) return stepFailure("ls-files", "could not list the index entries");
      if (filtered.some((T) => Gn.unseen.has(T) !== Wr.unseen.has(T)))
        return stepFailure(
          "rewritten",
          "an entry this upload read was marked assume-unchanged or skip-worktree in one copy of the index and not the other since the build began",
        );
      Qe = new Map(
        filtered_4.map(({ path: path, newId: newId, newMode: newMode }) => [
          path,
          { id: newId, mode: newMode },
        ]),
      );
      let Mo = new Set(
        filtered_2.flatMap(({ path: path, newId: newId }) => (/^0+$/.test(newId) ? [path] : [])),
      );
      ft = flattened_3.filter((T) => Gn.unseen.has(T) && Qe.has(T) && !Mo.has(T) && !Ln.has(T));
      let jn = new Set([...Ln, ...ft]),
        Hn = await readSymlinkTarget(
          l,
          K,
          ne.entries.filter((entry) => !jn.has(entry.path)),
        );
      if (Hn.kind === "failed") return Hn;
      let flattened_4 = ne.entries.flatMap((entry) =>
        entry.kind === "absent" && G.has(entry.path) && !me.skipWorktree.has(entry.path) ? [entry.path] : [],
      );
      Re = flattened_4.filter((T) => !D.has(T));
      let Un = await markPathsIntentToAdd(l, { GIT_INDEX_FILE: K }, baseTree, flattened_4);
      if (Un.code !== 0) return stepFailure("update-index", Un.stderr, Un);
      let flattened_5 = ne.entries.flatMap((entry) =>
        entry.kind === "file" && !jn.has(entry.path) ? [entry.path] : [],
      );
      if (
        ((W = ne.entries.flatMap((entry) =>
          (entry.kind === "file" || entry.kind === "symlink") && !jn.has(entry.path) ? [entry.path] : [],
        )),
        (ct = new Map([...Hn.ids].map(([T, ye]) => [T, { mode: SYMLINK_MODE_VALUE, id: ye }]))),
        flattened_5.length > 0)
      ) {
        Le = join_4(dirname_2(K), `replay-${randomBytes_2(6).toString("hex")}.index`);
        let T = await lstatNoFollow(K, Le);
        if (T !== null) return stepFailure(T.kind === "disk" ? "scratch-index" : "rewritten", T.detail);
        let ye = await listFilesNoPrecompose(Ge, { GIT_INDEX_FILE: Le }, flattened_5);
        if (ye === null) return stepFailure("update-index", "the laid paths could not be listed");
        if (ye.unseen.size > 0)
          return stepFailure(
            "rewritten",
            "an entry this upload is about to lay was marked assume-unchanged or skip-worktree in the scratch index since it was written",
          );
        let wt = (Ae, Ne = K) =>
            Ge(
              [
                "-c",
                "core.bigFileThreshold=512m",
                "-c",
                "core.checkStat=default",
                "-c",
                "core.trustctime=true",
                "update-index",
                ...Ae,
                "-z",
                "--add",
                "--stdin",
              ],
              { GIT_INDEX_FILE: Ne },
              flattened_5.map((Pt) => `${Pt}\x00`).join(""),
            ),
          rn = await wt(["--ignore-skip-worktree-entries"]),
          Dt = rn.exitCode === GIT_SIGPIPE_EXIT_CODE ? await wt([]) : rn;
        if (Dt.code !== 0) return stepFailure("update-index", Dt.stderr, Dt);
        let on = await listSkipWorktreeEntries(Ge, Le, wt, flattened_5);
        if (on === null)
          return stepFailure("update-index", "the lay could not be replayed to learn the laid entries");
        let Go = new Map(
            ne.entries.flatMap((entry) => (entry.kind === "file" ? [[entry.path, entry.copy]] : [])),
          ),
          jo = new Map([
            ...filtered_2.map(({ path: path, oldMode: oldMode }) => [path, oldMode]),
            ..._.inspection.staged.map(({ path: path, newMode: newMode }) => [path, newMode]),
          ]);
        if (
          flattened_5.find((Ae) => {
            let Ne = on.get(Ae)?.mode;
            return !(
              Ne !== void 0 &&
              (REGULAR_FILE_MODES.includes(Ne) ||
                (Ne === SYMLINK_MODE_VALUE && jo.get(Ae) === SYMLINK_MODE_VALUE))
            );
          }) !== void 0
        )
          return stepFailure(
            "rewritten",
            "an entry this upload laid as a file is recorded as something else in the scratch index",
          );
        if (
          flattened_5.find((Ae) => {
            let Ne = on.get(Ae)?.id,
              Pt = Go.get(Ae);
            return Pt === void 0 || (Ne !== Pt.blobId && Ne !== Pt.lfBlobId);
          }) !== void 0
        )
          return stepFailure("rewritten", "an entry this upload laid does not hold the bytes staged for it");
        for (let Ae of [K, Le]) {
          let Ne = await listFilesNoPrecompose(Ge, { GIT_INDEX_FILE: Ae }, flattened_5);
          if (Ne === null) return stepFailure("update-index", "the laid paths could not be listed");
          if (Ne.unseen.size > 0 || Ne.absent.size > 0)
            return stepFailure(
              "rewritten",
              "an entry this upload laid is marked assume-unchanged or skip-worktree in the scratch index, or is no longer there by its name",
            );
        }
        if (!(await stagedCopiesUnchanged(Ce, ne.copies)))
          return stepFailure("stage", "the staged copies changed while git read them");
        if (!infoAttributesUnchanged(mt, await readInfoAttributes(n.commonDir)))
          return stepFailure("check-attr", ".git/info/attributes changed while the changes were hashed");
        on.forEach((Ae, Ne) => ct.set(Ne, Ae));
      }
    }
    let ue = await markPathsIntentToAdd(l, { GIT_INDEX_FILE: K }, baseTree, St);
    if (ue.code !== 0) return stepFailure("update-index", ue.stderr, ue);
    let q = await l(["write-tree", "--ignore-cache-tree"], { GIT_INDEX_FILE: K });
    if (q.code !== 0) return stepFailure("write-tree", q.stderr || q.stdout, q);
    let trimmed = q.stdout.trim();
    if (r.leaveOutUncommittedCredentialFiles) {
      let P = await describeIndexEntryChange(reader, baseTree, trimmed, w, S);
      if (isTreeReadFailure(P)) return treeReadFailure(P, "cat-file", TREE_READBACK_MISMATCH);
      let filtered = P.filter(({ why: why }) => why !== "forged" && why !== "alias");
      if (filtered.length > 0) {
        let Z = await restoreIndexEntries(
          l,
          reader,
          K,
          baseTree,
          filtered.map(({ path: path }) => path),
        );
        if (Z !== null) return { kind: "failed", ...Z };
        let he = await l(["write-tree", "--ignore-cache-tree"], { GIT_INDEX_FILE: K });
        if (he.code !== 0) return stepFailure("write-tree", he.stderr || he.stdout, he);
        ((trimmed = he.stdout.trim()), Y.push(...filtered));
      }
      let results = await Promise.all(
          uniq([trimmed, Fe]).map((Z) => describeIndexEntryChange(reader, baseTree, Z, w, S)),
        ),
        found = results.find(isTreeReadFailure);
      if (found !== void 0) return treeReadFailure(found, "cat-file", TREE_READBACK_MISMATCH);
      let ne = [
        ...new Map(results.flatMap((Z) => (isTreeReadFailure(Z) ? [] : Z)).map((Z) => [Z.path, Z])).values(),
      ];
      if (ne.length > 0) return { kind: "refused", refused: ne, decidedOn: "tree" };
    }
    let oe = await parseIndexEntries(reader, baseTree, Fe);
    if (isTreeReadFailure(oe)) return treeReadFailure(oe, "cat-file", TREE_READBACK_MISMATCH);
    let filtered_5 = oe.filter(({ status: status, newId: newId }) => status !== "D" && $e.has(newId));
    if (filtered_5.length > 0) return sameBytesRefusal(filtered_5);
    let qe = trimmed === Fe ? oe : await parseIndexEntries(reader, baseTree, trimmed);
    if (isTreeReadFailure(qe)) return treeReadFailure(qe, "cat-file", TREE_READBACK_MISMATCH);
    if (trimmed !== Fe) {
      let P = new Set(W),
        filtered = qe.filter(
          ({ path: path, status: status, newId: newId }) => status !== "D" && !P.has(path) && $e.has(newId),
        );
      if (filtered.length > 0) return sameBytesRefusal(filtered);
    }
    if (ft.length > 0) {
      let mapped = [oe, qe].map(
        (se) =>
          new Map(
            se.map(({ path: path, status: status, newId: newId, newMode: newMode }) => [
              path,
              status === "D" ? null : { mode: newMode, id: newId },
            ]),
          ),
      );
      if (
        ft.find((se) =>
          mapped.some((me) => {
            let ne = me.get(se),
              Z = Qe.get(se);
            return ne === void 0 || ne === null || Z === void 0 || ne.id !== Z.id || ne.mode !== Z.mode;
          }),
        ) !== void 0
      )
        return stepFailure(
          "rewritten",
          "a staged entry this upload left as the index had it was replaced in the scratch index before the trees were written",
        );
    }
    if (W.length > 0) {
      let P = new Map(
          qe.map(({ path: path, status: status, newId: newId, newMode: newMode }) => [
            path,
            status === "D" ? null : { mode: newMode, id: newId },
          ]),
        ),
        filtered = W.filter((ne) => !P.has(ne)),
        se = filtered.length > 0 ? await resolveTreePaths(reader, baseTree, filtered) : new Map();
      if (isTreeReadFailure(se)) return treeReadFailure(se, "cat-file", TREE_READBACK_MISMATCH);
      if (
        W.find((ne) => {
          let Z = P.has(ne) ? P.get(ne) : se.get(ne),
            he = ct.get(ne);
          return Z === null || Z === void 0 || he === void 0 || Z.id !== he.id || Z.mode !== he.mode;
        }) !== void 0
      )
        return stepFailure(
          "rewritten",
          "an entry this upload laid was replaced in the scratch index before the work tree was written",
        );
    }
    if (trimmed === baseTree && Fe === baseTree) return { kind: "none", leftOut: Y };
    let Me = await describeStashBase(l, base),
      He = await l(["commit-tree", Fe, "-p", base, "-m", `index on ${Me}`], Sn);
    if (He.code !== 0) return stepFailure("commit-tree", He.stderr, He);
    let re = await l(["commit-tree", trimmed, "-p", base, "-p", He.stdout.trim(), "-m", `WIP on ${Me}`], Sn);
    if (re.code !== 0) return stepFailure("commit-tree", re.stderr, re);
    let we = [
      { id: He.stdout.trim(), tree: Fe, parents: [base] },
      { id: re.stdout.trim(), tree: trimmed, parents: [base, He.stdout.trim()] },
    ];
    for (let { id: id, tree: tree, parents: parents } of we) {
      let commit = await reader.commit(id);
      if (isTreeReadFailure(commit)) return treeReadFailure(commit, "commit-tree", COMMIT_READBACK_MISMATCH);
      if (
        commit.tree !== tree ||
        commit.parents.length !== parents.length ||
        commit.parents.some((parent, Z) => parent !== parents[Z])
      )
        return stepFailure("verify", COMMIT_READBACK_MISMATCH);
    }
    return { kind: "created", commit: re.stdout.trim(), leftOut: Y, deletedUnstaged: [...Re] };
  } catch (error) {
    return stepFailure("scratch-index", errorMessage(error));
  } finally {
    await Promise.all([
      ...[K, `${K}.lock`, ...(Le === null ? [] : [Le, `${Le}.lock`])].map((ee) =>
        unlink_3(ee).catch(() => {}),
      ),
      ...[...(_e === null ? [] : [_e]), ...(Ce === null ? [] : [Ce]), ...(ge === null ? [] : [ge])].map(
        (ee) => rm_3(ee, { recursive: !0, force: !0 }).catch(() => {}),
      ),
    ]);
  }
}
//@ chunk-gjx0rh1b.js:54648-55353 placement
async function createStashCommit(e, n, r, o) {
  let s = await listGitRefs(e, [...mee, ...splitIndexOffArgs(o), ...UVo, "stash", "create"], {
    hardened: !1,
    signal: r,
    env: { ...Lnt, ...rKt(o) },
  });
  if (s.code === 0) {
    let trimmed = s.stdout.trim();
    return trimmed === ""
      ? { kind: "none", leftOut: [] }
      : { kind: "created", commit: trimmed, leftOut: [], deletedUnstaged: [] };
  }
  let l = txe(s).trim() === "";
  if (s.exitCode === 1 && l)
    return (
      logForDebugging(
        `[gitBundle] git stash create exited ${s.code} with no output \u2014 treating as no uncommitted changes`,
      ),
      { kind: "none", leftOut: [] }
    );
  return !n
    ? { kind: "none", leftOut: [] }
    : l
      ? {
          ...stepFailure(
            "stash create",
            s.exitCode === void 0
              ? "it was stopped, ran out of time or could not start, and left no message"
              : `it ended with exit status ${s.exitCode} and left no message`,
          ),
          silent: l,
        }
      : stepFailure("stash create", s.stderr, s);
}
//@ chunk-gjx0rh1b.js:55353-56266 placement
async function restoreIndexEntries(e, n, r, o, s) {
  let l = await resolveTreePaths(n, o, s);
  if (isTreeReadFailure(l))
    return treeReadFailure(
      l,
      "cat-file",
      "the trees holding the entries to restore could not be read back as what their ids name",
    );
  let h = `0 ${"0".repeat(o.length)}`,
    u = await e(
      ["update-index", "-z", "--index-info"],
      { GIT_INDEX_FILE: r },
      s
        .map((_) => {
          let y = l.get(_);
          return `${y === void 0 ? h : `${y.mode.padStart(6, "0")} ${y.id}`}	${_}\x00`;
        })
        .join(""),
    );
  if (u.code !== 0) return stepFailure("update-index", u.stderr, u);
  let p = $a(txe(u), s);
  if (p.length > 0)
    return {
      step: "refused-name",
      detail: `git refuses a name it was asked to restore: ${p.slice(0, 3).join(", ")}`,
    };
  let w = await listIndexEntriesNamed(e, r, new Set(s), dirname_2(r));
  if (w === null) return { step: "ls-files", detail: "could not list the index entries" };
  return s.some((_) => {
    let y = w.get(_);
    return (y !== void 0 && !Cqr(y)) || y?.id !== l.get(_)?.id || y?.mode !== l.get(_)?.mode.padStart(6, "0");
  })
    ? { step: "verify", detail: "the entries just restored are not the ones the verified trees hold" }
    : null;
}
//@ chunk-gjx0rh1b.js:56266-56361 placement
async function Sa(e) {
  let n = createHash("sha256");
  return (
    await readFileChunks(e, (r) => {
      n.update(r);
    }),
    n.digest("hex")
  );
}
//@ chunk-gjx0rh1b.js:56361-56417 placement
function cr({ detail: detail, run: run }) {
  return stepFailure("read-tree", detail, run);
}
//@ chunk-gjx0rh1b.js:56417-57801 placement
async function listSparseCheckout(e, n, r, o, s, l) {
  let h = await mkdtemp_2(join_4(r, "claude-seed-listings-"));
  try {
    let u = 0,
      p = async (B, x, S) => {
        let z = S.length === 0 ? [] : ["--", ".", ...S.map((Y) => `:(exclude,literal)${Y}`)];
        for (let Y of [["--sparse"], []]) {
          let L = await open_4(join_4(h, `${B}.${u++}`), YZn, 384);
          try {
            let U = await e(
              ["ls-files", ...Y, "-s", "-z", ...z],
              { GIT_GLOB_PATHSPECS: "0", GIT_ICASE_PATHSPECS: "0", ...x },
              void 0,
              void 0,
              L.fd,
            );
            if (U.code === 0) return await Sa(L);
            if (U.exitCode !== GIT_SIGPIPE_EXIT_CODE || Y.length === 0)
              return { detail: U.stderr || "could not list the index", run: U };
          } finally {
            await L.close();
          }
        }
        return { detail: "could not list the index" };
      },
      w = async (B) => {
        let [x, S] = await Promise.all([p("trees", { GIT_INDEX_FILE: n }, []), p("index", void 0, B)]);
        if (typeof x !== "string") return x;
        if (typeof S !== "string") return S;
        return x === S ? "agree" : "differ";
      },
      _ = await w([]);
    if (_ !== "differ") return _ === "agree" ? { kind: "agree" } : cr(_);
    let y = await e(
      ["diff-files", "-z", "--name-only", "--diff-filter=AD", "--ignore-submodules=dirty"],
      LITERAL_PATHSPEC_ENV,
    );
    if (y.code !== 0) return cr({ detail: y.stderr, run: y });
    let filtered = y.stdout.split("\x00").filter((B) => B !== ""),
      C = await resolveTreePaths(o, s, filtered);
    if (isTreeReadFailure(C))
      return treeReadFailure(
        C,
        "cat-file",
        "the index's trees could not be read back as what their ids name",
      );
    let filtered_2 = filtered.filter((B) => !C.has(B));
    if (filtered_2.length === 0 || filtered_2.some((B) => !isSafeRepoRelativePath(B, l)))
      return { kind: "differ" };
    let R = await w(filtered_2);
    return R === "agree" ? { kind: "agree" } : R === "differ" ? { kind: "differ" } : cr(R);
  } finally {
    await rm_3(h, { recursive: !0, force: !0 }).catch(() => {});
  }
}
//@ chunk-gjx0rh1b.js:57801-58623 placement
async function listIndexIds(e, n, r, o, s, l, h) {
  let u = await mkdtemp_2(join_4(s, "claude-seed-ids-"));
  try {
    let p = 0;
    for (let w of [["--sparse"], []]) {
      let _ = await open_4(join_4(u, `index.${p++}`), YZn, 384);
      try {
        let y = await e(["ls-files", ...w, "-s", "-z"], { GIT_INDEX_FILE: n }, void 0, void 0, _.fd);
        if (y.code === 0) {
          let E = [],
            C = new Map(),
            A = "";
          if (
            (await readFileChunks(_, (R) => {
              if (h?.aborted) return;
              let parts = (A + R.toString("latin1")).split("\x00");
              A = parts.pop() ?? "";
              for (let x of parts) {
                let index = x.indexOf("\t"),
                  [, z = "", Y = ""] = x.slice(0, index).split(" "),
                  str = Buffer.from(x.slice(index + 1), "latin1").toString("utf8");
                if (!isSafeRepoRelativePath(str, l) || hasDosShortNameSegment(str)) continue;
                if (Y === "0" && o(str)) C.set(str, z);
                let U = r.get(z);
                if (U !== void 0 && str !== U) E.push(str);
              }
            }),
            h?.aborted)
          )
            return null;
          return A === "" ? { elsewhere: E, withheldTracked: C } : null;
        }
        if (y.exitCode !== GIT_SIGPIPE_EXIT_CODE) return null;
      } finally {
        await _.close();
      }
    }
    return null;
  } finally {
    await rm_3(u, { recursive: !0, force: !0 }).catch(() => {});
  }
}
//@ chunk-gjx0rh1b.js:58623-58795 placement
var HEAD_UNVERIFIABLE_TEXT = "HEAD's commit or its .gitattributes could not be read to be verified",
  va = "internal error: no git directory was chosen for this linked worktree, so git was not run";
/**
 * 创建在加固模式下运行 git 的执行函数；链接工作树缺少管理目录时直接返回拒绝结果。
 */
//@ chunk-gjx0rh1b.js:58795-59238 placement
function createHardenedGitRunner(e, n, r, o, s = HNe(), { hardenedMaxBuffer: l } = {}) {
  if (n.checkout === "linked" && n.adminDir === void 0 && n.runsInOwnDirectories !== !0)
    return () => Promise.resolve({ stdout: "", stderr: va, code: 126 });
  let h = o ?? reachForBoundSession(n),
    u = s.screenMemo ?? Lqr();
  return (p, w, _, y, E) =>
    listGitRefs(e, p, {
      hardened: !0,
      layout: n,
      signal: r,
      probes: s,
      env: w,
      input: _,
      ...(y !== void 0 && { encoding: y }),
      ...(E !== void 0 && { stdoutFd: E }),
      ...(h !== void 0 && { reachRoots: h, screenMemo: u }),
      ...(l !== void 0 && { hardenedMaxBuffer: l }),
    });
}
/**
 * 解析 HEAD（无提交、分离、分支），列出被省略的内容。
 */
//@ chunk-gjx0rh1b.js:59238-61137 placement
async function resolveHeadState(e, n) {
  let r = await e(["rev-parse", "-q", "--verify", "HEAD"]);
  if (r.code !== 0)
    return r.exitCode === 1 ? { kind: "none", leftOut: [] } : stepFailure("rev-parse", r.stderr, r);
  let o = await e(["rev-parse", "-q", "--verify", `${r.stdout.trim()}^{commit}`]);
  if (o.code !== 0) {
    let S = await e(["cat-file", "-t", r.stdout.trim()]);
    return S.code === 0 && ["tree", "blob"].includes(S.stdout.trim())
      ? stepFailure("verify", "HEAD names a tree or blob, not a commit")
      : stepFailure("rev-parse", o.stderr || "HEAD is not a commit");
  }
  let trimmed = o.stdout.trim(),
    l = new GitObjectReader(batchCatFile(e, n), trimmed),
    [h, u] = await Promise.all([l.commit(trimmed), e(["write-tree", "--ignore-cache-tree"])]);
  if (isTreeReadFailure(h))
    return treeReadFailure(h, "rev-parse", "HEAD could not be read back as the commit its id names");
  if (u.code !== 0) return stepFailure("write-tree", u.stderr || u.stdout, u);
  let tree = h.tree,
    trimmed_2 = u.stdout.trim(),
    _ = await parseIndexEntries(l, tree, trimmed_2);
  if (isTreeReadFailure(_))
    return treeReadFailure(
      _,
      "cat-file",
      "HEAD's or the index's trees could not be read back as what their ids name",
    );
  let y = _,
    E = await e(["--no-optional-locks", "diff-files", "-z", "--no-renames", "--ignore-submodules=dirty"]),
    C = E.code === 0 ? parseDiffRawZ(E.stdout) : null;
  if (C === null) return stepFailure("diff-files", E.stderr, E);
  if ([...C, ...y].some(({ path: path }) => path.includes("\uFFFD")))
    return stepFailure("path-encoding", "a changed path is not valid UTF-8");
  let A = await resolveTreePaths(
    l,
    tree,
    C.map(({ path: path }) => path),
  );
  if (isTreeReadFailure(A))
    return treeReadFailure(
      A,
      "cat-file",
      "HEAD's trees to the changed files could not be read back as what their ids name",
    );
  let repeat = "0".repeat(tree.length),
    B = new Set(C.map(({ path: path }) => path)),
    x = [
      ...y.filter(({ path: path }) => !B.has(path)),
      ...C.flatMap((S) => {
        let z = A.get(S.path);
        if (S.status === "D")
          return z === void 0 || isWindowsUnholdableDeletion(S, A)
            ? []
            : [
                {
                  path: S.path,
                  status: "D",
                  oldMode: z.mode.padStart(6, "0"),
                  newMode: "000000",
                  oldId: z.id,
                  newId: repeat,
                },
              ];
        return [
          {
            path: S.path,
            status: z === void 0 ? "A" : "M",
            oldMode: z === void 0 ? "000000" : z.mode.padStart(6, "0"),
            newMode: S.newMode,
            oldId: z?.id ?? repeat,
            newId: repeat,
          },
        ];
      }),
    ];
  return {
    kind: "inspected",
    inspection: {
      base: trimmed,
      baseTree: tree,
      iTree: trimmed_2,
      staged: y,
      working: x,
      reader: l,
      namesWindowsCannotHold: count(C, (S) => isWindowsUnholdableDeletion(S, A)),
    },
  };
}
//@ chunk-gjx0rh1b.js:61137-61273 placement
function isWindowsUnholdableDeletion(e, n) {
  return (
    getPlatform() === "windows" &&
    e.status === "D" &&
    n.has(e.path) &&
    Rii(e.path) &&
    !e.path.includes("\\") &&
    isSafeRepoRelativePath(e.path, !0) &&
    !hasDosShortNameSegment(e.path)
  );
}
//@ chunk-gjx0rh1b.js:61273-61436 placement
function findSuspiciousChangedPaths({ staged: staged, working: working }, r) {
  return uniq([...staged, ...working].map(({ path: path }) => path))
    .sort()
    .flatMap((s) =>
      !isSafeRepoRelativePath(s, r)
        ? [{ path: s, why: "forged" }]
        : hasDosShortNameSegment(s)
          ? [{ path: s, why: "alias" }]
          : [],
    );
}
//@ chunk-gjx0rh1b.js:61436-62405 placement
async function classifyIndexEntry(e, { staged: staged, working: working }, o, s, l = () => !1) {
  let h = uniq([...staged, ...working].map(({ path: path }) => path)),
    filtered = h.filter((D) => !isSafeRepoRelativePath(D, s)),
    filtered_2 = h.filter((D) => isSafeRepoRelativePath(D, s) && hasDosShortNameSegment(D)),
    w = new Set([...filtered, ...filtered_2]),
    _ = ({ path: path }) => !w.has(path) && o(path),
    filtered_3 = staged.filter(_),
    E = new Set(filtered_3.map(({ path: path }) => path)),
    C = limitConcurrency(GIT_READ_CONCURRENCY, async (D) =>
      !E.has(D.path) && !l(D.path) && (await compareWorktreeEntry(e, D, s)) === "unchanged" ? [] : [D],
    ),
    flat = (await Promise.all(working.filter(_).map(C))).flat(),
    R = uniq(
      [...filtered_3, ...flat].filter(({ status: status }) => status === "A").map(({ path: path }) => path),
    ),
    B = new Set(R),
    x = uniq(
      [...filtered_3, ...flat]
        .filter(({ path: path, status: status }) => status !== "D" && !B.has(path))
        .map(({ path: path }) => path),
    ),
    S = new Set([...R, ...x]),
    z = uniq([...filtered_3, ...flat].map(({ path: path }) => path).filter((D) => !S.has(D))),
    Y = limitConcurrency(GIT_READ_CONCURRENCY, async (D) => ((await isNotPlainDirectory(e, D)) ? [D] : [])),
    flat_2 = (await Promise.all(z.map(Y))).flat();
  return [
    ...filtered.map((D) => ({ path: D, why: "forged" })),
    ...filtered_2.map((D) => ({ path: D, why: "alias" })),
    ...R.map((D) => ({ path: D, why: "added" })),
    ...x.map((D) => ({ path: D, why: "changed" })),
    ...flat_2.map((D) => ({ path: D, why: "resurrected" })),
  ].sort((D, pe) => (D.path < pe.path ? -1 : D.path > pe.path ? 1 : 0));
}
//@ chunk-gjx0rh1b.js:62405-62717 placement
async function describeIndexEntryChange(e, n, r, o, s) {
  let l = await parseIndexEntries(e, n, r);
  if (isTreeReadFailure(l)) return l;
  let filtered = l.filter(
      ({ path: path, status: status }) =>
        status !== "D" && (!isSafeRepoRelativePath(path, s) || hasDosShortNameSegment(path) || o(path)),
    ),
    u = new Map(filtered.map(({ path: path, status: status }) => [path, status]));
  return uniq(filtered.map(({ path: path }) => path))
    .sort()
    .map((p) => ({
      path: p,
      why: !isSafeRepoRelativePath(p, s)
        ? "forged"
        : hasDosShortNameSegment(p)
          ? "alias"
          : u.get(p) === "A"
            ? "added"
            : "changed",
    }));
}
//@ chunk-gjx0rh1b.js:62717-62914 placement
var MISSING_OBJECT_RE =
    /invalid object \d+ [0-9a-f]+ for|could not fetch [0-9a-f]+ from promisor remote|lazy fetching disabled|missing blob/,
  UNMERGED_INDEX_RE = /needs merge|you need to resolve your current index first|unmerged/i;
//@ chunk-gjx0rh1b.js:62914-63057 placement
function INDEX_PROBLEM_KINDS(e) {
  let n = getFirstLine(txe(e).trim());
  return MISSING_OBJECT_RE.test(n)
    ? "object_missing"
    : UNMERGED_INDEX_RE.test(n)
      ? "unmerged"
      : n.includes("index.lock")
        ? "index_locked"
        : void 0;
}
//@ chunk-gjx0rh1b.js:63057-63163 placement
function stepFailure(e, n, r) {
  let o = r && INDEX_PROBLEM_KINDS(r);
  return { kind: "failed", step: e, detail: getFirstLine(n.trim()), ...(o !== void 0 && { said: o }) };
}
//@ chunk-gjx0rh1b.js:63163-63273 placement
function sameBytesRefusal(e) {
  return {
    kind: "refused",
    refused: e.map(({ path: path }) => ({ path: path, why: "same-bytes" })),
    decidedOn: "tree",
  };
}
//@ chunk-gjx0rh1b.js:63273-63368 placement
function $a(e, n) {
  let r = new Set(
    e.split(`
`),
  );
  return n.filter((o) => r.has(`Ignoring path ${o}`));
}
//@ chunk-gjx0rh1b.js:63368-63490 placement
function treeReadFailure(e, n, r) {
  return e.failed === "tampered"
    ? stepFailure("verify", r)
    : e.failed === "malformed"
      ? stepFailure("malformed-tree", e.dir ?? "")
      : stepFailure(n, r);
}
//@ chunk-gjx0rh1b.js:63490-63617 placement
function formatDirectoryLabel(e) {
  return e === void 0 || e === ""
    ? "the top of the checkout"
    : `directory '${truncateCodePoints(e.replace(/[\p{Cc}\p{Cf}']/gu, "?"), 120)}'`;
}
//@ chunk-gjx0rh1b.js:63617-63894 placement
function parseDiffRawZ(e) {
  let parts = e.split("\x00");
  if (parts.pop() !== "" || parts.length % 2 !== 0) return null;
  let list = Array.from({ length: parts.length / 2 }, (o, s) => {
    let match = DIFF_RAW_LINE_RE.exec(parts[2 * s]);
    return match
      ? {
          path: parts[2 * s + 1],
          oldMode: match[1],
          newMode: match[2],
          oldId: match[3],
          newId: match[4],
          status: match[5],
        }
      : null;
  });
  return list.every((o) => o !== null) ? list : null;
}
//@ chunk-gjx0rh1b.js:63894-64051 placement
function infoAttributesUnchanged(e, n) {
  return (
    e.kind !== "unreadable" &&
    n.kind === "none" &&
    (e.bytes === null ? n.bytes === null : n.bytes !== null && e.bytes.equals(n.bytes)) &&
    sameFileStamp(e.stamp, n.stamp)
  );
}
//@ chunk-gjx0rh1b.js:64051-64177 placement
function sameFileStamp(e, n) {
  return e === null || n === null
    ? e === n
    : e.ino === n.ino && e.size === n.size && e.mtimeMs === n.mtimeMs && e.ctimeMs === n.ctimeMs;
}
//@ chunk-gjx0rh1b.js:64177-64290 placement
function fileStampFromBigStats(e) {
  return {
    size: Number(e.size),
    mtimeMs: Number(e.mtimeNs) / 1e6,
    ctimeMs: Number(e.ctimeNs) / 1e6,
    ino: e.ino,
  };
}
//@ chunk-gjx0rh1b.js:64290-64417 placement = isRealPathWithinTeamDir (0.77)
async function lstatBigintOrNull(e, n = lstat_2) {
  try {
    return await n(e, { bigint: !0 });
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT" || getErrnoCode(error) === "ENOTDIR") return null;
    throw error;
  }
}
//@ chunk-gjx0rh1b.js:64417-64527 placement
var FILTER_ATTRIBUTE_RE = /(?:^|\s|")[-!]?(?:filter|working-tree-encoding|ident)(?:=|\s|$)/,
  MACRO_OR_QUOTED_ATTR_RE = /^[ \t\r]*(?:\[attr\]|")/,
  MAX_ATTRIBUTE_LINE_BYTES = 2048;
//@ chunk-gjx0rh1b.js:64527-64598 placement
function Ga(e) {
  return e
    .split(
      `
`,
    )
    .some((n) => Buffer.byteLength(n) >= MAX_ATTRIBUTE_LINE_BYTES);
}
//@ chunk-gjx0rh1b.js:64598-64713 placement
function attributeLines(e) {
  return e
    .replace(/^\uFEFF/, "")
    .split(
      `
`,
    )
    .map((n) => firstLineOf(n, "\x00"))
    .filter((n) => !/^[ \t\r]*#/.test(n));
}
//@ chunk-gjx0rh1b.js:64713-65080 placement
async function findGitDirCaseVariants(e, n) {
  let r = getPlatform(),
    [o, s] = await Promise.all([
      lstat_2(join_4(n, ".git"), { bigint: !0 }).catch(() => null),
      lstat_2(join_4(n, ".GIT"), { bigint: !0 }).catch(() => null),
    ]),
    l = o !== null && s !== null && o.ino === s.ino && o.dev === s.dev,
    h = await e(["config", "--bool", "core.ignorecase"]);
  return {
    caseBlind: r === "macos" || r === "windows" || l || (h.code === 0 && h.stdout.trim() === "true"),
    normalizationBlind: r === "macos",
  };
}
//@ chunk-gjx0rh1b.js:65080-66184 placement
async function readInfoAttributes(e, { shouldStampAbove: n = !1, shouldStopAtLink: r = !1 } = {}) {
  let o = join_4(e, "info"),
    s = join_4(o, "attributes"),
    l = await openGitInfoDir(o, n, r).catch(() => {
      return;
    });
  if (l === void 0) return { kind: "unreadable", bytes: null, stamp: null };
  if (r && l.link) return { kind: "none", bytes: null, stamp: null, dir: l };
  try {
    if (getPlatform() === "windows" && !(await lstat_2(s)).isFile())
      return { kind: "unreadable", bytes: null, stamp: null };
    let h = await open_4(s, $c());
    try {
      let stats = await h.stat({ bigint: !0 });
      if (!stats.isFile() || stats.size > MAX_INFO_ATTRIBUTES_BYTES)
        return { kind: "unreadable", bytes: null, stamp: null };
      let p = fileStampFromBigStats(stats),
        w = Number(stats.size);
      if (w === 0) return { kind: "none", bytes: Buffer.alloc(0), stamp: p, dir: l };
      let alloc = Buffer.alloc(w),
        { bytesRead: bytesRead } = await h.read(alloc, 0, w, 0);
      if (bytesRead !== w) return { kind: "unreadable", bytes: null, stamp: null };
      let str = alloc.toString("utf8"),
        C = attributeLines(str),
        A = Ga(str)
          ? "overlong_line"
          : C.some((R) => MACRO_OR_QUOTED_ATTR_RE.test(R))
            ? "macro_or_quoted"
            : C.some((R) => FILTER_ATTRIBUTE_RE.test(R))
              ? "rule"
              : void 0;
      return A === void 0
        ? { kind: "none", bytes: alloc, stamp: p, dir: l }
        : { kind: "touches", by: A, bytes: alloc, stamp: p, dir: l };
    } finally {
      await h.close();
    }
  } catch (error) {
    return getErrnoCode(error) === "ENOENT" || getErrnoCode(error) === "ENOTDIR"
      ? { kind: "none", bytes: null, stamp: null, dir: l }
      : { kind: "unreadable", bytes: null, stamp: null };
  }
}
//@ chunk-gjx0rh1b.js:66184-66532 placement
async function openGitInfoDir(e, n, r) {
  let o = await lstatBigintOrNull(e),
    s = n && o === null ? await lstatBigintOrNull(dirname_2(e)) : null,
    l = !o?.isSymbolicLink() ? o : r ? null : await lstatBigintOrNull(e, stat_3),
    h = getPlatform() === "windows" && o?.isDirectory() === !0 ? await readJunction(e) : null,
    u = h !== null && h.kind !== "directory" && !(h.kind === "error" && h.code === "EISDIR");
  return {
    node: o && fileStampFromBigStats(o),
    link: (o?.isSymbolicLink() ?? !1) || u,
    target: l && fileStampFromBigStats(l),
    ...(s && { above: fileStampFromBigStats(s) }),
  };
}
//@ chunk-gjx0rh1b.js:66532-67173 placement
async function checkAlternatesFile(e, n) {
  if (!isAbsolute_2(n.objectsDir) || /[\r\n]/.test(n.objectsDir) || /^["#]/.test(n.objectsDir))
    return "the objects directory cannot be named in an alternates file";
  let r = { flag: Rqr, mode: 384 };
  return (
    await mkdir_2(join_4(e, "objects", "info"), { recursive: !0, mode: 448 }),
    await Promise.all([
      mkdir_2(join_4(e, "refs"), { mode: 448 }),
      writeFile_2(
        join_4(e, "HEAD"),
        `ref: refs/heads/attributes-view
`,
        r,
      ),
      writeFile_2(
        join_4(e, "config"),
        [
          "[core]",
          `	repositoryformatversion = ${n.objectFormat === "sha256" ? 1 : 0}`,
          `	ignorecase = ${n.caseBlind}`,
          ...(n.objectFormat === "sha256" ? ["[extensions]", "\tobjectformat = sha256"] : []),
          "",
        ].join(`
`),
        r,
      ),
      writeFile_2(
        join_4(e, "objects", "info", "alternates"),
        `${n.objectsDir}
`,
        r,
      ),
    ]),
    null
  );
}
//@ chunk-gjx0rh1b.js:67173-67819 placement
async function readSymlinkTarget(e, n, r) {
  let filtered = r.filter((u) => u.kind === "symlink"),
    s = [],
    l = new Map();
  for (let u of filtered) {
    let str = u.target.toString("utf8");
    if (!Buffer.from(str, "utf8").equals(u.target))
      return stepFailure("path-encoding", `${u.path}: link target is not valid UTF-8`);
    let w = await e(["hash-object", "-w", "--stdin"], void 0, str);
    if (w.code !== 0) return stepFailure("hash-object", w.stderr, w);
    (s.push(`${SYMLINK_MODE_VALUE} ${w.stdout.trim()}	${u.path}`),
      l.set(u.path, w.stdout.trim().toLowerCase()));
  }
  if (s.length === 0) return { kind: "laid", ids: l };
  let h = await e(
    ["update-index", "-z", "--index-info"],
    { GIT_INDEX_FILE: n },
    s.map((u) => `${u}\x00`).join(""),
  );
  return h.code === 0 ? { kind: "laid", ids: l } : stepFailure("update-index", h.stderr, h);
}
//@ chunk-gjx0rh1b.js:67819-68548 placement
async function listSkipWorktreeEntries(e, n, r, o) {
  let s = await r(["--ignore-skip-worktree-entries"], n);
  if ((s.exitCode === GIT_SIGPIPE_EXIT_CODE ? await r([], n) : s).code !== 0) return null;
  let h = new Set(o),
    u = new Map(),
    p = await open_4(`${n}.listing`, YZn, 384);
  try {
    if ((await e(["ls-files", "-s", "-z"], { GIT_INDEX_FILE: n }, void 0, void 0, p.fd)).code !== 0)
      return null;
    let _ = "";
    await readFileChunks(p, (y) => {
      let parts = (_ + y.toString("latin1")).split("\x00");
      _ = parts.pop() ?? "";
      for (let C of parts) {
        let index = C.indexOf("\t"),
          [R, B, x] = index === -1 ? [] : C.slice(0, index).split(" "),
          str = Buffer.from(C.slice(index + 1), "latin1").toString("utf8");
        if (R !== void 0 && B !== void 0 && x === "0" && h.has(str))
          u.set(str, { mode: R, id: B.toLowerCase() });
      }
    });
  } finally {
    (await p.close().catch(() => {}), await rm_3(`${n}.listing`, { force: !0 }).catch(() => {}));
  }
  return o.every((w) => u.has(w)) ? u : null;
}
//@ chunk-gjx0rh1b.js:68548-68730 placement
async function isNotPlainDirectory(e, n) {
  if (n.includes("\uFFFD") || (await lstatOrAbsent(e, n)) !== "clear") return !0;
  try {
    return !(await lstat_2(join_4(e, n))).isDirectory();
  } catch (error) {
    let o = getErrnoCode(error);
    return o !== "ENOENT" && o !== "ENOTDIR";
  }
}
//@ chunk-gjx0rh1b.js:68730-69762 placement
async function compareWorktreeEntry(
  e,
  { path: path, status: status, oldMode: oldMode, newMode: newMode, oldId: oldId, newId: newId },
  u,
  p = MAX_STASH_FILE_BYTES,
  w,
) {
  if (
    status !== "M" ||
    oldMode !== newMode ||
    !ZERO_OID_RE.test(newId) ||
    oldId.length !== 40 ||
    path.includes("\uFFFD")
  )
    return "changed";
  if ((await lstatOrAbsent(e, path)) !== "clear") return "changed";
  try {
    let _ = await readWorktreeFileSafely(e, path, u);
    if (_.kind === "symlink")
      return newMode === SYMLINK_MODE_VALUE &&
        (Ri(_.target) === oldId ||
          (getPlatform() === "windows" &&
            Ri(await readlink(join_4(e, path), { encoding: "buffer" })) === oldId))
        ? "unchanged"
        : "changed";
    if (_.kind !== "file") return _.kind === "refused" ? "open_refused" : "changed";
    let { handle: handle, size: size } = _;
    try {
      if (!REGULAR_FILE_MODES.includes(newMode) || size > p) return "changed";
      let stats = await handle.stat({ bigint: !0 }),
        update = createHash("sha1").update(`blob ${size}\x00`),
        allocUnsafe = Buffer.allocUnsafe(Math.min(size, 1048576)),
        B = 0;
      while (B < size) {
        if (w?.aborted) return "changed";
        let { bytesRead: bytesRead } = await handle.read(
          allocUnsafe,
          0,
          Math.min(allocUnsafe.length, size - B),
          B,
        );
        if (bytesRead === 0) return "changed";
        (update.update(allocUnsafe.subarray(0, bytesRead)), (B += bytesRead));
      }
      if (update.digest("hex") !== oldId) return "changed";
      let stats_2 = await handle.stat({ bigint: !0 });
      return stats.size === BigInt(size) &&
        stats_2.size === stats.size &&
        stats_2.mtimeNs === stats.mtimeNs &&
        stats_2.ctimeNs === stats.ctimeNs &&
        stats_2.nlink === 1n
        ? "unchanged"
        : "changed";
    } finally {
      await handle.close();
    }
  } catch {
    return "changed";
  }
}
/**
 * 种子索引文件名模式，以及疑似含凭据的文件名模式（env、netrc、npmrc、credential 等）。
 */
//@ chunk-gjx0rh1b.js:69762-70712 placement
var SEED_INDEX_NAME_PATTERN = /^ccr-seed-([0-9]+)-[0-9a-f]{12}\.index(?:\.lock)?$/,
  bn =
    /env|netrc|npmrc|yarnrc|pypirc|pgpass|\.cnf|terraform|tfvars|tfstate|boto|s3cfg|credential|gitconfig|mcp|claude|config|bash|profile|zsh|zlog|fish|history|consolehost|\.(?:pem|key|p12|pfx|keystore|jks|kdbx|ovpn|vars|ssh|aws|azure|gnupg|kube|docker|git)|_(?:rsa|dsa|ecdsa|ed25519)|secret|settings|gradle\.properties|device-keys|service.?account|deploy_key|htpasswd|htdigest|vault[-_](?:token|pass)|dockercfg|msmtprc|fetchmailrc|sentryclirc|clasprc|transifexrc|databrickscfg|remote-sync|wakatime/i,
  Yi = `[${O6r.replace(/[\\\]^-]/g, "\\$&")}]|_${w3o}_`,
  Xa = uniq(CREDENTIAL_CONFIG_PATHS.map(([e]) => e)),
  regExp = new RegExp(
    `(?:^|/)(?:(?:${Yi})[^/]*)?(?:\\.(?:ssh|aws|azure|gnupg|kube|docker|config|cargo|gem|m2|gradle|claude)|documents|appdata|library|(?:${Xa.join("|")})(?![a-z0-9-]))|\\.git`,
    "i",
  ),
  replaced = O6r.replace(/[\\\]^-]/g, "\\$&"),
  regExp_2 = new RegExp(`(?:[${replaced}][^/${replaced}]*){4}|${E3o}`, "i"),
  regExp_3 = new RegExp(`(?:^|/)[^/]{${U$e + 1}}`);
//@ chunk-gjx0rh1b.js:70712-71692 placement
function checkCredentialLikePaths() {
  let e = new Map(),
    n = new Map(),
    r = new Map();
  return (o) => {
    if (!isPlainRelativePath(o) || o.includes("\\") || (o.includes(":") && getPlatform() === "windows"))
      return _H(o);
    let s = Za.test(o)
        ? o
        : o.replaceAll("\u0131", "i").replaceAll("\u017F", "s").replaceAll("\u212A", "k").replace(Ja, ""),
      index = s.lastIndexOf("/"),
      h = index === -1 ? "" : s.slice(0, index),
      index_2 = o.lastIndexOf("/"),
      p = index_2 === -1 ? "" : o.slice(0, index_2),
      w = e.get(p);
    if (w === void 0) {
      let C = index !== -1 && pr(p, h),
        A = C ? h.split("/") : [],
        R = C
          ? p.split("/").map((B, x) => {
              let S = A[x];
              if (S !== void 0 && !pr(B, S)) return "passed";
              let z =
                n.get(B) ??
                ((S !== void 0 && !Oi(B, S)) || !_H(`${B}/.bak`)
                  ? "passed"
                  : _H(`${B}/x`)
                    ? "withheld"
                    : "asked");
              return (n.set(B, z), z);
            })
          : [];
      ((w = R.includes("withheld")
        ? "withheld"
        : R.includes("asked") || (index !== -1 && (regExp.test(h) || En(regExp, p)))
          ? "asked"
          : "passed"),
        e.set(p, w));
    }
    if (w !== "passed") return w === "withheld" || _H(o);
    let sliced = s.slice(index + 1),
      sliced_2 = o.slice(index_2 + 1);
    if (index !== -1 && (regExp_4.test(sliced) || regExp_4.test(sliced_2)) && (bn.test(h) || En(bn, p)))
      return _H(o);
    if (!bn.test(sliced) && !Oi(sliced_2, sliced) && !En(bn, sliced_2)) return !1;
    let E = r.get(sliced_2);
    if (E === void 0) ((E = _H(sliced_2)), r.set(sliced_2, E));
    return E;
  };
}
//@ chunk-gjx0rh1b.js:71692-71852 placement
function En(e, n) {
  return (
    n.includes(":") &&
    n
      .split("/")
      .filter((r) => r.includes(":"))
      .some((r) => {
        let o = expandNameReadings(r);
        return bor(r).some((s) => o.some((l) => e.test(s(l))));
      })
  );
}
//@ chunk-gjx0rh1b.js:71852-71942 placement
function pr(e, n) {
  return (
    (e.length > U$e && regExp_3.test(e)) ||
    regExp_2.test(e) ||
    (n !== e && regExp_2.test(n)) ||
    En(regExp_2, e)
  );
}
//@ chunk-gjx0rh1b.js:71942-72045 placement
function Oi(e, n) {
  return (
    pr(e, n) &&
    (e.length > U$e ||
      expandNameReadings(e).length > 1 ||
      bor(e).some((r) => expandNameReadings(r(e)).length > 1))
  );
}
//@ chunk-gjx0rh1b.js:72045-72121 placement
var Ja = /[^\x20-\x7e]/gu,
  Za = /^[\x20-\x7e]*$/,
  regExp_4 = new RegExp(`^(?:${Yi})`, "i");
//@ chunk-gjx0rh1b.js:72121-73074 placement
async function lstatNoFollow(e, n) {
  let r;
  try {
    r = await open_4(e, $c());
  } catch (error) {
    let s = getErrnoCode(error);
    return s === "ELOOP" || s === "ENOENT" || s === "ENOTDIR"
      ? {
          kind: "tamper",
          detail: `something other than the scratch index this build wrote stands at its name (${s})`,
        }
      : { kind: "disk", detail: `the scratch index could not be opened (${s ?? "an error"})` };
  }
  try {
    let stats = await r.stat();
    if (!stats.isFile() || stats.nlink !== 1)
      return {
        kind: "tamper",
        detail: "something other than the scratch index this build wrote stands at its name",
      };
    let s = await open_4(n, Rqr, 384);
    try {
      let allocUnsafe = Buffer.allocUnsafe(1048576);
      for (let h = 0; h < stats.size;) {
        let { bytesRead: bytesRead } = await r.read(
          allocUnsafe,
          0,
          Math.min(allocUnsafe.length, stats.size - h),
          h,
        );
        if (bytesRead === 0)
          return { kind: "tamper", detail: "the scratch index changed while it was carried off" };
        (await s.write(allocUnsafe, 0, bytesRead), (h += bytesRead));
      }
      await s.utimes(stats.atime, stats.mtime);
    } finally {
      await s.close().catch(() => {});
    }
    return null;
  } catch (error) {
    return {
      kind: "disk",
      detail: `the scratch index could not be carried off (${getErrnoCode(error) ?? errorMessage(error)})`,
    };
  } finally {
    await r.close().catch(() => {});
  }
}
//@ chunk-gjx0rh1b.js:73074-73122 placement
var Ki = 600000,
  Qa = /^claude-seed-index-([0-9]+)-/;
//@ chunk-gjx0rh1b.js:73122-73312 placement
async function unlinkWithRetry(e) {
  for (let n = 0; ; n++)
    try {
      return (await unlink_3(e), null);
    } catch (error) {
      let o = getErrnoCode(error);
      if (o === "ENOENT") return null;
      if (n >= 3 || (o !== "EBUSY" && o !== "EPERM" && o !== "EACCES")) return o ?? errorMessage(error);
      await sleep(50);
    }
}
/**
 * 清理以 PID 命名的过期目录：名字里的 PID 对应进程已不存在、且目录修改时间超过保留时限时递归删除；出错静默忽略。
 */
//@ chunk-gjx0rh1b.js:73312-73562 placement = convertDirectoryToZipInPlace (0.79)
async function pruneStaleProcessDirs(e) {
  try {
    await Promise.all(
      (await readdir_2(e)).map(async (n) => {
        let r = Qa.exec(n)?.[1];
        if (r === void 0) return;
        let o = join_4(e, n),
          zipData = await lstat_2(o);
        if (zipData.isDirectory() && Date.now() - zipData.mtimeMs > Ki && !Xi(Number(r)))
          await rm_3(o, { recursive: !0, force: !0 });
      }),
    );
  } catch {}
}
/**
 * 清理以 PID 命名的过期 seed 索引文件：文件名匹配 seed 索引格式、修改时间超过保留时限且对应进程已不存在时删除（只删文件，不是目录）；出错静默忽略。
 */
//@ chunk-gjx0rh1b.js:73562-73780 placement
async function pruneStaleSeedIndexes(e) {
  try {
    await Promise.all(
      (await readdir_2(e)).map(async (n) => {
        let r = SEED_INDEX_NAME_PATTERN.exec(n)?.[1];
        if (r === void 0) return;
        let o = join_4(e, n);
        if (Date.now() - (await lstat_2(o)).mtimeMs > Ki && !Xi(Number(r))) await rm_3(o, { force: !0 });
      }),
    );
  } catch {}
}
//@ chunk-gjx0rh1b.js:73780-73859 placement
function Xi(e) {
  try {
    return (process.kill(e, 0), !0);
  } catch (error) {
    return getErrnoCode(error) === "EPERM";
  }
}
//@ chunk-gjx0rh1b.js:73859-73919 placement
async function Pi(e, n) {
  return (await classifyPathsAsDirectories(e, n)).notDirectories;
}
//@ chunk-gjx0rh1b.js:73919-74140 placement
async function classifyPathsAsDirectories(e, n) {
  let r = limitConcurrency(GIT_READ_CONCURRENCY, async (s) =>
      (await lstatOrAbsent(e, s)) === "clear" ? classifyDirEntry(join_4(e, s)) : "other",
    ),
    results = await Promise.all(n.map(r));
  return {
    notDirectories: n.filter((s, l) => results[l] !== "directory"),
    special: n.filter((s, l) => results[l] === "special"),
  };
}
//@ chunk-gjx0rh1b.js:74140-74288 placement
async function classifyDirEntry(e) {
  try {
    let n = await lstat_2(e);
    return n.isDirectory() ? "directory" : n.isFile() || n.isSymbolicLink() ? "other" : "special";
  } catch {
    return "other";
  }
}
//@ chunk-gjx0rh1b.js:74288-74574 placement
async function describeStashBase(e, n) {
  let [r, o] = await Promise.all([
      e(["symbolic-ref", "-q", "HEAD"]),
      e(["rev-list", "--max-count=1", "--format=%h %s", n, "--"]),
    ]),
    s = r.code === 0 ? r.stdout.trim().replace(/^refs\/heads\//, "") : "(no branch)",
    l =
      o.code === 0
        ? (o.stdout
            .trim()
            .split(
              `
`,
            )
            .at(-1) ?? "")
        : "";
  return `${s}: ${l}`;
}
//@ chunk-gjx0rh1b.js:74574-75644 placement
async function describeStashEntryChange(e, n, r, o, s) {
  let mapped = e.entries
    .filter((entry) => (entry.kind === "changed" || entry.kind === "absent") && n.has(entry.path))
    .map(({ path: path }) => path);
  if (mapped.length === 0) return e;
  let h = new Set(
      e.entries.flatMap((entry) => (entry.kind === "absent" && n.has(entry.path) ? [entry.path] : [])),
    ),
    u = missingGitattributesPaths(mapped),
    p = [...mapped, ...u.filter((x) => n.has(x))],
    w = new Set(e.entries.flatMap((entry) => (entry.kind === "changed" ? [entry.path] : []))),
    results = await Promise.all(u.map((x) => hashFileOrAbsent(join_4(o, x))));
  await Promise.all(u.map((x) => unlink_3(join_4(o, x)).catch(() => {})));
  let y = await s(p);
  if ("refused" in y) return y;
  let results_2 = await Promise.all(u.map((x) => hashFileOrAbsent(join_4(o, x)))),
    C = new Set(y.copies.flatMap((copy) => (copy.kind === "file" ? [copy.path] : []))),
    found = u.find((x, S) => (w.has(x) ? !C.has(x) : results[S] === null || results[S] !== results_2[S]));
  if (found !== void 0)
    return { refused: `${found}: changed while it was being read`, tooLarge: !1, momentary: !0 };
  let R = new Set([...mapped, ...u]),
    B = new Set(mapped);
  return {
    entries: [
      ...e.entries.filter((entry) => !R.has(entry.path)),
      ...y.entries
        .filter((entry) => R.has(entry.path))
        .map((x) =>
          x.kind === "absent" && B.has(x.path) && (!h.has(x.path) || r.has(x.path))
            ? { kind: "changed", path: x.path }
            : x,
        ),
    ],
    copies: [...e.copies.filter((copy) => !R.has(copy.path)), ...y.copies],
  };
}
//@ chunk-gjx0rh1b.js:75644-75810 placement
async function markPathsIntentToAdd(e, n, r, o) {
  return o.length === 0
    ? { code: 0, stderr: "" }
    : e(
        ["update-index", "-z", "--index-info"],
        n,
        o.map((s) => `0 ${"0".repeat(r.length)}	${s}\x00`).join(""),
      );
}
//@ chunk-gjx0rh1b.js:75810-76346 placement
async function listFilesNoPrecompose(e, n, r) {
  let results = await Promise.all(
    chunkArgsByBytes(r).map((u) =>
      e(["-c", "core.precomposeUnicode=false", "ls-files", "-z", "-v", "--", ...u], {
        ...LITERAL_PATHSPEC_ENV,
        ...n,
      }),
    ),
  );
  if (results.some((u) => u.code !== 0)) return null;
  let flattened = results
      .flatMap((u) => u.stdout.split("\x00"))
      .flatMap((u) => (u.length > 2 ? [{ tag: u[0], path: u.slice(2) }] : [])),
    l = new Set(flattened.flatMap(({ tag: tag, path: path }) => (tag === "S" || tag === "s" ? [path] : []))),
    h = new Set(flattened.map(({ path: path }) => path));
  return {
    skipWorktree: l,
    unseen: new Set([
      ...l,
      ...flattened.flatMap(({ tag: tag, path: path }) => (tag !== tag.toUpperCase() ? [path] : [])),
    ]),
    absent: new Set(r.filter((u) => !h.has(u))),
  };
}
//@ chunk-gjx0rh1b.js:76346-76493 placement
async function hashFileOrAbsent(e) {
  try {
    return createHash("sha1")
      .update(await readFile_2(e))
      .digest("hex");
  } catch (error) {
    let r = getErrnoCode(error);
    return r === "ENOENT" || r === "ENOTDIR" ? "absent" : null;
  }
}

export {
  Sn,
  captureWipStash,
  createStashCommit,
  formatDirectoryLabel,
  HEAD_UNVERIFIABLE_TEXT,
  isNotPlainDirectory,
  lstatOrAbsent,
};
