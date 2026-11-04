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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-eweqvj83.js:2697-2760 fingerprint = DETAILED_PROFILING (0.771)
var PROFILE_STARTUP; // deferred: uses env (./env.js) of its import cycle while loading; runs once the cycle is complete
var PROFILING_SAMPLE_RATE;
var isProfilingSampledByRandom;
deferInit("chunk-eweqvj83.js:2697", () => {
  PROFILE_STARTUP = env.CLAUDE_CODE_PROFILE_STARTUP;
  PROFILING_SAMPLE_RATE = 0.05;
  isProfilingSampledByRandom = Math.random() < PROFILING_SAMPLE_RATE;
});
//@ chunk-eweqvj83.js:2760-2784 layout
function isProfilingSampled() {
  return isProfilingSampledByRandom;
}
//@ chunk-eweqvj83.js:2784-2810 fingerprint = MARK_PREFIX (1)
var HEADLESS_PROFILING_ENABLED; // deferred: uses PROFILE_STARTUP of its import cycle while loading; runs once the cycle is complete
var HEADLESS;
deferInit("chunk-eweqvj83.js:2784", () => {
  HEADLESS_PROFILING_ENABLED = PROFILE_STARTUP || isProfilingSampledByRandom;
  HEADLESS = "headless_";
});
//@ chunk-eweqvj83.js:2810-2869 layout
class HeadlessProfilerState {
  current = -1;
  turn0Marks = [];
  advance() {
    this.current++;
  }
}
//@ chunk-eweqvj83.js:2869-2893 layout
var headlessProfilerStateByHost; // deferred: uses HeadlessProfilerState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-eweqvj83.js:2869", () => {
  headlessProfilerStateByHost = new HostScoped(() => new HeadlessProfilerState());
});
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
  let perf = getPerformance();
  let allMarks = perf.getEntriesByType("mark");
  for (let mark of allMarks) if (mark.name.startsWith(HEADLESS)) perf.clearMarks(mark.name);
}
//@ chunk-eweqvj83.js:3079-3220 fingerprint = headlessProfilerStartTurn (0.907)
function headlessProfilerStartTurn() {
  if (!isHeadlessProfilingActive()) return;
  let perf = getHeadlessProfilerState();
  perf.advance();
  clearHeadlessMarks();
  getPerformance().mark(`${HEADLESS}turn_start`);
  if (PROFILE_STARTUP) logForDebugging(`[headlessProfiler] Started turn ${perf.current}`);
}
//@ chunk-eweqvj83.js:3220-3361 fingerprint = headlessProfilerCheckpoint (1)
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
//@ chunk-eweqvj83.js:3361-5160 fingerprint = logHeadlessProfilerTurn (0.595)
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
//@ chunk-eweqvj83.js:5160-5623 affinity
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
