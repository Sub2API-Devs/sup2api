/**
 * commands/workflows/workflows.tsx
 *
 * 2.1.316 新增：工作流运行列表/详情视图（键盘导航、控制按钮）；云端工作流对话框等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-wnym76ss.js (27)
 * attribution: placement 27
 */
import {
  init_react_production,
  useState,
  suspenseTypeExport,
  use,
  useRef,
  useEffect,
} from "../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useRegisterOverlay } from "../../context/overlayContext.js";
import { readWorkflowSnapshot } from "../../services/workflow/snapshots.js";
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
import { useSetVoiceState } from "../../context/voice.js";
import {
  killWorkflowTask,
  pauseWorkflowTask,
  skipWorkflowAgent,
  retryWorkflowAgent,
} from "../../tasks/LocalWorkflowTask/LocalWorkflowTask.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { WorkflowDetailDialog } from "../../components/workflows/WorkflowDetailDialog.js";
import { parseWorkflowScript } from "../../services/workflows/workflowScriptMeta.js";
import { slugifyWorkflowName } from "../../services/workflow/scriptFile.js";
import { WorkflowSaveDialog } from "../../components/workflows/WorkflowSaveDialog.js";
import { count } from "../../utils/collections.js";
import { Text } from "../../ink/components/Text.js";
import { HintText } from "../../components/design-system/HintText.js";
import { OrderedListWithItem } from "../../components/CustomSelect/selectTable.js";
import { formatDuration, formatTokens } from "../../utils/format.js";
import { plural } from "../../utils/stringUtils.js";
import { StatusIcon } from "../../components/design-system/StatusIcon.js";
import { useNotifications } from "../../context/notifications.js";
import { parseWorkflowProgressList } from "../../remote/remoteSessionEvents.js";
import { useNowTicker } from "../../components/StatusNotices.js";
import { isRemoteControlChannelAvailable, getRemoteCaps } from "../../remote/remoteMode.js";
import { sanitizeDisplayText, MAX_TITLE_LENGTH } from "../../utils/resultError.js";
import { errorMessage } from "../../utils/errors.js";

//@ chunk-wnym76ss.js:15138-15142 placement
init_react_production();
//@ chunk-wnym76ss.js:15142-15146 placement
init_react_production();
//@ chunk-wnym76ss.js:15146-15169 placement
function emptyArrayOnError() {
  return [];
}
//@ chunk-wnym76ss.js:15169-15199 placement
function selectTasks(state) {
  return state.tasks;
}
//@ chunk-wnym76ss.js:15199-15249 placement
function isLocalWorkflowTask(task) {
  return task.type === "local_workflow";
}
//@ chunk-wnym76ss.js:15249-15289 placement
function workflowRunIdOf(run) {
  return run.workflowRunId;
}
//@ chunk-wnym76ss.js:15289-15314 placement
function truthy(_) {
  return !!_;
}
//@ chunk-wnym76ss.js:15314-15359 placement
function snapshotToRun(snapshot) {
  return {
    task: workflowSnapshotToTask(snapshot),
    snapshot,
  };
}
//@ chunk-wnym76ss.js:15359-15389 placement
function taskToRun(task) {
  return {
    task,
  };
}
//@ chunk-wnym76ss.js:15389-15447 placement = getTotalDuration (0.658)
function getTotalDuration(first, second) {
  return second.task.startTime - first.task.startTime;
}
//@ chunk-wnym76ss.js:15447-15497 placement
function isRunningItem(item) {
  return item.task.status === "running";
}
//@ chunk-wnym76ss.js:15497-16077 placement
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
//@ chunk-wnym76ss.js:16077-16151 placement
function dismissWorkflowsDialog(onDone) {
  onDone("Dynamic workflows dialog dismissed", {
    display: "system",
  });
}
//@ chunk-wnym76ss.js:16151-16948 placement
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
//@ chunk-wnym76ss.js:16948-17788 placement
/**
 * 合并快照与当前任务，渲染动态工作流列表。
 */
function WorkflowHistoryList(props) {
  let $ = useMemoCache(11);
  let { snapshotsPromise, onDone, promptVisibleBelow } = props;
  let snapshots = use(snapshotsPromise);
  let appState = useAppState(selectTasks);
  let taskStore = useSetVoiceState();
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
          onKill: () => killWorkflowTask(id, taskStore, "user"),
          onPause: () => pauseWorkflowTask(id, taskStore),
          onSkipAgent: (agentId) => skipWorkflowAgent(id, agentId, taskStore),
          onRetryAgent: (agentId) => retryWorkflowAgent(id, agentId, taskStore),
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
//@ chunk-wnym76ss.js:17788-22212 placement
/**
 * 工作流运行列表/详情视图（键盘导航、控制按钮）。
 */
function WorkflowRunList(props) {
  let $ = useMemoCache(78);
  let { runs, controlsFor, emptyText, keepsListOfOne, listNote, now, onDone, promptVisibleBelow } = props;
  let keepsList = keepsListOfOne === undefined ? false : keepsListOfOne;
  let initialView;
  if ($[0] !== runs[0] || $[1] !== runs.length) {
    initialView = () =>
      runs.length === 1
        ? {
            mode: "detail",
            itemId: runs[0].task.id,
            isFromList: false,
          }
        : {
            mode: "list",
          };
    $[0] = runs[0];
    $[1] = runs.length;
    $[2] = initialView;
  } else initialView = $[2];
  let [view, setView] = useState(initialView);
  let [selectedIndex, setSelectedIndex] = useState(0);
  let [selectedId, setSelectedId] = useState();
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let singleRun = runs.length === 1 && !keepsList ? runs[0] : undefined;
  let effectiveView;
  if ($[3] !== singleRun || $[4] !== view) {
    effectiveView =
      view.mode === "list" && singleRun
        ? {
            mode: "detail",
            itemId: singleRun.task.id,
            isFromList: false,
          }
        : view;
    $[3] = singleRun;
    $[4] = view;
    $[5] = effectiveView;
  } else effectiveView = $[5];
  let activeView = effectiveView;
  if (activeView !== view) setView(activeView);
  let matchRun;
  if ($[6] !== selectedId) {
    matchRun = (run) => run.task.id === selectedId;
    $[6] = selectedId;
    $[7] = matchRun;
  } else matchRun = $[7];
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
    $[8] !== keepsList ||
    $[9] !== runs.length ||
    $[10] !== onDone ||
    $[11] !== activeView.isFromList ||
    $[12] !== activeView.mode
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
    $[8] = keepsList;
    $[9] = runs.length;
    $[10] = onDone;
    $[11] = activeView.isFromList;
    $[12] = activeView.mode;
    $[13] = handleBack;
  } else handleBack = $[13];
  let onBack = handleBack;
  if (activeView.mode === "detail") {
    let detailElement;
    let detailResult;
    if (
      $[14] !== controlsFor ||
      $[15] !== onBack ||
      $[16] !== runs ||
      $[17] !== onDone ||
      $[18] !== promptVisibleBelow ||
      $[19] !== activeView.itemId
    ) {
      detailResult = EARLY_RETURN_SENTINEL;
      $o: {
        let matchItem;
        if ($[22] !== activeView.itemId) {
          matchItem = (run) => run.task.id === activeView.itemId;
          $[22] = activeView.itemId;
          $[23] = matchItem;
        } else matchItem = $[23];
        let found = runs.find(matchItem);
        if (!found) {
          detailResult =
            (setView({
              mode: "list",
            }),
            setResetFlag(true),
            null);
          break $o;
        }
        let onDone_2;
        if ($[24] !== onDone) {
          onDone_2 = (message) =>
            message
              ? onDone(message, {
                  display: "system",
                })
              : onDone();
          $[24] = onDone;
          $[25] = onDone_2;
        } else onDone_2 = $[25];
        detailElement = jsxProd_default(
          WorkflowDetailDialog,
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
      $[14] = controlsFor;
      $[15] = onBack;
      $[16] = runs;
      $[17] = onDone;
      $[18] = promptVisibleBelow;
      $[19] = activeView.itemId;
      $[20] = detailElement;
      $[21] = detailResult;
    } else {
      detailElement = $[20];
      detailResult = $[21];
    }
    if (detailResult !== EARLY_RETURN_SENTINEL) return detailResult;
    return detailElement;
  }
  if (activeView.mode === "save") {
    let detailRun;
    let defaultName;
    let detailResult;
    if ($[26] !== runs || $[27] !== activeView.itemId) {
      detailResult = EARLY_RETURN_SENTINEL;
      ae: {
        let matchItem;
        if ($[31] !== activeView.itemId) {
          matchItem = (run) => run.task.id === activeView.itemId;
          $[31] = activeView.itemId;
          $[32] = matchItem;
        } else matchItem = $[32];
        detailRun = runs.find(matchItem);
        if (!detailRun || detailRun.task.script.length === 0) {
          detailResult =
            (setView({
              mode: "list",
            }),
            null);
          break ae;
        }
        let workflowScript = parseWorkflowScript(detailRun.task.script);
        defaultName = !("error" in workflowScript)
          ? workflowScript.meta.name
          : slugifyWorkflowName(detailRun.task.summary ?? detailRun.task.description);
      }
      $[26] = runs;
      $[27] = activeView.itemId;
      $[28] = detailRun;
      $[29] = defaultName;
      $[30] = detailResult;
    } else {
      detailRun = $[28];
      defaultName = $[29];
      detailResult = $[30];
    }
    if (detailResult !== EARLY_RETURN_SENTINEL) return detailResult;
    let defaultName_2 = defaultName;
    let onDone_2;
    if ($[33] !== onDone) {
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
      $[33] = onDone;
      $[34] = onDone_2;
    } else onDone_2 = $[34];
    let saveDialogElement;
    if ($[35] !== defaultName_2 || $[36] !== detailRun.task.script || $[37] !== onDone_2) {
      saveDialogElement = jsxProd_default(WorkflowSaveDialog, {
        script: detailRun.task.script,
        defaultName: defaultName_2,
        onDone: onDone_2,
      });
      $[35] = defaultName_2;
      $[36] = detailRun.task.script;
      $[37] = onDone_2;
      $[38] = saveDialogElement;
    } else saveDialogElement = $[38];
    return saveDialogElement;
  }
  let runningCount = count(runs, isRunningItem);
  let completedCount = runs.length - runningCount;
  let onCancelCached;
  if ($[39] !== onDone) {
    onCancelCached = () => dismissWorkflowsDialog(onDone);
    $[39] = onDone;
    $[40] = onCancelCached;
  } else onCancelCached = $[40];
  let onCancel = onCancelCached;
  let killHandlerCached;
  if ($[41] !== controlsFor) {
    killHandlerCached = (item) => {
      let { task } = item;
      return task.status === "running" ? controlsFor(task).onKill : undefined;
    };
    $[41] = controlsFor;
    $[42] = killHandlerCached;
  } else killHandlerCached = $[42];
  let killHandlerFor = killHandlerCached;
  let showHints = runs.length > 0 && !isScreenReaderEnabled;
  let subtitle;
  if ($[43] !== completedCount || $[44] !== listNote || $[45] !== runs.length || $[46] !== runningCount) {
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
    $[43] = completedCount;
    $[44] = listNote;
    $[45] = runs.length;
    $[46] = runningCount;
    $[47] = subtitle;
  } else subtitle = $[47];
  let upDownHint;
  if ($[48] !== showHints) {
    upDownHint =
      showHints &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: ["up", "down"],
        action: "select",
      });
    $[48] = showHints;
    $[49] = upDownHint;
  } else upDownHint = $[49];
  let enterHint;
  if ($[50] !== showHints) {
    enterHint =
      showHints &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: "enter",
        action: "view",
      });
    $[50] = showHints;
    $[51] = enterHint;
  } else enterHint = $[51];
  let stopHint;
  if ($[52] !== currentRun || $[53] !== showHints || $[54] !== killHandlerFor) {
    stopHint =
      showHints &&
      currentRun &&
      killHandlerFor(currentRun) &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: "x",
        action: "stop",
      });
    $[52] = currentRun;
    $[53] = showHints;
    $[54] = killHandlerFor;
    $[55] = stopHint;
  } else stopHint = $[55];
  let saveHint;
  if ($[56] !== currentRun || $[57] !== showHints) {
    saveHint =
      showHints &&
      currentRun &&
      currentRun.task.script.length > 0 &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: "s",
        action: "save",
      });
    $[56] = currentRun;
    $[57] = showHints;
    $[58] = saveHint;
  } else saveHint = $[58];
  let escapeHint;
  if ($[59] === MEMO_CACHE_SENTINEL) {
    escapeHint = jsxProd_default(KeyboardShortcutHint, {
      chord: "escape",
      action: "close",
    });
    $[59] = escapeHint;
  } else escapeHint = $[59];
  let inputGuide;
  if ($[60] !== enterHint || $[61] !== stopHint || $[62] !== saveHint || $[63] !== upDownHint) {
    inputGuide = jsxProd_default_2(Byline, {
      children: [upDownHint, enterHint, stopHint, saveHint, escapeHint],
    });
    $[60] = enterHint;
    $[61] = stopHint;
    $[62] = saveHint;
    $[63] = upDownHint;
    $[64] = inputGuide;
  } else inputGuide = $[64];
  let children;
  if (
    $[65] !== emptyText ||
    $[66] !== currentIndex ||
    $[67] !== selectedId ||
    $[68] !== resetFlag ||
    $[69] !== runs ||
    $[70] !== now ||
    $[71] !== killHandlerFor
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
    $[65] = emptyText;
    $[66] = currentIndex;
    $[67] = selectedId;
    $[68] = resetFlag;
    $[69] = runs;
    $[70] = now;
    $[71] = killHandlerFor;
    $[72] = children;
  } else children = $[72];
  let dialogElement;
  if ($[73] !== onCancel || $[74] !== inputGuide || $[75] !== children || $[76] !== subtitle) {
    dialogElement = jsxProd_default(Dialog, {
      title: "Dynamic workflows",
      subtitle,
      onCancel,
      color: "background",
      inputGuide,
      children,
    });
    $[73] = onCancel;
    $[74] = inputGuide;
    $[75] = children;
    $[76] = subtitle;
    $[77] = dialogElement;
  } else dialogElement = $[77];
  return dialogElement;
}
//@ chunk-wnym76ss.js:22212-22531 placement
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
//@ chunk-wnym76ss.js:22531-22776 placement
var WORKFLOW_STATUS_ICONS = {
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
//@ chunk-wnym76ss.js:22776-22821 placement
function selectRemoteWorkflowRuns(state) {
  return state.remoteWorkflowRuns;
}
//@ chunk-wnym76ss.js:22821-22872 placement
function selectRemoteWorkerGone(state) {
  return state.remoteWorkerReportedGone;
}
//@ chunk-wnym76ss.js:22872-22905 placement
function newWeakMap() {
  return new WeakMap();
}
//@ chunk-wnym76ss.js:22905-22934 placement
function runIdOf(run) {
  return run.id;
}
//@ chunk-wnym76ss.js:22934-22996 placement
function sortByStartTimeDesc(runA, runB) {
  return runB.task.startTime - runA.task.startTime;
}
//@ chunk-wnym76ss.js:22996-23055 placement
function isRunningRun(run) {
  let { task } = run;
  return task.status === "running";
}
//@ chunk-wnym76ss.js:23055-25610 placement
/**
 * 云端工作流对话框。
 */
function CloudWorkflowsDialog(props) {
  let $ = useMemoCache(36);
  let { onDone, promptVisibleBelow } = props;
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
        let progress = progressCacheRef.get(run.wireProgress) ?? parseWorkflowProgressList(run.wireProgress);
        progressCacheRef.set(run.wireProgress, progress);
        return {
          task: cloudWorkflowToTask(run, progress, stopped),
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
  let taskRuns = runs;
  let any = taskRuns.some(isRunningRun);
  let now = useNowTicker(any ? 1000 : null);
  let canStopCached;
  if ($[19] !== appState_2) {
    canStopCached = isRemoteControlChannelAvailable() && !appState_2;
    $[19] = appState_2;
    $[20] = canStopCached;
  } else canStopCached = $[20];
  let canStop = canStopCached;
  let stopTaskCached;
  if ($[21] !== addNotification || $[22] !== onDone || $[23] !== appState) {
    stopTaskCached = function handleStopTask(taskId) {
      let remoteCaps = getRemoteCaps();
      if (!remoteCaps) {
        return;
      }
      setStoppingIds((ids) => new Set(ids).add(taskId));
      let found = appState.find((run) => run.id === taskId);
      if (found !== undefined)
        setStoppedRuns((previous) =>
          new Map(previous).set(taskId, {
            run: found,
            at: Date.now(),
          }),
        );
      remoteCaps
        .sendControlRequest({
          subtype: "stop_task",
          task_id: taskId,
        })
        .then(
          () => setStoppedAtMap((previous) => new Map(previous).set(taskId, Date.now())),
          (error) => {
            let errorText = `Couldn't stop the workflow: ${sanitizeDisplayText(errorMessage(error), {
              maxCodeUnits: MAX_TITLE_LENGTH,
            })}`;
            if (isMountedRef.current)
              onDone(errorText, {
                display: "system",
              });
            else
              addNotification({
                key: "cloud-workflow-stop",
                kind: "feedback",
                text: errorText,
                color: "error",
                priority: "immediate",
              });
          },
        )
        .finally(() =>
          setStoppingIds((ids) => {
            let nextIds = new Set(ids);
            nextIds.delete(taskId);
            return nextIds;
          }),
        );
    };
    $[21] = addNotification;
    $[22] = onDone;
    $[23] = appState;
    $[24] = stopTaskCached;
  } else stopTaskCached = $[24];
  let stopTask = stopTaskCached;
  let controlsFor;
  if ($[25] !== canStop || $[26] !== stopTask || $[27] !== stoppingIds) {
    controlsFor = (task) => {
      let { id, status } = task;
      return canStop && status === "running" && !stoppingIds.has(id)
        ? {
            onKill: () => stopTask(id),
          }
        : {};
    };
    $[25] = canStop;
    $[26] = stopTask;
    $[27] = stoppingIds;
    $[28] = controlsFor;
  } else controlsFor = $[28];
  const listNote =
    appState_2 && any ? "The cloud session may have stopped, and its workflows too" : undefined;
  let runListElement;
  if (
    $[29] !== now ||
    $[30] !== onDone ||
    $[31] !== promptVisibleBelow ||
    $[32] !== taskRuns ||
    $[33] !== controlsFor ||
    $[34] !== listNote
  ) {
    runListElement = jsxProd_default(WorkflowRunList, {
      runs: taskRuns,
      controlsFor,
      emptyText:
        "No dynamic workflows to show. Runs that ended before this terminal attached may not be listed.",
      keepsListOfOne: true,
      listNote,
      now,
      onDone,
      promptVisibleBelow,
    });
    $[29] = now;
    $[30] = onDone;
    $[31] = promptVisibleBelow;
    $[32] = taskRuns;
    $[33] = controlsFor;
    $[34] = listNote;
    $[35] = runListElement;
  } else runListElement = $[35];
  return runListElement;
}
//@ chunk-wnym76ss.js:25610-26062 placement
/**
 * 把云端工作流记录转换成 local_workflow 任务对象。
 */
function cloudWorkflowToTask(run, progress, stopped) {
  let isStopped = stopped !== undefined && run.status === "running";
  return {
    id: run.id,
    type: "local_workflow",
    description: run.description || "Dynamic workflow",
    status: isStopped ? "killed" : run.status,
    startTime: run.startTime,
    endTime: isStopped ? stopped : run.endTime,
    outputFile: "",
    outputOffset: 0,
    notified: true,
    script: "",
    prompt: "",
    workflowName: run.workflowName,
    workflowProgress: progress,
    progressVersion: 0,
    agentCount: count(progress, (entry) => entry.type === "workflow_agent"),
    totalTokens: run.totalTokens,
    totalToolCalls: run.totalToolCalls,
    logs: [],
  };
}
//@ chunk-wnym76ss.js:26062-26235 placement
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
export { callWorkflowsCommand };
