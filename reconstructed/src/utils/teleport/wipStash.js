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
import { join, dirname, basename, isAbsolute } from "path";
import {
  mkdir,
  open,
  unlink,
  lstat,
  readlink,
  mkdtemp,
  rm,
  stat,
  writeFile,
  readdir,
  readFile,
} from "fs/promises";
import { constants } from "fs";
import { createHash, randomBytes } from "crypto";
import { promisify } from "util";
import { deflate } from "zlib";
import { isPlainRelativePath } from "./seedPaths.js";
import { limitConcurrency } from "../concurrencyLimit.js";
import { READ_LIMITS, O_NOFOLLOW_ANY } from "../fsBoundRead.js";
import { getErrnoCode, errorMessage } from "../errors.js";
import { getPlatform } from "../platform.js";
import { listAncestorDirs } from "../path.js";
import {
  isSafeRepoRelativePath,
  isCaseFoldingFileSystem,
  hasDosShortNameSegment,
} from "./gitBundleVerify.js";
import { logEvent } from "../../services/analytics/index.js";
import { uniq, count } from "../collections.js";
import {
  listIndexEntriesNamed,
  splitArgsIntoSlices,
  chunkArgsByBytes,
  seenStderr,
  readFileChunks,
  GIT_STDOUT_CAPTURE_FLAGS,
  LITERAL_PATHSPEC_ENV,
  GIT_STDERR_CAPTURE_FLAGS,
} from "../git/builderGit/gitRun.js";
import { parseGitVersion } from "../../remote/tools/servedOwnerSettings.js";
import { yieldToEventLoop } from "../../native-ts/file-index/index.js";
import { currentGitBinaryState } from "../git/builderGit/gitBinary.js";
import { toPosixSpelling } from "../git/builderGit/gitDirIdentity.js";
import {
  CREDENTIAL_CONFIG_PATHS,
  isCredentialConfigPathActive,
  isSensitiveNameOrVariant,
  getPathNormalizationVariants,
  DECORATION_LEAD_CHARS,
  EDITOR_BACKUP_SUFFIX_REGEX,
  SYNC_CONFLICT_SUFFIX_PATTERN,
  MAX_NAME_READING_LENGTH,
  expandNameReadings,
  nameReadingFns,
} from "../permissions/sensitivePaths.js";
import {
  resolveTempDir,
  reachForBoundSession,
  GIT_READ_CONFIG_ARGS,
  SAFECRLF_ARGS,
  GIT_LIST_ENV,
} from "../git/builderGit/gitEnv.js";
import { logForDebugging } from "../debug.js";
import { listGitRefs } from "../git/builderGit/gitConfigAudit.js";
import { splitIndexOffArgs, indexFileEnv } from "../git/builderGit/repoCopy.js";
import { createReachCollector } from "../git/builderGit/sandboxReach.js";
import { hasUnsafeCharSegment } from "../windowsPathNames.js";
import { getFirstLine, truncateCodePoints, firstLineOf } from "../stringUtils.js";
import { readOnlyNoFollowFlags } from "../platformTargets.js";
import { readJunction } from "../fsJunctions.js";
import { sleep } from "../sleep.js";

//@ chunk-gjx0rh1b.js:14008-14041 placement
var MAX_CONCURRENT_FILE_READS = 8;
var MAX_FILE_READ_CHUNK_BYTES = 1048576;
var DARWIN_NOFOLLOW_FLAG = 536870912;
//@ chunk-gjx0rh1b.js:14041-17495 placement
/**
 * 读取变更文件内容（只接受 git 会写的路径、累计大小上限、硬链接/变化检测）。
 */
async function readChangedFilesForStash(workTree, n, r, o, s) {
  let found = r.find((R) => !isPlainRelativePath(R));
  if (found !== undefined)
    return {
      refused: `${found}: not a path git writes`,
      tooLarge: false,
      momentary: false,
    };
  let h = 0;
  let u = null;
  let p = missingGitattributesPaths(r);
  let w = new Set(r);
  let _ = limitConcurrency(MAX_CONCURRENT_FILE_READS, async (R) => {
    await s.beforeOpen?.(R);
    let B = false;
    let x = await lstatOrAbsent(workTree, R);
    if (x === "symlink")
      return {
        kind: "absent",
        path: R,
      };
    if (x === "unreadable")
      return {
        refused: `${R}: a directory above it could not be inspected`,
        tooLarge: false,
        momentary: true,
      };
    await s.beforeRead?.(R);
    let worktreeFile = await readWorktreeFileSafely(workTree, R, s.ntfsRules);
    let z = (worktreeFile) => compareFileIdentity(workTree, R, worktreeFile);
    switch (worktreeFile.kind) {
      case "absent":
        return {
          kind: "absent",
          path: R,
        };
      case "refused":
        return w.has(R)
          ? {
              refused: `${R}: ${worktreeFile.why}`,
              tooLarge: false,
              momentary: worktreeFile.momentary,
            }
          : {
              kind: "absent",
              path: R,
            };
      case "hardlinked":
        return {
          kind: "hardlinked",
          path: R,
        };
      case "moved":
        return {
          kind: "changed",
          path: R,
        };
      case "not_read":
        return (worktreeFile.why === "name_not_plain" || worktreeFile.why === "beyond_a_link") && !w.has(R)
          ? {
              kind: "absent",
              path: R,
            }
          : {
              kind: "not_read",
              path: R,
              why: worktreeFile.why,
            };
      case "symlink":
        return {
          kind: "symlink",
          path: R,
          target: worktreeFile.target,
        };
      case "file":
        try {
          h += worktreeFile.size;
          if (u === null || worktreeFile.size > u.size)
            u = {
              path: R,
              size: worktreeFile.size,
            };
          if (h > o)
            return {
              refused: `${u.path} (largest, ${u.size} bytes): ${h} bytes of changed files exceed the ${o}-byte cap`,
              tooLarge: true,
              momentary: false,
            };
          let L = join(n, R);
          await mkdir(dirname(L), {
            recursive: true,
          });
          let U;
          try {
            U = await open(
              L,
              constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | READ_LIMITS,
              worktreeFile.executable ? 493 : 420,
            );
          } catch (error) {
            if (getErrnoCode(error) === "EEXIST")
              return {
                refused: `${R}: collides with another changed path that differs only in case or normalization`,
                tooLarge: false,
                momentary: false,
              };
            throw error;
          }
          try {
            let stats = await worktreeFile.handle.stat({
              bigint: true,
            });
            if (
              s.notOlderThanNs !== undefined &&
              stats.ctimeNs >= s.notOlderThanNs &&
              stats.ctimeNs < (BigInt(Date.now()) + 1n) * 1000000n
            ) {
              await U.close();
              await unlink(L).catch(() => {});
              return {
                kind: "changed",
                path: R,
                sincePassStart: true,
              };
            }
            let hash = createHash("sha256");
            let X =
              s.objectFormat === undefined
                ? null
                : createHash(s.objectFormat).update(`blob ${stats.size}\x00`);
            let Te = 0;
            let le = false;
            let ve = Buffer.allocUnsafe(Math.min(worktreeFile.size, MAX_FILE_READ_CHUNK_BYTES));
            let ie = 0;
            while (ie < worktreeFile.size) {
              let { bytesRead } = await worktreeFile.handle.read(
                ve,
                0,
                Math.min(ve.length, worktreeFile.size - ie),
                ie,
              );
              if (bytesRead === 0) break;
              hash.update(ve.subarray(0, bytesRead));
              if (X !== null) {
                let chunk = ve.subarray(0, bytesRead);
                X.update(chunk);
                Te += countCrlf(chunk, le);
                le = chunk.at(-1) === 13;
              }
              let $e = 0;
              while ($e < bytesRead) {
                let { bytesWritten } = await U.write(ve, $e, bytesRead - $e);
                $e += bytesWritten;
              }
              ie += bytesRead;
            }
            await s.afterRead?.(R);
            let stats_2 = await worktreeFile.handle.stat({
              bigint: true,
            });
            let _e =
              s.objectFormat !== undefined && Te > 0 ? createLfBlobHasher(s.objectFormat, ie, Te) : null;
            if (
              BigInt(ie) !== stats.size ||
              stats_2.size !== stats.size ||
              stats_2.mtimeNs !== stats.mtimeNs ||
              stats_2.ctimeNs !== stats.ctimeNs ||
              !(await hashFileWithinLimit(worktreeFile.handle, ie, hash.digest(), _e?.update))
            ) {
              await U.close();
              await unlink(L).catch(() => {});
              return {
                kind: "changed",
                path: R,
              };
            }
            let Ce = await z(worktreeFile);
            if (Ce !== "same") {
              await U.close();
              await unlink(L).catch(() => {});
              return {
                kind: Ce,
                path: R,
              };
            }
            await U.utimes(worktreeFile.atime, worktreeFile.mtime);
            let filePath = await U.stat({
              bigint: true,
            });
            return {
              kind: "file",
              path: R,
              bytes: ie,
              copy: {
                ino: Number(filePath.ino),
                dev: Number(filePath.dev),
                ctimeNs: filePath.ctimeNs,
                size: Number(filePath.size),
                identity: getFileIdentity(filePath),
                ...(X !== null && {
                  blobId: X.digest("hex"),
                  ...(_e !== null && {
                    lfBlobId: _e.digest(),
                  }),
                }),
              },
            };
          } finally {
            await U.close().catch(() => {});
          }
        } catch (error) {
          let errnoCode = getErrnoCode(error);
          return {
            refused: `${R}: could not be staged (${errnoCode ?? errorMessage(error)})`,
            tooLarge: false,
            momentary: errnoCode === undefined || !TRANSIENT_STAT_ERRNOS.has(errnoCode),
          };
        } finally {
          await worktreeFile.handle.close();
        }
    }
  });
  let results = await Promise.all([...r, ...p].map(_));
  let found_2 = results.find((R) => "refused" in R);
  if (found_2 !== undefined)
    return found_2.tooLarge
      ? {
          ...found_2,
          claimedBytes: h,
        }
      : found_2;
  let filtered = results.filter((R) => !("refused" in R));
  let flattened = filtered.flatMap((R) => (R.kind === "not_read" ? [R.why] : []));
  return {
    entries: filtered.filter(
      (R) => w.has(R.path) || R.kind === "hardlinked" || R.kind === "changed" || R.kind === "not_read",
    ),
    copies: filtered.flatMap((R) =>
      R.kind === "file"
        ? [R]
        : isGitattributesPath(R.path)
          ? [
              {
                kind: "absent",
                path: R.path,
              },
            ]
          : [],
    ),
  };
}
//@ chunk-gjx0rh1b.js:17495-17950 placement
/**
 * 确认暂存副本在 git 读取期间未被改动（比较 inode、大小、ctime 等）。
 */
async function stagedCopiesUnchanged(e, copies) {
  return (
    await Promise.all(
      copies.map(async (o) => {
        if (o.kind === "absent")
          return lstat(join(e, o.path)).then(
            () => false,
            (error) => {
              let errnoCode = getErrnoCode(error);
              return errnoCode === "ENOENT" || errnoCode === "ENOTDIR";
            },
          );
        if (o.kind !== "file") return true;
        try {
          let filePath = await lstat(join(e, o.path), {
            bigint: true,
          });
          return (
            filePath.isFile() &&
            filePath.nlink === 1n &&
            Number(filePath.ino) === o.copy.ino &&
            Number(filePath.dev) === o.copy.dev &&
            getFileIdentity(filePath) === o.copy.identity &&
            filePath.ctimeNs === o.copy.ctimeNs &&
            Number(filePath.size) === o.copy.size
          );
        } catch {
          return false;
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
  let o = await lstat(join(e, n), {
    bigint: true,
  }).catch(() => null);
  if (o !== null && o.isFile() && o.nlink > 1n) return "hardlinked";
  return o === null || !o.isFile() || o.ino !== r.ino || o.dev !== r.dev ? "changed" : "same";
}
//@ chunk-gjx0rh1b.js:18228-18489 placement
async function hashFileWithinLimit(handle, n, r, update) {
  let hash = createHash("sha256");
  let l = Buffer.allocUnsafe(Math.min(n + 1, MAX_FILE_READ_CHUNK_BYTES));
  let h = 0;
  for (;;) {
    let { bytesRead } = await handle.read(l, 0, l.length, h);
    if (bytesRead === 0) break;
    hash.update(l.subarray(0, bytesRead));
    update?.(l.subarray(0, bytesRead));
    h += bytesRead;
    if (h > n) return false;
  }
  return h === n && hash.digest().equals(r);
}
//@ chunk-gjx0rh1b.js:18489-18816 placement
/**
 * 创建计算 blob 哈希的流式哈希器，把 CRLF 转为 LF 计算。
 */
function createLfBlobHasher(e, n, r) {
  let o = createHash(e).update(`blob ${n - r}\x00`);
  let s = false;
  return {
    update(l) {
      if (l.length === 0) return;
      if (s && l[0] !== 10) o.update(Buffer.from([13]));
      s = l.at(-1) === 13;
      let h = s ? l.subarray(0, l.length - 1) : l;
      o.update(
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
      if (s) o.update(Buffer.from([13]));
      return o.digest("hex");
    },
  };
}
//@ chunk-gjx0rh1b.js:18816-18961 placement
function isGitattributesPath(path) {
  let platform = getPlatform();
  let r = splitPathSegments(path).at(-1) ?? "";
  return platform === "macos" || platform === "windows" || platform === "wsl"
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
var TRANSIENT_STAT_ERRNOS = new Set(["ENAMETOOLONG", "ENOTDIR", "EISDIR", "EINVAL", "ELOOP"]);
//@ chunk-gjx0rh1b.js:19170-19186 placement
var BACKSLASH_BYTE = 92;
var SLASH_BYTE = 47;
//@ chunk-gjx0rh1b.js:19186-19267 placement
function normalizeSymlinkBytes(viaProcFd, n = getPlatform()) {
  return n === "windows"
    ? Buffer.from(viaProcFd.map((r) => (r === BACKSLASH_BYTE ? SLASH_BYTE : r)))
    : viaProcFd;
}
//@ chunk-gjx0rh1b.js:19267-19558 placement
async function openViaProcFd(e, n) {
  if (n !== "linux")
    return readlink(e, {
      encoding: "buffer",
    });
  let r = await open(dirname(e), O_NOFOLLOW_ANY | constants.O_DIRECTORY | READ_LIMITS);
  try {
    let o = `/proc/self/fd/${r.fd}`;
    let s = await readlink(o);
    return s === dirname(e)
      ? await readlink(join(o, basename(e)), {
          encoding: "buffer",
        })
      : s === `${dirname(e)} (deleted)`
        ? "moved"
        : "elsewhere";
  } finally {
    await r.close();
  }
}
//@ chunk-gjx0rh1b.js:19558-21423 placement
/**
 * 以不跟随链接方式读取工作树文件，检测被替换、硬链接、变化。
 */
async function readWorktreeFileSafely(e, n, r) {
  if (!isSafeRepoRelativePath(n, r))
    return {
      kind: "refused",
      why: "not a path git writes",
      momentary: false,
    };
  let o = join(e, n);
  let s = "linux";
  let l =
    constants.O_RDONLY |
    (s === "darwin" ? DARWIN_NOFOLLOW_FLAG : constants.O_NOFOLLOW) |
    (constants.O_NONBLOCK ?? 0) |
    (constants.O_NOCTTY ?? 0);
  let h;
  try {
    if (s === "win32") {
      let u = await lstat(o);
      if (u.isSymbolicLink())
        throw Object.assign(Error("symbolic link"), {
          code: "ELOOP",
        });
      if (!u.isFile())
        return {
          kind: "refused",
          why: "not a regular file",
          momentary: false,
        };
    }
    h = await open(o, s === "win32" ? "r" : l);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR")
      return {
        kind: "absent",
      };
    if (errnoCode === "ELOOP" || errnoCode === "EMLINK" || errnoCode === "EFTYPE")
      try {
        let viaProcFd = await openViaProcFd(o, s);
        if (viaProcFd === "moved")
          return {
            kind: "moved",
          };
        let E = await lstatOrAbsent(e, n);
        if (E === "symlink")
          return {
            kind: "absent",
          };
        if (E === "unreadable")
          return {
            kind: "refused",
            why: "a directory above it could not be inspected",
            momentary: true,
          };
        if (viaProcFd !== "elsewhere")
          return {
            kind: "symlink",
            target: normalizeSymlinkBytes(viaProcFd),
          };
        logEvent("tengu_upload_stage_link_read_elsewhere", {});
        return {
          kind: "refused",
          why: "resolved outside its directory",
          momentary: false,
        };
      } catch {
        return {
          kind: "refused",
          why: "changed while being read",
          momentary: true,
        };
      }
    let w = s === "win32" ? null : await lstat(o).catch(() => null);
    let _ = w !== null && !w.isFile() && !w.isSymbolicLink();
    return {
      kind: "refused",
      why: `could not be opened (${errnoCode ?? "unknown"})`,
      momentary: !_ && (errnoCode === undefined || !TRANSIENT_STAT_ERRNOS.has(errnoCode)),
    };
  }
  try {
    let stats = await h.stat({
      bigint: true,
    });
    if (!stats.isFile()) {
      await h.close();
      return {
        kind: "refused",
        why: "not a regular file",
        momentary: false,
      };
    }
    if (stats.nlink > 1n) {
      await h.close();
      return {
        kind: "hardlinked",
      };
    }
    if (s === "linux") {
      let p = await readlink(`/proc/self/fd/${h.fd}`);
      if (p !== o) {
        await h.close();
        return p === `${o} (deleted)` || dirname(p) === dirname(o)
          ? {
              kind: "moved",
            }
          : {
              kind: "refused",
              why: "resolved outside its directory",
              momentary: false,
            };
      }
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
    let errnoCode = getErrnoCode(error);
    return {
      kind: "refused",
      why: errorMessage(error),
      momentary: errnoCode === undefined || !TRANSIENT_STAT_ERRNOS.has(errnoCode),
    };
  }
}
//@ chunk-gjx0rh1b.js:21423-21498 placement
function splitPathSegments(e) {
  return (getPlatform() === "windows" ? e.replaceAll("\\", "/") : e).split("/");
}
//@ chunk-gjx0rh1b.js:21498-21724 placement
async function lstatOrAbsent(e, n) {
  let r = e;
  for (let o of splitPathSegments(n).slice(0, -1)) {
    r = join(r, o);
    try {
      if ((await lstat(r)).isSymbolicLink()) return "symlink";
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return "clear";
      return "unreadable";
    }
  }
  return "clear";
}
//@ chunk-gjx0rh1b.js:21724-22254 placement
/**
 * 安全地读取工作树内小文件（确认未被替换、无硬链接），计算它可能对应的 blob id 集合（含 CRLF、ident 变体）。
 */
async function readWorktreeBlobIds(workTree, relPath, oidLength, maxBytes, s) {
  if ((await lstatOrAbsent(workTree, relPath)) !== "clear") return null;
  let opened = await readWorktreeFileSafely(workTree, relPath, s);
  if (opened.kind !== "file") return null;
  try {
    if (opened.size > maxBytes) return null;
    let buffer = Buffer.alloc(opened.size + 1);
    let offset = 0;
    while (offset < buffer.length) {
      let { bytesRead } = await opened.handle.read(buffer, offset, buffer.length - offset, offset);
      if (bytesRead === 0) break;
      offset += bytesRead;
    }
    if (offset !== opened.size) return null;
    let p = await lstat(join(workTree, relPath), {
      bigint: true,
    }).catch(() => null);
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
function candidateBlobIds(e, oidLength) {
  let r = oidLength === 64 ? "sha256" : "sha1";
  let o = collapseIdentKeywords(e);
  return [e, ...(o === null ? [] : [o])].flatMap((s) => blobIdsForContent(s, r));
}
//@ chunk-gjx0rh1b.js:22359-22575 placement
function blobIdsForContent(e, n) {
  let r = createHash(n).update(`blob ${e.length}\x00`).update(e).digest("hex");
  let o = countCrlf(e, false);
  if (o === 0) return [r];
  let lfBlobHasher = createLfBlobHasher(n, e.length, o);
  for (let l = 0; l < e.length; l += MAX_FILE_READ_CHUNK_BYTES)
    lfBlobHasher.update(e.subarray(l, l + MAX_FILE_READ_CHUNK_BYTES));
  return [r, lfBlobHasher.digest()];
}
//@ chunk-gjx0rh1b.js:22575-22631 placement
var DOLLAR_CHAR_CODE = 36;
var buffer_3 = Buffer.from("$Id:");
var buffer_4 = Buffer.from("$Id$");
//@ chunk-gjx0rh1b.js:22631-23004 placement
/**
 * 把展开的 $Id$ 关键字还原为未展开形式，无变化返回 null。
 */
function collapseIdentKeywords(e) {
  let index = e.indexOf(buffer_3);
  if (index === -1) return null;
  let r = Buffer.allocUnsafe(e.length);
  let o = e.copy(r, 0, 0, index);
  let s = index;
  while (s < e.length) {
    let l = -1;
    if (
      e[s] === DOLLAR_CHAR_CODE &&
      e[s + 1] === buffer_3[1] &&
      e[s + 2] === buffer_3[2] &&
      e[s + 3] === buffer_3[3]
    ) {
      let h = s + buffer_3.length;
      while (h < e.length && e[h] !== DOLLAR_CHAR_CODE && e[h] !== 10) h++;
      l = e[h] === DOLLAR_CHAR_CODE ? h : -1;
    }
    if (l === -1) r[o++] = e[s++];
    else {
      o += buffer_4.copy(r, o);
      s = l + 1;
    }
  }
  return o === e.length ? null : r.subarray(0, o);
}
//@ chunk-gjx0rh1b.js:23004-23138 placement
function countCrlf(e, n) {
  let r = n && e[0] === 10 ? 1 : 0;
  if (!e.includes(13)) return r;
  for (let idx = 1; idx < e.length; idx++) if (e[idx] === 10 && e[idx - 1] === 13) r++;
  return r;
}
//@ chunk-gjx0rh1b.js:23576-23731 placement
var SEED_READ_PROBLEMS = {
  failed: "unreadable",
};
var TREE_READ_TAMPERED = {
  failed: "tampered",
};
var TREE_READ_MISSING = {
  failed: "missing",
};
var MAX_OBJECT_BYTES = 67108864;
var MAX_OBJECT_ENTRIES = 4000000;
var KNOWN_TREE_MODES = new Set(["100644", "100755", "120000", "40000", "160000"]);
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
var TREE_MODE = "40000";
var GITLINK_MODE_2 = "160000";
var SYMLINK_MODE = "120000";
var padFileMode = (mode) => mode.padStart(6, "0");
var entryKindForMode = (mode) =>
  mode === GITLINK_MODE_2 ? "gitlink" : mode === SYMLINK_MODE ? "link" : "file";
//@ chunk-gjx0rh1b.js:23976-24497 placement
function batchCatFile(e, n) {
  return async (r) => {
    let o = null;
    try {
      o = await mkdtemp(join(n, "claude-seed-reads-"));
      let s = await open(
        join(o, "batch"),
        constants.O_RDWR | constants.O_CREAT | constants.O_EXCL | READ_LIMITS,
        384,
      );
      try {
        let l = await e(["cat-file", "--batch"], undefined, r, undefined, s.fd);
        let { size } = await s.stat();
        if (l.code !== 0 || size > MAX_OBJECT_BYTES) return null;
        let u = Buffer.alloc(size);
        for (let p = 0; p < size;) {
          let { bytesRead } = await s.read(u, p, size - p, p);
          if (bytesRead === 0) return null;
          p += bytesRead;
        }
        return u;
      } finally {
        await s.close().catch(() => {});
      }
    } catch {
      return null;
    } finally {
      if (o !== null)
        await rm(o, {
          recursive: true,
          force: true,
        }).catch(() => {});
    }
  };
}
//@ chunk-gjx0rh1b.js:24497-26246 placement
/**
 * 通过 git cat-file 批量读取对象，校验 sha1/sha256 哈希。
 */
class GitObjectReader {
  fetch;
  listings = new Map();
  bodies = new Map();
  algorithm;
  idLength;
  constructor(e, n) {
    this.fetch = e;
    this.algorithm = n.length === 64 ? "sha256" : "sha1";
    this.idLength = n.length;
  }
  hashes(e, n, r) {
    return createHash(this.algorithm).update(`${e} ${n.length}\x00`).update(n).digest("hex") === r;
  }
  async trees(e) {
    let n = uniq(e.filter((o) => !this.listings.has(o)));
    if (n.length === 0) return true;
    let r = await this.read("tree", n);
    if (isTreeReadFailure(r)) return r;
    for (let [o, s] of r) {
      let treeEntries = parseTreeEntries(s, this.idLength / 2);
      if (treeEntries === null) return TREE_READ_TAMPERED;
      if (treeEntries === "malformed")
        return {
          failed: "malformed",
          tree: o,
        };
      this.listings.set(o, treeEntries);
    }
    return true;
  }
  listing(e) {
    return this.listings.get(e);
  }
  async commit(e) {
    let n = await this.commits([e]);
    return isTreeReadFailure(n) ? n : n.get(e);
  }
  async commits(e) {
    let n = uniq([...e]);
    let r = n.length === 0 ? new Map() : await this.read("commit", n);
    if (isTreeReadFailure(r)) return r;
    let o = new Map();
    for (let [s, l] of r) {
      let lines = l
        .subarray(
          0,
          Math.max(
            0,
            l.indexOf(`

`),
          ),
        )
        .toString("latin1").split(`
`);
      let u = /^tree ([0-9a-f]{40,64})$/.exec(lines[0] ?? "")?.[1];
      let p = [];
      for (let line of lines.slice(1)) {
        let _ = /^parent ([0-9a-f]{40,64})$/.exec(line)?.[1];
        if (_ === undefined) break;
        p.push(_);
      }
      if (u === undefined || [u, ...p].some((w) => w.length !== this.idLength)) return TREE_READ_TAMPERED;
      o.set(s, {
        tree: u,
        parents: p,
      });
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
    let o = new Map();
    let s = 0;
    for (let l of n) {
      let index = response.indexOf(10, s);
      if (index === -1) return SEED_READ_PROBLEMS;
      let str = response.subarray(s, index).toString("latin1");
      if (str === `${l} missing`) return TREE_READ_MISSING;
      let match = /^([0-9a-f]{40,64}) (\w+) (\d+)$/.exec(str);
      if (match === null || match[1] !== l) return SEED_READ_PROBLEMS;
      if (match[2] !== e) return TREE_READ_TAMPERED;
      let w = Number(match[3]);
      let buffer = Buffer.from(response.subarray(index + 1, index + 1 + w));
      if (buffer.length !== w) return SEED_READ_PROBLEMS;
      if (!this.hashes(e, buffer, l)) return TREE_READ_TAMPERED;
      if (e !== "blob") this.bodies.set(l, buffer);
      o.set(l, buffer);
      s = index + 1 + w + 1;
    }
    return o;
  }
}
//@ chunk-gjx0rh1b.js:26246-26718 placement
function parseTreeEntries(e, n) {
  let r = new Map();
  let o = 0;
  let s = null;
  let l = false;
  while (o < e.length) {
    let index = e.indexOf(32, o);
    let u = index === -1 ? -1 : e.indexOf(0, index + 1);
    if (index === -1 || u === -1 || u + 1 + n > e.length) return null;
    let chunk = e.subarray(index + 1, u);
    let str = e.subarray(o, index).toString("latin1");
    if (!isOctalNumber(str)) return null;
    let _ = GIT_FILE_MODES(str);
    let y = {
      name: chunk,
      isTree: _ === TREE_MODE,
    };
    let str_2 = chunk.toString("latin1");
    if (!isValidTreeEntryName(chunk) || r.has(str_2)) return null;
    if (!KNOWN_TREE_MODES.has(_) || (s !== null && compareTreeEntries(s, y) >= 0)) l = true;
    s = y;
    r.set(str_2, {
      mode: _,
      id: e.subarray(u + 1, u + 1 + n).toString("hex"),
    });
    o = u + 1 + n;
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
  let min = Math.min(e.name.length, n.name.length);
  let o = e.name.subarray(0, min).compare(n.name.subarray(0, min));
  if (o !== 0) return o;
  let s = (l) => (l.name.length > min ? l.name[min] : l.isTree ? 47 : 0);
  return s(e) - s(n);
}
//@ chunk-gjx0rh1b.js:27035-27075 placement
function isOctalNumber(e) {
  return /^[0-7]+$/.test(e);
}
//@ chunk-gjx0rh1b.js:27075-27328 placement
function GIT_FILE_MODES(e) {
  let n = isOctalNumber(e)
    ? Array.from(e.slice(-11)).reduce((acc, o) => ((acc << 3) | Number(o)) >>> 0, 0)
    : 0;
  switch (n & 61440) {
    case 32768:
      return n & 64 ? "100755" : "100644";
    case 40960:
      return "120000";
    case 16384:
      return TREE_MODE;
    case 57344:
      return GITLINK_MODE_2;
    default:
      return e.replace(/^0+/, "");
  }
}
//@ chunk-gjx0rh1b.js:27328-28517 placement
async function parseIndexEntries(reader, n, r) {
  let o = "0".repeat(reader.idLength);
  let s = [];
  let l =
    n === r
      ? []
      : [
          {
            prefix: Buffer.alloc(0),
            base: n,
            other: r,
          },
        ];
  let h = 0;
  while (l.length > 0) {
    let filtered = l.flatMap(({ base, other }) => [base, other]).filter((_) => _ !== null);
    let p = await reader.trees(filtered);
    if (p !== true) {
      if (p.failed !== "malformed") return p;
      let found = l.find(({ base, other }) => base === p.tree || other === p.tree);
      return found === undefined
        ? p
        : {
            ...p,
            dir: found.prefix.toString("utf8").replace(/\/$/, ""),
          };
    }
    let w = [];
    for (let { prefix, base, other } of l) {
      let C = base === null ? new Map() : reader.listing(base);
      let A = other === null ? new Map() : reader.listing(other);
      let sorted = uniq([...C.keys(), ...A.keys()]).sort();
      h += sorted.length;
      if (h > MAX_OBJECT_ENTRIES) return TREE_READ_TAMPERED;
      for (let B of sorted) {
        let x = C.get(B);
        let S = A.get(B);
        if (x !== undefined && S !== undefined && x.id === S.id && x.mode === S.mode) continue;
        let buffer = Buffer.concat([prefix, Buffer.from(B, "latin1")]);
        let Y = x?.mode === TREE_MODE;
        let L = S?.mode === TREE_MODE;
        if (Y || L)
          w.push({
            prefix: Buffer.concat([buffer, Buffer.from("/")]),
            base: Y ? x.id : null,
            other: L ? S.id : null,
          });
        let U = x !== undefined && !Y ? x : undefined;
        let D = S !== undefined && !L ? S : undefined;
        if (U === undefined && D === undefined) continue;
        s.push({
          path: buffer.toString("utf8"),
          pathBytes: buffer,
          status:
            U === undefined
              ? "A"
              : D === undefined
                ? "D"
                : entryKindForMode(U.mode) !== entryKindForMode(D.mode)
                  ? "T"
                  : "M",
          oldMode: U === undefined ? "000000" : padFileMode(U.mode),
          newMode: D === undefined ? "000000" : padFileMode(D.mode),
          oldId: U?.id ?? o,
          newId: D?.id ?? o,
        });
      }
    }
    l = w;
  }
  return s;
}
//@ chunk-gjx0rh1b.js:28517-29099 placement
/**
 * 在 git 树中按路径逐段下钻，批量读取树对象，解析出给定路径对应的 blob/树 id 与模式。
 */
async function resolveTreePaths(reader, rootTree, paths) {
  let o = new Map();
  let s = await reader.trees([rootTree]);
  if (s !== true) return s;
  let mapped = paths.map((path) => ({
    name: path,
    segments: path.split("/"),
    at: 0,
    tree: rootTree,
  }));
  while (mapped.length > 0) {
    let h = await reader.trees(mapped.map(({ tree }) => tree));
    if (h !== true) return h;
    let u = [];
    let p = [];
    for (let w of mapped) {
      let _ = reader.listing(w.tree)?.get(Buffer.from(w.segments[w.at], "utf8").toString("latin1"));
      if (_ === undefined) continue;
      let y = w.at === w.segments.length - 1;
      if (_.mode === TREE_MODE) {
        if (y) p.push(_.id);
        else
          u.push({
            ...w,
            at: w.at + 1,
            tree: _.id,
          });
      } else if (y)
        o.set(w.name, {
          id: _.id,
          mode: _.mode,
        });
    }
    if (p.length > 0) {
      let w = await reader.trees(p);
      if (w !== true) return w;
    }
    mapped = u;
  }
  return o;
}
//@ chunk-gjx0rh1b.js:29099-29147 placement
var BOM_BYTES = {
  latin1: "\xEF\xBB\xBF",
  utf8: "\uFEFF",
};
var pendingFilterCheck;
//@ chunk-gjx0rh1b.js:29147-29612 placement
function writeProbeBlob(e, n) {
  let r = (pendingFilterCheck ??= (async () => {
    let buffer = Buffer.from([65, 233, 128, 255, 195, 40, 66]);
    let s = await e(["hash-object", "-w", "--stdin"], n, buffer);
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
    if (pendingFilterCheck === r) pendingFilterCheck = undefined;
    return "utf8";
  });
}
//@ chunk-gjx0rh1b.js:29612-29626 placement
var deflateAsync = promisify(deflate);
//@ chunk-gjx0rh1b.js:29626-29676 placement
var FILTER_ATTRIBUTES = ["filter", "working-tree-encoding", "ident"];
//@ chunk-gjx0rh1b.js:29676-31456 placement
/**
 * 用 read-tree/ls-files 读取指定路径在 HEAD 中的条目（老版本 git 兼容）。
 */
async function readTreeForPaths(e, n, r, o, s) {
  if (n.length === 0) return [];
  let l = new Set(n.filter((E) => r.get(E) === null));
  let h = (E) => [E, ...(r.get(E) ?? [])];
  let u = (E) =>
    h(E).flatMap((C) => (s.normalizationBlind ? uniq([C, C.normalize("NFC"), C.normalize("NFD")]) : [C]));
  let p = uniq(n.flatMap(u));
  if (o?.prepareIndexAndStore !== undefined) {
    let E = await o.prepareIndexAndStore(p, o);
    if (E !== true) return E;
  } else if (o !== null) {
    if (
      (
        await e(["-c", "core.splitIndex=false", "read-tree", o.commit ?? o.tree], {
          GIT_INDEX_FILE: o.indexPath,
        })
      ).code !== 0
    )
      return null;
    await mkdir(o.objectsDir, {
      recursive: true,
      mode: 448,
    });
    let C = {
      GIT_INDEX_FILE: o.indexPath,
      GIT_OBJECT_DIRECTORY: o.objectsDir,
      GIT_ALTERNATE_OBJECT_DIRECTORIES: "",
    };
    let A = await writeProbeBlob(e, C);
    let gitattributesForPaths = await readGitattributesForPaths(
      e,
      o,
      o.indexPath,
      p,
      A,
      o.refusesGitlinkedRules === true,
    );
    if (
      gitattributesForPaths === null ||
      gitattributesForPaths === "old_git" ||
      gitattributesForPaths === "tampered"
    )
      return gitattributesForPaths;
    for (let { name: B, id, text, markStripped } of gitattributesForPaths.blobs) {
      let Y = await e(["hash-object", "-w", "--stdin"], C, Buffer.from(text, A));
      let trimmed = Y.stdout.trim();
      if (Y.code !== 0 || (trimmed !== id && !markStripped)) return null;
      if (trimmed !== id) {
        let U = await e(["hash-object", "-w", "--stdin"], C, Buffer.from(BOM_BYTES[A] + text, A));
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
      ...FILTER_ATTRIBUTES,
    ],
    o === null
      ? undefined
      : {
          GIT_INDEX_FILE: o.indexPath,
          GIT_OBJECT_DIRECTORY: o.objectsDir,
          GIT_ALTERNATE_OBJECT_DIRECTORIES: "",
        },
    p.map((E) => `${E}\x00`).join(""),
  );
  if (w.maxBufferExceeded) return "overflow";
  if (w.code !== 0) return null;
  let parts = w.stdout.split("\x00");
  let y = new Set();
  for (let E = 0; E + 2 < parts.length; E += 3) {
    let [C, A] = [parts[E + 1], parts[E + 2]];
    if (!(A === "unspecified" || A === "unset" || (C === "ident" && A === "false"))) y.add(parts[E]);
  }
  return n.filter((E) => l.has(E) || u(E).some((C) => y.has(C)));
}
//@ chunk-gjx0rh1b.js:31456-33266 placement
/**
 * 读取影响变更路径的 .gitattributes（检测篡改、子模块）。
 */
async function readGitattributesForPaths(e, n, indexPath, o, s, l) {
  let h = uniq([
    ...missingGitattributesPaths(o),
    ...o.filter((B) => B.split("/").at(-1) === ".gitattributes"),
  ]);
  let u = await listIndexEntriesNamed(e, indexPath, new Set(h), dirname(indexPath));
  if (u === null) return null;
  let p =
    n.commit !== undefined ? await readCommitTree(e, n.commit, h, s) : await buildTreeObject(e, n.tree, h);
  if (p === null || p === "tampered") return p;
  if (l && [...p.values()].some(({ mode }) => mode === "160000")) return null;
  let w = (B) => {
    let x = p.get(B);
    let S = u.get(B);
    return x === undefined
      ? S === undefined
      : S !== undefined && splitArgsIntoSlices(S) && S.id === x.id && GIT_FILE_MODES(S.mode) === x.mode;
  };
  if (h.some((B) => !w(B))) return "tampered";
  let _ = [...p];
  let reduced = await chunkArgsByBytes(_.map(([B]) => `:0:${B}`)).reduce(async (acc, x) => {
    let S = await acc;
    if (S === "tampered" || S === null) return S;
    let z = await e(["-c", "core.precomposeUnicode=false", "rev-parse", ...x], {
      GIT_INDEX_FILE: indexPath,
    });
    return z.code === 0
      ? [
          ...S,
          ...z.stdout
            .split(
              `
`,
            )
            .filter((line) => line !== ""),
        ]
      : z.exitCode === 128
        ? "tampered"
        : null;
  }, Promise.resolve([]));
  if (reduced === null) return null;
  if (reduced === "tampered" || reduced.length !== _.length || _.some(([, B], x) => reduced[x] !== B.id))
    return "tampered";
  let E;
  let C = new Map();
  let A = async (B) => {
    let x = C.get(B);
    if (x !== undefined) return x;
    let S = await e(
      ["cat-file", "--batch"],
      undefined,
      `${B}
`,
      s === "latin1" ? "latin1" : undefined,
    );
    let index = S.stdout.indexOf(`
`);
    let Y = index === -1 ? S.stdout : S.stdout.slice(0, index);
    let L = index === -1 ? "" : S.stdout.slice(index + 1);
    let U = B.length === 64 ? "sha256" : "sha1";
    let D =
      S.code !== 0
        ? null
        : !new RegExp(`^${B} blob [0-9]+$`).test(Y)
          ? /^[0-9a-f]{40,64} [a-z]+ [0-9]+$/.test(Y)
            ? "tampered"
            : null
          : ([L, `${L}\r`].find((pe) => {
              let buffer = Buffer.from(pe, s);
              return createHash(U).update(`blob ${buffer.length}\x00`).update(buffer).digest("hex") === B;
            }) ?? (s === "latin1" ? "tampered" : null));
    C.set(B, D);
    return D;
  };
  let R = [];
  for (let [B, { id: x, mode: S }] of p) {
    let z = await A(x);
    if (z === "tampered") return "tampered";
    let Y = z === null ? null : decodeGitattributesBlob(z, S, s);
    if (Y === null) return null;
    if (Y.isLink) {
      E ??= supportsGit232(e);
      if (!(await E)) return "old_git";
    }
    if (Y.text === null) return null;
    R.push({
      name: B,
      id: x,
      text: Y.text,
      markStripped: Y.markStripped,
    });
  }
  return {
    blobs: R,
  };
}
//@ chunk-gjx0rh1b.js:33266-33607 placement
/**
 * 按 git 模式解码 gitattributes 内容：符号链接、去 BOM 与非法输入判断。
 */
function decodeGitattributesBlob(e, n, r) {
  if (e.includes("\x00")) return null;
  if (n !== "100644" && n !== "100755" && n !== "120000") return null;
  let o = e.startsWith(BOM_BYTES[r]);
  if (n === "120000")
    return {
      isLink: true,
      text: o ? null : e,
      markStripped: false,
    };
  if (!o)
    return {
      isLink: false,
      text: e,
      markStripped: false,
    };
  let sliced = e.slice(BOM_BYTES[r].length);
  return sliced.startsWith(BOM_BYTES[r])
    ? null
    : {
        isLink: false,
        text: sliced,
        markStripped: true,
      };
}
//@ chunk-gjx0rh1b.js:33607-34032 placement
/**
 * 解码 git 加引号的路径（处理八进制与转义字符）。
 */
function unquoteGitPath(e) {
  if (!(e.startsWith('"') && e.endsWith('"'))) return Buffer.from(e, "utf8");
  let n = {
    a: 7,
    b: 8,
    t: 9,
    n: 10,
    v: 11,
    f: 12,
    r: 13,
    "\\": 92,
    '"': 34,
  };
  let sliced = e.slice(1, -1);
  let o = [];
  for (let s = 0; s < sliced.length; s += 1) {
    let l = sliced[s] ?? "";
    if (l !== "\\") {
      o.push(...Buffer.from(l, "utf8"));
      continue;
    }
    let h = sliced[s + 1] ?? "";
    if (/^[0-3][0-7]{2}$/.test(sliced.slice(s + 1, s + 4))) {
      o.push(parseInt(sliced.slice(s + 1, s + 4), 8));
      s += 3;
    } else {
      o.push(n[h] ?? h.charCodeAt(0));
      s += 1;
    }
  }
  return Buffer.from(o);
}
//@ chunk-gjx0rh1b.js:34032-34167 placement
async function supportsGit232(e) {
  let n = await e(["version"]);
  let r = n.code === 0 ? parseGitVersion(n.stdout) : null;
  return r !== null && (r.major > 2 || (r.major === 2 && r.minor >= 32));
}
//@ chunk-gjx0rh1b.js:34167-34774 placement
/**
 * 读取 commit 对象并校验其哈希，判定是否被篡改。
 */
async function readObjectForTree(runGit, oid, r) {
  let o = r ?? (await writeProbeBlob(runGit, {}));
  let s = oid.length === 64 ? "sha256" : "sha1";
  let l = (_, y, E) => createHash(s).update(`${_} ${y.length}\x00`).update(y).digest("hex") === E;
  let h = await runGit(
    ["cat-file", "--batch"],
    undefined,
    `${oid}
`,
    o === "latin1" ? "latin1" : undefined,
  );
  if (h.code !== 0) return null;
  let index = h.stdout.indexOf(`
`);
  let p = index === -1 ? "" : h.stdout.slice(index + 1);
  if (!h.stdout.startsWith(`${oid} commit `))
    return /^[0-9a-f]{40,64} [a-z]+ /.test(h.stdout) ? "tampered" : null;
  if (![p, `${p}\r`].some((_) => l("commit", Buffer.from(_, o), oid)))
    return o === "latin1" ? "tampered" : null;
  let w = /^tree ([0-9a-f]{40,64})\n/.exec(p)?.[1];
  if (w === undefined) return "tampered";
  return w;
}
//@ chunk-gjx0rh1b.js:34774-34884 placement
async function readCommitTree(runGit, commit, r, o = "utf8") {
  let objectForTree = await readObjectForTree(runGit, commit, o);
  if (objectForTree === null || objectForTree === "tampered") return objectForTree;
  return buildTreeObject(runGit, objectForTree, r);
}
//@ chunk-gjx0rh1b.js:34884-34905 placement
var YIELD_EVERY_OBJECTS = 512;
var YIELD_EVERY_BYTES = 262144;
//@ chunk-gjx0rh1b.js:34905-36996 placement
async function verifyObjectsByHash(e, n) {
  let r = n.length === 64 ? "sha256" : "sha1";
  let o = (w, _, y) => createHash(r).update(`${w} ${_.length}\x00`).update(_).digest("hex") === y;
  let s = new Map();
  let l = (w) => {
    if (!w.every(({ nameBytes }) => isValidTreeEntryName(nameBytes))) return null;
    let _ = new Map(
      w.map(({ nameBytes, mode, id }) => [
        nameBytes.toString("latin1"),
        {
          mode,
          id,
        },
      ]),
    );
    return _.size === w.length ? _ : null;
  };
  let h = (await writeProbeBlob(e, {})) === "latin1";
  let listingsOf = async (w) => {
    let _ = uniq(w.filter((B) => !s.has(B)));
    if (_.length === 0) return true;
    if (!h) {
      for (let B of _) {
        let x = await p(B);
        if (x === null || x === "tampered") return x;
      }
      return true;
    }
    let y = await e(
      ["cat-file", "--batch"],
      undefined,
      [..._, _[0]]
        .map(
          (B) => `${B}
`,
        )
        .join(""),
      "latin1",
    );
    if (y.code !== 0) return null;
    let buffer = Buffer.from(y.stdout, "latin1");
    let C = n.length / 2;
    let A = 0;
    let R = 0;
    for (let [B, x] of _.entries()) {
      if ((B > 0 && B % YIELD_EVERY_OBJECTS === 0) || R >= YIELD_EVERY_BYTES) {
        await yieldToEventLoop();
        R = 0;
      }
      let index = buffer.indexOf(10, A);
      if (index === -1) return null;
      let str = buffer.subarray(A, index).toString("latin1");
      let match = /^([0-9a-f]{40,64}) tree (\d+)$/.exec(str);
      if (match === null || match[1] !== x)
        return /^[0-9a-f]{40,64} [a-z]+ \d+$/.test(str) ? "tampered" : null;
      let L = Number(match[2]);
      R += L;
      let chunk = buffer.subarray(index + 1, index + 1 + L);
      if (chunk.length !== L) return null;
      if (!o("tree", chunk, x)) return "tampered";
      A = index + 1 + L + 1;
      let D = [];
      let pe = 0;
      while (pe < chunk.length) {
        let index = chunk.indexOf(32, pe);
        let index_2 = chunk.indexOf(0, index + 1);
        if (index === -1 || index_2 === -1 || index_2 + 1 + C > chunk.length) return "tampered";
        let str = chunk.subarray(pe, index).toString("latin1");
        if (!isOctalNumber(str)) return "tampered";
        D.push({
          mode: GIT_FILE_MODES(str),
          nameBytes: Buffer.from(chunk.subarray(index + 1, index_2)),
          id: chunk.subarray(index_2 + 1, index_2 + 1 + C).toString("hex"),
        });
        pe = index_2 + 1 + C;
      }
      let X = l(D);
      if (X === null) return "tampered";
      s.set(x, X);
    }
    return true;
  };
  let p = async (w) => {
    let _ = s.get(w);
    if (_ !== undefined) return _;
    let y = await e(["-c", "core.quotePath=true", "ls-tree", w]);
    if (y.code !== 0) return null;
    let mapped = y.stdout
      .split(
        `
`,
      )
      .filter((line) => line !== "")
      .map((line) => {
        let index = line.indexOf("\t");
        let [x, , S] = line.slice(0, index).split(" ");
        let nameBytes = unquoteGitPath(line.slice(index + 1));
        return {
          mode: (x ?? "").replace(/^0+/, ""),
          id: S ?? "",
          nameBytes,
        };
      });
    let buffer = Buffer.concat(
      mapped.map(({ mode, id, nameBytes }) =>
        Buffer.concat([Buffer.from(`${mode} `, "utf8"), nameBytes, Buffer.from([0]), Buffer.from(id, "hex")]),
      ),
    );
    if (!o("tree", buffer, w)) return null;
    let A = l(mapped);
    if (A === null) return "tampered";
    s.set(w, A);
    return A;
  };
  return {
    listingsOf,
    listing: (w) => s.get(w),
    readsManyTreesInOneRun: h,
  };
}
//@ chunk-gjx0rh1b.js:36996-37651 placement
async function buildTreeObject(e, n, r) {
  let { listingsOf, listing } = await verifyObjectsByHash(e, n);
  let l = new Map();
  let h = await listingsOf([n]);
  if (h !== true) return h;
  let mapped = r.map((p) => ({
    name: p,
    segments: p.split("/"),
    at: 0,
    tree: n,
  }));
  while (mapped.length > 0) {
    let p = await listingsOf(mapped.map(({ tree }) => tree));
    if (p !== true) return p;
    let w = [];
    let _ = [];
    for (let y of mapped) {
      let E = listing(y.tree);
      if (E === undefined) return null;
      let C = y.segments[y.at];
      let A = E.get(Buffer.from(C, "utf8").toString("latin1"));
      if (A === undefined) continue;
      let R = y.at === y.segments.length - 1;
      if (R && A.mode !== "40000")
        l.set(y.name, {
          id: A.id,
          mode: A.mode,
        });
      else if (A.mode === "40000")
        if (!R)
          w.push({
            ...y,
            at: y.at + 1,
            tree: A.id,
          });
        else _.push(A.id);
    }
    if (_.length > 0) {
      let y = await listingsOf(_);
      if (y !== true) return y;
    }
    mapped = w;
  }
  return l;
}
//@ chunk-gjx0rh1b.js:37651-38108 placement
/**
 * diff --raw 行格式正则及 git 文件模式、空 blob id、上限等常量。
 */
var DIFF_RAW_LINE_RE =
  /^:([0-7]{6}) ([0-7]{6}) ([0-9a-f]{40}(?:[0-9a-f]{24})?) ([0-9a-f]{40}(?:[0-9a-f]{24})?) ([A-Z])[0-9]*$/;
var REGULAR_FILE_MODES = ["100644", "100755"];
var GITLINK_MODE_VALUE = "160000";
var SYMLINK_MODE_VALUE = "120000";
var EMPTY_BLOB_IDS = {
  sha1: "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391",
  sha256: "473a0f4c3be8a93681a267e3b1e9a7dcda1185436fe141f7749120a303721813",
};
var ZERO_OID_RE = /^0+$/;
var MAX_INFO_ATTRIBUTES_BYTES = 65536;
var GIT_READ_CONCURRENCY = 8;
var GIT_SIGPIPE_EXIT_CODE = 129;
var TREE_READBACK_MISMATCH = "the trees just built could not be read back as what their ids name";
var COMMIT_READBACK_MISMATCH = "a commit just made could not be read back as what its id names";
//@ chunk-gjx0rh1b.js:38108-38196 placement
function blobSha1(e) {
  return createHash("sha1").update(`blob ${e.length}\x00`).update(e).digest("hex");
}
//@ chunk-gjx0rh1b.js:38196-38421 placement
var MAX_STASH_FILE_BYTES = 1048576;
var MAX_COMPARE_BYTES = 67108864;
var MAX_STASH_BYTES = 536870912;
var STASH_IDENTITY_ENV = {
  GIT_AUTHOR_NAME: "git stash",
  GIT_AUTHOR_EMAIL: "git@stash",
  GIT_COMMITTER_NAME: "git stash",
  GIT_COMMITTER_EMAIL: "git@stash",
};
var withLongPathsGit =
  (hardenedGitRunner) =>
  (n, ...r) =>
    hardenedGitRunner(["-c", "core.longpaths=true", ...n], ...r);
//@ chunk-gjx0rh1b.js:38421-54648 placement
/**
 * 捕获未提交修改为 stash 提交：读索引与工作树、处理 Windows 不能保存的名字、构造种子引用（约 16 KB）。
 */
async function captureWipStash(e, layout, r = {}) {
  let o = r.probes ?? currentGitBinaryState();
  let hardenedGitRunner = createHardenedGitRunner(e, layout, r.signal, undefined, o);
  let l = (ee, De, ce, Fe, St) =>
    hardenedGitRunner(
      De?.GIT_INDEX_FILE === undefined ? [...ee] : ["-c", "core.splitIndex=false", ...ee],
      De,
      ce,
      Fe,
      St,
    );
  let h = (ee) => (r.neverRead ?? r.alsoLeaveOut)?.(ee) ?? false;
  let filtered = uniq([toPosixSpelling(e), layout.workTree]).filter((ee) =>
    CREDENTIAL_CONFIG_PATHS.some(([, De]) => isCredentialConfigPathActive(`${ee}/${De}`)),
  );
  let p = (ee) => filtered.some((De) => isCredentialConfigPathActive(`${De}/${ee}`));
  let w = (ee) => isSensitiveNameOrVariant(ee) || p(ee) || (r.alsoLeaveOut?.(ee) ?? false);
  let headState = await resolveHeadState(l, layout.adminDir ?? resolveTempDir());
  if (headState.kind !== "inspected") return headState;
  let { gitDir, workTree } = layout;
  let { base, baseTree, iTree, reader, namesWindowsCannotHold } = headState.inspection;
  if (namesWindowsCannotHold > 0) {
    logForDebugging(
      `[wipStash] tracked names that Windows cannot hold, listed as deleted and passed over: ${namesWindowsCannotHold}`,
    );
    r.onNamesWindowsCannotHold?.(namesWindowsCannotHold);
  }
  let S =
    (layout.bound === true && getPlatform() === "wsl") ||
    (await isCaseFoldingFileSystem(workTree)) ||
    (await isCaseFoldingFileSystem(layout.adminDir ?? resolveTempDir()));
  let suspiciousChangedPaths = findSuspiciousChangedPaths(headState.inspection, S);
  if (suspiciousChangedPaths.length > 0)
    return {
      kind: "refused",
      refused: suspiciousChangedPaths,
      decidedOn: "listing",
    };
  let Y = r.leaveOutUncommittedCredentialFiles
    ? await classifyIndexEntry(workTree, headState.inspection, w, S, h)
    : [];
  let L = new Set(Y.map(({ path }) => path));
  let U = new Set(headState.inspection.staged.map(({ path }) => path));
  let D = new Set(headState.inspection.staged.flatMap(({ path, status }) => (status === "D" ? [path] : [])));
  let now = Date.now();
  let X = limitConcurrency(GIT_READ_CONCURRENCY, (ee) =>
    r.signal?.aborted === true || L.has(ee.path) || U.has(ee.path)
      ? Promise.resolve("changed")
      : compareWorktreeEntry(workTree, ee, S, MAX_COMPARE_BYTES, r.signal),
  );
  let results = await Promise.all(headState.inspection.working.map(X));
  let filtered_2 = headState.inspection.working.filter((ee, De) => results[De] !== "unchanged");
  let ve = count(results, (ee) => ee === "open_refused");
  if (ve > 0) r.onOpenRefusedAtTheLook?.(ve);
  let ie = headState.inspection.working.length - filtered_2.length;
  if (ie > 0)
    logForDebugging(
      `[wipStash] ${ie} of ${headState.inspection.working.length} stat-dirty tracked files were unchanged (${Date.now() - now}ms)`,
    );
  if (filtered_2.length === 0 && iTree === baseTree)
    return {
      kind: "none",
      leftOut: Y,
    };
  await pruneStaleSeedIndexes(gitDir);
  if (layout.adminDir === undefined) await pruneStaleProcessDirs(resolveTempDir());
  let K = join(layout.adminDir ?? gitDir, `ccr-seed-${process.pid}-${randomBytes(6).toString("hex")}.index`);
  let _e = null;
  let Ce = null;
  let ge = null;
  let Re = [];
  let $e = new Set();
  let W = [];
  let ct = new Map();
  let ft = [];
  let Qe = new Map();
  let Le = null;
  try {
    let ee = await l(["read-tree", "--no-recurse-submodules", `--index-output=${K}`, "-m", iTree]);
    if (ee.code !== 0) return stepFailure("read-tree", ee.stderr, ee);
    if (layout.adminDir === undefined) {
      _e = await mkdtemp(join(resolveTempDir(), `claude-seed-index-${process.pid}-`));
      let P = join(_e, "index");
      let V = await lstatNoFollow(K, P);
      if (V !== null) {
        await unlink(K).catch(() => {});
        return stepFailure(V.kind === "disk" ? "scratch-index" : "rewritten", V.detail);
      }
      let se = await unlinkWithRetry(K);
      if (se !== null)
        logForDebugging(
          `[wipStash] the scratch index read-tree wrote could not be removed after it was carried off (${se}); left for the sweep`,
        );
      K = P;
    }
    let De = await listSparseCheckout(l, K, layout.adminDir ?? resolveTempDir(), reader, iTree, S);
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
      if (P !== null)
        return {
          kind: "failed",
          ...P,
        };
      let V = await l(["write-tree", "--ignore-cache-tree"], {
        GIT_INDEX_FILE: K,
      });
      if (V.code !== 0) return stepFailure("write-tree", V.stderr || V.stdout, V);
      Fe = V.stdout.trim();
    }
    let St = r.leaveOutUncommittedCredentialFiles
      ? filtered_2
          .filter(({ status, path }) => status === "D" && !L.has(path) && w(path))
          .map(({ path }) => path)
      : [];
    let et = (path) => !L.has(path) && (!r.leaveOutUncommittedCredentialFiles || !w(path));
    let ht = uniq(
      filtered_2.flatMap(({ path, status, newMode, newId }) =>
        status === "D" || newMode === GITLINK_MODE_VALUE || !ZERO_OID_RE.test(newId) ? [path] : [],
      ),
    );
    let Nt = new Set(await listDirectoriesAmong(workTree, ht));
    let Fn = new Set(ht.filter((P) => !Nt.has(P)));
    let filtered = uniq(filtered_2.map(({ path }) => path)).filter((P) => !Fn.has(P) && et(P));
    let filtered_3 = [...U].filter(et);
    let filtered_4 = headState.inspection.staged.filter(({ status }) => status !== "D");
    let tt = checkCredentialLikePaths();
    let M =
      filtered_4.length === 0 && !r.leaveOutUncommittedCredentialFiles
        ? {
            elsewhere: [],
            withheldTracked: new Map(),
          }
        : await listIndexIds(
            l,
            K,
            new Map(filtered_4.map(({ newId, path }) => [newId, path])),
            r.leaveOutUncommittedCredentialFiles ? (P) => tt(P) || p(P) : () => false,
            layout.adminDir ?? resolveTempDir(),
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
    let { elsewhere, withheldTracked } = M;
    let Ke = uniq([...filtered_2.map(({ path }) => path), ...U, ...elsewhere]);
    let Xe = new Set();
    let xt = new Set();
    let nt;
    if (Ke.length > 0) {
      ge = await mkdtemp(join(layout.adminDir ?? resolveTempDir(), "claude-seed-attrs-"));
      nt = await findGitDirCaseVariants(l, workTree);
      let P = await checkAlternatesFile(ge, {
        caseBlind: nt.caseBlind,
        objectFormat: base.length === 64 ? "sha256" : "sha1",
        objectsDir: join(layout.commonDir, "objects"),
      });
      if (P !== null) return stepFailure("check-attr", P);
      let hardenedGitRunner = createHardenedGitRunner(
        e,
        {
          gitDir: ge,
          commonDir: ge,
          workTree,
          configPins: layout.configPins,
        },
        r.signal,
        reachForBoundSession(layout),
        o,
      );
      let treeForPaths = await readTreeForPaths(
        hardenedGitRunner,
        Ke,
        new Map(Ke.map((Z) => [Z, getPathNormalizationVariants(Z)])),
        {
          commit: base,
          indexPath: join(ge, "head.index"),
          objectsDir: join(ge, "verified"),
        },
        nt,
      );
      if (treeForPaths === "overflow")
        return stepFailure("check-attr", "too many changed files to read the attributes of");
      if (treeForPaths === "old_git")
        return stepFailure(
          "check-attr",
          "a committed .gitattributes is a symbolic link, which the installed git (older than 2.32, or of a version this build cannot read) follows on disk: update git, then retry",
        );
      if (treeForPaths === "tampered")
        return stepFailure(
          "verify",
          "HEAD's commit, a tree on the way to a committed .gitattributes, or that file's blob is not the object its id names",
        );
      if (treeForPaths === null) return stepFailure("check-attr", HEAD_UNVERIFIABLE_TEXT);
      Xe = new Set(treeForPaths);
      let me = uniq([...Ke.filter((Z) => Xe.has(Z)), ...L]);
      if (me.length > 0 || withheldTracked.size > 0) {
        let treePaths = await resolveTreePaths(reader, baseTree, me);
        if (isTreeReadFailure(treePaths))
          return treeReadFailure(
            treePaths,
            "cat-file",
            "HEAD's trees to the changed files could not be read back as what their ids name",
          );
        xt = new Set(Xe);
        let he = new Set([...Xe, ...L]);
        let Ge = limitConcurrency(GIT_READ_CONCURRENCY, async (relPath) => {
          let worktreeBlobIds = await readWorktreeBlobIds(
            workTree,
            relPath,
            baseTree.length,
            MAX_STASH_FILE_BYTES,
            S,
          );
          let Tt = withheldTracked.get(relPath);
          return worktreeBlobIds !== null && (he.has(relPath) || !worktreeBlobIds.includes(Tt ?? ""))
            ? worktreeBlobIds
            : [];
        });
        let Qt = (
          await Promise.all(
            uniq([...he, ...withheldTracked.keys()])
              .filter((xe) => !h(xe))
              .map(Ge),
          )
        ).flat();
        let gt = (xe) => xe !== EMPTY_BLOB_IDS.sha1 && xe !== EMPTY_BLOB_IDS.sha256;
        let mt = new Set([
          ...[...treePaths.values()].map(({ id }) => id).filter(gt),
          ...filtered_4
            .filter(({ path }) => he.has(path))
            .map(({ newId }) => newId)
            .filter(gt),
          ...Qt.filter(gt),
        ]);
        $e = mt;
        filtered_4.filter(({ path, newId }) => mt.has(newId) && et(path)).forEach(({ path }) => Xe.add(path));
      }
      let filtered = filtered_3.filter((Z) => Xe.has(Z));
      if (filtered.length > 0) {
        let Z = await restoreIndexEntries(l, reader, K, baseTree, filtered);
        if (Z !== null)
          return {
            kind: "failed",
            ...Z,
          };
        let he = await l(["write-tree", "--ignore-cache-tree"], {
          GIT_INDEX_FILE: K,
        });
        if (he.code !== 0) return stepFailure("write-tree", he.stderr || he.stdout, he);
        Fe = he.stdout.trim();
        Y.push(
          ...filtered.map((path) => ({
            path,
            why: "filtered",
          })),
        );
      }
    }
    let ze = new Set(Y.flatMap(({ path, why }) => (why === "filtered" ? [path] : [])));
    let G = new Set(filtered);
    let flattened = filtered_4.flatMap(({ path, newMode }) =>
      newMode !== GITLINK_MODE_VALUE && et(path) && !G.has(path) ? [path] : [],
    );
    let te = [...filtered, ...(await listDirectoriesAmong(workTree, flattened))];
    if (te.length > 0 || flattened.length > 0) {
      let P = await mkdtemp(join(layout.adminDir ?? resolveTempDir(), "claude-seed-stage-"));
      Ce = P;
      let objectFormat = baseTree.length === 64 ? "sha256" : "sha1";
      let changedFilesForStash = await readChangedFilesForStash(
        workTree,
        P,
        te,
        r.maxStagedBytes ?? MAX_STASH_BYTES,
        {
          ...r.stageHooks,
          objectFormat,
          ntfsRules: S,
        },
      );
      if ("refused" in changedFilesForStash) return stepFailure("stage", changedFilesForStash.refused);
      let me = await listFilesNoPrecompose(
        l,
        {
          GIT_INDEX_FILE: K,
        },
        changedFilesForStash.entries.flatMap((entry) => (entry.kind === "absent" ? [entry.path] : [])),
      );
      if (me === null) return stepFailure("ls-files", "could not list the index entries");
      let ne = await describeStashEntryChange(
        changedFilesForStash,
        new Set(te),
        new Set(
          filtered_2.flatMap(({ path, status }) => (status === "D" || me.unseen.has(path) ? [] : [path])),
        ),
        P,
        (T) =>
          readChangedFilesForStash(workTree, P, T, r.maxStagedBytes ?? MAX_STASH_BYTES, {
            ...r.stageHooks,
            objectFormat,
            ntfsRules: S,
          }),
      );
      if ("refused" in ne) return stepFailure("stage", ne.refused);
      let found = ne.entries.find(
        (entry) => entry.kind === "changed" && (!te.includes(entry.path) || isGitattributesPath(entry.path)),
      );
      if (found !== undefined) return stepFailure("stage", `${found.path} changed while it was being read`);
      let he = withLongPathsGit(
        createHardenedGitRunner(
          e,
          {
            ...layout,
            workTree: Ce,
          },
          r.signal,
          reachForBoundSession(layout),
          o,
        ),
      );
      let Ge = (T, ye, wt, rn, Dt) =>
        he(ye?.GIT_INDEX_FILE === undefined ? [...T] : ["-c", "core.splitIndex=false", ...T], ye, wt, rn, Dt);
      let Qt = new Set(te);
      let gt = uniq([
        ...ne.entries.flatMap((entry) => (entry.kind !== "absent" && Qt.has(entry.path) ? [entry.path] : [])),
        ...filtered_4.flatMap(({ path, newMode }) =>
          newMode !== GITLINK_MODE_VALUE && et(path) ? [path] : [],
        ),
      ]);
      let infoAttributes = await readInfoAttributes(layout.commonDir);
      if (infoAttributes.kind !== "none")
        return stepFailure(
          "check-attr",
          infoAttributes.kind === "touches"
            ? ".git/info/attributes sets or unsets filter attributes (or defines a macro, quotes a pattern, or holds a line of 2,048 bytes or more)"
            : ".git/info/attributes could not be read as a plain file",
        );
      let xe = withLongPathsGit(
        createHardenedGitRunner(
          e,
          {
            gitDir: ge,
            commonDir: ge,
            workTree: Ce,
            configPins: layout.configPins,
          },
          r.signal,
          reachForBoundSession(layout),
          o,
        ),
      );
      let st = new Map(gt.map((T) => [T, getPathNormalizationVariants(T)]));
      let [treeForPaths, treeForPaths_2] = await Promise.all([
        readTreeForPaths(Ge, gt, st, null, nt),
        readTreeForPaths(xe, gt, st, null, nt),
      ]);
      if (treeForPaths === "overflow" || treeForPaths_2 === "overflow")
        return stepFailure("check-attr", "too many changed files to read the attributes of");
      if (treeForPaths === null || !Array.isArray(treeForPaths))
        return stepFailure("check-attr", "could not read the attributes in force");
      if (treeForPaths_2 === null || !Array.isArray(treeForPaths_2))
        return stepFailure("check-attr", "could not read the staged .gitattributes on their own");
      let Dr = treeForPaths;
      let Pr = treeForPaths_2;
      let nn = new Set([...Dr, ...Pr].filter((T) => !xt.has(T)));
      let $o = (T) => T !== EMPTY_BLOB_IDS.sha1 && T !== EMPTY_BLOB_IDS.sha256;
      let Do = limitConcurrency(GIT_READ_CONCURRENCY, (relPath) =>
        readWorktreeBlobIds(workTree, relPath, baseTree.length, MAX_STASH_FILE_BYTES, S),
      );
      let flattened = (await Promise.all([...nn].filter((T) => !h(T)).map(Do))).flatMap((T) => T ?? []);
      let Fr = new Set(
        [...filtered_4.filter(({ path }) => nn.has(path)).map(({ newId }) => newId), ...flattened].filter($o),
      );
      let mapped = filtered_4
        .filter(({ path, newId }) => Fr.has(newId) && et(path) && !nn.has(path) && !Xe.has(path))
        .map(({ path }) => path);
      $e = new Set([...$e, ...Fr]);
      let Mr = uniq([
        ...Dr,
        ...Pr,
        ...ne.entries.flatMap((entry) => (Xe.has(entry.path) ? [entry.path] : [])),
        ...mapped,
      ]);
      let infoAttributes_2 = await readInfoAttributes(layout.commonDir);
      if (!infoAttributesUnchanged(infoAttributes, infoAttributes_2))
        return stepFailure("check-attr", ".git/info/attributes changed while the attributes were read");
      let Gr = uniq([...filtered_3.filter((T) => nn.has(T)), ...mapped]);
      if (Gr.length > 0) {
        let T = await restoreIndexEntries(l, reader, K, baseTree, Gr);
        if (T !== null)
          return {
            kind: "failed",
            ...T,
          };
        let ye = await l(["write-tree", "--ignore-cache-tree"], {
          GIT_INDEX_FILE: K,
        });
        if (ye.code !== 0) return stepFailure("write-tree", ye.stderr || ye.stdout, ye);
        Fe = ye.stdout.trim();
      }
      let flattened_2 = ne.entries.flatMap((entry) =>
        (entry.kind === "hardlinked" || entry.kind === "changed") && Qt.has(entry.path) && !ze.has(entry.path)
          ? [
              {
                path: entry.path,
                why: entry.kind === "hardlinked" ? "hardlinked" : "unstable",
              },
            ]
          : [],
      );
      let Lo = new Set([...ze, ...flattened_2.map(({ path }) => path)]);
      let Hr = [
        ...flattened_2,
        ...Mr.filter((T) => !Lo.has(T)).map((path) => ({
          path,
          why: "filtered",
        })),
      ];
      let Ln = new Set([...Hr.map(({ path }) => path), ...Mr]);
      Y.push(...Hr);
      let flattened_3 = ne.entries.flatMap((entry) =>
        entry.kind === "file" || entry.kind === "symlink" ? [entry.path] : [],
      );
      let Gn = await listFilesNoPrecompose(l, undefined, flattened_3);
      if (Gn === null) return stepFailure("ls-files", "could not list the index entries");
      let filtered = flattened_3.filter((T) => !Ln.has(T));
      let Wr = await listFilesNoPrecompose(
        l,
        {
          GIT_INDEX_FILE: K,
        },
        filtered,
      );
      if (Wr === null) return stepFailure("ls-files", "could not list the index entries");
      if (filtered.some((T) => Gn.unseen.has(T) !== Wr.unseen.has(T)))
        return stepFailure(
          "rewritten",
          "an entry this upload read was marked assume-unchanged or skip-worktree in one copy of the index and not the other since the build began",
        );
      Qe = new Map(
        filtered_4.map(({ path, newId, newMode }) => [
          path,
          {
            id: newId,
            mode: newMode,
          },
        ]),
      );
      let Mo = new Set(filtered_2.flatMap(({ path, newId }) => (/^0+$/.test(newId) ? [path] : [])));
      ft = flattened_3.filter((T) => Gn.unseen.has(T) && Qe.has(T) && !Mo.has(T) && !Ln.has(T));
      let jn = new Set([...Ln, ...ft]);
      let symlinkTarget = await readSymlinkTarget(
        l,
        K,
        ne.entries.filter((entry) => !jn.has(entry.path)),
      );
      if (symlinkTarget.kind === "failed") return symlinkTarget;
      let flattened_4 = ne.entries.flatMap((entry) =>
        entry.kind === "absent" && G.has(entry.path) && !me.skipWorktree.has(entry.path) ? [entry.path] : [],
      );
      Re = flattened_4.filter((T) => !D.has(T));
      let Un = await markPathsIntentToAdd(
        l,
        {
          GIT_INDEX_FILE: K,
        },
        baseTree,
        flattened_4,
      );
      if (Un.code !== 0) return stepFailure("update-index", Un.stderr, Un);
      let flattened_5 = ne.entries.flatMap((entry) =>
        entry.kind === "file" && !jn.has(entry.path) ? [entry.path] : [],
      );
      W = ne.entries.flatMap((entry) =>
        (entry.kind === "file" || entry.kind === "symlink") && !jn.has(entry.path) ? [entry.path] : [],
      );
      ct = new Map(
        [...symlinkTarget.ids].map(([T, ye]) => [
          T,
          {
            mode: SYMLINK_MODE_VALUE,
            id: ye,
          },
        ]),
      );
      if (flattened_5.length > 0) {
        Le = join(dirname(K), `replay-${randomBytes(6).toString("hex")}.index`);
        let T = await lstatNoFollow(K, Le);
        if (T !== null) return stepFailure(T.kind === "disk" ? "scratch-index" : "rewritten", T.detail);
        let ye = await listFilesNoPrecompose(
          Ge,
          {
            GIT_INDEX_FILE: Le,
          },
          flattened_5,
        );
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
            {
              GIT_INDEX_FILE: Ne,
            },
            flattened_5.map((Pt) => `${Pt}\x00`).join(""),
          );
        let rn = await wt(["--ignore-skip-worktree-entries"]);
        let Dt = rn.exitCode === GIT_SIGPIPE_EXIT_CODE ? await wt([]) : rn;
        if (Dt.code !== 0) return stepFailure("update-index", Dt.stderr, Dt);
        let on = await listSkipWorktreeEntries(Ge, Le, wt, flattened_5);
        if (on === null)
          return stepFailure("update-index", "the lay could not be replayed to learn the laid entries");
        let Go = new Map(
          ne.entries.flatMap((entry) => (entry.kind === "file" ? [[entry.path, entry.copy]] : [])),
        );
        let jo = new Map([
          ...filtered_2.map(({ path, oldMode }) => [path, oldMode]),
          ...headState.inspection.staged.map(({ path, newMode }) => [path, newMode]),
        ]);
        if (
          flattened_5.find((Ae) => {
            let mode = on.get(Ae)?.mode;
            return !(
              mode !== undefined &&
              (REGULAR_FILE_MODES.includes(mode) ||
                (mode === SYMLINK_MODE_VALUE && jo.get(Ae) === SYMLINK_MODE_VALUE))
            );
          }) !== undefined
        )
          return stepFailure(
            "rewritten",
            "an entry this upload laid as a file is recorded as something else in the scratch index",
          );
        if (
          flattened_5.find((Ae) => {
            let id = on.get(Ae)?.id;
            let Pt = Go.get(Ae);
            return Pt === undefined || (id !== Pt.blobId && id !== Pt.lfBlobId);
          }) !== undefined
        )
          return stepFailure("rewritten", "an entry this upload laid does not hold the bytes staged for it");
        for (let Ae of [K, Le]) {
          let Ne = await listFilesNoPrecompose(
            Ge,
            {
              GIT_INDEX_FILE: Ae,
            },
            flattened_5,
          );
          if (Ne === null) return stepFailure("update-index", "the laid paths could not be listed");
          if (Ne.unseen.size > 0 || Ne.absent.size > 0)
            return stepFailure(
              "rewritten",
              "an entry this upload laid is marked assume-unchanged or skip-worktree in the scratch index, or is no longer there by its name",
            );
        }
        if (!(await stagedCopiesUnchanged(Ce, ne.copies)))
          return stepFailure("stage", "the staged copies changed while git read them");
        if (!infoAttributesUnchanged(infoAttributes, await readInfoAttributes(layout.commonDir)))
          return stepFailure("check-attr", ".git/info/attributes changed while the changes were hashed");
        on.forEach((Ae, Ne) => ct.set(Ne, Ae));
      }
    }
    let ue = await markPathsIntentToAdd(
      l,
      {
        GIT_INDEX_FILE: K,
      },
      baseTree,
      St,
    );
    if (ue.code !== 0) return stepFailure("update-index", ue.stderr, ue);
    let q = await l(["write-tree", "--ignore-cache-tree"], {
      GIT_INDEX_FILE: K,
    });
    if (q.code !== 0) return stepFailure("write-tree", q.stderr || q.stdout, q);
    let trimmed = q.stdout.trim();
    if (r.leaveOutUncommittedCredentialFiles) {
      let P = await describeIndexEntryChange(reader, baseTree, trimmed, w, S);
      if (isTreeReadFailure(P)) return treeReadFailure(P, "cat-file", TREE_READBACK_MISMATCH);
      let filtered = P.filter(({ why }) => why !== "forged" && why !== "alias");
      if (filtered.length > 0) {
        let Z = await restoreIndexEntries(
          l,
          reader,
          K,
          baseTree,
          filtered.map(({ path }) => path),
        );
        if (Z !== null)
          return {
            kind: "failed",
            ...Z,
          };
        let he = await l(["write-tree", "--ignore-cache-tree"], {
          GIT_INDEX_FILE: K,
        });
        if (he.code !== 0) return stepFailure("write-tree", he.stderr || he.stdout, he);
        trimmed = he.stdout.trim();
        Y.push(...filtered);
      }
      let results = await Promise.all(
        uniq([trimmed, Fe]).map((Z) => describeIndexEntryChange(reader, baseTree, Z, w, S)),
      );
      let found = results.find(isTreeReadFailure);
      if (found !== undefined) return treeReadFailure(found, "cat-file", TREE_READBACK_MISMATCH);
      let ne = [
        ...new Map(results.flatMap((Z) => (isTreeReadFailure(Z) ? [] : Z)).map((Z) => [Z.path, Z])).values(),
      ];
      if (ne.length > 0)
        return {
          kind: "refused",
          refused: ne,
          decidedOn: "tree",
        };
    }
    let indexEntries = await parseIndexEntries(reader, baseTree, Fe);
    if (isTreeReadFailure(indexEntries))
      return treeReadFailure(indexEntries, "cat-file", TREE_READBACK_MISMATCH);
    let filtered_5 = indexEntries.filter(({ status, newId }) => status !== "D" && $e.has(newId));
    if (filtered_5.length > 0) return sameBytesRefusal(filtered_5);
    let qe = trimmed === Fe ? indexEntries : await parseIndexEntries(reader, baseTree, trimmed);
    if (isTreeReadFailure(qe)) return treeReadFailure(qe, "cat-file", TREE_READBACK_MISMATCH);
    if (trimmed !== Fe) {
      let P = new Set(W);
      let filtered = qe.filter(({ path, status, newId }) => status !== "D" && !P.has(path) && $e.has(newId));
      if (filtered.length > 0) return sameBytesRefusal(filtered);
    }
    if (ft.length > 0) {
      let mapped = [indexEntries, qe].map(
        (se) =>
          new Map(
            se.map(({ path, status, newId, newMode }) => [
              path,
              status === "D"
                ? null
                : {
                    mode: newMode,
                    id: newId,
                  },
            ]),
          ),
      );
      if (
        ft.find((se) =>
          mapped.some((me) => {
            let ne = me.get(se);
            let Z = Qe.get(se);
            return ne === undefined || ne === null || Z === undefined || ne.id !== Z.id || ne.mode !== Z.mode;
          }),
        ) !== undefined
      )
        return stepFailure(
          "rewritten",
          "a staged entry this upload left as the index had it was replaced in the scratch index before the trees were written",
        );
    }
    if (W.length > 0) {
      let P = new Map(
        qe.map(({ path, status, newId, newMode }) => [
          path,
          status === "D"
            ? null
            : {
                mode: newMode,
                id: newId,
              },
        ]),
      );
      let filtered = W.filter((ne) => !P.has(ne));
      let se = filtered.length > 0 ? await resolveTreePaths(reader, baseTree, filtered) : new Map();
      if (isTreeReadFailure(se)) return treeReadFailure(se, "cat-file", TREE_READBACK_MISMATCH);
      if (
        W.find((ne) => {
          let Z = P.has(ne) ? P.get(ne) : se.get(ne);
          let he = ct.get(ne);
          return Z === null || Z === undefined || he === undefined || Z.id !== he.id || Z.mode !== he.mode;
        }) !== undefined
      )
        return stepFailure(
          "rewritten",
          "an entry this upload laid was replaced in the scratch index before the work tree was written",
        );
    }
    if (trimmed === baseTree && Fe === baseTree)
      return {
        kind: "none",
        leftOut: Y,
      };
    let Me = await describeStashBase(l, base);
    let He = await l(["commit-tree", Fe, "-p", base, "-m", `index on ${Me}`], STASH_IDENTITY_ENV);
    if (He.code !== 0) return stepFailure("commit-tree", He.stderr, He);
    let re = await l(
      ["commit-tree", trimmed, "-p", base, "-p", He.stdout.trim(), "-m", `WIP on ${Me}`],
      STASH_IDENTITY_ENV,
    );
    if (re.code !== 0) return stepFailure("commit-tree", re.stderr, re);
    let we = [
      {
        id: He.stdout.trim(),
        tree: Fe,
        parents: [base],
      },
      {
        id: re.stdout.trim(),
        tree: trimmed,
        parents: [base, He.stdout.trim()],
      },
    ];
    for (let { id, tree, parents } of we) {
      let me = await reader.commit(id);
      if (isTreeReadFailure(me)) return treeReadFailure(me, "commit-tree", COMMIT_READBACK_MISMATCH);
      if (
        me.tree !== tree ||
        me.parents.length !== parents.length ||
        me.parents.some((parent, Z) => parent !== parents[Z])
      )
        return stepFailure("verify", COMMIT_READBACK_MISMATCH);
    }
    return {
      kind: "created",
      commit: re.stdout.trim(),
      leftOut: Y,
      deletedUnstaged: [...Re],
    };
  } catch (error) {
    return stepFailure("scratch-index", errorMessage(error));
  } finally {
    await Promise.all([
      ...[K, `${K}.lock`, ...(Le === null ? [] : [Le, `${Le}.lock`])].map((ee) => unlink(ee).catch(() => {})),
      ...[...(_e === null ? [] : [_e]), ...(Ce === null ? [] : [Ce]), ...(ge === null ? [] : [ge])].map(
        (ee) =>
          rm(ee, {
            recursive: true,
            force: true,
          }).catch(() => {}),
      ),
    ]);
  }
}
//@ chunk-gjx0rh1b.js:54648-55353 placement
async function createStashCommit(e, n, signal, pinnedIndexFile) {
  let s = await listGitRefs(
    e,
    [...GIT_READ_CONFIG_ARGS, ...splitIndexOffArgs(pinnedIndexFile), ...SAFECRLF_ARGS, "stash", "create"],
    {
      hardened: false,
      signal,
      env: {
        ...GIT_LIST_ENV,
        ...indexFileEnv(pinnedIndexFile),
      },
    },
  );
  if (s.code === 0) {
    let trimmed = s.stdout.trim();
    return trimmed === ""
      ? {
          kind: "none",
          leftOut: [],
        }
      : {
          kind: "created",
          commit: trimmed,
          leftOut: [],
          deletedUnstaged: [],
        };
  }
  let l = seenStderr(s).trim() === "";
  if (s.exitCode === 1 && l) {
    logForDebugging(
      `[gitBundle] git stash create exited ${s.code} with no output \u2014 treating as no uncommitted changes`,
    );
    return {
      kind: "none",
      leftOut: [],
    };
  }
  return !n
    ? {
        kind: "none",
        leftOut: [],
      }
    : l
      ? {
          ...stepFailure(
            "stash create",
            s.exitCode === undefined
              ? "it was stopped, ran out of time or could not start, and left no message"
              : `it ended with exit status ${s.exitCode} and left no message`,
          ),
          silent: l,
        }
      : stepFailure("stash create", s.stderr, s);
}
//@ chunk-gjx0rh1b.js:55353-56266 placement
async function restoreIndexEntries(e, reader, r, baseTree, s) {
  let treePaths = await resolveTreePaths(reader, baseTree, s);
  if (isTreeReadFailure(treePaths))
    return treeReadFailure(
      treePaths,
      "cat-file",
      "the trees holding the entries to restore could not be read back as what their ids name",
    );
  let h = `0 ${"0".repeat(baseTree.length)}`;
  let u = await e(
    ["update-index", "-z", "--index-info"],
    {
      GIT_INDEX_FILE: r,
    },
    s
      .map((_) => {
        let y = treePaths.get(_);
        return `${y === undefined ? h : `${y.mode.padStart(6, "0")} ${y.id}`}	${_}\x00`;
      })
      .join(""),
  );
  if (u.code !== 0) return stepFailure("update-index", u.stderr, u);
  let p = ignoredPathLines(seenStderr(u), s);
  if (p.length > 0)
    return {
      step: "refused-name",
      detail: `git refuses a name it was asked to restore: ${p.slice(0, 3).join(", ")}`,
    };
  let w = await listIndexEntriesNamed(e, r, new Set(s), dirname(r));
  if (w === null)
    return {
      step: "ls-files",
      detail: "could not list the index entries",
    };
  return s.some((_) => {
    let y = w.get(_);
    return (
      (y !== undefined && !splitArgsIntoSlices(y)) ||
      y?.id !== treePaths.get(_)?.id ||
      y?.mode !== treePaths.get(_)?.mode.padStart(6, "0")
    );
  })
    ? {
        step: "verify",
        detail: "the entries just restored are not the ones the verified trees hold",
      }
    : null;
}
//@ chunk-gjx0rh1b.js:56266-56361 placement
async function sha256OfFile(e) {
  let hash = createHash("sha256");
  await readFileChunks(e, (r) => {
    hash.update(r);
  });
  return hash.digest("hex");
}
//@ chunk-gjx0rh1b.js:56361-56417 placement
function readTreeFailure({ detail, run }) {
  return stepFailure("read-tree", detail, run);
}
//@ chunk-gjx0rh1b.js:56417-57801 placement
async function listSparseCheckout(e, n, r, reader, iTree, l) {
  let h = await mkdtemp(join(r, "claude-seed-listings-"));
  try {
    let u = 0;
    let p = async (B, x, S) => {
      let z = S.length === 0 ? [] : ["--", ".", ...S.map((Y) => `:(exclude,literal)${Y}`)];
      for (let Y of [["--sparse"], []]) {
        let L = await open(join(h, `${B}.${u++}`), GIT_STDOUT_CAPTURE_FLAGS, 384);
        try {
          let U = await e(
            ["ls-files", ...Y, "-s", "-z", ...z],
            {
              GIT_GLOB_PATHSPECS: "0",
              GIT_ICASE_PATHSPECS: "0",
              ...x,
            },
            undefined,
            undefined,
            L.fd,
          );
          if (U.code === 0) return await sha256OfFile(L);
          if (U.exitCode !== GIT_SIGPIPE_EXIT_CODE || Y.length === 0)
            return {
              detail: U.stderr || "could not list the index",
              run: U,
            };
        } finally {
          await L.close();
        }
      }
      return {
        detail: "could not list the index",
      };
    };
    let w = async (B) => {
      let [x, S] = await Promise.all([
        p(
          "trees",
          {
            GIT_INDEX_FILE: n,
          },
          [],
        ),
        p("index", undefined, B),
      ]);
      if (typeof x !== "string") return x;
      if (typeof S !== "string") return S;
      return x === S ? "agree" : "differ";
    };
    let _ = await w([]);
    if (_ !== "differ")
      return _ === "agree"
        ? {
            kind: "agree",
          }
        : readTreeFailure(_);
    let y = await e(
      ["diff-files", "-z", "--name-only", "--diff-filter=AD", "--ignore-submodules=dirty"],
      LITERAL_PATHSPEC_ENV,
    );
    if (y.code !== 0)
      return readTreeFailure({
        detail: y.stderr,
        run: y,
      });
    let filtered = y.stdout.split("\x00").filter((B) => B !== "");
    let treePaths = await resolveTreePaths(reader, iTree, filtered);
    if (isTreeReadFailure(treePaths))
      return treeReadFailure(
        treePaths,
        "cat-file",
        "the index's trees could not be read back as what their ids name",
      );
    let filtered_2 = filtered.filter((B) => !treePaths.has(B));
    if (filtered_2.length === 0 || filtered_2.some((B) => !isSafeRepoRelativePath(B, l)))
      return {
        kind: "differ",
      };
    let R = await w(filtered_2);
    return R === "agree"
      ? {
          kind: "agree",
        }
      : R === "differ"
        ? {
            kind: "differ",
          }
        : readTreeFailure(R);
  } finally {
    await rm(h, {
      recursive: true,
      force: true,
    }).catch(() => {});
  }
}
//@ chunk-gjx0rh1b.js:57801-58623 placement
async function listIndexIds(e, n, r, o, s, l, signal) {
  let u = await mkdtemp(join(s, "claude-seed-ids-"));
  try {
    let p = 0;
    for (let w of [["--sparse"], []]) {
      let _ = await open(join(u, `index.${p++}`), GIT_STDOUT_CAPTURE_FLAGS, 384);
      try {
        let y = await e(
          ["ls-files", ...w, "-s", "-z"],
          {
            GIT_INDEX_FILE: n,
          },
          undefined,
          undefined,
          _.fd,
        );
        if (y.code === 0) {
          let E = [];
          let C = new Map();
          let A = "";
          await readFileChunks(_, (R) => {
            if (signal?.aborted) return;
            let parts = (A + R.toString("latin1")).split("\x00");
            A = parts.pop() ?? "";
            for (let x of parts) {
              let index = x.indexOf("\t");
              let [, z = "", Y = ""] = x.slice(0, index).split(" ");
              let str = Buffer.from(x.slice(index + 1), "latin1").toString("utf8");
              if (!isSafeRepoRelativePath(str, l) || hasDosShortNameSegment(str)) continue;
              if (Y === "0" && o(str)) C.set(str, z);
              let U = r.get(z);
              if (U !== undefined && str !== U) E.push(str);
            }
          });
          if (signal?.aborted) return null;
          return A === ""
            ? {
                elsewhere: E,
                withheldTracked: C,
              }
            : null;
        }
        if (y.exitCode !== GIT_SIGPIPE_EXIT_CODE) return null;
      } finally {
        await _.close();
      }
    }
    return null;
  } finally {
    await rm(u, {
      recursive: true,
      force: true,
    }).catch(() => {});
  }
}
//@ chunk-gjx0rh1b.js:58623-58795 placement
var HEAD_UNVERIFIABLE_TEXT = "HEAD's commit or its .gitattributes could not be read to be verified";
var NO_GIT_DIR_TEXT =
  "internal error: no git directory was chosen for this linked worktree, so git was not run";
//@ chunk-gjx0rh1b.js:58795-59238 placement
/**
 * 创建在加固模式下运行 git 的执行函数；链接工作树缺少管理目录时直接返回拒绝结果。
 */
function createHardenedGitRunner(
  e,
  n,
  signal,
  o,
  s = currentGitBinaryState(),
  { hardenedMaxBuffer: l } = {},
) {
  if (n.checkout === "linked" && n.adminDir === undefined && n.runsInOwnDirectories !== true)
    return () =>
      Promise.resolve({
        stdout: "",
        stderr: NO_GIT_DIR_TEXT,
        code: 126,
      });
  let h = o ?? reachForBoundSession(n);
  let screenMemo = s.screenMemo ?? createReachCollector();
  return (p, env, input, y, E) =>
    listGitRefs(e, p, {
      hardened: true,
      layout: n,
      signal,
      probes: s,
      env,
      input,
      ...(y !== undefined && {
        encoding: y,
      }),
      ...(E !== undefined && {
        stdoutFd: E,
      }),
      ...(h !== undefined && {
        reachRoots: h,
        screenMemo,
      }),
      ...(l !== undefined && {
        hardenedMaxBuffer: l,
      }),
    });
}
//@ chunk-gjx0rh1b.js:59238-61137 placement
/**
 * 解析 HEAD（无提交、分离、分支），列出被省略的内容。
 */
async function resolveHeadState(e, n) {
  let r = await e(["rev-parse", "-q", "--verify", "HEAD"]);
  if (r.code !== 0)
    return r.exitCode === 1
      ? {
          kind: "none",
          leftOut: [],
        }
      : stepFailure("rev-parse", r.stderr, r);
  let o = await e(["rev-parse", "-q", "--verify", `${r.stdout.trim()}^{commit}`]);
  if (o.code !== 0) {
    let S = await e(["cat-file", "-t", r.stdout.trim()]);
    return S.code === 0 && ["tree", "blob"].includes(S.stdout.trim())
      ? stepFailure("verify", "HEAD names a tree or blob, not a commit")
      : stepFailure("rev-parse", o.stderr || "HEAD is not a commit");
  }
  let trimmed = o.stdout.trim();
  let l = new GitObjectReader(batchCatFile(e, n), trimmed);
  let [h, u] = await Promise.all([l.commit(trimmed), e(["write-tree", "--ignore-cache-tree"])]);
  if (isTreeReadFailure(h))
    return treeReadFailure(h, "rev-parse", "HEAD could not be read back as the commit its id names");
  if (u.code !== 0) return stepFailure("write-tree", u.stderr || u.stdout, u);
  let tree = h.tree;
  let trimmed_2 = u.stdout.trim();
  let indexEntries = await parseIndexEntries(l, tree, trimmed_2);
  if (isTreeReadFailure(indexEntries))
    return treeReadFailure(
      indexEntries,
      "cat-file",
      "HEAD's or the index's trees could not be read back as what their ids name",
    );
  let y = indexEntries;
  let E = await e(["--no-optional-locks", "diff-files", "-z", "--no-renames", "--ignore-submodules=dirty"]);
  let C = E.code === 0 ? parseDiffRawZ(E.stdout) : null;
  if (C === null) return stepFailure("diff-files", E.stderr, E);
  if ([...C, ...y].some(({ path }) => path.includes("\uFFFD")))
    return stepFailure("path-encoding", "a changed path is not valid UTF-8");
  let treePaths = await resolveTreePaths(
    l,
    tree,
    C.map(({ path }) => path),
  );
  if (isTreeReadFailure(treePaths))
    return treeReadFailure(
      treePaths,
      "cat-file",
      "HEAD's trees to the changed files could not be read back as what their ids name",
    );
  let R = "0".repeat(tree.length);
  let B = new Set(C.map(({ path }) => path));
  let working = [
    ...y.filter(({ path }) => !B.has(path)),
    ...C.flatMap((S) => {
      let z = treePaths.get(S.path);
      if (S.status === "D")
        return z === undefined || isWindowsUnholdableDeletion(S, treePaths)
          ? []
          : [
              {
                path: S.path,
                status: "D",
                oldMode: z.mode.padStart(6, "0"),
                newMode: "000000",
                oldId: z.id,
                newId: R,
              },
            ];
      return [
        {
          path: S.path,
          status: z === undefined ? "A" : "M",
          oldMode: z === undefined ? "000000" : z.mode.padStart(6, "0"),
          newMode: S.newMode,
          oldId: z?.id ?? R,
          newId: R,
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
      working,
      reader: l,
      namesWindowsCannotHold: count(C, (S) => isWindowsUnholdableDeletion(S, treePaths)),
    },
  };
}
//@ chunk-gjx0rh1b.js:61137-61273 placement
function isWindowsUnholdableDeletion(e, treePaths) {
  return (
    getPlatform() === "windows" &&
    e.status === "D" &&
    treePaths.has(e.path) &&
    hasUnsafeCharSegment(e.path) &&
    !e.path.includes("\\") &&
    isSafeRepoRelativePath(e.path, true) &&
    !hasDosShortNameSegment(e.path)
  );
}
//@ chunk-gjx0rh1b.js:61273-61436 placement
function findSuspiciousChangedPaths({ staged, working }, r) {
  return uniq([...staged, ...working].map(({ path }) => path))
    .sort()
    .flatMap((s) =>
      !isSafeRepoRelativePath(s, r)
        ? [
            {
              path: s,
              why: "forged",
            },
          ]
        : hasDosShortNameSegment(s)
          ? [
              {
                path: s,
                why: "alias",
              },
            ]
          : [],
    );
}
//@ chunk-gjx0rh1b.js:61436-62405 placement
async function classifyIndexEntry(workTree, { staged, working }, o, s, l = () => false) {
  let h = uniq([...staged, ...working].map(({ path }) => path));
  let filtered = h.filter((D) => !isSafeRepoRelativePath(D, s));
  let filtered_2 = h.filter((D) => isSafeRepoRelativePath(D, s) && hasDosShortNameSegment(D));
  let w = new Set([...filtered, ...filtered_2]);
  let _ = ({ path }) => !w.has(path) && o(path);
  let filtered_3 = staged.filter(_);
  let E = new Set(filtered_3.map(({ path }) => path));
  let C = limitConcurrency(GIT_READ_CONCURRENCY, async (D) =>
    !E.has(D.path) && !l(D.path) && (await compareWorktreeEntry(workTree, D, s)) === "unchanged" ? [] : [D],
  );
  let A = (await Promise.all(working.filter(_).map(C))).flat();
  let R = uniq([...filtered_3, ...A].filter(({ status }) => status === "A").map(({ path }) => path));
  let B = new Set(R);
  let x = uniq(
    [...filtered_3, ...A]
      .filter(({ path, status }) => status !== "D" && !B.has(path))
      .map(({ path }) => path),
  );
  let S = new Set([...R, ...x]);
  let z = uniq([...filtered_3, ...A].map(({ path }) => path).filter((D) => !S.has(D)));
  let Y = limitConcurrency(GIT_READ_CONCURRENCY, async (D) =>
    (await isNotPlainDirectory(workTree, D)) ? [D] : [],
  );
  let L = (await Promise.all(z.map(Y))).flat();
  return [
    ...filtered.map((path) => ({
      path,
      why: "forged",
    })),
    ...filtered_2.map((path) => ({
      path,
      why: "alias",
    })),
    ...R.map((path) => ({
      path,
      why: "added",
    })),
    ...x.map((path) => ({
      path,
      why: "changed",
    })),
    ...L.map((path) => ({
      path,
      why: "resurrected",
    })),
  ].sort((D, pe) => (D.path < pe.path ? -1 : D.path > pe.path ? 1 : 0));
}
//@ chunk-gjx0rh1b.js:62405-62717 placement
async function describeIndexEntryChange(reader, baseTree, r, o, s) {
  let indexEntries = await parseIndexEntries(reader, baseTree, r);
  if (isTreeReadFailure(indexEntries)) return indexEntries;
  let filtered = indexEntries.filter(
    ({ path, status }) =>
      status !== "D" && (!isSafeRepoRelativePath(path, s) || hasDosShortNameSegment(path) || o(path)),
  );
  let u = new Map(filtered.map(({ path, status }) => [path, status]));
  return uniq(filtered.map(({ path }) => path))
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
var MISSING_OBJECT_RE_2 =
  /invalid object \d+ [0-9a-f]+ for|could not fetch [0-9a-f]+ from promisor remote|lazy fetching disabled|missing blob/;
var UNMERGED_INDEX_RE = /needs merge|you need to resolve your current index first|unmerged/i;
//@ chunk-gjx0rh1b.js:62914-63057 placement
function INDEX_PROBLEM_KINDS(e) {
  let firstLine = getFirstLine(seenStderr(e).trim());
  return MISSING_OBJECT_RE_2.test(firstLine)
    ? "object_missing"
    : UNMERGED_INDEX_RE.test(firstLine)
      ? "unmerged"
      : firstLine.includes("index.lock")
        ? "index_locked"
        : undefined;
}
//@ chunk-gjx0rh1b.js:63057-63163 placement
function stepFailure(step, n, r) {
  let o = r && INDEX_PROBLEM_KINDS(r);
  return {
    kind: "failed",
    step,
    detail: getFirstLine(n.trim()),
    ...(o !== undefined && {
      said: o,
    }),
  };
}
//@ chunk-gjx0rh1b.js:63163-63273 placement
function sameBytesRefusal(e) {
  return {
    kind: "refused",
    refused: e.map(({ path }) => ({
      path,
      why: "same-bytes",
    })),
    decidedOn: "tree",
  };
}
//@ chunk-gjx0rh1b.js:63273-63368 placement
function ignoredPathLines(e, n) {
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
function formatDirectoryLabel(detail) {
  return detail === undefined || detail === ""
    ? "the top of the checkout"
    : `directory '${truncateCodePoints(detail.replace(/[\p{Cc}\p{Cf}']/gu, "?"), 120)}'`;
}
//@ chunk-gjx0rh1b.js:63617-63894 placement
function parseDiffRawZ(stdout) {
  let parts = stdout.split("\x00");
  if (parts.pop() !== "" || parts.length % 2 !== 0) return null;
  let list = Array.from(
    {
      length: parts.length / 2,
    },
    (o, s) => {
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
    },
  );
  return list.every((o) => o !== null) ? list : null;
}
//@ chunk-gjx0rh1b.js:63894-64051 placement
function infoAttributesUnchanged(infoAttributes, infoAttributes_2) {
  return (
    infoAttributes.kind !== "unreadable" &&
    infoAttributes_2.kind === "none" &&
    (infoAttributes.bytes === null
      ? infoAttributes_2.bytes === null
      : infoAttributes_2.bytes !== null && infoAttributes.bytes.equals(infoAttributes_2.bytes)) &&
    sameFileStamp(infoAttributes.stamp, infoAttributes_2.stamp)
  );
}
//@ chunk-gjx0rh1b.js:64051-64177 placement
function sameFileStamp(stamp, stamp_2) {
  return stamp === null || stamp_2 === null
    ? stamp === stamp_2
    : stamp.ino === stamp_2.ino &&
        stamp.size === stamp_2.size &&
        stamp.mtimeMs === stamp_2.mtimeMs &&
        stamp.ctimeMs === stamp_2.ctimeMs;
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
async function lstatBigintOrNull(e, stat = lstat) {
  try {
    return await stat(e, {
      bigint: true,
    });
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT" || getErrnoCode(error) === "ENOTDIR") return null;
    throw error;
  }
}
//@ chunk-gjx0rh1b.js:64417-64527 placement
var FILTER_ATTRIBUTE_RE = /(?:^|\s|")[-!]?(?:filter|working-tree-encoding|ident)(?:=|\s|$)/;
var MACRO_OR_QUOTED_ATTR_RE = /^[ \t\r]*(?:\[attr\]|")/;
var MAX_ATTRIBUTE_LINE_BYTES = 2048;
//@ chunk-gjx0rh1b.js:64527-64598 placement
function hasOverlongAttributeLine(e) {
  return e
    .split(
      `
`,
    )
    .some((line) => Buffer.byteLength(line) >= MAX_ATTRIBUTE_LINE_BYTES);
}
//@ chunk-gjx0rh1b.js:64598-64713 placement
function attributeLines(e) {
  return e
    .replace(/^\uFEFF/, "")
    .split(
      `
`,
    )
    .map((line) => firstLineOf(line, "\x00"))
    .filter((n) => !/^[ \t\r]*#/.test(n));
}
//@ chunk-gjx0rh1b.js:64713-65080 placement
async function findGitDirCaseVariants(e, workTree) {
  let platform = getPlatform();
  let [o, s] = await Promise.all([
    lstat(join(workTree, ".git"), {
      bigint: true,
    }).catch(() => null),
    lstat(join(workTree, ".GIT"), {
      bigint: true,
    }).catch(() => null),
  ]);
  let l = o !== null && s !== null && o.ino === s.ino && o.dev === s.dev;
  let h = await e(["config", "--bool", "core.ignorecase"]);
  return {
    caseBlind:
      platform === "macos" || platform === "windows" || l || (h.code === 0 && h.stdout.trim() === "true"),
    normalizationBlind: platform === "macos",
  };
}
//@ chunk-gjx0rh1b.js:65080-66184 placement
async function readInfoAttributes(
  commonDir,
  { shouldStampAbove: n = false, shouldStopAtLink: r = false } = {},
) {
  let o = join(commonDir, "info");
  let s = join(o, "attributes");
  let l = await openGitInfoDir(o, n, r).catch(() => {
    return;
  });
  if (l === undefined)
    return {
      kind: "unreadable",
      bytes: null,
      stamp: null,
    };
  if (r && l.link)
    return {
      kind: "none",
      bytes: null,
      stamp: null,
      dir: l,
    };
  try {
    if (getPlatform() === "windows" && !(await lstat(s)).isFile())
      return {
        kind: "unreadable",
        bytes: null,
        stamp: null,
      };
    let h = await open(s, readOnlyNoFollowFlags());
    try {
      let stats = await h.stat({
        bigint: true,
      });
      if (!stats.isFile() || stats.size > MAX_INFO_ATTRIBUTES_BYTES)
        return {
          kind: "unreadable",
          bytes: null,
          stamp: null,
        };
      let stamp = fileStampFromBigStats(stats);
      let w = Number(stats.size);
      if (w === 0)
        return {
          kind: "none",
          bytes: Buffer.alloc(0),
          stamp,
          dir: l,
        };
      let _ = Buffer.alloc(w);
      let { bytesRead } = await h.read(_, 0, w, 0);
      if (bytesRead !== w)
        return {
          kind: "unreadable",
          bytes: null,
          stamp: null,
        };
      let str = _.toString("utf8");
      let C = attributeLines(str);
      let A = hasOverlongAttributeLine(str)
        ? "overlong_line"
        : C.some((R) => MACRO_OR_QUOTED_ATTR_RE.test(R))
          ? "macro_or_quoted"
          : C.some((R) => FILTER_ATTRIBUTE_RE.test(R))
            ? "rule"
            : undefined;
      return A === undefined
        ? {
            kind: "none",
            bytes: _,
            stamp,
            dir: l,
          }
        : {
            kind: "touches",
            by: A,
            bytes: _,
            stamp,
            dir: l,
          };
    } finally {
      await h.close();
    }
  } catch (error) {
    return getErrnoCode(error) === "ENOENT" || getErrnoCode(error) === "ENOTDIR"
      ? {
          kind: "none",
          bytes: null,
          stamp: null,
          dir: l,
        }
      : {
          kind: "unreadable",
          bytes: null,
          stamp: null,
        };
  }
}
//@ chunk-gjx0rh1b.js:66184-66532 placement
async function openGitInfoDir(e, n, r) {
  let o = await lstatBigintOrNull(e);
  let s = n && o === null ? await lstatBigintOrNull(dirname(e)) : null;
  let l = !o?.isSymbolicLink() ? o : r ? null : await lstatBigintOrNull(e, stat);
  let h = getPlatform() === "windows" && o?.isDirectory() === true ? await readJunction(e) : null;
  let u = h !== null && h.kind !== "directory" && !(h.kind === "error" && h.code === "EISDIR");
  return {
    node: o && fileStampFromBigStats(o),
    link: (o?.isSymbolicLink() ?? false) || u,
    target: l && fileStampFromBigStats(l),
    ...(s && {
      above: fileStampFromBigStats(s),
    }),
  };
}
//@ chunk-gjx0rh1b.js:66532-67173 placement
async function checkAlternatesFile(e, n) {
  if (!isAbsolute(n.objectsDir) || /[\r\n]/.test(n.objectsDir) || /^["#]/.test(n.objectsDir))
    return "the objects directory cannot be named in an alternates file";
  let r = {
    flag: GIT_STDERR_CAPTURE_FLAGS,
    mode: 384,
  };
  await mkdir(join(e, "objects", "info"), {
    recursive: true,
    mode: 448,
  });
  await Promise.all([
    mkdir(join(e, "refs"), {
      mode: 448,
    }),
    writeFile(
      join(e, "HEAD"),
      `ref: refs/heads/attributes-view
`,
      r,
    ),
    writeFile(
      join(e, "config"),
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
    writeFile(
      join(e, "objects", "info", "alternates"),
      `${n.objectsDir}
`,
      r,
    ),
  ]);
  return null;
}
//@ chunk-gjx0rh1b.js:67173-67819 placement
async function readSymlinkTarget(e, n, r) {
  let filtered = r.filter((u) => u.kind === "symlink");
  let s = [];
  let l = new Map();
  for (let u of filtered) {
    let str = u.target.toString("utf8");
    if (!Buffer.from(str, "utf8").equals(u.target))
      return stepFailure("path-encoding", `${u.path}: link target is not valid UTF-8`);
    let w = await e(["hash-object", "-w", "--stdin"], undefined, str);
    if (w.code !== 0) return stepFailure("hash-object", w.stderr, w);
    s.push(`${SYMLINK_MODE_VALUE} ${w.stdout.trim()}	${u.path}`);
    l.set(u.path, w.stdout.trim().toLowerCase());
  }
  if (s.length === 0)
    return {
      kind: "laid",
      ids: l,
    };
  let h = await e(
    ["update-index", "-z", "--index-info"],
    {
      GIT_INDEX_FILE: n,
    },
    s.map((u) => `${u}\x00`).join(""),
  );
  return h.code === 0
    ? {
        kind: "laid",
        ids: l,
      }
    : stepFailure("update-index", h.stderr, h);
}
//@ chunk-gjx0rh1b.js:67819-68548 placement
async function listSkipWorktreeEntries(e, n, r, o) {
  let s = await r(["--ignore-skip-worktree-entries"], n);
  if ((s.exitCode === GIT_SIGPIPE_EXIT_CODE ? await r([], n) : s).code !== 0) return null;
  let h = new Set(o);
  let u = new Map();
  let p = await open(`${n}.listing`, GIT_STDOUT_CAPTURE_FLAGS, 384);
  try {
    if (
      (
        await e(
          ["ls-files", "-s", "-z"],
          {
            GIT_INDEX_FILE: n,
          },
          undefined,
          undefined,
          p.fd,
        )
      ).code !== 0
    )
      return null;
    let _ = "";
    await readFileChunks(p, (y) => {
      let parts = (_ + y.toString("latin1")).split("\x00");
      _ = parts.pop() ?? "";
      for (let C of parts) {
        let index = C.indexOf("\t");
        let [R, B, x] = index === -1 ? [] : C.slice(0, index).split(" ");
        let str = Buffer.from(C.slice(index + 1), "latin1").toString("utf8");
        if (R !== undefined && B !== undefined && x === "0" && h.has(str))
          u.set(str, {
            mode: R,
            id: B.toLowerCase(),
          });
      }
    });
  } finally {
    await p.close().catch(() => {});
    await rm(`${n}.listing`, {
      force: true,
    }).catch(() => {});
  }
  return o.every((w) => u.has(w)) ? u : null;
}
//@ chunk-gjx0rh1b.js:68548-68730 placement
async function isNotPlainDirectory(e, n) {
  if (n.includes("\uFFFD") || (await lstatOrAbsent(e, n)) !== "clear") return true;
  try {
    return !(await lstat(join(e, n))).isDirectory();
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    return errnoCode !== "ENOENT" && errnoCode !== "ENOTDIR";
  }
}
//@ chunk-gjx0rh1b.js:68730-69762 placement
async function compareWorktreeEntry(
  e,
  { path, status, oldMode, newMode, oldId, newId },
  u,
  p = MAX_STASH_FILE_BYTES,
  signal,
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
    let worktreeFile = await readWorktreeFileSafely(e, path, u);
    if (worktreeFile.kind === "symlink")
      return newMode === SYMLINK_MODE_VALUE &&
        (blobSha1(worktreeFile.target) === oldId ||
          (getPlatform() === "windows" &&
            blobSha1(
              await readlink(join(e, path), {
                encoding: "buffer",
              }),
            ) === oldId))
        ? "unchanged"
        : "changed";
    if (worktreeFile.kind !== "file") return worktreeFile.kind === "refused" ? "open_refused" : "changed";
    let { handle, size } = worktreeFile;
    try {
      if (!REGULAR_FILE_MODES.includes(newMode) || size > p) return "changed";
      let stats = await handle.stat({
        bigint: true,
      });
      let A = createHash("sha1").update(`blob ${size}\x00`);
      let R = Buffer.allocUnsafe(Math.min(size, 1048576));
      let B = 0;
      while (B < size) {
        if (signal?.aborted) return "changed";
        let { bytesRead } = await handle.read(R, 0, Math.min(R.length, size - B), B);
        if (bytesRead === 0) return "changed";
        A.update(R.subarray(0, bytesRead));
        B += bytesRead;
      }
      if (A.digest("hex") !== oldId) return "changed";
      let stats_2 = await handle.stat({
        bigint: true,
      });
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
//@ chunk-gjx0rh1b.js:69762-70712 placement
/**
 * 种子索引文件名模式与疑似凭据文件名模式（env、netrc、credential、密钥等）。
 */
var SEED_INDEX_NAME_PATTERN = /^ccr-seed-([0-9]+)-[0-9a-f]{12}\.index(?:\.lock)?$/;
var CREDENTIAL_NAME_RE =
  /env|netrc|npmrc|yarnrc|pypirc|pgpass|\.cnf|terraform|tfvars|tfstate|boto|s3cfg|credential|gitconfig|mcp|claude|config|bash|profile|zsh|zlog|fish|history|consolehost|\.(?:pem|key|p12|pfx|keystore|jks|kdbx|ovpn|vars|ssh|aws|azure|gnupg|kube|docker|git)|_(?:rsa|dsa|ecdsa|ed25519)|secret|settings|gradle\.properties|device-keys|service.?account|deploy_key|htpasswd|htdigest|vault[-_](?:token|pass)|dockercfg|msmtprc|fetchmailrc|sentryclirc|clasprc|transifexrc|databrickscfg|remote-sync|wakatime/i;
var DRIVE_NAME_PREFIX_RE = `[${DECORATION_LEAD_CHARS.replace(/[\\\]^-]/g, "\\$&")}]|_${EDITOR_BACKUP_SUFFIX_REGEX}_`;
var credentialConfigPathSpellings = uniq(CREDENTIAL_CONFIG_PATHS.map(([e]) => e));
var regExp = new RegExp(
  `(?:^|/)(?:(?:${DRIVE_NAME_PREFIX_RE})[^/]*)?(?:\\.(?:ssh|aws|azure|gnupg|kube|docker|config|cargo|gem|m2|gradle|claude)|documents|appdata|library|(?:${credentialConfigPathSpellings.join("|")})(?![a-z0-9-]))|\\.git`,
  "i",
);
var replaced = DECORATION_LEAD_CHARS.replace(/[\\\]^-]/g, "\\$&");
var regExp_2 = new RegExp(`(?:[${replaced}][^/${replaced}]*){4}|${SYNC_CONFLICT_SUFFIX_PATTERN}`, "i");
var regExp_3 = new RegExp(`(?:^|/)[^/]{${MAX_NAME_READING_LENGTH + 1}}`);
//@ chunk-gjx0rh1b.js:70712-71692 placement
function checkCredentialLikePaths() {
  let e = new Map();
  let n = new Map();
  let r = new Map();
  return (o) => {
    if (!isPlainRelativePath(o) || o.includes("\\") || (o.includes(":") && getPlatform() === "windows"))
      return isSensitiveNameOrVariant(o);
    let s = ASCII_ONLY_RE.test(o)
      ? o
      : o
          .replaceAll("\u0131", "i")
          .replaceAll("\u017F", "s")
          .replaceAll("\u212A", "k")
          .replace(NON_ASCII_RE, "");
    let index = s.lastIndexOf("/");
    let h = index === -1 ? "" : s.slice(0, index);
    let index_2 = o.lastIndexOf("/");
    let p = index_2 === -1 ? "" : o.slice(0, index_2);
    let w = e.get(p);
    if (w === undefined) {
      let C = index !== -1 && looksLikeCredentialPath(p, h);
      let A = C ? h.split("/") : [];
      let R = C
        ? p.split("/").map((B, x) => {
            let S = A[x];
            if (S !== undefined && !looksLikeCredentialPath(B, S)) return "passed";
            let z =
              n.get(B) ??
              ((S !== undefined && !hasAlternateCredentialSpelling(B, S)) ||
              !isSensitiveNameOrVariant(`${B}/.bak`)
                ? "passed"
                : isSensitiveNameOrVariant(`${B}/x`)
                  ? "withheld"
                  : "asked");
            n.set(B, z);
            return z;
          })
        : [];
      w = R.includes("withheld")
        ? "withheld"
        : R.includes("asked") ||
            (index !== -1 && (regExp.test(h) || hasConfusableCredentialSegment(regExp, p)))
          ? "asked"
          : "passed";
      e.set(p, w);
    }
    if (w !== "passed") return w === "withheld" || isSensitiveNameOrVariant(o);
    let sliced = s.slice(index + 1);
    let sliced_2 = o.slice(index_2 + 1);
    if (
      index !== -1 &&
      (regExp_4.test(sliced) || regExp_4.test(sliced_2)) &&
      (CREDENTIAL_NAME_RE.test(h) || hasConfusableCredentialSegment(CREDENTIAL_NAME_RE, p))
    )
      return isSensitiveNameOrVariant(o);
    if (
      !CREDENTIAL_NAME_RE.test(sliced) &&
      !hasAlternateCredentialSpelling(sliced_2, sliced) &&
      !hasConfusableCredentialSegment(CREDENTIAL_NAME_RE, sliced_2)
    )
      return false;
    let E = r.get(sliced_2);
    if (E === undefined) {
      E = isSensitiveNameOrVariant(sliced_2);
      r.set(sliced_2, E);
    }
    return E;
  };
}
//@ chunk-gjx0rh1b.js:71692-71852 placement
function hasConfusableCredentialSegment(regExp, n) {
  return (
    n.includes(":") &&
    n
      .split("/")
      .filter((r) => r.includes(":"))
      .some((r) => {
        let o = expandNameReadings(r);
        return nameReadingFns(r).some((s) => o.some((l) => regExp.test(s(l))));
      })
  );
}
//@ chunk-gjx0rh1b.js:71852-71942 placement
function looksLikeCredentialPath(e, n) {
  return (
    (e.length > MAX_NAME_READING_LENGTH && regExp_3.test(e)) ||
    regExp_2.test(e) ||
    (n !== e && regExp_2.test(n)) ||
    hasConfusableCredentialSegment(regExp_2, e)
  );
}
//@ chunk-gjx0rh1b.js:71942-72045 placement
function hasAlternateCredentialSpelling(e, n) {
  return (
    looksLikeCredentialPath(e, n) &&
    (e.length > MAX_NAME_READING_LENGTH ||
      expandNameReadings(e).length > 1 ||
      nameReadingFns(e).some((r) => expandNameReadings(r(e)).length > 1))
  );
}
//@ chunk-gjx0rh1b.js:72045-72121 placement
var NON_ASCII_RE = /[^\x20-\x7e]/gu;
var ASCII_ONLY_RE = /^[\x20-\x7e]*$/;
var regExp_4 = new RegExp(`^(?:${DRIVE_NAME_PREFIX_RE})`, "i");
//@ chunk-gjx0rh1b.js:72121-73074 placement
async function lstatNoFollow(e, n) {
  let r;
  try {
    r = await open(e, readOnlyNoFollowFlags());
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    return errnoCode === "ELOOP" || errnoCode === "ENOENT" || errnoCode === "ENOTDIR"
      ? {
          kind: "tamper",
          detail: `something other than the scratch index this build wrote stands at its name (${errnoCode})`,
        }
      : {
          kind: "disk",
          detail: `the scratch index could not be opened (${errnoCode ?? "an error"})`,
        };
  }
  try {
    let stats = await r.stat();
    if (!stats.isFile() || stats.nlink !== 1)
      return {
        kind: "tamper",
        detail: "something other than the scratch index this build wrote stands at its name",
      };
    let s = await open(n, GIT_STDERR_CAPTURE_FLAGS, 384);
    try {
      let l = Buffer.allocUnsafe(1048576);
      for (let h = 0; h < stats.size;) {
        let { bytesRead } = await r.read(l, 0, Math.min(l.length, stats.size - h), h);
        if (bytesRead === 0)
          return {
            kind: "tamper",
            detail: "the scratch index changed while it was carried off",
          };
        await s.write(l, 0, bytesRead);
        h += bytesRead;
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
var STALE_SEED_MAX_AGE_MS = 600000;
var SEED_INDEX_PROCESS_RE = /^claude-seed-index-([0-9]+)-/;
//@ chunk-gjx0rh1b.js:73122-73312 placement
async function unlinkWithRetry(e) {
  for (let idx = 0; ; idx++)
    try {
      await unlink(e);
      return null;
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ENOENT") return null;
      if (idx >= 3 || (errnoCode !== "EBUSY" && errnoCode !== "EPERM" && errnoCode !== "EACCES"))
        return errnoCode ?? errorMessage(error);
      await sleep(50);
    }
}
//@ chunk-gjx0rh1b.js:73312-73562 placement = convertDirectoryToZipInPlace (0.79)
/**
 * 清理以 PID 命名的过期目录：名字里的 PID 对应进程已不存在、且目录修改时间超过保留时限时递归删除；出错静默忽略。
 */
async function pruneStaleProcessDirs(tempDir) {
  try {
    await Promise.all(
      (await readdir(tempDir)).map(async (n) => {
        let r = SEED_INDEX_PROCESS_RE.exec(n)?.[1];
        if (r === undefined) return;
        let o = join(tempDir, n);
        let zipData = await lstat(o);
        if (
          zipData.isDirectory() &&
          Date.now() - zipData.mtimeMs > STALE_SEED_MAX_AGE_MS &&
          !isProcessAlive(Number(r))
        )
          await rm(o, {
            recursive: true,
            force: true,
          });
      }),
    );
  } catch {}
}
//@ chunk-gjx0rh1b.js:73562-73780 placement
/**
 * 清理以 PID 命名的过期 seed 索引文件：文件名匹配 seed 索引格式、修改时间超过保留时限且对应进程已不存在时删除（只删文件，不是目录）；出错静默忽略。
 */
async function pruneStaleSeedIndexes(gitDir) {
  try {
    await Promise.all(
      (await readdir(gitDir)).map(async (n) => {
        let r = SEED_INDEX_NAME_PATTERN.exec(n)?.[1];
        if (r === undefined) return;
        let o = join(gitDir, n);
        if (Date.now() - (await lstat(o)).mtimeMs > STALE_SEED_MAX_AGE_MS && !isProcessAlive(Number(r)))
          await rm(o, {
            force: true,
          });
      }),
    );
  } catch {}
}
//@ chunk-gjx0rh1b.js:73780-73859 placement
function isProcessAlive(e) {
  try {
    process.kill(e, 0);
    return true;
  } catch (error) {
    return getErrnoCode(error) === "EPERM";
  }
}
//@ chunk-gjx0rh1b.js:73859-73919 placement
async function listDirectoriesAmong(workTree, n) {
  return (await classifyPathsAsDirectories(workTree, n)).notDirectories;
}
//@ chunk-gjx0rh1b.js:73919-74140 placement
async function classifyPathsAsDirectories(e, n) {
  let r = limitConcurrency(GIT_READ_CONCURRENCY, async (s) =>
    (await lstatOrAbsent(e, s)) === "clear" ? classifyDirEntry(join(e, s)) : "other",
  );
  let results = await Promise.all(n.map(r));
  return {
    notDirectories: n.filter((s, l) => results[l] !== "directory"),
    special: n.filter((s, l) => results[l] === "special"),
  };
}
//@ chunk-gjx0rh1b.js:74140-74288 placement
async function classifyDirEntry(e) {
  try {
    let n = await lstat(e);
    return n.isDirectory() ? "directory" : n.isFile() || n.isSymbolicLink() ? "other" : "special";
  } catch {
    return "other";
  }
}
//@ chunk-gjx0rh1b.js:74288-74574 placement
async function describeStashBase(e, base) {
  let [r, o] = await Promise.all([
    e(["symbolic-ref", "-q", "HEAD"]),
    e(["rev-list", "--max-count=1", "--format=%h %s", base, "--"]),
  ]);
  let s = r.code === 0 ? r.stdout.trim().replace(/^refs\/heads\//, "") : "(no branch)";
  let l =
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
async function describeStashEntryChange(changedFilesForStash, n, r, o, s) {
  let mapped = changedFilesForStash.entries
    .filter((entry) => (entry.kind === "changed" || entry.kind === "absent") && n.has(entry.path))
    .map(({ path }) => path);
  if (mapped.length === 0) return changedFilesForStash;
  let h = new Set(
    changedFilesForStash.entries.flatMap((entry) =>
      entry.kind === "absent" && n.has(entry.path) ? [entry.path] : [],
    ),
  );
  let u = missingGitattributesPaths(mapped);
  let p = [...mapped, ...u.filter((x) => n.has(x))];
  let w = new Set(
    changedFilesForStash.entries.flatMap((entry) => (entry.kind === "changed" ? [entry.path] : [])),
  );
  let results = await Promise.all(u.map((x) => hashFileOrAbsent(join(o, x))));
  await Promise.all(u.map((x) => unlink(join(o, x)).catch(() => {})));
  let y = await s(p);
  if ("refused" in y) return y;
  let results_2 = await Promise.all(u.map((x) => hashFileOrAbsent(join(o, x))));
  let C = new Set(y.copies.flatMap((copy) => (copy.kind === "file" ? [copy.path] : [])));
  let found = u.find((x, S) => (w.has(x) ? !C.has(x) : results[S] === null || results[S] !== results_2[S]));
  if (found !== undefined)
    return {
      refused: `${found}: changed while it was being read`,
      tooLarge: false,
      momentary: true,
    };
  let R = new Set([...mapped, ...u]);
  let B = new Set(mapped);
  return {
    entries: [
      ...changedFilesForStash.entries.filter((entry) => !R.has(entry.path)),
      ...y.entries
        .filter((entry) => R.has(entry.path))
        .map((entry) =>
          entry.kind === "absent" && B.has(entry.path) && (!h.has(entry.path) || r.has(entry.path))
            ? {
                kind: "changed",
                path: entry.path,
              }
            : entry,
        ),
    ],
    copies: [...changedFilesForStash.copies.filter((copy) => !R.has(copy.path)), ...y.copies],
  };
}
//@ chunk-gjx0rh1b.js:75644-75810 placement
async function markPathsIntentToAdd(e, n, baseTree, o) {
  return o.length === 0
    ? {
        code: 0,
        stderr: "",
      }
    : e(
        ["update-index", "-z", "--index-info"],
        n,
        o.map((s) => `0 ${"0".repeat(baseTree.length)}	${s}\x00`).join(""),
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
    .flatMap((u) =>
      u.length > 2
        ? [
            {
              tag: u[0],
              path: u.slice(2),
            },
          ]
        : [],
    );
  let l = new Set(flattened.flatMap(({ tag, path }) => (tag === "S" || tag === "s" ? [path] : [])));
  let h = new Set(flattened.map(({ path }) => path));
  return {
    skipWorktree: l,
    unseen: new Set([
      ...l,
      ...flattened.flatMap(({ tag, path }) => (tag !== tag.toUpperCase() ? [path] : [])),
    ]),
    absent: new Set(r.filter((u) => !h.has(u))),
  };
}
//@ chunk-gjx0rh1b.js:76346-76493 placement
async function hashFileOrAbsent(e) {
  try {
    return createHash("sha1")
      .update(await readFile(e))
      .digest("hex");
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    return errnoCode === "ENOENT" || errnoCode === "ENOTDIR" ? "absent" : null;
  }
}
export {
  STASH_IDENTITY_ENV,
  captureWipStash,
  createStashCommit,
  formatDirectoryLabel,
  HEAD_UNVERIFIABLE_TEXT,
  isNotPlainDirectory,
  lstatOrAbsent,
};
