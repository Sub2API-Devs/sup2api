/**
 * cli/print/lazyModules.ts
 *
 * 2.1.316 新增：print 模式的懒加载模块表与 MCP 调用结果大小限制
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0yw3taqg.js (12)
 * attribution: placement 11, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isMainAgentCommand } from "../../utils/messageQueueManager.js";
import { env } from "../../utils/env.js";
import { MAX_MCP_RESOURCE_JSON_CHARS } from "./mcpControlRequests.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-0yw3taqg.js:664593-664911 placement
/**
 * 按需 require 的打印侧模块句柄：会话导出、分类器摘要、协调者模式、收件箱指针、cron 调度/抖动/工具、自治循环；另有 MCP 调用结果过大文案与打印阶段计时参数。
 */
var lazyPrintModules; // deferred: loads other modules while loading; runs once its import cycle is complete
var lazyConversationExporter;
var lazyPostTurnSummary;
var lazyCoordinatorMode;
var lazySessionInboxPointers;
var lazyCronScheduler;
var lazyCronJitterConfig;
var lazyCronTools;
var lazyAutonomousLoop;
deferInit("chunk-0yw3taqg.js:664593", () => {
  lazyPrintModules = () => require("../../utils/status.js");
  lazyConversationExporter = () => require("../../commands/export/exportConversation.lazy.js");
  lazyPostTurnSummary = require("../../services/classifierSummary.js");
  lazyCoordinatorMode = require("../../coordinator/coordinatorMode.js");
  lazySessionInboxPointers = require("../../bridge/sessionInboxPointers.js");
  lazyCronScheduler = require("../../utils/cronScheduler.js");
  lazyCronJitterConfig = require("../../utils/cronJitterConfig.js");
  lazyCronTools = require("../../tools/ScheduleCronTool/prompt.js");
  lazyAutonomousLoop = require("../../utils/loop/LOOP_FILE_DYNAMIC_SENTINEL.lazy.js");
});
//@ chunk-0yw3taqg.js:664911-665051 placement
var lazyPrintModules2; // deferred: loads other modules while loading; runs once its import cycle is complete
var lazyTeleportRelayMarker;
var lazyTeleportRelayEnv;
var lazyHandoffMarkerRelay;
deferInit("chunk-0yw3taqg.js:664911", () => {
  lazyPrintModules2 = require("../../services/extractMemories/extractMemories.js");
  lazyTeleportRelayMarker = require("../../services/teleport/armRelay.js");
  lazyTeleportRelayEnv = require("../../utils/teleport/relayEnv.js");
  lazyHandoffMarkerRelay = require("../../utils/teleport/handoffRelay.js");
});
//@ chunk-0yw3taqg.js:665051-665103 placement
function mcpModuleFacade() {
  return require("../../services/mcp/emitTripwireEvent.lazy.js");
}
//@ chunk-0yw3taqg.js:665103-665147 placement
function getMcpClientModule() {
  return mcpModuleFacade().mcpClientModule();
}
//@ chunk-0yw3taqg.js:665147-665189 placement
function getMcpAuthModule() {
  return mcpModuleFacade().mcpAuthModule();
}
//@ chunk-0yw3taqg.js:665189-665249 placement
function getMcpErrorClassificationModule() {
  return mcpModuleFacade().mcpSdkErrorClassificationModule();
}
//@ chunk-0yw3taqg.js:665249-665825 placement
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
//@ chunk-0yw3taqg.js:665825-665867 placement
function isTeamShutdownReminder(command) {
  return isMainAgentCommand(command) && command.value === TEAM_SHUTDOWN_REMINDER;
}
//@ chunk-0yw3taqg.js:665867-665937 placement
function teamTeardownParkTimeoutMs() {
  return env.CLAUDE_CODE_TEAM_TEARDOWN_PARK_TIMEOUT_MS ?? 1e4;
}
//@ chunk-0yw3taqg.js:665937-666211 layout
var PRINT_TURN_TIMEOUT_MS = 30000;
var MCP_CALL_RESULT_TOO_LARGE_TEXT = `The tool ran, but its result is over the ${MAX_MCP_RESOURCE_JSON_CHARS}-character limit of an mcp_call sent with result_not_for_model, so this mcp_call got no result. Check whether the call took effect before retrying mcp_call, and ask the tool for a smaller result if you retry.`;
//@ chunk-0yw3taqg.js:666211-666287 placement
function isMcpCallResultTooLarge(result) {
  return (
    jsonStringify([result.content, result.structuredContent, result._meta]).length >
    MAX_MCP_RESOURCE_JSON_CHARS
  );
}
//@ chunk-0yw3taqg.js:666287-666371 placement
var PRINT_TIMING_CONSTANTS = 5;
var PRINT_TURN_FLUSH_DELAY_MS = 2000;
var TENGU_ANCHORED_LANTERN = "tengu_anchored_lantern";
var PRINT_TURN_RETRY_MS = 2000;
var PRINT_TURN_WAIT_MS = 20000;
var CLAIM_SESSION_QUEUE_DELAY_MS = 30000;
var ELICIT_WAIT_RETRY_MS = 5000;
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
  PRINT_TURN_TIMEOUT_MS,
  ELICIT_WAIT_RETRY_MS,
  TEAM_SHUTDOWN_REMINDER,
  teamTeardownParkTimeoutMs,
  isTeamShutdownReminder,
  lazyAutonomousLoop,
  lazyCronScheduler,
  lazyCronJitterConfig,
  PRINT_TURN_MAX_ATTEMPTS,
  CLAIM_SESSION_QUEUE_DELAY_MS,
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
