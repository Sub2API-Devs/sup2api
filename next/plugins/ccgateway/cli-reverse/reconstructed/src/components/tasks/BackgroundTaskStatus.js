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
import { countNonAmbientTasks } from "../../utils/tasks.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useAppState } from "../../state/AppState.js";
import { EARLY_RETURN_SENTINEL, MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { shouldHideTasksFooter } from "./taskStatusUtils.js";
import {
  jsxProd_default_2,
  Fragment,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { getPillLabelWithExtra, pillNeedsCta } from "../../tasks/pillLabel.js";
import { Text, Box } from "../../ink/components/Text.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { useState } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-e6aww6q8.js:293537-293658 fingerprint = _temp0 (0.314)
/**
 * 判断转录条目是否位于最后一个压缩边界之前（attribution-snapshot 需在最后一个非保留边界之后才算）。
 */
function isBeforeCompactBoundary(pill, { idx, type: entryType }) {
  return (
    idx < pill.lastBoundaryIdx &&
    (entryType !== "attribution-snapshot" || idx > pill.lastNonPreservedBoundaryIdx)
  );
}
//@ chunk-18hwfzwa.js:133842-133882 fingerprint = _temp4 (1)
function selectExpandedView(s_1) {
  return s_1.expandedView;
}
//@ chunk-18hwfzwa.js:444877-444973 fingerprint = _temp6 (1)
function isTaskStillActive(t_1) {
  if (t_1.type === "in_process_teammate") return !isTerminalTaskStatus(t_1.status);
  return !isTerminalTaskStatus(t_1.status) || hasCompletedWithFindings(t_1);
}
//@ chunk-18hwfzwa.js:805876-805909 callgraph-fingerprint = _temp (1)
function selectTasks_3(s) {
  return s.tasks;
}
//@ chunk-18hwfzwa.js:805909-805963 layout
function countRemoteBackgroundTasks(appState) {
  return countNonAmbientTasks(appState.remoteBackgroundTasks);
}
//@ chunk-18hwfzwa.js:805963-806502 fingerprint = BackgroundTaskStatus (0.373)
function BackgroundTaskStatus(props) {
  let $ = useMemoCache(8);
  let { tasksSelected, onOpenDialog } = props;
  let tasks = useAppState(selectTasks_3);
  let viewingAgentTaskId = useAppState(countRemoteBackgroundTasks);
  let footerElement;
  let earlyReturnValue;
  if ($[0] !== viewingAgentTaskId || $[1] !== onOpenDialog || $[2] !== tasks || $[3] !== tasksSelected) {
    earlyReturnValue = EARLY_RETURN_SENTINEL;
    We: {
      let tasks_2 = Object.values(tasks ?? {}).filter(shouldHideTasksFooter);
      if (tasks_2.length + viewingAgentTaskId === 0) {
        earlyReturnValue = null;
        break We;
      }
      let onClick;
      if ($[6] !== onOpenDialog) {
        onClick = onOpenDialog && (() => onOpenDialog());
        $[6] = onOpenDialog;
        $[7] = onClick;
      } else onClick = $[7];
      footerElement = jsxProd_default_2(Fragment, {
        children: [
          jsxProd_default(SummaryPill, {
            selected: tasksSelected,
            onClick,
            children: getPillLabelWithExtra(tasks_2, viewingAgentTaskId),
          }),
          pillNeedsCta(tasks_2) &&
            jsxProd_default_2(Text, {
              dimColor: true,
              children: [" \xB7 ", figures_default.arrowDown, " to view"],
            }),
        ],
      });
    }
    $[0] = viewingAgentTaskId;
    $[1] = onOpenDialog;
    $[2] = tasks;
    $[3] = tasksSelected;
    $[4] = footerElement;
    $[5] = earlyReturnValue;
  } else {
    footerElement = $[4];
    earlyReturnValue = $[5];
  }
  if (earlyReturnValue !== EARLY_RETURN_SENTINEL) return earlyReturnValue;
  return footerElement;
}
//@ chunk-18hwfzwa.js:806502-806983 fingerprint = SummaryPill (0.795)
function SummaryPill(props) {
  let $ = useMemoCache(8);
  let { selected, onClick, children } = props;
  let [hover, setHover] = useState(false);
  const inverse = selected || hover;
  let t2;
  if ($[0] !== children || $[1] !== inverse) {
    t2 = jsxProd_default(Text, {
      color: "background",
      inverse,
      children,
    });
    $[0] = children;
    $[1] = inverse;
    $[2] = t2;
  } else t2 = $[2];
  let label = t2;
  if (!onClick) {
    return label;
  }
  let onMouseEnter;
  let onMouseLeave;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    onMouseEnter = () => setHover(true);
    onMouseLeave = () => setHover(false);
    $[3] = onMouseEnter;
    $[4] = onMouseLeave;
  } else {
    onMouseEnter = $[3];
    onMouseLeave = $[4];
  }
  let t5;
  if ($[5] !== label || $[6] !== onClick) {
    t5 = jsxProd_default(Box, {
      onClick,
      onMouseEnter,
      onMouseLeave,
      children: label,
    });
    $[5] = label;
    $[6] = onClick;
    $[7] = t5;
  } else t5 = $[7];
  return t5;
}
export { selectExpandedView, isTaskStillActive, BackgroundTaskStatus, isBeforeCompactBoundary };
