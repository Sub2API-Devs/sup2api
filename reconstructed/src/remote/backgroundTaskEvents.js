/**
 * remote/backgroundTaskEvents.ts
 *
 * 远程会话后台任务事件判定（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-08945j39.js (10)
 * attribution: placement 10
 */
import { toBackgroundTaskInfo } from "../services/homeSeed/firstSend.js";
import { isTerminalTaskStatus } from "../tasks/taskStatus.js";
import { BACKGROUND_TASKS_MOVES_BASH_V1 } from "../utils/messages/systemInit.js";
import { BASH_TOOL_NAME } from "../tools/BashTool/toolName.js";

//@ chunk-08945j39.js:1783-2325 placement
function toBackgroundTaskEvent(e, n) {
  if (n.type !== "system") return false;
  switch (n.subtype) {
    case "background_tasks_changed":
      if (Array.isArray(n.tasks)) {
        e.clear();
        for (let task of n.tasks)
          if (typeof task?.task_id === "string")
            e.set(task.task_id, toBackgroundTaskInfo(task.task_id, task, task.subagent_type));
      }
      return true;
    case "task_started":
      if (typeof n.task_id === "string" && n.is_backgrounded !== false)
        e.set(n.task_id, toBackgroundTaskInfo(n.task_id, n, e.get(n.task_id)?.subagentType));
      return true;
    case "task_notification":
      if (typeof n.task_id === "string") e.delete(n.task_id);
      return true;
    case "task_progress":
    case "task_updated":
      return true;
    default:
      return false;
  }
}
//@ chunk-08945j39.js:2325-2370 placement
var BACKGROUND_TASK_TYPES_WITH_TRACKED_IDS = new Set(["local_bash", "local_agent"]);
//@ chunk-08945j39.js:2370-2987 placement
function isSystemInitMessage(e, n) {
  if (n.type === "result" || (n.type === "system" && n.subtype === "init")) {
    e.clear();
    return;
  }
  if (n.type !== "system") return;
  switch (n.subtype) {
    case "task_started":
      if (typeof n.task_id !== "string") return;
      if (
        n.is_backgrounded === false &&
        n.skip_transcript !== true &&
        BACKGROUND_TASK_TYPES_WITH_TRACKED_IDS.has(n.task_type)
      )
        e.add(n.task_id);
      else e.delete(n.task_id);
      return;
    case "task_updated":
      if (
        n.patch?.is_backgrounded === true ||
        (n.patch?.status !== undefined && isTerminalTaskStatus(n.patch.status))
      )
        e.delete(n.task_id);
      return;
    case "task_notification":
      e.delete(n.task_id);
      return;
    case "background_tasks_changed":
      if (Array.isArray(n.tasks)) for (let task of n.tasks) e.delete(task?.task_id);
      return;
    default:
      return;
  }
}
//@ chunk-08945j39.js:2987-3000 placement
/**
 * 导出常量或表 `BASH_TASK_COUNT_DELAY_MS`：值为 2000。
 */
var BASH_TASK_COUNT_DELAY_MS = 2000;
//@ chunk-08945j39.js:3000-3083 placement
/**
 * 导出函数 `supportsBackgroundTasksMovesBash`：参数 e，返回 Array.isArray(e.capabilities) && e.capabilities.includes(BACKGROUND_TASKS_MOVES_BASH_V1)。
 */
function supportsBackgroundTasksMovesBash(e) {
  return Array.isArray(e.capabilities) && e.capabilities.includes(BACKGROUND_TASKS_MOVES_BASH_V1);
}
//@ chunk-08945j39.js:3083-3323 placement
/**
 * 取主线程助手消息中非后台运行的 Bash 工具调用 id。
 */
function getForegroundBashToolUseIds(e) {
  if (e.type !== "assistant" || e.parent_tool_use_id) return [];
  let content = e.message?.content;
  return Array.isArray(content)
    ? content.flatMap((s) =>
        s?.type === "tool_use" &&
        s.name === BASH_TOOL_NAME &&
        typeof s.id === "string" &&
        s.input?.run_in_background !== true
          ? [s.id]
          : [],
      )
    : [];
}
//@ chunk-08945j39.js:3323-3506 placement
/**
 * 取用户消息中所有工具结果对应的工具调用 id。
 */
function getToolResultIds(payload) {
  let content = payload.type === "user" ? payload.message?.content : undefined;
  return Array.isArray(content)
    ? content.flatMap((s) =>
        s?.type === "tool_result" && typeof s.tool_use_id === "string" ? [s.tool_use_id] : [],
      )
    : [];
}
//@ chunk-08945j39.js:3506-3517 placement
var MAX_TRACKED_BACKGROUND_TASK_IDS = 256;
//@ chunk-08945j39.js:3517-3898 placement
/**
 * 根据系统消息（后台任务变化、任务开始、任务更新为后台）记录需要跟踪的后台任务 id。
 */
function trackBackgroundTask(awaitingFinish, n) {
  if (n.type !== "system") return;
  switch (n.subtype) {
    case "background_tasks_changed":
      if (Array.isArray(n.tasks)) {
        for (let task of n.tasks)
          if (task?.awaited !== true) addBackgroundTaskId(awaitingFinish, task?.task_id, task?.ambient);
      }
      return;
    case "task_started":
      if (n.is_backgrounded !== false && n.awaited !== true)
        addBackgroundTaskId(awaitingFinish, n.task_id, n.ambient);
      return;
    case "task_updated":
      if (n.patch?.is_backgrounded === true) addBackgroundTaskId(awaitingFinish, n.task_id);
      return;
    default:
      return;
  }
}
//@ chunk-08945j39.js:3898-4045 placement
function addBackgroundTaskId(e, taskId, ambient) {
  if (typeof taskId !== "string" || ambient === true || e.has(taskId)) return;
  if (e.size >= MAX_TRACKED_BACKGROUND_TASK_IDS) {
    let i = e.values().next().value;
    if (i !== undefined) e.delete(i);
  }
  e.add(taskId);
}
export {
  trackBackgroundTask,
  isSystemInitMessage,
  toBackgroundTaskEvent,
  supportsBackgroundTasksMovesBash,
  getForegroundBashToolUseIds,
  BASH_TASK_COUNT_DELAY_MS,
  getToolResultIds,
};
