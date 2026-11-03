/**
 * utils/fsSafety/hardenedRead.ts
 *
 * 2.1.316 新增：核对链接目标未变；通过 /proc/self/fd 核对打开的路径等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-t0gq9gyw.js (26)
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

//@ chunk-t0gq9gyw.js:21441-21554 placement
/**
 * 视为“不存在”的错误码与视为暂时性资源不足的错误码。
 */
var ABSENT_ERRNO_CODES = new Set(["ENOENT", "ENOTDIR"]);
var TRANSIENT_ERRNO_CODES = new Set(["EAGAIN", "EBUSY", "EMFILE", "ENFILE", "ENOSPC", "EDQUOT", "ENOMEM"]);
//@ chunk-t0gq9gyw.js:21554-21609 placement
function isAbsentError(e) {
  let errnoCode = getErrnoCode(e);
  return errnoCode !== undefined && ABSENT_ERRNO_CODES.has(errnoCode);
}
//@ chunk-t0gq9gyw.js:21609-21643 placement
/**
 * 判断错误的 errno 码是否等于给定值。
 */
function isErrnoCode(error, n) {
  return getErrnoCode(error) === n;
}
//@ chunk-t0gq9gyw.js:21643-21699 placement
/**
 * 判断错误是否为可重试的瞬态 errno。
 */
function isTransientError(error) {
  let errnoCode = getErrnoCode(error);
  return errnoCode !== undefined && TRANSIENT_ERRNO_CODES.has(errnoCode);
}
//@ chunk-t0gq9gyw.js:21699-21763 placement
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
//@ chunk-t0gq9gyw.js:21763-21829 placement
/**
 * 把读取错误归一为标签（文件系统 errno 或 absent/unavailable 等 kind）。
 */
function errorKindLabel(error) {
  return error.kind === "fs" ? (getErrnoCode(error.error) ?? "unknown") : error.kind;
}
//@ chunk-t0gq9gyw.js:21829-21899 placement
async function captureAsyncResult(e) {
  try {
    return ok(await e);
  } catch (error) {
    return err(classifyReadError(error));
  }
}
//@ chunk-t0gq9gyw.js:21899-21911 placement
/**
 * 打开文件时的默认缓冲区字节数。
 */
var DEFAULT_OPEN_BUFFER_BYTES = 384;
//@ chunk-t0gq9gyw.js:21911-22090 placement
/**
 * 先 lstat 确认是普通文件，再以 O_NOFOLLOW 打开。
 */
async function openFileNoFollow(e, n, r = DEFAULT_OPEN_BUFFER_BYTES) {
  let o = await captureAsyncResult(lstat(e));
  if (!o.ok && o.error.kind !== "absent") return err(o.error);
  if (o.ok && !o.value.isFile()) return err(refusedFsError(e, o.value));
  return captureAsyncResult(open(e, n | NOFOLLOW_NONBLOCK_FLAGS, r));
}
//@ chunk-t0gq9gyw.js:22090-22190 placement
/**
 * 以不跟随链接方式打开文件。
 */
async function openNoFollow_2(e) {
  if (NOFOLLOW_NONBLOCK_FLAGS === 0) return openFileNoFollow(e, constants.O_RDONLY);
  return mapLoopToNoFollowError(
    e,
    await captureAsyncResult(open(e, constants.O_RDONLY | NOFOLLOW_NONBLOCK_FLAGS)),
  );
}
//@ chunk-t0gq9gyw.js:22190-22306 placement
/**
 * 打开结果为 ELOOP 时改写为针对该路径的 ELOOP 错误。
 */
function mapLoopToNoFollowError(path, n) {
  return !n.ok && n.error.kind === "fs" && isErrnoCode(n.error.error, "ELOOP")
    ? err({
        kind: "fs",
        error: withCodeAndPath(path, "ELOOP"),
      })
    : n;
}
//@ chunk-t0gq9gyw.js:22306-22367 placement
function withCodeAndPath(path, n) {
  return Object.assign(refusalError(n), {
    code: n,
    path,
  });
}
//@ chunk-t0gq9gyw.js:22367-22449 placement
function refusedFsError(path, n) {
  return {
    kind: "fs",
    error: withCodeAndPath(path, n.isSymbolicLink() ? "ELOOP" : "ENXIO"),
  };
}
//@ chunk-t0gq9gyw.js:22449-23021 placement
/**
 * 按 errno 生成拒绝读取的错误。
 */
function refusalError(e) {
  switch (e) {
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
//@ chunk-t0gq9gyw.js:23021-23771 placement
/**
 * 通过 /proc/self/fd 核对打开的路径。
 */
async function verifyOpenedPath(e, n) {
  let r = await isProcFdAvailable();
  if (!r.ok) return r;
  if (r.value) {
    let y = await captureAsyncResult(readlink(`/proc/self/fd/${e.fd}`));
    if (y.ok) return ok(!y.value.endsWith(" (deleted)") && y.value === n);
    if (y.error.kind === "fs" && isTransientError(y.error.error)) return y;
    return y.error.kind === "fs" && isErrnoCode(y.error.error, "ENAMETOOLONG")
      ? ok(false)
      : ok("unavailable");
  }
  logProcFdUnreadable();
  let [o, s] = await Promise.all([
    captureAsyncResult(
      lstat(n, {
        bigint: true,
      }),
    ),
    captureAsyncResult(
      e.stat({
        bigint: true,
      }),
    ),
  ]);
  if (!s.ok) return s;
  let a = sameInodeResult(o, s.value);
  if (!a.ok || a.value !== true) return a;
  let c = await captureAsyncResult(realpath(dirname(n)));
  if (!c.ok) return c.error.kind === "absent" ? ok(false) : c;
  if (c.value !== dirname(n)) return ok(false);
  let u = await captureAsyncResult(
    lstat(n, {
      bigint: true,
    }),
  );
  let p = sameInodeResult(u, s.value);
  if (!p.ok || p.value !== true) return p;
  return (o.ok && o.value.nlink > 1n) || (u.ok && u.value.nlink > 1n) || s.value.nlink > 1n
    ? ok("otherNames")
    : ok(true);
}
//@ chunk-t0gq9gyw.js:23771-24017 placement
/**
 * 比较重新 stat 的结果与打开的文件是否同一 inode（不可判断时返回 unavailable）。
 */
function sameInodeResult(e, n) {
  if (!e.ok) return e.error.kind === "absent" ? ok(false) : e;
  if (!e.value.isFile()) return ok(false);
  if (!hasInode(n.ino) || !hasInode(e.value.ino) || n.nlink === 0n || e.value.nlink === 0n)
    return ok("unavailable");
  return ok(e.value.ino === n.ino && e.value.dev === n.dev);
}
//@ chunk-t0gq9gyw.js:24017-24082 placement
class ProcFdProbeState {
  available = undefined;
  probing = undefined;
  procUnreadableLogged = false;
}
//@ chunk-t0gq9gyw.js:24082-24107 placement
var procFdProbeRegistry = new HostScoped(() => new ProcFdProbeState());
//@ chunk-t0gq9gyw.js:24107-24144 placement
function currentProcFdProbeState() {
  return procFdProbeRegistry.of(getRootSession().host);
}
//@ chunk-t0gq9gyw.js:24144-24403 placement
/**
 * 探测 /proc/self/fd 是否可用（缓存结果，并发探测共享）。
 */
async function isProcFdAvailable() {
  let e = currentProcFdProbeState();
  if (e.available !== undefined) return ok(e.available);
  e.probing ??= captureAsyncResult(lstat("/proc/self/fd")).then((n) => {
    e.probing = undefined;
    if (!n.ok && n.error.kind === "fs" && isTransientError(n.error.error)) return n;
    e.available = n.ok;
    return ok(e.available);
  });
  return e.probing;
}
//@ chunk-t0gq9gyw.js:24403-24597 placement
/**
 * /proc 描述符不可读时记录一次调试日志。
 */
function logProcFdUnreadable() {
  let e = currentProcFdProbeState();
  if (e.procUnreadableLogged) return;
  e.procUnreadableLogged = true;
  logForDebugging(
    "storage: /proc descriptor record unreadable for hardened reads on this host; using the post-open recheck",
  );
}
//@ chunk-t0gq9gyw.js:24597-24626 placement
/**
 * 是否有有效 inode。
 */
function hasInode(e) {
  return !isSentinelInode(e);
}
//@ chunk-t0gq9gyw.js:24626-24673 placement
var LINKMISDIRECTED = "LinkMisdirected";
var LINKUNVERIFIED = "LinkUnverified";
//@ chunk-t0gq9gyw.js:24673-25699 placement
/**
 * 核对链接目标未变。
 */
async function verifyLinkTarget(e, n, r) {
  if (!hasInode(n.inode))
    return err({
      kind: "classified",
      error: unavailableStorageError("unknown", {
        telemetryCode: LINKUNVERIFIED,
      }),
    });
  let o = await captureAsyncResult(link(e, r));
  if (!o.ok) return o;
  let s = await captureAsyncResult(
    lstat(r, {
      bigint: true,
    }),
  );
  if (!s.ok)
    return s.error.kind === "absent"
      ? err({
          kind: "classified",
          error: unavailableStorageError("unknown", {
            telemetryCode: LINKUNVERIFIED,
          }),
        })
      : s;
  if (!hasInode(s.value.ino))
    return err({
      kind: "classified",
      error: unavailableStorageError("unknown", {
        telemetryCode: LINKUNVERIFIED,
      }),
    });
  if (statsMatchIdentity(s.value, n) || (await linkTargetMatches(r, n))) return ok(undefined);
  let a = {
    device: s.value.dev,
    inode: s.value.ino,
  };
  let [c, u] = await Promise.all([
    captureAsyncResult(
      lstat(e, {
        bigint: true,
      }),
    ),
    captureAsyncResult(
      stat(e, {
        bigint: true,
      }),
    ),
  ]);
  let p = (c.ok && statsMatchIdentity(c.value, a)) || (u.ok && statsMatchIdentity(u.value, a));
  logForDebugging(
    `storage: a link publish landed on another object (expected ${n.device}:${n.inode}, found ${a.device}:${a.inode}, ${s.value.isSymbolicLink() ? "a symlink" : `nlink ${s.value.nlink}`}); ${p ? "the staged name was swapped \u2014 removing the entry" : "leaving the entry"}`,
    {
      level: "warn",
    },
  );
  if (p) {
    let y = await captureAsyncResult(
      lstat(r, {
        bigint: true,
      }),
    );
    if (y.ok && statsMatchIdentity(y.value, a)) await captureAsyncResult(unlink(r));
  }
  return err({
    kind: "classified",
    error: unavailableStorageError("unknown", {
      telemetryCode: LINKMISDIRECTED,
    }),
  });
}
//@ chunk-t0gq9gyw.js:25699-25882 placement
/**
 * 重新打开链接目标并核对其身份未变。
 */
async function linkTargetMatches(e, n) {
  let r = await captureAsyncResult(open(e, constants.O_RDONLY | NOFOLLOW_NONBLOCK_FLAGS));
  if (!r.ok) return false;
  try {
    let o = await captureAsyncResult(
      r.value.stat({
        bigint: true,
      }),
    );
    return o.ok && statsMatchIdentity(o.value, n);
  } finally {
    await captureAsyncResult(r.value.close());
  }
}
//@ chunk-t0gq9gyw.js:25882-25952 placement
function statsMatchIdentity(e, n) {
  return hasInode(e.ino) && e.dev === n.device && e.ino === n.inode;
}
export {
  isErrnoCode,
  openNoFollow_2,
  DEFAULT_OPEN_BUFFER_BYTES,
  isTransientError,
  hasInode,
  openFileNoFollow,
  verifyOpenedPath,
  verifyLinkTarget,
  errorKindLabel,
  LINKMISDIRECTED,
  LINKUNVERIFIED,
};
