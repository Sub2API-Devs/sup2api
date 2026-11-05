/**
 * utils/eventLoopStallDetector.ts
 *
 * 2.1.316 新增。事件循环卡顿检测：区分睡眠唤醒与真实卡顿，报告阻塞写、CPU、内存与缺页。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-3j1p954m.js (1), chunk-64z32qvd.js (10)
 * attribution: placement 10, affinity 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { openSync, constants, readSync, closeSync } from "fs";
import { READ_LIMITS } from "./fsBoundRead.js";
import { getErrnoCode, errorMessage } from "./errors.js";
import { logForDebugging } from "./debug.js";
import { env } from "./env.js";
import { logEvent } from "../services/analytics/index.js";
import { isDiskless, onInteraction } from "../bootstrap/state.js";
import { isNonBlockingStdoutInstalled } from "../ink/nonBlockingStdout.js";
import { onWorkStarted, emitProcessSlept, hasActiveWork } from "./sessionActivity.js";
import { logError } from "./log.js";
import { getSecondRootError } from "../ink/terminal.js";
import { HostScoped } from "./hostScoped.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-3j1p954m.js:191-203 placement
/**
 * 事件循环卡顿与 SSE 活性超时的最小容差毫秒数（10000）。
 */
var RELAY_TIMEOUT_MS = 1e4;
//@ chunk-64z32qvd.js:706-720 affinity
var DIGIT_CHAR_CODE_ZERO = 48;
var NEWLINE_CHAR_CODE = 10;
//@ chunk-64z32qvd.js:720-1405 placement
/**
 * 读取 /proc/self/timerslack_ns
 */
class TimerSlackReader {
  fd;
  buffer = Buffer.alloc(32);
  constructor(fd) {
    this.fd = fd;
  }
  static open(path = "/proc/self/timerslack_ns") {
    let fd;
    try {
      fd = openSync(path, constants.O_RDONLY | READ_LIMITS);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode !== "ENOENT" && errnoCode !== "ENOTDIR")
        logForDebugging(
          `[event-loop-stall] could not open ${path} (${errnoCode ?? errorMessage(error)}); stalls will be reported without allowing for timer slack`,
        );
      return null;
    }
    let reader = new TimerSlackReader(fd);
    if (reader.readMs() !== null) return reader;
    reader.close();
    return null;
  }
  readMs() {
    try {
      let lastIndex = readSync(this.fd, this.buffer, 0, this.buffer.length, 0) - 1;
      if (lastIndex < 1 || this.buffer[lastIndex] !== NEWLINE_CHAR_CODE) return null;
      let value = 0;
      for (let idx = 0; idx < lastIndex; idx++) {
        let digit = this.buffer[idx] - DIGIT_CHAR_CODE_ZERO;
        if (digit < 0 || digit > 9) return null;
        value = value * 10 + digit;
      }
      return lastIndex > 15 ? Number(this.buffer.toString("latin1", 0, lastIndex)) / 1e6 : value / 1e6;
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
//@ chunk-64z32qvd.js:1405-1469 placement
var STALL_MAX_WAIT_MS = 200;
var STALL_CHECK_MS = 1000;
var STALL_HANG_MS = 1e4;
var STALL_CRITICAL_MS = 30000;
var CPU_SAMPLE_MS = 500;
var MEMORY_SAMPLE_MS = 1e4;
var MAJOR_FAULT_SAMPLE_MS = 5000;
var LOG_INTERVAL_MS = 50;
var MAX_STALL_MS = 300000;
//@ chunk-64z32qvd.js:1469-1742 placement
/**
 * 采样 CPU 与缺页；本模块是事件循环卡顿检测器，读取 /proc/self/timerslack_ns 区分睡眠唤醒与真实卡顿，并报告阻塞写。
 */
function sampleCpuAndPageFaults() {
  try {
    let usage = process.resourceUsage();
    return {
      cpuTimeMs: (usage.userCPUTime + usage.systemCPUTime) / 1000,
      majorPageFaults: usage.majorPageFault,
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
//@ chunk-64z32qvd.js:1742-2050 placement
/**
 * 采样进程内存
 */
function sampleMemory() {
  try {
    let usage = process.memoryUsage();
    return {
      rss_mb: Math.round(usage.rss / 1024 / 1024),
      heap_used_mb: Math.round(usage.heapUsed / 1024 / 1024),
      ext_mb: Math.round(usage.external / 1024 / 1024),
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
//@ chunk-64z32qvd.js:2050-2429 placement
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
  let wallElapsedMs = nowWallMs - prevWallMs;
  let monotonicElapsedMs = nowMonotonicMs - prevMonotonicMs;
  let wallDriftMs = wallElapsedMs - intervalMs;
  let rounded = Math.round(monotonicElapsedMs - intervalMs);
  let clockJumpMs = wallDriftMs - rounded;
  let min = Math.min(timerSlackMs ?? 0, MEMORY_SAMPLE_MS, Math.max(rounded - cpuMs, 0));
  let isMonotonicStall = rounded - min > CPU_SAMPLE_MS;
  let isStall = wallDriftMs - min > CPU_SAMPLE_MS || isMonotonicStall;
  return {
    wallElapsedMs,
    wallDriftMs,
    monotonicStallMs: rounded,
    clockJumpMs,
    timerSlackMs,
    isStall,
    isLateWithinTimerSlack: !isStall && (wallDriftMs > CPU_SAMPLE_MS || rounded > CPU_SAMPLE_MS),
    isMonotonicStall,
    likelySleep: wallDriftMs > MAJOR_FAULT_SAMPLE_MS,
  };
}
//@ chunk-64z32qvd.js:2429-2712 placement
/**
 * 卡顿期间是否有阻塞写
 */
function blockedWriteFacts({ write, isMonotonicStall, prevMonotonicMs, nowMonotonicMs, intervalMs }) {
  if (!isMonotonicStall || write === undefined || write.endedMs < prevMonotonicMs)
    return {
      blocked_write: false,
    };
  let expectedNextTickMs = prevMonotonicMs + intervalMs;
  return {
    blocked_write:
      write.startedMs <= expectedNextTickMs + LOG_INTERVAL_MS &&
      write.endedMs >= nowMonotonicMs - LOG_INTERVAL_MS,
    last_write_ms: Math.round(write.endedMs - write.startedMs),
    last_write_bytes: write.bytes,
  };
}
//@ chunk-64z32qvd.js:2712-2924 placement
function startEventLoopStallDetector(session, restConfig) {
  let detector = eventLoopStallDetector.of(session);
  let intervalMs = env.CLAUDE_CODE_REMOTE
    ? (env.CLAUDE_CODE_REMOTE_STALL_CHECK_INTERVAL_MS ?? STALL_CHECK_MS)
    : STALL_MAX_WAIT_MS;
  let rest = env.CLAUDE_CODE_REMOTE
    ? {
        intervalMs: STALL_HANG_MS,
        afterQuietMs: STALL_CRITICAL_MS,
      }
    : undefined;
  if (restConfig === undefined) detector.start(intervalMs, rest);
  else detector.start(intervalMs, rest, restConfig);
}
//@ chunk-64z32qvd.js:2924-7917 placement
/**
 * 事件循环卡顿检测器
 */
let EventLoopStallDetector; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-64z32qvd.js:2924", () => {
  EventLoopStallDetector = class EventLoopStallDetector {
    timer = null;
    intervalMs = STALL_MAX_WAIT_MS;
    activeIntervalMs = STALL_MAX_WAIT_MS;
    rest = undefined;
    quietMs = 0;
    stopListeningForWork = () => {};
    stopListeningForInput = () => {};
    inputSeen = false;
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
    largestTimerSlackMs = 0;
    totalLateWithinTimerSlack = 0;
    sigcontSeen = false;
    listensForSigcont = false;
    onSigcont = () => {
      this.sigcontSeen = true;
    };
    afterTick = (stall, writeFacts, cpuFacts, memoryFacts, intervalMs) => {
      let sigcontSeen = this.listensForSigcont ? this.sigcontSeen : undefined;
      this.sigcontSeen = false;
      if (!stall.isStall || writeFacts === null) return;
      logForDebugging(
        `[event-loop-stall] blocked for ${stall.monotonicStallMs}ms monotonic (wall drift ${stall.wallDriftMs}ms, clock jump ${stall.clockJumpMs}ms, expected ${intervalMs}ms). Total stalls: ${this.totalStalls}, cumulative: ${this.totalMonotonicStallMs}ms monotonic / ${this.totalStallDurationMs}ms wall${stall.likelySleep ? " [likely sleep/wake]" : ""} blocked_write=${writeFacts.blocked_write}` +
          (writeFacts.last_write_ms !== undefined
            ? ` last_write=${writeFacts.last_write_ms}ms/${writeFacts.last_write_bytes}B`
            : "") +
          ` sigcont=${sigcontSeen ?? "n/a"} timer_slack=${stall.timerSlackMs === undefined ? "n/a" : `${stall.timerSlackMs}ms`}` +
          (cpuFacts ? ` cpu=${cpuFacts.cpu_delta_ms}ms majflt=${cpuFacts.major_fault_delta}` : "") +
          (memoryFacts
            ? ` rss=${memoryFacts.rss_mb}MB heap=${memoryFacts.heap_used_mb}MB ext=${memoryFacts.ext_mb}MB`
            : ""),
        {
          level: "warn",
        },
      );
      logEvent("tengu_event_loop_stall", {
        stall_duration_ms: stall.wallDriftMs,
        expected_interval_ms: intervalMs,
        actual_interval_ms: stall.wallElapsedMs,
        monotonic_stall_ms: stall.monotonicStallMs,
        clock_jump_ms: stall.clockJumpMs,
        total_stalls: this.totalStalls,
        total_late_within_timer_slack: isDiskless() ? undefined : this.totalLateWithinTimerSlack,
        cumulative_stall_ms: this.totalStallDurationMs,
        cumulative_monotonic_stall_ms: this.totalMonotonicStallMs,
        likely_sleep: stall.likelySleep,
        timer_slack_ms:
          stall.timerSlackMs === undefined || isDiskless() ? undefined : Math.round(stall.timerSlackMs),
        ...cpuFacts,
        ...memoryFacts,
        ...writeFacts,
        sigcont: sigcontSeen,
        nonblocking_stdout: isNonBlockingStdoutInstalled(),
      });
    };
    start(
      intervalMs,
      rest,
      options = {
        attributeSigcont: true,
      },
    ) {
      if (this.timer !== null) return;
      this.activeIntervalMs = intervalMs;
      this.rest = rest;
      this.timerSlack = TimerSlackReader.open();
      this.openWindow();
      if (options.attributeSigcont) {
        this.listensForSigcont = true;
        process.on("SIGCONT", this.onSigcont);
      }
      logForDebugging(
        `[event-loop-stall] detector started (interval=${intervalMs}ms${rest ? `, at rest ${rest.intervalMs}ms` : ""}, threshold=${CPU_SAMPLE_MS}ms)`,
      );
      if (rest !== undefined) {
        this.stopListeningForInput = onInteraction(() => {
          this.inputSeen = true;
        });
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
      }
      this.arm(intervalMs);
    }
    stop() {
      this.stopListeningForWork();
      this.stopListeningForInput();
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
    arm(intervalMs) {
      this.quietMs = 0;
      if (this.timer !== null) {
        if (this.intervalMs === intervalMs) return;
        clearInterval(this.timer);
      }
      this.intervalMs = intervalMs;
      this.rssSampleTicks = Math.round(MAX_STALL_MS / intervalMs);
      this.timer = setInterval(this.tick, intervalMs);
      this.timer.unref();
    }
    tick = () => {
      let intervalMs = this.intervalMs;
      let now = Date.now();
      let startTime = performance.now();
      let timerSlackMs = this.timerSlack?.readMs() ?? null;
      let max = Math.max(timerSlackMs ?? 0, this.lastTimerSlackMs ?? 0);
      this.largestTimerSlackMs = Math.max(this.largestTimerSlackMs, max);
      let reportedSlackMs =
        intervalMs === this.rest?.intervalMs && !this.inputSeen ? this.largestTimerSlackMs : max;
      let resourceSample = sampleCpuAndPageFaults();
      let intervalMs_2 = Math.min(intervalMs, Math.round(startTime - this.lastTickMonotonicMs));
      let stall = measureStall({
        prevWallMs: this.lastTickMs,
        prevMonotonicMs: this.lastTickMonotonicMs,
        nowWallMs: now,
        nowMonotonicMs: startTime,
        intervalMs: intervalMs_2,
        timerSlackMs: timerSlackMs === null && this.lastTimerSlackMs === null ? undefined : reportedSlackMs,
        cpuMs:
          resourceSample && this.lastResourceSample
            ? resourceSample.cpuTimeMs - this.lastResourceSample.cpuTimeMs
            : Number.POSITIVE_INFINITY,
      });
      this.tickCount++;
      let write = getSecondRootError().get(process.stdout)?.takeSlowestFrameWrite();
      if (stall.isStall) {
        this.totalStalls++;
        this.totalStallDurationMs += Math.max(stall.wallDriftMs, 0);
        if (stall.isMonotonicStall) this.totalMonotonicStallMs += stall.monotonicStallMs;
        let memoryFacts = sampleMemory();
        let cpuFacts =
          resourceSample && this.lastResourceSample
            ? {
                cpu_delta_ms: Math.round(resourceSample.cpuTimeMs - this.lastResourceSample.cpuTimeMs),
                major_fault_delta: resourceSample.majorPageFaults - this.lastResourceSample.majorPageFaults,
              }
            : null;
        let writeFacts = blockedWriteFacts({
          write,
          isMonotonicStall: stall.isMonotonicStall,
          prevMonotonicMs: this.lastTickMonotonicMs,
          nowMonotonicMs: startTime,
          intervalMs: intervalMs_2,
        });
        setImmediate(this.afterTick, stall, writeFacts, cpuFacts, memoryFacts, intervalMs);
      }
      if (!stall.isStall && this.listensForSigcont)
        setImmediate(this.afterTick, stall, null, null, null, intervalMs);
      if (stall.isLateWithinTimerSlack) this.totalLateWithinTimerSlack++;
      if (stall.likelySleep) getSecondRootError().get(process.stdout)?.reassertTerminalModes();
      this.lastTickMs = now;
      this.lastTickMonotonicMs = startTime;
      this.lastResourceSample = resourceSample;
      this.lastTimerSlackMs = timerSlackMs;
      this.inputSeen = false;
      this.choosePeriod();
      let lateMs =
        Math.max(stall.wallDriftMs, stall.monotonicStallMs) -
        Math.min(stall.timerSlackMs ?? 0, Math.max(stall.monotonicStallMs, 0));
      if (lateMs > RELAY_TIMEOUT_MS)
        try {
          emitProcessSlept(lateMs);
        } catch (error) {
          logError(error);
        }
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
  };
});
//@ chunk-64z32qvd.js:7917-7940 placement
var eventLoopStallDetector; // deferred: uses EventLoopStallDetector of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-64z32qvd.js:7917", () => {
  eventLoopStallDetector = new HostScoped(() => new EventLoopStallDetector());
});
export { sampleCpuAndPageFaults, RELAY_TIMEOUT_MS, startEventLoopStallDetector };
