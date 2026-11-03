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
import { init_react_production, y, fo, Qr, R, P } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
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
function selectTasks(i) {
  return i.tasks;
}
//@ chunk-wnym76ss.js:15199-15249 placement
function isLocalWorkflowTask(ce) {
  return ce.type === "local_workflow";
}
//@ chunk-wnym76ss.js:15249-15289 placement
function workflowRunIdOf(ie) {
  return ie.workflowRunId;
}
//@ chunk-wnym76ss.js:15289-15314 placement
function truthy(_) {
  return !!_;
}
//@ chunk-wnym76ss.js:15314-15359 placement
function snapshotToRun(C) {
  return {
    task: workflowSnapshotToTask(C),
    snapshot: C,
  };
}
//@ chunk-wnym76ss.js:15359-15389 placement
function taskToRun(task) {
  return {
    task,
  };
}
//@ chunk-wnym76ss.js:15389-15447 placement = getTotalDuration (0.658)
function getTotalDuration(I, K) {
  return K.task.startTime - I.task.startTime;
}
//@ chunk-wnym76ss.js:15447-15497 placement
function isRunningItem(Ss) {
  return Ss.task.status === "running";
}
//@ chunk-wnym76ss.js:15497-16077 placement
/**
 * 把工作流运行快照转换成 local_workflow 任务对象。
 */
function workflowSnapshotToTask(o) {
  return {
    id: o.taskId,
    type: "local_workflow",
    description: o.summary ?? "Dynamic workflow",
    status: o.status,
    startTime: o.startTime,
    endTime: o.startTime + o.durationMs,
    toolUseId: undefined,
    outputFile: "",
    outputOffset: 0,
    notified: true,
    script: o.script,
    scriptPath: o.scriptPath,
    prompt: o.script,
    summary: o.summary,
    workflowName: o.workflowName,
    phases: o.phases,
    defaultModel: o.defaultModel,
    workflowRunId: o.runId,
    workflowProgress: o.workflowProgress,
    progressVersion: 0,
    agentCount: o.agentCount,
    totalTokens: o.totalTokens ?? 0,
    totalToolCalls: o.totalToolCalls ?? 0,
    logs: o.logs,
    result: o.result,
    error: o.error,
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
  let f = w(15);
  let { onDone, storageV5, promptVisibleBelow } = props;
  useRegisterOverlay("workflow-history-dialog");
  let L;
  if (f[0] !== storageV5) {
    L = () => readWorkflowSnapshot(storageV5).catch(emptyArrayOnError);
    f[0] = storageV5;
    f[1] = L;
  } else L = f[1];
  let [a] = y(L);
  let onCancel;
  if (f[2] !== onDone) {
    onCancel = () => dismissWorkflowsDialog(onDone);
    f[2] = onDone;
    f[3] = onCancel;
  } else onCancel = f[3];
  let inputGuide;
  let children;
  if (f[4] === MEMO_CACHE_SENTINEL) {
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
    f[4] = inputGuide;
    f[5] = children;
  } else {
    inputGuide = f[4];
    children = f[5];
  }
  let fallback;
  if (f[6] !== onCancel) {
    fallback = jsxProd_default(Dialog, {
      title: "Dynamic workflows",
      onCancel,
      color: "background",
      inputGuide,
      children,
    });
    f[6] = onCancel;
    f[7] = fallback;
  } else fallback = f[7];
  let children_2;
  if (f[8] !== onDone || f[9] !== promptVisibleBelow || f[10] !== a) {
    children_2 = jsxProd_default(WorkflowHistoryList, {
      snapshotsPromise: a,
      onDone,
      promptVisibleBelow,
    });
    f[8] = onDone;
    f[9] = promptVisibleBelow;
    f[10] = a;
    f[11] = children_2;
  } else children_2 = f[11];
  let N;
  if (f[12] !== fallback || f[13] !== children_2) {
    N = jsxProd_default(fo, {
      fallback,
      children: children_2,
    });
    f[12] = fallback;
    f[13] = children_2;
    f[14] = N;
  } else N = f[14];
  return N;
}
//@ chunk-wnym76ss.js:16948-17788 placement
/**
 * 合并快照与当前任务，渲染动态工作流列表。
 */
function WorkflowHistoryList(props) {
  let l = w(11);
  let { snapshotsPromise, onDone, promptVisibleBelow } = props;
  let f = Qr(snapshotsPromise);
  let appState = useAppState(selectTasks);
  let setVoiceState = useSetVoiceState();
  let x;
  if (l[0] !== f || l[1] !== appState) {
    let filtered = Object.values(appState ?? {}).filter(isLocalWorkflowTask);
    let s = new Set(filtered.map(workflowRunIdOf).filter(truthy));
    let mapped = f.filter((D) => !s.has(D.runId)).map(snapshotToRun);
    x = [...filtered.map(taskToRun), ...mapped].sort(getTotalDuration);
    l[0] = f;
    l[1] = appState;
    l[2] = x;
  } else x = l[2];
  let runs = x;
  let controlsFor;
  if (l[3] !== onDone || l[4] !== setVoiceState) {
    controlsFor = (re) => {
      let { id, status } = re;
      return {
        onResume: (ue) =>
          onDone(ue, {
            shouldQuery: true,
            display: "system",
            metaMessages: [ue],
          }),
        ...(status === "running" && {
          onKill: () => killWorkflowTask(id, setVoiceState, "user"),
          onPause: () => pauseWorkflowTask(id, setVoiceState),
          onSkipAgent: (W) => skipWorkflowAgent(id, W, setVoiceState),
          onRetryAgent: (fe) => retryWorkflowAgent(id, fe, setVoiceState),
        }),
      };
    };
    l[3] = onDone;
    l[4] = setVoiceState;
    l[5] = controlsFor;
  } else controlsFor = l[5];
  let re;
  if (l[6] !== runs || l[7] !== onDone || l[8] !== promptVisibleBelow || l[9] !== controlsFor) {
    re = jsxProd_default(WorkflowRunList, {
      runs,
      controlsFor,
      emptyText: "No dynamic workflows in this session.",
      onDone,
      promptVisibleBelow,
    });
    l[6] = runs;
    l[7] = onDone;
    l[8] = promptVisibleBelow;
    l[9] = controlsFor;
    l[10] = re;
  } else re = l[10];
  return re;
}
//@ chunk-wnym76ss.js:17788-22212 placement
/**
 * 工作流运行列表/详情视图（键盘导航、控制按钮）。
 */
function WorkflowRunList(props) {
  let s = w(78);
  let { runs, controlsFor, emptyText, keepsListOfOne, listNote, now, onDone, promptVisibleBelow } = props;
  let B = keepsListOfOne === undefined ? false : keepsListOfOne;
  let D;
  if (s[0] !== runs[0] || s[1] !== runs.length) {
    D = () =>
      runs.length === 1
        ? {
            mode: "detail",
            itemId: runs[0].task.id,
            isFromList: false,
          }
        : {
            mode: "list",
          };
    s[0] = runs[0];
    s[1] = runs.length;
    s[2] = D;
  } else D = s[2];
  let [N, v] = y(D);
  let [A, re] = y(0);
  let [g, pe] = y();
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let W = runs.length === 1 && !B ? runs[0] : undefined;
  let fe;
  if (s[3] !== W || s[4] !== N) {
    fe =
      N.mode === "list" && W
        ? {
            mode: "detail",
            itemId: W.task.id,
            isFromList: false,
          }
        : N;
    s[3] = W;
    s[4] = N;
    s[5] = fe;
  } else fe = s[5];
  let i = fe;
  if (i !== N) v(i);
  let ce;
  if (s[6] !== g) {
    ce = (ie) => ie.task.id === g;
    s[6] = g;
    s[7] = ce;
  } else ce = s[7];
  let index = runs.findIndex(ce);
  let C = index < 0 ? Math.min(A, runs.length - 1) : index;
  let k = runs[C];
  let [I, K] = y(false);
  if (g !== undefined && index < 0) {
    pe(undefined);
    K(true);
  }
  let Z;
  if (s[8] !== B || s[9] !== runs.length || s[10] !== onDone || s[11] !== i.isFromList || s[12] !== i.mode) {
    Z = () => {
      let isFromList = B && i.mode === "detail" && i.isFromList;
      if (runs.length <= 1 && !isFromList) {
        dismissWorkflowsDialog(onDone);
        return;
      }
      K(false);
      v({
        mode: "list",
      });
    };
    s[8] = B;
    s[9] = runs.length;
    s[10] = onDone;
    s[11] = i.isFromList;
    s[12] = i.mode;
    s[13] = Z;
  } else Z = s[13];
  let onBack = Z;
  if (i.mode === "detail") {
    let M;
    let b;
    if (
      s[14] !== controlsFor ||
      s[15] !== onBack ||
      s[16] !== runs ||
      s[17] !== onDone ||
      s[18] !== promptVisibleBelow ||
      s[19] !== i.itemId
    ) {
      b = EARLY_RETURN_SENTINEL;
      $o: {
        let c;
        if (s[22] !== i.itemId) {
          c = (ge) => ge.task.id === i.itemId;
          s[22] = i.itemId;
          s[23] = c;
        } else c = s[23];
        let found = runs.find(c);
        if (!found) {
          b =
            (v({
              mode: "list",
            }),
            K(true),
            null);
          break $o;
        }
        let onDone_2;
        if (s[24] !== onDone) {
          onDone_2 = (Be) =>
            Be
              ? onDone(Be, {
                  display: "system",
                })
              : onDone();
          s[24] = onDone;
          s[25] = onDone_2;
        } else onDone_2 = s[25];
        M = jsxProd_default(
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
      s[14] = controlsFor;
      s[15] = onBack;
      s[16] = runs;
      s[17] = onDone;
      s[18] = promptVisibleBelow;
      s[19] = i.itemId;
      s[20] = M;
      s[21] = b;
    } else {
      M = s[20];
      b = s[21];
    }
    if (b !== EARLY_RETURN_SENTINEL) return b;
    return M;
  }
  if (i.mode === "save") {
    let V;
    let M;
    let b;
    if (s[26] !== runs || s[27] !== i.itemId) {
      b = EARLY_RETURN_SENTINEL;
      ae: {
        let c;
        if (s[31] !== i.itemId) {
          c = (Pe) => Pe.task.id === i.itemId;
          s[31] = i.itemId;
          s[32] = c;
        } else c = s[32];
        V = runs.find(c);
        if (!V || V.task.script.length === 0) {
          b =
            (v({
              mode: "list",
            }),
            null);
          break ae;
        }
        let workflowScript = parseWorkflowScript(V.task.script);
        M = !("error" in workflowScript)
          ? workflowScript.meta.name
          : slugifyWorkflowName(V.task.summary ?? V.task.description);
      }
      s[26] = runs;
      s[27] = i.itemId;
      s[28] = V;
      s[29] = M;
      s[30] = b;
    } else {
      V = s[28];
      M = s[29];
      b = s[30];
    }
    if (b !== EARLY_RETURN_SENTINEL) return b;
    let defaultName = M;
    let onDone_2;
    if (s[33] !== onDone) {
      onDone_2 = (Ze) => {
        if (Ze)
          onDone(Ze, {
            display: "system",
          });
        else
          v({
            mode: "list",
          });
      };
      s[33] = onDone;
      s[34] = onDone_2;
    } else onDone_2 = s[34];
    let h;
    if (s[35] !== defaultName || s[36] !== V.task.script || s[37] !== onDone_2) {
      h = jsxProd_default(WorkflowSaveDialog, {
        script: V.task.script,
        defaultName,
        onDone: onDone_2,
      });
      s[35] = defaultName;
      s[36] = V.task.script;
      s[37] = onDone_2;
      s[38] = h;
    } else h = s[38];
    return h;
  }
  let H = count(runs, isRunningItem);
  let Re = runs.length - H;
  let M;
  if (s[39] !== onDone) {
    M = () => dismissWorkflowsDialog(onDone);
    s[39] = onDone;
    s[40] = M;
  } else M = s[40];
  let onCancel = M;
  let b;
  if (s[41] !== controlsFor) {
    b = (c) => {
      let { task } = c;
      return task.status === "running" ? controlsFor(task).onKill : undefined;
    };
    s[41] = controlsFor;
    s[42] = b;
  } else b = s[42];
  let U = b;
  let T = runs.length > 0 && !isScreenReaderEnabled;
  let subtitle;
  if (s[43] !== Re || s[44] !== listNote || s[45] !== runs.length || s[46] !== H) {
    subtitle =
      runs.length === 0
        ? undefined
        : jsxProd_default(Text, {
            dimColor: true,
            children:
              listNote ??
              jsxProd_default_2(Byline, {
                children: [H > 0 && `${H} running`, Re > 0 && `${Re} completed`],
              }),
          });
    s[43] = Re;
    s[44] = listNote;
    s[45] = runs.length;
    s[46] = H;
    s[47] = subtitle;
  } else subtitle = s[47];
  let h;
  if (s[48] !== T) {
    h =
      T &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: ["up", "down"],
        action: "select",
      });
    s[48] = T;
    s[49] = h;
  } else h = s[49];
  let me;
  if (s[50] !== T) {
    me =
      T &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: "enter",
        action: "view",
      });
    s[50] = T;
    s[51] = me;
  } else me = s[51];
  let E;
  if (s[52] !== k || s[53] !== T || s[54] !== U) {
    E =
      T &&
      k &&
      U(k) &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: "x",
        action: "stop",
      });
    s[52] = k;
    s[53] = T;
    s[54] = U;
    s[55] = E;
  } else E = s[55];
  let de;
  if (s[56] !== k || s[57] !== T) {
    de =
      T &&
      k &&
      k.task.script.length > 0 &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: "s",
        action: "save",
      });
    s[56] = k;
    s[57] = T;
    s[58] = de;
  } else de = s[58];
  let eo;
  if (s[59] === MEMO_CACHE_SENTINEL) {
    eo = jsxProd_default(KeyboardShortcutHint, {
      chord: "escape",
      action: "close",
    });
    s[59] = eo;
  } else eo = s[59];
  let inputGuide;
  if (s[60] !== me || s[61] !== E || s[62] !== de || s[63] !== h) {
    inputGuide = jsxProd_default_2(Byline, {
      children: [h, me, E, de, eo],
    });
    s[60] = me;
    s[61] = E;
    s[62] = de;
    s[63] = h;
    s[64] = inputGuide;
  } else inputGuide = s[64];
  let children;
  if (
    s[65] !== emptyText ||
    s[66] !== C ||
    s[67] !== g ||
    s[68] !== I ||
    s[69] !== runs ||
    s[70] !== now ||
    s[71] !== U
  ) {
    children =
      runs.length === 0
        ? jsxProd_default(HintText, {
            children: emptyText,
          })
        : jsxProd_default(OrderedListWithItem, {
            defaultFocusIndex: C,
            onFocus: (Me) => {
              let id = runs[Me]?.task.id;
              if (id !== g && (g !== undefined || Me !== C)) K(false);
              re(Me);
              pe(id);
            },
            onSelect: (Ko) => {
              let to = runs[Ko];
              if (to) {
                K(false);
                v({
                  mode: "detail",
                  itemId: to.task.id,
                  isFromList: true,
                });
              }
            },
            onRowKeyDown: (event, Ds) => {
              let je = runs[Ds];
              if (!je || event.ctrl || event.meta) {
                return;
              }
              let Uo = U(je);
              if (event.key === "x" && I) {
                event.preventDefault();
                K(false);
              } else if (event.key === "x" && Uo) {
                event.preventDefault();
                Uo();
              } else if (event.key === "s" && je.task.script.length > 0) {
                event.preventDefault();
                v({
                  mode: "save",
                  itemId: je.task.id,
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
    s[65] = emptyText;
    s[66] = C;
    s[67] = g;
    s[68] = I;
    s[69] = runs;
    s[70] = now;
    s[71] = U;
    s[72] = children;
  } else children = s[72];
  let Eo;
  if (s[73] !== onCancel || s[74] !== inputGuide || s[75] !== children || s[76] !== subtitle) {
    Eo = jsxProd_default(Dialog, {
      title: "Dynamic workflows",
      subtitle,
      onCancel,
      color: "background",
      inputGuide,
      children,
    });
    s[73] = onCancel;
    s[74] = inputGuide;
    s[75] = children;
    s[76] = subtitle;
    s[77] = Eo;
  } else Eo = s[77];
  return Eo;
}
//@ chunk-wnym76ss.js:22212-22531 placement
/**
 * 生成一条工作流运行的显示行（名称、状态图标、耗时、令牌）。
 */
function workflowRunRow({ task, snapshot }, now) {
  let m = snapshot?.totalTokens ?? task.totalTokens ?? 0;
  let max = Math.max(0, (task.endTime ?? now ?? Date.now()) - task.startTime - (task.totalPausedMs ?? 0));
  return {
    label: task.workflowName ?? task.summary ?? task.description,
    icon: WORKFLOW_STATUS_ICONS[task.status],
    meta: [
      formatDuration(max),
      task.agentCount > 0 ? `${task.agentCount} ${plural(task.agentCount, "agent")}` : "",
      m > 0 ? `${formatTokens(m)} tok` : "",
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
function selectRemoteWorkflowRuns(he) {
  return he.remoteWorkflowRuns;
}
//@ chunk-wnym76ss.js:22821-22872 placement
function selectRemoteWorkerGone(De) {
  return De.remoteWorkerReportedGone;
}
//@ chunk-wnym76ss.js:22872-22905 placement
function newWeakMap() {
  return new WeakMap();
}
//@ chunk-wnym76ss.js:22905-22934 placement
function runIdOf(Me) {
  return Me.id;
}
//@ chunk-wnym76ss.js:22934-22996 placement
function sortByStartTimeDesc(oo, Ko) {
  return Ko.task.startTime - oo.task.startTime;
}
//@ chunk-wnym76ss.js:22996-23055 placement
function isRunningRun(o) {
  let { task } = o;
  return task.status === "running";
}
//@ chunk-wnym76ss.js:23055-25610 placement
/**
 * 云端工作流对话框。
 */
function CloudWorkflowsDialog(props) {
  let a = w(36);
  let { onDone, promptVisibleBelow } = props;
  useRegisterOverlay("cloud-workflows-dialog");
  let appState = useAppState(selectRemoteWorkflowRuns);
  let appState_2 = useAppState(selectRemoteWorkerGone);
  let { addNotification } = useNotifications();
  let l;
  if (a[0] === MEMO_CACHE_SENTINEL) {
    l = new Set();
    a[0] = l;
  } else l = a[0];
  let [x, B] = y(l);
  let s;
  if (a[1] === MEMO_CACHE_SENTINEL) {
    s = new Map();
    a[1] = s;
  } else s = a[1];
  let [D, N] = y(s);
  let v;
  if (a[2] === MEMO_CACHE_SENTINEL) {
    v = new Map();
    a[2] = v;
  } else v = a[2];
  let [A, re] = y(v);
  let g = R(true);
  let pe;
  let ue;
  if (a[3] === MEMO_CACHE_SENTINEL) {
    pe = () => () => {
      g.current = false;
    };
    ue = [];
    a[3] = pe;
    a[4] = ue;
  } else {
    pe = a[3];
    ue = a[4];
  }
  P(pe, ue);
  let [W] = y(newWeakMap);
  let fe;
  if (a[5] !== appState) {
    fe = new Set(appState.map(runIdOf));
    a[5] = appState;
    a[6] = fe;
  } else fe = a[6];
  let i = fe;
  let ce;
  if (a[7] !== A || a[8] !== i || a[9] !== W || a[10] !== appState || a[11] !== D) {
    const mapped = appState.map((ie) => ({
      run: ie,
      stopped: A.get(ie.id)?.run.runId === ie.runId ? D.get(ie.id) : undefined,
    }));
    const C = [...A.values()];
    let k;
    if (a[13] !== i) {
      k = (I) => {
        let { run } = I;
        return !i.has(run.id);
      };
      a[13] = i;
      a[14] = k;
    } else k = a[14];
    const filtered = C.filter(k);
    let Z;
    if (a[15] !== D) {
      Z = (xe) => {
        let { run, at } = xe;
        return {
          run,
          stopped: D.get(run.id) ?? at,
        };
      };
      a[15] = D;
      a[16] = Z;
    } else Z = a[16];
    const xe = [...mapped, ...filtered.map(Z)];
    let b;
    if (a[17] !== W) {
      b = (c) => {
        let { run, stopped } = c;
        let $o = W.get(run.wireProgress) ?? parseWorkflowProgressList(run.wireProgress);
        W.set(run.wireProgress, $o);
        return {
          task: cloudWorkflowToTask(run, $o, stopped),
        };
      };
      a[17] = W;
      a[18] = b;
    } else b = a[18];
    ce = xe.map(b).sort(sortByStartTimeDesc);
    a[7] = A;
    a[8] = i;
    a[9] = W;
    a[10] = appState;
    a[11] = D;
    a[12] = ce;
  } else ce = a[12];
  let h = ce;
  let any = h.some(isRunningRun);
  let now = useNowTicker(any ? 1000 : null);
  let _;
  if (a[19] !== appState_2) {
    _ = isRemoteControlChannelAvailable() && !appState_2;
    a[19] = appState_2;
    a[20] = _;
  } else _ = a[20];
  let Pe = _;
  let C;
  if (a[21] !== addNotification || a[22] !== onDone || a[23] !== appState) {
    C = function E(ae) {
      let remoteCaps = getRemoteCaps();
      if (!remoteCaps) {
        return;
      }
      B((Fe) => new Set(Fe).add(ae));
      let found = appState.find((Ze) => Ze.id === ae);
      if (found !== undefined)
        re((Re) =>
          new Map(Re).set(ae, {
            run: found,
            at: Date.now(),
          }),
        );
      remoteCaps
        .sendControlRequest({
          subtype: "stop_task",
          task_id: ae,
        })
        .then(
          () => N((Ae) => new Map(Ae).set(ae, Date.now())),
          (error) => {
            let U = `Couldn't stop the workflow: ${sanitizeDisplayText(errorMessage(error), {
              maxCodeUnits: MAX_TITLE_LENGTH,
            })}`;
            if (g.current)
              onDone(U, {
                display: "system",
              });
            else
              addNotification({
                key: "cloud-workflow-stop",
                kind: "feedback",
                text: U,
                color: "error",
                priority: "immediate",
              });
          },
        )
        .finally(() =>
          B((T) => {
            let me = new Set(T);
            me.delete(ae);
            return me;
          }),
        );
    };
    a[21] = addNotification;
    a[22] = onDone;
    a[23] = appState;
    a[24] = C;
  } else C = a[24];
  let E = C;
  let controlsFor;
  if (a[25] !== Pe || a[26] !== E || a[27] !== x) {
    controlsFor = (I) => {
      let { id, status } = I;
      return Pe && status === "running" && !x.has(id)
        ? {
            onKill: () => E(id),
          }
        : {};
    };
    a[25] = Pe;
    a[26] = E;
    a[27] = x;
    a[28] = controlsFor;
  } else controlsFor = a[28];
  const listNote =
    appState_2 && any ? "The cloud session may have stopped, and its workflows too" : undefined;
  let Z;
  if (
    a[29] !== now ||
    a[30] !== onDone ||
    a[31] !== promptVisibleBelow ||
    a[32] !== h ||
    a[33] !== controlsFor ||
    a[34] !== listNote
  ) {
    Z = jsxProd_default(WorkflowRunList, {
      runs: h,
      controlsFor,
      emptyText:
        "No dynamic workflows to show. Runs that ended before this terminal attached may not be listed.",
      keepsListOfOne: true,
      listNote,
      now,
      onDone,
      promptVisibleBelow,
    });
    a[29] = now;
    a[30] = onDone;
    a[31] = promptVisibleBelow;
    a[32] = h;
    a[33] = controlsFor;
    a[34] = listNote;
    a[35] = Z;
  } else Z = a[35];
  return Z;
}
//@ chunk-wnym76ss.js:25610-26062 placement
/**
 * 把云端工作流记录转换成 local_workflow 任务对象。
 */
function cloudWorkflowToTask(run, t, stopped) {
  let m = stopped !== undefined && run.status === "running";
  return {
    id: run.id,
    type: "local_workflow",
    description: run.description || "Dynamic workflow",
    status: m ? "killed" : run.status,
    startTime: run.startTime,
    endTime: m ? stopped : run.endTime,
    outputFile: "",
    outputOffset: 0,
    notified: true,
    script: "",
    prompt: "",
    workflowName: run.workflowName,
    workflowProgress: t,
    progressVersion: 0,
    agentCount: count(t, (f) => f.type === "workflow_agent"),
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
