/**
 * utils/daemon/daemonLock.ts
 *
 * 2.1.316 新增：后台守护进程锁的读写与持有者校验
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-6erhssc0.js (31), chunk-7904g3ks.js (1)
 * attribution: placement 32
 */
import { join } from "path";
import { lstat, rm, readFile, rename, unlink } from "fs/promises";
import { uptime } from "os";
import {
  isProbeablePid,
  isExitedProcessAsync,
  getProcessStartTimeAsync,
  procIdentityOf,
  provenSameProcessAsync,
} from "../processIdentity.js";
import {
  getErrnoCode,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  isENOENT,
} from "../errors.js";
import { sleep, withDeadline } from "../sleep.js";
import { getClaudeConfigDir } from "../envUtils.js";
import { STORAGE_SPACES } from "../storage/storageSpaces.js";
import { HostScoped } from "../hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { logForDebugging } from "../debug.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { jsonStringify } from "../slowOperations.js";
import { FX } from "../../services/memorySync/pathScrub.js";
import { writeNewFile, writeIfMissing } from "../atomicPublishWrite.js";
import { safeParseJSON } from "../json.js";
import { getLaunchCommand } from "../deepLink/registerProtocol.js";
import { execFileNoThrow } from "../execFileNoThrow.js";
import { readServedFolders } from "../../daemon/daemonStatus.js";

//@ chunk-6erhssc0.js:715-1041 placement
async function signalPid(e, r = {}) {
  if (!isProbeablePid(e)) return "eperm";
  try {
    process.kill(e, r.signal ?? "SIGTERM");
  } catch (error) {
    if (getErrnoCode(error) === "EPERM") return "eperm";
    return "exited";
  }
  let o = Date.now() + (r.gracefulMs ?? 2000);
  while (!0) {
    let n = Date.now() >= o;
    try {
      process.kill(e, 0);
    } catch {
      return "exited";
    }
    if (await isExitedProcessAsync(e)) return "exited";
    if (n) return "timed-out";
    await sleep(50);
  }
}
//@ chunk-6erhssc0.js:1179-1199 placement
var DAEMON_LOCK = "daemon.lock";
//@ chunk-6erhssc0.js:1199-1230 placement
function daemonLockPath() {
  return join(getClaudeConfigDir(), DAEMON_LOCK);
}
//@ chunk-6erhssc0.js:1230-1276 placement
function daemonLockStateKey() {
  return STORAGE_SPACES.state("daemon-lock");
}
//@ chunk-6erhssc0.js:1276-1323 placement
function D(e) {
  return e === "EISDIR" || e === "ENXIO";
}
//@ chunk-6erhssc0.js:1323-1404 placement
class w {
  logged = !1;
  markLogged() {
    if (this.logged) return !1;
    return ((this.logged = !0), !0);
  }
}
//@ chunk-6erhssc0.js:1404-1427 placement
var S = new HostScoped(() => new w());
//@ chunk-6erhssc0.js:1427-1462 placement
function I() {
  return S.of(getRootSession().host);
}
//@ chunk-6erhssc0.js:1462-1559 placement
async function E() {
  let e = await lstat(daemonLockPath()).catch(() => {
    return;
  });
  return e !== void 0 && e.isSymbolicLink();
}
//@ chunk-6erhssc0.js:1559-1958 placement
async function removeStaleLockDir(e) {
  let r = daemonLockPath(),
    o = await lstat(r).catch(() => {
      return;
    });
  if (o === void 0 || o.isFile()) return;
  let n = o.isDirectory()
    ? "directory"
    : o.isFIFO()
      ? "fifo"
      : o.isSocket()
        ? "socket"
        : o.isSymbolicLink()
          ? "symlink"
          : "other non-regular node";
  if (I().markLogged())
    logForDebugging(`[DaemonLock] ${n} at the lock path (${e}) \u2014 removing it as the legacy path does`, {
      level: "warn",
    });
  await rm(r, { recursive: !0, force: !0 }).catch(() => {});
}
//@ chunk-6erhssc0.js:1958-1970 placement
var v = 65536;
//@ chunk-6erhssc0.js:1970-2687 placement
async function writeDaemonLockRemote(e, r) {
  if (isStorageV5Enabled() && r !== void 0) {
    let o = () =>
        r.write(daemonLockStateKey(), jsonStringify(e, null, 2), {
          precondition: { type: "ifAbsent" },
          mode: 438 & ~process.umask(),
        }),
      n = await o();
    for (let i of [0, 1]) {
      if (n.ok) return !0;
      if (n.error.code === "AlreadyExists") return !1;
      let a = "telemetryCode" in n.error ? n.error.telemetryCode : void 0;
      if (n.error.code !== "Failed" || !FX(a)) break;
      if (a === "ELOOP") {
        if (await E()) return !1;
        break;
      }
      if (i === 1) break;
      (await removeStaleLockDir(a), (n = await o()));
    }
    if (n.ok) return !0;
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `[DaemonLock] Failed to acquire daemon lock: ${n.error.code}${"telemetryCode" in n.error && n.error.telemetryCode ? ` (${n.error.telemetryCode})` : ""}`,
      "[DaemonLock] v5 acquire write failed",
    );
  }
  try {
    return (await writeNewFile(daemonLockPath(), jsonStringify(e, null, 2)), !0);
  } catch (error) {
    if (getErrnoCode(error) === "EEXIST") return !1;
    throw error;
  }
}
//@ chunk-6erhssc0.js:2687-2818 placement
async function releaseDaemonLock(e, r) {
  let o = await readDaemonLock(r);
  if (!o || o.pid !== e.pid || o.startedAt !== e.startedAt) return;
  await writeDaemonLock({ ...o, bgDisabled: !0 }, r);
}
/**
 * 读取守护进程锁（本地文件或远程存储），返回持有者 pid 与启动时间。
 */
//@ chunk-6erhssc0.js:2818-3976 placement
async function readDaemonLock(e) {
  let r;
  if (e) {
    let read = await e.read([daemonLockStateKey()]);
    if (!read.ok) {
      if (!(
        read.error.code === "Failed" &&
        (read.error.telemetryCode === "ENXIO" ||
          read.error.telemetryCode === "EFBIG" ||
          read.error.telemetryCode === "ELOOP" ||
          read.error.telemetryCode === "ENAMETOOLONG")
      ))
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `[DaemonLock] Failed to read daemon lock: ${read.error.code}${"telemetryCode" in read.error && read.error.telemetryCode ? ` (${read.error.telemetryCode})` : ""}`,
          "[DaemonLock] v5 lock read failed",
        );
      let s = await e.delete(daemonLockStateKey());
      if (!s.ok && s.error.code === "Failed") {
        let m = "telemetryCode" in s.error ? s.error.telemetryCode : void 0;
        if (D(m)) await removeStaleLockDir(m);
      }
      return null;
    }
    let i = read.value.items[0];
    if (!i.found) return null;
    if (i.totalBytes > v) return (await e.delete(daemonLockStateKey()), null);
    r = Buffer.from(i.value).toString("utf8");
    let a = safeParseJSON(r, !1);
    if (a && typeof a === "object") {
      let c = a;
      if (typeof c.pid === "number" && typeof c.version === "string") return a;
    }
    return null;
  }
  try {
    let n = await lstat(daemonLockPath());
    if (!n.isFile() || n.size > 65536)
      return (await rm(daemonLockPath(), { recursive: !0, force: !0 }).catch(() => {}), null);
    r = await readFile(daemonLockPath(), "utf8");
  } catch (error) {
    if (isENOENT(error)) return null;
    throw error;
  }
  let o = safeParseJSON(r, !1);
  if (o && typeof o === "object") {
    let n = o;
    if (typeof n.pid === "number" && typeof n.version === "string") return o;
  }
  return null;
}
//@ chunk-6erhssc0.js:3976-4947 placement
async function writeDaemonLock(e, r) {
  if (r) {
    let write = await r.write(daemonLockStateKey(), jsonStringify(e, null, 2), {
      mode: 438 & ~process.umask(),
    });
    if (!write.ok) {
      let c = "telemetryCode" in write.error ? write.error.telemetryCode : void 0;
      if (c === "LockContended" || c === "LockSuspect") {
        let s = await readDaemonLock(r);
        if (s?.pid !== e.pid || s?.startedAt !== e.startedAt) return !1;
        write = await r.write(daemonLockStateKey(), jsonStringify(e, null, 2), {
          mode: 438 & ~process.umask(),
        });
      }
      if (!write.ok)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `[DaemonLock] Failed to replace daemon lock: ${write.error.code}${"telemetryCode" in write.error && write.error.telemetryCode ? ` (${write.error.telemetryCode})` : ""}`,
          "[DaemonLock] v5 replace write failed",
        );
    }
    let a = await readDaemonLock(r);
    return a?.pid === e.pid && a?.startedAt === e.startedAt;
  }
  let o = await writeIfMissing(daemonLockPath(), jsonStringify(e, null, 2));
  try {
    await rename(o, daemonLockPath());
  } catch (error) {
    let a = getErrnoCode(error);
    if (a === "EEXIST" || a === "EPERM") {
      await unlink(daemonLockPath()).catch(() => {});
      try {
        await rename(o, daemonLockPath());
      } catch (error) {
        await unlink(o).catch(() => {});
        let s = getErrnoCode(error);
        if (s === "EEXIST" || s === "EPERM") return !1;
        throw error;
      }
    } else throw (await unlink(o).catch(() => {}), error);
  }
  let n = await readDaemonLock(r);
  return n?.pid === e.pid && n?.startedAt === e.startedAt;
}
//@ chunk-6erhssc0.js:4947-5259 placement
async function deleteDaemonLock(e) {
  if (e) {
    let r = await e.delete(daemonLockStateKey());
    if (!r.ok)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `[DaemonLock] Failed to remove daemon lock: ${r.error.code}${"telemetryCode" in r.error && r.error.telemetryCode ? ` (${r.error.telemetryCode})` : ""}`,
        "[DaemonLock] v5 lock delete failed",
      );
    return;
  }
  try {
    await unlink(daemonLockPath());
  } catch (error) {
    if (!isENOENT(error)) throw error;
  }
}
//@ chunk-6erhssc0.js:5259-5430 placement
async function isClaudeProcess(e) {
  let r;
  try {
    r = await readFile(`/proc/${e}/cmdline`, "utf8");
  } catch {
    return !0;
  }
  let parts = r.split("\x00");
  return parts[0] === "claude daemon" || parts.slice(1, 4).includes("daemon");
}
//@ chunk-6erhssc0.js:5430-5567 placement
function isClaudeCommandLine(e) {
  return (
    e !== void 0 &&
    (/(^|\/)claude(\.exe)?$|\/claude-code\/cli\.js$|\/claude\/versions\/[^/\s]+$/.test(e) ||
      e === getLaunchCommand().target)
  );
}
//@ chunk-6erhssc0.js:5567-6137 placement
async function readProcCmdline(e) {
  let r = await withDeadline(
    readFile(`/proc/${e}/cmdline`, "utf8").catch(() => {
      return;
    }),
    1000,
  );
  if (r !== void 0) {
    let parts = r.split("\x00"),
      i = /(^|\/)(node|bun)$/.test(parts[0]) ? 1 : 0;
    return (
      parts[0] === "claude daemon" ||
      (isClaudeCommandLine(parts[i]) &&
        /^daemon\0(run\0|--json-path\0[^\0]+\0--log-file\0[^\0]+\0--origin\0service\0$)/.test(
          parts.slice(i + 1).join("\x00"),
        ))
    );
  }
  let o = await execFileNoThrow("ps", ["-ww", "-o", "args=", "-p", String(e)], { timeout: 1000, useCwd: !1 });
  return isClaudeCommandLine(
    /^(?:(?:\S*\/)?(?:node|bun)\s+)?(\/\S+)\sdaemon\s(?:run(?:\s|$)|--json-path\s\S+\s--log-file\s\S+\s--origin\sservice\s*$)/.exec(
      o.code === 0 ? o.stdout : "",
    )?.[1],
  );
}
//@ chunk-6erhssc0.js:6137-6155 placement
var LOCK_PROBE_LIMITS = 2,
  KOr = 250;
//@ chunk-6erhssc0.js:6155-6315 placement
async function waitForProcessExit(e, r, o) {
  if (r === void 0) return !0;
  for (let n = 0; n < o; n++) {
    if (n > 0) await sleep(KOr);
    let i = await getProcessStartTimeAsync(e, { skipCache: n > 0 });
    if (i !== void 0) return i === r;
  }
  return !1;
}
//@ chunk-6erhssc0.js:6315-6328 placement
var x = 120000;
//@ chunk-6erhssc0.js:6328-6391 placement
function P(e, r = Date.now(), o = uptime()) {
  return e.startedAt < r - o * 1000 - x;
}
//@ chunk-6erhssc0.js:6391-6550 placement
async function verifyLockHolder(e) {
  let r = procIdentityOf(e);
  if (r !== void 0) {
    let o = await provenSameProcessAsync(e.pid, r);
    if (o === !0) return null;
    if (o === !1) return "pid_recycled";
  }
  return P(e) ? "predates_boot" : null;
}
//@ chunk-6erhssc0.js:6550-6588 placement
function hasProcIdentity(e) {
  return procIdentityOf(e) !== void 0;
}
//@ chunk-6erhssc0.js:6588-6736 placement
function stopDaemonHint() {
  return `Stop it with \`claude daemon stop --any\` (a graceful, socket-based stop); if nothing is running at that pid, delete ${daemonLockPath()}`;
}
/**
 * （误归 computerUse）读服务器锁文件并确认持有进程仍存活且身份匹配，否则返回 null。
 */
//@ chunk-6erhssc0.js:6736-6924 placement = isProcessRunning (0.698)
async function readLiveServerLock(e = 1, r) {
  let lock = await readDaemonLock(r);
  if (!lock) return null;
  try {
    process.kill(lock.pid, 0);
  } catch {
    return null;
  }
  if (!(await isClaudeProcess(lock.pid))) return null;
  if (!(await waitForProcessExit(lock.pid, procIdentityOf(lock), e))) return null;
  return lock;
}
/**
 * （误归 computerUse）按锁的 origin 判断服务器状态：service/foreground/transient（transient 会尝试确认已停止）。
 */
//@ chunk-6erhssc0.js:6924-7384 placement
async function getServerLockStatus(e) {
  let lock = await readLiveServerLock(1, e).catch(() => null);
  if (!lock) return { kind: "none" };
  switch (lock.origin) {
    case "service":
      return { kind: "service", lock: lock };
    case "foreground":
      return { kind: "foreground", lock: lock };
    case "transient":
    case void 0: {
      if (!hasProcIdentity(lock)) return { kind: "not-stopped", pid: lock.pid, outcome: "unverified" };
      let o = await signalPid(lock.pid);
      return o === "exited"
        ? { kind: "stopped", pid: lock.pid }
        : { kind: "not-stopped", pid: lock.pid, outcome: o };
    }
    default:
      return (lock.origin, { kind: "unknown-origin", lock: lock });
  }
}
//@ chunk-6erhssc0.js:7384-7787 placement
function lockHolderProblemText(e) {
  switch (e.outcome) {
    case "eperm":
      return `the daemon holding the lock (pid ${e.pid}) is owned by another user and cannot be signalled from this session`;
    case "unverified":
      return `pid ${e.pid} is holding the daemon lock but could not be verified as the daemon, so it was not signalled`;
    case "timed-out":
      return `the daemon holding the lock (pid ${e.pid}) was asked to stop but has not exited yet`;
  }
}
//@ chunk-6erhssc0.js:7787-7973 placement
function unknownDaemonText(e) {
  return `a background daemon with an unrecognized origin (pid ${e}) holds the daemon lock \u2014 it may have been started by a newer Claude Code, so it was left untouched`;
}
//@ chunk-6erhssc0.js:7973-8058 placement
async function isServerVersionMismatch(e, r) {
  let o = await readLiveServerLock(1, r).catch(() => null);
  return !!o && o.version !== e;
}
/**
 * （误归 computerUse）读活锁后对持有进程 pid 执行后续查询；无锁返回 []。
 */
//@ chunk-7904g3ks.js:5826-5914 placement = tryAcquireComputerUseLock (0.172)
async function tryAcquireComputerUseLock(e) {
  let t = await readLiveServerLock(1, e).catch(() => null);
  return t === null ? [] : readServedFolders(t.pid, e);
}

export {
  readLiveServerLock,
  tryAcquireComputerUseLock,
  getServerLockStatus,
  unknownDaemonText,
  lockHolderProblemText,
  daemonLockPath,
  daemonLockStateKey,
  LOCK_PROBE_LIMITS,
  readDaemonLock,
  verifyLockHolder,
  waitForProcessExit,
  hasProcIdentity,
  signalPid,
  isServerVersionMismatch,
  KOr,
  writeDaemonLockRemote,
  isClaudeProcess,
  writeDaemonLock,
  releaseDaemonLock,
  deleteDaemonLock,
  stopDaemonHint,
  readProcCmdline,
};
