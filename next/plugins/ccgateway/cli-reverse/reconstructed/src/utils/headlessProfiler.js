/**
 * utils/headlessProfiler.ts
 *
 * 非交互模式剖析：CLAUDE_CODE_PROFILE_STARTUP 或 5% 采样，记录每轮检查点并上报。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/headlessProfiler.ts
 * pieces: chunk-948bfvqt.js (13)
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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-948bfvqt.js:2219-2280 fingerprint (2.1.88 match: DETAILED_PROFILING, 0.771)
var PROFILE_STARTUP; // deferred: uses env (./env.js) of its import cycle while loading; runs once the cycle is complete
var PROFILING_SAMPLE_RATE;
var isProfilingSampledByRandom;
deferInit("chunk-948bfvqt.js:2219", () => {
  PROFILE_STARTUP = env.CLAUDE_CODE_PROFILE_STARTUP;
  PROFILING_SAMPLE_RATE = 0.05;
  isProfilingSampledByRandom = Math.random() < PROFILING_SAMPLE_RATE;
});
//@ chunk-948bfvqt.js:2280-2304 layout
function isProfilingSampled() {
  return isProfilingSampledByRandom;
}
//@ chunk-948bfvqt.js:2304-2329 fingerprint (2.1.88 match: MARK_PREFIX, 1)
var HEADLESS_PROFILING_ENABLED; // deferred: uses PROFILE_STARTUP of its import cycle while loading; runs once the cycle is complete
var HEADLESS;
deferInit("chunk-948bfvqt.js:2304", () => {
  HEADLESS_PROFILING_ENABLED = PROFILE_STARTUP || isProfilingSampledByRandom;
  HEADLESS = "headless_";
});
//@ chunk-948bfvqt.js:2329-2388 layout
class HeadlessProfilerState {
  current = -1;
  turn0Marks = [];
  advance() {
    this.current++;
  }
}
//@ chunk-948bfvqt.js:2388-2411 layout
var headlessProfilerStateByHost; // deferred: uses HeadlessProfilerState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-948bfvqt.js:2388", () => {
  headlessProfilerStateByHost = new HostScoped(() => new HeadlessProfilerState());
});
//@ chunk-948bfvqt.js:2411-2446 layout
function getHeadlessProfilerState() {
  return headlessProfilerStateByHost.of(getRootSession().host);
}
//@ chunk-948bfvqt.js:2446-2483 layout
function getTurn0Marks() {
  return getHeadlessProfilerState().turn0Marks;
}
//@ chunk-948bfvqt.js:2483-2597 fingerprint (2.1.88 match: clearHeadlessMarks, 1)
function clearHeadlessMarks() {
  let perf = getPerformance();
  let allMarks = perf.getEntriesByType("mark");
  for (let mark of allMarks) if (mark.name.startsWith(HEADLESS)) perf.clearMarks(mark.name);
}
//@ chunk-948bfvqt.js:2597-2737 fingerprint (2.1.88 match: headlessProfilerStartTurn, 0.907)
function headlessProfilerStartTurn() {
  if (!isHeadlessProfilingActive()) return;
  let perf = getHeadlessProfilerState();
  perf.advance();
  clearHeadlessMarks();
  getPerformance().mark(`${HEADLESS}turn_start`);
  if (PROFILE_STARTUP) logForDebugging(`[headlessProfiler] Started turn ${perf.current}`);
}
//@ chunk-948bfvqt.js:2737-2878 fingerprint (2.1.88 match: headlessProfilerCheckpoint, 1)
/**
 * 记录 headless 剖析检查点（performance.mark headless_<name>）。
 */
function headlessProfilerCheckpoint(name) {
  emitStartupMark(name);
  if (!isHeadlessProfilingActive()) return;
  let perf = getPerformance();
  perf.mark(`${HEADLESS}${name}`);
  if (PROFILE_STARTUP)
    logForDebugging(`[headlessProfiler] Checkpoint: ${name} at ${perf.now().toFixed(1)}ms`);
}
//@ chunk-948bfvqt.js:2878-4676 fingerprint (2.1.88 match: logHeadlessProfilerTurn, 0.596)
/**
 * 非交互模式下（CLAUDE_CODE_PROFILE_STARTUP 或 5% 采样）汇总一轮的各检查点耗时并发 tengu 事件。
 */
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
  if (turnStart === undefined) return;
  let headlessProfilerState = getHeadlessProfilerState();
  let turnNumber = headlessProfilerState.current;
  if (PROFILE_STARTUP && turnNumber === 0)
    headlessProfilerState.turn0Marks = marks.map(({ name, startTime }) => ({
      name,
      startTime,
    }));
  let metadata = {
    turn_number: turnNumber,
  };
  if (turnNumber === 0)
    for (let [key, [fromMark, toMark]] of Object.entries({
      load_initial_messages_ms: ["before_loadInitialMessages", "after_loadInitialMessages"],
      system_prompt_ms: ["before_getSystemPrompt", "after_getSystemPrompt"],
      streaming_setup_ms: ["before_runHeadlessStreaming", "stdin_listen_started"],
      stdin_wait_ms: ["stdin_listen_started", "run_entry"],
      mcp_prewait_ms: ["before_mcp_prewait", "after_mcp_prewait"],
      grove_check_ms: ["before_grove_check", "after_grove_check"],
    })) {
      let fromTime = checkpointTimes.get(fromMark);
      let toTime = checkpointTimes.get(toMark);
      if (fromTime !== undefined && toTime !== undefined && toTime > fromTime)
        metadata[key] = Math.round(toTime - fromTime);
    }
  let systemMessageTime = checkpointTimes.get("system_message_yielded");
  if (systemMessageTime !== undefined && turnNumber === 0)
    metadata.time_to_system_message_ms = Math.round(systemMessageTime);
  let queryStartTime = checkpointTimes.get("query_started");
  if (queryStartTime !== undefined) metadata.time_to_query_start_ms = Math.round(queryStartTime - turnStart);
  let firstChunkTime = checkpointTimes.get("first_chunk");
  if (firstChunkTime !== undefined)
    metadata.time_to_first_response_ms = Math.round(firstChunkTime - turnStart);
  let apiRequestTime = checkpointTimes.get("api_request_sent");
  if (queryStartTime !== undefined && apiRequestTime !== undefined)
    metadata.query_overhead_ms = Math.round(apiRequestTime - queryStartTime);
  let turnMetrics = computeTurnMetrics(marks);
  if (turnMetrics.length > 0) {
    metadata.query_round_count = turnMetrics.length;
    let flattened = turnMetrics.flatMap((metric) =>
      metric.overheadMs === undefined ? [] : [metric.overheadMs],
    );
    if (flattened.length > 0) {
      metadata.query_overhead_first_ms = flattened[0];
      metadata.query_overhead_max_ms = flattened.reduce((acc, ms) => Math.max(acc, ms));
      metadata.query_overhead_total_ms = flattened.reduce((acc, ms) => acc + ms, 0);
    }
    let firstChunkAt = turnMetrics[0]?.firstChunkAt;
    if (firstChunkAt !== undefined)
      metadata.time_to_first_response_first_round_ms = Math.round(firstChunkAt - turnStart);
  }
  metadata.checkpoint_count = marks.length;
  if (env.CLAUDE_CODE_ENTRYPOINT) metadata.entrypoint = fromEnumOpt(getEntrypointKind()) ?? lit("other");
  if (isProfilingSampledByRandom) logEvent("tengu_headless_latency", metadata);
  if (PROFILE_STARTUP)
    logForDebugging(`[headlessProfiler] Turn ${turnNumber} metrics: ${jsonStringify(metadata)}`);
}
//@ chunk-948bfvqt.js:4676-5138 affinity
function computeTurnMetrics(marks) {
  let rounds = [];
  for (let mark of marks) {
    let name = mark.name.startsWith(HEADLESS) ? mark.name.slice(HEADLESS.length) : mark.name;
    let last = rounds.at(-1);
    if (name === "query_started")
      rounds.push({
        startedAt: mark.startTime,
      });
    else if (last !== undefined && name === "api_request_sent") last.dispatchedAt ??= mark.startTime;
    else if (last !== undefined && name === "first_chunk") last.firstChunkAt ??= mark.startTime;
  }
  return rounds.map((round) => ({
    ...(round.dispatchedAt !== undefined && {
      overheadMs: Math.round(round.dispatchedAt - round.startedAt),
    }),
    ...(round.firstChunkAt !== undefined && {
      firstChunkAt: round.firstChunkAt,
    }),
  }));
}
//@ chunk-948bfvqt.js:5138-5172 affinity
function isHeadlessProfilingActive() {
  return HEADLESS_PROFILING_ENABLED && getIsNonInteractiveSession() && !isDiskless();
}
export {
  headlessProfilerCheckpoint,
  headlessProfilerStartTurn,
  logHeadlessProfilerTurn,
  getTurn0Marks,
  isProfilingSampled,
};
