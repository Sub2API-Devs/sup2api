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
import {
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  lstat as lstat_5,
  lstat as lstat_6,
  open,
  open as open_2,
  open as open_3,
  open as open_4,
  open as open_5,
  open as open_6,
  readlink,
  readlink as readlink_2,
  readlink as readlink_3,
  readlink as readlink_4,
  realpath,
  realpath as realpath_2,
  realpath as realpath_3,
  realpath as realpath_4,
  link,
  stat,
  stat as stat_2,
  stat as stat_3,
  unlink,
} from "fs/promises";
import {
  constants,
  constants as constants_2,
  constants as constants_3,
  constants as constants_4,
  constants as constants_5,
  constants as constants_6,
  constants as constants_7,
} from "fs";
import {
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
  dirname as dirname_9,
} from "path";
import { getErrnoCode } from "../errors.js";
import { ok, err } from "../resultError.js";
import { ws } from "../fsFlags.js";
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

/**
 * 视为“不存在”的错误码与视为暂时性资源不足的错误码。
 */
//@ chunk-t0gq9gyw.js:21441-21554 placement
var ABSENT_ERRNO_CODES = new Set(["ENOENT", "ENOTDIR"]),
  TRANSIENT_ERRNO_CODES = new Set(["EAGAIN", "EBUSY", "EMFILE", "ENFILE", "ENOSPC", "EDQUOT", "ENOMEM"]);
//@ chunk-t0gq9gyw.js:21554-21609 placement
function Ei(e) {
  let n = getErrnoCode(e);
  return n !== void 0 && ABSENT_ERRNO_CODES.has(n);
}
//@ chunk-t0gq9gyw.js:21609-21643 placement
function AMt(e, n) {
  return getErrnoCode(e) === n;
}
//@ chunk-t0gq9gyw.js:21643-21699 placement
function SSr(e) {
  let n = getErrnoCode(e);
  return n !== void 0 && TRANSIENT_ERRNO_CODES.has(n);
}
//@ chunk-t0gq9gyw.js:21699-21763 placement
function Si(e) {
  return Ei(e) ? { kind: "absent" } : { kind: "fs", error: e };
}
//@ chunk-t0gq9gyw.js:21763-21829 placement
function VIi(e) {
  return e.kind === "fs" ? (getErrnoCode(e.error) ?? "unknown") : e.kind;
}
//@ chunk-t0gq9gyw.js:21829-21899 placement
async function Z(e) {
  try {
    return ok(await e);
  } catch (error) {
    return err(Si(error));
  }
}
//@ chunk-t0gq9gyw.js:21899-21911 placement
var vlo = 384;
/**
 * 先 lstat 确认是普通文件，再以 O_NOFOLLOW 打开。
 */
//@ chunk-t0gq9gyw.js:21911-22090 placement
async function openFileNoFollow(e, n, r = vlo) {
  let o = await Z(lstat_5(e));
  if (!o.ok && o.error.kind !== "absent") return err(o.error);
  if (o.ok && !o.value.isFile()) return err(Ci(e, o.value));
  return Z(open_4(e, n | ws, r));
}
/**
 * 以不跟随链接方式打开文件。
 */
//@ chunk-t0gq9gyw.js:22090-22190 placement
async function openNoFollow_2(e) {
  if (ws === 0) return openFileNoFollow(e, constants_6.O_RDONLY);
  return mapLoopToNoFollowError(e, await Z(open_4(e, constants_6.O_RDONLY | ws)));
}
/**
 * 打开结果为 ELOOP 时改写为针对该路径的 ELOOP 错误。
 */
//@ chunk-t0gq9gyw.js:22190-22306 placement
function mapLoopToNoFollowError(e, n) {
  return !n.ok && n.error.kind === "fs" && AMt(n.error.error, "ELOOP")
    ? err({ kind: "fs", error: Qt(e, "ELOOP") })
    : n;
}
//@ chunk-t0gq9gyw.js:22306-22367 placement
function Qt(e, n) {
  return Object.assign(refusalError(n), { code: n, path: e });
}
//@ chunk-t0gq9gyw.js:22367-22449 placement
function Ci(e, n) {
  return { kind: "fs", error: Qt(e, n.isSymbolicLink() ? "ELOOP" : "ENXIO") };
}
/**
 * 按 errno 生成拒绝读取的错误。
 */
//@ chunk-t0gq9gyw.js:22449-23021 placement
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
/**
 * 通过 /proc/self/fd 核对打开的路径。
 */
//@ chunk-t0gq9gyw.js:23021-23771 placement
async function verifyOpenedPath(e, n) {
  let r = await isProcFdAvailable();
  if (!r.ok) return r;
  if (r.value) {
    let y = await Z(readlink_4(`/proc/self/fd/${e.fd}`));
    if (y.ok) return ok(!y.value.endsWith(" (deleted)") && y.value === n);
    if (y.error.kind === "fs" && SSr(y.error.error)) return y;
    return y.error.kind === "fs" && AMt(y.error.error, "ENAMETOOLONG") ? ok(!1) : ok("unavailable");
  }
  logProcFdUnreadable();
  let [o, s] = await Promise.all([Z(lstat_5(n, { bigint: !0 })), Z(e.stat({ bigint: !0 }))]);
  if (!s.ok) return s;
  let a = sameInodeResult(o, s.value);
  if (!a.ok || a.value !== !0) return a;
  let c = await Z(realpath_3(dirname_6(n)));
  if (!c.ok) return c.error.kind === "absent" ? ok(!1) : c;
  if (c.value !== dirname_6(n)) return ok(!1);
  let u = await Z(lstat_5(n, { bigint: !0 })),
    p = sameInodeResult(u, s.value);
  if (!p.ok || p.value !== !0) return p;
  return (o.ok && o.value.nlink > 1n) || (u.ok && u.value.nlink > 1n) || s.value.nlink > 1n
    ? ok("otherNames")
    : ok(!0);
}
/**
 * 比较重新 stat 的结果与打开的文件是否同一 inode（不可判断时返回 unavailable）。
 */
//@ chunk-t0gq9gyw.js:23771-24017 placement
function sameInodeResult(e, n) {
  if (!e.ok) return e.error.kind === "absent" ? ok(!1) : e;
  if (!e.value.isFile()) return ok(!1);
  if (!hasInode(n.ino) || !hasInode(e.value.ino) || n.nlink === 0n || e.value.nlink === 0n)
    return ok("unavailable");
  return ok(e.value.ino === n.ino && e.value.dev === n.dev);
}
//@ chunk-t0gq9gyw.js:24017-24082 placement
class qt {
  available = void 0;
  probing = void 0;
  procUnreadableLogged = !1;
}
//@ chunk-t0gq9gyw.js:24082-24107 placement
var Oi = new HostScoped(() => new qt());
//@ chunk-t0gq9gyw.js:24107-24144 placement
function tn() {
  return Oi.of(getRootSession().host);
}
/**
 * 探测 /proc/self/fd 是否可用（缓存结果，并发探测共享）。
 */
//@ chunk-t0gq9gyw.js:24144-24403 placement
async function isProcFdAvailable() {
  let e = tn();
  if (e.available !== void 0) return ok(e.available);
  return (
    (e.probing ??= Z(lstat_5("/proc/self/fd")).then((n) => {
      if (((e.probing = void 0), !n.ok && n.error.kind === "fs" && SSr(n.error.error))) return n;
      return ((e.available = n.ok), ok(e.available));
    })),
    e.probing
  );
}
/**
 * /proc 描述符不可读时记录一次调试日志。
 */
//@ chunk-t0gq9gyw.js:24403-24597 placement
function logProcFdUnreadable() {
  let e = tn();
  if (e.procUnreadableLogged) return;
  ((e.procUnreadableLogged = !0),
    logForDebugging(
      "storage: /proc descriptor record unreadable for hardened reads on this host; using the post-open recheck",
    ));
}
/**
 * 是否有有效 inode。
 */
//@ chunk-t0gq9gyw.js:24597-24626 placement
function hasInode(e) {
  return !isSentinelInode(e);
}
//@ chunk-t0gq9gyw.js:24626-24673 placement
var LINKMISDIRECTED = "LinkMisdirected",
  LINKUNVERIFIED = "LinkUnverified";
/**
 * 核对链接目标未变。
 */
//@ chunk-t0gq9gyw.js:24673-25699 placement
async function verifyLinkTarget(e, n, r) {
  if (!hasInode(n.inode))
    return err({
      kind: "classified",
      error: unavailableStorageError("unknown", { telemetryCode: LINKUNVERIFIED }),
    });
  let o = await Z(link(e, r));
  if (!o.ok) return o;
  let s = await Z(lstat_5(r, { bigint: !0 }));
  if (!s.ok)
    return s.error.kind === "absent"
      ? err({
          kind: "classified",
          error: unavailableStorageError("unknown", { telemetryCode: LINKUNVERIFIED }),
        })
      : s;
  if (!hasInode(s.value.ino))
    return err({
      kind: "classified",
      error: unavailableStorageError("unknown", { telemetryCode: LINKUNVERIFIED }),
    });
  if (Me(s.value, n) || (await linkTargetMatches(r, n))) return ok(void 0);
  let a = { device: s.value.dev, inode: s.value.ino },
    [c, u] = await Promise.all([Z(lstat_5(e, { bigint: !0 })), Z(stat_3(e, { bigint: !0 }))]),
    p = (c.ok && Me(c.value, a)) || (u.ok && Me(u.value, a));
  if (
    (logForDebugging(
      `storage: a link publish landed on another object (expected ${n.device}:${n.inode}, found ${a.device}:${a.inode}, ${s.value.isSymbolicLink() ? "a symlink" : `nlink ${s.value.nlink}`}); ${p ? "the staged name was swapped \u2014 removing the entry" : "leaving the entry"}`,
      { level: "warn" },
    ),
    p)
  ) {
    let y = await Z(lstat_5(r, { bigint: !0 }));
    if (y.ok && Me(y.value, a)) await Z(unlink(r));
  }
  return err({
    kind: "classified",
    error: unavailableStorageError("unknown", { telemetryCode: LINKMISDIRECTED }),
  });
}
/**
 * 重新打开链接目标并核对其身份未变。
 */
//@ chunk-t0gq9gyw.js:25699-25882 placement
async function linkTargetMatches(e, n) {
  let r = await Z(open_4(e, constants_6.O_RDONLY | ws));
  if (!r.ok) return !1;
  try {
    let o = await Z(r.value.stat({ bigint: !0 }));
    return o.ok && Me(o.value, n);
  } finally {
    await Z(r.value.close());
  }
}
//@ chunk-t0gq9gyw.js:25882-25952 placement
function Me(e, n) {
  return hasInode(e.ino) && e.dev === n.device && e.ino === n.inode;
}

export {
  AMt,
  openNoFollow_2,
  vlo,
  hasInode,
  openFileNoFollow,
  SSr,
  verifyOpenedPath,
  verifyLinkTarget,
  VIi,
  LINKMISDIRECTED,
  LINKUNVERIFIED,
};
