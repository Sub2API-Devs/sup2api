/**
 * utils/startupProfiler.ts
 *
 * 启动性能打点：profileCheckpoint、启动上下文字段、tengu_startup_perf 上报与报告
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/startupProfiler.ts
 * pieces: chunk-e6aww6q8.js (1), chunk-eweqvj83.js (17)
 * attribution: fingerprint 6, sole-consumer 3, affinity 2, callgraph-fingerprint 1, layout 2, facade-exports 4
 */
import { dirname, join } from "path";
import os from "os";
import { env } from "./env.js";
import { HostScoped } from "./hostScoped.js";
import { onProcessRootHost, getSessionId, isDisklessProcess } from "../bootstrap/state.js";
import { emitStartupMark, ye, spawnTimestampMs } from "./startupMarks.js";
import { getPerformance, formatTimelineLine, formatMs } from "./profilerBase.js";
import { getFsImplementation } from "./fsOperations.js";
import { writeFileSync_DEPRECATED } from "./slowOperations.js";
import { getTurn0Marks } from "./headlessProfiler.js";
import { logForDebugging } from "./debug.js";
import { getClaudeConfigDir } from "./envUtils.js";
import { logEvent } from "../services/analytics/index.js";

//@ chunk-eweqvj83.js:5658-5729 sole-consumer = DETAILED_PROFILING (0.771)
var PROFILE_STARTUP_ENV = env.CLAUDE_CODE_PROFILE_STARTUP,
  se = 0.005,
  z = Math.random() < se,
  P = PROFILE_STARTUP_ENV || z;
//@ chunk-eweqvj83.js:5729-5866 sole-consumer
class StartupProfilerState {
  memorySnapshots = [];
  startupContext = {};
  bootstrapEntry = "cli";
  onceMarked = new Set();
  reported = !1;
  lateReported = !1;
  firstEmitPhases = new Set();
}
//@ chunk-eweqvj83.js:5866-5890 sole-consumer
var startupProfilerSlot = new HostScoped(() => new StartupProfilerState());
//@ chunk-eweqvj83.js:5890-5917 affinity
function getProfilerState() {
  return onProcessRootHost(startupProfilerSlot);
}
/**
 * 启动阶段定义：每个阶段由两个打点名界定（import_time、init_time、settings、mcp…），用于 tengu_startup_perf。
 */
//@ chunk-eweqvj83.js:5917-8171 callgraph-fingerprint = PHASE_DEFINITIONS (0.213)
var PHASE_DEFINITIONS = {
    import_time: ["cli_entry", "main_tsx_imports_loaded"],
    main_imports: ["cli_before_main_import", "main_tsx_entry"],
    mdm_keychain_await: ["preAction_start", "preAction_after_mdm"],
    init_time: ["init_function_start", "init_function_end"],
    init_safe_env: ["init_configs_enabled", "init_safe_env_vars_applied"],
    init_network: ["init_after_remote_settings_check", "init_network_configured"],
    init_tail: ["init_network_configured", "init_function_end"],
    settings_time: ["eagerLoadSettings_start", "eagerLoadSettings_end"],
    tools_loaded: ["init_function_end", "action_tools_loaded"],
    preaction_tail: ["init_function_end", "action_handler_start"],
    action_prologue: ["action_handler_start", "action_after_input_prompt"],
    action_setup_span: ["action_after_input_prompt", "action_after_setup"],
    setup_uds_messaging: ["setup_uds_start", "setup_uds_end"],
    setup_uds_import: ["setup_uds_start", "setup_uds_imported"],
    setup_uds_dir: ["setup_uds_imported", "uds_inbox_dir_ready"],
    setup_uds_listen: ["uds_inbox_dir_ready", "uds_inbox_listening"],
    setup_uds_publish: ["uds_inbox_listening", "uds_inbox_key_published"],
    mcp_configs: ["action_tools_loaded", "action_mcp_configs_loaded"],
    plugins_init: ["action_mcp_configs_loaded", "action_after_plugins_init"],
    headless_setup: ["action_after_plugins_init", "before_validateForceLoginOrg"],
    force_login_org: ["before_validateForceLoginOrg", "before_connectMcp"],
    mcp_connect: ["before_connectMcp", "after_connectMcp_claudeai"],
    mcp_connect_user: ["before_mcp_connect_user", "after_mcp_connect_user"],
    mcp_connect_connector: ["before_mcp_connect_connector", "after_mcp_connect_connector"],
    growthbook_init: ["before_growthbook_init", "after_growthbook_init"],
    prewait: ["after_connectMcp_claudeai", "after_print_import"],
    sandbox_init: ["before_sandbox_init", "after_sandbox_init"],
    load_initial_messages: ["before_loadInitialMessages", "after_loadInitialMessages"],
    process_user_input: ["before_processUserInput", "after_processUserInput"],
    total_time: ["cli_entry", "main_after_run"],
  },
  FIRST_EMIT_PHASES = new Set([
    "total_time",
    "main_imports",
    "mdm_keychain_await",
    "init_safe_env",
    "init_network",
    "init_tail",
    "mcp_connect_user",
    "mcp_connect_connector",
    "growthbook_init",
    "preaction_tail",
    "action_prologue",
    "action_setup_span",
    "setup_uds_messaging",
    "setup_uds_import",
    "setup_uds_dir",
    "setup_uds_listen",
    "setup_uds_publish",
  ]);
//@ chunk-eweqvj83.js:8171-8203 fingerprint
if (P) profileCheckpoint("profiler_initialized");
//@ chunk-eweqvj83.js:8203-8274 layout
var profilerStartWallMs = P ? Date.now() : void 0,
  profilerStartUptimeMs = P ? Math.round(process.uptime() * 1000) : void 0;
/**
 * 附加启动上下文字段（随 tengu_startup_perf 上报）。
 */
//@ chunk-eweqvj83.js:8274-8338 facade-exports
function addStartupContext(e) {
  if (!P) return;
  Object.assign(getProfilerState().startupContext, e);
}
/**
 * 启动入口标识（默认 cli）。
 */
//@ chunk-eweqvj83.js:8338-8379 facade-exports
function getBootstrapEntry() {
  return getProfilerState().bootstrapEntry;
}
/**
 * profileCheckpoint(name)：启动性能打点（performance.mark），启用详细分析时记录内存。
 */
//@ chunk-eweqvj83.js:8379-8565 facade-exports
function profileCheckpoint(e, { once: once = !1 } = {}) {
  if ((emitStartupMark(e), !P)) return !1;
  let { onceMarked: onceMarked, memorySnapshots: memorySnapshots } = getProfilerState();
  if (once) {
    if (onceMarked.has(e)) return !1;
    onceMarked.add(e);
  }
  if ((getPerformance().mark(e), PROFILE_STARTUP_ENV)) memorySnapshots.push(process.memoryUsage());
  return !0;
}
//@ chunk-eweqvj83.js:8565-9065 fingerprint = getReport (0.962)
function getReport({ memorySnapshots: memorySnapshots }) {
  if (!PROFILE_STARTUP_ENV) return "Startup profiling not enabled";
  let marks = getPerformance().getEntriesByType("mark");
  if (marks.length === 0) return "No profiling checkpoints recorded";
  let lines = [];
  (lines.push("=".repeat(80)),
    lines.push("STARTUP PROFILING REPORT"),
    lines.push("=".repeat(80)),
    lines.push(""));
  let prevTime = 0;
  for (let [u, n] of marks.entries())
    (lines.push(formatTimelineLine(n.startTime, n.startTime - prevTime, n.name, memorySnapshots[u], 8, 7)),
      (prevTime = n.startTime));
  let at = marks.at(-1);
  return (
    lines.push(""),
    lines.push(`Total startup time: ${formatMs(at?.startTime ?? 0)}ms`),
    lines.push("=".repeat(80)),
    lines.join(`
`)
  );
}
/**
 * 输出启动性能报告（首次与延迟各一次）。
 */
//@ chunk-eweqvj83.js:9065-9199 facade-exports
function profileReport() {
  let e = getProfilerState();
  if (e.reported) {
    if (!e.lateReported) ((e.lateReported = !0), reportStartupPerf({ late: !0 }), profileReport_2(e));
    return;
  }
  ((e.reported = !0), reportStartupPerf({ late: !1 }), profileReport_2(e));
}
/**
 * profileReport：CLAUDE_CODE_PROFILE_STARTUP 时把报告写到 ~/.claude/startup-perf/<session>.txt/.json。
 */
//@ chunk-eweqvj83.js:9199-9585 fingerprint = profileReport (0.458)
function profileReport_2(e) {
  if (!PROFILE_STARTUP_ENV) return;
  let path = getStartupPerfLogPath(),
    dir = dirname(path);
  (getFsImplementation().mkdirSync(dir),
    writeFileSync_DEPRECATED(path, getReport(e), { encoding: "utf8", flush: !0 }));
  let entriesByType = getPerformance().getEntriesByType("mark");
  (writeFileSync_DEPRECATED(
    getStartupPerfJsonPath(),
    JSON.stringify(
      {
        metadata: logStartupPerf(e, { late: !1 }) ?? {},
        marks: entriesByType.map((u) => ({ name: u.name, startTime: u.startTime })),
        memory: e.memorySnapshots,
        nodeBootMs: profilerStartUptimeMs,
        headlessTurn0Marks: getTurn0Marks(),
      },
      null,
      2,
    ),
    { encoding: "utf8", flush: !0 },
  ),
    logForDebugging("Startup profiling report:"),
    logForDebugging(getReport(e)));
}
//@ chunk-eweqvj83.js:9585-9642 fingerprint = getStartupPerfLogPath (1)
function getStartupPerfLogPath() {
  return join(getClaudeConfigDir(), "startup-perf", `${getSessionId()}.txt`);
}
//@ chunk-eweqvj83.js:9642-9700 layout
function getStartupPerfJsonPath() {
  return join(getClaudeConfigDir(), "startup-perf", `${getSessionId()}.json`);
}
/**
 * logStartupPerf：按阶段计算耗时并上报。
 */
//@ chunk-eweqvj83.js:9700-10605 fingerprint = logStartupPerf (0.415)
function logStartupPerf(
  { firstEmitPhases: firstEmitPhases, startupContext: startupContext },
  { late: late },
) {
  let marks = getPerformance().getEntriesByType("mark");
  if (marks.length === 0) return null;
  let checkpointTimes = new Map();
  for (let mark of marks) checkpointTimes.set(mark.name, mark.startTime);
  let u = checkpointTimes.get("main_after_run"),
    metadata = {},
    T = 0,
    S = 0;
  for (let [f, [d, m]] of Object.entries(PHASE_DEFINITIONS)) {
    if (late && firstEmitPhases.has(f)) continue;
    let startTime = checkpointTimes.get(d),
      endTime = checkpointTimes.get(m);
    if (startTime !== void 0 && endTime !== void 0) {
      let rounded = Math.round(endTime - startTime);
      if (((metadata[`${f}_ms`] = rounded), T++, !late)) firstEmitPhases.add(f);
      if (!FIRST_EMIT_PHASES.has(f) && (u === void 0 || endTime <= u)) S += rounded;
    }
  }
  if (late) {
    if (T === 0) return null;
    metadata.late = !0;
  } else metadata.late = !1;
  let total_time_ms = metadata.total_time_ms;
  if (typeof total_time_ms === "number") metadata.gap_unaccounted_ms = Math.max(0, total_time_ms - S);
  ((metadata.free_mem_mb = Math.round(os.freemem() / 1048576)),
    (metadata.load_avg_1m = Math.round((os.loadavg()[0] ?? 0) * 100) / 100),
    (metadata.checkpoint_count = marks.length));
  let CLAUDE_CODE_REMOTE_SESSION_ID = env.CLAUDE_CODE_REMOTE_SESSION_ID;
  if (CLAUDE_CODE_REMOTE_SESSION_ID) metadata.ccr_session_id = ye(CLAUDE_CODE_REMOTE_SESSION_ID);
  if (profilerStartUptimeMs !== void 0) metadata.node_boot_ms = profilerStartUptimeMs;
  let h = spawnTimestampMs();
  if (h !== void 0 && profilerStartWallMs !== void 0)
    metadata.spawn_to_first_checkpoint_ms = Math.round(profilerStartWallMs - h);
  return (Object.assign(metadata, startupContext), metadata);
}
/**
 * 记录 tengu_startup_perf。
 */
//@ chunk-eweqvj83.js:10605-10722 affinity
function reportStartupPerf({ late: e } = { late: !1 }) {
  if (!z || isDisklessProcess()) return;
  let o = logStartupPerf(getProfilerState(), { late: e });
  if (o === null) return;
  logEvent("tengu_startup_perf", o);
}
//@ chunk-e6aww6q8.js:3788261-3788305 fingerprint = profileCheckpoint (0.723)
function profileCheckpoint_2() {
  return process.memoryUsage();
}

export { profileCheckpoint, profileReport, getBootstrapEntry, addStartupContext, profileCheckpoint_2 };
