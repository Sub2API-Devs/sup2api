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
import { identity } from "./identity.js";
import { logForDebugging } from "./debug.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-eweqvj83.js:627-839 placement
/**
 * 从 CCR_SPAWN_TIMESTAMP_MS 或 CLAUDE_CODE_SPAWN_TIMESTAMP_MS 读进程派生时间。
 */
function spawnTimestampMs() {
  for (let raw of [process.env.CCR_SPAWN_TIMESTAMP_MS, process.env.CLAUDE_CODE_SPAWN_TIMESTAMP_MS]) {
    if (raw === undefined || raw.trim() === "") continue;
    let parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return;
}
//@ chunk-eweqvj83.js:881-978 placement
/**
 * 校验单个启动打点名，不合规记作 nonconforming。
 */
function sanitizeMarkName(name) {
  if (name == null) return;
  return /^[A-Za-z0-9_-]{1,128}$/.test(name)
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(name)
    : lit("nonconforming");
}
//@ chunk-eweqvj83.js:978-1033 placement
/**
 * 把一组打点名消毒后用逗号连接。
 */
function joinSanitizedMarkNames(names) {
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(names.map((name) => sanitizeMarkName(name)).join(","));
}
//@ chunk-eweqvj83.js:1033-1815 placement
/**
 * 允许上报的启动打点名称。
 */
var STARTUP_MARK_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var STARTUP_MARK_SET;
deferInit("chunk-eweqvj83.js:1033", () => {
  STARTUP_MARK_NAMES = [
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
  ];
  STARTUP_MARK_SET = new Set(STARTUP_MARK_NAMES);
});
//@ chunk-eweqvj83.js:1815-1845 placement
function isValidStartupMark(mark) {
  return STARTUP_MARK_SET.has(mark);
}
//@ chunk-eweqvj83.js:1845-1868 placement
var STARTUP_MARK = "startup_mark";
//@ chunk-eweqvj83.js:1868-1879 placement
/**
 * 启动打点名最大长度（64）。
 */
var MAX_MARK_NAME_CHARS = 64;
//@ chunk-eweqvj83.js:1879-1988 placement
/**
 * 启动打点上报状态（写函数、是否结束、已写打点）。
 */
var startupMarkReporter; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-eweqvj83.js:1879", () => {
  startupMarkReporter = identity(
    {
      writeLine: undefined,
      ended: false,
      written: new Set(),
    },
    (reportState) => {
      reportState.writeLine = undefined;
      reportState.ended = false;
      reportState.written.clear();
    },
  );
});
//@ chunk-eweqvj83.js:1988-2058 placement
/**
 * 启动打点只接受一次写函数。
 */
function setStartupMarkWriter(writeLine) {
  if (startupMarkReporter.ended || startupMarkReporter.writeLine !== undefined) return;
  startupMarkReporter.writeLine = writeLine;
}
//@ chunk-eweqvj83.js:2058-2379 placement
/**
 * 以 keep_alive 行上报一个启动打点（每个只一次，写失败时结束上报）。
 */
function emitStartupMark(mark) {
  if (startupMarkReporter.writeLine === undefined) return;
  if (!isValidStartupMark(mark) || startupMarkReporter.written.has(mark)) return;
  startupMarkReporter.written.add(mark);
  try {
    startupMarkReporter.writeLine(`{"type":"keep_alive","${STARTUP_MARK}":"${mark}"}
`);
  } catch (error) {
    endStartupMarkReporting();
    logForDebugging(
      `The start-up mark report ended, because its writer threw: ${error instanceof Error && typeof error.message === "string" ? error.message : typeof error}`,
      {
        level: "error",
      },
    );
  }
}
//@ chunk-eweqvj83.js:2379-2424 placement
/**
 * 结束启动打点上报。
 */
function endStartupMarkReporting() {
  startupMarkReporter.writeLine = undefined;
  startupMarkReporter.ended = true;
}
export {
  sanitizeMarkName,
  joinSanitizedMarkNames,
  setStartupMarkWriter,
  endStartupMarkReporting,
  emitStartupMark,
  spawnTimestampMs,
  STARTUP_MARK,
  MAX_MARK_NAME_CHARS,
};
