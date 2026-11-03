/**
 * utils/fileStore.ts
 *
 * 2.1.316 新增：本地文件存储实现与文件读取器
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-7kr2r08r.js (5)
 * attribution: placement 5
 */
import {
  readFile,
  writeFile,
  mkdir,
  unlink,
  readdir,
  appendFile,
  copyFile,
  stat,
  lstat,
  open,
} from "fs/promises";
import { constants } from "fs";
import { AsyncLocalStorage } from "async_hooks";
import { getErrnoCode } from "./errors.js";
import { writeFileAtomic } from "./atomicPublishWrite.js";
import { ws } from "./fsFlags.js";

/**
 * 本地文件存储实现：读写文本与字节、删除、列目录。
 */
//@ chunk-7kr2r08r.js:528-1859 placement
class LocalFileStore {
  read(r) {
    return readFile(r, "utf8");
  }
  readBytes(r) {
    return readFile(r);
  }
  write(r, e, t) {
    return writeFile(r, e, { encoding: "utf8", mode: t });
  }
  async mkdir(r, e) {
    try {
      await mkdir(r, { recursive: !0, mode: e });
    } catch (error) {
      if (getErrnoCode(error) !== "EEXIST") throw error;
    }
  }
  atomicWrite(r, e, t) {
    return writeFileAtomic(r, e, t);
  }
  delete(r) {
    return unlink(r);
  }
  list(r) {
    return readdir(r);
  }
  append(r, e, t) {
    return appendFile(r, e, { encoding: "utf8", mode: t });
  }
  writeExclusive(r, e, t) {
    return writeFile(r, e, { encoding: "utf8", flag: "wx", mode: t });
  }
  writeBytesExclusive(r, e, t) {
    return writeFile(r, e, { flag: "wx", mode: t });
  }
  copy(r, e) {
    return copyFile(r, e);
  }
  async stat(r) {
    return { mtimeMs: (await stat(r)).mtimeMs };
  }
  async lstat(r) {
    try {
      let e = await lstat(r);
      return {
        isSymbolicLink: e.isSymbolicLink(),
        isFile: e.isFile(),
        isDirectory: e.isDirectory(),
        mtimeMs: e.mtimeMs,
        nlink: e.nlink,
      };
    } catch (error) {
      if (getErrnoCode(error) === "ENOENT") return;
      throw error;
    }
  }
  async listEntries(r) {
    return (await readdir(r, { withFileTypes: !0 })).map((t) => ({
      name: t.name,
      isDirectory: t.isDirectory(),
      isFile: t.isFile(),
    }));
  }
  async readRange(r, e, t) {
    (assertNonNegativeInteger("readRange", "offset", e), assertNonNegativeInteger("readRange", "length", t));
    let n = await open(r, "r");
    try {
      return await readExactly(n, e, t);
    } finally {
      await n.close();
    }
  }
  async readTail(r, e, t) {
    assertNonNegativeInteger("readTail", "maxBytes", e);
    let n = t?.noFollow ? constants.O_RDONLY | ws : "r",
      i = await open(r, n);
    try {
      let stats = await i.stat();
      if (t?.noFollow && !stats.isFile())
        throw Object.assign(Error("ENXIO: not a regular file"), { code: "ENXIO", path: r });
      let { size: size } = stats,
        min = Math.min(e, size);
      return await readExactly(i, size - min, min);
    } finally {
      await i.close();
    }
  }
}
/**
 * 参数不是非负整数时抛 RangeError。
 */
//@ chunk-7kr2r08r.js:1859-1978 placement
function assertNonNegativeInteger(r, e, t) {
  if (!Number.isInteger(t) || t < 0) throw RangeError(`${r}: ${e} must be a non-negative integer, got ${t}`);
}
/**
 * 从句柄指定位置读取 n 字节（遇到文件结尾时返回已读部分）。
 */
//@ chunk-7kr2r08r.js:1978-2178 placement
async function readExactly(r, e, t) {
  if (t === 0) return Buffer.alloc(0);
  let alloc = Buffer.alloc(t),
    i = 0;
  while (i < t) {
    let { bytesRead: bytesRead } = await r.read(alloc, i, t - i, e + i);
    if (bytesRead === 0) break;
    i += bytesRead;
  }
  return i === t ? alloc : Buffer.from(alloc.subarray(0, i));
}
//@ chunk-7kr2r08r.js:2178-2190 placement
var fileReaderStorage = new AsyncLocalStorage();
/**
 * 取当前文件读取器（ALS 覆盖或默认 read/readBytes 实现）。
 */
//@ chunk-7kr2r08r.js:2190-2233 placement = getAgentContext (1)
function getFileReader() {
  return fileReaderStorage.getStore() ?? new LocalFileStore();
}

export { getFileReader, LocalFileStore };
