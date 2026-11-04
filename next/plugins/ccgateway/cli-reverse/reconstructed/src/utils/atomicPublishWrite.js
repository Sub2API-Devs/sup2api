/**
 * utils/atomicPublishWrite.ts
 *
 * 2.1.316 新增：原子发布写入与瞬时错误重试
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-k176arn3.js (44)
 * attribution: placement 44
 */
import { randomBytes } from "crypto";
import { lstat, rename, open, writeFile, unlink, stat } from "fs/promises";
import {
  lstatSync,
  renameSync,
  constants,
  unlinkSync,
  openSync,
  fstatSync,
  readFileSync,
  closeSync,
  writeFileSync,
  fchmodSync,
  ftruncateSync,
} from "fs";
import { join, basename } from "path";
import { sleep } from "./sleep.js";
import { getErrnoCode } from "./errors.js";
import {
  copyFileNoFollow,
  isInPlaceWriteDefault,
  hardlinkedRefusalError,
  ATOMIC_WRITE_ERRNOS,
} from "./plugins/safeCopy.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-k176arn3.js:3097-3154 placement (2.1.88 match: atomicWriteToZipCache, 0.651)
/**
 * 生成 <路径>.tmp.<随机> 临时文件名。
 */
function makeTempSiblingPath(targetPath) {
  return `${targetPath}.tmp.${randomBytes(4).toString("hex")}`;
}
//@ chunk-k176arn3.js:3154-3253 placement
function isOwnTempName(fileName, targetPath) {
  let tempPrefix = `${targetPath}.tmp.`;
  return fileName.startsWith(tempPrefix) && /^[0-9a-f]{8}$/.test(fileName.slice(tempPrefix.length));
}
//@ chunk-k176arn3.js:3253-3327 placement
function isTempFileName(fileName) {
  return /\.tmp\.(?:[0-9a-f]{8}|\d+\.[0-9a-f]{12})$/.test(fileName);
}
//@ chunk-k176arn3.js:3327-3441 placement
/**
 * 重试的基础等待时长（50 毫秒）。
 */
var RETRY_DELAYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var RETRY_BASE_DELAY_MS;
var list;
var LONG_RETRY_DELAYS_MS;
var int32Array;
deferInit("chunk-k176arn3.js:3327", () => {
  RETRY_DELAYS = 4;
  RETRY_BASE_DELAY_MS = 50;
  list = Array.from(
    {
      length: RETRY_DELAYS - 1,
    },
    () => RETRY_BASE_DELAY_MS,
  );
  LONG_RETRY_DELAYS_MS = [100, 500, 2000];
  int32Array = new Int32Array(new SharedArrayBuffer(4));
});
//@ chunk-k176arn3.js:3441-3479 placement
/**
 * 同步等待给定毫秒（Atomics.wait）。
 */
function sleepSync(ms) {
  Atomics.wait(int32Array, 0, 0, ms);
}
//@ chunk-k176arn3.js:3479-3512 placement
/**
 * 判断错误是否可重试（当前恒返回 false）。
 */
function isRetryableError(error, targetPath, delayCount = RETRY_DELAYS - 1) {
  return false;
}
//@ chunk-k176arn3.js:3512-3523 placement
/**
 * 文件的“其他人可执行”权限位。
 */
var S_IXOTH = 128;
//@ chunk-k176arn3.js:3523-3597 placement
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
//@ chunk-k176arn3.js:3597-3783 placement
async function retryTransient(operation, targetPath, delays = list) {
  let retried = false;
  for (let idx = 0; ; idx++)
    try {
      await operation();
      return retried;
    } catch (error) {
      if (isRetryableError(error, idx, delays.length)) {
        if (idx === 0 && targetPath !== undefined && (await isNotExecutableAsync(targetPath))) throw error;
        retried = true;
        await sleep(delays[idx]);
        continue;
      }
      throw error;
    }
}
//@ chunk-k176arn3.js:3783-3828 placement
function retryFsOp(fromPath, toPath, operation = rename) {
  return retryTransient(() => operation(fromPath, toPath), toPath);
}
//@ chunk-k176arn3.js:3828-3878 placement
function retryFsOpLong(fromPath, toPath, operation = rename) {
  return retryTransient(() => operation(fromPath, toPath), toPath, LONG_RETRY_DELAYS_MS);
}
//@ chunk-k176arn3.js:3878-3938 placement
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
//@ chunk-k176arn3.js:3938-4082 placement
function retryFsOpSync(fromPath, toPath, operation = renameSync) {
  let retried = false;
  for (let idx = 0; ; idx++)
    try {
      operation(fromPath, toPath);
      return retried;
    } catch (error) {
      if (isRetryableError(error, idx)) {
        if (idx === 0 && isNotExecutableSync(toPath)) throw error;
        retried = true;
        sleepSync(RETRY_BASE_DELAY_MS);
        continue;
      }
      throw error;
    }
}
//@ chunk-k176arn3.js:4082-4162 placement
/**
 * 复制或读取文件时的大小上限（64 MiB）。
 */
var DISK_FULL_CODES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_COPY_BYTES;
var O_NONBLOCK;
deferInit("chunk-k176arn3.js:4082", () => {
  DISK_FULL_CODES = new Set(["ENOSPC", "EIO", "EDQUOT", "EFBIG"]);
  MAX_COPY_BYTES = 67108864;
  O_NONBLOCK = constants.O_NONBLOCK;
});
//@ chunk-k176arn3.js:4162-4234 placement
/**
 * 判断 Windows 写目标检查是否通过。
 */
async function isWindowsTargetOk(path, allowAbsent, platform = "linux") {
  return (await checkWindowsTarget(path, allowAbsent, platform)).kind === "pass";
}
//@ chunk-k176arn3.js:4234-4448 placement
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
//@ chunk-k176arn3.js:4448-4560 placement
function isRegularFileOnWindows(path, allowAbsent, platform = "linux") {
  if (platform !== "win32") return true;
  try {
    return lstatSync(path).isFile();
  } catch (error) {
    return allowAbsent && getErrnoCode(error) === "ENOENT";
  }
}
//@ chunk-k176arn3.js:4560-4994 placement
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
//@ chunk-k176arn3.js:4994-5363 placement
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
//@ chunk-k176arn3.js:5363-5738 placement
function annotateWriteError(error, preservedPath, targetOutcome) {
  try {
    if (error instanceof Error) {
      error.message = `${error.message}; ${preservedPath !== undefined ? `new contents preserved at ${preservedPath}; ` : ""}${targetOutcome === "restored" ? "original target restored" : targetOutcome === "removed" ? "partial target removed" : targetOutcome === "untouched" ? "target untouched" : "target left partial \u2014 treat contents as torn"}`;
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
//@ chunk-k176arn3.js:5738-5826 placement
function isUnsupportedFlagError(error) {
  let errnoCode = getErrnoCode(error);
  return errnoCode === "EINVAL" || errnoCode === "ENOTSUP" || errnoCode === "EPERM" || errnoCode === "ENOSYS";
}
//@ chunk-k176arn3.js:5826-5983 placement
class PublishRefusedError extends Error {
  target;
  constructor(target) {
    super("beforePublish refused the write; nothing was published");
    this.target = target;
    this.name = "PublishRefusedError";
  }
}
//@ chunk-k176arn3.js:5983-6260 placement (2.1.88 match: isFsInaccessible, 0.815)
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
//@ chunk-k176arn3.js:6260-6376 placement
async function isOwnedByOtherUser(dirPath) {
  let uid = process.getuid?.();
  if (uid === undefined) return false;
  try {
    return (await lstat(dirPath)).uid !== uid;
  } catch {
    return false;
  }
}
//@ chunk-k176arn3.js:6376-6384 placement
/**
 * 原子发布重命名的尝试次数（3）。
 */
var MAX_PUBLISH_RENAME_ATTEMPTS = 3;
//@ chunk-k176arn3.js:6384-6502 placement (2.1.88 match: getUnameSR, 0.793)
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
//@ chunk-k176arn3.js:6502-6677 placement
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
//@ chunk-k176arn3.js:6677-6861 placement (2.1.88 match: tryCreateExclusive, 0.782)
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
//@ chunk-k176arn3.js:6861-7046 placement (2.1.88 match: writeIfMissing, 0.817)
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
//@ chunk-k176arn3.js:7046-7096 placement
/**
 * 复制文件时使用的独占、非阻塞、非精确模式标志。
 */
var COPY_EXCLUSIVE_FLAGS = {
  exclusive: true,
  exactMode: false,
  nonBlocking: true,
};
//@ chunk-k176arn3.js:7096-7249 placement
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
//@ chunk-k176arn3.js:7249-7379 placement
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
//@ chunk-k176arn3.js:7379-7477 placement
async function writeNewFile(path, content, mode, platform = "linux") {
  await assertPathSafeAsync(path, platform);
  await writeFile(path, content, {
    encoding: "utf8",
    mode,
    flag: "wx",
  });
}
//@ chunk-k176arn3.js:7477-7543 placement (2.1.88 match: chordToDisplayString, 1)
async function assertSafeThenWrite(sourcePath, platform, platform_2 = "linux") {
  await assertPathSafeAsync(platform, platform_2);
  await copyFileNoFollow(sourcePath, platform, COPY_EXCLUSIVE_FLAGS);
}
//@ chunk-k176arn3.js:7543-7641 placement (2.1.88 match: chordToDisplayString, 1)
async function assertPathSafeAsync(chord, platform = "linux") {
  let unameSR = await getUnameSR(chord, platform);
  if (unameSR === true) throw exclusiveCreateTakenError(chord, unameSR);
  if (unameSR !== false) throw unameSR.cause;
}
//@ chunk-k176arn3.js:7641-7704 placement
async function writeFileAtomic(targetPath, content, mode, renameFn) {
  return publishWriteAtomic(targetPath, content, {
    mode,
    renameFn,
  });
}
//@ chunk-k176arn3.js:7704-9868 placement
/**
 * 原子发布写入：写临时文件、可选 fsync、按模式重命名或就地写，处理符号链接与权限。
 */
async function publishWriteAtomic(targetPath, content, options) {
  let {
    mode,
    createMode,
    exactMode,
    flush,
    followSymlinks,
    inPlaceOnTempCreateRefused,
    stagingDir,
    renameFn,
    beforePublish,
  } = options;
  let createModeResolved = mode ?? createMode;
  let assertNotRefused = () => {
    if (beforePublish !== undefined && !beforePublish()) throw new PublishRefusedError(targetPath);
  };
  let resolvedTarget = await isFsInaccessible(targetPath, stagingDir);
  let O_NOFOLLOW = followSymlinks === true ? 0 : constants.O_NOFOLLOW;
  let stagingPath;
  let stagingKept = false;
  let tempReady = false;
  let writeInPlace = async (existingStagingPath) => {
    let readNoFollow = await openReadNoFollow(targetPath, followSymlinks === true);
    let snapshot = readNoFollow.kind === "snapshot" ? readNoFollow : undefined;
    assertNotRefused();
    let handle = await open(
      targetPath,
      constants.O_WRONLY | constants.O_CREAT | O_NOFOLLOW | O_NONBLOCK,
      exactMode ?? createModeResolved,
    );
    let stats;
    try {
      stats = await handle.stat();
    } catch (error) {
      await handle.close().catch(() => {});
      stagingKept = existingStagingPath !== undefined;
      throw annotateWriteError(error, existingStagingPath, "untouched");
    }
    let isCharDevice = stats.isCharacterDevice();
    if (!stats.isFile() && !isCharDevice) {
      await handle.close().catch(() => {});
      throw Object.assign(Error("refusing the in-place arm on a non-regular target"), {
        code: "ENXIO",
        path: targetPath,
      });
    }
    if (!isCharDevice && stats.nlink > 1 && isInPlaceWriteDefault()) {
      await handle.close().catch(() => {});
      throw hardlinkedRefusalError(targetPath, stats.nlink);
    }
    if (beforePublish !== undefined && !beforePublish()) {
      await handle.close().catch(() => {});
      if (readNoFollow.kind === "absent" && stats.size === 0 && !isCharDevice)
        await unlink(targetPath).catch(() => {});
      throw new PublishRefusedError(targetPath);
    }
    let truncated = false;
    try {
      if (!isCharDevice) {
        await handle.truncate(0);
        truncated = true;
      }
      await handle.writeFile(content, {
        encoding: "utf8",
      });
      let chmodMode = isCharDevice
        ? undefined
        : (exactMode ?? (readNoFollow.kind !== "absent" ? mode : undefined));
      if (chmodMode !== undefined) await handle.chmod(chmodMode).catch(() => {});
      if (flush === true)
        try {
          await handle.sync();
        } catch (error) {
          if (!isUnsupportedFlagError(error)) throw error;
        }
      await handle.close();
    } catch (error) {
      await handle.close().catch(() => {});
      if (!truncated) {
        stagingKept = existingStagingPath !== undefined;
        throw annotateWriteError(error, existingStagingPath, "untouched");
      }
      stagingKept = existingStagingPath !== undefined;
      let targetOutcome =
        snapshot !== undefined && (await writeNoFollow(targetPath, snapshot, followSymlinks === true))
          ? "restored"
          : (await unlink(targetPath).then(
                () => true,
                (error) => getErrnoCode(error) === "ENOENT",
              ))
            ? "removed"
            : "partial";
      throw annotateWriteError(error, existingStagingPath, targetOutcome);
    }
    let stagingToUnlink = existingStagingPath ?? stagingPath;
    if (stagingToUnlink !== undefined) await unlink(stagingToUnlink).catch(() => {});
  };
  try {
    try {
      if (exactMode !== undefined || flush === true) {
        let exclusiveTemp = await createExclusiveTemp(resolvedTarget, exactMode ?? createModeResolved);
        let fh = exclusiveTemp.fh;
        stagingPath = exclusiveTemp.tmp;
        let writeFailed = false;
        let writeError;
        try {
          await fh.writeFile(content, {
            encoding: "utf8",
          });
          if (exactMode !== undefined)
            try {
              await fh.chmod(exactMode);
            } catch (error) {
              if (!isUnsupportedFlagError(error)) throw error;
            }
          if (flush === true)
            try {
              await fh.sync();
            } catch (error) {
              if (!isUnsupportedFlagError(error)) throw error;
            }
        } catch (error) {
          writeFailed = true;
          writeError = error;
        }
        if (!writeFailed) tempReady = true;
        try {
          await fh.close();
        } catch (error) {
          if (!writeFailed) {
            stagingKept = true;
            throw annotateWriteError(error, stagingPath, "untouched");
          }
        }
        if (writeFailed) throw writeError;
      } else {
        stagingPath = await writeIfMissing(resolvedTarget, content, createModeResolved);
        tempReady = true;
      }
    } catch (error) {
      if (inPlaceOnTempCreateRefused !== true) throw error;
      if (tempReady) throw error;
      if (getErrnoCode(error) !== "EACCES") throw error;
      if (
        !(await stat(targetPath).then(
          () => true,
          () => false,
        ))
      )
        throw error;
      await writeInPlace(undefined);
      return;
    }
    if (stagingPath === undefined) throw Error("staging block exited without a staging file");
    let stagingFile = stagingPath;
    try {
      let renameImpl = renameFn ?? rename;
      await retryFsOp(stagingFile, targetPath, (fromPath, toPath) => {
        assertNotRefused();
        return renameImpl(fromPath, toPath);
      });
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === undefined || !ATOMIC_WRITE_ERRNOS.has(errnoCode)) throw error;
      await writeInPlace(stagingFile);
    }
  } catch (error) {
    if (stagingPath !== undefined && !stagingKept) await unlink(stagingPath).catch(() => {});
    throw error;
  }
}
//@ chunk-k176arn3.js:9868-9900 placement
/**
 * 删除文件并吞掉所有错误。
 */
function unlinkIgnoringErrors(path) {
  try {
    unlinkSync(path);
  } catch {}
}
//@ chunk-k176arn3.js:9900-10265 placement
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
//@ chunk-k176arn3.js:10265-10537 placement
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
//@ chunk-k176arn3.js:10537-10643 placement (2.1.88 match: getUnameSR, 0.793)
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
//@ chunk-k176arn3.js:10643-10730 placement (2.1.88 match: chordToDisplayString, 1)
function assertPathSafeSync(chord, platform = "linux") {
  let unameSR = getUnameSR_2(chord, platform);
  if (unameSR === true) throw exclusiveCreateTakenError(chord, unameSR);
  if (unameSR !== false) throw unameSR.cause;
}
//@ chunk-k176arn3.js:10730-10962 placement (2.1.88 match: writeIfMissing, 0.817)
function writeIfMissing_2(targetPath, content, mode, platform = "linux") {
  for (let idx = 1; ; idx++) {
    let path = makeTempSiblingPath(targetPath);
    let unameSR = getUnameSR_2(path, platform);
    if (unameSR !== false) {
      if (idx < MAX_PUBLISH_RENAME_ATTEMPTS) continue;
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
        if (idx < MAX_PUBLISH_RENAME_ATTEMPTS) continue;
        throw error;
      }
      unlinkIgnoringErrors(path);
      throw error;
    }
  }
}
//@ chunk-k176arn3.js:10962-11863 placement
function writeAndPublishSync(targetPath, content, mode, renameFn) {
  let stagingKept = false;
  let stagingPath;
  try {
    stagingPath = writeIfMissing_2(targetPath, content, mode);
    try {
      retryFsOpSync(stagingPath, targetPath, renameFn);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === undefined || !ATOMIC_WRITE_ERRNOS.has(errnoCode)) throw error;
      let readNoFollow = openReadNoFollowSync(targetPath);
      let snapshot = readNoFollow.kind === "snapshot" ? readNoFollow : undefined;
      let fd = openSync(
        targetPath,
        constants.O_WRONLY | constants.O_CREAT | constants.O_NOFOLLOW | O_NONBLOCK,
        mode,
      );
      let isCharDevice = false;
      {
        let stats;
        try {
          stats = fstatSync(fd);
        } catch (error) {
          try {
            closeSync(fd);
          } catch {}
          stagingKept = true;
          throw annotateWriteError(error, stagingPath, "untouched");
        }
        isCharDevice = stats.isCharacterDevice();
        if (!stats.isFile() && !isCharDevice) {
          try {
            closeSync(fd);
          } catch {}
          throw Object.assign(Error("refusing the in-place arm on a non-regular target"), {
            code: "ENXIO",
            path: targetPath,
          });
        }
        if (!isCharDevice && stats.nlink > 1 && isInPlaceWriteDefault()) {
          try {
            closeSync(fd);
          } catch {}
          throw hardlinkedRefusalError(targetPath, stats.nlink);
        }
      }
      let written = false;
      let truncated = false;
      try {
        if (!isCharDevice) {
          ftruncateSync(fd, 0);
          truncated = true;
        }
        writeFileSync(fd, content, {
          encoding: "utf8",
        });
        if (mode !== undefined && readNoFollow.kind !== "absent" && !isCharDevice)
          try {
            fchmodSync(fd, mode);
          } catch {}
        written = true;
        closeSync(fd);
      } catch (error) {
        if (!written)
          try {
            closeSync(fd);
          } catch {}
        if (!truncated) {
          stagingKept = true;
          throw annotateWriteError(error, stagingPath, "untouched");
        }
        stagingKept = true;
        let restored = snapshot !== undefined && writeNoFollowSync(targetPath, snapshot);
        let targetOutcome = "partial";
        if (restored) targetOutcome = "restored";
        else
          try {
            unlinkSync(targetPath);
            targetOutcome = "removed";
          } catch (error) {
            targetOutcome = getErrnoCode(error) === "ENOENT" ? "removed" : "partial";
          }
        throw annotateWriteError(error, stagingPath, targetOutcome);
      }
      unlinkIgnoringErrors(stagingPath);
    }
  } catch (error) {
    if (stagingPath !== undefined && !stagingKept) unlinkIgnoringErrors(stagingPath);
    throw error;
  }
}
export {
  makeTempSiblingPath,
  retryFsOp,
  isOwnTempName,
  writeFileAtomic,
  O_NONBLOCK,
  writeIfMissing,
  assertPathSafeAsync,
  writeNewFile,
  retryFsOpSync,
  publishWriteAtomic,
  isTempFileName,
  retryTransient,
  writeAndPublishSync,
  DISK_FULL_CODES,
  isUnsupportedFlagError,
  assertPathSafeSync,
  copyIntoTemp,
  assertSafeThenWrite,
  checkWindowsTarget,
  retryFsOpLong,
  LONG_RETRY_DELAYS_MS,
  PublishRefusedError,
};
