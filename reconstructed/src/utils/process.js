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
import { getErrorCodeString } from "./errors.js";
import { recordSlowestWrite } from "../ink/terminal.js";
import { jsonStringify } from "./slowOperations.js";

//@ chunk-j3nx1xyn.js:1084-1179 placement
var STREAM_GONE_CODES = new Set(["EPIPE", "EIO", "ENXIO", "EBADF"]);
var _ = new Set(["EISDIR", "ENOTCONN", "ECONNRESET"]);
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
function handleStreamGoneErrors(e, t) {
  e.on("error", (r) => {
    if (r.code !== undefined && STREAM_GONE_CODES.has(r.code)) {
      try {
        e.destroy?.();
      } catch {}
      t?.(r.code);
    }
  });
}
//@ chunk-j3nx1xyn.js:1439-1655 placement
/**
 * 为 stdin/stdout/stderr 注册断流处理。
 */
function registerProcessIOErrorHandlers(e) {
  handleStreamGoneErrors(process.stdin, (t) => e("stdin", t));
  handleStreamGoneErrors(process.stdout, (t) => e("stdout", t));
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
function writeOut(stream, data, r) {
  if (stream.destroyed || stream.writableEnded) return "dropped";
  return stream.write(data, r) === false ? "backed-up" : "accepted";
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
  recordQueued(e) {
    this.bytesQueued += e;
  }
  recordFlushed(e) {
    this.bytesFlushed += e;
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
        let t = () => {
          if (this.outstandingBytes() <= 0) {
            this.notifyFlushProgress = undefined;
            resolve();
          }
        };
        this.notifyFlushProgress = t;
        this.flushCloseListener = t;
        process.stdout.once("close", t);
        t();
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
var stdoutDrain = new StdoutDrainState();
//@ chunk-j3nx1xyn.js:3306-3448 placement
/**
 * writeToStdout：写 stdout 并记录排队/已刷字节（退出前排空用）。
 */
function writeToStdout(e) {
  stdoutDrain.markEverWritten();
  let t = Buffer.byteLength(e);
  if (
    writeOut(process.stdout, e, () => {
      stdoutDrain.recordFlushed(t);
    }) !== "dropped"
  )
    stdoutDrain.recordQueued(t);
}
//@ chunk-j3nx1xyn.js:3448-3681 placement
/**
 * drainStdoutBeforeExit：结束 stdout 并等待刷完，超时按积压字节放宽（上限 30 s）。
 */
async function drainStdoutBeforeExit(e = 2000, { scaleBudgetToQueue = true } = {}) {
  let r = stdoutDrain.endStdoutOnce();
  if (r === undefined) return;
  let results = Promise.all([r, stdoutDrain.fullyFlushed()]);
  await withTimeout(
    scaleBudgetToQueue ? Promise.race([results, waitExternallyClocked(e)]) : results,
    scaleBudgetToQueue ? getStdoutDrainBudgetMs(e) : e,
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
function waitExternallyClocked(e) {
  return stdoutDrain.ensureExternallyClockedPromise().then(() => sleep(e));
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
function getStdoutDrainBudgetMs(e = 2000) {
  return Math.min(
    MAX_STDOUT_DRAIN_MS,
    Math.max(e, Math.ceil((outstandingStdoutBytes() * 1000) / STDOUT_DRAIN_BYTES_PER_SEC)),
  );
}
//@ chunk-j3nx1xyn.js:3979-4014 placement
var STDERR_BACKLOG_BYTES = 1048576;
var STDERR_BACKLOG_MS = 1e4;
var stderrScheduler = bindAsyncResource((e) => e());
//@ chunk-j3nx1xyn.js:4014-4872 placement
class StderrWriter {
  unflushed = {
    length: 0,
    since: 0,
  };
  droppedCount = 0;
  droppedTotal = 0;
  write(e, t) {
    let unflushed = this.unflushed;
    if (
      t &&
      unflushed.length >= STDERR_BACKLOG_BYTES &&
      (this.droppedCount > 0 || Date.now() - unflushed.since >= STDERR_BACKLOG_MS)
    ) {
      this.droppedCount++;
      this.droppedTotal++;
      return;
    }
    let n = "writing";
    let o = () => {
      let d = n === "unflushed";
      n = "flushed";
      if (d) {
        unflushed.length -= e.length;
        this.reportDropped();
      }
    };
    if (stderrScheduler(() => writeOut(process.stderr, e, o)) === "backed-up" && n === "writing") {
      n = "unflushed";
      if (unflushed.length === 0) unflushed.since = Date.now();
      unflushed.length += e.length;
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
var stderrWriter = identity(new StderrWriter(), (e) => e.reset());
//@ chunk-j3nx1xyn.js:4903-4949 placement
/**
 * writeToStderr：积压超过 10 s 且 1 MiB 时可丢弃消息并在下一行注明。
 */
function writeToStderr(e, { mayDrop = false } = {}) {
  stderrWriter.write(e, mayDrop);
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
  let r = stream;
  if (r.readableEnded || r.destroyed) return Promise.resolve(false);
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
      if (r.readableEnded || r.destroyed) done(false);
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
  let t = Symbol("stream-closed");
  let r = false;
  let n = null;
  let o = () => {
    r = true;
    n?.();
  };
  stdin.once("close", o);
  let s = stdin[Symbol.asyncIterator]();
  try {
    while (!r) {
      let d = s.next();
      d.catch(() => {});
      let promise = new Promise((resolve) => {
        n = () => resolve(t);
      });
      let winner = await Promise.race([d, promise]);
      n = null;
      if (winner === t || winner.done) return;
      yield String(winner.value);
    }
  } finally {
    stdin.off("close", o);
    s.return?.().catch(() => {});
  }
}
//@ chunk-fy5kn7m3.js:27151-27228 placement = NEWLINE (1)
async function writeStdStreamOrThrow(e, t) {
  if (!(await writeStream(process[e], t)) && e === "stdout") throw new GhApiResponseError();
}
//@ chunk-fy5kn7m3.js:27228-27481 placement
function writeStream(e, t) {
  if (e.destroyed || e.writableEnded) return Promise.resolve(false);
  let { promise, resolve } = Promise.withResolvers();
  let n = () => resolve(false);
  e.once("error", n);
  e.once("close", n);
  e.write(t, (a) => resolve(!a));
  return promise.finally(() => {
    e.off("error", n);
    e.off("close", n);
  });
}
//@ chunk-24t3dkzb.js:4009-4238 fingerprint = handleEPIPE (0.407)
/**
 * 写 stdout，容忍死管道（EIO/EPIPE）时标记 stdoutDead。
 */
function handleEPIPE(terminal, n) {
  if (terminal.stdoutDead) return;
  let startTime = performance.now();
  let bytes = Buffer.byteLength(n);
  try {
    terminal.stdout.write(n);
  } catch (error) {
    if (
      terminal.tolerateDeadStdout &&
      (getErrorCodeString(error) === "EIO" || getErrorCodeString(error) === "EPIPE")
    ) {
      terminal.stdoutDead = true;
      recordSlowestWrite(terminal, startTime, bytes);
      return;
    }
    throw error;
  }
  recordSlowestWrite(terminal, startTime, bytes);
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
export {
  writeToStdout,
  iterateStreamUntilClose,
  isStdinUnusableError,
  writeOut,
  peekForStdinData,
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
