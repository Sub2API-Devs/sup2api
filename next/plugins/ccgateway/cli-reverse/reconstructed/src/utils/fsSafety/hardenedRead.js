/**
 * utils/fsSafety/hardenedRead.ts
 *
 * 2.1.316 新增：核对链接目标未变；通过 /proc/self/fd 核对打开的路径等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-85eyj5gy.js (26)
 * attribution: placement 26
 */
import { lstat, open, readlink, realpath, link, stat, unlink } from "fs/promises";
import { constants } from "fs";
import { dirname } from "path";
import { getErrnoCode } from "../errors.js";
import { ok, err } from "../resultError.js";
import { NOFOLLOW_NONBLOCK_FLAGS } from "../fsFlags.js";
import {
  OTHERNAMES,
  LEAFMOVED,
  HARDENINGUNAVAILABLE,
  unavailableStorageError,
} from "../storage/storageErrors.js";
import { HostScoped } from "../hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { logForDebugging } from "../debug.js";
import { isSentinelInode } from "../slowOperations.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-85eyj5gy.js:21511-21624 placement
/**
 * 视为“不存在”的错误码与视为暂时性资源不足的错误码。
 */
var ABSENT_ERRNO_CODES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var TRANSIENT_ERRNO_CODES;
deferInit("chunk-85eyj5gy.js:21511", () => {
  ABSENT_ERRNO_CODES = new Set(["ENOENT", "ENOTDIR"]);
  TRANSIENT_ERRNO_CODES = new Set(["EAGAIN", "EBUSY", "EMFILE", "ENFILE", "ENOSPC", "EDQUOT", "ENOMEM"]);
});
//@ chunk-85eyj5gy.js:21624-21679 placement
function isAbsentError(error) {
  let errnoCode = getErrnoCode(error);
  return errnoCode !== undefined && ABSENT_ERRNO_CODES.has(errnoCode);
}
//@ chunk-85eyj5gy.js:21679-21713 placement
/**
 * 判断错误的 errno 码是否等于给定值。
 */
function isErrnoCode(error, code) {
  return getErrnoCode(error) === code;
}
//@ chunk-85eyj5gy.js:21713-21769 placement
/**
 * 判断错误是否为可重试的瞬态 errno。
 */
function isTransientError(error) {
  let errnoCode = getErrnoCode(error);
  return errnoCode !== undefined && TRANSIENT_ERRNO_CODES.has(errnoCode);
}
//@ chunk-85eyj5gy.js:21769-21833 placement
function classifyReadError(error) {
  return isAbsentError(error)
    ? {
        kind: "absent",
      }
    : {
        kind: "fs",
        error,
      };
}
//@ chunk-85eyj5gy.js:21833-21899 placement
/**
 * 把读取错误归一为标签（文件系统 errno 或 absent/unavailable 等 kind）。
 */
function errorKindLabel(error) {
  return error.kind === "fs" ? (getErrnoCode(error.error) ?? "unknown") : error.kind;
}
//@ chunk-85eyj5gy.js:21899-21969 placement
async function captureAsyncResult(produce) {
  try {
    return ok(await produce);
  } catch (error) {
    return err(classifyReadError(error));
  }
}
//@ chunk-85eyj5gy.js:21969-21981 placement
/**
 * 打开文件时的默认缓冲区字节数。
 */
var DEFAULT_OPEN_BUFFER_BYTES = 384;
//@ chunk-85eyj5gy.js:21981-22160 placement
/**
 * 先 lstat 确认是普通文件，再以 O_NOFOLLOW 打开。
 */
async function openFileNoFollow(filePath, flags, bufferBytes = DEFAULT_OPEN_BUFFER_BYTES) {
  let statResult = await captureAsyncResult(lstat(filePath));
  if (!statResult.ok && statResult.error.kind !== "absent") return err(statResult.error);
  if (statResult.ok && !statResult.value.isFile()) return err(refusedFsError(filePath, statResult.value));
  return captureAsyncResult(open(filePath, flags | NOFOLLOW_NONBLOCK_FLAGS, bufferBytes));
}
//@ chunk-85eyj5gy.js:22160-22260 placement
/**
 * 以不跟随链接方式打开文件。
 */
async function openNoFollow_2(filePath) {
  if (NOFOLLOW_NONBLOCK_FLAGS === 0) return openFileNoFollow(filePath, constants.O_RDONLY);
  return mapLoopToNoFollowError(
    filePath,
    await captureAsyncResult(open(filePath, constants.O_RDONLY | NOFOLLOW_NONBLOCK_FLAGS)),
  );
}
//@ chunk-85eyj5gy.js:22260-22376 placement
/**
 * 打开结果为 ELOOP 时改写为针对该路径的 ELOOP 错误。
 */
function mapLoopToNoFollowError(path, result) {
  return !result.ok && result.error.kind === "fs" && isErrnoCode(result.error.error, "ELOOP")
    ? err({
        kind: "fs",
        error: withCodeAndPath(path, "ELOOP"),
      })
    : result;
}
//@ chunk-85eyj5gy.js:22376-22437 placement
function withCodeAndPath(path, code) {
  return Object.assign(refusalError(code), {
    code,
    path,
  });
}
//@ chunk-85eyj5gy.js:22437-22519 placement
function refusedFsError(path, stats) {
  return {
    kind: "fs",
    error: withCodeAndPath(path, stats.isSymbolicLink() ? "ELOOP" : "ENXIO"),
  };
}
//@ chunk-85eyj5gy.js:22519-23091 placement
/**
 * 按 errno 生成拒绝读取的错误。
 */
function refusalError(code) {
  switch (code) {
    case "ELOOP":
      return Error("refusing a symlinked path");
    case "ENXIO":
      return Error("refusing a non-regular file");
    case "EISDIR":
      return Error("refusing a directory at the leaf");
    case "ENOTDIR":
      return Error("refusing a non-directory node on a write path");
    case "EFBIG":
      return Error("refusing a file over the size cap");
    case OTHERNAMES:
      return Error("refusing a value that has a second name (hard link)");
    case LEAFMOVED:
      return Error("refusing a value whose opened object is no longer at its key");
    case HARDENINGUNAVAILABLE:
      return Error("refusing a hardened read the host cannot verify");
  }
}
//@ chunk-85eyj5gy.js:23091-23841 placement
/**
 * 通过 /proc/self/fd 核对打开的路径。
 */
async function verifyOpenedPath(handle, filePath) {
  let procFdAvailable = await isProcFdAvailable();
  if (!procFdAvailable.ok) return procFdAvailable;
  if (procFdAvailable.value) {
    let fdPath = await captureAsyncResult(readlink(`/proc/self/fd/${handle.fd}`));
    if (fdPath.ok) return ok(!fdPath.value.endsWith(" (deleted)") && fdPath.value === filePath);
    if (fdPath.error.kind === "fs" && isTransientError(fdPath.error.error)) return fdPath;
    return fdPath.error.kind === "fs" && isErrnoCode(fdPath.error.error, "ENAMETOOLONG")
      ? ok(false)
      : ok("unavailable");
  }
  logProcFdUnreadable();
  let [pathStats, handleStats] = await Promise.all([
    captureAsyncResult(
      lstat(filePath, {
        bigint: true,
      }),
    ),
    captureAsyncResult(
      handle.stat({
        bigint: true,
      }),
    ),
  ]);
  if (!handleStats.ok) return handleStats;
  let sameInode = sameInodeResult(pathStats, handleStats.value);
  if (!sameInode.ok || sameInode.value !== true) return sameInode;
  let realParent = await captureAsyncResult(realpath(dirname(filePath)));
  if (!realParent.ok) return realParent.error.kind === "absent" ? ok(false) : realParent;
  if (realParent.value !== dirname(filePath)) return ok(false);
  let recheckedStats = await captureAsyncResult(
    lstat(filePath, {
      bigint: true,
    }),
  );
  let recheckSameInode = sameInodeResult(recheckedStats, handleStats.value);
  if (!recheckSameInode.ok || recheckSameInode.value !== true) return recheckSameInode;
  return (pathStats.ok && pathStats.value.nlink > 1n) ||
    (recheckedStats.ok && recheckedStats.value.nlink > 1n) ||
    handleStats.value.nlink > 1n
    ? ok("otherNames")
    : ok(true);
}
//@ chunk-85eyj5gy.js:23841-24085 placement
/**
 * 比较重新 stat 的结果与打开的文件是否同一 inode（不可判断时返回 unavailable）。
 */
function sameInodeResult(pathResult, handleStats) {
  if (!pathResult.ok) return pathResult.error.kind === "absent" ? ok(false) : pathResult;
  if (!pathResult.value.isFile()) return ok(false);
  if (
    !hasInode(handleStats.ino) ||
    !hasInode(pathResult.value.ino) ||
    handleStats.nlink === 0n ||
    pathResult.value.nlink === 0n
  )
    return ok("unavailable");
  return ok(pathResult.value.ino === handleStats.ino && pathResult.value.dev === handleStats.dev);
}
//@ chunk-85eyj5gy.js:24085-24150 placement
class ProcFdProbeState {
  available = undefined;
  probing = undefined;
  procUnreadableLogged = false;
}
//@ chunk-85eyj5gy.js:24150-24175 placement
var procFdProbeRegistry; // deferred: uses ProcFdProbeState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-85eyj5gy.js:24150", () => {
  procFdProbeRegistry = new HostScoped(() => new ProcFdProbeState());
});
//@ chunk-85eyj5gy.js:24175-24212 placement
function currentProcFdProbeState() {
  return procFdProbeRegistry.of(getRootSession().host);
}
//@ chunk-85eyj5gy.js:24212-24471 placement
/**
 * 探测 /proc/self/fd 是否可用（缓存结果，并发探测共享）。
 */
async function isProcFdAvailable() {
  let state = currentProcFdProbeState();
  if (state.available !== undefined) return ok(state.available);
  state.probing ??= captureAsyncResult(lstat("/proc/self/fd")).then((probeResult) => {
    state.probing = undefined;
    if (!probeResult.ok && probeResult.error.kind === "fs" && isTransientError(probeResult.error.error))
      return probeResult;
    state.available = probeResult.ok;
    return ok(state.available);
  });
  return state.probing;
}
//@ chunk-85eyj5gy.js:24471-24665 placement
/**
 * /proc 描述符不可读时记录一次调试日志。
 */
function logProcFdUnreadable() {
  let state = currentProcFdProbeState();
  if (state.procUnreadableLogged) return;
  state.procUnreadableLogged = true;
  logForDebugging(
    "storage: /proc descriptor record unreadable for hardened reads on this host; using the post-open recheck",
  );
}
//@ chunk-85eyj5gy.js:24665-24693 placement
/**
 * 是否有有效 inode。
 */
function hasInode(inode) {
  return !isSentinelInode(inode);
}
//@ chunk-85eyj5gy.js:24693-24740 placement
var LINKMISDIRECTED = "LinkMisdirected";
var LINKUNVERIFIED = "LinkUnverified";
//@ chunk-85eyj5gy.js:24740-25764 placement
/**
 * 核对链接目标未变。
 */
async function verifyLinkTarget(sourcePath, identity, targetPath) {
  if (!hasInode(identity.inode))
    return err({
      kind: "classified",
      error: unavailableStorageError("unknown", {
        telemetryCode: LINKUNVERIFIED,
      }),
    });
  let linkResult = await captureAsyncResult(link(sourcePath, targetPath));
  if (!linkResult.ok) return linkResult;
  let targetStats = await captureAsyncResult(
    lstat(targetPath, {
      bigint: true,
    }),
  );
  if (!targetStats.ok)
    return targetStats.error.kind === "absent"
      ? err({
          kind: "classified",
          error: unavailableStorageError("unknown", {
            telemetryCode: LINKUNVERIFIED,
          }),
        })
      : targetStats;
  if (!hasInode(targetStats.value.ino))
    return err({
      kind: "classified",
      error: unavailableStorageError("unknown", {
        telemetryCode: LINKUNVERIFIED,
      }),
    });
  if (statsMatchIdentity(targetStats.value, identity) || (await linkTargetMatches(targetPath, identity)))
    return ok(undefined);
  let foundIdentity = {
    device: targetStats.value.dev,
    inode: targetStats.value.ino,
  };
  let [sourceStats, sourceFollowStats] = await Promise.all([
    captureAsyncResult(
      lstat(sourcePath, {
        bigint: true,
      }),
    ),
    captureAsyncResult(
      stat(sourcePath, {
        bigint: true,
      }),
    ),
  ]);
  let stagedNameSwapped =
    (sourceStats.ok && statsMatchIdentity(sourceStats.value, foundIdentity)) ||
    (sourceFollowStats.ok && statsMatchIdentity(sourceFollowStats.value, foundIdentity));
  logForDebugging(
    `storage: a link publish landed on another object (expected ${identity.device}:${identity.inode}, found ${foundIdentity.device}:${foundIdentity.inode}, ${targetStats.value.isSymbolicLink() ? "a symlink" : `nlink ${targetStats.value.nlink}`}); ${stagedNameSwapped ? "the staged name was swapped \u2014 removing the entry" : "leaving the entry"}`,
    {
      level: "warn",
    },
  );
  if (stagedNameSwapped) {
    let recheckStats = await captureAsyncResult(
      lstat(targetPath, {
        bigint: true,
      }),
    );
    if (recheckStats.ok && statsMatchIdentity(recheckStats.value, foundIdentity))
      await captureAsyncResult(unlink(targetPath));
  }
  return err({
    kind: "classified",
    error: unavailableStorageError("unknown", {
      telemetryCode: LINKMISDIRECTED,
    }),
  });
}
//@ chunk-85eyj5gy.js:25764-25947 placement
/**
 * 重新打开链接目标并核对其身份未变。
 */
async function linkTargetMatches(targetPath, identity) {
  let openResult = await captureAsyncResult(open(targetPath, constants.O_RDONLY | NOFOLLOW_NONBLOCK_FLAGS));
  if (!openResult.ok) return false;
  try {
    let targetStats = await captureAsyncResult(
      openResult.value.stat({
        bigint: true,
      }),
    );
    return targetStats.ok && statsMatchIdentity(targetStats.value, identity);
  } finally {
    await captureAsyncResult(openResult.value.close());
  }
}
//@ chunk-85eyj5gy.js:25947-26016 placement
function statsMatchIdentity(stats, identity) {
  return hasInode(stats.ino) && stats.dev === identity.device && stats.ino === identity.inode;
}
export {
  openNoFollow_2,
  isErrnoCode,
  hasInode,
  LINKMISDIRECTED,
  LINKUNVERIFIED,
  verifyOpenedPath,
  verifyLinkTarget,
  errorKindLabel,
  DEFAULT_OPEN_BUFFER_BYTES,
  isTransientError,
  openFileNoFollow,
};
