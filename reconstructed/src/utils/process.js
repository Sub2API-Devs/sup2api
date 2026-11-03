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
import { ge } from "./identity.js";
import { kLi } from "./hostScoped.js";
import { setBgExitCause } from "./bgExitSidecars.js";
import { de } from "./github/ghApi.js";
import { getErrorCodeString } from "./_new/getErrorCodeString.js";
import { recordSlowestWrite } from "../ink/terminal.js";
import { jsonStringify } from "./slowOperations.js";

//@ chunk-j3nx1xyn.js:1084-1179 placement
var STREAM_GONE_CODES = new Set(["EPIPE", "EIO", "ENXIO", "EBADF"]),
  _ = new Set(["EISDIR", "ENOTCONN", "ECONNRESET"]);
/**
 * 错误码是否属于可重试的瞬时网络/文件错误。
 */
//@ chunk-j3nx1xyn.js:1179-1325 placement = isConnectionError (1)
function isStdinUnusableError(err) {
  let t =
    err !== null && typeof err === "object" && "code" in err && typeof err.code === "string"
      ? err.code
      : void 0;
  return t !== void 0 && (_.has(t) || STREAM_GONE_CODES.has(t));
}
/**
 * stdout/stderr 管道断开（EPIPE 等）时销毁流并回调，不让进程崩溃。
 */
//@ chunk-j3nx1xyn.js:1325-1439 placement = registerProcessOutputErrorHandlers (0.639)
function handleStreamGoneErrors(e, t) {
  e.on("error", (r) => {
    if (r.code !== void 0 && STREAM_GONE_CODES.has(r.code)) {
      try {
        e.destroy?.();
      } catch {}
      t?.(r.code);
    }
  });
}
/**
 * 为 stdin/stdout/stderr 注册断流处理。
 */
//@ chunk-j3nx1xyn.js:1439-1655 placement
function registerProcessIOErrorHandlers(e) {
  (handleStreamGoneErrors(process.stdin, (t) => e("stdin", t)),
    handleStreamGoneErrors(process.stdout, (t) => e("stdout", t)),
    process.stdout.on("error", () => {
      stdoutDrain.markErrored();
    }),
    handleStreamGoneErrors(process.stderr),
    process.stderr.on("error", () => {
      stderrWriter.giveUpOnUnflushed();
    }));
}
/**
 * 写流并返回 accepted/backed-up/dropped。
 */
//@ chunk-j3nx1xyn.js:1655-1771 placement
function writeOut(e, t, r) {
  if (e.destroyed || e.writableEnded) return "dropped";
  return e.write(t, r) === !1 ? "backed-up" : "accepted";
}
//@ chunk-j3nx1xyn.js:1771-3294 placement
class StdoutDrainState {
  everWritten = !1;
  drainPromise = void 0;
  bytesQueued = 0;
  bytesFlushed = 0;
  notifyFlushProgress = void 0;
  notifyExternallyClocked = void 0;
  externallyClockedPromise = void 0;
  externallyClocked = !1;
  errored = !1;
  flushConfirmedPromise = void 0;
  flushCloseListener = void 0;
  markEverWritten() {
    this.everWritten = !0;
  }
  recordQueued(e) {
    this.bytesQueued += e;
  }
  recordFlushed(e) {
    ((this.bytesFlushed += e), this.notifyFlushProgress?.());
  }
  markErrored() {
    ((this.errored = !0), this.notifyFlushProgress?.());
  }
  outstandingBytes() {
    return process.stdout.destroyed || this.errored ? 0 : this.bytesQueued - this.bytesFlushed;
  }
  endStdoutOnce() {
    if (this.drainPromise === void 0) {
      let stdout = process.stdout;
      if (stdout.isTTY || stdout.destroyed || stdout.writableEnded || !this.everWritten) return;
      this.drainPromise = new Promise((t) => stdout.end(t));
    }
    return this.drainPromise;
  }
  fullyFlushed() {
    if (this.flushConfirmedPromise === void 0)
      this.flushConfirmedPromise = new Promise((e) => {
        let t = () => {
          if (this.outstandingBytes() <= 0) ((this.notifyFlushProgress = void 0), e());
        };
        ((this.notifyFlushProgress = t), (this.flushCloseListener = t), process.stdout.once("close", t), t());
      });
    return this.flushConfirmedPromise;
  }
  isExternallyClocked() {
    return this.externallyClocked;
  }
  ensureExternallyClockedPromise() {
    return (this.externallyClockedPromise ??= new Promise((e) => {
      this.notifyExternallyClocked = e;
    }));
  }
  markExternallyClocked() {
    ((this.externallyClocked = !0),
      this.ensureExternallyClockedPromise(),
      this.notifyExternallyClocked?.(),
      (this.notifyExternallyClocked = void 0));
  }
  reset() {
    if (this.flushCloseListener !== void 0) process.stdout.removeListener("close", this.flushCloseListener);
    Object.assign(this, new StdoutDrainState());
  }
}
//@ chunk-j3nx1xyn.js:3294-3306 placement
var stdoutDrain = new StdoutDrainState();
/**
 * writeToStdout：写 stdout 并记录排队/已刷字节（退出前排空用）。
 */
//@ chunk-j3nx1xyn.js:3306-3448 placement
function writeToStdout(e) {
  stdoutDrain.markEverWritten();
  let byteLength = Buffer.byteLength(e);
  if (
    writeOut(process.stdout, e, () => {
      stdoutDrain.recordFlushed(byteLength);
    }) !== "dropped"
  )
    stdoutDrain.recordQueued(byteLength);
}
/**
 * drainStdoutBeforeExit：结束 stdout 并等待刷完，超时按积压字节放宽（上限 30 s）。
 */
//@ chunk-j3nx1xyn.js:3448-3681 placement
async function drainStdoutBeforeExit(e = 2000, { scaleBudgetToQueue: scaleBudgetToQueue = !0 } = {}) {
  let endStdoutOnce = stdoutDrain.endStdoutOnce();
  if (endStdoutOnce === void 0) return;
  let results = Promise.all([endStdoutOnce, stdoutDrain.fullyFlushed()]);
  await withTimeout(
    scaleBudgetToQueue ? Promise.race([results, waitExternallyClocked(e)]) : results,
    scaleBudgetToQueue ? getStdoutDrainBudgetMs(e) : e,
    "stdout drain timeout (exit)",
  ).catch(() => {});
}
/**
 * 声明 stdout 排空由外部时钟驱动（信号退出时）。
 */
//@ chunk-j3nx1xyn.js:3681-3722 placement
function markStdoutDrainExternallyClocked() {
  stdoutDrain.markExternallyClocked();
}
/**
 * 退出是否由外部时钟驱动。
 */
//@ chunk-j3nx1xyn.js:3722-3768 placement
function isExitExternallyClocked() {
  return stdoutDrain.isExternallyClocked();
}
//@ chunk-j3nx1xyn.js:3768-3839 placement
function waitExternallyClocked(e) {
  return stdoutDrain.ensureExternallyClockedPromise().then(() => sleep(e));
}
//@ chunk-j3nx1xyn.js:3839-3860 placement
var STDOUT_DRAIN_BYTES_PER_SEC = 262144,
  MAX_STDOUT_DRAIN_MS = 30000;
/**
 * stdout 尚未刷出的字节数。
 */
//@ chunk-j3nx1xyn.js:3860-3903 placement
function outstandingStdoutBytes() {
  return stdoutDrain.outstandingBytes();
}
/**
 * 按积压字节估算 stdout 排空预算（2 s 起，最多 30 s）。
 */
//@ chunk-j3nx1xyn.js:3903-3979 placement
function getStdoutDrainBudgetMs(e = 2000) {
  return Math.min(
    MAX_STDOUT_DRAIN_MS,
    Math.max(e, Math.ceil((outstandingStdoutBytes() * 1000) / STDOUT_DRAIN_BYTES_PER_SEC)),
  );
}
//@ chunk-j3nx1xyn.js:3979-4014 placement
var STDERR_BACKLOG_BYTES = 1048576,
  STDERR_BACKLOG_MS = 1e4,
  stderrScheduler = bindAsyncResource((e) => e());
//@ chunk-j3nx1xyn.js:4014-4872 placement
class StderrWriter {
  unflushed = { length: 0, since: 0 };
  droppedCount = 0;
  droppedTotal = 0;
  write(e, t) {
    let unflushed = this.unflushed;
    if (
      t &&
      unflushed.length >= STDERR_BACKLOG_BYTES &&
      (this.droppedCount > 0 || Date.now() - unflushed.since >= STDERR_BACKLOG_MS)
    ) {
      (this.droppedCount++, this.droppedTotal++);
      return;
    }
    let n = "writing",
      o = () => {
        let d = n === "unflushed";
        if (((n = "flushed"), d)) ((unflushed.length -= e.length), this.reportDropped());
      };
    if (stderrScheduler(() => writeOut(process.stderr, e, o)) === "backed-up" && n === "writing") {
      if (((n = "unflushed"), unflushed.length === 0)) unflushed.since = Date.now();
      unflushed.length += e.length;
    }
  }
  giveUpOnUnflushed() {
    ((this.unflushed = { length: 0, since: 0 }), this.reportDropped());
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
      ((this.droppedCount = 0),
        this.write(
          `[stderr messages dropped before this line: ${droppedCount}. Whatever reads this stderr had not caught up for over 10 s and 1 MiB of output.]
`,
          !1,
        ));
    }
  }
}
//@ chunk-j3nx1xyn.js:4872-4903 placement
var stderrWriter = ge(new StderrWriter(), (e) => e.reset());
/**
 * writeToStderr：积压超过 10 s 且 1 MiB 时可丢弃消息并在下一行注明。
 */
//@ chunk-j3nx1xyn.js:4903-4949 placement
function writeToStderr(e, { mayDrop: mayDrop = !1 } = {}) {
  stderrWriter.write(e, mayDrop);
}
/**
 * 累计丢弃的 stderr 消息数。
 */
//@ chunk-j3nx1xyn.js:4949-4991 placement
function getStderrDroppedTotal() {
  return stderrWriter.getDroppedTotal();
}
/**
 * exitWithError：console.error 后以 1 退出。
 */
//@ chunk-j3nx1xyn.js:4991-5072 placement
function exitWithError(message) {
  if ((console.error(message), !kLi())) setBgExitCause("exit_with_error");
  process.exit(1);
}
/**
 * peekForStdinData：在超时内探测 stdin 是否有数据或已结束。
 */
//@ chunk-j3nx1xyn.js:5072-5412 placement = peekForStdinData (0.714)
function peekForStdinData(stream, ms) {
  let r = stream;
  if (r.readableEnded || r.destroyed) return Promise.resolve(!1);
  return new Promise((resolve) => {
    let done = (timedOut) => {
        (clearTimeout(peek),
          stream.off("end", onEnd),
          stream.off("close", onEnd),
          stream.off("data", onFirstData),
          resolve(timedOut));
      },
      onEnd = () => done(!1),
      onFirstData = () => {
        if ((clearTimeout(peek), r.readableEnded || r.destroyed)) done(!1);
      },
      peek = setTimeout(done, ms, !0);
    (stream.once("end", onEnd), stream.once("close", onEnd), stream.once("data", onFirstData));
  });
}
//@ chunk-j3nx1xyn.js:5412-5801 placement
async function* iterateStreamUntilClose(e) {
  if (e.readableEnded || e.destroyed) return;
  let t = Symbol("stream-closed"),
    r = !1,
    n = null,
    o = () => {
      ((r = !0), n?.());
    };
  e.once("close", o);
  let s = e[Symbol.asyncIterator]();
  try {
    while (!r) {
      let d = s.next();
      d.catch(() => {});
      let promise = new Promise((g) => {
          n = () => g(t);
        }),
        winner = await Promise.race([d, promise]);
      if (((n = null), winner === t || winner.done)) return;
      yield String(winner.value);
    }
  } finally {
    (e.off("close", o), s.return?.().catch(() => {}));
  }
}
//@ chunk-fy5kn7m3.js:27151-27228 placement = NEWLINE (1)
async function writeStdStreamOrThrow(e, t) {
  if (!(await writeStream(process[e], t)) && e === "stdout") throw new de();
}
//@ chunk-fy5kn7m3.js:27228-27481 placement
function writeStream(e, t) {
  if (e.destroyed || e.writableEnded) return Promise.resolve(!1);
  let { promise: promise, resolve: resolve } = Promise.withResolvers(),
    n = () => resolve(!1);
  return (
    e.once("error", n),
    e.once("close", n),
    e.write(t, (a) => resolve(!a)),
    promise.finally(() => {
      (e.off("error", n), e.off("close", n));
    })
  );
}
/**
 * 写 stdout，容忍死管道（EIO/EPIPE）时标记 stdoutDead。
 */
//@ chunk-24t3dkzb.js:4009-4238 fingerprint = handleEPIPE (0.407)
function handleEPIPE(r, n) {
  if (r.stdoutDead) return;
  let startTime = performance.now(),
    byteLength = Buffer.byteLength(n);
  try {
    r.stdout.write(n);
  } catch (error) {
    if (
      r.tolerateDeadStdout &&
      (getErrorCodeString(error) === "EIO" || getErrorCodeString(error) === "EPIPE")
    ) {
      ((r.stdoutDead = !0), recordSlowestWrite(r, startTime, byteLength));
      return;
    }
    throw error;
  }
  recordSlowestWrite(r, startTime, byteLength);
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
