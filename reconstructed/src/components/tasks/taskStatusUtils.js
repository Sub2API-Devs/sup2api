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
import { BLACK_CIRCLE, PAUSE_GLYPH } from "../../utils/permissions/autoModeRulesPrompt.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { FLAG_IDLE_WINDOW } from "../../tasks/LocalAgentTask/keepalive.js";
import { SNe, isPanelAgentTask } from "../../tasks/taskKinds.js";
import { isCoordinatorPanelActive, Hn } from "../../utils/transcriptDiagnostics.js";
import { waitForTaskCompletion } from "../../tools/TaskOutputTool/TaskOutputTool.js";
import { isBackgroundTask } from "../../tasks/types.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { Byline } from "../design-system/Byline.js";
import { summarizeRecentActivities } from "../../utils/collapseReadSearch.js";

//@ chunk-ah34pb7m.js:11869-12036 fingerprint = getTaskStatusIcon (0.527)
function getTaskStatusIcon(m) {
  if (m === "running") return BLACK_CIRCLE;
  if (m === "completed") return re.tick;
  if (m === "failed" || m === "killed") return re.cross;
  if (m === "paused") return PAUSE_GLYPH;
  return re.circle;
}
//@ chunk-ah34pb7m.js:12036-12200 fingerprint = getTaskStatusColor (0.743)
function getTaskStatusColor(m) {
  if (m === "completed") return "success";
  if (m === "failed") return "error";
  if (m === "killed") return "warning";
  if (m === "paused") return "warning";
  return "background";
}
//@ chunk-ah34pb7m.js:12331-12424 placement
function isTerminalStatus(status) {
  return (
    status.status === "completed" && [...(status.keepaliveReasons ?? [])].some((d) => d !== FLAG_IDLE_WINDOW)
  );
}
//@ chunk-ah34pb7m.js:12424-12578 callgraph-witnessed = shouldHideTasksFooter (0.373)
function shouldHideTasksFooter(m) {
  if (SNe(m)) return !1;
  if (isCoordinatorPanelActive()) return waitForTaskCompletion(m) || isBackgroundTask(m);
  return (
    waitForTaskCompletion(m) &&
    m.type !== "local_workflow" &&
    !(Hn() && (isPanelAgentTask(m) || m.type === "in_process_teammate"))
  );
}
/**
 * 任务详情对话框的底部快捷键提示：可选"← 返回"、"Esc/Enter/Space 关闭"、可选"x 停止"，再接额外子节点。
 */
//@ chunk-18hwfzwa.js:687040-687519 placement
function TaskDetailFooterHints(h) {
  let $ = w(9),
    { showBack: showBack, showStop: showStop, children: children } = h,
    ke;
  if ($[0] !== showBack)
    ((ke = showBack && e(KeyboardShortcutHint, { chord: "left", action: "go back" })),
      ($[0] = showBack),
      ($[1] = ke));
  else ke = $[1];
  let Re;
  if ($[2] === MEMO_CACHE_SENTINEL)
    ((Re = e(KeyboardShortcutHint, { chord: ["escape", "enter", "space"], action: "close" })), ($[2] = Re));
  else Re = $[2];
  let Be;
  if ($[3] !== showStop)
    ((Be = showStop && e(KeyboardShortcutHint, { chord: "x", action: "stop" })),
      ($[3] = showStop),
      ($[4] = Be));
  else Be = $[4];
  let He;
  if ($[5] !== children || $[6] !== ke || $[7] !== Be)
    ((He = r(Byline, { children: [ke, Re, Be, children] })),
      ($[5] = children),
      ($[6] = ke),
      ($[7] = Be),
      ($[8] = He));
  else He = $[8];
  return He;
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
