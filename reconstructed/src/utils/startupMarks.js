/**
 * utils/startupMarks.ts
 *
 * 2.1.316 新增：启动打点
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-eweqvj83.js (11)
 * attribution: placement 11
 */
import { fromSanitizer_SANITIZER_OUTPUT_ONLY, lit } from "../services/analytics/safeMetadata.js";
import { ge } from "./identity.js";
import { logForDebugging } from "./debug.js";

/**
 * 从 CCR_SPAWN_TIMESTAMP_MS 或 CLAUDE_CODE_SPAWN_TIMESTAMP_MS 读进程派生时间。
 */
//@ chunk-eweqvj83.js:627-839 placement
function spawnTimestampMs() {
  for (let e of [process.env.CCR_SPAWN_TIMESTAMP_MS, process.env.CLAUDE_CODE_SPAWN_TIMESTAMP_MS]) {
    if (e === void 0 || e.trim() === "") continue;
    let int = Number.parseInt(e, 10);
    if (Number.isFinite(int)) return int;
  }
  return;
}
//@ chunk-eweqvj83.js:881-978 placement
function ye(e) {
  if (e == null) return;
  return /^[A-Za-z0-9_-]{1,128}$/.test(e) ? fromSanitizer_SANITIZER_OUTPUT_ONLY(e) : lit("nonconforming");
}
//@ chunk-eweqvj83.js:978-1033 placement
function WQt(e) {
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(e.map((o) => ye(o)).join(","));
}
/**
 * 允许上报的启动打点名称。
 */
//@ chunk-eweqvj83.js:1033-1815 placement
var STARTUP_MARK_NAMES = [
    "init_after_graceful_shutdown",
    "init_network_configured",
    "preAction_after_init",
    "preAction_after_migrations",
    "preAction_after_remote_settings",
    "action_handler_start",
    "action_before_mcp_policy_wait",
    "action_before_permission_context",
    "action_after_input_prompt",
    "action_before_setup",
    "action_after_policy_limits_cold_await",
    "action_after_setup",
    "action_commands_loaded",
    "action_mcp_configs_loaded",
    "action_after_plugins_init",
    "before_validateForceLoginOrg",
    "before_connectMcp",
    "after_connectMcp_claudeai",
    "before_print_import",
    "after_print_import",
    "runHeadless_entry",
    "after_grove_check",
    "before_sandbox_init",
    "after_sandbox_init",
    "before_loadInitialMessages",
    "after_loadInitialMessages",
    "after_modelStrings",
    "before_runHeadlessStreaming",
    "stdin_listen_started",
  ],
  STARTUP_MARK_SET = new Set(STARTUP_MARK_NAMES);
//@ chunk-eweqvj83.js:1815-1845 placement
function N(e) {
  return STARTUP_MARK_SET.has(e);
}
//@ chunk-eweqvj83.js:1845-1868 placement
var STARTUP_MARK = "startup_mark";
//@ chunk-eweqvj83.js:1868-1879 placement
var OMi = 64;
/**
 * 启动打点上报状态（写函数、是否结束、已写打点）。
 */
//@ chunk-eweqvj83.js:1879-1988 placement
var startupMarkReporter = ge({ writeLine: void 0, ended: !1, written: new Set() }, (e) => {
  ((e.writeLine = void 0), (e.ended = !1), e.written.clear());
});
//@ chunk-eweqvj83.js:1988-2058 placement
function MMi(e) {
  if (startupMarkReporter.ended || startupMarkReporter.writeLine !== void 0) return;
  startupMarkReporter.writeLine = e;
}
/**
 * 以 keep_alive 行上报一个启动打点（每个只一次，写失败时结束上报）。
 */
//@ chunk-eweqvj83.js:2058-2379 placement
function emitStartupMark(e) {
  if (startupMarkReporter.writeLine === void 0) return;
  if (!N(e) || startupMarkReporter.written.has(e)) return;
  startupMarkReporter.written.add(e);
  try {
    startupMarkReporter.writeLine(`{"type":"keep_alive","${STARTUP_MARK}":"${e}"}
`);
  } catch (error) {
    (c_s(),
      logForDebugging(
        `The start-up mark report ended, because its writer threw: ${error instanceof Error && typeof error.message === "string" ? error.message : typeof error}`,
        { level: "error" },
      ));
  }
}
//@ chunk-eweqvj83.js:2379-2424 placement
function c_s() {
  ((startupMarkReporter.writeLine = void 0), (startupMarkReporter.ended = !0));
}

export { ye, WQt, MMi, c_s, emitStartupMark, spawnTimestampMs, STARTUP_MARK, OMi };
