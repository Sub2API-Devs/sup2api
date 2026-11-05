/**
 * utils/atomicPublishWrite.ts
 *
 * 2.1.316 新增：原子发布写入与瞬时错误重试
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n44f9pt7.js (56)
 * attribution: placement 45, affinity 2, layout 9
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { randomBytes } from "crypto";
import * as fsPromisesModule from "fs/promises";
import { lstat, rename, open, writeFile, unlink, realpath, stat } from "fs/promises";
import * as fsModule from "fs";
import {
  lstatSync,
  renameSync,
  constants,
  unlinkSync,
  openSync,
  readSync,
  realpathSync,
  closeSync,
  fstatSync,
  readFileSync,
  writeFileSync,
  fchmodSync,
  ftruncateSync,
} from "fs";
import { join, basename, isAbsolute, dirname } from "path";
import { identity } from "./identity.js";
import { sleep } from "./sleep.js";
import { getErrnoCode } from "./errors.js";
import { didInodeChange } from "./slowOperations.js";
import { resolveMetadataBuf } from "./sessionStorage.js";
import {
  copyFileNoFollow,
  isInPlaceWriteDefault,
  hardlinkedRefusalError,
  ATOMIC_WRITE_ERRNOS,
} from "./plugins/safeCopy.js";
import { unescapeMountField } from "./wslMounts.js";
import { READ_LIMITS } from "./fsBoundRead.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-n44f9pt7.js:4340-4397 placement (2.1.88 match: atomicWriteToZipCache, 0.651)
/**
 * 生成 <路径>.tmp.<随机> 临时文件名。
 */
function makeTempSiblingPath(targetPath) {
  return `${targetPath}.tmp.${randomBytes(4).toString("hex")}`;
}
//@ chunk-n44f9pt7.js:4397-4496 placement
function isOwnTempName(fileName, targetPath) {
  let tempPrefix = `${targetPath}.tmp.`;
  return fileName.startsWith(tempPrefix) && /^[0-9a-f]{8}$/.test(fileName.slice(tempPrefix.length));
}
//@ chunk-n44f9pt7.js:4496-4570 placement
function isTempFileName(fileName) {
  return /\.tmp\.(?:[0-9a-f]{8}|\d+\.[0-9a-f]{12})$/.test(fileName);
}
//@ chunk-n44f9pt7.js:4570-4763 placement
/**
 * 重试的基础等待时长（50 毫秒）。
 */
var RETRY_DELAYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var RETRY_BASE_DELAY_MS;
var list;
var LONG_RETRY_DELAYS_MS;
var SQUASHFS_MAGIC;
var UNLINK_RETRY_DELAY_MS;
var MOUNTS_PATH;
var MOUNTS_BUFFER_BYTES;
var mountPointCache;
var int32Array;
deferInit("chunk-n44f9pt7.js:4570", () => {
  RETRY_DELAYS = 4;
  RETRY_BASE_DELAY_MS = 50;
  list = Array.from(
    {
      length: RETRY_DELAYS - 1,
    },
    () => RETRY_BASE_DELAY_MS,
  );
  LONG_RETRY_DELAYS_MS = [100, 500, 2000];
  SQUASHFS_MAGIC = 26985;
  UNLINK_RETRY_DELAY_MS = 50;
  MOUNTS_PATH = "/proc/self/mounts";
  MOUNTS_BUFFER_BYTES = 1048576;
  mountPointCache = identity(new Set(), (cache) => cache.clear());
  int32Array = new Int32Array(new SharedArrayBuffer(4));
});
//@ chunk-n44f9pt7.js:4763-4801 placement
/**
 * 同步等待给定毫秒（Atomics.wait）。
 */
function sleepSync(ms) {
  Atomics.wait(int32Array, 0, 0, ms);
}
//@ chunk-n44f9pt7.js:4801-4834 placement
/**
 * 判断错误是否可重试（当前恒返回 false）。
 */
function isRetryableError(error, targetPath, delayCount = RETRY_DELAYS - 1) {
  return false;
}
//@ chunk-n44f9pt7.js:4834-4845 placement
/**
 * 文件的“其他人可执行”权限位。
 */
var S_IXOTH = 128;
//@ chunk-n44f9pt7.js:4845-4919 placement
/**
 * 异步判断文件是否不可执行（读不到时视为不可执行）。
 */
async function isNotExecutableAsync(path) {
  try {
    return ((await lstat(path)).mode & S_IXOTH) === 0;
  } catch {
    return false;
  }
}
//@ chunk-n44f9pt7.js:4919-5105 placement
async function retryTransient(operation, targetPath, delays = list) {
  let retried = false;
  for (let targetPath_2 = 0; ; targetPath_2++)
    try {
      await operation();
      return retried;
    } catch (error) {
      if (isRetryableError(error, targetPath_2, delays.length)) {
        if (targetPath_2 === 0 && targetPath !== undefined && (await isNotExecutableAsync(targetPath)))
          throw error;
        retried = true;
        await sleep(delays[targetPath_2]);
        continue;
      }
      throw error;
    }
}
//@ chunk-n44f9pt7.js:5105-5150 placement
function retryFsOp(fromPath, toPath, operation = rename) {
  return retryTransient(() => operation(fromPath, toPath), toPath);
}
//@ chunk-n44f9pt7.js:5150-5200 placement
function retryFsOpLong(fromPath, toPath, operation = rename) {
  return retryTransient(() => operation(fromPath, toPath), toPath, LONG_RETRY_DELAYS_MS);
}
//@ chunk-n44f9pt7.js:5200-5260 placement
/**
 * 同步判断文件是否不可执行（读不到视为不可执行）。
 */
function isNotExecutableSync(path) {
  try {
    return (lstatSync(path).mode & S_IXOTH) === 0;
  } catch {
    return false;
  }
}
//@ chunk-n44f9pt7.js:5260-5404 placement
function retryFsOpSync(fromPath, toPath, operation = renameSync) {
  let retried = false;
  for (let targetPath = 0; ; targetPath++)
    try {
      operation(fromPath, toPath);
      return retried;
    } catch (error) {
      if (isRetryableError(error, targetPath)) {
        if (targetPath === 0 && isNotExecutableSync(toPath)) throw error;
        retried = true;
        sleepSync(RETRY_BASE_DELAY_MS);
        continue;
      }
      throw error;
    }
}
//@ chunk-n44f9pt7.js:5404-5523 placement
/**
 * 复制或读取文件时的大小上限（64 MiB）。
 */
var DISK_FULL_CODES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var NO_SPACE_CODES;
var MAX_COPY_BYTES;
var O_NONBLOCK;
deferInit("chunk-n44f9pt7.js:5404", () => {
  DISK_FULL_CODES = new Set(["ENOSPC", "EIO", "EDQUOT", "EFBIG"]);
  NO_SPACE_CODES = new Set([...DISK_FULL_CODES, "EROFS", "ENOENT"]);
  MAX_COPY_BYTES = 67108864;
  O_NONBLOCK = constants.O_NONBLOCK;
});
//@ chunk-n44f9pt7.js:5523-5595 placement
/**
 * 判断 Windows 写目标检查是否通过。
 */
async function isWindowsTargetOk(path, allowAbsent, platform = "linux") {
  return (await checkWindowsTarget(path, allowAbsent, platform)).kind === "pass";
}
//@ chunk-n44f9pt7.js:5595-5809 placement
async function checkWindowsTarget(path, allowAbsent, platform = "linux") {
  if (platform !== "win32")
    return {
      kind: "pass",
    };
  try {
    return {
      kind: (await lstat(path)).isFile() ? "pass" : "refuse",
    };
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT")
      return {
        kind: allowAbsent ? "pass" : "refuse",
      };
    return {
      kind: "failed",
      error,
    };
  }
}
//@ chunk-n44f9pt7.js:5809-5921 placement
function isRegularFileOnWindows(path, allowAbsent, platform = "linux") {
  if (platform !== "win32") return true;
  try {
    return lstatSync(path).isFile();
  } catch (error) {
    return allowAbsent && getErrnoCode(error) === "ENOENT";
  }
}
//@ chunk-n44f9pt7.js:5921-6355 placement
async function openReadNoFollow(path, skipNoFollow = false) {
  if (!skipNoFollow && !(await isWindowsTargetOk(path, true)))
    return {
      kind: "unavailable",
    };
  let handle;
  try {
    handle = await open(path, constants.O_RDONLY | (skipNoFollow ? 0 : constants.O_NOFOLLOW) | O_NONBLOCK);
  } catch (error) {
    return getErrnoCode(error) === "ENOENT"
      ? {
          kind: "absent",
        }
      : {
          kind: "unavailable",
        };
  }
  try {
    let stats = await handle.stat();
    if (!stats.isFile() || stats.size > MAX_COPY_BYTES)
      return {
        kind: "unavailable",
      };
    return {
      kind: "snapshot",
      bytes: new Uint8Array(await handle.readFile()),
      mode: stats.mode & 4095,
    };
  } catch {
    return {
      kind: "unavailable",
    };
  } finally {
    await handle.close().catch(() => {});
  }
}
//@ chunk-n44f9pt7.js:6355-6724 placement
async function writeNoFollow(path, snapshot, skipNoFollow = false) {
  if (!skipNoFollow && !(await isWindowsTargetOk(path, true))) return false;
  let handle;
  try {
    handle = await open(
      path,
      constants.O_WRONLY |
        constants.O_CREAT |
        constants.O_TRUNC |
        (skipNoFollow ? 0 : constants.O_NOFOLLOW) |
        O_NONBLOCK,
      snapshot.mode,
    );
  } catch {
    return false;
  }
  try {
    if (!(await handle.stat()).isFile()) {
      await handle.close().catch(() => {});
      return false;
    }
    await handle.writeFile(snapshot.bytes);
    await handle.chmod(snapshot.mode).catch(() => {});
    await handle.close();
    return true;
  } catch {
    await handle.close().catch(() => {});
    return false;
  }
}
//@ chunk-n44f9pt7.js:6724-6935 placement
/**
 * 异步判定文件是否仍是同一快照（大小/ESTALE/字节比对），供原子发布写入读回。
 */
async function targetReplacedAfterInPlaceWriteFailed(path, statBefore, chunkBuf, error) {
  try {
    let statNow = await lstat(path, {
      bigint: true,
    });
    if (!statNow.isFile()) return false;
    if (didInodeChange(statNow, statBefore)) return true;
    if (getErrnoCode(error) !== "ESTALE") return false;
    let readNoFollow = await openReadNoFollow(path);
    return readNoFollow.kind === "snapshot" && !resolveMetadataBuf(readNoFollow.bytes, chunkBuf);
  } catch {
    return false;
  }
}
//@ chunk-n44f9pt7.js:6935-7128 placement
/**
 * OHs 的同步版。
 */
function targetReplacedAfterInPlaceWriteFailedSync(path, statBefore, chunkBuf, writeError) {
  try {
    let statNow = lstatSync(path, {
      bigint: true,
    });
    if (!statNow.isFile()) return false;
    if (didInodeChange(statNow, statBefore)) return true;
    if (getErrnoCode(writeError) !== "ESTALE") return false;
    let readNoFollow = openReadNoFollowSync(path);
    return readNoFollow.kind === "snapshot" && !resolveMetadataBuf(readNoFollow.bytes, chunkBuf);
  } catch {
    return false;
  }
}
//@ chunk-n44f9pt7.js:7260-7479 affinity
var TARGET_OUTCOME_TEXT = {
  restored: "original target restored",
  removed: "partial target removed",
  partial: "target left partial \u2014 treat contents as torn",
  untouched: "target untouched",
  replaced: "another writer's file left at the target",
};
//@ chunk-n44f9pt7.js:7479-7692 placement
function annotateWriteError(error, preservedPath, targetOutcome) {
  try {
    if (error instanceof Error) {
      error.message = `${error.message}; ${preservedPath !== undefined ? `new contents preserved at ${preservedPath}; ` : ""}${TARGET_OUTCOME_TEXT[targetOutcome]}`;
      Object.assign(error, {
        ...(preservedPath !== undefined && {
          preservedTmp: preservedPath,
        }),
        targetOutcome,
      });
    }
  } catch {}
  return error;
}
//@ chunk-n44f9pt7.js:7692-7780 placement
function isUnsupportedFlagError(error) {
  let errnoCode = getErrnoCode(error);
  return errnoCode === "EINVAL" || errnoCode === "ENOTSUP" || errnoCode === "EPERM" || errnoCode === "ENOSYS";
}
//@ chunk-n44f9pt7.js:7780-7872 layout
async function syncHandleForGivingUp(handle, forgiveEbadf) {
  try {
    await handle.sync();
  } catch (error) {
    if (!isUnsupportedFlagError(error) && !(forgiveEbadf && getErrnoCode(error) === "EBADF")) throw error;
  }
}
//@ chunk-n44f9pt7.js:7872-8029 placement
class PublishRefusedError extends Error {
  target;
  constructor(target) {
    super("beforePublish refused the write; nothing was published");
    this.target = target;
    this.name = "PublishRefusedError";
  }
}
//@ chunk-n44f9pt7.js:8029-8304 placement (2.1.88 match: isFsInaccessible, 0.816)
async function isFsInaccessible(filePath, dirPath) {
  if (dirPath === undefined) return filePath;
  try {
    await (await open(dirPath, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW)).close();
  } catch (error) {
    switch (getErrnoCode(error)) {
      case "ENOENT":
      case "ELOOP":
      case "ENOTDIR":
        return filePath;
      case "EACCES":
      case "EPERM":
        if (await isOwnedByOtherUser(dirPath)) return filePath;
        throw error;
      default:
        throw error;
    }
  }
  return join(dirPath, basename(filePath));
}
//@ chunk-n44f9pt7.js:8304-8420 placement
async function isOwnedByOtherUser(dirPath) {
  let uid = process.getuid?.();
  if (uid === undefined) return false;
  try {
    return (await lstat(dirPath)).uid !== uid;
  } catch {
    return false;
  }
}
//@ chunk-n44f9pt7.js:8420-8428 placement
/**
 * 原子发布重命名的尝试次数（3）。
 */
var MAX_PUBLISH_RENAME_ATTEMPTS = 3;
//@ chunk-n44f9pt7.js:8428-8546 placement (2.1.88 match: getUnameSR, 0.793)
async function getUnameSR(path, platform) {
  if (platform !== "win32") return false;
  try {
    await lstat(path);
    return true;
  } catch (error) {
    return getErrnoCode(error) === "ENOENT"
      ? false
      : {
          cause: error,
        };
  }
}
//@ chunk-n44f9pt7.js:8546-8721 placement
function exclusiveCreateTakenError(path, unameSR) {
  return Object.assign(
    Error(
      "EEXIST: name already taken (exclusive create)",
      typeof unameSR === "object"
        ? {
            cause: unameSR.cause,
          }
        : undefined,
    ),
    {
      code: "EEXIST",
      syscall: "lstat",
      path,
    },
  );
}
//@ chunk-n44f9pt7.js:8721-8906 placement (2.1.88 match: tryCreateExclusive, 0.781)
async function tryCreateExclusive(targetPath, platform, createTemp) {
  for (let idx = 1; ; idx++) {
    let path = makeTempSiblingPath(targetPath);
    let unameSR = await getUnameSR(path, platform);
    if (unameSR !== false) {
      if (idx < MAX_PUBLISH_RENAME_ATTEMPTS) continue;
      throw exclusiveCreateTakenError(path, unameSR);
    }
    try {
      return await createTemp(path);
    } catch (error) {
      if (getErrnoCode(error) === "EEXIST" && idx < MAX_PUBLISH_RENAME_ATTEMPTS) continue;
      throw error;
    }
  }
}
//@ chunk-n44f9pt7.js:8906-9092 placement (2.1.88 match: writeIfMissing, 0.817)
/**
 * 原子方式只在文件不存在时写入（wx 标志，失败清理临时文件）。
 */
async function writeIfMissing(targetPath, content, mode, platform = "linux") {
  return tryCreateExclusive(targetPath, platform, async (tempPath) => {
    try {
      await writeFile(tempPath, content, {
        encoding: "utf8",
        mode,
        flag: "wx",
      });
      return tempPath;
    } catch (error) {
      if (getErrnoCode(error) !== "EEXIST") await unlink(tempPath).catch(() => {});
      throw error;
    }
  });
}
//@ chunk-n44f9pt7.js:9092-9142 placement
/**
 * 复制文件时使用的独占、非阻塞、非精确模式标志。
 */
var COPY_EXCLUSIVE_FLAGS = {
  exclusive: true,
  exactMode: false,
  nonBlocking: true,
};
//@ chunk-n44f9pt7.js:9142-9296 placement
async function copyIntoTemp(sourcePath, targetPath, platform = "linux") {
  return tryCreateExclusive(targetPath, platform, async (tempPath) => {
    try {
      await copyFileNoFollow(sourcePath, tempPath, COPY_EXCLUSIVE_FLAGS);
      return tempPath;
    } catch (error) {
      if (getErrnoCode(error) !== "EEXIST") await unlink(tempPath).catch(() => {});
      throw error;
    }
  });
}
//@ chunk-n44f9pt7.js:9296-9427 placement
async function createExclusiveTemp(targetPath, mode, platform = "linux") {
  return tryCreateExclusive(targetPath, platform, async (tempPath) => ({
    fh: await open(
      tempPath,
      platform === "win32" ? "wx" : constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL,
      mode,
    ),
    tmp: tempPath,
  }));
}
//@ chunk-n44f9pt7.js:9427-9525 placement
async function writeNewFile(path, content, mode, platform = "linux") {
  await assertPathSafeAsync(path, platform);
  await writeFile(path, content, {
    encoding: "utf8",
    mode,
    flag: "wx",
  });
}
//@ chunk-n44f9pt7.js:9525-9591 placement (2.1.88 match: chordToDisplayString, 1)
async function assertSafeThenWrite(sourcePath, platform, platform_2 = "linux") {
  await assertPathSafeAsync(platform, platform_2);
  await copyFileNoFollow(sourcePath, platform, COPY_EXCLUSIVE_FLAGS);
}
//@ chunk-n44f9pt7.js:9591-9689 placement (2.1.88 match: chordToDisplayString, 1)
async function assertPathSafeAsync(chord, platform = "linux") {
  let unameSR = await getUnameSR(chord, platform);
  if (unameSR === true) throw exclusiveCreateTakenError(chord, unameSR);
  if (unameSR !== false) throw unameSR.cause;
}
//@ chunk-n44f9pt7.js:9689-9748 layout
function markMountPoint(path) {
  if (isAbsolute(path) && !path.startsWith("/proc/")) mountPointCache.add(path);
}
//@ chunk-n44f9pt7.js:9748-9777 layout
function unmarkMountPoint(path) {
  mountPointCache.delete(path);
}
//@ chunk-n44f9pt7.js:9777-9879 layout
function isBusyButCopyable(error, tempPath, targetPath, skipMountCheck) {
  if (
    getErrnoCode(error) !== "EBUSY" ||
    dirname(tempPath) !== dirname(targetPath) ||
    mountPointCache.has(targetPath)
  )
    return false;
  if (skipMountCheck) {
    markMountPoint(targetPath);
    return false;
  }
  return true;
}
//@ chunk-n44f9pt7.js:9879-9956 layout
function mountsListTarget(mountsText, targetPath) {
  return mountsText
    .split(
      `
`,
    )
    .some((line) => unescapeMountField(line.split(" ")[1] ?? "") === targetPath);
}
//@ chunk-n44f9pt7.js:9956-10405 layout
async function fallBackToCopyAsync(error, busyError, tempPath, targetPath) {
  if (!isBusyButCopyable(error, busyError, tempPath, targetPath)) return false;
  try {
    if ((await fsPromisesModule.statfs(dirname(tempPath))).type !== SQUASHFS_MAGIC) return false;
  } catch {
    return false;
  }
  let skipMountCheck = false;
  try {
    let handle = await open(MOUNTS_PATH, constants.O_RDONLY | READ_LIMITS);
    try {
      let buffer = Buffer.allocUnsafe(MOUNTS_BUFFER_BYTES);
      let readBytes = 0;
      while (readBytes < buffer.length) {
        let { bytesRead } = await handle.read(buffer, readBytes, buffer.length - readBytes, null);
        if (bytesRead === 0) break;
        readBytes += bytesRead;
      }
      let resolvedTarget = join(await realpath(dirname(tempPath)), basename(tempPath));
      skipMountCheck = mountsListTarget(buffer.toString("utf8", 0, readBytes), resolvedTarget);
    } finally {
      await handle.close();
    }
  } catch {}
  if (skipMountCheck) {
    markMountPoint(tempPath);
    return false;
  }
  await unlink(busyError).catch(() => {});
  await sleep(UNLINK_RETRY_DELAY_MS);
  return true;
}
//@ chunk-n44f9pt7.js:10405-10467 placement
async function writeFileAtomic(targetPath, content, mode, renameFn) {
  return filePath(targetPath, content, {
    mode,
    renameFn,
  });
}
//@ chunk-n44f9pt7.js:10467-10506 layout
function filePath(content, mode, renameFn) {
  return publishTarget(content, mode, renameFn, false);
}
//@ chunk-n44f9pt7.js:10506-12806 layout
async function publishTarget(content, options, forceSync, createMode) {
  let {
    mode,
    createMode: createMode_2,
    exactMode,
    flush,
    flushForgivesEbadf,
    followSymlinks,
    inPlaceOnTempCreateRefused,
    stagingDir,
    renameFn,
    beforePublish,
  } = forceSync;
  let chmodMode = mode ?? createMode_2;
  let assertNotRefused = () => {
    if (beforePublish !== undefined && !beforePublish()) throw new PublishRefusedError(content);
  };
  let targetPath = await isFsInaccessible(content, stagingDir);
  let O_NOFOLLOW = followSymlinks === true ? 0 : constants.O_NOFOLLOW;
  let openFlags;
  let writeFailed = false;
  let renamed = false;
  let readResult = async (snapshot) => {
    let readNoFollow = await openReadNoFollow(content, followSymlinks === true);
    let snapshot_2 = readNoFollow.kind === "snapshot" ? readNoFollow : undefined;
    assertNotRefused();
    let handle = await open(
      content,
      constants.O_WRONLY | constants.O_CREAT | O_NOFOLLOW | O_NONBLOCK,
      exactMode ?? chmodMode,
    );
    let stats;
    try {
      stats = await handle.stat({
        bigint: true,
      });
    } catch (error) {
      await handle.close().catch(() => {});
      writeFailed = snapshot !== undefined;
      throw annotateWriteError(error, snapshot, "untouched");
    }
    let isCharDevice = stats.isCharacterDevice();
    if (!stats.isFile() && !isCharDevice) {
      await handle.close().catch(() => {});
      throw Object.assign(Error("refusing the in-place arm on a non-regular target"), {
        code: "ENXIO",
        path: content,
      });
    }
    if (!isCharDevice && stats.nlink > 1n && isInPlaceWriteDefault()) {
      await handle.close().catch(() => {});
      throw hardlinkedRefusalError(content, Number(stats.nlink));
    }
    if (beforePublish !== undefined && !beforePublish()) {
      await handle.close().catch(() => {});
      if (readNoFollow.kind === "absent" && stats.size === 0n && !isCharDevice)
        await unlink(content).catch(() => {});
      throw new PublishRefusedError(content);
    }
    let truncated = false;
    try {
      if (!isCharDevice) {
        await handle.truncate(0);
        truncated = true;
      }
      await handle.writeFile(options, {
        encoding: "utf8",
      });
      let modeToApply = isCharDevice
        ? undefined
        : (exactMode ?? (readNoFollow.kind !== "absent" ? mode : undefined));
      if (modeToApply !== undefined) await handle.chmod(modeToApply).catch(() => {});
      if (flush === true) await syncHandleForGivingUp(handle, flushForgivesEbadf === true);
      await handle.close();
    } catch (error) {
      let writeError =
        truncated && (await targetReplacedAfterInPlaceWriteFailed(content, stats, options, error));
      await handle.close().catch(() => {});
      if (!truncated) {
        writeFailed = snapshot !== undefined;
        throw annotateWriteError(error, snapshot, "untouched");
      }
      writeFailed = snapshot !== undefined;
      if (writeError) throw annotateWriteError(error, snapshot, "replaced");
      let targetOutcome =
        snapshot_2 !== undefined && (await writeNoFollow(content, snapshot_2, followSymlinks === true))
          ? "restored"
          : (await unlink(content).then(
                () => true,
                (error) => getErrnoCode(error) === "ENOENT",
              ))
            ? "removed"
            : "partial";
      throw annotateWriteError(error, snapshot, targetOutcome);
    }
    let stagingToUnlink = snapshot ?? openFlags;
    if (stagingToUnlink !== undefined) await unlink(stagingToUnlink).catch(() => {});
  };
  try {
    try {
      if (exactMode !== undefined || flush === true) {
        let exclusiveTemp = await createExclusiveTemp(targetPath, exactMode ?? chmodMode);
        let fh = exclusiveTemp.fh;
        openFlags = exclusiveTemp.tmp;
        let stagingFile = false;
        let staged;
        try {
          await fh.writeFile(options, {
            encoding: "utf8",
          });
          if (exactMode !== undefined)
            try {
              await fh.chmod(exactMode);
            } catch (error) {
              if (!isUnsupportedFlagError(error)) throw error;
            }
          if (flush === true) await syncHandleForGivingUp(fh, flushForgivesEbadf === true);
        } catch (error) {
          stagingFile = true;
          staged = error;
        }
        if (!stagingFile) renamed = true;
        try {
          await fh.close();
        } catch (error) {
          if (!stagingFile) {
            writeFailed = true;
            throw annotateWriteError(error, openFlags, "untouched");
          }
        }
        if (stagingFile) throw staged;
      } else {
        openFlags = await writeIfMissing(targetPath, options, chmodMode);
        renamed = true;
      }
    } catch (error) {
      if (inPlaceOnTempCreateRefused !== true) throw error;
      if (renamed) throw error;
      if (getErrnoCode(error) !== "EACCES") throw error;
      if (
        !(await stat(content).then(
          () => true,
          () => false,
        ))
      )
        throw error;
      await readResult(undefined);
      return;
    }
    if (openFlags === undefined) throw Error("staging block exited without a staging file");
    let stagingPath = openFlags;
    try {
      let renameImpl = renameFn ?? rename;
      await retryFsOp(stagingPath, content, (errnoCode, fallBackToCopy) => {
        assertNotRefused();
        return renameImpl(errnoCode, fallBackToCopy);
      });
      unmarkMountPoint(content);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (
        errnoCode === undefined ||
        !(ATOMIC_WRITE_ERRNOS.has(errnoCode) || (createMode && !NO_SPACE_CODES.has(errnoCode)))
      )
        throw error;
      if (await fallBackToCopyAsync(error, stagingPath, content, createMode)) {
        openFlags = undefined;
        await publishTarget(content, options, forceSync, true);
        return;
      }
      await readResult(stagingPath);
    }
  } catch (error) {
    if (openFlags !== undefined && !writeFailed) await unlink(openFlags).catch(() => {});
    throw error;
  }
}
//@ chunk-n44f9pt7.js:12806-12838 placement
/**
 * 删除文件并吞掉所有错误。
 */
function unlinkIgnoringErrors(path) {
  try {
    unlinkSync(path);
  } catch {}
}
//@ chunk-n44f9pt7.js:12838-13210 layout
function fallBackToCopySync(error, syncError, tempPath, targetPath) {
  if (!isBusyButCopyable(error, syncError, tempPath, targetPath)) return false;
  try {
    if (fsModule.statfsSync(dirname(tempPath)).type !== SQUASHFS_MAGIC) return false;
  } catch {
    return false;
  }
  let skipMountCheck = false;
  try {
    let handle = openSync(MOUNTS_PATH, constants.O_RDONLY | READ_LIMITS);
    try {
      let buffer = Buffer.allocUnsafe(MOUNTS_BUFFER_BYTES);
      let readBytes = 0;
      while (readBytes < buffer.length) {
        let resolvedTarget = readSync(handle, buffer, readBytes, buffer.length - readBytes, null);
        if (resolvedTarget === 0) break;
        readBytes += resolvedTarget;
      }
      let retrying = join(realpathSync(dirname(tempPath)), basename(tempPath));
      skipMountCheck = mountsListTarget(buffer.toString("utf8", 0, readBytes), retrying);
    } finally {
      closeSync(handle);
    }
  } catch {}
  if (skipMountCheck) {
    markMountPoint(tempPath);
    return false;
  }
  unlinkIgnoringErrors(syncError);
  sleepSync(UNLINK_RETRY_DELAY_MS);
  return true;
}
//@ chunk-n44f9pt7.js:13210-13575 placement
function openReadNoFollowSync(path) {
  if (!isRegularFileOnWindows(path, true))
    return {
      kind: "unavailable",
    };
  let fd;
  try {
    fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | O_NONBLOCK);
  } catch (error) {
    return getErrnoCode(error) === "ENOENT"
      ? {
          kind: "absent",
        }
      : {
          kind: "unavailable",
        };
  }
  try {
    let stats = fstatSync(fd);
    if (!stats.isFile() || stats.size > MAX_COPY_BYTES)
      return {
        kind: "unavailable",
      };
    return {
      kind: "snapshot",
      bytes: new Uint8Array(readFileSync(fd)),
      mode: stats.mode & 4095,
    };
  } catch {
    return {
      kind: "unavailable",
    };
  } finally {
    try {
      closeSync(fd);
    } catch {}
  }
}
//@ chunk-n44f9pt7.js:13575-13847 placement
function writeNoFollowSync(path, snapshot) {
  if (!isRegularFileOnWindows(path, true)) return false;
  let fd;
  try {
    fd = openSync(
      path,
      constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | constants.O_NOFOLLOW | O_NONBLOCK,
      snapshot.mode,
    );
  } catch {
    return false;
  }
  let closed = false;
  try {
    if (!fstatSync(fd).isFile()) {
      closed = true;
      closeSync(fd);
      return false;
    }
    writeFileSync(fd, snapshot.bytes);
    try {
      fchmodSync(fd, snapshot.mode);
    } catch {}
    closed = true;
    closeSync(fd);
    return true;
  } catch {
    if (!closed)
      try {
        closeSync(fd);
      } catch {}
    return false;
  }
}
//@ chunk-n44f9pt7.js:13847-13953 placement (2.1.88 match: getUnameSR, 0.793)
function getUnameSR_2(path, platform) {
  if (platform !== "win32") return false;
  try {
    lstatSync(path);
    return true;
  } catch (error) {
    return getErrnoCode(error) === "ENOENT"
      ? false
      : {
          cause: error,
        };
  }
}
//@ chunk-n44f9pt7.js:13953-14040 placement (2.1.88 match: chordToDisplayString, 1)
function assertPathSafeSync(chord, platform = "linux") {
  let unameSR = getUnameSR_2(chord, platform);
  if (unameSR === true) throw exclusiveCreateTakenError(chord, unameSR);
  if (unameSR !== false) throw unameSR.cause;
}
//@ chunk-n44f9pt7.js:14040-14272 placement (2.1.88 match: writeIfMissing, 0.817)
function writeIfMissing_2(targetPath, content, mode, platform = "linux") {
  for (let attempt = 1; ; attempt++) {
    let path = makeTempSiblingPath(targetPath);
    let unameSR = getUnameSR_2(path, platform);
    if (unameSR !== false) {
      if (attempt < MAX_PUBLISH_RENAME_ATTEMPTS) continue;
      throw exclusiveCreateTakenError(path, unameSR);
    }
    try {
      writeFileSync(path, content, {
        encoding: "utf8",
        mode,
        flag: "wx",
      });
      return path;
    } catch (error) {
      if (getErrnoCode(error) === "EEXIST") {
        if (attempt < MAX_PUBLISH_RENAME_ATTEMPTS) continue;
        throw error;
      }
      unlinkIgnoringErrors(path);
      throw error;
    }
  }
}
//@ chunk-n44f9pt7.js:14272-14308 placement
function syncTarget(content, mode, renameFn, forceSync) {
  atomicReplaceFile(content, mode, renameFn, forceSync, false);
}
//@ chunk-n44f9pt7.js:14308-15352 affinity
function atomicReplaceFile(targetPath, content, mode, operation, tempPath) {
  let data = false;
  let stagingPath;
  try {
    stagingPath = writeIfMissing_2(targetPath, content, mode);
    try {
      retryFsOpSync(stagingPath, targetPath, operation);
      unmarkMountPoint(targetPath);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (
        errnoCode === undefined ||
        !(ATOMIC_WRITE_ERRNOS.has(errnoCode) || (tempPath && !NO_SPACE_CODES.has(errnoCode)))
      )
        throw error;
      if (fallBackToCopySync(error, stagingPath, targetPath, tempPath)) {
        stagingPath = undefined;
        atomicReplaceFile(targetPath, content, mode, operation, true);
        return;
      }
      let readNoFollow = openReadNoFollowSync(targetPath);
      let snapshot = readNoFollow.kind === "snapshot" ? readNoFollow : undefined;
      let inPlaceMode = openSync(
        targetPath,
        constants.O_WRONLY | constants.O_CREAT | constants.O_NOFOLLOW | O_NONBLOCK,
        mode,
      );
      let stagingKept = false;
      let failureCode;
      {
        try {
          failureCode = fstatSync(inPlaceMode, {
            bigint: true,
          });
        } catch (error) {
          try {
            closeSync(inPlaceMode);
          } catch {}
          data = true;
          throw annotateWriteError(error, stagingPath, "untouched");
        }
        stagingKept = failureCode.isCharacterDevice();
        if (!failureCode.isFile() && !stagingKept) {
          try {
            closeSync(inPlaceMode);
          } catch {}
          throw Object.assign(Error("refusing the in-place arm on a non-regular target"), {
            code: "ENXIO",
            path: targetPath,
          });
        }
        if (!stagingKept && failureCode.nlink > 1n && isInPlaceWriteDefault()) {
          try {
            closeSync(inPlaceMode);
          } catch {}
          throw hardlinkedRefusalError(targetPath, Number(failureCode.nlink));
        }
      }
      let readResult = false;
      let priorSnapshot = false;
      try {
        if (!stagingKept) {
          ftruncateSync(inPlaceMode, 0);
          priorSnapshot = true;
        }
        writeFileSync(inPlaceMode, content, {
          encoding: "utf8",
        });
        if (mode !== undefined && readNoFollow.kind !== "absent" && !stagingKept)
          try {
            fchmodSync(inPlaceMode, mode);
          } catch {}
        readResult = true;
        closeSync(inPlaceMode);
      } catch (error) {
        let handle =
          priorSnapshot && targetReplacedAfterInPlaceWriteFailedSync(targetPath, failureCode, content, error);
        if (!readResult)
          try {
            closeSync(inPlaceMode);
          } catch {}
        if (!priorSnapshot) {
          data = true;
          throw annotateWriteError(error, stagingPath, "untouched");
        }
        data = true;
        if (handle) throw annotateWriteError(error, stagingPath, "replaced");
        let isCharDevice = snapshot !== undefined && writeNoFollowSync(targetPath, snapshot);
        let written = "partial";
        if (isCharDevice) written = "restored";
        else
          try {
            unlinkSync(targetPath);
            written = "removed";
          } catch (error) {
            written = getErrnoCode(error) === "ENOENT" ? "removed" : "partial";
          }
        throw annotateWriteError(error, stagingPath, written);
      }
      unlinkIgnoringErrors(stagingPath);
    }
  } catch (error) {
    if (stagingPath !== undefined && !data) unlinkIgnoringErrors(stagingPath);
    throw error;
  }
}
export {
  writeFileAtomic,
  retryFsOp,
  O_NONBLOCK,
  writeIfMissing,
  assertPathSafeAsync,
  writeNewFile,
  syncTarget,
  isUnsupportedFlagError,
  retryFsOpSync,
  unmarkMountPoint,
  fallBackToCopySync,
  NO_SPACE_CODES,
  assertPathSafeSync,
  targetReplacedAfterInPlaceWriteFailedSync,
  retryTransient,
  fallBackToCopyAsync,
  targetReplacedAfterInPlaceWriteFailed,
  makeTempSiblingPath,
  filePath,
  isOwnTempName,
  isTempFileName,
  copyIntoTemp,
  assertSafeThenWrite,
  DISK_FULL_CODES,
  retryFsOpLong,
  LONG_RETRY_DELAYS_MS,
  PublishRefusedError,
  checkWindowsTarget,
};
