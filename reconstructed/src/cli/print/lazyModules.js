/**
 * cli/print/lazyModules.ts
 *
 * 2.1.316 新增：print 模式的懒加载模块表与 MCP 调用结果大小限制
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (12)
 * attribution: placement 12
 */
import { isMainAgentCommand } from "../../utils/messageQueueManager.js";
import { env } from "../../utils/env.js";
import { MAX_MCP_RESOURCE_JSON_CHARS } from "./mcpControlRequests.js";
import { jsonStringify } from "../../utils/slowOperations.js";

//@ chunk-tyg7f3ek.js:622484-622802 placement
/**
 * 按需 require 的打印侧模块句柄：会话导出、分类器摘要、协调者模式、收件箱指针、cron 调度/抖动/工具、自治循环；另有 MCP 调用结果过大文案与打印阶段计时参数。
 */
var lazyPrintModules = () => require("./chunk-2wrddneh.js");
var lazyConversationExporter = () => require("./chunk-kr06rpgd.js");
var lazyPostTurnSummary = require("./chunk-e321p3vc.js");
var lazyCoordinatorMode = require("./chunk-yxywkh50.js");
var lazySessionInboxPointers = require("./chunk-dm6d31md.js");
var lazyCronScheduler = require("./chunk-68szcwjr.js");
var lazyCronJitterConfig = require("./chunk-n7djsch1.js");
var lazyCronTools = require("./chunk-xd621t7b.js");
var lazyAutonomousLoop = require("./chunk-w6rm7nhv.js");
//@ chunk-tyg7f3ek.js:622802-622942 placement
var lazyPrintModules2 = require("./chunk-aghtagt4.js");
var lazyTeleportRelayMarker = require("./chunk-qwf564hq.js");
var lazyTeleportRelayEnv = require("./chunk-1d5behve.js");
var lazyHandoffMarkerRelay = require("./chunk-z6qazjbc.js");
//@ chunk-tyg7f3ek.js:622942-622994 placement
function mcpModuleFacade() {
  return require("./chunk-asne9cp8.js");
}
//@ chunk-tyg7f3ek.js:622994-623038 placement
function getMcpClientModule() {
  return mcpModuleFacade().mcpClientModule();
}
//@ chunk-tyg7f3ek.js:623038-623080 placement
function getMcpAuthModule() {
  return mcpModuleFacade().mcpAuthModule();
}
//@ chunk-tyg7f3ek.js:623080-623140 placement
function getMcpErrorClassificationModule() {
  return mcpModuleFacade().mcpSdkErrorClassificationModule();
}
//@ chunk-tyg7f3ek.js:623140-623716 placement
var TEAM_SHUTDOWN_REMINDER = `<system-reminder>
You are running in non-interactive mode and cannot return a response to the user until your team is shut down.

You MUST shut down your team before preparing your final response:
1. Use requestShutdown to ask each team member to shut down gracefully
2. Wait for shutdown approvals
3. Use the cleanup operation to clean up the team
4. Only then provide your final response to the user

The user cannot receive your response until the team is completely shut down.
</system-reminder>

Shut down your team and prepare your final response for the user.`;
//@ chunk-tyg7f3ek.js:623716-623758 placement
function isTeamShutdownReminder(e) {
  return isMainAgentCommand(e) && e.value === TEAM_SHUTDOWN_REMINDER;
}
//@ chunk-tyg7f3ek.js:623758-623828 placement
function teamTeardownParkTimeoutMs() {
  return env.CLAUDE_CODE_TEAM_TEARDOWN_PARK_TIMEOUT_MS ?? 1e4;
}
//@ chunk-tyg7f3ek.js:623828-624102 placement
var MCP_CALL_RESULT_LIMITS = 30000;
var MCP_CALL_RESULT_TOO_LARGE_TEXT = `The tool ran, but its result is over the ${MAX_MCP_RESOURCE_JSON_CHARS}-character limit of an mcp_call sent with result_not_for_model, so this mcp_call got no result. Check whether the call took effect before retrying mcp_call, and ask the tool for a smaller result if you retry.`;
//@ chunk-tyg7f3ek.js:624102-624178 placement
function isMcpCallResultTooLarge(e) {
  return jsonStringify([e.content, e.structuredContent, e._meta]).length > MAX_MCP_RESOURCE_JSON_CHARS;
}
//@ chunk-tyg7f3ek.js:624178-624262 placement
var PRINT_TIMING_CONSTANTS = 5;
var PRINT_TURN_FLUSH_DELAY_MS = 2000;
var TENGU_ANCHORED_LANTERN = "tengu_anchored_lantern";
var PRINT_TURN_RETRY_MS = 2000;
var PRINT_TURN_WAIT_MS = 20000;
var PRINT_TURN_TIMEOUT_MS = 30000;
var PRINT_TURN_POLL_MS = 5000;
var PRINT_TURN_MAX_ATTEMPTS = 4;
export {
  lazyTeleportRelayEnv,
  lazyPostTurnSummary,
  PRINT_TURN_FLUSH_DELAY_MS,
  PRINT_TURN_WAIT_MS,
  lazyPrintModules2,
  lazyCronTools,
  lazySessionInboxPointers,
  getMcpClientModule,
  lazyHandoffMarkerRelay,
  MCP_CALL_RESULT_LIMITS,
  PRINT_TURN_POLL_MS,
  TEAM_SHUTDOWN_REMINDER,
  teamTeardownParkTimeoutMs,
  isTeamShutdownReminder,
  lazyAutonomousLoop,
  lazyCronScheduler,
  lazyCronJitterConfig,
  PRINT_TURN_MAX_ATTEMPTS,
  PRINT_TURN_TIMEOUT_MS,
  lazyPrintModules,
  lazyConversationExporter,
  isMcpCallResultTooLarge,
  MCP_CALL_RESULT_TOO_LARGE_TEXT,
  getMcpErrorClassificationModule,
  getMcpAuthModule,
  PRINT_TIMING_CONSTANTS,
  PRINT_TURN_RETRY_MS,
  TENGU_ANCHORED_LANTERN,
  lazyCoordinatorMode,
  lazyTeleportRelayMarker,
};
