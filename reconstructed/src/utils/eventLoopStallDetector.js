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
import { di } from "../ink/terminal.js";
import { HostScoped } from "./hostScoped.js";

/**
 * 读取 /proc/self/timerslack_ns
 */
//@ chunk-21bgerjr.js:627-1218 placement
class TimerSlackReader {
  fd;
  buffer = Buffer.alloc(32);
  constructor(e) {
    this.fd = e;
  }
  static open(e = "/proc/self/timerslack_ns") {
    let s;
    try {
      s = openSync(e, constants.O_RDONLY | READ_LIMITS);
    } catch (error) {
      let r = getErrnoCode(error);
      if (r !== "ENOENT" && r !== "ENOTDIR")
        logForDebugging(
          `[event-loop-stall] could not open ${e} (${r ?? errorMessage(error)}); stalls will be reported without allowing for timer slack`,
        );
      return null;
    }
    let o = new TimerSlackReader(s);
    if (o.readMs() !== null) return o;
    return (o.close(), null);
  }
  readMs() {
    try {
      let e = readSync(this.fd, this.buffer, 0, this.buffer.length, 0),
        s = /^(\d+)\n$/.exec(this.buffer.toString("latin1", 0, e))?.[1];
      return s === void 0 ? null : Number(s) / 1e6;
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
var f = 200,
  D = 1000,
  C = 1e4,
  O = 30000,
  p = 500,
  F = 1e4,
  A = 5000,
  g = 50,
  E = 300000;
/**
 * 采样 CPU 与缺页；本模块是事件循环卡顿检测器，读取 /proc/self/timerslack_ns 区分睡眠唤醒与真实卡顿，并报告阻塞写。
 */
//@ chunk-21bgerjr.js:1282-1555 placement
function sampleCpuAndPageFaults() {
  try {
    let resourceUsage = process.resourceUsage();
    return {
      cpuTimeMs: (resourceUsage.userCPUTime + resourceUsage.systemCPUTime) / 1000,
      majorPageFaults: resourceUsage.majorPageFault,
    };
  } catch (error) {
    return (
      logForDebugging(
        `[event-loop-stall] process.resourceUsage() failed: ${error instanceof Error ? error.message : String(error)}`,
        { level: "error" },
      ),
      null
    );
  }
}
/**
 * 采样进程内存
 */
//@ chunk-21bgerjr.js:1555-1863 placement
function sampleMemory() {
  try {
    let memoryUsage = process.memoryUsage();
    return {
      rss_mb: Math.round(memoryUsage.rss / 1024 / 1024),
      heap_used_mb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      ext_mb: Math.round(memoryUsage.external / 1024 / 1024),
    };
  } catch (error) {
    return (
      logForDebugging(
        `[event-loop-stall] process.memoryUsage() failed: ${error instanceof Error ? error.message : String(error)}`,
        { level: "error" },
      ),
      null
    );
  }
}
/**
 * 计算卡顿与时钟漂移
 */
//@ chunk-21bgerjr.js:1863-2242 placement
function measureStall({
  prevWallMs: prevWallMs,
  prevMonotonicMs: prevMonotonicMs,
  nowWallMs: nowWallMs,
  nowMonotonicMs: nowMonotonicMs,
  intervalMs: intervalMs,
  timerSlackMs: timerSlackMs,
  cpuMs: cpuMs,
}) {
  let S = nowWallMs - prevWallMs,
    h = nowMonotonicMs - prevMonotonicMs,
    u = S - intervalMs,
    rounded = Math.round(h - intervalMs),
    w = u - rounded,
    min = Math.min(timerSlackMs ?? 0, F, Math.max(rounded - cpuMs, 0)),
    T = rounded - min > p,
    v = u - min > p || T;
  return {
    wallElapsedMs: S,
    wallDriftMs: u,
    monotonicStallMs: rounded,
    clockJumpMs: w,
    timerSlackMs: timerSlackMs,
    isStall: v,
    isLateWithinTimerSlack: !v && (u > p || rounded > p),
    isMonotonicStall: T,
    likelySleep: u > A,
  };
}
/**
 * 卡顿期间是否有阻塞写
 */
//@ chunk-21bgerjr.js:2242-2525 placement
function blockedWriteFacts({
  write: write,
  isMonotonicStall: isMonotonicStall,
  prevMonotonicMs: prevMonotonicMs,
  nowMonotonicMs: nowMonotonicMs,
  intervalMs: intervalMs,
}) {
  if (!isMonotonicStall || write === void 0 || write.endedMs < prevMonotonicMs) return { blocked_write: !1 };
  let m = prevMonotonicMs + intervalMs;
  return {
    blocked_write: write.startedMs <= m + g && write.endedMs >= nowMonotonicMs - g,
    last_write_ms: Math.round(write.endedMs - write.startedMs),
    last_write_bytes: write.bytes,
  };
}
//@ chunk-21bgerjr.js:2525-2691 placement
function startEventLoopStallDetector(e, s) {
  let of = j.of(e),
    n = env.CLAUDE_CODE_REMOTE ? D : f,
    r = env.CLAUDE_CODE_REMOTE ? { intervalMs: C, afterQuietMs: O } : void 0;
  if (s === void 0) of.start(n, r);
  else of.start(n, r, s);
}
/**
 * 事件循环卡顿检测器
 */
//@ chunk-21bgerjr.js:2691-7193 placement
class EventLoopStallDetector {
  timer = null;
  intervalMs = f;
  activeIntervalMs = f;
  rest = void 0;
  quietMs = 0;
  stopListeningForWork = () => {};
  rssSampleTicks = E / f;
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
  sigcontSeen = !1;
  listensForSigcont = !1;
  onSigcont = () => {
    this.sigcontSeen = !0;
  };
  afterTick = (e, s, o, n, r) => {
    let m = this.listensForSigcont ? this.sigcontSeen : void 0;
    if (((this.sigcontSeen = !1), !e.isStall || s === null)) return;
    (logForDebugging(
      `[event-loop-stall] blocked for ${e.monotonicStallMs}ms monotonic (wall drift ${e.wallDriftMs}ms, clock jump ${e.clockJumpMs}ms, expected ${r}ms). Total stalls: ${this.totalStalls}, cumulative: ${this.totalMonotonicStallMs}ms monotonic / ${this.totalStallDurationMs}ms wall${e.likelySleep ? " [likely sleep/wake]" : ""} blocked_write=${s.blocked_write}` +
        (s.last_write_ms !== void 0 ? ` last_write=${s.last_write_ms}ms/${s.last_write_bytes}B` : "") +
        ` sigcont=${m ?? "n/a"} timer_slack=${e.timerSlackMs === void 0 ? "n/a" : `${e.timerSlackMs}ms`}` +
        (o ? ` cpu=${o.cpu_delta_ms}ms majflt=${o.major_fault_delta}` : "") +
        (n ? ` rss=${n.rss_mb}MB heap=${n.heap_used_mb}MB ext=${n.ext_mb}MB` : ""),
      { level: "warn" },
    ),
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
        timer_slack_ms: e.timerSlackMs === void 0 ? void 0 : Math.round(e.timerSlackMs),
        ...o,
        ...n,
        ...s,
        sigcont: m,
        nonblocking_stdout: isNonBlockingStdoutInstalled(),
      }));
  };
  start(e, s, o = { attributeSigcont: !0 }) {
    if (this.timer !== null) return;
    if (
      ((this.activeIntervalMs = e),
      (this.rest = s),
      (this.timerSlack = TimerSlackReader.open()),
      this.openWindow(),
      o.attributeSigcont)
    )
      ((this.listensForSigcont = !0), process.on("SIGCONT", this.onSigcont));
    if (
      (logForDebugging(
        `[event-loop-stall] detector started (interval=${e}ms${s ? `, at rest ${s.intervalMs}ms` : ""}, threshold=${p}ms)`,
      ),
      s !== void 0)
    )
      this.stopListeningForWork = onWorkStarted(() => {
        if (this.intervalMs === this.activeIntervalMs) this.quietMs = 0;
        else
          try {
            this.tick();
          } catch (error) {
            (logError(error), this.openWindow(), this.arm(this.activeIntervalMs));
          }
      });
    this.arm(e);
  }
  stop() {
    if ((this.stopListeningForWork(), this.listensForSigcont))
      (process.off("SIGCONT", this.onSigcont), (this.listensForSigcont = !1), (this.sigcontSeen = !1));
    if (this.timer !== null) (clearInterval(this.timer), (this.timer = null));
    (this.timerSlack?.close(), (this.timerSlack = null));
  }
  [Symbol.dispose]() {
    this.stop();
  }
  openWindow() {
    ((this.lastTickMs = Date.now()),
      (this.lastTickMonotonicMs = performance.now()),
      (this.lastResourceSample = sampleCpuAndPageFaults()),
      (this.lastTimerSlackMs = this.timerSlack?.readMs() ?? null));
  }
  arm(e) {
    if (((this.quietMs = 0), this.timer !== null)) {
      if (this.intervalMs === e) return;
      clearInterval(this.timer);
    }
    ((this.intervalMs = e),
      (this.rssSampleTicks = Math.round(E / e)),
      (this.timer = setInterval(this.tick, e)),
      this.timer.unref());
  }
  tick = () => {
    let intervalMs = this.intervalMs,
      now = Date.now(),
      startTime = performance.now(),
      n = this.timerSlack?.readMs() ?? null,
      r = sampleCpuAndPageFaults(),
      min = Math.min(intervalMs, Math.round(startTime - this.lastTickMonotonicMs)),
      c = measureStall({
        prevWallMs: this.lastTickMs,
        prevMonotonicMs: this.lastTickMonotonicMs,
        nowWallMs: now,
        nowMonotonicMs: startTime,
        intervalMs: min,
        timerSlackMs:
          n === null && this.lastTimerSlackMs === null
            ? void 0
            : Math.max(n ?? 0, this.lastTimerSlackMs ?? 0),
        cpuMs:
          r && this.lastResourceSample
            ? r.cpuTimeMs - this.lastResourceSample.cpuTimeMs
            : Number.POSITIVE_INFINITY,
      });
    this.tickCount++;
    let S = di().get(process.stdout)?.takeSlowestFrameWrite();
    if (c.isStall) {
      if ((this.totalStalls++, (this.totalStallDurationMs += Math.max(c.wallDriftMs, 0)), c.isMonotonicStall))
        this.totalMonotonicStallMs += c.monotonicStallMs;
      let h = sampleMemory(),
        u =
          r && this.lastResourceSample
            ? {
                cpu_delta_ms: Math.round(r.cpuTimeMs - this.lastResourceSample.cpuTimeMs),
                major_fault_delta: r.majorPageFaults - this.lastResourceSample.majorPageFaults,
              }
            : null,
        M = blockedWriteFacts({
          write: S,
          isMonotonicStall: c.isMonotonicStall,
          prevMonotonicMs: this.lastTickMonotonicMs,
          nowMonotonicMs: startTime,
          intervalMs: min,
        });
      setImmediate(this.afterTick, c, M, u, h, intervalMs);
    }
    if (!c.isStall) setImmediate(this.afterTick, c, null, null, null, intervalMs);
    if (c.isLateWithinTimerSlack) this.totalLateWithinTimerSlack++;
    if (c.likelySleep) di().get(process.stdout)?.reassertTerminalModes();
    ((this.lastTickMs = now),
      (this.lastTickMonotonicMs = startTime),
      (this.lastResourceSample = r),
      (this.lastTimerSlackMs = n),
      this.choosePeriod());
  };
  choosePeriod() {
    if (this.rest === void 0) return;
    if (hasActiveWork()) {
      this.arm(this.activeIntervalMs);
      return;
    }
    if (((this.quietMs += this.intervalMs), this.quietMs >= this.rest.afterQuietMs))
      this.arm(this.rest.intervalMs);
  }
}
//@ chunk-21bgerjr.js:7193-7216 placement
var j = new HostScoped(() => new EventLoopStallDetector());

export { sampleCpuAndPageFaults };
