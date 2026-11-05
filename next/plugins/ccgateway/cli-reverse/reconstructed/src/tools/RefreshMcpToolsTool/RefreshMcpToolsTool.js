/**
 * tools/RefreshMcpToolsTool/RefreshMcpToolsTool.ts
 *
 * 刷新 MCP 工具列表的工具（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-8nzbdydx.js (20), chunk-pfdb6yeg.js (4)
 * attribution: placement 24, layout 1
 */
import { codeModeAccepted, isAccepted } from "../../utils/codeMode/accepted.js";
import { alwaysTrue } from "../../utils/slowOperations.js";
import {
  doesEngineCheckAllowCodeMode,
  isThinClient,
  pinnedCodeMode,
  isReplOn,
  sandboxHostListsBlockCodeMode,
  codeModeHidesToolNamesFromApi,
  offInCodeModeNoteForModel,
  printPollWiringMadeState,
  isCountedForContext,
} from "../../utils/codeMode.js";
import { identity } from "../../utils/identity.js";
import { claudeInChromeSession } from "../../commands/mobile/mobile.js";
import { logError } from "../../utils/log.js";
import { getForesightState } from "../../utils/foresightStatus.js";
import { fromEnumOpt } from "../../services/analytics/safeMetadata.js";
import { isPollEventIngressActive } from "../../utils/pollEvents.js";
import { markPollEventWiringForRun } from "../../bootstrap/state.js";
import { matchesToolName } from "../../Tool.js";
import { REPL_TOOL_NAME } from "../REPLTool/constants.js";
import { READ } from "../FileReadTool/constants.js";
import { GLOB_TOOL_NAME } from "../GlobTool/prompt.js";
import { GREP_TOOL_NAME } from "../GrepTool/prompt.js";
import { BASH_TOOL_NAME } from "../BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../PowerShellTool/toolName.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "../NotebookEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../FileWriteTool/prompt.js";
import { EDIT } from "../FileEditTool/constants.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-8nzbdydx.js:58140-58154 placement
var REPL_MAIN_THREAD_KEY = "main";
//@ chunk-8nzbdydx.js:58720-58873 placement
/**
 * 恒返回 false 的能力开关。
 */
function isCodeModeEnabled() {
  if (codeModeAccepted()) {
    if (!alwaysTrue() || !isCodeModeAvailable()) return false;
    let { isEngineCheckDone } = require("../../utils/bunEngineProbe.js");
    let engineCheckDone = isEngineCheckDone();
    if (!doesEngineCheckAllowCodeMode()) return false;
    return engineCheckDone || isCodeModeAvailable();
  }
  return false;
}
//@ chunk-8nzbdydx.js:58873-58926 layout
function isCodeModeAvailable() {
  return (
    codeModeAccepted() &&
    !isThinClient() &&
    (pinnedCodeMode ?? isReplOn()) &&
    !sandboxHostListsBlockCodeMode()
  );
}
//@ chunk-8nzbdydx.js:58926-58968 placement
/**
 * 记录 print 轮询接线是否已记录（当前无引用）。
 */
var printPollWiringLoggedState; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-8nzbdydx.js:58926", () => {
  printPollWiringLoggedState = identity(
    {
      logged: false,
    },
    (state) => {
      state.logged = false;
    },
  );
});
//@ chunk-8nzbdydx.js:61433-61543 placement
/**
 * 取出当前会话里系统提示段的记录。
 */
function chromeSectionForWire() {
  let systemPromptSection = claudeInChromeSession().systemPromptSection;
  if (codeModeAccepted() && systemPromptSection !== "")
    try {
      if (codeModeHidesToolNamesFromApi()) return offInCodeModeNoteForModel();
    } catch (error) {
      logError(error);
    }
  return systemPromptSection;
}
//@ chunk-8nzbdydx.js:61605-61648 placement
/**
 * 恒返回 false 的能力开关。
 */
function hasCodeModeBeenUsed() {
  return codeModeAccepted() && (printPollWiringMadeState.made || isCodeModeEnabled());
}
//@ chunk-8nzbdydx.js:61648-61984 placement
/**
 * 恒返回空对象的占位实现。
 */
function codeModeTelemetryFields(runsLocalQueryLoop) {
  {
    let replModeDecision = getForesightState();
    if (replModeDecision.state === "not_asked")
      return replModeDecision.turnedOffIn === "shell" || replModeDecision.turnedOffIn === "settings"
        ? {
            repl_mode_decision: fromEnumOpt(`opt_in_off_${replModeDecision.turnedOffIn}`),
          }
        : {};
    return {
      ...(runsLocalQueryLoop !== false &&
        isCodeModeEnabled() && {
          is_repl_mode: true,
        }),
      repl_mode_decision: fromEnumOpt(
        replModeDecision.state === "on"
          ? `opt_in_${replModeDecision.source === "shell" ? "shell" : "settings"}`
          : `opt_in_refused_${replModeDecision.why}`,
      ),
    };
  }
  return {};
}
//@ chunk-8nzbdydx.js:62571-62603 placement
/**
 * 恒返回 false 的能力开关。
 */
function isCodeModeExperimentEnabled() {
  return codeModeAccepted() && isCodeModeEnabled();
}
//@ chunk-8nzbdydx.js:62603-62641 placement
/**
 * 恒返回 false 的能力开关。
 */
function isAsyncReplEnabled() {
  return codeModeAccepted() && isCodeModeExperimentEnabled() && isPollEventIngressActive();
}
//@ chunk-8nzbdydx.js:62641-62682 placement
/**
 * 恒返回 false 的 print 模式判断（是否只请求自己的事件）。
 */
function isAsyncReplRequested(request) {
  return codeModeAccepted() && isAsyncLaneMode(request) && isCodeModeExperimentEnabled();
}
//@ chunk-8nzbdydx.js:62682-62836 placement
/**
 * 标记 print 模式下的轮询事件接线配置（流式输入、sdkUrl、是否只要自己的事件）。
 */
function markPollEventWiringForPrintRun(options) {
  markPollEventWiringForRun({
    entrypoint: "print",
    hasStreamingInput: options.hasStreamingInput,
    sdkUrl: options.sdkUrl,
    ownEventsRequested: isAsyncReplRequested(options.permissionMode),
    ownEventsOnly: false,
  });
}
//@ chunk-8nzbdydx.js:62836-62902 placement (2.1.88 match: startSpeculativeClassifierCheck, 1)
/**
 * 恒返回 false 的能力开关。
 */
function isAsyncLaneMode(permissionMode) {
  return codeModeAccepted() && (permissionMode === "auto" || permissionMode === "bypassPermissions");
}
//@ chunk-8nzbdydx.js:62902-62934 placement
/**
 * 恒返回 false 的能力开关。
 */
function isCodeModeOnlyToolsEnabled() {
  return codeModeAccepted() && isCodeModeExperimentEnabled();
}
//@ chunk-8nzbdydx.js:62934-63033 placement
function hideCodeModeOnlyTools(tools) {
  if (codeModeAccepted() && willHideCodeModeOnlyTools(tools)) {
    let filtered = tools.filter((tool) => !isCountedForContext(tool));
    return filtered.length === tools.length ? tools : filtered;
  }
  return tools;
}
//@ chunk-8nzbdydx.js:63155-63196 placement
/**
 * 恒返回 false 的能力开关。
 */
function willHideCodeModeOnlyTools(tools) {
  return codeModeAccepted() && isCodeModeOnlyToolsEnabled() && hasBuiltInEvalTool(tools);
}
//@ chunk-8nzbdydx.js:63196-63261 placement
/**
 * 恒返回 false 的能力开关。
 */
function hasBuiltInEvalTool(unusedArg) {
  return (
    codeModeAccepted() &&
    unusedArg.some((tool) => tool.isMcp !== true && matchesToolName(tool, REPL_TOOL_NAME))
  );
}
//@ chunk-8nzbdydx.js:63261-63297 placement
/**
 * 恒返回 false 的能力开关。
 */
function isCustomersReplPool(unusedArg) {
  return isAccepted() && hasBuiltInEvalTool(unusedArg);
}
//@ chunk-8nzbdydx.js:63297-63439 placement
/**
 * 原样返回输入。
 */
function memorySectionForWire(memoryPrompt, unusedValue) {
  if (codeModeAccepted() && memoryPrompt !== null && willHideCodeModeOnlyTools(unusedValue))
    return memoryPrompt.replaceAll("with the Write tool", "with `write(path, content)` in a REPL script");
  return memoryPrompt;
}
//@ chunk-8nzbdydx.js:63439-63548 placement
/**
 * 只读工具名集合（Read/Glob/Grep/Bash/PowerShell/NotebookEdit）。
 */
var CODE_MODE_ONLY_TOOLS; // deferred: uses GLOB_TOOL_NAME (../GlobTool/prompt.js) of its import cycle while loading; runs once the cycle is complete
var REPL_PRIMITIVE_TOOL_NAMES;
var REPL_SCRIPT_FILENAME;
var REPL_MAX_TIMEOUT_MS;
var REPL_SYNC_RUN_MS;
deferInit("chunk-8nzbdydx.js:63439", () => {
  CODE_MODE_ONLY_TOOLS = new Set([
    READ,
    GLOB_TOOL_NAME,
    GREP_TOOL_NAME,
    BASH_TOOL_NAME,
    POWERSHELL_TOOL_NAME,
    NOTEBOOK_EDIT_TOOL_NAME,
  ]);
  REPL_PRIMITIVE_TOOL_NAMES = new Set([...CODE_MODE_ONLY_TOOLS, FILE_WRITE_TOOL_NAME, EDIT]);
  REPL_SCRIPT_FILENAME = "repl-tool-code.js";
  REPL_MAX_TIMEOUT_MS = 600000;
  REPL_SYNC_RUN_MS = 30000;
});
//@ chunk-8nzbdydx.js:63697-63723 placement
/**
 * print 模式轮询的宽限时间（30 秒）。
 */
var REPL_ASYNC_WALL_CAP_MS = 7200000;
var POLL_CACHE_TTL_MARGIN_MS = 30000;
//@ chunk-pfdb6yeg.js:5459-5484 placement
var REFRESH_MCP_TOOLS_TOOL_NAME = "RefreshMcpTools";
//@ chunk-pfdb6yeg.js:5484-5771 placement
function REFRESHED_TOOLS_NOTE() {
  return codeModeAccepted() && isCodeModeOnlyToolsEnabled()
    ? "The refreshed tools become callable inside the REPL environment (this surface routes MCP tools through the REPL rather than advertising them as top-level tools)."
    : "The refreshed tools are available immediately \u2014 you can call them on your next step.";
}
//@ chunk-pfdb6yeg.js:5771-6699 placement
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
//@ chunk-pfdb6yeg.js:6699-7282 placement
/**
 * RefreshMcpTools 工具提示词：重新读取已连接 MCP 服务器的工具列表，返回每个服务器的状态、工具数与增删的工具名；不会建立或重建连接，可指定单个 server。
 */
var REFRESH_MCP_TOOLS_PROMPT = `Re-query the tool lists of connected MCP servers and update the available tools.

Returns one entry per server: the server name, refresh status, current tool count, and which tool names were added or removed relative to what was previously available. Servers that are not currently connected are reported as not_connected (this tool never dials or re-dials connections \u2014 it only re-reads the tool list over the existing connection).

Parameters:
- server (optional): The name of a specific MCP server to refresh. If not provided, all connected servers are refreshed.
`;
export {
  isCodeModeEnabled,
  memorySectionForWire,
  REFRESH_MCP_TOOLS_TOOL_NAME,
  hasBuiltInEvalTool,
  willHideCodeModeOnlyTools,
  hideCodeModeOnlyTools,
  markPollEventWiringForPrintRun,
  isCodeModeOnlyToolsEnabled,
  codeModeTelemetryFields,
  CODE_MODE_ONLY_TOOLS,
  isCodeModeExperimentEnabled,
  REPL_MAIN_THREAD_KEY,
  POLL_CACHE_TTL_MARGIN_MS,
  isAsyncReplEnabled,
  REPL_PRIMITIVE_TOOL_NAMES,
  hasCodeModeBeenUsed,
  chromeSectionForWire,
  isCustomersReplPool,
  printPollWiringLoggedState,
  REPL_SYNC_RUN_MS,
  isAsyncLaneMode,
  REFRESH_MCP_TOOLS_PROMPT_2,
  REFRESH_MCP_TOOLS_PROMPT,
  REPL_MAX_TIMEOUT_MS,
  REPL_SCRIPT_FILENAME,
  REPL_ASYNC_WALL_CAP_MS,
  isAsyncReplRequested,
};
