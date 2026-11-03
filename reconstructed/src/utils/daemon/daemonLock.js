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
import { isNonRegularError } from "../../services/memorySync/pathScrub.js";
import { writeNewFile, writeIfMissing } from "../atomicPublishWrite.js";
import { safeParseJSON } from "../json.js";
import { getLaunchCommand } from "../deepLink/registerProtocol.js";
import { execFileNoThrow } from "../execFileNoThrow.js";
import { readServedFolders } from "../../daemon/daemonStatus.js";

//@ chunk-6erhssc0.js:715-1041 placement
async function signalPid(pid, r = {}) {
  if (!isProbeablePid(pid)) return "eperm";
  try {
    process.kill(pid, r.signal ?? "SIGTERM");
  } catch (error) {
    if (getErrnoCode(error) === "EPERM") return "eperm";
    return "exited";
  }
  let o = Date.now() + (r.gracefulMs ?? 2000);
  while (true) {
    let n = Date.now() >= o;
    try {
      process.kill(pid, 0);
    } catch {
      return "exited";
    }
    if (await isExitedProcessAsync(pid)) return "exited";
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
/**
 * 判断 errno 是否表示锁目录已过期（EISDIR、ENXIO）。
 */
function isStaleLockDirErrno(telemetryCode) {
  return telemetryCode === "EISDIR" || telemetryCode === "ENXIO";
}
//@ chunk-6erhssc0.js:1323-1404 placement
/**
 * 只打印一次日志的状态。
 */
class LogOnceState {
  logged = false;
  markLogged() {
    if (this.logged) return false;
    this.logged = true;
    return true;
  }
}
//@ chunk-6erhssc0.js:1404-1427 placement
/**
 * 按宿主隔离的“只打印一次”状态。
 */
var logOnceByHost = new HostScoped(() => new LogOnceState());
//@ chunk-6erhssc0.js:1427-1462 placement
/**
 * 取出当前宿主的“只打印一次”状态。
 */
function shouldLogOnce() {
  return logOnceByHost.of(getRootSession().host);
}
//@ chunk-6erhssc0.js:1462-1559 placement
/**
 * 判断守护进程锁路径是否为符号链接。
 */
async function isDaemonLockSymlink() {
  let e = await lstat(daemonLockPath()).catch(() => {
    return;
  });
  return e !== undefined && e.isSymbolicLink();
}
//@ chunk-6erhssc0.js:1559-1958 placement
async function removeStaleLockDir(telemetryCode) {
  let r = daemonLockPath();
  let o = await lstat(r).catch(() => {
    return;
  });
  if (o === undefined || o.isFile()) return;
  let n = o.isDirectory()
    ? "directory"
    : o.isFIFO()
      ? "fifo"
      : o.isSocket()
        ? "socket"
        : o.isSymbolicLink()
          ? "symlink"
          : "other non-regular node";
  if (shouldLogOnce().markLogged())
    logForDebugging(
      `[DaemonLock] ${n} at the lock path (${telemetryCode}) \u2014 removing it as the legacy path does`,
      {
        level: "warn",
      },
    );
  await rm(r, {
    recursive: true,
    force: true,
  }).catch(() => {});
}
//@ chunk-6erhssc0.js:1958-1970 placement
/**
 * 读取守护进程锁文件的大小上限（64 KiB）。
 */
var MAX_DAEMON_LOCK_BYTES = 65536;
//@ chunk-6erhssc0.js:1970-2687 placement
async function writeDaemonLockRemote(e, storageV5) {
  if (isStorageV5Enabled() && storageV5 !== undefined) {
    let o = () =>
      storageV5.write(daemonLockStateKey(), jsonStringify(e, null, 2), {
        precondition: {
          type: "ifAbsent",
        },
        mode: 438 & ~process.umask(),
      });
    let n = await o();
    for (let i of [0, 1]) {
      if (n.ok) return true;
      if (n.error.code === "AlreadyExists") return false;
      let telemetryCode = "telemetryCode" in n.error ? n.error.telemetryCode : undefined;
      if (n.error.code !== "Failed" || !isNonRegularError(telemetryCode)) break;
      if (telemetryCode === "ELOOP") {
        if (await isDaemonLockSymlink()) return false;
        break;
      }
      if (i === 1) break;
      await removeStaleLockDir(telemetryCode);
      n = await o();
    }
    if (n.ok) return true;
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `[DaemonLock] Failed to acquire daemon lock: ${n.error.code}${"telemetryCode" in n.error && n.error.telemetryCode ? ` (${n.error.telemetryCode})` : ""}`,
      "[DaemonLock] v5 acquire write failed",
    );
  }
  try {
    await writeNewFile(daemonLockPath(), jsonStringify(e, null, 2));
    return true;
  } catch (error) {
    if (getErrnoCode(error) === "EEXIST") return false;
    throw error;
  }
}
//@ chunk-6erhssc0.js:2687-2818 placement
async function releaseDaemonLock(e, storageV5) {
  let daemonLock = await readDaemonLock(storageV5);
  if (!daemonLock || daemonLock.pid !== e.pid || daemonLock.startedAt !== e.startedAt) return;
  await writeDaemonLock(
    {
      ...daemonLock,
      bgDisabled: true,
    },
    storageV5,
  );
}
//@ chunk-6erhssc0.js:2818-3976 placement
/**
 * 读取守护进程锁（本地文件或远程存储），返回持有者 pid 与启动时间。
 */
async function readDaemonLock(storageV5) {
  let r;
  if (storageV5) {
    let n = await storageV5.read([daemonLockStateKey()]);
    if (!n.ok) {
      if (!(
        n.error.code === "Failed" &&
        (n.error.telemetryCode === "ENXIO" ||
          n.error.telemetryCode === "EFBIG" ||
          n.error.telemetryCode === "ELOOP" ||
          n.error.telemetryCode === "ENAMETOOLONG")
      ))
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `[DaemonLock] Failed to read daemon lock: ${n.error.code}${"telemetryCode" in n.error && n.error.telemetryCode ? ` (${n.error.telemetryCode})` : ""}`,
          "[DaemonLock] v5 lock read failed",
        );
      let s = await storageV5.delete(daemonLockStateKey());
      if (!s.ok && s.error.code === "Failed") {
        let telemetryCode = "telemetryCode" in s.error ? s.error.telemetryCode : undefined;
        if (isStaleLockDirErrno(telemetryCode)) await removeStaleLockDir(telemetryCode);
      }
      return null;
    }
    let i = n.value.items[0];
    if (!i.found) return null;
    if (i.totalBytes > MAX_DAEMON_LOCK_BYTES) {
      await storageV5.delete(daemonLockStateKey());
      return null;
    }
    r = Buffer.from(i.value).toString("utf8");
    let a = safeParseJSON(r, false);
    if (a && typeof a === "object") {
      let c = a;
      if (typeof c.pid === "number" && typeof c.version === "string") return a;
    }
    return null;
  }
  try {
    let n = await lstat(daemonLockPath());
    if (!n.isFile() || n.size > 65536) {
      await rm(daemonLockPath(), {
        recursive: true,
        force: true,
      }).catch(() => {});
      return null;
    }
    r = await readFile(daemonLockPath(), "utf8");
  } catch (error) {
    if (isENOENT(error)) return null;
    throw error;
  }
  let o = safeParseJSON(r, false);
  if (o && typeof o === "object") {
    let n = o;
    if (typeof n.pid === "number" && typeof n.version === "string") return o;
  }
  return null;
}
//@ chunk-6erhssc0.js:3976-4947 placement
async function writeDaemonLock(e, storageV5) {
  if (storageV5) {
    let i = await storageV5.write(daemonLockStateKey(), jsonStringify(e, null, 2), {
      mode: 438 & ~process.umask(),
    });
    if (!i.ok) {
      let telemetryCode = "telemetryCode" in i.error ? i.error.telemetryCode : undefined;
      if (telemetryCode === "LockContended" || telemetryCode === "LockSuspect") {
        let daemonLock = await readDaemonLock(storageV5);
        if (daemonLock?.pid !== e.pid || daemonLock?.startedAt !== e.startedAt) return false;
        i = await storageV5.write(daemonLockStateKey(), jsonStringify(e, null, 2), {
          mode: 438 & ~process.umask(),
        });
      }
      if (!i.ok)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `[DaemonLock] Failed to replace daemon lock: ${i.error.code}${"telemetryCode" in i.error && i.error.telemetryCode ? ` (${i.error.telemetryCode})` : ""}`,
          "[DaemonLock] v5 replace write failed",
        );
    }
    let daemonLock = await readDaemonLock(storageV5);
    return daemonLock?.pid === e.pid && daemonLock?.startedAt === e.startedAt;
  }
  let o = await writeIfMissing(daemonLockPath(), jsonStringify(e, null, 2));
  try {
    await rename(o, daemonLockPath());
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "EEXIST" || errnoCode === "EPERM") {
      await unlink(daemonLockPath()).catch(() => {});
      try {
        await rename(o, daemonLockPath());
      } catch (error) {
        await unlink(o).catch(() => {});
        let errnoCode = getErrnoCode(error);
        if (errnoCode === "EEXIST" || errnoCode === "EPERM") return false;
        throw error;
      }
    } else {
      await unlink(o).catch(() => {});
      throw error;
    }
  }
  let daemonLock = await readDaemonLock(storageV5);
  return daemonLock?.pid === e.pid && daemonLock?.startedAt === e.startedAt;
}
//@ chunk-6erhssc0.js:4947-5259 placement
async function deleteDaemonLock(storageV5) {
  if (storageV5) {
    let r = await storageV5.delete(daemonLockStateKey());
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
async function isClaudeProcess(pid) {
  let r;
  try {
    r = await readFile(`/proc/${pid}/cmdline`, "utf8");
  } catch {
    return true;
  }
  let parts = r.split("\x00");
  return parts[0] === "claude daemon" || parts.slice(1, 4).includes("daemon");
}
//@ chunk-6erhssc0.js:5430-5567 placement
function isClaudeCommandLine(e) {
  return (
    e !== undefined &&
    (/(^|\/)claude(\.exe)?$|\/claude-code\/cli\.js$|\/claude\/versions\/[^/\s]+$/.test(e) ||
      e === getLaunchCommand().target)
  );
}
//@ chunk-6erhssc0.js:5567-6137 placement
async function readProcCmdline(pid) {
  let r = await withDeadline(
    readFile(`/proc/${pid}/cmdline`, "utf8").catch(() => {
      return;
    }),
    1000,
  );
  if (r !== undefined) {
    let parts = r.split("\x00");
    let i = /(^|\/)(node|bun)$/.test(parts[0]) ? 1 : 0;
    return (
      parts[0] === "claude daemon" ||
      (isClaudeCommandLine(parts[i]) &&
        /^daemon\0(run\0|--json-path\0[^\0]+\0--log-file\0[^\0]+\0--origin\0service\0$)/.test(
          parts.slice(i + 1).join("\x00"),
        ))
    );
  }
  let o = await execFileNoThrow("ps", ["-ww", "-o", "args=", "-p", String(pid)], {
    timeout: 1000,
    useCwd: false,
  });
  return isClaudeCommandLine(
    /^(?:(?:\S*\/)?(?:node|bun)\s+)?(\/\S+)\sdaemon\s(?:run(?:\s|$)|--json-path\s\S+\s--log-file\s\S+\s--origin\sservice\s*$)/.exec(
      o.code === 0 ? o.stdout : "",
    )?.[1],
  );
}
//@ chunk-6erhssc0.js:6137-6155 placement
/**
 * 锁探测的重试间隔（250 毫秒）。
 */
var LOCK_PROBE_LIMITS = 2;
var LOCK_PROBE_RETRY_MS = 250;
//@ chunk-6erhssc0.js:6155-6315 placement
async function waitForProcessExit(pid, r, o) {
  if (r === undefined) return true;
  for (let j = 0; j < o; j++) {
    if (j > 0) await sleep(LOCK_PROBE_RETRY_MS);
    let processStartTime = await getProcessStartTimeAsync(pid, {
      skipCache: j > 0,
    });
    if (processStartTime !== undefined) return processStartTime === r;
  }
  return false;
}
//@ chunk-6erhssc0.js:6315-6328 placement
/**
 * 判断锁早于启动时允许的时间宽容（120 秒）。
 */
var BOOT_TIME_SLACK_MS = 120000;
//@ chunk-6erhssc0.js:6328-6391 placement
/**
 * 判断锁的启动时间是否早于本次系统启动。
 */
function predatesBoot(e, r = Date.now(), o = uptime()) {
  return e.startedAt < r - o * 1000 - BOOT_TIME_SLACK_MS;
}
//@ chunk-6erhssc0.js:6391-6550 placement
async function verifyLockHolder(e) {
  let r = procIdentityOf(e);
  if (r !== undefined) {
    let o = await provenSameProcessAsync(e.pid, r);
    if (o === true) return null;
    if (o === false) return "pid_recycled";
  }
  return predatesBoot(e) ? "predates_boot" : null;
}
//@ chunk-6erhssc0.js:6550-6588 placement
function hasProcIdentity(e) {
  return procIdentityOf(e) !== undefined;
}
//@ chunk-6erhssc0.js:6588-6736 placement
function stopDaemonHint() {
  return `Stop it with \`claude daemon stop --any\` (a graceful, socket-based stop); if nothing is running at that pid, delete ${daemonLockPath()}`;
}
//@ chunk-6erhssc0.js:6736-6924 placement = isProcessRunning (0.698)
/**
 * （误归 computerUse）读服务器锁文件并确认持有进程仍存活且身份匹配，否则返回 null。
 */
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
//@ chunk-6erhssc0.js:6924-7384 placement
/**
 * （误归 computerUse）按锁的 origin 判断服务器状态：service/foreground/transient（transient 会尝试确认已停止）。
 */
async function getServerLockStatus(e) {
  let lock = await readLiveServerLock(1, e).catch(() => null);
  if (!lock)
    return {
      kind: "none",
    };
  switch (lock.origin) {
    case "service":
      return {
        kind: "service",
        lock,
      };
    case "foreground":
      return {
        kind: "foreground",
        lock,
      };
    case "transient":
    case undefined: {
      if (!hasProcIdentity(lock))
        return {
          kind: "not-stopped",
          pid: lock.pid,
          outcome: "unverified",
        };
      let o = await signalPid(lock.pid);
      return o === "exited"
        ? {
            kind: "stopped",
            pid: lock.pid,
          }
        : {
            kind: "not-stopped",
            pid: lock.pid,
            outcome: o,
          };
    }
    default:
      lock.origin;
      return {
        kind: "unknown-origin",
        lock,
      };
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
//@ chunk-7904g3ks.js:5826-5914 placement = tryAcquireComputerUseLock (0.172)
/**
 * （误归 computerUse）读活锁后对持有进程 pid 执行后续查询；无锁返回 []。
 */
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
  LOCK_PROBE_RETRY_MS,
  writeDaemonLockRemote,
  isClaudeProcess,
  writeDaemonLock,
  releaseDaemonLock,
  deleteDaemonLock,
  stopDaemonHint,
  readProcCmdline,
};
