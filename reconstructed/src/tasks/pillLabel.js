/**
 * tasks/pillLabel.ts
 *
 * 底部"后台任务"胶囊标签文字：按任务类型汇总数量（shell/monitor、团队、本地代理、云会话、ultraplan、workflow、MCP 任务、dream 等）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tasks/pillLabel.ts
 * pieces: chunk-1fg1sa83.js (4)
 * attribution: fingerprint 2, layout 2
 */
import { count } from "../utils/collections.js";
import { Wx, DIAMOND_GLYPH } from "../utils/permissions/autoModeRulesPrompt.js";
import { Xye } from "./MonitorWsTask/MonitorWsTask.js";

/**
 * 生成后台任务胶囊文字：全部同类型时按类型给专门文案（如 "2 shells, 1 monitor"、"ultraplan ready"、"3 cloud sessions"、"dreaming"），否则回退为 "N background tasks"。
 */
//@ chunk-1fg1sa83.js:302-1852 fingerprint = getPillLabel (0.699)
function getPillLabel(tasks) {
  let r = tasks[0];
  if (!r) return null;
  let e = tasks.length;
  if (tasks.every((n) => n.type === r.type))
    switch (r.type) {
      case "local_bash": {
        let monitors = count(tasks, (s) => s.type === "local_bash" && s.kind === "monitor"),
          shells = e - monitors,
          parts = [];
        if (shells > 0) parts.push(shells === 1 ? "1 shell" : `${shells} shells`);
        if (monitors > 0) parts.push(monitors === 1 ? "1 monitor" : `${monitors} monitors`);
        return parts.join(", ");
      }
      case "in_process_teammate": {
        let teamCount = new Set(
          tasks.map((o) => (o.type === "in_process_teammate" ? o.identity.teamName : "")),
        ).size;
        return teamCount === 1 ? "1 team" : `${teamCount} teams`;
      }
      case "local_agent":
        return e === 1 ? "1 local agent" : `${e} local agents`;
      case "remote_agent": {
        if (e === 1 && r.isUltraplan)
          switch (r.ultraplanPhase) {
            case "plan_ready":
              return `${Wx} ultraplan ready`;
            case "needs_input":
              return `${DIAMOND_GLYPH} ultraplan needs your input`;
            default:
              return `${DIAMOND_GLYPH} ultraplan`;
          }
        if (tasks.every((n) => n.type === "remote_agent" && n.remoteTaskType === "remote-workflow"))
          return e === 1
            ? `${DIAMOND_GLYPH} 1 remote dynamic workflow`
            : `${DIAMOND_GLYPH} ${e} remote dynamic workflows`;
        return e === 1 ? `${DIAMOND_GLYPH} 1 cloud session` : `${DIAMOND_GLYPH} ${e} cloud sessions`;
      }
      case "local_workflow":
        return e === 1 ? "1 background dynamic workflow" : `${e} background dynamic workflows`;
      case "monitor_mcp":
      case "monitor_ws": {
        if (tasks.every(Xye))
          return e === 1 ? "1 Artifact comment monitor" : `${e} Artifact comment monitors`;
        return e === 1 ? "1 monitor" : `${e} monitors`;
      }
      case "mcp_task":
        return e === 1 ? "1 MCP task" : `${e} MCP tasks`;
      case "dream":
        return "dreaming";
      case "auto_mode_scan":
        return "auto-mode scan";
      case "local_memory_import":
        return r.windowsPlanned > 0 ? `memory import ${r.windowsDone}/${r.windowsPlanned}` : "memory import";
      case "post_turn_memory":
        return "saving memories";
      default:
    }
  return formatBackgroundTaskCount(e);
}
/**
 * 带额外计数的胶囊文字：extraCount 为 0 时同 getPillLabel，否则统一显示总数。
 */
//@ chunk-1fg1sa83.js:1852-1904 layout
function getPillLabelWithExtra(tasks, extraCount) {
  return extraCount === 0 ? getPillLabel(tasks) : formatBackgroundTaskCount(tasks.length + extraCount);
}
/**
 * 格式化 "N background task(s)"。
 */
//@ chunk-1fg1sa83.js:1904-1966 layout
function formatBackgroundTaskCount(count) {
  return `${count} background ${count === 1 ? "task" : "tasks"}`;
}
/**
 * 只有一个 ultraplan 远程任务且有阶段时，胶囊需要显示行动提示。
 */
//@ chunk-1fg1sa83.js:1966-2096 fingerprint = pillNeedsCta (1)
function pillNeedsCta(tasks) {
  if (tasks.length !== 1) return !1;
  let r = tasks[0];
  return r.type === "remote_agent" && r.isUltraplan === !0 && r.ultraplanPhase !== void 0;
}

export { getPillLabelWithExtra, pillNeedsCta, getPillLabel };
