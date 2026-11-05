/**
 * utils/plugins/safeCopy.ts
 *
 * 2.1.316 新增：不跟随链接的复制与原子写
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n44f9pt7.js (15)
 * attribution: placement 15
 */
import { constants, createWriteStream } from "fs";
import { lstat, copyFile, open, readlink } from "fs/promises";
import { pipeline } from "stream/promises";
import { join } from "path";
import { getPlatform } from "../platform.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS, getErrnoCode } from "../errors.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-n44f9pt7.js:1119-1692 placement
/**
 * 不跟随符号链接地复制文件（O_NOFOLLOW），在 Windows 等不支持时先检查是普通文件。
 */
async function copyFileNoFollow(sourcePath, targetPath, options) {
  let O_NOFOLLOW = constants.O_NOFOLLOW;
  if (O_NOFOLLOW === undefined || getPlatform() === "windows") {
    if (!(await lstat(sourcePath)).isFile()) throw fileSwappedError(sourcePath);
    await copyFile(sourcePath, targetPath, options?.exclusive ? constants.COPYFILE_EXCL : 0);
    return;
  }
  let handle = await open(
    sourcePath,
    constants.O_RDONLY | O_NOFOLLOW | (options?.nonBlocking ? (constants.O_NONBLOCK ?? 0) : 0),
  );
  try {
    let stats = await handle.stat();
    if (!stats.isFile()) throw fileSwappedError(sourcePath);
    if (options?.exactMode) {
      let writer = await open(targetPath, options.exclusive ? "wx" : "w", stats.mode);
      try {
        await pipeline(
          handle.createReadStream(),
          createWriteStream(targetPath, {
            fd: writer.fd,
            autoClose: false,
          }),
        );
        await writer.chmod(stats.mode & 4095);
      } finally {
        await writer.close();
      }
    } else
      await pipeline(
        handle.createReadStream(),
        createWriteStream(targetPath, {
          mode: stats.mode,
          flags: options?.exclusive ? "wx" : "w",
        }),
      );
  } finally {
    await handle.close();
  }
}
//@ chunk-n44f9pt7.js:1692-1866 placement
function fileSwappedError(path) {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `Refusing to copy ${path}: it is no longer a regular file (swapped during the copy).`,
    "plugin copy source swapped for a non-regular file mid-copy",
  );
}
//@ chunk-n44f9pt7.js:1866-1962 placement
var RETRYABLE_COPY_ERRNOS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-n44f9pt7.js:1866", () => {
  RETRYABLE_COPY_ERRNOS = new Set([
    "ENOENT",
    "ENOTDIR",
    "ELOOP",
    "EMLINK",
    "EFTYPE",
    "EISDIR",
    "ENAMETOOLONG",
    "EINVAL",
  ]);
});
//@ chunk-n44f9pt7.js:1962-2542 placement
/**
 * 原子写文件：在 .cc-writes 临时目录写好再重命名，处理跨设备与瞬时错误。
 */
async function writeFileAtomically(path, maxBytes, options) {
  let onError = (error) => {
    let errnoCode = getErrnoCode(error);
    if (options?.throwTransient && (errnoCode === undefined || !RETRYABLE_COPY_ERRNOS.has(errnoCode)))
      throw error;
    return null;
  };
  let isWindows = getPlatform() === "windows";
  let O_NOFOLLOW = isWindows ? undefined : constants.O_NOFOLLOW;
  let nonBlock = isWindows ? 0 : (constants.O_NONBLOCK ?? 0);
  if (O_NOFOLLOW === undefined) {
    let stat = await lstat(path).catch(onError);
    if (stat === null || !stat.isFile()) return null;
  }
  let handle;
  try {
    handle = await open(path, constants.O_RDONLY | (O_NOFOLLOW ?? 0) | nonBlock);
  } catch (error) {
    return onError(error);
  }
  try {
    let stats = await handle.stat();
    if (!stats.isFile() || stats.size > maxBytes || (options?.oneName && stats.nlink > 1)) return null;
    let { buffer, bytesRead } = await handle.read(Buffer.alloc(maxBytes + 1), 0, maxBytes + 1, 0);
    if (bytesRead > maxBytes) return null;
    return buffer.subarray(0, bytesRead).toString("utf-8");
  } catch (error) {
    return onError(error);
  } finally {
    await handle.close();
  }
}
//@ chunk-n44f9pt7.js:2542-2679 placement
async function isSameFilesystem(parentDir, name) {
  let path = join(parentDir, name);
  try {
    await readlink(path);
    return false;
  } catch (error) {
    if (getErrnoCode(error) === "EINVAL") return !(await lstat(path)).isSymbolicLink();
    throw error;
  }
}
//@ chunk-n44f9pt7.js:2679-2689 placement
var copyFallbackArmed = false;
//@ chunk-n44f9pt7.js:2689-2710 placement
function markInPlaceWriteForced() {
  copyFallbackArmed = true;
}
//@ chunk-n44f9pt7.js:2710-2734 placement
function isCopyFallbackArmed() {
  return copyFallbackArmed;
}
//@ chunk-n44f9pt7.js:2734-2757 placement
function neverCopyFallback() {
  return false;
}
//@ chunk-n44f9pt7.js:2757-2817 placement
function shouldWriteInPlace({ served }) {
  if (!isCopyFallbackArmed()) return false;
  return served ? false : neverCopyFallback();
}
//@ chunk-n44f9pt7.js:3795-3862 placement
/**
 * ATOMIC_WRITE_ERRNOS：原子写降级错误码。
 */
var ATOMIC_WRITE_DIRNAME; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var ATOMIC_WRITE_ERRNOS;
deferInit("chunk-n44f9pt7.js:3795", () => {
  ATOMIC_WRITE_DIRNAME = ".cc-writes";
  ATOMIC_WRITE_ERRNOS = new Set(["EXDEV", "EPERM", "EEXIST", "EBUSY"]);
});
//@ chunk-n44f9pt7.js:3862-3901 placement
function isInPlaceWriteDefault() {
  return shouldWriteInPlace({
    served: false,
  });
}
//@ chunk-n44f9pt7.js:3901-4152 placement
function hardlinkedRefusalText(path, nlink) {
  return `Could not rewrite ${path} in place: this file has other names on disk (it is hard-linked, ${nlink} names in all), and writing it in place would change the file under every one of those names. Remove the extra links, then try again.`;
}
//@ chunk-n44f9pt7.js:4152-4297 placement
function hardlinkedRefusalError(path, nlink) {
  return Object.assign(
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      hardlinkedRefusalText(path, nlink),
      "in-place write refused: the target has other names (a hard link)",
    ),
    {
      code: "EMLINK",
      path,
    },
  );
}
//@ chunk-n44f9pt7.js:4297-4340 placement
var TRANSIENT_FS_ERRORS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-n44f9pt7.js:4297", () => {
  TRANSIENT_FS_ERRORS = new Set(["EPERM", "EBUSY", "EACCES"]);
});
export {
  writeFileAtomically,
  ATOMIC_WRITE_ERRNOS,
  isInPlaceWriteDefault,
  hardlinkedRefusalText,
  isSameFilesystem,
  fileSwappedError,
  copyFileNoFollow,
  markInPlaceWriteForced,
  ATOMIC_WRITE_DIRNAME,
  TRANSIENT_FS_ERRORS,
  shouldWriteInPlace,
  hardlinkedRefusalError,
};
