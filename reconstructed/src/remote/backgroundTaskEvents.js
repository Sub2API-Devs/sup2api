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
  if (n.type !== "system") return !1;
  switch (n.subtype) {
    case "background_tasks_changed":
      if (Array.isArray(n.tasks)) {
        e.clear();
        for (let task of n.tasks)
          if (typeof task?.task_id === "string")
            e.set(task.task_id, toBackgroundTaskInfo(task.task_id, task, task.subagent_type));
      }
      return !0;
    case "task_started":
      if (typeof n.task_id === "string" && n.is_backgrounded !== !1)
        e.set(n.task_id, toBackgroundTaskInfo(n.task_id, n, e.get(n.task_id)?.subagentType));
      return !0;
    case "task_notification":
      if (typeof n.task_id === "string") e.delete(n.task_id);
      return !0;
    case "task_progress":
    case "task_updated":
      return !0;
    default:
      return !1;
  }
}
//@ chunk-08945j39.js:2325-2370 placement
var at = new Set(["local_bash", "local_agent"]);
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
      if (n.is_backgrounded === !1 && n.skip_transcript !== !0 && at.has(n.task_type)) e.add(n.task_id);
      else e.delete(n.task_id);
      return;
    case "task_updated":
      if (
        n.patch?.is_backgrounded === !0 ||
        (n.patch?.status !== void 0 && isTerminalTaskStatus(n.patch.status))
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
var YAs = 2000;
//@ chunk-08945j39.js:3000-3083 placement
function Kkr(e) {
  return Array.isArray(e.capabilities) && e.capabilities.includes(BACKGROUND_TASKS_MOVES_BASH_V1);
}
/**
 * 取主线程助手消息中非后台运行的 Bash 工具调用 id。
 */
//@ chunk-08945j39.js:3083-3323 placement
function getForegroundBashToolUseIds(e) {
  if (e.type !== "assistant" || e.parent_tool_use_id) return [];
  let n = e.message?.content;
  return Array.isArray(n)
    ? n.flatMap((s) =>
        s?.type === "tool_use" &&
        s.name === BASH_TOOL_NAME &&
        typeof s.id === "string" &&
        s.input?.run_in_background !== !0
          ? [s.id]
          : [],
      )
    : [];
}
/**
 * 取用户消息中所有工具结果对应的工具调用 id。
 */
//@ chunk-08945j39.js:3323-3506 placement
function getToolResultIds(e) {
  let n = e.type === "user" ? e.message?.content : void 0;
  return Array.isArray(n)
    ? n.flatMap((s) =>
        s?.type === "tool_result" && typeof s.tool_use_id === "string" ? [s.tool_use_id] : [],
      )
    : [];
}
//@ chunk-08945j39.js:3506-3517 placement
var dt = 256;
/**
 * 根据系统消息（后台任务变化、任务开始、任务更新为后台）记录需要跟踪的后台任务 id。
 */
//@ chunk-08945j39.js:3517-3898 placement
function trackBackgroundTask(e, n) {
  if (n.type !== "system") return;
  switch (n.subtype) {
    case "background_tasks_changed":
      if (Array.isArray(n.tasks)) {
        for (let task of n.tasks)
          if (task?.awaited !== !0) addBackgroundTaskId(e, task?.task_id, task?.ambient);
      }
      return;
    case "task_started":
      if (n.is_backgrounded !== !1 && n.awaited !== !0) addBackgroundTaskId(e, n.task_id, n.ambient);
      return;
    case "task_updated":
      if (n.patch?.is_backgrounded === !0) addBackgroundTaskId(e, n.task_id);
      return;
    default:
      return;
  }
}
//@ chunk-08945j39.js:3898-4045 placement
function addBackgroundTaskId(e, n, s) {
  if (typeof n !== "string" || s === !0 || e.has(n)) return;
  if (e.size >= dt) {
    let i = e.values().next().value;
    if (i !== void 0) e.delete(i);
  }
  e.add(n);
}

export {
  trackBackgroundTask,
  isSystemInitMessage,
  toBackgroundTaskEvent,
  Kkr,
  getForegroundBashToolUseIds,
  YAs,
  getToolResultIds,
};
