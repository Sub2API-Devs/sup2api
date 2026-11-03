/**
 * components/tasks/BackgroundTaskStatus.tsx
 *
 * 页脚后台任务状态汇总 pill（"N background · ↓ to view"）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/tasks/BackgroundTaskStatus.tsx
 * pieces: chunk-18hwfzwa.js (6), chunk-e6aww6q8.js (1)
 * attribution: fingerprint 5, callgraph-fingerprint 1, layout 1
 */
import { isTerminalTaskStatus } from "../../Task.js";
import { hasCompletedWithFindings } from "../../tasks/LocalAgentTask/LocalAgentTask.js";
import { bWe } from "../../utils/claudeInChrome/toolRendering.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useAppState } from "../../state/AppState.js";
import { EARLY_RETURN_SENTINEL, MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { shouldHideTasksFooter } from "./taskStatusUtils.js";
import { r, Fragment, e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { getPillLabelWithExtra, pillNeedsCta } from "../../tasks/pillLabel.js";
import { Text, Box } from "../../ink/components/Text.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { y } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-18hwfzwa.js:133842-133882 fingerprint = _temp4 (1)
function selectExpandedView(s_1) {
  return s_1.expandedView;
}
//@ chunk-18hwfzwa.js:444877-444973 fingerprint = _temp6 (1)
function hO(t_1) {
  if (t_1.type === "in_process_teammate") return !isTerminalTaskStatus(t_1.status);
  return !isTerminalTaskStatus(t_1.status) || hasCompletedWithFindings(t_1);
}
//@ chunk-18hwfzwa.js:805876-805909 callgraph-fingerprint = _temp (1)
function selectTasks_2(s) {
  return s.tasks;
}
//@ chunk-18hwfzwa.js:805909-805963 layout
function oeo(rt) {
  return bWe(rt.remoteBackgroundTasks);
}
//@ chunk-18hwfzwa.js:805963-806502 fingerprint = BackgroundTaskStatus (0.373)
function BackgroundTaskStatus(t0) {
  let $ = w(8),
    { tasksSelected: tasksSelected, onOpenDialog: onOpenDialog } = t0,
    tasks = useAppState(selectTasks_2),
    viewingAgentTaskId = useAppState(oeo),
    Re,
    Be;
  if ($[0] !== viewingAgentTaskId || $[1] !== onOpenDialog || $[2] !== tasks || $[3] !== tasksSelected) {
    Be = EARLY_RETURN_SENTINEL;
    We: {
      let filtered = Object.values(tasks ?? {}).filter(shouldHideTasksFooter);
      if (filtered.length + viewingAgentTaskId === 0) {
        Be = null;
        break We;
      }
      let ze;
      if ($[6] !== onOpenDialog)
        ((ze = onOpenDialog && (() => onOpenDialog())), ($[6] = onOpenDialog), ($[7] = ze));
      else ze = $[7];
      Re = r(Fragment, {
        children: [
          e(SummaryPill, {
            selected: tasksSelected,
            onClick: ze,
            children: getPillLabelWithExtra(filtered, viewingAgentTaskId),
          }),
          pillNeedsCta(filtered) && r(Text, { dimColor: !0, children: [" \xB7 ", re.arrowDown, " to view"] }),
        ],
      });
    }
    (($[0] = viewingAgentTaskId),
      ($[1] = onOpenDialog),
      ($[2] = tasks),
      ($[3] = tasksSelected),
      ($[4] = Re),
      ($[5] = Be));
  } else ((Re = $[4]), (Be = $[5]));
  if (Be !== EARLY_RETURN_SENTINEL) return Be;
  return Re;
}
//@ chunk-18hwfzwa.js:806502-806983 fingerprint = SummaryPill (0.795)
function SummaryPill(t0) {
  let $ = w(8),
    { selected: selected, onClick: onClick, children: children } = t0,
    [ee, ke] = y(!1);
  const t1 = selected || ee;
  let He;
  if ($[0] !== children || $[1] !== t1)
    ((He = e(Text, { color: "background", inverse: t1, children: children })),
      ($[0] = children),
      ($[1] = t1),
      ($[2] = He));
  else He = $[2];
  let label = He;
  if (!onClick) {
    return label;
  }
  let ze, Xe;
  if ($[3] === MEMO_CACHE_SENTINEL) ((ze = () => ke(!0)), (Xe = () => ke(!1)), ($[3] = ze), ($[4] = Xe));
  else ((ze = $[3]), (Xe = $[4]));
  let rt;
  if ($[5] !== label || $[6] !== onClick)
    ((rt = e(Box, { onClick: onClick, onMouseEnter: ze, onMouseLeave: Xe, children: label })),
      ($[5] = label),
      ($[6] = onClick),
      ($[7] = rt));
  else rt = $[7];
  return rt;
}
/**
 * 判断转录条目是否位于最后一个压缩边界之前（attribution-snapshot 需在最后一个非保留边界之后才算）。
 */
//@ chunk-e6aww6q8.js:293537-293658 fingerprint = _temp0 (0.314)
function isBeforeCompactBoundary(pill, { idx: idx, type: r }) {
  return (
    idx < pill.lastBoundaryIdx && (r !== "attribution-snapshot" || idx > pill.lastNonPreservedBoundaryIdx)
  );
}

export { selectExpandedView, hO, BackgroundTaskStatus, isBeforeCompactBoundary };
