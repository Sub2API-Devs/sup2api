/**
 * utils/process.ts
 *
 * 进程 I/O 健壮性：stdout/stderr 断管处理、写入结果、排空预算与外部时钟、丢弃计数
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/process.ts
 * pieces: chunk-24t3dkzb.js (1), chunk-fy5kn7m3.js (2), chunk-j3nx1xyn.js (23), chunk-ksvdmrg0.js (1)
 * attribution: fingerprint 2, placement 25
 */
import { withTimeout, sleep } from "./sleep.js";
import { bindAsyncResource } from "./asyncResourceBind.js";
import { identity } from "./identity.js";
import { isDisklessProcess } from "./hostScoped.js";
import { setBgExitCause } from "./bgExitSidecars.js";
import { GhApiResponseError } from "./github/ghApi.js";
import { jsonStringify } from "./slowOperations.js";
import { getErrorCodeString } from "./errors.js";
import { recordSlowestWrite } from "../ink/terminal.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-j3nx1xyn.js:1084-1179 placement
var STREAM_GONE_CODES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var _;
deferInit("chunk-j3nx1xyn.js:1084", () => {
  STREAM_GONE_CODES = new Set(["EPIPE", "EIO", "ENXIO", "EBADF"]);
  _ = new Set(["EISDIR", "ENOTCONN", "ECONNRESET"]);
});
//@ chunk-j3nx1xyn.js:1179-1325 placement = isConnectionError (1)
/**
 * 错误码是否属于可重试的瞬时网络/文件错误。
 */
function isStdinUnusableError(err) {
  let code =
    err !== null && typeof err === "object" && "code" in err && typeof err.code === "string"
      ? err.code
      : undefined;
  return code !== undefined && (_.has(code) || STREAM_GONE_CODES.has(code));
}
//@ chunk-j3nx1xyn.js:1325-1439 placement = registerProcessOutputErrorHandlers (0.639)
/**
 * stdout/stderr 管道断开（EPIPE 等）时销毁流并回调，不让进程崩溃。
 */
function handleStreamGoneErrors(stream, onGone) {
  stream.on("error", (error) => {
    if (error.code !== undefined && STREAM_GONE_CODES.has(error.code)) {
      try {
        stream.destroy?.();
      } catch {}
      onGone?.(error.code);
    }
  });
}
//@ chunk-j3nx1xyn.js:1439-1655 placement
/**
 * 为 stdin/stdout/stderr 注册断流处理。
 */
function registerProcessIOErrorHandlers(onStreamError) {
  handleStreamGoneErrors(process.stdin, (code) => onStreamError("stdin", code));
  handleStreamGoneErrors(process.stdout, (code) => onStreamError("stdout", code));
  process.stdout.on("error", () => {
    stdoutDrain.markErrored();
  });
  handleStreamGoneErrors(process.stderr);
  process.stderr.on("error", () => {
    stderrWriter.giveUpOnUnflushed();
  });
}
//@ chunk-j3nx1xyn.js:1655-1771 placement
/**
 * 写流并返回 accepted/backed-up/dropped。
 */
function writeOut(stream, data, callback) {
  if (stream.destroyed || stream.writableEnded) return "dropped";
  return stream.write(data, callback) === false ? "backed-up" : "accepted";
}
//@ chunk-j3nx1xyn.js:1771-3294 placement
class StdoutDrainState {
  everWritten = false;
  drainPromise = undefined;
  bytesQueued = 0;
  bytesFlushed = 0;
  notifyFlushProgress = undefined;
  notifyExternallyClocked = undefined;
  externallyClockedPromise = undefined;
  externallyClocked = false;
  errored = false;
  flushConfirmedPromise = undefined;
  flushCloseListener = undefined;
  markEverWritten() {
    this.everWritten = true;
  }
  recordQueued(bytes) {
    this.bytesQueued += bytes;
  }
  recordFlushed(bytes) {
    this.bytesFlushed += bytes;
    this.notifyFlushProgress?.();
  }
  markErrored() {
    this.errored = true;
    this.notifyFlushProgress?.();
  }
  outstandingBytes() {
    return process.stdout.destroyed || this.errored ? 0 : this.bytesQueued - this.bytesFlushed;
  }
  endStdoutOnce() {
    if (this.drainPromise === undefined) {
      let stdout = process.stdout;
      if (stdout.isTTY || stdout.destroyed || stdout.writableEnded || !this.everWritten) return;
      this.drainPromise = new Promise((resolve) => stdout.end(resolve));
    }
    return this.drainPromise;
  }
  fullyFlushed() {
    if (this.flushConfirmedPromise === undefined)
      this.flushConfirmedPromise = new Promise((resolve) => {
        let onDrained = () => {
          if (this.outstandingBytes() <= 0) {
            this.notifyFlushProgress = undefined;
            resolve();
          }
        };
        this.notifyFlushProgress = onDrained;
        this.flushCloseListener = onDrained;
        process.stdout.once("close", onDrained);
        onDrained();
      });
    return this.flushConfirmedPromise;
  }
  isExternallyClocked() {
    return this.externallyClocked;
  }
  ensureExternallyClockedPromise() {
    return (this.externallyClockedPromise ??= new Promise((resolve) => {
      this.notifyExternallyClocked = resolve;
    }));
  }
  markExternallyClocked() {
    this.externallyClocked = true;
    this.ensureExternallyClockedPromise();
    this.notifyExternallyClocked?.();
    this.notifyExternallyClocked = undefined;
  }
  reset() {
    if (this.flushCloseListener !== undefined)
      process.stdout.removeListener("close", this.flushCloseListener);
    Object.assign(this, new StdoutDrainState());
  }
}
//@ chunk-j3nx1xyn.js:3294-3306 placement
var stdoutDrain; // deferred: uses StdoutDrainState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j3nx1xyn.js:3294", () => {
  stdoutDrain = new StdoutDrainState();
});
//@ chunk-j3nx1xyn.js:3306-3448 placement
/**
 * writeToStdout：写 stdout 并记录排队/已刷字节（退出前排空用）。
 */
function writeToStdout(text) {
  stdoutDrain.markEverWritten();
  let byteLength = Buffer.byteLength(text);
  if (
    writeOut(process.stdout, text, () => {
      stdoutDrain.recordFlushed(byteLength);
    }) !== "dropped"
  )
    stdoutDrain.recordQueued(byteLength);
}
//@ chunk-j3nx1xyn.js:3448-3681 placement
/**
 * drainStdoutBeforeExit：结束 stdout 并等待刷完，超时按积压字节放宽（上限 30 s）。
 */
async function drainStdoutBeforeExit(budgetMs = 2000, { scaleBudgetToQueue = true } = {}) {
  let endPromise = stdoutDrain.endStdoutOnce();
  if (endPromise === undefined) return;
  let results = Promise.all([endPromise, stdoutDrain.fullyFlushed()]);
  await withTimeout(
    scaleBudgetToQueue ? Promise.race([results, waitExternallyClocked(budgetMs)]) : results,
    scaleBudgetToQueue ? getStdoutDrainBudgetMs(budgetMs) : budgetMs,
    "stdout drain timeout (exit)",
  ).catch(() => {});
}
//@ chunk-j3nx1xyn.js:3681-3722 placement
/**
 * 声明 stdout 排空由外部时钟驱动（信号退出时）。
 */
function markStdoutDrainExternallyClocked() {
  stdoutDrain.markExternallyClocked();
}
//@ chunk-j3nx1xyn.js:3722-3768 placement
/**
 * 退出是否由外部时钟驱动。
 */
function isExitExternallyClocked() {
  return stdoutDrain.isExternallyClocked();
}
//@ chunk-j3nx1xyn.js:3768-3839 placement
function waitExternallyClocked(delayMs) {
  return stdoutDrain.ensureExternallyClockedPromise().then(() => sleep(delayMs));
}
//@ chunk-j3nx1xyn.js:3839-3860 placement
var STDOUT_DRAIN_BYTES_PER_SEC = 262144;
var MAX_STDOUT_DRAIN_MS = 30000;
//@ chunk-j3nx1xyn.js:3860-3903 placement
/**
 * stdout 尚未刷出的字节数。
 */
function outstandingStdoutBytes() {
  return stdoutDrain.outstandingBytes();
}
//@ chunk-j3nx1xyn.js:3903-3979 placement
/**
 * 按积压字节估算 stdout 排空预算（2 s 起，最多 30 s）。
 */
function getStdoutDrainBudgetMs(budgetMs = 2000) {
  return Math.min(
    MAX_STDOUT_DRAIN_MS,
    Math.max(budgetMs, Math.ceil((outstandingStdoutBytes() * 1000) / STDOUT_DRAIN_BYTES_PER_SEC)),
  );
}
//@ chunk-j3nx1xyn.js:3979-4014 placement
var STDERR_BACKLOG_BYTES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var STDERR_BACKLOG_MS;
var stderrScheduler;
deferInit("chunk-j3nx1xyn.js:3979", () => {
  STDERR_BACKLOG_BYTES = 1048576;
  STDERR_BACKLOG_MS = 1e4;
  stderrScheduler = bindAsyncResource((task) => task());
});
//@ chunk-j3nx1xyn.js:4014-4872 placement
class StderrWriter {
  unflushed = {
    length: 0,
    since: 0,
  };
  droppedCount = 0;
  droppedTotal = 0;
  write(chunk, mayDrop) {
    let unflushed = this.unflushed;
    if (
      mayDrop &&
      unflushed.length >= STDERR_BACKLOG_BYTES &&
      (this.droppedCount > 0 || Date.now() - unflushed.since >= STDERR_BACKLOG_MS)
    ) {
      this.droppedCount++;
      this.droppedTotal++;
      return;
    }
    let state = "writing";
    let onWritten = () => {
      let wasUnflushed = state === "unflushed";
      state = "flushed";
      if (wasUnflushed) {
        unflushed.length -= chunk.length;
        this.reportDropped();
      }
    };
    if (
      stderrScheduler(() => writeOut(process.stderr, chunk, onWritten)) === "backed-up" &&
      state === "writing"
    ) {
      state = "unflushed";
      if (unflushed.length === 0) unflushed.since = Date.now();
      unflushed.length += chunk.length;
    }
  }
  giveUpOnUnflushed() {
    this.unflushed = {
      length: 0,
      since: 0,
    };
    this.reportDropped();
  }
  getDroppedTotal() {
    return this.droppedTotal;
  }
  reset() {
    Object.assign(this, new StderrWriter());
  }
  reportDropped() {
    if (this.droppedCount > 0 && this.unflushed.length < STDERR_BACKLOG_BYTES) {
      let droppedCount = this.droppedCount;
      this.droppedCount = 0;
      this.write(
        `[stderr messages dropped before this line: ${droppedCount}. Whatever reads this stderr had not caught up for over 10 s and 1 MiB of output.]
`,
        false,
      );
    }
  }
}
//@ chunk-j3nx1xyn.js:4872-4903 placement
var stderrWriter; // deferred: uses StderrWriter of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j3nx1xyn.js:4872", () => {
  stderrWriter = identity(new StderrWriter(), (writer) => writer.reset());
});
//@ chunk-j3nx1xyn.js:4903-4949 placement
/**
 * writeToStderr：积压超过 10 s 且 1 MiB 时可丢弃消息并在下一行注明。
 */
function writeToStderr(text, { mayDrop = false } = {}) {
  stderrWriter.write(text, mayDrop);
}
//@ chunk-j3nx1xyn.js:4949-4991 placement
/**
 * 累计丢弃的 stderr 消息数。
 */
function getStderrDroppedTotal() {
  return stderrWriter.getDroppedTotal();
}
//@ chunk-j3nx1xyn.js:4991-5072 placement
/**
 * exitWithError：console.error 后以 1 退出。
 */
function exitWithError(message) {
  console.error(message);
  if (!isDisklessProcess()) setBgExitCause("exit_with_error");
  process.exit(1);
}
//@ chunk-j3nx1xyn.js:5072-5412 placement = peekForStdinData (0.714)
/**
 * peekForStdinData：在超时内探测 stdin 是否有数据或已结束。
 */
function peekForStdinData(stream, ms) {
  let readable = stream;
  if (readable.readableEnded || readable.destroyed) return Promise.resolve(false);
  return new Promise((resolve) => {
    let done = (timedOut) => {
      clearTimeout(peek);
      stream.off("end", onEnd);
      stream.off("close", onEnd);
      stream.off("data", onFirstData);
      resolve(timedOut);
    };
    let onEnd = () => done(false);
    let onFirstData = () => {
      clearTimeout(peek);
      if (readable.readableEnded || readable.destroyed) done(false);
    };
    let peek = setTimeout(done, ms, true);
    stream.once("end", onEnd);
    stream.once("close", onEnd);
    stream.once("data", onFirstData);
  });
}
//@ chunk-j3nx1xyn.js:5412-5801 placement
async function* iterateStreamUntilClose(stdin) {
  if (stdin.readableEnded || stdin.destroyed) return;
  let closedSentinel = Symbol("stream-closed");
  let closed = false;
  let onClosed = null;
  let handleClose = () => {
    closed = true;
    onClosed?.();
  };
  stdin.once("close", handleClose);
  let iterator = stdin[Symbol.asyncIterator]();
  try {
    while (!closed) {
      let nextResult = iterator.next();
      nextResult.catch(() => {});
      let promise = new Promise((resolve) => {
        onClosed = () => resolve(closedSentinel);
      });
      let winner = await Promise.race([nextResult, promise]);
      onClosed = null;
      if (winner === closedSentinel || winner.done) return;
      yield String(winner.value);
    }
  } finally {
    stdin.off("close", handleClose);
    iterator.return?.().catch(() => {});
  }
}
//@ chunk-fy5kn7m3.js:27151-27228 placement = NEWLINE (1)
async function writeStdStreamOrThrow(streamName, data) {
  if (!(await writeStream(process[streamName], data)) && streamName === "stdout")
    throw new GhApiResponseError();
}
//@ chunk-fy5kn7m3.js:27228-27481 placement
function writeStream(stream, data) {
  if (stream.destroyed || stream.writableEnded) return Promise.resolve(false);
  let { promise, resolve } = Promise.withResolvers();
  let fail = () => resolve(false);
  stream.once("error", fail);
  stream.once("close", fail);
  stream.write(data, (writeError) => resolve(!writeError));
  return promise.finally(() => {
    stream.off("error", fail);
    stream.off("close", fail);
  });
}
//@ chunk-ksvdmrg0.js:32581-32635 fingerprint = writeOut (1)
function writeOut_2(stream, data) {
  if (stream.destroyed) return;
  stream.end(
    jsonStringify(data) +
      `
`,
  );
}
//@ chunk-24t3dkzb.js:4009-4238 fingerprint = handleEPIPE (0.407)
/**
 * 写 stdout，容忍死管道（EIO/EPIPE）时标记 stdoutDead。
 */
function handleEPIPE(stats, text) {
  if (stats.stdoutDead) return;
  let startTime = performance.now();
  let bytes = Buffer.byteLength(text);
  try {
    stats.stdout.write(text);
  } catch (error) {
    if (
      stats.tolerateDeadStdout &&
      (getErrorCodeString(error) === "EIO" || getErrorCodeString(error) === "EPIPE")
    ) {
      stats.stdoutDead = true;
      recordSlowestWrite(stats, startTime, bytes);
      return;
    }
    throw error;
  }
  recordSlowestWrite(stats, startTime, bytes);
}
export {
  writeToStdout,
  iterateStreamUntilClose,
  isStdinUnusableError,
  peekForStdinData,
  writeOut,
  writeToStderr,
  markStdoutDrainExternallyClocked,
  outstandingStdoutBytes,
  handleEPIPE,
  getStderrDroppedTotal,
  STREAM_GONE_CODES,
  drainStdoutBeforeExit,
  exitWithError,
  handleStreamGoneErrors,
  registerProcessIOErrorHandlers,
  getStdoutDrainBudgetMs,
  writeStdStreamOrThrow,
  writeOut_2,
  isExitExternallyClocked,
};
