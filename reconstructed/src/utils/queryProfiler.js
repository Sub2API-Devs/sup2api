/**
 * utils/queryProfiler.ts
 *
 * 查询耗时剖析：在查询各阶段打 performance mark 与内存快照，生成阶段汇总报告（CLAUDE_CODE_PROFILE_QUERY；本构建开关恒为关）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/queryProfiler.ts
 * pieces: chunk-e6aww6q8.js (54)
 * attribution: sole-consumer 3, affinity 1, fingerprint 5, callgraph-witnessed 1, placement 44
 */
import { AsyncLocalStorage } from "async_hooks";
import { readFileSync } from "fs";
import { posix } from "path";
import { isEnvTruthy } from "./envUtils.js";
import { HostScoped } from "./hostScoped.js";
import { getRootSession, isDiskless } from "../bootstrap/state.js";
import { getPerformance, formatTimelineLine, formatMs } from "./profilerBase.js";
import { repeatString } from "./stringUtils.js";
import { logError } from "./log.js";
import { logForDebugging } from "./debug.js";
import { string } from "../../vendor/zod/v4/classic/schemas.js";
import { env } from "./env.js";
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

//@ chunk-e6aww6q8.js:2477148-2477167 sole-consumer
/**
 * 构建时固化为 false 的剖析开关。
 */
var isQueryProfilingEnabled = isEnvTruthy(undefined);
//@ chunk-e6aww6q8.js:2477167-2477343 sole-consumer
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
  snapshotMemory(e) {
    this.memorySnapshots.set(e, process.memoryUsage());
  }
}
//@ chunk-e6aww6q8.js:2477343-2477370 sole-consumer
/**
 * 按 session.host 的剖析状态懒槽。
 */
var queryProfileStateSlot = new HostScoped(() => new QueryProfileState());
//@ chunk-e6aww6q8.js:2477370-2477409 affinity
/**
 * 取当前会话的剖析状态。
 */
function getQueryProfileState() {
  return queryProfileStateSlot.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:2477409-2477509 fingerprint = startQueryProfile (0.849)
/**
 * 开始一次查询剖析：清 mark、计数加一、打 query_user_input_received。
 */
function startQueryProfile() {
  if (!isQueryProfilingEnabled) return;
  getPerformance().clearMarks();
  getQueryProfileState().startQuery();
  queryCheckpoint("query_user_input_received");
}
//@ chunk-e6aww6q8.js:2477509-2477577 callgraph-witnessed = queryCheckpoint (0.162)
/**
 * 打一个剖析检查点（mark + 内存快照）；关闭时什么也不做。queryLoop/queryModel 里大量调用（query_fn_entry、query_api_request_sent 等）。
 */
function queryCheckpoint(name) {
  if (!isQueryProfilingEnabled) return;
  getPerformance().mark(name);
  getQueryProfileState().snapshotMemory(name);
}
//@ chunk-e6aww6q8.js:2477577-2477631 fingerprint = endQueryProfile (1)
/**
 * 结束剖析（query_profile_end）。
 */
function endQueryProfile() {
  if (!isQueryProfilingEnabled) return;
  queryCheckpoint("query_profile_end");
}
//@ chunk-e6aww6q8.js:2477631-2477999 fingerprint = getSlowWarning (0.872)
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
//@ chunk-e6aww6q8.js:2477999-2478970 fingerprint = getQueryProfileReport (0.96)
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
//@ chunk-e6aww6q8.js:2478970-2480157 fingerprint = getPhaseSummary (0.994)
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
//@ chunk-e6aww6q8.js:2480157-2480231 placement
/**
 * finishQueryProfile：结束并上报查询性能剖析。
 */
function finishQueryProfile() {
  if (!isQueryProfilingEnabled) return;
  let e;
  try {
    e = getQueryProfileReport();
  } catch (error) {
    logError(error);
    return;
  }
  logForDebugging(e);
}
//@ chunk-e6aww6q8.js:2480348-2480517 placement
var QUERY_PROFILE_PARTS_2 = ["setup", "prompt_producers", "ambient_start", "ambient_wait", "render"];
var DIFFERS_FILE_SIZE_BUCKETS = [
  "size_under_25_kb",
  "size_25_to_50_kb",
  "size_50_to_256_kb",
  "size_over_256_kb",
];
var QUERY_PROFILE_PARTS = 1024;
//@ chunk-e6aww6q8.js:2480517-2480781 placement
class NestedStopwatch {
  begun = 0;
  ms = 0;
  #e = 0;
  #t = 0;
  begin() {
    this.begun++;
    if (this.#e++ === 0) this.#t = performance.now();
    let e = false;
    return () => {
      if (e) return;
      e = true;
      if (this.#e > 0 && --this.#e === 0) this.ms += performance.now() - this.#t;
    };
  }
  stop() {
    if (this.#e > 0) {
      this.#e = 0;
      this.ms += performance.now() - this.#t;
    }
  }
}
//@ chunk-e6aww6q8.js:2480781-2481723 placement
/**
 * 一次查询附件阶段的计时器：mark 记录各阶段（setup/prompt_producers/ambient/render）耗时，嵌套计时 token 计数与变更文件读取，统计 differs 文件大小分桶；finish 返回汇总。
 */
class AttachmentTimingProfile {
  beganAt = performance.now();
  #e = this.beganAt;
  #t = 0;
  #n = {};
  #o = {
    token_count: new NestedStopwatch(),
    changed_file_read: new NestedStopwatch(),
  };
  #r = {};
  #i = false;
  get markedAt() {
    return this.#e;
  }
  mark(e) {
    if (this.#i) return;
    let startTime = performance.now();
    this.#n[e] = (this.#n[e] ?? 0) + startTime - this.#e;
    this.#e = startTime;
  }
  producerBegan() {
    if (!this.#i) this.#t++;
  }
  begin(e) {
    return this.#i ? () => {} : this.#o[e].begin();
  }
  noteDiffersFile(e, n) {
    if (this.#i) return;
    let r =
      e < 25 * QUERY_PROFILE_PARTS
        ? "size_under_25_kb"
        : e < 50 * QUERY_PROFILE_PARTS
          ? "size_25_to_50_kb"
          : e <= 256 * QUERY_PROFILE_PARTS
            ? "size_50_to_256_kb"
            : "size_over_256_kb";
    this.#r[r] = (this.#r[r] ?? 0) + 1;
    if (n) this.#r.hash_only = (this.#r.hash_only ?? 0) + 1;
  }
  finish() {
    if (this.#n.setup !== undefined) this.mark("render");
    this.#o.token_count.stop();
    this.#o.changed_file_read.stop();
    this.#i = true;
    return {
      beganAt: this.beganAt,
      partMs: this.#n,
      producers: this.#t,
      tokenCounts: this.#o.token_count.begun,
      tokenCountMs: this.#o.token_count.ms,
      changedFileReadMs: this.#o.changed_file_read.begun > 0 ? this.#o.changed_file_read.ms : undefined,
      differsFiles: this.#r,
    };
  }
}
//@ chunk-e6aww6q8.js:2481723-2481739 placement
/**
 * queryProfileStorage：查询剖析的 AsyncLocalStorage。
 */
var queryProfileStorage = new AsyncLocalStorage();
//@ chunk-e6aww6q8.js:2481739-2481777 placement
/**
 * runWithQueryProfile：在剖析上下文中执行。
 */
function runWithQueryProfile(e, n) {
  return queryProfileStorage.run(e, n);
}
//@ chunk-e6aww6q8.js:2481952-2482165 placement
var CHANGED_FILE_OUTCOMES = [
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
var CHANGED_FILE_OUTCOMES_WITH_LINK = [...CHANGED_FILE_OUTCOMES, "via_outputs_link"];
var DIFFERS_FILE_BUCKETS = [...DIFFERS_FILE_SIZE_BUCKETS, "hash_only"];
var MAX_PROFILE_SAMPLES = 50;
var PROFILE_WINDOW_MS = 120000;
//@ chunk-e6aww6q8.js:2482165-2482322 placement
function processCpuSnapshot() {
  try {
    if (isDiskless()) return;
    let e = process.resourceUsage();
    return {
      cpuMs: (e.userCPUTime + e.systemCPUTime) / 1000,
      majorFaults: e.majorPageFault,
    };
  } catch {
    return;
  }
}
//@ chunk-e6aww6q8.js:2482322-2482533 placement
function procMemorySnapshot() {
  try {
    if (!isProcessTelemetryEnabled() || isDiskless() || getPlatform() !== "linux") return;
    let file = readFileSync("/proc/self/status", "utf8");
    let n = procStatusMib(file, "VmRSS");
    return n === undefined
      ? undefined
      : {
          rssMib: n,
          anonMib: procStatusMib(file, "RssAnon"),
          peakRssMib: procStatusMib(file, "VmHWM"),
        };
  } catch {
    return;
  }
}
//@ chunk-e6aww6q8.js:2482533-2482678 placement
function procStatusMib(file, n) {
  let match = new RegExp(`^${n}:\\s+(\\d+) kB$`, "m").exec(file);
  let rounded = Math.round(Number(match?.[1]) / 1024);
  return Number.isSafeInteger(rounded) ? rounded : undefined;
}
//@ chunk-e6aww6q8.js:2482678-2482767 placement
function cpuSnapshotForProfile() {
  let e = processCpuSnapshot();
  return (
    e && {
      resources: e,
      atMs: performance.now(),
      shellMs: undefined,
    }
  );
}
//@ chunk-e6aww6q8.js:2482767-2482933 placement
function resourceSnapshot() {
  let e = cpuSnapshotForProfile();
  if (e === undefined) return;
  let cpuacctDirForMetering = getCpuacctDirForMetering();
  let r =
    cpuacctDirForMetering === undefined
      ? undefined
      : readCpuUsageSeconds(posix.join(cpuacctDirForMetering, "cpuacct.usage"));
  return {
    ...e,
    shellMs: r === undefined ? undefined : Math.floor(r),
  };
}
//@ chunk-e6aww6q8.js:2482933-2482981 placement
function toWholeNonNegative(e) {
  return Math.max(0, Math.floor(e));
}
//@ chunk-e6aww6q8.js:2482981-2483046 placement
function isValidTimingMs(e) {
  return e !== undefined && e >= 0 && Number.isSafeInteger(e);
}
//@ chunk-e6aww6q8.js:2483046-2483285 placement
function cpuWallDelta(e, n) {
  if (e === undefined || n === undefined) return;
  let max = Math.max(0, Math.round(n.resources.cpuMs - e.resources.cpuMs));
  let max_2 = Math.max(0, Math.round(n.atMs - e.atMs));
  return Number.isSafeInteger(max) && Number.isSafeInteger(max_2)
    ? {
        cpuMs: max,
        wallMs: max_2,
      }
    : undefined;
}
//@ chunk-e6aww6q8.js:2483285-2483485 placement
function normalizeStreamStats(streaming) {
  let n = {
    ...streaming,
    cpuMs: Math.max(0, Math.round(streaming.cpuMs)),
    wallMs: Math.max(0, Math.round(streaming.wallMs)),
  };
  return [n.cpuMs, n.wallMs, n.streams, n.events, n.chunks ?? 0].every(Number.isSafeInteger) ? n : undefined;
}
//@ chunk-e6aww6q8.js:2483485-2483726 placement
function cpuFaultsSince(e) {
  let n = e && processCpuSnapshot();
  if (e === undefined || n === undefined) return;
  let max = Math.max(0, Math.round(n.cpuMs - e.cpuMs));
  let max_2 = Math.max(0, Math.round(n.majorFaults - e.majorFaults));
  return Number.isFinite(max) && Number.isFinite(max_2)
    ? {
        cpuMs: max,
        majorFaults: max_2,
      }
    : undefined;
}
//@ chunk-e6aww6q8.js:2483726-2483813 placement
function emitsStartupTiming() {
  return Boolean(env.CLAUDE_CODE_REMOTE || env.CLAUDE_CODE_EMIT_STARTUP_TIMING);
}
//@ chunk-e6aww6q8.js:2483813-2483929 placement
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
//@ chunk-e6aww6q8.js:2483929-2484109 placement
/**
 * 查询剖析中的进程启动调优字段（调优值与清理延迟），无盘模式或未采样时为空。
 */
function processStartTuningFields() {
  try {
    let e = processStartTuning();
    if (e === undefined || !isProcessTelemetryEnabled() || isDiskless()) return;
    let n = processStartPurgeDelayMs();
    return {
      process_start_tuning: e,
      ...(n !== undefined && {
        process_start_purge_delay_ms: n,
      }),
    };
  } catch (error) {
    logError(toError(error));
    return;
  }
}
//@ chunk-e6aww6q8.js:2484109-2484234 placement
/**
 * 查询剖析中的垃圾回收次数字段。
 */
function garbageCollectionFields() {
  try {
    let e = takeGarbageCollectionCount();
    return e !== undefined && isProcessTelemetryEnabled() && !isDiskless()
      ? {
          process_garbage_collections: e,
        }
      : undefined;
  } catch (error) {
    logError(toError(error));
    return;
  }
}
//@ chunk-e6aww6q8.js:2484234-2493029 placement
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
  streamsOpen = 0;
  streamsOpenSince = undefined;
  streaming = undefined;
  isStreamingUnmeasured = false;
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
    this.streamsOpen = 0;
    this.streamsOpenSince = undefined;
    this.streaming = undefined;
    this.isStreamingUnmeasured = false;
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
      this.betweenTurns = cpuWallDelta(lastTurnEndedAt, this.beganAt);
      this.memoryAtBegin = procMemorySnapshot();
      this.startLagProbe();
    }
  }
  startLagProbe() {
    let startTime = performance.now();
    let n = () => {
      if (!this.open || this.lagStartedAt !== startTime) return;
      try {
        let startTime_2 = performance.now();
        this.noteLag(startTime_2);
        if (startTime_2 - startTime > PROFILE_WINDOW_MS) {
          this.lagTimer = undefined;
          return;
        }
        this.armLagTick(n, startTime_2);
      } catch (error) {
        this.lagTimer = undefined;
        logError(error);
      }
    };
    this.lagStartedAt = startTime;
    this.armLagTick(n, startTime);
  }
  noteLag(e) {
    let n = e - this.lagExpectedAt;
    if (n > this.maxLagMs) this.maxLagMs = n;
  }
  armLagTick(e, n) {
    this.lagExpectedAt = n + MAX_PROFILE_SAMPLES;
    this.lagTimer = setTimeout(e, MAX_PROFILE_SAMPLES);
    this.lagTimer?.unref?.();
  }
  stopLagProbe() {
    if (this.lagTimer === undefined) return;
    clearTimeout(this.lagTimer);
    this.lagTimer = undefined;
    this.noteLag(performance.now());
  }
  add(e, n) {
    if (!this.open) return;
    this.phases[e] = (this.phases[e] ?? 0) + n;
  }
  startPhase(e) {
    if (!this.open) return;
    this.starts[e] = performance.now();
  }
  endPhase(e) {
    if (!this.open) return;
    let n = this.starts[e];
    if (n === undefined) return;
    delete this.starts[e];
    this.add(e, performance.now() - n);
  }
  startPhaseWithin(e, n) {
    if (!this.open) return;
    let r = this.starts[e];
    if (r === undefined) return;
    let startTime = performance.now();
    delete this.starts[e];
    this.add(e, startTime - r);
    this.starts[n] = startTime;
    if (n === "input_attachments") {
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
  noteAttachmentProducer(slowest, n, r) {
    let attachments = this.attachments;
    let inputAttachments = this.starts.input_attachments;
    if (!this.open || attachments === undefined || inputAttachments === undefined || n < inputAttachments)
      return;
    let y = performance.now() - Math.max(n, r ?? n);
    if (attachments.slowest === undefined || y > attachments.slowestMs) {
      attachments.slowest = slowest;
      attachments.slowestMs = y;
    }
  }
  noteChangedFilesReread(e) {
    let attachments = this.attachments;
    if (this.open && attachments !== undefined && this.starts.input_attachments !== undefined)
      attachments.changedFilesReread = (attachments.changedFilesReread ?? 0) + e;
  }
  noteChangedFilesCompared(e) {
    let attachments = this.attachments;
    if (!this.open || attachments === undefined || this.starts.input_attachments === undefined) return;
    for (let r of CHANGED_FILE_OUTCOMES_WITH_LINK) {
      let s = e[r];
      if (s !== undefined && s > 0) {
        attachments.touchCompare ??= {};
        attachments.touchCompare[r] = (attachments.touchCompare[r] ?? 0) + s;
      }
    }
  }
  noteAttachmentPass(e) {
    let attachments = this.attachments;
    let inputAttachments = this.starts.input_attachments;
    if (
      !this.open ||
      attachments === undefined ||
      inputAttachments === undefined ||
      e.beganAt < inputAttachments ||
      e.partMs.setup === undefined
    )
      return;
    let s = (attachments.passes ??= {
      partMs: {},
      producers: 0,
      tokenCounts: 0,
      tokenCountMs: 0,
      changedFileReadMs: undefined,
      differsFiles: {},
    });
    for (let h of QUERY_PROFILE_PARTS_2) {
      let y = e.partMs[h];
      if (y !== undefined) s.partMs[h] = (s.partMs[h] ?? 0) + y;
    }
    s.producers += e.producers;
    s.tokenCounts += e.tokenCounts;
    s.tokenCountMs += e.tokenCountMs;
    if (e.changedFileReadMs !== undefined)
      s.changedFileReadMs = (s.changedFileReadMs ?? 0) + e.changedFileReadMs;
    for (let h of DIFFERS_FILE_BUCKETS) {
      let y = e.differsFiles[h];
      if (y !== undefined && y > 0) s.differsFiles[h] = (s.differsFiles[h] ?? 0) + y;
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
  endPhaseWithin(e, n) {
    if (!this.open) return;
    let r = this.starts[n];
    if (r === undefined) return;
    let startTime = performance.now();
    delete this.starts[n];
    this.add(n, startTime - r);
    this.starts[e] = startTime;
    let attachments = this.attachments;
    if (n === "input_attachments" && attachments !== undefined) {
      let y = cpuFaultsSince(attachments.stretchFrom);
      attachments.stretchFrom = undefined;
      attachments.used =
        y === undefined || attachments.used === undefined
          ? undefined
          : {
              cpuMs: attachments.used.cpuMs + y.cpuMs,
              majorFaults: attachments.used.majorFaults + y.majorFaults,
            };
    }
  }
  noteRedrive(e) {
    if (!this.begun || this.open) return;
    this.redriveCause ??= e;
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
    let n = -1 / 0;
    for (let r of QUERY_PROFILE_PHASES_2) {
      let s = this.starts[r];
      if (s !== undefined && s >= n) {
        runningPhase = r;
        n = s;
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
    let e = this.endedUnconsumed ?? this.unconsumed();
    this.endedUnconsumed = undefined;
    return e;
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
    let e = (this.streaming ??= {
      cpuMs: 0,
      wallMs: 0,
      streams: 0,
      events: 0,
      chunks: 0,
    });
    e.streams++;
    if (this.streamsOpen++ === 0) this.streamsOpenSince = cpuSnapshotForProfile();
    let n = false;
    return (r, s) => {
      if (n || this.streaming !== e) return;
      n = true;
      e.events += r;
      e.chunks = e.chunks === undefined || s === undefined ? undefined : e.chunks + s;
      if (--this.streamsOpen === 0) this.endStreamWindow();
    };
  }
  endStreamWindow() {
    let streamsOpenSince = this.streamsOpenSince;
    let n = streamsOpenSince && cpuSnapshotForProfile();
    this.streamsOpenSince = undefined;
    if (this.streaming === undefined) return;
    if (streamsOpenSince === undefined || n === undefined) {
      this.isStreamingUnmeasured = true;
      return;
    }
    this.streaming.cpuMs += n.resources.cpuMs - streamsOpenSince.resources.cpuMs;
    this.streaming.wallMs += n.atMs - streamsOpenSince.atMs;
  }
  consume(e, n) {
    if (this.streamsOpen > 0) {
      this.endStreamWindow();
      if (this.streaming !== undefined) this.streaming.chunks = undefined;
    }
    let { phases, begun, window: h, firstDispatchAtMs, redriveCause } = this;
    let { beganAt, betweenTurns, streaming, isStreamingUnmeasured } = this;
    let memoryAtBegin = h && this.memoryAtBegin;
    let attachments = this.attachments;
    let storeConfirm = this.storeConfirm;
    this.reset();
    if (!begun) return;
    let we = resourceSnapshot();
    this.lastTurnEndedAt = we;
    if (firstDispatchAtMs !== undefined && n > firstDispatchAtMs)
      phases[`redrive_${redriveCause ?? "other"}`] = n - firstDispatchAtMs;
    let Ee = {
      other: 0,
    };
    let Ae = 0;
    let Ie = 0;
    for (let Yt of QUERY_PROFILE_PHASES_2) {
      let qt = phases[Yt];
      if (qt === undefined) continue;
      Ae += qt;
      let Zt = Math.round(Ae) - Ie;
      Ie += Zt;
      Ee[Yt] = Zt;
    }
    Ee.other = Math.round(e) - Ie;
    let used = attachments?.stretchFrom === undefined ? attachments?.used : undefined;
    let passes = attachments?.passes;
    let ze = attachments && {
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
    let inputAttachments = ze && Object.keys(ze).length > 0 ? ze : undefined;
    let resumeStoreConfirm = Ee.resume_store_confirm ?? 0;
    let min = Math.min(Math.floor(storeConfirm?.writeMs ?? 0), resumeStoreConfirm);
    let min_2 = Math.min(Math.floor(storeConfirm?.posts?.aheadMs ?? 0), resumeStoreConfirm - min);
    let min_3 = Math.min(Math.floor(storeConfirm?.posts?.postMs ?? 0), resumeStoreConfirm - min - min_2);
    let storeConfirm_2 =
      storeConfirm?.posts === undefined || Ee.resume_store_confirm === undefined
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
    let gt = memoryAtBegin && procMemorySnapshot();
    let At = h && isProcessTelemetryEnabled() ? cpuWallDelta(beganAt, we) : undefined;
    let It;
    if (At === undefined) this.shellCountedTo = undefined;
    else if (beganAt?.shellMs !== undefined && we?.shellMs !== undefined) {
      let shellCountedTo = this.shellCountedTo;
      let qt = we.shellMs - beganAt.shellMs;
      let Zt = shellCountedTo && beganAt.shellMs - shellCountedTo.shellMs;
      let rn = shellCountedTo && Math.round(beganAt.atMs - shellCountedTo.atMs);
      It = isValidTimingMs(qt)
        ? {
            turnMs: qt,
            sinceLastResult:
              isValidTimingMs(Zt) && isValidTimingMs(rn)
                ? {
                    cpuMs: Zt,
                    wallMs: rn,
                  }
                : undefined,
          }
        : undefined;
      this.shellCountedTo = It && {
        shellMs: we.shellMs,
        atMs: we.atMs,
      };
    }
    return {
      phases: Ee,
      window: h,
      inputAttachments,
      storeConfirm: storeConfirm_2,
      memory: memoryAtBegin &&
        gt && {
          atBegin: memoryAtBegin,
          atConsume: gt,
        },
      betweenTurns: At && betweenTurns,
      turn: At,
      streaming: At && streaming && !isStreamingUnmeasured ? normalizeStreamStats(streaming) : undefined,
      shellCpu: It,
    };
  }
}
//@ chunk-e6aww6q8.js:2493029-2493763 placement
/**
 * QUERY_PROFILE_PHASES：查询剖析的阶段名。
 */
var QUERY_PROFILE_PHASES_2 = [
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
var QUERY_PROFILE_PHASES = new HostScoped(() => new QueryProfiler());
//@ chunk-e6aww6q8.js:2493763-2493831 placement
function withProfileState(e) {
  try {
    return e(QUERY_PROFILE_PHASES.of(getRootSession().host));
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-e6aww6q8.js:2493831-2493865 placement
/**
 * beginProfile：开始一次查询剖析。
 */
function beginProfile() {
  withProfileState((e) => e.begin());
}
//@ chunk-e6aww6q8.js:2493865-2493905 placement
/**
 * startProfilePhase：开始某阶段。
 */
function startProfilePhase(e) {
  withProfileState((n) => n.startPhase(e));
}
//@ chunk-e6aww6q8.js:2493905-2493943 placement
/**
 * endProfilePhase：结束某阶段。
 */
function endProfilePhase(e) {
  withProfileState((n) => n.endPhase(e));
}
//@ chunk-e6aww6q8.js:2493943-2493994 placement
/**
 * startPhaseWithin：开始嵌套阶段。
 */
function startPhaseWithin(e, n) {
  withProfileState((r) => r.startPhaseWithin(e, n));
}
//@ chunk-e6aww6q8.js:2493994-2494055 placement
/**
 * noteAttachmentProducer：记录附件生产者耗时。
 */
function noteAttachmentProducer(label, n, markedAt) {
  withProfileState((s) => s.noteAttachmentProducer(label, n, markedAt));
}
//@ chunk-e6aww6q8.js:2494055-2494104 placement
/**
 * noteAttachmentPass：记录一次附件处理。
 */
function noteAttachmentPass(e) {
  withProfileState((n) => n.noteAttachmentPass(e));
}
//@ chunk-e6aww6q8.js:2494104-2494157 placement
/**
 * noteChangedFilesReread：记录改动文件重读。
 */
function noteChangedFilesReread(e) {
  withProfileState((n) => n.noteChangedFilesReread(e));
}
//@ chunk-e6aww6q8.js:2494157-2494212 placement
/**
 * noteChangedFilesCompared：记录改动文件比较。
 */
function noteChangedFilesCompared(e) {
  withProfileState((n) => n.noteChangedFilesCompared(e));
}
//@ chunk-e6aww6q8.js:2494212-2494264 placement
/**
 * noteStoreConfirmWrite：记录存储确认写。
 */
function noteStoreConfirmWrite(e) {
  withProfileState((n) => n.noteStoreConfirmWrite(e));
}
//@ chunk-e6aww6q8.js:2494264-2494316 placement
function noteStoreConfirmPosts(e) {
  withProfileState((n) => n.noteStoreConfirmPosts(e));
}
//@ chunk-e6aww6q8.js:2494316-2494516 placement
/**
 * 创建存储确认计时器：只在第一次确认时记录，返回的函数在指定时刻结束计时。
 */
function makeStoreConfirmTimer(e) {
  let n = runProfileStepSafely(e);
  let r = n !== undefined;
  let s = (h) => {
    if (n === undefined || !r) return;
    r = false;
    return runProfileStepSafely(() => n(h));
  };
  withProfileState((h) =>
    h.holdStoreConfirmWatch(() => {
      s(performance.now());
    }),
  );
  return (h) => {
    let y = s(h);
    if (y) noteStoreConfirmPosts(y);
  };
}
//@ chunk-e6aww6q8.js:2494516-2494569 placement
function runProfileStepSafely(e) {
  try {
    return e();
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-e6aww6q8.js:2494569-2494618 placement
/**
 * endPhaseWithin：结束嵌套阶段。
 */
function endPhaseWithin(e, n) {
  withProfileState((r) => r.endPhaseWithin(e, n));
}
//@ chunk-e6aww6q8.js:2494618-2494692 placement
/**
 * measurePhase：在剖析中执行并计时。
 */
async function measurePhase(e, n, r) {
  startPhaseWithin(e, n);
  try {
    return await r();
  } finally {
    endPhaseWithin(e, n);
  }
}
//@ chunk-e6aww6q8.js:2494692-2494740 placement
/**
 * closeProfile：关闭剖析并返回是否已上报。
 */
function closeProfile(e) {
  return withProfileState((n) => n.close(e)) === true;
}
//@ chunk-e6aww6q8.js:2494740-2494835 placement
/**
 * openProfileStream：打开剖析流。
 */
function openProfileStream() {
  let e = withProfileState((n) => n.openStream());
  return (
    e &&
    ((n, r) => {
      try {
        e(n, r);
      } catch (error) {
        logError(toError(error));
      }
    })
  );
}
//@ chunk-e6aww6q8.js:2494835-2494877 placement
/**
 * noteRedrive：记录重放。
 */
function noteRedrive(e) {
  withProfileState((n) => n.noteRedrive(e));
}
//@ chunk-e6aww6q8.js:2494877-2494926 placement
/**
 * consumeProfile：消费剖析数据。
 */
function consumeProfile(e, n) {
  return withProfileState((r) => r.consume(e, n));
}
//@ chunk-e6aww6q8.js:2494926-2494971 placement
/**
 * currentTurnIndex：当前回合序号。
 */
function currentTurnIndex() {
  return withProfileState((e) => e.turnIndex());
}
//@ chunk-e6aww6q8.js:2494971-2495003 placement
/**
 * endProfile：结束剖析。
 */
function endProfile() {
  withProfileState((e) => e.end());
}
export {
  startPhaseWithin,
  endPhaseWithin,
  measurePhase,
  noteStoreConfirmWrite,
  makeStoreConfirmTimer,
  startQueryProfile,
  queryCheckpoint,
  endProfile,
  beginProfile,
  startProfilePhase,
  endProfilePhase,
  consumeProfile,
  currentTurnIndex,
  finishQueryProfile,
  closeProfile,
  openProfileStream,
  endQueryProfile,
  noteRedrive,
  noteAttachmentProducer,
  noteChangedFilesReread,
  noteChangedFilesCompared,
  AttachmentTimingProfile,
  runWithQueryProfile,
  noteAttachmentPass,
  queryProfileStorage,
  processStartTuningFields,
  garbageCollectionFields,
};
