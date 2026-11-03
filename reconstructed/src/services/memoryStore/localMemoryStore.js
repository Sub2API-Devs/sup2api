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
import {
  resolve,
  resolve as resolve_2,
  dirname,
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  sep,
  sep as sep_2,
  sep as sep_3,
  relative,
  relative as relative_2,
} from "path";
import { mkdir, readdir, lstat, open } from "fs/promises";
import {
  EAt,
  MemoryNotFoundError,
  MemoryPermanentError,
  MemoryUnavailableError,
  MemoryConflictError,
} from "../orgMemory/storeErrors.js";
import { Pk } from "../orgMemory/storeApi.js";
import { pMap } from "../../../vendor/p-map/index.js";
import {
  de,
  ht,
  readExistingMemoryMode,
  createMemoryFileExclusive,
  classifyMemoryPathConflict,
  memoryFsErrorToResult,
  $e,
  ue,
} from "./memoryDocumentFs.js";
import { writeFileAtomic } from "../../utils/plugins/installCounts.js";
import { getErrnoCode, AbortError } from "../../utils/errors.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { PathTraversalError, sanitizePathKey } from "../../memdir/teamMemPaths.js";
import { logForDebugging } from "../../utils/debug.js";
import { zje, isReservedDeviceName } from "../../utils/windowsProfileFolders.js";
import { isMemoryDocumentKey } from "./memoryKeys.js";
import { isProtectedDirPath } from "../../utils/permissions/protectedDirNames.js";
import { DANGEROUS_FILES_LOWER } from "../../utils/permissions/filesystem.js";

//@ chunk-a477qqne.js:16887-17087 placement
var MEM = "mem_",
  yn = /^(?:[0-9a-f]{2})+$/,
  gn = 32,
  dt = constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
  wn = new Set(["ENOENT", "ENOTDIR", "EISDIR", "ELOOP", "ENAMETOOLONG"]),
  Mn = new Set(["EACCES", "EPERM", "EBUSY"]),
  lt = 4 * EAt;
/**
 * 本地目录实现的记忆存储（list/read/write/delete，排除规则）。
 */
//@ chunk-a477qqne.js:17087-20453 placement
class LocalMemoryStore {
  mode;
  label;
  partitionId;
  rootDir;
  excludeKey;
  constructor({ rootDir: e, label: n, mode: r = "rw", excludeKey: s }) {
    ((this.rootDir = resolve_2(e)),
      (this.label = n),
      (this.mode = r),
      (this.partitionId = this.rootDir),
      (this.excludeKey = s ?? (() => !1)));
  }
  async list(e, n) {
    Y(n?.signal);
    let sliced = Pk(e ?? "/")
        .replace(/\/+$/, "")
        .slice(1),
      s = sliced === "" ? this.rootDir : isSafeMemoryKey(sliced) ? await this.resolveOrNull(sliced) : null;
    if (s === null) return [];
    let collectDocuments = await this.collectDocuments(s, sliced, n?.depthOne !== !0, n?.signal);
    return (
      await pMap(
        collectDocuments,
        async ({ abs: abs, key: key }) => {
          Y(n?.signal);
          let y = await readMemoryFileSafely(abs).catch(de);
          if (y === null) return [];
          let { sha256: sha256, sizeBytes: sizeBytes, updatedAt: updatedAt } = y;
          return [
            {
              id: encodeHexName(key),
              path: "/" + key,
              sha256: sha256,
              sizeBytes: sizeBytes,
              updatedAt: updatedAt,
            },
          ];
        },
        { concurrency: gn },
      )
    )
      .flat()
      .toSorted((l, h) => (l.path < h.path ? -1 : l.path > h.path ? 1 : 0));
  }
  async readByPath(e, n) {
    Y(n?.signal);
    let sliced = Pk(e).slice(1),
      s = me(sliced) ? await this.resolveOrNull(sliced) : null,
      i = s === null ? null : await readMemoryFileSafely(s).catch(de);
    return i === null ? null : ht(i);
  }
  async read(e, n) {
    Y(n?.signal);
    let locate = await this.locate(e);
    if (locate === null || locate.current === null) throw new MemoryNotFoundError(e);
    return ht(locate.current);
  }
  async create(e, n, r) {
    (this.assertWritable(), Y(r?.signal));
    let s = Pk(e),
      sliced = s.slice(1);
    if (!me(sliced)) throw new MemoryPermanentError("invalid_path", `not a document path: ${e}`);
    assertDocumentSize(n);
    let forWrite = await this.resolveForWrite(sliced),
      l = r?.precondition === "not_exists",
      h = l ? void 0 : await readExistingMemoryMode(forWrite, s);
    try {
      (await mkdir(dirname(forWrite), { recursive: !0 }),
        await (l ? createMemoryFileExclusive(forWrite, n) : writeFileAtomic(forWrite, n, h)));
    } catch (error) {
      let w = getErrnoCode(error);
      throw (
        (await classifyMemoryPathConflict(forWrite, s, l)) ??
        (w === "ENOENT"
          ? new MemoryUnavailableError(`ENOENT: ${s}`, error)
          : w === "EEXIST" && !l
            ? new MemoryPermanentError("rename_refused", `EEXIST: ${s}`)
            : memoryFsErrorToResult(error, s))
      );
    }
    return { id: encodeHexName(sliced), sha256: computeContentHash(n) };
  }
  async update(e, n, r, s) {
    (this.assertWritable(), Y(s?.signal), assertDocumentSize(n));
    let locate = await this.locate(e);
    if (locate === null || locate.current === null) throw new MemoryNotFoundError(e);
    let { key: key, abs: abs, current: h } = locate;
    if ((assertNotProtectedPath(key), r !== null && h.sha256 !== r))
      throw new MemoryConflictError("/" + key, r, h.sha256);
    return (
      await writeFileAtomic(abs, n, h.mode).catch((y) => {
        let w = getErrnoCode(y);
        throw w === "ENOENT"
          ? new MemoryNotFoundError(e)
          : w === "EEXIST"
            ? new MemoryPermanentError("rename_refused", `EEXIST: /${key}`)
            : memoryFsErrorToResult(y, "/" + key);
      }),
      { id: e, sha256: computeContentHash(n) }
    );
  }
  async delete(e, n) {
    this.assertWritable();
    let locate = await this.locate(e);
    if (locate === null || locate.current === null) {
      if (n !== null) throw new MemoryNotFoundError(e);
      return;
    }
    let { key: key, abs: abs, current: d } = locate;
    if (n !== null && d.sha256 !== n) throw new MemoryConflictError("/" + key, n, d.sha256);
    await $e(abs).catch((l) => {
      if (getErrnoCode(l) !== "ENOENT") throw memoryFsErrorToResult(l, "/" + key);
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
    let n = decodeHexName(e),
      r = n === null ? null : await this.resolveOrNull(n);
    if (n === null || r === null) return null;
    let s = await readMemoryFileSafely(r).catch((i) => {
      throw memoryFsErrorToResult(i, "/" + n);
    });
    return { key: n, abs: r, current: s };
  }
  async resolveForWrite(e) {
    assertNotProtectedPath(e);
    let n = await this.resolveKey(e).catch((r) => {
      throw r instanceof PathTraversalError ? new MemoryPermanentError("invalid_path", r.message) : r;
    });
    if (n === null) throw new MemoryConflictError("/" + e, null);
    return n;
  }
  async resolveOrNull(e) {
    try {
      return await this.resolveKey(e);
    } catch (error) {
      if (error instanceof PathTraversalError)
        return (logForDebugging(`local-memory[${this.label}]: ${error.message}`), null);
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
    Y(s);
    let i = await readdir(e, { withFileTypes: !0 }).catch(de),
      d = [];
    for (let l of i ?? []) {
      let h = n === "" ? l.name : `${n}/${l.name}`;
      if (l.name.startsWith(".") || this.excludeKey(h)) continue;
      let y = join_4(e, l.name),
        w = await normalizeSource(l, y);
      if (w === "directory") {
        if (r) d.push(...(await this.collectDocuments(y, h, !0, s)));
      } else if (w === "file" && bn(h)) d.push({ abs: y, key: h });
    }
    return d;
  }
}
/**
 * 逐段解析记忆键路径（拒绝越界与链接）。
 */
//@ chunk-a477qqne.js:20453-21007 placement
async function resolveMemoryKeyPath(e, n) {
  sanitizePathKey(n);
  let r = resolve_2(e),
    s = resolve_2(r, n);
  if (s !== r && !s.startsWith(r + sep_3))
    throw new PathTraversalError(`Key escapes memory directory: "${n}"`);
  let i = s === r ? [] : relative_2(r, s).split(sep_3),
    d = r;
  for (let l of i) {
    let h = await lstat(join_4(d, l)).catch((w) => {
      let M = getErrnoCode(w);
      if (M === "ENOENT" || M === "ENOTDIR") return null;
      throw memoryFsErrorToResult(w, "/" + n);
    });
    if (h === null) return s;
    if (h.isSymbolicLink()) throw new PathTraversalError(`Key passes through a symlink: "${n}"`);
    let y = await readdir(d).catch((w) => {
      let M = getErrnoCode(w);
      if (M === "ENOENT" || M === "ENOTDIR") return null;
      throw memoryFsErrorToResult(w, "/" + n);
    });
    if (y === null || !y.includes(l)) return null;
    d = join_4(d, l);
  }
  return s;
}
/**
 * 对目录项做 stat 分类（名字配错）。
 */
//@ chunk-a477qqne.js:21007-21170 placement = normalizeSource (0.883)
async function normalizeSource(source, projectRoot) {
  let r =
    source.isDirectory() || source.isFile() || source.isSymbolicLink()
      ? source
      : await lstat(projectRoot).catch(de);
  return r?.isDirectory() ? "directory" : r?.isFile() ? "file" : "other";
}
//@ chunk-a477qqne.js:21170-21211 placement
function Y(e) {
  if (e?.aborted) throw new AbortError();
}
//@ chunk-a477qqne.js:21211-21325 placement
function isSafeMemoryKey(e) {
  return e
    .split("/")
    .every(
      (n) => n !== "" && !n.startsWith(".") && !/:|~\d/.test(n) && !zje.test(n) && !isReservedDeviceName(n),
    );
}
//@ chunk-a477qqne.js:21325-21361 placement
function me(e) {
  return isSafeMemoryKey(e) && isMemoryDocumentKey(e);
}
//@ chunk-a477qqne.js:21361-21416 placement
function bn(e) {
  try {
    return (sanitizePathKey(e), me(e));
  } catch {
    return !1;
  }
}
//@ chunk-a477qqne.js:21416-21525 placement
function assertNotProtectedPath(e) {
  if (isProtectedDirPath(e.split("/").join(sep_3), "", DANGEROUS_FILES_LOWER))
    throw new MemoryPermanentError("invalid_path", `unsafe path segment: /${e}`);
}
//@ chunk-a477qqne.js:21525-21632 placement
function assertDocumentSize(e) {
  if (Buffer.byteLength(e, "utf8") > EAt)
    throw new MemoryPermanentError("http_413", "document exceeds the size cap");
}
/**
 * 把名字编码为固定前缀加 UTF-8 十六进制串。旧版名 generatePlaceholders 误配，与 Bash 无关。
 */
//@ chunk-a477qqne.js:21632-21695 placement = generatePlaceholders (1)
function encodeHexName(e) {
  return MEM + Buffer.from(e, "utf8").toString("hex");
}
/**
 * 解码固定前缀加十六进制的名字，校验能往返编码且名字合法，否则返回 null。与 Bash 无关。
 */
//@ chunk-a477qqne.js:21695-21857 placement = generatePlaceholders (1)
function decodeHexName(e) {
  let n = e.startsWith(MEM) ? e.slice(MEM.length) : "";
  if (!yn.test(n)) return null;
  let str = Buffer.from(n, "hex").toString("utf8");
  return encodeHexName(str) === e && me(str) ? str : null;
}
/**
 * 安全读取记忆文件（大小上限、inode 一致）。
 */
//@ chunk-a477qqne.js:21857-22307 placement
async function readMemoryFileSafely(e) {
  let n = await lstat(e).catch(ue);
  if (n?.isFile() !== !0 || n.size > lt) return null;
  let r = await open(e, dt).catch(ue);
  if (r === null) return null;
  try {
    let stats = await r.stat();
    if (!stats.isFile() || stats.size > lt || (dt === "r" && (stats.ino !== n.ino || stats.dev !== n.dev)))
      return null;
    let content = await r.readFile({ encoding: "utf8" });
    return {
      content: content,
      sha256: computeContentHash(content),
      updatedAt: stats.mtime.toISOString(),
      sizeBytes: stats.size,
      mode: stats.mode & 4095,
    };
  } catch (error) {
    return ue(error);
  } finally {
    await r.close().catch(() => {});
  }
}

export { readMemoryFileSafely, encodeHexName, wn, Mn, LocalMemoryStore };
