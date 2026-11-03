/**
 * utils/eventLoopStallDetector.ts
 *
 * 2.1.316 新增。事件循环卡顿检测：区分睡眠唤醒与真实卡顿，报告阻塞写、CPU、内存与缺页。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-21bgerjr.js (9)
 * attribution: placement 9
 */
import { openSync, constants, readSync, closeSync } from "fs";
import { READ_LIMITS } from "./fsBoundRead.js";
import { getErrnoCode, errorMessage } from "./errors.js";
import { logForDebugging } from "./debug.js";
import { env } from "./env.js";
import { logEvent } from "../services/analytics/index.js";
import { isNonBlockingStdoutInstalled } from "../ink/nonBlockingStdout.js";
import { onWorkStarted, hasActiveWork } from "./sessionActivity.js";
import { logError } from "./log.js";
import { getSecondRootError } from "../ink/terminal.js";
import { HostScoped } from "./hostScoped.js";

//@ chunk-21bgerjr.js:627-1218 placement
/**
 * 读取 /proc/self/timerslack_ns
 */
class TimerSlackReader {
  fd;
  buffer = Buffer.alloc(32);
  constructor(fd) {
    this.fd = fd;
  }
  static open(e = "/proc/self/timerslack_ns") {
    let s;
    try {
      s = openSync(e, constants.O_RDONLY | READ_LIMITS);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode !== "ENOENT" && errnoCode !== "ENOTDIR")
        logForDebugging(
          `[event-loop-stall] could not open ${e} (${errnoCode ?? errorMessage(error)}); stalls will be reported without allowing for timer slack`,
        );
      return null;
    }
    let o = new TimerSlackReader(s);
    if (o.readMs() !== null) return o;
    o.close();
    return null;
  }
  readMs() {
    try {
      let e = readSync(this.fd, this.buffer, 0, this.buffer.length, 0);
      let s = /^(\d+)\n$/.exec(this.buffer.toString("latin1", 0, e))?.[1];
      return s === undefined ? null : Number(s) / 1e6;
    } catch {
      return null;
    }
  }
  close() {
    try {
      closeSync(this.fd);
    } catch {}
  }
}
//@ chunk-21bgerjr.js:1218-1282 placement
var STALL_MAX_WAIT_MS = 200;
var STALL_CHECK_MS = 1000;
var STALL_HANG_MS = 1e4;
var STALL_CRITICAL_MS = 30000;
var CPU_SAMPLE_MS = 500;
var MEMORY_SAMPLE_MS = 1e4;
var MAJOR_FAULT_SAMPLE_MS = 5000;
var LOG_INTERVAL_MS = 50;
var MAX_STALL_MS = 300000;
//@ chunk-21bgerjr.js:1282-1555 placement
/**
 * 采样 CPU 与缺页；本模块是事件循环卡顿检测器，读取 /proc/self/timerslack_ns 区分睡眠唤醒与真实卡顿，并报告阻塞写。
 */
function sampleCpuAndPageFaults() {
  try {
    let e = process.resourceUsage();
    return {
      cpuTimeMs: (e.userCPUTime + e.systemCPUTime) / 1000,
      majorPageFaults: e.majorPageFault,
    };
  } catch (error) {
    logForDebugging(
      `[event-loop-stall] process.resourceUsage() failed: ${error instanceof Error ? error.message : String(error)}`,
      {
        level: "error",
      },
    );
    return null;
  }
}
//@ chunk-21bgerjr.js:1555-1863 placement
/**
 * 采样进程内存
 */
function sampleMemory() {
  try {
    let e = process.memoryUsage();
    return {
      rss_mb: Math.round(e.rss / 1024 / 1024),
      heap_used_mb: Math.round(e.heapUsed / 1024 / 1024),
      ext_mb: Math.round(e.external / 1024 / 1024),
    };
  } catch (error) {
    logForDebugging(
      `[event-loop-stall] process.memoryUsage() failed: ${error instanceof Error ? error.message : String(error)}`,
      {
        level: "error",
      },
    );
    return null;
  }
}
//@ chunk-21bgerjr.js:1863-2242 placement
/**
 * 计算卡顿与时钟漂移
 */
function measureStall({
  prevWallMs,
  prevMonotonicMs,
  nowWallMs,
  nowMonotonicMs,
  intervalMs,
  timerSlackMs,
  cpuMs,
}) {
  let S = nowWallMs - prevWallMs;
  let h = nowMonotonicMs - prevMonotonicMs;
  let u = S - intervalMs;
  let rounded = Math.round(h - intervalMs);
  let clockJumpMs = u - rounded;
  let min = Math.min(timerSlackMs ?? 0, MEMORY_SAMPLE_MS, Math.max(rounded - cpuMs, 0));
  let T = rounded - min > CPU_SAMPLE_MS;
  let v = u - min > CPU_SAMPLE_MS || T;
  return {
    wallElapsedMs: S,
    wallDriftMs: u,
    monotonicStallMs: rounded,
    clockJumpMs,
    timerSlackMs,
    isStall: v,
    isLateWithinTimerSlack: !v && (u > CPU_SAMPLE_MS || rounded > CPU_SAMPLE_MS),
    isMonotonicStall: T,
    likelySleep: u > MAJOR_FAULT_SAMPLE_MS,
  };
}
//@ chunk-21bgerjr.js:2242-2525 placement
/**
 * 卡顿期间是否有阻塞写
 */
function blockedWriteFacts({ write, isMonotonicStall, prevMonotonicMs, nowMonotonicMs, intervalMs }) {
  if (!isMonotonicStall || write === undefined || write.endedMs < prevMonotonicMs)
    return {
      blocked_write: false,
    };
  let m = prevMonotonicMs + intervalMs;
  return {
    blocked_write:
      write.startedMs <= m + LOG_INTERVAL_MS && write.endedMs >= nowMonotonicMs - LOG_INTERVAL_MS,
    last_write_ms: Math.round(write.endedMs - write.startedMs),
    last_write_bytes: write.bytes,
  };
}
//@ chunk-21bgerjr.js:2525-2691 placement
function startEventLoopStallDetector(e, s) {
  let o = eventLoopStallDetector.of(e);
  let n = env.CLAUDE_CODE_REMOTE ? STALL_CHECK_MS : STALL_MAX_WAIT_MS;
  let r = env.CLAUDE_CODE_REMOTE
    ? {
        intervalMs: STALL_HANG_MS,
        afterQuietMs: STALL_CRITICAL_MS,
      }
    : undefined;
  if (s === undefined) o.start(n, r);
  else o.start(n, r, s);
}
//@ chunk-21bgerjr.js:2691-7193 placement
/**
 * 事件循环卡顿检测器
 */
class EventLoopStallDetector {
  timer = null;
  intervalMs = STALL_MAX_WAIT_MS;
  activeIntervalMs = STALL_MAX_WAIT_MS;
  rest = undefined;
  quietMs = 0;
  stopListeningForWork = () => {};
  rssSampleTicks = MAX_STALL_MS / STALL_MAX_WAIT_MS;
  lastTickMs = 0;
  lastTickMonotonicMs = 0;
  totalStalls = 0;
  totalStallDurationMs = 0;
  totalMonotonicStallMs = 0;
  tickCount = 0;
  lastResourceSample = null;
  timerSlack = null;
  lastTimerSlackMs = null;
  totalLateWithinTimerSlack = 0;
  sigcontSeen = false;
  listensForSigcont = false;
  onSigcont = () => {
    this.sigcontSeen = true;
  };
  afterTick = (e, s, o, n, r) => {
    let sigcontSeen = this.listensForSigcont ? this.sigcontSeen : undefined;
    this.sigcontSeen = false;
    if (!e.isStall || s === null) return;
    logForDebugging(
      `[event-loop-stall] blocked for ${e.monotonicStallMs}ms monotonic (wall drift ${e.wallDriftMs}ms, clock jump ${e.clockJumpMs}ms, expected ${r}ms). Total stalls: ${this.totalStalls}, cumulative: ${this.totalMonotonicStallMs}ms monotonic / ${this.totalStallDurationMs}ms wall${e.likelySleep ? " [likely sleep/wake]" : ""} blocked_write=${s.blocked_write}` +
        (s.last_write_ms !== undefined ? ` last_write=${s.last_write_ms}ms/${s.last_write_bytes}B` : "") +
        ` sigcont=${sigcontSeen ?? "n/a"} timer_slack=${e.timerSlackMs === undefined ? "n/a" : `${e.timerSlackMs}ms`}` +
        (o ? ` cpu=${o.cpu_delta_ms}ms majflt=${o.major_fault_delta}` : "") +
        (n ? ` rss=${n.rss_mb}MB heap=${n.heap_used_mb}MB ext=${n.ext_mb}MB` : ""),
      {
        level: "warn",
      },
    );
    logEvent("tengu_event_loop_stall", {
      stall_duration_ms: e.wallDriftMs,
      expected_interval_ms: r,
      actual_interval_ms: e.wallElapsedMs,
      monotonic_stall_ms: e.monotonicStallMs,
      clock_jump_ms: e.clockJumpMs,
      total_stalls: this.totalStalls,
      total_late_within_timer_slack: this.totalLateWithinTimerSlack,
      cumulative_stall_ms: this.totalStallDurationMs,
      cumulative_monotonic_stall_ms: this.totalMonotonicStallMs,
      likely_sleep: e.likelySleep,
      timer_slack_ms: e.timerSlackMs === undefined ? undefined : Math.round(e.timerSlackMs),
      ...o,
      ...n,
      ...s,
      sigcont: sigcontSeen,
      nonblocking_stdout: isNonBlockingStdoutInstalled(),
    });
  };
  start(
    e,
    s,
    o = {
      attributeSigcont: true,
    },
  ) {
    if (this.timer !== null) return;
    this.activeIntervalMs = e;
    this.rest = s;
    this.timerSlack = TimerSlackReader.open();
    this.openWindow();
    if (o.attributeSigcont) {
      this.listensForSigcont = true;
      process.on("SIGCONT", this.onSigcont);
    }
    logForDebugging(
      `[event-loop-stall] detector started (interval=${e}ms${s ? `, at rest ${s.intervalMs}ms` : ""}, threshold=${CPU_SAMPLE_MS}ms)`,
    );
    if (s !== undefined)
      this.stopListeningForWork = onWorkStarted(() => {
        if (this.intervalMs === this.activeIntervalMs) this.quietMs = 0;
        else
          try {
            this.tick();
          } catch (error) {
            logError(error);
            this.openWindow();
            this.arm(this.activeIntervalMs);
          }
      });
    this.arm(e);
  }
  stop() {
    this.stopListeningForWork();
    if (this.listensForSigcont) {
      process.off("SIGCONT", this.onSigcont);
      this.listensForSigcont = false;
      this.sigcontSeen = false;
    }
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.timerSlack?.close();
    this.timerSlack = null;
  }
  [Symbol.dispose]() {
    this.stop();
  }
  openWindow() {
    this.lastTickMs = Date.now();
    this.lastTickMonotonicMs = performance.now();
    this.lastResourceSample = sampleCpuAndPageFaults();
    this.lastTimerSlackMs = this.timerSlack?.readMs() ?? null;
  }
  arm(e) {
    this.quietMs = 0;
    if (this.timer !== null) {
      if (this.intervalMs === e) return;
      clearInterval(this.timer);
    }
    this.intervalMs = e;
    this.rssSampleTicks = Math.round(MAX_STALL_MS / e);
    this.timer = setInterval(this.tick, e);
    this.timer.unref();
  }
  tick = () => {
    let intervalMs = this.intervalMs;
    let now = Date.now();
    let startTime = performance.now();
    let n = this.timerSlack?.readMs() ?? null;
    let r = sampleCpuAndPageFaults();
    let intervalMs_2 = Math.min(intervalMs, Math.round(startTime - this.lastTickMonotonicMs));
    let c = measureStall({
      prevWallMs: this.lastTickMs,
      prevMonotonicMs: this.lastTickMonotonicMs,
      nowWallMs: now,
      nowMonotonicMs: startTime,
      intervalMs: intervalMs_2,
      timerSlackMs:
        n === null && this.lastTimerSlackMs === null
          ? undefined
          : Math.max(n ?? 0, this.lastTimerSlackMs ?? 0),
      cpuMs:
        r && this.lastResourceSample
          ? r.cpuTimeMs - this.lastResourceSample.cpuTimeMs
          : Number.POSITIVE_INFINITY,
    });
    this.tickCount++;
    let write = getSecondRootError().get(process.stdout)?.takeSlowestFrameWrite();
    if (c.isStall) {
      this.totalStalls++;
      this.totalStallDurationMs += Math.max(c.wallDriftMs, 0);
      if (c.isMonotonicStall) this.totalMonotonicStallMs += c.monotonicStallMs;
      let h = sampleMemory();
      let u =
        r && this.lastResourceSample
          ? {
              cpu_delta_ms: Math.round(r.cpuTimeMs - this.lastResourceSample.cpuTimeMs),
              major_fault_delta: r.majorPageFaults - this.lastResourceSample.majorPageFaults,
            }
          : null;
      let M = blockedWriteFacts({
        write,
        isMonotonicStall: c.isMonotonicStall,
        prevMonotonicMs: this.lastTickMonotonicMs,
        nowMonotonicMs: startTime,
        intervalMs: intervalMs_2,
      });
      setImmediate(this.afterTick, c, M, u, h, intervalMs);
    }
    if (!c.isStall) setImmediate(this.afterTick, c, null, null, null, intervalMs);
    if (c.isLateWithinTimerSlack) this.totalLateWithinTimerSlack++;
    if (c.likelySleep) getSecondRootError().get(process.stdout)?.reassertTerminalModes();
    this.lastTickMs = now;
    this.lastTickMonotonicMs = startTime;
    this.lastResourceSample = r;
    this.lastTimerSlackMs = n;
    this.choosePeriod();
  };
  choosePeriod() {
    if (this.rest === undefined) return;
    if (hasActiveWork()) {
      this.arm(this.activeIntervalMs);
      return;
    }
    this.quietMs += this.intervalMs;
    if (this.quietMs >= this.rest.afterQuietMs) this.arm(this.rest.intervalMs);
  }
}
//@ chunk-21bgerjr.js:7193-7216 placement
var eventLoopStallDetector = new HostScoped(() => new EventLoopStallDetector());
export { sampleCpuAndPageFaults };
