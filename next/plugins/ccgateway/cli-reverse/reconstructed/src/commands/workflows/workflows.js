/**
 * commands/workflows/workflows.tsx
 *
 * 2.1.316 新增：工作流运行列表/详情视图（键盘导航、控制按钮）；云端工作流对话框等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0p9n1dy7.js (1), chunk-czq1j3j2.js (25), chunk-w8d47f3d.js (1)
 * attribution: placement 27
 */
import { countWhere } from "../../utils/collections.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useRegisterOverlay } from "../../context/overlayContext.js";
import { readWorkflowSnapshot } from "../../services/workflow/snapshots.js";
import {
  useState,
  suspenseTypeExport,
  use,
  useRef,
  useEffect,
  init_react_production,
} from "../../../vendor/react/cjs/react.production.js";
import { MEMO_CACHE_SENTINEL, EARLY_RETURN_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Byline } from "../../components/design-system/Byline.js";
import { KeyboardShortcutHint } from "../../components/design-system/KeyboardShortcutHint.js";
import { WorkerBadge } from "../../components/permissions/WorkerBadge.js";
import { Dialog } from "../../components/design-system/Dialog.js";
import { useAppState } from "../../state/AppState.js";
import { useTaskFramework } from "../../context/voice.js";
import {
  killWorkflowTask as killWorkflowTask_2,
  pauseWorkflowTask as pauseWorkflowTask_2,
  skipWorkflowAgent as skipWorkflowAgent_2,
  retryWorkflowAgent as retryWorkflowAgent_2,
} from "../../tasks/LocalWorkflowTask/LocalWorkflowTask.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { WorkflowDetailDialog as WorkflowDetailDialog_2 } from "../../components/workflows/WorkflowDetailDialog.js";
import { parseWorkflowScript } from "../../services/workflows/workflowScriptMeta.js";
import { slugifyWorkflowName } from "../../services/workflow/scriptFile.js";
import { WorkflowSaveDialog } from "../../components/workflows/WorkflowSaveDialog.js";
import { Text } from "../../ink/components/Text.js";
import { HintText } from "../../components/design-system/HintText.js";
import { OrderedListWithItem } from "../../components/CustomSelect/selectTable.js";
import { formatDuration, formatTokens } from "../../utils/format.js";
import { plural } from "../../utils/stringUtils.js";
import { StatusIcon } from "../../components/design-system/StatusIcon.js";
import { SnapshotCache } from "../../remote/remoteSessionEvents.js";
import { useNotifications } from "../../context/notifications.js";
import { useNowTicker } from "../../components/StatusNotices.js";
import { canStopRemoteWorkflow, stopRemoteWorkflow } from "../../components/CoordinatorAgentStatus.js";
import { getRemoteCaps } from "../../remote/remoteMode.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-0p9n1dy7.js:20544-20997 placement
/**
 * 把云端工作流记录转换成 local_workflow 任务对象。
 */
function cloudWorkflowToTask(workflow, progress, stoppedAt) {
  let isStopped = stoppedAt !== undefined && workflow.status === "running";
  return {
    id: workflow.id,
    type: "local_workflow",
    description: workflow.description || "Dynamic workflow",
    status: isStopped ? "killed" : workflow.status,
    startTime: workflow.startTime,
    endTime: isStopped ? stoppedAt : workflow.endTime,
    outputFile: "",
    outputOffset: 0,
    notified: true,
    script: "",
    prompt: "",
    workflowName: workflow.workflowName,
    workflowProgress: progress,
    progressVersion: 0,
    agentCount: countWhere(progress, (entry) => entry.type === "workflow_agent"),
    totalTokens: workflow.totalTokens,
    totalToolCalls: workflow.totalToolCalls,
    logs: [],
  };
}
//@ chunk-czq1j3j2.js:791025-791049 placement
function emptyArrayOnError() {
  return [];
}
//@ chunk-czq1j3j2.js:791049-791082 placement
function selectTasks_3(state) {
  return state.tasks;
}
//@ chunk-czq1j3j2.js:791082-791133 placement
function isLocalWorkflowTask(task) {
  return task.type === "local_workflow";
}
//@ chunk-czq1j3j2.js:791133-791174 placement
function workflowRunIdOf(run) {
  return run.workflowRunId;
}
//@ chunk-czq1j3j2.js:791174-791202 placement
function truthy(value) {
  return !!value;
}
//@ chunk-czq1j3j2.js:791202-791252 placement
function snapshotToRun(snapshot) {
  return {
    task: workflowSnapshotToTask(snapshot),
    snapshot,
  };
}
//@ chunk-czq1j3j2.js:791252-791285 placement
function taskToRun(task) {
  return {
    task,
  };
}
//@ chunk-czq1j3j2.js:791285-791348 placement (2.1.88 match: getTotalDuration, 0.657)
function getTotalDuration(first, second) {
  return second.task.startTime - first.task.startTime;
}
//@ chunk-czq1j3j2.js:791348-791399 placement
function isRunningItem(item) {
  return item.task.status === "running";
}
//@ chunk-czq1j3j2.js:791399-791980 placement
/**
 * 把工作流运行快照转换成 local_workflow 任务对象。
 */
function workflowSnapshotToTask(snapshot) {
  return {
    id: snapshot.taskId,
    type: "local_workflow",
    description: snapshot.summary ?? "Dynamic workflow",
    status: snapshot.status,
    startTime: snapshot.startTime,
    endTime: snapshot.startTime + snapshot.durationMs,
    toolUseId: undefined,
    outputFile: "",
    outputOffset: 0,
    notified: true,
    script: snapshot.script,
    scriptPath: snapshot.scriptPath,
    prompt: snapshot.script,
    summary: snapshot.summary,
    workflowName: snapshot.workflowName,
    phases: snapshot.phases,
    defaultModel: snapshot.defaultModel,
    workflowRunId: snapshot.runId,
    workflowProgress: snapshot.workflowProgress,
    progressVersion: 0,
    agentCount: snapshot.agentCount,
    totalTokens: snapshot.totalTokens ?? 0,
    totalToolCalls: snapshot.totalToolCalls ?? 0,
    logs: snapshot.logs,
    result: snapshot.result,
    error: snapshot.error,
  };
}
//@ chunk-czq1j3j2.js:791980-792054 placement
function dismissWorkflowsDialog(onDone) {
  onDone("Dynamic workflows dialog dismissed", {
    display: "system",
  });
}
//@ chunk-czq1j3j2.js:792054-792931 placement
/**
 * /workflows 历史对话框：加载本会话的动态工作流历史。
 */
function WorkflowHistoryDialog(props) {
  let $ = useMemoCache(15);
  let { onDone, storageV5, promptVisibleBelow } = props;
  useRegisterOverlay("workflow-history-dialog");
  let loadSnapshots;
  if ($[0] !== storageV5) {
    loadSnapshots = () => readWorkflowSnapshot(storageV5).catch(emptyArrayOnError);
    $[0] = storageV5;
    $[1] = loadSnapshots;
  } else loadSnapshots = $[1];
  let [snapshotsPromise] = useState(loadSnapshots);
  let onCancel;
  if ($[2] !== onDone) {
    onCancel = () => dismissWorkflowsDialog(onDone);
    $[2] = onDone;
    $[3] = onCancel;
  } else onCancel = $[3];
  let inputGuide;
  let children;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    inputGuide = jsxProd_default(Byline, {
      children: jsxProd_default(KeyboardShortcutHint, {
        chord: "escape",
        action: "close",
      }),
    });
    children = jsxProd_default(WorkerBadge, {
      message: "Loading dynamic workflow history\u2026",
      dimColor: true,
    });
    $[4] = inputGuide;
    $[5] = children;
  } else {
    inputGuide = $[4];
    children = $[5];
  }
  let fallback;
  if ($[6] !== onCancel) {
    fallback = jsxProd_default(Dialog, {
      title: "Dynamic workflows",
      onCancel,
      color: "background",
      inputGuide,
      children,
    });
    $[6] = onCancel;
    $[7] = fallback;
  } else fallback = $[7];
  let children_2;
  if ($[8] !== onDone || $[9] !== promptVisibleBelow || $[10] !== snapshotsPromise) {
    children_2 = jsxProd_default(WorkflowHistoryList, {
      snapshotsPromise,
      onDone,
      promptVisibleBelow,
    });
    $[8] = onDone;
    $[9] = promptVisibleBelow;
    $[10] = snapshotsPromise;
    $[11] = children_2;
  } else children_2 = $[11];
  let listElement;
  if ($[12] !== fallback || $[13] !== children_2) {
    listElement = jsxProd_default(suspenseTypeExport, {
      fallback,
      children: children_2,
    });
    $[12] = fallback;
    $[13] = children_2;
    $[14] = listElement;
  } else listElement = $[14];
  return listElement;
}
//@ chunk-czq1j3j2.js:792931-793849 placement
/**
 * 合并快照与当前任务，渲染动态工作流列表。
 */
function WorkflowHistoryList(props) {
  let $ = useMemoCache(11);
  let { snapshotsPromise, onDone, promptVisibleBelow } = props;
  let snapshots = use(snapshotsPromise);
  let appState = useAppState(selectTasks_3);
  let taskStore = useTaskFramework();
  let runs;
  if ($[0] !== snapshots || $[1] !== appState) {
    let filtered = Object.values(appState ?? {}).filter(isLocalWorkflowTask);
    let runningIds = new Set(filtered.map(workflowRunIdOf).filter(truthy));
    let mapped = snapshots.filter((snapshot) => !runningIds.has(snapshot.runId)).map(snapshotToRun);
    runs = [...filtered.map(taskToRun), ...mapped].sort(getTotalDuration);
    $[0] = snapshots;
    $[1] = appState;
    $[2] = runs;
  } else runs = $[2];
  let runs_2 = runs;
  let controlsFor;
  if ($[3] !== onDone || $[4] !== taskStore) {
    controlsFor = (run) => {
      let { id, status } = run;
      return {
        onResume: (message) =>
          onDone(message, {
            shouldQuery: true,
            display: "system",
            metaMessages: [message],
          }),
        ...(status === "running" && {
          onKill: () => killWorkflowTask_2(id, taskStore, "user"),
          onPause: () => pauseWorkflowTask_2(id, taskStore),
          onSkipAgent: (agentId) => skipWorkflowAgent_2(id, agentId, taskStore),
          onRetryAgent: (agentId) => retryWorkflowAgent_2(id, agentId, taskStore),
        }),
      };
    };
    $[3] = onDone;
    $[4] = taskStore;
    $[5] = controlsFor;
  } else controlsFor = $[5];
  let listElement;
  if ($[6] !== runs_2 || $[7] !== onDone || $[8] !== promptVisibleBelow || $[9] !== controlsFor) {
    listElement = jsxProd_default(WorkflowRunList, {
      runs: runs_2,
      controlsFor,
      emptyText: "No dynamic workflows in this session.",
      onDone,
      promptVisibleBelow,
    });
    $[6] = runs_2;
    $[7] = onDone;
    $[8] = promptVisibleBelow;
    $[9] = controlsFor;
    $[10] = listElement;
  } else listElement = $[10];
  return listElement;
}
//@ chunk-czq1j3j2.js:793849-798877 placement
/**
 * 工作流运行列表/详情视图（键盘导航、控制按钮）。
 */
function WorkflowRunList(props) {
  let $ = useMemoCache(81);
  let {
    runs,
    controlsFor,
    emptyText,
    initialRunId,
    keepsListOfOne,
    listNote,
    now,
    onDone,
    promptVisibleBelow,
  } = props;
  let keepsList = keepsListOfOne === undefined ? false : keepsListOfOne;
  let initialView;
  if ($[0] !== initialRunId || $[1] !== runs) {
    initialView = () => {
      let initialRun =
        runs.find((run) => run.task.id === initialRunId) ?? (runs.length === 1 ? runs[0] : undefined);
      return initialRun
        ? {
            mode: "detail",
            itemId: initialRun.task.id,
            isFromList: false,
          }
        : {
            mode: "list",
          };
    };
    $[0] = initialRunId;
    $[1] = runs;
    $[2] = initialView;
  } else initialView = $[2];
  let [view, setView] = useState(initialView);
  let [selectedIndex, setSelectedIndex] = useState(0);
  let initialSelectedId;
  if ($[3] !== initialRunId || $[4] !== runs) {
    initialSelectedId = () => (runs.some((run) => run.task.id === initialRunId) ? initialRunId : undefined);
    $[3] = initialRunId;
    $[4] = runs;
    $[5] = initialSelectedId;
  } else initialSelectedId = $[5];
  let [selectedId, setSelectedId] = useState(initialSelectedId);
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let singleRun = runs.length === 1 && !keepsList ? runs[0] : undefined;
  let effectiveView;
  if ($[6] !== singleRun || $[7] !== view) {
    effectiveView =
      view.mode === "list" && singleRun
        ? {
            mode: "detail",
            itemId: singleRun.task.id,
            isFromList: false,
          }
        : view;
    $[6] = singleRun;
    $[7] = view;
    $[8] = effectiveView;
  } else effectiveView = $[8];
  let activeView = effectiveView;
  if (activeView !== view) setView(activeView);
  let matchRun;
  if ($[9] !== selectedId) {
    matchRun = (run) => run.task.id === selectedId;
    $[9] = selectedId;
    $[10] = matchRun;
  } else matchRun = $[10];
  let index = runs.findIndex(matchRun);
  let currentIndex = index < 0 ? Math.min(selectedIndex, runs.length - 1) : index;
  let currentRun = runs[currentIndex];
  let [resetFlag, setResetFlag] = useState(false);
  if (selectedId !== undefined && index < 0) {
    setSelectedId(undefined);
    setResetFlag(true);
  }
  let handleBack;
  if (
    $[11] !== keepsList ||
    $[12] !== runs.length ||
    $[13] !== onDone ||
    $[14] !== activeView.isFromList ||
    $[15] !== activeView.mode
  ) {
    handleBack = () => {
      let isFromList = keepsList && activeView.mode === "detail" && activeView.isFromList;
      if (runs.length <= 1 && !isFromList) {
        dismissWorkflowsDialog(onDone);
        return;
      }
      setResetFlag(false);
      setView({
        mode: "list",
      });
    };
    $[11] = keepsList;
    $[12] = runs.length;
    $[13] = onDone;
    $[14] = activeView.isFromList;
    $[15] = activeView.mode;
    $[16] = handleBack;
  } else handleBack = $[16];
  let onBack = handleBack;
  if (activeView.mode === "detail") {
    let detailElement;
    let detailResult;
    if (
      $[17] !== controlsFor ||
      $[18] !== onBack ||
      $[19] !== runs ||
      $[20] !== onDone ||
      $[21] !== promptVisibleBelow ||
      $[22] !== activeView.itemId
    ) {
      detailResult = EARLY_RETURN_SENTINEL;
      Fo: {
        let matchItem;
        if ($[25] !== activeView.itemId) {
          matchItem = (run) => run.task.id === activeView.itemId;
          $[25] = activeView.itemId;
          $[26] = matchItem;
        } else matchItem = $[26];
        let found = runs.find(matchItem);
        if (!found) {
          detailResult =
            (setView({
              mode: "list",
            }),
            setResetFlag(true),
            null);
          break Fo;
        }
        let onDone_2;
        if ($[27] !== onDone) {
          onDone_2 = (message) =>
            message
              ? onDone(message, {
                  display: "system",
                })
              : onDone();
          $[27] = onDone;
          $[28] = onDone_2;
        } else onDone_2 = $[28];
        detailElement = jsxProd_default(
          WorkflowDetailDialog_2,
          {
            workflow: found.task,
            onDone: onDone_2,
            onBack,
            promptVisibleBelow,
            ...controlsFor(found.task),
          },
          found.task.id,
        );
      }
      $[17] = controlsFor;
      $[18] = onBack;
      $[19] = runs;
      $[20] = onDone;
      $[21] = promptVisibleBelow;
      $[22] = activeView.itemId;
      $[23] = detailElement;
      $[24] = detailResult;
    } else {
      detailElement = $[23];
      detailResult = $[24];
    }
    if (detailResult !== EARLY_RETURN_SENTINEL) return detailResult;
    return detailElement;
  }
  if (activeView.mode === "save") {
    let detailRun;
    let defaultName;
    let detailResult;
    if ($[29] !== runs || $[30] !== activeView.itemId) {
      detailResult = EARLY_RETURN_SENTINEL;
      or: {
        let matchItem;
        if ($[34] !== activeView.itemId) {
          matchItem = (run) => run.task.id === activeView.itemId;
          $[34] = activeView.itemId;
          $[35] = matchItem;
        } else matchItem = $[35];
        detailRun = runs.find(matchItem);
        if (!detailRun || detailRun.task.script.length === 0) {
          detailResult =
            (setView({
              mode: "list",
            }),
            null);
          break or;
        }
        let workflowScript = parseWorkflowScript(detailRun.task.script);
        defaultName = !("error" in workflowScript)
          ? workflowScript.meta.name
          : slugifyWorkflowName(detailRun.task.summary ?? detailRun.task.description);
      }
      $[29] = runs;
      $[30] = activeView.itemId;
      $[31] = detailRun;
      $[32] = defaultName;
      $[33] = detailResult;
    } else {
      detailRun = $[31];
      defaultName = $[32];
      detailResult = $[33];
    }
    if (detailResult !== EARLY_RETURN_SENTINEL) return detailResult;
    let defaultName_2 = defaultName;
    let onDone_2;
    if ($[36] !== onDone) {
      onDone_2 = (saveMessage) => {
        if (saveMessage)
          onDone(saveMessage, {
            display: "system",
          });
        else
          setView({
            mode: "list",
          });
      };
      $[36] = onDone;
      $[37] = onDone_2;
    } else onDone_2 = $[37];
    let saveDialogElement;
    if ($[38] !== defaultName_2 || $[39] !== detailRun.task.script || $[40] !== onDone_2) {
      saveDialogElement = jsxProd_default(WorkflowSaveDialog, {
        script: detailRun.task.script,
        defaultName: defaultName_2,
        onDone: onDone_2,
      });
      $[38] = defaultName_2;
      $[39] = detailRun.task.script;
      $[40] = onDone_2;
      $[41] = saveDialogElement;
    } else saveDialogElement = $[41];
    return saveDialogElement;
  }
  let runningCount = countWhere(runs, isRunningItem);
  let completedCount = runs.length - runningCount;
  let onCancelCached;
  if ($[42] !== onDone) {
    onCancelCached = () => dismissWorkflowsDialog(onDone);
    $[42] = onDone;
    $[43] = onCancelCached;
  } else onCancelCached = $[43];
  let onCancel = onCancelCached;
  let killHandlerCached;
  if ($[44] !== controlsFor) {
    killHandlerCached = (item) => {
      let { task } = item;
      return task.status === "running" ? controlsFor(task).onKill : undefined;
    };
    $[44] = controlsFor;
    $[45] = killHandlerCached;
  } else killHandlerCached = $[45];
  let killHandlerFor = killHandlerCached;
  let showHints = runs.length > 0 && !isScreenReaderEnabled;
  let subtitle;
  if ($[46] !== completedCount || $[47] !== listNote || $[48] !== runs.length || $[49] !== runningCount) {
    subtitle =
      runs.length === 0
        ? undefined
        : jsxProd_default(Text, {
            dimColor: true,
            children:
              listNote ??
              jsxProd_default_2(Byline, {
                children: [
                  runningCount > 0 && `${runningCount} running`,
                  completedCount > 0 && `${completedCount} completed`,
                ],
              }),
          });
    $[46] = completedCount;
    $[47] = listNote;
    $[48] = runs.length;
    $[49] = runningCount;
    $[50] = subtitle;
  } else subtitle = $[50];
  let selectHint;
  if ($[51] !== showHints) {
    selectHint =
      showHints &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: ["up", "down"],
        action: "select",
      });
    $[51] = showHints;
    $[52] = selectHint;
  } else selectHint = $[52];
  let viewHint;
  if ($[53] !== showHints) {
    viewHint =
      showHints &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: "enter",
        action: "view",
      });
    $[53] = showHints;
    $[54] = viewHint;
  } else viewHint = $[54];
  let stopHint;
  if ($[55] !== currentRun || $[56] !== showHints || $[57] !== killHandlerFor) {
    stopHint =
      showHints &&
      currentRun &&
      killHandlerFor(currentRun) &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: "x",
        action: "stop",
      });
    $[55] = currentRun;
    $[56] = showHints;
    $[57] = killHandlerFor;
    $[58] = stopHint;
  } else stopHint = $[58];
  let saveHint;
  if ($[59] !== currentRun || $[60] !== showHints) {
    saveHint =
      showHints &&
      currentRun &&
      currentRun.task.script.length > 0 &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: "s",
        action: "save",
      });
    $[59] = currentRun;
    $[60] = showHints;
    $[61] = saveHint;
  } else saveHint = $[61];
  let escapeHint;
  if ($[62] === MEMO_CACHE_SENTINEL) {
    escapeHint = jsxProd_default(KeyboardShortcutHint, {
      chord: "escape",
      action: "close",
    });
    $[62] = escapeHint;
  } else escapeHint = $[62];
  let inputGuide;
  if ($[63] !== selectHint || $[64] !== viewHint || $[65] !== stopHint || $[66] !== saveHint) {
    inputGuide = jsxProd_default_2(Byline, {
      children: [selectHint, viewHint, stopHint, saveHint, escapeHint],
    });
    $[63] = selectHint;
    $[64] = viewHint;
    $[65] = stopHint;
    $[66] = saveHint;
    $[67] = inputGuide;
  } else inputGuide = $[67];
  let children;
  if (
    $[68] !== emptyText ||
    $[69] !== currentIndex ||
    $[70] !== selectedId ||
    $[71] !== resetFlag ||
    $[72] !== runs ||
    $[73] !== now ||
    $[74] !== killHandlerFor
  ) {
    children =
      runs.length === 0
        ? jsxProd_default(HintText, {
            children: emptyText,
          })
        : jsxProd_default(OrderedListWithItem, {
            defaultFocusIndex: currentIndex,
            onFocus: (focusIndex) => {
              let id = runs[focusIndex]?.task.id;
              if (id !== selectedId && (selectedId !== undefined || focusIndex !== currentIndex))
                setResetFlag(false);
              setSelectedIndex(focusIndex);
              setSelectedId(id);
            },
            onSelect: (rowIndex) => {
              let run = runs[rowIndex];
              if (run) {
                setResetFlag(false);
                setView({
                  mode: "detail",
                  itemId: run.task.id,
                  isFromList: true,
                });
              }
            },
            onRowKeyDown: (event, rowIndex) => {
              let run = runs[rowIndex];
              if (!run || event.ctrl || event.meta) {
                return;
              }
              let killHandler = killHandlerFor(run);
              if (event.key === "x" && resetFlag) {
                event.preventDefault();
                setResetFlag(false);
              } else if (event.key === "x" && killHandler) {
                event.preventDefault();
                killHandler();
              } else if (event.key === "s" && run.task.script.length > 0) {
                event.preventDefault();
                setView({
                  mode: "save",
                  itemId: run.task.id,
                });
              }
            },
            children: runs.map((run) =>
              jsxProd_default(
                OrderedListWithItem.Item,
                {
                  ...workflowRunRow(run, now),
                },
                run.task.id,
              ),
            ),
          });
    $[68] = emptyText;
    $[69] = currentIndex;
    $[70] = selectedId;
    $[71] = resetFlag;
    $[72] = runs;
    $[73] = now;
    $[74] = killHandlerFor;
    $[75] = children;
  } else children = $[75];
  let dialogElement;
  if ($[76] !== onCancel || $[77] !== inputGuide || $[78] !== children || $[79] !== subtitle) {
    dialogElement = jsxProd_default(Dialog, {
      title: "Dynamic workflows",
      subtitle,
      onCancel,
      color: "background",
      inputGuide,
      children,
    });
    $[76] = onCancel;
    $[77] = inputGuide;
    $[78] = children;
    $[79] = subtitle;
    $[80] = dialogElement;
  } else dialogElement = $[80];
  return dialogElement;
}
//@ chunk-czq1j3j2.js:798877-799200 placement
/**
 * 生成一条工作流运行的显示行（名称、状态图标、耗时、令牌）。
 */
function workflowRunRow({ task, snapshot }, now) {
  let totalTokens = snapshot?.totalTokens ?? task.totalTokens ?? 0;
  let max = Math.max(0, (task.endTime ?? now ?? Date.now()) - task.startTime - (task.totalPausedMs ?? 0));
  return {
    label: task.workflowName ?? task.summary ?? task.description,
    icon: WORKFLOW_STATUS_ICONS[task.status],
    meta: [
      formatDuration(max),
      task.agentCount > 0 ? `${task.agentCount} ${plural(task.agentCount, "agent")}` : "",
      totalTokens > 0 ? `${formatTokens(totalTokens)} tok` : "",
    ],
  };
}
//@ chunk-czq1j3j2.js:799200-799446 placement
var WORKFLOW_STATUS_ICONS; // deferred: uses StatusIcon (../../components/design-system/StatusIcon.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-czq1j3j2.js:799200", () => {
  WORKFLOW_STATUS_ICONS = {
    pending: jsxProd_default(StatusIcon, {
      status: "pending",
    }),
    running: jsxProd_default(StatusIcon, {
      status: "running",
    }),
    paused: jsxProd_default(StatusIcon, {
      status: "off",
      "aria-label": "paused:",
    }),
    completed: jsxProd_default(StatusIcon, {
      status: "success",
    }),
    failed: jsxProd_default(StatusIcon, {
      status: "error",
    }),
    killed: jsxProd_default(StatusIcon, {
      status: "error",
      "aria-label": "stopped:",
    }),
  };
});
//@ chunk-czq1j3j2.js:799446-799492 placement
function selectRemoteWorkflowRuns(state) {
  return state.remoteWorkflowRuns;
}
//@ chunk-czq1j3j2.js:799492-799544 placement
function selectRemoteWorkerGone(state) {
  return state.remoteWorkerReportedGone;
}
//@ chunk-czq1j3j2.js:799544-799574 placement
function newWeakMap() {
  return new SnapshotCache();
}
//@ chunk-czq1j3j2.js:799574-799604 placement
function runIdOf(run) {
  return run.id;
}
//@ chunk-czq1j3j2.js:799604-799667 placement
function sortByStartTimeDesc(runA, runB) {
  return runB.task.startTime - runA.task.startTime;
}
//@ chunk-czq1j3j2.js:799667-799727 placement
function isRunningRun(run) {
  let { task } = run;
  return task.status === "running";
}
//@ chunk-czq1j3j2.js:799727-802344 placement
/**
 * 云端工作流对话框。
 */
function CloudWorkflowsDialog(props) {
  let $ = useMemoCache(38);
  let { initialRunId, onDone, promptVisibleBelow } = props;
  useRegisterOverlay("cloud-workflows-dialog");
  let appState = useAppState(selectRemoteWorkflowRuns);
  let appState_2 = useAppState(selectRemoteWorkerGone);
  let { addNotification } = useNotifications();
  let initialStoppingSet;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    initialStoppingSet = new Set();
    $[0] = initialStoppingSet;
  } else initialStoppingSet = $[0];
  let [stoppingIds, setStoppingIds] = useState(initialStoppingSet);
  let initialStoppedMap;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    initialStoppedMap = new Map();
    $[1] = initialStoppedMap;
  } else initialStoppedMap = $[1];
  let [stoppedAtMap, setStoppedAtMap] = useState(initialStoppedMap);
  let initialStoppedRuns;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    initialStoppedRuns = new Map();
    $[2] = initialStoppedRuns;
  } else initialStoppedRuns = $[2];
  let [stoppedRuns, setStoppedRuns] = useState(initialStoppedRuns);
  let isMountedRef = useRef(true);
  let unmountEffect;
  let unmountEffectDeps;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    unmountEffect = () => () => {
      isMountedRef.current = false;
    };
    unmountEffectDeps = [];
    $[3] = unmountEffect;
    $[4] = unmountEffectDeps;
  } else {
    unmountEffect = $[3];
    unmountEffectDeps = $[4];
  }
  useEffect(unmountEffect, unmountEffectDeps);
  let [progressCacheRef] = useState(newWeakMap);
  let liveIdsCached;
  if ($[5] !== appState) {
    liveIdsCached = new Set(appState.map(runIdOf));
    $[5] = appState;
    $[6] = liveIdsCached;
  } else liveIdsCached = $[6];
  let liveRunIds = liveIdsCached;
  let runs;
  if (
    $[7] !== stoppedRuns ||
    $[8] !== liveRunIds ||
    $[9] !== progressCacheRef ||
    $[10] !== appState ||
    $[11] !== stoppedAtMap
  ) {
    const mapped = appState.map((run) => ({
      run,
      stopped: stoppedRuns.get(run.id)?.run.runId === run.runId ? stoppedAtMap.get(run.id) : undefined,
    }));
    const stoppedEntries = [...stoppedRuns.values()];
    let keepNotLiveCached;
    if ($[13] !== liveRunIds) {
      keepNotLiveCached = (stroppedEntry) => {
        let { run } = stroppedEntry;
        return !liveRunIds.has(run.id);
      };
      $[13] = liveRunIds;
      $[14] = keepNotLiveCached;
    } else keepNotLiveCached = $[14];
    const filtered = stoppedEntries.filter(keepNotLiveCached);
    let addStoppedCached;
    if ($[15] !== stoppedAtMap) {
      addStoppedCached = (stoppedEntry) => {
        let { run, at } = stoppedEntry;
        return {
          run,
          stopped: stoppedAtMap.get(run.id) ?? at,
        };
      };
      $[15] = stoppedAtMap;
      $[16] = addStoppedCached;
    } else addStoppedCached = $[16];
    const allEntries = [...mapped, ...filtered.map(addStoppedCached)];
    let toRunCached;
    if ($[17] !== progressCacheRef) {
      toRunCached = (entry) => {
        let { run, stopped } = entry;
        return {
          task: cloudWorkflowToTask(run, progressCacheRef.of(run.wireProgress), stopped),
        };
      };
      $[17] = progressCacheRef;
      $[18] = toRunCached;
    } else toRunCached = $[18];
    runs = allEntries.map(toRunCached).sort(sortByStartTimeDesc);
    $[7] = stoppedRuns;
    $[8] = liveRunIds;
    $[9] = progressCacheRef;
    $[10] = appState;
    $[11] = stoppedAtMap;
    $[12] = runs;
  } else runs = $[12];
  let sortedRuns = runs;
  let any = sortedRuns.some(isRunningRun);
  let now = useNowTicker(any ? 1000 : null);
  let canStopCached;
  if ($[19] !== appState_2) {
    canStopCached = canStopRemoteWorkflow(appState_2);
    $[19] = appState_2;
    $[20] = canStopCached;
  } else canStopCached = $[20];
  let canStop = canStopCached;
  let stopTaskCached;
  if ($[21] !== addNotification || $[22] !== initialRunId || $[23] !== onDone || $[24] !== appState) {
    stopTaskCached = function handleStopTask(taskId) {
      setStoppingIds((ids) => new Set(ids).add(taskId));
      let found = appState.find((run) => run.id === taskId);
      if (found !== undefined)
        setStoppedRuns((previous) =>
          new Map(previous).set(taskId, {
            run: found,
            at: Date.now(),
          }),
        );
      stopRemoteWorkflow(taskId, (stopResult) => {
        if (isMountedRef.current && initialRunId === undefined) {
          onDone(stopResult.text, {
            display: "system",
          });
          return;
        }
        addNotification(stopResult);
        if (isMountedRef.current) onDone();
      })
        .then((cleanupResult) => {
          if (cleanupResult) setStoppedAtMap((previous) => new Map(previous).set(taskId, Date.now()));
        })
        .finally(() =>
          setStoppingIds((ids) => {
            let nextIds = new Set(ids);
            nextIds.delete(taskId);
            return nextIds;
          }),
        );
    };
    $[21] = addNotification;
    $[22] = initialRunId;
    $[23] = onDone;
    $[24] = appState;
    $[25] = stopTaskCached;
  } else stopTaskCached = $[25];
  let stopTask = stopTaskCached;
  let controlsFor;
  if ($[26] !== canStop || $[27] !== stopTask || $[28] !== stoppingIds) {
    controlsFor = (task) => {
      let { id, status } = task;
      return canStop && status === "running" && !stoppingIds.has(id)
        ? {
            onKill: () => stopTask(id),
          }
        : {};
    };
    $[26] = canStop;
    $[27] = stopTask;
    $[28] = stoppingIds;
    $[29] = controlsFor;
  } else controlsFor = $[29];
  const listNote =
    appState_2 && any ? "The cloud session may have stopped, and its workflows too" : undefined;
  let runListElement;
  if (
    $[30] !== initialRunId ||
    $[31] !== now ||
    $[32] !== onDone ||
    $[33] !== promptVisibleBelow ||
    $[34] !== sortedRuns ||
    $[35] !== controlsFor ||
    $[36] !== listNote
  ) {
    runListElement = jsxProd_default(WorkflowRunList, {
      runs: sortedRuns,
      controlsFor,
      emptyText:
        "No dynamic workflows to show. Runs that ended before this terminal attached may not be listed.",
      initialRunId,
      keepsListOfOne: true,
      listNote,
      now,
      onDone,
      promptVisibleBelow,
    });
    $[30] = initialRunId;
    $[31] = now;
    $[32] = onDone;
    $[33] = promptVisibleBelow;
    $[34] = sortedRuns;
    $[35] = controlsFor;
    $[36] = listNote;
    $[37] = runListElement;
  } else runListElement = $[37];
  return runListElement;
}
//@ chunk-czq1j3j2.js:1865350-1865354 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1865350", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1869921-1869925 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1869921", () => {
  init_react_production();
});
//@ chunk-w8d47f3d.js:15955-16129 placement
/**
 * /workflows 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
async function callWorkflowsCommand(onDone, context) {
  if (getRemoteCaps())
    return jsxProd_default(CloudWorkflowsDialog, {
      onDone,
      promptVisibleBelow: context.isMidTurn === true,
    });
  return jsxProd_default(WorkflowHistoryDialog, {
    onDone,
    storageV5: context.storageV5,
    promptVisibleBelow: context.isMidTurn === true,
  });
}
export { cloudWorkflowToTask, CloudWorkflowsDialog, callWorkflowsCommand };
