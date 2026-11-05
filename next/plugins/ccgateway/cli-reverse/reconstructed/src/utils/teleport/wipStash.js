/**
 * utils/teleport/wipStash.ts
 *
 * 2.1.316 新增：上传前捕获未提交修改（WIP stash）：安全读取工作树文件、对比索引/HEAD、构造种子树与引用
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-sfy2wa1e.js (108)
 * attribution: placement 108
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { normalizeCaseForComparison_2 } from "../permissions/filesystem.js";
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
  EDITOR_BACKUP_SUFFIX_SOURCE,
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
import { countWhere } from "../collections.js";
import { listGitRefs } from "../git/builderGit/gitConfigAudit.js";
import { splitIndexOffArgs, indexFileEnv } from "../git/builderGit/repoCopy.js";
import { createReachCollector } from "../git/builderGit/sandboxReach.js";
import { hasUnsafeCharSegment } from "../windowsPathNames.js";
import { getFirstLine, truncateCodePoints, firstLineOf } from "../stringUtils.js";
import { readOnlyNoFollowFlags } from "../platformTargets.js";
import { readJunction } from "../fsJunctions.js";
import { sleep } from "../sleep.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-sfy2wa1e.js:14108-14141 placement
var MAX_CONCURRENT_FILE_READS = 8;
var MAX_FILE_READ_CHUNK_BYTES = 1048576;
var DARWIN_NOFOLLOW_FLAG = 536870912;
//@ chunk-sfy2wa1e.js:14141-17595 placement
/**
 * 读取变更文件内容（只接受 git 会写的路径、累计大小上限、硬链接/变化检测）。
 */
async function readChangedFilesForStash(workTree, names, entries, sizeCap, ioHooks) {
  let found = entries.find((found) => !isPlainRelativePath(found));
  if (found !== undefined)
    return {
      refused: `${found}: not a path git writes`,
      tooLarge: false,
      momentary: false,
    };
  let totalBytes = 0;
  let largestFile = null;
  let gitattributesPaths = missingGitattributesPaths(entries);
  let entrySet = new Set(entries);
  let readOneFile = limitConcurrency(MAX_CONCURRENT_FILE_READS, async (relativePath) => {
    await ioHooks.beforeOpen?.(relativePath);
    let isEntryMoved = false;
    let statKind = await lstatOrAbsent(workTree, relativePath);
    if (statKind === "symlink")
      return {
        kind: "absent",
        path: relativePath,
      };
    if (statKind === "unreadable")
      return {
        refused: `${relativePath}: a directory above it could not be inspected`,
        tooLarge: false,
        momentary: true,
      };
    await ioHooks.beforeRead?.(relativePath);
    let worktreeFile = await readWorktreeFileSafely(workTree, relativePath, ioHooks.ntfsRules);
    let checkIdentity = (expected) => compareFileIdentity(workTree, relativePath, expected);
    switch (worktreeFile.kind) {
      case "absent":
        return {
          kind: "absent",
          path: relativePath,
        };
      case "refused":
        return entrySet.has(relativePath)
          ? {
              refused: `${relativePath}: ${worktreeFile.why}`,
              tooLarge: false,
              momentary: worktreeFile.momentary,
            }
          : {
              kind: "absent",
              path: relativePath,
            };
      case "hardlinked":
        return {
          kind: "hardlinked",
          path: relativePath,
        };
      case "moved":
        return {
          kind: "changed",
          path: relativePath,
        };
      case "not_read":
        return (worktreeFile.why === "name_not_plain" || worktreeFile.why === "beyond_a_link") &&
          !entrySet.has(relativePath)
          ? {
              kind: "absent",
              path: relativePath,
            }
          : {
              kind: "not_read",
              path: relativePath,
              why: worktreeFile.why,
            };
      case "symlink":
        return {
          kind: "symlink",
          path: relativePath,
          target: worktreeFile.target,
        };
      case "file":
        try {
          totalBytes += worktreeFile.size;
          if (largestFile === null || worktreeFile.size > largestFile.size)
            largestFile = {
              path: relativePath,
              size: worktreeFile.size,
            };
          if (totalBytes > sizeCap)
            return {
              refused: `${largestFile.path} (largest, ${largestFile.size} bytes): ${totalBytes} bytes of changed files exceed the ${sizeCap}-byte cap`,
              tooLarge: true,
              momentary: false,
            };
          let targetPath = join(names, relativePath);
          await mkdir(dirname(targetPath), {
            recursive: true,
          });
          let targetHandle;
          try {
            targetHandle = await open(
              targetPath,
              constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | READ_LIMITS,
              worktreeFile.executable ? 493 : 420,
            );
          } catch (error) {
            if (getErrnoCode(error) === "EEXIST")
              return {
                refused: `${relativePath}: collides with another changed path that differs only in case or normalization`,
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
              ioHooks.notOlderThanNs !== undefined &&
              stats.ctimeNs >= ioHooks.notOlderThanNs &&
              stats.ctimeNs < (BigInt(Date.now()) + 1n) * 1000000n
            ) {
              await targetHandle.close();
              await unlink(targetPath).catch(() => {});
              return {
                kind: "changed",
                path: relativePath,
                sincePassStart: true,
              };
            }
            let hash = createHash("sha256");
            let blobHasher =
              ioHooks.objectFormat === undefined
                ? null
                : createHash(ioHooks.objectFormat).update(`blob ${stats.size}\x00`);
            let crlfCount = 0;
            let lastWasCr = false;
            let chunkBuffer = Buffer.allocUnsafe(Math.min(worktreeFile.size, MAX_FILE_READ_CHUNK_BYTES));
            let bytesCopied = 0;
            while (bytesCopied < worktreeFile.size) {
              let { bytesRead } = await worktreeFile.handle.read(
                chunkBuffer,
                0,
                Math.min(chunkBuffer.length, worktreeFile.size - bytesCopied),
                bytesCopied,
              );
              if (bytesRead === 0) break;
              hash.update(chunkBuffer.subarray(0, bytesRead));
              if (blobHasher !== null) {
                let content = chunkBuffer.subarray(0, bytesRead);
                blobHasher.update(content);
                crlfCount += countCrlf(content, lastWasCr);
                lastWasCr = content.at(-1) === 13;
              }
              let writeOffset = 0;
              while (writeOffset < bytesRead) {
                let { bytesWritten } = await targetHandle.write(
                  chunkBuffer,
                  writeOffset,
                  bytesRead - writeOffset,
                );
                writeOffset += bytesWritten;
              }
              bytesCopied += bytesRead;
            }
            await ioHooks.afterRead?.(relativePath);
            let stats_2 = await worktreeFile.handle.stat({
              bigint: true,
            });
            let lfHasher =
              ioHooks.objectFormat !== undefined && crlfCount > 0
                ? createLfBlobHasher(ioHooks.objectFormat, bytesCopied, crlfCount)
                : null;
            if (
              BigInt(bytesCopied) !== stats.size ||
              stats_2.size !== stats.size ||
              stats_2.mtimeNs !== stats.mtimeNs ||
              stats_2.ctimeNs !== stats.ctimeNs ||
              !(await hashFileWithinLimit(worktreeFile.handle, bytesCopied, hash.digest(), lfHasher?.update))
            ) {
              await targetHandle.close();
              await unlink(targetPath).catch(() => {});
              return {
                kind: "changed",
                path: relativePath,
              };
            }
            let identityChange = await checkIdentity(worktreeFile);
            if (identityChange !== "same") {
              await targetHandle.close();
              await unlink(targetPath).catch(() => {});
              return {
                kind: identityChange,
                path: relativePath,
              };
            }
            await targetHandle.utimes(worktreeFile.atime, worktreeFile.mtime);
            let filePath = await targetHandle.stat({
              bigint: true,
            });
            return {
              kind: "file",
              path: relativePath,
              bytes: bytesCopied,
              copy: {
                ino: Number(filePath.ino),
                dev: Number(filePath.dev),
                ctimeNs: filePath.ctimeNs,
                size: Number(filePath.size),
                identity: getFileIdentity(filePath),
                ...(blobHasher !== null && {
                  blobId: blobHasher.digest("hex"),
                  ...(lfHasher !== null && {
                    lfBlobId: lfHasher.digest(),
                  }),
                }),
              },
            };
          } finally {
            await targetHandle.close().catch(() => {});
          }
        } catch (error) {
          let errnoCode = getErrnoCode(error);
          return {
            refused: `${relativePath}: could not be staged (${errnoCode ?? errorMessage(error)})`,
            tooLarge: false,
            momentary: errnoCode === undefined || !TRANSIENT_STAT_ERRNOS.has(errnoCode),
          };
        } finally {
          await worktreeFile.handle.close();
        }
    }
  });
  let results = await Promise.all([...entries, ...gitattributesPaths].map(readOneFile));
  let found_2 = results.find((result) => "refused" in result);
  if (found_2 !== undefined)
    return found_2.tooLarge
      ? {
          ...found_2,
          claimedBytes: totalBytes,
        }
      : found_2;
  let filtered = results.filter((result) => !("refused" in result));
  let flattened = filtered.flatMap((result) => (result.kind === "not_read" ? [result.why] : []));
  return {
    entries: filtered.filter(
      (result) =>
        entrySet.has(result.path) ||
        result.kind === "hardlinked" ||
        result.kind === "changed" ||
        result.kind === "not_read",
    ),
    copies: filtered.flatMap((result) =>
      result.kind === "file"
        ? [result]
        : isGitattributesPath(result.path)
          ? [
              {
                kind: "absent",
                path: result.path,
              },
            ]
          : [],
    ),
  };
}
//@ chunk-sfy2wa1e.js:17595-18050 placement
/**
 * 确认暂存副本在 git 读取期间未被改动（比较 inode、大小、ctime 等）。
 */
async function stagedCopiesUnchanged(workTree, copies) {
  return (
    await Promise.all(
      copies.map(async (copy) => {
        if (copy.kind === "absent")
          return lstat(join(workTree, copy.path)).then(
            () => false,
            (error) => {
              let errnoCode = getErrnoCode(error);
              return errnoCode === "ENOENT" || errnoCode === "ENOTDIR";
            },
          );
        if (copy.kind !== "file") return true;
        try {
          let filePath = await lstat(join(workTree, copy.path), {
            bigint: true,
          });
          return (
            filePath.isFile() &&
            filePath.nlink === 1n &&
            Number(filePath.ino) === copy.copy.ino &&
            Number(filePath.dev) === copy.copy.dev &&
            getFileIdentity(filePath) === copy.copy.identity &&
            filePath.ctimeNs === copy.copy.ctimeNs &&
            Number(filePath.size) === copy.copy.size
          );
        } catch {
          return false;
        }
      }),
    )
  ).every(Boolean);
}
//@ chunk-sfy2wa1e.js:18050-18120 placement (2.1.88 match: getFileIdentity, 0.795)
function getFileIdentity(filePath) {
  return filePath.dev === 0n || filePath.ino === 0n ? null : `${filePath.dev}:${filePath.ino}`;
}
//@ chunk-sfy2wa1e.js:18120-18328 placement
async function compareFileIdentity(workTree, path, expected) {
  let stats = await lstat(join(workTree, path), {
    bigint: true,
  }).catch(() => null);
  if (stats !== null && stats.isFile() && stats.nlink > 1n) return "hardlinked";
  return stats === null || !stats.isFile() || stats.ino !== expected.ino || stats.dev !== expected.dev
    ? "changed"
    : "same";
}
//@ chunk-sfy2wa1e.js:18328-18589 placement
async function hashFileWithinLimit(handle, maxBytes, limit, update) {
  let hash = createHash("sha256");
  let buffer = Buffer.allocUnsafe(Math.min(maxBytes + 1, MAX_FILE_READ_CHUNK_BYTES));
  let offset = 0;
  for (;;) {
    let { bytesRead } = await handle.read(buffer, 0, buffer.length, offset);
    if (bytesRead === 0) break;
    hash.update(buffer.subarray(0, bytesRead));
    update?.(buffer.subarray(0, bytesRead));
    offset += bytesRead;
    if (offset > maxBytes) return false;
  }
  return offset === maxBytes && hash.digest().equals(limit);
}
//@ chunk-sfy2wa1e.js:18589-18916 placement
/**
 * 创建计算 blob 哈希的流式哈希器，把 CRLF 转为 LF 计算。
 */
function createLfBlobHasher(algorithm, size, headerLength) {
  let hash = createHash(algorithm).update(`blob ${size - headerLength}\x00`);
  let keepOpen = false;
  return {
    update(chunk) {
      if (chunk.length === 0) return;
      if (keepOpen && chunk[0] !== 10) hash.update(Buffer.from([13]));
      keepOpen = chunk.at(-1) === 13;
      let lineChunk = keepOpen ? chunk.subarray(0, chunk.length - 1) : chunk;
      hash.update(
        lineChunk.toString("latin1").replaceAll(
          `\r
`,
          `
`,
        ),
        "latin1",
      );
    },
    digest() {
      if (keepOpen) hash.update(Buffer.from([13]));
      return hash.digest("hex");
    },
  };
}
//@ chunk-sfy2wa1e.js:18916-19061 placement
function isGitattributesPath(path) {
  let platform = getPlatform();
  let segment = splitPathSegments(path).at(-1) ?? "";
  return platform === "macos" || platform === "windows" || platform === "wsl"
    ? segment.toLowerCase() === ".gitattributes"
    : segment === ".gitattributes";
}
//@ chunk-sfy2wa1e.js:19061-19201 placement
function missingGitattributesPaths(paths) {
  let seen = new Set(paths);
  return (
    paths.length === 0
      ? []
      : [".gitattributes", ...listAncestorDirs(paths).map((rel) => `${rel}/.gitattributes`)]
  ).filter((attributesPath) => !seen.has(attributesPath));
}
//@ chunk-sfy2wa1e.js:19201-19270 placement
var TRANSIENT_STAT_ERRNOS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-sfy2wa1e.js:19201", () => {
  TRANSIENT_STAT_ERRNOS = new Set(["ENAMETOOLONG", "ENOTDIR", "EISDIR", "EINVAL", "ELOOP"]);
});
//@ chunk-sfy2wa1e.js:19270-19286 placement
var BACKSLASH_BYTE = 92;
var SLASH_BYTE = 47;
//@ chunk-sfy2wa1e.js:19286-19367 placement
function normalizeSymlinkBytes(viaProcFd, platform = getPlatform()) {
  return platform === "windows"
    ? Buffer.from(viaProcFd.map((segment) => (segment === BACKSLASH_BYTE ? SLASH_BYTE : segment)))
    : viaProcFd;
}
//@ chunk-sfy2wa1e.js:19367-19658 placement
async function openViaProcFd(path, platform) {
  if (platform !== "linux")
    return readlink(path, {
      encoding: "buffer",
    });
  let handle = await open(dirname(path), O_NOFOLLOW_ANY | constants.O_DIRECTORY | READ_LIMITS);
  try {
    let dirHandle = `/proc/self/fd/${handle.fd}`;
    let dirTarget = await readlink(dirHandle);
    return dirTarget === dirname(path)
      ? await readlink(join(dirHandle, basename(path)), {
          encoding: "buffer",
        })
      : dirTarget === `${dirname(path)} (deleted)`
        ? "moved"
        : "elsewhere";
  } finally {
    await handle.close();
  }
}
//@ chunk-sfy2wa1e.js:19658-21523 placement
/**
 * 以不跟随链接方式读取工作树文件，检测被替换、硬链接、变化。
 */
async function readWorktreeFileSafely(workTree, relPath, entry) {
  if (!isSafeRepoRelativePath(relPath, entry))
    return {
      kind: "refused",
      why: "not a path git writes",
      momentary: false,
    };
  let absPath = join(workTree, relPath);
  let platform = "linux";
  let openFlags =
    constants.O_RDONLY |
    (platform === "darwin" ? DARWIN_NOFOLLOW_FLAG : constants.O_NOFOLLOW) |
    (constants.O_NONBLOCK ?? 0) |
    (constants.O_NOCTTY ?? 0);
  let handle;
  try {
    if (platform === "win32") {
      let linkStat = await lstat(absPath);
      if (linkStat.isSymbolicLink())
        throw Object.assign(Error("symbolic link"), {
          code: "ELOOP",
        });
      if (!linkStat.isFile())
        return {
          kind: "refused",
          why: "not a regular file",
          momentary: false,
        };
    }
    handle = await open(absPath, platform === "win32" ? "r" : openFlags);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR")
      return {
        kind: "absent",
      };
    if (errnoCode === "ELOOP" || errnoCode === "EMLINK" || errnoCode === "EFTYPE")
      try {
        let viaProcFd = await openViaProcFd(absPath, platform);
        if (viaProcFd === "moved")
          return {
            kind: "moved",
          };
        let statKind = await lstatOrAbsent(workTree, relPath);
        if (statKind === "symlink")
          return {
            kind: "absent",
          };
        if (statKind === "unreadable")
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
    let fileStat = platform === "win32" ? null : await lstat(absPath).catch(() => null);
    let isSpecialFile = fileStat !== null && !fileStat.isFile() && !fileStat.isSymbolicLink();
    return {
      kind: "refused",
      why: `could not be opened (${errnoCode ?? "unknown"})`,
      momentary: !isSpecialFile && (errnoCode === undefined || !TRANSIENT_STAT_ERRNOS.has(errnoCode)),
    };
  }
  try {
    let stats = await handle.stat({
      bigint: true,
    });
    if (!stats.isFile()) {
      await handle.close();
      return {
        kind: "refused",
        why: "not a regular file",
        momentary: false,
      };
    }
    if (stats.nlink > 1n) {
      await handle.close();
      return {
        kind: "hardlinked",
      };
    }
    if (platform === "linux") {
      let resolvedPath = await readlink(`/proc/self/fd/${handle.fd}`);
      if (resolvedPath !== absPath) {
        await handle.close();
        return resolvedPath === `${absPath} (deleted)` || dirname(resolvedPath) === dirname(absPath)
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
      handle,
      size: Number(stats.size),
      ino: stats.ino,
      dev: stats.dev,
      executable: (stats.mode & 0o111n) !== 0n,
      atime: stats.atime,
      mtime: stats.mtime,
    };
  } catch (error) {
    await handle.close().catch(() => {});
    let errnoCode = getErrnoCode(error);
    return {
      kind: "refused",
      why: errorMessage(error),
      momentary: errnoCode === undefined || !TRANSIENT_STAT_ERRNOS.has(errnoCode),
    };
  }
}
//@ chunk-sfy2wa1e.js:21523-21598 placement
function splitPathSegments(path) {
  return (getPlatform() === "windows" ? path.replaceAll("\\", "/") : path).split("/");
}
//@ chunk-sfy2wa1e.js:21598-21824 placement
async function lstatOrAbsent(workTree, relPath) {
  let current = workTree;
  for (let segment of splitPathSegments(relPath).slice(0, -1)) {
    current = join(current, segment);
    try {
      if ((await lstat(current)).isSymbolicLink()) return "symlink";
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return "clear";
      return "unreadable";
    }
  }
  return "clear";
}
//@ chunk-sfy2wa1e.js:21824-22354 placement
/**
 * 安全地读取工作树内小文件（确认未被替换、无硬链接），计算它可能对应的 blob id 集合（含 CRLF、ident 变体）。
 */
async function readWorktreeBlobIds(workTree, relPath, oidLength, maxBytes, runGit) {
  if ((await lstatOrAbsent(workTree, relPath)) !== "clear") return null;
  let opened = await readWorktreeFileSafely(workTree, relPath, runGit);
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
    let fileStat = await lstat(join(workTree, relPath), {
      bigint: true,
    }).catch(() => null);
    if (
      fileStat === null ||
      !fileStat.isFile() ||
      fileStat.nlink > 1n ||
      fileStat.ino !== opened.ino ||
      fileStat.dev !== opened.dev
    )
      return null;
    return candidateBlobIds(buffer.subarray(0, opened.size), oidLength);
  } catch {
    return null;
  } finally {
    await opened.handle.close().catch(() => {});
  }
}
//@ chunk-sfy2wa1e.js:22354-22459 placement
function candidateBlobIds(content, oidLength) {
  let algorithm = oidLength === 64 ? "sha256" : "sha1";
  let ids = collapseIdentKeywords(content);
  return [content, ...(ids === null ? [] : [ids])].flatMap((extra) => blobIdsForContent(extra, algorithm));
}
//@ chunk-sfy2wa1e.js:22459-22675 placement
function blobIdsForContent(content, algorithm) {
  let sha = createHash(algorithm).update(`blob ${content.length}\x00`).update(content).digest("hex");
  let crlf = countCrlf(content, false);
  if (crlf === 0) return [sha];
  let lfBlobHasher = createLfBlobHasher(algorithm, content.length, crlf);
  for (let offset = 0; offset < content.length; offset += MAX_FILE_READ_CHUNK_BYTES)
    lfBlobHasher.update(content.subarray(offset, offset + MAX_FILE_READ_CHUNK_BYTES));
  return [sha, lfBlobHasher.digest()];
}
//@ chunk-sfy2wa1e.js:22675-22731 placement
var DOLLAR_CHAR_CODE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var buffer_3;
var buffer_4;
deferInit("chunk-sfy2wa1e.js:22675", () => {
  DOLLAR_CHAR_CODE = 36;
  buffer_3 = Buffer.from("$Id:");
  buffer_4 = Buffer.from("$Id$");
});
//@ chunk-sfy2wa1e.js:22731-23104 placement
/**
 * 把展开的 $Id$ 关键字还原为未展开形式，无变化返回 null。
 */
function collapseIdentKeywords(content) {
  let index = content.indexOf(buffer_3);
  if (index === -1) return null;
  let index_2 = Buffer.allocUnsafe(content.length);
  let keyword = content.copy(index_2, 0, 0, index);
  let cursor = index;
  while (cursor < content.length) {
    let closingDollar = -1;
    if (
      content[cursor] === DOLLAR_CHAR_CODE &&
      content[cursor + 1] === buffer_3[1] &&
      content[cursor + 2] === buffer_3[2] &&
      content[cursor + 3] === buffer_3[3]
    ) {
      let scan = cursor + buffer_3.length;
      while (scan < content.length && content[scan] !== DOLLAR_CHAR_CODE && content[scan] !== 10) scan++;
      closingDollar = content[scan] === DOLLAR_CHAR_CODE ? scan : -1;
    }
    if (closingDollar === -1) index_2[keyword++] = content[cursor++];
    else {
      keyword += buffer_4.copy(index_2, keyword);
      cursor = closingDollar + 1;
    }
  }
  return keyword === content.length ? null : index_2.subarray(0, keyword);
}
//@ chunk-sfy2wa1e.js:23104-23238 placement
function countCrlf(content, startsAtFirstLine) {
  let count = startsAtFirstLine && content[0] === 10 ? 1 : 0;
  if (!content.includes(13)) return count;
  for (let idx = 1; idx < content.length; idx++) if (content[idx] === 10 && content[idx - 1] === 13) count++;
  return count;
}
//@ chunk-sfy2wa1e.js:23676-23831 placement
var SEED_READ_PROBLEMS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var TREE_READ_TAMPERED;
var TREE_READ_MISSING;
var MAX_OBJECT_BYTES;
var MAX_OBJECT_ENTRIES;
var KNOWN_TREE_MODES;
deferInit("chunk-sfy2wa1e.js:23676", () => {
  SEED_READ_PROBLEMS = {
    failed: "unreadable",
  };
  TREE_READ_TAMPERED = {
    failed: "tampered",
  };
  TREE_READ_MISSING = {
    failed: "missing",
  };
  MAX_OBJECT_BYTES = 67108864;
  MAX_OBJECT_ENTRIES = 4000000;
  KNOWN_TREE_MODES = new Set(["100644", "100755", "120000", "40000", "160000"]);
});
//@ chunk-sfy2wa1e.js:23831-23965 placement
function isTreeReadFailure(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Map) &&
    "failed" in value &&
    typeof value.failed === "string"
  );
}
//@ chunk-sfy2wa1e.js:23965-24076 placement
var TREE_MODE = "40000";
var GITLINK_MODE_2 = "160000";
var SYMLINK_MODE = "120000";
var padFileMode = (mode) => mode.padStart(6, "0");
var entryKindForMode = (mode) =>
  mode === GITLINK_MODE_2 ? "gitlink" : mode === SYMLINK_MODE ? "link" : "file";
//@ chunk-sfy2wa1e.js:24076-24597 placement
function batchCatFile(runGit, dir) {
  return async (paths) => {
    let tempDir = null;
    try {
      tempDir = await mkdtemp(join(dir, "claude-seed-reads-"));
      let batchFile = await open(
        join(tempDir, "batch"),
        constants.O_RDWR | constants.O_CREAT | constants.O_EXCL | READ_LIMITS,
        384,
      );
      try {
        let batchResult = await runGit(["cat-file", "--batch"], undefined, paths, undefined, batchFile.fd);
        let { size } = await batchFile.stat();
        if (batchResult.code !== 0 || size > MAX_OBJECT_BYTES) return null;
        let output = Buffer.alloc(size);
        for (let offset = 0; offset < size;) {
          let { bytesRead } = await batchFile.read(output, offset, size - offset, offset);
          if (bytesRead === 0) return null;
          offset += bytesRead;
        }
        return output;
      } finally {
        await batchFile.close().catch(() => {});
      }
    } catch {
      return null;
    } finally {
      if (tempDir !== null)
        await rm(tempDir, {
          recursive: true,
          force: true,
        }).catch(() => {});
    }
  };
}
//@ chunk-sfy2wa1e.js:24597-26346 placement
/**
 * 通过 git cat-file 批量读取对象，校验 sha1/sha256 哈希。
 */
class GitObjectReader {
  fetch;
  listings = new Map();
  bodies = new Map();
  algorithm;
  idLength;
  constructor(runGit, options) {
    this.fetch = runGit;
    this.algorithm = options.length === 64 ? "sha256" : "sha1";
    this.idLength = options.length;
  }
  hashes(type, body, expectedId) {
    return (
      createHash(this.algorithm).update(`${type} ${body.length}\x00`).update(body).digest("hex") ===
      expectedId
    );
  }
  async trees(treeIds) {
    let pending = normalizeCaseForComparison_2(treeIds.filter((treeId) => !this.listings.has(treeId)));
    if (pending.length === 0) return true;
    let readResult = await this.read("tree", pending);
    if (isTreeReadFailure(readResult)) return readResult;
    for (let [treeId, body] of readResult) {
      let treeEntries = parseTreeEntries(body, this.idLength / 2);
      if (treeEntries === null) return TREE_READ_TAMPERED;
      if (treeEntries === "malformed")
        return {
          failed: "malformed",
          tree: treeId,
        };
      this.listings.set(treeId, treeEntries);
    }
    return true;
  }
  listing(treeId) {
    return this.listings.get(treeId);
  }
  async commit(commitId) {
    let commitInfo = await this.commits([commitId]);
    return isTreeReadFailure(commitInfo) ? commitInfo : commitInfo.get(commitId);
  }
  async commits(commitIds) {
    let pending = normalizeCaseForComparison_2([...commitIds]);
    let readResult = pending.length === 0 ? new Map() : await this.read("commit", pending);
    if (isTreeReadFailure(readResult)) return readResult;
    let parsed = new Map();
    for (let [commitId, body] of readResult) {
      let lines = body
        .subarray(
          0,
          Math.max(
            0,
            body.indexOf(`

`),
          ),
        )
        .toString("latin1").split(`
`);
      let treeId = /^tree ([0-9a-f]{40,64})$/.exec(lines[0] ?? "")?.[1];
      let parentIds = [];
      for (let line of lines.slice(1)) {
        let parentId = /^parent ([0-9a-f]{40,64})$/.exec(line)?.[1];
        if (parentId === undefined) break;
        parentIds.push(parentId);
      }
      if (treeId === undefined || [treeId, ...parentIds].some((id) => id.length !== this.idLength))
        return TREE_READ_TAMPERED;
      parsed.set(commitId, {
        tree: treeId,
        parents: parentIds,
      });
    }
    return parsed;
  }
  async blobs(blobIds) {
    return blobIds.length === 0 ? new Map() : this.read("blob", normalizeCaseForComparison_2([...blobIds]));
  }
  async read(type, ids) {
    let response = await this.fetch(
      ids
        .map(
          (id) => `${id}
`,
        )
        .join(""),
    );
    if (response === null) return SEED_READ_PROBLEMS;
    if (isTreeReadFailure(response)) return response;
    let bodies = new Map();
    let offset = 0;
    for (let id of ids) {
      let index = response.indexOf(10, offset);
      if (index === -1) return SEED_READ_PROBLEMS;
      let str = response.subarray(offset, index).toString("latin1");
      if (str === `${id} missing`) return TREE_READ_MISSING;
      let match = /^([0-9a-f]{40,64}) (\w+) (\d+)$/.exec(str);
      if (match === null || match[1] !== id) return SEED_READ_PROBLEMS;
      if (match[2] !== type) return TREE_READ_TAMPERED;
      let size = Number(match[3]);
      let buffer = Buffer.from(response.subarray(index + 1, index + 1 + size));
      if (buffer.length !== size) return SEED_READ_PROBLEMS;
      if (!this.hashes(type, buffer, id)) return TREE_READ_TAMPERED;
      if (type !== "blob") this.bodies.set(id, buffer);
      bodies.set(id, buffer);
      offset = index + 1 + size + 1;
    }
    return bodies;
  }
}
//@ chunk-sfy2wa1e.js:26346-26818 placement
function parseTreeEntries(buffer, hashLength) {
  let entries = new Map();
  let offset = 0;
  let current = null;
  let invalid = false;
  while (offset < buffer.length) {
    let index = buffer.indexOf(32, offset);
    let spaceIndex = index === -1 ? -1 : buffer.indexOf(0, index + 1);
    if (index === -1 || spaceIndex === -1 || spaceIndex + 1 + hashLength > buffer.length) return null;
    let name = buffer.subarray(index + 1, spaceIndex);
    let octal = buffer.subarray(offset, index).toString("latin1");
    if (!isOctalNumber(octal)) return null;
    let mode = GIT_FILE_MODES(octal);
    let entry = {
      name,
      isTree: mode === TREE_MODE,
    };
    let str = name.toString("latin1");
    if (!isValidTreeEntryName(name) || entries.has(str)) return null;
    if (!KNOWN_TREE_MODES.has(mode) || (current !== null && compareTreeEntries(current, entry) >= 0))
      invalid = true;
    current = entry;
    entries.set(str, {
      mode,
      id: buffer.subarray(spaceIndex + 1, spaceIndex + 1 + hashLength).toString("hex"),
    });
    offset = spaceIndex + 1 + hashLength;
  }
  return invalid ? "malformed" : entries;
}
//@ chunk-sfy2wa1e.js:26818-26935 placement
function isValidTreeEntryName(name) {
  return (
    name.length > 0 &&
    !name.includes(47) &&
    !(name.length === 1 && name[0] === 46) &&
    !(name.length === 2 && name[0] === 46 && name[1] === 46)
  );
}
//@ chunk-sfy2wa1e.js:26935-27135 placement
function compareTreeEntries(left, right) {
  let min = Math.min(left.name.length, right.name.length);
  let limit = left.name.subarray(0, min).compare(right.name.subarray(0, min));
  if (limit !== 0) return limit;
  let nextByte = (entry) => (entry.name.length > min ? entry.name[min] : entry.isTree ? 47 : 0);
  return nextByte(left) - nextByte(right);
}
//@ chunk-sfy2wa1e.js:27135-27175 placement
function isOctalNumber(value) {
  return /^[0-7]+$/.test(value);
}
//@ chunk-sfy2wa1e.js:27175-27428 placement
function GIT_FILE_MODES(octal) {
  let digits = isOctalNumber(octal)
    ? Array.from(octal.slice(-11)).reduce((acc, digit) => ((acc << 3) | Number(digit)) >>> 0, 0)
    : 0;
  switch (digits & 61440) {
    case 32768:
      return digits & 64 ? "100755" : "100644";
    case 40960:
      return "120000";
    case 16384:
      return TREE_MODE;
    case 57344:
      return GITLINK_MODE_2;
    default:
      return octal.replace(/^0+/, "");
  }
}
//@ chunk-sfy2wa1e.js:27428-28617 placement
async function parseIndexEntries(reader, baseId, otherId) {
  let zeroId = "0".repeat(reader.idLength);
  let entries = [];
  let queue =
    baseId === otherId
      ? []
      : [
          {
            prefix: Buffer.alloc(0),
            base: baseId,
            other: otherId,
          },
        ];
  let entryCount = 0;
  while (queue.length > 0) {
    let filtered = queue.flatMap(({ base, other }) => [base, other]).filter((treeId) => treeId !== null);
    let treeRead = await reader.trees(filtered);
    if (treeRead !== true) {
      if (treeRead.failed !== "malformed") return treeRead;
      let found = queue.find(({ base, other }) => base === treeRead.tree || other === treeRead.tree);
      return found === undefined
        ? treeRead
        : {
            ...treeRead,
            dir: found.prefix.toString("utf8").replace(/\/$/, ""),
          };
    }
    let childQueue = [];
    for (let { prefix, base, other } of queue) {
      let baseListing = base === null ? new Map() : reader.listing(base);
      let otherListing = other === null ? new Map() : reader.listing(other);
      let sorted = normalizeCaseForComparison_2([...baseListing.keys(), ...otherListing.keys()]).sort();
      entryCount += sorted.length;
      if (entryCount > MAX_OBJECT_ENTRIES) return TREE_READ_TAMPERED;
      for (let name of sorted) {
        let baseEntry = baseListing.get(name);
        let otherEntry = otherListing.get(name);
        if (
          baseEntry !== undefined &&
          otherEntry !== undefined &&
          baseEntry.id === otherEntry.id &&
          baseEntry.mode === otherEntry.mode
        )
          continue;
        let buffer = Buffer.concat([prefix, Buffer.from(name, "latin1")]);
        let baseIsTree = baseEntry?.mode === TREE_MODE;
        let otherIsTree = otherEntry?.mode === TREE_MODE;
        if (baseIsTree || otherIsTree)
          childQueue.push({
            prefix: Buffer.concat([buffer, Buffer.from("/")]),
            base: baseIsTree ? baseEntry.id : null,
            other: otherIsTree ? otherEntry.id : null,
          });
        let oldEntry = baseEntry !== undefined && !baseIsTree ? baseEntry : undefined;
        let newEntry = otherEntry !== undefined && !otherIsTree ? otherEntry : undefined;
        if (oldEntry === undefined && newEntry === undefined) continue;
        entries.push({
          path: buffer.toString("utf8"),
          pathBytes: buffer,
          status:
            oldEntry === undefined
              ? "A"
              : newEntry === undefined
                ? "D"
                : entryKindForMode(oldEntry.mode) !== entryKindForMode(newEntry.mode)
                  ? "T"
                  : "M",
          oldMode: oldEntry === undefined ? "000000" : padFileMode(oldEntry.mode),
          newMode: newEntry === undefined ? "000000" : padFileMode(newEntry.mode),
          oldId: oldEntry?.id ?? zeroId,
          newId: newEntry?.id ?? zeroId,
        });
      }
    }
    queue = childQueue;
  }
  return entries;
}
//@ chunk-sfy2wa1e.js:28617-29199 placement
/**
 * 在 git 树中按路径逐段下钻，批量读取树对象，解析出给定路径对应的 blob/树 id 与模式。
 */
async function resolveTreePaths(reader, rootTree, paths) {
  let byPath = new Map();
  let loaded = await reader.trees([rootTree]);
  if (loaded !== true) return loaded;
  let mapped = paths.map((path) => ({
    name: path,
    segments: path.split("/"),
    at: 0,
    tree: rootTree,
  }));
  while (mapped.length > 0) {
    let treeRead = await reader.trees(mapped.map(({ tree }) => tree));
    if (treeRead !== true) return treeRead;
    let nextQueue = [];
    let treeIds = [];
    for (let entry of mapped) {
      let treeEntry = reader
        .listing(entry.tree)
        ?.get(Buffer.from(entry.segments[entry.at], "utf8").toString("latin1"));
      if (treeEntry === undefined) continue;
      let isLastSegment = entry.at === entry.segments.length - 1;
      if (treeEntry.mode === TREE_MODE) {
        if (isLastSegment) treeIds.push(treeEntry.id);
        else
          nextQueue.push({
            ...entry,
            at: entry.at + 1,
            tree: treeEntry.id,
          });
      } else if (isLastSegment)
        byPath.set(entry.name, {
          id: treeEntry.id,
          mode: treeEntry.mode,
        });
    }
    if (treeIds.length > 0) {
      let treeRead = await reader.trees(treeIds);
      if (treeRead !== true) return treeRead;
    }
    mapped = nextQueue;
  }
  return byPath;
}
//@ chunk-sfy2wa1e.js:29199-29247 placement
var BOM_BYTES = {
  latin1: "\xEF\xBB\xBF",
  utf8: "\uFEFF",
};
var pendingFilterCheck;
//@ chunk-sfy2wa1e.js:29247-29712 placement
function writeProbeBlob(runGit, extra) {
  let check = (pendingFilterCheck ??= (async () => {
    let buffer = Buffer.from([65, 233, 128, 255, 195, 40, 66]);
    let hashResult = await runGit(["hash-object", "-w", "--stdin"], extra, buffer);
    if (hashResult.code !== 0) throw Error("probe blob not written");
    let readResult = await runGit(
      ["cat-file", "--batch"],
      extra,
      `${hashResult.stdout.trim()}
`,
      "latin1",
    );
    if (readResult.code !== 0) throw Error("probe blob not read");
    let sliced = readResult.stdout.slice(
      readResult.stdout.indexOf(`
`) + 1,
    );
    return Buffer.from(sliced, "latin1").equals(buffer) ? "latin1" : "utf8";
  })());
  return check.catch(() => {
    if (pendingFilterCheck === check) pendingFilterCheck = undefined;
    return "utf8";
  });
}
//@ chunk-sfy2wa1e.js:29712-29726 placement
var deflateAsync; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-sfy2wa1e.js:29712", () => {
  deflateAsync = promisify(deflate);
});
//@ chunk-sfy2wa1e.js:29726-29776 placement
var FILTER_ATTRIBUTES = ["filter", "working-tree-encoding", "ident"];
//@ chunk-sfy2wa1e.js:29776-31556 placement
/**
 * 用 read-tree/ls-files 读取指定路径在 HEAD 中的条目（老版本 git 兼容）。
 */
async function readTreeForPaths(runGit, paths, dirsByPath, indexOptions, options) {
  if (paths.length === 0) return [];
  let directories = new Set(paths.filter((path) => dirsByPath.get(path) === null));
  let selfAndParents = (path) => [path, ...(dirsByPath.get(path) ?? [])];
  let variantsOf = (path) =>
    selfAndParents(path).flatMap((dirPath) =>
      options.normalizationBlind
        ? normalizeCaseForComparison_2([dirPath, dirPath.normalize("NFC"), dirPath.normalize("NFD")])
        : [dirPath],
    );
  let probePaths = normalizeCaseForComparison_2(paths.flatMap(variantsOf));
  if (indexOptions?.prepareIndexAndStore !== undefined) {
    let prepared = await indexOptions.prepareIndexAndStore(probePaths, indexOptions);
    if (prepared !== true) return prepared;
  } else if (indexOptions !== null) {
    if (
      (
        await runGit(["-c", "core.splitIndex=false", "read-tree", indexOptions.commit ?? indexOptions.tree], {
          GIT_INDEX_FILE: indexOptions.indexPath,
        })
      ).code !== 0
    )
      return null;
    await mkdir(indexOptions.objectsDir, {
      recursive: true,
      mode: 448,
    });
    let indexEnv = {
      GIT_INDEX_FILE: indexOptions.indexPath,
      GIT_OBJECT_DIRECTORY: indexOptions.objectsDir,
      GIT_ALTERNATE_OBJECT_DIRECTORIES: "",
    };
    let probeText = await writeProbeBlob(runGit, indexEnv);
    let gitattributesForPaths = await readGitattributesForPaths(
      runGit,
      indexOptions,
      indexOptions.indexPath,
      probePaths,
      probeText,
      indexOptions.refusesGitlinkedRules === true,
    );
    if (
      gitattributesForPaths === null ||
      gitattributesForPaths === "old_git" ||
      gitattributesForPaths === "tampered"
    )
      return gitattributesForPaths;
    for (let { name, id, text, markStripped } of gitattributesForPaths.blobs) {
      let blobWrite = await runGit(["hash-object", "-w", "--stdin"], indexEnv, Buffer.from(text, probeText));
      let trimmed = blobWrite.stdout.trim();
      if (blobWrite.code !== 0 || (trimmed !== id && !markStripped)) return null;
      if (trimmed !== id) {
        let bomWrite = await runGit(
          ["hash-object", "-w", "--stdin"],
          indexEnv,
          Buffer.from(BOM_BYTES[probeText] + text, probeText),
        );
        if (bomWrite.code !== 0 || bomWrite.stdout.trim() !== id) return null;
        if (
          (
            await runGit(
              ["-c", "core.splitIndex=false", "update-index", "--cacheinfo", `100644,${trimmed},${name}`],
              indexEnv,
            )
          ).code !== 0
        )
          return null;
      }
    }
  }
  let attrResult = await runGit(
    [
      ...(options.caseBlind ? ["-c", "core.ignorecase=true"] : []),
      "-c",
      "core.sparseCheckout=false",
      "check-attr",
      ...(indexOptions === null ? [] : ["--cached"]),
      "-z",
      "--stdin",
      ...FILTER_ATTRIBUTES,
    ],
    indexOptions === null
      ? undefined
      : {
          GIT_INDEX_FILE: indexOptions.indexPath,
          GIT_OBJECT_DIRECTORY: indexOptions.objectsDir,
          GIT_ALTERNATE_OBJECT_DIRECTORIES: "",
        },
    probePaths.map((path) => `${path}\x00`).join(""),
  );
  if (attrResult.maxBufferExceeded) return "overflow";
  if (attrResult.code !== 0) return null;
  let parts = attrResult.stdout.split("\x00");
  let filteredPaths = new Set();
  for (let index = 0; index + 2 < parts.length; index += 3) {
    let [side, value] = [parts[index + 1], parts[index + 2]];
    if (!(value === "unspecified" || value === "unset" || (side === "ident" && value === "false")))
      filteredPaths.add(parts[index]);
  }
  return paths.filter(
    (path) => directories.has(path) || variantsOf(path).some((variant) => filteredPaths.has(variant)),
  );
}
//@ chunk-sfy2wa1e.js:31556-33366 placement
/**
 * 读取影响变更路径的 .gitattributes（检测篡改、子模块）。
 */
async function readGitattributesForPaths(
  runGit,
  paths,
  indexFile,
  missingPaths,
  textEncoding,
  refusesGitlinkedRules,
) {
  let wantedPaths = normalizeCaseForComparison_2([
    ...missingGitattributesPaths(missingPaths),
    ...missingPaths.filter((path) => path.split("/").at(-1) === ".gitattributes"),
  ]);
  let indexEntries = await listIndexEntriesNamed(runGit, indexFile, new Set(wantedPaths), dirname(indexFile));
  if (indexEntries === null) return null;
  let treeEntries =
    paths.commit !== undefined
      ? await readCommitTree(runGit, paths.commit, wantedPaths, textEncoding)
      : await buildTreeObject(runGit, paths.tree, wantedPaths);
  if (treeEntries === null || treeEntries === "tampered") return treeEntries;
  if (refusesGitlinkedRules && [...treeEntries.values()].some(({ mode }) => mode === "160000")) return null;
  let matchesIndex = (path) => {
    let treeEntry = treeEntries.get(path);
    let indexEntry = indexEntries.get(path);
    return treeEntry === undefined
      ? indexEntry === undefined
      : indexEntry !== undefined &&
          splitArgsIntoSlices(indexEntry) &&
          indexEntry.id === treeEntry.id &&
          GIT_FILE_MODES(indexEntry.mode) === treeEntry.mode;
  };
  if (wantedPaths.some((path) => !matchesIndex(path))) return "tampered";
  let treeEntryPairs = [...treeEntries];
  let reduced = await chunkArgsByBytes(treeEntryPairs.map(([path]) => `:0:${path}`)).reduce(
    async (acc, chunk) => {
      let previous = await acc;
      if (previous === "tampered" || previous === null) return previous;
      let revParse = await runGit(["-c", "core.precomposeUnicode=false", "rev-parse", ...chunk], {
        GIT_INDEX_FILE: indexFile,
      });
      return revParse.code === 0
        ? [
            ...previous,
            ...revParse.stdout
              .split(
                `
`,
              )
              .filter((line) => line !== ""),
          ]
        : revParse.exitCode === 128
          ? "tampered"
          : null;
    },
    Promise.resolve([]),
  );
  if (reduced === null) return null;
  if (
    reduced === "tampered" ||
    reduced.length !== treeEntryPairs.length ||
    treeEntryPairs.some(([, treeEntry], index) => reduced[index] !== treeEntry.id)
  )
    return "tampered";
  let text;
  let blobCache = new Map();
  let readBlob = async (blobId) => {
    let cached = blobCache.get(blobId);
    if (cached !== undefined) return cached;
    let result = await runGit(
      ["cat-file", "--batch"],
      undefined,
      `${blobId}
`,
      textEncoding === "latin1" ? "latin1" : undefined,
    );
    let index = result.stdout.indexOf(`
`);
    let header = index === -1 ? result.stdout : result.stdout.slice(0, index);
    let body = index === -1 ? "" : result.stdout.slice(index + 1);
    let algorithm = blobId.length === 64 ? "sha256" : "sha1";
    let text =
      result.code !== 0
        ? null
        : !new RegExp(`^${blobId} blob [0-9]+$`).test(header)
          ? /^[0-9a-f]{40,64} [a-z]+ [0-9]+$/.test(header)
            ? "tampered"
            : null
          : ([body, `${body}\r`].find((candidate) => {
              let buffer = Buffer.from(candidate, textEncoding);
              return (
                createHash(algorithm).update(`blob ${buffer.length}\x00`).update(buffer).digest("hex") ===
                blobId
              );
            }) ?? (textEncoding === "latin1" ? "tampered" : null));
    blobCache.set(blobId, text);
    return text;
  };
  let blobs = [];
  for (let [name, { id, mode }] of treeEntries) {
    let text_2 = await readBlob(id);
    if (text_2 === "tampered") return "tampered";
    let decoded = text_2 === null ? null : decodeGitattributesBlob(text_2, mode, textEncoding);
    if (decoded === null) return null;
    if (decoded.isLink) {
      text ??= supportsGit232(runGit);
      if (!(await text)) return "old_git";
    }
    if (decoded.text === null) return null;
    blobs.push({
      name,
      id,
      text: decoded.text,
      markStripped: decoded.markStripped,
    });
  }
  return {
    blobs,
  };
}
//@ chunk-sfy2wa1e.js:33366-33707 placement
/**
 * 按 git 模式解码 gitattributes 内容：符号链接、去 BOM 与非法输入判断。
 */
function decodeGitattributesBlob(content, mode, textEncoding) {
  if (content.includes("\x00")) return null;
  if (mode !== "100644" && mode !== "100755" && mode !== "120000") return null;
  let hasBom = content.startsWith(BOM_BYTES[textEncoding]);
  if (mode === "120000")
    return {
      isLink: true,
      text: hasBom ? null : content,
      markStripped: false,
    };
  if (!hasBom)
    return {
      isLink: false,
      text: content,
      markStripped: false,
    };
  let sliced = content.slice(BOM_BYTES[textEncoding].length);
  return sliced.startsWith(BOM_BYTES[textEncoding])
    ? null
    : {
        isLink: false,
        text: sliced,
        markStripped: true,
      };
}
//@ chunk-sfy2wa1e.js:33707-34132 placement
/**
 * 解码 git 加引号的路径（处理八进制与转义字符）。
 */
function unquoteGitPath(quoted) {
  if (!(quoted.startsWith('"') && quoted.endsWith('"'))) return Buffer.from(quoted, "utf8");
  let result = {
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
  let sliced = quoted.slice(1, -1);
  let bytes = [];
  for (let index = 0; index < sliced.length; index += 1) {
    let char = sliced[index] ?? "";
    if (char !== "\\") {
      bytes.push(...Buffer.from(char, "utf8"));
      continue;
    }
    let escapedChar = sliced[index + 1] ?? "";
    if (/^[0-3][0-7]{2}$/.test(sliced.slice(index + 1, index + 4))) {
      bytes.push(parseInt(sliced.slice(index + 1, index + 4), 8));
      index += 3;
    } else {
      bytes.push(result[escapedChar] ?? escapedChar.charCodeAt(0));
      index += 1;
    }
  }
  return Buffer.from(bytes);
}
//@ chunk-sfy2wa1e.js:34132-34267 placement
async function supportsGit232(runGit) {
  let result = await runGit(["version"]);
  let version = result.code === 0 ? parseGitVersion(result.stdout) : null;
  return version !== null && (version.major > 2 || (version.major === 2 && version.minor >= 32));
}
//@ chunk-sfy2wa1e.js:34267-34874 placement
/**
 * 读取 commit 对象并校验其哈希，判定是否被篡改。
 */
async function readObjectForTree(runGit, oid, oid_2) {
  let probe = oid_2 ?? (await writeProbeBlob(runGit, {}));
  let algorithm = oid.length === 64 ? "sha256" : "sha1";
  let verifyHash = (objectType, content, expectedId) =>
    createHash(algorithm).update(`${objectType} ${content.length}\x00`).update(content).digest("hex") ===
    expectedId;
  let result = await runGit(
    ["cat-file", "--batch"],
    undefined,
    `${oid}
`,
    probe === "latin1" ? "latin1" : undefined,
  );
  if (result.code !== 0) return null;
  let index = result.stdout.indexOf(`
`);
  let body = index === -1 ? "" : result.stdout.slice(index + 1);
  if (!result.stdout.startsWith(`${oid} commit `))
    return /^[0-9a-f]{40,64} [a-z]+ /.test(result.stdout) ? "tampered" : null;
  if (![body, `${body}\r`].some((candidate) => verifyHash("commit", Buffer.from(candidate, probe), oid)))
    return probe === "latin1" ? "tampered" : null;
  let treeId = /^tree ([0-9a-f]{40,64})\n/.exec(body)?.[1];
  if (treeId === undefined) return "tampered";
  return treeId;
}
//@ chunk-sfy2wa1e.js:34874-34984 placement
async function readCommitTree(runGit, commit, oid, encoding = "utf8") {
  let entries = await readObjectForTree(runGit, commit, encoding);
  if (entries === null || entries === "tampered") return entries;
  return buildTreeObject(runGit, entries, oid);
}
//@ chunk-sfy2wa1e.js:34984-35005 placement
var YIELD_EVERY_OBJECTS = 512;
var YIELD_EVERY_BYTES = 262144;
//@ chunk-sfy2wa1e.js:35005-37096 placement
async function verifyObjectsByHash(objects, ids) {
  let algorithm = ids.length === 64 ? "sha256" : "sha1";
  let verify = (kind, content, expectedId) =>
    createHash(algorithm).update(`${kind} ${content.length}\x00`).update(content).digest("hex") ===
    expectedId;
  let listings = new Map();
  let toListing = (entries) => {
    if (!entries.every(({ nameBytes }) => isValidTreeEntryName(nameBytes))) return null;
    let listing = new Map(
      entries.map(({ nameBytes, mode, id }) => [
        nameBytes.toString("latin1"),
        {
          mode,
          id,
        },
      ]),
    );
    return listing.size === entries.length ? listing : null;
  };
  let readsInOneRun = (await writeProbeBlob(objects, {})) === "latin1";
  let listingsOf = async (treeIds) => {
    let missing = normalizeCaseForComparison_2(treeIds.filter((treeId) => !listings.has(treeId)));
    if (missing.length === 0) return true;
    if (!readsInOneRun) {
      for (let treeId of missing) {
        let listing = await readOneTree(treeId);
        if (listing === null || listing === "tampered") return listing;
      }
      return true;
    }
    let batch = await objects(
      ["cat-file", "--batch"],
      undefined,
      [...missing, missing[0]]
        .map(
          (treeId) => `${treeId}
`,
        )
        .join(""),
      "latin1",
    );
    if (batch.code !== 0) return null;
    let buffer = Buffer.from(batch.stdout, "latin1");
    let idBytes = ids.length / 2;
    let cursor = 0;
    let bytesSinceYield = 0;
    for (let [index, treeId] of missing.entries()) {
      if ((index > 0 && index % YIELD_EVERY_OBJECTS === 0) || bytesSinceYield >= YIELD_EVERY_BYTES) {
        await yieldToEventLoop();
        bytesSinceYield = 0;
      }
      let index_2 = buffer.indexOf(10, cursor);
      if (index_2 === -1) return null;
      let str = buffer.subarray(cursor, index_2).toString("latin1");
      let match = /^([0-9a-f]{40,64}) tree (\d+)$/.exec(str);
      if (match === null || match[1] !== treeId)
        return /^[0-9a-f]{40,64} [a-z]+ \d+$/.test(str) ? "tampered" : null;
      let size = Number(match[2]);
      bytesSinceYield += size;
      let content = buffer.subarray(index_2 + 1, index_2 + 1 + size);
      if (content.length !== size) return null;
      if (!verify("tree", content, treeId)) return "tampered";
      cursor = index_2 + 1 + size + 1;
      let entries = [];
      let offset = 0;
      while (offset < content.length) {
        let index = content.indexOf(32, offset);
        let index_2 = content.indexOf(0, index + 1);
        if (index === -1 || index_2 === -1 || index_2 + 1 + idBytes > content.length) return "tampered";
        let octal = content.subarray(offset, index).toString("latin1");
        if (!isOctalNumber(octal)) return "tampered";
        entries.push({
          mode: GIT_FILE_MODES(octal),
          nameBytes: Buffer.from(content.subarray(index + 1, index_2)),
          id: content.subarray(index_2 + 1, index_2 + 1 + idBytes).toString("hex"),
        });
        offset = index_2 + 1 + idBytes;
      }
      let listing = toListing(entries);
      if (listing === null) return "tampered";
      listings.set(treeId, listing);
    }
    return true;
  };
  let readOneTree = async (treeId) => {
    let cached = listings.get(treeId);
    if (cached !== undefined) return cached;
    let result = await objects(["-c", "core.quotePath=true", "ls-tree", treeId]);
    if (result.code !== 0) return null;
    let entries = result.stdout
      .split(
        `
`,
      )
      .filter((line) => line !== "")
      .map((line) => {
        let index = line.indexOf("\t");
        let [mode, , id] = line.slice(0, index).split(" ");
        let nameBytes = unquoteGitPath(line.slice(index + 1));
        return {
          mode: (mode ?? "").replace(/^0+/, ""),
          id: id ?? "",
          nameBytes,
        };
      });
    let buffer = Buffer.concat(
      entries.map(({ mode, id, nameBytes }) =>
        Buffer.concat([Buffer.from(`${mode} `, "utf8"), nameBytes, Buffer.from([0]), Buffer.from(id, "hex")]),
      ),
    );
    if (!verify("tree", buffer, treeId)) return null;
    let listing = toListing(entries);
    if (listing === null) return "tampered";
    listings.set(treeId, listing);
    return listing;
  };
  return {
    listingsOf,
    listing: (treeId) => listings.get(treeId),
    readsManyTreesInOneRun: readsInOneRun,
  };
}
//@ chunk-sfy2wa1e.js:37096-37751 placement
async function buildTreeObject(runGit, entries, paths) {
  let { listingsOf, listing } = await verifyObjectsByHash(runGit, entries);
  let found = new Map();
  let listingResult = await listingsOf([entries]);
  if (listingResult !== true) return listingResult;
  let mapped = paths.map((path) => ({
    name: path,
    segments: path.split("/"),
    at: 0,
    tree: entries,
  }));
  while (mapped.length > 0) {
    let listingResult = await listingsOf(mapped.map(({ tree }) => tree));
    if (listingResult !== true) return listingResult;
    let nextQueue = [];
    let subTreeIds = [];
    for (let entry of mapped) {
      let treeListing = listing(entry.tree);
      if (treeListing === undefined) return null;
      let segment = entry.segments[entry.at];
      let treeEntry = treeListing.get(Buffer.from(segment, "utf8").toString("latin1"));
      if (treeEntry === undefined) continue;
      let isLastSegment = entry.at === entry.segments.length - 1;
      if (isLastSegment && treeEntry.mode !== "40000")
        found.set(entry.name, {
          id: treeEntry.id,
          mode: treeEntry.mode,
        });
      else if (treeEntry.mode === "40000")
        if (!isLastSegment)
          nextQueue.push({
            ...entry,
            at: entry.at + 1,
            tree: treeEntry.id,
          });
        else subTreeIds.push(treeEntry.id);
    }
    if (subTreeIds.length > 0) {
      let listingResult = await listingsOf(subTreeIds);
      if (listingResult !== true) return listingResult;
    }
    mapped = nextQueue;
  }
  return found;
}
//@ chunk-sfy2wa1e.js:37751-38208 placement
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
//@ chunk-sfy2wa1e.js:38208-38296 placement
function blobSha1(content) {
  return createHash("sha1").update(`blob ${content.length}\x00`).update(content).digest("hex");
}
//@ chunk-sfy2wa1e.js:38296-38521 placement
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
  (args, ...rest) =>
    hardenedGitRunner(["-c", "core.longpaths=true", ...args], ...rest);
//@ chunk-sfy2wa1e.js:38521-54748 placement
/**
 * 捕获未提交修改为 stash 提交：读索引与工作树、处理 Windows 不能保存的名字、构造种子引用（约 16 KB）。
 */
async function captureWipStash(options, layout, opts = {}) {
  let probes = opts.probes ?? currentGitBinaryState();
  let hardenedGitRunner = createHardenedGitRunner(options, layout, opts.signal, undefined, probes);
  let runHardenedGit = (args, env, input, encoding, stdoutFd) =>
    hardenedGitRunner(
      env?.GIT_INDEX_FILE === undefined ? [...args] : ["-c", "core.splitIndex=false", ...args],
      env,
      input,
      encoding,
      stdoutFd,
    );
  let shouldLeaveOut = (name) => (opts.neverRead ?? opts.alsoLeaveOut)?.(name) ?? false;
  let filtered = normalizeCaseForComparison_2([toPosixSpelling(options), layout.workTree]).filter((root) =>
    CREDENTIAL_CONFIG_PATHS.some(([, relativePath]) =>
      isCredentialConfigPathActive(`${root}/${relativePath}`),
    ),
  );
  let isActiveCredentialPath = (name) =>
    filtered.some((root) => isCredentialConfigPathActive(`${root}/${name}`));
  let shouldSkipName = (name) =>
    isSensitiveNameOrVariant(name) || isActiveCredentialPath(name) || (opts.alsoLeaveOut?.(name) ?? false);
  let headState = await resolveHeadState(runHardenedGit, layout.adminDir ?? resolveTempDir());
  if (headState.kind !== "inspected") return headState;
  let { gitDir, workTree } = layout;
  let { base, baseTree, iTree, reader, namesWindowsCannotHold } = headState.inspection;
  if (namesWindowsCannotHold > 0) {
    logForDebugging(
      `[wipStash] tracked names that Windows cannot hold, listed as deleted and passed over: ${namesWindowsCannotHold}`,
    );
    opts.onNamesWindowsCannotHold?.(namesWindowsCannotHold);
  }
  let caseFolding =
    (layout.bound === true && getPlatform() === "wsl") ||
    (await isCaseFoldingFileSystem(workTree)) ||
    (await isCaseFoldingFileSystem(layout.adminDir ?? resolveTempDir()));
  let suspiciousChangedPaths = findSuspiciousChangedPaths(headState.inspection, caseFolding);
  if (suspiciousChangedPaths.length > 0)
    return {
      kind: "refused",
      refused: suspiciousChangedPaths,
      decidedOn: "listing",
    };
  let leftOutCredentialFiles = opts.leaveOutUncommittedCredentialFiles
    ? await classifyIndexEntry(workTree, headState.inspection, shouldSkipName, caseFolding, shouldLeaveOut)
    : [];
  let leftOutPaths = new Set(leftOutCredentialFiles.map(({ path }) => path));
  let stagedPaths = new Set(headState.inspection.staged.map(({ path }) => path));
  let stagedDeletedPaths = new Set(
    headState.inspection.staged.flatMap(({ path, status }) => (status === "D" ? [path] : [])),
  );
  let now = Date.now();
  let compareEntry = limitConcurrency(GIT_READ_CONCURRENCY, (workingEntry) =>
    opts.signal?.aborted === true || leftOutPaths.has(workingEntry.path) || stagedPaths.has(workingEntry.path)
      ? Promise.resolve("changed")
      : compareWorktreeEntry(workTree, workingEntry, caseFolding, MAX_COMPARE_BYTES, opts.signal),
  );
  let results = await Promise.all(headState.inspection.working.map(compareEntry));
  let filtered_2 = headState.inspection.working.filter(
    (entry, entryIndex) => results[entryIndex] !== "unchanged",
  );
  let openRefusedCount = countWhere(results, (status) => status === "open_refused");
  if (openRefusedCount > 0) opts.onOpenRefusedAtTheLook?.(openRefusedCount);
  let unchangedCount = headState.inspection.working.length - filtered_2.length;
  if (unchangedCount > 0)
    logForDebugging(
      `[wipStash] ${unchangedCount} of ${headState.inspection.working.length} stat-dirty tracked files were unchanged (${Date.now() - now}ms)`,
    );
  if (filtered_2.length === 0 && iTree === baseTree)
    return {
      kind: "none",
      leftOut: leftOutCredentialFiles,
    };
  await pruneStaleSeedIndexes(gitDir);
  if (layout.adminDir === undefined) await pruneStaleProcessDirs(resolveTempDir());
  let scratchIndexPath = join(
    layout.adminDir ?? gitDir,
    `ccr-seed-${process.pid}-${randomBytes(6).toString("hex")}.index`,
  );
  let tempIndexDir = null;
  let stageDir = null;
  let attrsDir = null;
  let intentToAddPaths = [];
  let stagedBlobIds = new Set();
  let laidFiles = [];
  let laidEntries = new Map();
  let skipWorktreePaths = [];
  let stagedIndexEntries = new Map();
  let replayIndexPath = null;
  try {
    let readTreeResult = await runHardenedGit([
      "read-tree",
      "--no-recurse-submodules",
      `--index-output=${scratchIndexPath}`,
      "-m",
      iTree,
    ]);
    if (readTreeResult.code !== 0) return stepFailure("read-tree", readTreeResult.stderr, readTreeResult);
    if (layout.adminDir === undefined) {
      tempIndexDir = await mkdtemp(join(resolveTempDir(), `claude-seed-index-${process.pid}-`));
      let tempIndexPath = join(tempIndexDir, "index");
      let moveVerdict = await lstatNoFollow(scratchIndexPath, tempIndexPath);
      if (moveVerdict !== null) {
        await unlink(scratchIndexPath).catch(() => {});
        return stepFailure(moveVerdict.kind === "disk" ? "scratch-index" : "rewritten", moveVerdict.detail);
      }
      let unlinkError = await unlinkWithRetry(scratchIndexPath);
      if (unlinkError !== null)
        logForDebugging(
          `[wipStash] the scratch index read-tree wrote could not be removed after it was carried off (${unlinkError}); left for the sweep`,
        );
      scratchIndexPath = tempIndexPath;
    }
    let sparseCheck = await listSparseCheckout(
      runHardenedGit,
      scratchIndexPath,
      layout.adminDir ?? resolveTempDir(),
      reader,
      iTree,
      caseFolding,
    );
    if (sparseCheck.kind === "failed") return sparseCheck;
    if (sparseCheck.kind === "differ")
      return stepFailure(
        "read-tree",
        "the index changed while it was read, or its trees do not list what it holds (an object is not what its id names) \u2014 retry",
      );
    let writeTreeResult = await runHardenedGit(["write-tree", "--ignore-cache-tree"]);
    if (writeTreeResult.code !== 0)
      return stepFailure("write-tree", writeTreeResult.stderr || writeTreeResult.stdout, writeTreeResult);
    if (writeTreeResult.stdout.trim() !== iTree)
      return stepFailure(
        "read-tree",
        "the index changed while the uncommitted changes were being read \u2014 retry",
      );
    let indexTree = iTree;
    if (leftOutPaths.size > 0) {
      let restoreFailure = await restoreIndexEntries(runHardenedGit, reader, scratchIndexPath, baseTree, [
        ...leftOutPaths,
      ]);
      if (restoreFailure !== null)
        return {
          kind: "failed",
          ...restoreFailure,
        };
      let writeTreeAgain = await runHardenedGit(["write-tree", "--ignore-cache-tree"], {
        GIT_INDEX_FILE: scratchIndexPath,
      });
      if (writeTreeAgain.code !== 0)
        return stepFailure("write-tree", writeTreeAgain.stderr || writeTreeAgain.stdout, writeTreeAgain);
      indexTree = writeTreeAgain.stdout.trim();
    }
    let deletedCredentialPaths = opts.leaveOutUncommittedCredentialFiles
      ? filtered_2
          .filter(({ status, path }) => status === "D" && !leftOutPaths.has(path) && shouldSkipName(path))
          .map(({ path }) => path)
      : [];
    let isIncludedPath = (path) =>
      !leftOutPaths.has(path) && (!opts.leaveOutUncommittedCredentialFiles || !shouldSkipName(path));
    let changedPaths = normalizeCaseForComparison_2(
      filtered_2.flatMap(({ path, status, newMode, newId }) =>
        status === "D" || newMode === GITLINK_MODE_VALUE || !ZERO_OID_RE.test(newId) ? [path] : [],
      ),
    );
    let directoryPaths = new Set(await listDirectoriesAmong(workTree, changedPaths));
    let filePaths = new Set(changedPaths.filter((path) => !directoryPaths.has(path)));
    let filtered = normalizeCaseForComparison_2(filtered_2.map(({ path }) => path)).filter(
      (path) => !filePaths.has(path) && isIncludedPath(path),
    );
    let filtered_3 = [...stagedPaths].filter(isIncludedPath);
    let filtered_4 = headState.inspection.staged.filter(({ status }) => status !== "D");
    let isCredentialLikePath = checkCredentialLikePaths();
    let indexListing =
      filtered_4.length === 0 && !opts.leaveOutUncommittedCredentialFiles
        ? {
            elsewhere: [],
            withheldTracked: new Map(),
          }
        : await listIndexIds(
            runHardenedGit,
            scratchIndexPath,
            new Map(filtered_4.map(({ newId, path }) => [newId, path])),
            opts.leaveOutUncommittedCredentialFiles
              ? (path) => isCredentialLikePath(path) || isActiveCredentialPath(path)
              : () => false,
            layout.adminDir ?? resolveTempDir(),
            caseFolding,
            opts.signal,
          );
    if (indexListing === null)
      return stepFailure(
        "ls-files",
        opts.signal?.aborted
          ? "cancelled, or out of time, before the index was listed and its names judged"
          : "could not list the index",
      );
    let { elsewhere, withheldTracked } = indexListing;
    let attrsPaths = normalizeCaseForComparison_2([
      ...filtered_2.map(({ path }) => path),
      ...stagedPaths,
      ...elsewhere,
    ]);
    let attrPaths = new Set();
    let verifiedAttrPaths = new Set();
    let caseVariants;
    if (attrsPaths.length > 0) {
      attrsDir = await mkdtemp(join(layout.adminDir ?? resolveTempDir(), "claude-seed-attrs-"));
      caseVariants = await findGitDirCaseVariants(runHardenedGit, workTree);
      let alternatesProblem = await checkAlternatesFile(attrsDir, {
        caseBlind: caseVariants.caseBlind,
        objectFormat: base.length === 64 ? "sha256" : "sha1",
        objectsDir: join(layout.commonDir, "objects"),
      });
      if (alternatesProblem !== null) return stepFailure("check-attr", alternatesProblem);
      let runGit = createHardenedGitRunner(
        options,
        {
          gitDir: attrsDir,
          commonDir: attrsDir,
          workTree,
          configPins: layout.configPins,
        },
        opts.signal,
        reachForBoundSession(layout),
        probes,
      );
      let treeForPaths = await readTreeForPaths(
        runGit,
        attrsPaths,
        new Map(attrsPaths.map((path) => [path, getPathNormalizationVariants(path)])),
        {
          commit: base,
          indexPath: join(attrsDir, "head.index"),
          objectsDir: join(attrsDir, "verified"),
        },
        caseVariants,
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
      attrPaths = new Set(treeForPaths);
      let treePathsToCheck = normalizeCaseForComparison_2([
        ...attrsPaths.filter((path) => attrPaths.has(path)),
        ...leftOutPaths,
      ]);
      if (treePathsToCheck.length > 0 || withheldTracked.size > 0) {
        let treePaths = await resolveTreePaths(reader, baseTree, treePathsToCheck);
        if (isTreeReadFailure(treePaths))
          return treeReadFailure(
            treePaths,
            "cat-file",
            "HEAD's trees to the changed files could not be read back as what their ids name",
          );
        verifiedAttrPaths = new Set(attrPaths);
        let wantedPathSet = new Set([...attrPaths, ...leftOutPaths]);
        let readBlobIds = limitConcurrency(GIT_READ_CONCURRENCY, async (relPath) => {
          let worktreeBlobIds = await readWorktreeBlobIds(
            workTree,
            relPath,
            baseTree.length,
            MAX_STASH_FILE_BYTES,
            caseFolding,
          );
          let withheldId = withheldTracked.get(relPath);
          return worktreeBlobIds !== null &&
            (wantedPathSet.has(relPath) || !worktreeBlobIds.includes(withheldId ?? ""))
            ? worktreeBlobIds
            : [];
        });
        let blobIdLists = (
          await Promise.all(
            normalizeCaseForComparison_2([...wantedPathSet, ...withheldTracked.keys()])
              .filter((path) => !shouldLeaveOut(path))
              .map(readBlobIds),
          )
        ).flat();
        let isNonEmptyBlob = (id) => id !== EMPTY_BLOB_IDS.sha1 && id !== EMPTY_BLOB_IDS.sha256;
        let verifiedBlobIds = new Set([
          ...[...treePaths.values()].map(({ id }) => id).filter(isNonEmptyBlob),
          ...filtered_4
            .filter(({ path }) => wantedPathSet.has(path))
            .map(({ newId }) => newId)
            .filter(isNonEmptyBlob),
          ...blobIdLists.filter(isNonEmptyBlob),
        ]);
        stagedBlobIds = verifiedBlobIds;
        filtered_4
          .filter(({ path, newId }) => verifiedBlobIds.has(newId) && isIncludedPath(path))
          .forEach(({ path }) => attrPaths.add(path));
      }
      let filtered = filtered_3.filter((path) => attrPaths.has(path));
      if (filtered.length > 0) {
        let restoreError = await restoreIndexEntries(
          runHardenedGit,
          reader,
          scratchIndexPath,
          baseTree,
          filtered,
        );
        if (restoreError !== null)
          return {
            kind: "failed",
            ...restoreError,
          };
        let writeTreeOnceMore = await runHardenedGit(["write-tree", "--ignore-cache-tree"], {
          GIT_INDEX_FILE: scratchIndexPath,
        });
        if (writeTreeOnceMore.code !== 0)
          return stepFailure(
            "write-tree",
            writeTreeOnceMore.stderr || writeTreeOnceMore.stdout,
            writeTreeOnceMore,
          );
        indexTree = writeTreeOnceMore.stdout.trim();
        leftOutCredentialFiles.push(
          ...filtered.map((path) => ({
            path,
            why: "filtered",
          })),
        );
      }
    }
    let filteredPaths = new Set(
      leftOutCredentialFiles.flatMap(({ path, why }) => (why === "filtered" ? [path] : [])),
    );
    let attrPathSet = new Set(filtered);
    let paths = filtered_4.flatMap(({ path, newMode }) =>
      newMode !== GITLINK_MODE_VALUE && isIncludedPath(path) && !attrPathSet.has(path) ? [path] : [],
    );
    let stagePaths = [...filtered, ...(await listDirectoriesAmong(workTree, paths))];
    if (stagePaths.length > 0 || paths.length > 0) {
      let bareStageDir = await mkdtemp(join(layout.adminDir ?? resolveTempDir(), "claude-seed-stage-"));
      stageDir = bareStageDir;
      let objectFormat = baseTree.length === 64 ? "sha256" : "sha1";
      let changedFilesForStash = await readChangedFilesForStash(
        workTree,
        bareStageDir,
        stagePaths,
        opts.maxStagedBytes ?? MAX_STASH_BYTES,
        {
          ...opts.stageHooks,
          objectFormat,
          ntfsRules: caseFolding,
        },
      );
      if ("refused" in changedFilesForStash) return stepFailure("stage", changedFilesForStash.refused);
      let indexFiles = await listFilesNoPrecompose(
        runHardenedGit,
        {
          GIT_INDEX_FILE: scratchIndexPath,
        },
        changedFilesForStash.entries.flatMap((entry) => (entry.kind === "absent" ? [entry.path] : [])),
      );
      if (indexFiles === null) return stepFailure("ls-files", "could not list the index entries");
      let stashChange = await describeStashEntryChange(
        changedFilesForStash,
        new Set(stagePaths),
        new Set(
          filtered_2.flatMap(({ path, status }) =>
            status === "D" || indexFiles.unseen.has(path) ? [] : [path],
          ),
        ),
        bareStageDir,
        (paths) =>
          readChangedFilesForStash(workTree, bareStageDir, paths, opts.maxStagedBytes ?? MAX_STASH_BYTES, {
            ...opts.stageHooks,
            objectFormat,
            ntfsRules: caseFolding,
          }),
      );
      if ("refused" in stashChange) return stepFailure("stage", stashChange.refused);
      let found = stashChange.entries.find(
        (entry) =>
          entry.kind === "changed" && (!stagePaths.includes(entry.path) || isGitattributesPath(entry.path)),
      );
      if (found !== undefined) return stepFailure("stage", `${found.path} changed while it was being read`);
      let stageGit = withLongPathsGit(
        createHardenedGitRunner(
          options,
          {
            ...layout,
            workTree: stageDir,
          },
          opts.signal,
          reachForBoundSession(layout),
          probes,
        ),
      );
      let stageRun = (args, env, stdin, encoding, extra) =>
        stageGit(
          env?.GIT_INDEX_FILE === undefined ? [...args] : ["-c", "core.splitIndex=false", ...args],
          env,
          stdin,
          encoding,
          extra,
        );
      let stagePathSet = new Set(stagePaths);
      let attrsCandidates = normalizeCaseForComparison_2([
        ...stashChange.entries.flatMap((entry) =>
          entry.kind !== "absent" && stagePathSet.has(entry.path) ? [entry.path] : [],
        ),
        ...filtered_4.flatMap(({ path, newMode }) =>
          newMode !== GITLINK_MODE_VALUE && isIncludedPath(path) ? [path] : [],
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
      let attrsGit = withLongPathsGit(
        createHardenedGitRunner(
          options,
          {
            gitDir: attrsDir,
            commonDir: attrsDir,
            workTree: stageDir,
            configPins: layout.configPins,
          },
          opts.signal,
          reachForBoundSession(layout),
          probes,
        ),
      );
      let variantsById = new Map(attrsCandidates.map((path) => [path, getPathNormalizationVariants(path)]));
      let [treeForPaths, treeForPaths_2] = await Promise.all([
        readTreeForPaths(stageRun, attrsCandidates, variantsById, null, caseVariants),
        readTreeForPaths(attrsGit, attrsCandidates, variantsById, null, caseVariants),
      ]);
      if (treeForPaths === "overflow" || treeForPaths_2 === "overflow")
        return stepFailure("check-attr", "too many changed files to read the attributes of");
      if (treeForPaths === null || !Array.isArray(treeForPaths))
        return stepFailure("check-attr", "could not read the attributes in force");
      if (treeForPaths_2 === null || !Array.isArray(treeForPaths_2))
        return stepFailure("check-attr", "could not read the staged .gitattributes on their own");
      let liveAttrPaths = treeForPaths;
      let stagedAttrPaths = treeForPaths_2;
      let newAttrPaths = new Set(
        [...liveAttrPaths, ...stagedAttrPaths].filter((path) => !verifiedAttrPaths.has(path)),
      );
      let nonEmptyBlob = (id) => id !== EMPTY_BLOB_IDS.sha1 && id !== EMPTY_BLOB_IDS.sha256;
      let readIds = limitConcurrency(GIT_READ_CONCURRENCY, (relPath) =>
        readWorktreeBlobIds(workTree, relPath, baseTree.length, MAX_STASH_FILE_BYTES, caseFolding),
      );
      let flattened = (
        await Promise.all([...newAttrPaths].filter((path) => !shouldLeaveOut(path)).map(readIds))
      ).flatMap((ids) => ids ?? []);
      let newBlobIds = new Set(
        [
          ...filtered_4.filter(({ path }) => newAttrPaths.has(path)).map(({ newId }) => newId),
          ...flattened,
        ].filter(nonEmptyBlob),
      );
      let mapped = filtered_4
        .filter(
          ({ path, newId }) =>
            newBlobIds.has(newId) && isIncludedPath(path) && !newAttrPaths.has(path) && !attrPaths.has(path),
        )
        .map(({ path }) => path);
      stagedBlobIds = new Set([...stagedBlobIds, ...newBlobIds]);
      let attrPathList = normalizeCaseForComparison_2([
        ...liveAttrPaths,
        ...stagedAttrPaths,
        ...stashChange.entries.flatMap((entry) => (attrPaths.has(entry.path) ? [entry.path] : [])),
        ...mapped,
      ]);
      let infoAttributes_2 = await readInfoAttributes(layout.commonDir);
      if (!infoAttributesUnchanged(infoAttributes, infoAttributes_2))
        return stepFailure("check-attr", ".git/info/attributes changed while the attributes were read");
      let restorePaths = normalizeCaseForComparison_2([
        ...filtered_3.filter((path) => newAttrPaths.has(path)),
        ...mapped,
      ]);
      if (restorePaths.length > 0) {
        let restoreProblem = await restoreIndexEntries(
          runHardenedGit,
          reader,
          scratchIndexPath,
          baseTree,
          restorePaths,
        );
        if (restoreProblem !== null)
          return {
            kind: "failed",
            ...restoreProblem,
          };
        let writeTreeFifth = await runHardenedGit(["write-tree", "--ignore-cache-tree"], {
          GIT_INDEX_FILE: scratchIndexPath,
        });
        if (writeTreeFifth.code !== 0)
          return stepFailure("write-tree", writeTreeFifth.stderr || writeTreeFifth.stdout, writeTreeFifth);
        indexTree = writeTreeFifth.stdout.trim();
      }
      let flattened_2 = stashChange.entries.flatMap((entry) =>
        (entry.kind === "hardlinked" || entry.kind === "changed") &&
        stagePathSet.has(entry.path) &&
        !filteredPaths.has(entry.path)
          ? [
              {
                path: entry.path,
                why: entry.kind === "hardlinked" ? "hardlinked" : "unstable",
              },
            ]
          : [],
      );
      let excludedPaths = new Set([...filteredPaths, ...flattened_2.map(({ path }) => path)]);
      let leftOutEntries = [
        ...flattened_2,
        ...attrPathList
          .filter((path) => !excludedPaths.has(path))
          .map((path) => ({
            path,
            why: "filtered",
          })),
      ];
      let leftOutSet = new Set([...leftOutEntries.map(({ path }) => path), ...attrPathList]);
      leftOutCredentialFiles.push(...leftOutEntries);
      let flattened_3 = stashChange.entries.flatMap((entry) =>
        entry.kind === "file" || entry.kind === "symlink" ? [entry.path] : [],
      );
      let unseenListing = await listFilesNoPrecompose(runHardenedGit, undefined, flattened_3);
      if (unseenListing === null) return stepFailure("ls-files", "could not list the index entries");
      let filtered = flattened_3.filter((path) => !leftOutSet.has(path));
      let scratchListing = await listFilesNoPrecompose(
        runHardenedGit,
        {
          GIT_INDEX_FILE: scratchIndexPath,
        },
        filtered,
      );
      if (scratchListing === null) return stepFailure("ls-files", "could not list the index entries");
      if (filtered.some((path) => unseenListing.unseen.has(path) !== scratchListing.unseen.has(path)))
        return stepFailure(
          "rewritten",
          "an entry this upload read was marked assume-unchanged or skip-worktree in one copy of the index and not the other since the build began",
        );
      stagedIndexEntries = new Map(
        filtered_4.map(({ path, newId, newMode }) => [
          path,
          {
            id: newId,
            mode: newMode,
          },
        ]),
      );
      let zeroIdPaths = new Set(filtered_2.flatMap(({ path, newId }) => (/^0+$/.test(newId) ? [path] : [])));
      skipWorktreePaths = flattened_3.filter(
        (path) =>
          unseenListing.unseen.has(path) &&
          stagedIndexEntries.has(path) &&
          !zeroIdPaths.has(path) &&
          !leftOutSet.has(path),
      );
      let leftOutAll = new Set([...leftOutSet, ...skipWorktreePaths]);
      let symlinkTarget = await readSymlinkTarget(
        runHardenedGit,
        scratchIndexPath,
        stashChange.entries.filter((entry) => !leftOutAll.has(entry.path)),
      );
      if (symlinkTarget.kind === "failed") return symlinkTarget;
      let paths = stashChange.entries.flatMap((entry) =>
        entry.kind === "absent" && attrPathSet.has(entry.path) && !indexFiles.skipWorktree.has(entry.path)
          ? [entry.path]
          : [],
      );
      intentToAddPaths = paths.filter((path) => !stagedDeletedPaths.has(path));
      let markAdded = await markPathsIntentToAdd(
        runHardenedGit,
        {
          GIT_INDEX_FILE: scratchIndexPath,
        },
        baseTree,
        paths,
      );
      if (markAdded.code !== 0) return stepFailure("update-index", markAdded.stderr, markAdded);
      let skippedPaths = stashChange.entries.flatMap((entry) =>
        entry.kind === "file" && !leftOutAll.has(entry.path) ? [entry.path] : [],
      );
      laidFiles = stashChange.entries.flatMap((entry) =>
        (entry.kind === "file" || entry.kind === "symlink") && !leftOutAll.has(entry.path)
          ? [entry.path]
          : [],
      );
      laidEntries = new Map(
        [...symlinkTarget.ids].map(([path, id]) => [
          path,
          {
            mode: SYMLINK_MODE_VALUE,
            id,
          },
        ]),
      );
      if (skippedPaths.length > 0) {
        replayIndexPath = join(dirname(scratchIndexPath), `replay-${randomBytes(6).toString("hex")}.index`);
        let replayVerdict = await lstatNoFollow(scratchIndexPath, replayIndexPath);
        if (replayVerdict !== null)
          return stepFailure(
            replayVerdict.kind === "disk" ? "scratch-index" : "rewritten",
            replayVerdict.detail,
          );
        let replayListing = await listFilesNoPrecompose(
          stageRun,
          {
            GIT_INDEX_FILE: replayIndexPath,
          },
          skippedPaths,
        );
        if (replayListing === null) return stepFailure("update-index", "the laid paths could not be listed");
        if (replayListing.unseen.size > 0)
          return stepFailure(
            "rewritten",
            "an entry this upload is about to lay was marked assume-unchanged or skip-worktree in the scratch index since it was written",
          );
        let layIndex = (args, indexPath = scratchIndexPath) =>
          stageRun(
            [
              "-c",
              "core.bigFileThreshold=512m",
              "-c",
              "core.checkStat=default",
              "-c",
              "core.trustctime=true",
              "update-index",
              ...args,
              "-z",
              "--add",
              "--stdin",
            ],
            {
              GIT_INDEX_FILE: indexPath,
            },
            skippedPaths.map((path) => `${path}\x00`).join(""),
          );
        let layResult = await layIndex(["--ignore-skip-worktree-entries"]);
        let layRetryResult = layResult.exitCode === GIT_SIGPIPE_EXIT_CODE ? await layIndex([]) : layResult;
        if (layRetryResult.code !== 0)
          return stepFailure("update-index", layRetryResult.stderr, layRetryResult);
        let laidIndex = await listSkipWorktreeEntries(stageRun, replayIndexPath, layIndex, skippedPaths);
        if (laidIndex === null)
          return stepFailure("update-index", "the lay could not be replayed to learn the laid entries");
        let copiesByPath = new Map(
          stashChange.entries.flatMap((entry) => (entry.kind === "file" ? [[entry.path, entry.copy]] : [])),
        );
        let knownModes = new Map([
          ...filtered_2.map(({ path, oldMode }) => [path, oldMode]),
          ...headState.inspection.staged.map(({ path, newMode }) => [path, newMode]),
        ]);
        if (
          skippedPaths.find((path) => {
            let mode = laidIndex.get(path)?.mode;
            return !(
              mode !== undefined &&
              (REGULAR_FILE_MODES.includes(mode) ||
                (mode === SYMLINK_MODE_VALUE && knownModes.get(path) === SYMLINK_MODE_VALUE))
            );
          }) !== undefined
        )
          return stepFailure(
            "rewritten",
            "an entry this upload laid as a file is recorded as something else in the scratch index",
          );
        if (
          skippedPaths.find((path) => {
            let id = laidIndex.get(path)?.id;
            let copy = copiesByPath.get(path);
            return copy === undefined || (id !== copy.blobId && id !== copy.lfBlobId);
          }) !== undefined
        )
          return stepFailure("rewritten", "an entry this upload laid does not hold the bytes staged for it");
        for (let indexPath of [scratchIndexPath, replayIndexPath]) {
          let listing = await listFilesNoPrecompose(
            stageRun,
            {
              GIT_INDEX_FILE: indexPath,
            },
            skippedPaths,
          );
          if (listing === null) return stepFailure("update-index", "the laid paths could not be listed");
          if (listing.unseen.size > 0 || listing.absent.size > 0)
            return stepFailure(
              "rewritten",
              "an entry this upload laid is marked assume-unchanged or skip-worktree in the scratch index, or is no longer there by its name",
            );
        }
        if (!(await stagedCopiesUnchanged(stageDir, stashChange.copies)))
          return stepFailure("stage", "the staged copies changed while git read them");
        if (!infoAttributesUnchanged(infoAttributes, await readInfoAttributes(layout.commonDir)))
          return stepFailure("check-attr", ".git/info/attributes changed while the changes were hashed");
        laidIndex.forEach((entry, path) => laidEntries.set(path, entry));
      }
    }
    let intentResult = await markPathsIntentToAdd(
      runHardenedGit,
      {
        GIT_INDEX_FILE: scratchIndexPath,
      },
      baseTree,
      deletedCredentialPaths,
    );
    if (intentResult.code !== 0) return stepFailure("update-index", intentResult.stderr, intentResult);
    let writeTreeFinal = await runHardenedGit(["write-tree", "--ignore-cache-tree"], {
      GIT_INDEX_FILE: scratchIndexPath,
    });
    if (writeTreeFinal.code !== 0)
      return stepFailure("write-tree", writeTreeFinal.stderr || writeTreeFinal.stdout, writeTreeFinal);
    let iTree_2 = writeTreeFinal.stdout.trim();
    if (opts.leaveOutUncommittedCredentialFiles) {
      let indexChange = await describeIndexEntryChange(
        reader,
        baseTree,
        iTree_2,
        shouldSkipName,
        caseFolding,
      );
      if (isTreeReadFailure(indexChange))
        return treeReadFailure(indexChange, "cat-file", TREE_READBACK_MISMATCH);
      let filtered = indexChange.filter(({ why }) => why !== "forged" && why !== "alias");
      if (filtered.length > 0) {
        let restoreGap = await restoreIndexEntries(
          runHardenedGit,
          reader,
          scratchIndexPath,
          baseTree,
          filtered.map(({ path }) => path),
        );
        if (restoreGap !== null)
          return {
            kind: "failed",
            ...restoreGap,
          };
        let writeTreeNinth = await runHardenedGit(["write-tree", "--ignore-cache-tree"], {
          GIT_INDEX_FILE: scratchIndexPath,
        });
        if (writeTreeNinth.code !== 0)
          return stepFailure("write-tree", writeTreeNinth.stderr || writeTreeNinth.stdout, writeTreeNinth);
        iTree_2 = writeTreeNinth.stdout.trim();
        leftOutCredentialFiles.push(...filtered);
      }
      let results = await Promise.all(
        normalizeCaseForComparison_2([iTree_2, indexTree]).map((treeId) =>
          describeIndexEntryChange(reader, baseTree, treeId, shouldSkipName, caseFolding),
        ),
      );
      let found = results.find(isTreeReadFailure);
      if (found !== undefined) return treeReadFailure(found, "cat-file", TREE_READBACK_MISMATCH);
      let refusedEntries = [
        ...new Map(
          results
            .flatMap((change) => (isTreeReadFailure(change) ? [] : change))
            .map((change) => [change.path, change]),
        ).values(),
      ];
      if (refusedEntries.length > 0)
        return {
          kind: "refused",
          refused: refusedEntries,
          decidedOn: "tree",
        };
    }
    let indexEntries = await parseIndexEntries(reader, baseTree, indexTree);
    if (isTreeReadFailure(indexEntries))
      return treeReadFailure(indexEntries, "cat-file", TREE_READBACK_MISMATCH);
    let paths_2 = indexEntries.filter(({ status, newId }) => status !== "D" && stagedBlobIds.has(newId));
    if (paths_2.length > 0) return sameBytesRefusal(paths_2);
    let finalEntries =
      iTree_2 === indexTree ? indexEntries : await parseIndexEntries(reader, baseTree, iTree_2);
    if (isTreeReadFailure(finalEntries))
      return treeReadFailure(finalEntries, "cat-file", TREE_READBACK_MISMATCH);
    if (iTree_2 !== indexTree) {
      let laidSet = new Set(laidFiles);
      let paths = finalEntries.filter(
        ({ path, status, newId }) => status !== "D" && !laidSet.has(path) && stagedBlobIds.has(newId),
      );
      if (paths.length > 0) return sameBytesRefusal(paths);
    }
    if (skipWorktreePaths.length > 0) {
      let mapped = [indexEntries, finalEntries].map(
        (entries) =>
          new Map(
            entries.map(({ path, status, newId, newMode }) => [
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
        skipWorktreePaths.find((path) =>
          mapped.some((entryMap) => {
            let entry = entryMap.get(path);
            let laid = stagedIndexEntries.get(path);
            return (
              entry === undefined ||
              entry === null ||
              laid === undefined ||
              entry.id !== laid.id ||
              entry.mode !== laid.mode
            );
          }),
        ) !== undefined
      )
        return stepFailure(
          "rewritten",
          "a staged entry this upload left as the index had it was replaced in the scratch index before the trees were written",
        );
    }
    if (laidFiles.length > 0) {
      let entryMap2 = new Map(
        finalEntries.map(({ path, status, newId, newMode }) => [
          path,
          status === "D"
            ? null
            : {
                mode: newMode,
                id: newId,
              },
        ]),
      );
      let filtered = laidFiles.filter((path) => !entryMap2.has(path));
      let treePaths = filtered.length > 0 ? await resolveTreePaths(reader, baseTree, filtered) : new Map();
      if (isTreeReadFailure(treePaths)) return treeReadFailure(treePaths, "cat-file", TREE_READBACK_MISMATCH);
      if (
        laidFiles.find((path) => {
          let entry = entryMap2.has(path) ? entryMap2.get(path) : treePaths.get(path);
          let laid = laidEntries.get(path);
          return (
            entry === null ||
            entry === undefined ||
            laid === undefined ||
            entry.id !== laid.id ||
            entry.mode !== laid.mode
          );
        }) !== undefined
      )
        return stepFailure(
          "rewritten",
          "an entry this upload laid was replaced in the scratch index before the work tree was written",
        );
    }
    if (iTree_2 === baseTree && indexTree === baseTree)
      return {
        kind: "none",
        leftOut: leftOutCredentialFiles,
      };
    let baseDescription = await describeStashBase(runHardenedGit, base);
    let indexCommit = await runHardenedGit(
      ["commit-tree", indexTree, "-p", base, "-m", `index on ${baseDescription}`],
      STASH_IDENTITY_ENV,
    );
    if (indexCommit.code !== 0) return stepFailure("commit-tree", indexCommit.stderr, indexCommit);
    let wipCommit = await runHardenedGit(
      [
        "commit-tree",
        iTree_2,
        "-p",
        base,
        "-p",
        indexCommit.stdout.trim(),
        "-m",
        `WIP on ${baseDescription}`,
      ],
      STASH_IDENTITY_ENV,
    );
    if (wipCommit.code !== 0) return stepFailure("commit-tree", wipCommit.stderr, wipCommit);
    let commits = [
      {
        id: indexCommit.stdout.trim(),
        tree: indexTree,
        parents: [base],
      },
      {
        id: wipCommit.stdout.trim(),
        tree: iTree_2,
        parents: [base, indexCommit.stdout.trim()],
      },
    ];
    for (let { id, tree, parents } of commits) {
      let commitInfo = await reader.commit(id);
      if (isTreeReadFailure(commitInfo))
        return treeReadFailure(commitInfo, "commit-tree", COMMIT_READBACK_MISMATCH);
      if (
        commitInfo.tree !== tree ||
        commitInfo.parents.length !== parents.length ||
        commitInfo.parents.some((parent, parentIndex) => parent !== parents[parentIndex])
      )
        return stepFailure("verify", COMMIT_READBACK_MISMATCH);
    }
    return {
      kind: "created",
      commit: wipCommit.stdout.trim(),
      leftOut: leftOutCredentialFiles,
      deletedUnstaged: [...intentToAddPaths],
    };
  } catch (error) {
    return stepFailure("scratch-index", errorMessage(error));
  } finally {
    await Promise.all([
      ...[
        scratchIndexPath,
        `${scratchIndexPath}.lock`,
        ...(replayIndexPath === null ? [] : [replayIndexPath, `${replayIndexPath}.lock`]),
      ].map((path) => unlink(path).catch(() => {})),
      ...[
        ...(tempIndexDir === null ? [] : [tempIndexDir]),
        ...(stageDir === null ? [] : [stageDir]),
        ...(attrsDir === null ? [] : [attrsDir]),
      ].map((dir) =>
        rm(dir, {
          recursive: true,
          force: true,
        }).catch(() => {}),
      ),
    ]);
  }
}
//@ chunk-sfy2wa1e.js:54748-55453 placement
async function createStashCommit(runGit, ref, signal, pinnedIndexFile) {
  let result = await listGitRefs(
    runGit,
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
  if (result.code === 0) {
    let trimmed = result.stdout.trim();
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
  let isSilent = seenStderr(result).trim() === "";
  if (result.exitCode === 1 && isSilent) {
    logForDebugging(
      `[gitBundle] git stash create exited ${result.code} with no output \u2014 treating as no uncommitted changes`,
    );
    return {
      kind: "none",
      leftOut: [],
    };
  }
  return !ref
    ? {
        kind: "none",
        leftOut: [],
      }
    : isSilent
      ? {
          ...stepFailure(
            "stash create",
            result.exitCode === undefined
              ? "it was stopped, ran out of time or could not start, and left no message"
              : `it ended with exit status ${result.exitCode} and left no message`,
          ),
          silent: isSilent,
        }
      : stepFailure("stash create", result.stderr, result);
}
//@ chunk-sfy2wa1e.js:55453-56366 placement
async function restoreIndexEntries(runGit, reader, opts, baseTree, indexIds) {
  let treePaths = await resolveTreePaths(reader, baseTree, indexIds);
  if (isTreeReadFailure(treePaths))
    return treeReadFailure(
      treePaths,
      "cat-file",
      "the trees holding the entries to restore could not be read back as what their ids name",
    );
  let absentEntry = `0 ${"0".repeat(baseTree.length)}`;
  let updateResult = await runGit(
    ["update-index", "-z", "--index-info"],
    {
      GIT_INDEX_FILE: opts,
    },
    indexIds
      .map((path) => {
        let pathEntry = treePaths.get(path);
        return `${pathEntry === undefined ? absentEntry : `${pathEntry.mode.padStart(6, "0")} ${pathEntry.id}`}	${path}\x00`;
      })
      .join(""),
  );
  if (updateResult.code !== 0) return stepFailure("update-index", updateResult.stderr, updateResult);
  let ignoredNames = ignoredPathLines(seenStderr(updateResult), indexIds);
  if (ignoredNames.length > 0)
    return {
      step: "refused-name",
      detail: `git refuses a name it was asked to restore: ${ignoredNames.slice(0, 3).join(", ")}`,
    };
  let indexEntries = await listIndexEntriesNamed(runGit, opts, new Set(indexIds), dirname(opts));
  if (indexEntries === null)
    return {
      step: "ls-files",
      detail: "could not list the index entries",
    };
  return indexIds.some((path) => {
    let indexEntry = indexEntries.get(path);
    return (
      (indexEntry !== undefined && !splitArgsIntoSlices(indexEntry)) ||
      indexEntry?.id !== treePaths.get(path)?.id ||
      indexEntry?.mode !== treePaths.get(path)?.mode.padStart(6, "0")
    );
  })
    ? {
        step: "verify",
        detail: "the entries just restored are not the ones the verified trees hold",
      }
    : null;
}
//@ chunk-sfy2wa1e.js:56366-56461 placement
async function sha256OfFile(path) {
  let hash = createHash("sha256");
  await readFileChunks(path, (chunk) => {
    hash.update(chunk);
  });
  return hash.digest("hex");
}
//@ chunk-sfy2wa1e.js:56461-56517 placement
function readTreeFailure({ detail, run }) {
  return stepFailure("read-tree", detail, run);
}
//@ chunk-sfy2wa1e.js:56517-57901 placement
async function listSparseCheckout(cwd, indexPath, dir, reader, iTree, root) {
  let listingsDir = await mkdtemp(join(dir, "claude-seed-listings-"));
  try {
    let fileCounter = 0;
    let listOnce = async (label, extraEnv, excludedPaths) => {
      let pathspecs =
        excludedPaths.length === 0
          ? []
          : ["--", ".", ...excludedPaths.map((excludedPath) => `:(exclude,literal)${excludedPath}`)];
      for (let sparseFlags of [["--sparse"], []]) {
        let listResult = await open(
          join(listingsDir, `${label}.${fileCounter++}`),
          GIT_STDOUT_CAPTURE_FLAGS,
          384,
        );
        try {
          let runResult = await cwd(
            ["ls-files", ...sparseFlags, "-s", "-z", ...pathspecs],
            {
              GIT_GLOB_PATHSPECS: "0",
              GIT_ICASE_PATHSPECS: "0",
              ...extraEnv,
            },
            undefined,
            undefined,
            listResult.fd,
          );
          if (runResult.code === 0) return await sha256OfFile(listResult);
          if (runResult.exitCode !== GIT_SIGPIPE_EXIT_CODE || sparseFlags.length === 0)
            return {
              detail: runResult.stderr || "could not list the index",
              run: runResult,
            };
        } finally {
          await listResult.close();
        }
      }
      return {
        detail: "could not list the index",
      };
    };
    let compareListings = async (excludedPaths) => {
      let [treesDigest, indexDigest] = await Promise.all([
        listOnce(
          "trees",
          {
            GIT_INDEX_FILE: indexPath,
          },
          [],
        ),
        listOnce("index", undefined, excludedPaths),
      ]);
      if (typeof treesDigest !== "string") return treesDigest;
      if (typeof indexDigest !== "string") return indexDigest;
      return treesDigest === indexDigest ? "agree" : "differ";
    };
    let listingComparison = await compareListings([]);
    if (listingComparison !== "differ")
      return listingComparison === "agree"
        ? {
            kind: "agree",
          }
        : readTreeFailure(listingComparison);
    let diffResult = await cwd(
      ["diff-files", "-z", "--name-only", "--diff-filter=AD", "--ignore-submodules=dirty"],
      LITERAL_PATHSPEC_ENV,
    );
    if (diffResult.code !== 0)
      return readTreeFailure({
        detail: diffResult.stderr,
        run: diffResult,
      });
    let filtered = diffResult.stdout.split("\x00").filter((path) => path !== "");
    let treePaths = await resolveTreePaths(reader, iTree, filtered);
    if (isTreeReadFailure(treePaths))
      return treeReadFailure(
        treePaths,
        "cat-file",
        "the index's trees could not be read back as what their ids name",
      );
    let excludedPaths = filtered.filter((path) => !treePaths.has(path));
    if (excludedPaths.length === 0 || excludedPaths.some((path) => !isSafeRepoRelativePath(path, root)))
      return {
        kind: "differ",
      };
    let refinedVerdict = await compareListings(excludedPaths);
    return refinedVerdict === "agree"
      ? {
          kind: "agree",
        }
      : refinedVerdict === "differ"
        ? {
            kind: "differ",
          }
        : readTreeFailure(refinedVerdict);
  } finally {
    await rm(listingsDir, {
      recursive: true,
      force: true,
    }).catch(() => {});
  }
}
//@ chunk-sfy2wa1e.js:57901-58723 placement
async function listIndexIds(cwd, indexPath, dir, shouldWithhold, tempRoot, root, signal) {
  let idsDir = await mkdtemp(join(tempRoot, "claude-seed-ids-"));
  try {
    let fileCounter = 0;
    for (let sparseFlags of [["--sparse"], []]) {
      let indexHandle = await open(join(idsDir, `index.${fileCounter++}`), GIT_STDOUT_CAPTURE_FLAGS, 384);
      try {
        let listResult = await cwd(
          ["ls-files", ...sparseFlags, "-s", "-z"],
          {
            GIT_INDEX_FILE: indexPath,
          },
          undefined,
          undefined,
          indexHandle.fd,
        );
        if (listResult.code === 0) {
          let elsewhere = [];
          let withheldTracked = new Map();
          let rest = "";
          await readFileChunks(indexHandle, (chunk) => {
            if (signal?.aborted) return;
            let parts = (rest + chunk.toString("latin1")).split("\x00");
            rest = parts.pop() ?? "";
            for (let line of parts) {
              let index = line.indexOf("\t");
              let [, id = "", stage = ""] = line.slice(0, index).split(" ");
              let str = Buffer.from(line.slice(index + 1), "latin1").toString("utf8");
              if (!isSafeRepoRelativePath(str, root) || hasDosShortNameSegment(str)) continue;
              if (stage === "0" && shouldWithhold(str)) withheldTracked.set(str, id);
              let expectedPath = dir.get(id);
              if (expectedPath !== undefined && str !== expectedPath) elsewhere.push(str);
            }
          });
          if (signal?.aborted) return null;
          return rest === ""
            ? {
                elsewhere,
                withheldTracked,
              }
            : null;
        }
        if (listResult.exitCode !== GIT_SIGPIPE_EXIT_CODE) return null;
      } finally {
        await indexHandle.close();
      }
    }
    return null;
  } finally {
    await rm(idsDir, {
      recursive: true,
      force: true,
    }).catch(() => {});
  }
}
//@ chunk-sfy2wa1e.js:58723-58895 placement
var HEAD_UNVERIFIABLE_TEXT = "HEAD's commit or its .gitattributes could not be read to be verified";
var NO_GIT_DIR_TEXT =
  "internal error: no git directory was chosen for this linked worktree, so git was not run";
//@ chunk-sfy2wa1e.js:58895-59338 placement
/**
 * 创建在加固模式下运行 git 的执行函数；链接工作树缺少管理目录时直接返回拒绝结果。
 */
function createHardenedGitRunner(
  runGit,
  workTree,
  signal,
  indexFile,
  probes = currentGitBinaryState(),
  { hardenedMaxBuffer: maxBuffer } = {},
) {
  if (
    workTree.checkout === "linked" &&
    workTree.adminDir === undefined &&
    workTree.runsInOwnDirectories !== true
  )
    return () =>
      Promise.resolve({
        stdout: "",
        stderr: NO_GIT_DIR_TEXT,
        code: 126,
      });
  let reachRoots = indexFile ?? reachForBoundSession(workTree);
  let screenMemo = probes.screenMemo ?? createReachCollector();
  return (args, env, input, encoding, stdoutFd) =>
    listGitRefs(runGit, args, {
      hardened: true,
      layout: workTree,
      signal,
      probes,
      env,
      input,
      ...(encoding !== undefined && {
        encoding,
      }),
      ...(stdoutFd !== undefined && {
        stdoutFd,
      }),
      ...(reachRoots !== undefined && {
        reachRoots,
        screenMemo,
      }),
      ...(maxBuffer !== undefined && {
        hardenedMaxBuffer: maxBuffer,
      }),
    });
}
//@ chunk-sfy2wa1e.js:59338-61237 placement
/**
 * 解析 HEAD（无提交、分离、分支），列出被省略的内容。
 */
async function resolveHeadState(runGit, opts) {
  let result = await runGit(["rev-parse", "-q", "--verify", "HEAD"]);
  if (result.code !== 0)
    return result.exitCode === 1
      ? {
          kind: "none",
          leftOut: [],
        }
      : stepFailure("rev-parse", result.stderr, result);
  let commitCheck = await runGit(["rev-parse", "-q", "--verify", `${result.stdout.trim()}^{commit}`]);
  if (commitCheck.code !== 0) {
    let typeCheck = await runGit(["cat-file", "-t", result.stdout.trim()]);
    return typeCheck.code === 0 && ["tree", "blob"].includes(typeCheck.stdout.trim())
      ? stepFailure("verify", "HEAD names a tree or blob, not a commit")
      : stepFailure("rev-parse", commitCheck.stderr || "HEAD is not a commit");
  }
  let options = commitCheck.stdout.trim();
  let reader = new GitObjectReader(batchCatFile(runGit, opts), options);
  let [commit, writeTree] = await Promise.all([
    reader.commit(options),
    runGit(["write-tree", "--ignore-cache-tree"]),
  ]);
  if (isTreeReadFailure(commit))
    return treeReadFailure(commit, "rev-parse", "HEAD could not be read back as the commit its id names");
  if (writeTree.code !== 0) return stepFailure("write-tree", writeTree.stderr || writeTree.stdout, writeTree);
  let tree = commit.tree;
  let trimmed = writeTree.stdout.trim();
  let indexEntries = await parseIndexEntries(reader, tree, trimmed);
  if (isTreeReadFailure(indexEntries))
    return treeReadFailure(
      indexEntries,
      "cat-file",
      "HEAD's or the index's trees could not be read back as what their ids name",
    );
  let staged = indexEntries;
  let diffResult = await runGit([
    "--no-optional-locks",
    "diff-files",
    "-z",
    "--no-renames",
    "--ignore-submodules=dirty",
  ]);
  let changedEntries = diffResult.code === 0 ? parseDiffRawZ(diffResult.stdout) : null;
  if (changedEntries === null) return stepFailure("diff-files", diffResult.stderr, diffResult);
  if ([...changedEntries, ...staged].some(({ path }) => path.includes("\uFFFD")))
    return stepFailure("path-encoding", "a changed path is not valid UTF-8");
  let treePaths = await resolveTreePaths(
    reader,
    tree,
    changedEntries.map(({ path }) => path),
  );
  if (isTreeReadFailure(treePaths))
    return treeReadFailure(
      treePaths,
      "cat-file",
      "HEAD's trees to the changed files could not be read back as what their ids name",
    );
  let zeroId = "0".repeat(tree.length);
  let changedPaths = new Set(changedEntries.map(({ path }) => path));
  let working = [
    ...staged.filter(({ path }) => !changedPaths.has(path)),
    ...changedEntries.flatMap((entry) => {
      let treeEntry = treePaths.get(entry.path);
      if (entry.status === "D")
        return treeEntry === undefined || isWindowsUnholdableDeletion(entry, treePaths)
          ? []
          : [
              {
                path: entry.path,
                status: "D",
                oldMode: treeEntry.mode.padStart(6, "0"),
                newMode: "000000",
                oldId: treeEntry.id,
                newId: zeroId,
              },
            ];
      return [
        {
          path: entry.path,
          status: treeEntry === undefined ? "A" : "M",
          oldMode: treeEntry === undefined ? "000000" : treeEntry.mode.padStart(6, "0"),
          newMode: entry.newMode,
          oldId: treeEntry?.id ?? zeroId,
          newId: zeroId,
        },
      ];
    }),
  ];
  return {
    kind: "inspected",
    inspection: {
      base: options,
      baseTree: tree,
      iTree: trimmed,
      staged,
      working,
      reader,
      namesWindowsCannotHold: countWhere(changedEntries, (entry) =>
        isWindowsUnholdableDeletion(entry, treePaths),
      ),
    },
  };
}
//@ chunk-sfy2wa1e.js:61237-61373 placement
function isWindowsUnholdableDeletion(entry, treePaths) {
  return (
    getPlatform() === "windows" &&
    entry.status === "D" &&
    treePaths.has(entry.path) &&
    hasUnsafeCharSegment(entry.path) &&
    !entry.path.includes("\\") &&
    isSafeRepoRelativePath(entry.path, true) &&
    !hasDosShortNameSegment(entry.path)
  );
}
//@ chunk-sfy2wa1e.js:61373-61536 placement
function findSuspiciousChangedPaths({ staged, working }, state) {
  return normalizeCaseForComparison_2([...staged, ...working].map(({ path }) => path))
    .sort()
    .flatMap((path) =>
      !isSafeRepoRelativePath(path, state)
        ? [
            {
              path,
              why: "forged",
            },
          ]
        : hasDosShortNameSegment(path)
          ? [
              {
                path,
                why: "alias",
              },
            ]
          : [],
    );
}
//@ chunk-sfy2wa1e.js:61536-62505 placement
async function classifyIndexEntry(
  workTree,
  { staged, working },
  shouldLeaveOut,
  root,
  isAlreadyLeftOut = () => false,
) {
  let allPaths = normalizeCaseForComparison_2([...staged, ...working].map(({ path }) => path));
  let filtered = allPaths.filter((path) => !isSafeRepoRelativePath(path, root));
  let filtered_2 = allPaths.filter(
    (path) => isSafeRepoRelativePath(path, root) && hasDosShortNameSegment(path),
  );
  let unsafePaths = new Set([...filtered, ...filtered_2]);
  let shouldKeepStagedPath = ({ path }) => !unsafePaths.has(path) && shouldLeaveOut(path);
  let filtered_3 = staged.filter(shouldKeepStagedPath);
  let leftOutAddedPaths = new Set(filtered_3.map(({ path }) => path));
  let compareWorking = limitConcurrency(GIT_READ_CONCURRENCY, async (entry) =>
    !leftOutAddedPaths.has(entry.path) &&
    !isAlreadyLeftOut(entry.path) &&
    (await compareWorktreeEntry(workTree, entry, root)) === "unchanged"
      ? []
      : [entry],
  );
  let changedWorking = (await Promise.all(working.filter(shouldKeepStagedPath).map(compareWorking))).flat();
  let addedPaths = normalizeCaseForComparison_2(
    [...filtered_3, ...changedWorking].filter(({ status }) => status === "A").map(({ path }) => path),
  );
  let addedPathSet = new Set(addedPaths);
  let changedPaths = normalizeCaseForComparison_2(
    [...filtered_3, ...changedWorking]
      .filter(({ path, status }) => status !== "D" && !addedPathSet.has(path))
      .map(({ path }) => path),
  );
  let keptPaths = new Set([...addedPaths, ...changedPaths]);
  let remainingPaths = normalizeCaseForComparison_2(
    [...filtered_3, ...changedWorking].map(({ path }) => path).filter((path) => !keptPaths.has(path)),
  );
  let probeDirectory = limitConcurrency(GIT_READ_CONCURRENCY, async (path) =>
    (await isNotPlainDirectory(workTree, path)) ? [path] : [],
  );
  let resurrected = (await Promise.all(remainingPaths.map(probeDirectory))).flat();
  return [
    ...filtered.map((path) => ({
      path,
      why: "forged",
    })),
    ...filtered_2.map((path) => ({
      path,
      why: "alias",
    })),
    ...addedPaths.map((path) => ({
      path,
      why: "added",
    })),
    ...changedPaths.map((path) => ({
      path,
      why: "changed",
    })),
    ...resurrected.map((path) => ({
      path,
      why: "resurrected",
    })),
  ].sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));
}
//@ chunk-sfy2wa1e.js:62505-62817 placement
async function describeIndexEntryChange(reader, baseTree, iTree, shouldLeaveOut, root) {
  let indexEntries = await parseIndexEntries(reader, baseTree, iTree);
  if (isTreeReadFailure(indexEntries)) return indexEntries;
  let filtered = indexEntries.filter(
    ({ path, status }) =>
      status !== "D" &&
      (!isSafeRepoRelativePath(path, root) || hasDosShortNameSegment(path) || shouldLeaveOut(path)),
  );
  let statusByPath = new Map(filtered.map(({ path, status }) => [path, status]));
  return normalizeCaseForComparison_2(filtered.map(({ path }) => path))
    .sort()
    .map((path) => ({
      path,
      why: !isSafeRepoRelativePath(path, root)
        ? "forged"
        : hasDosShortNameSegment(path)
          ? "alias"
          : statusByPath.get(path) === "A"
            ? "added"
            : "changed",
    }));
}
//@ chunk-sfy2wa1e.js:62817-63014 placement
var MISSING_OBJECT_RE_2 =
  /invalid object \d+ [0-9a-f]+ for|could not fetch [0-9a-f]+ from promisor remote|lazy fetching disabled|missing blob/;
var UNMERGED_INDEX_RE = /needs merge|you need to resolve your current index first|unmerged/i;
//@ chunk-sfy2wa1e.js:63014-63157 placement
function INDEX_PROBLEM_KINDS(stderr) {
  let firstLine = getFirstLine(seenStderr(stderr).trim());
  return MISSING_OBJECT_RE_2.test(firstLine)
    ? "object_missing"
    : UNMERGED_INDEX_RE.test(firstLine)
      ? "unmerged"
      : firstLine.includes("index.lock")
        ? "index_locked"
        : undefined;
}
//@ chunk-sfy2wa1e.js:63157-63263 placement
function stepFailure(step, detail, result) {
  let problem = result && INDEX_PROBLEM_KINDS(result);
  return {
    kind: "failed",
    step,
    detail: getFirstLine(detail.trim()),
    ...(problem !== undefined && {
      said: problem,
    }),
  };
}
//@ chunk-sfy2wa1e.js:63263-63373 placement
function sameBytesRefusal(paths) {
  return {
    kind: "refused",
    refused: paths.map(({ path }) => ({
      path,
      why: "same-bytes",
    })),
    decidedOn: "tree",
  };
}
//@ chunk-sfy2wa1e.js:63373-63468 placement
function ignoredPathLines(stdout, names) {
  let line = new Set(
    stdout.split(`
`),
  );
  return names.filter((name) => line.has(`Ignoring path ${name}`));
}
//@ chunk-sfy2wa1e.js:63468-63590 placement
function treeReadFailure(result, step, message) {
  return result.failed === "tampered"
    ? stepFailure("verify", message)
    : result.failed === "malformed"
      ? stepFailure("malformed-tree", result.dir ?? "")
      : stepFailure(step, message);
}
//@ chunk-sfy2wa1e.js:63590-63717 placement
function formatDirectoryLabel(detail) {
  return detail === undefined || detail === ""
    ? "the top of the checkout"
    : `directory '${truncateCodePoints(detail.replace(/[\p{Cc}\p{Cf}']/gu, "?"), 120)}'`;
}
//@ chunk-sfy2wa1e.js:63717-63994 placement
function parseDiffRawZ(stdout) {
  let parts = stdout.split("\x00");
  if (parts.pop() !== "" || parts.length % 2 !== 0) return null;
  let list = Array.from(
    {
      length: parts.length / 2,
    },
    (entry, index) => {
      let match = DIFF_RAW_LINE_RE.exec(parts[2 * index]);
      return match
        ? {
            path: parts[2 * index + 1],
            oldMode: match[1],
            newMode: match[2],
            oldId: match[3],
            newId: match[4],
            status: match[5],
          }
        : null;
    },
  );
  return list.every((entry) => entry !== null) ? list : null;
}
//@ chunk-sfy2wa1e.js:63994-64151 placement
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
//@ chunk-sfy2wa1e.js:64151-64277 placement
function sameFileStamp(stamp, stamp_2) {
  return stamp === null || stamp_2 === null
    ? stamp === stamp_2
    : stamp.ino === stamp_2.ino &&
        stamp.size === stamp_2.size &&
        stamp.mtimeMs === stamp_2.mtimeMs &&
        stamp.ctimeMs === stamp_2.ctimeMs;
}
//@ chunk-sfy2wa1e.js:64277-64390 placement
function fileStampFromBigStats(stats) {
  return {
    size: Number(stats.size),
    mtimeMs: Number(stats.mtimeNs) / 1e6,
    ctimeMs: Number(stats.ctimeNs) / 1e6,
    ino: stats.ino,
  };
}
//@ chunk-sfy2wa1e.js:64390-64517 placement (2.1.88 match: isRealPathWithinTeamDir, 0.772)
async function lstatBigintOrNull(path, stat = lstat) {
  try {
    return await stat(path, {
      bigint: true,
    });
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT" || getErrnoCode(error) === "ENOTDIR") return null;
    throw error;
  }
}
//@ chunk-sfy2wa1e.js:64517-64627 placement
var FILTER_ATTRIBUTE_RE = /(?:^|\s|")[-!]?(?:filter|working-tree-encoding|ident)(?:=|\s|$)/;
var MACRO_OR_QUOTED_ATTR_RE = /^[ \t\r]*(?:\[attr\]|")/;
var MAX_ATTRIBUTE_LINE_BYTES = 2048;
//@ chunk-sfy2wa1e.js:64627-64698 placement
function hasOverlongAttributeLine(text) {
  return text
    .split(
      `
`,
    )
    .some((line) => Buffer.byteLength(line) >= MAX_ATTRIBUTE_LINE_BYTES);
}
//@ chunk-sfy2wa1e.js:64698-64813 placement
function attributeLines(text) {
  return text
    .replace(/^\uFEFF/, "")
    .split(
      `
`,
    )
    .map((line) => firstLineOf(line, "\x00"))
    .filter((nonEmpty) => !/^[ \t\r]*#/.test(nonEmpty));
}
//@ chunk-sfy2wa1e.js:64813-65180 placement
async function findGitDirCaseVariants(gitRoot, workTree) {
  let platform = getPlatform();
  let [dotGit, dotGitUpper] = await Promise.all([
    lstat(join(workTree, ".git"), {
      bigint: true,
    }).catch(() => null),
    lstat(join(workTree, ".GIT"), {
      bigint: true,
    }).catch(() => null),
  ]);
  let sameInode =
    dotGit !== null &&
    dotGitUpper !== null &&
    dotGit.ino === dotGitUpper.ino &&
    dotGit.dev === dotGitUpper.dev;
  let ignoreCase = await gitRoot(["config", "--bool", "core.ignorecase"]);
  return {
    caseBlind:
      platform === "macos" ||
      platform === "windows" ||
      sameInode ||
      (ignoreCase.code === 0 && ignoreCase.stdout.trim() === "true"),
    normalizationBlind: platform === "macos",
  };
}
//@ chunk-sfy2wa1e.js:65180-66284 placement
async function readInfoAttributes(
  commonDir,
  { shouldStampAbove: options = false, shouldStopAtLink: stopAtLink = false } = {},
) {
  let infoDir = join(commonDir, "info");
  let attributesPath = join(infoDir, "attributes");
  let infoDirHandle = await openGitInfoDir(infoDir, options, stopAtLink).catch(() => {
    return;
  });
  if (infoDirHandle === undefined)
    return {
      kind: "unreadable",
      bytes: null,
      stamp: null,
    };
  if (stopAtLink && infoDirHandle.link)
    return {
      kind: "none",
      bytes: null,
      stamp: null,
      dir: infoDirHandle,
    };
  try {
    if (getPlatform() === "windows" && !(await lstat(attributesPath)).isFile())
      return {
        kind: "unreadable",
        bytes: null,
        stamp: null,
      };
    let fileHandle = await open(attributesPath, readOnlyNoFollowFlags());
    try {
      let stats = await fileHandle.stat({
        bigint: true,
      });
      if (!stats.isFile() || stats.size > MAX_INFO_ATTRIBUTES_BYTES)
        return {
          kind: "unreadable",
          bytes: null,
          stamp: null,
        };
      let stamp = fileStampFromBigStats(stats);
      let size = Number(stats.size);
      if (size === 0)
        return {
          kind: "none",
          bytes: Buffer.alloc(0),
          stamp,
          dir: infoDirHandle,
        };
      let attributesBuffer = Buffer.alloc(size);
      let { bytesRead } = await fileHandle.read(attributesBuffer, 0, size, 0);
      if (bytesRead !== size)
        return {
          kind: "unreadable",
          bytes: null,
          stamp: null,
        };
      let text = attributesBuffer.toString("utf8");
      let lines = attributeLines(text);
      let touchesBy = hasOverlongAttributeLine(text)
        ? "overlong_line"
        : lines.some((line) => MACRO_OR_QUOTED_ATTR_RE.test(line))
          ? "macro_or_quoted"
          : lines.some((line) => FILTER_ATTRIBUTE_RE.test(line))
            ? "rule"
            : undefined;
      return touchesBy === undefined
        ? {
            kind: "none",
            bytes: attributesBuffer,
            stamp,
            dir: infoDirHandle,
          }
        : {
            kind: "touches",
            by: touchesBy,
            bytes: attributesBuffer,
            stamp,
            dir: infoDirHandle,
          };
    } finally {
      await fileHandle.close();
    }
  } catch (error) {
    return getErrnoCode(error) === "ENOENT" || getErrnoCode(error) === "ENOTDIR"
      ? {
          kind: "none",
          bytes: null,
          stamp: null,
          dir: infoDirHandle,
        }
      : {
          kind: "unreadable",
          bytes: null,
          stamp: null,
        };
  }
}
//@ chunk-sfy2wa1e.js:66284-66633 placement
async function openGitInfoDir(gitDir, stopAtLink, followLink) {
  let stats = await lstatBigintOrNull(gitDir);
  let aboveStats = stopAtLink && stats === null ? await lstatBigintOrNull(dirname(gitDir)) : null;
  let targetStats = !stats?.isSymbolicLink()
    ? stats
    : followLink
      ? null
      : await lstatBigintOrNull(gitDir, stat);
  let junction =
    getPlatform() === "windows" && stats?.isDirectory() === true ? await readJunction(gitDir) : null;
  let isLinkTarget =
    junction !== null &&
    junction.kind !== "directory" &&
    !(junction.kind === "error" && junction.code === "EISDIR");
  return {
    node: stats && fileStampFromBigStats(stats),
    link: (stats?.isSymbolicLink() ?? false) || isLinkTarget,
    target: targetStats && fileStampFromBigStats(targetStats),
    ...(aboveStats && {
      above: fileStampFromBigStats(aboveStats),
    }),
  };
}
//@ chunk-sfy2wa1e.js:66633-67274 placement
async function checkAlternatesFile(gitDir, layout) {
  if (!isAbsolute(layout.objectsDir) || /[\r\n]/.test(layout.objectsDir) || /^["#]/.test(layout.objectsDir))
    return "the objects directory cannot be named in an alternates file";
  let writeOptions = {
    flag: GIT_STDERR_CAPTURE_FLAGS,
    mode: 384,
  };
  await mkdir(join(gitDir, "objects", "info"), {
    recursive: true,
    mode: 448,
  });
  await Promise.all([
    mkdir(join(gitDir, "refs"), {
      mode: 448,
    }),
    writeFile(
      join(gitDir, "HEAD"),
      `ref: refs/heads/attributes-view
`,
      writeOptions,
    ),
    writeFile(
      join(gitDir, "config"),
      [
        "[core]",
        `	repositoryformatversion = ${layout.objectFormat === "sha256" ? 1 : 0}`,
        `	ignorecase = ${layout.caseBlind}`,
        ...(layout.objectFormat === "sha256" ? ["[extensions]", "\tobjectformat = sha256"] : []),
        "",
      ].join(`
`),
      writeOptions,
    ),
    writeFile(
      join(gitDir, "objects", "info", "alternates"),
      `${layout.objectsDir}
`,
      writeOptions,
    ),
  ]);
  return null;
}
//@ chunk-sfy2wa1e.js:67274-67920 placement
async function readSymlinkTarget(root, indexPath, entries) {
  let filtered = entries.filter((entry) => entry.kind === "symlink");
  let targets = [];
  let targetById = new Map();
  for (let entry of filtered) {
    let str = entry.target.toString("utf8");
    if (!Buffer.from(str, "utf8").equals(entry.target))
      return stepFailure("path-encoding", `${entry.path}: link target is not valid UTF-8`);
    let hashResult = await root(["hash-object", "-w", "--stdin"], undefined, str);
    if (hashResult.code !== 0) return stepFailure("hash-object", hashResult.stderr, hashResult);
    targets.push(`${SYMLINK_MODE_VALUE} ${hashResult.stdout.trim()}	${entry.path}`);
    targetById.set(entry.path, hashResult.stdout.trim().toLowerCase());
  }
  if (targets.length === 0)
    return {
      kind: "laid",
      ids: targetById,
    };
  let updateResult = await root(
    ["update-index", "-z", "--index-info"],
    {
      GIT_INDEX_FILE: indexPath,
    },
    targets.map((targetLine) => `${targetLine}\x00`).join(""),
  );
  return updateResult.code === 0
    ? {
        kind: "laid",
        ids: targetById,
      }
    : stepFailure("update-index", updateResult.stderr, updateResult);
}
//@ chunk-sfy2wa1e.js:67920-68649 placement
async function listSkipWorktreeEntries(dir, indexPath, runGit, skippedPaths) {
  let skipWorktreeResult = await runGit(["--ignore-skip-worktree-entries"], indexPath);
  if (
    (skipWorktreeResult.exitCode === GIT_SIGPIPE_EXIT_CODE ? await runGit([], indexPath) : skipWorktreeResult)
      .code !== 0
  )
    return null;
  let skippedPathSet = new Set(skippedPaths);
  let entries = new Map();
  let listingHandle = await open(`${indexPath}.listing`, GIT_STDOUT_CAPTURE_FLAGS, 384);
  try {
    if (
      (
        await dir(
          ["ls-files", "-s", "-z"],
          {
            GIT_INDEX_FILE: indexPath,
          },
          undefined,
          undefined,
          listingHandle.fd,
        )
      ).code !== 0
    )
      return null;
    let carryOver = "";
    await readFileChunks(listingHandle, (chunk) => {
      let parts = (carryOver + chunk.toString("latin1")).split("\x00");
      carryOver = parts.pop() ?? "";
      for (let line of parts) {
        let index = line.indexOf("\t");
        let [mode, id, stage] = index === -1 ? [] : line.slice(0, index).split(" ");
        let str = Buffer.from(line.slice(index + 1), "latin1").toString("utf8");
        if (mode !== undefined && id !== undefined && stage === "0" && skippedPathSet.has(str))
          entries.set(str, {
            mode,
            id: id.toLowerCase(),
          });
      }
    });
  } finally {
    await listingHandle.close().catch(() => {});
    await rm(`${indexPath}.listing`, {
      force: true,
    }).catch(() => {});
  }
  return skippedPaths.every((path) => entries.has(path)) ? entries : null;
}
//@ chunk-sfy2wa1e.js:68649-68831 placement
async function isNotPlainDirectory(workTree, relPath) {
  if (relPath.includes("\uFFFD") || (await lstatOrAbsent(workTree, relPath)) !== "clear") return true;
  try {
    return !(await lstat(join(workTree, relPath))).isDirectory();
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    return errnoCode !== "ENOENT" && errnoCode !== "ENOTDIR";
  }
}
//@ chunk-sfy2wa1e.js:68831-69863 placement
async function compareWorktreeEntry(
  workTree,
  { path, status, oldMode, newMode, oldId, newId },
  ntfsRules,
  maxBytes = MAX_STASH_FILE_BYTES,
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
  if ((await lstatOrAbsent(workTree, path)) !== "clear") return "changed";
  try {
    let worktreeFile = await readWorktreeFileSafely(workTree, path, ntfsRules);
    if (worktreeFile.kind === "symlink")
      return newMode === SYMLINK_MODE_VALUE &&
        (blobSha1(worktreeFile.target) === oldId ||
          (getPlatform() === "windows" &&
            blobSha1(
              await readlink(join(workTree, path), {
                encoding: "buffer",
              }),
            ) === oldId))
        ? "unchanged"
        : "changed";
    if (worktreeFile.kind !== "file") return worktreeFile.kind === "refused" ? "open_refused" : "changed";
    let { handle, size } = worktreeFile;
    try {
      if (!REGULAR_FILE_MODES.includes(newMode) || size > maxBytes) return "changed";
      let stats = await handle.stat({
        bigint: true,
      });
      let hash = createHash("sha1").update(`blob ${size}\x00`);
      let buffer = Buffer.allocUnsafe(Math.min(size, 1048576));
      let offset = 0;
      while (offset < size) {
        if (signal?.aborted) return "changed";
        let { bytesRead } = await handle.read(buffer, 0, Math.min(buffer.length, size - offset), offset);
        if (bytesRead === 0) return "changed";
        hash.update(buffer.subarray(0, bytesRead));
        offset += bytesRead;
      }
      if (hash.digest("hex") !== oldId) return "changed";
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
//@ chunk-sfy2wa1e.js:69863-70813 placement
/**
 * 种子索引文件名模式与疑似凭据文件名模式（env、netrc、credential、密钥等）。
 */
var SEED_INDEX_NAME_PATTERN; // deferred: uses DECORATION_LEAD_CHARS (../permissions/sensitivePaths.js) of its import cycle while loading; runs once the cycle is complete
var CREDENTIAL_NAME_RE;
var DRIVE_NAME_PREFIX_RE;
var credentialConfigPathSpellings;
var regExp;
var replaced;
var regExp_2;
var regExp_3;
deferInit("chunk-sfy2wa1e.js:69863", () => {
  SEED_INDEX_NAME_PATTERN = /^ccr-seed-([0-9]+)-[0-9a-f]{12}\.index(?:\.lock)?$/;
  CREDENTIAL_NAME_RE =
    /env|netrc|npmrc|yarnrc|pypirc|pgpass|\.cnf|terraform|tfvars|tfstate|boto|s3cfg|credential|gitconfig|mcp|claude|config|bash|profile|zsh|zlog|fish|history|consolehost|\.(?:pem|key|p12|pfx|keystore|jks|kdbx|ovpn|vars|ssh|aws|azure|gnupg|kube|docker|git)|_(?:rsa|dsa|ecdsa|ed25519)|secret|settings|gradle\.properties|device-keys|service.?account|deploy_key|htpasswd|htdigest|vault[-_](?:token|pass)|dockercfg|msmtprc|fetchmailrc|sentryclirc|clasprc|transifexrc|databrickscfg|remote-sync|wakatime/i;
  DRIVE_NAME_PREFIX_RE = `[${DECORATION_LEAD_CHARS.replace(/[\\\]^-]/g, "\\$&")}]|_${EDITOR_BACKUP_SUFFIX_SOURCE}_`;
  credentialConfigPathSpellings = normalizeCaseForComparison_2(
    CREDENTIAL_CONFIG_PATHS.map(([configPath]) => configPath),
  );
  regExp = new RegExp(
    `(?:^|/)(?:(?:${DRIVE_NAME_PREFIX_RE})[^/]*)?(?:\\.(?:ssh|aws|azure|gnupg|kube|docker|config|cargo|gem|m2|gradle|claude)|documents|appdata|library|(?:${credentialConfigPathSpellings.join("|")})(?![a-z0-9-]))|\\.git`,
    "i",
  );
  replaced = DECORATION_LEAD_CHARS.replace(/[\\\]^-]/g, "\\$&");
  regExp_2 = new RegExp(`(?:[${replaced}][^/${replaced}]*){4}|${SYNC_CONFLICT_SUFFIX_PATTERN}`, "i");
  regExp_3 = new RegExp(`(?:^|/)[^/]{${MAX_NAME_READING_LENGTH + 1}}`);
});
//@ chunk-sfy2wa1e.js:70813-71793 placement
function checkCredentialLikePaths() {
  let rules = new Map();
  let nameVerdicts = new Map();
  let leafVerdicts = new Map();
  return (path) => {
    if (
      !isPlainRelativePath(path) ||
      path.includes("\\") ||
      (path.includes(":") && getPlatform() === "windows")
    )
      return isSensitiveNameOrVariant(path);
    let foldedPath = ASCII_ONLY_RE.test(path)
      ? path
      : path
          .replaceAll("\u0131", "i")
          .replaceAll("\u017F", "s")
          .replaceAll("\u212A", "k")
          .replace(NON_ASCII_RE, "");
    let index = foldedPath.lastIndexOf("/");
    let foldedDir = index === -1 ? "" : foldedPath.slice(0, index);
    let index_2 = path.lastIndexOf("/");
    let dir = index_2 === -1 ? "" : path.slice(0, index_2);
    let dirVerdict = rules.get(dir);
    if (dirVerdict === undefined) {
      let dirIsCredentialLike = index !== -1 && looksLikeCredentialPath(dir, foldedDir);
      let foldedSegments = dirIsCredentialLike ? foldedDir.split("/") : [];
      let segmentVerdicts = dirIsCredentialLike
        ? dir.split("/").map((segment, index) => {
            let foldedSegment = foldedSegments[index];
            if (foldedSegment !== undefined && !looksLikeCredentialPath(segment, foldedSegment))
              return "passed";
            let verdict =
              nameVerdicts.get(segment) ??
              ((foldedSegment !== undefined && !hasAlternateCredentialSpelling(segment, foldedSegment)) ||
              !isSensitiveNameOrVariant(`${segment}/.bak`)
                ? "passed"
                : isSensitiveNameOrVariant(`${segment}/x`)
                  ? "withheld"
                  : "asked");
            nameVerdicts.set(segment, verdict);
            return verdict;
          })
        : [];
      dirVerdict = segmentVerdicts.includes("withheld")
        ? "withheld"
        : segmentVerdicts.includes("asked") ||
            (index !== -1 && (regExp.test(foldedDir) || hasConfusableCredentialSegment(regExp, dir)))
          ? "asked"
          : "passed";
      rules.set(dir, dirVerdict);
    }
    if (dirVerdict !== "passed") return dirVerdict === "withheld" || isSensitiveNameOrVariant(path);
    let extra = foldedPath.slice(index + 1);
    let path_2 = path.slice(index_2 + 1);
    if (
      index !== -1 &&
      (regExp_4.test(extra) || regExp_4.test(path_2)) &&
      (CREDENTIAL_NAME_RE.test(foldedDir) || hasConfusableCredentialSegment(CREDENTIAL_NAME_RE, dir))
    )
      return isSensitiveNameOrVariant(path);
    if (
      !CREDENTIAL_NAME_RE.test(extra) &&
      !hasAlternateCredentialSpelling(path_2, extra) &&
      !hasConfusableCredentialSegment(CREDENTIAL_NAME_RE, path_2)
    )
      return false;
    let leafSensitive = leafVerdicts.get(path_2);
    if (leafSensitive === undefined) {
      leafSensitive = isSensitiveNameOrVariant(path_2);
      leafVerdicts.set(path_2, leafSensitive);
    }
    return leafSensitive;
  };
}
//@ chunk-sfy2wa1e.js:71793-71953 placement
function hasConfusableCredentialSegment(regExp, value) {
  return (
    value.includes(":") &&
    value
      .split("/")
      .filter((segment) => segment.includes(":"))
      .some((segment) => {
        let readings = expandNameReadings(segment);
        return nameReadingFns(segment).some((reader) =>
          readings.some((reading) => regExp.test(reader(reading))),
        );
      })
  );
}
//@ chunk-sfy2wa1e.js:71953-72043 placement
function looksLikeCredentialPath(path, extra) {
  return (
    (path.length > MAX_NAME_READING_LENGTH && regExp_3.test(path)) ||
    regExp_2.test(path) ||
    (extra !== path && regExp_2.test(extra)) ||
    hasConfusableCredentialSegment(regExp_2, path)
  );
}
//@ chunk-sfy2wa1e.js:72043-72146 placement
function hasAlternateCredentialSpelling(path, extra) {
  return (
    looksLikeCredentialPath(path, extra) &&
    (path.length > MAX_NAME_READING_LENGTH ||
      expandNameReadings(path).length > 1 ||
      nameReadingFns(path).some((reader) => expandNameReadings(reader(path)).length > 1))
  );
}
//@ chunk-sfy2wa1e.js:72146-72222 placement
var NON_ASCII_RE; // deferred: uses SEED_INDEX_NAME_PATTERN of its import cycle while loading; runs once the cycle is complete
var ASCII_ONLY_RE;
var regExp_4;
deferInit("chunk-sfy2wa1e.js:72146", () => {
  NON_ASCII_RE = /[^\x20-\x7e]/gu;
  ASCII_ONLY_RE = /^[\x20-\x7e]*$/;
  regExp_4 = new RegExp(`^(?:${DRIVE_NAME_PREFIX_RE})`, "i");
});
//@ chunk-sfy2wa1e.js:72222-73175 placement
async function lstatNoFollow(path, destinationPath) {
  let handle;
  try {
    handle = await open(path, readOnlyNoFollowFlags());
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
    let stats = await handle.stat();
    if (!stats.isFile() || stats.nlink !== 1)
      return {
        kind: "tamper",
        detail: "something other than the scratch index this build wrote stands at its name",
      };
    let destinationHandle = await open(destinationPath, GIT_STDERR_CAPTURE_FLAGS, 384);
    try {
      let buffer = Buffer.allocUnsafe(1048576);
      for (let offset = 0; offset < stats.size;) {
        let { bytesRead } = await handle.read(
          buffer,
          0,
          Math.min(buffer.length, stats.size - offset),
          offset,
        );
        if (bytesRead === 0)
          return {
            kind: "tamper",
            detail: "the scratch index changed while it was carried off",
          };
        await destinationHandle.write(buffer, 0, bytesRead);
        offset += bytesRead;
      }
      await destinationHandle.utimes(stats.atime, stats.mtime);
    } finally {
      await destinationHandle.close().catch(() => {});
    }
    return null;
  } catch (error) {
    return {
      kind: "disk",
      detail: `the scratch index could not be carried off (${getErrnoCode(error) ?? errorMessage(error)})`,
    };
  } finally {
    await handle.close().catch(() => {});
  }
}
//@ chunk-sfy2wa1e.js:73175-73223 placement
var STALE_SEED_MAX_AGE_MS = 600000;
var SEED_INDEX_PROCESS_RE = /^claude-seed-index-([0-9]+)-/;
//@ chunk-sfy2wa1e.js:73223-73413 placement
async function unlinkWithRetry(path) {
  for (let idx = 0; ; idx++)
    try {
      await unlink(path);
      return null;
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ENOENT") return null;
      if (idx >= 3 || (errnoCode !== "EBUSY" && errnoCode !== "EPERM" && errnoCode !== "EACCES"))
        return errnoCode ?? errorMessage(error);
      await sleep(50);
    }
}
//@ chunk-sfy2wa1e.js:73413-73663 placement (2.1.88 match: convertDirectoryToZipInPlace, 0.79)
/**
 * 清理以 PID 命名的过期目录：名字里的 PID 对应进程已不存在、且目录修改时间超过保留时限时递归删除；出错静默忽略。
 */
async function pruneStaleProcessDirs(tempDir) {
  try {
    await Promise.all(
      (await readdir(tempDir)).map(async (name) => {
        let indexName = SEED_INDEX_PROCESS_RE.exec(name)?.[1];
        if (indexName === undefined) return;
        let pid = join(tempDir, name);
        let zipData = await lstat(pid);
        if (
          zipData.isDirectory() &&
          Date.now() - zipData.mtimeMs > STALE_SEED_MAX_AGE_MS &&
          !isProcessAlive(Number(indexName))
        )
          await rm(pid, {
            recursive: true,
            force: true,
          });
      }),
    );
  } catch {}
}
//@ chunk-sfy2wa1e.js:73663-73881 placement
/**
 * 清理以 PID 命名的过期 seed 索引文件：文件名匹配 seed 索引格式、修改时间超过保留时限且对应进程已不存在时删除（只删文件，不是目录）；出错静默忽略。
 */
async function pruneStaleSeedIndexes(gitDir) {
  try {
    await Promise.all(
      (await readdir(gitDir)).map(async (name) => {
        let indexName = SEED_INDEX_NAME_PATTERN.exec(name)?.[1];
        if (indexName === undefined) return;
        let pid = join(gitDir, name);
        if (
          Date.now() - (await lstat(pid)).mtimeMs > STALE_SEED_MAX_AGE_MS &&
          !isProcessAlive(Number(indexName))
        )
          await rm(pid, {
            force: true,
          });
      }),
    );
  } catch {}
}
//@ chunk-sfy2wa1e.js:73881-73960 placement
function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return getErrnoCode(error) === "EPERM";
  }
}
//@ chunk-sfy2wa1e.js:73960-74020 placement
async function listDirectoriesAmong(workTree, paths) {
  return (await classifyPathsAsDirectories(workTree, paths)).notDirectories;
}
//@ chunk-sfy2wa1e.js:74020-74241 placement
async function classifyPathsAsDirectories(workTree, paths) {
  let limit = limitConcurrency(GIT_READ_CONCURRENCY, async (path) =>
    (await lstatOrAbsent(workTree, path)) === "clear" ? classifyDirEntry(join(workTree, path)) : "other",
  );
  let results = await Promise.all(paths.map(limit));
  return {
    notDirectories: paths.filter((path, index) => results[index] !== "directory"),
    special: paths.filter((path, index) => results[index] === "special"),
  };
}
//@ chunk-sfy2wa1e.js:74241-74389 placement
async function classifyDirEntry(path) {
  try {
    let stats = await lstat(path);
    return stats.isDirectory() ? "directory" : stats.isFile() || stats.isSymbolicLink() ? "other" : "special";
  } catch {
    return "other";
  }
}
//@ chunk-sfy2wa1e.js:74389-74675 placement
async function describeStashBase(runGit, base) {
  let [branch, commitLine] = await Promise.all([
    runGit(["symbolic-ref", "-q", "HEAD"]),
    runGit(["rev-list", "--max-count=1", "--format=%h %s", base, "--"]),
  ]);
  let branchName = branch.code === 0 ? branch.stdout.trim().replace(/^refs\/heads\//, "") : "(no branch)";
  let subject =
    commitLine.code === 0
      ? (commitLine.stdout
          .trim()
          .split(
            `
`,
          )
          .at(-1) ?? "")
      : "";
  return `${branchName}: ${subject}`;
}
//@ chunk-sfy2wa1e.js:74675-75745 placement
async function describeStashEntryChange(
  changedFilesForStash,
  changedFiles,
  deletedStaged,
  stageDir,
  restage,
) {
  let paths = changedFilesForStash.entries
    .filter((entry) => (entry.kind === "changed" || entry.kind === "absent") && changedFiles.has(entry.path))
    .map(({ path }) => path);
  if (paths.length === 0) return changedFilesForStash;
  let absentPaths = new Set(
    changedFilesForStash.entries.flatMap((entry) =>
      entry.kind === "absent" && changedFiles.has(entry.path) ? [entry.path] : [],
    ),
  );
  let attrPaths = missingGitattributesPaths(paths);
  let restagePaths = [...paths, ...attrPaths.filter((path) => changedFiles.has(path))];
  let changedPaths = new Set(
    changedFilesForStash.entries.flatMap((entry) => (entry.kind === "changed" ? [entry.path] : [])),
  );
  let results = await Promise.all(attrPaths.map((path) => hashFileOrAbsent(join(stageDir, path))));
  await Promise.all(attrPaths.map((path) => unlink(join(stageDir, path)).catch(() => {})));
  let restaged = await restage(restagePaths);
  if ("refused" in restaged) return restaged;
  let results_2 = await Promise.all(attrPaths.map((path) => hashFileOrAbsent(join(stageDir, path))));
  let copiedPaths = new Set(restaged.copies.flatMap((copy) => (copy.kind === "file" ? [copy.path] : [])));
  let found = attrPaths.find((path, index) =>
    changedPaths.has(path)
      ? !copiedPaths.has(path)
      : results[index] === null || results[index] !== results_2[index],
  );
  if (found !== undefined)
    return {
      refused: `${found}: changed while it was being read`,
      tooLarge: false,
      momentary: true,
    };
  let restagedSet = new Set([...paths, ...attrPaths]);
  let changedSet = new Set(paths);
  return {
    entries: [
      ...changedFilesForStash.entries.filter((entry) => !restagedSet.has(entry.path)),
      ...restaged.entries
        .filter((entry) => restagedSet.has(entry.path))
        .map((entry) =>
          entry.kind === "absent" &&
          changedSet.has(entry.path) &&
          (!absentPaths.has(entry.path) || deletedStaged.has(entry.path))
            ? {
                kind: "changed",
                path: entry.path,
              }
            : entry,
        ),
    ],
    copies: [
      ...changedFilesForStash.copies.filter((copy) => !restagedSet.has(copy.path)),
      ...restaged.copies,
    ],
  };
}
//@ chunk-sfy2wa1e.js:75745-75911 placement
async function markPathsIntentToAdd(runGit, indexFile, baseTree, paths) {
  return paths.length === 0
    ? {
        code: 0,
        stderr: "",
      }
    : runGit(
        ["update-index", "-z", "--index-info"],
        indexFile,
        paths.map((result) => `0 ${"0".repeat(baseTree.length)}	${result}\x00`).join(""),
      );
}
//@ chunk-sfy2wa1e.js:75911-76447 placement
async function listFilesNoPrecompose(runGit, indexFile, args) {
  let results = await Promise.all(
    chunkArgsByBytes(args).map((chunk) =>
      runGit(["-c", "core.precomposeUnicode=false", "ls-files", "-z", "-v", "--", ...chunk], {
        ...LITERAL_PATHSPEC_ENV,
        ...indexFile,
      }),
    ),
  );
  if (results.some((result) => result.code !== 0)) return null;
  let flattened = results
    .flatMap((result) => result.stdout.split("\x00"))
    .flatMap((record) =>
      record.length > 2
        ? [
            {
              tag: record[0],
              path: record.slice(2),
            },
          ]
        : [],
    );
  let skipWorktree = new Set(
    flattened.flatMap(({ tag, path }) => (tag === "S" || tag === "s" ? [path] : [])),
  );
  let seenPaths = new Set(flattened.map(({ path }) => path));
  return {
    skipWorktree,
    unseen: new Set([
      ...skipWorktree,
      ...flattened.flatMap(({ tag, path }) => (tag !== tag.toUpperCase() ? [path] : [])),
    ]),
    absent: new Set(args.filter((path) => !seenPaths.has(path))),
  };
}
//@ chunk-sfy2wa1e.js:76447-76594 placement
async function hashFileOrAbsent(path) {
  try {
    return createHash("sha1")
      .update(await readFile(path))
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
