/**
 * tools/RefreshMcpToolsTool/RefreshMcpToolsTool.ts
 *
 * 刷新 MCP 工具列表的工具（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-22r83hv0.js (24)
 * attribution: placement 24
 */
import { identity } from "../../utils/identity.js";
import { claudeInChromeSession } from "../../commands/mobile/mobile.js";
import { markPollEventWiringForRun } from "../../bootstrap/state.js";
import { FILE_READ_TOOL_NAME } from "../FileReadTool/constants.js";
import { GLOB_TOOL_NAME } from "../GlobTool/prompt.js";
import { GREP_TOOL_NAME } from "../GrepTool/prompt.js";
import { BASH_TOOL_NAME } from "../BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../PowerShellTool/toolName.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "../NotebookEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../FileWriteTool/prompt.js";
import { FILE_EDIT_TOOL_NAME } from "../FileEditTool/constants.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-22r83hv0.js:28949-28964 placement
var MAIN = "main";
//@ chunk-22r83hv0.js:28964-29002 placement
/**
 * 记录 print 模式轮询接线是否已创建（当前无引用）。
 */
var printPollWiringMadeState; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-22r83hv0.js:28964", () => {
  printPollWiringMadeState = identity(
    {
      made: false,
    },
    (state) => {
      state.made = false;
    },
  );
});
//@ chunk-22r83hv0.js:29002-29025 placement
/**
 * 恒返回 false 的能力开关。
 */
function alwaysFalseFlag() {
  return false;
}
//@ chunk-22r83hv0.js:29025-29067 placement
/**
 * 记录 print 轮询接线是否已记录（当前无引用）。
 */
var printPollWiringLoggedState; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-22r83hv0.js:29025", () => {
  printPollWiringLoggedState = identity(
    {
      logged: false,
    },
    (state) => {
      state.logged = false;
    },
  );
});
//@ chunk-22r83hv0.js:29067-29114 placement
/**
 * 取出当前会话里系统提示段的记录。
 */
function getSystemPromptSectionState() {
  return claudeInChromeSession().systemPromptSection;
}
//@ chunk-22r83hv0.js:29114-29138 placement
/**
 * 恒返回 false 的能力开关。
 */
function alwaysFalseLocal() {
  return false;
}
//@ chunk-22r83hv0.js:29138-29163 placement
/**
 * 恒返回空对象的占位实现。
 */
function emptyObjectFactory(runsLocalQueryLoop) {
  return {};
}
//@ chunk-22r83hv0.js:29163-29187 placement
/**
 * 恒返回 false 的能力开关。
 */
function alwaysFalseTool() {
  return false;
}
//@ chunk-22r83hv0.js:29187-29211 placement
/**
 * 恒返回 false 的能力开关。
 */
function alwaysFalseGateway() {
  return false;
}
//@ chunk-22r83hv0.js:29211-29235 placement
/**
 * 恒返回 false 的 print 模式判断（是否只请求自己的事件）。
 */
function alwaysFalsePrintMode(permissionMode) {
  return false;
}
//@ chunk-22r83hv0.js:29235-29388 placement
/**
 * 标记 print 模式下的轮询事件接线配置（流式输入、sdkUrl、是否只要自己的事件）。
 */
function markPrintPollEventWiring(options) {
  markPollEventWiringForRun({
    entrypoint: "print",
    hasStreamingInput: options.hasStreamingInput,
    sdkUrl: options.sdkUrl,
    ownEventsRequested: alwaysFalsePrintMode(options.permissionMode),
    ownEventsOnly: false,
  });
}
//@ chunk-22r83hv0.js:29388-29413 placement
/**
 * 恒返回 false 的能力开关。
 */
function alwaysFalseRefresh(mode) {
  return false;
}
//@ chunk-22r83hv0.js:29413-29437 placement
/**
 * 恒返回 false 的能力开关。
 */
function alwaysFalseDefer() {
  return false;
}
//@ chunk-22r83hv0.js:29437-29461 placement
/**
 * 原样返回输入。
 */
function identityValue(value) {
  return value;
}
//@ chunk-22r83hv0.js:29461-29485 placement
/**
 * 恒返回 false 的能力开关。
 */
function alwaysFalseFeed(e) {
  return false;
}
//@ chunk-22r83hv0.js:29485-29510 placement
/**
 * 恒返回 false 的能力开关。
 */
function alwaysFalseStream(unusedArg) {
  return false;
}
//@ chunk-22r83hv0.js:29510-29535 placement
/**
 * 恒返回 false 的能力开关。
 */
function alwaysFalseEvent(unusedArg) {
  return false;
}
//@ chunk-22r83hv0.js:29535-29562 placement
/**
 * 原样返回输入。
 */
function identityTool(memoryPrompt, unusedValue) {
  return memoryPrompt;
}
//@ chunk-22r83hv0.js:29562-29627 placement
/**
 * 只读工具名集合（Read/Glob/Grep/Bash/PowerShell/NotebookEdit）。
 */
var READ_ONLY_TOOL_NAMES; // deferred: uses GREP_TOOL_NAME (../GrepTool/prompt.js) of its import cycle while loading; runs once the cycle is complete
var FILE_MUTATING_TOOL_NAMES;
deferInit("chunk-22r83hv0.js:29562", () => {
  READ_ONLY_TOOL_NAMES = new Set([
    FILE_READ_TOOL_NAME,
    GLOB_TOOL_NAME,
    GREP_TOOL_NAME,
    BASH_TOOL_NAME,
    POWERSHELL_TOOL_NAME,
    NOTEBOOK_EDIT_TOOL_NAME,
  ]);
  FILE_MUTATING_TOOL_NAMES = new Set([...READ_ONLY_TOOL_NAMES, FILE_WRITE_TOOL_NAME, FILE_EDIT_TOOL_NAME]);
});
//@ chunk-22r83hv0.js:29627-29641 placement
/**
 * print 模式轮询的宽限时间（30 秒）。
 */
var PRINT_POLL_GRACE_MS = 30000;
//@ chunk-22r83hv0.js:29641-29666 placement
var REFRESH_MCP_TOOLS_TOOL_NAME = "RefreshMcpTools";
//@ chunk-22r83hv0.js:29666-29778 placement
function REFRESHED_TOOLS_NOTE() {
  return "The refreshed tools are available immediately \u2014 you can call them on your next step.";
}
//@ chunk-22r83hv0.js:29778-30707 placement
function REFRESH_MCP_TOOLS_PROMPT_2() {
  return `Re-queries the tool list of connected MCP servers and updates the set of available tools, reporting which tools were added or removed.

MCP servers normally push a notification when their tool list changes, but that notification can be missed (connection hiccups, a device announcing while the notification stream was down). Use this tool to re-sync when the available tools may be out of date. Good triggers:
- The user says a device or app is now open or connected (e.g. "my desktop IS open", "I just started the app") after a tool call failed with device-not-connected or the expected tools are missing.
- A tool you expect an MCP server to provide is absent from your available tools.
- A server's tools look stale after its connection recovered.

${REFRESHED_TOOLS_NOTE()}

Usage:
- Refresh all connected servers: \`RefreshMcpTools\` with no arguments
- Refresh one server: \`RefreshMcpTools({ server: "myserver" })\`
`;
}
//@ chunk-22r83hv0.js:30707-31290 placement
/**
 * RefreshMcpTools 工具提示词：重新读取已连接 MCP 服务器的工具列表，返回每个服务器的状态、工具数与增删的工具名；不会建立或重建连接，可指定单个 server。
 */
var REFRESH_MCP_TOOLS_PROMPT = `Re-query the tool lists of connected MCP servers and update the available tools.

Returns one entry per server: the server name, refresh status, current tool count, and which tool names were added or removed relative to what was previously available. Servers that are not currently connected are reported as not_connected (this tool never dials or re-dials connections \u2014 it only re-reads the tool list over the existing connection).

Parameters:
- server (optional): The name of a specific MCP server to refresh. If not provided, all connected servers are refreshed.
`;
export {
  identityTool,
  alwaysFalseFlag,
  REFRESH_MCP_TOOLS_TOOL_NAME,
  alwaysFalseTool,
  FILE_MUTATING_TOOL_NAMES,
  READ_ONLY_TOOL_NAMES,
  emptyObjectFactory,
  markPrintPollEventWiring,
  alwaysFalseRefresh,
  alwaysFalseFeed,
  identityValue,
  alwaysFalseDefer,
  alwaysFalseGateway,
  MAIN,
  PRINT_POLL_GRACE_MS,
  alwaysFalseStream,
  alwaysFalseLocal,
  getSystemPromptSectionState,
  alwaysFalseEvent,
  REFRESH_MCP_TOOLS_PROMPT_2,
  REFRESH_MCP_TOOLS_PROMPT,
};
