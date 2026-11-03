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
import { mn } from "./remoteEnvironment.js";
import { fromEnumOpt, fromEnum } from "../services/analytics/safeMetadata.js";
import { Do } from "./git/gitSafeEnv.js";
import { HostScoped } from "./hostScoped.js";
import { isProfilingSampled } from "./headlessProfiler.js";
import { logEvent } from "../services/analytics/index.js";

/**
 * 启动计时常量：runner 准备阶段字段、各字段上限（一周秒数、包数量等）、阶段时长上限（1 小时 / runner 10 分钟）。
 */
//@ chunk-mgevbrsn.js:673-1022 placement
var RUNNER_PREP_FIELDS = [
    "runner_prep_total_ms",
    "runner_prep_git_proxy_config_ms",
    "runner_prep_reset_remote_ms",
    "runner_prep_outcome_branch_ms",
    "runner_prep_repo_settings_ms",
    "runner_prep_config_seed_ms",
    "runner_prep_remote_refetch_ms",
  ],
  WEEK_SECONDS = 604800,
  FIELD_CAPS = {
    git_have_age_s: WEEK_SECONDS,
    git_pack_count: 1e4,
    standby_idle_s: WEEK_SECONDS,
    healthz_claim_visible_ms: 600000,
  },
  PHASE_CAP_MS = 3600000,
  RUNNER_PHASE_CAP_MS = 600000,
  RUNNER_PREP_FIELD_SET = new Set(RUNNER_PREP_FIELDS);
//@ chunk-mgevbrsn.js:1022-1062 placement
function P(e) {
  return Object.hasOwn(FIELD_CAPS, e);
}
//@ chunk-mgevbrsn.js:1062-1092 placement
function F(e) {
  return RUNNER_PREP_FIELD_SET.has(e);
}
//@ chunk-mgevbrsn.js:1092-1115 placement
function w(e) {
  return !1;
}
//@ chunk-mgevbrsn.js:1115-1234 placement
function clampMetric(e, t) {
  if (typeof e !== "number" || !Number.isFinite(e)) return;
  let rounded = Math.round(e);
  return rounded < 0 ? void 0 : Math.min(rounded, t);
}
//@ chunk-mgevbrsn.js:1234-1345 placement
function objectField(e, t) {
  let s = Object.hasOwn(e, t) ? Reflect.get(e, t) : void 0;
  return typeof s === "object" && s !== null ? s : void 0;
}
/**
 * 解析预热备用进程上报的计时：只保留已知字段与阶段名，数值按各自上限校验；全部为空时返回 undefined。
 */
//@ chunk-mgevbrsn.js:1345-1741 placement
function parseSpareTiming(e) {
  if (typeof e !== "object" || e === null) return;
  let t = {};
  for (let [r, o] of Object.entries(objectField(e, "fields") ?? {}))
    if (P(r)) {
      let _ = clampMetric(o, FIELD_CAPS[r]);
      if (_ !== void 0) t[r] = _;
    }
  let s = {};
  for (let [r, o] of Object.entries(objectField(e, "phases") ?? {}))
    if (F(r)) {
      let _ = clampMetric(o, PHASE_CAP_MS);
      if (_ !== void 0) s[r] = _;
    } else if (w(r)) {
      let _ = clampMetric(o, RUNNER_PHASE_CAP_MS);
      if (_ !== void 0) s[r] = _;
    }
  if (Object.keys(t).length === 0 && Object.keys(s).length === 0) return;
  return { fields: t, phases: s };
}
//@ chunk-mgevbrsn.js:1741-1752 placement
var M = 8192;
//@ chunk-mgevbrsn.js:1752-1825 placement
function f(e) {
  if (!e || e.length > M) return;
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
  ],
  MAX_TIMING_SAMPLES = 10,
  ZERO_PROCESS_SAMPLE = {
    atMs: 0,
    cpuMs: 0,
    procStat: { minorFaults: 0, majorFaults: 0, childrenMinorFaults: 0, childrenCpuTicks: 0 },
    storageReadBytes: 0,
  };
/**
 * 采样当前进程状态：时刻、CPU 毫秒、/proc/self/stat 与 /proc/self/io 中的统计（无盘模式跳过，失败记诊断日志）。
 */
//@ chunk-mgevbrsn.js:2071-2372 placement
function sampleProcess() {
  try {
    if (isDiskless()) return;
    let cpuUsage = process.cpuUsage(),
      startTime = performance.now(),
      s,
      r;
    try {
      s = parseStatFaults(readFileSync("/proc/self/stat", "utf8"));
    } catch {}
    try {
      r = parseReadBytes(readFileSync("/proc/self/io", "utf8"));
    } catch {}
    return {
      atMs: startTime,
      cpuMs: (cpuUsage.user + cpuUsage.system) / 1000,
      procStat: s,
      storageReadBytes: r,
    };
  } catch {
    logForDiagnosticsNoPII("error", "startup_process_sample_failed");
    return;
  }
}
//@ chunk-mgevbrsn.js:2372-2423 placement
function u(e, t) {
  return Math.max(0, Math.round(t - e));
}
//@ chunk-mgevbrsn.js:2423-3189 placement
class PhaseSample {
  sample;
  ends = {};
  constructor(e = sampleProcess) {
    this.sample = e;
  }
  end(e) {
    this.ends[e] ??= this.sample();
  }
  toWire() {
    let e = {},
      t = ZERO_PROCESS_SAMPLE;
    for (let s of SPARE_TIMING_MARKS) {
      let r = this.ends[s];
      if (r === void 0 || r.atMs < t.atMs) continue;
      ((e[s] = {
        cpu_ms: u(t.cpuMs, r.cpuMs),
        wall_ms: Math.max(0, Math.ceil(r.atMs - t.atMs)),
        ...(t.procStat &&
          r.procStat && {
            minor_faults: u(t.procStat.minorFaults, r.procStat.minorFaults),
            major_faults: u(t.procStat.majorFaults, r.procStat.majorFaults),
            children_cpu_ms: u(t.procStat.childrenCpuTicks, r.procStat.childrenCpuTicks) * MAX_TIMING_SAMPLES,
            children_minor_faults: u(t.procStat.childrenMinorFaults, r.procStat.childrenMinorFaults),
          }),
        ...(t.storageReadBytes !== void 0 &&
          r.storageReadBytes !== void 0 && {
            storage_read_kib: u(t.storageReadBytes / 1024, r.storageReadBytes / 1024),
          }),
      }),
        (t = r));
    }
    return e.to_input_ready && e.to_first_turn ? e : void 0;
  }
}
/**
 * 计时字段到启动标记名的映射（input_ready、first_message），以及启动各阶段的计时字段名列表。
 */
//@ chunk-mgevbrsn.js:3189-3528 placement
var TIMING_FIELD_TO_MARK = { input_ready_ms: "to_input_ready", first_message_read_ms: "to_first_message" },
  STARTUP_PHASE_FIELDS = [
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
/**
 * 启动阶段计时记录器（tengu_startup_timing）。
 */
//@ chunk-mgevbrsn.js:3528-10594 placement
class StartupTimingRecorder {
  phases = {};
  phaseStarts = {};
  warmSpareClaimed = !1;
  hydratePrefetchSettledAt = void 0;
  resumeHydratePrefetch = void 0;
  resumeHydrateOnDiskBytes = void 0;
  resumeHydrateCcrBytes = void 0;
  resumeHydrateCcrEvents = void 0;
  resumeHydrateDeltaEvents = void 0;
  resumeHydrateDeltaFetchAttempted = void 0;
  resumeHydrateAnchorWalkback = void 0;
  resumeTranscriptScan = void 0;
  pluginFullLoads = 0;
  userContextBuilds = 0;
  sdkMcpDialRuns = 0;
  sdkMcpServersDialed = 0;
  flagFetchKick = void 0;
  flagFetchKickJudgedAtMs = void 0;
  warmWakeEarlyFetch = void 0;
  kickOnWarmCache = void 0;
  hooksInitSource = void 0;
  resumeHooksWaitShadow = void 0;
  pluginsSyncRound = void 0;
  processStretches = new PhaseSample();
  maySendProcessStretches = void 0;
  flagFetchWaitedMs = 0;
  hooksInitWaitGivenUp = !1;
  consumed = !1;
  reported = !1;
  apiRequestSentFromSpawnMs = void 0;
  apiRequestSentFromSpawnConsumed = !1;
  recordPhase(e, t, s) {
    if (e === "first_message_read_ms") noteFirstMessageForGarbageCollectionCount();
    if (this.consumed) return;
    if (e === "skills_load_ms" && this.phases[e] !== void 0) return;
    if (e === "hooks_init_ms" && this.hooksInitWaitGivenUp) return;
    if (((this.phases[e] = Math.round(t)), s !== void 0)) this.phaseStarts[e] = Math.round(s);
    let r = TIMING_FIELD_TO_MARK[e];
    if (r !== void 0) this.endProcessStretch(r);
  }
  endProcessStretch(e) {
    if (env.CLAUDE_CODE_REMOTE && !this.consumed) this.processStretches.end(e);
  }
  markSpareLoaded() {
    this.endProcessStretch("to_spare_loaded");
  }
  markTurnBegan(e) {
    (this.endProcessStretch("to_first_turn"), (this.maySendProcessStretches = e));
  }
  recordHooksInitWait(e, t) {
    (this.recordPhase("hooks_init_ms", e, t), (this.hooksInitWaitGivenUp = !0));
  }
  getRecordedPhase(e) {
    return this.phases[e];
  }
  recordSpawnToExec() {
    let int = Number.parseInt(process.env.CCR_SPAWN_TIMESTAMP_MS ?? "", 10);
    if (!Number.isFinite(int)) return;
    this.recordPhase(
      "spawn_to_exec_ms",
      Date.now() - process.uptime() * 1000 - int,
      int - performance.timeOrigin,
    );
  }
  markWarmSpareClaimed() {
    ((this.warmSpareClaimed = !0), this.endProcessStretch("to_claim"));
  }
  markFlagFetchKick(e) {
    ((this.flagFetchKick = e), (this.flagFetchKickJudgedAtMs = Math.round(performance.now())));
  }
  getFlagFetchKick() {
    return this.flagFetchKick;
  }
  markWarmCacheKickAsks(e) {
    ((this.warmWakeEarlyFetch = e), (this.kickOnWarmCache = env.CLAUDE_CODE_GROWTHBOOK_KICK_ON_WARM_CACHE));
  }
  markHooksInitSource(e) {
    this.hooksInitSource = e;
  }
  markResumeHooksWaitShadow(e) {
    this.resumeHooksWaitShadow = e;
  }
  markPluginsSyncRound(e, t) {
    this.pluginsSyncRound = { round: e, maySend: t };
  }
  noteFlagFetchWait(e) {
    this.flagFetchWaitedMs += e;
  }
  getFlagFetchWaitedMs() {
    return this.flagFetchWaitedMs;
  }
  noteSdkMcpDial(e) {
    if (e <= 0) return;
    (this.sdkMcpDialRuns++, (this.sdkMcpServersDialed += e));
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
        : this.hydratePrefetchSettledAt !== void 0 && this.hydratePrefetchSettledAt < t
          ? "hit"
          : "pending";
  }
  markResumeHydrateDelta(e, t, s, r, o, _) {
    ((this.resumeHydrateOnDiskBytes = e),
      (this.resumeHydrateCcrBytes = t),
      (this.resumeHydrateCcrEvents = s),
      (this.resumeHydrateDeltaEvents = r),
      (this.resumeHydrateDeltaFetchAttempted = o),
      (this.resumeHydrateAnchorWalkback = _));
  }
  markResumeTranscriptScan(e) {
    if (this.resumeTranscriptScan !== void 0) return;
    ((this.resumeTranscriptScan = e), this.recordPhase("resume_transcript_scan_ms", e.scanMs, e.scanStartMs));
  }
  recordFirstMessageReadFromSpawn() {
    let int = Number.parseInt(process.env.CCR_SPAWN_TIMESTAMP_MS ?? "", 10);
    if (!Number.isFinite(int)) return;
    this.recordPhase("first_message_read_from_spawn_ms", Date.now() - int, int - performance.timeOrigin);
  }
  recordInputReadyFromSpawn() {
    let int = Number.parseInt(process.env.CCR_SPAWN_TIMESTAMP_MS ?? "", 10);
    if (!Number.isFinite(int)) return;
    this.recordPhase("input_ready_from_spawn_ms", Date.now() - int, int - performance.timeOrigin);
  }
  consume() {
    if (!env.CLAUDE_CODE_REMOTE && !env.CLAUDE_CODE_EMIT_STARTUP_TIMING) return;
    if (this.consumed || Object.keys(this.phases).length === 0) return;
    this.consumed = !0;
    let e = f(antEnv.CCR_RUNNER_STARTUP_TIMING),
      t = !isDiskless(),
      s = this.maySendProcessStretches?.() ?? !1;
    return {
      ...e?.fields,
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
      flag_fetch_kick_judged_at_ms: t ? this.flagFetchKickJudgedAtMs : void 0,
      warm_wake_early_fetch: this.warmWakeEarlyFetch,
      kick_on_warm_cache: this.kickOnWarmCache,
      hooks_init_source: this.hooksInitSource,
      resume_hooks_wait_shadow: this.resumeHooksWaitShadow,
      plugins_sync_round: this.pluginsSyncRound?.maySend() ? this.pluginsSyncRound.round : void 0,
      process_stretches: s ? this.processStretches.toWire() : void 0,
      ...(s &&
        t && {
          process_start_tuning: processStartTuning(),
          process_start_purge_delay_ms: processStartPurgeDelayMs(),
        }),
      cli_trial_keys: mn()
        ? (env.CLAUDE_CODE_MCP_SKIP_UNCHANGED_RELIST === !0 ? 1 : 0) +
          (env.CLAUDE_CODE_CHROME_LATE_MCP_SERVER === !0 ? 2 : 0) +
          (env.CLAUDE_CODE_SKIP_MCP_DEBUG_LOG_FILES === !0 ? 4 : 0)
        : void 0,
      phases: { ...e?.phases, ...(t ? this.phases : this.durations()) },
      ...(t && { time_origin_ms: performance.timeOrigin, phase_start_ms: { ...this.phaseStarts } }),
    };
  }
  telemetryFields() {
    if (isDiskless()) return;
    if (this.reported || Object.keys(this.phases).length === 0) return;
    this.reported = !0;
    let e = {},
      t = 0;
    for (let r of STARTUP_PHASE_FIELDS) {
      let o = this.phases[r];
      if (o !== void 0) ((e[r] = o), (t += o));
    }
    let s = 0;
    for (let r of Object.values(this.phases)) s += r ?? 0;
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
    return Do(this.phases, (e, t) => t !== "spawn_to_exec_ms" && this.phaseStarts[t] !== 0);
  }
  recordApiRequestSentFromSpawn() {
    if (this.apiRequestSentFromSpawnMs !== void 0) return;
    let int = Number.parseInt(process.env.CCR_SPAWN_TIMESTAMP_MS ?? "", 10);
    if (!Number.isFinite(int)) return;
    this.apiRequestSentFromSpawnMs = Date.now() - int;
  }
  consumeApiRequestSentFromSpawn() {
    if (this.apiRequestSentFromSpawnConsumed || this.apiRequestSentFromSpawnMs === void 0) return;
    return (
      (this.apiRequestSentFromSpawnConsumed = !0),
      {
        ms: this.apiRequestSentFromSpawnMs,
        warmSpareClaimed: this.warmSpareClaimed,
        flagFetchKick: this.flagFetchKick,
        timeOriginMs: isDiskless() ? void 0 : performance.timeOrigin,
      }
    );
  }
}
//@ chunk-mgevbrsn.js:10594-10619 placement
var pes = new HostScoped(() => new StartupTimingRecorder());
//@ chunk-mgevbrsn.js:10619-10656 placement
function n() {
  return pes.of(getRootSession().host);
}
//@ chunk-mgevbrsn.js:10656-10698 placement
function Br(e, t, s) {
  n().recordPhase(e, t, s);
}
//@ chunk-mgevbrsn.js:10698-10745 placement
function jhi(e, t) {
  n().recordHooksInitWait(e, t);
}
//@ chunk-mgevbrsn.js:10745-10792 placement
function n5e(e) {
  return n().getRecordedPhase(e);
}
//@ chunk-mgevbrsn.js:10792-10831 placement
function Whi() {
  n().recordSpawnToExec();
}
//@ chunk-mgevbrsn.js:10831-10873 placement
function Tcr() {
  n().markWarmSpareClaimed();
}
//@ chunk-mgevbrsn.js:10873-10910 placement
function Ghi() {
  n().markSpareLoaded();
}
//@ chunk-mgevbrsn.js:10910-10947 placement
function zhi(e) {
  n().markTurnBegan(e);
}
//@ chunk-mgevbrsn.js:10947-10987 placement
function Khi() {
  n().notePluginFullLoad();
}
//@ chunk-mgevbrsn.js:10987-11029 placement
function Vhi() {
  n().noteUserContextBuild();
}
//@ chunk-mgevbrsn.js:11029-11077 placement
function qhi() {
  return n().wasWarmSpareClaimed();
}
//@ chunk-mgevbrsn.js:11077-11118 placement
function Yhi(e) {
  n().markFlagFetchKick(e);
}
//@ chunk-mgevbrsn.js:11118-11163 placement
function Xhi() {
  return n().getFlagFetchKick();
}
//@ chunk-mgevbrsn.js:11163-11208 placement
function Jhi(e) {
  n().markWarmCacheKickAsks(e);
}
//@ chunk-mgevbrsn.js:11208-11251 placement
function Qhi(e) {
  n().markHooksInitSource(e);
}
//@ chunk-mgevbrsn.js:11251-11300 placement
function Zhi(e) {
  n().markResumeHooksWaitShadow(e);
}
//@ chunk-mgevbrsn.js:11300-11341 placement
function eyi(e) {
  n().noteFlagFetchWait(e);
}
//@ chunk-mgevbrsn.js:11341-11390 placement
function tyi() {
  return n().getFlagFetchWaitedMs();
}
//@ chunk-mgevbrsn.js:11390-11428 placement
function nyi(e) {
  n().noteSdkMcpDial(e);
}
//@ chunk-mgevbrsn.js:11428-11476 placement
function ryi() {
  n().markHydratePrefetchSettled();
}
//@ chunk-mgevbrsn.js:11476-11529 placement
function oyi(e, t) {
  n().markResumeHydratePrefetch(e, t);
}
//@ chunk-mgevbrsn.js:11529-11577 placement
function syi(e) {
  n().markResumeTranscriptScan(e);
}
//@ chunk-mgevbrsn.js:11577-11643 placement
function iyi(e, t, s, r, o, _) {
  n().markResumeHydrateDelta(e, t, s, r, o, _);
}
//@ chunk-mgevbrsn.js:11643-11696 placement
function ayi() {
  n().recordFirstMessageReadFromSpawn();
}
//@ chunk-mgevbrsn.js:11696-11743 placement
function lyi() {
  n().recordInputReadyFromSpawn();
}
//@ chunk-mgevbrsn.js:11743-11779 placement
function dyi() {
  return n().consume();
}
/**
 * 采样命中时记录 tengu_startup_timing 启动计时事件。
 */
//@ chunk-mgevbrsn.js:11779-11904 placement
function logStartupTiming(e) {
  if (!isProfilingSampled()) return;
  let telemetryFields = n().telemetryFields();
  if (telemetryFields === void 0) return;
  logEvent("tengu_startup_timing", { ...telemetryFields, site: fromEnum(e) });
}
//@ chunk-mgevbrsn.js:11904-11955 placement
function cyi() {
  n().recordApiRequestSentFromSpawn();
}
//@ chunk-mgevbrsn.js:11955-12014 placement
function uyi() {
  return n().consumeApiRequestSentFromSpawn();
}

export {
  Br,
  iyi,
  syi,
  Whi,
  qhi,
  logStartupTiming,
  Yhi,
  nyi,
  lyi,
  oyi,
  uyi,
  cyi,
  eyi,
  Jhi,
  Xhi,
  Khi,
  tyi,
  Tcr,
  Ghi,
  pes,
  Vhi,
  Qhi,
  zhi,
  dyi,
  n5e,
  ayi,
  Zhi,
  jhi,
  ryi,
};
