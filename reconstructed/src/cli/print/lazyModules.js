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
import { $f } from "../../utils/messageQueueManager.js";
import { env } from "../../utils/env.js";
import { VNn } from "./mcpControlRequests.js";
import { jsonStringify } from "../../utils/slowOperations.js";

//@ chunk-tyg7f3ek.js:622484-622802 placement
var lazyPrintModules = () => require("./chunk-2wrddneh.js"),
  gz = () => require("./chunk-kr06rpgd.js"),
  Wx = require("./chunk-e321p3vc.js"),
  bl = require("./chunk-yxywkh50.js"),
  Qs = require("./chunk-dm6d31md.js"),
  rg = require("./chunk-68szcwjr.js"),
  sU = require("./chunk-n7djsch1.js"),
  ic = require("./chunk-xd621t7b.js"),
  sg = require("./chunk-w6rm7nhv.js");
//@ chunk-tyg7f3ek.js:622802-622942 placement
var lazyPrintModules2 = require("./chunk-aghtagt4.js"),
  sc = require("./chunk-qwf564hq.js"),
  Zk = require("./chunk-1d5behve.js"),
  qx = require("./chunk-z6qazjbc.js");
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
  return $f(e) && e.value === TEAM_SHUTDOWN_REMINDER;
}
//@ chunk-tyg7f3ek.js:623758-623828 placement
function teamTeardownParkTimeoutMs() {
  return env.CLAUDE_CODE_TEAM_TEARDOWN_PARK_TIMEOUT_MS ?? 1e4;
}
//@ chunk-tyg7f3ek.js:623828-624102 placement
var MCP_CALL_RESULT_LIMITS = 30000,
  Kx = `The tool ran, but its result is over the ${VNn}-character limit of an mcp_call sent with result_not_for_model, so this mcp_call got no result. Check whether the call took effect before retrying mcp_call, and ask the tool for a smaller result if you retry.`;
//@ chunk-tyg7f3ek.js:624102-624178 placement
function isMcpCallResultTooLarge(e) {
  return jsonStringify([e.content, e.structuredContent, e._meta]).length > VNn;
}
//@ chunk-tyg7f3ek.js:624178-624262 placement
var PRINT_TIMING_CONSTANTS = 5,
  fa = 2000,
  TENGU_ANCHORED_LANTERN = "tengu_anchored_lantern",
  kz = 2000,
  Gx = 20000,
  zx = 30000,
  wz = 5000,
  vz = 4;

export {
  Zk,
  Wx,
  fa,
  Gx,
  lazyPrintModules2,
  ic,
  Qs,
  getMcpClientModule,
  qx,
  MCP_CALL_RESULT_LIMITS,
  wz,
  TEAM_SHUTDOWN_REMINDER,
  teamTeardownParkTimeoutMs,
  isTeamShutdownReminder,
  sg,
  rg,
  sU,
  vz,
  zx,
  lazyPrintModules,
  gz,
  isMcpCallResultTooLarge,
  Kx,
  getMcpErrorClassificationModule,
  getMcpAuthModule,
  PRINT_TIMING_CONSTANTS,
  kz,
  TENGU_ANCHORED_LANTERN,
  bl,
  sc,
};
