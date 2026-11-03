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

//@ chunk-k176arn3.js:879-1450 placement
/**
 * 不跟随符号链接地复制文件（O_NOFOLLOW），在 Windows 等不支持时先检查是普通文件。
 */
async function copyFileNoFollow(e, t, n) {
  let O_NOFOLLOW = constants.O_NOFOLLOW;
  if (O_NOFOLLOW === undefined || getPlatform() === "windows") {
    if (!(await lstat(e)).isFile()) throw fileSwappedError(e);
    await copyFile(e, t, n?.exclusive ? constants.COPYFILE_EXCL : 0);
    return;
  }
  let o = await open(e, constants.O_RDONLY | O_NOFOLLOW | (n?.nonBlocking ? (constants.O_NONBLOCK ?? 0) : 0));
  try {
    let stats = await o.stat();
    if (!stats.isFile()) throw fileSwappedError(e);
    if (n?.exactMode) {
      let s = await open(t, n.exclusive ? "wx" : "w", stats.mode);
      try {
        await pipeline(
          o.createReadStream(),
          createWriteStream(t, {
            fd: s.fd,
            autoClose: false,
          }),
        );
        await s.chmod(stats.mode & 4095);
      } finally {
        await s.close();
      }
    } else
      await pipeline(
        o.createReadStream(),
        createWriteStream(t, {
          mode: stats.mode,
          flags: n?.exclusive ? "wx" : "w",
        }),
      );
  } finally {
    await o.close();
  }
}
//@ chunk-k176arn3.js:1450-1624 placement
function fileSwappedError(e) {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `Refusing to copy ${e}: it is no longer a regular file (swapped during the copy).`,
    "plugin copy source swapped for a non-regular file mid-copy",
  );
}
//@ chunk-k176arn3.js:1624-1720 placement
var RETRYABLE_COPY_ERRNOS = new Set([
  "ENOENT",
  "ENOTDIR",
  "ELOOP",
  "EMLINK",
  "EFTYPE",
  "EISDIR",
  "ENAMETOOLONG",
  "EINVAL",
]);
//@ chunk-k176arn3.js:1720-2277 placement
/**
 * 原子写文件：在 .cc-writes 临时目录写好再重命名，处理跨设备与瞬时错误。
 */
async function writeFileAtomically(e, t, n) {
  let r = (error) => {
    let errnoCode = getErrnoCode(error);
    if (n?.throwTransient && (errnoCode === undefined || !RETRYABLE_COPY_ERRNOS.has(errnoCode))) throw error;
    return null;
  };
  let o = getPlatform() === "windows";
  let O_NOFOLLOW = o ? undefined : constants.O_NOFOLLOW;
  let s = o ? 0 : (constants.O_NONBLOCK ?? 0);
  if (O_NOFOLLOW === undefined) {
    let c = await lstat(e).catch(r);
    if (c === null || !c.isFile()) return null;
  }
  let f;
  try {
    f = await open(e, constants.O_RDONLY | (O_NOFOLLOW ?? 0) | s);
  } catch (error) {
    return r(error);
  }
  try {
    let stats = await f.stat();
    if (!stats.isFile() || stats.size > t) return null;
    let { buffer, bytesRead } = await f.read(Buffer.alloc(t + 1), 0, t + 1, 0);
    if (bytesRead > t) return null;
    return buffer.subarray(0, bytesRead).toString("utf-8");
  } catch (error) {
    return r(error);
  } finally {
    await f.close();
  }
}
//@ chunk-k176arn3.js:2277-2414 placement
async function isSameFilesystem(e, t) {
  let n = join(e, t);
  try {
    await readlink(n);
    return false;
  } catch (error) {
    if (getErrnoCode(error) === "EINVAL") return !(await lstat(n)).isSymbolicLink();
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
var ATOMIC_WRITE_DIRNAME = ".cc-writes";
var ATOMIC_WRITE_ERRNOS = new Set(["EXDEV", "EPERM", "EEXIST", "EBUSY"]);
//@ chunk-k176arn3.js:2619-2658 placement
function isInPlaceWriteDefault() {
  return shouldWriteInPlace({
    served: false,
  });
}
//@ chunk-k176arn3.js:2658-2909 placement
function hardlinkedRefusalText(e, t) {
  return `Could not rewrite ${e} in place: this file has other names on disk (it is hard-linked, ${t} names in all), and writing it in place would change the file under every one of those names. Remove the extra links, then try again.`;
}
//@ chunk-k176arn3.js:2909-3054 placement
function hardlinkedRefusalError(e, nlink) {
  return Object.assign(
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      hardlinkedRefusalText(e, nlink),
      "in-place write refused: the target has other names (a hard link)",
    ),
    {
      code: "EMLINK",
      path: e,
    },
  );
}
//@ chunk-k176arn3.js:3054-3097 placement
var TRANSIENT_FS_ERRORS = new Set(["EPERM", "EBUSY", "EACCES"]);
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
