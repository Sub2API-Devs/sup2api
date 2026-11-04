/**
 * services/memoryStore/localMemoryStore.ts
 *
 * 2.1.316 新增：本地目录实现的记忆存储（list/read/write/delete，排除规则）；逐段解析记忆键路径（拒绝越界与链接）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-a477qqne.js (13)
 * attribution: placement 13
 */
import { constants } from "fs";
import { resolve, dirname, join, sep, relative } from "path";
import { mkdir, readdir, lstat, open } from "fs/promises";
import {
  MAX_CONTENT_BYTES,
  MemoryNotFoundError,
  MemoryPermanentError,
  MemoryUnavailableError,
  MemoryConflictError,
} from "../orgMemory/storeErrors.js";
import { normalizePathPrefix } from "../orgMemory/storeApi.js";
import { pMap } from "../../../vendor/p-map/index.js";
import {
  missingOrPermissionAsNull,
  publicMemoryEntry,
  readExistingMemoryMode,
  createMemoryFileExclusive,
  classifyMemoryPathConflict,
  memoryFsErrorToResult,
  unlinkQuietly,
  ignoreMissingOrThrow,
} from "./memoryDocumentFs.js";
import { writeFileAtomic } from "../../utils/plugins/installCounts.js";
import { getErrnoCode, AbortError } from "../../utils/errors.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { PathTraversalError, sanitizePathKey } from "../../memdir/teamMemPaths.js";
import { logForDebugging } from "../../utils/debug.js";
import { TRAILING_DOTS_OR_SPACES_RE, isReservedDeviceName } from "../../utils/windowsProfileFolders.js";
import { isMemoryDocumentKey_2 } from "./memoryKeys.js";
import { isProtectedDirPath } from "../../utils/permissions/protectedDirNames.js";
import { DANGEROUS_FILES_LOWER } from "../../utils/permissions/filesystem.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-a477qqne.js:16887-17087 placement
/**
 * 基于本地目录的记忆存储实现类。
 */
var MEMORY_KEY_PREFIX; // deferred: uses memoryIdSchema (../orgMemory/storeErrors.js) of its import cycle while loading; runs once the cycle is complete
var HEX_NAME_RE;
var FILE_CONCURRENCY;
var SAFE_OPEN_FLAGS;
var MISSING_PATH_ERRORS;
var PERMISSION_ERRORS;
var MAX_MEMORY_FILE_BYTES;
deferInit("chunk-a477qqne.js:16887", () => {
  MEMORY_KEY_PREFIX = "mem_";
  HEX_NAME_RE = /^(?:[0-9a-f]{2})+$/;
  FILE_CONCURRENCY = 32;
  SAFE_OPEN_FLAGS = constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK;
  MISSING_PATH_ERRORS = new Set(["ENOENT", "ENOTDIR", "EISDIR", "ELOOP", "ENAMETOOLONG"]);
  PERMISSION_ERRORS = new Set(["EACCES", "EPERM", "EBUSY"]);
  MAX_MEMORY_FILE_BYTES = 4 * MAX_CONTENT_BYTES;
});
//@ chunk-a477qqne.js:17087-20453 placement
/**
 * 本地目录实现的记忆存储（list/read/write/delete，排除规则）。
 */
class LocalMemoryStore {
  mode;
  label;
  partitionId;
  rootDir;
  excludeKey;
  constructor({ rootDir, label, mode = "rw", excludeKey }) {
    this.rootDir = resolve(rootDir);
    this.label = label;
    this.mode = mode;
    this.partitionId = this.rootDir;
    this.excludeKey = excludeKey ?? (() => false);
  }
  async list(prefix, options) {
    throwIfAborted(options?.signal);
    let key = normalizePathPrefix(prefix ?? "/")
      .replace(/\/+$/, "")
      .slice(1);
    let startDir = key === "" ? this.rootDir : isSafeMemoryKey(key) ? await this.resolveOrNull(key) : null;
    if (startDir === null) return [];
    let documents = await this.collectDocuments(startDir, key, options?.depthOne !== true, options?.signal);
    return (
      await pMap(
        documents,
        async ({ abs, key }) => {
          throwIfAborted(options?.signal);
          let file = await readMemoryFileSafely(abs).catch(missingOrPermissionAsNull);
          if (file === null) return [];
          let { sha256, sizeBytes, updatedAt } = file;
          return [
            {
              id: encodeHexName(key),
              path: "/" + key,
              sha256,
              sizeBytes,
              updatedAt,
            },
          ];
        },
        {
          concurrency: FILE_CONCURRENCY,
        },
      )
    )
      .flat()
      .toSorted((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));
  }
  async readByPath(path, options) {
    throwIfAborted(options?.signal);
    let sliced = normalizePathPrefix(path).slice(1);
    let absPath = isMemoryDocumentPath(sliced) ? await this.resolveOrNull(sliced) : null;
    let file = absPath === null ? null : await readMemoryFileSafely(absPath).catch(missingOrPermissionAsNull);
    return file === null ? null : publicMemoryEntry(file);
  }
  async read(id, options) {
    throwIfAborted(options?.signal);
    let located = await this.locate(id);
    if (located === null || located.current === null) throw new MemoryNotFoundError(id);
    return publicMemoryEntry(located.current);
  }
  async create(path, content, options) {
    this.assertWritable();
    throwIfAborted(options?.signal);
    let normalizedPath = normalizePathPrefix(path);
    let sliced = normalizedPath.slice(1);
    if (!isMemoryDocumentPath(sliced))
      throw new MemoryPermanentError("invalid_path", `not a document path: ${path}`);
    assertDocumentSize(content);
    let absPath = await this.resolveForWrite(sliced);
    let mustNotExist = options?.precondition === "not_exists";
    let existingMode = mustNotExist ? undefined : await readExistingMemoryMode(absPath, normalizedPath);
    try {
      await mkdir(dirname(absPath), {
        recursive: true,
      });
      await (mustNotExist
        ? createMemoryFileExclusive(absPath, content)
        : writeFileAtomic(absPath, content, existingMode));
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      throw (
        (await classifyMemoryPathConflict(absPath, normalizedPath, mustNotExist)) ??
        (errnoCode === "ENOENT"
          ? new MemoryUnavailableError(`ENOENT: ${normalizedPath}`, error)
          : errnoCode === "EEXIST" && !mustNotExist
            ? new MemoryPermanentError("rename_refused", `EEXIST: ${normalizedPath}`)
            : memoryFsErrorToResult(error, normalizedPath))
      );
    }
    return {
      id: encodeHexName(sliced),
      sha256: computeContentHash(content),
    };
  }
  async update(id, content, expectedSha256, options) {
    this.assertWritable();
    throwIfAborted(options?.signal);
    assertDocumentSize(content);
    let located = await this.locate(id);
    if (located === null || located.current === null) throw new MemoryNotFoundError(id);
    let { key, abs, current } = located;
    assertNotProtectedPath(key);
    if (expectedSha256 !== null && current.sha256 !== expectedSha256)
      throw new MemoryConflictError("/" + key, expectedSha256, current.sha256);
    await writeFileAtomic(abs, content, current.mode).catch((error) => {
      let errnoCode = getErrnoCode(error);
      throw errnoCode === "ENOENT"
        ? new MemoryNotFoundError(id)
        : errnoCode === "EEXIST"
          ? new MemoryPermanentError("rename_refused", `EEXIST: /${key}`)
          : memoryFsErrorToResult(error, "/" + key);
    });
    return {
      id,
      sha256: computeContentHash(content),
    };
  }
  async delete(id, expectedSha256) {
    this.assertWritable();
    let located = await this.locate(id);
    if (located === null || located.current === null) {
      if (expectedSha256 !== null) throw new MemoryNotFoundError(id);
      return;
    }
    let { key, abs, current } = located;
    if (expectedSha256 !== null && current.sha256 !== expectedSha256)
      throw new MemoryConflictError("/" + key, expectedSha256, current.sha256);
    await unlinkQuietly(abs).catch((error) => {
      if (getErrnoCode(error) !== "ENOENT") throw memoryFsErrorToResult(error, "/" + key);
      if (expectedSha256 !== null) throw new MemoryNotFoundError(id);
    });
  }
  assertWritable() {
    if (this.mode === "ro")
      throw new MemoryPermanentError(
        "not_writable",
        "LocalDirectoryBackend: write refused on read-only mount",
      );
  }
  async locate(id) {
    let key = decodeHexName(id);
    let absPath = key === null ? null : await this.resolveOrNull(key);
    if (key === null || absPath === null) return null;
    let current = await readMemoryFileSafely(absPath).catch((error) => {
      throw memoryFsErrorToResult(error, "/" + key);
    });
    return {
      key,
      abs: absPath,
      current,
    };
  }
  async resolveForWrite(key) {
    assertNotProtectedPath(key);
    let absPath = await this.resolveKey(key).catch((error) => {
      throw error instanceof PathTraversalError
        ? new MemoryPermanentError("invalid_path", error.message)
        : error;
    });
    if (absPath === null) throw new MemoryConflictError("/" + key, null);
    return absPath;
  }
  async resolveOrNull(key) {
    try {
      return await this.resolveKey(key);
    } catch (error) {
      if (error instanceof PathTraversalError) {
        logForDebugging(`local-memory[${this.label}]: ${error.message}`);
        return null;
      }
      throw error;
    }
  }
  async resolveKey(key) {
    let parts = key.split("/");
    if (parts.some((prefix, partIndex) => this.excludeKey(parts.slice(0, partIndex + 1).join("/"))))
      throw new PathTraversalError(`Key is reserved: "${key}"`);
    return resolveMemoryKeyPath(this.rootDir, key);
  }
  async collectDocuments(dir, keyPrefix, recurse, signal) {
    throwIfAborted(signal);
    let entries = await readdir(dir, {
      withFileTypes: true,
    }).catch(missingOrPermissionAsNull);
    let documents = [];
    for (let entry of entries ?? []) {
      let key = keyPrefix === "" ? entry.name : `${keyPrefix}/${entry.name}`;
      if (entry.name.startsWith(".") || this.excludeKey(key)) continue;
      let projectRoot = join(dir, entry.name);
      let sourceKind = await normalizeSource(entry, projectRoot);
      if (sourceKind === "directory") {
        if (recurse) documents.push(...(await this.collectDocuments(projectRoot, key, true, signal)));
      } else if (sourceKind === "file" && tryIsMemoryDocumentPath(key))
        documents.push({
          abs: projectRoot,
          key,
        });
    }
    return documents;
  }
}
//@ chunk-a477qqne.js:20453-21007 placement
/**
 * 逐段解析记忆键路径（拒绝越界与链接）。
 */
async function resolveMemoryKeyPath(rootDir, key) {
  sanitizePathKey(key);
  let resolvedRoot = resolve(rootDir);
  let targetPath = resolve(resolvedRoot, key);
  if (targetPath !== resolvedRoot && !targetPath.startsWith(resolvedRoot + sep))
    throw new PathTraversalError(`Key escapes memory directory: "${key}"`);
  let segments = targetPath === resolvedRoot ? [] : relative(resolvedRoot, targetPath).split(sep);
  let currentDir = resolvedRoot;
  for (let segment of segments) {
    let stats = await lstat(join(currentDir, segment)).catch((error) => {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return null;
      throw memoryFsErrorToResult(error, "/" + key);
    });
    if (stats === null) return targetPath;
    if (stats.isSymbolicLink()) throw new PathTraversalError(`Key passes through a symlink: "${key}"`);
    let names = await readdir(currentDir).catch((error) => {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return null;
      throw memoryFsErrorToResult(error, "/" + key);
    });
    if (names === null || !names.includes(segment)) return null;
    currentDir = join(currentDir, segment);
  }
  return targetPath;
}
//@ chunk-a477qqne.js:21007-21170 placement = normalizeSource (0.883)
/**
 * 对目录项做 stat 分类（名字配错）。
 */
async function normalizeSource(source, projectRoot) {
  let stats =
    source.isDirectory() || source.isFile() || source.isSymbolicLink()
      ? source
      : await lstat(projectRoot).catch(missingOrPermissionAsNull);
  return stats?.isDirectory() ? "directory" : stats?.isFile() ? "file" : "other";
}
//@ chunk-a477qqne.js:21170-21211 placement
/**
 * 若 signal 已中止则抛 AbortError。
 */
function throwIfAborted(signal) {
  if (signal?.aborted) throw new AbortError();
}
//@ chunk-a477qqne.js:21211-21325 placement
function isSafeMemoryKey(key) {
  return key
    .split("/")
    .every(
      (segment) =>
        segment !== "" &&
        !segment.startsWith(".") &&
        !/:|~\d/.test(segment) &&
        !TRAILING_DOTS_OR_SPACES_RE.test(segment) &&
        !isReservedDeviceName(segment),
    );
}
//@ chunk-a477qqne.js:21325-21361 placement
/**
 * 判断路径是否为合法的记忆文档路径。
 */
function isMemoryDocumentPath(key) {
  return isSafeMemoryKey(key) && isMemoryDocumentKey_2(key);
}
//@ chunk-a477qqne.js:21361-21416 placement
/**
 * 同上但吞掉异常。
 */
function tryIsMemoryDocumentPath(key) {
  try {
    sanitizePathKey(key);
    return isMemoryDocumentPath(key);
  } catch {
    return false;
  }
}
//@ chunk-a477qqne.js:21416-21525 placement
function assertNotProtectedPath(key) {
  if (isProtectedDirPath(key.split("/").join(sep), "", DANGEROUS_FILES_LOWER))
    throw new MemoryPermanentError("invalid_path", `unsafe path segment: /${key}`);
}
//@ chunk-a477qqne.js:21525-21632 placement
function assertDocumentSize(content) {
  if (Buffer.byteLength(content, "utf8") > MAX_CONTENT_BYTES)
    throw new MemoryPermanentError("http_413", "document exceeds the size cap");
}
//@ chunk-a477qqne.js:21632-21695 placement = generatePlaceholders (1)
/**
 * 把名字编码为固定前缀加 UTF-8 十六进制串。旧版名 generatePlaceholders 误配，与 Bash 无关。
 */
function encodeHexName(key) {
  return MEMORY_KEY_PREFIX + Buffer.from(key, "utf8").toString("hex");
}
//@ chunk-a477qqne.js:21695-21857 placement = generatePlaceholders (1)
/**
 * 解码固定前缀加十六进制的名字，校验能往返编码且名字合法，否则返回 null。与 Bash 无关。
 */
function decodeHexName(id) {
  let hexPart = id.startsWith(MEMORY_KEY_PREFIX) ? id.slice(MEMORY_KEY_PREFIX.length) : "";
  if (!HEX_NAME_RE.test(hexPart)) return null;
  let str = Buffer.from(hexPart, "hex").toString("utf8");
  return encodeHexName(str) === id && isMemoryDocumentPath(str) ? str : null;
}
//@ chunk-a477qqne.js:21857-22307 placement
/**
 * 安全读取记忆文件（大小上限、inode 一致）。
 */
async function readMemoryFileSafely(absPath) {
  let stats = await lstat(absPath).catch(ignoreMissingOrThrow);
  if (stats?.isFile() !== true || stats.size > MAX_MEMORY_FILE_BYTES) return null;
  let handle = await open(absPath, SAFE_OPEN_FLAGS).catch(ignoreMissingOrThrow);
  if (handle === null) return null;
  try {
    let stats_2 = await handle.stat();
    if (
      !stats_2.isFile() ||
      stats_2.size > MAX_MEMORY_FILE_BYTES ||
      (SAFE_OPEN_FLAGS === "r" && (stats_2.ino !== stats.ino || stats_2.dev !== stats.dev))
    )
      return null;
    let content = await handle.readFile({
      encoding: "utf8",
    });
    return {
      content,
      sha256: computeContentHash(content),
      updatedAt: stats_2.mtime.toISOString(),
      sizeBytes: stats_2.size,
      mode: stats_2.mode & 4095,
    };
  } catch (error) {
    return ignoreMissingOrThrow(error);
  } finally {
    await handle.close().catch(() => {});
  }
}
export { readMemoryFileSafely, encodeHexName, MISSING_PATH_ERRORS, PERMISSION_ERRORS, LocalMemoryStore };
