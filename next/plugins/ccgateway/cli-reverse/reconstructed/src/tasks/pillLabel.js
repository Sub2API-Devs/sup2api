/**
 * tasks/pillLabel.ts
 *
 * 底部"后台任务"胶囊标签文字：按任务类型汇总数量（shell/monitor、团队、本地代理、云会话、ultraplan、workflow、MCP 任务、dream 等）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tasks/pillLabel.ts
 * pieces: chunk-n62g4ekh.js (5)
 * attribution: fingerprint 2, layout 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { countWhere } from "../utils/collections.js";
import { FILLED_DIAMOND_GLYPH, DIAMOND_GLYPH } from "../constants/figures.js";
import { isAutoReactArmedMonitorTask } from "./MonitorWsTask/MonitorWsTask.js";

//@ chunk-n62g4ekh.js:302-1783 fingerprint (2.1.88 match: getPillLabel, 0.723)
/**
 * 生成后台任务胶囊文字：全部同类型时按类型给专门文案（如 "2 shells, 1 monitor"、"ultraplan ready"、"3 cloud sessions"、"dreaming"），否则回退为 "N background tasks"。
 */
function getPillLabel(tasks) {
  let first = tasks[0];
  if (!first) return null;
  let taskCount = tasks.length;
  if (tasks.every((t) => t.type === first.type))
    switch (first.type) {
      case "local_bash": {
        let monitors = countWhere(tasks, (t) => t.type === "local_bash" && t.kind === "monitor");
        let shells = taskCount - monitors;
        let parts = [];
        if (shells > 0) parts.push(shells === 1 ? "1 shell" : `${shells} shells`);
        if (monitors > 0) parts.push(monitors === 1 ? "1 monitor" : `${monitors} monitors`);
        return parts.join(", ");
      }
      case "in_process_teammate": {
        let teamCount = new Set(
          tasks.map((t) => (t.type === "in_process_teammate" ? t.identity.teamName : "")),
        ).size;
        return teamCount === 1 ? "1 team" : `${teamCount} teams`;
      }
      case "local_agent":
        return taskCount === 1 ? "1 local agent" : `${taskCount} local agents`;
      case "remote_agent": {
        if (taskCount === 1 && first.isUltraplan)
          switch (first.ultraplanPhase) {
            case "plan_ready":
              return `${FILLED_DIAMOND_GLYPH} ultraplan ready`;
            case "needs_input":
              return `${DIAMOND_GLYPH} ultraplan needs your input`;
            default:
              return `${DIAMOND_GLYPH} ultraplan`;
          }
        if (tasks.every((task) => task.type === "remote_agent" && task.remoteTaskType === "remote-workflow"))
          return taskCount === 1
            ? `${DIAMOND_GLYPH} 1 remote dynamic workflow`
            : `${DIAMOND_GLYPH} ${taskCount} remote dynamic workflows`;
        return taskCount === 1
          ? `${DIAMOND_GLYPH} 1 cloud session`
          : `${DIAMOND_GLYPH} ${taskCount} cloud sessions`;
      }
      case "local_workflow":
        return workflowPillLabel(taskCount);
      case "monitor_mcp":
      case "monitor_ws": {
        if (tasks.every(isAutoReactArmedMonitorTask))
          return taskCount === 1 ? "1 Artifact comment monitor" : `${taskCount} Artifact comment monitors`;
        return taskCount === 1 ? "1 monitor" : `${taskCount} monitors`;
      }
      case "mcp_task":
        return taskCount === 1 ? "1 MCP task" : `${taskCount} MCP tasks`;
      case "dream":
        return "dreaming";
      case "auto_mode_scan":
        return "auto-mode scan";
      case "local_memory_import":
        return first.windowsPlanned > 0
          ? `memory import ${first.windowsDone}/${first.windowsPlanned}`
          : "memory import";
      case "post_turn_memory":
        return "saving memories";
      default:
    }
  return formatBackgroundTaskCount(taskCount);
}
//@ chunk-n62g4ekh.js:1783-1957 layout
/**
 * 带额外计数的胶囊文字：extraCount 为 0 时同 getPillLabel，否则统一显示总数。
 */
function getPillLabelWithExtra(tasks, task) {
  if (task.length === 0) return getPillLabel(tasks);
  let taskCount = tasks.length + task.length;
  return task.every((task) => task.taskType === "local_workflow") &&
    tasks.every((task) => task.type === "local_workflow")
    ? workflowPillLabel(taskCount)
    : formatBackgroundTaskCount(taskCount);
}
//@ chunk-n62g4ekh.js:1957-2052 layout
function workflowPillLabel(task) {
  return task === 1 ? "1 background dynamic workflow" : `${task} background dynamic workflows`;
}
//@ chunk-n62g4ekh.js:2052-2114 layout
/**
 * 格式化 "N background task(s)"。
 */
function formatBackgroundTaskCount(count) {
  return `${count} background ${count === 1 ? "task" : "tasks"}`;
}
//@ chunk-n62g4ekh.js:2114-2244 fingerprint (2.1.88 match: pillNeedsCta, 1)
/**
 * 只有一个 ultraplan 远程任务且有阶段时，胶囊需要显示行动提示。
 */
function pillNeedsCta(tasks) {
  if (tasks.length !== 1) return false;
  let t = tasks[0];
  return t.type === "remote_agent" && t.isUltraplan === true && t.ultraplanPhase !== undefined;
}
export { getPillLabelWithExtra, pillNeedsCta, getPillLabel };
