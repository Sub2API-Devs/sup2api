/**
 * remote/backgroundTaskEvents.ts
 *
 * 远程会话后台任务事件判定（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-h29vk4wn.js (10)
 * attribution: placement 10
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { toBackgroundTaskInfo } from "../services/homeSeed/firstSend.js";
import { isTerminalTaskStatus } from "../tasks/taskStatus.js";
import { BACKGROUND_TASKS_MOVES_BASH_V1 } from "../utils/messages/systemInit.js";
import { BASH_TOOL_NAME } from "../tools/BashTool/toolName.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-h29vk4wn.js:3354-3896 placement
function toBackgroundTaskEvent(backgroundTasks, event) {
  if (event.type !== "system") return false;
  switch (event.subtype) {
    case "background_tasks_changed":
      if (Array.isArray(event.tasks)) {
        backgroundTasks.clear();
        for (let task of event.tasks)
          if (typeof task?.task_id === "string")
            backgroundTasks.set(task.task_id, toBackgroundTaskInfo(task.task_id, task, task.subagent_type));
      }
      return true;
    case "task_started":
      if (typeof event.task_id === "string" && event.is_backgrounded !== false)
        backgroundTasks.set(
          event.task_id,
          toBackgroundTaskInfo(event.task_id, event, backgroundTasks.get(event.task_id)?.subagentType),
        );
      return true;
    case "task_notification":
      if (typeof event.task_id === "string") backgroundTasks.delete(event.task_id);
      return true;
    case "task_progress":
    case "task_updated":
      return true;
    default:
      return false;
  }
}
//@ chunk-h29vk4wn.js:3896-3941 placement
var BACKGROUND_TASK_TYPES_WITH_TRACKED_IDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-h29vk4wn.js:3896", () => {
  BACKGROUND_TASK_TYPES_WITH_TRACKED_IDS = new Set(["local_bash", "local_agent"]);
});
//@ chunk-h29vk4wn.js:3941-4558 placement
function isSystemInitMessage(trackedTaskIds, event) {
  if (event.type === "result" || (event.type === "system" && event.subtype === "init")) {
    trackedTaskIds.clear();
    return;
  }
  if (event.type !== "system") return;
  switch (event.subtype) {
    case "task_started":
      if (typeof event.task_id !== "string") return;
      if (
        event.is_backgrounded === false &&
        event.skip_transcript !== true &&
        BACKGROUND_TASK_TYPES_WITH_TRACKED_IDS.has(event.task_type)
      )
        trackedTaskIds.add(event.task_id);
      else trackedTaskIds.delete(event.task_id);
      return;
    case "task_updated":
      if (
        event.patch?.is_backgrounded === true ||
        (event.patch?.status !== undefined && isTerminalTaskStatus(event.patch.status))
      )
        trackedTaskIds.delete(event.task_id);
      return;
    case "task_notification":
      trackedTaskIds.delete(event.task_id);
      return;
    case "background_tasks_changed":
      if (Array.isArray(event.tasks)) for (let task of event.tasks) trackedTaskIds.delete(task?.task_id);
      return;
    default:
      return;
  }
}
//@ chunk-h29vk4wn.js:4558-4571 placement
/**
 * 导出常量或表 `BASH_TASK_COUNT_DELAY_MS`：值为 2000。
 */
var BASH_TASK_COUNT_DELAY_MS = 2000;
//@ chunk-h29vk4wn.js:4571-4654 placement
/**
 * 导出函数 `supportsBackgroundTasksMovesBash`：参数 e，返回 Array.isArray(e.capabilities) && e.capabilities.includes(BACKGROUND_TASKS_MOVES_BASH_V1)。
 */
function supportsBackgroundTasksMovesBash(handle) {
  return Array.isArray(handle.capabilities) && handle.capabilities.includes(BACKGROUND_TASKS_MOVES_BASH_V1);
}
//@ chunk-h29vk4wn.js:4654-4894 placement
/**
 * 取主线程助手消息中非后台运行的 Bash 工具调用 id。
 */
function getForegroundBashToolUseIds(message) {
  if (message.type !== "assistant" || message.parent_tool_use_id) return [];
  let content = message.message?.content;
  return Array.isArray(content)
    ? content.flatMap((block) =>
        block?.type === "tool_use" &&
        block.name === BASH_TOOL_NAME &&
        typeof block.id === "string" &&
        block.input?.run_in_background !== true
          ? [block.id]
          : [],
      )
    : [];
}
//@ chunk-h29vk4wn.js:4894-5077 placement
/**
 * 取用户消息中所有工具结果对应的工具调用 id。
 */
function getToolResultIds(payload) {
  let content = payload.type === "user" ? payload.message?.content : undefined;
  return Array.isArray(content)
    ? content.flatMap((block) =>
        block?.type === "tool_result" && typeof block.tool_use_id === "string" ? [block.tool_use_id] : [],
      )
    : [];
}
//@ chunk-h29vk4wn.js:5077-5088 placement
var MAX_TRACKED_BACKGROUND_TASK_IDS = 256;
//@ chunk-h29vk4wn.js:5088-5469 placement
/**
 * 根据系统消息（后台任务变化、任务开始、任务更新为后台）记录需要跟踪的后台任务 id。
 */
function trackBackgroundTask(taskIds, event) {
  if (event.type !== "system") return;
  switch (event.subtype) {
    case "background_tasks_changed":
      if (Array.isArray(event.tasks)) {
        for (let task of event.tasks)
          if (task?.awaited !== true) addBackgroundTaskId(taskIds, task?.task_id, task?.ambient);
      }
      return;
    case "task_started":
      if (event.is_backgrounded !== false && event.awaited !== true)
        addBackgroundTaskId(taskIds, event.task_id, event.ambient);
      return;
    case "task_updated":
      if (event.patch?.is_backgrounded === true) addBackgroundTaskId(taskIds, event.task_id);
      return;
    default:
      return;
  }
}
//@ chunk-h29vk4wn.js:5469-5616 placement
function addBackgroundTaskId(taskIds, taskId, ambient) {
  if (typeof taskId !== "string" || ambient === true || taskIds.has(taskId)) return;
  if (taskIds.size >= MAX_TRACKED_BACKGROUND_TASK_IDS) {
    let oldest = taskIds.values().next().value;
    if (oldest !== undefined) taskIds.delete(oldest);
  }
  taskIds.add(taskId);
}
export {
  supportsBackgroundTasksMovesBash,
  getForegroundBashToolUseIds,
  getToolResultIds,
  isSystemInitMessage,
  toBackgroundTaskEvent,
  BASH_TASK_COUNT_DELAY_MS,
  trackBackgroundTask,
};
