/**
 * utils/queryProfiler.ts
 *
 * 查询耗时剖析：在查询各阶段打 performance mark 与内存快照，生成阶段汇总报告（CLAUDE_CODE_PROFILE_QUERY；本构建开关恒为关）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/queryProfiler.ts
 * pieces: chunk-2dvnfacg.js (60), chunk-5xgkngpb.js (11)
 * attribution: placement 44, affinity 2, layout 16, sole-consumer 3, fingerprint 5, callgraph-witnessed 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { AsyncLocalStorage } from "async_hooks";
import { readFileSync } from "fs";
import { posix } from "path";
import { logForDebugging } from "./debug.js";
import { env } from "./env.js";
import { logError } from "./log.js";
import { isDiskless, getRootSession } from "../bootstrap/state.js";
import { getPlatform } from "./platform.js";
import { getCpuacctDirForMetering } from "./shell/processCpuTime.js";
import { readCpuUsageSeconds } from "./shell/cpuReport.js";
import { isRemoteManagedEnvironment } from "./remoteEnvironment.js";
import { isTelemetryDisabled } from "./privacyLevel.js";
import { isFeedbackSurveyOtelOn } from "./hostEnvironment.js";
import { processStartTuning, processStartPurgeDelayMs } from "./processStartTuning.js";
import { toError } from "./errors.js";
import { takeGarbageCollectionCount } from "./gcCount.js";
import { markTurnBegan } from "./startupTiming.js";
import { HostScoped } from "./hostScoped.js";
import { isEnvTruthy } from "./envUtils.js";
import { getPerformance, formatTimelineLine, formatMs } from "./profilerBase.js";
import { repeatString } from "./stringUtils.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-2dvnfacg.js:5188-5353 placement
var QUERY_PROFILE_PARTS_2 = ["setup", "prompt_producers", "ambient_start", "ambient_wait", "render"];
var DIFFERS_FILE_SIZE_BUCKETS = [
  "size_under_25_kb",
  "size_25_to_50_kb",
  "size_50_to_256_kb",
  "size_over_256_kb",
];
var QUERY_PROFILE_PARTS = 1024;
//@ chunk-2dvnfacg.js:5353-5615 placement
class NestedStopwatch {
  begun = 0;
  ms = 0;
  #e = 0;
  #n = 0;
  begin() {
    this.begun++;
    if (this.#e++ === 0) this.#n = performance.now();
    let stopped = false;
    return () => {
      if (stopped) return;
      stopped = true;
      if (this.#e > 0 && --this.#e === 0) this.ms += performance.now() - this.#n;
    };
  }
  stop() {
    if (this.#e > 0) {
      this.#e = 0;
      this.ms += performance.now() - this.#n;
    }
  }
}
//@ chunk-2dvnfacg.js:5615-6547 placement
/**
 * 一次查询附件阶段的计时器：mark 记录各阶段（setup/prompt_producers/ambient/render）耗时，嵌套计时 token 计数与变更文件读取，统计 differs 文件大小分桶；finish 返回汇总。
 */
class AttachmentTimingProfile {
  beganAt = performance.now();
  #e = this.beganAt;
  #n = 0;
  #t = {};
  #s = {
    token_count: new NestedStopwatch(),
    changed_file_read: new NestedStopwatch(),
  };
  #r = {};
  #i = false;
  get markedAt() {
    return this.#e;
  }
  mark(name) {
    if (this.#i) return;
    let startTime = performance.now();
    this.#t[name] = (this.#t[name] ?? 0) + startTime - this.#e;
    this.#e = startTime;
  }
  producerBegan() {
    if (!this.#i) this.#n++;
  }
  begin(name) {
    return this.#i ? () => {} : this.#s[name].begin();
  }
  noteDiffersFile(size, hashOnly) {
    if (this.#i) return;
    let bucket =
      size < 25 * QUERY_PROFILE_PARTS
        ? "size_under_25_kb"
        : size < 50 * QUERY_PROFILE_PARTS
          ? "size_25_to_50_kb"
          : size <= 256 * QUERY_PROFILE_PARTS
            ? "size_50_to_256_kb"
            : "size_over_256_kb";
    this.#r[bucket] = (this.#r[bucket] ?? 0) + 1;
    if (hashOnly) this.#r.hash_only = (this.#r.hash_only ?? 0) + 1;
  }
  finish() {
    if (this.#t.setup !== undefined) this.mark("render");
    this.#s.token_count.stop();
    this.#s.changed_file_read.stop();
    this.#i = true;
    return {
      beganAt: this.beganAt,
      partMs: this.#t,
      producers: this.#n,
      tokenCounts: this.#s.token_count.begun,
      tokenCountMs: this.#s.token_count.ms,
      changedFileReadMs: this.#s.changed_file_read.begun > 0 ? this.#s.changed_file_read.ms : undefined,
      differsFiles: this.#r,
    };
  }
}
//@ chunk-2dvnfacg.js:6547-6560 placement
/**
 * queryProfileStorage：查询剖析的 AsyncLocalStorage。
 */
var queryProfileStorage; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-2dvnfacg.js:6547", () => {
  queryProfileStorage = new AsyncLocalStorage();
});
//@ chunk-2dvnfacg.js:6560-6596 placement
/**
 * runWithQueryProfile：在剖析上下文中执行。
 */
function runWithQueryProfile(store, fn) {
  return queryProfileStorage.run(store, fn);
}
//@ chunk-2dvnfacg.js:6802-6970 affinity
function readProcMemorySnapshot() {
  try {
    let file = readFileSync("/proc/self/status", "utf8");
    let rssMib = procStatusMib(file, "VmRSS");
    return rssMib === undefined
      ? undefined
      : {
          rssMib,
          anonMib: procStatusMib(file, "RssAnon"),
          peakRssMib: procStatusMib(file, "VmHWM"),
        };
  } catch {
    return;
  }
}
//@ chunk-2dvnfacg.js:6970-7113 placement
function procStatusMib(file, key) {
  let match = new RegExp(`^${key}:\\s+(\\d+) kB$`, "m").exec(file);
  let rounded = Math.round(Number(match?.[1]) / 1024);
  return Number.isSafeInteger(rounded) ? rounded : undefined;
}
//@ chunk-2dvnfacg.js:7113-7300 layout
var MEASURED_PHASES = ["main_stream", "side_stream", "tool", "agent_tool", "first_event_wait"];
var ALL_PHASES = [...MEASURED_PHASES, "before_first_request", "between_requests", "after_last_request"];
var emptyPhaseSums = () => ({
  cpuMs: 0,
  wallMs: 0,
  entries: 0,
});
//@ chunk-2dvnfacg.js:7300-9060 layout
class PhaseAccumulator {
  last;
  read;
  open = new Map();
  sums = new Map();
  unnamed = {
    ...emptyPhaseSums(),
    entries: 1,
  };
  hasSentMainRequest = false;
  inForce = undefined;
  isUnmeasured = false;
  hasEnded = false;
  constructor(last, read) {
    this.last = last;
    this.read = read;
  }
  sumOf(phase) {
    let sums = this.sums.get(phase);
    if (sums === undefined) {
      sums = emptyPhaseSums();
      this.sums.set(phase, sums);
    }
    return sums;
  }
  book(sample) {
    if (sample === undefined) {
      this.isUnmeasured = true;
      return;
    }
    let bucket = this.inForce === undefined ? this.unnamed : this.sumOf(this.inForce);
    bucket.cpuMs += sample.cpuMs - this.last.cpuMs;
    bucket.wallMs += sample.atMs - this.last.atMs;
    this.last = sample;
  }
  nameUnnamed(phase) {
    if (this.unnamed.entries > 0) {
      let bucket = this.sumOf(phase);
      bucket.cpuMs += this.unnamed.cpuMs;
      bucket.wallMs += this.unnamed.wallMs;
      bucket.entries += this.unnamed.entries;
    }
    this.unnamed = emptyPhaseSums();
  }
  settle(sample) {
    let found = MEASURED_PHASES.find((phase) => (this.open.get(phase) ?? 0) > 0);
    if (found === this.inForce) return;
    this.book(sample === undefined ? this.read() : sample.reading);
    this.inForce = found;
    let bucket = found === undefined ? this.unnamed : this.sumOf(found);
    bucket.entries++;
  }
  openWindow(phase, sample) {
    if (this.hasEnded) return () => {};
    this.open.set(phase, (this.open.get(phase) ?? 0) + 1);
    this.settle(sample);
    let closed = false;
    return (sample) => {
      if (closed || this.hasEnded) return;
      closed = true;
      this.open.set(phase, (this.open.get(phase) ?? 1) - 1);
      this.settle(sample);
    };
  }
  openFirstEventWait(mainRequestSent) {
    let closeWindow = this.openWindow("first_event_wait");
    if (mainRequestSent && !this.hasEnded) {
      this.nameUnnamed(this.hasSentMainRequest ? "between_requests" : "before_first_request");
      this.hasSentMainRequest = true;
    }
    return closeWindow;
  }
  end(sample) {
    if (this.hasEnded) return;
    this.book(sample);
    this.hasEnded = true;
    this.nameUnnamed(this.hasSentMainRequest ? "after_last_request" : "before_first_request");
    if (this.isUnmeasured) return;
    let phaseReport = {};
    let cumulative = {
      cpuMs: 0,
      wallMs: 0,
    };
    let emitted = {
      cpuMs: 0,
      wallMs: 0,
    };
    for (let phase of ALL_PHASES) {
      let phaseSums = this.sums.get(phase);
      if (phaseSums === undefined) continue;
      cumulative.cpuMs += phaseSums.cpuMs;
      cumulative.wallMs += phaseSums.wallMs;
      let cpuDelta = Math.round(cumulative.cpuMs) - emitted.cpuMs;
      let wallDelta = Math.round(cumulative.wallMs) - emitted.wallMs;
      emitted.cpuMs += cpuDelta;
      emitted.wallMs += wallDelta;
      if (![cpuDelta, wallDelta].every((value) => Number.isSafeInteger(value) && value >= 0)) return;
      phaseReport[phase] = {
        cpu_ms: cpuDelta,
        wall_ms: wallDelta,
        entries: phaseSums.entries,
      };
    }
    return phaseReport;
  }
}
//@ chunk-2dvnfacg.js:9060-9234 layout
class BudgetSplitter {
  #e;
  #n = 0;
  #t = 0;
  constructor(cap) {
    this.#e = cap;
  }
  next(delta) {
    this.#n += delta ?? 0;
    let min = Math.min(Math.round(this.#n), this.#e);
    let granted = min - this.#t;
    this.#t = min;
    return granted;
  }
  rest() {
    return this.#e - this.#t;
  }
}
//@ chunk-2dvnfacg.js:9234-11360 layout
class BuildSpanMarks {
  #e = {};
  #n = {};
  #t = {};
  #s = {};
  #r = undefined;
  #i = undefined;
  #u = undefined;
  #a = {};
  markToolSchemaBuild(key, sinceAt) {
    this.#o("tool_schema_build", this.#e, key, sinceAt);
  }
  markMessageNormalization(key, sinceAt) {
    this.#o("message_normalization", this.#n, key, sinceAt);
  }
  markRequestBuild(key, sinceAt) {
    this.#o("request_build", this.#t, key, sinceAt);
  }
  #o(kind, bucket, key, sinceAt) {
    let startTime = performance.now();
    let max = Math.max(sinceAt, this.#a[kind] ?? 0);
    this.#a[kind] = startTime;
    bucket[key] = (bucket[key] ?? 0) + startTime - max;
  }
  noteSentBuildSpan(key, startAt) {
    this.#s[key] = (this.#s[key] ?? 0) + performance.now() - startAt;
  }
  noteToolSchemaBuildStart(at) {
    this.#r = at;
  }
  noteToolSchemaBuildEnd(tools, newSchemaCount) {
    if (this.#r !== undefined)
      this.#i = {
        tools,
        newSchemas: Math.max(0, newSchemaCount - this.#r),
      };
  }
  noteMessageNormalizationCounts(messages, wireMessages) {
    this.#u = {
      messages,
      wireMessages,
    };
  }
  wireDetails(limits) {
    let toolSchemaBuild;
    if (limits.tool_schema_build !== undefined && Object.keys(this.#e).length > 0) {
      let bucket = this.#e;
      let counts = this.#i;
      let splitter = new BudgetSplitter(limits.tool_schema_build);
      toolSchemaBuild = {
        betas_ms: splitter.next(bucket.betas),
        waits_ms: splitter.next(bucket.waits),
        placement_ms: splitter.next(bucket.placement),
        render_ms: splitter.next(bucket.render),
        after_ms: splitter.next(bucket.after),
        other_ms: splitter.rest(),
        ...(counts && {
          tools: counts.tools,
          new_schemas: counts.newSchemas,
        }),
      };
    }
    let messageNormalization;
    if (limits.message_normalization !== undefined && Object.keys(this.#n).length > 0) {
      let bucket = this.#n;
      let counts = this.#u;
      let splitter = new BudgetSplitter(limits.message_normalization);
      messageNormalization = {
        before_ms: splitter.next(bucket.before),
        normalize_ms: splitter.next(bucket.normalize),
        images_ms: splitter.next(bucket.images),
        post_process_ms: splitter.next(bucket.post_process),
        after_ms: splitter.next(bucket.after),
        other_ms: splitter.rest(),
        ...(counts && {
          messages: counts.messages,
          wire_messages: counts.wireMessages,
        }),
      };
    }
    let requestBuild;
    if (limits.request_build !== undefined && Object.keys(this.#t).length > 0) {
      let bucket = this.#t;
      let sentBuildSpans = this.#s;
      let splitter = new BudgetSplitter(limits.request_build);
      let requestBuildSpans = {
        records_ms: splitter.next(bucket.records),
        system_ms: splitter.next(bucket.system),
        headers_ms: splitter.next(bucket.headers),
        cache_break_record_ms: splitter.next(bucket.cache_break_record),
        plans_ms: splitter.next(bucket.plans),
        retry_setup_ms: splitter.next(bucket.retry_setup),
        sent_build_ms: splitter.next(bucket.sent_build),
        record_attempt_ms: splitter.next(bucket.record_attempt),
        other_ms: splitter.rest(),
      };
      let sentBuildSplitter = new BudgetSplitter(requestBuildSpans.sent_build_ms);
      requestBuild = {
        ...requestBuildSpans,
        ...(sentBuildSpans.safety_context !== undefined && {
          sent_build_safety_context_ms: sentBuildSplitter.next(sentBuildSpans.safety_context),
        }),
        ...(sentBuildSpans.cache_breakpoints !== undefined && {
          sent_build_cache_breakpoints_ms: sentBuildSplitter.next(sentBuildSpans.cache_breakpoints),
        }),
        ...(sentBuildSpans.surrogate_scan !== undefined && {
          sent_build_surrogate_scan_ms: sentBuildSplitter.next(sentBuildSpans.surrogate_scan),
        }),
      };
    }
    return {
      toolSchemaBuild,
      messageNormalization,
      requestBuild,
    };
  }
}
//@ chunk-2dvnfacg.js:11360-11566 placement
var CHANGED_FILE_OUTCOMES; // deferred: uses QUERY_PROFILE_PARTS_2 of its import cycle while loading; runs once the cycle is complete
var CHANGED_FILE_OUTCOMES_WITH_LINK;
var DIFFERS_FILE_BUCKETS;
var MAX_PROFILE_SAMPLES;
var PROFILE_WINDOW_MS;
deferInit("chunk-2dvnfacg.js:11360", () => {
  CHANGED_FILE_OUTCOMES = [
    "same",
    "differs",
    "partial_view",
    "already_compared",
    "link_on_path",
    "leaf_link",
    "nlink",
    "not_regular",
    "oversize",
    "enoent",
    "other",
  ];
  CHANGED_FILE_OUTCOMES_WITH_LINK = [...CHANGED_FILE_OUTCOMES, "via_outputs_link"];
  DIFFERS_FILE_BUCKETS = [...DIFFERS_FILE_SIZE_BUCKETS, "hash_only"];
  MAX_PROFILE_SAMPLES = 50;
  PROFILE_WINDOW_MS = 120000;
});
//@ chunk-2dvnfacg.js:11566-11722 placement
function processCpuSnapshot() {
  try {
    if (isDiskless()) return;
    let usage = process.resourceUsage();
    return {
      cpuMs: (usage.userCPUTime + usage.systemCPUTime) / 1000,
      majorFaults: usage.majorPageFault,
    };
  } catch {
    return;
  }
}
//@ chunk-2dvnfacg.js:11722-11798 placement (2.1.88 match: chordToDisplayString, 1)
function procMemorySnapshot() {
  try {
    return !isProcessTelemetryEnabled() || isDiskless() || getPlatform() !== "linux"
      ? undefined
      : readProcMemorySnapshot();
  } catch {
    return;
  }
}
//@ chunk-2dvnfacg.js:11798-11884 placement
function cpuSnapshotForProfile() {
  let resources = processCpuSnapshot();
  return (
    resources && {
      resources,
      atMs: performance.now(),
      shellMs: undefined,
    }
  );
}
//@ chunk-2dvnfacg.js:11884-11946 layout
function phaseSampleOf(sample) {
  return (
    sample && {
      cpuMs: sample.resources.cpuMs,
      atMs: sample.atMs,
    }
  );
}
//@ chunk-2dvnfacg.js:11946-12106 placement
function resourceSnapshot() {
  let snapshot = cpuSnapshotForProfile();
  if (snapshot === undefined) return;
  let cpuacctDirForMetering = getCpuacctDirForMetering();
  let shellSeconds =
    cpuacctDirForMetering === undefined
      ? undefined
      : readCpuUsageSeconds(posix.join(cpuacctDirForMetering, "cpuacct.usage"));
  return {
    ...snapshot,
    shellMs: shellSeconds === undefined ? undefined : Math.floor(shellSeconds),
  };
}
//@ chunk-2dvnfacg.js:12106-12153 placement
function toWholeNonNegative(value) {
  return Math.max(0, Math.floor(value));
}
//@ chunk-2dvnfacg.js:12153-12217 placement
function isValidTimingMs(value) {
  return value !== undefined && value >= 0 && Number.isSafeInteger(value);
}
//@ chunk-2dvnfacg.js:12217-12455 placement
function cpuWallDelta(from, to) {
  if (from === undefined || to === undefined) return;
  let max = Math.max(0, Math.round(to.resources.cpuMs - from.resources.cpuMs));
  let max_2 = Math.max(0, Math.round(to.atMs - from.atMs));
  return Number.isSafeInteger(max) && Number.isSafeInteger(max_2)
    ? {
        cpuMs: max,
        wallMs: max_2,
      }
    : undefined;
}
//@ chunk-2dvnfacg.js:12455-12598 layout
function partsIfTheySumToDelta(shellDelta, parts) {
  let values = Object.values(parts ?? {});
  return values.reduce((acc, part) => acc + part.cpu_ms, 0) === shellDelta.cpuMs &&
    values.reduce((acc, part) => acc + part.wall_ms, 0) === shellDelta.wallMs
    ? parts
    : undefined;
}
//@ chunk-2dvnfacg.js:12598-12797 placement
function normalizeStreamStats(streaming) {
  let normalized = {
    ...streaming,
    cpuMs: Math.max(0, Math.round(streaming.cpuMs)),
    wallMs: Math.max(0, Math.round(streaming.wallMs)),
  };
  return [
    normalized.cpuMs,
    normalized.wallMs,
    normalized.streams,
    normalized.events,
    normalized.chunks ?? 0,
  ].every(Number.isSafeInteger)
    ? normalized
    : undefined;
}
//@ chunk-2dvnfacg.js:12797-13036 placement
function cpuFaultsSince(since) {
  let now = since && processCpuSnapshot();
  if (since === undefined || now === undefined) return;
  let max = Math.max(0, Math.round(now.cpuMs - since.cpuMs));
  let max_2 = Math.max(0, Math.round(now.majorFaults - since.majorFaults));
  return Number.isFinite(max) && Number.isFinite(max_2)
    ? {
        cpuMs: max,
        majorFaults: max_2,
      }
    : undefined;
}
//@ chunk-2dvnfacg.js:13036-13122 placement
function emitsStartupTiming() {
  return Boolean(env.CLAUDE_CODE_REMOTE || env.CLAUDE_CODE_EMIT_STARTUP_TIMING);
}
//@ chunk-2dvnfacg.js:13122-13237 placement
function isProcessTelemetryEnabled() {
  try {
    return (
      isRemoteManagedEnvironment() &&
      env.CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE !== "self_hosted" &&
      !isTelemetryDisabled() &&
      !isFeedbackSurveyOtelOn()
    );
  } catch {
    return false;
  }
}
//@ chunk-2dvnfacg.js:13237-13416 placement
/**
 * 查询剖析中的进程启动调优字段（调优值与清理延迟），无盘模式或未采样时为空。
 */
function processStartTuningFields() {
  try {
    let tuning = processStartTuning();
    if (tuning === undefined || !isProcessTelemetryEnabled() || isDiskless()) return;
    let purgeDelayMs = processStartPurgeDelayMs();
    return {
      process_start_tuning: tuning,
      ...(purgeDelayMs !== undefined && {
        process_start_purge_delay_ms: purgeDelayMs,
      }),
    };
  } catch (error) {
    logError(toError(error));
    return;
  }
}
//@ chunk-2dvnfacg.js:13416-13540 placement
/**
 * 查询剖析中的垃圾回收次数字段。
 */
function garbageCollectionFields() {
  try {
    let count = takeGarbageCollectionCount();
    return count !== undefined && isProcessTelemetryEnabled() && !isDiskless()
      ? {
          process_garbage_collections: count,
        }
      : undefined;
  } catch (error) {
    logError(toError(error));
    return;
  }
}
//@ chunk-2dvnfacg.js:13540-23772 placement
/**
 * 查询性能剖析器：记录一次查询各阶段耗时。
 */
class QueryProfiler {
  begun = false;
  open = false;
  phases = {};
  starts = {};
  closedTurns = 0;
  beganAt = undefined;
  lastTurnEndedAt = undefined;
  shellCountedTo = undefined;
  betweenTurns = undefined;
  memoryAtBegin = undefined;
  window = undefined;
  lagTimer = undefined;
  lagStartedAt = 0;
  lagExpectedAt = 0;
  maxLagMs = 0;
  firstDispatchAtMs = undefined;
  redriveCause = undefined;
  endedUnconsumed = undefined;
  unconsumedTaken = false;
  attachments = undefined;
  storeConfirm = undefined;
  parts = undefined;
  streamsOpen = 0;
  streamsOpenSince = undefined;
  streaming = undefined;
  isStreamingUnmeasured = false;
  states = undefined;
  endStoreConfirmWatch = undefined;
  reset() {
    this.begun = false;
    this.open = false;
    this.phases = {};
    this.starts = {};
    this.beganAt = undefined;
    this.betweenTurns = undefined;
    this.memoryAtBegin = undefined;
    this.window = undefined;
    this.stopLagProbe();
    this.maxLagMs = 0;
    this.firstDispatchAtMs = undefined;
    this.redriveCause = undefined;
    this.attachments = undefined;
    this.storeConfirm = undefined;
    this.parts = undefined;
    this.streamsOpen = 0;
    this.streamsOpenSince = undefined;
    this.streaming = undefined;
    this.isStreamingUnmeasured = false;
    this.states = undefined;
    let endStoreConfirmWatch = this.endStoreConfirmWatch;
    this.endStoreConfirmWatch = undefined;
    endStoreConfirmWatch?.();
  }
  begin() {
    this.reset();
    this.endedUnconsumed = undefined;
    this.unconsumedTaken = false;
    this.begun = emitsStartupTiming();
    this.open = this.begun;
    let { lastTurnEndedAt } = this;
    this.lastTurnEndedAt = undefined;
    if (this.open) {
      markTurnBegan(isProcessTelemetryEnabled);
      if (!isProcessTelemetryEnabled()) this.shellCountedTo = undefined;
      this.beganAt = resourceSnapshot();
      let last = isProcessTelemetryEnabled() ? phaseSampleOf(this.beganAt) : undefined;
      this.states = last && new PhaseAccumulator(last, () => phaseSampleOf(cpuSnapshotForProfile()));
      this.betweenTurns = cpuWallDelta(lastTurnEndedAt, this.beganAt);
      this.memoryAtBegin = procMemorySnapshot();
      this.startLagProbe();
    }
  }
  startLagProbe() {
    let startTime = performance.now();
    let tick = () => {
      if (!this.open || this.lagStartedAt !== startTime) return;
      try {
        let startTime_2 = performance.now();
        this.noteLag(startTime_2);
        if (startTime_2 - startTime > PROFILE_WINDOW_MS) {
          this.lagTimer = undefined;
          return;
        }
        this.armLagTick(tick, startTime_2);
      } catch (error) {
        this.lagTimer = undefined;
        logError(error);
      }
    };
    this.lagStartedAt = startTime;
    this.armLagTick(tick, startTime);
  }
  noteLag(now) {
    let lag = now - this.lagExpectedAt;
    if (lag > this.maxLagMs) this.maxLagMs = lag;
  }
  armLagTick(tick, expectedAt) {
    this.lagExpectedAt = expectedAt + MAX_PROFILE_SAMPLES;
    this.lagTimer = setTimeout(tick, MAX_PROFILE_SAMPLES);
    this.lagTimer?.unref?.();
  }
  stopLagProbe() {
    if (this.lagTimer === undefined) return;
    clearTimeout(this.lagTimer);
    this.lagTimer = undefined;
    this.noteLag(performance.now());
  }
  add(name, ms) {
    if (!this.open) return;
    this.phases[name] = (this.phases[name] ?? 0) + ms;
  }
  startPhase(name) {
    if (!this.open) return;
    this.starts[name] = performance.now();
  }
  endPhase(name) {
    if (!this.open) return;
    let startedAt = this.starts[name];
    if (startedAt === undefined) return;
    delete this.starts[name];
    this.add(name, performance.now() - startedAt);
  }
  startPhaseWithin(fromPhase, toPhase) {
    if (!this.open) return;
    let startedAt = this.starts[fromPhase];
    if (startedAt === undefined) return;
    let startTime = performance.now();
    delete this.starts[fromPhase];
    this.add(fromPhase, startTime - startedAt);
    this.starts[toPhase] = startTime;
    if (toPhase === "input_attachments") {
      this.attachments ??= {
        slowest: undefined,
        slowestMs: 0,
        used: {
          cpuMs: 0,
          majorFaults: 0,
        },
        stretchFrom: undefined,
        changedFilesReread: undefined,
        touchCompare: undefined,
        passes: undefined,
      };
      this.attachments.stretchFrom = processCpuSnapshot();
      if (this.attachments.stretchFrom === undefined) this.attachments.used = undefined;
    }
  }
  noteAttachmentProducer(slowest, beganAt, markedAt) {
    let attachments = this.attachments;
    let inputAttachments = this.starts.input_attachments;
    if (
      !this.open ||
      attachments === undefined ||
      inputAttachments === undefined ||
      beganAt < inputAttachments
    )
      return;
    let ms = performance.now() - Math.max(beganAt, markedAt ?? beganAt);
    if (attachments.slowest === undefined || ms > attachments.slowestMs) {
      attachments.slowest = slowest;
      attachments.slowestMs = ms;
    }
  }
  noteChangedFilesReread(count) {
    let attachments = this.attachments;
    if (this.open && attachments !== undefined && this.starts.input_attachments !== undefined)
      attachments.changedFilesReread = (attachments.changedFilesReread ?? 0) + count;
  }
  noteChangedFilesCompared(outcomes) {
    let attachments = this.attachments;
    if (!this.open || attachments === undefined || this.starts.input_attachments === undefined) return;
    for (let outcome of CHANGED_FILE_OUTCOMES_WITH_LINK) {
      let count = outcomes[outcome];
      if (count !== undefined && count > 0) {
        attachments.touchCompare ??= {};
        attachments.touchCompare[outcome] = (attachments.touchCompare[outcome] ?? 0) + count;
      }
    }
  }
  noteAttachmentPass(pass) {
    let attachments = this.attachments;
    let inputAttachments = this.starts.input_attachments;
    if (
      !this.open ||
      attachments === undefined ||
      inputAttachments === undefined ||
      pass.beganAt < inputAttachments ||
      pass.partMs.setup === undefined
    )
      return;
    let agg = (attachments.passes ??= {
      partMs: {},
      producers: 0,
      tokenCounts: 0,
      tokenCountMs: 0,
      changedFileReadMs: undefined,
      differsFiles: {},
    });
    for (let part of QUERY_PROFILE_PARTS_2) {
      let ms = pass.partMs[part];
      if (ms !== undefined) agg.partMs[part] = (agg.partMs[part] ?? 0) + ms;
    }
    agg.producers += pass.producers;
    agg.tokenCounts += pass.tokenCounts;
    agg.tokenCountMs += pass.tokenCountMs;
    if (pass.changedFileReadMs !== undefined)
      agg.changedFileReadMs = (agg.changedFileReadMs ?? 0) + pass.changedFileReadMs;
    for (let bucket of DIFFERS_FILE_BUCKETS) {
      let count = pass.differsFiles[bucket];
      if (count !== undefined && count > 0)
        agg.differsFiles[bucket] = (agg.differsFiles[bucket] ?? 0) + count;
    }
  }
  noteStoreConfirmWrite(writeMs) {
    if (this.open && this.starts.resume_store_confirm !== undefined)
      this.storeConfirm = {
        writeMs,
        posts: this.storeConfirm?.posts,
      };
  }
  holdStoreConfirmWatch(endStoreConfirmWatch) {
    this.endStoreConfirmWatch = endStoreConfirmWatch;
  }
  noteStoreConfirmPosts(posts) {
    if (this.open && this.starts.resume_store_confirm !== undefined)
      this.storeConfirm = {
        writeMs: this.storeConfirm?.writeMs ?? 0,
        posts,
      };
  }
  runningSince(phase) {
    return this.open ? this.starts[phase] : undefined;
  }
  markToolSchemaBuildPart(part) {
    let startedAt = this.runningSince("tool_schema_build");
    if (startedAt !== undefined) this.keptParts().markToolSchemaBuild(part, startedAt);
  }
  markMessageNormalizationPart(part) {
    let startedAt = this.runningSince("message_normalization");
    if (startedAt !== undefined) this.keptParts().markMessageNormalization(part, startedAt);
  }
  markRequestBuildPart(part) {
    let startedAt = this.runningSince("request_build");
    if (startedAt !== undefined) this.keptParts().markRequestBuild(part, startedAt);
  }
  noteSentBuildSpan(key, startAt) {
    if (this.runningSince("request_build") !== undefined) this.keptParts().noteSentBuildSpan(key, startAt);
  }
  noteToolSchemaBuildStart(at) {
    if (this.runningSince("tool_schema_build") !== undefined) this.keptParts().noteToolSchemaBuildStart(at);
  }
  noteToolSchemaBuildEnd(tools, newSchemaCount) {
    if (this.runningSince("tool_schema_build") !== undefined)
      this.keptParts().noteToolSchemaBuildEnd(tools, newSchemaCount);
  }
  noteMessageNormalizationCounts(messages, wireMessages) {
    if (this.runningSince("message_normalization") !== undefined)
      this.keptParts().noteMessageNormalizationCounts(messages, wireMessages);
  }
  keptParts() {
    return (this.parts ??= new BuildSpanMarks());
  }
  endPhaseWithin(fromPhase, toPhase) {
    if (!this.open) return;
    let startedAt = this.starts[toPhase];
    if (startedAt === undefined) return;
    let startTime = performance.now();
    delete this.starts[toPhase];
    this.add(toPhase, startTime - startedAt);
    this.starts[fromPhase] = startTime;
    let attachments = this.attachments;
    if (toPhase === "input_attachments" && attachments !== undefined) {
      let delta = cpuFaultsSince(attachments.stretchFrom);
      attachments.stretchFrom = undefined;
      attachments.used =
        delta === undefined || attachments.used === undefined
          ? undefined
          : {
              cpuMs: attachments.used.cpuMs + delta.cpuMs,
              majorFaults: attachments.used.majorFaults + delta.majorFaults,
            };
    }
  }
  noteRedrive(cause) {
    if (!this.begun || this.open) return;
    this.redriveCause ??= cause;
  }
  end() {
    this.endedUnconsumed ??= this.unconsumed();
    if (this.begun || this.lastTurnEndedAt !== undefined) this.lastTurnEndedAt = cpuSnapshotForProfile();
    this.reset();
  }
  unconsumed() {
    if (!this.begun) return;
    if (!this.open)
      return {
        dispatched: true,
        dispatchedAtMs: this.firstDispatchAtMs,
        runningPhase: undefined,
      };
    let runningPhase;
    let latest = -1 / 0;
    for (let phase of QUERY_PROFILE_PHASES_2) {
      let startedAt = this.starts[phase];
      if (startedAt !== undefined && startedAt >= latest) {
        runningPhase = phase;
        latest = startedAt;
      }
    }
    return {
      dispatched: false,
      runningPhase,
    };
  }
  takeUnconsumed() {
    if (this.unconsumedTaken) return;
    this.unconsumedTaken = true;
    let unconsumed = this.endedUnconsumed ?? this.unconsumed();
    this.endedUnconsumed = undefined;
    return unconsumed;
  }
  close(firstDispatchAtMs) {
    if (!this.open) return false;
    this.open = false;
    this.firstDispatchAtMs = firstDispatchAtMs;
    let resources = cpuFaultsSince(this.beganAt?.resources);
    this.stopLagProbe();
    this.window = {
      processTurnIndex: this.closedTurns++,
      loopLagMs: Math.round(this.maxLagMs),
      resources,
    };
    return true;
  }
  turnIndex() {
    return this.begun && isProcessTelemetryEnabled()
      ? (this.window?.processTurnIndex ?? this.closedTurns)
      : undefined;
  }
  openStream() {
    if (!this.begun || !isProcessTelemetryEnabled()) return () => {};
    let streaming = (this.streaming ??= {
      cpuMs: 0,
      wallMs: 0,
      streams: 0,
      events: 0,
      chunks: 0,
    });
    streaming.streams++;
    let firstStreamOpened = this.streamsOpen++ === 0;
    if (firstStreamOpened) this.streamsOpenSince = cpuSnapshotForProfile();
    let closeWindow = this.states?.openWindow(
      "main_stream",
      firstStreamOpened
        ? {
            reading: phaseSampleOf(this.streamsOpenSince),
          }
        : undefined,
    );
    let closed = false;
    return (events, chunks) => {
      if (closed || this.streaming !== streaming) return;
      closed = true;
      streaming.events += events;
      streaming.chunks =
        streaming.chunks === undefined || chunks === undefined ? undefined : streaming.chunks + chunks;
      let lastStreamClosed = --this.streamsOpen === 0;
      let endSnapshot = lastStreamClosed ? this.endStreamWindow() : undefined;
      closeWindow?.(
        lastStreamClosed
          ? {
              reading: phaseSampleOf(endSnapshot),
            }
          : undefined,
      );
    };
  }
  openWindow(phase) {
    return this.states?.openWindow(phase) ?? (() => {});
  }
  openFirstEventWait(mainRequestSent) {
    return this.states?.openFirstEventWait(mainRequestSent) ?? (() => {});
  }
  endStreamWindow() {
    let streamsOpenSince = this.streamsOpenSince;
    let now = streamsOpenSince && cpuSnapshotForProfile();
    this.streamsOpenSince = undefined;
    if (this.streaming === undefined) return now;
    if (streamsOpenSince === undefined || now === undefined) {
      this.isStreamingUnmeasured = true;
      return now;
    }
    this.streaming.cpuMs += now.resources.cpuMs - streamsOpenSince.resources.cpuMs;
    this.streaming.wallMs += now.atMs - streamsOpenSince.atMs;
    return now;
  }
  consume(elapsedMs, endedAt) {
    if (this.streamsOpen > 0) {
      this.endStreamWindow();
      if (this.streaming !== undefined) this.streaming.chunks = undefined;
    }
    let { phases, begun, window: windowOpenedAt, firstDispatchAtMs, redriveCause } = this;
    let { beganAt, betweenTurns, streaming, isStreamingUnmeasured } = this;
    let states = this.states;
    let memoryAtBegin = windowOpenedAt && this.memoryAtBegin;
    let attachments = this.attachments;
    let storeConfirm = this.storeConfirm;
    let { parts } = this;
    this.reset();
    if (!begun) return;
    let endResources = resourceSnapshot();
    this.lastTurnEndedAt = endResources;
    if (firstDispatchAtMs !== undefined && endedAt > firstDispatchAtMs)
      phases[`redrive_${redriveCause ?? "other"}`] = endedAt - firstDispatchAtMs;
    let rounded = {
      other: 0,
    };
    let cumulative = 0;
    let emitted = 0;
    for (let phase of QUERY_PROFILE_PHASES_2) {
      let ms = phases[phase];
      if (ms === undefined) continue;
      cumulative += ms;
      let roundedMs = Math.round(cumulative) - emitted;
      emitted += roundedMs;
      rounded[phase] = roundedMs;
    }
    rounded.other = Math.round(elapsedMs) - emitted;
    let used = attachments?.stretchFrom === undefined ? attachments?.used : undefined;
    let passes = attachments?.passes;
    let attachmentFields = attachments && {
      ...(attachments.slowest !== undefined && {
        slowest_producer: attachments.slowest,
        slowest_producer_ms: Math.round(attachments.slowestMs),
      }),
      ...(used && {
        cpu_ms: used.cpuMs,
        major_faults: used.majorFaults,
      }),
      ...(attachments.changedFilesReread !== undefined && {
        changed_files_reread: attachments.changedFilesReread,
      }),
      ...(attachments.touchCompare !== undefined && {
        touch_compare: attachments.touchCompare,
      }),
      ...(passes?.partMs.setup !== undefined && {
        setup_ms: toWholeNonNegative(passes.partMs.setup),
      }),
      ...(passes?.partMs.prompt_producers !== undefined && {
        prompt_producers_ms: toWholeNonNegative(passes.partMs.prompt_producers),
      }),
      ...(passes?.partMs.ambient_start !== undefined && {
        ambient_start_ms: toWholeNonNegative(passes.partMs.ambient_start),
      }),
      ...(passes?.partMs.ambient_wait !== undefined && {
        ambient_wait_ms: toWholeNonNegative(passes.partMs.ambient_wait),
      }),
      ...(passes?.partMs.render !== undefined && {
        render_ms: toWholeNonNegative(passes.partMs.render),
      }),
      ...(passes && {
        producers: passes.producers,
        token_counts: passes.tokenCounts,
      }),
      ...(passes !== undefined &&
        passes.tokenCounts > 0 && {
          token_count_ms: toWholeNonNegative(passes.tokenCountMs),
        }),
      ...(passes?.changedFileReadMs !== undefined && {
        changed_files_read_ms: toWholeNonNegative(passes.changedFileReadMs),
      }),
      ...(passes !== undefined &&
        Object.keys(passes.differsFiles).length > 0 && {
          differs_files: passes.differsFiles,
        }),
    };
    let inputAttachments =
      attachmentFields && Object.keys(attachmentFields).length > 0 ? attachmentFields : undefined;
    let resumeStoreConfirm = rounded.resume_store_confirm ?? 0;
    let min = Math.min(Math.floor(storeConfirm?.writeMs ?? 0), resumeStoreConfirm);
    let min_2 = Math.min(Math.floor(storeConfirm?.posts?.aheadMs ?? 0), resumeStoreConfirm - min);
    let min_3 = Math.min(Math.floor(storeConfirm?.posts?.postMs ?? 0), resumeStoreConfirm - min - min_2);
    let storeConfirm_2 =
      storeConfirm?.posts === undefined || rounded.resume_store_confirm === undefined
        ? undefined
        : {
            write_ms: min,
            ahead_ms: min_2,
            post_ms: min_3,
            other_ms: resumeStoreConfirm - min - min_2 - min_3,
            posts: storeConfirm.posts.posts,
            failed_posts: storeConfirm.posts.failedPosts,
            rows_ahead: storeConfirm.posts.rowsAhead,
            rows: storeConfirm.posts.rows,
          };
    let wireDetails = parts?.wireDetails(rounded);
    let memoryAtConsume = memoryAtBegin && procMemorySnapshot();
    let shellDelta =
      windowOpenedAt && isProcessTelemetryEnabled() ? cpuWallDelta(beganAt, endResources) : undefined;
    let shellCpu;
    if (shellDelta === undefined) this.shellCountedTo = undefined;
    else if (beganAt?.shellMs !== undefined && endResources?.shellMs !== undefined) {
      let shellCountedTo = this.shellCountedTo;
      let shellMs = endResources.shellMs - beganAt.shellMs;
      let sinceLastShellMs = shellCountedTo && beganAt.shellMs - shellCountedTo.shellMs;
      let sinceLastWallMs = shellCountedTo && Math.round(beganAt.atMs - shellCountedTo.atMs);
      shellCpu = isValidTimingMs(shellMs)
        ? {
            turnMs: shellMs,
            sinceLastResult:
              isValidTimingMs(sinceLastShellMs) && isValidTimingMs(sinceLastWallMs)
                ? {
                    cpuMs: sinceLastShellMs,
                    wallMs: sinceLastWallMs,
                  }
                : undefined,
          }
        : undefined;
      this.shellCountedTo = shellCpu && {
        shellMs: endResources.shellMs,
        atMs: endResources.atMs,
      };
    }
    return {
      phases: rounded,
      window: windowOpenedAt,
      inputAttachments,
      storeConfirm: storeConfirm_2,
      toolSchemaBuild: wireDetails?.toolSchemaBuild,
      messageNormalization: wireDetails?.messageNormalization,
      requestBuild: wireDetails?.requestBuild,
      memory: memoryAtBegin &&
        memoryAtConsume && {
          atBegin: memoryAtBegin,
          atConsume: memoryAtConsume,
        },
      betweenTurns: shellDelta && betweenTurns,
      turn: shellDelta,
      streaming:
        shellDelta && streaming && !isStreamingUnmeasured ? normalizeStreamStats(streaming) : undefined,
      states: shellDelta && partsIfTheySumToDelta(shellDelta, states?.end(phaseSampleOf(endResources))),
      shellCpu,
    };
  }
}
//@ chunk-2dvnfacg.js:23772-24503 placement
/**
 * QUERY_PROFILE_PHASES：查询剖析的阶段名。
 */
var QUERY_PROFILE_PHASES_2; // deferred: uses QueryProfiler of its import cycle while loading; runs once the cycle is complete
var QUERY_PROFILE_PHASES;
deferInit("chunk-2dvnfacg.js:23772", () => {
  QUERY_PROFILE_PHASES_2 = [
    "system_prompt",
    "resume_other",
    "resume_store_confirm",
    "resume_staged_files_wait",
    "resume_connector_wait",
    "turn_start_tool_run",
    "process_user_input",
    "input_images",
    "input_attachments",
    "input_command",
    "input_hooks",
    "conversation_append",
    "transcript_persist",
    "tool_pool_refresh",
    "system_prompt_rebuild",
    "init_message",
    "init_frame_send",
    "engine_pickup",
    "loop_entry",
    "memory_recall_wait",
    "memory_context_wait",
    "message_prep",
    "model_config_wait",
    "autocompact",
    "request_announcements",
    "query_setup",
    "auto_mode_context_wait",
    "model_gates",
    "tool_schema_build",
    "message_normalization",
    "client_creation",
    "request_build",
    "redrive_reactive_compact",
    "redrive_fallback_model",
    "redrive_non_streaming",
    "redrive_other",
  ];
  QUERY_PROFILE_PHASES = new HostScoped(() => new QueryProfiler());
});
//@ chunk-2dvnfacg.js:24503-24569 placement
function withProfileState(fn) {
  try {
    return fn(QUERY_PROFILE_PHASES.of(getRootSession().host));
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-2dvnfacg.js:24569-24602 placement
/**
 * beginProfile：开始一次查询剖析。
 */
function beginProfile() {
  withProfileState((profiler) => profiler.begin());
}
//@ chunk-2dvnfacg.js:24602-24641 placement
/**
 * startProfilePhase：开始某阶段。
 */
function startProfilePhase(name) {
  withProfileState((profiler) => profiler.startPhase(name));
}
//@ chunk-2dvnfacg.js:24641-24678 placement
/**
 * endProfilePhase：结束某阶段。
 */
function endProfilePhase(name) {
  withProfileState((profiler) => profiler.endPhase(name));
}
//@ chunk-2dvnfacg.js:24678-24728 placement
/**
 * startPhaseWithin：开始嵌套阶段。
 */
function startPhaseWithin(fromPhase, toPhase) {
  withProfileState((profiler) => profiler.startPhaseWithin(fromPhase, toPhase));
}
//@ chunk-2dvnfacg.js:24728-24788 placement
/**
 * noteAttachmentProducer：记录附件生产者耗时。
 */
function noteAttachmentProducer(label, beganAt, markedAt) {
  withProfileState((profiler) => profiler.noteAttachmentProducer(label, beganAt, markedAt));
}
//@ chunk-2dvnfacg.js:24788-24836 placement
/**
 * noteAttachmentPass：记录一次附件处理。
 */
function noteAttachmentPass(pass) {
  withProfileState((profiler) => profiler.noteAttachmentPass(pass));
}
//@ chunk-2dvnfacg.js:24836-24888 placement
/**
 * noteChangedFilesReread：记录改动文件重读。
 */
function noteChangedFilesReread(count) {
  withProfileState((profiler) => profiler.noteChangedFilesReread(count));
}
//@ chunk-2dvnfacg.js:24888-24942 placement
/**
 * noteChangedFilesCompared：记录改动文件比较。
 */
function noteChangedFilesCompared(outcomes) {
  withProfileState((profiler) => profiler.noteChangedFilesCompared(outcomes));
}
//@ chunk-2dvnfacg.js:24942-24995 layout
function markToolSchemaBuildPart(part) {
  withProfileState((profiler) => profiler.markToolSchemaBuildPart(part));
}
//@ chunk-2dvnfacg.js:24995-25053 layout
function markMessageNormalizationPart(part) {
  withProfileState((profiler) => profiler.markMessageNormalizationPart(part));
}
//@ chunk-2dvnfacg.js:25053-25103 layout
function markRequestBuildPart(part) {
  withProfileState((profiler) => profiler.markRequestBuildPart(part));
}
//@ chunk-2dvnfacg.js:25103-25154 layout
function noteSentBuildSpan(key, startAt) {
  withProfileState((profiler) => profiler.noteSentBuildSpan(key, startAt));
}
//@ chunk-2dvnfacg.js:25154-25213 layout
function noteToolSchemaBuildStart(toolDescriptionCache) {
  withProfileState((profiler) => profiler.noteToolSchemaBuildStart(toolDescriptionCache.size));
}
//@ chunk-2dvnfacg.js:25213-25274 layout
function noteToolSchemaBuildEnd(tools, toolDescriptionCache) {
  withProfileState((profiler) => profiler.noteToolSchemaBuildEnd(tools, toolDescriptionCache.size));
}
//@ chunk-2dvnfacg.js:25274-25338 layout
function noteMessageNormalizationCounts(messages, wireMessages) {
  withProfileState((profiler) => profiler.noteMessageNormalizationCounts(messages, wireMessages));
}
//@ chunk-2dvnfacg.js:25338-25389 placement
/**
 * noteStoreConfirmWrite：记录存储确认写。
 */
function noteStoreConfirmWrite(writeMs) {
  withProfileState((profiler) => profiler.noteStoreConfirmWrite(writeMs));
}
//@ chunk-2dvnfacg.js:25389-25439 placement
function noteStoreConfirmPosts(posts) {
  withProfileState((profiler) => profiler.noteStoreConfirmPosts(posts));
}
//@ chunk-2dvnfacg.js:25439-25635 placement
/**
 * 创建存储确认计时器：只在第一次确认时记录，返回的函数在指定时刻结束计时。
 */
function makeStoreConfirmTimer(report) {
  let stepped = runProfileStepSafely(report);
  let armed = stepped !== undefined;
  let step = (startedAt) => {
    if (stepped === undefined || !armed) return;
    armed = false;
    return runProfileStepSafely(() => stepped(startedAt));
  };
  withProfileState((profiler) =>
    profiler.holdStoreConfirmWatch(() => {
      step(performance.now());
    }),
  );
  return (endedAt) => {
    let posts = step(endedAt);
    if (posts) noteStoreConfirmPosts(posts);
  };
}
//@ chunk-2dvnfacg.js:25635-25687 placement
function runProfileStepSafely(fn) {
  try {
    return fn();
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-2dvnfacg.js:25687-25735 placement
/**
 * endPhaseWithin：结束嵌套阶段。
 */
function endPhaseWithin(fromPhase, toPhase) {
  withProfileState((profiler) => profiler.endPhaseWithin(fromPhase, toPhase));
}
//@ chunk-2dvnfacg.js:25735-25809 placement
/**
 * measurePhase：在剖析中执行并计时。
 */
async function measurePhase(fromPhase, toPhase, fn) {
  startPhaseWithin(fromPhase, toPhase);
  try {
    return await fn();
  } finally {
    endPhaseWithin(fromPhase, toPhase);
  }
}
//@ chunk-2dvnfacg.js:25809-25856 placement
/**
 * closeProfile：关闭剖析并返回是否已上报。
 */
function closeProfile(firstDispatchAtMs) {
  return withProfileState((profiler) => profiler.close(firstDispatchAtMs)) === true;
}
//@ chunk-2dvnfacg.js:25856-25950 placement
/**
 * openProfileStream：打开剖析流。
 */
function openProfileStream() {
  let reportStream = withProfileState((profiler) => profiler.openStream());
  return (
    reportStream &&
    ((events, chunks) => {
      try {
        reportStream(events, chunks);
      } catch (error) {
        logError(toError(error));
      }
    })
  );
}
//@ chunk-2dvnfacg.js:25950-26005 layout
function safeClose(close) {
  return () => {
    try {
      close?.();
    } catch (error) {
      logError(toError(error));
    }
  };
}
//@ chunk-2dvnfacg.js:26005-26056 layout
function openProfileWindow(phase) {
  return safeClose(withProfileState((profiler) => profiler.openWindow(phase)));
}
//@ chunk-2dvnfacg.js:26056-26115 layout
function openFirstEventWait(mainRequestSent) {
  return safeClose(withProfileState((profiler) => profiler.openFirstEventWait(mainRequestSent)));
}
//@ chunk-2dvnfacg.js:26115-26156 placement
/**
 * noteRedrive：记录重放。
 */
function noteRedrive(cause) {
  withProfileState((profiler) => profiler.noteRedrive(cause));
}
//@ chunk-2dvnfacg.js:26156-26204 placement
/**
 * consumeProfile：消费剖析数据。
 */
function consumeProfile(elapsedMs, endedAt) {
  return withProfileState((profiler) => profiler.consume(elapsedMs, endedAt));
}
//@ chunk-2dvnfacg.js:26204-26248 placement
/**
 * currentTurnIndex：当前回合序号。
 */
function currentTurnIndex() {
  return withProfileState((profiler) => profiler.turnIndex());
}
//@ chunk-2dvnfacg.js:26248-26279 placement
/**
 * endProfile：结束剖析。
 */
function endProfile() {
  withProfileState((profiler) => profiler.end());
}
//@ chunk-5xgkngpb.js:2534471-2534490 sole-consumer
/**
 * 构建时固化为 false 的剖析开关。
 */
var isQueryProfilingEnabled; // deferred: uses isEnvTruthy (./envUtils.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:2534471", () => {
  isQueryProfilingEnabled = isEnvTruthy(undefined);
});
//@ chunk-5xgkngpb.js:2534490-2534666 sole-consumer
/**
 * 剖析状态：每个检查点的内存快照与查询计数。
 */
class QueryProfileState {
  memorySnapshots = new Map();
  queryCount = 0;
  startQuery() {
    this.memorySnapshots.clear();
    this.queryCount++;
  }
  snapshotMemory(uuid) {
    this.memorySnapshots.set(uuid, process.memoryUsage());
  }
}
//@ chunk-5xgkngpb.js:2534666-2534693 sole-consumer
/**
 * 按 session.host 的剖析状态懒槽。
 */
var queryProfileStateSlot; // deferred: uses QueryProfileState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:2534666", () => {
  queryProfileStateSlot = new HostScoped(() => new QueryProfileState());
});
//@ chunk-5xgkngpb.js:2534693-2534732 affinity
/**
 * 取当前会话的剖析状态。
 */
function getQueryProfileState() {
  return queryProfileStateSlot.of(getRootSession().host);
}
//@ chunk-5xgkngpb.js:2534732-2534832 fingerprint (2.1.88 match: startQueryProfile, 0.849)
/**
 * 开始一次查询剖析：清 mark、计数加一、打 query_user_input_received。
 */
function startQueryProfile() {
  if (!isQueryProfilingEnabled) return;
  getPerformance().clearMarks();
  getQueryProfileState().startQuery();
  queryCheckpoint("query_user_input_received");
}
//@ chunk-5xgkngpb.js:2534832-2534900 callgraph-witnessed (2.1.88 match: queryCheckpoint, 0.161)
/**
 * 打一个剖析检查点（mark + 内存快照）；关闭时什么也不做。queryLoop/queryModel 里大量调用（query_fn_entry、query_api_request_sent 等）。
 */
function queryCheckpoint(name) {
  if (!isQueryProfilingEnabled) return;
  getPerformance().mark(name);
  getQueryProfileState().snapshotMemory(name);
}
//@ chunk-5xgkngpb.js:2534900-2534954 fingerprint (2.1.88 match: endQueryProfile, 1)
/**
 * 结束剖析（query_profile_end）。
 */
function endQueryProfile() {
  if (!isQueryProfilingEnabled) return;
  queryCheckpoint("query_profile_end");
}
//@ chunk-5xgkngpb.js:2534954-2535322 fingerprint (2.1.88 match: getSlowWarning, 0.872)
/**
 * 按耗时给检查点加 SLOW/VERY SLOW 等提示。
 */
function getSlowWarning(deltaMs, name) {
  if (name === "query_user_input_received") return "";
  if (deltaMs > 1000) return " \u26A0\uFE0F  VERY SLOW";
  if (deltaMs > 100) return " \u26A0\uFE0F  SLOW";
  if (name.includes("git_status") && deltaMs > 50) return " \u26A0\uFE0F  git status";
  if (name.includes("tool_schema") && deltaMs > 50) return " \u26A0\uFE0F  tool schemas";
  if (name.includes("client_creation") && deltaMs > 50) return " \u26A0\uFE0F  client creation";
  return "";
}
//@ chunk-5xgkngpb.js:2535322-2536300 fingerprint (2.1.88 match: getQueryProfileReport, 0.96)
/**
 * 生成查询剖析报告文本（未开启时提示设置 CLAUDE_CODE_PROFILE_QUERY=1）。
 */
function getQueryProfileReport() {
  if (!isQueryProfilingEnabled) return "Query profiling not enabled (set CLAUDE_CODE_PROFILE_QUERY=1)";
  let marks = getPerformance().getEntriesByType("mark");
  if (marks.length === 0) return "No query profiling checkpoints recorded";
  let perf = getQueryProfileState();
  let lines = [];
  lines.push("=".repeat(80));
  lines.push(`QUERY PROFILING REPORT - Query #${perf.queryCount}`);
  lines.push("=".repeat(80));
  lines.push("");
  let baselineTime = marks[0]?.startTime ?? 0;
  let prevTime = baselineTime;
  let apiRequestSentTime = 0;
  let firstChunkTime = 0;
  for (let mark of marks) {
    let relativeTime = mark.startTime - baselineTime;
    let deltaMs = mark.startTime - prevTime;
    lines.push(
      formatTimelineLine(
        relativeTime,
        deltaMs,
        mark.name,
        perf.memorySnapshots.get(mark.name),
        10,
        9,
        getSlowWarning(deltaMs, mark.name),
      ),
    );
    if (mark.name === "query_api_request_sent") apiRequestSentTime = relativeTime;
    if (mark.name === "query_first_chunk_received") firstChunkTime = relativeTime;
    prevTime = mark.startTime;
  }
  let lastMark = marks.at(-1);
  let totalTime = lastMark ? lastMark.startTime - baselineTime : 0;
  lines.push("");
  lines.push("-".repeat(80));
  if (firstChunkTime > 0) {
    let preRequestOverhead = apiRequestSentTime;
    let networkLatency = firstChunkTime - apiRequestSentTime;
    let preRequestPercent = ((preRequestOverhead / firstChunkTime) * 100).toFixed(1);
    let networkPercent = ((networkLatency / firstChunkTime) * 100).toFixed(1);
    lines.push(`Total TTFT: ${formatMs(firstChunkTime)}ms`);
    lines.push(`  - Pre-request overhead: ${formatMs(preRequestOverhead)}ms (${preRequestPercent}%)`);
    lines.push(`  - Network latency: ${formatMs(networkLatency)}ms (${networkPercent}%)`);
  } else lines.push(`Total time: ${formatMs(totalTime)}ms`);
  lines.push(getPhaseSummary(marks, baselineTime));
  lines.push("=".repeat(80));
  return lines.join(`
`);
}
//@ chunk-5xgkngpb.js:2536300-2537487 fingerprint (2.1.88 match: getPhaseSummary, 0.994)
/**
 * 按阶段（上下文加载、自动压缩、查询准备、网络、工具执行等）汇总耗时。
 */
function getPhaseSummary(marks, baselineTime) {
  let phases = [
    {
      name: "Context loading",
      start: "query_context_loading_start",
      end: "query_context_loading_end",
    },
    {
      name: "Autocompact",
      start: "query_autocompact_start",
      end: "query_autocompact_end",
    },
    {
      name: "Query setup",
      start: "query_setup_start",
      end: "query_setup_end",
    },
    {
      name: "Tool schemas",
      start: "query_tool_schema_build_start",
      end: "query_tool_schema_build_end",
    },
    {
      name: "Message normalization",
      start: "query_message_normalization_start",
      end: "query_message_normalization_end",
    },
    {
      name: "Client creation",
      start: "query_client_creation_start",
      end: "query_client_creation_end",
    },
    {
      name: "Network TTFB",
      start: "query_api_request_sent",
      end: "query_first_chunk_received",
    },
    {
      name: "Tool execution",
      start: "query_tool_execution_start",
      end: "query_tool_execution_end",
    },
  ];
  let markMap = new Map(marks.map((m) => [m.name, m.startTime - baselineTime]));
  let lines = [];
  lines.push("");
  lines.push("PHASE BREAKDOWN:");
  for (let phase of phases) {
    let startTime = markMap.get(phase.start);
    let endTime = markMap.get(phase.end);
    if (startTime !== undefined && endTime !== undefined) {
      let duration = endTime - startTime;
      let bar = repeatString("\u2588", Math.min(Math.ceil(duration / 10), 50));
      lines.push(`  ${phase.name.padEnd(22)} ${formatMs(duration).padStart(10)}ms ${bar}`);
    }
  }
  let apiRequestSent = markMap.get("query_api_request_sent");
  if (apiRequestSent !== undefined) {
    lines.push("");
    lines.push(`  ${"Total pre-API overhead".padEnd(22)} ${formatMs(apiRequestSent).padStart(10)}ms`);
  }
  return lines.join(`
`);
}
//@ chunk-5xgkngpb.js:2537487-2537561 placement
/**
 * finishQueryProfile：结束并上报查询性能剖析。
 */
function finishQueryProfile() {
  if (!isQueryProfilingEnabled) return;
  let report;
  try {
    report = getQueryProfileReport();
  } catch (error) {
    logError(error);
    return;
  }
  logForDebugging(report);
}
export {
  queryCheckpoint,
  startProfilePhase,
  endProfilePhase,
  noteToolSchemaBuildStart,
  markToolSchemaBuildPart,
  noteToolSchemaBuildEnd,
  markMessageNormalizationPart,
  noteMessageNormalizationCounts,
  markRequestBuildPart,
  noteSentBuildSpan,
  openFirstEventWait,
  closeProfile,
  openProfileStream,
  openProfileWindow,
  endQueryProfile,
  noteRedrive,
  makeStoreConfirmTimer,
  processStartTuningFields,
  garbageCollectionFields,
  measurePhase,
  endProfile,
  beginProfile,
  consumeProfile,
  currentTurnIndex,
  startQueryProfile,
  finishQueryProfile,
  noteAttachmentProducer,
  noteChangedFilesReread,
  noteChangedFilesCompared,
  AttachmentTimingProfile,
  runWithQueryProfile,
  noteAttachmentPass,
  queryProfileStorage,
  startPhaseWithin,
  endPhaseWithin,
  noteStoreConfirmWrite,
  readProcMemorySnapshot,
};
