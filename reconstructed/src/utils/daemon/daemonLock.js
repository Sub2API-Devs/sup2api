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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-6erhssc0.js:715-1041 placement
async function signalPid(pid, options = {}) {
  if (!isProbeablePid(pid)) return "eperm";
  try {
    process.kill(pid, options.signal ?? "SIGTERM");
  } catch (error) {
    if (getErrnoCode(error) === "EPERM") return "eperm";
    return "exited";
  }
  let deadlineMs = Date.now() + (options.gracefulMs ?? 2000);
  while (true) {
    let isExpired = Date.now() >= deadlineMs;
    try {
      process.kill(pid, 0);
    } catch {
      return "exited";
    }
    if (await isExitedProcessAsync(pid)) return "exited";
    if (isExpired) return "timed-out";
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
var logOnceByHost; // deferred: uses LogOnceState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-6erhssc0.js:1404", () => {
  logOnceByHost = new HostScoped(() => new LogOnceState());
});
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
  let stats = await lstat(daemonLockPath()).catch(() => {
    return;
  });
  return stats !== undefined && stats.isSymbolicLink();
}
//@ chunk-6erhssc0.js:1559-1958 placement
async function removeStaleLockDir(telemetryCode) {
  let lockPath = daemonLockPath();
  let stats = await lstat(lockPath).catch(() => {
    return;
  });
  if (stats === undefined || stats.isFile()) return;
  let kind = stats.isDirectory()
    ? "directory"
    : stats.isFIFO()
      ? "fifo"
      : stats.isSocket()
        ? "socket"
        : stats.isSymbolicLink()
          ? "symlink"
          : "other non-regular node";
  if (shouldLogOnce().markLogged())
    logForDebugging(
      `[DaemonLock] ${kind} at the lock path (${telemetryCode}) \u2014 removing it as the legacy path does`,
      {
        level: "warn",
      },
    );
  await rm(lockPath, {
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
async function writeDaemonLockRemote(lockState, storageV5) {
  if (isStorageV5Enabled() && storageV5 !== undefined) {
    let writeLock = () =>
      storageV5.write(daemonLockStateKey(), jsonStringify(lockState, null, 2), {
        precondition: {
          type: "ifAbsent",
        },
        mode: 438 & ~process.umask(),
      });
    let writeResult = await writeLock();
    for (let attemptIndex of [0, 1]) {
      if (writeResult.ok) return true;
      if (writeResult.error.code === "AlreadyExists") return false;
      let telemetryCode = "telemetryCode" in writeResult.error ? writeResult.error.telemetryCode : undefined;
      if (writeResult.error.code !== "Failed" || !isNonRegularError(telemetryCode)) break;
      if (telemetryCode === "ELOOP") {
        if (await isDaemonLockSymlink()) return false;
        break;
      }
      if (attemptIndex === 1) break;
      await removeStaleLockDir(telemetryCode);
      writeResult = await writeLock();
    }
    if (writeResult.ok) return true;
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `[DaemonLock] Failed to acquire daemon lock: ${writeResult.error.code}${"telemetryCode" in writeResult.error && writeResult.error.telemetryCode ? ` (${writeResult.error.telemetryCode})` : ""}`,
      "[DaemonLock] v5 acquire write failed",
    );
  }
  try {
    await writeNewFile(daemonLockPath(), jsonStringify(lockState, null, 2));
    return true;
  } catch (error) {
    if (getErrnoCode(error) === "EEXIST") return false;
    throw error;
  }
}
//@ chunk-6erhssc0.js:2687-2818 placement
async function releaseDaemonLock(lockState, storageV5) {
  let daemonLock = await readDaemonLock(storageV5);
  if (!daemonLock || daemonLock.pid !== lockState.pid || daemonLock.startedAt !== lockState.startedAt) return;
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
  let lockText;
  if (storageV5) {
    let readResult = await storageV5.read([daemonLockStateKey()]);
    if (!readResult.ok) {
      if (!(
        readResult.error.code === "Failed" &&
        (readResult.error.telemetryCode === "ENXIO" ||
          readResult.error.telemetryCode === "EFBIG" ||
          readResult.error.telemetryCode === "ELOOP" ||
          readResult.error.telemetryCode === "ENAMETOOLONG")
      ))
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `[DaemonLock] Failed to read daemon lock: ${readResult.error.code}${"telemetryCode" in readResult.error && readResult.error.telemetryCode ? ` (${readResult.error.telemetryCode})` : ""}`,
          "[DaemonLock] v5 lock read failed",
        );
      let deleteResult = await storageV5.delete(daemonLockStateKey());
      if (!deleteResult.ok && deleteResult.error.code === "Failed") {
        let telemetryCode =
          "telemetryCode" in deleteResult.error ? deleteResult.error.telemetryCode : undefined;
        if (isStaleLockDirErrno(telemetryCode)) await removeStaleLockDir(telemetryCode);
      }
      return null;
    }
    let item = readResult.value.items[0];
    if (!item.found) return null;
    if (item.totalBytes > MAX_DAEMON_LOCK_BYTES) {
      await storageV5.delete(daemonLockStateKey());
      return null;
    }
    lockText = Buffer.from(item.value).toString("utf8");
    let parsed = safeParseJSON(lockText, false);
    if (parsed && typeof parsed === "object") {
      let candidate = parsed;
      if (typeof candidate.pid === "number" && typeof candidate.version === "string") return parsed;
    }
    return null;
  }
  try {
    let stats = await lstat(daemonLockPath());
    if (!stats.isFile() || stats.size > 65536) {
      await rm(daemonLockPath(), {
        recursive: true,
        force: true,
      }).catch(() => {});
      return null;
    }
    lockText = await readFile(daemonLockPath(), "utf8");
  } catch (error) {
    if (isENOENT(error)) return null;
    throw error;
  }
  let parsed = safeParseJSON(lockText, false);
  if (parsed && typeof parsed === "object") {
    let candidate = parsed;
    if (typeof candidate.pid === "number" && typeof candidate.version === "string") return parsed;
  }
  return null;
}
//@ chunk-6erhssc0.js:3976-4947 placement
async function writeDaemonLock(lockState, storageV5) {
  if (storageV5) {
    let writeResult = await storageV5.write(daemonLockStateKey(), jsonStringify(lockState, null, 2), {
      mode: 438 & ~process.umask(),
    });
    if (!writeResult.ok) {
      let telemetryCode = "telemetryCode" in writeResult.error ? writeResult.error.telemetryCode : undefined;
      if (telemetryCode === "LockContended" || telemetryCode === "LockSuspect") {
        let daemonLock = await readDaemonLock(storageV5);
        if (daemonLock?.pid !== lockState.pid || daemonLock?.startedAt !== lockState.startedAt) return false;
        writeResult = await storageV5.write(daemonLockStateKey(), jsonStringify(lockState, null, 2), {
          mode: 438 & ~process.umask(),
        });
      }
      if (!writeResult.ok)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `[DaemonLock] Failed to replace daemon lock: ${writeResult.error.code}${"telemetryCode" in writeResult.error && writeResult.error.telemetryCode ? ` (${writeResult.error.telemetryCode})` : ""}`,
          "[DaemonLock] v5 replace write failed",
        );
    }
    let daemonLock = await readDaemonLock(storageV5);
    return daemonLock?.pid === lockState.pid && daemonLock?.startedAt === lockState.startedAt;
  }
  let tempPath = await writeIfMissing(daemonLockPath(), jsonStringify(lockState, null, 2));
  try {
    await rename(tempPath, daemonLockPath());
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "EEXIST" || errnoCode === "EPERM") {
      await unlink(daemonLockPath()).catch(() => {});
      try {
        await rename(tempPath, daemonLockPath());
      } catch (error) {
        await unlink(tempPath).catch(() => {});
        let errnoCode = getErrnoCode(error);
        if (errnoCode === "EEXIST" || errnoCode === "EPERM") return false;
        throw error;
      }
    } else {
      await unlink(tempPath).catch(() => {});
      throw error;
    }
  }
  let daemonLock = await readDaemonLock(storageV5);
  return daemonLock?.pid === lockState.pid && daemonLock?.startedAt === lockState.startedAt;
}
//@ chunk-6erhssc0.js:4947-5259 placement
async function deleteDaemonLock(storageV5) {
  if (storageV5) {
    let deleteResult = await storageV5.delete(daemonLockStateKey());
    if (!deleteResult.ok)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `[DaemonLock] Failed to remove daemon lock: ${deleteResult.error.code}${"telemetryCode" in deleteResult.error && deleteResult.error.telemetryCode ? ` (${deleteResult.error.telemetryCode})` : ""}`,
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
  let cmdline;
  try {
    cmdline = await readFile(`/proc/${pid}/cmdline`, "utf8");
  } catch {
    return true;
  }
  let parts = cmdline.split("\x00");
  return parts[0] === "claude daemon" || parts.slice(1, 4).includes("daemon");
}
//@ chunk-6erhssc0.js:5430-5567 placement
function isClaudeCommandLine(commandLine) {
  return (
    commandLine !== undefined &&
    (/(^|\/)claude(\.exe)?$|\/claude-code\/cli\.js$|\/claude\/versions\/[^/\s]+$/.test(commandLine) ||
      commandLine === getLaunchCommand().target)
  );
}
//@ chunk-6erhssc0.js:5567-6137 placement
async function readProcCmdline(pid) {
  let cmdline = await withDeadline(
    readFile(`/proc/${pid}/cmdline`, "utf8").catch(() => {
      return;
    }),
    1000,
  );
  if (cmdline !== undefined) {
    let parts = cmdline.split("\x00");
    let scriptIndex = /(^|\/)(node|bun)$/.test(parts[0]) ? 1 : 0;
    return (
      parts[0] === "claude daemon" ||
      (isClaudeCommandLine(parts[scriptIndex]) &&
        /^daemon\0(run\0|--json-path\0[^\0]+\0--log-file\0[^\0]+\0--origin\0service\0$)/.test(
          parts.slice(scriptIndex + 1).join("\x00"),
        ))
    );
  }
  let psResult = await execFileNoThrow("ps", ["-ww", "-o", "args=", "-p", String(pid)], {
    timeout: 1000,
    useCwd: false,
  });
  return isClaudeCommandLine(
    /^(?:(?:\S*\/)?(?:node|bun)\s+)?(\/\S+)\sdaemon\s(?:run(?:\s|$)|--json-path\s\S+\s--log-file\s\S+\s--origin\sservice\s*$)/.exec(
      psResult.code === 0 ? psResult.stdout : "",
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
async function waitForProcessExit(pid, expectedStartTime, maxAttempts) {
  if (expectedStartTime === undefined) return true;
  for (let j = 0; j < maxAttempts; j++) {
    if (j > 0) await sleep(LOCK_PROBE_RETRY_MS);
    let processStartTime = await getProcessStartTimeAsync(pid, {
      skipCache: j > 0,
    });
    if (processStartTime !== undefined) return processStartTime === expectedStartTime;
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
function predatesBoot(lock, nowMs = Date.now(), uptimeSeconds = uptime()) {
  return lock.startedAt < nowMs - uptimeSeconds * 1000 - BOOT_TIME_SLACK_MS;
}
//@ chunk-6erhssc0.js:6391-6550 placement
async function verifyLockHolder(lock) {
  let identity = procIdentityOf(lock);
  if (identity !== undefined) {
    let sameProcess = await provenSameProcessAsync(lock.pid, identity);
    if (sameProcess === true) return null;
    if (sameProcess === false) return "pid_recycled";
  }
  return predatesBoot(lock) ? "predates_boot" : null;
}
//@ chunk-6erhssc0.js:6550-6588 placement
function hasProcIdentity(lock) {
  return procIdentityOf(lock) !== undefined;
}
//@ chunk-6erhssc0.js:6588-6736 placement
function stopDaemonHint() {
  return `Stop it with \`claude daemon stop --any\` (a graceful, socket-based stop); if nothing is running at that pid, delete ${daemonLockPath()}`;
}
//@ chunk-6erhssc0.js:6736-6924 placement = isProcessRunning (0.698)
/**
 * （误归 computerUse）读服务器锁文件并确认持有进程仍存活且身份匹配，否则返回 null。
 */
async function readLiveServerLock(maxAttempts = 1, storageV5) {
  let lock = await readDaemonLock(storageV5);
  if (!lock) return null;
  try {
    process.kill(lock.pid, 0);
  } catch {
    return null;
  }
  if (!(await isClaudeProcess(lock.pid))) return null;
  if (!(await waitForProcessExit(lock.pid, procIdentityOf(lock), maxAttempts))) return null;
  return lock;
}
//@ chunk-6erhssc0.js:6924-7384 placement
/**
 * （误归 computerUse）按锁的 origin 判断服务器状态：service/foreground/transient（transient 会尝试确认已停止）。
 */
async function getServerLockStatus(storageV5) {
  let lock = await readLiveServerLock(1, storageV5).catch(() => null);
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
      let outcome = await signalPid(lock.pid);
      return outcome === "exited"
        ? {
            kind: "stopped",
            pid: lock.pid,
          }
        : {
            kind: "not-stopped",
            pid: lock.pid,
            outcome,
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
function lockHolderProblemText(holder) {
  switch (holder.outcome) {
    case "eperm":
      return `the daemon holding the lock (pid ${holder.pid}) is owned by another user and cannot be signalled from this session`;
    case "unverified":
      return `pid ${holder.pid} is holding the daemon lock but could not be verified as the daemon, so it was not signalled`;
    case "timed-out":
      return `the daemon holding the lock (pid ${holder.pid}) was asked to stop but has not exited yet`;
  }
}
//@ chunk-6erhssc0.js:7787-7973 placement
function unknownDaemonText(pid) {
  return `a background daemon with an unrecognized origin (pid ${pid}) holds the daemon lock \u2014 it may have been started by a newer Claude Code, so it was left untouched`;
}
//@ chunk-6erhssc0.js:7973-8058 placement
async function isServerVersionMismatch(version, storageV5) {
  let lock = await readLiveServerLock(1, storageV5).catch(() => null);
  return !!lock && lock.version !== version;
}
//@ chunk-7904g3ks.js:5826-5914 placement = tryAcquireComputerUseLock (0.172)
/**
 * （误归 computerUse）读活锁后对持有进程 pid 执行后续查询；无锁返回 []。
 */
async function tryAcquireComputerUseLock(storageV5) {
  let lock = await readLiveServerLock(1, storageV5).catch(() => null);
  return lock === null ? [] : readServedFolders(lock.pid, storageV5);
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
