/**
 * components/tasks/BackgroundTask.tsx
 *
 * 后台任务列表项（bash/agent/monitor/workflow，状态与未读标记）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/tasks/BackgroundTask.tsx
 * pieces: chunk-18hwfzwa.js (2)
 * attribution: affinity 1, fingerprint 1
 */
import { TaskStatusText, ShellProgress } from "./ShellProgress.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";
import { DIAMOND_GLYPH, FILLED_DIAMOND_GLYPH } from "../../utils/permissions/autoModeRulesPrompt.js";
import { remoteTaskStatusLabel } from "./TaskDetailDialog.js";
import { isCoordinatorPanelActive, agentLabel } from "../../utils/transcriptDiagnostics.js";
import { isTerminalStatus } from "./taskStatusUtils.js";
import { StatusIcon } from "../design-system/StatusIcon.js";
import { truncate } from "../../utils/format.js";
import { plural } from "../../utils/stringUtils.js";
import { cleanTaskDescription } from "../../utils/taskDescription.js";
import { shortTaskLabel } from "../../services/mcp/mcpTaskCapability.js";
import { isAutoReactArmedMonitorTask } from "../../tasks/MonitorWsTask/MonitorWsTask.js";

//@ chunk-18hwfzwa.js:695523-695559 affinity
var AUTO_REPLYING_TEXT = "auto-replying to comments";
//@ chunk-18hwfzwa.js:695559-697663 fingerprint = BackgroundTask (0.614)
function BackgroundTask(t0) {
  let x = t0.status === "completed" && !t0.notified ? ", unread" : "";
  switch (t0.type) {
    case "local_bash":
      return {
        label: t0.kind === "monitor" ? t0.description : t0.command,
        icon: TaskStatusText(t0.status),
        meta: [ShellProgress(t0.status)],
      };
    case "remote_agent":
      if (t0.isRemoteReview) return null;
      return {
        label: t0.title,
        icon: jsxProd_default(Text, {
          dimColor: true,
          children: t0.status === "running" || t0.status === "pending" ? DIAMOND_GLYPH : FILLED_DIAMOND_GLYPH,
        }),
        meta: [remoteTaskStatusLabel(t0)],
      };
    case "local_agent": {
      let D = t0.status === "completed" && "quietlyParked" in t0 && t0.quietlyParked === true;
      let L = !D && isCoordinatorPanelActive() && isTerminalStatus(t0);
      let ee = agentLabel(t0.model, t0.effort);
      return {
        label: t0.description,
        icon: L
          ? jsxProd_default(StatusIcon, {
              status: "pending",
              "aria-label": "waiting:",
            })
          : D
            ? jsxProd_default(StatusIcon, {
                status: "pending",
                "aria-label": "parked:",
              })
            : TaskStatusText(t0.status),
        meta: [
          `${t0.status === "completed" ? (D ? "parked" : L ? "waiting" : "done") : t0.status}${x}`,
          ee ? truncate(ee, 28, true) : "",
        ],
      };
    }
    case "in_process_teammate":
      return null;
    case "local_workflow":
      return {
        label: t0.workflowName ?? t0.summary ?? t0.description,
        icon: TaskStatusText(t0.status),
        meta: [
          `${t0.status === "running" ? `${t0.agentCount} ${plural(t0.agentCount, "agent")}` : t0.status === "completed" ? "done" : t0.status}${x}`,
        ],
      };
    case "mcp_task":
      return {
        label: `${cleanTaskDescription(t0.serverName) ?? ""}/${cleanTaskDescription(t0.toolName) ?? ""}`,
        icon: TaskStatusText(t0.status),
        meta: [
          t0.mcpStatus,
          shortTaskLabel(t0.mcpTaskId),
          t0.statusMessage ? (cleanTaskDescription(t0.statusMessage) ?? "") : "",
        ],
      };
    case "monitor_mcp":
    case "monitor_ws":
      return {
        label: t0.description,
        icon: TaskStatusText(t0.status),
        meta: [
          `${t0.status === "completed" ? "done" : isAutoReactArmedMonitorTask(t0) ? AUTO_REPLYING_TEXT : t0.status}${x}`,
        ],
      };
    case "dream": {
      let D = t0.filesTouched.length;
      return {
        label: t0.description,
        icon: TaskStatusText(t0.status),
        meta: [
          `${t0.status === "completed" ? "done" : t0.status}${x}`,
          t0.phase,
          t0.phase === "updating" && D > 0
            ? `${D} ${plural(D, "file")}`
            : `${t0.sessionsReviewing} ${plural(t0.sessionsReviewing, "session")}`,
        ],
      };
    }
    case "auto_mode_scan":
      return {
        label: t0.description,
        icon: TaskStatusText(t0.status),
        meta: [t0.status],
      };
    case "local_memory_import":
      return {
        label: t0.description,
        icon: TaskStatusText(t0.status),
        meta: [
          `${t0.status === "completed" ? "done" : t0.status}${x}`,
          `${t0.windowsDone} of ${t0.windowsPlanned} model ${plural(t0.windowsPlanned, "call")}`,
          `${t0.filesRead} ${plural(t0.filesRead, "file")}`,
        ],
      };
    case "post_turn_memory":
      return {
        label: t0.description,
        icon: TaskStatusText(t0.status),
        meta: [`${t0.status === "completed" ? "done" : t0.status}${x}`],
      };
    default:
      return {
        label: t0.description,
        icon: TaskStatusText(t0.status),
        meta: [t0.status],
      };
  }
}
export { BackgroundTask };
