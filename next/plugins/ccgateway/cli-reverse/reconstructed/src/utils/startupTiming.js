/**
 * utils/startupTiming.ts
 *
 * 2.1.316 新增。启动阶段计时。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-e0saccbx.js (46)
 * attribution: placement 45, layout 1
 */
import { readFileSync } from "fs";
import { jsonParse } from "./slowOperations.js";
import { isDiskless, getRootSession } from "../bootstrap/state.js";
import { parseStatFaults, parseReadBytes } from "./procStat.js";
import { logForDiagnosticsNoPII } from "./diagLogs.js";
import { noteFirstMessageForGarbageCollectionCount } from "./gcCount.js";
import { env, antEnv } from "./env.js";
import { processStartTuning, processStartPurgeDelayMs } from "./processStartTuning.js";
import { isRemoteManagedEnvironment } from "./remoteEnvironment.js";
import { fromEnumOpt, fromEnum } from "../services/analytics/safeMetadata.js";
import { pickByHelper } from "./git/gitSafeEnv.js";
import { HostScoped } from "./hostScoped.js";
import { isProfilingSampled } from "./headlessProfiler.js";
import { logEvent } from "../services/analytics/index.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-e0saccbx.js:673-1022 placement
/**
 * 启动计时常量：runner 准备阶段字段、各字段上限（一周秒数、包数量等）、阶段时长上限（1 小时 / runner 10 分钟）。
 */
var RUNNER_PREP_FIELDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var WEEK_SECONDS;
var FIELD_CAPS;
var PHASE_CAP_MS;
var RUNNER_PHASE_CAP_MS;
var RUNNER_PREP_FIELD_SET;
deferInit("chunk-e0saccbx.js:673", () => {
  RUNNER_PREP_FIELDS = [
    "runner_prep_total_ms",
    "runner_prep_git_proxy_config_ms",
    "runner_prep_reset_remote_ms",
    "runner_prep_outcome_branch_ms",
    "runner_prep_repo_settings_ms",
    "runner_prep_config_seed_ms",
    "runner_prep_remote_refetch_ms",
  ];
  WEEK_SECONDS = 604800;
  FIELD_CAPS = {
    git_have_age_s: WEEK_SECONDS,
    git_pack_count: 1e4,
    standby_idle_s: WEEK_SECONDS,
    healthz_claim_visible_ms: 600000,
  };
  PHASE_CAP_MS = 3600000;
  RUNNER_PHASE_CAP_MS = 600000;
  RUNNER_PREP_FIELD_SET = new Set(RUNNER_PREP_FIELDS);
});
//@ chunk-e0saccbx.js:1022-1062 placement
function hasFieldCap(field) {
  return Object.hasOwn(FIELD_CAPS, field);
}
//@ chunk-e0saccbx.js:1062-1092 placement
function isRunnerPrepField(field) {
  return RUNNER_PREP_FIELD_SET.has(field);
}
//@ chunk-e0saccbx.js:1092-1115 placement
function isParityField(field) {
  return false;
}
//@ chunk-e0saccbx.js:1115-1234 placement
function clampMetric(value, cap) {
  if (typeof value !== "number" || !Number.isFinite(value)) return;
  let rounded = Math.round(value);
  return rounded < 0 ? undefined : Math.min(rounded, cap);
}
//@ chunk-e0saccbx.js:1234-1345 placement
function objectField(object, field) {
  let value = Object.hasOwn(object, field) ? Reflect.get(object, field) : undefined;
  return typeof value === "object" && value !== null ? value : undefined;
}
//@ chunk-e0saccbx.js:1345-1741 placement
/**
 * 解析预热备用进程上报的计时：只保留已知字段与阶段名，数值按各自上限校验；全部为空时返回 undefined。
 */
function parseSpareTiming(timing) {
  if (typeof timing !== "object" || timing === null) return;
  let fields = {};
  for (let [key, value] of Object.entries(objectField(timing, "fields") ?? {}))
    if (hasFieldCap(key)) {
      let clamped = clampMetric(value, FIELD_CAPS[key]);
      if (clamped !== undefined) fields[key] = clamped;
    }
  let phases = {};
  for (let [key, value] of Object.entries(objectField(timing, "phases") ?? {}))
    if (isRunnerPrepField(key)) {
      let clamped = clampMetric(value, PHASE_CAP_MS);
      if (clamped !== undefined) phases[key] = clamped;
    } else if (isParityField(key)) {
      let clamped = clampMetric(value, RUNNER_PHASE_CAP_MS);
      if (clamped !== undefined) phases[key] = clamped;
    }
  if (Object.keys(fields).length === 0 && Object.keys(phases).length === 0) return;
  return {
    fields,
    phases,
  };
}
//@ chunk-e0saccbx.js:1741-1752 placement
var MAX_SPARE_TIMING_CHARS = 8192;
//@ chunk-e0saccbx.js:1752-1825 placement
function parseSpareTimingEnv(json) {
  if (!json || json.length > MAX_SPARE_TIMING_CHARS) return;
  try {
    return parseSpareTiming(jsonParse(json));
  } catch {
    return;
  }
}
//@ chunk-e0saccbx.js:1859-2071 placement
var SPARE_TIMING_MARKS = [
  "to_spare_loaded",
  "to_claim",
  "to_input_ready",
  "to_first_message",
  "to_first_turn",
];
var MAX_TIMING_SAMPLES = 10;
var ZERO_PROCESS_SAMPLE = {
  atMs: 0,
  cpuMs: 0,
  procStat: {
    minorFaults: 0,
    majorFaults: 0,
    childrenMinorFaults: 0,
    childrenCpuTicks: 0,
  },
  storageReadBytes: 0,
};
//@ chunk-e0saccbx.js:2071-2372 placement
/**
 * 采样当前进程状态：时刻、CPU 毫秒、/proc/self/stat 与 /proc/self/io 中的统计（无盘模式跳过，失败记诊断日志）。
 */
function sampleProcess() {
  try {
    if (isDiskless()) return;
    let usage = process.cpuUsage();
    let atMs = performance.now();
    let procStat;
    let storageReadBytes;
    try {
      procStat = parseStatFaults(readFileSync("/proc/self/stat", "utf8"));
    } catch {}
    try {
      storageReadBytes = parseReadBytes(readFileSync("/proc/self/io", "utf8"));
    } catch {}
    return {
      atMs,
      cpuMs: (usage.user + usage.system) / 1000,
      procStat,
      storageReadBytes,
    };
  } catch {
    logForDiagnosticsNoPII("error", "startup_process_sample_failed");
    return;
  }
}
//@ chunk-e0saccbx.js:2372-2423 placement
function diffClamped(from, to) {
  return Math.max(0, Math.round(to - from));
}
//@ chunk-e0saccbx.js:2423-3189 placement
class PhaseSample {
  sample;
  ends = {};
  constructor(sample = sampleProcess) {
    this.sample = sample;
  }
  end(mark) {
    this.ends[mark] ??= this.sample();
  }
  toWire() {
    let wire = {};
    let previous = ZERO_PROCESS_SAMPLE;
    for (let mark of SPARE_TIMING_MARKS) {
      let sample = this.ends[mark];
      if (sample === undefined || sample.atMs < previous.atMs) continue;
      wire[mark] = {
        cpu_ms: diffClamped(previous.cpuMs, sample.cpuMs),
        wall_ms: Math.max(0, Math.ceil(sample.atMs - previous.atMs)),
        ...(previous.procStat &&
          sample.procStat && {
            minor_faults: diffClamped(previous.procStat.minorFaults, sample.procStat.minorFaults),
            major_faults: diffClamped(previous.procStat.majorFaults, sample.procStat.majorFaults),
            children_cpu_ms:
              diffClamped(previous.procStat.childrenCpuTicks, sample.procStat.childrenCpuTicks) *
              MAX_TIMING_SAMPLES,
            children_minor_faults: diffClamped(
              previous.procStat.childrenMinorFaults,
              sample.procStat.childrenMinorFaults,
            ),
          }),
        ...(previous.storageReadBytes !== undefined &&
          sample.storageReadBytes !== undefined && {
            storage_read_kib: diffClamped(previous.storageReadBytes / 1024, sample.storageReadBytes / 1024),
          }),
      };
      previous = sample;
    }
    return wire.to_input_ready && wire.to_first_turn ? wire : undefined;
  }
}
//@ chunk-e0saccbx.js:3189-3528 placement
/**
 * 计时字段到启动标记名的映射（input_ready、first_message），以及启动各阶段的计时字段名列表。
 */
var TIMING_FIELD_TO_MARK = {
  input_ready_ms: "to_input_ready",
  first_message_read_ms: "to_first_message",
};
var STARTUP_PHASE_FIELDS = [
  "spawn_to_exec_ms",
  "node_boot_ms",
  "pre_action_ms",
  "settings_load_ms",
  "setup_ms",
  "growthbook_init_ms",
  "tools_commands_load_ms",
  "hooks_init_ms",
  "mcp_connect_ms",
  "print_import_ms",
  "headless_prologue_ms",
  "grove_check_ms",
  "await_initialize_ms",
  "init_emit_ms",
];
//@ chunk-e0saccbx.js:3528-11967 placement
/**
 * 启动阶段计时记录器（tengu_startup_timing）。
 */
class StartupTimingRecorder {
  phases = {};
  phaseStarts = {};
  warmSpareClaimed = false;
  hydratePrefetchSettledAt = undefined;
  resumeHydratePrefetch = undefined;
  resumeHydrateOnDiskBytes = undefined;
  resumeHydrateCcrBytes = undefined;
  resumeHydrateCcrEvents = undefined;
  resumeHydrateDeltaEvents = undefined;
  resumeHydrateDeltaFetchAttempted = undefined;
  resumeHydrateAnchorWalkback = undefined;
  resumeTranscriptScan = undefined;
  resumeTranscriptReadAhead = undefined;
  pluginFullLoads = 0;
  userContextBuilds = 0;
  sdkMcpDialRuns = 0;
  sdkMcpServersDialed = 0;
  flagFetchKick = undefined;
  flagFetchKickJudgedAtMs = undefined;
  warmWakeEarlyFetch = undefined;
  kickOnWarmCache = undefined;
  hooksInitSource = undefined;
  resumeHooksWaitShadow = undefined;
  pluginsSyncRound = undefined;
  processStretches = new PhaseSample();
  maySendProcessStretches = undefined;
  flagFetchWaitedMs = 0;
  hooksInitWaitGivenUp = false;
  consumed = false;
  reported = false;
  apiRequestSentFromSpawnMs = undefined;
  apiRequestSentFromSpawnConsumed = false;
  recordPhase(field, ms, startMs) {
    if (field === "first_message_read_ms") noteFirstMessageForGarbageCollectionCount();
    if (this.consumed) return;
    if (field === "skills_load_ms" && this.phases[field] !== undefined) return;
    if (field === "hooks_init_ms" && this.hooksInitWaitGivenUp) return;
    this.phases[field] = Math.round(ms);
    if (startMs !== undefined) this.phaseStarts[field] = Math.round(startMs);
    let stretchMark = TIMING_FIELD_TO_MARK[field];
    if (stretchMark !== undefined) this.endProcessStretch(stretchMark);
  }
  endProcessStretch(mark) {
    if (env.CLAUDE_CODE_REMOTE && !this.consumed) this.processStretches.end(mark);
  }
  markSpareLoaded() {
    this.endProcessStretch("to_spare_loaded");
  }
  markTurnBegan(maySendProcessStretches) {
    this.endProcessStretch("to_first_turn");
    this.maySendProcessStretches = maySendProcessStretches;
  }
  recordHooksInitWait(waitedMs, startMs) {
    this.recordPhase("hooks_init_ms", waitedMs, startMs);
    this.hooksInitWaitGivenUp = true;
  }
  getRecordedPhase(field) {
    return this.phases[field];
  }
  recordSpawnToExec() {
    let spawnTimestamp = Number.parseInt(process.env.CCR_SPAWN_TIMESTAMP_MS ?? "", 10);
    if (!Number.isFinite(spawnTimestamp)) return;
    this.recordPhase(
      "spawn_to_exec_ms",
      Date.now() - process.uptime() * 1000 - spawnTimestamp,
      spawnTimestamp - performance.timeOrigin,
    );
  }
  markWarmSpareClaimed() {
    this.warmSpareClaimed = true;
    this.endProcessStretch("to_claim");
  }
  markFlagFetchKick(flagFetchKick) {
    this.flagFetchKick = flagFetchKick;
    this.flagFetchKickJudgedAtMs = Math.round(performance.now());
  }
  getFlagFetchKick() {
    return this.flagFetchKick;
  }
  markWarmCacheKickAsks(warmWakeEarlyFetch) {
    this.warmWakeEarlyFetch = warmWakeEarlyFetch;
    this.kickOnWarmCache = env.CLAUDE_CODE_GROWTHBOOK_KICK_ON_WARM_CACHE;
  }
  markHooksInitSource(hooksInitSource) {
    this.hooksInitSource = hooksInitSource;
  }
  markResumeHooksWaitShadow(resumeHooksWaitShadow) {
    this.resumeHooksWaitShadow = resumeHooksWaitShadow;
  }
  markPluginsSyncRound(round, maySend) {
    this.pluginsSyncRound = {
      round,
      maySend,
    };
  }
  noteFlagFetchWait(waitedMs) {
    this.flagFetchWaitedMs += waitedMs;
  }
  getFlagFetchWaitedMs() {
    return this.flagFetchWaitedMs;
  }
  noteSdkMcpDial(dialMs) {
    if (dialMs <= 0) return;
    this.sdkMcpDialRuns++;
    this.sdkMcpServersDialed += dialMs;
  }
  notePluginFullLoad() {
    if (this.consumed) return;
    this.pluginFullLoads++;
  }
  noteUserContextBuild() {
    if (this.consumed) return;
    this.userContextBuilds++;
  }
  wasWarmSpareClaimed() {
    return this.warmSpareClaimed;
  }
  markHydratePrefetchSettled() {
    this.hydratePrefetchSettledAt = performance.now();
  }
  markResumeHydratePrefetch(anchor, settledAt) {
    this.resumeHydratePrefetch =
      anchor === null
        ? "miss"
        : this.hydratePrefetchSettledAt !== undefined && this.hydratePrefetchSettledAt < settledAt
          ? "hit"
          : "pending";
  }
  markResumeHydrateDelta(
    resumeHydrateOnDiskBytes,
    resumeHydrateCcrBytes,
    resumeHydrateCcrEvents,
    resumeHydrateDeltaEvents,
    resumeHydrateDeltaFetchAttempted,
    resumeHydrateAnchorWalkback,
  ) {
    this.resumeHydrateOnDiskBytes = resumeHydrateOnDiskBytes;
    this.resumeHydrateCcrBytes = resumeHydrateCcrBytes;
    this.resumeHydrateCcrEvents = resumeHydrateCcrEvents;
    this.resumeHydrateDeltaEvents = resumeHydrateDeltaEvents;
    this.resumeHydrateDeltaFetchAttempted = resumeHydrateDeltaFetchAttempted;
    this.resumeHydrateAnchorWalkback = resumeHydrateAnchorWalkback;
  }
  markResumeTranscriptScan(scan) {
    if (this.resumeTranscriptScan !== undefined) return;
    this.resumeTranscriptScan = scan;
    this.recordPhase(
      "resume_transcript_scan_ms",
      scan.scanMs + (this.resumeTranscriptReadAhead?.durationMs ?? 0),
      this.resumeTranscriptReadAhead?.startMs ?? scan.scanStartMs,
    );
  }
  markResumeTranscriptReadAhead(durationMs, startMs) {
    this.resumeTranscriptReadAhead = {
      durationMs,
      startMs,
    };
  }
  recordFirstMessageReadFromSpawn() {
    let spawnTimestamp = Number.parseInt(process.env.CCR_SPAWN_TIMESTAMP_MS ?? "", 10);
    if (!Number.isFinite(spawnTimestamp)) return;
    this.recordPhase(
      "first_message_read_from_spawn_ms",
      Date.now() - spawnTimestamp,
      spawnTimestamp - performance.timeOrigin,
    );
  }
  recordInputReadyFromSpawn() {
    let spawnTimestamp = Number.parseInt(process.env.CCR_SPAWN_TIMESTAMP_MS ?? "", 10);
    if (!Number.isFinite(spawnTimestamp)) return;
    this.recordPhase(
      "input_ready_from_spawn_ms",
      Date.now() - spawnTimestamp,
      spawnTimestamp - performance.timeOrigin,
    );
  }
  consume() {
    if (!env.CLAUDE_CODE_REMOTE && !env.CLAUDE_CODE_EMIT_STARTUP_TIMING) return;
    if (this.consumed || Object.keys(this.phases).length === 0) return;
    this.consumed = true;
    let spareTimingEnv = parseSpareTimingEnv(antEnv.CCR_RUNNER_STARTUP_TIMING);
    let diskBacked = !isDiskless();
    let sendStretches = this.maySendProcessStretches?.() ?? false;
    return {
      ...spareTimingEnv?.fields,
      entrypoint: env.CLAUDE_CODE_ENTRYPOINT ?? "unknown",
      warm_spare_claimed: this.warmSpareClaimed,
      resume_hydrate_prefetch: this.resumeHydratePrefetch,
      resume_hydrate_on_disk_bytes: this.resumeHydrateOnDiskBytes,
      resume_hydrate_ccr_bytes: this.resumeHydrateCcrBytes,
      resume_hydrate_ccr_events: this.resumeHydrateCcrEvents,
      resume_hydrate_delta_events: this.resumeHydrateDeltaEvents,
      resume_hydrate_delta_fetch_attempted: this.resumeHydrateDeltaFetchAttempted,
      resume_hydrate_anchor_walkback: this.resumeHydrateAnchorWalkback,
      resume_transcript_bytes: this.resumeTranscriptScan?.bytes,
      resume_transcript_kept_bytes: this.resumeTranscriptScan?.keptBytes,
      resume_transcript_earlier_metadata_bytes: this.resumeTranscriptScan?.earlierMetadataBytes,
      resume_transcript_boundary: this.resumeTranscriptScan?.boundary,
      resume_transcript_plain_kept_bytes: this.resumeTranscriptScan?.plainKeptBytes,
      resume_transcript_boundary_other_key_order: this.resumeTranscriptScan?.boundaryOtherKeyOrder,
      resume_transcript_keeping_boundaries: this.resumeTranscriptScan?.keepingBoundaries,
      resume_transcript_reach_bytes: this.resumeTranscriptScan?.reachBytes,
      resume_transcript_backfilled_all: this.resumeTranscriptScan?.backfilledAll,
      resume_transcript_rows: this.resumeTranscriptScan?.rows,
      resume_transcript_rows_other_key_order: this.resumeTranscriptScan?.rowsOtherKeyOrder,
      resume_transcript_rows_unindexed: this.resumeTranscriptScan?.rowsUnindexed,
      resume_transcript_listed_rows: this.resumeTranscriptScan?.listedRows,
      resume_transcript_listed_rows_bytes: this.resumeTranscriptScan?.listedRowsBytes,
      resume_transcript_listed_rows_other_key_order: this.resumeTranscriptScan?.listedRowsOtherKeyOrder,
      resume_transcript_listed_span_bytes: this.resumeTranscriptScan?.listedSpanBytes,
      resume_transcript_straggler_ancestors: this.resumeTranscriptScan?.stragglerAncestors,
      resume_transcript_parents_not_found: this.resumeTranscriptScan?.parentsNotFound,
      resume_transcript_list_unused: this.resumeTranscriptScan?.listUnused,
      resume_transcript_tool_copy_chars: this.resumeTranscriptScan?.toolCopyChars,
      delta_reset: antEnv.CCR_DELTA_RESET,
      plugin_full_loads: this.pluginFullLoads,
      user_context_builds: this.userContextBuilds,
      sdk_mcp_dial_runs: this.sdkMcpDialRuns,
      sdk_mcp_servers_dialed: this.sdkMcpServersDialed,
      flag_fetch_kick: this.flagFetchKick,
      flag_fetch_kick_judged_at_ms: diskBacked ? this.flagFetchKickJudgedAtMs : undefined,
      warm_wake_early_fetch: this.warmWakeEarlyFetch,
      kick_on_warm_cache: this.kickOnWarmCache,
      hooks_init_source: this.hooksInitSource,
      resume_hooks_wait_shadow: this.resumeHooksWaitShadow,
      plugins_sync_round: this.pluginsSyncRound?.maySend() ? this.pluginsSyncRound.round : undefined,
      process_stretches: sendStretches ? this.processStretches.toWire() : undefined,
      ...(sendStretches &&
        diskBacked && {
          process_start_tuning: processStartTuning(),
          process_start_purge_delay_ms: processStartPurgeDelayMs(),
        }),
      cli_trial_keys: isRemoteManagedEnvironment()
        ? (env.CLAUDE_CODE_MCP_SKIP_UNCHANGED_RELIST === true ? 1 : 0) +
          (env.CLAUDE_CODE_CHROME_LATE_MCP_SERVER === true ? 2 : 0) +
          (env.CLAUDE_CODE_SKIP_MCP_DEBUG_LOG_FILES === true ? 4 : 0)
        : undefined,
      phases: {
        ...spareTimingEnv?.phases,
        ...(diskBacked ? this.phases : this.durations()),
      },
      ...(diskBacked && {
        time_origin_ms: performance.timeOrigin,
        phase_start_ms: {
          ...this.phaseStarts,
        },
      }),
    };
  }
  telemetryFields() {
    if (isDiskless()) return;
    if (this.reported || Object.keys(this.phases).length === 0) return;
    this.reported = true;
    let phaseFields = {};
    let listedTotalMs = 0;
    for (let field of STARTUP_PHASE_FIELDS) {
      let ms = this.phases[field];
      if (ms !== undefined) {
        phaseFields[field] = ms;
        listedTotalMs += ms;
      }
    }
    let allTotalMs = 0;
    for (let phase of Object.values(this.phases)) allTotalMs += phase ?? 0;
    return {
      ...phaseFields,
      other_ms: allTotalMs - listedTotalMs,
      phase_count: Object.keys(this.phases).length,
      warm_spare_claimed: this.warmSpareClaimed,
      plugin_full_loads: this.pluginFullLoads,
      user_context_builds: this.userContextBuilds,
      sdk_mcp_dial_runs: this.sdkMcpDialRuns,
      sdk_mcp_servers_dialed: this.sdkMcpServersDialed,
      flag_fetch_kick: fromEnumOpt(this.flagFetchKick),
      hooks_init_source: fromEnumOpt(this.hooksInitSource),
      resume_hydrate_prefetch: fromEnumOpt(this.resumeHydratePrefetch),
    };
  }
  durations() {
    return pickByHelper(
      this.phases,
      (field, name) => name !== "spawn_to_exec_ms" && this.phaseStarts[name] !== 0,
    );
  }
  recordApiRequestSentFromSpawn() {
    if (this.apiRequestSentFromSpawnMs !== undefined) return;
    let spawnTimestamp = Number.parseInt(process.env.CCR_SPAWN_TIMESTAMP_MS ?? "", 10);
    if (!Number.isFinite(spawnTimestamp)) return;
    this.apiRequestSentFromSpawnMs = Date.now() - spawnTimestamp;
  }
  consumeApiRequestSentFromSpawn() {
    if (this.apiRequestSentFromSpawnConsumed || this.apiRequestSentFromSpawnMs === undefined) return;
    this.apiRequestSentFromSpawnConsumed = true;
    return {
      ms: this.apiRequestSentFromSpawnMs,
      warmSpareClaimed: this.warmSpareClaimed,
      flagFetchKick: this.flagFetchKick,
      timeOriginMs: isDiskless() ? undefined : performance.timeOrigin,
    };
  }
}
//@ chunk-e0saccbx.js:11967-11992 placement
/**
 * 按宿主缓存的启动计时记录器。
 */
var startupTimingRecorderByHost; // deferred: uses StartupTimingRecorder of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e0saccbx.js:11967", () => {
  startupTimingRecorderByHost = new HostScoped(() => new StartupTimingRecorder());
});
//@ chunk-e0saccbx.js:11992-12029 placement
function startupTimingRecorder() {
  return startupTimingRecorderByHost.of(getRootSession().host);
}
//@ chunk-e0saccbx.js:12029-12071 placement
/**
 * 记录一个启动阶段耗时。
 */
function recordPhase(field, ms, startMs) {
  startupTimingRecorder().recordPhase(field, ms, startMs);
}
//@ chunk-e0saccbx.js:12071-12118 placement
/**
 * 记录 session-start 钩子初始化等待。
 */
function recordHooksInitWait(waitedMs, startMs) {
  startupTimingRecorder().recordHooksInitWait(waitedMs, startMs);
}
//@ chunk-e0saccbx.js:12118-12165 placement
/**
 * 读取已记录的某阶段耗时。
 */
function getRecordedPhase(field) {
  return startupTimingRecorder().getRecordedPhase(field);
}
//@ chunk-e0saccbx.js:12165-12204 placement
/**
 * 记录 spawn 到 exec 的耗时。
 */
function recordSpawnToExec() {
  startupTimingRecorder().recordSpawnToExec();
}
//@ chunk-e0saccbx.js:12204-12246 placement
/**
 * 标记已认领热备会话。
 */
function markWarmSpareClaimed() {
  startupTimingRecorder().markWarmSpareClaimed();
}
//@ chunk-e0saccbx.js:12246-12283 placement
/**
 * 标记热备已加载。
 */
function markSpareLoaded() {
  startupTimingRecorder().markSpareLoaded();
}
//@ chunk-e0saccbx.js:12283-12320 placement
/**
 * 标记回合开始。
 */
function markTurnBegan(isProcessTelemetryEnabled) {
  startupTimingRecorder().markTurnBegan(isProcessTelemetryEnabled);
}
//@ chunk-e0saccbx.js:12320-12360 placement
/**
 * 记录插件全量加载。
 */
function notePluginFullLoad() {
  startupTimingRecorder().notePluginFullLoad();
}
//@ chunk-e0saccbx.js:12360-12402 placement
/**
 * 记录用户上下文构建。
 */
function noteUserContextBuild() {
  startupTimingRecorder().noteUserContextBuild();
}
//@ chunk-e0saccbx.js:12402-12450 placement
/**
 * 是否已认领热备。
 */
function wasWarmSpareClaimed() {
  return startupTimingRecorder().wasWarmSpareClaimed();
}
//@ chunk-e0saccbx.js:12450-12491 placement
/**
 * 记录特性开关拉取的启动时机。
 */
function markFlagFetchKick(kick) {
  startupTimingRecorder().markFlagFetchKick(kick);
}
//@ chunk-e0saccbx.js:12491-12536 placement
/**
 * 取特性开关拉取的启动时机。
 */
function getFlagFetchKick() {
  return startupTimingRecorder().getFlagFetchKick();
}
//@ chunk-e0saccbx.js:12536-12581 placement
/**
 * 记录热缓存 kick 请求。
 */
function markWarmCacheKickAsks(asks) {
  startupTimingRecorder().markWarmCacheKickAsks(asks);
}
//@ chunk-e0saccbx.js:12581-12624 placement
/**
 * 记录钩子初始化来源。
 */
function markHooksInitSource(source) {
  startupTimingRecorder().markHooksInitSource(source);
}
//@ chunk-e0saccbx.js:12624-12673 placement
/**
 * 记录恢复会话钩子等待的影子值。
 */
function markResumeHooksWaitShadow(shadow) {
  startupTimingRecorder().markResumeHooksWaitShadow(shadow);
}
//@ chunk-e0saccbx.js:12673-12714 placement
/**
 * 记录等待特性开关的时长。
 */
function noteFlagFetchWait(waitMs) {
  startupTimingRecorder().noteFlagFetchWait(waitMs);
}
//@ chunk-e0saccbx.js:12714-12763 placement
/**
 * 取等待特性开关的毫秒数。
 */
function getFlagFetchWaitedMs() {
  return startupTimingRecorder().getFlagFetchWaitedMs();
}
//@ chunk-e0saccbx.js:12763-12801 placement
/**
 * 记录 SDK MCP 拨号。
 */
function noteSdkMcpDial(dialMs) {
  startupTimingRecorder().noteSdkMcpDial(dialMs);
}
//@ chunk-e0saccbx.js:12801-12849 placement
/**
 * 标记 hydrate 预取完成。
 */
function markHydratePrefetchSettled() {
  startupTimingRecorder().markHydratePrefetchSettled();
}
//@ chunk-e0saccbx.js:12849-12902 placement
/**
 * 记录恢复时 hydrate 预取。
 */
function markResumeHydratePrefetch(anchor, settledAt) {
  startupTimingRecorder().markResumeHydratePrefetch(anchor, settledAt);
}
//@ chunk-e0saccbx.js:12902-12950 placement
/**
 * 记录恢复时转录扫描耗时。
 */
function markResumeTranscriptScan(scan) {
  startupTimingRecorder().markResumeTranscriptScan(scan);
}
//@ chunk-e0saccbx.js:12950-13007 layout
function noteResumeReadAhead(bytes, atMs) {
  startupTimingRecorder().markResumeTranscriptReadAhead(bytes, atMs);
}
//@ chunk-e0saccbx.js:13007-13073 placement
/**
 * 记录恢复 hydrate 的增量字段。
 */
function markResumeHydrateDelta(bytesTotal, bytesRead, linesRead, readMs, parseMs, walkback) {
  startupTimingRecorder().markResumeHydrateDelta(bytesTotal, bytesRead, linesRead, readMs, parseMs, walkback);
}
//@ chunk-e0saccbx.js:13073-13126 placement
/**
 * 记录从 spawn 到读到首条消息。
 */
function recordFirstMessageReadFromSpawn() {
  startupTimingRecorder().recordFirstMessageReadFromSpawn();
}
//@ chunk-e0saccbx.js:13126-13173 placement
/**
 * 记录从 spawn 到输入就绪。
 */
function recordInputReadyFromSpawn() {
  startupTimingRecorder().recordInputReadyFromSpawn();
}
//@ chunk-e0saccbx.js:13173-13209 placement
/**
 * 取出并清空启动计时记录。
 */
function consumeStartupTiming() {
  return startupTimingRecorder().consume();
}
//@ chunk-e0saccbx.js:13209-13334 placement
/**
 * 采样命中时记录 tengu_startup_timing 启动计时事件。
 */
function logStartupTiming(site) {
  if (!isProfilingSampled()) return;
  let fields = startupTimingRecorder().telemetryFields();
  if (fields === undefined) return;
  logEvent("tengu_startup_timing", {
    ...fields,
    site: fromEnum(site),
  });
}
//@ chunk-e0saccbx.js:13334-13385 placement
/**
 * 记录从 spawn 到发出首个 API 请求。
 */
function recordApiRequestSentFromSpawn() {
  startupTimingRecorder().recordApiRequestSentFromSpawn();
}
//@ chunk-e0saccbx.js:13385-13444 placement
/**
 * 取出并清空 API 请求已发送的标记。
 */
function consumeApiRequestSentFromSpawn() {
  return startupTimingRecorder().consumeApiRequestSentFromSpawn();
}
export {
  recordApiRequestSentFromSpawn,
  recordPhase,
  markResumeHydrateDelta,
  markResumeTranscriptScan,
  noteSdkMcpDial,
  recordInputReadyFromSpawn,
  markResumeHydratePrefetch,
  consumeApiRequestSentFromSpawn,
  notePluginFullLoad,
  recordFirstMessageReadFromSpawn,
  getRecordedPhase,
  markResumeHooksWaitShadow,
  recordHooksInitWait,
  noteResumeReadAhead,
  markFlagFetchKick,
  recordSpawnToExec,
  wasWarmSpareClaimed,
  logStartupTiming,
  markHydratePrefetchSettled,
  markTurnBegan,
  startupTimingRecorderByHost,
  noteUserContextBuild,
  markHooksInitSource,
  noteFlagFetchWait,
  markWarmCacheKickAsks,
  getFlagFetchKick,
  consumeStartupTiming,
  markWarmSpareClaimed,
  getFlagFetchWaitedMs,
  markSpareLoaded,
};
