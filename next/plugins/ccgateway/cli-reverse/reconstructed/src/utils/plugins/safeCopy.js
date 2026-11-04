/**
 * utils/plugins/safeCopy.ts
 *
 * 2.1.316 新增：不跟随链接的复制与原子写
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-k176arn3.js (15)
 * attribution: placement 15
 */
import { constants, createWriteStream } from "fs";
import { lstat, copyFile, open, readlink } from "fs/promises";
import { pipeline } from "stream/promises";
import { join } from "path";
import { getPlatform } from "../platform.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS, getErrnoCode } from "../errors.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-k176arn3.js:879-1450 placement
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
//@ chunk-k176arn3.js:1450-1624 placement
function fileSwappedError(path) {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `Refusing to copy ${path}: it is no longer a regular file (swapped during the copy).`,
    "plugin copy source swapped for a non-regular file mid-copy",
  );
}
//@ chunk-k176arn3.js:1624-1720 placement
var RETRYABLE_COPY_ERRNOS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-k176arn3.js:1624", () => {
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
//@ chunk-k176arn3.js:1720-2277 placement
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
    if (!stats.isFile() || stats.size > maxBytes) return null;
    let { buffer, bytesRead } = await handle.read(Buffer.alloc(maxBytes + 1), 0, maxBytes + 1, 0);
    if (bytesRead > maxBytes) return null;
    return buffer.subarray(0, bytesRead).toString("utf-8");
  } catch (error) {
    return onError(error);
  } finally {
    await handle.close();
  }
}
//@ chunk-k176arn3.js:2277-2414 placement
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
//@ chunk-k176arn3.js:2414-2424 placement
var copyFallbackArmed = false;
//@ chunk-k176arn3.js:2424-2445 placement
function markInPlaceWriteForced() {
  copyFallbackArmed = true;
}
//@ chunk-k176arn3.js:2445-2469 placement
function isCopyFallbackArmed() {
  return copyFallbackArmed;
}
//@ chunk-k176arn3.js:2469-2492 placement
function neverCopyFallback() {
  return false;
}
//@ chunk-k176arn3.js:2492-2552 placement
function shouldWriteInPlace({ served }) {
  if (!isCopyFallbackArmed()) return false;
  return served ? false : neverCopyFallback();
}
//@ chunk-k176arn3.js:2552-2619 placement
/**
 * ATOMIC_WRITE_ERRNOS：原子写降级错误码。
 */
var ATOMIC_WRITE_DIRNAME; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var ATOMIC_WRITE_ERRNOS;
deferInit("chunk-k176arn3.js:2552", () => {
  ATOMIC_WRITE_DIRNAME = ".cc-writes";
  ATOMIC_WRITE_ERRNOS = new Set(["EXDEV", "EPERM", "EEXIST", "EBUSY"]);
});
//@ chunk-k176arn3.js:2619-2658 placement
function isInPlaceWriteDefault() {
  return shouldWriteInPlace({
    served: false,
  });
}
//@ chunk-k176arn3.js:2658-2909 placement
function hardlinkedRefusalText(path, nlink) {
  return `Could not rewrite ${path} in place: this file has other names on disk (it is hard-linked, ${nlink} names in all), and writing it in place would change the file under every one of those names. Remove the extra links, then try again.`;
}
//@ chunk-k176arn3.js:2909-3054 placement
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
//@ chunk-k176arn3.js:3054-3097 placement
var TRANSIENT_FS_ERRORS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-k176arn3.js:3054", () => {
  TRANSIENT_FS_ERRORS = new Set(["EPERM", "EBUSY", "EACCES"]);
});
export {
  ATOMIC_WRITE_DIRNAME,
  ATOMIC_WRITE_ERRNOS,
  TRANSIENT_FS_ERRORS,
  isSameFilesystem,
  fileSwappedError,
  copyFileNoFollow,
  writeFileAtomically,
  shouldWriteInPlace,
  isInPlaceWriteDefault,
  hardlinkedRefusalText,
  markInPlaceWriteForced,
  hardlinkedRefusalError,
};
