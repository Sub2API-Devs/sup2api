/**
 * components/tasks/BackgroundTaskStatus.tsx
 *
 * 页脚后台任务状态汇总 pill（"N background · ↓ to view"）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/tasks/BackgroundTaskStatus.tsx
 * pieces: chunk-34x4ecrv.js (1), chunk-5xgkngpb.js (1), chunk-czq1j3j2.js (4), chunk-wjygkcr4.js (1)
 * attribution: fingerprint 5, callgraph-fingerprint 2
 */
import { isTerminalTaskStatus } from "../../tasks/taskStatus.js";
import { isParkedMcpTask, skipsTranscript, isLocalScriptTask } from "../../tasks/taskKinds.js";
import { codeModeAccepted } from "../../utils/codeMode/accepted.js";
import { isRemoteWorkScreen, useHasRemoteWork } from "./remoteTaskStatus.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useAppState } from "../../state/AppState.js";
import { shouldHideTasksFooter } from "./taskStatusUtils.js";
import { getPillLabelWithExtra, pillNeedsCta } from "../../tasks/pillLabel.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { useState } from "../../../vendor/react/cjs/react.production.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";

//@ chunk-5xgkngpb.js:294226-294347 fingerprint (2.1.88 match: _temp0, 0.314)
/**
 * 判断转录条目是否位于最后一个压缩边界之前（attribution-snapshot 需在最后一个非保留边界之后才算）。
 */
function isBeforeCompactBoundary(pill, { idx, type: entryType }) {
  return (
    idx < pill.lastBoundaryIdx &&
    (entryType !== "attribution-snapshot" || idx > pill.lastNonPreservedBoundaryIdx)
  );
}
//@ chunk-34x4ecrv.js:17193-17292 fingerprint (2.1.88 match: _temp6, 1)
function isDisplayableTranscriptTask(t_1) {
  return (
    !isTerminalTaskStatus(t_1.status) &&
    t_1.type !== "in_process_teammate" &&
    !isParkedMcpTask(t_1) &&
    !skipsTranscript(t_1) &&
    !(codeModeAccepted() && isLocalScriptTask(t_1))
  );
}
//@ chunk-wjygkcr4.js:12793-12956 callgraph-fingerprint (2.1.88 match: _temp5, 0.472)
function countNonAmbientTasks(remoteBackgroundTasks, localWorkflowsEnabled) {
  if (remoteBackgroundTasks.length === 0) return [];
  let workflowsEnabled = localWorkflowsEnabled ?? isRemoteWorkScreen();
  return remoteBackgroundTasks.filter(
    (task) =>
      !task.ambient &&
      task.taskType !== "in_process_teammate" &&
      !(task.taskType === "local_workflow" && workflowsEnabled),
  );
}
//@ chunk-czq1j3j2.js:134956-134996 fingerprint (2.1.88 match: _temp4, 1)
function selectExpandedView(s_1) {
  return s_1.expandedView;
}
//@ chunk-czq1j3j2.js:838353-838386 callgraph-fingerprint (2.1.88 match: _temp, 1)
function selectTasks_4(s) {
  return s.tasks;
}
//@ chunk-czq1j3j2.js:838386-839223 fingerprint (2.1.88 match: BackgroundTaskStatus, 0.364)
function BackgroundTaskStatus(props) {
  let $ = useMemoCache(16);
  let { tasksSelected, onOpenDialog } = props;
  let tasks = useAppState(selectTasks_4);
  let footerTasks;
  if ($[0] !== tasks) {
    footerTasks = Object.values(tasks ?? {}).filter(shouldHideTasksFooter);
    $[0] = tasks;
    $[1] = footerTasks;
  } else footerTasks = $[1];
  let tasks_2 = footerTasks;
  let localWorkflowsEnabled = useHasRemoteWork();
  let pillLabelByState;
  if ($[2] !== localWorkflowsEnabled || $[3] !== tasks_2) {
    pillLabelByState = (t_3) => {
      let remoteTasks = countNonAmbientTasks(t_3.remoteBackgroundTasks, localWorkflowsEnabled);
      return tasks_2.length + remoteTasks.length > 0 ? getPillLabelWithExtra(tasks_2, remoteTasks) : null;
    };
    $[2] = localWorkflowsEnabled;
    $[3] = tasks_2;
    $[4] = pillLabelByState;
  } else pillLabelByState = $[4];
  let appState = useAppState(pillLabelByState);
  if (appState === null) {
    return null;
  }
  let onClick;
  if ($[5] !== onOpenDialog) {
    onClick = onOpenDialog && (() => onOpenDialog());
    $[5] = onOpenDialog;
    $[6] = onClick;
  } else onClick = $[6];
  let footerElement;
  if ($[7] !== appState || $[8] !== onClick || $[9] !== tasksSelected) {
    footerElement = jsxProd_default(SummaryPill, {
      selected: tasksSelected,
      onClick,
      children: appState,
    });
    $[7] = appState;
    $[8] = onClick;
    $[9] = tasksSelected;
    $[10] = footerElement;
  } else footerElement = $[10];
  let ctaHint;
  if ($[11] !== tasks_2) {
    ctaHint =
      pillNeedsCta(tasks_2) &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: [" \xB7 ", figures_default.arrowDown, " to view"],
      });
    $[11] = tasks_2;
    $[12] = ctaHint;
  } else ctaHint = $[12];
  let earlyReturnValue;
  if ($[13] !== footerElement || $[14] !== ctaHint) {
    earlyReturnValue = jsxProd_default_2(Fragment, {
      children: [footerElement, ctaHint],
    });
    $[13] = footerElement;
    $[14] = ctaHint;
    $[15] = earlyReturnValue;
  } else earlyReturnValue = $[15];
  return earlyReturnValue;
}
//@ chunk-czq1j3j2.js:839223-839704 fingerprint (2.1.88 match: SummaryPill, 0.795)
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
export {
  BackgroundTaskStatus,
  isDisplayableTranscriptTask,
  isBeforeCompactBoundary,
  selectExpandedView,
  countNonAmbientTasks,
};
