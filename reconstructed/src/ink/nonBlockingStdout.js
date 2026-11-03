/**
 * ink/nonBlockingStdout.ts
 *
 * 2.1.316 新增：非阻塞 stdout：终端停读时排队、超限丢弃并在恢复后重绘
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-7t3j7ybe.js (19)
 * attribution: placement 19
 */
import { isatty } from "tty";
import { openSync, constants, fstatSync, closeSync, writeSync } from "fs";
import { ge } from "../utils/identity.js";
import { getPlatform } from "../utils/platform.js";
import { READ_LIMITS } from "../utils/fsBoundRead.js";
import { getErrnoCode, sanitizeErrnoTokenForTelemetry, sanitizeErrnoForTelemetry } from "../utils/errors.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { logFeatureOk, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { logForDebugging } from "../utils/debug.js";
import { logError } from "../utils/log.js";

//@ chunk-7t3j7ybe.js:635-722 placement = RESET (1)
var MAX_BUFFER_BYTES = 4194304,
  MAX_ITEMS = 25,
  RESET_BYTES = Buffer.from("\x1B[0m"),
  cache = new WeakMap(),
  pendingSet = ge(new Set(), (e) => e.clear());
/**
 * 为 stdout 找到可独立设置 O_NONBLOCK 的 fd（linux/wsl 用 /proc/self/fd，macOS 用 ttyname）。
 */
//@ chunk-7t3j7ybe.js:722-1279 placement
function openNonBlockingStdoutFd(e = 1) {
  if (!(e === 1 ? process.stdout.isTTY : isatty(e))) return { reason: "not_a_tty" };
  let n;
  switch (getPlatform()) {
    case "linux":
    case "wsl":
      n = `/proc/self/fd/${e}`;
      break;
    case "macos": {
      let i = Y(e);
      if (i === void 0) return { reason: "ttyname_unavailable" };
      n = i;
      break;
    }
    default:
      return { reason: "unsupported_platform" };
  }
  let o;
  try {
    o = openSync(n, constants.O_WRONLY | constants.O_NONBLOCK | constants.O_NOCTTY | READ_LIMITS);
  } catch (error) {
    return { reason: "open_failed", errno: getErrnoCode(error) };
  }
  let r = { reason: "not_same_tty" };
  try {
    let i = fstatSync(o),
      u = fstatSync(e);
    if (i.rdev === u.rdev && i.ino === u.ino) return { fd: o };
  } catch (error) {
    r = { reason: "fstat_failed", errno: getErrnoCode(error) };
  }
  try {
    closeSync(o);
  } catch {}
  return r;
}
//@ chunk-7t3j7ybe.js:1279-1562 placement
function logNonBlockingStdoutResult(e, n, o) {
  if (
    (logEvent("tengu_nonblocking_stdout", {
      result: fromEnum(e),
      reason: n === void 0 ? void 0 : fromEnum(n),
      errno: o,
    }),
    e === "installed")
  )
    logFeatureOk("terminal_nonblocking_stdout");
  else if (n !== "not_a_tty" && n !== "unsupported_platform")
    logFeatureSad("terminal_nonblocking_stdout", n ?? "write_failed", o === void 0 ? void 0 : { errno: o });
}
//@ chunk-7t3j7ybe.js:1562-1628 placement
function Y(e) {
  try {
    return Bun.ant.ttyName(e) ?? void 0;
  } catch {
    return;
  }
}
/**
 * 安装非阻塞 stdout 写入：终端停读时排队并在超限时丢弃，恢复后重绘。
 */
//@ chunk-7t3j7ybe.js:1628-2524 placement
function installNonBlockingStdout(e, n = openNonBlockingStdoutFd) {
  let o = cache.get(process.stdout);
  if (o?.installedWrite !== void 0) return ((o.onEpisodeEnd = e), nonBlockingStdoutHandle(o));
  let r = n();
  if (r.fd === void 0) {
    if (
      (logForDebugging(`nonBlockingStdout: not installed (${r.reason}${r.errno ? `, ${r.errno}` : ""})`),
      !pendingSet.has(r.reason))
    )
      (pendingSet.add(r.reason),
        logNonBlockingStdoutResult("skipped", r.reason, sanitizeErrnoTokenForTelemetry(r.errno)));
    return null;
  }
  let i = {
      fd: r.fd,
      originalWrite: process.stdout.write,
      installedWrite: void 0,
      queue: [],
      queuedBytes: 0,
      dropping: !1,
      timer: void 0,
      retryMs: 0,
      episode: { startedMs: 0, peakQueuedBytes: 0, droppedBytes: 0 },
      onEpisodeEnd: e,
      onExit: () => flushStdoutQueue(i),
    },
    u = (s, p, M) => {
      let q = typeof p === "string" ? p : void 0,
        E = typeof p === "function" ? p : M;
      if (i.installedWrite === void 0) return i.originalWrite.call(process.stdout, s, q, E);
      return (writeNonBlocking(i, typeof s === "string" ? Buffer.from(s, q) : Buffer.from(s)), E?.(), !0);
    };
  return (
    (i.installedWrite = u),
    (process.stdout.write = u),
    cache.set(process.stdout, i),
    process.on("exit", i.onExit),
    logForDebugging("nonBlockingStdout: active"),
    logNonBlockingStdoutResult("installed"),
    nonBlockingStdoutHandle(i)
  );
}
//@ chunk-7t3j7ybe.js:2524-2647 placement
function nonBlockingStdoutHandle(e) {
  return {
    flush: () => flushStdoutQueue(e),
    restore: () => uninstallNonBlockingStdout(e),
    isActive: () => e.installedWrite !== void 0,
    queuedBytes: () => e.queuedBytes,
  };
}
//@ chunk-7t3j7ybe.js:2647-2717 placement
function isNonBlockingStdoutEnabled({ envOverride: envOverride, isAnt: isAnt, remoteFlag: remoteFlag }) {
  return envOverride ?? (isAnt || remoteFlag());
}
//@ chunk-7t3j7ybe.js:2717-2786 placement
function isNonBlockingStdoutInstalled() {
  return cache.get(process.stdout)?.installedWrite !== void 0;
}
//@ chunk-7t3j7ybe.js:2786-2864 placement
function pauseNonBlockingStdout() {
  let e = cache.get(process.stdout);
  if (e?.installedWrite !== void 0) uninstallNonBlockingStdout(e);
}
//@ chunk-7t3j7ybe.js:2864-2942 placement
function resumeNonBlockingStdout() {
  let e = cache.get(process.stdout);
  if (e?.installedWrite !== void 0) flushStdoutQueue(e);
}
//@ chunk-7t3j7ybe.js:2942-3022 placement
function W(e, n) {
  try {
    return writeSync(e, n);
  } catch (error) {
    if (getErrnoCode(error) === "EAGAIN") return 0;
    throw error;
  }
}
//@ chunk-7t3j7ybe.js:3022-3619 placement
function writeNonBlocking(e, n) {
  if (n.length === 0) return;
  if (e.queue.length === 0) {
    let o;
    try {
      o = W(e.fd, n);
    } catch (error) {
      (abandonNonBlockingStdout(e, error), process.stdout.write(n));
      return;
    }
    if (o === n.length) return;
    ((e.episode = { startedMs: performance.now(), peakQueuedBytes: 0, droppedBytes: 0 }),
      enqueueStdoutChunk(e, n.subarray(o)),
      scheduleStdoutRetry(e, o > 0));
    return;
  }
  if (e.dropping) {
    e.episode.droppedBytes += n.length;
    return;
  }
  if (e.queuedBytes + n.length > MAX_BUFFER_BYTES) {
    ((e.episode.droppedBytes += e.queuedBytes + n.length),
      (e.queue = []),
      (e.queuedBytes = 0),
      (e.dropping = !0),
      logForDebugging(
        `nonBlockingStdout: terminal stopped reading; dropped ${e.episode.droppedBytes} queued bytes, will repaint when it resumes`,
        { level: "warn" },
      ),
      enqueueStdoutChunk(e, RESET_BYTES));
    return;
  }
  enqueueStdoutChunk(e, n);
}
//@ chunk-7t3j7ybe.js:3619-3758 placement
function enqueueStdoutChunk(e, n) {
  if ((e.queue.push(n), (e.queuedBytes += n.length), e.queuedBytes > e.episode.peakQueuedBytes))
    e.episode.peakQueuedBytes = e.queuedBytes;
}
//@ chunk-7t3j7ybe.js:3758-3874 placement
function scheduleStdoutRetry(e, n) {
  ((e.retryMs = n ? 0 : Math.min(Math.max(1, e.retryMs * 2), MAX_ITEMS)),
    (e.timer = setTimeout(drainStdoutQueue, e.retryMs, e)),
    e.timer.unref());
}
//@ chunk-7t3j7ybe.js:3874-4182 placement
function drainStdoutQueue(e) {
  e.timer = void 0;
  let n = !1;
  try {
    while (e.queue.length > 0) {
      if (n && e.queue.length > 1) e.queue = [Buffer.concat(e.queue, e.queuedBytes)];
      let o = e.queue[0],
        r = W(e.fd, o);
      if (r === 0) {
        scheduleStdoutRetry(e, n);
        return;
      }
      if (((n = !0), (e.queuedBytes -= r), r < o.length)) e.queue[0] = o.subarray(r);
      else e.queue.shift();
    }
  } catch (error) {
    abandonNonBlockingStdout(e, error);
    return;
  }
  endStdoutBackpressureEpisode(e, "drain");
}
//@ chunk-7t3j7ybe.js:4182-4410 placement
function endStdoutBackpressureEpisode(e, n) {
  ((e.dropping = !1), (e.retryMs = 0));
  try {
    e.onEpisodeEnd({
      durationMs: Math.round(performance.now() - e.episode.startedMs),
      peakQueuedBytes: e.episode.peakQueuedBytes,
      droppedBytes: e.episode.droppedBytes,
      endedBy: n,
    });
  } catch (error) {
    logError(error);
  }
}
//@ chunk-7t3j7ybe.js:4410-4645 placement
function flushStdoutQueue(e) {
  if (e.timer !== void 0) (clearTimeout(e.timer), (e.timer = void 0));
  if (e.queue.length === 0) return;
  let queue = e.queue;
  ((e.queue = []), (e.queuedBytes = 0));
  try {
    for (let o of queue) e.originalWrite.call(process.stdout, o);
  } catch (error) {
    abandonNonBlockingStdout(e, error);
    return;
  }
  endStdoutBackpressureEpisode(e, "flush");
}
//@ chunk-7t3j7ybe.js:4645-4765 placement
function abandonNonBlockingStdout(e, n) {
  (logForDebugging(`nonBlockingStdout: uninstalling (${n})`),
    (e.queue = []),
    (e.queuedBytes = 0),
    uninstallNonBlockingStdout(e),
    logNonBlockingStdoutResult("abandoned", void 0, sanitizeErrnoForTelemetry(n)));
}
//@ chunk-7t3j7ybe.js:4765-4997 placement
function uninstallNonBlockingStdout(e) {
  if (e.installedWrite === void 0) return;
  if (process.stdout.write === e.installedWrite) process.stdout.write = e.originalWrite;
  ((e.installedWrite = void 0), cache.delete(process.stdout), process.off("exit", e.onExit));
  try {
    closeSync(e.fd);
  } catch {}
  flushStdoutQueue(e);
}

export {
  isNonBlockingStdoutInstalled,
  openNonBlockingStdoutFd,
  resumeNonBlockingStdout,
  isNonBlockingStdoutEnabled,
  installNonBlockingStdout,
  pauseNonBlockingStdout,
};
