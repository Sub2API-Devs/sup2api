/**
 * components/tasks/CloudTasksDialog.tsx
 *
 * 2.1.316 新增。云任务对话框。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (7)
 * attribution: placement 7
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { isMenuOpen } from "../CustomSelect/select.js";
import { RemoteAgentTaskLabel } from "./RemoteSessionProgress.js";
import {
  init_react_production,
  useState,
  useRef,
  useLayoutEffect,
  useEffect,
} from "../../../vendor/react/cjs/react.production.js";
import { useRegisterOverlay } from "../../context/overlayContext.js";
import { useAppState } from "../../state/AppState.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { isRemoteControlChannelAvailable, getRemoteCaps } from "../../remote/remoteMode.js";
import { logEvent } from "../../services/analytics/index.js";
import { stripInvisibleChars as stripInvisibleChars_3 } from "../../utils/invisibleChars.js";
import { errorMessage } from "../../utils/errors.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { Byline } from "../design-system/Byline.js";
import { HintText } from "../design-system/HintText.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { GENERAL_PURPOSE_AGENT } from "../../tools/AgentTool/built-in/generalPurposeAgent.js";
import { Dialog } from "../design-system/Dialog.js";
import { FocusColumn } from "../design-system/FocusColumn.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:765561-765801 placement
/**
 * 列表分组标题："标签 (数量)"。
 */
function SectionHeading(props) {
  let $ = useMemoCache(5);
  let { label, size } = props;
  let labelElement;
  if ($[0] !== label) {
    labelElement = jsxProd_default(Text, {
      bold: true,
      children: label,
    });
    $[0] = label;
    $[1] = labelElement;
  } else labelElement = $[1];
  let headingElement;
  if ($[2] !== size || $[3] !== labelElement) {
    headingElement = jsxProd_default_2(Text, {
      dimColor: true,
      children: [labelElement, " (", size, ")"],
    });
    $[2] = size;
    $[3] = labelElement;
    $[4] = headingElement;
  } else headingElement = $[4];
  return headingElement;
}
//@ chunk-18hwfzwa.js:765801-766213 placement
/**
 * 任务列表项的标签：队友与远程代理用 RemoteAgentTaskLabel，其他直接显示 label。
 */
function TaskItemLabel(props) {
  let $ = useMemoCache(7);
  let { item } = props;
  const color = isMenuOpen() ? "suggestion" : undefined;
  let children;
  if ($[0] !== item.label || $[1] !== item.task || $[2] !== item.type) {
    children =
      item.type === "in_process_teammate" || item.type === "remote_agent"
        ? jsxProd_default(RemoteAgentTaskLabel, {
            task: item.task,
          })
        : item.label;
    $[0] = item.label;
    $[1] = item.task;
    $[2] = item.type;
    $[3] = children;
  } else children = $[3];
  let labelElement;
  if ($[4] !== color || $[5] !== children) {
    labelElement = jsxProd_default(Text, {
      color,
      wrap: "truncate-end",
      children,
    });
    $[4] = color;
    $[5] = children;
    $[6] = labelElement;
  } else labelElement = $[6];
  return labelElement;
}
//@ chunk-18hwfzwa.js:766213-766217 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:766213", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:766217-766266 placement
function selectRemoteBackgroundTasks(appState) {
  return appState.remoteBackgroundTasks;
}
//@ chunk-18hwfzwa.js:766266-766318 placement
function selectRemoteWorkerReportedGone_2(appState) {
  return appState.remoteWorkerReportedGone;
}
//@ chunk-18hwfzwa.js:766318-766334 placement
function noopCloudTaskChange() {}
//@ chunk-18hwfzwa.js:766334-769919 placement
/**
 * CloudTasksDialog：查看云端任务的对话框。
 */
function CloudTasksDialog(props) {
  let $ = useMemoCache(50);
  let { onDone } = props;
  useRegisterOverlay("cloud-tasks-dialog");
  let appState = useAppState(selectRemoteBackgroundTasks);
  let appState_2 = useAppState(selectRemoteWorkerReportedGone_2);
  let [focusedTaskId, setFocusedTaskId] = useState(undefined);
  let emptySet;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    emptySet = new Set();
    $[0] = emptySet;
  } else emptySet = $[0];
  let [stoppingIds, setStoppingIds] = useState(emptySet);
  let emptySet_2;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    emptySet_2 = new Set();
    $[1] = emptySet_2;
  } else emptySet_2 = $[1];
  let [stoppedIds, setStoppedIds] = useState(emptySet_2);
  let isNotStopped;
  if ($[2] !== stoppedIds) {
    isNotStopped = (task) => !stoppedIds.has(task.id);
    $[2] = stoppedIds;
    $[3] = isNotStopped;
  } else isNotStopped = $[3];
  let filtered = appState.filter(isNotStopped);
  let [stopError, setStopError] = useState(null);
  let remoteCapsAvailable;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    remoteCapsAvailable = isRemoteControlChannelAvailable();
    $[4] = remoteCapsAvailable;
  } else remoteCapsAvailable = $[4];
  let isRemoteControlAvailable = remoteCapsAvailable;
  let canStop = isRemoteControlAvailable && !appState_2;
  let skipFirstConfirmRef = useRef(false);
  let focusStale = focusedTaskId !== undefined && !filtered.some((task) => task.id === focusedTaskId);
  let markSkipConfirm;
  let markSkipConfirmDeps;
  if ($[5] !== focusStale) {
    markSkipConfirm = () => {
      if (focusStale) skipFirstConfirmRef.current = true;
    };
    markSkipConfirmDeps = [focusStale];
    $[5] = focusStale;
    $[6] = markSkipConfirm;
    $[7] = markSkipConfirmDeps;
  } else {
    markSkipConfirm = $[6];
    markSkipConfirmDeps = $[7];
  }
  useLayoutEffect(markSkipConfirm, markSkipConfirmDeps);
  let logShown;
  if ($[8] !== filtered.length || $[9] !== appState_2) {
    logShown = () => {
      logEvent("tengu_remote_background_tasks_shown", {
        count: filtered.length,
        worker_reported_gone: appState_2,
      });
    };
    $[8] = filtered.length;
    $[9] = appState_2;
    $[10] = logShown;
  } else logShown = $[10];
  let logShownDeps;
  if ($[11] === MEMO_CACHE_SENTINEL) {
    logShownDeps = [];
    $[11] = logShownDeps;
  } else logShownDeps = $[11];
  useEffect(logShown, logShownDeps);
  let onCancel;
  if ($[12] !== onDone) {
    onCancel = () =>
      onDone("Background dialog dismissed", {
        display: "skip",
      });
    $[12] = onDone;
    $[13] = onCancel;
  } else onCancel = $[13];
  let onCancel_2 = onCancel;
  let handleKeyDown;
  if (
    $[14] !== focusedTaskId ||
    $[15] !== focusStale ||
    $[16] !== isRemoteControlAvailable ||
    $[17] !== setStopError ||
    $[18] !== stoppingIds ||
    $[19] !== filtered[0]?.id ||
    $[20] !== filtered.length ||
    $[21] !== appState_2
  ) {
    handleKeyDown = function onKeyDown(event) {
      if (event.key !== "x" || event.ctrl || event.meta || !isRemoteControlAvailable) {
        return;
      }
      if (appState_2) {
        if (filtered.length > 0) logEvent("tengu_remote_background_tasks_stop_unavailable", {});
        return;
      }
      event.stopImmediatePropagation();
      if (skipFirstConfirmRef.current || focusStale) {
        skipFirstConfirmRef.current = false;
        return;
      }
      let targetId = focusedTaskId ?? filtered[0]?.id;
      let remoteCaps = getRemoteCaps();
      if (targetId === undefined || stoppingIds.has(targetId) || !remoteCaps) {
        return;
      }
      setStoppingIds((prevIds) => new Set(prevIds).add(targetId));
      setStopError(null);
      remoteCaps
        .sendControlRequest({
          subtype: "stop_task",
          task_id: targetId,
        })
        .then(
          () => setStoppedIds((prevIds) => new Set(prevIds).add(targetId)),
          (error) => setStopError(`Couldn't stop it: ${stripInvisibleChars_3(errorMessage(error))}`),
        )
        .finally(() =>
          setStoppingIds((prevIds) => {
            let nextIds = new Set(prevIds);
            nextIds.delete(targetId);
            return nextIds;
          }),
        );
    };
    $[14] = focusedTaskId;
    $[15] = focusStale;
    $[16] = isRemoteControlAvailable;
    $[17] = setStopError;
    $[18] = stoppingIds;
    $[19] = filtered[0]?.id;
    $[20] = filtered.length;
    $[21] = appState_2;
    $[22] = handleKeyDown;
  } else handleKeyDown = $[22];
  let onKeyDown = handleKeyDown;
  const subtitle =
    appState_2 && filtered.length > 0
      ? "The cloud session may have stopped, and its tasks too"
      : "Running in the cloud session";
  let navigateHint;
  if ($[23] !== filtered.length) {
    navigateHint =
      filtered.length > 0 &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: ["up", "down"],
        action: "navigate",
      });
    $[23] = filtered.length;
    $[24] = navigateHint;
  } else navigateHint = $[24];
  let stopHint;
  if ($[25] !== canStop || $[26] !== filtered.length) {
    stopHint =
      filtered.length > 0 &&
      canStop &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: "x",
        action: "stop",
      });
    $[25] = canStop;
    $[26] = filtered.length;
    $[27] = stopHint;
  } else stopHint = $[27];
  let escapeHint;
  if ($[28] === MEMO_CACHE_SENTINEL) {
    escapeHint = jsxProd_default(KeyboardShortcutHint, {
      chord: "escape",
      action: "close",
    });
    $[28] = escapeHint;
  } else escapeHint = $[28];
  let inputGuide;
  if ($[29] !== navigateHint || $[30] !== stopHint) {
    inputGuide = jsxProd_default_2(Byline, {
      children: [navigateHint, stopHint, escapeHint],
    });
    $[29] = navigateHint;
    $[30] = stopHint;
    $[31] = inputGuide;
  } else inputGuide = $[31];
  let taskListElement;
  if ($[32] !== onCancel_2 || $[33] !== stoppingIds || $[34] !== filtered) {
    taskListElement =
      filtered.length === 0
        ? jsxProd_default(HintText, {
            children: "No tasks currently running",
          })
        : jsxProd_default(ModelSelector, {
            options: filtered.map((task) => ({
              value: task.id,
              label:
                (task.description || stripInvisibleChars_3(task.id)) +
                (stoppingIds.has(task.id) ? " \xB7 stopping\u2026" : ""),
              description:
                task.subagentType && task.subagentType !== GENERAL_PURPOSE_AGENT.agentType
                  ? task.subagentType
                  : task.taskType?.replace(/^local_/, ""),
            })),
            onFocus: setFocusedTaskId,
            onChange: noopCloudTaskChange,
            onCancel: onCancel_2,
            visibleOptionCount: 10,
            hideIndexes: true,
          });
    $[32] = onCancel_2;
    $[33] = stoppingIds;
    $[34] = filtered;
    $[35] = taskListElement;
  } else taskListElement = $[35];
  let errorElement;
  if ($[36] !== stopError) {
    errorElement =
      stopError !== null &&
      jsxProd_default(Text, {
        color: "error",
        children: stopError,
      });
    $[36] = stopError;
    $[37] = errorElement;
  } else errorElement = $[37];
  let noteElement;
  if ($[38] === MEMO_CACHE_SENTINEL) {
    noteElement = jsxProd_default(Text, {
      dimColor: true,
      wrap: "wrap-trim",
      children:
        "Each task's output reaches the transcript when it finishes; a per-task view isn't sent to this terminal.",
    });
    $[38] = noteElement;
  } else noteElement = $[38];
  let footerElement;
  if ($[39] !== errorElement) {
    footerElement = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [errorElement, noteElement],
    });
    $[39] = errorElement;
    $[40] = footerElement;
  } else footerElement = $[40];
  let children;
  if (
    $[41] !== onCancel_2 ||
    $[42] !== subtitle ||
    $[43] !== inputGuide ||
    $[44] !== taskListElement ||
    $[45] !== footerElement
  ) {
    children = jsxProd_default_2(Dialog, {
      title: "Background",
      subtitle,
      onCancel: onCancel_2,
      color: "background",
      inputGuide,
      children: [taskListElement, footerElement],
    });
    $[41] = onCancel_2;
    $[42] = subtitle;
    $[43] = inputGuide;
    $[44] = taskListElement;
    $[45] = footerElement;
    $[46] = children;
  } else children = $[46];
  let dialogElement;
  if ($[47] !== onKeyDown || $[48] !== children) {
    dialogElement = jsxProd_default(FocusColumn, {
      onKeyDown,
      children,
    });
    $[47] = onKeyDown;
    $[48] = children;
    $[49] = dialogElement;
  } else dialogElement = $[49];
  return dialogElement;
}
export { CloudTasksDialog, SectionHeading, TaskItemLabel };
