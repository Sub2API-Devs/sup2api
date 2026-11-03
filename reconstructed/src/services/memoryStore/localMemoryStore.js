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

//@ chunk-a477qqne.js:16887-17087 placement
/**
 * 基于本地目录的记忆存储实现类。
 */
var LocalDirMemoryStore = "mem_";
var HEX_NAME_RE = /^(?:[0-9a-f]{2})+$/;
var FILE_CONCURRENCY = 32;
var SAFE_OPEN_FLAGS = constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK;
var MISSING_PATH_ERRORS = new Set(["ENOENT", "ENOTDIR", "EISDIR", "ELOOP", "ENAMETOOLONG"]);
var PERMISSION_ERRORS = new Set(["EACCES", "EPERM", "EBUSY"]);
var MAX_MEMORY_FILE_BYTES = 4 * MAX_CONTENT_BYTES;
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
  async list(e, n) {
    throwIfAborted(n?.signal);
    let sliced = normalizePathPrefix(e ?? "/")
      .replace(/\/+$/, "")
      .slice(1);
    let s = sliced === "" ? this.rootDir : isSafeMemoryKey(sliced) ? await this.resolveOrNull(sliced) : null;
    if (s === null) return [];
    let i = await this.collectDocuments(s, sliced, n?.depthOne !== true, n?.signal);
    return (
      await pMap(
        i,
        async ({ abs, key }) => {
          throwIfAborted(n?.signal);
          let y = await readMemoryFileSafely(abs).catch(missingOrPermissionAsNull);
          if (y === null) return [];
          let { sha256, sizeBytes, updatedAt } = y;
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
      .toSorted((l, h) => (l.path < h.path ? -1 : l.path > h.path ? 1 : 0));
  }
  async readByPath(e, n) {
    throwIfAborted(n?.signal);
    let sliced = normalizePathPrefix(e).slice(1);
    let s = isMemoryDocumentPath(sliced) ? await this.resolveOrNull(sliced) : null;
    let i = s === null ? null : await readMemoryFileSafely(s).catch(missingOrPermissionAsNull);
    return i === null ? null : publicMemoryEntry(i);
  }
  async read(e, n) {
    throwIfAborted(n?.signal);
    let r = await this.locate(e);
    if (r === null || r.current === null) throw new MemoryNotFoundError(e);
    return publicMemoryEntry(r.current);
  }
  async create(e, n, r) {
    this.assertWritable();
    throwIfAborted(r?.signal);
    let s = normalizePathPrefix(e);
    let sliced = s.slice(1);
    if (!isMemoryDocumentPath(sliced))
      throw new MemoryPermanentError("invalid_path", `not a document path: ${e}`);
    assertDocumentSize(n);
    let d = await this.resolveForWrite(sliced);
    let l = r?.precondition === "not_exists";
    let h = l ? undefined : await readExistingMemoryMode(d, s);
    try {
      await mkdir(dirname(d), {
        recursive: true,
      });
      await (l ? createMemoryFileExclusive(d, n) : writeFileAtomic(d, n, h));
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      throw (
        (await classifyMemoryPathConflict(d, s, l)) ??
        (errnoCode === "ENOENT"
          ? new MemoryUnavailableError(`ENOENT: ${s}`, error)
          : errnoCode === "EEXIST" && !l
            ? new MemoryPermanentError("rename_refused", `EEXIST: ${s}`)
            : memoryFsErrorToResult(error, s))
      );
    }
    return {
      id: encodeHexName(sliced),
      sha256: computeContentHash(n),
    };
  }
  async update(e, n, r, s) {
    this.assertWritable();
    throwIfAborted(s?.signal);
    assertDocumentSize(n);
    let i = await this.locate(e);
    if (i === null || i.current === null) throw new MemoryNotFoundError(e);
    let { key, abs, current: h } = i;
    assertNotProtectedPath(key);
    if (r !== null && h.sha256 !== r) throw new MemoryConflictError("/" + key, r, h.sha256);
    await writeFileAtomic(abs, n, h.mode).catch((error) => {
      let errnoCode = getErrnoCode(error);
      throw errnoCode === "ENOENT"
        ? new MemoryNotFoundError(e)
        : errnoCode === "EEXIST"
          ? new MemoryPermanentError("rename_refused", `EEXIST: /${key}`)
          : memoryFsErrorToResult(error, "/" + key);
    });
    return {
      id: e,
      sha256: computeContentHash(n),
    };
  }
  async delete(e, n) {
    this.assertWritable();
    let r = await this.locate(e);
    if (r === null || r.current === null) {
      if (n !== null) throw new MemoryNotFoundError(e);
      return;
    }
    let { key, abs, current: d } = r;
    if (n !== null && d.sha256 !== n) throw new MemoryConflictError("/" + key, n, d.sha256);
    await unlinkQuietly(abs).catch((error) => {
      if (getErrnoCode(error) !== "ENOENT") throw memoryFsErrorToResult(error, "/" + key);
      if (n !== null) throw new MemoryNotFoundError(e);
    });
  }
  assertWritable() {
    if (this.mode === "ro")
      throw new MemoryPermanentError(
        "not_writable",
        "LocalDirectoryBackend: write refused on read-only mount",
      );
  }
  async locate(e) {
    let n = decodeHexName(e);
    let r = n === null ? null : await this.resolveOrNull(n);
    if (n === null || r === null) return null;
    let s = await readMemoryFileSafely(r).catch((error) => {
      throw memoryFsErrorToResult(error, "/" + n);
    });
    return {
      key: n,
      abs: r,
      current: s,
    };
  }
  async resolveForWrite(e) {
    assertNotProtectedPath(e);
    let n = await this.resolveKey(e).catch((error) => {
      throw error instanceof PathTraversalError
        ? new MemoryPermanentError("invalid_path", error.message)
        : error;
    });
    if (n === null) throw new MemoryConflictError("/" + e, null);
    return n;
  }
  async resolveOrNull(e) {
    try {
      return await this.resolveKey(e);
    } catch (error) {
      if (error instanceof PathTraversalError) {
        logForDebugging(`local-memory[${this.label}]: ${error.message}`);
        return null;
      }
      throw error;
    }
  }
  async resolveKey(e) {
    let parts = e.split("/");
    if (parts.some((r, s) => this.excludeKey(parts.slice(0, s + 1).join("/"))))
      throw new PathTraversalError(`Key is reserved: "${e}"`);
    return resolveMemoryKeyPath(this.rootDir, e);
  }
  async collectDocuments(e, n, r, s) {
    throwIfAborted(s);
    let i = await readdir(e, {
      withFileTypes: true,
    }).catch(missingOrPermissionAsNull);
    let d = [];
    for (let l of i ?? []) {
      let h = n === "" ? l.name : `${n}/${l.name}`;
      if (l.name.startsWith(".") || this.excludeKey(h)) continue;
      let projectRoot = join(e, l.name);
      let w = await normalizeSource(l, projectRoot);
      if (w === "directory") {
        if (r) d.push(...(await this.collectDocuments(projectRoot, h, true, s)));
      } else if (w === "file" && tryIsMemoryDocumentPath(h))
        d.push({
          abs: projectRoot,
          key: h,
        });
    }
    return d;
  }
}
//@ chunk-a477qqne.js:20453-21007 placement
/**
 * 逐段解析记忆键路径（拒绝越界与链接）。
 */
async function resolveMemoryKeyPath(rootDir, n) {
  sanitizePathKey(n);
  let r = resolve(rootDir);
  let s = resolve(r, n);
  if (s !== r && !s.startsWith(r + sep)) throw new PathTraversalError(`Key escapes memory directory: "${n}"`);
  let i = s === r ? [] : relative(r, s).split(sep);
  let d = r;
  for (let l of i) {
    let h = await lstat(join(d, l)).catch((error) => {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return null;
      throw memoryFsErrorToResult(error, "/" + n);
    });
    if (h === null) return s;
    if (h.isSymbolicLink()) throw new PathTraversalError(`Key passes through a symlink: "${n}"`);
    let y = await readdir(d).catch((error) => {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return null;
      throw memoryFsErrorToResult(error, "/" + n);
    });
    if (y === null || !y.includes(l)) return null;
    d = join(d, l);
  }
  return s;
}
//@ chunk-a477qqne.js:21007-21170 placement = normalizeSource (0.883)
/**
 * 对目录项做 stat 分类（名字配错）。
 */
async function normalizeSource(source, projectRoot) {
  let r =
    source.isDirectory() || source.isFile() || source.isSymbolicLink()
      ? source
      : await lstat(projectRoot).catch(missingOrPermissionAsNull);
  return r?.isDirectory() ? "directory" : r?.isFile() ? "file" : "other";
}
//@ chunk-a477qqne.js:21170-21211 placement
/**
 * 若 signal 已中止则抛 AbortError。
 */
function throwIfAborted(signal) {
  if (signal?.aborted) throw new AbortError();
}
//@ chunk-a477qqne.js:21211-21325 placement
function isSafeMemoryKey(e) {
  return e
    .split("/")
    .every(
      (n) =>
        n !== "" &&
        !n.startsWith(".") &&
        !/:|~\d/.test(n) &&
        !TRAILING_DOTS_OR_SPACES_RE.test(n) &&
        !isReservedDeviceName(n),
    );
}
//@ chunk-a477qqne.js:21325-21361 placement
/**
 * 判断路径是否为合法的记忆文档路径。
 */
function isMemoryDocumentPath(e) {
  return isSafeMemoryKey(e) && isMemoryDocumentKey_2(e);
}
//@ chunk-a477qqne.js:21361-21416 placement
/**
 * 同上但吞掉异常。
 */
function tryIsMemoryDocumentPath(e) {
  try {
    sanitizePathKey(e);
    return isMemoryDocumentPath(e);
  } catch {
    return false;
  }
}
//@ chunk-a477qqne.js:21416-21525 placement
function assertNotProtectedPath(e) {
  if (isProtectedDirPath(e.split("/").join(sep), "", DANGEROUS_FILES_LOWER))
    throw new MemoryPermanentError("invalid_path", `unsafe path segment: /${e}`);
}
//@ chunk-a477qqne.js:21525-21632 placement
function assertDocumentSize(e) {
  if (Buffer.byteLength(e, "utf8") > MAX_CONTENT_BYTES)
    throw new MemoryPermanentError("http_413", "document exceeds the size cap");
}
//@ chunk-a477qqne.js:21632-21695 placement = generatePlaceholders (1)
/**
 * 把名字编码为固定前缀加 UTF-8 十六进制串。旧版名 generatePlaceholders 误配，与 Bash 无关。
 */
function encodeHexName(e) {
  return LocalDirMemoryStore + Buffer.from(e, "utf8").toString("hex");
}
//@ chunk-a477qqne.js:21695-21857 placement = generatePlaceholders (1)
/**
 * 解码固定前缀加十六进制的名字，校验能往返编码且名字合法，否则返回 null。与 Bash 无关。
 */
function decodeHexName(e) {
  let n = e.startsWith(LocalDirMemoryStore) ? e.slice(LocalDirMemoryStore.length) : "";
  if (!HEX_NAME_RE.test(n)) return null;
  let str = Buffer.from(n, "hex").toString("utf8");
  return encodeHexName(str) === e && isMemoryDocumentPath(str) ? str : null;
}
//@ chunk-a477qqne.js:21857-22307 placement
/**
 * 安全读取记忆文件（大小上限、inode 一致）。
 */
async function readMemoryFileSafely(e) {
  let n = await lstat(e).catch(ignoreMissingOrThrow);
  if (n?.isFile() !== true || n.size > MAX_MEMORY_FILE_BYTES) return null;
  let r = await open(e, SAFE_OPEN_FLAGS).catch(ignoreMissingOrThrow);
  if (r === null) return null;
  try {
    let stats = await r.stat();
    if (
      !stats.isFile() ||
      stats.size > MAX_MEMORY_FILE_BYTES ||
      (SAFE_OPEN_FLAGS === "r" && (stats.ino !== n.ino || stats.dev !== n.dev))
    )
      return null;
    let content = await r.readFile({
      encoding: "utf8",
    });
    return {
      content,
      sha256: computeContentHash(content),
      updatedAt: stats.mtime.toISOString(),
      sizeBytes: stats.size,
      mode: stats.mode & 4095,
    };
  } catch (error) {
    return ignoreMissingOrThrow(error);
  } finally {
    await r.close().catch(() => {});
  }
}
export { readMemoryFileSafely, encodeHexName, MISSING_PATH_ERRORS, PERMISSION_ERRORS, LocalMemoryStore };
