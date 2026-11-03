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
import {
  AsyncLocalStorage,
  AsyncLocalStorage as AsyncLocalStorage_2,
  AsyncLocalStorage as AsyncLocalStorage_3,
  AsyncLocalStorage as AsyncLocalStorage_4,
  AsyncLocalStorage as AsyncLocalStorage_5,
  AsyncLocalStorage as AsyncLocalStorage_6,
  AsyncLocalStorage as AsyncLocalStorage_7,
  AsyncLocalStorage as AsyncLocalStorage_8,
} from "async_hooks";
import {
  readFileSync,
  readFileSync as readFileSync_2,
  readFileSync as readFileSync_3,
  readFileSync as readFileSync_4,
  readFileSync as readFileSync_5,
  readFileSync as readFileSync_6,
  readFileSync as readFileSync_7,
  readFileSync as readFileSync_8,
} from "fs";
import {
  posix,
  posix as posix_2,
  posix as posix_3,
  posix as posix_4,
  posix as posix_5,
  posix as posix_6,
  posix as posix_7,
  posix as posix_8,
  posix as posix_9,
  posix as posix_10,
  posix as posix_11,
  posix as posix_12,
} from "path";
import { isEnvTruthy } from "./envUtils.js";
import { HostScoped } from "./hostScoped.js";
import { getRootSession, isDiskless } from "../bootstrap/state.js";
import { getPerformance, formatTimelineLine, formatMs } from "./profilerBase.js";
import { repeatString } from "./stringUtils.js";
import { logError } from "./log.js";
import { logForDebugging } from "./debug.js";
import { o } from "../../vendor/zod/v4/classic/schemas.js";
import { env } from "./env.js";
import { getPlatform } from "./platform.js";
import { rHe } from "./shell/processCpuTime.js";
import { readCpuUsageSeconds } from "./shell/cpuReport.js";
import { mn } from "./remoteEnvironment.js";
import { isTelemetryDisabled } from "./privacyLevel.js";
import { Ehr } from "./hostEnvironment.js";
import { processStartTuning, processStartPurgeDelayMs } from "./processStartTuning.js";
import { toError } from "./errors.js";
import { takeGarbageCollectionCount } from "./gcCount.js";
import { zhi } from "./startupTiming.js";

/**
 * 构建时固化为 false 的剖析开关。
 */
//@ chunk-e6aww6q8.js:2477148-2477167 sole-consumer
var isQueryProfilingEnabled = isEnvTruthy(void 0);
/**
 * 剖析状态：每个检查点的内存快照与查询计数。
 */
//@ chunk-e6aww6q8.js:2477167-2477343 sole-consumer
class QueryProfileState {
  memorySnapshots = new Map();
  queryCount = 0;
  startQuery() {
    (this.memorySnapshots.clear(), this.queryCount++);
  }
  snapshotMemory(e) {
    this.memorySnapshots.set(e, process.memoryUsage());
  }
}
/**
 * 按 session.host 的剖析状态懒槽。
 */
//@ chunk-e6aww6q8.js:2477343-2477370 sole-consumer
var queryProfileStateSlot = new HostScoped(() => new QueryProfileState());
/**
 * 取当前会话的剖析状态。
 */
//@ chunk-e6aww6q8.js:2477370-2477409 affinity
function getQueryProfileState() {
  return queryProfileStateSlot.of(getRootSession().host);
}
/**
 * 开始一次查询剖析：清 mark、计数加一、打 query_user_input_received。
 */
//@ chunk-e6aww6q8.js:2477409-2477509 fingerprint = startQueryProfile (0.849)
function startQueryProfile() {
  if (!isQueryProfilingEnabled) return;
  (getPerformance().clearMarks(),
    getQueryProfileState().startQuery(),
    queryCheckpoint("query_user_input_received"));
}
/**
 * 打一个剖析检查点（mark + 内存快照）；关闭时什么也不做。queryLoop/queryModel 里大量调用（query_fn_entry、query_api_request_sent 等）。
 */
//@ chunk-e6aww6q8.js:2477509-2477577 callgraph-witnessed = queryCheckpoint (0.162)
function queryCheckpoint(name) {
  if (!isQueryProfilingEnabled) return;
  (getPerformance().mark(name), getQueryProfileState().snapshotMemory(name));
}
/**
 * 结束剖析（query_profile_end）。
 */
//@ chunk-e6aww6q8.js:2477577-2477631 fingerprint = endQueryProfile (1)
function endQueryProfile() {
  if (!isQueryProfilingEnabled) return;
  queryCheckpoint("query_profile_end");
}
/**
 * 按耗时给检查点加 SLOW/VERY SLOW 等提示。
 */
//@ chunk-e6aww6q8.js:2477631-2477999 fingerprint = getSlowWarning (0.872)
function getSlowWarning(deltaMs, name) {
  if (name === "query_user_input_received") return "";
  if (deltaMs > 1000) return " \u26A0\uFE0F  VERY SLOW";
  if (deltaMs > 100) return " \u26A0\uFE0F  SLOW";
  if (name.includes("git_status") && deltaMs > 50) return " \u26A0\uFE0F  git status";
  if (name.includes("tool_schema") && deltaMs > 50) return " \u26A0\uFE0F  tool schemas";
  if (name.includes("client_creation") && deltaMs > 50) return " \u26A0\uFE0F  client creation";
  return "";
}
/**
 * 生成查询剖析报告文本（未开启时提示设置 CLAUDE_CODE_PROFILE_QUERY=1）。
 */
//@ chunk-e6aww6q8.js:2477999-2478970 fingerprint = getQueryProfileReport (0.96)
function getQueryProfileReport() {
  if (!isQueryProfilingEnabled) return "Query profiling not enabled (set CLAUDE_CODE_PROFILE_QUERY=1)";
  let entriesByType = getPerformance().getEntriesByType("mark");
  if (entriesByType.length === 0) return "No query profiling checkpoints recorded";
  let perf = getQueryProfileState(),
    lines = [];
  (lines.push("=".repeat(80)),
    lines.push(`QUERY PROFILING REPORT - Query #${perf.queryCount}`),
    lines.push("=".repeat(80)),
    lines.push(""));
  let baselineTime = entriesByType[0]?.startTime ?? 0,
    y = baselineTime,
    S = 0,
    w = 0;
  for (let mark of entriesByType) {
    let Z = mark.startTime - baselineTime,
      Se = mark.startTime - y;
    if (
      (lines.push(
        formatTimelineLine(
          Z,
          Se,
          mark.name,
          perf.memorySnapshots.get(mark.name),
          10,
          9,
          getSlowWarning(Se, mark.name),
        ),
      ),
      mark.name === "query_api_request_sent")
    )
      S = Z;
    if (mark.name === "query_first_chunk_received") w = Z;
    y = mark.startTime;
  }
  let at = entriesByType.at(-1),
    totalTime = at ? at.startTime - baselineTime : 0;
  if ((lines.push(""), lines.push("-".repeat(80)), w > 0)) {
    let q = S,
      Z = w - S,
      preRequestPercent = ((q / w) * 100).toFixed(1),
      networkPercent = ((Z / w) * 100).toFixed(1);
    (lines.push(`Total TTFT: ${formatMs(w)}ms`),
      lines.push(`  - Pre-request overhead: ${formatMs(q)}ms (${preRequestPercent}%)`),
      lines.push(`  - Network latency: ${formatMs(Z)}ms (${networkPercent}%)`));
  } else lines.push(`Total time: ${formatMs(totalTime)}ms`);
  return (
    lines.push(getPhaseSummary(entriesByType, baselineTime)),
    lines.push("=".repeat(80)),
    lines.join(`
`)
  );
}
/**
 * 按阶段（上下文加载、自动压缩、查询准备、网络、工具执行等）汇总耗时。
 */
//@ chunk-e6aww6q8.js:2478970-2480157 fingerprint = getPhaseSummary (0.994)
function getPhaseSummary(marks, baselineTime) {
  let r = [
      { name: "Context loading", start: "query_context_loading_start", end: "query_context_loading_end" },
      { name: "Autocompact", start: "query_autocompact_start", end: "query_autocompact_end" },
      { name: "Query setup", start: "query_setup_start", end: "query_setup_end" },
      { name: "Tool schemas", start: "query_tool_schema_build_start", end: "query_tool_schema_build_end" },
      {
        name: "Message normalization",
        start: "query_message_normalization_start",
        end: "query_message_normalization_end",
      },
      { name: "Client creation", start: "query_client_creation_start", end: "query_client_creation_end" },
      { name: "Network TTFB", start: "query_api_request_sent", end: "query_first_chunk_received" },
      { name: "Tool execution", start: "query_tool_execution_start", end: "query_tool_execution_end" },
    ],
    markMap = new Map(marks.map((S) => [S.name, S.startTime - baselineTime])),
    lines = [];
  (lines.push(""), lines.push("PHASE BREAKDOWN:"));
  for (let phase of r) {
    let startTime = markMap.get(phase.start),
      endTime = markMap.get(phase.end);
    if (startTime !== void 0 && endTime !== void 0) {
      let duration = endTime - startTime,
        q = repeatString("\u2588", Math.min(Math.ceil(duration / 10), 50));
      lines.push(`  ${phase.name.padEnd(22)} ${formatMs(duration).padStart(10)}ms ${q}`);
    }
  }
  let apiRequestSent = markMap.get("query_api_request_sent");
  if (apiRequestSent !== void 0)
    (lines.push(""),
      lines.push(`  ${"Total pre-API overhead".padEnd(22)} ${formatMs(apiRequestSent).padStart(10)}ms`));
  return lines.join(`
`);
}
//@ chunk-e6aww6q8.js:2480157-2480231 placement
function bJn() {
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
var QUERY_PROFILE_PARTS = ["setup", "prompt_producers", "ambient_start", "ambient_wait", "render"],
  DIFFERS_FILE_SIZE_BUCKETS = [
    "size_under_25_kb",
    "size_25_to_50_kb",
    "size_50_to_256_kb",
    "size_over_256_kb",
  ],
  KIB = 1024;
//@ chunk-e6aww6q8.js:2480517-2480781 placement
class NestedStopwatch {
  begun = 0;
  ms = 0;
  #e = 0;
  #t = 0;
  begin() {
    if ((this.begun++, this.#e++ === 0)) this.#t = performance.now();
    let e = !1;
    return () => {
      if (e) return;
      if (((e = !0), this.#e > 0 && --this.#e === 0)) this.ms += performance.now() - this.#t;
    };
  }
  stop() {
    if (this.#e > 0) ((this.#e = 0), (this.ms += performance.now() - this.#t));
  }
}
/**
 * 一次查询附件阶段的计时器：mark 记录各阶段（setup/prompt_producers/ambient/render）耗时，嵌套计时 token 计数与变更文件读取，统计 differs 文件大小分桶；finish 返回汇总。
 */
//@ chunk-e6aww6q8.js:2480781-2481723 placement
class AttachmentTimingProfile {
  beganAt = performance.now();
  #e = this.beganAt;
  #t = 0;
  #n = {};
  #o = { token_count: new NestedStopwatch(), changed_file_read: new NestedStopwatch() };
  #r = {};
  #i = !1;
  get markedAt() {
    return this.#e;
  }
  mark(e) {
    if (this.#i) return;
    let startTime = performance.now();
    ((this.#n[e] = (this.#n[e] ?? 0) + startTime - this.#e), (this.#e = startTime));
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
      e < 25 * KIB
        ? "size_under_25_kb"
        : e < 50 * KIB
          ? "size_25_to_50_kb"
          : e <= 256 * KIB
            ? "size_50_to_256_kb"
            : "size_over_256_kb";
    if (((this.#r[r] = (this.#r[r] ?? 0) + 1), n)) this.#r.hash_only = (this.#r.hash_only ?? 0) + 1;
  }
  finish() {
    if (this.#n.setup !== void 0) this.mark("render");
    return (
      this.#o.token_count.stop(),
      this.#o.changed_file_read.stop(),
      (this.#i = !0),
      {
        beganAt: this.beganAt,
        partMs: this.#n,
        producers: this.#t,
        tokenCounts: this.#o.token_count.begun,
        tokenCountMs: this.#o.token_count.ms,
        changedFileReadMs: this.#o.changed_file_read.begun > 0 ? this.#o.changed_file_read.ms : void 0,
        differsFiles: this.#r,
      }
    );
  }
}
//@ chunk-e6aww6q8.js:2481723-2481739 placement
var H7e = new AsyncLocalStorage_4();
//@ chunk-e6aww6q8.js:2481739-2481777 placement
function sdn(e, n) {
  return H7e.run(e, n);
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
  ],
  CHANGED_FILE_OUTCOMES_WITH_LINK = [...CHANGED_FILE_OUTCOMES, "via_outputs_link"],
  DIFFERS_FILE_BUCKETS = [...DIFFERS_FILE_SIZE_BUCKETS, "hash_only"],
  MAX_PROFILE_SAMPLES = 50,
  PROFILE_WINDOW_MS = 120000;
//@ chunk-e6aww6q8.js:2482165-2482322 placement
function processCpuSnapshot() {
  try {
    if (isDiskless()) return;
    let resourceUsage = process.resourceUsage();
    return {
      cpuMs: (resourceUsage.userCPUTime + resourceUsage.systemCPUTime) / 1000,
      majorFaults: resourceUsage.majorPageFault,
    };
  } catch {
    return;
  }
}
//@ chunk-e6aww6q8.js:2482322-2482533 placement
function procMemorySnapshot() {
  try {
    if (!isProcessTelemetryEnabled() || isDiskless() || getPlatform() !== "linux") return;
    let e = readFileSync_5("/proc/self/status", "utf8"),
      n = procStatusMib(e, "VmRSS");
    return n === void 0
      ? void 0
      : { rssMib: n, anonMib: procStatusMib(e, "RssAnon"), peakRssMib: procStatusMib(e, "VmHWM") };
  } catch {
    return;
  }
}
//@ chunk-e6aww6q8.js:2482533-2482678 placement
function procStatusMib(e, n) {
  let match = new RegExp(`^${n}:\\s+(\\d+) kB$`, "m").exec(e),
    rounded = Math.round(Number(match?.[1]) / 1024);
  return Number.isSafeInteger(rounded) ? rounded : void 0;
}
//@ chunk-e6aww6q8.js:2482678-2482767 placement
function $ve() {
  let e = processCpuSnapshot();
  return e && { resources: e, atMs: performance.now(), shellMs: void 0 };
}
//@ chunk-e6aww6q8.js:2482767-2482933 placement
function resourceSnapshot() {
  let e = $ve();
  if (e === void 0) return;
  let n = rHe(),
    r = n === void 0 ? void 0 : readCpuUsageSeconds(posix_8.join(n, "cpuacct.usage"));
  return { ...e, shellMs: r === void 0 ? void 0 : Math.floor(r) };
}
//@ chunk-e6aww6q8.js:2482933-2482981 placement
function IB(e) {
  return Math.max(0, Math.floor(e));
}
//@ chunk-e6aww6q8.js:2482981-2483046 placement
function U7e(e) {
  return e !== void 0 && e >= 0 && Number.isSafeInteger(e);
}
//@ chunk-e6aww6q8.js:2483046-2483285 placement
function cpuWallDelta(e, n) {
  if (e === void 0 || n === void 0) return;
  let max = Math.max(0, Math.round(n.resources.cpuMs - e.resources.cpuMs)),
    max_2 = Math.max(0, Math.round(n.atMs - e.atMs));
  return Number.isSafeInteger(max) && Number.isSafeInteger(max_2) ? { cpuMs: max, wallMs: max_2 } : void 0;
}
//@ chunk-e6aww6q8.js:2483285-2483485 placement
function normalizeStreamStats(e) {
  let n = { ...e, cpuMs: Math.max(0, Math.round(e.cpuMs)), wallMs: Math.max(0, Math.round(e.wallMs)) };
  return [n.cpuMs, n.wallMs, n.streams, n.events, n.chunks ?? 0].every(Number.isSafeInteger) ? n : void 0;
}
//@ chunk-e6aww6q8.js:2483485-2483726 placement
function cpuFaultsSince(e) {
  let n = e && processCpuSnapshot();
  if (e === void 0 || n === void 0) return;
  let max = Math.max(0, Math.round(n.cpuMs - e.cpuMs)),
    max_2 = Math.max(0, Math.round(n.majorFaults - e.majorFaults));
  return Number.isFinite(max) && Number.isFinite(max_2) ? { cpuMs: max, majorFaults: max_2 } : void 0;
}
//@ chunk-e6aww6q8.js:2483726-2483813 placement
function amr() {
  return Boolean(env.CLAUDE_CODE_REMOTE || env.CLAUDE_CODE_EMIT_STARTUP_TIMING);
}
//@ chunk-e6aww6q8.js:2483813-2483929 placement
function isProcessTelemetryEnabled() {
  try {
    return (
      mn() && env.CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE !== "self_hosted" && !isTelemetryDisabled() && !Ehr()
    );
  } catch {
    return !1;
  }
}
/**
 * 查询剖析中的进程启动调优字段（调优值与清理延迟），无盘模式或未采样时为空。
 */
//@ chunk-e6aww6q8.js:2483929-2484109 placement
function processStartTuningFields() {
  try {
    let e = processStartTuning();
    if (e === void 0 || !isProcessTelemetryEnabled() || isDiskless()) return;
    let n = processStartPurgeDelayMs();
    return { process_start_tuning: e, ...(n !== void 0 && { process_start_purge_delay_ms: n }) };
  } catch (error) {
    logError(toError(error));
    return;
  }
}
/**
 * 查询剖析中的垃圾回收次数字段。
 */
//@ chunk-e6aww6q8.js:2484109-2484234 placement
function garbageCollectionFields() {
  try {
    let e = takeGarbageCollectionCount();
    return e !== void 0 && isProcessTelemetryEnabled() && !isDiskless()
      ? { process_garbage_collections: e }
      : void 0;
  } catch (error) {
    logError(toError(error));
    return;
  }
}
/**
 * 查询性能剖析器：记录一次查询各阶段耗时。
 */
//@ chunk-e6aww6q8.js:2484234-2493029 placement
class QueryProfiler {
  begun = !1;
  open = !1;
  phases = {};
  starts = {};
  closedTurns = 0;
  beganAt = void 0;
  lastTurnEndedAt = void 0;
  shellCountedTo = void 0;
  betweenTurns = void 0;
  memoryAtBegin = void 0;
  window = void 0;
  lagTimer = void 0;
  lagStartedAt = 0;
  lagExpectedAt = 0;
  maxLagMs = 0;
  firstDispatchAtMs = void 0;
  redriveCause = void 0;
  endedUnconsumed = void 0;
  unconsumedTaken = !1;
  attachments = void 0;
  storeConfirm = void 0;
  streamsOpen = 0;
  streamsOpenSince = void 0;
  streaming = void 0;
  isStreamingUnmeasured = !1;
  endStoreConfirmWatch = void 0;
  reset() {
    ((this.begun = !1),
      (this.open = !1),
      (this.phases = {}),
      (this.starts = {}),
      (this.beganAt = void 0),
      (this.betweenTurns = void 0),
      (this.memoryAtBegin = void 0),
      (this.window = void 0),
      this.stopLagProbe(),
      (this.maxLagMs = 0),
      (this.firstDispatchAtMs = void 0),
      (this.redriveCause = void 0),
      (this.attachments = void 0),
      (this.storeConfirm = void 0),
      (this.streamsOpen = 0),
      (this.streamsOpenSince = void 0),
      (this.streaming = void 0),
      (this.isStreamingUnmeasured = !1));
    let endStoreConfirmWatch = this.endStoreConfirmWatch;
    ((this.endStoreConfirmWatch = void 0), endStoreConfirmWatch?.());
  }
  begin() {
    (this.reset(),
      (this.endedUnconsumed = void 0),
      (this.unconsumedTaken = !1),
      (this.begun = amr()),
      (this.open = this.begun));
    let { lastTurnEndedAt: lastTurnEndedAt } = this;
    if (((this.lastTurnEndedAt = void 0), this.open)) {
      if ((zhi(isProcessTelemetryEnabled), !isProcessTelemetryEnabled())) this.shellCountedTo = void 0;
      ((this.beganAt = resourceSnapshot()),
        (this.betweenTurns = cpuWallDelta(lastTurnEndedAt, this.beganAt)),
        (this.memoryAtBegin = procMemorySnapshot()),
        this.startLagProbe());
    }
  }
  startLagProbe() {
    let startTime = performance.now(),
      n = () => {
        if (!this.open || this.lagStartedAt !== startTime) return;
        try {
          let startTime_2 = performance.now();
          if ((this.noteLag(startTime_2), startTime_2 - startTime > PROFILE_WINDOW_MS)) {
            this.lagTimer = void 0;
            return;
          }
          this.armLagTick(n, startTime_2);
        } catch (error) {
          ((this.lagTimer = void 0), logError(error));
        }
      };
    ((this.lagStartedAt = startTime), this.armLagTick(n, startTime));
  }
  noteLag(e) {
    let n = e - this.lagExpectedAt;
    if (n > this.maxLagMs) this.maxLagMs = n;
  }
  armLagTick(e, n) {
    ((this.lagExpectedAt = n + MAX_PROFILE_SAMPLES),
      (this.lagTimer = setTimeout(e, MAX_PROFILE_SAMPLES)),
      this.lagTimer?.unref?.());
  }
  stopLagProbe() {
    if (this.lagTimer === void 0) return;
    (clearTimeout(this.lagTimer), (this.lagTimer = void 0), this.noteLag(performance.now()));
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
    if (n === void 0) return;
    (delete this.starts[e], this.add(e, performance.now() - n));
  }
  startPhaseWithin(e, n) {
    if (!this.open) return;
    let r = this.starts[e];
    if (r === void 0) return;
    let startTime = performance.now();
    if (
      (delete this.starts[e],
      this.add(e, startTime - r),
      (this.starts[n] = startTime),
      n === "input_attachments")
    ) {
      if (
        ((this.attachments ??= {
          slowest: void 0,
          slowestMs: 0,
          used: { cpuMs: 0, majorFaults: 0 },
          stretchFrom: void 0,
          changedFilesReread: void 0,
          touchCompare: void 0,
          passes: void 0,
        }),
        (this.attachments.stretchFrom = processCpuSnapshot()),
        this.attachments.stretchFrom === void 0)
      )
        this.attachments.used = void 0;
    }
  }
  noteAttachmentProducer(e, n, r) {
    let attachments = this.attachments,
      input_attachments = this.starts.input_attachments;
    if (!this.open || attachments === void 0 || input_attachments === void 0 || n < input_attachments) return;
    let y = performance.now() - Math.max(n, r ?? n);
    if (attachments.slowest === void 0 || y > attachments.slowestMs)
      ((attachments.slowest = e), (attachments.slowestMs = y));
  }
  noteChangedFilesReread(e) {
    let attachments = this.attachments;
    if (this.open && attachments !== void 0 && this.starts.input_attachments !== void 0)
      attachments.changedFilesReread = (attachments.changedFilesReread ?? 0) + e;
  }
  noteChangedFilesCompared(e) {
    let attachments = this.attachments;
    if (!this.open || attachments === void 0 || this.starts.input_attachments === void 0) return;
    for (let r of CHANGED_FILE_OUTCOMES_WITH_LINK) {
      let s = e[r];
      if (s !== void 0 && s > 0)
        ((attachments.touchCompare ??= {}),
          (attachments.touchCompare[r] = (attachments.touchCompare[r] ?? 0) + s));
    }
  }
  noteAttachmentPass(e) {
    let attachments = this.attachments,
      input_attachments = this.starts.input_attachments;
    if (
      !this.open ||
      attachments === void 0 ||
      input_attachments === void 0 ||
      e.beganAt < input_attachments ||
      e.partMs.setup === void 0
    )
      return;
    let s = (attachments.passes ??= {
      partMs: {},
      producers: 0,
      tokenCounts: 0,
      tokenCountMs: 0,
      changedFileReadMs: void 0,
      differsFiles: {},
    });
    for (let h of QUERY_PROFILE_PARTS) {
      let y = e.partMs[h];
      if (y !== void 0) s.partMs[h] = (s.partMs[h] ?? 0) + y;
    }
    if (
      ((s.producers += e.producers),
      (s.tokenCounts += e.tokenCounts),
      (s.tokenCountMs += e.tokenCountMs),
      e.changedFileReadMs !== void 0)
    )
      s.changedFileReadMs = (s.changedFileReadMs ?? 0) + e.changedFileReadMs;
    for (let h of DIFFERS_FILE_BUCKETS) {
      let y = e.differsFiles[h];
      if (y !== void 0 && y > 0) s.differsFiles[h] = (s.differsFiles[h] ?? 0) + y;
    }
  }
  noteStoreConfirmWrite(e) {
    if (this.open && this.starts.resume_store_confirm !== void 0)
      this.storeConfirm = { writeMs: e, posts: this.storeConfirm?.posts };
  }
  holdStoreConfirmWatch(e) {
    this.endStoreConfirmWatch = e;
  }
  noteStoreConfirmPosts(e) {
    if (this.open && this.starts.resume_store_confirm !== void 0)
      this.storeConfirm = { writeMs: this.storeConfirm?.writeMs ?? 0, posts: e };
  }
  endPhaseWithin(e, n) {
    if (!this.open) return;
    let r = this.starts[n];
    if (r === void 0) return;
    let startTime = performance.now();
    (delete this.starts[n], this.add(n, startTime - r), (this.starts[e] = startTime));
    let attachments = this.attachments;
    if (n === "input_attachments" && attachments !== void 0) {
      let y = cpuFaultsSince(attachments.stretchFrom);
      ((attachments.stretchFrom = void 0),
        (attachments.used =
          y === void 0 || attachments.used === void 0
            ? void 0
            : {
                cpuMs: attachments.used.cpuMs + y.cpuMs,
                majorFaults: attachments.used.majorFaults + y.majorFaults,
              }));
    }
  }
  noteRedrive(e) {
    if (!this.begun || this.open) return;
    this.redriveCause ??= e;
  }
  end() {
    if (((this.endedUnconsumed ??= this.unconsumed()), this.begun || this.lastTurnEndedAt !== void 0))
      this.lastTurnEndedAt = $ve();
    this.reset();
  }
  unconsumed() {
    if (!this.begun) return;
    if (!this.open) return { dispatched: !0, dispatchedAtMs: this.firstDispatchAtMs, runningPhase: void 0 };
    let e,
      n = -1 / 0;
    for (let r of QUERY_PROFILE_PHASES) {
      let s = this.starts[r];
      if (s !== void 0 && s >= n) ((e = r), (n = s));
    }
    return { dispatched: !1, runningPhase: e };
  }
  takeUnconsumed() {
    if (this.unconsumedTaken) return;
    this.unconsumedTaken = !0;
    let e = this.endedUnconsumed ?? this.unconsumed();
    return ((this.endedUnconsumed = void 0), e);
  }
  close(e) {
    if (!this.open) return !1;
    ((this.open = !1), (this.firstDispatchAtMs = e));
    let n = cpuFaultsSince(this.beganAt?.resources);
    return (
      this.stopLagProbe(),
      (this.window = {
        processTurnIndex: this.closedTurns++,
        loopLagMs: Math.round(this.maxLagMs),
        resources: n,
      }),
      !0
    );
  }
  turnIndex() {
    return this.begun && isProcessTelemetryEnabled()
      ? (this.window?.processTurnIndex ?? this.closedTurns)
      : void 0;
  }
  openStream() {
    if (!this.begun || !isProcessTelemetryEnabled()) return () => {};
    let e = (this.streaming ??= { cpuMs: 0, wallMs: 0, streams: 0, events: 0, chunks: 0 });
    if ((e.streams++, this.streamsOpen++ === 0)) this.streamsOpenSince = $ve();
    let n = !1;
    return (r, s) => {
      if (n || this.streaming !== e) return;
      if (
        ((n = !0),
        (e.events += r),
        (e.chunks = e.chunks === void 0 || s === void 0 ? void 0 : e.chunks + s),
        --this.streamsOpen === 0)
      )
        this.endStreamWindow();
    };
  }
  endStreamWindow() {
    let streamsOpenSince = this.streamsOpenSince,
      n = streamsOpenSince && $ve();
    if (((this.streamsOpenSince = void 0), this.streaming === void 0)) return;
    if (streamsOpenSince === void 0 || n === void 0) {
      this.isStreamingUnmeasured = !0;
      return;
    }
    ((this.streaming.cpuMs += n.resources.cpuMs - streamsOpenSince.resources.cpuMs),
      (this.streaming.wallMs += n.atMs - streamsOpenSince.atMs));
  }
  consume(e, n) {
    if (this.streamsOpen > 0) {
      if ((this.endStreamWindow(), this.streaming !== void 0)) this.streaming.chunks = void 0;
    }
    let {
        phases: phases,
        begun: begun,
        window: h,
        firstDispatchAtMs: firstDispatchAtMs,
        redriveCause: redriveCause,
      } = this,
      {
        beganAt: beganAt,
        betweenTurns: betweenTurns,
        streaming: streaming,
        isStreamingUnmeasured: isStreamingUnmeasured,
      } = this,
      Z = h && this.memoryAtBegin,
      attachments = this.attachments,
      storeConfirm = this.storeConfirm;
    if ((this.reset(), !begun)) return;
    let we = resourceSnapshot();
    if (((this.lastTurnEndedAt = we), firstDispatchAtMs !== void 0 && n > firstDispatchAtMs))
      phases[`redrive_${redriveCause ?? "other"}`] = n - firstDispatchAtMs;
    let Ee = { other: 0 },
      Ae = 0,
      Ie = 0;
    for (let Yt of QUERY_PROFILE_PHASES) {
      let qt = phases[Yt];
      if (qt === void 0) continue;
      Ae += qt;
      let Zt = Math.round(Ae) - Ie;
      ((Ie += Zt), (Ee[Yt] = Zt));
    }
    Ee.other = Math.round(e) - Ie;
    let Me = attachments?.stretchFrom === void 0 ? attachments?.used : void 0,
      We = attachments?.passes,
      ze = attachments && {
        ...(attachments.slowest !== void 0 && {
          slowest_producer: attachments.slowest,
          slowest_producer_ms: Math.round(attachments.slowestMs),
        }),
        ...(Me && { cpu_ms: Me.cpuMs, major_faults: Me.majorFaults }),
        ...(attachments.changedFilesReread !== void 0 && {
          changed_files_reread: attachments.changedFilesReread,
        }),
        ...(attachments.touchCompare !== void 0 && { touch_compare: attachments.touchCompare }),
        ...(We?.partMs.setup !== void 0 && { setup_ms: IB(We.partMs.setup) }),
        ...(We?.partMs.prompt_producers !== void 0 && {
          prompt_producers_ms: IB(We.partMs.prompt_producers),
        }),
        ...(We?.partMs.ambient_start !== void 0 && { ambient_start_ms: IB(We.partMs.ambient_start) }),
        ...(We?.partMs.ambient_wait !== void 0 && { ambient_wait_ms: IB(We.partMs.ambient_wait) }),
        ...(We?.partMs.render !== void 0 && { render_ms: IB(We.partMs.render) }),
        ...(We && { producers: We.producers, token_counts: We.tokenCounts }),
        ...(We !== void 0 && We.tokenCounts > 0 && { token_count_ms: IB(We.tokenCountMs) }),
        ...(We?.changedFileReadMs !== void 0 && { changed_files_read_ms: IB(We.changedFileReadMs) }),
        ...(We !== void 0 && Object.keys(We.differsFiles).length > 0 && { differs_files: We.differsFiles }),
      },
      lt = ze && Object.keys(ze).length > 0 ? ze : void 0,
      Je = Ee.resume_store_confirm ?? 0,
      min = Math.min(Math.floor(storeConfirm?.writeMs ?? 0), Je),
      min_2 = Math.min(Math.floor(storeConfirm?.posts?.aheadMs ?? 0), Je - min),
      min_3 = Math.min(Math.floor(storeConfirm?.posts?.postMs ?? 0), Je - min - min_2),
      yt =
        storeConfirm?.posts === void 0 || Ee.resume_store_confirm === void 0
          ? void 0
          : {
              write_ms: min,
              ahead_ms: min_2,
              post_ms: min_3,
              other_ms: Je - min - min_2 - min_3,
              posts: storeConfirm.posts.posts,
              failed_posts: storeConfirm.posts.failedPosts,
              rows_ahead: storeConfirm.posts.rowsAhead,
              rows: storeConfirm.posts.rows,
            },
      gt = Z && procMemorySnapshot(),
      At = h && isProcessTelemetryEnabled() ? cpuWallDelta(beganAt, we) : void 0,
      It;
    if (At === void 0) this.shellCountedTo = void 0;
    else if (beganAt?.shellMs !== void 0 && we?.shellMs !== void 0) {
      let shellCountedTo = this.shellCountedTo,
        qt = we.shellMs - beganAt.shellMs,
        Zt = shellCountedTo && beganAt.shellMs - shellCountedTo.shellMs,
        rn = shellCountedTo && Math.round(beganAt.atMs - shellCountedTo.atMs);
      ((It = U7e(qt)
        ? { turnMs: qt, sinceLastResult: U7e(Zt) && U7e(rn) ? { cpuMs: Zt, wallMs: rn } : void 0 }
        : void 0),
        (this.shellCountedTo = It && { shellMs: we.shellMs, atMs: we.atMs }));
    }
    return {
      phases: Ee,
      window: h,
      inputAttachments: lt,
      storeConfirm: yt,
      memory: Z && gt && { atBegin: Z, atConsume: gt },
      betweenTurns: At && betweenTurns,
      turn: At,
      streaming: At && streaming && !isStreamingUnmeasured ? normalizeStreamStats(streaming) : void 0,
      shellCpu: It,
    };
  }
}
//@ chunk-e6aww6q8.js:2493029-2493763 placement
var QUERY_PROFILE_PHASES = [
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
  ],
  lmr = new HostScoped(() => new QueryProfiler());
//@ chunk-e6aww6q8.js:2493763-2493831 placement
function r_(e) {
  try {
    return e(lmr.of(getRootSession().host));
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-e6aww6q8.js:2493831-2493865 placement
function w3s() {
  r_((e) => e.begin());
}
//@ chunk-e6aww6q8.js:2493865-2493905 placement
function jS(e) {
  r_((n) => n.startPhase(e));
}
//@ chunk-e6aww6q8.js:2493905-2493943 placement
function WS(e) {
  r_((n) => n.endPhase(e));
}
//@ chunk-e6aww6q8.js:2493943-2493994 placement
function mGt(e, n) {
  r_((r) => r.startPhaseWithin(e, n));
}
//@ chunk-e6aww6q8.js:2493994-2494055 placement
function W7e(e, n, r) {
  r_((s) => s.noteAttachmentProducer(e, n, r));
}
//@ chunk-e6aww6q8.js:2494055-2494104 placement
function mdn(e) {
  r_((n) => n.noteAttachmentPass(e));
}
//@ chunk-e6aww6q8.js:2494104-2494157 placement
function gdn(e) {
  r_((n) => n.noteChangedFilesReread(e));
}
//@ chunk-e6aww6q8.js:2494157-2494212 placement
function hdn(e) {
  r_((n) => n.noteChangedFilesCompared(e));
}
//@ chunk-e6aww6q8.js:2494212-2494264 placement
function E3s(e) {
  r_((n) => n.noteStoreConfirmWrite(e));
}
//@ chunk-e6aww6q8.js:2494264-2494316 placement
function dmr(e) {
  r_((n) => n.noteStoreConfirmPosts(e));
}
/**
 * 创建存储确认计时器：只在第一次确认时记录，返回的函数在指定时刻结束计时。
 */
//@ chunk-e6aww6q8.js:2494316-2494516 placement
function makeStoreConfirmTimer(e) {
  let n = fdn(e),
    r = n !== void 0,
    s = (h) => {
      if (n === void 0 || !r) return;
      return ((r = !1), fdn(() => n(h)));
    };
  return (
    r_((h) =>
      h.holdStoreConfirmWatch(() => {
        s(performance.now());
      }),
    ),
    (h) => {
      let y = s(h);
      if (y) dmr(y);
    }
  );
}
//@ chunk-e6aww6q8.js:2494516-2494569 placement
function fdn(e) {
  try {
    return e();
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-e6aww6q8.js:2494569-2494618 placement
function gGt(e, n) {
  r_((r) => r.endPhaseWithin(e, n));
}
//@ chunk-e6aww6q8.js:2494618-2494692 placement
async function hmn(e, n, r) {
  mGt(e, n);
  try {
    return await r();
  } finally {
    gGt(e, n);
  }
}
//@ chunk-e6aww6q8.js:2494692-2494740 placement
function ydn(e) {
  return r_((n) => n.close(e)) === !0;
}
//@ chunk-e6aww6q8.js:2494740-2494835 placement
function _dn() {
  let e = r_((n) => n.openStream());
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
function ymn(e) {
  r_((n) => n.noteRedrive(e));
}
//@ chunk-e6aww6q8.js:2494877-2494926 placement
function k3s(e, n) {
  return r_((r) => r.consume(e, n));
}
//@ chunk-e6aww6q8.js:2494926-2494971 placement
function T3s() {
  return r_((e) => e.turnIndex());
}
//@ chunk-e6aww6q8.js:2494971-2495003 placement
function A3s() {
  r_((e) => e.end());
}

export {
  mGt,
  gGt,
  hmn,
  E3s,
  makeStoreConfirmTimer,
  startQueryProfile,
  queryCheckpoint,
  A3s,
  w3s,
  jS,
  WS,
  k3s,
  T3s,
  bJn,
  ydn,
  _dn,
  endQueryProfile,
  ymn,
  W7e,
  gdn,
  hdn,
  AttachmentTimingProfile,
  sdn,
  mdn,
  H7e,
  processStartTuningFields,
  garbageCollectionFields,
};
