/**
 * tools/REPLTool/scriptStatus.ts
 *
 * 运行中脚本状态的收集与 tool_progress 上报（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n51jggtb.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isStreamingOn } from "./toolMeta.js";
import {
  isScriptRunning,
  MAX_DESCRIPTION_WIDTH,
  describeRunningScripts,
} from "../../utils/codeMode/runningScripts.js";
import { displayableScriptDescription } from "../../utils/codeMode/displayableScriptDescription.js";
import { truncateToWidth } from "../../utils/format.js";
import { REPL_MAIN_THREAD_KEY } from "../RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { enqueueTaskNotification } from "../../utils/task/taskNotifications.js";
import { REPL_TOOL_NAME } from "./constants.js";
import { logError } from "../../utils/log.js";

//@ chunk-n51jggtb.js:71659-71758 placement
/**
 * 开始监听运行中脚本变化并触发首次上报。
 */
function startListening(state, context) {
  if (state.listening || !isStreamingOn()) return;
  state.listening = true;
  context.onRunningScriptsChange(() => pushScriptStatus(context, state));
}
//@ chunk-n51jggtb.js:71758-71896 placement
/**
 * 登记一个运行中脚本并在结束时注销，返回清理函数。
 */
function registerScriptStatus(state, replSessions, toolUseId, description) {
  startListening(state, replSessions);
  if (!state.listening || toolUseId === undefined) return () => {};
  state.classic.set(toolUseId, description);
  pushScriptStatus(replSessions, state);
  return () => {
    state.classic.delete(toolUseId);
    pushScriptStatus(replSessions, state);
  };
}
//@ chunk-n51jggtb.js:71896-72088 placement
/**
 * 计算当前是否仍有脚本在跑以及要上报的文本。
 */
function currentScriptStatus(replState, classic) {
  let scriptRunning = isScriptRunning(replState);
  if (!scriptRunning && classic.size === 0) return IDLE_STATUS;
  let found = [...classic.values()]
    .map((description) => displayableScriptDescription(description, MAX_DESCRIPTION_WIDTH))
    .find((displayed) => displayed !== "");
  return {
    running: true,
    text:
      (scriptRunning ? describeRunningScripts(replState, MAX_DESCRIPTION_WIDTH) : null) ??
      (found === undefined ? null : truncateToWidth(found, MAX_DESCRIPTION_WIDTH)),
  };
}
//@ chunk-n51jggtb.js:72088-72118 placement
/**
 * “没有脚本在跑”的空状态常量。
 */
var IDLE_STATUS = {
  running: false,
  text: null,
};
//@ chunk-n51jggtb.js:72118-72481 placement
/**
 * 把运行中脚本状态变化作为 tool_progress 事件上报，内容不变时跳过。
 */
function pushScriptStatus(replSessions, state) {
  try {
    let status = currentScriptStatus(replSessions.runningScripts(REPL_MAIN_THREAD_KEY), state.classic);
    if (status.running === state.sent.running && status.text === state.sent.text) return;
    let toolUseId =
      [...state.classic.keys()][0] ??
      [...replSessions.runningScripts(REPL_MAIN_THREAD_KEY).keys()][0] ??
      state.toolUseId;
    enqueueTaskNotification({
      type: "tool_progress",
      tool_use_id: toolUseId,
      tool_name: REPL_TOOL_NAME,
      parent_tool_use_id: null,
      elapsed_time_seconds: 0,
      script_status: true,
      ...status,
    });
    state.sent = status;
    state.toolUseId = toolUseId;
  } catch (error) {
    logError(error);
  }
}
export { startListening, registerScriptStatus };
