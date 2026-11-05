/**
 * utils/fileStore.ts
 *
 * 2.1.316 新增：本地文件存储实现与文件读取器
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-yw5t5y3v.js (5)
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
import { NOFOLLOW_NONBLOCK_FLAGS } from "./fsFlags.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-yw5t5y3v.js:528-1859 placement
/**
 * 本地文件存储实现：读写文本与字节、删除、列目录。
 */
class LocalFileStore {
  read(filePath) {
    return readFile(filePath, "utf8");
  }
  readBytes(filePath) {
    return readFile(filePath);
  }
  write(filePath, data, mode) {
    return writeFile(filePath, data, {
      encoding: "utf8",
      mode,
    });
  }
  async mkdir(dirPath, mode) {
    try {
      await mkdir(dirPath, {
        recursive: true,
        mode,
      });
    } catch (error) {
      if (getErrnoCode(error) !== "EEXIST") throw error;
    }
  }
  atomicWrite(filePath, data, writeOptions) {
    return writeFileAtomic(filePath, data, writeOptions);
  }
  delete(filePath) {
    return unlink(filePath);
  }
  list(dirPath) {
    return readdir(dirPath);
  }
  append(filePath, data, mode) {
    return appendFile(filePath, data, {
      encoding: "utf8",
      mode,
    });
  }
  writeExclusive(filePath, data, mode) {
    return writeFile(filePath, data, {
      encoding: "utf8",
      flag: "wx",
      mode,
    });
  }
  writeBytesExclusive(filePath, data, mode) {
    return writeFile(filePath, data, {
      flag: "wx",
      mode,
    });
  }
  copy(sourcePath, destPath) {
    return copyFile(sourcePath, destPath);
  }
  async stat(filePath) {
    return {
      mtimeMs: (await stat(filePath)).mtimeMs,
    };
  }
  async lstat(filePath) {
    try {
      let stats = await lstat(filePath);
      return {
        isSymbolicLink: stats.isSymbolicLink(),
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        mtimeMs: stats.mtimeMs,
        nlink: stats.nlink,
      };
    } catch (error) {
      if (getErrnoCode(error) === "ENOENT") return;
      throw error;
    }
  }
  async listEntries(dirPath) {
    return (
      await readdir(dirPath, {
        withFileTypes: true,
      })
    ).map((dirent) => ({
      name: dirent.name,
      isDirectory: dirent.isDirectory(),
      isFile: dirent.isFile(),
    }));
  }
  async readRange(filePath, offset, length) {
    assertNonNegativeInteger("readRange", "offset", offset);
    assertNonNegativeInteger("readRange", "length", length);
    let handle = await open(filePath, "r");
    try {
      return await readExactly(handle, offset, length);
    } finally {
      await handle.close();
    }
  }
  async readTail(filePath, maxBytes, options) {
    assertNonNegativeInteger("readTail", "maxBytes", maxBytes);
    let openFlags = options?.noFollow ? constants.O_RDONLY | NOFOLLOW_NONBLOCK_FLAGS : "r";
    let handle = await open(filePath, openFlags);
    try {
      let stats = await handle.stat();
      if (options?.noFollow && !stats.isFile())
        throw Object.assign(Error("ENXIO: not a regular file"), {
          code: "ENXIO",
          path: filePath,
        });
      let { size } = stats;
      let min = Math.min(maxBytes, size);
      return await readExactly(handle, size - min, min);
    } finally {
      await handle.close();
    }
  }
}
//@ chunk-yw5t5y3v.js:1859-1978 placement
/**
 * 参数不是非负整数时抛 RangeError。
 */
function assertNonNegativeInteger(methodName, parameterName, value) {
  if (!Number.isInteger(value) || value < 0)
    throw RangeError(`${methodName}: ${parameterName} must be a non-negative integer, got ${value}`);
}
//@ chunk-yw5t5y3v.js:1978-2178 placement
/**
 * 从句柄指定位置读取 n 字节（遇到文件结尾时返回已读部分）。
 */
async function readExactly(handle, offset, length) {
  if (length === 0) return Buffer.alloc(0);
  let buffer = Buffer.alloc(length);
  let totalRead = 0;
  while (totalRead < length) {
    let { bytesRead } = await handle.read(buffer, totalRead, length - totalRead, offset + totalRead);
    if (bytesRead === 0) break;
    totalRead += bytesRead;
  }
  return totalRead === length ? buffer : Buffer.from(buffer.subarray(0, totalRead));
}
//@ chunk-yw5t5y3v.js:2178-2190 placement
var fileReaderStorage; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-yw5t5y3v.js:2178", () => {
  fileReaderStorage = new AsyncLocalStorage();
});
//@ chunk-yw5t5y3v.js:2190-2233 placement
/**
 * 取当前文件读取器（ALS 覆盖或默认 read/readBytes 实现）。
 */
function getFileReader() {
  return fileReaderStorage.getStore() ?? new LocalFileStore();
}
export { getFileReader, LocalFileStore };
