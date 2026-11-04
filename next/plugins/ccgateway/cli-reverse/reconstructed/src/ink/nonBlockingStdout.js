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
import { identity } from "../utils/identity.js";
import { getPlatform } from "../utils/platform.js";
import { READ_LIMITS } from "../utils/fsBoundRead.js";
import { getErrnoCode, sanitizeErrnoTokenForTelemetry, sanitizeErrnoForTelemetry } from "../utils/errors.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { logFeatureOk, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { logForDebugging } from "../utils/debug.js";
import { logError } from "../utils/log.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-7t3j7ybe.js:635-722 placement = RESET (1)
var MAX_BUFFER_BYTES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_ITEMS;
var RESET_BYTES;
var cache;
var pendingSet;
deferInit("chunk-7t3j7ybe.js:635", () => {
  MAX_BUFFER_BYTES = 4194304;
  MAX_ITEMS = 25;
  RESET_BYTES = Buffer.from("\x1B[0m");
  cache = new WeakMap();
  pendingSet = identity(new Set(), (pendingSet) => pendingSet.clear());
});
//@ chunk-7t3j7ybe.js:722-1279 placement
/**
 * 为 stdout 找到可独立设置 O_NONBLOCK 的 fd（linux/wsl 用 /proc/self/fd，macOS 用 ttyname）。
 */
function openNonBlockingStdoutFd(fd = 1) {
  if (!(fd === 1 ? process.stdout.isTTY : isatty(fd)))
    return {
      reason: "not_a_tty",
    };
  let ttyPath;
  switch (getPlatform()) {
    case "linux":
    case "wsl":
      ttyPath = `/proc/self/fd/${fd}`;
      break;
    case "macos": {
      let ttyName = ttyNameOf(fd);
      if (ttyName === undefined)
        return {
          reason: "ttyname_unavailable",
        };
      ttyPath = ttyName;
      break;
    }
    default:
      return {
        reason: "unsupported_platform",
      };
  }
  let openedFd;
  try {
    openedFd = openSync(
      ttyPath,
      constants.O_WRONLY | constants.O_NONBLOCK | constants.O_NOCTTY | READ_LIMITS,
    );
  } catch (error) {
    return {
      reason: "open_failed",
      errno: getErrnoCode(error),
    };
  }
  let failure = {
    reason: "not_same_tty",
  };
  try {
    let openedStat = fstatSync(openedFd);
    let targetStat = fstatSync(fd);
    if (openedStat.rdev === targetStat.rdev && openedStat.ino === targetStat.ino)
      return {
        fd: openedFd,
      };
  } catch (error) {
    failure = {
      reason: "fstat_failed",
      errno: getErrnoCode(error),
    };
  }
  try {
    closeSync(openedFd);
  } catch {}
  return failure;
}
//@ chunk-7t3j7ybe.js:1279-1562 placement
function logNonBlockingStdoutResult(result, reason, errno) {
  logEvent("tengu_nonblocking_stdout", {
    result: fromEnum(result),
    reason: reason === undefined ? undefined : fromEnum(reason),
    errno,
  });
  if (result === "installed") logFeatureOk("terminal_nonblocking_stdout");
  else if (reason !== "not_a_tty" && reason !== "unsupported_platform")
    logFeatureSad(
      "terminal_nonblocking_stdout",
      reason ?? "write_failed",
      errno === undefined
        ? undefined
        : {
            errno,
          },
    );
}
//@ chunk-7t3j7ybe.js:1562-1628 placement
/**
 * 取流对应的 tty 名称
 */
function ttyNameOf(fd) {
  try {
    return Bun.ant.ttyName(fd) ?? undefined;
  } catch {
    return;
  }
}
//@ chunk-7t3j7ybe.js:1628-2524 placement
/**
 * 安装非阻塞 stdout 写入：终端停读时排队并在超限时丢弃，恢复后重绘。
 */
function installNonBlockingStdout(onEpisodeEnd, openFd = openNonBlockingStdoutFd) {
  let existing = cache.get(process.stdout);
  if (existing?.installedWrite !== undefined) {
    existing.onEpisodeEnd = onEpisodeEnd;
    return nonBlockingStdoutHandle(existing);
  }
  let openResult = openFd();
  if (openResult.fd === undefined) {
    logForDebugging(
      `nonBlockingStdout: not installed (${openResult.reason}${openResult.errno ? `, ${openResult.errno}` : ""})`,
    );
    if (!pendingSet.has(openResult.reason)) {
      pendingSet.add(openResult.reason);
      logNonBlockingStdoutResult(
        "skipped",
        openResult.reason,
        sanitizeErrnoTokenForTelemetry(openResult.errno),
      );
    }
    return null;
  }
  let state = {
    fd: openResult.fd,
    originalWrite: process.stdout.write,
    installedWrite: undefined,
    queue: [],
    queuedBytes: 0,
    dropping: false,
    timer: undefined,
    retryMs: 0,
    episode: {
      startedMs: 0,
      peakQueuedBytes: 0,
      droppedBytes: 0,
    },
    onEpisodeEnd,
    onExit: () => flushStdoutQueue(state),
  };
  let write = (chunk, encodingOrCallback, callback) => {
    let encoding = typeof encodingOrCallback === "string" ? encodingOrCallback : undefined;
    let done = typeof encodingOrCallback === "function" ? encodingOrCallback : callback;
    if (state.installedWrite === undefined)
      return state.originalWrite.call(process.stdout, chunk, encoding, done);
    writeNonBlocking(state, typeof chunk === "string" ? Buffer.from(chunk, encoding) : Buffer.from(chunk));
    done?.();
    return true;
  };
  state.installedWrite = write;
  process.stdout.write = write;
  cache.set(process.stdout, state);
  process.on("exit", state.onExit);
  logForDebugging("nonBlockingStdout: active");
  logNonBlockingStdoutResult("installed");
  return nonBlockingStdoutHandle(state);
}
//@ chunk-7t3j7ybe.js:2524-2647 placement
function nonBlockingStdoutHandle(state) {
  return {
    flush: () => flushStdoutQueue(state),
    restore: () => uninstallNonBlockingStdout(state),
    isActive: () => state.installedWrite !== undefined,
    queuedBytes: () => state.queuedBytes,
  };
}
//@ chunk-7t3j7ybe.js:2647-2717 placement
function isNonBlockingStdoutEnabled({ envOverride, isAnt, remoteFlag }) {
  return envOverride ?? (isAnt || remoteFlag());
}
//@ chunk-7t3j7ybe.js:2717-2786 placement
function isNonBlockingStdoutInstalled() {
  return cache.get(process.stdout)?.installedWrite !== undefined;
}
//@ chunk-7t3j7ybe.js:2786-2864 placement
function pauseNonBlockingStdout() {
  let existing = cache.get(process.stdout);
  if (existing?.installedWrite !== undefined) uninstallNonBlockingStdout(existing);
}
//@ chunk-7t3j7ybe.js:2864-2942 placement
function resumeNonBlockingStdout() {
  let existing = cache.get(process.stdout);
  if (existing?.installedWrite !== undefined) flushStdoutQueue(existing);
}
//@ chunk-7t3j7ybe.js:2942-3022 placement
/**
 * 同步写；EAGAIN 时按 0 处理
 */
function writeSyncToleratingEagain(fd, buffer) {
  try {
    return writeSync(fd, buffer);
  } catch (error) {
    if (getErrnoCode(error) === "EAGAIN") return 0;
    throw error;
  }
}
//@ chunk-7t3j7ybe.js:3022-3619 placement
function writeNonBlocking(state, buffer) {
  if (buffer.length === 0) return;
  if (state.queue.length === 0) {
    let written;
    try {
      written = writeSyncToleratingEagain(state.fd, buffer);
    } catch (error) {
      abandonNonBlockingStdout(state, error);
      process.stdout.write(buffer);
      return;
    }
    if (written === buffer.length) return;
    state.episode = {
      startedMs: performance.now(),
      peakQueuedBytes: 0,
      droppedBytes: 0,
    };
    enqueueStdoutChunk(state, buffer.subarray(written));
    scheduleStdoutRetry(state, written > 0);
    return;
  }
  if (state.dropping) {
    state.episode.droppedBytes += buffer.length;
    return;
  }
  if (state.queuedBytes + buffer.length > MAX_BUFFER_BYTES) {
    state.episode.droppedBytes += state.queuedBytes + buffer.length;
    state.queue = [];
    state.queuedBytes = 0;
    state.dropping = true;
    logForDebugging(
      `nonBlockingStdout: terminal stopped reading; dropped ${state.episode.droppedBytes} queued bytes, will repaint when it resumes`,
      {
        level: "warn",
      },
    );
    enqueueStdoutChunk(state, RESET_BYTES);
    return;
  }
  enqueueStdoutChunk(state, buffer);
}
//@ chunk-7t3j7ybe.js:3619-3758 placement
function enqueueStdoutChunk(state, chunk) {
  state.queue.push(chunk);
  state.queuedBytes += chunk.length;
  if (state.queuedBytes > state.episode.peakQueuedBytes) state.episode.peakQueuedBytes = state.queuedBytes;
}
//@ chunk-7t3j7ybe.js:3758-3874 placement
function scheduleStdoutRetry(state, hadProgress) {
  state.retryMs = hadProgress ? 0 : Math.min(Math.max(1, state.retryMs * 2), MAX_ITEMS);
  state.timer = setTimeout(drainStdoutQueue, state.retryMs, state);
  state.timer.unref();
}
//@ chunk-7t3j7ybe.js:3874-4182 placement
function drainStdoutQueue(state) {
  state.timer = undefined;
  let hadProgress = false;
  try {
    while (state.queue.length > 0) {
      if (hadProgress && state.queue.length > 1)
        state.queue = [Buffer.concat(state.queue, state.queuedBytes)];
      let head = state.queue[0];
      let written = writeSyncToleratingEagain(state.fd, head);
      if (written === 0) {
        scheduleStdoutRetry(state, hadProgress);
        return;
      }
      hadProgress = true;
      state.queuedBytes -= written;
      if (written < head.length) state.queue[0] = head.subarray(written);
      else state.queue.shift();
    }
  } catch (error) {
    abandonNonBlockingStdout(state, error);
    return;
  }
  endStdoutBackpressureEpisode(state, "drain");
}
//@ chunk-7t3j7ybe.js:4182-4410 placement
function endStdoutBackpressureEpisode(state, endedBy) {
  state.dropping = false;
  state.retryMs = 0;
  try {
    state.onEpisodeEnd({
      durationMs: Math.round(performance.now() - state.episode.startedMs),
      peakQueuedBytes: state.episode.peakQueuedBytes,
      droppedBytes: state.episode.droppedBytes,
      endedBy,
    });
  } catch (error) {
    logError(error);
  }
}
//@ chunk-7t3j7ybe.js:4410-4645 placement
function flushStdoutQueue(state) {
  if (state.timer !== undefined) {
    clearTimeout(state.timer);
    state.timer = undefined;
  }
  if (state.queue.length === 0) return;
  let queue = state.queue;
  state.queue = [];
  state.queuedBytes = 0;
  try {
    for (let chunk of queue) state.originalWrite.call(process.stdout, chunk);
  } catch (error) {
    abandonNonBlockingStdout(state, error);
    return;
  }
  endStdoutBackpressureEpisode(state, "flush");
}
//@ chunk-7t3j7ybe.js:4645-4765 placement
function abandonNonBlockingStdout(state, error) {
  logForDebugging(`nonBlockingStdout: uninstalling (${error})`);
  state.queue = [];
  state.queuedBytes = 0;
  uninstallNonBlockingStdout(state);
  logNonBlockingStdoutResult("abandoned", undefined, sanitizeErrnoForTelemetry(error));
}
//@ chunk-7t3j7ybe.js:4765-4997 placement
function uninstallNonBlockingStdout(state) {
  if (state.installedWrite === undefined) return;
  if (process.stdout.write === state.installedWrite) process.stdout.write = state.originalWrite;
  state.installedWrite = undefined;
  cache.delete(process.stdout);
  process.off("exit", state.onExit);
  try {
    closeSync(state.fd);
  } catch {}
  flushStdoutQueue(state);
}
export {
  isNonBlockingStdoutInstalled,
  openNonBlockingStdoutFd,
  resumeNonBlockingStdout,
  isNonBlockingStdoutEnabled,
  installNonBlockingStdout,
  pauseNonBlockingStdout,
};
