/**
 * utils/headlessProfiler.ts
 *
 * 非交互模式剖析：CLAUDE_CODE_PROFILE_STARTUP 或 5% 采样，记录每轮检查点并上报。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/headlessProfiler.ts
 * pieces: chunk-eweqvj83.js (13)
 * attribution: fingerprint 6, layout 5, affinity 2
 */
import { env } from "./env.js";
import { HostScoped } from "./hostScoped.js";
import { getRootSession, getIsNonInteractiveSession, isDiskless } from "../bootstrap/state.js";
import { getPerformance } from "./profilerBase.js";
import { logForDebugging } from "./debug.js";
import { emitStartupMark } from "./startupMarks.js";
import { fromEnumOpt, lit } from "../services/analytics/safeMetadata.js";
import { getEntrypointKind } from "./entrypointKinds.js";
import { logEvent } from "../services/analytics/index.js";
import { jsonStringify } from "./slowOperations.js";

//@ chunk-eweqvj83.js:2697-2760 fingerprint = DETAILED_PROFILING (0.771)
var PROFILE_STARTUP = env.CLAUDE_CODE_PROFILE_STARTUP,
  ee = 0.05,
  x = Math.random() < ee;
//@ chunk-eweqvj83.js:2760-2784 layout
function isProfilingSampled() {
  return x;
}
//@ chunk-eweqvj83.js:2784-2810 fingerprint = MARK_PREFIX (1)
var HEADLESS_PROFILING_ENABLED = PROFILE_STARTUP || x,
  HEADLESS = "headless_";
//@ chunk-eweqvj83.js:2810-2869 layout
class HeadlessProfilerState {
  current = -1;
  turn0Marks = [];
  advance() {
    this.current++;
  }
}
//@ chunk-eweqvj83.js:2869-2893 layout
var headlessProfilerStateByHost = new HostScoped(() => new HeadlessProfilerState());
//@ chunk-eweqvj83.js:2893-2929 layout
function getHeadlessProfilerState() {
  return headlessProfilerStateByHost.of(getRootSession().host);
}
//@ chunk-eweqvj83.js:2929-2964 layout
function getTurn0Marks() {
  return getHeadlessProfilerState().turn0Marks;
}
//@ chunk-eweqvj83.js:2964-3079 fingerprint = clearHeadlessMarks (1)
function clearHeadlessMarks() {
  let perf = getPerformance(),
    allMarks = perf.getEntriesByType("mark");
  for (let mark of allMarks) if (mark.name.startsWith(HEADLESS)) perf.clearMarks(mark.name);
}
//@ chunk-eweqvj83.js:3079-3220 fingerprint = headlessProfilerStartTurn (0.907)
function headlessProfilerStartTurn() {
  if (!isHeadlessProfilingActive()) return;
  let perf = getHeadlessProfilerState();
  if ((perf.advance(), clearHeadlessMarks(), getPerformance().mark(`${HEADLESS}turn_start`), PROFILE_STARTUP))
    logForDebugging(`[headlessProfiler] Started turn ${perf.current}`);
}
/**
 * 记录 headless 剖析检查点（performance.mark headless_<name>）。
 */
//@ chunk-eweqvj83.js:3220-3361 fingerprint = headlessProfilerCheckpoint (1)
function headlessProfilerCheckpoint(name) {
  if ((emitStartupMark(name), !isHeadlessProfilingActive())) return;
  let perf = getPerformance();
  if ((perf.mark(`${HEADLESS}${name}`), PROFILE_STARTUP))
    logForDebugging(`[headlessProfiler] Checkpoint: ${name} at ${perf.now().toFixed(1)}ms`);
}
/**
 * 非交互模式下（CLAUDE_CODE_PROFILE_STARTUP 或 5% 采样）汇总一轮的各检查点耗时并发 tengu 事件。
 */
//@ chunk-eweqvj83.js:3361-5160 fingerprint = logHeadlessProfilerTurn (0.595)
function logHeadlessProfilerTurn() {
  if (!isHeadlessProfilingActive()) return;
  let marks = getPerformance()
    .getEntriesByType("mark")
    .filter((mark) => mark.name.startsWith(HEADLESS));
  if (marks.length === 0) return;
  let checkpointTimes = new Map();
  for (let mark of marks) {
    let name = mark.name.slice(HEADLESS.length);
    checkpointTimes.set(name, mark.startTime);
  }
  let turnStart = checkpointTimes.get("turn_start");
  if (turnStart === void 0) return;
  let c = getHeadlessProfilerState(),
    u = c.current;
  if (PROFILE_STARTUP && u === 0)
    c.turn0Marks = marks.map(({ name: f, startTime: startTime }) => ({ name: f, startTime: startTime }));
  let metadata = { turn_number: u };
  if (u === 0)
    for (let [f, [d, m]] of Object.entries({
      load_initial_messages_ms: ["before_loadInitialMessages", "after_loadInitialMessages"],
      system_prompt_ms: ["before_getSystemPrompt", "after_getSystemPrompt"],
      streaming_setup_ms: ["before_runHeadlessStreaming", "stdin_listen_started"],
      stdin_wait_ms: ["stdin_listen_started", "run_entry"],
      mcp_prewait_ms: ["before_mcp_prewait", "after_mcp_prewait"],
      grove_check_ms: ["before_grove_check", "after_grove_check"],
    })) {
      let l = checkpointTimes.get(d),
        y = checkpointTimes.get(m);
      if (l !== void 0 && y !== void 0 && y > l) metadata[f] = Math.round(y - l);
    }
  let systemMessageTime = checkpointTimes.get("system_message_yielded");
  if (systemMessageTime !== void 0 && u === 0)
    metadata.time_to_system_message_ms = Math.round(systemMessageTime);
  let queryStartTime = checkpointTimes.get("query_started");
  if (queryStartTime !== void 0) metadata.time_to_query_start_ms = Math.round(queryStartTime - turnStart);
  let firstChunkTime = checkpointTimes.get("first_chunk");
  if (firstChunkTime !== void 0) metadata.time_to_first_response_ms = Math.round(firstChunkTime - turnStart);
  let apiRequestTime = checkpointTimes.get("api_request_sent");
  if (queryStartTime !== void 0 && apiRequestTime !== void 0)
    metadata.query_overhead_ms = Math.round(apiRequestTime - queryStartTime);
  let h = computeTurnMetrics(marks);
  if (h.length > 0) {
    metadata.query_round_count = h.length;
    let flattened = h.flatMap((m) => (m.overheadMs === void 0 ? [] : [m.overheadMs]));
    if (flattened.length > 0)
      ((metadata.query_overhead_first_ms = flattened[0]),
        (metadata.query_overhead_max_ms = flattened.reduce((m, l) => Math.max(m, l))),
        (metadata.query_overhead_total_ms = flattened.reduce((m, l) => m + l, 0)));
    let d = h[0]?.firstChunkAt;
    if (d !== void 0) metadata.time_to_first_response_first_round_ms = Math.round(d - turnStart);
  }
  if (((metadata.checkpoint_count = marks.length), env.CLAUDE_CODE_ENTRYPOINT))
    metadata.entrypoint = fromEnumOpt(getEntrypointKind()) ?? lit("other");
  if (x) logEvent("tengu_headless_latency", metadata);
  if (PROFILE_STARTUP) logForDebugging(`[headlessProfiler] Turn ${u} metrics: ${jsonStringify(metadata)}`);
}
//@ chunk-eweqvj83.js:5160-5623 affinity
function computeTurnMetrics(e) {
  let o = [];
  for (let r of e) {
    let s = r.name.startsWith(HEADLESS) ? r.name.slice(HEADLESS.length) : r.name,
      at = o.at(-1);
    if (s === "query_started") o.push({ startedAt: r.startTime });
    else if (at !== void 0 && s === "api_request_sent") at.dispatchedAt ??= r.startTime;
    else if (at !== void 0 && s === "first_chunk") at.firstChunkAt ??= r.startTime;
  }
  return o.map((r) => ({
    ...(r.dispatchedAt !== void 0 && { overheadMs: Math.round(r.dispatchedAt - r.startedAt) }),
    ...(r.firstChunkAt !== void 0 && { firstChunkAt: r.firstChunkAt }),
  }));
}
//@ chunk-eweqvj83.js:5623-5658 affinity
function isHeadlessProfilingActive() {
  return HEADLESS_PROFILING_ENABLED && getIsNonInteractiveSession() && !isDiskless();
}

export {
  headlessProfilerStartTurn,
  headlessProfilerCheckpoint,
  logHeadlessProfilerTurn,
  getTurn0Marks,
  isProfilingSampled,
};
