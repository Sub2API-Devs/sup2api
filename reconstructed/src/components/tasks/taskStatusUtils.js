/**
 * components/tasks/taskStatusUtils.tsx
 *
 * 任务状态图标/颜色、队友活动描述、是否隐藏任务页脚。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/tasks/taskStatusUtils.tsx
 * pieces: chunk-18hwfzwa.js (2), chunk-ah34pb7m.js (4)
 * attribution: placement 2, fingerprint 3, callgraph-witnessed 1
 */
import { BLACK_CIRCLE, PAUSE_GLYPH } from "../../constants/figures.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { FLAG_IDLE_WINDOW } from "../../tasks/LocalAgentTask/keepalive.js";
import { isAmbientTask, isPanelAgentTask } from "../../tasks/taskKinds.js";
import { isCoordinatorPanelActive, isCoordinatorPanelEnabled } from "../../utils/transcriptDiagnostics.js";
import { waitForTaskCompletion } from "../../tools/TaskOutputTool/TaskOutputTool.js";
import { isBackgroundTask } from "../../tasks/types.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { Byline } from "../design-system/Byline.js";
import { summarizeRecentActivities } from "../../utils/collapseReadSearch.js";

//@ chunk-ah34pb7m.js:11869-12036 fingerprint = getTaskStatusIcon (0.527)
function getTaskStatusIcon(status) {
  if (status === "running") return BLACK_CIRCLE;
  if (status === "completed") return figures_default.tick;
  if (status === "failed" || status === "killed") return figures_default.cross;
  if (status === "paused") return PAUSE_GLYPH;
  return figures_default.circle;
}
//@ chunk-ah34pb7m.js:12036-12200 fingerprint = getTaskStatusColor (0.743)
function getTaskStatusColor(status) {
  if (status === "completed") return "success";
  if (status === "failed") return "error";
  if (status === "killed") return "warning";
  if (status === "paused") return "warning";
  return "background";
}
//@ chunk-ah34pb7m.js:12331-12424 placement
function isTerminalStatus(status) {
  return (
    status.status === "completed" &&
    [...(status.keepaliveReasons ?? [])].some((reason) => reason !== FLAG_IDLE_WINDOW)
  );
}
//@ chunk-ah34pb7m.js:12424-12578 callgraph-witnessed = shouldHideTasksFooter (0.373)
function shouldHideTasksFooter(task) {
  if (isAmbientTask(task)) return false;
  if (isCoordinatorPanelActive()) return waitForTaskCompletion(task) || isBackgroundTask(task);
  return (
    waitForTaskCompletion(task) &&
    task.type !== "local_workflow" &&
    !(isCoordinatorPanelEnabled() && (isPanelAgentTask(task) || task.type === "in_process_teammate"))
  );
}
//@ chunk-18hwfzwa.js:687040-687519 placement
/**
 * 任务详情对话框的底部快捷键提示：可选"← 返回"、"Esc/Enter/Space 关闭"、可选"x 停止"，再接额外子节点。
 */
function TaskDetailFooterHints(props) {
  let $ = useMemoCache(9);
  let { showBack, showStop, children } = props;
  let backHint;
  if ($[0] !== showBack) {
    backHint =
      showBack &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: "left",
        action: "go back",
      });
    $[0] = showBack;
    $[1] = backHint;
  } else backHint = $[1];
  let closeHint;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    closeHint = jsxProd_default(KeyboardShortcutHint, {
      chord: ["escape", "enter", "space"],
      action: "close",
    });
    $[2] = closeHint;
  } else closeHint = $[2];
  let stopHint;
  if ($[3] !== showStop) {
    stopHint =
      showStop &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: "x",
        action: "stop",
      });
    $[3] = showStop;
    $[4] = stopHint;
  } else stopHint = $[4];
  let bylineElement;
  if ($[5] !== children || $[6] !== backHint || $[7] !== stopHint) {
    bylineElement = jsxProd_default_2(Byline, {
      children: [backHint, closeHint, stopHint, children],
    });
    $[5] = children;
    $[6] = backHint;
    $[7] = stopHint;
    $[8] = bylineElement;
  } else bylineElement = $[8];
  return bylineElement;
}
//@ chunk-18hwfzwa.js:691937-692158 fingerprint = describeTeammateActivity (0.921)
function describeTeammateActivity(t) {
  if (t.awaitingPlanApproval) return "awaiting approval";
  if (t.isIdle) return "idle";
  return (
    (t.progress?.recentActivities && summarizeRecentActivities(t.progress.recentActivities)) ??
    t.progress?.lastActivity?.activityDescription ??
    "working"
  );
}
export {
  shouldHideTasksFooter,
  isTerminalStatus,
  getTaskStatusColor,
  getTaskStatusIcon,
  TaskDetailFooterHints,
  describeTeammateActivity,
};
