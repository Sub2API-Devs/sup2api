/**
 * utils/startupTiming.ts
 *
 * 2.1.316 新增。启动阶段计时。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-mgevbrsn.js (45)
 * attribution: placement 45
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

//@ chunk-mgevbrsn.js:673-1022 placement
/**
 * 启动计时常量：runner 准备阶段字段、各字段上限（一周秒数、包数量等）、阶段时长上限（1 小时 / runner 10 分钟）。
 */
var RUNNER_PREP_FIELDS = [
  "runner_prep_total_ms",
  "runner_prep_git_proxy_config_ms",
  "runner_prep_reset_remote_ms",
  "runner_prep_outcome_branch_ms",
  "runner_prep_repo_settings_ms",
  "runner_prep_config_seed_ms",
  "runner_prep_remote_refetch_ms",
];
var WEEK_SECONDS = 604800;
var FIELD_CAPS = {
  git_have_age_s: WEEK_SECONDS,
  git_pack_count: 1e4,
  standby_idle_s: WEEK_SECONDS,
  healthz_claim_visible_ms: 600000,
};
var PHASE_CAP_MS = 3600000;
var RUNNER_PHASE_CAP_MS = 600000;
var RUNNER_PREP_FIELD_SET = new Set(RUNNER_PREP_FIELDS);
//@ chunk-mgevbrsn.js:1022-1062 placement
function hasFieldCap(e) {
  return Object.hasOwn(FIELD_CAPS, e);
}
//@ chunk-mgevbrsn.js:1062-1092 placement
function isRunnerPrepField(e) {
  return RUNNER_PREP_FIELD_SET.has(e);
}
//@ chunk-mgevbrsn.js:1092-1115 placement
function isParityField(e) {
  return false;
}
//@ chunk-mgevbrsn.js:1115-1234 placement
function clampMetric(e, t) {
  if (typeof e !== "number" || !Number.isFinite(e)) return;
  let rounded = Math.round(e);
  return rounded < 0 ? undefined : Math.min(rounded, t);
}
//@ chunk-mgevbrsn.js:1234-1345 placement
function objectField(e, t) {
  let s = Object.hasOwn(e, t) ? Reflect.get(e, t) : undefined;
  return typeof s === "object" && s !== null ? s : undefined;
}
//@ chunk-mgevbrsn.js:1345-1741 placement
/**
 * 解析预热备用进程上报的计时：只保留已知字段与阶段名，数值按各自上限校验；全部为空时返回 undefined。
 */
function parseSpareTiming(e) {
  if (typeof e !== "object" || e === null) return;
  let t = {};
  for (let [key, value] of Object.entries(objectField(e, "fields") ?? {}))
    if (hasFieldCap(key)) {
      let _ = clampMetric(value, FIELD_CAPS[key]);
      if (_ !== undefined) t[key] = _;
    }
  let s = {};
  for (let [key, value] of Object.entries(objectField(e, "phases") ?? {}))
    if (isRunnerPrepField(key)) {
      let _ = clampMetric(value, PHASE_CAP_MS);
      if (_ !== undefined) s[key] = _;
    } else if (isParityField(key)) {
      let _ = clampMetric(value, RUNNER_PHASE_CAP_MS);
      if (_ !== undefined) s[key] = _;
    }
  if (Object.keys(t).length === 0 && Object.keys(s).length === 0) return;
  return {
    fields: t,
    phases: s,
  };
}
//@ chunk-mgevbrsn.js:1741-1752 placement
var MAX_SPARE_TIMING_CHARS = 8192;
//@ chunk-mgevbrsn.js:1752-1825 placement
function parseSpareTimingEnv(e) {
  if (!e || e.length > MAX_SPARE_TIMING_CHARS) return;
  try {
    return parseSpareTiming(jsonParse(e));
  } catch {
    return;
  }
}
//@ chunk-mgevbrsn.js:1859-2071 placement
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
//@ chunk-mgevbrsn.js:2071-2372 placement
/**
 * 采样当前进程状态：时刻、CPU 毫秒、/proc/self/stat 与 /proc/self/io 中的统计（无盘模式跳过，失败记诊断日志）。
 */
function sampleProcess() {
  try {
    if (isDiskless()) return;
    let e = process.cpuUsage();
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
      cpuMs: (e.user + e.system) / 1000,
      procStat,
      storageReadBytes,
    };
  } catch {
    logForDiagnosticsNoPII("error", "startup_process_sample_failed");
    return;
  }
}
//@ chunk-mgevbrsn.js:2372-2423 placement
function diffClamped(e, t) {
  return Math.max(0, Math.round(t - e));
}
//@ chunk-mgevbrsn.js:2423-3189 placement
class PhaseSample {
  sample;
  ends = {};
  constructor(sample = sampleProcess) {
    this.sample = sample;
  }
  end(e) {
    this.ends[e] ??= this.sample();
  }
  toWire() {
    let e = {};
    let t = ZERO_PROCESS_SAMPLE;
    for (let s of SPARE_TIMING_MARKS) {
      let r = this.ends[s];
      if (r === undefined || r.atMs < t.atMs) continue;
      e[s] = {
        cpu_ms: diffClamped(t.cpuMs, r.cpuMs),
        wall_ms: Math.max(0, Math.ceil(r.atMs - t.atMs)),
        ...(t.procStat &&
          r.procStat && {
            minor_faults: diffClamped(t.procStat.minorFaults, r.procStat.minorFaults),
            major_faults: diffClamped(t.procStat.majorFaults, r.procStat.majorFaults),
            children_cpu_ms:
              diffClamped(t.procStat.childrenCpuTicks, r.procStat.childrenCpuTicks) * MAX_TIMING_SAMPLES,
            children_minor_faults: diffClamped(
              t.procStat.childrenMinorFaults,
              r.procStat.childrenMinorFaults,
            ),
          }),
        ...(t.storageReadBytes !== undefined &&
          r.storageReadBytes !== undefined && {
            storage_read_kib: diffClamped(t.storageReadBytes / 1024, r.storageReadBytes / 1024),
          }),
      };
      t = r;
    }
    return e.to_input_ready && e.to_first_turn ? e : undefined;
  }
}
//@ chunk-mgevbrsn.js:3189-3528 placement
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
//@ chunk-mgevbrsn.js:3528-10594 placement
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
  recordPhase(e, t, s) {
    if (e === "first_message_read_ms") noteFirstMessageForGarbageCollectionCount();
    if (this.consumed) return;
    if (e === "skills_load_ms" && this.phases[e] !== undefined) return;
    if (e === "hooks_init_ms" && this.hooksInitWaitGivenUp) return;
    this.phases[e] = Math.round(t);
    if (s !== undefined) this.phaseStarts[e] = Math.round(s);
    let r = TIMING_FIELD_TO_MARK[e];
    if (r !== undefined) this.endProcessStretch(r);
  }
  endProcessStretch(e) {
    if (env.CLAUDE_CODE_REMOTE && !this.consumed) this.processStretches.end(e);
  }
  markSpareLoaded() {
    this.endProcessStretch("to_spare_loaded");
  }
  markTurnBegan(maySendProcessStretches) {
    this.endProcessStretch("to_first_turn");
    this.maySendProcessStretches = maySendProcessStretches;
  }
  recordHooksInitWait(e, t) {
    this.recordPhase("hooks_init_ms", e, t);
    this.hooksInitWaitGivenUp = true;
  }
  getRecordedPhase(e) {
    return this.phases[e];
  }
  recordSpawnToExec() {
    let e = Number.parseInt(process.env.CCR_SPAWN_TIMESTAMP_MS ?? "", 10);
    if (!Number.isFinite(e)) return;
    this.recordPhase(
      "spawn_to_exec_ms",
      Date.now() - process.uptime() * 1000 - e,
      e - performance.timeOrigin,
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
  noteFlagFetchWait(e) {
    this.flagFetchWaitedMs += e;
  }
  getFlagFetchWaitedMs() {
    return this.flagFetchWaitedMs;
  }
  noteSdkMcpDial(e) {
    if (e <= 0) return;
    this.sdkMcpDialRuns++;
    this.sdkMcpServersDialed += e;
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
  markResumeHydratePrefetch(e, t) {
    this.resumeHydratePrefetch =
      e === null
        ? "miss"
        : this.hydratePrefetchSettledAt !== undefined && this.hydratePrefetchSettledAt < t
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
  markResumeTranscriptScan(e) {
    if (this.resumeTranscriptScan !== undefined) return;
    this.resumeTranscriptScan = e;
    this.recordPhase("resume_transcript_scan_ms", e.scanMs, e.scanStartMs);
  }
  recordFirstMessageReadFromSpawn() {
    let e = Number.parseInt(process.env.CCR_SPAWN_TIMESTAMP_MS ?? "", 10);
    if (!Number.isFinite(e)) return;
    this.recordPhase("first_message_read_from_spawn_ms", Date.now() - e, e - performance.timeOrigin);
  }
  recordInputReadyFromSpawn() {
    let e = Number.parseInt(process.env.CCR_SPAWN_TIMESTAMP_MS ?? "", 10);
    if (!Number.isFinite(e)) return;
    this.recordPhase("input_ready_from_spawn_ms", Date.now() - e, e - performance.timeOrigin);
  }
  consume() {
    if (!env.CLAUDE_CODE_REMOTE && !env.CLAUDE_CODE_EMIT_STARTUP_TIMING) return;
    if (this.consumed || Object.keys(this.phases).length === 0) return;
    this.consumed = true;
    let spareTimingEnv = parseSpareTimingEnv(antEnv.CCR_RUNNER_STARTUP_TIMING);
    let t = !isDiskless();
    let s = this.maySendProcessStretches?.() ?? false;
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
      resume_transcript_tool_copy_chars: this.resumeTranscriptScan?.toolCopyChars,
      delta_reset: antEnv.CCR_DELTA_RESET,
      plugin_full_loads: this.pluginFullLoads,
      user_context_builds: this.userContextBuilds,
      sdk_mcp_dial_runs: this.sdkMcpDialRuns,
      sdk_mcp_servers_dialed: this.sdkMcpServersDialed,
      flag_fetch_kick: this.flagFetchKick,
      flag_fetch_kick_judged_at_ms: t ? this.flagFetchKickJudgedAtMs : undefined,
      warm_wake_early_fetch: this.warmWakeEarlyFetch,
      kick_on_warm_cache: this.kickOnWarmCache,
      hooks_init_source: this.hooksInitSource,
      resume_hooks_wait_shadow: this.resumeHooksWaitShadow,
      plugins_sync_round: this.pluginsSyncRound?.maySend() ? this.pluginsSyncRound.round : undefined,
      process_stretches: s ? this.processStretches.toWire() : undefined,
      ...(s &&
        t && {
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
        ...(t ? this.phases : this.durations()),
      },
      ...(t && {
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
    let e = {};
    let t = 0;
    for (let r of STARTUP_PHASE_FIELDS) {
      let o = this.phases[r];
      if (o !== undefined) {
        e[r] = o;
        t += o;
      }
    }
    let s = 0;
    for (let phase of Object.values(this.phases)) s += phase ?? 0;
    return {
      ...e,
      other_ms: s - t,
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
    return pickByHelper(this.phases, (e, t) => t !== "spawn_to_exec_ms" && this.phaseStarts[t] !== 0);
  }
  recordApiRequestSentFromSpawn() {
    if (this.apiRequestSentFromSpawnMs !== undefined) return;
    let e = Number.parseInt(process.env.CCR_SPAWN_TIMESTAMP_MS ?? "", 10);
    if (!Number.isFinite(e)) return;
    this.apiRequestSentFromSpawnMs = Date.now() - e;
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
//@ chunk-mgevbrsn.js:10594-10619 placement
/**
 * 按宿主缓存的启动计时记录器。
 */
var startupTimingRecorderByHost = new HostScoped(() => new StartupTimingRecorder());
//@ chunk-mgevbrsn.js:10619-10656 placement
function startupTimingRecorder() {
  return startupTimingRecorderByHost.of(getRootSession().host);
}
//@ chunk-mgevbrsn.js:10656-10698 placement
/**
 * 记录一个启动阶段耗时。
 */
function recordPhase(e, t, s) {
  startupTimingRecorder().recordPhase(e, t, s);
}
//@ chunk-mgevbrsn.js:10698-10745 placement
/**
 * 记录 session-start 钩子初始化等待。
 */
function recordHooksInitWait(e, t) {
  startupTimingRecorder().recordHooksInitWait(e, t);
}
//@ chunk-mgevbrsn.js:10745-10792 placement
/**
 * 读取已记录的某阶段耗时。
 */
function getRecordedPhase(e) {
  return startupTimingRecorder().getRecordedPhase(e);
}
//@ chunk-mgevbrsn.js:10792-10831 placement
/**
 * 记录 spawn 到 exec 的耗时。
 */
function recordSpawnToExec() {
  startupTimingRecorder().recordSpawnToExec();
}
//@ chunk-mgevbrsn.js:10831-10873 placement
/**
 * 标记已认领热备会话。
 */
function markWarmSpareClaimed() {
  startupTimingRecorder().markWarmSpareClaimed();
}
//@ chunk-mgevbrsn.js:10873-10910 placement
/**
 * 标记热备已加载。
 */
function markSpareLoaded() {
  startupTimingRecorder().markSpareLoaded();
}
//@ chunk-mgevbrsn.js:10910-10947 placement
/**
 * 标记回合开始。
 */
function markTurnBegan(isProcessTelemetryEnabled) {
  startupTimingRecorder().markTurnBegan(isProcessTelemetryEnabled);
}
//@ chunk-mgevbrsn.js:10947-10987 placement
/**
 * 记录插件全量加载。
 */
function notePluginFullLoad() {
  startupTimingRecorder().notePluginFullLoad();
}
//@ chunk-mgevbrsn.js:10987-11029 placement
/**
 * 记录用户上下文构建。
 */
function noteUserContextBuild() {
  startupTimingRecorder().noteUserContextBuild();
}
//@ chunk-mgevbrsn.js:11029-11077 placement
/**
 * 是否已认领热备。
 */
function wasWarmSpareClaimed() {
  return startupTimingRecorder().wasWarmSpareClaimed();
}
//@ chunk-mgevbrsn.js:11077-11118 placement
/**
 * 记录特性开关拉取的启动时机。
 */
function markFlagFetchKick(e) {
  startupTimingRecorder().markFlagFetchKick(e);
}
//@ chunk-mgevbrsn.js:11118-11163 placement
/**
 * 取特性开关拉取的启动时机。
 */
function getFlagFetchKick() {
  return startupTimingRecorder().getFlagFetchKick();
}
//@ chunk-mgevbrsn.js:11163-11208 placement
/**
 * 记录热缓存 kick 请求。
 */
function markWarmCacheKickAsks(e) {
  startupTimingRecorder().markWarmCacheKickAsks(e);
}
//@ chunk-mgevbrsn.js:11208-11251 placement
/**
 * 记录钩子初始化来源。
 */
function markHooksInitSource(e) {
  startupTimingRecorder().markHooksInitSource(e);
}
//@ chunk-mgevbrsn.js:11251-11300 placement
/**
 * 记录恢复会话钩子等待的影子值。
 */
function markResumeHooksWaitShadow(e) {
  startupTimingRecorder().markResumeHooksWaitShadow(e);
}
//@ chunk-mgevbrsn.js:11300-11341 placement
/**
 * 记录等待特性开关的时长。
 */
function noteFlagFetchWait(waitMs) {
  startupTimingRecorder().noteFlagFetchWait(waitMs);
}
//@ chunk-mgevbrsn.js:11341-11390 placement
/**
 * 取等待特性开关的毫秒数。
 */
function getFlagFetchWaitedMs() {
  return startupTimingRecorder().getFlagFetchWaitedMs();
}
//@ chunk-mgevbrsn.js:11390-11428 placement
/**
 * 记录 SDK MCP 拨号。
 */
function noteSdkMcpDial(e) {
  startupTimingRecorder().noteSdkMcpDial(e);
}
//@ chunk-mgevbrsn.js:11428-11476 placement
/**
 * 标记 hydrate 预取完成。
 */
function markHydratePrefetchSettled() {
  startupTimingRecorder().markHydratePrefetchSettled();
}
//@ chunk-mgevbrsn.js:11476-11529 placement
/**
 * 记录恢复时 hydrate 预取。
 */
function markResumeHydratePrefetch(e, t) {
  startupTimingRecorder().markResumeHydratePrefetch(e, t);
}
//@ chunk-mgevbrsn.js:11529-11577 placement
/**
 * 记录恢复时转录扫描耗时。
 */
function markResumeTranscriptScan(e) {
  startupTimingRecorder().markResumeTranscriptScan(e);
}
//@ chunk-mgevbrsn.js:11577-11643 placement
/**
 * 记录恢复 hydrate 的增量字段。
 */
function markResumeHydrateDelta(bytesTotal, t, s, r, o, walkback) {
  startupTimingRecorder().markResumeHydrateDelta(bytesTotal, t, s, r, o, walkback);
}
//@ chunk-mgevbrsn.js:11643-11696 placement
/**
 * 记录从 spawn 到读到首条消息。
 */
function recordFirstMessageReadFromSpawn() {
  startupTimingRecorder().recordFirstMessageReadFromSpawn();
}
//@ chunk-mgevbrsn.js:11696-11743 placement
/**
 * 记录从 spawn 到输入就绪。
 */
function recordInputReadyFromSpawn() {
  startupTimingRecorder().recordInputReadyFromSpawn();
}
//@ chunk-mgevbrsn.js:11743-11779 placement
/**
 * 取出并清空启动计时记录。
 */
function consumeStartupTiming() {
  return startupTimingRecorder().consume();
}
//@ chunk-mgevbrsn.js:11779-11904 placement
/**
 * 采样命中时记录 tengu_startup_timing 启动计时事件。
 */
function logStartupTiming(e) {
  if (!isProfilingSampled()) return;
  let t = startupTimingRecorder().telemetryFields();
  if (t === undefined) return;
  logEvent("tengu_startup_timing", {
    ...t,
    site: fromEnum(e),
  });
}
//@ chunk-mgevbrsn.js:11904-11955 placement
/**
 * 记录从 spawn 到发出首个 API 请求。
 */
function recordApiRequestSentFromSpawn() {
  startupTimingRecorder().recordApiRequestSentFromSpawn();
}
//@ chunk-mgevbrsn.js:11955-12014 placement
/**
 * 取出并清空 API 请求已发送的标记。
 */
function consumeApiRequestSentFromSpawn() {
  return startupTimingRecorder().consumeApiRequestSentFromSpawn();
}
export {
  recordPhase,
  markResumeHydrateDelta,
  markResumeTranscriptScan,
  recordSpawnToExec,
  wasWarmSpareClaimed,
  logStartupTiming,
  markFlagFetchKick,
  noteSdkMcpDial,
  recordInputReadyFromSpawn,
  markResumeHydratePrefetch,
  consumeApiRequestSentFromSpawn,
  recordApiRequestSentFromSpawn,
  noteFlagFetchWait,
  markWarmCacheKickAsks,
  getFlagFetchKick,
  notePluginFullLoad,
  getFlagFetchWaitedMs,
  markWarmSpareClaimed,
  markSpareLoaded,
  startupTimingRecorderByHost,
  noteUserContextBuild,
  markHooksInitSource,
  markTurnBegan,
  consumeStartupTiming,
  getRecordedPhase,
  recordFirstMessageReadFromSpawn,
  markResumeHooksWaitShadow,
  recordHooksInitWait,
  markHydratePrefetchSettled,
};
