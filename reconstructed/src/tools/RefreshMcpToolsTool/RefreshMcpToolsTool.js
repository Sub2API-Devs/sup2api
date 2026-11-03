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
import { ge } from "../../utils/identity.js";
import { Yi } from "../../commands/mobile/mobile.js";
import { markPollEventWiringForRun } from "../../bootstrap/state.js";
import { FILE_READ_TOOL_NAME } from "../FileReadTool/constants.js";
import { GLOB_TOOL_NAME } from "../GlobTool/prompt.js";
import { GREP_TOOL_NAME } from "../GrepTool/prompt.js";
import { BASH_TOOL_NAME } from "../BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../PowerShellTool/toolName.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "../NotebookEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../FileWriteTool/prompt.js";
import { FILE_EDIT_TOOL_NAME } from "../FileEditTool/constants.js";

//@ chunk-22r83hv0.js:28949-28964 placement
var MAIN = "main";
//@ chunk-22r83hv0.js:28964-29002 placement
var Mo = ge({ made: !1 }, (e) => {
  e.made = !1;
});
//@ chunk-22r83hv0.js:29002-29025 placement
function k1() {
  return !1;
}
//@ chunk-22r83hv0.js:29025-29067 placement
var ko = ge({ logged: !1 }, (e) => {
  e.logged = !1;
});
//@ chunk-22r83hv0.js:29067-29114 placement
function Jar() {
  return Yi().systemPromptSection;
}
//@ chunk-22r83hv0.js:29114-29138 placement
function lfi() {
  return !1;
}
//@ chunk-22r83hv0.js:29138-29163 placement
function dCt(e) {
  return {};
}
//@ chunk-22r83hv0.js:29163-29187 placement
function Qar() {
  return !1;
}
//@ chunk-22r83hv0.js:29187-29211 placement
function dfi() {
  return !1;
}
//@ chunk-22r83hv0.js:29211-29235 placement
function un(e) {
  return !1;
}
/**
 * 标记 print 模式下的轮询事件接线配置（流式输入、sdkUrl、是否只要自己的事件）。
 */
//@ chunk-22r83hv0.js:29235-29388 placement
function markPrintPollEventWiring(e) {
  markPollEventWiringForRun({
    entrypoint: "print",
    hasStreamingInput: e.hasStreamingInput,
    sdkUrl: e.sdkUrl,
    ownEventsRequested: un(e.permissionMode),
    ownEventsOnly: !1,
  });
}
//@ chunk-22r83hv0.js:29388-29413 placement
function kYe(e) {
  return !1;
}
//@ chunk-22r83hv0.js:29413-29437 placement
function TYt() {
  return !1;
}
//@ chunk-22r83hv0.js:29437-29461 placement
function TJ(e) {
  return e;
}
//@ chunk-22r83hv0.js:29461-29485 placement
function f4(e) {
  return !1;
}
//@ chunk-22r83hv0.js:29485-29510 placement
function Zar(e) {
  return !1;
}
//@ chunk-22r83hv0.js:29510-29535 placement
function ufi(e) {
  return !1;
}
//@ chunk-22r83hv0.js:29535-29562 placement
function DQo(e, n) {
  return e;
}
//@ chunk-22r83hv0.js:29562-29627 placement
var Uvn = new Set([
    FILE_READ_TOOL_NAME,
    GLOB_TOOL_NAME,
    GREP_TOOL_NAME,
    BASH_TOOL_NAME,
    POWERSHELL_TOOL_NAME,
    NOTEBOOK_EDIT_TOOL_NAME,
  ]),
  ffi = new Set([...Uvn, FILE_WRITE_TOOL_NAME, FILE_EDIT_TOOL_NAME]);
//@ chunk-22r83hv0.js:29627-29641 placement
var LQo = 30000;
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
/**
 * RefreshMcpTools 工具提示词：重新读取已连接 MCP 服务器的工具列表，返回每个服务器的状态、工具数与增删的工具名；不会建立或重建连接，可指定单个 server。
 */
//@ chunk-22r83hv0.js:30707-31290 placement
var REFRESH_MCP_TOOLS_PROMPT = `Re-query the tool lists of connected MCP servers and update the available tools.

Returns one entry per server: the server name, refresh status, current tool count, and which tool names were added or removed relative to what was previously available. Servers that are not currently connected are reported as not_connected (this tool never dials or re-dials connections \u2014 it only re-reads the tool list over the existing connection).

Parameters:
- server (optional): The name of a specific MCP server to refresh. If not provided, all connected servers are refreshed.
`;

export {
  DQo,
  k1,
  REFRESH_MCP_TOOLS_TOOL_NAME,
  Qar,
  ffi,
  Uvn,
  dCt,
  markPrintPollEventWiring,
  kYe,
  f4,
  TJ,
  TYt,
  dfi,
  MAIN,
  LQo,
  Zar,
  lfi,
  Jar,
  ufi,
  REFRESH_MCP_TOOLS_PROMPT_2,
  REFRESH_MCP_TOOLS_PROMPT,
};
